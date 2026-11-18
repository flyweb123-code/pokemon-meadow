/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
// 테라 관 19종 — 직접 그린 결정 SVG (면 나눔·빛·무지개 굴절·반짝이)
const TJ = { Normal: ['#ffffff', '#dcdee6', '#9396a6'], Fire: ['#fff3b0', '#ff7a2a', '#c41e16'], Water: ['#dcf5ff', '#3fa0ff', '#1640c4'], Grass: ['#eaffb4', '#58d046', '#147a28'], Electric: ['#fffcc4', '#ffd21e', '#d48400'], Ice: ['#f2ffff', '#8ee8f4', '#35a2d6'],
  Fighting: ['#ffe0c8', '#e8603a', '#9a2410'], Poison: ['#f4d8ff', '#b45ae6', '#5a1a8a'], Ground: ['#fff0c0', '#e0b04a', '#8a5a18'], Flying: ['#eef4ff', '#9ab8ff', '#4a6ad6'], Psychic: ['#ffe0f0', '#ff68b0', '#b01a6a'], Bug: ['#f4ffc0', '#b8d830', '#5a7a10'],
  Rock: ['#fff4d8', '#d0b070', '#7a5a28'], Ghost: ['#ece0ff', '#8a6ad8', '#3a2480'], Dragon: ['#e8e0ff', '#7a5cff', '#2a1aa8'], Dark: ['#f0e4e0', '#8a6a60', '#3a2420'], Steel: ['#ffffff', '#c4ccdc', '#6a7488'], Fairy: ['#ffe8f8', '#ff9ae0', '#c8409a'] };
const STJ = [['#ffe0e6', '#ff6a8a', '#c8204a'], ['#fff2c8', '#ffb43c', '#c86a00'], ['#fffcd0', '#f4e43c', '#a89400'], ['#e0ffe8', '#4ee08a', '#108a48'], ['#e0f4ff', '#44b4ff', '#1458c8'], ['#ece0ff', '#a070ff', '#5a24c8'], ['#ffe0f6', '#ff6ad0', '#b01a8a']];
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = c => `rgb(${c.join(',')})`;
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let UID = 0, defs = [], out = [];
const L = [-.55, -.83];   // 빛: 왼쪽 위
function col(pal, t) { const [h, m, d] = pal.map(hx); t -= .07; t = Math.max(0, Math.min(1, t)); return t > .5 ? mix(m, h, (t - .5) * 2) : mix(d, m, t * 2); }
function facet(pts, t, pal, o = {}) {   // 면 하나: 같은 결 안에서도 그라데이션
  const id = 'g' + (++UID), a = col(pal, t + .22), b = col(pal, t - .18), ang = (rnd() * 60 + 20) | 0;
  defs.push(`<linearGradient id="${id}" gradientTransform="rotate(${ang} .5 .5)"><stop offset="0" stop-color="${rgb(a)}"/><stop offset="1" stop-color="${rgb(b)}"/></linearGradient>`);
  out.push(`<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="url(#${id})" stroke="rgba(255,255,255,${o.e ?? .3})" stroke-width="${o.sw ?? .7}" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}/>`);
}
const cen = P => [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
function shadeAt(p, c, k = .5) { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy) || 1; return .5 + k * (dx * L[0] + dy * L[1]) / l + (rnd() - .5) * .22; }
// 보석: 바깥 테두리 → 안쪽 판 → 가운데 부채꼴 (브릴리언트 컷 느낌)
function gem(P, pal, o = {}) { const c = o.c || cen(P), k = o.k ?? .52, n = P.length, oc = [c[0] + (o.dx ?? -2), c[1] + (o.dy ?? -3)];
  const I = P.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; const t1 = [P[i], P[j], I[j]], t2 = [P[i], I[j], I[i]];
    facet(t1, shadeAt(cen(t1), c) - .08, pal, o); facet(t2, shadeAt(cen(t2), c) + .04, pal, o); }
  if (!o.noFan) for (let i = 0; i < n; i++) { const j = (i + 1) % n, t = [I[i], I[j], oc]; facet(t, shadeAt(cen(t), c, .3) + .14, pal, { ...o, e: .4 }); }
  outline(P, o.ow);
}
function outline(P, w = 1.3) { out.push(`<polygon points="${P.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="${w}" stroke-linejoin="round"/>`); }
// 띠(막대·곡선): 가운데 선을 따라 왼쪽 밝게·오른쪽 어둡게 두 줄 면
function band(path, w, pal, o = {}) { const n = path.length, W = typeof w === 'function' ? w : () => w; const Lf = [], Rt = [];
  for (let i = 0; i < n; i++) { const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const ww = W(i / (n - 1)) / 2;
    Lf.push([path[i][0] - dy * ww, path[i][1] + dx * ww]); Rt.push([path[i][0] + dy * ww, path[i][1] - dx * ww]); }
  for (let i = 0; i < n - 1; i++) { const nx = Lf[i][0] - path[i][0], ny = Lf[i][1] - path[i][1], l = Math.hypot(nx, ny) || 1, s = (nx * L[0] + ny * L[1]) / l, alt = i % 2 ? .06 : -.04;
    facet([Lf[i], Lf[i + 1], path[i + 1], path[i]], .55 + s * .38 + alt, pal, o); facet([path[i], path[i + 1], Rt[i + 1], Rt[i]], .45 - s * .38 - alt, pal, o); }
  outline([...Lf, ...Rt.slice().reverse()], o.ow ?? 1.1);
}
const bez = (p0, p1, p2, p3, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
const ell = (cx, cy, rx, ry, n = 12, r0 = -Math.PI / 2, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n }, (_, i) => { const a = r0 + a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const arcP = (cx, cy, rx, ry, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const starP = (cx, cy, R, r, n = 5, rot = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + Math.PI * i / n, q = i % 2 ? r : R; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; });
const drop = (cx, cy, r, len, ang = -Math.PI / 2, n = 10) => { const P = [], ax = Math.cos(ang), ay = Math.sin(ang); for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; P.push([cx - ay * Math.cos(a) * r + ax * -Math.sin(a) * r, cy + ax * Math.cos(a) * r + ay * -Math.sin(a) * r]); } P.push([cx + ax * len, cy + ay * len]); return P; };
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const mir = P => P.map(p => [240 - p[0], p[1]]).reverse();
const tr = (P, dx, dy, s = 1, c = [0, 0]) => P.map(p => [c[0] + (p[0] - c[0]) * s + dx, c[1] + (p[1] - c[1]) * s + dy]);
// 모든 관 공통 받침: 흰 결정 띠 + 가운데 작은 테라 보석
function base(pal, y = 172) { const W0 = hx('#ffffff'), wp = ['#ffffff', '#e8eef8', '#a0aac0'];
  gem([[70, y], [170, y], [178, y + 10], [170, y + 22], [70, y + 22], [62, y + 10]], wp, { k: .7, noFan: 1 });
  gem(ell(120, y + 11, 11, 11, 6, -Math.PI / 2), pal, { k: .45 }); }
const SH = {
  Normal(p) { // 다이아몬드 반지
    base(p, 174); band(bez([62, 176], [40, 150], [44, 118], [58, 108]), 9, p); band(bez([178, 176], [200, 150], [196, 118], [182, 108]), 9, p);
    gem(ell(44, 104, 20, 20, 10), p); gem(ell(196, 104, 20, 20, 10), p);
    const G = [[36, 70], [60, 64], [90, 60], [120, 59], [150, 60], [180, 64], [204, 70]], T = [[80, 22], [100, 18], [120, 17], [140, 18], [160, 22]], tip = [120, 168];
    for (let i = 0; i < G.length - 1; i++) facet([G[i], G[i + 1], tip], .62 - Math.abs(i - 2.2) * .12 + (i % 2) * .1, p);
    facet([G[0], T[0], G[1]], .9, p); for (let i = 0; i < T.length - 1; i++) { facet([T[i], T[i + 1], G[i + 2]], .78 - i * .1, p); facet([T[i], G[i + 1], G[i + 2]], .64 - i * .07, p); }
    facet([T[4], G[6], G[5]], .35, p); facet([T[0], T[4], [120, 34]], .98, p, { e: .8 }); facet([T[0], [120, 34], [120, 17]], .9, p); facet([T[4], [120, 34], [120, 17]], .7, p);
    outline([G[0], T[0], T[1], T[2], T[3], T[4], G[6], tip]); },
  Fire(p) { // 촛불 샹들리에
    base(p, 176); const F = ['#fffbe0', '#ffc030', '#ff5a10'];
    band(bez([120, 178], [120, 160], [120, 140], [120, 96]), 12, p);
    [[-1, 40, 96], [-1, 78, 84], [1, 162, 84], [1, 200, 96]].forEach(([s, x, y]) => band(bez([120, 150], [120 + (x - 120) * .3, 170], [x, 150], [x, y + 18]), 8, p));
    [[40, 96, 1], [78, 84, 1.05], [120, 70, 1.25], [162, 84, 1.05], [200, 96, 1]].forEach(([x, y, s]) => {
      gem([[x - 13 * s, y + 10], [x + 13 * s, y + 10], [x + 8 * s, y + 22], [x - 8 * s, y + 22]], p, { k: .6, noFan: 1 });
      gem(rect(x - 6 * s, y - 14 * s, 12 * s, 24 * s), ['#fff8f0', '#ffd8c8', '#d87060'], { k: .55, noFan: 1 });
      gem(drop(x, y - 26 * s, 11 * s, 30 * s), F, { k: .5 }); gem(drop(x, y - 22 * s, 5 * s, 14 * s), ['#ffffff', '#fff6b0', '#ffc840'], { k: .4, noFan: 1, ow: .8 }); }); },
  Water(p) { // 분수
    base(p, 176); gem([[96, 176], [144, 176], [132, 150], [108, 150]], p, { k: .6 });
    band(bez([120, 152], [118, 140], [122, 128], [120, 118]), 14, p);
    gem([[56, 108], [184, 108], [162, 128], [78, 128]], p, { k: .55 });
    band(bez([120, 110], [120, 70], [120, 40], [120, 26]), w => 16 - w * 6, p);
    band(bez([120, 30], [80, 4], [30, 30], [34, 74]), w => 18 - w * 10, p); band(bez([120, 30], [160, 4], [210, 30], [206, 74]), w => 18 - w * 10, p);
    band(bez([116, 50], [92, 36], [66, 56], [72, 92]), w => 12 - w * 6, p); band(bez([124, 50], [148, 36], [174, 56], [168, 92]), w => 12 - w * 6, p);
    gem(drop(34, 88, 10, 18, Math.PI / 2), p); gem(drop(206, 88, 10, 18, Math.PI / 2), p); gem(drop(72, 102, 7, 12, Math.PI / 2), p); gem(drop(168, 102, 7, 12, Math.PI / 2), p);
    gem(starP(120, 26, 16, 7, 6), ['#ffffff', '#c8f0ff', '#58b0ff'], { k: .5 }); },
  Grass(p) { // 해바라기
    base(p, 176); band(bez([120, 176], [118, 160], [122, 146], [120, 132]), 10, p);
    gem([[120, 160], [92, 140], [70, 150], [96, 162]], p, { k: .5 }); gem([[120, 160], [148, 140], [170, 150], [144, 162]], p, { k: .5 });
    const Y = ['#fffbd0', '#ffe040', '#c89a00'], c = [120, 80];
    for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 16 + .1, r0 = 36, r1 = 78, w = .2;
      gem([[c[0] + Math.cos(a - w) * r0, c[1] + Math.sin(a - w) * r0], [c[0] + Math.cos(a - .08) * (r1 - 18), c[1] + Math.sin(a - .08) * (r1 - 18)], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1], [c[0] + Math.cos(a + .08) * (r1 - 18), c[1] + Math.sin(a + .08) * (r1 - 18)], [c[0] + Math.cos(a + w) * r0, c[1] + Math.sin(a + w) * r0]], i % 2 ? Y : ['#fffbe0', '#fff070', '#e0b000'], { k: .5 }); }
    gem(ell(120, 80, 38, 38, 14), ['#ffd8a0', '#e07a20', '#7a3a08'], { k: .62 });
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, q = 18; gem(ell(120 + Math.cos(a) * q, 80 + Math.sin(a) * q, 6, 6, 6), ['#ffe8b0', '#c86018', '#5a2a04'], { k: .4, noFan: 1, ow: .6 }); } },
  Electric(p) { // 전구 + 번개
    base(p, 176); for (let i = 0; i < 3; i++) gem([[94 + i * 2, 132 + i * 12], [146 - i * 2, 132 + i * 12], [148 - i * 2, 142 + i * 12], [92 + i * 2, 142 + i * 12]], ['#fff8e0', '#d8b860', '#8a6420'], { k: .6, noFan: 1 });
    gem([[96, 134], [144, 134], [150, 118], [90, 118]], ['#ffffff', '#eef4ff', '#a8b4d0'], { k: .6, noFan: 1 });
    gem([...arcP(120, 70, 60, 58, Math.PI / 2 + .62, Math.PI * 2.5 - .62, 16), [144, 128], [96, 128]], ['#ffffff', '#fffad8', '#e8c850'], { k: .55, op: .92 });
    const B = [[138, 14], [86, 80], [114, 80], [98, 128], [156, 58], [126, 58], [148, 14]]; out.push(`<polygon points="${B.join(' ')}" fill="none" stroke="#b85a00" stroke-width="7" stroke-linejoin="round" opacity=".8"/>`); gem(B, ['#ffffff', '#ffe040', '#ff8a00'], { k: .45, ow: 1.6 }); },
  Ice(p) { // 눈 결정
    base(p, 178); const c = [120, 88];
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3, R = 82, ax = Math.cos(a), ay = Math.sin(a), nx = -ay, ny = ax, pt = t => [c[0] + ax * t, c[1] + ay * t];
      gem([pt(14), [pt(R * .55)[0] + nx * 9, pt(R * .55)[1] + ny * 9], pt(R), [pt(R * .55)[0] - nx * 9, pt(R * .55)[1] - ny * 9]], p, { k: .4, noFan: 0 });
      [-1, 1].forEach(s => { const b = pt(R * .5), ba = a + s * .9, e = [b[0] + Math.cos(ba) * 30, b[1] + Math.sin(ba) * 30], m = [(b[0] + e[0]) / 2, (b[1] + e[1]) / 2], q = [-Math.sin(ba) * 5, Math.cos(ba) * 5];
        gem([b, [m[0] + q[0], m[1] + q[1]], e, [m[0] - q[0], m[1] - q[1]]], p, { k: .4, noFan: 1, ow: .9 }); });
      gem([[pt(R)[0] + nx * 0, pt(R)[1]], [pt(R - 9)[0] + nx * 7, pt(R - 9)[1] + ny * 7], pt(R - 18), [pt(R - 9)[0] - nx * 7, pt(R - 9)[1] - ny * 7]], ['#ffffff', '#e0fcff', '#80d8f0'], { k: .4, noFan: 1, ow: .8 }); }
    gem(ell(120, 88, 20, 20, 6), ['#ffffff', '#c8f8ff', '#58c0e8'], { k: .5 }); },
  Fighting(p) { // 주먹 + 회오리
    base(p, 178); const C = ['#e8ffff', '#5ae8ff', '#1888c8'];
    band(arcP(120, 150, 70, 18, Math.PI * 1.05, Math.PI * 1.95, 14), 7, C, { op: .85 });
    const F = [[70, 160], [64, 110], [68, 60], [86, 40], [104, 42], [110, 34], [128, 34], [136, 40], [152, 38], [168, 50], [176, 78], [172, 112], [160, 140], [150, 166], [82, 166]];
    gem(F, p, { k: .58 }); [[86, 40, 104, 42], [110, 34, 128, 34], [136, 40, 152, 38]].forEach(([a, b, c2, d]) => gem([[a, b], [c2, d], [c2 - 2, d + 22], [a + 2, b + 22]], p, { k: .5, noFan: 1, ow: .8 }));
    gem([[64, 100], [100, 86], [130, 92], [126, 108], [70, 118]], p, { k: .5, ow: 1 });
    band(arcP(120, 140, 82, 22, -Math.PI * .02, Math.PI * 1.02, 16), w => 10 - w * 4, C); band(arcP(120, 110, 74, 18, Math.PI * .1, Math.PI * .9, 12), 6, C, { op: .9 }); },
  Poison(p) { // 해골 + 뼈
    base(p, 178); const Bn = ['#fff4ff', '#e0c8f4', '#9a78c0'];
    band([[40, 40], [200, 160]], 13, Bn); band([[200, 40], [40, 160]], 13, Bn);
    [[40, 40], [200, 160], [200, 40], [40, 160]].forEach(([x, y]) => { gem(ell(x - 7, y, 10, 10, 8), Bn, { k: .5, noFan: 1 }); gem(ell(x + 7, y + (y < 100 ? 6 : -6), 10, 10, 8), Bn, { k: .5, noFan: 1 }); });
    const S = [...arcP(120, 82, 56, 54, Math.PI * .86, Math.PI * 2.14, 14), [160, 130], [150, 148], [90, 148], [80, 130]]; gem(S, p, { k: .62 });
    const D = ['#e8b0ff', '#6a1aa0', '#2a0640']; gem(ell(98, 92, 15, 13, 7), D, { k: .45 }); gem(ell(142, 92, 15, 13, 7), D, { k: .45 }); gem([[120, 108], [128, 122], [112, 122]], D, { k: .4, noFan: 1 });
    for (let i = 0; i < 4; i++) gem(rect(98 + i * 11.5, 132, 9, 12), Bn, { k: .5, noFan: 1, ow: .7 }); },
  Ground(p) { // 반 지구
    base(p, 176); const c = [120, 160], RX = 84, RY = 120, rows = 5, cols = 10;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const a0 = Math.PI + Math.PI * k / cols, a1 = Math.PI + Math.PI * (k + 1) / cols, q0 = r / rows, q1 = (r + 1) / rows, P = (a, q) => [c[0] + Math.cos(a) * RX * Math.cos(q * Math.PI / 2), c[1] - (q * RY * .95) - Math.sin(a + Math.PI) * 0];
      const pt = (a, q) => [c[0] + Math.cos(a) * RX * Math.cos(q * Math.PI / 2), c[1] - Math.sin(q * Math.PI / 2) * RY * .95 + Math.sin(a) * 0 * 18];
      const Q = [pt(a0, q0), pt(a1, q0), pt(a1, q1), pt(a0, q1)], land = Math.sin(k * 1.3 + r * 2.1) + Math.cos(k * .7 - r * 1.4) > .6; facet(Q, shadeAt(cen(Q), [120, 40]) + (land ? -.12 : .08), land ? ['#ffe0a0', '#a8702a', '#4a2a08'] : p); }
    outline([...arcP(120, 160, RX, RY * .95, Math.PI, Math.PI * 2, 20)]);
    band([[34, 162], [206, 162]], 12, p); gem([[16, 120], [34, 100], [44, 118], [32, 134]], p, { k: .5 }); gem([[224, 110], [206, 94], [196, 112], [210, 128]], p, { k: .5 }); },
  Flying(p) { // 왕관
    base(p, 178); gem([[48, 148], [192, 148], [186, 176], [54, 176]], p, { k: .62 });
    const tips = [[52, 70], [86, 40], [120, 18], [154, 40], [188, 70]];
    tips.forEach(([x, y], i) => { const b0 = 48 + i * 28.8, b1 = b0 + 28.8; gem([[b0, 150], [x - 6, y + 14], [x, y + 6], [x + 6, y + 14], [b1, 150], [(b0 + b1) / 2, 128]], p, { k: .5 }); gem(ell(x, y, 11, 11, 8), ['#ffffff', '#e8f0ff', '#8aa8ff'], { k: .45 }); });
    [[-1, 30], [1, 210]].forEach(([s, x]) => { for (let i = 0; i < 3; i++) gem(drop(x - s * i * 3, 120 - i * 18, 7, 26 - i * 3, s < 0 ? Math.PI * .95 + i * .2 : Math.PI * .05 - i * .2), p, { k: .4, noFan: 1, ow: .9 }); });
    for (let i = 0; i < 4; i++) gem(ell(72 + i * 32, 162, 7, 7, 6), ['#ffffff', '#c8d8ff', '#5a7aff'], { k: .4, noFan: 1, ow: .8 }); },
  Psychic(p) { // 눈
    base(p, 176); band([[120, 172], [120, 150]], 12, p);
    const E = [...bez([22, 96], [70, 36], [170, 36], [218, 96], 12), ...bez([218, 96], [170, 150], [70, 150], [22, 96], 12).slice(1, -1)]; gem(E, p, { k: .72, c: [120, 95] });
    gem(ell(120, 95, 32, 32, 12), ['#ffd8f0', '#e0308a', '#6a0a40'], { k: .55 }); gem([[120, 72], [130, 95], [120, 118], [110, 95]], ['#ffe0ff', '#40104a', '#10000a'], { k: .4, noFan: 1 });
    for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * .32; gem(drop(120 + Math.cos(a) * 92, 104 + Math.sin(a) * 92, 5, 18, a), p, { k: .4, noFan: 1, ow: .8 }); } },
  Bug(p) { // 더듬이
    base(p, 176); gem([[96, 176], [144, 176], [134, 150], [120, 140], [106, 150]], p, { k: .55 });
    band(bez([108, 152], [80, 120], [40, 90], [50, 40]), w => 12 - w * 6, p); band(bez([132, 152], [160, 120], [200, 90], [190, 40]), w => 12 - w * 6, p);
    band(arcP(66, 40, 16, 16, Math.PI, Math.PI * 2.6, 10), 6, p); band(arcP(174, 40, 16, 16, 0, -Math.PI * 1.6, 10), 6, p);
    gem(ell(78, 46, 12, 12, 8), ['#ffffff', '#e8ff90', '#80a020'], { k: .45 }); gem(ell(162, 46, 12, 12, 8), ['#ffffff', '#e8ff90', '#80a020'], { k: .45 });
    gem([[120, 150], [102, 118], [120, 104], [138, 118]], ['#ffe8f0', '#ff80a8', '#b02050'], { k: .45 }); },
  Rock(p) { // 신전
    gem([[40, 174], [200, 174], [210, 194], [30, 194]], p, { k: .7, noFan: 1 }); gem([[50, 162], [190, 162], [200, 174], [40, 174]], p, { k: .7, noFan: 1 });
    for (let i = 0; i < 4; i++) { const x = 64 + i * 37; band([[x, 160], [x, 84]], 18, p); gem(rect(x - 12, 80, 24, 8), p, { k: .6, noFan: 1, ow: .8 }); }
    gem([[38, 66], [202, 66], [206, 80], [34, 80]], p, { k: .7, noFan: 1 }); gem([[30, 64], [120, 14], [210, 64]], p, { k: .55 });
    gem([[96, 52], [120, 36], [144, 52], [120, 60]], ['#fff8e0', '#ffb040', '#a0500a'], { k: .4 }); },
  Ghost(p) { // 유령
    base(p, 178); const G = [...arcP(118, 78, 58, 60, Math.PI, Math.PI * 2, 14), [178, 110], [182, 140], [168, 156], [160, 140], [146, 162], [130, 144], [112, 168], [98, 146], [80, 162], [72, 140], [56, 150], [60, 110]];
    gem(G, p, { k: .62 }); band(bez([62, 112], [40, 116], [28, 100], [36, 86]), w => 12 - w * 6, p); band(bez([176, 110], [198, 112], [210, 96], [204, 82]), w => 12 - w * 6, p);
    const D = ['#ffffff', '#3a1a6a', '#0a0420']; gem(ell(98, 82, 12, 17, 8), D, { k: .4 }); gem(ell(138, 82, 12, 17, 8), D, { k: .4 }); gem(ell(118, 118, 10, 7, 8), D, { k: .4, noFan: 1 }); },
  Dragon(p) { // 용 (날개 + 머리)
    base(p, 178); const R = ['#ffe0d8', '#ff4a4a', '#8a0a1a'];
    [1, -1].forEach(s => { const X = x => s > 0 ? x : 240 - x; const W = [[X(104), 120], [X(60), 120], [X(26), 132], [X(6), 96], [X(0), 40], [X(30), 10], [X(48), 48], [X(68), 26], [X(84), 66], [X(104), 70]];
      gem(s > 0 ? W : W.slice().reverse(), R, { k: .5, c: [X(52), 80] }); });
    const H = [[120, 168], [94, 140], [88, 100], [76, 56], [100, 76], [108, 40], [120, 64], [132, 40], [140, 76], [164, 56], [152, 100], [146, 140]]; gem(H, p, { k: .58 });
    gem([[98, 108], [112, 112], [110, 120]], ['#ffffff', '#ffe040', '#c08000'], { k: .4, noFan: 1, ow: .8 }); gem(mir([[98, 108], [112, 112], [110, 120]]).reverse(), ['#ffffff', '#ffe040', '#c08000'], { k: .4, noFan: 1, ow: .8 }); },
  Dark(p) { // 비웃는 얼굴 (가시 둥근 관)
    base(p, 178); const S = []; for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + i * Math.PI / 11, r = i % 2 ? 58 : 82 + (i % 4 === 0 ? 6 : 0); S.push([120 + Math.cos(a) * r, 92 + Math.sin(a) * r * .92]); }
    gem(S, ['#fff0f0', '#d84a5a', '#5a0a18'], { k: .7, noFan: 1 }); gem(ell(120, 92, 56, 52, 14), p, { k: .6 });
    const Y = ['#ffffff', '#ffe060', '#c88000']; gem([[86, 72], [112, 82], [110, 90], [84, 82]], Y, { k: .4, noFan: 1 }); gem(mir([[86, 72], [112, 82], [110, 90], [84, 82]]).reverse(), Y, { k: .4, noFan: 1 });
    const M = [[78, 104], [92, 112], [100, 104], [110, 116], [120, 106], [130, 116], [140, 104], [148, 112], [164, 100], [146, 130], [120, 138], [94, 130]]; gem(M, ['#ffffff', '#ffd8e0', '#c03a50'], { k: .45, noFan: 1 }); },
  Steel(p) { // 도끼
    base(p, 178); band([[120, 178], [120, 30]], 14, p);
    gem([[124, 40], [150, 24], [196, 18], [214, 64], [200, 116], [156, 106], [124, 92]], ['#ffffff', '#e4ecf8', '#8a94a8'], { k: .55, c: [170, 64] });
    gem([[116, 46], [84, 56], [70, 70], [84, 84], [116, 86]], p, { k: .5 }); gem([[112, 30], [120, 4], [128, 30]], ['#ffffff', '#e4ecf8', '#8a94a8'], { k: .4, noFan: 1 });
    for (let i = 0; i < 3; i++) gem(rect(110, 120 + i * 16, 20, 6), ['#fff6d8', '#d0a050', '#7a5010'], { k: .5, noFan: 1, ow: .7 }); },
  Fairy(p) { // 날개 달린 하트 + 리본
    const W = ['#ffffff', '#f0f4ff', '#b8c0e0'];
    [1, -1].forEach(s => { const X = x => s > 0 ? x : 240 - x; band(bez([X(98), 70], [X(70), 30], [X(30), 30], [X(8), 6]), w => 12 - w * 7, W);
      for (let i = 0; i < 5; i++) { const t = .15 + i * .19, q = bez([X(98), 70], [X(70), 30], [X(30), 30], [X(8), 6], 20)[Math.round(t * 20)]; gem(drop(q[0], q[1] + 14, 10, 22, Math.PI / 2 + s * .35), W, { k: .45, noFan: 1, ow: .9 }); } });
    const H = []; for (let i = 0; i <= 28; i++) { const t = Math.PI * 2 * i / 28, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); H.push([120 + x * 3.6, 92 - y * 3.6]); }
    gem(H.slice(0, 28), p, { k: .58, c: [120, 92] });
    const Rb = ['#ffffff', '#ffc8ec', '#d0509a']; gem([[120, 164], [84, 148], [80, 180], [118, 170]], Rb, { k: .5 }); gem([[120, 164], [156, 148], [160, 180], [122, 170]], Rb, { k: .5 });
    gem([[110, 170], [96, 196], [108, 196], [118, 176]], Rb, { k: .5, noFan: 1 }); gem([[130, 170], [144, 196], [132, 196], [122, 176]], Rb, { k: .5, noFan: 1 });
    gem(ell(120, 166, 9, 9, 6), ['#ffffff', '#e8d0ff', '#9a60e0'], { k: .45 }); },
  Stellar(p) { // 무지개 결정들 + 테라 별
    base(['#ffffff', '#e8f0ff', '#8ab0ff'], 178);
    const N = 7; for (let i = 0; i < N; i++) { const a = Math.PI + Math.PI * (i + .5) / N, x = 120 + Math.cos(a) * 92, y = 166 + Math.sin(a) * 92; gem(ell(x, y, 17, 17, 6, Math.PI / 6), STJ[i], { k: .5 }); }
    for (let i = 0; i < 5; i++) { const a = Math.PI + Math.PI * (i + .5) / 5, x = 120 + Math.cos(a) * 56, y = 166 + Math.sin(a) * 52; gem(ell(x, y, 13, 13, 6, Math.PI / 6), STJ[(i * 2 + 3) % 7], { k: .5 }); }
    const S = starP(120, 40, 36, 15, 5); gem(S, ['#ffffff', '#58b8ff', '#1a40c8'], { k: .45 }); gem(ell(120, 42, 10, 10, 6, Math.PI / 6), ['#ffffff', '#e8f8ff', '#80c8ff'], { k: .4 }); },
};
function sparkles(n, box) { let s = ''; for (let i = 0; i < n; i++) { const x = box[0] + rnd() * box[2], y = box[1] + rnd() * box[3], r = 4 + rnd() * 7;
  s += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})" filter="url(#sg)"><path d="M0 ${-r}L${r * .18} ${-r * .18}L${r} 0L${r * .18} ${r * .18}L0 ${r}L${-r * .18} ${r * .18}L${-r} 0L${-r * .18} ${-r * .18}Z" fill="#fff"/></g>`; } return s; }
function svg(type) { seed = 7 + type.length * 131; UID = 0; defs = []; out = []; const pal = TJ[type] || TJ.Normal; SH[type](pal); const md = type === 'Stellar' ? '#9ad0ff' : pal[1];
  const body = out.join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 252 212" width="378" height="318"><defs>${defs.join('')}
  <filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feFlood flood-color="${md}"/><feComposite operator="in" in2="SourceGraphic" result="z"/></filter>
  <filter id="gw" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/><feGaussianBlur in="d" stdDeviation="4" result="b"/><feFlood flood-color="${md}" flood-opacity=".9"/><feComposite in2="b" operator="in"/></filter>
  <filter id="wh"><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
  <filter id="sg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ab0"/><stop offset=".2" stop-color="#ffd86a"/><stop offset=".4" stop-color="#7affb0"/><stop offset=".6" stop-color="#6ad8ff"/><stop offset=".8" stop-color="#b48aff"/><stop offset="1" stop-color="#ff7ab0"/></linearGradient>
  <linearGradient id="hl" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".36" stop-color="#fff" stop-opacity=".75"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#fff" stop-opacity=".45"/><stop offset=".64" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="mk"><g filter="url(#wh)">${body}</g></mask></defs>
  <g filter="url(#gw)">${body}</g>${body}
  <g mask="url(#mk)"><rect x="-6" y="-6" width="252" height="212" fill="url(#rb)" opacity=".22" style="mix-blend-mode:screen"/><rect x="-6" y="-6" width="252" height="212" fill="url(#hl)"/></g>
  ${sparkles(6, [20, 6, 200, 150])}</svg>`; }
module.exports = { svg, TYPES: Object.keys(SH) };
if (require.main === module) { const fs = require('fs'); fs.mkdirSync('/tmp/claude-0/cr2/svg', { recursive: true }); for (const t of Object.keys(SH)) fs.writeFileSync(`/tmp/claude-0/cr2/svg/${t}.svg`, svg(t)); console.log('ok', Object.keys(SH).length); }
