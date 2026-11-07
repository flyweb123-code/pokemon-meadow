/* 체육관 이벤트: 로켓단의 체육관 점거 (2026-11-07 경완 '체육관 아이콘 들어가 보면 갑자기 로켓단이 점거한 내 체육관 모습이 스크롤되면서 연출 애니메이션으로 등장, 내 트레이너들을 다 납치해 간 스토리')
   1장 점거당한 체육관 → 2장 아지트를 찾아서 (만드는 중) → 3장 구출과 람다전 (만드는 중). 비주기는 로켓단 시리즈 마지막 이벤트에 */
(function () {
'use strict';
const GR = ['hg_rocket_m', 'hg_rocket_f'];   // 하트골드 로켓단 조무래기 (pret/pokeheartgold mmodel 173·174)
GymEv.def({
  id: 'rocket', nm: '로켓단의 체육관 점거', sub: '로켓단이 내 체육관을 빼앗고 트레이너들을 데려갔다!',
  songs: ['hgEyeRoc', 'hgAjito', 'hgVsRoc'], imgs: ['pt/ow/hg_rocket_m', 'pt/ow/hg_rocket_f', 'pt/ow/hg_petrel', 'ev/rocket/crate', 'ev/rocket/machine', 'ev/rocket/pc'],
  reward: { g: 3000, rep: 30, fit: 'rocket' },
  ch: [
    // 1장 · 점거당한 체육관
    async A => {
      const { I, D, wait } = A, sfs = I.sfList(), nSf = (I.st().sf || []).length;   // 훈련장에 있던 트레이너까지 모두 납치
      // 무대: 내 트레이너·안내원·나는 없고, 트레이너 자리엔 조무래기, 관장 자리엔 간부 람다, 바닥엔 R 상자·깃발
      I.clearEnts(); I.renderHome(true);
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
      for (const [k, n, sd] of [['machine', 1, 3], ['pc', 1, 5], ['crate', 3, 11]]) { const [w] = await A.size(k); let s = sd;
        for (let c = 0; c < n; c++) { const C = ft.filter(([x, y]) => fits(x, y, w)); if (!C.length) break; s = (s * 9301 + 49297) % 233280; const [x, y] = C[Math.floor(s / 233280 * C.length)];
          await A.prop(k, x, y); for (let i = 0; i < w; i++) { const j = ft.findIndex(q => q[0] === x + i && q[1] === y); if (j >= 0) ft.splice(j, 1); } } }
      pick(2, 7).forEach(([x, y]) => { if (!lane(x)) A.rProp(x, y); });
      const fl = [[D.leader[0] - 1, D.leader[1]], [D.leader[0] + 1, D.leader[1]]].filter(([x, y]) => D.free?.[y]?.[x] === '1');
      fl.forEach(([x, y]) => A.rProp(x, y, 'flag'));
      // 연출: 어두워지며 로켓단 곡, 맵을 위에서 아래로 훑는다
      await wait(900);   // 출근 로딩 화면이 걷히고 나서
      A.tint(true); A.music('hgEyeRoc');
      const tt = A.title('로켓단의 습격', '내 체육관이 이상하다...?');
      await A.pan(5600); await tt;
      // 내가 문으로 들어온다
      const me = A.npc(I.myOw(), D.door[0], D.door[1], 'u'); I.fitMe(me);
      A.se('DP_DOOR'); await wait(300);
      await I.walk(me, [[D.door[0], D.door[1] - 1]]); await wait(300);
      A.bub(me, '!', 1000); A.se('DP_REGI', .8); await wait(1100);
      // 문에서 가까운 조무래기 둘이 다가온다
      const near = grunts.slice().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)).slice(0, 2);
      const fr = [[me.x, me.y - 1], [me.x - 1, me.y - 1], [me.x + 1, me.y - 1]].filter(([x, y]) => D.free?.[y]?.[x] === '1');
      near.forEach(e => A.bub(e, '!', 900)); A.se('DP_REGI', .8); await wait(1000);
      await Promise.all(near.map((e, i) => fr[i] ? A.walkTo(e, fr[i], 200).then(() => A.turn(e, 'd')) : null));
      const S = A.talk(); const G = '로켓단 조무래기', B = '로켓단 간부 람다';
      await S.say('어? 이 녀석...\n이 체육관 관장이잖아!', { who: G });
      if (near[1]) await S.say('람다 님!\n관장이 돌아왔습니다!', { who: G });
      // 간부가 관장 자리에서 내려온다 (비주기는 로켓단 시리즈 마지막 이벤트에, 2026-11-07 경완)
      S.hide(true); await A.look(boss.y); await wait(300);
      A.bub(boss, '!', 900); A.se('DP_REGI', .8); await wait(1000);
      S.hide(false); await S.say('우하하!\n생각보다 빨리 돌아왔구먼!', { who: B });
      S.hide(true);
      const by = Math.min(D.door[1] - 3, Math.max(boss.y, me.y - 3));
      await Promise.all([A.walkTo(boss, [me.x, by], 300), (async () => { await wait(200); await A.look(me.y - 1, 1600); })()]); A.turn(boss, 'd');
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
      await Promise.all([A.slide(me, me.x, D.door[1], 260), ...near.map(e => A.slide(e, e.x, e.y + 1, 260))]);
      A.turn(me, 'u'); await wait(250); me.el.style.transition = 'opacity .4s'; me.el.style.opacity = '0';
      A.se('DP_DOOR'); await wait(500);
      await S.end(); A.music(null);
      await A.black(true, '체육관을 로켓단에게\n빼앗겨 버렸다...!', nSf ? `트레이너 ${nSf}명과 안내원이 납치되었다.` : '안내원이 납치되었다.', true);
    },
  ],
});
})();
