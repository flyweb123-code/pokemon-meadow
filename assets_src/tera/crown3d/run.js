/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.text().slice(0, 200)); });
  await p.goto('http://localhost:8793/index.html'); await p.waitForFunction(() => window.ready, null, { timeout: 30000 });
  const only = process.argv[2]; const T = await p.evaluate(() => TYPES); fs.mkdirSync('raw', { recursive: true });
  for (const t of T) { if (only && !only.split(',').includes(t)) continue; const [u, m] = await p.evaluate(t => renderType(t), t); fs.writeFileSync(`raw/${t}_c.png`, Buffer.from(u.split(',')[1], 'base64')); fs.writeFileSync(`raw/${t}_m.png`, Buffer.from(m.split(',')[1], 'base64')); }
  await b.close(); })();
