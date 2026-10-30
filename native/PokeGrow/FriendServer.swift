import CloudKit
import CryptoKit
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
        r["best"] = max(0, best) as CKRecordValue
        r["card"] = card as CKRecordValue
        _ = try await db.modifyRecords(saving: [r], deleting: [], savePolicy: .allKeys)
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
