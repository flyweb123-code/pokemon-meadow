import CoreLocation
import Foundation
import UIKit
import UserNotifications

// v22.58 경완 (2026-11-13): 앱이 꺼져 있을 때 '새로운 지역!' 알림창이나 '이벤트!' 알림창이 뜰 곳에 들어오면 휴대폰 알림.
// 게임이 알림 계획(noti)의 zn 에 알릴 곳 목록을 보낸다 (index.html notiZones):
//   ev = 이벤트 원 {id, la, lo, r(m), a·b(기간 ms), t 제목, m 내용}, rg = 지역 타원 {k, n, la, lo, r, r2, rot, aw(1 = 지금 낯선 곳)},
//   ct = 낯선 지역 안 시·군 원 {n, la, lo, r}, p = 오늘 이미 알림창을 본 지역 키('c:이름'·'r:이름'), pt = 보낸 시각.
// WalkTracker 가 위치를 받을 때마다(걷는 중·주요 위치 변경·이벤트 자리 들어감) check 를 부른다.
// 알림을 누르면 앱이 열리고 게임이 원래대로 알림창을 띄운다 (여기서 보냈다고 알림창을 건너뛰지 않음).
// 규칙: 앱이 켜져 있으면 안 보냄, 밤 10시~아침 8시엔 안 보냄, 이벤트는 이벤트마다 한 번, 지역은 지역마다 하루 한 번, 둘 다 걸리면 이벤트만.
final class ZoneAlert {
    static let shared = ZoneAlert()

    struct Ev: Codable { let id: String; let la: Double; let lo: Double; let r: Double; let a: Double; let b: Double; let t: String; let m: String }
    struct Rg: Codable { let k: String; let n: String; let la: Double; let lo: Double; let r: Double; let r2: Double; let rot: Double; let aw: Int }
    struct Ct: Codable { let n: String; let la: Double; let lo: Double; let r: Double }
    struct Plan: Codable { var on: Bool; var ev: [Ev]; var rg: [Rg]; var ct: [Ct]; var p: [String]; var pt: Double }

    private let planKey = "zonePlan"
    private let firedKey = "zoneFired"   // 'ev:id' (한 번) · 'day:YYYY-MM-DD:c:이름' (하루 한 번)

    private var plan: Plan? {
        get { UserDefaults.standard.data(forKey: planKey).flatMap { try? JSONDecoder().decode(Plan.self, from: $0) } }
        set { UserDefaults.standard.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: planKey) }
    }
    private var fired: [String] {
        get { UserDefaults.standard.stringArray(forKey: firedKey) ?? [] }
        set { UserDefaults.standard.set(Array(newValue.suffix(120)), forKey: firedKey) }
    }

    func update(_ d: [String: Any]?) {
        guard let d, (d["on"] as? Bool) == true else { plan = nil; WalkTracker.shared.watchZones([]); return }
        let num = { (o: Any?) -> Double in (o as? NSNumber)?.doubleValue ?? 0 }
        let ev: [Ev] = (d["ev"] as? [[String: Any]] ?? []).compactMap { e in
            guard let id = e["id"] as? String else { return nil }
            return Ev(id: id, la: num(e["la"]), lo: num(e["lo"]), r: num(e["r"]), a: num(e["a"]), b: num(e["b"]), t: e["t"] as? String ?? "이벤트!", m: e["m"] as? String ?? "")
        }
        let rg: [Rg] = (d["rg"] as? [[String: Any]] ?? []).compactMap { g in
            guard let k = g["k"] as? String, let n = g["n"] as? String else { return nil }
            return Rg(k: k, n: n, la: num(g["la"]), lo: num(g["lo"]), r: num(g["r"]), r2: num(g["r2"]), rot: num(g["rot"]), aw: (g["aw"] as? NSNumber)?.intValue ?? 0)
        }
        let ct: [Ct] = (d["ct"] as? [[String: Any]] ?? []).compactMap { c in
            guard let n = c["n"] as? String else { return nil }
            return Ct(n: n, la: num(c["la"]), lo: num(c["lo"]), r: num(c["r"]))
        }
        plan = Plan(on: true, ev: ev, rg: rg, ct: ct, p: d["p"] as? [String] ?? [], pt: num(d["pt"]))
        // 이벤트 자리는 iOS 지역 감시도 걸어 둔다 (걷지 않고 차·지하철로 가도 들어가는 순간 깨어남, '항상' 위치 권한일 때만)
        let now = Date().timeIntervalSince1970 * 1000
        WalkTracker.shared.watchZones(ev.filter { $0.b >= now }.map { ($0.id, CLLocationCoordinate2D(latitude: $0.la, longitude: $0.lo), $0.r) })
    }

    private static func dist(_ la1: Double, _ lo1: Double, _ la2: Double, _ lo2: Double) -> Double {
        CLLocation(latitude: la1, longitude: lo1).distance(from: CLLocation(latitude: la2, longitude: lo2))
    }
    // 게임 auEll 과 같은 식 (1 이하 = 타원 안)
    private static func ell(_ la: Double, _ lo: Double, _ g: Rg) -> Double {
        let x = (lo - g.lo) * 111320 * cos(g.la * .pi / 180), y = (la - g.la) * 110540, t = g.rot * .pi / 180
        let u = (x * cos(t) + y * sin(t)) / g.r, v = (-x * sin(t) + y * cos(t)) / (g.r2 > 0 ? g.r2 : g.r)
        return u * u + v * v
    }
    private static func day(_ d: Date = Date()) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
        return "\(c.year ?? 0)-\(c.month ?? 0)-\(c.day ?? 0)"
    }

    func check(_ c: CLLocationCoordinate2D) {
        DispatchQueue.main.async { self.checkMain(c) }
    }
    private func checkMain(_ c: CLLocationCoordinate2D) {
        guard UIApplication.shared.applicationState != .active, let plan, plan.on else { return }
        let h = Calendar.current.component(.hour, from: Date())
        guard h >= 8 && h < 22 else { return }   // 밤 10시~아침 8시엔 안 보냄 (앱 켜면 알림창으로만)
        let now = Date().timeIntervalSince1970 * 1000
        var done = fired
        // 1) 이벤트: 기간 안 + 반경 안 + 아직 안 알린 것
        if let e = plan.ev.first(where: { now >= $0.a && now <= $0.b && !done.contains("ev:" + $0.id) && ZoneAlert.dist(c.latitude, c.longitude, $0.la, $0.lo) <= $0.r }) {
            done.append("ev:" + e.id); fired = done
            post(id: "zone-ev-" + e.id, title: e.t, body: e.m)
            return
        }
        // 2) 지역: 가장 가까운 지역(게임 auRegAt 처럼 반지름 1.5배 안)이 지금 낯선 곳이면 — 시·군 원 안이면 시·군 이름, 아니면 지역 이름
        var best: Rg?, bd = 2.25
        for g in plan.rg { let d = ZoneAlert.ell(c.latitude, c.longitude, g); if d <= bd { bd = d; best = g } }
        guard let g = best, g.aw == 1 else { return }
        var city: Ct?, cd = 1.0
        for t in plan.ct { let d = ZoneAlert.dist(c.latitude, c.longitude, t.la, t.lo) / max(t.r, 1); if d <= cd { cd = d; city = t } }
        let name = city?.n ?? g.n, key = (city != nil ? "c:" : "r:") + name, today = ZoneAlert.day()
        let seenToday = ZoneAlert.day(Date(timeIntervalSince1970: plan.pt / 1000)) == today ? plan.p : []
        guard !seenToday.contains(key), !done.contains("day:\(today):\(key)") else { return }
        done.append("day:\(today):\(key)"); fired = done
        post(id: "zone-rg-\(today)-\(key)", title: "📍 새로운 지역, \(name)에 왔어요!", body: "\(name)에서 많이 나오는 포켓몬을 확인해 보세요.")
    }

    private func post(id: String, title: String, body: String) {
        let n = UNMutableNotificationContent()
        n.title = title; n.body = body; n.sound = .default
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: n, trigger: nil))
    }
}
