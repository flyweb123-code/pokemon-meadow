import CoreLocation
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
        // 알림 계획은 앱에서만 쓰고 워치에는 보내지 않는다 (NotiCenter)
        var state = body
        if let noti = state.removeValue(forKey: "noti") as? [String: Any] { NotiCenter.shared.update(noti, pendingKm: pendingWalkKm()) }
        guard let data = try? JSONSerialization.data(withJSONObject: state) else { return }
        UserDefaults.standard.set(data, forKey: stateKey)
        sendState(data)
    }

    private func sendState(_ data: Data) {
        let s = WCSession.default
        guard WCSession.isSupported(), s.activationState == .activated, s.isPaired, s.isWatchAppInstalled else { return }
        try? s.updateApplicationContext(["state": data, "at": Date().timeIntervalSince1970])
    }

    // MARK: watch → app

    // 대기열 한 칸: [달린 거리 km, 시작 시각(초, 모르면 0), 끝 시각(초), 종류(0 워치, 1 자동 감지, 2 건강 앱)]
    private func pendingRuns() -> [[Double]] {
        let raw = UserDefaults.standard.array(forKey: pendingKey) ?? []
        return raw.compactMap { ($0 as? [Double]) ?? (($0 as? Double).map { [$0, 0] }) }
    }

    // 모션 기록에서 찾은 달리기(WalkTracker, kind 1), 건강 앱 운동(HealthSync, kind 2)
    func enqueueRun(km: Double, start: Double, end: Double, kind: Double) {
        var list = pendingRuns()
        list.append([km, start, end, kind])
        UserDefaults.standard.set(list, forKey: pendingKey)
        flushPending()
    }

    // MARK: 운동 경로의 몇 곳 → 그 런닝에서 주운 알의 '주운 곳' (HealthSync)

    private let placesKey = "pendingPlaces"

    func enqueuePlaces(start: Double, end: Double, places: [[Any]]) {
        var list = UserDefaults.standard.array(forKey: placesKey) as? [[String: Any]] ?? []
        list.append(["start": start, "end": end, "places": places])
        UserDefaults.standard.set(list, forKey: placesKey)
        flushPending()
    }

    private func flushPlaces(_ web: WKWebView) {
        let list = UserDefaults.standard.array(forKey: placesKey) as? [[String: Any]] ?? []
        guard !list.isEmpty else { return }
        UserDefaults.standard.set([[String: Any]](), forKey: placesKey)
        for item in list {
            let s = (item["start"] as? Double ?? 0) * 1000, e = (item["end"] as? Double ?? 0) * 1000
            guard let data = try? JSONSerialization.data(withJSONObject: item["places"] ?? []),
                  let arg = String(data: data, encoding: .utf8) else { continue }
            web.evaluateJavaScript("window.pokeRunPlaces ? window.pokeRunPlaces(\(Int(s)), \(Int(e)), \(arg)) : false") { [weak self] result, error in
                if error != nil || (result as? Bool) == false, let self {
                    var back = UserDefaults.standard.array(forKey: self.placesKey) as? [[String: Any]] ?? []
                    back.append(item)
                    UserDefaults.standard.set(back, forKey: self.placesKey)
                }
            }
        }
    }

    // MARK: 걸음 → 가방 알 (WalkTracker)

    private let walkKey = "pendingWalk"

    // 오늘 걸은 거리 (화면 표시용, 실시간)
    private var todayKm: Double?
    private var todayDay = 0.0
    func sendToday(km: Double, day: Date) {
        todayKm = km; todayDay = day.timeIntervalSince1970
        flushToday()
    }
    private func flushToday() {
        guard gameReady, let web = webView, let km = todayKm else { return }
        web.evaluateJavaScript("window.pokeRunToday && window.pokeRunToday(\(km), \(todayDay * 1000))")
    }

    // 만보기 문제를 게임 프로필에 보여 준다 (이동 거리가 안 늘 때 원인 확인용)
    private var pedErr: String?
    func sendPedErr(_ msg: String) {
        pedErr = msg
        guard gameReady, let web = webView,
              let data = try? JSONSerialization.data(withJSONObject: [msg]), let arg = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.pokeRunPedErr && window.pokeRunPedErr(\(arg)[0])")
    }

    // 아직 게임에 넘기지 못한 걸음 거리 합
    func pendingWalkKm() -> Double {
        (UserDefaults.standard.array(forKey: walkKey) as? [[String: Any]] ?? []).reduce(0) { $0 + ($1["km"] as? Double ?? 0) }
    }

    func enqueueWalk(km: Double, place: String, tags: [String] = [], at: CLLocationCoordinate2D? = nil) {
        NotiCenter.shared.walked(km)   // 화면이 꺼져 있으면 알·부화·진화 알림을 확인한다
        var list = UserDefaults.standard.array(forKey: walkKey) as? [[String: Any]] ?? []
        var item: [String: Any] = ["km": km, "place": place, "tags": tags.joined(separator: ",")]
        if let at { item["la"] = at.latitude; item["lo"] = at.longitude }   // 출현 지역(작업실 지도) 확인용 좌표
        list.append(item)
        UserDefaults.standard.set(list, forKey: walkKey)
        flushPending()
    }

    private func flushWalk(_ web: WKWebView) {
        let list = UserDefaults.standard.array(forKey: walkKey) as? [[String: Any]] ?? []
        guard !list.isEmpty else { return }
        UserDefaults.standard.set([[String: Any]](), forKey: walkKey)
        for item in list {
            let km = item["km"] as? Double ?? 0
            let place = (item["place"] as? String ?? "")
            let tags = (item["tags"] as? String ?? "")
            guard let placeJSON = try? JSONSerialization.data(withJSONObject: [place, tags]),
                  let arg = String(data: placeJSON, encoding: .utf8) else { continue }
            // arg 는 ["동네", "water,park"] 모양이라 [0], [1] 로 꺼낸다 (따옴표가 섞여도 안전)
            let ll = (item["la"] as? Double).flatMap { la in (item["lo"] as? Double).map { ", \(la), \($0)" } } ?? ""
            web.evaluateJavaScript("window.pokeRunWalk(\(km), \(arg)[0], \(arg)[1]\(ll))") { [weak self] result, error in
                if error != nil || (result as? Bool) == false, let self {
                    var back = UserDefaults.standard.array(forKey: self.walkKey) as? [[String: Any]] ?? []
                    back.append(item)
                    UserDefaults.standard.set(back, forKey: self.walkKey)
                }
            }
        }
    }

    private func flushPending() {
        guard gameReady, let web = webView else { return }
        flushWalk(web)
        flushToday()
        if todayKm == nil, let e = pedErr { sendPedErr(e) }
        let list = pendingRuns()
        defer { flushPlaces(web) }
        guard !list.isEmpty else { return }
        UserDefaults.standard.set([[Double]](), forKey: pendingKey)
        for item in list {
            let km = item[0], startMs = (item.count > 1 ? item[1] : 0) * 1000
            let endMs = (item.count > 2 ? item[2] : 0) * 1000
            let kind = item.count > 3 ? item[3] : 0
            let src = kind == 1 ? "auto" : kind == 2 ? "health" : "watch"
            web.evaluateJavaScript("window.pokeRunAddKm(\(km), \(Int(startMs)), '\(src)', \(Int(endMs)))") { [weak self] result, error in
                // 넣지 못했으면 다시 대기열로
                if error != nil || (result as? Bool) == false, let self {
                    var back = self.pendingRuns()
                    back.append(item)
                    UserDefaults.standard.set(back, forKey: self.pendingKey)
                }
            }
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        guard let km = userInfo["km"] as? Double, km > 0 else { return }
        let start = userInfo["start"] as? Double ?? 0
        let end = userInfo["end"] as? Double ?? 0
        DispatchQueue.main.async { self.enqueueRun(km: km, start: start, end: end, kind: 0) }
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
