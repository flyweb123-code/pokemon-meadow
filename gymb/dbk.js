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

  // ---------- 메가진화 전체 화면 연출 (경완 2026-11-12 '배틀 화면이 핸드폰 전체로 늘어나면서 가운데서 진화, 트레이너·메가스톤 반응은 살림') ----------
  // c.bt = 배틀 전체(.bt), c.top = 위 화면(.bt-top), c.monEl = 메가진화하는 포켓몬 칸. 위 화면을 그 포켓몬 쪽으로 화면 가득 당긴 뒤
  // 트레이너 컷인(키스톤) ↔ 메가스톤 빛줄기 → 포켓몬 하얗게·빛 모임·떨림 → 번쩍 → 가운데 메가 모습 크게 + 빛살·충격파 → 원래 화면으로
  async function megaFull(c) {
    const P = c.path; await preload({ ...c, extra: [P + 'particle.png', P + 'Mega/icon.png', P + 'burst.png'] });
    const bt = c.bt, top = c.top, R0 = bt.getBoundingClientRect(), Wd = bt.offsetWidth, Hd = bt.offsetHeight, q = R0.width / Wd || 1, rel = r => ({ left: (r.left - R0.left) / q, top: (r.top - R0.top) / q, width: r.width / q, height: r.height / q }), R = { left: 0, top: 0 }, tR = rel(top.getBoundingClientRect()), mR = rel((c.monEl.querySelector('img') || c.monEl).getBoundingClientRect());   // 바깥에서 줄여 보여도(시연 틀) 배틀 안쪽 좌표로
    const k0 = tR.width / 256, mhU = mR.height / k0, zt = Math.max(k0 * 1.6, Math.min(k0 * 3.2, Hd * .3 / mhU)), mcx = (mR.left + mR.width / 2 - tR.left) / k0, mcy = (mR.top + mR.height * .5 - tR.top) / k0;
    const tx = Wd / 2 - mcx * zt, ty = Hd * .5 - mcy * zt - tR.top;   // 그 포켓몬이 화면 한가운데 오게 위 화면을 키움 (남는 곳은 뒤 배경판)
    const T0 = getComputedStyle(top).transform, tAnim = [], timers = [], A = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'ease-out', ...o });   // 'both' 면 뒤에 시작할 애니메이션 첫 칸이 미리 덮어씀
    const hide = [...bt.querySelectorAll('.bt-hb,.bt-pty,.bt-bot,.bt-mid,.bt-msg')];
    const root = document.createElement('div'); root.className = 'dx-scene mgf'; root.style.cssText = 'position:absolute;inset:0;z-index:80;overflow:hidden;pointer-events:auto;contain:strict';
    const mk = (css, tag = 'div') => { const e = document.createElement(tag); e.style.cssText = 'position:absolute;pointer-events:none;' + css; root.appendChild(e); return e; };
    const mon = c.monEl.querySelector('img'), opp = c.opp, side = opp ? 1 : -1;
    // 층
    const dim = mk('inset:0;background:radial-gradient(circle at 50% 50%,rgba(30,8,60,.35) 0 22%,rgba(4,0,12,.96) 70%);opacity:0');
    const lines = mk(`inset:-10%;background:url(${P}burst.png) center/cover;filter:hue-rotate(70deg) saturate(1.6);mix-blend-mode:screen;opacity:0`);
    const rays = mk(`left:50%;top:52%;width:${Math.hypot(Wd, Hd) * 1.3}px;height:${Math.hypot(Wd, Hd) * 1.3}px;margin:${-Math.hypot(Wd, Hd) * .65}px 0 0 ${-Math.hypot(Wd, Hd) * .65}px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.32) 0 4deg,rgba(255,255,255,0) 4deg 14deg);-webkit-mask:radial-gradient(circle,#000 10%,transparent 62%);mask:radial-gradient(circle,#000 10%,transparent 62%);opacity:0;mix-blend-mode:screen`);
    const rainbow = mk(`left:50%;top:52%;width:${Wd * 1.1}px;height:${Wd * 1.1}px;margin:${-Wd * .55}px 0 0 ${-Wd * .55}px;border-radius:50%;background:conic-gradient(#ff4d6d,#ffb347,#fff275,#6dff8a,#4dd2ff,#7a6dff,#ff6df0,#ff4d6d);filter:blur(${Wd * .06}px);opacity:0;mix-blend-mode:screen`);
    const glow = mk(`left:50%;top:52%;width:${Wd * .9}px;height:${Wd * .9}px;margin:${-Wd * .45}px 0 0 ${-Wd * .45}px;border-radius:50%;background:radial-gradient(circle,#fff 0 18%,rgba(255,240,255,.9) 30%,rgba(190,140,255,.45) 50%,rgba(120,80,255,0) 70%);opacity:0;transform:scale(.2)`);
    // 메가 모습
    const mw = c.to.w / 2, mh = c.to.h / 2, mz = Math.min(Hd * .36 / mh, Wd * .78 / mw), MW = mw * mz, MH = mh * mz;
    const meg = mk(`left:${(Wd - MW) / 2}px;top:${Hd * .52 - MH * .55}px;width:${MW}px;height:${MH}px;opacity:0`);
    const megI = document.createElement('img'); megI.src = c.to.url; megI.alt = ''; megI.style.cssText = `width:100%;height:100%;image-rendering:pixelated;${opp ? '' : 'transform:scaleX(-1);'}filter:brightness(0) invert(1) drop-shadow(0 0 ${Wd * .03}px #fff)`; meg.appendChild(megI);
    const icon = mk(`left:50%;top:${Hd * .52 - MH * .55 - 30 * mz * .5}px;width:${30 * mz * .45}px;height:${54 * mz * .45}px;margin-left:${-15 * mz * .45}px;background:url(${P}Mega/icon.png) center/100% 100%;image-rendering:pixelated;opacity:0;filter:drop-shadow(0 0 6px #fff)`);
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
    const ds = top.parentNode, bgF = document.createElement('div'); bgF.className = 'mgf-bg'; bgF.style.cssText = `position:absolute;inset:-6%;z-index:0;pointer-events:none;background:url(${c.bg.url}) 50% 60%/cover;image-rendering:pixelated;filter:blur(3px) brightness(.55) saturate(1.2);opacity:0`; ds.insertBefore(bgF, ds.firstChild);
    const MK = 'linear-gradient(to bottom,transparent,#000 14%,#000 84%,transparent),linear-gradient(to right,transparent,#000 10%,#000 90%,transparent)';   // 키운 위 화면 가장자리가 뒤 배경판에 스며들게
    top.style.webkitMaskImage = top.style.maskImage = MK; top.style.webkitMaskComposite = 'source-in'; top.style.maskComposite = 'intersect';
    bt.appendChild(root);
    const at = (t, f) => timers.push(setTimeout(() => { try { f(); } catch (e) {} }, t));
    const shake = (t, d, amp) => at(t, () => A(root, Array.from({ length: 9 }, (_, i) => ({ transform: i === 8 ? 'none' : `translate(${(Math.random() - .5) * amp * 2}px,${(Math.random() - .5) * amp * 2}px)` })), { duration: d, easing: 'linear', fill: 'none' }));
    const vib = n => { try { window.GA?.haptic?.(n); } catch (e) {} };
    // 1) 위 화면을 그 포켓몬 쪽으로 화면 가득 (0~650)
    hide.forEach(e => tAnim.push(A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 })));
    tAnim.push(A(top, [{ transform: T0 === 'none' ? 'none' : T0 }, { transform: `translate(${tx}px,${ty}px) scale(${zt})` }], { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)' }));
    tAnim.push(A(bgF, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)' }));
    at(0, () => c.se('fog2')); at(380, () => vib(1));
    // 2) 어두워지고 트레이너 컷인 + 키스톤 (650~1500)
    A(dim, [{ opacity: 0 }, { opacity: .85 }], { duration: 400, delay: 600 });
    A(band, [{ opacity: 1, transform: `skewY(-8deg) translateX(${side * 110}%)` }, { opacity: 1, transform: 'skewY(-8deg) translateX(0)' }], { duration: 300, delay: 700, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
    A(trn, [{ opacity: 0, transform: `${opp ? '' : 'scaleX(-1) '}translateX(${-side * -60}px)` }, { opacity: 1, transform: `${opp ? '' : 'scaleX(-1) '}translateX(0)` }], { duration: 320, delay: 760 });
    if (c.tr.n > 1) at(760, () => { let f = 0; const st = setInterval(() => { f = Math.min(c.tr.n - 1, f + 1); trn.style.backgroundPosition = `${-f * tw * tz}px center`; if (f >= c.tr.n - 1) clearInterval(st); }, 700 / c.tr.n); timers.push(st); });
    at(1050, () => c.se('DX Action'));
    if (ks) A(ks, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.5)', offset: .6 }, { opacity: 1, transform: 'scale(1.1)' }], { duration: 380, delay: 1050, easing: 'ease-out' });
    if (ms) A(ms, [{ opacity: 0, transform: 'translateY(20px) scale(.3)' }, { opacity: 1, transform: 'translateY(0) scale(1.4)', offset: .6 }, { opacity: 1, transform: 'scale(1.1)' }], { duration: 380, delay: 1150 });
    // 3) 빛줄기 이어짐 (1350~2100)
    const kc = ks ? ks.getBoundingClientRect() : null;
    at(1350, () => { c.se('Psych Up'); vib(1); const g = beam.getContext('2d'); const ax = (ks ? parseFloat(ks.style.left) + Wd * .065 : trX + TW / 2) * 2, ay = (ks ? parseFloat(ks.style.top) + Wd * .065 : Hd * .7) * 2, bx = Wd, by = (ms ? parseFloat(ms.style.top) + Wd * .09 : Hd * .4) * 2, t0 = performance.now();
      beam.style.opacity = 1; const draw = now => { const p = Math.min(1, (now - t0) / 450), q = (now - t0) / 1000; g.clearRect(0, 0, beam.width, beam.height); g.globalCompositeOperation = 'lighter';
        [[0, '#ff8af0'], [Math.PI, '#8ad8ff']].forEach(([ph, col]) => { g.beginPath(); for (let i = 0; i <= 60 * p; i++) { const u = i / 60, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, n = Math.sin(u * 9 + q * 14 + ph) * Wd * .05 * Math.sin(u * Math.PI); const nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny); i ? g.lineTo(x + nx / L * n, y + ny / L * n) : g.moveTo(x, y); } g.strokeStyle = col; g.lineWidth = Wd * .02; g.shadowColor = col; g.shadowBlur = 30; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = Wd * .007; g.stroke(); });
        if (now - t0 < 800 && root.isConnected) requestAnimationFrame(draw); else A(beam, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }); };
      requestAnimationFrame(draw); });
    // 4) 포켓몬 하얗게, 빛 모임, 떨림 (1700~3000)
    at(1700, () => { if (mon) { mon.dataset.mgf = mon.style.filter; mon.style.filter = `brightness(0) invert(1) drop-shadow(0 0 ${4 / zt}px #fff) drop-shadow(0 0 ${10 / zt}px #c89bff)`; } });
    [band, trn, ks].forEach(e => e && A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 1800, composite: 'replace' }));
    if (ms) A(ms, [{ opacity: 1, transform: 'scale(1.1)' }, { opacity: 0, transform: 'scale(2.4)' }], { duration: 420, delay: 1750, easing: 'ease-in' });
    A(rainbow, [{ opacity: 0, transform: 'scale(.3) rotate(0)' }, { opacity: .55, transform: 'scale(1) rotate(240deg)' }], { duration: 1200, delay: 1800, easing: 'ease-in' });
    A(glow, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.05)' }], { duration: 1200, delay: 1800, easing: 'ease-in' });
    A(lines, [{ opacity: 0 }, { opacity: .35 }], { duration: 600, delay: 1900 });
    parts.forEach((p, i) => { const a = i / parts.length * Math.PI * 2 + Math.random() * .3, r = Math.hypot(Wd, Hd) * (.55 + Math.random() * .25), cx = Wd / 2 - Wd * .03, cy = Hd * .52 - Wd * .03;
      A(p, [{ opacity: 0, transform: `translate(${cx + Math.cos(a) * r}px,${cy + Math.sin(a) * r}px) scale(1.6)` }, { opacity: 1, offset: .2 }, { opacity: 1, transform: `translate(${cx}px,${cy}px) scale(.3)` }], { duration: 650, delay: 1850 + (i % 13) * 85, easing: 'cubic-bezier(.6,0,1,.6)' }); });
    shake(2100, 300, 2); shake(2450, 300, 4); shake(2750, 350, 7); at(2200, () => vib(1)); at(2600, () => vib(2)); at(2400, () => c.se('Psych Up'));
    // 5) 번쩍 + 메가 모습 (3050~)
    A(glow, [{ opacity: 1, transform: 'scale(1.05)' }, { opacity: 1, transform: 'scale(.35)' }], { duration: 180, delay: 3000, easing: 'ease-in', composite: 'replace' });
    A(flash, [{ opacity: 0 }, { opacity: 1 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 700, delay: 3150, easing: 'linear' });
    at(3180, () => { c.se('fog2'); vib(3); if (mon) { mon.style.filter = mon.dataset.mgf || ''; mon.style.visibility = 'hidden'; } });
    at(3200, () => { A(dim, [{ opacity: .85 }, { opacity: 1 }], { duration: 300 }); A(glow, [{ opacity: .9, transform: 'scale(1.2)' }, { opacity: .3, transform: 'scale(1.6)' }], { duration: 600, composite: 'replace' }); });
    A(meg, [{ opacity: 0, transform: 'scale(1.35)' }, { opacity: 1, transform: 'scale(.94)', offset: .55 }, { opacity: 1, transform: 'scale(1)' }], { duration: 520, delay: 3250, easing: 'cubic-bezier(.2,1.4,.4,1)' });
    at(3300, () => { megI.animate([{ filter: megI.style.filter }, { filter: `brightness(1) invert(0) drop-shadow(0 0 ${Wd * .02}px rgba(255,255,255,.8))` }], { duration: 650, delay: 150, fill: 'both' }); });
    A(rays, [{ opacity: 0, transform: 'rotate(0) scale(.6)' }, { opacity: 1, transform: 'rotate(30deg) scale(1)', offset: .15 }, { opacity: .9, transform: 'rotate(110deg) scale(1.05)' }], { duration: 1800, delay: 3200, easing: 'linear' });
    A(rainbow, [{ opacity: .55, transform: 'scale(1) rotate(240deg)' }, { opacity: .14, transform: 'scale(1.5) rotate(420deg)' }], { duration: 1800, delay: 3200, easing: 'linear', composite: 'replace' });
    A(lines, [{ opacity: .35 }, { opacity: .45 }], { duration: 200, delay: 3200, composite: 'replace' });
    [ring, ring2].forEach((r, i) => A(r, [{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: `scale(${5 + i * 2})` }], { duration: 700 + i * 200, delay: 3250 + i * 120, easing: 'cubic-bezier(.1,.7,.3,1)' }));
    shake(3250, 500, 12); at(3500, () => c.cry());
    A(icon, [{ opacity: 0, transform: 'translateY(16px) scale(.4)' }, { opacity: 1, transform: 'translateY(0) scale(1.25)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, delay: 3700 });
    // 6) 원래 화면으로 (4900~5500)
    const END = 5500;
    return new Promise(res => { let done = false;
      const fin = () => { if (done) return; done = true; try { c.onSwap?.(); } catch (e) {} timers.forEach(t => { clearTimeout(t); clearInterval(t); }); if (mon) { if (mon.dataset.mgf != null) { mon.style.filter = mon.dataset.mgf; delete mon.dataset.mgf; } mon.style.visibility = ''; }
        const back = [A(top, [{ transform: `translate(${tx}px,${ty}px) scale(${zt})` }, { transform: T0 === 'none' ? 'none' : T0 }], { duration: 420, easing: 'cubic-bezier(.5,0,.2,1)' }), ...hide.map(e => A(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 200 })), A(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })];
        tAnim.forEach(a => a.cancel()); back.push(A(bgF, [{ opacity: 1 }, { opacity: 0 }], { duration: 420 })); Promise.all(back.map(a => a.finished.catch(() => {}))).then(() => { back.forEach(a => a.cancel()); root.remove(); bgF.remove(); top.style.webkitMaskImage = top.style.maskImage = top.style.webkitMaskComposite = top.style.maskComposite = ''; res(); }); };
      root.addEventListener('pointerdown', fin, { once: true }); setTimeout(fin, END - 500); });
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
  window.GymDBK = { mega, megaFull, zmove, tera, dynamax, tyCol };
})();
