import Foundation
import HealthKit

// 워치만 차고 달려도 반영: 건강 앱에 저장된 '달리기' 운동(애플워치 운동 앱, NRC 등)을 읽어
// 지난번 이후 새로 끝난 것을 런닝 기록으로 보낸다. 앱을 열 때마다 확인한다.
// 포켓런닝 워치 앱이 저장한 운동은 이미 워치에서 바로 넘어오므로 건너뛴다.
final class HealthSync {
    static let shared = HealthSync()

    private let store = HKHealthStore()
    private let lastKey = "healthLastSync"
    private var busy = false

    func refresh() {
        guard HKHealthStore.isHealthDataAvailable(), !busy else { return }
        let read: Set<HKObjectType> = [HKObjectType.workoutType(), HKQuantityType(.distanceWalkingRunning)]
        store.requestAuthorization(toShare: nil, read: read) { [weak self] _, _ in
            DispatchQueue.main.async { self?.query() }
        }
    }

    private func query() {
        guard !busy else { return }
        // 처음 켤 때는 지금부터 센다 (예전 운동을 한꺼번에 넣지 않음)
        if UserDefaults.standard.object(forKey: lastKey) == nil {
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: lastKey)
            return
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
                    }
                }
                UserDefaults.standard.set(newest.timeIntervalSince1970, forKey: self.lastKey)
            }
        }
        store.execute(q)
    }
}
