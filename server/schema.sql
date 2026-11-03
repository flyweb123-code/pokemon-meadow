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
