import Foundation
import HealthKit
import CoreMotion

// 2026-11-05 경완: 운동 앱을 켜지 않아도 워치만 차고 걸은 거리를 알·짝꿍에 반영한다.
// 아이폰 만보기(WalkTracker)는 아이폰을 들고 걸은 거리만 잰다. 그래서 건강 앱의 '걷기 + 달리기 거리'를
// 5분 칸으로 나눠 보고, 칸마다 '건강 앱 합계(아이폰·워치 겹친 시간은 건강 앱이 한 번만 셈) − 아이폰이 잰 거리'만
// 더 넣는다. 둘 다 들고 걸은 칸은 거의 0 이 되고, 아이폰을 두고 워치만 차고 걸은 칸은 워치 거리가 그대로 들어간다.
// (그 칸에 워치 기록이 없으면 넣지 않는다 → 워치가 없는 사람은 지금과 같다)
//
// 운동(달리기·걷기·하이킹)이 있는 시간은 건너뛴다: 그건 HealthSync / 워치 앱 런닝이 런닝 기록으로 넣는다.
// 운동이 아직 저장되기 전에 이쪽에서 먼저 넣었으면, 그 운동이 들어올 때 넣은 만큼을 '이미 쌓인 거리'(phoneKm)에 더해
// 게임이 같은 거리를 두 번 쌓지 않게 한다 (fedKm).
//
// 워치 기록은 아이폰으로 몇 분~몇 시간 늦게 넘어오므로, 워치 기록이 넘어온 시각까지만 보고 커서를 옮긴다.
// 2026-11-05 경완 '무슨 운동을 하든': 달리기·걷기·하이킹 말고 다른 종목(풋살 등) 시간은 건너뛰지 않는다 → 그 시간 워치 거리도 여기서 들어간다.
// 아이폰이 잠겨 있으면 건강 데이터를 못 읽는다 → 실패하면 커서를 두고 다음에(앱을 열 때 등) 다시 본다.
final class WatchWalk {
    static let shared = WatchWalk()

    private let store = HKHealthStore()
    private let pedometer = CMPedometer()
    private let cursorKey = "watchWalkCursor.v1"
    private let fedKey = "watchWalkFed.v1"   // [[시작초, 끝초, km]] 이쪽에서 넣은 칸 (최근 8일)
    private static let step: TimeInterval = 5 * 60
    private var busy = false

    private var distType: HKQuantityType { HKQuantityType(.distanceWalkingRunning) }

    func sync() {
        guard HKHealthStore.isHealthDataAvailable(), Perm.asked, !busy else { return }
        let now = Date()
        // 처음 켤 때는 오늘 0시부터 본다
        if UserDefaults.standard.object(forKey: cursorKey) == nil {
            UserDefaults.standard.set(Calendar.current.startOfDay(for: now).timeIntervalSince1970, forKey: cursorKey)
        }
        let from = max(Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: cursorKey)), now.addingTimeInterval(-7 * 24 * 3600))
        busy = true
        newestWatchEnd(after: from) { [weak self] newest in
            guard let self else { return }
            // 워치 기록이 넘어온 곳(가장 늦게 끝난 기록)까지만. 2026-11-05 경완 '앱 켜면 바로': 예전의 '마지막 15분 기다림'은 뺐다
            // (아이폰 몫은 실시간 만보기로 한 번 더 빼니, 아이폰 기록이 건강 앱에 늦게 적혀도 두 번 세지 않는다)
            guard let newest else { self.busy = false; return }
            let to = min(now, newest)
            guard to.timeIntervalSince(from) >= 30 else { self.busy = false; return }
            self.compute(from: from, to: to)
        }
    }

    // 운동 시간에 이쪽에서 이미 넣은 거리 (km). HealthSync·워치 런닝이 phoneKm 에 더한다.
    func fedKm(_ start: Date, _ end: Date) -> Double {
        let s = start.timeIntervalSince1970 - 60, e = end.timeIntervalSince1970 + 60
        return fedLog().reduce(0) { sum, x in
            let o = min(x[1], e) - max(x[0], s)
            return o > 0 && x[1] > x[0] ? sum + x[2] * o / (x[1] - x[0]) : sum
        }
    }

    // MARK: -

    private func fedLog() -> [[Double]] { UserDefaults.standard.array(forKey: fedKey) as? [[Double]] ?? [] }

    private func modelPred(_ model: String) -> NSPredicate {
        HKQuery.predicateForObjects(withDeviceProperty: HKDevicePropertyKeyModel, allowedValues: [model as AnyHashable])
    }

    // 워치가 잰 걷기 거리 중 가장 늦게 끝난 시각 (없으면 nil)
    private func newestWatchEnd(after from: Date, done: @escaping (Date?) -> Void) {
        let pred = NSCompoundPredicate(andPredicateWithSubpredicates: [
            modelPred("Watch"),
            HKQuery.predicateForSamples(withStart: from, end: nil, options: []),
        ])
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
        let q = HKSampleQuery(sampleType: distType, predicate: pred, limit: 1, sortDescriptors: sort) { _, samples, error in
            DispatchQueue.main.async { done(error == nil ? samples?.first?.endDate : nil) }
        }
        store.execute(q)
    }

    private func compute(from: Date, to: Date) {
        let group = DispatchGroup()
        var failed = false
        var workouts: [(Date, Date)] = []
        var merged: HKStatisticsCollection?, phone: HKStatisticsCollection?, watch: HKStatisticsCollection?

        // 그 사이의 운동 (출처 상관없이: 워치 운동 앱, 이 앱의 워치 런닝, NRC 등)
        group.enter()
        let wPred = NSCompoundPredicate(andPredicateWithSubpredicates: [
            NSCompoundPredicate(orPredicateWithSubpredicates: [HKWorkoutActivityType.running, .walking, .hiking].map { HKQuery.predicateForWorkouts(with: $0) }),
            HKQuery.predicateForSamples(withStart: from, end: to, options: []),
        ])
        store.execute(HKSampleQuery(sampleType: .workoutType(), predicate: wPred, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            DispatchQueue.main.async {
                if error != nil { failed = true }
                workouts = (samples ?? []).map { ($0.startDate, $0.endDate) }
                group.leave()
            }
        })

        func sums(_ extra: NSPredicate?, _ set: @escaping (HKStatisticsCollection?) -> Void) {
            group.enter()
            var preds = [HKQuery.predicateForSamples(withStart: from, end: to, options: [])]
            if let extra { preds.append(extra) }
            let q = HKStatisticsCollectionQuery(quantityType: distType, quantitySamplePredicate: NSCompoundPredicate(andPredicateWithSubpredicates: preds),
                                                options: .cumulativeSum, anchorDate: from, intervalComponents: DateComponents(minute: 5))
            q.initialResultsHandler = { _, result, error in
                DispatchQueue.main.async {
                    if error != nil { failed = true }
                    set(result)
                    group.leave()
                }
            }
            store.execute(q)
        }
        sums(nil) { merged = $0 }                       // 건강 앱 합계 (겹친 시간은 한 번만)
        sums(modelPred("iPhone")) { phone = $0 }        // 아이폰이 잰 것 (= 만보기가 이미 넣은 것)
        sums(modelPred("Watch")) { watch = $0 }         // 워치가 잰 것

        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            guard !failed, let merged else { self.busy = false; return }   // 잠겨 있는 등: 다음에 다시
            let km = { (c: HKStatisticsCollection?, d: Date) -> Double in
                (c?.statistics(for: d)?.sumQuantity()?.doubleValue(for: .meter()) ?? 0) / 1000
            }
            // 넣을 후보 칸: 워치 기록이 있고, 건강 앱 합계가 아이폰 몫보다 큰 칸
            var cands: [(Date, Date, Double)] = []
            var t = from
            while t < to {
                let e = min(t.addingTimeInterval(WatchWalk.step), to)   // 마지막 칸은 짧을 수 있다
                let inWorkout = workouts.contains { $0.0 < e.addingTimeInterval(60) && $0.1 > t.addingTimeInterval(-60) }
                if !inWorkout {
                    let add = min(km(watch, t), max(0, km(merged, t) - km(phone, t)))
                    if add >= 0.001 { cands.append((t, e, add)) }
                }
                t = e
            }
            // 아이폰이 잰 거리는 건강 앱에 늦게 적히기도 하니, 만보기(실제로 이미 넣은 거리)로 한 번 더 빼 본다
            self.pedCheck(cands, merged: { km(merged, $0) }) { fed in
                self.finish(fed, to: to)
            }
        }
    }

    private func pedCheck(_ cands: [(Date, Date, Double)], merged: @escaping (Date) -> Double, done: @escaping ([[Double]]) -> Void) {
        guard !cands.isEmpty else { done([]); return }
        guard CMPedometer.isDistanceAvailable() else { done(cands.map { [$0.0.timeIntervalSince1970, $0.1.timeIntervalSince1970, $0.2] }); return }
        let group = DispatchGroup()
        var out: [[Double]] = []
        for (s, e, add) in cands {
            group.enter()
            pedometer.queryPedometerData(from: s, to: e) { data, error in
                DispatchQueue.main.async {
                    let ped = error == nil ? (data?.distance?.doubleValue ?? 0) / 1000 : 0
                    let v = min(add, max(0, merged(s) - ped))
                    if v >= 0.001 { out.append([s.timeIntervalSince1970, e.timeIntervalSince1970, v]) }
                    group.leave()
                }
            }
        }
        group.notify(queue: .main) { done(out.sorted { $0[0] < $1[0] }) }
    }

    private func finish(_ fed: [[Double]], to: Date) {
        defer { busy = false }
        let total = fed.reduce(0) { $0 + $1[2] }
        // 아주 조금이면 커서를 두고 다음에 모아서 넣는다
        if total > 0 && total < 0.01 { return }
        UserDefaults.standard.set(to.timeIntervalSince1970, forKey: cursorKey)
        guard total > 0 else { return }
        let cut = Date().addingTimeInterval(-8 * 24 * 3600).timeIntervalSince1970
        UserDefaults.standard.set((fedLog() + fed).filter { $0[1] > cut }, forKey: fedKey)
        PhoneBridge.shared.enqueueWalk(km: total, place: "")
    }
}
