package com.flyweb123.pokerun

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import org.json.JSONObject

// 권한 (아이폰 Perm 과 같은 약속): 튜토리얼 끝에 강박사가 설명한 뒤 게임이 한 번에 묻는다.
// 게임 → perm 'get' 상태 / 'ask' 아직 안 물은 것 전부 / 'ask:mot|loc|hk|noti' 하나만 / 'settings' 설정 앱
// 답: { mot, loc, hk, noti } 각각 'ok' | 'no' | 'ask'
// mot = 신체 활동(만보기), loc = 위치, hk = 건강(안드로이드는 아직 안 씀 → 늘 'ok'), noti = 알림
object Perm {
    private val p get() = App.prefs

    val asked: Boolean get() = p.getBoolean("permAsked", false)

    private val MOT = if (Build.VERSION.SDK_INT >= 29) arrayOf(Manifest.permission.ACTIVITY_RECOGNITION) else emptyArray()
    private val LOC = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
    private val NOTI = if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.POST_NOTIFICATIONS) else emptyArray()

    private fun granted(a: MainActivity, perm: String) = ContextCompat.checkSelfPermission(a, perm) == PackageManager.PERMISSION_GRANTED

    // 한 번 물어서 거절됐고, 안드로이드가 더는 창을 띄워 주지 않으면 'no' (설정에서 켜야 함)
    private fun st(a: MainActivity, key: String, perms: Array<String>, anyOk: Boolean = false): String {
        if (perms.isEmpty()) return "ok"
        val ok = if (anyOk) perms.any { granted(a, it) } else perms.all { granted(a, it) }
        if (ok) return "ok"
        if (!p.getBoolean("asked_$key", false)) return "ask"
        return if (perms.any { a.shouldShowRequestPermissionRationale(it) }) "ask" else "no"
    }

    fun loc(a: MainActivity) = st(a, "loc", LOC, anyOk = true)
    fun state(a: MainActivity): JSONObject {
        val noti = if (NOTI.isEmpty()) (if (NotiCenter.allowed()) "ok" else "no") else st(a, "noti", NOTI)
        return JSONObject().put("mot", st(a, "mot", MOT)).put("loc", loc(a)).put("hk", "ok").put("noti", noti)
    }

    private fun ask(a: MainActivity, keys: List<String>, done: () -> Unit) {
        val want = mutableListOf<String>()
        for (k in keys) {
            val perms = when (k) { "mot" -> MOT; "loc" -> LOC; "noti" -> NOTI; else -> emptyArray() }
            val s = when (k) { "mot" -> st(a, k, perms); "loc" -> loc(a); "noti" -> if (perms.isEmpty()) "ok" else st(a, k, perms); else -> "ok" }
            if (s == "ask") { want += perms; p.edit().putBoolean("asked_$k", true).apply() }
        }
        if (want.isEmpty()) done() else a.requestPerms(want.toTypedArray()) { done() }
    }

    // 물은 뒤엔 걸음·위치 읽기를 시작한다
    private fun begin(a: MainActivity) {
        p.edit().putBoolean("permAsked", true).apply()
        WalkWorker.schedule(a)
        Walk.startLive(a)
        Walk.refresh(a)
    }

    private fun openSettings(a: MainActivity, noti: Boolean) {
        val i = if (noti && Build.VERSION.SDK_INT >= 26)
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, a.packageName)
        else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", a.packageName, null))
        runCatching { a.startActivity(i) }
    }

    fun handle(a: MainActivity, body: String, reply: (JSONObject) -> Unit) {
        val fin = { begin(a); reply(state(a)) }
        when (body) {
            "ask" -> ask(a, listOf("mot", "loc", "noti"), fin)
            "ask:mot" -> ask(a, listOf("mot"), fin)
            "ask:loc" -> ask(a, listOf("loc"), fin)
            "ask:noti" -> ask(a, listOf("noti"), fin)
            "ask:hk" -> fin()
            "settings:noti" -> { openSettings(a, true); reply(state(a)) }
            "settings" -> { openSettings(a, false); reply(state(a)) }
            else -> reply(state(a))
        }
    }

    // 예전 창구 loc: 'ask' / 'settings' / 그 밖 = 지금 상태 문자열
    fun handleLoc(a: MainActivity, body: String, reply: (String) -> Unit) {
        when (body) {
            "ask" -> ask(a, listOf("loc")) { begin(a); reply(loc(a)) }
            "settings" -> { openSettings(a, false); reply(loc(a)) }
            else -> reply(loc(a))
        }
    }
}
