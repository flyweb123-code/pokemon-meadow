/* 기술 파티클 (경완 2026-10-27): 플래티넘 원본 파티클 엔진(SPL)을 브라우저로 옮긴 것
   - 파티클 자료는 tools/gym/mkspl.py 가 원본 .spa 에서 뽑은 gym/img/spl/<이름>.json·png
   - 언제 어떤 방출기를 만들지는 tools/gym/mkanim.py 가 원본 기술 대본에서 뽑은 gym/mvfx.json 의 'p…' 사건
   - 방출·움직임·애니메이션·행동(중력·자석·회전·충돌·수렴)·자식 파티클은 pret/pokeplatinum lib/spl 그대로,
     방출기 자리 정하기는 src/battle_anim (emitter_callbacks.c, generic_emitter_callback*.c, script_funcs_3.c) 그대로
   - 원본 화면(256x192, 정사영 카메라 (0,0,4))을 우리 배틀 화면 자리(포켓몬 중심)에 맞춰 그린다
   battle.js 가 window.GymSPL 을 쓴다. */
(() => {
'use strict';
const SRC = 'gym/img/spl/';
const FX = 4096, TAU = Math.PI * 2;
const sinI = a => Math.sin(a / 65536 * TAU), cosI = a => Math.cos(a / 65536 * TAU);
// 원본 화면 → 우리 화면: 원본 세계 1 = 4096/172 픽셀, 원본 포켓몬 자리(−2.5,−1.5625)·(2.5,0.75)가 우리 (80,104)·(176,56)에 오게
const PPU = FX / 172;
const DSX = x => 128 + x * PPU, DSY = y => 96 - y * PPU;
const MX = 96 / (DSX(2.5) - DSX(-2.5)), MY = (56 - 104) / (DSY(0.75) - DSY(-1.5625));
const OX = 80 - DSX(-2.5) * MX, OY = 104 - DSY(-1.5625) * MY;
const KX = PPU * MX, KY = PPU * MY;
const MAX_EM = 20, MAX_PT = 200;

// ---------- 난수 (원본 SPLRandom 그대로) ----------
let rs = (Math.random() * 4294967296) >>> 0;
const next = () => (rs = (Math.imul(rs, 0x5eedf715) + 0x1b0cb173) >>> 0);
const U = b => next() >>> (32 - b);
const range = n => (n * U(9) - n * 256) / 256;
const scaled = (n, r) => n * (255 - ((r * U(8)) >> 8)) / 256;
const dscaled = (n, r) => n * (255 + r - ((r * U(8)) >> 7)) / 256;
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return l ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0]; };
const rvec = () => norm([(next() | 0) >> 8, (next() | 0) >> 8, (next() | 0) >> 8]);
const rvecXY = () => norm([(next() | 0) >> 8, (next() | 0) >> 8, 0]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ---------- 자료 불러오기 ----------
const RES = new Map();
function load(name, ver) {
  if (RES.has(name)) return RES.get(name);
  const q = ver ? `?v=${ver}` : '';
  const p = Promise.all([
    fetch(`${SRC}${name}.json${q}`).then(r => { if (!r.ok) throw new Error(name); return r.json(); }),
    new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = `${SRC}${name}.png${q}`; })
  ]).then(([d, im]) => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    d.t.forEach(t => { t.px = x.getImageData(t.x, 0, t.w, t.h); });
    d.cache = new Map(); d.tint = new Map(); return d;
  });
  p.catch(() => RES.delete(name)); RES.set(name, p); return p;
}
// 원본 텍스처 좌표(0..2^반복, 뒤집기)대로 펼친 그림
function texImg(d, ti, tS, tT, fS, fT) {
  const key = `${ti}|${tS}|${tT}|${fS}|${fT}`; let c = d.cache.get(key); if (c) return c;
  const t = d.t[ti]; if (!t) return null;
  const nS = 1 << tS, nT = 1 << tT, W = t.w * nS, H = t.h * nT;
  c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), out = g.createImageData(W, H), src = t.px.data;
  const wrap = (s, n, rep, mir) => { s = Math.floor(s); if (!rep) return Math.max(0, Math.min(n - 1, s)); if (mir) { const m = ((s % (2 * n)) + 2 * n) % (2 * n); return m < n ? m : 2 * n - 1 - m; } return ((s % n) + n) % n; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = wrap(fS ? -(i + .5) : i + .5, t.w, t.rep & 1, t.flip & 1), v = wrap(fT ? -(j + .5) : j + .5, t.h, t.rep & 2, t.flip & 2);
    const a = (v * t.w + u) * 4, b = (j * W + i) * 4;
    out.data[b] = src[a]; out.data[b + 1] = src[a + 1]; out.data[b + 2] = src[a + 2]; out.data[b + 3] = src[a + 3];
  }
  g.putImageData(out, 0, 0); d.cache.set(key, c); return c;
}
// 꼭짓점 색 곱하기 (DS 모듈레이트)
function tinted(d, key, img, col) {
  if (col[0] === 31 && col[1] === 31 && col[2] === 31) return img;
  const k = key + '#' + col.join(','); let c = d.tint.get(k); if (c) return c;
  if (d.tint.size > 4000) d.tint.clear();
  c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
  g.drawImage(img, 0, 0); g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgb(${col[0] * 255 / 31},${col[1] * 255 / 31},${col[2] * 255 / 31})`; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0);
  d.tint.set(k, c); return c;
}

// ---------- 배틀 자리 (원본 BattleAnimUtil_GetBattlerTypeWorldPos, 정사영, 내 쪽 0 · 상대 1) ----------
const WP = {
  n: [[-2.5, -1.5625, 0.0156], [2.5, 0.75, -1.2812]],
  b1: [[-1.6035, -0.9766, 0.0156], [2.1484, 1.5781, -1.2812]],
  b2: [[-1.6406, -1.414, 0.0156], [3.5469, 1.961, -1.2812]],
  b3: [[-2.1074, -1.6934, 0], [3.1504, 1.247, 0]],
  hy: [[-3.0625, -0.9375, 0], [1.3262, 1.6309, 0]],
  ta: [[-2.3516, -1.4297, 0], [3.209, 2.752, 0]],
  hc: [[-1.0117, -1.2695, 0], [4.0508, 1.2617, 0]],
  hv: [[-3.0469, -1.0469, 0], [3.2188, 1.8594, 0]],
  gw: [[-0.4375, -1.0312, 0], [4.125, 0.8125, 0]],
  dp: [[-2.0312, -1.0156, 0], [2.6562, 1.0938, 0]],
  hp: [[-1.5254, -0.7188, 0], [2.0215, 1.3262, 0]]
};
const POS_T = { 1: ['n', 's'], 2: ['n', 'e'], 6: ['b1', 's'], 7: ['b1', 'e'], 8: ['hp', 's'], 9: ['hp', 'e'], 10: ['b2', 's'], 11: ['b2', 'e'], 14: ['b3', 's'], 15: ['b3', 'e'],
  16: ['hy', 's'], 17: ['hy', 'e'], 18: ['ta', 's'], 19: ['ta', 'e'], 20: ['hc', 's'], 21: ['hc', 'e'], 22: ['hv', 's'], 23: ['hv', 'e'], 24: ['gw', 's'], 25: ['gw', 'e'], 26: ['dp', 's'], 27: ['dp', 'e'], 34: ['n', 's'] };
// 방향 축 (원본 EmitterAxisConfigs1..8 의 내 쪽→상대, 상대→내 쪽)
const AX = [null,
  [[0.9219, 0.5156, 0.748], [-1.0322, -0.666, 0.748]], [[0.588, 0.3047, 0], [-0.377, -0.2285, 0]], [[0.3438, 0.1797, 0], [-0.295, -0.1914, 0]],
  [[0.6172, 0.3877, 0], [-1.041, -1.2344, 0]], [[0.4766, 0.2676, 0], [-0.4922, -0.2363, 0]], [[0.7812, 0.42, 0], [-0.8594, -0.4824, 0]],
  [[0.3906, -0.0156, 0], [-0.4531, -0.3926, 0]], [[0.875, 0.5, 0], [-0.8281, -0.4336, 0]]];
const fx16 = v => Math.trunc(v * FX) / FX;

// ---------- 방출기 ----------
function newEmitter(S, d, rid, ps) {
  const r = d.r[rid]; if (!r) return null;
  const e = { d, r, ps, pos: [...r.pos], axis: [...r.ax], age: 0, frac: 0, started: false, term: false, P: [], C: [],
    S: (1 << r.tS) * (r.fS ? -1 : 1), T: (1 << r.tT) * (r.fT ? -1 : 1), bh: (r.bh || []).map(b => [...b]) };
  return e;
}
const setPos = (e, x, y, z) => { if (x != null) e.pos[0] = x + e.r.pos[0]; if (y != null) e.pos[1] = y + e.r.pos[1]; if (z != null) e.pos[2] = z + e.r.pos[2]; };
const bhv = (e, k) => e.bh.find(b => b[0] === k);

function emit(S, e) {
  const r = e.r, n = r.n + e.frac, tot = Math.floor(n + 1e-9); e.frac = n - tot;
  let c1, c2, up;
  if ([2, 3, 5, 6, 7, 8, 9].includes(r.et)) {
    let ax = r.ca === 0 ? [0, 0, 1] : r.ca === 1 ? [0, 1, 0] : r.ca === 2 ? [1, 0, 0] : norm(e.axis), v = [0, 1, 0];
    if (Math.abs(Math.abs(dot(v, ax)) - 1) < 1e-6) v = [1, 0, 0];
    c1 = norm(cross(ax, v)); c2 = norm(cross(ax, cross(ax, v))); up = norm(cross(c1, c2));
  }
  const tilt = p => [p[0] * c1[0] + p[1] * c2[0] + p[2] * up[0], p[0] * c1[1] + p[1] * c2[1] + p[2] * up[1], p[0] * c1[2] + p[1] * c2[2] + p[2] * up[2]];
  for (let i = 0; i < tot; i++) {
    if (S.count(e.ps) >= MAX_PT) return;
    let pos, vcyl = null;
    switch (r.et) {
      case 1: pos = rvec().map(x => x * e.rad); break;
      case 2: { const q = rvecXY(); pos = tilt([q[0] * e.rad, q[1] * e.rad, 0]); } break;
      case 3: { const a = Math.trunc(i * 16 * FX / tot); pos = tilt([sinI(a) * e.rad, cosI(a) * e.rad, 0]); } break;
      case 4: pos = rvec().map(x => x * e.rad * range(1)); break;
      case 5: { const q = rvecXY(); pos = tilt([q[0] * e.rad * range(1), q[1] * e.rad * range(1), 0]); } break;
      case 6: vcyl = rvecXY(); pos = tilt([vcyl[0] * e.rad, vcyl[1] * e.rad, range(e.len)]); break;
      case 7: vcyl = rvecXY(); pos = tilt([vcyl[0] * e.rad * range(1), vcyl[1] * e.rad * range(1), range(e.len)]); break;
      case 8: case 9: {
        pos = rvec(); if (r.et === 8 ? dot(up, pos) <= 0 : dot(up, pos) < 0) pos = pos.map(x => -x);
        pos = r.et === 8 ? pos.map(x => x * e.rad) : pos.map(x => x * e.rad * (range(1) / 2 + .5));
      } break;
      default: pos = [0, 0, 0];
    }
    const mp = dscaled(e.vp, r.raV), ma = dscaled(e.va, r.raV);
    const pn = r.et === 6 ? norm([vcyl[0] * c1[0] + vcyl[1] * c2[0], vcyl[0] * c1[1] + vcyl[1] * c2[1], vcyl[0] * c1[2] + vcyl[1] * c2[2]])
      : (pos[0] || pos[1] || pos[2]) ? norm(pos) : rvec();
    const p = { pos, vel: [pn[0] * mp + e.axis[0] * ma, pn[1] * mp + e.axis[1] * ma, pn[2] * mp + e.axis[2] * ma], ep: [...e.pos],
      bs: dscaled(e.sc, r.raS), as: 1, ba: r.alpha & 31, aa: 31, age: 0 };
    if (r.cl && r.cl[5]) { const k = U(12) % 3; p.col = [r.cl[0], r.col, r.cl[1]][k]; } else p.col = r.col;
    p.rot = r.ria ? U(16) : r.ang;
    p.av = r.rot ? Math.floor(((r.rmax - r.rmin) * U(12) + r.rmin * FX) / FX) : 0;
    p.life = Math.floor(e.plt * (255 - ((r.raL * U(8)) >> 8)) / 256) + 1;
    p.tex = r.ta ? (r.ta[3] ? r.ta[0][U(12) % r.ta[1]] : r.ta[0][0]) : r.tex;
    p.ltf = Math.floor(0xFFFF / r.loop); p.lf = Math.floor(0xFFFF / p.life); p.lro = r.rla ? U(8) : 0;
    e.P.push(p);
  }
}
function emitChildren(S, e, p) {
  const ch = e.r.ch, vr = ch.vr / 256;
  for (let i = 0; i < ch.n; i++) {
    if (S.count(e.ps) >= MAX_PT) return;
    const c = { pos: [...p.pos], vel: [p.vel[0] * vr + range(ch.rv), p.vel[1] * vr + range(ch.rv), p.vel[2] * vr + range(ch.rv)], ep: [...p.ep],
      bs: p.bs * p.as * (ch.sr + 1) / 64, as: 1, col: ch.uc ? ch.col : p.col, ba: (p.ba * (p.aa + 1)) >> 5, aa: 31,
      rot: ch.rt ? p.rot : 0, av: ch.rt === 2 ? p.av : 0, life: ch.lt, age: 0, tex: ch.tex };
    e.C.push(c);
  }
}
const lerpC = (a, b, n, m) => [0, 1, 2].map(i => a[i] + Math.trunc(n * (b[i] - a[i]) / m));
function anims(e, p, lr, lrl) {
  const r = e.r;
  if (r.sa) { const [s0, s1, s2, i, o, lp] = r.sa, x = lp ? lrl : lr;
    p.as = x < i ? s0 + x * (s1 - s0) / i : x < o ? s1 : (255 - o ? s2 + (x - 255) * (s2 - s1) / (255 - o) : s2); }
  if (r.cl && !r.cl[5]) { const [c0, c2, i, pk, o, , lp, ip] = r.cl, x = lp ? lrl : lr;
    p.col = x < i ? c0 : x < pk ? (ip ? lerpC(c0, r.col, x - i, pk - i) : r.col) : x < o ? (ip ? lerpC(r.col, c2, x - pk, o - pk) : c2) : c2; }
  if (r.al) { const [a0, a1, a2, rr, lp, i, o] = r.al, x = lp ? lrl : lr;
    const v = x < i ? Math.trunc(x * (a1 - a0) / i) + a0 : x < o ? a1 : (255 - o ? Math.trunc((x - 255) * (a2 - a1) / (255 - o)) + a2 : a2);
    p.aa = ((v * (255 - ((rr * U(8)) >> 8))) >> 8) & 31; }
  if (r.ta && !r.ta[3]) { const [fr, n, st, , lp] = r.ta, x = lp ? lrl : lr; for (let k = 0; k < n; k++) if (x < st * (k + 1)) { p.tex = fr[k]; break; } }
}
function behave(e, p, acc) {
  for (const b of e.bh) {
    switch (b[0]) {
      case 'g': acc[0] += b[1]; acc[1] += b[2]; acc[2] += b[3]; break;
      case 'r': if (p.age % b[4] === 0) { acc[0] += range(b[1]); acc[1] += range(b[2]); acc[2] += range(b[3]); } break;
      case 'm': for (let k = 0; k < 3; k++) acc[k] += b[4] * ((b[k + 1] - p.pos[k]) - p.vel[k]); break;
      case 's': { const s = sinI(b[1]), c = cosI(b[1]), [x, y, z] = p.pos;
        p.pos = b[2] === 0 ? [x, y * c - z * s, y * s + z * c] : b[2] === 1 ? [x * c + z * s, y, -x * s + z * c] : [x * c - y * s, x * s + y * c, z]; } break;
      case 'p': { const y = e.cph ?? b[1], ey = p.ep[1];
        if ((ey < y && ey + p.pos[1] > y) || (ey >= y && ey + p.pos[1] < y)) { p.pos[1] = y - ey; if (b[3] === 0) p.age = p.life; else p.vel[1] = -p.vel[1] * b[2]; } } break;
      case 'c': for (let k = 0; k < 3; k++) p.pos[k] += b[4] * (b[k + 1] - p.pos[k]); break;
    }
  }
}
function update(S, e) {
  const r = e.r, air = (r.air + 384) / 512;
  if ((r.elt === 0 || e.age < r.elt) && e.age % r.iv === 0 && !e.term && e.started) emit(S, e);
  for (let i = 0; i < e.P.length; i++) {
    const p = e.P[i];
    anims(e, p, (p.lf * p.age >> 8) & 255, (p.lro + ((p.ltf * p.age) >> 8)) & 255);
    const acc = [0, 0, 0]; if (r.fe) p.ep = [...e.pos];
    behave(e, p, acc);
    p.rot = (p.rot + p.av) & 0xFFFF;
    for (let k = 0; k < 3; k++) { p.vel[k] = p.vel[k] * air + acc[k]; p.pos[k] += p.vel[k]; }
    if (r.ch) { const dd = p.age - p.life * r.ch.dly / 256; if (dd >= 0 && Math.floor(dd) % r.ch.iv === 0) emitChildren(S, e, p); }
    p.age++;
  }
  e.P = e.P.filter(p => p.age <= p.life);
  if (r.ch) {
    const ch = r.ch;
    for (const p of e.C) {
      const lr = p.life ? ((p.age << 8) / p.life) & 255 : 0;
      if (ch.sa) p.as = ch.es + (ch.es - 1) * (lr - 255) / 255;
      if (ch.aa) p.aa = Math.trunc((255 - lr) * 31 / 255);
      const acc = [0, 0, 0]; if (ch.fe) p.ep = [...e.pos];
      if (ch.beh) behave(e, p, acc);
      p.rot = (p.rot + p.av) & 0xFFFF;
      for (let k = 0; k < 3; k++) { p.vel[k] = p.vel[k] * air + acc[k]; p.pos[k] += p.vel[k]; }
      p.age++;
    }
    e.C = e.C.filter(p => p.age <= p.life);
  }
  e.age++;
}

// ---------- 그리기 ----------
const rotM = (ax, s, c) => {
  if (ax === 0) return [[c, 0, -s], [0, 1, 0], [s, 0, c]];
  let C = (1 - c) / 3; const Sm = C + s / Math.sqrt(3), Sp = C - s / Math.sqrt(3); C += c;
  return [[C, Sp, Sm], [Sm, C, Sp], [Sp, Sm, C]];
};
const mul = (A, B) => A.map(row => [0, 1, 2].map(j => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
function drawP(g, e, p, child) {
  const r = e.r, a = (p.ba * (p.aa + 1)) >> 5; if (!a) return;
  let sy = p.bs, sx = sy * r.asp;
  if (r.sad === 0) { sx *= p.as; sy *= p.as; } else if (r.sad === 1) sx *= p.as; else sy *= p.as;
  const ch = r.ch, dt = child ? ch.dt : r.dt;
  let A, B, px = child ? 0 : r.px, py = child ? 0 : r.py;
  if (dt === 0) { const s = sinI(p.rot), c = cosI(p.rot); A = [c * sx, s * sx]; B = [-s * sy, c * sy]; }
  else if (dt === 1) {
    const L = Math.hypot(p.vel[0], p.vel[1]); if (!L) return;
    const v3 = Math.hypot(p.vel[0], p.vel[1], p.vel[2]), dd = Math.abs(p.vel[2] / v3), h = sy * ((1 - dd) * r.dbb + 1);
    A = [p.vel[1] / L * sx, -p.vel[0] / L * sx]; B = [p.vel[0] / L * h, p.vel[1] / L * h];
  } else {
    let R = rotM(child ? ch.pra : r.pra, sinI(p.rot), cosI(p.rot));
    if (dt >= 3) {
      let u = (child ? ch.dfe : r.dfe) ? norm(p.pos).map(x => -x) : norm(p.vel);
      let ax = [0, 1, 0]; const dd = dot(u, ax); if (dd > .8 || dd < -.8) ax = [1, 0, 0];
      const d1 = cross(u, ax), d2 = cross(u, d1); R = mul(R, [d1, u, d2]);
    }
    const Sm = [[sx, 0, 0], [0, sy, 0], [0, 0, sy]], M = child ? mul(R, Sm) : mul(Sm, R);
    A = M[0]; B = (child ? ch.prp : r.prp) ? M[2] : M[1];
  }
  const ti = p.tex, key = child ? `${ti}|${ch.tS}|${ch.tT}|${ch.fS}|${ch.fT}` : `${ti}|${r.tS}|${r.tT}|${r.fS}|${r.fT}`;
  const base = child ? texImg(e.d, ti, ch.tS, ch.tT, ch.fS, ch.fT) : texImg(e.d, ti, r.tS, r.tT, r.fS, r.fT); if (!base) return;
  const img = tinted(e.d, key, base, p.col);
  const X = OX + DSX(p.ep[0] + p.pos[0]) * MX, Y = OY + DSY(p.ep[1] + p.pos[1]) * MY;
  g.globalAlpha = a / 31;
  g.setTransform(KX * A[0], -KY * A[1], -KX * B[0], KY * B[1], X, Y);
  g.drawImage(img, px - 1, -py - 1, 2, 2);
}
function draw(S) {
  const g = S.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, 256, 192); g.imageSmoothingEnabled = false;
  for (const e of S.E) {
    const dp = () => { if (!e.r.hp) for (let i = e.P.length - 1; i >= 0; i--) drawP(g, e, e.P[i], false); };
    const dc = () => { if (e.r.ch) for (let i = e.C.length - 1; i >= 0; i--) drawP(g, e, e.C[i], true); };
    if (e.r.dcf) { dc(); dp(); } else { dp(); dc(); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
}

// ---------- 방출기 자리 정하기 (원본 배틀 콜백) ----------
function callback(S, e, cb, prm) {
  let pi = 0; const take = n => { const v = []; for (let i = 0; i < n; i++) v.push(prm[pi++] || 0); return v; };
  const at = S.atk, df = 1 - at, nP = t => WP.n[t];
  if (cb === 3 || cb === 21 || cb === 19) { const p = nP(at); setPos(e, p[0], p[1], p[2]); return; }
  if (cb === 4 || cb === 20) { const p = nP(df); setPos(e, p[0], p[1], p[2]); return; }
  if (cb === 1) { const p = nP(1); setPos(e, p[0], p[1], p[2]); return; }
  if (cb === 2) { const p = nP(0); setPos(e, p[0], p[1], p[2]); return; }
  if (cb === 18) { setPos(e, 0, 0, 0); return; }
  if (cb !== 17) return;
  // GENERIC: [우선, 대상, 자리, 축, 행동, 카메라] 다음에 필요한 추가값
  const [prio, tm, pm, am, bm, cm] = take(6);
  const st = (tm === 1 || tm === 3) ? df : at, et = st === at ? df : at;
  const dirOf = flip => flip === 1 ? 1 : (st === 1 ? -1 : 1);
  let position = [0, 0, 0];
  if (pm) {
    let pos = [0, 0, 0];
    const off = () => { const [f, x, y, z] = take(4), dd = dirOf(f); pos = [pos[0] + x / FX * dd, pos[1] + y / FX * dd, pos[2] + z / FX * dd]; };
    if (POS_T[pm]) { const [k, w] = POS_T[pm]; pos = [...WP[k][w === 's' ? st : et]]; }
    else if (pm === 3) { const [f, x, y, z] = take(4), dd = dirOf(f); pos = [x / FX * dd, y / FX * dd, z / FX]; }
    else if (pm === 4 || pm === 5) { pos = [...nP(pm === 4 ? st : et)]; off(); }
    else if (pm === 100 || pm === 101) { const b = pm === 100 ? st : et; pos = [...nP(b)]; let sel; for (let t = 0; t < 6; t++) { const v = take(4); if (t === b) sel = v; } const dd = dirOf(sel[0]); pos = [pos[0] + sel[1] / FX * dd, pos[1] + sel[2] / FX * dd, pos[2] + sel[3] / FX * dd]; }
    else if (pm === 12) { pos = [...nP(at)]; off(); }
    else if (pm === 13) { pos = [...nP(df)]; off(); }
    else if (pm === 28) pos = [2.8047, 0, 0];
    else if (pm === 33) pos = [-1.2207, -1.4648, 0];
    else if (pm === 31) pos = [[-1.4063, -1.0625, 0], [2.3164, -0.4844, 0]][st];
    else if (pm === 30) pos = [[-2.6904, -0.8516, 0], [2.6562, 1.8691, 0]][st];
    else if (pm === 32) pos = [[-1.125, -1.0938, 0], [1.8613, 0.5488, 0]][st];
    position = pos; setPos(e, pos[0], pos[1], pos[2]);
  }
  if (am) {
    let ax = [0, 0, 0];
    const cfg = (n, half) => { const v = AX[n][st === 0 ? 0 : 1]; return [v[0], v[1], half ? v[2] / 2 : v[2]]; };
    if (am === 1 || am === 2 || am === 4 || am === 5) ax = cfg(1, 1);
    else if (am === 8 || am === 9) ax = cfg(2, 1);
    else if (am === 10 || am === 11) { const b = cfg(2, 1); ax = [cfg(3, 1)[0], b[1], b[2]]; }
    else if (am >= 12 && am <= 21) ax = cfg((am >> 1) - 2, 0);
    else if (am === 6 || am === 7) ax = st === 0 ? [0.7754, 0.4785, -0.0723] : [-0.7754, -0.4785, 0.0723];
    else if (am === 3) ax = [-0.1953, 0.293, 0.122];
    else if (am === 22) ax = [-0.8325, -0.6455, 0];
    else if (am === 25) ax = [-0.8398, 0.4766, 0];
    else if (am === 26) ax = st === 0 ? [0.9219, 0.5156, 0] : [-1.4648, -0.537, 0];
    else if (am === 24) ax = st === 0 ? [0.6992, 0.916, 0] : [-0.7188, 0.3555, 0];
    e.axis = ax.map(fx16);
  }
  if (bm) {
    for (let v = 1; v < 14; v++) {
      if (!(bm & (1 << v)) || ![1, 4, 5, 6, 7, 12, 13].includes(v)) continue;
      const [mode, flip, x, y, z] = take(5), dd = dirOf(flip);
      if (v === 1) { const b = bhv(e, 'g'); let m = [0, 0, 0];
        if (mode === 1) { if (b) { b[1] = x / FX * dd; b[2] = y / FX * dd; b[3] = z / FX * dd; } continue; }
        m = m.map((q, k) => q - position[k]); if (b) { b[1] = m[0]; b[2] = m[1]; b[3] = m[2]; } }
      else if (v === 4 || v === 12) { const b = bhv(e, v === 4 ? 'm' : 'c'); let t = b ? [b[1], b[2], b[3]] : [0, 0, 0];
        if (mode === 0) t = t.map(q => q * dd); else if (mode === 1) t = [x / FX * dd, y / FX * dd, z / FX * dd];
        else if (mode === 2) t = [...nP(st)]; else if (mode === 3) t = [...nP(et)];
        else if (mode === 4 && v === 12) t = nP(et).map(q => q * x / y); else t = [0, 0, 0];
        t[0] -= position[0]; t[1] -= position[1]; if (v === 12) t[2] -= position[2];
        if (b) { b[1] = t[0]; b[2] = t[1]; b[3] = t[2]; } }
      else if (v === 5 || v === 13) { const b = bhv(e, v === 5 ? 'm' : 'c'); if (b) b[4] = mode === 0 ? b[4] * dd : mode === 1 ? x / FX * dd : 0; }
      else if (v === 6) { const b = bhv(e, 's'); if (b) b[1] = mode === 0 ? (b[1] * dd) & 0xFFFF : mode === 1 ? (x * dd) & 0xFFFF : 0; }
      else if (v === 7) { const b = bhv(e, 's'); if (b) b[2] = mode === 1 ? x : mode === 0 ? b[2] : 0; }
    }
  }
  if (cm === 2) take(4);
  if (prio === 1 || prio === 2) setPos(e, null, null, et === 0 ? (prio === 1 ? 0.0625 : 0) : (prio === 1 ? -1.25 : -1.3125));
}

// ---------- 방출기 움직이기 (원본 MoveEmitterA2B·RevolveEmitter) ----------
const W2S = v => Math.trunc(Math.round(v * FX) / 172), S2W = v => v * 172 / FX;
const DEG = d => Math.trunc(d * 0xFFFF / 360) & 0xFFFF;
function lerp(sx, ex, sy, ey, n) { return { x: sx, y: sy, n, cx: sx, cy: sy, dx: (ex - sx) / n, dy: (ey - sy) / n }; }
function lerpUp(l) { if (!l.n) return false; l.cx += l.dx; l.cy += l.dy; l.x = Math.floor(l.cx + 1e-9); l.y = Math.floor(l.cy + 1e-9); l.n--; return true; }
function rev(sx, ex, sy, ey, rx, ry, n) { return { x: 0, y: 0, n, ax: sx, ay: sy, rx, ry, dx: Math.trunc((ex - sx) / n), dy: Math.trunc((ey - sy) / n) }; }
function revUp(v) { if (!v.n) return false; v.ax = (v.ax + v.dx) & 0xFFFF; v.ay = (v.ay + v.dy) & 0xFFFF; v.n--; v.x = Math.floor(sinI(v.ax) * v.rx); v.y = Math.floor(cosI(v.ay) * v.ry); return true; }
const active = e => e.P.length > 0 && e.P[0].age !== e.P[0].life;
function startTask(S, ev) {
  const k = ev[0], v = ev.slice(2), e = S.slot[v[0]]; if (!e || !S.E.includes(e)) return;
  const at = S.atk, df = 1 - at, dir = at === 0 ? 1 : -1;
  if (k === 'pr') {
    const [, sx, ex, sy, ey, rx, ry, n, mode] = v, b = WP.n[mode ? df : at], R = rev(DEG(sx), DEG(ex), DEG(sy), DEG(ey), rx, ry, n);
    revUp(R); setPos(e, b[0] + S2W(R.x), b[1] + S2W(R.y));
    S.T.push(() => { const act = active(e); if (!revUp(R) && !act) return kill(S, e); setPos(e, b[0] + S2W(R.x), b[1] + S2W(R.y)); });
    return;
  }
  const [, ox, oy, delay, n, radius, mode, prm, curve] = v;
  const s = WP.n[mode ? df : at], t = WP.n[mode ? at : df];
  const skip = prm >>> 16, maxF = (prm & 0xFFFF) || 0xFF;
  const L = lerp(W2S(s[0]), W2S(t[0]) + ox * dir, W2S(s[1]), W2S(t[1]) + oy * dir, Math.max(1, n));
  if (k === 'pl') {
    for (let i = 0; i < skip; i++) lerpUp(L);
    setPos(e, S2W(L.x), S2W(L.y));
    let timer = 0, ang = 0;
    S.T.push(() => {
      const act = active(e);
      if (timer < delay) { timer++; return; }
      if (!lerpUp(L) && !act) return kill(S, e);
      if (maxF !== 0xFF) return;
      setPos(e, S2W(L.x), S2W(L.y));
      if (curve) { ang += Math.trunc(360 / n); setPos(e, null, S2W(L.y) + Math.sin(ang / 180 * Math.PI)); }
    });
  } else {
    const R = rev(0, 0, DEG(90), DEG(270), 0, -radius, Math.max(1, n));
    const up = () => { const a = lerpUp(L), b = revUp(R); L.x += R.x; L.y += R.y; return a || b; };
    for (let i = 0; i < skip; i++) up();
    setPos(e, S2W(L.x), S2W(L.y));
    S.T.push(() => { const act = active(e); if (!up() && !act) return kill(S, e); setPos(e, S2W(L.x), S2W(L.y)); });
  }
}
function kill(S, e) { const i = S.E.indexOf(e); if (i >= 0) S.E.splice(i, 1); return 'end'; }

// ---------- 한 번의 기술 연출 ----------
// ev: mvfx.json 의 'p' 'pl' 'pq' 'pr' 'pu' 사건, atk: 공격하는 쪽 'p'|'e', F: 1프레임 ms
function start(canvas, ev, atk, F, ver) {
  const names = [...new Set(ev.filter(e => e[0] === 'p').map(e => e[3]))];
  const S = { E: [], T: [], slot: {}, atk: atk === 'p' ? 0 : 1, g: canvas.getContext('2d'), f: 0, dead: false, D: {} };
  S.count = ps => S.E.reduce((n, e) => n + (e.ps === ps ? e.P.length + e.C.length : 0), 0);
  const ready = Promise.all(names.map(n => load(n, ver).then(d => { S.D[n] = d; }).catch(() => {})));
  const Q = ev.filter(e => e[0][0] === 'p').slice().sort((a, b) => a[1] - b[1]);
  let qi = 0, t0 = 0, raf = 0, doneRes;
  S.done = new Promise(r => { doneRes = r; });
  const step = () => {
    while (qi < Q.length && Q[qi][1] <= S.f) {
      const e = Q[qi++];
      if (e[0] === 'p') {
        const d = S.D[e[3]]; if (!d) continue;
        if (S.E.filter(x => x.ps === e[2]).length >= MAX_EM) continue;
        const m = newEmitter(S, d, e[4], e[2]); if (!m) continue;
        m.rad = m.r.rad; m.len = m.r.len; m.vp = m.r.vp; m.va = m.r.va; m.sc = m.r.sc; m.plt = m.r.plt;
        callback(S, m, e[5], e[6]); S.E.push(m); S.slot[e[7]] = m;
      } else if (e[0] === 'pu') S.E = S.E.filter(x => x.ps !== e[2]);
      else startTask(S, e);
    }
    S.T = S.T.filter(f => f() !== 'end');
    for (const e of [...S.E]) {
      if (!e.started && e.age >= e.r.dly) { e.started = true; e.age = 0; }
      update(S, e);
      const r = e.r;
      if (((r.sm && r.elt && e.started && e.age > r.elt) || e.term) && !e.P.length && !e.C.length) kill(S, e);
    }
    S.f++;
  };
  const loop = now => {
    if (S.dead) return;
    const target = Math.floor((now - t0) / F);
    let n = 0; while (S.f <= target && n++ < 8) step();
    draw(S);
    if (qi >= Q.length && !S.E.length) { stop(); return; }
    raf = requestAnimationFrame(loop);
  };
  const stop = () => { if (S.dead) return; S.dead = true; cancelAnimationFrame(raf); const g = S.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 256, 192); doneRes(); };
  S.stop = stop; S.step = () => { step(); draw(S); };   // step: 시험용 한 프레임씩
  S.ready = ready;
  S.go = () => { t0 = performance.now(); raf = requestAnimationFrame(loop); };
  return S;
}
window.GymSPL = { start, load };
})();
