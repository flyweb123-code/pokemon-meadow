import CoreLocation
import CoreMotion
import HealthKit
import UIKit
import WebKit

// 2026-11-02 경완: 권한(동작 및 피트니스·위치·건강)은 앱을 켤 때 묻지 않고,
// 튜토리얼 끝에 강박사가 한 번에 설명한 뒤 한 번에 묻는다. 설정 › 권한 토글도 여기로.
// 게임 → perm 'get' 상태 / 'ask' 아직 안 물은 것 전부 차례로 / 'ask:mot|loc|hk' 하나만 / 'settings' 설정 앱
// 답: { mot, loc, hk } 각각 'ok' | 'no' | 'ask'  (건강은 iOS 가 읽기 허용 여부를 알려 주지 않아 물었으면 'ok')
enum Perm {
    private static let askedKey = "permAsked"
    private static let store = HKHealthStore()
    private static let pedometer = CMPedometer()

    // 예전부터 쓰던 기기(이미 하나라도 정해진 권한이 있음)는 물은 것으로 친다
    static var asked: Bool {
        if UserDefaults.standard.bool(forKey: askedKey) { return true }
        if CMMotionActivityManager.authorizationStatus() != .notDetermined || CLLocationManager().authorizationStatus != .notDetermined {
            UserDefaults.standard.set(true, forKey: askedKey); return true
        }
        return false
    }

    static func mot() -> String {
        switch CMMotionActivityManager.authorizationStatus() {
        case .authorized: return "ok"
        case .notDetermined: return "ask"
        default: return "no"
        }
    }
    static func hk(_ done: @escaping (String) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else { return done("no") }
        store.getRequestStatusForAuthorization(toShare: [], read: HealthSync.readTypes) { st, _ in
            DispatchQueue.main.async { done(st == .shouldRequest ? "ask" : "ok") }
        }
    }
    static func state(_ done: @escaping ([String: String]) -> Void) {
        hk { h in done(["mot": mot(), "loc": WalkTracker.shared.locState(), "hk": h]) }
    }

    private static func askMot(_ next: @escaping () -> Void) {
        guard mot() == "ask", CMPedometer.isDistanceAvailable() else { return next() }
        let now = Date()
        pedometer.queryPedometerData(from: now.addingTimeInterval(-60), to: now) { _, _ in DispatchQueue.main.async { next() } }
    }
    private static func askLoc(_ next: @escaping () -> Void) {
        WalkTracker.shared.askLoc { _, _ in next() }
    }
    private static func askHk(_ next: @escaping () -> Void) {
        hk { h in
            guard h == "ask" else { return next() }
            store.requestAuthorization(toShare: nil, read: HealthSync.readTypes) { _, _ in DispatchQueue.main.async { next() } }
        }
    }
    // 물은 뒤엔 그동안 미뤄 둔 걸음·위치·건강 읽기를 시작한다
    private static func begin() {
        UserDefaults.standard.set(true, forKey: askedKey)
        WalkTracker.shared.start(); WalkTracker.shared.startLive(); HealthSync.shared.refresh()
    }

    static func handle(_ body: String, reply: @escaping (Any?, String?) -> Void) {
        let fin = { begin(); state { reply($0, nil) } }
        switch body {
        case "ask": askMot { askLoc { askHk(fin) } }
        case "ask:mot": askMot(fin)
        case "ask:loc": askLoc(fin)
        case "ask:hk": askHk(fin)
        case "settings":
            if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
            state { reply($0, nil) }
        default: state { reply($0, nil) }
        }
    }
}

final class PermHandler: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        Perm.handle(message.body as? String ?? "get", reply: replyHandler)
    }
}
