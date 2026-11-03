# 포켓몬 키우기 안드로이드 앱

아이폰 앱(`native/`)처럼 GitHub Pages 의 게임을 WebView 로 띄우는 앱입니다. 게임 패치는 앱을 다시 만들지 않아도 바로 보입니다.

## 설치 (맥·Android Studio 필요 없음)

1. `android/` 가 바뀌어 main 에 합쳐지면 GitHub Actions(**Android APK**)가 APK 를 만들어
   Releases 의 **android-latest** 에 `pokegrow.apk` 로 올립니다.
2. 안드로이드 폰 브라우저로 `https://github.com/flyweb123-code/pokemon-meadow/releases/tag/android-latest` 를 열고 `pokegrow.apk` 를 받습니다.
3. 받은 파일을 누르면 "출처를 알 수 없는 앱" 허용을 묻습니다 → 허용 → 설치.
4. 새 버전도 같은 방법으로 받아 설치하면 덮어써집니다 (게임 저장은 남음). 서명 키가 늘 같아서 가능합니다.

다른 브랜치에서 만든 APK 는 Actions 실행 화면 아래 **Artifacts › pokegrow-android** (zip) 에 있습니다.

## 아이폰 앱과 같은 점 / 다른 점

| 기능 | 아이폰 | 안드로이드 (이 앱) |
|---|---|---|
| 게임 화면 | WKWebView | WebView. `assets/shim.js` 가 `window.webkit.messageHandlers` 를 똑같이 만들어 게임 코드는 그대로 |
| 진동 (haptic, hum) | Taptic | Vibrator |
| 권한 (perm, loc) | 동작·위치·건강·알림 | 신체 활동·위치·알림 (건강은 아직 없음 → 늘 'ok') |
| 걸음으로 알 줍기 | CMPedometer + 위치 변경으로 깨어남 | 걸음 수 센서 + 15분마다 WorkManager. 보폭 72cm 로 거리 계산 |
| 알 주운 곳 이름 | 애플 지도 + 카카오 | 안드로이드 주소 찾기 + 카카오 (비밀 변수 `KAKAO_KEY`) |
| 알·부화·진화 알림 | 로컬 알림 | 로컬 알림 |
| 친구·계정·랭킹 (friends) | CloudKit | **아직 없음** → 게임이 앱이 아닌 것처럼 숨김. 공용 서버로 옮긴 뒤 추가 |
| 애플워치·건강 앱 운동 | 있음 | 없음 (나중에 Health Connect) |

## 비밀 변수 (GitHub 저장소 Settings › Secrets and variables › Actions)

- `KAKAO_KEY`: 카카오 REST API 키 (아이폰 `native/PokeGrow/kakao-key.txt` 와 같은 값). 없으면 동네 이름까지만 나옵니다.

## 서명

`app/dev.keystore` 는 친구들끼리 APK 로 나눠 쓰는 개발용 키입니다 (비밀번호 `pokegrow`).
플레이 스토어에 올릴 땐 새 업로드 키를 만들어 비밀 변수로 넣습니다:
`ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASS`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASS` (build.gradle.kts 참고).

## 내 컴퓨터에서 빌드

Android Studio 로 `android/` 폴더를 열고 ▶ 실행. 카카오 키는 `android/kakao-key.txt` 에 한 줄 (gitignore 됨).
