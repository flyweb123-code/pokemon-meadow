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

    // 2026-11-12 경완 '걷는 중에 켜면 꺼짐': 화면을 다시 그릴 때마다 그림을 새로 풀지 않게 한 번 푼 그림은 기억한다
    var image: UIImage? { BuddyInfo.imgCache.image(for: img) }
    static let imgCache = ImgCache()
}

struct GameState: Codable {
    var eggs: [EggInfo]
    var buddy: BuddyInfo?
    var buds: [BuddyInfo]?   // v14.53 경완: 짝꿍 전부 (예전 게임은 buddy 하나만 보냄)
    var total: Double
    var tr: String?          // 2026-11-05 경완: 내 캐릭터(입은 옷) 필드 그림 띠 32×192 data URL (예전 게임은 안 보냄)

    var allBuds: [BuddyInfo] { buds ?? (buddy.map { [$0] } ?? []) }

    // 그림 띠의 0번 칸 = 정면으로 서 있는 모습, 3번 칸 = 정면 걸음 (게임 프로필 trWalk 와 같은 칸)
    var trFrames: (stand: CGImage, step: CGImage)? {
        guard let tr, let comma = tr.firstIndex(of: ","), let data = Data(base64Encoded: String(tr[tr.index(after: comma)...])),
              let cg = UIImage(data: data)?.cgImage, cg.width >= 32, cg.height >= 128 else { return nil }
        let w = cg.width
        guard let a = cg.cropping(to: CGRect(x: 0, y: 0, width: w, height: w)),
              let b = cg.cropping(to: CGRect(x: 0, y: w * 3, width: w, height: w)) else { return nil }
        return (a, b)
    }
}

final class ImgCache {
    private var map: [String: UIImage] = [:]
    func image(for src: String) -> UIImage? {
        if src.isEmpty { return nil }
        if let i = map[src] { return i }
        guard let comma = src.firstIndex(of: ","), let data = Data(base64Encoded: String(src[src.index(after: comma)...])),
              let i = UIImage(data: data) else { return nil }
        if map.count > 24 { map.removeAll() }
        map[src] = i
        return i
    }
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
        pollExtra()
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
        // 손목의 워치가 더 걸었다 = 지금 걷는 중. 걷는 동안 몇 초마다 오는 알림마다 화면 전체를 다시 그리지 않게 5초에 한 번만 바꾼다
        if watchToday > 0, Date().timeIntervalSince(walkAt) > 5 { walkAt = Date() }
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
        if abs(v - todayKm) >= 0.005 || v < todayKm { todayKm = v }
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

    // fresh: 아이폰이 방금 보낸 것 (at = 아이폰이 보낸 시각). 그때부터 워치가 걸은 거리를 '미리 보기'로 더한다.
    // 2026-11-12: 걷는 동안 아이폰은 오늘 거리가 바뀔 때마다(몇 미터마다) 같은 알 현황을 다시 보낸다.
    // 그때마다 큰 현황(그림 포함)을 다시 풀고 저장하고 화면을 통째로 다시 그리던 게 걷는 중 꺼짐의 원인으로 보여 같은 현황이면 건너뛴다.
    private var lastData: Data?, lastAt: Double?
    private let decodeLock = NSLock()
    private func decode(_ data: Data, fresh: Bool = false, at: Double? = nil) {
        guard !data.isEmpty else { return }
        decodeLock.lock()
        let same = data == lastData && (!fresh || at == lastAt)
        if !same { lastData = data; if fresh { lastAt = at } }
        decodeLock.unlock()
        if same { return }
        guard let s = try? JSONDecoder().decode(GameState.self, from: data) else { return }
        UserDefaults.standard.set(data, forKey: stateKey)
        DispatchQueue.main.async {
            self.state = s
            if fresh {
                let t = min(Date().timeIntervalSince1970, at ?? Date().timeIntervalSince1970)
                UserDefaults.standard.set(t, forKey: self.baseKey)
                self.extraKm = 0
                self.pollExtra()
            }
        }
    }

    // MARK: 아이폰과 끊겨 있는 동안 (2026-11-05 경완: 알·짝꿍 진행도가 이어지게)
    // 아이폰이 마지막으로 알 현황을 보낸 뒤 워치가 걸은 거리(extraKm)를 화면의 알·짝꿍·총 거리에 미리 더해 보여 준다.
    // 진짜 반영은 아이폰 앱이 건강 앱 기록으로 한다 (WatchWalk). 새 현황이 오면 0 부터 다시.
    @Published var extraKm = 0.0
    private let baseKey = "stateAt"
    private func pollExtra() {
        let base = UserDefaults.standard.double(forKey: baseKey)
        guard base > 0, CMPedometer.isDistanceAvailable() else { return }
        let from = Date(timeIntervalSince1970: base)
        pedometer.queryPedometerData(from: from, to: Date()) { [weak self] data, error in
            guard error == nil, let m = data?.distance?.doubleValue else { return }
            DispatchQueue.main.async {
                guard let self, UserDefaults.standard.double(forKey: self.baseKey) == base else { return }
                self.extraKm = max(self.extraKm, m / 1000)
            }
        }
    }

    // 내 캐릭터 그림 (같은 그림이면 다시 풀지 않는다)
    private var trCache: (src: String, frames: (stand: CGImage, step: CGImage)?)?
    var trFrames: (stand: CGImage, step: CGImage)? {
        let src = state?.tr ?? ""
        if let c = trCache, c.src == src { return c.frames }
        let f = state?.trFrames
        trCache = (src, f)
        return f
    }

    // 화면에 보일 알 현황 = 받은 현황 + extraKm
    var shown: GameState? {
        guard var s = state else { return nil }
        let k = extraKm
        guard k > 0 else { return s }
        for i in s.eggs.indices { s.eggs[i].km += k }
        let grow = { (b: inout BuddyInfo) in
            guard b.need > 0 else { return }
            b.km += k
            if b.km >= b.need { b.ready = true }
        }
        if var b = s.buddy { grow(&b); s.buddy = b }
        if var L = s.buds { for i in L.indices { grow(&L[i]) }; s.buds = L }
        s.total += k
        return s
    }

    func refresh() {
        let s = WCSession.default
        guard s.activationState == .activated, s.isReachable else { return }
        s.sendMessage(["get": true], replyHandler: { [weak self] reply in
            if let data = reply["state"] as? Data { self?.decode(data, fresh: true, at: reply["at"] as? Double) }
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
        let c = session.receivedApplicationContext
        if let data = c["state"] as? Data { decode(data, fresh: true, at: c["at"] as? Double) }
        takeToday(session.receivedApplicationContext)
        DispatchQueue.main.async { self.refresh() }
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        if let data = context["state"] as? Data { decode(data, fresh: true, at: context["at"] as? Double) }
        takeToday(context)
    }

    fileprivate func takeToday(_ c: [String: Any]) {
        guard let km = c["today"] as? Double, let day = c["day"] as? Double else { return }
        DispatchQueue.main.async { self.gotPhone(km: km, dayTs: day) }
    }
}
