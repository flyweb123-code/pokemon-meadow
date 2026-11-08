/* 체육관 이벤트: 로켓단의 체육관 점거 (2026-11-07 경완 '체육관 아이콘 들어가 보면 갑자기 로켓단이 점거한 내 체육관 모습이 스크롤되면서 연출 애니메이션으로 등장, 내 트레이너들을 다 납치해 간 스토리')
   v19.18 경완 2026-11-08 '배틀을 최소화하고 찾는 재미': 관장 옆 포켓몬이 따라다니며 기술로 장애물을 치우고, 알·상점 물건 줍기, 마을 사람 부탁·선물. 배틀은 람다 한 판(+들켰을 때·이스터에그)
   1장 점거당한 체육관 → 2장 아지트를 찾아서(돌담시티, 본가 회색시티 맵에 가상의 이름) → 3장 로켓단 아지트(지하 1층) → 4장 구출 작전(지하 4층, 간부 람다전) → 체육관으로 돌아와 보상.
   비주기는 로켓단 시리즈 마지막 이벤트에 (경완 2026-11-07). 맵은 pret/pokefirered PewterCity·RocketHideout_B1F·B4F, 막힌 칸은 map.bin 충돌 비트 */
(function () {
'use strict';
const GR = ['hg_rocket_m', 'hg_rocket_f'];   // 하트골드 로켓단 조무래기 (pret/pokeheartgold mmodel 173·174)
const B1F = ['############################','############################','############......##########','############......##########','##########..........########','##########..........########','##########..........########','##########..........########','#..........................#','#..........................#','#..........................#','###..#####.......#####...###','###..#####.......#####...###','#......####.....###........#','#......###.......##.######.#','#..###..###.....###.######.#','#..###..##.......##.######.#','##......###.....###........#','#.......##.......##........#','####################..######','####################..######','####################..######','#...............####..######','#...............####..######','#...######........##..######','#...######........##..######','#.................##.......#','#.................##.......#','#............###############','#...######...###############','#...######......############','#...............############','#.................##########','#.................##########'];
const B4F = ['########################','########################','#.#....#########.##.##.#','##.....#########..###..#','#.###..#########.#...#.#','#####.........###.....##','#.............##..###..#','#.............###.....##','#......##.....##.......#','#########.....##.......#','#########.....##.......#','###....##.....##.......#','#......##.....###..#####','#..###.##.....###..#####','#..###......####.....###','#...........####.....###','#...........####.......#','#.............##.......#','################.......#','################..######','###...............######','#.................######','#....######.......######','#....######.......######','#...........##.........#','#......................#'];
const IM = 'gym/img/', G = '로켓단 조무래기', B = '로켓단 간부 람다';
// 본가 맵 (tools/gym/frmap.py 로 뽑은 충돌·문·덮는 층): MAP('pewter') → { w, h, col, door }
const MAPJ = {}, MAP = n => MAPJ[n] || (MAPJ[n] = fetch(`${IM}ev/rocket/${n}.json?v=5`).then(r => r.json()));
const room = (n, m, warps) => ({ img: `${IM}ev/rocket/${n}.png?v=3`, over: `${IM}ev/rocket/${n}_o.png?v=3`, w: m.w, h: m.h, col: m.col, cov: m.cov, warps,
  block: new Set(Object.keys(m.door || {}).filter(k => !warps.some(w => w.x + ',' + w.y === k))) });   // 갈 곳 없는 문 칸(냉장고처럼 생긴 뒷문 등)은 막음
// 상대 팀: 내 라인업 평균 레벨(A.lv) 기준. 레벨 28 이상이면 진화한 모습 (꼬렛→레트라, 아보→아보크, 주뱃→골뱃, 또가스→또도가스, 나옹→페르시온, 질퍽이→질뻐기)
const POOL = [[19, 20], [23, 24], [41, 42], [109, 110], [52, 53], [88, 89]];
const mon = (i, lv) => [POOL[i][lv >= 28 ? 1 : 0], lv];
const gTeam = (A, n, add, seed) => { const L = A.lv() + add; return Array.from({ length: n }, (_, i) => mon((seed + i * 2) % POOL.length, Math.max(3, L + (i === n - 1 ? 1 : 0)))); };
const trOf = ow => ow === 'hg_rocket_f' ? 'hg_rocket_f' : 'hg_rocket_m';
// 조무래기 배틀 한 판: 나를 보면 '!' → 걸어와서 한마디 → 배틀 → 진 대사. 이기면 true
// 배틀에서 이기고 필드로 돌아오면: 상처약 소리와 함께 포켓몬이 모두 기운을 되찾음
async function healFx(A, F) { A.se('DP_KAIFUKU'); await A.wait(700); }   // 본가 배틀 회복 소리 (경완 2026-11-08 '약물 먹는 효과음이 본가 배틀 효과음이 아닌 것 같은데')
async function fight(A, F, S, s, o) {
  // 지친 채로는 다시 못 싸움: 돌담시티에선 포켓몬 센터에서 회복하고 와야 한다 (경완 2026-11-07)
  if (A.tired) { s.face(F.me); await S.say('(포켓몬들이 지쳐 있다...\n먼저 포켓몬 센터에 가서 회복시키자.)', { who: A.me() }); S.hide(true); return false; }
  F.lock(true); A.music('hgEyeRoc'); F.bub(s, '!', 900); await A.wait(1000);   // 본가: 트레이너가 나를 봤을 땐 효과음 없이 만남 음악만 (SE_PIN 은 대본 속 놀람 '!' 에만, 경완 2026-11-08)
  if (F.sees(s) > 1) await F.come(s); else { s.face(F.me); F.me.face(s); }
  for (const t of s.lost ? ['또 왔냐?\n몇 번을 와도 똑같다고!'] : o.pre) await S.say(t, { who: o.who || G });
  S.hide(true);
  const won = await A.battle({ tr: o.tr || trOf(s.ow), cls: o.cls || '로켓단', nm: o.nm || '조무래기', team: o.team, tier: o.tier | 0, g: o.g || 0, say: o.say, music: 'hgVsRoc', win: o.win });
  if (!won) { A.music(o.song || 'hgAjito'); s.lost = true; await A.wait(300); await S.say('(포켓몬들이 지쳐 버렸다...\n포켓몬 센터에 가서 회복시키자.)', { who: A.me() }); S.hide(true);
    if (A.center) A.tired = true;   // 돌담시티: 직접 센터까지 걸어가서 간호순에게
    else A.woQ = true;   // 아지트: 눈앞이 캄캄 → 돌담시티 포켓몬 센터에서 다시 (경완 2026-11-08 '져서 포켓몬 센터 가는건 직접 가서')
    return false; }   // 지면 그 자리에서 다시 말 걸어 재도전 (경완 2026-11-07)
  A.music(o.song || 'hgAjito'); s.done = true; await A.wait(300); await healFx(A, F);   // 이기고 돌아오면 회복 소리와 함께 다 회복 (경완 2026-11-07)
  await prize(A, S, o.g);
  for (const t of o.post || []) await S.say(t, { who: o.who || G });
  S.hide(true); return true;
}
// 배틀 상금 (경완 2026-11-08 '배틀 끝나면 골드는 줘'): 실제 플레이는 배틀에서 이미 받음, 운영자 시험은 안 받음
async function prize(A, S, g) { if (!g) return; await S.say(`(상금 ${g.toLocaleString()}G 를 받았다!)${A.test ? '\n운영자 시험이라 실제로는 안 받아요.' : ''}`, { who: A.me() }); }
// 로켓단 변장 (경완 2026-11-08 '미션 깨고 로켓단이 두고 간 복장 받아서 변장하고 암호 대면'): 입으면 내 걸음 그림이 조무래기로, 문지기에게 들키면 원래 모습
const RK_G = A => A.I.myFem?.() ? 'f' : 'm';   // 변장 그림 = 로켓단 그림에 머리만 기본 캐릭터(빛나·광휘) 남색 (경완 2026-11-08), 보상 의상 fit/rocket 과 같은 그림
const disg = A => A.has('suit') && !A.has('caught');
async function wear(A, F, on, fx) { const I = A.I, m = F.me;
  if (fx) { A.se('DP_KIRAKIRA2'); F.fx(1, m.x, m.y - .4); m.el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(3) saturate(0)' }, { filter: 'brightness(1)' }], { duration: 520 }); await A.wait(260); }
  if (on) { m.src = `${IM}fit/ow9/rocket_${RK_G(A)}.png?${VC}`; m.fw = 32; } else { m.src = undefined; m.fw = I.owW(I.myOw()); I.fitMe(m); }
  m.dis = on; m.put(); if (fx) await A.wait(420); }
// 변장하고 로켓단에게 말 걸면: 의심만 하고 배틀은 없음 (경완 2026-11-08)
const SUSP = ['어, 너도 여기 지키러 왔냐?\n여긴 우리로 충분해.', '...잠깐, 너 처음 보는 얼굴인데?\n어느 부대야?', '흠... 수상한데.\n...뭐, 제복 입었으니 됐다.', '신입이면 얼른 아지트로 가 봐.\n람다 님이 찾으실라.'];
async function suspSay(A, F, S, s, L = SUSP) { if (!s.sn) F.bub(s, '?', 800); s.face(F.me); await S.say(L[(s.sn | 0) % L.length], { who: G }); s.sn = (s.sn | 0) + 1; S.hide(true); }
// 마을을 돌아다니는 로켓단 (경완 2026-11-08 '마을에서 돌아다니고 있는 로켓단 npc 도 몇 명'): 배틀 없음, 변장하면 대사가 달라짐
const WG_L = [
  { n: ['뭘 봐?\n로켓단 처음 보냐?', '이 마을은 이제\n로켓단이 접수했다고! 크크.', '체육관 없는 관장은\n그냥 동네 사람이지~'], d: ['오, 수고한다!\n순찰 중이냐?', '...근데 너 처음 보는 얼굴인데.\n어느 부대야?', '흠... 뭐, 제복 입었으면 됐지.\n람다 님한테 잘 보여라.'] },
  { n: ['어머, 관장님 아니세요?\n체육관은 잘 있냐고요? 호호!', '우리 아지트가 어디냐고?\n그걸 알려 줄 리가 없잖아!', '저리 가!\n순찰 중이라고!'], d: ['어? 신입이야?\n제복이 좀 커 보이는데?', '...얼굴이 어디서 많이 본 것 같은데.\n기분 탓인가?', '아지트 들어갈 때 암호\n까먹지 마! 또 혼나니까.'] },
  { n: ['크크, 마트 물건은\n우리가 다 쓸어 갔지!', '관장이 혼자서\n뭘 할 수 있겠어?', '...왜 자꾸 말 걸어?\n배틀은 안 해 준다!'], d: ['어이 신입! 마트에서\n산 거 아지트로 옮겼냐?', '...너 왜 자꾸 두리번거려?\n수상하게...', '뭐, 됐다.\n얼른 일이나 해!'] },
];
// 로켓단 간부 아테나가 모니터로 (경완 2026-11-08 '로켓단 시리즈 예고 뒤에 모니터 켜지면서 아테나 나오는 연출')
// 모니터 속 간부: 정체는 감춘 실루엣 (경완 2026-11-08 '아테나는 정체 드러내지 않고 실루엣으로'). body() 동안 화면이 켜져 있다
async function crt(A, body) { const w = document.createElement('div'); w.className = 'ev-crt'; w.innerHTML = `<div><img alt="" src="${IM}pt/tr/hg_ariana.png"><b>● LIVE</b></div>`;
  A.se('se_select'); A.I.root.appendChild(w); const sc = w.firstElementChild; A.I.haptic?.(0);
  await sc.animate([{ transform: 'scale(1,.02)', filter: 'brightness(4)' }, { transform: 'scale(1,1)', filter: 'brightness(1)' }], { duration: 380, easing: 'ease-out' }).finished.catch(() => {});
  await body();
  await sc.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1,.02)', filter: 'brightness(4)', offset: .6 }, { transform: 'scale(0,.02)', filter: 'brightness(4)' }], { duration: 380, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}); A.se('se_select'); w.remove(); }
// 글자 입력 창 (암호 등): 버튼으로만 닫힘. 그만두면 null
const askText = (A, t, ph = '') => new Promise(ok => { const I = A.I, w = document.createElement('div'); w.className = 'ev-ask ev-pw';
  w.innerHTML = `<div class="win"><h4>${I.esc(t)}</h4><input type="text" class="ev-in" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${I.esc(ph)}"><div class="bt2 gy-btns"><button type="button" data-a="0">그만두기</button><button type="button" class="main" data-a="1">말한다</button></div></div>`;
  I.root.appendChild(w); I.gse?.('DP_WIN_OPEN', .8); const inp = w.querySelector('input'); setTimeout(() => inp.focus(), 80);
  const done = v => { I.sfx?.('tap'); inp.blur(); w.remove(); ok(v); };
  w.onclick = e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); done(b.dataset.a === '1' ? inp.value : null); };
  inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && !e.isComposing) done(inp.value); }; inp.onkeyup = e => e.stopPropagation(); });
// 칸 종류별 살펴보기 문구: frmap.py 가 본가 metatile behavior 로 뽑은 look 종류 (경완 2026-11-07 '표지판도 다 읽을 수 있게, 소품들도 말 걸면 뭔가 뜨게')
const LOOKT = { bookshelf: '책장에 어려운 책이\n빼곡히 꽂혀 있다.', shelf: '상품이 가지런히 진열되어 있다.\n...몇 칸은 텅 비어 있다.', pc: '컴퓨터다.\n로켓단 소동 때문인지 꺼져 있다.', map: '이 지방 지도다.\n돌담시티가 빨갛게 표시되어 있다.',
  tv: 'TV 에서 뉴스가 나오고 있다.\n"...돌담시티 체육관에\n수상한 집단이..."', cabinet: '그릇이 가지런히 놓인 찬장이다.', kitchen: '부엌이다.\n맛있는 냄새가 난다.', quest: '설문지다.\n"좋아하는 포켓몬을 적어 주세요"',
  blueprint: '무언가의 설계도다.\n어려워서 하나도 모르겠다...', machine: '커다란 기계가\n웅웅 소리를 내고 있다.', phone: '전화기다.\n...아무도 받지 않는다.', computer: '컴퓨터 화면에 알 수 없는\n숫자가 빽빽하게 흘러간다.',
  poster: '포스터다.\n"몬스터볼 대할인! 지금 바로!"', porthole: '창 너머로 파란 하늘이 보인다.', window: '창밖으로 돌담시티가 보인다.', lights: '불빛이 깜빡깜빡거린다.', tools: '물건이 가지런히 늘어서 있다.',
  pcsign: '포켓몬 센터\n"포켓몬의 체력을 회복합니다"', martsign: '프렌들리숍\n"포켓몬 용품은 여기서!"', sign: '표지판이다.' };
// 이 칸에 쓰인 글: 방별 덧쓰기(sp) → 칸 종류 문구
const lookText = (lk, sp, x, y) => { const k = x + ',' + y; return sp?.[k] || LOOKT[lk?.[k]] || null; };
// 한 판 이기고 나서 다른 조무래기 시야에 내가 있으면 바로 이어서 걸어와 배틀 (경완 2026-11-07 '양쪽에 있으면 한 쪽 끝나고 한 쪽이 바로 말 걸어서')
async function chain(F, GS, s, one) { let ok = await one(s); while (ok) { const n = GS.map(x => x[0]).find(g => !g.done && F.sees(g)); if (!n) break; await A_wait(400); ok = await one(n); } return ok; }
const A_wait = ms => new Promise(r => setTimeout(r, ms));
// 진 조무래기에게 다시 말 걸면: 그 조무래기 대사를 차례로 (경완 2026-11-07 '진 로켓단 다시 말 걸면 뭔가 대사가 있게')
async function againSay(S, s, o) { const L = o?.again || ['...'], i = (s.ag | 0) % L.length; s.ag = (s.ag | 0) + 1; await S.say(L[i], { who: o?.who || G }); S.hide(true); }
// 장마다 같이 쓰는 것: 내 혼잣말, 관장 옆 포켓몬에게 부탁 (장애물에 말 걸었을 때 창, 경완 2026-11-08 '크레세리아에게 바위깨기를 부탁하겠습니까?'), 줍기
function kit(A, F, S, me0) { const I = A.I, pn = () => F.pl?.nm || null, iga = w => I.jong(w) ? '이' : '가';
  F.onPal = Q => A.setPal(Q);
  const me1 = (...L) => (async () => { for (const t of L) await S.say(t, { who: me0 }); S.hide(true); })();
  const ask = async why => { const p = F.pl;
    if (!p) { if ((I.luAll?.() || []).length) { await me1(`(${why}...\n같이 다니는 포켓몬이 있으면\n도와줄 텐데.)`); return false; } return true; }
    const mv = F.move()[0], y = await S.ask(`${p.nm}에게 ${mv}${I.jong(mv) ? '을' : '를'}\n부탁하겠습니까?`, { who: me0 }); S.hide(true); return y; };   // 대사창 + 오른쪽 위 예/아니요 (경완 2026-11-08)
  const use = async (tx, ty, hit) => { if (F.pl) { await S.say(`${pn()}의 ${F.move()[0]}!`, { who: me0 }); S.hide(true); } await F.palAct(tx, ty, hit); };
  const dirTo = (a, b) => { const dx = b[0] - Math.round(a.x), dy = b[1] - Math.round(a.y); return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); };
  const pick = async (x, y) => { const b = F.obAt(x, y);
    if (b?.kind === 'ball') { A.se('DP_SELECT'); await b.clear('out'); await A.got(S, b.it, { key: b.key }); S.hide(true); return true; }
    const h = F.hidAt(x, y); if (h?.it) { h.got = true; await S.say('(앗, 뭔가 숨겨져 있다!)', { who: me0 }); await A.got(S, h.it, { key: h.key }); S.hide(true); return true; }
    return false; };
  return { pn, iga, me1, ask, use, dirTo, pick }; }
const ow = (A, F, k, x, y, f, o) => { const s = F.npc(k, x, y, f, o); s.ow = k; return s; };
const VA = 'v=19.18', VB = 'v=19.37', VC = 'v=19.64';   // v19.18 새 그림(몬스터볼·바위·모자·금고), v19.37 (모자 앞·뒤, 화분, 발자국)
// 길막 로켓단마다 대사가 다르고, 말을 걸 때마다 달라진다. 끝까지 말 걸면 짜증 나서 배틀 (이스터에그, 경완 2026-11-07)
const STOP = [
  { lines: ['어이, 거기!\n이쪽은 못 지나간다.', '안 들려? 돌아가라고!', '여긴 로켓단이 접수한 길이야.\n돌아가!', '...너 할 일 없니?', '나도 여기 서 있기 싫거든?\n다리 아파 죽겠는데...', '말 걸지 말라니까!\n집중이 안 되잖아!', '...한 번만 더 말 걸면\n가만 안 둔다?'],
    pre: ['좋아, 그렇게 원한다면!\n상대해 주지!!'], post: ['어, 어떻게 이렇게 세?!\n...그래도 길은 못 비켜 줘!'], beaten: ['...제발 저리 가.\n오늘 운수가 안 좋네.', '다리도 아프고 지기까지 하고...'] },
  { lines: ['멈춰!\n이 길은 상관 명령으로\n아무도 못 지나가!', '...왜 아직 서 있어?', '옆에 있는 애한테 물어봐.\n...아니, 걔한테도 묻지 마!', '점심도 못 먹고 서 있는 중이라고...\n건드리지 마.', '너, 내 포켓몬 보고 싶어서 그러지?\n안 보여 줘!', '...진짜 끈질기네.', '마지막 경고다!\n한 번만 더 말 걸면 배틀이다!'],
    pre: ['참을 만큼 참았다!\n덤벼라!!'], post: ['말도 안 돼...\n점심도 못 먹었는데 지기까지...'], beaten: ['배고파...\n말 시키지 마...', '...빵 있으면 하나만 줄래?'] },
  { lines: ['흐흥, 어딜 가시려고?\n3번 도로는 지금 통행금지야.', '로켓단 허락 없인 못 지나가!', '허락? 물론 안 해 주지!', '돌담시티 관장이 쫓겨났다며?\n...잠깐, 너구나?', '관장이면 관장답게\n체육관이나 지키지 그랬어? 크크', '아, 그건 우리가 뺏었지. 크크크', '...웃는 거 그만둘 테니까\n제발 저리 가 줄래?'],
    pre: ['안 되겠다! 실력으로\n쫓아 보내 주마!!'], post: ['크윽... 관장은 관장이군.\n그래도 이 길은 못 비켜!'], beaten: ['...아까 웃은 거 미안하다.', '체육관은 꼭 되찾아라.\n...이건 비밀이다?'] },
  { lines: ['쉿! 지금 근무 중이라고.\n여기서부턴 로켓단 구역이야.', '...아직도 거기 있어?', '있잖아, 우리도 일이라서\n어쩔 수 없거든?', '람다 님한테 혼나는 건\n나라고!', '아 진짜! 몇 번째야!', '...좋아, 하나만 알려 줄게.\n우리 아지트는 마을 아래쪽 집에...', '...아니, 없어! 아무것도 없어!'],
    pre: ['말실수했잖아... 너 때문이야!\n배틀로 기억을 지워 주마!!'], post: ['말도 안 돼...\n오늘 일진 최악이야...'], beaten: ['아무것도 못 들은 거다?\n알았지?', '...람다 님한텐 비밀이야.'] },
];
GymEv.def({
  id: 'rocket', ready: true, nm: '로켓단의 체육관 점거', sub: '로켓단이 내 체육관을 빼앗고 트레이너들을 데려갔다!',
  songs: ['hgEyeRoc', 'hgAjito', 'hgVsRoc', 'hgNibi'], imgs: ['pt/ow/hg_rocket_m', 'ev/rocket/heal_ball', 'ev/rocket/heal_mon', 'ev/rocket/ybox', 'pt/ow/hg_rocket_f', 'pt/ow/hg_petrel', 'ev/rocket/crate', 'ev/rocket/machine', 'ev/rocket/pc', 'ev/rocket/ball', 'ev/rocket/rock', 'ev/rocket/hat', 'ev/rocket/safe', 'ev/rocket/hat_d', 'ev/rocket/hat_u', 'ev/rocket/pot', 'ev/rocket/steps', 'ev/rocket/house_e', 'ev/rocket/house_e_o', 'pt/tr/hg_ariana', 'ev/rocket/mon', 'ev/rocket/mon_on'],
  reward: { g: 3000, rep: 30, fit: 'rocket', fitNm: '로켓단 제복', fitAlt: 'gym/img/pt/tr/hg_rocket_$.png', emb: 'R', embImg: `${IM}ev/rocket/r_emb.png?v=2`, hd: ['#7a1c28', '#26070c'], crew: true, msg: '로켓단을 몰아내고\n빼앗긴 체육관과 트레이너들을 모두 되찾았다!' },
  ch: [
    // 1장 · 점거당한 체육관
    async A => {
      const { I, D, wait } = A, sfs = I.sfList(), nSf = (I.st().sf || []).length;   // 훈련장에 있던 트레이너까지 모두 납치
      // 까만 화면 뒤에서 무대를 꾸미고, 밝아지면서 바로 스크롤 (경완 2026-11-07 '장 타이틀 없이, 체육관 전체 화면 먼저 X')
      A.blackNow(); I.clearEnts(); I.renderHome(true);
      // 무대: 내 트레이너·안내원·나는 없고, 트레이너 자리엔 조무래기, 관장 자리엔 간부 람다, 바닥엔 R 상자·깃발
      I.dropPeople();
      const spots = sfs.map(z => [z[1], z[2], z[3]]);
      for (const q of D.slots || []) { if (spots.length >= 3) break; if (!spots.some(p => p[0] === q[0] && p[1] === q[1])) spots.push([q[0], q[1], q[2]]); }
      const grunts = spots.slice(0, 6).map(([x, y, f], i) => A.npc(GR[i % 2], x, y, f || 'd'));
      const boss = A.npc('hg_petrel', D.leader[0], D.leader[1], 'd');   // 관장 자리엔 간부 람다 (mmodel 244)
      const ft = A.freeTiles([D.door, [D.door[0], D.door[1] - 1], [D.door[0], D.door[1] - 2]]);
      const pick = (n, seed) => { const out = []; let s = seed; for (let i = 0; i < n && ft.length; i++) { s = (s * 9301 + 49297) % 233280; out.push(ft.splice(Math.floor(s / 233280 * ft.length), 1)[0]); } return out; };
      // 파이어레드 로켓단 아지트 소품 (pret/pokefirered RocketHideout 위 칸만 그린 것): 상자·컴퓨터·기계. 문·관장 세로줄은 비워 둔다
      const lane = x => x === D.door[0] || x === D.leader[0] || Math.abs(x - D.leader[0]) <= 1;
      const fits = (x, y, w) => { for (let i = 0; i < w; i++) if (lane(x + i) || !ft.some(q => q[0] === x + i && q[1] === y)) return false; return true; };
      for (const [k, n, sd] of [['machine', 1, 3], ['crate', 1, 11]]) { const [w] = await A.size(k); let s = sd;
        for (let c = 0; c < n; c++) { const C = ft.filter(([x, y]) => fits(x, y, w)); if (!C.length) break; s = (s * 9301 + 49297) % 233280; const [x, y] = C[Math.floor(s / 233280 * C.length)];
          await A.prop(k, x, y); for (let i = 0; i < w; i++) { const j = ft.findIndex(q => q[0] === x + i && q[1] === y); if (j >= 0) ft.splice(j, 1); } } }
      pick(1, 7).forEach(([x, y]) => { if (!lane(x)) A.rProp(x, y); });
      const fl = [[D.leader[0] - 1, D.leader[1]], [D.leader[0] + 1, D.leader[1]]].filter(([x, y]) => D.free?.[y]?.[x] === '1');
      fl.forEach(([x, y]) => A.rProp(x, y, 'flag'));
      // 연출: 밝아지면서 로켓단 곡, 맵을 위에서 아래로 훑는다
      await wait(900); A.tint(true); A.music('hgEyeRoc'); await wait(300);
      const pp = A.pan(5600); A.black(false); await pp;
      // 내가 문으로 들어온다
      const me = A.npc(I.myOw(), D.door[0], D.door[1], 'u'); I.fitMe(me);
      A.se('DP_DOOR'); await wait(300);
      await I.walk(me, [[D.door[0], D.door[1] - 1]]); await wait(300);
      A.bub(me, '!', 1000); A.se('se_pin'); await wait(1100);
      // 문에서 가까운 조무래기 둘이 다가온다
      const near = grunts.slice().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)).slice(0, 2);
      const FR0 = [[me.x, me.y - 1], [me.x - 1, me.y - 1], [me.x + 1, me.y - 1], [me.x - 1, me.y], [me.x + 1, me.y], [me.x, me.y - 2], [me.x - 1, me.y - 2], [me.x + 1, me.y - 2]], fr = [];
      for (const e of near) { const c = A.reach(e, FR0.filter(q => !fr.some(f => f && f[0] === q[0] && f[1] === q[1])), fr.filter(Boolean)); fr.push(c); }   // 서로 다른 칸, 걸어서 갈 수 있는 칸만
      near.forEach(e => A.bub(e, '!', 900)); A.se('se_pin'); await wait(1000);
      await Promise.all(near.map((e, i) => fr[i] ? A.walkTo(e, fr[i], 200, fr.filter((q, j) => q && j !== i)).then(() => { const dx = me.x - e.x, dy = me.y - e.y; A.turn(e, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : 'd'); }) : null));
      const S = A.talk(); const G = '로켓단 조무래기', B = '로켓단 간부 람다';
      await S.say('어? 이 녀석...\n이 체육관 관장이잖아!', { who: G });
      if (near[1]) await S.say('람다 님!\n관장이 돌아왔습니다!', { who: G });
      // 간부가 관장 자리에서 내려온다 (비주기는 로켓단 시리즈 마지막 이벤트에, 2026-11-07 경완)
      S.hide(true); await A.look(boss.y); await wait(300);
      A.bub(boss, '!', 900); A.se('se_pin'); await wait(1000);
      S.hide(false); await S.say('우하하!\n생각보다 빨리 돌아왔구먼!', { who: B });
      S.hide(true);
      const by = Math.min(D.door[1] - 3, Math.max(boss.y, me.y - 3)), bt = A.reach(boss, [[me.x, by], [me.x, by - 1], [me.x - 1, by], [me.x + 1, by], [me.x, by + 1], [me.x - 1, by - 1], [me.x + 1, by - 1]]);
      await Promise.all([bt ? A.walkTo(boss, bt, 300) : null, (async () => { await wait(200); await A.look(me.y - 1, 1600); })()]); A.turn(boss, 'd');
      S.hide(false);
      await S.say('놀랐나? 요즘 이 체육관\n소문이 아주 자자하더군.\n매일같이 도전자가 몰려온다며?', { who: B });
      await S.say('그 도전자들이 데려오는 포켓몬...\n앞으로는 전부 로켓단이\n잘 맡아 주기로 했지!', { who: B });
      await S.say('제 발로 찾아오는 손님에게서\n포켓몬을 받아 내는 장사!\n우하하, 이런 노다지가 또 있나!', { who: B });
      A.bub(me, '...!', 1100); await wait(1100);
      await S.say(nSf ? `아, 네 트레이너들 말인가?\n하도 덤벼들길래 ${nSf}명 모두\n안내원이랑 같이 아지트로 모셨다.` : '아, 안내원 말인가?\n하도 시끄럽길래\n우리 아지트로 모셔 갔다.', { who: B });
      await S.say('돌려받고 싶으면\n직접 찾아와 보든가.\n...찾을 수 있다면 말이지!', { who: B });
      await S.say('얘들아!\n관장님 나가신다, 배웅해 드려라!', { who: B });
      await S.say('넵! 람다 님!', { who: G });
      // 쫓겨난다
      S.hide(true); await wait(200);
      A.se('DP_KON', 1.2); A.shake(); I.haptic?.(1);
      await Promise.all([A.slide(me, me.x, D.door[1], 260), ...near.filter(e => e.y < me.y && e.x === me.x).map(e => A.slide(e, e.x, e.y + 1, 260))]);
      A.turn(me, 'u'); await wait(250); me.el.style.transition = 'opacity .4s'; me.el.style.opacity = '0';
      A.se('DP_DOOR'); await wait(500);
      await S.end(); A.music(null);
      await A.black(true, '체육관을 로켓단에게\n빼앗겨 버렸다...!', nSf ? `트레이너 ${nSf}명과 안내원이 납치되었다.` : '안내원이 납치되었다.', true);
    },
    // 2장 · 아지트를 찾아서 (돌담시티 = 본가 회색시티 맵) — v19.18 경완 2026-11-08 '배틀을 최소화하고 찾는 재미':
    //   마을 사람 부탁 셋(관장 옆 포켓몬 기술로 해결 → 단서): 콩이 = 로켓단 제복(변장), 돌쇠 = 아지트 자리(남쪽 빈집), 미소 = 암호. 변장하고 암호를 대면 빈집 앞 조무래기가 비켜 줌.
    //   빈집: 발자국을 따라 화분을 포켓몬 기술로 옮기면 그 밑에 계단 (v19.37 경완 2026-11-08)
    async A => {
      const { I, wait, anim } = A, me0 = A.me(), WO = A.woTake();
      A.blackNow();
      const [PW, MT, CT, HS, MU] = await Promise.all(['pewter', 'mart', 'center', 'house', 'museum'].map(MAP));
      const HE = { ...HS, col: HS.col.map((r, y) => y === 7 ? r.slice(0, 10) + '.' : r) };   // 빈집: 오른쪽 화분은 옮길 수 있는 그림(그 칸은 화분 그림이 막음)
      const mats = (xs, y, to, at) => xs.map(x => ({ x, y, d: 'd', mat: true, to, at }));
      const rooms = {
        mart: room('mart', MT, mats([3, 4, 5], 7, 'main', [28, 18, 'd'])),
        center: room('center', CT, [...mats([6, 7, 8], 8, 'main', [17, 25, 'd']), { x: 1, y: 6, id: 'up2', off: true }, { x: 11, y: 1, id: 'shut' }]),
        house1: room('house', HS, mats([3, 4, 5], 7, 'main', [33, 11, 'd'])),
        house: room('house_e', HE, mats([3, 4, 5], 7, 'main', [9, 30, 'd'])),
        museum: room('museum', MU, [...mats([13, 14, 15], 9, 'main', [17, 6, 'd']), ...mats([21, 22], 9, 'main', [25, 4, 'd']), { x: 8, y: 8, id: 'up2', off: true }]),
      };
      [rooms.house, rooms.house1].forEach(r => r.block.delete('5,2'));   // 본가 그림의 TV 앞 칸이 문 칸으로 뽑혀 막혀 있던 것 (TV 앞에서 말 걸기)
      let gr;
      A.center = true;
      const F = A.field({ nm: '돌담시티', img: `${IM}ev/rocket/pewter.png?v=3`, over: `${IM}ev/rocket/pewter_o.png?v=3`, w: PW.w, h: PW.h, col: PW.col, cov: PW.cov, door: PW.door, rooms,
        doorImg: Object.fromEntries(['pewter', 'sliding_single', 'sliding_double'].map(k => [k, `${IM}ev/rocket/door_${k}.png?v=3`])),
        warps: [{ x: 15, y: 16, d: 'u', id: 'gym' }, { x: 28, y: 18, d: 'u', to: 'mart', at: [4, 7, 'u'] }, { x: 17, y: 25, d: 'u', to: 'center', at: [7, 8, 'u'] }, { x: 33, y: 11, d: 'u', to: 'house1', at: [4, 7, 'u'] },
          { x: 17, y: 6, d: 'u', to: 'museum', at: [14, 9, 'u'] }, { x: 25, y: 4, d: 'u', to: 'museum', at: [21, 9, 'u'] },
          { x: 9, y: 30, d: 'u', to: 'house', at: [4, 7, 'u'], pre: async () => { if (gr.done) return true; await S.say('(문 앞을 로켓단이 막고 있다...)', { who: me0 }); S.hide(true); return false; } }] });
      // 지고 돌아오면 포켓몬 센터 간호순 앞에서 (경완 2026-11-08 '져서 포켓몬 센터 가는건 직접')
      const me = F.me = WO ? F.npc(I.myOw(), 7, 4, 'u') : F.npc(I.myOw(), 15, 17, 'd'); if (disg(A)) wear(A, F, true); else I.fitMe(me);
      const lass = ow(A, F, 'lass', 8, 17, 'r'), man = ow(A, F, 'man', 29, 19, 'l'), boy = ow(A, F, 'boy', 33, 13, 'd');
      const old = ow(A, F, 'old_man_1', 9, 8, 'l'), kong = ow(A, F, `${IM}ev/rocket/ow_little_boy.png?v=3`, 32, 18, 'l', { fw: 16 });
      gr = ow(A, F, 'hg_rocket_m', 9, 31, 'd');   // 빈집 앞 조무래기: 변장하고 암호를 대면 비켜 줌
      if (A.has('gr')) { gr.x = 10; gr.y = 31; gr.turn('l'); gr.done = true; gr.put(); }
      // 다른 마을로 가는 길은 로켓단이 막고 있다 (경완 2026-11-07, 첫마디는 저마다 다르게 2026-11-08). 끝까지 말 걸면 짜증 나서 배틀 (이스터에그, 변장 중엔 의심만)
      const stop = [ow(A, F, 'hg_rocket_f', 21, 37, 'u'), ow(A, F, 'hg_rocket_m', 22, 37, 'u'), ow(A, F, 'hg_rocket_m', 45, 21, 'l'), ow(A, F, 'hg_rocket_f', 45, 22, 'l')];
      [[20, 37], [23, 37], [45, 20], [45, 23]].forEach(([x, y]) => F.block.add(x + ',' + y));
      stop.forEach((s, i) => { s.stop = STOP[i]; s.n = 0; });
      const stopTalk = async s => { const o = s.stop;
        if (disg(A) && !s.done) return suspSay(A, F, S, s);
        if (s.done) { await S.say(o.beaten[s.n++ % o.beaten.length], { who: G }); S.hide(true); return; }
        if (!s.lost && s.n < o.lines.length) { if (!s.n) { F.bub(s, '!', 700); A.se('se_pin'); await wait(500); } await S.say(o.lines[s.n++], { who: G }); S.hide(true); return; }
        await fight(A, F, S, s, { pre: o.pre, team: gTeam(A, 2, -1, stop.indexOf(s) + 1), g: 200, song: 'hgNibi', say: { win: '흥! 이제 좀\n저리 가라!', lose: '으아악!\n괜히 건드렸다...!' }, post: o.post }); if (s.done) s.n = 0; };
      // 마을을 돌아다니는 로켓단 셋
      const wg = [[14, 10, 'd'], [36, 22, 'l'], [24, 33, 'u']].map(([x, y, f], i) => { const s = ow(A, F, GR[(i + 1) % 2], x, y, f); F.wander(s, 2); s.wg = WG_L[i]; s.n = 0; return s; });
      const wgTalk = async s => { const D0 = disg(A), L = D0 ? s.wg.d : s.wg.n, i = D0 ? (s.dn | 0) : (s.n | 0); if (D0) { if (!s.dn) F.bub(s, '?', 800); s.dn = i + 1; } else s.n = i + 1; await S.say(L[i % L.length], { who: G }); S.hide(true); };
      lass.nm = '소녀 다솜'; man.nm = '아저씨 만복'; old.nm = '할아버지 돌쇠'; boy.nm = '소년 준이'; kong.nm = '꼬마 콩이';
      [man, boy].forEach(s => F.wander(s, 2));
      lass.say = ['마을 사람들한테 물어보세요!\n분명 누군가 봤을 거예요.'];
      // 단서는 빈집 → 제복 → 암호 순서 (경완 2026-11-08): 마을 사람 힌트도 지금 할 차례를 가리킨다
      const TIP = () => { man.say = [A.has('pw') ? '남쪽 빈집 앞에 로켓단이\n떡 버티고 서 있더라고.\n뭘 지키는 걸까?' : A.has('kong') ? '마트 점원 미소 씨가\n아까부터 울상이던데.\n로켓단이 뭘 했나 봐.' : A.has('dol') ? '꼬마 콩이가 나무 밑에서\n엉엉 울고 있던데...\n무슨 일이지?' : '밤새 돌쇠 할아버지네 쪽이\n시끄럽더니... 무슨 일이지?'];   // 진행에 맞춰 다음 힌트 (경완 2026-11-08 '돌쇠 깼는데도 돌쇠 힌트')
        boy.say = [A.has('kong') ? '미소 누나네 마트에도\n검은 옷 사람들이 왔었대요!' : A.has('dol') ? '콩이가 모자를 잃어버려서\n마트 옆 나무 밑에서 울고 있어요!' : '돌쇠 할아버지네 정원 앞에\n로켓단이 바위를 잔뜩\n쏟아 놓고 갔대요!']; };
      TIP();
      const R = (k, x, y, f, room, nm, say, wr) => { const s = ow(A, F, k, x, y, f, { room, fw: /\//.test(k) ? 16 : 0 }); s.nm = nm; s.say = say; if (wr) F.wander(s, wr); return s; };
      const miso = R('clerk', 2, 3, 'r', 'mart', '점원 미소', []);
      R('youngster', 7, 2, 'd', 'mart', '반바지 꼬마 태호', ['검은 옷 사람들이\n물건을 잔뜩 사 갔어요.\n상자는 통로에 버려두고요!']);
      R('boy', 6, 4, 'l', 'mart', '소년 민재', ['로켓단이 체육관을\n차지했다면서요?\n관장님, 힘내세요!'], 1);
      const nurse = R('nurse', 7, 2, 'd', 'center', '간호순', ['포켓몬 센터에 어서 오세요!']);
      // 본가 FR 회복 연출 (field_effect.c PokecenterHeal): 간호순이 왼쪽 기계로 → 라인업 수만큼 몬스터볼 25프레임마다 하나씩(SE_BALL) → 32프레임 뒤 회복 곡 + 볼 반짝임·모니터 깜빡임 (경완 2026-11-08)
      const heal = async () => { const fr = n => wait(n * 1000 / 60), n = Math.max(1, Math.min(6, I.luN?.() || 1)), OFF = [[0, 0], [6, 0], [0, 4], [6, 4], [0, 8], [6, 8]], bs = [];
        const bf = k => bs.forEach(e => { e.style.backgroundPosition = `${k * 100 / 7}% 0`; });
        nurse.turn('l'); await fr(16);
        for (let i = 0; i < n; i++) { const e = F.pic(`${IM}ev/rocket/heal_ball.png?${VA}`, (89 + OFF[i][0]) / 16, (24 + OFF[i][1]) / 16, 8, 8); Object.assign(e.style, { backgroundSize: '800% 100%', zIndex: 3 }); bs.push(e); bf(7); A.se('se_ball'); if (i < n - 1) await fr(25); }
        await fr(32); const song = A.fan('mus_rg_heal');
        const mon = F.pic(`${IM}ev/rocket/heal_mon.png?${VA}`, 7, .5, 32, 16); Object.assign(mon.style, { backgroundSize: '400% 100%', zIndex: 3 });
        const MF = [[1, 5], [2, 5], [3, 7], [2, 5], [1, 5], [0, 5]]; const monRun = (async () => { for (let r = 0; r < 4; r++) for (const [f, d] of MF) { mon.style.backgroundPosition = `${f * 100 / 3}% 0`; await fr(d); } mon.remove(); })();
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { bf(c); await fr(8); }
        for (let c = 4; c < 7; c++) { bf(c); await fr(8); } bf(7); await fr(30); bs.forEach(e => e.remove());
        await song; await monRun; nurse.turn('d'); await fr(8); };
      R('gentleman', 4, 7, 'u', 'center', '신사 고상해', ['로켓단이 마을 길을\n다 막아 버렸어.\n이래서야 어디도 못 가겠군.'], 1);
      R('youngster', 1, 2, 'd', 'center', '반바지 꼬마 동구', ['저기 PC 로 포켓몬 라인업을\n바꿀 수 있대요!'], 1);
      R('gba_kid', 10, 7, 'u', 'center', '꼬마 겜돌이', ['밖에 로켓단이 무서워서\n여기서 게임만 하고 있어요.']);
      R('balding_man', 1, 2, 'd', 'house1', '아저씨 철수', ['우리 집 앞에도 로켓단이\n서성거려서 밖에 나가질 못하겠어.'], 1);
      R('worker_m', 16, 5, 'l', 'museum', '박물관 직원 수진', ['죄송해요, 오늘은 박물관 문을\n일찍 닫으려고 해요.', '로켓단이 화석을 노린다는\n소문이 있어서요...']);
      R('old_man_1', 2, 4, 'r', 'museum', '할아버지 석주', ['로켓단 녀석들...\n옛날에도 여기 화석을\n훔치려 들었지.']);
      R('scientist', 26, 4, 'd', 'museum', '연구원 지민', ['밖이 시끄러워서\n화석 연구가 손에 안 잡히네요...'], 2);
      // 부탁 거리: 콩이 모자(나무 위), 돌쇠 정원 입구 바위 둘, 미소네 통로 상자 둘
      const RK = `${IM}ev/rocket/rock.png?${VA}`, CR = `${IM}ev/rocket/crate.png?v=3`, BALL = `${IM}ev/rocket/ball.png?${VA}`;
      const hat = A.has('kong') ? null : F.pic(`${IM}ev/rocket/hat.png?${VA}`, 30.7, 16.1, 12, 8, 'top');
      const rocks = A.has('dol') ? [] : [F.obst(RK, 8, 7, { fr: 4, kind: 'rock' }), F.obst(RK, 7, 7, { fr: 4, kind: 'rock' })];
      const crates = A.has('miso') ? [] : [F.obst(CR, 9, 4, { h: 32, room: 'mart', kind: 'crate' }), F.obst(CR, 9, 6, { h: 32, room: 'mart', kind: 'crate' })];
      // 막힌 계단 앞엔 로켓단 상자 (경완 2026-11-08 '막혀 있는 계단 앞에는 뭔가 막혀 있는 본가 소품')
      F.obst(CR, 1, 6, { h: 32, room: 'center', kind: 'bar' }); F.obst(CR, 8, 8, { h: 32, room: 'museum', kind: 'bar' });
      // 숨은 것·떨어진 것 (한 번 주우면 이 장을 다시 해도 안 나옴)
      const ball = (key, x, y, it, room) => { if (A.has(key)) return; const b = F.obst(BALL, x, y, { kind: 'ball', room }); b.key = key; b.it = it; };
      const hide = (key, x, y, it, room) => { if (!A.has(key)) F.hide(x, y, { key, it, room: room || 'main' }); };
      hide('c2e1', 5, 3, { k: 'egg', g: 2 }); ball('c2b1', 10, 5, { kinds: ['mint'] });   // 돌쇠 정원 안
      hide('c2e2', 28, 27, { k: 'egg', g: 1 });   // 꽃밭
      hide('c2h1', 38, 34, { kinds: ['it'], cap: 3500 });   // 남쪽 풀밭
      // 빈집: 발자국이 오른쪽 화분까지, 화분을 옮기면 그 자리에 계단
      const POTD = [[10, 5], [9, 5], [8, 6], [9, 6]];
      const pot = F.obst(`${IM}ev/rocket/pot.png?${VB}`, ...(A.has('stairs') ? POTD[0] : [10, 7]), { h: 32, room: 'house', kind: 'pot' });
      let stairs = null;
      const stairsOn = () => { stairs = F.pic(`${IM}ev/rocket/stairs.png?v=3`, 10, 7, 16, 16, 'floor', 'house'); F.rooms.house.warps.push({ x: 10, y: 7, id: 'stairs' }); return stairs; };
      if (A.has('stairs')) stairsOn();
      [6, 7, 8, 9].forEach(x => { F.pic(`${IM}ev/rocket/steps.png?${VB}`, x, 7, 16, 16, 'floor', 'house').style.opacity = '.85'; });
      if (WO) F.setMap('center');
      F.cam(me.x, me.y); A.music('hgNibi'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      const K = kit(A, F, S, me0), { me1, ask, use, dirTo, pn, iga } = K;
      // 콩이 모자: 찾아 주면 다시 쓴다 (경완 2026-11-08). 보는 방향마다 앞·옆·뒤 그림 (경완 2026-11-08 '모자 방향에 따라 달리 보이게')
      const HATF = { d: `hat_d.png?${VB}`, u: `hat_u.png?${VB}`, l: `hat.png?${VA}`, r: `hat.png?${VA}` };
      const kongHat = () => { if (kong.hatEl) return; const e = document.createElement('i'); e.className = 'ev-hat'; Object.assign(e.style, { position: 'absolute', left: 2 * F.k + 'px', top: 13 * F.k + 'px', width: 12 * F.k + 'px', height: 8 * F.k + 'px', backgroundSize: '100% 100%', imageRendering: 'pixelated' }); kong.el.appendChild(e); kong.hatEl = e;
        // 방향 바꿀 때 새 그림을 그제야 불러와 잠깐 모자가 사라지던 것 (경완 2026-11-08): 세 방향 그림을 미리 불러 두고, 바뀔 때만 바꿈
        Object.values(HATF).forEach(f => { const im = new Image(); im.src = `${IM}ev/rocket/${f}`; (kong.hatIm = kong.hatIm || []).push(im); });
        let cur = ''; const p0 = kong.put; kong.put = () => { p0(); const u = `url(${IM}ev/rocket/${HATF[kong.f] || HATF.d})`; if (u !== cur) { cur = u; e.style.backgroundImage = u; } }; kong.put(); };
      if (A.has('kong')) kongHat();
      const kongOn = on => { kong.on = on; kong.el.hidden = !on; if (hat) hat.style.visibility = on ? '' : 'hidden'; };
      if (!A.has('dol')) kongOn(false);
      const P0 = A.pal();
      if (WO) {
        await F.palOn(P0, true); A.tired = false;   // 옆에 (뒤에 서면 큰 포켓몬이 나를 가림)
        await S.say('어머, 관장님!\n포켓몬들이 많이 지쳤네요.\n바로 회복시켜 드릴게요.', { who: nurse.nm }); S.hide(true); await heal();
        await S.say('기다리셨습니다!\n포켓몬들이 모두 건강해졌어요.', { who: nurse.nm });
        await S.say('아지트에 다시 가시는 거죠?\n조심하세요, 관장님!', { who: nurse.nm }); S.hide(true);
      } else if (!A.retry) {
        await A.title('1장 · 아지트를 찾아서', '트레이너들을 구하러 가자!', 'CHAPTER 1');
        await S.say('(완전히 쫓겨나 버렸다...)', { who: me0 });
        await S.say('(트레이너들과 안내원을 구하려면\n로켓단 아지트부터 찾아야 해!)', { who: me0 }); S.hide(true);
        // 대표 포켓몬이 내 오른쪽에 나와서 → 같이 가 주겠다고? → 말풍선·기뻐하기 → 고마워 (경완 2026-11-08 순서)
        if (P0) { await wait(300); await F.palOut(P0); await me1('뭐!? 너도 나랑\n같이 가 주겠다고?'); await F.palJoy(); await me1('고마워!\n같이 트레이너들을 구하러 가자!'); }
        F.bub(lass, '!', 900); A.se('se_pin'); await wait(900);
        await F.approach(lass, me, 160);
        await S.say('관장님! 괜찮으세요?\n체육관에서 쫓겨나시는 거 봤어요!', { who: lass.nm });
        await S.say('검은 옷 입은 사람들이\n트레이너들을 끌고\n어디론가 가 버렸어요.', { who: lass.nm });
        await S.say('어디로 갔는지는 못 봤는데...\n마을 사람들한테 물어보면\n누군가 봤을지도 몰라요!', { who: lass.nm }); S.hide(true);
      } else await F.palOn(P0);
      const lassGo = () => { if (lass.on) { lass.on = false; lass.el.hidden = true; } };
      if (A.retry || WO) lassGo();
      // 마을 사람 부탁: 사람은 사정과 힌트만, 부탁 창은 그 장애물(나무·바위·상자)에 말 걸었을 때 (경완 2026-11-08). 해결하면 그 사람이 와서 고마움·단서.
      //   다시 말 걸면 들려줬던 주요 힌트를 계속 말한다
      const say = async (W, L) => { for (const t of L) await S.say(t, { who: W }); S.hide(true); };
      // 변장했을 때: 진행에 필요한 사람(돌쇠·미소·간호순·콩이·힌트 주는 만복)만 관장인 걸 알아보고, 나머지는 끝까지 로켓단인 줄 안다 (경완 2026-11-08)
      const DSAY = {
        '할아버지 돌쇠': ['이놈! 또 무슨 짓을 하러...\n...아니, 관장 양반 아닌가?', '허허, 감쪽같구먼.'],
        '점원 미소': ['히익, 또 오셨...\n...어? 관장님이세요?', '휴, 로켓단인 줄 알았어요...'],
        '아저씨 만복': ['히익, 로켓단...!\n...아, 관장님이었군요.\n깜짝 놀랐잖아요.'],
        '간호순': ['어머, 로켓단...!?\n...아, 관장님이셨군요.\n깜짝 놀랐어요.'] };
      const FOOL = {
        '소년 준이': () => [A.has('miso') ? '로켓단 무서워...\n저리 가요!' : '로, 로켓단이다...!\n미소 누나네 마트엔\n또 왜 가요!?'],
        '반바지 꼬마 태호': () => A.has('miso') ? ['히익! 로켓단이 또 왔다!\n이번엔 뭘 사 가려고요...!?'] : ['히익! 로켓단이 또 왔다!', '사, 상자는 저 통로에\n그대로 있어요...!'],
        '소년 민재': () => ['로켓단이다...!\n관장님이 꼭 혼내 줄 거야!'],
        '신사 고상해': () => ['흠, 로켓단인가...\n자네들 때문에 마을 길이\n다 막혔단 말일세!'],
        '반바지 꼬마 동구': () => ['으악, 로켓단이다!\n포켓몬 센터까지 쳐들어왔어!'],
        '꼬마 겜돌이': () => ['...로켓단이든 뭐든\n지금 보스전이라 바빠요.', '말 걸지 마세요!'],
        '아저씨 철수': () => ['또 로켓단이야!?\n우리 집엔 가져갈 거 없다고!'],
        '박물관 직원 수진': () => ['로, 로켓단...!\n화석은 절대 못 드려요!'],
        '할아버지 석주': () => ['이 녀석, 또 화석을 노리고 왔구나!\n어림없다!'],
        '연구원 지민': () => ['로켓단은 화석에\n손대지 마세요!'] };
      const fool = async s => { if (!disg(A) || !FOOL[s.nm]) return false; await say(s.nm, FOOL[s.nm]()); return true; };
      const dz = async s => { if (!disg(A) || s.dz || !DSAY[s.nm]) return; s.dz = 1; for (const t of DSAY[s.nm]) await S.say(t, { who: s.nm }); };
      const HINT = {
        kong: ['모자 찾아 줘서 고마워요!', '그 옷 입으니까 관장님도\n진짜 로켓단 같아요! 히히.'],
        dol: ['그 녀석들, 밤마다 마을 남쪽\n빈집에 들락날락하더구먼.', '그 집은 오래전에 비었는데\n불빛이 새어 나오더란 말이지.'],
        miso: ['그 검은 옷 손님들,\n계산하면서 서로 "우하하!"\n하고 인사하더라고요.', '무슨 암호 같은 걸까요?'] };
      const kongTalk = async () => { const W = kong.nm;
        if (A.has('kong')) return say(W, HINT.kong);
        if (kong.ag) return say(W, ['모자가 저 나무 꼭대기에\n걸려 있어요... 흑흑']);
        kong.ag = 1; await say(W, ['흑흑... 바람에 모자가 날아가서\n나무 꼭대기에 걸렸어요...', '너무 높아서 손이 안 닿아요...']); await me1('(옆에 있는 저 나무 말이구나.)'); };
      const dolTalk = async () => { const W = old.nm;
        if (A.has('dol')) return say(W, ['허허, 정원에 떨어진 건\n뭐든 가져가게.', ...HINT.dol]);
        if (old.ag) return say(W, ['정원 입구를 바위가 막고 있어서\n들어갈 수가 없다네...']);
        old.ag = 1; await say(W, ['아이고, 관장 양반!\n어젯밤 검은 옷 녀석들이 바위를 잔뜩\n싣고 가다가 여기 쏟아 놓고 갔다네.', '우리 집 정원에 들어갈 수가 없어\n아주 곤란하구먼...']); };
      const misoTalk = async () => { const W = miso.nm;
        if (A.has('miso')) return say(W, HINT.miso);
        if (!A.has('kong')) return say(W, ['어서 오세요...', '오늘은 가게가 좀 어수선해요.\n죄송해요...']);
        if (miso.ag) return say(W, ['통로에 쌓인 상자 때문에\n안쪽 선반 물건을 꺼낼 수가 없어요...']);
        miso.ag = 1; await say(W, ['어서 오세요...\n아, 관장님! 마침 잘 오셨어요.', '아까 검은 옷 손님들이 물건을 잔뜩\n사 가면서 상자를 통로에\n쌓아 두고 갔어요.', '너무 무거워서 안쪽 선반 물건을\n꺼낼 수가 없어요...']); };
      // 장애물에 말 걸기. 나무는 어느 쪽에서 말 걸어도 (경완 2026-11-08)
      const TREE = new Set(['30,17', '31,17', '30,18', '31,18']);
      const treeLook = async () => {
        if (A.has('kong') || !hat || !A.has('dol')) return me1('(커다란 나무다.)');
        await me1('(나무 꼭대기에 작은 모자가\n걸려 있다...)'); if (!(await ask('손이 닿지 않는다'))) return;
        await use(31, 17, async () => { A.shake(); for (let i = 0; i < 3; i++) { hat.animate([{ translate: '0 0' }, { translate: '-3px 0' }, { translate: '3px 0' }, { translate: '0 0' }], { duration: 160 }); await wait(160); }
          const t0 = parseFloat(hat.style.top), x0 = parseFloat(hat.style.left), KK = F.k; await anim(520, q => { hat.style.top = t0 + (2.6 * 16 * KK) * q * q + 'px'; hat.style.left = x0 + 1.1 * 16 * KK * q + 'px'; hat.style.rotate = 200 * q + 'deg'; }); hat.remove(); });
        await me1('(모자가 떨어졌다!)');
        F.bub(kong, '!', 800); A.se('se_pin'); await wait(700); kongHat(); A.se('DP_PIRORIRO'); kong.hop = 4; kong.put(); await wait(140); kong.hop = 0; kong.put();
        await F.approach(kong, me, 200);
        await S.say('와아! 제 모자다!\n고마워요, 관장님!', { who: kong.nm });
        await S.say('아 참! 아까 검은 옷 아저씨가\n저쪽으로 뛰어가다가\n이걸 떨어뜨리고 갔어요.', { who: kong.nm });
        // 단서 1: 로켓단 제복 → 바로 입고 변장
        await A.got(S, { k: 'x', nm: '로켓단 제복', img: `${IM}fit/rocket_${RK_G(A)}.png?${VC}`, d: '로켓단 조무래기가 떨어뜨리고 간 제복.\n입으면 로켓단으로 변장할 수 있다.' }, { key: 'suit', giver: kong.nm }); A.mark('kong');
        await say(kong.nm, ['그 아저씨들, 트레이너들을 데리고\n마을 남쪽으로 갔어요!']);
        await me1('(이걸 입으면 로켓단 사이에\n섞여 들어갈 수 있겠어!)');
        await wear(A, F, true, true); await me1('(로켓단으로 변장했다!)');
        await say(kong.nm, ['우와, 진짜 로켓단 같아요!', '아 참, 마트 점원 미소 누나가\n검은 옷 손님들 때문에\n울상이던데요.']); TIP();
        await me1('(마트에 가 보자.)'); };
      const rockLook = async () => {
        await me1('(커다란 바위가 정원 입구를\n막고 있다.)'); if (!(await ask('혼자서는 꿈쩍도 하지 않는다'))) return;
        for (const b of rocks) if (b.on) await use(b.x, b.y, async () => { A.se('DP_GASHIN', .8); b.shake(); await wait(200); await b.clear('break'); });
        A.mark('dol'); TIP(); await me1('(바위가 부서졌다!)');
        F.bub(old, '!', 800); A.se('se_pin'); await wait(700); await F.approach(old, me, 240);
        // 단서 2: 아지트 자리
        await say(old.nm, ['허허, 대단한 포켓몬이구먼!\n정원에 떨어진 건 뭐든 가져가게.', '그러고 보니 그 녀석들...\n밤마다 마을 남쪽 빈집에\n들락날락하더구먼.', '그 집은 오래전에 비었는데\n불빛이 새어 나오더란 말이지.']);
        await say(old.nm, ['아, 그리고 아까 마트 옆 나무 밑에서\n꼬마 콩이가 울고 있더구먼.\n한번 가 보게나.']);
        kongOn(true); TIP(); await me1('(남쪽 빈집...!)', '(하지만 로켓단이 지키고 있을 텐데...\n일단 콩이한테 가 보자.)'); };
      const crateLook = async () => {
        if (!A.has('kong')) return me1('(무거운 상자가 통로를\n막고 있다...)');
        await me1('(무거운 상자가 통로를\n막고 있다.)'); if (!(await ask('혼자서는 밀 수 없다'))) return;
        for (const b of crates) if (b.on) await use(b.x, b.y, async () => { A.se('DP_KON', .9); await b.clear('push', F.pl ? dirTo(F.pl, [b.x, b.y]) : 'd'); });
        await me1('(통로가 뻥 뚫렸다!)');
        F.bub(miso, '!', 800); A.se('se_pin'); await wait(700); miso.face(me); A.se('DP_PIRORIRO');
        await S.say('와, 고마워요!\n이제 장사할 수 있겠어요!', { who: miso.nm });
        await S.say('이건 감사의 표시예요.\n체육관에 장식해 주세요!', { who: miso.nm });
        await A.got(S, { kinds: ['deco'], cap: 1500 }, { key: 'miso', giver: miso.nm }); A.mark('miso');
        // 단서 3: 암호
        await say(miso.nm, ['아, 그러고 보니 그 손님들...\n계산하면서 서로\n"우하하!" 하고 인사하더라고요.', '무슨 암호 같은 걸까요?']);
        A.mark('pw'); TIP(); await me1('(우하하...\n람다가 웃던 소리랑 똑같다!)'); };
      // 빈집 앞 조무래기: 변장 + 암호 (경완 2026-11-08). 비킬 땐 내가 서 있지 않은 옆 칸으로
      const grTalk = async () => {
        if (gr.done) { await S.say(disg(A) ? '...뭘 꾸물거려?\n얼른 들어가라니까.' : '...뭘 봐?', { who: G }); S.hide(true); return; }
        if (!disg(A)) { await S.say(gr.ag ? '또 너냐?\n여긴 그냥 빈집이라니까!' : '뭐야? 여긴 그냥 빈집이야.\n볼일 없으면 저리 가!', { who: G }); gr.ag = 1; S.hide(true);
          await me1(A.has('dol') ? '(로켓단이 지키고 있는 걸 보면\n여기가 아지트가 틀림없어...)' : '(이 집, 뭔가 수상한데...)', '(마을 사람들에게 말을 걸어서\n단서를 찾아보자.)'); return; }
        F.bub(gr, '?', 800); await wait(500);
        await S.say('응? 처음 보는 얼굴인데...\n신입이냐?', { who: G });
        await S.say('들어가려면 암호를 대라.', { who: G }); S.hide(true);
        const v = await askText(A, '암호를 말한다', '암호');
        if (v == null || !v.trim()) { await S.say('...뭐야, 암호도 몰라?\n신입 교육부터 다시 받고 와!', { who: G }); S.hide(true); if (!A.has('pw')) await me1('(암호를 알아내야 해...\n마을 사람들에게 더 물어보자.)'); return; }
        if (v.replace(/[\s!！~.?？,…'"“”]/g, '') !== '우하하') { await S.say(`"${v.trim().slice(0, 12)}"...?\n틀렸다! 수상한 녀석이군.\n저리 가!`, { who: G }); S.hide(true); if (!A.has('pw')) await me1('(암호를 알아내야 해...\n마을 사람들에게 더 물어보자.)'); return; }
        await S.say('...좋아, 들어가라.\n신입치곤 제법이군.', { who: G }); S.hide(true);
        const mx = Math.round(me.x), my = Math.round(me.y), pl = F.pl, ok = ([x, y]) => !(x === mx && y === my) && !F.solid(x, y, gr);
        const C = [[10, 31], [8, 31]].sort((a, b) => pl ? Math.hypot(b[0] - pl.x, b[1] - pl.y) - Math.hypot(a[0] - pl.x, a[1] - pl.y) : 0), to = C.find(q => ok(q) && !(pl && q[0] === Math.round(pl.x) && q[1] === Math.round(pl.y))) || C.find(ok);   // 포켓몬 반대쪽으로 (큰 포켓몬에 가려지지 않게)
        if (to) { await gr.go([to], 220); gr.face(me); } gr.done = true; A.mark('gr');
        await S.say('...근데 저 녀석, 어디서\n본 것 같은데...?', { who: G }); S.hide(true); };
      // 줍기: 몬스터볼(보이는 것) 또는 숨은 것
      const pick = K.pick;
      const LK = { main: PW.look, mart: MT.look, center: CT.look, house1: HS.look, house: HS.look, museum: MU.look };
      const LOOK = {
        main: { '19,7': '돌담 과학 박물관\n"오래된 화석과 우주의 돌을\n만나 보세요!"', '11,16': [`돌담시티 포켓몬 체육관\n관장: ${me0}`, '...그 위에 누가\n"로켓단 접수!" 라고 낙서해 놓았다.'],
          '39,19': '경찰의 알림\n"검은 옷에 R 마크를 단 수상한 무리를\n보면 바로 신고해 주세요!"', '20,30': '트레이너 팁!\n"포켓몬이 지치면\n포켓몬 센터에서 쉬게 해 주자!"', '31,25': '돌담시티\n"단단한 돌담처럼 변함없는 마을"' },
        museum: { '4,4': '프테라 화석이다.\n하늘을 나는 아주 옛날 포켓몬이라고 한다.', '4,7': '투구푸스 화석이다.\n바닷속에 살던 아주 옛날 포켓몬이라고 한다.', '26,1': '포켓몬 잡지다.\n"이달의 관장 인터뷰!"... 내 얼굴이 실려 있다.', '27,1': '포켓몬 잡지다.\n"이달의 관장 인터뷰!"... 내 얼굴이 실려 있다.' },
        house: { '2,1': '먼지 쌓인 찬장이다.', '3,1': '먼지 쌓인 찬장이다.', '0,1': '부엌이다. 컵라면 그릇이\n잔뜩 쌓여 있다...', '1,1': '부엌이다. 컵라면 그릇이\n잔뜩 쌓여 있다...', '7,1': '창밖으로 돌담시티가 보인다.', '9,1': '돌담시티 근처 지도다.\n누가 빨간 펜으로 동그라미를 쳐 놓았다.', '10,1': '돌담시티 근처 지도다.\n누가 빨간 펜으로 동그라미를 쳐 놓았다.', '0,7': '평범한 화분이다.', '0,6': '평범한 화분이다.' } };
      // 빈집 TV: 켜면 화면이 빛나고 뉴스 (경완 2026-11-08 '빈 집 tv 랑도 상호작용')
      let tv = null;
      const tvLook = async () => {
        if (!tv) { A.se('se_select'); tv = F.pic('', 5 + 1 / 16, 1.5, 14, 7, 'floor', 'house'); tv.classList.add('ev-tv'); tv.style.backgroundImage = ''; tv.style.zIndex = 15; await wait(350); await me1('(TV 를 켜 보았다.)'); }
        await me1('"...속보입니다. 오늘 아침\n돌담시티 체육관을 수상한 무리가\n점거했다는 소식입니다."', '"...체육관 관장은 현재\n행방이 알려지지 않았으며..."', '(...여기 있는데.)', '"...이어서 날씨입니다.\n돌담시티는 오늘 밤\n맑겠습니다."'); };
      // 빈집 화분: 포켓몬 기술로 옮기면 그 자리에 계단 (경완 2026-11-08). 화분은 나·포켓몬이 없는 칸으로
      const openStairs = async () => {
        F.lock(true); A.se('DP_GASHIN', .9); F.el.animate([{ translate: '0 0' }, { translate: '-6px 2px' }, { translate: '5px -2px' }, { translate: '-3px 1px' }, { translate: '0 0' }], { duration: 300 }); I.haptic?.(1); await wait(500);
        const e = stairsOn(); e.style.opacity = '0'; e.style.transition = 'opacity .5s'; void e.offsetWidth; e.style.opacity = '1'; A.se('se_unlock'); await wait(600); A.mark('stairs');
        await me1('(화분이 있던 자리에 지하로\n내려가는 계단이 나타났다!)'); };
      const potLook = async () => { if (stairs) return me1('(커다란 화분이다.\n옆으로 옮겨 두었다.)');
        await me1('(커다란 화분이다.\n...밑에서 찬 바람이\n솔솔 새어 나온다!)', '(발자국도 여기서 끊겨 있다...)'); if (!(await ask('화분이 너무 무거워서\n꿈쩍도 하지 않는다'))) return;
        const busyAt = (x, y) => F.solid(x, y) || (F.pl && x === Math.round(F.pl.x) && y === Math.round(F.pl.y)) || (x === Math.round(me.x) && y === Math.round(me.y));
        await use(10, 7, async () => { const to = POTD.find(([x, y]) => !busyAt(x, y) && !busyAt(x, y - 1)) || POTD[0]; A.se('DP_KON', .8); await pot.moveTo(to[0], to[1], 560); A.se('DP_GASHIN', .6); });
        if (!F.pl) await me1('(힘껏 밀어서 화분을 옮겼다!)');
        await openStairs(); };
      const key = (x, y) => x + ',' + y;
      const can = ([x, y]) => { const k = key(x, y); return !!(F.obAt(x, y) || F.hidAt(x, y)?.it || (F.cur === 'main' && TREE.has(k)) || (F.cur === 'house' && k === '5,1') || (F.cur === 'center' && LK.center?.[k] === 'pc') || lookText(LK[F.cur], LOOK[F.cur], x, y)); };
      let hs = false;
      for (;;) {
        const r = await F.play({
          talk: async s => {
            if (s === gr) return grTalk();
            if (s.stop) return stopTalk(s);
            if (s.wg) return wgTalk(s);
            if (await fool(s)) return;
            await dz(s);
            if (s === kong) return kongTalk();
            if (s === old) return dolTalk();
            if (s === miso) return misoTalk();
            if (s === nurse) { A.tired = false; await S.say('포켓몬 센터에 어서 오세요!\n지친 포켓몬을 회복시켜 드릴게요.', { who: s.nm }); S.hide(true); await heal(); await S.say('기다리셨습니다!\n포켓몬들이 모두 건강해졌어요.', { who: s.nm }); await S.say('로켓단 조심하세요, 관장님!', { who: s.nm }); S.hide(true); return; }
            for (const t of s.say || ['...']) await S.say(t, { who: s.nm || '마을 사람' }); S.hide(true); },
          step: async () => { if (lass.on && F.cur === 'main' && (Math.abs(lass.x - me.x) > 7 || Math.abs(lass.y - me.y) > 10)) lassGo(); },
          can,
          look: async ([x, y]) => { if (await pick(x, y)) return; const b = F.obAt(x, y), k = key(x, y);
            if (b?.kind === 'rock') return rockLook();
            if (b?.kind === 'crate') return crateLook();
            if (b?.kind === 'pot') return potLook();
            if (b?.kind === 'bar') return me1('(로켓단 상자가 계단을\n꽉 막고 있다...)', '(위층에는 못 올라갈 것 같다.)');
            if (F.cur === 'main' && TREE.has(k)) return treeLook();
            if (F.cur === 'house' && k === '5,1') return tvLook();
            if (F.cur === 'center' && LK.center?.[k] === 'pc') { await me1('(PC 로 라인업을\n바꿀 수 있다.)'); return F.luOpen(); }
            const t = lookText(LK[F.cur], LOOK[F.cur], x, y); if (t) await me1(...[].concat(t)); },
          warp: async w => { if (w.id === 'gym') return me1('(체육관 문이 안에서 굳게 잠겨 있다...)');
            if (w.id === 'stairs') return 'in';
            if (w.id === 'shut') return me1('(문이 잠겨 있다.)'); },
          room: async id => { lassGo(); if (id === 'house' && !stairs && !hs) { hs = true; await wait(300); await me1('(아무도 살지 않는 빈집이다...)', '(그런데 바닥에 발자국이 잔뜩 찍혀 있다.\n오른쪽 화분 쪽으로 이어져 있는데...?)'); } },
        });
        if (r === 'quit') return 'stop';
        if (r === 'lose') return A.lose();
        if (r === 'in') break;
      }
      F.lock(true); await me.go([[10, 7]], 267); A.se('se_exit');
      S.end(); A.music(null);
      await A.black(true, '어두운 계단이\n땅속 깊이 이어져 있다...', '로켓단 아지트로 내려간다', true);
      await F.close();
    },
    // 3장 · 로켓단 아지트 (지하 1층) — v19.18 '찾는 재미': 조무래기 시야를 피해 다니기(들키면 배틀, 변장 중엔 의심만), R 상자 더미 치우고 줍기, 멈춘 발전기를 포켓몬 기술로 돌려 엘리베이터
    async A => {
      const { I, wait } = A, me0 = A.me();
      A.blackNow();
      const M1 = await MAP('b1f'), LK1 = M1.look;
      const F = A.field({ nm: '로켓단 아지트 지하 1층', img: `${IM}ev/rocket/b1f.png?${VC}`, over: `${IM}ev/rocket/b1f_o.png?v=3`, w: 28, h: 34, col: B1F, cov: M1.cov,
        warps: [{ x: 12, y: 2, id: 'up' }, { x: 17, y: 2, id: 'no', off: true }, { x: 15, y: 30, id: 'no', off: true }, ...[23, 24, 25].map(x => ({ x, y: 25, d: 'u', id: 'lift' }))] });
      const me = F.me = F.npc(I.myOw(), 12, 3, 'd'); if (disg(A)) wear(A, F, true); else I.fitMe(me);
      // 문지기 없이 둘만: 왼쪽 복도를 보는 조무래기, 오른쪽 방 입구에서 왼쪽·아래를 번갈아 보는 조무래기 (본가 도는 트레이너)
      const g1 = ow(A, F, 'hg_rocket_m', 4, 9, 'r', { sight: 5 }), g2 = ow(A, F, 'hg_rocket_f', 24, 12, 'l', { sight: 3, spin: ['l', 'd'] });
      const GS = [
        [g1, { key: 'c3g1', again: ['흥, 한 번 이겼다고\n우쭐대지 마라!', '아지트가 넓다고 길 잃지 마라.\n...아, 내가 왜 걱정을 해 주지?', '엘리베이터?\n발전기가 멈춰서 안 움직일걸. 크크'], pre: ['침입자다!\n여긴 로켓단 아지트라고!'], team: gTeam(A, 2, -2, 1), g: 300, say: { win: '아지트는\n그렇게 만만한 데가 아니야!', lose: '말도 안 돼...!' }, post: ['젠장...\n이래서야 승진은 글렀군...'],
          sus: ['응? 못 보던 얼굴인데...\n신입이냐?', '...뭐, 됐다.\n순찰이나 똑바로 돌아.', '엘리베이터 말이냐?\n발전기가 멈춰서 안 움직여.\n누가 좀 고쳐 놨으면...', '근데 너 어디서 본 것 같은데...\n기분 탓인가?'] }],
        [g2, { key: 'c3g2', again: ['흥! 다시 말 걸지 마!\n아직 화났거든?', '람다 님은 지하 4층에서\n뺏은 포켓몬 세느라 바쁘셔.', '...관장님 포켓몬, 좀 귀엽던데.\n아니, 아무것도 아니야!'], pre: ['어머, 체육관 관장님이\n직접 오셨네?', '트레이너들은 못 돌려줘!\n전부 람다 님 거라고!'], team: gTeam(A, 2, -1, 3), g: 300, say: { win: '호호,\n얌전히 돌아가시지!', lose: '어머머...!\n이렇게 셀 줄은!' }, post: ['흥! 람다 님은\n나처럼 만만하지 않을걸!'],
          sus: ['어머, 신입이니?\n제복이 좀 안 맞는 것 같은데?', '람다 님은 지하 4층에 계셔.\n잡아 온 트레이너들도 거기 있고.', '...너 혹시 관장... 아니겠지?\n설마~ 호호.'] }],
      ];
      GS.forEach(([s, o]) => { if (A.has(o.key)) s.done = true; });
      const CR = `${IM}ev/rocket/crate.png?v=3`, BALL = `${IM}ev/rocket/ball.png?${VA}`;
      const pile = A.has('c3pile') ? [] : [F.obst(CR, 3, 12, { h: 32, kind: 'crate' }), F.obst(CR, 4, 12, { h: 32, kind: 'crate' })];   // 왼쪽 방 입구를 막은 R 상자 더미
      const ball = (key, x, y, it) => { if (A.has(key)) return null; const b = F.obst(BALL, x, y, { kind: 'ball' }); b.key = key; b.it = it; return b; };
      const BOXIT = { kinds: ['it', 'mint'], cap: 4000 };
      // 복도 끝 R 상자 하나: 부수면 안에 있던 몬스터볼이 보임 (경완 2026-11-08 '상자 밑에 아이템 있을 때는 몬스터볼 스프라이트도')
      const box = A.has('c3box') ? (ball('c3x1', 26, 9, BOXIT), null) : F.obst(CR, 26, 9, { h: 32, kind: 'rbox' });
      // 엘리베이터 발전기: 엘리베이터 바로 앞이 아니라 왼쪽 방 안쪽에 (경완 2026-11-08 '발전기를 좀 다른 데다')
      const gen = F.obst(`${IM}ev/rocket/machine.png?v=3`, 1, 13, { w: 48, h: 40, span: 3, kind: 'gen', low: true });
      F.obst(CR, 17, 2, { h: 32, kind: 'bar' }); F.obst(CR, 15, 30, { h: 32, kind: 'bar' });   // 막힌 계단 앞 상자
      const RAT = new Set(['7,13', '7,14']), ratBox = A.has('c3rat') ? null : F.obst(`${IM}ev/rocket/ybox.png?${VA}`, 7, 14, { h: 32, kind: 'rat' });   // 발전기 방 오른쪽 노란 상자 (맵 그림에선 지우고 치울 수 있는 상자로)
      const hide = (key, x, y, it) => { if (!A.has(key)) F.hide(x, y, { key, it }); };
      ball('c3b1', 6, 17, { kinds: ['it'], cap: 4000 }); hide('c3e1', 1, 18, { k: 'egg', g: 2 });   // 왼쪽 방 안
      hide('c3h1', 16, 16, { kinds: ['mint'] });   // 가운데 방 화분 속
      F.cam(me.x, me.y); A.music('hgAjito'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      const K = kit(A, F, S, me0), { me1, ask, use, dirTo, pn, iga } = K; await F.palOn(A.pal());
      if (!A.retry) {
        await A.title('2장 · 로켓단 아지트', '지하 깊은 곳 어딘가에...', 'CHAPTER 2');
        await me1('(여기가 로켓단 아지트...!)', disg(A) ? '(변장했으니 들키지는 않겠지...\n아래로 내려가는 길을 찾아야 해!)' : '(조무래기들 눈에 띄지 않게\n조심조심 지나가자.\n아래로 내려가는 길을 찾아야 해!)');
      }
      const meet1 = async s => { const o = GS.find(x => x[0] === s)?.[1]; if (!o) return true; const ok = await fight(A, F, S, s, o); if (ok) A.mark(o.key); return ok; };
      const meet = s => chain(F, GS, s, meet1);
      const pick = async (x, y) => { if (await K.pick(x, y)) return true; const b = F.obAt(x, y);
        if (b?.kind === 'crate') { await me1('(R 마크가 찍힌 상자가\n잔뜩 쌓여 방 입구를 막고 있다.)'); if (!(await ask('혼자서는 밀 수 없다'))) return true;
          for (const c of pile) if (c.on) await use(c.x, c.y, async () => { A.se('DP_KON', .9); await c.clear('push', F.pl ? dirTo(F.pl, [c.x, c.y]) : 'd'); });
          A.mark('c3pile'); await me1('(방으로 들어가는 길이 열렸다!)'); return true; }
        if (b?.kind === 'rbox') { await me1('(R 마크가 찍힌 상자다.\n뚜껑이 단단히 못질되어 있다...)'); if (!(await ask('혼자서는 열 수 없다'))) return true;
          // 상자가 사라지는 순간부터 몬스터볼이 그 밑에 보인다 (경완 2026-11-08)
          await use(b.x, b.y, async () => { A.se('DP_GASHIN', .8); b.shake(); await wait(250); const p = b.clear('break'); const nb = ball('c3x1', 26, 9, BOXIT); if (nb) nb.el.style.zIndex = parseInt(b.el.style.zIndex) - 1; await p; });
          if (!F.obAt(26, 9)) ball('c3x1', 26, 9, BOXIT); A.mark('c3box'); A.se('se_pin');
          await me1('(상자가 부서지면서\n안에서 몬스터볼이 굴러 나왔다!)'); return true; }
        if (b?.kind === 'bar') return me1('(R 상자가 계단을 꽉 막고 있다...\n다른 길을 찾아보자.)'), true;
        // 발전기 방 오른쪽 노란 상자: 같이 다니는 포켓몬이 치우면 그 순간 꼬렛이 튀어나와 달아난다 (경완 2026-11-08)
        if (b?.kind === 'rat' || RAT.has(x + ',' + y)) { const rb = ratBox; if (!rb?.on) return me1('(상자가 있던 자리다.\n...꼬렛이 갉아 먹은 부스러기가 떨어져 있다.)'), true;
          await me1('(상자 안에서 뭔가\n부스럭거리는 소리가 난다...?)'); A.se('DP_KON', .6); rb.shake(); await wait(400); if (!(await ask('상자가 너무 무겁다'))) return true;
          let run = null; await use(7, 14, async () => { A.se('DP_KON', .9); const p = rb.clear('push', F.pl ? dirTo(F.pl, [7, 14]) : 'r'); run = F.monRun(19, 7, 14, [[5, 13, 1], [4, 13], [4, 9], [10, 9]], 110); await p; });
          if (!run) { const p = rb.clear('push', 'r'); run = F.monRun(19, 7, 14, [[5, 13, 1], [4, 13], [4, 9], [10, 9]], 110); await p; }
          A.mark('c3rat'); await run;
          await me1('(상자 밑에서 꼬렛이 튀어나와\n쏜살같이 달아나 버렸다!)', '(로켓단 간식이라도\n훔쳐 먹고 있었나...?)'); return true; }
        if (b?.kind === 'gen') { if (A.has('c3pow')) return me1('(발전기가 웅웅 힘차게 돌고 있다.)'), true;
          await me1('(엘리베이터에 전기를 대는\n커다란 발전기다.\n...멈춰 있다.)'); if (!(await ask('혼자서는 돌릴 수 없다'))) return true;
          const el = I.ty?.() === 13; await use(b.x + 1, b.y, async () => { for (let i = 0; i < (el ? 1 : 3); i++) { b.shake(); A.se(el ? 'DP_W085' : 'DP_KON', .7); await wait(360); } });
          A.se('se_escalator'); b.shake(); A.mark('c3pow');
          const PN = pn() || '포켓몬'; await me1(!F.pl ? '(발전기를 힘껏 돌렸다!\n...웅웅, 발전기가 돌기 시작했다!)' : el ? `(${PN}의 전기가 발전기에\n가득 들어갔다!)` : `(${PN}${iga(PN)} 발전기를 힘껏 돌렸다!\n...웅웅, 발전기가 돌기 시작했다!)`, '(이제 엘리베이터가 움직일 거야!)'); return true; }
        return false; };
      // 도는 조무래기: 2초마다 방향을 바꾸고, 바꾼 쪽에 내가 있으면 바로 다가온다 (변장 중엔 안 옴)
      const wo = () => A.woQ ? 'wo' : undefined;
      let spinT = performance.now() + 1800;
      for (;;) {
        const r = await F.play({
          tick: () => { const t = performance.now(); if (t < spinT) return; spinT = t + 1800; for (const s of GS.map(x => x[0])) if (s.spin && !s.done && s.on) { s.turn(s.spin[(s.spin.indexOf(s.f) + 1) % s.spin.length]); if (!disg(A) && F.sees(s)) return () => meet(s).then(wo); } },
          step: async () => { if (disg(A)) return; const s = GS.map(x => x[0]).find(s => F.sees(s)); if (s) { await meet(s); return wo(); } },
          talk: async s => { const o = GS.find(x => x[0] === s)?.[1]; if (!s.done && disg(A)) return suspSay(A, F, S, s, o?.sus); if (!s.done) { await meet(s); return wo(); } await againSay(S, s, o); },
          can: ([x, y]) => !!(F.obAt(x, y) || F.hidAt(x, y)?.it || RAT.has(x + ',' + y) || lookText(LK1, null, x, y)),
          look: async ([x, y]) => { if (await pick(x, y)) return; const t = lookText(LK1, null, x, y); if (t) await me1(...[].concat(t)); },
          warp: async w => { if (w.id === 'lift') { if (!A.has('c3pow')) return me1('(엘리베이터 단추를 눌러도\n아무 반응이 없다...)', '(전기가 끊겨 있는 것 같다.\n어딘가에 발전기가 있을 거야.)'); A.se('se_exit'); return 'lift'; }
            return me1(w.id === 'up' ? '(위로 돌아갈 때가 아니야.\n트레이너들을 구해야 해!)' : '(계단이 막혀 있다...\n다른 길을 찾아보자.)'); },
        });
        if (r === 'quit') return 'stop';
        if (r === 'wo') return A.whiteout();
        if (r === 'lose') return A.lose();
        if (r === 'lift') break;
      }
      S.end(); A.music(null);
      await A.black(true, '엘리베이터를 타고\n지하 4층으로 내려간다...', '람다가 있는 아지트 가장 깊은 곳', true);
      await F.close();
    },
    // 4장 · 구출 작전 (지하 4층) — 문지기 둘은 꼭 배틀(변장했으면 알아보고 원래 모습으로), 람다 한 판(지면 돌담시티 센터로), 아테나 모니터, 금고(레어 알)·구한 사람들 선물
    async A => {
      const { I, D, wait } = A, me0 = A.me(), sfs = I.sfList(), all = (I.st().sf || []);
      A.blackNow();
      const M4 = await MAP('b4f'), LK4 = M4.look;
      const F = A.field({ nm: '로켓단 아지트 지하 4층', img: `${IM}ev/rocket/b4f.png?v=3`, over: `${IM}ev/rocket/b4f_o.png?v=3`, w: 24, h: 26, col: B4F, cov: M4.cov, warps: [{ x: 20, y: 23, id: 'lift' }, { x: 21, y: 23, id: 'lift' }, { x: 11, y: 15, id: 'no' }] });
      const me = F.me = F.npc(I.myOw(), 20, 24, 'd'); if (disg(A)) wear(A, F, true); else I.fitMe(me);
      const k1 = ow(A, F, 'hg_rocket_m', 16, 14, 'r', { sight: 3 }), k2 = ow(A, F, 'hg_rocket_f', 19, 14, 'l', { sight: 3 });
      const boss = ow(A, F, 'hg_petrel', 19, 8, 'd');
      const CAP = [[17, 7], [21, 7], [18, 5], [20, 5], [17, 5], [21, 5]];
      const caps = all.slice(0, CAP.length).map((s, i) => ow(A, F, s.ow, CAP[i][0], CAP[i][1], 'd'));
      const guy = F.guy = ow(A, F, I.GUY_OW, 19, 5, 'd');
      // 붙잡힌 트레이너·안내원은 밧줄에 묶인 채 (경완 2026-11-08)
      const rope = s => { const e = document.createElement('i'); e.className = 'ev-rope'; s.el.appendChild(e); s.rope = e; };
      [...caps, guy].forEach(rope);
      const safe = F.obst(`${IM}ev/rocket/safe.png?${VA}`, 22, 8, { h: 24, kind: 'safe' });
      // 람다 방 안쪽 기계 사이 모니터 (본가 실프 주식회사 타일셋 그림). 아테나가 연락할 때 켜짐
      const mon = F.pic(`${IM}ev/rocket/mon.png?${VC}`, 19, 2); mon.style.zIndex = 23;
      F.cam(me.x, me.y); A.music('hgAjito'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      const K = kit(A, F, S, me0), { me1, ask, use } = K; await F.palOn(A.pal());
      if (!A.retry) {
        await A.title('3장 · 구출 작전', '모두를 데리고 돌아가자!', 'CHAPTER 3');
        await me1('(이 층 어딘가에\n람다와 트레이너들이 있을 거야...!)');
      }
      // 문지기 둘: 무조건 배틀 (경완 2026-11-08). 변장했으면 알아보고 원래 모습으로 돌아감
      const KS = [[k1, { key: 'c4k1', pre: ['멈춰라!\n여기서부턴 람다 님 방이다!'], team: gTeam(A, 3, 0, 2), g: 400, say: { win: '람다 님께는\n한 발짝도 못 다가간다!', lose: '말도 안 돼...!' }, post: ['크윽...!\n그래도 아직 내 짝이 남았다!'] }],
        [k2, { key: 'c4k2', pre: ['나까지 이길 수 있을까?\n각오해!'], team: gTeam(A, 3, 0, 4), g: 400, say: { win: '호호,\n여기까지야!', lose: '어머...!\n람다 님...!' }, post: ['람다 님...\n죄송합니다...!'] }]];
      // 진 문지기는 람다 방 양옆으로 도망가 그대로 서 있다 (경완 2026-11-08 '안쪽으로 도망쳤을 때 사라지지 않게')
      const KP = new Map([[k1, [17, 8]], [k2, [21, 8]]]);
      KS.forEach(([k, o]) => { if (A.has(o.key)) { k.done = true; [k.x, k.y] = KP.get(k); k.turn('d'); k.put(); } });
      const gate = async () => { const live = KS.filter(([k]) => !k.done); if (!live.length) return; F.lock(true);
        if (disg(A)) { live.forEach(([k]) => { k.face(me); F.bub(k, '?', 900); }); await wait(900);
          await S.say('...거기 신입.\n이 앞은 간부님 방이다.\n아무나 못 들어간다.', { who: G }); await S.say('잠깐... 그 얼굴...\n어디서 많이 봤는데...', { who: G }); S.hide(true);
          live.forEach(([k]) => F.bub(k, '!', 900)); A.se('se_pin'); await wait(1000);
          await S.say('체, 체육관 관장이잖아!!\n변장까지 하고 숨어들다니!', { who: G }); S.hide(true);
          A.mark('caught'); await wear(A, F, false, true); await me1('(들켜 버렸다...!)'); }
        for (const [k, o] of live) { if (Math.abs(Math.round(k.x) - Math.round(me.x)) + Math.abs(Math.round(k.y) - Math.round(me.y)) > 1) await F.approach(k, me, 200);
          const ok = await fight(A, F, S, k, o); if (!ok) return 'wo'; A.mark(o.key); await wait(300); }
        F.lock(true); KS.forEach(([k]) => { k.on = true; k.el.hidden = false; });
        await S.say('안 되겠다...\n람다 님께 알려야 해!\n도망쳐!!', { who: G }); S.hide(true);
        await Promise.all(KS.map(async ([k]) => { await F.goTo(k, KP.get(k), 130); k.turn('d'); }));
        await me1('(문지기들이 안쪽으로\n도망쳐 버렸다...!)'); };
      for (;;) {
        const r = await F.play({
          step: async ([x, y]) => { if (KS.some(([k]) => !k.done && F.sees(k))) return gate(); if (y <= 11 && x >= 16) return 'boss'; },
          talk: async s => { if (s === k1 || s === k2) return gate(); if (s === boss) return 'boss'; },
          can: ([x, y]) => !!(F.obAt(x, y) || lookText(LK4, null, x, y)),
          look: async ([x, y]) => { if (F.obAt(x, y)?.kind === 'safe') return me1('(튼튼해 보이는 금고다.\nR 마크가 찍혀 있다...)'); const t = lookText(LK4, null, x, y); if (t) await me1(...[].concat(t)); },
          warp: async () => me1('(트레이너들을 두고\n돌아갈 수는 없어!)'),
        });
        if (r === 'quit') return 'stop';
        if (r === 'wo') return A.whiteout();
        if (r === 'lose') return A.lose();
        if (r === 'boss') break;
      }
      // 람다 방
      F.lock(true); A.music('hgEyeRoc');
      const nm0 = i => I.sfName?.(all[i]) || '트레이너';
      caps.forEach(c => F.bub(c, '!', 900)); F.bub(guy, '!', 900); A.se('se_pin');
      await F.camTo(19, 7, 800); await wait(600);
      await S.say('관장님!!\n구하러 와 주셨군요!', { who: '안내원' });
      if (caps.length) await S.say(`관장님! 저희 여기 있어요!\n${caps.length > 1 ? '다들 무사해요!' : '전 무사해요!'}`, { who: nm0(0) });
      S.hide(true); F.bub(boss, '!', 900); A.se('se_pin'); await wait(900);
      await S.say('우하하!\n결국 여기까지 왔구먼!', { who: B });
      S.hide(true); F.follow = false; await F.goTo(me, [19, 9]); me.turn('u'); await F.camTo(19, 8.5, 500);
      if (!A.retry || !A.has('c4meet')) {
        await S.say('부하들이 벌벌 떨며 도망쳐 오더니...\n관장 자리가 괜히 있는 게\n아니었군.', { who: B });
        await S.say('하지만 여기서 끝이다!\n체육관도, 트레이너도,\n몰려오는 손님들의 포켓몬도...', { who: B });
        await S.say('전부 이 람다 님이\n잘 맡아 두겠다! 우하하!', { who: B }); A.mark('c4meet');
      } else await S.say('우하하! 또 왔구먼!\n이번에도 쫓아 보내 주마!', { who: B });
      S.hide(true);
      const won = await A.battle({ tr: 'hg_petrel', cls: '로켓단 간부', nm: '람다', tier: 2, g: 1000, music: 'hgVsRoc', win: 'winGym',
        team: [[A.lv() >= 28 ? 42 : 41, A.lv()], [A.lv() >= 28 ? 20 : 19, A.lv()], [A.lv() >= 28 ? 24 : 23, A.lv() + 1], [A.lv() >= 30 ? 110 : 109, A.lv() + 3]],
        say: { win: '우하하!\n관장도 별거 아니구먼!', lose: '이, 이럴 수가...!\n이 람다 님이 지다니!' } });
      // 지면 돌담시티 포켓몬 센터로 (경완 2026-11-08 '져서 포켓몬 센터 가는건 직접 가서')
      if (!won) { A.music('hgAjito'); await wait(300); await S.say('우하하! 아직 멀었구먼!\n썩 꺼져라!', { who: B }); S.hide(true); return A.whiteout(); }
      A.music('hgAjito'); await wait(300); await prize(A, S, 1000);
      await S.say('크윽...! 체육관 하나 털다가\n이게 무슨 꼴이람!', { who: B });
      await S.say('하지만 기억해 둬라...\n로켓단은 이걸로 끝이 아니다!\n언젠가 그분께서...!', { who: B }); S.hide(true);
      // 람다가 도망가기 전에 모니터가 켜지고 간부(실루엣)가 람다를 불러들인다 (경완 2026-11-08)
      A.music(null); await wait(300); A.se('se_pin'); I.haptic?.(0);
      mon.style.backgroundImage = `url(${IM}ev/rocket/mon_on.png?${VC})`; const glow = F.pic('', 19 + 3 / 16, 2 + 2 / 16, 10, 10); glow.classList.add('ev-tv'); glow.style.backgroundImage = ''; glow.style.zIndex = 24;
      F.bub(boss, '!', 900); [boss, ...KS.map(x => x[0])].forEach(k => k.on !== false && k.turn('u')); await F.camTo(19, 5, 600); await wait(500);
      await S.say('삐빅... 삐빅...', { who: '모니터' }); S.hide(true); await wait(200);
      const W = '???';
      await crt(A, async () => {
        await S.say('...치직... 람다.\n거기까지 해라.', { who: W });
        await S.say('헉...!\n이, 이 목소리는...!', { who: B });
        await S.say('호호... 그쪽이 소문의\n체육관 관장님?', { who: W });
        await S.say('체육관 하나에 언제까지\n매달려 있을 셈이지, 람다?\n당장 돌아와라.', { who: W });
        await S.say('관장님, 이번엔 물러나 주지.\n로켓단의 계획은\n이제 막 시작됐을 뿐이니까.', { who: W });
        await S.say('다음에 또 보자고. 호호호!', { who: W }); S.hide(true); });
      glow.remove(); mon.style.backgroundImage = `url(${IM}ev/rocket/mon.png?${VC})`; await F.camTo(19, 8.5, 500);
      boss.turn('d'); await wait(300);
      await S.say('...옛!\n당장 돌아가겠습니다!', { who: B });
      await S.say('흥, 체육관이랑 트레이너들은\n돌려주마! 운 좋은 줄 알아라!', { who: B }); S.hide(true);
      const gang = [boss, ...KS.map(x => x[0]).filter(k => k.on !== false && !k.el.hidden)];
      A.se('DP_KON', 1); A.shake?.(); F.el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.4)' }, { filter: 'brightness(1)' }], { duration: 500 }); await Promise.all(gang.map(k => k.gone())); await wait(400);
      await me1('(람다와 문지기들이 연막을 뿌리고\n도망쳐 버렸다...!)', '(방금 모니터 속 그 사람...\n람다보다 높은 간부인 걸까...?)', '(로켓단은 아직\n끝난 게 아닌 것 같다...)');
      // 밧줄 풀어 주기
      A.se('se_unlock'); for (const c of [...caps, guy]) { c.rope?.remove(); c.rope = null; c.hop = 4; c.put(); setTimeout(() => { c.hop = 0; c.put(); }, 140); await wait(120); }
      await me1('(모두를 묶고 있던 밧줄을\n풀어 주었다!)');
      A.se('ME_FANFA5', 1);
      const spots = [[18, 9], [20, 9], [17, 9], [21, 9], [18, 10], [20, 10], [17, 10]];
      const run = [...caps].sort((a, b) => b.y - a.y).concat(guy);
      const left = [...spots]; for (const c of run) { const t = F.nearest(c, left); if (!t) { await c.gone(); continue; } left.splice(left.indexOf(t), 1); await F.goTo(c, t, 140); c.face(me); }
      await wait(400);
      me.turn('d'); await wait(300); A.music('hgAjito');
      await S.say('관장님... 정말 감사해요!\n분명 와 주실 거라고 믿고 있었어요!', { who: '안내원' });
      // 구한 사람들의 선물
      if (caps[0] && !A.has('c4gift1')) { await S.say('관장님, 저도 드릴 게 있어요!\n갇혀 있는 동안 몰래\n챙겨 둔 거예요.', { who: nm0(0) }); await A.got(S, { kinds: ['it'], cap: 5000 }, { key: 'c4gift1', giver: nm0(0) }); S.hide(true); }
      if (!A.has('c4gift2')) { await S.say('저도요!\n로켓단 창고에서 슬쩍 집어 온\n건데... 관장님 가지세요!', { who: '안내원' }); await A.got(S, { kinds: ['mint', 'deco'], cap: 2000 }, { key: 'c4gift2', giver: '안내원' }); S.hide(true); }
      // 금고: 람다가 뺏은 걸 넣어 두던 곳 → 금고에 말 걸면 관장 옆 포켓몬에게 부탁 (경완 2026-11-08 '창은 그것에 말 걸었을 때'). 다 되면 안내원에게 말 걸어 돌아감
      const SAFE = '아, 관장님! 저 금고...\n람다가 뭔가를 소중히\n넣어 두는 걸 봤어요!';
      if (!A.has('c4safe')) await S.say(SAFE, { who: '안내원' });
      await S.say('준비되면 저한테 말 걸어 주세요.\n다 같이 체육관으로 돌아가요!', { who: '안내원' }); S.hide(true);
      F.follow = true; await F.camMe(400);
      const safeLook = async () => { if (A.has('c4safe')) return me1('(텅 빈 금고다.)');
        await me1('(R 마크가 찍힌 튼튼한 금고다.\n...람다가 서두르다 제대로\n안 잠근 것 같다.)'); if (!(await ask('문이 너무 뻑뻑하다'))) return;
        await use(22, 8, async () => { A.se('DP_GASHIN', .9); safe.shake(); await wait(300); A.se('se_unlock'); safe.img(`${IM}ev/rocket/safe_o.png?${VA}`); });
        if (!F.pl) { A.se('se_unlock'); safe.img(`${IM}ev/rocket/safe_o.png?${VA}`); }
        await me1('(금고 문이 열렸다!\n안에 알이 하나 들어 있다...!)');
        await A.got(S, { k: 'egg', g: 3 }, { key: 'c4safe', from: '로켓단 금고' }); A.mark('c4safe'); S.hide(true); };
      if (A.has('c4safe')) safe.img(`${IM}ev/rocket/safe_o.png?${VA}`);
      for (;;) {
        const r3 = await F.play({
          can: ([x, y]) => !!(F.obAt(x, y) || lookText(LK4, null, x, y)),
          look: async ([x, y]) => { if (F.obAt(x, y)?.kind === 'safe') return safeLook(); const t = lookText(LK4, null, x, y); if (t) await me1(...[].concat(t)); },
          talk: async s2 => { if (s2 === guy) { if (!A.has('c4safe')) { await S.say(SAFE, { who: '안내원' }); }
              const y = await S.ask('체육관으로 돌아갈까요?', { who: '안내원' }, '돌아간다', '조금 더 있기'); S.hide(true); if (y) return 'home'; return; }
            const i = caps.indexOf(s2); await S.say(i >= 0 ? '관장님, 구해 주셔서\n정말 고마워요!' : '...', { who: i >= 0 ? nm0(i) : '' }); S.hide(true); },
          warp: async () => me1('(모두 함께 체육관으로 돌아가자.\n안내원에게 말 걸면 돼.)'),
        });
        if (r3 === 'quit') return 'stop';
        if (r3 === 'home') break;
      }
      F.lock(true); me.face?.(guy);
      if (caps[0]) await S.say('역시 우리 관장님!\n이제 체육관으로 돌아가요!', { who: nm0(0) });
      S.hide(true); S.end();
      await A.black(true, '모두를 데리고\n체육관으로 돌아왔다!', '', true);
      await F.close();
      // 체육관: 다 같이 문으로 들어와 제자리로
      A.tint(false); I.root.querySelectorAll('.ev-r,.ev-tint').forEach(x => x.remove()); I.clearEnts(); I.renderHome(true); I.dropPeople();
      const meE = A.npc(I.myOw(), D.door[0], D.door[1], 'u'); I.fitMe(meE);
      A.music('gym'); await A.black(false);
      A.se('DP_DOOR'); if (!await A.walkTo(meE, D.leader, 220)) { meE.x = D.leader[0]; meE.y = D.leader[1]; } A.turn(meE, 'd');
      const back = sfs.map(([s, x, y, f]) => [A.npc(s.ow, D.door[0], D.door[1], 'u'), x, y, f]);
      back.forEach(([e]) => { e.el.style.opacity = '0'; });
      const gE = A.npc(I.GUY_OW, D.door[0], D.door[1], 'u'); gE.el.style.opacity = '0';
      for (const [e, x, y, f] of [...back, [gE, D.guy[0], D.guy[1], 'd']]) { e.el.style.opacity = '1'; A.se('DP_DOOR', .6); await Promise.race([A.walkTo(e, [x, y], 200).then(ok => { if (!ok) { e.x = x; e.y = y; } A.turn(e, f || 'd'); }), wait(700)]); }
      await wait(900);
      const S2 = A.talk();
      await S2.say('체육관이 다시\n우리 손에 돌아왔어요!', { who: '안내원' });
      await S2.say('로켓단을 혼자서 물리친 관장님!\n이 소문이 퍼지면 도전자들이\n더 많이 몰려올 거예요!', { who: '안내원' });
      // 로켓단 제복: 변장할 때 입었던 걸 그대로 챙겨 와서 이벤트가 끝나면 내 것으로 (경완 2026-11-08)
      await S2.say('(그러고 보니 변장할 때 입었던\n로켓단 제복... 그대로 챙겨 왔네.)', { who: me0 });
      await S2.say('(또 쓸 일이 있을지도 몰라.\n잘 간직해 두자!)', { who: me0 });
      await S2.end();
      await A.reward();
    },
  ],
});
})();
