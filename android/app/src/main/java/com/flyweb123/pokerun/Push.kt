package com.flyweb123.pokerun

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

// 진짜 푸시 (2026-11-03 경완: 친구가 내 필드에 놀러 오면 바로 알림, 아이폰과 같은 서버 server/src/push.js).
// Firebase 값은 빌드할 때 google-services.json 에서 꺼내 BuildConfig 에 넣는다 (app/build.gradle.kts). 없으면 아무것도 안 한다.
// 게임 설정 › 알림 › '친구가 놀러 왔을 때' (notiPlan 의 fv) 가 켜져 있을 때만 서버에 토큰을 맡긴다.
object Push {
    private val p get() = App.prefs
    private val ready get() = BuildConfig.FB_APP_ID.isNotEmpty()

    fun init(ctx: Context) {
        if (!ready) return
        runCatching {
            if (FirebaseApp.getApps(ctx).isEmpty()) FirebaseApp.initializeApp(ctx, FirebaseOptions.Builder()
                .setApplicationId(BuildConfig.FB_APP_ID).setApiKey(BuildConfig.FB_API_KEY)
                .setProjectId(BuildConfig.FB_PROJECT_ID).setGcmSenderId(BuildConfig.FB_SENDER_ID).build())
            if (p.getBoolean("pushFv", false)) fetchToken()   // 토큰은 바뀔 수 있어서 켤 때마다
        }
    }

    // 게임이 저장할 때마다 온다 → 바뀔 때만 일한다
    fun setVisit(on: Boolean) {
        val was = if (p.contains("pushFv")) p.getBoolean("pushFv", false) else null
        if (was == on && (!on || p.getString("pushTok", null) != null)) return
        p.edit().putBoolean("pushFv", on).apply()
        if (on) fetchToken() else sync()
    }

    private fun fetchToken() {
        if (!ready) return
        runCatching { FirebaseMessaging.getInstance().token.addOnSuccessListener { setToken(it) } }
    }

    fun setToken(t: String) { p.edit().putString("pushTok", t).apply(); sync() }

    private fun sync() = thread {
        val tok = p.getString("pushTok", null) ?: return@thread
        val on = p.getBoolean("pushFv", false)
        val sig = "$tok:$on"
        val old = System.currentTimeMillis() - p.getLong("pushRegAt", 0) > 3 * 86_400_000L
        if (sig == p.getString("pushRegSig", null) && !old) return@thread
        runCatching {
            FriendServer.call(JSONObject().put("op", "pushReg").put("tok", tok).put("plat", "android").put("env", "prod")
                .put("kinds", if (on) JSONArray().put("visit") else JSONArray()))
            p.edit().putString("pushRegSig", sig).putLong("pushRegAt", System.currentTimeMillis()).apply()
        }
    }
}

// 서버가 보낸 데이터 메시지 → 알림 (게임이 켜져 있으면 게임이 직접 알려 주므로 안 띄운다)
class PushService : FirebaseMessagingService() {
    override fun onNewToken(token: String) = Push.setToken(token)
    override fun onMessageReceived(m: RemoteMessage) {
        val d = m.data
        NotiCenter.post(d["id"] ?: "visit", d["title"] ?: "포켓에그", d["body"] ?: "", force = false)
    }
}
