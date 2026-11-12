package com.flyweb123.pokerun

import android.content.Context
import android.location.Location
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

// v22.58 경완 (2026-11-13): 앱이 꺼져 있을 때 '새로운 지역!'·'이벤트!' 알림창이 뜰 곳에 들어오면 휴대폰 알림 (아이폰 ZoneAlert.swift 와 같은 규칙).
// 게임이 알림 계획(noti)의 zn 에 알릴 곳 목록을 보낸다 (index.html notiZones). 15분마다 깨어날 때(WalkWorker)와 걸음을 넘길 때(Walk.syncNow) 위치를 비교한다.
// 규칙: 앱이 켜져 있으면 안 보냄, 밤 10시~아침 8시엔 안 보냄, 이벤트는 이벤트마다 한 번, 지역은 지역마다 하루 한 번, 둘 다 걸리면 이벤트만.
object ZoneAlert {
    private val p get() = App.prefs

    @Synchronized fun update(d: JSONObject?) {
        if (d == null || !d.optBoolean("on")) p.edit().remove("zonePlan").apply()
        else p.edit().putString("zonePlan", d.toString()).apply()
    }

    // 15분마다: 마지막으로 알려진 위치가 30분 안 것일 때만
    fun checkNow(ctx: Context) {
        if (p.getString("zonePlan", null) == null) return
        val loc: Location = Place.location(ctx) ?: return
        if (System.currentTimeMillis() - loc.time > 30 * 60_000) return
        check(loc.latitude, loc.longitude)
    }

    private fun dist(la1: Double, lo1: Double, la2: Double, lo2: Double): Double {
        val r = FloatArray(1); Location.distanceBetween(la1, lo1, la2, lo2, r); return r[0].toDouble()
    }
    // 게임 auEll 과 같은 식 (1 이하 = 타원 안)
    private fun ell(la: Double, lo: Double, g: JSONObject): Double {
        val gla = g.optDouble("la"); val glo = g.optDouble("lo"); val r = g.optDouble("r", 1.0); val r2 = g.optDouble("r2", r).let { if (it > 0) it else r }
        val x = (lo - glo) * 111320 * Math.cos(Math.toRadians(gla)); val y = (la - gla) * 110540; val t = Math.toRadians(g.optDouble("rot", 0.0))
        val u = (x * Math.cos(t) + y * Math.sin(t)) / r; val v = (-x * Math.sin(t) + y * Math.cos(t)) / r2
        return u * u + v * v
    }
    private fun day(ms: Long = System.currentTimeMillis()): String {
        val c = Calendar.getInstance().apply { timeInMillis = ms }
        return "${c.get(Calendar.YEAR)}-${c.get(Calendar.MONTH) + 1}-${c.get(Calendar.DAY_OF_MONTH)}"
    }
    private fun objs(a: JSONArray?): List<JSONObject> = if (a == null) emptyList() else (0 until a.length()).mapNotNull { a.optJSONObject(it) }

    @Synchronized fun check(la: Double, lo: Double) {
        if (App.foreground) return
        val plan = runCatching { JSONObject(p.getString("zonePlan", null) ?: return) }.getOrNull() ?: return
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        if (h < 8 || h >= 22) return   // 밤 10시~아침 8시엔 안 보냄 (앱 켜면 알림창으로만)
        val now = System.currentTimeMillis().toDouble()
        val done = (p.getString("zoneFired", null)?.split('\n')?.filter { it.isNotEmpty() } ?: emptyList()).toMutableList()
        fun save() = p.edit().putString("zoneFired", done.takeLast(120).joinToString("\n")).apply()
        // 1) 이벤트
        val e = objs(plan.optJSONArray("ev")).firstOrNull {
            now >= it.optDouble("a") && now <= it.optDouble("b") && !done.contains("ev:" + it.optString("id")) &&
                dist(la, lo, it.optDouble("la"), it.optDouble("lo")) <= it.optDouble("r")
        }
        if (e != null) {
            done.add("ev:" + e.optString("id")); save()
            NotiCenter.post("zone-ev-" + e.optString("id"), e.optString("t", "이벤트!"), e.optString("m"), force = false)
            return
        }
        // 2) 지역: 가장 가까운 지역(반지름 1.5배 안)이 낯선 곳이면 — 시·군 원 안이면 시·군 이름, 아니면 지역 이름
        var best: JSONObject? = null; var bd = 2.25
        for (g in objs(plan.optJSONArray("rg"))) { val d = ell(la, lo, g); if (d <= bd) { bd = d; best = g } }
        val g = best ?: return
        if (g.optInt("aw") != 1) return
        var city: JSONObject? = null; var cd = 1.0
        for (t in objs(plan.optJSONArray("ct"))) { val d = dist(la, lo, t.optDouble("la"), t.optDouble("lo")) / maxOf(t.optDouble("r", 1.0), 1.0); if (d <= cd) { cd = d; city = t } }
        val name = city?.optString("n") ?: g.optString("n")
        val key = (if (city != null) "c:" else "r:") + name
        val today = day()
        val pa = plan.optJSONArray("p")
        val seen = if (day(plan.optLong("pt")) == today && pa != null) (0 until pa.length()).map { pa.optString(it) } else emptyList()
        if (key in seen || done.contains("day:$today:$key")) return
        done.add("day:$today:$key"); save()
        NotiCenter.post("zone-rg-$today-$key", "📍 새로운 지역, ${name}에 왔어요!", "${name}에서 많이 나오는 포켓몬을 확인해 보세요.", force = false)
    }
}
