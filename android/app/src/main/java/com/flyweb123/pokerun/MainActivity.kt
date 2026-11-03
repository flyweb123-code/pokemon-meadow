package com.flyweb123.pokerun

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.view.ViewGroup
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

// GitHub Pages 의 게임을 WebView 로 띄운다 (아이폰 GameView 와 같은 일). 게임 저장은 이 앱 안에 따로 남는다.
class MainActivity : ComponentActivity() {
    var web: WebView? = null
        private set
    private lateinit var root: FrameLayout
    private val shim by lazy { assets.open("shim.js").bufferedReader().readText() }
    private var shimAtStart = false
    private var leftAt = 0L

    // 권한 창 (Perm 이 부름)
    private var permDone: (() -> Unit)? = null
    private val permLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        val f = permDone; permDone = null; f?.invoke()
    }
    fun requestPerms(perms: Array<String>, done: () -> Unit) {
        permDone?.invoke()
        permDone = done
        permLauncher.launch(perms)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
        root = FrameLayout(this).apply { setBackgroundColor(getColor(R.color.bg)) }
        setContentView(root)
        // 상태 막대·내비게이션 막대·카메라 구멍을 피해서 게임을 그린다 (안드로이드 웹뷰는 safe-area 값을 주지 않음)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val i = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(i.left, i.top, i.right, i.bottom)
            WindowInsetsCompat.CONSUMED
        }
        makeWeb()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            // 뒤로 가기: 게임을 끄지 않고 홈으로 (게임 안 창 닫기는 게임 버튼으로)
            override fun handleOnBackPressed() { moveTaskToBack(true) }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun makeWeb() {
        web?.let { root.removeView(it); it.destroy() }
        val w = WebView(this)
        w.setBackgroundColor(getColor(R.color.bg))
        w.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false   // 배경 음악이 켜자마자 나오게
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls = false
            textZoom = 100   // 휴대폰 글자 크기 설정이 게임 도트 글자를 키우지 않게
        }
        w.isVerticalScrollBarEnabled = false
        w.isHorizontalScrollBarEnabled = false
        w.overScrollMode = WebView.OVER_SCROLL_NEVER
        w.addJavascriptInterface(Bridge(this), "PkAndroid")
        // 게임 스크립트보다 먼저 창구(window.webkit.messageHandlers)를 만든다
        shimAtStart = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
        if (shimAtStart) {
            val origin = Uri.parse(BuildConfig.GAME_URL).let { "${it.scheme}://${it.host}" }
            WebViewCompat.addDocumentStartJavaScript(w, shim, setOf(origin))
        }
        w.webChromeClient = WebChromeClient()   // alert/confirm 창
        w.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                GameLink.gameReady = false
                if (!shimAtStart) view.evaluateJavascript(shim, null)
            }
            // 게임 밖 주소(shortcuts:, intent:, 다른 사이트)는 밖에서 연다
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url
                if (u.host == Uri.parse(BuildConfig.GAME_URL).host) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, u)) } catch (_: ActivityNotFoundException) {}
                return true
            }
            // 웹 화면이 메모리 부족 등으로 죽으면 하얀 화면으로 두지 않고 다시 만든다
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                GameLink.gameReady = false
                if (view == web) { web = null; makeWeb() }
                return true
            }
        }
        root.addView(w, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        web = w
        GameLink.web = w
        w.loadUrl(BuildConfig.GAME_URL)
    }

    override fun onResume() {
        super.onResume()
        App.foreground = true
        web?.onResume()
        NotiCenter.clearDelivered()
        // 30분 넘게 나가 있다가 돌아오면 새 버전이 있을 수 있으니 다시 불러온다
        if (leftAt > 0 && SystemClock.elapsedRealtime() - leftAt > 30 * 60_000) web?.loadUrl(BuildConfig.GAME_URL)
        Walk.startLive(this)
        Walk.refresh(this)
    }

    override fun onPause() {
        super.onPause()
        App.foreground = false
        leftAt = SystemClock.elapsedRealtime()
        web?.onPause()   // 게임에 '화면 숨김' 이 전해져 저장한다
        Walk.stopLive(this)
    }

    override fun onDestroy() {
        web?.destroy(); web = null
        super.onDestroy()
    }
}
