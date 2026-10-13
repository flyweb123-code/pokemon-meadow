import Foundation
import WatchConnectivity
import WebKit

// 게임 ↔ 아이폰 앱 ↔ 워치.
// 게임은 저장할 때마다 알 현황을 보내고(pokeRun 메시지), 앱은 그걸 워치에 넘긴다.
// 워치에서 달린 거리는 대기열에 쌓았다가 게임이 준비되면 window.pokeRunAddKm 으로 넣는다.
final class PhoneBridge: NSObject, ObservableObject, WKScriptMessageHandler, WCSessionDelegate {
    static let shared = PhoneBridge()

    weak var webView: WKWebView?
    var gameReady = false { didSet { if gameReady { flushPending() } } }

    private let stateKey = "lastState"
    private let pendingKey = "pendingKm"

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: game → app

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        if body["ready"] as? Bool == true {
            gameReady = true
            return
        }
        guard let data = try? JSONSerialization.data(withJSONObject: body) else { return }
        UserDefaults.standard.set(data, forKey: stateKey)
        sendState(data)
    }

    private func sendState(_ data: Data) {
        let s = WCSession.default
        guard WCSession.isSupported(), s.activationState == .activated, s.isPaired, s.isWatchAppInstalled else { return }
        try? s.updateApplicationContext(["state": data, "at": Date().timeIntervalSince1970])
    }

    // MARK: watch → app

    private func enqueue(_ km: Double) {
        var list = UserDefaults.standard.array(forKey: pendingKey) as? [Double] ?? []
        list.append(km)
        UserDefaults.standard.set(list, forKey: pendingKey)
        flushPending()
    }

    private func flushPending() {
        guard gameReady, let web = webView else { return }
        let list = UserDefaults.standard.array(forKey: pendingKey) as? [Double] ?? []
        guard !list.isEmpty else { return }
        UserDefaults.standard.set([Double](), forKey: pendingKey)
        for km in list {
            web.evaluateJavaScript("window.pokeRunAddKm(\(km))") { [weak self] result, error in
                // 넣지 못했으면 다시 대기열로
                if error != nil || (result as? Bool) == false, let self {
                    var back = UserDefaults.standard.array(forKey: self.pendingKey) as? [Double] ?? []
                    back.append(km)
                    UserDefaults.standard.set(back, forKey: self.pendingKey)
                }
            }
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        guard let km = userInfo["km"] as? Double, km > 0 else { return }
        DispatchQueue.main.async { self.enqueue(km) }
    }

    // 워치가 열릴 때 최신 알 현황을 바로 달라고 한다
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        let data = UserDefaults.standard.data(forKey: stateKey) ?? Data()
        replyHandler(["state": data])
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        if state == .activated, let data = UserDefaults.standard.data(forKey: stateKey) {
            DispatchQueue.main.async { self.sendState(data) }
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { WCSession.default.activate() }
}
