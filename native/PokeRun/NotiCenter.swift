import Foundation
import UIKit
import UserNotifications

// 앱 푸시 알림 (2026-10-17 경완: 알을 주웠을 때, 알이 부화할 준비가 됐을 때, 짝꿍이 진화할 준비가 됐을 때 진동과 함께)
// 서버 없이 앱 안에서 띄우는 로컬 알림이다.
// 게임은 저장할 때마다 '앞으로 몇 km 더 걸으면 무슨 일이 생기는지'(notiPlan)를 보낸다.
// 화면이 꺼져 있는 동안 WalkTracker 가 걸은 거리를 넘겨 주면, 그 거리를 넘은 항목마다 알림을 띄운다.
// 앱이 켜져 있을 땐 게임이 알림창과 진동으로 알려 주므로 여기서는 띄우지 않는다.
final class NotiCenter: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotiCenter()

    struct Item: Codable { let id: String; let km: Double; let title: String; let body: String; let n: Int }
    struct Plan: Codable { var on: Bool; var items: [Item]; var base: Double }

    private let planKey = "notiPlan"
    private let firedKey = "notiFired"
    private let totalKey = "notiWalkTotal"
    private var asked = false

    // 앱이 받은 걸음 거리 누적 (km). 계획의 base 와 비교해 '계획을 받은 뒤 걸은 거리'를 구한다
    private var total: Double {
        get { UserDefaults.standard.double(forKey: totalKey) }
        set { UserDefaults.standard.set(newValue, forKey: totalKey) }
    }
    private var plan: Plan? {
        get { UserDefaults.standard.data(forKey: planKey).flatMap { try? JSONDecoder().decode(Plan.self, from: $0) } }
        set { UserDefaults.standard.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: planKey) }
    }
    private var fired: Set<String> {
        get { Set(UserDefaults.standard.stringArray(forKey: firedKey) ?? []) }
        set { UserDefaults.standard.set(Array(newValue), forKey: firedKey) }
    }

    func setup() { UNUserNotificationCenter.current().delegate = self }

    // 앱을 열면 쌓인 알림은 지운다 (게임 화면이 같은 소식을 보여 준다)
    func clearDelivered() { UNUserNotificationCenter.current().removeAllDeliveredNotifications() }

    // 게임 → 계획. pendingKm 은 아직 게임에 넘기지 못한 걸음 거리 (그만큼은 계획에 반영되지 않았다)
    func update(_ dict: [String: Any], pendingKm: Double) {
        let on = dict["on"] as? Bool ?? false
        let items: [Item] = (dict["items"] as? [[String: Any]] ?? []).compactMap { d in
            guard let id = d["id"] as? String, let km = (d["km"] as? NSNumber)?.doubleValue, km > 0 else { return nil }
            return Item(id: id, km: km, title: d["title"] as? String ?? "포켓몬 키우기", body: d["body"] as? String ?? "", n: (d["n"] as? NSNumber)?.intValue ?? 1)
        }
        plan = Plan(on: on, items: items, base: total - pendingKm)
        // 새 계획에 남아 있는 항목 중 이미 알린 것만 기억한다 (같은 일을 두 번 알리지 않게)
        let ids = Set(items.map(\.id))
        fired = fired.intersection(ids)
        if on { askPermission() }
    }

    // WalkTracker → 걸은 거리 (화면이 꺼져 있어도 주요 위치 변경·걷는 중 위치로 깨어날 때마다 들어온다)
    func walked(_ km: Double) {
        guard km > 0 else { return }
        total += km
        check()
    }

    private func check() {
        guard UIApplication.shared.applicationState != .active, let plan, plan.on else { return }
        let d = total - plan.base
        var done = fired
        let hit = plan.items.filter { d >= $0.km && !done.contains($0.id) }
        guard !hit.isEmpty else { return }
        hit.forEach { done.insert($0.id) }
        fired = done
        // 같은 종류가 한꺼번에 여러 개면 하나로 묶는다 (오래 걷고 나서 한 번에 깨어난 경우)
        for kind in ["egg", "hatch", "evo"] {
            let g = hit.filter { $0.id.hasPrefix(kind + "-") }
            guard let first = g.first else { continue }
            if g.count == 1 { post(id: first.id, title: first.title, body: first.body); continue }
            let n = g.reduce(0) { $0 + max(1, $1.n) }
            switch kind {
            case "egg": post(id: first.id, title: first.title, body: "걷다가 알 \(n)개를 주웠어요. 가방을 확인해 보세요.")
            case "hatch": post(id: first.id, title: first.title, body: "알 \(g.count)개가 움직이기 시작했어요. 부화기에서 부화시켜 보세요.")
            default: post(id: first.id, title: first.title, body: "짝꿍 \(g.count)마리가 진화할 수 있어요. 짝꿍 탭에서 진화시켜 보세요.")
            }
        }
    }

    private func post(id: String, title: String, body: String) {
        let c = UNMutableNotificationContent()
        c.title = title
        c.body = body
        c.sound = .default   // 무음 모드에서는 진동만
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: c, trigger: nil))
    }

    private func askPermission() {
        guard !asked else { return }
        asked = true
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    // 앱 화면이 켜져 있을 때 온 알림은 띄우지 않는다 (게임이 직접 알려 준다)
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([])
    }
}
