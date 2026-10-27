// 닌텐도 DS 소리(SSEQ 곡 · SBNK 악기 · SWAR 소리 묶음)를 그대로 연주해 PCM 으로 만든다.
// 체육관 BGM: 플래티넘 원본 소리 데이터(pret/pokeplatinum sound_data.sdat)에서 필요한 조각만 받아 와 이걸로 튼다.
// DS 소리 엔진(SDK 의 SND)을 따라 만든 것: 192Hz 마다 시퀀서·엔벨로프 갱신, 데시벨 단위 볼륨, 1/64 반음 단위 음높이.
(function (G) {
  'use strict';
  const RATE = 32728;                       // DS 믹서 출력 주파수 (33513982 / 1024)
  const FRAME = 64 * 2728 / 33513982;       // 시퀀서 갱신 간격 ≈ 5.21ms
  const SPF = RATE * FRAME;                 // 갱신 한 번당 샘플 수 ≈ 170.5
  const CLOCK = 16756991;                   // 소리 타이머 클럭
  const AMIN = -723, ATH = AMIN << 7;       // 엔벨로프 바닥(-72.3dB)

  const u8 = (d, o) => d[o], s8 = (d, o) => (d[o] << 24) >> 24;
  const u16 = (d, o) => d[o] | d[o + 1] << 8, s16 = (d, o) => (u16(d, o) << 16) >> 16;
  const u24 = (d, o) => d[o] | d[o + 1] << 8 | d[o + 2] << 16;
  const u32 = (d, o) => (d[o] | d[o + 1] << 8 | d[o + 2] << 16 | d[o + 3] << 24) >>> 0;

  // 0~127 → 1/10 dB (DS 의 데시벨 제곱 표와 같은 값: 400·log10(x/127))
  const SUST = new Int16Array(128);
  for (let x = 0; x < 128; x++) SUST[x] = x ? Math.max(AMIN + 1, Math.round(400 * Math.log10(x / 127))) : -32768;
  const sust = x => SUST[Math.max(0, Math.min(127, x))];
  const ATT = [0x00, 0x01, 0x05, 0x0E, 0x1A, 0x26, 0x33, 0x3F, 0x49, 0x54, 0x5C, 0x64, 0x6D, 0x74, 0x7B, 0x7F, 0x84, 0x89, 0x8F];
  const cnvAtt = a => a >= 0x6D ? ATT[0x7F - a] : 0xFF - a;
  const cnvFall = x => x === 0x7F ? 0xFFFF : x === 0x7E ? 0x3C00 : x < 0x32 ? x * 2 + 1 : (0x1E00 / (0x7E - x)) | 0;
  const sine = i => Math.round(Math.sin(i * Math.PI / 64) * 127);   // 128 칸 한 바퀴

  // ---------- 파일 읽기 ----------
  function parseBank(d) {
    const n = u32(d, 0x38), ins = [];
    const reg = o => ({ wav: u16(d, o), war: u16(d, o + 2), key: d[o + 4], a: d[o + 5], dc: d[o + 6], s: d[o + 7], r: d[o + 8], pan: d[o + 9] });
    for (let i = 0; i < n; i++) {
      const t = d[0x3C + i * 4], o = u16(d, 0x3D + i * 4);
      if (t >= 1 && t <= 4) ins.push({ t, regs: [Object.assign(reg(o), { t })] });
      else if (t === 16) {   // 드럼 세트: 건반마다 다른 소리
        const lo = d[o], hi = d[o + 1], regs = [];
        for (let k = lo; k <= hi; k++) { const p = o + 2 + (k - lo) * 12; regs.push(Object.assign(reg(p + 2), { t: u16(d, p), lo: k, hi: k })); }
        ins.push({ t, regs });
      } else if (t === 17) { // 건반 나누기
        const regs = []; let lo = 0, p = o + 8;
        for (let j = 0; j < 8 && d[o + j]; j++) { regs.push(Object.assign(reg(p + 2), { t: u16(d, p), lo, hi: d[o + j] })); lo = d[o + j] + 1; p += 12; }
        ins.push({ t, regs });
      } else ins.push(null);
    }
    return ins;
  }
  const IMA = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767];
  const IDX = [-1, -1, -1, -1, 2, 4, 6, 8];
  function parseWar(d) {
    const n = u32(d, 0x38), out = [];
    for (let i = 0; i < n; i++) out.push({ o: u32(d, 0x3C + i * 4), pcm: null });
    out.d = d; return out;
  }
  function wave(war, i) {   // SWAV → Float32 (처음 쓸 때 풀어 둔다)
    const w = war && war[i]; if (!w) return null; if (w.pcm) return w;
    const d = war.d, o = w.o, ty = d[o], loop = d[o + 1], tm = u16(d, o + 4), lo = u16(d, o + 6), nl = u32(d, o + 8), p = o + 12;
    let pcm, ls;
    if (ty === 0) { const n = (lo + nl) * 4; pcm = new Float32Array(n); for (let k = 0; k < n; k++) pcm[k] = s8(d, p + k) / 128; ls = lo * 4; }
    else if (ty === 1) { const n = (lo + nl) * 2; pcm = new Float32Array(n); for (let k = 0; k < n; k++) pcm[k] = s16(d, p + k * 2) / 32768; ls = lo * 2; }
    else {
      const n = (lo + nl - 1) * 8; pcm = new Float32Array(n);
      let s = s16(d, p), x = Math.min(88, d[p + 2]);
      for (let k = 0; k < n; k++) {
        const b = d[p + 4 + (k >> 1)], nb = k & 1 ? b >> 4 : b & 15, st = IMA[x];
        let df = st >> 3; if (nb & 1) df += st >> 2; if (nb & 2) df += st >> 1; if (nb & 4) df += st;
        s = nb & 8 ? Math.max(-0x7FFF, s - df) : Math.min(0x7FFF, s + df);
        x = Math.max(0, Math.min(88, x + IDX[nb & 7])); pcm[k] = s / 32768;
      }
      ls = Math.max(0, (lo - 1) * 8);
    }
    w.pcm = pcm; w.loop = !!loop; w.ls = ls; w.rate = CLOCK / tm; return w;
  }
  // 사각파(PSG) · 잡음
  const PSG = [], PSG_RATE = CLOCK / 8006;   // 기준 건반에서 261.6Hz (DS 기준 타이머 8006)
  for (let dty = 0; dty < 8; dty++) { const a = new Float32Array(8); for (let k = 0; k < 8; k++) a[k] = dty < 7 && k > 6 - dty ? 1 : -1; PSG.push({ pcm: dty < 7 ? a : new Float32Array(8), loop: true, ls: 0, rate: PSG_RATE }); }
  const NOISE = (() => { const a = new Float32Array(32767); let x = 0x7FFF; for (let k = 0; k < a.length; k++) { const c = x & 1; x >>= 1; if (c) x ^= 0x6000; a[k] = c ? -1 : 1; } return { pcm: a, loop: true, ls: 0, rate: CLOCK / 8006 }; })();

  // ---------- 연주 ----------
  function Player(seq, bank, wars, seqVol) {
    this.d = seq; this.base = u32(seq, 0x18); this.bank = bank; this.wars = wars; this.seqVol = sust(seqVol == null ? 127 : seqVol);
    this.tracks = []; this.voices = []; this.tempo = 120; this.tc = 0; this.master = 127; this.vars = new Int16Array(32).fill(-1);
    this.rnd = 0x12345678; this.frame = 0; this.loopEv = [];
    this.open(0, this.base);
  }
  const P = Player.prototype;
  P.rand = function () { this.rnd = (Math.imul(this.rnd, 1664525) + 1013904223) >>> 0; return this.rnd >>> 16; };
  P.open = function (n, pc) {
    this.tracks[n] = { n, pc, wait: 0, end: false, stack: [], vol: 127, expr: 127, pan: 64, tr: 0, bend: 0, range: 2, wt: true, tie: false,
      porta: false, pKey: 60, pTime: 0, sweep: 0, mDepth: 0, mSpeed: 16, mType: 0, mRange: 1, mDelay: 0, a: 255, dc: 255, s: 255, r: 255, prg: 0, cmp: true, loops: 0 };
  };
  P.vlen = function (t) { let v = 0, b; do { b = this.d[t.pc++]; v = v << 7 | b & 0x7F; } while (b & 0x80); return v; };
  // mode: 0 보통, 1 무작위 범위, 2 변수
  P.arg = function (t, kind, mode) {
    const d = this.d;
    if (mode === 1) { const lo = s16(d, t.pc), hi = s16(d, t.pc + 2); t.pc += 4; return lo + this.rand() % (hi - lo + 1); }
    if (mode === 2) return this.vars[d[t.pc++] & 31];
    if (kind === 'v') return this.vlen(t);
    if (kind === 1) return d[t.pc++];
    if (kind === -1) return s8(d, t.pc++);
    if (kind === 2) { const v = u16(d, t.pc); t.pc += 2; return v; }
    if (kind === -2) { const v = s16(d, t.pc); t.pc += 2; return v; }
  };
  P.step = function (t) {   // 명령 하나
    const d = this.d; let c = d[t.pc++], mode = 0, run = true;
    if (c === 0xA2) { run = t.cmp; c = d[t.pc++]; }
    if (c === 0xA0 || c === 0xA1) { mode = c === 0xA0 ? 1 : 2; c = d[t.pc++]; }
    if (c < 0x80) {
      const vel = d[t.pc++], dur = this.arg(t, 'v', mode);
      if (run) { this.note(t, c + t.tr, vel, dur); if (t.wt) t.wait = dur; }
      return;
    }
    switch (c) {
      case 0x80: { const v = this.arg(t, 'v', mode); if (run) t.wait = v; return; }
      case 0x81: { const v = this.arg(t, 'v', mode); if (run) t.prg = v; return; }
      case 0x93: { const n = d[t.pc], o = u24(d, t.pc + 1); t.pc += 4; if (run && !this.tracks[n]) this.open(n, this.base + o); return; }
      case 0x94: { const o = this.base + u24(d, t.pc); t.pc += 3; if (run) { if (o < t.pc) this.loopEvent(t); t.pc = o; } return; }
      case 0x95: { const o = this.base + u24(d, t.pc); t.pc += 3; if (run && t.stack.length < 3) { t.stack.push({ pc: t.pc, call: true }); t.pc = o; } return; }
      case 0xFD: { if (!run) return; while (t.stack.length) { const f = t.stack.pop(); if (f.call) { t.pc = f.pc; return; } } return; }
      case 0xD4: { const v = this.arg(t, 1, mode); if (run && t.stack.length < 3) t.stack.push({ pc: t.pc, n: v }); return; }
      case 0xFC: {
        if (!run) return; const f = t.stack[t.stack.length - 1]; if (!f || f.call) return;
        if (f.n === 0) { this.loopEvent(t); t.pc = f.pc; return; }
        if (--f.n > 0) t.pc = f.pc; else t.stack.pop(); return;
      }
      case 0xFE: t.pc += 2; return;
      case 0xFF: if (run) { t.end = true; this.releaseTrack(t); } return;
      case 0xE0: { const v = this.arg(t, -2, mode); if (run) t.mDelay = v; return; }
      case 0xE1: { const v = this.arg(t, -2, mode); if (run) this.tempo = v; return; }
      case 0xE3: { const v = this.arg(t, -2, mode); if (run) t.sweep = v; return; }
    }
    if (c >= 0xB0 && c <= 0xBD) {
      const vi = d[t.pc++] & 31, v = this.arg(t, -2, mode); if (!run) return;
      const V = this.vars;
      switch (c) {
        case 0xB0: V[vi] = v; break; case 0xB1: V[vi] += v; break; case 0xB2: V[vi] -= v; break; case 0xB3: V[vi] *= v; break;
        case 0xB4: if (v) V[vi] = (V[vi] / v) | 0; break; case 0xB5: V[vi] = v < 0 ? V[vi] >> -v : V[vi] << v; break;
        case 0xB6: V[vi] = v < 0 ? -(this.rand() % (1 - v)) : this.rand() % (v + 1); break;
        case 0xB8: t.cmp = V[vi] === v; break; case 0xB9: t.cmp = V[vi] >= v; break; case 0xBA: t.cmp = V[vi] > v; break;
        case 0xBB: t.cmp = V[vi] <= v; break; case 0xBC: t.cmp = V[vi] < v; break; case 0xBD: t.cmp = V[vi] !== v; break;
      }
      return;
    }
    if (c >= 0xC0 && c <= 0xD6) {
      const v = this.arg(t, c === 0xC3 || c === 0xC4 ? -1 : 1, mode); if (!run) return;
      switch (c) {
        case 0xC0: t.pan = v; break; case 0xC1: t.vol = v; break; case 0xC2: this.master = v; break; case 0xC3: t.tr = v; break;
        case 0xC4: t.bend = v; break; case 0xC5: t.range = v; break; case 0xC7: t.wt = !!v; break;
        case 0xC8: t.tie = !!v; this.releaseTrack(t); break; case 0xC9: t.pKey = v + t.tr; t.porta = true; break;
        case 0xCA: t.mDepth = v; break; case 0xCB: t.mSpeed = v; break; case 0xCC: t.mType = v; break; case 0xCD: t.mRange = v; break;
        case 0xCE: t.porta = !!v; break; case 0xCF: t.pTime = v; break;
        case 0xD0: t.a = v; break; case 0xD1: t.dc = v; break; case 0xD2: t.s = v; break; case 0xD3: t.r = v; break;
        case 0xD5: t.expr = v; break;
      }
      return;
    }
    t.end = true;   // 모르는 명령: 그 트랙만 멈춘다
  };
  P.loopEvent = function (t) { t.loops++; if (t.loops <= 2) this.loopEv.push({ n: t.n, k: t.loops, f: this.frame }); };
  P.releaseTrack = function (t) { for (const v of this.voices) if (v.t === t && v.st < 3) v.st = 3; };
  P.region = function (key) {
    const ins = this.bank[this.prgOf]; if (!ins) return null;
    if (ins.t < 16) return ins.regs[0];
    return ins.regs.find(r => key >= r.lo && key <= r.hi) || null;
  };
  P.note = function (t, key, vel, dur) {
    if (this.log) this.log.push([t.n, this.ticks, key, vel, dur]);
    if (this.quiet) { if (t.porta) t.pKey = key; return; }
    this.prgOf = t.prg; const r = this.region(key); if (!r) return;
    let w = null;
    if (r.t === 1) w = wave(this.wars[r.war], r.wav);
    else if (r.t === 2) w = PSG[r.wav & 7];
    else if (r.t === 3) w = NOISE;
    if (!w) return;
    let v = null;
    if (t.tie) v = this.voices.find(x => x.t === t && x.st < 3);
    let sw = t.sweep;
    if (t.porta) sw += (t.pKey - key) << 6;
    t.pKey = key;
    if (v) {   // 이음줄: 같은 소리로 건반만 바꾼다
      v.key = key; v.vel = sust(vel); v.dur = -1;
    } else {
      if (this.voices.length >= 16) {
        let k = this.voices.findIndex(x => x.st === 3); if (k < 0) k = 0;
        this.voices.splice(k, 1);
      }
      const ad = (tv, iv) => tv !== 255 ? tv : iv;
      v = { t, w, r, key, vel: sust(vel), pos: 0, st: 0, amp: ATH, dur: t.tie ? -1 : Math.max(1, dur),
        att: cnvAtt(ad(t.a, r.a)), dec: cnvFall(ad(t.dc, r.dc)), sus: sust(ad(t.s, r.s)) << 7, rel: cnvFall(ad(t.r, r.r)),
        mc: 0, md: 0, gl: 0, gr: 0 };
      this.voices.push(v);
    }
    v.sw = sw; v.swc = 0;
    if (!sw) v.swl = 0;
    else if (t.pTime) { v.swl = (t.pTime * t.pTime * Math.abs(sw)) >> 11; v.swTick = false; }
    else { v.swl = dur > 0 ? dur : 0; v.swTick = true; }
  };
  P.tick = function () {
    this.ticks = (this.ticks || 0) + 1;
    for (const v of this.voices) {
      if (v.dur > 0 && --v.dur === 0 && v.st < 3) v.st = 3;
      if (v.swTick && v.swc < v.swl) v.swc++;
    }
    for (let i = 0; i < this.tracks.length; i++) {
      const t = this.tracks[i]; if (!t || t.end) continue;
      if (t.wait > 0 && --t.wait > 0) continue;
      let guard = 0;
      while (!t.end && t.wait === 0 && guard++ < 4096) this.step(t);
      if (guard >= 4096) t.end = true;
    }
  };
  P.seqFrame = function () {
    this.frame++;
    while (this.tc >= 240) { this.tc -= 240; this.tick(); }
    this.tc += this.tempo;
  };
  P.alive = function () { return this.tracks.some(t => t && !t.end); };
  // 엔벨로프·음높이·볼륨 갱신 후 n 샘플 섞기
  P.mix = function (L, R, o, n) {
    const vs = this.voices, ext0 = this.seqVol + sust(this.master);
    for (let i = vs.length - 1; i >= 0; i--) {
      const v = vs[i], t = v.t;
      if (v.st === 0) { v.amp = Math.trunc(v.att * v.amp / 255); if (v.amp === 0) v.st = 1; }
      else if (v.st === 1) { v.amp -= v.dec; if (v.amp <= v.sus) { v.amp = v.sus; v.st = 2; } }
      else if (v.st === 3) { v.amp -= v.rel; if (v.amp <= ATH) { vs.splice(i, 1); continue; } }
      let mod = 0;
      if (t.mDepth) { if (v.md < t.mDelay) v.md++; else { v.mc = (v.mc + (t.mSpeed << 6)) & 0x7FFF; mod = sine(v.mc >> 8) * t.mRange * t.mDepth; } }
      let pitch = (v.key - v.r.key) * 64 + ((t.bend * t.range) >> 1);
      if (v.swl && v.swc < v.swl) { pitch += Math.trunc(v.sw * (v.swl - v.swc) / v.swl); if (!v.swTick) v.swc++; }
      let vol = (v.amp >> 7) + ext0 + sust(t.vol) + sust(t.expr) + v.vel, pan = t.pan - 64 + v.r.pan - 64;
      if (mod) { if (t.mType === 0) pitch += mod >> 8; else if (t.mType === 1) vol += (mod * 60) >> 14; else pan += mod >> 8; }
      pan = Math.max(0, Math.min(127, pan + 64));
      const a = vol <= AMIN ? 0 : Math.pow(10, vol / 200), gl = a * (128 - pan) / 128, gr = a * pan / 128;
      const w = v.w, pcm = w.pcm, len = pcm.length, inc = w.rate * Math.pow(2, pitch / 768) / RATE;
      if (L) {
        const dl = (gl - v.gl) / n, dr = (gr - v.gr) / n; let cl = v.gl, cr = v.gr, p = v.pos;
        for (let k = 0; k < n; k++) {
          const ip = p | 0, fr = p - ip, nx = ip + 1 < len ? ip + 1 : w.loop ? w.ls : ip;
          const s = pcm[ip] + (pcm[nx] - pcm[ip]) * fr;
          cl += dl; cr += dr; L[o + k] += s * cl; R[o + k] += s * cr;
          p += inc;
          if (p >= len) { if (w.loop && len > w.ls) { p = w.ls + (p - len) % (len - w.ls); } else { p = -1; break; } }
        }
        v.pos = p;
      } else { v.pos += inc * n; if (v.pos >= len) v.pos = w.loop && len > w.ls ? w.ls + (v.pos - len) % (len - w.ls) : -1; }
      v.gl = gl; v.gr = gr;
      if (v.pos < 0) vs.splice(i, 1);
    }
  };

  // 곡 전체를 만든다: 처음 부분 + 한 바퀴(두 번째 바퀴를 써서 앞 바퀴의 잔향까지 이어지게). loopStart~끝을 반복.
  function render(o) {
    const MAXF = Math.ceil(400 / FRAME);
    // 1) 소리 없이 악보만 돌려 반복 지점을 찾는다
    const p1 = new Player(o.seq, o.bank, o.wars, o.vol); p1.quiet = true;
    while (p1.frame < MAXF && p1.alive()) {
      p1.seqFrame();
      const done = p1.tracks.every(t => !t || t.end || t.loops >= 2);
      if (done && p1.loopEv.length) break;
    }
    let t1 = 0, L = 0;
    const byT = {};
    for (const e of p1.loopEv) (byT[e.n] = byT[e.n] || [])[e.k - 1] = e.f;
    for (const n in byT) { const a = byT[n]; if (a[1] != null && a[1] - a[0] > L) { L = a[1] - a[0]; t1 = a[0]; } }
    const looped = L > 0;
    const endF = looped ? t1 + L : p1.frame + Math.ceil(3 / FRAME);
    const sp = f => Math.floor(f * SPF);
    const introF = looped ? t1 - L : endF;
    const total = looped ? sp(introF) + (sp(t1 + L) - sp(t1)) : sp(endF);
    const outL = new Float32Array(total), outR = new Float32Array(total);
    const tmpL = new Float32Array(400), tmpR = new Float32Array(400);
    // 2) 실제로 섞는다
    const p = new Player(o.seq, o.bank, o.wars, o.vol);
    for (let f = 0; f < endF; f++) {
      p.seqFrame();
      const a = sp(f), n = sp(f + 1) - a;
      if (f < introF) p.mix(outL, outR, a, n);
      else if (looped && f >= t1) p.mix(outL, outR, a - sp(t1) + sp(introF), n);
      else { tmpL.fill(0, 0, n); tmpR.fill(0, 0, n); p.mix(tmpL, tmpR, 0, n); }
      if (!looped && !p.alive() && !p.voices.length) break;
    }
    let pk = 0; for (let k = 0; k < total; k++) pk = Math.max(pk, Math.abs(outL[k]), Math.abs(outR[k]));
    const g = o.gain || (pk ? Math.min(3, .9 / pk) : 1);   // 곡마다 가장 큰 소리를 0.9 에 맞춘다
    for (let k = 0; k < total; k++) { outL[k] = Math.max(-1, Math.min(1, outL[k] * g)); outR[k] = Math.max(-1, Math.min(1, outR[k] * g)); }
    return { L: outL, R: outR, rate: RATE, loop: looped, loopStart: looped ? sp(introF) : 0 };
  }

  G.SSEQ = { parseBank, parseWar, render, RATE, Player };

  // 일꾼(Worker)으로 불렸을 때: 화면이 멈추지 않게 여기서 곡을 만든다. 풀어 둔 악기는 계속 들고 있다
  if (typeof window === 'undefined' && typeof importScripts === 'function') {
    const banks = {}, wars = {};
    G.onmessage = e => {
      const m = e.data;
      try {
        if (!banks[m.bankKey]) banks[m.bankKey] = parseBank(new Uint8Array(m.bank));
        const ws = m.warKeys.map((k, i) => k == null ? null : wars[k] || (wars[k] = parseWar(new Uint8Array(m.wars[i]))));
        const r = render({ seq: new Uint8Array(m.seq), bank: banks[m.bankKey], wars: ws, vol: m.vol });
        G.postMessage({ id: m.id, L: r.L, R: r.R, rate: r.rate, loop: r.loop, loopStart: r.loopStart }, [r.L.buffer, r.R.buffer]);
      } catch (err) { G.postMessage({ id: m.id, err: String(err) }); }
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
