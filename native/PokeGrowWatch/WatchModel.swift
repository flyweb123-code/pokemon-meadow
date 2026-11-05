import Foundation
import UIKit
import HealthKit
import CoreMotion
import WatchConnectivity

struct EggInfo: Codable, Identifiable {
    let id: Int
    let grade: String
    var km: Double
    let need: Double
}

struct BuddyInfo: Codable {
    let name: String
    let species: String
    var km: Double
    let need: Double      // 0 이면 더 진화하지 않는 포켓몬
    var ready: Bool
    let img: String       // data:image/png;base64,... (작은 도트 그림)

    var image: UIImage? {
        guard let comma = img.firstIndex(of: ","), let data = Data(base64Encoded: String(img[img.index(after: comma)...])) else { return nil }
        return UIImage(data: data)
    }
}

struct GameState: Codable {
    var eggs: [EggInfo]
    var buddy: BuddyInfo?
    var buds: [BuddyInfo]?   // v14.53 경완: 짝꿍 전부 (예전 게임은 buddy 하나만 보냄)
    var total: Double

    var allBuds: [BuddyInfo] { buds ?? (buddy.map { [$0] } ?? []) }
}

// 런닝은 HealthKit 운동 세션으로 기록한다. 화면이 꺼져도 워치가 계속 거리를 잰다.
final class WatchModel: NSObject, ObservableObject {
    @Published var state: GameState?
    @Published var running = false
    @Published var startDate: Date?
    @Published var distanceKm = 0.0
    @Published var message = ""

    // MARK: 오늘 이동 거리 (게임 프로필의 '이동 거리'와 같은 것)
    // 2026-11-05 경완: 프로필처럼 걸으면 켜지는 이동 거리를 워치에서도. 아이폰이 보낸 오늘 거리(아이폰 만보기)와
    // 워치가 직접 잰 오늘 거리 중 큰 쪽을 보여 준다 (아이폰을 두고 나가도 늘어난다). 워치가 잰 거리가 최근 20초 안에 늘었으면 '걷는 중'.
    @Published var todayKm = 0.0
    @Published var walkAt = Date.distantPast
    static let walkLive: TimeInterval = 20
    private let pedometer = CMPedometer()
    private var phoneToday = 0.0, phoneDay = Date.distantPast
    private var watchToday = 0.0, liveDay = Date.distantPast
    private var liveTimer: Timer?

    func startLive() {
        let day = Calendar.current.startOfDay(for: Date())
        if day != liveDay { stopLive(); liveDay = day; watchToday = 0 }
        guard liveTimer == nil else { return }
        if CMPedometer.isDistanceAvailable() {
            pedometer.startUpdates(from: day) { [weak self] data, _ in
                guard let m = data?.distance?.doubleValue else { return }
                DispatchQueue.main.async { self?.gotWatch(km: m / 1000, day: day) }
            }
        }
        pollWatch()
        // 실시간 알림이 늦게 오기도 해서 5초마다 직접 물어본다 (아이폰 앱과 같은 방식)
        let t = Timer(timeInterval: 5, repeats: true) { [weak self] _ in self?.pollWatch() }
        RunLoop.main.add(t, forMode: .common)
        liveTimer = t
    }
    func stopLive() {
        pedometer.stopUpdates(); liveTimer?.invalidate(); liveTimer = nil
    }
    private func pollWatch() {
        let now = Date(), day = Calendar.current.startOfDay(for: now)
        if day != liveDay { stopLive(); startLive(); return }   // 자정이 지나면 새 날
        guard CMPedometer.isDistanceAvailable() else { recompute(); return }
        pedometer.queryPedometerData(from: day, to: now) { [weak self] data, _ in
            guard let m = data?.distance?.doubleValue else { return }
            DispatchQueue.main.async { self?.gotWatch(km: m / 1000, day: day) }
        }
    }
    private func gotWatch(km: Double, day: Date) {
        guard day == liveDay, km > watchToday + 1e-4 else { return }
        if watchToday > 0 { walkAt = Date() }   // 손목의 워치가 더 걸었다 = 지금 걷는 중
        watchToday = km
        recompute()
    }
    fileprivate func gotPhone(km: Double, dayTs: Double) {
        let day = Date(timeIntervalSince1970: dayTs)
        guard day >= phoneDay else { return }
        if day > phoneDay { phoneToday = 0 }
        phoneDay = day
        phoneToday = max(phoneToday, km)
        recompute()
    }
    private func recompute() {
        let today = Calendar.current.startOfDay(for: Date())
        let v = max(liveDay == today ? watchToday : 0, phoneDay == today ? phoneToday : 0)
        if v != todayKm { todayKm = v }
    }

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
            self?.takeToday(reply)
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
                let start = self.startDate
                self.running = false
                self.startDate = nil
                self.session = nil
                self.builder = nil
                self.send(km: km, start: start)
            }
        }
    }

    private func currentDistance() -> Double {
        let type = HKQuantityType(.distanceWalkingRunning)
        return builder?.statistics(for: type)?.sumQuantity()?.doubleValue(for: .meterUnit(with: .kilo)) ?? 0
    }

    // 아이폰이 멀리 있어도 transferUserInfo 는 대기했다가 전해진다
    private func send(km: Double, start: Date?) {
        guard km >= 0.01 else { message = "달린 거리가 없어요"; return }
        // 시작 시각도 보내서 게임의 런닝 기록에 '몇 시 ~ 몇 시'로 남긴다
        WCSession.default.transferUserInfo(["km": km, "start": start?.timeIntervalSince1970 ?? 0, "end": Date().timeIntervalSince1970])
        if var s = state {
            for i in s.eggs.indices { s.eggs[i].km += km }
            let grow = { (b: inout BuddyInfo) in
                guard b.need > 0 else { return }
                b.km += km
                if b.km >= b.need { b.ready = true }
            }
            if var b = s.buddy { grow(&b); s.buddy = b }
            if var L = s.buds { for i in L.indices { grow(&L[i]) }; s.buds = L }
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
        takeToday(session.receivedApplicationContext)
        DispatchQueue.main.async { self.refresh() }
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        if let data = context["state"] as? Data { decode(data) }
        takeToday(context)
    }

    fileprivate func takeToday(_ c: [String: Any]) {
        guard let km = c["today"] as? Double, let day = c["day"] as? Double else { return }
        DispatchQueue.main.async { self.gotPhone(km: km, dayTs: day) }
    }
}
