import SwiftUI

// 아이폰 앱: 포켓런닝 웹 게임을 화면 가득 띄우고, 워치와 게임 사이를 이어 준다.
@main
struct PokeRunApp: App {
    @StateObject private var bridge = PhoneBridge.shared

    var body: some Scene {
        WindowGroup {
            GameView(bridge: bridge)
                .ignoresSafeArea()
                .background(Color(red: 0x38 / 255, green: 0x38 / 255, blue: 0x48 / 255))
                .statusBarHidden(false)
        }
    }
}
