package com.flyweb123.pokerun

import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference

// 앱 → 게임 (아이폰 PhoneBridge 와 같은 일).
// 걸은 거리는 대기열(prefs)에 쌓았다가 게임이 준비되면 window.pokeRunWalk 로 넘긴다. 못 넘기면 다시 대기열로.
object GameLink {
    private val main = Handler(Looper.getMainLooper())
    private var webRef = WeakReference<WebView>(null)
    var web: WebView?
        get() = webRef.get()
        set(v) { webRef = WeakReference(v) }

    var gameReady = false
        set(v) { field = v; if (v) flushPending() }

    private const val WALK_KEY = "pendingWalk"

    private fun onMain(f: () -> Unit) { if (Looper.myLooper() == Looper.getMainLooper()) f() else main.post(f) }

    // MARK: 오늘 걸은 거리 (화면 표시 + 걷는 동안 바로 알에 쌓기)
    private var todayKm: Double? = null
    private var todayDay = 0L
    fun sendToday(km: Double, dayMs: Long) = onMain {
        todayKm = km; todayDay = dayMs
        flushToday()
    }
    private fun flushToday() {
        val w = web ?: return
        val km = todayKm ?: return
        if (!gameReady) return
        w.evaluateJavascript("window.pokeRunToday && window.pokeRunToday($km, $todayDay)", null)
    }

    private var pedErr: String? = null
    fun sendPedErr(msg: String) = onMain {
        pedErr = msg
        val w = web ?: return@onMain
        if (!gameReady) return@onMain
        w.evaluateJavascript("window.pokeRunPedErr && window.pokeRunPedErr(${JSONObject.quote(msg)})", null)
    }

    // MARK: 걸음 → 가방 알

    @Synchronized private fun walkList(): JSONArray = try { JSONArray(App.prefs.getString(WALK_KEY, "[]")) } catch (e: Exception) { JSONArray() }
    @Synchronized private fun saveWalk(a: JSONArray) { App.prefs.edit().putString(WALK_KEY, a.toString()).apply() }

    fun pendingWalkKm(): Double {
        val a = walkList(); var s = 0.0
        for (i in 0 until a.length()) s += a.optJSONObject(i)?.optDouble("km", 0.0) ?: 0.0
        return s
    }

    fun enqueueWalk(km: Double, place: String, tags: List<String>, lat: Double?, lon: Double?) {
        NotiCenter.walked(km)   // 화면이 꺼져 있으면 알·부화·진화 알림을 확인한다
        synchronized(this) {
            val a = walkList()
            val o = JSONObject().put("km", km).put("place", place).put("tags", tags.joinToString(","))
            if (lat != null && lon != null) { o.put("la", lat); o.put("lo", lon) }
            a.put(o); saveWalk(a)
        }
        onMain { flushPending() }
    }

    private fun requeue(o: JSONObject) = synchronized(this) { val a = walkList(); a.put(o); saveWalk(a) }

    private fun flushWalk(w: WebView) {
        val list = synchronized(this) { val a = walkList(); saveWalk(JSONArray()); a }
        for (i in 0 until list.length()) {
            val o = list.optJSONObject(i) ?: continue
            val km = o.optDouble("km", 0.0)
            val place = JSONObject.quote(o.optString("place", ""))
            val tags = JSONObject.quote(o.optString("tags", ""))
            val ll = if (o.has("la") && o.has("lo")) ", ${o.getDouble("la")}, ${o.getDouble("lo")}" else ""
            w.evaluateJavascript("window.pokeRunWalk ? window.pokeRunWalk($km, $place, $tags$ll) : false") { r ->
                if (r == "false") requeue(o)   // 게임이 false 를 돌려주면 못 넣은 것
            }
        }
    }

    fun flushPending() = onMain {
        val w = web ?: return@onMain
        if (!gameReady) return@onMain
        flushWalk(w)
        flushToday()
        if (todayKm == null) pedErr?.let { sendPedErr(it) }
    }
}
