import SwiftUI

// 워치 앱: 알 현황 보기 + 런닝 시작/끝. 끝나면 달린 거리를 아이폰 앱으로 보낸다.
@main
struct PokeGrowWatchApp: App {
    @StateObject private var model = WatchModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
        }
    }
}
