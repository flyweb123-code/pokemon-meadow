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
    private let lastKey = "walkLastSync"
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
}
