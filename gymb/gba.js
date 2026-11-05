// GBA(에메랄드) 소리: MIDI 악보 + 음색 묶음(voicegroup) 을 m4a 소리 엔진처럼 연주해 PCM 으로 만든다.
// v16.94 경완 '에메랄드 원곡': pret/pokeemerald 의 sound/songs/midi/*.mid, direct_sound_samples/*.wav, programmable_wave_samples/*.pcm 을
// 고정 커밋에서 받아 와서(gym/bgm.js) 여기(일꾼)로 넘긴다. 음색 설정은 gym/gba.json (tools 없이 /tmp 스크립트로 voicegroup .inc 에서 뽑음).
// m4a 따라 한 것: 60Hz 마다 엔벨로프·LFO 갱신, 다이렉트 사운드 ADSR(0~255), 게임보이 채널(사각파 1·2, 웨이브, 노이즈) ADSR(0~15)와 채널 하나씩만 쓰기.
(function (G) {
  'use strict';
  const RATE = 32768, FR = 59.7275, SPF = RATE / FR;
  const CGB_W = .55, DS_W = 1;

  // ---------- MIDI ----------
  function parseMidi(d) {
    const u32 = o => (d[o] << 24 | d[o + 1] << 16 | d[o + 2] << 8 | d[o + 3]) >>> 0, u16 = o => d[o] << 8 | d[o + 1];
    const nt = u16(10), div = u16(12); let o = 14; const ev = [];
    for (let t = 0; t < nt; t++) {
      const n = u32(o + 4); let p = o + 8; const e = p + n; o = e; let tick = 0, rs = 0;
      const vl = () => { let v = 0, b; do { b = d[p++]; v = v << 7 | b & 127; } while (b & 128); return v; };
      while (p < e) {
        tick += vl(); let s = d[p];
        if (s === 0xFF) { const ty = d[p + 1]; p += 2; const l = vl(); ev.push({ t: tick, k: 'meta', ty, d: d.subarray(p, p + l) }); p += l; continue; }
        if (s === 0xF0 || s === 0xF7) { p++; p += vl(); continue; }
        if (s & 128) { rs = s; p++; } const st = rs & 0xF0, ch = rs & 15;
        if (st === 0xC0 || st === 0xD0) { ev.push({ t: tick, k: st, ch, a: d[p++] }); }
        else { ev.push({ t: tick, k: st, ch, a: d[p], b: d[p + 1] }); p += 2; }
      }
    }
    ev.sort((x, y) => x.t - y.t || (x.k === 'meta' ? -1 : 0) - (y.k === 'meta' ? -1 : 0) || ((x.k === 0x80 || (x.k === 0x90 && !x.b)) ? -1 : 0) - ((y.k === 0x80 || (y.k === 0x90 && !y.b)) ? -1 : 0));
    let ls = -1, le = -1, end = 0;
    for (const e of ev) { end = Math.max(end, e.t); if (e.k === 'meta' && e.ty === 6) { const s = String.fromCharCode(...e.d); if (s === '[') ls = e.t; if (s === ']') le = e.t; } }
    return { ev, div, ls, le, end };
  }

  // ---------- 소리 조각 ----------
  function parseWav(d) {
    const u32 = o => (d[o] | d[o + 1] << 8 | d[o + 2] << 16 | d[o + 3] << 24) >>> 0;
    let o = 12, rate = 13379, data = null, loop = -1, pitch = 0;
    while (o + 8 <= d.length) {
      const id = String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3]), n = u32(o + 4), q = o + 8;
      if (id === 'fmt ') rate = u32(q + 4);
      else if (id === 'smpl') { if (u32(q + 28) > 0) loop = u32(q + 36 + 8); }
      else if (id === 'agbp') pitch = u32(q) / 1024;
      else if (id === 'data') { data = new Float32Array(n); for (let i = 0; i < n; i++) data[i] = (d[q + i] - 128) / 128; }
      o = q + n + (n & 1);
    }
    return { rate: pitch || rate, data: data || new Float32Array(1), loop };
  }
  function parsePcm(d) { const w = new Float32Array(32); for (let i = 0; i < 16; i++) { w[i * 2] = ((d[i] >> 4) - 7.5) / 7.5; w[i * 2 + 1] = ((d[i] & 15) - 7.5) / 7.5; } return w; }

  const DUTY = [.125, .25, .5, .75];
  const kf = k => 440 * Math.pow(2, (k - 69) / 12);

  // ---------- 연주 ----------
  function render(o) {
    const M = parseMidi(o.mid), man = o.man, V = man.v, KS = man.ks, smp = {}, mvl = (man.V || 127) / 127;
    for (const k in o.smp) smp[k] = /\.pcm$/.test(k) ? parsePcm(o.smp[k]) : parseWav(o.smp[k]);
    const loopOn = M.ls >= 0 && M.le > M.ls, endT = loopOn ? M.le : M.end;
    // 템포 → 초
    const tempo = M.ev.filter(e => e.k === 'meta' && e.ty === 0x51).map(e => ({ t: e.t, us: e.d[0] << 16 | e.d[1] << 8 | e.d[2] }));
    const t2s = t => { let s = 0, lt = 0, us = 500000; for (const x of tempo) { if (x.t >= t) break; s += (x.t - lt) * us / M.div / 1e6; lt = x.t; us = x.us; } return s + (t - lt) * us / M.div / 1e6; };
    const total = Math.ceil((t2s(endT) + (loopOn ? 0 : 1.5)) * RATE);
    const L = new Float32Array(total), R = new Float32Array(total);
    const chs = Array.from({ length: 16 }, () => ({ prog: 0, vol: 100, exp: 127, pan: 64, bend: 0, br: 2, mod: 0, lfos: 22, modt: 0, lfodl: 0, tune: 0 }));
    const voices = [], cgb = { 1: null, 2: null, 3: null, 4: null };
    const vOf = (ch, key) => {
      let v = V[o.man.b + ch.prog], k = key;
      if (!v) return null;
      if (v.t === 'ks') { const i = (KS[v.tb] || '').charCodeAt(key) - 48; if (!(i >= 0)) return null; v = V[v.b + i]; }
      else if (v.t === 'dr') { v = V[v.b + key]; if (!v) return null; k = v.k; }
      return v ? [v, k] : null;
    };
    function noteOn(c, ch, key, vel) {
      const r = vOf(ch, key); if (!r) return; const [v, k] = r;
      const x = { v, ch, key, k, vel: vel / 127, env: 0, st: 0, cnt: 0, pos: 0, ph: 0, lfoPh: 0, lfoT: 0, lfsr: 0x7FFF, on: true, cgb: v.t !== 'ds' };
      if (v.t === 'ds') { const s = smp[v.s]; if (!s) return; x.s = s; if (v.rev) x.pos = s.data.length - 1; }
      else if (v.t === 'wv') { x.w = smp[v.s]; if (!x.w) return; }
      if (x.cgb) { const slot = v.t === 'sq' ? v.c : v.t === 'wv' ? 3 : 4; const old = cgb[slot]; if (old) old.dead = true; cgb[slot] = x; x.slot = slot; }
      voices.push(x);
    }
    function noteOff(c, key) { for (const x of voices) if (x.on && x.ch === chs[c] && x.key === key) { x.on = false; x.st = 3; x.cnt = 0; } }
    // 엔벨로프 (60Hz)
    function envStep(x) {
      const [A, D, S, Rr] = x.v.adsr;
      if (!x.cgb) {
        if (x.st === 0) { x.env += A; if (x.env >= 255) { x.env = 255; x.st = 1; } }
        else if (x.st === 1) { x.env = (x.env * D) >> 8; if (x.env <= S) { x.env = S; x.st = 2; } }
        else if (x.st === 3) { x.env = (x.env * Rr) >> 8; if (x.env <= 0) x.dead = true; }
        if (x.st === 2 && S === 0) x.dead = true;
      } else {
        if (x.st === 0) { if (!A) { x.env = 15; x.st = 1; } else if (++x.cnt >= A) { x.cnt = 0; if (++x.env >= 15) { x.env = 15; x.st = 1; } } }
        else if (x.st === 1) { if (!D || x.env <= S) { x.env = Math.max(S, D ? x.env : S); if (x.env <= S) x.st = 2; } else if (++x.cnt >= D) { x.cnt = 0; x.env--; } }
        else if (x.st === 3) { if (!Rr) x.dead = true; else if (++x.cnt >= Rr) { x.cnt = 0; if (--x.env <= 0) x.dead = true; } }
        if (x.st === 2 && S === 0) x.dead = true;
      }
      if (x.ch.mod && ++x.lfoT > x.ch.lfodl) x.lfoPh = (x.lfoPh + x.ch.lfos) & 255; else if (!x.ch.mod) { x.lfoPh = 0; x.lfoT = 0; }
    }
    // 이벤트를 따라가며 60Hz 칸마다 섞는다
    let ei = 0; const evs = M.ev;
    const tickAt = s => { // 초 → 틱 (단조)
      let acc = 0, lt = 0, us = 500000;
      for (const x of tempo) { const d = (x.t - lt) * us / M.div / 1e6; if (acc + d > s) break; acc += d; lt = x.t; us = x.us; }
      return lt + (s - acc) * 1e6 * M.div / us;
    };
    const nFr = Math.ceil(total / SPF);
    const evTime = evs.map(e => t2s(e.t));
    for (let f = 0; f < nFr; f++) {
      const s0 = Math.floor(f * SPF), s1 = Math.min(total, Math.floor((f + 1) * SPF)), tNow = s1 / RATE;
      while (ei < evs.length && evTime[ei] <= tNow && evs[ei].t <= endT) {
        const e = evs[ei++]; if (e.k === 'meta') continue; const ch = chs[e.ch];
        if (loopOn && e.t >= endT) continue;
        if (e.k === 0x90 && e.b) noteOn(e.ch, ch, e.a, e.b);
        else if (e.k === 0x80 || e.k === 0x90) noteOff(e.ch, e.a);
        else if (e.k === 0xC0) ch.prog = e.a;
        else if (e.k === 0xE0) ch.bend = ((e.b << 7 | e.a) - 8192) / 8192;
        else if (e.k === 0xB0) {
          const v = e.b; switch (e.a) { case 7: ch.vol = v; break; case 11: ch.exp = v; break; case 10: ch.pan = v; break; case 1: ch.mod = v; break; case 20: ch.br = v; break; case 21: ch.lfos = v; break; case 22: ch.modt = v; break; case 24: ch.tune = (v - 64) / 64; break; case 26: ch.lfodl = v; break; }
        }
      }
      for (let i = voices.length - 1; i >= 0; i--) { const x = voices[i]; envStep(x); if (x.dead) { if (x.cgb && cgb[x.slot] === x) cgb[x.slot] = null; voices.splice(i, 1); } }
      for (const x of voices) {
        const ch = x.ch, v = x.v, lfo = Math.sin(x.lfoPh / 256 * 2 * Math.PI) * ch.mod / 127;
        const semi = ch.bend * ch.br + ch.tune + (ch.modt === 0 ? lfo * .5 : 0);
        let amp = (ch.vol / 127) * (man.E ? ch.exp / 127 : 1) * x.vel * mvl * (ch.modt === 1 ? 1 - Math.abs(lfo) * .5 : 1);
        let pan = v.p ? v.p : ch.pan; if (ch.modt === 2) pan = Math.max(0, Math.min(127, pan + lfo * 64));
        let gl, gr;
        if (!x.cgb) { amp *= x.env / 255 * DS_W; gl = Math.min(1, (128 - pan) / 64); gr = Math.min(1, pan / 64); }
        else { amp *= x.env / 15 * CGB_W; gl = pan > 96 ? 0 : 1; gr = pan < 32 ? 0 : 1; }
        const al = amp * gl, ar = amp * gr;
        if (v.t === 'ds') {
          const s = x.s, dat = s.data, n = dat.length, step = (v.fix ? s.rate : s.rate * Math.pow(2, (x.k - 60 + semi) / 12)) / RATE * (v.rev ? -1 : 1);
          for (let j = s0; j < s1; j++) {
            let p = x.pos;
            if (p >= n || p < 0) { if (s.loop >= 0 && !v.rev) { p = s.loop + (p - n) % Math.max(1, n - s.loop); x.pos = p; } else { x.dead = true; break; } }
            const i0 = p | 0, fr = p - i0, a = dat[i0], b = i0 + 1 < n ? dat[i0 + 1] : (s.loop >= 0 ? dat[s.loop] : 0), y = a + (b - a) * fr;
            L[j] += y * al; R[j] += y * ar; x.pos += step;
          }
        } else if (v.t === 'sq') {
          if (x.dead) continue; const inc = kf(x.k + semi) / RATE, du = DUTY[v.du];
          for (let j = s0; j < s1; j++) { const y = x.ph < du ? 1 : -1; L[j] += y * al; R[j] += y * ar; x.ph += inc; if (x.ph >= 1) x.ph -= 1; }
        } else if (v.t === 'wv') {
          if (x.dead) continue; const inc = kf(x.k + semi) / RATE * 32, w = x.w;
          for (let j = s0; j < s1; j++) { const y = w[x.ph | 0]; L[j] += y * al; R[j] += y * ar; x.ph += inc; while (x.ph >= 32) x.ph -= 32; }
        } else if (v.t === 'ns') {
          if (x.dead) continue; const clk = Math.min(RATE * 4, 4096 * Math.pow(2, (x.k - 60 + semi) / 6)), inc = clk / RATE, w7 = v.per;
          for (let j = s0; j < s1; j++) {
            x.ph += inc; while (x.ph >= 1) { x.ph -= 1; const bit = (x.lfsr ^ (x.lfsr >> 1)) & 1; x.lfsr = (x.lfsr >> 1) | (bit << 14); if (w7) x.lfsr = (x.lfsr & ~0x40) | (bit << 6); }
            const y = (x.lfsr & 1) ? -1 : 1; L[j] += y * al; R[j] += y * ar;
          }
        }
      }
    }
    // 잔향 (-R): m4a 는 앞 칸 소리를 조금 섞는다
    if (man.R) { const D = Math.round(SPF * 2), g = man.R / 256; for (let j = D; j < total; j++) { L[j] += L[j - D] * g; R[j] += R[j - D] * g; } }
    let pk = 0; for (let j = 0; j < total; j++) pk = Math.max(pk, Math.abs(L[j]), Math.abs(R[j]));
    const gn = pk ? Math.min(3, .9 / pk) : 1;
    for (let j = 0; j < total; j++) { L[j] = Math.max(-1, Math.min(1, L[j] * gn)); R[j] = Math.max(-1, Math.min(1, R[j] * gn)); }
    return { L, R, rate: RATE, loop: loopOn, loopStart: loopOn ? Math.round(t2s(M.ls) * RATE) : 0 };
  }
  G.GBA = { render, parseMidi };
  if (typeof window === 'undefined' && typeof importScripts === 'function') {
    G.onmessage = e => { const m = e.data; try { const r = render({ mid: new Uint8Array(m.mid), man: m.man, smp: Object.fromEntries(Object.entries(m.smp).map(([k, v]) => [k, new Uint8Array(v)])) }); G.postMessage({ id: m.id, L: r.L, R: r.R, rate: r.rate, loop: r.loop, loopStart: r.loopStart }, [r.L.buffer, r.R.buffer]); } catch (err) { G.postMessage({ id: m.id, err: String(err) }); } };
  }
})(typeof window !== 'undefined' ? window : globalThis);
