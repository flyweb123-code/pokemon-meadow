/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
const { chromium } = require('playwright'); const { svg, TYPES } = require('/tmp/claude-0/cr2/gen.js'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
  fs.mkdirSync('/tmp/claude-0/cr2/png', { recursive: true });
  for (const t of TYPES) { await p.setContent(`<body style="margin:0;background:transparent">${svg(t)}</body>`); const el = await p.$('svg'); await el.screenshot({ path: `/tmp/claude-0/cr2/png/${t}.png`, omitBackground: true }); }
  // 한 장 보기 (어두운 바탕)
  await p.setViewportSize({ width: 1200, height: 900 });
  fs.writeFileSync('/tmp/claude-0/cr2/png/sheet.html', `<body style="margin:0;background:#1a1626;display:flex;flex-wrap:wrap;gap:4px;padding:6px">${TYPES.map(t => `<div style="width:230px;text-align:center;color:#fff;font:12px sans-serif"><img src="${t}.png" style="width:230px">${t}</div>`).join('')}</body>`); await p.goto('file:///tmp/claude-0/cr2/png/sheet.html');
  await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/claude-0/cr2/sheet.png', fullPage: true }); await b.close(); })();
