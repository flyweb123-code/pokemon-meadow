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
    /* 불꽃 기운 위에 포켓몬을 한 번 더 그려 기운에 안 묻히게. v24.38 경완 '기술 이름 사라질 때 포켓몬 동작이 프레임 점프': 복제 그림(따로 놀고 장면 scale 1.06 만큼 커짐) 대신
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

  { const st = document.createElement('style'); st.textContent = '@keyframes dxPatL{to{background-position:-800px 0}}@keyframes dxPatT{25%{background-position:200px 6px}50%{background-position:400px -4px}75%{background-position:600px 5px}to{background-position:800px 0}}'; document.head.appendChild(st); }
  window.GymDBK = { mega, megaFull, zmove, zFull, tera, dynamax, tyCol };
})();
