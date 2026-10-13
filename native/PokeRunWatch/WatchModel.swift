import Foundation
import HealthKit
import WatchConnectivity

struct EggInfo: Codable, Identifiable {
    let id: Int
    let grade: String
    var km: Double
    let need: Double
}

struct GameState: Codable {
    var eggs: [EggInfo]
    var buddy: String
    var total: Double
}

// 런닝은 HealthKit 운동 세션으로 기록한다. 화면이 꺼져도 워치가 계속 거리를 잰다.
final class WatchModel: NSObject, ObservableObject {
    @Published var state: GameState?
    @Published var running = false
    @Published var startDate: Date?
    @Published var distanceKm = 0.0
    @Published var message = ""

    private let health = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private let stateKey = "lastState"

    override init() {
        super.init()
        if let data = UserDefaults.standard.data(forKey: stateKey) { decode(data) }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: 알 현황

    private func decode(_ data: Data) {
        guard !data.isEmpty, let s = try? JSONDecoder().decode(GameState.self, from: data) else { return }
        UserDefaults.standard.set(data, forKey: stateKey)
        DispatchQueue.main.async { self.state = s }
    }

    func refresh() {
        let s = WCSession.default
        guard s.activationState == .activated, s.isReachable else { return }
        s.sendMessage(["get": true], replyHandler: { [weak self] reply in
            if let data = reply["state"] as? Data { self?.decode(data) }
        }, errorHandler: nil)
    }

    // MARK: 런닝

    func startRun() {
        guard !running else { return }
        Task {
            do {
                let share: Set<HKSampleType> = [HKObjectType.workoutType()]
                let read: Set<HKObjectType> = [HKQuantityType(.distanceWalkingRunning), HKObjectType.workoutType()]
                try await health.requestAuthorization(toShare: share, read: read)

                let config = HKWorkoutConfiguration()
                config.activityType = .running
                config.locationType = .outdoor
                let session = try HKWorkoutSession(healthStore: health, configuration: config)
                let builder = session.associatedWorkoutBuilder()
                builder.dataSource = HKLiveWorkoutDataSource(healthStore: health, workoutConfiguration: config)
                session.delegate = self
                builder.delegate = self
                self.session = session
                self.builder = builder

                let now = Date()
                session.startActivity(with: now)
                try await builder.beginCollection(at: now)
                await MainActor.run {
                    self.running = true
                    self.startDate = now
                    self.distanceKm = 0
                    self.message = ""
                }
            } catch {
                await MainActor.run { self.message = "시작하지 못했어요: \(error.localizedDescription)" }
            }
        }
    }

    func endRun() {
        session?.end()
    }

    private func finish(at date: Date) {
        guard let builder else { return }
        Task {
            try? await builder.endCollection(at: date)
            _ = try? await builder.finishWorkout()
            let km = (self.currentDistance() * 100).rounded() / 100
            await MainActor.run {
                self.running = false
                self.startDate = nil
                self.session = nil
                self.builder = nil
                self.send(km: km)
            }
        }
    }

    private func currentDistance() -> Double {
        let type = HKQuantityType(.distanceWalkingRunning)
        return builder?.statistics(for: type)?.sumQuantity()?.doubleValue(for: .meterUnit(with: .kilo)) ?? 0
    }

    // 아이폰이 멀리 있어도 transferUserInfo 는 대기했다가 전해진다
    private func send(km: Double) {
        guard km >= 0.01 else { message = "달린 거리가 없어요"; return }
        WCSession.default.transferUserInfo(["km": km, "end": Date().timeIntervalSince1970])
        if var s = state {
            for i in s.eggs.indices { s.eggs[i].km += km }
            s.total += km
            state = s
        }
        message = String(format: "%.2fkm를 알에 보냈어요", km)
    }
}

extension WatchModel: HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState, date: Date) {
        if toState == .ended { finish(at: date) }
    }

    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        DispatchQueue.main.async { self.message = "기록 중 문제가 생겼어요: \(error.localizedDescription)" }
    }

    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        guard collectedTypes.contains(HKQuantityType(.distanceWalkingRunning)) else { return }
        let km = currentDistance()
        DispatchQueue.main.async { self.distanceKm = km }
    }

    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
}

extension WatchModel: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        if let data = session.receivedApplicationContext["state"] as? Data { decode(data) }
        DispatchQueue.main.async { self.refresh() }
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        if let data = context["state"] as? Data { decode(data) }
    }
}
