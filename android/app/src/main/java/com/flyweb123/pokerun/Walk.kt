package com.flyweb123.pokerun

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import java.util.Calendar
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

// 알 줍기: 휴대폰 만보기(걸음 수 센서)로 걸은 거리만큼 가방에 알을 넣는다 (아이폰 WalkTracker 와 같은 일).
// 걸음 수 센서는 앱이 꺼져 있어도 휴대폰이 계속 센다 (켠 뒤 누적값). 그래서 앱을 열 때·15분마다(WalkWorker)
// 지난번 값과의 차이를 읽어 거리로 바꾸고, 250m 마다 지금 있는 곳 이름과 함께 대기열(GameLink)에 넣는다.
object Walk {
    // 걸음 → km (보폭 약 72cm)
    const val STRIDE_KM = 0.00072
    private const val SYNC_KM = 0.25

    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val p get() = App.prefs

    fun hasPerm(ctx: Context) = android.os.Build.VERSION.SDK_INT < 29 ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

    private fun dayStart(t: Long = System.currentTimeMillis()): Long = Calendar.getInstance().apply {
        timeInMillis = t; set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    // 센서 누적값 → 오늘 걸음·아직 알로 안 바꾼 걸음에 더한다. 휴대폰을 껐다 켜면 누적값이 0부터 다시 시작한다.
    @Synchronized fun account(counter: Float) {
        val last = p.getFloat("lastCounter", -1f)
        val delta = when {
            last < 0f -> 0f              // 처음: 기준만 잡는다 (설치 전 걸음은 넣지 않음)
            counter < last -> counter    // 재부팅
            else -> counter - last
        }
        val day = dayStart()
        var today = p.getFloat("todaySteps", 0f)
        if (p.getLong("todayDay", 0L) != day) today = 0f
        p.edit()
            .putFloat("lastCounter", counter)
            .putLong("todayDay", day)
            .putFloat("todaySteps", today + delta)
            .putFloat("pendSteps", p.getFloat("pendSteps", 0f) + delta)
            .apply()
    }

    fun todayKm(): Double = if (p.getLong("todayDay", 0L) == dayStart()) p.getFloat("todaySteps", 0f) * STRIDE_KM else 0.0
    private fun pendKm(): Double = p.getFloat("pendSteps", 0f) * STRIDE_KM

    // 센서에서 지금 누적값을 한 번 읽는다 (백그라운드 일꾼용, 최대 3초 기다림)
    fun readOnce(ctx: Context): Float? {
        val sm = ctx.getSystemService(SensorManager::class.java) ?: return null
        val s = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return null
        if (!hasPerm(ctx)) return null
        var v: Float? = null
        val latch = CountDownLatch(1)
        val l = object : SensorEventListener {
            override fun onSensorChanged(e: SensorEvent) { v = e.values[0]; latch.countDown() }
            override fun onAccuracyChanged(sn: Sensor?, a: Int) {}
        }
        sm.registerListener(l, s, SensorManager.SENSOR_DELAY_NORMAL, main)
        latch.await(3, TimeUnit.SECONDS)
        sm.unregisterListener(l)
        return v
    }

    // MARK: 앱 화면이 켜져 있는 동안 실시간으로

    private var live: SensorEventListener? = null
    private var liveSynced = -1.0

    fun startLive(ctx: Context) {
        if (!Perm.asked) return
        val sm = ctx.getSystemService(SensorManager::class.java)
        val s = sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (s == null) { GameLink.sendPedErr("이 기기는 만보기(걸음 수 센서)를 지원하지 않아요"); return }
        if (!hasPerm(ctx)) { GameLink.sendPedErr("신체 활동 권한이 꺼져 있어요 (설정 › 애플리케이션 › 포켓에그 › 권한)"); return }
        if (live != null) return
        val l = object : SensorEventListener {
            override fun onSensorChanged(e: SensorEvent) { account(e.values[0]); gotToday(ctx) }
            override fun onAccuracyChanged(sn: Sensor?, a: Int) {}
        }
        live = l
        sm.registerListener(l, s, SensorManager.SENSOR_DELAY_NORMAL, main)
        GameLink.sendToday(todayKm(), dayStart())
    }

    fun stopLive(ctx: Context) {
        live?.let { ctx.getSystemService(SensorManager::class.java)?.unregisterListener(it) }
        live = null; liveSynced = -1.0
    }

    private fun gotToday(ctx: Context) {
        val km = todayKm()
        GameLink.sendToday(km, dayStart())
        if (liveSynced < 0 || km < liveSynced) liveSynced = km
        else if (km - liveSynced >= SYNC_KM) { liveSynced = km; sync(ctx, 0.0) }
    }

    // 앱을 열 때 한 번
    fun refresh(ctx: Context) {
        if (!Perm.asked) return
        io.execute {
            readOnce(ctx)?.let { account(it) }
            GameLink.sendToday(todayKm(), dayStart())
            syncNow(ctx, 0.01)
        }
    }

    // 쌓인 걸음이 min km 넘으면 지금 있는 곳 이름을 찾아 대기열에 넣는다
    fun sync(ctx: Context, min: Double) = io.execute { syncNow(ctx, min) }

    fun syncNow(ctx: Context, min: Double) {
        val km = pendKm()
        if (km < min || km <= 0.0) return
        p.edit().putFloat("pendSteps", 0f).apply()
        val loc = Place.location(ctx)
        if (loc != null) runCatching { ZoneAlert.check(loc.latitude, loc.longitude) }   // v22.58: 지역·이벤트 알림
        val (name, tags) = if (loc != null) Place.lookup(ctx, loc.latitude, loc.longitude) else Pair("", emptyList())
        GameLink.enqueueWalk(Math.round(km * 1000) / 1000.0, name, tags, loc?.latitude, loc?.longitude)
    }
}
