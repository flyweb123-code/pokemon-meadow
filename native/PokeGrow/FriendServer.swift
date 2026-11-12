import CloudKit
import CryptoKit
import UIKit
import UserNotifications
import WebKit

// 친구 서버 (2026-11-03 경완: CloudKit → Cloudflare, 안드로이드와 같은 서버). 저장소 server/ 참고.
// 게임은 webkit.messageHandlers.friends.postMessage({op}) 의 Promise 로 답을 받는다. 약속(op·답 모양)은 CloudKit 때와 같다.
// 서버 요청: POST /v1 {op, dev, ...} → {ok, v | err}. dev = 기기 비밀값, 친구 코드 = SHA256(dev) → 8글자.
// dev 는 iCloud 사용자 ID 를 그대로 써서 CloudKit 때와 친구 코드가 같다 (iCloud 가 없으면 이 기기에서 만든 값).
// 계정으로 로그인하면 그 계정을 만든 기기의 dev 를 받아 같은 친구 코드를 쓴다 (아이폰·안드로이드·아이패드 어디서든).
// 비밀번호는 서버로 보내지 않는다: 소금으로 2만 번 해시(ph)와 k = sha("pkgk:id:pw") 만 보낸다.
// 알림(친구 요청·공지)은 서버가 푸시를 보내지 않으니, 앱이 깨어날 때(걷다가 위치 변경 등) poll() 로 물어본다.
final class FriendServer: NSObject, WKScriptMessageHandlerWithReply {
    static let shared = FriendServer()
    static let serverURL = URL(string: "https://pokegrow.flyweb123.workers.dev/v1")!

    private let container = CKContainer(identifier: "iCloud.com.flyweb123.pokerun")
    private let devKey = "frDev"

    @MainActor
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) async -> (Any?, String?) {
        guard let body = message.body as? [String: Any], let op = body["op"] as? String else { return (nil, "잘못된 요청") }
        do {
            switch op {
            case "me": return (try await code(), nil)
            case "noticeTest":   // v14.49 경완: 공지 푸시를 모두에게 보내기 전에 이 기기에만 5초 뒤 같은 알림
                guard let t = body["title"] as? String, let m = body["body"] as? String, !t.isEmpty, !m.isEmpty else { return (nil, "제목과 내용을 확인해 주세요") }
                if let er = await NotiCenter.test(t, m) { return (nil, er) }
                return (true, nil)
            case "acctNew", "acctLogin":
                guard let id = acctId(body["id"]), let pw = body["pw"] as? String, (4...64).contains(pw.count) else { return (nil, "아이디는 영문 소문자·숫자 4~12글자, 비밀번호는 4글자 이상이에요") }
                return (try await acct(op, id, pw), nil)
            default:
                return (plain(try await call(body)), nil)
            }
        } catch let e as FriendError {
            return (nil, e.msg)
        } catch let e as URLError {
            return (nil, e.code == .notConnectedToInternet || e.code == .networkConnectionLost ? "인터넷 연결을 확인해 주세요" : "친구 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요")
        } catch {
            return (nil, "친구 서버 오류: \(error.localizedDescription)")
        }
    }

    // JSON null → nil (게임에 답으로 줄 수 있는 값만)
    private func plain(_ v: Any?) -> Any? { v is NSNull ? nil : v }

    // ---------- 기기 비밀값·친구 코드 ----------
    private func dev() async throws -> String {
        if let d = UserDefaults.standard.string(forKey: devKey), d.count >= 8 { return d }
        let d: String
        switch try await container.accountStatus() {
        case .available: d = try await container.userRecordID().recordName   // CloudKit 때와 같은 친구 코드
        case .noAccount, .restricted: d = "i:" + hex((0..<24).map { _ in UInt8.random(in: 0...255) })
        default: throw FriendError("iCloud 상태를 확인하지 못했어요. 잠시 뒤 다시 해 주세요")
        }
        UserDefaults.standard.set(d, forKey: devKey)
        return d
    }

    // 친구 코드 8글자 (헷갈리는 0·O·1·I 는 뺀다). 서버도 같은 식으로 계산한다
    private func code() async throws -> String {
        let abc = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        return String(SHA256.hash(data: Data(try await dev().utf8)).prefix(8).map { abc[Int($0) % abc.count] })
    }

    // ---------- 서버 요청 ----------
    private func call(_ body: [String: Any]) async throws -> Any? {
        var b = body
        b["dev"] = try await dev()
        var req = URLRequest(url: FriendServer.serverURL, timeoutInterval: 30)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: b)
        let (data, _) = try await URLSession.shared.data(for: req)
        guard let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw FriendError("친구 서버가 이상한 답을 줬어요") }
        guard j["ok"] as? Bool == true else { throw FriendError(j["err"] as? String ?? "친구 서버 오류") }
        return j["v"]
    }

    // ---------- 계정 ----------
    private func acctId(_ v: Any?) -> String? {
        guard let s = (v as? String)?.lowercased(), (4...12).contains(s.count), s.allSatisfy({ ($0.isLetter && $0.isASCII) || $0.isNumber || $0 == "_" }) else { return nil }
        return s
    }
    private func hex(_ d: some Sequence<UInt8>) -> String { d.map { String(format: "%02x", $0) }.joined() }
    private func sha(_ s: String) -> String { hex(SHA256.hash(data: Data(s.utf8))) }
    private func pwHash(_ pw: String, salt: String) -> String {
        var h = Data(SHA256.hash(data: Data((salt + ":" + pw).utf8)))
        for _ in 0..<20_000 { h = Data(SHA256.hash(data: h + Data(salt.utf8))) }
        return hex(h)
    }

    private func acct(_ op: String, _ id: String, _ pw: String) async throws -> Any? {
        let k = sha("pkgk:\(id):\(pw)")
        if op == "acctNew" {
            let salt = hex((0..<16).map { _ in UInt8.random(in: 0...255) })
            return plain(try await call(["op": op, "id": id, "salt": salt, "ph": pwHash(pw, salt: salt), "k": k]))
        }
        guard let salt = try await call(["op": "acctSalt", "id": id]) as? String else { throw FriendError("없는 아이디예요") }
        guard var r = try await call(["op": "acctLogin", "id": id, "ph": pwHash(pw, salt: salt), "k": k]) as? [String: Any] else { throw FriendError("로그인하지 못했어요") }
        if let d = r.removeValue(forKey: "dev") as? String, d.count >= 8 { UserDefaults.standard.set(d, forKey: devKey) }
        return r
    }

    // ---------- 알림 (친구 요청·공지) ----------
    // 게임 설정 › 알림에서 켠 것만 (NotiCenter 가 게임 계획의 fr·nw 를 넘겨 줌)
    @MainActor func setReqPush(_ on: Bool) { UserDefaults.standard.set(on, forKey: "pushFr"); if on { askAlert() } }
    @MainActor func setNewsPush(_ on: Bool) { UserDefaults.standard.set(on, forKey: "pushNw"); if on { askAlert() } }
    private func askAlert() { UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in } }

    private var pollAt = Date.distantPast
    // 앱이 깨어날 때마다 (최소 5분 간격) 서버에 새 친구 요청·공지가 있는지 묻고, 있으면 알림
    func poll() {
        guard Date().timeIntervalSince(pollAt) > 300 else { return }
        pollAt = Date()
        let d = UserDefaults.standard
        let fr = d.bool(forKey: "pushFr"), nw = d.bool(forKey: "pushNw")
        guard fr || nw else { return }
        Task {
            if fr, let me = try? await code(), let rows = try? await call(["op": "mgtop", "game": "fr" + me]) as? [[String: Any]] {
                let seen = d.double(forKey: "frSeenAt"); var top = seen
                for r in rows {
                    let at = (r["at"] as? NSNumber)?.doubleValue ?? 0, best = (r["best"] as? NSNumber)?.doubleValue ?? 0
                    guard at > seen, best != 0 else { continue }
                    top = max(top, at)
                    guard seen > 0 else { continue }
                    if best > 0 { post("frq-\(Int(at))", "친구 요청이 왔어요!", "포켓에그를 열어 친구 요청을 확인해 보세요.") }
                    else { post("fra-\(Int(at))", "친구가 되었어요!", "친구 요청이 수락됐어요. 이제 알을 선물할 수 있어요.") }
                }
                d.set(seen == 0 ? max(top, Date().timeIntervalSince1970 * 1000) : top, forKey: "frSeenAt")
            }
            if nw {
                let seen = d.object(forKey: "nwSeen") as? Int ?? -1
                if let rows = try? await call(["op": "news", "after": max(0, seen)]) as? [[String: Any]] {
                    var top = max(0, seen)
                    for (i, r) in rows.enumerated() {
                        let n = (r["n"] as? NSNumber)?.intValue ?? 0
                        top = max(top, n)
                        if seen >= 0, i == 0 { post("nw-\(n)", r["title"] as? String ?? "포켓에그", r["body"] as? String ?? "") }
                    }
                    d.set(top, forKey: "nwSeen")
                }
            }
        }
    }

    // ---------- 진짜 푸시: 친구가 내 필드에 놀러 오면 (2026-11-03, 서버 server/src/push.js) ----------
    @MainActor func setVisitPush(_ on: Bool) {
        let d = UserDefaults.standard
        let was = d.object(forKey: "pushFv") as? Bool
        d.set(on, forKey: "pushFv")
        if on && (was != true || d.string(forKey: "pushTok") == nil) {   // 저장할 때마다 오므로 바뀔 때만
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { ok, _ in
                if ok { DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() } }
            }
        } else if was != false { pushSync() }
    }
    func setPushToken(_ tok: String) { UserDefaults.standard.set(tok, forKey: "pushTok"); pushSync() }
    private func pushSync() {
        let d = UserDefaults.standard
        guard let tok = d.string(forKey: "pushTok") else { return }
        let on = d.bool(forKey: "pushFv")
        #if DEBUG
        let env = "dev"      // Xcode 에서 바로 설치한 앱 = 애플 시험 서버
        #else
        let env = "prod"     // TestFlight·앱스토어
        #endif
        let sig = "\(tok):\(on):\(env)"
        // 바뀌었거나 사흘 지났을 때만 (서버가 오래된 토큰을 정리할 수 있게 가끔 다시 알림)
        guard sig != d.string(forKey: "pushRegSig") || Date().timeIntervalSince1970 - d.double(forKey: "pushRegAt") > 3 * 86400 else { return }
        Task {
            do {
                _ = try await call(["op": "pushReg", "tok": tok, "plat": "ios", "env": env, "kinds": on ? ["visit"] : [String]()])
                d.set(sig, forKey: "pushRegSig"); d.set(Date().timeIntervalSince1970, forKey: "pushRegAt")
            } catch { print("pushReg fail:", error) }
        }
    }

    private func post(_ id: String, _ title: String, _ body: String) {
        let c = UNMutableNotificationContent()
        c.title = title; c.body = body; c.sound = .default
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: c, trigger: nil))
    }
}

struct FriendError: Error { let msg: String; init(_ m: String) { msg = m } }
