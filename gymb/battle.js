/* 체육관 배틀 (경완 2026-10-27: 4세대 DP·Pt 배틀 화면, 본가와 같은 턴제 배틀)
   - 규칙 계산은 포켓몬 쇼다운 엔진(gym/psim.js, MIT, pkmn/ps 를 묶은 것)이 하고, 이 파일은 화면·연출·AI·레벨을 맡는다
   - 화면 그림은 pret/pokeplatinum 에서 tools/gym/mkbattle.py 로 뽑은 플래티넘 원본(gym/img/bt), 포켓몬은 smogon/sprites 4·5세대(gym/img/pk)
   - 위 화면 256x192 + 아래(터치) 화면 256x192 를 DS 처럼 위아래로 놓고 화면 폭에 맞춰 키운다
   gym.js 가 이 파일을 불러 window.GymBattle 을 쓴다. 저장은 S.gym.mon(개체별 레벨·성격·특성·기술), S.gym.lu(라인업) */
(() => {
'use strict';
const GA = window.GA, { sfx, esc } = GA;
const SPECIES = GA.SPECIES, TYPE_KO = GA.TYPE_KO, S = GA.S;
const IMG = 'gym/img/';
const trSrc = k => window.Gym?.k?.trSrc?.(k) || `${IMG}tr/${k}.png`;
/* v21.89 DBK Animated Trainer Intros: 이름 있는 관장·사천왕·챔피언은 움직이는 등장 그림 (가로 띠, 한 칸=h×h, 1.5초에 한 번 재생) */
const TR_ANI = {"champion_cynthia":[22,79,"CHAMPION_Cynthia"],"champion_steven":[11,76,"CHAMPION_Steven"],"champion_wallace":[13,75,"LEADER_Wallace"],"elite_four_aaron":[11,88,"ELITEFOUR_Aaron"],"elite_four_bertha":[3,80,"ELITEFOUR_Bertha"],"elite_four_bruno":[19,80,"ELITEFOUR_Bruno"],"elite_four_flint":[11,80,"ELITEFOUR_Flint"],"elite_four_lance":[9,78,"ELITEFOUR_Lance"],"elite_four_lucian":[6,80,"ELITEFOUR_Lucian"],"hg_blaine":[7,82,"LEADER_Blaine"],"hg_brock":[7,59,"LEADER_Brock"],"hg_bruno2":[19,80,"ELITEFOUR_Bruno"],"hg_erika":[10,72,"LEADER_Erika"],"hg_koga2":[9,86,"LEADER_Koga"],"hg_lance":[9,78,"ELITEFOUR_Lance"],"hg_misty":[11,84,"LEADER_Misty"],"hg_sabrina":[20,84,"LEADER_Sabrina"],"hg_surge":[15,81,"LEADER_Surge"],"leader_blaine":[7,82,"LEADER_Blaine"],"leader_brawly":[11,77,"LEADER_Brawly"],"leader_brock":[7,59,"LEADER_Brock"],"leader_byron":[14,81,"LEADER_Byron"],"leader_candice":[8,90,"LEADER_Candice"],"leader_erika":[10,72,"LEADER_Erika"],"leader_fantina":[17,89,"LEADER_Fantina"],"leader_flannery":[14,87,"LEADER_Flannery"],"leader_gardenia":[14,75,"LEADER_Gardenia"],"leader_giovanni":[5,80,"LEADER_Giovanni"],"leader_juan":[14,75,"LEADER_Juan"],"leader_koga":[9,86,"LEADER_Koga"],"leader_lt_surge":[15,81,"LEADER_Surge"],"leader_maylene":[14,75,"LEADER_Maylene"],"leader_misty":[11,84,"LEADER_Misty"],"leader_norman":[8,74,"LEADER_Norman"],"leader_roark":[12,76,"LEADER_Roark"],"leader_roxanne":[11,68,"LEADER_Roxanne"],"leader_sabrina":[20,84,"LEADER_Sabrina"],"leader_volkner":[8,78,"LEADER_Volkner"],"leader_wake":[16,79,"LEADER_Wake"],"leader_wallace":[13,75,"LEADER_Wallace"],"leader_wattson":[17,73,"LEADER_Wattson"],"leader_winona":[17,78,"LEADER_Winona"],"red":[7,69,"POKEMONTRAINER_Red"]};   /* 필드 그림(걷기)이 있는 43명만 (경완 2026-11-12) */
function trAni(el, k) { const a = TR_ANI[k]; if (!a) return null; const [n, h, f] = a; Object.assign(el.style, { backgroundImage: `url(${IMG}dbk/tr/${f}.png)`, width: h + 'px', height: h + 'px', backgroundSize: `${n * h}px ${h}px`, backgroundPosition: '0 0', marginLeft: (80 - h) / 2 + 'px', marginTop: (80 - h) + 'px' }); return a; }
async function trPlay(el, a) { if (!a) return; const [n, h] = a, d = 1500 / n; for (let i = 1; i < n; i++) { await wait(d); if (!B) return; el.style.backgroundPosition = `${-i * h}px 0`; } }
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
const wait = ms => new Promise(r => setTimeout(r, ms));
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = L => L[Math.floor(Math.random() * L.length)];

// ---------- 한국어 조사 ----------
const jong = w => { const c = String(w || '').trim().slice(-1); const k = c.charCodeAt(0); if (k >= 0xac00 && k <= 0xd7a3) return (k - 0xac00) % 28; if (/[013678]/.test(c)) return 1; if (/[a-zA-Z]/.test(c)) return /[lmnr]/i.test(c) ? 1 : 0; return 0; };
const J = (w, a, b) => w + (jong(w) ? a : b);
const eun = w => J(w, '은', '는'), iga = w => J(w, '이', '가'), eul = w => J(w, '을', '를'), wa = w => J(w, '과', '와');

// ---------- 데이터 (기술·특성·성격·배울 기술: gym/data.json, tools/gym/mkdata.js) ----------
let FA = {};   /* v16.93 경완: 650~1025 앞모습 PixelLab 움직이는 그림 (gym/img/pk/fa, 칸 수 또는 [칸 수, 칸 크기]) */
let D = null, EGG = {}, AB_D = {}, MVI = null, FEM = new Set(), ANIM = {}, FMA = {}, MFX = {}, dataP = null, RFA = {};   /* RFA: 지역 폼 쇼다운 id → 배틀 그림 (gym/img/pk/rf, v15.93) */
const getJ = u => fetch(`${u}?v=${VER}`).then(r => r.ok ? r.json() : null).catch(() => null);
function loadData() {
  return dataP || (dataP = Promise.all([
    fetch(`gym/data.json?v=${VER}`).then(r => { if (!r.ok) throw new Error('data'); return r.json(); }),
    getJ(`${IMG}pk/fem.json`), getJ(`${IMG}pk/anim.json`), getJ('gymb/mvfx.json'), getJ('gym/desc.json'), getJ(`${IMG}pk/fm/fm.json`), getJ(`${IMG}pk/rf/rf.json`), getJ(`${IMG}pk/fa/fa.json`), getJ('gym/egg.json'), getJ(`${IMG}pk/bwa.json`), getJ(`${IMG}pk/off.json`), getJ(`${IMG}pk/gm/gm.json?`)
    , evyLoad()
  ]).then(([d, fem, an, fx, ds, fm, rf, fa, eg, bw, off, gmj]) => { BWA = bw || {}; GMJ = gmj && !gmj.then ? gmj : {}; SOFF = off || {}; EGG = eg || {}; FA = fa || {}; FMA = fm || {}; RFA = rf || {}; for (const [k, v] of Object.entries(RFA)) FMA[k] = [v[2], v[3], 0, v[4] ? [[1, 15, 0, 0]] : [], 0, []]; D = d; AB_D = ds?.ab || {}; MVI = new Map(d.mv.map((m, i) => [m[0], i])); FEM = new Set(fem || []); ANIM = an || {}; MFX = fx || {}; mfxAdd(); }).catch(e => { dataP = null; throw e; }));
}
let simP = null;
const loadSim = () => window.PSim ? Promise.resolve() : simP || (simP = new Promise((ok, no) => { const s = document.createElement('script'); s.src = `gym/psim.js?v=${VER}`; s.onload = () => window.PSim ? ok() : no(new Error('sim')); s.onerror = () => { simP = null; no(new Error('sim')); }; document.head.appendChild(s); }));
let splP = null;   // 기술 파티클 엔진 (gymb/spl.js)
const loadSpl = () => window.GymSPL ? Promise.resolve() : splP || (splP = new Promise(ok => { const s = document.createElement('script'); s.src = `gymb/spl.js?v=${VER}`; s.onload = ok; s.onerror = () => { splP = null; ok(); }; document.head.appendChild(s); }));
const mvOf = id => D.mv[MVI.get(id)];   // [id, 이름, 타입, 분류(0 물리 1 특수 2 변화), 위력, 명중, PP, 우선도, 설명]
// v21.89 배틀 기믹 ([DBK] Z-Power·Dynamax): Z기술·다이맥스 기술 한국어 이름
const GMV_KO = { breakneckblitz: '울트라대시어택', alloutpummeling: '전력무쌍격렬권', supersonicskystrike: '파이널다이브클래시', aciddownpour: '애시드포이즌딜리트', tectonicrage: '라이징랜드오버', continentalcrush: '월즈엔드폴', savagespinout: '절대포식회전참', neverendingnightmare: '무한암야로의유인', corkscrewcrash: '초월나선연격', infernooverdrive: '다이내믹풀플레임', hydrovortex: '슈퍼아쿠아토네이도', bloomdoom: '블룸샤인엑스트라', gigavolthavoc: '스파킹기가볼트', shatteredpsyche: '맥시멈사이브레이커', subzeroslammer: '레이징지오프리즈', devastatingdrake: '얼티메이트드래곤번', blackholeeclipse: '블랙홀이클립스', twinkletackle: '러블리스타임팩트',
  catastropika: '필살피카슛', '10000000voltthunderbolt': '1000만볼트', stokedsparksurfer: '라이트닝서프라이드', extremeevoboost: '나인이볼부스트', pulverizingpancake: '진심의진심펀치', genesissupernova: '오리진즈슈퍼노바', sinisterarrowraid: '섀도애로우즈스트라이크', maliciousmoonsault: '하이퍼다크크러셔', oceanicoperetta: '바다의심포니', guardianofalola: '가디언데로우라', soulstealing7starstrike: '칠성탈혼퇴', splinteredstormshards: '래디컬엔드', letssnuggleforever: '꼬옥꼬옥놀자', clangoroussoulblaze: '브레이징소울비트', searingsunrazesmash: '선샤인스매셔', menacingmoonrazemaelstrom: '문라이트블래스터', lightthatburnsthesky: '하늘을태우는멸망의빛',
  maxstrike: '다이어택', maxknuckle: '다이너클', maxairstream: '다이제트', maxooze: '다이애시드', maxquake: '다이어스', maxrockfall: '다이록', maxflutterby: '다이웜', maxphantasm: '다이할로우', maxsteelspike: '다이스틸', maxflare: '다이번', maxgeyser: '다이스트림', maxovergrowth: '다이그래스', maxlightning: '다이썬더', maxmindstorm: '다이사이코', maxhailstorm: '다이아이스', maxwyrmwind: '다이드라군', maxdarkness: '다이아크', maxstarfall: '다이페어리', maxguard: '다이월',
  gmaxvinelash: '거다이편타', gmaxwildfire: '거다이전화', gmaxcannonade: '거다이포격', gmaxbefuddle: '거다이분진', gmaxvoltcrash: '거다이만뢰', gmaxgoldrush: '거다이금화', gmaxchistrike: '거다이회심격', gmaxterror: '거다이환영', gmaxresonance: '거다이선율', gmaxcuddle: '거다이포옹', gmaxreplenish: '거다이재생', gmaxmalodor: '거다이악취', gmaxmeltdown: '거다이융해', gmaxdrumsolo: '거다이난타', gmaxfireball: '거다이화염구', gmaxhydrosnipe: '거다이저격', gmaxoneblow: '거다이일격', gmaxrapidflow: '거다이연격', gmaxwindrage: '거다이폭풍', gmaxgravitas: '거다이천도', gmaxstonesurge: '거다이암진', gmaxvolcalith: '거다이분석', gmaxtartness: '거다이산격', gmaxsweetness: '거다이감로', gmaxsandblast: '거다이사진', gmaxstunshock: '거다이감전', gmaxcentiferno: '거다이백화', gmaxsmite: '거다이천벌', gmaxsnooze: '거다이수마', gmaxfinale: '거다이단원', gmaxsteelsurge: '거다이강철진', gmaxdepletion: '거다이감쇠', gmaxfoamburst: '거다이거품' };
let GMJ = {};   // gym/img/pk/gm/gm.json {쇼다운 폼 id: [번호, 이름, 비트 32 앞 1 뒤 2 이로치 4 뒤 이로치]} 메가·거다이맥스 움직이는 그림
const mvKo = id => mvOf(id)?.[1] || GMV_KO[id] || (/^z/.test(id) && mvOf(id.slice(1)) ? 'Z' + mvOf(id.slice(1))[1] : id);
const NATS = () => Object.keys(D.nt);
const natKo = n => D.nt[n]?.[0] || n;
const AB_KO2 = { aerilate: '스카이스킨', asoneglastrier: '혼연일체', asonespectrier: '혼연일체', deltastream: '델타스트림', desolateland: '끝의대지', primordialsea: '시작의바다', embodyaspectcornerstone: '면영활성', embodyaspecthearthflame: '면영활성', embodyaspectteal: '면영활성', embodyaspectwellspring: '면영활성', mindseye: '심안', neuroforce: '브레인포스', parentalbond: '부자유친', teraformzero: '제로포밍', terashell: '테라셸' };   /* v21.30: 데이터에 없던 특성 한국어 이름 */
const abKo = a => D.ab[a] || AB_KO2[a] || a;
const STAT_KO = { hp: 'HP', atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드', accuracy: '명중률', evasion: '회피율' };

// ---------- 레벨 ----------
// 기본 레벨은 개체 랭크로 (경완 기획: 개체값 랭크별 기본 레벨). 최대 100
const BASE_LV = { S: 30, A: 25, B: 20, C: 16, D: 12, E: 8, F: 5 };
const LV_MAX = 100;
// 성장 속도별 레벨 n 까지 필요한 경험치 (본가 공식, PokeAPI growth_rate id: 1 느림 2 보통 3 빠름 4 약간 느림 5 불규칙 6 변동)
function xpAt(g, n) {
  if (n <= 1) return 0; const c = n ** 3;
  switch (g) {
    case 1: return Math.floor(5 * c / 4);
    case 3: return Math.floor(4 * c / 5);
    case 4: return Math.max(0, Math.floor(6 / 5 * c - 15 * n * n + 100 * n - 140));
    case 5: return n <= 50 ? Math.floor(c * (100 - n) / 50) : n <= 68 ? Math.floor(c * (150 - n) / 100) : n <= 98 ? Math.floor(c * Math.floor((1911 - 10 * n) / 3) / 500) : Math.floor(c * (160 - n) / 100);
    case 6: return n <= 15 ? Math.floor(c * (Math.floor((n + 1) / 3) + 24) / 50) : n <= 36 ? Math.floor(c * (n + 14) / 50) : Math.floor(c * (Math.floor(n / 2) + 32) / 50);
    default: return c;
  }
}
const growth = sp => D.sp[sp]?.g || 2;
// 개체마다 정해지는 난수 (같은 개체는 늘 같은 성격·특성·기술)
const abNorm = sp => { const o = D.sp[sp]; if (!o) return ['noability']; const L = (o.ab || []).filter(a => a !== o.h); return L.length ? L : o.ab || ['noability']; };
const HA_RATE = .05;   // 숨겨진 특성 5% (경완 2026-10-31: 종의 숨특 칸 때문에 많아 보였던 것 → 다시 5%)
const hiddenRoll = k => seeded(k)() < HA_RATE;
const seeded = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; }; };
// 레벨 lv 까지 레벨업으로 배우는 기술 (진화 기술 0 포함, 최근 것 우선)
function lvMoves(sp, lv) { const L = D.sp[sp]?.lv || [], out = []; for (let i = 0; i < L.length; i += 2) if (L[i] <= lv) out.push([L[i], L[i + 1]]); return out; }
// 개체별 기술 4개: 본가 야생처럼 최근에 배운 기술 위주지만 개체마다 조금씩 다르게. 공격 기술이 최소 2개(있으면)
function pickMoves(sp, lv, r) {
  const L = lvMoves(sp, lv).map(([l, i]) => i).filter((v, k, a) => a.lastIndexOf(v) === k); if (!L.length) return ['tackle'];
  const w = L.map((_, k) => 1 + (k / L.length) * 4), take = [];
  while (take.length < Math.min(4, L.length)) { let t = r() * w.reduce((a, b) => a + b, 0), k = 0; while (t > w[k]) t -= w[k++]; if (!take.includes(L[k])) take.push(L[k]); w[k] = 0; if (w.every(x => !x)) break; }
  const atk = i => D.mv[i][3] !== 2;
  const pool = L.filter(i => atk(i) && !take.includes(i)).reverse();
  while (take.filter(atk).length < 2 && pool.length) { const k = take.findIndex(i => !atk(i)); if (k < 0) break; take[k] = pool.shift(); }
  if (!take.some(atk)) take[0] = MVI.get('tackle');
  return take.map(i => D.mv[i][0]);
}
// 실전 기술 배치 (경완 2026-10-29 '난이도가 레벨뿐 아니라 실전 기술 배치·운용까지'): tier 1 = 레벨업 기술 중 자속·견제·변화기 하나, tier 2 = 기술머신·알 기술까지 넣고 능력치 올리기·선공기도
const MV_BAD = new Set('hyperbeam gigaimpact blastburn hydrocannon frenzyplant rockwrecker roaroftime selfdestruct explosion memento finalgambit healingwish lunardance focuspunch dreameater lastresort synchronoise futuresight doomdesire skullbash skyattack razorwind solarbeam solarblade meteorbeam belch steelbeam mindblown naturalgift fling snore spitup present magnitude return frustration trumpcard spitup beatup counter mirrorcoat metalburst bide endeavor painsplit perishsong destinybond grudge'.split(' '));
const MV_FIX = { seismictoss: 70, nightshade: 70, superfang: 60, dragonrage: 40, sonicboom: 20 };
const MV_SETUP = { swordsdance: 0, dragondance: 0, bulkup: 0, howl: 0, honeclaws: 0, shiftgear: 0, coil: 0, nastyplot: 1, calmmind: 1, quiverdance: 1, tailglow: 1, geomancy: 1, workup: -1, growth: 1 };
const MV_STAT = { thunderwave: 3, willowisp: 3, toxic: 3, spore: 5, sleeppowder: 4, hypnosis: 2, yawn: 2, glare: 3, stunspore: 2, stealthrock: 2, leechseed: 2, recover: 3, roost: 3, softboiled: 3, slackoff: 3, synthesis: 2, moonlight: 2, morningsun: 2, milkdrink: 3, shoreup: 3, substitute: 1, reflect: 1, lightscreen: 1, taunt: 1, encore: 1, trickroom: 0 };
const MV_2T = new Set('dig fly bounce dive phantomforce shadowforce skydrop solarbeam'.split(' '));   // 두 턴 기술
const MV_PRIO = new Set('extremespeed aquajet machpunch bulletpunch iceshard shadowsneak suckerpunch quickattack vacuumwave accelerock jetpunch firstimpression'.split(' '));
function smartMoves(sp, lv, tier, r) {
  const o = D.sp[sp]; if (!o) return pickMoves(sp, lv, r);
  const bs = SPECIES[sp]?.bs || [60, 60, 60, 60, 60, 60], phys = bs[1] >= bs[3], tys = SPECIES[sp]?.t || [];
  let ids = lvMoves(sp, lv).map(([l, i]) => i); if (tier >= 2) ids = ids.concat(o.tm || [], o.ex || []);
  ids = [...new Set(ids)].filter(i => D.mv[i] && !MV_BAD.has(D.mv[i][0]));
  const pw = i => { const m = D.mv[i]; if (m[3] === 2) return 0; const fx = MV_FIX[m[0]], bp = fx || m[4] || 0; if (!bp) return 0; return bp * ((m[5] || 100) / 100) ** 1.5 * (!fx && tys.includes(m[2]) ? 1.5 : 1) * (fx || (m[3] === 0) === phys ? 1 : .55) * (m[7] > 0 ? .8 : 1) * (MV_2T.has(m[0]) ? .7 : 1) * (.9 + r() * .2); };
  const atk = ids.filter(i => pw(i) > 0).map(i => [i, pw(i)]).sort((a, b) => b[1] - a[1]), take = [], tyIn = new Set();
  const add = i => { if (i != null && !take.includes(i) && take.length < 4) { take.push(i); tyIn.add(D.mv[i][2]); } };
  for (const t of tys) add(atk.find(([i]) => D.mv[i][2] === t)?.[0]);   // 자속 하나씩
  const nAtk = tier >= 2 ? 3 : 3;
  for (const [i] of atk) { if (take.length >= nAtk) break; if (!tyIn.has(D.mv[i][2])) add(i); }   // 다른 타입 견제기
  if (tier >= 2) { const pr = atk.find(([i]) => MV_PRIO.has(D.mv[i][0]) && (D.mv[i][3] === 0) === phys); if (pr && r() < .6 && take.length < 4) add(pr[0]); }
  const st = ids.filter(i => D.mv[i][3] === 2).map(i => { const k = D.mv[i][0]; let v = MV_STAT[k] ?? -1; if (k in MV_SETUP) v = MV_SETUP[k] < 0 ? 2 : (MV_SETUP[k] === 1) === !phys ? 4 + tier : -1; return [i, v + r()]; }).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  if (st.length && take.length < 4) add(st[0][0]);
  if (tier >= 2 && st.length > 1 && take.length < 4 && r() < .5) add(st[1][0]);
  for (const [i] of atk) add(i);   // 남은 칸은 센 기술로
  if (!take.length) return pickMoves(sp, lv, r);
  return take.map(i => D.mv[i][0]);
}
// v17.57 경완 '추천 기술': 지금 기술 + 배울 수 있는 기술(레벨업·익힌 기술) 중에서, 이 개체의 실제 능력치(레벨·개체값·성격)로
// 물리/특수를 정하고 자속 → 다른 타입 견제 → (느리면) 선공기 → 능력치 올리기·상태 이상·회복 하나 → 남은 칸은 센 기술. 상대 AI(smartMoves)와 같은 실전 기준
// ---------- 추천 기술 (v17.59 경완 '기술 간 조합·특성도 다 넣어줘') ----------
// 기술 4개 묶음 점수 setScore: 18타입 상대마다 (가장 잘 듣는 공격 기술 값 × 상성) 평균 = 공격 범위 + 변화기·조합 보너스.
// 공격 값 = 위력 × 명중^1.5 × 자속(적응력 2) × 쓰는 능력치 비율(실제 능력치, 천하장사·순수한힘 ×2) × 특성(테크니션·철주먹·옹골찬턱·단단한발톱·메가런처·예리함·이판사판·우격다짐·스킬링크)
// 조합: 쾌청/비바라기(가뭄·잔비 특성) → 불꽃·물 1.5배·솔라빔 한 턴·번개·폭풍 필중·웨더볼 / 잠자기+잠꼬대 / 수면기+꿈먹기 / 상태이상기+병상첨병·베놈쇼크 / 근성+객기 / 능력치 올리기+바톤터치 / 느리면 선공기
let EFF = null;
const effM = () => EFF ||= TY_EN.map(a => TY_EN.map(d => !a || !d ? 1 : !PSim.Dex.getImmunity(a, [d]) ? 0 : 2 ** PSim.Dex.getEffectiveness(a, [d])));
const SLP_MV = new Set('spore sleeppowder hypnosis yawn lovelykiss sing grasswhistle darkvoid'.split(' ')), STS_MV = new Set('thunderwave willowisp toxic spore sleeppowder hypnosis glare stunspore poisonpowder nuzzle yawn'.split(' '));
const HEAL_MV = new Set('recover roost softboiled slackoff synthesis moonlight morningsun milkdrink shoreup wish strengthsap'.split(' '));
function mvCtx(P, m = gm(P)) {
  const st = statsOf(P.sp, m.lv || 1, P.iv || [], m.nat, m.ev), ab = toID(m.ab), bs = SPECIES[P.sp]?.bs || [60, 60, 60, 60, 60, 60];
  const atk = st[1] * (ab === 'hugepower' || ab === 'purepower' ? 2 : ab === 'hustle' ? 1.5 : 1), spa = st[3];
  return { P, m, st, ab, tys: SPECIES[P.sp]?.t || [], atk, spa, A: Math.max(atk, spa), phys: atk >= spa, slow: st[5] < Math.max(st[1], st[3]) * .75, bulky: bs[0] + bs[2] + bs[4] >= 250, dx: PSim.Dex };
}
function mvVal(i, c, has) {
  const x = D.mv[i]; if (!x || x[3] === 2) return [0, 0]; const id = x[0], mv = c.dx.moves.get(id), fx = MV_FIX[id];
  let bp = fx || x[4] || 0, ty = x[2], acc = x[5] === true || !x[5] ? 100 : x[5], k = 1;
  const sun = has('sunnyday') || c.ab === 'drought', rain = has('raindance') || c.ab === 'drizzle', hail = has('hail') || has('snowscape') || c.ab === 'snowwarning', sand = has('sandstorm') || c.ab === 'sandstream';
  if (id === 'weatherball' && (sun || rain || hail || sand)) { bp = 100; ty = TY_EN.indexOf(sun ? 'Fire' : rain ? 'Water' : hail ? 'Ice' : 'Rock'); }
  if (id === 'facade' && (c.ab === 'guts' || c.ab === 'quickfeet')) bp = 140;
  if (id === 'hex' && [...STS_MV].some(has)) bp = 130;
  if (id === 'venoshock' && (has('toxic') || has('poisonpowder') || has('toxicspikes'))) bp = 130;
  if (!bp) return [0, ty];
  if (mv?.multihit) bp *= Array.isArray(mv.multihit) ? (c.ab === 'skilllink' ? mv.multihit[1] : 3) : mv.multihit;
  if (c.ab === 'technician' && (x[4] || 0) <= 60) k *= 1.5;
  const fl = mv?.flags || {};
  if (c.ab === 'ironfist' && fl.punch) k *= 1.2; if (c.ab === 'strongjaw' && fl.bite) k *= 1.5; if (c.ab === 'toughclaws' && fl.contact) k *= 1.3; if (c.ab === 'megalauncher' && fl.pulse) k *= 1.5; if (c.ab === 'sharpness' && fl.slicing) k *= 1.5;
  if (c.ab === 'reckless' && (mv?.recoil || mv?.hasCrashDamage)) k *= 1.2; if (c.ab === 'sheerforce' && (mv?.secondaries || mv?.secondary)) k *= 1.3;
  if (c.ab === 'hustle' && x[3] === 0) acc *= .8;
  if (sun) { if (ty === TY_EN.indexOf('Fire')) k *= 1.5; if (ty === TY_EN.indexOf('Water')) k *= .5; }
  if (rain) { if (ty === TY_EN.indexOf('Water')) k *= 1.5; if (ty === TY_EN.indexOf('Fire')) k *= .5; if (id === 'thunder' || id === 'hurricane') acc = 100; }
  if (hail && id === 'blizzard') acc = 100;
  const stab = c.tys.includes(ty) || c.ab === 'protean' || c.ab === 'libero' ? (c.ab === 'adaptability' ? 2 : 1.5) : 1;
  let bad = MV_BAD.has(id) ? .45 : 1;
  if ((id === 'solarbeam' || id === 'solarblade') && sun) bad = 1;
  if (id === 'dreameater' && [...SLP_MV].some(has)) bad = 1;
  const two = MV_2T.has(id) && !((id === 'solarbeam' || id === 'solarblade') && sun) ? .7 : 1;
  const v = bp * (acc / 100) ** 1.5 * (fx ? 1 : stab) * (fx ? 1 : (x[3] === 0 ? c.atk : c.spa) / c.A) * k * (x[7] > 0 ? .8 : 1) * two * bad;
  return [v, ty];
}
function setScore(ids, c) {
  const S2 = new Set(ids), has = id => S2.has(id), E = effM();
  const A = ids.map(id => { const i = MVI.get(id); return i == null ? null : [id, ...mvVal(i, c, has)]; }).filter(a => a && a[1] > 0);
  let off = 0; for (let d = 1; d < TY_EN.length; d++) off += Math.max(0, ...A.map(a => a[1] * E[a[2]][d])); off /= (TY_EN.length - 1) * (c.top || 100);
  let b = 0, setup = 0, heal = 0, sts = 0;
  for (const id of ids) { const x = mvOf(id); if (!x || x[3] !== 2) continue;
    if (id in MV_SETUP) { const ok = MV_SETUP[id] < 0 || (MV_SETUP[id] === 1) === !c.phys; if (ok && !setup++) b += A.length >= 2 ? .32 : .1; continue; }
    if (HEAL_MV.has(id)) { if (!heal++) b += c.bulky ? .24 : .12; continue; }
    if (id === 'rest') { b += has('sleeptalk') ? .3 : .06; heal++; continue; } if (id === 'sleeptalk') { b += has('rest') ? .05 : -.05; continue; }
    if (id === 'batonpass') { b += setup || ids.some(y => y in MV_SETUP) ? .18 : 0; continue; }
    if (STS_MV.has(id)) { if (!sts++) b += (MV_STAT[id] || 2) * .05 + (has('hex') || (has('dreameater') && SLP_MV.has(id)) || (has('venoshock') && id === 'toxic') ? .12 : 0); continue; }
    if (id === 'sunnyday' || id === 'raindance' || id === 'sandstorm' || id === 'hail' || id === 'snowscape') { b -= .04; continue; }
    if (id === 'protect' || id === 'detect' || id === 'substitute') { b += .05; continue; }
    b += (MV_STAT[id] ?? 0) > 0 ? .06 : MV_BAD.has(id) || /^(splash|celebrate|holdhands|happyhour)$/.test(id) ? -.1 : .01; }
  if (c.slow && A.some(a => MV_PRIO.has(a[0]) || (mvOf(a[0])?.[7] || 0) > 0)) b += .06;
  if (A.length < 2) b -= .35; if (!A.length) b -= .5;
  return off + b;
}
function recCtx(P, m) { const c = mvCtx(P, m), pool = [...new Set([...m.mv, ...mvCands(P, m)])].filter(id => MVI.has(id));
  c.top = Math.max(60, ...pool.map(id => mvVal(MVI.get(id), c, () => false)[0])); return [c, pool]; }
// 가장 좋은 4개: 하나씩 더해 가며 점수 가장 많이 오르는 것 → 한 칸씩 바꿔 보며 더 나아지면 바꿈
function bestSet(pool, c, n = 4) {
  let cur = []; while (cur.length < Math.min(n, pool.length)) { let bi = null, bv = -1e9; for (const id of pool) { if (cur.includes(id)) continue; const v = setScore([...cur, id], c); if (v > bv) { bv = v; bi = id; } } cur.push(bi); }
  for (let pass = 0; pass < 3; pass++) { let ch = false; for (let k = 0; k < cur.length; k++) { const base = setScore(cur, c); for (const id of pool) { if (cur.includes(id)) continue; const t = cur.slice(); t[k] = id; if (setScore(t, c) > base + 1e-6) { cur = t; ch = true; break; } } } if (!ch) break; }
  return cur;
}
async function recMovesA(P, m = gm(P)) { await loadSim(); return recMoves(P, m); }
function recMoves(P, m = gm(P)) {
  if (!window.PSim) return m.mv.slice();
  const [c, pool] = recCtx(P, m); if (pool.length <= 4) return m.mv.slice();
  const ids = bestSet(pool, c); if (setScore(ids, c) <= setScore(m.mv, c) + 1e-6) return m.mv.slice();
  const keep = m.mv.filter(id => ids.includes(id)), out = m.mv.map(id => ids.includes(id) ? id : null), nw = ids.filter(id => !keep.includes(id));   // 이미 아는 기술은 그 자리 그대로
  for (let i = 0; i < out.length && nw.length; i++) if (out[i] == null) out[i] = nw.shift();
  return [...out.filter(Boolean), ...nw].slice(0, 4);
}
// 한 칸만 바꿀 때: 나머지 기술과 가장 잘 맞는 배울 기술 (지금 기술보다 나을 때만)
function recSlot(P, k, C, m = gm(P)) { if (!window.PSim) return null; const [c] = recCtx(P, m), others = m.mv.filter((_, i) => i !== k), base = m.mv[k] ? setScore(m.mv, c) : setScore(others, c);
  let bi = null, bv = base + .005; for (const id of C) { const v = setScore([...others, id], c); if (v > bv) { bv = v; bi = id; } } return bi; }
// 체육관 개체 정보: 처음 볼 때 만든다
let gmTmp = null;   // v14.18: 체육관을 열기 전(타입 고르기)에 상세 카드를 볼 때 쓰는 임시 칸 (저장 안 함, 시드라 나중에 같은 값)
function gm(P) {
  const g = S.gym || (gmTmp ||= {}); g.mon = g.mon || {};
  let m = g.mon[P.id];
  if (!m || !D.sp[P.sp]) {
    const r = seeded('gm' + P.id), lv = BASE_LV[GA.rankOf(P)] || 5, ab = D.sp[P.sp]?.ab || ['noability'], nats = NATS();
    const nm = abNorm(P.sp), ha = hiddenRoll('ha' + P.id) && D.sp[P.sp]?.h;
    m = g.mon[P.id] = { lv, xp: xpAt(growth(P.sp), lv), nat: nats[Math.floor(r() * nats.length)], ab: nm[Math.floor(r() * Math.min(2, nm.length))], mv: pickMoves(P.sp, lv, r), evM: 1 };   /* evM: 노력치 옛 포켓몬 채우기 대상 아님 (새로 만든 포켓몬) */
    if (ha) { m.ab = ha; m.ha = 1; } else if (P.sp === 744 && seeded('ot' + P.id)() < .05) m.ab = 'owntempo';   // v16.85: 암멍이 5% 마이페이스 (본게임 natAb 와 같은 씨앗)
  }
  // 특성 (경완 2026-10-27 '특성, 숨겨진 특성'): 보통 특성은 숨겨진 특성을 뺀 것 중에서, 숨겨진 특성은 5% (ha). 진화하면 같은 자리 특성으로
  const h = D.sp[P.sp]?.h, nm = abNorm(P.sp);
  if (!m.haK5) { if (!m.ha && hiddenRoll('ha' + P.id)) m.ha = 1; m.haK5 = 1; }   // v12.10: 2% 때 빠진 숨겨진 특성을 5% 기준으로 되돌림 (같은 씨앗이라 그때 가졌던 개체만)
  if (m.ha) { if (h && m.ab !== h) m.ab = h; else if (!h) { m.ha = 0; m.ab = nm[0] || m.ab; } }
  else if (!nm.includes(m.ab)) m.ab = nm[0] || m.ab;
  // v14.41 경완: 진화했는데 본가 진화 레벨보다 낮으면 그 레벨로 올린다 (그 사이 레벨에서 배우는 기술도). 이미 넘었으면 그대로
  const ev = EVO_LV[P.sp];
  if (ev && m.lv < ev) { const L = D.sp[P.sp]?.lv || []; for (let l = m.lv + 1; l <= ev; l++) for (let i = 0; i < L.length; i += 2) if (L[i] === l) teach(m, D.mv[L[i + 1]][0], null, true); m.lv = ev; m.xp = Math.max(m.xp, xpAt(growth(P.sp), ev)); }
  // v21.67 경완 '진화 전에만 배우는 기술도 진화하면 익힌 기술 목록에': 종이 바뀌면(처음 볼 때 포함) 진화 전 종들이 지금 레벨까지 레벨업으로 배우는 기술을 '아는 기술'(kn)에 넣는다
  if (m.sp !== P.sp && D.sp[P.sp]) { const seen = new Set([P.sp]); m.kn = m.kn || [];
    for (let s = SPECIES[P.sp]?.fr; s != null && !seen.has(s); s = SPECIES[s]?.fr) { seen.add(s); lvMoves(s, m.lv).forEach(([, i]) => { const id = D.mv[i]?.[0]; if (id && !m.mv.includes(id) && !m.kn.includes(id)) m.kn.push(id); }); }
    m.sp = P.sp; }
  return m;
}
// 본가 진화 레벨 (쇼다운 pokedex evoLevel, 기본 폼만): 도감 번호 → 레벨
const EVO_LV = {2:16,3:32,5:16,6:36,8:16,9:36,11:7,12:10,14:7,15:10,17:18,18:36,20:20,22:20,24:22,28:22,30:16,33:16,42:22,44:21,47:24,49:31,51:26,53:28,55:33,57:28,61:25,64:16,67:28,70:21,73:30,75:25,78:40,80:37,82:30,85:31,87:34,89:38,93:25,97:26,99:28,101:30,105:28,106:20,107:20,110:35,112:42,117:32,119:33,124:30,125:30,126:30,130:20,139:40,141:40,148:30,149:55,153:16,154:32,156:14,157:36,159:18,160:30,162:15,164:20,166:18,168:22,171:27,178:25,180:15,181:30,184:18,188:18,189:27,195:20,202:15,205:31,210:23,217:30,219:38,221:33,224:25,229:24,232:25,237:20,247:30,248:55,253:16,254:36,256:16,257:36,259:16,260:36,262:18,264:20,266:7,267:10,268:7,269:10,271:14,274:14,277:22,279:25,281:20,282:30,284:22,286:23,288:18,289:36,291:20,292:20,294:20,295:40,297:24,305:32,306:42,308:37,310:26,317:26,319:30,321:40,323:33,326:32,329:35,330:45,332:32,334:35,340:30,342:30,344:36,346:40,348:40,354:37,356:37,362:42,364:32,365:44,372:30,373:50,375:20,376:45,388:18,389:32,391:14,392:36,394:16,395:36,397:14,398:34,400:15,402:10,404:15,405:30,409:30,411:30,413:20,414:20,416:21,419:26,421:25,423:30,426:28,432:38,435:34,437:33,444:24,445:48,450:34,452:40,454:37,457:31,460:40,496:17,497:36,499:17,500:36,502:17,503:36,505:20,507:16,508:32,510:20,520:21,521:32,523:27,525:25,530:31,533:25,536:25,537:36,541:20,544:22,545:30,552:29,553:40,555:35,558:34,560:39,563:34,565:37,567:37,569:36,571:30,575:32,576:41,578:32,579:41,581:35,583:35,584:47,586:34,591:39,593:40,596:36,598:40,600:38,601:49,603:39,606:42,608:41,611:38,612:48,614:37,620:50,623:43,625:52,628:54,630:54,634:50,635:64,637:59,651:16,652:36,654:16,655:36,657:16,658:36,660:20,662:17,663:35,665:9,666:12,668:35,670:19,673:32,675:32,678:25,680:35,687:30,689:39,691:48,693:37,697:39,699:39,705:40,706:50,713:37,715:48,723:17,724:34,726:17,727:34,729:17,730:34,732:14,733:28,735:20,737:20,743:25,745:25,748:38,750:30,752:22,754:34,756:24,758:33,760:27,762:18,768:30,770:42,783:35,784:45,790:43,791:53,792:53,811:16,812:35,814:16,815:35,817:16,818:35,820:24,822:18,823:38,825:10,826:30,828:18,830:20,832:24,834:22,836:25,838:18,839:34,844:36,847:26,849:30,851:28,857:32,858:42,860:32,861:42,862:35,863:28,864:38,866:42,879:34,886:50,887:60,907:16,908:36,910:16,911:36,913:16,914:36,916:18,918:15,920:24,922:18,925:25,927:26,929:25,930:35,933:24,934:38,941:25,943:30,945:28,949:30,956:35,958:24,959:38,961:26,964:38,966:40,970:35,972:30,980:20,997:35,998:54};
// 경험치 (배틀·훈련장): 레벨업하면 그 레벨에 배우는 기술을 익힌다. 기술이 4개면 '아는 기술'(kn)에 넣고, 가장 약한 공격 기술보다 세면 바로 바꾼다 (변화 기술은 자동으로 안 바꿈)
// ask: 배틀처럼 기술이 4개면 바로 바꾸지 않고 out.ask 에 모아 두었다가 본가처럼 물어본다 (경완 2026-10-30)
function gainXp(P, n, ask = false) {
  const m = gm(P), g = growth(P.sp), out = { lv0: m.lv, lv: m.lv, n: 0, learned: [], ask: ask && ask !== 'keep' ? [] : null };   // ask 'keep' = 훈련장 (v17.57 경완 '기존 기술 갈아끼우지 말고 익혀두기만')   // learned: [[새 기술, 잊은 기술|'']]
  if (m.lv >= LV_MAX || !(n > 0)) return out;
  n = Math.round(n); out.n = n; m.xp = Math.min(m.xp + n, xpAt(g, LV_MAX));
  while (m.lv < LV_MAX && m.xp >= xpAt(g, m.lv + 1)) { m.lv++; const L = D.sp[P.sp]?.lv || []; for (let i = 0; i < L.length; i += 2) if (L[i] === m.lv) teach(m, D.mv[L[i + 1]][0], out, ask === 'keep' ? 'keep' : !ask); }
  out.lv = m.lv; return out;
}
// v22.07 경완 '본가 기준 배틀 친밀도': 배틀에서 레벨업 +5/+3/+2 (친밀도 0~99 / 100~199 / 200~), 이긴 배틀에 나간 포켓몬 +3/+2/+1 (본가 관장 배틀), 쓰러지면 −1, 30레벨 이상 높은 상대에게 쓰러지면 −5 (200 이상은 −10). 연습 배틀은 없음
const frAdd = (P, a) => { if (!P) return; if (a > 0 && GA.addFr) GA.addFr(P.id, a); else P.fr = Math.max(0, Math.min(255, (P.fr || 0) + a)); }   /* 오를 땐 게임 addFr (만점 축하 frMaxHit 그대로) */, frStep = (P, A) => A[(P.fr || 0) >= 200 ? 2 : (P.fr || 0) >= 100 ? 1 : 0];
function frBattle(won) { const fl = Math.max(0, ...(B.foe || []).map(f => f?.lv || 0));
  (B.my || []).forEach((e, i) => { const P = boxOf(e.pid), pk = B.o.p[i]; if (!P || !pk) return;
    if (pk.fainted) frAdd(P, fl - (e.lv || 0) >= 30 ? -((P.fr || 0) >= 200 ? 10 : 5) : -1); else if (won && B.used?.has(e.pid)) frAdd(P, frStep(P, B.frw || [3, 2, 1]))   /* v22.14 체육관 도전자 배틀은 gym.js FR_W (난이도별) */; }); }
const mvPow = id => { const d = mvOf(id); return !d ? 0 : d[3] === 2 ? -1 : (d[4] || 40); };
// v20.85 경완 '기술 배우는 맛' (게이지+집중+실전 번뜩임): 특별한 기술(알 기술 4칸)마다 깨달음 게이지 m.egP[칸] 0~100, 다 차면 익힘.
// m.egF = 집중 칸 (훈련장에서 빨리 참). 레어(4번째) 칸은 EG_RARE 배 오래. 체육관 배틀에서 상대를 쓰러뜨리면 가끔 번뜩임(집중 칸 +EG_FL)
const EG_RARE = 2, EG_FL = 25, EG_FLP = .05, EG_RFP = .008;   // v22.07 레어 번뜩임: 기술 쓴 턴마다 0.8% (배틀당 포켓몬마다 번뜩임은 한 번)
   // v20.85 번뜩임: 내 포켓몬이 기술을 쓴 턴이 끝날 때 5%, 한 배틀에 포켓몬마다 한 번 +25% (경완 '적당히 밸런스')
const egList = P => (EGG?.[P.sp] || []).map((id, i) => ({ id, i, x: id && mvOf(id) })).filter(r => r.x);
const egKn = (m, id) => m.mv.includes(id) || (m.kn || []).includes(id);
const egOpen = P => { const m = gm(P); return egList(P).filter(r => !egKn(m, r.id)); };
function egFocus(P) { const m = gm(P), O = egOpen(P); if (!O.length) return -1; const N = O.filter(r => r.i !== 3); if (!N.length) return -1; return N.some(r => r.i === m.egF) ? m.egF : N[0].i; }   // v21.07 경완: 레어(4번째)는 집중·게이지 없음
function egAdd(P, i, amt) { const m = gm(P), r = egList(P).find(r => r.i === i); if (!r || i === 3 || egKn(m, r.id)) return null; const G = m.egP || (m.egP = [0, 0, 0, 0]);
  G[i] = Math.min(100, (G[i] || 0) + amt / (i === 3 ? EG_RARE : 1)); if (G[i] < 100) return null; teach(m, r.x[0], null, false); return r.x; }
function teach(m, id, out, auto = true) {
  if (m.mv.includes(id)) return;
  if (m.mv.length < 4) { m.mv.push(id); out?.learned.push([id, '']); return; }
  m.kn = m.kn || []; if (auto === 'keep') { if (!m.kn.includes(id)) { m.kn.push(id); out?.learned.push([id, '']); } return; }   // 훈련장: 빈 칸이 없으면 익혀만 둠 (기술 바꾸기에서 고를 수 있음)
  if (!m.kn.includes(id)) m.kn.push(id);
  if (!auto) { out?.ask?.push(id); return; } const nw = mvPow(id); if (nw <= 0) return;
  let k = -1; m.mv.forEach((x, i) => { const p = mvPow(x); if (p >= 0 && p < nw && (k < 0 || p < mvPow(m.mv[k]))) k = i; });
  if (k < 0) return;
  const old = m.mv[k]; m.mv[k] = id; m.kn = m.kn.filter(x => x !== id); m.kn.push(old); out?.learned.push([id, old]);
}
// 기술 바꾸기 후보: 지금 레벨까지 레벨업으로 배우는 기술 + 아는 기술(기술머신·훈련장)
const mvCands = (P, m = gm(P)) => [...new Set([...lvMoves(P.sp, m.lv).map(([, i]) => D.mv[i][0]), ...(m.kn || [])])].filter(id => !m.mv.includes(id) && mvOf(id));
// 쓰러뜨린 상대 한 마리의 경험치 (본가 5세대 식, 기초 경험치는 종족값 합으로 어림, 트레이너 배틀 1.5배)
function xpFor(foe, Lp) { const bs = SPECIES[foe.sp]?.bs || [60, 60, 60, 60, 60, 60], t = bs.reduce((a, b) => a + b, 0), b = Math.round(t * t / 1000), L = foe.lv;
  return Math.floor(1.5 * b * L / 5 * ((2 * L + 10) / (L + Lp + 10)) ** 2.5) + 1; }
const boxOf = id => S.box.find(p => p.id === id);
const nmOf = P => P.nm || SPECIES[SPECIES[P.sp]?.rb || P.sp]?.n || '???';   /* v15.93 배틀에선 본가처럼 지역 폼도 원래 이름 */   // 지어 준 이름 먼저 (경완 2026-10-31 '체육관 정보카드에서도 이름 바꾸기')
const tyOk = P => (SPECIES[P.sp]?.t || []).includes(S.gym?.ty);

const CRY_K = 2.2;   // 배틀 울음소리는 곡보다 잘 들리게 (v12.20 경완)
// ---------- 라인업 (3개 저장, 6마리) ----------
function lus() { const g = S.gym; if (!Array.isArray(g.lu)) g.lu = [[], [], []]; g.lu = g.lu.map(L => (L || []).filter(id => { const P = boxOf(id); return P && tyOk(P); }).slice(0, 6)); g.luI = clampN(g.luI | 0, 0, 2); return g.lu; }
const curLu = () => S.gym ? lus()[S.gym.luI | 0] : [];

// ---------- 그림 ----------
// 라인업·고르기 그림은 포켓몬 상자와 같은 그림 (경완 2026-10-27)
// 랭크는 꾸미기 모드처럼 그림 테두리 색으로 (경완 2026-10-27)
// 랭크 배지도 본 게임 포켓몬 박스처럼 왼쪽 위에 (경완 2026-10-27 '체육관 모드에도 랭크 테두리 + 랭크 배지')
const thumb = P => { const rk = GA.rankOf(P), it = S.gym?.mon?.[P.id]?.it; return `<span class="rk-fr" data-rk="${rk}"><span class="rk ${rk}">${rk}</span><img alt="" data-th="${P.id}"${P.shiny ? ` class="shiny" style="--shue:${GA.shinyHue(P.sp)}deg"` : ''}>${it && HOLD[it] ? `<img class="th-it" alt="${HOLD[it][0]}" src="${itImg(it)}">` : ''}</span>`; };   // 지닌 도구는 그림 오른쪽 아래 (경완 2026-10-29)
function fillTh(root) { root.querySelectorAll('img[data-th]').forEach(im => { const P = S.box.find(p => String(p.id) === im.dataset.th); if (P) GA.thumb(P).then(u => { if (u) im.src = u; }).catch(() => {}); });
  // 트레이너 포켓몬(종만 앎)도 포켓몬 상자와 같은 그림 (경완 2026-10-27)
  root.querySelectorAll('img[data-sp]').forEach(im => { if (im.dataset.ok) return; im.dataset.ok = 1; GA.thumb({ sp: +im.dataset.sp }).then(u => { if (u) im.src = u; }).catch(() => {}); }); }
const rfKey = sp => GA.SPECIES?.[sp]?.rb ? D?.sp?.[sp]?.id : '', fmDir = fm => RFA[fm] ? 'rf' : 'fm';
const pkSrc = (sp, o = {}) => rfKey(sp) ? `${IMG}pk/rf/${rfKey(sp)}${o.b ? 'b' : ''}${o.s ? 's' : ''}.png?v=${VER}` : `${IMG}pk/${sp}${o.b ? 'b' : ''}${o.s ? 's' : ''}${o.f && FEM.has(+sp) ? 'f' : ''}.png?v=${VER}`;
const TR_KO = { youngster: '반바지 꼬마', lass: '짧은 치마', bug_catcher: '곤충채집 소년', camper: '캠프 보이', picnicker: '피크닉 걸', hiker: '등산가', fisherman: '낚시꾼', swimmer_m: '수영팬티 소년', swimmer_f: '비키니 아가씨', cool_trainer_m: '엘리트 트레이너', cool_trainer_f: '엘리트 트레이너', beauty: '아가씨', gentleman: '신사', super_nerd: '괴짜', black_belt: '태권왕', bird_keeper: '새 조련사', psychic_m: '초능력자', psychic_f: '초능력자', engineer: '기술자', sailor: '뱃사람', rocker: '로커', tamer: '조련사', school_kid_m: '학원 소년', school_kid_f: '학원 소녀', battle_girl: '배틀걸', channeler: '기도사', juggler: '마술사', aroma_lady: '아로마 아가씨', ruin_maniac: '유적 마니아', poke_maniac: '포켓몬 마니아', pokemaniac: '포켓몬 마니아', ninja_boy: '닌자 보이', dragon_tamer: '드래곤 조련사', skier_f: '스키어', poke_kid: '포켓몬 꼬마', artist: '화가', cyclist_m: '사이클링 보이', jogger: '조깅맨' };
const NAMES_M = ['철수', '민준', '지훈', '현우', '도윤', '준서', '태양', '하준', '시우', '건우', '동현', '재민', '우진', '성민', '영호'];
const NAMES_F = ['영희', '서연', '지우', '하은', '수아', '민지', '예린', '소희', '유나', '채원', '다은', '지민', '나연', '보람', '은비'];
// 연습 상대 (도전자 방문은 3단계): 트레이너 종류별로 어울리는 포켓몬
const PRACTICE = [
  { tr: 'youngster', f: 0, sp: [19, 21, 23, 27, 56, 96, 20, 22] },
  { tr: 'lass', f: 1, sp: [16, 29, 35, 39, 43, 52, 133, 183] },
  { tr: 'bug_catcher', f: 0, sp: [10, 11, 12, 13, 14, 15, 46, 48, 123, 127] },
  { tr: 'camper', f: 0, sp: [27, 50, 56, 58, 74, 66, 111, 104] },
  { tr: 'picnicker', f: 1, sp: [43, 69, 102, 114, 16, 183, 187, 191] },
  { tr: 'hiker', f: 0, sp: [74, 75, 95, 66, 67, 104, 111, 246] },
  { tr: 'fisherman', f: 0, sp: [129, 118, 119, 60, 72, 98, 116, 222] },
  { tr: 'swimmer_f', f: 1, sp: [120, 121, 72, 86, 90, 116, 118, 183] },
  { tr: 'super_nerd', f: 0, sp: [81, 88, 100, 109, 137, 37, 58, 125] },
  { tr: 'bird_keeper', f: 0, sp: [16, 17, 21, 22, 84, 83, 163, 177] },
  { tr: 'psychic_m', f: 0, sp: [63, 64, 79, 96, 97, 122, 177, 202] },
  { tr: 'black_belt', f: 0, sp: [56, 57, 66, 67, 106, 107, 236, 296] },
  { tr: 'cool_trainer_f', f: 1, sp: [36, 31, 34, 121, 130, 26, 59, 197] },
];

// ---------- 배틀 화면 ----------
let el = null, B = null;   // 화면, 진행 중인 배틀
const $b = s => el.querySelector(s);
// ---------- 효과음 (플래티넘 원본 SEQ_SE_DP_*, gym/bgm.js 가 받아 와 연주) ----------
const se = (nm, o) => { try { window.GymBGM?.se('DP_' + nm, o); } catch (e) {} };
// 배틀 진동 (경완 2026-10-30): 맞을 때(효과가 굉장하면 세게), 급소, 쓰러질 때 우르르. 본 게임 진동(아이폰 앱 haptic·안드로이드 vibrate)을 그대로 쓴다
const vib = (n = 1) => { try { GA.haptic?.(n); } catch (e) {} };
const vibBig = (st = 2, g = 2) => { try { GA.rumble?.(st, g); } catch (e) {} };
const SE_BASE = ['DECIDE', 'SELECT', 'KOUKA_M', 'KOUKA_H', 'KOUKA_L', 'POKE_DEAD', 'BOWA2', 'SUIKOMU', 'SLIDEIN', 'HINSI', 'NAGERU'];
const tapSe = (nm = 'DECIDE') => { try { GA.quietTap?.(); } catch (e) {} se(nm); };
// 화면 x(0~256) → 소리 좌우
const panOf = side => side === 'e' ? .5 : -.5;

function buildUI() {
  el = document.createElement('div'); el.className = 'bt'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '배틀');
  el.innerHTML = `<div class="bt-ds">
    <div class="bt-top">
      <div class="bt-bg"></div><i class="bt-terr"></i><i class="bt-dim"></i>
      <i class="bt-pl e"></i><i class="bt-pl p"></i>
      <i class="bt-tr e"></i><i class="bt-tr p"></i>
      <div class="bt-mw e"><div class="bt-mon e"><div class="clip"><img alt=""></div></div></div>
      <div class="bt-mw p"><div class="bt-mon p"><div class="clip"><img alt=""></div></div></div>
      <i class="bt-wx"></i><div class="bt-lvw" hidden></div><div class="bt-shw" hidden></div>
      <canvas class="bt-ptc" width="256" height="192"></canvas>
      <div class="bt-hb e"><span class="hbb"></span><b class="nm"></b><span class="lv"><i class="sx"></i><em class="lvn"></em></span><i class="st"></i><i class="hp"><i></i></i></div>
      <div class="bt-hb p"><span class="hbb"></span><b class="nm"></b><span class="lv"><i class="sx"></i><em class="lvn"></em></span><i class="st"></i><i class="hp"><i></i></i><span class="hpn"><b class="c"></b><b class="m"></b></span><i class="xp"><i></i></i></div>
      <div class="bt-pty e"></div><div class="bt-pty p"></div>
      <div class="bt-fx"></div>
      <div class="bt-msg"><span class="t"></span><b class="cur" hidden>▼</b></div>
      <i class="bt-flash"></i>
    </div>
    <div class="bt-hinge"></div>
    <div class="bt-mid"></div>
    <div class="bt-bot"><div class="bt-panel"></div></div>
  </div>`;
  document.getElementById('gym').appendChild(el);
  el.addEventListener('pointerup', () => { if (B?.tapWake) { const w = B.tapWake; B.tapWake = null; se('SELECT'); w(); }   /* 경완 2026-10-28: 글 넘길 때 본가(Pt 글상자 A 버튼)와 같은 SEQ_SE_DP_SELECT */ else if (B) B.fast = true; });
  addEventListener('resize', fit);
}
// 세로로 긴 휴대폰 (경완 2026-10-27 '전체 화면을 모바일 레이아웃에 맞게', '배틀 상태창은 배틀 화면 밑에 바로 붙여주고 버튼을 좀 위아래로 키워도 돼'):
// 위 화면은 맨 위 폭에 꽉 차게, 바로 밑에 대화창, 남는 높이는 모두 아래(터치) 화면 — 아래 화면은 세로로만 더 늘리고 글자·그림은 원래 비율로 되돌린다.
// 넓은 화면은 예전처럼 두 화면을 가운데에
let safe = null; const TOP_H = 144;   // 본가 대화창 윗선(144): 뒷모습 그림이 거기서 끝난다 (경완 2026-10-28)   // 대화창을 밖으로 꺼내면 위 화면은 배틀 장면 높이만
const safeIn = () => { if (safe) return safe; const q = document.createElement('div'); q.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'; document.body.appendChild(q);
  const cs = getComputedStyle(q); safe = [parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0]; q.remove(); return safe; };
function fit() {
  if (!el) return; const W = innerWidth, H = innerHeight, mob = H / W > 1.45, msgEl = $b('.bt-msg');
  el.classList.toggle('mob', mob);
  if (mob) { const k = W / 256, [st, sb] = safeIn(), mh = 52 * k, tall = H - sb - st - (TOP_H + 52 + 192) * k >= 0, top = st + (tall ? TOP_H : 192) * k, bt = top + mh, bh = H - sb - bt;
    el.classList.toggle('msgmid', tall); (tall ? $b('.bt-mid') : $b('.bt-top')).appendChild(msgEl);
    [['--k', k], ['--bh', (tall ? bh / k : 192) + 'px'], ['--st', st + 'px'], ['--mt', top + 'px'], ['--mh', mh + 'px'], ['--bt', (tall ? bt : H - sb - 192 * k) + 'px']].forEach(([n, v]) => el.style.setProperty(n, v)); return; }
  el.classList.remove('msgmid'); $b('.bt-top').appendChild(msgEl);
  const k = Math.max(1, Math.floor(Math.min(W / 256, (H - 20) / 394) * 4) / 4); el.style.setProperty('--k', k);
}

// 대화창: 글자를 하나씩. wait=true 면 다 쓰고 잠깐 멈춤(누르면 바로 다음)
// 본가처럼 ▼ 가 깜빡이는 동안 대화창·빈 곳을 누르면 넘어간다. 안 눌러도 잠시 뒤 저절로 (경완 2026-10-28)
async function msg(t, hold = 650) {
  if (!B) return; const box = $b('.bt-msg .t'), cur = $b('.bt-msg .cur'); B.fast = false; cur.hidden = true; box.textContent = ''; B.msgOn = true;
  for (const ch of [...t]) { if (!B) return; if (B.fast) { box.textContent = t.replace(/[\u23F8\u0007]/g, ''); break; } if (ch === '\u23F8') { await wait(330); continue; } if (ch === '\u0007') { se('KON'); continue; } box.textContent += ch; await wait(ch === ' ' ? 12 : 26); }   // ⏸ = 본가 {PAUSE 20} (20프레임 멈춤)
  // 저절로 넘어가지 않는다: 대화창·빈 곳을 눌러야 다음 (경완 2026-10-28)
  if (hold) { cur.hidden = false; await new Promise(r => { if (!B) return r(); B.tapWake = r; const iv = setInterval(() => { if (!B || B.tapWake !== r) { clearInterval(iv); r(); } }, 250); }); if (B) B.tapWake = null; cur.hidden = true; }
  if (B) { B.msgOn = false; if (hold) await abDone(); }   // v21.31: 특성 창은 그 대사를 넘길 때 같이 들어간다
}
// 누를 때까지 기다리는 대화 (승부 끝 등)
// 본가 {WAIT 5}{WAIT 2}: 글이 다 나오면 팡파르(레벨 업·새 기술), 끝날 때까지 기다렸다가 눌러서 다음 (경완 2026-10-31 본가 타이밍)
// v13.26 경완: 기술을 배울 때는 늘 본가 배틀에서 기술 배울 때 팡파르 (ME_FANFA1)
const learnFan = () => { try { if (window.GymBGM?.se) window.GymBGM.se('ME_FANFA1'); else se('DECIDE'); } catch (e) {} };   // v13.28 경완: 배틀 밖에선 배경곡을 줄이지 않고 그 위에 팡파르만
async function msgFan(t) { await msg(t, 0); if (!B) return; try { await window.GymBGM?.fan?.('ME_FANFA1'); } catch (e) {} if (!B) return; $b('.bt-msg .cur').hidden = false; await new Promise(r => { B.tapWake = r; }); if (B) { B.tapWake = null; $b('.bt-msg .cur').hidden = true; } }
async function msgTap(t) { await msg(t, 0); if (!B) return; $b('.bt-msg .cur').hidden = false; await new Promise(r => { B.tapWake = r; }); $b('.bt-msg .cur').hidden = true; }

// 체력 막대 (본가: 초록 > 1/2, 노랑 > 1/5, 빨강). 막대는 48칸, 4세대처럼 한 칸씩 줄어든다
function hpCol(r) { return r > .5 ? 'g' : r > .2 ? 'y' : 'r'; }
const hpPx = (hp, mhp) => hp <= 0 || !mhp ? 0 : Math.max(1, Math.ceil(hp / mhp * 48));
function paintHb(side, A) {
  const hb = $b(`.bt-hb.${side}`); if (!A) { hb.classList.remove('on'); return; }
  hb.querySelector('.nm').textContent = A.nm; hb.querySelector('.lvn').textContent = A.lv;
  { let ty = hb.querySelector('.tym'); if (!ty) { ty = document.createElement('span'); ty.className = 'tym'; hb.appendChild(ty); } const k = String(A.tsp || A.sp); if (ty.dataset.sp !== k) { ty.dataset.sp = k; ty.innerHTML = (SPECIES[A.tsp || A.sp]?.t || []).map(t => tyI(t)).join(''); } }   // v14.85 경완: HP 막대 왼쪽 빈 칸에 타입 아이콘 (시안 C)
  const sx = hb.querySelector('.sx'); sx.className = 'sx ' + (A.g || ''); sx.textContent = A.g === 'M' ? '♂' : A.g === 'F' ? '♀' : '';
  setHp(side, A.hp, A.mhp); setSt(side, A.st);
  if (side === 'p') { const g = A.xpg; hb.querySelector('.xp>i').style.width = (g ? clampN(g, 0, 1) * 96 : 0) + 'px'; }
}
function setHp(side, hp, mhp, px = hpPx(hp, mhp)) {
  const hb = $b(`.bt-hb.${side}`), f = hb.querySelector('.hp>i');
  f.style.width = px + 'px'; f.className = hpCol(px / 48);
  if (side === 'p') { hb.querySelector('.hpn .c').textContent = Math.max(0, Math.round(hp)); hb.querySelector('.hpn .m').textContent = mhp; }
  if (side === 'p') lowHp(px > 0 && px / 48 <= .2);
  hbBalls(side);
}
// 체력 상자 안 HP 띠 왼쪽에 남은 포켓몬 수 몬스터볼 (경완 2026-10-28 '각자의 포켓몬 정보 박스 내에')
function hbBalls(side) { const b = el?.querySelector(`.bt-hb.${side} .hbb`); if (b && B) b.innerHTML = balls(side); }
async function drainHp(side, A, to) {
  const from = A.hp, p0 = hpPx(from, A.mhp), p1 = hpPx(to, A.mhp), n = Math.abs(p1 - p0);
  for (let i = 1; i <= n; i++) { if (!B) return; setHp(side, from + (to - from) * i / n, A.mhp, p0 + Math.sign(p1 - p0) * i); await wait(B.fast ? 8 : 17); }
  A.hp = to; setHp(side, to, A.mhp, p1);
}
// 내 포켓몬 체력이 빨강이면 본가처럼 삐삐 소리
function lowHp(on) {
  if (!B) return; if (on === !!B.lowT) return;
  if (on) { const f = () => { if (B && !B.btl.ended) se('HINSI'); }; f(); B.lowT = setInterval(f, 700); } else { clearInterval(B.lowT); B.lowT = 0; }
}
const ST_X = { par: 0, frz: 1, slp: 2, psn: 3, tox: 3, brn: 4 };
function setSt(side, st) { const i = $b(`.bt-hb.${side} .st`); i.className = 'st' + (st in ST_X ? ' s' + ST_X[st] : ''); hbBalls(side); stPat(side, st); }
// v21.89 [DBK] Animated Pokémon System 상태이상 무늬: 화상 빨강·마비 노랑·독 보라·얼음 하늘색이 몸 위에 짙어졌다 옅어짐 (불투명도 16~128/255, 0.05초마다 1씩, 60에서 시작)
const ST_PAT = { brn: '#ff0000', par: '#ffd800', psn: '#b200ff', tox: '#b200ff', frz: '#00ffff' };
function stPatDefs() { if (document.getElementById('btStPat')?.isConnected && (!el || el.contains(document.getElementById('btStPat')))) return; document.getElementById('btStPat')?.remove(); const lo = 16 / 255, hi = 128 / 255, half = 112 * .05;
  const d = document.createElement('div'); d.id = 'btStPat'; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = `<svg width="0" height="0"><defs>${Object.entries(ST_PAT).map(([k, c]) => `<filter id="btSt_${k}" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1"><feFlood flood-color="${c}" flood-opacity="${(60 / 255).toFixed(3)}"><animate attributeName="flood-opacity" values="${lo.toFixed(3)};${hi.toFixed(3)};${lo.toFixed(3)}" dur="${half * 2}s" begin="-${((60 - 16) * .05).toFixed(2)}s" repeatCount="indefinite"/></feFlood><feComposite in2="SourceAlpha" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge></filter>`).join('')}<filter id="btDmx" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1"><feFlood flood-color="#ff1048" flood-opacity=".35"><animate attributeName="flood-opacity" values=".22;.48;.22" dur="1.6s" repeatCount="indefinite"/></feFlood><feComposite in2="SourceAlpha" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge></filter></defs></svg>`;
  (el || document.body).appendChild(d); }   /* 배틀 화면 안에 둠: 숨긴 곳(display:none)에 있으면 필터가 안 먹음 */
// v21.89 기믹 연출 (그림 묶음 오기 전 CSS 판): 메가 = 무지개 빛 감싸고 하얗게 번쩍 → 메가 그림, Z = 금빛 기운, 테라 = 결정 반짝 + 타입 색, 다이맥스 = 붉게 커짐 + 붉은 구름
const msOf = it => typeof it?.megaStone === 'string' ? it.megaStone : Object.values(it?.megaStone || {})[0] || '';   // 새 쇼다운: {리자몽: 'Charizard-Mega-X'}
const gmStone = it => { const sp = msOf(it) ? PSim.Dex.species.get(msOf(it)) : null, base = sp ? PSim.Dex.species.get(sp.baseSpecies) : null, k = base ? SPECIES[base.num]?.n : ''; return k ? k + '나이트' + (/-([XYZ])$/.exec(sp.name)?.[1] || '') : itKo(it?.name); };
// v21.89 [DBK] 장면: gymb/dbk.js (플러그인 Ruby 시간표 그대로). 못 받으면 예전 CSS 연출
let dbkP = null;
const dbkLoad = () => window.GymDBK ? Promise.resolve(true) : (dbkP = dbkP || Promise.race([new Promise(r => { const x = document.createElement('script'); x.src = `gymb/dbk.js?v=${VER}`; x.onload = () => r(!!window.GymDBK); x.onerror = () => r(false); document.head.appendChild(x); }), wait(4000).then(() => false)]));
const dxImg = u => new Promise(r => { if (!u) return r(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => r(null); i.src = u; });
const frontOf = (X, fm) => gifUrl(X.sp, false, X.shiny, X.g === 'F', fm) || pkSrc(X.sp, { s: X.shiny });
async function dxMon(u) { const z = await dxImg(u); if (!z) return null; const g = await gifTop(u); return { url: u, w: z.w * 2, h: z.h * 2, top: (g?.t || 0) * 2 }; }   // 블랙·화이트 크기 그림 = Essentials 의 절반 → 2배
const DX_SE = { 'Psych Up': 'SUIKOMU', fog2: 'BOWA2', Earth1: 'KOUKA_H', Sword2: 'KOUKA_L', Ice5: 'KOUKA_M', Saint7: 'SELECT', 'Battle recall': 'BOWA2', 'Battle throw': 'NAGERU', Explosion3: 'KOUKA_H' };
const DX_MP3 = { 'DX Action': 'dxaction', 'Z-Move Title': 'ztitle' };
function dxSe(n, pan) { if (DX_MP3[n]) { try { const a = new Audio(`${IMG}dbk/se/${DX_MP3[n]}.mp3`); a.volume = .8; a.play().catch(() => {}); } catch (e) {} return; } if (DX_SE[n]) se(DX_SE[n], { pan }); }
async function dxCtx(s, X, from, to, item) {
  const bg = $b('.bt-bg'), cs = getComputedStyle(bg), bu = (bg.style.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] || `${IMG}bt/bg_in1.png`, bp = cs.backgroundPosition.split(' ').map(v => parseFloat(v) * 2 + 'px').join(' ');
  const [mon, too, tr, it] = await Promise.all([dxMon(from), dxMon(to), dxImg(B.trU?.[s]), dxImg(item)]);
  return { host: $b('.bt-top'), path: `${IMG}dbk/`, opp: s === 'e', wild: false, bg: { url: bu, pos: bp, size: '1024px 384px' }, base: { url: `${IMG}bt/pl_e.png`, w: 256, h: 128 },
    tr: { url: B.trU?.[s] || `${IMG}tr/pt_m.png`, w: (tr?.w || 80) * 2, h: (tr?.h || 80) * 2 }, item: it ? { url: item, w: it.w > 40 ? it.w : it.w * 1.6, h: it.w > 40 ? it.h : it.h * 1.6 } : null,
    mon: mon || too, to: too || mon, se: n => dxSe(n, panOf(s)), cry: () => { try { GA.cry?.(X.sp, 0, 1, CRY_K); } catch (e) {} } };
}
const ZT_ID = { '10000000voltthunderbolt': 'TENMILLIONVOLTTHUNDERBOLT' };
async function gmFx(s, X, kind, ty) {
  const m = monEl(s); if (!m || !B) return; const pan = panOf(s), DBK = await dbkLoad();
  const swap = () => { m._tok = (m._tok || 0) + 1; showMon(s, X, true); playAnim(s, X); };
  if (DBK && X && (kind === 'mega' || kind === 'z' || kind === 'tera' || kind === 'dmax')) {
    try {
      { const mt = $b('.bt-msg .t'); if (mt) mt.textContent = ''; }   // 장면 동안 앞 대사는 지움
      if (kind === 'mega') { const c = await dxCtx(s, X, frontOf(X, X.fmPrev), frontOf(X, X.fm), `${IMG}dbk/it/key-stone.png`), st = toID(ty || ''); if (st) { const z = await dxImg(`${IMG}dbk/it/${st}.png`); if (z) c.stone = { url: `${IMG}dbk/it/${st}.png`, w: z.w * 1.6, h: z.h * 1.6 }; }
        await GymDBK.mega(c); if (X.gmPend) { X.gmPend = 0; swap(); } return; }
      if (kind === 'z') { const zid = ty?.id || '', zt = zid && (ZT_ID[zid] || zid.toUpperCase()), c = await dxCtx(s, X, frontOf(X, X.fm), frontOf(X, X.fm), `${IMG}dbk/it/ZRING.png`), cr = toID(ty?.item || '');
        if (cr) { const z = await dxImg(`${IMG}dbk/it/${cr.toUpperCase()}.png`); if (z) c.stone = { url: `${IMG}dbk/it/${cr.toUpperCase()}.png`, w: z.w, h: z.h }; }
        c.type = ty?.type || 'Normal'; if (zt && PSim.Dex.moves.get(zid).isZ && PSim.Dex.moves.get(zid).category !== 'Status') { const T = await dxImg(`${IMG}dbk/Z-Power/Z-Titles/${zt}.png`); if (T) { c.title = `${IMG}dbk/Z-Power/Z-Titles/${zt}.png`; c.titleW = T.w; c.titleH = T.h; c.upper = /^(catastropika|10000000voltthunderbolt|letssnuggleforever)$/.test(zid); } }
        await GymDBK.zmove(c); return; }
      if (kind === 'tera') { const c = await dxCtx(s, X, frontOf(X, X.fm), frontOf(X, X.fm), `${IMG}dbk/it/TERAORB.png`); c.type = ty; c.pat = `${IMG}dbk/pat/tera_pattern_${String(ty || '').toUpperCase()}.png`;
        await GymDBK.tera(c); teraOn(s, ty); return; }
      if (kind === 'dmax') { const c = await dxCtx(s, X, frontOf(X, X.fm0 ?? X.fm), frontOf(X, X.fm), `${IMG}dbk/it/DYNAMAXBAND.png`); c.ball = c.ballOpen = `${IMG}dbk/it/poke-ball.png`; c.ballW = c.ballH = 48; c.pat = `${IMG}dbk/pat/dynamax.png`; c.calyrex = X.sp === 898;
        await GymDBK.dynamax(c); swap(); dmaxOn(s, X); return; }
    } catch (e) { console.error(e); }
  }
  if (kind === 'mega' || kind === 'primal') { se('KOUKA_M', { pan }); m.classList.add('gm-' + kind); await wait(B.fast ? 400 : 900); m.classList.add('fmc'); await wait(260); if (X?.gmPend) { X.gmPend = 0; swap(); } await wait(420); m.classList.remove('fmc', 'gm-' + kind); try { if (X) GA.cry?.(X.sp, 0, 1, CRY_K); } catch (e) {} return; }
  if (kind === 'z') { se('KOUKA_M', { pan }); m.classList.add('gm-z'); await wait(B.fast ? 400 : 1000); m.classList.remove('gm-z'); return; }
  if (kind === 'tera') { se('KOUKA_M', { pan }); m.classList.add('gm-tera'); await wait(B.fast ? 500 : 1100); m.classList.remove('gm-tera'); teraOn(s, ty); return; }
  if (kind === 'dmax') { se('KOUKA_M', { pan }); m.classList.add('fmc'); await wait(260); swap(); m.classList.remove('fmc'); dmaxOn(s, X); await wait(B.fast ? 400 : 900); try { if (X) GA.cry?.(X.sp, 0, 1, CRY_K); } catch (e) {} return; }
  if (kind === 'undmax') { m.classList.add('fmc'); await wait(260); dmaxOff(s); swap(); await wait(420); m.classList.remove('fmc'); }
}
// 배틀 중 무늬 ([DBK] Dynamax [003] UI.rb / Terastallization [002] UI.rb): 그림 위에 무늬를 불투명도 150 으로 겹쳐 흘림. 다이맥스는 1.5배
function patOn(s, cls, url, size) { const m = monEl(s), cl = m?.querySelector('.clip'), img = cl?.querySelector('img'); if (!img) return; cl.querySelector('.dpat')?.remove();
  const p = document.createElement('i'); p.className = 'dpat ' + cls; p.style.backgroundImage = `url(${url})`; p.style.backgroundSize = size;
  const fit = () => { const u = `url("${img.src}")`; p.style.left = img.offsetLeft + 'px'; p.style.top = img.offsetTop + 'px'; p.style.width = img.offsetWidth + 'px'; p.style.height = img.offsetHeight + 'px'; p.style.webkitMaskImage = p.style.maskImage = u; };
  fit(); img.addEventListener('load', fit); m._patFit = fit; cl.appendChild(p); }
function teraOn(s, ty) { const m = monEl(s); m.classList.add('tera'); patOn(s, 'tp', `${IMG}dbk/pat/tera_pattern_${String(ty || '').toUpperCase()}.png`, '300px 300px'); stPat(s, ''); }
function dmaxOn(s, X) { const m = monEl(s); m.classList.add('dmx'); patOn(s, 'dp', `${IMG}dbk/pat/${X?.sp === 898 ? 'CALYREX' : 'dynamax'}.png`, '400px 96px'); stPat(s, ''); }
function dmaxOff(s) { const m = monEl(s); m.classList.remove('dmx'); m.querySelector('.dpat')?.remove(); }
const DBK_ON = false;   /* v21.89 기믹·상태 무늬·상대 가방·배틀 정보는 경완 확인 전까지 꺼 둠 (트레이너 등장만 켬) */
function stPat(side, st) { if (!DBK_ON) return; const img = monEl(side)?.querySelector('img'); if (!img) return; if (B?.gmx?.[side] || monEl(side).classList.contains('tera')) img.style.filter = ''; else if (ST_PAT[st]) { stPatDefs(); img.style.filter = `url(#btSt_${st})`; } else img.style.filter = ''; }   /* 다이맥스 중엔 붉은 무늬 (DBK 도 다이맥스·테라 중엔 상태 무늬 안 함) */

// ---------- 포켓몬 그림 ----------
// 1~649: 블랙·화이트 움직이는 gif (못 받으면 1~493 은 플래티넘 2장 그림+움직임, 494~649 는 한 장), 650~: 팬게임(pokeemerald-expansion) 2장 그림을 같은 판으로 (gym/img/pk/anim.json)
// 위치는 DS 화면 좌표: 상대 80x80 칸 왼쪽 위 (136, E_Y+보정), 내 쪽 (40, P_Y+보정)
const E_Y = 8, P_Y = 64;
function monEl(side) { return $b(`.bt-mon.${side}`); }
// 1~649 는 블랙·화이트 움직이는 gif 를 smogon/sprites(고정 커밋)에서 바로 받아 계속 움직인다. 못 받으면 저장소 그림
const G5 = 'https://raw.githubusercontent.com/smogon/sprites/18fc3d83b8bc6746f0052273232c1794ef2d7d42/src/sprites/gen5/';
const G5K = ['-b', '-s', '-f', '-b-s', '-b-f', '-f-s', '-b-f-s'];
// v21.73 경완 '팬 도트 gif로 다 바꿔줘': 650~1025·지역 폼은 PokeAPI/sprites(고정 커밋)의 블랙·화이트풍 팬 도트 gif. 있는 것만 (gym/img/pk/bwa.json: 1 뒤 2 이로치 4 뒤 이로치 8 암컷 16 뒤 암컷), 없으면 예전 그림
const BWG = 'https://raw.githubusercontent.com/PokeAPI/sprites/1b3b7c0a538dd2226ae08d0d2f8955125075bbd4/sprites/pokemon/versions/generation-v/black-white/animated/';
let BWA = {}, SOFF = {};
// v21.75 경완 고른 것: bwa.json {r: PokeAPI 비트, l: 저장소 gym/img/pk/bw 비트(EeveeExpo 묶음, 32 앞 1 뒤 2 이로치 4 뒤 이로치 8 암컷 16 뒤 암컷)}. 저장소 것이 먼저
function bwUrl(sp, b, sh, f) { const L = BWA.l?.[sp] || 0, R = BWA.r?.[sp], loc = p => `${IMG}pk/bw/${p}${sp}.gif?v=4`, rem = d => `${BWG}${d}${sp}.gif`, has = x => R != null && R & x;
  if (b) { if (f && !sh) { if (L & 16) return loc('bf'); if (has(16)) return rem('back/female/'); }
    if (sh) { if (L & 4) return loc('bs'); if (has(4)) return rem('back/shiny/'); }
    return L & 1 ? loc('b') : has(1) ? rem('back/') : null; }
  if (L & 32) return loc(f && !sh && L & 8 ? 'f' : sh && L & 2 ? 's' : '');
  if (sh && L & 2) return loc('s');   // PokeAPI 에 이로치만 없는 종 (오거래곤·대여르)
  return R == null ? null : rem(f && !sh && R & 8 ? 'female/' : sh && R & 2 ? 'shiny/' : ''); }
// 배틀 중 바뀐 폼 (tools/gym/mkforms.py): 1~649 는 블랙·화이트 gif 폼 이름, 650~ 은 gym/img/pk/fm/<쇼다운 id>.png
const FM_G = { castformrainy: 'castform-orainy', castformsunny: 'castform-osunny', castformsnowy: 'castform-osnowy', cherrimsunshine: 'cherrim-osunshine', darmanitanzen: 'darmanitan-ozen', meloettapirouette: 'meloetta-opirouette',
  rotomheat: 'rotom-oheat', rotomwash: 'rotom-owash', rotomfrost: 'rotom-ofrost', rotomfan: 'rotom-ofan', rotommow: 'rotom-omow', tornadustherian: 'tornadus-otherian', thundurustherian: 'thundurus-otherian', landorustherian: 'landorus-otherian',
  arceusbug: 'arceus-obug', arceusdark: 'arceus-odark', arceusdragon: 'arceus-odragon', arceuselectric: 'arceus-oelectric', arceusfighting: 'arceus-ofighting', arceusfire: 'arceus-ofire', arceusflying: 'arceus-oflying', arceusghost: 'arceus-oghost', arceusgrass: 'arceus-ograss', arceusground: 'arceus-oground', arceusice: 'arceus-oice', arceuspoison: 'arceus-opoison', arceuspsychic: 'arceus-opsychic', arceusrock: 'arceus-orock', arceussteel: 'arceus-osteel', arceuswater: 'arceus-owater', genesectdouse: 'genesect-odouse', genesectshock: 'genesect-oshock', genesectburn: 'genesect-oburn', genesectchill: 'genesect-ochill', deoxysattack: 'deoxys-oattack', deoxysdefense: 'deoxys-odefense', deoxysspeed: 'deoxys-ospeed', shayminsky: 'shaymin-osky', giratinaorigin: 'giratina-oorigin' };
// v16.81 경완: 필드에서 바꾼 폼(로토무 가전제품·영물폼)은 배틀에서도 그 폼 (타입·능력치·그림)
const BFM = { 479: { Heat: 'rotomheat', Wash: 'rotomwash', Frost: 'rotomfrost', Fan: 'rotomfan', Mow: 'rotommow' }, 641: { Therian: 'tornadustherian' }, 642: { Therian: 'thundurustherian' }, 645: { Therian: 'landorustherian' }, 905: { Therian: 'enamorustherian' }, 892: { Rapid_Strike: 'urshifurapidstrike' }, 849: { Lowkey: 'toxtricitylowkey' }, 745: { Midnight: 'lycanrocmidnight', Dusk: 'lycanrocdusk' }, 493: { Bug: ['arceusbug', 'insectplate'], Dark: ['arceusdark', 'dreadplate'], Dragon: ['arceusdragon', 'dracoplate'], Electric: ['arceuselectric', 'zapplate'], Fighting: ['arceusfighting', 'fistplate'], Fire: ['arceusfire', 'flameplate'], Flying: ['arceusflying', 'skyplate'], Ghost: ['arceusghost', 'spookyplate'], Grass: ['arceusgrass', 'meadowplate'], Ground: ['arceusground', 'earthplate'], Ice: ['arceusice', 'icicleplate'], Poison: ['arceuspoison', 'toxicplate'], Psychic: ['arceuspsychic', 'mindplate'], Rock: ['arceusrock', 'stoneplate'], Steel: ['arceussteel', 'ironplate'], Water: ['arceuswater', 'splashplate'], Fairy: ['arceusfairy', 'pixieplate'] }, 649: { Douse: ['genesectdouse', 'dousedrive'], Shock: ['genesectshock', 'shockdrive'], Burn: ['genesectburn', 'burndrive'], Chill: ['genesectchill', 'chilldrive'] }, 386: { Attack: 'deoxysattack', Defense: 'deoxysdefense', Speed: 'deoxysspeed' }, 492: { Sky: 'shayminsky' }, 483: { Origin: ['dialgaorigin', 'adamantcrystal'] }, 484: { Origin: ['palkiaorigin', 'lustrousglobe'] }, 487: { Origin: ['giratinaorigin', 'griseouscore'] }, 720: { Unbound: 'hoopaunbound' }, 888: { Crowned_Sword: ['zaciancrowned', 'rustedsword'] }, 889: { Crowned_Shield: ['zamazentacrowned', 'rustedshield'] }, 718: { 10: 'zygarde10', Complete: ['zygarde', '', 'powerconstruct'] }, 1017: { '': ['ogerpon', 'tealmask'], Wellspring: ['ogerponwellspring', 'wellspringmask'], Hearthflame: ['ogerponhearthflame', 'hearthflamemask'], Cornerstone: ['ogerponcornerstone', 'cornerstonemask'] }, 646: { Black: 'kyuremblack', White: 'kyuremwhite' }, 741: { Pom_Pom: 'oricoriopompom', Pa_U: 'oricoriopau', Sensu: 'oricoriosensu' } };   // v16.88: 폼 도구 — [쇼다운 종, 지니는 도구]
const anOf = A => A && (FMA[A.fm] || ANIM[A.sp]);
function gifUrl(sp, b, sh, f, fm) {
  { const G = fm ? GMJ[fm] : null; if (G) { const L = G[2], u = p => `${IMG}pk/gm/${p}${fm}.gif?v=1`; if (b) return sh && L & 4 ? u('bs') : L & 1 ? u('b') : null; return sh && L & 2 ? u('s') : L & 32 ? u('') : null; } }   /* v21.89 메가진화·거다이맥스 움직이는 그림 */
  { const L = fm ? BWA.fm?.[fm] : null; if (L) { const u = p => `${IMG}pk/bw/${p}${fm}.gif?v=4`; if (b) return sh && L & 4 ? u('bs') : L & 1 ? u('b') : null; return sh && L & 2 ? u('s') : L & 32 ? u('') : null; } }   /* v21.78 경완 '폼 체인지도 다 움직이는 걸로': 배틀 폼(마이티폼·들킨 모습 등) EeveeExpo 움직이는 그림 */
  if (+sp >= 650 && (!fm || fm === toID(D?.sp?.[sp]?.id || ''))) return bwUrl(sp, b, sh, f);   /* 배틀 중 바뀐 폼은 예전 그림 */
  if (RFA[fm] || rfKey(sp)) return null;   /* 지역 폼은 gif 없이 저장소 그림 */
  if (FM_G[fm]) return `${G5}s${FM_G[fm]}${b ? '-b' : ''}${sh ? '-s' : ''}.gif`;
  const g = ANIM.g?.[sp]; if (!g) return null; const [nm, bits] = g, has = k => !k || (bits >> G5K.indexOf(k) & 1);
  const fs = f ? ['-f', ''] : [''], ss = sh ? ['-s', ''] : [''];
  for (const fk of fs) for (const sk of ss) { const k = (b ? '-b' : '') + fk + sk; if (has(k)) return `${G5}s${nm}${k}.gif`; }
  return has(b ? '-b' : '') ? `${G5}s${nm}${b ? '-b' : ''}.gif` : null;
}
const gifOk = new Map();   // 주소 → Promise<bool>
function gifLoad(u) {
  if (!u) return Promise.resolve(false);
  if (!gifOk.has(u)) gifOk.set(u, new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = u; }));
  return gifOk.get(u);
}
// v14.30 경완 '머리가 상대 정보 박스에 가려지지 않게': 뒷모습 gif 의 위쪽 빈 줄 수를 재서, 그림 윗끝이 박스 아래(GIF_TOP)보다 위면 그만큼 내림 (아래는 대사창 뒤로 잘려도 됨)
const GIF_TOP = 56, gifTopC = new Map();
function gifTop(u) {
  if (!gifTopC.has(u)) gifTopC.set(u, new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => { try { const w = i.naturalWidth, h = i.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, w, h).data; let t = 0;
      out: for (; t < h; t++) for (let j = 0; j < w; j++) if (d[(t * w + j) * 4 + 3] > 20) break out; r({ h, t }); } catch (e) { r(null); } };
    i.onerror = () => r(null); i.src = u; }));
  return gifTopC.get(u);
}
// 나올 그림 고르기: gif 가 1.5초 안에 오면 gif, 아니면 저장소 그림 (늦게라도 오면 다음 번엔 gif)
async function pickGif(side, A) {
  const u = gifUrl(A.sp, side === 'p', A.shiny, A.g === 'F', A.fm); if (!u) return null;
  return (await Promise.race([gifLoad(u), wait(1500).then(() => false)])) ? u : null;
}
// 새 그림이 다 올 때까지 숨긴다: 아이폰은 새 주소를 받는 동안 앞 포켓몬 그림을 그대로 보여 줘서 이름과 그림이 어긋났다 (경완 2026-10-27 '모래두지인데 깨비참')
function setSrc(img, u) {
  const abs = new URL(u, location.href).href; if (img.src === abs && img.complete && img.naturalWidth) { img.style.visibility = ''; return; }
  img.style.visibility = 'hidden'; img.onload = () => { img.onload = null; img.style.visibility = ''; }; img.src = u;
}
function showMon(side, A, on = true) {
  const m = monEl(side), img = m.querySelector('img');
  img.style.width = '';
  if (A && A.gif) { m._fa = null; m.classList.remove('fa'); img.style.height = ''; img.onerror = null; setSrc(img, A.gif); img.alt = ''; m.classList.remove('pl2'); m.classList.add('gf'); img.style.transform = ''; m.style.left = m.style.top = '';
    // 블랙·화이트 뒷모습 gif 는 앞모습과 거의 같은 크기라 모두 같은 배율로 키운다: 종끼리 크기 비율은 그대로, 플래티나 뒷모습(2장 그림)과 비슷한 크기 (경완 2026-10-31 '밀탱크 뒷모습 너무 작아')
    /* v21.80 경완 '스프라이트 상하좌우 불필요한 여백·앞뒤 크기 다른 것': gif 의 아래 빈 줄·좌우 치우침만큼 옮기고(SOFF [가로, 아래 빈 줄, 뒷모습 배율]), 앞모습과 크기가 많이 다른 뒷모습은 앞모습 크기에 맞춤 (gym/img/pk/off.json, 기본 폼 그림만) */
    const so = A.gif === gifUrl(A.sp, side === 'p', A.shiny, A.g === 'F') ? SOFF[A.sp]?.[side === 'p' ? 'b' : 'f'] : null, cl = m.querySelector('.clip');
    const k = (side === 'p' ? 1.4 : 1) * (so?.[2] || 1), fw = () => { if (img.naturalWidth) img.style.width = img.naturalWidth * k + 'px'; };
    if (k !== 1) { if (img.complete && img.naturalWidth && img.style.visibility !== 'hidden') fw(); else img.addEventListener('load', fw, { once: true }); }
    if (cl) { cl.style.left = so ? -so[0] * k + 'px' : ''; cl.style.top = so ? so[1] * k + 'px' : ''; }
    if (side === 'p') { const u = A.gif; gifTop(u).then(g => { if (!g || m._gif !== u) return; const y = 144 - (g.h - g.t - (so?.[1] || 0)) * k; if (y < GIF_TOP) m.style.top = (48 + Math.round(GIF_TOP - y)) + 'px'; }); }
    m._gif = A.gif; }
  else if (A) {
    m._gif = null; m.classList.remove('gf'); { const cl = m.querySelector('.clip'); if (cl) cl.style.left = cl.style.top = ''; } const a = anOf(A), sheet = !!a, fm = FMA[A.fm] ? A.fm : ''; img.onerror = () => { img.onerror = null; setSrc(img, pkSrc(A.sp, { b: side === 'p', s: A.shiny })); }; setSrc(img, fm ? `${IMG}pk/${fmDir(fm)}/${fm}${side === 'p' ? 'b' : ''}${A.shiny ? 's' : ''}.png?v=${VER}` : pkSrc(A.sp, { b: side === 'p', s: A.shiny, f: A.g === 'F' })); img.alt = '';
    m.classList.toggle('pl2', sheet); img.style.transform = '';
    const fa = side === 'e' && !fm && (!A.shiny || (BWA.fs || []).includes(+A.sp)) && !rfKey(A.sp) && FA[A.sp], clip = m.querySelector('.clip');
    m._fa = fa ? (Array.isArray(fa) ? { n: fa[0], w: fa[1] } : { n: fa, w: 80 }) : null; m.classList.toggle('fa', !!fa);
    if (clip) clip.style.width = clip.style.height = fa && m._fa.w !== 80 ? m._fa.w + 'px' : '';
    if (fa) { img.onerror = () => { img.onerror = null; m._fa = null; m.classList.remove('fa'); img.style.width = img.style.height = ''; setSrc(img, pkSrc(A.sp, {})); }; setSrc(img, `${IMG}pk/fa/${A.sp}${A.shiny ? 's' : ''}.png?v=${VER}`);   /* v21.76 경완: 이로치 = 색만 입힌 그림 */ img.style.width = m._fa.n * m._fa.w + 'px'; img.style.height = m._fa.w + 'px'; m.classList.add('pl2'); }
    else if (sheet) img.style.width = img.style.height = '';
    if (sheet || fa) { m.style.left = (side === 'e' ? 136 : 40) + 'px'; m.style.top = (side === 'e' ? E_Y + a[0] : P_Y + a[1]) + 'px'; }
    else { m.style.left = m.style.top = ''; }
  }
  // 한 장짜리 그림(650~ 뒷모습 등)은 bw: 고르는 동안 스프라이트는 가만히, 정보 박스만 까딱 (경완 2026-10-28)
  const an = A && !A.gif && anOf(A); m.classList.toggle('bw', !!A && !A.gif && A.sp >= 494 && (side === 'p' || !an || !(an[3] || []).length));
  m.classList.toggle('on', on);
}
// 본가 움직임: [장, 지연(1/30초), x, y], 장이 -2 보다 작으면 그 칸으로 지연 횟수만큼 되돌아가기
function playAnim(side, A) {
  const m = monEl(side);
  if (m._fa && !A.gif) {   // PixelLab 움직이는 그림: 왼쪽부터 칸마다 바꾸며 계속 (칸은 이미 왕복 순서)
    const img = m.querySelector('img'), tok = (m._tok = (m._tok || 0) + 1), { n, w } = m._fa; if (n < 2) return;
    (async () => { for (let f = 0; m._tok === tok && B && !A.fnt && m._fa; f = (f + 1) % n) { img.style.transform = `translateX(${-w * f}px)`; await wait(110); } })();
    return;
  }
  const a = anOf(A); if (!a || A.gif) return;
  const fr = side === 'e' ? a[3] : a[5], st = side === 'e' ? a[2] : a[4], img = m.querySelector('img'), tok = (m._tok = (m._tok || 0) + 1);
  const set = (f, x, y) => { img.style.transform = `translate(${-80 * f + (side === 'p' ? -x : x)}px,${y}px)`; };
  (async () => {
    await wait(st * 1000 / 30); const cnt = {}; let i = 0, g = 0;
    while (i < fr.length && g++ < 80) {
      if (m._tok !== tok) return; const [f, d, x, y] = fr[i];
      if (f < -1) { cnt[i] = cnt[i] ?? d; if (cnt[i]-- > 0) { i = -f - 2; continue; } i++; continue; }
      set(f, x, y); await wait(Math.max(1, d) * 1000 / 30); i++;
    }
    if (m._tok === tok) set(0, 0, 0);
    // 650~ (팬게임 그림)은 블랙·화이트처럼 계속 움직이도록 잠깐 쉬고 다시
    if (A.sp >= 650 && fr.length) { await wait(rnd(900, 1800)); if (m._tok === tok && B && !A.fnt) playAnim(side, A); }
  })();
}
// 볼 던지기 → 펑 → 하얗게 커지며 나타남 (4세대)
async function sendOut(side, A) {
  A.gif = await pickGif(side, A); if (!B) return;
  const m = monEl(side); m.classList.remove('faint', 'on', 'recall', 'fmc', 'sub', 'hid'); showMon(side, A, false); m.classList.add('ball');
  await throwBall(side);
  ballPoof(side); se('BOWA2', { pan: panOf(side) }); m.classList.add('on'); await wait(60);
  m.classList.remove('ball'); await wait(260); try { GA.cry?.(A.sp, 0, 1, CRY_K); } catch (e) {} playAnim(side, A);
  if (A.shiny) await shinyFx(side);   // 색이 다른 포켓몬은 나올 때 반짝반짝 (본가)
  paintHb(side, A); $b(`.bt-hb.${side}`).classList.add('on'); await wait(450);
}
async function shinyFx(side) {
  const m = monEl(side); se('REAPOKE', { pan: panOf(side) });
  for (let i = 0; i < 7; i++) { const k = document.createElement('i'); k.className = 'bt-shn'; k.style.setProperty('--a', (i * 51) + 'deg'); k.style.animationDelay = (i * 60) + 'ms'; m.appendChild(k); setTimeout(() => k.remove(), 1100); }
  await wait(800);
}
// 대타: 인형으로 바뀐다 / 공중날기·구멍파기 등 숨는 기술: 다음 기술까지 사라진다 (본가)
function subFx(s, on) { const m = monEl(s); if (!m) return; let d = m.querySelector('.bt-sub'); if (!d) { d = document.createElement('i'); d.className = 'bt-sub'; m.appendChild(d); } m.classList.toggle('sub', on); }
const HIDE_MV = /^(fly|dig|dive|bounce|phantomforce|shadowforce|skydrop)$/;
function throwBall(side) {
  const fx = $b('.bt-fx'), b = document.createElement('i'); b.className = 'ball'; fx.appendChild(b);
  const [x0, y0, x1, y1] = side === 'e' ? [190, 40, 176, 66] : [40, 120, 80, 112];
  const mid = side === 'e' ? 30 : 70;
  const an = b.animate([{ transform: `translate(${x0}px,${y0}px) rotate(0)` }, { transform: `translate(${(x0 + x1) / 2}px,${mid}px) rotate(360deg)`, offset: .5 }, { transform: `translate(${x1}px,${y1}px) rotate(720deg)` }], { duration: 420, easing: 'linear' });
  return an.finished.catch(() => {}).then(() => b.remove());
}
function ballPoof(side) {
  const fx = $b('.bt-fx'), x = side === 'e' ? 176 : 80, y = side === 'e' ? 66 : 112;
  for (let k = 0; k < 10; k++) { const i = document.createElement('i'); i.className = 'poof'; const a = k / 10 * Math.PI * 2; i.style.left = x + 'px'; i.style.top = y + 'px'; i.style.setProperty('--dx', Math.cos(a) * 30 + 'px'); i.style.setProperty('--dy', Math.sin(a) * 22 + 'px'); fx.appendChild(i); setTimeout(() => i.remove(), 600); }
}
async function recall(side) { const m = monEl(side); se('SUIKOMU', { pan: panOf(side) }); m.classList.add('recall'); await wait(420); m.classList.remove('on', 'recall'); $b(`.bt-hb.${side}`).classList.remove('on'); }
// 쓰러짐: 울음소리 → 발판 아래로 쑥 내려감 (4세대)
async function faint(side, A) {
  // 본가처럼 낮은 울음소리를 다 낸 뒤 쓰러진다 (경완 2026-10-28)
  let d = 0; try { d = await GA.cry?.(A.sp, 0, .8, CRY_K) || 0; } catch (e) {} await wait(B?.fast ? 200 : clampN(d * 1000 - 120, 520, 1400)); vibBig(side === 'p' ? 3 : 2, 2);
  se('POKE_DEAD', { pan: panOf(side) }); monEl(side).classList.add('faint'); await wait(420);
  $b(`.bt-hb.${side}`).classList.remove('on'); if (side === 'p') lowHp(false);
}
async function flash(n = 1) { const f = $b('.bt-flash'); for (let i = 0; i < n; i++) { f.classList.add('on'); await wait(70); f.classList.remove('on'); await wait(70); } }

// ---------- 아래 화면 ----------
function panel(html) { const p = $b('.bt-panel'); p.innerHTML = html; return p; }
function idlePanel() { panel(`<div class="bp-idle"></div>`); el?.classList.remove('idle'); }
function mainPanel(A) {
  el.classList.add('idle');   // 고르는 동안 내 포켓몬·체력 상자가 위아래로 살짝 (본가)
  // 지난 메시지가 남아 있으면 멈춘 것처럼 보인다 (경완 2026-10-28): 본가처럼 대화창에 '무엇을 할까?'
  $b('.bt-msg .t').textContent = `${A.nm}${jong(A.nm) ? '은' : '는'} 무엇을 할까?`; $b('.bt-msg .cur').hidden = true;
  return new Promise(res => {
    const p = panel(`<div class="bp-main">
      <button class="bb fight" data-a="fight"><span>싸우다</span></button>
      <button class="bb bag" data-a="bag"><span>가방</span></button>
      <button class="bb run" data-a="run"><span>${B.practice ? '그만두기' : '기권'}</span></button>
      <button class="bb mon" data-a="mon"><span>포켓몬</span></button>
      ${DBK_ON ? '<button class="bb binfo" data-a="info" aria-label="배틀 정보"><span>정보</span></button>' : ''}
      <p class="bp-q">${esc(A.nm)}${jong(A.nm) ? '은' : '는'} 무엇을 할까?</p></div>`);
    p.onclick = e => { const b = e.target.closest('button[data-a]'); if (!b) return; tapSe(); res(b.dataset.a); };
  });
}
// 상대에게 얼마나 잘 듣는지 (본가 이후 세대의 '효과가 굉장함' 표시처럼)
function effOf(type) {
  const foe = B?.btl.p2.active[0]; if (!foe || foe.fainted) return null;
  const dex = B.btl.dex, T = dex.types.get(type); if (!T?.exists) return null;
  if (!dex.getImmunity(T.name, foe)) return 0;
  return 2 ** dex.getEffectiveness(T.name, foe);
}
const TY_C = ['', '#9fa19f', '#ff8000', '#81b9ef', '#9141cb', '#915121', '#afa981', '#91a119', '#704170', '#60a1b8', '#e62829', '#2980ef', '#3fa129', '#fac000', '#ef4179', '#3dcef3', '#5060e1', '#624d4e', '#ef70ef'];
const TY_EN = ['', 'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
const CAT_KO = ['물리', '특수', '변화'];
// 본가(플래티넘) 타입 꼬리표 + 물리·특수·변화 아이콘. 꼬리표 글자는 한국어로 위에 쓴다
const tyTag = (ty, cat) => `<span class="tg"><i class="ty" style="background-image:url(${IMG}bt/ty_${ty}.png)">${TYPE_KO[ty] || ''}</i>${cat == null ? '' : `<i class="ct" style="background-image:url(${IMG}bt/cat_${cat | 0}.png)" title="${CAT_KO[cat | 0]}"></i>`}</span>`;
const FIX_DMG = new Set(['nightshade', 'seismictoss', 'dragonrage', 'sonicboom', 'superfang', 'psywave', 'endeavor', 'finalgambit', 'ruination', 'naturesmadness', 'guardianofalola', 'counter', 'mirrorcoat', 'metalburst', 'comeuppance', 'bide', 'fissure', 'guillotine', 'horndrill', 'sheercold']);
function effTag(d) {
  if (!d || d[3] === 2) return '';
  let e = effOf(TY_EN[d[2]]); if (e == null) return '';
  if (e && FIX_DMG.has(d[0])) e = 1;   // v14.95 경완: 레벨·HP 만큼 고정 데미지(나이트헤드 등)·일격필살은 상성이 위력에 안 들어감 → 효과 없음만 보여 주고 나머진 '효과 있음'
  return e === 0 ? '<i class="eff no">효과 없음</i>' : e > 1 ? '<i class="eff hi">효과 굉장!</i>' : e < 1 ? '<i class="eff lo">효과 별로</i>' : '<i class="eff">효과 있음</i>';
}
// 배틀 기술 박스 한 칸 (기술 고르기·잊을 기술 고르기·교체 카드 같은 모양, 우상단 ? = 기술 설명)
const mvBox = (i, d, pp, maxpp, dis, eff = true) => { const ty = d[2] || 1; return `<div class="mvw"><button class="mvb" data-i="${i}" style="background-image:url(${IMG}bt/mv_${ty}.png);--tc:${TY_C[ty]}" ${dis ? 'disabled' : ''}><b>${esc(d[1])}</b><span class="pw">위력 <em>${d[4] || '—'}</em> 명중 <em>${d[5] && d[5] !== true ? d[5] : '—'}</em></span>${eff ? effTag(d) : ''}${tyTag(ty, d[3])}${pp == null ? '' : `<span class="pp">PP <em>${pp}/${maxpp}</em></span>`}</button><button class="mvi" data-info="${i}" aria-label="기술 설명">?</button></div>`; };
// v21.89 [DBK] 기믹: 쓸 수 있으면 기술 칸 아래 버튼 (누르면 켜짐, 기술을 고르면 그 기술로 메가진화·Z기술·다이맥스·테라스탈)
const GK_NM = { mega: '메가진화', zmove: 'Z기술', dynamax: '다이맥스', terastallize: '테라스탈' };
function gkOpts(R) { const G = B?.gmk || {}, o = [];
  if (G.mega && (R.canMegaEvo || R.canMegaEvoX || R.canMegaEvoY)) o.push(R.canMegaEvoX ? 'megax' : R.canMegaEvoY ? 'megay' : 'mega');
  if (G.z && R.canZMove) o.push('zmove'); if (G.dmax && R.canDynamax) o.push('dynamax'); if (G.tera && R.canTerastallize) o.push('terastallize'); return o; }
// 기믹이 켜졌을 때 기술 칸: Z기술·다이맥스 기술 이름·위력으로
function gkMove(R, i, m, d, gk) {
  const bm = PSim.Dex.moves.get(m.id), dx = R.maxMoves && (gk === 'dynamax' || !R.canDynamax) ? R.maxMoves.maxMoves?.[i] : null;
  if (gk === 'zmove') { const z = R.canZMove?.[i]; if (!z) return [d, true]; const zid = toID(z.move), zm = PSim.Dex.moves.get(zid); return [[zid, bm.category === 'Status' ? 'Z' + d[1] : mvKo(zid), d[2], d[3], bm.category === 'Status' ? 0 : bm.zMove?.basePower || zm.basePower || d[4], '—', ...d.slice(6)], false]; }
  if (dx) { const mid = toID(dx.move), mm = PSim.Dex.moves.get(mid); return [[mid, mvKo(mid), mid === 'maxguard' ? 1 : d[2], mid === 'maxguard' ? 2 : d[3], mid === 'maxguard' ? 0 : bm.maxMove?.basePower || mm.basePower || d[4], '—', ...d.slice(6)], !!dx.disabled]; }
  return [d, false]; }
function movePanel(req) {
  return new Promise(res => {
    const R = req.active[0], mv = R.moves, go = gkOpts(R), gk = go.includes(B.gkSel) ? B.gkSel : null; if (!gk) B.gkSel = null;
    const tera = R.canTerastallize && TYK[R.canTerastallize] || '', gmx = R.maxMoves?.gigantamax && !R.maxMoves.maxMoves?.every(x => !/^gmax/.test(toID(x.move)));
    const gkNm = k => k === 'megax' ? '메가진화 X' : k === 'megay' ? '메가진화 Y' : k === 'dynamax' && gmx ? '거다이맥스' : GK_NM[k];
    const p = panel(`<div class="bp-moves${go.length ? ' gk' : ''}">${[0, 1, 2, 3].map(i => { const m = mv[i]; if (!m) return `<i class="mvb empty"></i>`; const d0 = mvOf(m.id) || ['', m.move, 1, 0], [d, zx] = gkMove(R, i, m, d0, gk);
      return mvBox(i, d, m.pp, m.maxpp, m.disabled || m.pp <= 0 || zx); }).join('')}
      ${go.length ? `<div class="gk-row">${go.map(k => `<button class="bb gkb ${k.replace(/^mega[xy]$/, 'mega')}${gk === k ? ' on' : ''}" data-gk="${k}"><span>${gkNm(k)}</span>${k === 'terastallize' && tera ? `<small>${tera} 타입</small>` : ''}</button>`).join('')}<button class="bb cancel" data-x><span>취소</span></button></div>` : '<button class="bb cancel" data-x><span>취소</span></button>'}</div>`);
    p.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return; tapSe();
      if (b.hasAttribute('data-x')) { B.gkSel = null; return res(null); }
      if (b.dataset.gk) { B.gkSel = B.gkSel === b.dataset.gk ? null : b.dataset.gk; vib(1); return movePanel(req).then(res); }
      if (b.dataset.info) return moveInfo(mv[+b.dataset.info]).then(() => movePanel(req).then(res));
      res(+b.dataset.i);
    };
  });
}
// 기술 설명: 타입·분류·위력·명중·PP·설명 (아래 화면)
/* v21.89 [DBK] Enhanced Battle UI '배틀러 정보': 싸우기 메뉴의 정보 버튼 → 지금 나와 있는 포켓몬(내 쪽·상대)의 레벨·타입·테라·능력 변화(▲▼)·급소·특성/도구(내 포켓몬만)·마지막 기술·턴·걸린 효과와 남은 턴. ◀▶로 넘김 */
const BI_FX = { sunnyday: ['쾌청', '불꽃 기술 위력 1.5배, 물 기술 위력 반감.'], desolateland: ['아주 강한 햇살', '불꽃 기술 위력 1.5배, 물 기술이 사라진다.'], raindance: ['비', '물 기술 위력 1.5배, 불꽃 기술 위력 반감.'], primordialsea: ['강한 비', '물 기술 위력 1.5배, 불꽃 기술이 사라진다.'], sandstorm: ['모래바람', '매 턴 HP가 줄 수 있다. 바위 타입 특수방어 1.5배.'], hail: ['싸라기눈', '매 턴 HP가 줄 수 있다. 눈보라가 반드시 맞는다.'], snow: ['설경', '얼음 타입 방어 1.5배. 눈보라가 반드시 맞는다.'], deltastream: ['난기류', '비행 타입의 약점이 없어진다.'],
  electricterrain: ['일렉트릭필드', '땅에 있는 포켓몬은 잠들지 않는다. 전기 기술 위력 1.3배.'], grassyterrain: ['그래스필드', '땅에 있는 포켓몬은 매 턴 HP가 조금 회복된다. 풀 기술 위력 1.3배.'], mistyterrain: ['미스트필드', '땅에 있는 포켓몬은 상태 이상이 되지 않는다. 드래곤 기술 위력 반감.'], psychicterrain: ['사이코필드', '땅에 있는 포켓몬은 선공기를 받지 않는다. 에스퍼 기술 위력 1.3배.'],
  trickroom: ['트릭룸', '느린 포켓몬부터 먼저 움직인다.'], gravity: ['중력', '모두 땅에 붙고 명중률이 오른다.'], magicroom: ['매직룸', '모두 지닌 도구를 쓸 수 없다.'], wonderroom: ['원더룸', '모두 방어와 특수방어가 바뀐다.'], mudsport: ['흙놀이', '전기 기술의 데미지가 줄어든다.'], watersport: ['물놀이', '불꽃 기술의 데미지가 줄어든다.'], iondeluge: ['플라스마샤워', '노말 기술이 전기 타입이 된다.'], fairylock: ['페어리록', '아무도 도망칠 수 없다.'],
  reflect: ['리플렉터', '물리 기술 데미지가 줄어든다.'], lightscreen: ['빛의장막', '특수 기술 데미지가 줄어든다.'], auroraveil: ['오로라베일', '모든 공격 데미지가 줄어든다.'], tailwind: ['순풍', '이쪽 포켓몬의 스피드가 2배.'], safeguard: ['신비의부적', '상태 이상이 되지 않는다.'], mist: ['흰안개', '능력이 떨어지지 않는다.'], luckychant: ['주술', '급소에 맞지 않는다.'],
  stealthrock: ['스텔스록', '나올 때 바위 타입 데미지를 받는다.'], spikes: ['압정뿌리기', '땅에 있는 포켓몬이 나올 때 HP가 준다.'], toxicspikes: ['독압정', '땅에 있는 포켓몬이 나올 때 독이 된다.'], stickyweb: ['끈적끈적네트', '땅에 있는 포켓몬이 나올 때 스피드가 떨어진다.'], gmaxsteelsurge: ['강철 가시', '나올 때 강철 타입 데미지를 받는다.'],
  gmaxvinelash: ['거다이편달', '매 턴 HP가 준다. 풀 타입은 괜찮다.'], gmaxwildfire: ['거다이전화', '매 턴 HP가 준다. 불꽃 타입은 괜찮다.'], gmaxcannonade: ['거다이포격', '매 턴 HP가 준다. 물 타입은 괜찮다.'], gmaxvolcalith: ['거다이분석', '매 턴 HP가 준다. 바위 타입은 괜찮다.'], firepledge: ['불바다', '매 턴 HP가 준다. 불꽃 타입은 괜찮다.'], waterpledge: ['무지개', '기술의 추가 효과가 잘 나온다.'], grasspledge: ['습원', '스피드가 반으로 줄어든다.'],
  quickguard: ['퍼스트가드', '선공기를 막는다.'], wideguard: ['와이드가드', '여럿을 공격하는 기술을 막는다.'], craftyshield: ['트릭가드', '변화 기술을 막는다.'], matblock: ['마룻바닥세워막기', '공격 기술을 막는다.'],
  futuremove: ['미래 공격', '몇 턴 뒤 이 자리에 공격이 온다.'], wish: ['희망사항', '다음 턴 이 자리의 포켓몬 HP가 회복된다.'], healingwish: ['치유소원', '이 자리에 나오는 포켓몬이 다 회복된다.'], lunardance: ['초승달춤', '이 자리에 나오는 포켓몬이 다 회복된다.'],
  substitute: ['대타출동', '분신이 대신 공격을 받는다.'], aquaring: ['아쿠아링', '매 턴 HP가 조금 회복된다.'], ingrain: ['뿌리박기', '매 턴 HP가 회복되지만 교체할 수 없다.'], leechseed: ['씨뿌리기', '매 턴 HP를 빼앗긴다.'], curse: ['저주', '매 턴 HP가 크게 준다.'], nightmare: ['악몽', '잠든 동안 매 턴 HP가 준다.'], saltcure: ['소금절이', '매 턴 HP가 준다. 강철·물 타입은 더 많이.'], healblock: ['회복봉인', 'HP를 회복할 수 없다.'], attract: ['헤롱헤롱', '사랑에 빠져 기술을 못 쓸 때가 있다.'], confusion: ['혼란', '스스로를 공격할 때가 있다.'], lockedmove: ['난동', '몇 턴 날뛴 뒤 혼란에 빠진다.'],
  torment: ['트집', '같은 기술을 연달아 쓸 수 없다.'], throatchop: ['지옥찌르기', '소리 기술을 쓸 수 없다.'], encore: ['앵콜', '같은 기술만 쓸 수 있다.'], disable: ['사슬묶기', '기술 하나를 쓸 수 없다.'], taunt: ['도발', '변화 기술을 쓸 수 없다.'], embargo: ['금제', '도구를 쓸 수 없다.'], charge: ['충전', '다음 전기 기술 위력이 2배.'], electrify: ['송전', '다음 기술이 전기 타입이 된다.'], magnetrise: ['전자부유', '떠 있어서 땅 기술을 받지 않는다.'], powder: ['분진', '불꽃 기술을 쓰면 폭발한다.'], tarshot: ['타르샷', '불꽃 기술에 약해졌다.'], smackdown: ['떨어뜨리기', '땅에 떨어져 땅 기술을 받는다.'], foresight: ['꿰뚫어보기', '회피율 변화가 무시된다.'], miracleeye: ['미라클아이', '회피율 변화가 무시된다.'], rage: ['분노', '공격을 받으면 공격이 오른다.'], helpinghand: ['도우미', '다음 기술 위력이 오른다.'], powertrick: ['파워트릭', '공격과 방어가 바뀌었다.'], laserfocus: ['일점집중', '다음 공격이 반드시 급소에 맞는다.'], stockpile: ['비축하기', '힘을 모으고 있다.'], minimize: ['작아지기', '몇몇 기술에 더 큰 데미지를 받는다.'], telekinesis: ['텔레키네시스', '떠 있지만 공격을 피할 수 없다.'], lockon: ['록온', '다음 기술이 반드시 맞는다.'], syrupbomb: ['물엿범벅', '매 턴 스피드가 떨어진다.'], noretreat: ['배수의진', '도망치거나 교체할 수 없다.'], partiallytrapped: ['묶임', '갇혀서 매 턴 HP가 준다.'], trapped: ['도망칠 수 없음', '교체할 수 없다.'], octolock: ['문어굳히기', '교체할 수 없고 매 턴 방어·특수방어가 떨어진다.'], jawlock: ['엉겨붙기', '서로 교체할 수 없다.'],
  magiccoat: ['매직코트', '변화 기술을 튕겨낸다.'], protect: ['방어', '공격을 막는다.'], banefulbunker: ['토치카', '공격을 막고, 닿으면 독.'], spikyshield: ['니들가드', '공격을 막고, 닿으면 데미지.'], kingsshield: ['킹실드', '공격을 막고, 닿으면 공격이 떨어진다.'], obstruct: ['블로킹', '공격을 막고, 닿으면 방어가 떨어진다.'], silktrap: ['실크트랩', '공격을 막고, 닿으면 스피드가 떨어진다.'], burningbulwark: ['불타는철벽', '공격을 막고, 닿으면 화상.'], endure: ['버티기', '이번 턴 HP 1로 버틴다.'], twoturnmove: ['기 모으기', '다음 턴에 기술을 쓴다.'], mustrecharge: ['반동', '이번 턴은 움직일 수 없다.'], yawn: ['하품', '다음 턴에 잠든다.'], perishsong: ['멸망의노래', '카운트가 0이 되면 쓰러진다.'], slowstart: ['슬로스타트', '공격과 스피드가 반으로 줄어든다.'], uproar: ['소란', '아무도 잠들 수 없다.'], imprison: ['봉인', '상대가 같은 기술을 쓸 수 없다.'], gastroacid: ['특성 없음', '특성이 사라졌다.'], glaiverush: ['무방비', '공격을 피할 수 없고 데미지 2배.'], destinybond: ['길동무', '쓰러뜨린 상대도 함께 쓰러진다.'], grudge: ['원한', '쓰러뜨린 기술의 PP가 0이 된다.'], flashfire: ['타오르는불꽃', '불꽃 기술 위력이 오른다.'], focusenergy: ['기충전', '급소에 맞기 쉬워졌다.'] };
const BI_ST = [['atk', '공격'], ['def', '방어'], ['spa', '특수공격'], ['spd', '특수방어'], ['spe', '스피드'], ['accuracy', '명중률'], ['evasion', '회피율']];
function biFx(pk) {
  const btl = B.btl, f = btl.field, sd = pk.side, L = [], t = s => s && s.duration ? `남은 ${s.duration}턴` : '—', add = (id, tk, nm) => { const x = BI_FX[id]; if (x) L.push([nm || x[0], tk, x[1]]); };
  if (pk.species.isMega) L.push(['메가진화', '—', '메가진화한 모습이다.']); if (pk.species.isPrimal) L.push(['원시회귀', '—', '원시의 모습이다.']);
  if (pk.volatiles.dynamax) L.push([pk.gigantamax ? '거다이맥스' : '다이맥스', t(pk.volatiles.dynamax), 'HP가 2배이고 다이맥스 기술을 쓴다.']);
  if (pk.terastallized) L.push(['테라스탈', '—', `${TYK[pk.terastallized] || pk.terastallized} 타입으로 테라스탈했다.`]);
  if (pk.status === 'tox') L.push(['맹독', '—', '독 데미지가 매 턴 커진다.']);
  if (f.weather) add(f.weather, t(f.weatherState)); if (f.terrain) add(f.terrain, t(f.terrainState));
  for (const id in f.pseudoWeather) add(id, t(f.pseudoWeather[id]));
  for (const id in sd.sideConditions) { const s = sd.sideConditions[id]; add(id, s.layers > 1 ? `${s.layers}층` : s.duration ? t(s) : '—'); }
  const sl = sd.slotConditions?.[pk.position] || {}; for (const id in sl) add(id, t(sl[id]));
  for (const id in pk.volatiles) { if (id === 'dynamax') continue; const v = pk.volatiles[id];
    if (id === 'encore' || id === 'disable') { const m = v.move; add(id, t(v), `${BI_FX[id][0]}: ${mvKo(m || '')}`); continue; }
    if (id === 'stockpile') { add(id, `${v.layers || 1}번`); continue; } if (id === 'perishsong') { add(id, `카운트 ${v.duration}`); continue; }
    add(id, v.duration ? t(v) : '—'); }
  return L; }
function battlerInfo() {
  const btl = B.btl, L = [btl.p1.active[0], btl.p2.active[0]].filter(p => p && !p.fainted); let i = 0;
  return new Promise(res => { const draw = () => { const pk = L[i], mine = pk.side === btl.p1, X = B.act?.[mine ? 'p' : 'e'];
    const nm = pk.name, base = pk.terastallized ? (pk.species.types) : pk.getTypes(), nat = mine ? btl.dex.natures.get(pk.set?.nature || '') : null;
    const crit = Math.min(3, (pk.volatiles.focusenergy ? 2 : 0) + (pk.volatiles.laserfocus ? 3 : 0) + (pk.volatiles.dragoncheer ? 1 : 0));
    const row = ([k, n]) => { const s = k === 'crit' ? crit : pk.boosts[k] | 0, c = nat?.plus === k ? ' np' : nat?.minus === k ? ' nm' : '';
      return `<li><span class="bi-sn${c}">${n}</span><b class="${s > 0 ? 'up' : s < 0 ? 'dn' : ''}">${s ? (s > 0 ? '▲' : '▼').repeat(Math.abs(s)) : '—'}</b></li>`; };
    const fx = biFx(pk), lm = pk.lastMove ? mvKo(pk.lastMove.id) : '—', hp = mine ? `${pk.hp}/${pk.maxhp}` : `${Math.ceil(pk.hp / pk.maxhp * 100)}%`, hr = pk.hp / pk.maxhp;
    const it = pk.item ? itKo(btl.dex.items.get(pk.item).name) : '없음';
    panel(`<div class="bp-binfo"><div class="bi-hd"><button class="bb bi-arr" data-d="-1" aria-label="이전"><span>◀</span></button>
      <div class="bi-nm"><small>${mine ? '내 포켓몬' : esc(B.foeNm || '상대')}</small><b>${esc(nm)} <em>Lv.${pk.level}</em></b><span class="bi-ty">${base.map(ty => tyTag(TY_EN.indexOf(ty))).join('')}${pk.terastallized ? `<i class="bi-tera">테라 ${TYK[pk.terastallized] || ''}</i>` : ''}</span></div>
      <button class="bb bi-arr" data-d="1" aria-label="다음"><span>▶</span></button></div>
      <div class="bi-hp"><i style="width:${Math.max(1, hr * 100)}%;background:${hr > .5 ? '#3ec84a' : hr > .25 ? '#f0c030' : '#e84838'}"></i><span>${hp}</span><small>${btl.turn}턴째</small></div>
      <div class="bi-body"><ul class="bi-st">${[...BI_ST, ['crit', '급소']].map(row).join('')}</ul>
        <dl class="bi-dl">${mine ? `<dt>특성</dt><dd>${esc(abKo(pk.ability))}</dd><dt>도구</dt><dd>${esc(it)}</dd>` : ''}<dt>마지막 기술</dt><dd>${esc(lm)}</dd></dl></div>
      <ul class="bi-fx">${fx.length ? fx.map(([n, tk, d]) => `<li><b>${esc(n)}</b><em>${esc(tk)}</em><p>${esc(d)}</p></li>`).join('') : '<li class="none">걸린 효과가 없다</li>'}</ul>
      <button class="bb cancel" data-x><span>돌아가기</span></button></div>`).onclick = e => { const b = e.target.closest('button'); if (!b) return; tapSe(); if (b.dataset.d) { i = (i + +b.dataset.d + L.length) % L.length; draw(); } else res(); }; };
    draw(); });
}
function moveInfo(m) {
  return new Promise(res => {
    const d = mvOf(m.id) || ['', m.move, 1, 0, 0, 0, m.maxpp, 0, '']; const ty = d[2] || 1;
    const p = panel(`<div class="bp-info"><div class="mi-top" style="background-image:url(${IMG}bt/mv_${ty}.png);--tc:${TY_C[ty]}"><b>${esc(d[1])}</b></div>
      <dl><dt>타입</dt><dd>${tyTag(ty)}</dd><dt>분류</dt><dd>${tyTag(ty, d[3]).replace(/<i class="ty"[^]*?<\/i>/, '')} ${CAT_KO[d[3] | 0]}</dd>
      <dt>위력</dt><dd>${d[4] || '—'}</dd><dt>명중</dt><dd>${d[5] && d[5] !== true ? d[5] : '—'}</dd><dt>PP</dt><dd>${m.pp}/${m.maxpp}</dd><dt>효과</dt><dd>${effTag(d).replace(/<\/?i[^>]*>/g, '') || '—'}</dd></dl>
      <p>${esc(d[8] || '')}</p><button class="bb cancel" data-x><span>돌아가기</span></button></div>`);
    p.onclick = e => { const b = e.target.closest('button'); if (!b) return; tapSe(); res(); };
  });
}
// 쇼다운은 교체할 때마다 side.pokemon 순서를 바꾼다: 지금 i번째 → 처음 순서(B.my) 번호. 울부짖기·날려버리기로 바뀐 뒤 이름·그림이 어긋나 원래 포켓몬이 '나와 있음'으로 잠겼다 (경완 2026-10-28)
const myIx = i => { const P = B.btl.p1.pokemon[i], j = B.o.p.indexOf(P); return j >= 0 ? j : i; };
function partyPanel(req, forced) {
  return new Promise(res => {
    const L = req.side.pokemon, sx = g => g === 'M' || g === 'F' ? `<i class="sx ${g}"></i>` : '';
    const hpOfM = m => { const [hp, mhp] = (m.condition.split(' ')[0] || '0/0').split('/').map(Number); return [hp, mhp, mhp ? hp / mhp : 0, /fnt/.test(m.condition)]; };
    const tys = A => (SPECIES[A.tsp || A.sp]?.t || []).map(t => tyI(t)).join('');
    // 포켓몬 버튼: 정사각형 프로필 + 이름·성별 + 타입 (경완 2026-10-29)
    const list = () => { const p = panel(`<div class="bp-party">${L.map((m, i) => { const [hp, mhp, r, fnt] = hpOfM(m), A = B.my[myIx(i)];
      return `<button class="pty${m.active ? ' act' : ''}${fnt ? ' fnt' : ''}" data-i="${i}">${boxOf(A.pid) ? thumb(boxOf(A.pid)) : ''}<b>${esc(A.nm)}${sx(A.g)}</b><span class="pty-ty">${tys(A)}<span class="lv">Lv${A.lv}</span></span><i class="hp"><i class="${hpCol(r)}" style="width:${r * 100}%"></i></i><span class="hpn">${fnt ? '기절' : `${hp}/${mhp}`}</span></button>`; }).join('')}
      ${forced ? '' : '<button class="bb cancel" data-x><span>취소</span></button>'}</div>`); fillTh(p);
      p.onclick = e => { const b = e.target.closest('button'); if (!b) return; tapSe(); if (b.hasAttribute('data-x')) return res(null); card(+b.dataset.i); }; };
    // 누르면 바로 바뀌지 않고 상세 카드 → '바꾸기' (경완 2026-10-29)
    const card = i => { const m = L[i], A = B.my[myIx(i)], P = boxOf(A.pid), [hp, mhp, r, fnt] = hpOfM(m), can = !m.active && !fnt;
      const sl = B.btl.p1.pokemon[i]?.moveSlots || [], mv = (m.moves || A.mv || []).map(id => { const d = mvOf(toID(id)); if (!d) return null; const s0 = sl.find(x => x.id === toID(id)); return { d, id: toID(id), move: d[1], pp: s0?.pp ?? d[6], maxpp: s0?.maxpp ?? d[6] }; }).filter(Boolean);   // 기술마다 위력·명중·PP, 누르면 기술 설명 (v12.20 경완)
      const p = panel(`<div class="bp-card"><div class="bc-hd">${P ? thumb(P) : ''}<div class="bc-tx"><b>${esc(A.nm)}${sx(A.g)}</b><span class="bc-lv">Lv.${A.lv}<span class="pty-ty">${tys(A)}</span></span><i class="hp"><i class="${hpCol(r)}" style="width:${r * 100}%"></i></i><span class="hpn">${fnt ? '기절' : `HP ${hp}/${mhp}`}</span></div></div>
        <p class="bc-ab"><small>특성</small><b>${esc(abKo(A.ab))}</b>${A.it && HOLD[A.it] ? `<small>도구</small><img class="bc-it" alt="" src="${itImg(A.it)}">${esc(HOLD[A.it][0])}` : ''}${AB_D[A.ab] ? `<span class="bc-abd">${esc(AB_D[A.ab])}</span>` : ''}</p>
        <div class="bc-mv">${mv.map((x, k) => mvBox(k, x.d, x.pp, x.maxpp, false)).join('')}</div>
        <div class="bc-btns"><button class="bb cancel" data-x><span>뒤로</span></button><button class="bb go" data-go ${can ? '' : 'disabled'}><span>${m.active ? '나와 있음' : fnt ? '기절' : '바꾸기'}</span></button></div></div>`); fillTh(p);
      p.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; tapSe(); if (b.dataset.i != null || b.dataset.info) return moveInfo(mv[+(b.dataset.info ?? b.dataset.i)]).then(() => card(i)); if (b.hasAttribute('data-x')) return list(); if (b.hasAttribute('data-go')) { panel(''); res(i); } }; };   // 바꾸기를 누르면 아래 화면 포켓몬 정보는 닫는다 (v12.24 경완)
    list();
  });
}
function yesNo(q) {
  return new Promise(res => { const p = panel(`<div class="bp-yn"><p>${q}</p><button class="bb yes" data-a="1"><span>네</span></button><button class="bb no" data-a="0"><span>아니요</span></button></div>`);
    p.onclick = e => { const b = e.target.closest('button[data-a]'); if (!b) return; tapSe(); res(b.dataset.a === '1'); }; });
}

// ---------- 쇼다운 세트 ----------
const toID = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function psSet(o) {
  const dx = PSim.Dex, sp = dx.species.get(o.fm || D.sp[o.sp]?.id || String(o.sp));
  const iv = o.iv || [20, 20, 20, 20, 20, 20];
  let ab = o.ab; if (o.fm) { const b0 = dx.species.get(D.sp[o.sp]?.id || String(o.sp)), k = Object.keys(b0.abilities || {}).find(k => toID(b0.abilities[k]) === toID(ab)); if (k && sp.abilities) ab = toID(sp.abilities[k] || sp.abilities[0]); }  if (o.fmAb) ab = o.fmAb;   // v16.91 퍼펙트폼 = 50% 지가르데 + 스웜체인지 (반 이하면 퍼펙트로)   // 영물폼은 특성도 그 칸의 영물폼 특성
  return { name: o.nm, species: sp.name, level: o.lv, moves: o.mv, ability: ab, nature: dx.natures.get(o.nat || 'hardy').name, item: o.fmIt ? dx.items.get(o.fmIt).name : o.it && (HOLD[o.it] || dx.items.get(o.it).megaStone || dx.items.get(o.it).zMove) ? dx.items.get(o.it).name : '', ...(o.tera ? { teraType: o.tera } : {}), ...(o.gmax ? { gigantamax: true } : {}),   /* v21.89 메가스톤·Z크리스탈·테라 타입·거다이맥스 */
    gender: o.g === 'M' || o.g === 'F' ? o.g : '', shiny: !!o.shiny,
    ivs: { hp: iv[0], atk: iv[1], def: iv[2], spa: iv[3], spd: iv[4], spe: iv[5] }, evs: o.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } };
}
function myEntry(P) { const m = gm(P); return { pid: P.id, sp: P.sp, nm: nmOf(P), lv: m.lv, mv: m.mv, ab: m.ab, nat: m.nat, it: m.it, iv: P.iv, evs: evSet(m), fr: P.fr || 0, g: P.sex === 'f' ? 'F' : P.sex === 'm' ? 'M' : '', shiny: !!P.shiny, ...((b = BFM[P.sp]?.[P.fm ?? ''] ?? BFM[P.sp]?.['']) => b ? Array.isArray(b) ? { fm: b[0], fmIt: b[1], fmAb: b[2] } : { fm: b } : {})() }; }
// 상대 포켓몬: 그 레벨에 배우는 기술 중 무작위 4개
function foeEntry(sp, lv, tier = 0) {
  const r = Math.random, ab = D.sp[sp]?.ab || ['noability'], nats = NATS(), g = SPECIES[sp]?.g;
  const sex = /수컷만|♂만/.test(g || '') ? 'M' : /암컷만|♀만/.test(g || '') ? 'F' : Math.random() < .5 ? 'M' : 'F';
  return { sp, nm: SPECIES[sp]?.n || String(sp), lv, mv: tier ? smartMoves(sp, lv, tier, r) : pickMoves(sp, lv, r), ab: Math.random() < HA_RATE && D.sp[sp]?.h ? D.sp[sp].h : abNorm(sp)[Math.floor(r() * Math.min(2, abNorm(sp).length))], nat: pick(nats), iv: Array.from({ length: 6 }, () => Math.floor(rnd(8, 26))), g: sex, shiny: Math.random() < 1 / 4096 };
}

// ---------- AI (난이도: 0 쉬움 1 보통 2 어려움) ----------
// v21.89 상대 기믹 (DBK 트레이너처럼): 메가진화는 바로, 다이맥스·테라스탈은 마지막 남은 포켓몬(에이스)이나 위기 때, Z기술은 그 Z기술로 크게 때릴 수 있을 때
/* v21.89 DBK Improved Item AI 이식: 상대 트레이너가 가방 도구(상처약·회복약·기력의조각·플러스파워 등)를 언제 쓸지 점수로 고름.
   본가 플러그인 [DBK_007] 그대로: 기본 100점, 쓸모없음 60·실패 20, 실력(쉬움 16·보통 48·어려움 100)에 따라 문턱 0.6+0.35√(실력/100) 아래는 버리고, 남은 점수 비율로 뽑기. 도구를 쓰면 그 턴은 기술 대신 도구 */
const IT_AI = { potion: ['상처약', 'hp', 20, 'Potion'], superpotion: ['좋은상처약', 'hp', 60, 'Super Potion'], hyperpotion: ['고급상처약', 'hp', 120, 'Hyper Potion'], maxpotion: ['풀회복약', 'hp', 999, 'Max Potion'],
  fullrestore: ['회복약', 'fr', 999, 'Full Restore'], fullheal: ['만병통치제', 'cure', 0, 'Full Heal'], revive: ['기력의조각', 'rev', 5, 'Revive'], maxrevive: ['기력의덩어리', 'rev', 7, 'Max Revive'],
  xattack: ['플러스파워', 'x', 'atk', 'X Attack'], xdefense: ['디펜드업', 'x', 'def', 'X Defense'], xspatk: ['스페셜업', 'x', 'spa', 'X Sp. Atk'], xspdef: ['스페셜가드', 'x', 'spd', 'X Sp. Def'], xspeed: ['스피드업', 'x', 'spe', 'X Speed'], xaccuracy: ['잘-맞히기', 'x', 'accuracy', 'X Accuracy'] };
const FOE_BAG_ON = [[], ['superpotion'], ['hyperpotion', 'hyperpotion', 'fullheal']], FOE_BAG = [[], [], []];   /* 기본 가방은 경완 확인 뒤 FOE_BAG_ON 으로 */   // 도전자 실력별 기본 가방 (opts.foe.bag 으로 따로 줄 수 있음)
function aiItem(btl) {
  const bag = B?.bag; if (!bag?.length) return null;
  const side = btl.p2, me = side.active[0], foe = btl.p1.active[0], R = side.activeRequest;
  if (!me || me.fainted || !R || R.forceSwitch || R.wait || R.teamPreview) return null;
  if (me.getLockedMove?.() || me.volatiles.mustrecharge || me.volatiles.twoturnmove || me.volatiles.commanding) return null;
  const d = B.diff | 0, sk = d <= 0 ? 16 : d === 1 ? 48 : 100, med = sk >= 32, high = sk >= 48, hpAw = med, dex = btl.dex;
  const FAIL = 20, USELESS = 60, BASE = 100;
  const abil = p => p.ability, mvs = p => p.moveSlots.map(m => dex.moves.get(m.id));
  const eor = p => { let n = 0, h = p.maxhp; if (p.status === 'brn') n += h / 16; if (p.status === 'psn') n += h / 8; if (p.status === 'tox') n += h * ((p.statusState?.stage | 0) + 1) / 16; if (p.volatiles.leechseed) n += h / 8; if (abil(p) === 'magicguard') n = 0; if (abil(p) === 'poisonheal' && /psn|tox/.test(p.status)) n = 0; return n; };
  const pf = eor(me) >= me.hp;
  const nonAct = side.pokemon.filter(p => !p.fainted && !p.isActive).length, ableN = side.pokemon.filter(p => !p.fainted).length;
  const wantsSt = (p, st) => ['guts', 'marvelscale', 'quickfeet'].includes(abil(p)) || (/psn|tox/.test(st) && ['poisonheal', 'toxicboost'].includes(abil(p))) || (st === 'brn' && abil(p) === 'flareboost') || mvs(p).some(m => m.id === 'facade');
  const ITEM_CURES = { slp: 'chestoberry', psn: 'pechaberry', tox: 'pechaberry', par: 'cheriberry', brn: 'rawstberry', frz: 'aspearberry' };
  const stSc = p => { const st = p.status; if (!st) return USELESS; const act = p.isActive; let s = BASE;
    if (st === 'slp' && act && (p.statusState?.time | 0) <= 1) return USELESS;   // 곧 깰 잠은 그냥 둠 (statusCount<=2)
    if (wantsSt(p, st) || p.item === ITEM_CURES[st] || p.item === 'lumberry') return USELESS;
    if (!act) return s + 20;
    s += st === 'slp' || st === 'frz' ? 15 : 10;
    if (hpAw && /psn|tox|brn/.test(st) && p.hp < p.maxhp / 2) s += 10;
    if (eor(p) >= p.hp) s += 8;
    if (med) { if (st === 'tox') s += 8 * (p.statusState?.stage | 0); if (['naturalcure', 'shedskin'].includes(abil(p))) s -= 8; if (abil(p) === 'hydration' && /rain/.test(btl.field.weather)) s -= 20;
      if (st === 'brn' && mvs(p).some(m => m.category === 'Physical')) s += 10; if (st === 'par' && foe && p.getStat('spe') * 2 > foe.getStat('spe')) s += 10;
      if (mvs(p).some(m => ['rest', 'refresh', 'healbell', 'aromatherapy', 'psychoshift'].includes(m.id))) s -= 30; }
    return s; };
  const hpSc = (p, heal) => { if (p.fainted || p.hp >= p.maxhp) return FAIL; let s = BASE; if (heal >= 999) { s -= 5; heal = p.maxhp - 1; }
    if (p.hp > p.maxhp * .55) return USELESS; if (p.isActive && pf) s += 20;
    if (hpAw) { const H = p.maxhp; s += Math.floor(20 * (H - p.hp) / H) + Math.floor(20 * Math.min(heal, H - p.hp) / H) + (p.hp <= H / 2 ? 5 : 0) + (p.hp <= H / 4 ? 5 : 0);
      if (med) { if (ableN === 1) s += 10; const M = mvs(p).map(m => m.id); if (M.some(m => ['eruption', 'waterspout', 'dragonenergy', 'finalgambit'].includes(m))) s += 15; if (M.some(m => ['flail', 'reversal', 'endeavor'].includes(m))) s -= 15;
        const hh = p.hp + heal; if (hh >= H) { if (p.item === 'focussash' || ['sturdy', 'multiscale', 'shadowshield'].includes(abil(p))) s += 8; } else if (p.hp < H / 2 && hh > H / 2 && ['defeatist', 'berserk', 'angershell'].includes(abil(p))) s += 8; } }
    return s; };
  const cureSc = p => { if (!p.status && !(p.isActive && p.volatiles.confusion)) return USELESS; let s = BASE; if (p.status) s += stSc(p) - BASE; if (p.isActive && p.volatiles.confusion) s += 20; return s; };
  const revSc = (p, v) => { if (!p.fainted) return FAIL; let s = BASE + 20 + v * (nonAct === 0 ? 5 : 1);
    if (med && foe) for (const m of mvs(p)) { if (m.category === 'Status') continue; if (!dex.getImmunity(m.type, foe)) { s -= 8; continue; } const e = dex.getEffectiveness(m.type, foe); s += e > 0 ? 7 : e < 0 ? -7 : 0; }
    return s; };
  const xSc = (p, st) => { if (pf) return USELESS; const stg = p.boosts[st] | 0; if (stg >= 6) return FAIL; const M = mvs(p), F = foe ? mvs(foe) : [];
    const worth = st === 'atk' ? M.some(m => m.category === 'Physical') : st === 'spa' ? M.some(m => m.category === 'Special') : st === 'def' ? F.some(m => m.category === 'Physical') : st === 'spd' ? F.some(m => m.category === 'Special') : st === 'spe' ? foe && p.getStat('spe') <= foe.getStat('spe') * 1.5 && !btl.field.pseudoWeather.trickroom : M.some(m => m.accuracy !== true && m.accuracy < 100);
    if (!worth) return USELESS; if (foe && abil(foe) === 'unaware') return USELESS;
    let s = BASE, inc = Math.min(abil(p) === 'simple' ? 4 : 2, 6 - stg); if (abil(p) === 'contrary') return USELESS;
    if (hpAw) s += inc * ((100 * p.hp / p.maxhp) - 50) / 8;
    if (F.some(m => ['haze', 'clearsmog', 'topsyturvy', 'psychup', 'spectralthief', 'punishment'].includes(m.id))) s -= 20;
    if (M.some(m => m.category === 'Status' && m.boosts && m.boosts[st] > 0 && m.target === 'self')) s -= 30;
    s += stg >= 2 ? -10 * (stg - 1) : 10 * inc / 2;
    return Math.round(s); };
  const cnt = id => bag.filter(x => x === id).length, last = B.lastIt; B.lastIt = null;
  const gen = (s, id, pi) => { const n = cnt(id) - 1; s += n > 0 ? 5 * n : -8;
    if (last) { s -= high ? 60 : med ? 50 : 40; const k0 = IT_AI[last[0]]?.[1], k1 = IT_AI[id][1]; if (pi === last[1] && ableN > 1 && (k0 === k1 || /hp|fr/.test(k0) && /hp|fr/.test(k1))) s -= 20; }
    return s; };
  const C = [];
  for (const id of new Set(bag)) { const T = IT_AI[id]; if (!T) continue; const [, k, v] = T;
    if (k === 'x') { C.push([gen(xSc(me, v), id, me.position), id, side.pokemon.indexOf(me)]); continue; }
    if (k === 'hp' && pf) continue;
    side.pokemon.forEach((p, pi) => { let s;
      if (k === 'hp') s = hpSc(p, v); else if (k === 'rev') s = revSc(p, v); else if (k === 'cure') s = cureSc(p);
      else { const h = hpSc(p, 999), c = cureSc(p); s = c > USELESS ? (h > USELESS ? c + h - BASE + 10 : USELESS) : h > USELESS ? h - (bag.some(x => IT_AI[x]?.[1] === 'hp') ? 10 : 0) : Math.round((h + c) / 2); }
      if (k !== 'rev' && p.fainted) return; if (s <= FAIL) return; C.push([gen(s, id, pi), id, pi]); }); }
  if (!C.length || !C.some(c => c[0] > FAIL)) return null;
  const mx = Math.max(...C.map(c => c[0])), thr = .6 + .35 * Math.sqrt(Math.min(sk, 100) / 100);
  if (high && (mx <= USELESS || (mx < BASE * thr && Math.random() < .8))) return null;
  const cut = Math.floor(mx * thr), W = C.map(c => Math.max(c[0] - cut, 0)), tot = W.reduce((a, b) => a + b, 0); if (!tot) return null;
  let r = Math.random() * tot; for (let i = 0; i < C.length; i++) { r -= W[i]; if (r < 0) { B.lastIt = [C[i][1], C[i][2]]; return C[i]; } }
  return null;
}
// 고른 도구를 바로 씀 (턴 맨 앞, 기술보다 먼저): 로그 |-dxitem| 뒤에 회복·치료·능력 오름 줄
function foeUseItem(btl, ch) {
  const [, id, pi] = ch, T = IT_AI[id], side = btl.p2, p = side.pokemon[pi], [, k, v, en] = T, H = p.maxhp; B.bag.splice(B.bag.indexOf(id), 1);
  btl.add('-dxitem', side.active[0], id, p.isActive ? '' : 'p2: ' + p.name);
  const cure = () => { if (p.status) p.cureStatus(); if (p.isActive && p.volatiles.confusion) p.removeVolatile('confusion'); };
  if (k === 'hp' || k === 'fr') { const h = p.heal(v >= 999 ? H : v); if (h && p.isActive) btl.add('-heal', p, p.getHealth, '[from] item: ' + en); if (k === 'fr') cure(); }
  else if (k === 'cure') cure();
  else if (k === 'rev') { p.fainted = false; p.faintQueued = false; p.subFainted = false; p.status = ''; p.hp = 1; p.sethp(v >= 7 ? H : Math.floor(H / 2)); btl.add('-dxrevive', 'p2: ' + p.name); }
  else if (k === 'x') { const n = p.boostBy({ [v]: 2 }); btl.add('-boost', p, v, n); }
}
function aiGmk(btl, c) {
  const G = B?.gmk, side = btl.p2, R = side.activeRequest?.active?.[0], me = side.active[0], foe = btl.p1.active[0];
  if (!c || !/^move \d+$/.test(c) || !G || !R || !me) return c;
  const i = +c.slice(5) - 1, m = R.moves?.[i]; if (m) B.gmBase.e = m.id;
  const left = side.pokemon.filter(p => !p.fainted).length, ace = left === 1 || side.pokemon.indexOf(me) === side.pokemon.length - 1 || me.position === 0 && side.pokemon[side.pokemon.length - 1] === me, hpR = me.hp / me.maxhp;
  if (G.mega && (R.canMegaEvo || R.canMegaEvoX || R.canMegaEvoY)) return c + (R.canMegaEvoX ? ' megax' : R.canMegaEvoY ? ' megay' : ' mega');
  if (G.z && R.canZMove?.[i] && PSim.Dex.moves.get(m.id).category !== 'Status' && foe && foe.hp / foe.maxhp > .35 && (B.diff || Math.random() < .5)) return c + ' zmove';
  if (G.dmax && R.canDynamax && (left === 1 || (ace && hpR > .5))) return c + ' dynamax';
  if (G.tera && R.canTerastallize && (left === 1 || ace || (B.diff >= 2 && hpR < .5))) return c + ' terastallize';
  return c;
}
function aiChoice(btl, diff) {
  const side = btl.p2, req = side.activeRequest; if (!req || req.wait) return null;
  const foe = btl.p1.active[0], me = side.active[0];
  const score = (mon, mid) => { const m = btl.dex.moves.get(mid); if (!foe || foe.fainted) return 1; if (m.category === 'Status') return diff ? 18 + Math.random() * 14 : 20;
    if (!btl.dex.getImmunity(m.type, foe)) return 0; const eff = 2 ** btl.dex.getEffectiveness(m.type, foe); const stab = (mon.types || mon.species?.types || []).includes(m.type) ? 1.5 : 1;
    return (m.basePower || 40) * eff * stab * ((m.accuracy === true ? 100 : m.accuracy) / 100); };
  const bench = () => req.side.pokemon.map((p, i) => ({ p, i, mon: side.pokemon[i] })).filter(o => !o.p.active && !/fnt/.test(o.p.condition));
  // 쉬움: 예전 그대로 (거의 아무 기술)
  if (diff === 0) {
    if (req.forceSwitch) { const o = bench(); return o.length ? 'switch ' + (pick(o).i + 1) : 'pass'; }
    const mv = req.active[0].moves.map((m, i) => ({ m, i })).filter(o => !o.m.disabled && o.m.pp > 0); if (!mv.length) return 'move 1';
    if (Math.random() < .7) return 'move ' + (pick(mv).i + 1);
    return 'move ' + (mv.map(o => ({ o, s: score(me, o.m.id) * rnd(.85, 1.15) })).sort((a, b) => b.s - a.s)[0].o.i + 1);
  }
  // 보통·어려움: 실제 데미지를 어림해서 운용 (경완 2026-10-29 '실전 운용까지 AI'): 마무리·선공기·능력치 올리기·상태이상·회복·교체
  // 쇼다운 getStat·hasType 은 이벤트를 돌려서 배틀 밖에서 부르면 스택이 넘친다 → 저장된 능력치·종족 타입으로 직접 계산
  const st = (p, k) => { const b = p.boosts?.[k] || 0; let v = (p.storedStats?.[k] || 100) * (b >= 0 ? (2 + b) / 2 : 2 / (2 - b)); if (k === 'spe' && p.status === 'par') v /= 2; if (k === 'atk' && p.status === 'brn') v /= 2; return v; };
  const hasT = (p, t) => (p.types || p.species?.types || []).includes(t);
  const dmg = (a, d, mid) => { if (!a || !d || d.fainted) return 0; const m = btl.dex.moves.get(mid); if (m.category === 'Status') return 0;
    if (!btl.dex.getImmunity(m.type, d)) return 0; if (m.damage === 'level') return a.level; if (typeof m.damage === 'number') return m.damage;
    const bp = m.basePower || 0; if (!bp) return 0; const ph = m.category === 'Physical', A = st(a, ph ? 'atk' : 'spa'), Df = Math.max(1, st(d, ph ? 'def' : 'spd'));
    const base = Math.floor(Math.floor(Math.floor(2 * a.level / 5 + 2) * bp * A / Df) / 50) + 2;
    return base * (hasT(a, m.type) ? 1.5 : 1) * 2 ** btl.dex.getEffectiveness(m.type, d) * .925 * ((m.accuracy === true ? 100 : m.accuracy) / 100); };
  const best = (a, d) => Math.max(0, ...(a?.moveSlots || []).filter(x => x.pp > 0).map(x => dmg(a, d, x.id)));
  const fast = (a, d) => st(a, 'spe') >= st(d, 'spe');
  // 들어갈 포켓몬 고르기: 내가 주는 피해 비율 − 받는 피해 비율이 가장 좋은 쪽
  const matchup = mon => !foe || foe.fainted ? 0 : Math.min(1.2, best(mon, foe) / Math.max(1, foe.hp)) - Math.min(1.2, best(foe, mon) / Math.max(1, mon.hp)) * .9;
  if (req.forceSwitch) { const o = bench(); if (!o.length) return 'pass'; return 'switch ' + (o.map(x => ({ x, s: matchup(x.mon) + Math.random() * .1 })).sort((a, b) => b.s - a.s)[0].x.i + 1); }
  const mv = req.active[0].moves.map((m, i) => ({ m, i })).filter(o => !o.m.disabled && o.m.pp > 0);
  if (!mv.length) return 'move 1';
  if (diff === 1 && Math.random() < .12) return 'move ' + (pick(mv).i + 1);   // 보통은 가끔 실수
  const fHp = Math.max(1, foe?.hp || 1), mHp = me.hp / me.maxhp, inDanger = best(foe, me) >= me.hp, foeHit = best(foe, me) / Math.max(1, me.hp), bo = me.boosts || {};
  const sc = mv.map(o => { const m = btl.dex.moves.get(o.m.id); let v;
    if (m.category !== 'Status') { const d = dmg(me, foe, o.m.id); v = Math.min(1, d / fHp); if (d >= fHp) v += 1 + (m.priority > 0 ? .3 : 0); if (m.priority > 0 && inDanger && !fast(me, foe)) v += d >= fHp ? .6 : .25; if (m.self?.boosts && Object.values(m.self.boosts).some(x => x < 0)) v -= .08; }
    else { v = .05; const sb = m.boosts && m.target === 'self' ? m.boosts : null;
      if (sb) { const up = Object.entries(sb).filter(([k, x]) => x > 0), cur = Math.max(...up.map(([k]) => bo[k] || 0), 0); if (up.length && cur < 2 && mHp > .6 && foeHit < .45) v = .62 - cur * .2; }
      else if (m.status && foe && !foe.status && !foe.fainted) { const im = !btl.dex.getImmunity(m.status === 'par' && m.type === 'Electric' ? 'Electric' : m.type, foe) || (m.status === 'brn' && hasT(foe, 'Fire')) || ((m.status === 'psn' || m.status === 'tox') && (hasT(foe, 'Poison') || hasT(foe, 'Steel'))) || (m.status === 'par' && hasT(foe, 'Electric'));
        if (!im && foe.hp / foe.maxhp > .4) v = m.status === 'slp' ? .75 : m.status === 'brn' ? (st(foe, 'atk') > st(foe, 'spa') ? .6 : .35) : m.status === 'par' ? (fast(me, foe) ? .3 : .55) : .45; }
      else if (m.heal || m.id === 'roost' || m.id === 'synthesis' || m.id === 'moonlight' || m.id === 'morningsun') v = mHp < .45 && !inDanger ? .7 : mHp < .7 ? .25 : 0;
      else if (m.sideCondition === 'stealthrock') v = !btl.p1.sideConditions?.stealthrock && btl.p1.pokemon.filter(p => !p.fainted).length > 2 ? .5 : 0;
      else if (m.volatileStatus === 'leechseed') v = foe && !foe.volatiles?.leechseed && !hasT(foe, 'Grass') ? .4 : 0;
      else if (m.id === 'substitute') v = mHp > .6 && !me.volatiles?.substitute ? .3 : 0;
      else if (m.id === 'protect' || m.id === 'detect') v = .1;
      if (m.accuracy !== true) v *= m.accuracy / 100; }
    return { o, s: v * rnd(.95, 1.05) }; }).sort((a, b) => b.s - a.s);
  // 상성이 나쁘면 교체: 지금 기술로 거의 못 때리고, 맞으면 크게 다칠 때 더 나은 포켓몬이 있으면
  if (!req.active[0].trapped && foe && !foe.fainted && sc[0].s < .3 && (foeHit > .5 || sc[0].s < .12)) {
    const b = bench().map(x => ({ x, s: matchup(x.mon) })).sort((a, b) => b.s - a.s)[0];
    if (b && b.s > matchup(me) + .35 && Math.random() < (diff === 2 ? .75 : .4)) return 'switch ' + (b.x.i + 1);
  }
  return 'move ' + (sc[0].o.i + 1);
}

// ---------- 배틀 들어가는 화면 전환 (DP·Pt 본가처럼) ----------
// 화면이 두 번 하얗게 번쩍 → 일반 트레이너는 가로 띠가 양옆에서 번갈아 밀려 들어와 화면을 덮고,
// 관장·사천왕·챔피언·라이벌(music 이 gymBattle·champ·rival)은 어두운 화면에 트레이너 얼굴 띠가 미끄러져 들어온다.
// 끝나면 배틀 화면을 그 밑에 띄우고 돌려준 함수로 전환 화면을 걷는다.
async function encounter(opts) {
  const host = el.parentElement || document.body, w = document.createElement('div'), big = ['gymBattle', 'champ', 'rival', 'tenno', 'hgGymJ', 'hgGymK', 'hgRival', 'hgChamp', 'emGym', 'emTenno', 'emChamp', 'emRival'].includes(opts.music);
  w.className = 'bt-enc'; host.append(w);
  for (let i = 0; i < 2; i++) { w.classList.add('flash'); await wait(90); w.classList.remove('flash'); await wait(120); }
  if (opts.exam) {   // 승급 심사 (경완 2026-10-31 '배틀 시작할 때 연출도 웅장하게'): 암전 → 금빛 띠 → 빛줄기 속 배지 → '승급 심사' → 심사관 띠
    w.classList.add('ex');
    // 줄무늬·빛줄기 없이 (경완 2026-10-31 '구려'): 암전 → 금빛 실선이 가로로 그어지고 → 위아래로 열리는 어두운 무대 → 배지가 떠오름 → '승급 심사' → 심사관 띠
    w.insertAdjacentHTML('beforeend', `<i class="bk"></i><i class="ex-ln"></i><div class="ex-pn"><i class="ex-glow"></i><div class="ex-bd">${opts.exam.bd}</div><b class="ex-t"><small>${esc(opts.exam.g)}</small>승급 심사</b></div><i class="ex-fl"></i><div class="band ex-band"><i class="mug" style="background-image:url(${trSrc(opts.foe.tr)})"></i><b><small>심사관 · ${esc(opts.foe.cls)}</small>${esc(opts.foe.nm)}</b></div>`);
    await wait(500); se('KIRAKIRA2'); await wait(1000); w.classList.add('hit'); se('KON'); await wait(1500); w.classList.add('foe'); se('SLIDEIN'); await wait(1600);
  } else if (!big) {
    w.insertAdjacentHTML('beforeend', Array.from({ length: 12 }, (_, i) => `<i class="st ${i % 2 ? 'r' : 'l'}" style="top:${(i * 100 / 12).toFixed(3)}%;animation-delay:${i * 28}ms"></i>`).join(''));
    await wait(760);
  } else {
    w.insertAdjacentHTML('beforeend', `<i class="bk"></i><div class="band"><i class="mug" style="background-image:url(${trSrc(opts.foe.tr)})"></i><b><small>${esc(opts.foe.cls)}</small>${esc(opts.foe.nm)}</b></div>`);
    await wait(1900);
  }
  return () => { w.classList.add('out'); setTimeout(() => w.remove(), 520); };
}

// ---------- 배틀 진행 ----------
// opts: { my: [P...], foe: { tr, cls, nm, f, team: [entry...] }, diff, practice, bg, music: 'train'|'gymBattle'|'rival'|'champ' }
const M = (f, ...a) => { try { window.GymBGM?.[f](...a); } catch (e) {} };   // 체육관 BGM (gym/bgm.js)
// 본가 몬스터볼 줄: 배틀 시작 때 양쪽이 가진 포켓몬 수 (쓰러짐은 회색, 상태 이상은 노랑, 빈 칸은 테두리만) (경완 2026-10-28)
function tray() { ['e', 'p'].forEach(s => { const L = B.o[s] || [], t = $b(`.bt-pty.${s}`);
  t.innerHTML = balls(s); t.classList.add('on'); }); }
// 포켓몬 수 몬스터볼 (도트, gym/img/bt/pball8.png: 보통·상태 이상·기절·빈 칸)
const balls = s => { const L = B.o[s] || [], live = B.btl?.[s === 'p' ? 'p1' : 'p2']?.pokemon || [];
  return Array.from({ length: 6 }, (_, i) => { const P = L[i], X = P && (live.find(q => q === P) || P), D = X && B.act?.[s]?.pk === X ? B.act[s] : null;
    // 나와 있는 포켓몬은 화면에 보인 상태로: 쓰러지는 연출이 끝나기 전엔 볼이 안 꺼진다 (경완 2026-10-28 '스포')
    return `<i class="${!X ? 'x' : D ? (D.fntS ? 'f' : D.st ? 's' : 'o') : X.fainted || X.hp <= 0 ? 'f' : X.status ? 's' : 'o'}"></i>`; }).join(''); };
// 배틀 기록 (경완 2026-10-31 '내 배틀로그 못 보나?'): 최근 5판을 저장(S.gym.blog)에 남긴다. 서버 저장(V_ 레코드)에도 같이 올라가서 나중에 그 판을 그대로 읽어 볼 수 있다
// {t 끝난 시각, v 버전, foe 상대, won, out(quit), pr 연습, turns, my [[sp,lv,'기술들',특성,친밀도,도구]], fo 상대 팀, ch [[턴, 관장 선택, 상대 선택]], log 쇼다운 기록(정확한 체력 줄만, 600줄까지)}
const BLOG_N = 5, BLOG_L = 600, BLOG_SKIP = /^\|(t:|gametype|gen|tier|rule|player|teamsize|poke|teampreview|clearpoke|start|upkeep|debug)(\||$)/;
function blogSave(opts, my, foeT, won, out) {
  if (!B || !S.gym) return; const L = B.btl.log, lines = [];
  for (let i = 0; i < L.length && lines.length < BLOG_L; i++) { const ln = L[i]; if (ln.startsWith('|split|')) { lines.push(L[i + 1]); i += 2; continue; } if (!ln || ln === '|' || BLOG_SKIP.test(ln)) continue; lines.push(ln); }
  let v = ''; try { v = APP_VER; } catch (e) {}
  const rec = { t: Date.now(), v, foe: B.foeNm || opts.foe?.nm || '', won: won ? 1 : 0, out: out || undefined, pr: B.practice ? 1 : 0, turns: B.btl.turn,
    my: my.map(o => [o.sp, o.lv, (o.mv || []).join(' '), o.ab || '', o.fr || 0, o.it || '']), fo: foeT.map(o => [o.sp, o.lv, (o.mv || []).join(' '), o.ab || '', o.it || '']),
    ch: B.picks || [], log: lines };
  S.gym.blog = [rec, ...(S.gym.blog || [])].slice(0, BLOG_N);
  try { GA.save(); } catch (e) {}
}
async function run(opts) {
  await Promise.all([loadData(), loadSim()]);
  try { evMig(); } catch (e) {}
  if (!el) buildUI(); fit();
  const my = opts.my.map(myEntry), foeT = opts.foe.team;
  if (opts.foe.hold != null) try { foeItems(foeT, opts.foe.hold); } catch (e) {}   // 도전자 지닌 도구 (v16.89)
  const btl = new PSim.Battle({ formatid: 'gen9customgame', seed: [1, 2, 3, 4].map(() => Math.floor(Math.random() * 65536)) });
  btl.setPlayer('p1', { name: '관장', team: my.map(psSet) });
  btl.setPlayer('p2', { name: opts.foe.nm, team: foeT.map(psSet) });
  if (opts.gmk?.dmax) btl.sides.forEach(sd => { sd.dynamaxUsed = false; sd.canDynamaxNow = function () { return !this.dynamaxUsed; }; });   /* v21.89 9세대 규칙에서도 다이맥스 (쇼다운은 8세대만) */
  // 쇼다운은 교체할 때마다 pokemon 배열 순서를 바꾼다. 처음 순서(my·foe 와 같은 순서)를 따로 둔다 (경완 2026-10-27 '시라소몬인데 망키라고 나옴')
  const monSnap = opts.practice ? JSON.stringify(S.gym.mon || {}) : null;   // 연습 배틀: 연출은 다 보여 주고 경험치·레벨·기술은 끝나면 되돌림 (경완 2026-10-29)
  B = { btl, my, foe: foeT, o: { p: [...btl.p1.pokemon], e: [...btl.p2.pokemon] }, act: { p: null, e: null }, li: 0, practice: !!opts.practice, frw: opts.frw, noRun: !!opts.noRun, diff: opts.diff ?? 1, fast: false, tapWake: null, out: null, used: new Set(), vs: new Set(), xr: {}, gmk: opts.gmk || null, gmx: { p: 0, e: 0 }, gmBase: {}, bag: [...(opts.foe.bag ?? FOE_BAG[Math.min(2, opts.foe.hold ?? opts.diff ?? 1) | 0] ?? [])], lastIt: null };
  frHooks(btl); try { erHooks(btl); } catch (e) {} { const sd = btl.p2, cp = sd.choosePass.bind(sd); sd.choosePass = function () { if (this.__ip) { this.__ip = 0; this.choice.actions.push({ choice: 'pass' }); return true; } return cp(); }; } B.picks = [];
  const meF = GA.trOf().sex === 'f';
  const music = opts.music || 'train'; const winM = opts.win || (music === 'train' ? 'winTrain' : music === 'champ' ? 'winChamp' : music === 'tenno' ? 'winTenno' : 'winGym'); M('prep', winM);   /* v16.89: 이름 있는 트레이너는 그 버전 승리 곡 (opts.win) */   // v16.88: 사천왕·챔피언은 그 승리 곡
  // 곡이 준비된 뒤에 연출 시작 (경완 2026-10-28 '시작 연출이랑 BGM 타이밍이 안 맞음'): 처음 만드는 곡이면 기다림, 최대 4초
  await Promise.race([(async () => { try { await window.GymBGM?.play(music, { fade: .05 }); } catch (e) {} })(), wait(4000)]);
  const encDone = await encounter(opts);
  el.classList.remove('off'); el.hidden = false; el.className = 'bt intro now'; fit();   // className 을 새로 쓰면 mob·msgmid 가 지워져 대화창이 사라졌음 (경완 2026-10-27 '배틀 상태창이 없어졌네')
  $b('.bt-bg').style.backgroundImage = `url(${IMG}bt/bg_${opts.bg || 'in1'}.png)`;
  // 지난 배틀의 away·back·throw 가 남아 있으면 트레이너가 미끄러져 들어오지 않고 제자리에 있었다 (경완 2026-10-28 '발판만 움직이고 캐릭터는 안 움직임')
  const trE = $b('.bt-tr.e'), trP = $b('.bt-tr.p'), uE = trSrc(opts.foe.tr), uP = opts.meBackUrl || `${IMG}trb/${meF ? 'pt_f' : 'pt_m'}.png`;
  trE.className = 'bt-tr e'; trP.className = 'bt-tr p';
  trE.style.cssText = ''; trE.style.backgroundImage = `url(${uE})`; trP.style.backgroundImage = `url(${uP})`; const trA = trAni(trE, opts.foe.tr), uEp = trA ? `${IMG}dbk/tr/${trA[2]}.png` : uE;
  B.trU = { e: uE, p: opts.meFrontUrl || `${IMG}tr/${meF ? 'pt_f' : 'pt_m'}.png` };   /* v21.89 DBK 기믹 장면의 트레이너 앞모습 */
  await Promise.race([Promise.all([uEp, uP].map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u; }))), wait(1200)]);   // 그림이 늦게 떠서 멈춰 보이지 않게 미리 받기
  ['e', 'p'].forEach(s => { $b(`.bt-pty.${s}`).classList.remove('on'); $b(`.bt-hb.${s}`).classList.remove('on'); monEl(s).className = `bt-mon ${s}`; monEl(s).style.opacity = monEl(s).style.transition = ''; setSt(s, ''); });
  $b('.bt-msg .t').textContent = ''; idlePanel(); wxSet(''); $b('.bt-terr').className = 'bt-terr'; $b('.bt-lvw').hidden = true; $b('.bt-shw').hidden = true;
  // 등장: 화면이 번쩍이며 가로줄로 열리고, 발판·트레이너가 양옆에서 미끄러져 들어온다
  M('sePrep', SE_BASE.map(n => 'DP_' + n)); await wait(40); el.classList.add('now', 'open'); void el.offsetWidth; el.classList.remove('now'); encDone(); se('SLIDEIN');   // 배틀 화면은 바로 불투명하게 (서서히 나타나면 걷히는 전환 화면 사이로 체육관이 비쳤다, 경완 2026-10-28)
  await wait(900); el.classList.remove('intro'); await trPlay(trE, trA);
  const foeNm = B.foeNm = `${opts.foe.cls} ${opts.foe.nm}`;
  tray(); await msg(`${iga(foeNm)} 승부를 걸어왔다!`, 900);
  my.forEach(o => gifLoad(gifUrl(o.sp, true, o.shiny, o.g === 'F', o.fm))); foeT.forEach(o => gifLoad(gifUrl(o.sp, false, o.shiny, o.g === 'F')));   // 미리 받기
  btl.makeChoices('default', 'default');   // 팀 미리보기: 라인업 순서 그대로
  try { await play(); } catch (e) { console.error(e); if (B) B.err = e; try { window.pkErr?.('battle: ' + (e?.message || e), e?.stack); } catch (e2) {} }
  const won = btl.winner === '관장', out = B?.out, cut = !btl.ended && out !== 'quit';   /* 오류로 중간에 멈춘 배틀은 없던 배틀 (경완 2026-11-04 '질 상황이 아니었는데 진 걸로') */
  try { blogSave(opts, my, foeT, won, out || (cut ? 'cut' : undefined)); } catch (e) {}
  try { if (!cut) erEnd(); } catch (e) {}
  try { if (B && !B.practice && !cut && out !== 'quit') frBattle(won); } catch (e) { console.error(e); }
  if (cut) try { const er = B?.err; window.pkErrRep?.('battle: ' + (er ? er.message || er : '고를 것이 없어 멈춤'), er?.stack || '', { foe: B?.foeNm || '', blog: S.gym?.blog?.[0] }); } catch (e) {}   /* 오류 창이 뜬 배틀은 서버로 보고 → 자동으로 고침 (경완 2026-11-04) */
  if (B) {
    if (cut) await msgTap('배틀이 중간에 멈췄다!');
    else if (out !== 'quit') {
      { const fe = monEl('e'); if (getComputedStyle(fe).opacity !== '0') { fe.style.transition = 'opacity .35s'; fe.style.opacity = '0'; await wait(380); } }   /* v18.09 경완 '승부 끝나고 스프라이트 겹쳐 보임': 진 승부는 상대 포켓몬이 남아 있어 다시 나온 트레이너와 겹쳤다 → 포켓몬을 먼저 들여보냄 */
      $b('.bt-tr.e').classList.add('back');
      if (won) { M('play', winM, { fade: .05 }); await msgTap(`${wa(foeNm)}의 승부에서 이겼다!`); }   /* v18.10 경완: 졌을 땐 원래대로 끝 곡 없음 */
      else await msgTap('승부에서 졌다…');
      const ln = opts.foe.say?.[won ? 'win' : 'lose']; if (ln && B) await msgTap(ln);   // 상대 한마디 (본가처럼 다시 나와서)
      // 보상 (경완 2026-10-28): 한마디 뒤 골드·평판
      const W = opts.rew; if (W && B) { if (won) { await msgTap(`${W.g.toLocaleString()}G를 받았다!`); if (W.r) await msgTap(`체육관 평판이 ${W.r} 올랐다!`); } else if (W.rl) await msgTap(`체육관 평판이 ${-W.rl} 깎였다…`); }
    }
  }
  /* v21.51 경완 '배틀에서 진화하는 애들은 배틀에서 바로 진화': 배틀 기록 조건(EVX b)이 막 채워진 포켓몬은 승부가 끝나자마자 진화 연출 → 배틀 화면의 내 포켓몬도 새 모습으로 */
  if (B && !B.practice && !cut && out !== 'quit') { const L = (B.my || []).map((e, i) => ({ i, P: GA.boxOf?.(e.pid) })).filter(x => x.P && GA.evoBtl?.(x.P));
    if (L.length) { M('stop', .8); for (const x of L) { try { await GA.evoRun(x.P); } catch (e) { console.error(e); } const P = x.P, A = { ...B.my[x.i], sp: P.sp, fm: P.fm }; B.my[x.i] = A;
      if (btl.p1.active[0] === B.o.p[x.i] && !B.o.p[x.i].fainted) { const fe = monEl('p'); fe.style.transition = ''; fe.style.opacity = ''; A.gif = await pickGif('p', A); showMon('p', A); await wait(1100); } } } }
  if (monSnap) S.gym.mon = JSON.parse(monSnap);
  lowHp(false); M('play', 'gym', { fade: 1.2 });
  // 끝나면 까맣게 어두워졌다가 체육관이 밝아지며 돌아온다 (본가처럼, 경완 2026-10-28)
  const fd = document.createElement('i'); fd.className = 'bt-fade'; (el.parentElement || document.body).appendChild(fd); void fd.offsetWidth; fd.classList.add('on'); await wait(420);
  el.classList.add('off'); el.hidden = true; await wait(120); fd.classList.remove('on'); setTimeout(() => fd.remove(), 800); await wait(650); const res = { won: won && !cut, cut, quit: out === 'quit', turns: btl.turn, my: B?.my, used: [...(B?.used || [])], xr: B?.xr || {}, eg: B?.egUp || [] }; B = null; return res;
}

// 쇼다운 기록을 한 줄씩 읽어 화면에 보여 준다. 고를 차례가 오면 아래 화면 메뉴
async function play() {
  const btl = B.btl;
  for (;;) {
    await readLog();
    if (!B || btl.ended) return;
    const r1 = btl.p1.activeRequest, r2 = btl.p2.activeRequest;
    let c1 = null;
    if (r1 && !r1.wait) { c1 = await choose(r1); if (!B) return; if (c1 === 'quit') { B.out = 'quit'; btl.choose('p1', 'forfeit'); await readLog(); return; } }
    let c2 = null; if (r2 && !r2.wait) { const it = aiItem(btl); if (it) { foeUseItem(btl, it); btl.p2.__ip = 1; c2 = 'pass'; } else c2 = aiGmk(btl, aiChoice(btl, B.diff)); }
    if (c2 && !c1 && r2.forceSwitch && btl.p2.active[0]?.fainted && /^switch/.test(c2)) { await shiftAsk(c2); if (!B) return; }
    idlePanel();
    if (B.picks) B.picks.push([btl.turn, c1 || '', c2 || '']);   // 배틀 기록: 이 턴에 관장이 고른 것·상대 AI 가 고른 것
    if (c1 && c2) btl.makeChoices(c1, c2); else if (c1) btl.choose('p1', c1); else if (c2) btl.choose('p2', c2); else return;
  }
}
// 교체 룰 (본가 기본): 상대가 쓰러진 포켓몬 대신 다음을 내보내기 전에 '포켓몬을 바꾸겠습니까?' (경완 2026-10-29). 바꾸면 내 쪽이 먼저 나온다
async function shiftAsk(c2) {
  const btl = B.btl, me = btl.p1.active[0];
  if (!me || me.fainted || !btl.p1.pokemon.some(p => !p.fainted && !p.isActive)) return;
  const nx = btl.p2.pokemon[+c2.split(' ')[1] - 1], nm = B.foe[B.o.e.indexOf(nx)]?.nm || nx?.name || '';
  await msg(`${eun(B.foeNm)} ${eul(nm)} 내보내려 하고 있다!`, 0);
  if (!await yesNo('포켓몬을 바꾸겠습니까?')) return;
  const i = await partyPanel({ side: btl.p1.getRequestData() }, false); if (i == null || !B) return;
  const pk = btl.p1.pokemon[i]; if (!pk || pk.fainted || pk.isActive) return;
  btl.actions.switchIn(pk, 0); btl.queue.list = btl.queue.list.filter(x => !(x.choice === 'runSwitch' && x.pokemon === pk)); btl.actions.runSwitch(pk);
  await readLog();
}
async function choose(req) {
  const A = B.act.p;
  if (req.forceSwitch) { await msg(`다음 포켓몬을 골라 주세요.`, 0); const i = await partyPanel(req, true); return 'switch ' + (i + 1); }
  { const M = req.active?.[0]?.moves || []; if (M.length === 1 && M[0].pp == null) return 'move 1'; }   // 꽃잎댄스·역린 같은 연속 공격, 반동으로 쉬기: 본가처럼 고르지 않고 바로 (경완 2026-11-02 'PP undefined')
  for (;;) {
    const a = await mainPanel(A);
    if (a === 'fight') { if (req.active[0].moves.every(m => m.disabled || m.pp <= 0)) return 'move 1'; B.gkSel = null; const i = await movePanel(req); if (i == null) continue; B.gmBase.p = req.active[0].moves[i]?.id; return 'move ' + (i + 1) + (B.gkSel ? ' ' + B.gkSel.replace(/^mega[xy]$/, m => m === 'megax' ? 'megax' : 'megay') : ''); }
    if (a === 'mon') { const i = await partyPanel(req, false); if (i == null) continue; if (req.active[0].trapped || B.btl.p1.active[0]?.trapped) { await msg(`${eun(A.nm)} 교체할 수 없다!`); continue; }   /* 그림자밟기처럼 아직 안 드러난 특성으로 묶이면 요청엔 maybeTrapped 만 와서 교체를 보냈다가 배틀이 멈췄음 (경완 2026-11-04) */ return 'switch ' + (i + 1); }
    if (a === 'info') { await battlerInfo(); continue; }
    if (a === 'bag') { await msg('체육관 배틀에서는 가방을 쓸 수 없다!'); continue; }
    if (a === 'run') { if (B.noRun) { await msg('안 돼! 승부 도중에\n상대에게 등을 보일 수는 없어!'); continue; } if (await yesNo(B.practice ? '연습 배틀을 그만둘까요?' : '기권할까요? 진 것으로 처리돼요.')) return 'quit'; continue; }
  }
}
// 이름표 "p1a: 피카츄" → 편
const sideOf = id => id.startsWith('p1') ? 'p' : 'e';
const nmIn = (id) => id.replace(/^p\da?: /, '');
const who = id => (sideOf(id) === 'e' ? '상대 ' : '') + nmIn(id);
function partyIdx(side, line) {
  const L = B.o[side], nm = nmIn(line[2]), spn = line[3].split(',')[0];
  const k = L.findIndex(p => p.name === nm && p.species.name === spn && !p.fainted && p !== (side === 'p' ? B.act.p?.pk : B.act.e?.pk));
  return k >= 0 ? k : L.findIndex(p => p.name === nm);
}
// 맞는 소리는 효과(굉장/별로)에 따라 다르다: 이어지는 줄을 미리 본다
function effAhead(id) { const L = B.btl.log; for (let k = B.li; k < Math.min(L.length, B.li + 4); k++) { const x = L[k].split('|'); if (x[1] === '-supereffective' && x[2] === id) return 'H'; if (x[1] === '-resisted' && x[2] === id) return 'L'; if (x[1] === 'move' || x[1] === '-damage') break; } return 'M'; }
// 정보 카드 친밀도 (경완 2026-10-29 '체육관 상세 정보카드에서도 확인')
function frRow(P) { const fr = Math.min(255, P.fr || 0), h = fr >= 255 ? 5 : Math.min(4, Math.floor(fr / 51)); return `<p class="mp-frh"><small>친밀도</small><b class="${h >= 5 ? 'max' : ''}">${'♥'.repeat(h)}${'♡'.repeat(5 - h)}</b></p>`; }   // 레벨·랭크 밑 (경완 2026-10-29 '친밀도 + 하트만')
// 친밀도 기믹 (경완 2026-10-29 '배틀에 친밀도 기믹'): 하트(친밀도 51마다 1개, 255 = 만점)가 많을수록 내 포켓몬이 관장을 위해 힘낸다 (본가 소드·실드 '어펙션' 느낌)
// ♥3 이상: 쓰러질 공격을 HP 1로 버팀 (15·20·25%) · ♥4 이상: 급소 +1, 턴 끝에 상태 이상을 스스로 고침 (20%) · ♥5(만점): 공격을 피함 (10%)
const FR_END = [0, 0, 0, 15, 20, 25];
function frLv(pk) { if (!B || !pk || pk.side?.id !== 'p1') return 0; const fr = B.my[B.o.p.indexOf(pk)]?.fr || 0; return fr >= 255 ? 5 : Math.min(4, Math.floor(fr / 51)); }
/* v21.49 경완 '특별한 진화 조건 — 배틀 기록': 관장 포켓몬마다 S.gym.mon[pid].er 에 남김 (연습 배틀은 안 셈)
   u{기술:쓴 횟수} 배리어러시·독침천발·분노의주먹 / cr 한 판 급소 최대 / dg 쓰러지지 않은 한 판에 받은 피해 최대 / rc 쓰러지지 않은 판에 받은 피해 합 / ko 쓰러뜨린 악·강철 타입 수 → 본 게임 EVX 진화 조건 */
const ER_MV = ['psyshieldbash', 'barbbarrage', 'ragefist'];
function erHooks(btl) {
  const F = btl.format, per = new Map(); B.erP = per;
  const rec = pk => { if (!B || B.practice || pk?.side?.id !== 'p1') return null; const e = B.my[B.o.p.indexOf(pk)], m = e && S.gym?.mon?.[e.pid]; return m ? (m.er ||= {}) : null; };
  const one = pk => { let o = per.get(pk); if (!o) per.set(pk, o = { cr: 0, dm: 0 }); return o; };
  btl.onEvent('AfterMove', F, function (src, tgt, move) { const r = rec(src); if (r && ER_MV.includes(move?.id)) { r.u ||= {}; r.u[move.id] = (r.u[move.id] || 0) + 1; } });
  btl.onEvent('DamagingHit', F, function (dmg, target, src, move) {
    const r = rec(src); if (r && target?.getMoveHitData?.(move)?.crit) { const o = one(src); o.cr++; if (o.cr > (r.cr || 0)) r.cr = o.cr; }
    if (rec(target) && dmg > 0) one(target).dm += dmg; });
  /* v21.51 경완 '배틀 도중 그 자리에서 진화': 턴 끝에 조건이 맞은 내 포켓몬은 쇼다운 안에서 종을 바꾸고(능력치·최대 HP 다시) '-pkevo' 줄 → 화면 연출 */
  btl.onEvent('Residual', F, function () {
    for (const pk of this.p1.active) { if (!pk || pk.fainted || B.practice) continue; const r = rec(pk), o = per.get(pk);
      if (r && o) { if (o.dm > (r.dg || 0)) r.dg = o.dm; r.rc = (r.rc || 0) + o.dm - (o.rcA || 0); o.rcA = o.dm; }   // 지금까지 버틴 피해도 바로 셈 (끝에 erEnd 가 나머지)
      const e = B.my[B.o.p.indexOf(pk)], P = e && GA.boxOf?.(e.pid); if (!P || (B.evoDone ||= new Set()).has(pk) || !GA.evoBtl?.(P)) continue;
      const to = GA.evoTo?.(P), id = to && D.sp[to]?.id, sp = id && this.dex.species.get(id); if (!sp?.exists) continue;
      const ratio = pk.hp / pk.maxhp; pk.setSpecies(sp); pk.baseSpecies = sp; pk.details = pk.getUpdatedDetails(); const st = this.spreadModify(sp.baseStats, pk.set);
      pk.baseMaxhp = pk.maxhp = st.hp; pk.hp = Math.max(1, Math.round(ratio * st.hp));
      { const SP = GA.SPECIES, o = SP[P.sp]?.n, n = SP[to]?.n; if (n && pk.name === o) { pk.name = n; pk.fullname = `${pk.side.id}: ${n}`; } }   // 별명 없으면 기록 이름도 새 종 이름 (뒤 대사가 옛 이름으로 나오지 않게)
      B.evoDone.add(pk); this.add('-pkevo', pk, String(to), `${pk.hp}/${pk.maxhp}`); }
  });
  btl.onEvent('Faint', F, function (target, src) { const r = rec(src); if (r && target?.side?.id === 'p2' && target.hasType?.(['Dark', 'Steel'])) r.ko = (r.ko || 0) + 1; });
}
function erEnd() { if (!B?.erP) return; for (const [pk, o] of B.erP) { const add = Math.max(0, o.dm - (o.rcA || 0)); const r = pk.side?.id === 'p1' && !pk.fainted && pk.hp > 0 ? (() => { const e = B.my[B.o.p.indexOf(pk)], m = e && S.gym?.mon?.[e.pid]; return m ? (m.er ||= {}) : null; })() : null; if (!r || !o.dm) continue; if (o.dm > (r.dg || 0)) r.dg = o.dm; r.rc = (r.rc || 0) + add; } B.erP = null; }
function frHooks(btl) {
  const F = btl.format;
  btl.onEvent('Damage', F, -40, function (dmg, target, src, eff) {
    if (eff?.effectType !== 'Move' || !(dmg >= target.hp) || target.hp <= 1) return;
    const h = frLv(target); if (h < 3 || !this.randomChance(FR_END[h], 100)) return;
    this.add('-frmsg', target, 'endure'); return target.hp - 1;
  });
  btl.onEvent('Accuracy', F, function (acc, target, src, move) {
    if (acc === true || target === src || move?.category === 'Status' || frLv(target) < 5 || !this.randomChance(10, 100)) return;
    this.add('-frmsg', target, 'dodge'); return 0;
  });
  btl.onEvent('ModifyCritRatio', F, function (r, src) { return frLv(src) >= 4 ? r + 1 : r; });
  btl.onEvent('Residual', F, function () {
    for (const pk of this.p1.active) if (pk && !pk.fainted && pk.status && frLv(pk) >= 4 && this.randomChance(20, 100)) { this.add('-frmsg', pk, 'cure', pk.status); pk.cureStatus(true); }
  });
}
const FR_ST = { slp: '잠', frz: '얼음', par: '마비', brn: '화상', psn: '독', tox: '독' };
// v21.85 경완 '친밀도 효과 나올 때 포켓몬 한번 꿀렁하고 하트 표시 나온 후에 멘트': 꿀렁 → 하트·소리 → (하트가 다 보인 뒤) 멘트
async function frFx(s) { const m = monEl(s); if (!m) return; const im = m.querySelector('img');
  if (im) { await im.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.12,.86)', offset: .3 }, { transform: 'scale(.94,1.08)', offset: .6 }, { transform: 'scale(1.03,.97)', offset: .82 }, { transform: 'scale(1,1)' }], { duration: 480, easing: 'ease-in-out', composite: 'add' }).finished.catch(() => {}); if (!B) return; }
  const h = document.createElement('i'); h.className = 'bt-hrt'; h.textContent = '♥'; m.appendChild(h); setTimeout(() => h.remove(), 1400); try { window.GymBGM?.se?.('DP_PINPON'); } catch (e) {} await wait(B?.fast ? 500 : 950); }
// v21.85 경완 '친밀도 멘트 관장 말고 트레이너 닉네임으로'
const frTr = () => { let n = ''; try { n = (GA.trOf?.().n || '').trim(); } catch (e) {} return n || '관장'; };
async function readLog() {
  const L = B.btl.log;
  while (B && B.li < L.length) {
    let line = L[B.li++];
    if (line === '|split|p1' || line === '|split|p2') { line = L[B.li]; B.li += 2; }   // 정확한 체력 줄만 쓴다
    try { await handle(line.split('|')); } catch (e) { console.error(e, line); }
  }
}
// 이 기술 줄 뒤 (다음 행동 전까지)에 '효과 없음·실패·방어' 가 오면 연출을 건너뛴다
function noFx() {
  const L = B.btl.log;
  for (let j = B.li; j < L.length && j < B.li + 12; j++) {
    const t = L[j].split('|'), k = t[1];
    if (k === '-immune' || k === '-fail' || (k === '-activate' && /Protect|Detect|King's Shield|Spiky Shield|Baneful Bunker|Obstruct|Silk Trap|Burning Bulwark|Max Guard/.test(t[3] || ''))) return true;
    if (k === 'move' || k === 'turn' || k === 'switch' || k === 'drag' || k === '-damage' || k === 'faint' || k === 'upkeep' || k === '-hitcount' || k === '-heal' || k === '-boost' || k === '-unboost' || k === '-status' || k === '-start') return false;
  }
  return false;
}
const hpOf = s => { const [a] = String(s || '').split(' '); if (a === '0') return [0, 0]; const [h, m] = a.split('/').map(Number); return [h || 0, m || 0]; };
const stOf = s => (String(s || '').split(' ')[1] || '').replace('fnt', '');
// 급소·상성 말은 본가처럼 체력바가 다 줄어든 뒤에 (경완 2026-10-28). 쇼다운은 -damage 앞에 보내므로 모아 뒀다가 낸다
const PEND = { '-crit': '급소에 맞았다!', '-supereffective': '효과가 굉장했다!', '-resisted': '효과가 별로인 듯하다…' };
async function flushPend() { const L = B?.pend; if (!L?.length) return; B.pend = []; for (const t of L) { if (/버텼다!$/.test(t) && B.frq?.length) await frFx(B.frq.shift()); await msg(t); } }
async function handle(a) {
  const k = a[1], A = s => B.act[s];
  // v13.16 경완 '맞지 않았다! 가 너무 빨리': 기술 이름 바로 뒤에 오는 결과 말은 이름을 읽을 틈(0.75초)을 둔다
  const pk = B.prevK; B.prevK = k; const gap = () => pk === 'move' ? wait(750) : null;
  if (PEND[k]) { if (k === '-crit') setTimeout(() => vib(2), 120); (B.pend = B.pend || []).push(PEND[k]); return; }
  if (k === '-frmsg') {   // 친밀도: 버티기는 체력바가 줄어든 뒤에, 피하기·고치기는 바로
    const n = nmIn(a[2]), s = sideOf(a[2]);
    if (a[3] === 'endure') { (B.pend = B.pend || []).push(`${eun(n)} ${eul(frTr())} 슬프게 하지 않으려고 버텼다!`); (B.frq = B.frq || []).push(s); return; }
    await flushPend(); await frFx(s);
    await msg(a[3] === 'dodge' ? `${eun(n)} ${frTr()}의 기대에 응하려고 공격을 피했다!` : `${eun(n)} ${eul(frTr())} 걱정시키지 않으려고 ${FR_ST[a[4]] || '상태 이상'}에서 스스로 벗어났다!`);
    if (a[3] === 'cure') { const X = B.act[s]; if (X) { X.st = ''; setSt(s, ''); } }
    return;
  }
  if (k !== '-damage') await flushPend();
  // 특성은 본가처럼 화면 위 따로 띄우고, 그 효과는 대화창에 (경완 2026-10-29 '위협은 별도 창, 공격이 떨어졌다는 배틀창')
  const fa = a.find(x => /^\[from\] ability: /.test(x)), of = a.find(x => /^\[of\] /.test(x));
  if (k === '-ability' && a[2]) { const nab = toID(a[3]), n = who(a[2]), src = fa ? toID(fa.replace('[from] ability: ', '')) : '', fm = (a.find(x => /^\[from\] move: /.test(x)) || '').slice(13), o = of ? who(of.slice(5)) : '';
    /* v21.30 경완 '본가랑 다른 거 검토': 트레이스는 트레이스 창 + 문장, 기술로 바뀐 특성·나올 때 알리는 특성(프레셔 등)은 문장까지 */
    if (src === 'trace') { B.abLast = ''; await abPop(a[2], 'trace'); await msg(`${eun(n)} ${o ? o + '의 ' : ''}${eul(abKo(nab))} 트레이스했다!`); return; }
    if (src === 'receiver' || src === 'powerofalchemy') { await msg(`${o ? o + '의 ' : ''}${eul(abKo(nab))} 이어받았다!`); return; }
    if (fm === 'Skill Swap') return;
    if (fm) { await abPop(a[2], nab); await msg(`${n}의 특성이 ${iga(abKo(nab))} 되었다!`); return; }
    await abPop(a[2], nab); const t = AB_ANN[nab]?.(n, a[2]); if (t) await msg(t); return; }
  if (fa) await abPop(of ? of.slice(5) : a[2], toID(fa.replace('[from] ability: ', '')));
  else B.abLast = '';
  switch (k) {
    case 'switch': case 'drag': {
      const s = sideOf(a[2]), i = partyIdx(s, a), det = a[3].split(', '), [hp, mhp] = hpOf(a[4]);
      const src = s === 'p' ? B.my[i] : B.foe[i], pk = B.o[s][i];
      const old = A(s);
      if (old && !old.fnt) { await msg(s === 'p' ? `돌아와! ${old.nm}!` : `${eun(B.foeNm)} ${eul(old.nm)} 되돌렸다!`, 0); await recall(s); }
      monEl(s).classList.remove('dmx', 'tera'); monEl(s).querySelector('.dpat')?.remove(); B.gmx[s] = 0;   /* v21.89 다이맥스·테라스탈 모습은 들어가면 풀림 */
      const sp = PSim.Dex.species.get(det[0]).num || src.sp;
      const X = B.act[s] = { i, pk, nm: src.nm, sp, tsp: SPECIES[src.sp]?.rb === sp ? src.sp : sp, fm: toID(det[0]) === 'minior' && hp * 2 > mhp ? 'miniormeteor' : toID(det[0]),   // 메테오나 (리밋실드): 체력 절반 넘으면 껍질 모습으로 나온다   /* v17.46 경완: tsp = 타입 아이콘용 번호 (쇼다운 num 은 가라르 또도가스도 110 이라 지역 폼은 내 번호로) */
      lv: +(det.find(d => /^L\d+/.test(d)) || 'L100').slice(1), g: det.includes('F') ? 'F' : det.includes('M') ? 'M' : '', shiny: det.includes('shiny'), hp, mhp, st: stOf(a[4]), fnt: false };
      if (s === 'p') { X.xpg = xpGauge(src); X.pid = src.pid; B.used.add(src.pid); B.vs.add(src.pid); }
      if (s === 'e') { const P0 = B.act.p; B.vs = new Set(P0 && !P0.fnt ? [P0.pid] : []); }   // v14.94 경완: 경험치는 이 상대와 마주친 포켓몬만 다 받고, 나머지는 학습장치 (본가처럼 상대마다 새로)
      if (s === 'e') { if (!B.eOut) { B.eOut = 1; $b('.bt-tr.e').classList.add('away'); $b('.bt-pty.e').classList.remove('on'); } await msg(`${eun(B.foeNm)} ${eul(X.nm)} 내보냈다!`, 0); }
      else { if (!B.pOut) { B.pOut = 1; $b('.bt-tr.p').classList.add('throw'); $b('.bt-pty.p').classList.remove('on'); } await msg(`가랏! ${X.nm}!`, 0); }
      await sendOut(s, X); await wait(200);
      break;
    }
    case 'move': {
      const s = sideOf(a[2]), X = A(s); const id = toID(a[3]); B.lastMove = { s, id }; if (s === 'p' && X) B.egMv = X.pid;
      { const mv = PSim.Dex.moves.get(id); B.mh = mv?.multihit || id === 'dragondarts' ? { s, id, n: 0 } : null; }   /* v21.85 경완 '연속기는 본가처럼 맞을 때마다 기술 효과': 두 번째 맞는 것부터 그 기술 연출을 다시 */
      monEl(s).classList.remove('hid');   // 공중날기·구멍파기 2턴째: 다시 나타나며 공격
      await msg(`${who(a[2])}의 ${mvKo(id)}!`, 0);
      if (a.includes('[notarget]')) break;
      if (noFx()) break;   // 효과가 없는 기술·실패·방어에 막힘은 본가처럼 연출 없이 바로 그 말 (경완 2026-10-29)   // 상대가 먼저 쓰러져 맞을 대상이 없으면 연출 없이 '하지만 상대가 없었다' (본가처럼, 경완 2026-10-29)
      { const dm = PSim.Dex.moves.get(id), fid = (dm.isZ || dm.isMax) && B.gmBase[s] ? B.gmBase[s] : id; await moveFx(s, fid, a.includes('[miss]') || a.some(x => x === '[still]')); }   /* v21.89 Z기술·다이맥스 기술은 바탕 기술 연출 */
      break;
    }
    case '-notarget': await gap(); await msg('하지만 공격할 상대가 없었다!', 500); break;
    case '-damage': {
      const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp, mhp] = hpOf(a[3]); const from = (a[4] || '').replace('[from] ', '');
      if (ST_P[from]) await stFx(s, from, true);   // 화상·독 데미지는 본가처럼 연출 뒤 HP
      else if (from) await resFx(s, from, a);   // 씨뿌리기·스텔스록·압정·조이기·모래바람 등 (경완 2026-10-29 '지속 데미지·패시브 기술 모션')
      const hz = /^(move: )?(Stealth Rock|Spikes)$/.test(from);   // 스텔스록·압정은 HP 먼저, 말은 뒤 (본가)
      if (from && !hz) { const t = dmgFrom(from, a[2]); if (t) await msg(t, 300); }
      if (from === 'confusion') { await moveFx(other(s), 'pound'); await hitFx(s, 'M'); }   // 혼란 자해: 본가처럼 막치기 연출·소리 → 깜빡 → HP (경완 2026-10-28)
      if (!from && B.noHit === s) B.noHit = null;   /* v21.30 경완 '탈은 특성 카드 먼저': 탈이 대신 맞은 0 데미지 줄은 본가처럼 맞아 깜빡이지 않음 */
      else if (!from) { if (B.mh && s !== B.mh.s && ++B.mh.n > 1) await moveFx(B.mh.s, B.mh.id, false); await hitFx(s, effAhead(a[2])); }
      if (mhp) X.mhp = mhp; await drainHp(s, X, hp); X.st = stOf(a[3]) || X.st; if (hz) { const t = dmgFrom(from, a[2]); if (t) await msg(t, 300); } await flushPend(); break;
    }
    case '-dxitem': { const T = IT_AI[a[3]]; await gap(); await msg(`${eun(B.foeNm)} ${eul(T?.[0] || a[3])} 사용했다!`); if (!a[4]) await itemFx('e'); break; }   /* v21.89 Improved Item AI: 상대 트레이너 도구 */
    case '-dxrevive': { hbBalls('e'); tray(); await msg(`${eun(nmIn(a[2]))} 기운을 되찾았다!`); break; }
    case '-heal': { const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp, mhp] = hpOf(a[3]); if (mhp) X.mhp = mhp; const from = (a.find(x => /^\[from\] /.test(x)) || '').slice(7), sil = a.includes('[silent]');
      { const h = !sil && HEAL_FX[from.replace(/^(item|ability|move): /, '')]; if (h) await (h[0] === '_' ? moveFx(s, 'recover', false, h) : moveFx(s, h)); }
      await drainHp(s, X, hp); if (!sil) await msg(healMsg(who(a[2]), from)); break; }
    case '-sethp': { const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp] = hpOf(a[3]); await drainHp(s, X, hp); if (a.includes('[from] move: Pain Split') && !a.includes('[silent]')) await msg('서로의 체력을 나눠 가졌다!'); break; }   /* v21.30 고통나누기 문장 */
    case 'faint': { const s = sideOf(a[2]), X = A(s); if (!X) break; X.fnt = true; await faint(s, X); X.fntS = true; hbBalls(s); await msg(`${who(a[2]) === nmIn(a[2]) ? eun(X.nm) : '상대 ' + eun(X.nm)} 쓰러졌다!`); if (s === 'e') await expGain(X); break; }
    case '-immune': await gap(); await msg(`${who(a[2])}에게는 효과가 없는 것 같다…`); break;
    case '-miss': await gap(); await msg(a[3] ? `${who(a[3])}에게는 맞지 않았다!` : `${who(a[2])}의 공격은 빗나갔다!`); break;
    case '-fail': await wait(750); if (a.some(x => /^\[from\] ability: /.test(x))) { await msg(a[3] === 'unboost' ? `${who(a[2])}의 능력은 떨어지지 않는다!` : `${who(a[2])}에게는 효과가 없는 것 같다…`); break; } if (a.includes('[weak]')) { await msg('그러나 대타를 만들기에는 체력이 부족했다!'); break; } { const fw = (a.find(x => /^\[from\] /.test(x)) || '').slice(7); const T = { 'Primordial Sea': '강한 비 때문에 불꽃 타입 공격이 사라져 버렸다!', 'Desolate Land': '강한 햇살 때문에 물 타입 공격이 증발해 버렸다!' }; if (T[fw]) { await msg(T[fw]); break; } } await msg('그러나 실패했다!'); break;   /* v21.30: 체력 부족한 대타·시작의바다·끝의대지 문장 */   /* v20.75: 클리어바디·정신력 등 특성으로 막으면 그 문장 */   // 기술 이름을 읽을 틈 (경완 2026-10-29 '내던지기 > 그러나 실패했다! 너무 빨라')
    case '-nothing': await wait(750); await msg('그러나 아무 일도 일어나지 않았다!'); break;
    case '-status': { const s = sideOf(a[2]), X = A(s); if (a.some(x => /^\[from\] item: /.test(x))) await itemFx(s); if (X) { X.st = a[3]; setSt(s, a[3]); } await stFx(s, a[3]); await msg(statusMsg(who(a[2]), a[3])); break; }
    case '-curestatus': { const s = sideOf(a[2]), X = A(s); if (X) { X.st = ''; setSt(s, ''); } await msg(cureMsg(who(a[2]), a[3])); break; }
    case 'cant': if (/^ability: /.test(a[3] || '')) { const ab = toID(a[3].slice(9)), of = a.find(x => /^\[of\] /.test(x)); B.abLast = ''; await abPop(of ? of.slice(5) : a[2], ab); await msg(ab === 'truant' ? `${eun(who(a[2]))} 게으름을 피우고 있다!` : `${eun(who(a[2]))} ${a[4] ? eul(mvKo(toID(a[4]))) + ' ' : ''}쓸 수 없다!`); break; }
      if (ST_P[a[3]]) await stFx(sideOf(a[2]), a[3]); if (/Taunt|Imprison|Disable|Heal Block|Throat Chop|Gravity/.test(a[3] || '') && a[4]) { const mv = eul(mvKo(toID(a[4]))), w = a[3].replace('move: ', ''); await msg(`${eun(who(a[2]))} ${{ Taunt: '도발당한 상태라', Imprison: '봉인당해서', Disable: '사슬묶기 때문에', 'Heal Block': '회복봉인 때문에', 'Throat Chop': '지옥찌르기 때문에', Gravity: '중력 때문에' }[w] || ''} ${mv} 쓸 수 없다!`); break; } await msg(cantMsg(who(a[2]), a[3])); break;   /* v21.30: 도발·봉인 등으로 못 쓸 때 본가처럼 기술 이름 */
    case '-boost': case '-unboost': { const n = +a[4] || 0, up = k === '-boost', s = sideOf(a[2]); await statFx(s, up); await msg(`${who(a[2])}의 ${iga(STAT_KO[a[3]] || a[3])} ${n >= 3 ? '매우 크게 ' : n === 2 ? '크게 ' : n === 0 ? '더 이상 ' : ''}${n === 0 ? (up ? '올라가지 않는다!' : '떨어지지 않는다!') : up ? '올라갔다!' : '떨어졌다!'}`); break; }
    case '-weather': { const w = a[2]; wxSet(w); if (a.includes('[upkeep]')) { const u = { Sandstorm: ['sandstorm', '모래바람이 세차게 분다'], Hail: ['hail', '싸라기눈이 계속 내리고 있다'], Snow: ['hail', '눈이 계속 내리고 있다'], Snowscape: ['hail', '눈이 계속 내리고 있다'], RainDance: ['raindance', '비가 계속 내리고 있다'], SunnyDay: ['sunnyday', '햇살이 강하다'] }[w];   // 턴 끝마다 본가처럼 날씨 연출 (경완 2026-10-29)
        if (u) { await moveFx('p', u[0]); await msg(u[1], 300); } break; } const T = { RainDance: '비가 내리기 시작했다!', SunnyDay: '햇살이 강해졌다!', Sandstorm: '모래바람이 불기 시작했다!', Hail: '싸라기눈이 내리기 시작했다!', Snow: '눈이 내리기 시작했다!', Snowscape: '눈이 내리기 시작했다!', DesolateLand: '햇살이 아주 강해졌다!', PrimordialSea: '강한 비가 내리기 시작했다!', DeltaStream: '수수께끼의 난기류가 비행 포켓몬을 지킨다!', none: '날씨가 원래대로 돌아왔다!' };   /* v21.30: 설경·끝의대지·시작의바다·델타스트림 문장 */ if (T[w]) await msg(T[w]); break; }
    case '-mega': case '-primal': { const s = sideOf(a[2]), X = A(s); if (!X) break; const n = who(a[2]), tr = s === 'p' ? frTr() : B.foeNm;
      if (k === '-mega') { const st = PSim.Dex.items.get(a[4] || ''), stKo = gmStone(st), sfx = /Mega-([XYZ])$/.exec(PSim.Dex.species.get(msOf(st)).name || '')?.[1] || '';
        await msg(`${n}의 ${wa(stKo)} ${tr}의 키스톤이 반응했다!`); await gmFx(s, X, 'mega', a[4]); const mn = `메가${SPECIES[X.sp]?.n || X.nm}${sfx}`; await msg(`${eun(n)} ${mn}${ro(mn)} 메가진화했다!`); }
      else { await gmFx(s, X, 'primal'); await msg(`${n}의 원시회귀! 원시의 모습으로 돌아왔다!`); }
      break; }
    case '-zpower': { const s = sideOf(a[2]), L = B.btl.log; let zi = null; for (let j = B.li; j < Math.min(L.length, B.li + 6); j++) { const x = L[j].split('|'); if (x[1] === 'move' && x[2] === a[2]) { const zid = toID(x[3]), zm = PSim.Dex.moves.get(zid); zi = { id: zid, type: zm.type, item: B.btl[s === 'p' ? 'p1' : 'p2'].active[0]?.item }; break; } }
      await gmFx(s, A(s), 'z', zi); await msg(`${eun(who(a[2]))} Z파워를 몸에 둘렀다!`); break; }
    case '-zbroken': await msg(`${eun(who(a[2]))} 지키기를 뚫고 공격을 받았다!`); break;
    case '-terastallize': { const s = sideOf(a[2]), X = A(s); if (X) X.tera = a[3]; await gmFx(s, X, 'tera', a[3]); await msg(`${eun(who(a[2]))} 테라스탈하여 ${TYK[a[3]] || a[3]} 타입이 되었다!`); break; }
    case '-start': if (a[3] === 'Dynamax') { const s = sideOf(a[2]), X = A(s); if (!X) break; const gx = a[4] === 'Gmax', n = who(a[2]);
        if (gx) { const gf = toID(PSim.Dex.species.get(X.pk?.baseSpecies?.name || X.fm || '').baseSpecies || '') + 'gmax'; if (GMJ[gf]) { X.fm0 = X.fm; X.fm = gf; X.gif = await pickGif(s, X); } }
        B.gmx[s] = gx ? 2 : 1; await gmFx(s, X, 'dmax'); stPat(s, X.st); await msg(`${eun(n)} ${gx ? '거다이맥스' : '다이맥스'}했다!`); break; }
      // fallthrough
    case '-start': { if (/^ability: /.test(a[3] || '') || /^(protosynthesis|quarkdrive)/.test(a[3] || '') || (a[3] === 'typechange' && a[4] && !/^\[/.test(a[4]))) { const n = who(a[2]), w = a[3], ab = toID(w.replace('ability: ', '')), PQ = /^(protosynthesis|quarkdrive)(atk|def|spa|spd|spe)$/.exec(w);
        const t = w === 'typechange' ? `${eun(n)} ${a[4].split('/').map(x => TYK[x] || x).join('·')} 타입이 되었다!` : PQ ? `${n}의 ${iga(STAT_KO[PQ[2]])} 올라갔다!` : { flashfire: `${n}의 불꽃 기술 위력이 올라갔다!`, slowstart: `${eun(n)} 제대로 힘을 낼 수 없다!`, supremeoverlord: `${eun(n)} 쓰러진 동료들의 힘을 이어받았다!` }[ab] ?? ''; if (t) await msg(t); break; }
       if (/confusion/.test(a[3])) await confFx(sideOf(a[2])); if (/Substitute/.test(a[3])) subFx(sideOf(a[2]), true); const n2 = who(a[2]), t = a[3] === 'typeadd' ? `${n2}에게 ${TYK[a[4]] || a[4]} 타입이 추가되었다!` : a[3] === 'Mimic' && a[4] ? `${eun(n2)} ${eul(mvKo(toID(a[4])))} 배웠다!` : a[3] === 'typechange' && (!a[4] || /^\[/.test(a[4])) ? (a.find(x => /^\[of\] /.test(x)) ? `${eun(n2)} ${who(a.find(x => /^\[of\] /.test(x)).slice(5))}${wa(who(a.find(x => /^\[of\] /.test(x)).slice(5))).slice(-1)} 같은 타입이 되었다!` : '') : startMsg(n2, a[3]); if (t) await msg(t); break; }
    case '-end': if (a[3] === 'Dynamax') { const s = sideOf(a[2]), X = A(s); if (!X) break; B.gmx[s] = 0; if (X.fm0 != null) { X.fm = X.fm0; X.fm0 = null; X.gif = await pickGif(s, X); } await gmFx(s, X, 'undmax'); stPat(s, X.st); await msg(`${eun(who(a[2]))} 원래대로 돌아왔다!`); break; }
      // fallthrough
    case '-end': { if (/^ability: /.test(a[3] || '') || /^(protosynthesis|quarkdrive)$/.test(a[3] || '') || a[3] === 'Illusion' || /Slow Start/.test(a[3] || '')) { const n = who(a[2]), ab = toID((a[3] || '').replace('ability: ', '')); const t = { slowstart: `${eun(n)} 제 컨디션을 되찾았다!`, protosynthesis: `${n}의 고대활성 효과가 사라졌다!`, quarkdrive: `${n}의 쿼크차지 효과가 사라졌다!`, illusion: `${n}의 일루전이 풀렸다!`, neutralizinggas: '화학변화가스의 효과가 사라졌다!' }[ab] ?? ''; if (t) await msg(t); break; }
       if (/Substitute/.test(a[3])) subFx(sideOf(a[2]), false); const t = endMsg(who(a[2]), a[3]); if (t) await msg(t); break; }
    case '-activate': { if (/^ability: /.test(a[3] || '')) { const ab = toID(a[3].slice(9)); B.abLast = ''; if (ab === 'disguise' || ab === 'iceface') B.noHit = sideOf(a[2]); await abPop(a[2], ab); const of = a.find(x => /^\[of\] /.test(x)); if (AB_ACT[ab]) { const t = AB_ACT[ab](who(a[2])); if (t) await msg(t); } if ((ab === 'mummy' || ab === 'lingeringaroma') && /^p\d/.test(a[4] || '')) await msg(`${who(a[4])}의 특성이 ${iga(abKo(ab))} 되었다!`); if (ab === 'forewarn' && a[4]) await msg(`${who(a[2])}의 예지몽으로 ${of ? who(of.slice(5)) + '의 ' : ''}${eul(mvKo(toID(a[4])))} 알아챘다!`); break; }   /* v20.74 경완 '예지몽·싱크로 발동 안 된 것 같아': '-activate|…|ability: 이름' 줄(예지몽·싱크로·위기회피 등)을 안 보여 주던 것 → 특성 창 */
      if (/confusion/.test(a[3])) await confFx(sideOf(a[2])); else if (/^item: /.test(a[3] || '')) await itemFx(sideOf(a[2])); else await gap(); const of = a.find(x => /^\[of\] /.test(x)); const t = actMsg(who(a[2]), a[3], of ? who(of.slice(5)) : '상대', a.slice(4).filter(v => !/^\[/.test(v))); if (t) await msg(t); break; }
    case '-ability': await msg(`${who(a[2])}의 ${abKo(toID(a[3]))}!`, 500); break;
    case '-hitcount': B.mh = null; await msg(`${a[3]}번 맞았다!`); break;
    case '-ohko': await msg('일격필살!'); break;
    case '-prepare': { const id = toID(a[3]), n = who(a[2]), e = jong(nmIn(a[2])) ? '은' : '는';
      { const c = chgOf(id); if (c) await moveFx(sideOf(a[2]), id, false, c); } if (HIDE_MV.test(id)) monEl(sideOf(a[2])).classList.add('hid');   /* v18.17 경완 '솔라빔 연출이 없어': 모으는 턴은 _c 연출, 공격 턴은 본 연출 */
      const T = { fly: '하늘 높이 날아올랐다!', dig: '땅으로 파고들었다!', dive: '물속으로 숨었다!', bounce: '높이 뛰어올랐다!', phantomforce: '모습을 감췄다!', shadowforce: '모습을 감췄다!', solarbeam: '빛을 흡수했다!', solarblade: '빛을 흡수했다!', skullbash: '목을 움츠렸다!', skyattack: '격렬한 빛에 휩싸였다!', razorwind: '바람을 일으켰다!' };
      await msg(`${n}${e} ${T[id] || '힘을 모으고 있다!'}`); break; }
    case '-transform': { const s = sideOf(a[2]), X = A(s), T = A(other(s)); if (!X || !T) break;   // 변신: 상대 모습 그대로 (메타몽 등)
      await moveFx(s, 'transform'); X.sp = T.sp; X.tsp = T.tsp; X.fm = T.fm; X.g = T.g; X.gif = await pickGif(s, X); if (!B) break; showMon(s, X, true); playAnim(s, X);
      await msg(`${eun(who(a[2]))} ${T.nm}${jong(T.nm) ? '으로' : '로'} 변신했다!`); break; }
    case '-enditem': { const n = who(a[2]), it = itKo(a[3]), eat = a.includes('[eat]'), from = (a.find(x => /^\[from\] /.test(x)) || '').slice(7);
      if (/stealeat|move: (Knock Off|Thief|Covet|Bug Bite|Pluck|Incinerate)/i.test(from)) { await msg(`${n}의 ${eun(it)} 사라졌다!`); break; }
      if (eat) { await itemFx(sideOf(a[2])); await msg(`${eun(n)} ${eul(it)} 먹었다!`); break; }
      if (/Focus Sash|Focus Band/.test(a[3])) { await itemFx(sideOf(a[2])); await msg(`${eun(n)} ${it}${jong(it) ? '으로' : '로'} 버텼다!`); break; }
      if (/Air Balloon/.test(a[3])) { await msg(`${n}의 풍선이 터졌다!`); break; }
      if (/White Herb|Mental Herb|Power Herb/.test(a[3])) { await itemFx(sideOf(a[2])); await msg(`${eun(n)} ${eul(it)} 사용했다!`); break; }
      break; }
    case '-item': { const n = who(a[2]), it = itKo(a[3]), from = (a.find(x => /^\[from\] /.test(x)) || '').slice(7);
      if (/Air Balloon/.test(a[3])) await msg(`${eun(n)} 풍선으로 떠 있다!`);
      else if (/Frisk/.test(from)) await msg(`${eun(n)} ${eul(it)} 가지고 있다!`);
      else await msg(`${eun(n)} ${eul(it)} 얻었다!`); break; }
    case '-clearallboost': await msg('모든 능력 변화가 원래대로 돌아왔다!'); break;
    case '-clearboost': await msg(`${who(a[2])}의 능력 변화가 원래대로 돌아왔다!`); break;
    case '-clearnegativeboost': await msg(`${who(a[2])}의 떨어진 능력이 원래대로 돌아왔다!`); break;
    case '-setboost': if (/atk/.test(a[3])) { await statFx(sideOf(a[2]), true); await msg(`${eun(who(a[2]))} 체력을 깎아서 공격을 최대로 올렸다!`); } break;
    case '-block': { const ab = /^ability: /.test(a[3] || '') ? toID(a[3].slice(9)) : ''; const of = a.find(x => /^\[of\] /.test(x)); if (ab) { B.abLast = ''; await abPop(of ? of.slice(5) : a[2], ab); } await msg(ab && /veil/.test(ab) ? `${eun(who(a[2]))} 베일로 지켜지고 있다!` : `${who(a[2])}에게는 효과가 없는 것 같다…`); break; }
    case '-copyboost': await msg(`${eun(who(a[2]))} ${who(a[3] || a[2])}의 능력 변화를 복사했다!`); break;
    case '-swapboost': case '-invertboost': await msg(`${who(a[2])}의 능력 변화가 바뀌었다!`); break;
    case '-singleturn': { const w = (a[3] || '').replace('move: ', ''), n = who(a[2]), T = { Protect: `${eun(n)} 방어 태세에 들어갔다!`, Detect: `${eun(n)} 방어 태세에 들어갔다!`, Endure: `${eun(n)} 버티기 태세에 들어갔다!`, 'Focus Punch': `${eun(n)} 기합을 모으고 있다!`, 'Magic Coat': `${eun(n)} 매직코트로 몸을 감쌌다!`, Snatch: `${eun(n)} 상대가 기술을 쓰기를 기다리고 있다!`, 'Helping Hand': `${eun(n)} 돕기 태세에 들어갔다!`, 'Beak Blast': `${eun(n)} 부리를 가열하기 시작했다!`, 'Shell Trap': `${eun(n)} 트랩셸을 설치했다!`, Roost: '' }; const t = T[w] ?? ''; if (t) await msg(t); break; }
    case '-singlemove': { const w = (a[3] || '').replace('move: ', ''), n = who(a[2]), T = { 'Destiny Bond': `${eun(n)} 상대를 길동무로 삼으려 하고 있다!`, Grudge: `${eun(n)} 상대에게 원한을 품으려 하고 있다!`, Rage: '' }; const t = T[w] ?? ''; if (t) await msg(t); break; }
    case '-mustrecharge': break;
    case '-fieldactivate': { const w = (a[2] || '').replace('move: ', ''), t = { 'Perish Song': '멸망의노래를 들은 포켓몬은 3턴 후에 쓰러져 버린다!', 'Fairy Lock': '다음 턴에는 도망칠 수 없게 되었다!' }[w]; if (t) await msg(t); break; }   /* v21.30: 멸망의노래·페어리록 문장 */
    case '-sidestart': { const t = sideMsg(a[2], a[3], true); if (t) await msg(t); break; }
    case '-sideend': { const t = sideMsg(a[2], a[3], false); if (t) await msg(t); break; }
    case '-fieldstart': case '-fieldend': { const on = k === '-fieldstart', w = (a[2] || '').replace('move: ', ''), t = FIELD_T[w]; const tr = TERR[w];   // 필드 (경완 2026-10-29 '일렉트릭필드 발동이 안 됨')
      if (tr) { const f = $b('.bt-terr'); f.className = 'bt-terr' + (on ? ' on ' + tr : ''); }
      if (on && fa && toID(fa.slice(15)) === 'hadronengine' && of) { await msg(HADRON(who(of.slice(5)))); break; }   // v21.31: 하드론엔진으로 깔릴 땐 본가 SV 문장
      if (t) await msg(t[on ? 0 : 1]); break; }
    case '-formechange': case 'detailschange': case 'replace': { const s = sideOf(a[2]), X = A(s), m = monEl(s); if (!X) break; if (k === 'replace') { X.nm = nmIn(a[2]); X.sp = PSim.Dex.species.get((a[3] || '').split(', ')[0]).num || X.sp; X.tsp = X.sp; }   /* v20.75: 일루전이 풀리면 진짜 모습·이름으로 */   // 폼 체인지 (리밋실드·꼬르륵스위치·배틀스위치·탈 등): 하얗게 번쩍이며 그 폼 그림으로 (경완 2026-10-29)
      const fm = toID((a[3] || '').split(', ')[0]); if (fm === X.fm) break; X.fmPrev = X.fm; X.fm = fm; X.gif = await pickGif(s, X); if (!B) break;
      if (k === 'detailschange' && /^\|-(mega|primal)\|/.test(B.btl.log[B.li] || '')) { X.gmPend = 1; break; }   /* v21.89 메가진화·원시회귀는 그 줄에서 연출 */
      se('KOUKA_M', { pan: panOf(s) }); m.classList.remove('fmc'); void m.offsetWidth; m.classList.add('fmc'); await wait(260);
      m._tok = (m._tok || 0) + 1; showMon(s, X, true); playAnim(s, X); await wait(420); m.classList.remove('fmc');
      await msg(/busted/.test(fm) ? `${who(a[2])}의 탈이 벗겨졌다!` : `${who(a[2])}의 모습이 바뀌었다!`); break; }
    case '-pkevo': { const s = sideOf(a[2]), X = A(s), m = monEl(s); if (!X || s !== 'p') break; const to = +a[3], from = X.sp, P = GA.boxOf?.(X.pid), SP = GA.SPECIES, toN = SP[to]?.n || '', oldNm = X.nm;
      await msg(`어라…? ${oldNm}의 모습이…!`, 500); if (!B) break;
      const N = { ...X, sp: to, tsp: to, fm: toID(D.sp[to]?.id || ''), gif: null }; N.gif = await pickGif(s, N); if (!B) break;
      /* v21.52 경완 '한번 뜨고 우리 진화하는 화면으로 넘어가고 배틀로 돌아오는게 낫겠는데': 대사 뒤 본 게임 진화 화면(evolveWin, 진화 곡·확인·도감 카드) → 끝나면 배틀 곡이 다시 흐르고 새 모습으로 */
      const bg = window.GymBGM?.name; lowHp(false); M('stop', .5);
      /* v21.53 경완 '화면이 좀 밝아지면서 넘어가게': 배틀 화면이 하얗게 밝아진 뒤 진화 화면이 그 흰빛 아래서 열리고 걷힌다 */
      const wh = document.createElement('div'); wh.className = 'dfxWhite'; document.body.append(wh); void wh.offsetWidth; wh.classList.add('on'); await wait(450); if (B) { m._tok = (m._tok || 0) + 1; showMon(s, N, true); }   // 흰빛 뒤에서 배틀 그림은 미리 새 모습으로 (돌아왔을 때 옛 모습이 비치지 않게)
      setTimeout(() => { wh.classList.add('out'); wh.classList.remove('on'); setTimeout(() => wh.remove(), 700); }, 120);
      if (P && P.sp !== to) { try { await GA.evoRun(P, to); } catch (e) { console.error(e); } if (P.sp !== to) try { GA.evoSilent?.(P, to); } catch (e) { console.error(e); } }   // 진화 화면이 못 열리면(다른 진화·부화 중) 상태만
      if (!B) break; if (bg) M('play', bg, { fade: .6 });
      m._tok = (m._tok || 0) + 1; showMon(s, N, true); playAnim(s, N); await wait(420);
      Object.assign(X, { sp: to, tsp: to, fm: N.fm, gif: N.gif }); if (oldNm === SP[from]?.n) X.nm = toN; const E = B.my[X.i]; if (E) { E.sp = to; E.nm = X.nm; E.fm = P?.fm; }
      const [hp, mhp] = hpOf(a[4]); if (mhp) X.mhp = mhp; X.hp = hp; paintHb(s, X); break; }
    case 'turn': await egFlash(); break;
    case 'win': break;
  }
}
const TERR = { 'Electric Terrain': 'el', 'Grassy Terrain': 'gr', 'Misty Terrain': 'mi', 'Psychic Terrain': 'ps' };
const FIELD_T = { 'Electric Terrain': ['발밑에 전기가 흐르기 시작했다!', '발밑의 전기가 사라졌다!'], 'Grassy Terrain': ['발밑에 풀이 무성해졌다!', '발밑의 풀이 사라졌다!'], 'Misty Terrain': ['발밑에 안개가 자욱해졌다!', '발밑의 안개가 사라졌다!'], 'Psychic Terrain': ['발밑이 이상한 느낌이 되었다!', '발밑의 이상한 느낌이 사라졌다!'],
  'Trick Room': ['시공이 뒤틀렸다!', '뒤틀린 시공이 원래대로 돌아왔다!'], Gravity: ['중력이 강해졌다!', '중력이 원래대로 돌아왔다!'], 'Magic Room': ['도구의 효과가 사라지는 공간이 되었다!', '도구의 효과가 원래대로 돌아왔다!'], 'Wonder Room': ['방어와 특수방어가 뒤바뀌는 공간이 되었다!', '방어와 특수방어가 원래대로 돌아왔다!'], 'Mud Sport': ['전기의 위력이 약해졌다!', '흙놀이의 효과가 사라졌다!'], 'Water Sport': ['불꽃의 위력이 약해졌다!', '물놀이의 효과가 사라졌다!'] };
// 지속 데미지 연출: 씨뿌리기 = 심은 쪽이 흡수, 스텔스록·압정 = 박힘, 조이기류 = 그 기술, 저주·악몽 = 그 기술
const TRAP = { 'Bind': 'bind', 'Wrap': 'wrap', 'Fire Spin': 'firespin', 'Whirlpool': 'whirlpool', 'Sand Tomb': 'sandtomb', 'Magma Storm': 'magmastorm', 'Clamp': 'clamp', 'Infestation': 'infestation', 'Snap Trap': 'bind', 'Thunder Cage': 'bind' };
// 지닌 도구가 움직일 때 본가 공통 연출 HELD_ITEM (열매·기합의띠·하양허브·선제공격손톱·생명의구슬·독독구슬 등 모두, v19.19 경완 '도구 효과음도 다 본가 기준으로')
const itemFx = s => moveFx(s, 'recover', false, '_item');
async function resFx(s, from, a) {
  const f = from.replace(/^(move|item|ability): /, ''), of = (a.find(x => /^\[of\] /.test(x)) || '').slice(5);
  if (f === 'Leech Seed') return moveFx(of ? sideOf(of) : other(s), 'absorb');
  if (f === 'Stealth Rock' || f === 'Spikes') return;   // v13.17 경완 '본가 효과로': 플래티넘은 연출·깜빡임 없이 HP 가 줄고 나서 '뾰족한 바위가 박혔다' (subscript_hazards_check)
  if (TRAP[f]) return moveFx(other(s), mvOf(TRAP[f]) && MFX[TRAP[f]] ? TRAP[f] : 'bind');
  if (f === 'Curse' || f === 'Nightmare') return moveFx(other(s), f === 'Curse' ? 'curse' : 'nightmare');
  if (f === 'Sandstorm' || f === 'Hail' || f === 'confusion' || f === 'Recoil') return;
  if (/^item: (Life Orb|Black Sludge|Sticky Barb)$/.test(from)) return itemFx(s);   // 본가: 지닌 도구로 HP 가 줄 때도 도구 연출, 깜빡임 없음 (subscript_lose_hp_from_item_with_message)
  if (/^(Life Orb|Rocky Helmet|Rough Skin|Iron Barbs|Black Sludge|Sticky Barb|Solar Power|Dry Skin|Bad Dreams|Salt Cure|Aftermath|Liquid Ooze)$/.test(f)) return hitFx(s);
}
const HEAL_FX = { 'Leftovers': '_item', 'Black Sludge': '_item', 'Shell Bell': '_item',   /* v19.18 경완 '먹다남은음식 본가 기준?': 본가는 지닌 도구 공통 연출(HELD_ITEM — 빛 모임·흰 번쩍·몸 늘었다 줄었다 2번) */ 'Aqua Ring': 'aquaring', 'Ingrain': 'ingrain', 'Wish': 'wish', 'Grassy Terrain': 'aquaring', 'Rain Dish': 'aquaring', 'Ice Body': 'aquaring', 'Poison Heal': 'aquaring', 'Dry Skin': 'aquaring' };
const IT_KO = { 'Sitrus Berry': '자뭉열매', 'Oran Berry': '오렌열매', 'Lum Berry': '리샘열매', 'Focus Sash': '기합의띠', 'Focus Band': '기합의머리띠', 'Air Balloon': '풍선', 'White Herb': '하양허브', 'Mental Herb': '멘탈허브', 'Power Herb': '파워풀허브', 'Leftovers': '먹다남은음식', 'Life Orb': '생명의구슬', 'Choice Scarf': '구애스카프', 'Choice Band': '구애머리띠', 'Choice Specs': '구애안경', 'Chesto Berry': '유루열매', 'Cheri Berry': '버치열매', 'Pecha Berry': '복슝열매', 'Rawst Berry': '복분열매', 'Aspear Berry': '배리열매', 'Persim Berry': '시마열매', 'Leppa Berry': '과사열매', 'Liechi Berry': '치리열매', 'Salac Berry': '캄라열매', 'Petaya Berry': '야타비열매', 'Ganlon Berry': '용아열매', 'Apicot Berry': '규살열매' };
const itKo = nm => { const id = toID(nm || ''); return (HOLD[id] && HOLD[id][0]) || IT_KO[nm] || nm || '도구'; };
function healMsg(n, from) { if (from === 'drain') return `${eun(n)} 상대의 체력을 흡수했다!`; const f = from.replace(/^(move|item|ability): /, ''), T = { 'Leftovers': '먹다남은음식으로 조금 회복했다!', 'Black Sludge': '검은진흙으로 조금 회복했다!', 'Aqua Ring': '아쿠아링으로 체력을 회복했다!', 'Ingrain': '뿌리로부터 양분을 흡수했다!', 'Wish': '희망사항이 이루어졌다!', 'Shell Bell': '조개껍질방울로 조금 회복했다!', 'Grassy Terrain': '그래스필드로 체력이 회복되었다!' }; return T[f] ? `${eun(n)} ${T[f]}` : `${n}의 체력이 회복되었다!`; }
const dmgFrom = (f, id) => { const n = who(id); f = f.replace(/^item: |^ability: /, ''); const T = { brn: `${n}${jong(nmIn(id)) ? '은' : '는'} 화상 데미지를 입었다!`, psn: `${n}${jong(nmIn(id)) ? '은' : '는'} 독에 의한 데미지를 입었다!`, tox: `${n}${jong(nmIn(id)) ? '은' : '는'} 독에 의한 데미지를 입었다!`, Recoil: `${n}${jong(nmIn(id)) ? '은' : '는'} 공격의 반동을 받았다!`, confusion: '영문도 모른 채 자신을 공격했다!', Sandstorm: `모래바람이 ${n}${jong(nmIn(id)) ? '을' : '를'} 덮쳤다!`, Hail: `싸라기눈이 ${n}${jong(nmIn(id)) ? '을' : '를'} 덮쳤다!`, 'Leech Seed': `씨뿌리기가 ${n}의 체력을 빼앗는다!`, 'Stealth Rock': `뾰족한 바위가 ${n}에게 박혔다!`, Spikes: `${n}${jong(nmIn(id)) ? '은' : '는'} 압정의 데미지를 입었다!`, Curse: `${n}${jong(nmIn(id)) ? '은' : '는'} 저주를 받고 있다!`, Nightmare: `${n}${jong(nmIn(id)) ? '은' : '는'} 악몽에 시달리고 있다!`, 'Life Orb': `${n}${jong(nmIn(id)) ? '은' : '는'} 생명이 조금 깎였다!`, 'Rocky Helmet': `${n}${jong(nmIn(id)) ? '은' : '는'} 울퉁불퉁멧으로 데미지를 입었다!` };
  const tr = f.replace(/^move: /, ''); if (TRAP[tr]) return `${n}${jong(nmIn(id)) ? '은' : '는'} ${mvKo(toID(tr))}의 데미지를 입었다!`;   // v21.30: 썬더프리즌·집게덫이 '조이기'로 나오던 것
  const X2 = { recoil: `${eun(n)} 공격의 반동을 받았다!`, highjumpkick: `${eun(n)} 의욕이 넘쳐서 땅에 부딪쳤다!`, jumpkick: `${eun(n)} 의욕이 넘쳐서 땅에 부딪쳤다!`, 'Salt Cure': `${eun(n)} 소금절이 데미지를 입고 있다!`, 'Spiky Shield': `${eun(n)} 상처를 입었다!` }; return T[f] || X2[f] || ''; };
function statusMsg(n, st) { const T = { brn: '화상을 입었다!', par: '마비되어 기술이 나오기 어려워졌다!', slp: '잠들어 버렸다!', frz: '얼어붙었다!', psn: '독에 걸렸다!', tox: '맹독을 입었다!' }; return `${eun(n)} ${T[st] || '상태 이상이 되었다!'}`; }
function cureMsg(n, st) { const T = { slp: '눈을 떴다!', frz: '얼음 상태가 나았다!', par: '마비가 풀렸다!', brn: '화상이 나았다!', psn: '독이 사라졌다!', tox: '독이 사라졌다!' }; return `${eun(n)} ${T[st] || '상태가 나았다!'}`; }
function cantMsg(n, r) { const T = { par: '몸이 저려서 움직일 수 없다!', slp: '쿨쿨 잠들어 있다.', frz: '얼어버려서 움직일 수 없다!', flinch: '풀이 죽어 기술을 쓸 수 없었다!', recharge: '공격의 반동으로 움직일 수 없다!', nopp: '기술의 남은 PP 가 없다!' }; return `${eun(n)} ${T[r] || '움직일 수 없다!'}`; }
function startMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${eun(n)} 혼란에 빠졌다!`, Substitute: `${n}의 대타가 나타났다!`, 'Leech Seed': `${n}에게 씨앗을 심었다!`, Taunt: `${eun(n)} 도발에 넘어가 버렸다!`, Encore: `${eun(n)} 앙코르를 받았다!`, Attract: `${eun(n)} 헤롱헤롱해졌다!`, typechange: '', 'Focus Energy': `${eun(n)} 의욕이 넘치고 있다!`, Disable: `${n}의 기술을 쓸 수 없게 되었다!`, Yawn: `${eun(n)} 졸음이 오기 시작했다!`, perish3: `${n}의 멸망의 카운트가 3이 되었다!`, perish2: `${n}의 멸망의 카운트가 2가 되었다!`, perish1: `${n}의 멸망의 카운트가 1이 되었다!`, perish0: `${n}의 멸망의 카운트가 0이 되었다!`, Torment: `${eun(n)} 트집을 잡혔다!`, 'Magnet Rise': `${eun(n)} 전자력으로 떠올랐다!`, 'Aqua Ring': `${eun(n)} 물의 베일로 몸을 감쌌다!`, Ingrain: `${eun(n)} 뿌리를 뻗었다!`, Curse: `${eun(n)} 저주를 받았다!`, Nightmare: `${eun(n)} 악몽을 꾸기 시작했다!`, 'Heal Block': `${eun(n)} 회복할 수 없게 되었다!`, Embargo: `${eun(n)} 도구를 쓸 수 없게 되었다!`, Stockpile: '', Charge: `${eun(n)} 전기를 모으고 있다!`, Imprison: `${eun(n)} 봉인을 걸었다!`, Telekinesis: `${eun(n)} 공중에 떠올랐다!`, 'Smack Down': `${eun(n)} 떨어졌다!`, 'Salt Cure': `${eun(n)} 소금에 절여졌다!`, 'Future Sight': `${eun(n)} 미래를 예지했다!`, 'Doom Desire': `${eun(n)} 파멸의소원을 미래에 맡겼다!`, Uproar: `${eun(n)} 소란을 피우고 있다!` }; return T[w] ?? ''; }
function endMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${n}의 혼란이 풀렸다!`, Substitute: `${n}의 대타는 사라져 버렸다…`, Taunt: `${n}의 도발 효과가 풀렸다!`, Encore: `${n}의 앙코르 상태가 풀렸다!`, Disable: `${n}의 사슬묶기가 풀렸다!`, Yawn: '', 'Magnet Rise': `${n}의 전자력이 사라졌다!`, 'Heal Block': `${n}의 회복봉인이 풀렸다!`, Torment: '', 'Leech Seed': `${n}의 씨앗이 떨어졌다!`, 'Salt Cure': '', 'Future Sight': `${eun(n)} 미래예지 공격을 받았다!`, 'Doom Desire': `${eun(n)} 파멸의소원 공격을 받았다!`, ...Object.fromEntries(Object.keys(TRAP).map(k => [k, `${eun(n)} ${mvKo(toID(k))}에서 풀려났다!`])) }; return T[w] ?? ''; }
const TYK = { Normal: '노말', Fire: '불꽃', Water: '물', Grass: '풀', Electric: '전기', Ice: '얼음', Fighting: '격투', Poison: '독', Ground: '땅', Flying: '비행', Psychic: '에스퍼', Bug: '벌레', Rock: '바위', Ghost: '고스트', Dragon: '드래곤', Dark: '악', Steel: '강철', Fairy: '페어리', Stellar: '스텔라' };
/* v20.75 경완 '효과나 문장 빼먹은 특성 검토': 특성 줄('ability: 이름')이 따로 오는 cant·-block·-start·-end·-activate 에 특성 창+본가 문장 */
const AB_ANN = { pressure: n => `${eun(n)} 프레셔를 발하고 있다!`, moldbreaker: n => `${eun(n)} 틀깨기다!`, teravolt: n => `${eun(n)} 파직파직한 오라를 발하고 있다!`, turboblaze: n => `${eun(n)} 활활 타오르는 오라를 발하고 있다!`, airlock: () => '날씨의 영향이 없어졌다!', cloudnine: () => '날씨의 영향이 없어졌다!', unnerve: (n, id) => `${sideOf(id) === 'p' ? '상대 편' : '우리 편'}은 긴장해서 나무열매를 먹을 수 없게 되었다!`, asoneglastrier: (n, id) => `${sideOf(id) === 'p' ? '상대 편' : '우리 편'}은 긴장해서 나무열매를 먹을 수 없게 되었다!`, asonespectrier: (n, id) => `${sideOf(id) === 'p' ? '상대 편' : '우리 편'}은 긴장해서 나무열매를 먹을 수 없게 되었다!`, darkaura: n => `${eun(n)} 다크오라를 발하고 있다!`, fairyaura: n => `${eun(n)} 페어리오라를 발하고 있다!`, aurabreak: n => `${eun(n)} 모든 오라를 제압한다!`, comatose: n => `${eun(n)} 꿈속을 헤매고 있다!`, neutralizinggas: () => '주변이 화학변화가스로 가득 찼다!', vesselofruin: n => `${n}의 재앙의그릇으로 주위의 특수공격이 약해졌다!`, swordofruin: n => `${n}의 재앙의검으로 주위의 방어가 약해졌다!`, tabletsofruin: n => `${n}의 재앙의목간으로 주위의 공격이 약해졌다!`, beadsofruin: n => `${n}의 재앙의구슬로 주위의 특수방어가 약해졌다!` };   // v21.30: 나올 때 특성 창 다음 본가 문장
const HADRON = n => `${eun(n)} 일렉트릭필드를 전개하여 미래 기관을 가동했다!`;   // v21.31 경완 '기억 안 나면 검색': 나무위키 특성 문서 — 이미 일렉트릭필드여도 나올 때 이 문장
const AB_ACT = { hadronengine: HADRON, stickyhold: n => `${n}의 도구는 빼앗을 수 없다!`, suctioncups: n => `${eun(n)} 흡반으로 단단히 달라붙어 있다!`, quickdraw: n => `${eun(n)} 퀵드로로 먼저 행동할 수 있게 되었다!`, telepathy: n => `${eun(n)} 아군의 공격을 피했다!`, guarddog: n => `${eun(n)} 밀려나지 않는다!`, magicguard: () => '', disguise: n => `${n}의 탈이 대신 공격을 받았다!`, icface: () => '', screencleaner: () => '모든 벽이 사라졌다!', symbiosis: n => `${eun(n)} 도구를 건네주었다!`, battlebond: n => `${eun(n)} 트레이너와의 유대가 깊어졌다!`, mimicry: n => `${n}의 타입이 원래대로 돌아왔다!` };
function actMsg(n, w, o = '상대', x = []) { w = (w || '').replace('move: ', ''); const T = { confusion: `${eun(n)} 혼란에 빠져 있다!`, Protect: `${eun(n)} 공격으로부터 몸을 지켰다!`, Substitute: '대타가 대신 공격을 받았다!', 'Destiny Bond': `${eun(n)} 상대를 길동무로 삼았다!`, Endure: `${eun(n)} 공격을 버텼다!`,
    // v21.30 경완 '본가랑 다른 거 검토': 묶는 기술 시작·헤롱헤롱·흰안개·방울소리·원한 등 본가 문장
    Bind: `${eun(n)} ${o}에게 조이기를 당했다!`, Wrap: `${eun(n)} ${o}에게 김밥말이를 당했다!`, 'Fire Spin': `${eun(n)} 불꽃의 소용돌이에 갇혔다!`, Whirlpool: `${eun(n)} 소용돌이에 갇혔다!`, 'Sand Tomb': `${eun(n)} 모래지옥에 갇혔다!`, 'Magma Storm': `${eun(n)} 마그마의 소용돌이에 갇혔다!`, Clamp: `${eun(o)} ${eul(n)} 껍질에 끼웠다!`, Infestation: `${eun(n)} ${o}에게 엉겨붙기를 당했다!`, 'Snap Trap': `${eun(n)} 집게덫에 걸렸다!`, 'Thunder Cage': `${eun(o)} ${eul(n)} 가두었다!`,
    'Fickle Beam': `${eun(n)} 전력을 다하기 시작했다!`,   // v21.36 경완이 붙여 준 나무위키 변덕레이저 문장
    Attract: `${eun(n)} ${o}에게 헤롱헤롱하다!`, Mist: `${eun(n)} 흰안개에 지켜지고 있다!`, 'Heal Bell': '방울소리가 울려 퍼졌다!', Aromatherapy: '기분 좋은 향기가 퍼졌다!', 'Lock-On': `${eun(n)} ${eul(o)} 겨냥했다!`, 'Mind Reader': `${eun(n)} ${eul(o)} 겨냥했다!`,
    Spite: x[0] ? `${n}의 ${mvKo(toID(x[0]))}의 PP가 ${x[1] || ''} 줄었다!` : '', 'Eerie Spell': x[0] ? `${n}의 ${mvKo(toID(x[0]))}의 PP가 ${x[1] || ''} 줄었다!` : '', Sketch: x[0] ? `${eun(n)} ${eul(mvKo(toID(x[0])))} 스케치했다!` : '',
    'Psychic Terrain': `${eun(n)} 사이코필드에 지켜지고 있다!`, 'Quick Guard': `${eun(n)} 퍼스트가드로 지켜지고 있다!`, 'Wide Guard': `${eun(n)} 와이드가드로 지켜지고 있다!`, 'Crafty Shield': `${eun(n)} 트릭가드로 지켜지고 있다!`, 'Mat Block': `${eun(n)} 다다미가드로 지켜지고 있다!`,
    Struggle: `${n}에게는 쓸 수 있는 기술이 없다!`, 'Skill Swap': `${eun(n)} 서로의 특성을 바꿨다!`, 'Speed Swap': `${eun(n)} ${wa(o)} 스피드를 바꿨다!`, 'Power Split': `${eun(n)} 상대와 힘을 나누었다!`, 'Guard Split': `${eun(n)} 상대와 수비를 나누었다!`, trapped: `${eun(n)} 도망칠 수 없다!` }; return T[w] ?? ''; }
function sideMsg(sd, w, on) { const mine = sd.startsWith('p1'), who2 = mine ? '우리 편' : '상대 편'; w = (w || '').replace('move: ', ''); const T = { Reflect: on ? `리플렉터로 ${who2}의 물리 공격에 강해졌다!` : `${who2}의 리플렉터가 사라졌다!`, 'Light Screen': on ? `빛의장막으로 ${who2}의 특수 공격에 강해졌다!` : `${who2}의 빛의장막이 사라졌다!`, Spikes: on ? `${who2} 발밑에 압정이 뿌려졌다!` : '', 'Stealth Rock': on ? `${who2} 주변에 뾰족한 바위가 떠다니기 시작했다!` : '', Tailwind: on ? `${who2}에 순풍이 불기 시작했다!` : `${who2}의 순풍이 멈췄다!`, Safeguard: on ? `${who2}는 신비의 베일에 감싸였다!` : `${who2}의 신비의 베일이 사라졌다!`, 'Toxic Spikes': on ? `${who2} 발밑에 독압정이 뿌려졌다!` : `${who2} 발밑의 독압정이 사라졌다!`, 'Sticky Web': on ? `${who2} 발밑에 끈적끈적네트가 펼쳐졌다!` : '', Mist: on ? `${who2}는 흰안개에 둘러싸였다!` : `${who2}의 흰안개가 사라졌다!`, 'Lucky Chant': on ? `행운의 주문으로 ${who2}에 급소가 맞지 않게 되었다!` : '', 'Aurora Veil': on ? `오로라베일로 ${who2}의 물리·특수 공격에 강해졌다!` : `${who2}의 오로라베일이 사라졌다!` }; return T[w] || ''; }

// ---------- 연출 (4세대 느낌. 기술별 본가 연출은 다음 단계에서 기술마다 붙인다) ----------
const TY_FX = { 10: '#ff7a30', 11: '#48a0ff', 13: '#ffe040', 15: '#a8f0ff', 4: '#c060e0', 8: '#7058a8', 18: '#ff9ed8', 6: '#b8a058', 5: '#d8b060', 2: '#e05030', 14: '#ff70b0', 12: '#68d048', 3: '#a8c8ff', 7: '#a8c020', 9: '#c8c8d8', 16: '#7050f0', 17: '#504048', 1: '#f8f8f8' };
// 기술 연출: 플래티넘 원본 대본(gym/mvfx.json, tools/gym/mkanim.py)대로 소리·흔들기·움직임·배경·색 번쩍을 같은 박자(1/30초)에.
// 파티클은 원본 방출기 그대로 gymb/spl.js 가 그린다 ('p' 사건). 대본이 없는 기술만 타입 색 불꽃('e').
const FR = 1000 / 30;
const CTR = { e: [176, 56], p: [80, 104] };
const other = s => s === 'p' ? 'e' : 'p';
function tintOf(side) {   // 포켓몬 색 덮기용 SVG 필터 (한 번 만든다)
  let f = el.querySelector(`#btTint${side}`);
  if (!f) {
    let svg = el.querySelector('svg.bt-defs');
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'bt-defs'); svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute'; el.appendChild(svg); }
    svg.insertAdjacentHTML('beforeend', `<filter id="btTint${side}" color-interpolation-filters="sRGB"><feFlood flood-color="#fff" flood-opacity="0"/><feComposite in2="SourceAlpha" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge></filter>`);
    f = el.querySelector(`#btTint${side}`);
  }
  return f.querySelector('feFlood');
}
function emit(where, s, col, ms) {
  const fx = $b('.bt-fx'), [ax, ay] = CTR[s], [dx, dy] = CTR[other(s)];
  const one = (x, y, tx, ty, d) => { const i = document.createElement('i'); i.className = 'em'; i.style.left = x + 'px'; i.style.top = y + 'px'; i.style.setProperty('--c', col); i.style.setProperty('--dx', tx + 'px'); i.style.setProperty('--dy', ty + 'px'); i.style.animationDuration = d + 'ms'; fx.appendChild(i); setTimeout(() => i.remove(), d + 50); };
  if (where === 'ad' || where === 'da') {
    const [x0, y0, x1, y1] = where === 'ad' ? [ax, ay, dx, dy] : [dx, dy, ax, ay];
    for (let k = 0; k < 6; k++) setTimeout(() => B && one(x0 + rnd(-4, 4), y0 + rnd(-4, 4), x1 - x0 + rnd(-6, 6), y1 - y0 + rnd(-6, 6), ms * .7), k * ms / 14);
    return;
  }
  const [x, y] = where === 'a' ? [ax, ay] : where === 'c' ? [128, 80] : [dx, dy];
  for (let k = 0; k < 9; k++) { const t = k / 9 * Math.PI * 2 + rnd(0, .5), r = rnd(14, 28); setTimeout(() => B && one(x + rnd(-6, 6), y + rnd(-6, 6), Math.cos(t) * r, Math.sin(t) * r * .8, ms * .8), k * ms / 30); }
}
const MV_REP = { 1: ['tackle', 'hypervoice', 'growl'], 2: ['brickbreak', 'aurasphere', 'bulkup'], 3: ['wingattack', 'airslash', 'roost'], 4: ['poisonjab', 'sludgebomb', 'toxic'], 5: ['earthquake', 'earthpower', 'mudsport'],
  6: ['rockslide', 'ancientpower', 'stealthrock'], 7: ['xscissor', 'bugbuzz', 'tailglow'], 8: ['shadowclaw', 'shadowball', 'confuseray'], 9: ['ironhead', 'flashcannon', 'irondefense'], 10: ['firepunch', 'flamethrower', 'willowisp'],
  11: ['waterfall', 'surf', 'raindance'], 12: ['leafblade', 'energyball', 'synthesis'], 13: ['thunderpunch', 'thunderbolt', 'thunderwave'], 14: ['zenheadbutt', 'psychic', 'calmmind'], 15: ['icepunch', 'icebeam', 'hail'],
  16: ['dragonclaw', 'dragonpulse', 'dragondance'], 17: ['crunch', 'darkpulse', 'nastyplot'], 18: ['tackle', 'charm', 'charm'] };
// 원본 대본에서 포켓몬 그림 조작(어둡게·늘이기 등)이 빠져 소리만 나던 기술 31개에 비슷한 움직임을 더한다 (경완 2026-10-28 '나이트헤드 연출이 없음')
// [종류, 시각(1/30초), …] — f 색 덮기 [대상, 색, 세기(16), 길이] / k 흔들기 [대상, x, y, 간격, 횟수] / m 움직임 [대상, x, y, 프레임] / z 늘이기 [대상, 가로, 세로, 길이] / e 불꽃 [대상, 길이]
const MFX_ADD = {
  psychic: [['y', 3, 'd', 27, 9], ['f', 6, 'd', '#e070d0', 9, 22]],   /* v16.20 경완 '사이코키네시스 효과가 없네': 본가처럼 맞는 쪽이 일렁이고 분홍 빛 */
  confusion: [['y', 3, 'd', 21, 6]],
  nightshade: [['f', 6, 'a', '#201830', 16, 30], ['e', 24, 'ad', 16], ['f', 40, 'd', '#000', 14, 16], ['k', 40, 'd', 3, 0, 1, 5]],
  constrict: [['f', 2, 'd', '#c8a060', 10, 16], ['z', 2, 'd', .85, 1, 16], ['k', 6, 'd', 2, 0, 1, 5]],
  magnitude: [['k', 0, 'bg', 4, 2, 1, 10], ['k', 0, 'd', 4, 0, 1, 10]],
  glare: [['f', 4, 'a', '#ffd040', 14, 12], ['e', 10, 'ad', 10], ['k', 22, 'd', 1, 0, 1, 4]],
  meanlook: [['f', 4, 'a', '#000', 12, 16], ['k', 22, 'd', 1, 0, 1, 4]],
  scaryface: [['z', 0, 'a', 1.15, 1.15, 16], ['f', 4, 'a', '#000', 10, 14], ['k', 20, 'd', 2, 0, 1, 5]],
  bulkup: [['z', 0, 'a', 1.1, 1.05, 12], ['z', 14, 'a', 1.1, 1.05, 12], ['f', 0, 'a', '#e05030', 10, 26]],
  growth: [['z', 0, 'a', 1.15, 1.15, 20], ['f', 0, 'a', '#60c050', 10, 22]],
  meditate: [['f', 0, 'a', '#e080f0', 12, 26], ['m', 0, 'a', 0, -4, 6], ['m', 14, 'a', 0, 4, 6]],
  irondefense: [['f', 0, 'a', '#d8d8e8', 14, 24]],
  minimize: [['z', 0, 'a', .5, .5, 24]],
  camouflage: [['f', 0, 'a', '#80b880', 12, 24]],
  flash: [['f', 0, 'd', '#fff', 16, 14], ['f', 0, 'a', '#fff', 12, 10]],
  foresight: [['f', 6, 'd', '#ff5050', 10, 12], ['f', 20, 'd', '#ff5050', 10, 12]],
  lockon: [['f', 6, 'd', '#ff3030', 12, 10], ['k', 6, 'd', 1, 0, 1, 3]],
  kinesis: [['f', 0, 'a', '#e080f0', 10, 16], ['k', 8, 'd', 2, 0, 1, 6]],
  tailwhip: [['m', 0, 'a', 5, 0, 2], ['m', 3, 'a', -10, 0, 3], ['m', 7, 'a', 10, 0, 3], ['m', 11, 'a', -5, 0, 2]],
  metronome: [['m', 0, 'a', 4, 0, 3], ['m', 4, 'a', -8, 0, 4], ['m', 9, 'a', 8, 0, 4], ['m', 14, 'a', -4, 0, 3]],
  assist: [['m', 0, 'a', 0, -6, 3], ['m', 5, 'a', 0, 6, 3], ['f', 0, 'a', '#ffffff', 8, 12]],
  followme: [['m', 0, 'a', 0, -6, 3], ['m', 5, 'a', 0, 6, 3], ['m', 10, 'a', 0, -6, 3], ['m', 15, 'a', 0, 6, 3]],
  memento: [['f', 0, 'a', '#000', 16, 26], ['f', 24, 'd', '#000', 10, 14]],
  grudge: [['f', 0, 'd', '#6040a0', 12, 20]],
  spite: [['f', 0, 'd', '#6040a0', 12, 16], ['k', 8, 'd', 2, 0, 1, 4]],
  torment: [['f', 0, 'd', '#e04838', 10, 16], ['k', 4, 'd', 2, 0, 1, 6]],
  swagger: [['z', 0, 'a', 1.1, 1.1, 14], ['k', 14, 'd', 2, 0, 1, 4]],
  roleplay: [['m', 0, 'a', 12, -4, 4], ['m', 10, 'a', -12, 4, 4]],
  trick: [['m', 0, 'a', 10, 0, 4], ['m', 0, 'd', 10, 0, 4], ['m', 8, 'a', -10, 0, 4], ['m', 8, 'd', -10, 0, 4]],
  switcheroo: [['m', 0, 'a', 10, 0, 4], ['m', 0, 'd', 10, 0, 4], ['m', 8, 'a', -10, 0, 4], ['m', 8, 'd', -10, 0, 4]],
  doomdesire: [['k', 30, 'd', 3, 0, 1, 6]],
  trickroom: [['k', 0, 'bg', 2, 2, 1, 8]],
};
function mfxAdd() { for (const [k, L] of Object.entries(MFX_ADD)) { const v = MFX[k]; if (!v) continue;
  (Array.isArray(v[0]) ? v : [v]).forEach(A => { if (A.added) return; A.added = 1; A[1].push(...L); A[0] = Math.max(A[0], ...L.map(e => e[1] + (e[0] === 'k' ? (e[5] + 1) * e[6] * 2 : e[0] === 'e' || e[0] === 'y' ? e[3] : e[0] === 'z' ? e[5] : e[0] === 'f' ? e[5] : e[5] || 4))); }); } }
// 본가 연출이 어색한 기술은 다른 기술 연출로 (경완 2026-10-30 '세차게 휘두르기 모션 물기라서 어색해' → 몸을 휘둘러 치는 힘껏치기)
const MV_SUB = { thrash: 'slam' };
const MV_LIKE = { falsesurrender: 'feintattack', honeclaws: 'sharpen', poweruppunch: 'megapunch', jetpunch: 'machpunch', ragefist: 'shadowpunch', plasmafists: 'thunderpunch', brutalswing: 'thrash' };   /* v14.91 경완 '세차게휘두르기가 물기 모션': 몸을 휘두르는 난동부리기 연출로 */   /* v14.08 경완 '손톱갈기 모션 어색': 악 타입 변화 대표(나쁜음모 검은 기운) 대신 같은 '갈아서 날 세우기' 기술인 각지기 연출 */
// v13.17 경완 '울음소리 기술은 포켓몬 울음소리': 본가 플래티넘 연출(PlayPokemonCry)처럼 쓰는 포켓몬의 울음소리
const CRY_MV = new Set(['growl', 'roar', 'howl', 'hypervoice', 'chatter', 'nobleroar', 'snarl', 'partingshot', 'echoedvoice', 'round', 'boomburst', 'disarmingvoice', 'relicsong', 'sparklingaria', 'overdrive', 'clangingscales', 'torchsong', 'alluringvoice', 'psychicnoise']);   // v14.81 경완 '에코보이스 효과음 없음': 하이퍼보이스 연출을 빌리는 5세대 이후 소리 기술도 울음소리
// 2턴 기술 모으는 턴 연출 (mvfx.json 의 기술id_c). 플래티넘에 없는 기술은 비슷한 기술 것으로
const CHG_LIKE = { solarblade: 'solarbeam', phantomforce: 'shadowforce', skydrop: 'fly', meteorbeam: 'skullbash', electroshot: 'skullbash', geomancy: 'solarbeam', freezeshock: 'skyattack', iceburn: 'skyattack' };
const chgOf = id => MFX[id + '_c'] ? id + '_c' : CHG_LIKE[id] && MFX[CHG_LIKE[id] + '_c'] ? CHG_LIKE[id] + '_c' : null;
async function moveFx(s, id, miss, fx) {
  const m = mvOf(id); if (!m || miss) return; const ty = m[2], cat = fx ? 2 : m[3], col = TY_FX[ty] || '#fff';
  if (CRY_MV.has(id)) { const X = B.act[s]; try { if (X) GA.cry?.(X.sp, 0, 1, CRY_K); } catch (e) {} }
  let A = MFX[fx || MV_SUB[id] || id]; if (A && Array.isArray(A[0])) A = A[s === 'p' ? 0 : 1];
  // 5세대 이후 주먹 기술은 비슷한 4세대 주먹 연출로 (경완 2026-10-29 '그로우펀치가 당수 모션')
  if (!A && MV_LIKE[id]) { A = MFX[MV_LIKE[id]]; if (A && Array.isArray(A[0])) A = A[s === 'p' ? 0 : 1]; }
  // 5세대 이후 기술: 같은 타입·분류의 4세대 기술 연출을 빌린다
  if (!A) { const r = MV_REP[ty]?.[cat]; A = r && MFX[r]; if (A && Array.isArray(A[0])) A = A[s === 'p' ? 0 : 1]; }
  if (!A) {   // 그래도 없으면 분류에 따라 간단히
    A = cat === 0 ? [14, [['s', 0, '050', 'd'], ['m', 0, 'a', 14, -8, 2], ['e', 2, 'd', 12], ['k', 2, 'd', 2, 0, 1, 2], ['m', 4, 'a', -14, 8, 2]]]
      : cat === 1 ? [26, [['s', 0, 'W207', 'm'], ['e', 0, 'ad', 18], ['e', 14, 'd', 12], ['k', 16, 'd', 2, 0, 1, 2]]]
      : [20, [['s', 0, 'W287', 'a'], ['f', 0, 'a', col, 10, 20]]];
  }
  // 원본 대본에 몸 움직임이 없는 공격 기술(쪼기·흡수 등): 파티클만으론 잘 안 보여서 쳐들어가기·맞고 흔들림을 덧붙인다 (경완 2026-10-29 '쪼기 모션 및 효과 없음')
  if (cat < 2 && !A[1].some(e => e[0] === 'm' || e[0] === 'k')) {
    const hit = A[1].find(e => e[0] === 's' && e[3] === 'd')?.[1] ?? Math.round(A[0] / 2), n = Math.max(3, Math.round(A[0] / 3));
    A = [A[0], [...A[1], ...(/^(earthquake|magnitude)$/.test(id) ? [['k', 0, 'bg', 3, 0, 1, n], ['k', 0, 'd', 3, 0, 1, n]]
      : cat === 0 ? [['m', Math.max(0, hit - 3), 'a', 14, -8, 2], ['m', hit + 1, 'a', -14, 8, 2], ['k', hit, 'd', 2, 0, 1, 3]] : [['k', hit, 'd', 2, 0, 1, 3]])]];
  }
  // 자기에게 쓰는 기술(달빛·HP회복 등): 본가처럼 맞는 쪽 = 쓰는 쪽 (v19.18 경완 '달빛 회복 효과는 내 포켓몬 위에')
  const tg = window.PSim?.Dex.moves.get(id)?.target, me = tg === 'self' || tg === 'adjacentAllyOrSelf' || tg === 'allySide' || tg === 'allies';
  const sp = B.fast ? .6 : 1, F = FR * sp, side = w => w === 'a' || me ? s : other(s), mw = w => $b(`.bt-mw.${side(w)}`);
  const pan = w => w === 'a' ? panOf(s) : w === 'd' ? panOf(side('d')) : 0;
  // 원본 파티클: 그림을 다 받은 뒤 다른 연출과 같은 박자로 시작
  let spl = null;
  if (A[1].some(e => e[0] === 'p')) {
    await Promise.race([loadSpl(), wait(1500)]);
    if (window.GymSPL && B) { spl = window.GymSPL.start($b('.bt-ptc'), A[1], s, F, VER, me); await Promise.race([spl.ready, wait(2000)]); }
    if (!B) { spl?.stop(); return; }
    spl?.go();
  }
  const pos = { p: [0, 0], e: [0, 0] }, setPos = sd => { $b(`.bt-mw.${sd}`).style.translate = `${pos[sd][0]}px ${pos[sd][1]}px`; };
  const job = [];
  for (const e of A[1]) {
    const t = e[1] * F, k = e[0];
    job.push(new Promise(res => setTimeout(() => { if (!B) return res();
      if (k === 's') se(e[2], { pan: e[3] === 'm' ? 0 : pan(e[3]) });
      else if (k === 'k') {
        const tg = e[2] === 'bg' ? [$b('.bt-bg')] : e[2] === 'ad' ? [mw('a'), mw('d')] : [mw(e[2])], n = Math.max(1, e[6]) * 2, iv = (e[5] + 1) * F;
        tg.forEach(x => x.animate(Array.from({ length: n + 1 }, (_, i) => ({ transform: i === n ? 'none' : `translate(${(i % 2 ? -1 : 1) * e[3]}px,${(i % 2 ? -1 : 1) * e[4]}px)` })), { duration: n * iv, easing: `steps(${n})` }));
      } else if (k === 'm') {
        const sd = side(e[2]), fl = sd === 'e' ? -1 : 1, fr = Math.max(1, e[5]); const p0 = [...pos[sd]];
        pos[sd] = [p0[0] + e[3] * fl, p0[1] + e[4] * fl];
        $b(`.bt-mw.${sd}`).animate([{ translate: `${p0[0]}px ${p0[1]}px` }, { translate: `${pos[sd][0]}px ${pos[sd][1]}px` }], { duration: fr * F, easing: `steps(${fr})`, fill: 'forwards' }); setPos(sd);
      } else if (k === 'b') {
        const d = $b('.bt-dim'); d.style.background = e[4]; d.style.setProperty('--fd', e[5] * F + 'ms'); d.style.opacity = e[3] / 16 * .75;
      } else if (k === 'f') {
        const fl = tintOf(side(e[2])), c = monEl(side(e[2])).querySelector('.clip'); fl.setAttribute('flood-color', e[3] === '#fff' ? '#fff' : e[3]); c.style.filter = `url(#btTint${side(e[2])})`;
        const half = e[5] / 2 * F, t0 = performance.now(), mx = Math.min(1, e[4] / 16);
        const step = () => { const u = (performance.now() - t0) / half; if (u >= 2 || !B) { fl.setAttribute('flood-opacity', 0); c.style.filter = ''; return; } fl.setAttribute('flood-opacity', (u < 1 ? u : 2 - u) * mx); requestAnimationFrame(step); }; step();
      } else if (k === 'e') emit(e[2], s, col, Math.max(10, e[3]) * F);
      else if (k === 'h') monEl(side(e[2])).style.visibility = e[3] ? 'hidden' : '';
      else if (k === 'z') { const c = monEl(side(e[2])).querySelector('.clip'); c.style.transformOrigin = '50% 100%'; c.animate([{ transform: 'none' }, { transform: `scale(${e[3]},${e[4]})` }, { transform: 'none' }], { duration: e[5] * F }); }
      else if (k === 'y') { const c = monEl(side(e[2])).querySelector('.clip'), a = e[4] || 8, cyc = 8 * F; c.style.transformOrigin = '50% 70%';   /* 일렁임: 좌우로 기울며 위아래로 출렁 (염동력) */
        c.animate([{ transform: 'none' }, { transform: `skewX(${a}deg) scale(${1 + a / 120},${1 - a / 160})` }, { transform: 'none' }, { transform: `skewX(${-a}deg) scale(${1 - a / 120},${1 + a / 160})` }, { transform: 'none' }], { duration: cyc, iterations: Math.max(1, Math.round(e[3] * F / cyc)), easing: 'ease-in-out' }); }
      else if (k === 'w') { const d = $b('.bt-dim'); d.style.background = col; d.style.setProperty('--fd', 8 * F + 'ms'); d.style.opacity = e[2] ? .35 : 0; }
      res();
    }, t)));
  }
  await wait(A[0] * F + 30);
  if (spl) { await Promise.race([spl.done, wait(1500)]); spl.stop(); }
  // 원래 자리로
  ['p', 'e'].forEach(sd => { const x = $b(`.bt-mw.${sd}`); x.getAnimations().forEach(a => a.cancel()); x.style.translate = ''; monEl(sd).style.visibility = ''; });
  const d = $b('.bt-dim'); d.style.setProperty('--fd', '.2s'); d.style.opacity = 0;
}
// 맞음: 본가 효과음(굉장 H / 보통 M / 별로 L) + 4번 깜빡
async function hitFx(s, eff = 'M') { se('KOUKA_' + eff, { pan: panOf(s) }); vib(eff === 'H' ? 2 : eff === 'L' ? 0 : 1); const m = monEl(s); for (let i = 0; i < 4; i++) { m.classList.add('blink'); await wait(B?.fast ? 34 : 66); m.classList.remove('blink'); await wait(B?.fast ? 34 : 66); } }
// 능력 변화·상태 이상: 플래티넘 공통 연출의 소리
async function statFx(s, up) { const m = monEl(s); m.classList.add(up ? 'up' : 'down'); se(up ? 'W287' : 'W287B', { pan: panOf(s) }); await wait(640); m.classList.remove('up', 'down'); }
// [소리, 간격(1/30초), 횟수] (common_anims: burn·paralysis·sleep·freeze·poison)
const ST_SE = { brn: ['W172', 0, 1], par: ['W085C', 0, 1], slp: ['W173B', 20, 1], frz: ['W258', 8, 2], psn: ['W092D', 3, 3], tox: ['W092D', 3, 3], conf: ['W146', 4, 4] };
const stSe = (s, st) => { const x = ST_SE[st]; if (!x) return; for (let i = 0; i < x[2]; i++) se(x[0], { pan: panOf(s), at: i * x[1] / 30 }); };
// 본가처럼 상태 이상 연출 (경완 2026-10-28): 화상 = 불꽃이 피어오름, 독 = 보라 거품, 잠듦 = Z, 마비 = 번개, 얼음 = 얼음 조각. 걸릴 때·턴마다 데미지·못 움직일 때
const ST_P = { brn: ['f', 7], psn: ['b', 8], tox: ['b', 8], slp: ['z', 3], par: ['e', 5], frz: ['i', 6] };
// 특성 알림: 그 포켓몬 쪽 화면 위로 미끄러져 나오는 띠 (같은 특성이 줄줄이 오면 한 번만)
async function abPop(id, ab) {
  if (!id || !ab || !B) return; const s = sideOf(id), key = s + ab; if (B.abLast === key) return; B.abLast = key;
  const w = document.createElement('div'); w.className = `bt-abp ${s}`; w.innerHTML = `<small>${esc(who(id))}의</small><b>${esc(abKo(ab))}</b>`;
  $b('.bt-top')?.appendChild(w) || el.appendChild(w);
  await wait(30); w.classList.add('on'); await wait(B.fast ? 250 : 450);
  // v21.31 경완 '따라큐랑 싸웠을 때 탈 특성 안 나왔음': 본가처럼 특성 창은 뒤따르는 대사가 넘어갈 때까지 떠 있는다 (전엔 1.1초 뒤 사라져서 대사를 읽을 땐 이미 없었음)
  // 뒤따르는 대사가 없으면 조금 뒤 저절로 들어간다
  const t0 = Date.now(); (B.abHold = B.abHold || []).forEach(h => h.s === s && abOut(h)); B.abHold.push({ w, s, t0 });
  const iv = setInterval(() => { const h = B?.abHold?.find(x => x.w === w); if (!h) return clearInterval(iv); if (!B.msgOn && Date.now() - t0 > 1600) { clearInterval(iv); abOut(h); } }, 200); }
function abOut(h) { if (B?.abHold) B.abHold = B.abHold.filter(x => x !== h); h.w.classList.remove('on'); setTimeout(() => h.w.remove(), 240); }
async function abDone() { const L = B?.abHold || []; if (!L.length) return; L.slice().forEach(abOut); await wait(220); }
// 혼란: 본가처럼 머리 위로 병아리 셋이 빙글빙글 (플래티넘 status_effect 그림, 경완 2026-10-28)
// 그림에서 가장 위쪽 불투명 줄(머리)의 위치: 포켓몬 칸 기준 [x, y] (그림을 못 읽으면 null)
function headAt(m) {
  try { const im = m.querySelector('img'); if (!im || !im.naturalWidth || !im.offsetWidth) return null; const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, W, H).data;
    let top = -1, sx = 0, n = 0; for (let y = 0; y < H && (top < 0 || y < top + 6); y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { if (top < 0) top = y; sx += x; n++; }
    if (top < 0) return null; const kx = im.offsetWidth / W, ky = im.offsetHeight / H, ir = im.getBoundingClientRect(), mr = m.getBoundingClientRect(), z = mr.width / m.offsetWidth || 1;
    return [(ir.left - mr.left) / z + sx / n * kx, (ir.top - mr.top) / z + (top + 4) * ky]; } catch (e) { return null; }
}
async function confFx(s) {
  const m = monEl(s); if (!m) return; stSe(s, 'conf');
  const w = document.createElement('div'); w.className = 'bt-conf'; w.innerHTML = '<i></i><i></i><i></i>'; m.appendChild(w);
  const hd = headAt(m); if (hd) w.style.top = hd[1] + 'px';   // 병아리 높이만 포켓몬 머리에 맞춘다. 좌우는 원래대로 가운데 (경완 2026-10-30 '좌우로 빠져나옴')
  const T = B?.fast ? 700 : 1300, N = 16;
  [...w.children].forEach((d, k) => d.animate(Array.from({ length: N + 1 }, (_, i) => { const t = (i / N + k / 3) * Math.PI * 2, z = Math.sin(t);
    return { transform: `translate(${Math.cos(t) * 26}px,${z * 6}px) scale(${.8 + z * .2})`, zIndex: z > 0 ? 2 : 0, opacity: i === 0 || i === N ? 0 : 1 }; }), { duration: T, easing: `steps(${N})` }));
  await wait(T); w.remove(); }
async function stFx(s, st, hurt = false) {
  const m = monEl(s); if (!m) return; m.style.setProperty('--fx', { brn: '#ff6030', par: '#ffe040', slp: '#a0a0c0', frz: '#a8f0ff', psn: '#c060e0', tox: '#a040c0' }[st] || '#fff'); stSe(s, st); m.classList.add('glow');
  const P = ST_P[st]; let w = null;
  if (P) { w = document.createElement('div'); w.className = `bt-stp ${P[0]}`; w.innerHTML = Array.from({ length: P[1] }, (_, i) => `<i style="--x:${Math.round((P[0] === 'z' ? 58 + i * 10 : 18 + (i * 64 / Math.max(1, P[1] - 1)) + (i % 2 ? 6 : -6)))}%;--d:${i * (P[0] === 'z' ? 260 : 90)}ms">${P[0] === 'z' ? 'Z' : ''}</i>`).join(''); m.appendChild(w); }
  if (hurt) m.animate([{ opacity: 1 }, { opacity: .15 }, { opacity: 1 }, { opacity: .15 }, { opacity: 1 }], { duration: 520, easing: 'steps(5)', delay: 260 });
  await wait(P ? (P[0] === 'z' ? 1100 : 900) : 520); m.classList.remove('glow'); w?.remove(); }
// 날씨가 이어지는 동안 위 화면에 비·모래바람·싸라기눈·눈이 계속 흩날리고, 쾌청이면 햇살이 비친다 (경완 2026-10-30)
const WX_C = { RainDance: 'rain', PrimordialSea: 'rain', SunnyDay: 'sun', DesolateLand: 'sun', Sandstorm: 'sand', Hail: 'hail', Snow: 'snow' };
function wxSet(w) { const f = $b('.bt-wx'); if (f) f.className = 'bt-wx' + (WX_C[w] ? ' on ' + WX_C[w] : ''); }
// 레벨업 능력치 창 (본가처럼): 먼저 오른 만큼(+N), 누르면 새 능력치. 다시 누르면 닫힘 (경완 2026-10-30)
const LV_ST = ['최대HP', '공격', '방어', '특수공격', '특수방어', '스피드'];
function lvWin(P, lv0, lv) {
  const m = gm(P), a = statsOf(P.sp, lv0, P.iv || [], m.nat, m.ev), b = statsOf(P.sp, lv, P.iv || [], m.nat, m.ev), w = $b('.bt-lvw');
  const show = f => { w.innerHTML = `<table>${LV_ST.map((n, i) => `<tr><th>${n}</th><td>${f(i)}</td></tr>`).join('')}</table><b class="cur">▼</b>`; };
  const tap = () => new Promise(r => { if (!B) return r(); B.tapWake = r; });
  return { a, b, run: async () => { show(i => '+' + (b[i] - a[i])); w.hidden = false; se('SELECT'); await tap();
  if (B) { show(i => b[i]); await tap(); }
  w.hidden = true; } };
}
// 배틀 중 레벨업: 쇼다운 쪽 능력치·HP 도 새 레벨로 (본가처럼 오른 최대HP 만큼 지금 HP 도 오른다)
function lvApply(pk, X, lv, a, b) {
  try { if (!pk || pk.fainted) return; pk.level = lv; pk.details = String(pk.details || '').replace(/, L\d+/, ', L' + lv);
    const d = b[0] - a[0]; pk.maxhp = pk.baseMaxhp = pk.maxhp + d; pk.hp = Math.min(pk.maxhp, pk.hp + d);
    ['atk', 'def', 'spa', 'spd', 'spe'].forEach((k, j) => { if (pk.baseStoredStats) pk.baseStoredStats[k] += b[j + 1] - a[j + 1]; if (pk.storedStats) pk.storedStats[k] += b[j + 1] - a[j + 1]; });
    if (X) { X.lv = lv; X.mhp = pk.maxhp; X.hp = pk.hp; setHp('p', X.hp, X.mhp); } } catch (e) { console.error(e); }
}
// 상대를 쓰러뜨리면 나왔던 내 포켓몬(쓰러지지 않은)이 경험치를 받고, 나머지 라인업은 학습장치로 절반. 나와 있는 포켓몬은 경험치 막대가 차오르고 레벨업
async function expGain(X) {
  const foe = B.foe[X.i]; if (!foe || B.practice) return;
  for (const pid of B.vs) { const i = B.my.findIndex(o => o.pid === pid), P = boxOf(pid); if (P && B.o.p[i] && !B.o.p[i].fainted) evBattle(P, foe.sp); }   // v20.45 노력치: 싸운 포켓몬이 쓰러뜨린 종의 노력치를 (동네 체육관부터)
  // v13.04 경완: 연습 배틀은 경험치 연출도 없음
  // 학습장치 (본가 6세대~처럼 늘 켜짐, 경완 2026-10-30): 나오지 않은 라인업 포켓몬도 절반을 받는다. 얻은 경험치 글은 한 번에
  const SH = [];   // 학습장치로 받은 포켓몬: 나와 싸운 포켓몬이 다 받은 뒤 한 창에 미니 그림 + 경험치 막대로 한꺼번에 (경완 2026-10-30)
  for (const pid of [...B.vs, ...B.my.map(o => o.pid).filter(p => !B.vs.has(p))]) {
    const i = B.my.findIndex(o => o.pid === pid), pk = B.o.p[i], P = boxOf(pid); if (!P || !pk || pk.fainted) continue;
    const share = !B.vs.has(pid), m = gm(P), g0 = xpGauge(B.my[i]), r = gainXp(P, xpFor(foe, m.lv) * (share ? .5 : 1), true); if (!r.n) continue; for (let l = r.lv0; l < r.lv; l++) frAdd(P, frStep(P, [5, 3, 2]));   // v22.07 레벨업 친밀도
    if (share) { const x = B.xr[pid] = B.xr[pid] || { n: 0, lv0: r.lv0, lv: r.lv0, learned: [] }; x.n += r.n; x.lv = r.lv; x.learned.push(...r.learned);
      if (r.lv > r.lv0) { const L = lvWin(P, r.lv0, r.lv); lvApply(pk, null, r.lv, L.a, L.b); B.my[i].lv = r.lv; }
      SH.push({ i, P, r, g0 }); continue; }
    const x = B.xr[pid] = B.xr[pid] || { n: 0, lv0: r.lv0, lv: r.lv0, learned: [] }; x.n += r.n; x.lv = r.lv; x.learned.push(...r.learned);
    const nm = B.my[i].nm, A = B.act.p, on = A && A.pid === pid && !A.fnt;
    await msg(`${eun(nm)} 경험치 ${eul(r.n.toLocaleString())} 얻었다!`, on ? 0 : 500);
    if (on) { const hb = $b('.bt-hb.p .xp>i'), g = growth(P.sp); let lv = r.lv0;
      for (;;) { const goal = lv < r.lv ? 1 : xpGauge(B.my[i]); se('EXP', { dur: B.fast ? .25 : .6 }); hb.style.transition = 'width .6s linear'; hb.style.width = clampN(goal, 0, 1) * 96 + 'px'; await wait(B.fast ? 250 : 620); if (lv >= r.lv) break; lv++; A.lv = lv; $b('.bt-hb.p .lvn').textContent = lv; se('EXPMAX');   /* 경완 2026-10-28: 경험치 막대 차는 본가 소리(SEQ_SE_DP_EXP), 꽉 차면 EXPMAX */ hb.style.transition = 'none'; hb.style.width = '0px'; await wait(30); }
      hb.style.transition = ''; A.xpg = xpGauge(B.my[i]); }
    if (r.lv > r.lv0) { await msg(`${nm}의 레벨이 ${r.lv}${/[036]$/.test(String(r.lv)) ? '으로' : '로'} 올랐다!`, 0); if (B) try { await window.GymBGM?.fan?.('ME_FANFA1'); } catch (e) {}   /* 본가 {WAIT 5}{WAIT 2}: 레벨 업 팡파르가 끝난 뒤 능력치 창 */ if (!B) return; const L = lvWin(P, r.lv0, r.lv); lvApply(pk, on ? A : null, r.lv, L.a, L.b); if (B) await L.run(); }
    for (const [id, f] of r.learned) await msgFan(f ? `${eun(nm)} ${eul(mvKo(f))} 잊고 ${eul(mvKo(id))} 배웠다!` : `${eun(nm)} 새로 ${eul(mvKo(id))} 배웠다!`);
    for (const id of r.ask || []) if (B) await learnAsk(P, i, id);
  }
  if (SH.length && B) await shareWin(SH);
  if (!B.practice) GA.save();
}
// 새 기술을 배우려는데 기술이 4개일 때 (본가처럼): 잊을 기술을 고르거나 배우기를 포기한다 (경완 2026-10-30 '알아서 잊어버리는데 선택할 수 있게')
/* v20.85 경완 '배틀 번뜩임은 배틀 중간에': 내 포켓몬이 기술을 쓰고 그 턴이 끝나면(다음 턴 시작 전) 가끔 번뜩임 → 집중 중인 특별한 기술 깨달음 +34% */
/* v20.85 경완 '번뜩일 때 스프라이트 효과 다시 — 도트 아니어도 되니 퀄 높게': 포켓몬이 하얗게 번쩍 → 금빛 광채, 뒤로 빛줄기 회전, 머리 위 렌즈 플레어 별, 주위 반짝이, 화면 금빛 비네트 */
function egFx() { const me = monEl('p'), t = $b('.bt-top'), im = me?.querySelector('img'); if (!me || !t || !im) return;
  const T = t.getBoundingClientRect(), R = im.getBoundingClientRect(), k = T.width / 256 || 1, cx = (R.left + R.width / 2 - T.left) / k, cy = (R.top + R.height * .55 - T.top) / k, hy = (R.top + R.height * .12 - T.top) / k, hx = (R.left + R.width * .58 - T.left) / k;
  me.classList.remove('egk'); void me.offsetWidth; me.classList.add('egk'); setTimeout(() => me.classList.remove('egk'), 2200);
  const add = (cls, x, y, html = '', before) => { const e = document.createElement('i'); e.className = cls; e.innerHTML = html; e.style.left = x + 'px'; e.style.top = y + 'px'; before ? t.insertBefore(e, before) : t.appendChild(e); setTimeout(() => e.remove(), 2400); return e; };
  add('bt-egv', 0, 0); add('bt-egr', cx, cy, '', $b('.bt-mw.p')); add('bt-egf', hx, hy, '<i></i><b></b><b class="v"></b>'); add('bt-egc', cx, cy); setTimeout(() => B && add('bt-egc', cx, cy), 220);
  [[-30, -6, .1], [34, 4, .3], [-22, 30, .45], [26, -34, .2], [6, 44, .6], [-40, -38, .38], [44, -12, .7]].forEach(([x, y, dl]) => { const e = add('bt-egt', cx, cy - 8); e.style.setProperty('--x', x + 'px'); e.style.setProperty('--y', y + 'px'); e.style.setProperty('--d', dl + 's'); }); }
function egFxR() { const me = monEl('p'), t = $b('.bt-top'), im = me?.querySelector('img'); if (!me || !t || !im) return;   /* v22.07 경완 '레어는 적은 확률로 배틀에서 번뜩, 기존이랑 다른 색·부가 효과·다른 문장': 무지개 각성 — 시간 멈춤(어두운 화면)·흔들림·발밑 마법진·빛기둥·무지개 빛줄기·충격파·프리즘 조각·마지막 섬광 */
  const T = t.getBoundingClientRect(), R = im.getBoundingClientRect(), k = T.width / 256 || 1, cx = (R.left + R.width / 2 - T.left) / k, cy = (R.top + R.height * .55 - T.top) / k, fy = Math.min((R.top + R.height * .92 - T.top) / k, 134), hy = (R.top + R.height * .12 - T.top) / k, hx = (R.left + R.width * .58 - T.left) / k;
  const on = (el, c, ms) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); setTimeout(() => el.classList.remove(c), ms); };
  on(t, 'ershk', 1400); on(me, 'erk', 3300);
  const add = (cls, x, y, html = '', before) => { const e = document.createElement('i'); e.className = cls; e.innerHTML = html; e.style.left = x + 'px'; e.style.top = y + 'px'; before ? t.insertBefore(e, before) : t.appendChild(e); setTimeout(() => e.remove(), 3400); return e; };
  const at = (ms, f) => setTimeout(() => B && f(), ms), pc = e => { e.style.setProperty('--x', (cx / 2.56).toFixed(1) + '%'); e.style.setProperty('--y', (cy / 1.92).toFixed(1) + '%'); return e; };
  pc(add('bt-erv', 0, 0)); add('bt-erm', cx, fy, '', $b('.bt-mw.p')); add('bt-err', cx, cy, '', $b('.bt-mw.p')); at(120, () => add('bt-erp', cx, fy));
  at(300, () => add('bt-erc', cx, cy)); at(650, () => add('bt-erc', cx, cy)); at(380, () => add('bt-egf er', hx, hy, '<i></i><b></b><b class="v"></b>'));
  [[-26, .25, 300], [18, .35, 200], [-8, .5, 40], [30, .6, 120], [-34, .7, 260], [10, .8, 320], [-18, .95, 80], [24, 1.05, 180], [-2, 1.15, 0], [36, 1.25, 240], [-30, 1.35, 140], [14, 1.45, 60]].forEach(([x, d, h]) => { const e = add('bt-ers', cx + x * .5, fy - 6); e.style.setProperty('--x', x + 'px'); e.style.setProperty('--d', d + 's'); e.style.setProperty('--h', h); });
  at(1300, () => pc(add('bt-erw', 0, 0))); }
async function egFlash() {
  const pid = B.egMv; B.egMv = null; const X = B.act.p; if (!pid || B.practice || !X || X.fnt || X.pid !== pid) return;
  const P = boxOf(pid); if (!P || (S.gym?.gmax | 0) < 1) return;   /* v21.70 경완 '번뜩이는 것도 훈련장 열리고부터': 동네 체육관(훈련장 열림) 전엔 번뜩임 없음 */ const D = B.egDone || (B.egDone = new Set()); if (D.has(pid)) return;
  { const m = gm(P), r3 = egList(P).find(r => r.i === 3); if (r3 && !egKn(m, r3.id) && Math.random() < EG_RFP) { D.add(pid); const bm = $b('.bt-msg'); bm.querySelector('.t').textContent = ''; egFxR(); se('KIRAKIRA2', { gain: 1.6 }); setTimeout(() => B && se('EXPMAX2'), 750); GA.haptic?.(1); setTimeout(() => B && GA.haptic?.(1), 1300); await wait(1600); if (!B) return;
    bm.classList.add('er'); await msgTap(`${X.nm}의 잠들어 있던 힘이 깨어났다…!`); if (!B) return; const G = m.egP || (m.egP = [0, 0, 0, 0]); G[3] = 100; teach(m, r3.x[0], null, false);
    await msgTap(`${eun(X.nm)} 레어 기술 ${eul(r3.x[1])} 깨달았다!`); bm.classList.remove('er'); if (!B) return; (B.egUp || (B.egUp = [])).push({ pid, i: 3, a: 0, b: 100, got: true, rare: 1, mv: r3.id }); GA.save?.(); return; } }   /* v22.07 경완: 레어 기술은 배틀 중 아주 낮은 확률로만, 깨달으면 그 자리에서 익힘 */
  const f = egFocus(P); if (f < 0 || Math.random() >= EG_FLP) return; D.add(pid);
  $b('.bt-msg .t').textContent = ''; egFx(); se('KIRAKIRA2', { gain: 1.4 });   /* v21.70 경완 '번뜩이는 거 효과음도': 예전엔 'DP_' 가 두 번 붙어 소리가 안 났음 */ GA.haptic?.(1); await wait(900); if (!B) return; await msgTap(`${X.nm}의 머릿속에 무언가 번뜩였다!`); if (!B) return;
  const a = gm(P).egP?.[f] || 0, x = egAdd(P, f, EG_FL); (B.egUp || (B.egUp = [])).push({ pid, i: f, a, b: x ? 100 : gm(P).egP[f], got: !!x });   // v20.85 경완: 게이지는 배틀 끝 기록창 뒤 특별한 기술 카드에서 오르는 걸 보여 줌
  GA.save?.();
}
async function learnAsk(P, i, id) {
  const m = gm(P), nm = B.my[i].nm, nw = mvKo(id); if (m.mv.includes(id)) return;
  await msg(`${eun(nm)} 새로 ${eul(nw)} 배우고 싶다…`); if (!B) return;
  await msg(`그러나 ${eun(nm)} 기술을 4개 알고 있으므로 더 이상 기술을 배울 수 없다!`); if (!B) return;
  for (;;) {
    await msg(`${nw} 대신 다른 기술을 잊게 하겠습니까?`, 0);
    if (await yesNo('기술을 잊게 하겠습니까?')) {
      await msg('어느 기술을 잊게 하겠습니까?', 0); const k = await forgetPanel(m.mv, id); if (!B) return;
      if (k != null) { const old = m.mv[k]; m.mv[k] = id; m.kn = (m.kn || []).filter(x => x !== id); if (!m.kn.includes(old)) m.kn.push(old);
        const x = B.xr[P.id]; if (x) x.learned.push([id, old]);
        try { const pk = B.o.p[i], mv = B.btl.dex.moves.get(id), j = pk.baseMoveSlots.findIndex(sl => sl.id === old);   // 쇼다운 쪽 기술도 바로 바꾼다
          if (mv?.exists && j >= 0) { const sl = { id: mv.id, move: mv.name, pp: mv.pp * 8 / 5 | 0, maxpp: mv.pp * 8 / 5 | 0, target: mv.target, disabled: false, used: false }; pk.baseMoveSlots[j] = sl; const j2 = pk.moveSlots.findIndex(q => q.id === old); if (j2 >= 0) pk.moveSlots[j2] = { ...sl }; } } catch (e) { console.error(e); }
        idlePanel(); await msg('1, ⏸2, ⏸… ⏸… ⏸… ⏸\u0007짠!'); if (!B) return;   // 본가: '1, {PAUSE 20}2, and{PAUSE 20}... {PAUSE 20}... {PAUSE 20}Poof!' (경완 2026-10-31)
        await msg(`${eun(nm)} ${eul(mvKo(old))} 깨끗이 잊었다!`); if (!B) return;
        await msg('그리고…'); if (!B) return;   // 본가: '{0} forgot how to use {1}.' → 'And...' → '{0} learned {1}!'
        await msgFan(`${eun(nm)} 새로 ${eul(nw)} 배웠다!`); if (!B) return; if (!B.practice) GA.save(); return; }
    }
    if (!B) return;
    await msg(`${eul(nw)} 배우는 것을 포기하겠습니까?`, 0);
    if (await yesNo('배우는 것을 포기하겠습니까?')) { idlePanel(); await msg(`${eun(nm)} ${eul(nw)} 배우지 않았다!`); return; }
  }
}
// 잊을 기술 고르기: 지금 기술 4개를 배틀 기술 카드처럼, 취소는 잊지 않기
// 맨 위 가로 한 줄 = 새로 배울 기술 (경완 2026-10-31 '배울 기술이 뭔지도 하단 화면 상단에'), 누르거나 ? 면 기술 설명
function forgetPanel(L, nw) {
  return new Promise(res => {
    const N = nw && mvOf(nw), A = [...L, nw];
    const p = panel(`<div class="bp-moves bp-fg${N ? ' has-nw' : ''}">${[0, 1, 2, 3].map(i => { const d = mvOf(L[i]); if (!d) return `<i class="mvb empty"></i>`;
      return mvBox(i, d, d[6] || '—', d[6] || '—', false, false); }).join('')}
      <button class="bb cancel" data-x><span>그만두기</span></button>${N ? `<div class="fg-nw"><small><em>NEW</em>새로 배울 기술</small>${mvBox(4, N, N[6] || '—', N[6] || '—', false, false)}</div>` : ''}</div>`);
    p.onclick = e => { const b = e.target.closest('button'); if (!b) return; tapSe();
      const j = b.dataset.info ? +b.dataset.info : b.closest('.fg-nw') ? 4 : -1;
      if (j >= 0) { const d = mvOf(A[j]); return moveInfo({ id: A[j], move: d[1], pp: d[6], maxpp: d[6] }).then(() => forgetPanel(L, nw).then(res)); }   // ? = 기술 설명 (경완 2026-10-31)
      res(b.hasAttribute('data-x') ? null : +b.dataset.i); };
  });
}
async function shareWin(SH) {
  const w = $b('.bt-shw'); if (!w) return;
  msg('다른 포켓몬들도 학습장치로 경험치를 얻었다!', 0); w.innerHTML = `<p><img class="sh-esi" alt="" src="${IMG}item/expshare.png">학습장치</p>${SH.map(({ i, P, r }) => `<div class="sh-r"><span class="sh-ic"><img alt="" data-th="${P.id}"></span><b>${esc(B.my[i].nm)}</b><span class="lv">Lv<em>${r.lv0}</em></span><i class="xp"><i></i></i><span class="up">+${r.n.toLocaleString()}</span></div>`).join('')}<b class="cur">▼</b>`;
  fillTh(w); w.hidden = false; const R = [...w.querySelectorAll('.sh-r')];
  R.forEach((row, k) => { row.querySelector('.xp>i').style.width = clampN(SH[k].g0, 0, 1) * 100 + '%'; });
  await wait(250); se('EXP', { dur: .9 });
  await Promise.all(SH.map(async ({ i, r }, k) => { const row = R[k], bar = row.querySelector('.xp>i'), lvE = row.querySelector('.lv em'); let lv = r.lv0;
    for (;;) { const goal = lv < r.lv ? 1 : xpGauge(B.my[i]); bar.style.transition = 'width .7s linear'; bar.style.width = clampN(goal, 0, 1) * 100 + '%'; await wait(B?.fast ? 260 : 720); if (!B || lv >= r.lv) break;
      lv++; lvE.textContent = lv; row.classList.remove('lvup'); void row.offsetWidth; row.classList.add('lvup'); se('EXPMAX'); bar.style.transition = 'none'; bar.style.width = '0%'; await wait(30); } }));
  if (!B) return; await new Promise(r => { B.tapWake = r; }); w.hidden = true;
  for (const { i, P, r } of SH) { const nm = B.my[i].nm; for (const [id, f] of r.learned) await msgFan(f ? `${eun(nm)} ${eul(mvKo(f))} 잊고 ${eul(mvKo(id))} 배웠다!` : `${eun(nm)} 새로 ${eul(mvKo(id))} 배웠다!`);
    for (const id of r.ask || []) if (B) await learnAsk(P, i, id); }
}
function xpGauge(src) { const P = boxOf(src.pid); if (!P) return 0; const m = gm(P), g = growth(P.sp), a = xpAt(g, m.lv), b = xpAt(g, m.lv + 1); return b > a ? (m.xp - a) / (b - a) : 1; }

// ---------- 배틀 탭: 라인업 (gym.js 의 배틀 메뉴 창) ----------
let tabEl = null;
let luPickCb = null, luTitle = '', luGo = '';   // 승급 심사 라인업 고르기 (경완 2026-10-30): 연습 배틀 대신 '이 라인업으로 결정'
async function tab(sh, opt) {
  tabEl = sh; luOrd = false; luPickCb = opt?.pick || null; luTitle = opt?.title || ''; luGo = opt?.go || ''; if (S.gym && !luPickCb) S.gym.luI = 0;   // 포켓몬 메뉴는 늘 라인업 1부터 (경완 2026-10-30) sh.innerHTML = `<h3>포켓몬</h3><p class="gy-lead">불러오는 중…</p>`;
  try { await loadData(); } catch (e) { sh.innerHTML = `<h3>포켓몬</h3><p class="gy-lead">배틀 정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>`; return; }
  drawTab();
}
let luOrd = false;   // 라인업 순서 바꾸기 모드
function drawTab() {
  const sh = tabEl; if (!sh) return; const g = S.gym, L = lus(), cur = L[g.luI], ty = g.ty;
  const can = S.box.filter(tyOk);
  sh.innerHTML = `<h3>${luPickCb ? esc(luTitle || '라인업 고르기') : '포켓몬'}</h3>
    <div class="lu-tabs" role="tablist">${L.map((l, i) => `<button role="tab" aria-selected="${i === g.luI}" data-lu="${i}">라인업 ${i + 1}<small>${l.length}/6</small></button>`).join('')}</div>
    <div class="lu-grid">${[0, 1, 2, 3, 4, 5].map(i => { const P = boxOf(cur[i]); if (!P) return `<button class="lu-slot empty" data-add="${i}" ${can.length ? '' : 'disabled'}><i class="lu-n">${i + 1}</i><span>+</span><em>포켓몬 넣기</em></button>`; const m = gm(P);
      const T = SPECIES[P.sp]?.t || [];   // 칸 디자인 (경완 2026-10-29 '퀄리티 좀 높여줘', '한 칸이 가로 한 줄 꽉 채우는 6행, 남는 자리에 특성·성격'): 체육관 타입 색 띠('체육관 타입 색으로 통일'), 번호 딱지, 타입 아이콘, 레벨 딱지
      return `<button class="lu-slot${luOrd ? ' lu-ord' : ''}" data-p="${P.id}" style="--tc:${GA.TYPE_C?.[ty] || '#8890a8'}"><i class="lu-n">${i + 1}</i>${luOrd ? '' : `<span class="lu-x" data-rm="${P.id}" role="button" aria-label="라인업에서 빼기">✕</span>`}${thumb(P)}<span class="lu-mid"><b>${esc(nmOf(P))}</b><span class="lu-ft"><em>Lv.${m.lv}</em><span class="lu-tys">${T.map(tyI).join('')}</span></span></span><span class="lu-inf">${m.ha ? `<span class="lu-hab"><span><small>숨겨진 특성</small>${esc(abKo(m.ab))}</span></span>` : `<span><small>특성</small>${esc(abKo(m.ab))}</span>`}</span></button>`; }).join('')}</div>
    ${can.length ? '' : `<p class="lu-none">${TYPE_KO[ty]} 타입 포켓몬이 아직 없어요. 알을 부화시켜 데려와 주세요.</p>`}
    <div class="lu-act"><div class="lu-row2"><button class="gy-key" data-box><i class="lu-ic"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M2 2h12v1H2zM1 3h1v11H1zM14 3h1v11h-1zM2 14h12v1H2zM2 7h12v1H2zM6 8h4v1H6zM6 9h1v1H6zM9 9h1v1H9zM6 10h4v1H6z"/><path fill="#e85a4a" d="M2 3h12v4H2z"/><path fill="#ff8a78" d="M2 3h12v1H2z"/><path fill="#f4f4f8" d="M2 8h4v6H2zM10 8h4v6h-4zM6 11h4v3H6z"/><path fill="#fff" d="M7 9h2v1H7z"/></svg></i>포켓몬 박스</button><button class="gy-key${luOrd ? ' on' : ''}" data-ord ${cur.length > 1 ? '' : 'disabled'}><i class="lu-ic"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M4 1h1v1H4zM3 2h3v1H3zM2 3h5v1H2zM4 4h1v9H4zM11 3h1v9h-1zM9 11h5v1H9zM10 12h3v1h-3zM11 13h1v1h-1z"/></svg></i>${luOrd ? '순서 바꾸기 끝' : '순서 바꾸기'}</button></div><button class="gy-key main lu-go" data-go ${cur.length ? '' : 'disabled'}><i class="lu-ic"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M5 1h6v1H5zM3 2h2v1H3zM11 2h2v1h-2zM2 3h1v2H2zM13 3h1v2h-1zM1 5h1v6H1zM14 5h1v6h-1zM2 11h1v2H2zM13 11h1v2h-1zM3 13h2v1H3zM11 13h2v1h-2zM5 14h6v1H5zM2 7h4v1H2zM10 7h4v1h-4zM6 6h4v1H6zM5 7h1v2H5zM10 7h1v2h-1zM6 9h4v1H6z"/><path fill="#e83a3a" d="M5 2h6v1H5zM3 3h10v2H3zM2 5h12v2H2zM6 6h0z"/><path fill="#fff" d="M2 8h3v1H2zM11 8h3v1h-3zM2 9h12v2H2zM3 11h10v2H3zM5 13h6v1H5zM6 7h4v2H6z"/><path fill="#ff9a9a" d="M4 3h2v1H4zM3 4h1v1H3z"/></svg></i>${luPickCb ? luGo || '이 라인업으로 결정' : '연습 배틀'}</button></div>`;   // 연습 배틀은 아래 가운데 크게, 박스 옆에 순서 바꾸기 (경완 2026-10-29)
  fillTh(sh);
  // 끌어서 순서 바꾸기 (경완 2026-10-28 '라인업 화면에서 포켓몬 순서 바꿀 수 있게')
  const grid = sh.querySelector('.lu-grid'); let dg = null, noTap = 0;
  // 옮길 자리는 칸이 아니라 칸과 칸 사이 여백 가운데에 막대로 보인다 (경완 2026-10-29)
  if (luOrd) grid.classList.add('lu-wig');   // 순서 바꾸기 중엔 칸이 흔들흔들
  const bar = document.createElement('i'); bar.className = 'lu-bar'; bar.hidden = true; grid.appendChild(bar);
  // 순서 바꾸기 모드에선 바로 끌고, 아니면 슬롯을 꾹 누르면 끌 수 있다 (경완 2026-10-29)
  grid.oncontextmenu = e => e.preventDefault();
  grid.addEventListener('touchmove', e => { if (dg?.ready) e.preventDefault(); }, { passive: false });   // 꾹 누른 뒤엔 화면이 스크롤되지 않게
  grid.onpointerdown = e => { const b = e.target.closest('.lu-slot[data-p]'); if (!b || e.button || e.target.closest('.lu-x')) return; const d = dg = { b, x: e.clientX, y: e.clientY, pid: e.pointerId, on: false, ready: luOrd };
    if (!luOrd) d.t = setTimeout(() => { if (dg !== d) return; d.ready = true; noTap = Date.now() + 1e4; b.classList.add('lu-hold'); grid.classList.add('lu-wig'); sfx('tap'); vib(1); }, 380); };   // 꾹 누르면 진동 (경완 2026-10-31: 앱 진동 경로 GA.haptic)
  grid.onpointermove = e => { if (!dg || e.pointerId !== dg.pid) return; const dx = e.clientX - dg.x, dy = e.clientY - dg.y;
    if (!dg.on) { if (!dg.ready) { if (Math.hypot(dx, dy) > 8) { clearTimeout(dg.t); dg = null; } return; } if (Math.hypot(dx, dy) < (luOrd ? 8 : 3)) return; dg.on = true; try { grid.setPointerCapture(e.pointerId); } catch (er) {} dg.F = [...grid.querySelectorAll('.lu-slot[data-p]')]; dg.R = dg.F.map(el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); dg.from = dg.F.indexOf(dg.b); dg.to = dg.from; dg.b.classList.add('lu-drag'); grid.classList.add('lu-live'); }
    dg.b.style.transform = `translate(${dx}px,${dy}px) scale(1.06)`; luLive(dg, dx, dy); };
  // 끌고 있는 카드 자리에 맞춰 다른 카드가 바로바로 비켜 준다 (경완 2026-10-31)
  const luLive = (d, dx, dy) => { const { F, R, from } = d, cx = R[from].x + dx, cy = R[from].y + dy;
    let to = from, bd = 1e9; R.forEach((r, k) => { const dd = Math.hypot(r.x - cx, r.y - cy); if (dd < bd) { bd = dd; to = k; } });
    if (to === d.to) return; d.to = to; const O = F.filter(el => el !== d.b); O.splice(to, 0, d.b);
    O.forEach((el, n) => { const j = F.indexOf(el), nEl = el.querySelector('.lu-n'); if (nEl) nEl.textContent = n + 1; if (el !== d.b) el.style.transform = n === j ? '' : `translate(${R[n].x - R[j].x}px,${R[n].y - R[j].y}px)`; });
    sfx('tap'); vib(0); };
  grid.onpointerup = grid.onpointercancel = e => { if (!dg || e.pointerId !== dg.pid) return; const d = dg; dg = null; clearTimeout(d.t); d.b.classList.remove('lu-hold'); if (!luOrd) grid.classList.remove('lu-wig'); bar.hidden = true; if (!d.on) { if (d.ready && !luOrd) noTap = Date.now(); return; }
    noTap = Date.now(); const from = cur.indexOf(+d.b.dataset.p || d.b.dataset.p), to = e.type === 'pointerup' ? d.to ?? -1 : -1;
    if (from >= 0 && to >= 0 && to !== from) { const [id] = cur.splice(from, 1); cur.splice(to, 0, id); GA.save(); }
    const k = to >= 0 ? to : d.from, j = d.from; if (d.R && k >= 0) { d.b.classList.add('lu-land'); d.b.style.transform = `translate(${d.R[k].x - d.R[j].x}px,${d.R[k].y - d.R[j].y}px)`; }   // 놓으면 제자리로 쏙
    if (to < 0) d.F?.forEach(el => { if (el !== d.b) el.style.transform = ''; });
    setTimeout(drawTab, 150); };
  sh.onclick = e => {
    const x = e.target.closest('.lu-x'); if (x && Date.now() - noTap >= 400) { sfx('tap'); const id = +x.dataset.rm || x.dataset.rm; luAsk(boxOf(id), () => { const j = cur.indexOf(id); if (j >= 0) { cur.splice(j, 1); GA.save(); } drawTab(); }); return; }   // 슬롯 ✕ = 바로 빼기 (경완 2026-10-29)
    const b = e.target.closest('button'); if (!b || b.disabled || Date.now() - noTap < 400) return; sfx('tap');
    if (b.dataset.lu) { g.luI = +b.dataset.lu; GA.save(); drawTab(); return; }
    if (b.dataset.add) return pickMon();
    if (b.dataset.p) return luOrd ? undefined : monPop(b.dataset.p);
    if (b.hasAttribute('data-box')) return boxPop();
    if (b.hasAttribute('data-ord')) { luOrd = !luOrd; drawTab(); return; }
    if (b.hasAttribute('data-go')) { if (luPickCb) { const f = luPickCb; luPickCb = null; return f(g.luI); } return practice(); }
  };
}
function gymPop(html, onClick) { const p = document.createElement('div'); p.className = 'gy-pop'; p.innerHTML = `<div class="win" role="dialog">${html}</div>`;
  p.onclick = e => { if (e.target === p) return p.remove(); const h = e.target.closest('.iv-hex'); if (h) { sfx('tap'); ivBar = h.classList.toggle('bar'); h.classList.add('nop'); clearTimeout(h._nop); h._nop = setTimeout(() => h.classList.remove('nop'), 450); return; }   /* v20.66 경완: 막대 → 육각형으로 돌아올 때 눌림(작아짐)이 바뀐 그림에 남아 육각형이 살짝 움직였다 돌아오던 것 */ const b = e.target.closest('button[data-a]'); if (b) { sfx('tap'); onClick?.(b.dataset.a, () => p.remove(), b); } };
  if (S.gym) document.querySelector('#gym .gy-main').appendChild(p); else { p.style.zIndex = 16; document.querySelector('#gym').appendChild(p); }   // v14.18: 체육관 열기 전(타입 고르기 화면 위)엔 맨 위에
  fillTh(p); return p; }
// 라인업에서 빼기 전에 묻는 창 (경완 2026-10-29)
function luAsk(P, ok) { ok(); }   // 묻지 않고 바로 빼기 (경완 2026-10-30 '빼기·x 누르면 바로 빠지게')
function pickMon() { boxWin(true); }
// 개체값 육각형 (본가 '능력 판정'처럼): HP 위, 시계 방향으로 공격·방어·스피드·특방·특공. 성격으로 오르는 능력은 빨강, 내려가는 능력은 파랑
const IV_ORD = [[0, 'HP', ''], [1, '공격', 'atk'], [2, '방어', 'def'], [5, '스피드', 'spe'], [4, '특방', 'spd'], [3, '특공', 'spa']];
let ivBar = false;
const ivJudge = v => v >= 31 ? '최고' : v >= 26 ? '훌륭해' : v >= 16 ? '굉장해' : v >= 1 ? '괜찮아' : '별로야';
// 능력치 육각형 (경완 2026-10-29 '노력치는 없으니까 나머지 다 반영한 능력치로, 판정에 개체값 판정'): 종족값·개체값·레벨·성격으로 본가 공식 그대로 계산
const ST_KEY = ['', 'atk', 'def', 'spa', 'spd', 'spe'];
function statsOf(sp, lv, iv, nat, ev = []) {   // ev: 노력치 (v20.45, 본가 공식 +⌊EV/4⌋)
  const bs = SPECIES[sp]?.bs || [60, 60, 60, 60, 60, 60], nt = D.nt[nat] || ['', '', ''];
  return bs.map((b, i) => { const v = Math.floor((2 * b + (iv[i] | 0) + ((ev[i] | 0) >> 2)) * lv / 100); if (!i) return SPECIES[sp]?.n === '껍질몬' ? 1 : v + lv + 10;
    return Math.floor((v + 5) * (ST_KEY[i] === nt[1] ? 1.1 : ST_KEY[i] === nt[2] ? .9 : 1)); });
}
function ivHex(P, m) {
  const iv = P.iv || [0, 0, 0, 0, 0, 0], nt = D.nt[m.nat] || ['', '', ''], R = 52, cx = 90, cy = 72, pt = (k, r) => { const a = -Math.PI / 2 + k * Math.PI / 3; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const ev = m.ev || [], st = statsOf(P.sp ?? m.sp, m.lv || 1, iv, m.nat, ev), st0 = statsOf(P.sp ?? m.sp, m.lv || 1, iv, 'hardy', ev), stI = statsOf(P.sp ?? m.sp, m.lv || 1, iv, 'hardy'), mx = Math.max(...st) * 1.05;   // 노력치 몫 = st0 - stI (보라 sg-e)
  const nd = i => { const d = st[i] - st0[i]; return d ? `(${d > 0 ? '+' : ''}${d})` : ''; };   // 성격으로 오르내린 만큼 괄호로 (경완 2026-10-29)
  const ring = f => IV_ORD.map((_, k) => pt(k, R * f).map(v => v.toFixed(1)).join(',')).join(' ');
  const poly = IV_ORD.map(([i], k) => pt(k, R * Math.max(.06, st[i] / mx)).map(v => v.toFixed(1)).join(',')).join(' ');
  const cOf = key => key && key === nt[1] ? 'up' : key && key === nt[2] ? 'dn' : '', arw = c => c === 'up' ? '▲' : c === 'dn' ? '▼' : '';   // 성격으로 오른 능력 ▲, 내린 능력 ▼ (경완 2026-10-28)
  const lab = IV_ORD.map(([i, n, key], k) => { const [x, y] = pt(k, R + 17), c = cOf(key); return `<text x="${x.toFixed(1)}" y="${(y - 3).toFixed(1)}" class="${c}">${n}${arw(c)}</text><text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" class="v">${st[i]}${nd(i)}</text>`; }).join('');
  const sum = iv.reduce((a, b) => a + b, 0), best = IV_ORD.reduce((a, o) => st[o[0]] > st[a[0]] ? o : a, IV_ORD[0]);
  // 누르면 육각형 ↔ 가로 막대 (경완 2026-10-28). 막대는 종족값·개체값·성격으로 오른 몫을 색으로 나눔, 판정 글자 없음 (경완 2026-10-29)
  const sb = statsOf(P.sp ?? m.sp, m.lv || 1, [0, 0, 0, 0, 0, 0], 'hardy'), w = v => `calc((100% - 60px) * ${(Math.max(0, v) / mx).toFixed(3)})`;   // 숫자가 막대 끝에 붙으니 그 자리(60px)만큼 빼고 늘인다
  const bars = `<div class="iv-bars">${[[0, 'HP', ''], [1, '공격', 'atk'], [2, '방어', 'def'], [3, '특공', 'spa'], [4, '특방', 'spd'], [5, '스피드', 'spe']].map(([i, n, key]) => { const c = cOf(key), d = st[i] - st0[i];
    return `<div class="ivb ${c}"><span>${n}<i>${arw(c)}</i></span><b><i class="sg-b" style="width:${w(sb[i])}"></i><i class="sg-i" style="width:${w(stI[i] - sb[i])}"></i>${st0[i] > stI[i] ? `<i class="${evOn() ? 'sg-e' : 'sg-i'}" style="width:${w(st0[i] - stI[i])}"></i>` : ''}${d > 0 ? `<i class="sg-u" style="width:${w(d)}"></i>` : d < 0 ? `<i class="sg-d" style="width:${w(-d)}"></i>` : ''}<em>${st[i]}<small>${nd(i)}</small></em></b></div>`; }).join('')}
    <div class="ivb-lg"><span><i class="sg-b"></i>종족값</span><span><i class="sg-i"></i>개체값</span>${evOn() ? '<span><i class="sg-e"></i>노력치</span>' : ''}<span><i class="sg-u"></i>성격 ▲</span><span><i class="sg-d"></i>성격 ▼</span></div></div>`;
  return `<div class="iv-hex${ivBar ? ' bar' : ''}" role="button" tabindex="0" aria-label="능력치 (누르면 보기 바꾸기)">${bars}<svg viewBox="0 -12 180 164" role="img" aria-label="능력치"><polygon points="${ring(1)}" class="r0"/><polygon points="${ring(2 / 3)}" class="r1"/><polygon points="${ring(1 / 3)}" class="r1"/><polygon points="${poly}" class="iv"/>${lab}</svg>
    <div class="iv-sum"><b>능력치</b><span>합계 ${st.reduce((a, b) => a + b, 0)}</span><span>판정: ${ivJudge(Math.round(sum / 6))}</span><span>가장 좋은 능력치: ${best[1]}</span></div></div>`;
}
// 포켓몬 박스 창: 본 게임 포켓몬 박스와 같은 모양(검색·정렬·칸)으로 화면 전체에 뜬다. 체육관 타입 포켓몬만, 기본은 레벨순 (경완 2026-10-27)
// add=true 면 라인업 빈 칸에서 연 것: 누르면 바로 라인업에 넣는다. 아니면 누르면 정보 창
// 팝업이 아니라 새 화면으로 (경완 2026-10-27): 체육관 화면 위를 통째로 덮고, 왼쪽 위 ‹ 로 돌아간다
const BX_SORT = [['st', '능력치'], ['lv', '레벨'], ['rank', '랭크'], ['new', '날짜']];   // 경완 2026-10-28 '정렬은 레벨, 랭크, 날짜만'
let bxSort = 'st', bxDir = 1, bxQ = '', bxTy = 0, bxTyAll = [], bxRefresh = null;
const tyI = t => GA.tyIcon(t).replace(/ data-tip="[^"]*"/, '');   // 박스·라인업 타입 아이콘은 눌러도 말풍선 없이 (경완 2026-10-29)   // bxTy: 타입 필터 (0 = 전체, 경완 2026-10-29)
const RK_ORD = { S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
function boxWin(add, tmId, done, O) { bxTy = 0; bxSort = O?.view ? 'rank' : 'st'; bxDir = 1;   // v14.31 경완: 열 때마다 능력치 순(라인업 고를 때도), 타입 고르기 보기만 랭크 순
    // v14.17 O.view: 체육관 열기 전(타입 고르기)에도 내 박스 전체를 같은 모양으로 보기만   // 열 때마다 '모든 타입' (포켓몬 박스와 같게, 경완 2026-10-30)   // O: 다른 곳에서 쓰는 고르기 (훈련장 등) {title, tip, list, ok, first, tag, pick}   // tmId: 창고에서 기술머신 가르칠 포켓몬 고르기 (경완 2026-10-29)
  document.querySelector('#gym .gy-boxw')?.remove();
  const w = document.createElement('div'); w.className = 'gy-boxw';
  w.innerHTML = `<div class="win" role="dialog" aria-label="포켓몬 박스"><div class="bw-hd"><button class="bw-x" data-x aria-label="뒤로">‹</button><h4>${O ? O.title() : tmId ? `기술 가르치기 · ${esc(mvKo(tmId))}` : add ? `라인업 ${(S.gym.luI | 0) + 1}에 넣을 포켓몬 <small>${curLu().length}/6</small>` : '포켓몬 박스'}</h4></div>
        <div class="filters boxq"><span class="qw"><input type="search" placeholder="이름이나 번호" aria-label="포켓몬 이름이나 번호로 찾기" autocomplete="off" value="${esc(bxQ)}"><button type="button" class="qx" aria-label="검색어 지우기">✕</button></span></div>
    <div class="mgr-tools"><div class="bag-sort bw-sort">${BX_SORT.map(([k, n]) => `<button data-sort="${k}">${n}</button>`).join('')}</div><div class="bw-tyf" role="group" aria-label="타입 필터"></div><span class="tcount"></span></div>
    <div class="boxgrid bw-grid"></div></div>`;
  (O?.host || document.querySelector('#gym .gy-main')).appendChild(w); if (O?.z) w.style.zIndex = O.z;
  const grid = w.querySelector('.bw-grid'), inp = w.querySelector('input');
  const draw = () => {
    w.querySelectorAll('[data-sort]').forEach(b => { const on = b.dataset.sort === bxSort; b.setAttribute('aria-pressed', on); b.dataset.dir = on ? (bxDir > 0 ? '▼' : '▲') : ''; });
    const lu = new Set(O?.view ? [] : curLu()), q = bxQ.toLowerCase();
    const key = { st: x => statsOf(x.P.sp ?? x.m?.sp, x.m?.lv || 1, x.P.iv || [0, 0, 0, 0, 0, 0], x.m?.nat || 'hardy', x.m?.ev).reduce((a, b) => a + b, 0) * 1e3 + (x.m?.lv || 0), lv: x => (x.m?.lv || 0) * 1e3 + GA.ivSum(x.P), rank: x => (RK_ORD[GA.rankOf(x.P)] || 0) * 1e5 + (x.m?.lv || 0), new: x => +x.P.t || +x.P.id || 0 }[bxSort] || (x => (x.m?.lv || 0));
    // 라인업 고르기는 가진 포켓몬 전부: 다른 타입은 흐리게(못 고름), 고를 수 있는 포켓몬이 앞에 (경완 2026-10-28)
    const all = O ? O.list() : S.box.filter(tyOk), tys = P => SPECIES[P.sp]?.t || [];
    // 타입 필터: 목록에 있는 타입만 아이콘으로, 고르면 그 타입이 들어간 포켓몬만 (경완 2026-10-29)
    const gt = S.gym?.ty || 0, TY = [...new Set(all.flatMap(tys))].filter(t => t !== gt).sort((a, b) => a - b); if (bxTy && !TY.includes(bxTy)) bxTy = 0;   // 체육관 타입은 기본, 나머지 한 타입을 팝업에서 고르기 (경완 2026-10-29)
    bxTyAll = TY;
    w.querySelector('.bw-tyf').innerHTML = TY.length ? `<button type="button" class="fsel bw-fsel${bxTy ? ' on' : ''}" data-typop aria-haspopup="listbox">${bxTy ? TYPE_KO[bxTy] : '모든 타입'}</button>` : '';
    const L = all.filter(P => (!q || nmOf(P).toLowerCase().includes(q) || String(P.sp) === q.replace(/^0+/, '')) && (!bxTy || tys(P).includes(bxTy))).map(P => { const ok = O ? O.ok(P) : tyOk(P) && (!tmId || tmCan(P, tmId)); return { P, ok, f: O?.first ? +!!O.first(P) : 0, m: O?.view ? null : O || tyOk(P) ? gm(P) : null }; }).sort((a, b) => (b.ok - a.ok) || (b.f - a.f) || (key(b) - key(a)) * bxDir);
    w.querySelector('.tcount').innerHTML = q || bxTy ? `찾은 포켓몬 <b>${L.length}</b>마리` : `<b>${all.length}</b>마리`;   // 마릿수만 (경완 2026-10-29)
    grid.innerHTML = L.length ? L.map(({ P, m, ok }) => { const rk = GA.rankOf(P), on = lu.has(P.id);
      return `<button class="pk${P.shiny ? ' shiny' : ''}${GA.pkCls?.(P) || ''}${ok ? '' : ' bw-no'}" data-id="${P.id}" ${ok ? '' : 'disabled'} style="--shue:${GA.shinyHue(P.sp)}deg"><span class="rk ${rk}">${rk}</span>${(T => T.length ? `<span class="tgs">${T.map(t => `<span class="tg${t === '훈련중' || t === '훈련 중' || t === '훈련장' ? ' tg-tr' : ''}">${t}</span>`).join('')}</span>` : '')(O ? [O.tag?.(P)].filter(Boolean) : [on && '라인업', inTr(P.id) && '훈련중'].filter(Boolean))}<img alt="" data-th="${P.id}"><span class="nm">${esc(nmOf(P))}${P.shiny ? '<b class="sh">✦</b>' : ''}</span><span class="bw-tys">${tys(P).map(tyI).join('')}</span>${tmId && !ok ? `<span class="bw-lv">${m?.mv.includes(tmId) ? '이미 앎' : '못 배움'}</span>` : m ? `<span class="bw-lv">Lv.${m.lv}</span>` : ''}</button>`; }).join('')
      : `<p class="empty-msg">${q || bxTy ? '찾는 포켓몬이 없어요.' : (O?.view ? '포켓몬이 없어요.' : `${TYPE_KO[S.gym.ty]} 타입 포켓몬이 아직 없어요.`)}</p>`;
    fillTh(grid);
  };
  bxRefresh = () => w.isConnected && draw();
  w.onclick = e => {
    if (e.target.closest('[data-x]')) { sfx('tap'); w.remove(); if (tmId || O) done?.(); return; }
    if (e.target.closest('.qx')) { inp.value = ''; bxQ = ''; draw(); return; }
    if (e.target.closest('[data-typop]')) { sfx('tap');   // 포켓몬 박스 타입 필터와 같은 창 (경완 2026-10-30): 체육관 타입과 같이 가진 타입만
      const fp = document.createElement('div'); fp.className = 'fpop gy-fpop';
      fp.innerHTML = `<div class="win" role="listbox" aria-label="필터"><h4>타입</h4><div class="fopts"><button class="all" data-v="0" aria-selected="${!bxTy}">모든 타입</button>${bxTyAll.map(t => `<button data-v="${t}" aria-selected="${bxTy === t}"><i class="sw" style="background:${GA.TYPE_C[t]}"></i>${TYPE_KO[t]}</button>`).join('')}</div></div>`;
      fp.onclick = ev => { const o = ev.target.closest('[data-v]'); if (o) { sfx('tap'); bxTy = +o.dataset.v; draw(); grid.scrollTop = 0; } if (o || ev.target === fp) fp.remove(); };
      document.body.appendChild(fp); return; }
    const s = e.target.closest('[data-sort]'); if (s) { sfx('tap'); const k = s.dataset.sort; if (k === bxSort) bxDir = -bxDir; else { bxSort = k; bxDir = 1; } draw(); grid.scrollTop = 0; return; }
    const c = e.target.closest('.pk'); if (!c) return; sfx('tap');
    const id = +c.dataset.id || c.dataset.id;
    if (O) { const P = boxOf(id); if (P) O.pick(P, { close: () => w.remove(), redraw: () => { const h = w.querySelector('.bw-hd h4'); if (h) h.innerHTML = O.title(); draw(); } }); return; }
    if (tmId) { const P = boxOf(id); if (!P || !tmCan(P, tmId)) return; teachTm(P, tmId, k => movesPop(P, () => { w.remove(); done?.(); }, k == null ? -1 : k), null, () => {}); return; }   /* v20.72 경완: 배웠다 창 다음엔 그 포켓몬 기술 목록 카드, 닫으면 창고로 */   /* v20.70 경완: 박스 화면 위에서 바로 잊을 기술 창, 그만두면 박스 그대로 */
    if (add) return monPop(id, 'add');   // 라인업 고르기도 상세카드 먼저, 버튼은 라인업에 넣기만 (경완 2026-10-29)
    if (add) { const cur = curLu(), j = cur.indexOf(id); if (j >= 0) cur.splice(j, 1); else if (cur.length < 6) cur.push(id); else return;   /* 경완 2026-10-28: 라인업에 든 포켓몬을 다시 누르면 빠진다 */ GA.save(); drawTab(); if (cur.length >= 6 && j < 0) w.remove(); else { const sm = w.querySelector('.bw-hd small'); if (sm) sm.textContent = `${cur.length}/6`; draw(); } return; }
    monPop(id, true);
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bxQ = inp.value.trim(); draw(); inp.blur(); } });
  inp.addEventListener('input', () => { if (!inp.value.trim() && bxQ) { bxQ = ''; draw(); } });
  draw();
}
const boxPop = () => boxWin(false);
// 정보 카드 html (넘기기 때 옆 카드도 같은 걸로 그린다)
const inTr = id => !!S.gym?.tr?.some(e => e.id === id);
function monHtml(P, mode) {   // v18.75 경완: 경험치 막대(.mp-xpr)는 프로필 박스 밑까지 꽉 차게, 왼쪽 아래 '경험치'
  const inLu = curLu().includes(P.id); const m = gm(P), g = growth(P.sp), a = xpAt(g, m.lv), b = xpAt(g, m.lv + 1), mv = m.mv.map(x => mvOf(x)).filter(Boolean);
  return `<div class="mp-head"><button type="button" class="mp-thb" data-a="hit" aria-label="지닌 도구">${thumb(P)}</button>${mode !== 'view' && !gm(P).it ? '<button type="button" class="th-add" data-a="hit" aria-label="도구 지니게 하기">+</button>' : ''}<div class="mp-hd"><h4>${mode === 'view' || !GA.nmEdit ? esc(nmOf(P)) : GA.nmEdit(P)}${inTr(P.id) ? '<em class="tr-tag">훈련중</em>' : ''}</h4><p class="mp-tys">${(SPECIES[P.sp]?.t || []).map(t => tyTag(t)).join('')}</p><p class="mp-lv"><b>Lv.${m.lv}</b> · 랭크 ${GA.rankOf(P)}</p>${frRow(P)}</div><div class="mp-xpr"><i class="mp-xp"><i style="width:${m.lv >= LV_MAX ? 100 : clampN((m.xp - a) / (b - a), 0, 1) * 100}%"></i></i><span class="mp-xpt"><small class="mp-xpl">경험치</small><small class="mp-xpn">${m.lv >= LV_MAX ? '최고 레벨' : `${Math.max(0, m.xp - a).toLocaleString()}/${(b - a).toLocaleString()}`}</small></span></div></div>
    <div class="mp-na"><button type="button" class="mp-nat" data-a="nat"><small>성격 <i class="mp-more">›</i></small><p><b>${natKo(m.nat)}</b></p></button><button type="button" class="mp-ab${m.ha ? ' ha' : ''}" data-a="ab"><small>특성 <i class="mp-more">›</i></small><p><b${m.ha ? ' class="ha"' : ''}>${abKo(m.ab)}</b>${m.ha ? '<em class="ha-tag">숨겨진</em>' : ''}</p></button></div>
    ${ivHex(P, m)}${mode === 'view' && !S.gym?.d ? '' : evBox(m)}   <!-- v20.66 경완: 보기 전용 카드(상점 배울 수 있는 포켓몬 등)에도 노력치 -->
    <div class="mp-mvh"><small>기술</small>${!S.gym ? '' : '<button type="button" class="mp-tx" data-a="mv">기술 바꾸기 ›</button>'}</div>   <!-- v14.28 경완: 기술 바꾸기는 상세 카드 어디서나 (체육관 세우기 전 미리 보기만 빼고) -->
    <div class="mp-moves mp-line">${mv.map(x => `<button type="button" class="mp-mv" data-a="i${x[0]}" style="--tc:${GA.TYPE_C?.[x[2]] || '#888'}">${tyTag(x[2], x[3])}<b>${esc(x[1])}</b>${mvSt(x)}</button>`).join('')}</div>
    ${mode === 'view' ? '' : mode === 'add' ? `<div class="gy-btns one mp-btns">${inLu ? '<button data-a="rm" class="danger">라인업에서 빼기</button>' : `<button data-a="add" class="main" ${tyOk(P) && curLu().length < 6 ? '' : 'disabled'}>라인업에 넣기</button>`}</div>` : `<div class="gy-btns mp-btns mp-3"><button data-a="tm">도구 사용</button>${inLu ? '<button data-a="rm" class="danger">라인업에서 빼기</button>' : `<button data-a="add" ${tyOk(P) && curLu().length < 6 ? '' : 'disabled'}>라인업으로</button>`}${!inTr(P.id) && window.Gym?.k?.lockedT?.('train') ? '<button data-a="tr" class="tr-go tr-lk" aria-disabled="true" data-tip="동네 체육관이 되면 열려요" data-tipc><i class="mp-lk" aria-hidden="true"></i>훈련장으로</button>' : `<button data-a="tr" class="${inTr(P.id) ? 'tr-on' : 'tr-go'}">${inTr(P.id) ? '훈련장에서 빼기' : '훈련장으로'}</button>`}</div>`}<button class="mp-x" data-a="x" aria-label="닫기">✕</button>`;
}
function hitPop(P, close, reopen, reHit) { const m = gm(P), it = m.it, x = HOLD[it];   // v20.88 상세카드 지닌 도구 창 (체육관 상세카드·훈련장 상세카드 같이)
        // v17.57 경완: 추천 도구 하나 — 창고에 있으면 바로 지니게, 없으면 상점 도구 탭으로 넘어가 그 도구 사기 창
        // v17.59 경완: 추천할 게 없거나(이미 지닌 도구가 추천) 고를 수 없으면 추천 칸 자체를 안 띄움 — 추천을 먼저 고른 다음 창을 연다
  return recIt(P).then(r => { if (r === m.it) r = null; const inSt = r && S.gym?.itm?.[r] > 0;
        const recBox = !r || (!inSt && window.gymEvLu) ? '' : `<div class="it-rec"><span class="it-recl">추천 도구</span><div class="it-recb" data-it="${r}">${itRow(r, 0, inSt ? '창고에 있어요 · 누르면 지니게 해요' : '').replace('<button type="button" class="sp-tm sp-it"', `<button type="button" class="sp-tm sp-it it-recgo" data-a="${inSt ? 'rgive' : 'rbuy'}"`).replace(/<\/button>$/, `<i class="it-arr" aria-hidden="true">›</i></button>`)}</div></div>`;
        const recFill = () => {};
        const recAct = (b, c2, w) => { const r = w.querySelector('.it-recb')?.dataset.it; if (!r) return false;
          if (b === 'rgive') { c2(); giveIt(P, r); close(); reopen(); return true; }
          if (b === 'rbuy') { c2(); close(); document.querySelectorAll('#gym .gy-boxw').forEach(x => x.remove()); window.gymShopIt = r; window.Gym?.k?.openTab?.('shop', { back: 1, re: () => { (reHit || reopen)(); setTimeout(() => [...document.querySelectorAll('#gym .gy-pop')].pop()?.querySelector('[data-a=hit]')?.click(), 60); } }); return true; } return false; };
        let w0;
        if (!x) { w0 = gymPop(`<h4>지닌 도구 없음</h4><p class="gy-msg" style="text-align:center">${esc(nmOf(P))}${jong(nmOf(P)) ? '은' : '는'} 아무것도 지니고 있지 않아요.</p>${recBox}<div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="use">도구 사용</button></div>`, (b, c2) => { if (recAct(b, c2, w0)) return; if (b !== 'x' && b !== 'use') return; c2(); if (b === 'use') { close(); usePop(P, reopen); } }); recFill(w0); return; }
        w0 = gymPop(`<h4 class="mi-h"><img class="tm-ic it-ic" alt="" src="${itImg(it)}">${esc(x[0])}</h4><p class="gy-msg it-own">${esc(nmOf(P))}${jong(nmOf(P)) ? '이' : '가'} 지니고 있어요</p><p class="gy-msg mi-d">${esc(x[2])}</p>${recBox}<div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="take">돌려받기</button></div>`, (b, c2) => { if (recAct(b, c2, w0)) return; if (b !== 'x' && b !== 'take') return; c2(); if (b !== 'take') return; takeIt(P); se('DECIDE'); close(); reopen(); }); recFill(w0); }); }
function monPop(id, fromBox, under, lst) {   // lst: 넘겨 볼 목록 (함수). 없으면 라인업 (훈련장 슬롯은 훈련장 포켓몬끼리만, 경완 2026-10-29)
  if (!document.querySelector(".gy-pop .mp-head")) ivBar = false;   // 정보 카드를 새로 열면 능력치는 늘 육각형부터 (경완 2026-10-29)
  const P = boxOf(+id || id); if (!P) return; const m = gm(P), nt = D.nt[m.nat] || ['', '', ''], h = D.sp[P.sp]?.h;
  if (under !== null && String(under?.dataset?.pid) !== String(P.id)) { try { GA.cry?.(P.sp, 0, 1, CRY_K); } catch (e) {} }   // v20.66 경완: 상세카드를 열 때(넘길 때도) 본게임처럼 울음소리. 작은 창을 닫고 카드만 다시 그릴 땐(null) 안 남
  // 특성 팝업: 숨겨진 특성은 안내 문구 대신 눌러서 효과 (경완 2026-10-29)
  const abShow = (k, hid, hk) => gymPop(`<button class="mp-x" data-a="x" aria-label="닫기">✕</button><h4>${abKo(k)}${hid ? ' <em class="ha-tag">숨겨진 특성</em>' : ''}</h4><p class="gy-msg ab-d">${esc(AB_D?.[k] || '효과 설명이 아직 없어요.')}</p>${hk ? `<button type="button" class="ab-hid" data-a="hab"><small>이 종의 숨겨진 특성</small><b>${abKo(hk)}</b><i>›</i></button>` : ''}<div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b, c2) => { if (b === 'hab') return abShow(hk, true); c2(); });   // v20.64 경완: 성격·특성 창 우상단 ✕
  // 정보 카드 (경완 2026-10-29): 이름 밑 타입·레벨·경험치 왼쪽 맞춤, 경험치 막대는 끝까지 / 성격·특성 한 줄(눌러서 효과) / 개체값 › / 기술(누르면 상세, 위에 '기술 바꾸기') / 기술 가르치기
  const p = gymPop(monHtml(P, fromBox),
    (a, close) => { const c = curLu(), i = c.indexOf(P.id);
      if (a === 'ev') { close(); evPop(P, () => monPop(P.id, fromBox, null, lst)); return; }   // v20.45 노력치 박스 → 설정 창, 닫으면 카드 다시
      if (a === 'x') return close();   // ✕ 는 그냥 닫기 (아래 fin 으로 빠져 카드를 다시 열던 것, 경완 2026-10-31)
      if (a[0] === 'i' && a.length > 1) return mvInfo(a.slice(1));
      if (a === 'nat') { const rn = recNat(P, m), w1 = gymPop(`<button class="mp-x" data-a="x" aria-label="닫기">✕</button><h4>${natKo(m.nat)}</h4><p class="gy-msg nat-d">${nt[1] ? `<span class="nat-c up">${STAT_KO[nt[1]]} ▲</span><span class="nat-c dn">${STAT_KO[nt[2]]} ▼</span>` : '<span class="nat-c">능력 변화 없음</span>'}</p><p class="gy-msg ab-d">${nt[1] ? `${STAT_KO[nt[1]]}${jong(STAT_KO[nt[1]]) ? '이' : '가'} 잘 오르고, ${STAT_KO[nt[2]]}${jong(STAT_KO[nt[2]]) ? '이' : '가'} 덜 오르는 성격이에요.` : '모든 능력이 고르게 오르는 성격이에요.'}</p>${natRec(rn, m)}<div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b2, c2) => {
        if (b2 === 'ngive') { c2(); mintUse(P, rn); close(); monPop(P.id, fromBox, null, lst); return; }
        if (b2 === 'nbuy') { c2(); close(); document.querySelectorAll('#gym .gy-boxw').forEach(x => x.remove()); window.gymShopMint = rn; window.Gym?.k?.openTab?.('shop', { back: 1, re: () => { monPop(id, fromBox, undefined, lst); setTimeout(() => [...document.querySelectorAll('#gym .gy-pop')].pop()?.querySelector('[data-a=nat]')?.click(), 60); } })   /* v17.71 경완: ‹ 누르면 보던 성격 창까지 */; return; }
        if (b2 === 'x') c2(); }); return; }   // 성격 효과도 눌러서 (경완 2026-10-29)
      if (a === 'ab') return abShow(m.ab, m.ha, null);   // 특성 효과는 눌러서 팝업 (경완 2026-10-29). v12.10 경완: 숨특은 진짜 가진 개체만 (종의 숨특 칸 없앰)
      if (a === 'mv') { movesPop(P, () => monPop(P.id, fromBox, p, lst)); return; }   // v14.42 경완: 기술 창이 떠 있는 동안 뒤에 상세 카드는 그대로, 닫으면 바뀐 기술로 카드만 바꿔 끼움
      if (a === 'tm') { close(); usePop(P, () => monPop(P.id, fromBox, null, lst)); return; }
      // 프로필 그림을 누르면 지닌 도구 정보 + 돌려받기 (경완 2026-10-29)
      if (a === 'hit') return hitPop(P, close, () => monPop(P.id, fromBox, null, lst), () => monPop(id, fromBox, undefined, lst));
      if (a === 'tr') return window.GymManage?.trSend(P, () => { drawTab(); bxRefresh?.(); monPop(P.id, fromBox, p, lst); });
      const fin = () => {
      if (a === 'rm' && i >= 0) c.splice(i, 1); if (a === 'add' && i < 0 && c.length < 6 && tyOk(P)) c.push(P.id); close(); GA.save(); drawTab();
      if (fromBox === 'add') { const bw = document.querySelector('#gym .gy-boxw'); if (a === 'add' && c.length >= 6) bw?.remove(); else { const sm = bw?.querySelector('.bw-hd small'); if (sm) sm.textContent = `${c.length}/6`; } }   // 라인업 고르기: 6마리 차면 박스도 닫힘
      if (fromBox) bxRefresh?.();
      if (fromBox !== 'add') monPop(P.id, fromBox, null, lst); };   // 정보 카드 '라인업으로'는 카드를 다시 열어 바뀐 버튼을 보여 줌 (경완 2026-10-30)
      if (a === 'rm') return luAsk(P, fin);   // 빼기 전에 한 번 묻기 (경완 2026-10-29)
      fin(); });
  p.querySelector('.win').classList.toggle('mp-tr', inTr(P.id));
  p.dataset.pid = P.id;
  if (p.querySelector('.ev-box2')) window.Gym?.k?.tutEv?.('C');   // v20.45 처음 노력치 박스를 볼 때 강박사 설명   // 훈련 중이면 카드 색이 바뀐다 (경완 2026-10-29)
  // 라인업 포켓몬은 카드를 좌우로 밀면 다음·이전 포켓몬: 꾸미기 모드 포켓몬 박스처럼 옆 카드가 붙어 따라 들어온다, 좌우 힌트 화살표 (경완 2026-10-29)
  const L = lst ? lst() : curLu(), k = L.indexOf(P.id), w = p.querySelector('.win');
  if (under) { p.style.background = 'transparent'; p.style.backdropFilter = p.style.webkitBackdropFilter = 'none'; Promise.race([Promise.all([...p.querySelectorAll('img')].map(i => new Promise(r => { if (i.complete && i.naturalWidth) r(); else { i.onload = i.onerror = r; } }))), new Promise(r => setTimeout(r, 300))]).then(() => { under.remove(); p.style.background = p.style.backdropFilter = p.style.webkitBackdropFilter = ''; }); }
  if (k >= 0 && L.length > 1) {
    const nb = d => L[k + d], go = (d, snd) => { if (nb(d) == null) return; if (snd) sfx('tap'); monPop(nb(d), fromBox, p, lst); };   // 끝에서는 안 넘어감, 밀어서 넘길 땐 소리 없음 (경완 2026-10-29)
    const pg = j => lst ? `<p class="mp-pg num">${j + 1} / ${L.length}</p>` : '';   /* v20.63 경완: 라인업 상세카드는 밑 번호 없음 */   // v14.21 경완: 상세 카드 밑은 점 없이 언제나 숫자 / v14.20 경완: 많으면(타입 미리 보기·박스) 점 대신 '3 / 32' — 점이 줄을 넘쳐 카드가 화면 밖으로 밀리던 것
    w.insertAdjacentHTML('beforeend', `${pg(k)}<button class="dp-arr l" type="button" data-nav="-1" aria-label="이전 포켓몬"><i class="sw-h l"></i></button><button class="dp-arr r" type="button" data-nav="1" aria-label="다음 포켓몬"><i class="sw-h r"></i></button>`);
    const arrows = [...w.querySelectorAll(':scope > .dp-arr')];
    [1, -1].forEach(d => { const Q = nb(d) != null && boxOf(nb(d)); if (Q) GA.thumb(Q).catch(() => {}); });   // 옆 카드 그림 미리
    GA.cardPager?.(p, { can: d => nb(d) != null, step: d => go(d),
      snap: (d, w0) => { const c = w0.cloneNode(false); const Q = boxOf(nb(d)); c.innerHTML = Q ? monHtml(Q, fromBox) + pg(k + d) : ''; c.classList.toggle('mp-tr', !!Q && inTr(Q.id)); fillTh(c); return c; } });   // 옆 카드도 실제 카드와 똑같이 (점·훈련 색까지)
    arrows.forEach(a => { a.hidden = nb(+a.dataset.nav) == null; a.addEventListener('click', e => { e.stopPropagation(); go(+a.dataset.nav, 1); }); });
  }
  return p;
}
// 남의 포켓몬 상세카드 (경완 2026-10-29 '지원서 포켓몬 누르면 상세카드'): 종·레벨로 만든 보기 전용 카드, 같은 지원서에선 같은 개체
const FC = {};
function foePop(sp, lv, key) {
  const e = FC[key] || (FC[key] = foeEntry(sp, lv)), nt = D.nt[e.nat] || ['', '', ''], mv = (e.mv || []).map(x => mvOf(x)).filter(Boolean), ha = e.ab === D.sp[sp]?.h;
  gymPop(`<div class="mp-head"><span class="mp-fth"><img alt="" data-sp="${sp}"></span><div class="mp-hd"><h4>${esc(SPECIES[sp]?.n || '')}</h4><p class="mp-tys">${(SPECIES[sp]?.t || []).map(t => tyTag(t)).join('')}</p><p class="mp-lv"><b>Lv.${lv}</b></p></div></div>
    <div class="mp-na"><button type="button" class="mp-nat" data-a="nat"><small>성격 <i class="mp-more">›</i></small><p><b>${natKo(e.nat)}</b></p></button><button type="button" class="mp-ab${ha ? ' ha' : ''}" data-a="ab"><small>특성 <i class="mp-more">›</i></small><p><b${ha ? ' class="ha"' : ''}>${abKo(e.ab)}</b>${ha ? '<em class="ha-tag">숨겨진</em>' : ''}</p></button></div>
    ${ivHex({ iv: e.iv }, e)}
    <div class="mp-mvh"><small>기술</small></div>
    <div class="mp-moves mp-line">${mv.map(x => mvRow(x, 'i' + x[0])).join('')}</div><button class="mp-x" data-a="x" aria-label="닫기">✕</button>`, (a, close) => {
    if (a === 'x') return close();
    if (a[0] === 'i' && a.length > 1) return mvInfo(a.slice(1));
    if (a === 'nat') return gymPop(`<h4>${natKo(e.nat)}</h4><p class="gy-msg nat-d">${nt[1] ? `<span class="nat-c up">${STAT_KO[nt[1]]} ▲</span><span class="nat-c dn">${STAT_KO[nt[2]]} ▼</span>` : '<span class="nat-c">능력 변화 없음</span>'}</p><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b, c2) => c2());
    if (a === 'ab') return gymPop(`<h4>${abKo(e.ab)}${ha ? ' <em class="ha-tag">숨겨진 특성</em>' : ''}</h4><p class="gy-msg ab-d">${esc(AB_D?.[e.ab] || '효과 설명이 아직 없어요.')}</p><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b, c2) => c2()); });
}
// 기술 상세 (경완 2026-10-29): 정보 카드·창고에서 기술을 누르면. teach 가 있으면 '기술 가르치기'
/* v15.90 경완: 체육관 입장 '특별한 기술' 알림창에 쓰는 기술 상자 (mvInfo 와 같은 모양, 단추 없음) */
const mvBoxHtml = id => { const x = mvOf(id); if (!x) return ''; return `<div class="mi-box"><h4 class="mi-h"><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png">${esc(x[1])}</h4><div class="mi-tg">${tyTag(x[2], x[3])}</div>
    <dl class="mi-st"><div><dt>위력</dt><dd>${x[4] || '—'}</dd></div><div><dt>명중</dt><dd>${x[5] && x[5] !== true ? x[5] : '—'}</dd></div><div><dt>PP</dt><dd>${x[6] || '—'}</dd></div></dl>
    <p class="gy-msg mi-d">${esc(x[8] || '설명이 아직 없어요.')}</p></div>`; };
// v20.68 경완 '창고 기술 상세카드 = 상점 상세카드': 제목(종류 · 이름, 레코드는 창고 수), 기술 칸 안에 설명, 계속 사용/1회용 안내, 라인업에서 배울 수 있는 포켓몬
const tmHead = (id, n) => { const x = mvOf(id), tr = isTR(id); return `<h4 class="mi-h${tr ? ' has-own' : ''}"><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png">${tr ? '<i class="tm-tr">TR</i>' : ''}${esc(x[1])}${tr ? bagN(n) : ''}</h4>`; };   /* 경완: 슬롯처럼 TR 딱지 (종류는 아래 계속 사용·1회용 칸) */
const tmBody = x => `<div class="mp-moves one tm-card${x[8] ? ' has-ds' : ''}">${mvRow(x, '').replace(/<\/button>$/, x[8] ? `<span class="tm-ds">${esc(x[8])}</span></button>` : '</button>')}</div>`;
const tmKdBox = id => { const tr = isTR(id); return `<div class="tm-kd${tr ? ' tr' : ''}"><div class="tm-kdr"><i class="tm-kdb">${tr ? '1회용' : '계속 사용'}</i><span>${tr ? '기술레코드는 한 번 가르치면 없어져요.' : '기술머신은 한 번 사면 몇 번이든 가르칠 수 있어요.'}</span></div></div>`; };
function tmWho(id) {
  const i = D.mv.indexOf(mvOf(id)), M = [...new Set(lus().flat())].map(boxOf).filter(P => P && tmOf(P.sp).includes(i)), kn = P => gm(P).mv.includes(id), L = [...M.filter(P => !kn(P)), ...M.filter(kn)], n = L.length - L.filter(kn).length;
  const h = `<p class="tm-whoh">라인업에서 배울 수 있는 포켓몬${n ? ` <b>${n}</b>` : ''}</p>`;
  if (!L.length) return `${h}<p class="tm-who0">라인업에 배울 수 있는 포켓몬이 없어요.</p>`;
  return `${h}<div class="tm-who${L.length > 4 ? ' many' : ''}${L.length > 8 ? ' scr' : ''}">${L.map(P => `<button type="button" class="tm-wp${kn(P) ? ' kn' : ''}" data-a="wp${P.id}">${thumb(P)}<b>${esc(nmOf(P))}</b>${kn(P) ? '<small>이미 앎</small>' : ''}</button>`).join('')}</div>`;
}
// v21.05 경완 '특별한 기술 설명은 상점 기술머신 설명 레이아웃과 같게': 기술 칸(타입 배경·위력·명중·PP) 안에 설명
function mvCard(id) { const x = mvOf(id); if (!x) return; gymPop(`<h4 class="mi-h mi-nic">${esc(x[1])}</h4>${tmBody(x)}<div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close) => { if (a === 'x') close(); }); }
function mvInfo(id, teach, lab = '기술 가르치기', onX, who) {
  const x = mvOf(id); if (!x) return; const n = S.gym?.tms?.[id] || 0;
  if (teach && !onX && n > 0) { const p = gymPop(`${tmHead(id, n)}${tmBody(x)}${tmKdBox(id)}${who ? tmWho(id) : ''}<div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="t">${lab}</button></div>`,
      (a, close) => { if (!a) return; if (a.startsWith('wp')) return monPop(+a.slice(2) || a.slice(2), 'view'); close(); if (a === 't') teach(); });
    return; }
  gymPop(`<h4 class="mi-h"><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png">${esc(x[1])}</h4><div class="mi-tg">${tyTag(x[2], x[3])}${teach && !onX ? (isTR(id) ? `<span class="mi-own">기술레코드 ×${n} · 한 번 쓰면 없어져요</span>` : '<span class="mi-own">기술머신 · 계속 쓸 수 있어요</span>') : ''}</div>
    <dl class="mi-st"><div><dt>위력</dt><dd>${x[4] || '—'}</dd></div><div><dt>명중</dt><dd>${x[5] && x[5] !== true ? x[5] : '—'}</dd></div><div><dt>PP</dt><dd>${x[6] || '—'}</dd></div></dl>
    <p class="gy-msg mi-d">${esc(x[8] || '설명이 아직 없어요.')}</p><div class="gy-btns${teach ? '' : ' one'}">${teach ? `<button data-a="x">닫기</button><button class="main" data-a="t">${lab}</button>` : '<button class="main" data-a="x">닫기</button>'}</div>`,
    (a, close) => { close(); if (a === 't') teach?.(); else onX?.(); });
}
/* 기술레코드 (v15.69 경완 '레코드 개념 적용'): 소드·실드 TR00~TR99 기술은 한 번 쓰면 없어지는 기술레코드, 나머지 기술머신은 한 번 사면 계속 쓴다 */
const TR_IDS = new Set('swordsdance bodyslam flamethrower hydropump surf icebeam blizzard lowkick thunderbolt thunder earthquake psychic agility focusenergy metronome fireblast waterfall amnesia leechlife triattack substitute reversal sludgebomb spikes outrage psyshock endure sleeptalk megahorn batonpass encore irontail crunch shadowball futuresight uproar heatwave taunt trick superpower skillswap blazekick hypervoice overheat cosmicpower muddywater irondefense dragonclaw bulkup calmmind leafblade dragondance gyroball closecombat toxicspikes flareblitz aurasphere poisonjab darkpulse seedbomb xscissor bugbuzz dragonpulse powergem focusblast energyball bravebird earthpower nastyplot zenheadbutt flashcannon leafstorm powerwhip gunkshot ironhead stoneedge stealthrock grassknot sludgewave heavyslam electroball foulplay storedpower allyswitch scald workup wildcharge drillrun heatcrash hurricane playrough venomdrench dazzlinggleam darkestlariat highhorsepower throatchop pollenpuff psychicfangs liquidation bodypress'.split(' ')), isTR = id => TR_IDS.has(id), tmKind = id => isTR(id) ? '기술레코드' : '기술머신';
// 이 포켓몬이 이 기술머신을 배울 수 있나 (이미 아는 기술은 못 배움)
// v21.66 경완 '팬텀이 기술머신 병상첨병 못 배워?': 데이터(mkdata)는 레벨업으로 배우는 기술을 tm 에서 뺐다 → 기술머신으로 파는 기술이면 레벨업으로 배우는 포켓몬도 가르칠 수 있게 (배틀 상대 AI 기술 고르기는 그대로 D.sp.tm)
let TM_ALL = null; const TM_OF = new Map();
const tmOf = sp => { const o = D?.sp[sp]; if (!o) return []; let r = TM_OF.get(sp); if (r) return r;
  if (!TM_ALL) { TM_ALL = new Set(); for (const v of Object.values(D.sp)) (v.tm || []).forEach(i => TM_ALL.add(i)); }
  const t = new Set(o.tm || []); (o.lv || []).forEach((x, k) => { if (k % 2 && TM_ALL.has(x)) t.add(x); }); r = [...t]; TM_OF.set(sp, r); return r; };
const tmCan = (P, id) => tmOf(P.sp).some(i => D.mv[i]?.[0] === id) && !gm(P).mv.includes(id);
// 기술머신 하나를 P 에게: 기술이 4개면 잊을 기술 고르기(또는 익혀 두기만)
function teachTm(P, id, done, slot, onX) {   // onX: 잊을 기술 창에서 그만두기 (없으면 done)   // slot: 기술 바꾸기에서 고른 칸이면 그 자리에 바로
  const g = S.gym, m = gm(P), x = mvOf(id); if (!x || !(g.tms?.[id] > 0)) return done?.();
  const use = k => { if (isTR(id)) { g.tms[id] = (g.tms[id] || 0) - 1; if (g.tms[id] <= 0) delete g.tms[id]; } m.kn = (m.kn || []).filter(y => y !== id);
    if (k == null) { if (!m.kn.includes(id)) m.kn.push(id); } else if (k >= m.mv.length) m.mv.push(id); else { const old = m.mv[k]; m.mv[k] = id; if (!m.kn.includes(old)) m.kn.push(old); }
    GA.save(); learnFan(); gymPop(`<div class="tm-done"><p class="tm-dh">${esc(nmOf(P))}${jong(nmOf(P)) ? '은' : '는'}<br><b>${esc(x[1])}</b>${jong(x[1]) ? '을' : '를'} ${k == null ? '익혀 두었다!' : '배웠다!'}</p><div class="mp-moves mp-line tm-dmv">${mvRow(x, 'v')}</div>${k == null ? '<p class="tm-dsub">기술 바꾸기에서 쓸 수 있어요</p>' : ''}</div><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => { c(); done?.(k); }); };
  if (slot != null) return use(Math.min(slot, m.mv.length));
  if (m.mv.length < 4) return use(m.mv.length);
  gymPop(`<h4>${esc(x[1])} 대신 잊을 기술</h4><p class="gy-msg">잊은 기술은 나중에 기술 바꾸기에서 다시 배울 수 있어요.</p><div class="mp-moves mp-line pick">${m.mv.map((y, k) => mvOf(y) ? mvRow(mvOf(y), 's' + k) : '').join('')}</div>
    <div class="gy-btns"><button data-a="keep">익혀 두기만</button><button data-a="x">그만두기</button></div>`, (b, c2) => { c2(); if (b === 'x') return (onX || done)?.(); use(b === 'keep' ? null : +b.slice(1)); });
}
// 기술 가르치기 (경완 2026-10-29): 창고 기술머신 탭과 같은 화면. 가르칠 수 있는 것 먼저, 못 가르치는 건 회색
function tmPop(P, done, slot) {
  const g = S.gym; g.tms = g.tms || {};
  const L = Object.entries(g.tms).filter(([, n]) => n > 0).map(([id, n]) => [mvOf(id), n, id]).filter(([x]) => x).map(r => [...r, tmCan(P, r[2])]).sort((a, b) => (b[3] - a[3]) || ((b[0][4] || 0) - (a[0][4] || 0)));
  const el = document.createElement('section'); el.className = 'gy-setup gy-infos gy-storew tm-teach';
  el.innerHTML = `<div class="gy-sh"><button class="gy-back" type="button" data-a="x" aria-label="뒤로">◀</button><b class="if-t">기술 가르치기</b></div>
    <div class="gy-body"><p class="tt-who">${thumb(P)}<span><b>${esc(nmOf(P))}</b>에게 가르칠 기술머신</span></p>${L.length ? `<div class="sp-list">${L.map(([x, n, id, ok]) => tmRow(x, n, id, !ok, ok ? '' : (gm(P).mv.includes(id) ? '이미 앎' : '못 배움'))).join('')}</div>` : '<p class="sf-none">가진 기술머신이 없어요. 상점에서 살 수 있어요.</p>'}</div>`;
  document.querySelector('#gym .gy-main').appendChild(el); fillTh(el);   // 하단 메뉴는 그대로 (경완 2026-10-29)
  el.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sfx('tap');
    if (b.dataset.a === 'x') { el.remove(); return done?.(); }
    const id = b.dataset.tm; if (id) mvInfo(id, () => { el.remove(); teachTm(P, id, done, slot); }); };
}
const tmRow = (x, n, id, off, note) => `<button type="button" class="sp-tm${off ? ' off' : ''}" data-tm="${id}" ${off ? 'disabled' : ''}><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png"><span class="tm-nm">${isTR(id) ? '<i class="tm-tr">TR</i>' : ''}<b>${esc(x[1])}</b>${isTR(id) ? `<i class="tm-own">×${n}</i>` : ''}</span><span class="tm-meta">${tyTag(x[2], x[3])}<small>위력 ${x[4] || '—'} · 명중 ${x[5] && x[5] !== true ? x[5] : '—'}${note ? ` · ${note}` : ''}</small></span></button>`;
// ---------- 지니는 도구 (경완 2026-10-29): 본가처럼 포켓몬에게 하나씩. 일회용(상처약·열매 등)은 없고 계속 효과 있는 것만. 그림은 PokeAPI/sprites items
// HOLD[id] = [이름, 가격, 설명, 타입 강화면 타입 번호]
const HOLD = {
  leftovers: ["먹다남은음식", 4000, "지니게 하면 매 턴 끝날 때마다 HP가 조금씩 회복된다.", 0],
  blacksludge: ["검은오물", 2500, "독 타입이 지니면 매 턴 HP가 회복된다. 다른 타입은 HP가 줄어든다.", 0],
  shellbell: ["조개껍질방울", 2500, "상대에게 준 대미지의 일부만큼 HP를 회복한다.", 0],
  choiceband: ["구애머리띠", 5000, "공격이 1.5배가 되지만 처음 고른 기술만 쓸 수 있다.", 0],
  choicespecs: ["구애안경", 5000, "특수공격이 1.5배가 되지만 처음 고른 기술만 쓸 수 있다.", 0],
  choicescarf: ["구애스카프", 5000, "스피드가 1.5배가 되지만 처음 고른 기술만 쓸 수 있다.", 0],
  lifeorb: ["생명의구슬", 5000, "공격 기술의 위력이 1.3배가 되지만 공격할 때마다 HP가 조금 줄어든다.", 0],
  expertbelt: ["달인의띠", 3500, "효과가 굉장한 기술의 위력이 1.2배가 된다.", 0],
  assaultvest: ["돌격조끼", 4500, "특수방어가 1.5배가 되지만 변화 기술을 쓸 수 없다.", 0],
  eviolite: ["진화의휘석", 4000, "아직 진화할 수 있는 포켓몬의 방어와 특수방어가 1.5배가 된다.", 0],
  rockyhelmet: ["울퉁불퉁멧", 3500, "접촉 기술로 공격한 상대에게 대미지를 준다.", 0],
  muscleband: ["힘의머리띠", 2500, "물리 기술의 위력이 조금 올라간다.", 0],
  wiseglasses: ["박식안경", 2500, "특수 기술의 위력이 조금 올라간다.", 0],
  scopelens: ["초점렌즈", 2500, "기술이 급소에 맞기 쉬워진다.", 0],
  widelens: ["광각렌즈", 2000, "기술의 명중률이 조금 올라간다.", 0],
  zoomlens: ["포커스렌즈", 2000, "상대보다 늦게 움직이면 명중률이 올라간다.", 0],
  kingsrock: ["왕의징표석", 2500, "공격하면 가끔 상대를 풀죽게 한다.", 0],
  quickclaw: ["선제공격손톱", 2500, "가끔 상대보다 먼저 움직일 수 있다.", 0],
  brightpowder: ["반짝가루", 2500, "상대 기술의 명중률이 조금 떨어진다.", 0],
  focusband: ["기합의머리띠", 2500, "쓰러질 만한 공격을 받아도 가끔 HP 1로 버틴다.", 0],
  lightclay: ["빛의점토", 2500, "리플렉터·빛의장막이 오래 간다.", 0],
  bigroot: ["큰뿌리", 2000, "HP를 흡수하는 기술로 회복하는 양이 늘어난다.", 0],
  metronome: ["메트로놈", 2000, "같은 기술을 이어서 쓸수록 위력이 올라간다.", 0],
  flameorb: ["화염구슬", 1500, "턴이 끝나면 지닌 포켓몬이 화상을 입는다.", 0],
  toxicorb: ["맹독구슬", 1500, "턴이 끝나면 지닌 포켓몬이 맹독에 걸린다.", 0],
  silkscarf: ["실크스카프", 1500, "노말 타입 기술의 위력이 조금 올라간다.", 1],
  blackbelt: ["검은띠", 1500, "격투 타입 기술의 위력이 조금 올라간다.", 2],
  sharpbeak: ["예리한부리", 1500, "비행 타입 기술의 위력이 조금 올라간다.", 3],
  poisonbarb: ["독바늘", 1500, "독 타입 기술의 위력이 조금 올라간다.", 4],
  softsand: ["부드러운모래", 1500, "땅 타입 기술의 위력이 조금 올라간다.", 5],
  hardstone: ["딱딱한돌", 1500, "바위 타입 기술의 위력이 조금 올라간다.", 6],
  silverpowder: ["은빛가루", 1500, "벌레 타입 기술의 위력이 조금 올라간다.", 7],
  spelltag: ["저주의부적", 1500, "고스트 타입 기술의 위력이 조금 올라간다.", 8],
  metalcoat: ["금속코트", 1500, "강철 타입 기술의 위력이 조금 올라간다.", 9],
  charcoal: ["목탄", 1500, "불꽃 타입 기술의 위력이 조금 올라간다.", 10],
  mysticwater: ["신비의물방울", 1500, "물 타입 기술의 위력이 조금 올라간다.", 11],
  miracleseed: ["기적의씨", 1500, "풀 타입 기술의 위력이 조금 올라간다.", 12],
  magnet: ["자석", 1500, "전기 타입 기술의 위력이 조금 올라간다.", 13],
  twistedspoon: ["휘어진스푼", 1500, "에스퍼 타입 기술의 위력이 조금 올라간다.", 14],
  nevermeltice: ["녹지않는얼음", 1500, "얼음 타입 기술의 위력이 조금 올라간다.", 15],
  dragonfang: ["용의이빨", 1500, "드래곤 타입 기술의 위력이 조금 올라간다.", 16],
  blackglasses: ["검은안경", 1500, "악 타입 기술의 위력이 조금 올라간다.", 17],
  fairyfeather: ["요정의깃털", 1500, "페어리 타입 기술의 위력이 조금 올라간다.", 18],
  // 열매 (경완 2026-10-31): 배틀에선 먹으면 없어지지만 지닌 도구(S.gym.mon[id].it)는 그대로 — 배틀은 늘 지닌 도구를 새로 넣고 시작한다
  oranberry: ["오렌열매", 800, "HP가 절반 이하가 되면 먹고 HP를 10 회복한다.", 0],
  sitrusberry: ["자뭉열매", 2500, "HP가 절반 이하가 되면 먹고 최대 HP의 1/4을 회복한다.", 0],
  lumberry: ["리샘열매", 3000, "상태 이상이나 혼란에 걸리면 먹고 낫는다.", 0],
  cheriberry: ["버치열매", 1000, "마비되면 먹고 낫는다.", 0],
  chestoberry: ["유루열매", 1000, "잠들면 먹고 깨어난다.", 0],
  pechaberry: ["복슝열매", 1000, "독에 걸리면 먹고 낫는다.", 0],
  rawstberry: ["복분열매", 1000, "화상을 입으면 먹고 낫는다.", 0],
  aspearberry: ["배리열매", 1000, "얼면 먹고 녹는다.", 0],
  persimberry: ["시몬열매", 1000, "혼란에 빠지면 먹고 낫는다.", 0],
  liechiberry: ["치리열매", 3000, "HP가 1/4 이하가 되면 먹고 공격이 오른다.", 0],
  ganlonberry: ["용아열매", 3000, "HP가 1/4 이하가 되면 먹고 방어가 오른다.", 0],
  salacberry: ["캄라열매", 3000, "HP가 1/4 이하가 되면 먹고 스피드가 오른다.", 0],
  petayaberry: ["야타비열매", 3000, "HP가 1/4 이하가 되면 먹고 특수공격이 오른다.", 0],
  apicotberry: ["규살열매", 3000, "HP가 1/4 이하가 되면 먹고 특수방어가 오른다.", 0],
  chilanberry: ["카리열매", 2000, "노말 타입 기술에 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  chopleberry: ["로플열매", 2000, "격투 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  cobaberry: ["바코열매", 2000, "비행 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  kebiaberry: ["으름열매", 2000, "독 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  shucaberry: ["슈캐열매", 2000, "땅 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  chartiberry: ["루미열매", 2000, "바위 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  tangaberry: ["리체열매", 2000, "벌레 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  kasibberry: ["수불열매", 2000, "고스트 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  babiriberry: ["바리비열매", 2000, "강철 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  occaberry: ["오카열매", 2000, "불꽃 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  passhoberry: ["꼬시개열매", 2000, "물 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  rindoberry: ["린드열매", 2000, "풀 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  wacanberry: ["초나열매", 2000, "전기 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  payapaberry: ["야파열매", 2000, "에스퍼 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  yacheberry: ["플카열매", 2000, "얼음 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  habanberry: ["하반열매", 2000, "드래곤 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  colburberry: ["마코열매", 2000, "악 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  roseliberry: ["로셀열매", 2000, "페어리 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0]
};
// 도전자 지닌 도구 (v16.89 경완 '도전자들도 지닌 도구 활용, 난이도 어려워질수록 도구 활용 잘하고')
// 0 쉬움: 셋 중 하나꼴로 아무 도구 / 1 보통: 대부분 무난한 도구 (자속 타입 강화·자뭉열매·먹다남은음식) / 2 어려움: 모두가 역할에 맞는 도구, 팀 안에서 겹치지 않게
const TY_ORD = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
const TY_IT = Object.fromEntries(TY_ORD.map((t, i) => [t, Object.keys(HOLD).find(k => HOLD[k][3] === i + 1)]));
const TY_BERRY = Object.fromEntries(TY_ORD.map((t, i) => [t, ['chilan', 'chople', 'coba', 'kebia', 'shuca', 'charti', 'tanga', 'kasib', 'babiri', 'occa', 'passho', 'rindo', 'wacan', 'payapa', 'yache', 'haban', 'colbur', 'roseli'][i] + 'berry']));
function foeItems(team, tier, skip, out) {
  const dx = PSim.Dex, used = new Set(skip || []), r = Math.random;
  team.forEach(o => {
    if (o.it) return;
    const sp = dx.species.get(o.fm || D.sp[o.sp]?.id || String(o.sp)); if (!sp?.exists) return;
    const mv = (o.mv || []).map(m => dx.moves.get(m)).filter(m => m.exists), atk = mv.filter(m => m.category !== 'Status'), bs = sp.baseStats;
    const stab = atk.filter(m => sp.types.includes(m.type)).sort((a, b) => (b.basePower || 0) - (a.basePower || 0))[0] || atk[0];
    let L;
    if (!tier) { if (r() > .35) return; L = [pick(['oranberry', 'oranberry', 'quickclaw', 'brightpowder', 'kingsrock', 'cheriberry', 'pechaberry', TY_IT[pick(TY_ORD)]])]; }
    else if (tier === 1) { if (r() > .75) return; L = [r() < .55 && stab ? TY_IT[stab.type] : r() < .5 ? 'sitrusberry' : 'leftovers', 'sitrusberry', 'oranberry']; }
    else {
      const ab = toID(o.ab), phys = atk.filter(m => m.category === 'Physical').length >= atk.filter(m => m.category === 'Special').length;
      const off = phys ? bs.atk : bs.spa, bulk = bs.hp + bs.def + bs.spd, set = mv.some(m => m.id in MV_SETUP), heal = mv.some(m => m.flags?.heal || /recover|roost|softboiled|slackoff|moonlight|synthesis|morningsun|milkdrink|rest|wish/.test(m.id));
      const w4 = TY_ORD.find(t => dx.getImmunity(t, sp.types) && dx.getEffectiveness(t, sp.types) >= 2);
      L = [];
      if (ab === 'guts' && !sp.types.includes('Fire')) L.push('flameorb');
      if (ab === 'poisonheal') L.push('toxicorb');
      if (sp.nfe) L.push('eviolite');
      if (heal || (bulk >= 270 && atk.length <= 2)) L.push(sp.types.includes('Poison') ? 'blacksludge' : 'leftovers');
      if (atk.length === 4 && mv.length === 4) { if (bs.spe >= 70 && bs.spe <= 100 && off >= 90) L.push('choicescarf'); L.push(phys ? 'choiceband' : 'choicespecs'); if (bs.hp + bs.spd >= 160) L.push('assaultvest'); }
      if (set || off >= 100) L.push('lifeorb');
      if (w4) L.push(TY_BERRY[w4]);
      if (bs.def >= 100 && phys === false) L.push('rockyhelmet');
      if (set) L.push('sitrusberry');
      L.push('expertbelt', stab ? TY_IT[stab.type] : 'sitrusberry', 'lumberry', 'sitrusberry', 'leftovers', phys ? 'muscleband' : 'wiseglasses', 'shellbell', 'scopelens');
    }
    if (out) out.push(...[...new Set(L)].filter(k => k && HOLD[k] && !used.has(k) && !out.includes(k)));   // 추천 목록 (상점 추천받기)
    o.it = L.find(k => k && HOLD[k] && (!tier || !used.has(k))) || null; if (o.it) used.add(o.it);
  });
}
// 상점·창고 분류 (경완 2026-10-31 '민트처럼 항목 분류')
const IT_CAT = [['heal', '회복', ['leftovers', 'blacksludge', 'shellbell']], ['atk', '공격 강화', ['choiceband', 'choicespecs', 'lifeorb', 'expertbelt', 'muscleband', 'wiseglasses', 'metronome']],
  ['def', '방어·스피드', ['choicescarf', 'assaultvest', 'eviolite', 'rockyhelmet', 'focusband', 'lightclay']], ['acc', '명중·급소', ['scopelens', 'widelens', 'zoomlens', 'brightpowder', 'kingsrock', 'quickclaw']],
  ['etc', '특수', ['bigroot', 'flameorb', 'toxicorb']], ['type', '타입 강화', Object.keys(HOLD).filter(k => HOLD[k][3])], ['berry', '열매', Object.keys(HOLD).filter(k => /berry$/.test(k))]];
const itImg = id => `${IMG}item/${id}.png`;
const itRow = (id, n, note) => { const x = HOLD[id]; return `<button type="button" class="sp-tm sp-it" data-it="${id}"><img class="tm-ic it-ic" alt="" src="${itImg(id)}"><span class="tm-nm"><b>${esc(x[0])}</b>${n ? `<i class="tm-own">×${n}</i>` : ''}</span><span class="tm-meta"><small>${esc(x[2])}</small>${note ? `<em class="it-note">${note}</em>` : ''}</span></button>`; };
// 도구는 종류마다 하나만 (경완 2026-10-29): 창고에 있거나 누가 지니고 있으면 가진 것
const itWho = id => { const M = S.gym?.mon || {}; for (const k in M) if (M[k]?.it === id) { const P = boxOf(+k || k); if (P) return P; } return null; };
const itHave = id => (S.gym?.itm?.[id] > 0) || !!itWho(id);
// v17.57 경완 '지닌 도구 창에 추천 도구': 어려운 도전자가 도구를 고르는 기준(foeItems 2)을 이 개체의 기술·특성·종족값에 그대로. 다른 포켓몬이 지닌 도구는 빼고
async function recIt(P) { await loadSim(); const e = myEntry(P); e.it = null; e.fmIt = null; const skip = Object.keys(HOLD).filter(k => { const w = itWho(k); return w && w.id !== P.id; });
  try { foeItems([e], 2, skip); } catch (er) { return null; } return e.it && HOLD[e.it] ? e.it : null; }
// 상점 '추천받기' (경완): 이 포켓몬에게 어울리는 도구 목록 (앞이 더 추천)
async function recIts(P) { await loadSim(); const e = myEntry(P); e.it = null; e.fmIt = null; const L = []; try { foeItems([e], 2, [], L); } catch (er) {} return L; }
// 상점 '추천받기' 기술: 이 포켓몬이 배울 수 있는 기술머신(또는 기술레코드) 중 recMoves 기준 점수가 높은 것 — 지금 기술보다 센 자속·견제기, 쓸 만한 변화기
function recTms(P, wantTR) {   // 상점 추천받기: 지금 기술 한 칸과 바꿨을 때 묶음 점수가 가장 많이 오르는 기술머신(또는 기술레코드) 순
  if (!window.PSim) return [];
  const m = gm(P), [c, pool] = recCtx(P, m), own = new Set(pool), cur = m.mv.slice();
  const T = tmOf(P.sp).map(i => D.mv[i]?.[0]).filter(id => id && MVI.has(id) && isTR(id) === !!wantTR && !own.has(id)); T.forEach(id => { c.top = Math.max(c.top, mvVal(MVI.get(id), c, () => false)[0]); });
  const base = setScore(cur, c);
  const L = T.map(id => {
    let g = -1; for (let k = 0; k < Math.max(1, Math.min(4, cur.length + (cur.length < 4 ? 1 : 0))); k++) { const t = cur.slice(); t[k] = id; g = Math.max(g, setScore(t, c) - base); } return [id, g]; });
  return L.filter(([, g]) => g > .015).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
}
// 가진 도구 전부: [id, 지닌 포켓몬|null]. 창고에 있는 것 먼저
const itAll = () => { const g = S.gym || {}, bag = Object.entries(g.itm || {}).filter(([id, n]) => n > 0 && HOLD[id]).map(([id]) => [id, null]), M = g.mon || {}, held = [];
  for (const k in M) { const id = M[k]?.it, P = id && HOLD[id] && boxOf(+k || k); if (P) held.push([id, P]); } return [...bag, ...held]; };
// 지닌 도구 카드: 회색 + 지닌 포켓몬 그림 + 돌려받기 (어느 화면에서든)
const itRowAll = ([id, P]) => { if (!P) return itRow(id); const x = HOLD[id];
  return `<div class="sp-tm sp-it held"><img class="tm-ic it-ic" alt="" src="${itImg(id)}"><span class="tm-nm"><b>${esc(x[0])}</b></span><span class="tm-meta it-who"><span class="it-wth"><img alt="" data-th="${P.id}"></span><small>${esc(nmOf(P))}${jong(nmOf(P)) ? '이' : '가'} 지니고 있어요</small></span><button type="button" class="it-back" data-takeit="${P.id}">돌려받기</button></div>`; };
// 도구 상세 카드: btn = [글자, 누르면] (없으면 닫기만)
const bagN = n => `<i class="gy-own" aria-label="창고에 ${n | 0}개"><svg viewBox="0 0 16 16" width="15" height="15" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M2 3h12v1H2zM1 4h1v3H1zM14 4h1v3h-1zM2 7h12v1H2zM2 8h1v6H2zM13 8h1v6h-1zM3 14h10v1H3zM6 9h4v1H6zM6 10h1v1H6zM9 10h1v1H9zM6 11h4v1H6z"/><path fill="#c8783c" d="M2 4h12v3H2zM3 8h10v6H3z"/><path fill="#e8a060" d="M2 4h12v1H2zM3 8h10v1H3z"/><path fill="#f0c040" d="M7 10h2v1H7z"/><path fill="#8a4a24" d="M3 13h10v1H3zM7 4h2v3H7z"/></svg><b>×${(n | 0).toLocaleString()}</b></i>`;   /* v17.03 경완 '체육관 상점도 이런식으로': 가진 개수는 슬롯 대신 구매 창 제목 줄 오른쪽에 가방 × N */
function itInfo(id, lab, act, foot = '', own) {
  const x = HOLD[id]; if (!x) return; const n = S.gym?.itm?.[id] || 0;
  gymPop(`<h4 class="mi-h${own != null ? ' has-own' : ''}"><img class="tm-ic it-ic" alt="" src="${itImg(id)}">${esc(x[0])}${own != null ? bagN(own) : ''}</h4>${foot}<p class="gy-msg mi-d">${esc(x[2])}</p><div class="gy-btns${lab ? '' : ' one'}">${lab ? `<button data-a="x">닫기</button><button class="main" data-a="t">${lab}</button>` : '<button class="main" data-a="x">닫기</button>'}</div>`,
    (a, close) => { close(); if (a === 't') act?.(); });
}
// 지니게 하기: 이미 지닌 도구는 창고로 돌아온다
function giveIt(P, id) {
  const g = S.gym, m = gm(P); g.itm = g.itm || {}; if (!(g.itm[id] > 0)) return;
  g.itm[id]--; if (!g.itm[id]) delete g.itm[id];
  const old = m.it; if (old) g.itm[old] = (g.itm[old] || 0) + 1; m.it = id; GA.save(); se('DECIDE');
  gymPop(`<p class="gy-msg" style="text-align:center">${esc(nmOf(P))}에게 ${esc(HOLD[id][0])}${jong(HOLD[id][0]) ? '을' : '를'} 지니게 했다!${old ? `<br><small>${esc(HOLD[old]?.[0] || '')}${jong(HOLD[old]?.[0] || '') ? '은' : '는'} 창고로 돌아갔어요.</small>` : ''}</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => c());
}
function takeIt(P) { const g = S.gym, m = gm(P), id = m.it; if (!id) return; g.itm = g.itm || {}; g.itm[id] = (g.itm[id] || 0) + 1; delete m.it; GA.save(); }
// 민트 (경완 2026-10-30 '성격 바꾸는 본가 도구'): 먹으면 성격이 바뀐다. 지니는 도구와 달리 먹으면 없어지고 여러 개 살 수 있음. g.mint = {성격: 개수}
const MINT_P = 3000, MINT = ['lonely', 'adamant', 'naughty', 'brave', 'bold', 'impish', 'lax', 'relaxed', 'modest', 'mild', 'rash', 'quiet', 'calm', 'gentle', 'careful', 'sassy', 'timid', 'hasty', 'jolly', 'naive', 'serious'];
const ro = w => { const j = jong(w); return j && j !== 8 ? '으로' : '로'; };
const mintNm = k => `${natKo(k)}민트`, mintImg = k => `${IMG}item/mint_${k}.png`;
const mintD = k => { const n = D?.nt?.[k] || []; return `먹이면 성격이 ${natKo(k)}${ro(natKo(k))} 바뀐다. ${n[1] ? `${STAT_KO[n[1]]}${jong(STAT_KO[n[1]]) ? '이' : '가'} 잘 오르고 ${STAT_KO[n[2]]}${jong(STAT_KO[n[2]]) ? '이' : '가'} 잘 오르지 않게 된다.` : '능력이 고르게 오르게 된다.'}`; };
const mintAll = () => Object.entries(S.gym?.mint || {}).filter(([k, n]) => n > 0 && MINT.includes(k)).sort((a, b) => MINT.indexOf(a[0]) - MINT.indexOf(b[0]));
const mintRow = (k, n, P) => { const same = P && gm(P).nat === k; return `<button type="button" class="sp-tm sp-it sp-mint${same ? ' off' : ''}" data-mint="${k}" ${same ? 'disabled' : ''}><img class="tm-ic it-ic" alt="" src="${mintImg(k)}"><span class="tm-nm"><b>${esc(mintNm(k))}</b>${n ? `<i class="tm-own">×${n}</i>` : ''}</span><span class="tm-meta"><small>${same ? '지금 성격' : esc(D?.nt?.[k]?.[1] ? `${STAT_KO[D.nt[k][1]]}▲ ${STAT_KO[D.nt[k][2]]}▼` : '변화 없음')}</small></span></button>`; };
function mintInfo(k, lab, act, foot = '', own) {
  gymPop(`<h4 class="mi-h${own != null ? ' has-own' : ''}"><img class="tm-ic it-ic" alt="" src="${mintImg(k)}">${esc(mintNm(k))}${own != null ? bagN(own) : ''}</h4>${foot}<p class="gy-msg mi-d">${esc(mintD(k))}</p><div class="gy-btns${lab ? '' : ' one'}">${lab ? `<button data-a="x">닫기</button><button class="main" data-a="t">${lab}</button>` : '<button data-a="x">닫기</button>'}</div>`,
    (a, close) => { close(); if (a === 't') act?.(); });
}
// v17.57 경완 '성격 창에 추천 성격': 이 개체가 쓰는 공격 기술(물리·특수)과 종족값으로 — 쓰는 공격을 올리고 안 쓰는 공격을 내림.
// 빠른 편(스피드 종족값 80↑ 이고 공격 쪽이 강함)이면 스피드를, 공격이 약하고 막는 쪽이 강하면 방어·특방을 올린다
function recNat(P, m = gm(P)) {
  const bs = SPECIES[P.sp]?.bs || [60, 60, 60, 60, 60, 60];
  const phys = bs[1] >= bs[3],   /* v20.64 경완: 성격 추천도 노력치 추천(evPlan)처럼 종족값만 — 배운 기술은 안 봄 (크레세리아 특공형인데 신중 추천되던 것) */ off = phys ? bs[1] : bs[3], dn = phys ? 'spa' : 'atk';
  let up = phys ? 'atk' : 'spa';
  if (bs[5] >= 80 && off >= 80 && bs[5] < 120) up = 'spe';
  else if (off < 75 && Math.max(bs[2], bs[4]) >= 85) up = bs[2] >= bs[4] ? 'def' : 'spd';
  return NATS().find(k => D.nt[k][1] === up && D.nt[k][2] === dn) || m.nat;
}
function natRec(rn, m) {
  if (!rn || rn === m.nat) return '';   // v17.59 경완: 이미 추천 성격이면 추천 칸 안 띄움
  const g = S.gym || {}, own = g.mint?.[rn] > 0, nt = D.nt[rn] || ['', '', ''];
  if (!own && window.gymEvLu) return '';   // v19.61 경완: 이벤트 안 라인업 화면에선 체육관 상점으로 못 감
  const body = rn === m.nat ? '<small class="it-recw">지금 성격이 추천 성격이에요</small>'
    : `<button type="button" class="sp-tm sp-it sp-mint it-recgo" data-a="${own ? 'ngive' : 'nbuy'}"><img class="tm-ic it-ic" alt="" src="${mintImg(rn)}"><span class="tm-nm"><b>${esc(natKo(rn))}</b></span><span class="tm-meta"><small>${STAT_KO[nt[1]]}▲ ${STAT_KO[nt[2]]}▼</small>${own ? `<em class="it-note">창고에 ${esc(mintNm(rn))} · 누르면 먹여요</em>` : ''}</span>${own ? '' : `<em class="it-recp"><i class="coin"></i>${MINT_P.toLocaleString()}G</em>`}<i class="it-arr" aria-hidden="true">›</i></button>`;
  return `<div class="it-rec"><span class="it-recl">추천 성격</span><div class="it-recb">${body}</div></div>`;
}
function mintUse(P, k) {
  const g = S.gym, m = gm(P); g.mint = g.mint || {}; if (!(g.mint[k] > 0) || m.nat === k) return;
  if (!--g.mint[k]) delete g.mint[k]; m.nat = k; GA.save(); se('DECIDE');
  gymPop(`<p class="gy-msg" style="text-align:center">${esc(nmOf(P))}${jong(nmOf(P)) ? '은' : '는'} ${esc(mintNm(k))}${jong(mintNm(k)) ? '을' : '를'} 먹었다!<br>성격이 ${esc(natKo(k))}${ro(natKo(k))} 바뀌었다!</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => c());
}
// 창고 민트 → 먹이기 → 포켓몬 박스에서 고르기
function mintPick(k, done) {
  boxWin(false, null, done, { title: () => `민트 먹이기 · ${esc(mintNm(k))}`, tip: `${TYPE_KO[S.gym.ty]} 타입 포켓몬만 보여요`, list: () => S.box.filter(tyOk), ok: P => gm(P).nat !== k, first: P => curLu().includes(P.id),
    tag: P => natKo(gm(P).nat), pick: (P, w) => { w.close(); mintUse(P, k); done?.(); } });
}
// 도구 사용 (경완 2026-10-29 '기술 가르치기 > 도구 사용'): 창고와 같은 화면, 탭은 기술머신·도구
let useT = 'it';   // v17.34 경완 '도구 탭이 제일 먼저': 처음 열면 도구 탭
function usePop(P, done) {
  const g = S.gym; g.tms = g.tms || {}; g.itm = g.itm || {};
  const el = document.createElement('section'); el.className = 'gy-setup gy-infos gy-storew tm-teach';
  const draw = () => { const m = gm(P), it = m.it;
    const TL = Object.entries(g.tms).filter(([, n]) => n > 0).map(([id, n]) => [mvOf(id), n, id]).filter(([x]) => x).map(r => [...r, tmCan(P, r[2])]).sort((a, b) => (b[3] - a[3]) || ((b[0][4] || 0) - (a[0][4] || 0)));
    const IL = itAll(), ML = mintAll(), VL = vitAll();
    const T = [['it', '도구', IL.length + ML.reduce((a, r) => a + r[1], 0) + VL.reduce((a, r) => a + r[1], 0)], ['tm', '기술머신', TL.filter(r => !isTR(r[2])).length], ['tr', '기술레코드', TL.reduce((a, r) => a + (isTR(r[2]) ? r[1] : 0), 0)]];
    const TT = TL.filter(r => isTR(r[2]) === (useT === 'tr'));   /* v15.75 기술머신·기술레코드 탭 따로 */
    const body = useT !== 'it' ? (TT.length ? `<div class="sp-list">${TT.map(([x, n, id, ok]) => tmRow(x, n, id, !ok, ok ? '' : (m.mv.includes(id) ? '이미 앎' : '못 배움'))).join('')}</div>` : `<p class="sf-none">가진 ${useT === 'tr' ? '기술레코드가' : '기술머신이'} 없어요. 상점에서 살 수 있어요.</p>`)
      : (IL.length + ML.length + VL.length ? `<div class="sp-list">${IL.map(itRowAll).join('')}${ML.map(([k, n]) => mintRow(k, n, P)).join('')}${VL.map(([i, n]) => vitRow(i, n, P)).join('')}</div>` : '<p class="sf-none">가진 도구가 없어요. 상점에서 살 수 있어요.</p>');
    el.innerHTML = `<div class="gy-sh"><button class="gy-back" type="button" data-a="x" aria-label="뒤로">◀</button><b class="if-t">도구 사용</b></div>
      <div class="gy-body"><p class="tt-who">${thumb(P)}<span><b>${esc(nmOf(P))}</b>${it && HOLD[it] ? `<small class="it-hold">지닌 도구 · ${esc(HOLD[it][0])}</small>` : '<small class="it-hold">지닌 도구 없음</small>'}</span><span class="it-hbtn"><button type="button" class="it-recbtn" data-recit><i aria-hidden="true">★</i>${useT === 'it' ? '추천 도구' : '추천 기술'}</button>${it ? '<button type="button" class="it-take" data-take>돌려받기</button>' : ''}</span></p>
      <div class="sp-tabs st-tabs" role="tablist">${T.map(([k, n, c]) => `<button type="button" role="tab" data-ut="${k}" aria-selected="${useT === k}">${n} <small>${c}</small></button>`).join('')}</div>${body}</div>`;
    fillTh(el); recMk(); };
  // v20.60 경완 '도구 사용 화면에도 추천 도구 버튼, 가진 도구 중 추천할 도구는 테두리 은은하게 + 추천 딱지': 가진 도구(창고) 중 이 포켓몬에게 가장 맞는 것 하나
  let recL = null; const recT = {}; const recMk = () => { if (useT !== 'it') { const k = useT; (recT[k] ? Promise.resolve(recT[k]) : loadSim().then(() => (recT[k] = recTms(P, k === 'tr')))).then(L => { if (!el.isConnected || useT !== k) return; const id = L.find(i => el.querySelector(`.sp-tm[data-tm="${i}"]:not(.off)`)), b = id && el.querySelector(`.sp-tm[data-tm="${id}"]`); if (b && !b.classList.contains('it-recm')) { b.classList.add('it-recm'); b.insertAdjacentHTML('beforeend', '<i class="mv-recl">추천</i>'); } }).catch(() => {}); return; }   /* v20.66 경완: 기술머신·기술레코드 탭에선 가진 것 중 추천 기술 하나에 테두리 + 추천 딱지 */ const mk = () => { const m = gm(P), own = new Set([...el.querySelectorAll('.sp-it[data-it]')].map(b => b.dataset.it)), r = recL.find(id => own.has(id) && id !== m.it), b = r && el.querySelector(`.sp-it[data-it="${r}"]`); if (b && !b.classList.contains('it-recm')) { b.classList.add('it-recm'); b.insertAdjacentHTML('beforeend', '<i class="mv-recl">추천</i>'); } };
    if (recL) return mk(); recIts(P).then(L => { recL = L || []; if (el.isConnected) mk(); }); };
  const recGo = () => recIt(P).then(r => { if (!el.isConnected) return; const m = gm(P);
    if (!r || r === m.it) return gymPop(`<h4>추천 도구</h4><p class="gy-msg" style="text-align:center">${r ? `지금 지닌 ${esc(HOLD[r][0])}${jong(HOLD[r][0]) ? '이' : '가'} 가장 잘 맞아요.` : '지금은 추천할 도구가 없어요.'}</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, c2) => c2());
    if ((g.itm[r] | 0) > 0 || itWho(r)) return itInfo(r, '지니게 하기', () => { giveIt(P, r); draw(); });
    gymPop(`<h4 class="mi-h"><img class="tm-ic it-ic" alt="" src="${itImg(r)}">${esc(HOLD[r][0])}</h4><p class="gy-msg it-own">${esc(nmOf(P))}에게 추천하는 도구예요</p><p class="gy-msg mi-d">${esc(HOLD[r][2])}</p><p class="gy-msg" style="text-align:center"><small>창고에 없어요. 상점에서 살 수 있어요.</small></p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="buy">상점에서 보기</button></div>`, (a, c2) => { c2(); if (a !== 'buy') return;
      el.remove(); window.gymShopIt = r; window.Gym?.k?.openTab?.('shop', { back: 1, re: () => usePop(P, done) }); }); });
  // v20.66 경완 '기술머신·기술레코드 탭에선 추천 도구 버튼이 추천 기술로': 가진 것 중 가장 좋은 기술이면 바로 그 기술 창(가르치기), 없으면 상점에서 보기
  const recGoTm = () => { const k = useT, tr = k === 'tr', nm = tr ? '기술레코드' : '기술머신'; loadSim().then(() => { if (!el.isConnected) return; const L = recT[k] || (recT[k] = recTms(P, tr)), r = L.find(id => (g.tms[id] | 0) > 0 && tmCan(P, id));
    if (r) return mvInfo(r, () => teachTm(P, r, draw));
    const x = L[0] && mvOf(L[0]); if (!x) return gymPop(`<h4>추천 기술</h4><p class="gy-msg" style="text-align:center">지금 기술보다 좋은 ${nm}${tr ? '가' : '이'} 없어요.</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, c2) => c2());
    gymPop(`${tmHead(L[0], 0)}<p class="gy-msg it-own">${esc(nmOf(P))}에게 추천하는 ${nm}${tr ? '예요' : '이에요'}</p>${tmBody(x)}${tmKdBox(L[0])}<p class="gy-msg" style="text-align:center"><small>가진 ${nm}${tr ? '가' : '이'} 없어요. 상점에서 살 수 있어요.</small></p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="buy">상점에서 보기</button></div>`, (a, c2) => { if (!a) return; c2(); if (a !== 'buy') return;
      el.remove(); window.gymShopTm = L[0]; window.Gym?.k?.openTab?.('shop', { back: 1, re: () => usePop(P, done) }); }); }).catch(() => {}); };
  document.querySelector('#gym .gy-main').appendChild(el); draw();   // 하단 메뉴는 그대로
  el.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sfx('tap');
    if (b.dataset.a === 'x') { el.remove(); return done?.(); }
    if (b.dataset.ut) { useT = b.dataset.ut; return draw(); }
    if (b.hasAttribute('data-take')) { takeIt(P); return draw(); }
    if (b.hasAttribute('data-recit')) return useT === 'it' ? recGo() : recGoTm();
    if (b.dataset.takeit) { const Q = boxOf(+b.dataset.takeit || b.dataset.takeit); if (Q) { takeIt(Q); se('DECIDE'); } return draw(); }
    if (b.dataset.tm) { const id = b.dataset.tm; return mvInfo(id, () => teachTm(P, id, draw)); }
    if (b.dataset.it) { const id = b.dataset.it; return itInfo(id, '지니게 하기', () => { giveIt(P, id); draw(); }); }
    if (b.dataset.mint) { const k = b.dataset.mint; return mintInfo(k, '먹이기', () => { mintUse(P, k); draw(); }); }
    if (b.dataset.vit != null) { const i = +b.dataset.vit; return vitInfo(i, '먹이기', () => { vitUse(P, i); draw(); }, S.gym.vit?.[EV_VIT[i][0]] | 0, P); } };
}
// 창고 도구 → 지니게 하기 → 포켓몬 박스에서 고르기
function itPick(id, done) {
  boxWin(false, null, done, { title: () => `도구 지니게 하기 · ${esc(HOLD[id][0])}`, tip: `${TYPE_KO[S.gym.ty]} 타입 포켓몬만 보여요`, list: () => S.box.filter(tyOk), ok: () => true, first: P => curLu().includes(P.id),
    tag: P => { const it = S.gym.mon?.[P.id]?.it; return it && HOLD[it] ? HOLD[it][0] : ''; },
    pick: (P, w) => { w.close(); giveIt(P, id); done?.(); } });
}
// 창고 기술머신 → 기술 가르치기 → 가르칠 포켓몬 고르기 (경완 2026-10-29): 포켓몬 박스와 같은 화면, 배울 수 있는 포켓몬 먼저
function teachPick(id, done) { boxWin(false, id, done); }
// 위력·명중·PP 는 칸을 나눠 줄마다 같은 열에 (경완 2026-10-29)
const mvSt = x => `<em class="mv-st"><i>위력 <b>${x[4] || '—'}</b></i><i>명중 <b>${x[5] && x[5] !== true ? x[5] : '—'}</b></i><i>PP <b>${x[6] || '—'}</b></i></em>`;
// 기술 줄 = 정보 카드 기술 줄과 같은 모양 (경완 2026-10-29 '기술 바꾸기 카드도 상세 카드랑 동일하게')
const mvRow = (x, a) => `<button type="button" class="mp-mv" data-a="${a}" style="--tc:${GA.TYPE_C?.[x[2]] || '#888'}">${tyTag(x[2], x[3])}<b>${esc(x[1])}</b>${mvSt(x)}</button>`;
// 기술 바꾸기: 잊을 기술(또는 빈 칸)을 고르고 → 배울 기술을 고른다. 잊은 기술은 '아는 기술'로 남아 다시 배울 수 있다
// 기술 순서 (경완 2026-10-29): 기술 줄을 꾹 눌러 위아래로 끌면 순서가 바뀐다
function movesPop(P, done, hi = -1) {   // hi: 방금 바꾼 칸 — 테두리가 한 번 빛나고, 창 안 다른 곳을 누르면 꺼진다 (경완 2026-10-31)
  const m = gm(P), C = mvCands(P, m).map(id => [id, mvOf(id)]).filter(([, x]) => x).sort((a, b) => (a[1][2] - b[1][2]) || ((b[1][4] || 0) - (a[1][4] || 0))).map(([id]) => id);   // 배울 기술은 타입순 (경완 2026-10-29)
  let drag = 0, ord = false;
  // 안내 줄 오른쪽 '순서 바꾸기' (경완 2026-10-30): 누르면 길게 누르지 않고 바로 끌어서 순서를 바꾸고, '완료'로 끝
  const p = gymPop(`<h4>${esc(nmOf(P))}의 기술</h4><div class="mv-hd"><p class="gy-msg">바꿀 기술을 고르세요</p></div>
    <div class="mp-moves mp-line pick mv-ord">${m.mv.map((id, i) => mvOf(id) ? mvRow(mvOf(id), 's' + i).replace('class="mp-mv"', `class="mp-mv${(Array.isArray(hi) ? hi.includes(i) : i === hi) ? ' just' : ''}"`) : '').join('')}${m.mv.length < 4 ? `<button class="mp-mv empty" data-a="s${m.mv.length}"><b>빈 칸</b></button>` : ''}</div>
    <div class="mv-tools">${m.mv.length > 1 ? '<button type="button" class="mv-ordb" data-a="ord">순서 바꾸기</button>' : ''}<button type="button" class="mv-ordb mv-recb" data-a="rec">추천 기술</button></div>
    <div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close, btn) => {
    if (a === 'rec') { if (ord) return; loadSim().then(() => { if (!p.isConnected) return; const nw = recMoves(P, m), was = m.mv.slice();   // v17.57 경완 '추천 기술': 배울 수 있는 기술 중 능력치·실전 배틀 기준으로 알아서
      if (nw.join() === was.join()) { p.querySelector('.mv-hd .gy-msg').textContent = '지금 기술이 추천 기술이에요'; return; }
      m.mv = nw; m.kn = [...new Set([...(m.kn || []), ...was.filter(id => !nw.includes(id))])].filter(id => !nw.includes(id)); GA.save(); learnFan?.();
      close(); movesPop(P, done, nw.map((id, i) => was[i] === id ? -1 : i).filter(i => i >= 0)); }); return; }
    if (a === 'ord') { ord = !ord; list.classList.toggle('on', ord); btn.textContent = ord ? '완료' : '순서 바꾸기'; btn.classList.toggle('on', ord); p.querySelector('.mv-hd .gy-msg').textContent = ord ? '기술을 끌어서 순서를 바꾸세요' : '바꿀 기술을 고르세요'; return; }
    if (drag || (ord && a !== 'x')) return;
    if (a === 'x') { close(); return done?.(); }
    const k = +a.slice(1), old = m.mv[k];
    // 지금 기술을 누르면 먼저 상세 카드, 거기서 '기술 바꾸기'를 눌러야 배울 기술 고르기로 (경완 2026-10-30). 빈 칸은 바로
    // 상세 카드는 기술 창을 닫지 않고 그 위에 뜬다 (뒤는 흐리게, 경완 2026-10-31)
    if (old) return mvInfo(old, () => { close(); pickNew(k, old); }, '기술 바꾸기', () => {});
    close(); pickNew(k, old);
  });
  function pickNew(k, old) {
    if (!C.length) { gymPop(`<h4>기술 바꾸기</h4><p class="gy-msg">지금 배울 수 있는 다른 기술이 없어요. 레벨을 올리거나 기술머신·훈련장에서 익혀 보세요.</p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="tm">기술 가르치기</button></div>`, (b, c2) => { c2(); if (b === 'tm') return tmPop(P, () => movesPop(P, done), k); movesPop(P, done); }); return; }
    // 배울 기술을 누르면 바로 바뀌지 않고 상세 창 → '바꾸기' (경완 2026-10-29)
    const learn = () => recMark(oldCard(gymPop(`<span class="mv-tagl new">새로 배울 기술</span><div class="mp-moves mp-line pick mv-learn">${C.map(id => mvRow(mvOf(id), 'n' + id)).join('')}</div><div class="gy-btns"><button data-a="x">뒤로</button><button class="main" data-a="tm">기술 가르치기</button></div>`, (b, c2) => {
      if (b === 'o') return;   // 바뀔 기술 카드는 보기만 (v13.18 경완)
      if (b === 'x') { c2(); return movesPop(P, done); }
      if (b === 'tm') { c2(); return tmPop(P, () => movesPop(P, done, Math.min(k, gm(P).mv.length - 1)), k); }   // 기술머신으로 이 칸에 가르치기 (경완 2026-10-29)
      const id = b.slice(1);
      mvInfo(id, () => { c2(); m.kn = (m.kn || []).filter(x => x !== id); if (old) { m.mv[k] = id; if (!m.kn.includes(old)) m.kn.push(old); } else m.mv.push(id); GA.save(); learnFan(); movesPop(P, done, old ? k : m.mv.length - 1); }, old ? '바꾸기' : '배우기', () => {}); })));
    // v17.59 경완 '기술 하나 바꿀 때도 다른 기술과의 조합으로 추천 기술 테두리 은은하게': 나머지 기술과 묶었을 때 가장 좋은 배울 기술 (지금보다 나을 때만)
    function recMark(p) { loadSim().then(() => { if (!p.isConnected) return; const r = recSlot(P, k, C); const b = r && p.querySelector(`.mv-learn [data-a="n${r}"]`); if (b) { b.classList.add('mv-recm'); b.insertAdjacentHTML('beforeend', '<i class="mv-recl">추천</i>'); b.scrollIntoView({ block: 'nearest' }); } }); return p; }
    // v13.19 경완: 바뀔 기술 = 창 위 바깥에 따로 뜨는 카드
    function oldCard(p) { p.querySelector(':scope>.win').classList.add('mv-neww'); if (old && mvOf(old)) p.insertAdjacentHTML('afterbegin', `<div class="win mv-oldc"><span class="mv-oldl">바꿀 기술</span><div class="mp-moves mp-line mv-old">${mvRow(mvOf(old), 'o')}</div></div>`); return p; }
    learn();
  }
  const list = p.querySelector('.mv-ord'); let lp = null;
  if (Array.isArray(hi) ? hi.length : hi >= 0) p.addEventListener('pointerdown', () => p.querySelectorAll('.mp-mv.just').forEach(b => b.classList.remove('just')), { once: true });
  const end = () => { if (!lp) return; clearTimeout(lp.t); const on = lp.on; lp.b.classList.remove('drag'); lp = null; if (!on) return;
    const rows = [...list.querySelectorAll('.mp-mv:not(.empty)')], o2 = rows.map(b => +b.dataset.a.slice(1)), mv0 = m.mv.slice();
    m.mv = o2.map(i => mv0[i]); GA.save();
    if (ord) { rows.forEach((b, i) => { b.dataset.a = 's' + i; }); setTimeout(() => { drag = 0; }, 0); return; }   // 순서 바꾸기 중엔 창을 그대로 두고 번호만 새로
    setTimeout(() => { drag = 0; p.remove(); movesPop(P, done); }, 0); };
  list.addEventListener('contextmenu', e => e.preventDefault());
  list.addEventListener('pointerdown', e => { const b = e.target.closest('.mp-mv:not(.empty)'); if (!b || m.mv.length < 2) return;
    addEventListener('pointerup', end, { once: true }); addEventListener('pointercancel', end, { once: true });
    if (ord) { e.preventDefault(); lp = { b, y: e.clientY, on: true }; drag = 1; b.classList.add('drag'); sfx('tap'); return; }
    lp = { b, y: e.clientY, on: false, t: setTimeout(() => { if (!lp) return; lp.on = true; drag = 1; b.classList.add('drag'); sfx('tap'); vib(1); }, 380) }; });
  list.addEventListener('pointermove', e => { if (!lp) return;
    if (!lp.on) { if (Math.abs(e.clientY - lp.y) > 8) { clearTimeout(lp.t); lp = null; } return; }
    e.preventDefault(); const rows = [...list.querySelectorAll('.mp-mv:not(.empty)')];
    for (const r of rows) { if (r === lp.b) continue; const R = r.getBoundingClientRect(); if (e.clientY > R.top && e.clientY < R.bottom) { const i = rows.indexOf(r), j = rows.indexOf(lp.b); r.parentNode.insertBefore(lp.b, i > j ? r.nextSibling : r); break; } } });
}
// 연습 배틀: 라인업 평균 레벨 근처의 아무 트레이너
async function practice() {
  const ids = curLu(); if (!ids.length) return; const my = ids.map(boxOf).filter(Boolean);
  const avg = Math.round(my.reduce((s, P) => s + gm(P).lv, 0) / my.length);
  const T = pick(PRACTICE), n = clampN(Math.round(rnd(1, Math.min(3, my.length) + .4)), 1, 3);
  const team = Array.from({ length: n }, () => foeEntry(pick(T.sp), clampN(avg + Math.round(rnd(-3, 1)), 2, 100)));
  // 연습 배틀도 끝나면 상대가 한마디 (경완 2026-10-28)
  const say = { win: pick(['으윽, 연습이라도 지는 건 분하네요!', '덕분에 좋은 연습이 됐어요!', '역시 관장님 포켓몬은 강하네요.', '다음 연습 땐 꼭 이길게요!']), lose: pick(['연습이라도 이긴 건 이긴 거죠!', '오늘은 제가 한 수 위였네요!', '좋은 연습 상대가 되어 드렸나요?']) };
  const foe = { tr: T.tr, cls: TR_KO[T.tr] || '트레이너', nm: pick(T.f ? NAMES_F : NAMES_M), team, say };
  document.body.classList.add('gymBattle');
  // 연습 배틀은 보상·경험치 연출 없음 (v13.04 경완)
  try { await run({ my, foe, diff: 1, practice: true, bg: pick(['in1', 'in2', 'in3']) }); }
  catch (e) { console.error(e); GA.toast?.('배틀을 시작하지 못했어요'); }
  finally { document.body.classList.remove('gymBattle'); drawTab(); }
}

// ---------- 노력치 (v20.45 경완 2026-11-09~10, 시안 https://claude.ai/artifact/DdyuhYTmJgYGN6mMttb7dr) ----------
// m.ev = 능력치별 노력치 [HP 공격 방어 특공 특방 스피드], m.evp = 남은 노력치 (− 로 뺀 것). 합계(넣은 + 남은) 510, 한 능력치 252
// 배틀에서 쓰러뜨린 종의 노력치(gym/evy.json, PokeAPI)는 능력치에 바로, 훈련장 토글도 고른 능력치에 바로. + 는 남은 노력치에서 1당 EV_PP 골드
// 동네 체육관(등급 1)이 돼서 훈련장이 열릴 때부터 쌓이고 상세카드에 노력치 박스가 생긴다
const EV_N = ['HP', '공격', '방어', '특공', '특방', '스피드'], EV_MAX = 510, EV_ONE = 252, EV_PP = 10, EV_VP = 300;
const EV_VIT = [['hpup', '맥스업'], ['protein', '타우린'], ['iron', '사포닌'], ['calcium', '리보플라빈'], ['zinc', '키토산'], ['carbos', '알칼로이드']];
const EV_VD = ['체력이 나는 영양 드링크', '근육을 키우는 영양 드링크', '몸을 단단하게 하는 영양 드링크', '머리가 맑아지는 영양 드링크', '마음이 단단해지는 영양 드링크', '몸이 가벼워지는 영양 드링크'];
const EV_PW = ['powerweight', 'powerbracer', 'powerbelt', 'powerlens', 'powerband', 'poweranklet'];
let EVY = null; const evyLoad = () => EVY ? Promise.resolve(EVY) : getJ('gym/evy.json').then(j => (EVY = j || {}));
const evOn = () => { try { return !!S.gym?.d && [S.gym, ...(S.gym.shelf || [])].some(g => Math.max(g.gmax | 0, window.Gym.k.gradeOf(g.rep || 0).i) >= 2); } catch (e) { return false; } };   // v20.99 경완: 노력치는 계정에서 처음 떠오르는 체육관이 됐을 때부터, 그 뒤엔 다른 타입 체육관을 새로 열어도 계속 (동네 체육관은 특별한 기술만)
const evArr = m => (m.ev = Array.isArray(m.ev) && m.ev.length === 6 ? m.ev : [0, 0, 0, 0, 0, 0]);
const evSumOf = m => evArr(m).reduce((a, b) => a + (b | 0), 0);
// 쌓기: 능력치 i 에 n 만큼 (252·510 넘는 몫은 버림). 넣은 양을 돌려줌
function evAdd(m, i, n) { const e = evArr(m), room = Math.max(0, Math.min(EV_ONE - (e[i] | 0), EV_MAX - evSumOf(m) - (m.evp | 0))), k = Math.max(0, Math.min(room, Math.floor(n))); e[i] = (e[i] | 0) + k; return k; }
// 배틀: 쓰러뜨린 종의 노력치를 싸운 포켓몬(학습장치로 받은 포켓몬 빼고)에게 (본가처럼 같이 나와 싸운 포켓몬은 다 받음)
function evBattle(P, sp) { if (!EVY) return;   /* v20.54 경완: 노력치는 처음부터 쌓이고, 보이는 건 동네 체육관부터 */ const y = EVY[sp] || EVY[SPECIES[sp]?.b] || ''; if (!y) return; const m = gm(P); for (let i = 0; i < 6; i++) if (+y[i]) evAdd(m, i, +y[i]); }
// v20.52 경완 '원래 있는 포켓몬도 레벨이랑 배틀에서 쓰러뜨린 포켓몬 반영해서': 포켓몬별 쓰러뜨린 기록은 없어서 어림한다.
// 처음 레벨부터 얻은 경험치 − 훈련장 경험치 = 배틀 경험치(학습장치 몫 어림해 ×0.8) → 같은 레벨 상대를 쓰러뜨린 것으로 한 마리씩 셈,
// 상대 종은 최근 배틀 기록(blog) 상대들(없으면 체육관 타입 포켓몬) → 그 종 노력치. 이미 쌓인 칸은 모자란 만큼만. 포켓몬마다 한 번 (m.evM)
function evMig() {
  if (!EVY || !D || !S.gym?.mon) return 0; let done = 0;
  const pool = []; for (const r of S.gym.blog || []) for (const f of r.fo || []) if (EVY[f[0]]) pool.push(f[0]);
  if (!pool.length) for (const k of Object.keys(EVY)) { const sp = +k; if (SPECIES[sp] && (!S.gym.ty || (SPECIES[sp].t || []).includes(S.gym.ty))) pool.push(sp); }
  if (!pool.length) return 0;
  const TL = S.gym.tlog || {};
  for (const P of S.box) { const m = S.gym.mon[P.id]; if (!m || m.evM) continue; m.evM = 1; done++;
    const g = growth(P.sp), L0 = BASE_LV[GA.rankOf(P)] || 5, tx = Object.values(TL[P.id] || {}).reduce((a, d) => a + (d?.x | 0), 0);
    let bud = Math.max(0, ((m.xp ?? xpAt(g, m.lv || 1)) - xpAt(g, L0) - tx) * .8), L = L0, xp = xpAt(g, L0); const est = [0, 0, 0, 0, 0, 0], r = seeded('evm' + P.id);
    for (let it = 0; it < 3000 && bud > 0; it++) { while (L < LV_MAX && xp >= xpAt(g, L + 1)) L++;
      const sp = pool[Math.floor(r() * pool.length)], k = xpFor({ sp, lv: L }, L); if (k > bud && r() > bud / k) break; bud -= k; xp += k;
      const y = EVY[sp] || ''; for (let i = 0; i < 6; i++) est[i] += +y[i] || 0; }
    const e = evArr(m); for (let i = 0; i < 6; i++) if (est[i] > (e[i] | 0)) evAdd(m, i, est[i] - (e[i] | 0)); }
  if (done) try { GA.save(); } catch (e) {}
  return done; }
const evSet = m => { const e = evArr(m); return { hp: e[0], atk: e[1], def: e[2], spa: e[3], spd: e[4], spe: e[5] }; };
// 상세카드 노력치 박스 (능력치 박스 밑)
function evBox(m) { if (!m.evM) evMig(); if (!evOn()) return ''; const e = evArr(m), u = evSumOf(m), pl = m.evp | 0;
  return `<button type="button" class="ev-box2" data-a="ev"><span class="eb2-t"><small>노력치</small><span class="n"><b>${u + pl}</b><span> / ${EV_MAX}</span></span><i class="eb-bar"><i class="p" style="width:${(pl / EV_MAX * 100).toFixed(1)}%"></i><i class="u" style="width:${(u / EV_MAX * 100).toFixed(1)}%"></i></i><em class="pool">${pl} 남음</em><span class="r">›</span></span>`
    + `<span class="eb2-s">${EV_N.map((n, i) => `<span class="${!e[i] ? 'z' : e[i] >= EV_ONE ? 'mx' : ''}"><small>${n}</small><b>${e[i] | 0}</b></span>`).join('')}</span></button>`; }
// ? 힌트: 종족값으로 주로 찍는 배분 (공격·특공 중 높은 쪽, 스피드 80 이상이면 빠른 공격형, 아니면 튼튼한 공격형)
function evPlan(sp) { const BS = SPECIES[sp]?.bs || [60, 60, 60, 60, 60, 60], a = BS[1] >= BS[3] ? 1 : 3, fast = BS[5] >= 80, d = BS[2] >= BS[4] ? 2 : 4;
  return fast ? { k: [a, 5, 0], v: [252, 252, 6], nm: a === 1 ? '빠른 물리 공격형' : '빠른 특수 공격형', why: `${EV_N[a]}(${BS[a]})${a === 1 ? '이' : '이'} 높고 스피드(${BS[5]})도 빨라서, 먼저 때려서 쓰러뜨리는 배분을 가장 많이 써요.`, alt: { k: [0, a, d], v: [252, 252, 6], nm: '튼튼하게' } }
    : { k: [0, a, d], v: [252, 252, 6], nm: a === 1 ? '튼튼한 물리 공격형' : '튼튼한 특수 공격형', why: `스피드(${BS[5]})가 느린 편이라, HP를 채워 오래 버티며 ${EV_N[a]}${a === 1 ? '으로' : '으로'} 때리는 배분을 많이 써요.`, alt: { k: [a, 5, 0], v: [252, 252, 6], nm: '빠르게' } }; }
// v20.50 경완: 도전자 노력치 = 체육관 등급별 (처음 등급 0 ~ 전설 등급 주력 두 능력치 252씩), 배분은 추천과 같은 틀 (30%는 다른 배분)
const EV_FOE = [0, 84, 168, 252, 336, 420, 510];
function foeEvs(sp, gi) { const T = EV_FOE[Math.max(0, Math.min(EV_FOE.length - 1, gi | 0))], o = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }; if (!T) return o;
  const pl = evPlan(sp), x = Math.random() < .3 ? pl.alt : pl, K = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  x.k.forEach((k, j) => { o[K[k]] = Math.floor(x.v[j] * T / EV_MAX); }); return o; }
const evSpend = n => { if (S.gold < n) return false; S.gold -= n; try { GA.renderGold(); } catch (e) {} try { window.Gym.k.renderGoldG(); } catch (e) {} try { window.pkGold?.('gym', n); } catch (e) {} return true; };
// 노력치 설정 창 (시안 설정 시연 v34 그대로): − 공짜 → 남은 노력치, + 1당 10G, 영양제 +10 (영양제 몫은 영양제 − 로만), 정산표, 되돌리기 · ○G 내고 저장
function evPop(P, done) {
  const m = gm(P), sp = P.sp, IV = P.iv || [0, 0, 0, 0, 0, 0], LV = m.lv || 1, N = EV_N, PP = EV_PP, VP = EV_VP, VIT = EV_VIT.map(([k]) => itImg(k)), VN = EV_VIT.map(x => x[1]);
  const statC = {}; const stat = (i, e) => { const k = i * 1000 + e; if (statC[k] != null) return statC[k]; const a = [0, 0, 0, 0, 0, 0]; a[i] = e; return (statC[k] = statsOf(sp, LV, IV, m.nat, a)[i]); };
  const bagOf = () => S.gym.vit || (S.gym.vit = {});
  let SAVED = { ev: evArr(m).slice(), pool: m.evp | 0, bag: EV_VIT.map(([k]) => bagOf()[k] | 0) }, S1;
  const p = gymPop(`<button class="mp-x ev-x" data-a="x" aria-label="닫기">✕</button><div class="ev-hd">${thumb(P)}<div><h4>${esc(nmOf(P))} 노력치<button type="button" class="ev-q" data-q aria-label="노력치 찍는 법"><svg viewBox="0 0 5 7" width="8" height="11" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h3v1h-3zM0 1h1v1h-1zM4 1h1v2h-1zM3 3h1v1h-1zM2 4h1v1h-1zM2 6h1v1h-1z"/></svg></button></h4><p class="ev-lv">Lv.${LV} · ${natKo(m.nat)} 성격</p></div></div>
  <div class="ev-pool"><button type="button" class="ev-rec" data-rec>추천</button><div class="ep-l"><small>남은 노력치</small><b class="evp-n">0</b></div><div class="ep-r"><small>합계</small><span><b class="evu-n">0</b> / ${EV_MAX}</span></div><i class="ep-g"><i class="gPool"></i><i class="gNew"></i><i class="gVit"></i></i></div>
  <div class="ev-cols"><span></span><small class="l">노력치</small><small>능력치</small><small>빼기</small><small>넣기</small><small>영양제</small></div>
  <div class="ev-list"></div>
  <div class="ev-key"><span><b class="k p">+</b>넣기 <em>1당 <i class="coin"></i>${PP}G</em></span><span><b class="k m">−</b>빼기 <em>공짜</em></span><span><img class="k" alt="" src="${VIT[1]}">영양제 <em>1당 노력치 +10</em></span><span><b class="k h">꾹</b>누르면 <em>계속</em></span></div>
  <div class="ev-bill"><p class="eb-h"><span>정산표</span><span class="eb-gold">보유 <i class="coin"></i><b class="evg-n">0</b>G</span></p><div class="eb-rows"></div><div class="eb-tot"><span>합계</span><b><i class="coin"></i><span class="evc-n">0</span>G</b></div></div>
  <div class="gy-btns"><button data-a="cancel" class="ev-cancel">되돌리기</button><button class="main ev-save" data-a="save">저장</button></div>
  <p class="ev-toast" hidden></p>`, (a, close) => {
    if (a === 'x') { close(); done?.(); return; }
    if (a === 'cancel') { start(); toast('바꾼 걸 되돌렸어요'); return; }
    if (a === 'save') { const c = cost(); if (c > S.gold || !dirty()) return; if (c && !evSpend(c)) return;
      if (c) try { window.GymBGM?.se('DP_REGI'); } catch (e) {}
      const e = evArr(m); for (let i = 0; i < 6; i++) e[i] = S1.ev[i]; m.evp = S1.pool; const B0 = bagOf(); EV_VIT.forEach(([k], i) => { const n = (B0[k] | 0) - S1.vUse[i]; if (n > 0) B0[k] = n; else delete B0[k]; });
      GA.save(); SAVED = { ev: S1.ev.slice(), pool: S1.pool, bag: EV_VIT.map(([k]) => B0[k] | 0) }; start(); toast(c ? `${c.toLocaleString()}G를 내고 저장했어요` : '저장했어요');
      setTimeout(() => { if (p.isConnected) { p.remove(); done?.(); } }, 700); }
  });
  p.classList.add('ev-pop'); window.Gym?.k?.tutEv?.('D');   // v20.55 설정 창이 처음 열리면 강박사가 설정 창 설명
  const W = p.querySelector('.win'), $ = s => W.querySelector(s), list = $('.ev-list');
  p.onclick = (h => e => { if (e.target === p) { p.remove(); done?.(); return; } h(e); })(p.onclick);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const putAmt = i => Math.max(0, S1.ev[i] - SAVED.ev[i] - S1.vAdd[i]);
  const cost = () => S1.ev.reduce((a, _, i) => a + putAmt(i), 0) * PP + S1.vBuy.reduce((a, n) => a + n * VP, 0);
  const dirty = () => JSON.stringify([S1.ev, S1.pool]) !== JSON.stringify([SAVED.ev, SAVED.pool]);
  list.innerHTML = N.map((n, i) => `<div class="ev-r" data-i="${i}"><span class="ev-n">${n}</span><span class="ev-g"><i class="o"></i><i class="n"></i><i class="evv"></i><b></b></span><small class="ev-d"></small><button type="button" class="ev-b ev-m" data-m="${i}" aria-label="${n} 빼기">−</button><button type="button" class="ev-b ev-pl" data-p="${i}" aria-label="${n} 넣기">+</button><span class="ev-vw"><button type="button" class="ev-b ev-vb" data-v="${i}" aria-label="${n} 영양제 먹이기"><img alt="" src="${VIT[i]}"><small></small></button><button type="button" class="ev-b ev-vx" data-x="${i}" aria-label="${n} 영양제 빼기" hidden>−<em></em></button></span></div>`).join('');
  const rows = [...list.children];
  function drawBill(c) { const L = [];
    N.forEach((n, i) => { const a = putAmt(i); if (a) L.push(`<div class="eb-r"><span>${n} 노력치 <em>+${a}</em></span><small>${a} × ${PP}G</small><b>${(a * PP).toLocaleString()}G</b></div>`); });
    N.forEach((n, i) => { const b = S1.vBuy[i], u = S1.vUse[i];
      if (b) L.push(`<div class="eb-r v"><span><img alt="" src="${VIT[i]}">${VN[i]} <strong>×${b}</strong> <em>${n}</em></span><small>개당 ${VP}G</small><b>${(b * VP).toLocaleString()}G</b></div>`);
      if (u) L.push(`<div class="eb-r v bag"><span><img alt="" src="${VIT[i]}">${VN[i]} <strong>×${u}</strong> <em>${n}</em></span><small>가방에서</small><b>0G</b></div>`); });
    const br = $('.eb-rows'); br.innerHTML = L.length ? L.join('') : '<p class="eb-0">넣은 노력치 없음</p>'; br.onscroll = () => br.classList.toggle('more', br.scrollTop + br.clientHeight < br.scrollHeight - 2); br.onscroll(); }
  function draw() {
    const u = sum(S1.ev), c = cost();
    $('.evp-n').textContent = S1.pool; $('.evu-n').textContent = u + S1.pool; $('.evg-n').textContent = S.gold.toLocaleString(); drawBill(c);
    const base = S1.ev.map((v, i) => Math.min(v, SAVED.ev[i])), nw = S1.ev.map((v, i) => v - base[i]);
    const va = sum(S1.vAdd); $('.gNew').style.width = ((u - va) / EV_MAX * 100) + '%'; $('.gVit').style.width = (va / EV_MAX * 100) + '%'; $('.gPool').style.width = (S1.pool / EV_MAX * 100) + '%';
    $('.ev-pool').classList.toggle('zero', !S1.pool); $('[data-rec]').disabled = !S1.pool && !sum(S1.ev);
    rows.forEach((r, i) => { const v = S1.ev[i];
      r.querySelector('.o').style.width = (base[i] / EV_ONE * 100) + '%'; const vt = Math.min(S1.vAdd[i], nw[i]), pl = nw[i] - vt; r.querySelector('.n').style.width = (pl / EV_ONE * 100) + '%'; r.querySelector('.n').style.left = (base[i] / EV_ONE * 100) + '%'; r.querySelector('.evv').style.width = (vt / EV_ONE * 100) + '%'; r.querySelector('.evv').style.left = ((base[i] + pl) / EV_ONE * 100) + '%';
      { const d0 = v - SAVED.ev[i]; r.querySelector('.ev-g b').innerHTML = d0 ? `${v}<em class="${d0 > 0 ? 'p' : 'm'}">(${d0 > 0 ? '+' : '−'}${Math.abs(d0)})</em>` : v; }
      const g0 = stat(i, SAVED.ev[i]) - stat(i, 0), g1 = stat(i, v) - stat(i, 0), sd = r.querySelector('.ev-d');
      let nx = v + 1; while (nx <= EV_ONE && stat(i, nx) === stat(i, v)) nx++; const step = nx > EV_ONE ? 0 : nx - v;
      let pv = v; while (pv > 0 && stat(i, pv - 1) === stat(i, v)) pv--; const span = step ? nx - pv : 1;
      sd.innerHTML = `<span class="dv"><b class="now${g0 ? '' : ' z'}">${g0}</b>${g1 === g0 ? '<i></i><b></b>' : `<i>→</i><b class="${g1 > g0 ? 'up' : 'dn'}">${g1}</b>`}</span>` + `<span class="nx">${step ? `<i class="pb"><i style="width:${(v - pv) / span * 100}%"></i></i>` : '최대'}</span>`;
      r.classList.toggle('full', v >= EV_ONE); r.classList.toggle('chg', v !== SAVED.ev[i]);
      r.querySelector('.ev-m').disabled = v - S1.vAdd[i] <= 0; r.querySelector('.ev-pl').disabled = !S1.pool || v >= EV_ONE;
      const room = v < EV_ONE && u + S1.pool < EV_MAX, vb = r.querySelector('.ev-vb'), have = S1.bag[i] - S1.vUse[i];
      vb.disabled = !room; vb.querySelector('small').innerHTML = have > 0 ? `×${have}` : `${VP}`; vb.classList.toggle('have', have > 0); const vn = S1.vBuy[i] + S1.vUse[i], vx = r.querySelector('.ev-vx'); vx.hidden = !vn; vx.querySelector('em').textContent = vn; });
    $('.evc-n').textContent = c.toLocaleString(); $('.ev-bill').classList.toggle('on', c > 0); $('.ev-bill').classList.toggle('short', c > S.gold);
    $('.ev-save').innerHTML = c ? `<i class="coin"></i>${c.toLocaleString()}G 내고 저장` : '저장'; $('.ev-save').disabled = !dirty() || c > S.gold; $('.ev-cancel').disabled = !dirty();
  }
  const put = i => { if (!S1.pool || S1.ev[i] >= EV_ONE) return false; S1.pool--; S1.ev[i]++; draw(); return true; };
  const take = i => { if (S1.ev[i] - S1.vAdd[i] <= 0) return false; S1.ev[i]--; S1.pool++; draw(); return true; };
  const vit = i => { const u = sum(S1.ev); if (S1.ev[i] >= EV_ONE || u + S1.pool >= EV_MAX) return false; const k = Math.min(10, EV_ONE - S1.ev[i], EV_MAX - u - S1.pool);
    const fromBag = S1.bag[i] - S1.vUse[i] > 0; S1.vK[i].push({ k, bag: fromBag }); if (fromBag) S1.vUse[i]++; else S1.vBuy[i]++; S1.ev[i] += k; S1.vAdd[i] += k; draw(); return true; };
  const unvit = i => { const t = S1.vK[i].pop(); if (!t) return false; S1.ev[i] -= t.k; S1.vAdd[i] -= t.k; if (t.bag) S1.vUse[i]--; else S1.vBuy[i]--; draw(); return true; };
  // 영양제 첫 누름 = 상점 카드 모양 설명, 이번에 하나라도 먹였으면 바로 먹임
  const vcOpen = i => { const have = S1.bag[i] - S1.vUse[i];
    gymPop(`<h4 class="mi-h has-own"><img class="tm-ic it-ic" alt="" src="${VIT[i]}">${VN[i]}${bagN(have)}</h4><p class="gy-msg mi-d">${EV_VD[i]}. 먹이면 ${N[i]} 노력치가 10 올라간다.</p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="y">${have > 0 ? '먹이기' : `<i class="coin"></i>${VP}G 먹이기`}</button></div>`, (a, c2) => { c2(); if (a === 'y') vit(i); }); };
  // ? 힌트 카드
  const qOpen = () => { const P0 = evPlan(sp), chips = Q => Q.k.map((k, j) => `<span class="q-c"><small>${N[k]}</small><b>${Q.v[j]}</b></span>`).join('');
    const q = gymPop(`<h4 class="mi-h">${esc(SPECIES[sp]?.n || nmOf(P))}${jong(SPECIES[sp]?.n || '') ? '은' : '는'} 이렇게 많이 찍어요</h4><div class="q-main"><p class="q-nm">${P0.nm}</p><div class="q-cs">${chips(P0)}</div></div><p class="gy-msg mi-d">${P0.why}</p>
      <div class="q-alt"><small>이렇게도 찍어요 · ${P0.alt.nm}</small><span>${P0.alt.k.map((k, j) => `${N[k]} ${P0.alt.v[j]}`).join(' · ')}</span></div><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="y">이대로 추천 찍기</button></div>`, (a, c2) => { c2(); if (a === 'y') rec(); }); q.classList.add('ev-qpop'); };
  // 추천: 남은 노력치를 힌트 배분 순서대로, 능력치가 안 오르는 자투리는 추천 배분의 다른 칸으로
  // v20.59 경완 '추천은 이미 들어간 노력치를 빼고 배분하는 것까지': 추천 배분 밖 칸·목표보다 많은 칸은 먼저 빼서(공짜) 남은 노력치로 모은 뒤 찍는다 (영양제로 이번에 넣은 몫은 그대로)
  function rec() { const P0 = evPlan(sp), before = S1.ev.slice(), tgt = [0, 0, 0, 0, 0, 0]; P0.k.forEach((k, j) => { tgt[k] = P0.v[j]; });
    for (let i = 0; i < 6; i++) { const n = Math.max(0, Math.min(S1.ev[i] - S1.vAdd[i], S1.ev[i] - tgt[i])); if (n) { S1.ev[i] -= n; S1.pool += n; } }
    if (!S1.pool) { draw(); return toast('이미 추천대로 찍혀 있어요'); }
    const add = [0, 0, 0, 0, 0, 0]; let left = S1.pool; const room = i => EV_ONE - S1.ev[i] - add[i];
    P0.k.forEach((k, j) => { const n = Math.max(0, Math.min(left, P0.v[j] - S1.ev[k] - add[k], room(k))); add[k] += n; left -= n; });
    for (const k of [...P0.k, 0, 1, 2, 3, 4, 5]) { if (!left) break; const n = Math.min(left, room(k)); add[k] += n; left -= n; }
    for (let i = 0; i < 6; i++) { if (!add[i]) continue; const v = S1.ev[i] + add[i]; let pv = v; while (pv > S1.ev[i] && stat(i, pv - 1) === stat(i, v)) pv--; const waste = v - pv; if (!waste || v >= EV_ONE) continue;
      for (const j of P0.k) { if (j === i) continue; const w = S1.ev[j] + add[j]; let nx = w + 1; while (nx <= EV_ONE && stat(j, nx) === stat(j, w)) nx++; if (nx <= EV_ONE && nx - w <= waste) { add[i] -= waste; add[j] += waste; break; } } }
    add.forEach((n, i) => { S1.ev[i] += n; S1.pool -= n; }); sfx('tap'); draw(); const dd = S1.ev.map((v, i) => v - before[i]); toast(dd.some(Boolean) ? '추천대로 찍었어요' : '이미 추천대로 찍혀 있어요'); }
  W.querySelector('[data-q]').onclick = e => { e.stopPropagation(); sfx('tap'); qOpen(); };
  W.querySelector('[data-rec]').onclick = e => { e.stopPropagation(); rec(); };
  let hold = null; const stop = () => { clearTimeout(hold?.t); clearInterval(hold?.iv); hold = null; };
  list.addEventListener('pointerdown', e => { const b = e.target.closest('.ev-b'); if (!b || b.disabled) return; e.preventDefault(); sfx('tap');
    if (b.dataset.v != null && !S1.vK[+b.dataset.v].length) { vcOpen(+b.dataset.v); return; }
    const go = () => b.dataset.p != null ? put(+b.dataset.p) : b.dataset.m != null ? take(+b.dataset.m) : b.dataset.x != null ? unvit(+b.dataset.x) : vit(+b.dataset.v); go();
    hold = { t: setTimeout(() => { vib(); hold.n = 0; hold.iv = setInterval(() => { if (!go()) return stop(); if (++hold.n % 5 === 0) vib(); }, 70); }, 380) }; });   // 꾹 누르면 계속 + 진동 (경완 규칙)
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => list.addEventListener(t, stop));
  const toast = t => { const el = $('.ev-toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 1600); };
  const start = () => { S1 = { ev: SAVED.ev.slice(), pool: SAVED.pool, bag: SAVED.bag.slice(), vAdd: [0, 0, 0, 0, 0, 0], vBuy: [0, 0, 0, 0, 0, 0], vUse: [0, 0, 0, 0, 0, 0], vK: [[], [], [], [], [], []] }; draw(); };
  start(); fillTh(p); return p;
}

// v20.80 경완 '영양제는 상세카드뿐 아니라 창고·도구 사용에서도 포켓몬 골라서 바로 먹이기': 한 개 = 그 능력치 노력치 +10 (252·510 한도, 남은 노력치 몫 포함)
const vitAll = () => evOn() ? EV_VIT.map(([k], i) => [i, S.gym?.vit?.[k] | 0]).filter(([, n]) => n > 0) : [];
const vitRoom = (P, i) => { const m = gm(P), e = evArr(m); return Math.max(0, Math.min(EV_ONE - (e[i] | 0), EV_MAX - evSumOf(m) - (m.evp | 0))); };
const vitRow = (i, n, P) => { const r = P ? vitRoom(P, i) : 10, full = !r, v = P ? evArr(gm(P))[i] | 0 : 0;
  return `<button type="button" class="sp-tm sp-it sp-vit${full ? ' off' : ''}" data-vit="${i}" ${full ? 'disabled' : ''}><img class="tm-ic it-ic" alt="" src="${itImg(EV_VIT[i][0])}"><span class="tm-nm"><b>${EV_VIT[i][1]}</b>${n ? `<i class="tm-own">×${n}</i>` : ''}</span><span class="tm-meta"><small>${full ? `<b class="ev-stc">${EV_N[i]}</b> 노력치 가득 찼어요` : P ? `<b class="ev-stc">${EV_N[i]}</b> 노력치 ${v} → ${v + Math.min(10, r)}` : `<b class="ev-stc">${EV_N[i]}</b> 노력치 +10`}</small></span></button>`; };
function vitInfo(i, lab, act, own, P) { const r = P ? vitRoom(P, i) : 10;
  gymPop(`<h4 class="mi-h has-own"><img class="tm-ic it-ic" alt="" src="${itImg(EV_VIT[i][0])}">${EV_VIT[i][1]}${bagN(own | 0)}</h4><p class="gy-msg mi-d">${EV_VD[i]}. 먹이면 ${EV_N[i]} 노력치가 10 올라간다.</p>${P && !r ? `<p class="gy-msg" style="text-align:center"><small>${esc(nmOf(P))}의 노력치가 더 들어갈 자리가 없어요.</small></p>` : ''}<div class="gy-btns${r ? '' : ' one'}"><button data-a="x">닫기</button>${r ? `<button class="main" data-a="t">${lab}</button>` : ''}</div>`,
    (a, close) => { close(); if (a === 't') act?.(); }); }
function vitUse(P, i) { const g = S.gym, k = EV_VIT[i][0]; if (!(g.vit?.[k] > 0)) return; const n = evAdd(gm(P), i, 10); if (!n) return;
  if (!--g.vit[k]) delete g.vit[k]; GA.save(); se('DECIDE');
  gymPop(`<p class="gy-msg" style="text-align:center">${esc(nmOf(P))}${jong(nmOf(P)) ? '은' : '는'} ${EV_VIT[i][1]}${jong(EV_VIT[i][1]) ? '을' : '를'} 먹었다!<br>${EV_N[i]} 노력치가 ${n} 올랐다!</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => c()); }
function vitPick(i, done) {
  boxWin(false, null, done, { title: () => `영양제 먹이기 · ${EV_VIT[i][1]}`, tip: `${TYPE_KO[S.gym.ty]} 타입 포켓몬만 보여요`, list: () => S.box.filter(tyOk), ok: P => vitRoom(P, i) > 0, first: P => curLu().includes(P.id),
    pick: (P, w) => { w.close(); vitUse(P, i); done?.(); } });   // v20.81 경완: 노력치 딱지 없이 (라인업·훈련장 딱지는 그대로)
}
window.GymBattle = { itAi: { aiItem, foeUseItem, setB: v => { B = v; } }, mvCard, hitPop, evMig, vitAll, vitRow, vitInfo, vitUse, vitPick, foeEvs, evOn, evAdd, evArr, evSumOf, evPop, evPlan, EV_N, EV_VIT, EV_VD, EV_PW, EV_PP, EV_VP, EV_ONE, EV_MAX, recIts, recTms, recNat, recMoves, recSlot, setScore, bagN, egList, egKn, egOpen, egFocus, egAdd, tmHead, tmBody, mvBoxHtml, isTR, tmKind, HOLD, IT_CAT, MINT, MINT_P, mintNm, mintImg, mintD, mintAll, mintRow, mintInfo, mintPick, itImg, itRow, itAll, itRowAll, itHave, takeIt, itInfo, itPick, giveIt, usePop, tab, run, loadData, loadSim, gm, lus, gainXp, teach, movesPop, tmPop, mvCands, mvOf, mvKo, foeEntry, xpAt, growth, curLu, boxOf, thumb, fillTh, gymPop, tyTag, gifUrl, pkSrc, mvRow, TR_KO, NAMES_M, NAMES_F, LV_MAX, get D() { return D; }, get EGG() { return EGG; }, _xpAt: xpAt, _psSet: psSet, _stFx: (s, t, h) => stFx(s, t, h), _confFx: s => confFx(s), _monPop: (i, b, u, l) => monPop(i, b, u, l), mvInfo, foePop, teachPick, tmRow, teachTm, tmCan, tmOf, boxWin, _abPop: (i, a) => abPop(i, a), _foeEntry: foeEntry, _ai: aiChoice, get _B() { return B; }, _fg: (L, n) => forgetPanel(L, n) };
})();
