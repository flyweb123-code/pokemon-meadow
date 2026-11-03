package com.flyweb123.pokerun

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences

// 안드로이드 앱: 포켓몬 키우기 웹 게임을 화면 가득 띄우고, 아이폰 앱이 하던 일(만보기·알림·진동·권한)을 대신한다.
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        app = this
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(NotiCenter.CHANNEL, getString(R.string.noti_channel), NotificationManager.IMPORTANCE_DEFAULT))
        if (Perm.asked) WalkWorker.schedule(this)
        FriendServer.refreshUrl()
        Push.init(this)
    }

    companion object {
        lateinit var app: App
            private set
        // 게임 화면이 켜져 있는지 (켜져 있으면 알림 대신 게임이 직접 알려 준다)
        @Volatile var foreground = false
        val prefs: SharedPreferences get() = app.getSharedPreferences("pk", Context.MODE_PRIVATE)
    }
}
