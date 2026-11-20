/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
// v21.89 [DBK] Deluxe Battle Kit 연출 옮김 (Lucidious89, Pokémon Essentials 플러그인)
// 메가진화(DBK 본체)·Z기술([DBK] Z-Power)·다이맥스([DBK] Dynamax)·테라스탈([DBK] Terastallization) 장면을
// 플러그인 Ruby 코드의 PictureEx 시간표 그대로 옮겼다. 좌표는 Essentials 화면 512x384, 1칸 = 1/20초.
// 배틀 위 화면(256x192) 위에 0.5배로 겹쳐 그린다. 화면을 누르면 건너뜀 (플러그인의 skip 버튼).
(function () {
  const W = 512, H = 384, CX = 256, CY = 192, FR = 50;
  const ORG = { tl: [0, 0], c: [50, 50], b: [50, 100], t: [50, 0], bl: [0, 100] };
  // 타입별 테두리·배경 색 (pbGetTypeColors)
  const TYC = { Normal: [[216, 216, 192], [168, 168, 120]], Fighting: [[240, 128, 48], [192, 48, 40]], Flying: [[200, 192, 248], [168, 144, 240]], Poison: [[216, 128, 184], [160, 64, 160]], Ground: [[248, 248, 120], [224, 192, 104]], Rock: [[224, 192, 104], [184, 160, 56]], Bug: [[216, 224, 48], [168, 184, 32]], Ghost: [[168, 144, 240], [112, 88, 152]], Steel: [[216, 216, 192], [184, 184, 208]], Fire: [[248, 208, 48], [240, 128, 48]], Water: [[152, 216, 216], [104, 144, 240]], Grass: [[192, 248, 96], [120, 200, 80]], Electric: [[248, 248, 120], [248, 208, 48]], Psychic: [[248, 192, 176], [248, 88, 136]], Ice: [[208, 248, 232], [152, 216, 216]], Dragon: [[184, 160, 248], [112, 56, 248]], Dark: [[168, 168, 120], [112, 88, 72]], Fairy: [[248, 216, 224], [240, 168, 176]] };
  const tyCol = t => TYC[t] || [[255, 255, 255], [200, 200, 200]];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // ---------- PictureEx 흉내 ----------
  class Pic {
    constructor(sc, o) {
      this.sc = sc; this.o = o; this.cmd = {}; this.ends = 0;
      this.init = { x: o.x || 0, y: o.y || 0, zoom: o.zoom ?? 100, op: o.op ?? 255, vis: o.vis ? 1 : 0, tone: [0, 0, 0, 0], color: o.color || [0, 0, 0, 0], name: o.src || '' };
      const e = this.el = document.createElement('div'); e.className = 'dxp'; const [ox, oy] = ORG[o.org || 'tl'];
      e.style.cssText = `position:absolute;left:0;top:0;transform-origin:${ox}% ${oy}%;will-change:transform,opacity;${o.w ? `width:${o.w}px;height:${o.h}px;` : ''}`;
      this.ox = ox; this.oy = oy;
      if (o.bg) { const b = document.createElement('div'); b.style.cssText = `position:absolute;inset:0;background:${o.bg}`; e.appendChild(b); this.img = b; }
      else { const i = this.img = document.createElement('img'); i.alt = ''; i.draggable = false; i.style.cssText = 'display:block;image-rendering:pixelated;max-width:none'; if (o.crop) { e.style.overflow = 'hidden'; e.style.width = o.crop[2] + 'px'; e.style.height = o.crop[3] + 'px'; i.style.marginLeft = -o.crop[0] + 'px'; i.style.marginTop = -o.crop[1] + 'px'; } if (o.iw) { i.style.width = o.iw + 'px'; i.style.height = (o.ih || o.iw) + 'px'; } i.src = o.src; e.appendChild(i); }
      const ov = () => { const s = document.createElement('span'); s.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none'; if (o.mask !== false && !o.bg) { const u = `url("${o.src}")`; s.style.webkitMaskImage = s.style.maskImage = u; s.style.webkitMaskSize = s.style.maskSize = '100% 100%'; } e.appendChild(s); return s; };
      this.ovC = ov(); this.ovT = ov();
      if (o.outline) e.style.filter = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([a, b]) => `drop-shadow(${a}px ${b}px 0 ${rgba(o.outline, 1)})`).join(' ');
      if (o.mirror) this.mir = true;
      sc.stage.appendChild(e); sc.pics.push(this);
    }
    _add(p, t, d, v, rel) { (this.cmd[p] = this.cmd[p] || []).push({ t, d, v, rel }); this.ends = Math.max(this.ends, t + d); return this; }
    set(p, t, v) { return this._add(p, t, 0, v); }
    move(p, t, d, v) { return this._add(p, t, d, v); }
    vis(t, b) { return this.set('vis', t, b ? 1 : 0); }
    xy(t, x, y) { this.set('x', t, x); return this.set('y', t, y); }
    moveXY(t, d, x, y) { this.move('x', t, d, x); return this.move('y', t, d, y); }
    delta(t, d, dx, dy) { this._add('x', t, d, dx, 1); return this._add('y', t, d, dy, 1); }
    zoom(t, d, z) { return this.move('zoom', t, d, z); }
    op(t, d, a) { return this.move('op', t, d, a); }
    tone(t, d, v) { return this.move('tone', t, d, v); }
    color(t, d, v) { return this.move('color', t, d, v); }
    name(t, src) { return this.set('name', t, src); }
    se(t, f) { this.sc.ses.push([t, f]); this.ends = Math.max(this.ends, t); return this; }
    get total() { return this.ends; }
    // 이 순간의 값: 명령을 시작 순서대로 (같은 속성은 시작 시점의 값에서 출발)
    val(p, f) {
      const L = (this.cmd[p] || []).slice().sort((a, b) => a.t - b.t); let v = this.init[p];
      for (const c of L) { if (f < c.t) break; const to = c.rel ? v + c.v : c.v; if (c.d === 0 || f >= c.t + c.d || typeof v === 'string') { v = to; continue; } const k = (f - c.t) / c.d; v = Array.isArray(v) ? v.map((x, i) => x + (to[i] - x) * k) : v + (to - v) * k; return v; }
      return v;
    }
    draw(f) {
      const e = this.el, v = this.val('vis', f); if (!v) { e.style.display = 'none'; return; } e.style.display = '';
      const x = this.val('x', f), y = this.val('y', f), z = this.val('zoom', f) / 100, op = this.val('op', f) / 255, tn = this.val('tone', f), cl = this.val('color', f), nm = this.val('name', f);
      e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.opacity = Math.max(0, Math.min(1, op));
      e.style.transform = `translate(${-this.ox}%,${-this.oy}%) scale(${this.mir ? -z : z},${z})`;
      if (this.img.tagName === 'IMG' && nm && this.img.dataset.n !== nm) { this.img.dataset.n = nm; if (this.img.src !== new URL(nm, location.href).href) this.img.src = nm; }
      const g = tn[3] / 255, r = (tn[0] + tn[1] + tn[2]) / 3;
      this.img.style.filter = `${g > 0 ? `grayscale(${g})` : ''} ${r < 0 ? `brightness(${Math.max(0, 1 + r / 255)})` : ''}`.trim() || '';
      this.ovT.style.background = '#fff'; this.ovT.style.opacity = r > 0 ? Math.min(1, r / 255) : 0;
      this.ovC.style.background = rgba(cl, 1); this.ovC.style.opacity = cl[3] / 255;
    }
  }
  /* v24.56 경완 "화면 전체 덮는 기술 연출이 여전히 상단바에 안 비침": 전체 화면 장면(메가·Z)은 상태 막대까지 덮는 판이라 원래 거울(위로 반사)이 화면 밖에 그려짐 → 위 화면 윗줄(bt-top 위쪽 S px)을 상태 막대 자리에 거울처럼 (반사 기준선을 bt-top 윗변으로, 그 줄만 보이게 마스크) */
  function topMirror(root, top) { try { if (!top || !root.parentNode?.classList?.contains('mob') || !('webkitBoxReflect' in root.style || CSS.supports?.('-webkit-box-reflect', 'above 0'))) return; const R = root.getBoundingClientRect(), T = top.getBoundingClientRect(), k = R.height / (root.offsetHeight || R.height), S = Math.round((T.top - R.top) / k); if (S < 2) return;
    root.style.setProperty('-webkit-box-reflect', `above ${1 - 2 * S}px linear-gradient(transparent ${S - 1}px, #000 ${S - 1}px ${2 * S}px, transparent ${2 * S}px)`); } catch (e) {} }
  function scene(host) {
    const root = document.createElement('div'); root.className = 'dx-scene';
    root.style.cssText = 'position:absolute;inset:0;z-index:60;overflow:hidden;pointer-events:auto';
    const stage = document.createElement('div'); stage.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:scale(${(host.clientWidth || 256) / W});transform-origin:0 0;overflow:hidden`;
    root.appendChild(stage); host.appendChild(root);
    const sc = { root, stage, pics: [], ses: [], add: o => new Pic(sc, o) };
    sc.run = (extra = 0) => new Promise(res => {
      const end = Math.max(...sc.pics.map(p => p.total)) + extra; let t0 = 0, si = 0, skip = false, done = false;
      sc.ses.sort((a, b) => a[0] - b[0]);
      const fin = () => { if (done) return; done = true; root.remove(); res(skip); };
      root.addEventListener('pointerdown', () => { skip = true; }, { once: true });
      const step = ts => { if (!t0) t0 = ts; const f = skip ? end : (ts - t0) / FR;
        while (si < sc.ses.length && sc.ses[si][0] <= f) { const fn = sc.ses[si++][1]; if (!skip) try { fn(); } catch (e) {} }
        for (const p of sc.pics) p.draw(Math.min(f, end));
        if (f >= end) return fin(); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    return sc;
  }

  // ---------- DBK 도우미 (dxSet...) ----------
  // c = { host, bg:{url,w,h,pos}, base:{url,w,h}, tr:{url,w,h}, item:{url,w,h}, mon:{url,w,h,top}, to:{url,w,h,top}, opp, wild, se(name), cry() }
  const bgOf = (sc, c, d) => sc.add({ w: W, h: H, bg: `url(${c.bg.url}) ${c.bg.pos || '0 0'}/${c.bg.size || `${W * 2}px ${H}px`} no-repeat`, vis: 0 });
  function bases(sc, c, d, x, y, off) {
    const L = [], bw = c.base.w;
    if (off) { const b = sc.add({ src: c.base.url, iw: c.base.w, ih: c.base.h, org: 't', x: c.opp ? W + bw / 2 : -bw / 2, y: y - 32 }); L.push(b); }
    const b = sc.add({ src: c.base.url, iw: c.base.w, ih: c.base.h, org: 't', x, y: y + (off ? 20 : 0) }); L.push(b); return [L, bw];
  }
  function trainerItem(sc, c, d, bw) {
    const ox = c.tr.w / 2 + Math.floor((bw - c.tr.w) / 2), delta = Math.floor(bw * .75), mir = !c.opp;
    const tx = mir ? -ox : W + ox, ex = mir ? tx + delta : tx - delta;
    const tr = sc.add({ src: c.tr.url, iw: c.tr.w, ih: c.tr.h, org: 'b', x: tx, y: 230, mirror: mir });
    const it = c.item ? sc.add({ src: c.item.url, iw: c.item.w, ih: c.item.h, org: 'b', x: ex, y: 96, op: 0, outline: [255, 255, 255] }) : null;
    return [tr, it];
  }
  // 포켓몬 (pbBattlerPosition(1,1) = (384,176) → x-128, y+80)
  const monPic = (sc, c, m, off, extra = {}) => sc.add({ src: m.url, iw: m.w, ih: m.h, org: 'b', x: CX, y: 176 + 80 + (off ? 20 : 0), mirror: !c.opp, ...extra });
  const spr = (sc, src, x, y, w, h, org = 'c', op = 255, zoom = 100, extra = {}) => sc.add({ src, iw: w || undefined, ih: h || undefined, org, x, y, op, zoom, ...extra });   // w·h 를 안 주면 그림 원래 크기 (DBK 그림은 512x384 화면용)
  const overlay = (sc, src) => sc.add({ src, op: 0, mask: false });
  const fade = sc => sc.add({ w: W, h: H, bg: '#000', op: 0, vis: 1 });
  function particles(sc, src, x, y, r, w = 42) { return [[-r, -r], [r, -r], [-r, r], [r, r]].map(([a, b]) => { const p = spr(sc, src, x + a, y + b, w, w); return [p, x + a, y + b]; }); }
  function particleRun(P, delay, cx, cy) { let rep = delay; for (let t = 0; t < 2; t++) { if (t > 0) rep -= 4; P.forEach(([p, ox, oy], i) => { p.vis(rep + i, 1); p.moveXY(rep + i, 4, cx, cy); rep = p.total; p.vis(rep + i, 0); p.xy(rep + i, ox, oy); p.zoom(rep + i, 0, 100); rep = p.total - 2; }); } return P[P.length - 1][0].total; }
  const shake = (L, delay, n, dx, dy) => { let t = .5, d = delay; for (let i = 0; i < n; i++) { L.forEach(p => { const x = p.val('x', d), y = p.val('y', d); p.moveXY(d, t, x + dx, y + dy); p.moveXY(d + t, t, x - dx, y - dy); }); d = L[0].total; } return d; };
  const fadeIn = (sc, F, Ls) => { F.op(0, 8, 255); let d = F.total; Ls.forEach(p => p.vis(d, 1)); F.op(d, 8, 0); return F.total; };
  const ld = u => new Promise(r => { if (!u) return r(); const i = new Image(); i.onload = i.onerror = r; i.src = u; });
  const preload = c => Promise.race([Promise.all([c.bg?.url, c.base?.url, c.tr?.url, c.item?.url, c.mon?.url, c.to?.url, c.stone?.url, ...(c.extra || [])].map(ld)), new Promise(r => setTimeout(r, 2500))]);

  // ---------- 메가진화 (DBK [005] Mega Evolution.rb BattlerMegaEvolve) ----------
  async function mega(c) {
    const P = c.path; await preload({ ...c, extra: [P + 'Mega/orb_1.png', P + 'Mega/orb_2.png', P + 'Mega/shine.png', P + 'burst.png', P + 'particle.png', P + 'pulse.png', P + 'Mega/icon.png'] });
    const sc = scene(c.host), tr = !c.wild, BG = bgOf(sc, c), [BS, bw] = bases(sc, c, 0, CX, CY, tr), [TR, IT] = tr ? trainerItem(sc, c, 0, bw) : [];
    const OV = overlay(sc, P + 'burst.png'), PK = monPic(sc, c, c.mon, tr);
    const feet = PK.init.y, st = c.stone ? spr(sc, c.stone.url, CX, feet - c.mon.h + c.mon.top, c.stone.w, c.stone.h, 'b', 0, 100, { outline: [255, 255, 255] }) : null;
    const oy = c.wild ? CY : CY + 20, ORB = spr(sc, P + 'Mega/orb_1.png', CX, oy, 0, 0, 'c', 0, 0), SH = spr(sc, P + 'Mega/shine.png', CX, oy);
    const MG = monPic(sc, c, c.to, tr, { outline: [255, 255, 255], color: [255, 255, 255, 255] });
    const ORB2 = spr(sc, P + 'Mega/orb_2.png', CX, oy, 0, 0, 'c', 0), PT = particles(sc, P + 'particle.png', CX, CY, 200), PU = spr(sc, P + 'pulse.png', CX, oy, 0, 0, 'c', 255, 50);
    const IC = spr(sc, P + 'Mega/icon.png', CX, feet - c.to.h + c.to.top - 20, 0, 0, 'b', 0), F = fade(sc);
    let d = fadeIn(sc, F, [BG, BS[BS.length - 1], PK]);
    if (tr) { TR.vis(d + 4, 1); BS[0].vis(d + 4, 1); const dl = Math.floor(bw * .75) * (c.opp ? -1 : 1); TR.delta(d + 4, 8, dl, 0); BS[0].delta(d + 4, 8, dl, 0); d = TR.total + 1;
      TR.se(d, () => c.se('DX Action')); if (IT) { IT.vis(d, 1); IT.delta(d, 15, 0, -20); IT.op(d, 15, 255); IT.op(d + 15, 8, 0); } d = Math.max(TR.total, IT?.total || 0); }
    if (st) { st.vis(d, 1); st.delta(d, 15, 0, -20); st.op(d, 15, 255); st.op(d + 15, 8, 0); }
    BG.tone(d, 15, [-200, -200, -200, 0]); BS.forEach(p => p.tone(d, 15, [-200, -200, -200, 0]));
    PK.tone(d, 8, [-255, -255, -255, 255]); PK.color(d + 8, 6, [255, 255, 255, 255]);
    const pe = particleRun(PT, d, CX, CY); d = PK.total + 4;
    ORB.vis(d, 1); ORB2.vis(d, 1); ORB.se(d, () => c.se('Psych Up')); ORB.zoom(d, 12, 100); ORB.op(d, 12, 255); ORB2.op(pe, 16, 255); d = ORB2.total;
    SH.vis(d, 1); SH.op(d, 4, 255); PK.vis(d, 0);
    for (let i = 0; i < 16; i++) { ORB.moveXY(d, .5, CX + 2, oy); ORB2.moveXY(d, .5, CX + 2, oy); ORB.moveXY(d + .5, .5, CX - 2, oy); ORB2.moveXY(d + .5, .5, CX - 2, oy); d = ORB2.total; }
    ORB.moveXY(d, 0, CX, oy); ORB2.moveXY(d, 0, CX, oy);
    ORB2.se(d, () => c.se('fog2')); ORB2.zoom(d, 8, 1000); ORB2.op(d, 8, 0); MG.vis(d + 6, 1); ORB.zoom(d + 6, 8, 1000); ORB.op(d + 6, 8, 0);
    F.color(d + 4, 0, [255, 255, 255, 255]); F.op(d + 4, 12, 255); d = F.total; MG.color(d, 0, [0, 0, 0, 255]); F.op(d, 6, 0); F.color(d + 6, 0, [0, 0, 0, 0]); d = F.total;
    OV.vis(d, 1); OV.op(d, 5, 0); SH.vis(d, 1); IC.vis(d, 1); IC.op(d + 4, 8, 255); PU.vis(d, 1); PU.zoom(d, 5, 1000); PU.op(d + 2, 5, 0); MG.color(d, 8, [0, 0, 0, 0]);
    const t = .5; for (let i = 0; i < 16; i++) { if (i > 0) { const y = MG.val('y', d); MG.moveXY(d, t, CX, y + 2); MG.moveXY(d + t, t, CX, y); OV.op(d + t, 2, 160); SH.op(d + t, 2, 160); } else MG.se(d + t, () => c.cry()); OV.op(d + t, 2, 240); SH.op(d + t, 2, 240); d = Math.max(MG.total, d + 1); }
    OV.op(d, 4, 0); SH.op(d, 4, 0); F.op(d + 20, 8, 255);
    return sc.run();
  }

  // ---------- 메가진화 전체 화면 연출 (경완 2026-11-12 '배틀 화면이 핸드폰 전체로 늘어나면서 가운데서 진화, 트레이너·메가스톤 반응은 살림') ----------
  // c.bt = 배틀 전체(.bt), c.top = 위 화면(.bt-top), c.monEl = 메가진화하는 포켓몬 칸. 위 화면을 그 포켓몬 쪽으로 화면 가득 당긴 뒤
  // 트레이너 컷인(키스톤) ↔ 메가스톤 빛줄기 → 포켓몬 하얗게·빛 모임·떨림 → 번쩍 → 가운데 메가 모습 크게 + 빛살·충격파 → 원래 화면으로
  async function megaFull(c) {
    const P = c.path; await preload({ ...c, extra: [P + 'particle.png', P + 'Mega/mark.png', P + 'burst.png'] });
    const bt = c.bt, top = c.top, R0 = bt.getBoundingClientRect(), Wd = bt.offsetWidth, Hd = bt.offsetHeight, q = R0.width / Wd || 1, rel = r => ({ left: (r.left - R0.left) / q, top: (r.top - R0.top) / q, width: r.width / q, height: r.height / q }), R = { left: 0, top: 0 }, tR = rel(top.getBoundingClientRect()), mR = rel((c.monEl.querySelector('img') || c.monEl).getBoundingClientRect());   // 바깥에서 줄여 보여도(시연 틀) 배틀 안쪽 좌표로
    const k0 = tR.width / 256, mhU = mR.height / k0, zt = Math.max(k0 * 1.5, Math.min(k0 * 2.6, Hd * .25 / mhU)), mcx = (mR.left + mR.width / 2 - tR.left) / k0, mcy = (mR.top + mR.height * .5 - tR.top) / k0;
    const tx = (mR.left + mR.width / 2) - mcx * zt, ty = Hd * .5 - mcy * zt - tR.top;   // 그 포켓몬 가로 자리는 그대로 두고 키우며 수직으로만 내림 (경완 2026-11-12 '대각으로 말고 수직으로, 중앙까진 안 맞춰도 됨'), 남는 곳은 뒤 배경판
    const T0 = getComputedStyle(top).transform, tAnim = [], timers = [], A = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'ease-out', ...o });   // 'both' 면 뒤에 시작할 애니메이션 첫 칸이 미리 덮어씀
    const hide = [...bt.querySelectorAll('.bt-hb,.bt-pty,.bt-bot,.bt-mid,.bt-msg')];
    const root = document.createElement('div'); root.className = 'dx-scene mgf'; root.style.cssText = 'position:absolute;inset:0;z-index:80;overflow:hidden;pointer-events:auto;contain:strict;transform:scale(1.08)';   // 흔들 때 가장자리 빈틈 안 보이게 늘 조금 크게
    const mk = (css, tag = 'div') => { const e = document.createElement(tag); e.style.cssText = 'position:absolute;pointer-events:none;' + css; root.appendChild(e); return e; };
    const mon = c.monEl.querySelector('img'), opp = c.opp, side = opp ? 1 : -1;
    // 층
    const dim = mk('inset:0;background:radial-gradient(circle at 50% 50%,rgba(30,8,60,.35) 0 22%,rgba(4,0,12,.96) 70%);opacity:0');
    const lines = mk(`inset:-10%;background:url(${P}burst.png) center/cover;filter:hue-rotate(70deg) saturate(1.6);mix-blend-mode:screen;opacity:0`);
    const rays = mk(`left:50%;top:52%;width:${Math.hypot(Wd, Hd) * 1.3}px;height:${Math.hypot(Wd, Hd) * 1.3}px;margin:${-Math.hypot(Wd, Hd) * .65}px 0 0 ${-Math.hypot(Wd, Hd) * .65}px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.32) 0 4deg,rgba(255,255,255,0) 4deg 14deg);-webkit-mask:radial-gradient(circle,#000 10%,transparent 62%);mask:radial-gradient(circle,#000 10%,transparent 62%);opacity:0;mix-blend-mode:screen`);
    const rainbow = mk(`left:50%;top:52%;width:${Wd * 1.1}px;height:${Wd * 1.1}px;margin:${-Wd * .55}px 0 0 ${-Wd * .55}px;border-radius:50%;background:conic-gradient(#ff4d6d,#ffb347,#fff275,#6dff8a,#4dd2ff,#7a6dff,#ff6df0,#ff4d6d);filter:blur(${Wd * .06}px);opacity:0;mix-blend-mode:screen`);
    const glow = mk(`left:50%;top:52%;width:${Wd * .9}px;height:${Wd * .9}px;margin:${-Wd * .45}px 0 0 ${-Wd * .45}px;border-radius:50%;background:radial-gradient(circle,#fff 0 18%,rgba(255,240,255,.9) 30%,rgba(190,140,255,.45) 50%,rgba(120,80,255,0) 70%);opacity:0;transform:scale(.2)`);
    // 원래 앞모습(org) → 메가 모습(meg): 둘 다 가운데, 같은 배율 (경완 2026-11-12 '진화하기 전에 원래 앞모습 나와서 진화하는 모습')
    const ow = c.mon.w / 2, oh = c.mon.h / 2, mw = c.to.w / 2, mh = c.to.h / 2, mz = Math.min(Hd * .36 / Math.max(mh, oh), Wd * .78 / Math.max(mw, ow)), MW = mw * mz, MH = mh * mz, OW = ow * mz, OH = oh * mz, FY = Hd * .52 + Math.max(MH, OH) * .45, CY = Hd * .52;   /* CY: 진화 전·후 모습 둘 다 이 점에 가운데 맞춤, 잔상도 가운데서 사방으로 (경완 2026-11-12) */   // FY = 발끝
    const WH = `brightness(0) invert(1) drop-shadow(0 0 ${Wd * .03}px #fff) drop-shadow(0 0 ${Wd * .05}px #c89bff)`, NORM = `brightness(1) invert(0) drop-shadow(0 0 ${Wd * .02}px rgba(255,255,255,.7)) drop-shadow(0 0 0 rgba(0,0,0,0))`;
    const sprite = (u, w, h, o = '50% 50%') => { const b = mk(`left:${(Wd - w) / 2}px;top:${CY - h / 2}px;width:${w}px;height:${h}px;opacity:0;transform-origin:${o}`), i = document.createElement('img'); i.src = u; i.alt = ''; i.style.cssText = `width:100%;height:100%;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}`; b.appendChild(i); return [b, i]; };
    const [org, orgI] = sprite(c.mon.url, OW, OH), [meg, megI] = sprite(c.to.url, MW, MH); megI.style.filter = WH;
    const icon = mk(`left:50%;top:${CY - MH / 2 - 54 * mz * .45 - 8}px;width:${44 * mz * .45}px;height:${54 * mz * .45}px;margin-left:${-22 * mz * .45}px;background:url(${P}Mega/mark.png) center/contain no-repeat;opacity:0;filter:drop-shadow(0 0 6px #fff)`);
    // 트레이너 컷인 띠
    const bandH = Hd * .3, band = mk(`left:-10%;right:-10%;top:${Hd * .66}px;height:${bandH}px;background:linear-gradient(${opp ? 'to left' : 'to right'},rgba(255,255,255,.95),rgba(220,190,255,.9) 45%,rgba(120,70,220,.0));transform:skewY(-8deg) translateX(${side * 110}%);opacity:0;box-shadow:0 0 30px rgba(180,120,255,.8)`);
    const tw = c.tr.w / 2, th = c.tr.h / 2, tz = bandH * 1.25 / th, TW = tw * tz, TH = th * tz, trX = opp ? Wd - TW - Wd * .02 : Wd * .02;
    const trn = mk(`left:${trX}px;top:${Hd * .66 + bandH - TH}px;width:${TW}px;height:${TH}px;background:url(${c.tr.url}) left center/${c.tr.w / 2 * tz}px ${TH}px no-repeat;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}opacity:0`);
    const ks = c.item ? mk(`left:${opp ? trX + TW * .15 : trX + TW * .62}px;top:${Hd * .66 + bandH - TH * .78}px;width:${Wd * .13}px;height:${Wd * .13}px;background:url(${c.item.url}) center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 10px #e0b0ff);opacity:0`) : null;
    const ms = c.stone ? mk(`left:${Wd / 2 - Wd * .09}px;top:${Hd * .5 - mhU * zt * .55 - Wd * .2}px;width:${Wd * .18}px;height:${Wd * .18}px;background:url(${c.stone.url}) center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 12px #ffe08a);opacity:0`) : null;
    // 키스톤 → 메가스톤 빛줄기 (두 줄이 꼬이며 이어짐)
    const beam = mk('inset:0;opacity:0', 'canvas'); beam.width = Wd * 2; beam.height = Hd * 2; beam.style.width = Wd + 'px'; beam.style.height = Hd + 'px';
    const parts = Array.from({ length: 26 }, (_, i) => mk(`left:0;top:0;width:${Wd * .06}px;height:${Wd * .06}px;background:url(${P}particle.png) center/contain;opacity:0;mix-blend-mode:screen;filter:hue-rotate(${i * 37}deg) saturate(2)`));
    const ring = mk(`left:50%;top:52%;width:${Wd * .4}px;height:${Wd * .4}px;margin:${-Wd * .2}px 0 0 ${-Wd * .2}px;border-radius:50%;border:${Wd * .025}px solid #fff;box-shadow:0 0 24px #d6a8ff,inset 0 0 24px #d6a8ff;opacity:0`);
    const ring2 = mk(`left:50%;top:52%;width:${Wd * .4}px;height:${Wd * .4}px;margin:${-Wd * .2}px 0 0 ${-Wd * .2}px;border-radius:50%;border:${Wd * .015}px solid #ffe7a8;opacity:0`);
    const flash = mk('inset:0;background:#fff;opacity:0');
    const ds = top.parentNode, bgF = document.createElement('div'); bgF.className = 'mgf-bg'; bgF.style.cssText = `position:absolute;inset:-6%;z-index:0;pointer-events:none;background:url(${c.bg.url}) ${-(256 * Hd * 1.12 / 150 - Wd * 1.12) / 2}px 0/${512 * Hd * 1.12 / 150}px ${192 * Hd * 1.12 / 150}px no-repeat;image-rendering:pixelated;filter:blur(3px) brightness(.55) saturate(1.2);opacity:0`; ds.insertBefore(bgF, ds.firstChild);
    const MK = 'linear-gradient(to bottom,transparent,#000 14%,#000 84%,transparent),linear-gradient(to right,transparent,#000 10%,#000 90%,transparent)';   // 키운 위 화면 가장자리가 뒤 배경판에 스며들게
    top.style.webkitMaskImage = top.style.maskImage = MK; top.style.webkitMaskComposite = 'source-in'; top.style.maskComposite = 'intersect';
    bt.appendChild(root);
    const at = (t, f) => timers.push(setTimeout(() => { try { f(); } catch (e) {} }, t));
    // 경완 2026-11-12 '메가진화 할 때 진동 좀 더 빡세게': 진동은 늘 가장 센 단계(2)로, 단계가 클수록 여러 번 연달아 + 화면이 흔들리는 동안 계속 우르르
    const hz = () => { try { window.GA?.haptic?.(2); } catch (e) {} };
    const vib = n => { const c = [1, 2, 4, 7][n] || 2; for (let i = 0; i < c; i++) timers.push(setTimeout(hz, i * 70)); };
    const shake = (t, d, amp) => at(t, () => { A(root, Array.from({ length: 9 }, (_, i) => ({ transform: i === 8 ? 'scale(1.08)' : `translate(${(Math.random() - .5) * amp * 2}px,${(Math.random() - .5) * amp * 2}px) scale(1.08)` })), { duration: d, easing: 'linear', fill: 'none' }); for (let q = 0; q < d; q += 80) timers.push(setTimeout(hz, q)); });
    // 1) 위 화면을 그 포켓몬 쪽으로 화면 가득 (0~900)
    hide.forEach(e => tAnim.push(A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 })));
    tAnim.push(A(top, [{ transform: T0 === 'none' ? 'none' : T0 }, { transform: `translate(${tx}px,${ty}px) scale(${zt})` }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)' }));
    tAnim.push(A(bgF, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)' }));
    at(0, () => c.se('fog2')); at(600, () => vib(1));
    // 2) 어두워지며 원래 앞모습이 가운데 (850~1500)
    A(dim, [{ opacity: 0 }, { opacity: .88 }], { duration: 600, delay: 850 });
    A(org, [{ opacity: 0, transform: 'scale(.8) translateY(10px)' }, { opacity: 1, transform: 'scale(1.04)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 600, delay: 950 });
    at(950, () => { c.se('Battle throw'); if (mon) mon.style.visibility = 'hidden'; });   // 키운 뒷모습은 숨기고 가운데 앞모습만
    // 3) 트레이너 컷인 + 키스톤, 메가스톤 반응 (1700~2700)
    A(band, [{ opacity: 1, transform: `skewY(-8deg) translateX(${side * 110}%)` }, { opacity: 1, transform: 'skewY(-8deg) translateX(0)' }], { duration: 420, delay: 1700, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
    A(trn, [{ opacity: 0, transform: `${opp ? '' : 'scaleX(-1) '}translateX(${side * 70}px)` }, { opacity: 1, transform: `${opp ? '' : 'scaleX(-1) '}translateX(0)` }], { duration: 450, delay: 1780 });
    at(1720, () => c.se('Battle recall'));
    at(2250, () => { c.se('DX Action'); vib(1); });
    if (ks) A(ks, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.6)', offset: .6 }, { opacity: 1, transform: 'scale(1.1)' }], { duration: 500, delay: 2250 });
    if (ks) at(2750, () => ks.animate([{ transform: 'scale(1.1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1.1)' }], { duration: 380, iterations: 4, composite: 'replace' }));
    at(2500, () => c.se('Saint7'));
    if (ms) A(ms, [{ opacity: 0, transform: 'translateY(24px) scale(.3)' }, { opacity: 1, transform: 'translateY(0) scale(1.5)', offset: .6 }, { opacity: 1, transform: 'scale(1.1)' }], { duration: 520, delay: 2500 });
    if (ms) at(3000, () => ms.animate([{ transform: 'scale(1.1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1.1)' }], { duration: 380, iterations: 3 }));
    // 4) 빛줄기 이어짐 (2900~4100)
    at(2900, () => { c.se('Psych Up'); vib(1); const g = beam.getContext('2d'); const ax = (ks ? parseFloat(ks.style.left) + Wd * .065 : trX + TW / 2) * 2, ay = (ks ? parseFloat(ks.style.top) + Wd * .065 : Hd * .7) * 2, bx = Wd, by = (ms ? parseFloat(ms.style.top) + Wd * .09 : Hd * .4) * 2, t0 = performance.now();
      beam.style.opacity = 1; const draw = now => { const p = Math.min(1, (now - t0) / 650), q = (now - t0) / 1000; g.clearRect(0, 0, beam.width, beam.height); g.globalCompositeOperation = 'lighter';
        [[0, '#ff8af0'], [Math.PI, '#8ad8ff']].forEach(([ph, col]) => { g.beginPath(); for (let i = 0; i <= 60 * p; i++) { const u = i / 60, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, n = Math.sin(u * 9 + q * 12 + ph) * Wd * .05 * Math.sin(u * Math.PI); const nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny); i ? g.lineTo(x + nx / L * n, y + ny / L * n) : g.moveTo(x, y); } g.strokeStyle = col; g.lineWidth = Wd * .02; g.shadowColor = col; g.shadowBlur = 30; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = Wd * .007; g.stroke(); });
        if (now - t0 < 1200 && root.isConnected) requestAnimationFrame(draw); else A(beam, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }); };
      requestAnimationFrame(draw); });
    // 5) 메가스톤 빛이 포켓몬에게, 하얗게 빛남, 빛 모임·떨림 (4000~6000)
    [band, trn, ks].forEach(e => e && A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 4000 }));
    if (ms) A(ms, [{ opacity: 1, transform: 'scale(1.1)' }, { opacity: 0, transform: `translateY(${CY - parseFloat(ms.style.top) - Wd * .09}px) scale(2.6)` }], { duration: 500, delay: 3950, easing: 'ease-in' });
    at(4300, () => { orgI.animate([{ filter: NORM }, { filter: WH }], { duration: 500, fill: 'forwards' }); c.se('Psych Up'); vib(1); });
    A(rainbow, [{ opacity: 0, transform: 'scale(.3) rotate(0)' }, { opacity: .55, transform: 'scale(1) rotate(300deg)' }], { duration: 1800, delay: 4300, easing: 'ease-in' });
    A(glow, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: .9, transform: 'scale(1)' }], { duration: 1800, delay: 4300, easing: 'ease-in' });
    A(lines, [{ opacity: 0 }, { opacity: .35 }], { duration: 800, delay: 4400 });
    parts.forEach((p, i) => { const a = i / parts.length * Math.PI * 2 + Math.random() * .3, r = Math.hypot(Wd, Hd) * (.55 + Math.random() * .25), cx = Wd / 2 - Wd * .03, cy = Hd * .52 - Wd * .03;
      A(p, [{ opacity: 0, transform: `translate(${cx + Math.cos(a) * r}px,${cy + Math.sin(a) * r}px) scale(1.6)` }, { opacity: 1, offset: .2 }, { opacity: 1, transform: `translate(${cx}px,${cy}px) scale(.3)` }], { duration: 800, delay: 4400 + (i % 13) * 110, easing: 'cubic-bezier(.6,0,1,.6)' }); });
    shake(4600, 400, 2); shake(5100, 400, 4); at(4700, () => vib(1)); at(5200, () => { vib(2); c.se('Psych Up'); });
    // 6) 진화하는 모습: 하얀 원래 모습이 서서히 더 밝아지며 둘레 게이지가 차오름 → 다 차면 팍 터짐 (경완 2026-11-12 '깜빡이기보다 서서히 빛나면서 게이지 모이는 느낌, 팍 터지면서 진화')
    at(5000, () => { [org, meg].forEach(e => e.getAnimations().forEach(a => a.cancel())); org.style.opacity = 1; meg.style.opacity = 0; c.se('Charge');
      const D = 1350, R0 = Math.min(Math.max(OW, OH) * .62, Wd * .4), cx = Wd / 2, cy = CY, gz = R0 * 2 + 40, cir = 2 * Math.PI * R0;
      const gw = document.createElement('div'); gw.style.cssText = `position:absolute;pointer-events:none;left:${cx - gz / 2}px;top:${cy - gz / 2}px;width:${gz}px;height:${gz}px;filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 10px #ff8ad8) drop-shadow(0 0 18px #8ab8ff)`;
      gw.innerHTML = `<svg width="${gz}" height="${gz}" viewBox="0 0 ${gz} ${gz}"><circle cx="${gz / 2}" cy="${gz / 2}" r="${R0}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="${Wd * .018}"/><circle class="gv" cx="${gz / 2}" cy="${gz / 2}" r="${R0}" fill="none" stroke="#fff6ff" stroke-width="${Wd * .024}" stroke-linecap="round" stroke-dasharray="${cir}" stroke-dashoffset="${cir}" transform="rotate(-90 ${gz / 2} ${gz / 2})"/></svg>`;
      root.insertBefore(gw, flash); const gv = gw.querySelector('.gv');
      gw.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, fill: 'forwards', easing: 'ease-out' });
      gv.animate([{ strokeDashoffset: cir }, { strokeDashoffset: 0 }], { duration: D, fill: 'forwards', easing: 'cubic-bezier(.5,0,.85,.6)' });   /* 처음엔 천천히, 끝으로 갈수록 빨리 차오름 */
      gw.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(200deg)' }], { duration: D, fill: 'forwards', easing: 'ease-in', composite: 'add' });
      org.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .5 }, { transform: 'scale(1.38)' }], { duration: D, fill: 'forwards', easing: 'cubic-bezier(.55,0,.9,.5)' });   /* 경완 '흰 실루엣 크기 서서히 커지다가 팍 터지게' */
      orgI.animate([{ filter: WH }, { filter: `brightness(0) invert(1) drop-shadow(0 0 ${Wd * .06}px #fff) drop-shadow(0 0 ${Wd * .12}px #e2c8ff)` }], { duration: D, fill: 'forwards', easing: 'ease-in' });
      A(glow, [{ opacity: .9, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.45)' }], { duration: D, easing: 'ease-in' });
      [300, 650, 950, 1180].forEach((t, j) => at(t, () => { c.se('Ice5'); vib(1 + (j > 1)); }));   /* 차오르는 반짝 소리, 점점 촘촘히 */
      at(D, () => { org.animate([{ transform: 'scale(1.38)', opacity: 1 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 160, fill: 'forwards', easing: 'ease-out' }); c.se('Saint7'); gw.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.4)' }], { duration: 300, fill: 'forwards', easing: 'ease-out' }); }); });
    shake(5700, 600, 8); at(5900, () => vib(2));
    // 7) 번쩍 + 메가 모습 (6300~)
    A(glow, [{ opacity: 1, transform: 'scale(1.45)' }, { opacity: 1, transform: 'scale(.35)' }], { duration: 120, delay: 6360, easing: 'ease-in' });
    A(flash, [{ opacity: 0 }, { opacity: 1 }, { opacity: 1, offset: .5 }, { opacity: 0 }], { duration: 620, delay: 6450, easing: 'linear' });
    at(6480, () => { c.se('Explosion3'); c.se('Burst'); c.se('fog2'); vib(3); org.style.opacity = 0; meg.style.opacity = 0; if (mon) mon.style.visibility = 'hidden'; });
    at(6550, () => { A(dim, [{ opacity: .88 }, { opacity: 1 }], { duration: 400 }); A(glow, [{ opacity: .9, transform: 'scale(1.2)' }, { opacity: .3, transform: 'scale(1.6)' }], { duration: 800 }); });
    at(6650, () => A(meg, [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(.93)', offset: .55 }, { opacity: 1, transform: 'scale(1)' }], { duration: 650, easing: 'cubic-bezier(.2,1.4,.4,1)' }));   /* 5000 에서 meg 애니메이션을 지우므로 그 뒤에 만듦 (안 그러면 하얀 실루엣만 남음) */
    at(6880, () => { for (let i = 0; i < 5; i++) { const [g, gi] = sprite(c.to.url, MW, MH); gi.style.filter = `brightness(0) invert(1) sepia(1) saturate(6) hue-rotate(${[280, 230, 170, 100, 20][i]}deg) brightness(1.1) drop-shadow(0 0 ${Wd * .04}px #fff)`; g.style.mixBlendMode = 'screen';   /* 경완 '화악 터지는 듯한 잔상': 하얀 메가 모습이 번져 나가며 사라짐 */
      A(g, [{ opacity: .9 - i * .08, transform: 'scale(1)' }, { opacity: 0, transform: `scale(${1.6 + i * .4})` }], { duration: 800 + i * 140, delay: i * 80, easing: 'cubic-bezier(.1,.7,.3,1)' }); } });
    at(6750, () => megI.animate([{ filter: WH }, { filter: NORM }], { duration: 900, fill: 'forwards' }));
    A(rays, [{ opacity: 0, transform: 'rotate(0) scale(.6)' }, { opacity: 1, transform: 'rotate(30deg) scale(1)', offset: .12 }, { opacity: .9, transform: 'rotate(200deg) scale(1.05)' }], { duration: 4100, delay: 6550, easing: 'linear' });
    A(rainbow, [{ opacity: .55, transform: 'scale(1) rotate(300deg)' }, { opacity: .14, transform: 'scale(1.5) rotate(640deg)' }], { duration: 4100, delay: 6550, easing: 'linear' });
    A(lines, [{ opacity: .35 }, { opacity: .45 }], { duration: 300, delay: 6550 });
    [ring, ring2].forEach((r, i) => A(r, [{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: `scale(${5 + i * 2})` }], { duration: 900 + i * 250, delay: 6650 + i * 150, easing: 'cubic-bezier(.1,.7,.3,1)' }));
    shake(6650, 650, 12); at(7000, () => (c.cryBig || c.cry)());
    A(icon, [{ opacity: 0, transform: 'translateY(16px) scale(.4)' }, { opacity: 1, transform: 'translateY(0) scale(1.25)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 500, delay: 7300 });
    at(7300, () => c.se('Saint7'));
    // 8) 원래 화면으로 (8800~)
    const END = 10800;   /* 경완 '진화하고 나서 모습 좀 더 길게': 메가 모습 1.5초 더 */
    return new Promise(res => { let done = false;
      const fin = () => { if (done) return; done = true; try { c.onSwap?.(); } catch (e) {} timers.forEach(t => { clearTimeout(t); clearInterval(t); }); if (mon) { if (mon.dataset.mgf != null) { mon.style.filter = mon.dataset.mgf; delete mon.dataset.mgf; } mon.style.visibility = ''; }
        top.style.webkitMaskImage = top.style.maskImage = '';   /* 돌아갈 때 가장자리 마스크 먼저 지움 (검은 테두리 안 보이게) */
        const back = [A(top, [{ transform: `translate(${tx}px,${ty}px) scale(${zt})` }, { transform: T0 === 'none' ? 'none' : T0 }], { duration: 420, easing: 'cubic-bezier(.5,0,.2,1)' }), ...hide.map(e => A(e, [{ opacity: 1 }, { opacity: 1 }], { duration: 420 })), A(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })];   /* 아래 화면 등은 바로 보이게: 늦게 나오면 그 틈에 검은 바탕이 보임 (경완 2026-11-12) */
        tAnim.forEach(a => a.cancel()); back.push(A(bgF, [{ opacity: 1 }, { opacity: 1 }], { duration: 420 })); Promise.all(back.map(a => a.finished.catch(() => {}))).then(() => { back.forEach(a => a.cancel()); root.remove(); bgF.remove(); top.style.webkitMaskImage = top.style.maskImage = top.style.webkitMaskComposite = top.style.maskComposite = ''; res(); }); };
      /* 경완 2026-11-13 '메가진화 연출 막 누르면 스킵됨 → 연출 끝날 때까지 화면 잠금': 누르면 건너뛰기 없앰, 화면 전체를 덮는 투명 막으로 아래 버튼도 못 누르게 */
      const lk = document.createElement('div'); lk.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:transparent;touch-action:none'; const eat = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }; ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(t => lk.addEventListener(t, eat, { passive: false })); document.body.appendChild(lk);
      setTimeout(() => { lk.remove(); fin(); }, END - 500); });
  }

  // ---------- Z기술 ([DBK] Z-Power [008] Z-Move Animation.rb) ----------
  async function zmove(c) {
    const P = c.path, [tO, tB] = tyCol(c.type); await preload({ ...c, extra: [P + 'burst.png', P + 'Z-Power/particle.png', P + 'pulse.png', c.title] });
    const sc = scene(c.host), tr = !c.wild, BG = bgOf(sc, c), [BS, bw] = bases(sc, c, 0, CX, CY, tr), [TR, IT] = tr ? trainerItem(sc, c, 0, bw) : [];
    const OV = overlay(sc, P + 'burst.png'), PK = monPic(sc, c, c.mon, tr, { outline: tO }), feet = PK.init.y;
    const CR = c.stone ? spr(sc, c.stone.url, CX, feet - c.mon.h + c.mon.top, c.stone.w, c.stone.h, 'b', 0, 100, { outline: [255, 255, 255] }) : null;
    const PT = particles(sc, P + 'Z-Power/particle.png', CX, CY, 200), oy = c.wild ? CY : CY + 20, PU = spr(sc, P + 'pulse.png', CX, oy, 0, 0, 'c', 255, 50);
    const up = c.upper, TT = c.title ? sc.add({ src: c.title, iw: c.titleW, ih: c.titleH, org: 'c', x: W - c.titleW / 2, y: up ? c.titleH / 2 : H - c.titleH / 2, zoom: 300, op: 0, outline: tO }) : null; if (TT) TT.init.tone = [255, 255, 255, 255];
    const F = fade(sc);
    let d = fadeIn(sc, F, [BG, BS[BS.length - 1], PK]);
    if (tr) { TR.vis(d + 4, 1); BS[0].vis(d + 4, 1); const dl = Math.floor(bw * .75) * (c.opp ? -1 : 1); TR.delta(d + 4, 8, dl, 0); BS[0].delta(d + 4, 8, dl, 0); d = TR.total + 1;
      TR.se(d, () => c.se('DX Action')); if (IT) { IT.vis(d, 1); IT.delta(d, 15, 0, -20); IT.op(d, 15, 255); } d = Math.max(TR.total, IT?.total || 0); }
    if (CR) { CR.vis(d, 1); CR.delta(d, 15, 0, -20); CR.op(d, 15, 255); }
    OV.vis(d, 1); OV.op(d, 30, 255); particleRun(PT, d, CX, CY);
    BG.color(d, 15, [...tB, 180]); BG.tone(d, 15, [-200, -200, -200, 0]); BS.forEach(p => { p.color(d, 15, [...tB, 180]); p.tone(d, 15, [-200, -200, -200, 0]); });
    PK.tone(d, 15, [255, 255, 255, 255]); d = PK.total; d = shake([PK], d, 16, 0, 2);
    F.color(d, 0, [255, 255, 255, 255]); F.op(d, 12, 255); d = F.total; OV.vis(d, 0); IT?.vis(d, 0); CR?.vis(d, 0); PK.tone(d, 6, [0, 0, 0, 0]); F.op(d, 6, 0); F.color(d + 6, 0, [0, 0, 0, 0]); d = F.total;
    if (TT) { TT.se(d, () => c.se('Z-Move Title')); TT.vis(d, 1); TT.op(d, 4, 255); TT.zoom(d, 4, 100); d = TT.total; const x0 = TT.init.x, y0 = TT.init.y;
      for (let i = 0; i < 16; i++) { TT.moveXY(d, .5, x0 + 8, y0); TT.moveXY(d + .5, .5, x0 - 8, y0); d = TT.total; }
      TT.moveXY(d, .5, x0, y0); PU.vis(d, 1); PU.zoom(d, 5, 1000); PU.op(d + 2, 5, 0); TT.tone(d, 0, [0, 0, 0, 0]); d = Math.max(TT.total, PU.total); }
    F.op(d + 20, 8, 255);
    return sc.run();
  }

  // ---------- Z기술 전체 화면 연출 (경완 2026-11-13 '메가랑 똑같으면 재미없으니 본가·애니 고증으로') ----------
  // 본가(썬·문): 트레이너가 Z링을 빛내며 타입별 Z포즈 → 트레이너 몸에서 Z파워가 포켓몬에게 흘러감 → 포켓몬이 금빛 Z파워를 두름 → 기술 이름이 크게.
  // 애니: 팔을 X자로 교차해 Z링이 번쩍 → 포즈 동작마다 몸 둘레에 빛 자국 → 트레이너와 포켓몬 마음이 하나로(같은 자세) → 기술.
  // 메가(포켓몬 쪽으로 화면을 당김·하얀 실루엣·게이지)와 달리 Z는 '트레이너가 주인공': 트레이너 무대 → 빛 자국 Z → 무지개 띠로 포켓몬에게 → 금빛 불꽃 기운 → 기술 이름 쾅.
  // c.bt·c.top·c.monEl 은 megaFull 과 같음. c.zName = 한국어 기술 이름, c.type = 타입 영어, c.stone = Z크리스탈 그림, c.item = Z링 그림
  /* 경완 2026-11-13 'Z기술 할 때 bgm': 7.3초 장면에 맞춰 WebAudio 로 만든 짧은 곡 (D단조로 쌓다가 기술 이름에서 D장조로 터짐). 배경 곡은 그동안 줄임 */
  function zBgm(ms) {
    let ctx = null; try { ctx = window.GA?.audio?.(); } catch (e) {} if (!ctx) return () => {};
    let on = true; try { on = window.GA?.bgmOn?.() !== false; } catch (e) {} let v = .1; try { v = window.GA?.sfxVol?.() ?? .1; } catch (e) {} if (!on || !v) return () => {};
    const T0 = ctx.currentTime + .03, t = x => T0 + x / 1000, M = ctx.createGain(), C = ctx.createDynamicsCompressor(); M.gain.value = Math.min(1.2, 3.2 * v); M.connect(C); C.connect(ctx.destination);
    const hz = n => 440 * 2 ** ((n - 69) / 12), nodes = [];
    const tone = (type, n, a, d, vol, o = {}) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.type = type; os.frequency.setValueAtTime(hz(n), t(a)); if (o.to) os.frequency.exponentialRampToValueAtTime(hz(o.to), t(a + d)); if (o.det) os.detune.value = o.det;
      let out = os; if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t(a)); if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t(a + d)); os.connect(f); out = f; }
      out.connect(g); g.connect(M); const at0 = o.att || 8; g.gain.setValueAtTime(0, t(a)); g.gain.linearRampToValueAtTime(vol, t(a + at0)); if (o.hold) g.gain.setValueAtTime(vol, t(a + d - (o.rel || 60))); g.gain.exponentialRampToValueAtTime(.0001, t(a + d)); os.start(t(a)); os.stop(t(a + d + 20)); nodes.push(os); };
    let nb = null; const noise = (a, d, vol, f1, f2, q = 1.2, att = 5) => { if (!nb) { nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = nb; src.loop = true; f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f1, t(a)); f.frequency.exponentialRampToValueAtTime(f2, t(a + d)); src.connect(f); f.connect(g); g.connect(M);
      g.gain.setValueAtTime(0, t(a)); g.gain.linearRampToValueAtTime(vol, t(a + att)); g.gain.exponentialRampToValueAtTime(.0001, t(a + d)); src.start(t(a)); src.stop(t(a + d + 20)); nodes.push(src); };
    const kick = (a, vol = .9) => tone('sine', 40, a, 260, vol, { to: 26, att: 2 }), snare = (a, vol = .35) => { noise(a, 140, vol, 2500, 1800, .7, 2); tone('triangle', 52, a, 90, vol * .6, { to: 45, att: 2 }); };
    const hit = (a, ch, vol = .22, d = 320) => { ch.forEach(n => { tone('sawtooth', n, a, d, vol, { lp: 4200, lp2: 900, att: 4, det: -7 }); tone('square', n, a, d * .8, vol * .45, { lp: 3000, lp2: 700, att: 4, det: 7 }); }); noise(a, d * .7, vol * 1.4, 6000, 2000, .6, 2); kick(a, .9); };
    const Dm = [50, 57, 62, 65, 69], BB = [46, 53, 58, 62, 65], Am = [45, 52, 57, 61, 64], DM = [38, 50, 57, 62, 66, 69, 74];
    // 1) 깔리는 소리: 낮은 D 웅웅 (필터가 열림) + 8분 베이스 + 큰북
    tone('sawtooth', 38, 0, 3600, .16, { lp: 220, lp2: 1400, att: 600, hold: 1, rel: 300 }); tone('sawtooth', 26, 0, 3600, .12, { lp: 160, lp2: 600, att: 600, hold: 1, rel: 300, det: 5 });
    for (let k = 0; k < 18; k++) { const a = 200 + k * 190; tone('square', k % 4 === 3 ? 41 : 38, a, 150, .08, { lp: 900, att: 3 }); if (k % 2 === 0) kick(a, .55); }
    // 2) 포즈 박자마다 오케스트라 히트 (Z크리스탈 끼움 · X자 · Z 세 획 · 번쩍)
    hit(1370, Dm, .2, 380); hit(1650, BB, .2, 380); hit(2250, Dm, .17, 260); hit(2550, BB, .17, 260); hit(2850, Am, .19, 300); hit(3150, Dm, .24, 520);
    [2250, 2550, 2850].forEach((a, i) => tone('triangle', 74 + i * 3, a, 240, .12, { att: 4 }));
    // 3) 무지개 띠·Z파워 (3500~5450): 올라가는 소리 + 점점 빨라지는 작은북 + 위로 도는 아르페지오
    noise(3500, 1950, .28, 300, 7000, 1.6, 900); tone('sawtooth', 50, 3500, 1950, .1, { to: 74, lp: 1200, lp2: 6000, att: 400 }); tone('sawtooth', 57, 3500, 1950, .07, { to: 81, lp: 1200, lp2: 6000, att: 400, det: 9 });
    for (let a = 3500, g = 180; a < 5420; a += g, g = Math.max(45, g * .9)) snare(a, .12 + (a - 3500) / 1950 * .25);
    const arp = [62, 65, 69, 74, 77, 81]; for (let k = 0; k < 20; k++) tone('triangle', arp[k % 6] + (k > 11 ? 12 : 0), 4250 + k * 55, 120, .07, { att: 3 });
    // 4) 기술 이름 쾅 (5550): D장조로 터짐 + 심벌 + 낮게 떨어지는 쿵 → 남는 울림
    hit(5550, DM, .2, 1500); noise(5550, 1700, .22, 9000, 4000, .4, 3); tone('sine', 38, 5730, 1100, .9, { to: 22, att: 3 }); hit(5730, [38, 50, 57, 62], .16, 900);
    tone('sawtooth', 62, 6000, 1250, .07, { lp: 2500, lp2: 600, att: 200 }); tone('sawtooth', 66, 6000, 1250, .06, { lp: 2500, lp2: 600, att: 200, det: 8 }); tone('sawtooth', 69, 6000, 1250, .06, { lp: 2500, lp2: 600, att: 200, det: -8 });
    try { window.GymBGM?.duck?.(0, .35); } catch (e) {}
    return () => { try { const n = ctx.currentTime; M.gain.cancelScheduledValues(n); M.gain.setValueAtTime(M.gain.value, n); M.gain.linearRampToValueAtTime(0, n + .25); setTimeout(() => nodes.forEach(o => { try { o.stop(); } catch (e) {} }), 300); } catch (e) {} try { window.GymBGM?.duck?.(1, .8); } catch (e) {} };
  }
  async function zFull(c) {
    const P = c.path; await preload({ ...c, extra: [P + 'particle.png', P + 'Z-Power/particle.png'] });
    const bt = c.bt, R0 = bt.getBoundingClientRect(), Wd = bt.offsetWidth, Hd = bt.offsetHeight, q = R0.width / Wd || 1, rel = r => ({ left: (r.left - R0.left) / q, top: (r.top - R0.top) / q, width: r.width / q, height: r.height / q });
    const mon = c.monEl.querySelector('img'), mR = rel((mon || c.monEl).getBoundingClientRect()), opp = c.opp, side = opp ? 1 : -1;
    const [tO, tB] = tyCol(c.type), TY = rgba(tO, 1), TYD = rgba(tB, 1), GOLD = '#ffd54a', FONT = getComputedStyle(bt).fontFamily;
    const timers = [], A = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'ease-out', ...o }), at = (t, f) => timers.push(setTimeout(() => { try { f(); } catch (e) {} }, t));
    const hz = () => { try { window.GA?.haptic?.(2); } catch (e) {} }, vib = n => { for (let i = 0; i < ([1, 2, 4, 7][n] || 2); i++) timers.push(setTimeout(hz, i * 70)); };
    const hide = [...bt.querySelectorAll('.bt-hb,.bt-pty,.bt-bot,.bt-mid,.bt-msg')];
    const root = document.createElement('div'); root.className = 'dx-scene zf'; root.style.cssText = 'position:absolute;inset:0;z-index:80;overflow:hidden;pointer-events:auto;contain:strict;transform:scale(1.06)';
    const mk = (css, tag = 'div', par = root) => { const e = document.createElement(tag); e.style.cssText = 'position:absolute;pointer-events:none;' + css; par.appendChild(e); return e; };
    const shake = (t, d, amp, el = root) => at(t, () => { el.animate(Array.from({ length: 9 }, (_, i) => ({ transform: i === 8 ? 'scale(1.06)' : `translate(${(Math.random() - .5) * amp * 2}px,${(Math.random() - .5) * amp * 2}px) scale(1.06)` })), { duration: d, easing: 'linear' }); for (let k = 0; k < d; k += 80) timers.push(setTimeout(hz, k)); });
    // ── 층 ──
    const mix = (cc, k) => `rgb(${cc.map((v, i) => Math.round(v * k + [6, 4, 14][i] * (1 - k))).join(',')})`;   /* 불투명 색으로: 반투명이면 숨긴 아래 화면이 비쳐 얼룩짐 */
    const dim = mk(`inset:0;background:radial-gradient(ellipse at 50% 55%,${rgba(tB, .42)} 0,rgba(6,4,14,.66) 70%);opacity:0`);   /* 경완 2026-11-14: 기술 이름 때 뒤 배틀 화면이 어둡게 비치게 (검정으로 덮지 않음) */
    // 1) 트레이너 무대: 비스듬한 타입 색 띠 + 흐르는 집중선 (본가 Z포즈 컷처럼 트레이너만 크게)
    const stg = mk(`left:-20%;right:-20%;top:${-Hd * .15}px;height:${Hd * 1.3}px;transform:skewY(${opp ? 7 : -7}deg) translateX(${side * 120}%);opacity:0;overflow:hidden;background:linear-gradient(${opp ? 'to left' : 'to right'},${rgba(tO, .95)},${rgba(tB, .85)} 55%,rgba(20,10,30,.92));box-shadow:0 0 0 ${Wd * .012}px #fff,0 0 40px ${rgba(tO, .9)}`);
    const spd = mk(`inset:-30% -10%;background:repeating-linear-gradient(${opp ? 180 : 0}deg,rgba(255,255,255,0) 0 ${Wd * .05}px,rgba(255,255,255,.28) ${Wd * .05}px ${Wd * .056}px,rgba(255,255,255,0) ${Wd * .056}px ${Wd * .13}px);transform:skewY(${opp ? -7 : 7}deg)`, 'div', stg);
    spd.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: `0 ${side * Hd * .6}px` }], { duration: 700, iterations: Infinity, easing: 'linear' });
    const big = mk(`left:50%;top:50%;width:${Wd * .9}px;height:${Wd * .9}px;margin:${-Wd * .45}px 0 0 ${-Wd * .45}px;font:900 ${Wd * .85}px/1 ${FONT};color:rgba(255,255,255,.1);text-align:center;transform:skewY(${opp ? -7 : 7}deg)`, 'div', stg); big.textContent = 'Z';
    const tw = c.tr.w / 2, th = c.tr.h / 2, tz = Hd * .42 / th, TW = tw * tz, TH = th * tz, TX = Wd / 2 - TW / 2 + side * -Wd * .02, TT = Hd * .5 - TH * .5;
    const trn = mk(`left:${TX}px;top:${TT}px;width:${TW}px;height:${TH}px;background:url(${c.tr.url}) center/100% 100% no-repeat;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}opacity:0;filter:drop-shadow(0 0 0 #fff)`);
    const aura = mk(`left:${Wd / 2 - TW * .8}px;top:${TT - TH * .15}px;width:${TW * 1.6}px;height:${TH * 1.3}px;border-radius:45% 45% 40% 40%;background:radial-gradient(ellipse at 50% 70%,${rgba([255, 230, 120], .9)} 0,${rgba(tO, .55)} 40%,rgba(255,200,60,0) 70%);filter:blur(${Wd * .03}px);opacity:0;mix-blend-mode:screen`);
    root.insertBefore(aura, trn);
    // Z링 (팔목 자리) + Z크리스탈이 링에 끼워짐
    const RZ = Wd * .16, RX = Wd / 2 + (opp ? -TW * .18 : TW * .18) - RZ / 2, RY = TT + TH * .5 - RZ / 2;
    const zr = c.item ? mk(`left:${RX}px;top:${RY}px;width:${RZ}px;height:${RZ}px;background:url(${c.item.url}) center/contain no-repeat;image-rendering:pixelated;opacity:0;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 10px ${GOLD})`) : null;
    const cz = Wd * .11, cr = c.stone ? mk(`left:${RX + RZ / 2 - cz / 2}px;top:${RY + RZ / 2 - cz / 2}px;width:${cz}px;height:${cz}px;background:url(${c.stone.url}) center/contain no-repeat;image-rendering:pixelated;opacity:0;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 12px ${TY})`) : null;
    const pop = mk(`left:${RX + RZ / 2 - Wd * .25}px;top:${RY + RZ / 2 - Wd * .25}px;width:${Wd * .5}px;height:${Wd * .5}px;border-radius:50%;background:radial-gradient(circle,#fff 0 12%,${rgba(tO, .8)} 30%,rgba(255,255,255,0) 65%);opacity:0;mix-blend-mode:screen`);
    // 2) 포즈 빛 자국: 팔 X자 교차 → 'Z' 세 획 (캔버스, 금빛 + 타입 색 번짐)
    const cv = mk(`inset:0`, 'canvas'); cv.width = Wd * 2; cv.height = Hd * 2; cv.style.width = Wd + 'px'; cv.style.height = Hd + 'px'; const g = cv.getContext('2d');
    const ZC = { x: Wd / 2, y: TT + TH * .46 }, ZS = Math.min(TW, Wd * .5) * .62;
    const strokes = [[[-1, -.9], [1, -.9]], [[1, -.9], [-1, .9]], [[-1, .9], [1, .9]]].map(s => s.map(([x, y]) => [ZC.x + x * ZS * .5, ZC.y + y * ZS * .5]));
    const xs = [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]]].map(s => s.map(([x, y]) => [ZC.x + x * ZS * .38, ZC.y + y * ZS * .38]));
    let segs = [], cvOn = true; const t0 = performance.now();
    const line = (a, b, p, w, col, blur) => { g.beginPath(); g.moveTo(a[0] * 2, a[1] * 2); g.lineTo((a[0] + (b[0] - a[0]) * p) * 2, (a[1] + (b[1] - a[1]) * p) * 2); g.strokeStyle = col; g.lineWidth = w * 2; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = blur; g.stroke(); };
    const draw = now => { if (!root.isConnected || !cvOn) return; g.clearRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'lighter';
      segs.forEach(s => { const p = Math.min(1, (now - s.t) / s.d), f = s.fade ? Math.max(0, 1 - (now - s.fade) / 350) : 1; if (p <= 0 || f <= 0) return; g.globalAlpha = f;
        line(s.a, s.b, p, Wd * .05, rgba(tO, .55), 40); line(s.a, s.b, p, Wd * .022, GOLD, 24); line(s.a, s.b, p, Wd * .009, '#fff', 8);
        if (p < 1) { const x = s.a[0] + (s.b[0] - s.a[0]) * p, y = s.a[1] + (s.b[1] - s.a[1]) * p; g.beginPath(); g.arc(x * 2, y * 2, Wd * .035 * 2, 0, 7); g.fillStyle = '#fff'; g.shadowColor = GOLD; g.shadowBlur = 40; g.fill(); } });
      g.globalAlpha = 1; requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
    const seg = (t, a, b, d, fade) => at(t, () => segs.push({ a, b, d, t: performance.now(), fade: null, k: fade }));
    const fadeSegs = k => segs.forEach(s => { if (s.k === k) s.fade = performance.now(); });
    // 3) Z파워 무지개 띠 → 포켓몬
    const bm = mk('inset:0', 'canvas'); bm.width = Wd * 2; bm.height = Hd * 2; bm.style.width = Wd + 'px'; bm.style.height = Hd + 'px';
    const MX = mR.left + mR.width / 2, MY = mR.top + mR.height * .55, MW = Math.max(mR.width, Wd * .2), MH = Math.max(mR.height, Wd * .2);
    // 4) 포켓몬 금빛 불꽃 기운 (본가 Z파워 두름: 노랑·주황 불꽃 + 타입 색 속, 위로 올라가는 반짝이)
    const fx = mk(`left:${MX - MW}px;top:${MY - MH * 1.25}px;width:${MW * 2}px;height:${MH * 2}px;opacity:0`);
    const fl = Array.from({ length: 7 }, (_, i) => mk(`left:${MW * (.45 + i * .18) - MW * .25}px;bottom:${MH * .18}px;width:${MW * .5}px;height:${MH * (1.1 + (i % 3) * .18)}px;border-radius:50% 50% 45% 45% / 70% 70% 30% 30%;background:linear-gradient(to top,${rgba(tO, .0)},${rgba([255, 150, 40], .75)} 25%,${rgba([255, 230, 90], .9)} 55%,rgba(255,255,255,0));filter:blur(${Wd * .012}px);mix-blend-mode:screen;transform-origin:50% 100%`, 'div', fx));
    const core = mk(`left:${MW * .5}px;top:${MH * .55}px;width:${MW}px;height:${MH}px;border-radius:50%;background:radial-gradient(circle,${rgba([255, 255, 220], .9)} 0,${rgba(tO, .55)} 45%,rgba(0,0,0,0) 70%);filter:blur(${Wd * .02}px);mix-blend-mode:screen`, 'div', fx);
    /* 불꽃 기운 위에 포켓몬을 한 번 더 그려 기운에 안 묻히게. v24.40 경완 '기술 이름 사라질 때 포켓몬 동작이 프레임 점프': 복제 그림(따로 놀고 장면 scale 1.06 만큼 커짐) 대신
       캔버스에 진짜 포켓몬 그림을 매 프레임 그대로 베껴 그림 + 장면 확대만큼 되돌려서, 사라질 때 진짜 포켓몬과 딱 겹침 */
    const SC = 1.06, cX = Wd / 2, cY = Hd / 2, mw = c.monEl.closest('.bt-mw') || c.monEl, wR = rel(mw.getBoundingClientRect()), bx = { left: Math.max(mR.left, wR.left), top: Math.max(mR.top, wR.top) }; bx.width = Math.max(1, Math.min(mR.left + mR.width, wR.left + wR.width) - bx.left); bx.height = Math.max(1, Math.min(mR.top + mR.height, wR.top + wR.height) - bx.top);
    const mcl = mon ? mk(`left:${cX + (bx.left - cX) / SC}px;top:${cY + (bx.top - cY) / SC}px;width:${bx.width / SC}px;height:${bx.height / SC}px;opacity:0`) : null; let mcRaf = 0;
    if (mcl) { const K = 3, cv = mk('width:100%;height:100%;left:0;top:0;image-rendering:pixelated', 'canvas', mcl); cv.width = Math.round(bx.width * K); cv.height = Math.round(bx.height * K); const cx = cv.getContext('2d');
      const draw = () => { if (!root.isConnected && mcRaf > 1) return; try { cx.clearRect(0, 0, cv.width, cv.height); cx.imageSmoothingEnabled = false; const r = rel(mon.getBoundingClientRect()), fl = (new DOMMatrix(getComputedStyle(mon).transform === 'none' ? undefined : getComputedStyle(mon).transform)).a < 0;
        cx.save(); if (fl) { cx.translate((r.left - bx.left + r.width) * K, 0); cx.scale(-1, 1); cx.drawImage(mon, 0, 0, mon.naturalWidth, mon.naturalHeight, 0, (r.top - bx.top) * K, r.width * K, r.height * K); } else cx.drawImage(mon, (r.left - bx.left) * K, (r.top - bx.top) * K, r.width * K, r.height * K); cx.restore(); } catch (e) {} mcRaf = requestAnimationFrame(draw); }; mcRaf = 1; draw(); }
    /* 경완 2026-11-13 'Z파워에 둘러싸인 효과': 포켓몬을 감싸는 금빛 막 + 빙글빙글 도는 Z파워 빛 고리(뒤쪽 절반은 포켓몬 뒤, 앞쪽 절반은 앞) */
    const shell = mk(`left:${MX - MW * .78}px;top:${MY - MH * .9}px;width:${MW * 1.56}px;height:${MH * 1.5}px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,240,170,0) 52%,${rgba([255, 214, 70], .32)} 70%,${rgba(tO, .55)} 82%,rgba(255,255,255,0) 90%);box-shadow:0 0 ${Wd * .04}px ${rgba([255, 214, 70], .5)};mix-blend-mode:screen;opacity:0`);
    const orbB = mk('inset:0', 'canvas'), orbF = mk('inset:0', 'canvas'); [orbB, orbF].forEach(o => { o.width = Wd * 2; o.height = Hd * 2; o.style.width = Wd + 'px'; o.style.height = Hd + 'px'; o.style.opacity = 0; });
    if (mcl) { root.insertBefore(shell, mcl); root.insertBefore(orbB, mcl); }
    const orbit = () => { const T0 = performance.now(), gb = orbB.getContext('2d'), gf = orbF.getContext('2d'), RX = MW * .78, RY = MH * .22, rings = [[0, -.35, 1], [2.1, .3, -1], [4.2, 0, 1.3]], N = 34;
      const dr = now => { if (!root.isConnected || !cvOn) return; const e = (now - T0) / 1000; [gb, gf].forEach(g => { g.clearRect(0, 0, orbB.width, orbB.height); g.globalCompositeOperation = 'lighter'; });
        rings.forEach(([ph, tilt, sp], r) => { const yc = MY - MH * (.15 - r * .22) - Math.min(1, e * 1.2) * MH * .05;
          for (let i = 0; i < N; i++) { const a = e * 5.2 * sp + ph - i * .065, sn = Math.sin(a), x = MX + Math.cos(a) * RX * (1 - r * .12), y = yc + sn * RY + Math.cos(a) * RX * tilt * .25, al = (1 - i / N) * (.55 + .45 * Math.abs(sn)), g = sn > 0 ? gf : gb, rad = Wd * (.017 - i * .0004) * (sn > 0 ? 1.15 : .8);
            g.shadowBlur = 0; g.beginPath(); g.arc(x * 2, y * 2, Math.max(2, rad * 5), 0, 7); g.fillStyle = i % 3 ? `rgba(255,190,40,${al * .22})` : rgba(tO, al * .3); g.fill(); g.beginPath(); g.arc(x * 2, y * 2, Math.max(1, rad * 2), 0, 7); g.fillStyle = i < 3 ? `rgba(255,255,240,${al})` : `rgba(255,224,110,${al})`; g.fill(); } });   /* 그림자 번짐(shadowBlur)은 폰에서 느려서 큰 옅은 원으로 빛 번짐 */
        if (e < 1.35) requestAnimationFrame(dr); };
      requestAnimationFrame(dr); };
    const sparks = Array.from({ length: 18 }, (_, i) => mk(`left:0;top:0;width:${Wd * .045}px;height:${Wd * .045}px;background:url(${P}Z-Power/particle.png) center/contain no-repeat;opacity:0;mix-blend-mode:screen;filter:hue-rotate(${i * 20}deg) saturate(1.5)`));
    // 5) 기술 이름 쾅
    const band = mk(`left:-15%;right:-15%;top:${Hd * .4}px;height:${Hd * .2}px;background:linear-gradient(to bottom,${TYD} 0 8%,#14101c 8% 92%,${TYD} 92%);transform:skewY(-5deg) scaleY(0);box-shadow:0 0 0 ${Wd * .008}px ${GOLD},0 0 36px ${rgba(tO, .9)};opacity:0`);
    const bz = mk(`left:50%;top:${Hd * .5}px;width:${Hd * .3}px;height:${Hd * .3}px;margin:${-Hd * .15}px 0 0 ${-Hd * .15}px;font:900 ${Hd * .28}px/${Hd * .3}px ${FONT};text-align:center;color:${rgba(tO, .35)};opacity:0`); bz.textContent = 'Z';
    const nm = String(c.zName || 'Z기술'), fs = Math.min(Wd * .8 / Math.max(4, nm.length), Hd * .075);
    const ttl = mk(`left:0;right:0;top:${Hd * .5 - fs * .62}px;text-align:center;font:900 ${fs}px/1.2 ${FONT};letter-spacing:.02em;white-space:nowrap;color:#fff;-webkit-text-stroke:${fs * .07}px ${TYD};paint-order:stroke fill;text-shadow:0 ${fs * .06}px 0 ${TYD},0 0 ${fs * .4}px ${rgba(tO, 1)},0 0 ${fs * .15}px ${GOLD};opacity:0`); ttl.textContent = nm;
    const shine = mk(`left:0;right:0;top:${Hd * .5 - fs * .62}px;height:${fs * 1.24}px;background:linear-gradient(100deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.85) 50%,rgba(255,255,255,0) 60%);mix-blend-mode:overlay;opacity:0`);
    const flash = mk('inset:0;background:#fff;opacity:0');
    bt.appendChild(root);
    // ── 시간표 ──
    const zStop = zBgm(7300); const zse = (n, v = 100) => { try { window.GymEss?.snd?.(n, v, 100); } catch (e) {} };   /* 팩 Z파워 효과음 PRSFX- ZPower1~3 (ess se 730~732) */
    at(3650, () => zse('730', 90)); at(4250, () => zse('731', 100)); at(5550, () => zse('732', 80));
    const hA = hide.map(e => A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }));
    A(dim, [{ opacity: 0 }, { opacity: 1 }], { duration: 450 }); at(0, () => c.se('fog2'));
    // 1) 트레이너 무대 (250~900)
    A(stg, [{ opacity: 1, transform: `skewY(${opp ? 7 : -7}deg) translateX(${side * 120}%)` }, { opacity: 1, transform: `skewY(${opp ? 7 : -7}deg) translateX(0)` }], { duration: 380, delay: 250, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
    A(trn, [{ opacity: 0, transform: `${opp ? '' : 'scaleX(-1) '}translateX(${side * 80}px)` }, { opacity: 1, transform: `${opp ? '' : 'scaleX(-1) '}translateX(0)` }], { duration: 420, delay: 330 });
    at(260, () => c.se('Battle recall'));
    // Z링이 빛나고 Z크리스탈이 끼워짐 (750~1250)
    if (zr) A(zr, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.3)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, delay: 750 });
    if (cr) A(cr, [{ opacity: 0, transform: `translate(0,${-Hd * .25}px) scale(1.8) rotate(-200deg)` }, { opacity: 1, transform: 'translate(0,0) scale(1) rotate(0)' }], { duration: 420, delay: 950, easing: 'cubic-bezier(.5,0,.6,1)' });
    at(1370, () => { c.se('DX Action'); vib(1); A(pop, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)', offset: .3 }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 500 }); });
    // 팔 X자 교차 (1650~2050) — 애니에서 Z링 앞에 팔을 교차하는 첫 동작
    xs.forEach((s, i) => seg(1650 + i * 90, s[0], s[1], 160, 'x')); at(1650, () => c.se('Sword2')); at(1760, () => { vib(1); shake(0, 200, 3); });
    at(2150, () => fadeSegs('x'));
    // 'Z' 세 획 (2250~3150), 트레이너 몸이 금빛으로
    strokes.forEach((s, i) => { seg(2250 + i * 300, s[0], s[1], 230, 'z'); at(2250 + i * 300, () => { c.se('Ice5'); vib(1 + (i === 2)); }); });
    at(2250, () => { trn.animate([{ filter: 'drop-shadow(0 0 0 #fff)' }, { filter: `drop-shadow(0 0 ${Wd * .01}px #fff) drop-shadow(0 0 ${Wd * .03}px ${GOLD}) drop-shadow(0 0 ${Wd * .06}px ${TY})` }], { duration: 900, fill: 'forwards' }); A(aura, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900 }); aura.animate([{ transform: 'scale(1) translateY(0)' }, { transform: 'scale(1.06) translateY(-4px)' }, { transform: 'scale(1) translateY(0)' }], { duration: 260, iterations: 12, delay: 900, composite: 'add' }); });
    at(3150, () => { c.se('Saint7'); vib(2); cv.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.12)', filter: 'brightness(1.8)' }, { transform: 'scale(1.05)', filter: 'brightness(1.2)' }], { duration: 360, fill: 'forwards' }); });
    shake(3150, 300, 6);
    // 3) 무대가 빠지고 Z파워가 포켓몬에게 (3550~4600)
    at(3550, () => { fadeSegs('z'); c.se('Psych Up'); A(cv, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }); });
    [stg, zr, cr].forEach(e => e && A(e, [{ opacity: 1 }, { opacity: 0, transform: `translateX(${-side * 60}px) scale(.9)` }], { duration: 350, delay: 3550, easing: 'ease-in' }));
    /* 트레이너는 아래 구석으로 작게 물러나 금빛 그대로, 거기서 Z파워 띠가 포켓몬에게 (본가: 트레이너 몸에서 포켓몬에게 흘러감) */
    const CXT = opp ? Wd * .8 : Wd * .2, CYT = Hd * .8, kz = .55;
    at(3550, () => A(aura, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }));   /* 2250 에 만든 애니메이션보다 뒤에 만들어야 이김 */
    [trn].forEach(e => A(e, [{ opacity: 1, transform: `${e === trn && !opp ? 'scaleX(-1) ' : ''}translate(0,0) scale(1)` }, { opacity: 1, transform: `translate(${CXT - Wd / 2}px,${CYT - (TT + TH / 2)}px) ${e === trn && !opp ? 'scaleX(-1) ' : ''}scale(${kz})` }], { duration: 420, delay: 3550, easing: 'cubic-bezier(.5,0,.2,1)' }));
    at(5100, () => [trn].forEach(e => A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })));
    /* 띠가 포켓몬에게 갈 땐 위·아래 모두 반투명 검정 (위는 옅게) */
    const tR = rel(c.top.getBoundingClientRect()), dT = mk(`left:0;right:0;top:0;height:${tR.top + tR.height}px;background:rgba(0,0,0,.42);opacity:0`), dB = mk(`left:0;right:0;top:${tR.top + tR.height}px;bottom:0;background:rgba(0,0,0,.6);opacity:0`);   /* 경완 2026-11-13: 아래도 깜깜하게 덮지 말고 배경이 살짝 보이게 반투명 검정 */ root.insertBefore(dB, dim.nextSibling); root.insertBefore(dT, dim.nextSibling);
    [dT, dB].forEach(e => A(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 3500 })); A(dim, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 3550 });
    at(3650, () => { vib(1); const g2 = bm.getContext('2d'), ax = CXT, ay = CYT - TH * kz * .05, T0 = performance.now(), cols = ['#ff5a7a', '#ffb347', '#fff275', '#6dff8a', '#4dd2ff', '#9b7bff'];
      const dr = now => { const p = Math.min(1, (now - T0) / 600), e = (now - T0) / 1000; g2.clearRect(0, 0, bm.width, bm.height); g2.globalCompositeOperation = 'lighter';
        cols.forEach((col, k) => { const off = (k - 2.5) * Wd * .05, cx1 = (ax + MX) / 2 + off * 3, cy1 = Math.min(ay, MY) - Hd * .12 + off; g2.beginPath(); const n = 40;
          for (let i = 0; i <= n * p; i++) { const u = i / n, x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx1 + u * u * MX, y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy1 + u * u * MY, w = Math.sin(u * 7 - e * 14 + k) * Wd * .01; i ? g2.lineTo(x * 2 + w, y * 2 + w) : g2.moveTo(x * 2, y * 2); }
          g2.strokeStyle = col; g2.lineWidth = Wd * .016 * 2; g2.shadowColor = col; g2.shadowBlur = 24; g2.lineCap = 'round'; g2.stroke(); });
        if (now - T0 < 1000 && root.isConnected) requestAnimationFrame(dr); else A(bm, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }); };
      requestAnimationFrame(dr); });
    // 4) 포켓몬이 Z파워를 두름 (4250~5400): 금빛 불꽃 기운 + 위로 올라가는 반짝이 + 포켓몬도 힘주는 자세 (마음이 하나로)
    at(4250, () => { c.se('Charge'); vib(2); A(fx, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 350 });
      fl.forEach((f, i) => f.animate([{ transform: 'scaleY(.85) translateX(0)' }, { transform: `scaleY(1.15) translateX(${(i % 2 ? 1 : -1) * Wd * .006}px)` }, { transform: 'scaleY(.85) translateX(0)' }], { duration: 300 + (i % 3) * 70, iterations: Infinity, delay: i * 40 }));
      core.animate([{ opacity: .7, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.12)' }, { opacity: .7, transform: 'scale(1)' }], { duration: 420, iterations: Infinity });
      if (mcl) { mcl.style.opacity = 1; mcl.style.filter = `drop-shadow(0 0 2px #fff) drop-shadow(0 0 6px ${GOLD}) drop-shadow(0 0 12px ${TY})`; mcl.animate([{ transform: 'none' }, { transform: 'translateY(-8%) scale(1.04,.96)', offset: .25 }, { transform: 'translateY(-14%) scale(.97,1.06)', offset: .5 }, { transform: 'none' }], { duration: 520, iterations: 2, easing: 'ease-in-out' }); }
      A(shell, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1.06)', offset: .4 }, { opacity: 1, transform: 'scale(1)' }], { duration: 380 }); shell.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }], { duration: 360, iterations: Infinity });
      [orbB, orbF].forEach(o => A(o, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 })); orbit();
      sparks.forEach((p, i) => { const x0 = MX - MW * .7 + Math.random() * MW * 1.4, y0 = MY + MH * .1; A(p, [{ opacity: 0, transform: `translate(${x0}px,${y0}px) scale(.4)` }, { opacity: 1, offset: .2 }, { opacity: 0, transform: `translate(${x0 + (Math.random() - .5) * Wd * .1}px,${y0 - MH * (1 + Math.random())}px) scale(1.1)` }], { duration: 700 + Math.random() * 300, delay: (i % 9) * 110, iterations: 2 }); }); });
    shake(4300, 700, 5); at(4700, () => c.se('Psych Up'));
    // 5) 기술 이름 쾅 (5500~6900)
    A(dim, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 5400 });
    A(band, [{ opacity: 1, transform: 'skewY(-5deg) scaleY(0)' }, { opacity: 1, transform: 'skewY(-5deg) scaleY(1.15)', offset: .7 }, { opacity: 1, transform: 'skewY(-5deg) scaleY(1)' }], { duration: 260, delay: 5450 });
    A(bz, [{ opacity: 0, transform: 'scale(2.5) rotate(-20deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)' }], { duration: 300, delay: 5500 });
    at(5550, () => { c.se('Z-Move Title'); A(ttl, [{ opacity: 0, transform: 'scale(3.2)', filter: 'blur(6px)' }, { opacity: 1, transform: 'scale(.92)', filter: 'blur(0)', offset: .65 }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }], { duration: 320, easing: 'cubic-bezier(.3,0,.4,1)' }); });
    at(5730, () => { c.se('Explosion3'); vib(3); A(flash, [{ opacity: .9 }, { opacity: 0 }], { duration: 300 }); }); shake(5730, 500, 10);
    A(shine, [{ opacity: 1, transform: 'translateX(-60%)' }, { opacity: 1, transform: 'translateX(60%)' }], { duration: 500, delay: 6000, easing: 'ease-in-out' });
    const END = 7300;
    /* 경완 2026-11-14 '기술 이름하고 띠가 부드럽게 사라지게': 0.35초 뚝 → 0.65초 ease-in-out, 기술 이름은 살짝 커지며 흐려지고 띠는 위아래로 접히며 */
    [bz, shine, fx, dim, mcl, dT, dB].forEach(e => e && A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: END - 900, easing: 'ease-in-out' }));
    A(ttl, [{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(1.08)', filter: 'blur(3px)' }], { duration: 650, delay: END - 900, easing: 'ease-in-out' });
    A(band, [{ opacity: 1, transform: 'skewY(-5deg) scaleY(1)' }, { opacity: 0, transform: 'skewY(-5deg) scaleY(.2)' }], { duration: 650, delay: END - 900, easing: 'ease-in-out' });
    /* 경완 2026-11-13: 무지개 띠가 갈 때 아래 화면(배경)도 반투명 검정 밑으로 살짝 보이게 → 기술 이름 땐 다시 숨김 */
    const bot = hide.filter(e => e.matches('.bt-bot,.bt-mid,.bt-msg')), xA = [];   /* 경완: 대사창 자리도 배경 그대로 */ at(3500, () => bot.forEach(e => xA.push(A(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })))); at(5400, () => bot.forEach(e => xA.push(A(e, [{ opacity: 1, filter: 'brightness(1)' }, { opacity: 1, filter: 'brightness(.6)' }], { duration: 300 }))));   /* 경완 2026-11-14: 기술 이름 나올 때 아래 화면 검정 말고 어둡게 보이게 */
    /* 경완 2026-11-14 '기술 이름 나오고 원래 화면 돌아올 때 검정 여백 같은 지저분함': 대사창이 어두운 채로, 체력 막대는 숨은 채로 기술 이름 띠보다 늦게 돌아왔음 → 띠가 걷히는 동안 같이 돌아옴 */
    const back = []; at(END - 850, () => hide.forEach(e => back.push(bot.includes(e) ? A(e, [{ opacity: 1, filter: 'brightness(.6)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 600, easing: 'ease-in-out' }) : A(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-in-out' }))));
    at(5300, () => [shell, orbB, orbF].forEach(e => A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })));
    return new Promise(res => {
      const lk = document.createElement('div'); lk.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:transparent;touch-action:none'; const eat = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }; ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(t => lk.addEventListener(t, eat, { passive: false })); document.body.appendChild(lk);
      setTimeout(() => { lk.remove(); cvOn = false; zStop(); cancelAnimationFrame(mcRaf); timers.forEach(t => clearTimeout(t));          A(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).finished.catch(() => {}).then(() => { back.forEach(a => a.cancel()); hA.forEach(a => a.cancel()); xA.forEach(a => a.cancel()); root.remove(); res(); }); }, END - 250); });
  }

  // ---------- 테라스탈 ([DBK] Terastallization [011] Animations.rb BattlerTerastallize) ----------
  async function tera(c) {
    const P = c.path, [tO, tB] = tyCol(c.type); await preload({ ...c, extra: ['burst', 'shine', 'Tera/crystal_1', 'Tera/crystal_2', 'Tera/crystal_3', 'Tera/crystal_4', 'Tera/pulse', 'Tera/icon', 'Tera/shine'].map(n => P + n + '.png') });
    const sc = scene(c.host), tr = !c.wild, BG = bgOf(sc, c), [BS, bw] = bases(sc, c, 0, CX, CY, tr), [TR, IT] = tr ? trainerItem(sc, c, 0, bw) : [];
    const OV = overlay(sc, P + 'burst.png'), oy = c.wild ? CY : CY + 20, SH = spr(sc, P + 'shine.png', CX, oy, 0, 0, 'c', 255, 100, { color: [...tO, 255] });
    const PK = monPic(sc, c, c.mon, tr), TP = monPic(sc, c, c.to, tr, { outline: tO, pat: 1 });
    const CRY = [1, 2, 3].map(i => spr(sc, P + `Tera/crystal_${i}.png`, CX, oy, 0, 0, 'c', 255, 0));
    // 깨지는 결정 4조각 (dxSetParticlesRect 154x166, range 100)
    const w = 154, l = 166, hw = 77, hl = 83, r = 100, BR = [[0, 0, -r, -r], [hw, 0, W + r, -r], [0, hl, -r, H + r], [hw, hl, W + r, H + r]].map(([sx, sy, ex, ey]) => [sc.add({ src: P + 'Tera/crystal_4.png', crop: [sx, sy, hw, hl], org: 'c', x: CX + Math.round(w / 4), y: CY + Math.round(l / 4) + (tr ? 20 : 0) }), ex, ey]);
    const PU = spr(sc, P + 'Tera/pulse.png', CX, oy, 0, 0, 'c', 255, 50), IC = spr(sc, P + 'Tera/icon.png', CX, oy, 0, 0, 'c', 0, 50), SH2 = spr(sc, P + 'Tera/shine.png', CX, oy), F = fade(sc);
    if (c.pat) { const pe = document.createElement('i'); pe.className = 'dx-tpat'; pe.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:${150 / 255};background:url(${c.pat}) 0 0/auto repeat;animation:dxPatT 80s linear infinite;-webkit-mask:url("${c.to.url}") 0 0/100% 100%;mask:url("${c.to.url}") 0 0/100% 100%`; TP.el.appendChild(pe); }
    let d = fadeIn(sc, F, [BG, BS[BS.length - 1], PK]);
    if (tr) { TR.vis(d + 4, 1); BS[0].vis(d + 4, 1); const dl = Math.floor(bw * .75) * (c.opp ? -1 : 1); TR.delta(d + 4, 8, dl, 0); BS[0].delta(d + 4, 8, dl, 0); d = TR.total + 1;
      TR.se(d, () => c.se('Saint7')); if (IT) { IT.vis(d, 1); IT.delta(d, 15, 0, -20); IT.op(d, 15, 255); } d = Math.max(TR.total, IT?.total || 0); }
    BG.color(d, 15, [...tB, 180]); BG.tone(d, 15, [-200, -200, -200, 0]); BS.forEach(p => { p.color(d, 15, [...tB, 180]); p.tone(d, 15, [-200, -200, -200, 0]); });
    PK.tone(d, 15, [255, 255, 255, 255]); IC.vis(d + 4, 1); IC.op(d + 4, 8, 255); IC.zoom(d + 8, 16, 200); IC.op(d + 8, 16, 0); d = PK.total;
    CRY.slice().reverse().forEach((p, i) => { p.vis(d, 1); p.se(d, () => c.se('Sword2')); p.zoom(d, 2, 100); d = p.total + (i === 0 ? 4 : 1); });
    d = CRY[0].total; PK.vis(d, 0); d = shake(CRY, d, 16, 2, 0);
    F.color(d - 8, 0, [255, 255, 255, 255]); F.op(d - 8, 12, 255); d = F.total; IT?.vis(d, 0); CRY.forEach(p => p.vis(d, 0)); IC.vis(d, 0); SH.vis(d, 1); TP.vis(d, 1); F.op(d, 6, 0); F.color(d + 6, 0, [0, 0, 0, 0]);
    SH2.vis(d + 1, 1); BR.forEach(([p, ex, ey], i) => { p.vis(d + 1, 1); if (!i) p.se(d, () => c.se('Earth1')); p.moveXY(d + 1, 4, ex, ey); p.vis(d + 5, 0); });
    d = F.total; OV.vis(d, 1); OV.op(d, 5, 0); PU.vis(d, 1); PU.se(d, () => c.se('Ice5')); PU.zoom(d, 5, 1000); PU.op(d + 2, 5, 0);
    const t = .5; for (let i = 0; i < 6; i++) { if (i > 0) { const y = TP.val('y', d); TP.moveXY(d, t, CX, y + 2); TP.moveXY(d + t, t, CX, y); [OV, SH, SH2].forEach(p => p.op(d, 2, 160)); d = OV.total; } else { d = PU.total; [OV, SH, SH2].forEach(p => p.op(d, 0, 255)); TP.se(d, () => c.cry()); } [OV, SH, SH2].forEach(p => p.op(d + t, 2, 240)); }
    [OV, SH, SH2].forEach(p => p.op(d, 4, 0)); F.op(d + 20, 8, 255);
    return sc.run();
  }

  // ---------- 다이맥스 ([DBK] Dynamax [008] Dynamax Animations.rb BattlerDynamax) ----------
  async function dynamax(c) {
    const P = c.path; await preload({ ...c, extra: [P + 'burst.png', P + 'pulse.png', c.ball, c.ballOpen, c.shadow] });
    const sc = scene(c.host), zb = 1.5, BG = sc.add({ w: W, h: H, bg: `url(${c.bg.url}) ${c.bg.pos || '0 0'}/${c.bg.size || `${W * 2}px ${H}px`} no-repeat`, org: 'tl', zoom: 100 * zb, vis: 0 });
    BG.init.zoom = 100; const OV = overlay(sc, P + 'burst.png');
    const SHD = c.shadow ? spr(sc, c.shadow, CX, CY * 1.5, c.shadowW || 128, c.shadowH || 32, 'c', 0, 0) : null;
    const yp = H / 4 + CY, DM = sc.add({ src: c.to.url, iw: c.to.w, ih: c.to.h, org: 'b', x: CX, y: yp, mirror: !c.opp, outline: [255, 255, 255], color: [255, 255, 255, 255], zoom: 0, op: 0, pat: 1 });
    if (c.pat) { const pe = document.createElement('i'); pe.className = 'dx-dpat'; pe.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:${150 / 255};background:url(${c.pat}) 0 0/auto repeat;animation:dxPatL 80s linear infinite;-webkit-mask:url("${c.to.url}") 0 0/100% 100%;mask:url("${c.to.url}") 0 0/100% 100%`; DM.el.insertBefore(pe, DM.ovC); }
    const PU = spr(sc, P + 'pulse.png', CX, CY, 0, 0, 'c', 255, 50);
    const bh = c.base.h, BA = sc.add({ src: c.base.url, iw: c.base.w, ih: bh, org: 'b', x: CX, y: CY + bh }), bx = CX, by = CY + bh;
    const PK = monPic(sc, c, c.mon, false);
    const ox = c.tr.w / 2, TR = sc.add({ src: c.tr.url, iw: c.tr.w, ih: c.tr.h, org: 'b', x: c.opp ? W + ox : -ox, y: by - bh / 2 + 4, mirror: !c.opp, vis: 0 }); let tx = TR.init.x; const ty = TR.init.y;
    const IT = c.item ? spr(sc, c.item.url, CX, ty - c.tr.h, c.item.w, c.item.h, 'b', 0, 100, { outline: [255, 255, 255] }) : null;
    const bx0 = CX - (c.ballW || 32) / 2, byb = ty + 22, BL = sc.add({ src: c.ball, iw: c.ballW || 32, ih: c.ballH || 32, org: 'bl', x: bx0, y: byb });
    const F = fade(sc);
    let d = fadeIn(sc, F, [BG, BA, PK, BL]);
    PK.color(d, 4, [248, 176, 240, 255]); d = PK.total; PK.se(d, () => c.se('Battle recall')); BL.name(d, c.ballOpen);
    PK.zoom(d, 6, 0); PK.moveXY(d, 6, CX, byb - 38); PK.vis(d + 6, 0); d = PK.total + 1; BL.name(d, c.ball);
    BL.delta(d, 8, c.opp ? -64 : 64, 0); TR.vis(d + 6, 1); const dt = c.opp ? -(CX + ox) : CX + ox; tx += dt; TR.delta(d + 6, 12, dt, 0); d = TR.total + 1;
    BL.se(d, () => c.se('DX Action')); if (IT) { IT.vis(d, 1); IT.delta(d, 15, 0, -20); IT.op(d, 15, 255); d = IT.total + 1; }
    BL.se(d, () => c.se('Psych Up')); BL.zoom(d, 6, 150); BL.delta(d, 6, -8, 8); BL.color(d, 6, [255, 51, 153, 180]); d = BL.total + 6; BL.vis(d, 0); IT?.vis(d, 0);
    BG.zoom(d, 6, zb * 150); OV.vis(d, 1); OV.op(d, 6, 255); const dir = c.opp ? -600 : 600;
    BA.zoom(d, 6, Math.abs(dir)); BA.delta(d, 6, dir, Math.abs(dir)); BA.op(d + 6, 0, 0); TR.zoom(d, 6, Math.abs(dir)); TR.delta(d, 6, dir, Math.abs(dir) - 200); TR.se(d, () => c.se('Battle throw')); TR.vis(d + 6, 0); d = TR.total;
    const gx = -W / 4, gy = -H / 4; BG.xy(d, gx, gy); BA.xy(d, bx, by); BA.zoom(d, 0, 100); BA.op(d, 6, 255); OV.op(d, 6, 0); OV.vis(d + 4, 0); d = OV.total + 20;
    const nbx = bx0 - 8, nby = byb + 16; BL.xy(d, nbx, -32); BL.vis(d, 1); d = BL.total + 2;
    for (let i = 0; i < 4; i++) { const t = [4, 4, 3, 2][i], k = [1, 2, 4, 8][i]; if (i === 0) d -= t; if (i > 0) { BG.moveXY(d, t, gx, gy - 100 / k); BA.moveXY(d, t, bx, by - 100 / k); BL.moveXY(d, t, nbx, nby - 100 / k); } else BL.se(d + 2 * t, () => { c.se('Earth1'); c.shake?.(); });
      BG.moveXY(d + t, t, gx, gy); BA.moveXY(d + t, t, bx, by); BL.moveXY(d + t, t, nbx, nby); d = BL.total; }
    d += 10; BA.op(d, 4, 0); DM.vis(d, 1); DM.xy(d, CX, CY + 100); BL.se(d, () => c.se('Battle recall')); BL.name(d, c.ballOpen); BL.op(d, 4, 0);
    if (SHD) { SHD.vis(d, 1); SHD.zoom(d, 20, 200); SHD.op(d, 20, 100); }
    DM.se(d, () => c.se('Psych Up')); DM.moveXY(d, 20, CX, yp); DM.zoom(d, 20, 150); DM.op(d + 4, 6, 255);
    d += 4; BG.moveXY(d, 20, -4, -4); BG.zoom(d, 20, zb * 100); const bc = c.calyrex ? [0, 204, 204] : [255, 51, 153]; BG.color(d, 20, [...bc, 245]); BG.tone(d, 10, [100, 100, 100, 100]);
    const nbx2 = c.opp ? bx + 100 : bx - 100, nby2 = by + 50, ntx = c.opp ? tx + 100 : tx - 100, nty = nby2 - bh / 4 + 2;
    BA.xy(d, nbx2, nby2 + H + bh); BA.moveXY(d, 16, nbx2, nby2); BA.zoom(d, 0, 600); BA.zoom(d, 16, 50); BA.op(d, 16, 255);
    TR.vis(d, 1); TR.xy(d, ntx, nty + H); TR.moveXY(d, 16, ntx, nty); TR.zoom(d, 16, 50); d = BG.total + 4;
    OV.op(d, 0, 255); if (!c.calyrex) OV.color(d, 0, [255, 51, 153, 200]); BG.zoom(d, 0, 110); BG.xy(d, -25, -19); BG.color(d, 10, [...bc, 80]); BG.tone(d, 10, [-200, -200, -200, 0]); BA.color(d, 10, [...bc, 80]); BA.tone(d, 10, [-100, -100, -100, 0]);
    d = BG.total + 12;
    for (let i = 0; i < 6; i++) { const t = [4, 4, 3, 2, 2, 2][i], k = [2, 4, 4, 4, 8, 8][i]; if (i === 0) d -= t;
      if (i > 0) { OV.op(d + 2, t, 240); BG.moveXY(d, t, -25, -100 / k); BA.moveXY(d, t, nbx2, nby2 - 100 / k); TR.moveXY(d, t, ntx, nty - 100 / k); DM.moveXY(d + 2, t, CX, yp - 200 / k); }
      else { OV.vis(d, 1); PU.vis(d, 1); PU.zoom(d, 10, 1000); PU.op(d + 2, 10, 0); DM.se(d + 2 * t, () => { c.cry(); c.se('Explosion3'); }); DM.color(d, 5, [248, 176, 240, 0]); DM.outlineTo = c.calyrex ? [36, 243, 243] : [250, 57, 96]; }
      OV.op(d + t, t, 160); BG.moveXY(d + t, t, -25, -19); BA.moveXY(d + t, t, nbx2, nby2); TR.moveXY(d + t, t, ntx, nty); DM.moveXY(d + t, t, CX, yp); d = DM.total; }
    OV.op(d, 4, 0); F.op(d + 20, 8, 255);
    if (DM.outlineTo) { const oc = DM.outlineTo; DM.se(DM.total - 40, () => { DM.el.style.filter = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([a, b]) => `drop-shadow(${a}px ${b}px 0 ${rgba(oc, 1)})`).join(' '); }); }
    return sc.run();
  }

  // ---------- 거다이맥스 (경완 2026-11-14 '메가·Z기술처럼 전체 화면, 본가 소드실드 연출 비슷하게') ----------
  // 본가 순서: 포켓몬을 볼로 회수 → 다이맥스 밴드의 붉은 기운이 볼로 → 볼이 커짐 → 어깨 너머 뒤로 던짐 → 볼이 땅에 쿵 →
  // 붉은 기운 속에서 거대한 모습이 솟고 머리 위에 붉은 구름 → 포효. 끝나면 3턴 뒤 붉은 기운이 빠지며 줄어듦
  const GX_KIND = u => /cave/.test(u) ? 'cave' : /plain|forest|mountain|snow|water|city/.test(u) ? 'out' : 'in';
  const mixC = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const rowAvg = (d, w, y) => { let r = 0, g = 0, b = 0; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; } return [r / w, g / w, b / w]; };
  const cs = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  // 배틀 배경을 뒤로 물러난 듯 줄이고(z), 잘린 위쪽은 하늘(바깥)·천장(실내)·바위 천장(동굴)으로 이어 그림 → 캔버스 (256 x 192+E, 2배 해상도)
  // o: { z 줄이는 배율, ext 위로 더 그릴 높이, py 줄이는 기준 줄, red 붉은 기운 0~1 }
  function gxBg(img, sx, url, o = {}) {
    const z = o.z ?? .7, E = o.ext ?? 80, PY = o.py ?? 150, S = 2, kind = GX_KIND(url || ''), cv = document.createElement('canvas'); cv.width = 256 * S; cv.height = (192 + E) * S;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.scale(S, S); g.translate(0, E);
    const iw = img.naturalWidth || img.width || 512, sw = Math.min(iw, 256 / z), x0 = Math.max(0, Math.min(iw - sw, (sx || 0) + 128 - sw / 2)), top = PY - PY * z, bot = PY + (160 - PY) * z;
    const sm = document.createElement('canvas'); sm.width = Math.round(sw); sm.height = 24; const sg = sm.getContext('2d'); sg.drawImage(img, x0, 0, sw, 24, 0, 0, sm.width, 24); const sd = sg.getImageData(0, 0, sm.width, 24).data;
    const c0 = rowAvg(sd, sm.width, 0), c8 = rowAvg(sd, sm.width, 8);
    // 아래 바닥: 맨 아래 줄을 늘려 채움
    g.drawImage(img, x0, 156, sw, 3, 0, bot - 2, 256, 192 - bot + 3);
    g.drawImage(img, x0, 0, sw, 160, 0, top, 256, 160 * z);
    const H = top + E;   // 새로 그릴 위쪽 높이
    if (kind === 'out') {   // 하늘: 맨 윗줄 색 → 위로 갈수록 짙은 하늘색, 원래 배경 윗줄을 뒤집어 늘린 결(본가 DP 배경처럼 가로 줄무늬)
      /* 경완 '거다이맥스 하면 하늘을 좀 더 본가처럼 검붉은? 검보라? 느낌으로 그라데이션': 지평선 붉은 노을 → 검붉은 → 맨 위 검보라 (소드실드 다이맥스 하늘) */
      const gr = g.createLinearGradient(0, top, 0, -E);
      gr.addColorStop(0, cs(mixC(c0, [232, 70, 110], .55))); gr.addColorStop(.18, 'rgb(176,34,78)'); gr.addColorStop(.45, 'rgb(98,16,60)'); gr.addColorStop(.75, 'rgb(46,10,44)'); gr.addColorStop(1, 'rgb(22,6,30)'); g.fillStyle = gr; g.fillRect(0, -E, 256, H + 1);
      g.save(); g.globalAlpha = .16; g.globalCompositeOperation = 'luminosity'; g.translate(0, top); g.scale(1, -1); g.drawImage(sm, 0, 0, sm.width, 24, 0, 0, 256, H * .55); g.restore();
      g.save(); g.globalAlpha = .07; g.globalCompositeOperation = 'luminosity'; g.translate(0, top - H * .45); g.scale(1, -1); g.drawImage(sm, 0, 0, sm.width, 24, 0, 0, 256, H * .55); g.restore();
      { const tg = g.createLinearGradient(0, top, 0, 192); tg.addColorStop(0, 'rgb(196,92,132)'); tg.addColorStop(.55, 'rgb(222,160,186)'); tg.addColorStop(1, 'rgb(236,196,212)'); g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = tg; g.fillRect(0, top, 256, 192 - top); g.restore(); }   /* 원래 배경(풀밭·하늘 줄)도 붉은 어스름이 내려앉게 */
      const cl = [255, 70, 120]; for (let i = 0; i < 7; i++) { const y = top - H * (.15 + i * .12), x = (i * 97 + 30) % 256, w = 60 + (i * 37) % 70; const rg = g.createRadialGradient(x, y, 1, x, y, w); rg.addColorStop(0, `rgba(${cl[0]},${cl[1]},${cl[2]},${.32 - i * .03})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.save(); g.translate(x, y); g.scale(1, .12); g.translate(-x, -y); g.fillStyle = rg; g.beginPath(); g.arc(x, y, w, 0, 7); g.fill(); g.restore(); }
    } else {   // 실내: 벽이 조금 더 이어지고 → 몰딩 → 원근 천장(보·조명). 동굴: 어두운 바위 천장 + 고드름 바위
      const wallH = Math.min(H * .32, 26), yc = top - wallH;
      g.save(); g.translate(0, top); g.scale(1, -1); g.drawImage(sm, 0, 0, sm.width, 12, 0, 0, 256, wallH + 1); g.restore();
      const cave = kind === 'cave', cb = cave ? mixC(c0, [8, 6, 14], .72) : mixC(c8, [20, 18, 30], .45), cf = cave ? mixC(c0, [0, 0, 0], .9) : mixC(c0, [12, 10, 22], .7);
      const gr = g.createLinearGradient(0, yc, 0, -E); gr.addColorStop(0, cs(cb)); gr.addColorStop(1, cs(cf)); g.fillStyle = gr; g.fillRect(0, -E, 256, yc + E + .5);
      if (!cave) {
        g.fillStyle = cs(mixC(c0, [255, 255, 255], .35)); g.fillRect(0, yc - 1.5, 256, 2); g.fillStyle = cs(mixC(cb, [0, 0, 0], .35)); g.fillRect(0, yc + .5, 256, 1.2);
        const ln = cs(mixC(cb, [0, 0, 0], .3)), hl = mixC(c0, [255, 250, 235], .6); g.strokeStyle = ln; g.lineWidth = 1;
        for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(128 + i * 24, yc); g.lineTo(128 + i * 24 * 3.2, -E); g.stroke(); }   // 위로 갈수록 벌어지는 원근 보
        for (let j = 1; j < 6; j++) { const y = yc - (yc + E) * (1 - Math.pow(.62, j)); g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
          for (let i = -2; i <= 2; i++) { const x = 128 + i * 52 * (1 + (yc - y) / 60), r = 5 + j * 2.2, lg = g.createRadialGradient(x, y - r * .3, .5, x, y - r * .3, r * 2.2); lg.addColorStop(0, `rgba(${hl[0]},${hl[1]},${hl[2]},.95)`); lg.addColorStop(.3, `rgba(${hl[0]},${hl[1]},${hl[2]},.4)`); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.ellipse(x, y - r * .3, r * 2.2, r * .9, 0, 0, 7); g.fill(); } }
      } else {
        g.fillStyle = cs(mixC(cb, [0, 0, 0], .4)); for (let i = 0; i < 26; i++) { const x = (i * 53) % 260, w = 6 + (i * 7) % 12, h = 8 + (i * 13) % 22, y = yc - (i % 3) * 8; g.beginPath(); g.moveTo(x - w / 2, y - 2); g.lineTo(x + w / 2, y - 2); g.lineTo(x + (i % 2 ? 2 : -2), y + h * .6); g.closePath(); g.fill(); }
        for (let i = 0; i < 18; i++) { const x = (i * 71) % 256, y = yc - 10 - (i * 29) % Math.max(10, yc + E - 12), r = 10 + (i * 11) % 18, rg = g.createRadialGradient(x, y, 1, x, y, r); rg.addColorStop(0, 'rgba(0,0,0,.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      }
    }
    const rd = o.red ?? 0; if (rd) { const rg = g.createLinearGradient(0, -E, 0, bot); rg.addColorStop(0, `rgba(90,0,30,${.62 * rd})`); rg.addColorStop(.6, `rgba(150,10,60,${.3 * rd})`); rg.addColorStop(1, `rgba(120,0,40,${.12 * rd})`); g.fillStyle = rg; g.fillRect(0, -E, 256, 192 + E); }
    cv.gx = { top, bot, E, z, PY, kind }; return cv;
  }
  // 머리 위 붉은 구름 고리 (본가 다이맥스 포켓몬 머리 위에 도는 붉은 구름) — half: 'b' 뒤쪽 반만(포켓몬 뒤), 'f' 앞쪽 반만(포켓몬 앞), '' 전부
  function gxRing(n = 16, seed = 1) { let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const P = Array.from({ length: n }, (_, i) => ({ a: i / n * Math.PI * 2 + r() * .35, k: .75 + r() * .5, w: r() * 6.28, dy: (r() - .5) * .6 })); let bolt = 1, bS = -9, bA = 0, bB = 0;
    return (g, t, cx, cy, rx, ry, half = '', al = 1) => { const pts = P.map(p => { const a = p.a + t * .32, d = (Math.sin(a) + 1) / 2; return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry + p.dy * ry, d, r: rx * .17 * p.k * (.8 + d * .35), w: p.w + t * .8 }; }).sort((a, b) => a.d - b.d);
      if (half !== 'f') { const gl = g.createRadialGradient(cx, cy, 1, cx, cy, rx * 1.15); gl.addColorStop(0, `rgba(255,40,110,${.35 * al})`); gl.addColorStop(1, 'rgba(255,0,80,0)'); g.fillStyle = gl; g.beginPath(); g.ellipse(cx, cy, rx * 1.15, ry * 2.4, 0, 0, 7); g.fill(); }
      for (const p of pts) { if (half === 'b' && p.d > .5 || half === 'f' && p.d <= .5) continue; const L = .5 + p.d * .5;
        for (let j = 0; j < 4; j++) { const ox = Math.cos(p.w + j * 1.6) * p.r * .55, oy = Math.sin(p.w + j * 1.6) * p.r * .25 - (j === 1 ? p.r * .22 : 0), rr = p.r * (j === 1 ? 1 : .78), x = p.x + ox, y = p.y + oy;
          const gr = g.createRadialGradient(x - rr * .3, y - rr * .4, rr * .05, x, y, rr); gr.addColorStop(0, `rgba(${230 * L | 0},${78 * L | 0},${118 * L | 0},${.7 * al})`); gr.addColorStop(.4, `rgba(${150 * L | 0},${14 * L | 0},${52 * L | 0},${.6 * al})`); gr.addColorStop(.75, `rgba(${95 * L | 0},${4 * L | 0},${32 * L | 0},${.3 * al})`); gr.addColorStop(1, `rgba(${70 * L | 0},0,${24 * L | 0},0)`);
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } }
      // 구름 속 붉은 번개 (가끔)
      if (half !== 'b') { if (t > bolt) { bS = t; bolt = t + 1.1 + Math.random() * 1.7; bA = Math.random() * 6.28; bB = bA + 1 + Math.random() * 2; }
        if (t - bS < .14) { g.save(); g.globalCompositeOperation = 'lighter'; const p0 = [cx + Math.cos(bA) * rx, cy + Math.sin(bA) * ry], p1 = [cx + Math.cos(bB) * rx * .8, cy + Math.sin(bB) * ry + ry];
          g.beginPath(); g.moveTo(...p0); for (let i = 1; i <= 6; i++) { const u = i / 6; g.lineTo(p0[0] + (p1[0] - p0[0]) * u + (Math.random() - .5) * rx * .18, p0[1] + (p1[1] - p0[1]) * u + (Math.random() - .5) * ry * .6); }
          g.strokeStyle = `rgba(255,90,160,${.5 * al})`; g.lineWidth = Math.max(2, rx * .05); g.stroke(); g.strokeStyle = `rgba(255,235,245,${al})`; g.lineWidth = Math.max(.8, rx * .016); g.stroke(); g.restore(); } } };
  }
  const gxBall = id => `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><radialGradient id="gr${id}" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#ff9ab8"/><stop offset=".45" stop-color="#e8174a"/><stop offset="1" stop-color="#6a0420"/></radialGradient><radialGradient id="gw${id}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfc2d6"/></radialGradient><clipPath id="gc${id}"><circle cx="50" cy="50" r="46"/></clipPath></defs><g clip-path="url(#gc${id})"><rect width="100" height="50" fill="url(#gr${id})"/><rect y="50" width="100" height="50" fill="url(#gw${id})"/><rect y="45" width="100" height="10" fill="#1d1020"/></g><circle cx="50" cy="50" r="46" fill="none" stroke="#1d1020" stroke-width="4"/><circle cx="50" cy="50" r="13" fill="#1d1020"/><circle cx="50" cy="50" r="8.5" fill="#fff" stroke="#ff4d8a" stroke-width="2.5"/></svg>`;

  // c: dxCtx + { bt, top, monEl, gmax(거다이맥스면 1), bgImg(배틀 배경 Image), bgX(배경 가로 자리) }
  /* v26.57 경완 '메가진화처럼 배틀화면 커지면서 포켓몬 스프라이트 앞모습으로 나오고 트레이너 나와서 볼 던져서 넣고 볼 커지고 다시 나오면 거다이 되어있는 모습으로 흐름 바꿔줘봐'
     1) 위 화면이 그 포켓몬 쪽으로 커짐(megaFull 과 같은 틀) 2) 가운데 원래 앞모습 3) 아래 트레이너 컷인 + 다이맥스밴드 4) 트레이너가 볼을 던져 포켓몬을 넣음
     5) 밴드의 붉은 기운이 볼로 → 볼이 커짐 6) 볼이 터지며 붉은 기둥, 거대한 붉은 실루엣이 솟음 → 색이 돌아온 거다이맥스 모습 + 머리 위 붉은 구름 + 포효 */
  const OPB = {};   /* 그림의 안 투명한 부분 (0~1) */
  async function opBox(u) { if (OPB[u]) return OPB[u]; let r = { x0: 0, x1: 1, y0: 0, y1: 1 }; try { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = u; await im.decode(); const w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 >= 0) r = { x0: x0 / w, x1: (x1 + 1) / w, y0: y0 / h, y1: (y1 + 1) / h }; } catch (e) {} return (OPB[u] = r); }
  async function dmaxFull(c) {
    const P = c.path, pat = c.pat; await preload({ ...c, extra: [pat, c.ball, c.ballS].filter(Boolean) });
    const bt = c.bt, top = c.top, R0 = bt.getBoundingClientRect(), Wd = bt.offsetWidth, Hd = bt.offsetHeight, q = R0.width / Wd || 1, rel = r => ({ left: (r.left - R0.left) / q, top: (r.top - R0.top) / q, width: r.width / q, height: r.height / q }), tR = rel(top.getBoundingClientRect()), mR = rel((c.monEl.querySelector('img') || c.monEl).getBoundingClientRect());
    const k0 = tR.width / 256, mhU = mR.height / k0, zt = Math.max(k0 * 1.5, Math.min(k0 * 2.6, Hd * .25 / mhU)), mcx = (mR.left + mR.width / 2 - tR.left) / k0, mcy = (mR.top + mR.height * .5 - tR.top) / k0;
    const tx = (mR.left + mR.width / 2) - mcx * zt, ty = Hd * .5 - mcy * zt - tR.top, T0 = getComputedStyle(top).transform;
    const opp = c.opp, side = opp ? 1 : -1, timers = [], tAnim = [], A = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'ease-out', ...o });
    const hide = [...bt.querySelectorAll('.bt-hb,.bt-pty,.bt-bot,.bt-mid,.bt-msg')], mon = c.monEl.querySelector('img');
    const root = document.createElement('div'); root.className = 'dx-scene gxf'; root.style.cssText = 'position:absolute;inset:0;z-index:80;overflow:hidden;pointer-events:auto;contain:strict;transform:scale(1.08)';
    const mk = (css, tag = 'div', par = root) => { const e = document.createElement(tag); e.style.cssText = 'position:absolute;pointer-events:none;' + css; par.appendChild(e); return e; };
    const at = (t, f) => timers.push(setTimeout(() => { try { f(); } catch (e) {} }, t));
    const hz = () => { try { window.GA?.haptic?.(2); } catch (e) {} }, vib = n => { for (let i = 0; i < ([1, 2, 4, 7][n] || 2); i++) timers.push(setTimeout(hz, i * 70)); };
    const shake = (t, d, amp) => at(t, () => { A(root, Array.from({ length: 10 }, (_, i) => ({ transform: i === 9 ? 'scale(1.08)' : `translate(${(Math.random() - .5) * amp * 2}px,${(Math.random() - .5) * amp * 2}px) scale(1.08)` })), { duration: d, easing: 'linear', fill: 'none' }); for (let k = 0; k < d; k += 90) timers.push(setTimeout(hz, k)); });
    const raw = n => { try { c.raw?.(n); } catch (e) {} };
    // 층: 붉게 어두워짐 · 육각 무늬 · 하늘 붉은 빛
    const dim = mk('inset:0;background:radial-gradient(circle at 50% 50%,rgba(90,0,30,.35) 0 22%,rgba(18,0,8,.96) 72%);opacity:0');
    const hex = mk(`inset:-20%;background:url(${pat}) 0 0/${Wd * .9}px auto repeat;opacity:0;mix-blend-mode:screen;animation:gxPan 9s linear infinite`);
    const sky = mk('inset:0;background:radial-gradient(ellipse 90% 45% at 50% 16%,rgba(255,30,100,.5),rgba(120,0,40,0) 70%);opacity:0');
    const CY = Hd * .48;
    // 원래 앞모습 (가운데)
    const ow = c.mon.w / 2, oh = c.mon.h / 2, oz = Math.min(Hd * .3 / oh, Wd * .7 / ow), OW = ow * oz, OH = oh * oz;
    const org = mk(`left:${(Wd - OW) / 2}px;top:${CY - OH / 2}px;width:${OW}px;height:${OH}px;opacity:0`), orgI = document.createElement('img'); orgI.src = c.mon.url; orgI.alt = ''; orgI.style.cssText = `width:100%;height:100%;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}`; org.appendChild(orgI);
    const RED = `brightness(0) saturate(100%) invert(18%) sepia(95%) saturate(6000%) hue-rotate(330deg) brightness(1.15) drop-shadow(0 0 ${Wd * .02}px #ff4d8a)`;
    // 트레이너 컷인 띠 (메가진화와 같은 자리, 붉은 빛)
    const bandH = Hd * .3, bandY = Hd * .66, band = mk(`left:-10%;right:-10%;top:${bandY}px;height:${bandH}px;background:linear-gradient(${opp ? 'to left' : 'to right'},rgba(255,235,240,.95),rgba(255,90,140,.85) 45%,rgba(200,0,60,0));transform:skewY(-8deg) translateX(${side * 110}%);opacity:0;box-shadow:0 0 30px rgba(255,40,110,.8)`);
    const tw = c.tr.w / 2, th = c.tr.h / 2, tz = bandH * 1.25 / th, TW = tw * tz, TH = th * tz, trX = opp ? Wd - TW - Wd * .02 : Wd * .02, trY = bandY + bandH - TH;
    const trn = mk(`left:${trX}px;top:${trY}px;width:${TW}px;height:${TH}px;background:url(${c.tr.url}) left center/${tw * tz}px ${TH}px no-repeat;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}opacity:0`);
    const BD = Wd * .13, bdX = opp ? trX + TW * .12 : trX + TW * .62, bdY = trY + TH * .26;
    const dband = c.item ? mk(`left:${bdX}px;top:${bdY}px;width:${BD}px;height:${BD}px;background:url(${c.item.url}) center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 10px #ff2a6a);opacity:0`) : null;
    const hx = bdX + BD / 2, hy = bdY + BD / 2;   // 던지는 손 자리
    // 던지는 볼 · 커지는 다이맥스 볼
    const sb = Wd * .085, BQ = 32 / 14, sbC = sb * BQ, ball = mk(`left:0;top:0;width:${sbC}px;height:${sbC}px;margin:${-(sbC - sb) / 2}px 0 0 ${-(sbC - sb) / 2}px;background:url(${c.ballS || c.ball}) 0 0/${c.ballS ? sbC * 10 + 'px ' + sbC + 'px' : 'contain'} no-repeat;image-rendering:pixelated;opacity:0`);   /* 경완 '배틀처럼 몬스터볼 열려서 들어가고 그 몬스터볼이 그대로 커져서 다시 나오는걸로': 배틀과 같은 플래티넘 볼 그림(32칸 10장, 0~7 돎·9 열림) */
    const bF = (el, i, w) => { if (c.ballS) el.style.backgroundPosition = `${-i * w}px 0`; };
    const BS = Wd * .5, bigW = mk(`left:${Wd / 2 - BS / 2}px;top:${CY - BS / 2}px;width:${BS}px;height:${BS}px;opacity:0;transform:scale(.17)`), bigG = mk('inset:-18%;border-radius:50%;background:radial-gradient(circle,rgba(255,60,130,.9) 0 38%,rgba(255,20,90,.35) 52%,rgba(255,0,80,0) 70%)', 'div', bigW);
    const bigS = mk(`inset:${-(BQ - 1) / 2 * 100}%;background:url(${c.ballS || c.ball}) 0 0/${c.ballS ? '1000% 100%' : 'contain'} no-repeat;image-rendering:pixelated`, 'div', bigW); bigW.after(ball); const bigP = mk(`inset:4%;border-radius:50%;background:url(${pat}) 0 0/${BS * 1.6}px auto repeat;mix-blend-mode:screen;opacity:0;animation:gxPan 3s linear infinite`, 'div', bigW);
    // 거다이맥스 모습 (아래 바닥에서 크게)
    const MH = Math.min(Hd * .62, Wd * .95 * c.to.h / c.to.w), MW = MH * (c.to.w / c.to.h), OB = await opBox(c.to.url);   /* 경완 '거다이맥스 연출에서 커진 모습 화면 정중앙에 오게': 그림의 보이는 부분(투명 뺀) 가운데를 화면 가운데에 */
    const gY = Math.min(Hd * .97, Hd / 2 + MH * (1 - (OB.y0 + OB.y1) / 2)), gX = Wd / 2 - MW * (opp ? (OB.x0 + OB.x1) / 2 : 1 - (OB.x0 + OB.x1) / 2), gC = gX + MW / 2, gF = gY - MH * (1 - OB.y1);   /* gC 그림 칸 가운데, gF 발끝 */
    const pil = mk(`left:${Wd / 2 - Wd * .2}px;top:-10%;width:${Wd * .4}px;height:${gY + Hd * .1}px;background:linear-gradient(90deg,rgba(255,0,90,0),rgba(255,80,150,.85) 35%,#fff 50%,rgba(255,80,150,.85) 65%,rgba(255,0,90,0));filter:blur(${Wd * .01}px);opacity:0;transform-origin:50% 100%;transform:scaleX(.05);mix-blend-mode:screen`);
    const shd = mk(`left:${gC - MW * .45}px;top:${gF - Hd * .025}px;width:${MW * .9}px;height:${Hd * .05}px;border-radius:50%;background:radial-gradient(closest-side,rgba(40,0,15,.7),rgba(40,0,15,0));opacity:0;transform:scale(.1)`);
    const ringB = mk('inset:0', 'canvas'); ringB.width = Wd * 2; ringB.height = Hd * 2; ringB.style.width = Wd + 'px'; ringB.style.height = Hd + 'px';
    const gm = mk(`left:${gX}px;top:${gY - MH}px;width:${MW}px;height:${MH}px;opacity:0;transform-origin:50% 100%;transform:scale(.06)`), gmI = document.createElement('img'); gmI.src = c.to.url; gmI.alt = ''; gmI.style.cssText = `width:100%;height:100%;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}`; gm.appendChild(gmI); const gmS = gmI.cloneNode(); gmS.style.cssText += `;position:absolute;inset:0;filter:${RED}`; gm.appendChild(gmS);   /* 붉은 실루엣은 따로 겹쳐 두고 흐리게 (filter 를 바로 바꾸면 중간에 초록빛) */
    gmI.style.filter = `drop-shadow(0 0 ${Wd * .012}px #ff4d8a)`;
    const gpat = mk(`inset:0;background:url(${pat}) 0 0/${MW * 1.4}px auto repeat;-webkit-mask:url("${c.to.url}") center/100% 100%;mask:url("${c.to.url}") center/100% 100%;${opp ? '' : 'transform:scaleX(-1);'}opacity:0;mix-blend-mode:screen;animation:gxPan 6s linear infinite`, 'div', gm);
    const ringF = mk('inset:0', 'canvas'); ringF.width = Wd * 2; ringF.height = Hd * 2; ringF.style.width = Wd + 'px'; ringF.style.height = Hd + 'px';
    const cv = mk('inset:0', 'canvas'); cv.width = Wd * 2; cv.height = Hd * 2; cv.style.width = Wd + 'px'; cv.style.height = Hd + 'px'; const g = cv.getContext('2d'); g.scale(2, 2);
    const ttl = mk(`left:0;right:0;top:${Hd * .15}px;text-align:center;font:900 ${Wd * .1}px/1 var(--px,"Galmuri11"),system-ui,sans-serif;color:#fff;letter-spacing:.06em;-webkit-text-stroke:${Wd * .006}px #7a0024;text-shadow:0 0 ${Wd * .02}px #ff2a6a,0 0 ${Wd * .05}px #ff0050,0 ${Wd * .008}px 0 #5a001a;opacity:0`); ttl.textContent = c.gmax ? '거다이맥스' : '다이맥스';
    const flR = mk('inset:0;background:radial-gradient(circle at 50% 55%,#fff 0,#ff7aa8 35%,#ff0050 80%);opacity:0;mix-blend-mode:screen'), flash = mk('inset:0;background:#fff;opacity:0');
    // 뒤 흐린 배경판 + 키운 위 화면 가장자리 마스크 (megaFull 과 같음)
    const ds = top.parentNode, bgF = document.createElement('div'); bgF.className = 'mgf-bg'; bgF.style.cssText = `position:absolute;inset:-6%;z-index:0;pointer-events:none;background:url(${c.bg.url}) ${-(256 * Hd * 1.12 / 150 - Wd * 1.12) / 2}px 0/${512 * Hd * 1.12 / 150}px ${192 * Hd * 1.12 / 150}px no-repeat;image-rendering:pixelated;filter:blur(3px) brightness(.5) saturate(1.2) sepia(.3) hue-rotate(-30deg);opacity:0`; ds.insertBefore(bgF, ds.firstChild);
    const MK = 'linear-gradient(to bottom,transparent,#000 14%,#000 84%,transparent),linear-gradient(to right,transparent,#000 10%,#000 90%,transparent)';
    top.style.webkitMaskImage = top.style.maskImage = MK; top.style.webkitMaskComposite = 'source-in'; top.style.maskComposite = 'intersect';
    bt.appendChild(root);
    // 입자 (밴드 → 볼로 빨려 들어감 / 바닥에서 솟아오름) + 머리 위 붉은 구름
    const parts = []; let mode = 0, live = 1, ringA = 0; const t0 = performance.now(), ring = gxRing(18, 3);
    const loop = now => { if (!live || !root.isConnected) return; const t = (now - t0) / 1000; g.clearRect(0, 0, Wd, Hd); g.globalCompositeOperation = 'lighter';
      if (mode === 1) for (let i = 0; i < 3; i++) parts.push({ x: hx, y: hy, tx: Wd / 2, ty: CY, a: Math.random() * 6.28, s: 0, sp: .9 + Math.random() * .8, r: 2 + Math.random() * 4, c: Math.random() < .5 ? '255,60,140' : '255,170,210' });
      if (mode === 2) for (let i = 0; i < 3; i++) parts.push({ x: gC + (Math.random() - .5) * MW, y: gF + Math.random() * 10, vy: -(1.5 + Math.random() * 3), vx: (Math.random() - .5) * .6, r: 1.5 + Math.random() * 3.5, l: 1, c: Math.random() < .6 ? '255,50,120' : '255,190,220' });
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i];
        if (p.tx != null) { p.s += .016 * p.sp; const u = Math.min(1, p.s), sw = Math.sin(u * Math.PI) * Wd * .12; p.cx = p.x + (p.tx - p.x) * u + Math.cos(p.a + u * 7) * sw; p.cy = p.y + (p.ty - p.y) * u + Math.sin(p.a + u * 7) * sw * .6; if (u >= 1) { parts.splice(i, 1); continue; } }
        else { p.x += p.vx; p.y += p.vy; p.l -= .012; p.cx = p.x; p.cy = p.y; if (p.l <= 0) { parts.splice(i, 1); continue; } }
        const al = p.l ?? 1, rg = g.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, p.r * 2.4); rg.addColorStop(0, `rgba(${p.c},${al})`); rg.addColorStop(1, `rgba(${p.c},0)`); g.fillStyle = rg; g.beginPath(); g.arc(p.cx, p.cy, p.r * 2.4, 0, 7); g.fill(); }
      if (ringA > 0) { const k = parseFloat(gm.dataset.k || 1), G = c.gxTop ? c.gxTop(gmI) : { y: .07, x: .5 }, rx = Math.min(MW * .5, Wd * .4) * (G.s || 1), ry = rx * .2, hyR = gY - MH * k * (1 - G.y) - ry * .9, hxR = gC + (G.x - .5) * MW * k * (opp ? 1 : -1), gb = ringB.getContext('2d'), gf = ringF.getContext('2d'); [gb, gf].forEach(x => { x.setTransform(2, 0, 0, 2, 0, 0); x.clearRect(0, 0, Wd, Hd); });
        ring(gb, t, hxR, hyR, rx, ry, 'b', ringA); ring(gf, t, hxR, hyR, rx, ry, 'f', ringA); }
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    // 1) 위 화면을 그 포켓몬 쪽으로 화면 가득 (0~900)
    hide.forEach(e => tAnim.push(A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 })));
    tAnim.push(A(top, [{ transform: T0 === 'none' ? 'none' : T0 }, { transform: `translate(${tx}px,${ty}px) scale(${zt})` }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)' }));
    tAnim.push(A(bgF, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)' }));
    at(0, () => c.se('fog2')); at(600, () => vib(1));
    // 2) 붉게 어두워지며 원래 앞모습이 가운데 (850~1500)
    A(dim, [{ opacity: 0 }, { opacity: .9 }], { duration: 600, delay: 850 }); A(hex, [{ opacity: 0 }, { opacity: .14 }], { duration: 900, delay: 900 });
    A(org, [{ opacity: 0, transform: 'scale(.8) translateY(10px)' }, { opacity: 1, transform: 'scale(1.04)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 600, delay: 950 });
    at(950, () => { if (mon) mon.style.visibility = 'hidden'; (c.cry || (() => {}))(); });
    // 3) 트레이너 컷인 + 다이맥스밴드 (1700~2700)
    A(band, [{ opacity: 1, transform: `skewY(-8deg) translateX(${side * 110}%)` }, { opacity: 1, transform: 'skewY(-8deg) translateX(0)' }], { duration: 420, delay: 1700, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
    A(trn, [{ opacity: 0, transform: `${opp ? '' : 'scaleX(-1) '}translateX(${side * 70}px)` }, { opacity: 1, transform: `${opp ? '' : 'scaleX(-1) '}translateX(0)` }], { duration: 450, delay: 1780 });
    at(1720, () => c.se('Battle recall'));
    at(2200, () => { c.se('DX Action'); vib(1); });
    if (dband) { A(dband, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.6)', offset: .6 }, { opacity: 1, transform: 'scale(1.1)' }], { duration: 500, delay: 2200 }); at(2700, () => dband.animate([{ transform: 'scale(1.1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1.1)' }], { duration: 380, iterations: 6, composite: 'replace' })); }
    // 4) 볼을 던져 포켓몬을 넣음 (2900~3700)
    const bx0 = hx - sb / 2, by0 = hy - sb / 2, bx1 = Wd / 2 - sb / 2, by1 = CY - sb / 2;
    at(2900, () => { c.se('Battle throw'); vib(1); let i = 0; const iv = setInterval(() => { if (!live) return clearInterval(iv); bF(ball, i++ % 8, sbC); }, 65); timers.push(setTimeout(() => { clearInterval(iv); bF(ball, 9, sbC); }, 530)); });
    A(ball, [{ opacity: 1, transform: `translate(${bx0}px,${by0}px) rotate(0)` }, { opacity: 1, transform: `translate(${(bx0 + bx1) / 2}px,${Math.min(by0, by1) - Hd * .16}px) rotate(${side * -360}deg)`, offset: .5 }, { opacity: 1, transform: `translate(${bx1}px,${by1}px) rotate(${side * -720}deg)` }], { duration: 520, delay: 2900, easing: 'linear' });
    at(3430, () => { c.se('Battle recall'); vib(2); orgI.style.transition = 'filter .25s'; orgI.style.filter = RED; });
    A(flR, [{ opacity: 0 }, { opacity: .45 }, { opacity: 0 }], { duration: 420, delay: 3430 });
    A(org, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.06,.96)', offset: .18 }, { opacity: 1, transform: 'scale(.5,.62)', offset: .6 }, { opacity: 0, transform: 'scale(.04)' }], { duration: 600, delay: 3480, easing: 'cubic-bezier(.6,0,.9,.6)' });
    /* 경완 '거다이맥스 연출에서 볼 빨려들어갈 때 실루엣 빨려들어가는 연출 추가': 붉은 실루엣 잔상 3겹이 차례로 볼로 줄어들고, 몸 둘레에서 붉은 빛 줄기가 볼 쪽으로 빨려 감 */
    for (let k = 0; k < 3; k++) { const gh = org.cloneNode(true); gh.firstChild.style.filter = RED; gh.style.opacity = 0; root.insertBefore(gh, ball); A(gh, [{ opacity: .55 - k * .12, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.05)' }], { duration: 520, delay: 3480 + 110 + k * 120, easing: 'cubic-bezier(.7,0,1,.7)' }); }
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + .2, rx = OW * .5, ry = OH * .5, sx = Math.cos(a) * rx, sy = Math.sin(a) * ry, L = Math.hypot(sx, sy), ang = Math.atan2(sy, sx) * 180 / Math.PI, st = mk(`left:${Wd / 2}px;top:${CY}px;width:${L}px;height:${Math.max(2, Wd * .008)}px;margin-top:${-Math.max(2, Wd * .008) / 2}px;transform-origin:0 50%;background:linear-gradient(90deg,#fff,rgba(255,60,130,.9) 30%,rgba(255,0,80,0));border-radius:9px;filter:drop-shadow(0 0 4px #ff2a6a);opacity:0`); A(st, [{ opacity: 0, transform: `rotate(${ang}deg) scaleX(1)` }, { opacity: 1, transform: `rotate(${ang}deg) scaleX(.9)`, offset: .25 }, { opacity: 0, transform: `rotate(${ang}deg) scaleX(.02)` }], { duration: 420, delay: 3450 + (k % 4) * 60, easing: 'ease-in' }); }
    A(ball, [{ opacity: 1, transform: `translate(${bx1}px,${by1}px) rotate(${side * -720}deg)` }, { opacity: 1, transform: `translate(${bx1}px,${by1 - Hd * .03}px) rotate(${side * -700}deg)`, offset: .4 }, { opacity: 1, transform: `translate(${bx1}px,${by1}px) rotate(${side * -720}deg)` }], { duration: 420, delay: 3430, easing: 'ease-in-out' });
    // 5) 밴드의 붉은 기운이 볼로 → 볼이 점점 커짐 (4000~5600)
    at(3960, () => bF(ball, 0, sbC)); at(4000, () => { ball.getAnimations().forEach(a => a.cancel()); ball.style.display = 'none'; mode = 1; c.se('Psych Up'); vib(1); });
    A(bigW, [{ opacity: 0, transform: 'scale(.17)' }, { opacity: 1, transform: 'scale(.17)' }], { duration: 120, delay: 3950 });
    A(bigW, [{ opacity: 1, transform: 'scale(.17)' }, { opacity: 1, transform: 'scale(.42)', offset: .35 }, { opacity: 1, transform: 'scale(.66)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 1500, delay: 4100, easing: 'cubic-bezier(.5,0,.6,1.4)' });
    A(bigP, [{ opacity: 0 }, { opacity: .7 }], { duration: 1200, delay: 4200 }); A(bigG, [{ transform: 'scale(.8)' }, { transform: 'scale(1.15)' }, { transform: 'scale(.95)' }], { duration: 500, delay: 4100, iterations: 4, fill: 'none' });
    [4150, 4650, 5150].forEach((t, j) => at(t, () => { c.se(j < 2 ? 'Ice5' : 'Charge'); vib(1); })); shake(4700, 900, 3);
    A(sky, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay: 4300 });
    at(5600, () => { mode = 0; }); [band, trn, dband].forEach(e => e && A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: 5500 }));
    A(bigW, [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.03) rotate(-6deg)' }, { transform: 'scale(1) rotate(6deg)' }, { transform: 'scale(1.05) rotate(-4deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 480, delay: 5650, composite: 'replace' });
    at(5650, () => { c.se('Earth1'); vib(2); }); shake(5650, 480, 6);
    // 6) 볼이 터지며 붉은 기둥 → 거대한 붉은 실루엣이 솟음 (6200~7700)
    at(6200, () => { if (c.ballS) bigS.style.backgroundPosition = '100% 0'; c.se('Explosion3'); raw('W087'); vib(3); }); shake(6200, 500, 10);
    A(flR, [{ opacity: 0 }, { opacity: .9 }, { opacity: 0 }], { duration: 600, delay: 6200 });
    A(bigW, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.08)', offset: .5 }, { opacity: 0, transform: 'scale(1.5)' }], { duration: 520, delay: 6200, easing: 'ease-out' });
    A(pil, [{ opacity: 0, transform: 'scaleX(.05)' }, { opacity: 1, transform: 'scaleX(1)', offset: .25 }, { opacity: 1, transform: 'scaleX(1.4)', offset: .7 }, { opacity: 0, transform: 'scaleX(2.4)' }], { duration: 1700, delay: 6200, easing: 'ease-out' });
    at(6250, () => { mode = 2; });
    A(shd, [{ opacity: 0, transform: 'scale(.1)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1300, delay: 6300 });
    /* 경완 2026-11-19 '포켓몬 중앙에 나와서 커질 때 뒤에 있는 상대 배틀 포켓몬 커지는 거 맞춰서 같이 작아지고 배경도 커졌을 때 배경으로 바뀌게, 그 다음 자연스럽게 배틀 화면으로':
       커지기 시작할 때 배틀 화면을 미리 거다이맥스 배치로 바꿈(onSwap → gxLay: 상대 .45 로 줄어듦·하늘/천장 이어 그린 배경, CSS 1.4초 전환이 커지는 1.5초와 같이 감). 뒤가 보이게 어둠을 걷고, 내 쪽 배틀 그림은 장면이 끝날 때까지 숨김 */
    const mw = c.monEl.closest('.bt-mw'); let swapped = 0, zOut = 0; const doSwap = () => { if (swapped) return; swapped = 1; try { c.onSwap?.(); } catch (e) {} };
    /* 경완 '거다이맥스 커지는 연출 나올 때 뒤에 배틀창 있는 부분 여백이랑 밑에 빈 화면 여백 보이는데 자연스럽게': 위 화면이 물러날 때 화면 전체 뒤판을 바뀐 거다이맥스 하늘 배경(bgG)으로 덮고, 위 화면 가장자리는 계속 흐리게(MK) 이어 붙여 빈 칸·딱딱한 테두리 없이 */
    let bgG = null; const bgSwap = (n = 0) => { const cv = top.querySelector('.bt-gxbg'); if (!cv) { if (n < 12 && live) timers.push(setTimeout(() => bgSwap(n + 1), 60)); return; } let u = ''; try { u = cv.toDataURL(); } catch (e) { return; } bgG = document.createElement('div'); bgG.className = 'mgf-bg'; bgG.style.cssText = `position:absolute;inset:-6%;z-index:0;pointer-events:none;background:url(${u}) center 30%/cover no-repeat;filter:blur(4px) brightness(.62) saturate(1.15);opacity:0`; bgF.after(bgG); tAnim.push(A(bgG, [{ opacity: 0 }, { opacity: 1 }], { duration: 1100, easing: 'ease-in-out' })); };
    at(6300, () => { if (mw) mw.style.visibility = 'hidden'; doSwap(); zOut = 1; tAnim.push(A(top, [{ transform: `translate(${tx}px,${ty}px) scale(${zt})` }, { transform: T0 === 'none' ? 'none' : T0 }], { duration: 1500, easing: 'cubic-bezier(.3,.7,.4,1)' })); bgSwap();  A(dim, [{ opacity: .9 }, { opacity: .3 }], { duration: 1400, easing: 'ease-in-out' });   /* 카메라가 뒤로 물러나듯 위 화면이 원래 크기로 → 줄어드는 상대·하늘까지 보이는 배경이 드러남 */ A(hex, [{ opacity: .14 }, { opacity: .06 }], { duration: 1400 }); });
    A(gm, [{ opacity: 0, transform: 'scale(.06)' }, { opacity: 1, transform: 'scale(.3)', offset: .2 }, { opacity: 1, transform: 'scale(.8)', offset: .75 }, { opacity: 1, transform: 'scale(1)' }], { duration: 1500, delay: 6300, easing: 'cubic-bezier(.3,.7,.4,1)' });
    at(6300, () => { const ks = performance.now(); const tk = () => { if (!live) return; const u = Math.min(1, (performance.now() - ks) / 1500); gm.dataset.k = Math.max(.06, 1 - Math.pow(1 - u, 2.2)); if (u < 1) requestAnimationFrame(tk); }; tk(); c.se('Psych Up'); });
    [6500, 6900, 7300].forEach(t => at(t, () => { raw('W087'); vib(1); })); shake(6400, 1500, 5);
    at(6900, () => { const s0 = performance.now(); const fa = () => { if (!live) return; ringA = Math.min(1, (performance.now() - s0) / 900); if (ringA < 1) requestAnimationFrame(fa); }; fa(); });
    // 7) 번쩍 → 색이 돌아오며 포효 (7850~)
    A(flash, [{ opacity: 0 }, { opacity: .9 }, { opacity: 0 }], { duration: 520, delay: 7850, easing: 'linear' });
    at(7920, () => { A(gmS, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }); A(gpat, [{ opacity: 0 }, { opacity: .55 }], { duration: 900 }); c.se('Saint7'); vib(3); });
    at(8200, () => { (c.cryBig || c.cry)(); }); shake(8200, 900, 11);
    at(8200, () => { for (let i = 0; i < 3; i++) { const r = mk(`left:50%;top:${gY - MH * .55}px;width:${Wd * .5}px;height:${Wd * .5}px;margin:${-Wd * .25}px 0 0 ${-Wd * .25}px;border-radius:50%;border:${Wd * .02}px solid rgba(255,90,150,.9);box-shadow:0 0 18px #ff2a6a,inset 0 0 18px #ff2a6a`); A(r, [{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: `scale(${4 + i * 1.5})` }], { duration: 900 + i * 250, delay: i * 140, easing: 'cubic-bezier(.1,.7,.3,1)' }); } });
    A(ttl, [{ opacity: 0, transform: 'scale(1.8)', letterSpacing: '.5em' }, { opacity: 1, transform: 'scale(1)', letterSpacing: '.06em', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 600, delay: 8500, easing: 'cubic-bezier(.2,1.3,.4,1)' });
    // 8) 원래 화면으로
    const END = 10800;
    return new Promise(res => { let done = false;
      const fin = () => { if (done) return; done = true; doSwap(); timers.forEach(t => clearTimeout(t)); if (mon) mon.style.visibility = ''; if (mw) { mw.style.visibility = ''; mw.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' }); }   /* 줄어든 상대·바뀐 배경은 그대로, 내 거다이맥스 뒷모습만 장면이 걷힐 때 같이 나타남 */
        top.style.webkitMaskImage = top.style.maskImage = '';
        const back = [...(zOut ? [] : [A(top, [{ transform: `translate(${tx}px,${ty}px) scale(${zt})` }, { transform: T0 === 'none' ? 'none' : T0 }], { duration: 420, easing: 'cubic-bezier(.5,0,.2,1)' })]), ...hide.map(e => A(e, [{ opacity: 1 }, { opacity: 1 }], { duration: 420 })), A(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })];
        tAnim.forEach(a => a.cancel()); back.push(A(bgF, zOut ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1 }, { opacity: 1 }], { duration: 420 })); if (bgG) back.push(A(bgG, [{ opacity: 1 }, { opacity: 0 }], { duration: 420 })); Promise.all(back.map(a => a.finished.catch(() => {}))).then(() => { live = 0; back.forEach(a => a.cancel()); root.remove(); bgF.remove(); bgG?.remove(); top.style.webkitMaskImage = top.style.maskImage = top.style.webkitMaskComposite = top.style.maskComposite = ''; res(); }); };
      const lk = document.createElement('div'); lk.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:transparent;touch-action:none'; const eat = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }; ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(t => lk.addEventListener(t, eat, { passive: false })); document.body.appendChild(lk);
      setTimeout(() => { lk.remove(); fin(); }, END - 500); });
  }

  // ---------- 테라스탈 전체 화면 (본가 스칼렛·바이올렛 흐름) ----------
  /* 경완 2026-11-19 '본가 테라스탈 연출 찾아보고 메진 거다이 수준으로 연출 만들어줘봐 포켓몬 위에 오버레이 되는 타입 크리스탈 연출까지'
     본가 흐름: 트레이너가 테라스탈오브에 힘을 모음 → 머리 위로 던짐 → 오브가 포켓몬 위에서 터지며 결정이 포켓몬을 감쌈 → 결정이 깨지며
     보석처럼 빛나는 몸 + 머리 위 타입 모양 테라 보석 관(테라스탈 왕관)으로 나옴. 소리·흔들림·진동은 메가진화·거다이맥스와 같은 틀 */
  const TCR = {   /* 타입별 테라 보석 관 모양: [가운데 x, 폭, 높이, 기울기(도)] (100×80 칸, 바닥 y=72) */
    Normal: [[50, 18, 46, 0], [32, 14, 30, -16], [68, 14, 30, 16]], Fire: [[50, 16, 60, 0], [33, 14, 42, -22], [67, 14, 42, 22], [22, 10, 24, -40], [78, 10, 24, 40]],
    Water: [[50, 14, 56, 0], [36, 12, 40, -34], [64, 12, 40, 34], [24, 10, 26, -62], [76, 10, 26, 62]], Grass: [[50, 22, 46, 0], [30, 22, 36, -38], [70, 22, 36, 38]],
    Electric: [[50, 16, 58, 14], [36, 12, 34, -20], [64, 12, 34, 30]], Ice: [[50, 10, 62, 0], [40, 9, 48, -8], [60, 9, 48, 8], [30, 8, 36, -18], [70, 8, 36, 18], [21, 7, 24, -30], [79, 7, 24, 30]],
    Fighting: [[40, 22, 38, -8], [60, 22, 38, 8]], Poison: [[50, 16, 50, 0], [34, 13, 32, -24], [66, 13, 32, 24]], Ground: [[50, 30, 30, 0], [28, 22, 22, -12], [72, 22, 22, 12]],
    Flying: [[34, 22, 40, -52], [66, 22, 40, 52], [50, 12, 36, 0]], Psychic: [[50, 12, 58, 0], [36, 10, 40, -14], [64, 10, 40, 14]], Bug: [[40, 8, 54, -22], [60, 8, 54, 22], [50, 16, 28, 0]],
    Rock: [[50, 28, 40, 0], [30, 22, 30, -18], [70, 22, 30, 18]], Ghost: [[50, 14, 54, -8], [34, 12, 38, -26], [66, 12, 38, 18]], Dragon: [[36, 12, 58, -24], [64, 12, 58, 24], [50, 14, 30, 0]],
    Dark: [[50, 12, 58, 0], [36, 10, 46, -18], [64, 10, 46, 18]], Steel: [[50, 14, 46, 0], [34, 14, 40, 0], [66, 14, 40, 0], [20, 12, 30, 0], [80, 12, 30, 0]], Fairy: [[50, 18, 46, 0], [32, 18, 38, -40], [68, 18, 38, 40], [24, 14, 22, -72], [76, 14, 22, 72]],
    Stellar: [[50, 14, 58, 0], [34, 12, 42, -24], [66, 12, 42, 24], [22, 10, 28, -48], [78, 10, 28, 48]] };
  const STL = [[255, 120, 140], [255, 200, 100], [250, 250, 130], [120, 240, 150], [110, 200, 255], [190, 140, 255]];
  /* 결정 하나 (아래가 넓고 위가 뾰족한 여섯모 기둥, 왼쪽 면 밝게·오른쪽 면 짙게·흰 테두리) */
  /* 경완 2026-11-19 '크리스탈 그래픽들 좀 짜치는데, 본가 그래픽 참고해서 비슷하게 퀄리티 높여서': 본가 테라 결정처럼 진한 타입 색 보석 — 면마다 그라데이션(밝은 윗면·짙은 아랫면), 가운데 능선, 흰 반사 줄, 끝 반짝 */
  const TJ = { Normal: ['#ffffff', '#dcdee6', '#9396a6'], Fire: ['#fff3b0', '#ff7a2a', '#c41e16'], Water: ['#dcf5ff', '#3fa0ff', '#1640c4'], Grass: ['#eaffb4', '#58d046', '#147a28'], Electric: ['#fffcc4', '#ffd21e', '#d48400'], Ice: ['#f2ffff', '#8ee8f4', '#35a2d6'],
    Fighting: ['#ffd4ac', '#e8602a', '#962810'], Poison: ['#f6ccff', '#b44ee0', '#661896'], Ground: ['#fff2bc', '#e0b050', '#946420'], Flying: ['#f0f2ff', '#9ab0ff', '#5064e0'], Psychic: ['#ffd8ee', '#ff5aa8', '#bc1868'], Bug: ['#f6ffb4', '#a8d21e', '#5a8610'],
    Rock: ['#fff6d4', '#c8a860', '#7c5c2c'], Ghost: ['#e6dcff', '#7a5ad8', '#36228c'], Dragon: ['#dcd4ff', '#6a50ff', '#2616ac'], Dark: ['#dcd4dc', '#6a5a6a', '#261c2c'], Steel: ['#ffffff', '#b8c8d8', '#66788c'], Fairy: ['#ffeaf6', '#ff9ad0', '#d44c88'] };
  const STJ = [['#ffe0e6', '#ff6a8a', '#c8204a'], ['#fff2c8', '#ffb43c', '#c86a00'], ['#fffcd0', '#f4e43c', '#a89400'], ['#e0ffe8', '#4ee08a', '#108a48'], ['#e0f4ff', '#44b4ff', '#1458c8'], ['#ece0ff', '#a070ff', '#5a24c8']];
  const tjOf = (t, i = 0) => t === 'Stellar' ? STJ[i % 6] : TJ[t] || TJ.Normal;
  let UID = 0;
  function shardP(x, w, h, rot, C, by = 72, op = 1) { const u = 'tq' + (++UID), l = x - w / 2, r = x + w / 2, ml = x - w * .16, mr = x + w * .16, s = h * .3, tp = by - h, [hi, md, dk] = C;
    return `<defs><linearGradient id="${u}l" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${md}"/><stop offset="1" stop-color="${dk}"/></linearGradient><linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${hi}"/><stop offset="1" stop-color="${md}"/></linearGradient><linearGradient id="${u}r" x1="1" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${md}"/><stop offset="1" stop-color="${dk}"/></linearGradient></defs>`
      + `<g transform="rotate(${rot} ${x} ${by})" opacity="${op}"><polygon points="${l},${by} ${ml},${by + 2.5} ${x},${tp} ${l},${tp + s}" fill="url(#${u}l)"/><polygon points="${ml},${by + 2.5} ${mr},${by + 2.5} ${x},${tp}" fill="url(#${u}c)"/><polygon points="${mr},${by + 2.5} ${r},${by} ${r},${tp + s} ${x},${tp}" fill="url(#${u}r)"/>`
      + `<polygon points="${l + w * .12},${tp + s * 1.15} ${l + w * .26},${tp + s * .75} ${l + w * .26},${by - h * .2} ${l + w * .12},${by - h * .12}" fill="rgba(255,255,255,.7)"/><polygon points="${x},${tp} ${x - w * .1},${tp + s * .55} ${x},${tp + s * .4} ${x + w * .1},${tp + s * .55}" fill="rgba(255,255,255,.9)"/>`
      + `<polygon points="${l},${by} ${ml},${by + 2.5} ${mr},${by + 2.5} ${r},${by} ${r},${tp + s} ${x},${tp} ${l},${tp + s}" fill="none" stroke="rgba(255,255,255,.92)" stroke-width="1.1" stroke-linejoin="round"/><polyline points="${ml},${by + 2.5} ${x},${tp} ${mr},${by + 2.5}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width=".7"/></g>`; }
  function teraCrown(t) { const L = TCR[t] || TCR.Normal, [hi, md, dk] = tjOf(t), u = 'tc' + (++UID);
    const sh = L.slice().sort((a, b) => a[2] - b[2]).map((s, i) => shardP(s[0], s[1], s[2], s[3], tjOf(t, i * 2))).join('');
    const band = `<defs><linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${md}"/><stop offset="1" stop-color="${dk}"/></linearGradient><radialGradient id="${u}g" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${hi}"/><stop offset=".75" stop-color="${md}"/><stop offset="1" stop-color="${dk}"/></radialGradient><radialGradient id="${u}h" cx=".5" cy=".6" r=".5"><stop offset="0" stop-color="${md}" stop-opacity=".55"/><stop offset="1" stop-color="${md}" stop-opacity="0"/></radialGradient></defs>`
      + `<path d="M20,70 Q50,64 80,70 L74,79 Q50,74 26,79 Z" fill="url(#${u}b)" stroke="rgba(255,255,255,.95)" stroke-width="1.2" stroke-linejoin="round"/><path d="M24,72 Q50,67 76,72" fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".8"/>`
      + `<polygon points="50,60 57,64.5 57,73.5 50,78 43,73.5 43,64.5" fill="url(#${u}g)" stroke="#fff" stroke-width="1.2"/><polygon points="50,60 57,64.5 50,68 43,64.5" fill="rgba(255,255,255,.55)"/>`
      + `<polygon points="31,70 35,67.5 39,70 35,75" fill="url(#${u}g)" stroke="#fff" stroke-width=".9"/><polygon points="61,70 65,67.5 69,70 65,75" fill="url(#${u}g)" stroke="#fff" stroke-width=".9"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 82"><ellipse cx="50" cy="52" rx="44" ry="32" fill="url(#${u}h)"/>${sh}${band}</svg>`; }
  /* 경완 '테라스탈 결정 그래픽은 여전히 본가랑 너무 다른데 첨부한 이미지에 담긴 테라 크리스탈들 참고해서 pixellab으로 만들어도 돼': 관·조각·큰 결정 = PixelLab 도트(gym/img/dbk/Tera/px, 원본 assets_src/tera/pixellab). 조각·큰 결정은 무색 → 타입 색(tjOf)을 밝기대로 입힘 */
  const TPX = 'gym/img/dbk/Tera/px/';
  const crownUrl = t => `gym/img/dbk/Tera/cr/${String(t || 'Normal').toLowerCase()}.webp`;   /* v27.26 경완 '첨부 이미지 참고해서 너가 직접 … 결정 느낌과 반짝이는 느낌 고퀄로': 직접 그린 결정 관 (assets_src/tera/crown/gen.js) */
  const TJC = {}, hx2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function tjTint(f, t, i = 0) { const C = tjOf(t, i), k = f + '|' + C.join(); if (TJC[k]) return TJC[k];
    return (TJC[k] = new Promise(ok => { const im = new Image(); im.onload = () => { try { const w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, w, h), D = d.data, [hi, md, dk] = C.map(hx2);
      for (let p = 0; p < D.length; p += 4) { if (!D[p + 3]) continue; const v = (D[p] * .3 + D[p + 1] * .55 + D[p + 2] * .15) / 255, u = Math.max(0, Math.min(1, (v - .35) / .6)); let c; if (u < .5) { const q = u / .5; c = dk.map((x, j) => x + (md[j] - x) * q); } else { const q = (u - .5) / .5; c = md.map((x, j) => x + (hi[j] - x) * q); } if (v > .93) { const q = (v - .93) / .07; c = c.map(x => x + (255 - x) * q); } D[p] = c[0]; D[p + 1] = c[1]; D[p + 2] = c[2]; }
      g.putImageData(d, 0, 0); ok(cv.toDataURL()); } catch (e) { ok(TPX + f); } }; im.onerror = () => ok(TPX + f); im.src = TPX + f; })); }
  const tjPrep = async T => ({ sh: await Promise.all([1, 2, 3, 4, 5, 6].map(k => tjTint(`shard_${k}.png`, T, k - 1))), cl: await tjTint('cluster_1.png', T, 0) });
  const tjBg = u => `background:url("${u}") center/contain no-repeat;image-rendering:pixelated;`;
  /* 깨지는 결정 조각 (흩어지는 파편): 두 면 그라데이션 + 반사 */
  const chip = (C, w, h) => { const u = 'tp' + (++UID), [hi, md, dk] = C; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="overflow:visible"><defs><linearGradient id="${u}a" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${hi}"/><stop offset="1" stop-color="${md}"/></linearGradient><linearGradient id="${u}b" x1="1" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="${md}"/><stop offset="1" stop-color="${dk}"/></linearGradient></defs><polygon points="0,${h * .7} ${w * .45},0 ${w * .5},${h * .55}" fill="url(#${u}a)"/><polygon points="0,${h * .7} ${w * .5},${h * .55} ${w * .7},${h}" fill="${md}"/><polygon points="${w * .45},0 ${w},${h * .35} ${w * .7},${h} ${w * .5},${h * .55}" fill="url(#${u}b)"/><polygon points="${w * .18},${h * .5} ${w * .4},${h * .12} ${w * .43},${h * .3}" fill="rgba(255,255,255,.75)"/><polygon points="0,${h * .7} ${w * .45},0 ${w},${h * .35} ${w * .7},${h}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="${Math.max(.8, w * .045)}" stroke-linejoin="round"/></svg>`; };
  /* 포켓몬 전체를 감싸는 큰 결정 (가운데 기둥 + 둘레 기둥들) */
  function bigGem(t, w, h) { const P = [[50, 30, 96, 0], [30, 24, 74, -14], [70, 24, 74, 14], [16, 18, 50, -30], [84, 18, 50, 30], [40, 16, 56, -4], [60, 16, 56, 4]];
    const g = P.slice().sort((a, b) => a[2] - b[2]).map((s, i) => shardP(s[0], s[1], s[2], s[3], tjOf(t, i), 99)).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 102" width="${w}" height="${h}" preserveAspectRatio="none" style="overflow:visible">${g}</svg>`; }
  const HDX = {};   /* 그림 맨 위(머리) 가운데 x (0~1) */
  async function headX(u) { if (u in HDX) return HDX[u]; let v = .5; try { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = u; await im.decode(); const w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, w, h).data, A = (i, y) => d[(y * w + i) * 4 + 3] > 40;
    let y0 = -1, y1 = -1; for (let y = 0; y < h && y0 < 0; y++) for (let i = 0; i < w; i++) if (A(i, y)) { y0 = y; break; } for (let y = h - 1; y >= 0 && y1 < 0; y--) for (let i = 0; i < w; i++) if (A(i, y)) { y1 = y; break; }
    if (y0 >= 0) { const band = y0 + Math.max(3, Math.round((y1 - y0) * .18)); let sx = 0, n = 0; for (let y = y0; y <= band; y++) for (let i = 0; i < w; i++) if (A(i, y)) { sx += i; n++; } if (n) v = sx / n / w; } } catch (e) {} return (HDX[u] = v); }

  async function teraFull(c) {
    const P = c.path, T = c.type || 'Normal', [tO, tB] = tyCol(T), ST = T === 'Stellar', TL = rgba(mixC(tO, [255, 255, 255], .5), 1), TD = rgba(tB, 1);
    await preload({ ...c, extra: [P + 'particle.png', P + 'burst.png', c.icon, c.pat].filter(Boolean) }); const TX = await tjPrep(T);
    const bt = c.bt, top = c.top, R0 = bt.getBoundingClientRect(), Wd = bt.offsetWidth, Hd = bt.offsetHeight, q = R0.width / Wd || 1, rel = r => ({ left: (r.left - R0.left) / q, top: (r.top - R0.top) / q, width: r.width / q, height: r.height / q }), tR = rel(top.getBoundingClientRect()), mR = rel((c.monEl.querySelector('img') || c.monEl).getBoundingClientRect());
    const k0 = tR.width / 256, mhU = mR.height / k0, zt = Math.max(k0 * 1.5, Math.min(k0 * 2.6, Hd * .25 / mhU)), mcx = (mR.left + mR.width / 2 - tR.left) / k0, mcy = (mR.top + mR.height * .5 - tR.top) / k0;
    const tx = (mR.left + mR.width / 2) - mcx * zt, ty = Hd * .5 - mcy * zt - tR.top;   /* 메가진화와 같은 화면 키우기 */
    const T0 = getComputedStyle(top).transform, tAnim = [], timers = [], A = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'ease-out', ...o });
    const hide = [...bt.querySelectorAll('.bt-hb,.bt-pty,.bt-bot,.bt-mid,.bt-msg')];
    const root = document.createElement('div'); root.className = 'dx-scene tff'; root.style.cssText = 'position:absolute;inset:0;z-index:80;overflow:hidden;pointer-events:auto;contain:strict;transform:scale(1.08)';
    const mk = (css, tag = 'div') => { const e = document.createElement(tag); e.style.cssText = 'position:absolute;pointer-events:none;' + css; root.appendChild(e); return e; };
    const mon = c.monEl.querySelector('img'), opp = c.opp, side = opp ? 1 : -1, PR = 'conic-gradient(from 0deg,#ff8ab0,#ffd88a,#fff8a0,#9cffc4,#8ad8ff,#b49cff,#ff8ae0,#ff8ab0)';
    // 층: 어두운 바탕(타입 색이 비치는 보랏빛 어둠) · 프리즘 빛살 · 반짝이
    const dim = mk(`inset:0;background:radial-gradient(circle at 50% 50%,${rgba(tB, .3)} 0 18%,rgba(10,6,30,.92) 62%,rgba(2,0,10,.98));opacity:0`);
    const prism = mk(`left:50%;top:50%;width:${Math.hypot(Wd, Hd) * 1.4}px;height:${Math.hypot(Wd, Hd) * 1.4}px;margin:${-Math.hypot(Wd, Hd) * .7}px 0 0 ${-Math.hypot(Wd, Hd) * .7}px;border-radius:50%;background:${PR};-webkit-mask:repeating-conic-gradient(#000 0 5deg,transparent 5deg 15deg),radial-gradient(circle,transparent 8%,#000 20%,transparent 60%);-webkit-mask-composite:source-in;mask:repeating-conic-gradient(#000 0 5deg,transparent 5deg 15deg),radial-gradient(circle,transparent 8%,#000 20%,transparent 60%);mask-composite:intersect;mix-blend-mode:screen;opacity:0`);
    const glow = mk(`left:50%;top:${Hd * .52}px;width:${Wd * .9}px;height:${Wd * .9}px;margin:${-Wd * .45}px 0 0 ${-Wd * .45}px;border-radius:50%;background:radial-gradient(circle,#fff 0 14%,${rgba(mixC(tO, [255, 255, 255], .4), .85)} 30%,${rgba(tB, .4)} 50%,${rgba(tB, 0)} 70%);opacity:0;transform:scale(.2)`);
    // 가운데 원래 앞모습
    const mw = c.mon.w / 2, mh = c.mon.h / 2, mz = Math.min(Hd * .34 / mh, Wd * .74 / mw), MW = mw * mz, MH = mh * mz, CYc = Hd * .52;
    const OB = await opBox(c.mon.url), BX = Wd / 2 - MW * (opp ? (OB.x0 + OB.x1) / 2 : 1 - (OB.x0 + OB.x1) / 2), BY = CYc - MH * (OB.y0 + OB.y1) / 2;   /* 경완 '포켓몬이랑 결정 나올 때 가운데 정렬 맞춰줘': 그림 칸 말고 보이는 몸(투명 뺀 범위) 가운데를 화면 가운데에 — 결정·빛도 그 자리 */
    const box = mk(`left:${BX}px;top:${BY}px;width:${MW}px;height:${MH}px;opacity:0`), im = document.createElement('img'); im.src = c.mon.url; im.alt = ''; im.style.cssText = `position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}`; box.appendChild(im);
    const HX = await headX(c.mon.url), hx = (opp ? HX : 1 - HX) * MW + BX, hy = BY + MH * OB.y0;   /* 머리 위 자리 (그림 투명한 곳 뺌) */
    const gx = BX + MW * (opp ? (OB.x0 + OB.x1) / 2 : 1 - (OB.x0 + OB.x1) / 2), gy = BY + MH * (OB.y0 + OB.y1) / 2, GW = MW * (OB.x1 - OB.x0), GH = MH * (OB.y1 - OB.y0);
    // 테라스탈 뒤 몸: 결정 무늬(그림 모양 가면) + 빛이 쓸고 지나감
    const pat = document.createElement('i'); pat.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0;background:url(${c.pat}) 0 0/${MW * 1.2}px ${MW * 1.2}px repeat;mix-blend-mode:${ST ? 'screen' : 'normal'};-webkit-mask:url("${c.mon.url}") 0 0/100% 100%;mask:url("${c.mon.url}") 0 0/100% 100%;${opp ? '' : 'transform:scaleX(-1);'}`; box.appendChild(pat);
    const swp = document.createElement('i'); swp.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.95) 45%,${rgba(mixC(tO, [255, 255, 255], .6), .6)} 52%,transparent 64%) -200% 0/250% 100% no-repeat;-webkit-mask:url("${c.mon.url}") 0 0/100% 100%;mask:url("${c.mon.url}") 0 0/100% 100%;${opp ? '' : 'transform:scaleX(-1);'}`; box.appendChild(swp);
    const WH = `brightness(0) invert(1) drop-shadow(0 0 ${Wd * .02}px #fff) drop-shadow(0 0 ${Wd * .05}px ${TL})`, NORM = `brightness(1) invert(0) drop-shadow(0 0 ${Wd * .012}px rgba(255,255,255,.8)) drop-shadow(0 0 ${Wd * .035}px ${rgba(tO, .7)})`;
    // 트레이너 컷인 띠 (무지갯빛)
    const bandH = Hd * .3, band = mk(`left:-10%;right:-10%;top:${Hd * .66}px;height:${bandH}px;background:linear-gradient(${opp ? 'to left' : 'to right'},rgba(255,255,255,.95),rgba(200,240,255,.88) 35%,rgba(255,200,240,.55) 60%,rgba(140,120,255,0));transform:skewY(-8deg) translateX(${side * 110}%);opacity:0;box-shadow:0 0 30px rgba(160,220,255,.85)`);
    const tw = c.tr.w / 2, th = c.tr.h / 2, tz = bandH * 1.25 / th, TW = tw * tz, TH = th * tz, trX = opp ? Wd - TW - Wd * .02 : Wd * .02, trY = Hd * .66 + bandH - TH;
    const trn = mk(`left:${trX}px;top:${trY}px;width:${TW}px;height:${TH}px;background:url(${c.tr.url}) left center/${c.tr.w / 2 * tz}px ${TH}px no-repeat;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}opacity:0`);
    const OS = Wd * .15, oX = opp ? trX + TW * .1 : trX + TW * .62, oY = trY + TH * .14;   /* 테라스탈오브: 트레이너 손 위 */
    const orbH = mk(`left:${oX - OS * .9}px;top:${oY - OS * .9}px;width:${OS * 2.8}px;height:${OS * 2.8}px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95) 0 12%,rgba(200,240,255,.6) 26%,rgba(255,170,240,.25) 45%,transparent 66%);opacity:0;mix-blend-mode:screen`);
    const orbR = mk(`left:${oX - OS * .45}px;top:${oY - OS * .45}px;width:${OS * 1.9}px;height:${OS * 1.9}px;border-radius:50%;background:${PR};-webkit-mask:radial-gradient(circle,transparent 46%,#000 50%,#000 56%,transparent 60%);mask:radial-gradient(circle,transparent 46%,#000 50%,#000 56%,transparent 60%);opacity:0;filter:blur(1px)`);
    const orb = mk(`left:${oX}px;top:${oY}px;width:${OS}px;height:${OS}px;background:url(${c.item?.url || P + 'it/TERAORB.png'}) center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 10px #bfe8ff);opacity:0`);
    // 오브로 모이는 결정 빛 (작은 육각 반짝이)
    const spk = Array.from({ length: 22 }, (_, i) => mk(`left:0;top:0;width:${Wd * .045}px;height:${Wd * .045}px;background:${['#fff', '#bfe8ff', '#ffd0f4', '#fff6b0', TL][i % 5]};clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);opacity:0;mix-blend-mode:screen;filter:drop-shadow(0 0 4px #fff)`));
    // 결정 조각 (날아와 감싸고, 깨지며 흩어짐)
    const NS = 16, shards = Array.from({ length: NS }, (_, i) => { const w = Wd * (.07 + (i % 4) * .025), h = w * (1.4 + (i % 3) * .3), e = mk(`left:0;top:0;width:${w}px;height:${h}px;opacity:0;filter:drop-shadow(0 0 4px rgba(255,255,255,.85))`); e.style.cssText += ';' + tjBg(TX.sh[i % 6]); return { e, w, h }; });
    const gemW = Math.max(GW * 1.35, Wd * .34), gemH = Math.max(GH * 1.3, Hd * .2), gem = mk(`left:${gx - gemW / 2}px;top:${gy + GH * .62 - gemH}px;width:${gemW}px;height:${gemH}px;opacity:0;transform-origin:50% 100%;filter:drop-shadow(0 0 6px #fff) drop-shadow(0 0 16px ${TL})`); gem.style.cssText += ';' + tjBg(TX.cl).replace('center/contain', 'center bottom/contain');
    // 금(깨지는 선)
    const crk = mk(`left:${gx - gemW / 2}px;top:${gy + GH * .62 - gemH}px;width:${gemW}px;height:${gemH}px;opacity:0`, 'div'); { const L = [[50, 12, 44, 30, 54, 46, 40, 62, 50, 80], [44, 30, 28, 36, 18, 52], [54, 46, 72, 40, 84, 54], [40, 62, 26, 72], [50, 80, 64, 88], [54, 46, 60, 64, 74, 72]];
      crk.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible">${L.map(p => `<polyline points="${p.join(' ')}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 6px ${TL})"/>`).join('')}</svg>`; }
    const leak = mk(`left:${gx - Wd * .5}px;top:${gy - Wd * .5}px;width:${Wd}px;height:${Wd}px;border-radius:50%;background:repeating-conic-gradient(from 10deg,rgba(255,255,255,.75) 0 3deg,transparent 3deg 22deg);-webkit-mask:radial-gradient(circle,#000 12%,transparent 58%);mask:radial-gradient(circle,#000 12%,transparent 58%);opacity:0;mix-blend-mode:screen`);
    // 테라 보석 관 + 테라 마크
    const CRW = Math.max(Wd * .3, Math.min(Wd * .52, GW * .95)), CRH = CRW * .84, crown = mk(`left:${hx - CRW / 2}px;top:${hy - CRH * .86}px;width:${CRW}px;height:${CRH}px;background:url("${crownUrl(T)}") center bottom/contain no-repeat;opacity:0;transform-origin:50% 90%`);
    const ttl = mk(`left:0;right:0;top:${Math.min(Hd * .86, BY + MH * OB.y1 + Hd * .06)}px;display:flex;justify-content:center;align-items:center;gap:${Wd * .02}px;opacity:0`); ttl.innerHTML = `${c.icon ? `<i style="width:${Wd * .1}px;height:${Wd * .1}px;background:url(${c.icon}) center/contain no-repeat;filter:drop-shadow(0 0 6px #fff)"></i>` : ''}<b style="font:900 ${Wd * .07}px/1 'Galmuri11',system-ui,sans-serif;color:#fff;letter-spacing:.06em;-webkit-text-stroke:${Wd * .006}px ${TD};paint-order:stroke;text-shadow:0 0 10px ${TL},0 0 22px ${TL}">${c.tyKo ? c.tyKo + ' ' : ''}테라스탈!</b>`;
    const flash = mk('inset:0;background:#fff;opacity:0');
    const ds = top.parentNode, bgF = document.createElement('div'); bgF.className = 'mgf-bg'; bgF.style.cssText = `position:absolute;inset:-6%;z-index:0;pointer-events:none;background:url(${c.bg.url}) ${-(256 * Hd * 1.12 / 150 - Wd * 1.12) / 2}px 0/${512 * Hd * 1.12 / 150}px ${192 * Hd * 1.12 / 150}px no-repeat;image-rendering:pixelated;filter:blur(3px) brightness(.55) saturate(1.2);opacity:0`; ds.insertBefore(bgF, ds.firstChild);
    const MK = 'linear-gradient(to bottom,transparent,#000 14%,#000 84%,transparent),linear-gradient(to right,transparent,#000 10%,#000 90%,transparent)';
    top.style.webkitMaskImage = top.style.maskImage = MK; top.style.webkitMaskComposite = 'source-in'; top.style.maskComposite = 'intersect';
    bt.appendChild(root);
    const at = (t, f) => timers.push(setTimeout(() => { try { f(); } catch (e) {} }, t));
    const hz = () => { try { window.GA?.haptic?.(2); } catch (e) {} }, vib = n => { const k = [1, 2, 4, 7][n] || 2; for (let i = 0; i < k; i++) timers.push(setTimeout(hz, i * 70)); };
    const shake = (t, d, amp) => at(t, () => { A(root, Array.from({ length: 9 }, (_, i) => ({ transform: i === 8 ? 'scale(1.08)' : `translate(${(Math.random() - .5) * amp * 2}px,${(Math.random() - .5) * amp * 2}px) scale(1.08)` })), { duration: d, easing: 'linear', fill: 'none' }); for (let k = 0; k < d; k += 80) timers.push(setTimeout(hz, k)); });
    // 1) 위 화면을 그 포켓몬 쪽으로 (0~900)
    hide.forEach(e => tAnim.push(A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 })));
    tAnim.push(A(top, [{ transform: T0 === 'none' ? 'none' : T0 }, { transform: `translate(${tx}px,${ty}px) scale(${zt})` }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)' }));
    tAnim.push(A(bgF, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)' }));
    at(0, () => c.se('fog2')); at(600, () => vib(1));
    // 2) 어두워지며 가운데 앞모습 (850~1500)
    A(dim, [{ opacity: 0 }, { opacity: .9 }], { duration: 600, delay: 850 });
    A(box, [{ opacity: 0, transform: 'scale(.8) translateY(10px)' }, { opacity: 1, transform: 'scale(1.04)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 600, delay: 950 });
    at(950, () => { c.se('Battle throw'); if (mon) mon.style.visibility = 'hidden'; });
    // 3) 트레이너 컷인 + 테라스탈오브 (1700~2600)
    A(band, [{ opacity: 1, transform: `skewY(-8deg) translateX(${side * 110}%)` }, { opacity: 1, transform: 'skewY(-8deg) translateX(0)' }], { duration: 420, delay: 1700, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
    A(trn, [{ opacity: 0, transform: `${opp ? '' : 'scaleX(-1) '}translateX(${side * 70}px)` }, { opacity: 1, transform: `${opp ? '' : 'scaleX(-1) '}translateX(0)` }], { duration: 450, delay: 1780 });
    at(1720, () => c.se('Battle recall'));
    A(orb, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.5)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 480, delay: 2250 });
    at(2250, () => { c.se('DX Action'); vib(1); });
    // 4) 오브에 테라스탈 에너지가 모임 (2600~3500): 반짝이가 사방에서 오브로, 무지개 고리가 돌며 커짐
    A(orbH, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.15)' }], { duration: 900, delay: 2550, easing: 'ease-in' });
    A(orbR, [{ opacity: 0, transform: 'rotate(0) scale(.6)' }, { opacity: 1, transform: 'rotate(360deg) scale(1.2)' }], { duration: 900, delay: 2550, easing: 'linear' });
    at(2550, () => { c.se('Charge'); orb.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300, iterations: 3, composite: 'replace' }); });
    const ox = oX + OS / 2, oy = oY + OS / 2;
    spk.forEach((p, i) => { const a = i / spk.length * Math.PI * 2, r = Wd * (.35 + Math.random() * .2), w = Wd * .0225;
      A(p, [{ opacity: 0, transform: `translate(${ox + Math.cos(a) * r - w}px,${oy + Math.sin(a) * r - w}px) rotate(0) scale(1.4)` }, { opacity: 1, offset: .25 }, { opacity: 1, transform: `translate(${ox - w}px,${oy - w}px) rotate(180deg) scale(.2)` }], { duration: 620, delay: 2600 + (i % 11) * 70, easing: 'cubic-bezier(.6,0,1,.6)' }); });
    [2700, 2950, 3200].forEach((t, j) => at(t, () => { c.se('Ice5'); vib(j > 1 ? 2 : 1); }));
    // 5) 머리 위로 던짐 → 포켓몬 위에서 오브가 터짐 (3500~4000)
    const apX = gx, apY = Math.max(Hd * .08, gy - GH * .5 - Hd * .1);
    at(3480, () => { c.se('Battle throw'); [orbH, orbR].forEach(e => { e.getAnimations().forEach(a => a.cancel()); e.style.opacity = 0; }); orb.getAnimations().forEach(a => a.cancel());
      const dx = apX - ox, dy = apY - oy; orb.animate([{ transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 }, { transform: `translate(${dx * .5}px,${dy - Hd * .12}px) rotate(400deg) scale(1.2)`, opacity: 1, offset: .55 }, { transform: `translate(${dx}px,${dy}px) rotate(720deg) scale(1.4)`, opacity: 1 }], { duration: 520, fill: 'forwards', easing: 'cubic-bezier(.3,.1,.5,1)' }); });
    [band, trn].forEach(e => A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: 3550 }));
    at(4000, () => { c.se('Saint7'); c.se('Ice5'); vib(2); orb.animate([{ opacity: 1, filter: 'brightness(1)' }, { opacity: 0, filter: 'brightness(4)' }], { duration: 220, fill: 'forwards' });
      const b = mk(`left:${apX - Wd * .3}px;top:${apY - Wd * .3}px;width:${Wd * .6}px;height:${Wd * .6}px;border-radius:50%;background:radial-gradient(circle,#fff 0 18%,rgba(200,240,255,.7) 32%,transparent 62%);mix-blend-mode:screen`); A(b, [{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(2)' }], { duration: 600 });
      const rain = mk(`left:${gx - GW * .7}px;top:${apY}px;width:${GW * 1.4}px;height:${gy + GH * .6 - apY}px;background:linear-gradient(to bottom,rgba(255,255,255,.9),${rgba(mixC(tO, [255, 255, 255], .5), .5)} 60%,transparent);-webkit-mask:repeating-linear-gradient(to right,#000 0 6%,transparent 6% 14%);mask:repeating-linear-gradient(to right,#000 0 6%,transparent 6% 14%);mix-blend-mode:screen;transform-origin:50% 0`); A(rain, [{ opacity: 0, transform: 'scaleY(.1)' }, { opacity: 1, transform: 'scaleY(1)', offset: .4 }, { opacity: 0, transform: 'scaleY(1)' }], { duration: 900, easing: 'ease-out' }); });
    // 6) 결정 조각이 날아와 포켓몬을 감쌈 (4100~5300) — 포켓몬은 하얗게
    at(4100, () => im.animate([{ filter: NORM }, { filter: WH }], { duration: 500, fill: 'forwards' }));
    A(glow, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: .7, transform: 'scale(1)' }], { duration: 1200, delay: 4100, easing: 'ease-in' });
    shards.forEach((s, i) => { const a = -Math.PI / 2 + (i / NS - .5) * Math.PI * 2 * .95, rr = Math.hypot(Wd, Hd) * .7, fx = gx + Math.cos(a) * GW * .48 * 1.05 - s.w / 2, fy = gy + Math.sin(a) * GH * .5 - s.h / 2, rot = a * 180 / Math.PI + 90;
      s.fx = fx; s.fy = fy; s.rot = rot; s.a = a;
      A(s.e, [{ opacity: 0, transform: `translate(${gx + Math.cos(a) * rr - s.w / 2}px,${gy + Math.sin(a) * rr - s.h / 2}px) rotate(${rot + 240}deg) scale(1.5)` }, { opacity: 1, offset: .3 }, { opacity: 1, transform: `translate(${fx}px,${fy}px) rotate(${rot}deg) scale(1)` }], { duration: 520, delay: 4150 + i * 55, easing: 'cubic-bezier(.3,.6,.4,1.15)' });
      if (i % 3 === 0) at(4150 + i * 55 + 480, () => { c.se('Sword2'); hz(); }); });
    at(5000, () => c.se('Tera Form'));   /* 경완 '테라 될 때 크리스탈 스러운 효과음': 결정이 포켓몬을 감싸는 순간 쨍 */
    at(5050, () => { c.se('Ice5'); vib(2); });
    A(gem, [{ opacity: 0, transform: 'scale(.6,.3)' }, { opacity: 1, transform: 'scale(1.06,1.04)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 450, delay: 5000, easing: 'cubic-bezier(.2,1.2,.4,1)' });
    A(box, [{ opacity: 1 }, { opacity: .55 }], { duration: 400, delay: 5050 });   /* 결정 안에 갇혀 비쳐 보임 */
    A(prism, [{ opacity: 0, transform: 'rotate(0) scale(.7)' }, { opacity: .55, transform: 'rotate(60deg) scale(1)' }], { duration: 1300, delay: 5000, easing: 'linear' });
    at(5200, () => { const g = mk(`left:${gx - gemW / 2}px;top:${gy + GH * .62 - gemH}px;width:${gemW}px;height:${gemH}px;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.95) 48%,transparent 60%) -150% 0/250% 100% no-repeat;-webkit-mask:url("${TX.cl}") center bottom/contain no-repeat;mask:url("${TX.cl}") center bottom/contain no-repeat;mix-blend-mode:screen`);
      g.animate([{ backgroundPosition: '-150% 0' }, { backgroundPosition: '250% 0' }], { duration: 600, fill: 'forwards' }); c.se('Ice5'); });
    // 7) 금이 가며 흔들림, 틈으로 빛이 샘 (5600~6500)
    at(5600, () => { crk.style.opacity = 1; [...crk.querySelectorAll('polyline')].forEach((l, j) => l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 220, delay: [0, 120, 260, 420, 560, 680][j], fill: 'forwards', easing: 'ease-out' })); });
    [5600, 5860, 6120, 6330].forEach((t, j) => at(t, () => { c.se(j % 2 ? 'Sword2' : 'Ice5'); vib(1 + (j > 1)); }));
    A(leak, [{ opacity: 0, transform: 'rotate(0) scale(.5)' }, { opacity: .9, transform: 'rotate(25deg) scale(1.2)' }], { duration: 900, delay: 5650, easing: 'ease-in' });
    A(glow, [{ opacity: .7, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.5)' }], { duration: 900, delay: 5600, easing: 'ease-in' });
    shake(5650, 300, 2); shake(5980, 300, 4); shake(6250, 300, 7);
    // 8) 결정이 깨짐 → 테라스탈한 모습 (6550~)
    A(flash, [{ opacity: 0 }, { opacity: 1 }, { opacity: 1, offset: .45 }, { opacity: 0 }], { duration: 600, delay: 6520, easing: 'linear' });
    at(6560, () => { c.se('Tera Break'); c.se('Explosion3'); c.se('Earth1'); c.se('Ice5'); vib(3); gem.style.opacity = 0; crk.style.opacity = 0; leak.style.opacity = 0; [gem, crk, leak, glow].forEach(e => e.getAnimations().forEach(a => a.cancel())); glow.style.opacity = 0;
      im.getAnimations().forEach(a => a.cancel()); im.style.filter = WH; box.getAnimations().forEach(a => a.cancel()); box.style.opacity = 1;
      shards.forEach((s, i) => { s.e.getAnimations().forEach(a => a.cancel()); const d = Math.hypot(Wd, Hd) * (.6 + Math.random() * .4), a = s.a + (Math.random() - .5) * .5;
        s.e.animate([{ opacity: 1, transform: `translate(${s.fx}px,${s.fy}px) rotate(${s.rot}deg) scale(1)` }, { opacity: 1, offset: .6 }, { opacity: 0, transform: `translate(${s.fx + Math.cos(a) * d}px,${s.fy + Math.sin(a) * d + Hd * .15}px) rotate(${s.rot + (i % 2 ? 1 : -1) * (300 + Math.random() * 300)}deg) scale(.7)` }], { duration: 900 + Math.random() * 300, fill: 'forwards', easing: 'cubic-bezier(.1,.7,.4,1)' }); });
      for (let i = 0; i < 26; i++) { const w = Wd * (.02 + Math.random() * .03), p = mk(`left:0;top:0;width:${w}px;height:${w * 1.4}px;opacity:0`); p.style.cssText += ';' + tjBg(TX.sh[i % 6]); const a = Math.random() * Math.PI * 2, d = Wd * (.3 + Math.random() * .5);
        p.animate([{ opacity: 1, transform: `translate(${gx}px,${gy}px) rotate(0) scale(1)` }, { opacity: 0, transform: `translate(${gx + Math.cos(a) * d}px,${gy + Math.sin(a) * d}px) rotate(${Math.random() * 720}deg) scale(.4)` }], { duration: 700 + Math.random() * 500, fill: 'forwards', easing: 'cubic-bezier(.1,.8,.3,1)' }); } });
    at(6640, () => { im.animate([{ filter: WH }, { filter: NORM }], { duration: 900, fill: 'forwards' }); pat.animate([{ opacity: 0 }, { opacity: .62 }], { duration: 700, fill: 'forwards' }); pat.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: `${MW * 1.2}px ${MW * .4}px` }], { duration: 9000, iterations: Infinity });
      box.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(.95)', offset: .55 }, { transform: 'scale(1)' }], { duration: 650, fill: 'forwards', easing: 'cubic-bezier(.2,1.4,.4,1)' }); });
    A(prism, [{ opacity: .55, transform: 'rotate(60deg) scale(1)' }, { opacity: 1, transform: 'rotate(90deg) scale(1.05)', offset: .1 }, { opacity: .7, transform: 'rotate(220deg) scale(1.1)' }], { duration: 4000, delay: 6560, easing: 'linear' });
    at(6600, () => A(dim, [{ opacity: .9 }, { opacity: 1 }], { duration: 400 }));
    at(6700, () => { for (let i = 0; i < 3; i++) { const r = mk(`left:${gx - Wd * .2}px;top:${gy - Wd * .2}px;width:${Wd * .4}px;height:${Wd * .4}px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:radial-gradient(circle,transparent 58%,#fff 60%,${TL} 66%,transparent 72%)`); A(r, [{ opacity: 1, transform: 'scale(.4) rotate(0)' }, { opacity: 0, transform: `scale(${4 + i * 1.6}) rotate(${30 + i * 15}deg)` }], { duration: 900 + i * 220, delay: i * 140, easing: 'cubic-bezier(.1,.7,.3,1)' }); } });
    shake(6600, 650, 12);
    // 9) 머리 위 테라 보석 관이 빛나며 내려앉음, 빛이 몸을 쓸고 지나감, 울음 (7000~)
    A(crown, [{ opacity: 0, transform: `translateY(${-Hd * .12}px) scale(.3) rotate(-20deg)` }, { opacity: 1, transform: 'translateY(0) scale(1.25) rotate(4deg)', offset: .6 }, { opacity: 1, transform: 'scale(1) rotate(0)' }], { duration: 600, delay: 7000, easing: 'cubic-bezier(.2,1.3,.4,1)' });
    at(7000, () => { c.se('Saint7'); c.se('Ice5'); vib(1); }); at(7150, () => (c.cryBig || c.cry)());
    at(7600, () => { crown.animate([{ filter: 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 10px ' + TL + ') brightness(1)' }, { filter: 'drop-shadow(0 0 6px #fff) drop-shadow(0 0 18px ' + TL + ') brightness(1.5)' }, { filter: 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 10px ' + TL + ') brightness(1)' }], { duration: 900, iterations: 3 }); swp.style.opacity = 1; swp.animate([{ backgroundPosition: '-200% 0' }, { backgroundPosition: '200% 0' }], { duration: 900, iterations: 2, delay: 0, easing: 'ease-in-out' }); });
    at(7300, () => { for (let i = 0; i < 12; i++) { const w = Wd * .04, p = mk(`left:0;top:0;width:${w}px;height:${w}px;background:#fff;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);opacity:0;filter:drop-shadow(0 0 4px ${TL})`); const x = gx + (Math.random() - .5) * GW * 1.1, y = gy + (Math.random() - .5) * GH * 1.1;
      p.animate([{ opacity: 0, transform: `translate(${x}px,${y}px) scale(.2) rotate(0)` }, { opacity: 1, transform: `translate(${x}px,${y}px) scale(1.2) rotate(45deg)`, offset: .5 }, { opacity: 0, transform: `translate(${x}px,${y}px) scale(.2) rotate(90deg)` }], { duration: 700, delay: i * 180, fill: 'forwards' }); } });
    A(ttl, [{ opacity: 0, transform: 'scale(1.8)', letterSpacing: '.5em' }, { opacity: 1, transform: 'scale(1)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 600, delay: 7700, easing: 'cubic-bezier(.2,1.3,.4,1)' });
    at(7700, () => c.se('Saint7'));
    // 10) 원래 화면으로
    const END = 10600;
    return new Promise(res => { let done = false;
      const fin = () => { if (done) return; done = true; try { c.onSwap?.(); } catch (e) {} timers.forEach(t => clearTimeout(t)); if (mon) mon.style.visibility = '';
        top.style.webkitMaskImage = top.style.maskImage = '';
        const back = [A(top, [{ transform: `translate(${tx}px,${ty}px) scale(${zt})` }, { transform: T0 === 'none' ? 'none' : T0 }], { duration: 420, easing: 'cubic-bezier(.5,0,.2,1)' }), ...hide.map(e => A(e, [{ opacity: 1 }, { opacity: 1 }], { duration: 420 })), A(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })];
        tAnim.forEach(a => a.cancel()); back.push(A(bgF, [{ opacity: 1 }, { opacity: 1 }], { duration: 420 })); Promise.all(back.map(a => a.finished.catch(() => {}))).then(() => { back.forEach(a => a.cancel()); root.remove(); bgF.remove(); top.style.webkitMaskImage = top.style.maskImage = top.style.webkitMaskComposite = top.style.maskComposite = ''; res(); }); };
      const lk = document.createElement('div'); lk.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:transparent;touch-action:none'; const eat = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }; ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(t => lk.addEventListener(t, eat, { passive: false })); document.body.appendChild(lk);
      setTimeout(() => { lk.remove(); fin(); }, END - 500); });
  }
  /* 상대(도전자) 테라스탈: 화면은 안 커지고 그 자리에서 — 결정 조각이 모여 감싸고 깨짐 (메가·거다이맥스 도전자 간단 연출과 같은 결) */
  async function teraMini(host, x, y, w, h, T, se) { const TX = await tjPrep(T); const [tO, tB] = tyCol(T), ST = T === 'Stellar', box = document.createElement('div'); box.className = 'tmini'; box.style.cssText = `position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:6`; host.appendChild(box);
    const mk = css => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;pointer-events:none;' + css; box.appendChild(e); return e; };
    const gw = w * 1.3, gh = h * 1.25, gem = mk(`left:${x - gw / 2}px;top:${y + h * .55 - gh}px;width:${gw}px;height:${gh}px;opacity:0;transform-origin:50% 100%;filter:drop-shadow(0 0 3px #fff)`); gem.style.cssText += ';' + tjBg(TX.cl).replace('center/contain', 'center bottom/contain');
    const N = 10, S = Array.from({ length: N }, (_, i) => { const sw = w * (.16 + (i % 3) * .05), sh = sw * 1.5, e = mk(`left:0;top:0;width:${sw}px;height:${sh}px;opacity:0`); e.style.cssText += ';' + tjBg(TX.sh[i % 6]); return { e, sw, sh, a: -Math.PI / 2 + (i / N - .5) * Math.PI * 1.9 }; });
    S.forEach((s, i) => { const fx = x + Math.cos(s.a) * w * .5 - s.sw / 2, fy = y + Math.sin(s.a) * h * .5 - s.sh / 2, r = s.a * 180 / Math.PI + 90; s.fx = fx; s.fy = fy; s.r = r;
      s.e.animate([{ opacity: 0, transform: `translate(${x + Math.cos(s.a) * w * 1.6}px,${y + Math.sin(s.a) * h * 1.6}px) rotate(${r + 200}deg)` }, { opacity: 1, transform: `translate(${fx}px,${fy}px) rotate(${r}deg)` }], { duration: 380, delay: i * 40, fill: 'forwards', easing: 'cubic-bezier(.3,.6,.4,1.15)' }); });
    setTimeout(() => { se('Sword2'); gem.animate([{ opacity: 0, transform: 'scale(.6,.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, fill: 'forwards', easing: 'cubic-bezier(.2,1.2,.4,1)' }); }, 700);
    setTimeout(() => se('Ice5'), 1000);
    return new Promise(res => setTimeout(() => { se('Ice5'); se('Earth1'); gem.getAnimations().forEach(a => a.cancel()); gem.style.opacity = 0;
      S.forEach((s, i) => { s.e.getAnimations().forEach(a => a.cancel()); const d = w * (1.2 + Math.random()); s.e.animate([{ opacity: 1, transform: `translate(${s.fx}px,${s.fy}px) rotate(${s.r}deg)` }, { opacity: 0, transform: `translate(${s.fx + Math.cos(s.a) * d}px,${s.fy + Math.sin(s.a) * d + h * .3}px) rotate(${s.r + (i % 2 ? 300 : -300)}deg) scale(.6)` }], { duration: 650, fill: 'forwards', easing: 'cubic-bezier(.1,.7,.4,1)' }); });
      const f = mk(`left:${x - w}px;top:${y - w}px;width:${w * 2}px;height:${w * 2}px;border-radius:50%;background:radial-gradient(circle,#fff 0 20%,${rgba(mixC(tO, [255, 255, 255], .5), .7)} 36%,transparent 66%)`); f.animate([{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 500, fill: 'forwards' });
      setTimeout(() => box.remove(), 900); res(); }, 1350)); }

  { const st = document.createElement('style'); st.textContent = '@keyframes dxPatL{to{background-position:-800px 0}}@keyframes gxPan{to{background-position:-2400px 0}}@keyframes dxPatT{25%{background-position:200px 6px}50%{background-position:400px -4px}75%{background-position:600px 5px}to{background-position:800px 0}}'; document.head.appendChild(st); }
  window.GymDBK = { mega, megaFull, zmove, zFull, tera, teraFull, teraMini, teraCrown, crownUrl, dynamax, dmaxFull, gxBg, gxRing, tyCol };
})();
