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
    private let runKey = "runLastCheck"
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

    // 앱을 열 때마다 한 번 더 확인한다
    func refresh() {
        if manager.authorizationStatus == .authorizedAlways || manager.authorizationStatus == .authorizedWhenInUse {
            manager.requestLocation()
        } else {
            sync(place: nil)
        }
    }

    private func begin() {
        if CLLocationManager.significantLocationChangeMonitoringAvailable() {
            manager.startMonitoringSignificantLocationChanges()
        }
        manager.requestLocation()
    }

    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        if m.authorizationStatus == .authorizedAlways || m.authorizationStatus == .authorizedWhenInUse { begin() }
    }

    func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        geocoder.reverseGeocodeLocation(loc, preferredLocale: Locale(identifier: "ko_KR")) { [weak self] marks, _ in
            guard let self else { return }
            let p = marks?.first
            // 예: "서울 송파구 석촌동"
            let city = p?.administrativeArea.map(WalkTracker.shortCity)
            let parts = [city, p?.subAdministrativeArea ?? p?.locality, p?.subLocality].compactMap { $0 }.filter { !$0.isEmpty }
            var dedup: [String] = []
            for x in parts where !dedup.contains(x) { dedup.append(x) }
            let area = dedup.joined(separator: " ")
            // 근처 건물·랜드마크를 하나 붙인다 (예: "석촌호수")
            self.nearbyLandmark(loc, fallback: p?.areasOfInterest?.first) { mark in
                let place = [area, mark ?? ""].filter { !$0.isEmpty }.joined(separator: " ")
                self.sync(place: place.isEmpty ? nil : place)
            }
        }
    }

    // "서울특별시" → "서울", "경기도" → "경기"
    private static func shortCity(_ s: String) -> String {
        for suffix in ["특별자치시", "특별자치도", "특별시", "광역시", "도"] where s.hasSuffix(suffix) && s.count > suffix.count {
            return String(s.dropLast(suffix.count))
        }
        return s
    }

    // 반경 400m 안에서 가장 가까운 공원·명소·학교·역 같은 장소 이름
    private func nearbyLandmark(_ loc: CLLocation, fallback: String?, done: @escaping (String?) -> Void) {
        let req = MKLocalPointsOfInterestRequest(center: loc.coordinate, radius: 400)
        req.pointOfInterestFilter = MKPointOfInterestFilter(including: [
            .park, .nationalPark, .museum, .stadium, .university, .school, .library, .publicTransport,
            .amusementPark, .zoo, .aquarium, .beach, .marina, .theater, .movieTheater, .hospital, .fitnessCenter
        ])
        MKLocalSearch(request: req).start { res, _ in
            let best = res?.mapItems
                .compactMap { item -> (String, CLLocationDistance)? in
                    guard let name = item.name, let c = item.placemark.location else { return nil }
                    return (name, c.distance(from: loc))
                }
                .min { $0.1 < $1.1 }?.0
            DispatchQueue.main.async { done(best ?? fallback) }
        }
    }

    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        sync(place: nil)
    }

    // 지난번 이후 걸은 거리를 만보기에서 읽는다 (만보기는 최근 7일치만 갖고 있다)
    private func sync(place: String?) {
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
                if km >= 0.01 { PhoneBridge.shared.enqueueWalk(km: km, place: place ?? "") }
            }
        }
    }

    // MARK: 자동 런닝 기록
    // 런닝 시작을 누르지 않아도, 모션 기록에서 '달리기' 구간(5분 이상)을 찾아
    // 그 구간 거리를 만보기로 재고 0.5km 이상이면 런닝 기록으로 보낸다.
    private func detectRuns() {
        guard CMMotionActivityManager.isActivityAvailable(), !runBusy else { return }
        let now = Date()
        if UserDefaults.standard.object(forKey: runKey) == nil {
            UserDefaults.standard.set(now.timeIntervalSince1970, forKey: runKey)
            return
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
                            PhoneBridge.shared.enqueueAutoRun(km: km, start: start.timeIntervalSince1970, end: end.timeIntervalSince1970)
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
