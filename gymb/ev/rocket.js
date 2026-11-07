/* 체육관 이벤트: 로켓단의 체육관 점거 (2026-11-07 경완 '체육관 아이콘 들어가 보면 갑자기 로켓단이 점거한 내 체육관 모습이 스크롤되면서 연출 애니메이션으로 등장, 내 트레이너들을 다 납치해 간 스토리')
   1장 점거당한 체육관 → 2장 아지트를 찾아서 (만드는 중) → 3장 구출과 보스전 (만드는 중) */
(function () {
'use strict';
const GR = ['rocket_m', 'rocket_f'];
GymEv.def({
  id: 'rocket', nm: '로켓단의 체육관 점거', sub: '로켓단이 내 체육관을 빼앗고 트레이너들을 데려갔다!',
  songs: ['hgEyeRoc', 'hgAjito', 'hgVsRoc'], imgs: ['ow/rocket_m', 'ow/rocket_f', 'ow/giovanni', 'ev/rocket/crate', 'ev/rocket/machine', 'ev/rocket/pc'],
  reward: { g: 3000, rep: 30, fit: 'rocket' },
  ch: [
    // 1장 · 점거당한 체육관
    async A => {
      const { I, D, wait } = A, sfs = I.sfList(), nSf = (I.st().sf || []).length;   // 훈련장에 있던 트레이너까지 모두 납치
      // 무대: 내 트레이너·안내원·나는 없고, 트레이너 자리엔 조무래기, 관장 자리엔 비주기, 바닥엔 R 상자·깃발
      I.clearEnts(); I.renderHome(true);
      I.dropPeople();
      const spots = sfs.map(z => [z[1], z[2], z[3]]);
      for (const q of D.slots || []) { if (spots.length >= 3) break; if (!spots.some(p => p[0] === q[0] && p[1] === q[1])) spots.push([q[0], q[1], q[2]]); }
      const grunts = spots.slice(0, 6).map(([x, y, f], i) => A.npc(GR[i % 2], x, y, f || 'd'));
      const boss = A.npc('giovanni', D.leader[0], D.leader[1], 'd');
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
      await Promise.all(near.map((e, i) => fr[i] ? A.walkTo(e, fr[i], 200).then(() => A.turn(e, 'd')) : null));
      const S = A.talk(); const G = '로켓단 조무래기', B = '비주기';
      await S.say('어이, 거기! 멈춰!', { who: G });
      await S.say('이 체육관은 오늘부터\n로켓단이 접수했다!', { who: G });
      if (near[1]) await S.say('관장이라고? 크큭...\n한발 늦었네!', { who: G });
      // 보스가 내려온다
      S.hide(true); await A.look(boss.y); await wait(300);
      A.bub(boss, '...', 1200); await wait(1300);
      S.hide(false); await S.say('...시끄럽군.', { who: B });
      S.hide(true);
      const by = Math.min(D.door[1] - 3, Math.max(boss.y, me.y - 3));
      await Promise.all([A.walkTo(boss, [me.x, by], 300), (async () => { await wait(200); await A.look(me.y - 1, 1600); })()]); A.turn(boss, 'd');
      S.hide(false);
      await S.say(`호오... 네가 이 체육관의\n관장인가.`, { who: B });
      await S.say('제법 쓸 만한 곳이더군.\n오늘부터 이곳은 로켓단의\n새로운 거점이 된다.', { who: B });
      await S.say(nSf ? `네 트레이너들 말인가?\n${nSf}명 모두, 안내원과 함께\n우리 아지트로 정중히 모셔 갔지.` : '안내원 말인가?\n우리 아지트로 정중히 모셔 갔지.', { who: B });
      await S.say('되찾고 싶다면 직접 찾아와 보시지.\n...찾을 수 있다면 말이야.', { who: B });
      await S.say('얘들아.\n손님을 밖으로 배웅해 드려라.', { who: B });
      await S.say('넵! 보스!', { who: G });
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
