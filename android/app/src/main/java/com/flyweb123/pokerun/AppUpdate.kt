package com.flyweb123.pokerun

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

// 새 앱(APK) 알림 (2026-11-03 경완: 안드로이드는 플레이 스토어가 아니라 자동 업데이트가 없음).
// main 빌드가 Releases 'android-latest' 에 android-version.json {code, name} 을 같이 올린다 (.github/workflows/android.yml).
// 앱을 켜거나 돌아올 때(6시간에 한 번) 확인해서 더 새 버전이 있으면 '받기' 창 → 브라우저로 APK 를 받아 덮어 설치.
// 게임 내용은 GitHub Pages 에서 늘 새로 받으니 여기와 상관없다. '나중에' 를 누르면 그 버전은 하루 동안 다시 묻지 않는다.
object AppUpdate {
    private const val BASE = "https://github.com/flyweb123-code/pokemon-meadow/releases/download/android-latest/"
    private val p get() = App.prefs

    fun check(a: Activity) {
        val now = System.currentTimeMillis()
        if (now - p.getLong("updChkAt", 0) < 6 * 3_600_000L) return
        p.edit().putLong("updChkAt", now).apply()
        thread {
            val j = runCatching {
                val c = URL(BASE + "android-version.json").openConnection() as HttpURLConnection
                c.connectTimeout = 8000; c.readTimeout = 8000; c.useCaches = false; c.instanceFollowRedirects = true
                try { JSONObject(c.inputStream.bufferedReader().readText()) } finally { c.disconnect() }
            }.getOrNull() ?: return@thread
            val code = j.optInt("code"); val name = j.optString("name", "")
            if (code <= BuildConfig.VERSION_CODE) return@thread
            if (p.getInt("updLater", 0) == code && now - p.getLong("updLaterAt", 0) < 86_400_000L) return@thread
            a.runOnUiThread {
                if (a.isFinishing || a.isDestroyed) return@runOnUiThread
                AlertDialog.Builder(a)
                    .setTitle("새 버전이 있어요")
                    .setMessage("포켓에그 앱 새 버전${if (name.isNotEmpty()) " ($name)" else ""}이 나왔어요. 받아서 설치하면 기록은 그대로 남아요.")
                    .setPositiveButton("받기") { _, _ -> runCatching { a.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BASE + "pokegrow.apk"))) } }
                    .setNegativeButton("나중에") { _, _ -> p.edit().putInt("updLater", code).putLong("updLaterAt", System.currentTimeMillis()).apply() }
                    .show()
            }
        }
    }
}
