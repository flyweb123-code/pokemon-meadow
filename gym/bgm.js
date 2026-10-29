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
// [시작 바이트, 길이]
const PART = {
  wBasic: [6573184, 458564], wField: [7031776, 30836], wBattle: [7062624, 33656],
  bField: [1628096, 3984], bBattle: [1632096, 3820],
  sGym: [829664, 8876], sBaGym: [987488, 13836], sBaTrain: [1013312, 8996], sBaRival: [1067936, 8272], sBaChamp: [1048928, 11672], sEyeElite: [941696, 6000], sEyeChamp: [964096, 6632],
  sLab: [838560, 3556],   // SEQ_KENKYUJO 연구소 (튜토리얼, 경완 2026-10-29)
  sWinTrain: [1084160, 4204], sWinGym: [1088384, 7584],
  // 효과음: 배틀·기본 효과음 악보 묶음(gym/se.json 의 block), 악기, 소리 묶음
  seBlock: [1450624, 126400], fanBlock: [1244704, 7144], bSe: [1648288, 4416], bBasic: [1624352, 3720], wSe: [7219648, 85568],
  bSeF: [1643904, 4368], wSeF: [7158592, 61032],   // 필드 효과음 (문 소리, 경완 2026-10-28)
};
const BANK = { field: { b: 'bField', w: ['wBasic', 'wField'] }, battle: { b: 'bBattle', w: ['wBasic', 'wBattle'] }, S: { b: 'bSe', w: ['wBasic', 'wSe'] }, B: { b: 'bBasic', w: ['wBasic'] }, F: { b: 'bSeF', w: ['wBasic', 'wSeF'] } };
// 곡 이름 → 악보, 악기 묶음, 곡 볼륨(원본 SEQ 정보 값)
const SONG = {
  gym: { s: 'sGym', bank: 'field', vol: 118 },            // 체육관
  lab: { s: 'sLab', bank: 'field', vol: 127 },            // 처음 연출·튜토리얼 (연구소 곡)
  train: { s: 'sBaTrain', bank: 'battle', vol: 88 },      // 트레이너 배틀
  gymBattle: { s: 'sBaGym', bank: 'battle', vol: 88 },    // 체육관 관장 배틀
  rival: { s: 'sBaRival', bank: 'battle', vol: 88 },      // 라이벌 배틀
  champ: { s: 'sBaChamp', bank: 'battle', vol: 90 },      // 챔피언 배틀
  winTrain: { s: 'sWinTrain', bank: 'battle', vol: 118 }, // 트레이너에게 이겼다
  winGym: { s: 'sWinGym', bank: 'battle', vol: 120 },     // 관장에게 이겼다
  eyeElite: { s: 'sEyeElite', bank: 'B', vol: 80 },       // 이름 있는 트레이너 등장 (시선 마주침, 엘리트)
  eyeChamp: { s: 'sEyeChamp', bank: 'B', vol: 100 },      // 챔피언 등장
};

// ---------- 받아 오기·저장 ----------
const db = () => new Promise((res, rej) => { const r = indexedDB.open('pk-music', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function idb(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('t', mode), r = fn(tx.objectStore('t')); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); }
const key = p => 'gsnd:' + p;
const mem = {};
let whole = null;   // 바이트 범위 요청이 안 되는 경우 파일 통째로(한 번만)
async function fetchWhole() {
  if (!whole) whole = fetch(SRC).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(b => { if (b.byteLength !== SDAT_SIZE) throw new Error('size'); return b; }).catch(e => { whole = null; throw e; });
  return whole;
}
async function part(p) {
  if (mem[p]) return mem[p];
  return (mem[p] = (async () => {
    let b = null; try { b = await idb('readonly', st => st.get(key(p))); } catch (e) {}
    if (b instanceof Blob) b = await b.arrayBuffer();
    if (b && b.byteLength === PART[p][1]) return b;
    const [o, n] = PART[p];
    try {
      const r = await fetch(SRC, { headers: { Range: `bytes=${o}-${o + n - 1}` } });
      if (r.status === 206) { b = await r.arrayBuffer(); if (b.byteLength !== n) b = null; }
      else if (r.ok) { const all = await r.arrayBuffer(); b = all.byteLength === SDAT_SIZE ? all.slice(o, o + n) : null; }
    } catch (e) { b = null; }
    if (!b) b = (await fetchWhole()).slice(o, o + n);
    idb('readwrite', st => st.put(new Blob([b]), key(p))).catch(() => {});
    return b;
  })().catch(e => { delete mem[p]; throw e; }));
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
  const x = { ctx, buf: toBuf(ctx, r), loop: r.loop, ls: r.loopStart / r.rate };
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
  const t = ctx.currentTime, off = pos[name] || 0; delete pos[name]; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fade);
  src.connect(g); g.connect(out); src.start(0, off); cur.t0 = t - off;
  src.onended = () => { if (cur.src === src) { cur.src = null; cur.name = null; } };
  Object.assign(cur, { name, src, g, ctx, out });
}
// 오디오가 새로 만들어지거나(아이폰) 볼륨이 0 이 되면 따라간다
let tick = 0;
function watch() {
  clearInterval(tick); tick = setInterval(() => {
    if (!cur.want) { clearInterval(tick); tick = 0; return; }
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
  const J = await seList(), e = J.se[nm]; if (!e) return null;
  const B = BANK[e[2]], [blk, bank, ...wars] = await Promise.all([part(e[4] || 'seBlock'), part(B.b), ...B.w.map(part)]);   // e[4]: 팡파레처럼 효과음 묶음 밖의 악보
  const bk = sent.has(B.b) ? null : bank.slice(0), ws = B.w.map((w, i) => sent.has(w) ? null : wars[i].slice(0));
  const r = await work({ seq: blk.slice(e[0], e[0] + e[1]), bankKey: B.b, bank: bk, warKeys: B.w, wars: ws, vol: e[3], gain: 1, trim: true });
  sent.add(B.b); B.w.forEach(w => sent.add(w));
  return toBuf(ctx, r);
}
function seGet(ctx, nm) {
  let p = seBuf.get(nm); if (p && p.ctx === ctx) return p.p;
  p = { ctx, p: seMake(ctx, nm) }; p.p.catch(() => seBuf.delete(nm)); seBuf.set(nm, p); return p.p;
}
// nm: 'DP_KOUKA_M' 처럼 SEQ_SE_ 뒤 이름. pan -1(왼쪽)~1(오른쪽), at: 몇 초 뒤
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
}
const GymBGM = {
  // 곡 바꾸기. 처음이면 받아 오고 만드는 동안 조용하다가 준비되면 서서히 커진다
  play(name, o) { if (!SONG[name]) return Promise.resolve(); if (cur.want !== name) delete pos[name]; cur.want = name; trim([name]); watch(); return on() ? start(name, o).catch(() => {}) : Promise.resolve(); },
  stop(fade = .6) { cur.want = null; cur.name = null; stopSrc(fade); clearInterval(tick); tick = 0; },
  // 다음에 틀 곡을 미리 만들어 둔다 (배틀 시작하면 승리 곡)
  prep(name) { if (SONG[name]) make(name).catch(() => {}); },
  // 체육관에서 나가면 메모리를 비운다
  free() { this.stop(.3); pcm.clear(); bufs.clear(); seBuf.clear(); if (worker) { try { worker.terminate(); } catch (e) {} worker = null; sent.clear(); } },
  // 효과음: 미리 만들어 두기 / 틀기
  sePrep(L) { let ctx = null; try { ctx = GA.audio(); } catch (e) {} if (ctx) L.forEach(n => seGet(ctx, n).catch(() => {})); },
  se: (nm, o) => sePlay(nm, o).catch(() => {}),
  get name() { return cur.want; },
  SONG,
};
window.GymBGM = GymBGM;
})();
