package com.flyweb123.pokerun

import android.media.AudioManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

// 게임 → 앱. shim.js 가 만든 window.webkit.messageHandlers.이름.postMessage(body) 가 여기로 온다.
// 답은 window.__pkReply(id, ok, json) 로 돌려준다 (게임 쪽에선 Promise).
class Bridge(private val a: MainActivity) {
    private val main = Handler(Looper.getMainLooper())

    // 친구·계정 서버(friends)는 서버 주소를 알 때만 만든다 → 모르면 게임은 친구·계정 기능을 숨긴다
    @JavascriptInterface
    fun handlers(): String = JSONArray(listOf("pokeRun", "haptic", "hum", "audioPeek", "audioMix", "loc", "perm") +
        (if (FriendServer.url != null) listOf("friends") else emptyList())).toString()

    @JavascriptInterface
    fun post(name: String, json: String, id: Int) {
        main.post { handle(name, json, id) }
    }

    private fun reply(id: Int, value: Any?) {
        val js = when (value) { null -> "null"; is String -> JSONObject.quote(value); else -> value.toString() }
        a.web?.evaluateJavascript("window.__pkReply && window.__pkReply($id, true, ${JSONObject.quote(js)})", null)
    }

    private fun fail(id: Int, msg: String) {
        a.web?.evaluateJavascript("window.__pkReply && window.__pkReply($id, false, ${JSONObject.quote(JSONObject.quote(msg))})", null)
    }

    private fun handle(name: String, json: String, id: Int) {
        // 게임 주소에서 온 것만 받는다
        val host = runCatching { Uri.parse(a.web?.url ?: "").host }.getOrNull()
        if (host != Uri.parse(BuildConfig.GAME_URL).host) { fail(id, "모르는 페이지"); return }
        val body: Any? = runCatching { JSONObject("{\"v\":$json}").opt("v") }.getOrNull()
        when (name) {
            "pokeRun" -> { pokeRun(body as? JSONObject); reply(id, null) }
            "haptic" -> { Haptics.tap((body as? Number)?.toInt() ?: 1); reply(id, null) }
            "hum" -> { Haptics.hum(((body as? Number)?.toInt() ?: 0) == 1); reply(id, null) }
            // 다른 앱 소리(영상 등)가 나는지: 게임은 자기 오디오를 재워 둔 순간에만 묻는다
            "audioPeek" -> reply(id, a.getSystemService(AudioManager::class.java)?.isMusicActive == true)
            "audioMix" -> reply(id, true)
            "perm" -> Perm.handle(a, body as? String ?: "get") { reply(id, it) }
            "loc" -> Perm.handleLoc(a, body as? String ?: "get") { reply(id, it) }
            "friends" -> FriendServer.handle(body as? JSONObject) { ok, v -> main.post { if (ok) reply(id, v) else fail(id, v as? String ?: "친구 서버 오류") } }
            else -> fail(id, "모르는 요청")
        }
    }

    private fun pokeRun(b: JSONObject?) {
        b ?: return
        if (b.optBoolean("ready")) { GameLink.gameReady = true; return }
        if (b.optBoolean("probe")) return
        // 알림 계획만 쓴다 (안드로이드엔 워치 연동 없음)
        b.optJSONObject("noti")?.let { NotiCenter.update(it, GameLink.pendingWalkKm()) }
    }
}
