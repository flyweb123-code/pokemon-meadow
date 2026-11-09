// .github/workflows/bal-report.yml 이 돌림 (경완 2026-11-05 '체육관 배틀이랑 미니게임은 유저들 로그 수집해서 주기적으로 밸런스 체크'):
// 친구 서버 D1 bal 표의 지난 7일(과 그 전 7일) 기록을 모아 'auto-bal' 이슈로 올린다. 친구 코드는 쓰지 않는다 (사람 수만).
// 이슈는 Claude 예약 작업이 매주 읽고 밸런스 제안을 경완에게 보낸다.
// 시험: node tools/bal-report.mjs --dry rows.json  (rows = [{code,kind,ver,beta,t,d}], 이슈 안 만들고 본문만 찍음)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const DAY = 864e5, KST = 9 * 3600e3, NOW = Date.now();
// 눈여겨볼 기준 (그냥 '살펴보라'는 표시일 뿐, 바꿀지는 경완이 정함)
const FLAG = {
  winHi: 85, winLo: 35,        // 도전자 종류별 관장 승률(%)이 이 밖이면 표시 (10판 이상)
  examHi: 90, examLo: 20,      // 승급 심사 통과율(%)
  sfHi: 80, sfLo: 30,          // 트레이너가 도전자를 막는 비율(%)
  mgDayG: 690,                 // 미니게임 하루 골드 중앙값이 이보다 크면 (뉴트럴 시뮬 출퇴근 하루 골드 573~687G, 2026-10-29)
  goldUse: 40,                 // v18.73 경완 '유저가 돈을 쓰면서 즐기기': 지난 7일 쓴 골드 / 번 골드(%)가 이보다 낮으면 표시
  minN: 10,
};

const dry = process.argv.indexOf('--dry');
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'pokegrow', '--remote', '--json', '--command', sql], { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();

const rows = dry > 0 ? JSON.parse(readFileSync(process.argv[dry + 1], 'utf8'))
  : d1(`SELECT code, kind, ver, beta, t, d FROM bal WHERE t >= ${NOW - 14 * DAY} ORDER BY t LIMIT 200000`);
for (const r of rows) { try { r.d = typeof r.d === 'string' ? JSON.parse(r.d) : r.d || {}; } catch (e) { r.d = {}; } }
const cur = rows.filter(r => r.t >= NOW - 7 * DAY), prev = rows.filter(r => r.t < NOW - 7 * DAY);

// ---------- 계산 ----------
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
const avg = L => L.length ? Math.round(L.reduce((a, b) => a + b, 0) / L.length * 10) / 10 : null;
const q = (L, p) => { if (!L.length) return null; const s = [...L].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const people = L => new Set(L.map(r => r.code)).size;
const kday = t => Math.floor((t + KST) / DAY);
const perDay = (L, f) => { const m = new Map(); for (const r of L) { const k = r.code + ':' + kday(r.t); m.set(k, (m.get(k) || 0) + f(r)); } return [...m.values()]; };
const group = (L, f) => { const m = new Map(); for (const r of L) { const k = f(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; };
const DF = ['쉬운 도전자', '보통 도전자', '어려운 도전자'];
const catKey = k => DF.includes(k) ? DF.indexOf(k) : k === '이름 있는 트레이너' ? 5 : 10 + (+k.split(' ').pop() || 0);   // 쉬운·보통·어려운·이름 있는·승급 심사 1,2,…
const catOf = d => d.c === 'boss' ? `승급 심사 ${d.bs}` : d.c === 'named' ? '이름 있는 트레이너' : DF[d.df] || `도전자 ${d.df}`;

function stats(L) {
  const G = L.filter(r => r.kind === 'gym'), F = L.filter(r => r.kind === 'sf'), M = L.filter(r => r.kind === 'mg' && (r.d.g || 'jump') === 'jump'), D = L.filter(r => r.kind === 'mg' && r.d.g === 'drop'), K = L.filter(r => r.kind === 'mg' && r.d.g === 'stack');   // v17.54: 진화구슬(drop)은 따로, 탑 쌓기(stack)도 따로 (2026-11-09: 장애물 넘기 칸에 섞여 있었음)   // v17.54: 진화구슬(drop)은 따로
  const gym = {
    n: G.length, people: people(G), win: pct(G.filter(r => r.d.w).length, G.length), quit: pct(G.filter(r => r.d.q).length, G.length),
    turns: avg(G.map(r => r.d.tn | 0)),
    cats: [...group(G, r => catOf(r.d))].sort((a, b) => catKey(a[0]) - catKey(b[0])).map(([k, A]) => ({ k, n: A.length, people: people(A), win: pct(A.filter(r => r.d.w).length, A.length),
      turns: avg(A.map(r => r.d.tn | 0)), gold: avg(A.filter(r => r.d.w).map(r => r.d.gd | 0)), rep: avg(A.map(r => r.d.rp | 0)),
      lvGap: avg(A.filter(r => r.d.ma && r.d.fa).map(r => r.d.ma - r.d.fa)), mxGap: avg(A.filter(r => r.d.mx && r.d.fa).map(r => r.d.mx - r.d.fa)) })),
    grades: [...group(G, r => r.d.gr | 0)].sort((a, b) => a[0] - b[0]).map(([k, A]) => ({ k, n: A.length, people: people(A), win: pct(A.filter(r => r.d.w).length, A.length) })),
    stk: q(G.map(r => r.d.stk | 0), .9),
    dayGold: (() => { const L2 = perDay([...G, ...F], r => r.d.gd | 0); return { p50: q(L2, .5), p90: q(L2, .9), max: q(L2, 1) }; })(),
  };
  const sf = { n: F.length, people: people(F), block: pct(F.filter(r => r.d.w).length, F.length),
    byDf: [...group(F, r => r.d.df | 0)].sort((a, b) => a[0] - b[0]).map(([k, A]) => ({ k: DF[k] || k, n: A.length, block: pct(A.filter(r => r.d.w).length, A.length) })) };
  const sc = M.map(r => r.d.sc | 0), dg = perDay(M, r => r.d.gd | 0), dn = perDay(M, () => 1);
  const mg = { n: M.length, people: people(M), score: { p50: q(sc, .5), p90: q(sc, .9), max: q(sc, 1) }, sec: avg(M.map(r => r.d.t | 0)), phase: avg(M.map(r => r.d.ph | 0)),
    combo: q(M.map(r => r.d.cm | 0), .9), goldPlay: avg(M.map(r => r.d.gd | 0)), dayGold: { p50: q(dg, .5), p90: q(dg, .9), max: q(dg, 1) }, dayPlays: { p50: q(dn, .5), p90: q(dn, .9) },
    best: pct(M.filter(r => r.d.nb).length, M.length),
    rank: [...group(M, r => r.d.rk || '?')].sort((a, b) => 'FEDCBAS'.indexOf(a[0]) - 'FEDCBAS'.indexOf(b[0])).map(([k, A]) => ({ k, n: A.length, p50: q(A.map(r => r.d.sc | 0), .5), p90: q(A.map(r => r.d.sc | 0), .9) })),
    ab: [...group(M, r => r.d.ab || '-')].map(([k, A]) => ({ k, n: A.length, p50: q(A.map(r => r.d.sc | 0), .5) })).sort((a, b) => (b.p50 || 0) - (a.p50 || 0)),
  };
  const ed = { n: D.length, people: people(D), score: { p50: q(D.map(r => r.d.sc | 0), .5), p90: q(D.map(r => r.d.sc | 0), .9) }, sec: avg(D.map(r => r.d.t | 0)), goldPlay: avg(D.map(r => r.d.gd | 0)), ab: avg(D.map(r => r.d.ab | 0)) };
  const tw = { n: K.length, people: people(K), score: { p50: q(K.map(r => r.d.sc | 0), .5), p90: q(K.map(r => r.d.sc | 0), .9) }, sec: avg(K.map(r => r.d.t | 0)), goldPlay: avg(K.map(r => r.d.gd | 0)), ab: avg(K.map(r => r.d.ab | 0)) };
  const Gd = L.filter(r => r.kind === 'gold'), spOf = d => Object.values(d.sp || {}).reduce((a, b) => a + (+b || 0), 0), sum = A => A.reduce((a, b) => a + b, 0);   // v18.73: 하루 한 줄 골드 기록 (잔액·번 돈·쓴 돈)
  const catM = new Map(), itM = new Map(); for (const r of Gd) { for (const [k, n] of Object.entries(r.d.sp || {})) { const c = catM.get(k) || { g: 0, who: new Set() }; c.g += +n || 0; c.who.add(r.code); catM.set(k, c); } for (const [k, n] of Object.entries(r.d.it || {})) itM.set(k, (itM.get(k) || 0) + (+n || 0)); }
  const gold = { n: Gd.length, people: people(Gd), ern: { p50: q(Gd.map(r => r.d.ern | 0), .5), p90: q(Gd.map(r => r.d.ern | 0), .9) }, sp: { p50: q(Gd.map(r => spOf(r.d)), .5), p90: q(Gd.map(r => spOf(r.d)), .9) },
    spDays: pct(Gd.filter(r => spOf(r.d) > 0).length, Gd.length), useRate: pct(sum(Gd.map(r => spOf(r.d))), sum(Gd.map(r => r.d.ern | 0))), bal: { p50: q(Gd.map(r => r.d.b1 | 0), .5), p90: q(Gd.map(r => r.d.b1 | 0), .9), max: q(Gd.map(r => r.d.b1 | 0), 1) },
    cats: [...catM].map(([k, c]) => ({ k, g: c.g, people: c.who.size })).sort((a, b) => b.g - a.g), items: [...itM].sort((a, b) => b[1] - a[1]).slice(0, 12) };
  const vers = [...group(L, r => r.ver || '?')].map(([k, A]) => [k, A.length]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { gym, sf, mg, ed, tw, gold, vers };
}
const S = stats(cur), P = stats(prev);

// ---------- 눈여겨볼 것 ----------
const flags = [];
for (const c of S.gym.cats) if (c.n >= FLAG.minN) {
  if (/승급 심사/.test(c.k)) { if (c.win > FLAG.examHi) flags.push(`${c.k} 통과율 ${c.win}% — 너무 쉬움?`); else if (c.win < FLAG.examLo) flags.push(`${c.k} 통과율 ${c.win}% — 너무 어려움?`); }
  else if (c.win > FLAG.winHi) flags.push(`${c.k} 상대 관장 승률 ${c.win}% — 도전자가 너무 약함?`);
  else if (c.win < FLAG.winLo) flags.push(`${c.k} 상대 관장 승률 ${c.win}% — 도전자가 너무 강함?`);
}
if (S.sf.n >= FLAG.minN && (S.sf.block > FLAG.sfHi || S.sf.block < FLAG.sfLo)) flags.push(`트레이너가 도전자를 막는 비율 ${S.sf.block}%`);
if (S.mg.n >= FLAG.minN && S.mg.dayGold.p50 > FLAG.mgDayG) flags.push(`미니게임 하루 골드 중앙값 ${S.mg.dayGold.p50}G (출퇴근 하루 골드 약 ${FLAG.mgDayG}G 보다 많음)`);
if (S.gold.n >= FLAG.minN && S.gold.useRate != null && S.gold.useRate < FLAG.goldUse) flags.push(`번 골드의 ${S.gold.useRate}%만 씀 — 골드가 쌓이기만? (쓸 곳 살펴보기)`);
if (S.gym.quit > 15 && S.gym.n >= FLAG.minN) flags.push(`체육관 배틀 기권 ${S.gym.quit}%`);

// ---------- 이슈 본문 ----------
const v = x => x == null ? '-' : typeof x === 'number' ? x.toLocaleString('en-US') : x;
const dlt = (a, b) => a == null || b == null ? '' : a === b ? ' (=)' : ` (${a > b ? '+' : ''}${Math.round((a - b) * 10) / 10})`;
const ymd = t => new Date(t + KST).toISOString().slice(0, 10);
const tbl = (head, L) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...L.map(r => '| ' + r.map(v).join(' | ') + ' |')].join('\n');
const pc = (k, s) => P.gym.cats.find(c => c.k === k)?.[s];
const body = [
  `기간: ${ymd(NOW - 7 * DAY)} ~ ${ymd(NOW)} (KST, 지난 7일). 괄호 = 그 전 7일과 차이. 친구 코드 없이 사람 수만.`, '',
  '## 눈여겨볼 것', flags.length ? flags.map(f => '- ' + f).join('\n') : '- 기준 밖으로 벗어난 것 없음 (또는 판 수가 적음)', '',
  '## 체육관 배틀 (관장이 직접)',
  `${v(S.gym.n)}판 · ${S.gym.people}명 · 관장 승률 ${v(S.gym.win)}%${dlt(S.gym.win, P.gym.win)} · 기권 ${v(S.gym.quit)}% · 평균 ${v(S.gym.turns)}턴 · 연승 상위 10% ${v(S.gym.stk)}연승`, '',
  tbl(['상대', '판', '명', '관장 승률 %', '평균 턴', '이긴 판 골드', '평판 평균', '레벨 차(평균)', '레벨 차(최고)'],
    S.gym.cats.map(c => [c.k, c.n, c.people, v(c.win) + dlt(c.win, pc(c.k, 'win')), c.turns, c.gold, c.rep, c.lvGap, c.mxGap])), '',
  '레벨 차 = 내 라인업 평균(또는 최고) − 상대 평균.', '',
  tbl(['관장 등급', '판', '명', '승률 %'], S.gym.grades.map(g => [g.k, g.n, g.people, g.win])), '',
  `체육관 하루 골드 (관장 배틀 + 트레이너, 한 사람 하루): 중앙 ${v(S.gym.dayGold.p50)}G · 상위 10% ${v(S.gym.dayGold.p90)}G · 최고 ${v(S.gym.dayGold.max)}G${dlt(S.gym.dayGold.p50, P.gym.dayGold.p50)}`, '',
  '## 체육관 트레이너',
  `${v(S.sf.n)}번 · ${S.sf.people}명 · 도전자를 막은 비율 ${v(S.sf.block)}%${dlt(S.sf.block, P.sf.block)}`, '',
  tbl(['도전자', '번', '막음 %'], S.sf.byDf.map(r => [r.k, r.n, r.block])), '',
  '## 미니게임 (장애물 넘기)',
  `${v(S.mg.n)}판 · ${S.mg.people}명 · 한 판 평균 ${v(S.mg.sec)}초 · 평균 ${v(S.mg.phase)}단계 · 최고 기록 갱신 ${v(S.mg.best)}%`,
  `점수: 중앙 ${v(S.mg.score.p50)}${dlt(S.mg.score.p50, P.mg.score.p50)} · 상위 10% ${v(S.mg.score.p90)} · 최고 ${v(S.mg.score.max)} · 콤보 상위 10% ${v(S.mg.combo)}`,
  `골드: 한 판 평균 ${v(S.mg.goldPlay)}G · 한 사람 하루 중앙 ${v(S.mg.dayGold.p50)}G${dlt(S.mg.dayGold.p50, P.mg.dayGold.p50)} · 상위 10% ${v(S.mg.dayGold.p90)}G · 최고 ${v(S.mg.dayGold.max)}G`,
  `한 사람 하루 판 수: 중앙 ${v(S.mg.dayPlays.p50)} · 상위 10% ${v(S.mg.dayPlays.p90)}`, '',
  tbl(['랭크', '판', '점수 중앙', '점수 상위 10%'], S.mg.rank.map(r => [r.k, r.n, r.p50, r.p90])), '',
  tbl(['기술 타입', '판', '점수 중앙'], S.mg.ab.map(r => [r.k, r.n, r.p50])), '',
  '## 미니게임 (진화구슬 키우기)',
  `${v(S.ed.n)}판 · ${S.ed.people}명 · 한 판 평균 ${v(S.ed.sec)}초 · 기술 평균 ${v(S.ed.ab)}번`,
  `점수: 중앙 ${v(S.ed.score.p50)} · 상위 10% ${v(S.ed.score.p90)} · 골드: 한 판 평균 ${v(S.ed.goldPlay)}G (1분에 ${S.ed.sec ? v(Math.round(S.ed.goldPlay / S.ed.sec * 60)) : '-'}G, 장애물 넘기 1분에 ${S.mg.sec ? v(Math.round(S.mg.goldPlay / S.mg.sec * 60)) : '-'}G)`, '',
  '## 미니게임 (포켓몬 탑 쌓기)',
  `${v(S.tw.n)}판 · ${S.tw.people}명 · 한 판 평균 ${v(S.tw.sec)}초 · 기술 평균 ${v(S.tw.ab)}번`,
  `점수: 중앙 ${v(S.tw.score.p50)} · 상위 10% ${v(S.tw.score.p90)} · 골드: 한 판 평균 ${v(S.tw.goldPlay)}G (1분에 ${S.tw.sec ? v(Math.round(S.tw.goldPlay / S.tw.sec * 60)) : '-'}G)`, '',
  '## 골드 (한 사람 하루, 다음 날 올라옴)',
  `${v(S.gold.n)}일치 · ${S.gold.people}명 · 번 골드 중앙 ${v(S.gold.ern.p50)}G (상위 10% ${v(S.gold.ern.p90)}G) · 쓴 골드 중앙 ${v(S.gold.sp.p50)}G (상위 10% ${v(S.gold.sp.p90)}G)`,
  `골드를 쓴 날 ${v(S.gold.spDays)}% · 번 골드 중 쓴 비율 ${v(S.gold.useRate)}%${dlt(S.gold.useRate, P.gold.useRate)} · 하루 끝 잔액 중앙 ${v(S.gold.bal.p50)}G · 상위 10% ${v(S.gold.bal.p90)}G · 최고 ${v(S.gold.bal.max)}G`, '',
  tbl(['쓴 곳', '골드', '명'], S.gold.cats.map(c => [({ item: '진화 도구·아이템', field: '필드 소품', fit: '의상', bgm: '배경 음악', gym: '체육관 상점', wage: '트레이너 월급·수당' })[c.k] || c.k, c.g, c.people])), '',
  `많이 산 것: ${S.gold.items.map(([k, n]) => `${k} ${n}`).join(' · ') || '-'}`, '',
  `버전: ${S.vers.map(([k, n]) => `${k} ${n}`).join(' · ') || '-'}`, '',
  '<details><summary>숫자 (JSON)</summary>', '', '```json', JSON.stringify({ cur: S, prev: P, flags }, null, 1).slice(0, 50000), '```', '</details>',
].join('\n');

if (dry > 0) { console.log(body); process.exit(0); }
if (!rows.length) { console.log('기록 없음'); }
// 2026-11-09: 월요일 예약 실행이 GitHub 쪽에서 빠져서(07:13 예약이 안 돌았음) 예약을 두 번 걸어 둠 — 예약 실행은 12시간 안에 만든 이슈가 있으면 건너뜀
if (process.env.GITHUB_EVENT_NAME === 'schedule') {
  try { const L = JSON.parse(gh('issue', 'list', '--label', 'auto-bal', '--state', 'all', '--limit', '1', '--json', 'createdAt')); if (L[0] && NOW - Date.parse(L[0].createdAt) < DAY / 2) { console.log('이번 주 이슈 이미 있음'); process.exit(0); } } catch (e) {}
}
writeFileSync('/tmp/bal.md', body);
try { gh('label', 'create', 'auto-bal', '--color', '0e8a16', '--description', '체육관·미니게임 밸런스 주간 보고 (자동)'); } catch (e) {}
const url = gh('issue', 'create', '--title', `[밸런스 주간] ${ymd(NOW - 7 * DAY)} ~ ${ymd(NOW)}${flags.length ? ` · 눈여겨볼 것 ${flags.length}` : ''}`, '--label', 'auto-bal', '--body-file', '/tmp/bal.md');
console.log(url);
