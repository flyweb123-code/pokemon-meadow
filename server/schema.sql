-- 포켓몬 키우기 친구 서버 (Cloudflare D1). 여러 번 실행해도 안전하게 IF NOT EXISTS.
-- 트레이너 카드 (아이폰 CloudKit Trainer "T_"+코드)
CREATE TABLE IF NOT EXISTS trainer (
  code TEXT PRIMARY KEY,
  card TEXT NOT NULL,
  wk   TEXT NOT NULL DEFAULT '',
  wkm  REAL NOT NULL DEFAULT 0,
  dex  INTEGER NOT NULL DEFAULT 0,
  at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS trainer_wk ON trainer (wk, wkm DESC);
CREATE INDEX IF NOT EXISTS trainer_dex ON trainer (dex DESC);

-- 미니게임 기록·친구 요청 (CloudKit Score "S_"+코드+"_"+게임)
CREATE TABLE IF NOT EXISTS score (
  code TEXT NOT NULL,
  game TEXT NOT NULL,
  best REAL NOT NULL,
  card TEXT NOT NULL,
  at   INTEGER NOT NULL,
  PRIMARY KEY (code, game)
);
CREATE INDEX IF NOT EXISTS score_game ON score (game, best DESC);

-- 계정 (CloudKit Account "A_"+아이디). pwh = 소금$해시(기기에서 계산), kh = sha(k) (처음 로그인·저장 때 채움)
CREATE TABLE IF NOT EXISTS account (
  id   TEXT PRIMARY KEY,
  pwh  TEXT NOT NULL,
  kh   TEXT,
  code TEXT NOT NULL DEFAULT '',
  dev  TEXT,
  at   INTEGER NOT NULL
);

-- 저장 (CloudKit Save "V_"+아이디+"_"+코드). 큰 저장은 1MB 조각(save_part)으로 나눈다 (D1 한 칸 한도 2MB)
CREATE TABLE IF NOT EXISTS save (
  acct  TEXT NOT NULL,
  code  TEXT NOT NULL,
  sig   TEXT NOT NULL,
  saved REAL NOT NULL DEFAULT 0,
  parts INTEGER NOT NULL,
  at    INTEGER NOT NULL,
  PRIMARY KEY (acct, code)
);
CREATE TABLE IF NOT EXISTS save_part (
  acct TEXT NOT NULL,
  code TEXT NOT NULL,
  i    INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (acct, code, i)
);

-- 운영자 공지 (CloudKit Notice)
CREATE TABLE IF NOT EXISTS notice (
  n     INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body  TEXT NOT NULL,
  at    INTEGER NOT NULL
);

-- 친구 필드 놀러가기 (베타, 2026-11-03). 주인이 없을 때 보여 줄 마지막 필드와, 들어올 수 있는 친구 코드 목록(fr, 쉼표)
CREATE TABLE IF NOT EXISTS field (
  code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  fr   TEXT NOT NULL DEFAULT '',
  at   INTEGER NOT NULL
);

-- 서버 혼자 쓰는 값 (놀러가기 표 서명 열쇠 등)
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

-- 진짜 푸시 (2026-11-03): 기기 푸시 토큰. kinds = 켜 둔 알림 종류 (쉼표, 예: visit)
CREATE TABLE IF NOT EXISTS push (
  tok   TEXT PRIMARY KEY,
  code  TEXT NOT NULL,
  plat  TEXT NOT NULL,
  env   TEXT NOT NULL DEFAULT 'prod',
  kinds TEXT NOT NULL DEFAULT '',
  at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS push_code ON push (code);

-- 게임 오류 보고 (2026-11-04): 오류 창이 뜬 오류. k = 메시지+위치 해시, n 횟수, codes 겪은 친구 코드(쉼표, 50개까지), ctx 마지막 상황(JSON)
-- st: 0 새로 들어옴, 1 GitHub 이슈로 올림, 2 고침 (고친 뒤 다시 나면 0)
CREATE TABLE IF NOT EXISTS err (
  k      TEXT PRIMARY KEY,
  msg    TEXT NOT NULL,
  where_ TEXT NOT NULL DEFAULT '',
  ver    TEXT NOT NULL DEFAULT '',
  beta   INTEGER NOT NULL DEFAULT 0,
  ctx    TEXT NOT NULL DEFAULT '',
  n      INTEGER NOT NULL DEFAULT 1,
  codes  TEXT NOT NULL DEFAULT '',
  at0    INTEGER NOT NULL,
  at     INTEGER NOT NULL,
  st     INTEGER NOT NULL DEFAULT 0,
  issue  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS err_st ON err (st);

-- 밸런스 기록 (2026-11-05 경완 '체육관 배틀이랑 미니게임은 유저들 로그 수집해서 주기적으로 밸런스 체크'). 한 판마다 한 줄.
-- kind: gym (관장 배틀), sf (트레이너가 도전자를 막음/짐), mg (미니게임). d = 그 판 숫자들(JSON). 120일 지난 줄은 서버가 지운다
-- 매주 .github/workflows/bal-report.yml 이 모아서 'auto-bal' 이슈로 올린다 (친구 코드 없이 사람 수만)
CREATE TABLE IF NOT EXISTS bal (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  kind TEXT NOT NULL,
  ver  TEXT NOT NULL DEFAULT '',
  beta INTEGER NOT NULL DEFAULT 0,
  t    INTEGER NOT NULL,
  at   INTEGER NOT NULL,
  d    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bal_t ON bal (kind, t);

-- 서버 계정 자동 백업 (2026-11-10 경완 '자동 백업이 기기에도 저장되고 서버 계정에도'). 계정마다 칸(slot):
--   dYYYY-MM-DD = 그날(한국 시간) 첫 저장 14일, p시각 = 도감·박스가 갑자기 줄기 직전 저장 5개. 조각은 bak_part (save_part 와 같은 모양)
-- dex·box·gold 는 기기가 보낸 요약 (서버는 큰 저장을 풀어 보지 않는다, CPU 한도)
CREATE TABLE IF NOT EXISTS bak (
  acct  TEXT NOT NULL,
  slot  TEXT NOT NULL,
  code  TEXT NOT NULL,
  sig   TEXT NOT NULL,
  saved REAL NOT NULL DEFAULT 0,
  dex   INTEGER NOT NULL DEFAULT 0,
  box   INTEGER NOT NULL DEFAULT 0,
  gold  INTEGER NOT NULL DEFAULT 0,
  parts INTEGER NOT NULL,
  at    INTEGER NOT NULL,
  PRIMARY KEY (acct, slot)
);
CREATE TABLE IF NOT EXISTS bak_part (
  acct TEXT NOT NULL,
  slot TEXT NOT NULL,
  i    INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (acct, slot, i)
);
-- 계정마다 마지막으로 올린 저장 요약 (갑자기 줄었는지 보려고)
CREATE TABLE IF NOT EXISTS acct_sum (
  acct TEXT PRIMARY KEY,
  dex  INTEGER NOT NULL DEFAULT 0,
  box  INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 0,
  at   INTEGER NOT NULL
);
