import CoreLocation
import CoreMotion
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
            let p = marks?.first
            // 예: "마포구 망원동"
            let parts = [p?.subAdministrativeArea ?? p?.locality, p?.subLocality].compactMap { $0 }
            let place = parts.isEmpty ? (p?.name ?? "") : parts.joined(separator: " ")
            self?.sync(place: place.isEmpty ? nil : place)
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
