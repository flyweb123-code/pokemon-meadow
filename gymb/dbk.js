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

  { const st = document.createElement('style'); st.textContent = '@keyframes dxPatL{to{background-position:-800px 0}}@keyframes dxPatT{25%{background-position:200px 6px}50%{background-position:400px -4px}75%{background-position:600px 5px}to{background-position:800px 0}}'; document.head.appendChild(st); }
  window.GymDBK = { mega, zmove, tera, dynamax, tyCol };
})();
