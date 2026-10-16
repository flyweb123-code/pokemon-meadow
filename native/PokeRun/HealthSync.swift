import Foundation
import HealthKit
import CoreLocation

// 워치만 차고 달려도 반영: 건강 앱에 저장된 '달리기' 운동(애플워치 운동 앱, NRC 등)을 읽어
// 지난번 이후 새로 끝난 것을 런닝 기록으로 보낸다. 앱을 열 때마다 확인한다.
// 포켓런닝 워치 앱이 저장한 운동은 이미 워치에서 바로 넘어오므로 건너뛴다.
final class HealthSync {
    static let shared = HealthSync()

    private let store = HKHealthStore()
    // v2: 처음 켤 때 지난 2일치를 확인한다 (예전 v1 은 '지금부터'라서 앱을 다시 설치하기 전에 뛴 기록을 놓쳤다)
    private let lastKey = "healthLastSync.v2"
    private var busy = false

    func refresh() {
        guard HKHealthStore.isHealthDataAvailable(), !busy else { return }
        let read: Set<HKObjectType> = [HKObjectType.workoutType(), HKQuantityType(.distanceWalkingRunning), HKSeriesType.workoutRoute()]
        store.requestAuthorization(toShare: nil, read: read) { [weak self] _, _ in
            DispatchQueue.main.async { self?.query() }
        }
    }

    private func query() {
        guard !busy else { return }
        // 처음에는 지난 2일만 본다 (아주 예전 운동을 한꺼번에 넣지 않음). 같은 시간대 기록은 게임이 한 번만 넣는다.
        if UserDefaults.standard.object(forKey: lastKey) == nil {
            UserDefaults.standard.set(Date().addingTimeInterval(-2 * 24 * 3600).timeIntervalSince1970, forKey: lastKey)
        }
        busy = true
        let last = Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: lastKey))
        let pred = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForWorkouts(with: .running),
            HKQuery.predicateForSamples(withStart: last, end: nil, options: .strictStartDate),
        ])
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: true)]
        let q = HKSampleQuery(sampleType: .workoutType(), predicate: pred, limit: 50, sortDescriptors: sort) { [weak self] _, samples, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                self.busy = false
                let workouts = (samples as? [HKWorkout]) ?? []
                var newest = last
                for w in workouts {
                    newest = max(newest, w.endDate)
                    if w.sourceRevision.source.bundleIdentifier.hasPrefix("com.flyweb123.pokerun") { continue }
                    let meters = w.statistics(for: HKQuantityType(.distanceWalkingRunning))?.sumQuantity()?.doubleValue(for: .meter())
                        ?? w.totalDistance?.doubleValue(for: .meter()) ?? 0
                    let km = meters / 1000
                    if km >= 0.1 {
                        PhoneBridge.shared.enqueueRun(km: km, start: w.startDate.timeIntervalSince1970, end: w.endDate.timeIntervalSince1970, kind: 2)
                        self.routePlaces(w)
                    }
                }
                UserDefaults.standard.set(newest.timeIntervalSince1970, forKey: self.lastKey)
                self.backfillRoutes()
            }
        }
        store.execute(q)
    }

    // MARK: 운동 경로(GPS) → 알을 주운 곳

    // 예전에 넣은 운동(지난 7일)도 한 번은 경로를 읽어 주운 곳이 빈 알을 채운다
    private let backfillKey = "healthRouteBackfill.v1"
    private func backfillRoutes() {
        guard !UserDefaults.standard.bool(forKey: backfillKey) else { return }
        UserDefaults.standard.set(true, forKey: backfillKey)
        let pred = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForWorkouts(with: .running),
            HKQuery.predicateForSamples(withStart: Date().addingTimeInterval(-7 * 24 * 3600), end: nil, options: .strictStartDate),
        ])
        let q = HKSampleQuery(sampleType: .workoutType(), predicate: pred, limit: 30, sortDescriptors: nil) { [weak self] _, samples, _ in
            DispatchQueue.main.async { for w in (samples as? [HKWorkout]) ?? [] { self?.routePlaces(w) } }
        }
        store.execute(q)
    }

    // 경로에서 250m마다 한 곳(최대 40)을 뽑아 장소 이름으로 바꿔 게임에 보낸다 (2026-10-16: 예전엔 고르게 5곳, 동네 이름만)
    // 게임은 그 런닝에서 주운 알을 주운 순서대로 경로 앞쪽부터 나눠 준다
    private var geoQueue: [(CLLocation, (String, String) -> Void)] = []
    private var geoBusy = false
    private let geocoder = CLGeocoder()

    private func routePlaces(_ w: HKWorkout) {
        let pred = HKQuery.predicateForObjects(from: w)
        let rq = HKSampleQuery(sampleType: HKSeriesType.workoutRoute(), predicate: pred, limit: 1, sortDescriptors: nil) { [weak self] _, samples, _ in
            guard let self, let route = (samples as? [HKWorkoutRoute])?.first else { return }
            var locs: [CLLocation] = []
            let lq = HKWorkoutRouteQuery(route: route) { [weak self] _, batch, done, _ in
                locs.append(contentsOf: batch ?? [])
                guard done, let self else { return }
                guard !locs.isEmpty else { return }
                var picks: [CLLocation] = [locs[0]], run: CLLocationDistance = 0
                for i in 1..<locs.count { run += locs[i].distance(from: locs[i - 1]); if run >= 250 { picks.append(locs[i]); run = 0 } }
                if picks.count > 40 { let n = picks.count; picks = (0..<40).map { picks[$0 * n / 40] } }
                DispatchQueue.main.async { self.geocodeAll(picks, start: w.startDate, end: w.endDate) }
            }
            self.store.execute(lq)
        }
        store.execute(rq)
    }

    private func geocodeAll(_ picks: [CLLocation], start: Date, end: Date) {
        var out: [[Any]] = []
        var left = picks.count
        for loc in picks {
            geoQueue.append((loc, { name, tags in
                if !name.isEmpty { out.append([name, tags, loc.timestamp.timeIntervalSince1970 * 1000]) }
                left -= 1
                if left == 0, !out.isEmpty { PhoneBridge.shared.enqueuePlaces(start: start.timeIntervalSince1970, end: end.timeIntervalSince1970, places: out) }
            }))
        }
        nextGeo()
    }

    // 지오코더·지도 검색은 한 번에 하나씩 (너무 자주 부르면 막힌다)
    private func nextGeo() {
        guard !geoBusy, !geoQueue.isEmpty else { return }
        geoBusy = true
        let (loc, done) = geoQueue.removeFirst()
        WalkTracker.lookup(loc, geocoder: geocoder) { [weak self] place, tags in
            done(place ?? "", tags.joined(separator: ","))
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { self?.geoBusy = false; self?.nextGeo() }
        }
    }
}
