/* 체육관 모드 (경완 기획 2026-10-27): 내 포켓몬으로 나만의 체육관을 운영한다.
   index.html·beta.html 의 체육관 훅이 필드의 체육관 버튼을 누를 때 이 파일을 불러 Gym.prepare() → Gym.enter() 를 부른다.
   저장은 S.gym (본 게임 저장에 같이 들어감). 그림은 본가 파이어레드(pret/pokefirered)에서 tools/gym/mkassets.py 로 뽑은 gym/img/ */
(() => {
'use strict';
// 게임 본체가 꺼내 준 것 (index.html·beta.html 의 체육관 훅 window.GA)
const GA = window.GA, { tyIcon, sfx, save, trOf, esc, menuDots } = GA;
const SPECIES = GA.SPECIES, TYPE_KO = GA.TYPE_KO;
const S = GA.S;
const IMG = 'gym/img/';
// 4세대 플라티나 그림 (경완 2026-10-27 'npc들도 4세대 pt에 맞춰야'): 있으면 pt/ 에서, 걸음 그림은 32칸
const PT_TR = new Set('artist battle_girl beauty bird_keeper black_belt bug_catcher camper champion_cynthia channeler cool_trainer_f cool_trainer_m cyclist_m dragon_tamer elite_four_aaron elite_four_bertha elite_four_flint elite_four_lucian fisherman gentleman hiker jogger lass leader_byron leader_candice leader_fantina leader_gardenia leader_maylene leader_roark leader_volkner leader_wake ninja_boy picnicker poke_kid pokemaniac psychic_m rival_barry rocker ruin_maniac sailor skier_f super_nerd swimmer_f youngster'.split(' ')), PT_OW = new Set('aaron artist barry battle_girl beauty bertha black_belt boy bug_catcher byron camper candice channeler cooltrainer_f cooltrainer_m crasher_wake cyclist_m cynthia dragon_tamer fantina fisher flint gardenia gentleman gym_guy hiker jogger lass lucian man maylene ninja_boy picnicker poke_kid poke_maniac roark rocker ruin_maniac sailor scientist skier_f swimmer_f_land volkner youngster'.split(' '));
const trSrc = k => `${IMG}${PT_TR.has(k) ? 'pt/' : ''}tr/${k}.png`, owSrc = k => `${IMG}${PT_OW.has(k) ? 'pt/' : ''}ow/${k}.png`, owW = k => PT_OW.has(k) || /^pt_/.test(k || '') ? 32 : 16;
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
const loadJs = (src, g) => window[g] ? Promise.resolve() : new Promise(ok => { const x = document.createElement('script'); x.src = `${src}?v=${VER}`; x.onload = x.onerror = () => ok(); document.head.appendChild(x); });
const bgmPlay = n => { try { window.GymBGM?.play(n); } catch (e) {} };
const $g = s => root.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 체육관 디자인 (본가 관동 체육관 맵) ----------
// 좌표는 16px 칸. leader: 관장(나) 자리, door: 문, path: 문 → 관장 앞까지 도전자가 걷는 길(꺾이는 점들),
// slots: 고용 트레이너 자리 [x, y, 보는 방향] (도전자는 그 트레이너가 보는 칸에 멈춰서 배틀), guy: 체육관 안내원
const DESIGNS = [
  { id: 'pewter', n: '바위 계단', sub: '회색시티 체육관', w: 13, h: 16, leader: [6, 5], door: [6, 14], guy: [8, 13],
    deco: [[2, 5], [10, 5], [3, 9], [9, 9], [2, 11], [10, 11], [2, 13], [10, 13]],
    path: [[6, 14], [6, 6]], slots: [[7, 13, 'l'], [5, 11, 'r'], [7, 10, 'l'], [5, 9, 'r'], [7, 8, 'l']] },
  { id: 'cerulean', n: '물 위 다리', sub: '블루시티 체육관', w: 17, h: 20, leader: [8, 6], door: [8, 18], guy: [7, 18],
    deco: [[2, 3], [14, 3], [1, 8], [15, 8], [1, 13], [15, 13], [5, 18], [11, 18]],
    path: [[8, 18], [8, 16], [9, 16], [9, 10], [8, 10], [8, 7]], slots: [[7, 16, 'r'], [8, 13, 'r'], [10, 10, 'l'], [7, 9, 'r'], [9, 8, 'l']] },
  { id: 'vermilion', n: '번개 관문', sub: '갈색시티 체육관', w: 11, h: 21, leader: [5, 2], door: [5, 19], guy: [4, 18],
    deco: [[1, 3], [9, 3], [1, 9], [9, 9], [1, 13], [9, 13], [1, 18], [9, 18]],
    path: [[5, 19], [5, 16], [4, 16], [4, 9], [5, 9], [5, 3]], slots: [[6, 17, 'l'], [3, 15, 'r'], [5, 13, 'l'], [3, 11, 'r'], [6, 8, 'l']] },
  { id: 'celadon', n: '꽃 정원', sub: '무지개시티 체육관', w: 13, h: 20, leader: [6, 4], door: [6, 18], guy: [5, 17],
    deco: [[3, 10], [9, 10], [1, 16], [11, 16], [2, 17], [10, 17], [1, 12], [11, 12]],
    path: [[6, 18], [6, 5]], slots: [[7, 17, 'l'], [5, 13, 'r'], [7, 11, 'l'], [5, 9, 'r'], [7, 7, 'l']] },
  { id: 'fuchsia', n: '넓은 무대', sub: '연분홍시티 체육관', w: 15, h: 16, leader: [7, 6], door: [7, 14], guy: [11, 13],
    deco: [[2, 3], [12, 3], [2, 7], [12, 7], [3, 10], [11, 10], [2, 13], [12, 13]],
    path: [[7, 14], [7, 8]], slots: [[8, 13, 'l'], [6, 12, 'r'], [8, 11, 'l'], [6, 10, 'r'], [8, 9, 'l']] },
];
const dzOf = id => DESIGNS.find(d => d.id === id) || DESIGNS[0];

// ---------- 평판·등급 ----------
const REP_MAX = 1000;
const GRADES = [[0, '새내기 체육관'], [100, '동네 체육관'], [250, '이름난 체육관'], [450, '인기 체육관'], [700, '명문 체육관'], [1000, '전설의 체육관']];
const gradeOf = rep => { let i = 0; GRADES.forEach(([v], k) => { if (rep >= v) i = k; }); return { i, n: GRADES[i][1], lo: GRADES[i][0], hi: GRADES[i + 1]?.[0] ?? REP_MAX }; };

// ---------- 저장 ----------
const st = () => S.gym;
const myTypes = () => { const c = Array(19).fill(0); S.box.forEach(p => (SPECIES[p.sp]?.t || []).forEach(t => c[t]++)); return c; };
const trName = () => (trOf().n || '').trim();
const defName = ty => `${trName() || '나'}의 ${TYPE_KO[ty]} 체육관`;

// ---------- 화면 ----------
let root = null, open = false, tab = null, ents = [], sc = 2;
function build() {
  root = document.createElement('div'); root.id = 'gym'; root.hidden = true; root.setAttribute('role', 'application'); root.setAttribute('aria-label', '체육관');
  root.innerHTML = `
    <div class="gy-main">
      <div class="gy-stage"><div class="gy-map"><img alt=""><div class="gy-ents"></div></div></div>
      <div class="gy-top">
        <button class="win gy-plate" type="button" aria-label="체육관 정보"><span class="gy-nm"></span><span class="gy-grade"></span><span class="gy-rep"><em>평판</em><i class="gy-bar"><i></i></i><b class="gy-repn"></b></span></button>
      </div>
      <div class="win blue gy-dlg" aria-live="polite"></div>
      <section class="gy-sheet" hidden></section>
    </div>
    <nav class="gy-menu" aria-label="체육관 메뉴">
      <button type="button" data-t="battle">배틀</button><button type="button" data-t="train">훈련장</button><button type="button" data-t="staff">트레이너</button><button type="button" data-t="shop">상점</button><button type="button" class="gy-out" data-t="out">퇴근</button>
    </nav>`;
  document.body.appendChild(root);
  $g('.gy-plate').onclick = () => { sfx('tap'); infoPop(); };
  $g('.gy-menu').onclick = e => { const b = e.target.closest('button'); if (!b) return; const t = b.dataset.t; if (t === 'out') return exit(); sfx('tap'); openTab(tab === t ? null : t); };
  // 퇴근은 손가락이 닿는 순간 로딩 화면부터 (click 을 기다리지 않음, 경완 2026-10-27 '여전히 바로 안 뜸')
  $g('.gy-menu .gy-out').addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); exit(); });
  addEventListener('resize', () => { if (open) layout(st()?.d ? undefined : DESIGNS[0]); });
}

// 맵 크기: 화면 폭에 맞추고, 너무 길면 세로로 넘겨 본다
function layout(D = dzOf(st().d)) {
  const stg = $g('.gy-stage'), map = $g('.gy-map'), img = map.querySelector('img');
  const mw = D.w * 16, mh = D.h * 16, aw = stg.clientWidth - 16, ah = stg.clientHeight - 104 - 140;
  sc = Math.min(3.5, aw / mw, Math.max(ah / mh, aw / mw * .8)); sc = Math.max(1, Math.floor(sc * 8) / 8);
  map.style.width = mw * sc + 'px'; map.style.height = mh * sc + 'px';
  img.src = `${IMG}map/${D.id}.png`; img.style.width = mw * sc + 'px'; img.style.height = mh * sc + 'px';
  ents.forEach(place);
}

// ---------- 필드 걸음 그림 (본가 16x32 프레임: 0 아래 1 위 2 왼쪽 3·4 아래 걷기 5·6 위 걷기 7·8 왼쪽 걷기) ----------
const FR = { d: [0, 3, 4], u: [1, 5, 6], l: [2, 7, 8], r: [2, 7, 8] };
function ent(o) {
  const e = Object.assign({ x: 0, y: 0, f: 'd', st: 0, n3: false, fw: owW(o.ow) }, o); e.el = document.createElement('i'); e.el.className = 'gy-ow' + (o.onTap ? ' tap' : '');
  e.el.style.backgroundImage = `url(${o.src || owSrc(o.ow)})`; if (o.onTap) e.el.onclick = ev => { ev.stopPropagation(); o.onTap(e); };
  $g('.gy-ents').appendChild(e.el); ents.push(e); place(e); return e;
}
function place(e) {
  if (e.prop) { const s = e.el.style; s.width = e.w * sc + 'px'; s.height = e.h * sc + 'px'; s.left = (e.x * 16 - (e.w - 16) / 2) * sc + 'px'; s.top = (e.y * 16 + 16 - e.h) * sc + 'px'; s.zIndex = Math.round(e.y * 10) + 9; return; }
  const s = e.el.style, fr = e.n3 ? ({ d: 0, u: 1, l: 2, r: 2 })[e.f] : FR[e.f][e.st];
  s.width = e.fw * sc + 'px'; s.height = 32 * sc + 'px'; s.left = (e.x * 16 - (e.fw - 16) / 2) * sc + 'px'; s.top = (e.y * 16 - 16) * sc + 'px';
  s.backgroundSize = `auto ${32 * sc}px`; s.backgroundPosition = `${-fr * e.fw * sc}px 0`; s.zIndex = Math.round(e.y * 10) + 10;
  e.el.classList.toggle('flip', e.f === 'r');
}
function prop(k, x, y) { const o = DECO[k]; if (!o) return; const e = { prop: 1, x, y, w: o.w, h: o.h, el: document.createElement('i') }; e.el.className = 'gy-prop'; e.el.style.backgroundImage = `url(${IMG}deco/${k}.png)`; $g('.gy-ents').appendChild(e.el); ents.push(e); place(e); return e; }
function clearEnts() { ents.forEach(e => e.el.remove()); ents = []; }
// 칸을 따라 걷기 (한 칸 0.26초, 걸음 프레임 번갈아)
async function walk(e, pts, spd = 260) {
  for (const [tx, ty] of pts) {
    while (e.x !== tx || e.y !== ty) {
      const dx = Math.sign(tx - e.x), dy = Math.sign(ty - e.y); e.f = dx > 0 ? 'r' : dx < 0 ? 'l' : dy > 0 ? 'd' : 'u';
      const x0 = e.x, y0 = e.y, t0 = performance.now(); e.stepN = (e.stepN || 0) + 1;
      await new Promise(done => { const tick = now => { const k = Math.min(1, (now - t0) / spd); e.x = x0 + (dx ? dx : 0) * k; e.y = y0 + (dx ? 0 : dy) * k; e.st = k < .5 ? (e.stepN % 2 ? 1 : 2) : 0; place(e); k < 1 ? requestAnimationFrame(tick) : done(); }; requestAnimationFrame(tick); });
      e.x = Math.round(e.x); e.y = Math.round(e.y);
    }
  }
  e.st = 0; place(e);
}

// ---------- 관장 의상 (상점): 얼굴·머리는 그대로 두고 옷 색만 바꾼다 (경완 2026-10-27 '얼굴은 그대로고 옷만').
// a 윗옷(모자·상의), b 아래옷 색. 내 기본 그림(레드/리프)의 옷 색 묶음을 이 색으로 칠한다. g 값, lv 필요한 체육관 등급
const OUTFITS = {
  red: { n: '빨간 재킷', a: '#d83a30', b: '#34449a', g: 800 }, leaf: { n: '하늘 셔츠', a: '#4aa0e0', b: '#d84848', g: 800 },
  brendan: { n: '호연 모험복', a: '#e85030', b: '#383840', g: 2500 }, may: { n: '호연 반다나', a: '#e04850', b: '#3a7a48', g: 2500 },
  cooltrainer_m: { n: '엘리트 제복', a: '#3870c8', b: '#383848', g: 1500 }, cooltrainer_f: { n: '엘리트 드레스', a: '#e05878', b: '#383848', g: 1500 },
  black_belt: { n: '도복', a: '#f2f2f2', b: '#303034', g: 1500 }, beauty: { n: '분홍 원피스', a: '#f088b8', b: '#f6a0c8', g: 1500 }, gentleman: { n: '정장', a: '#3a3a4c', b: '#2c2c38', g: 1500 },
  blue: { n: '라이벌 스타일', a: '#7050a8', b: '#404050', g: 3000, lv: 1 }, brock: { n: '바위 관장 옷', a: '#b07840', b: '#5e7a3a', g: 3000, lv: 1 }, misty: { n: '물 관장 옷', a: '#f0d040', b: '#e05050', g: 3000, lv: 1 },
  lt_surge: { n: '군복', a: '#6a8440', b: '#585e44', g: 3500, lv: 2 }, erika: { n: '꽃 기모노', a: '#e8a040', b: '#c84868', g: 3500, lv: 2 }, koga: { n: '닌자복', a: '#5a4a80', b: '#2e2838', g: 4000, lv: 3 },
  sabrina: { n: '초능력 드레스', a: '#c03060', b: '#24242c', g: 4000, lv: 3 }, blaine: { n: '연구 가운', a: '#f4f4f4', b: '#e04420', g: 4500, lv: 4 }, giovanni: { n: '보스 정장', a: '#d06830', b: '#2e2e30', g: 5000, lv: 4 },
  lorelei: { n: '얼음 정장', a: '#7ab8f0', b: '#303848', g: 6000, lv: 5 }, lance: { n: '드래곤 망토', a: '#30303e', b: '#d03030', g: 6000, lv: 5 },
};
const myF = () => trOf().sex === 'f';
const myOw = () => myF() ? 'pt_f' : 'pt_m';   // 경완 2026-10-27: 주인공은 플라티나 광휘·빛나 (32x32 걸음 칸)
// 그림마다 옷 색 묶음 (a 윗옷, b 아래옷). 이 색만 바꾸고 피부·머리·모자는 그대로. 빛나는 a 비니·목도리, b 치마·부츠
const CLOTH = {
  'ow/pt_m': { a: ['#5a84e7', '#39638c', '#394252'], b: [] },
  'ow/pt_f': { a: ['#efefff', '#cecede', '#ada5ce'], b: ['#ef94c6', '#c66b9c'] },
  'tr/pt_m': { a: ['#628bd5', '#39628b', '#394152'], b: ['#5a5a6a', '#737b7b'] },
  'tr/pt_f': { a: ['#eeeeff', '#cdcdde', '#9c9cbd'], b: ['#ff94c5', '#c56a9c'] },
  'trb/pt_m': { a: ['#7bacde', '#628bd5', '#4a6283'], b: [] },
  'trb/pt_f': { a: ['#eeeeff', '#cdcdde', '#aca4cd'], b: ['#f6a4c5', '#c56a9c'] },
};
const hx = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2; let h = 0, s = 0;
  if (M !== m) { const d = M - m; s = l > .5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb([h, s, l]) { if (!s) return [l, l, l].map(v => Math.round(v * 255)); const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)); }
// 옷 색 묶음의 밝기 차이는 그대로, 색·채도·가운데 밝기는 옷 색으로
function clothMap(list, to) { const T = rgb2hsl(hx(to)), L = list.map(c => rgb2hsl(hx(c))), mid = L.reduce((a, x) => a + x[2], 0) / L.length, M = new Map();
  list.forEach((c, i) => M.set(c, hsl2rgb([T[0], T[1], clampN(L[i][2] + (T[2] - mid) * .9, .06, .97)]))); return M; }
const fitCache = {};
// 옷을 칠한 그림 (dataURL). kind: ow 맵 걸음 그림 / tr 전신 / trb 배틀 뒷모습. 옷이 없으면 원래 그림
function fitSrc(kind, fit = st()?.fit) {
  const base = myOw(), key = `${kind}/${base}`, url = `${IMG}${key}.png`, O = OUTFITS[fit];
  if (!O || !CLOTH[key]) return Promise.resolve(url);
  const ck = key + '|' + fit; if (fitCache[ck]) return fitCache[ck];
  return (fitCache[ck] = new Promise(ok => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), A = clothMap(CLOTH[key].a, O.a), B = clothMap(CLOTH[key].b, O.b);
    for (let i = 0; i < d.data.length; i += 4) { if (!d.data[i + 3]) continue; const h = '#' + [0, 1, 2].map(k => d.data[i + k].toString(16).padStart(2, '0')).join(''), n = A.get(h) || B.get(h); if (n) { d.data[i] = n[0]; d.data[i + 1] = n[1]; d.data[i + 2] = n[2]; } }
    x.putImageData(d, 0, 0); ok(c.toDataURL()); }; im.onerror = () => ok(url); im.src = url; }));
}
// ---------- 꾸미기 (상점): 인형·쿠션·석상. w 크기(16·32), g 값 ----------
const DECO = {};
[['pikachu_doll', '피카츄 인형', 800], ['pichu_doll', '피츄 인형', 800], ['marill_doll', '마릴 인형', 800], ['jigglypuff_doll', '푸린 인형', 800], ['clefairy_doll', '삐삐 인형', 800], ['togepi_doll', '토게피 인형', 800], ['meowth_doll', '나옹 인형', 800], ['ditto_doll', '메타몽 인형', 800],
 ['chikorita_doll', '치코리타 인형', 1000], ['cyndaquil_doll', '브케인 인형', 1000], ['totodile_doll', '리아코 인형', 1000], ['treecko_doll', '나무지기 인형', 1000], ['torchic_doll', '아차모 인형', 1000], ['mudkip_doll', '물짱이 인형', 1000],
 ['smoochum_doll', '뽀뽀라 인형', 900], ['azurill_doll', '루리리 인형', 900], ['skitty_doll', '에나비 인형', 900], ['swablu_doll', '파비코 인형', 900], ['wynaut_doll', '마자 인형', 900], ['duskull_doll', '해골몽 인형', 900], ['kecleon_doll', '켈리몬 인형', 900], ['gulpin_doll', '꼴깍몬 인형', 900], ['lotad_doll', '연꽃몬 인형', 900], ['seedot_doll', '도토링 인형', 900], ['baltoy_doll', '오뚝군 인형', 900],
 ['pika_cushion', '피카 쿠션', 500], ['round_cushion', '둥근 쿠션', 500], ['kiss_cushion', '키스 쿠션', 500], ['zigzag_cushion', '지그재그 쿠션', 500], ['spin_cushion', '빙글 쿠션', 500], ['diamond_cushion', '다이아 쿠션', 500], ['ball_cushion', '볼 쿠션', 500], ['grass_cushion', '풀 쿠션', 500], ['fire_cushion', '불꽃 쿠션', 500], ['water_cushion', '물 쿠션', 500],
 ['statue', '체육관 석상', 2000, 1],
 ['big_snorlax_doll', '큰 잠만보 인형', 6000, 2], ['big_rhydon_doll', '큰 코뿌리 인형', 6000, 2], ['big_lapras_doll', '큰 라프라스 인형', 6000, 2], ['big_venusaur_doll', '큰 이상해꽃 인형', 8000, 3], ['big_charizard_doll', '큰 리자몽 인형', 8000, 3], ['big_blastoise_doll', '큰 거북왕 인형', 8000, 3], ['big_wailmer_doll', '큰 고래왕자 인형', 6000, 2],
 ['big_regirock_doll', '큰 레지락 인형', 12000, 4], ['big_regice_doll', '큰 레지아이스 인형', 12000, 4], ['big_registeel_doll', '큰 레지스틸 인형', 12000, 4]].forEach(([k, n, g, lv]) => { DECO[k] = { n, g, lv: lv || 0, w: /^big_/.test(k) ? 32 : 16, h: /^big_/.test(k) || k === 'statue' ? 32 : 16 }; });
const decoMax = () => Math.min(8, 2 + (st().decoN || 0));
// 꾸미기 자리: g.dp 놓은 것(순서), g.dpos {꾸미기: [x, y]} 직접 놓은 칸 (경완 2026-10-27 '산 거 직접 놓을 수 있게'). 칸이 없으면 맵의 기본 자리
function decoList(g = st(), D = dzOf(g.d)) { const pos = g.dpos || {}, used = new Set(), out = [];
  (g.dp || []).filter(Boolean).slice(0, decoMax()).forEach((k, i) => { let p = pos[k] && pos[k][2] === D.id && freeTile(D, pos[k][0], pos[k][1], used) ? pos[k] : null;
    if (!p) p = D.deco.find(q => freeTile(D, q[0], q[1], used)); if (!p) return; used.add(p[0] + ',' + p[1]); out.push([k, p[0], p[1]]); });
  return out; }
// 놓을 수 있는 칸: 맵 안쪽, 관장·문·안내원·길·트레이너 자리·관장 옆 포켓몬 자리가 아닌 곳
function freeTile(D, x, y, used) {
  if (x < 1 || y < 2 || x > D.w - 2 || y > D.h - 2 || used?.has(x + ',' + y)) return false;
  if (D.free) return !!D.free[y]?.[x];
  const bad = [[D.leader[0], D.leader[1]], [D.leader[0] + 1, D.leader[1]], [D.leader[0] - 1, D.leader[1]], [D.leader[0], D.leader[1] - 1], [D.leader[0], D.leader[1] + 1], D.door, [D.door[0], D.door[1] - 1], D.guy, ...D.slots];
  if (bad.some(q => q[0] === x && q[1] === y)) return false;
  for (let i = 1; i < D.path.length; i++) { const [a, b] = [D.path[i - 1], D.path[i]]; if (Math.min(a[0], b[0]) <= x && x <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= y && y <= Math.max(a[1], b[1])) return false; }
  return true;
}
// 꾸미기 놓기 모드: 아래 창에서 꾸미기를 고르고 맵의 칸을 누르면 그 자리에 (놓인 걸 누르면 집어 들기)
let ded = null;
function decoEdit() {
  const g = st(), D = dzOf(g.d); g.own = g.own || {}; g.dp = (g.dp || []).filter(Boolean); g.dpos = g.dpos || {};
  openTab(null); root.classList.add('ded'); ded = { sel: null };
  const map = $g('.gy-map'); let grid = map.querySelector('.gy-grid'); if (!grid) { grid = document.createElement('div'); grid.className = 'gy-grid'; map.appendChild(grid); }
  const draw = () => {
    renderHome(true); const L = decoList(g, D), on = new Set(L.map(x => x[0]));
    grid.style.setProperty('--t', 16 * sc + 'px'); grid.innerHTML = ded.sel && on.has(ded.sel) ? (([, x, y]) => `<i class="gg-sel" style="left:${x * 16 * sc}px;top:${y * 16 * sc}px;width:${16 * sc}px;height:${16 * sc}px"></i>`)(L.find(z => z[0] === ded.sel)) : '';
    const own = Object.keys(g.own).filter(k => DECO[k]);
    $g('.gy-dlg').innerHTML = `<span class="gy-who">꾸미기 놓기 <small>${on.size}/${decoMax()}</small></span><span class="gy-dsub">${ded.sel ? `<b>${DECO[ded.sel].n}</b>${on.has(ded.sel) ? ' · 옮길 칸을 누르세요' : ' · 놓을 칸을 누르세요'}` : own.length ? '꾸미기를 고르고 맵의 칸을 누르세요. 놓인 꾸미기를 눌러도 골라져요.' : '아직 산 꾸미기가 없어요. 상점에서 사 오세요.'}</span>
      <div class="gy-dpick">${own.map(k => `<button data-k="${k}" class="${k === ded.sel ? 'sel' : ''}${on.has(k) ? ' on' : ''}"><img alt="" src="${IMG}deco/${k}.png"></button>`).join('')}</div>
      <div class="gy-dyn">${ded.sel && on.has(ded.sel) ? '<button class="gy-dbtn2" type="button" data-a="rm">치우기</button>' : ''}<button class="gy-dbtn2 main" type="button" data-a="ok">완료</button></div>`;
  };
  ded.draw = draw;
  $g('.gy-dlg').onclick = e => { const b = e.target.closest('button'); if (!b || !ded) return; e.stopPropagation(); sfx('tap');
    if (b.dataset.k) { ded.sel = ded.sel === b.dataset.k ? null : b.dataset.k; return draw(); }
    if (b.dataset.a === 'rm') { g.dp = g.dp.filter(k => k !== ded.sel); delete g.dpos[ded.sel]; ded.sel = null; save(); return draw(); }
    if (b.dataset.a === 'ok') return decoDone(); };
  map.onclick = e => { if (!ded) return; const r = map.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / (16 * sc)), y = Math.floor((e.clientY - r.top) / (16 * sc));
    const L = decoList(g, D), hit = L.find(z => z[1] === x && z[2] === y); if (hit) { sfx('tap'); ded.sel = hit[0]; return draw(); }
    if (!ded.sel) return; const used = new Set(L.filter(z => z[0] !== ded.sel).map(z => z[1] + ',' + z[2]));
    if (!freeTile(D, x, y, used)) { sfx('no'); return; }
    if (!g.dp.includes(ded.sel)) { if (g.dp.length >= decoMax()) { $g('.gy-dsub').innerHTML = '꾸미기 자리가 꽉 찼어요. 하나를 치우거나 체육관을 넓혀 주세요.'; return; } g.dp.push(ded.sel); }
    g.dpos[ded.sel] = [x, y, D.id]; sfx('tap'); save(); draw(); };
  draw();
}
function decoDone() { if (!ded) return; ded = null; root.classList.remove('ded'); $g('.gy-map .gy-grid')?.remove(); $g('.gy-map').onclick = null; $g('.gy-dlg').onclick = null; renderHome(); }

// ---------- 운영: 도전자 방문·고용 트레이너·평판·일지·주간 보고 (3·6·7단계) ----------
// 저장(S.gym): day 시간표를 만든 날, sch 오늘 남은 방문 시각, q 관장을 기다리는 도전자, at 필드 체육관 버튼 빨간 점이 뜰 시각,
//   log 일지 [[시각, 종류, 글]], w/l 내 전적, blk 막은 도전자, bk {타입: 막은 수}, bdg {타입: 배지 받은 시각}, nt {이름 있는 트레이너: {s 단계, n 다시 올 수 있는 시각}},
//   wk 이번 주 기록, rpt 지난주 보고서, sf 고용 트레이너, cand 면접 지원자, candN 다음 지원자 시각
const H = 3600e3, DAY = 24 * H;
const rnd = (a, b) => a + Math.random() * (b - a), rndI = (a, b) => Math.floor(rnd(a, b + 1)), pick = L => L[Math.floor(Math.random() * L.length)];
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const nextDay = t => { const d = new Date(dayStart(t)); d.setDate(d.getDate() + 1); return d.getTime(); };
const weekStart = t => { const d = new Date(dayStart(t)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
const seeded = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; }; };
const jong = w => { const c = String(w || '').trim().slice(-1); const k = c.charCodeAt(0); if (k >= 0xac00 && k <= 0xd7a3) return (k - 0xac00) % 28; if (/[013678]/.test(c)) return 1; if (/[a-zA-Z]/.test(c)) return /[lmnr]/i.test(c) ? 1 : 0; return 0; };
const J = (w, a, b) => w + (jong(w) ? a : b), iga = w => J(w, '이', '가'), eul = w => J(w, '을', '를'), eun = w => J(w, '은', '는');
const hhmm = t => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const GB = () => window.GymBattle;

// 도전자 종류: 걸음 그림, 성별, 잘 쓰는 타입, e = 쉬움(1)/보통 (경완 기획 밸런스 표)
const CLS = {
  youngster: { ow: 'youngster', f: 0, t: [1, 7, 4, 5], e: 1 }, lass: { ow: 'lass', f: 1, t: [1, 18, 12], e: 1 }, bug_catcher: { ow: 'bug_catcher', f: 0, t: [7], e: 1 },
  camper: { ow: 'camper', f: 0, t: [5, 6, 10, 1], e: 1 }, picnicker: { ow: 'picnicker', f: 1, t: [12, 1, 18], e: 1 }, fisherman: { ow: 'fisher', f: 0, t: [11], e: 1 },
  swimmer_f: { ow: 'swimmer_f_land', f: 1, t: [11, 15], e: 1 }, bird_keeper: { ow: 'boy', f: 0, t: [3], e: 1 },
  hiker: { ow: 'hiker', f: 0, t: [6, 5, 2] }, super_nerd: { ow: 'scientist', f: 0, t: [13, 4, 10, 9] }, psychic_m: { ow: 'man', f: 0, t: [14] }, black_belt: { ow: 'black_belt', f: 0, t: [2] },
  cool_trainer_m: { ow: 'cooltrainer_m', f: 0, t: [] }, cool_trainer_f: { ow: 'cooltrainer_f', f: 1, t: [] }, beauty: { ow: 'beauty', f: 1, t: [12, 18, 11, 1] },
  gentleman: { ow: 'gentleman', f: 0, t: [1, 10, 17] }, rocker: { ow: 'rocker', f: 0, t: [13, 4] }, sailor: { ow: 'sailor', f: 0, t: [11, 2] }, channeler: { ow: 'channeler', f: 1, t: [8] },
  pokemaniac: { ow: 'poke_maniac', f: 0, t: [16, 5, 6] },
  // 4세대에서 새로 온 트레이너
  poke_kid: { ow: 'poke_kid', f: 1, t: [1, 13, 18], e: 1 }, jogger: { ow: 'jogger', f: 0, t: [1, 2, 3], e: 1 }, cyclist_m: { ow: 'cyclist_m', f: 0, t: [13, 3, 1], e: 1 },
  battle_girl: { ow: 'battle_girl', f: 1, t: [2] }, ninja_boy: { ow: 'ninja_boy', f: 0, t: [4, 7, 17] }, ruin_maniac: { ow: 'ruin_maniac', f: 0, t: [5, 6, 9] },
  dragon_tamer: { ow: 'dragon_tamer', f: 0, t: [16] }, skier_f: { ow: 'skier_f', f: 1, t: [15] }, artist: { ow: 'artist', f: 0, t: [18, 14, 1] },
};
const N3 = new Set(['agatha', 'blaine', 'brock', 'bruno', 'erika', 'koga', 'lance', 'lt_surge', 'misty', 'sabrina']);   // 걸음 프레임이 없는 그림(3칸)
const CHAL_LINES = [
  ['관장님! 저랑 배틀해 주세요!', '오늘은 꼭 배지를 받아 갈 거예요!', '제 포켓몬도 많이 컸어요. 봐 주세요!', '떨리지만… 승부예요!'],
  ['소문 듣고 왔어요. 실력 좀 보여 주시죠.', '이 체육관을 넘어서 더 위로 갈 겁니다!', '준비는 끝났어요. 진지하게 부탁드려요.', '제 전략을 막을 수 있을까요?'],
];
const WIN_LINES = ['으으… 졌다! 더 연습하고 올게요!', '역시 관장님은 강하네요.', '다음엔 꼭 이길 거예요!', '좋은 배틀이었어요. 고맙습니다!'];
const LOSE_LINES = ['해냈다! 제가 이겼어요!', '관장님한테 이기다니… 꿈 같아요!', '좋은 승부였어요, 관장님!'];
const REW = [{ g: 40, r: 2, rl: -4, fr: 1 }, { g: 100, r: 5, rl: -3, fr: 2 }, { g: 300, r: 15, rl: -2, fr: 4 }];
const DIFF_KO = ['쉬움', '보통', '어려움'];
const RIVAL_GYMS = ['무쇠시티 체육관', '영원시티 체육관', '베일시티 체육관', '늪지시티 체육관', '연고시티 체육관', '운하시티 체육관', '선단시티 체육관', '물가시티 체육관'];
let NAMED = [];
const loadNamed = () => NAMED.length ? Promise.resolve() : fetch(`gymb/named.json?v=${VER}`).then(r => r.ok ? r.json() : []).then(j => { NAMED = j || []; }).catch(() => {});

function gInit() {
  const g = st(); if (!g) return null;
  for (const [k, v] of Object.entries({ sch: [], q: [], log: [], w: 0, l: 0, blk: 0, bk: {}, bdg: {}, nt: {}, sf: [], cid: 0 })) if (g[k] == null) g[k] = v;
  return g;
}
const luNow = () => { const g = st(), L = (g.lu || [])[g.luI | 0] || []; return L.map(id => S.box.find(p => p.id === id)).filter(P => P && (SPECIES[P.sp]?.t || []).includes(g.ty)); };
function myAvg() { const g = st(), L = luNow().map(P => g.mon?.[P.id]?.lv).filter(Boolean); return L.length ? Math.round(L.reduce((a, b) => a + b, 0) / L.length) : 10; }
// 레벨에 맞는 종 고르기: 종족값 합이 레벨에 어울리는 포켓몬 (전설·환상·아기 빼고), 타입 맞추기
let spCache = null;
function pickSp(types, lv) {
  if (!spCache) spCache = Object.entries(SPECIES).filter(([n, o]) => +n <= 1025 && !o.leg && !o.my && !o.baby && o.bs).map(([n, o]) => ({ n: +n, t: o.t || [], b: o.bs.reduce((a, c) => a + c, 0) }));
  const tgt = Math.min(530, 230 + lv * 6.5);
  for (const w of [55, 90, 140, 400]) { const L = spCache.filter(x => Math.abs(x.b - tgt) <= w && (!types.length || x.t.some(t => types.includes(t)))); if (L.length) return pick(L).n; }
  return 19;
}
function mkTeam(types, lvB, n) {
  const T = types.length ? types : [rndI(1, 18), rndI(1, 18)];
  return Array.from({ length: n }, (_, i) => { const lv = clampN(lvB + rndI(-2, 1) + (i === n - 1 ? 1 : 0), 2, 100); return [pickSp([pick(T)], lv), lv]; });
}
const teamLv = T => T.reduce((a, m) => a + m[1], 0) / T.length;
function mkChal(t) {
  const g = st(), G = gradeOf(g.rep || 0), avg = myAvg();
  const nm = pickNamed(avg, t); if (nm && Math.random() < .22) return nm;
  const diff = Math.random() < [.75, .55, .4, .3, .2, .15][G.i] ? 0 : 1;
  const k = pick(Object.keys(CLS).filter(x => !!CLS[x].e === !diff)), C = CLS[k];
  const n = diff ? rndI(2, clampN(luNow().length + 1, 2, 4)) : rndI(1, 2);
  return { id: ++g.cid, t, k, cls: GB()?.TR_KO[k] || '트레이너', tr: k, ow: C.ow, nm: pick(C.f ? GB()?.NAMES_F || ['영희'] : GB()?.NAMES_M || ['철수']), diff, team: mkTeam(C.t, Math.max(3, avg + (diff ? -2 : -8)), n) };
}
// 이름 있는 트레이너: 본가 팀 단계. 그 단계 평균 레벨이 내 라인업 평균 + 6 이하일 때부터 온다
function pickNamed(avg, t) {
  const g = st(), busy = new Set(g.q.filter(c => c.named).map(c => c.named));
  const ok = NAMED.filter(n => { const x = g.nt[n.id] || { s: 0, n: 0 }; if (busy.has(n.id) || x.s >= n.st.length || t < (x.n || 0)) return false; return avg >= teamLv(n.st[x.s]) - 6; });
  if (!ok.length) return null;
  const n = pick(ok), s = (g.nt[n.id] || {}).s || 0;
  return { id: ++g.cid, t, named: n.id, s, cls: n.cls, tr: n.tr, ow: n.ow, nm: n.nm, diff: 2, music: n.music, team: n.st[s].map(m => [m[0], m[1], m[2]]) };
}
// 하루 시간표: 등급이 오를수록 많이 온다 (2~5명, 오전 8시 ~ 밤 10시 사이 아무 때나)
function mkSch(d0, from = 0) {
  const G = gradeOf(st().rep || 0), n = 2 + (G.i >= 2) + (G.i >= 4) + (Math.random() < .5);
  return Array.from({ length: n }, () => d0 + rnd(8, 22) * H).filter(t => t > from).sort((a, b) => a - b);
}
function glog(k, html, t = Date.now()) { const g = st(); g.log.unshift([t, k, html]); if (g.log.length > 80) g.log.length = 80; }
function addRep(n) { const g = st(); const r0 = g.rep || 0; g.rep = clampN(r0 + n, 0, REP_MAX); if (g.wk) g.wk.r += g.rep - r0; }
function addG(n) { const v = GA.addGold(n) || 0; if (st().wk) st().wk.g += v; renderGoldG(); return v; }
// 막은 도전자 (내가 이기거나 트레이너가 막음): 그 타입 자격 배지 진행
function blocked() {
  const g = st(), ty = g.ty; g.blk++; g.bk[ty] = (g.bk[ty] || 0) + 1; if (g.wk) g.wk.b++;
  if (g.bk[ty] >= 100 && !g.bdg[ty]) { g.bdg[ty] = Date.now(); g.newBdg = ty; glog('bdg', `<b>${TYPE_KO[ty]} 자격 배지</b>를 받았다! (${TYPE_KO[ty]} 타입으로 도전자 100명)`); }
}
const sfName = s => `${s.cls} ${esc(s.nm)}`;
const TRAITS = {
  train: { n: '훈련광', d: '훈련장 포켓몬 경험치 +20%' }, star: { n: '인기인', d: '도전자를 막으면 평판 +50%' }, money: { n: '수완가', d: '도전자를 막으면 골드 +50%' },
  guts: { n: '근성', d: '배틀에 강하다' }, grow: { n: '성장형', d: '이길수록 포켓몬 레벨이 빨리 오른다' }, thrift: { n: '검소함', d: '월급이 적다' }, lazy: { n: '느긋함', d: '가끔 배틀을 쉬지만 월급이 아주 적다' },
};
// 고용 트레이너가 차례로 도전자와 싸운다 (자동, 레벨·마릿수로 승패 확률)
function staffFight(c) {
  const g = st(), lost = [];
  for (const s of g.sf) {
    if (s.rest || s.yard || (s.trait === 'lazy' && Math.random() < .2)) continue;   // 훈련장에 배치한 트레이너는 도전자를 상대하지 않는다
    const z = (teamLv(s.team) - teamLv(c.team)) / 3 + (s.team.length - c.team.length) * .35 + (s.trait === 'guts' ? .6 : 0) + .3;
    if (Math.random() < 1 / (1 + Math.exp(-z))) {
      s.w = (s.w || 0) + 1; s.xp = (s.xp || 0) + 1;
      if (s.xp >= (s.trait === 'grow' ? 2 : 3)) { s.xp = 0; s.team.forEach(m => { m[1] = Math.min(100, m[1] + 1); }); }
      return { s, lost };
    }
    s.l = (s.l || 0) + 1; lost.push(s);
  }
  return { s: null, lost };
}
function arrive(c) {
  const g = st(), cn = `${c.cls} <b>${esc(c.nm)}</b>`;
  if (!c.named && g.sf.length) {
    const { s, lost } = staffFight(c);
    if (s) {
      const R = REW[c.diff], typed = s.team.some(m => (SPECIES[m[0]]?.t || []).includes(g.ty));
      const gold = addG(Math.round(R.g * .6 * (s.trait === 'money' ? 1.5 : 1))), rep = Math.max(1, Math.round(R.r * .6 * (s.trait === 'star' ? 1.5 : 1) * (typed ? 1.1 : 1)));
      addRep(rep); blocked();
      glog('sf', `${sfName(s)}${jong(s.nm) ? '이' : '가'} ${cn}${jong(c.nm) ? '을' : '를'} 막아 냈다! <small>+${gold}G · 평판 +${rep}</small>`, c.t); return;
    }
    if (lost.length) glog('in', `${cn}${jong(c.nm) ? '이' : '가'} 트레이너 ${lost.length}명을 이기고 올라왔다!`, c.t);
  }
  if (g.q.length >= 5) { glog('out', `${cn}${jong(c.nm) ? '은' : '는'} 기다리는 사람이 많아 그냥 돌아갔다.`, c.t); return; }
  g.q.push(c); if (!g.sf.length || c.named) glog('in', `${cn}${jong(c.nm) ? '이' : '가'} 도전하러 왔다!${c.named ? ' <small>이름 있는 트레이너</small>' : ''}`, c.t);
}
// 지난주 보고서 (월요일): 전적·막은 도전자·번 골드, 가상 체육관들과 점수 순위
function rollWeek(now) {
  const g = st(), k = weekStart(now);
  if (!g.wk) { g.wk = { k, w: 0, l: 0, b: 0, g: 0, r: 0 }; return; }
  if (g.wk.k === k) return;
  const o = g.wk, sc = o.w * 3 + o.b * 2 + Math.max(0, o.r), G = gradeOf(g.rep || 0), r = seeded('wk' + o.k), base = 6 + G.i * 14;
  const L = RIVAL_GYMS.map(n => ({ n, s: Math.round(base * (.3 + r() * 1.6)) })); L.push({ n: g.nm, s: sc, me: 1 }); L.sort((a, b) => b.s - a.s || (b.me ? 1 : -1));
  g.rpt = { ...o, sc, rank: L.findIndex(x => x.me) + 1, of: L.length, top: L.slice(0, 3).map(x => [x.n, x.s, x.me ? 1 : 0]), seen: 0 };
  glog('wk', `지난주 보고서: ${o.w}승 ${o.l}패 · 막은 도전자 ${o.b}명 · ${o.g.toLocaleString()}G · 랭킹 ${g.rpt.rank}위`, k);
  g.wk = { k, w: 0, l: 0, b: 0, g: 0, r: 0 };
}
// 월급 (7일마다). 골드가 모자라면 그 트레이너는 쉰다(배틀 안 함). 골드가 생기면 다음에 바로 낸다
function payDay(now) {
  const g = st();
  for (const s of g.sf) {
    let k = 0;
    while (now >= s.pay && k++ < 20) {
      if (S.gold >= s.wage) { S.gold -= s.wage; s.pay += 7 * DAY; if (s.rest) glog('sf', `${sfName(s)}에게 밀린 월급 ${s.wage}G를 줬다. 다시 체육관을 지킨다.`); else glog('pay', `${sfName(s)} 월급 ${s.wage}G`); s.rest = 0; }
      else { if (!s.rest) glog('sf', `골드가 모자라 ${sfName(s)}에게 월급(${s.wage}G)을 못 줬다. 월급을 줄 때까지 쉰다.`); s.rest = 1; break; }
    }
  }
  try { GA.renderGold(); } catch (e) {} renderGoldG();
}
// 면접 지원자 (하루~이틀에 한 명, 30시간 동안 기다린다)
function mkCand(now) {
  const k = pick(Object.keys(CLS)), C = CLS[k], avg = myAvg(), lv = Math.max(5, avg + rndI(-6, 3)), n = rndI(2, 4), trait = pick(Object.keys(TRAITS));
  const wage = Math.round(clampN((150 + lv * 5 + n * 35) * (trait === 'thrift' ? .7 : trait === 'lazy' ? .55 : trait === 'guts' ? 1.15 : 1), 150, 600) / 10) * 10;
  return { id: ++st().cid, t: now, exp: now + 30 * H, k, cls: GB()?.TR_KO[k] || '트레이너', tr: k, ow: C.ow, nm: pick(C.f ? GB()?.NAMES_F || ['영희'] : GB()?.NAMES_M || ['철수']), f: C.f, trait, wage, team: mkTeam(C.t, lv, n) };
}
const staffMax = () => Math.min(5, 1 + gradeOf(st().rep || 0).i);
function tick(now = Date.now()) {
  const g = gInit(); if (!g || !g.d) return;
  rollWeek(now);
  const today = dayStart(now);
  if (!g.day) { g.day = today; g.sch = mkSch(today, now); g.sch.unshift(now + 90e3); }   // 처음: 1분 반 뒤 첫 도전자
  let guard = 0;
  while (g.day < today && guard++ < 14) {   // 지난 날: 남은 방문을 다 처리하고, 자정까지 안 받은 도전자는 돌아간다
    const end = nextDay(g.day);
    while (g.sch.length && g.sch[0] < end) arrive(mkChal(g.sch.shift()));
    for (const c of g.q) { addRep(-1); glog('out', `${c.cls} <b>${esc(c.nm)}</b>${jong(c.nm) ? '은' : '는'} 기다리다 돌아갔다. <small>평판 -1</small>`, end - 1); }
    g.q = []; g.day = end; g.sch = mkSch(end);
  }
  if (g.day < today) { g.day = today; g.sch = mkSch(today, now); }
  while (g.sch.length && g.sch[0] <= now) arrive(mkChal(g.sch.shift()));
  payDay(now);
  if (g.cand && now > g.cand.exp) { glog('sf', `면접 지원자 ${g.cand.cls} <b>${esc(g.cand.nm)}</b>${jong(g.cand.nm) ? '은' : '는'} 다른 체육관으로 갔다.`, g.cand.exp); g.cand = null; }
  if (!g.cand && now >= (g.candN || 0) && g.sf.length < 5) { g.cand = mkCand(now); g.candSeen = 0; g.candN = now + rnd(20, 40) * H; }
  try { window.GymManage?.tickTrain(now); } catch (e) { console.error(e); }
  setAt(now); save();
}
// 필드 체육관 버튼의 빨간 점 (gym.js 없이도 훅이 S.gym.at 만 보고 띄운다)
function setAt(now = Date.now()) {
  const g = st(); let a = g.q.length ? g.q[0].t : (g.sch[0] || nextDay(now) + 9 * H);
  if (g.rpt && !g.rpt.seen) a = Math.min(a, now);
  if (g.cand && !g.candSeen) a = Math.min(a, g.cand.t);
  a = Math.min(a, weekStart(now) + 7 * DAY + 7 * H);
  g.at = a;
}

// ---------- 도전 받기: 도전자가 문으로 들어와 관장 앞까지 걸어오고, 한마디 → 배틀 → 결과 ----------
let busy = false;
function talk(html, btn = '다음', sub = '') {
  return new Promise(ok => { $g('.gy-dlg').innerHTML = `${html}${sub ? `<span class="gy-dsub">${sub}</span>` : ''}<button class="gy-dbtn" type="button">${btn} ▶</button>`;
    $g('.gy-dbtn').onclick = e => { e.stopPropagation(); sfx('tap'); ok(); }; });
}
async function challenge() {
  const g = st(), c = g.q[0]; if (!c || busy) return;
  const my = luNow(); if (!my.length) { say('라인업이 비어 있어요.', '배틀 메뉴에서 라인업을 먼저 짜 주세요'); openTab('battle'); return; }
  busy = true; openTab(null); root.classList.add('busy');
  try {
    await loadJs('gymb/battle.js', 'GymBattle'); await GB().loadData();
    const D = dzOf(g.d), e = ent({ ow: c.ow, x: D.door[0], y: D.door[1], f: 'u', n3: N3.has(c.ow) });
    say(`${esc(c.cls)} <b>${esc(c.nm)}</b>${jong(c.nm) ? '이' : '가'} 들어온다!`);
    await walk(e, D.path.slice(1)); e.f = 'u'; place(e);
    const N = c.named && NAMED.find(n => n.id === c.named), me = trName() || '관장';
    const line = N ? N.ln[0].replace('{me}', me) : pick(CHAL_LINES[c.diff] || CHAL_LINES[1]);
    await talk(`<span class="gy-who">${esc(c.cls)} ${esc(c.nm)}</span>${esc(line)}`, '배틀 시작', `난이도 ${DIFF_KO[c.diff]} · 포켓몬 ${c.team.length}마리`);
    const team = c.team.map(([sp, lv, mv]) => { const o = GB().foeEntry(sp, lv); if (mv && mv.length) o.mv = mv; if (c.named) o.iv = o.iv.map(() => rndI(22, 31)); return o; });
    document.body.classList.add('gymBattle');
    let res;
    try { res = await GB().run({ my, foe: { tr: c.tr, cls: c.cls, nm: c.nm, team }, diff: c.diff, bg: pick(['in1', 'in2', 'in3']), music: c.music || (c.diff ? 'train' : 'train'), meBackUrl: await fitSrc('trb') }); }
    finally { document.body.classList.remove('gymBattle'); }
    g.q.shift(); const R = REW[c.diff], won = !!res?.won, now = Date.now();
    let gold = 0, rep = 0;
    if (won) { gold = addG(R.g); addRep(R.r); rep = R.r; g.w++; if (g.wk) g.wk.w++; blocked(); res.used.forEach(id => GA.addFr(id, R.fr)); }
    else { addRep(R.rl); rep = R.rl; g.l++; if (g.wk) g.wk.l++; }
    if (N) { const x = g.nt[N.id] || { s: 0 }; g.nt[N.id] = won ? { s: x.s + 1, n: now + rnd(2, 3.5) * DAY } : { s: x.s, n: now + rnd(.8, 1.5) * DAY }; }
    glog(won ? 'win' : 'lose', `${esc(c.cls)} <b>${esc(c.nm)}</b>${won ? `에게 이겼다! <small>+${gold}G · 평판 +${rep}</small>` : `에게 졌다… <small>평판 ${rep}</small>`}`);
    setAt(); save(); renderTop();
    await resultPop(c, res, gold, rep, R);
    const after = N ? (won ? N.ln[1] : N.ln[2]).replace('{me}', me) : pick(won ? WIN_LINES : LOSE_LINES);
    e.f = 'u'; place(e); await talk(`<span class="gy-who">${esc(c.cls)} ${esc(c.nm)}</span>${esc(after)}`, '배웅하기');
    say(''); await walk(e, D.path.slice(0, -1).reverse()); e.el.remove(); ents = ents.filter(x => x !== e);
    if (g.newBdg) await badgeGet(g.newBdg);
  } catch (err) { console.error(err); GA.toast?.('배틀을 시작하지 못했어요'); }
  finally { busy = false; root.classList.remove('busy'); if (open) renderHome(); }
}
// 배틀 결과: 골드·평판, 나간 포켓몬이 받은 경험치·레벨업·새 기술
function resultPop(c, res, gold, rep, R) {
  const won = !!res?.won, xr = res?.xr || {};
  const rows = (res?.used || []).map(id => { const P = S.box.find(p => p.id === id); if (!P) return ''; const x = xr[id], m = st().mon?.[id];
    return `<div class="rs-mon"><img alt="" data-th="${P.id}"><b>${esc(SPECIES[P.sp]?.n || '')}</b><span>Lv.${m?.lv || '?'}${x && x.lv > x.lv0 ? ` <em>▲${x.lv - x.lv0}</em>` : ''}</span><small>${x ? `경험치 +${x.n.toLocaleString()}` : '경험치 없음'}${won ? ` · 친밀도 +${R.fr}` : ''}</small>${x?.learned?.length ? `<small class="nw">새 기술: ${x.learned.map(([id]) => esc(GB().mvKo(id))).join(', ')}</small>` : ''}</div>`; }).join('');
  return new Promise(ok => { const p = pop(`<h4>${won ? '승리!' : res?.quit ? '기권했다' : '패배…'}</h4>
      <div class="rs-sum">${won ? `<span><i class="coin"></i> +${gold}G</span>` : ''}<span>평판 ${rep >= 0 ? '+' : ''}${rep}</span></div>
      <div class="rs-mons">${rows}</div><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, close) => { close(); ok(); });
    GB()?.fillTh(p); });
}
function badgeGet(ty) {
  st().newBdg = 0; save();
  return new Promise(ok => { sfx('tap'); pop(`<h4>자격 배지를 받았다!</h4><div class="bd-get"><img alt="" src="${IMG}badge/${ty}.png"></div><p class="gy-msg" style="text-align:center">${TYPE_KO[ty]} 타입으로 도전자 100명을 막아 냈어요.<br><b>${TYPE_KO[ty]} 자격 배지</b>는 프로필에서도 볼 수 있어요.</p><div class="gy-btns one"><button class="main" data-a="x">좋아!</button></div>`, (a, close) => { close(); ok(); }); });
}

// ---------- 홈 ----------
const GUY_TIPS = [
  () => `어서 와요, 관장님! 여기는 <b>${esc(st().nm)}</b>예요.`,
  () => `도전자는 하루에 몇 번 아무 때나 찾아와요. 누가 오면 필드의 체육관 버튼에 <b>빨간 점</b>이 떠요.`,
  () => `배틀에는 체육관 타입(<b>${TYPE_KO[st().ty]}</b>) 포켓몬만 낼 수 있어요.`,
  () => `도전자를 이길수록 <b>평판</b>이 올라가요. 등급이 오르면 도전자가 더 자주 오고, 트레이너도 더 고용할 수 있어요.`,
  () => `트레이너를 고용하면 도전자를 먼저 상대해 줘요. 다 이기고 올라온 도전자만 관장님이 상대하면 돼요.`,
  () => `도전자는 그날 밤 12시까지 기다려요. 그때까지 안 받으면 돌아가고 평판이 조금 떨어져요.`,
  () => `이름판을 누르면 <b>체육관 일지</b>와 <b>자격 배지</b>를 볼 수 있어요. 월요일엔 지난주 보고서가 와요.`,
  () => `훈련장에 포켓몬을 보내 두면 앱을 꺼도 경험치가 쌓여요. 하루 8시간까지예요.`,
];
let tipI = 0;
// 안내원: 먼저 물어보고, 들으면 체육관 전체 설명을 튜토리얼처럼 (경완 2026-10-27)
const GUY_OW = 'gym_guy';
const GUY_TOUR = () => [
  `어서 와요, 관장님!\n${st().nm}의 안내원이에요.\n체육관 일을 차근차근 알려 드릴게요.`,
  '도전자는 하루에 몇 번\n아무 때나 찾아와요.\n오면 필드의 체육관 버튼에\n빨간 점이 떠요.',
  '아래 상태창의 [도전 받기]를\n누르면 배틀이 시작돼요.\n도전자는 그날 밤 12시까지\n기다려 줘요.',
  `배틀에는 ${TYPE_KO[st().ty]} 타입 포켓몬만\n낼 수 있어요. [배틀] 메뉴에서\n라인업을 3개까지 짜 둘 수 있어요.`,
  '도전자를 이기면 골드와 평판을\n받아요. 평판이 쌓이면\n체육관 등급이 올라요.',
  '등급이 오르면 도전자가 더 자주\n오고, 트레이너를 더 고용하고,\n체육관을 넓힐 수 있어요.',
  '[트레이너] 메뉴의 지원서 탭에\n가끔 지원자가 와요. 면접을 보고\n고용하면 도전자를 먼저 막아 줘요.',
  '고용 관리 탭에서 트레이너를\n훈련장 코치로 보낼 수도 있어요.\n코치는 훈련 경험치를 올려 줘요.',
  '[훈련장]에 포켓몬을 보내 두면\n앱을 꺼도 경험치가 쌓여요.\n하루 8시간까지 훈련해요.',
  '[상점]에서는 기술머신,\n꾸미기, 관장 의상, 체육관\n넓히기를 살 수 있어요.',
  '이름판을 누르면 체육관 정보,\n일지, 자격 배지, 주간 랭킹을\n볼 수 있어요.',
  '한 타입으로 도전자를 100명\n막으면 자격 배지를 받아요.\n그럼 힘내세요, 관장님!',
];
function guyAsk() {
  $g('.gy-dlg').innerHTML = `<span class="gy-who">안내원</span>관장님, 체육관 설명을 처음부터 들어 보실래요?<span class="gy-dsub">체육관이 어떻게 돌아가는지 차근차근 알려 드려요</span><div class="gy-dyn"><button class="gy-dbtn2" type="button" data-a="n">괜찮아요</button><button class="gy-dbtn2 main" type="button" data-a="y">들을래요</button></div>`;
  $g('.gy-dyn').onclick = async e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); sfx('tap');
    if (b.dataset.a === 'n') { say(GUY_TIPS[tipI++ % GUY_TIPS.length](), '안내원'); return; }
    await kang(GUY_TOUR(), { lit: true, nm: '안내원', pic: owSrc(GUY_OW), ow: 1 }); homeSay(); };
}
function renderTop() {
  const g = st(), G = gradeOf(g.rep || 0);
  $g('.gy-nm').innerHTML = `${tyIcon(g.ty)}<span>${esc(g.nm)}</span>`;
  $g('.gy-grade').textContent = G.n;
  $g('.gy-bar>i').style.width = (G.hi > G.lo ? clampN(((g.rep || 0) - G.lo) / (G.hi - G.lo), 0, 1) : 1) * 100 + '%';
  $g('.gy-repn').textContent = `${g.rep || 0}${G.hi > G.lo && G.hi < REP_MAX + 1 ? `/${G.hi}` : ''}`; $g('.gy-grade').dataset.g = G.i;
  renderGoldG(); menuDot();
}
function menuDot() { const g = st(), b = $g('.gy-menu [data-t="staff"]'); if (!b) return; const on = !!(g?.cand && !g.candSeen); let d = b.querySelector('.mdot'); if (on && !d) b.insertAdjacentHTML('beforeend', '<i class="mdot"></i>'); if (!on && d) d.remove(); }
function renderHome(quiet) {
  if (ded && !quiet) return ded.draw();
  const g = gInit(), D = dzOf(g.d);
  renderTop();
  clearEnts(); layout();
  // 꾸미기 → 고용 트레이너(자리마다 보는 방향) → 관장(나) → 안내원
  decoList(g, D).forEach(([k, x, y]) => prop(k, x, y));
  g.sf.filter(s => !s.yard).forEach((s, i) => { const p = D.slots[i]; if (!p) return; ent({ ow: s.ow, x: p[0], y: p[1], f: p[2], n3: N3.has(s.ow), onTap: () => { sfx('tap'); sfCard(s); say(`<span class="gy-who">${sfName(s)}</span>${s.rest ? '월급을 못 받아서 쉬고 있어요…' : pick(['오늘도 체육관은 제가 지킬게요!', '도전자는 저를 먼저 이겨야 해요.', `지금까지 ${s.w || 0}명을 막았어요!`, '관장님, 훈련 열심히 하고 있어요!'])}`, `${TRAITS[s.trait]?.n || ''} · ${s.w || 0}승 ${s.l || 0}패`); } }); });
  const meE = ent({ ow: myOw(), x: D.leader[0], y: D.leader[1], f: 'd', n3: N3.has(myOw()), onTap: () => { sfx('tap'); meCard(); say(`관장 <b>${esc(trName() || '나')}</b>. 오늘도 체육관을 지키고 있다.`, `${g.w}승 ${g.l}패 · 막은 도전자 ${g.blk}명`); } });
  if (g.fit) fitSrc('ow').then(u => { if (meE.el.isConnected) meE.el.style.backgroundImage = `url(${u})`; });
  palEnt(D);
  ent({ ow: GUY_OW, x: D.guy[0], y: D.guy[1], f: 'd', onTap: () => { sfx('tap'); guyAsk(); } });
  if (!quiet) homeSay();
}
// 관장 뒤 포켓몬 (경완 2026-10-27): 기본은 지금 라인업에서 레벨이 가장 높은 포켓몬, 눌러서 바꿀 수 있다 (g.pal)
function palPick() { const g = st(), L = luNow(), P = g.pal && S.box.find(p => p.id === g.pal); if (P) return P;
  return L.slice().sort((a, b) => GB().gm(b).lv - GB().gm(a).lv || GA.ivSum(b) - GA.ivSum(a))[0] || null; }
let palRaf = 0;
function palEnt(D) {
  cancelAnimationFrame(palRaf); const P = GB()?.gm && palPick(); if (!P) return;
  const e = { prop: 1, x: D.leader[0] + .85, y: D.leader[1] - .35, w: 16, h: 16, el: document.createElement('i'), pal: 1 }; e.el.className = 'gy-pal tap';
  e.el.innerHTML = '<i class="gp-sh"></i><i class="gp-sp"></i>'; e.el.onclick = ev => { ev.stopPropagation(); sfx('tap'); palChoose(); };
  $g('.gy-ents').appendChild(e.el); ents.push(e); place(e); e.el.style.zIndex = Math.round(D.leader[1] * 10) + 8;   // 내 캐릭터보다 뒤
  GA.pmd(P.sp, P.sex).then(M => { if (!e.el.isConnected) return; const sp = e.el.querySelector('.gp-sp'), k = sc / 2;
    if (P.shiny) sp.style.filter = `hue-rotate(${GA.shinyHue(P.sp)}deg)`;
    if (!M.P) { sp.classList.add('one'); sp.style.backgroundImage = `url("${M.img}")`; return; }
    const s = M.s * k, A = M.P.a, a = A.Idle || Object.values(A)[0], durs = a[6], tot = durs.reduce((x, d) => x + d, 0) / 60, lift = (GA.lift?.(P.sp) || 0) * k;
    Object.assign(sp.style, { backgroundImage: `url("${M.P.i}")`, backgroundSize: `${M.wh[0] * s}px ${M.wh[1] * s}px`, width: a[1] * s + 'px', height: a[2] * s + 'px', left: (8 * sc - a[4] * s) + 'px', top: (16 * sc - (a[5] + (M.P.fy || 0)) * s - lift) + 'px' });
    let f0 = -1; const t0 = performance.now(); const tick = now => { if (!e.el.isConnected) return; let t = ((now - t0) / 1000) % tot, f = durs.length - 1; for (let i = 0, c = 0; i < durs.length; i++) { c += durs[i] / 60; if (t < c) { f = i; break; } }
      if (f !== f0) { f0 = f; sp.style.backgroundPosition = `${-f * (a[1] + (M.P.G || 0)) * s}px ${-a[0] * s}px`; } sp.style.translate = lift > 2 * k ? `0 ${(Math.sin(now / 260) * 4 * k).toFixed(1)}px` : ''; palRaf = requestAnimationFrame(tick); };
    palRaf = requestAnimationFrame(tick); }).catch(() => {});
}
function palChoose() {
  const g = st(), cur = palPick(), L = S.box.slice().sort((a, b) => GB().gm(b).lv - GB().gm(a).lv).slice(0, 60);
  const p = pop(`<h4>관장 옆 포켓몬</h4><p class="gy-msg">홈 화면에서 내 뒤에 서 있을 포켓몬을 골라요.</p><div class="lu-pick">${L.map(P => `<button data-a="${P.id}" class="${cur && cur.id === P.id ? 'on' : ''}">${GB().thumb(P)}<b>${esc(SPECIES[P.sp]?.n || "")}</b><span>Lv.${GB().gm(P).lv}</span></button>`).join('')}</div><div class="gy-btns"><button data-a="auto">가장 센 포켓몬</button><button data-a="x">닫기</button></div>`,
    (a, close) => { close(); if (a === 'x') return; g.pal = a === 'auto' ? 0 : (+a || a); save(); renderHome(); });
  GB().fillTh?.(p);
}
// 아래 상태창: 기다리는 도전자가 있으면 '도전 받기', 없으면 다음 방문 예고
function homeSay() {
  const g = st(); if (busy) return;
  if (g.q.length) {
    const c = g.q[0];
    $g('.gy-dlg').innerHTML = `${esc(c.cls)} <b>${esc(c.nm)}</b>${jong(c.nm) ? '이' : '가'} 도전하러 왔어요!${g.q.length > 1 ? ` <small>(기다리는 도전자 ${g.q.length}명)</small>` : ''}<span class="gy-dsub">난이도 ${DIFF_KO[c.diff]} · 포켓몬 ${c.team.length}마리${c.named ? ' · 이름 있는 트레이너' : ''}</span><button class="gy-dbtn" type="button">도전 받기 ▶</button>`;
    $g('.gy-dbtn').onclick = e => { e.stopPropagation(); sfx('tap'); challenge(); };
    return;
  }
  // 다음 도전자가 언제 오는지는 알려 주지 않는다. 조용할 땐 체육관 일지 최근 3줄 (경완 2026-10-27 '체육관 일지를 홈화면 하단 상태창에')
  const L = (g.log || []).slice(0, 3);
  $g('.gy-dlg').innerHTML = `<span class="gy-who">체육관 일지</span>${L.length ? `<ul class="gy-hlog">${L.map(([t, k, h]) => `<li><i>${LOG_IC[k] || '·'}</i><span>${h}</span><time>${hhmm(t)}</time></li>`).join('')}</ul>` : '<span class="gy-dsub">아직 기록이 없어요. 도전자가 오면 필드의 체육관 버튼에 빨간 점이 떠요.</span>'}<button class="gy-dmore" type="button">전체 ▶</button>`;
  $g('.gy-dmore').onclick = e => { e.stopPropagation(); sfx('tap'); logPop(); };
}
function renderGoldG() { const e = root && $g('.gy-goldn'); if (e) e.textContent = /[?&]studio/.test(location.search) ? '∞' : S.gold.toLocaleString(); }   // 홈 화면 골드는 뺐다 (경완 2026-10-27). 상점 등에서 쓰면 그대로
function say(html, sub = '') { $g('.gy-dlg').innerHTML = html + (sub ? `<span class="gy-dsub">${sub}</span>` : ''); }

// ---------- 메뉴 창 ----------
const SOON = {
  battle: { t: '배틀', ic: 'tr/red', d: '도전자와 본가처럼 턴제 배틀을 해요.', li: ['체육관 타입 포켓몬으로 6마리까지 라인업', '라인업 저장해 두고 골라 쓰기', '이기면 골드·친밀도·경험치'] },
  train: { t: '훈련장', ic: 'tr/black_belt', d: '포켓몬을 풀어 두면 천천히 경험치가 쌓여요.', li: ['지푸라기 타격대·샌드백을 치는 모션', '새 포켓몬은 날기 장치, 물 포켓몬은 물 위 장치', '가끔 특별한 기술을 배워요'] },
  staff: { t: '트레이너', ic: 'tr/cool_trainer_f', d: '체육관에 트레이너를 5명까지 고용해요.', li: ['가끔 오는 면접 제안', '트레이너마다 특성 (예: 훈련광)', '도전자를 먼저 상대해 주고, 월급은 7일마다'] },
  shop: { t: '체육관 상점', ic: 'tr/gentleman', d: '체육관 운영에 필요한 것을 사요.', li: ['기술머신으로 포켓몬에게 기술 가르치기', '체육관 꾸미기 아이템', '평판이 오르면 체육관 넓히기'] },
};
function openTab(t) {
  tab = t; root.querySelectorAll('.gy-menu button[data-t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t));
  const sh = $g('.gy-sheet'); sh.classList.remove('ty-on'); if (!t) { sh.hidden = true; return; }
  if (t === 'battle') { sh.hidden = false; sh.scrollTop = 0; sh.innerHTML = '<h3>배틀</h3><p class="gy-lead">불러오는 중…</p>'; loadJs('gymb/battle.js', 'GymBattle').then(() => { if (tab === 'battle' && window.GymBattle) GymBattle.tab(sh); }); return; }
  if (t === 'train' || t === 'staff' || t === 'shop') { sh.hidden = false; sh.scrollTop = 0; sh.innerHTML = `<h3>${SOON[t].t}</h3><p class="gy-lead">불러오는 중…</p>`;
    loadJs('gymb/battle.js', 'GymBattle').then(() => GB()?.loadData()).then(() => loadJs('gymb/manage.js', 'GymManage')).then(() => { if (tab === t && window.GymManage) GymManage.tab(t, sh); }); return; }
  const o = SOON[t];
  sh.innerHTML = `<h3>${o.t}</h3><p class="gy-lead">${o.d}</p><div class="gy-soon"><i class="gy-soon-ic" style="background-image:url(${IMG}${o.ic}.png)"></i><b>준비 중이에요</b><p>이 메뉴는 다음 단계에서 열려요.</p><ul>${o.li.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  sh.hidden = false; sh.scrollTop = 0;
}

// ---------- 팝업 ----------
function pop(html, onClick) {
  const p = document.createElement('div'); p.className = 'gy-pop'; p.innerHTML = `<div class="win" role="dialog">${html}</div>`;
  p.onclick = e => { if (e.target === p) { close(); return; } const b = e.target.closest('button[data-a]'); if (b) { sfx('tap'); onClick?.(b.dataset.a, close, p); } };
  const close = () => p.remove(); $g('.gy-main').appendChild(p); return p;
}
// 전신 카드 (경완 2026-10-27: 홈에서 나·트레이너를 누르면 전신 그림). src 그림, h 이름, sub 아랫줄, btn 단추 html
function bodyCard(src, h, sub = '', btn = '', onClick) {
  return pop(`<div class="gy-body"><div class="bd-pic"><img alt="" src="${src}" onload="this.style.width=this.naturalWidth*2+'px';this.style.height=this.naturalHeight*2+'px'"></div><h4>${h}</h4>${sub ? `<p>${sub}</p>` : ''}</div>${btn || '<div class="gy-btns one"><button data-a="x">닫기</button></div>'}`, (a, close, p) => { if (a === 'x') close(); else onClick?.(a, close, p); });
}
async function meCard() { const g = st(), O = OUTFITS[g.fit]; bodyCard(await fitSrc('tr'), `관장 ${esc(trName() || '나')}`, `${g.w}승 ${g.l}패 · 막은 도전자 ${g.blk}명${O ? `<br>입은 옷: ${O.n}` : ''}`); }
function sfCard(s) { bodyCard(trSrc(s.tr), sfName(s), `${TRAITS[s.trait]?.n || ''} · ${s.w || 0}승 ${s.l || 0}패${s.rest ? '<br>월급을 못 받아서 쉬고 있어요' : ''}`); }
function infoPop() {
  const g = st(), D = dzOf(g.d), G = gradeOf(g.rep || 0), d0 = new Date(g.t0 || Date.now());
  pop(`<h4>체육관 정보</h4><dl class="gy-info">
      <dt>이름</dt><dd><span>${esc(g.nm)}</span></dd><button class="gy-chg" data-a="nm">바꾸기</button>
      <dt>타입</dt><dd>${tyIcon(g.ty)}<span>${TYPE_KO[g.ty]}</span></dd><button class="gy-chg" data-a="ty">바꾸기</button>
      <dt>디자인</dt><dd><span>${D.n}</span></dd><button class="gy-chg" data-a="d">바꾸기</button>
      <dt>등급</dt><dd><span>${G.n} · 평판 ${g.rep || 0}</span></dd><i></i>
      <dt>개장일</dt><dd><span>${d0.getFullYear()}년 ${d0.getMonth() + 1}월 ${d0.getDate()}일</span></dd><i></i>
      <dt>전적</dt><dd><span>${g.w || 0}승 ${g.l || 0}패 · 막은 도전자 ${g.blk || 0}명</span></dd><i></i>
    </dl><div class="gy-btns three"><button data-a="log">체육관 일지</button><button data-a="bdg">자격 배지</button><button data-a="rk">주간 랭킹</button><button class="main" data-a="x">닫기</button></div>`, (a, close) => { close(); if (a === 'log') return logPop(); if (a === 'bdg') return badgePop(); if (a === 'rk') return reportPop(true); if (a !== 'x') setup(a); });
}
// 체육관 일지: 날짜별로 누가 왔고 누가 이겼는지
const LOG_IC = { win: '🏆', lose: '💦', sf: '🛡', in: '🚪', out: '👋', pay: '💰', bdg: '🎖', wk: '📋', tr: '💪' };
function logPop() {
  const L = st().log || []; let last = '', html = '';
  for (const [t, k, h] of L) { const d = new Date(t), dk = `${d.getMonth() + 1}월 ${d.getDate()}일`; if (dk !== last) { html += `<h5>${dk}</h5>`; last = dk; } html += `<p class="lg-${k}"><i>${LOG_IC[k] || '·'}</i><span>${h}</span><time>${hhmm(t)}</time></p>`; }
  pop(`<h4>체육관 일지</h4><div class="gy-log">${html || '<p class="gy-msg">아직 기록이 없어요.</p>'}</div><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close) => close());
}
// 자격 배지 18칸: 받은 배지는 색, 아직이면 실루엣과 진행도
function badgePop() {
  const g = st(), n = Object.keys(g.bdg || {}).length;
  pop(`<h4>자격 배지 <small>${n}/18</small></h4><p class="gy-msg">한 타입으로 도전자 100명을 막으면(트레이너가 막은 것 포함) 그 타입 배지를 받아요.</p>
    <div class="gy-bdgs">${TYPE_KO.map((nm, t) => t ? `<div class="${g.bdg[t] ? 'on' : ''}${g.ty === t ? ' cur' : ''}"><img alt="" src="${IMG}badge/${t}.png"><b>${nm}</b><small>${g.bdg[t] ? '획득' : `${Math.min(99, g.bk[t] || 0)}/100`}</small></div>` : '').join('')}</div>
    <div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close) => close());
}
// 주간 보고서·랭킹 (월요일): 지난주 기록 / 이번 주 진행
function reportPop(any) {
  const g = st(), r = g.rpt, w = g.wk || {};
  if (!r && !any) return;
  const cur = `<div class="rk-now"><b>이번 주</b><span>${w.w || 0}승 ${w.l || 0}패 · 막은 도전자 ${w.b || 0}명 · ${(w.g || 0).toLocaleString()}G</span></div>`;
  const body = r ? `<div class="rk-big"><span>지난주 랭킹</span><b>${r.rank}<small>위 / ${r.of}곳</small></b></div>
      <ol class="rk-top">${r.top.map(([n, sc, me]) => `<li class="${me ? 'me' : ''}"><span>${esc(n)}</span><b>${sc}점</b></li>`).join('')}</ol>
      <dl class="gy-info rk-dl"><dt>전적</dt><dd><span>${r.w}승 ${r.l}패 (방어율 ${r.w + r.l ? Math.round(r.w / (r.w + r.l) * 100) : 0}%)</span></dd><i></i><dt>막은 도전자</dt><dd><span>${r.b}명</span></dd><i></i><dt>번 골드</dt><dd><span>${(r.g || 0).toLocaleString()}G</span></dd><i></i><dt>평판</dt><dd><span>${r.r >= 0 ? '+' : ''}${r.r}</span></dd><i></i></dl>` : '<p class="gy-msg">첫 주간 보고서는 다음 주 월요일에 와요.</p>';
  if (r) r.seen = 1; setAt(); save();
  return new Promise(ok => pop(`<h4>주간 보고서</h4>${body}${cur}<p class="gy-msg rk-how">점수 = 이긴 배틀 ×3 + 막은 도전자 ×2 + 올린 평판</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, close) => { close(); ok(); }));
}

// ---------- 처음 설정: 디자인 → 타입 → 이름 (바꾸기는 그 단계 하나만) ----------
function setup(only) {
  const g = st(), first = !g?.d;
  const dr = { d: g?.d || DESIGNS[0].id, ty: g?.ty || 0, nm: g?.nm || '' };
  const steps = only ? [only] : ['d', 'ty', 'nm'];
  let i = 0;
  const el = document.createElement('section'); el.className = 'gy-setup'; root.appendChild(el);
  const counts = myTypes();
  const draw = () => {
    const k = steps[i], last = i === steps.length - 1;
    const head = `<div class="gy-sh">${i === 0 && first ? '<button class="gy-back" type="button" data-x aria-label="체육관 나가기">✕</button>' : '<button class="gy-back" type="button" aria-label="뒤로">◀</button>'}${steps.length > 1 ? `<span class="gy-steps">${steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div>`;
    let body = '', btn = last ? (first ? '체육관 열기' : '저장') : '다음';
    if (k === 'd') {
      const D = dzOf(dr.d), di = DESIGNS.indexOf(D);
      body = `<h3>체육관 디자인</h3><p class="gy-lead">본가 관동 지방 체육관이에요. 나중에 바꿀 수 있어요.</p>
        <div class="gy-dz"><div class="gy-dz-view"><img src="${IMG}map/${D.id}.png" alt="${D.n}"><button class="gy-dz-arw l" type="button" data-m="-1" aria-label="이전">◀</button><button class="gy-dz-arw r" type="button" data-m="1" aria-label="다음">▶</button></div>
        <div class="gy-dz-nm">${D.n}</div><div class="gy-dz-sub">${D.sub}</div><div class="gy-dots">${DESIGNS.map((_, j) => `<i class="${j === di ? 'on' : ''}"></i>`).join('')}</div></div>`;
    } else if (k === 'ty') {
      body = `<h3>체육관 타입</h3><p class="gy-lead">배틀에는 이 타입 포켓몬만 낼 수 있어요. 타입별로 체육관 운영에 성공하면 자격 배지를 받아요.</p>
        <div class="gy-types">${TYPE_KO.map((n, t) => t ? `<button type="button" class="gy-ty${counts[t] ? '' : ' none'}" data-ty="${t}" aria-pressed="${dr.ty === t}">${tyIcon(t)}<span>${n}<small>${counts[t] ? `내 포켓몬 ${counts[t]}` : '아직 없어요'}</small></span></button>` : '').join('')}</div>`;
      if (!dr.ty) btn = '타입을 골라 주세요';
    } else {
      if (!dr.nm) dr.nm = defName(dr.ty);
      body = `<h3>체육관 이름</h3><p class="gy-lead">도전자들이 보는 이름이에요.</p>
        <div class="gy-name"><input type="text" maxlength="14" value="${esc(dr.nm)}" aria-label="체육관 이름"><span class="gy-cnt"></span></div>
        ${first ? `<div class="gy-sum"><img src="${IMG}map/${dr.d}.png" alt=""><div><span>${dzOf(dr.d).n}</span><span>${tyIcon(dr.ty)} ${TYPE_KO[dr.ty]} 타입</span></div></div>` : ''}`;
    }
    el.innerHTML = `${head}<div class="gy-body">${body}</div><button class="gy-key main gy-next" type="button" ${k === 'ty' && !dr.ty ? 'disabled' : ''}>${btn}</button>`;
    const inp = el.querySelector('input');
    if (inp) { const cnt = () => { el.querySelector('.gy-cnt').textContent = `${inp.value.length}/14`; }; cnt(); inp.oninput = () => { dr.nm = inp.value; cnt(); el.querySelector('.gy-next').disabled = !inp.value.trim(); }; }
  };
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.hasAttribute('data-x')) { exit(); return; }
    if (b.classList.contains('gy-back')) { if (i > 0) { i--; draw(); } else el.remove(); return; }
    if (b.dataset.m) { const n = DESIGNS.length, j = DESIGNS.findIndex(D => D.id === dr.d); dr.d = DESIGNS[(j + +b.dataset.m + n) % n].id; draw(); return; }
    if (b.dataset.ty) { const t = +b.dataset.ty, auto = !dr.nm || dr.nm === defName(dr.ty); dr.ty = t; if (auto) dr.nm = ''; draw(); return; }
    if (b.classList.contains('gy-next')) {
      if (steps[i] === 'ty' && !dr.ty) return;
      if (steps[i] === 'nm') { dr.nm = (el.querySelector('input').value || '').trim().slice(0, 14) || defName(dr.ty); }
      if (i < steps.length - 1) { i++; draw(); return; }
      finish();
    }
  };
  // 디자인 미리보기는 옆으로 밀어서도 넘긴다
  let sx = null; el.addEventListener('pointerdown', e => { if (e.target.closest('.gy-dz-view')) sx = e.clientX; });
  el.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) el.querySelector(`.gy-dz-arw.${dx < 0 ? 'r' : 'l'}`)?.click(); });
  const finish = () => {
    if (first) S.gym = { v: 1, d: dr.d, ty: dr.ty, nm: dr.nm, rep: 0, t0: Date.now() };
    else { if (only === 'ty' && dr.ty !== g.ty) { g.tyLog = g.tyLog || []; g.tyLog.push([g.ty, Date.now()]); } Object.assign(g, { d: dr.d, ty: dr.ty, nm: dr.nm }); }
    save(); el.remove(); renderHome();
    if (first) { tick(); renderHome(); opened(); }
  };
  draw();
}
function opened() {
  sfx('tap'); const fx = document.createElement('div'); fx.className = 'gy-fx'; const C = ['#e04838', '#ffd84a', '#58a8e0', '#6ab84a', '#f8f8f8'];
  for (let k = 0; k < 46; k++) { const i = document.createElement('i'); i.style.left = Math.random() * 100 + '%'; i.style.background = C[k % C.length]; i.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); i.style.animationDelay = Math.random() * .6 + 's'; i.style.animationDuration = 1.6 + Math.random() * 1.2 + 's'; fx.appendChild(i); }
  root.appendChild(fx); setTimeout(() => fx.remove(), 3600);
  say(`<b>${esc(st().nm)}</b>의 문을 열었다!`, '안내원을 눌러 보세요');
  setTimeout(() => kang(KANG_OPEN(), { lit: true }), 1400);
}

// ---------- 강박사 안내 (처음 체육관에 올 때, 체육관을 연 뒤) ----------
const KANG_HI = () => [
  '오, 왔구나!\n기다리고 있었단다.',
  '여기는 오랫동안 문을 닫아 둔\n빈 체육관이란다.',
  trName() ? `${trName()}, 오늘부터 네가\n이 체육관의 관장이다!` : '오늘부터 네가\n이 체육관의 관장이다!',
  '관장은 찾아오는 도전자와\n배틀해서 실력을 보여 주는\n사람이지.',
  '먼저 체육관을 꾸며 보자.\n체육관 모양과 타입을\n고르렴.',
  '타입을 정하면 그 타입\n포켓몬만 배틀에 낼 수 있단다.\n잘 고르렴!',
];
const KANG_OPEN = () => [
  '멋진 체육관이구나!',
  '도전자는 하루에 몇 번,\n아무 때나 찾아온단다.',
  '누가 오면 필드의 체육관\n버튼에 빨간 점이 뜨지.',
  '도전자를 이기면 골드를 받고\n평판이 오른단다. 평판이 오르면\n체육관도 커지지.',
  '훈련장에서 포켓몬을 키우고,\n트레이너를 고용해 함께\n체육관을 지킬 수도 있단다.',
  '한 타입으로 도전자를\n100명 막아 내면\n자격 배지를 준단다!',
  '모르는 게 있으면 안내원에게\n물어보렴. 그럼 힘내라,\n관장님!',
];
// lines 를 강박사가 한 줄씩 말한다 (화면을 누르면 다음). lit: 처음부터 밝게 / 아니면 어두운 체육관에 불이 켜지며 시작
function kang(lines, { lit = false, nm = '강박사', pic = GA.KANG, ow = 0 } = {}) {
  return new Promise(done => {
    const k = document.createElement('div'); k.className = 'gy-kang' + (lit ? ' lit' : '') + (ow ? ' guide' : '');
    k.innerHTML = `<i class="gy-k-veil"></i>${ow ? `<i class="gy-k-pic ow${/\/pt\/|pt_/.test(pic) ? ' w32' : ''}" style="background-image:url(${pic})"></i>` : `<img class="gy-k-pic" alt="${nm}" src="${pic}">`}<button class="gy-k-skip" type="button">건너뛰기</button><div class="win gy-k-box" aria-live="polite"><span class="gy-k-nm">${nm}</span><span class="gy-k-t"></span><b class="gy-k-cur" hidden>▼</b></div>`;
    root.appendChild(k);
    const talk = GA.inTyper(k, k.querySelector('.gy-k-t'), k.querySelector('.gy-k-cur'));
    let stop = false; const end = async () => { if (k.classList.contains('bye')) return; stop = true; k.classList.add('bye'); await wait(450); k.remove(); done(); };
    k.querySelector('.gy-k-skip').onclick = e => { e.stopPropagation(); sfx('tap'); end(); };
    (async () => {
      if (!lit) { await wait(500); for (const o of [.55, .9, .25, .6, 0]) { k.style.setProperty('--veil', o); await wait(o ? 110 : 0); } k.classList.add('lit'); await wait(500); }
      k.classList.add('in'); await wait(650);
      for (const t of lines) { if (stop) return; await talk(t); }
      end();
    })();
  });
}


// ---------- 들어가기·나가기 ----------
const preload = src => new Promise(ok => { const i = new Image(); i.onload = i.onerror = () => ok(); i.src = src; });
async function prepare() {
  if (!root) build();
  const g = st(); const L = [preload(`${IMG}ow/${myOw()}.png`), preload(owSrc(GUY_OW))];
  if (g?.d) L.push(preload(`${IMG}map/${g.d}.png`)); else DESIGNS.forEach(D => L.push(preload(`${IMG}map/${D.id}.png`)));
  L.push(loadJs('gymb/bgm.js', 'GymBGM').then(() => { try { window.GymBGM?.prep('gym'); } catch (e) {} }));   // 출근 로딩 동안 체육관 곡을 미리 만든다
  L.push(loadNamed(), loadJs('gymb/battle.js', 'GymBattle').then(() => GB()?.loadData()).then(() => loadJs('gymb/manage.js', 'GymManage')).catch(() => {}));   // 도전자 방문·훈련장 계산에 배틀 자료가 필요
  if (g?.fit) L.push(fitSrc('ow'), fitSrc('trb'), fitSrc('tr'));   // 옷 칠한 그림을 미리
  await Promise.all(L);
}
// 처음: 빈 체육관(회색시티 모양)에 불이 켜지고, 내가 문으로 들어오면 강박사가 설명 → 디자인·타입·이름 정하기
async function intro() {
  const D = DESIGNS[0]; clearEnts(); layout(D); say('', ''); root.classList.add('pre');
  const me = ent({ ow: myOw(), x: D.door[0], y: D.door[1], f: 'u' });
  const k = kang(KANG_HI());
  await wait(1500); await walk(me, [[D.door[0], D.door[1] - 4]]);
  await k; root.classList.remove('pre'); if (!open) return; setup();
}
function enter() {
  open = true; tab = null; root.hidden = false; GA.gymIn(); openTab(null); bgmPlay('gym');   // 체육관 곡: 처음이면 플래티넘 원본 소리를 받아 오는 동안 잠깐 조용하다
  requestAnimationFrame(() => root.classList.add('on'));
  if (st()?.d) { tick(); renderHome(); later(); } else intro();
  setTimeout(() => gymLoad.hide(), 120);
  clearInterval(tickT); tickT = setInterval(() => { if (!open || busy || !st()?.d) return; const n0 = st().q.length; tick(); renderTop(); if (st().q.length > n0) { sfx('tap'); homeSay(); } else if (!st().q.length) homeSay(); }, 20e3);
}
let tickT = 0;
// 들어온 뒤: 지난주 보고서 → 새 배지 → 면접 지원자 알림 (하나씩)
async function later() {
  await wait(700); if (!open) return; const g = st();
  if (g.rpt && !g.rpt.seen) await reportPop();
  if (g.newBdg) await badgeGet(g.newBdg);
}
let leaving = false;
async function exit() {
  if (leaving || !open) return; leaving = true;
  // 퇴근 누르면 로딩 화면부터 바로 (서서히 나타나지 않게, 경완 2026-10-27)
  const L = document.getElementById('gymLoad'); L?.classList.add('inst'); gymLoad.show('퇴근하는 중', '', true); void L?.offsetWidth; L?.classList.remove('inst');
  root.querySelectorAll('.gy-pop,.gy-setup,.gy-kang').forEach(x => x.remove());
  try { window.GymBGM?.free(); } catch (e) {}
  await wait(2800);
  clearInterval(tickT); if (st()?.d) { tick(); setAt(); save(); }
  open = false; root.classList.remove('on'); root.hidden = true; root.querySelectorAll('.gy-kang').forEach(x => x.remove()); root.classList.remove('pre'); GA.gymOut(); clearEnts();
  try { menuDots(); } catch (e) {}
  await wait(200); gymLoad.hide(); leaving = false;
}

window.Gym = { prepare, enter, exit, isOpen: () => open, renderGold: renderGoldG, DESIGNS, _walk: walk, _ent: ent, _tick: tick,
  // gym/manage.js (훈련장·트레이너·상점)이 쓰는 것
  k: { trSrc, owSrc, owW, fitSrc, myF, bodyCard, decoEdit, decoList, st, glog, addG, addRep, save, pop, say, renderHome, renderTop, menuDot, setAt, gradeOf, luNow, myAvg, TRAITS, OUTFITS, DECO, decoMax, staffMax, sfName, N3, IMG, H, DAY, dayStart, nextDay, hhmm, jong, eul, iga, eun, rndI, pick, mkCand, mkTeam, teamLv, dzOf, renderGoldG } };
// 필드 체육관 버튼 빨간 점: 기다리는 도전자·새 소식(at 이 지남)
window.gymDot = () => { const g = S.gym; return !!(g && g.d && ((g.q && g.q.length) || (g.at && Date.now() >= g.at))); };
})();
