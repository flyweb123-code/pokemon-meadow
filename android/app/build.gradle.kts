plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// 카카오 지도 REST 키 (알 주운 곳 이름): 저장소에 올리지 않는다.
// GitHub Actions 는 비밀 변수 KAKAO_KEY, 내 컴퓨터는 android/kakao-key.txt 한 줄. 없으면 안드로이드 기본 주소 찾기만 쓴다.
val kakaoKey: String = (System.getenv("KAKAO_KEY")
    ?: rootProject.file("kakao-key.txt").takeIf { it.exists() }?.readText()
    ?: "").trim()

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
}
