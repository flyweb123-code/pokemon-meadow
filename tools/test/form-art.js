/* 포켓에그 폼 그림 시험 — 이 파일을 내려받아 활용해 생기는 법적 책임은 내려받아 활용한 사람에게 있습니다.
   v28.68 경완 '춤추새 전기 폼으로 미니게임 넘어가면 스프라이트 불꽃폼으로 되어있네 이 문제 또 생기네':
   폼 있는 포켓몬(춤추새 파칙파칙·도롱마담 모래·깝질무 동쪽)을 상자에서 골라 미니게임·체육관 그림 길(mKeyL·GA.pmd·GA.thumb·frPV)이 폼 그림을 쓰는지 본다.
   돌리기: node tools/test/form-art.js   (playwright 필요, 저장소 루트에서) — 본 게임·베타 둘 다, 실패하면 exit 1 */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const CASES = [[741, 'Pom_Pom'], [413, 'Sand'], [422, 'East']];
async function run(page, b, port) {
  const ctx = await b.newContext({ serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  const E = s => pg.evaluate(s => window.__meadow.ev(s), s);
  await pg.goto(`http://localhost:${port}/${page}?debug`); await wait(6000);
  const bad = [];
  for (const [sp, fm] of CASES) {
    const want = sp + '~' + fm;
    const r = JSON.parse(await E(`(async () => { tutOn = false; saveFrozen = true; const P = newPoke(${sp}, { shiny: false, g: 1, place: '시험' }); P.fm = '${fm}';
      const m = { pid: P.id, sp: P.sp, form: P.sp, sk: pKey(P), name: nameOf(P) };   /* 상자에서 고른 포켓몬 (필드에 없음) */
      const mk = await mKeyL(m), D = await GA.pmd(P.sp, P.sex, P), th = await GA.thumb(P), pv = frPV(P);
      S.box.splice(S.box.indexOf(P), 1);
      return JSON.stringify({ mk, pmd: D.P === SPRITES['${want}'], th: th === thumbOf('${want}'), pv: pv.fm, fm: pFm(P) }); })()`));
    if (r.mk !== want) bad.push(`${want} 미니게임 그림 ${r.mk}`);
    if (!r.pmd) bad.push(`${want} 체육관 GA.pmd 기본 모습`);
    if (!r.th) bad.push(`${want} GA.thumb 기본 모습`);
    if (r.pv !== fm) bad.push(`${want} 기록(frPV) 폼 빠짐`);
  }
  await ctx.close();
  if (errs.length) bad.push('페이지 오류: ' + errs.slice(0, 3).join(' / '));
  console.log(`${page}: ${bad.length ? '실패\n  - ' + bad.join('\n  - ') : '통과'}`);
  return !bad.length;
}
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port, b = await chromium.launch();
  let ok = true; try { for (const p of ['index.html', 'beta.html']) ok = (await run(p, b, port)) && ok; } finally { await b.close(); srv.close(); }
  process.exit(ok ? 0 : 1);
})();
