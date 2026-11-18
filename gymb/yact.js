/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
/* 2026-11-13 경완 '임팩트·진동·손맛이 아쉽다, 해금 안 된 번뜩임 기술 이름은 안 보이게': 멈칫(히트스톱)·화면 흔들림/밀림·넉백·날아가 터지는 쓰러뜨리기·
   근접 달라붙기·입력 미리 받기·저스트 회피·콤보·상대 공격 예고·대장 낙하 등장·진동 단계(GA.haptic 0/1/2)를 넣고, 번뜩임 기술은 ??? + 타입만 보여 준다. */
/* 훈련장 직접 훈련 = 특훈 (처음엔 운영자 시험, 경완 2026-11-13 '운영자 모드에서 우리 게임 엔진 써서 해볼 수 있게, 내 계정에 영향 아예 가지 않게')
   훈련 중인 포켓몬을 직접 움직여 기술로 상대를 쓰러뜨리는 미니게임. 게임 엔진을 그대로 쓴다:
   바닥 = 훈련장 그림(GymManage.yardShot), 포켓몬 = 필드 PMD 그림(GA.pmdMx), 기술 = 필드 PMD 기술 효과·효과음(GA.pfxKit),
   능력치·기술·노력치·경험치·깨달음 = 체육관 데이터(GymBattle). v26.34 부터 모두에게 공개 — 보상은 end() 의 pay() 가 실제로 준다 (운영자 시뮬 gymSimOn 안에서는 보여 주기만).
   부르는 곳: gym.js yaTest() → GymYA.start({ host, mons }) */
(() => {
'use strict';
const GA = window.GA, SP = GA.SPECIES, GB = () => window.GymBattle;
const TYPE_C = GA.TYPE_C || [], TYPE_KO = GA.TYPE_KO || [];
const STAT_KO = ['HP', '공격', '방어', '특공', '특방', '스피드'];
// 타입 상성 (공격 → 방어): 2배·0.5배·0배
const SE = { 2: [1, 6, 9, 15, 17], 3: [2, 7, 12], 4: [12, 18], 5: [4, 6, 9, 10, 13], 6: [3, 7, 10, 15], 7: [12, 14, 17], 8: [8, 14], 9: [6, 15, 18], 10: [7, 9, 12, 15], 11: [5, 6, 10], 12: [5, 6, 11], 13: [3, 11], 14: [2, 4], 15: [3, 5, 12, 16], 16: [16], 17: [8, 14], 18: [2, 16, 17] };
const NV = { 1: [6, 9], 2: [3, 4, 7, 14, 18], 3: [6, 9, 13], 4: [4, 5, 6, 8], 5: [7, 12], 6: [2, 5, 9], 7: [2, 3, 4, 8, 9, 10, 18], 8: [17], 9: [9, 10, 11, 13], 10: [6, 10, 11, 16], 11: [11, 12, 16], 12: [3, 4, 7, 9, 10, 12, 16], 13: [12, 13, 16], 14: [9, 14], 15: [9, 10, 11, 15], 16: [9], 17: [2, 17, 18], 18: [4, 9, 10] };
const IM = { 1: [8], 2: [8], 4: [9], 5: [3], 8: [1], 13: [5], 14: [17], 16: [18] };
const eff = (a, ds) => ds.reduce((m, d) => m * ((IM[a] || []).includes(d) ? 0 : (SE[a] || []).includes(d) ? 2 : (NV[a] || []).includes(d) ? .5 : 1), 1);
const tysOf = sp => SP[sp]?.t || [1], nmSp = sp => SP[sp]?.n || '???';
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? a : b); };
/* v26.39 경완 '지금 번뜩임이 관장 배틀로 오르는 확률 대비 좀 많이 오르는듯' → 카드 '한 판 최대 5%': 한 판 상한 15 → 5%, 조각 확률도 같이 (잡몹 6% → 1.5% 하늘만, 중간 대장 60% 보라 → 50% 하늘, 마지막 대장은 남은 만큼) */
/* 경완 '근데 완주하면 많이 올라도 될듯': 마지막 대장의 무지개 조각 +5% 는 상한과 따로 (EG_CLEAR) → 완주 한 판 5~10% */
const EV_CAP = 8, EG_CAP = 5, EG_CLEAR = 5;
/* 경완 2026-11-13 '페이즈를 늘려 한 판을 길게, 끝까지 깨면 레벨 5쯤': 10 스테이지 (4·7 = 중간 대장, 9 = 중간 대장 둘, 10 = 대장).
   n = 잡몹 수, lv = 내 레벨 기준 상대 레벨, boss = 대장 칸(0·1 중간 대장, 2 마지막 대장). 시간 제한은 없고(경완 2026-11-13 '체력 다 닳면 끝') 스테이지를 깰 때마다 HP 20% 회복.
   경험치는 '지금 레벨에서 5레벨 오르는 양'을 쓰러뜨린 상대 무게대로 나눠 준다 (끝까지 다 쓰러뜨려야 딱 5레벨). */
/* 경완 2026-11-14 '지금 난이도 너무 쉬움, 어렵게': 잡몹 수 46 → 64, 레벨 +1~2, 한 번에 나오는 수 5 → 스테이지 따라 4~8, 상대 공격 간격·예고 시간 짧게·탄 빠르게·피해 크게, 스테이지 회복 20% → 12%. 받는 피해 1.25배, 열매 35% → 25%. 골드는 잡몹 60% 만 떨어뜨려 한 판 양을 그대로 둔다. */
/* 경완 2026-11-14 '여전히 너무 쉽다' (2차): 레벨 +1 더, 한 번에 5~10마리, 상대 HP·속도·공격 빈도 올림, 받는 피해 1.25 → 1.45배, 맞은 뒤 무적 .5초, 스테이지 회복 8%, 뒤 스테이지 원거리 상대는 세 갈래로 쏨, 대장 HP 올림 + 패턴 늘림 */
const STAGES = [{ n: 7, lv: -2 }, { n: 9, lv: -2 }, { n: 11, lv: -1 }, { n: 5, lv: -1, boss: [0] }, { n: 12, lv: 0 }, { n: 14, lv: 0 }, { n: 6, lv: 1, boss: [1] }, { n: 16, lv: 1 }, { n: 6, lv: 2, boss: [0, 1] }, { n: 7, lv: 2, boss: [2] }];   /* 경완 2026-11-15 '스테이지마다 좀 길어도 될 것 같고': 잡몹 64 → 93 (한 번에 나오는 수 MOB_MAX 는 그대로, 경험치는 XW_ALL 이 알아서 나눔) */
const MOB_MAX = w => Math.min(10, 5 + Math.floor(w / 2)), BOSS_BGM = { 4: 'gymBattle', 7: 'tenno', 9: 'boss' };   /* 대장 스테이지마다 다른 곡 (관장 → 사천왕 → 전설 → 마지막은 디아루가·펄기아 곡) */
const XP_KO = 9, XP_GM = [.6, .4, .25, .15, .15, .1, .1], CLEAR_X = { S: .5, A: .25 };
const XW = { mob: i => 1 + i * .15, mid: 5, fin: 10 }, XW_ALL = STAGES.reduce((a, S, i) => a + S.n * XW.mob(i) + (S.boss || []).reduce((b, k) => b + (k === 2 ? XW.fin : XW.mid), 0), 0);
// 골드: 색마다 값이 다르다 (동 1 · 은 3 · 금 10). 번뜩임: 색마다 게이지 값·연출이 다르다 (하늘 1% 조용히 · 보라 3% · 무지개 5% 크게)
const YA_SX = { 6: 1.1, 7: 1.2, 8: 1.3, 9: 1.45, 10: 1.6 },   /* v27.18 도달 스테이지별 골드 배수 (완주는 ×2) */
  CV = [0, 1, 3, 10], cval = cv => CV[cv], BAG_B = { 4: 12, 7: 25, 9: 18, 10: 120 }, BAG_COMBO = 10, BAG_COMBO_N = 100, /* 경완 '엉 그렇게 해줘' (2026-11-16): 20콤보마다 8G → 100콤보마다 10G. 자동 플레이 시뮬에서 콤보 자루가 완주 골드의 절반 넘음(1분 약 185G) */ CLEAR_G = { S: 320, A: 220 }   /* 경완 2026-11-16 '10스테이지까지 클리어하면 1,000G 정도는 받게': 완주 보너스 S 150 → 320·A 80 → 220, 우두머리 자루 60 → 120 (시뮬 완주 802G → 약 1,000G, 중간에 쓰러진 판은 그대로) */, S_HITS = 12,   /* 경완 2026-11-14 저녁 '다른 미니게임 수준에 맞추되 잘하면 잘 벌게': 기본 동전은 적게(1분 30~40G), 대장 꾸러미는 스테이지가 뒤일수록 큼, 콤보 20마다 꾸러미, 아슬아슬 회피마다 동전, 완주 등급 보너스 */   /* 경완 2026-11-14 '7스테이지에서 쓰러지면 2~300G, 끝까지 깨면 약 1,000G': 뒤 스테이지일수록 동전 값이 큼 */
  CPAL = [null, ['#6a4400', '#ffc830', '#d08a00', '#fff2a0'], ['#6a4400', '#ffc830', '#d08a00', '#fff2a0'], ['#6a1010', '#f04a3a', '#b02020', '#ffb0a0']];   /* 경완 2026-11-16 '골드 크기는 값으로 차이 두기 보다는 큰 값은 빨강으로': 크기는 모두 같게, 10G 짜리(3)만 빨강 */   /* 경완 2026-11-16 '떨어지는 골드 색은 그냥 아이콘이랑 동일한 금색 골드로': 동·은 색을 없애고 모두 점수판 동전과 같은 금색, 값은 크기로만 구분 */
const EGV = [0, 1, 3, 5], EGC = [null, '#58c8ff', '#b47cff', '#ff6ad0'];
const ITEMS = { magnet: { n: '자석', c: '#e04848', im: 'magnet' }, bomb: { n: '폭탄', c: '#8a4ad8', im: 'toxicorb' }, berry: { n: '열매', c: '#4a8ae8', im: 'sitrusberry' }, power: { n: '기합', c: '#f08020', im: 'xattack' } };
/* 경완 2026-11-14: 아이템 = 본가 도구 그림(자석·연막탄·자뭉열매·플러스파워) + 테두리 빛만 */
/* 경완 2026-11-14 '폭탄은 폭탄다운 아이콘으로, 아이템에 글자는 안 써도': 본가 도구 그림에 폭탄이 없어 16칸 도트로 직접 그림 (검은 공 + 심지 불꽃) */
const BOMB_PX = ['................', '..........R.....', '.........ROY....', '........bYR.....', '.......bb.......', '.....kkkbkk.....', '...kkKKKKKKkk...', '..kKKWWKKKKKKk..', '..kKWWKKKKKKKk..', '.kKKWKKKKKKKKKk.', '.kKKKKKKKKKKKKk.', '.kKKKKKKKKKKKDk.', '..kKKKKKKKKKDk..', '..kKKKKKKKKDDk..', '...kkKKKKDDkk...', '.....kkkkkk.....'], BOMB_C = { k: '#16161e', K: '#3c3c4e', W: '#b8b8cc', D: '#262632', b: '#b08040', Y: '#ffe27a', O: '#ff8a30', R: '#ff4a3a' };
const ITIM = {}; function itemIm(k) { let o = ITIM[k]; if (!o && k === 'bomb_px') { const mk = wh => { const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); BOMB_PX.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '.') return; x.fillStyle = wh ? '#fff' : BOMB_C[ch]; x.fillRect(i * 3, j * 3, 3, 3); })); return c; }; return (ITIM[k] = { im: mk(false), wh: mk(true) }); }
  if (!o) { o = ITIM[k] = { im: new Image(), wh: null }; o.im.onload = () => { const c = document.createElement('canvas'); c.width = o.im.width; c.height = o.im.height; const x = c.getContext('2d'); x.drawImage(o.im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); o.wh = c; }; o.im.src = `gym/img/item/${ITEMS[k].im}.png`; } return o; }
/* 경완 2026-11-13 '회오리불꽃·병상첨병·불꽃세례가 다 똑같은 탄': 필드 기술 효과 자료(PMD)가 258개뿐이라 없는 기술은 전부 둥근 탄이었다.
   레조넌스처럼 기술마다 갈래를 정한다 (기술 id 로): 소용돌이 장판·지점 낙하·빔·여러 발·흡수, 탄 모양은 타입별. */
const RX = { hide: /^dig$|^fly$|^dive$|^bounce$|phantomforce|shadowforce|skydrop/, vortex: /firespin|whirlpool|sandtomb|^wrap$|^bind$|clamp|magmastorm|infestation|thundercage|snaptrap|twister|hurricane|tornado|razorwind|bleakwindstorm|sandsearstorm|wildboltstorm/, drain: /absorb|drain|leechlife|hornleech|oblivionwing|dreameater|paraboliccharge/,
  multi: /ember|watergun|pinmissile|bulletseed|spikecannon|barrage|iciclespear|rockblast|watershuriken|^bubble$|powdersnow|poisonsting|magicalleaf|razorleaf|mudshot|mudslap|^acid$|smog|twineedle|^swift$/, beam: /beam|ray$|cannon|pump|thrower|laser|breath|blast$|pulse$/,
  spot: /thunder|meteor|rockslide|ancientpower|^psychic$|extrasensory|confusion|nightshade|^hex$|earthpower|eruption|iciclecrash|avalanche|rocktomb|judgment|futuresight|doomdesire|seedbomb|eggbomb|venoshock|powergem|ominouswind|silverwind|icywind|shadow(?!ball)/ };
/* 변화 기술은 기술 이름대로 (경완 '작아지기는 진짜 작아지게'): 작아지기·분신·빨라짐·방어·단단해짐·회복, 상대에게 거는 기술은 둘레 상대에게 약해짐·멈춤·느려짐·서서히 피해. 나머지(칼춤 등)는 범위 UP */
const ST = [['trap', /spikes|stealthrock|stickyweb|spiderweb/], ['field', /terrain$/], ['wx', /raindance|sunnyday|sandstorm|^hail$|snowscape|chillyreception/], ['shrink', /minimize/], ['clone', /doubleteam/], ['prot', /protect|detect|endure|kingsshield|spikyshield|banefulbunker|substitute|obstruct|silktrap|burningbulwark|wideguard|quickguard/], ['heal', /recover|softboiled|roost|synthesis|moonlight|morningsun|slackoff|milkdrink|^rest$|healorder|^wish$|aquaring|ingrain|lifedew|shoreup|healbell|aromatherapy|junglehealing|swallow|refresh|healpulse/],
  ['haste', /agility|rockpolish|autotomize|shiftgear|tailwind/], ['guard', /harden|defensecurl|irondefense|acidarmor|barrier|withdraw|cosmicpower|amnesia|reflect|lightscreen|stockpile|cottonguard|auroraveil|safeguard|^mist$|shelter/],
  ['stun', /thunderwave|stunspore|glare|sleeppowder|hypnosis|^sing$|^spore$|lovelykiss|grasswhistle|yawn|darkvoid|confuseray|supersonic|swagger|flatter|sweetkiss|teeterdance|attract|meanlook|^block$|spiderweb|disable|encore/], ['slow', /scaryface|stringshot|cottonspore|stickyweb|gravity/],
  ['weak', /growl|leer|tailwhip|screech|charm|featherdance|faketears|metalsound|tickle|nobleroar|babydolleyes|confide|playnice|kinesis|sandattack|smokescreen|^flash$|sweetscent|captivate|eerieimpulse|partingshot|memento|taunt|torment|^roar$|whirlwind/], ['dot', /toxic|poisonpowder|poisongas|willowisp|leechseed|spikes|stealthrock|^curse$|nightmare/]];
const stOf = id => (ST.find(r => r[1].test(id)) || ['power'])[0];
/* 경완 2026-11-14 '불꽃 타입이 강해지는 기술을 쓴 다음 불꽃 기술을 쓰면 효과가 더 두껍고 강력한 느낌, 나머지 타입도': 강해진 상태(쾌청 = 불꽃, 비 = 물, 그래스·일렉트릭·사이코필드 = 그 타입, 칼춤 같은 힘 올리기 = 전부)에서 그 타입 공격 기술은
   빔이 굵어지고 탄·번개·베기·파동이 커지고, 쓸 때 타입 색 기운이 터지고, 몸에서 그 색 기운이 피어오르고, 버튼이 빛난다. 위력도 조금 오른다 (힘 올리기 1.25배, 필드 1.3배, 날씨는 원래 1.5배). */
const AMP_WX = { sun: 10, rain: 11 }, AMP_F = { grass: 12, elec: 13, psy: 14 }, AMP = 1.45;
const ampOf = v => { const G = R?.G; if (!G || !v?.c) return 0; return G.me.buff > 0 || (G.wx && AMP_WX[G.wx.k] === v.t) || G.fields.some(f => AMP_F[f.k] === v.t) ? 1 : 0; };
function ampFx(x, y, col, big) { ring(x, y - 18, col, 54, 8, .2, 7, 1); ring(x, y - 18, '#fff', 40, 6, .16, 3, 1, .03); for (let j = 0; j < (big ? 12 : 7); j++) part({ x: x + (Math.random() - .5) * 40, y: y - Math.random() * 14, vy: -110 - Math.random() * 110, life: .35 + Math.random() * .25, col: j % 3 ? col : '#fff', sz: j % 2 ? 5 : 4 }); shake(.1); zoom(.02); }
const RNG = 1.5, BUFF_T = 8;   /* 변화 기술: 8초 동안 기술 범위 1.5배 (경완 '힘이 솟는다는 게 안 보인다, 범위가 늘어나게') */

let R = null;   // 지금 열린 판 (화면·상태 전부)
const CSS = `
#yact{position:absolute;inset:0;z-index:5000;background:#1c1c2e;color:#fff;font-family:var(--px);overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;--ink:#20202c}
#yact *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
#yact canvas{position:absolute;left:0;top:0;display:block;image-rendering:pixelated}
#yact .ya-hud{position:absolute;z-index:3;pointer-events:none}
#yact .mg-hg.up{animation:yaHg .35s ease-out}
@keyframes yaHg{40%{transform:scale(1.25);color:#fff}}
#yact .coin{display:inline-block;width:14px;height:14px;background:#ffc830;box-shadow:inset -3px -3px 0 #d08a00,inset 3px 3px 0 #fff2a0,0 0 0 2px #6a4400;flex:none;margin-right:6px}
#yact .pan{background:rgba(28,28,46,.66);border:3px solid var(--ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),3px 3px 0 rgba(0,0,0,.22);padding:5px 8px}
#yact .bar{height:8px;background:#4a4a5a;border:2px solid var(--ink);position:relative;overflow:hidden}
#yact .ya-hpf{position:absolute;left:0;top:0;bottom:0;background:#58d050;transition:width .2s}
#yact .ya-hpf.y{background:#f8c030}#yact .ya-hpf.r{background:#f05038}
#yact .ya-tm.low{color:#ff7a6a;animation:yaTm .5s steps(2) infinite}
@keyframes yaTm{50%{opacity:.5}}
#yact .b3{font-family:var(--px);font-weight:700;border:3px solid var(--ink);color:var(--ink);background:#fff;box-shadow:0 4px 0 var(--ink);cursor:pointer;transition:transform .06s,box-shadow .06s}
#yact .b3:active,#yact .b3.pr{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}
#yact .ya-rw .ex b{color:#9fd8ff}#yact .ya-rw .ev b{color:#d6b4ff}
#yact .ya-eg{padding:5px 8px 6px;transform-origin:0 50%}
#yact .ya-eg.up{animation:yaEg .5s ease-out}
@keyframes yaEg{30%{transform:scale(1.08);box-shadow:inset 0 0 0 2px #ffe27a,0 0 14px #ffe27a}}
#yact .ya-eg .r1{display:flex;align-items:center;gap:5px;font-size:11px;margin-bottom:4px}
#yact .ya-eg .r1 b{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#yact .ya-egt{font-size:9px;padding:1px 4px;border:1px solid var(--ink);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.5)}
#yact .ya-egf0{position:absolute;left:0;top:0;bottom:0;background:#8a8a9c}
#yact .ya-egf{position:absolute;left:0;top:0;bottom:0;--tc:#ee99ac;background:repeating-linear-gradient(-45deg,var(--tc) 0 4px,color-mix(in srgb,var(--tc),#fff 35%) 4px 8px);transition:width .4s}
#yact .ya-eg .r2{display:flex;justify-content:space-between;font-size:10px;margin-top:3px;color:#cfd0e6}
#yact .ya-egp{color:#ffe27a}
#yact .ya-joy{position:absolute;left:0;bottom:0;width:58%;height:46%;z-index:4;display:none}
#yact .ya-joyb{position:absolute;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;background:rgba(28,28,46,.28);border:3px solid rgba(255,255,255,.4);z-index:5;pointer-events:none;opacity:0;transition:opacity .15s}
#yact .ya-joyb.on{opacity:1}
#yact .ya-joyk{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:rgba(255,255,255,.85);border:3px solid var(--ink)}
#yact .ya-hint{position:absolute;left:18px;bottom:calc(26px + env(safe-area-inset-bottom));z-index:3;font-size:11px;text-shadow:0 1px 0 var(--ink);opacity:.85;pointer-events:none;display:none}
#yact .ya-pad{position:absolute;right:10px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:4;display:none;flex-direction:column;align-items:center;gap:10px}   /* 경완 2026-11-13: 회피 버튼은 기술 버튼 위 */
#yact .mvb{position:relative;height:54px;padding:4px 4px 3px;border:3px solid var(--ink);background:var(--tc);color:#fff;font-family:var(--px);text-align:left;box-shadow:0 4px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;cursor:pointer}
#yact .mvb .tg{font-size:9px;line-height:1;align-self:flex-start;padding:1px 3px;background:rgba(0,0,0,.28)}
#yact .mvb b{font-size:12px;line-height:1.1;text-shadow:0 1px 0 var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#yact .mvb small{font-size:9px;opacity:.9;text-shadow:0 1px 0 var(--ink)}
#yact .mvb.pr,#yact .ya-dg.pr{animation:yaPr .16s}
@keyframes yaPr{40%{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}}
#yact .mvb .cdo{position:absolute;inset:0;pointer-events:none;background:conic-gradient(rgba(20,20,34,.62) var(--p,0deg),transparent 0)}
#yact .mvb.cd{filter:saturate(.6)}
#yact .mvb.ch{transform:translateY(3px);box-shadow:0 1px 0 var(--ink),0 0 0 3px #fff,0 0 14px 4px var(--tc);filter:brightness(1.25)}
#yact .mvb.ch .cdo{background:conic-gradient(rgba(255,255,255,.45) var(--p,0deg),transparent 0)}
#yact .ya-dg{position:relative;width:62px;height:62px;border-radius:50%;border:3px solid var(--ink);background:#f4f0e6;color:var(--ink);font-family:var(--px);font-weight:700;font-size:12px;box-shadow:0 4px 0 var(--ink);overflow:hidden;margin-bottom:0;cursor:pointer}
#yact .ya-dg::after{content:"";position:absolute;inset:0;background:conic-gradient(rgba(20,20,34,.5) var(--p,0deg),transparent 0)}
#yact.play .ya-joy,#yact.play .ya-pad{display:flex}
#yact.play .ya-hint{display:block}
#yact:not(.play) .ya-hud{display:none}
#yact .ya-ban{position:absolute;left:0;right:0;top:34%;z-index:5;text-align:center;font-size:24px;line-height:1.2;padding:11px 0;text-shadow:0 3px 0 var(--ink),0 0 10px rgba(0,0,0,.4);pointer-events:none;opacity:0;overflow:hidden}
#yact .ya-ban::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(20,20,40,0),rgba(20,20,40,.8) 16%,rgba(20,20,40,.8) 84%,rgba(20,20,40,0))}
#yact .ya-ban span{display:inline-block}
#yact .ya-warn{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden}
#yact .ya-warn::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(60,0,0,0) 38%,rgba(120,0,8,.5) 78%,rgba(70,0,6,.82) 100%);opacity:0}
#yact .ya-warn.on::before{animation:yaWarnP .75s ease-out 4}
#yact .ya-warn i{position:absolute;left:0;right:0;height:26px;display:block;overflow:hidden;background:repeating-linear-gradient(-45deg,rgba(214,40,26,.92) 0 14px,rgba(34,22,24,.92) 14px 28px);border-top:2px solid #20101a;border-bottom:2px solid #20101a;opacity:0;font-style:normal}
#yact .ya-warn i.t{top:27%}#yact .ya-warn i.b{bottom:30%}
#yact .ya-warn.on i{animation:yaWarnI 3s ease-out both}
#yact .ya-warn b{position:absolute;left:0;top:0;white-space:nowrap;font-size:13px;line-height:22px;letter-spacing:2px;color:#ffe27a;text-shadow:0 2px 0 #20101a,1px 0 #20101a,-1px 0 #20101a}
#yact .ya-warn.on i.t b{animation:yaWarnL 3s linear both}#yact .ya-warn.on i.b b{animation:yaWarnR 3s linear both}
@keyframes yaWarnP{0%{opacity:1}100%{opacity:.25}}
@keyframes yaWarnI{0%{opacity:0;transform:scaleY(0)}8%{opacity:1;transform:scaleY(1)}90%{opacity:1;transform:scaleY(1)}100%{opacity:0;transform:scaleY(0)}}
@keyframes yaWarnL{0%{transform:translateX(0)}100%{transform:translateX(-240px)}}
@keyframes yaWarnR{0%{transform:translateX(-240px)}100%{transform:translateX(0)}}
#yact .ya-ban.on{animation:yaBan 1.3s ease-out both}
#yact .ya-ban.on span{animation:yaBanT 1.3s cubic-bezier(.2,.9,.3,1) both}
@keyframes yaBan{0%{opacity:0;clip-path:inset(50% 0)}10%{opacity:1;clip-path:inset(0)}80%{opacity:1;clip-path:inset(0)}100%{opacity:0;clip-path:inset(50% 0)}}
@keyframes yaBanT{0%{transform:translateX(-70%) skewX(-18deg)}16%{transform:translateX(4%) skewX(-10deg)}24%{transform:none}78%{transform:none}100%{transform:translateX(50%) skewX(-18deg)}}
#yact .ya-ban.boss{font-size:26px;color:#ffe27a;padding:14px 0}
#yact .ya-ban.boss::before{background:repeating-linear-gradient(-45deg,rgba(214,40,26,.9) 0 14px,rgba(34,22,24,.9) 14px 28px);background-size:200% 100%;animation:yaHaz .7s linear infinite}
#yact .ya-ban.boss.on,#yact .ya-ban.boss.on span{animation-duration:1.7s}
@keyframes yaHaz{to{background-position:-39.6px 0}}
/* 경완 2026-11-14 '스테이지 바뀔 때마다 가운데 크게' */
#yact .ya-ban small{display:block;font-size:13px;line-height:1.3;letter-spacing:2px;color:#fff;opacity:.92}
#yact .ya-ban.stg{top:30%;padding:12px 0 16px;color:#ffe27a}
#yact .ya-ban.stg small{font-size:20px;letter-spacing:6px;margin-right:-6px}
#yact .ya-ban.stg b{display:block;font-size:96px;line-height:.95;text-shadow:0 5px 0 var(--ink),0 0 18px rgba(0,0,0,.5);-webkit-text-stroke:2px var(--ink);paint-order:stroke fill}
#yact .ya-ban.stg.on span{animation:yaStg 1.3s cubic-bezier(.2,.9,.3,1) both}
@keyframes yaStg{0%{transform:scale(2.6);opacity:0}14%{transform:scale(.92);opacity:1}22%{transform:none}78%{transform:none;opacity:1}100%{transform:scale(1.25);opacity:0}}
#yact .ya-ban.win{font-size:32px;color:#ffe27a;padding:16px 0}
#yact .ya-ban.win::before{background:linear-gradient(90deg,rgba(255,200,48,0),rgba(190,120,0,.82) 16%,rgba(190,120,0,.82) 84%,rgba(255,200,48,0))}
#yact .ya-ban.win.on,#yact .ya-ban.win.on span{animation-duration:1.6s}
#yact .ya-cb{font-size:13px;line-height:1.1;color:#fff;text-shadow:0 2px 0 var(--ink);padding-left:4px;opacity:0;transition:opacity .35s;white-space:nowrap}
#yact .ya-cb.on{opacity:1;transition:none}
#yact .ya-cb b{display:inline-block;font-size:28px;color:#ffe27a;margin-right:4px;transform-origin:0 80%}
#yact .ya-cb.up b{animation:yaCb .24s cubic-bezier(.2,1.7,.4,1)}
@keyframes yaCb{0%{transform:scale(1.8) rotate(-6deg);color:#fff}}
#yact .ya-cb small{display:block;font-size:10px;color:#bff59a;margin-top:2px}
#yact .ya-cb i{display:block;height:4px;width:76px;background:rgba(20,20,34,.55);border:1px solid var(--ink);margin-top:3px}
#yact .ya-cb u{display:block;height:100%;background:#ffe27a}
#yact .ya-hp.hit{animation:yaHit .32s}
@keyframes yaHit{0%{transform:translateX(-5px);background:rgba(220,50,40,.85)}25%{transform:translateX(5px)}50%{transform:translateX(-3px)}75%{transform:translateX(2px)}}
#yact .ya-hp.low .ya-hpf{animation:yaTm .4s steps(2) infinite}
#yact .mvb.rdy{animation:yaRdy .32s ease-out}
@keyframes yaRdy{0%{filter:brightness(2.2);transform:scale(1.08)}}
#yact .mvb.no{animation:yaNo .2s}
@keyframes yaNo{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
#yact .ya-dg.cd{color:#8a8794}
#yact .ya-ov{position:absolute;inset:0;z-index:8;background:rgba(14,14,28,.45)}
/* v26.43 경완 '그만 누르면 일시정지 창 뜨고, 그만둘건지 계속할건지 선택하게 앱 잠깐 나갔을 때도 일시정지 창 띄워줘. 계속하기 하면 다시 카운트다운하고 시작' */
/* v26.76 경완 '특훈 이거 컨트롤러 연동되게 할 수 있어?' → '만들어줘 너가 말한 컨트롤러들이랑 8bit do': 컨트롤러가 잡히면(#yact.gp) 화면 버튼에 그 컨트롤러 버튼 글자, 창에서는 고른 버튼에 테두리(.gpf) */
#yact.gp .mvb .tg[data-gp]::before,#yact.gp .ya-dg[data-gp]::before,#yact.gp .ya-quit[data-gp]::after{content:attr(data-gp);display:inline-block;min-width:14px;height:14px;padding:0 2px;box-sizing:border-box;border-radius:7px;background:#20202c;color:#fff;font:700 9px/14px system-ui,sans-serif;text-align:center;vertical-align:middle;pointer-events:none}
#yact.gp .mvb .tg[data-gp]::before{margin:-2px 3px -1px -3px}
#yact.gp .ya-dg[data-gp]::before{position:absolute;top:3px;left:50%;transform:translateX(-50%);z-index:3}
#yact.gp .ya-top .ya-quit[data-gp]::after{margin-left:5px}
/* 조이콘 2 직접 연결 (아이폰 앱 JoyCon2.swift): 시작 화면 머리줄 버튼 + 안내 창 */
#yact .fs .fs-jc{flex:none;height:30px;padding:0 9px;border-radius:15px;border:2px solid #8a90c0;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.05));color:#dfe2ff;font:bold 11px/1 var(--px);box-shadow:0 3px 0 rgba(0,0,0,.45);cursor:pointer}
#yact .fs .fs-jc:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.45)}
#yact .fs .fs-jc.on{border-color:#6fe08a;color:#b8ffc8}
#yact .ya-jc{position:absolute;inset:0;z-index:41;display:none;align-items:center;justify-content:center;background:rgba(8,8,20,.62)}
#yact .ya-jc.on{display:flex}
#yact .ya-jc .jc-w{width:min(300px,calc(100% - 36px));padding:16px 16px 14px;border-radius:18px;border:2px solid #8a90c0;color:#f0ecff;text-align:center;box-shadow:0 0 0 3px #0c0a1c,0 8px 0 3px rgba(0,0,0,.5),0 0 30px rgba(120,130,255,.4);background:radial-gradient(ellipse 120% 70% at 50% 0,#3c4470 0,#1a1c3c 50%,#0a0a1a 100%)}
#yact .ya-jc .jc-t{display:block;font-size:18px;letter-spacing:1px;text-shadow:0 3px 0 #0c0a1c}
#yact .ya-jc .jc-p{margin:10px 0 12px;font-size:12.5px;line-height:1.6;color:#c8c8ee}
#yact .ya-jc .jc-p b{color:#ffe9a0}
#yact .ya-jc .jc-s{display:flex;gap:8px;margin-bottom:8px}
#yact .ya-jc .jc-s span{flex:1;padding:9px 0;border-radius:10px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);font-size:12.5px;color:#a8a8c8}
#yact .ya-jc .jc-s span.ok{border-color:#6fe08a;background:rgba(110,224,138,.18);color:#d8ffe0}
#yact .ya-jc .jc-m{min-height:18px;margin:0 0 10px;font-size:12px;color:#ffb8b8}
#yact .ya-jc .jc-m.i{color:#a8c8ff}
#yact .ya-jc .bigb{margin:0;padding:11px 0;font-size:15px;border-radius:12px;color:#f0ecff;border-color:rgba(255,255,255,.4);background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.07));box-shadow:0 4px 0 rgba(0,0,0,.55)}
#yact .ya-jc .bigb:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.55)}
#yact.gp .gpf{outline:3px solid #fff;outline-offset:2px;animation:yaGpf .8s ease-in-out infinite alternate}
@keyframes yaGpf{to{outline-color:#ffd84a}}
#yact .ya-pz{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:rgba(8,8,20,.62);pointer-events:auto}
#yact .ya-pz[hidden]{display:none}
#yact .ya-pz .pz-w{width:min(286px,calc(100% - 40px));padding:18px 16px 16px;border-radius:18px;border:2px solid #8a90c0;color:#f0ecff;text-align:center;box-shadow:0 0 0 3px #0c0a1c,0 8px 0 3px rgba(0,0,0,.5),0 0 30px rgba(120,130,255,.4);background:radial-gradient(ellipse 120% 70% at 50% 0,#3c4470 0,#1a1c3c 50%,#0a0a1a 100%)}
#yact .ya-pz.np .pz-w{animation:yaPzPop .32s steps(4,end)}
@keyframes yaPzPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
#yact .ya-pz .pz-t{display:block;font-size:22px;letter-spacing:4px;text-shadow:0 3px 0 #0c0a1c}
#yact .ya-pz .pz-s{margin:8px 0 14px;font-size:12.5px;line-height:1.5;color:#c8c8ee}
#yact .ya-pz .pz-b{display:flex;flex-direction:column;gap:10px}
#yact .ya-pz .bigb{margin:0;padding:13px 0;font-size:17px;letter-spacing:1px;border-radius:12px}
#yact .ya-pz .pz-go{background:linear-gradient(180deg,#fff2a8 0,#ffd040 45%,#e89a18 100%);border-color:#6a3a00;color:#4a2400;box-shadow:0 4px 0 #6a3a00,0 0 14px rgba(255,200,60,.6)}
#yact .ya-pz .pz-go:active{transform:translateY(3px);box-shadow:0 1px 0 #6a3a00}
#yact .ya-pz .pz-q{font-size:14px;padding:11px 0;color:#f0ecff;border-color:rgba(255,255,255,.4);background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.07));box-shadow:0 4px 0 rgba(0,0,0,.55)}
#yact .ya-pz .pz-q:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.55)}
#yact .bigb{display:block;width:100%;margin-top:14px;padding:11px 0;font-size:15px;background:#ffd84a}
#yact .bigb.sec{background:#e9e4d8;font-size:13px;padding:9px 0}
#yact .ya-res.pop{animation:yaPop .32s cubic-bezier(.2,1.5,.4,1)}
@keyframes yaPop{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes yaXb{0%{width:0}}
@keyframes yaRow{0%{opacity:0;transform:translateX(-16px) scale(.95)}}
#yact .ya-rl .egq{font-style:normal;font-size:9px;padding:1px 4px;margin-right:5px;border:1px solid var(--ink);color:#fff;background:var(--tc);text-shadow:0 1px 0 rgba(0,0,0,.5)}
#yact .ya-rl .lvup{font-style:normal;color:#e05a20;font-weight:700}
#yact .ya-rl b.ev{color:#8a4ad8}#yact .ya-rl b.fr{color:#e0507a}#yact .ya-rl b.eg{color:#c08a00}
/* 경완 2026-11-13: 화면 배치·창 다듬기 — 왼쪽 = 내 포켓몬(HP·쓰러뜨린 수·골드·콤보), 가운데 = 웨이브·남은 시간, 오른쪽 = 그만하기·이번 판 보상 */
#yact .ya-tl{left:10px;top:calc(10px + env(safe-area-inset-top));display:flex;flex-direction:column;gap:5px;align-items:flex-start;width:134px}
#yact .ya-sc{display:flex;gap:5px;width:100%}
#yact .ya-sc .pan{flex:1;display:flex;align-items:center;justify-content:center;gap:4px;padding:3px 4px;font-size:11px;white-space:nowrap;min-width:0}
#yact .ya-kc small{font-size:9px;line-height:13px;padding:0 3px;background:#fff;color:var(--ink);font-weight:700}
#yact .ya-m{font-size:13px;color:#fff;text-shadow:0 1px 0 var(--ink)}
#yact .mg-hg{color:#ffe27a;text-shadow:0 1px 0 var(--ink)}
#yact .mg-hg b{font-size:13px}
#yact .mg-hg .coin{width:12px;height:12px;margin-right:4px}
#yact .ya-tc{left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
#yact .ya-tm{font-size:26px;line-height:1;min-width:64px;padding:8px 0 5px;text-align:center;text-shadow:0 2px 0 var(--ink);background:rgba(28,28,46,.66);border:3px solid var(--ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),3px 3px 0 rgba(0,0,0,.22)}
#yact .ya-tr{right:10px;top:calc(10px + env(safe-area-inset-top));display:flex;flex-direction:column;align-items:stretch;gap:5px;width:126px}
#yact .ya-quit{font-size:11px;padding:4px 8px;background:#e9e4d8;align-self:flex-end;pointer-events:auto}
#yact .ya-rw{display:flex;flex-direction:column;gap:4px}
#yact .ya-rw .ch{display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:3px 7px;white-space:nowrap}
#yact .ya-rw .ch b{font-size:13px}
/* 경완 2026-11-14 버튼 A안(부채꼴): 첫 기술이 엄지 밑에 크게, 나머지는 둘레로. 회피는 오른쪽 위, 글자만 */
#yact .ya-pad{right:0;bottom:env(safe-area-inset-bottom);width:250px;height:270px;pointer-events:none}
#yact .ya-pad button{pointer-events:auto}
#yact .ya-mvs{position:absolute;inset:0}
#yact .ya-mvs .mvb{position:absolute;width:66px;height:66px;border-radius:50%;padding:0 3px;align-items:center;justify-content:center;gap:2px;text-align:center}
#yact .ya-mvs .mvb.amp{outline:3px solid #fff;outline-offset:1px;animation:yaAmp .45s ease-in-out infinite alternate}
@keyframes yaAmp{from{filter:brightness(1);box-shadow:0 4px 0 var(--ink),0 0 0 0 var(--tc)}to{filter:brightness(1.3);box-shadow:0 4px 0 var(--ink),0 0 14px 6px var(--tc)}}
#yact .ya-mvs .mvb .tg{align-self:center;border-radius:6px;font-size:8px;padding:1px 4px}
#yact .ya-mvs .mvb b{font-size:11px;white-space:nowrap;line-height:1.1;overflow:visible}
#yact .ya-mvs .mvb b.l5{font-size:10px}#yact .ya-mvs .mvb b.l6{font-size:9px}#yact .ya-mvs .mvb b.l7{font-size:9px;white-space:normal;word-break:break-all}
#yact .ya-mvs .mvb small{font-size:8px;line-height:1}
#yact .ya-mvs .mvb:nth-child(1){right:14px;bottom:24px;width:84px;height:84px}
#yact .ya-mvs .mvb:nth-child(1) b{font-size:13px}#yact .ya-mvs .mvb:nth-child(1) b.l6{font-size:12px}#yact .ya-mvs .mvb:nth-child(1) b.l7{font-size:11px}#yact .ya-mvs .mvb:nth-child(1) small{font-size:9px}
#yact .ya-mvs .mvb:nth-child(2){right:108px;bottom:18px}
#yact .ya-mvs .mvb:nth-child(3){right:92px;bottom:98px}
#yact .ya-mvs .mvb:nth-child(4){right:18px;bottom:120px}
#yact .ya-pad .ya-dg{position:absolute;right:14px;bottom:200px;width:58px;height:58px;font-size:13px}
/* 경완 2026-11-14 상단 다시 (시안 1안 + '스테이지는 가운데 크게'): 위 = 골드 · 큰 스테이지 · 그만하기, 그 밑 = 보상 3칸(아이콘·이름·큰 숫자·게이지). 이름·쓰러뜨린 수·시간은 화면에서 뺌 */
#yact .ya-top{left:6px;right:6px;top:calc(6px + env(safe-area-inset-top));display:flex;justify-content:space-between;align-items:flex-start}
#yact .ya-top .pan,#yact .ya-hud.ya-rw .pan{background:rgba(26,28,50,.92)}
#yact .ya-top .mg-hg{display:flex;align-items:center;padding:5px 10px 5px 8px}
#yact .ya-top .mg-hg b{font-size:18px;line-height:1}
#yact .ya-top .mg-hg .coin{width:14px;height:14px;margin-right:7px}
#yact .ya-stb{position:absolute;left:50%;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
#yact .ya-stb .ya-ph{font-size:11px;line-height:16px;padding:0 9px}
#yact .ya-stn{display:flex;flex-direction:column;align-items:center;gap:5px;padding:6px 10px 7px}
#yact .ya-stn .n{line-height:1;text-shadow:0 2px 0 var(--ink);white-space:nowrap}
#yact .ya-stn .n b{font-size:28px}#yact .ya-stn .n small{font-size:12px;opacity:.8;margin-left:3px}
#yact .ya-stn .ya-stg{margin:0;gap:3px}
#yact .ya-stn .ya-stg i{width:10px;height:10px;border-width:2px;background:#3a3e62}
#yact .ya-stn .ya-stg i.b{border-radius:50%}
#yact .ya-stn .ya-stg i.d{background:#ffe27a}#yact .ya-stn .ya-stg i.c{background:#fff}
#yact .ya-top .ya-quit{font-size:11px;padding:6px 9px;align-self:flex-start}
#yact .ya-hud.ya-rw{left:6px;right:6px;top:calc(84px + env(safe-area-inset-top));flex-direction:row;gap:5px}
#yact .ya-hud.ya-rw .ch{flex:1;min-width:0;display:grid;grid-template-columns:22px 1fr;gap:4px 6px;align-items:center;padding:5px 6px 6px;font-size:9px;white-space:nowrap}
#yact .ya-rw .ri{width:22px;height:22px;display:grid;place-items:center;border:2px solid var(--ink);font-style:normal;font-weight:700;font-size:11px;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.4)}
#yact .ya-rw .ex .ri{background:#3a98e8}#yact .ya-rw .ev .ri{background:#8a4ae0}#yact .ya-rw .ya-eg .ri{background:#e060b0}
#yact .ya-rw .rt{display:flex;flex-direction:column;min-width:0;line-height:1.15}
#yact .ya-rw .rt span{opacity:.88;overflow:hidden;text-overflow:ellipsis}
#yact .ya-hud.ya-rw .ch b{font-size:15px}
#yact .ya-rw .ya-eg b{color:#ffb4e0}
#yact .ya-rw .rb{grid-column:1/-1;height:7px;background:#14162a;border:2px solid var(--ink);position:relative;overflow:hidden;box-sizing:border-box}
#yact .ya-rw .rb u{position:absolute;left:0;top:0;bottom:0;display:block;transition:width .3s}
#yact .ya-rw .ex .rb u{background:#3a98e8}#yact .ya-rw .ev .rb u{background:#8a4ae0}
#yact .ya-rw .ya-egt{font-style:normal;font-size:8px;padding:0 3px;border:1px solid var(--ink)}
#yact .ya-tl{left:10px;top:calc(176px + env(safe-area-inset-top));width:auto}
/* 경완 2026-11-14 '상단 레이아웃 반원형으로': 화면 위 가운데에 반원 판이 매달리고, 스테이지 칸 10개가 둥근 테두리를 따라 놓인다 */
#yact .ya-stb{top:calc(-9px - env(safe-area-inset-top));width:176px;height:calc(88px + env(safe-area-inset-top));padding-top:calc(5px + env(safe-area-inset-top));box-sizing:border-box;border-radius:0 0 88px 88px;background:rgba(26,28,50,.94);border:3px solid var(--ink);border-top:0;box-shadow:inset 0 -3px 0 2px rgba(255,255,255,.16),0 4px 0 rgba(0,0,0,.25);justify-content:flex-start}
#yact .ya-stb .ya-ph{margin:0 0 3px}
#yact .ya-stb .ya-stn{background:none;border:0;box-shadow:none;padding:0;gap:0}
#yact .ya-stn .n b{font-size:30px}
#yact .ya-stn .ya-stg{position:absolute;inset:0;display:block}
#yact .ya-stn .ya-stg i{position:absolute;margin:-5px}
#yact .ya-stn .ya-stg i.c{box-shadow:0 0 0 2px #ffe27a}
#yact .ya-hud.ya-rw{top:calc(92px + env(safe-area-inset-top))}
/* 경완 2026-11-14 '보상 3칸에 골드까지 반원으로, 반투명하게': 가운데 반원(스테이지) 둘레에 바깥 반원 띠를 두르고 네 칸(골드·경험치·노력치·번뜩임)으로 나눈다 */
#yact .ya-top{justify-content:flex-end}
#yact .ya-arc{left:50%;top:env(safe-area-inset-top);width:0;height:0}
#yact .ya-arc .sg{position:absolute;width:58px;height:46px;margin:-23px -29px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;text-shadow:0 2px 0 var(--ink),0 0 3px var(--ink);white-space:nowrap;line-height:1;padding:0;background:none;border:0;box-shadow:none}
#yact .ya-arc .sg:nth-of-type(2){left:-98px;top:38px}#yact .ya-arc .sg:nth-of-type(3){left:-41px;top:98px}#yact .ya-arc .sg:nth-of-type(4){left:41px;top:98px}#yact .ya-arc .sg:nth-of-type(5){left:98px;top:38px}
#yact .ya-arc .sg b{font-size:14px}
#yact .ya-arc .sg small{font-size:8px;opacity:.9}
#yact .ya-arc .ri{width:19px;height:19px;display:grid;place-items:center;border:2px solid var(--ink);font-style:normal;font-weight:700;font-size:9px;text-shadow:none}
#yact .ya-arc .ex .ri{background:#3a98e8}#yact .ya-arc .ev .ri{background:#8a4ae0}#yact .ya-arc .ya-eg .ri{background:#e060b0}
#yact .ya-arc .ex b{color:#9fd8ff}#yact .ya-arc .ev b{color:#d6b4ff}#yact .ya-arc .ya-eg b{color:#ffb4e0}#yact .ya-arc .mg-hg b{font-size:17px;color:#ffe27a}
#yact .ya-arc .mg-hg .coin{width:15px;height:15px;margin:0}
#yact .ya-arc .ya-egt{font-style:normal;font-size:8px;line-height:11px;padding:0 3px;border:1px solid var(--ink);text-shadow:none}
#yact .ya-arc .ya-stb{top:0;width:152px;height:76px;padding-top:3px;border-radius:0 0 76px 76px;background:rgba(26,28,50,.62);box-shadow:inset 0 -2px 0 1px rgba(255,255,255,.16)}
#yact .ya-arc .ya-stb .ya-ph{font-size:10px;line-height:14px;margin:0 0 2px}
/* 경완 2026-11-16 '상단 정보창 위 잘림선 보이는데': 반원이 안전 영역(시계 줄) 아래에서 시작해 평평한 윗변이 건물 위에 선으로 보였다 → 위쪽 반원을 이어 붙여 동그란 판이 화면 위로 넘어가게 */
#yact .ya-arc .ya-stb::after{content:"";position:absolute;left:-3px;right:-3px;bottom:100%;height:76px;box-sizing:border-box;border:3px solid var(--ink);border-bottom:0;border-radius:76px 76px 0 0;background:rgba(26,28,50,.62);pointer-events:none}
#yact .ya-arc .ya-stn .n b{font-size:26px}
/* 경완 2026-11-14 '반원에 구슬 4개 좋다': 바깥 띠를 없애고 스테이지 반원 둘레에 동그란 구슬 네 개(골드·경험치·노력치·번뜩임), 구슬 테두리가 게이지(--p 0~1)로 차오른다. 능력치 이름·타입 딱지는 구슬에선 뺌 */
#yact .ya-arc .sg{width:56px;height:56px;margin:-28px;border-radius:50%;background:rgba(26,28,50,.66);border:3px solid var(--ink);box-sizing:border-box;gap:1px;--p:0;--c:#fff}
#yact .ya-arc .sg::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1turn),rgba(255,255,255,.2) 0);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));mask:radial-gradient(closest-side,transparent calc(100% - 5px),#000 calc(100% - 4px))}
#yact .ya-arc .sg>*{position:relative}
#yact .ya-arc .sg:nth-of-type(1){left:-106px;top:44px;--c:#ffcf3a;--p:1}#yact .ya-arc .sg:nth-of-type(2){left:-53px;top:102px;--c:#3a98e8}#yact .ya-arc .sg:nth-of-type(3){left:53px;top:102px;--c:#a060f0}#yact .ya-arc .sg:nth-of-type(4){left:106px;top:44px;--c:#e060b0}
#yact .ya-arc .sg b{font-size:13px}#yact .ya-arc .mg-hg b{font-size:15px}#yact .ya-arc .ex b{font-size:12px;letter-spacing:-.5px}
#yact .ya-arc .ri{width:16px;height:16px;font-size:8px}#yact .ya-arc .mg-hg .coin{width:13px;height:13px}
#gym #yact .ya-arc .mg-hg .coin{margin:0 0 2px!important}   /* 체육관 공통 '동전 옆 글자 여백 6px' 이 구슬 안(위아래 배치)에선 동전을 왼쪽으로 밀어서 뺌 (경완 '골드 아이콘 정렬') */
#yact .ya-arc .sg small,#yact .ya-arc .sg .ya-egt{display:none}
/* 경완 2026-11-14 'EV 대신 능력치 이름, Lv 말고 경험치, 번뜩임은 떨어지는 조각과 같은 아이콘' */
#yact .ya-arc .ri{width:auto;height:13px;padding:0 3px;font-size:9px;line-height:13px;display:block;border-width:1.5px;white-space:nowrap;color:#fff}
#yact .ya-arc .ri.sv{width:20px;height:20px;padding:0;border:0;background:none;margin-bottom:-2px}
#yact .ya-arc .sg b{font-size:13px}#yact .ya-arc .ex b{font-size:12px}
#yact .ya-tl{left:8px;top:calc(138px + env(safe-area-inset-top))}
/* 경완 2026-11-14 '콤보 좀 더 잘 보이게': 금색 띠 달린 반투명 판 + 큰 숫자(검은 테두리) + 충전 딱지 + 굵은 남은 시간 막대. 10·30 콤보부터 색이 달아오른다 */
/* 경완 2026-11-14 '콤보는 박스 없이' + '색 자체가 마음에 안 듦': 칸을 없애고 흰 숫자에 진한 테두리, 남은 시간은 밑줄. 콤보가 쌓이면 밑줄과 '콤보' 글자만 하늘·보라로 */
#yact .ya-cb{--cc:#fff;display:inline-block;padding:0 0 0 2px;background:none;border:0;box-shadow:none;font-size:14px;font-weight:700;color:var(--cc);text-shadow:-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),-2px -2px 0 var(--ink),2px -2px 0 var(--ink),-2px 2px 0 var(--ink),2px 2px 0 var(--ink)}
#yact .ya-cb[data-t="2"]{--cc:#ff8a70}#yact .ya-cb[data-t="3"]{--cc:#ff2e2e}   /* 경완 2026-11-14 색 후보 R2: 평소 흰색, 10콤보 다홍, 30콤보 빨강 (숫자도 같이) */
#yact .ya-cb b{font-size:42px;line-height:1;color:var(--cc);margin-right:5px;text-shadow:-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 5px 0 var(--ink),-3px -3px 0 var(--ink),3px -3px 0 var(--ink),-3px 5px 0 var(--ink),3px 5px 0 var(--ink)}
#yact .ya-cb small{display:block;font-size:11px;line-height:14px;padding:0;margin-top:5px;background:none;border:0;color:#fff;text-shadow:-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),-2px -2px 0 var(--ink),2px -2px 0 var(--ink),-2px 2px 0 var(--ink),2px 2px 0 var(--ink)}
#yact .ya-cb i{width:100%;min-width:92px;height:8px;border:2px solid var(--ink);margin-top:6px;box-sizing:border-box;background:var(--ink)}
#yact .ya-cb u{background:var(--cc)}
/* 경완 2026-11-13 '시작 창·훈련 완료 창 디자인 다시': 위 = 남색 무대(포켓몬 크게·이름·기술), 아래 = 종이 */
#yact .ya-hp{padding:3px 8px;font-size:11px;max-width:100%}
#yact .ya-me{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#yact .ya-ph{font-size:10px;line-height:15px;padding:0 6px;color:var(--ink);background:#ffe27a;border:2px solid var(--ink);white-space:nowrap;position:relative;z-index:1;margin-bottom:-3px}
#yact .ya-stg{display:flex;gap:2px;margin-top:4px}
#yact .ya-stg i{width:7px;height:7px;background:rgba(28,28,46,.6);border:1px solid var(--ink)}
#yact .ya-stg i.b{border-color:#ff7a6a}
#yact .ya-stg i.d{background:#ffe27a}
#yact .ya-stg i.c{background:#fff;animation:yaTm .6s steps(2) infinite}
#yact .ya-win{position:absolute;z-index:9;left:50%;top:50%;transform:translate(-50%,-50%);width:min(348px,calc(100% - 24px));max-height:calc(100% - 20px);overflow:auto;background:#f6f1e4;color:var(--ink);border:3px solid var(--ink);box-shadow:0 0 0 3px #fff,0 0 0 6px var(--ink),0 10px 0 6px rgba(0,0,0,.28);padding:0}
#yact .ya-hero{position:relative;padding:12px 14px 26px;color:#fff;background:radial-gradient(120% 90% at 22% 62%,#4a5aa8 0,#2b3168 45%,#1c1c3a 100%);overflow:hidden;border-bottom:3px solid var(--ink)}
#yact .ya-hero::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-55deg,rgba(255,255,255,.05) 0 10px,transparent 10px 22px)}
#yact .ya-hero>*{position:relative}
#yact .hr-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
#yact .ya-rb{font-size:13px;font-weight:700;line-height:1.3;padding:3px 12px 3px 9px;background:#ffd84a;color:var(--ink);border:2px solid var(--ink);box-shadow:2px 2px 0 rgba(0,0,0,.35)}
#yact .ya-tg{font-size:9.5px;line-height:1.3;padding:2px 6px;color:#cfd4ff;border:1px solid rgba(255,255,255,.4);white-space:nowrap}
#yact .hr-row{display:flex;align-items:center;gap:12px}
#yact .hr-st{position:relative;width:88px;height:80px;flex:none;display:flex;align-items:flex-end;justify-content:center}
#yact .hr-st::before{content:"";position:absolute;left:10px;right:10px;bottom:0;height:16px;border-radius:50%;background:rgba(0,0,0,.4)}
#yact .hr-im{position:relative;width:80px;height:80px;image-rendering:pixelated;object-fit:contain;animation:yaBob 1.6s ease-in-out infinite}
@keyframes yaBob{50%{transform:translateY(-3px)}}
#yact .hr-in{min-width:0;flex:1}
#yact .hr-nm{display:block;font-size:19px;line-height:1.2;text-shadow:0 2px 0 rgba(0,0,0,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#yact .hr-lv{display:inline-block;font-size:11px;line-height:1.4;margin:3px 0 7px;padding:0 7px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.3)}
#yact .ya-pmv{display:grid;grid-template-columns:1fr 1fr;gap:4px}
#yact .ya-pmv span{font-size:10px;line-height:1.4;padding:1px 4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--tc);color:#fff;border:2px solid var(--ink);text-shadow:0 1px 0 rgba(0,0,0,.4)}
#yact .ya-pk{display:flex;gap:6px;justify-content:center;margin:-17px 14px 0;position:relative;z-index:1}
#yact .ya-pk.many{gap:4px;margin:-19px 10px 0}
#yact .ya-pk.many .pkc{flex:1 1 0;max-width:52px;padding:3px 0;justify-content:center}
#yact .ya-pk.many .pkc b{display:none}
#yact .ya-pk.many .pkc img{width:32px;height:32px}
#yact .pkc{flex:1;max-width:120px;font-family:var(--px);border:3px solid var(--ink);background:#fff;padding:2px 5px;display:flex;align-items:center;gap:3px;box-shadow:0 3px 0 var(--ink);cursor:pointer;color:var(--ink);min-width:0;transition:transform .06s,box-shadow .06s}
#yact .pkc:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
#yact .pkc img{width:26px;height:26px;image-rendering:pixelated;object-fit:contain;flex:none}
#yact .pkc b{font-size:11px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#yact .pkc small{display:none}
#yact .pkc.on{background:#ffd84a}
#yact .ya-bd{padding:2px 14px 14px}
#yact .ya-sec{margin-top:12px}
#yact .ya-win h3{font-size:11.5px;margin:0 0 6px;color:var(--ink);display:flex;align-items:baseline;gap:6px}
#yact .ya-win h3 small{font-size:10px;color:#7a7a8a;font-weight:400}
#yact .ya-stt{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;background:var(--ink);border:3px solid var(--ink);box-shadow:0 3px 0 rgba(32,32,44,.25)}
#yact .stc{font-family:var(--px);font-size:11px;padding:3px 0 5px;border:0;background:#fff;color:var(--ink);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:0}
#yact .stc img{width:26px;height:26px;image-rendering:pixelated;pointer-events:none}#yact .stc span{white-space:nowrap}#yact .stc.on img{filter:drop-shadow(0 0 2px #fff)}
#yact .stc:active{background:#e9e4d8}
#yact .stc.on{background:#b48cf0;color:#fff;text-shadow:0 1px 0 var(--ink);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
#yact .ya-road{display:flex;align-items:center;padding:7px 8px;background:#fff;border:3px solid var(--ink);box-shadow:0 3px 0 rgba(32,32,44,.25)}
#yact .ya-road i{flex:1;height:3px;background:#c8c0ac}
#yact .ya-road b{flex:none;width:18px;height:18px;font-size:9px;line-height:14px;text-align:center;border:2px solid var(--ink);background:#f0ebde}
#yact .ya-road b.m{position:relative;width:30px;height:30px;line-height:26px;background:#ffd0c8;border-color:#c03020;color:#c03020}
#yact .ya-road b.f{width:38px;height:38px;line-height:34px;background:#ffd84a}
#yact .ya-road b.m img{position:absolute;left:1px;top:1px;width:calc(100% - 2px);height:calc(100% - 2px);object-fit:contain;image-rendering:pixelated;filter:brightness(0);opacity:.82}
#yact .ya-op{font-size:9.5px;text-align:center;color:#7a7a8a;margin:9px 0 0;line-height:1.4}
#yact .rs-row .sec{flex:0 0 34%}
/* 경완 2026-11-15 '특훈 눌렀을 때 시작창 승급심사처럼 새로운 화면으로' → '무대 A 좋은데 빛줄기가 너무 밤티' → '3번으로 가고 기술 딱지 가독성 좀 높여줘': 전체 화면 어두운 무대(.fs), 후광 + 반짝이, 유리 칸 + 금빛 테두리 */
#yact .ya-start.fs{left:0;top:0;transform:none;width:100%;height:100%;max-height:none;border:0;box-shadow:none;display:flex;flex-direction:column;overflow:hidden;background:radial-gradient(ellipse 120% 60% at 50% 0,#4a3c86 0,#231a4c 45%,#0c0a1c 100%);color:#f0ecff}
/* 경완 2026-11-15 '또 훈련장 비치는데? 처음에 눌렀을 때': 시작 화면 동안(.st0)은 그 밑의 경기장 캔버스·HUD 를 아예 안 그린다 — 아이폰에서 시작 화면이 그려지기 전 한 순간 밑의 경기장(훈련장 그림)이 비쳤음. [특훈 시작]을 누르면 보임 */
#yact.st0{background:#0c0a1c}
#yact.st0>:not(.ya-start):not(.ya-tu):not(.ya-evh):not(.ya-jc):not(.ya-load){visibility:hidden!important}
#yact.pre{bottom:var(--mh,0px)}
#yact.pre .fs .fs-ft{padding-bottom:12px}
#yact.pre .fs .hr-st{height:min(112px,13.5vh)}#yact.pre .fs .ya-hero{padding-bottom:8px}#yact.pre .fs .ya-pmv{margin-top:7px}#yact.pre .fs .ya-pmv span{padding:4px 4px}#yact.pre .fs .ya-bd{gap:8px;padding-bottom:6px!important}#yact.pre .fs h3{margin-bottom:6px}#yact.pre .fs .fs-ft{padding-top:8px}#yact.pre .fs .fs-ft .bigb{padding:12px 0}#yact.pre .fs .ya-op{margin-top:6px}
@media (max-height:700px){#yact.pre .fs .ya-sec:has(.fs-rwr){display:none}}
#yact .fs .ya-hero{flex:none;padding:calc(var(--si-top,env(safe-area-inset-top)) + 10px) 16px 14px;background:none;border-bottom:0;overflow:visible}
#yact .fs .ya-hero::before{display:none}
#yact .fs .fs-hd{display:flex;align-items:center;gap:8px;height:40px;margin:-4px 0 4px}
#yact .fs .fs-hd b{font-size:17px;flex:1;text-shadow:0 2px 0 rgba(0,0,0,.5)}
#yact .fs .fs-bk{width:40px;height:40px;margin-left:-10px;border:0;background:none;color:#fff;font-size:18px;font-family:var(--px);cursor:pointer}
#yact .fs .fs-bk:active{transform:translateX(-2px)}
/* 경완 2026-11-15 '받는 보상 밑에 조작법을 없애고, 특훈 뒤로가기 행 우측 정렬에 물음표 아이콘 만들어서 누르면 게임 캡쳐화면이랑 같이 기본 튜토리얼 창': 직접 눌러 여는 창이라 바깥을 눌러도 닫히고 팝업 모션은 없다 */
#yact .fs .fs-hp{flex:none;width:30px;height:30px;padding:0;border-radius:50%;border:2px solid #d8a830;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.05));color:#ffe9a0;font:bold 16px/1 var(--px);box-shadow:0 3px 0 rgba(0,0,0,.45);cursor:pointer}
#yact .fs .fs-hp:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.45)}
#yact .ya-tu{position:absolute;inset:0;z-index:40;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(6,4,18,.72)}
#yact .ya-tu.on{display:flex}
#yact .ya-tu .tu-w{width:min(350px,100%);display:flex;flex-direction:column;border-radius:14px;border:2px solid #d8a830;background:linear-gradient(180deg,#33286a,#17122e);box-shadow:0 6px 0 rgba(0,0,0,.5),0 0 22px rgba(120,90,255,.35);color:#f0ecff;padding:12px 14px 14px}
#yact .ya-tu .tu-hd{display:flex;align-items:center;margin-bottom:10px}
#yact .ya-tu .tu-hd b{flex:1;font-size:16px;color:#ffe9a0;text-shadow:0 2px 0 rgba(0,0,0,.5)}
#yact .ya-tu .tu-x{width:32px;height:32px;margin:-6px -6px -6px 0;border:0;background:none;color:#cfc8ee;font:14px/1 var(--px);cursor:pointer}
#yact .ya-tu .tu-im{border-radius:10px;border:2px solid rgba(255,255,255,.22);overflow:hidden;background:#0c0a1c;aspect-ratio:39/25}
#yact .ya-tu .tu-im img{display:block;width:100%;height:100%;object-fit:cover;image-rendering:pixelated}
#yact .ya-tu .tu-tx{min-height:104px;display:flex;flex-direction:column;justify-content:center;gap:6px;text-align:center;padding:8px 2px}
#yact .ya-tu .tu-h{font-size:16px;color:#fff}
#yact .ya-tu .tu-h i{font-style:normal;color:#ffd84a;margin-right:6px}
#yact .ya-tu .tu-p{margin:0;font-size:12.5px;line-height:1.6;color:#dcd6f6}
#yact .ya-tu .tu-p b{color:#ffe27a}
#yact .ya-tu .tu-dots{display:flex;justify-content:center;gap:7px;margin-bottom:12px}
#yact .ya-tu .tu-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}
#yact .ya-tu .tu-dots i.on{background:#ffd84a;box-shadow:0 0 6px rgba(255,216,74,.8)}
#yact .ya-tu .tu-bt{display:grid;grid-template-columns:1fr 1.5fr;gap:8px}
#yact .ya-tu .tu-bt button{padding:11px 0;border-radius:10px;font:bold 14px/1 var(--px);cursor:pointer;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#f0ecff;box-shadow:0 4px 0 rgba(0,0,0,.5)}
#yact .ya-tu .tu-bt .tu-nx{border-color:#6a3a00;color:#4a2400;background:linear-gradient(180deg,#fff2a8 0,#ffd040 45%,#e89a18 100%);box-shadow:0 4px 0 #6a3a00}
#yact .ya-tu .tu-bt button:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.5)}
#yact .ya-tu .tu-bt .tu-pv:disabled{opacity:.35;pointer-events:none}
#yact .fs .hr-row{flex-direction:column;gap:6px;text-align:center}
#yact .fs .hr-st{width:190px;height:min(158px,19vh);isolation:isolate}
#yact .fs .hr-st::before{left:14px;right:14px;height:26px;background:radial-gradient(ellipse,#ffe9a0 0,#b88a2a 60%,#6a4a10 100%);border:3px solid #3a2400;box-shadow:0 3px 0 rgba(0,0,0,.4)}
#yact .fs .hr-im{width:auto;height:95%;aspect-ratio:1;margin-bottom:8px}
#yact .fs .hr-st>u{position:absolute;pointer-events:none;z-index:-1;text-decoration:none}
#yact .fs .hr-st>u.a{left:50%;top:44%;width:260px;height:260px;margin:-130px 0 0 -130px;border-radius:50%;background:radial-gradient(circle,rgba(190,150,255,.55),rgba(255,220,130,.2) 45%,transparent 70%);animation:yaHalo 2.6s ease-in-out infinite}
#yact .fs .hr-st>u.b{inset:-30px -70px;background:radial-gradient(circle 2px at 12% 30%,#fff3c0 99%,transparent),radial-gradient(circle 3px at 88% 22%,#fff3c0 99%,transparent),radial-gradient(circle 2px at 78% 62%,#fff 99%,transparent),radial-gradient(circle 3px at 20% 72%,#ffe08a 99%,transparent),radial-gradient(circle 2px at 30% 8%,#fff 99%,transparent),radial-gradient(circle 2px at 68% 4%,#ffe08a 99%,transparent),radial-gradient(circle 2px at 95% 50%,#fff3c0 99%,transparent),radial-gradient(circle 2px at 4% 52%,#fff 99%,transparent);filter:drop-shadow(0 0 4px rgba(255,220,120,.9));animation:yaTwk 3.2s ease-in-out infinite}
@keyframes yaHalo{50%{transform:scale(1.08);opacity:.8}}
@keyframes yaTwk{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.45;transform:translateY(-5px)}}
#yact .fs .hr-in{width:100%}
/* 경완 2026-11-16 '상단 포켓몬 이름 가운데 정렬 하고 레벨을 그 밑 줄로 박스 없이, 이름 옆에 성별 표시, 타입 아이콘 포켓몬 스프라이트 좌상단에' */
#yact .fs .hr-nl{display:flex;align-items:center;justify-content:center;gap:5px;min-width:0}
#yact .fs .hr-nm{font-size:22px;display:block;min-width:0;max-width:86%;margin:0}
#yact .fs .hr-sx{flex:none;font-style:normal;font-size:17px;line-height:1;font-weight:700;text-shadow:0 2px 0 rgba(0,0,0,.5)}
#yact .fs .hr-sx.m{color:#6ab8ff}#yact .fs .hr-sx.f{color:#ff8ab4}
#yact .fs .hr-lv{display:block;font-size:13px;line-height:1.3;margin:2px 0 0;padding:0;background:none;border:0;color:#d8d0f4;text-shadow:0 2px 0 rgba(0,0,0,.5)}
#yact .fs .hr-ty{position:absolute;left:-34px;top:2px;display:flex;flex-direction:column;gap:4px;z-index:1}
#yact .fs .hr-ty .tyi{position:static;display:block;width:24px!important;height:24px!important;margin:0;filter:drop-shadow(0 2px 0 rgba(0,0,0,.5))}
/* 경완 '노력치 훈련 텍스트 옆에 물음표 아이콘 … 창 디자인은 시작 화면이랑 잘 어울리게' */
#yact .fs h3 .ya-evq{flex:none;order:1;width:22px;height:22px;margin:-4px 0 -4px -2px;padding:0;border-radius:50%;border:2px solid #d8a830;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.05));color:#ffe9a0;font:bold 12px/1 var(--px);box-shadow:0 2px 0 rgba(0,0,0,.45);cursor:pointer}
#yact .fs h3 .ya-evq:active{transform:translateY(2px);box-shadow:none}
#yact .fs h3::after{order:2}
#yact .ya-evh{position:absolute;inset:0;z-index:40;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(6,4,18,.72)}
#yact .ya-evh.on{display:flex}
#yact .ya-evh .eh-w{width:min(330px,100%);border-radius:16px;border:2px solid #d8a830;background:radial-gradient(ellipse 120% 60% at 50% 0,#4a3c86 0,#231a4c 45%,#0c0a1c 100%);box-shadow:0 0 0 3px #0c0a1c,0 8px 0 3px rgba(0,0,0,.5),0 0 26px rgba(120,90,255,.4);color:#f0ecff;padding:14px 14px 14px;text-align:center}
#yact .ya-evh .eh-hd{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px}
#yact .ya-evh .eh-im{width:40px;height:40px;object-fit:contain;image-rendering:pixelated;flex:none}
#yact .ya-evh .eh-t{font-size:15px;line-height:1.3;color:#ffe9a0;text-shadow:0 2px 0 rgba(0,0,0,.5);min-width:0;word-break:keep-all}
#yact .ya-evh .eh-m{margin:0 0 10px;font-size:14px;line-height:1.5;word-break:keep-all}
#yact .ya-evh .eh-m b{display:inline-block;padding:0 8px;border-radius:9px;color:#fff;background:linear-gradient(180deg,#b490ff,#6a3ad0);border:1.5px solid #ffe08a;box-shadow:0 0 8px rgba(170,120,255,.7)}
#yact .ya-evh .eh-pl{display:flex;justify-content:center;gap:6px;margin-bottom:10px}
#yact .ya-evh .eh-pl span{flex:1;max-width:92px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px 5px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 0 rgba(0,0,0,.45)}
#yact .ya-evh .eh-pl span.nx{border-color:#ffe08a;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 3px 0 rgba(0,0,0,.45),0 0 10px rgba(255,216,74,.6)}
#yact .ya-evh .eh-pl span.dn{opacity:.55}
#yact .ya-evh .eh-pl img{width:26px;height:26px;object-fit:contain;image-rendering:pixelated}
#yact .ya-evh .eh-pl small{font-size:11px;line-height:1.2;color:#d8d0f4}
#yact .ya-evh .eh-pl em{font-style:normal;font-size:12px;line-height:1.2;color:#ffe27a}
#yact .ya-evh .eh-y{margin:0 0 12px;padding:8px 10px;border-radius:10px;background:rgba(8,6,24,.55);border:1.5px solid rgba(255,233,160,.3);font-size:12px;line-height:1.55;color:#cfc8ee;text-align:left;word-break:keep-all}
#yact .ya-evh .eh-bt{display:flex;gap:8px}
#yact .ya-evh .eh-bt button{flex:1;font-family:var(--px);font-weight:700;font-size:14px;padding:10px 4px;border-radius:11px;cursor:pointer;white-space:nowrap}
#yact .ya-evh .eh-x{background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.06));border:2px solid rgba(255,255,255,.3);color:#f0ecff;box-shadow:0 3px 0 rgba(0,0,0,.5)}
#yact .ya-evh .eh-go{flex:1.6!important;background:linear-gradient(180deg,#fff2a8 0,#ffd040 45%,#e89a18 100%);border:2px solid #6a3a00;color:#4a2400;box-shadow:0 3px 0 #6a3a00,0 0 10px rgba(255,200,60,.5)}
#yact .ya-evh .eh-bt button:active{transform:translateY(3px);box-shadow:none}
/* 경완 '스테이지 9단계는 대장 2마리 나오는건데 실루엣도 2마리여야' : 대장 수만큼 칸 */
#yact .ya-road b.m+b.m{margin-left:3px}
/* 경완 '포켓몬 선택 슬롯에도 포켓몬 이름 옆에 레벨 표시' */
#yact .fs .pkc small{display:block;flex:none;font-size:10px;line-height:1;margin-left:auto;padding:2px 5px;border-radius:7px;background:rgba(8,6,24,.5);color:#ffe9a0;white-space:nowrap}
#yact .fs .pkc.on small{background:rgba(74,36,0,.82);color:#fff2a8}
#yact .fs .pkc b{flex:0 1 auto}
/* 세 칸이면 옆에 둘 자리가 없어 이름 아래 줄로 (긴 이름 .lg 는 작게 두 줄 — 잘림 없이) */
#yact .fs .ya-pk.n3 .pkc{flex-wrap:wrap;align-content:center;row-gap:2px;padding:3px 6px;height:44px}
#yact .fs .ya-pk.n3 .pkc img{order:0}
#yact .fs .ya-pk.n3 .pkc u{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-decoration:none}
#yact .fs .pkc u{display:contents;text-decoration:none}
#yact .fs .ya-pk.n3 .pkc small{margin:0;padding:1px 5px}
#yact .fs .ya-pk.n3 .pkc b{max-width:100%}
#yact .fs .ya-pk.n3 .pkc b.lg{font-size:10px;line-height:1.1;white-space:normal;word-break:keep-all;text-align:left}
#yact .fs .ya-pk.many .pkc{flex-direction:column;gap:0;height:48px;padding:2px 0}
#yact .fs .ya-pk.many .pkc img{width:28px;height:28px}
#yact .fs .ya-pk.many .pkc small{margin:0;padding:1px 4px;font-size:9px}
#yact .fs .ya-pmv{grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
#yact .fs .ya-pmv span{font-size:13px;font-weight:700;line-height:1.3;padding:6px 4px;border-radius:9px;color:#fff;border:2px solid #0c0a1c;letter-spacing:.5px;background:linear-gradient(180deg,color-mix(in srgb,var(--tc) 94%,#000) 0,color-mix(in srgb,var(--tc) 74%,#000) 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.28),inset 0 -3px 0 rgba(0,0,0,.25),0 2px 0 rgba(0,0,0,.5);text-shadow:-1px 0 #14101e,1px 0 #14101e,0 -1px #14101e,0 2px #14101e}
#yact .fs .ya-bd{flex:1;min-height:0;overflow:auto;padding:10px 16px 12px!important;display:flex;flex-direction:column;justify-content:space-between;gap:10px}
#yact .fs .ya-bd>*{margin:0}
#yact .fs h3{font-size:12.5px;gap:8px;align-items:center;margin-bottom:8px;color:#ffe9a0}
#yact .fs h3::before{content:"";width:8px;height:8px;rotate:45deg;flex:none;background:#ffd040;box-shadow:0 0 6px #ffd040}
#yact .fs h3::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,rgba(255,233,160,.5),transparent)}
#yact .fs .ya-pk{gap:7px;margin:0}
#yact .fs .ya-pk.many{margin:0}
#yact .fs .pkc{max-width:none;height:42px;border-radius:11px;padding:4px 8px;gap:5px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(255,233,160,.4);color:#f0ecff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 0 rgba(0,0,0,.45)}
#yact .fs .pkc:active{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 1px 0 rgba(0,0,0,.45)}
#yact .fs .pkc img{width:30px;height:30px}#yact .fs .pkc b{font-size:12px}
#yact .fs .pkc.on{background:linear-gradient(180deg,#fff2a8 0,#ffd040 50%,#e89a18 100%);border-color:#6a3a00;color:#4a2400;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 3px 0 #6a3a00,0 0 12px rgba(255,200,60,.55)}
#yact .fs .ya-stt{gap:5px;background:none;border:0;box-shadow:none}
#yact .fs .stc{border-radius:10px;padding:5px 0 6px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(255,255,255,.22);color:#e8e2ff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 0 rgba(0,0,0,.45);transition:transform .06s}
#yact .fs .stc:active{transform:translateY(2px);background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.08))}
#yact .fs .stc img{width:28px;height:28px}
#yact .fs .stc.on{background:linear-gradient(180deg,#b490ff 0,#7a4ae0 55%,#5a2ec0 100%);border-color:#ffe08a;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 3px 0 #2c1470,0 0 12px rgba(170,120,255,.7)}
#yact .fs .ya-road{border-radius:12px;padding:9px 8px;background:rgba(8,6,24,.55);border:2px solid rgba(255,233,160,.4);box-shadow:inset 0 2px 8px rgba(0,0,0,.6)}
#yact .fs .ya-road i{background:linear-gradient(90deg,rgba(255,233,160,.6),rgba(255,233,160,.25))}
#yact .fs .ya-road b{border-radius:50%;width:20px;height:20px;line-height:16px;background:#30286a;border-color:#a898f0;color:#fff}
#yact .fs .ya-road b.m{border-radius:9px;overflow:hidden;width:32px;height:32px;line-height:28px;background:#d05a70;border-color:#ffb0a0;box-shadow:0 0 8px rgba(255,90,80,.5)}
#yact .fs .ya-road b.m.f{width:40px;height:40px;line-height:36px;border-radius:11px;background:linear-gradient(180deg,#ffe9a0,#e89a18);border-color:#fff2a8;box-shadow:0 0 10px rgba(255,200,60,.7)}
#yact .fs .fs-rwr{display:flex;gap:4px;justify-content:space-between}
/* 경완 2026-11-15 '받는 보상 뒤 원형 박스는 지워주고, 번뜩임 아이콘 게임 내 아이콘이랑 동일하게' */
#yact .fs .fs-rwr span{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;gap:4px;height:24px;font-size:11.5px;white-space:nowrap;color:#fff}
#yact .fs .fs-rwr .sv{width:18px;height:18px;flex:none}
#yact .fs .fs-rwr .gbs.got{opacity:.5}#yact .fs .fs-rwr .gbs.got img{filter:grayscale(1)}   /* 오늘 꾸러미를 이미 받음 (하루 첫 완주에만) */
#yact .fs .fs-rwr .c{font-style:normal;font-size:11px;padding:2px 9px;border-radius:8px;color:#fff;border:1.5px solid rgba(0,0,0,.5)}
#yact .fs .fs-rwr .ex{background:#3a8ee0}#yact .fs .fs-rwr .ev{background:#8a5ae0}#yact .fs .fs-rwr .fr{background:#e85a8a}
#yact .fs .fs-rwr .coin{margin-right:2px!important}
/* 경완 2026-11-16 '선택 슬롯박스 안에도 이름 옆에 성별 아이콘, 타입 아이콘은 우상단으로 한 줄로, 기술 이름 왼쪽에 형태 딱지, 9스테이지는 두 보스가 동시에 나온다는 거 알 수 있게 겹친 형태로, 받는 보상 끝에 클리어 보상 상자' */
#yact .fs .fs-rwr{gap:2px}#yact .fs .fs-rwr span{gap:3px;font-size:11px}#yact .fs .fs-rwr .c{padding:2px 6px}
#yact .fs .fs-rwr .gb{width:22px;height:22px;flex:none;image-rendering:pixelated;object-fit:contain;background:none!important;border:0!important;padding:0!important;box-shadow:none!important}
#yact .fs .pkc .pn{display:flex;align-items:center;gap:2px;min-width:0;flex:0 1 auto;max-width:100%}
#yact .fs .pkc .sx{flex:none;font-style:normal;font-weight:700;font-size:12px;line-height:1}
#yact .fs .pkc .sx.m{color:#6ab8ff}#yact .fs .pkc .sx.f{color:#ff8ab4}
#yact .fs .pkc.on .sx.m{color:#1a5ac0}#yact .fs .pkc.on .sx.f{color:#c8306a}
#yact .fs .ya-pk.many .pkc .pn{display:none}
#yact .fs .hr-ty{left:auto;right:-36px;top:2px;flex-direction:row;gap:3px}
#yact .fs .ya-pmv span{display:flex;align-items:center;justify-content:center;gap:5px}
#yact .fs .ya-pmv span b{min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:700}
#yact .fs .ya-pmv span em{flex:none;font-style:normal;font-size:10px;line-height:1;letter-spacing:0;padding:3px 5px;border-radius:6px;background:rgba(12,10,28,.62);color:#fff2c8;text-shadow:none;border:1px solid rgba(255,255,255,.28)}
#yact .fs .ya-road b.m+b.m{margin-left:-14px;margin-top:7px;position:relative;z-index:1;box-shadow:-2px -2px 0 rgba(8,6,24,.85),0 0 8px rgba(255,90,80,.5)}
#yact .fs .ya-road b.m:has(+b.m){margin-top:-7px}
#yact .fs .fs-ft{flex:none;padding:12px 16px calc(12px + var(--si-bottom,env(safe-area-inset-bottom)));background:linear-gradient(180deg,rgba(12,10,28,0),rgba(12,10,28,.9) 30%)}
#yact .fs .fs-ft .bigb{margin:0;padding:14px 0;font-size:19px;letter-spacing:3px;border-radius:12px;background:linear-gradient(180deg,#fff2a8 0,#ffd040 45%,#e89a18 100%);border-color:#6a3a00;color:#4a2400;box-shadow:0 4px 0 #6a3a00,0 0 14px rgba(255,200,60,.6)}
#yact .fs .fs-ft .bigb:active{transform:translateY(3px);box-shadow:0 1px 0 #6a3a00}
#yact .fs .ya-op{color:#a8a0c8;margin-top:8px}
#yact .rs-hero{padding:12px 14px 14px;text-align:center;background:radial-gradient(120% 100% at 50% 0,#5a6088 0,#34365a 55%,#1c1c3a 100%)}
#yact .rs-hero.win{background:radial-gradient(120% 100% at 50% 0,#ffe27a 0,#f0a818 55%,#b86a00 100%)}
#yact .rs-h{display:block;font-size:22px;line-height:1.25;text-shadow:0 2px 0 rgba(0,0,0,.45)}
#yact .rs-stg{display:inline-block;font-size:10.5px;line-height:1.5;margin-top:4px;padding:0 8px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.35)}
#yact .rs-me{display:flex;align-items:center;gap:10px;margin-top:10px;padding:7px 10px;background:#fbf8f0;color:var(--ink);border:3px solid var(--ink);box-shadow:0 3px 0 rgba(0,0,0,.3);text-align:left}
#yact .rs-im{width:52px;height:52px;image-rendering:pixelated;object-fit:contain;flex:none}
#yact .rs-mi{flex:1;min-width:0}
#yact .rs-mi .r1{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:13px;white-space:nowrap}
#yact .rs-mi .r1 b{min-width:0;overflow:hidden;text-overflow:ellipsis}
#yact .rs-lv{font-size:11px;color:#5a5a6a}
#yact .rs-lv .lvup{font-style:normal;color:#e05a20;font-weight:700}
#yact .rs-mi .xb{display:block;height:8px;background:#dcd8ce;border:2px solid var(--ink);margin:5px 0 3px;position:relative}
#yact .rs-mi .xb i{position:absolute;left:0;top:0;bottom:0;background:#48a8f0;width:var(--w);animation:yaXb .7s .5s ease-out both}
#yact .rs-xp{display:block;font-size:9.5px;color:#6a6a7a;text-align:right}
#yact .rs-rk{flex:none;width:46px;height:46px;line-height:40px;text-align:center;font-size:26px;border:3px solid currentColor;border-radius:50%;color:#e0402a;transform:rotate(-12deg);animation:yaStamp .35s .9s cubic-bezier(.2,1.6,.4,1) both}
@keyframes yaStamp{0%{transform:rotate(-12deg) scale(2.4);opacity:0}}
/* 경완 2026-11-16 '마지막 나오는 결과창도 시작화면처럼 퀄리티 좀 높여서': 시작 화면과 같은 어두운 무대 전체 화면 (금빛 발판·후광·유리 칸), 등급 메달, 스테이지 길에 어디까지 갔는지 */
/* 경완 '아니 원래대로 창으로 뜨는 버전으로': 전체 화면 말고 가운데 창 */
#yact .ya-res.fs{width:min(356px,calc(100% - 20px));max-height:calc(100% - 16px - var(--si-top,env(safe-area-inset-top)));display:flex;flex-direction:column;overflow:hidden;border-radius:18px;border:2px solid #8a90c0;color:#f0ecff;box-shadow:0 0 0 3px #0c0a1c,0 8px 0 3px rgba(0,0,0,.5),0 0 30px rgba(120,130,255,.4);background:radial-gradient(ellipse 120% 60% at 50% 0,#3c4470 0,#1a1c3c 45%,#0a0a18 100%)}
#yact .ya-res.fs.win{border-color:#d8a830;box-shadow:0 0 0 3px #0c0a1c,0 8px 0 3px rgba(0,0,0,.5),0 0 34px rgba(255,200,60,.5)}
#yact .ya-res.fs .ya-hero{padding:14px 14px 10px!important}
#yact .ya-res.fs .ya-bd{padding:2px 14px 4px!important}
#yact .ya-res.fs .fs-ft{padding:10px 14px 12px;background:none}
#yact .ya-res.fs .ya-op{margin:7px 0 0;font-size:10.5px}
#yact .ya-res.fs.win{background:radial-gradient(ellipse 120% 60% at 50% 0,#8a6436 0,#3a2658 42%,#0c0a1c 100%)}
#yact .ya-res.fs>*{position:relative;z-index:1}
#yact .ya-res.fs .rs-cf{display:none;position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;text-decoration:none}
#yact .ya-res.fs.win .rs-cf{display:block}
#yact .ya-res.fs .rs-cf i{position:absolute;top:-12px;width:6px;height:6px;animation:rsFall linear infinite}
@keyframes rsFall{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(820px) rotate(540deg)}}
#yact .ya-res.fs .ya-hero,#yact .ya-res.fs .rs-hero.win{text-align:center;padding-bottom:10px;background:none;border:0;box-shadow:none;outline:0}
#yact .ya-res.fs .rs-h{font-size:25px;letter-spacing:2px;color:#dfe3f6;text-shadow:0 3px 0 rgba(0,0,0,.55)}
#yact .ya-res.fs.win .rs-h{color:#ffe9a0;text-shadow:0 3px 0 #6a3a00,0 0 16px rgba(255,200,60,.7)}
#yact .ya-res.fs .rs-stg{font-size:11.5px;line-height:1.5;margin-top:6px;padding:2px 12px;border-radius:11px;background:rgba(8,6,24,.55);border:1.5px solid rgba(255,233,160,.45);color:#f0ecff}
#yact .ya-res.fs .hr-row{margin-top:6px}
#yact .ya-res.fs .hr-st{height:min(112px,13vh)}
#yact .ya-res.fs:not(.win) .hr-st::before{background:radial-gradient(ellipse,#d0d4e8 0,#6c7294 60%,#3a3e58 100%);border-color:#14162a}
#yact .ya-res.fs:not(.win) .hr-st>u.a{background:radial-gradient(circle,rgba(130,160,255,.4),rgba(160,180,255,.12) 45%,transparent 70%)}
#yact .ya-res.fs:not(.win) .hr-st>u.b{opacity:.35}
#yact .ya-res.fs .rs-im{object-fit:contain;image-rendering:pixelated;flex:none}
#yact .ya-res.fs .rs-rk{position:absolute;right:-6px;top:0;width:60px;height:60px;line-height:54px;padding:0;text-align:center;font-size:32px;border-radius:50%;border:3px solid #6a3a00;color:#6a3a00;background:radial-gradient(circle at 35% 28%,#fffbe0 0,#ffd84a 45%,#e89a18 100%);box-shadow:inset 0 0 0 3px rgba(255,255,255,.55),0 4px 0 rgba(0,0,0,.5),0 0 16px rgba(255,200,60,.75);text-shadow:0 1px 0 #fff6c0;transform:rotate(-10deg);animation:rsStamp .4s .9s cubic-bezier(.2,1.6,.4,1) both}
@keyframes rsStamp{0%{transform:rotate(-10deg) scale(2.6);opacity:0}}
#yact .ya-res.fs .rs-rk[data-rk="A"]{background:radial-gradient(circle at 35% 28%,#fff4e0 0,#ffb060 45%,#e06a18 100%);border-color:#6a2a00;color:#6a2a00;box-shadow:inset 0 0 0 3px rgba(255,255,255,.5),0 4px 0 rgba(0,0,0,.5),0 0 14px rgba(255,150,60,.6)}
#yact .ya-res.fs .rs-rk[data-rk="B"]{background:radial-gradient(circle at 35% 28%,#fff 0,#c8d0e4 45%,#8088a8 100%);border-color:#2a3050;color:#2a3050;text-shadow:0 1px 0 #fff;box-shadow:inset 0 0 0 3px rgba(255,255,255,.55),0 4px 0 rgba(0,0,0,.5),0 0 12px rgba(190,210,255,.5)}
#yact .ya-res.fs .rs-rk[data-rk="C"]{background:radial-gradient(circle at 35% 28%,#ffe6cc 0,#d89058 45%,#96582a 100%);border-color:#4a2408;color:#4a2408;text-shadow:0 1px 0 #ffe0c0;box-shadow:inset 0 0 0 3px rgba(255,255,255,.4),0 4px 0 rgba(0,0,0,.5)}
#yact .ya-res.fs .rs-rk[data-rk="D"]{background:radial-gradient(circle at 35% 28%,#e0e0ea 0,#8c8ca0 45%,#585870 100%);border-color:#24243a;color:#24243a;text-shadow:0 1px 0 #e8e8f0;box-shadow:inset 0 0 0 3px rgba(255,255,255,.35),0 4px 0 rgba(0,0,0,.5)}
#yact .ya-res.fs .rs-me{display:block;width:100%;margin:0;padding:8px 12px 7px;border-radius:12px;text-align:left;color:#f0ecff;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(255,233,160,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 0 rgba(0,0,0,.45)}
#yact .ya-res.fs .rs-me .r1{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:15px;white-space:nowrap}
#yact .ya-res.fs .rs-me .r1 b{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#fff}
#yact .ya-res.fs .rs-lv{font-size:12.5px;color:#d8d2f2}
#yact .ya-res.fs .rs-lv .lvup{color:#ffd84a}
#yact .ya-res.fs .rs-me .xb{display:block;position:relative;height:11px;margin:6px 0 4px;border-radius:6px;overflow:hidden;background:#14122c;border:2px solid #0c0a1c;box-shadow:0 0 0 1px rgba(255,255,255,.18)}
#yact .ya-res.fs .rs-me .xb i{position:absolute;left:0;top:0;bottom:0;width:var(--w);background:linear-gradient(90deg,#3a98e8,#8fe0ff);animation:yaXb .7s .5s ease-out both}
#yact .ya-res.fs .rs-xp{display:block;text-align:right;font-size:10.5px;color:#b8b0d8}
#yact .ya-res.fs .ya-bd{justify-content:flex-start;gap:9px;padding-top:2px!important}
#yact .ya-res.fs .ya-road b{opacity:.5}
#yact .ya-res.fs .ya-road b.dn{opacity:1;background:linear-gradient(180deg,#fff2a8,#e8a020);border-color:#fff6c8;color:#4a2400}
#yact .ya-res.fs .ya-road b.m.dn{box-shadow:0 0 10px rgba(255,200,60,.7)}
#yact .ya-res.fs .ya-road b.no{opacity:1;background:#6a1c30;border-color:#ff8a78;color:#fff;box-shadow:0 0 0 2px rgba(255,90,80,.35),0 0 10px rgba(255,90,80,.8);animation:rsNo 1.1s ease-in-out infinite}
@keyframes rsNo{50%{box-shadow:0 0 0 4px rgba(255,90,80,.15),0 0 14px rgba(255,90,80,1)}}
#yact .ya-res.fs .ya-road b.m.dn img,#yact .ya-res.fs .ya-road b.m.no img{filter:none;opacity:1}
#yact .ya-res.fs .ya-road i{opacity:.35}
#yact .ya-res.fs .ya-road i.dn{opacity:1;background:#ffd84a;box-shadow:0 0 5px rgba(255,216,74,.7)}
#yact .ya-res.fs .rs-sub{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
#yact .ya-res.fs .rs-sub span{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;padding:5px 2px 6px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border:2px solid rgba(255,255,255,.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 3px 0 rgba(0,0,0,.4)}
#yact .ya-res.fs .rs-sub i{font-style:normal;font-size:10.5px;color:#cfc8ee;white-space:nowrap}
#yact .ya-res.fs .rs-sub b{font-size:18px;line-height:1.15;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.45)}
#yact .ya-res.fs .ya-rl{display:flex;flex-direction:column;gap:5px;background:none;border:0;box-shadow:none}
#yact .ya-res.fs .ya-rl li{min-height:42px;padding:5px 12px 5px 8px;border-radius:11px;border:2px solid rgba(255,255,255,.2);background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 3px 0 rgba(0,0,0,.4)}
#yact .ya-res.fs .ya-rl .ic{height:19px;line-height:16px;padding:0 5px;border-radius:8px;border:1.5px solid rgba(0,0,0,.5);font-size:10.5px}
#yact .ya-res.fs .ya-rl svg.ic{width:26px;height:26px;padding:0;border:0}
#yact .ya-res.fs .ya-rl .k{font-size:12.5px;color:#f0ecff}
#yact .ya-res.fs .ya-rl em{font-size:10.5px;color:#b8b0d8}
#yact .ya-res.fs .ya-rl b{font-size:20px;color:#9fd8ff;text-shadow:0 2px 0 rgba(0,0,0,.45)}
#yact .ya-res.fs .ya-rl b.ev{color:#d6b4ff}#yact .ya-res.fs .ya-rl b.fr{color:#ff9ab8}#yact .ya-res.fs .ya-rl b.eg{color:#8fe0ff}
#yact .ya-res.fs .ya-rl li.ya-gold{background:linear-gradient(180deg,rgba(255,216,74,.3),rgba(232,154,24,.14));border-color:#d8a830;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 3px 0 rgba(0,0,0,.4),0 0 12px rgba(255,200,60,.35)}
#yact .ya-res.fs .ya-rl li.ya-gold b{color:#ffe27a;font-size:23px}
#yact .ya-res.fs .ya-rl li.ya-gold .k{color:#ffe9a0}
#yact .ya-res.fs .rs-row{display:grid;grid-template-columns:1fr 1.5fr;gap:8px}
#yact .ya-res.fs .fs-ft .bigb{font-size:17px;letter-spacing:1px;padding:12px 0}
#yact .ya-res.fs .fs-ft .bigb.sec{flex:none;font-size:15px;letter-spacing:0;color:#f0ecff;border-color:rgba(255,255,255,.4);background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.07));box-shadow:0 4px 0 rgba(0,0,0,.55)}
#yact .ya-res.fs .fs-ft .bigb.sec:active{box-shadow:0 1px 0 rgba(0,0,0,.55)}
/* 경완 2026-11-16 '메가진화 폼까지 다 깨면 보상이랑 선물상자 떨어지고 조금 있다가 자석처럼 한번에 먹어지는 효과, 선물상자 먹으면 체육관 아이템들 꾸러미 보상 창, 확인 누르면 결과창': 결과창과 같은 어두운 무대 창 */
#yact .ya-gift{z-index:10;width:min(330px,calc(100% - 28px));padding:16px 14px 14px;text-align:center;overflow:hidden;border-radius:18px;border:2px solid #d8a830;color:#f0ecff;background:radial-gradient(ellipse 120% 60% at 50% 0,#8a6436 0,#3a2658 42%,#0c0a1c 100%);box-shadow:0 0 0 3px #0c0a1c,0 8px 0 3px rgba(0,0,0,.5),0 0 34px rgba(255,200,60,.5)}
#yact .ya-gift.pop{animation:yaPop .32s cubic-bezier(.2,1.5,.4,1)}
#yact .gf-h{display:block;font-size:22px;letter-spacing:1px;color:#ffe9a0;text-shadow:0 3px 0 #6a3a00,0 0 16px rgba(255,200,60,.7)}
#yact .gf-s{display:inline-block;margin-top:6px;font-size:11.5px;line-height:1.5;padding:2px 12px;border-radius:11px;background:rgba(8,6,24,.55);border:1.5px solid rgba(255,233,160,.45)}
#yact .gf-st{position:relative;height:104px;margin:8px 0 4px;display:flex;align-items:center;justify-content:center;isolation:isolate}
#yact .gf-st>u{position:absolute;pointer-events:none;z-index:-1;text-decoration:none}
#yact .gf-st>u.a{left:50%;top:50%;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:radial-gradient(circle,rgba(255,226,140,.6),rgba(190,150,255,.22) 45%,transparent 70%);animation:yaHalo 2.6s ease-in-out infinite}
#yact .gf-st>u.b{inset:-6px 10px;background:radial-gradient(circle 2px at 12% 30%,#fff3c0 99%,transparent),radial-gradient(circle 3px at 88% 22%,#fff3c0 99%,transparent),radial-gradient(circle 2px at 78% 72%,#fff 99%,transparent),radial-gradient(circle 3px at 20% 78%,#ffe08a 99%,transparent),radial-gradient(circle 2px at 32% 8%,#fff 99%,transparent),radial-gradient(circle 2px at 66% 6%,#ffe08a 99%,transparent);animation:yaHalo 1.8s ease-in-out infinite}
#yact .gf-bx{width:80px;height:auto;image-rendering:pixelated;animation:gfBox .7s cubic-bezier(.2,1.5,.4,1) both,yaBob 1.6s .7s ease-in-out infinite;filter:drop-shadow(0 4px 0 rgba(0,0,0,.45))}
@keyframes gfBox{0%{transform:scale(.3) rotate(-18deg);opacity:0}60%{transform:scale(1.2) rotate(6deg)}}
#yact .gf-l{display:flex;justify-content:center;gap:8px;margin:14px 0 12px}
#yact .gf-l span{position:relative;flex:0 0 31%;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;padding:8px 2px 7px;border-radius:11px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:2px solid rgba(255,233,160,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 0 rgba(0,0,0,.45);animation:gfIt .34s cubic-bezier(.2,1.5,.4,1) both;animation-delay:calc(var(--i)*.16s + .55s)}
@keyframes gfIt{0%{transform:translateY(-16px) scale(.6);opacity:0}}
#yact .gf-l img{width:40px;height:40px;object-fit:contain;image-rendering:pixelated}
#yact .gf-l i{font-style:normal;font-size:11px;line-height:1.25;color:#f0ecff;max-width:100%;word-break:keep-all;text-align:center;letter-spacing:-.3px}
#yact .gf-l i s{display:inline-block;margin-right:3px;padding:0 3px;border-radius:3px;background:#3f7fd0;color:#fff;font-size:9px;font-weight:700;line-height:13px;text-decoration:none;vertical-align:1px;letter-spacing:0}#yact .gf-l i s.tr{background:#c0508a}
#yact .gf-l span{--gc:255,233,160}
#yact .gf-l span.gr1{--gc:96,168,255;--gd:#2a5fb8;--gl:#bfe0ff}
#yact .gf-l span.gr2{--gc:186,132,255;--gd:#6a3ac0;--gl:#ecd8ff}
#yact .gf-l span.gr3{--gc:255,206,72;--gd:#b06a00;--gl:#fff6c8}
#yact .gf-l span[class*="gr"]:not(.gr0){border-color:rgb(var(--gc));background:linear-gradient(180deg,rgba(var(--gc),.34),rgba(var(--gc),.1));box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 3px 0 rgba(0,0,0,.45),0 0 14px rgba(var(--gc),.75);overflow:visible}
#yact .gf-l em{position:absolute;left:50%;top:-10px;transform:translateX(-50%);z-index:2;font-style:normal;font-size:10.5px;line-height:1;padding:3px 8px 3px;border-radius:8px;white-space:nowrap;color:#fff;background:linear-gradient(180deg,rgb(var(--gc)),var(--gd));border:1.5px solid var(--gl);box-shadow:0 2px 0 rgba(0,0,0,.5);text-shadow:0 1px 0 rgba(0,0,0,.45);animation:gfTag .3s cubic-bezier(.2,1.8,.4,1) both;animation-delay:calc(var(--i)*.16s + .85s)}
#yact .gf-l span.gr3 em{color:#4a2400;text-shadow:0 1px 0 rgba(255,255,255,.5)}
@keyframes gfTag{0%{transform:translateX(-50%) scale(0)}}
#yact .gf-l u{position:absolute;inset:0;border-radius:9px;overflow:hidden;pointer-events:none;text-decoration:none}
#yact .gf-l u::after{content:"";position:absolute;top:-20%;bottom:-20%;left:-60%;width:38%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg);animation:gfSh 2.4s ease-in-out infinite;animation-delay:calc(var(--i)*.16s + 1.1s)}
@keyframes gfSh{0%{left:-60%}45%,100%{left:130%}}
#yact .gf-l span.gr1 u::after{display:none}
#yact .ya-gift[data-gr="3"] .gf-st>u.a{background:radial-gradient(circle,rgba(255,236,150,.85),rgba(255,180,60,.3) 45%,transparent 70%)}
#yact .ya-gift[data-gr="2"] .gf-st>u.a{background:radial-gradient(circle,rgba(226,190,255,.75),rgba(150,100,255,.28) 45%,transparent 70%)}
#yact .gf-l b{position:absolute;right:5px;top:3px;font-size:13px;color:#ffe27a;text-shadow:0 2px 0 rgba(0,0,0,.5)}
#yact .ya-gift .gf-ok{margin:0;padding:12px 0;font-size:17px;letter-spacing:3px;border-radius:12px;background:linear-gradient(180deg,#fff2a8 0,#ffd040 45%,#e89a18 100%);border-color:#6a3a00;color:#4a2400;box-shadow:0 4px 0 #6a3a00,0 0 14px rgba(255,200,60,.6)}
#yact .ya-gift .gf-ok:active{transform:translateY(3px);box-shadow:0 1px 0 #6a3a00}
#yact .ya-gift .gf-ok.lk{opacity:.55;pointer-events:none}
/* 경완 '창이 너무 길다': 포켓몬·이름 칸을 한 줄로, 보상은 두 칸씩 */
#yact .ya-res.fs .hr-row{flex-direction:row;align-items:center;gap:12px;margin-top:10px;text-align:left}
#yact .ya-res.fs .hr-st{width:100px;height:88px;flex:none}
#yact .ya-res.fs .hr-st::before{left:4px;right:4px;height:18px;border-width:2px}
#yact .ya-res.fs .hr-st>u.a{width:170px;height:170px;margin:-85px 0 0 -85px}
#yact .ya-res.fs .hr-st>u.b{inset:-14px -20px}
#yact .ya-res.fs .rs-im{margin-bottom:5px}
#yact .ya-res.fs .rs-rk{right:-10px;top:-8px;width:44px;height:44px;line-height:38px;font-size:23px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55),0 3px 0 rgba(0,0,0,.5),0 0 12px rgba(255,200,60,.7)}
#yact .ya-res.fs .rs-me{flex:1;min-width:0;width:auto}
#yact .ya-res.fs .rs-h{font-size:23px}
#yact .ya-res.fs .ya-hero{padding:12px 14px 8px!important}
#yact .ya-res.fs .ya-bd{gap:7px}
#yact .ya-res.fs .ya-road{padding:6px 8px}
#yact .ya-res.fs .ya-road b.m{width:28px;height:28px;line-height:24px}#yact .ya-res.fs .ya-road b.m.f{width:34px;height:34px;line-height:30px}
#yact .ya-res.fs .rs-sub span{flex-direction:row;justify-content:center;align-items:baseline;gap:4px;padding:4px 2px}
#yact .ya-res.fs .rs-sub i{font-size:10px}#yact .ya-res.fs .rs-sub b{font-size:14px}
#yact .ya-res.fs .ya-rl{display:grid;grid-template-columns:1fr 1fr;gap:5px}
#yact .ya-res.fs .ya-rl li{min-height:0;grid-template-columns:auto 1fr;grid-template-areas:"i b" "k k";row-gap:2px;padding:6px 9px 5px 7px}
#yact .ya-res.fs .ya-rl li .k,#yact .ya-res.fs .ya-rl li.one .k{grid-area:k;grid-row:auto;align-self:auto;font-size:10.5px;color:#b8b0d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#yact .ya-res.fs .ya-rl li em{display:none}
#yact .ya-res.fs .ya-rl li:has(b.eg) .k{display:none}
#yact .ya-res.fs .ya-rl li:has(b.eg) em{display:block;grid-area:k;white-space:nowrap;overflow:hidden}
#yact .ya-res.fs .ya-rl .ic{justify-self:start}
#yact .ya-res.fs .ya-rl svg.ic{width:22px;height:22px}
#yact .ya-res.fs .ya-rl b{font-size:18px}
#yact .ya-res.fs .ya-rl li.ya-gold{grid-column:1/-1;grid-template-columns:28px 1fr auto;grid-template-areas:"i k b" "i e b";row-gap:0;padding:6px 12px 6px 8px}
#yact .ya-res.fs .ya-rl li.ya-gold .k{grid-area:k;font-size:12.5px;color:#ffe9a0;align-self:end}
#yact .ya-res.fs .ya-rl li.ya-gold.one .k{grid-row:1/3;align-self:center}
#yact .ya-res.fs .ya-rl li.ya-gold em{display:block;grid-area:e}
#yact .ya-res.fs .ya-rl li.ya-gold b{font-size:21px}
#yact .ya-res.fs .fs-ft .bigb{padding:11px 0}
#yact .rs-chips{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin:10px 0 8px}
#yact .rs-chips span{font-size:10px;line-height:1.5;padding:0 7px;background:#e9e4d8;border:1px solid #c8c0ac;white-space:nowrap}
#yact .rs-chips b{margin-left:4px}
#yact .ya-rl{list-style:none;margin:0;padding:0;background:#fff;border:3px solid var(--ink);box-shadow:0 3px 0 rgba(32,32,44,.25)}
#yact .ya-rl li{animation:yaRow .3s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(var(--i,0)*.15s + .25s);display:grid;grid-template-columns:44px 1fr auto;grid-template-areas:"i k b" "i e b";align-items:center;column-gap:9px;min-height:40px;padding:6px 10px;border-bottom:2px solid #e4decc}
#yact .ya-rl li:last-child{border-bottom:0}
/* 경완 2026-11-14 '기록창 딱지를 상단 정보창 딱지랑 통일': 이름표 알약(경험치·능력치 이름)·번뜩임 별·골드 동전 */
#yact .ya-rl .ic{grid-area:i;justify-self:center;height:17px;line-height:14px;padding:0 4px;white-space:nowrap;text-align:center;font-size:10px;font-style:normal;font-weight:700;color:#fff;border:1.5px solid var(--ink);background:var(--c)}
#yact .ya-rl svg.ic{width:26px;height:26px;padding:0;border:0;background:none}
#gym #yact .ya-rl .coin{grid-area:i;justify-self:center;margin:0!important;width:18px;height:18px}
#yact .ya-rl li.one .k{grid-row:1/3;align-self:center}
#yact .ya-rl .k{grid-area:k;font-size:12px;align-self:end}
#yact .ya-rl em{grid-area:e;font-style:normal;font-size:9.5px;line-height:1.3;color:#6a6a7a;align-self:start}
#yact .ya-rl b{grid-area:b;font-size:19px;line-height:1.1;text-align:right}
#yact .ya-rl li.ya-gold{background:#fff6d0}
#yact .ya-rl li.ya-gold b{color:#a87800}
#yact .rs-row{display:flex;gap:8px}
/* 경완 2026-11-15 '시작화면 뜨기 전에 불러오는 중 같은 하얀 텍스트 아주 잠깐 1프레임 본 거 같은데': 준비 화면 바탕을 시작 화면과 같은 색으로, 글자는 1초 넘게 걸릴 때만 천천히 나타남 */
#yact .ya-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;z-index:10;color:rgba(240,236,255,0);background:radial-gradient(ellipse 120% 60% at 50% 0,#4a3c86 0,#231a4c 45%,#0c0a1c 100%);animation:yaLoadT .4s linear 1s forwards}
@keyframes yaLoadT{to{color:rgba(240,236,255,.8)}}
`;
const HTML = `<canvas></canvas>
<div class="ya-hud ya-top"><button class="b3 ya-quit">그만</button></div>
<div class="ya-hud ya-arc">
  <div class="sg mg-hg"><i class="coin" aria-hidden="true"></i><b>0</b></div>
  <div class="sg ex"><i class="ri">경험치</i><b class="ya-rwe">+0</b></div>
  <div class="sg ev"><i class="ri ya-rwk"></i><b class="ya-rwv">0/8</b></div>
  <div class="sg ya-eg"><svg class="ri sv" viewBox="-13 -13 26 26" aria-hidden="true"><path d="M0.0 -12.5L3.2 -3.2L12.5 0.0L3.2 3.2L0.0 12.5L-3.2 3.2L-12.5 0.0L-3.2 -3.2Z" fill="#20202c"/><path d="M0.0 -9.5L2.4 -2.4L9.5 0.0L2.4 2.4L0.0 9.5L-2.4 2.4L-9.5 0.0L-2.4 -2.4Z" fill="#58c8ff"/><path d="M0.0 -5.2L1.3 -1.3L5.2 0.0L1.3 1.3L0.0 5.2L-1.3 1.3L-5.2 0.0L-1.3 -1.3Z" fill="#fff"/></svg><b class="ya-egp"></b><em class="ya-egt"></em></div>
  <div class="ya-stb"><b class="ya-ph">스테이지</b><div class="ya-stn"><div class="n"><b class="ya-wn">1</b><small>/${STAGES.length}</small></div><div class="ya-stg"></div></div></div></div>
<span hidden><i class="ya-rwxb"></i><i class="ya-rwvb"></i><i class="ya-egf"></i><i class="ya-egf0"></i></span>
<div class="ya-hud ya-tl"><div class="ya-cb"><b>0</b>콤보<small></small><i><u></u></i></div></div>
<span hidden><i class="ya-me"></i><i class="ya-m"></i><i class="ya-tm"></i><i class="ya-egn"></i><i class="ya-egs"></i></span>
<div class="ya-joy"></div><div class="ya-joyb"><i class="ya-joyk"></i></div>
<div class="ya-hint">왼쪽 아래를 끌어서 이동</div>
<div class="ya-pad"><button class="ya-dg">대쉬</button><div class="ya-mvs"></div></div>
<div class="ya-ban"></div><div class="ya-warn" hidden><i class="t"><b>WARNING · 우두머리 접근 · WARNING · 우두머리 접근 · WARNING · 우두머리 접근 · WARNING · 우두머리 접근 · </b></i><i class="b"><b>WARNING · 우두머리 접근 · WARNING · 우두머리 접근 · WARNING · 우두머리 접근 · WARNING · 우두머리 접근 · </b></i></div>
<div class="ya-ov"></div>
<div class="ya-jc"><div class="jc-w"><b class="jc-t">조이콘 2 연결</b><p class="jc-p">조이콘 옆면 레일의 <b>작은 싱크 버튼</b>을<br>초록 불이 흐를 때까지 꾹 눌러 주세요.<br>왼쪽·오른쪽을 하나씩 눌러요.</p><div class="jc-s"><span class="l">왼쪽</span><span class="r">오른쪽</span></div><p class="jc-m"></p><button class="b3 bigb jc-x" type="button">닫기</button></div></div>
<div class="ya-pz" hidden><div class="pz-w"><b class="pz-t">일시정지</b><p class="pz-s">그만두면 지금까지 얻은 보상만 받아요.</p><div class="pz-b"><button class="b3 bigb pz-go" type="button">계속하기</button><button class="b3 bigb pz-q" type="button">그만두기</button></div></div></div>
<div class="ya-win ya-start fs"><div class="ya-hero"><div class="fs-hd"><button class="fs-bk ya-x" type="button" aria-label="뒤로">◀</button><b>특훈</b><button class="fs-jc" type="button" hidden>조이콘 2</button><button class="fs-hp" type="button" aria-label="하는 법">?</button></div>
    <div class="hr-row"><div class="hr-st"><u class="a"></u><u class="b"></u><img class="hr-im" alt=""><span class="hr-ty"></span></div><div class="hr-in"><div class="hr-nl"><b class="hr-nm"></b><i class="hr-sx"></i></div><span class="hr-lv"></span><div class="ya-pmv"></div></div></div></div>
  <div class="ya-bd"><div class="ya-pk"></div>
  <div class="ya-sec"><h3>노력치 훈련<button class="ya-evq" type="button" aria-label="어떤 훈련이 좋을까">?</button></h3><div class="ya-stt"></div></div>
  <div class="ya-sec"><h3>스테이지</h3><div class="ya-road"></div></div>
  <div class="ya-sec"><h3>받는 보상</h3><div class="fs-rwr"><span><i class="c ex">경험치</i></span><span><i class="c ev">노력치</i></span><span><i class="c fr">친밀도</i></span><span><i class="coin"></i><b>골드</b></span><span><svg class="sv" viewBox="-13 -13 26 26" aria-hidden="true"><path d="M0.0 -12.5L3.2 -3.2L12.5 0.0L3.2 3.2L0.0 12.5L-3.2 3.2L-12.5 0.0L-3.2 -3.2Z" fill="#20202c"/><path d="M0.0 -9.5L2.4 -2.4L9.5 0.0L2.4 2.4L0.0 9.5L-2.4 2.4L-9.5 0.0L-2.4 -2.4Z" fill="#58c8ff"/><path d="M0.0 -5.2L1.3 -1.3L5.2 0.0L1.3 1.3L0.0 5.2L-1.3 1.3L-5.2 0.0L-1.3 -1.3Z" fill="#fff"/></svg><b>번뜩임</b></span><span class="gbs"><img class="gb" alt="" src="gym/img/yact/gift.png"><b>상자</b></span></div></div>
  </div>
  <div class="fs-ft"><button class="b3 bigb ya-go">특훈 시작</button></div></div>
<div class="ya-tu"><div class="tu-w"><div class="tu-hd"><b>특훈 하는 법</b><button class="tu-x" type="button" aria-label="닫기">✕</button></div><div class="tu-im"><img alt=""></div><div class="tu-tx"><b class="tu-h"></b><p class="tu-p"></p></div><div class="tu-dots"></div><div class="tu-bt"><button class="tu-pv" type="button">이전</button><button class="tu-nx" type="button">다음</button></div></div></div>
<div class="ya-evh"><div class="eh-w"><div class="eh-hd"><img class="eh-im" alt=""><b class="eh-t"></b></div><p class="eh-m"></p><div class="eh-pl"></div><p class="eh-y"></p><div class="eh-bt"><button class="eh-x" type="button">닫기</button><button class="eh-go" type="button"></button></div></div></div>
<div class="ya-win ya-gift" hidden><b class="gf-h">클리어 보상 꾸러미</b><span class="gf-s"></span>
  <div class="gf-st"><u class="a"></u><u class="b"></u><img class="gf-bx" alt="" src="gym/img/yact/gift.png"></div>
  <div class="gf-l"></div>
  <button class="b3 bigb gf-ok" type="button">확인</button></div>
<div class="ya-win ya-res fs" hidden><u class="rs-cf"></u><div class="ya-hero rs-hero"><b class="rs-h">특훈 완료!</b><span class="rs-stg"></span>
    <div class="hr-row"><div class="hr-st"><u class="a"></u><u class="b"></u><img class="hr-im rs-im" alt=""><b class="rs-rk">S</b></div>
    <div class="rs-me"><div class="r1"><b class="rs-nm"></b><span class="rs-lv"></span></div><i class="xb"><i></i></i><small class="rs-xp"></small></div></div></div>
  <div class="ya-bd"><div class="ya-road"></div><div class="rs-sub"></div>
  <ul class="ya-rl"></ul></div>
  <div class="fs-ft"><div class="rs-row"><button class="b3 bigb sec ya-back">훈련장으로</button><button class="b3 bigb ya-again">한 판 더</button></div>
  </div></div>
<div class="ya-load">훈련장 준비 중…</div>`;

// ---------- 시작 ----------
async function start({ host, mons, bgm0, bgmNow }) {
  if (R) return; if (!mons?.length) { GA.toast?.('훈련할 포켓몬이 없어요'); return; }
  if (!document.getElementById('yactCss')) { const s = document.createElement('style'); s.id = 'yactCss'; s.textContent = CSS; document.head.append(s); }
  const el = document.createElement('div'); el.id = 'yact'; el.className = 'st0'; el.innerHTML = HTML; (host || document.body).append(el);
  const q = s => el.querySelector(s);
  let done; const closed = new Promise(ok => { done = ok; });
  for (const k in SE_T) delete SE_T[k];
  R = { el, q, host: host || document.body, mons, pick: 0, stat: 5, G: null, T: 0, RT: 0, last: 0, run: false, raf: 0, FX: [], POPS: [], PT: [], GH: [], Q: [], SPR: {}, kit: null, BG: null, Y: {}, A: {},
    HS: 0, SLOW: 0, SLOWK: 1, TR: 0, KX: 0, KY: 0, ZM: 0, FLASH: 0, FLC: '255,255,230', VIG: 0, hapT: -1, hapN: -1, HELD: {}, BUF: null,
    JOY: { id: null, dx: 0, dy: 0, ox: 0, oy: 0 }, KEY: {}, done, off: [] };
  R.stat = mons[0].evk >= 0 ? mons[0].evk : 5;
  preOn();   /* 경완 2026-11-15 '특훈 진입 연출 나올 때 하단 메뉴 잠깐 사라졌다가 나오는 오류': 준비 중 화면(.ya-load)부터 메뉴 위까지만 덮는다 (전엔 준비가 끝난 뒤에야 줄여서 그 사이 메뉴가 가려짐) */
  try {
    await GB()?.evyLoad?.();
    R.kit = await GA.pfxKit?.().catch(() => null);
    try { /* 경완 2026-11-16 '특훈 버튼 누르면 bgm 바뀌고 시작하면 게임 bgm으로 바로 바뀌게': 버튼에서 이미 곡을 바꿨으면(bgmNow) 돌아갈 곡(bgm0)은 바꾸기 전 곡 */ R.bgm0 = bgm0 !== undefined ? bgm0 : window.GymBGM?.name || null; if (bgmNow) R.bgmNow = bgmNow; window.GymBGM?.sePrep(SE_PRE.map(n => 'DP_' + n)); ['wild', 'boss', 'bossBig', 'winWild'].forEach(n => window.GymBGM?.prep(n)); if (!MVFX) fetch('gym/mvfx.json').then(r => r.json()).then(j => { MVFX = j; }).catch(() => {}); } catch (e) {}
    await Promise.all(mons.map(o => spr(o.P.sp, o.P.sex)));
    await resize(); bind(); startUi();
  } catch (e) { console.error(e); GA.toast?.('특훈을 열지 못했어요'); close(); return closed; }
  q('.ya-load').remove();
  R.raf = requestAnimationFrame(loop);
  return closed;
}
/* 경완 2026-11-15 '특훈 버튼 눌렀을 때 하단 메뉴 사라지지 않게': 시작 화면 동안(.pre)은 체육관 아래 메뉴 위까지만 덮는다. 메뉴를 누르면 특훈을 닫고 그 메뉴로. 시작하면 전체 화면 */
function preOn() { const r = R, m = r.host.querySelector?.('.gy-menu'); if (!m || !m.offsetHeight) return; const h = r.host.getBoundingClientRect().bottom - m.getBoundingClientRect().top; if (!(h > 0)) return;
  r.el.style.setProperty('--mh', h + 'px'); r.el.classList.add('pre'); const f = () => { if (R === r && r.el.classList.contains('pre')) close(); }; m.addEventListener('click', f, true); r.off.push(() => m.removeEventListener('click', f, true)); }
function close() { if (!R) return; humOff(); const r = R; try { if (r.bgmNow !== undefined) r.bgm0 ? window.GymBGM?.play(r.bgm0) : window.GymBGM?.stop(.5); } catch (e) {} R = null; cancelAnimationFrame(r.raf); r.off.forEach(f => f()); r.el.remove(); r.done(); }

// ---------- 그림 ----------
function spr(sp, sex) { const k = sp + ':' + (sex || ''); if (R.SPR[k]) return Promise.resolve(R.SPR[k]);
  return (GA.pmdMx || GA.pmd)(sp, sex).then(D => new Promise(ok => { const im = new Image(); im.onload = im.onerror = () => ok(R.SPR[k] = { D, im }); im.src = D.P ? D.P.i : D.img; })).catch(() => (R.SPR[k] = { D: {}, im: null })); }
const sprOf = e => (e.msp && R.SPR[e.msp]) || R.SPR[e.sp + ':' + (e.sex || '')] || R.SPR[e.sp + ':'];
/* 경완 2026-11-16 '우리 필드용 메가 폼 그림 있는데 다 받아줘': SpriteCollab 에 올라온 메가 폼 42종 (tools/mkpmdmega.py → gym/img/yact/mg/<번호>.json, fm 과 같은 모양). 마지막 대장이 메가진화하면 이 그림으로 바뀐다 (megaDone 의 o.msp) */
const MEGA_SPR = new Set([6, 65, 80, 94, 115, 142, 150, 208, 227, 229, 248, 254, 282, 302, 303, 308, 310, 319, 323, 334, 354, 358, 359, 362, 380, 381, 384, 428, 448, 475, 491, 530, 560, 604, 670, 691, 701, 718, 719, 780, 807, 978]);
function megaSpr(sp) { const k = 'M' + sp + ':', r = R; if (!MEGA_SPR.has(sp) || r.SPR[k]) return; r.SPR[k] = { D: {}, im: null };
  fetch(`gym/img/yact/mg/${sp}.json?1`).then(x => x.ok ? x.json() : null).then(P => { if (!P || R !== r) return; const im = new Image(); im.onload = () => { if (R === r) r.SPR[k] = { D: { P, s: r.SPR[sp + ':']?.D?.s || 2 }, im }; }; im.src = P.i; }).catch(() => {}); }
// 맞는 순간 하얗게 번쩍이는 그림 (캔버스 filter 는 아이폰에서 안 먹어서, 그림을 흰색으로 칠한 사본을 한 번 만들어 둔다)
function whiteOf(S2) { if (S2.wh !== undefined) return S2.wh; S2.wh = null;
  try { const im = S2.im; if (im?.width) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); S2.wh = c; } } catch (e) {}
  return S2.wh; }
async function resize() {
  const r = R, W = r.host.clientWidth || innerWidth, H = r.host.clientHeight || innerHeight, DPR = Math.min(2, window.devicePixelRatio || 1), cv = r.q('canvas');
  Object.assign(r, { W, H, DPR }); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px'; r.g = cv.getContext('2d');
  Object.assign(r.Y, { pond: { x0: 16, y0: H * .74, x1: W * .54, y1: H - 16 } }); Object.assign(r.A, { y0: 132, y1: Math.round(H * .74) - 12, x0: 16, x1: W - 16 });   /* 경완 2026-11-14 '수영장 윗쪽 라인으로 오른쪽 부분 막아 줘 (버튼에 가려 포켓몬이 안 보임)': 수영장 윗줄 아래로는 아무도 못 내려감, 오른쪽엔 나무 울타리(drawFence) */
  try { const s = await window.GymManage?.yardShot?.(Math.ceil(W / 32), Math.ceil(H / 32), 1); if (s && R === r) { const im = new Image(); await new Promise(ok => { im.onload = im.onerror = ok; im.src = s.url; }); r.BG = im; } } catch (e) { console.error(e); }
}
const inPond = (x, y, m = 10) => { const P = R.Y.pond; return x > P.x0 - m && x < P.x1 + m && y > P.y0 - m && y < P.y1 + m; };
function keepIn(e) { const A = R.A; e.x = Math.max(A.x0, Math.min(A.x1, e.x)); e.y = Math.max(A.y0, Math.min(A.y1, e.y));
  if (inPond(e.x, e.y)) { const P = R.Y.pond, dx = [e.x - (P.x0 - 10), (P.x1 + 10) - e.x], dy = e.y - (P.y0 - 10), m = Math.min(dx[0], dx[1], dy); if (m === dy) e.y = P.y0 - 10; else if (m === dx[0]) e.x = P.x0 - 10; else e.x = P.x1 + 10; } }
const hudPt = sel => { const el = R.q(sel), b = R.el.getBoundingClientRect(), r = el?.getBoundingClientRect(); return r && r.width ? { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 } : { x: 40, y: 60 }; };

// ---------- 소리·진동 (게임 효과음 길: 볼륨·음소거 설정 그대로, 진동 = 게임 공통 haptic) ----------
const snd = (n, gv = .05, at = 0) => { try { R?.kit?.snd(n, at, gv); } catch (e) {} };
/* 경완 2026-11-14 '게임에 bgm 하고 효과음 다 입혀, 볼 던지고 터지는 건 본가 효과음': 본가(플래티넘) 효과음 = 체육관 소리 엔진 GymBGM.se('DP_…'), 곡 = GymBGM.play.
   se(이름, 최소 간격 초, 옵션): 같은 소리가 한꺼번에 겹치면 시끄러워서 간격 안엔 한 번만. mvSe: 기술마다 본가 배틀 연출 대본(gym/mvfx.json)의 소리를 그대로. */
/* v26.40 경완 '앱 잠깐 내렸다가 왔는데 특훈 효과음이 안 나는 오류': SE_T(소리별 마지막 시각)가 특훈을 닫아도 남아, 다시 열면(R.RT 가 0 부터) 지난번 한 시간만큼 본가 효과음이 전부 막혔다 → 지금 시각보다 뒤인 옛 기록은 무시 */
const SE_T = {}; const se = (n, gap = .07, o) => { if (!R) return; const l = SE_T[n]; if (l != null && l <= R.RT && R.RT - l < gap) return; SE_T[n] = R.RT; try { window.GymBGM?.se('DP_' + n, o); } catch (e) {} };
const bgm = n => { if (!R || R.bgmNow === n) return; R.bgmNow = n; try { if (!n) window.GymBGM?.stop(.5); else Promise.resolve(window.GymBGM?.play(n)).then(() => setTimeout(() => { if (R && R.bgmNow === n) try { window.GymBGM?.duck(BGM_K, .4); } catch (e) {} }, 700)); } catch (e) {} };
const BGM_K = 1.8;   /* 경완 2026-11-14 'bgm 음량 더 키워야': 효과음이 많이 겹쳐 곡이 묻혀서 이 화면에서만 곡을 1.8배로 (GymBGM.duck = 지금 곡 크기 배율) */
let MVFX = null; const mvSe = (id, gap = .3) => { const sc = MVFX?.[id]?.[1]; if (!sc) return false; const L = []; for (const e of sc) if (e[0] === 's' && !L.some(x => x[2] === e[2]) && L.length < 2) L.push(e); if (!L.length) return false; const t0 = L[0][1];
  for (const e of L) { const d = Math.min(.4, (e[1] - t0) / 30); if (d > 0) setTimeout(() => se(e[2], gap), d * 1000); else se(e[2], gap); } return true; };
const SE_PRE = ['W092', 'NAGERU', 'BOWA2', 'KOUKA_M', 'KOUKA_H', 'KOUKA_L', 'POKE_DEAD', 'HINSI', 'DECIDE', 'SELECT', 'KAIFUKU', 'KIRAKIRA2', 'KIRAN', 'KON2', 'DODON', 'PINPON', 'EXPMAX', 'WIN_OPEN', 'HURU', 'KATI', 'REGI', 'GETTING', 'PIRORIRO', 'SUIKOMU', 'W153', 'W120', 'W014', 'KON', 'SLIDEIN', 'VSDEMO04', 'W053'];
// 한꺼번에 여러 번 맞히면 진동이 뭉개지니, 짧은 사이엔 더 센 것만 다시 울린다
function buzz(n) { const r = R; if (!r) return; if (r.RT - r.hapT < .06 && n <= r.hapN) return; r.hapT = r.RT; r.hapN = n; try { GA.haptic?.(n); } catch (e) {} }
const rumble = (n, gap = 70, lv = 2) => { for (let i = 0; i < n; i++) setTimeout(() => { if (R) { R.hapN = -1; buzz(lv); } }, i * gap); };

// ---------- 손맛: 멈칫(히트스톱)·느린 화면·흔들림·밀림·확대 ----------
// 멈칫은 1초에 합쳐 0.3초까지만 (연달아 맞혀도 화면이 굳지 않게)
const stop = s => { const a = Math.min(s, R.HSB ?? .3) - R.HS; if (a <= 0) return; R.HS += a; R.HSB = (R.HSB ?? .3) - a; };
const slow = (s, k) => { if (s >= R.SLOW) { R.SLOW = s; R.SLOWK = k; } };
const shake = v => { R.TR = Math.min(1, R.TR + v); };
const kick = (dx, dy, v) => { R.KX += dx * v; R.KY += dy * v; };
const zoom = v => { R.ZM = Math.max(R.ZM, v); };
const flash = (v, c = '255,255,230') => { if (v >= R.FLASH) { R.FLASH = v; R.FLC = c; } };
const after = (d, fn) => R.Q.push({ t: R.T + d, fn, G: R.G });
const squash = (e, v) => { e.sq = v; e.sqv = 0; };
function spring(e, dt) { if (!e.sq && !e.sqv) return; e.sqv = (e.sqv || 0) + (-520 * e.sq - 20 * (e.sqv || 0)) * dt; e.sq += e.sqv * dt; if (Math.abs(e.sq) < .004 && Math.abs(e.sqv) < .05) e.sq = e.sqv = 0; }

// ---------- 능력치·데미지 (체육관 statsOf = 본가 공식) ----------
// 무게 등급(위력 ≤50 가벼움, ≤80 보통, ≤110 묵직, 그 위 강타)이 멈칫·넉백·흔들림·숫자 크기를 한꺼번에 정한다
const WT = { stop: [.05, .075, .11, .15], kb: [150, 230, 320, 420], shake: [.1, .16, .26, .36], num: [16, 19, 23, 27], wind: [0, .07, .13, .2] };
const wOf = pw => pw <= 50 ? 0 : pw <= 80 ? 1 : pw <= 110 ? 2 : 3;
function dmg(at, df, t, c, pw, wpw = pw) {
  const A2 = c === 1 ? at.st[1] : at.st[3], D2 = c === 1 ? df.st[2] : df.st[4];
  const e = eff(t, tysOf(df.sp)), stab = tysOf(at.sp).includes(t) ? 1.5 : 1, wx = at.mine && R.G?.wx, bf = !wx ? 1 : wx.k === 'rain' ? (t === 11 ? 1.5 : t === 10 ? .5 : 1) : wx.k === 'sun' ? (t === 10 ? 1.5 : t === 11 ? .5 : 1) : 1, pwr = !at.mine || !R.G ? 1 : (at.buff > 0 ? 1.25 : 1) * (R.G.fields.some(f => AMP_F[f.k] === t) ? 1.3 : 1), crit = !!at.mine && e > 0 && (at.crit > 0 || Math.random() < 1 / 16);
  const base = Math.floor(Math.floor(Math.floor(2 * at.lv / 5 + 2) * pw * A2 / D2) / 50) + 2;
  return { n: Math.max(1, Math.floor(base * stab * e * bf * pwr * (crit ? 1.5 : 1) * (.85 + Math.random() * .15))), e, crit, w: wOf(wpw) };
}

// ---------- 포켓몬 그리기 (필드 PMD 그림: 칸 = a[0..6], 기준점 a[4]·a[5]+fy) ----------
function frameOf(e, T) {
  const S2 = sprOf(e); if (!S2?.im) return null; const P = S2.D.P, k = e.k || 1;
  if (!P) { const h = 52 * k; return { S2, plain: true, h, w: h * (S2.im.width / S2.im.height || 1), flip: e.face > 0, fw: 30 * k, fx: 0 }; }
  let an = P.a[e.anim] ? e.anim : 'Idle'; if (an === 'Walk' && e.up && P.a.WalkUp) an = 'WalkUp'; const a = P.a[an] || P.a.Idle || Object.values(P.a)[0]; if (!a) return null;
  const durs = a[6], tot = durs.reduce((x, y) => x + y, 0); let t = (T - e.at) * 60; if (e.once) t = Math.min(t, tot - 1); else t %= tot;
  let f = 0; for (let acc = 0; f < durs.length; f++) { acc += durs[f]; if (t < acc) break; } f = Math.min(f, durs.length - 1);
  const s = (S2.D.s || 2) * k;
  return { S2, P, a, f, s, flip: e.face > 0 && an !== 'WalkUp', h: (a[5] + (P.fy || 0)) * s, fw: Math.max(10, (P.fw || 14) * s * 1.05), fx: (P.fx || 0) * s };
}
// 한 칸 찍기. o: a 투명도, wh 흰 번쩍(0~1), sx·sy 찌그러짐, rot 돌기, hue 이로치
function blit(F, x, y, o = {}) {
  const g = R.g, { S2, flip } = F, sx = o.sx || 1, sy = o.sy || 1;
  const put = im => { if (F.plain) g.drawImage(im, -F.w / 2, -F.h, F.w, F.h); else { const { P, a, f, s } = F; g.drawImage(im, f * (a[1] + (P.G || 0)), a[0], a[1], a[2], -a[4] * s, (-a[5] - (P.fy || 0)) * s, a[1] * s, a[2] * s); } };
  g.save(); g.translate(Math.round(x), Math.round(y));
  if (o.rot) { g.translate(0, -F.h * .45); g.rotate(o.rot); g.translate(0, F.h * .45); }
  g.scale((flip ? -1 : 1) * sx, sy);
  if (o.hue) g.filter = `hue-rotate(${o.hue}deg)`;
  g.globalAlpha = o.a ?? 1; put(S2.im);
  if (o.wh > 0) { const w = whiteOf(S2); if (w) { g.filter = 'none'; g.globalAlpha = (o.a ?? 1) * Math.min(1, o.wh); put(w); } }
  g.restore();
}
function drawMon(e) {
  if (e.ball) return drawBall(e);
  const g = R.g, T = R.T, F = frameOf(e, T); if (!F) return;
  const lift = (GA.lift?.(e.sp) || 0) * (e.mine ? 1 : .6), z = e.z || 0, dead = e.hp <= 0 && e.dead != null && !e.mine;
  // 그림자: 높이 뜰수록 작고 옅게
  { const k = 1 / (1 + z / 90); g.fillStyle = `rgba(20,40,10,${(lift > 8 ? .15 : .25) * (.5 + k * .5)})`; g.beginPath(); g.ellipse(e.x + F.fx * (F.flip ? -1 : 1), e.y, F.fw / 2 * k, Math.max(3, F.fw * .15) * k, 0, 0, 7); g.fill(); }
  // 발밑 기운: 변화 기술(초록), 저스트 회피 뒤 급소 확정(금빛)
  if (e.mine && e.hp > 0 && (e.buff > 0 || e.crit > 0)) { const c = e.crit > 0 ? '255,216,74' : '160,240,130', p = (R.RT * 1.6) % 1; g.strokeStyle = `rgba(${c},${.75 * (1 - p)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y, 12 + p * 16, (12 + p * 16) * .4, 0, 0, 7); g.stroke(); g.strokeStyle = `rgba(${c},.55)`; g.lineWidth = 2; g.beginPath(); g.ellipse(e.x, e.y, 15, 6, 0, 0, 7); g.stroke(); }
  let ox = 0, oy = 0, wh = e.flash > 0 ? Math.min(1, e.flash * 9) : 0, al = 1;
  if (e.warn > 0 && !e.shoot) { const p = 1 - e.warn / (e.warn0 || .5); ox = -Math.cos(e.wa || 0) * 7 * p + Math.sin(R.RT * 70) * 1.2 * p; oy = -Math.sin(e.wa || 0) * 5 * p; if (e.warn < .1) wh = Math.max(wh, .8); }
  if (e.enter > 0 && !e.drop) { al = 1; wh = Math.max(wh, Math.min(1, e.enter / BALL_OUT * 1.4)); }
  if (e.mgT > 0) { const p = 1 - e.mgT / 1.8; wh = Math.min(1, p * 2.5); g.fillStyle = `rgba(255,255,255,${.25 + .3 * p})`; g.beginPath(); g.arc(e.x, e.y - 26, 30 + p * 34 + Math.sin(R.RT * 40) * 3, 0, 7); g.fill(); MEGA_C.forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = .7; g.lineWidth = 3; g.beginPath(); g.arc(e.x, e.y - 26, 70 * (1 - p) + 20 + i * 5, R.RT * 6 + i, R.RT * 6 + i + 1.6); g.stroke(); }); g.globalAlpha = 1; }
  else if (e.mega && e.hp > 0) { MEGA_C.forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = .75; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y, 34, 13, 0, R.RT * 3 + i * 1.047, R.RT * 3 + i * 1.047 + .8); g.stroke(); }); g.globalAlpha = 1; }
  if (e.inv > 0 && e.mine && e.hp > 0 && !e.roll && !e.hide && !e.dash && Math.floor(R.RT * 20) % 2) al = .45;
  if (e.fade != null) al = Math.max(0, e.fade);
  const sq = Math.max(-.45, Math.min(.45, e.sq || 0)), ms = e.mine ? (e.shrink > 0 ? .5 : e.buff > 0 ? 1.2 : 1) : 1;
  if (e.mine && e.clone > 0 && e.hp > 0) for (const sg of [-1, 1]) blit(F, e.x + sg * (22 + Math.sin(R.RT * 5) * 6), e.y - lift - z, { a: .4, sx: ms, sy: ms });
  blit(F, e.x + ox, e.y - (lift + z) * ms + oy, { a: al, wh, sx: (1 + sq) * ms, sy: (1 - sq) * ms, rot: dead ? e.rot : e.mine && e.roll > 0 ? (1 - e.roll / .36) * 6.283 * (e.rollF || 1) : 0, hue: e.mine && e.shiny ? (GA.shinyHue?.(e.sp) || 0) : 0 });
  if (e.mine && e.hp > 0 && (e.guard > 0 || e.prot > 0)) { const pr = e.prot > 0, pu = .5 + .5 * Math.sin(R.RT * (pr ? 14 : 6)), c = pr ? '122,240,160' : '140,200,255'; g.fillStyle = `rgba(${c},${pr ? .28 : .14})`; g.strokeStyle = `rgba(${c},${.6 + .3 * pu})`; g.lineWidth = pr ? 4 : 3; g.beginPath(); g.ellipse(e.x, e.y - 20 - lift, 26 + pu * 2, 30 + pu * 2, 0, 0, 7); g.fill(); g.stroke(); }
  if (!e.mine && e.hp > 0 && e.enter <= 0 && (e.weak > 0 || e.slowT > .7 || e.dot || e.dz > 0)) { const y = e.y - F.h - lift - 8; if (e.dz > 0) for (let i = 0; i < 3; i++) { const a = R.RT * 5 + i * 2.1; g.save(); g.translate(e.x + Math.cos(a) * 14, y + Math.sin(a) * 5); starPath(g, 5, 2); g.fillStyle = '#ffe27a'; g.fill(); g.restore(); }
    const tx = [e.weak > 0 ? '약해짐' : '', e.slowT > .7 ? '느림' : '', e.dot ? '독' : ''].filter(Boolean).join('·'); if (tx) { g.textAlign = 'center'; g.font = 'bold 9px Galmuri11'; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText(tx, e.x, y - 6); g.fillStyle = '#d8b0ff'; g.fillText(tx, e.x, y - 6); } }
  if (e.warn > 0) warnMark(e, F.h + lift);
}
function warnMark(e, h) { const g = R.g, p = 1 - e.warn / (e.warn0 || .5), s = 18 + Math.max(0, 1 - p * 5) * 14; g.font = `bold ${Math.round(s)}px Galmuri11`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#20202c'; g.strokeText('!', e.x, e.y - h - 8); g.fillStyle = e.warn < .15 ? '#fff' : '#ff4a3a'; g.fillText('!', e.x, e.y - h - 8); }
const setAnim = (e, a, once = false) => { if (e.anim === a && !once) return; e.anim = a; e.at = R.T; e.once = once; };
const hasAnim = (e, a) => !!sprOf(e)?.D?.P?.a?.[a];
const anyAnim = (e, ...L) => L.find(a => hasAnim(e, a)) || L[L.length - 1];
// 잔상: 지금 칸 그대로 남겼다가 옅어짐 (회피·돌진)
function ghost(e, d = .26) { const F = frameOf(e, R.T); if (F) R.GH.push({ F, x: e.x, y: e.y - (GA.lift?.(e.sp) || 0) - (e.z || 0), t0: R.T, d }); }

// ---------- 효과 (필드 pfxDraw 그대로) ----------
const PX = () => R.kit?.D;
const pfxDraw = (k, fr, x, y, f, o) => { try { R.kit.draw(R.g, k, fr, x, y, f, o || {}); } catch (e) {} };
const pLen = (k, ft) => (PX()?.s[k]?.[2] || 1) * ft / 60;
function fxOnce(k, ft, delay, x, y, f, o) { if (!PX()?.s[k]) return 0; const d = Math.max(.1, pLen(k, ft)); R.FX.push({ t0: R.T + delay, d, draw: t => pfxDraw(k, t * 60 / ft, x, y, f, o) }); return d; }
const fxAdd = (delay, d, draw) => R.FX.push({ t0: R.T + delay, d, draw });
// 숫자·글자: 튀어나왔다 가라앉고, 맞은 방향으로 조금 흘러감
const pop = (x, y, txt, col = '#fff', big = false, vx = 0, vy = 0) => { const p = { x: x + (typeof txt === 'number' ? (Math.random() - .5) * 14 : 0), y, txt, col, t0: R.RT, big, vx, vy }; R.POPS.push(p); return p; };
// 원본 효과가 없는 기술: 타입 색 동그라미·별
function burst(x, y, col, r0 = 8, r1 = 34) { fxAdd(0, .3, t => { const g = R.g, p = t / .3; g.globalAlpha = 1 - p; g.strokeStyle = col; g.lineWidth = 4 * (1 - p) + 1; g.beginPath(); g.arc(x, y, r0 + (r1 - r0) * p, 0, 7); g.stroke();
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + .3, r = r0 + (r1 - r0) * p * 1.2; g.fillStyle = '#fff'; g.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r * .8 - 2, 4, 4); } g.globalAlpha = 1; }); }
// 바닥에 퍼지는 고리 (충격파)
function ring(x, y, col, r0, r1, d = .3, w = 4, flat = .5, delay = 0) { fxAdd(delay, d, t => { const g = R.g, p = t / d, e = 1 - (1 - p) * (1 - p), r = r0 + (r1 - r0) * e; g.globalAlpha = 1 - p; g.strokeStyle = col; g.lineWidth = w * (1 - p) + 1; g.beginPath(); g.ellipse(x, y, r, r * flat, 0, 0, 7); g.stroke(); g.globalAlpha = 1; }); }
// 베는 궤적: 초승달이 휙 그어졌다 사라짐
function slash(x, y, ang, col, r = 36) { fxAdd(0, .17, t => { const g = R.g, p = t / .17, a1 = -1.15 + 2.3 * Math.min(1, p * 3.2); g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = 1 - p * p; g.lineCap = 'round';
  g.strokeStyle = col; g.lineWidth = 11 * (1 - p) + 1; g.beginPath(); g.arc(-r * .35, 0, r, -1.15, a1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 5 * (1 - p) + 1; g.beginPath(); g.arc(-r * .35, 0, r, -1.15 + p * .6, a1); g.stroke(); g.restore(); }); }
// 알갱이: sq 네모, line 줄기(속도 방향), star 별, coin 동전, xp 경험치 구슬. home 이 있으면 잠깐 튀었다가 그 자리로 빨려 들어감
function part(o) { R.PT.push(Object.assign({ kind: 'sq', t0: R.T, life: .4, vx: 0, vy: 0, ay: 0, dr: 0, sz: 3, col: '#fff' }, o)); }
function sparks(x, y, dx, dy, col, n = 6, sp = 280) { const a0 = Math.atan2(dy, dx); for (let i = 0; i < n; i++) { const a = a0 + (Math.random() - .5) * 1.7, v = sp * (.45 + Math.random() * .85); part({ kind: 'line', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8, dr: 6, life: .14 + Math.random() * .14, col: i % 2 ? col : '#fff', sz: 2 + (i % 2) }); } }
function dust(x, y, n = 3, sp = 46, col = '#e9dcc0') { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (.4 + Math.random() * .8); part({ x: x + Math.cos(a) * 4, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .35 - 14, dr: 4, life: .3 + Math.random() * .2, col, sz: 3 + Math.floor(Math.random() * 3), grow: 1 }); } }
function stars(x, y, n, col = '#ffe27a', sp = 190) { for (let i = 0; i < n; i++) { const a = i / n * 6.28 + Math.random() * .5, v = sp * (.6 + Math.random() * .6); part({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7 - 60, ay: 420, dr: 2.5, life: .45 + Math.random() * .25, col, sz: 2 }); } }
function fly(kind, x, y, home, on, col) { const a = Math.random() * 6.28, v = 90 + Math.random() * 110; part({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7 - 50, dr: 5, life: 4, home, hold: .22 + Math.random() * .16, on, col: col || '#ffc830', sz: 3 }); }

// ---------- 판 만들기 ----------
const EVY = () => GB()?.EVY || {};
const spOff = sp => !!GA.SP_OFF?.has(+sp);   /* 경완 2026-11-16 '특훈에 나오는 몬스터들 작업실에서 꺼놓은 몬스터들은 안 나오게' (체육관 도전자 gym.js spOff 와 같은 목록) */
function foePool(stat) {   // 고른 능력치 노력치만 주는 종 (gym/evy.json): 1 = 잡몹, 2~3 = 대장
  const E = EVY(), small = [], big = [];
  for (const k in E) { const sp = +k, y = E[k], s = SP[sp]; if (!s || sp > 1025 || s.leg || s.my || spOff(sp) || !(+y[stat])) continue; const tot = [...y].reduce((a, c) => a + (+c || 0), 0); if (tot !== +y[stat]) continue; (+y[stat] >= 2 ? big : small).push(sp); }
  const pick = (L, n) => { const o = []; L = L.slice(); while (o.length < n && L.length) o.push(L.splice(Math.floor(Math.random() * L.length), 1)[0]); return o; };
  const sm = pick(small, 6); for (let i = 0; sm.length < 6; i++) sm.push(sm[i] || 19);
  const bg = pick(big, 3); for (let i = 0; bg.length < 3; i++) bg.push(bg[i] || sm[i] || 20);
  /* 경완 2026-11-16 '마지막 대장은 항상 메가진화하는 애들로만': 메가스톤이 있는 종(GymBattle.MEGA_ST) 가운데 고른 능력치 노력치만 주는 종 → 없으면 그 능력치를 주는 종 → 없으면 아무 메가 종 */
  { const MS0 = [...new Set(Object.values(GB()?.MEGA_ST || {}).map(v => v[0]))].filter(sp => SP[sp] && !SP[sp].leg && !SP[sp].my && !spOff(sp)), MS1 = MS0.filter(sp => MEGA_SPR.has(sp)), MS = MS1.length ? MS1 : MS0 /* 메가 폼 필드 그림이 있는 종만 */, only = MS.filter(sp => big.includes(sp) || small.includes(sp)), any = MS.filter(sp => +(E[sp] || '')[stat]), L = only.length ? only : any.length ? any : MS; if (L.length) bg[2] = L[Math.floor(Math.random() * L.length)]; }
  return { sm, big: bg };
}
function moveList(P) {   // 내 포켓몬이 지금 쓰는 기술 4개 (체육관 기술 데이터)
  const B = GB(), m = B.gm(P); return (m.mv || []).map(id => B.mvOf(id)).filter(Boolean).slice(0, 4).map(d => {
    const [id, name, t, cat, pw0] = d, Rr = PX()?.r[name], c = cat === 0 ? 1 : cat === 1 ? 2 : 0, pw = c ? (pw0 || 40) : 0;
    let k = Rr?.k; k = !c ? 'Self' : k === 'Offset' ? 'Attack' : k === 'Throw' || k === 'WaveMotion' ? 'Projectile' : k || (c === 1 ? 'Attack' : 'Projectile');
    return { id, name, t: t || 1, c, pw, k, Rr, A: { hide: !!c && RX.hide.test(id), vortex: !!c && RX.vortex.test(id), drain: !!c && RX.drain.test(id), multi: RX.multi.test(id), beam: RX.beam.test(id), spot: RX.spot.test(id), st: c ? '' : stOf(id) } }; });
}
/* 경완 2026-11-16 '기술 슬롯 기술 이름 왼쪽에는 형태 딱지 붙여줘': 특훈에서 그 기술이 나가는 모양 (use() 의 kind 고르기와 같은 셈) */
function mvForm(v) { if (!v.c) return '변화'; if (v.A.hide) return '잠복'; const e = r => (v.Rr?.e || []).some(x => x[0] === r); let kind = v.k === 'Attack' ? 'melee' : v.k === 'Projectile' ? (e('col') ? 'col' : e('stream') ? 'stream' : 'proj') : 'area';
  if (v.A.vortex) kind = 'vortex'; else if (kind === 'proj' && !e('proj')) kind = v.A.beam ? 'stream' : v.A.spot || (v.Rr && !v.A.multi) ? 'col' : 'proj'; return { melee: '근접', proj: v.A.multi ? '연발' : '탄', stream: '빔', col: '낙하', area: v.k === 'Dash' ? '돌진' : '범위', vortex: '장판' }[kind]; }
function mineOf(o) {   // 고른 포켓몬 → 판에서 쓸 값 (읽기만)
  const B = GB(), P = o.P, m = B.gm(P), lv = m.lv || 1, eg = B.egFocus?.(P) ?? -1, er = eg >= 0 ? B.egList(P).find(r => r.i === eg) : null;
  // 번뜩임으로 깨닫는 중인 기술은 아직 모르는 기술이라 이름은 안 쓰고 타입만 (게임의 ??? 칸과 같게)
  return { P, lv, st: B.statsOf(P.sp, lv, P.iv || [], m.nat, m.ev || []), mv: moveList(P), eg: er ? { i: eg, t: er.x[2], p: (m.egP || [])[eg] | 0 } : null, xp: m.xp | 0, fr: P.fr | 0, evRoom: Math.max(0, Math.min(B.EV_ONE - ((B.evArr(m)[R.stat]) | 0), B.EV_MAX - B.evSumOf(m) - (m.evp | 0))) };
}
const nmOf = P => P.nm || nmSp(P.sp);
function newGame() {
  const o = R.mons[R.pick], M = mineOf(o), P = o.P, W = R.W, H = R.H;
  const me = { sp: P.sp, sex: P.sex, shiny: !!P.shiny, lv: M.lv, st: M.st, mine: true, x: W / 2, y: H * .55, face: -1, anim: 'Idle', at: 0, inv: 0, cd: {}, cdMax: {}, dcd: 0, flash: 0, buff: 0, shrink: 0, clone: 0, haste: 0, guard: 0, prot: 0, crit: 0, roll: 0, kx: 0, ky: 0, sq: 0, sqv: 0, z: 0, busy: 0, stepT: 0, hide: null };
  me.mhp = me.hp = Math.round(me.st[0] * 2.8);
  Object.assign(R, { HS: 0, SLOW: 0, TR: 0, KX: 0, KY: 0, ZM: 0, FLASH: 0, VIG: 0, BUF: null, HELD: {} }); R.Q.length = 0; R.PT.length = 0; R.GH.length = 0; R.SH = null;
  R.G = { o, M, me, stat: R.stat, pool: R.pool || foePool(R.stat), mobs: [], shots: [], drops: [], wave: 0, ko: 0, gold: 0, goldShown: 0, exp: 0, ev: 0, evRaw: 0, shard: 0, fainted: false, time: 0, start: R.T, over: false, egg0: M.eg?.p ?? 0, egg: M.eg?.p ?? 0, eggShown: M.eg?.p ?? 0,
    combo: 0, comboT: 0, best: 0, just: 0, pend: 0, clearT: 0, sec: 0, queue: [], zones: [], waves: [], blasts: [], cracks: [], crT: 4, traps: [], fields: [], wx: null, qT: 0, bossPend: 0, items: [], itT: 9, mag: 0, hits: 0, egT: -9,
    /* 경완 2026-11-14 '시간 대비 받는 경험치 밸런스도 맞춰줘': 3분 반에 3레벨은 체육관 배틀의 열 배쯤 → 끝까지 깨면 체육관 배틀 두 판 값 (같은 레벨 상대 XP_KO 마리 × 체육관 등급 배율 XP_GM, gym.js XP_M 과 같은 값). 낮은 레벨에서도 3레벨은 안 넘음 */
    xpB: Math.min(Math.max(0, GB().xpAt(GB().growth(P.sp), Math.min(GB().LV_MAX, M.lv + 3)) - GB().xpAt(GB().growth(P.sp), M.lv)), Math.round(GB().xpFor({ lv: M.lv }, M.lv) * XP_KO * XP_GM[Math.max(0, Math.min(XP_GM.length - 1, GA.S?.gym?.gmax | 0))])) };
  [...R.G.pool.sm, ...R.G.pool.big].forEach(sp => spr(sp)); R.pool = null; M.mv.forEach(v => { me.cd[v.name] = 0; });
  buildButtons(); hud(); cbUi();
  /* 경완 2026-11-14 '겜 시작할 때 카운트 다운': 3·2·1·시작! 뒤에 첫 스테이지 (그동안 움직일 수는 있음) */
  { const G0 = R.G; G0.waiting = true; ['3', '2', '1', '시작!'].forEach((t, i) => setTimeout(() => { if (!R || R.G !== G0 || G0.over || R.PZ) return; banner(i < 3 ? `<b>${t}</b>` : `<b style="font-size:60px">${t}</b>`, 'stg'); buzz(i < 3 ? 0 : 1); se(i < 3 ? 'KON' : 'KON2', .05, { gain: 1.5 }); }, i * 750)); { const go = () => { if (!R || R.G !== G0 || G0.over) return; if (R.PZ) { setTimeout(go, 200); return; } G0.waiting = false; nextWave(); }; setTimeout(go, 3 * 750 + 650); } }
}
function spawn(sp, boss, ox = 0, bi = 0) {
  const G = R.G, A = R.A, W = R.W, H = R.H, SG = STAGES[G.wave - 1] || STAGES[0], lv = Math.max(2, boss === 2 ? G.M.lv + 5 : boss ? G.M.lv + SG.lv + 4 : G.M.lv + SG.lv - Math.floor(Math.random() * 2)), side = Math.floor(Math.random() * 3);
  let x = side === 0 ? A.x0 + 10 : side === 1 ? A.x1 - 10 : W * (.3 + Math.random() * .5), y = side === 2 ? A.y0 + 4 : A.y0 + 20 + Math.random() * (H * .45);
  if (boss) { x = W / 2 + ox; y = Math.max(A.y0 + 60, Math.min(H * .5, G.me.y - 120 < A.y0 + 60 ? G.me.y + 120 : G.me.y - 120)); }   // 대장은 한가운데로 하늘에서 떨어진다
  const e = { sp, lv, st: GB().statsOf(sp, lv, [10, 10, 10, 10, 10, 10], '', []), x, y, face: x < W / 2 ? 1 : -1, anim: 'Idle', at: R.T, boss, k: boss === 2 ? 1.8 : boss ? 1.5 : 1 /* 경완 2026-11-16 대장 크기 'A 괜찮고': 중간 대장 1.2 → 1.5배, 마지막 대장 1.4 → 1.8배 (메가진화 뒤 ×1.25), 맞는 범위는 bR 이 크기를 따라감 */, cd: .5 + Math.random() * .8, warn: 0, flash: 0, z: 0, enter: boss ? .7 : .35, drop: !!boss, sq: 0, sqv: 0, kx: 0, ky: 0, atkN: 0, bi, brk: 0, brkMax: 100, side: Math.random() < .5 ? 1 : -1, sideT: Math.random() * 2 };
  const b = SP[sp]?.bs || [60, 60, 60, 60, 60, 60]; e.ranged = b[3] > b[1] + 10; if (boss === 2) megaSpr(sp);
  if (!boss) { const ag = tysOf(sp).some(t => t === 2 || t === 16 || t === 17) ? .5 : .22, r = Math.random(); e.temp = r < ag ? 'aggr' : r < ag + .18 ? 'timid' : ''; e.rush = !e.ranged && b[5] >= 70; }   /* 성격: 공격형(격투·드래곤·악은 절반) · 겁쟁이 · 보통, 빠른 근접형은 치고 빠진다 */ e.spd = 48 + b[5] * .62;
  e.mhp = e.hp = e.hpLag = Math.round(e.st[0] * (boss === 2 ? 8.5 : boss ? 4.4 : 2.7));
  keepIn(e); G.mobs.push(e);
  if (boss) e.z = 420; else ballIn(e, side);
}
/* 경완 2026-11-14 '상대 포켓몬이 나올 때 몬스터볼이 날아와서 터지면서 나오는 느낌': 잡몹은 화면 밖에서 몬스터볼이 포물선으로 날아와 땅에 닿으면 하얗게 터지고 그 자리에서 흰 실루엣으로 커지며 나온다.
   볼 그림 = 본가 도구 그림(gym/img/item/pokeball.png), 터지는 빛·조각은 코드로 그림, 소리 = 배틀에 쓰는 던지기(NAGERU)·볼 열림(BOWA2). 대장은 그대로 하늘에서 떨어진다. */
const BALL_FLY = .46, BALL_OUT = .26; let BALL_IM = null, BALL_SE = [-9, -9];
function ballSe(i, nm) { se(nm, .09); }
function ballIn(e, side) { const W = R.W, A = R.A; if (!BALL_IM) { BALL_IM = new Image(); BALL_IM.src = 'gym/img/item/pokeball.png'; }
  const fx = side === 0 ? -30 : side === 1 ? W + 30 : e.x + (e.x < W / 2 ? -1 : 1) * (90 + Math.random() * 70), fy = side === 2 ? A.y0 - 70 : e.y - 60 - Math.random() * 40;
  e.ball = { x0: fx, y0: fy, t: 0, h: 70 + Math.random() * 30, rot: (fx < e.x ? 1 : -1) * (14 + Math.random() * 6) }; e.enter = BALL_FLY + BALL_OUT; ballSe(0, 'NAGERU'); }
function ballPop(e) { const x = e.x, y = e.y - 12; e.ball = null; e.pop = R.T; squash(e, -.5); ballSe(1, 'BOWA2'); buzz(0); shake(.12);
  ring(x, y, '#fff', 6, 52, .3, 6, .8); ring(x, e.y, '#ff6a5a', 4, 40, .34, 4, .45, .04); stars(x, y, 6, '#fff', 210); dust(e.x, e.y, 5, 80);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + Math.random() * .4, v = 150 + Math.random() * 90; part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .75 - 40, ay: 380, dr: 3, life: .32 + Math.random() * .16, col: i % 2 ? '#ff5a4a' : '#fff', sz: 3 }); }
  fxAdd(0, .22, t => { const g = R.g, p = t / .22; g.save(); g.translate(x, y); g.globalAlpha = (1 - p) * .9; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 10 + p * 26, 0, 7); g.fill(); g.rotate(.4); for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-3 * (1 - p), 8); g.lineTo(0, 30 + p * 34); g.lineTo(3 * (1 - p), 8); g.closePath(); g.fill(); } g.restore(); g.globalAlpha = 1; }); }
function drawBall(e) { const g = R.g, b = e.ball, p = Math.min(1, b.t / BALL_FLY), x = b.x0 + (e.x - b.x0) * p, gy = b.y0 + (e.y - b.y0) * p, y = gy - Math.sin(p * Math.PI) * b.h - 9 * (1 - p) - 9;
  g.fillStyle = `rgba(20,40,10,${.12 + .14 * p})`; g.beginPath(); g.ellipse(x, e.y + (gy - e.y) * .4, 5 + 4 * p, 2 + 1.5 * p, 0, 0, 7); g.fill();
  for (let i = 1; i <= 3; i++) { const q = Math.max(0, p - i * .05), tx = b.x0 + (e.x - b.x0) * q, ty = b.y0 + (e.y - b.y0) * q - Math.sin(q * Math.PI) * b.h - 9 * (1 - q) - 9; g.fillStyle = `rgba(255,255,255,${.3 - i * .08})`; g.beginPath(); g.arc(tx, ty, 7 - i, 0, 7); g.fill(); }
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(b.t * b.rot); if (BALL_IM?.complete && BALL_IM.naturalWidth) g.drawImage(BALL_IM, -15, -15, 30, 30); else { g.fillStyle = '#e04848'; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); } g.restore(); }
function bossLand(o) {   // 대장 착지: 쿵 — 화면이 크게 흔들리고 먼지·충격파
  o.z = 0; o.drop = false; squash(o, .42); stop(.07); shake(.85); zoom(.05); rumble(3, 60); se('DODON'); snd('DUN_Stomp', .09); snd('DUN_Rock_Smash', .05, .05);
  ring(o.x, o.y, '#fff', 14, 120, .45, 7); ring(o.x, o.y, '#e9dcc0', 8, 80, .35, 5, .5, .06); dust(o.x, o.y, 16, 190); stars(o.x, o.y - 10, 6, '#fff');
  const me = R.G.me, d = Math.hypot(me.x - o.x, me.y - o.y) || 1; if (d < 90 && me.hp > 0) { me.kx += (me.x - o.x) / d * 260; me.ky += (me.y - o.y) / d * 180; }   // 착지 바람에 밀려남 (피해 없음)
}
/* 경완 2026-11-14 '보스 패턴이 점프해서 착지밖에 없다': 원래 내려찍기·돌진·탄 쏘기가 있었는데 고르는 조건 때문에 거의 내려찍기만 나왔다. 대장마다 패턴 묶음을 두고 직전과 다른 것을 고른다.
   slam 내려찍기 · rush 세 번 연속 돌진 · ring 둥글게 퍼지는 탄막(두 겹) · fan 부채꼴 다섯 발 두 번 · wave 퍼져 나가는 충격파(대쉬로 뚫기) · rain 예고 동그라미 여러 곳 폭격. HP 40% 아래면 분노(더 자주·더 많이), 마지막 대장은 HP 55% 에 졸개 셋을 부른다. */
const BOSS_PAT = [['slam', 'rush', 'ring'], ['slam', 'fan', 'wave'], ['slam', 'rush', 'ring', 'fan', 'wave', 'rain']];
/* 경완 2026-11-14 '외부 코드에 있는데 반영 안 한 것': 레조넌스 레이드 보스의 브레이크 게이지를 구조만 참고. 대장을 때리면 게이지가 차고(상성이 좋을수록·패턴 중에 맞힐수록 빨리), 가득 차면 그로기 4초(패턴 끊김·받는 피해 1.5배).
   풀리면 3초 동안 안 차고 다음 게이지는 1.3배. 잡몹은 성격(공격형·겁쟁이)과 움직임(비스듬히 접근·치고 빠지기·좌우로 돌며 쏘기)을 종마다 다르게. */
const GROGGY = 4;
/* 경완 2026-11-14 '메가진화 페이즈 전환, 필드 깨지는 바닥 좋고': 마지막 대장은 HP 절반에서 페이즈 2 — 1.8초 동안 빛에 싸여(무적) 커지고 HP 15% 회복·능력치 1.15배·게이지 초기화·졸개 셋·곡 바뀜, 그 뒤 패턴이 더 빠르고 많다.
   메가진화하는 종의 필드 그림은 없어서(PMD 그림에 메가 폼 없음) 같은 그림을 키우고 무지개 기운을 두른다.
   깨지는 바닥: 3스테이지부터 금 간 바닥이 생긴다. 누가 0.9초쯤 밟고 있거나 대장이 그 위로 내려찍으면 무너져서 위에 있던 모두가 피해+잠깐 멈춤(대장은 게이지도 크게 참), 7초 동안 잔해라 느려진다. */
const MEGA_C = ['#ff6a6a', '#ffb04a', '#ffe27a', '#8ff0a0', '#6ac8ff', '#c08aff'];
function megaPhase(o) { const G = R.G; G.mgSeen = 1; o.mega = 1; o.mgT = MEGA_T; o.act = o.slam = o.lunge = null; o.chain = null; o.warn = 0; o.z = 0; o.groggy = 0; o.dz = 0; o.brk = 0; o.brkLock = 0; o.stun = 0; setAnim(o, anyAnim(o, 'Charge', 'Idle'), true);
  G.shots = G.shots.filter(q => q.mine); G.waves = []; G.blasts = []; coinRain(o.x, o.y - 10, RAIN_P1); pop(o.x, o.y - 120, '1페이즈 돌파!', '#ffe27a', true); banner(`<small>페이즈 2</small>우두머리 ${nmSp(o.sp)} 메가진화!`, 'boss'); megaGather(o); bgm('champ'); slow(1, .35); flash(.25, '255,255,255'); zoom(.1); rumble(4, 110, 1); se('KON2', .3); se('KIRAKIRA2', .1, { gain: 1.6 }); }
function megaDone(o) { const G = R.G, me = G.me; if (R.SPR['M' + o.sp + ':']?.im) { o.msp = 'M' + o.sp + ':'; o.anim = 'Idle'; o.at = R.T; o.once = false; } o.k = (o.k || 1) * 1.25; o.hp = Math.min(o.mhp, o.hp + Math.round(o.mhp * .15)); o.hpLag = o.hp; o.st = o.st.map((v, i) => i ? Math.round(v * (i === 1 || i === 3 ? 1.35 : 1.15)) : v); o.spd *= 1.25; o.brkMax = 150; o.cd = .6; megaMark(o);   /* 경완 2026-11-16 '메가진화 하면 보스가 더 세지고 난이도도 어려워져야하는데 반영이 안되어 있는듯': 공격·특공 1.15 → 1.35배, 걸음 1.25배, 패턴 사이 쉬는 시간 .8 → .6배, 패턴 겹치기(bossPick) */ squash(o, -.5);
  R.HS = Math.max(R.HS, .16); flash(.6, '255,255,255'); shake(1); zoom(.12); rumble(5, 60); se('DODON', .3); se('W153', .1); snd('DUN_Explosion', .1);
  MEGA_C.forEach((c, i) => ring(o.x, o.y - 20, c, 12, 150 + i * 26, .5, 6, 1, i * .04)); stars(o.x, o.y - 30, 20, '#fff', 380); dust(o.x, o.y, 18, 240);
  const d = Math.hypot(me.x - o.x, me.y - o.y) || 1; if (d < 150 && me.hp > 0) { me.kx += (me.x - o.x) / d * 360; me.ky += (me.y - o.y) / d * 240; }
  pop(o.x, o.y - 110, '졸개를 불렀다!', '#ffe27a', true); for (let i = 0; i < 3; i++) { spawn(G.pool.sm[i % G.pool.sm.length]); G.mobs[G.mobs.length - 1].minion = 1; } }
const inCr = (c, e, m = 0) => Math.hypot(e.x - c.x, (e.y - c.y) * 2) < c.r + m, pitK = e => R.G.cracks.some(c => c.pit && inCr(c, e)) ? .55 : 1;
function crackBreak(c) { const G = R.G, me = G.me; if (c.pit) return; c.pit = R.T; ring(c.x, c.y, '#e9dcc0', 10, c.r + 30, .4, 6); dust(c.x, c.y, 18, 220); stars(c.x, c.y - 8, 8, '#c8b890', 240); shake(.5); buzz(1); snd('DUN_Rock_Smash', .09); se('W120', .12, { gain: .8 });
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, v = 90 + Math.random() * 140; part({ x: c.x + Math.cos(a) * 10, y: c.y + Math.sin(a) * 5, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .5 - 150, ay: 520, life: .5 + Math.random() * .3, sz: 4 + (i % 2) * 2, col: i % 3 ? '#b8a070' : '#8a7448' }); }
  if (me.hp > 0 && !me.hide && me.inv <= 0 && inCr(c, me)) { const n = Math.min(me.hp - 1, Math.round(me.mhp * .12)); if (n > 0) { me.hp -= n; pop(me.x, me.y - 56, n, '#ff7a6a', true); } me.busy = Math.max(me.busy, .45); me.flash = .16; squash(me, .4); chEnd(); dashEnd(); R.VIG = 1; buzz(2); hud(); }
  for (const o of [...G.mobs]) { if (o.hp <= 0 || o.enter > 0 || o.z > 30 || !inCr(c, o, o.boss ? 14 : 0)) continue; if (o.boss) brkAdd(o, { n: o.mhp * .2, e: 1 }); hurt(o, { n: Math.max(1, Math.round(o.mhp * (o.boss ? .06 : .3))), e: 1, crit: false, w: 3 }, 0.01, 0); o.stun = Math.max(o.stun || 0, o.boss ? .6 : 1.2); o.warn = 0; } }
function crackStep(dt) { const G = R.G, me = G.me, T = R.T, A = R.A;
  if (false && (G.crT -= dt) <= 0) { G.crT = 9 + Math.random() * 6; if (G.cracks.filter(c => !c.pit).length < 3) { let x, y, n = 0; do { x = A.x0 + 50 + Math.random() * (A.x1 - A.x0 - 100); y = A.y0 + 50 + Math.random() * (A.y1 - A.y0 - 90); } while (++n < 30 && (inPond(x, y, 40) || Math.hypot(x - me.x, y - me.y) < 80 || G.cracks.some(c => Math.hypot(c.x - x, c.y - y) < 110)));
      if (n < 30) G.cracks.push({ x, y, r: 38, w: 0, t0: T, pit: 0, ln: Array.from({ length: 9 }, (_, i) => [i / 9 * 6.28 + Math.random() * .5, .45 + Math.random() * .55, (Math.random() - .5) * .9]) }); } }
  for (const c of G.cracks) { if (c.pit) continue; let on = me.hp > 0 && !me.hide && !(me.z > 10) && inCr(c, me) ? 1 : 0; for (const o of G.mobs) if (o.hp > 0 && o.enter <= 0 && !(o.z > 10) && inCr(c, o)) on += o.boss ? 2 : 1;
    if (on) { c.w += dt * Math.min(2, .7 + on * .3); if (Math.random() < dt * 10) dust(c.x + (Math.random() - .5) * c.r, c.y + (Math.random() - .5) * c.r * .5, 1, 40); if (c.w >= .9) crackBreak(c); } else c.w = Math.max(0, c.w - dt * .25); }
  G.cracks = G.cracks.filter(c => c.pit ? T - c.pit < 7 : T - c.t0 < 28); }
function drawCrack(c) { const g = R.g, T = R.T, RT = R.RT;
  if (c.pit) { const t = T - c.pit, a = Math.min(1, (7 - t) * 2); g.globalAlpha = a; g.fillStyle = '#3a2c1c'; g.beginPath(); g.ellipse(c.x, c.y, c.r, c.r * .5, 0, 0, 7); g.fill(); g.fillStyle = '#20180e'; g.beginPath(); g.ellipse(c.x, c.y + 2, c.r * .78, c.r * .36, 0, 0, 7); g.fill(); g.strokeStyle = '#8a7448'; g.lineWidth = 3; g.beginPath(); g.ellipse(c.x, c.y, c.r, c.r * .5, 0, 0, 7); g.stroke();
    c.ln.forEach(([an, l], i) => { g.fillStyle = i % 2 ? '#b8a070' : '#8a7448'; g.fillRect(Math.round(c.x + Math.cos(an) * c.r * l * .8) - 3, Math.round(c.y + Math.sin(an) * c.r * l * .4) - 2, 6, 4); }); g.globalAlpha = 1; return; }
  const k = c.w / .9, ap = Math.min(1, (T - c.t0) * 3), jx = k > .3 ? Math.sin(RT * 60) * k * 1.5 : 0; g.globalAlpha = ap * (T - c.t0 > 25 ? .5 : 1); g.fillStyle = `rgba(60,40,20,${.14 + k * .2})`; g.beginPath(); g.ellipse(c.x + jx, c.y, c.r, c.r * .5, 0, 0, 7); g.fill();
  g.strokeStyle = k > .55 && Math.floor(RT * 12) % 2 ? '#fff' : '#4a3620'; g.lineWidth = 2 + k * 1.5; g.lineJoin = 'bevel'; for (const [an, l, bd] of c.ln) { const L = c.r * l * (.6 + k * .4), mx = Math.cos(an + bd * .4) * L * .55, my = Math.sin(an + bd * .4) * L * .55; g.beginPath(); g.moveTo(c.x + jx, c.y); g.lineTo(c.x + jx + mx, c.y + my * .5); g.lineTo(c.x + jx + Math.cos(an) * L, c.y + Math.sin(an) * L * .5); g.stroke(); } g.globalAlpha = 1; }
function brkAdd(o, r) { if (o.groggy > 0 || o.brkLock > 0 || o.hp <= 0) return; const busy = o.act || o.slam || o.lunge || o.chain != null || o.warn > 0; o.brk += r.n / o.mhp * 100 * 2.2 * (r.e > 1 ? 1.5 : r.e < 1 ? .6 : 1) * (busy ? 1.5 : 1) * (r.crit ? 1.3 : 1); if (o.brk < o.brkMax) return;
  o.groggy = GROGGY; o.brk = o.brkMax; o.act = o.slam = o.lunge = null; o.chain = null; o.warn = 0; o.z = 0; o.dz = GROGGY; setAnim(o, 'Hurt', true); squash(o, .45);
  pop(o.x, o.y - 96, '그로기!', '#ffe27a', true); R.HS = Math.max(R.HS, .14); slow(.5, .3); flash(.2, '255,240,170'); zoom(.08); shake(.6); rumble(3, 70); se('KON2', .3); se('KOUKA_H', .05); ring(o.x, o.y - 20, '#ffe27a', 10, 110, .4, 7, 1); ring(o.x, o.y - 20, '#fff', 6, 70, .3, 4, 1, .05); stars(o.x, o.y - 30, 14, '#ffe27a', 300); }
const bossCd = o => Math.max(.38, (1.1 + Math.random() * .5) * (o.rage ? .55 : 1) * (o.mega ? .6 : 1) * (o.boss === 2 ? .75 : 1));   /* 경완 2026-11-16 '10단계 보스 패턴이 9단계 보스들보다 쉬운 것 같아': 9단계는 둘이 번갈아 쏘니 마지막 대장 혼자서는 쉬는 시간이 길었다 → 마지막 대장은 .75배로 자주, 탄 수 많게, 내려찍으면 충격파 */
const bossWave = (o, dl = 0) => after(dl, () => { const G = R.G; if (o.hp <= 0 || G.over) return; const t = tysOf(o.sp)[0]; G.waves.push({ x: o.x, y: o.y, r: 26, v: 240, max: 300, from: o, t, col: TYPE_C[t] || '#fff' }); if (dl) { squash(o, .3); shake(.3); snd('DUN_Stomp', .06); dust(o.x, o.y, 8, 150); } });
function bossPick(o, d) { const G = R.G, me = G.me, L = (BOSS_PAT[o.bi] || BOSS_PAT[0]).filter(k => k !== o.lastK && !(k === 'slam' && d > 300) && !(k === 'rush' && d > 260)), k = L[Math.floor(Math.random() * L.length)] || 'ring'; o.lastK = k; o.atkN++; snd('DUN_Leer', .05);
  if (k === 'slam') { o.slam = { x0: o.x, y0: o.y, x: me.x, y: me.y, t: 0, d: o.rage ? .6 : .75, r: 62 }; setAnim(o, anyAnim(o, 'Hop', 'Attack'), true); squash(o, -.3); dust(o.x, o.y, 6, 110); return; }
  if (k === 'rush') { o.chain = (o.rage ? 3 : 2) + (o.mega ? 1 : 0); o.warn = o.warn0 = .5; o.shoot = false; o.wa = Math.atan2(me.y - o.y, me.x - o.x); return; }
  o.act = { k, t: 0, n: 0, w: (k === 'rain' ? .3 : .6) * (o.mega ? .75 : 1), N: (k === 'ring' ? (o.rage ? 3 : 2) : k === 'fan' ? (o.rage ? 3 : 2) : k === 'rain' ? (o.rage ? 9 : 6) : 1) + (o.mega && k !== 'wave' ? 1 : 0) + (o.boss === 2 && k !== 'wave' ? (k === 'rain' ? 2 : 1) : 0), gap: (k === 'ring' ? .45 : k === 'fan' ? .4 : .16) * (o.mega ? .8 : 1) }; squash(o, -.3); setAnim(o, anyAnim(o, 'Charge', 'SpAttack', 'Attack'), true);
  if (o.mega && k !== 'rain') { const A = R.A, t = tysOf(o.sp)[0], col = TYPE_C[t] || '#fff'; for (let i = 0; i < 3; i++) after(.35 + i * .3, () => { if (o.hp <= 0 || G.over || o.groggy > 0) return; const x = i ? me.x + (Math.random() - .5) * 200 : me.x, y = i ? me.y + (Math.random() - .5) * 160 : me.y; G.blasts.push({ x: Math.max(A.x0 + 20, Math.min(A.x1 - 20, x)), y: Math.max(A.y0 + 20, Math.min(A.y1 - 10, y)), r: 46, t0: R.T, d: .85, from: o, t, col }); }); }   /* 메가진화 뒤: 탄막·충격파를 쏘면서 폭격 셋이 겹친다 */ }
function bossAct(o, dt) { const G = R.G, me = G.me, a = o.act, T = R.T, t = tysOf(o.sp)[0], col = TYPE_C[t] || '#fff', A = R.A; a.t += dt;
  if (a.t < a.w) { if ((a.pt = (a.pt || 0) - dt) <= 0) { a.pt = .04; const an = Math.random() * 6.28; part({ x: o.x + Math.cos(an) * 44, y: o.y - 20 + Math.sin(an) * 28, vx: -Math.cos(an) * 150, vy: -Math.sin(an) * 100, life: .26, sz: 4, col: Math.random() < .7 ? col : '#fff' }); } return; }
  if (a.n < a.N && a.t >= a.w + a.n * a.gap) { const first = !a.n; a.n++;
    if (a.k === 'ring' || a.k === 'fan') { const base = a.k === 'fan' ? Math.atan2(me.y - o.y, me.x - o.x) : a.n * .26, nR = o.mega ? 16 : o.boss === 2 ? 14 : 12, L = a.k === 'fan' ? (o.mega ? [-.84, -.56, -.28, 0, .28, .56, .84] : [-.56, -.28, 0, .28, .56]) : Array.from({ length: nR }, (_, i) => i / nR * 6.283), sp = (a.k === 'fan' ? 250 : 170) * (o.mega ? 1.15 : 1);
      for (const da of L) { const an = base + da; G.shots.push({ x: o.x + Math.cos(an) * 14, y: o.y - 20 + Math.sin(an) * 8, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 2.8, t0: T, mine: false, from: o, t, c: 2, pw: 60, pt: 0 }); }
      squash(o, .3); shake(.22); snd('DUN_Move_Start', .06); se('W053', .2, { gain: .8 }); ring(o.x, o.y - 20, col, 8, 70, .25, 6, 1); setAnim(o, anyAnim(o, 'Shoot', 'SpAttack', 'Attack'), true); }
    else if (a.k === 'wave') { const go = () => { if (o.hp > 0) { G.waves.push({ x: o.x, y: o.y, r: 26, v: 240, max: 330, from: o, t, col }); squash(o, .45); shake(.5); buzz(1); snd('DUN_Stomp', .08); se('DODON', .3); dust(o.x, o.y, 12, 180); } }; go(); if (o.rage || o.mega) after(.5, go); if (o.rage && o.mega) after(1, go); setAnim(o, anyAnim(o, 'Attack'), true); }
    else { const x = first ? me.x : me.x + (Math.random() - .5) * 280, y = first ? me.y : me.y + (Math.random() - .5) * 220; G.blasts.push({ x: Math.max(A.x0 + 20, Math.min(A.x1 - 20, x)), y: Math.max(A.y0 + 20, Math.min(A.y1 - 10, y)), r: 46, t0: T, d: .85, from: o, t, col }); if (first) { squash(o, .3); se('KON2', .3); } } }
  if (a.n >= a.N && a.t > a.w + a.N * a.gap + (a.k === 'rain' ? .6 : .25)) { o.act = null; o.cd = bossCd(o); } }
function hazStep(dt, live) { const G = R.G, me = G.me, T = R.T, hit = (h, pw, ok) => { if (h.hit || !live || me.hp <= 0 || !ok) return; if (me.inv <= 0) { h.hit = 1; hitMe(h.from, h.t, 2, pw, me.x - h.x || 1, me.y - h.y); } else if (me.roll > 0) { h.hit = 1; justDodge(h.from); } };
  for (const w of G.waves) { w.r += w.v * dt; hit(w, 65, Math.abs(Math.hypot(me.x - w.x, (me.y - w.y) * 2) - w.r) < 15); }
  G.waves = G.waves.filter(w => w.r < w.max);
  for (const b of G.blasts) { if (b.done || T - b.t0 < b.d) continue; b.done = 1; spotFx(b.x, b.y, b.t, b.col, true); ring(b.x, b.y, '#fff', 12, b.r + 26, .35, 6); ring(b.x, b.y, b.col, 8, b.r, .3, 5, .5, .04); dust(b.x, b.y, 8, 150); shake(.34); snd('DUN_Rock_Smash', .06); se('W120', .12, { gain: .7 }); hit(b, 70, Math.hypot(me.x - b.x, (me.y - b.y) * 2) < b.r + 4); }
  G.blasts = G.blasts.filter(b => T - b.t0 < b.d + .1); }
function drawHaz() { const g = R.g, G = R.G, T = R.T;
  for (const b of G.blasts) { if (b.done) continue; const p = Math.min(1, (T - b.t0) / b.d); g.fillStyle = 'rgba(255,60,40,.16)'; g.beginPath(); g.ellipse(b.x, b.y, b.r, b.r * .5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,60,40,.34)'; g.beginPath(); g.ellipse(b.x, b.y, b.r * p, b.r * .5 * p, 0, 0, 7); g.fill(); g.strokeStyle = p > .8 ? '#fff' : 'rgba(255,90,70,.9)'; g.lineWidth = 2; g.beginPath(); g.ellipse(b.x, b.y, b.r, b.r * .5, 0, 0, 7); g.stroke(); }
  for (const w of G.waves) { const a = Math.min(1, (w.max - w.r) / 60); g.globalAlpha = a * .35; g.strokeStyle = w.col; g.lineWidth = 16; g.beginPath(); g.ellipse(w.x, w.y, w.r, w.r * .5, 0, 0, 7); g.stroke(); g.globalAlpha = a; g.strokeStyle = '#ff5a4a'; g.lineWidth = 7; g.beginPath(); g.ellipse(w.x, w.y, w.r, w.r * .5, 0, 0, 7); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.ellipse(w.x, w.y, w.r + 2, (w.r + 2) * .5, 0, 0, 7); g.stroke(); g.globalAlpha = 1; } }
const bR = (o, n) => o.boss ? n + Math.round(((o.k || 1.2) - 1.2) * 30) : 0;   /* 대장이 맞는 범위·몸으로 닿는 범위: 그림 크기(o.k)만큼 넓어진다 */
const setPend = () => { const G = R.G; G.pend = G.queue.length + (G.bossPend ? 1 : 0); };
/* 경완 2026-11-16 '스테이지 10 대장 > 우두머리 로 변경. 10 스테이지 보스 나오기 전에 긴장감 높이는 연출': 곡이 끊기고 3초 동안 화면 가장자리가 붉게 뛰며 위아래 경고 띠, 쿵… 쿵… 점점 크게 → 곡 시작·배너 → 하늘에서 떨어짐. 그동안 잡몹은 안 나온다 */
const FIN_WARN = 3;
function finWarn() { const G = R.G, P = G.pool, S = STAGES[G.wave - 1], w = R.q('.ya-warn'), live = () => R?.G === G && !G.over;
  bgm(''); G.queue = []; for (let i = 0; i < S.n; i++) G.queue.push(P.sm[(i + G.wave) % P.sm.length]); G.qT = FIN_WARN + 1.6; G.bossPend = 1; setPend(); hud();
  w.hidden = false; w.classList.remove('on'); void w.offsetWidth; w.classList.add('on'); se('KON2', 0, { gain: .8 });
  for (let i = 0; i < 4; i++) after(i * .75, () => { if (!live()) return; se('DODON', 0, { gain: .7 + i * .3 }); snd('DUN_Stomp', .05 + i * .02); shake(.25 + i * .18); rumble(1 + i, 120, 1); buzz(i > 1 ? 2 : 1); });
  after(FIN_WARN, () => { w.hidden = true; w.classList.remove('on'); if (!live()) return; bgm('bossBig'); se('KON2'); se('VSDEMO04', .3, { gain: .7 }); snd('DUN_Leer', .07); rumble(2, 180, 1); flash(.2, '255,60,40'); banner(`<small>마지막 스테이지</small>우두머리 ${nmSp(P.big[2])} 등장!`, 'boss'); });
  after(FIN_WARN + .75, () => { if (!live()) return; spawn(P.big[2], 2, 0, 2); G.bossPend = 0; setPend(); }); }
/* 경완 2026-11-16 '보스 메가진화 할 때도 무지개 빛 모이는 연출 추가. 진화할 때 메가마크도': megaPhase 동안 무지개 빛줄기·고리가 대장에게 모이고 가운데가 하얗게 차오른다 → megaDone 때 머리 위에 메가 마크(배틀과 같은 dbk/Mega/mark.png)가 한 바퀴 돌고 사라짐 */
const MEGA_T = 2.6; let MARK_IM = null; function markIm() { if (!MARK_IM) { MARK_IM = new Image(); MARK_IM.src = 'gym/img/dbk/Mega/mark.png'; } return MARK_IM; }
function megaGather(o) { markIm(); se('SUIKOMU', .15, { gain: 1.6 });
  fxAdd(0, MEGA_T, t => { const g = R.g, p = Math.min(1, t / MEGA_T), x = o.x, y = o.y - 26; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 24; i++) { const q = (t * 1.5 + i * .618) % 1, an = i * 2.399 + t * 1.4, r1 = (1 - q) * 210 + 18, r0 = r1 + 34 * (1 - q) + 8, c = Math.cos(an), sn = Math.sin(an) * .7; g.globalAlpha = Math.min(1, q * 2.5) * .85; g.strokeStyle = MEGA_C[i % 6]; g.lineWidth = 3 + q * 3; g.beginPath(); g.moveTo(x + c * r0, y + sn * r0); g.lineTo(x + c * r1, y + sn * r1); g.stroke(); }
    for (let j = 0; j < 3; j++) { const q = (t * 1.1 + j / 3) % 1, r = (1 - q) * 170 + 14; g.globalAlpha = q * .6; g.strokeStyle = MEGA_C[(j * 2 + Math.floor(t * 1.1)) % 6]; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y, r, r * .7, 0, 0, 7); g.stroke(); }
    const R0 = 22 + p * 58, gr = g.createRadialGradient(x, y, 0, x, y, R0); gr.addColorStop(0, `rgba(255,255,255,${.35 + p * .6})`); gr.addColorStop(.5, `rgba(255,240,200,${.2 + p * .4})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(x, y, R0, 0, 7); g.fill(); g.restore(); }); }
function megaMark(o) { const im = markIm(), D = 1.9;
  fxAdd(.15, D, t => { if (!im.complete || !im.naturalWidth) return; const g = R.g, a = t < .18 ? t / .18 : t > D - .35 ? Math.max(0, (D - t) / .35) : 1, sc = t < .25 ? .4 + t / .25 * .85 : t < .4 ? 1.25 - (t - .25) / .15 * .25 : 1, sp = Math.cos(Math.min(1, Math.max(0, (t - .35) / .9)) * 6.283), h = 62 * sc, w = h * im.naturalWidth / im.naturalHeight, x = o.x, y = o.y - 70 * (o.k || 1) - 30 - Math.min(1, t / .3) * 8;
    g.save(); g.globalAlpha = a; g.translate(Math.round(x), Math.round(y)); g.shadowColor = 'rgba(255,255,255,.95)'; g.shadowBlur = 14; g.scale(sp || .02, 1); g.imageSmoothingEnabled = true; g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); }); }
function nextWave() {
  const G = R.G; G.wave++; const S = STAGES[G.wave - 1], P = G.pool, bs = S.boss || [], fin = bs.includes(2);
  if (fin) return finWarn();
  bgm(bs.length ? (BOSS_BGM[G.wave] || 'boss') : 'wild'); if (bs.length) { se('KON2'); se('VSDEMO04', .3, { gain: .7 }); } else se('SLIDEIN', .3);
  G.queue = []; for (let i = 0; i < S.n; i++) G.queue.push(P.sm[(i + G.wave) % P.sm.length]); G.qT = 0;   // 잡몹은 자리가 나는 대로 (한 번에 5마리까지)
  if (bs.length) { G.bossPend = 1; after(.75, () => { bs.forEach((b, i) => spawn(P.big[b], b === 2 ? 2 : 1, bs.length > 1 ? (i ? 80 : -80) : 0, b)); G.bossPend = 0; setPend(); }); snd('DUN_Leer', .07); rumble(2, 180, 1); }
  setPend();
  banner(bs.length ? `<small>스테이지 ${G.wave}</small>중간 대장 ${bs.map(b => nmSp(P.big[b])).join('·')} 등장!` : `<small>스테이지</small><b>${G.wave}</b>`, bs.length ? 'boss' : 'stg'); if (!bs.length) buzz(1); hud();
}
const mmss = t => { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function stageClear() {   // 스테이지를 깨면 HP 8% 회복
  const G = R.G, me = G.me, h = Math.min(me.mhp - me.hp, Math.round(me.mhp * .1)); me.hp += h;
  pop(me.x, me.y - 82, `스테이지 ${G.wave} 클리어!`, '#ffe27a', true); if (h) pop(me.x, me.y - 62, `HP +${h}`, '#bff59a'); ring(me.x, me.y, '#bff59a', 8, 64, .4, 5); snd('DUN_Stat_Up', .05); se('PINPON'); if (h) se('KAIFUKU'); buzz(1); hud();
}
// ---------- 필드 아이템 (경완 '중간중간 자석·폭탄 등 아이템이 필드에 나와서 먹으면 발동') ----------
function itemSpawn() {
  const G = R.G, A = R.A, me = G.me; let x, y, n = 0; do { x = A.x0 + 30 + Math.random() * (A.x1 - A.x0 - 60); y = A.y0 + 40 + Math.random() * (A.y1 - A.y0 - 80); } while (++n < 30 && (inPond(x, y, 16) || Math.hypot(x - me.x, y - me.y) < 90));
  /* 경완 2026-11-14 '돌아가며 나오는 건 별로, ai 반영': 지금 상황에 필요한 것일수록 잘 나온다 (HP 낮음 → 열매, 상대 많음 → 폭탄, 바닥에 골드 많음 → 자석, 대장전 → 기합). 바로 전에 나온 것은 덜 나옴 */
  const hr = me.hp / me.mhp, live = G.mobs.filter(o => o.hp > 0 && o.enter <= 0), boss = live.some(o => o.boss), coins = G.drops.filter(p => p.coin).length;
  const W = { berry: hr < .3 ? 7 : hr < .55 ? 3.5 : hr < .8 ? 1 : .15, bomb: 1 + Math.max(0, live.length - 2) * .6 + (boss ? .5 : 0), magnet: coins >= 8 ? 4 : coins >= 4 ? 2 : coins ? .7 : .1, power: boss ? 3.5 : 1 };
  if (G.itLast) W[G.itLast] *= .3; if (G.items[0]) W[G.items[0].k] = 0;
  let k = 'bomb', r = Math.random() * Object.values(W).reduce((a, v) => a + v, 0); for (const n in W) { if ((r -= W[n]) <= 0) { k = n; break; } } G.itLast = k;
  G.items.push({ k, x, y, t0: R.T }); ring(x, y, '#fff', 30, 6, .3, 3); snd('DUN_Wonder_Tile', .025); se('KON', .2, { gain: 1.4 });
}
function itemUse(it) {
  const G = R.G, me = G.me, I = ITEMS[it.k]; stars(it.x, it.y - 12, 8, '#fff', 200); ring(me.x, me.y, I.c, 8, 70, .35, 6); buzz(1); snd('DUN_Wonder_Tile', .06); se('PIRORIRO', .1, { gain: .6 });
  if (it.k === 'magnet') {   /* 경완 2026-11-14: 먹는 순간 필드의 골드를 전부 빨아들인다 */
    const n = G.drops.filter(p => p.coin).length; G.mag = 1; for (const p of G.drops) if (p.coin) p.mag = 1; se('SUIKOMU', .1, { gain: 1.8 }); ring(me.x, me.y, '#ff9a9a', 260, 14, .4, 6); ring(me.x, me.y, '#fff', 180, 10, .34, 3, .5, .08); }
  else if (it.k === 'berry') { const h = Math.min(me.mhp - me.hp, Math.round(me.mhp * .25)); me.hp += h; se('KAIFUKU'); me.lowSe = 0; for (let j = 0; j < 10; j++) part({ x: me.x + (Math.random() - .5) * 34, y: me.y - Math.random() * 10, vy: -70 - Math.random() * 70, life: .5 + Math.random() * .3, col: j % 2 ? '#9fe4ff' : '#fff', sz: 3 }); snd('DUN_Stat_Up', .05); }
  else if (it.k === 'power') { me.crit = Math.max(me.crit, 6); for (const k in me.cd) if (me.cd[k] < 90) me.cd[k] = 0; flash(.12, '255,200,120'); snd('DUN_Stat_Up', .05); se('W014', .1, { gain: 1.8 }); }
  else {   // 폭탄: 화면 안 상대 모두에게 큰 피해
    /* 경완 2026-11-14 '6번(맹독구슬)으로, 독 터지는 느낌 효과도': 보라 독 폭발 + 독 방울·연기, 살아남은 상대는 독 */
    R.HS = Math.max(R.HS, .12); flash(.4, '190,110,255'); shake(1); zoom(.08); rumble(4, 60); snd('DUN_Explosion', .1); se('W092', .1, { gain: 1.6 }); se('W120', .1);
    ring(it.x, it.y, '#f0d8ff', 20, 420, .5, 10); ring(it.x, it.y, '#a040e0', 10, 300, .45, 8, .5, .05); ring(it.x, it.y, '#5a1a90', 8, 220, .55, 6, .5, .12); stars(it.x, it.y - 10, 16, '#c070ff', 340);
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 260; part({ x: it.x, y: it.y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .55 - 40, ay: -60, dr: 3, life: .7 + Math.random() * .6, sz: 5 + (i % 3) * 3, col: ['#a040e0', '#c070ff', '#6a2aa8', '#e8c8ff'][i % 4] }); }
    { const G0 = G, A = R.A; for (let i = 0; i < 14; i++) after(.08 + i * .07, () => { if (R?.G !== G0) return; const x = A.x0 + Math.random() * (A.x1 - A.x0), y = A.y0 + Math.random() * (A.y1 - A.y0); for (let j = 0; j < 3; j++) part({ x: x + (Math.random() - .5) * 20, y, vy: -50 - Math.random() * 60, life: .6 + Math.random() * .4, sz: 4 + j * 2, col: j % 2 ? '#c070ff' : '#8a3ad0' }); }); }
    for (const o of [...G.mobs]) { if (o.hp <= 0 || o.enter > 0) continue; const l = Math.hypot(o.x - it.x, o.y - it.y) || 1; hurt(o, { n: Math.max(1, Math.round(o.mhp * (o.boss ? .1 : .35))), e: 1, crit: false, w: 3 }, (o.x - it.x) / l * 1.4, (o.y - it.y) / l * 1.4); if (o.hp > 0) o.dot = { t: 3, tk: .5, leech: false }; } }   /* 경완 2026-11-15 '오물폭탄 너무 센듯': 잡몹 60% → 35%·대장 18% → 10%, 독 5초 → 3초 (독까지 합쳐 잡몹 100% → 59%) */
  hud();
}
function drawFence() { const g = R.g, P = R.Y.pond, x0 = Math.round(P.x1) + 6, x1 = R.A.x1 + 16, by = Math.round(P.y0) + 12, O = '#20202c', px = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  for (const ry of [by - 20, by - 10]) { px(O, x0, ry - 1, x1 - x0, 7); px('#c8904c', x0, ry, x1 - x0, 5); px('#f0c080', x0, ry, x1 - x0, 1); px('#8e5c28', x0, ry + 4, x1 - x0, 1); for (let x = x0 + 9; x < x1; x += 22) px('#a87238', x, ry + 2, 6, 1); }
  for (let x = x0; x < x1 - 4; x += 28) { px(O, x - 1, by - 27, 10, 28); px(O, x + 1, by - 29, 6, 2); px('#b87c3c', x, by - 26, 8, 26); px('#e8b470', x, by - 26, 2, 26); px('#7e5024', x + 6, by - 26, 2, 26); px('#d09a58', x + 2, by - 28, 4, 2); px('#7e5024', x + 3, by - 18, 1, 5); px('#7e5024', x + 4, by - 8, 1, 4); } }
function drawItem(it) { const g = R.g, T = R.T, t = T - it.t0, left = it.keep ? 99 : 14 - t, I = ITEMS[it.k], o = itemIm(it.k); if (left < 3 && Math.floor(R.RT * 8) % 2) return;
  const x = Math.round(it.x), y = Math.round(it.y - 20 + Math.sin(t * 3.5) * 3), ap = Math.min(1, t * 5), sz = Math.round(52 * ap), pu = .55 + .45 * Math.sin(R.RT * 6);
  g.fillStyle = 'rgba(20,40,10,.28)'; g.beginPath(); g.ellipse(x, it.y, 13, 4.5, 0, 0, 7); g.fill();
  if (sz < 6 || !o.wh) return;
  g.globalAlpha = pu; for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) g.drawImage(o.wh, x - sz / 2 + ox, y - sz / 2 + oy, sz, sz);   /* 테두리 빛 */
  g.globalAlpha = 1; g.drawImage(o.im, x - sz / 2, y - sz / 2, sz, sz); }

// ---------- 변화 기술: 기술 이름대로 ----------
function statusUse(v, col, noPre) {
  const G = R.G, me = G.me, st = v.A.st, say = (t, c = '#bff59a') => pop(me.x, me.y - 66, t, c, true), up = (c, n = 10) => { for (let j = 0; j < n; j++) part({ x: me.x + (Math.random() - .5) * 34, y: me.y - Math.random() * 10, vy: -70 - Math.random() * 70, life: .5 + Math.random() * .3, col: j % 2 ? c : '#fff', sz: 3 }); };
  const near = (r = 170) => G.mobs.filter(o => o.hp > 0 && o.enter <= 0 && Math.hypot(o.x - me.x, o.y - me.y) < r), wave = c => { ring(me.x, me.y, c, 14, 176, .45, 7); ring(me.x, me.y, '#fff', 8, 120, .35, 3, .5, .06); shake(.18); };
  if (noPre) burst(me.x, me.y - 24, col, 10, 48); buzz(1);
  if (st === 'shrink') { me.shrink = 8; squash(me, .45); fxOnce(PX()?.s.Smoke_White ? 'Smoke_White' : 'Wood_Hammer_Smoke', 2, 0, me.x, me.y - 14, 1, { s: .9 }); stars(me.x, me.y - 16, 8, '#ffd0f0'); say('작아졌다! 잘 안 맞아요', '#ffd0f0'); }
  else if (st === 'clone') { me.clone = 8; ghost(me, .4); ring(me.x, me.y, '#c8c8ff', 8, 70, .35, 4); say('분신! 절반은 빗나가요', '#c8c8ff'); snd('DUN_Double_Team', .06); }
  else if (st === 'prot') { me.prot = 2.5; ring(me.x, me.y - 18, '#7af0a0', 40, 26, .25, 6, 1); say('방어! 2.5초 동안 다 막아요', '#7af0a0'); }
  else if (st === 'heal') { const h = Math.min(me.mhp - me.hp, Math.round(me.mhp * .35)); me.hp += h; up('#8ff0a0', 14); ring(me.x, me.y, '#8ff0a0', 8, 60, .4, 5); say(`HP +${h}`, '#8ff0a0'); }
  else if (st === 'haste') { me.haste = 8; up('#9fe4ff'); sparks(me.x, me.y - 16, 0, -1, '#9fe4ff', 8, 260); say('빨라졌다!', '#9fe4ff'); }
  else if (st === 'guard') { me.guard = 8; squash(me, .3); ring(me.x, me.y - 18, '#8cc8ff', 44, 28, .3, 6, 1); say('단단해졌다! 받는 피해 ↓', '#8cc8ff'); }
  else if (st === 'trap' || st === 'field' || st === 'wx') { const [tx, c] = st === 'trap' ? trapSet(v) : st === 'field' ? fieldSet(v) : wxSet(v); say(tx, c); }
  else if (st === 'power') { me.buff = BUFF_T; squash(me, -.4); ring(me.x, me.y, '#bff59a', 20, 140, .5, 7); ring(me.x, me.y, '#fff', 10, 100, .4, 4, .5, .06); shake(.2); up('#bff59a'); say('힘이 솟는다! 기술이 강해졌다'); }
  else { const L = near(), c = st === 'stun' ? '#ffe27a' : st === 'slow' ? '#9fc4ff' : st === 'weak' ? '#d0a0ff' : '#b070e0'; wave(c);
    for (const o of L) { if (st === 'stun') { o.dz = o.boss ? 1.2 : 3; o.stun = Math.max(o.stun || 0, o.dz); o.warn = 0; o.lunge = o.slam = null; } else if (st === 'slow') o.slowT = 7; else if (st === 'weak') o.weak = 8; else o.dot = { t: 5, tk: .3, leech: /leechseed/.test(v.id) }; stars(o.x, o.y - 30, 4, c, 140); squash(o, .25); }
    say(!L.length ? '둘레에 상대가 없다…' : st === 'stun' ? '상대가 멈췄다!' : st === 'slow' ? '상대가 느려졌다!' : st === 'weak' ? '상대가 약해졌다! 피해 1.4배' : '상대가 서서히 피해를 입는다!', c); }
}
// 자료 없는 기술의 지점 낙하 연출: 전기 = 번개, 바위·땅·강철·얼음 = 덩어리 낙하, 나머지 = 타입 색 기둥
function spotFx(px, py, t, col, first) {
  if (t === 13) { const pts = [[px, py]]; for (let y = py - 28, x = px; y > -30; y -= 28) { x += (Math.random() - .5) * 30; pts.push([x, y]); }
    fxAdd(.08, .2, tt => { const g = R.g, a = 1 - tt / .2; for (const [w, c] of [[6, '#ffe27a'], [2, '#fff']]) { g.strokeStyle = c; g.globalAlpha = a; g.lineWidth = w; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); } g.globalAlpha = 1; }); }
  else if ([5, 6, 9, 15].includes(t)) fxAdd(0, .13, tt => { const g = R.g, p = tt / .13, y = py - 14 - (1 - p) * 170, r = first ? 13 : 10; g.fillStyle = '#20202c'; g.beginPath(); g.moveTo(px, y - r - 2); g.lineTo(px + r + 2, y); g.lineTo(px, y + r + 2); g.lineTo(px - r - 2, y); g.closePath(); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(px, y - r); g.lineTo(px + r, y); g.lineTo(px, y + r); g.lineTo(px - r, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(px - 3, y - r + 3, 4, 4); });
  else { fxAdd(.08, .3, tt => { const g = R.g, p = tt / .3, w = (first ? 30 : 22) * (1 - p * .6), gr = g.createLinearGradient(0, py - 130, 0, py); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, col); g.globalAlpha = .85 * (1 - p); g.fillStyle = gr; g.fillRect(px - w / 2, py - 130, w, 130); g.fillStyle = '#fff'; g.fillRect(px - w / 6, py - 110, w / 3, 110); g.globalAlpha = 1; });
    for (let j = 0; j < 6; j++) part({ x: px + (Math.random() - .5) * 30, y: py - Math.random() * 12, vy: -90 - Math.random() * 90, life: .4 + Math.random() * .2, col: j % 2 ? col : '#fff', sz: 3, t0: R.T + .1 }); }
}
// 타입별 탄 모양 (자료 없는 탄): 불꽃·물방울·잎·전기 별·결정·기운·고리
function orbT(s) { const g = R.g, t = s.v.t, r = s.sm ? 6 : 9, c = s.col, RT = R.RT, a = s.ang, ink = () => { g.strokeStyle = '#20202c'; g.lineWidth = 2; g.stroke(); };
  g.save(); g.translate(s.x, s.y);
  if (t === 10 || t === 11) { g.rotate(a); const tl = r * 2.4 + Math.sin(RT * 40 + s.t0 * 9) * 3, tear = k => { g.beginPath(); g.moveTo((r + 2) * k, 0); g.quadraticCurveTo(0, (-r - 1) * k, -tl * k, 0); g.quadraticCurveTo(0, (r + 1) * k, (r + 2) * k, 0); };
    tear(1); g.fillStyle = t === 10 ? '#f06a20' : '#4a98f0'; g.fill(); ink(); tear(.55); g.fillStyle = t === 10 ? '#ffe27a' : '#c8e8ff'; g.fill(); }
  else if (t === 12 || t === 7) { g.rotate(a + RT * 14); g.beginPath(); g.ellipse(0, 0, r + 4, r * .5, 0, 0, 7); g.fillStyle = c; g.fill(); ink(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-r, -1, r * 2, 2); }
  else if (t === 13) { g.rotate(RT * 20); starPath(g, r + 5, r * .45); g.fillStyle = '#ffe27a'; g.fill(); ink(); starPath(g, r * .5, r * .2); g.fillStyle = '#fff'; g.fill(); }
  else if ([5, 6, 9, 15].includes(t)) { g.rotate(t === 15 ? a : a + RT * 10); g.beginPath(); g.moveTo(r + 4, 0); g.lineTo(0, -r * .75); g.lineTo(-r - 4, 0); g.lineTo(0, r * .75); g.closePath(); g.fillStyle = c; g.fill(); ink(); g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(-2, -r * .4, r, 3); }
  else if ([4, 8, 16, 17].includes(t)) { g.rotate(a); for (let i = 3; i >= 1; i--) { g.globalAlpha = .22 * (4 - i); g.fillStyle = c; g.beginPath(); g.arc(-i * r * .9, Math.sin(RT * 30 + i) * 2, r * (1 - i * .18), 0, 7); g.fill(); } g.globalAlpha = 1; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = '#2a2038'; g.fill(); g.strokeStyle = c; g.lineWidth = 3; g.stroke(); g.fillStyle = '#fff'; g.fillRect(-2, -3, 3, 3); }
  else if (t === 14 || t === 18) { g.rotate(RT * 8); g.beginPath(); g.arc(0, 0, r + 1, 0, 7); g.fillStyle = 'rgba(255,255,255,.3)'; g.fill(); g.strokeStyle = c; g.lineWidth = 3; g.stroke(); starPath(g, r * .8, r * .3); g.fillStyle = '#fff'; g.fill(); }
  else { g.restore(); orb(s.x, s.y, c, r); return; }
  g.restore(); }
// 소용돌이 장판 (회오리불꽃·바다회오리·모래지옥·휘감기…): 2.6초 동안 그 자리에서 돌며 안에 있는 상대를 끌어당기고 계속 지진다
function drawZone(z) { const g = R.g, RT = R.RT, t = R.T - z.t0, a = Math.min(1, t * 5, (z.d - t) * 3), r = z.r, n = PX()?.s[z.sp];
  g.globalAlpha = .22 * a; g.fillStyle = z.col; g.beginPath(); g.ellipse(z.x, z.y, r, r * .5, 0, 0, 7); g.fill(); g.globalAlpha = a;
  for (let k = 0; k < 2; k++) { g.strokeStyle = k ? '#fff' : z.col; g.lineWidth = k ? 2 : 4; g.setLineDash([18, 14]); g.lineDashOffset = RT * (k ? -90 : 120); g.beginPath(); g.ellipse(z.x, z.y, r * (k ? .62 : .95), r * (k ? .31 : .48), 0, 0, 7); g.stroke(); } g.setLineDash([]);
  for (let i = 0; i < 14; i++) { const ph = (RT * 1.1 + i / 14) % 1, an = RT * 7 + i * 2.4, rr = r * (1 - ph * .75), x = z.x + Math.cos(an) * rr, y = z.y + Math.sin(an) * rr * .5 - ph * 46, sz = 3 + (i % 3); g.globalAlpha = a * (1 - ph * .6); g.fillStyle = i % 3 ? z.col : '#fff'; g.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
  g.globalAlpha = 1; if (n) pfxDraw(z.sp, (R.T * 60 / z.ft) % (n[2] || 1), z.x, z.y - 14, 1, { a }); }
// ---------- 내 기술 ----------
const nearest = (e, list, r = 9999) => { let b = null, bd = r; for (const o of list) { if (o.hp <= 0 || o.enter > 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; b = o; } } return b; };
// 방식·수치는 경완이 준 팬게임 '포켓몬 레조넌스' 배틀 코드를 읽고 구조만 참고(코드는 새로 씀): 빔 최소 .35초~위력별 최대, .2초 틱, 누른 만큼 쿨타임, 쏘는 동안 이동 0.3배, 멈칫 초당 .3초 한도, 무게 등급 표, 숫자 합치기.
// 꾹 누르기 (경완 2026-11-13 '꾹 눌러서 쭈우우욱 나가는 느낌', 장애물 넘기 화염방사·파도타기처럼 누르는 동안 이어지고 연속 진동):
// 기술은 누르는 동안 이어진다 — 줄기(화염방사·물대포)는 빔이 쭉 뻗어 계속 지지고, 탄은 연사, 번개는 연달아 떨어지고, 근접은 연타, 둘레는 파동이 이어지고, 돌진은 누르는 동안 달린다.
// 짧게 누르면 첫 한 방(위력 60%)만, 끝까지 누르면 잔타(τ 마다 위력 CH.m)가 이어진다. 쿨타임은 누른 만큼(45~100%).
const MELEE_R = 300;
const CH = { vortex: { tau: .7, m: 0, max: 1.5, min: .05, mv: .5 }, stream: { tau: .2, m: .2, max: 1.5, min: .35, mv: .3 }, proj: { tau: .17, m: .25, max: 1.4, min: .05, mv: .55 }, col: { tau: .3, m: .4, max: 1.4, min: .05, mv: .5 }, melee: { tau: .17, m: .25, max: 1.3, min: .05, mv: 0 }, area: { tau: .3, m: .4, max: 1.4, min: .05, mv: .4 } };
const BEAM = 250, rg = () => (R.G.me.buff > 0 ? RNG : 1), chMax = c => c.kind === 'stream' ? Math.max(1.1, Math.min(1.8, 1 + c.v.pw / 150)) : c.K.max;   // 줄기: 위력이 셀수록 오래 (1.1~1.8초), 끝까지 누르면 합계 한 방의 1.45배
const cdBase = v => v.c ? .6 + v.pw / 70 : 6;
function hum(dt) { if ((R.humT = (R.humT || 0) - dt) > 0) return; let nat = false; try { nat = !!GA.hapHum?.(1); } catch (e) {} R.humT = nat ? .1 : .04; if (!nat) { try { GA.haptic?.(0); } catch (e) {} } R.humOn = 1; }
function humOff() { if (!R?.humOn) return; R.humOn = 0; R.humT = 0; try { GA.hapHum?.(0); } catch (e) {} }
function useMove(i, tap) {
  const G = R?.G, me = G?.me; if (!R.run || !me || me.hp <= 0 || G.over) return; const v = G.M.mv[i]; if (!v) return;
  const btn = R.q('.ya-mvs').children[i];
  if (me.ch?.i === i || me.dash?.hold === i || me.hide?.i === i) return;
  if (me.cd[v.name] > .18) { if (tap && btn) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); } return; }
  if (me.cd[v.name] > 0 || me.busy > 0 || me.dash || me.ch || me.hide) { R.BUF = { i, t: R.RT }; return; }   // 조금 일찍 눌러도 받아 뒀다가 풀리자마자 나감
  R.BUF = null;
  const { name, t, c, k, Rr } = v, tg = nearest(me, G.mobs), col = TYPE_C[t] || '#fff';
  const ang = tg ? Math.atan2(tg.y - me.y, tg.x - me.x) : (me.face > 0 ? 0 : Math.PI), dx = Math.cos(ang), dy = Math.sin(ang);
  me.face = dx >= 0 ? 1 : -1; me.cdMax[name] = cdBase(v); const f = me.face, E = r => (Rr?.e || []).filter(e => e[0] === r);
  for (const [ro, n, dl, gv] of Rr?.snd || []) snd(n, gv, (ro === 'pre' ? 0 : ro === 'act' ? .12 : .25) + (dl || 0) / 60);
  const own = mvSe(v.id);   /* 본가 기술 소리가 있으면 그걸 먼저, 없을 때만 기본 소리 */
  if (!own && !Rr?.snd?.length) snd(c ? 'DUN_Move_Start' : 'DUN_Stat_Up', .04);
  for (const [, kk, ft] of E('pre')) fxOnce(kk, ft, 0, me.x, me.y - 22, f);
  const amp = ampOf(v); if (amp) ampFx(me.x, me.y, col, true);
  buzz(1); squash(me, -.16); pressEl(btn);
  if (k === 'Self') {   // 변화 기술: 8초 동안 기술 범위 1.5배(빔 길이·폭, 탄 3갈래, 번개·근접·둘레 반경) + HP 조금 회복. 몸이 커지고 발밑에 범위 고리가 돈다
    me.cd[name] = cdBase(v); setAnim(me, anyAnim(me, 'Charge', 'SpAttack', 'Attack'), true); me.busy = .3; statusUse(v, col, !E('pre').length); hud(); return;
  }
  if (v.A.hide) {   // 숨는 기술: 누르는 동안 땅속·하늘·물속·그림자에 숨어 안 맞고 빠르게 움직이다가, 떼면 그 자리에서 솟구쳐 둘레를 친다 (오래 숨을수록 세고 넓게)
    const mode = /dig/.test(v.id) ? 'dig' : /dive/.test(v.id) ? 'dive' : /force/.test(v.id) ? 'shadow' : 'sky';
    me.hide = { i, v, mode, t: 0, out: 0, max: 1.4, min: .35, col, gt: 0 }; me.inv = Math.max(me.inv, .3); me.cd[name] = 99; setAnim(me, anyAnim(me, 'Hop', 'Rotate', 'Walk'), true); hideFx(me, mode, col); return;
  }
  if (k === 'Dash') {   // 누르는 동안 달린다 (스틱으로 방향을 틀 수 있음)
    setAnim(me, anyAnim(me, 'QuickStrike', 'Walk'), true); me.dash = { vx: dx * 600, vy: dy * 600, t: 9, hit: new Map(), v, gt: 0, hold: i, el: 0, max: .75, min: .2, amp }; me.inv = Math.max(me.inv, .3); me.cd[name] = 99;
    dust(me.x, me.y, 5, 90); sparks(me.x, me.y - 16, -dx, -dy, col, 5, 200); return;
  }
  let kind = k === 'Attack' ? 'melee' : k === 'Projectile' ? (E('col').length ? 'col' : E('stream').length ? 'stream' : 'proj') : 'area';
  if (v.A.vortex) kind = 'vortex'; else if (kind === 'proj' && !E('proj').length) kind = v.A.beam ? 'stream' : v.A.spot || (Rr && !v.A.multi) ? 'col' : 'proj';   /* 탄 그림이 없는 기술: 빔·지점 낙하·타입 모양 탄 */
  me.ch = { i, v, kind, K: CH[kind], t: 0, tk: 0, n: 0, ang, sndT: .6, col, f, last: null, amp }; me.ch.max = chMax(me.ch); me.cd[name] = 99;
  { const w = wOf(v.pw), wd = kind === 'stream' ? 0 : WT.wind[w]; if (wd) { me.ch.tk = wd; me.ch.wd = wd; squash(me, -.24); ring(me.x, me.y - 18, col, 30 + w * 8, 6, wd, 4, 1); } }   /* 묵직한 기술일수록 모으는 순간이 있다 */
  setAnim(me, anyAnim(me, ...(kind === 'melee' ? ['Strike', 'Attack'] : kind === 'area' ? ['SpAttack', 'Rotate', 'Attack'] : ['Shoot', 'SpAttack', 'Attack'])), true);
  if (kind === 'stream') { ring(me.x + dx * 18, me.y - 20 + dy * 10, col, 3, 26, .2, 5, 1); sparks(me.x + dx * 18, me.y - 20 + dy * 10, dx, dy, col, 6, 260); shake(.12); }
}
// 한 박자: 첫 박자는 한 방(60%), 뒤는 잔타
function chTick(c) {
  const G = R.G, me = G.me, { v, kind, K, col } = c, { t, c: cat, pw, Rr } = v, first = c.n === 0, m = first ? (kind === 'stream' ? .45 : .6) : kind === 'stream' ? 1 / Math.max(1, Math.ceil(c.max / K.tau) - 1) : K.m, dx = Math.cos(c.ang), dy = Math.sin(c.ang), f = me.face, E = r => (Rr?.e || []).filter(e => e[0] === r), A = c.amp ? AMP : 1, A2 = c.amp ? 1.2 : 1;
  c.n++; c.tk = K.tau;
  const hit = (o, kx, ky, delay = 0) => { const go = () => { if (o.hp <= 0) return; const r = dmg(me, o, t, cat, pw * m, pw); hurt(o, r, kx, ky, !first); hitFx(Rr, o, 0, f, col, kx, ky, !first); if (c.amp && (first || !o.afx || R.T - o.afx > .2)) { o.afx = R.T; ring(o.x, o.y - 20, '#fff', 6, first ? 44 : 30, .2, 5, 1); ring(o.x, o.y - 20, col, 10, first ? 58 : 38, .26, 4, 1, .03); sparks(o.x, o.y - 20, kx, ky, col, first ? 8 : 4, 340); if (first) shake(.14); } drainTo(v, o, r.n); }; if (delay) after(delay, go); else go(); };
  if (kind === 'vortex') {   // 소용돌이를 겨눈 자리에 깐다 (누르고 있으면 다시 깔아 이어 감)
    const tg = nearest(me, G.mobs, 320), px = tg ? tg.x : me.x + dx * 130, py = tg ? tg.y : me.y + dy * 90, old = G.zones.find(z => z.v === v && Math.hypot(z.x - px, z.y - py) < 50), tl = E('tile')[0];
    if (old) old.t0 = R.T - .3; else G.zones.push({ x: px, y: py, r: 58 * rg() * A2, t0: R.T, d: 2.6, v, col, tk: .15, sp: tl?.[1], ft: tl?.[2] || 2 });
    ring(px, py, col, 70 * A, 12, .25, 5 * A); if (c.amp) ring(px, py, '#fff', 90, 16, .3, 4, .5, .04); dust(px, py, 6 * A, 120); shake(.14 * A); squash(me, .12); if (!first) snd('DUN_Move_Start', .025); return; }
  if (kind === 'stream') {   // 빔 안에 있는 상대를 모두 지진다
    const len = Math.min(BEAM * rg(), 40 + c.t * 1100), x0 = me.x + dx * 14, y0 = me.y - 20 + dy * 8;
    for (const o of G.mobs) { if (o.enter > 0 || o.hp <= 0) continue; const px = o.x - x0, py = o.y - 20 - y0, along = px * dx + py * dy, perp = Math.abs(px * dy - py * dx); if (along > -6 && along < len + 10 && perp < 24 * rg() * A2 + bR(o, 12)) hit(o, dx * (first ? 1 : .5), dy * (first ? 1 : .5)); }
    me.kx -= dx * 26 * A; me.ky -= dy * 18 * A; shake(.035 * A * A);
  } else if (kind === 'proj') {   // 연사
    const a = c.ang + (first ? 0 : (Math.random() - .5) * .16), cx = Math.cos(a), cy = Math.sin(a);
    for (const da of rg() > 1 ? [0, -.3, .3] : v.A.multi ? [0, -.15, .15] : [0]) { const a2 = a + da, ex = Math.cos(a2), ey = Math.sin(a2); G.shots.push({ x: me.x + ex * 16, y: me.y - 20 + ey * 10, vx: ex * 470, vy: ey * 470, life: .7, t0: R.T, mine: true, pierce: false, hit: new Set(), v, f, ang: a2, col, pt: 0, pm: da ? m * .6 : m, light: !first || !!da, sm: !!da || v.A.multi, amp: c.amp }); }   /* 범위 UP 이면 세 갈래 */
    me.kx -= cx * (first ? 110 : 55); me.ky -= cy * (first ? 70 : 35); ring(me.x + cx * 18, me.y - 20 + cy * 10, col, 3, (first ? 20 : 14) * A, .14, 4 * A, 1); sparks(me.x + cx * 18, me.y - 20 + cy * 10, cx, cy, col, (first ? 4 : 2) * (c.amp ? 2 : 1), 220 * A2);
    if (!first) { snd('DUN_Move_Start', .02); squash(me, .08); }
  } else if (kind === 'col') {   // 번개가 연달아 떨어진다 (같은 상대만 말고 돌아가며)
    const L = G.mobs.filter(o => o.hp > 0 && o.enter <= 0 && Math.hypot(o.x - me.x, o.y - me.y) < 280).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const tg = L.find(o => o !== c.last) || L[0]; c.last = tg; const px = tg ? tg.x : me.x + dx * 140, py = tg ? tg.y : me.y + dy * 90;
    for (const [, kk, ft] of E('col')) { const B = kk + '_B', Hd = kk + '_H', S = PX().s; if (!S[B] || !S[Hd]) continue; const bh = S[B][1] * 2;
      fxAdd(.1, first ? .55 : .3, tt => { const fr = (tt * 60 / ft) % S[B][2]; for (const ox of c.amp ? [-9, 9, 0] : [0]) { pfxDraw(Hd, fr, px + ox, py - 16, 1); for (let y = py - 16 - S[Hd][1] - bh / 2 + 2; y > -60; y -= bh - 2) pfxDraw(B, fr, px + ox, y, 1); } }); }
    if (!E('col').length) { const tl = E('tile'); if (tl.length) for (const [, kk, ft] of tl) fxOnce(kk, ft, .04, px, py - 16, f); else { spotFx(px, py, t, col, first); if (c.amp) { spotFx(px - 14, py + 4, t, col, false); spotFx(px + 14, py - 4, t, col, false); } } }
    fxAdd(0, .14, tt => { const g = R.g, p = tt / .14; g.strokeStyle = `rgba(255,255,255,${.8 * (1 - p)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(px, py, 34 * (1 - p * .5), 14 * (1 - p * .5), 0, 0, 7); g.stroke(); });
    for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && Math.hypot(o.x - px, o.y - py) < 44 * rg() * A2) { const l = Math.hypot(o.x - px, o.y - py) || 1; hit(o, l > 6 ? (o.x - px) / l * .7 : dx * .7, l > 6 ? (o.y - py) / l * .7 : dy * .7, .13); }
    after(.12, () => { flash((first ? .09 : .05) * A); shake((first ? .3 : .16) * A); ring(px, py, col, 10, (first ? 64 : 46) * rg() * A, .3, 6 * A); if (first || c.amp) ring(px, py, '#fff', 6, 40 * A, .22, 4); if (c.amp) ring(px, py, col, 16, 96, .36, 4, .5, .05); dust(px, py, (first ? 6 : 3) * A, 110); });
    if (!first) snd(Rr?.snd?.find(x => x[0] === 'act')?.[1] || 'DUN_Shock_Wave', .05);
  } else if (kind === 'melee') {   // 연타: 가까운 상대에게 달라붙어 계속 친다
    /* 경완 2026-11-15 '번개펀치는 근접 공격인가? 가까운 적 공격하는게 아니고?' → '달려가서 치는쪽으로': 달라붙는 거리 140 → MELEE_R 300, 멀수록 빨리 달려 박자가 늘어지지 않게, 방향은 그 상대 쪽으로 바로 */
    const tg = nearest(me, G.mobs, MELEE_R * rg()); if (tg) { c.ang = Math.atan2(tg.y - me.y, tg.x - me.x); me.face = Math.cos(c.ang) >= 0 ? 1 : -1; }
    const dx = Math.cos(c.ang), dy = Math.sin(c.ang), d = tg ? Math.hypot(tg.x - me.x, tg.y - me.y) : 0, go = tg ? Math.max(0, d - 30) : 0, sp = go > 130 ? 900 : 640, tt = go / sp;
    if (go > 4) { me.dash = { vx: dx * sp, vy: dy * sp, t: tt, step: true, gt: 0 }; ghost(me); if (go > 130) { dust(me.x, me.y, 4, 90); } }
    setAnim(me, anyAnim(me, ...(c.n % 2 ? ['Strike', 'Attack'] : ['Attack'])), true); c.tk = K.tau + tt; const flip = c.n % 2 ? 1 : -1;
    after(tt + .04, () => { if (me.hp <= 0) return; const hx = me.x + dx * 30, hy = me.y + dy * 20; let n = 0;
      slash(hx, hy - 20, flip > 0 ? c.ang : c.ang + .001, col, (first ? 36 : 30) * rg() * A); if (c.amp) { slash(hx, hy - 20, c.ang + .5 * flip, '#fff', (first ? 30 : 24) * rg()); ring(hx, hy - 20, col, 8, 50, .2, 5, 1); sparks(hx, hy - 20, dx, dy, col, 6, 320); } if (flip < 0) fxAdd(0, .001, () => {});
      if (first) for (const [, kk, ft] of [...E('front'), ...E('tile')]) fxOnce(kk, ft, 0, hx, hy - 20, f);
      me.kx += dx * (first ? 90 : 50); me.ky += dy * (first ? 60 : 34); squash(me, first ? .14 : .1);
      for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && Math.hypot(o.x - hx, o.y - hy) < 50 * rg() * A2 + bR(o, 14)) { n++; hit(o, dx * (first ? 1.5 : .6), dy * (first ? 1.5 : .6)); }
      snd(n ? 'DUN_Punch' : 'DUN_Miss', n ? .035 : .02); });
  } else {   // 둘레: 파동이 이어서 퍼진다
    const rr = (92 + Math.min(3, c.n - 1) * 8) * rg() * A2;
    if (first) { for (const [, kk, ft] of [...E('area'), ...E('tile'), ...E('stream'), ...E('proj')]) fxOnce(kk, ft, .05, me.x, me.y - 16, f); if (!E('area').length) burst(me.x, me.y - 16, col, 16, 80); }
    ring(me.x, me.y, col, 12, rr + 4, .32, (first ? 7 : 5) * A); if (first || c.amp) ring(me.x, me.y, '#fff', 8, 70 * A2, .26, 4, .5, .05); if (c.amp) ring(me.x, me.y, col, 20, rr * .7, .28, 4, .5, .1); dust(me.x, me.y, (first ? 10 : 5) * A, 170); shake((first ? .3 : .14) * A); squash(me, .1);
    for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && Math.hypot(o.x - me.x, o.y - me.y) < rr) { const l = Math.hypot(o.x - me.x, o.y - me.y) || 1; hit(o, (o.x - me.x) / l * (first ? 1.3 : .6), (o.y - me.y) / l * (first ? 1.3 : .6), .08); }
  }
}
// ---------- 숨는 기술 (구멍파기·공중날기·다이빙·섀도다이브…) ----------
function hideFx(me, mode, col) { const x = me.x, y = me.y;
  if (mode === 'dig') { dust(x, y, 14, 160, '#b08a58'); ring(x, y, '#b08a58', 8, 44, .28, 5); snd('DUN_Rock_Smash', .05); }
  else if (mode === 'dive') { ring(x, y, '#6ab4ff', 6, 46, .3, 5); ring(x, y, '#fff', 4, 30, .22, 3, .5, .05); for (let j = 0; j < 10; j++) part({ x: x + (Math.random() - .5) * 26, y, vx: (Math.random() - .5) * 90, vy: -140 - Math.random() * 120, ay: 520, life: .5, col: j % 2 ? '#6ab4ff' : '#fff', sz: 3 }); }
  else if (mode === 'shadow') { ghost(me, .4); ring(x, y, '#5a3a8a', 40, 8, .25, 6); burst(x, y - 20, '#5a3a8a', 20, 4); snd('DUN_Leer', .05); }
  else { dust(x, y, 10, 150); ring(x, y, '#fff', 8, 50, .25, 5); for (let j = 0; j < 6; j++) part({ kind: 'line', x: x + (Math.random() - .5) * 22, y: y - 20 - Math.random() * 30, vy: -520, life: .2, dr: 0, sz: 2, col: '#fff' }); }
  squash(me, -.4); shake(.2); buzz(1); }
function hideStep(dt) { const G = R.G, me = G.me, h = me.hide, J = R.JOY, sky = h.mode === 'sky'; me.inv = Math.max(me.inv, .15);
  if (h.out > 0) { h.out -= dt; if (sky) me.z = 620 * Math.max(0, h.out / .14); if (h.out <= 0) hideHit(); return; }
  h.t += dt; hum(dt); if (sky) me.z = 620 * Math.min(1, h.t / .2);
  const sp = (120 + me.st[5] * .5) * 1.7, m = Math.hypot(J.dx, J.dy); let mx = 0, my = 0;
  if (m > .15) { mx = J.dx; my = J.dy; } else { const tg = nearest(me, G.mobs, 280), d = tg ? Math.hypot(tg.x - me.x, tg.y - me.y) : 0; if (d > 12) { mx = (tg.x - me.x) / d * .8; my = (tg.y - me.y) / d * .8; } }   /* 스틱을 안 밀면 가까운 상대 밑으로 */
  if (mx || my) { me.x += mx * sp * dt; me.y += my * sp * dt; if (Math.abs(mx) > .2) me.face = mx > 0 ? 1 : -1; keepIn(me); }
  if ((h.gt -= dt) <= 0) { h.gt = .05; const x = me.x + (Math.random() - .5) * 18, y = me.y + (Math.random() - .5) * 6;
    if (h.mode === 'dig') part({ x, y, vx: (Math.random() - .5) * 60, vy: -60 - Math.random() * 60, ay: 380, life: .35, col: Math.random() < .5 ? '#b08a58' : '#7a5a34', sz: 3 + (Math.random() * 2 | 0) });
    else if (h.mode === 'dive') part({ x, y, vy: -30, life: .3, col: '#a8d4ff', sz: 2 }); else if (h.mode === 'shadow') part({ x, y, vy: -50, life: .4, col: Math.random() < .5 ? '#5a3a8a' : '#20102c', sz: 4 }); }
  if ((!R.HELD[h.i] && h.t >= h.min) || h.t >= h.max) { h.out = sky ? .14 : .07; humOff(); } }
function hideHit() { const G = R.G, me = G.me, h = me.hide, v = h.v, col = h.col, k = Math.min(1, h.t / h.max), rr = (62 + k * 26) * rg(), x = me.x, y = me.y; me.hide = null; me.z = 0; me.inv = Math.max(me.inv, .35); me.busy = .16;
  me.cd[v.name] = me.cdMax[v.name] * (.6 + .4 * k); setAnim(me, anyAnim(me, 'Strike', 'Attack'), true); squash(me, -.4); let n = 0;
  for (const o of G.mobs) { if (o.enter > 0 || o.hp <= 0) continue; const l = Math.hypot(o.x - x, o.y - y); if (l > rr + bR(o, 14)) continue; n++; hurt(o, dmg(me, o, v.t, v.c, v.pw * (1 + .5 * k), v.pw), l > 6 ? (o.x - x) / l * 1.5 : .01, l > 6 ? (o.y - y) / l * 1.5 : -1.5); hitFx(v.Rr, o, 0, me.face, col); }
  for (const [ro, kk, ft] of v.Rr?.e || []) if (ro === 'hit' || ro === 'tile' || ro === 'area') { fxOnce(kk, ft, 0, x, y - 16, me.face); break; }
  ring(x, y, col, 12, rr + 6, .34, 7); ring(x, y, '#fff', 8, rr * .7, .26, 4, .5, .04); shake(.4 + k * .35); if (n) { stop(.05 + k * .04); zoom(.03); } buzz(n ? 1 : 0); snd(n ? (h.mode === 'sky' ? 'DUN_Stomp' : 'DUN_Rock_Smash') : 'DUN_Miss', n ? .08 : .03);
  if (h.mode === 'dig') { dust(x, y, 18, 220, '#b08a58'); for (let j = 0; j < 8; j++) part({ x: x + (Math.random() - .5) * 30, y, vx: (Math.random() - .5) * 260, vy: -220 - Math.random() * 200, ay: 700, life: .6, col: j % 2 ? '#7a5a34' : '#b08a58', sz: 5 }); }
  else if (h.mode === 'dive') for (let j = 0; j < 18; j++) part({ x: x + (Math.random() - .5) * 40, y, vx: (Math.random() - .5) * 220, vy: -200 - Math.random() * 240, ay: 640, life: .6, col: j % 3 ? '#6ab4ff' : '#fff', sz: 3 + j % 2 });
  else if (h.mode === 'shadow') { flash(.08, '40,20,70'); ghost(me, .4); for (let j = 0; j < 12; j++) part({ x: x + (Math.random() - .5) * 50, y: y - Math.random() * 30, vy: -80 - Math.random() * 80, life: .5, col: j % 2 ? '#5a3a8a' : '#20102c', sz: 5 }); }
  else { dust(x, y, 16, 220); stars(x, y - 10, 6, '#fff'); } }
function hideEnd() { const me = R?.G?.me, h = me?.hide; if (!h) return; me.hide = null; me.z = 0; humOff(); me.cd[h.v.name] = me.cdMax[h.v.name] * .6; }
function drawHide(e) { const g = R.g, RT = R.RT, h = e.hide, k = Math.min(1, h.t / h.max), rr = (62 + k * 26) * rg(), x = e.x, y = e.y, el = (rx, ry, yy = y) => { g.beginPath(); g.ellipse(x, yy, Math.max(1, rx), Math.max(1, ry), 0, 0, 7); };
  g.strokeStyle = h.col; g.globalAlpha = .45 + .25 * Math.sin(RT * 12); g.lineWidth = 2; g.setLineDash([8, 6]); g.lineDashOffset = -RT * 50; el(rr, rr * .5); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  if (h.mode === 'dig') { const w = Math.sin(RT * 30) * 1.5; g.fillStyle = '#20202c'; el(21, 10); g.fill(); g.fillStyle = '#8a6a40'; el(19, 8, y - 1); g.fill(); g.fillStyle = '#b08a58'; el(15 + w, 6, y - 4); g.fill(); g.fillStyle = '#d8b888'; el(7, 3, y - 6 + w * .5); g.fill(); }
  else if (h.mode === 'dive') { g.fillStyle = 'rgba(30,60,140,.5)'; el(17, 7); g.fill(); for (let i = 0; i < 2; i++) { const p = (RT * 1.5 + i * .5) % 1; g.strokeStyle = `rgba(150,205,255,${1 - p})`; g.lineWidth = 2; el(10 + p * 22, (10 + p * 22) * .45); g.stroke(); } }
  else if (h.mode === 'shadow') { g.fillStyle = 'rgba(30,16,50,.85)'; el(22 + Math.sin(RT * 9) * 2, 9); g.fill(); g.fillStyle = '#ff5a6a'; g.fillRect(x - 7, y - 3, 4, 2); g.fillRect(x + 3, y - 3, 4, 2); }
  else { g.strokeStyle = '#fff'; g.lineWidth = 2; el(14, 6); g.stroke(); g.fillStyle = '#fff'; g.fillRect(x - 1, y - 8, 2, 16); g.fillRect(x - 12, y - 1, 24, 2); } }
// ---------- 설치 기술: 압정·독압정·스텔스록·거미줄 (밟으면 발동), 필드·날씨 ----------
const TRAPS = { spk: ['압정을 깔았다!', '#c8ccd8'], tox: ['독압정을 깔았다!', '#b070e0'], rock: ['뾰족한 바위를 띄웠다!', '#b8a060'], web: ['거미줄을 쳤다!', '#f0f0f8'] };
const FIELDS = { grass: ['그래스필드! 안에서 HP 회복', '#78c850'], elec: ['일렉트릭필드! 안의 상대가 감전', '#f8d030'], mist: ['미스트필드! 안에서 받는 피해 ↓', '#f0a0c8'], psy: ['사이코필드! 안의 상대 피해 1.4배', '#c070f0'] };
const WXS = { rain: ['비가 내린다! 물 기술 1.5배', '#6ab4ff'], sun: ['햇살이 강해졌다! 불꽃 기술 1.5배', '#ffb040'], sand: ['모래바람! 상대가 계속 피해', '#d8b878'], hail: ['싸라기눈! 상대가 계속 피해', '#c8ecff'] };
function trapSet(v) { const G = R.G, me = G.me, id = v.id, k = /toxic/.test(id) ? 'tox' : /rock/.test(id) ? 'rock' : /web/.test(id) ? 'web' : 'spk', tg = nearest(me, G.mobs, 300), a0 = tg ? Math.atan2(tg.y - me.y, tg.x - me.x) : (me.face > 0 ? 0 : Math.PI), n = k === 'web' ? 3 : k === 'rock' ? 4 : 5, A = R.A, col = TRAPS[k][1];
  for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * (k === 'web' ? .7 : .48), d = (k === 'web' ? 74 : 62 + (i % 2) * 36) * (me.buff > 0 ? 1.25 : 1), x = Math.max(A.x0, Math.min(A.x1, me.x + Math.cos(a) * d)), y = Math.max(A.y0, Math.min(A.y1, me.y + Math.sin(a) * d * .75));
    G.traps.push({ k, x, y, t0: R.T + i * .06, d: 18, col }); after(i * .06, () => { dust(x, y, 3, 60); ring(x, y, col, 4, 22, .2, 3); }); }
  while (G.traps.length > 12) G.traps.shift(); snd('DUN_Punch', .03); return TRAPS[k]; }
function trapHit(t, o) { const G = R.G, me = G.me, c = t.col; let tx;
  if (t.k === 'spk') { hurt(o, { n: Math.max(1, Math.round(o.mhp * (o.boss ? .04 : .14))), e: 1, crit: false, w: 1 }, 0, 0); o.slowT = Math.max(o.slowT || 0, 1.5); sparks(t.x, t.y - 6, 0, -1, c, 6, 200); tx = '압정!'; }
  else if (t.k === 'tox') { hurt(o, { n: Math.max(1, Math.round(o.mhp * (o.boss ? .015 : .05))), e: 1, crit: false, w: 0 }, 0, 0, true); o.dot = { t: 7, tk: .3, leech: false }; burst(t.x, t.y - 8, c, 6, 30); tx = '독!'; }
  else if (t.k === 'rock') { hurt(o, dmg(me, o, 6, me.st[1] >= me.st[3] ? 1 : 2, 75), 0, 0); dust(t.x, t.y, 8, 150, '#b8a060'); for (let j = 0; j < 5; j++) part({ x: t.x, y: t.y - 12, vx: (Math.random() - .5) * 240, vy: -120 - Math.random() * 140, ay: 640, life: .5, col: j % 2 ? '#8a7848' : '#b8a060', sz: 4 }); shake(.25); snd('DUN_Rock_Smash', .06); tx = '스텔스록!'; }
  else { o.dz = o.boss ? 1 : 2.8; o.stun = Math.max(o.stun || 0, o.dz); o.warn = 0; o.lunge = o.slam = null; o.z = 0; o.slowT = 6; stars(o.x, o.y - 20, 5, '#fff', 120); squash(o, .3); snd('DUN_Leer', .04); tx = '걸렸다!'; }
  pop(o.x, o.y - 52, tx, c, true); buzz(0); }
function fieldSet(v) { const G = R.G, me = G.me, k = /grassy/.test(v.id) ? 'grass' : /electric/.test(v.id) ? 'elec' : /misty/.test(v.id) ? 'mist' : 'psy', col = FIELDS[k][1];
  G.fields = [{ k, x: me.x, y: me.y, r: 112 * (me.buff > 0 ? 1.3 : 1), t0: R.T, d: 10, tk: .2, col }]; ring(me.x, me.y, col, 14, 130, .45, 7); ring(me.x, me.y, '#fff', 8, 90, .35, 3, .5, .06); shake(.2); return FIELDS[k]; }
function wxSet(v) { const G = R.G, k = /rain/.test(v.id) ? 'rain' : /sunny/.test(v.id) ? 'sun' : /sand/.test(v.id) ? 'sand' : 'hail'; G.wx = { k, t: 12, tk: 1 }; flash(.1, k === 'sun' ? '255,220,140' : k === 'sand' ? '216,184,120' : '160,200,255'); shake(.15); return WXS[k]; }
function fieldStep(dt) { const G = R.G, me = G.me, T = R.T, inF = (f, e) => Math.hypot(e.x - f.x, (e.y - f.y) * 2) < f.r, live = o => o.hp > 0 && o.enter <= 0;
  for (const t of G.traps) { if (T < t.t0 + .25) continue; for (const o of G.mobs) { if (!live(o) || o.z > 20 || Math.hypot(o.x - t.x, (o.y - t.y) * 1.4) > (t.k === 'web' ? 26 : 20) + bR(o, 12)) continue; t.hit = 1; trapHit(t, o); break; } }
  G.traps = G.traps.filter(t => !t.hit && T - t.t0 < t.d);
  for (const f of G.fields) { if ((f.tk -= dt) > 0) continue; f.tk = .5;
    if (f.k === 'grass') { if (me.hp > 0 && me.hp < me.mhp && inF(f, me)) { me.hp = Math.min(me.mhp, me.hp + Math.max(1, Math.round(me.mhp * .025))); part({ x: me.x + (Math.random() - .5) * 20, y: me.y - 10, vy: -70, life: .5, col: '#8ff0a0', sz: 4 }); } }
    else if (f.k === 'mist') { if (inF(f, me)) me.guard = Math.max(me.guard, .7); }
    else for (const o of G.mobs) { if (!live(o) || !inF(f, o)) continue; if (f.k === 'psy') o.weak = Math.max(o.weak || 0, .7); else { hurt(o, { n: Math.max(1, Math.round(o.mhp * (o.boss ? .01 : .04))), e: 1, crit: false, w: 0 }, 0, 0, true); o.slowT = Math.max(o.slowT || 0, .8); sparks(o.x, o.y - 20, 0, -1, '#f8d030', 3, 160); } } }
  G.fields = G.fields.filter(f => T - f.t0 < f.d);
  const w = G.wx; if (w) { w.t -= dt; if ((w.k === 'sand' || w.k === 'hail') && (w.tk -= dt) <= 0) { w.tk = 1; for (const o of G.mobs) if (live(o)) hurt(o, { n: Math.max(1, Math.round(o.mhp * (o.boss ? .008 : .03))), e: 1, crit: false, w: 0 }, 0, 0, true); } if (w.t <= 0) G.wx = null; } }
function drawTrap(t) { const g = R.g, T = R.T, RT = R.RT, el = T - t.t0; if (el < 0) return; const a = Math.min(1, el * 6), left = t.d - el; if (left < 2 && Math.floor(RT * 10) % 2) return; const x = t.x, y = t.y;
  if (t.k === 'web') { g.save(); g.translate(x, y); g.scale(a, a * .55); g.strokeStyle = '#20202c'; for (const [lw, c] of [[4, '#20202c'], [2, '#f0f0f8']]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 4; g.moveTo(Math.cos(an) * 26, Math.sin(an) * 26); g.lineTo(-Math.cos(an) * 26, -Math.sin(an) * 26); } for (const r of [10, 19]) { for (let i = 0; i <= 8; i++) { const an = i * Math.PI / 4; i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(r, 0); } } g.stroke(); } g.restore(); return; }
  if (t.k === 'rock') { const b = Math.sin(RT * 3 + x) * 3, yy = y - 14 + b - (1 - a) * 30; g.fillStyle = 'rgba(20,40,10,.25)'; g.beginPath(); g.ellipse(x, y, 9, 4, 0, 0, 7); g.fill(); const d = (r, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, yy - r - 2); g.lineTo(x + r, yy); g.lineTo(x + 2, yy + r); g.lineTo(x - r, yy + 2); g.closePath(); g.fill(); }; d(11, '#20202c'); d(9, '#b8a060'); g.fillStyle = '#e8d8a0'; g.fillRect(x - 3, yy - 6, 4, 3); g.fillStyle = '#8a7848'; g.fillRect(x, yy + 1, 5, 3); return; }
  for (let i = 0; i < 3; i++) { const sx = x + (i - 1) * 9, sy = y + (i === 1 ? -3 : 2), hh = 10 * a, tri = (w, h, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(sx - w, sy); g.lineTo(sx, sy - h); g.lineTo(sx + w, sy); g.closePath(); g.fill(); }; tri(6, hh + 3, '#20202c'); tri(4, hh, t.col); g.fillStyle = '#fff'; g.fillRect(sx - 1, sy - hh + 2, 1, Math.max(1, hh - 4)); } }
function drawField(f) { const g = R.g, RT = R.RT, t = R.T - f.t0, a = Math.min(1, t * 4, (f.d - t) * 2), r = f.r * Math.min(1, t * 5 + .3);
  g.globalAlpha = .2 * a; g.fillStyle = f.col; g.beginPath(); g.ellipse(f.x, f.y, r, r * .5, 0, 0, 7); g.fill(); g.globalAlpha = .8 * a; g.strokeStyle = f.col; g.lineWidth = 3; g.setLineDash([14, 10]); g.lineDashOffset = RT * 30; g.beginPath(); g.ellipse(f.x, f.y, r, r * .5, 0, 0, 7); g.stroke(); g.setLineDash([]);
  for (let i = 0; i < 12; i++) { const ph = (RT * .7 + i * .37) % 1, an = i * 2.4, rr = r * (.2 + (i * .61 % .75)), x = f.x + Math.cos(an) * rr, y = f.y + Math.sin(an) * rr * .5 - ph * 26; g.globalAlpha = a * (1 - ph); g.fillStyle = i % 3 ? f.col : '#fff'; g.fillRect(x - 1.5, y - 1.5, 3, f.k === 'grass' ? 6 : 3); } g.globalAlpha = 1; }
function drawWx() { const G = R.G, w = G?.wx; if (!w) return; const g = R.g, RT = R.RT, W = R.W, H = R.H, a = Math.min(1, w.t, (12 - w.t) * 3), k = w.k;
  g.fillStyle = `rgba(${k === 'rain' ? '50,80,150' : k === 'sun' ? '255,190,70' : k === 'sand' ? '200,165,95' : '200,230,255'},${(k === 'sand' ? .2 : .13) * a})`; g.fillRect(0, 0, W, H);
  if (k === 'sun') { const gr = g.createLinearGradient(0, 0, W * .6, H * .7); gr.addColorStop(0, `rgba(255,240,170,${.4 * a})`); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return; }
  g.globalAlpha = a * (k === 'sand' ? .5 : .7); g.fillStyle = k === 'rain' ? '#c8e0ff' : k === 'sand' ? '#f0dcae' : '#fff';
  for (let i = 0; i < 46; i++) { const s = i * 97.13, sp = k === 'rain' ? 900 : k === 'sand' ? 700 : 150, ph = (RT * sp * (.7 + (i % 5) * .12) + s * 7) % (H + 60);
    if (k === 'rain') { const x = ((s * 3.7 - ph * .25) % (W + 60) + W + 60) % (W + 60) - 30; g.fillRect(x, ph - 30, 2, 14); }
    else if (k === 'sand') { const y = (s * 5.3) % H, x = ((RT * sp * (.7 + (i % 5) * .12) + s * 11) % (W + 80)) - 40; g.fillRect(x, y, 16 + i % 3 * 8, 2); }
    else { const x = ((s * 3.7 + Math.sin(RT * 2 + i) * 12) % W + W) % W, sz = 2 + i % 3; g.fillRect(x, ph - 30, sz, sz); } }
  g.globalAlpha = 1; }
function chEnd() { const me = R?.G?.me, c = me?.ch; if (!c) return; me.ch = null; humOff(); me.cd[c.v.name] = me.cdMax[c.v.name] * (.5 + .5 * Math.min(1, c.t / c.max)); me.busy = Math.max(me.busy, .08); if (c.kind === 'stream') squash(me, .12); }
function dashEnd() { const me = R?.G?.me, d = me?.dash; if (!d) return; me.dash = null; if (d.hold != null) { humOff(); me.cd[d.v.name] = me.cdMax[d.v.name] * (.5 + .5 * Math.min(1, d.el / d.max)); squash(me, .16); dust(me.x, me.y, 4, 80); } }
function drainTo(v, o, n) { const me = R.G.me; if (!v.A?.drain || me.hp <= 0 || me.hp >= me.mhp) return; me.hp = Math.min(me.mhp, me.hp + Math.max(1, Math.round(n * .3))); for (let i = 0; i < 3; i++) fly('xp', o.x, o.y - 20, () => ({ x: me.x, y: me.y - 22 }), null, '#8ff0a0'); }
function hitFx(Rr, o, delay, f, col, kx = 0, ky = 0, light) {
  if (light) { if (!o.lfx || R.T - o.lfx > .28) { o.lfx = R.T; ring(o.x, o.y - 20, col, 4, 18, .16, 3, 1); } return; }
  const H2 = (Rr?.e || []).filter(e => e[0] === 'hit'); for (const [, kk, ft] of H2) fxOnce(kk, ft, delay, o.x, o.y - 20, f);
  if (!H2.length) { if (PX()?.s.Hit_Neutral) fxOnce('Hit_Neutral', 2, delay, o.x, o.y - 20, f); else burst(o.x, o.y - 20, col, 4, 26); }
  ring(o.x, o.y - 20, col, 4, 24, .18, 4, 1, delay);
}
function hurt(o, r, kx, ky, light) {
  const G = R?.G; if (!G || o.hp <= 0 || o.mgT > 0) return; const me = G.me; if (o.weak > 0) r = { ...r, n: Math.round(r.n * 1.4) }; if (o.groggy > 0) r = { ...r, n: Math.round(r.n * 1.5) };
  { const l = Math.hypot(kx, ky); if (l < .05) { const d = Math.hypot(o.x - me.x, o.y - me.y) || 1; kx = (o.x - me.x) / d; ky = (o.y - me.y) / d; } }
  const l = Math.hypot(kx, ky) || 1, ux = kx / l, uy = ky / l, big = r.e > 1 || r.crit, lt = !!light && !r.crit, col = r.crit ? '#ff9a3a' : r.e > 1 ? '#ffd84a' : r.e < 1 ? '#c8c8d8' : '#ffffff';
  o.hp -= r.n; o.flash = lt ? .07 : big ? .16 : .11; squash(o, lt ? .14 : big ? .36 : .26);
  const w = r.w ?? 1, kb = WT.kb[w] * (o.boss ? .35 : 1) * (lt ? .5 : 1) * (r.crit ? 1.3 : 1); o.kx = kx * kb; o.ky = ky * kb * .7; if (!o.boss || Math.random() < .4) setAnim(o, 'Hurt', !lt || o.anim !== 'Hurt'); o.stun = Math.max(o.stun || 0, o.boss ? (lt || o.act || o.slam || o.lunge || o.chain != null || o.warn > 0 ? 0 : .1) : (lt ? (o.warn > 0 || o.lunge ? 0 : .12) : .35));   /* 잡몹도 잔타로는 공격 준비가 안 멈춘다 (경완 2026-11-14 '코드에 있는데 반영 안 된 것': 계속 때리면 굳어서 공격을 못 했다) */   /* 대장은 잔타로는 안 멈추고, 패턴 중에는 아예 안 멈춘다 (빔을 대고 있으면 계속 굳어서 아무것도 못 했다) */
  if (o.boss && (o.warn > 0) && big && o.chain == null) { o.warn = 0; o.shoot = false; o.cd = .6; }
  if (o.boss) brkAdd(o, r);
  if (!o.boss && o.temp === 'aggr' && !o.rage && o.hp > 0 && o.hp < o.mhp * .4) { o.rage = 1; pop(o.x, o.y - 62, '화났다!', '#ff4a3a'); }
  if (!o.boss && o.temp === 'timid' && !o.fled && o.hp > 0 && o.hp < o.mhp * .5) { o.fled = 1; o.flee = 2.2; o.warn = 0; pop(o.x, o.y - 62, '겁먹었다!', '#9fc4ff'); }
  if (o.boss && !o.rage && o.hp > 0 && o.hp < o.mhp * .4) { o.rage = 1; pop(o.x, o.y - 90, '분노!', '#ff4a3a', true); ring(o.x, o.y, '#ff4a3a', 14, 130, .45, 7); shake(.5); flash(.14, '255,90,70'); se('KON2', .3); rumble(2, 90, 1); }
  if (o.boss === 2 && !o.mega && o.hp > 0 && o.hp < o.mhp * .5) megaPhase(o);
  // 손맛: 멈칫 + 흔들림 + 맞은 방향으로 화면 밀림 + 불똥 + 진동
  if (lt) { R.TR = Math.max(R.TR, .16); kick(ux, uy, 1.5); sparks(o.x, o.y - 20, ux, uy, TYPE_C[tysOf(me.sp)[0]] || '#ffe27a', 3, 240); }   /* 잔타: 멈칫 없이 약한 흔들림만 깔아 둔다 */
  else { stop(WT.stop[w] + (big ? .03 : 0)); shake(WT.shake[w] + (big ? .1 : 0)); kick(ux, uy, 3 + w * 2 + (big ? 2 : 0)); buzz(big || w >= 2 ? 1 : 0); sparks(o.x, o.y - 20, ux, uy, TYPE_C[tysOf(me.sp)[0]] || '#ffe27a', 5 + w * 2 + (big ? 4 : 0), 250 + w * 40); }
  // 0.4초 안에 또 맞으면 숫자를 따로 띄우지 않고 합쳐서 키운다
  { const q = o.pp; if (q && R.RT - q.t0 < .4 && R.POPS.includes(q)) { q.txt += r.n; q.t0 = R.RT - .06; q.sz = Math.min(34, (q.sz || 17) + 1.5); if (big) { q.col = col; q.big = true; } if (r.crit) q.crit = 1; }
    else { o.pp = pop(o.x, o.y - 50, r.n, col, big && !lt, ux * 26, uy * 12); o.pp.sz = WT.num[w] + (big ? 4 : 0) - (lt ? 3 : 0); if (r.crit) o.pp.crit = 1; } }
  if (r.crit) { pop(o.x, o.y - 74, '급소!', '#ff9a3a', true); se('KOUKA_H'); snd('DUN_Punch', .06); stars(o.x, o.y - 24, 5, '#ffb04a', 220); }
  else if (r.e > 1) { se('KOUKA_H', lt ? .16 : .07, { gain: lt ? .6 : 1 }); if (!o.seTold) { o.seTold = 1; pop(o.x, o.y - 72, '효과가 굉장했다!', '#ffd84a'); } }
  else se(r.e < 1 ? 'KOUKA_L' : 'KOUKA_M', lt ? .16 : .07, { gain: lt ? .6 : 1 });
  // 콤보: 이어 맞힐수록 기술이 빨리 다시 찬다 (맞으면 끊김)
  G.combo++; G.comboT = 2.5; G.best = Math.max(G.best, G.combo); cbUi(true);
  if (G.combo % 10 === 0) { pop(me.x, me.y - 78, `${G.combo} 콤보!`, '#ffe27a', true); buzz(1); stars(me.x, me.y - 30, 8); if (G.combo % BAG_COMBO_N === 0) bagDrop(me.x + (Math.random() - .5) * 60, me.y - 10, BAG_COMBO); }
  if (o.hp <= 0) ko(o, ux, uy);
}
function ko(o, ux, uy) {
  const G = R.G, me = G.me; if (o.boss === 2 && giftDue()) G.boxOn = 1; o.hp = 0; o.dead = R.T; o.warn = 0; o.lunge = o.slam = null; setAnim(o, 'Hurt', true); G.ko++;
  // 날아가서 통통 튀다 펑
  o.dvx = ux * (o.boss ? 230 : 430); o.dvy = uy * (o.boss ? 150 : 280); o.zv = o.boss ? 260 : 330; o.spin = (ux >= 0 ? 1 : -1) * (o.boss ? 5 : 11); o.rot = 0; o.flash = .22;
  const last = !G.pend && G.mobs.every(m => m === o || m.hp <= 0), fin = last && G.wave >= STAGES.length;
  stop(o.boss ? .2 : .1); shake(o.boss ? .9 : .32); kick(ux, uy, o.boss ? 12 : 7); zoom(o.boss ? .1 : .035);
  se('POKE_DEAD', .12); if (o.boss) { rumble(4, 65); snd('DUN_Explosion', .09); flash(.3); } else buzz(1);
  if (last) { slow(fin ? .95 : .5, fin ? .22 : .35); if (!o.boss) flash(.12); }   // 마지막 한 마리는 느리게 날아간다
  const cr = Math.random(), coins = o.boss === 2 ? [] : o.boss ? [1, 1, 1] : o.minion ? [] : [cr < .01 ? 3 : cr < .07 ? 2 : 1];   /* 경완 '잡몹은 동전 다 떨구긴 했으면': 모두 하나씩, 대신 은·금은 드물게 */   /* 골드는 바닥에 떨어지고 주워야 내 것, 색마다 값이 다름 */
  const ex = o.minion ? 0 : Math.round(G.xpB * (o.boss === 2 ? XW.fin : o.boss ? XW.mid : XW.mob(G.wave - 1)) / XW_ALL); G.exp += ex;
  const y = EVY()[o.sp] || '', evAdd = +y[G.stat] || 0, before = G.ev; G.evRaw += evAdd / 6; G.ev = Math.min(EV_CAP, G.M.evRoom, Math.floor(G.evRaw + 1e-6));
  const evUp = G.ev - before, egLeft = G.M.eg ? Math.min(EG_CAP + (o.boss === 2 ? EG_CLEAR : 0), 99 - G.egg0) - G.shard - G.drops.reduce((a, p) => a + (p.sh ? EGV[p.sh] : 0), 0) : 0;
  let shard = o.boss === 2 ? 3 : o.boss ? (Math.random() < .5 ? 1 : 0) : Math.random() < .015 ? 1 : 0; while (shard && EGV[shard] > egLeft) shard--;
  // 펑 터지는 순간에 보상이 튀어나온다
  after(.42, () => { const x = o.x, yy = o.y;
    fxOnce(PX()?.s.Smoke_White ? 'Smoke_White' : 'Wood_Hammer_Smoke', 2, 0, x, yy - 14, 1, { s: o.boss ? 1.3 : .9 }); stars(x, yy - 16, o.boss ? 14 : 6, '#fff', o.boss ? 300 : 200); dust(x, yy, o.boss ? 12 : 5, 120); ring(x, yy, '#fff', 6, o.boss ? 90 : 44, .3, 5);
    if (o.boss) { shake(.5); rumble(2, 80, 1); } else buzz(0); snd('DUN_Rock_Smash', o.boss ? .07 : .035);
    if (ex) pop(x, yy - 34, `+${ex} 경험치`, '#bfe6ff'); if (evUp > 0) pop(x, yy - 54, `${STAT_KO[G.stat]} 노력치 +${evUp}`, '#d6b4ff', true);
    if (o.boss) bagDrop(x, yy - 4, BAG_B[G.wave] || 12); if (o.boss === 2) { coinRain(x, yy - 6, RAIN_MEGA); if (G.boxOn) G.drops.push({ box: 1, x, y: yy - 4, t0: R.T, vy: -300, z: 18, vx: 26, gy: 22 }); after(1.3, () => { if (R?.G !== G || G.over) return; const A = R.A; let mx = Math.max(A.x0 + 30, Math.min(A.x1 - 30, x - 54)), my = Math.max(A.y0 + 30, Math.min(A.y1 - 20, yy + 34)); if (inPond(mx, my, 20)) my = R.Y.pond.y0 - 24; G.items = G.items.filter(it => it.k !== 'magnet'); G.items.push({ k: 'magnet', x: mx, y: my, t0: R.T, keep: 1 }); ring(mx, my, '#fff', 30, 6, .3, 3); ring(mx, my, '#ff9a9a', 44, 8, .4, 4, .5, .1); se('KON', .2, { gain: 1.4 }); });   /* 경완 2026-11-16 '시간 지나면 알아서 먹어지게 하지 말고 자석 아이템을 같이 떨구고 자석 아이템 사라지지 않게. 자석 먹으면 골드 다 빨아들여지는데 상자는 안 빨아들여지게' */ }
    coins.forEach(cv => { const a = Math.random() * 6.28, v = coins.length > 1 ? 50 + Math.random() * 80 : 15 + Math.random() * 35; G.drops.push({ coin: cv, val: cval(cv, G.wave), x, y: yy - 4, t0: R.T, vy: -170 - Math.random() * 90, z: 12, vx: Math.cos(a) * v, gy: Math.sin(a) * v * .6 }); });
    for (let i = 0; i < (o.boss ? 8 : 3); i++) fly('xp', x, yy - 14, () => ({ x: me.x, y: me.y - 22 }), null, '#8fd0ff');
    if (shard) G.drops.push({ sh: shard, x, y: yy - 4, t0: R.T, vy: -150, z: 10, vx: (Math.random() - .5) * 60 });
    hud(); });
}

// ---------- 회피 (딱 맞춰 피하면 저스트 회피) ----------
function dodge() {
  const G = R?.G, me = G?.me; if (!R.run || !me || me.hp <= 0 || me.dcd > 0 || G.over || me.hide) return; const J = R.JOY;
  let dx = J.dx, dy = J.dy; if (Math.hypot(dx, dy) < .2) { dx = me.face; dy = 0; } const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  chEnd(); dashEnd(); me.dash = { vx: dx * 560, vy: dy * 560, t: .2, roll: true, gt: 0 }; me.inv = .4; me.roll = .36; me.just = false; me.dcd = .8; me.busy = 0; R.BUF = null;
  se('HURU', .1); buzz(0); setAnim(me, 'Walk', true); me.rollF = dx >= 0 ? 1 : -1; squash(me, .2); dust(me.x, me.y, 7, 110);   /* 경완 2026-11-14 '점프 말고 구르는 모션': 구르기(Tumble) 그림은 1099종 중 225종뿐이라 모두 같게 몸을 말아 한 바퀴 굴린다 */
  pressEl(R.q('.ya-dg'));
}
function justDodge(o) {
  const G = R.G, me = G.me; if (me.just) return; me.just = true; G.just++; se('KIRAN');
  slow(.6, .28); flash(.14, '170,220,255'); zoom(.05); buzz(1); setTimeout(() => R && buzz(0), 110); snd('DUN_Double_Team', .07);
  me.inv = Math.max(me.inv, .7); me.crit = 3; me.dcd = 0; for (const k in me.cd) me.cd[k] *= .35;
  pop(me.x, me.y - 76, '아슬아슬 회피!', '#9fe4ff', true); G.drops.push({ coin: 1, val: 2, x: me.x, y: me.y - 6, t0: R.T, vy: -200, z: 12, vx: (Math.random() - .5) * 60, gy: (Math.random() - .5) * 30 }); ring(me.x, me.y, '#9fe4ff', 10, 90, .4, 6); stars(me.x, me.y - 24, 8, '#9fe4ff');
  for (let i = 0; i < 3; i++) after(i * .03, () => ghost(me, .5));
}

// ---------- 매 프레임 ----------
function step(dt) {
  const G = R.G, me = G.me, J = R.JOY, T = R.T, live = R.run && !G.over;
  for (let i = R.Q.length - 1; i >= 0; i--) { const q = R.Q[i]; if (q.t <= T) { R.Q.splice(i, 1); if (q.G === G) q.fn(); } }
  me.inv = Math.max(0, me.inv - dt); me.roll = Math.max(0, me.roll - dt); me.dcd = Math.max(0, me.dcd - dt); me.flash = Math.max(0, me.flash - dt); me.busy = Math.max(0, me.busy - dt); me.buff = Math.max(0, me.buff - dt); for (const k of ['shrink', 'clone', 'haste', 'guard', 'prot']) me[k] = Math.max(0, me[k] - dt); me.crit = Math.max(0, me.crit - dt);
  spring(me, dt);
  if (live && me.hp > 0 && (me.ampT = (me.ampT || 0) - dt) <= 0) { me.ampT = .07; const L = G.M.mv.filter(ampOf); if (L.length) { const v = L[Math.floor(Math.random() * L.length)]; part({ x: me.x + (Math.random() - .5) * 30, y: me.y - Math.random() * 12, vx: (Math.random() - .5) * 20, vy: -80 - Math.random() * 70, life: .4 + Math.random() * .25, sz: Math.random() < .5 ? 4 : 3, col: Math.random() < .75 ? (TYPE_C[v.t] || '#fff') : '#fff' }); } }
  if (live) { const rate = 1 + Math.min(.45, G.combo * .015) + (me.haste > 0 ? .5 : 0); for (const k in me.cd) if (me.cd[k] < 90) me.cd[k] = Math.max(0, me.cd[k] - dt * rate);
    if (G.combo && (G.comboT -= dt) <= 0) { G.combo = 0; cbUi(); }
    if (!G.clearT) G.time += dt; G.mag = Math.max(0, G.mag - dt);
    if (G.queue.length && (G.qT -= dt) <= 0 && G.mobs.filter(o => o.hp > 0).length < MOB_MAX(G.wave)) { spawn(G.queue.shift()); G.qT = .4; setPend(); }
    if (!G.clearT && (G.itT -= dt) <= 0) { G.itT = 10 + Math.random() * 6; if (G.items.length < 2) itemSpawn(); }
    for (const it of G.items) if (T - it.t0 > .4 && me.hp > 0 && Math.hypot(me.x - it.x, pickY(me, it.y) - it.y) < 26) { it.got = 1; itemUse(it); }
    G.items = G.items.filter(it => !it.got && (it.keep || T - it.t0 < 14));
  }
  if (me.kx || me.ky) { me.x += me.kx * dt; me.y += me.ky * dt; const k = Math.pow(.0006, dt); me.kx *= k; me.ky *= k; if (Math.abs(me.kx) + Math.abs(me.ky) < 4) me.kx = me.ky = 0; keepIn(me); }
  if (!(me.hp > 0 && live) && (me.ch || me.hide || me.dash?.hold != null)) { chEnd(); dashEnd(); hideEnd(); }
  if (me.hp > 0 && live) {
    if (me.dash) { const d = me.dash;
      if (d.hold != null) {   // 누르는 동안 달리는 돌진: 스틱 쪽으로 방향을 튼다
        d.el += dt; hum(dt); const m = Math.hypot(J.dx, J.dy); if (m > .3) { const a0 = Math.atan2(d.vy, d.vx), a1 = Math.atan2(J.dy, J.dx); let da = a1 - a0; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; const a = a0 + Math.max(-5 * dt, Math.min(5 * dt, da)); d.vx = Math.cos(a) * 600; d.vy = Math.sin(a) * 600; me.face = d.vx >= 0 ? 1 : -1; }
        if (me.once && T - me.at > .3) setAnim(me, anyAnim(me, 'QuickStrike', 'Walk'), true); }
      if (d.step || d.hold != null) me.inv = Math.max(me.inv, .12);   /* 기술 쓰러 달려드는 동안엔 안 맞는다 (경완 2026-11-13) */
      me.x += d.vx * dt; me.y += d.vy * dt; d.t -= dt; keepIn(me);
      if ((d.gt -= dt) <= 0) { d.gt = .035; ghost(me, d.roll ? .3 : .22); if (!d.step) part({ kind: 'line', x: me.x + (Math.random() - .5) * 20, y: me.y - 8 - Math.random() * 26, vx: -d.vx * .5, vy: -d.vy * .5, life: .14, sz: 2, col: '#fff' }); if (d.hold != null) dust(me.x, me.y, 1, 50); if (d.amp) part({ x: me.x + (Math.random() - .5) * 24, y: me.y - 6 - Math.random() * 30, vx: -d.vx * .2, vy: -d.vy * .2 - 40, life: .3, sz: 5, col: Math.random() < .6 ? TYPE_C[d.v.t] : '#fff' }); }
      if (d.hit) for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && !(T - (d.hit.get(o) ?? -9) < .32) && Math.hypot(o.x - me.x, o.y - me.y) < 32 * rg() * (d.amp ? 1.2 : 1) + bR(o, 12)) { const again = d.hit.has(o); if (d.amp) { ring(o.x, o.y - 20, '#fff', 6, 44, .2, 5, 1); sparks(o.x, o.y - 20, d.vx, d.vy, TYPE_C[d.v.t], 8, 340); shake(.14); } d.hit.set(o, T); const v = d.v, l = Math.hypot(d.vx, d.vy) || 1; hurt(o, dmg(me, o, v.t, v.c, v.pw * (again ? .4 : .8), v.pw), d.vx / l * 1.1, d.vy / l * 1.1, again); hitFx(v.Rr, o, 0, me.face, TYPE_C[v.t], d.vx / l, d.vy / l, again); }
      if (d.hold != null ? ((!R.HELD[d.hold] && d.el >= d.min) || d.el >= d.max) : d.t <= 0) { if (d.hold != null) dashEnd(); else { me.dash = null; if (d.roll) { squash(me, .16); dust(me.x, me.y, 3, 60); } } } }
    else if (me.hide) hideStep(dt);
    else if (me.ch) { const c = me.ch, K = c.K; c.t += dt; hum(dt);
      // 겨눔은 가까운 상대를 천천히 따라간다 (줄기는 휘두르는 맛)
      const tg = nearest(me, G.mobs, c.kind === 'melee' ? MELEE_R * rg() : 300); if (tg) { const a1 = Math.atan2(tg.y - me.y, tg.x - me.x); let da = a1 - c.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; const w = (c.kind === 'stream' ? 2 : 9) * dt; c.ang += Math.max(-w, Math.min(w, da)); }
      me.face = Math.cos(c.ang) >= 0 ? 1 : -1;
      if (K.mv) { const sp = (120 + me.st[5] * .5) * K.mv * (me.haste > 0 ? 1.6 : 1); if (Math.hypot(J.dx, J.dy) > .15) { me.x += J.dx * sp * dt; me.y += J.dy * sp * dt; keepIn(me); } }
      if (me.once && T - me.at > .32 && c.kind !== 'melee') setAnim(me, me.anim, true);
      if ((c.sndT -= dt) <= 0 && c.kind === 'stream') { c.sndT = .6; const a = c.v.Rr?.snd?.find(x => x[0] === 'act'); if (a) snd(a[1], a[3] * .7); }
      if ((c.tk -= dt) <= 0) chTick(c);
      if (c.kind === 'stream' && Math.random() < dt * (c.amp ? 110 : 40)) { const dx = Math.cos(c.ang), dy = Math.sin(c.ang), r = 20 + Math.random() * Math.min(BEAM * rg(), 40 + c.t * 1100) * .9; part({ x: me.x + dx * r + (Math.random() - .5) * 16, y: me.y - 20 + dy * r + (Math.random() - .5) * 16, vx: dx * 120 + (Math.random() - .5) * 60, vy: dy * 120 - 30, life: .3, sz: 3, col: Math.random() < .5 ? c.col : '#fff' }); }
      if ((!R.HELD[c.i] && c.t >= K.min + (c.wd || 0)) || c.t >= c.max + (c.wd || 0)) chEnd(); }
    else if (me.busy <= 0) { const sp = (120 + me.st[5] * .5) * (me.haste > 0 ? 1.6 : me.shrink > 0 ? 1.15 : 1) * pitK(me), m = Math.hypot(J.dx, J.dy); if (me.haste > 0 && m > .15 && (me.hgT = (me.hgT || 0) - dt) <= 0) { me.hgT = .06; ghost(me, .2); }
      if (m > .15) { me.x += J.dx * sp * dt; me.y += J.dy * sp * dt; if (Math.abs(J.dx) > .2) me.face = J.dx > 0 ? 1 : -1; me.up = J.dy < -.6 && Math.abs(J.dx) < .5; setAnim(me, 'Walk'); keepIn(me);
        if ((me.stepT -= dt) <= 0) { me.stepT = .2; dust(me.x - J.dx * 6, me.y, 1, 26); } }
      else if (!me.once || T - me.at > .5) setAnim(me, 'Idle'); }
    // 미리 누른 기술·누르고 있는 기술
    if (me.busy <= 0 && !me.dash && !me.ch && !me.hide) { const B = R.BUF, mv = G.M.mv;
      if (B && R.RT - B.t < .35) { if (me.cd[mv[B.i]?.name] <= 0) useMove(B.i); } else { R.BUF = null; for (const i in R.HELD) if (mv[i] && me.cd[mv[i].name] <= 0) { useMove(+i); break; } } }
  }
  for (const o of G.mobs) {
    o.flash = Math.max(0, o.flash - dt); spring(o, dt); if (o.rage && o.hp > 0 && Math.random() < dt * 14) part({ x: o.x + (Math.random() - .5) * 36, y: o.y - Math.random() * 16, vy: -90 - Math.random() * 60, life: .4, sz: 4, col: Math.random() < .7 ? '#ff4a3a' : '#ffb04a' }); if (o.weak > 0) o.weak -= dt; if (o.slowT > 0) o.slowT -= dt; if (o.dz > 0) o.dz -= dt;
    if (o.dot && o.hp > 0) { o.dot.t -= dt; if ((o.dot.tk -= dt) <= 0) { o.dot.tk = .5; const n = Math.max(1, Math.round(o.mhp * (o.boss ? .012 : .04))); part({ x: o.x + (Math.random() - .5) * 16, y: o.y - 30, vy: -40, life: .5, col: '#b070e0', sz: 4 }); if (o.dot.leech && me.hp > 0) me.hp = Math.min(me.mhp, me.hp + Math.max(1, Math.round(n * .5))); hurt(o, { n, e: 1, crit: false, w: 0 }, 0, 0, true); } if (o.dot && (o.dot.t <= 0 || o.hp <= 0)) o.dot = null; }
    if (o.hpLag > o.hp) { o.lagT = (o.lagT || 0) + dt; if (o.lagT > .28) o.hpLag = Math.max(o.hp, o.hpLag - o.mhp * dt * 1.4); } else { o.hpLag = o.hp; o.lagT = 0; }
    if (o.hp <= 0) {   // 날아가서 튀다가 사라짐
      const t = T - o.dead; o.x += o.dvx * dt; o.y += o.dvy * dt; const k = Math.pow(.04, dt); o.dvx *= k; o.dvy *= k; o.x = Math.max(8, Math.min(R.W - 8, o.x)); o.y = Math.max(R.A.y0 - 20, Math.min(R.H - 8, o.y));
      o.zv -= 1100 * dt; o.z += o.zv * dt; if (o.z < 0) { o.z = 0; if (o.zv < -120) { o.zv = -o.zv * .45; dust(o.x, o.y, 3, 70); squash(o, .3); if (o.boss) shake(.3); } else o.zv = 0; }
      o.rot += o.spin * dt; o.fade = t > .34 ? Math.max(0, 1 - (t - .34) / .1) : 1; continue; }
    if (o.enter > 0) { o.enter -= dt; if (o.ball) { o.ball.t += dt; if (o.ball.t >= BALL_FLY) ballPop(o); } if (o.drop) { o.z = 420 * Math.pow(Math.max(0, o.enter) / .7, 1.6); if (o.enter <= 0) bossLand(o); } continue; }
    if (o.kx || o.ky) { o.x += o.kx * dt; o.y += o.ky * dt; const k = Math.pow(.0015, dt); o.kx *= k; o.ky *= k; if (Math.abs(o.kx) + Math.abs(o.ky) < 4) o.kx = o.ky = 0; keepIn(o); }
    if (!live) { if (!o.slam && !o.lunge) setAnim(o, 'Idle'); o.warn = 0; continue; }
    if (o.brkLock > 0) o.brkLock -= dt;
    if (o.mgT > 0) { o.mgT -= dt; if (Math.random() < dt * 60) { const an = Math.random() * 6.28, rr = 90 + Math.random() * 50; part({ x: o.x + Math.cos(an) * rr, y: o.y - 24 + Math.sin(an) * rr * .7, vx: -Math.cos(an) * rr * 2.6, vy: -Math.sin(an) * rr * 1.8, life: .34, sz: 4, col: MEGA_C[Math.floor(Math.random() * 6)] }); } if (o.mgT <= 0) megaDone(o); continue; }
    if (o.mega && Math.random() < dt * 16) part({ x: o.x + (Math.random() - .5) * 50, y: o.y - Math.random() * 20, vy: -100 - Math.random() * 70, life: .45, sz: 4, col: MEGA_C[Math.floor(Math.random() * 6)] });
    if (o.groggy > 0) { o.groggy -= dt; if (o.groggy <= 0) { o.brk = 0; o.brkMax *= 1.3; o.brkLock = 3; o.cd = .5; o.dz = 0; setAnim(o, 'Idle'); squash(o, -.3); ring(o.x, o.y, '#ff8a6a', 10, 80, .3, 5); } continue; }
    if (o.stun > 0) { o.stun -= dt; continue; }
    const dx = me.x - o.x, dy = me.y - o.y, d = Math.hypot(dx, dy) || 1; if (!o.lunge && !o.slam && !(o.warn > 0 && o.warn < .15)) o.face = dx > 0 ? 1 : -1; o.cd -= dt * (o.boss || o.temp !== 'aggr' ? 1 : o.rage ? 1.9 : 1.4);
    const touch = (r, fn) => { if (me.hp <= 0) return false; if (!r) return false; if (me.inv <= 0) { fn(); return true; } if (me.roll > 0) justDodge(o); return true; };
    if (o.act) { bossAct(o, dt); continue; }
    if (o.slam) {   // 대장 내려찍기: 뛰어올라 예고한 동그라미로 떨어진다
      const L = o.slam; L.t += dt; const p = Math.min(1, L.t / L.d), e = p * p * (3 - 2 * p); o.x = L.x0 + (L.x - L.x0) * e; o.y = L.y0 + (L.y - L.y0) * e; o.z = Math.sin(Math.PI * p) * 120;
      if (p >= 1) { o.z = 0; o.slam = null; o.cd = bossCd(o); if (o.boss === 2) { bossWave(o); if (o.mega) bossWave(o, .45); } for (const c of G.cracks) if (!c.pit && Math.hypot(c.x - L.x, (c.y - L.y) * 2) < L.r + c.r * .5) crackBreak(c); squash(o, .4); stop(.05); shake(.7); zoom(.04); buzz(2); snd('DUN_Stomp', .09); ring(L.x, L.y, '#fff', 14, L.r + 30, .4, 7); ring(L.x, L.y, '#ff8a6a', 8, L.r, .3, 5, .5, .04); dust(L.x, L.y, 14, 180);
        touch(Math.hypot(me.x - L.x, (me.y - L.y) * 2) < L.r + 6, () => hitMe(o, tysOf(o.sp)[0], 1, 85, me.x - L.x || 1, me.y - L.y)); setAnim(o, 'Idle'); }
      continue; }
    if (o.lunge) { const L = o.lunge; L.t -= dt; o.x += L.vx * dt; o.y += L.vy * dt; keepIn(o); if ((L.gt -= dt) <= 0) { L.gt = .05; ghost(o, .18); }
      if (!L.done && touch(Math.hypot(me.x - o.x, me.y - o.y) < 26 + bR(o, 12), () => hitMe(o, tysOf(o.sp)[0], 1, 50, L.vx, L.vy))) L.done = true;
      if (L.t <= 0) { o.lunge = null; if (o.chain > 0) { o.chain--; o.warn = o.warn0 = .3; o.shoot = false; o.wa = Math.atan2(me.y - o.y, me.x - o.x); setAnim(o, 'Idle'); continue; } o.chain = null; o.cd = o.boss ? bossCd(o) : .9 + Math.random() * .6; if (o.rush) o.back = .8 + Math.random() * .6; setAnim(o, 'Walk'); } continue; }
    if (o.warn > 0) { if (o.warn > .15) o.wa = Math.atan2(dy, dx); o.warn -= dt; if (o.warn <= 0) { const cx = Math.cos(o.wa), cy = Math.sin(o.wa);
        if (o.shoot) { o.shoot = false; const sp = 220, t = tysOf(o.sp)[0]; for (const da of o.boss || G.wave >= 6 ? [-.3, 0, .3] : [0]) { const ex = Math.cos(o.wa + da), ey = Math.sin(o.wa + da); G.shots.push({ x: o.x + ex * 12, y: o.y - 20, vx: ex * sp, vy: ey * sp, life: 2.2, t0: T, mine: false, from: o, t, c: 2, pw: o.boss ? 75 : 50, pt: 0 }); } setAnim(o, anyAnim(o, 'Shoot', 'Attack'), true); o.cd = o.boss ? bossCd(o) : 1.6 + Math.random() * .8; snd('DUN_Move_Start', .03); squash(o, .2); o.kx -= cx * 70; o.ky -= cy * 50; }
        else { const ch = o.chain != null, v = ch ? 600 : o.boss ? 420 : 360; o.lunge = { vx: cx * v, vy: cy * v, t: ch ? .3 : .22, gt: 0 }; setAnim(o, 'Attack', true); snd('DUN_Tackle', .035); squash(o, -.2); dust(o.x, o.y, 3, 70); } } continue; }
    if (o.cd <= 0 && me.hp > 0 && !(o.flee > 0)) {
      const begin = (w, shoot) => { o.warn = o.warn0 = w; o.shoot = !!shoot; o.wa = Math.atan2(dy, dx); o.atkN++; if (o.boss) snd('DUN_Leer', .04); };
      if (o.boss) { if (d < 340) { bossPick(o, d); continue; } }
      else {
      if (o.ranged && d > 70 && d < 260) { begin(.45, true); continue; }
      if (d < 80) { begin(.45); continue; } } }
    if ((o.sideT -= dt) <= 0) { o.sideT = 1.2 + Math.random() * 1.8; o.side = -o.side; }
    const fl = o.flee > 0; if (fl) { o.flee -= dt; o.face = dx > 0 ? -1 : 1; } if (o.back > 0) o.back -= dt;
    const want = fl ? 9999 : o.back > 0 ? 180 : o.ranged ? 150 : 0, sk = (o.slowT > 0 ? .4 : 1) * pitK(o), s = o.spd * sk * (fl ? 1.25 : 1) * (d > want ? 1 : -.6);
    let ux = dx / d, uy = dy / d; if (!fl && !o.boss && d > want + 44) { const a = .5 * o.side, c = Math.cos(a), sn = Math.sin(a); [ux, uy] = [ux * c - uy * sn, ux * sn + uy * c]; }   /* 똑바로 말고 비스듬히 다가온다 */
    let px = 0, py = 0; for (const q of G.mobs) if (q !== o && q.hp > 0) { const ex = o.x - q.x, ey = o.y - q.y, ed = Math.hypot(ex, ey); if (ed < 34 && ed > 0) { px += ex / ed * (34 - ed); py += ey / ed * (34 - ed); } }
    if (Math.abs(d - want) > 12) { o.x += (ux * s) * dt + px * dt * 3; o.y += (uy * s) * dt + py * dt * 3; setAnim(o, 'Walk'); }
    else if (o.ranged && !o.boss) { const v = o.spd * sk * .55 * o.side; o.x += -dy / d * v * dt + px * dt * 3; o.y += dx / d * v * dt + py * dt * 3; setAnim(o, 'Walk'); }   /* 거리를 둔 채 옆으로 돌며 쏜다 */
    else setAnim(o, 'Idle'); keepIn(o);
  }
  G.mobs = G.mobs.filter(o => o.hp > 0 || T - o.dead < .44);
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt;
    if ((s.pt -= dt) <= 0) { s.pt = .03; part({ x: s.x + (Math.random() - .5) * 6, y: s.y + (Math.random() - .5) * 6, vx: -s.vx * .1, vy: -s.vy * .1, life: s.amp ? .32 : .22, sz: s.amp ? 6 : s.mine ? 3 : 2, col: s.mine ? (s.amp && Math.random() < .35 ? '#fff' : s.col) : (TYPE_C[s.t] || '#fff') }); }
    if (s.mine) { for (const o of G.mobs) if (o.hp > 0 && o.enter <= 0 && !s.hit.has(o) && Math.hypot(o.x - s.x, o.y - 20 - s.y) < (s.amp ? 31 : 24) + bR(o, 12)) { s.hit.add(o); const v = s.v; if (s.amp) { ring(o.x, o.y - 20, '#fff', 6, s.light ? 30 : 44, .2, 5, 1); ring(o.x, o.y - 20, s.col, 10, s.light ? 38 : 58, .26, 4, 1, .03); sparks(o.x, o.y - 20, s.vx, s.vy, s.col, 6, 340); } { const r0 = dmg(me, o, v.t, v.c, v.pw * (s.pm || 1), v.pw); hurt(o, r0, Math.cos(s.ang) * .8, Math.sin(s.ang) * .8, s.light); drainTo(v, o, r0.n); } hitFx(v.Rr, o, 0, s.f, s.col, Math.cos(s.ang), Math.sin(s.ang), s.light); if (!s.pierce) s.life = 0; } }
    else if (live && me.hp > 0 && !s.jd && Math.hypot(me.x - s.x, me.y - 20 - s.y) < 18) { if (me.inv <= 0) { s.life = 0; hitMe(s.from, s.t, s.c, s.pw, s.vx, s.vy); } else if (me.roll > 0) { s.jd = true; justDodge(s.from); } } }
  G.shots = G.shots.filter(s => T - s.t0 < s.life && s.x > -40 && s.x < R.W + 40 && s.y > -40 && s.y < R.H + 40);
  for (const p of G.drops) { if (p.z > 0 || p.vy < 0) { p.vy += 620 * dt; p.z -= p.vy * dt; if (p.vx) p.x += p.vx * dt; if (p.gy) p.y += p.gy * dt; if (p.z < 0) { p.z = 0; if (p.vy > 90) { p.vy = -p.vy * .4; p.z = .01; } else { p.vy = 0; p.vx = 0; p.gy = 0; } if (p.coin && !p.ld) { p.ld = 1; if (R.RT - (R.jgT || -9) > .07) { R.jgT = R.RT; snd('DUN_Money', .06); } /* 경완 2026-11-16 '골드 떨어질 때 소리 툭 소리 말고 짤랑 소리': KATI(딱) → 동전 짤랑(DUN_Money, 주울 때보다 작게) */ } }
      const A = R.A; p.x = Math.max(A.x0 + 8, Math.min(A.x1 - 8, p.x)); p.y = Math.max(A.y0 + 8, Math.min(A.y1 - 4, p.y)); if (inPond(p.x, p.y, 0)) p.y = R.Y.pond.y0 - 4; }   // 연못 안엔 안 떨어지게
    const py = pickY(me, p.y), d = Math.hypot(me.x - p.x, py - p.y), mg = p.mag || (G.mag > 0 && p.coin), pull = p.box ? 0 : mg ? 9999 : p.coin ? 66 : 84;   /* 경완 '선물상자는 끌려오지 않고 직접 먹게' */ if (mg) p.mag = 1; if ((T - p.t0 > .5 || mg) && d < pull && me.hp > 0) { const v = mg ? 12 : 5 + (T - p.t0) * 3; p.x += (me.x - p.x) * Math.min(1, dt * v); p.y += (py - p.y) * Math.min(1, dt * v); }
    if ((T - p.t0 > .5 || p.mag) && d < (p.box ? 28 : 22) && me.hp > 0) { p.got = true; if (p.coin) gotCoin(p); else if (p.box) gotBox(p); else gotShard(p); } }
  for (const z of G.zones) { if ((z.tk -= dt) > 0) continue; z.tk = .35; const v = z.v; for (const o of G.mobs) { if (o.hp <= 0 || o.enter > 0) continue; const l = Math.hypot(o.x - z.x, o.y - z.y); if (l > z.r + bR(o, 14)) continue; o.slowT = Math.max(o.slowT || 0, .6); const r0 = dmg(me, o, v.t, v.c, v.pw * .2, v.pw); hurt(o, r0, l > 8 ? (z.x - o.x) / l * .7 : 0.01, l > 8 ? (z.y - o.y) / l * .7 : 0, true); drainTo(v, o, r0.n); } }
  G.zones = G.zones.filter(z => T - z.t0 < z.d);
  hazStep(dt, live);
  if (live) { fieldStep(dt); crackStep(dt); }
  G.drops = G.drops.filter(p => !p.got); if (G.mobs.length > 14) G.mobs = G.mobs.filter(o => o.hp > 0 || T - o.dead < 1.2);
  for (let i = R.PT.length - 1; i >= 0; i--) { const p = R.PT[i], t = T - p.t0;
    if (p.home && t > p.hold) { const h = typeof p.home === 'function' ? p.home() : p.home, dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy), v = 260 + (t - p.hold) * 1700; if (d < v * dt + 5) { R.PT.splice(i, 1); p.on?.(); continue; } p.x += dx / d * v * dt; p.y += dy / d * v * dt; if (t > p.life) R.PT.splice(i, 1); continue; }
    if (t > p.life) { R.PT.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.ay * dt; if (p.dr) { const k = Math.exp(-p.dr * dt); p.vx *= k; p.vy *= k; } }
  if (live) {
    if (G.mobs.every(o => o.hp <= 0) && !G.pend && !G.waiting) {
      if (G.wave < STAGES.length) { G.waiting = true; stageClear(); after(1.1, () => { if (!G.over) { G.waiting = false; nextWave(); } }); }
      else if (!G.clearT) { G.clearT = T; banner('특훈 완료!', 'win'); setAnim(me, anyAnim(me, 'Pose', 'Hop', 'Idle'), true); me.busy = .8; rumble(3, 120, 1); for (let i = 0; i < 26; i++) part({ kind: 'star', x: R.W * Math.random(), y: R.A.y0 - 30 - Math.random() * 60, vx: (Math.random() - .5) * 60, vy: 120 + Math.random() * 140, life: 1.6, sz: 2, col: ['#ffe27a', '#ff9ab0', '#9fe4ff', '#bff59a'][i % 4] }); }
      else if ((!G.boxOn || G.giftOk) && !G.drops.length && T - Math.max(G.clearT + 2.2, G.giftOk || 0) > 1) end(true);   /* 경완 '필드 위에 있는 보상 다 먹어야 결과창 등장하게' — 저절로 빨려 오는 건 없앰(v26.18): 떨어진 자석(안 사라짐)을 먹거나 직접 주워야 하고, 상자는 직접 */ }
    if (!G.over && me.hp <= 0 && T - me.dead > .55) end(false, true);
  }
}
/* 줍기 판정 높이 — 경완 '떠 있는 포켓몬들도 아이템 먹을 때 판정 위치 포켓몬 스프라이트 있는 곳으로' : 그림자(발)부터 떠 있는 그림 높이(GA.lift)까지 세로 줄에서 물건과 가장 가까운 점 */
function pickY(me, y) { const L = (GA.lift?.(me.sp) || 0) + (me.z || 0); return Math.max(me.y - L, Math.min(me.y, y)); }
/* 시연용 무적 버튼(GOD)은 본 게임 공개 때 지움 (경완 '테스트 버튼은 본게임 배포할 땐 다 없애야 돼') */
function hitMe(o, t, c, pw, vx, vy) {
  const G = R.G, me = G.me;
  if (me.prot > 0) { me.inv = Math.max(me.inv, .3); pop(me.x, me.y - 56, '막았다!', '#7af0a0', true); ring(me.x, me.y - 18, '#7af0a0', 20, 44, .25, 5, 1); snd('DUN_Miss', .04); buzz(0); return; }
  if ((me.shrink > 0 && Math.random() < .7) || (me.clone > 0 && Math.random() < .5)) { me.inv = Math.max(me.inv, .4); pop(me.x, me.y - 56, '빗나갔다!', '#e4ecf8', true); snd('DUN_Miss', .04); if (me.clone > 0) ghost(me, .3); return; }
  const r = dmg(o, me, t, c, pw); r.n = Math.round(r.n * 1.3); if (me.guard > 0) r.n = Math.max(1, Math.round(r.n * .4)); me.hp = Math.max(0, me.hp - r.n); me.inv = .5; me.flash = .16; setAnim(me, 'Hurt', true); chEnd(); dashEnd(); me.busy = .22; me.dash = null; R.BUF = null; squash(me, .32);
  const l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l; me.kx = ux * 300; me.ky = uy * 200;
  pop(me.x, me.y - 56, r.n, '#ff7a6a', true, ux * 20, uy * 10); stop(.09); shake(.55); kick(ux, uy, 10); R.VIG = 1; buzz(2); se('KOUKA_M', .05); snd('DUN_Tackle', .04); if (me.hp > 0 && me.hp / me.mhp <= .2 && !me.lowSe) { me.lowSe = 1; se('HINSI', 1, { dur: 1.6 }); } else if (me.hp / me.mhp > .2) me.lowSe = 0; sparks(me.x, me.y - 20, ux, uy, '#ff7a6a', 8, 300);
  if (G.combo) { G.combo = 0; cbUi(); }
  G.hits++;
  hud();
  if (me.hp <= 0) { G.fainted = true; me.dead = R.T; setAnim(me, anyAnim(me, 'Faint', 'Hurt'), true); slow(.7, .3); rumble(3, 90); flash(.2, '255,120,100'); }
}
function gotCoin(p) {
  const G = R.G, cv = p.coin, v = p.val || CV[cv]; G.gold += v; snd('DUN_Money', cv > 1 ? .12 : .09); se('REGI', .09, { gain: cv > 2 ? 1.5 : cv > 1 ? 1.2 : 1 });   /* 경완 '골드 먹는 효과음 없음': 0.1초짜리 작은 소리라 안 들렸다 → 본가 계산대 소리 + PMD 동전 소리 크게 */ buzz(cv > 2 ? 1 : 0); stars(p.x, p.y - 10, cv > 1 ? 6 : 3, CPAL[cv][1], cv > 1 ? 160 : 110);
  if (cv > 1) pop(p.x, p.y - 26, `+${v}G`, cv > 2 ? '#ffe27a' : '#e4ecf8', cv > 2);
  fly('coin', p.x, p.y - 12, hudPt('.mg-hg .coin'), () => { if (R?.G !== G) return; G.goldShown = Math.min(G.gold, G.goldShown + v); hgUp(); }); R.PT[R.PT.length - 1].cv = cv;
}
// 번뜩임 조각: 하늘(+1%)은 조용히, 보라(+3%)는 살짝 멈칫, 무지개(+5%)는 화면이 멈추고 크게 번뜩인다
function gotShard(p) {
  const G = R.G, me = G.me, sh = p.sh || 1, v = EGV[sh], col = EGC[sh]; se('KIRAKIRA2', .1); G.shard += v; G.egg = Math.min(99, G.egg + v); G.egT = R.RT;
  if (sh === 1) { snd('DUN_Wonder_Tile', .05); buzz(0); ring(me.x, me.y - 16, col, 6, 36, .3, 3, 1); stars(p.x, p.y - 14, 5, col, 150); pop(p.x, p.y - 34, '번뜩임 +1%', '#bfeaff'); }
  else if (sh === 2) { R.HS = Math.max(R.HS, .12); flash(.16, '200,170,255'); zoom(.06); me.flash = .12; buzz(1); snd('DUN_Wonder_Tile', .08);
    ring(me.x, me.y - 16, col, 6, 64, .38, 5, 1); stars(p.x, p.y - 16, 10, col, 220); pop(p.x, p.y - 40, '번뜩임 +3%', '#e0c8ff', true); }
  else { R.HS = Math.max(R.HS, .36); R.SH = { t0: R.RT, x: me.x, y: me.y - 22, txt: `번뜩임 +${v}%` }; flash(.3, '255,220,245'); zoom(.13); shake(.3); me.flash = .3; rumble(3, 70, 1);
    snd('DUN_Wonder_Tile', .09); snd('DUN_Stat_Up', .05, .14);
    ring(me.x, me.y - 16, col, 6, 80, .4, 6, 1); ring(me.x, me.y - 16, '#fff', 4, 50, .3, 4, 1, .08); stars(p.x, p.y - 16, 14, col); stars(me.x, me.y - 22, 10, '#fff', 260); }
  // 반짝이가 번뜩임 칸으로 날아가서 게이지가 오른다
  const to = hudPt('.ya-eg .ri'); let n = 0; for (let i = 0; i < 2 + sh * 2; i++) fly('xp', p.x, p.y - 16, to, () => { if (R?.G !== G || n++) return; G.eggShown = G.egg; const b = R.q('.ya-eg'); b.classList.remove('up'); void b.offsetWidth; b.classList.add('up'); buzz(0); hud(); }, col);
  hud();
}
function shardFx() {   // 먹는 순간 화면 효과 (판 시간이 멈춰 있어도 도는 실제 시간)
  const S = R.SH; if (!S) return; const g = R.g, t = R.RT - S.t0, D = .8; if (t > D) { R.SH = null; return; }
  const p = t / D, e = 1 - (1 - p) * (1 - p), a = t < .34 ? 1 : Math.max(0, 1 - (t - .34) / (D - .34)), x = S.x, y = S.y, tx = Math.max(96, Math.min(R.W - 96, x));
  g.fillStyle = `rgba(20,16,40,${.4 * a})`; g.fillRect(0, 0, R.W, R.H);
  g.save(); g.translate(x, y); g.rotate(R.RT * 1.8); const L = 70 + 300 * e;
  for (let i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.fillStyle = `hsla(${(i * 36 + R.RT * 240) % 360},100%,78%,${.55 * a})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(-L * .085, -L); g.lineTo(L * .085, -L); g.closePath(); g.fill(); } g.restore();
  g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 6 * (1 - p) + 2; g.beginPath(); g.arc(x, y, 22 + 170 * e, 0, 7); g.stroke();
  g.fillStyle = `rgba(255,252,224,${.85 * a})`; g.beginPath(); g.arc(x, y, 30 - 8 * p, 0, 7); g.fill();
  const sz = 26 * (t < .14 ? 2 - t * 7.1 : 1), ty = Math.max(150, y - 62); g.textAlign = 'center'; g.font = `bold ${Math.round(sz)}px Galmuri11`; g.globalAlpha = a; g.lineWidth = 5; g.strokeStyle = '#20202c'; g.strokeText(S.txt, tx, ty); g.fillStyle = t < .1 ? '#fff' : '#ffd0f0'; g.fillText(S.txt, tx, ty); g.globalAlpha = 1;
}

// ---------- 그리기 ----------
function coinSq(g, x, y, s, C) { g.fillStyle = C[0]; g.fillRect(x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4); g.fillStyle = C[1]; g.fillRect(x - s / 2, y - s / 2, s, s); g.fillStyle = C[3]; g.fillRect(x - s / 2, y - s / 2, s, 3); g.fillRect(x - s / 2, y - s / 2, 3, s); g.fillStyle = C[2]; g.fillRect(x - s / 2, y + s / 2 - 3, s, 3); g.fillRect(x + s / 2 - 3, y - s / 2, 3, s); }
/* 경완 2026-11-16 '메가진화 전까지 깬거랑 메가진화 모드까지 깬거랑 보상 확실히 다르게 > 떨어지는 골드 양으로 느껴지게끔': 동전이 분수처럼 쏟아진다 (L = 동전 색 목록) */
function coinRain(x, y, L) { const G = R.G; L.forEach((cv, i) => after(i * .035, () => { if (R?.G !== G) return; const a = Math.random() * 6.28, v = 60 + Math.random() * 150; G.drops.push({ coin: cv, val: cval(cv, G.wave), x, y, t0: R.T, vy: -220 - Math.random() * 160, z: 14, vx: Math.cos(a) * v, gy: Math.sin(a) * v * .6 }); })); }
const RAIN_P1 = [3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1], RAIN_MEGA = [3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];   /* 메가진화 전 12개 38G · 메가진화까지 깨면 30개 104G + 자루 */
function bagDrop(x, y, val) { const G = R.G, a = Math.random() * 6.28; G.drops.push({ coin: 3, bag: 1, val, x, y, t0: R.T, vy: -230, z: 14, vx: Math.cos(a) * 30, gy: Math.sin(a) * 18 }); }
/* 경완 2026-11-14 '보따리 디자인 구림 → 외부 저장소 스프라이트 → 1번(전리품 자루)에 우리 코인, 자루 입구 안쪽에 → B로 가자': 본가 전리품 자루(PokeAPI sprites loot-sack) 입구 안에 네모 금 동전을 넣은 그림 gym/img/item/goldsack.png */
let BOX_IM = null; function boxIm() { if (!BOX_IM) { BOX_IM = new Image(); BOX_IM.src = 'gym/img/yact/gift.png'; } return BOX_IM; }   /* 선물상자 = 경완 '6번으로' (PokeAPI sprites items/prop-case) */
function drawBox(p) { const g = R.g, t = R.T - p.t0, im = boxIm(), k = 2, w = (im.width || 20) * k, h = (im.height || 18) * k, x = Math.round(p.x), y = Math.round(p.y - p.z + (p.z ? 0 : Math.sin(t * 4) * 2)), cy = y - h / 2;
  g.fillStyle = 'rgba(20,40,10,.28)'; g.beginPath(); g.ellipse(x, p.y, w * .45, w * .15, 0, 0, 7); g.fill();
  if (!p.z) {   /* 경완 '뒤에 빛 후광 효과도': 위로 솟는 부드러운 빛기둥 + 숨 쉬는 둥근 후광 + 바닥에 퍼지는 고리 + 반짝이 (딱딱한 빛줄기는 안 씀) */
    const pu = .5 + .5 * Math.sin(t * 3.2), ap = Math.min(1, (t - .6) * 2); if (ap > 0) { g.save(); g.globalAlpha = ap; g.globalCompositeOperation = 'lighter';
      let gr = g.createLinearGradient(0, cy - 130, 0, cy + 6); gr.addColorStop(0, 'rgba(255,236,150,0)'); gr.addColorStop(1, `rgba(255,236,150,${.3 + pu * .14})`); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 34, cy - 130); g.lineTo(x + 34, cy - 130); g.lineTo(x + 15, cy + 6); g.lineTo(x - 15, cy + 6); g.fill();
      const r = 46 + pu * 8; gr = g.createRadialGradient(x, cy, 4, x, cy, r); gr.addColorStop(0, 'rgba(255,246,200,.75)'); gr.addColorStop(.45, 'rgba(255,214,110,.32)'); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, cy, r, 0, 7); g.fill();
      const rp = (t * .8) % 1; g.strokeStyle = `rgba(255,236,150,${(1 - rp) * .7})`; g.lineWidth = 3; g.beginPath(); g.ellipse(x, p.y, 16 + rp * 40, (16 + rp * 40) * .36, 0, 0, 7); g.stroke(); g.restore(); }
    if (Math.random() < .22) part({ kind: 'star', x: x + (Math.random() - .5) * 46, y: cy + 10 - Math.random() * 60, vy: -46, life: .6, sz: 2, col: Math.random() < .6 ? '#ffe27a' : '#fff' });
  }
  g.imageSmoothingEnabled = false; if (im.complete && im.width) g.drawImage(im, Math.round(x - w / 2), y - h, w, h); }
/* 꾸러미 내용(제안): 훈련한 능력치 영양제 2 · 지닌 도구 하나 · 나무열매 2 (체육관 상점 도구 HOLD 에서, 메가스톤·Z크리스탈 빼고) */
/* 꾸러미 = 상점 가격 기준 무작위 — 경완 '꾸러미 보상은 고정할 필요없이 상점 가격 고려해서 밸런스 맞춰줘' · '열매 같은건 2개 줄 필요가 없지 않아? 1개만 쓸 수 있는 아이템인데'
   훈련한 능력치 영양제 1개(300G)는 꼭, 그리고 한 칸 더: GIFT_W 확률로 영양제 / 레어(1,500G 까지) / 에픽(5,000G 까지) / 전설(10,000G 넘는 메가스톤) 지닌 도구·나무열매 (같은 등급 안에서는 싼 것일수록 잘 나옴). 값어치 평균 약 950G, 넷 중 셋은 600G
   등급 딱지 GIFT_GR — 경완 '도구는 높은 가격인만큼 레어 딱지 같은거 붙여서 나왔으면' · 색은 알 등급(레어 파랑·에픽 보라·전설 금)과 같게 */
const GIFT_W = [75, 16, 8, 1], GIFT_GR = ['', '레어', '에픽', '전설'], giftGr = pr => pr >= 10000 ? 3 : pr > 1500 ? 2 : pr > 0 ? 1 : 0;   /* 경완 '전설은 5,000G는 넘어야' → '아니 10,000G는 넘어야할듯' — 10,000G 넘는 건 메가스톤(12,000G)뿐 */
/* 경완 '최종 보스의 메가스톤 나올 확률도 좀 높여주고, 이미 창고에 있으면 안 나오는거고' — 쓰러뜨린 대장의 메가스톤 GIFT_BOSS %, 가진 메가스톤(창고·지닌 것)은 어느 칸에서도 안 나옴 */
const GIFT_TW = [82, 16, 2], GIFT_BOSS = 8;   /* 경완 2026-11-16 '메가진화 보스 깨기가 어려워서 꾸러미 보상 수준 좀 높여줘도': 무작위 칸 1 → 2칸(v26.18 부터 도구 고정 한 칸 + 무작위 한 칸), 대장 메가스톤 4 → 8% */
/* 경완 2026-11-16 '보상 리스트에는 기술머신이나 기술레코드도 포함시켜줘': 무작위 칸의 영양제 몫(75%) 가운데 GIFT_TM %(전체로는 25%)는 훈련한 포켓몬이 배울 수 있고 아직 모르는 기술머신·기술레코드 (가진 기술머신은 빼고, 상점 값이 쌀수록 잘 나옴 — 값 셈은 manage.js tmPrice 와 같게). id 는 'tm:기술' */
const GIFT_TM = 25, tmPr = x => x[3] === 2 ? 500 : (x[4] || 0) <= 50 ? 300 : x[4] <= 70 ? 700 : x[4] <= 85 ? 1200 : x[4] <= 100 ? 2000 : 3000, tmGr = pr => pr >= 2000 ? 2 : pr >= 700 ? 1 : 0;
/* 경완 2026-11-16 '꼭 훈련한 포켓몬이 배울 수 있는거 아니여도 내 체육관 포켓몬들이 배울 수 있는 기술머신 레코드 포함해서 나오게. 훈련한 포켓몬이 배울 수 있는게 확률 좀 더 높게': 후보 = 체육관 타입 박스 포켓몬(상점 shopTm 과 같은 범위) 가운데 누구든 배울 수 있고 아직 모르는 기술, 훈련한 포켓몬이 배울 수 있으면 무게 GIFT_TMW 배 */
const GIFT_TMW = 3;
const giftTm = P => { const B = GB(), D = B.D, g = GA.S?.gym || {}, own = g.tms || {}; if (!P || !D || !B.tmOf) return null; const W = new Map(), put = (Q, k) => B.tmOf(Q.sp).forEach(i => { const x = D.mv[i]; if (x && B.tmCan(Q, x[0]) && (B.isTR(x[0]) || !(own[x[0]] > 0))) W.set(x, Math.max(W.get(x) || 0, k)); });
  (GA.S?.box || []).forEach(Q => { if (Q !== P && (SP[Q.sp]?.t || []).includes(g.ty)) put(Q, 1); }); put(P, GIFT_TMW); const L = [...W].map(([x, k]) => [x, k / tmPr(x)]); if (!L.length) return null;
  let r = Math.random() * L.reduce((a, e) => a + e[1], 0), x = L[L.length - 1][0]; for (const e of L) if ((r -= e[1]) <= 0) { x = e[0]; break; } return ['tm:' + x[0], tmGr(tmPr(x))]; };
const GIFT = (stat, boss, P) => { const B = GB(), H = B.HOLD || {}, V = B.EV_VIT || [['protein']], MS = B.MEGA_ST || {}, has = id => (GA.S?.gym?.itm?.[id] | 0) > 0 || !!B.itWho?.(id),
    ok = Object.keys(H).filter(id => !B.ZC_T?.[id] && !(B.ZC_ST || []).includes(id) && H[id][1] > 0 && (!MS[id] || (H[id][1] >= 10000 && !has(id)))),
    bs = Object.keys(MS).filter(id => MS[id][0] === boss && H[id]?.[1] > 0 && !has(id)),
    pw = L => { let r = Math.random() * L.reduce((a, id) => a + 1 / H[id][1], 0); for (const id of L) if ((r -= 1 / H[id][1]) <= 0) return id; return L[L.length - 1]; },
    v0 = (V[stat] || V[0])[0], rv = () => V[Math.floor(Math.random() * V.length)][0], out = [[v0, 1, 0]],
    slot = () => { let r = Math.random() * 100, k = 0; while (k < 3 && (r -= GIFT_W[k]) > 0) k++; const L = k ? ok.filter(id => giftGr(H[id][1]) === k) : []; if (!k && Math.random() * GIFT_W[0] < GIFT_TM) { const t = giftTm(P); if (t) return t; } return L.length ? [pw(L), k] : [rv(), 0]; },
    add = (id, gr) => { const e = out.find(x => x[0] === id); if (!e) out.push([id, 1, gr]); else if (gr) add(rv(), 0); /* 도구·열매는 같은 걸 두 개 안 줌 (경완 '1개만 쓸 수 있는 아이템인데') */ else e[1]++; };
  const tool = () => { let r = Math.random() * 100, k = 1; while (k < 3 && (r -= GIFT_TW[k - 1]) > 0) k++; for (; k > 0; k--) { const L = ok.filter(id => giftGr(H[id][1]) === k); if (L.length) return [pw(L), k]; } return [rv(), 0]; };   /* 경완 2026-11-16 '꾸러미 보상은 도구를 고정으로 1개 주긴 해야할듯': 영양제 + 도구 한 칸(레어 82·에픽 16·전설 2%) + 무작위 한 칸 */
  if (bs.length && Math.random() * 100 < GIFT_BOSS) { const id = bs[Math.floor(Math.random() * bs.length)]; add(id, giftGr(H[id][1])); } else add(...tool());
  add(...slot()); return out.sort((a, b) => a[2] - b[2]); };
function gotBox(p) { const G = R.G, me = G.me; if (G.gift) return; G.gift = G.giftT || GIFT(G.stat, G.pool.big[2], G.M.P); if (p) p.got = true; se('PIRORIRO'); snd('DUN_Stat_Up', .07); buzz(1); flash(.2, '255,240,170'); ring(me.x, me.y - 16, '#ffe27a', 8, 90, .4, 6, 1); stars(me.x, me.y - 24, 14, '#ffe27a', 280); pop(me.x, me.y - 70, '선물상자!', '#ffe27a', true);
  after(.7, () => { if (R?.G !== G) return; const q = R.q, w = q('.ya-gift'), B = GB(), tmX = id => id.startsWith('tm:') ? B.mvOf(id.slice(3)) : null, nm = id => { const x = tmX(id); return x ? `<s class="${B.isTR(x[0]) ? 'tr' : ''}">${B.isTR(x[0]) ? 'TR' : 'TM'}</s>${x[1]}` : B.HOLD?.[id]?.[0] || (B.EV_VIT || []).find(v => v[0] === id)?.[1] || id; }, im = id => { const x = tmX(id); return x ? `gym/img/bt/tm_${x[2]}.png` : B.itImg(id); };
    q('.gf-s').textContent = `메가 ${nmSp(G.pool.big[2])} 격파 보상`; q('.gf-l').innerHTML = G.gift.map(([id, n, gr], i) => `<span class="gr${gr | 0}" style="--i:${i}">${gr ? `<em>${GIFT_GR[gr]}</em><u></u>` : ''}<img alt="" src="${im(id)}"><i>${nm(id)}</i><b>×${n}</b></span>`).join(''); const top = Math.max(0, ...G.gift.map(x => x[2] | 0)); w.dataset.gr = top; if (top) after(.55 + (G.gift.length - 1) * .16 + .3, () => { if (R?.G !== G || w.hidden) return; se(top > 1 ? 'PIRORIRO' : 'PINPON', .5); buzz(top > 1 ? 2 : 1); });
    q('.ya-ov').hidden = false; w.hidden = false; w.classList.remove('pop'); void w.offsetWidth; w.classList.add('pop'); se('WIN_OPEN'); se('PINPON', .3); buzz(1);
    const ok = q('.gf-ok'); ok.classList.add('lk'); setTimeout(() => ok.classList.remove('lk'), 1000); }); }   /* 저절로 뜨는 창: 버튼으로만 닫힘·팝업 모션·소리·1초 잠금 */
let BAG_IM = null; function bagIm() { if (!BAG_IM) { BAG_IM = new Image(); BAG_IM.src = 'gym/img/item/goldsack.png'; } return BAG_IM; }
function drawBag(p) { const g = R.g, t = R.T - p.t0, k = p.val >= 40 ? 3 : 2, im = bagIm(), w = (im.width || 18) * k, h = (im.height || 21) * k, x = Math.round(p.x), y = Math.round(p.y - p.z + (p.z ? 0 : Math.sin(t * 5 + p.x) * 2));
  g.fillStyle = 'rgba(20,40,10,.28)'; g.beginPath(); g.ellipse(x, p.y, w * .42, w * .14, 0, 0, 7); g.fill(); g.imageSmoothingEnabled = false; if (im.complete && im.width) g.drawImage(im, Math.round(x - w / 2), y - h, w, h);
  if ((t * 1.3 + p.x * .37) % 1 < .3) { g.fillStyle = '#fff'; g.fillRect(x + w / 2 - 2, y - h - 4, 2, 8); g.fillRect(x + w / 2 - 5, y - h - 1, 8, 2); } }
function drawCoin(p) { if (p.bag) return drawBag(p); const g = R.g, t = R.T - p.t0, C = CPAL[p.coin] || CPAL[1], s = 12, x = Math.round(p.x), y = Math.round(p.y - p.z - s / 2 - 3 + (p.z ? 0 : Math.sin(t * 5 + p.x) * 2));   /* 경완 '골드는 다 네모 아이콘으로': 점수판 동전과 같은 네모, 색만 다름 */
  g.fillStyle = 'rgba(20,40,10,.28)'; g.beginPath(); g.ellipse(x, p.y, s * .6, s * .25, 0, 0, 7); g.fill(); coinSq(g, x, y, s, C);
  if (p.coin > 1 && (t * 1.3 + p.x * .37) % 1 < (p.coin > 2 ? .3 : .16)) { g.fillStyle = '#fff'; g.fillRect(x + s / 2, y - s / 2 - 8, 2, 8); g.fillRect(x + s / 2 - 3, y - s / 2 - 5, 8, 2); } }
// 번뜩임 조각 = 네 갈래 별 (동전과 헷갈리지 않게, 경완 2026-11-13). 색 = 등급: 하늘 +1% · 보라 +3% · 무지개 +5%
function starPath(g, r, r2 = r * .36) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, q = i % 2 ? r2 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); }
function drawShard(p) { const g = R.g, T = R.T, RT = R.RT, t = T - p.t0, sh = p.sh || 1, x = Math.round(p.x), r = [0, 10, 13, 17][sh], y = Math.round(p.y - p.z - r - 8 + Math.sin(t * 4) * 3), pu = .5 + .5 * Math.sin(RT * 6), col = sh === 3 ? `hsl(${(RT * 220) % 360},100%,70%)` : EGC[sh];
  g.fillStyle = 'rgba(20,40,10,.3)'; g.beginPath(); g.ellipse(x, p.y, r * .8, r * .3, 0, 0, 7); g.fill();
  if (sh > 1) { g.globalAlpha = .45 + .3 * pu; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.ellipse(x, p.y, r + 6 + pu * 5, (r + 6 + pu * 5) * .38, 0, 0, 7); g.stroke();
    const gr = g.createLinearGradient(0, y - 80, 0, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.5)'); g.fillStyle = gr; g.fillRect(x - r * .6, y - 80, r * 1.2, 80); g.globalAlpha = 1; }
  g.save(); g.translate(x, y);
  if (sh === 3) { g.save(); g.rotate(RT * 1.3); g.fillStyle = `rgba(255,255,255,${.5 + .25 * pu})`; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, -40); g.lineTo(6, -40); g.closePath(); g.fill(); } g.restore(); }
  g.globalAlpha = .3 + .2 * pu; g.fillStyle = col; g.beginPath(); g.arc(0, 0, r + 7, 0, 7); g.fill(); g.globalAlpha = 1;
  g.rotate(Math.sin(t * 2.4) * .22); const sc = 1 + pu * .08; g.scale(sc, sc);
  starPath(g, r + 3); g.fillStyle = '#20202c'; g.fill(); starPath(g, r); g.fillStyle = col; g.fill(); starPath(g, r * .55, r * .2); g.fillStyle = '#fff'; g.fill(); g.restore();
  if (sh > 1) { g.textAlign = 'center'; g.font = 'bold 11px Galmuri11'; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText(`번뜩임 +${EGV[sh]}%`, x, y - r - 9); g.fillStyle = '#fff'; g.fillText(`번뜩임 +${EGV[sh]}%`, x, y - r - 9); } }
// 내 포켓몬 머리 위: 체력바(늘 보임) + 깨닫는 기술 게이지(가는 줄, 조각을 먹으면 잠깐 커지고 %가 뜸) + 범위 UP 남은 시간
function meBar(me) { const g = R.g, G = R.G, RT = R.RT, w = 46, x = Math.round(me.x - w / 2 + (me.flash > 0 ? Math.sin(RT * 90) * 2 : 0)), y = Math.round(me.y - 62 - (GA.lift?.(me.sp) || 0) - (me.z || 0)), r = Math.max(0, me.hp / me.mhp);
  g.fillStyle = '#20202c'; g.fillRect(x - 2, y - 2, w + 4, 10); g.fillStyle = '#4a4a5a'; g.fillRect(x, y, w, 6); g.fillStyle = r > .5 ? '#58d050' : r > .2 ? '#f8c030' : (Math.floor(RT * 6) % 2 ? '#f05038' : '#ff9a8a'); g.fillRect(x, y, Math.round(w * r), 6); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, Math.round(w * r), 2);
  // 체력 밑 게이지 = 기술 남은 시간 (경완 2026-11-14 '빈 게이지를 기술 남은 시간 게이지로'): 꾹 누르는 기술은 버틸 수 있는 시간, 아니면 걸어 둔 효과가 남은 시간. 보여 줄 게 없으면 안 그림
  let yy = y + 10; const H = me.hide, C = me.ch, D = me.dash?.hold != null ? me.dash : null, ef = [[me.buff, BUFF_T, '#bff59a'], [me.shrink, 8, '#ffd0f0'], [me.clone, 8, '#c8c8ff'], [me.haste, 8, '#9fe4ff'], [me.guard, 8, '#8cc8ff'], [me.prot, 2.5, '#7af0a0']].filter(e => e[0] > 0);
  const hold = H ? [H.max - H.t, H.max, H.col] : C ? [C.max - C.t, C.max, C.col] : D ? [D.max - D.el, D.max, TYPE_C[D.v?.t]] : null, main = hold || ef.shift();
  if (main) { const yy = y - 11, q = Math.max(0, Math.min(1, main[0] / main[1])), h = 5, low = hold && q < .25 && Math.floor(RT * 14) % 2; g.fillStyle = '#20202c'; g.fillRect(x - 2, yy - 1, w + 4, h + 3); g.fillStyle = '#4a4a5a'; g.fillRect(x, yy + 1, w, h); g.fillStyle = low ? '#fff' : (main[2] || '#ffe27a'); g.fillRect(x, yy + 1, Math.round(w * q), h); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x, yy + 1, Math.round(w * q), 1); }
  for (const [v, mx, c] of ef) { g.fillStyle = '#20202c'; g.fillRect(x - 2, yy - 1, w + 4, 5); g.fillStyle = c; g.fillRect(x, yy + 1, Math.round(w * v / mx), 2); yy += 5; } }
function hpBar(e) { const g = R.g, w = e.boss ? 72 : 34, h = e.boss ? 6 : 4, jx = e.flash > 0 ? Math.sin(R.RT * 90) * 2 : 0, x = Math.round(e.x - w / 2 + jx), y = Math.round(e.y + 6);
  g.fillStyle = '#20202c'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = '#4a4a5a'; g.fillRect(x, y, w, h); const r = Math.max(0, e.hp / e.mhp), rl = Math.max(0, (e.hpLag ?? e.hp) / e.mhp);
  if (rl > r) { g.fillStyle = '#fff'; g.fillRect(x, y, Math.ceil(w * rl), h); }   // 방금 깎인 만큼은 하얗게 남았다가 줄어든다
  g.fillStyle = r > .5 ? '#58d050' : r > .2 ? '#f8c030' : '#f05038'; g.fillRect(x, y, Math.ceil(w * r), h);
  if (e.boss) { const by = y + h + 2, gr = e.groggy > 0, br = gr ? e.groggy / GROGGY : Math.min(1, e.brk / e.brkMax); g.fillStyle = '#20202c'; g.fillRect(x - 1, by, w + 2, 5); g.fillStyle = '#3a3a48'; g.fillRect(x, by + 1, w, 3); g.fillStyle = gr ? (Math.floor(R.RT * 10) % 2 ? '#fff' : '#ffe27a') : e.brkLock > 0 ? '#6a6a7a' : '#ffb830'; g.fillRect(x, by + 1, Math.ceil(w * br), 3);
    const t = gr ? '그로기!' : `${e.boss === 2 ? '우두머리' : '대장'} Lv.${e.lv}`; g.font = 'bold 11px Galmuri11'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText(t, e.x, y + 23); g.fillStyle = '#ffd84a'; g.fillText(t, e.x, y + 23); } }
// 상대 공격 예고: 바닥에 빨간 길(돌진)·점선(원거리)·동그라미(내려찍기)가 차오른다
function drawTele(o) { const g = R.g;
  if (o.slam) { const L = o.slam, p = Math.min(1, L.t / L.d); g.fillStyle = 'rgba(255,60,40,.16)'; g.beginPath(); g.ellipse(L.x, L.y, L.r, L.r * .5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,60,40,.34)'; g.beginPath(); g.ellipse(L.x, L.y, L.r * p, L.r * .5 * p, 0, 0, 7); g.fill(); g.strokeStyle = p > .8 ? '#fff' : 'rgba(255,90,70,.9)'; g.lineWidth = 2; g.beginPath(); g.ellipse(L.x, L.y, L.r, L.r * .5, 0, 0, 7); g.stroke(); return; }
  if (!(o.warn > 0)) return; const p = 1 - o.warn / (o.warn0 || .5), a = o.wa || 0;
  g.save(); g.translate(o.x, o.y); g.rotate(a);
  if (o.shoot) { g.strokeStyle = `rgba(255,90,70,${.35 + p * .5})`; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -R.RT * 60; g.beginPath(); g.moveTo(14, 0); g.lineTo(240, 0); g.stroke(); g.setLineDash([]); }
  else { const L = (o.chain != null ? 600 * .3 : (o.boss ? 420 : 360) * .22) + 30, w = o.boss ? 16 : 12; g.fillStyle = 'rgba(255,60,40,.16)'; g.beginPath(); g.moveTo(8, -w); g.lineTo(L - 12, -w); g.lineTo(L, 0); g.lineTo(L - 12, w); g.lineTo(8, w); g.closePath(); g.fill();
    g.fillStyle = `rgba(255,60,40,${.3 + p * .25})`; const q = 8 + (L - 20) * p; g.beginPath(); g.moveTo(8, -w); g.lineTo(q, -w); g.lineTo(q + 12, 0); g.lineTo(q, w); g.lineTo(8, w); g.closePath(); g.fill(); }
  g.restore(); }
function drawPart(p) { const g = R.g, t = R.T - p.t0, k = p.home ? 1 : Math.max(0, 1 - t / p.life), a = p.home ? 1 : Math.min(1, k * 2.2); g.globalAlpha = a;
  if (p.kind === 'line') { g.strokeStyle = p.col; g.lineWidth = p.sz; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .035, p.y - p.vy * .035); g.stroke(); }
  else if (p.kind === 'star') { const s = p.sz; g.fillStyle = p.col; g.fillRect(p.x - s * 2.5, p.y - s / 2, s * 5, s); g.fillRect(p.x - s / 2, p.y - s * 2.5, s, s * 5); g.fillStyle = '#fff'; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  else if (p.kind === 'coin') coinSq(g, Math.round(p.x), Math.round(p.y), 8, CPAL[p.cv || 3]);
  else if (p.kind === 'xp') { g.fillStyle = p.col; g.fillRect(p.x - 3, p.y - 1, 6, 2); g.fillRect(p.x - 1, p.y - 3, 2, 6); g.fillRect(p.x - 2, p.y - 2, 4, 4); g.fillStyle = '#fff'; g.fillRect(p.x - 1, p.y - 1, 2, 2); }
  else { const s = p.grow ? p.sz * (1 + (1 - k) * .8) : p.sz; g.fillStyle = p.col; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  g.globalAlpha = 1; }
function draw() {
  const g = R.g, G = R.G, T = R.T, RT = R.RT, W = R.W, H = R.H; g.setTransform(R.DPR, 0, 0, R.DPR, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
  // 카메라: 흔들림(세기² 로 부드럽게) + 맞은 방향 밀림 + 살짝 확대
  const tr = R.TR * R.TR, sx = Math.sin(RT * 83 + 1.7) * 9 * tr + R.KX, sy = Math.sin(RT * 67) * 9 * tr + R.KY, zm = 1 + R.ZM, fx = G ? G.me.x : W / 2, fy = G ? G.me.y - 20 : H / 2;
  if (R.BG) g.drawImage(R.BG, -20, -20, W + 40, H + 40); else { g.fillStyle = '#e4cc96'; g.fillRect(0, 0, W, H); }   // 흔들릴 때 가장자리가 비지 않게 한 겹 깔아 둠
  g.translate(fx + sx, fy + sy); g.scale(zm, zm); g.translate(-fx, -fy);
  if (R.BG) g.drawImage(R.BG, 0, 0, W, H);
  if (!G) return;
  for (const o of G.mobs) if (o.hp > 0) drawTele(o);
  for (const f of G.fields) drawField(f);
  for (const z of G.zones) drawZone(z);
  drawHaz();
  for (const t of G.traps) drawTrap(t);
  for (const c of G.cracks) drawCrack(c);
  for (const p of G.drops) if (p.coin) drawCoin(p); else if (p.box) drawBox(p); else drawShard(p);
  for (const it of G.items) drawItem(it);
  if (G.me.hp > 0 && (G.me.buff > 0 || G.mag > 0)) { const me = G.me, g2 = R.g; if (me.buff > 0) { g2.strokeStyle = `rgba(160,240,130,${.35 + .25 * Math.sin(RT * 8)})`; g2.lineWidth = 3; g2.setLineDash([10, 8]); g2.lineDashOffset = -RT * 40; g2.beginPath(); g2.ellipse(me.x, me.y, 92 * RNG * .62, 92 * RNG * .62 * .5, 0, 0, 7); g2.stroke(); g2.setLineDash([]); }
    if (G.mag > 0) { const p = (RT * 1.2) % 1; g2.strokeStyle = `rgba(255,120,120,${.6 * p})`; g2.lineWidth = 3; g2.beginPath(); g2.ellipse(me.x, me.y, 120 * (1 - p) + 14, (120 * (1 - p) + 14) * .5, 0, 0, 7); g2.stroke(); } }
  for (let i = R.GH.length - 1; i >= 0; i--) { const h = R.GH[i], t = T - h.t0; if (t > h.d) { R.GH.splice(i, 1); continue; } blit(h.F, h.x, h.y, { a: .5 * (1 - t / h.d) }); }
  for (const e of [...G.mobs, G.me].sort((a, b) => a.y - b.y)) { if (e.hide) drawHide(e); if (!e.hide || e.hide.mode === 'sky') drawMon(e); if (!e.mine && e.hp > 0 && e.enter <= 0) hpBar(e); }
  drawFence(); if (G.me.hp > 0 && R.run) meBar(G.me);
  for (const s of G.shots) { if (s.mine) { const E = s.v.Rr?.e || []; let n = 0;
      if (s.amp) { const pr = 15 + Math.sin(RT * 34) * 3; g.globalAlpha = .34; g.fillStyle = s.col; g.beginPath(); g.arc(s.x, s.y, pr + 5, 0, 7); g.fill(); g.globalAlpha = .5; g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, pr * .55, 0, 7); g.fill(); g.globalAlpha = 1; g.save(); g.translate(s.x, s.y); g.scale(AMP, AMP); g.translate(-s.x, -s.y); }
      for (const [ro, kk, ft] of E) if (ro === 'proj' || ro === 'stream') { n++; pfxDraw(kk, ((T - s.t0) * 60 / ft) % (PX().s[kk]?.[2] || 1), s.x, s.y, s.f, { rot: s.f > 0 ? s.ang : s.ang - Math.PI }); } if (!n) orbT(s); if (s.amp) g.restore(); }
    else orb(s.x, s.y, TYPE_C[s.t] || '#fff', 7 + Math.sin(RT * 30) * 1); }
  if (G.me.ch) drawCh(G.me);
  for (let i = R.FX.length - 1; i >= 0; i--) { const f = R.FX[i], t = T - f.t0; if (t < 0) continue; if (t > f.d) { R.FX.splice(i, 1); continue; } try { f.draw(t); } catch (e) { R.FX.splice(i, 1); } }
  for (const p of R.PT) drawPart(p);
  g.textAlign = 'center';
  for (let i = R.POPS.length - 1; i >= 0; i--) { const p = R.POPS[i], t = RT - p.t0; if (t > .95) { R.POPS.splice(i, 1); continue; }
    const num = typeof p.txt === 'number', sz = (p.sz || (num ? (p.big ? 24 : 17) : p.big ? 16 : 12)) * (t < .12 ? 1.75 - t * 6.25 : 1), e = 1 - Math.exp(-t * 5), x = p.x + p.vx * e, y = p.y - 26 * e + p.vy * e;
    g.font = `bold ${Math.round(sz)}px Galmuri11`; g.globalAlpha = t > .7 ? (1 - (t - .7) / .25) : 1; g.lineWidth = p.big ? 4 : 3; g.strokeStyle = p.crit ? '#b01810' : '#20202c'; g.strokeText(p.txt, x, y); g.fillStyle = t < .07 ? '#fff' : p.col; g.fillText(p.txt, x, y); g.globalAlpha = 1; }
  // 화면 전체 효과: 번쩍, 맞았을 때·HP 적을 때 빨간 가장자리, 느린 화면 푸른 빛
  g.setTransform(R.DPR, 0, 0, R.DPR, 0, 0);
  const low = G.me.hp > 0 && G.me.hp / G.me.mhp < .25 && R.run ? .35 + .25 * Math.sin(RT * 7) : 0, vg = Math.max(R.VIG, low);
  if (vg > .01) { const gr = g.createRadialGradient(W / 2, H / 2, Math.max(W, H) * .36, W / 2, H / 2, Math.max(W, H) * .68); gr.addColorStop(0, 'rgba(255,40,30,0)'); gr.addColorStop(1, `rgba(255,40,30,${.5 * vg})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  if (R.SLOW > 0) { g.fillStyle = `rgba(90,140,255,${.1 * Math.min(1, R.SLOW * 6)})`; g.fillRect(0, 0, W, H); }
  drawWx(); shardFx();
  if (R.FLASH > 0) { g.fillStyle = `rgba(${R.FLC},${Math.min(.85, R.FLASH * 3)})`; g.fillRect(0, 0, W, H); }
}
// 꾹 누르는 동안: 줄기 기술은 빔이 쭉 뻗는다 (원본 줄기 그림을 줄지어 흘려보내고, 밑에 타입 색 빛줄기), 머리 위엔 남은 지속 시간
function drawCh(me) { const g = R.g, c = me.ch, T = R.T, K = c.K, dx = Math.cos(c.ang), dy = Math.sin(c.ang);
  if (c.kind === 'stream') { const len = Math.min(BEAM * rg(), 40 + c.t * 1100), x0 = me.x + dx * 14, y0 = me.y - 20 + dy * 8, end = Math.min(1, (c.max - c.t) / .15), RT = R.RT;
    // 빔: 방향 따라 3px 칸씩 찍으며 폭이 출렁인다 (바깥 타입 색 → 밝은 색 → 흰 심), 끝은 둥글게 부풀고 원본 줄기 그림이 위로 흘러간다
    g.save(); g.translate(x0, y0); g.rotate(c.ang);
    for (let d = 0; d < len; d += 3) { const tip = Math.min(1, (len - d) / 18), root = Math.min(1, d / 12 + .4), wv = 1 + .22 * Math.sin(d * .11 - RT * 26) + .1 * Math.sin(d * .31 + RT * 17), w = Math.round(11 * (c.amp ? 1.7 : 1) * wv * end * root * (.55 + .45 * tip));
      if (c.amp) { g.globalAlpha = .2; g.fillStyle = c.col; g.fillRect(d, -w - 11, 3, w * 2 + 22); g.globalAlpha = .3; g.fillStyle = '#fff'; g.fillRect(d, -w - 6 + Math.round(Math.sin(d * .2 + RT * 30) * 2), 3, 2); g.fillRect(d, w + 4 - Math.round(Math.sin(d * .2 + RT * 30) * 2), 3, 2); }
      g.globalAlpha = .4; g.fillStyle = c.col; g.fillRect(d, -w - 4, 3, w * 2 + 8); g.globalAlpha = .85; g.fillRect(d, -w, 3, w * 2); g.globalAlpha = .9; g.fillStyle = '#fff'; const cw = Math.max(1, Math.round(w * .42)); g.fillRect(d, -cw, 3, cw * 2); }
    g.globalAlpha = .9 * end; g.fillStyle = '#fff'; const tr = (10 + Math.sin(RT * 40) * 3) * (c.amp ? 1.6 : 1); g.fillRect(len - tr / 2, -tr, tr, tr * 2); g.fillRect(len - tr, -tr / 2, tr * 2, tr); g.fillStyle = c.col; g.globalAlpha = .6 * end; g.fillRect(-8, -12, 14, 24);
    g.restore(); g.globalAlpha = 1;
    const E = (c.v.Rr?.e || []).filter(e => e[0] === 'stream'); for (const [, kk, ft] of E) { const n = PX().s[kk]?.[2] || 1; for (let d = 26 + ((T * 300) % 34); d < len - 6; d += 34) pfxDraw(kk, ((T * 60 / ft) + d / 9) % n, x0 + dx * d, y0 + dy * d, c.f, { rot: c.f > 0 ? c.ang : c.ang - Math.PI, a: end }); } }
}
function orb(x, y, c, r) { const g = R.g; g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x, y, r + 4, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - 2, y - 2, r * .4, 0, 7); g.fill(); g.strokeStyle = '#20202c'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 1, 0, 7); g.stroke(); }
function loop(ms) {
  if (!R) return; const now = ms / 1000, rdt = Math.min(.05, R.last ? now - R.last : 0); R.last = now; R.RT += rdt;
  // 멈칫하는 동안엔 판 시간이 서고, 느린 화면일 땐 천천히 흐른다. 흔들림·숫자는 실제 시간으로
  let dt = rdt; if (R.PZ) dt = 0; else if (R.HS > 0) { R.HS -= rdt; dt = 0; } else if (R.SLOW > 0) { R.SLOW -= rdt; dt = rdt * R.SLOWK; }
  R.HSB = Math.min(.3, (R.HSB ?? .3) + rdt * .3); R.TR = Math.max(0, R.TR - rdt * 1.9); { const k = Math.exp(-rdt * 16); R.KX *= k; R.KY *= k; } R.ZM *= Math.exp(-rdt * 7); R.FLASH = Math.max(0, R.FLASH - rdt); R.VIG = Math.max(0, R.VIG - rdt * 2.4);
  try { padPoll(); } catch (e) {} if (!R) return;
  R.T += dt; if (R.G && dt > 0) step(dt); if (R && R.run && R.G) cdUi();
  if (!R) return; draw(); R.raf = requestAnimationFrame(loop);
}

// ---------- 조작 ----------
function bind() {
  const r = R, q = r.q, J = r.JOY, jz = q('.ya-joy'), jb = q('.ya-joyb'), jk = q('.ya-joyk'), on = (t, ev, f, o) => { t.addEventListener(ev, f, o); r.off.push(() => t.removeEventListener(ev, f, o)); };
  const rect = () => r.el.getBoundingClientRect();
  const js = e => { if (!r.run) return; const t = e.changedTouches ? e.changedTouches[0] : e, b = rect(); J.id = t.identifier ?? 'm'; J.ox = t.clientX; J.oy = t.clientY; jb.style.left = (t.clientX - b.left) + 'px'; jb.style.top = (t.clientY - b.top) + 'px'; jb.classList.add('on'); jm(e); e.preventDefault(); };
  const jm = e => { if (J.id == null) return; for (const t of e.changedTouches ? [...e.changedTouches] : [e]) { if ((t.identifier ?? 'm') !== J.id) continue; let dx = t.clientX - J.ox, dy = t.clientY - J.oy; const d = Math.hypot(dx, dy), RR = 44; if (d > RR) { dx *= RR / d; dy *= RR / d; } J.dx = dx / RR; J.dy = dy / RR; jk.style.transform = `translate(${dx}px,${dy}px)`; } e.preventDefault?.(); };
  const je = e => { for (const t of e.changedTouches ? [...e.changedTouches] : [e]) if ((t.identifier ?? 'm') === J.id) { J.id = null; J.dx = J.dy = 0; jk.style.transform = ''; jb.classList.remove('on'); } };
  on(jz, 'touchstart', js, { passive: false }); on(jz, 'touchmove', jm, { passive: false }); on(jz, 'touchend', je); on(jz, 'touchcancel', je);
  on(jz, 'mousedown', e => { js(e); const mm = ev => jm(ev), mu = ev => { je(ev); removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); }; addEventListener('mousemove', mm); addEventListener('mouseup', mu); });
  const keyJoy = () => { if (J.id != null) return; const K = r.KEY, x = (K.arrowright || K.d ? 1 : 0) - (K.arrowleft || K.a ? 1 : 0), y = (K.arrowdown || K.s ? 1 : 0) - (K.arrowup ? 1 : 0), l = Math.hypot(x, y) || 1; J.dx = x / l; J.dy = y / l; };
  on(window, 'keydown', e => { if (!r.run) return; const k = e.key.toLowerCase(); const i = 'qwer'.indexOf(k); if (i >= 0 && !e.repeat) { useMove(i, true); r.HELD[i] = 1; } r.KEY[k] = 1; if (e.key === ' ') { if (!e.repeat) dodge(); e.preventDefault(); } if (k.startsWith('arrow')) e.preventDefault(); keyJoy(); });
  on(window, 'keyup', e => { const k = e.key.toLowerCase(); r.KEY[k] = 0; const i = 'qwer'.indexOf(k); if (i >= 0) delete r.HELD[i]; keyJoy(); });
  on(window, 'mouseup', () => { r.HELD = {}; }); on(window, 'blur', () => { r.HELD = {}; });
  { const go = e => { e.preventDefault(); dodge(); }, d = q('.ya-dg'); on(d, 'touchstart', go, { passive: false }); on(d, 'mousedown', go); }
  on(q('.ya-pk'), 'click', e => { const b = e.target.closest('.pkc'); if (!b) return; se('SELECT'); r.pick = +b.dataset.i; const o = r.mons[r.pick]; if (o.evk >= 0) r.stat = o.evk; r.pool = null; startUi(); });
  on(q('.ya-stt'), 'click', e => { const b = e.target.closest('.stc'); if (!b) return; r.stat = +b.dataset.s; r.pool = null; startUi(); });
  { const eh = q('.ya-evh'), cl = () => eh.classList.remove('on'); on(q('.ya-evq'), 'click', () => { se('DECIDE'); evHint(); }); on(eh, 'click', e => { if (e.target === eh) cl(); }); on(q('.eh-x'), 'click', () => { se('SELECT'); cl(); }); on(q('.eh-go'), 'click', e => { const k = e.currentTarget.dataset.k; cl(); if (k === '') return; se('DECIDE'); r.stat = +k; r.pool = null; startUi(); }); }
  on(q('.ya-go'), 'click', () => { se('DECIDE'); bgm('wild'); r.el.classList.remove('pre', 'st0'); q('.ya-start').hidden = true; q('.ya-ov').hidden = true; r.el.classList.add('play'); r.T = 0; r.FX.length = 0; r.POPS.length = 0; newGame(); r.run = true; });
  on(q('.gf-ok'), 'click', () => { const G = r.G; if (!G?.gift || G.giftOk) return; se('DECIDE'); q('.ya-gift').hidden = true; q('.ya-ov').hidden = true; G.giftOk = r.T; });
  on(q('.ya-again'), 'click', () => { se('DECIDE'); bgm('wild'); q('.ya-res').hidden = true; q('.ya-ov').hidden = true; r.FX.length = 0; r.POPS.length = 0; r.el.classList.add('play'); newGame(); r.run = true; });
  on(q('.ya-back'), 'click', () => close());
  on(q('.ya-x'), 'click', () => close());
  { /* 하는 법 창 (머리줄 ?) — 게임 화면 캡처 + 짧은 설명 4장, 좌우로 밀어도 넘어감 */
    const TU = [['이동', '화면 <b>왼쪽 아래</b>를 누른 채 끌면<br>그쪽으로 움직여요.'], ['기술', '<b>오른쪽 아래 기술 버튼</b>을 누르면 기술을 써요.<br>꾹 누르고 있으면 쭉 이어져요.'], ['대쉬', '상대 머리 위에 <b>!</b> 가 뜨면 곧 공격이 와요.<br>그때 <b>대쉬</b>를 딱 맞춰 누르면 피해요.'], ['줍기', '떨어진 <b>골드·아이템</b>은 가까이 가면 주워요.<br>번뜩임을 모으면 특별한 기술을 깨달아요.']];
    const tu = q('.ya-tu'); let ti = 0; tu.querySelector('.tu-dots').innerHTML = TU.map(() => '<i></i>').join('');
    const show = () => { tu.querySelector('img').src = `gym/img/yact/tut${ti + 1}.png?3`; tu.querySelector('.tu-h').innerHTML = `<i>${ti + 1}</i>${TU[ti][0]}`; tu.querySelector('.tu-p').innerHTML = TU[ti][1]; [...tu.querySelectorAll('.tu-dots i')].forEach((d, i) => d.classList.toggle('on', i === ti)); tu.querySelector('.tu-pv').disabled = !ti; tu.querySelector('.tu-nx').textContent = ti === TU.length - 1 ? '확인' : '다음'; };
    const off = () => tu.classList.remove('on'), go = d => { const n = ti + d; if (n < 0) return; if (n >= TU.length) { se('DECIDE'); off(); return; } ti = n; se('SELECT'); show(); };
    on(q('.fs-hp'), 'click', () => { se('DECIDE'); ti = 0; show(); tu.classList.add('on'); });
    on(tu, 'click', e => { if (e.target === tu || e.target.closest('.tu-x')) off(); else if (e.target.closest('.tu-nx')) go(1); else if (e.target.closest('.tu-pv')) go(-1); });
    let sx = null; on(tu, 'touchstart', e => { sx = e.touches[0].clientX; }, { passive: true }); on(tu, 'touchend', e => { if (sx == null) return; const d = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(d) > 44 && !(d < 0 && ti === TU.length - 1)) go(d < 0 ? 1 : -1); }, { passive: true }); }
  { /* 조이콘 2 연결 창: 아이폰 앱(joycon2 다리)이 있을 때만 버튼이 보인다. 열면 앱이 45초 동안 찾고, 붙은 쪽이 초록으로 */
    const jb = q('.fs-jc'), jw = q('.ya-jc'), MSG = { off: '아이폰 블루투스가 꺼져 있어요. 켜고 다시 열어 주세요.', denied: '블루투스 권한이 꺼져 있어요. 설정 › 포켓에그 › Bluetooth 를 켜 주세요.' };
    const paint = () => { if (R !== r) return; const m = JC.m; jb.classList.toggle('on', !!m); jw.querySelector('.l').classList.toggle('ok', !!(m & 5)); jw.querySelector('.r').classList.toggle('ok', !!(m & 6)); jw.querySelector('.l').textContent = m & 4 ? '프로 컨트롤러' : m & 1 ? '왼쪽 연결됨' : '왼쪽'; jw.querySelector('.r').textContent = m & 4 ? '연결됨' : m & 2 ? '오른쪽 연결됨' : '오른쪽';
      const e = jw.querySelector('.jc-m'); e.classList.toggle('i', !MSG[JC.st]); e.textContent = MSG[JC.st] || (m ? (m === 1 || m === 2 ? '한쪽만 쓰면 가로로 쥐고 해요.' : '연결됐어요!') : JC.st === 'scan' ? '찾는 중…' : ''); };
    if (jcApp()) { jb.hidden = false; const iv = setInterval(paint, 300); r.off.push(() => clearInterval(iv)); paint();
      on(jb, 'click', () => { se('DECIDE'); jw.classList.add('on'); JC.st = 'scan'; paint(); try { Promise.resolve(jcApp().postMessage({ op: 'scan' })).then(st => { if (typeof st === 'string' && st !== 'idle') JC.st = st; paint(); }, () => {}); } catch (e) {} });
      on(jw, 'click', e => { if (e.target === jw || e.target.closest('.jc-x')) { se('SELECT'); jw.classList.remove('on'); } }); } }
  on(q('.ya-quit'), 'click', () => pzOpen(0));
  on(q('.pz-go'), 'click', pzGo); on(q('.pz-q'), 'click', () => { if (R !== r || r.PZ !== 1 || !r.G) return; se('CANCEL'); q('.ya-pz').hidden = true; r.PZ = 0; duckSet(1); end(false, false, true); });
  on(q('.ya-pz'), 'click', e => { if (e.target === e.currentTarget && !e.currentTarget.classList.contains('np')) pzGo(); });   /* 직접 '그만' 을 눌러 연 창만 바깥을 눌러 계속하기. 앱에서 돌아와 저절로 뜬 창은 버튼으로만 */
  { const hid = () => { if (document.hidden && R === r) pzOpen(1); }; on(document, 'visibilitychange', hid); on(window, 'pagehide', () => { if (R === r) pzOpen(1); }); }
  let rz = 0; on(window, 'resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (R === r) resize(); }, 200); });
}
// ---------- 컨트롤러 (웹 표준 게임패드: PS·Xbox·스위치 프로·8BitDo·백본) ----------
// 버튼 번호는 자리 기준(0 아래 · 1 오른쪽 · 2 왼쪽 · 3 위)이라 컨트롤러마다 글자만 다르다. 기술 버튼은 화면 자리대로: 오른쪽 아래 = 아래 버튼, 오른쪽 위 = 오른쪽, 왼쪽 아래 = 왼쪽, 왼쪽 위 = 위
const GP = { on: 0, id: '', kind: 0, pv: [], nav: '', map: [0, 1, 2, 3], G: null, joy: 0, held: {}, ctx: '' };
const GP_L = [['A', 'B', 'X', 'Y'], ['✕', '○', '□', '△'], ['B', 'A', 'Y', 'X'], ['▼', '▶', '◀', '▲']], GP_ST = ['☰', 'OPT', '+', '+'], GP_R = ['RB', 'R1', 'R', 'SR'];
const gpKind = id => /\(one\)/.test(id) ? 3 : /playstation|dualsense|dualshock|054c/i.test(id) ? 1 : /nintendo|switch|pro controller|joy-?con|057e|8bitdo|2dc8/i.test(id) ? 2 : 0;
/* 조이콘 2 (아이폰 앱이 직접 붙임): 앱이 window.__jc2(버튼 비트, lx, ly, rx, ry, 붙은 쪽 1 왼쪽·2 오른쪽·4 프로) 로 넘긴 값을 표준 배치 컨트롤러 모양으로 바꾼다.
   한쪽만 붙었으면 가로로 쥔 것으로 본다(스틱·버튼을 90도 돌림, SL·SR = 대쉬). 버튼 비트는 커뮤니티 분석 값(JoyCon2.swift 머리 주석) */
const JC = { b: 0, lx: 0, ly: 0, rx: 0, ry: 0, m: 0, n: 0, st: '' };
window.__jc2 = (b, lx, ly, rx, ry, m) => { JC.b = b >>> 0; JC.lx = lx; JC.ly = ly; JC.rx = rx; JC.ry = ry; JC.m = m | 0; JC.n++; };
window.__jc2s = (st, m) => { JC.st = st; JC.m = m | 0; if (!JC.m) JC.b = 0; JC.n++; };
const jcApp = () => { try { if ((JSON.parse(localStorage.getItem('pk-acct') || 'null') || {}).id !== 'flyweb') return null; } catch (e) { return null; } return window.webkit?.messageHandlers?.joycon2; };   // 경완 '나만 보이게 해줘' (2026-11-17): 조이콘 2 버튼은 운영자 계정(index.html opAcct 와 같은 조건)에서만
function jcPad() {
  const b = JC.b, h = k => (b & k) !== 0, m = JC.m, one = m === 1 || m === 2;
  let F, ax, ay, sh, st;   /* F = 자리 기준 [아래, 오른쪽, 왼쪽, 위] */
  if (m === 1) { F = [h(0x08000000), h(0x01000000), h(0x02000000), h(0x04000000)]; ax = -JC.ly; ay = -JC.lx; sh = [h(0x20000000), h(0x10000000), h(0x40000000), h(0x80000000)]; st = h(0x10000) || h(0x200000); }
  else if (m === 2) { F = [h(0x800), h(0x200), h(0x400), h(0x100)]; ax = JC.ry; ay = JC.rx; sh = [h(0x2000), h(0x1000), h(0x4000), h(0x8000)]; st = h(0x20000) || h(0x100000); }
  else { F = [h(0x400), h(0x800), h(0x100), h(0x200)]; ax = JC.lx; ay = -JC.ly; sh = [h(0x40000000), h(0x4000), h(0x80000000), h(0x8000)]; st = h(0x20000) || h(0x10000); }
  const B = [...F, ...sh, false, st, false, false, !one && h(0x02000000), !one && h(0x01000000), !one && h(0x08000000), !one && h(0x04000000)];
  return { id: one ? 'Joy-Con 2 (one)' : 'Joy-Con 2 Nintendo', connected: true, timestamp: JC.n, axes: [ax, ay, 0, 0], buttons: B.map(v => ({ pressed: !!v, value: v ? 1 : 0 })) };
}
function gpGet() { if (JC.m) return jcPad(); let best = null; try { for (const p of navigator.getGamepads?.() || []) if (p && p.connected && p.buttons.length >= 4 && (!best || p.timestamp > best.timestamp)) best = p; } catch (e) {} return best; }
function gpLab() {
  const box = R.q('.ya-mvs'), L = [...box.children], lab = GP_L[GP.kind]; GP.map = [-1, -1, -1, -1];
  if (L.length) { const C = L.map(b => { const t = b.getBoundingClientRect(); return [t.left + t.width / 2, t.top + t.height / 2]; }), cx = C.reduce((a, c) => a + c[0], 0) / C.length, cy = C.reduce((a, c) => a + c[1], 0) / C.length, rest = [];
    C.forEach((c, i) => { const f = c[0] >= cx ? (c[1] >= cy ? 0 : 1) : (c[1] >= cy ? 2 : 3); if (GP.map[f] < 0) GP.map[f] = i; else rest.push(i); });
    for (const i of rest) { const f = GP.map.indexOf(-1); if (f >= 0) GP.map[f] = i; } }
  GP.map.forEach((i, f) => { if (i >= 0) { L[i].dataset.gp = lab[f]; L[i].querySelector('.tg').dataset.gp = lab[f]; } }); R.q('.ya-dg').dataset.gp = GP_R[GP.kind]; R.q('.ya-quit').dataset.gp = GP_ST[GP.kind];
}
function gpFocus(L, d) { L = L.filter(Boolean); if (!L.length) return null; let i = L.findIndex(b => b.classList.contains('gpf')); if (i < 0) i = 0; else if (d) { i = (i + d + L.length) % L.length; se('SELECT'); }
  R.el.querySelectorAll('.gpf').forEach(b => b.classList.remove('gpf')); L[i].classList.add('gpf'); return L[i]; }
function padPoll() {
  const r = R, p = gpGet(), J = r.JOY;
  if (!p) { if (GP.on) { GP.on = 0; GP.pv = []; r.el.classList.remove('gp'); r.el.querySelectorAll('.gpf').forEach(b => b.classList.remove('gpf')); if (GP.joy) { GP.joy = 0; if (J.id == null) J.dx = J.dy = 0; } for (const i in GP.held) delete r.HELD[i]; GP.held = {}; } return; }
  if (!GP.on || GP.id !== p.id || !r.el.classList.contains('gp')) { GP.on = 1; GP.id = p.id; GP.kind = gpKind(p.id); GP.G = null; GP.ctx = ''; r.el.classList.add('gp'); }
  const dn = i => { const b = p.buttons[i]; return !!b && (b.pressed || b.value > .5); }, now = p.buttons.map((b, i) => dn(i)), hit = i => now[i] && !GP.pv[i];
  let ax = +p.axes[0] || 0, ay = +p.axes[1] || 0; if (now[14]) ax = -1; if (now[15]) ax = 1; if (now[12]) ay = -1; if (now[13]) ay = 1;
  const mag = Math.hypot(ax, ay), nv = mag < .6 ? '' : Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 'l' : 'r') : (ay < 0 ? 'u' : 'd'), nav = nv !== GP.nav ? nv : ''; GP.nav = nv;
  const q = r.q, vis = c => { const e = q(c); return e && !e.hidden && e.offsetParent !== null ? e : null; }, click = e => { if (e) e.click(); };
  const A = hit(0), B = hit(1), ST = hit(9) || hit(8), step = nav === 'u' || nav === 'l' ? -1 : nav ? 1 : 0;
  const ctx = q('.ya-tu').classList.contains('on') ? 'tu' : q('.ya-evh').classList.contains('on') ? 'evh' : r.PZ === 1 ? 'pz' : r.PZ === 2 ? 'cd' : vis('.ya-gift') ? 'gift' : vis('.ya-res') ? 'res' : vis('.ya-start') ? 'start' : r.run ? 'play' : '';
  if (ctx !== GP.ctx) { GP.ctx = ctx; r.el.querySelectorAll('.gpf').forEach(b => b.classList.remove('gpf')); }
  if (ctx === 'play') {
    if (GP.G !== r.G || !q('.ya-mvs').firstChild?.dataset.gp) { GP.G = r.G; gpLab(); }
    if (J.id == null) { const D = .22; if (mag > D) { const k = Math.min(1, (mag - D) / (1 - D)) / mag; J.dx = ax * k; J.dy = ay * k; GP.joy = 1; } else if (GP.joy) { GP.joy = 0; J.dx = J.dy = 0; } }
    for (let f = 0; f < 4; f++) { const i = GP.map[f]; if (i < 0) continue; if (hit(f)) { useMove(i, true); r.HELD[i] = 1; GP.held[i] = 1; } else if (!now[f] && GP.held[i]) { delete r.HELD[i]; delete GP.held[i]; } }
    if (hit(4) || hit(5) || hit(6) || hit(7)) dodge();
    if (ST) pzOpen(0);
  } else {
    if (GP.joy) { GP.joy = 0; if (J.id == null) J.dx = J.dy = 0; } GP.held = {};
    if (ctx === 'pz') { const f = gpFocus([q('.pz-go'), q('.pz-q')], step); if (A) click(f); else if (B || ST) pzGo(); }
    else if (ctx === 'gift') { const f = gpFocus([q('.gf-ok')], 0); if (A || ST) click(f); }
    else if (ctx === 'res') { const f = gpFocus([vis('.ya-again'), vis('.ya-back')], step); if (A) click(f); }
    else if (ctx === 'start') { const f = gpFocus([q('.ya-go')], 0); if (A || ST) click(f); else if (B) click(q('.ya-x')); else { const d = hit(4) || nav === 'l' ? -1 : hit(5) || nav === 'r' ? 1 : 0, L = [...q('.ya-pk').querySelectorAll('.pkc')]; if (d && L.length > 1) click(L[(r.pick + d + L.length) % L.length]); } }
    else if (ctx === 'tu') { if (A || nav === 'r') click(q('.tu-nx')); else if (nav === 'l') click(q('.tu-pv')); else if (B) click(q('.tu-x')); }
    else if (ctx === 'evh') { if (B) click(q('.eh-x')); else if (A) click(q('.eh-go')); }
  }
  GP.pv = now;
}
function buildButtons() {
  const box = R.q('.ya-mvs'); box.innerHTML = '';
  R.G.M.mv.forEach((v, i) => { const b = document.createElement('button'); b.className = 'mvb'; b.style.setProperty('--tc', TYPE_C[v.t] || '#888');
    b.innerHTML = `<i class="cdo"></i><span class="tg">${TYPE_KO[v.t] || ''}</span><b class="l${Math.min(7, v.name.length)}">${v.name}</b><small>${v.c === 1 ? `물리 ${v.pw}` : v.c === 2 ? `특수 ${v.pw}` : '변화'}</small>`;
    // 누르고 있으면 다시 찰 때마다 이어서 나간다
    const go = e => { e.preventDefault(); useMove(i, true); if (R) R.HELD[i] = 1; }, up = () => { if (R) delete R.HELD[i]; };
    b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('touchend', up); b.addEventListener('touchcancel', up); b.addEventListener('mousedown', go); b.addEventListener('mouseleave', up); box.append(b); });
}
function pressEl(b) { if (!b) return; b.classList.remove('pr'); void b.offsetWidth; b.classList.add('pr'); }
function cdUi() { const G = R.G, me = G.me, box = R.q('.ya-mvs'), dg = R.q('.ya-dg');
  G.M.mv.forEach((v, i) => { const b = box.children[i]; if (!b) return; const on = me.hide?.i === i ? me.hide.t / me.hide.max : me.ch?.i === i ? me.ch.t / me.ch.max : me.dash?.hold === i ? me.dash.el / me.dash.max : -1, c = on >= 0 ? 0 : me.cd[v.name], m = me.cdMax[v.name] || 1, was = b._cd; b._cd = c > 0; b.classList.toggle('amp', !!ampOf(v)); b.classList.toggle('cd', c > 0); b.classList.toggle('ch', on >= 0); b.querySelector('.cdo').style.setProperty('--p', on >= 0 ? (on * 360) + 'deg' : c > 0 ? (c / m * 360) + 'deg' : '0deg');
    if (was && !(c > 0)) { b.classList.remove('rdy'); void b.offsetWidth; b.classList.add('rdy'); } });   // 다시 찼을 때 번쩍
  dg.style.setProperty('--p', (me.dcd / .8 * 360) + 'deg'); dg.classList.toggle('cd', me.dcd > 0);
  const tm = R.q('.ya-tm'); tm.textContent = mmss(G.time);
  if (G.combo) R.q('.ya-cb u').style.width = Math.max(0, G.comboT / 2.5 * 100) + '%'; }

// ---------- HUD ----------
function hud() {
  const G = R?.G; if (!G) return; const q = R.q, me = G.me, eg = G.M.eg, r = me.hp / me.mhp;
  q('.ya-wn').textContent = G.wave; q('.ya-stg').innerHTML = STAGES.map((S, i) => { const a = (166 - i * 152 / (STAGES.length - 1)) * Math.PI / 180;   /* 반원 테두리를 따라 왼쪽에서 오른쪽으로 */
    return `<i class="${S.boss ? 'b ' : ''}${i < G.wave - 1 ? 'd' : i === G.wave - 1 ? 'c' : ''}" style="left:${(73 + Math.cos(a) * 59).toFixed(1)}px;bottom:${(73 - Math.sin(a) * 59).toFixed(1)}px"></i>`; }).join(''); q('.ya-m').textContent = `${G.ko}마리`; q('.mg-hg b').textContent = G.goldShown;
  q('.ya-rwe').textContent = `+${G.exp}`; q('.ya-rwv').textContent = `${G.ev}/${Math.min(EV_CAP, G.M.evRoom)}`; q('.ya-rwk').textContent = STAT_KO[G.stat]; q('.ya-rwxb').style.width = Math.min(100, G.exp / Math.max(1, G.xpB) * 100) + '%'; q('.ya-arc .ex').style.setProperty('--p', Math.min(1, G.exp / Math.max(1, G.xpB))); q('.ya-arc .ev').style.setProperty('--p', Math.min(1, G.ev / Math.max(1, Math.min(EV_CAP, G.M.evRoom)))); q('.ya-arc .ya-eg').style.setProperty('--p', (G.M.eg ? G.eggShown : 0) / 100); q('.ya-rwvb').style.width = Math.min(100, G.ev / Math.max(1, Math.min(EV_CAP, G.M.evRoom)) * 100) + '%';
  q('.ya-eg').hidden = !eg;
  if (eg) { q('.ya-egn').textContent = '번뜩임 ???'; q('.ya-egt').textContent = TYPE_KO[eg.t] || ''; q('.ya-egt').style.background = TYPE_C[eg.t] || '#888'; q('.ya-egf').style.setProperty('--tc', TYPE_C[eg.t] || '#ee99ac');
    q('.ya-egf').style.width = G.eggShown + '%'; q('.ya-egf0').style.width = G.egg0 + '%'; q('.ya-egp').textContent = `${G.eggShown}%`; q('.ya-egs').textContent = `이번 판 +${G.shard}%`; }
  q('.ya-me').textContent = `${nmOf(G.o.P)} Lv.${me.lv}`;
}
function hgUp() { const el = R.q('.mg-hg'); el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); hud(); }
function cbUi(up) { const G = R.G, el = R.q('.ya-cb'), n = G.combo; el.classList.toggle('on', n >= 2); if (n < 2) return; el.dataset.t = n >= 30 ? 3 : n >= 10 ? 2 : 1;
  el.querySelector('b').textContent = n; el.querySelector('small').textContent = `기술 충전 +${Math.round(Math.min(.45, n * .015) * 100)}%`;
  if (up) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); } }
/* 일시정지: R.PZ 1 = 창이 떠 있음, 2 = 계속하기 뒤 3·2·1 세는 중. 그동안 판 시간(dt)이 서고 조작(R.run)도 막힌다 */
const duckSet = on => { try { if (R?.bgmNow) window.GymBGM?.duck(on ? BGM_K : BGM_K * .35); } catch (e) {} };
function pzOpen(auto) {
  const G = R?.G; if (!R || !R.run || !G || G.over || R.PZ || !R.q('.ya-ov').hidden) { if (auto && R?.PZ === 2) { R.PZ = 1; R.pzN = (R.pzN | 0) + 1; pzShow(1); } return; }
  R.PZ = 1; R.run = false; chEnd(); dashEnd(); R.JOY.id = null; R.JOY.dx = R.JOY.dy = 0; R.HELD = {}; R.BUF = null; R.KEY = {}; duckSet(0); pzShow(auto);
}
function pzShow(auto) { const w = R.q('.ya-pz'); w.hidden = false; w.classList.toggle('np', !!auto); if (auto) { void w.offsetWidth; se('PINPON', .3); buzz(1); } else se('WIN_OPEN'); }
function pzGo() {
  if (!R || R.PZ !== 1) return; const r = R, G = r.G, n = r.pzN = (r.pzN | 0) + 1; r.PZ = 2; r.q('.ya-pz').hidden = true; se('DECIDE'); duckSet(1);
  const ok = () => R === r && r.G === G && !G.over && r.PZ === 2 && r.pzN === n;
  ['3', '2', '1'].forEach((t, i) => setTimeout(() => { if (!ok()) return; banner(`<b>${t}</b>`, 'stg'); buzz(0); se('KON', .05, { gain: 1.5 }); }, i * 750));
  setTimeout(() => { if (!ok()) return; r.PZ = 0; r.run = true; r.last = 0; banner('<b style="font-size:60px">시작!</b>', 'stg'); buzz(1); se('KON2', .05, { gain: 1.5 }); }, 3 * 750);
}
function banner(t, kind = '') { const b = R.q('.ya-ban'); b.innerHTML = `<span>${t}</span>`; b.className = 'ya-ban'; void b.offsetWidth; b.className = 'ya-ban on ' + kind; }

// ---------- 끝: 결과창 + 보상 지급 ----------
/* 경완 2026-11-16 '됐어 이제 본게임에 체육관 내 업데이트 알림창이랑 같이 배포해': 특훈 일반 공개 — 결과창에 보이는 값을 그대로 실제로 준다 (pay).
   운영자 '특훈 시연'(gymSimOn) 안에서는 예전처럼 보여 주기만. 클리어 보상 꾸러미(선물상자)는 하루 첫 완주에만 (giftDue, g.yaD = 받은 날) — 횟수 제한이 없어 꾸러미(평균 약 2,800G)를 판마다 주면 상점이 무너짐 */
const dayK = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }, giftDue = () => true;   /* 경완 2026-11-16 '꾸러미 횟수 제한 없어도 돼.' — 하루 첫 완주 제한(v26.34)을 뺌. g.yaD 는 받은 날 기록으로만 남김 */
function pay(G, clear, fr, faint, quit) { if (window.gymSimOn || G.paid) return; G.paid = 1; const B = GB(), P = G.o.P, g = GA.S?.gym; if (!g || !B.boxOf?.(P.id)) return;
  try { const m = B.gm(P); if (G.exp > 0) B.gainXp(P, G.exp, 'keep'); if (G.ev > 0) B.evAdd(m, G.stat, G.ev); if (fr > 0) { if (GA.addFr) GA.addFr(P.id, fr); else P.fr = Math.min(255, (P.fr || 0) + fr); }
    const eg = G.M.eg; if (eg && G.egg > G.egg0) G.egGot = B.egAdd(P, eg.i, G.egg - G.egg0) || null;
    if (G.gold > 0) { if (window.Gym?.k?.addG) window.Gym.k.addG(G.gold, 'yact'); else GA.addGold?.(G.gold, 'yact'); }
    if (G.gift) { g.yaD = dayK(); G.gift.forEach(([id, n]) => { if (id.startsWith('tm:')) { g.tms = g.tms || {}; const k = id.slice(3); g.tms[k] = B.isTR(k) ? (g.tms[k] | 0) + n : 1; } else if ((B.EV_VIT || []).some(v => v[0] === id)) { g.vit = g.vit || {}; g.vit[id] = (g.vit[id] | 0) + n; } else { g.itm = g.itm || {}; g.itm[id] = (g.itm[id] | 0) + n; } }); }
    /* 경완 2026-11-16 '특훈도 지속적으로 유저들 배틀 로그 확인하고 밸런스 확인하는거 루틴화 해줘': 한 판 한 줄. 서버는 kind 'mg' 만 받으므로 g:'yact' 로 보냄 (tools/bal-report.mjs '특훈' 칸, 필드 뜻은 server/README.md). 난이도·보상 장치를 더하면 여기에도 값을 더한다 */
    try { const H = B.HOLD || {}, gv = (G.gift || []).reduce((a, [id, n]) => a + (id.startsWith('tm:') ? tmPr(B.mvOf(id.slice(3)) || []) : (H[id]?.[1] || 300) * n), 0);
      window.pkBal?.('mg', { g: 'yact', w: clear ? 1 : 0, q: quit ? 1 : 0, fn: faint ? 1 : 0, st: G.wave | 0, t: Math.round(G.time), gd: G.gold | 0, xp: G.exp | 0, ev: G.ev | 0, fr: fr | 0, hit: G.hits | 0, ko: G.ko | 0, cm: G.best | 0, ju: G.just | 0, lv: G.M.lv | 0, gr: g.gmax | 0, rk: clear ? (G.hits <= S_HITS ? 'S' : 'A') : '', mgs: G.mgSeen ? 1 : 0, gf: G.gift ? 1 : 0, gv, sp: P.sp, bs: G.pool?.big?.[2] | 0, sk: G.stat | 0 }); } catch (e) {}
    GA.save?.(); } catch (e) { console.error(e); } }
function end(clear, faint, quit) {
  const G = R.G; if (G.over) return; G.over = true; bgm(clear ? 'winWild' : null); chEnd(); dashEnd(); hideEnd(); R.run = false; R.JOY.dx = R.JOY.dy = 0; R.HELD = {}; R.BUF = null; R.el.classList.remove('play'); R.q('.ya-cb').classList.remove('on');
  const rk0 = clear ? (G.hits <= S_HITS ? 'S' : 'A') : '', bonus = CLEAR_G[rk0] || 0, xbon = Math.round(G.exp * (CLEAR_X[rk0] || 0)); G.bonus = bonus; G.exp += xbon; const picked = G.gold + (clear ? G.drops.reduce((a, p) => a + (p.coin ? (p.val || CV[p.coin]) : 0), 0) : 0); G.items = []; const sx = clear ? 2 : YA_SX[G.wave] || 1, sxG = Math.round(picked * (sx - 1)); G.sx = sx; G.sxG = sxG; G.gold = picked + sxG + bonus; G.goldShown = G.gold;   /* v27.18 경완 '미니게임도 점수가 높을수록 골드가 지수적으로' '특훈 포함': 실제 기록 17판 완주 0 → 도달 스테이지 배수 YA_SX, 완주 ×2 (주운 골드에만, 완주 보너스는 따로) */ G.eggShown = G.egg;
  const noF = !G.fainted && (clear || G.wave >= 4) /* 실제 지급부터: 들어가자마자 그만두기로 친밀도만 올리지 못하게 '안 지침 +1' 은 스테이지 4 부터 */, fr = (clear ? 2 : G.wave >= 4 ? 1 : 0) + (noF ? 1 : 0), B = GB(), P = G.o.P, gr = B.growth(P.sp), lv0 = G.M.lv, x1 = G.M.xp + G.exp; let lv1 = lv0; pay(G, clear, fr, faint, quit);
  while (lv1 < B.LV_MAX && x1 >= B.xpAt(gr, lv1 + 1)) lv1++;
  const a = B.xpAt(gr, lv1), b = B.xpAt(gr, lv1 + 1), prog = lv1 >= B.LV_MAX ? 1 : Math.max(0, Math.min(1, (x1 - a) / (b - a || 1))), nm = nmOf(P), eg = G.M.eg;
  setTimeout(() => { if (!R || R.G !== G) return; se('WIN_OPEN'); if (lv1 > lv0) setTimeout(() => se('EXPMAX'), 500); const q = R.q, r = q('.ya-res'), N = (n, pre = '+', suf = '') => `data-n="${n}" data-pre="${pre}" data-suf="${suf}">${pre}0${suf}`;
    q('.rs-h').textContent = clear ? '특훈 완료!' : faint ? `${josa(nm, '이', '가')} 지쳐 버렸다…` : '여기까지!';
    const rk = clear ? rk0 : G.wave >= 7 ? 'B' : G.wave >= 4 ? 'C' : 'D', ic = (t, c) => `<i class="ic" style="--c:${c}">${t}</i>`;
    q('.rs-hero').classList.toggle('win', !!clear); r.classList.toggle('win', !!clear); q('.rs-stg').textContent = clear ? `스테이지 ${STAGES.length}/${STAGES.length} · ${mmss(G.time)}` : `스테이지 ${G.wave}/${STAGES.length} 에서 끝 · ${mmss(G.time)}`;
    { const k = q('.rs-rk'); k.textContent = rk; k.dataset.rk = rk; k.style.animation = 'none'; void k.offsetWidth; k.style.animation = ''; }
    q('.rs-nm').textContent = nm; q('.rs-lv').innerHTML = lv1 > lv0 ? `Lv.${lv0} → <i class="lvup">Lv.${lv1}</i>` : `Lv.${lv1}`; q('.rs-me .xb i').style.setProperty('--w', (prog * 100).toFixed(0) + '%');
    q('.rs-xp').textContent = lv1 >= B.LV_MAX ? '레벨 끝' : `다음 레벨까지 ${Math.max(0, b - x1)}`; { const im = q('.rs-im'); im.removeAttribute('src'); GA.thumb?.(P).then(u => { if (im.isConnected && typeof u === 'string') im.src = u; }).catch(() => {}); }
    q('.rs-sub').innerHTML = `<span><i>쓰러뜨림</i><b>${G.ko}</b></span><span><i>최고 콤보</i><b>${G.best}</b></span><span><i>아슬아슬</i><b>${G.just}</b></span><span><i>맞은 횟수</i><b>${G.hits}</b></span>`;
    { const pool = G.pool, w = G.wave, rd = r.querySelector('.ya-road');   /* 스테이지 길: 깬 칸은 금빛, 쓰러진 칸은 빨갛게, 만난 대장은 얼굴이 보임 */
      rd.innerHTML = STAGES.map((S, i) => `${i ? `<i class="${clear || i < w ? 'dn' : ''}"></i>` : ''}${roadB(S, i, clear || i < w - 1 ? 'dn' : i === w - 1 ? 'no' : '')}`).join('');
      rd.querySelectorAll('b.m').forEach(el => GA.thumb?.({ sp: pool.big[+el.dataset.b] }).then(u => { if (R && R.G === G && el.isConnected && typeof u === 'string') { el.textContent = ''; const im = new Image(); im.alt = ''; im.src = u; el.append(im); } }).catch(() => {}));
      const cf = r.querySelector('.rs-cf'); cf.innerHTML = clear ? Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37 + 11) % 100}%;background:${['#ffd84a', '#ff8a70', '#8fe0ff', '#fff', '#c8a0ff', '#ffe9a0'][i % 6]};animation-duration:${3.2 + (i * 7 % 10) * .28}s;animation-delay:${-(i * 13 % 40) / 10}s;width:${4 + i % 3 * 2}px;height:${4 + (i + 1) % 3 * 2}px"></i>`).join('') : ''; }
    q('.ya-rl').innerHTML = `
      <li class="${xbon ? '' : 'one'}">${ic('경험치', '#3a98e8')}<span class="k">${lv1 > lv0 ? `레벨 ${lv1 - lv0} 올랐어요` : '쓰러뜨린 만큼 받아요'}</span><b ${N(G.exp)}</b>${xbon ? `<em>${rk0} 등급 완주 보너스 +${xbon} 포함</em>` : ''}</li>
      <li>${ic(STAT_KO[G.stat], '#8a4ae0')}<span class="k">노력치</span><b class="ev" ${N(G.ev)}</b><em>${!G.M.evRoom ? '이미 꽉 찼어요' : `한 판 최대 ${Math.min(EV_CAP, G.M.evRoom)}`}</em></li>
      <li class="one">${ic('친밀도', '#e0507a')}<span class="k">${clear ? '특훈 완료 +2' : G.wave >= 4 ? '열심히 했다 +1' : ''}${(clear || G.wave >= 4) && !G.fainted ? ' · ' : ''}${noF ? '안 지침 +1' : (clear || G.wave >= 4 ? '' : '조금 더 버텨 보자')}</span><b class="fr" ${N(fr)}</b></li>
      ${eg ? `<li><svg class="ic sv" viewBox="-13 -13 26 26" aria-hidden="true"><path d="M0.0 -12.5L3.2 -3.2L12.5 0.0L3.2 3.2L0.0 12.5L-3.2 3.2L-12.5 0.0L-3.2 -3.2Z" fill="#20202c"/><path d="M0.0 -9.5L2.4 -2.4L9.5 0.0L2.4 2.4L0.0 9.5L-2.4 2.4L-9.5 0.0L-2.4 -2.4Z" fill="#58c8ff"/><path d="M0.0 -5.2L1.3 -1.3L5.2 0.0L1.3 1.3L0.0 5.2L-1.3 1.3L-5.2 0.0L-1.3 -1.3Z" fill="#fff"/></svg><span class="k">번뜩임</span><b class="eg" ${N(G.shard, '+', '%')}</b><em><i class="egq" style="--tc:${TYPE_C[eg.t] || '#888'}">${TYPE_KO[eg.t] || ''}</i>${G.egGot ? `${G.egGot[1]} · 깨달았다!` : `??? ${G.egg0}% → ${G.egg}%`}</em></li>` : ''}
      <li class="ya-gold${bonus || G.sxG ? '' : ' one'}"><i class="coin" aria-hidden="true"></i><span class="k">골드</span><b ${N(G.gold, '+', 'G')}</b>${bonus || G.sxG ? `<em>${[G.sxG ? `${clear ? '완주' : `스테이지 ${G.wave}`} ×${G.sx} +${G.sxG.toLocaleString()}G` : '', bonus ? `${rk0} 등급 완주 보너스 +${bonus}G` : ''].filter(Boolean).join(' · ')} 포함</em>` : ''}</li>`;
    q('.ya-ov').hidden = false; r.hidden = false; r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop'); snd('DUN_Stat_Up', .07); buzz(1); if (G.egGot) setTimeout(() => { if (R && R.G === G) GB().learnFan?.(); }, 1400);   /* 기술을 배우는 순간엔 항상 팡파르 */
    // 줄이 하나씩 톡톡 나오면서 숫자가 올라간다
    [...q('.ya-rl').children].forEach((li, i) => { li.style.setProperty('--i', i); const bEl = li.querySelector('b[data-n]'), n = +bEl.dataset.n, t0 = 250 + i * 150;
      setTimeout(() => { if (!R || R.G !== G) return; buzz(0); if (li.classList.contains('ya-gold')) snd('DUN_Money', .05); const s = performance.now(), tick = () => { if (!bEl.isConnected) return; const p = Math.min(1, (performance.now() - s) / 380); bEl.textContent = bEl.dataset.pre + Math.round(n * (1 - Math.pow(1 - p, 3))) + bEl.dataset.suf; if (p < 1) requestAnimationFrame(tick); }; tick(); }, t0); });
  }, faint ? 1200 : clear || quit ? 300 : 900);
}

// ---------- 시작 창 ----------
/* 스테이지 길 한 칸: 대장 스테이지는 대장 수만큼 실루엣 칸 (9스테이지 = 둘) */
function roadB(S, i, c) { return S.boss ? S.boss.map(b => `<b class="m ${b === 2 ? 'f ' : ''}${c}" data-b="${b}">?</b>`).join('') : `<b class="${c}">${i + 1}</b>`; }
/* 노력치 훈련 ? : 훈련장 카드(manage.js evTrHint)와 같은 셈 — 추천 배분(evPlan) 순서대로 아직 목표에 못 미친 첫 능력치 */
function evHint() { const q = R.q, o = R.mons[R.pick], B = GB(), P = o.P, pl = B.evPlan?.(P.sp); if (!pl) return; const e = B.evArr?.(B.gm(P)) || [], k = pl.k.find((k, j) => (e[k] | 0) < pl.v[j]), w = q('.ya-evh'), nm = nmOf(P);
  q('.eh-t').textContent = `${nm}에게 좋은 훈련`; { const im = q('.eh-im'); im.removeAttribute('src'); GA.thumb?.(P).then(u => { if (R && typeof u === 'string') im.src = u; }).catch(() => {}); }
  q('.eh-m').innerHTML = k == null ? '추천 배분대로 노력치가 다 찼어요.<br>아무 훈련이나 골라도 좋아요.' : `지금은 <b>${STAT_KO[k]}</b> 노력치 훈련이 좋아요.${R.stat === k ? '<br>이미 이 훈련을 골랐어요!' : ''}`;
  q('.eh-pl').innerHTML = pl.k.map((s, j) => `<span class="${s === k ? 'nx' : (e[s] | 0) >= pl.v[j] ? 'dn' : ''}"><img alt="" src="${B.itImg(B.EV_PW[s])}"><small>${STAT_KO[s]}</small><em>${Math.min(e[s] | 0, pl.v[j])} / ${pl.v[j]}</em></span>`).join('');
  q('.eh-y').textContent = `${pl.nm}. ${pl.why}`; const go = q('.eh-go'), can = k != null && R.stat !== k; go.style.display = can ? '' : 'none'; go.textContent = can ? `${STAT_KO[k]} 훈련 고르기` : ''; go.dataset.k = can ? k : ''; w.classList.add('on'); }
function startUi() {
  { const gs = R.q('.fs-rwr .gbs'); if (gs) { const got = !giftDue(); gs.classList.toggle('got', got); gs.querySelector('b').textContent = got ? '내일 상자' : '상자'; } }
  const q = R.q, o = R.mons[R.pick], th = (P, f) => GA.thumb?.(P).then(u => { if (R && typeof u === 'string') f(u); }).catch(() => {});
  q('.hr-nm').textContent = nmOf(o.P); q('.hr-lv').textContent = `Lv.${GB().gm(o.P).lv}`; { const sx = q('.hr-sx'), g = o.P.sex === 'm' ? 'm' : o.P.sex === 'f' ? 'f' : ''; sx.className = 'hr-sx ' + g; sx.textContent = g === 'm' ? '♂' : g === 'f' ? '♀' : ''; q('.hr-ty').innerHTML = (SP[o.P.sp]?.t || []).map(t => (GA.tyIcon?.(t) || '').replace(/ data-tip="[^"]*"/, '')).join(''); } { const im = q('.hr-im'), k = R.pick; im.removeAttribute('src'); th(o.P, u => { if (R.pick === k) im.src = u; }); }
  q('.ya-pk').classList.toggle('many', R.mons.length > 3); q('.ya-pk').innerHTML = R.mons.length > 1 ? R.mons.map((m, i) => `<button class="pkc${i === R.pick ? ' on' : ''}" data-i="${i}"><img alt="" data-i="${i}"><u><span class="pn"><b${nmOf(m.P).length > 5 ? ' class="lg"' : ''}>${nmOf(m.P)}</b>${m.P.sex === 'm' ? '<i class="sx m">♂</i>' : m.P.sex === 'f' ? '<i class="sx f">♀</i>' : ''}</span><small>Lv.${GB().gm(m.P).lv}</small></u></button>`).join('') : ''; q('.ya-pk').classList.toggle('n3', R.mons.length === 3);
  q('.ya-pk').style.display = R.mons.length > 1 ? '' : 'none'; q('.ya-bd').style.paddingTop = R.mons.length > 1 ? '' : '0';
  if (R.mons.length > 1) R.mons.forEach((m, i) => th(m.P, u => { const im = R.q(`.ya-pk img[data-i="${i}"]`); if (im) im.src = u; }));
  /* 경완 2026-11-15 '시작창 노력치 정하는거 훈련장에서 훈련할 노력치 정할 때처럼 팔찌 아이콘들 넣어놔줘': 훈련장 .ev-tk 와 같은 파워 도구 그림(EV_PW) */
  q('.ya-stt').innerHTML = STAT_KO.map((s, i) => `<button class="stc${i === R.stat ? ' on' : ''}" data-s="${i}"><img alt="" src="${GB().itImg(GB().EV_PW[i])}"><span>${s}</span></button>`).join('');
  if (!R.pool) R.pool = foePool(R.stat); const pool = R.pool; [...pool.sm, ...pool.big].forEach(sp => spr(sp));
  // 스테이지 길: 숫자 칸, 중간 대장·대장 칸에는 그 포켓몬 얼굴
  q('.ya-road').innerHTML = STAGES.map((S, i) => `${i ? '<i></i>' : ''}${roadB(S, i, '')}`).join('');   // 대장 칸은 실루엣만 (경완 '대장은 실루엣으로 가려놓자')
  q('.ya-road').querySelectorAll('b.m').forEach(el => th({ sp: pool.big[+el.dataset.b] }, u => { if (R.pool === pool && el.isConnected) { el.textContent = ''; const im = new Image(); im.alt = ''; im.src = u; el.append(im); } }));
  q('.ya-pmv').innerHTML = moveList(o.P).map(v => `<span style="--tc:${TYPE_C[v.t] || '#888'}"><em>${mvForm(v)}</em><b>${v.name}</b></span>`).join('');
}

window.GymYA = { start, close, get _R() { return R; }, _gift: (s, b, P) => GIFT(s, b, P), _S: () => GA.S, _use: i => useMove(i), _dodge: () => dodge(), _hold: (i, on) => { if (!R) return; if (on) { useMove(i, true); R.HELD[i] = 1; } else delete R.HELD[i]; }, _end: c => R?.G && end(c) };
})();
