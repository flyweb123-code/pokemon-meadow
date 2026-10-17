# 포켓런닝 아이폰 앱 + 애플워치 앱

- **아이폰 앱:** 포켓런닝 게임을 화면 가득 띄워요. 홈 화면 웹앱과 달리 하단 빈칸이 없어요.
- **워치 앱:** 알 현황을 보여 주고, '런닝 시작'으로 운동을 기록해요. '끝내기'를 누르면 달린 거리가 아이폰 앱으로 가서 알과 짝꿍에게 쌓여요.

## Mac 에서 처음 한 번 설치하기

1. **Xcode 준비**
   - App Store 에서 Xcode 를 설치하고 한 번 실행해요. 추가 구성요소 설치를 물으면 iOS 와 watchOS 를 모두 골라요.
   - Xcode › Settings › Accounts 에서 + 를 눌러 Apple ID 로 로그인해요.
2. **터미널에서 프로젝트 만들기**
   ```sh
   # Homebrew 가 없으면 먼저 설치 (https://brew.sh 의 한 줄 명령)
   brew install xcodegen
   git clone https://github.com/flyweb123-code/pokemon-meadow.git
   cd pokemon-meadow/native
   xcodegen
   open PokeRun.xcodeproj
   ```
3. **서명**
   - 왼쪽에서 PokeRun 프로젝트를 누르고, TARGETS 의 **PokeRun** 과 **PokeRunWatch** 각각에서 Signing & Capabilities › Team 을 내 이름(Personal Team)으로 골라요.
   - 'bundle identifier 를 쓸 수 없다'고 나오면 `project.yml` 의 `com.flyweb123` 을 다른 글자로 바꾸고 `xcodegen` 을 다시 실행해요.
4. **아이폰·워치 준비**
   - 아이폰을 케이블로 Mac 에 연결하고 '이 컴퓨터를 신뢰'를 눌러요.
   - 아이폰: 설정 › 개인정보 보호 및 보안 › **개발자 모드** 켜기 (재시동).
   - 워치: 설정 › 개인정보 보호 및 보안 › **개발자 모드** 켜기.
5. **설치**
   - Xcode 위쪽에서 스킴 **PokeRun**, 기기는 내 아이폰을 골라 ▶ 를 눌러요.
   - 아이폰에서 '신뢰하지 않는 개발자'가 뜨면: 설정 › 일반 › VPN 및 기기 관리 › 내 Apple ID › 신뢰.
   - 워치 앱은 보통 자동으로 깔려요. 안 깔리면 스킴을 **PokeRunWatch**, 기기를 내 워치로 바꿔 ▶ 를 한 번 더 눌러요.
6. **저장 옮기기**: 홈 화면 웹앱의 설정 › 저장 복사 → 새 포켓런닝 앱의 설정 › 저장 붙여넣기.

무료 Apple ID 로 설치하면 7일 뒤 앱이 열리지 않아요. 그때 Mac 에서 ▶ 를 다시 누르면 돼요 (저장은 그대로).
무료 계정은 Xcode 가 직접 본 기기에만 설치할 수 있어서, 워치가 Xcode 에 안 잡히면 워치 앱이 'could not be installed' 로 실패해요.

## 유료 계정 + TestFlight 로 설치하기 (권장)

워치를 Xcode 에 연결하지 않아도 되고, 빌드 하나가 90일 가요.

1. developer.apple.com/programs 에서 Apple Developer Program 가입 → 승인 메일 기다리기.
2. 터미널에서 최신 코드 받기: `cd pokemon-meadow && git pull && cd native && xcodegen`
3. Xcode › Settings › Accounts 에서 유료 팀이 보이는지 확인. PokeRun, PokeRunWatch 두 타깃의 Signing › Team 을 유료 팀으로 바꿔요.
4. appstoreconnect.apple.com › 앱 › + › 신규 앱: 플랫폼 iOS, 이름 '포켓런닝'(이미 있으면 '포켓런닝 경완' 처럼), 번들 ID `com.flyweb123.pokerun`, SKU 아무 글자.
   - 번들 ID 가 목록에 없으면 Xcode 에서 한 번 빌드(▶)하면 생겨요.
5. Xcode 위쪽 기기를 **Any iOS Device (arm64)** 로 고르고 **Product › Archive**.
6. 끝나면 열리는 Organizer 에서 **Distribute App › TestFlight Internal Only** › Upload.
7. 10~30분 뒤 App Store Connect › 포켓런닝 › TestFlight 에 빌드가 뜨면, '내부 테스트' 그룹을 만들고 내 Apple ID 를 넣어요.
8. 아이폰에 **TestFlight** 앱(App Store)을 깔고 포켓런닝 설치. 워치 앱은 Watch 앱 › 설치 가능한 앱에서 설치(또는 자동).
9. 다음 업데이트 때는 project.yml 의 `CURRENT_PROJECT_VERSION` 숫자를 1 올리고 `xcodegen` → 5~6 반복.

## 쓰는 법

- 워치에서 포켓런닝 › **런닝 시작**. 화면이 꺼져도 계속 기록돼요.
- 다 달리면 **끝내기**. 거리가 아이폰으로 가고, 아이폰에서 포켓런닝을 열면 알에 쌓이고 부화도 거기서 일어나요.
- 운동 기록은 건강 앱에도 '달리기'로 남아요.

## 알림 (2026-10-17)

- 알을 주웠을 때, 알이 부화할 준비가 됐을 때, 짝꿍이 진화할 준비가 됐을 때 진동과 함께 알림이 와요. 서버 없이 앱 안에서 띄우는 알림이에요 (`PokeRun/NotiCenter.swift`).
- 새로 빌드한 앱을 처음 열면 알림 허용을 물어봐요. 나중에 바꾸려면 아이폰 설정 › 알림 › 포켓런닝.
- 게임 설정 › 알림에서 전체 끄기, 항목별 켜고 끄기를 할 수 있어요.
- 앱 화면이 꺼져 있을 때만 알림이 와요. 앱이 켜져 있으면 게임 알림창과 진동만 울려요.
- 화면이 꺼져 있으면 iOS 가 앱을 가끔(약 500m 움직일 때, 걷는 중이면 250m마다) 깨우기 때문에 알림이 조금 늦게 올 수 있어요.
- `NotiCenter.swift` 파일이 새로 생겼으니 Mac 에서 `xcodegen` 을 다시 실행한 뒤 빌드해 주세요.
