import SwiftUI
import WebKit

// GitHub Pages 에 올린 게임을 WKWebView 로 띄운다. 게임 저장은 이 앱 안에 따로 남는다.
let gameURL = URL(string: "https://flyweb123-code.github.io/pokemon-meadow/")!

struct GameView: UIViewRepresentable {
    let bridge: PhoneBridge

    func makeCoordinator() -> Coordinator { Coordinator(bridge: bridge) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.userContentController.add(WeakHandler(bridge), name: "pokeRun")
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        bridge.webView = web
        web.load(URLRequest(url: gameURL))
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        let bridge: PhoneBridge
        init(bridge: PhoneBridge) { self.bridge = bridge }

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
