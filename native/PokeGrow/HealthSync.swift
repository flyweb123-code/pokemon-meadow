import Foundation
import HealthKit
import CoreLocation
import CoreMotion

// 워치만 차고 달려도 반영: 건강 앱에 저장된 달리기·걷기·하이킹 운동(애플워치 운동 앱, NRC 등)을 읽어
// 지난번 이후 새로 끝난 것을 런닝 기록으로 보낸다. 앱을 열 때마다 확인한다.
// 포켓몬 키우기 워치 앱이 저장한 운동은 이미 워치에서 바로 넘어오므로 건너뛴다.
final class HealthSync {
    static let shared = HealthSync()

    private let store = HKHealthStore()
    // 2026-10-23 경완: 아이폰을 두고 워치만 차고 운동한 거리도 알을 줍게 — 그 운동 시간에 아이폰 만보기가 잰 거리를 같이 보낸다
    private let pedometer = CMPedometer()
    // v2: 처음 켤 때 지난 2일치를 확인한다 (예전 v1 은 '지금부터'라서 앱을 다시 설치하기 전에 뛴 기록을 놓쳤다)
    private let lastKey = "healthLastSync.v2"
    private var busy = false

    static let readTypes: Set<HKObjectType> = [HKObjectType.workoutType(), HKQuantityType(.distanceWalkingRunning), HKSeriesType.workoutRoute()]
    func refresh() {
        guard HKHealthStore.isHealthDataAvailable(), !busy, Perm.asked else { return }   // 2026-11-02: 튜토리얼 끝에 묻기 전엔 건드리지 않는다 (Perm)
        startObserving()
        store.requestAuthorization(toShare: nil, read: HealthSync.readTypes) { [weak self] _, _ in
            DispatchQueue.main.async { self?.query() }
        }
    }

    // 2026-11-05 경완 '앱 켰을 때 바로 반영': 워치 기록(운동·걷기 거리)이 건강 앱에 들어오면 iOS 가 앱을 백그라운드에서 깨운다.
    // 그때 미리 계산해 대기열에 넣어 두면(PhoneBridge), 앱을 열자마자 게임에 들어간다. (아이폰이 잠겨 있으면 못 읽어 열 때 다시)
    private var observing = false
    private func startObserving() {
        guard !observing else { return }
        observing = true
        let types: [HKSampleType] = [HKObjectType.workoutType(), HKQuantityType(.distanceWalkingRunning)]
        for t in types {
            let q = HKObserverQuery(sampleType: t, predicate: nil) { [weak self] _, done, error in
                guard error == nil else { done(); return }
                DispatchQueue.main.async {
                    self?.refresh()   // 운동 → 런닝 기록, 끝에 WatchWalk(워치 걷기 거리)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { done() }   // 조회할 시간을 조금 준 뒤 끝났다고 알린다
                }
            }
            store.execute(q)
            store.enableBackgroundDelivery(for: t, frequency: .immediate) { _, _ in }
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
            NSCompoundPredicate(orPredicateWithSubpredicates: [HKWorkoutActivityType.running, .walking, .hiking].map { HKQuery.predicateForWorkouts(with: $0) }),
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
                        self.phoneKm(w.startDate, w.endDate) { ph in
                            // 2026-11-05: 운동이 저장되기 전에 '워치만 차고 걸은 거리'(WatchWalk)로 이미 넣은 만큼도 '이미 쌓인 거리'에 더한다
                            let ww = WatchWalk.shared.fedKm(w.startDate, w.endDate)
                            let all = ww > 0 ? max(ph, 0) + ww : ph
                            PhoneBridge.shared.enqueueRun(km: km, start: w.startDate.timeIntervalSince1970, end: w.endDate.timeIntervalSince1970, kind: 2, phoneKm: all)
                            self.routePlaces(w)
                        }
                    }
                }
                UserDefaults.standard.set(newest.timeIntervalSince1970, forKey: self.lastKey)
                self.backfillRoutes()
                WatchWalk.shared.sync()   // 운동 앱을 안 켜고 워치만 차고 걸은 거리
            }
        }
        store.execute(q)
    }

    // 그 운동 시간에 아이폰 만보기가 잰 거리(km). 모르면 -1 (게임은 예전처럼 처리)
    // 2026-11-05 경완 '아이폰 두고 운동 → 알 거리는 늦게 들어오는데 알은 안 주워짐': 만보기가 실패해 -1 이 가면
    // 게임은 '아이폰이 이미 셌다'고 보고 알 줍기를 건너뛴다. 만보기가 실패하면 건강 앱의 아이폰 걷기 거리로 대신 잰다.
    func phoneKm(_ start: Date, _ end: Date, done: @escaping (Double) -> Void) {
        guard CMPedometer.isDistanceAvailable() else { healthPhoneKm(start, end, done: done); return }
        pedometer.queryPedometerData(from: start, to: end) { [weak self] data, error in
            DispatchQueue.main.async {
                if error == nil { done((data?.distance?.doubleValue ?? 0) / 1000) }
                else if let self { self.healthPhoneKm(start, end, done: done) }
                else { done(-1) }
            }
        }
    }

    // 그 시간 건강 앱에 '아이폰'이 적은 걷기+달리기 거리 (km). 못 읽으면 -1
    private func healthPhoneKm(_ start: Date, _ end: Date, done: @escaping (Double) -> Void) {
        let pred = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForSamples(withStart: start, end: end, options: []),
            HKQuery.predicateForObjects(withDeviceProperty: HKDevicePropertyKeyModel, allowedValues: ["iPhone" as AnyHashable]),
        ])
        let q = HKStatisticsQuery(quantityType: HKQuantityType(.distanceWalkingRunning), quantitySamplePredicate: pred, options: .cumulativeSum) { _, stats, error in
            // 아이폰 기록이 하나도 없으면 결과가 비어 오고 오류 코드(데이터 없음)가 올 수 있다 → 0 km 로 본다
            let noData = (error as? HKError)?.code == .errorNoData
            let km = error == nil || noData ? (stats?.sumQuantity()?.doubleValue(for: .meter()) ?? 0) / 1000 : -1
            DispatchQueue.main.async { done(km) }
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
            NSCompoundPredicate(orPredicateWithSubpredicates: [HKWorkoutActivityType.running, .walking, .hiking].map { HKQuery.predicateForWorkouts(with: $0) }),
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
                if !name.isEmpty { out.append([name, tags, loc.timestamp.timeIntervalSince1970 * 1000, loc.coordinate.latitude, loc.coordinate.longitude]) }
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
