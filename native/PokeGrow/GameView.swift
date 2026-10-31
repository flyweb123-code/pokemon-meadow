import SwiftUI
import WebKit
import AVFoundation
import CoreHaptics

// GitHub Pages 에 올린 게임을 WKWebView 로 띄운다. 게임 저장은 이 앱 안에 따로 남는다.
let gameURL = URL(string: "https://flyweb123-code.github.io/pokemon-meadow/")!

struct GameView: UIViewRepresentable {
    let bridge: PhoneBridge

    func makeCoordinator() -> Coordinator { Coordinator(bridge: bridge) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        // 배경 음악이 앱을 켜자마자 나오게 (터치 없이 재생 허용)
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(WeakHandler(bridge), name: "pokeRun")
        config.userContentController.add(HapticHandler(), name: "haptic")
        config.userContentController.add(HumHandler(), name: "hum")
        // 친구 서버(CloudKit): 게임이 Promise 로 답을 받는다 (FriendServer)
        config.userContentController.addScriptMessageHandler(FriendServer.shared, contentWorld: .page, name: "friends")
        // v13.40: 게임이 오디오를 재워 둔 틈에 '다른 앱 소리가 나는지' 묻는다 (PiP 영상이면 배경 음악을 멈춤)
        config.userContentController.addScriptMessageHandler(AudioPeek(), contentWorld: .page, name: "audioPeek")
        config.userContentController.addScriptMessageHandler(AudioMix(), contentWorld: .page, name: "audioMix")
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        bridge.webView = web
        // 패치가 바로 보이도록 서버에 새 버전이 있는지 매번 확인하고 받는다
        web.load(URLRequest(url: gameURL, cachePolicy: .reloadRevalidatingCacheData))
        context.coordinator.observeForeground(web)
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        let bridge: PhoneBridge
        init(bridge: PhoneBridge) { self.bridge = bridge }
        private var leftAt = Date()

        // 백그라운드에 30분 넘게 있다가 돌아오면 새 버전이 있을 수 있으니 다시 불러온다
        func observeForeground(_ web: WKWebView) {
            NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
                self?.leftAt = Date()
            }
            // v13.59 경완 'PiP 두 번째 재생 땐 게임이 아무 신호도 못 받음': 아이폰이 앱 오디오를 끊고(began) 풀어 줄 때(ended) 게임에 알려 준다
            NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak web] n in
                guard let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt, let t = AVAudioSession.InterruptionType(rawValue: raw) else { return }
                web?.evaluateJavaScript(t == .began ? "window.pkAudInt&&pkAudInt(1)" : "window.pkAudInt&&pkAudInt(0)")
            }
            NotificationCenter.default.addObserver(forName: AVAudioSession.silenceSecondaryAudioHintNotification, object: nil, queue: .main) { [weak web] n in
                guard let raw = n.userInfo?[AVAudioSessionSilenceSecondaryAudioHintTypeKey] as? UInt else { return }
                web?.evaluateJavaScript("window.pkAudInt&&pkAudInt(\(raw == 1 ? 2 : 3))")
            }
            NotificationCenter.default.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self, weak web] _ in
                guard let self, let web, Date().timeIntervalSince(self.leftAt) > 30 * 60 else { return }
                web.load(URLRequest(url: gameURL, cachePolicy: .reloadRevalidatingCacheData))
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            bridge.gameReady = false
        }

        // 웹 화면이 메모리 부족 등으로 죽으면 하얀 화면으로 두지 않고 다시 불러온다
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            bridge.gameReady = false
            webView.reload()
        }

        // shortcuts:// 같은 앱 링크는 밖으로 넘긴다 (잠금 화면 런닝의 '가져오기')
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = action.request.url, let scheme = url.scheme, scheme != "http", scheme != "https", scheme != "about" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}

// WKUserContentController 가 핸들러를 강하게 붙잡아서 생기는 순환 참조를 끊는다
final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(c, didReceive: message)
    }
}

// 알 두드리기 진동: 게임이 haptic 메시지로 0(약하게)·1(보통)·2(세게)를 보낸다
final class HapticHandler: NSObject, WKScriptMessageHandler {
    private let gens: [UIImpactFeedbackGenerator] = [.init(style: .light), .init(style: .medium), .init(style: .heavy)]
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        let n = max(0, min(2, (message.body as? Int) ?? 1))
        gens[n].impactOccurred()
        gens[n].prepare()
    }
}

// 화염방사 버튼을 누르는 동안 끊기지 않는 연속 진동(우우웅): 게임이 hum 메시지로 1을 계속 보내면 이어지고,
// 0이 오거나 0.3초 동안 1이 안 오면 멈춘다 (게임이 멈춰도 진동이 남지 않게)
final class HumHandler: NSObject, WKScriptMessageHandler {
    private var engine: CHHapticEngine?
    private var player: CHHapticAdvancedPatternPlayer?
    private var stopWork: DispatchWorkItem?

    override init() {
        super.init()
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        engine = try? CHHapticEngine()
        engine?.isAutoShutdownEnabled = true
        engine?.stoppedHandler = { [weak self] _ in DispatchQueue.main.async { self?.player = nil } }
        engine?.resetHandler = { [weak self] in DispatchQueue.main.async { self?.player = nil } }
    }

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        stopWork?.cancel()
        guard ((message.body as? Int) ?? 0) == 1 else { stop(); return }
        start()
        let w = DispatchWorkItem { [weak self] in self?.stop() }
        stopWork = w
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: w)
    }

    private func start() {
        guard player == nil, let engine else { return }
        do {
            try engine.start()
            let ev = CHHapticEvent(eventType: .hapticContinuous, parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.6),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.12),
            ], relativeTime: 0, duration: 30)
            let p = try engine.makeAdvancedPlayer(with: CHHapticPattern(events: [ev], parameters: []))
            try p.start(atTime: CHHapticTimeImmediate)
            player = p
        } catch { player = nil }
    }

    private func stop() {
        try? player?.stop(atTime: CHHapticTimeImmediate)
        player = nil
    }
}

// v13.40 경완 'PiP 영상이 켜져 있으면 배경 음악 안 나게': 게임이 물을 때만 답한다.
// isOtherAudioPlaying 은 웹뷰(게임 자기) 오디오도 세므로, 게임은 자기 오디오를 재워 둔 순간에만 묻는다.
final class AudioPeek: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        replyHandler(AVAudioSession.sharedInstance().isOtherAudioPlaying, nil)
    }
}

// v13.47 경완 'PiP 재생 중엔 무음 모드에서도 효과음만': 웹 오디오 설정은 '섞기(ambient, 무음 스위치에 꺼짐)' 아니면
// '혼자 재생(playback, 영상이 멈춤)' 뿐이라, 앱이 직접 'playback + 다른 소리와 섞기' 로 바꿔 준다.
// 게임이 조용 모드(영상 재생 중)에서 오디오를 깨울 때마다 "mix", 조용 모드가 끝나면 "playback" (설정에서 무음 모드에서 듣기를 껐으면 "ambient").
final class AudioMix: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        let k = (message.body as? String) ?? ""
        let s = AVAudioSession.sharedInstance()
        do {
            switch k {
            case "mix": try s.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            case "ambient": try s.setCategory(.ambient, mode: .default, options: [])
            default: try s.setCategory(.playback, mode: .default, options: [])
            }
            replyHandler(true, nil)
        } catch { replyHandler(false, nil) }
    }
}
