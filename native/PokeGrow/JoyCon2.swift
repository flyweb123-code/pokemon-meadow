import CoreBluetooth
import WebKit

// 스위치 2 조이콘(Joy-Con 2)·프로 컨트롤러 2 를 앱이 직접 붙인다 (2026-11-17 경완 '조이콘2 우회해서 연결할 방법은?' → '오 한번 해봐봐').
// 아이폰 설정의 Bluetooth 에는 안 뜨는 컨트롤러라(전용 저전력 블루투스 규격), 게임(특훈)이 'joycon2' 로 부르면 여기서 찾아 연결하고
// 버튼·스틱을 window.__jc2(버튼, lx, ly, rx, ry, 연결된 쪽) 으로 넘긴다. 게임은 그걸 보통 컨트롤러처럼 쓴다 (gym/yact.js padPoll).
// 규격은 닌텐도 공개가 아니라 커뮤니티가 자기 기기로 분석한 값: seitanmen/Joycon2forMac (MIT) 의 연결 순서·명령,
// 패킷 자리는 JoeGeC/joycon2android docs/protocol.md 의 표(값만 참고, 코드는 가져오지 않음).
//  - 광고: 제조사 ID 0x0553, 그 뒤 [5..6] = 제품 번호(0x2067 왼쪽, 0x2066 오른쪽, 0x2069 프로), [10..15] = 기억한 본체 주소(싱크 버튼을 누르면 0)
//  - 알림 특성 …7FD2 로 63바이트: [3..6] 버튼(uint32), [0x0A..] 왼쪽 스틱 3바이트, [0x0D..] 오른쪽 스틱 3바이트 (12비트 X, Y)
//  - 쓰기 특성 649D4AC9… 에 시작 명령 두 개를 0.5초 간격으로 (응답 없는 쓰기)
// 조이콘은 본체만 기억해서, 켤 때마다 싱크 버튼을 길게 눌러야 붙는다.
final class JoyCon2: NSObject, WKScriptMessageHandlerWithReply, CBCentralManagerDelegate, CBPeripheralDelegate {
    static let shared = JoyCon2()
    weak var web: WKWebView?

    private static let notifyID = CBUUID(string: "AB7DE9BE-89FE-49AD-828F-118F09DF7FD2")
    private static let writeID = CBUUID(string: "649D4AC9-8EB7-4E6C-AF44-1EA54FE5F005")
    private static let cmd1 = Data([0x0C, 0x91, 0x01, 0x02, 0x00, 0x04, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00])
    private static let cmd2 = Data([0x0C, 0x91, 0x01, 0x04, 0x00, 0x04, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00])

    // 한 쪽 = 한 기기. side 1 왼쪽, 2 오른쪽, 4 프로 컨트롤러
    private final class Pad {
        let p: CBPeripheral
        let side: Int
        var live = false
        var buttons: UInt32 = 0
        var cx = [0.0, 0.0], cy = [0.0, 0.0]      // 스틱 가운데 (처음 30개 평균) — [왼쪽 스틱, 오른쪽 스틱]
        var n = 0
        var x = [0.0, 0.0], y = [0.0, 0.0]        // -1~1 (오른쪽 +, 위 +)
        init(_ p: CBPeripheral, _ side: Int) { self.p = p; self.side = side }
    }

    private var central: CBCentralManager?
    private var pads: [UUID: Pad] = [:]
    private var wantScan = false
    private var scanStop: DispatchWorkItem?
    private var lastSent = ""
    private var lastAt = Date.distantPast

    // 게임 → 앱: {op: 'scan' | 'stop' | 'state'} → 지금 상태 글자 ('off' 블루투스 꺼짐, 'denied' 권한 없음, 'scan' 찾는 중, 'idle')
    @MainActor
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) async -> (Any?, String?) {
        let body = message.body as? [String: Any]
        let op = (body?["op"] as? String) ?? "state"
        if web == nil { web = message.webView }
        switch op {
        case "scan":
            wantScan = true
            if central == nil { central = CBCentralManager(delegate: self, queue: .main) }   // 처음 만들 때 블루투스 권한을 묻는다
            else { startScan() }
        case "stop":
            wantScan = false
            stopScan()
            for pad in pads.values { central?.cancelPeripheralConnection(pad.p) }
        default: break
        }
        return (stateText(), nil)
    }

    private func stateText() -> String {
        guard let c = central else { return "idle" }
        switch c.state {
        case .poweredOff: return "off"
        case .unauthorized, .unsupported: return "denied"
        default: return c.isScanning ? "scan" : "idle"
        }
    }

    private func mask() -> Int { pads.values.reduce(0) { $0 | ($1.live ? $1.side : 0) } }

    private func startScan() {
        guard let c = central, c.state == .poweredOn, wantScan else { pushState(); return }
        if !c.isScanning { c.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]) }
        scanStop?.cancel()
        let w = DispatchWorkItem { [weak self] in self?.wantScan = false; self?.stopScan() }
        scanStop = w
        DispatchQueue.main.asyncAfter(deadline: .now() + 45, execute: w)   // 45초 찾고 그만 (배터리)
        pushState()
    }

    private func stopScan() {
        scanStop?.cancel(); scanStop = nil
        if let c = central, c.state == .poweredOn, c.isScanning { c.stopScan() }
        pushState()
    }

    // ---------- 블루투스 ----------
    func centralManagerDidUpdateState(_ c: CBCentralManager) {
        if c.state == .poweredOn { startScan() } else { pushState() }
    }

    func centralManager(_ c: CBCentralManager, didDiscover p: CBPeripheral, advertisementData ad: [String: Any], rssi: NSNumber) {
        guard pads[p.identifier] == nil, let m = ad[CBAdvertisementDataManufacturerDataKey] as? Data else { return }
        let b = [UInt8](m)
        guard b.count >= 9, b[0] == 0x53, b[1] == 0x05 else { return }   // 닌텐도 (앞 두 바이트 = 제조사 ID)
        let pid = Int(b[7]) | (Int(b[8]) << 8)
        let side: Int
        switch pid {
        case 0x2067: side = 1
        case 0x2066: side = 2
        case 0x2069, 0x2073: side = 4
        default: return
        }
        // 싱크 버튼을 눌러 '새로 붙기'를 기다리는 것만 (기억한 본체 주소가 0). 본체를 찾는 중인 조이콘은 우리 연결을 받지 않는다
        if b.count >= 18, b[12...17].contains(where: { $0 != 0 }) { return }
        if pads.values.contains(where: { $0.side == side }) { return }   // 같은 쪽은 하나만
        pads[p.identifier] = Pad(p, side)
        p.delegate = self
        c.connect(p, options: nil)
    }

    func centralManager(_ c: CBCentralManager, didConnect p: CBPeripheral) { p.discoverServices(nil) }

    func centralManager(_ c: CBCentralManager, didFailToConnect p: CBPeripheral, error: Error?) { drop(p) }

    func centralManager(_ c: CBCentralManager, didDisconnectPeripheral p: CBPeripheral, error: Error?) { drop(p) }

    private func drop(_ p: CBPeripheral) {
        pads[p.identifier] = nil
        send(force: true)
    }

    func peripheral(_ p: CBPeripheral, didDiscoverServices error: Error?) {
        for s in p.services ?? [] { p.discoverCharacteristics(nil, for: s) }
    }

    func peripheral(_ p: CBPeripheral, didDiscoverCharacteristicsFor s: CBService, error: Error?) {
        for ch in s.characteristics ?? [] {
            if ch.uuid == JoyCon2.notifyID { p.setNotifyValue(true, for: ch) }
            if ch.uuid == JoyCon2.writeID {
                p.writeValue(JoyCon2.cmd1, for: ch, type: .withoutResponse)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak p] in
                    guard let p = p, p.state == .connected else { return }
                    p.writeValue(JoyCon2.cmd2, for: ch, type: .withoutResponse)
                }
            }
        }
    }

    func peripheral(_ p: CBPeripheral, didUpdateValueFor ch: CBCharacteristic, error: Error?) {
        guard ch.uuid == JoyCon2.notifyID, let d = ch.value, d.count >= 0x10, let pad = pads[p.identifier] else { return }
        let b = [UInt8](d)
        pad.buttons = UInt32(b[3]) | (UInt32(b[4]) << 8) | (UInt32(b[5]) << 16) | (UInt32(b[6]) << 24)
        let raw: [(Double, Double)] = [0x0A, 0x0D].map { (o: Int) -> (Double, Double) in
            let v = Int(b[o]) | (Int(b[o + 1]) << 8) | (Int(b[o + 2]) << 16)
            return (Double(v & 0xFFF), Double((v >> 12) & 0xFFF))
        }
        if pad.n < 30 {   // 처음 30개로 가운데를 잡는다 (기기마다 2000~2160 으로 다름)
            for i in 0..<2 { pad.cx[i] += raw[i].0; pad.cy[i] += raw[i].1 }
            pad.n += 1
            if pad.n == 30 { for i in 0..<2 { pad.cx[i] /= 30; pad.cy[i] /= 30 } }
        } else {
            for i in 0..<2 {
                pad.x[i] = max(-1, min(1, (raw[i].0 - pad.cx[i]) / 1150))
                pad.y[i] = max(-1, min(1, (raw[i].1 - pad.cy[i]) / 1150))
            }
        }
        let was = pad.live
        pad.live = true
        if !was {   // 두 쪽(또는 프로)이 다 붙었으면 그만 찾는다
            let m = mask()
            if m & 4 != 0 || m & 3 == 3 { wantScan = false; stopScan() }
        }
        send(force: !was)
    }

    // ---------- 게임으로 ----------
    private func send(force: Bool) {
        var buttons: UInt32 = 0
        var lx = 0.0, ly = 0.0, rx = 0.0, ry = 0.0
        for pad in pads.values where pad.live {
            buttons |= pad.buttons
            if pad.side != 2 { lx = pad.x[0]; ly = pad.y[0] }   // 왼쪽 조이콘·프로의 왼쪽 스틱
            if pad.side != 1 { rx = pad.x[1]; ry = pad.y[1] }   // 오른쪽 조이콘·프로의 오른쪽 스틱
        }
        let f = { (v: Double) -> String in String(format: "%.3f", v) }
        let js = "window.__jc2&&window.__jc2(\(buttons),\(f(lx)),\(f(ly)),\(f(rx)),\(f(ry)),\(mask()))"
        let now = Date()
        if js == lastSent && !force { return }
        if !force && now.timeIntervalSince(lastAt) < 0.012 { return }   // 1초에 80번까지
        lastSent = js
        lastAt = now
        web?.evaluateJavaScript(js, completionHandler: nil)
    }

    private func pushState() {
        web?.evaluateJavaScript("window.__jc2s&&window.__jc2s('\(stateText())',\(mask()))", completionHandler: nil)
    }
}
