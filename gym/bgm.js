/* 체육관 BGM (2026-10-27 경완: "저 저장소에서 자동으로 다운 받아지게 해줘")
   플래티넘 원본 소리 데이터(pret/pokeplatinum 의 sound_data.sdat)에서 곡·악기·소리 조각만 바이트 범위로 받아
   이 기기(IndexedDB pk-music)에 넣어 두고, gym/sseq.js(DS 소리 엔진)로 일꾼에서 연주해 튼다. 저장소엔 곡 파일을 올리지 않는다.
   소리 크기는 설정 › 배경 음악 볼륨을 그대로 따른다(필드 곡과 같은 통로). */
(function () {
'use strict';
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
// 커밋을 고정해 두어 바이트 위치가 바뀌지 않는다
const SRC = 'https://raw.githubusercontent.com/pret/pokeplatinum/6eeb1b04c6433761f3049811b7e1383619c59743/res/prebuilt/data/sound/sound_data.sdat';
const SDAT_SIZE = 7484768;
// v16.89 경완 '다른 저장소에서 해당 버전 시그니처 bgm': 성도·관동 트레이너 곡은 하트골드 원본 소리 데이터(pret/pokeheartgold, 커밋 고정)에서
const SRCS = { pt: [SRC, SDAT_SIZE], hg: ['https://raw.githubusercontent.com/pret/pokeheartgold/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/files/data/sound/gs_sound_data.sdat', 8660096] };
// [시작 바이트, 길이]
const PART = {
  wBasic: [6573184, 458564], wField: [7031776, 30836], wBattle: [7062624, 33656],
  bField: [1628096, 3984], bBattle: [1632096, 3820],
  sGym: [829664, 8876], sBaGym: [987488, 13836], sBaTrain: [1013312, 8996], sBaRival: [1067936, 8272], sBaChamp: [1048928, 11672], sEyeElite: [941696, 6000], sEyeChamp: [964096, 6632],
  sLab: [838560, 3556],
  sDendo: [791296, 5100],   // v18.93 SEQ_BLD_DENDO 전당 (전설 알 지급 전당 등록 연출, 경완 '전당 등록처럼 웅장하게')
  sLeague: [784384, 6912], bDungeon: [1635936, 3948], wDungeon: [7096288, 34312],   // SEQ_D_LEAGUE 포켓몬리그 (승급 심사 화면, 경완 2026-11-04 'bgm 웅장하게')
  sTsure: [1160800, 5228],   // SEQ_TSURETEKE 같이 걷는 곡 (친밀도 만점 창, 경완 2026-10-31)   // SEQ_KENKYUJO 연구소 (튜토리얼, 경완 2026-10-29)
  sWinTrain: [1084160, 4204], sWinGym: [1088384, 7584],
  sBaTenno: [1133088, 13836], sEyeTenno: [959232, 4864], sTheRiv: [1166048, 9000], sWinTenno: [1111328, 3036], sWinChamp: [1095968, 7220],   // v16.88 경완 '이름 있는 트레이너 시그니처 bgm': 사천왕 배틀·등장, 용식 테마, 사천왕·챔피언 승리
  // 효과음: 배틀·기본 효과음 악보 묶음(gym/se.json 의 block), 악기, 소리 묶음
  seBlock: [1450624, 126400], fanBlock: [1244704, 7144], bSe: [1648288, 4416], bBasic: [1624352, 3720], wSe: [7219648, 85568],
  bSeF: [1643904, 4368], wSeF: [7158592, 61032],   // 필드 효과음 (문 소리, 경완 2026-10-28)
  // 하트골드 (세 번째 값 'hg' = SRCS.hg 파일)
  hwBasic: [6937120, 431288, 'hg'], hbBasic: [1764256, 4288, 'hg'],
  hbBa1: [1852256, 4392, 'hg'], hwBa1: [7588672, 13252, 'hg'], hbBa2: [1856672, 4356, 'hg'], hwBa2: [7601952, 13956, 'hg'],
  hbBa3: [1861056, 4348, 'hg'], hwBa3: [7615936, 8452, 'hg'], hbBa5: [1869856, 4392, 'hg'], hwBa5: [7653248, 27708, 'hg'],
  hsGymJ: [714656, 11596, 'hg'], hsGymK: [839424, 20568, 'hg'], hsRival: [726272, 15056, 'hg'], hsChamp: [794112, 12628, 'hg'],
  hsEyeRiv: [578240, 6976, 'hg'], hsWin1: [860000, 3164, 'hg'], hsWin3: [868960, 6180, 'hg'],
  hbSeF: [1937472, 5088, 'hg'], hwSeF: [7948960, 95352, 'hg'], hbThlon: [2029760, 5180, 'hg'], hwThlon: [8398272, 99384, 'hg'],   // v19.77 하트골드 필드 효과음 (뛰어내리기·문·부딪힘, 경완 2026-11-08)
  hseDANSA: [1544416, 60, 'hg'], hseDANSA4: [1557024, 176, 'hg'], hseDANSA5: [1529696, 60, 'hg'], hseUFO_JUMP: [1679584, 176, 'hg'], hseDOOR: [1543424, 168, 'hg'], hseDOOR_OPEN: [1543616, 164, 'hg'], hseDOOR_CLOSE: [1543808, 168, 'hg'], hseDOOR_CLOSE2: [1544000, 164, 'hg'], hseDOOR10: [1544192, 156, 'hg'], hseDOOR_OPEN5: [1536480, 184, 'hg'], hseHIKIDO_OPEN: [1700800, 328, 'hg'], hseWALL_HIT: [1542880, 152, 'hg'], hseWALL_HIT2: [1543040, 152, 'hg'], hseKABEHIT: [1689824, 280, 'hg'],
  hseSELECT: [1199552, 120, 'hg'], hseKAIDAN2: [1543200, 208, 'hg'], hsePINPON: [1539168, 56, 'hg'], hsePC_ON: [1544480, 88, 'hg'], hseELEBETA: [1545152, 52, 'hg'], hseKATI: [1539520, 96, 'hg'], hseBOWA: [1541984, 104, 'hg'], hbSeB: [1942560, 5108, 'hg'], hwSeB: [8044320, 85568, 'hg'], hseAJITO_SIREN: [1667872, 828, 'hg'], hseALERT: [1509792, 48, 'hg'], hseALERT3: [1520288, 120, 'hg'], hseALERT4: [1520416, 368, 'hg'], hseBEEP: [1560992, 52, 'hg'], hseDODON: [1659936, 96, 'hg'], hseGSDODON: [1673184, 96, 'hg'], hseDOKU_TRAP: [1669184, 728, 'hg'], hseDOKU2: [1545088, 64, 'hg'], hmeASA: [1169568, 732, 'hg'],   // v19.8x 남은 GBA 효과음도 하트골드로 (경완 2026-11-08)
  hsEyeRoc: [665472, 3252, 'hg'], hsVsRoc: [741344, 10192, 'hg'], hsAjito: [528256, 4868, 'hg'], hbD9: [1924000, 4580, 'hg'], hwD9: [7893664, 4872, 'hg'], hsNibi: [354464, 6804, 'hg'], hbF16: [1838656, 4592, 'hg'], hwF16: [7568928, 6072, 'hg'],   // 체육관 이벤트 로켓단 (2026-11-07): SEQ_GS_EYE_ROCKET·VS_ROCKET·D_AJITO
};
const BANK = { hF: { b: 'hbSeF', w: ['hwBasic', 'hwSeF'] }, hB2: { b: 'hbSeB', w: ['hwBasic', 'hwSeB'] }, hT: { b: 'hbThlon', w: ['hwBasic', 'hwThlon'] }, field: { b: 'bField', w: ['wBasic', 'wField'] }, battle: { b: 'bBattle', w: ['wBasic', 'wBattle'] }, S: { b: 'bSe', w: ['wBasic', 'wSe'] }, B: { b: 'bBasic', w: ['wBasic'] }, F: { b: 'bSeF', w: ['wBasic', 'wSeF'] }, dungeon: { b: 'bDungeon', w: ['wBasic', 'wDungeon'] },
  hB: { b: 'hbBasic', w: ['hwBasic'] }, h1: { b: 'hbBa1', w: ['hwBasic', 'hwBa1'] }, h2: { b: 'hbBa2', w: ['hwBasic', 'hwBa2'] }, h3: { b: 'hbBa3', w: ['hwBasic', 'hwBa3'] }, h5: { b: 'hbBa5', w: ['hwBasic', 'hwBa5'] }, hD9: { b: 'hbD9', w: ['hwBasic', 'hwD9'] }, hF16: { b: 'hbF16', w: ['hwBasic', 'hwF16'] } };
// 곡 이름 → 악보, 악기 묶음, 곡 볼륨(원본 SEQ 정보 값)
const SONG = {
  gym: { s: 'sGym', bank: 'field', vol: 118 },            // 체육관
  lab: { s: 'sLab', bank: 'field', vol: 127 },
  league: { s: 'sLeague', bank: 'dungeon', vol: 100 },
  dendo: { s: 'sDendo', bank: 'dungeon', vol: 112 },     // 전당 (전설의 체육관 전당 등록)   // 승급 심사 화면 (포켓몬리그)
  tsure: { s: 'sTsure', bank: 'B', vol: 125 },          // 친밀도 만점 창            // 처음 연출·튜토리얼 (연구소 곡)
  train: { s: 'sBaTrain', bank: 'battle', vol: 88 },      // 트레이너 배틀
  gymBattle: { s: 'sBaGym', bank: 'battle', vol: 88 },    // 체육관 관장 배틀
  rival: { s: 'sBaRival', bank: 'battle', vol: 88 },      // 라이벌 배틀
  champ: { s: 'sBaChamp', bank: 'battle', vol: 90 },      // 챔피언 배틀
  winTrain: { s: 'sWinTrain', bank: 'battle', vol: 118 }, // 트레이너에게 이겼다
  winGym: { s: 'sWinGym', bank: 'battle', vol: 120 },     // 관장에게 이겼다
  eyeElite: { s: 'sEyeElite', bank: 'B', vol: 80 },       // 이름 있는 트레이너 등장 (시선 마주침, 엘리트)
  eyeChamp: { s: 'sEyeChamp', bank: 'B', vol: 100 },      // 챔피언 등장
  tenno: { s: 'sBaTenno', bank: 'battle', vol: 94 },      // 사천왕 배틀
  eyeTenno: { s: 'sEyeTenno', bank: 'B', vol: 86 },       // 사천왕 등장
  theRiv: { s: 'sTheRiv', bank: 'B', vol: 70 },           // 라이벌 용식 테마 (등장)
  winTenno: { s: 'sWinTenno', bank: 'battle', vol: 90 },  // 사천왕에게 이겼다
  winChamp: { s: 'sWinChamp', bank: 'battle', vol: 105 }, // 챔피언에게 이겼다
  // 하트골드: 성도·관동 관장, 라이벌 실버, 챔피언(목호·레드), 승리
  hgGymJ: { s: 'hsGymJ', bank: 'h1', vol: 108 },          // 성도 관장·사천왕 배틀
  hgGymK: { s: 'hsGymK', bank: 'h5', vol: 75 },           // 관동 관장 배틀
  hgRival: { s: 'hsRival', bank: 'h2', vol: 84 },         // 라이벌 실버 배틀
  hgChamp: { s: 'hsChamp', bank: 'h3', vol: 113 },        // 챔피언 목호·레드 배틀
  hgEyeRiv: { s: 'hsEyeRiv', bank: 'hB', vol: 89 },       // 실버 등장
  hgEyeRoc: { s: 'hsEyeRoc', bank: 'hB', vol: 71 },       // 로켓단 등장 (이벤트)
  hgVsRoc: { s: 'hsVsRoc', bank: 'h1', vol: 102 },        // 로켓단 배틀 (이벤트)
  hgAjito: { s: 'hsAjito', bank: 'hD9', vol: 81 },
  hgNibi: { s: 'hsNibi', bank: 'hF16', vol: 59 },          // 회색시티 (하트골드 SEQ_GS_C_NIBI, 이벤트 2장 마을)        // 로켓단 아지트 (이벤트)
  hgWin1: { s: 'hsWin1', bank: 'hB', vol: 110 },          // 트레이너에게 이겼다
  hgWin3: { s: 'hsWin3', bank: 'hB', vol: 102 },          // 관장·사천왕·챔피언에게 이겼다
  // 에메랄드 (호연 트레이너)
  emGym: { gba: 'mus_vs_gym_leader' }, emTenno: { gba: 'mus_vs_elite_four' }, emChamp: { gba: 'mus_vs_champion' }, emRival: { gba: 'mus_vs_rival' },
  emEyeTenno: { gba: 'mus_encounter_elite_four' }, emEyeChamp: { gba: 'mus_encounter_champion' }, emEyeF: { gba: 'mus_encounter_female' }, emEyeInt: { gba: 'mus_encounter_intense' }, emEyeRiv: { gba: 'mus_encounter_brendan' },
  emWinGym: { gba: 'mus_victory_gym_leader' }, emWinLeague: { gba: 'mus_victory_league' }, emWinTrain: { gba: 'mus_victory_trainer' },
  // 파이어레드 (v19.18 경완 전설 전당 연출): 따라와(오박사 데려가기), 전당 방, 전당 등록
  rgFollow: { gba: 'mus_rg_follow_me' }, rgPallet: { gba: 'mus_rg_slow_pallet' }, rgHof: { gba: 'mus_rg_hall_of_fame' }, rgEyeRoc: { gba: 'mus_rg_encounter_rocket' }, rgAjito: { gba: 'mus_rg_rocket_hideout' }, rgSilph: { gba: 'mus_rg_silph' }, rgTower: { gba: 'mus_rg_poke_tower' },   // 파이어레드 로켓단 만남 (로켓단 이벤트 아테나 모니터 장면, 경완 2026-11-08)
};

// ---------- 받아 오기·저장 ----------
const db = () => new Promise((res, rej) => { const r = indexedDB.open('pk-music', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function idb(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('t', mode), r = fn(tx.objectStore('t')); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); }
const key = p => 'gsnd:' + p;
const mem = {};
const whole = {};   // 바이트 범위 요청이 안 되는 경우 파일 통째로(파일마다 한 번만)
async function fetchWhole(k) {
  const [url, size] = SRCS[k];
  if (!whole[k]) whole[k] = fetch(url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(b => { if (b.byteLength !== size) throw new Error('size'); return b; }).catch(e => { delete whole[k]; throw e; });
  return whole[k];
}
async function part(p) {
  if (mem[p]) return mem[p];
  return (mem[p] = (async () => {
    let b = null; try { b = await idb('readonly', st => st.get(key(p))); } catch (e) {}
    if (b instanceof Blob) b = await b.arrayBuffer();
    if (b && b.byteLength === PART[p][1]) return b;
    const [o, n, k = 'pt'] = PART[p], [url, size] = SRCS[k];
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${o}-${o + n - 1}` } });
      if (r.status === 206) { b = await r.arrayBuffer(); if (b.byteLength !== n) b = null; }
      else if (r.ok) { const all = await r.arrayBuffer(); b = all.byteLength === size ? all.slice(o, o + n) : null; }
    } catch (e) { b = null; }
    if (!b) b = (await fetchWhole(k)).slice(o, o + n);
    idb('readwrite', st => st.put(new Blob([b]), key(p))).catch(() => {});
    return b;
  })().catch(e => { delete mem[p]; throw e; }));
}

// ---------- 에메랄드(GBA) 곡 (v16.94 경완 '에메랄드 원곡') ----------
// 악보(.mid)·소리 조각(.wav/.pcm)은 pret/pokeemerald 고정 커밋에서 받아 이 기기에 둔다. 음색 설정은 gym/gba.json, 연주는 gym/gba.js 일꾼
const GSRC = 'https://raw.githubusercontent.com/pret/pokeemerald/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/sound/';
let gbaMan = null;
const gbaJson = () => gbaMan || (gbaMan = fetch(`gym/gba.json?v=${VER}`).then(r => r.json()).catch(e => { gbaMan = null; throw e; }));
async function gfile(f) {
  const k = 'gba:' + f; if (mem[k]) return mem[k];
  return (mem[k] = (async () => {
    let b = null; try { b = await idb('readonly', st => st.get(key(k))); } catch (e) {}
    if (b instanceof Blob) b = await b.arrayBuffer();
    if (b && b.byteLength) return b;
    const r = await fetch(GSRC + f); if (!r.ok) throw new Error('http ' + r.status); b = await r.arrayBuffer();
    idb('readwrite', st => st.put(new Blob([b]), key(k))).catch(() => {});
    return b;
  })().catch(e => { delete mem[k]; throw e; }));
}
let gworker = null, gwid = 0; const gwaits = new Map();
function gwork(msg) {
  if (!gworker) { gworker = new Worker(`gym/gba.js?v=${VER}`); gworker.onmessage = e => { const w = gwaits.get(e.data.id); if (!w) return; gwaits.delete(e.data.id); e.data.err ? w.no(new Error(e.data.err)) : w.ok(e.data); }; gworker.onerror = e => { gwaits.forEach(w => w.no(e)); gwaits.clear(); try { gworker.terminate(); } catch (x) {} gworker = null; }; }
  const id = ++gwid; return new Promise((ok, no) => { gwaits.set(id, { ok, no }); gworker.postMessage(Object.assign({ id }, msg)); });
}
async function makeGba(S) {
  const J = await gbaJson(), sg = J.songs[S.gba];
  const [mid, ...sm] = await Promise.all([gfile(sg.mid), ...sg.smp.map(f => gfile('' + f))]);
  const smp = {}; sg.smp.forEach((f, i) => { smp[f] = sm[i].slice(0); });
  return gwork({ mid: mid.slice(0), man: Object.assign({}, sg, { v: J.v, ks: J.ks }), smp });
}

// ---------- 연주(일꾼) ----------
let worker = null, wid = 0;
const waits = new Map();
function work(msg, transfer) {
  if (!worker) {
    worker = new Worker(`gym/sseq.js?v=${VER}`);
    worker.onmessage = e => { const w = waits.get(e.data.id); if (!w) return; waits.delete(e.data.id); e.data.err ? w.no(new Error(e.data.err)) : w.ok(e.data); };
    worker.onerror = e => { waits.forEach(w => w.no(e)); waits.clear(); try { worker.terminate(); } catch (x) {} worker = null; sent.clear(); };
  }
  const id = ++wid; return new Promise((ok, no) => { waits.set(id, { ok, no }); worker.postMessage(Object.assign({ id }, msg), transfer); });
}
const sent = new Set();   // 일꾼에 이미 보낸 악기·소리 묶음
const pcm = new Map();    // 곡 → 만든 소리 (지금 곡과 체육관 곡만 들고 있는다)
async function make(name) {
  if (pcm.has(name)) return pcm.get(name);
  const S = SONG[name], B = BANK[S.bank];
  if (S.gba) { const p = makeGba(S); pcm.set(name, p); p.catch(() => pcm.delete(name)); return p; }
  const p = (async () => {
    const [seq, bank, ...wars] = await Promise.all([part(S.s), part(B.b), ...B.w.map(part)]);
    const bk = sent.has(B.b) ? null : bank.slice(0), ws = B.w.map((w, i) => sent.has(w) ? null : wars[i].slice(0));
    const r = await work({ seq: seq.slice(0), bankKey: B.b, bank: bk, warKeys: B.w, wars: ws, vol: S.vol });
    sent.add(B.b); B.w.forEach(w => sent.add(w));
    return r;
  })();
  pcm.set(name, p); p.catch(() => pcm.delete(name));
  return p;
}
const bufs = new Map();   // 곡 → 오디오 버퍼(만든 PCM 은 버퍼로 옮기고 버린다)
function trim(keep) { for (const m of [pcm, bufs]) for (const k of [...m.keys()]) if (k !== 'gym' && !keep.includes(k)) m.delete(k); }
async function bufOf(ctx, name) {
  const b = bufs.get(name); if (b && b.ctx === ctx) return b;
  let r = await make(name);
  if (!r.L) { pcm.delete(name); r = await make(name); }
  /* v19.38 경완 'bgm 음량 효과음이랑 밸런스': 곡마다 크기(RMS)가 달라 GBA 곡(전당 등)이 훨씬 크게 들림 → 체육관 곡 크기(-19dB)보다 큰 곡만 그만큼 줄인다 */
  let ss = 0, sn = 0; for (let i = 0; i < r.L.length; i += 7) { ss += r.L[i] * r.L[i] + r.R[i] * r.R[i]; sn += 2; }
  const db = sn ? 10 * Math.log10(ss / sn + 1e-12) : -99, lg = Math.max(.35, Math.min(1, Math.pow(10, (-19 - db) / 20)));
  const x = { ctx, buf: toBuf(ctx, r), loop: r.loop, ls: r.loopStart / r.rate, lg };
  r.L = r.R = null; bufs.set(name, x); return x;
}

// ---------- 틀기 ----------
const cur = { name: null, src: null, g: null, ctx: null, out: null, want: null };
const on = () => { try { return GA.bgmOn(); } catch (e) { return false; } };
function toBuf(ctx, r) {
  const b = ctx.createBuffer(2, r.L.length, r.rate);
  b.getChannelData(0).set(r.L); b.getChannelData(1).set(r.R);
  return b;
}
// 끊긴 자리 (경완 2026-10-28 '배틀 중 나갔다 오면 끊긴 부분부터'): 앱을 나갔다 와서 다시 틀 때만 이어서, 새로 고른 곡은 처음부터
const pos = {};
function posNow() { const { src, ctx, name } = cur; if (!src || !ctx || !name || cur.t0 == null) return; const d = src.buffer.duration; let p = ctx.currentTime - cur.t0;
  if (src.loop && p > d) { const ls = src.loopStart; p = ls + (p - ls) % Math.max(.01, d - ls); } pos[name] = clampP(p, d); }
const clampP = (p, d) => Math.max(0, Math.min(p, d - .05));
function stopSrc(fade = .4) {
  posNow(); const { src, g, ctx } = cur; cur.src = null; cur.g = null; if (!src) return;
  try { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); src.stop(t + fade + .05); } catch (e) { try { src.stop(); } catch (x) {} }
  setTimeout(() => { try { src.disconnect(); g.disconnect(); } catch (e) {} }, fade * 1000 + 200);
}
async function start(name, { fade = .6 } = {}) {
  const ctx = GA.audio(), out = GA.bgmGain(); if (!ctx || !out) return;
  const B = await bufOf(ctx, name);
  if (cur.want !== name || !on()) return;
  if (cur.name === name && cur.src && cur.ctx === ctx && cur.out === out) return;
  stopSrc(.3);
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = B.buf; src.loop = B.loop;
  if (B.loop) { src.loopStart = B.ls; src.loopEnd = B.buf.duration; }
  const t = ctx.currentTime, off = pos[name] || 0; delete pos[name]; cur.lg = B.lg || 1; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cur.lg, t + fade);
  src.connect(g); g.connect(out); src.start(0, off); cur.t0 = t - off;
  src.onended = () => { if (cur.src === src) { cur.src = null; cur.name = null; if (!B.loop) cur.fin = name; } };   // 한 번만 도는 곡(승리 곡)이 끝나면 다시 틀지 않는다
  Object.assign(cur, { name, src, g, ctx, out });
}
// 오디오가 새로 만들어지거나(아이폰) 볼륨이 0 이 되면 따라간다
let tick = 0;
function watch() {
  clearInterval(tick); tick = setInterval(() => {
    if (!cur.want) { clearInterval(tick); tick = 0; return; }
    if (!cur.src && cur.fin === cur.want) return;   // 이름 있는 트레이너 승리 뒤 승리 곡이 끝나고 처음부터 또 겹쳐 나오던 것 (경완 2026-10-29)
    if (!on()) { if (cur.src) stopSrc(.2); cur.name = null; return; }
    let ctx = null, out = null; try { ctx = GA.audio(); out = GA.bgmGain(); } catch (e) {}
    if (!cur.src || cur.ctx !== ctx || cur.out !== out) { if (cur.src && cur.ctx !== ctx) { posNow(); cur.src = null; } cur.name = null; start(cur.want, { fade: 1 }).catch(() => {}); }
  }, 700);
}
// ---------- 효과음 (배틀: 맞는 소리·쓰러짐·볼·기술 소리 등, 플래티넘 원본) ----------
let SE = null, seOut = null;
const seList = () => SE || (SE = fetch(`gym/se.json?v=${VER}`).then(r => r.json()).catch(e => { SE = null; throw e; }));
const seBuf = new Map();   // 이름 → Promise<AudioBuffer>
async function seMake(ctx, nm) {
  // 본가 GBA 효과음 (경완 2026-11-07 '효과음들도 본가 게임 효과음'): 'se_door' 처럼 pokeemerald 의 se_*·mus_rg_* 이름이면 GBA 연주기로 한 번 만든다. 끝 무음은 잘라 낸다
  if (/^(se|mus)_/.test(nm)) { const r = await makeGba({ gba: nm }); let n = r.L.length; while (n > 1 && Math.abs(r.L[n - 1]) < 1e-4 && Math.abs(r.R[n - 1]) < 1e-4) n--; n = Math.min(r.L.length, n + Math.round(r.rate * .03));
    const g = nm.startsWith('se_') ? .3 : .4, L = r.L.slice(0, n), R = r.R.slice(0, n); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }   // GBA 연주기는 꽉 차게 나와서 플래티넘 효과음 크기에 맞춤
    return toBuf(ctx, { L, R, rate: r.rate }); }
  const J = await seList(), e = J.se[nm]; if (!e) return null;
  const B = BANK[e[2]], [blk, bank, ...wars] = await Promise.all([part(e[4] || 'seBlock'), part(B.b), ...B.w.map(part)]);   // e[4]: 팡파레처럼 효과음 묶음 밖의 악보
  const bk = sent.has(B.b) ? null : bank.slice(0), ws = B.w.map((w, i) => sent.has(w) ? null : wars[i].slice(0));
  const r = await work({ seq: blk.slice(e[0], e[0] + e[1]), bankKey: B.b, bank: bk, warKeys: B.w, wars: ws, vol: e[3], gain: 1, trim: true });
  sent.add(B.b); B.w.forEach(w => sent.add(w));
  // e[5]: 크기 맞추기 (하트골드 필드 효과음은 원본이 작아서 FR 소리 크기에 맞춤), e[6]: 그 초에서 0.08초 동안 줄이며 끊기 (엘리베이터처럼 계속 도는 소리)
  if (e[5] && e[5] !== 1) for (const C of [r.L, r.R]) for (let i = 0; i < C.length; i++) C[i] *= e[5];
  if (e[6] && r.L.length > e[6] * r.rate) { const n = Math.round(e[6] * r.rate), f = Math.round(.08 * r.rate); r.L = r.L.slice(0, n); r.R = r.R.slice(0, n); for (let i = 0; i < f; i++) { const q = 1 - i / f; r.L[n - f + i] *= q; r.R[n - f + i] *= q; } }
  return toBuf(ctx, r);
}
function seGet(ctx, nm) {
  let p = seBuf.get(nm); if (p && p.ctx === ctx) return p.p;
  p = { ctx, p: seMake(ctx, nm) }; p.p.catch(() => seBuf.delete(nm)); seBuf.set(nm, p); return p.p;
}
// nm: 'DP_KOUKA_M' 처럼 SEQ_SE_ 뒤 이름. pan -1(왼쪽)~1(오른쪽), at: 몇 초 뒤
const seLive = new Map(), fanEnd = new Map();   // 지금 나는 효과음 (seStop 으로 끊기)
async function sePlay(nm, { pan = 0, at = 0, dur = 0, gain = 1 } = {}) {   // gain: 원본이 작은 소리 키우기   // dur: 그 초만큼만 (본가에서 멈추는 소리, 경험치 막대 등)
  let ctx = null; try { ctx = GA.audio(); } catch (e) {} if (!ctx) return;
  const v = (() => { try { return GA.sfxVol(); } catch (e) { return .1; } })(); if (!v) return;
  const t0 = ctx.currentTime;
  const buf = await seGet(ctx, nm).catch(() => null); if (!buf) return;
  if (!seOut || seOut.context !== ctx) { seOut = ctx.createGain(); seOut.connect(ctx.destination); }
  seOut.gain.value = 1.5 * v;
  const src = ctx.createBufferSource(); src.buffer = buf;
  let node = src; if (gain !== 1) { const gn = ctx.createGain(); gn.gain.value = gain; src.connect(gn); node = gn; } if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); node = p; }
  node.connect(seOut); const st = Math.max(ctx.currentTime, t0 + at); src.start(st); if (dur) src.stop(st + dur);
  let L = seLive.get(nm); if (!L) seLive.set(nm, L = new Set()); L.add(src); src.onended = () => L.delete(src);
  return dur || buf.duration;
}
const GymBGM = {
  // 곡 바꾸기. 처음이면 받아 오고 만드는 동안 조용하다가 준비되면 서서히 커진다
  play(name, o) { if (!SONG[name]) return Promise.resolve(); if (cur.want !== name) delete pos[name]; cur.want = name; cur.fin = null; trim([name]); watch(); return on() ? start(name, o).catch(() => {}) : Promise.resolve(); },
  stop(fade = .6) { cur.want = null; cur.name = null; stopSrc(fade); clearInterval(tick); tick = 0; },
  // 다음에 틀 곡을 미리 만들어 둔다 (배틀 시작하면 승리 곡)
  prep(name) { if (SONG[name]) make(name).catch(() => {}); },
  // 체육관에서 나가면 메모리를 비운다
  free() { this.stop(.3); pcm.clear(); bufs.clear(); seBuf.clear(); if (worker) { try { worker.terminate(); } catch (e) {} worker = null; sent.clear(); } if (gworker) { try { gworker.terminate(); } catch (e) {} gworker = null; } },
  // 효과음: 미리 만들어 두기 / 틀기
  sePrep(L) { let ctx = null; try { ctx = GA.audio(); } catch (e) {} return ctx ? Promise.all(L.map(n => seGet(ctx, n).catch(() => {}))) : Promise.resolve(); },   // 다 만들어지면 풀림 (v19.73)
  se: (nm, o) => { window.GymBGM && (window.GymBGM.seT = performance.now()); return sePlay(nm, o).catch(() => {}); },   // seT: v18.99 저절로 뜨는 알림창이 소리를 냈는지 보려고
  // 나고 있는 효과음·팡파르 끊기 (팡파르면 배경 곡도 바로 다시 키움)
  seStop(nm) { for (const s of seLive.get(nm) || []) { try { s.stop(); } catch (e) {} } seLive.delete(nm); fanEnd.get(nm)?.(); },
  // 팡파르(본가 Sound_PlayFanfare): 배경 곡을 잠깐 줄이고 끝까지 튼 뒤 다시 키운다. 끝나면 풀리는 Promise
  async fan(nm) { const g = cur.g, c = cur.ctx; const dz = (to, s) => { try { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to, t + s); } catch (e) {} };
    if (g && c) dz(0, .08); const d = await sePlay(nm).catch(() => 0) || 0; await new Promise(r => { const t = setTimeout(r, d * 1000 + 80); fanEnd.set(nm, () => { clearTimeout(t); r(); }); }); fanEnd.delete(nm); if (g && c && cur.g === g) dz(cur.lg || 1, .3); },
  // v19.18: 배경 곡 볼륨만 to(0~1)로 s초 동안 (곡은 계속 돎, fan 이 끝나면 1로)
  duck(to, s = .5) { const g = cur.g, c = cur.ctx; if (!g || !c) return; try { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to * (cur.lg || 1), t + s); } catch (e) {} },
  get name() { return cur.want; },
  SONG,
};
window.GymBGM = GymBGM;
})();
