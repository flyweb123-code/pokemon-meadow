package com.flyweb123.pokerun

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

// 진동: 게임이 haptic 으로 0(약하게)·1(보통)·2(세게), hum 으로 1(계속 우우웅)·0(멈춤)을 보낸다.
// hum 은 0.3초 동안 1이 안 오면 저절로 멈춘다 (게임이 멈춰도 진동이 남지 않게).
object Haptics {
    private val main = Handler(Looper.getMainLooper())
    private var humming = false
    private val stop = Runnable { vib()?.cancel(); humming = false }

    private fun vib(): Vibrator? = if (Build.VERSION.SDK_INT >= 31)
        App.app.getSystemService(VibratorManager::class.java)?.defaultVibrator
    else @Suppress("DEPRECATION") App.app.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    fun tap(n: Int) {
        val v = vib() ?: return
        val k = n.coerceIn(0, 2)
        if (Build.VERSION.SDK_INT >= 29) {
            v.vibrate(VibrationEffect.createPredefined(intArrayOf(VibrationEffect.EFFECT_TICK, VibrationEffect.EFFECT_CLICK, VibrationEffect.EFFECT_HEAVY_CLICK)[k]))
        } else v.vibrate(VibrationEffect.createOneShot(longArrayOf(10, 20, 40)[k], VibrationEffect.DEFAULT_AMPLITUDE))
    }

    fun hum(on: Boolean) {
        main.removeCallbacks(stop)
        if (!on) { stop.run(); return }
        if (!humming) {
            val v = vib() ?: return
            v.vibrate(VibrationEffect.createOneShot(30_000, if (v.hasAmplitudeControl()) 110 else VibrationEffect.DEFAULT_AMPLITUDE))
            humming = true
        }
        main.postDelayed(stop, 300)
    }
}
