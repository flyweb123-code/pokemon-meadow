import UIKit

// 진짜 푸시 (2026-11-03 경완: 친구가 내 필드에 놀러 오면 바로 알림).
// 애플이 준 기기 토큰을 친구 서버(server/src/push.js)에 맡긴다. 게임 설정 › 알림 › '친구가 놀러 왔을 때' 가 켜져 있을 때만.
final class PushDelegate: NSObject, UIApplicationDelegate {
    func application(_ app: UIApplication, didFinishLaunchingWithOptions _: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // 토큰은 바뀔 수 있어서 켤 때마다 다시 받는다
        if UserDefaults.standard.bool(forKey: "pushFv") { app.registerForRemoteNotifications() }
        return true
    }
    func application(_: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken t: Data) {
        FriendServer.shared.setPushToken(t.map { String(format: "%02x", $0) }.joined())
    }
    func application(_: UIApplication, didFailToRegisterForRemoteNotificationsWithError e: Error) {
        print("push register fail:", e.localizedDescription)
    }
}
