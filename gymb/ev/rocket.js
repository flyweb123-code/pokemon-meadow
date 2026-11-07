/* 체육관 이벤트: 로켓단의 체육관 점거 (2026-11-07 경완 '체육관 아이콘 들어가 보면 갑자기 로켓단이 점거한 내 체육관 모습이 스크롤되면서 연출 애니메이션으로 등장, 내 트레이너들을 다 납치해 간 스토리')
   1장 점거당한 체육관 → 2장 아지트를 찾아서(회색시티) → 3장 로켓단 아지트(지하 1층) → 4장 구출 작전(지하 4층, 간부 람다전) → 체육관으로 돌아와 보상.
   비주기는 로켓단 시리즈 마지막 이벤트에 (경완 2026-11-07). 맵은 pret/pokefirered PewterCity·RocketHideout_B1F·B4F, 막힌 칸은 map.bin 충돌 비트 */
(function () {
'use strict';
const GR = ['hg_rocket_m', 'hg_rocket_f'];   // 하트골드 로켓단 조무래기 (pret/pokeheartgold mmodel 173·174)
const B1F = ['############################','############################','############......##########','############......##########','##########..........########','##########..........########','##########..........########','##########..........########','#..........................#','#..........................#','#..........................#','###..#####.......#####...###','###..#####.......#####...###','#......####.....###........#','#......###.......##.######.#','#..###..###.....###.######.#','#..###..##.......##.######.#','##......###.....###........#','#.......##.......##........#','####################..######','####################..######','####################..######','#...............####..######','#...............####..######','#...######........##..######','#...######........##..######','#.................##.......#','#.................##.......#','#............###############','#...######...###############','#...######......############','#...............############','#.................##########','#.................##########'];
const B4F = ['########################','########################','#.#....#########.##.##.#','##.....#########..###..#','#.###..#########.#...#.#','#####.........###.....##','#.............##..###..#','#.............###.....##','#......##.....##.......#','#########.....##.......#','#########.....##.......#','###....##.....##.......#','#......##.....###..#####','#..###.##.....###..#####','#..###......####.....###','#...........####.....###','#...........####.......#','#.............##.......#','################.......#','################..######','###...............######','#.................######','#....######.......######','#....######.......######','#...........##.........#','#......................#'];
const IM = 'gym/img/', G = '로켓단 조무래기', B = '로켓단 간부 람다';
// 본가 맵 (tools/gym/frmap.py 로 뽑은 충돌·문·덮는 층): MAP('pewter') → { w, h, col, door }
const MAPJ = {}, MAP = n => MAPJ[n] || (MAPJ[n] = fetch(`${IM}ev/rocket/${n}.json?v=3`).then(r => r.json()));
const room = (n, m, warps) => ({ img: `${IM}ev/rocket/${n}.png?v=3`, over: `${IM}ev/rocket/${n}_o.png?v=3`, w: m.w, h: m.h, col: m.col, warps });
// 상대 팀: 내 라인업 평균 레벨(A.lv) 기준. 레벨 28 이상이면 진화한 모습 (꼬렛→레트라, 아보→아보크, 주뱃→골뱃, 또가스→또도가스, 나옹→페르시온, 질퍽이→질뻐기)
const POOL = [[19, 20], [23, 24], [41, 42], [109, 110], [52, 53], [88, 89]];
const mon = (i, lv) => [POOL[i][lv >= 28 ? 1 : 0], lv];
const gTeam = (A, n, add, seed) => { const L = A.lv() + add; return Array.from({ length: n }, (_, i) => mon((seed + i * 2) % POOL.length, Math.max(3, L + (i === n - 1 ? 1 : 0)))); };
const trOf = ow => ow === 'hg_rocket_f' ? 'hg_rocket_f' : 'hg_rocket_m';
// 조무래기 배틀 한 판: 나를 보면 '!' → 걸어와서 한마디 → 배틀 → 진 대사. 이기면 true
async function fight(A, F, S, s, o) {
  F.lock(true); A.music('hgEyeRoc'); F.bub(s, '!', 900); A.se('DP_REGI', .8); await A.wait(1000);
  if (F.sees(s) > 1) await F.come(s); else { s.face(F.me); F.me.face(s); }
  for (const t of s.lost ? ['또 왔냐?\n몇 번을 와도 똑같다고!'] : o.pre) await S.say(t, { who: o.who || G });
  S.hide(true);
  const won = await A.battle({ tr: o.tr || trOf(s.ow), cls: o.cls || '로켓단', nm: o.nm || '조무래기', team: o.team, tier: o.tier | 0, g: o.g || 0, say: o.say, music: 'hgVsRoc', win: o.win });
  if (!won) { A.music(o.song || 'hgAjito'); s.lost = true; await A.wait(300); await S.say(o.again || '(포켓몬들이 지쳐 버렸다...\n다시 말을 걸면 또 배틀할 수 있다.)', { who: A.me() }); S.hide(true); return false; }   // 지면 그 자리에서 다시 말 걸어 재도전 (경완 2026-11-07)
  A.music(o.song || 'hgAjito'); s.done = true; await A.wait(300);
  for (const t of o.post || []) await S.say(t, { who: o.who || G });
  S.hide(true); return true;
}
const ow = (A, F, k, x, y, f, o) => { const s = F.npc(k, x, y, f, o); s.ow = k; return s; };
GymEv.def({
  id: 'rocket', nm: '로켓단의 체육관 점거', sub: '로켓단이 내 체육관을 빼앗고 트레이너들을 데려갔다!',
  songs: ['hgEyeRoc', 'hgAjito', 'hgVsRoc', 'hgNibi'], imgs: ['pt/ow/hg_rocket_m', 'pt/ow/hg_rocket_f', 'pt/ow/hg_petrel', 'ev/rocket/crate', 'ev/rocket/machine', 'ev/rocket/pc'],
  reward: { g: 3000, rep: 30, fit: 'rocket', fitNm: '로켓단 제복' },
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
      A.bub(me, '!', 1000); A.se('DP_REGI', .8); await wait(1100);
      // 문에서 가까운 조무래기 둘이 다가온다
      const near = grunts.slice().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)).slice(0, 2);
      const FR0 = [[me.x, me.y - 1], [me.x - 1, me.y - 1], [me.x + 1, me.y - 1], [me.x - 1, me.y], [me.x + 1, me.y], [me.x, me.y - 2], [me.x - 1, me.y - 2], [me.x + 1, me.y - 2]], fr = [];
      for (const e of near) { const c = A.reach(e, FR0.filter(q => !fr.some(f => f && f[0] === q[0] && f[1] === q[1])), fr.filter(Boolean)); fr.push(c); }   // 서로 다른 칸, 걸어서 갈 수 있는 칸만
      near.forEach(e => A.bub(e, '!', 900)); A.se('DP_REGI', .8); await wait(1000);
      await Promise.all(near.map((e, i) => fr[i] ? A.walkTo(e, fr[i], 200, fr.filter((q, j) => q && j !== i)).then(() => { const dx = me.x - e.x, dy = me.y - e.y; A.turn(e, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : 'd'); }) : null));
      const S = A.talk(); const G = '로켓단 조무래기', B = '로켓단 간부 람다';
      await S.say('어? 이 녀석...\n이 체육관 관장이잖아!', { who: G });
      if (near[1]) await S.say('람다 님!\n관장이 돌아왔습니다!', { who: G });
      // 간부가 관장 자리에서 내려온다 (비주기는 로켓단 시리즈 마지막 이벤트에, 2026-11-07 경완)
      S.hide(true); await A.look(boss.y); await wait(300);
      A.bub(boss, '!', 900); A.se('DP_REGI', .8); await wait(1000);
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
    // 2장 · 아지트를 찾아서 (회색시티): 쫓겨난 체육관 앞 → 마을 사람 귀띔 → 수상한 집 앞 조무래기 → 비밀 계단
    async A => {
      const { I, wait } = A, me0 = A.me();
      A.blackNow();
      // 본가 회색시티 그대로: 건물마다 들어가기(문 열림·매트로 나오기), 지붕 뒤로 걷기, 턱 뛰어내리기 (경완 2026-11-07)
      const [PW, MT, CT, HS, MU] = await Promise.all(['pewter', 'mart', 'center', 'house', 'museum'].map(MAP));
      const mats = (xs, y, to, at) => xs.map(x => ({ x, y, d: 'd', mat: true, to, at }));
      const rooms = {
        mart: room('mart', MT, mats([3, 4, 5], 7, 'main', [28, 18, 'd'])),
        center: room('center', CT, mats([6, 7, 8], 8, 'main', [17, 25, 'd'])),
        house1: room('house', HS, mats([3, 4, 5], 7, 'main', [33, 11, 'd'])),
        house: room('house', HS, mats([3, 4, 5], 7, 'main', [9, 30, 'd'])),
        museum: room('museum', MU, [...mats([13, 14, 15], 9, 'main', [17, 6, 'd']), ...mats([21, 22], 9, 'main', [25, 4, 'd'])]),
      };
      let gr;
      const F = A.field({ nm: '회색시티', img: `${IM}ev/rocket/pewter.png?v=3`, over: `${IM}ev/rocket/pewter_o.png?v=3`, w: PW.w, h: PW.h, col: PW.col, door: PW.door, rooms,
        doorImg: Object.fromEntries(['pewter', 'sliding_single', 'sliding_double'].map(k => [k, `${IM}ev/rocket/door_${k}.png?v=3`])),
        warps: [{ x: 15, y: 16, d: 'u', id: 'gym' }, { x: 28, y: 18, d: 'u', to: 'mart', at: [4, 7, 'u'] }, { x: 17, y: 25, d: 'u', to: 'center', at: [7, 8, 'u'] }, { x: 33, y: 11, d: 'u', to: 'house1', at: [4, 7, 'u'] },
          { x: 17, y: 6, d: 'u', to: 'museum', at: [14, 9, 'u'] }, { x: 25, y: 4, d: 'u', to: 'museum', at: [22, 9, 'u'] },
          { x: 9, y: 30, d: 'u', to: 'house', at: [4, 7, 'u'], pre: async () => { if (gr.done) return true; await S.say('(문 앞을 로켓단이 막고 있다...)', { who: me0 }); S.hide(true); return false; } }] });
      const me = F.me = F.npc(I.myOw(), 15, 17, 'd'); I.fitMe(me);
      const lass = ow(A, F, 'lass', 8, 17, 'r'), man = ow(A, F, 'man', 29, 19, 'l'), old = ow(A, F, 'old_man_1', 21, 27, 'd'), boy = ow(A, F, 'boy', 33, 13, 'd');
      gr = ow(A, F, 'hg_rocket_m', 9, 31, 'd');   // 집 앞 조무래기: 말을 걸어야 시작 (시야 없음, 경완 2026-11-07)
      // 다른 마을로 가는 길은 로켓단이 막고 있다 (경완 2026-11-07 '말 걸면 뭐야 꺼져!!')
      const stop = [ow(A, F, 'hg_rocket_f', 21, 37, 'u'), ow(A, F, 'hg_rocket_m', 22, 37, 'u'), ow(A, F, 'hg_rocket_m', 45, 21, 'l'), ow(A, F, 'hg_rocket_f', 45, 22, 'l')];
      [[20, 37], [23, 37], [45, 20], [45, 23]].forEach(([x, y]) => F.block.add(x + ',' + y));
      stop.forEach(s => { s.stop = 1; s.say = ['뭐야, 꺼져!!', '이 길은 로켓단이 접수했다!\n아무도 못 지나가!']; s.say2 = ['꺼지라고 했지!!']; });
      lass.say = ['저 아래쪽 집이에요!\n문 앞에 검은 옷 입은 사람이\n지키고 서 있어요.'];
      man.say = ['로켓단이라니...\n아까부터 검은 옷 입은 사람들이\n마을을 어슬렁거리더라고.'];
      old.say = ['체육관이 털렸다고?\n허허, 이 조용한 마을에\n이게 무슨 날벼락인고...'];
      boy.say = ['관장님 체육관 문이\n안에서 잠겨 있어요!\n이상한 웃음소리도 났어요...'];
      // 건물 안 사람들 (본가 회색시티 자리 그대로)
      const R = (k, x, y, f, room, nm, say) => { const s = ow(A, F, k, x, y, f, { room }); s.nm = nm; s.say = say; return s; };
      R('clerk', 2, 3, 'r', 'mart', '점원', ['어서 오세요!\n...아, 관장님이시군요.', '로켓단 때문에 오늘은\n손님이 하나도 없네요...']);
      R('youngster', 8, 2, 'd', 'mart', '반바지 꼬마', ['검은 옷 사람들이\n물건을 잔뜩 집어 갔어요.\n돈은 한 푼도 안 내고요!']);
      R('boy', 6, 4, 'l', 'mart', '소년', ['로켓단이 체육관을\n차지했다면서요?\n관장님, 힘내세요!']);
      const nurse = R('nurse', 7, 2, 'd', 'center', '간호순', ['포켓몬 센터에 어서 오세요!']);
      R('gentleman', 4, 7, 'u', 'center', '신사', ['로켓단이 마을 길을\n다 막아 버렸어.\n이래서야 어디도 못 가겠군.']);
      R('youngster', 1, 2, 'd', 'center', '반바지 꼬마', ['로켓단 아지트가\n이 마을 어딘가에 있다는\n소문이 있어요... 설마요?']);
      R('gba_kid', 10, 7, 'u', 'center', '꼬마', ['밖에 로켓단이 무서워서\n여기서 게임만 하고 있어요.']);
      R('balding_man', 1, 2, 'd', 'house1', '아저씨', ['우리 집 앞에도 로켓단이\n서성거려서 밖에 나가질 못하겠어.']);
      R('little_boy', 5, 3, 'l', 'house1', '꼬마', ['관장님이다!\n로켓단 혼내 주세요!']);
      R('worker_m', 16, 5, 'l', 'museum', '박물관 직원', ['죄송해요, 오늘은 박물관 문을\n일찍 닫으려고 해요.', '로켓단이 화석을 노린다는\n소문이 있어서요...']);
      R('old_man_1', 2, 4, 'r', 'museum', '할아버지', ['로켓단 녀석들...\n옛날에도 여기 화석을\n훔치려 들었지.']);
      R('scientist', 26, 4, 'd', 'museum', '연구원', ['밖이 시끄러워서\n화석 연구가 손에 안 잡히네요...']);
      const hOld = R('old_man_1', 3, 3, 'd', 'house', '할아버지', ['흐익! 또 로켓단...\n아, 아니구먼. 관장님이시군!', '그 검은 옷 녀석들, 우리 집을\n제멋대로 드나들더니...', '저 구석 화분 쪽에서 덜컹 소리가 나고\n감쪽같이 사라지더라고!']);
      R('little_boy', 5, 3, 'd', 'house', '꼬마', ['아까 그 아저씨도\n화분 쪽으로 뛰어가더니\n없어져 버렸어요!']);
      F.cam(me.x, me.y); A.music('hgNibi'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      if (!A.retry) {
        await A.title('2장 · 아지트를 찾아서', '트레이너들을 구하러 가자!', 'CHAPTER 2');
        await S.say('(완전히 쫓겨나 버렸다...)', { who: me0 });
        await S.say('(트레이너들과 안내원을 구하려면\n로켓단 아지트부터 찾아야 해!)', { who: me0 }); S.hide(true);
        // 마을 아이가 달려와 귀띔한다
        F.bub(lass, '!', 900); A.se('DP_REGI', .8); await wait(900);
        await lass.go([[14, 17]], 160); lass.turn('r'); me.turn('l');
        await S.say('관장님! 괜찮으세요?\n체육관에서 쫓겨나시는 거 봤어요!', { who: '마을 아이' });
        await S.say('아까 검은 옷 입은 사람들이\n트레이너들을 끌고\n마을 아래쪽 집으로 들어갔어요!', { who: '마을 아이' });
        await S.say('그 집 앞에 아직 한 명이\n지키고 서 있어요. 조심하세요!', { who: '마을 아이' }); S.hide(true);
        await F.camTo(9, 30, 1300); await wait(500); F.bub(gr, '...', 1000); await wait(1100); await F.camMe(900);
      } else { lass.x = 14; lass.y = 17; lass.turn('r'); }
      lass.say = ['저 아래쪽 집이에요!\n조심하세요, 관장님!'];
      // 집 안 비밀 계단: 화분 둘 중 오른쪽 화분 밑 손잡이 (경완 2026-11-07 '집 안에서 비밀계단 찾는 것도, 텍스트로 퉁치지 말고')
      let stairs = null, gotHint = false;
      const POT = { '0,7': 0, '0,6': 0, '10,7': 1, '10,6': 1 };
      const LOOK = { house: { '2,1': '책이 빼곡히 꽂혀 있다.', '3,1': '책이 빼곡히 꽂혀 있다.', '0,1': '부엌이다. 설거지가 잔뜩 쌓여 있다.', '1,1': '부엌이다. 설거지가 잔뜩 쌓여 있다.', '5,1': '냉장고다. 텅 비어 있다...\n로켓단이 다 먹어 치운 것 같다.', '7,1': '창밖으로 회색시티가 보인다.', '9,1': '회색시티 근처 지도다.' } };
      const openStairs = async () => {
        F.lock(true); A.se('DP_GASHIN', .9); F.el.animate([{ translate: '0 0' }, { translate: '-6px 2px' }, { translate: '5px -2px' }, { translate: '-3px 1px' }, { translate: '0 0' }], { duration: 300 }); I.haptic?.(1); await wait(500);
        stairs = F.pic(`${IM}ev/rocket/stairs.png?v=3`, 9, 7); stairs.style.opacity = '0'; stairs.style.transition = 'opacity .5s'; void stairs.offsetWidth; stairs.style.opacity = '1'; A.se('DP_DOOR_OPEN', .8); await wait(600);
        F.rooms.house.warps.push({ x: 9, y: 7, id: 'stairs' });
        await S.say('(화분 옆 바닥이 열리면서\n지하로 내려가는 계단이 나타났다!)', { who: me0 }); S.hide(true);
      };
      for (;;) {
        const r = await F.play({
          talk: async s => {
            if (s === gr && !gr.done) return (await meetGr()) ? undefined : undefined;
            if (s.stop) { F.bub(s, '!', 700); A.se('DP_REGI', .6); await wait(500); for (const t of s.met ? s.say2 : s.say) await S.say(t, { who: G }); s.met = 1; S.hide(true); return; }
            if (s === nurse) { await S.say('포켓몬 센터에 어서 오세요!\n지친 포켓몬을 회복시켜 드릴게요.', { who: s.nm }); S.hide(true); A.se('DP_KAIFUKU', .8); await wait(1400); await S.say('기다리셨습니다!\n포켓몬들이 모두 건강해졌어요.', { who: s.nm }); await S.say('로켓단 조심하세요, 관장님!', { who: s.nm }); S.hide(true); return; }
            if (s === hOld) gotHint = true;
            for (const t of s.say || ['...']) await S.say(t, { who: s.nm || (s === lass ? '마을 아이' : '마을 사람') }); S.hide(true); },
          look: async ([x, y]) => { if (F.cur !== 'house') { const t = LOOK[F.cur]?.[x + ',' + y]; if (t) { await S.say(t, { who: me0 }); S.hide(true); } return; }
            const pot = POT[x + ',' + y];
            if (pot === 0) { await S.say('(평범한 화분이다.)', { who: me0 }); S.hide(true); return; }
            if (pot === 1) { if (stairs) { await S.say('(화분 옆으로 계단이 이어져 있다.)', { who: me0 }); S.hide(true); return; }
              await S.say('(화분 밑 바닥에\n작은 손잡이가 숨겨져 있다...!)', { who: me0 });
              const y2 = await F.ask('손잡이를 당겨 볼까?', '', '당긴다', '그만둔다'); S.hide(true); if (y2) await openStairs(); return; }
            const t = LOOK.house[x + ',' + y]; if (t) { await S.say(t, { who: me0 }); S.hide(true); } },
          warp: async w => { if (w.id === 'gym') { await S.say('(체육관 문이 안에서 굳게 잠겨 있다...)', { who: me0 }); S.hide(true); return; }
            if (w.id === 'stairs') return 'in'; },
          room: async id => { if (id === 'house' && !gotHint && !stairs) { await wait(300); await S.say('(집 안이 어질러져 있다...\n로켓단이 드나든 흔적이다.)', { who: me0 }); S.hide(true); } },
        });
        if (r === 'quit') return 'stop';
        if (r === 'lose') return A.lose();
        if (r === 'in') break;
      }
      async function meetGr() {
        const ok = await fight(A, F, S, gr, { pre: ['야, 거기 멈춰!\n이 집엔 아무것도 없다고!', '...응? 너 아까 그 관장이잖아!\n여기까지 냄새를 맡고 오다니!'], team: gTeam(A, 2, -2, 0), g: 300, song: 'hgNibi',
          say: { win: '이 정도로는\n안 비켜 준다고!', lose: '크윽...\n관장이라더니 제법이잖아!' },
          post: ['크윽... 아지트 입구를 들키다니!', '람다 님한테 알려야 해!\n관장이 온다고!'] });
        if (!ok) return false;
        // 조무래기가 문을 열고 집 안으로 도망간다
        if (Math.round(gr.x) !== 9 || Math.round(gr.y) !== 31) await F.goTo(gr, [9, 31]);
        gr.turn('u'); await F.door(9, 30, true); await gr.go([[9, 30]], 180); await gr.gone(); await F.door(9, 30, false); F.me.face({ x: 9, y: 30 });
        await S.say('(저 집이 아지트 입구구나...!\n따라 들어가 보자!)', { who: me0 }); S.hide(true); return true;
      }
      // 계단을 내려간다
      F.lock(true); await me.go([[9, 7]], 267); A.se('DP_DOOR', .7);
      S.end(); A.music(null);
      await A.black(true, '어두운 계단이\n땅속 깊이 이어져 있다...', '로켓단 아지트로 내려간다', true);
      await F.close();
    },
    // 3장 · 로켓단 아지트 (지하 1층): 조무래기들을 지나 엘리베이터로
    async A => {
      const { I, wait } = A, me0 = A.me();
      A.blackNow();
      const F = A.field({ nm: '로켓단 아지트 지하 1층', img: `${IM}ev/rocket/b1f.png?v=3`, over: `${IM}ev/rocket/b1f_o.png?v=3`, w: 28, h: 34, col: B1F,
        warps: [{ x: 12, y: 2, id: 'up' }, { x: 17, y: 2, id: 'no' }, { x: 15, y: 30, id: 'no' }, ...[23, 24, 25].map(x => ({ x, y: 25, d: 'u', id: 'lift' }))] });
      const me = F.me = F.npc(I.myOw(), 12, 3, 'd'); I.fitMe(me);
      const g1 = ow(A, F, 'hg_rocket_m', 4, 9, 'r', { sight: 5 }), g2 = ow(A, F, 'hg_rocket_f', 24, 12, 'l', { sight: 3 }), g3 = ow(A, F, 'hg_rocket_m', 24, 26, 'l', { sight: 4 });
      const GS = [
        [g1, { pre: ['침입자다!\n여긴 로켓단 아지트라고!'], team: gTeam(A, 2, -2, 1), g: 300, say: { win: '아지트는\n그렇게 만만한 데가 아니야!', lose: '말도 안 돼...!' }, post: ['젠장...\n이래서야 승진은 글렀군...'] }],
        [g2, { pre: ['어머, 체육관 관장님이\n직접 오셨네?', '트레이너들은 못 돌려줘!\n전부 람다 님 거라고!'], team: gTeam(A, 2, -1, 3), g: 300, say: { win: '호호,\n얌전히 돌아가시지!', lose: '어머머...!\n이렇게 셀 줄은!' }, post: ['흥! 람다 님은\n나처럼 만만하지 않을걸!'] }],
        [g3, { pre: ['멈춰라! 이 엘리베이터는\n관계자 외 출입 금지다!', '지하 4층 람다 님 방에는\n아무도 못 보낸다!'], team: gTeam(A, 3, -1, 4), g: 400, say: { win: '그러니까 말했잖아!\n출입 금지라고!', lose: '으윽...\n문지기 체면이...!' }, post: ['크윽... 람다 님,\n죄송합니다...!'] }],
      ];
      F.cam(me.x, me.y); A.music('hgAjito'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      if (!A.retry) {
        await A.title('3장 · 로켓단 아지트', '지하 깊은 곳 어딘가에...', 'CHAPTER 3');
        await S.say('(여기가 로켓단 아지트...!)', { who: me0 });
        await S.say('(트레이너들은 더 깊은 곳에\n갇혀 있을 거야.\n아래로 내려가는 길을 찾자!)', { who: me0 }); S.hide(true);
      }
      const meet = async s => { const o = GS.find(x => x[0] === s)?.[1]; if (!o) return true; const ok = await fight(A, F, S, s, o); if (ok && s === g3) { await g3.go([[25, 26], [26, 26]], 200); g3.turn('l'); } return ok; };
      for (;;) {
        const r = await F.play({
          step: async () => { const s = GS.map(x => x[0]).find(s => F.sees(s)); if (s) return (await meet(s)) ? undefined : undefined; },
          talk: async s => { if (!s.done) return (await meet(s)) ? undefined : undefined; await S.say('...', { who: G }); S.hide(true); },
          warp: async w => { if (w.id === 'lift') { if (!g3.done) return; A.se('DP_DOOR'); return 'lift'; }
            await S.say(w.id === 'up' ? '(위로 돌아갈 때가 아니야.\n트레이너들을 구해야 해!)' : '(계단이 막혀 있다...\n다른 길을 찾아보자.)', { who: me0 }); S.hide(true); },
        });
        if (r === 'quit') return 'stop';
        if (r === 'lose') return A.lose();
        if (r === 'lift') break;
      }
      S.end(); A.music(null);
      await A.black(true, '엘리베이터를 타고\n지하 4층으로 내려간다...', '람다가 있는 아지트 가장 깊은 곳', true);
      await F.close();
    },
    // 4장 · 구출 작전 (지하 4층): 문지기 둘 → 람다 방 → 람다전 → 트레이너 구출 → 체육관으로
    async A => {
      const { I, D, wait } = A, me0 = A.me(), sfs = I.sfList(), all = (I.st().sf || []);
      A.blackNow();
      const F = A.field({ nm: '로켓단 아지트 지하 4층', img: `${IM}ev/rocket/b4f.png?v=3`, over: `${IM}ev/rocket/b4f_o.png?v=3`, w: 24, h: 26, col: B4F, warps: [{ x: 20, y: 23, id: 'lift' }, { x: 21, y: 23, id: 'lift' }, { x: 11, y: 15, id: 'no' }] });
      const me = F.me = F.npc(I.myOw(), 20, 24, 'd'); I.fitMe(me);
      const k1 = ow(A, F, 'hg_rocket_m', 16, 14, 'r', { sight: 2 }), k2 = ow(A, F, 'hg_rocket_f', 19, 14, 'l', { sight: 2 });
      const boss = ow(A, F, 'hg_petrel', 19, 8, 'd');
      // 갇힌 트레이너들과 안내원 (람다 뒤 소파 방)
      const CAP = [[17, 7], [21, 7], [18, 5], [20, 5], [17, 5], [21, 5]];
      const caps = all.slice(0, CAP.length).map((s, i) => ow(A, F, s.ow, CAP[i][0], CAP[i][1], 'd'));
      const guy = ow(A, F, I.GUY_OW, 19, 5, 'd');
      const GS = [
        [k1, { pre: ['거기 서!\n이 앞은 람다 님 방이다!'], team: gTeam(A, 2, 0, 2), g: 400, say: { win: '람다 님 방엔\n한 발짝도 못 들어가!', lose: '이럴 수가...!' }, post: ['람다 님... 죄송합니다...'] }],
        [k2, { pre: ['어머, 여기까지 왔어?\n그래도 여기서 끝이야!'], team: gTeam(A, 2, 0, 5), g: 400, say: { win: '호호!\n여기가 네 한계야!', lose: '말도 안 돼...\n람다 님한테 혼나겠네...' }, post: ['흥... 람다 님은\n훨씬 무섭다고!'] }],
      ];
      F.cam(me.x, me.y); A.music('hgAjito'); await A.black(false); await F.show();
      const S = A.talk(); S.hide(true);
      if (!A.retry) {
        await A.title('4장 · 구출 작전', '모두를 데리고 돌아가자!', 'CHAPTER 4');
        await S.say('(이 층 어딘가에\n람다와 트레이너들이 있을 거야...!)', { who: me0 }); S.hide(true);
      }
      const meet = async s => { const o = GS.find(x => x[0] === s)?.[1]; return o ? fight(A, F, S, s, o) : true; };
      for (;;) {
        const r = await F.play({
          step: async ([x, y]) => { const s = GS.map(x => x[0]).find(s => F.sees(s)); if (s) return (await meet(s)) ? undefined : undefined;
            if (y <= 11 && x >= 16) return 'boss'; },
          talk: async s => { if (GS.some(x => x[0] === s) && !s.done) return (await meet(s)) ? undefined : undefined; if (s === boss) return 'boss'; await S.say('...', { who: G }); S.hide(true); },
          warp: async () => { await S.say('(트레이너들을 두고\n돌아갈 수는 없어!)', { who: me0 }); S.hide(true); },
        });
        if (r === 'quit') return 'stop';
        if (r === 'lose') return A.lose();
        if (r === 'boss') break;
      }
      // 람다 방
      F.lock(true); A.music('hgEyeRoc');
      const nm0 = (s, i) => I.sfName?.(all[i]) || '트레이너';
      caps.forEach(c => F.bub(c, '!', 900)); F.bub(guy, '!', 900); A.se('DP_REGI', .8);
      await F.camTo(19, 7, 800); await wait(600);
      await S.say('관장님!!\n구하러 와 주셨군요!', { who: '안내원' });
      if (caps.length) await S.say(`관장님! 저희 여기 있어요!\n${caps.length > 1 ? '다들 무사해요!' : '전 무사해요!'}`, { who: nm0(caps[0], 0) });
      S.hide(true); F.bub(boss, '!', 900); A.se('DP_REGI', .8); await wait(900);
      await S.say('우하하!\n결국 여기까지 왔구먼!', { who: B });
      S.hide(true); F.follow = false; await F.goTo(me, [19, 9]); me.turn('u'); await F.camTo(19, 8.5, 500);
      await S.say('부하들을 다 쓰러뜨리고 오다니,\n관장 자리가 괜히 있는 게\n아니었군.', { who: B });
      await S.say('하지만 여기서 끝이다!\n체육관도, 트레이너도,\n몰려오는 손님들의 포켓몬도...', { who: B });
      await S.say('전부 이 람다 님이\n잘 맡아 두겠다! 우하하!', { who: B }); S.hide(true);
      for (;;) {
      const won = await A.battle({ tr: 'hg_petrel', cls: '로켓단 간부', nm: '람다', tier: 2, g: 1000, music: 'hgVsRoc', win: 'winGym',
        team: [[A.lv() >= 28 ? 42 : 41, A.lv()], [A.lv() >= 28 ? 20 : 19, A.lv()], [A.lv() >= 28 ? 24 : 23, A.lv() + 1], [A.lv() >= 30 ? 110 : 109, A.lv() + 3]],
        say: { win: '우하하!\n관장도 별거 아니구먼!', lose: '이, 이럴 수가...!\n이 람다 님이 지다니!' } });
      if (won) break;
      // 졌다: 람다 앞에서 다시 말 걸면 재도전 (경완 2026-11-07)
      A.music('hgAjito'); await wait(300); await S.say('우하하! 아직도 덤빌 셈인가?\n언제든 다시 와 보시지!', { who: B });
      await S.say('(포켓몬들이 지쳐 버렸다...\n다시 말을 걸면 또 배틀할 수 있다.)', { who: me0 }); S.hide(true); F.camMe(400);
      const r2 = await F.play({ talk: async s2 => { if (s2 === boss) return 'boss'; await S.say('관장님, 힘내세요!', { who: s2 === guy ? '안내원' : '트레이너' }); S.hide(true); }, warp: async () => { await S.say('(트레이너들을 두고\n돌아갈 수는 없어!)', { who: me0 }); S.hide(true); } });
      if (r2 === 'quit') return 'stop';
      F.lock(true); A.music('hgEyeRoc'); me.face(boss); await S.say('좋다, 다시 한번\n혼쭐을 내 주마!', { who: B }); S.hide(true);
      }
      A.music('hgAjito'); await wait(300);
      await S.say('크윽...! 체육관 하나 털다가\n이게 무슨 꼴이람!', { who: B });
      await S.say('흥, 체육관이랑 트레이너들은\n돌려주마!', { who: B });
      await S.say('하지만 기억해 둬라...\n로켓단은 이걸로 끝이 아니다!\n언젠가 그분께서...!', { who: B }); S.hide(true);
      // 람다가 연막을 뿌리고 사라진다
      A.se('DP_KON', 1); A.shake?.(); F.el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.4)' }, { filter: 'brightness(1)' }], { duration: 500 }); await boss.gone(); await wait(400);
      await S.say('(람다가 연막을 뿌리고\n도망쳐 버렸다...!)', { who: me0 }); S.hide(true);
      // 갇혀 있던 사람들이 달려 나온다
      A.music(null); A.se('ME_FANFA5', 1);
      const spots = [[18, 9], [20, 9], [17, 9], [21, 9], [18, 10], [20, 10], [17, 10]];
      const run = [...caps].sort((a, b) => b.y - a.y).concat(guy);
      for (const [i, c] of run.entries()) { const t = spots[i]; if (!t) { await c.gone(); continue; } await F.goTo(c, t, 140); c.face(me); }
      await wait(400);
      me.turn('d'); await wait(300);
      await S.say('관장님... 정말 감사해요!\n분명 와 주실 거라고 믿고 있었어요!', { who: '안내원' });
      if (caps[0]) await S.say('역시 우리 관장님!\n이제 체육관으로 돌아가요!', { who: nm0(caps[0], 0) });
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
