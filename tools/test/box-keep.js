/* 포켓에그 상자 지키기 시험 — 이 파일을 내려받아 활용해 생기는 법적 책임은 내려받아 활용한 사람에게 있습니다.
   v27.06 경완 '이런 오류 또 안 생기게 하려면': 진화·놓아주기·필드 내보내기 뒤 앱을 다시 켜도 상자가 그대로인지 본다
   (v27.01 진화 버그 = 켤 때마다 migrateBox 가 도감에 있고 상자에 없는 종을 빈 개체로 다시 만들던 것).
   돌리기: node tools/test/box-keep.js   (playwright 필요, 저장소 루트에서) — 본 게임·베타 둘 다, 실패하면 exit 1 */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const wait = ms => new Promise(r => setTimeout(r, ms));
async function run(page, b, port) {
  const ctx = await b.newContext({ serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  const url = `http://localhost:${port}/${page}?debug`, E = s => pg.evaluate(s => window.__meadow.ev(s), s);
  await pg.goto(url); await wait(6000);
  /* 튜토리얼 건너뛰고, 구경용 필드 포켓몬을 치운 뒤 시험 포켓몬만 */
  await E(`tutOn = false; saveFrozen = false; tutFreeze = false; S.mons.slice().forEach(m => removeMon(m, true)); S.box.length = 0; BOX_SEEN = null;
    for (const [sp, k] of [[60, 'evo'], [63, 'rel'], [129, 'keep'], [16, 'field']]) { const p = newPoke(sp, { shiny: false, g: 1, place: '시험' }); p.km = 999; p.tk = k; unlock(sp); } save(); 1`);
  await E(`spawn(S.box.find(p => p.tk === 'field').sp, { pid: S.box.find(p => p.tk === 'field').id }).then(() => save()); 1`); await wait(1500);
  await E(`releasePoke(S.box.find(p => p.tk === 'rel')); 1`);
  await E(`evolveWin(S.box.find(p => p.tk === 'evo'), false); 1`); await wait(15000);
  await E(`evolving = false; save(); 1`);
  const before = JSON.parse(await E(`JSON.stringify(S.box.map(p => p.id + ':' + p.sp).sort())`));
  await pg.reload(); await wait(6000);
  const after = JSON.parse(await E(`JSON.stringify(S.box.map(p => p.id + ':' + p.sp).sort())`));
  const rep = JSON.parse(await E(`JSON.stringify(S.errs.filter(e => /빈 포켓몬/.test(e[2])).map(e => e[2]))`));
  await ctx.close();
  const bad = [];
  if (!before.includes(before.find(x => x.endsWith(':61')))) bad.push('발챙이가 슈륙챙이로 진화하지 않음');
  if (before.some(x => x.endsWith(':63'))) bad.push('놓아준 캐이시가 상자에 남음');
  if (JSON.stringify(before) !== JSON.stringify(after)) bad.push(`다시 켠 뒤 상자가 바뀜 ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  if (rep.length) bad.push('빈 포켓몬 보고: ' + rep.join(', '));
  if (errs.length) bad.push('페이지 오류: ' + errs.slice(0, 3).join(' / '));
  console.log(`${page}: ${bad.length ? '실패\n  - ' + bad.join('\n  - ') : '통과'} (상자 ${after.join(' ')})`);
  return !bad.length;
}
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port, b = await chromium.launch();
  let ok = true; try { for (const p of ['index.html', 'beta.html']) ok = (await run(p, b, port)) && ok; } finally { await b.close(); srv.close(); }
  process.exit(ok ? 0 : 1);
})();
