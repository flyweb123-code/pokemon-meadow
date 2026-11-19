/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
// 테라 관 19종 3D 모델 (three.js) — 본가 캡처 실루엣을 따라 결정 덩어리로
import * as THREE from './three.module.js';
import { RoomEnvironment } from './jsm/environments/RoomEnvironment.js';
import { mergeVertices } from './jsm/utils/BufferGeometryUtils.js';

const W = 480, H = 400;
const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R.setSize(W, H); R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = .8;
document.body.appendChild(R.domElement);
const pm = new THREE.PMREMGenerator(R), ENV = pm.fromScene(new RoomEnvironment(), .04).texture;
const BG = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 512, 256); ['#ffd0f0', '#c0e8ff', '#fff4c0', '#d8c8ff', '#c8ffe8'].forEach((k, i) => g.addColorStop(i / 4, k)); x.fillStyle = g; x.fillRect(0, 0, 512, 256); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .8})`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 256, 4 + Math.random() * 20, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const cam = new THREE.PerspectiveCamera(26, W / H, .1, 100);

let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// 결정 재질: 굴절빛(iridescence) + 반사 + 납작 면
const gm = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? .06, metalness: o.m ?? .05, iridescence: o.ir ?? 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [180, 820],
  clearcoat: 1, clearcoatRoughness: .05, specularIntensity: 1, envMapIntensity: o.env ?? 1.5, flatShading: true, transparent: false, opacity: 1,
  transmission: (o.m ?? .05) > .5 ? 0 : (o.tr ?? Math.min(.85, 1.25 - (o.op ?? .94))), thickness: 1.4, ior: 2.1, dispersion: 4, attenuationColor: new THREE.Color(c), attenuationDistance: 1.6,
  emissive: new THREE.Color(o.em ?? c).multiplyScalar((o.ek ?? .16) * .5), side: THREE.DoubleSide });
const GOLD = () => gm('#e6b44a', { m: 1, r: .22, ir: .3, op: 1, ek: .05 });
const SILVER = () => gm('#e8ecf4', { m: .9, r: .18, ir: .5, op: 1, ek: .05 });
// 면을 살짝 흔들어 깎은 결정처럼
function jit(g, a = .06) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g); const p = g.attributes.position, M = new Map();
  for (let i = 0; i < p.count; i++) { const k = [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(3)).join(); if (!M.has(k)) M.set(k, [(rnd() - .5) * a, (rnd() - .5) * a, (rnd() - .5) * a]); const d = M.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]); }
  g = g.toNonIndexed(); g.computeVertexNormals(); return g; }
function faceCol(g) { if (g.index) g = g.toNonIndexed(); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i += 3) { const v = .78 + rnd() * .42; for (let k = 0; k < 9; k++) c[i * 3 + k] = v; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
let G; const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1], par) => { const cry = mat.metalness < .5; if (cry) { geo = faceCol(geo); mat.vertexColors = true; } const m = new THREE.Mesh(geo, mat);
  if (cry) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .32 }))); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...(Array.isArray(sc) ? sc : [sc, sc, sc])); (par || G).add(m); return m; };
const V2 = (x, y) => new THREE.Vector2(x, y), V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const lathe = (pts, n = 10) => jit(new THREE.LatheGeometry(pts.map(p => V2(...p)), n), .02);
const ico = (r, d = 1, a = .08) => jit(new THREE.IcosahedronGeometry(r, d), a * r);
const oct = r => new THREE.OctahedronGeometry(r, 0);
const shp = (pts, depth = .5, bev = .25, segs = 1, holes = []) => { const s = new THREE.Shape(pts.map(p => V2(...p))); holes.forEach(h => s.holes.push(new THREE.Path(h.map(p => V2(...p))))); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: segs, curveSegments: 6 }); g.translate(0, 0, -depth / 2); return jit(g, .015); };
const tube = (pts, r, seg = 28, rs = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), seg, r, rs, false);
const drop = (r, h, n = 8) => lathe([[0, -r], [r * .7, -r * .7], [r, 0], [r * .8, h * .3], [r * .45, h * .65], [0, h]], n);
const arcPts = (cx, cy, rx, ry, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const star = (R0, r0, n = 5, rot = Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + Math.PI * i / n, q = i % 2 ? r0 : R0; return [Math.cos(a) * q, Math.sin(a) * q]; });
const hexP = (r, rot = Math.PI / 6) => Array.from({ length: 6 }, (_, i) => [Math.cos(rot + i * Math.PI / 3) * r, Math.sin(rot + i * Math.PI / 3) * r]);
// 공통 받침: 낮은 흰 결정 띠 + 앞에 테라 보석
function base(col, y = -2.05, w = .85, gold) { add(jit(new THREE.CylinderGeometry(w, w * 1.08, .42, 12, 1, true), .02), gold ? GOLD() : gm('#f4f6ff', { op: .97, ek: .1 }), [0, y, 0]);
  add(jit(new THREE.TorusGeometry(w * 1.02, .09, 4, 14), .01), gold ? GOLD() : gm('#ffffff', { op: 1 }), [0, y + .21, 0], [Math.PI / 2, 0, 0]);
  add(jit(new THREE.TorusGeometry(w * 1.06, .09, 4, 14), .01), gold ? GOLD() : gm('#ffffff', { op: 1 }), [0, y - .21, 0], [Math.PI / 2, 0, 0]);
  add(shp(hexP(.26), .12, .07), gm(col, { op: 1, ek: .3 }), [0, y, w * 1.07]); }
const C = { Normal: '#f4f6ff', Fire: '#ff5a2a', Water: '#3a9cff', Grass: '#5ad046', Electric: '#ffd21e', Ice: '#9ae8f8', Fighting: '#e8503a', Poison: '#b45ae6', Ground: '#e0aa3a', Flying: '#9ab8ff', Psychic: '#ff68b0', Bug: '#b8d830', Rock: '#d8b060', Ghost: '#8a6ad8', Dragon: '#7a5cff', Dark: '#d84a5a', Steel: '#d8dee8', Fairy: '#ff8ad8', Stellar: '#58b8ff' };
const M = {
  Normal() { // 큰 브릴리언트 다이아 + 금 테두리 + 양옆 둥근 보석 + 금 반지
    const d = add(lathe([[0, 1.0], [1.05, 1.0], [1.75, .55], [1.8, .4], [0, -1.2]], 16), gm('#f8faff', { op: .9, ek: .08 }), [0, .75, 0], [.42, 0, 0], [1.15, 1.15, 1.15]);
    add(jit(new THREE.TorusGeometry(2.07, .11, 5, 24), .01), GOLD(), [0, 1.2, -.08], [Math.PI / 2 + .42, 0, 0]);
    [-1, 1].forEach(s => { add(tube([[s * .4, -.9, 0], [s * 1.6, -1.2, 0], [s * 2.25, -.5, 0], [s * 2.3, .0, 0]], .1), GOLD());
      add(ico(.55, 1), gm('#ffffff', { op: .9 }), [s * 2.3, .1, 0]); add(jit(new THREE.TorusGeometry(.58, .08, 4, 14), .01), GOLD(), [s * 2.3, .1, 0]); });
    add(tube([[-.35, -1.0, 0], [0, -1.5, 0], [.35, -1.0, 0]], .09), GOLD());
    base('#fff4b0', -2.05, 1.0, 1); add(shp(star(.3, .13), .1, .05), gm('#ffe060', { op: 1, ek: .4 }), [0, -2.05, 1.12]); },
  Fire() { // 촛불 샹들리에: 붉은 받침·팔, 유리 잔, 불꽃 결정 다발
    base('#ff7a2a'); const red = () => gm('#d8202a', { op: .95, ek: .25 }), glass = () => gm('#ffe8e0', { op: .55, ek: .1 }), fl = () => gm('#ff6a1a', { op: .9, ek: .55, em: '#ff4a00' }), fy = () => gm('#fff0a0', { op: .85, ek: .7, em: '#ffd040' });
    add(lathe([[0, -1.8], [.55, -1.75], [.3, -1.4], [.22, -.6], [.35, -.4], [0, -.35]], 8), red());
    const F = [[0, .5, 1.55, 0], [-.85, .15, 1.25, .18], [.85, .15, 1.25, -.18], [-1.65, -.25, 1.0, .32], [1.65, -.25, 1.0, -.32], [-.45, .0, .9, .1], [.45, .0, .9, -.1]];
    F.forEach(([x, y, h, rz], i) => { if (i) add(tube([[0, -.6, 0], [x * .5, -.9, .1], [x, -.75, 0], [x, y - .55, 0]], .07), red());
      add(lathe([[0, -.35], [.32, -.3], [.38, 0], [.3, .05], [0, .02]], 8), glass(), [x, y - .45, 0]);
      add(drop(.42, h * 1.5, 7), fl(), [x, y, 0], [0, 0, rz]); add(drop(.22, h * .8, 6), fy(), [x, y - .05, .18], [0, 0, rz]); }); },
  Water() { // 분수: 마디 있는 기둥 + 위에서 양옆으로 말려 떨어지는 큰 물결 + 물방울
    base('#3a9cff'); const w = () => gm('#4aaaff', { op: .86, ek: .22 }), wl = () => gm('#c8f0ff', { op: .8, ek: .2 });
    add(lathe([[0, -1.85], [.5, -1.8], [.28, -1.4], [.42, -1.1], [.25, -.8], [.4, -.5], [.22, -.2], [.5, .1], [0, .2]], 8), w());
    [-1, 1].forEach(s => { const P = [[0, .3], [.7, 1.25], [1.6, 1.45], [2.35, .95], [2.5, .2], [2.2, -.35], [1.9, -.05], [2.0, .5], [1.6, .9], [1.0, .85], [.35, .25]].map(([x, y]) => [x * s, y]);
      add(shp(s > 0 ? P : P.slice().reverse(), .55, .22), w(), [0, 0, 0], [0, s * .25, 0]); add(ico(.3, 0), wl(), [s * 2.15, -.55, .1]); add(ico(.2, 0), wl(), [s * 1.55, -.6, .2]);
      const Q = [[.1, .35], [.45, .85], [1.05, .95], [1.4, .55], [1.3, .1], [1.1, .3], [1.0, .6], [.6, .6], [.2, .25]].map(([x, y]) => [x * s, y]); add(shp(s > 0 ? Q : Q.slice().reverse(), .4, .16), wl(), [0, .25, .35], [0, s * .2, 0]); });
    add(drop(.35, .9, 7), wl(), [0, .75, .2]); },
  Grass() { // 해바라기: 넓은 꽃잎 두 겹 + 깎인 주황 공 가운데 + 아래 잎 공
    base('#5ad046'); const lf = () => gm('#4ad050', { op: .9, ek: .25 });
    add(ico(1.05, 1), lf(), [0, -.95, -.1]);
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7 + .3; add(shp([[0, 0], [.35, .45], [0, 1.1], [-.35, .45]], .12, .08), lf(), [Math.cos(a) * .7, -1.0 + Math.sin(a) * .55, .45], [0, 0, a - Math.PI / 2]); }
    const cy = .75, pet = (c) => gm(c, { op: .9, ek: .3 }), P = [[0, 0], [.42, .4], [.36, 1.0], [0, 1.4], [-.36, 1.0], [-.42, .4]];
    for (let i = 0; i < 12; i++) { const a = i * Math.PI * 2 / 12; add(shp(P, .16, .1), pet('#e8f040'), [Math.cos(a) * .55, cy + Math.sin(a) * .55, -.15], [.25 * Math.sin(a), -.25 * Math.cos(a), a - Math.PI / 2]); }
    for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10 + .3; add(shp(P, .14, .08), pet('#c8f060'), [Math.cos(a) * .45, cy + Math.sin(a) * .45, .05], [.3 * Math.sin(a), -.3 * Math.cos(a), a - Math.PI / 2], [.78, .78, .78]); }
    add(ico(.78, 1), gm('#f08a20', { op: .95, ek: .35, tr: .2 }), [0, cy, .3]); },
  Electric() { // 전구 + 안에 번개
    base('#ffd21e', -2.05, 1.0, 1);
    for (let i = 0; i < 3; i++) add(jit(new THREE.TorusGeometry(.62 - i * .04, .13, 5, 14), .01), GOLD(), [0, -1.0 - i * .28, 0], [Math.PI / 2, 0, 0]);
    add(lathe([[0, -1.75], [.45, -1.7], [.6, -.9], [0, -.85]], 10), GOLD());
    add(ico(1.65, 1, .05), gm('#fffbe0', { op: .22, ek: .05, ir: .6 }), [0, .65, 0], [0, 0, 0], [1, 1.05, 1]);
    add(lathe([[0, -.95], [.62, -.9], [.9, -.4], [0, -.3]], 10), gm('#fffbe0', { op: .45 }));
    const B = [[-1.1, .1], [-.6, 1.5], [-.15, .45], [.15, 1.4], [.6, .35], [1.1, 1.65], [.8, -.25], [.3, .75], [0, -.15], [-.3, .8]]; add(shp(B, .3, .1), gm('#ffb800', { op: 1, ek: 1.0, em: '#ff9a00', ir: .2, tr: 0, env: .8 }), [0, .05, 1.72], [0, 0, 0], [.8, .8, .6]); },
  Ice() { // 눈 결정: 마름모 큰 보석들로 된 굵은 팔
    base('#9ae8f8'); const ic = () => gm('#a8f0ff', { op: .88, ek: .22 }), iw = () => gm('#f0ffff', { op: .9, ek: .2 });
    const cy = .45; add(ico(.5, 0), iw(), [0, cy, .1]);
    for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * Math.PI / 3, d = (q) => [Math.cos(a) * q, cy + Math.sin(a) * q, 0];
      add(oct(1), ic(), d(.95), [0, 0, a + Math.PI / 4], [.55, .55, .3]); add(oct(1), iw(), d(1.75), [0, 0, a + Math.PI / 4], [.32, .32, .22]);
      [-1, 1].forEach(s => { const b = d(1.25), ba = a + s * .95; add(oct(1), ic(), [b[0] + Math.cos(ba) * .4, b[1] + Math.sin(ba) * .4, 0], [0, 0, ba + Math.PI / 4], [.22, .22, .14]); }); } },
  Fighting() { // 아래로 좁아지는 큰 주먹 결정 + 아래를 감는 하늘색 회오리 띠
    base('#e8503a'); const r = () => gm('#f0405a', { op: .9, ek: .3 });
    const F = [[-.15, -1.75], [-1.05, -.2], [-1.35, .7], [-1.3, 1.35], [-.95, 1.75], [-.35, 1.85], [.25, 1.8], [.85, 1.6], [1.25, 1.15], [1.3, .55], [1.7, .35], [1.65, -.1], [1.05, -.35], [.35, -1.35]];
    add(shp(F, 1.2, .45, 2), r(), [0, .05, 0], [0, .2, 0]);
    [[-.9, 1.5], [-.35, 1.65], [.2, 1.62], [.75, 1.42]].forEach(([x, y]) => add(ico(.36, 0), gm('#ff6a80', { op: .9, ek: .3 }), [x, y, .62], [0, 0, 0], [1, .8, .8]));
    add(shp([[-1.2, .75], [-.1, .55], [.6, .8], [.35, 1.05], [-1.15, 1.15]], .45, .18), gm('#ff8a9a', { op: .9, ek: .3 }), [0, 0, .78], [0, .2, 0]);
    const cy = gm('#5ae8ff', { op: .85, ek: .7, em: '#2ad0ff', tr: .3 });
    [0, Math.PI].forEach(ph => { const P = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = ph + t * Math.PI * 4.2, rr = 1.9 - t * .9; P.push([Math.cos(a) * rr, -1.75 + t * 2.0, Math.sin(a) * rr * .8]); } add(tube(P, .1, 120, 5), cy, [0, 0, 0], [0, 0, 0], [1, 1, 1]); }); },
  Poison() { // 해골 + 뒤로 엇갈린 뼈
    base('#b45ae6'); const pu = () => gm('#c890f0', { op: .9, ek: .2 }), dk = () => gm('#5a1a8a', { op: 1, ek: .3, tr: 0 }), bn = () => gm('#e8d8ff', { op: .92, ek: .15 });
    [[1, 1], [-1, 1]].forEach(([s]) => { add(jit(new THREE.CylinderGeometry(.17, .17, 4.2, 6), .02), bn(), [0, .25, -.6], [0, 0, s * .75]);
      [-1, 1].forEach(e => { const x = Math.sin(-s * .75) * 2.1 * e, y = .25 + Math.cos(s * .75) * 2.1 * e; add(ico(.28, 0), bn(), [x - .18, y, -.6]); add(ico(.28, 0), bn(), [x + .18, y + .1 * e, -.6]); }); });
    add(ico(1.45, 1), pu(), [0, .55, 0], [0, 0, 0], [1, .95, .78]);
    add(lathe([[0, -1.1], [.75, -1.05], [.85, -.45], [0, -.3]], 8), pu(), [0, -.05, 0]);
    [-1, 1].forEach(s => add(ico(.42, 0), dk(), [s * .55, .45, 1.0], [0, 0, 0], [1, .9, .5])); add(oct(.2), dk(), [0, -.05, 1.05], [0, 0, 0], [1, 1.2, .5]);
    for (let i = 0; i < 4; i++) add(jit(new THREE.BoxGeometry(.24, .3, .2), .01), bn(), [-.39 + i * .26, -.75, .72]); },
  Ground() { // 넓은 윗면(땅 표면 모자이크)이 있는 거꾸로 된 그릇 + 양옆 주황 둥근 돌
    base('#e0aa3a', -2.05, .85, 1); const g = () => gm('#f0c050', { op: 1, ek: .25, tr: .15 }), o = () => gm('#ff8030', { op: .95, ek: .35, tr: .2 });
    const T = new THREE.Group(); T.rotation.x = .75; T.position.set(0, -.1, 0); G.add(T);
    add(lathe([[0, -1.3], [.85, -1.3], [1.5, -1.05], [2.35, .75], [2.3, .95], [0, .95]], 20), g(), [0, 0, 0], [0, 0, 0], [1, 1, 1], T);
    const top = jit(new THREE.IcosahedronGeometry(2.25, 2), .08); const sf = add(top, gm('#f0b848', { op: 1, ek: .2, tr: 0 }), [0, .98, 0], [0, 0, 0], [1, .12, 1], T);
    const cc = sf.geometry.attributes.color, ps = sf.geometry.attributes.position; for (let i = 0; i < ps.count; i += 3) { const x = ps.getX(i), z = ps.getZ(i), land = Math.sin(x * 2.1 + 1) + Math.cos(z * 2.4 - .5) + Math.sin((x + z) * 1.3) > .5; const v = land ? [.55, .3, .08] : [1.25, 1.1, .7]; for (let k = 0; k < 3; k++) cc.setXYZ(i + k, ...v); } cc.needsUpdate = true;
    add(ico(.85, 1), o(), [2.45, .95, .3]); add(ico(.7, 1), o(), [-2.3, -.45, .4]); add(ico(.38, 1), o(), [-1.25, -1.25, .9]); add(ico(.32, 1), o(), [1.3, -1.3, .9]); },
  Flying() { // 풍선 묶음
    base('#9ab8ff'); const bl = [['#4ae070', -1.2, .35, -.2], ['#ff4a5a', 0, .85, 0], ['#4ae070', 1.2, .35, -.2], ['#7ab0ff', .05, -.05, -.6]];
    bl.forEach(([c, x, y, z]) => { add(ico(.85, 1, .06), gm(c, { op: .9, ek: .25 }), [x, y, z], [0, 0, 0], [1, 1.15, 1]); add(oct(.14), gm(c, { op: 1 }), [x, y - 1.0, z]);
      add(tube([[x, y - 1.05, z], [x * .6, y - 1.5, z], [0, -1.75, 0]], .025, 10, 4), gm('#ffffff', { op: 1, ir: 0 })); }); },
  Psychic() { // 눈 (렌즈) + 두 겹 원 받침
    base('#ff68b0'); const p = () => gm('#ff7ac0', { op: .88, ek: .25 });
    add(jit(new THREE.TorusGeometry(.62, .16, 5, 16), .01), p(), [0, -1.35, 0]); add(jit(new THREE.TorusGeometry(.42, .13, 5, 14), .01), p(), [0, -.65, 0]);
    const E = []; for (let i = 0; i <= 16; i++) { const x = -2.2 + 4.4 * i / 16; E.push([x, 1.0 * (1 - (x / 2.2) ** 2) ** .8]); } for (let i = 15; i > 0; i--) { const x = -2.2 + 4.4 * i / 16; E.push([x, -1.0 * (1 - (x / 2.2) ** 2) ** .8]); }
    add(shp(E, .5, .3, 2), p(), [0, .55, 0]); add(ico(.62, 1), gm('#d0207a', { op: .95, ek: .3, tr: .2 }), [0, .55, .4], [0, 0, 0], [1, 1, .6]); add(oct(.3), gm('#ffe0ff', { op: 1, ek: .5 }), [0, .55, .75], [0, 0, 0], [.7, 1.2, .5]); },
  Bug() { // 말린 더듬이 둘 + 가운데 하트 결정
    base('#b8d830'); const g = () => gm('#b8e040', { op: .92, ek: .25 });
    [-1, 1].forEach(s => { add(tube([[s * .2, -1.6, 0], [s * .55, -.6, 0], [s * 1.25, .4, 0], [s * 1.55, 1.3, 0], [s * 1.25, 1.75, 0], [s * .9, 1.5, 0], [s * 1.0, 1.15, 0]], .14, 36), g()); add(ico(.3, 0), gm('#f0ff90', { op: .95 }), [s * 1.0, 1.1, 0]); });
    const Hh = []; for (let i = 0; i < 24; i++) { const t = Math.PI * 2 * i / 24; Hh.push([16 * Math.sin(t) ** 3 / 30, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 30]); }
    add(shp(Hh, .3, .15), gm('#ff80a8', { op: .92, ek: .3 }), [0, -.35, .1]); add(lathe([[0, -1.85], [.55, -1.8], [.3, -1.0], [0, -.95]], 8), g()); },
  Rock() { // 고대 신전: 지붕·기둥·돌 받침 + 양옆 돌
    const s = () => gm('#e8c070', { op: .96, ek: .18 }), o = () => gm('#ff9a3a', { op: .95, ek: .3 });
    add(jit(new THREE.BoxGeometry(3.4, .32, 1.3), .02), s(), [0, -2.0, 0]); add(jit(new THREE.BoxGeometry(3.0, .3, 1.15), .02), s(), [0, -1.7, 0]);
    for (let i = 0; i < 4; i++) add(jit(new THREE.CylinderGeometry(.22, .25, 2.1, 8), .02), s(), [-1.1 + i * .73, -.5, .2]);
    add(jit(new THREE.BoxGeometry(3.1, .3, 1.15), .02), s(), [0, .65, 0]); add(shp([[-1.75, 0], [1.75, 0], [0, 1.1]], .9, .12), s(), [0, .82, 0]);
    add(ico(.25, 0), o(), [0, 1.3, .55]); [-1, 1].forEach(k => add(ico(.48, 1), o(), [k * 2.15, -.4, 0])); },
  Ghost() { // 둥근 유령 + 아래로 말리는 꼬리
    base('#8a6ad8'); const g = () => gm('#a88aff', { op: .85, ek: .3 });
    add(lathe([[0, -.6], [.9, -.4], [1.25, .35], [1.15, 1.0], [.7, 1.5], [0, 1.65]], 12), g(), [0, .05, 0]);
    add(tube([[0, -.4, 0], [.3, -1.0, .1], [-.2, -1.45, .2], [-.75, -1.35, .2], [-.9, -1.0, .1]], .28, 24, 7), g());
    [-1, 1].forEach(s => add(tube([[s * 1.15, .55, 0], [s * 1.7, .35, .1], [s * 1.85, .85, .1]], .16, 12, 6), g()));
    [-1, 1].forEach(s => add(ico(.27, 0), gm('#2a0a5a', { op: 1, ek: .2, tr: 0 }), [s * .42, .75, 1.05], [0, 0, 0], [.8, 1.2, .5])); },
  Dragon() { // 높이 솟은 붉은 날개 둘 + 가운데 가시 돋은 하늘색 결정 + 분홍 기둥
    base('#2ae0c0'); const rw = () => gm('#ff3a50', { op: .9, ek: .3 });
    [-1, 1].forEach(s => { const P = [[.45, -1.2], [1.05, -1.1], [1.75, -.2], [2.15, 1.2], [2.55, 2.6], [1.95, 2.0], [1.55, 2.15], [1.25, .9], [.6, .1]].map(([x, y]) => [x * s, y]); add(shp(s > 0 ? P : P.slice().reverse(), .3, .14), rw(), [0, 0, -.3], [0, -s * .4, s * .05]); });
    add(lathe([[0, -1.85], [.45, -1.8], [.3, -1.0], [.38, -.6], [0, -.5]], 8), gm('#ffb0c0', { op: .9, ek: .2 }));
    const hd = () => gm('#b8ecff', { op: .88, ek: .45, em: '#80d0ff' }); add(ico(.62, 1), hd(), [0, .55, .3]);
    for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + (i - 4) * .38, L = i === 4 ? 1.1 : .75 + (i % 2) * .2; add(jit(new THREE.ConeGeometry(.17, L, 5), .02), hd(), [Math.cos(a) * (.5 + L / 2), .55 + Math.sin(a) * (.5 + L / 2), .3], [0, 0, a - Math.PI / 2]); }
    [-1, 1].forEach(s => add(jit(new THREE.ConeGeometry(.15, .6, 5), .02), hd(), [s * .55, .0, .35], [0, 0, s * 2.3])); },
  Dark() { // 길고 가는 가시가 사방으로 난 별 결정 여러 개가 뭉친 모양 + 노란 별
    base('#d84a5a'); const pk = () => gm('#ff9ab0', { op: .9, ek: .5, em: '#ff4a6a', tr: .35 });
    const spk = (cx, cy, cz, L, sc, m) => { const ic = new THREE.IcosahedronGeometry(1, 0), p = ic.attributes.position, seen = new Set(); add(ico(.5 * sc, 0), m(), [cx, cy, cz]);
      for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)).normalize(), k = v.toArray().map(x => x.toFixed(2)).join(); if (seen.has(k)) continue; seen.add(k); const l = L * sc * (.7 + rnd() * .5), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), v);
        const c = new THREE.Mesh(jit(new THREE.ConeGeometry(.2 * sc, l, 4), .005), m()); c.position.set(cx + v.x * l / 2, cy + v.y * l / 2, cz + v.z * l / 2); c.quaternion.copy(q); faceCol(c.geometry); c.material.vertexColors = true; G.add(c); } };
    spk(-.35, .35, 0, 1.9, 1, pk); spk(.45, -.35, .25, 1.6, .85, pk); spk(-.1, -.9, -.2, 1.3, .7, pk);
    add(shp(star(.75, .32), .25, .1), gm('#ffe030', { op: 1, ek: .8, tr: 0 }), [1.2, 1.45, .2], [0, -.2, .2]); },

  Steel() { // 큰 도끼: 자루 + 크고 투명한 날
    base('#d8dee8'); add(jit(new THREE.CylinderGeometry(.15, .17, 3.9, 6), .01), SILVER(), [0, -.2, 0]);
    add(shp([[.1, .3], [.9, .0], [1.8, -.1], [2.05, .6], [2.1, 1.6], [1.85, 2.1], [.9, 1.75], [.1, 1.55]], .38, .2, 2), gm('#ffffff', { op: .85, ek: .1 }), [0, -.15, 0], [0, -.35, 0]);
    add(shp([[-.1, .55], [-.75, .8], [-.85, 1.05], [-.1, 1.25]], .3, .12), SILVER(), [0, -.05, 0]); add(jit(new THREE.ConeGeometry(.17, .5, 6), .01), SILVER(), [0, 1.95, 0]);
    for (let i = 0; i < 3; i++) add(jit(new THREE.TorusGeometry(.2, .06, 4, 10), .005), GOLD(), [0, -.6 - i * .3, 0], [Math.PI / 2, 0, 0]); },
  Fairy() { // 큰 하트 + 위로 휘는 흰 뿔에 물방울 보석 + 리본
    const pk = () => gm('#ff6ad0', { op: .9, ek: .3 }), wt = () => gm('#ffffff', { op: .88, ek: .1 });
    const Hh = []; for (let i = 0; i < 28; i++) { const t = Math.PI * 2 * i / 28; Hh.push([16 * Math.sin(t) ** 3 / 13, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 13]); }
    add(shp(Hh, .8, .4, 2), pk(), [0, .2, 0]);
    [-1, 1].forEach(s => { const P = [[s * .6, 1.05, -.2], [s * 1.6, 1.15, -.1], [s * 2.3, 1.75, 0], [s * 2.45, 2.25, 0]]; add(tube(P, .15, 24), wt());
      const cv = new THREE.CatmullRomCurve3(P.map(p => V3(...p))); for (let i = 0; i < 5; i++) { const q = cv.getPoint(.15 + i * .19); add(drop(.2, .45, 6), wt(), [q.x + s * .12, q.y - .32, q.z + .1], [0, 0, Math.PI + s * .45]); } });
    const rb = () => gm('#ffb0e8', { op: .93, ek: .25 });
    [-1, 1].forEach(s => { add(jit(new THREE.TorusGeometry(.32, .12, 5, 12), .01), rb(), [s * .4, -1.6, .25], [0, 0, 0], [1, .7, 1]); add(shp([[0, 0], [s * .25, -.7], [s * .45, -.6]], .12, .06), rb(), [s * .1, -1.65, .25]); });
    add(ico(.18, 0), gm('#c890ff', { op: 1, ek: .4 }), [0, -1.6, .45]); },
  Stellar() { // 여러 색 육각 결정 층층 + 위에 파란 테라 별
    base('#58b8ff'); const cols = ['#ff6a8a', '#ffb43c', '#f4e43c', '#4ee08a', '#44b4ff', '#a070ff', '#ff6ad0', '#ff7a2a', '#6ae8ff', '#c8d0e0'];
    const rows = [[7, -1.35, .58], [5, -.35, .6], [3, .6, .6]]; let k = 0;
    rows.forEach(([n, y, r]) => { for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * r * 1.65; add(jit(new THREE.CylinderGeometry(r * .78, r * .78, .3, 6), .02), gm(cols[k++ % cols.length], { op: .9, ek: .35 }), [x, y - Math.abs(x) * .12, -Math.abs(x) * .12], [Math.PI / 2, 0, 0]); } });
    add(shp(star(1.05, .5), .3, .12, 1, [hexP(.28).slice().reverse()]), gm('#3a8aff', { op: .92, ek: .5 }), [0, 1.75, .1]); },
};
window.renderType = (t) => { seed = 11 + t.length * 97; const S = new THREE.Scene(); S.environment = ENV;
  const L1 = new THREE.DirectionalLight('#ffffff', 1.6); L1.position.set(-3, 5, 6); S.add(L1);
  const L2 = new THREE.PointLight('#ff9ad8', 10, 0, 1.6); L2.position.set(4, 2, 3); S.add(L2); const L3 = new THREE.PointLight('#8ae8ff', 10, 0, 1.6); L3.position.set(-4, -1, 3); S.add(L3); S.add(new THREE.AmbientLight('#ffffff', .15));
  G = new THREE.Group(); S.add(G); M[t](); G.rotation.set(.12, -.32, 0);
  const box = new THREE.Box3().setFromObject(G), c = box.getCenter(V3()), sz = box.getSize(V3()); G.position.sub(c);
  const fit = Math.max(sz.x / (W / H), sz.y) * .55 / Math.tan(THREE.MathUtils.degToRad(13)); cam.position.set(0, 0, fit + sz.z); cam.lookAt(0, 0, 0);
  S.background = BG; R.setClearColor(0x000000, 1); R.render(S, cam); const col = R.domElement.toDataURL('image/png');
  S.background = null; S.overrideMaterial = WHITE; G.traverse(o => { if (o.isLineSegments) o.visible = false; }); R.setClearColor(0x000000, 0); R.render(S, cam); const mask = R.domElement.toDataURL('image/png'); S.overrideMaterial = null; return [col, mask]; };
const WHITE = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
window.TYPES = Object.keys(M); window.ready = 1;
