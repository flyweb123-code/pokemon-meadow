package com.flyweb123.pokerun

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

// 좌표 → "서울 석촌동 석촌호수" 같은 알 주운 곳 이름 + 알 테마 태그 (아이폰 WalkTracker.lookup 과 같은 규칙).
// 카카오 키가 있으면 카카오 지도(그 자리 건물 → 1.5km 안 가장 가까운 곳), 없으면 안드로이드 주소 찾기로 동네 이름만.
// 백그라운드 스레드에서만 부를 것 (네트워크).
object Place {
    fun hasPerm(ctx: Context) =
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    // 마지막으로 알려진 위치. 10분보다 오래됐으면 지금 위치를 새로 받아 본다 (최대 8초)
    @Suppress("MissingPermission")
    fun location(ctx: Context): Location? {
        if (!hasPerm(ctx)) return null
        val lm = ctx.getSystemService(LocationManager::class.java) ?: return null
        val provs = lm.getProviders(true)
        val best = provs.mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }.maxByOrNull { it.time }
        if (best != null && System.currentTimeMillis() - best.time < 10 * 60_000) return best
        if (Build.VERSION.SDK_INT >= 30) {
            val prov = listOf(LocationManager.FUSED_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER).firstOrNull { it in provs }
            if (prov != null) {
                var got: Location? = null
                val latch = CountDownLatch(1)
                val ex = Executors.newSingleThreadExecutor()
                runCatching { lm.getCurrentLocation(prov, null, ex) { got = it; latch.countDown() } }.onFailure { latch.countDown() }
                latch.await(8, TimeUnit.SECONDS)
                ex.shutdown()
                if (got != null) return got
            }
        }
        return best
    }

    fun lookup(ctx: Context, lat: Double, lon: Double): Pair<String, List<String>> {
        val area = geoArea(ctx, lat, lon)
        val key = BuildConfig.KAKAO_KEY
        if (key.isNotEmpty()) {
            runCatching { kakao(lat, lon, key) }.getOrNull()?.let { (kArea, name, tags) ->
                val a = area.ifEmpty { kArea }
                val place = listOf(a, name ?: "").filter { it.isNotEmpty() }.joinToString(" ")
                return Pair(place, tags)
            }
        }
        return Pair(area, emptyList())
    }

    // "서울특별시" → "서울", "경기도" → "경기"
    fun shortCity(s: String): String {
        val provinces = listOf("경기도", "강원도", "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도", "제주도")
        if (s.endsWith("도") && s !in provinces && !s.endsWith("특별자치도")) return s
        for (suf in listOf("특별자치시", "특별자치도", "특별시", "광역시", "도")) if (s.endsWith(suf) && s.length > suf.length) return s.dropLast(suf.length)
        return s
    }

    private fun isKorean(s: String) = s.any { it in '가'..'힣' }

    @Suppress("DEPRECATION")
    private fun geoArea(ctx: Context, lat: Double, lon: Double): String {
        if (!Geocoder.isPresent()) return ""
        val a = runCatching { Geocoder(ctx, Locale.KOREA).getFromLocation(lat, lon, 1)?.firstOrNull() }.getOrNull() ?: return ""
        val parts = listOfNotNull(a.adminArea?.let(::shortCity), (a.subAdminArea ?: a.locality)?.let(::shortCity), a.subLocality ?: a.thoroughfare)
            .filter { it.isNotEmpty() }
        return parts.distinct().joinToString(" ")
    }

    // ── 카카오 지도 ──
    private val cats = listOf("AT4", "CT1", "SW8", "PO3", "SC4", "CE7", "FD6", "HP8", "BK9", "OL7", "MT1", "AD5", "PK6", "CS2")
    private val theme = mapOf(
        "SW8" to "station", "OL7" to "gas", "SC4" to "school", "HP8" to "hospital", "PM9" to "hospital",
        "CE7" to "bakery", "FD6" to "restaurant", "BK9" to "bank", "AD5" to "hotel", "MT1" to "city", "CS2" to "city", "PK6" to "city", "공원" to "park"
    )

    private fun kakaoGet(path: String, q: Map<String, String>, key: String): List<JSONObject> {
        val qs = q.entries.joinToString("&") { "${it.key}=${URLEncoder.encode(it.value, "UTF-8")}" }
        val c = URL("https://dapi.kakao.com$path?$qs").openConnection() as HttpURLConnection
        c.connectTimeout = 8000; c.readTimeout = 8000
        c.setRequestProperty("Authorization", "KakaoAK $key")
        return try {
            if (c.responseCode != 200) emptyList()
            else {
                val docs = JSONObject(c.inputStream.bufferedReader().readText()).optJSONArray("documents")
                (0 until (docs?.length() ?: 0)).mapNotNull { docs!!.optJSONObject(it) }
            }
        } finally { c.disconnect() }
    }

    private data class KP(val name: String, val cat: String, val d: Double, val catName: String)

    // (카카오 동네 이름, 장소 이름, 태그)
    private fun kakao(lat: Double, lon: Double, key: String): Triple<String, String?, List<String>> {
        val x = lon.toString(); val y = lat.toString()
        val doc = kakaoGet("/v2/local/geo/coord2address.json", mapOf("x" to x, "y" to y), key).firstOrNull()
        val building = doc?.optJSONObject("road_address")?.optString("building_name")?.takeIf { it.isNotEmpty() && isKorean(it) }
        val ad = doc?.optJSONObject("address")
        val ws = mutableListOf<String>()
        val rs = listOf(ad?.optString("region_1depth_name")?.let(::shortCity)) +
            (ad?.optString("region_2depth_name") ?: "").split(" ") + listOf(ad?.optString("region_3depth_name"))
        for (w in rs) if (!w.isNullOrEmpty() && w !in ws) ws.add(w)
        val area = ws.joinToString(" ")
        if (building != null) return Triple(area, building, emptyList())

        val places = mutableListOf<KP>()
        val reqs = cats.map { Triple(it, "/v2/local/search/category.json", mapOf("category_group_code" to it)) } +
            Triple("공원", "/v2/local/search/keyword.json", mapOf("query" to "공원"))
        for ((cat, path, q) in reqs) {
            val common = mapOf("x" to x, "y" to y, "radius" to "1500", "sort" to "distance", "size" to "5")
            runCatching { kakaoGet(path, q + common, key) }.getOrDefault(emptyList()).forEach { d ->
                val n = d.optString("place_name"); val dist = d.optString("distance").toDoubleOrNull()
                if (n.isEmpty() || dist == null) return@forEach
                val cn = d.optString("category_name")
                // '공원' 낱말로 찾았어도 공원이 아니면(예: 공원부동산) 그 곳의 카테고리로
                val c = if (cat == "공원" && !cn.contains("공원")) d.optString("category_group_code") else cat
                places.add(KP(n, c, dist, cn))
            }
        }
        val p = places.minByOrNull { it.d } ?: return Triple(area, null, emptyList())
        val t = mutableListOf<String>()
        theme[p.cat]?.let { t.add(it) }
        if (p.catName.isNotEmpty()) t.add("cat:" + p.catName.replace(" > ", ">").replace(",", "·"))
        return Triple(area, p.name, t)
    }
}
