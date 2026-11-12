package com.flyweb123.pokerun

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

// 앱이 꺼져 있어도 15분마다 깨어나 만보기를 읽고, 250m 넘게 걸었으면 알을 대기열에 넣고 알림을 확인한다.
class WalkWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
    override fun doWork(): Result {
        if (!Perm.asked) return Result.success()
        Walk.readOnce(applicationContext)?.let { Walk.account(it) }
        Walk.syncNow(applicationContext, 0.25)
        FriendServer.poll()
        runCatching { ZoneAlert.checkNow(applicationContext) }   // v22.58: 지역·이벤트 알림
        return Result.success()
    }

    companion object {
        fun schedule(ctx: Context) {
            val req = PeriodicWorkRequestBuilder<WalkWorker>(15, TimeUnit.MINUTES).build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("walk", ExistingPeriodicWorkPolicy.KEEP, req)
        }
    }
}
