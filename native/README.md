# 포켓몬 키우기 아이폰 앱 + 애플워치 앱

- **아이폰 앱:** 포켓몬 키우기 게임을 화면 가득 띄워요. 홈 화면 웹앱과 달리 하단 빈칸이 없어요.
- **워치 앱:** 알 현황을 보여 주고, '런닝 시작'으로 운동을 기록해요. '끝내기'를 누르면 달린 거리가 아이폰 앱으로 가서 알과 짝꿍에게 쌓여요.

영어 이름은 PokeGrow 예요 (2026-10-18 PokeRun 에서 바꿈). 번들 ID `com.flyweb123.pokerun` 은 앱 안 저장과 TestFlight 앱을 지키려고 그대로 둬요.

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
   open PokeGrow.xcodeproj
   ```
3. **서명**
   - 왼쪽에서 PokeGrow 프로젝트를 누르고, TARGETS 의 **PokeGrow** 과 **PokeGrowWatch** 각각에서 Signing & Capabilities › Team 을 내 이름(Personal Team)으로 골라요.
   - 'bundle identifier 를 쓸 수 없다'고 나오면 `project.yml` 의 `com.flyweb123` 을 다른 글자로 바꾸고 `xcodegen` 을 다시 실행해요.
4. **아이폰·워치 준비**
   - 아이폰을 케이블로 Mac 에 연결하고 '이 컴퓨터를 신뢰'를 눌러요.
   - 아이폰: 설정 › 개인정보 보호 및 보안 › **개발자 모드** 켜기 (재시동).
   - 워치: 설정 › 개인정보 보호 및 보안 › **개발자 모드** 켜기.
5. **설치**
   - Xcode 위쪽에서 스킴 **PokeGrow**, 기기는 내 아이폰을 골라 ▶ 를 눌러요.
   - 아이폰에서 '신뢰하지 않는 개발자'가 뜨면: 설정 › 일반 › VPN 및 기기 관리 › 내 Apple ID › 신뢰.
   - 워치 앱은 보통 자동으로 깔려요. 안 깔리면 스킴을 **PokeGrowWatch**, 기기를 내 워치로 바꿔 ▶ 를 한 번 더 눌러요.
6. **저장 옮기기**: 홈 화면 웹앱의 설정 › 저장 복사 → 새 포켓몬 키우기 앱의 설정 › 저장 붙여넣기.

무료 Apple ID 로 설치하면 7일 뒤 앱이 열리지 않아요. 그때 Mac 에서 ▶ 를 다시 누르면 돼요 (저장은 그대로).
무료 계정은 Xcode 가 직접 본 기기에만 설치할 수 있어서, 워치가 Xcode 에 안 잡히면 워치 앱이 'could not be installed' 로 실패해요.

## 유료 계정 + TestFlight 로 설치하기 (권장)

워치를 Xcode 에 연결하지 않아도 되고, 빌드 하나가 90일 가요.

1. developer.apple.com/programs 에서 Apple Developer Program 가입 → 승인 메일 기다리기.
2. 터미널에서 최신 코드 받기: `cd pokemon-meadow && git pull && cd native && xcodegen`
3. Xcode › Settings › Accounts 에서 유료 팀이 보이는지 확인. PokeGrow, PokeGrowWatch 두 타깃의 Signing › Team 을 유료 팀으로 바꿔요.
4. appstoreconnect.apple.com › 앱 › + › 신규 앱: 플랫폼 iOS, 이름 '포켓몬 키우기'(이미 있으면 '포켓몬 키우기 경완' 처럼), 번들 ID `com.flyweb123.pokerun`, SKU 아무 글자.
   - 번들 ID 가 목록에 없으면 Xcode 에서 한 번 빌드(▶)하면 생겨요.
5. Xcode 위쪽 기기를 **Any iOS Device (arm64)** 로 고르고 **Product › Archive**.
6. 끝나면 열리는 Organizer 에서 **Distribute App › TestFlight Internal Only** › Upload.
7. 10~30분 뒤 App Store Connect › 포켓몬 키우기 › TestFlight 에 빌드가 뜨면, '내부 테스트' 그룹을 만들고 내 Apple ID 를 넣어요.
8. 아이폰에 **TestFlight** 앱(App Store)을 깔고 포켓몬 키우기 설치. 워치 앱은 Watch 앱 › 설치 가능한 앱에서 설치(또는 자동).
9. 다음 업데이트 때는 project.yml 의 `CURRENT_PROJECT_VERSION` 숫자를 1 올리고 `xcodegen` → 5~6 반복.

## Xcode Cloud 로 자동 업로드 (2026-10-30)

`native/` 를 바꾼 커밋이 main 에 올라가면 애플 서버가 빌드해서 TestFlight 에 올려요. Mac 에서 Archive 할 필요가 없어요.
`ci_scripts/ci_post_clone.sh` 가 xcodegen 실행, 빌드 번호(= Xcode Cloud 빌드 번호) 설정, 카카오 키 넣기를 해요.

처음 한 번만 Xcode 에서 설정해요 (Report navigator ⌘9 › Cloud 탭 › 워크플로 Default 오른쪽 클릭 › Edit Workflow).
1. **General**: Repository 는 이 저장소, Project or Workspace 는 `native/PokeGrow.xcodeproj` 그대로.
2. **Environment**: 환경 변수에 `KAKAO_KEY` = 카카오 REST API 키, Secret 체크.
3. **Start Conditions**: Branch Changes › Branch `main`, Files and Folders › `native` 폴더만 (게임 패치마다 빌드되지 않게).
4. **Actions**: Build 를 지우고 + › **Archive** › Platform iOS, Deployment Preparation **TestFlight (Internal Testing Only)**.
5. **Post-Actions**: + › **TestFlight Internal Testing** › 친구들 그룹.
6. 저장 후 Start Build 로 한 번 돌려 보기.

Xcode Cloud 는 개발자 계정에 한 달 25시간 무료 (빌드 한 번 10~20분).

## 친구 서버: CloudKit (2026-10-30, 베타)

게임 베타 판의 프로필 › 친구 (친구 코드·이번 주 걸음 랭킹·알 선물·친구 체육관 도전)는 iCloud 공개 DB 를 쓴다 (`PokeGrow/FriendServer.swift`).
앱 안에서만 보이고, 친구도 아이폰 설정에서 iCloud 에 로그인돼 있어야 한다. 처음 한 번 아래를 해 둔다.

1. developer.apple.com › Certificates, Identifiers & Profiles › Identifiers › 오른쪽 위 필터를 **iCloud Containers** 로 바꾸고 + → `iCloud.com.flyweb123.pokerun` 만들기.
2. Identifiers › `com.flyweb123.pokerun` (App ID) › **iCloud** 체크 → Edit/Configure 에서 방금 만든 컨테이너 선택 → Save.
3. icloud.developer.apple.com (CloudKit Console) › 그 컨테이너 › **Development** › Schema › Record Types › + → 이름 `Trainer`, 필드 세 개 → Save.
   - `card` (String)
   - `wk` (String) — 이번 주 월요일 (전체 랭킹 거르기)
   - `wkm` (Double) — 이번 주 걸은 km (전체 랭킹 순서)
   그다음 Schema › Indexes › `Trainer` 에 인덱스 두 개 추가: `wk` **Queryable**, `wkm` **Sortable** → Save.
4. 같은 화면 왼쪽 아래 **Deploy Schema Changes…** → Production 으로 배포 (TestFlight 앱은 Production DB 를 쓴다).
5. 이 PR 을 합친 뒤 Xcode Cloud 빌드가 TestFlight 에 올라오면 끝. 1·2 를 안 하면 서명 단계에서 빌드가 실패한다.

카드에 항목(대표 포켓몬 등)을 더해도 `card` 하나에 JSON 으로 들어가서 스키마를 다시 배포할 필요가 없다. 3단계 필드가 하나라도 빠지면 카드 올리기가 실패한다.

### 도감 랭킹·미니게임 랭킹 (11.80)

CloudKit Console › **Development** › Schema 에서 아래를 더하고, 다시 **Deploy Schema Changes…** 로 Production 에 배포한다.

1. Record Types › `Trainer` › 필드 추가: `dex` (Int(64)) — 도감에 등록한 포켓몬 수.
   Indexes › `Trainer` 에 `dex` **Queryable**, `dex` **Sortable** 두 줄 추가.
2. Record Types › + → 이름 `Score` (미니게임 최고 기록, 게임마다 한 사람 한 개), 필드 세 개:
   - `game` (String) — 게임 id (`jump` = 장애물 넘기)
   - `best` (Double) — 최고 점수
   - `card` (String) — 이름·성별·기록 낸 포켓몬 (JSON)
   Indexes › `Score` 에 `game` **Queryable**, `best` **Queryable**, `best` **Sortable** 추가.
3. Deploy Schema Changes… → Production.

1번을 안 해도 걸음 랭킹·친구는 그대로 되고(앱이 dex 없이 다시 올린다) 도감 랭킹만 비어 있다. 2번을 안 하면 미니게임 랭킹 자리에 '설정이 아직 덜 됐어요' 가 뜬다.

## 쓰는 법

- 워치에서 포켓몬 키우기 › **런닝 시작**. 화면이 꺼져도 계속 기록돼요.
- 다 달리면 **끝내기**. 거리가 아이폰으로 가고, 아이폰에서 포켓몬 키우기을 열면 알에 쌓이고 부화도 거기서 일어나요.
- 운동 기록은 건강 앱에도 '달리기'로 남아요.

## 알림 (2026-10-17)

- 알을 주웠을 때, 알이 부화할 준비가 됐을 때, 짝꿍이 진화할 준비가 됐을 때 진동과 함께 알림이 와요. 서버 없이 앱 안에서 띄우는 알림이에요 (`PokeGrow/NotiCenter.swift`).
- 새로 빌드한 앱을 처음 열면 알림 허용을 물어봐요. 나중에 바꾸려면 아이폰 설정 › 알림 › 포켓몬 키우기.
- 게임 설정 › 알림에서 전체 끄기, 항목별 켜고 끄기를 할 수 있어요.
- 앱 화면이 꺼져 있을 때만 알림이 와요. 앱이 켜져 있으면 게임 알림창과 진동만 울려요.
- 화면이 꺼져 있으면 iOS 가 앱을 가끔(약 500m 움직일 때, 걷는 중이면 250m마다) 깨우기 때문에 알림이 조금 늦게 올 수 있어요.
- `NotiCenter.swift` 파일이 새로 생겼으니 Mac 에서 `xcodegen` 을 다시 실행한 뒤 빌드해 주세요.

## 출현 지역 (2026-10-18)

- 앱이 걸은 곳 좌표를 게임에 같이 보냅니다(`window.pokeRunWalk(km, 장소, 태그, 위도, 경도)`). 작업실 › 알 › 출현 지역 지도에 놓은 포켓몬 반경 안이면 그 포켓몬 알이 더 잘 나와요.
- 새 파일은 없어서 `xcodegen` 없이 Xcode 에서 다시 빌드만 하면 됩니다.

## 알 주운 곳 이름: 카카오 지도 (2026-10-20)

한국에서는 애플 지도가 주변 장소 목록을 주지 않아서, 알 주운 곳 이름을 카카오 지도로 찾아요. 키가 없으면 예전처럼 애플 지도 낱말 검색으로 찾아요.

1. developers.kakao.com 로그인 › 내 애플리케이션 › 애플리케이션 추가하기 (이름 아무거나).
2. 만든 앱 › 앱 설정 › 앱 키 에서 **REST API 키** 복사.
3. 같은 앱 › 제품 설정 › **카카오맵** › 사용 설정 ON (꺼져 있으면 장소 검색이 403 으로 막혀요).
4. Mac 터미널 (키 자리에 붙여 넣기):
   `echo '키' > ~/pokemon-meadow/native/PokeGrow/kakao-key.txt && cd ~/pokemon-meadow && git pull && cd native && xcodegen && open PokeGrow.xcodeproj`
5. Xcode 에서 다시 빌드. 설정 › 운영자 › 장소 찾기 시험에 '카카오:' 줄이 나오면 연결된 거예요.

- `kakao-key.txt` 는 `.gitignore` 에 있어 저장소(공개)에 올라가지 않아요. 앱 안에만 들어가요.
- 고르는 순서 (v5.66): 그 자리 건물 이름 → 1.5km 안 가장 가까운 곳(종류 상관없이). 알 테마는 고른 장소 하나로만 정해요.
