package com.flyweb123.pokerun

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.Executors

// 친구·계정·랭킹 서버 (Cloudflare, 저장소 server/). 게임의 friends 창구 요청을 그대로 서버에 넘긴다 (아이폰 FriendServer 와 같은 약속).
// 서버 주소는 게임 사이트의 config/server.json {"url": "..."} 에서 받아 둔다 → 주소가 없으면 friends 창구를 만들지 않는다
// (게임은 그러면 친구·계정 기능을 숨긴다).
// 기기 비밀값 dev 는 처음 켤 때 만든다. 친구 코드는 서버가 dev 로 계산한다. 계정으로 로그인하면 그 계정을 만든 기기의 dev 를 받아
// 같은 친구 코드를 쓴다 (앱을 다시 깔아도 친구 목록이 이어지게).
object FriendServer {
    private val io = Executors.newFixedThreadPool(3)
    private val p get() = App.prefs

    val url: String? get() = p.getString("serverUrl", null)?.takeIf { it.startsWith("https://") }

    val dev: String
        get() = p.getString("dev", null) ?: run {
            val b = ByteArray(24); SecureRandom().nextBytes(b)
            val d = "a:" + hex(b)
            p.edit().putString("dev", d).apply(); d
        }

    // 서버 주소 새로 받기 (앱 켤 때)
    fun refreshUrl() = io.execute {
        runCatching {
            val c = URL(BuildConfig.GAME_URL + "config/server.json").openConnection() as HttpURLConnection
            c.connectTimeout = 8000; c.readTimeout = 8000; c.useCaches = false
            val u = JSONObject(c.inputStream.bufferedReader().readText()).optString("url").trimEnd('/')
            if (u.startsWith("https://") && u != url) {
                val first = url == null
                p.edit().putString("serverUrl", u).commit()
                // 처음 알게 됐으면 게임을 다시 불러 friends 창구를 만든다 (창구는 페이지를 열 때 정해짐)
                if (first) android.os.Handler(android.os.Looper.getMainLooper()).post { GameLink.web?.reload() }
            }
        }
    }

    private fun hex(b: ByteArray) = b.joinToString("") { "%02x".format(it) }
    private fun shaB(b: ByteArray) = MessageDigest.getInstance("SHA-256").digest(b)
    private fun sha(s: String) = hex(shaB(s.toByteArray()))
    // 아이폰과 같은 비밀번호 해시: sha(소금:비번) 다음 2만 번 sha(h + 소금)
    private fun pwHash(pw: String, salt: String): String {
        var h = shaB("$salt:$pw".toByteArray())
        val sb = salt.toByteArray()
        repeat(20_000) { h = shaB(h + sb) }
        return hex(h)
    }

    // 서버에 보내고 v 를 돌려준다. 실패하면 사용자에게 보여 줄 문장으로 예외
    fun call(o: JSONObject): Any? {
        val base = url ?: throw Exception("친구 서버 주소를 아직 몰라요")
        o.put("dev", dev)
        val c = URL("$base/v1").openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 10_000; c.readTimeout = 30_000
            c.requestMethod = "POST"; c.doOutput = true
            c.setRequestProperty("content-type", "application/json")
            c.outputStream.use { it.write(o.toString().toByteArray()) }
            val st = if (c.responseCode < 400) c.inputStream else c.errorStream
            val r = JSONObject(st.bufferedReader().readText())
            if (!r.optBoolean("ok")) throw Exception(r.optString("err", "친구 서버 오류"))
            return r.opt("v")
        } catch (e: java.io.IOException) {
            throw Exception("인터넷 연결을 확인해 주세요")
        } finally { c.disconnect() }
    }

    private fun acct(op: String, b: JSONObject): Any? {
        val id = b.optString("id").lowercase(); val pw = b.optString("pw")
        if (!Regex("^[a-z0-9_]{4,12}$").matches(id) || pw.length !in 4..64) throw Exception("아이디는 영문 소문자·숫자 4~12글자, 비밀번호는 4글자 이상이에요")
        val k = sha("pkgk:$id:$pw")
        if (op == "acctNew") {
            val sb = ByteArray(16); SecureRandom().nextBytes(sb); val salt = hex(sb)
            return call(JSONObject().put("op", op).put("id", id).put("salt", salt).put("ph", pwHash(pw, salt)).put("k", k))
        }
        val salt = call(JSONObject().put("op", "acctSalt").put("id", id)) as? String ?: throw Exception("없는 아이디예요")
        val r = call(JSONObject().put("op", "acctLogin").put("id", id).put("ph", pwHash(pw, salt)).put("k", k)) as? JSONObject
            ?: throw Exception("로그인하지 못했어요")
        r.optString("dev").takeIf { it.length >= 8 }?.let { p.edit().putString("dev", it).apply() }
        r.remove("dev")
        return r
    }

    // 게임 → 서버. done(ok, 값 또는 오류 문장) 은 아무 스레드에서나 불린다
    fun handle(b: JSONObject?, done: (Boolean, Any?) -> Unit) = io.execute {
        try {
            b ?: throw Exception("잘못된 요청")
            val op = b.optString("op")
            val v = when (op) {
                "acctNew", "acctLogin" -> acct(op, b)
                "noticeTest" -> { NotiCenter.test(b.optString("title"), b.optString("body")); true }
                else -> call(b)
            }
            done(true, v)
        } catch (e: Exception) {
            done(false, e.message ?: "친구 서버 오류")
        }
    }

    // ---------- 알림 (서버가 푸시를 보내지 않으니 앱이 가끔 물어본다: 앱 켤 때·15분마다) ----------
    // 친구 요청(fr): 내 코드 앞으로 온 요청(best>0)·수락(best<0). 공지(nw): 새 공지.
    fun poll() {
        if (url == null) return
        val nw = p.getBoolean("pushNw", false); val fr = p.getBoolean("pushFr", false)
        if (fr) runCatching {
            val me = call(JSONObject().put("op", "me")) as String
            val rows = call(JSONObject().put("op", "mgtop").put("game", "fr$me")) as? JSONArray ?: JSONArray()
            val seen = p.getLong("frSeenAt", 0L); var top = seen
            for (i in 0 until rows.length()) {
                val r = rows.getJSONObject(i); val at = r.optLong("at"); val best = r.optDouble("best")
                if (at <= seen || best == 0.0) continue
                top = maxOf(top, at)
                if (seen > 0) {
                    if (best > 0) NotiCenter.post("frq-$at", "친구 요청이 왔어요!", "포켓에그를 열어 친구 요청을 확인해 보세요.", force = false)
                    else NotiCenter.post("fra-$at", "친구가 되었어요!", "친구 요청이 수락됐어요. 이제 알을 선물할 수 있어요.", force = false)
                }
            }
            p.edit().putLong("frSeenAt", if (seen == 0L) maxOf(top, System.currentTimeMillis()) else top).apply()
        }
        if (nw) runCatching {
            val seen = p.getLong("nwSeen", -1L)
            val rows = call(JSONObject().put("op", "news").put("after", maxOf(0L, seen))) as? JSONArray ?: JSONArray()
            var top = maxOf(0L, seen)
            for (i in 0 until rows.length()) {
                val r = rows.getJSONObject(i); val n = r.optLong("n")
                top = maxOf(top, n)
                if (seen >= 0 && i == 0) NotiCenter.post("nw-$n", r.optString("title"), r.optString("body"), force = true)
            }
            p.edit().putLong("nwSeen", top).apply()
        }
    }
}
