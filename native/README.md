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

## 쓰는 법

- 워치에서 포켓런닝 › **런닝 시작**. 화면이 꺼져도 계속 기록돼요.
- 다 달리면 **끝내기**. 거리가 아이폰으로 가고, 아이폰에서 포켓런닝을 열면 알에 쌓이고 부화도 거기서 일어나요.
- 운동 기록은 건강 앱에도 '달리기'로 남아요.
