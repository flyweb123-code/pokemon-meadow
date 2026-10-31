import CloudKit
import CryptoKit
import UIKit
import WebKit

// 친구 서버: iCloud 공개 DB(CloudKit)에 내 트레이너 카드를 올리고, 친구 코드로 친구 카드를 받아 온다.
// 레코드 종류 Trainer, 레코드 이름 = "T_" + 친구 코드. 카드 내용은 card(문자열, 게임이 만든 JSON) 하나에 넣어서
// 카드에 항목을 더해도 CloudKit 콘솔에서 스키마를 다시 배포할 필요가 없다.
// 전체 랭킹용으로 wk(이번 주 월요일, Queryable)·wkm(이번 주 km, Sortable)·dex(도감 수, Queryable+Sortable) 필드를 따로 둔다.
// 미니게임 랭킹은 레코드 종류 Score, 레코드 이름 = "S_" + 친구 코드 + "_" + 게임 id (game Queryable, best Sortable, card).
// 친구 코드는 이 앱의 iCloud 사용자 ID 에서 만들어서 앱을 지웠다 깔거나 기기를 바꿔도 그대로다.
// 게임은 webkit.messageHandlers.friends.postMessage({op}) 의 Promise 로 답을 받는다.
final class FriendServer: NSObject, WKScriptMessageHandlerWithReply {
    static let shared = FriendServer()

    private let container = CKContainer(identifier: "iCloud.com.flyweb123.pokerun")
    private var db: CKDatabase { container.publicCloudDatabase }
    private var myCode: String?

    @MainActor
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) async -> (Any?, String?) {
        guard let body = message.body as? [String: Any], let op = body["op"] as? String else { return (nil, "잘못된 요청") }
        do {
            switch op {
            case "me": return (try await code(), nil)
            case "publish":
                guard let card = body["card"] as? String, card.utf8.count < 50_000 else { return (nil, "카드가 너무 커요") }
                try await publish(card, wk: body["wk"] as? String ?? "", wkm: (body["wkm"] as? NSNumber)?.doubleValue ?? 0, dex: (body["dex"] as? NSNumber)?.intValue ?? 0)
                return (true, nil)
            case "get":
                let codes = (body["codes"] as? [String] ?? []).map(clean).filter { $0.count == 8 }
                return (try await fetch(Array(Set(codes)).prefix(100).map { $0 }), nil)
            case "top":
                guard let wk = body["wk"] as? String, !wk.isEmpty else { return (nil, "잘못된 요청") }
                return (try await top(wk, dex: body["kind"] as? String == "dex"), nil)
            case "score":
                guard let game = body["game"] as? String, game.count <= 20, game.allSatisfy({ $0.isLetter || $0.isNumber }),
                      let card = body["card"] as? String, card.utf8.count < 5_000 else { return (nil, "잘못된 요청") }
                try await score(game, best: (body["best"] as? NSNumber)?.doubleValue ?? 0, card: card)
                return (true, nil)
            case "acctNew", "acctLogin":
                guard let id = acctId(body["id"]), let pw = body["pw"] as? String, (4...64).contains(pw.count) else { return (nil, "아이디는 영문 소문자·숫자 4~12글자, 비밀번호는 4글자 이상이에요") }
                return op == "acctNew" ? (try await acctNew(id, pw), nil) : (try await acctLogin(id, pw), nil)
            case "acctSave":
                guard let id = acctId(body["id"]), let k = body["k"] as? String, k.count == 64, let data = body["data"] as? String, data.utf8.count < 20_000_000 else { return (nil, "잘못된 요청") }
                try await acctSave(id, k: k, data: data)
                return (true, nil)
            case "acctPull":   // v12.09: 켤 때 다른 폰이 더 최근에 올린 기록이 있는지 (가장 최근 저장 하나)
                guard let id = acctId(body["id"]), let k = body["k"] as? String, k.count == 64 else { return (nil, "잘못된 요청") }
                return (try await newestSave(id, k: k), nil)
            case "mgtop":
                guard let game = body["game"] as? String, !game.isEmpty else { return (nil, "잘못된 요청") }
                return (try await mgTop(game), nil)
            default: return (nil, "모르는 요청")
            }
        } catch {
            return (nil, describe(error))
        }
    }

    // 친구 코드 8글자 (헷갈리는 0·O·1·I 는 뺀다)
    private func code() async throws -> String {
        if let myCode { return myCode }
        switch try await container.accountStatus() {
        case .available: break
        case .noAccount: throw FriendError("아이폰 설정에서 iCloud 에 로그인해 주세요")
        case .restricted: throw FriendError("이 아이폰은 iCloud 를 쓸 수 없게 막혀 있어요")
        default: throw FriendError("iCloud 상태를 확인하지 못했어요. 잠시 뒤 다시 해 주세요")
        }
        let uid = try await container.userRecordID().recordName
        let abc = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        let code = String(SHA256.hash(data: Data(uid.utf8)).prefix(8).map { abc[Int($0) % abc.count] })
        myCode = code
        return code
    }

    private func recordID(_ code: String) -> CKRecord.ID { CKRecord.ID(recordName: "T_" + code) }

    private func publish(_ card: String, wk: String, wkm: Double, dex: Int) async throws {
        let id = recordID(try await code())
        func make(_ withDex: Bool) -> CKRecord {
            let r = CKRecord(recordType: "Trainer", recordID: id)
            r["card"] = card as CKRecordValue
            r["wk"] = wk as CKRecordValue
            r["wkm"] = max(0, wkm) as CKRecordValue
            if withDex { r["dex"] = max(0, dex) as CKRecordValue }
            return r
        }
        // 가져오지 않고 바로 덮어쓴다 (내 레코드는 나만 쓸 수 있다).
        // 콘솔에 dex 필드를 아직 배포하지 않았으면 Production 이 거절하므로 dex 없이 한 번 더 올린다
        do { _ = try await db.modifyRecords(saving: [make(true)], deleting: [], savePolicy: .allKeys) }
        catch let e as CKError where ![CKError.Code.networkUnavailable, .networkFailure, .notAuthenticated, .requestRateLimited, .serviceUnavailable].contains(e.code) {
            _ = try await db.modifyRecords(saving: [make(false)], deleting: [], savePolicy: .allKeys)
        }
    }

    // 미니게임 최고 기록: 게임마다 레코드 하나 (덮어쓴다)
    private func score(_ game: String, best: Double, card: String) async throws {
        let me = try await code()
        let r = CKRecord(recordType: "Score", recordID: CKRecord.ID(recordName: "S_\(me)_\(game)"))
        r["game"] = game as CKRecordValue
        r["best"] = (game.hasPrefix("fr") ? best : max(0, best)) as CKRecordValue   // 친구 요청: best > 0 요청, < 0 수락, 0 취소 (알림 구독이 이걸로 가른다)
        r["card"] = card as CKRecordValue
        _ = try await db.modifyRecords(saving: [r], deleting: [], savePolicy: .allKeys)
    }

    // ---------- 친구 요청 아이폰 알림 (v13.00 경완 2026-10-31 '친구 요청 받으면 아이폰 알림 뜨게') ----------
    // 서버 없이 CloudKit 구독(CKQuerySubscription)으로 받는다: 누가 Score 에 game == "fr"+내 코드 를 쓰면 iCloud 가 이 폰에 알림을 보낸다.
    // best > 0 = 새 친구 요청, best < 0 = 내 요청을 수락함, best == 0 = 보낸 쪽이 취소 (알림 없음).
    // 게임 설정 › 알림에서 끄면 구독을 지운다. 같은 상태면 다시 올리지 않는다 (UserDefaults frSub).
    private var subWant: String?
    private var subBusy = false
    @MainActor
    func setReqPush(_ on: Bool) {
        let key = "frSub"
        guard !subBusy, subWant != (on ? "on" : "off") else { return }
        subBusy = true
        subWant = on ? "on" : "off"   // 이번 실행에서는 같은 요청을 한 번만 해 본다 (iCloud 가 없을 때 저장할 때마다 다시 묻지 않게)
        Task { @MainActor in
            defer { subBusy = false }
            do {
                let me = try await code()
                let want = on ? "on:" + me : "off:" + me
                if UserDefaults.standard.string(forKey: key) == want { if on { UIApplication.shared.registerForRemoteNotifications() }; return }
                let ids = [CKSubscription.ID("frq_" + me), CKSubscription.ID("fra_" + me)]
                if on {
                    UIApplication.shared.registerForRemoteNotifications()
                    func sub(_ id: CKSubscription.ID, _ op: String, _ title: String, _ body: String) -> CKQuerySubscription {
                        let s = CKQuerySubscription(recordType: "Score", predicate: NSPredicate(format: "game == %@ AND best \(op) %@", "fr" + me, NSNumber(value: 0.0)),
                                                    subscriptionID: id, options: [.firesOnRecordCreation, .firesOnRecordUpdate])
                        let n = CKSubscription.NotificationInfo()
                        n.title = title
                        n.alertBody = body
                        n.soundName = "default"
                        s.notificationInfo = n
                        return s
                    }
                    let (res, _) = try await db.modifySubscriptions(saving: [
                        sub(ids[0], ">", "친구 요청이 왔어요!", "포켓몬 키우기를 열어 친구 요청을 확인해 보세요."),
                        sub(ids[1], "<", "친구가 되었어요!", "친구 요청이 수락됐어요. 이제 알을 선물할 수 있어요."),
                    ], deleting: [])
                    for r in res.values { if case .failure(let e) = r { throw e } }
                } else {
                    _ = try await db.modifySubscriptions(saving: [], deleting: ids)
                }
                UserDefaults.standard.set(want, forKey: key)
            } catch {
                subWant = nil   // 다음 실행 때(또는 설정을 바꿨을 때) 다시 해 본다
            }
        }
    }

    // 미니게임 전체 랭킹: 그 게임 최고 기록 순서로 100명 [{code, card, best, at}]
    private func mgTop(_ game: String) async throws -> [[String: Any]] {
        let q = CKQuery(recordType: "Score", predicate: NSPredicate(format: "game == %@", game))
        q.sortDescriptors = [NSSortDescriptor(key: "best", ascending: false)]
        let (found, _) = try await db.records(matching: q, resultsLimit: 100)
        return found.compactMap { id, res in
            guard case .success(let r) = res, let card = r["card"] as? String, id.recordName.hasPrefix("S_"), id.recordName.count >= 10 else { return nil }
            return ["code": String(id.recordName.dropFirst(2).prefix(8)), "card": card, "best": (r["best"] as? Double) ?? 0,
                    "at": (r.modificationDate ?? Date()).timeIntervalSince1970 * 1000]
        }
    }

    // 없는 코드는 빼고 돌려준다: [{code, card, at(ms)}]
    private func fetch(_ codes: [String]) async throws -> [[String: Any]] {
        guard !codes.isEmpty else { return [] }
        let found = try await db.records(for: codes.map(recordID))
        return codes.compactMap { code in
            guard case .success(let r) = found[recordID(code)], let card = r["card"] as? String else { return nil }
            return ["code": code, "card": card, "at": (r.modificationDate ?? Date()).timeIntervalSince1970 * 1000]
        }
    }

    // 전체 랭킹: 이번 주 카드 중 많이 걸은 순서로 100명 (dex 면 도감 많이 채운 순서로)
    private func top(_ wk: String, dex: Bool) async throws -> [[String: Any]] {
        let q = dex ? CKQuery(recordType: "Trainer", predicate: NSPredicate(format: "dex > 0"))
                    : CKQuery(recordType: "Trainer", predicate: NSPredicate(format: "wk == %@", wk))
        q.sortDescriptors = [NSSortDescriptor(key: dex ? "dex" : "wkm", ascending: false)]
        let (found, _) = try await db.records(matching: q, resultsLimit: 100)
        return found.compactMap { id, res in
            guard case .success(let r) = res, let card = r["card"] as? String, id.recordName.hasPrefix("T_") else { return nil }
            return ["code": String(id.recordName.dropFirst(2)), "card": card, "at": (r.modificationDate ?? Date()).timeIntervalSince1970 * 1000]
        }
    }

    // ---------- 계정 (v11.97 경완 2026-10-30 '아이디·비밀번호 계정, 데이터 저장, 너가 보게') ----------
    // Account: 이름 "A_" + 아이디, pwh = 소금$해시(비밀번호 2만 번). 만든 사람만 고칠 수 있어 아이디를 뺏기지 않는다.
    // Save: 이름 "V_" + 아이디 + "_" + 친구 코드 (기기 = iCloud 마다 하나, 다른 폰에서 로그인해도 각자 올림), acct(Queryable)·sig·data(Asset).
    // sig = SHA256(k + SHA256(data)), k = SHA256("pkgk:" + 아이디 + ":" + 비밀번호) — 비밀번호를 모르면 남의 계정에 가짜 저장을 끼워 넣을 수 없다.
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
    private func keyOf(_ id: String, _ pw: String) -> String { sha("pkgk:\(id):\(pw)") }

    private func acctNew(_ id: String, _ pw: String) async throws -> [String: Any] {
        let code = try await code()
        let salt = hex((0..<16).map { _ in UInt8.random(in: 0...255) })
        let r = CKRecord(recordType: "Account", recordID: CKRecord.ID(recordName: "A_" + id))
        r["pwh"] = "\(salt)$\(pwHash(pw, salt: salt))" as CKRecordValue
        r["code"] = code as CKRecordValue
        // 한 레코드씩 저장 결과가 따로 와서 (async modifyRecords 는 레코드 실패를 던지지 않는다) 직접 본다
        do { try await saveOne(r, .ifServerRecordUnchanged) }
        catch let e as CKError where e.code == .serverRecordChanged || e.code == .permissionFailure { throw FriendError("이미 있는 아이디예요. 다른 아이디를 골라 주세요") }
        return ["id": id, "k": keyOf(id, pw)]
    }

    private func acctLogin(_ id: String, _ pw: String) async throws -> [String: Any] {
        let found = try await db.records(for: [CKRecord.ID(recordName: "A_" + id)])
        guard case .success(let a) = found[CKRecord.ID(recordName: "A_" + id)], let pwh = a["pwh"] as? String else { throw FriendError("없는 아이디예요") }
        let parts = pwh.split(separator: "$").map(String.init)
        guard parts.count == 2, pwHash(pw, salt: parts[0]) == parts[1] else { throw FriendError("비밀번호가 맞지 않아요") }
        let k = keyOf(id, pw)
        var out: [String: Any] = ["id": id, "k": k]
        out.merge(try await newestSave(id, k: k)) { _, b in b }
        return out
    }

    // 이 계정으로 올린 저장(기기마다 하나) 중 서명이 맞고 가장 최근에 '한' 것. v12.09: 올린 시각이 아니라 게임 안 저장 시각(savedAt)으로 고른다
    // (오프라인으로 하다 늦게 올린 폰이 더 최근 기록을 덮지 않게)
    private func newestSave(_ id: String, k: String) async throws -> [String: Any] {
        let (rs, _) = try await db.records(matching: CKQuery(recordType: "Save", predicate: NSPredicate(format: "acct == %@", id)), resultsLimit: 20)
        var best: (Double, String)? = nil
        for (_, res) in rs {
            guard case .success(let r) = res, let sig = r["sig"] as? String, let asset = r["data"] as? CKAsset, let url = asset.fileURL,
                  let d = try? Data(contentsOf: url), let txt = String(data: d, encoding: .utf8), sha(k + sha(txt)) == sig else { continue }
            let sa = ((try? JSONSerialization.jsonObject(with: d)) as? [String: Any])?["savedAt"] as? NSNumber
            let t = sa?.doubleValue ?? (r.modificationDate ?? .distantPast).timeIntervalSince1970 * 1000
            if best == nil || t > best!.0 { best = (t, txt) }
        }
        guard let best else { return [:] }
        return ["data": best.1, "t": best.0]
    }

    private func acctSave(_ id: String, k: String, data: String) async throws {
        let code = try await code()
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("save_\(id).json")
        try Data(data.utf8).write(to: url, options: .atomic)
        defer { try? FileManager.default.removeItem(at: url) }
        let r = CKRecord(recordType: "Save", recordID: CKRecord.ID(recordName: "V_\(id)_\(code)"))
        r["acct"] = id as CKRecordValue
        r["sig"] = sha(k + sha(data)) as CKRecordValue
        r["data"] = CKAsset(fileURL: url)
        try await saveOne(r, .allKeys)
    }

    private func saveOne(_ r: CKRecord, _ policy: CKModifyRecordsOperation.RecordSavePolicy) async throws {
        let (res, _) = try await db.modifyRecords(saving: [r], deleting: [], savePolicy: policy)
        if case .failure(let e) = res[r.recordID] { throw e }
    }

    private func clean(_ s: String) -> String { s.uppercased().filter { $0.isLetter || $0.isNumber } }

    private func describe(_ error: Error) -> String {
        if let e = error as? FriendError { return e.msg }
        guard let ck = error as? CKError else { return error.localizedDescription }
        switch ck.code {
        case .notAuthenticated: return "아이폰 설정에서 iCloud 에 로그인해 주세요"
        case .networkUnavailable, .networkFailure: return "인터넷 연결을 확인해 주세요"
        case .serviceUnavailable, .requestRateLimited, .zoneBusy: return "친구 서버가 바빠요. 잠시 뒤 다시 해 주세요"
        case .quotaExceeded: return "친구 서버 저장 공간이 가득 찼어요"
        case .permissionFailure: return "친구 서버에 쓸 권한이 없어요"
        case .invalidArguments: return "친구 서버 설정이 아직 덜 됐어요 (CloudKit 필드·인덱스)"
        case .unknownItem: return "친구 서버 설정이 아직 덜 됐어요 (CloudKit 레코드 종류)"
        default: return "친구 서버 오류 (\(ck.code.rawValue)): \(ck.localizedDescription)"
        }
    }
}

struct FriendError: Error { let msg: String; init(_ m: String) { msg = m } }
