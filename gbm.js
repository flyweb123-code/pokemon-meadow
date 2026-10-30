/* 게임보이 BGM (v11.94 경완 2026-10-30 '곡 파일 가져오기 대신 다른 저장소에서'):
   pret/pokecrystal·pret/pokered 의 악보(.asm)를 GitHub 에서 받아 금·은/레드·블루 사운드 엔진처럼 프레임 단위로 진행하고,
   4채널(사각파 2·파형·노이즈)을 직접 합성해 반복 구간이 있는 AudioBuffer 로 만든다. 저장소엔 곡 파일을 올리지 않는다.
   합성은 일꾼(Worker)에서 (이 파일을 그대로 일꾼으로 띄움), 받은 악보 글은 이 기기(IndexedDB)에 넣어 두어 오프라인에서도 나온다. */
(function (root) {
'use strict';
const FPS = 4194304 / 70224;   // 59.7275
const FREQ = [0, 0xf82c, 0xf89d, 0xf907, 0xf96b, 0xf9ca, 0xfa23, 0xfa77, 0xfac7, 0xfb12, 0xfb58, 0xfb9b, 0xfbda,
  0xfc16, 0xfc4e, 0xfc83, 0xfcb5, 0xfce5, 0xfd11, 0xfd3b, 0xfd63, 0xfd89, 0xfdac, 0xfdcd, 0xfded];
const NOTE = { C_: 1, 'C#': 2, D_: 3, 'D#': 4, E_: 5, F_: 6, 'F#': 7, G_: 8, 'G#': 9, A_: 10, 'A#': 11, B_: 12 };
const DUTY = [[0, 0, 0, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 1, 1, 1], [0, 1, 1, 1, 1, 1, 1, 0]];

// asm 글 → { labels: {이름: 위치}, ops: [[명령, 인자...]] }
function parseAsm(txt) {
  const ops = [], labels = {}; let glob = '';
  for (let ln of txt.split('\n')) {
    ln = ln.replace(/;.*/, '').trim(); if (!ln) continue;
    const m = ln.match(/^([.\w]+):+$/); if (m) { const n = m[1].startsWith('.') ? glob + m[1] : (glob = m[1]); labels[n] = ops.length; continue; }
    const sp = ln.indexOf(' '), cmd = sp < 0 ? ln : ln.slice(0, sp), args = sp < 0 ? [] : ln.slice(sp + 1).split(',').map(s => s.trim());
    ops.push([cmd, ...args.map(a => a in NOTE ? NOTE[a] : a === 'TRUE' ? 1 : a === 'FALSE' ? 0 : /^-?\d+$/.test(a) ? +a : /^\$[0-9a-f]+$/i.test(a) ? parseInt(a.slice(1), 16) : a.startsWith('.') ? glob + a : a)]);
  }
  return { ops, labels };
}
// 드럼: drumkits.asm → kits[n][i] = [[길이(프레임), 엔벨로프 바이트, NR43], ...]
function parseDrums(txt) {
  const { ops, labels } = parseAsm(txt), smp = {}, kits = [];
  for (const [n, at] of Object.entries(labels)) { if (n === 'Drumkits') continue; const L = []; let isKit = false;
    for (let i = at; i < ops.length; i++) { const [c, ...a] = ops[i]; if (c === 'sound_ret') break; if (c === 'dw') { isKit = true; L.push(a[0]); continue; } if (c === 'noise_note') L.push([(a[0] & 15) + 1, (a[1] << 4) | (a[2] < 0 ? 8 | -a[2] : a[2]), a[3]]); else break;
      if (Object.values(labels).includes(i + 1) && isKit) break; }
    smp[n] = { kit: isKit, L }; }
  for (let k = 0; ; k++) { const e = smp['Drumkit' + k]; if (!e) break; kits.push(e.L.map(nm => smp[nm]?.L || [])); }
  return kits;
}
function parseWaves(txt) { return txt.split('\n').filter(l => /^\s*dn /.test(l)).map(l => l.trim().slice(3).split(',').map(Number)); }

// 채널 진행 (pokecrystal audio/engine.asm 의 ParseMusic/SetNoteDuration/HandleTrackVibrato 를 그대로 옮김)
function Chan(id, song, start) {
  return { id, song, pc: song.labels[start], stack: [], loops: {}, dur: 0, mod: 0, speed: 12, tempo: 256, oct: 4, trans: 0, env: 0, duty: 2, panL: 1, panR: 1,
    vibD: 0, vibCnt: 0, vibUp: 0, vibDn: 0, vibRate: 0, vibRC: 0, vibOn: false, vibDir: 0, pOff: 0, kit: 0, noise: id === 3, slide: null,
    on: true, rest: true, freq: 0, cur: 0, vol: 0, envT: 0, envP: 0, envDir: 0, trig: false, nzQ: [], nzT: 0, nr43: 0, loopHits: [] };
}
function freqOf(c, pitch) {
  let p = pitch + (c.trans & 15), o = c.oct + (c.trans >> 4), v = FREQ[p] | 0; if (v & 0x8000) v -= 0x10000;
  for (let a = o; a < 7; a++) v >>= 1; return v & 0x7ff;
}
function setDur(c, len) {
  const a = (len * c.speed) & 0xff, r = a * c.tempo + c.mod; c.mod = r & 0xff; c.dur = (r >> 8) & 0xff;
}
function step(c, frame, S) {   // 새 음표를 읽을 때까지 명령 진행
  const O = c.song.ops;
  for (let guard = 0; guard < 5000; guard++) {
    if (c.pc == null || c.pc >= O.length) { c.on = false; c.rest = true; c.dur = 1e9; return; }
    const [cmd, ...a] = O[c.pc++];
    switch (cmd) {
      case 'note': case 'drum_note': case 'rest': {
        const pitch = cmd === 'rest' ? 0 : a[0], len = cmd === 'rest' ? a[0] : a[1];
        setDur(c, len);
        if (!pitch) { c.rest = true; if (c.noise) c.nzQ = []; return; }
        if (c.noise) { c.nzQ = (S.kits[c.kit]?.[pitch] || []).slice(); c.nzT = 0; c.rest = false; return; }
        c.rest = false; c.freq = (freqOf(c, pitch) + (c.pp ? 1 : 0)) & 0x7ff; c.trig = true; c.vibCnt = c.vibD;
        if (c.slide) { c.slide.from = c.freq; c.slide.n = Math.max(1, c.dur); c.slide.i = 0; }
        return; }
      case 'octave': c.oct = 8 - a[0]; break;
      case 'note_type': case 'drum_speed': c.speed = a[0]; if (a.length > 1) c.env = (a[1] << 4) | (a[2] < 0 ? 8 | -a[2] : a[2]); break;
      case 'volume_envelope': c.env = (a[0] << 4) | (a[1] < 0 ? 8 | -a[1] : a[1]); break;
      case 'tempo': S.tempo = a[0]; for (const x of S.ch) x.tempo = a[0]; break;
      case 'duty_cycle': c.duty = a[0] & 3; break;
      case 'stereo_panning': c.panL = a[0]; c.panR = a[1]; break;
      case 'volume': S.volL = a[0]; S.volR = a.length > 1 ? a[1] : a[0]; break;
      case 'vibrato': { c.vibOn = true; c.vibDir = 0; c.vibD = a[0]; c.vibCnt = a[0]; const ext = a.length > 2 ? a[1] : a[1] >> 4, rate = a.length > 2 ? a[2] : a[1] & 15, h = ext >> 1; c.vibDn = h; c.vibUp = h + (ext & 1); c.vibRate = rate; c.vibRC = rate; break; }
      case 'pitch_offset': c.pOff = a[0]; break;
      case 'toggle_perfect_pitch': c.pp = !c.pp; break;
      case 'transpose': c.trans = (a[0] << 4) | a[1]; break;
      case 'toggle_noise': if (a.length) c.kit = a[0]; break;
      case 'pitch_slide': { const o = 8 - a[1], p = a[2] % 12; const save = [c.oct, c.trans]; c.oct = o; c.trans = 0; const to = freqOf(c, p || 12); [c.oct, c.trans] = save; c.slide = { to }; break; }
      case 'sound_call': c.stack.push(c.pc); c.pc = c.song.labels[a[0]]; break;
      case 'sound_ret': if (c.stack.length) c.pc = c.stack.pop(); else { c.on = false; c.rest = true; c.dur = 1e9; return; } break;
      case 'sound_jump': c.pc = c.song.labels[a[0]]; break;
      case 'sound_loop': { const n = a[0], at = c.pc - 1;
        if (!n) { c.loopHits.push(frame); c.pc = c.song.labels[a[1]]; break; }
        if (c.loops[at] == null) c.loops[at] = n;
        if (--c.loops[at] > 0) c.pc = c.song.labels[a[1]]; else delete c.loops[at];
        break; }
      default: break;   // channel_count·channel·db 등
    }
  }
}

function render(src, { start, sampleRate = 44100, maxLoops = 1, maxSec = 300 } = {}) {
  const song = parseAsm(src.music), waves = parseWaves(src.waves);
  // 드럼: 금·은은 drumkits.asm, 레드·블루는 악기 번호 = 노이즈 효과음 파일 (noise_instrumentNN_1.asm)
  const kits = src.drums ? parseDrums(src.drums) : [Object.fromEntries(Object.entries(src.noise || {}).map(([n, t]) => [n, parseAsm(t).ops.filter(o => o[0] === 'noise_note').map(a => [(a[1] & 15) + 1, (a[2] << 4) | (a[3] < 0 ? 8 | -a[3] : a[3]), a[4]])]))];
  let hdr = song.labels[start] != null ? song.ops.slice(song.labels[start]).filter(o => o[0] === 'channel').slice(0, 4) : [];
  if (!hdr.length) hdr = [1, 2, 3, 4].filter(n => song.labels[`${start}_Ch${n}`] != null).map(n => ['channel', n, `${start}_Ch${n}`]);   // 레드·블루: 채널 머리는 다른 파일에 있다
  const S = { kits, tempo: 256, volL: 7, volR: 7, ch: [] };
  for (let i = 0; i < 4; i++) S.ch.push(null);
  for (const [, n, lab] of hdr) S.ch[n - 1] = Chan(n - 1, song, lab);
  const ch = S.ch.filter(Boolean); S.ch = ch;
  // 1) 프레임 진행 → 프레임별 레지스터 상태 기록
  const frames = []; const maxF = Math.ceil(maxSec * FPS);
  let done = -1;
  for (let f = 0; f < maxF; f++) {
    for (const c of ch) {
      if (c.dur <= 1) step(c, f, S); else c.dur--;
      // 노이즈 샘플 진행
      if (c.noise && !c.rest) { if (c.nzT <= 0 && c.nzQ.length) { const [d, e, nr] = c.nzQ.shift(); c.nzT = d; c.env = e; c.nr43 = nr; c.trig = true; } c.nzT--; }
      // 음 높이: 피치 슬라이드·피치 오프셋·비브라토
      let fq = c.freq;
      if (c.slide && c.slide.n && c.slide.from != null && !c.rest) { c.slide.i = Math.min(c.slide.n, c.slide.i + 1); fq = Math.round(c.slide.from + (c.slide.to - c.slide.from) * c.slide.i / c.slide.n); if (c.slide.i >= c.slide.n) c.freq = fq; }
      if (c.pOff) fq = (fq + c.pOff) & 0x7ff;
      if (c.vibOn && !c.noise) {
        if (c.vibCnt > 0) c.vibCnt--;
        else if (c.vibUp + c.vibDn) {
          if ((c.vibRC & 15) === 0) { c.vibRC = c.vibRate; c.vibDir ^= 1; } else c.vibRC--;
          const lo = fq & 0xff, hi = fq & 0x700; fq = hi | (c.vibDir ? Math.min(255, lo + c.vibUp) : Math.max(0, lo - c.vibDn));
        }
      }
      c.cur = fq;
      if (c.trig) { c.trig = false; c.vol = c.env >> 4; c.envDir = c.env & 8 ? 1 : -1; c.envP = c.env & 7; c.envT = 0; c.wave = waves[Math.min(c.env & 15, waves.length - 1)] || waves[0]; c.wlv = [0, 1, .5, .25][(c.env >> 4) & 3]; c.reset = true; }
    }
    frames.push(ch.map(c => ({ on: c.on && !c.rest, f: c.cur, duty: c.duty, vol: c.vol, envDir: c.envDir, envP: c.envP, reset: c.reset, wave: c.wave, wlv: c.wlv, nr43: c.nr43, L: c.panL, R: c.panR, noise: c.noise, wch: c.id === 2 })));
    for (const c of ch) c.reset = false;
    if (ch.every(c => c.loopHits.length > maxLoops || !c.on)) { done = f; break; }
  }
  // 반복 구간: 채널마다 '처음 무한 반복 지점' 이후로 주기가 같다고 보고, 가장 늦은 도입부 끝 ~ +한 바퀴
  const L1 = ch.filter(c => c.loopHits.length >= 2).map(c => [c.loopHits[0], c.loopHits[1] - c.loopHits[0]]);
  let loopStartF = 0, loopLenF = frames.length;
  if (L1.length) { loopLenF = L1[0][1]; loopStartF = Math.max(0, ...L1.map(x => x[0] - x[1])); }   // 첫 바퀴 끝 - 한 바퀴 = 반복 구간 들어간 때
  const totalF = Math.min(frames.length, loopStartF + loopLenF);
  // 2) 합성
  const spf = sampleRate / FPS, N = Math.round(totalF * spf), outL = new Float32Array(N), outR = new Float32Array(N);
  const st = ch.map(() => ({ ph: 0, vol: 0, envAcc: 0, lfsr: 0x7fff, nzAcc: 0 }));
  let s0 = 0;
  for (let f = 0; f < totalF; f++) {
    const s1 = Math.round((f + 1) * spf), R = frames[f];
    const mL = (S.volL + 1) / 8, mR = (S.volR + 1) / 8;
    R.forEach((r, k) => { const t = st[k]; if (r.reset) { t.vol = r.vol; t.envAcc = 0; if (r.wch) t.ph = 0; t.lfsr = 0x7fff; } });
    for (let s = s0; s < s1; s++) {
      let l = 0, rr = 0;
      for (let k = 0; k < R.length; k++) {
        const r = R[k], t = st[k]; if (!r.on) continue; let v = 0;
        if (r.envP && !r.wch) { t.envAcc += 64 / sampleRate; if (t.envAcc >= r.envP) { t.envAcc -= r.envP; t.vol = Math.max(0, Math.min(15, t.vol + r.envDir)); } }
        if (r.noise) {
          const sh = r.nr43 >> 4, w7 = r.nr43 & 8, dv = r.nr43 & 7, hz = 524288 / (dv ? dv : .5) / Math.pow(2, sh + 1);
          t.nzAcc += hz / sampleRate; while (t.nzAcc >= 1) { t.nzAcc -= 1; const b = (t.lfsr ^ (t.lfsr >> 1)) & 1; t.lfsr = (t.lfsr >> 1) | (b << 14); if (w7) t.lfsr = (t.lfsr & ~0x40) | (b << 6); }
          v = (t.lfsr & 1 ? -1 : 1) * t.vol / 15;
        } else if (r.wch) {
          const hz = 65536 / (2048 - r.f); t.ph = (t.ph + hz / sampleRate) % 1; const smp = r.wave[Math.floor(t.ph * 32) & 31];
          v = (smp / 7.5 - 1) * r.wlv;
        } else {
          const hz = 131072 / (2048 - r.f); t.ph = (t.ph + hz / sampleRate) % 1; v = (DUTY[r.duty][Math.floor(t.ph * 8) & 7] ? 1 : -1) * t.vol / 15;
        }
        if (r.L) l += v; if (r.R) rr += v;
      }
      outL[s] = l * mL * .22; outR[s] = rr * mR * .22;
    }
    s0 = s1;
  }
  // 직류 성분 제거 (게임보이도 출력단에 고역 통과 필터가 있다)
  for (const o of [outL, outR]) { let p = 0, y = 0; for (let i = 0; i < o.length; i++) { const x = o[i]; y = .999 * y + x - p; p = x; o[i] = y; } }
  return { L: outL, R: outR, sampleRate, loopStart: Math.round(loopStartF * spf) / sampleRate, loopEnd: N / sampleRate, frames: totalF };
}
root.GBSynth = { render, parseAsm };
// ---------- 곡 목록·불러오기 (게임 쪽) ----------
// 커밋을 고정해 두어 악보가 바뀌지 않는다
const BASE = { c: 'https://raw.githubusercontent.com/pret/pokecrystal/619f3703486b3b40f69d31b1911b58aa0a721a6e/', r: 'https://raw.githubusercontent.com/pret/pokered/171e2c204f9c1ff8e577ca387a4bbb009e130843/' };
const TR = {   // 곡 이름표 → [저장소, 파일, 곡 이름]
  azalea: ['c', 'azaleatown', 'Music_AzaleaTown'], pallet: ['r', 'pallettown', 'Music_PalletTown'], oak: ['r', 'oakslab', 'Music_OaksLab'],
  violet: ['c', 'violetcity', 'Music_VioletCity'], kanto: ['c', 'viridiancity', 'Music_ViridianCity'], surf1: ['r', 'surfing', 'Music_Surfing'],
  goldenrod: ['c', 'goldenrodcity', 'Music_GoldenrodCity'], celadon: ['c', 'celadoncity', 'Music_CeladonCity'], ecruteak: ['c', 'ecruteakcity', 'Music_EcruteakCity'],
  park: ['c', 'nationalpark', 'Music_NationalPark'], surf2: ['c', 'surf', 'Music_Surf'], lavender: ['r', 'lavender', 'Music_Lavender'],
  evo: ['c', 'evolution', 'Music_Evolution'], title: ['c', 'profoak', 'Music_ProfOak'], intro: ['c', 'bicycle', 'Music_Bicycle'],
  gymIn: ['c', 'route29', 'Music_Route29'], gymOut: ['c', 'pokemonlullaby', 'Music_PokemonLullaby'],   // 체육관 출근·퇴근 (경완 2026-10-30)
};
let worker = null, wid = 0; const waits = new Map();
function inWorker(src, opt) {
  if (worker === null) { try { const me = (typeof document !== 'undefined' && document.querySelector('script[src*="gbm.js"]')?.src) || 'gbm.js'; worker = new Worker(me); worker.onmessage = e => { const w = waits.get(e.data.id); if (w) { waits.delete(e.data.id); e.data.err ? w[1](new Error(e.data.err)) : w[0](e.data.r); } }; worker.onerror = () => { worker = false; for (const [, w] of waits) w[1](new Error('worker')); waits.clear(); }; } catch (e) { worker = false; } }
  if (!worker) return Promise.resolve(render(src, opt));
  return new Promise((ok, no) => { const id = ++wid; waits.set(id, [ok, no]); worker.postMessage({ id, src, opt }); }).catch(() => render(src, opt));
}
const memo = new Map();
// cache: { get(key) → 글|null, put(key, 글) } (게임의 IndexedDB)
async function text(path, repo, cache) {
  const k = 'gb:' + repo + ':' + path; if (memo.has(k)) return memo.get(k);
  let t = null; try { t = await cache?.get(k); if (t && typeof t !== 'string') t = await t.text(); } catch (e) { t = null; }
  if (!t) { const r = await fetch(BASE[repo] + path); if (!r.ok) throw new Error('fetch ' + path); t = await r.text(); try { cache?.put(k, t); } catch (e) {} }
  memo.set(k, t); return t;
}
async function get(id, ctx, cache, sampleRate = 32000) {
  const d = TR[id]; if (!d) return null; const [repo, file, start] = d;
  const music = await text(`audio/music/${file}.asm`, repo, cache), waves = await text('audio/wave_samples.asm', repo, cache), src = { music, waves };
  if (repo === 'c') src.drums = await text('audio/drumkits.asm', repo, cache);
  else { src.noise = {}; const ns = [...new Set([...music.matchAll(/drum_note\s+(\d+)/g)].map(m => +m[1]))]; await Promise.all(ns.map(async n => { src.noise[n] = await text(`audio/sfx/noise_instrument${String(n).padStart(2, '0')}_1.asm`, repo, cache); })); }
  const r = await inWorker(src, { start, sampleRate });
  const b = ctx.createBuffer(2, r.L.length, r.sampleRate); b.getChannelData(0).set(r.L); b.getChannelData(1).set(r.R); b.gbLoop = [r.loopStart, r.loopEnd]; return b;
}
root.GBSynth.TR = TR; root.GBSynth.get = get; root.GBSynth.has = id => !!TR[id];
// 일꾼으로 띄웠을 때: 합성만
if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof importScripts === 'function') self.onmessage = e => { try { const r = render(e.data.src, e.data.opt); self.postMessage({ id: e.data.id, r }, [r.L.buffer, r.R.buffer]); } catch (er) { self.postMessage({ id: e.data.id, err: String(er && er.message || er) }); } };

if (typeof module !== 'undefined') module.exports = root.GBSynth;
})(typeof self !== 'undefined' ? self : globalThis);
