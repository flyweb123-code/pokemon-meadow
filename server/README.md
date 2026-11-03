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

## CloudKit 에서 옮기기 (아이폰 전환 때)

`POST /admin/import` (헤더 `Authorization: Bearer <SERVER_ADMIN_TOKEN>`) `{table, rows}` 로 trainer·score·account·save 를 넣습니다.
옮겨 온 계정은 처음 로그인(또는 저장 서명 확인) 때 k 확인값이 채워집니다.
