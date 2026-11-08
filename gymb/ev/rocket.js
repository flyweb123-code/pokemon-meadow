/* 체육관 이벤트: 로켓단의 체육관 점거 (2026-11-07 경완 '체육관 아이콘 들어가 보면 갑자기 로켓단이 점거한 내 체육관 모습이 스크롤되면서 연출 애니메이션으로 등장, 내 트레이너들을 다 납치해 간 스토리')
   v19.18 경완 2026-11-08 '배틀을 최소화하고 찾는 재미': 관장 옆 포켓몬이 따라다니며 기술로 장애물을 치우고 숨은 것을 킁킁, 알·상점 물건 줍기, 마을 사람 부탁·선물. 배틀은 람다 한 판(+들켰을 때·이스터에그)
   1장 점거당한 체육관 → 2장 아지트를 찾아서(돌담시티, 본가 회색시티 맵에 가상의 이름) → 3장 로켓단 아지트(지하 1층) → 4장 구출 작전(지하 4층, 간부 람다전) → 체육관으로 돌아와 보상.
   비주기는 로켓단 시리즈 마지막 이벤트에 (경완 2026-11-07). 맵은 pret/pokefirered PewterCity·RocketHideout_B1F·B4F, 막힌 칸은 map.bin 충돌 비트 */
(function () {
'use strict';
const GR = ['hg_rocket_m', 'hg_rocket_f'];   // 하트골드 로켓단 조무래기 (pret/pokeheartgold mmodel 173·174)
const B1F = ['############################','############################','############......##########','############......##########','##########..........########','##########..........########','##########..........########','##########..........########','#..........................#','#..........................#','#..........................#','###..#####.......#####...###','###..#####.......#####...###','#......####.....###........#','#......###.......##.######.#','#..###..###.....###.######.#','#..###..##.......##.######.#','##......###.....###........#','#.......##.......##........#','####################..######','####################..######','####################..######','#...............####..######','#...............####..######','#...######........##..######','#...######........##..######','#.................##.......#','#.................##.......#','#............###############','#...######...###############','#...######......############','#...............############','#.................##########','#.................##########'];
const B4F = ['########################','########################','#.#....#########.##.##.#','##.....#########..###..#','#.###..#########.#...#.#','#####.........###.....##','#.............##..###..#','#.............###.....##','#......##.....##.......#','#########.....##.......#','#########.....##.......#','###....##.....##.......#','#......##.....###..#####','#..###.##.....###..#####','#..###......####.....###','#...........####.....###','#...........####.......#','#.............##.......#','################.......#','################..######','###...............######','#.................######','#....######.......######','#....######.......######','#...........##.........#','#......................#'];
const IM = 'gym/img/', G = '로켓단 조무래기', B = '로켓단 간부 람다';
// 본가 맵 (tools/gym/frmap.py 로 뽑은 충돌·문·덮는 층): MAP('pewter') → { w, h, col, door }
const MAPJ = {}, MAP = n => MAPJ[n] || (MAPJ[n] = fetch(`${IM}ev/rocket/${n}.json?v=4`).then(r => r.json()));
const room = (n, m, warps) => ({ img: `${IM}ev/rocket/${n}.png?v=3`, over: `${IM}ev/rocket/${n}_o.png?v=3`, w: m.w, h: m.h, col: m.col, warps,
  block: new Set(Object.keys(m.door || {}).filter(k => !warps.some(w => w.x + ',' + w.y === k))) });   // 갈 곳 없는 문 칸(냉장고처럼 생긴 뒷문 등)은 막음
// 상대 팀: 내 라인업 평균 레벨(A.lv) 기준. 레벨 28 이상이면 진화한 모습 (꼬렛→레트라, 아보→아보크, 주뱃→골뱃, 또가스→또도가스, 나옹→페르시온, 질퍽이→질뻐기)
const POOL = [[19, 20], [23, 24], [41, 42], [109, 110], [52, 53], [88, 89]];
const mon = (i, lv) => [POOL[i][lv >= 28 ? 1 : 0], lv];
const gTeam = (A, n, add, seed) => { const L = A.lv() + add; return Array.from({ length: n }, (_, i) => mon((seed + i * 2) % POOL.length, Math.max(3, L + (i === n - 1 ? 1 : 0)))); };
const trOf = ow => ow === 'hg_rocket_f' ? 'hg_rocket_f' : 'hg_rocket_m';
// 조무래기 배틀 한 판: 나를 보면 '!' → 걸어와서 한마디 → 배틀 → 진 대사. 이기면 true
// 배틀에서 이기고 필드로 돌아오면: 상처약 소리와 함께 포켓몬이 모두 기운을 되찾음
async function healFx(A, F) { A.se('se_use_item'); await A.wait(500); }   // 본가 상처약 쓸 때 소리(SE_USE_ITEM), 말풍선 없이 (경완 2026-11-07)
async function fight(A, F, S, s, o) {
  // 지친 채로는 다시 못 싸움: 돌담시티에선 포켓몬 센터에서 회복하고 와야 한다 (경완 2026-11-07)
  if (A.tired) { s.face(F.me); await S.say('(포켓몬들이 지쳐 있다...\n먼저 포켓몬 센터에 가서 회복시키자.)', { who: A.me() }); S.hide(true); return false; }
  F.lock(true); A.music('hgEyeRoc'); F.bub(s, '!', 900); A.se('se_pin'); await A.wait(1000);
  if (F.sees(s) > 1) await F.come(s); else { s.face(F.me); F.me.face(s); }
  for (const t of s.lost ? ['또 왔냐?\n몇 번을 와도 똑같다고!'] : o.pre) await S.say(t, { who: o.who || G });
  S.hide(true);
  const won = await A.battle({ tr: o.tr || trOf(s.ow), cls: o.cls || '로켓단', nm: o.nm || '조무래기', team: o.team, tier: o.tier | 0, g: o.g || 0, say: o.say, music: 'hgVsRoc', win: o.win });
  if (!won) { A.music(o.song || 'hgAjito'); s.lost = true; await A.wait(300); await S.say('(포켓몬들이 지쳐 버렸다...\n포켓몬 센터에 가서 회복시키자.)', { who: A.me() }); S.hide(true);
    if (A.center) A.tired = true;   // 돌담시티: 직접 센터까지 걸어가서 간호순에게
    else { await A.black(true, '서둘러 돌담시티 포켓몬 센터에\n다녀왔다...', '포켓몬들이 기운을 되찾았다!', true); await A.black(false); }   // 아지트엔 센터가 없어 다녀온 걸로
    return false; }   // 지면 그 자리에서 다시 말 걸어 재도전 (경완 2026-11-07)
  A.music(o.song || 'hgAjito'); s.done = true; await A.wait(300); await healFx(A, F);   // 이기고 돌아오면 회복 소리와 함께 다 회복 (경완 2026-11-07)
  for (const t of o.post || []) await S.say(t, { who: o.who || G });
  S.hide(true); return true;
}
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
const ow = (A, F, k, x, y, f, o) => { const s = F.npc(k, x, y, f, o); s.ow = k; return s; };
const VA = 'v=19.18';   // v19.18 새 그림(몬스터볼·바위·모자·금고) 캐시
// 길막 로켓단마다 대사가 다르고, 말을 걸 때마다 달라진다. 끝까지 말 걸면 짜증 나서 배틀 (이스터에그, 경완 2026-11-07)
const STOP = [
  { lines: ['뭐야, 꺼져!!', '안 들려? 꺼지라고!', '여긴 로켓단이 접수한 길이야.\n돌아가!', '...너 할 일 없니?', '나도 여기 서 있기 싫거든?\n다리 아파 죽겠는데...', '말 걸지 말라니까!\n집중이 안 되잖아!', '...한 번만 더 말 걸면\n가만 안 둔다?'],
    pre: ['좋아, 그렇게 원한다면!\n상대해 주지!!'], post: ['어, 어떻게 이렇게 세?!\n...그래도 길은 못 비켜 줘!'], beaten: ['...제발 저리 가.\n오늘 운수가 안 좋네.', '다리도 아프고 지기까지 하고...'] },
  { lines: ['뭐야, 꺼져!!', '이 길은 상관 명령으로\n아무도 못 지나가!', '옆에 있는 애한테 물어봐.\n...아니, 걔한테도 묻지 마!', '점심도 못 먹고 서 있는 중이라고...\n건드리지 마.', '너, 내 포켓몬 보고 싶어서 그러지?\n안 보여 줘!', '...진짜 끈질기네.', '마지막 경고다!\n한 번만 더 말 걸면 배틀이다!'],
    pre: ['참을 만큼 참았다!\n덤벼라!!'], post: ['말도 안 돼...\n점심도 못 먹었는데 지기까지...'], beaten: ['배고파...\n말 시키지 마...', '...빵 있으면 하나만 줄래?'] },
  { lines: ['뭐야, 꺼져!!', '3번 도로는 지금 통행금지다!\n로켓단 허락 없인 못 지나가!', '허락? 물론 안 해 주지!', '돌담시티 관장이 쫓겨났다며?\n...잠깐, 너구나?', '관장이면 관장답게\n체육관이나 지키지 그랬어? 크크', '아, 그건 우리가 뺏었지. 크크크', '...웃는 거 그만둘 테니까\n제발 저리 가 줄래?'],
    pre: ['안 되겠다! 실력으로\n쫓아 보내 주마!!'], post: ['크윽... 관장은 관장이군.\n그래도 이 길은 못 비켜!'], beaten: ['...아까 웃은 거 미안하다.', '체육관은 꼭 되찾아라.\n...이건 비밀이다?'] },
  { lines: ['뭐야, 꺼져!!', '여기서부턴 로켓단 구역이야.\n얼른 돌아가!', '...아직도 있어?', '있잖아, 우리도 일이라서\n어쩔 수 없거든?', '람다 님한테 혼나는 건\n나라고!', '아 진짜! 몇 번째야!', '...좋아, 하나만 알려 줄게.\n우리 아지트는 마을 아래쪽 집에...', '...아니, 없어! 아무것도 없어!'],
    pre: ['말실수했잖아... 너 때문이야!\n배틀로 기억을 지워 주마!!'], post: ['말도 안 돼...\n오늘 일진 최악이야...'], beaten: ['아무것도 못 들은 거다?\n알았지?', '...람다 님한텐 비밀이야.'] },
];
GymEv.def({
  id: 'rocket', nm: '로켓단의 체육관 점거', sub: '로켓단이 내 체육관을 빼앗고 트레이너들을 데려갔다!',
  songs: ['hgEyeRoc', 'hgAjito', 'hgVsRoc', 'hgNibi'], imgs: ['pt/ow/hg_rocket_m', 'pt/ow/hg_rocket_f', 'pt/ow/hg_petrel', 'ev/rocket/crate', 'ev/rocket/machine', 'ev/rocket/pc', 'ev/rocket/ball', 'ev/rocket/rock', 'ev/rocket/hat', 'ev/rocket/safe'],
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
    //   마을 사람 부탁 셋(관장 옆 포켓몬 기술로 해결 → 선물 + 아지트 단서), 숨은 알·물건, 빈집 앞 조무래기는 암호로 통과(배틀 없음), 화분 밑 비밀 계단
    async A => {
      const { I, wait, anim } = A, me0 = A.me();
      A.blackNow();
      const [PW, MT, CT, HS, MU] = await Promise.all(['pewter', 'mart', 'center', 'house', 'museum'].map(MAP));
      const mats = (xs, y, to, at) => xs.map(x => ({ x, y, d: 'd', mat: true, to, at }));
      const rooms = {
        mart: room('mart', MT, mats([3, 4, 5], 7, 'main', [28, 18, 'd'])),
        center: room('center', CT, [...mats([6, 7, 8], 8, 'main', [17, 25, 'd']), { x: 1, y: 6, id: 'up2' }, { x: 11, y: 1, id: 'shut' }]),
        house1: room('house', HS, mats([3, 4, 5], 7, 'main', [33, 11, 'd'])),
        house: room('house', HS, mats([3, 4, 5], 7, 'main', [9, 30, 'd'])),
        museum: room('museum', MU, [...mats([13, 14, 15], 9, 'main', [17, 6, 'd']), ...mats([21, 22], 9, 'main', [25, 4, 'd']), { x: 8, y: 8, id: 'up2' }]),
      };
      let gr;
      A.center = true;
      const F = A.field({ nm: '돌담시티', img: `${IM}ev/rocket/pewter.png?v=3`, over: `${IM}ev/rocket/pewter_o.png?v=3`, w: PW.w, h: PW.h, col: PW.col, door: PW.door, rooms,
        doorImg: Object.fromEntries(['pewter', 'sliding_single', 'sliding_double'].map(k => [k, `${IM}ev/rocket/door_${k}.png?v=3`])),
        warps: [{ x: 15, y: 16, d: 'u', id: 'gym' }, { x: 28, y: 18, d: 'u', to: 'mart', at: [4, 7, 'u'] }, { x: 17, y: 25, d: 'u', to: 'center', at: [7, 8, 'u'] }, { x: 33, y: 11, d: 'u', to: 'house1', at: [4, 7, 'u'] },
          { x: 17, y: 6, d: 'u', to: 'museum', at: [14, 9, 'u'] }, { x: 25, y: 4, d: 'u', to: 'museum', at: [21, 9, 'u'] },
          { x: 9, y: 30, d: 'u', to: 'house', at: [4, 7, 'u'], pre: async () => { if (gr.done) return true; await S.say('(문 앞을 로켓단이 막고 있다...)', { who: me0 }); S.hide(true); return false; } }] });
      const me = F.me = F.npc(I.myOw(), 15, 17, 'd'); I.fitMe(me);
      const lass = ow(A, F, 'lass', 8, 17, 'r'), man = ow(A, F, 'man', 29, 19, 'l'), boy = ow(A, F, 'boy', 33, 13, 'd');
      const old = ow(A, F, 'old_man_1', 9, 8, 'l'), kong = ow(A, F, `${IM}ev/rocket/ow_little_boy.png?v=3`, 32, 18, 'l', { fw: 16 });
      gr = ow(A, F, 'hg_rocket_m', 9, 31, 'd');   // 빈집 앞 조무래기: 암호를 대면 비켜 줌
      if (A.has('gr')) { gr.x = 10; gr.y = 31; gr.turn('l'); gr.done = true; gr.put(); }
      // 다른 마을로 가는 길은 로켓단이 막고 있다 (경완 2026-11-07 '말 걸면 뭐야 꺼져!!'). 끝까지 말 걸면 짜증 나서 배틀 (이스터에그)
      const stop = [ow(A, F, 'hg_rocket_f', 21, 37, 'u'), ow(A, F, 'hg_rocket_m', 22, 37, 'u'), ow(A, F, 'hg_rocket_m', 45, 21, 'l'), ow(A, F, 'hg_rocket_f', 45, 22, 'l')];
      [[20, 37], [23, 37], [45, 20], [45, 23]].forEach(([x, y]) => F.block.add(x + ',' + y));
      stop.forEach((s, i) => { s.stop = STOP[i]; s.n = 0; });
      const stopTalk = async s => { const o = s.stop;
        if (s.done) { await S.say(o.beaten[s.n++ % o.beaten.length], { who: G }); S.hide(true); return; }
        if (!s.lost && s.n < o.lines.length) { if (!s.n) { F.bub(s, '!', 700); A.se('se_pin'); await wait(500); } await S.say(o.lines[s.n++], { who: G }); S.hide(true); return; }
        await fight(A, F, S, s, { pre: o.pre, team: gTeam(A, 2, -1, stop.indexOf(s) + 1), g: 200, song: 'hgNibi', say: { win: '흥! 이제 좀\n저리 가라!', lose: '으아악!\n괜히 건드렸다...!' }, post: o.post }); if (s.done) s.n = 0; };
      lass.nm = '소녀 다솜'; man.nm = '아저씨 만복'; old.nm = '할아버지 돌쇠'; boy.nm = '소년 준이'; kong.nm = '꼬마 콩이';
      [man, boy].forEach(s => F.wander(s, 2));
      lass.say = ['마을 사람들한테 물어보세요!\n분명 누군가 봤을 거예요.'];
      man.say = ['마트 점원 미소 씨가\n아까부터 울상이던데.\n로켓단이 뭘 했나 봐.'];
      boy.say = ['콩이가 모자를 잃어버려서\n마트 옆 나무 밑에서 울고 있어요!'];
      const R = (k, x, y, f, room, nm, say, wr) => { const s = ow(A, F, k, x, y, f, { room, fw: /\//.test(k) ? 16 : 0 }); s.nm = nm; s.say = say; if (wr) F.wander(s, wr); return s; };
      const miso = R('clerk', 2, 3, 'r', 'mart', '점원 미소', []);
      R('youngster', 7, 2, 'd', 'mart', '반바지 꼬마 태호', ['검은 옷 사람들이\n물건을 잔뜩 사 갔어요.\n상자는 통로에 버려두고요!']);
      R('boy', 6, 4, 'l', 'mart', '소년 민재', ['로켓단이 체육관을\n차지했다면서요?\n관장님, 힘내세요!'], 1);
      const nurse = R('nurse', 7, 2, 'd', 'center', '간호순', ['포켓몬 센터에 어서 오세요!']);
      R('gentleman', 4, 7, 'u', 'center', '신사 고상해', ['로켓단이 마을 길을\n다 막아 버렸어.\n이래서야 어디도 못 가겠군.'], 1);
      R('youngster', 1, 2, 'd', 'center', '반바지 꼬마 동구', ['저기 PC 로 같이 다닐 포켓몬을\n바꿀 수 있대요!'], 1);
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
      // 숨은 것·떨어진 것 (한 번 주우면 이 장을 다시 해도 안 나옴)
      const ball = (key, x, y, it, room) => { if (A.has(key)) return; const b = F.obst(BALL, x, y, { kind: 'ball', room }); b.key = key; b.it = it; };
      const hide = (key, x, y, it, room) => { if (!A.has(key)) F.hide(x, y, { key, it, room: room || 'main' }); };
      hide('c2e1', 5, 3, { k: 'egg', g: 2 }); ball('c2b1', 10, 5, { kinds: ['mint'] });   // 돌쇠 정원 안
      hide('c2e2', 28, 27, { k: 'egg', g: 1 });   // 꽃밭
      hide('c2h1', 38, 34, { kinds: ['it'], cap: 3500 });   // 남쪽 풀밭
      F.hide(10, 7, { room: 'house', key: 'pot' });   // 화분 밑 계단 (킁킁만)
      F.cam(me.x, me.y); A.music('hgNibi'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      const P = await F.palOn(I.pal()), PN = P?.nm || '포켓몬', iga = w => I.jong(w) ? '이' : '가';
      if (!A.retry) {
        await A.title('2장 · 아지트를 찾아서', '트레이너들을 구하러 가자!', 'CHAPTER 2');
        await S.say('(완전히 쫓겨나 버렸다...)', { who: me0 });
        await S.say('(트레이너들과 안내원을 구하려면\n로켓단 아지트부터 찾아야 해!)', { who: me0 }); S.hide(true);
        if (P) { await F.palHi(); await S.say(`(${PN}도 같이 가 주겠대!)`, { who: me0 }); await S.say(`(${PN}${iga(PN)} 킁킁거리면\n근처에 뭔가 숨어 있다는 뜻이야.)`, { who: me0 }); S.hide(true); }
        F.bub(lass, '!', 900); A.se('se_pin'); await wait(900);
        await F.approach(lass, me, 160);
        await S.say('관장님! 괜찮으세요?\n체육관에서 쫓겨나시는 거 봤어요!', { who: lass.nm });
        await S.say('검은 옷 입은 사람들이\n트레이너들을 끌고\n어디론가 가 버렸어요.', { who: lass.nm });
        await S.say('어디로 갔는지는 못 봤는데...\n마을 사람들한테 물어보면\n누군가 봤을지도 몰라요!', { who: lass.nm }); S.hide(true);
      }
      const lassGo = () => { if (lass.on) { lass.on = false; lass.el.hidden = true; } };
      if (A.retry) lassGo();
      const me1 = (...L) => (async () => { for (const t of L) await S.say(t, { who: me0 }); S.hide(true); })();
      // 부탁 하나: 말 → 포켓몬에게 부탁할까? → 기술 → 고마움·선물·단서
      const ask = async q => { if (!P) return true; const y = await F.ask(q, '', '부탁한다', '그만둔다'); S.hide(true); return y; };
      const use = async (tx, ty, hit) => { if (P) { await S.say(`${PN}의 ${F.move()[0]}!`, { who: me0 }); S.hide(true); } await F.palAct(tx, ty, hit); };
      const dirTo = (a, b) => { const dx = b[0] - Math.round(a.x), dy = b[1] - Math.round(a.y); return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); };
      const kongTalk = async () => { const W = kong.nm;
        if (A.has('kong')) { await S.say('모자 찾아 줘서 고마워요!\n이제 안 잃어버릴 거예요!', { who: W }); S.hide(true); return; }
        await S.say('흑흑... 바람에 모자가 날아가서\n나무 꼭대기에 걸렸어요...', { who: W });
        await S.say('너무 높아서 손이 안 닿아요...', { who: W }); S.hide(true);
        if (!(await ask(`${PN}에게 나무를 흔들어 달라고 할까?`))) return;
        await use(31, 17, async () => { A.shake(); for (let i = 0; i < 3; i++) { hat.animate([{ translate: '0 0' }, { translate: '-3px 0' }, { translate: '3px 0' }, { translate: '0 0' }], { duration: 160 }); await wait(160); }
          const t0 = parseFloat(hat.style.top), x0 = parseFloat(hat.style.left), K = F.k; await anim(520, q => { hat.style.top = t0 + (2.6 * 16 * K) * q * q + 'px'; hat.style.left = x0 + 1.1 * 16 * K * q + 'px'; hat.style.rotate = 200 * q + 'deg'; }); hat.remove(); });
        await me1('(모자가 떨어졌다!)');
        kong.face(me); A.se('DP_PIRORIRO');
        await S.say('와아! 제 모자다!\n고마워요, 관장님!', { who: W });
        await S.say('이거, 아까 길에서 주운 건데\n관장님 가지세요!', { who: W });
        await A.got(S, { kinds: ['it'], cap: 3500 }, { key: 'kong', giver: W });
        await S.say('아 참! 모자 찾다가 봤는데요,\n검은 옷 아저씨들이 트레이너들을\n데리고 마을 남쪽으로 갔어요!', { who: W }); S.hide(true);
        await me1('(마을 남쪽...!)'); };
      const dolTalk = async () => { const W = old.nm;
        if (A.has('dol')) { await S.say('정원에 떨어진 건\n뭐든 가져가게. 허허.', { who: W }); S.hide(true); return; }
        await S.say('아이고, 관장 양반!\n어젯밤 검은 옷 녀석들이 바위를 잔뜩\n싣고 가다가 여기 쏟아 놓고 갔다네.', { who: W });
        await S.say('우리 집 정원에 들어갈 수가 없어\n아주 곤란하구먼...', { who: W }); S.hide(true);
        if (!(await ask(`${PN}에게 바위를 치워 달라고 할까?`))) return;
        for (const b of rocks) await use(b.x, b.y, async () => { A.se('DP_GASHIN', .8); b.shake(); await wait(200); await b.clear('break'); });
        await me1('(바위가 부서졌다!)');
        old.face(me);
        await S.say('허허, 대단한 포켓몬이구먼!\n정원에 떨어진 건 뭐든 가져가게.', { who: W });
        await S.say('그러고 보니 그 녀석들...\n밤마다 마을 남쪽 빈집에\n들락날락하더구먼.', { who: W });
        await S.say('그 집은 오래전에 비었는데\n불빛이 새어 나오더란 말이지.', { who: W }); S.hide(true);
        A.mark('dol'); await me1('(남쪽 빈집...!)'); };
      const misoTalk = async () => { const W = miso.nm;
        if (A.has('miso')) { await S.say('로켓단 조심하세요, 관장님!\n그 사람들, 서로 "우하하!"\n하고 인사하더라고요.', { who: W }); S.hide(true); return; }
        await S.say('어서 오세요...\n아, 관장님! 마침 잘 오셨어요.', { who: W });
        await S.say('아까 검은 옷 손님들이 물건을 잔뜩\n사 가면서 상자를 통로에\n쌓아 두고 갔어요.', { who: W });
        await S.say('너무 무거워서 안쪽 선반 물건을\n꺼낼 수가 없어요...', { who: W }); S.hide(true);
        if (!(await ask(`${PN}에게 상자를 치워 달라고 할까?`))) return;
        for (const b of crates) await use(b.x, b.y, async () => { A.se('DP_KON', .9); await b.clear('push', F.pl ? dirTo(F.pl, [b.x, b.y]) : 'd'); });
        await me1('(통로가 뻥 뚫렸다!)');
        miso.face(me); A.se('DP_PIRORIRO');
        await S.say('와, 고마워요!\n이제 장사할 수 있겠어요!', { who: W });
        await S.say('이건 감사의 표시예요.\n체육관에 장식해 주세요!', { who: W });
        await A.got(S, { kinds: ['deco'], cap: 1500 }, { key: 'miso', giver: W });
        await S.say('아, 그러고 보니 그 손님들...\n계산하면서 서로\n"우하하!" 하고 인사하더라고요.', { who: W });
        await S.say('무슨 암호 같은 걸까요?', { who: W }); S.hide(true);
        A.mark('pw'); await me1('(우하하...\n람다가 웃던 소리랑 똑같다!)'); };
      const grTalk = async () => {
        if (gr.done) { await S.say('...뭘 봐?\n얼른 들어가라니까.', { who: G }); S.hide(true); return; }
        if (!A.has('pw')) { await S.say(gr.ag ? '...암호도 모르는 녀석은\n못 들어간다고!' : '뭐야? 여긴 그냥 빈집이야.\n볼일 없으면 저리 가!', { who: G }); gr.ag = 1; S.hide(true); if (A.has('dol') || A.has('kong')) await me1('(이 집이 수상한데...\n들어갈 방법을 찾아보자.)'); return; }
        await S.say('...멈춰.\n들어가려면 암호를 대라.', { who: G });
        const i = await S.choose(['우하하!', '로켓단 만세!', '안녕하세요!']); S.hide(true);
        if (i !== 0) { await S.say('틀렸다!\n수상한 녀석이군... 저리 가!', { who: G }); S.hide(true); return; }
        await S.say('...좋아, 들어가라.', { who: G }); S.hide(true);
        await gr.go([[10, 31]], 220); gr.turn('l'); gr.done = true; A.mark('gr');
        await S.say('...응? 방금 그거\n체육관 관장 아니었나...?', { who: G }); S.hide(true); };
      const palSwap = async () => { const L = (I.luAll?.() || []).slice(0, 6);
        if (L.length < 2) { await me1('(같이 다닐 포켓몬을 바꾸는 PC 다.\n지금 라인업엔 다른 포켓몬이 없다.)'); return; }
        await S.say('(PC 로 같이 다닐 포켓몬을\n바꿀 수 있다.)', { who: me0 });
        const i = await S.choose([...L.map(Q => `${I.monNm(Q)}${F.pl?.P?.id === Q.id ? ' (지금)' : ''}`), '그만둔다']); S.hide(true);
        const Q = L[i]; if (!Q || F.pl?.P?.id === Q.id) return; I.setPal(Q.id); A.se('se_exit'); await F.palOn(Q); await F.palHi(); await me1(`(${I.monNm(Q)}${iga(I.monNm(Q))} 같이 가 준다!)`); };
      // 줍기: 몬스터볼(보이는 것) 또는 숨은 것
      const pick = async (x, y) => { const b = F.obAt(x, y);
        if (b?.kind === 'ball') { A.se('DP_SELECT'); await b.clear('out'); await A.got(S, b.it, { key: b.key }); S.hide(true); return true; }
        const h = F.hidAt(x, y); if (h?.it) { h.got = true; await S.say(h.sn && P ? `(${PN}${iga(PN)} 킁킁거리던 곳이다...\n앗, 뭔가 숨겨져 있다!)` : '(앗, 뭔가 숨겨져 있다!)', { who: me0 }); await A.got(S, h.it, { key: h.key }); S.hide(true); return true; }
        return false; };
      let stairs = null;
      const POT = { '0,7': 0, '0,6': 0, '10,7': 1, '10,6': 1 };
      const LK = { main: PW.look, mart: MT.look, center: CT.look, house1: HS.look, house: HS.look, museum: MU.look };
      const LOOK = {
        main: { '19,7': '돌담 과학 박물관\n"오래된 화석과 우주의 돌을\n만나 보세요!"', '11,16': [`돌담시티 포켓몬 체육관\n관장: ${me0}`, '...그 위에 누가\n"로켓단 접수!" 라고 낙서해 놓았다.'],
          '39,19': '경찰의 알림\n"검은 옷에 R 마크를 단 수상한 무리를\n보면 바로 신고해 주세요!"', '20,30': '트레이너 팁!\n"포켓몬이 지치면\n포켓몬 센터에서 쉬게 해 주자!"', '31,25': '돌담시티\n"단단한 돌담처럼 변함없는 마을"' },
        museum: { '4,4': '프테라 화석이다.\n하늘을 나는 아주 옛날 포켓몬이라고 한다.', '4,7': '투구푸스 화석이다.\n바닷속에 살던 아주 옛날 포켓몬이라고 한다.', '26,1': '포켓몬 잡지다.\n"이달의 관장 인터뷰!"... 내 얼굴이 실려 있다.', '27,1': '포켓몬 잡지다.\n"이달의 관장 인터뷰!"... 내 얼굴이 실려 있다.' },
        house: { '2,1': '먼지 쌓인 찬장이다.', '3,1': '먼지 쌓인 찬장이다.', '0,1': '부엌이다. 컵라면 그릇이\n잔뜩 쌓여 있다...', '1,1': '부엌이다. 컵라면 그릇이\n잔뜩 쌓여 있다...', '5,1': 'TV 다. 꺼져 있다.', '7,1': '창밖으로 돌담시티가 보인다.', '9,1': '돌담시티 근처 지도다.\n누가 빨간 펜으로 동그라미를 쳐 놓았다.', '10,1': '돌담시티 근처 지도다.\n누가 빨간 펜으로 동그라미를 쳐 놓았다.' } };
      const openStairs = async () => {
        F.lock(true); A.se('DP_GASHIN', .9); F.el.animate([{ translate: '0 0' }, { translate: '-6px 2px' }, { translate: '5px -2px' }, { translate: '-3px 1px' }, { translate: '0 0' }], { duration: 300 }); I.haptic?.(1); await wait(500);
        stairs = F.pic(`${IM}ev/rocket/stairs.png?v=3`, 9, 7); stairs.style.opacity = '0'; stairs.style.transition = 'opacity .5s'; void stairs.offsetWidth; stairs.style.opacity = '1'; A.se('se_unlock'); await wait(600);
        F.rooms.house.warps.push({ x: 9, y: 7, id: 'stairs' }); F.hid.forEach(h => { if (h.key === 'pot') h.got = true; });
        await S.say('(화분 옆 바닥이 열리면서\n지하로 내려가는 계단이 나타났다!)', { who: me0 }); S.hide(true);
      };
      for (;;) {
        const r = await F.play({
          talk: async s => {
            if (s === gr) return grTalk();
            if (s.stop) return stopTalk(s);
            if (s === kong) return kongTalk();
            if (s === old) return dolTalk();
            if (s === miso) return misoTalk();
            if (s === nurse) { A.tired = false; await S.say('포켓몬 센터에 어서 오세요!\n지친 포켓몬을 회복시켜 드릴게요.', { who: s.nm }); S.hide(true); await A.fan('mus_rg_heal'); await S.say('기다리셨습니다!\n포켓몬들이 모두 건강해졌어요.', { who: s.nm }); await S.say('로켓단 조심하세요, 관장님!', { who: s.nm }); S.hide(true); return; }
            for (const t of s.say || ['...']) await S.say(t, { who: s.nm || '마을 사람' }); S.hide(true); },
          step: async () => { if (lass.on && F.cur === 'main' && (Math.abs(lass.x - me.x) > 7 || Math.abs(lass.y - me.y) > 10)) lassGo(); },
          look: async ([x, y]) => { if (await pick(x, y)) return;
            if (F.cur === 'center' && LK.center?.[x + ',' + y] === 'pc') return palSwap();
            if (F.cur !== 'house') { const t = lookText(LK[F.cur], LOOK[F.cur], x, y); if (t) await me1(...[].concat(t)); return; }
            const pot = POT[x + ',' + y];
            if (pot === 0) return me1('(평범한 화분이다.)');
            if (pot === 1) { if (stairs) return me1('(화분 옆으로 계단이 이어져 있다.)');
              await me1('(화분 밑에서 찬 바람이\n솔솔 새어 나온다...!)');
              if (P) { if (!(await ask(`${PN}에게 화분 밑을 살펴 달라고 할까?`))) return; await F.palAct(10, 7, async () => { A.se('DP_KON', .8); }); await me1(`(${PN}${iga(PN)} 화분 밑에 숨겨진\n손잡이를 찾아냈다!)`); }
              const y2 = await F.ask('손잡이를 당겨 볼까?', '', '당긴다', '그만둔다'); S.hide(true); if (y2) await openStairs(); return; }
            const t = lookText(LK.house, LOOK.house, x, y); if (t) await me1(...[].concat(t)); },
          warp: async w => { if (w.id === 'gym') return me1('(체육관 문이 안에서 굳게 잠겨 있다...)');
            if (w.id === 'stairs') return 'in';
            if (w.id === 'up2' || w.id === 'shut') return me1(w.id === 'up2' ? '(2층은 로켓단 소동 때문에\n지금 막아 두었다고 한다.)' : '(문이 잠겨 있다.)'); },
          room: async id => { lassGo(); if (id === 'house' && !stairs) { await wait(300); await me1('(아무도 살지 않는 빈집이다...\n그런데 바닥에 발자국이 잔뜩 찍혀 있다.)'); } },
        });
        if (r === 'quit') return 'stop';
        if (r === 'lose') return A.lose();
        if (r === 'in') break;
      }
      F.lock(true); await me.go([[9, 7]], 267); A.se('se_exit');
      S.end(); A.music(null);
      await A.black(true, '어두운 계단이\n땅속 깊이 이어져 있다...', '로켓단 아지트로 내려간다', true);
      await F.close();
    },
    // 3장 · 로켓단 아지트 (지하 1층) — v19.18 '찾는 재미': 조무래기 시야를 피해 다니기(들키면 배틀), R 상자 더미 치우고 줍기, 멈춘 발전기를 포켓몬 기술로 돌려 엘리베이터
    async A => {
      const { I, wait } = A, me0 = A.me();
      A.blackNow();
      const LK1 = (await MAP('b1f')).look;
      const F = A.field({ nm: '로켓단 아지트 지하 1층', img: `${IM}ev/rocket/b1f.png?v=3`, over: `${IM}ev/rocket/b1f_o.png?v=3`, w: 28, h: 34, col: B1F,
        warps: [{ x: 12, y: 2, id: 'up' }, { x: 17, y: 2, id: 'no' }, { x: 15, y: 30, id: 'no' }, ...[23, 24, 25].map(x => ({ x, y: 25, d: 'u', id: 'lift' }))] });
      const me = F.me = F.npc(I.myOw(), 12, 3, 'd'); I.fitMe(me);
      // 문지기 없이 둘만: 왼쪽 복도를 보는 조무래기, 오른쪽 방 입구에서 왼쪽·아래를 번갈아 보는 조무래기 (본가 도는 트레이너)
      const g1 = ow(A, F, 'hg_rocket_m', 4, 9, 'r', { sight: 5 }), g2 = ow(A, F, 'hg_rocket_f', 24, 12, 'l', { sight: 3, spin: ['l', 'd'] });
      const GS = [
        [g1, { again: ['흥, 한 번 이겼다고\n우쭐대지 마라!', '아지트가 넓다고 길 잃지 마라.\n...아, 내가 왜 걱정을 해 주지?', '엘리베이터?\n발전기가 멈춰서 안 움직일걸. 크크'], pre: ['침입자다!\n여긴 로켓단 아지트라고!'], team: gTeam(A, 2, -2, 1), g: 300, say: { win: '아지트는\n그렇게 만만한 데가 아니야!', lose: '말도 안 돼...!' }, post: ['젠장...\n이래서야 승진은 글렀군...'] }],
        [g2, { again: ['흥! 다시 말 걸지 마!\n아직 화났거든?', '람다 님은 지하 4층에서\n뺏은 포켓몬 세느라 바쁘셔.', '...관장님 포켓몬, 좀 귀엽던데.\n아니, 아무것도 아니야!'], pre: ['어머, 체육관 관장님이\n직접 오셨네?', '트레이너들은 못 돌려줘!\n전부 람다 님 거라고!'], team: gTeam(A, 2, -1, 3), g: 300, say: { win: '호호,\n얌전히 돌아가시지!', lose: '어머머...!\n이렇게 셀 줄은!' }, post: ['흥! 람다 님은\n나처럼 만만하지 않을걸!'] }],
      ];
      const CR = `${IM}ev/rocket/crate.png?v=3`, BALL = `${IM}ev/rocket/ball.png?${VA}`;
      const pile = A.has('c3pile') ? [] : [F.obst(CR, 3, 12, { h: 32, kind: 'crate' }), F.obst(CR, 4, 12, { h: 32, kind: 'crate' })];   // 왼쪽 방 입구를 막은 R 상자 더미
      const box = A.has('c3x1') ? null : F.obst(CR, 26, 9, { h: 32, kind: 'rbox' });   // 복도 끝 R 상자 하나 (안에 물건)
      const gen = F.obst(`${IM}ev/rocket/machine.png?v=3`, 24, 27, { w: 48, h: 40, span: 3, kind: 'gen' });   // 엘리베이터 발전기
      const ball = (key, x, y, it) => { if (A.has(key)) return; const b = F.obst(BALL, x, y, { kind: 'ball' }); b.key = key; b.it = it; };
      const hide = (key, x, y, it) => { if (!A.has(key)) F.hide(x, y, { key, it }); };
      ball('c3b1', 6, 17, { kinds: ['it'], cap: 4000 }); hide('c3e1', 1, 18, { k: 'egg', g: 2 });   // 왼쪽 방 안
      hide('c3h1', 16, 16, { kinds: ['mint'] });   // 가운데 방 화분 속
      F.cam(me.x, me.y); A.music('hgAjito'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      const P = await F.palOn(I.pal()), PN = P?.nm || '포켓몬', iga = w => I.jong(w) ? '이' : '가';
      const me1 = (...L) => (async () => { for (const t of L) await S.say(t, { who: me0 }); S.hide(true); })();
      if (!A.retry) {
        await A.title('3장 · 로켓단 아지트', '지하 깊은 곳 어딘가에...', 'CHAPTER 3');
        await me1('(여기가 로켓단 아지트...!)', '(조무래기들 눈에 띄지 않게\n조심조심 지나가자.\n아래로 내려가는 길을 찾아야 해!)');
      }
      const ask = async q => { if (!P) return true; const y = await F.ask(q, '', '부탁한다', '그만둔다'); S.hide(true); return y; };
      const use = async (tx, ty, hit) => { if (P) { await S.say(`${PN}의 ${F.move()[0]}!`, { who: me0 }); S.hide(true); } await F.palAct(tx, ty, hit); };
      const dirTo = (a, b) => { const dx = b[0] - Math.round(a.x), dy = b[1] - Math.round(a.y); return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); };
      const meet1 = async s => { const o = GS.find(x => x[0] === s)?.[1]; if (!o) return true; return fight(A, F, S, s, o); };
      const meet = s => chain(F, GS, s, meet1);
      const pick = async (x, y) => { const b = F.obAt(x, y);
        if (b?.kind === 'ball') { A.se('DP_SELECT'); await b.clear('out'); await A.got(S, b.it, { key: b.key }); S.hide(true); return true; }
        const h = F.hidAt(x, y); if (h?.it) { h.got = true; await S.say(h.sn && P ? `(${PN}${iga(PN)} 킁킁거리던 곳이다...\n앗, 뭔가 숨겨져 있다!)` : '(앗, 뭔가 숨겨져 있다!)', { who: me0 }); await A.got(S, h.it, { key: h.key }); S.hide(true); return true; }
        if (b?.kind === 'crate') { await me1('(R 마크가 찍힌 상자가\n잔뜩 쌓여 방 입구를 막고 있다.)'); if (!(await ask(`${PN}에게 상자를 치워 달라고 할까?`))) return true;
          for (const c of pile) await use(c.x, c.y, async () => { A.se('DP_KON', .9); await c.clear('push', F.pl ? dirTo(F.pl, [c.x, c.y]) : 'd'); });
          A.mark('c3pile'); await me1('(방으로 들어가는 길이 열렸다!)'); return true; }
        if (b?.kind === 'rbox') { await me1('(R 마크가 찍힌 상자다.\n뚜껑이 단단히 못질되어 있다...)'); if (!(await ask(`${PN}에게 상자를 열어 달라고 할까?`))) return true;
          await use(b.x, b.y, async () => { A.se('DP_GASHIN', .8); b.shake(); await wait(250); await b.clear('out'); });
          await me1('(상자가 부서지면서\n안에서 뭔가 굴러 나왔다!)'); await A.got(S, { kinds: ['it', 'mint'], cap: 4000 }, { key: 'c3x1' }); S.hide(true); return true; }
        if (b?.kind === 'gen') { if (A.has('c3pow')) return me1('(발전기가 웅웅 힘차게 돌고 있다.)');
          await me1('(엘리베이터에 전기를 대는\n커다란 발전기다.\n...멈춰 있다.)'); if (!(await ask(`${PN}에게 발전기를 돌려 달라고 할까?`))) return true;
          const el = I.ty?.() === 13; await use(b.x, b.y, async () => { for (let i = 0; i < (el ? 1 : 3); i++) { b.shake(); A.se(el ? 'DP_W085' : 'DP_KON', .7); await wait(360); } });
          A.se('se_escalator'); b.shake(); A.mark('c3pow');
          await me1(el ? `(${PN}의 전기가 발전기에\n가득 들어갔다!)` : `(${PN}${iga(PN)} 발전기를 힘껏 돌렸다!\n...웅웅, 발전기가 돌기 시작했다!)`, '(이제 엘리베이터가 움직일 거야!)'); return true; }
        return false; };
      // 도는 조무래기: 2초마다 방향을 바꾸고, 바꾼 쪽에 내가 있으면 바로 다가온다
      let spinT = performance.now() + 1800;
      for (;;) {
        const r = await F.play({
          tick: () => { const t = performance.now(); if (t < spinT) return; spinT = t + 1800; for (const s of GS.map(x => x[0])) if (s.spin && !s.done && s.on) { s.turn(s.spin[(s.spin.indexOf(s.f) + 1) % s.spin.length]); if (F.sees(s)) return () => meet(s).then(() => undefined); } },
          step: async () => { const s = GS.map(x => x[0]).find(s => F.sees(s)); if (s) return (await meet(s)) ? undefined : undefined; },
          talk: async s => { if (!s.done) return (await meet(s)) ? undefined : undefined; await againSay(S, s, GS.find(x => x[0] === s)?.[1]); },
          look: async ([x, y]) => { if (await pick(x, y)) return; const t = lookText(LK1, null, x, y); if (t) await me1(...[].concat(t)); },
          warp: async w => { if (w.id === 'lift') { if (!A.has('c3pow')) return me1('(엘리베이터 단추를 눌러도\n아무 반응이 없다...)', '(전기가 끊겨 있는 것 같다.\n근처에 발전기가 있을 거야.)'); A.se('se_exit'); return 'lift'; }
            return me1(w.id === 'up' ? '(위로 돌아갈 때가 아니야.\n트레이너들을 구해야 해!)' : '(계단이 막혀 있다...\n다른 길을 찾아보자.)'); },
        });
        if (r === 'quit') return 'stop';
        if (r === 'lose') return A.lose();
        if (r === 'lift') break;
      }
      S.end(); A.music(null);
      await A.black(true, '엘리베이터를 타고\n지하 4층으로 내려간다...', '람다가 있는 아지트 가장 깊은 곳', true);
      await F.close();
    },
    // 4장 · 구출 작전 (지하 4층) — v19.18: 문지기는 나를 보면 도망가고, 배틀은 람다 한 판. 이기면 금고(레어 알)·구한 사람들 선물
    async A => {
      const { I, D, wait } = A, me0 = A.me(), sfs = I.sfList(), all = (I.st().sf || []);
      A.blackNow();
      const LK4 = (await MAP('b4f')).look;
      const F = A.field({ nm: '로켓단 아지트 지하 4층', img: `${IM}ev/rocket/b4f.png?v=3`, over: `${IM}ev/rocket/b4f_o.png?v=3`, w: 24, h: 26, col: B4F, warps: [{ x: 20, y: 23, id: 'lift' }, { x: 21, y: 23, id: 'lift' }, { x: 11, y: 15, id: 'no' }] });
      const me = F.me = F.npc(I.myOw(), 20, 24, 'd'); I.fitMe(me);
      const k1 = ow(A, F, 'hg_rocket_m', 16, 14, 'r', { sight: 3 }), k2 = ow(A, F, 'hg_rocket_f', 19, 14, 'l', { sight: 3 });
      const boss = ow(A, F, 'hg_petrel', 19, 8, 'd');
      const CAP = [[17, 7], [21, 7], [18, 5], [20, 5], [17, 5], [21, 5]];
      const caps = all.slice(0, CAP.length).map((s, i) => ow(A, F, s.ow, CAP[i][0], CAP[i][1], 'd'));
      const guy = ow(A, F, I.GUY_OW, 19, 5, 'd');
      const safe = F.obst(`${IM}ev/rocket/safe.png?${VA}`, 22, 8, { h: 24, kind: 'safe' });
      F.cam(me.x, me.y); A.music('hgAjito'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      const P = await F.palOn(I.pal()), PN = P?.nm || '포켓몬', iga = w => I.jong(w) ? '이' : '가';
      const me1 = (...L) => (async () => { for (const t of L) await S.say(t, { who: me0 }); S.hide(true); })();
      if (!A.retry) {
        await A.title('4장 · 구출 작전', '모두를 데리고 돌아가자!', 'CHAPTER 4');
        await me1('(이 층 어딘가에\n람다와 트레이너들이 있을 거야...!)');
      }
      // 문지기 둘: 나를 보면 겁먹고 람다 방으로 달아난다 (배틀 없음)
      let fled = false;
      const flee = async () => { if (fled) return; fled = true; F.lock(true); [k1, k2].forEach(k => { k.face(me); F.bub(k, '!', 900); }); A.se('se_pin'); await wait(1000);
        await S.say('히익! 체육관 관장이다!\n부하들이 다 당했다더니...!', { who: G });
        await S.say('람다 님께 알려야 해!\n도망쳐!!', { who: G }); S.hide(true);
        await Promise.all([k1, k2].map(async k => { await F.goTo(k, [k === k1 ? 17 : 18, 11], 130); await k.gone(); }));
        await me1('(문지기들이 안쪽으로\n도망쳐 버렸다...!)'); };
      for (;;) {
        const r = await F.play({
          step: async ([x, y]) => { if (!fled && (F.sees(k1) || F.sees(k2))) { await flee(); return; } if (y <= 11 && x >= 16) return 'boss'; },
          talk: async s => { if (s === k1 || s === k2) return flee(); if (s === boss) return 'boss'; },
          look: async ([x, y]) => { if (F.obAt(x, y)?.kind === 'safe') return me1('(튼튼해 보이는 금고다.\nR 마크가 찍혀 있다...)'); const t = lookText(LK4, null, x, y); if (t) await me1(...[].concat(t)); },
          warp: async () => me1('(트레이너들을 두고\n돌아갈 수는 없어!)'),
        });
        if (r === 'quit') return 'stop';
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
      await S.say('부하들이 벌벌 떨며 도망쳐 오더니...\n관장 자리가 괜히 있는 게\n아니었군.', { who: B });
      await S.say('하지만 여기서 끝이다!\n체육관도, 트레이너도,\n몰려오는 손님들의 포켓몬도...', { who: B });
      await S.say('전부 이 람다 님이\n잘 맡아 두겠다! 우하하!', { who: B }); S.hide(true);
      for (;;) {
        const won = await A.battle({ tr: 'hg_petrel', cls: '로켓단 간부', nm: '람다', tier: 2, g: 1000, music: 'hgVsRoc', win: 'winGym',
          team: [[A.lv() >= 28 ? 42 : 41, A.lv()], [A.lv() >= 28 ? 20 : 19, A.lv()], [A.lv() >= 28 ? 24 : 23, A.lv() + 1], [A.lv() >= 30 ? 110 : 109, A.lv() + 3]],
          say: { win: '우하하!\n관장도 별거 아니구먼!', lose: '이, 이럴 수가...!\n이 람다 님이 지다니!' } });
        if (won) break;
        A.music('hgAjito'); await wait(300); await S.say('우하하! 아직도 덤빌 셈인가?\n언제든 다시 와 보시지!', { who: B });
        await me1('(포켓몬들이 지쳐 버렸다...\n포켓몬 센터에 가서 회복시키자.)');
        await A.black(true, '서둘러 돌담시티 포켓몬 센터에\n다녀왔다...', '포켓몬들이 기운을 되찾았다!', true); await A.black(false); F.camMe(400);
        const r2 = await F.play({ talk: async s2 => { if (s2 === boss) return 'boss'; await S.say('관장님, 힘내세요!', { who: s2 === guy ? '안내원' : '트레이너' }); S.hide(true); }, warp: async () => me1('(트레이너들을 두고\n돌아갈 수는 없어!)') });
        if (r2 === 'quit') return 'stop';
        F.lock(true); A.music('hgEyeRoc'); me.face(boss); await S.say('좋다, 다시 한번\n혼쭐을 내 주마!', { who: B }); S.hide(true);
      }
      A.music('hgAjito'); await wait(300);
      await S.say('크윽...! 체육관 하나 털다가\n이게 무슨 꼴이람!', { who: B });
      await S.say('흥, 체육관이랑 트레이너들은\n돌려주마!', { who: B });
      await S.say('하지만 기억해 둬라...\n로켓단은 이걸로 끝이 아니다!\n언젠가 그분께서...!', { who: B }); S.hide(true);
      A.se('DP_KON', 1); A.shake?.(); F.el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.4)' }, { filter: 'brightness(1)' }], { duration: 500 }); await boss.gone(); await wait(400);
      await me1('(람다가 연막을 뿌리고\n도망쳐 버렸다...!)');
      A.music(null); A.se('ME_FANFA5', 1);
      const spots = [[18, 9], [20, 9], [17, 9], [21, 9], [18, 10], [20, 10], [17, 10]];
      const run = [...caps].sort((a, b) => b.y - a.y).concat(guy);
      const left = [...spots]; for (const c of run) { const t = F.nearest(c, left); if (!t) { await c.gone(); continue; } left.splice(left.indexOf(t), 1); await F.goTo(c, t, 140); c.face(me); }
      await wait(400);
      me.turn('d'); await wait(300); A.music('hgAjito');
      await S.say('관장님... 정말 감사해요!\n분명 와 주실 거라고 믿고 있었어요!', { who: '안내원' });
      // 금고: 람다가 뺏은 걸 넣어 두던 곳 → 관장 옆 포켓몬 기술로 열면 레어 알
      await S.say('아, 관장님! 저 금고...\n람다가 뭔가를 소중히\n넣어 두는 걸 봤어요!', { who: '안내원' }); S.hide(true);
      F.follow = true; await F.goTo(me, [21, 8]); me.turn('r'); await F.camMe(400);
      if (!A.has('c4safe')) {
        if (P) { await S.say(`${PN}의 ${F.move()[0]}!`, { who: me0 }); S.hide(true); }
        await F.palAct(22, 8, async () => { A.se('DP_GASHIN', .9); safe.shake(); await wait(300); A.se('se_unlock'); safe.img(`${IM}ev/rocket/safe_o.png?${VA}`); });
        await me1('(금고 문이 열렸다!\n안에 알이 하나 들어 있다...!)');
        await A.got(S, { k: 'egg', g: 3 }, { key: 'c4safe', from: '로켓단 금고' }); S.hide(true);
      }
      // 구한 사람들의 선물
      me.turn('d'); await wait(200);
      if (caps[0] && !A.has('c4gift1')) { await S.say('관장님, 저도 드릴 게 있어요!\n갇혀 있는 동안 몰래\n챙겨 둔 거예요.', { who: nm0(0) }); await A.got(S, { kinds: ['it'], cap: 5000 }, { key: 'c4gift1', giver: nm0(0) }); S.hide(true); }
      if (!A.has('c4gift2')) { await S.say('저도요!\n로켓단 창고에서 슬쩍 집어 온\n건데... 관장님 가지세요!', { who: '안내원' }); await A.got(S, { kinds: ['mint', 'deco'], cap: 2000 }, { key: 'c4gift2', giver: '안내원' }); S.hide(true); }
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
      await S2.say('그리고 이거...\n아지트에서 몰래 챙겨 온 건데요,\n관장님이 가지세요!', { who: '안내원' });
      await S2.end();
      await A.reward();
    },
  ],
});
})();
