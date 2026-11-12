package com.flyweb123.pokerun

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

// 앱 알림 (아이폰 NotiCenter 와 같은 일): 서버 없이 앱 안에서 띄우는 알림.
// 게임은 저장할 때마다 '앞으로 몇 km 더 걸으면 무슨 일이 생기는지'(notiPlan)를 보낸다.
// 화면이 꺼져 있는 동안 Walk 가 걸은 거리를 넘겨 주면, 그 거리를 넘은 항목마다 알림을 띄운다.
object NotiCenter {
    const val CHANNEL = "walk"
    private val p get() = App.prefs

    private var total: Double
        get() = java.lang.Double.longBitsToDouble(p.getLong("notiWalkTotal", 0L))
        set(v) { p.edit().putLong("notiWalkTotal", java.lang.Double.doubleToRawLongBits(v)).apply() }

    private fun fired(): MutableSet<String> = p.getStringSet("notiFired", emptySet())!!.toMutableSet()

    // 게임 → 계획. pendingKm 은 아직 게임에 넘기지 못한 걸음 거리
    @Synchronized fun update(d: JSONObject, pendingKm: Double) {
        val on = d.optBoolean("on", false)
        val items = d.optJSONArray("items") ?: JSONArray()
        val keep = JSONArray(); val ids = mutableSetOf<String>()
        for (i in 0 until items.length()) {
            val o = items.optJSONObject(i) ?: continue
            val id = o.optString("id"); val km = o.optDouble("km", 0.0)
            if (id.isEmpty() || !(km > 0)) continue
            keep.put(JSONObject().put("id", id).put("km", km).put("title", o.optString("title", "포켓몬 키우기"))
                .put("body", o.optString("body", "")).put("n", o.optInt("n", 1)))
            ids.add(id)
        }
        val plan = JSONObject().put("on", on).put("items", keep).put("base", total - pendingKm)
        p.edit().putString("notiPlan", plan.toString()).putStringSet("notiFired", fired().intersect(ids)).apply()
        // 친구 요청(fr)·공지(nw) 알림: 게임이 보낼 때만 (FriendServer.poll 이 15분마다 서버에 물어본다)
        if (d.has("fr")) p.edit().putBoolean("pushFr", d.optBoolean("fr")).apply()
        if (d.has("nw")) p.edit().putBoolean("pushNw", d.optBoolean("nw")).apply()
        // 친구가 내 필드에 놀러 오면 진짜 푸시 (Push.kt, 베타 게임만 fv 를 보냄)
        if (d.has("fv")) Push.setVisit(d.optBoolean("fv"))
        // v22.58 경완: 지역·이벤트 알릴 곳 (게임이 zn 을 보낼 때만)
        if (d.has("zn")) ZoneAlert.update(d.optJSONObject("zn"))
    }

    @Synchronized fun walked(km: Double) {
        if (km <= 0) return
        total += km
        check()
    }

    private fun check() {
        if (App.foreground) return
        val plan = runCatching { JSONObject(p.getString("notiPlan", null) ?: return) }.getOrNull() ?: return
        if (!plan.optBoolean("on")) return
        val d = total - plan.optDouble("base", 0.0)
        val done = fired()
        val items = plan.optJSONArray("items") ?: return
        val hit = (0 until items.length()).mapNotNull { items.optJSONObject(it) }
            .filter { d >= it.optDouble("km") && it.optString("id") !in done }
        if (hit.isEmpty()) return
        hit.forEach { done.add(it.optString("id")) }
        p.edit().putStringSet("notiFired", done).apply()
        // 같은 종류가 한꺼번에 여러 개면 하나로 묶는다
        for (kind in listOf("egg", "hatch", "evo")) {
            val g = hit.filter { it.optString("id").startsWith("$kind-") }
            val first = g.firstOrNull() ?: continue
            val title = first.optString("title")
            if (g.size == 1) { post(first.optString("id"), title, first.optString("body"), force = false); continue }
            val n = g.sumOf { maxOf(1, it.optInt("n", 1)) }
            val body = when (kind) {
                "egg" -> "걷다가 알 ${n}개를 주웠어요. 가방을 확인해 보세요."
                "hatch" -> "알 ${g.size}개가 움직이기 시작했어요. 부화기에서 부화시켜 보세요."
                else -> "짝꿍 ${g.size}마리가 진화할 수 있어요. 짝꿍 탭에서 진화시켜 보세요."
            }
            post(first.optString("id"), title, body, force = false)
        }
    }

    fun allowed(): Boolean = NotificationManagerCompat.from(App.app).areNotificationsEnabled() &&
        (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(App.app, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)

    // 운영자 공지 시험: 이 기기에만 5초 뒤 같은 알림
    fun test(title: String, body: String) {
        if (!allowed()) throw Exception("알림 권한이 꺼져 있어요. 설정 › 권한에서 켜 주세요")
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ post("noticeTest", title, body, force = true) }, 5000)
    }

    // force = 앱이 켜져 있어도 띄움 (공지). 그 밖엔 앱이 켜져 있으면 게임이 직접 알려 주므로 띄우지 않는다
    @Suppress("MissingPermission")
    fun post(id: String, title: String, body: String, force: Boolean) {
        if (!allowed() || (!force && App.foreground)) return
        val ctx = App.app
        val open = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_noti)
            .setContentTitle(title).setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open).setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(ctx).notify(id.hashCode(), n)
    }

    // 앱을 열면 쌓인 알림은 지운다 (게임 화면이 같은 소식을 보여 준다)
    fun clearDelivered() = NotificationManagerCompat.from(App.app).cancelAll()
}
