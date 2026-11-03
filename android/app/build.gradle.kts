plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// 카카오 지도 REST 키 (알 주운 곳 이름): 저장소에 올리지 않는다.
// GitHub Actions 는 비밀 변수 KAKAO_KEY, 내 컴퓨터는 android/kakao-key.txt 한 줄. 없으면 안드로이드 기본 주소 찾기만 쓴다.
val kakaoKey: String = (System.getenv("KAKAO_KEY")
    ?: rootProject.file("kakao-key.txt").takeIf { it.exists() }?.readText()
    ?: "").trim()

// 진짜 푸시 (친구가 필드에 놀러 오면, 2026-11-03): Firebase 프로젝트의 google-services.json 내용.
// GitHub Actions 는 비밀 변수 GOOGLE_SERVICES_JSON, 내 컴퓨터는 android/app/google-services.json. 없으면 푸시만 빠진 앱이 된다.
// (google-services 플러그인 대신 값 4개만 꺼내 앱이 직접 Firebase 를 켠다 — 파일이 없어도 빌드가 깨지지 않게)
val fb: Map<String, String> = run {
    val txt = System.getenv("GOOGLE_SERVICES_JSON")?.takeIf { it.isNotBlank() } ?: file("google-services.json").takeIf { it.exists() }?.readText()
    if (txt == null) return@run emptyMap()
    val j = groovy.json.JsonSlurper().parseText(txt) as Map<*, *>
    val pi = j["project_info"] as Map<*, *>
    val cl = (j["client"] as List<*>).map { it as Map<*, *> }.firstOrNull { ((it["client_info"] as Map<*, *>)["android_client_info"] as Map<*, *>)["package_name"] == "com.flyweb123.pokerun" }
        ?: return@run emptyMap()
    mapOf(
        "FB_APP_ID" to ((cl["client_info"] as Map<*, *>)["mobilesdk_app_id"] as String),
        "FB_API_KEY" to (((cl["api_key"] as List<*>).first() as Map<*, *>)["current_key"] as String),
        "FB_PROJECT_ID" to (pi["project_id"] as String),
        "FB_SENDER_ID" to (pi["project_number"] as String),
    )
}

// 앱 버전: CI 는 실행 번호로 올린다 (같은 서명이면 덮어 설치됨)
val buildNo = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "com.flyweb123.pokerun"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.flyweb123.pokerun"
        minSdk = 26
        targetSdk = 35
        versionCode = buildNo
        versionName = "1.0.$buildNo"
        buildConfigField("String", "KAKAO_KEY", "\"$kakaoKey\"")
        for (k in listOf("FB_APP_ID", "FB_API_KEY", "FB_PROJECT_ID", "FB_SENDER_ID")) buildConfigField("String", k, "\"${fb[k] ?: ""}\"")
        buildConfigField("String", "GAME_URL", "\"https://flyweb123-code.github.io/pokemon-meadow/\"")
    }

    signingConfigs {
        // 친구들에게 APK 로 나눠 줄 때 쓰는 개발용 서명 (늘 같은 키라 새 버전을 덮어 설치할 수 있다).
        // 플레이 스토어에 올릴 땐 비밀 변수 ANDROID_KEYSTORE_B64 등으로 진짜 키를 넣는다 (README).
        create("dev") {
            val ks = System.getenv("ANDROID_KEYSTORE_FILE")
            storeFile = if (ks != null) file(ks) else file("dev.keystore")
            storePassword = System.getenv("ANDROID_KEYSTORE_PASS") ?: "pokegrow"
            keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: "pokegrow"
            keyPassword = System.getenv("ANDROID_KEY_PASS") ?: "pokegrow"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("dev")
        }
        debug {
            signingConfig = signingConfigs.getByName("dev")
        }
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("com.google.firebase:firebase-messaging:24.0.0")   // 친구 방문 푸시 (Push.kt)
}
