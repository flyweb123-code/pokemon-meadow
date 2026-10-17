import CoreLocation
import CoreMotion
import MapKit
import Foundation

// 알 줍기: 휴대폰이 잠겨 있어도 걸은 거리만큼 가방에 알을 넣는다.
// 동네를 옮길 만큼(약 500m) 움직이면 iOS 가 앱을 잠깐 깨워 준다(주요 위치 변경).
// 그때 만보기에서 지난번 이후 걸은 거리를 읽고, 지금 있는 동네 이름과 함께 대기열에 넣는다.
// 게임이 준비되면 PhoneBridge 가 window.pokeRunWalk(km, 동네) 로 넘긴다.
final class WalkTracker: NSObject, CLLocationManagerDelegate {
    static let shared = WalkTracker()

    private let manager = CLLocationManager()
    private let pedometer = CMPedometer()
    private let geocoder = CLGeocoder()
    private let activity = CMMotionActivityManager()
    private let lastKey = "walkLastSync"
    private let runKey = "runLastCheck.v2"
    private var runBusy = false
    private var busy = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func start() {
        guard CMPedometer.isDistanceAvailable() else { return }
        if UserDefaults.standard.object(forKey: lastKey) == nil {
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: lastKey)
        }
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestAlwaysAuthorization()
        case .authorizedWhenInUse: manager.requestAlwaysAuthorization(); begin()
        case .authorizedAlways: begin()
        default: sync(place: nil)
        }
    }

    // 앱 화면이 켜져 있는 동안: 오늘 0시부터 걸은 거리를 만보기에서 실시간으로 받아 게임 프로필에 보낸다.
    // 250m 더 걸을 때마다 알 줍기(sync)도 한 번씩 한다.
    // 만보기 실시간 알림(startUpdates)은 몇 분씩 늦게 오기도 해서, 5초마다 오늘 기록을 직접 물어보는 것도 같이 한다.
    private var liveOn = false
    private var liveSynced = -1.0
    private var liveTimer: Timer?
    private var liveBest = 0.0
    private var liveDay = Date.distantPast
    func startLive() {
        guard CMPedometer.isDistanceAvailable() else { PhoneBridge.shared.sendPedErr("이 기기는 만보기 거리를 지원하지 않아요"); return }
        switch CMPedometer.authorizationStatus() {
        case .denied: PhoneBridge.shared.sendPedErr("동작 및 피트니스 권한이 꺼져 있어요 (설정 › 개인정보 보호 › 동작 및 피트니스)"); return
        case .restricted: PhoneBridge.shared.sendPedErr("동작 및 피트니스 사용이 제한되어 있어요"); return
        default: break
        }
        guard !liveOn else { pollToday(); return }
        liveOn = true
        liveDay = Calendar.current.startOfDay(for: Date()); liveBest = 0
        let day = liveDay
        pedometer.startUpdates(from: day) { [weak self] data, error in
            if let error { DispatchQueue.main.async { PhoneBridge.shared.sendPedErr("실시간: \(error.localizedDescription)") }; return }
            guard let m = data?.distance?.doubleValue else { return }
            DispatchQueue.main.async { self?.gotToday(km: m / 1000, day: day) }
        }
        pollToday()
        let t = Timer(timeInterval: 5, repeats: true) { [weak self] _ in self?.pollToday() }
        RunLoop.main.add(t, forMode: .common)   // 화면을 스크롤하는 동안에도 돈다
        liveTimer = t
    }
    private func pollToday() {
        let now = Date(), day = Calendar.current.startOfDay(for: now)
        if day != liveDay { liveDay = day; liveBest = 0; liveSynced = -1 }   // 자정이 지나면 새 날
        pedometer.queryPedometerData(from: day, to: now) { [weak self] data, error in
            if let error { DispatchQueue.main.async { PhoneBridge.shared.sendPedErr("조회: \(error.localizedDescription)") }; return }
            guard let m = data?.distance?.doubleValue else { return }
            DispatchQueue.main.async { self?.gotToday(km: m / 1000, day: day) }
        }
    }
    private func gotToday(km: Double, day: Date) {
        guard day == liveDay, km >= liveBest else { return }   // 두 길로 오니 더 큰 값만
        liveBest = km
        PhoneBridge.shared.sendToday(km: km, day: day)
        if liveSynced < 0 { liveSynced = km }
        else if km - liveSynced >= 0.25 { liveSynced = km; refresh() }
    }
    func stopLive() {
        guard liveOn else { return }
        pedometer.stopUpdates(); liveTimer?.invalidate(); liveTimer = nil
        liveOn = false; liveSynced = -1
    }

    // 앱을 열 때마다 한 번 더 확인한다
    func refresh() {
        if manager.authorizationStatus == .authorizedAlways || manager.authorizationStatus == .authorizedWhenInUse {
            if tracking, let loc = manager.location { lookAt = nil; place(for: loc) } else { manager.requestLocation() }
        } else {
            sync(place: nil)
        }
    }

    private func begin() {
        if CLLocationManager.significantLocationChangeMonitoringAvailable() {
            manager.startMonitoringSignificantLocationChanges()
        }
        watchMotion()
        manager.requestLocation()
    }

    // MARK: 걷거나 뛰는 동안만 정밀 위치 (2026-10-16 경완: 그동안 주운 알이 모두 같은 장소 이름을 받는 게 싫다)
    // 평소에는 '주요 위치 변경'(약 500m)만 켜 두고, 걷거나 뛰기 시작하면 10m 단위 위치를 켠다.
    // 장소 이름은 알을 줍는 단위(250m)마다 한 번 찾는다 (지도 검색은 자주 부르면 막힌다).
    // 멈추거나 차·자전거를 타면 iOS 가 위치를 잠시 멈추거나(pause) 우리가 끈다.
    private var tracking = false
    private var motionOn = false
    private var lookAt: CLLocation?
    private var lookBusy = false
    private static let lookStep: CLLocationDistance = 250
    private func watchMotion() {
        guard CMMotionActivityManager.isActivityAvailable(), !motionOn else { return }
        motionOn = true
        activity.startActivityUpdates(to: .main) { [weak self] a in
            guard let self, let a else { return }
            if (a.walking || a.running) && a.confidence != .low { self.setTracking(true) }
            else if (a.automotive || a.cycling) && a.confidence != .low { self.setTracking(false) }
        }
    }
    // 주요 위치 변경으로 깨어났을 때: 최근 2분 안에 걷거나 뛰었으면 정밀 위치를 켠다
    private func checkMoving() {
        guard CMMotionActivityManager.isActivityAvailable(), !tracking else { return }
        let now = Date()
        activity.queryActivityStarting(from: now.addingTimeInterval(-120), to: now, to: .main) { [weak self] acts, _ in
            if (acts ?? []).contains(where: { ($0.walking || $0.running) && $0.confidence != .low }) { self?.setTracking(true) }
        }
    }
    private func setTracking(_ on: Bool) {
        guard on != tracking else { return }
        let st = manager.authorizationStatus
        if on && !(st == .authorizedAlways || st == .authorizedWhenInUse) { return }
        tracking = on
        if on {
            manager.allowsBackgroundLocationUpdates = st == .authorizedAlways   // Info.plist UIBackgroundModes: location
            manager.activityType = .fitness
            manager.pausesLocationUpdatesAutomatically = true
            manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
            manager.distanceFilter = 10
            lookAt = nil
            manager.startUpdatingLocation()
        } else {
            manager.stopUpdatingLocation()
            manager.allowsBackgroundLocationUpdates = false
            manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
            manager.distanceFilter = kCLDistanceFilterNone
        }
    }
    func locationManagerDidPauseLocationUpdates(_ m: CLLocationManager) { setTracking(false) }

    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        if m.authorizationStatus == .authorizedAlways || m.authorizationStatus == .authorizedWhenInUse { begin() }
    }

    func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        if !tracking { checkMoving() }
        if tracking, let at = lookAt, loc.distance(from: at) < WalkTracker.lookStep { return }   // 정밀 위치는 250m마다 한 번만 이름을 찾는다
        place(for: loc)
    }

    private func place(for loc: CLLocation) {
        guard !lookBusy else { return }
        lookBusy = true; lookAt = loc
        WalkTracker.lookup(loc, geocoder: geocoder) { [weak self] place, tags in
            self?.lookBusy = false
            self?.sync(place: place, tags: tags)
        }
    }

    // 좌표 → "서울 석촌동 석촌호수" 같은 이름 + 알 테마 태그. 런닝 경로(HealthSync)도 같이 쓴다
    static func lookup(_ loc: CLLocation, geocoder: CLGeocoder, done: @escaping (String?, [String]) -> Void) {
        geocoder.reverseGeocodeLocation(loc, preferredLocale: Locale(identifier: "ko_KR")) { marks, _ in
            let p = marks?.first
            // 예: "서울 송파구 석촌동"
            let city = p?.administrativeArea.map(WalkTracker.shortCity)
            // "서울 서울특별시"처럼 겹치지 않게 모두 줄인 이름으로 비교한다
            let parts = [city, (p?.subAdministrativeArea ?? p?.locality).map(WalkTracker.shortCity), p?.subLocality].compactMap { $0 }.filter { !$0.isEmpty }
            var dedup: [String] = []
            for x in parts where !dedup.contains(x) { dedup.append(x) }
            let area = dedup.joined(separator: " ")
            // 물가·바다 위인지 (호수·강 이름이 있으면 물가)
            var tags: Set<String> = []
            if p?.inlandWater != nil { tags.insert("water") }
            if p?.ocean != nil { tags.insert("sea") }
            // 근처 건물·랜드마크를 하나 붙이고, 주변 장소 종류로 알의 테마를 정한다 (예: "석촌호수", 주유소 → gas)
            // 지도에 장소가 없으면: 그 자리 명소(areasOfInterest) → 주소가 아닌 건물 이름 순
            var fb = p?.areasOfInterest?.first(where: WalkTracker.isKorean)
            if fb == nil, let n = p?.name, WalkTracker.isKorean(n), !WalkTracker.isAddress(n, p) { fb = n }
            WalkTracker.nearbyLandmark(loc, fallback: fb) { mark, near in
                let place = [area, mark ?? ""].filter { !$0.isEmpty }.joined(separator: " ")
                done(place.isEmpty ? nil : place, Array(tags.union(near)).sorted())
            }
        }
    }
    // "석촌동 123-4" 처럼 주소만 있는 이름은 장소 이름으로 쓰지 않는다
    private static func isAddress(_ n: String, _ p: CLPlacemark?) -> Bool {
        if let sub = p?.subThoroughfare, !sub.isEmpty, n.contains(sub) { return true }
        if let th = p?.thoroughfare, !th.isEmpty, n.hasPrefix(th) { return true }
        return n.range(of: #"\d+(-\d+)?(번지)?$"#, options: .regularExpression) != nil
    }

    // "서울특별시" → "서울", "경기도" → "경기"
    private static func shortCity(_ s: String) -> String {
        let provinces = ["경기도", "강원도", "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도", "제주도"]
        if s.hasSuffix("도") && !provinces.contains(s) && !s.hasSuffix("특별자치도") { return s }
        for suffix in ["특별자치시", "특별자치도", "특별시", "광역시", "도"] where s.hasSuffix(suffix) && s.count > suffix.count {
            return String(s.dropLast(suffix.count))
        }
        return s
    }

    // 장소 종류 → 게임의 알 테마(app.html THEMES 키)
    private static let themeOf: [MKPointOfInterestCategory: String] = [
        .park: "park", .nationalPark: "mountain", .campground: "park",
        .beach: "sea", .marina: "sea", .aquarium: "zoo", .zoo: "zoo",
        .gasStation: "gas", .evCharger: "station", .parking: "city",
        .publicTransport: "station", .airport: "airport",
        .school: "school", .university: "school", .library: "school", .museum: "school",
        .hospital: "hospital", .pharmacy: "hospital",
        .stadium: "sports", .fitnessCenter: "sports",
        .store: "city", .foodMarket: "city", .cafe: "bakery", .restaurant: "restaurant", .amusementPark: "amusement",
        .nightlife: "club", .theater: "concert", .movieTheater: "cinema",
        .bakery: "bakery", .laundry: "laundry", .police: "police", .fireStation: "firestation",
        .postOffice: "postoffice", .bank: "bank", .atm: "bank", .hotel: "hotel", .brewery: "pub", .winery: "pub"
    ]

    // 가까운 장소 이름(애플 지도에 있는 모든 종류: 명소·건물·식당·가게 등) + 반경 250m 안 장소 종류의 테마들
    // 2026-10-16 경완: 장소 종류 목록에 없어도 이름은 넣는다 (예전엔 약 40종류만 봤다)
    // 2026-10-17 경완: 한국어 이름이 없으면 동 이름만 남기지 말고 반경을 400m → 800m → 1.5km 로 넓혀 한국어 이름이 있는 가장 가까운 곳을 붙인다
    private static let landmarkRadii: [CLLocationDistance] = [400, 800, 1500]
    private static func nearbyLandmark(_ loc: CLLocation, fallback: String?, done: @escaping (String?, Set<String>) -> Void) {
        searchLandmark(loc, fallback: fallback, step: 0, tags: [], done: done)
    }
    private static func searchLandmark(_ loc: CLLocation, fallback: String?, step: Int, tags: Set<String>, done: @escaping (String?, Set<String>) -> Void) {
        let finish: (String?, Set<String>) -> Void = { n, t in DispatchQueue.main.async { done(n, t) } }
        guard step < landmarkRadii.count else {
            // 끝까지 못 찾으면: 그 자리 한국어 명소·건물 이름, 그것도 없으면 동네 이름만
            finish(fallback.flatMap { WalkTracker.isKorean($0) ? $0 : nil }, tags); return
        }
        let req = MKLocalPointsOfInterestRequest(center: loc.coordinate, radius: landmarkRadii[step])
        req.pointOfInterestFilter = .includingAll
        MKLocalSearch(request: req).start { res, _ in
            var tags = tags
            var bestKo: (String, CLLocationDistance)?
            var bestAny: (MKMapItem, CLLocationDistance)?
            for item in res?.mapItems ?? [] {
                guard let c = item.placemark.location else { continue }
                let d = c.distance(from: loc)
                if step == 0, let cat = item.pointOfInterestCategory, d <= 250, let t = WalkTracker.themeOf[cat] { tags.insert(t) }
                guard let name = item.name, !name.isEmpty else { continue }
                if WalkTracker.isKorean(name) { if d < (bestKo?.1 ?? .infinity) { bestKo = (name, d) } }
                else if d < (bestAny?.1 ?? .infinity) { bestAny = (item, d) }
            }
            // 첫 반경에 한국어 이름이 없고 그 자리 한국어 명소·건물 이름(fallback)이 있으면 그걸 쓴다
            if step == 0, bestKo == nil, let fb = fallback, WalkTracker.isKorean(fb) { finish(fb, tags); return }
            if let ko = bestKo { finish(ko.0, tags); return }
            // 이름이 영어뿐이면 그 자리를 한국어로 다시 찾아 보고, 없으면 반경을 넓힌다
            guard let any = bestAny, let at = any.0.placemark.location else {
                searchLandmark(loc, fallback: fallback, step: step + 1, tags: tags, done: done); return
            }
            WalkTracker.koGeocoder.reverseGeocodeLocation(at, preferredLocale: Locale(identifier: "ko_KR")) { marks, _ in
                if let ko = marks?.first?.areasOfInterest?.first(where: WalkTracker.isKorean) { finish(ko, tags) }
                else { searchLandmark(loc, fallback: fallback, step: step + 1, tags: tags, done: done) }
            }
        }
    }
    private static let koGeocoder = CLGeocoder()
    static func isKorean(_ s: String) -> Bool { s.unicodeScalars.contains { (0xAC00...0xD7A3).contains($0.value) } }

    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        sync(place: nil, tags: [])
    }

    // 지난번 이후 걸은 거리를 만보기에서 읽는다 (만보기는 최근 7일치만 갖고 있다)
    private func sync(place: String?, tags: [String] = []) {
        detectRuns()
        guard !busy, CMPedometer.isDistanceAvailable() else { return }
        busy = true
        let now = Date()
        let last = Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: lastKey))
        let from = max(last, now.addingTimeInterval(-7 * 24 * 3600))
        guard now.timeIntervalSince(from) > 60 else { busy = false; return }
        pedometer.queryPedometerData(from: from, to: now) { [weak self] data, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.busy = false
                guard error == nil, let meters = data?.distance?.doubleValue else { return }
                UserDefaults.standard.set(now.timeIntervalSince1970, forKey: self.lastKey)
                let km = meters / 1000
                if km >= 0.01 { PhoneBridge.shared.enqueueWalk(km: km, place: place ?? "", tags: tags) }
            }
        }
    }

    // MARK: 자동 런닝 기록
    // 런닝 시작을 누르지 않아도, 모션 기록에서 '달리기' 구간(5분 이상)을 찾아
    // 그 구간 거리를 만보기로 재고 0.5km 이상이면 런닝 기록으로 보낸다.
    private func detectRuns() {
        guard CMMotionActivityManager.isActivityAvailable(), !runBusy else { return }
        let now = Date()
        // 처음에는 지난 2일을 본다 (건강 앱·워치 기록과 겹치면 게임이 한 번만 넣는다)
        if UserDefaults.standard.object(forKey: runKey) == nil {
            UserDefaults.standard.set(now.addingTimeInterval(-2 * 24 * 3600).timeIntervalSince1970, forKey: runKey)
        }
        let last = Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: runKey))
        // 지금 달리는 중일 수 있으니 마지막 10분은 다음에 본다
        let to = now.addingTimeInterval(-10 * 60)
        let from = max(last, now.addingTimeInterval(-7 * 24 * 3600))
        guard to.timeIntervalSince(from) > 60 else { return }
        runBusy = true
        activity.queryActivityStarting(from: from, to: to, to: .main) { [weak self] acts, error in
            guard let self else { return }
            guard error == nil, let acts else { self.runBusy = false; return }
            // 달리기 구간 모으기 (2분 안쪽으로 끊긴 건 이어 붙인다)
            var segs: [(Date, Date)] = []
            for (i, a) in acts.enumerated() {
                let end = i + 1 < acts.count ? acts[i + 1].startDate : to
                guard a.running, a.confidence != .low else { continue }
                if let lastSeg = segs.last, a.startDate.timeIntervalSince(lastSeg.1) < 120 {
                    segs[segs.count - 1].1 = end
                } else {
                    segs.append((a.startDate, end))
                }
            }
            // 끝나지 않은 구간이 있으면 그 시작 전까지만 확인한 것으로 둔다
            var checked = to
            if let lastSeg = segs.last, to.timeIntervalSince(lastSeg.1) < 120 {
                checked = lastSeg.0
                segs.removeLast()
            }
            segs = segs.filter { $0.1.timeIntervalSince($0.0) >= 5 * 60 }
            let group = DispatchGroup()
            for (start, end) in segs {
                group.enter()
                self.pedometer.queryPedometerData(from: start, to: end) { data, _ in
                    DispatchQueue.main.async {
                        let km = (data?.distance?.doubleValue ?? 0) / 1000
                        if km >= 0.5 {
                            PhoneBridge.shared.enqueueRun(km: km, start: start.timeIntervalSince1970, end: end.timeIntervalSince1970, kind: 1)
                        }
                        group.leave()
                    }
                }
            }
            group.notify(queue: .main) {
                UserDefaults.standard.set(checked.timeIntervalSince1970, forKey: self.runKey)
                self.runBusy = false
            }
        }
    }
}
