import CloudKit
import CryptoKit
import WebKit

// 친구 서버: iCloud 공개 DB(CloudKit)에 내 트레이너 카드를 올리고, 친구 코드로 친구 카드를 받아 온다.
// 레코드 종류 Trainer, 레코드 이름 = "T_" + 친구 코드, 필드는 card(문자열, 게임이 만든 JSON) 하나뿐이라
// 카드에 항목을 더해도 CloudKit 콘솔에서 스키마를 다시 배포할 필요가 없다.
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
                try await publish(card)
                return (true, nil)
            case "get":
                let codes = (body["codes"] as? [String] ?? []).map(clean).filter { $0.count == 8 }
                return (try await fetch(Array(Set(codes)).prefix(100).map { $0 }), nil)
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

    private func publish(_ card: String) async throws {
        let r = CKRecord(recordType: "Trainer", recordID: recordID(try await code()))
        r["card"] = card as CKRecordValue
        // 가져오지 않고 바로 덮어쓴다 (내 레코드는 나만 쓸 수 있다)
        _ = try await db.modifyRecords(saving: [r], deleting: [], savePolicy: .allKeys)
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
        default: return "친구 서버 오류 (\(ck.code.rawValue)): \(ck.localizedDescription)"
        }
    }
}

struct FriendError: Error { let msg: String; init(_ m: String) { msg = m } }
