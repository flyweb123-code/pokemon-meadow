# 포켓몬 키우기 친구 서버 (Cloudflare Workers + D1)

아이폰 앱의 CloudKit 친구 서버(`native/PokeGrow/FriendServer.swift`)와 같은 일을 아이폰·안드로이드 모두를 위해 합니다:
트레이너 카드·친구·랭킹(`trainer`), 미니게임 기록·친구 요청(`score`), 계정(`account`), 저장(`save`), 공지(`notice`).
무료 요금제(하루 요청 10만 번, D1 5GB)로 충분합니다. 카드 등록 필요 없음.

## 처음 한 번 (경완)

1. https://dash.cloudflare.com/sign-up 에서 가입 (이메일 인증).
2. 계정 ID: 대시보드 오른쪽 아래(또는 Workers & Pages 화면 오른쪽) **Account ID** 복사.
3. API 토큰: 오른쪽 위 사람 아이콘 › **My Profile › API Tokens › Create Token** › **Edit Cloudflare Workers** 템플릿 ›
   Account Resources = 내 계정, Zone Resources = All zones › 맨 아래 Continue › Create Token › 토큰 복사.
   그리고 같은 토큰 편집에서 권한 한 줄 추가: **Account › D1 › Edit**.
4. GitHub 저장소 › Settings › Secrets and variables › Actions › New repository secret 로 두 개:
   - `CLOUDFLARE_ACCOUNT_ID` = 2번 값
   - `CLOUDFLARE_API_TOKEN` = 3번 값
5. 처음 workers.dev 를 쓰면 Workers & Pages 화면에서 하위 도메인(예: `flyweb`)을 정하라고 할 수 있어요 → 아무거나.
6. Actions › **Friend server** › Run workflow. 끝나면 Deploy 단계 로그에 `https://pokegrow.<하위도메인>.workers.dev` 주소가 나옵니다.

그 주소를 `config/server.json` 에 넣으면(Claude 가 함) 안드로이드 앱이 친구·계정 기능을 켭니다.

## 요청 형식

`POST /v1` `{op, dev, ...}` → `{ok:true, v}` 또는 `{ok:false, err}`. op 는 아이폰과 같음
(me, publish, get, top, score, mgtop, notice, acctNew, acctLogin, acctSave, acctPull, acctDel) + news, acctSalt.
- `dev` = 기기 비밀값. 친구 코드는 서버가 `SHA256(dev)` 로 계산 (아이폰은 dev = iCloud 사용자 ID → 지금 코드 그대로).
- 비밀번호는 보내지 않음: 기기가 `acctSalt` 로 소금을 받아 2만 번 해시(ph)와 `k = sha("pkgk:id:pw")` 를 보냄.

## 내 컴퓨터에서 시험

```
cd server && npm install
npx wrangler d1 execute pokegrow --local --file schema.sql
npx wrangler dev
```

## CloudKit 에서 옮기기 (아이폰 전환)

`server/ck2cf.mjs` 가 CloudKit 공개 DB 의 Account·Save·Trainer·Score(미니게임 역대·이번 주, 친구 요청)를 읽어
`POST /admin/import` (헤더 `Authorization: Bearer <ADMIN_TOKEN>`) 로 넣습니다. 이미 있는 것보다 새 기록만 덮어써서 여러 번 돌려도 안전합니다.
GitHub Actions › **Migrate CloudKit to friend server** › Run workflow (비밀 변수 `CLOUDKIT_API_TOKEN`, `SERVER_ADMIN_TOKEN` 필요).
아이폰 새 빌드가 친구들 폰에 깔리기 전까지 예전 빌드는 CloudKit 에 쓰므로, 다 바뀐 뒤 한 번 더 돌리면 됩니다.
옮겨 온 계정은 처음 로그인(또는 저장 서명 확인) 때 k 확인값이 채워집니다.

## 친구 필드 놀러가기 (베타, v14.99~)

필드(주인 친구 코드)마다 방 하나 = Durable Object `FieldRoom` (`src/room.js`, 무료 요금제 SQLite 저장소). `wrangler.toml` 의 `[[migrations]] new_sqlite_classes` 로 처음 배포 때 만들어집니다.

- `POST /v1 {op:'fieldPut', data, fr}` — 주인이 없을 때 보여 줄 내 필드(저장 모양 JSON)와 들어올 수 있는 친구 코드. D1 `field` 표.
- `POST /v1 {op:'visitTicket', to}` → `{t, me}` — 방에 들어갈 2분짜리 표. 내 방이거나, 그 방 주인의 친구 목록(fr)에 내가 있어야 함. 서명 열쇠는 처음 한 번 만들어 D1 `kv` 표에 둠 (비밀 변수 따로 없음).
- `GET /room/<주인코드>?t=<표>` (WebSocket) — 채팅(최근 50개 = 방명록), 트레이너 자리, 주인 포켓몬 자리(주인 기기가 손님 있을 때 0.3초마다), 손님이 한 쓰다듬기·열매(주인이 없으면 모아 뒀다가 들어올 때). 말 모양은 `src/room.js` 맨 위 설명.

게임은 표만 친구 창구(frAsk)로 받고 WebSocket 은 게임 페이지가 직접 엽니다 → 아이폰·안드로이드 앱 새 빌드가 필요 없습니다.

## 푸시 알림 (친구가 내 필드에 놀러 오면, 2026-11-03)

주인이 게임을 켜 두지 않았을 때 친구가 필드에 들어오면, 주인 폰에 "친구가 놀러 왔어요!" 푸시가 간다 (같은 친구는 30분에 한 번).
앱이 푸시 토큰을 `pushReg` 로 맡기고 (게임 설정 › 알림 › '친구가 내 필드에 놀러 왔을 때', 베타), 방(room.js)이 `push.js` 로 애플·구글에 보낸다.

GitHub 저장소 비밀 변수 (Settings › Secrets and variables › Actions). 넣은 뒤 Actions › Friend server 를 한 번 실행하면 서버에 들어간다.

| 비밀 변수 | 어디서 |
|---|---|
| `APNS_KEY` | developer.apple.com › Certificates, IDs & Profiles › Keys › + › Apple Push Notifications service (APNs) 체크 → 받은 `.p8` 파일 내용 전체 |
| `APNS_KEY_ID` | 그 키 화면의 Key ID (10글자) |
| `APNS_TEAM_ID` | developer.apple.com › Membership details 의 Team ID (10글자) |
| `FCM_SA` | console.firebase.google.com 에서 프로젝트 만들기 → 프로젝트 설정 › 서비스 계정 › 새 비공개 키 생성 → 받은 JSON 내용 전체 |
| `GOOGLE_SERVICES_JSON` | 같은 Firebase 프로젝트 › 프로젝트 설정 › 일반 › 앱 추가 › Android, 패키지 이름 `com.flyweb123.pokerun` → 받은 `google-services.json` 내용 전체 (안드로이드 APK 빌드에 씀) |

아이폰은 App ID 에 Push Notifications 가 이미 켜져 있다 (aps-environment). 앱은 새로 빌드해야 한다 (Xcode Cloud).

## 밸런스 기록 (체육관·미니게임, 2026-11-05)

게임이 판마다 작은 기록을 `pk-bal`(localStorage)에 모았다가 `POST /v1 {op:'balLog', ev:[{k,t,v,d}]}` 로 50개씩 보낸다 (앱에서만). D1 `bal` 표, 120일 지나면 지움.

- `gym` 관장 배틀: c(chal·named·boss) df 난이도 bs 심사 등급 gr 관장 등급 w 승 q 기권 tn 턴 gd 골드 rp 평판 stk 연승 ma/mx/mn 내 라인업 평균·최고 레벨·마리 fa/fn 상대 평균 레벨·마리 sp 내 포켓몬
- `sf` 트레이너: w 막음 df n 나선 트레이너 수 gd 골드 cl/sl 도전자·트레이너 평균 레벨
- `mg` 미니게임: sc 점수 gd 골드 t 초 ph 단계 cm 최대 콤보 ab 기술 타입 rk 랭크 sp fh 하트 nb 최고 기록 day 오늘 미니게임 골드
- `gold` 골드 (v18.73, 하루 한 줄, 날짜 바뀐 뒤 올라옴): day YYYYMMDD b0 그날 시작 잔액 b1 끝 잔액 ern 번 골드(addGold 합, 체육관 포함) sp {item·field·fit·bgm·gym·wage: 쓴 골드} it {산 것 id: 횟수}

매주 월요일 07:13 KST `.github/workflows/bal-report.yml` → `tools/bal-report.mjs` 가 지난 7일을 모아 'auto-bal' 이슈로 올린다 (친구 코드 없이 사람 수만). 로컬 시험: `node tools/bal-report.mjs --dry rows.json`.
