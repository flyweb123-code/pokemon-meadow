import SwiftUI

// 워치 앱: 오늘 이동 거리(걸으면 켜짐) + 짝꿍·알 현황 보기. (2026-11-05 경완: 런닝 시작 버튼은 뺌 — 워치 운동 앱 기록이 건강 앱으로 들어간다)
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
