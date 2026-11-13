/* 5세대 이후 기술 연출 재생 (Gen 9 Move Animation Project — Pokémon Essentials PBAnimationPlayerX 를 그대로 따라 함, 경완 2026-11-12 '응 다 반영해줘')
   좌표는 Essentials 512×384 = 우리 위 화면 256×192 의 2배. 20fps. 데이터는 tools/gym/mkess.py 가 gym/img/ess/a/<기술>.json 으로 뽑음
   칸: [칸 번호, 무늬, x, y, 가로%, 세로%, 각도, 뒤집기, 섞기, 불투명, 초점, 앞뒤, 색r,g,b,a]   타이밍: [0 소리, 프레임, 소리, 볼륨, 피치] [1·3 배경·앞 판 놓기, 프레임, 그림, x, y, 불투명, 색] [2·4 옮기기, 프레임, 길이, x, y, 불투명, 색] */
window.GymEss = (() => {
  const W = 512, H = 384, FU = [128, 224], FT = [384, 96], CELL = 192;
  const imgC = {}, jsC = {}, seC = new Map();
  const img = src => imgC[src] || (imgC[src] = new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => { delete imgC[src]; r(null); }; i.src = src; }));
  const tintC = document.createElement('canvas'), tx = tintC.getContext('2d');
  function center(el, top) { const r = el.getBoundingClientRect(), t = top.getBoundingClientRect(), z = t.width / (top.offsetWidth || t.width || 1); return [((r.left + r.width / 2) - t.left) / z * 2, ((r.top + r.height / 2) - t.top) / z * 2]; }
  const tp = (s, d, px, py) => { const dx = s[2] - s[0], dy = s[3] - s[1], fx = dx ? (px - s[0]) / dx : 0, fy = dy ? (py - s[1]) / dy : 0; return [d[0] + fx * (d[2] - d[0]), d[1] + fy * (d[3] - d[1])]; };
  const rev = (s0, s1, d0, d1) => s0 === s1 ? false : s0 < s1 ? d0 > d1 : d0 < d1;
  const cv = (c, k, dv) => c[k] ?? dv;
  function drawCel(c, sheet, x, y, mir, C) {
    const pat = C[1], zx = cv(C, 4, 100), zy = cv(C, 5, 100), ang = cv(C, 6, 0), bl = cv(C, 8, 0), op = cv(C, 9, 255), ca = cv(C, 15, 0);
    if (!sheet || pat < 0) return;
    const sx = (pat % 5) * CELL, sy = Math.floor(pat / 5) * CELL;
    let src = sheet, ox = sx, oy = sy;
    if (ca > 0) { tintC.width = tintC.height = CELL; tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, CELL, CELL); tx.drawImage(sheet, sx, sy, CELL, CELL, 0, 0, CELL, CELL); tx.globalCompositeOperation = 'source-atop'; tx.fillStyle = `rgba(${C[12] | 0},${C[13] | 0},${C[14] | 0},${ca / 255})`; tx.fillRect(0, 0, CELL, CELL); src = tintC; ox = oy = 0; }
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, op / 255)); c.globalCompositeOperation = bl === 1 ? 'lighter' : bl === 2 ? 'difference' : 'source-over';
    c.translate(x, y); if (ang) c.rotate(-ang * Math.PI / 180); c.scale((mir ? -1 : 1) * zx / 100, zy / 100);
    c.drawImage(src, ox, oy, CELL, CELL, -CELL / 2, -CELL / 2, CELL, CELL); c.restore();
  }
  const plane = () => ({ img: null, ox: 0, oy: 0, op: 0, col: [0, 0, 0, 0], old: null });
  function drawPlane(c, P) {
    if (P.op <= 0) return; c.save(); c.globalAlpha = Math.min(1, P.op / 255);
    if (P.img) { const iw = P.img.width, ih = P.img.height, sx = ((P.ox % iw) + iw) % iw, sy = ((P.oy % ih) + ih) % ih; for (let y = -sy; y < H; y += ih) for (let x = -sx; x < W; x += iw) c.drawImage(P.img, x, y);
      if (P.col[3] > 0) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(${P.col[0] | 0},${P.col[1] | 0},${P.col[2] | 0},${P.col[3] / 255})`; c.fillRect(0, 0, W, H); } }
    else { c.fillStyle = `rgb(${P.col[0] | 0},${P.col[1] | 0},${P.col[2] | 0})`; c.fillRect(0, 0, W, H); }
    c.restore();
  }
  let idx = null;
  const base = () => window.GymEssBase || 'gym/img/ess/';
  const index = () => idx || (idx = fetch(base() + 'idx.json?v=2').then(r => r.json()).catch(() => { idx = null; return {}; }));
  const get = id => jsC[id] || (jsC[id] = fetch(base() + `a/${id}.json?v=1`).then(r => r.json()).catch(() => { delete jsC[id]; return null; }));
  // 소리: 게임 효과음처럼 GA.audio + 효과음 볼륨, 피치는 재생 빠르기
  async function snd(n, vol, pitch, pan) {
    let ctx = null; try { ctx = GA.audio(); } catch (e) {} if (!ctx || !n) return;
    const v = (() => { try { return GA.sfxVol(); } catch (e) { return .1; } })(); if (!v) return;
    let p = seC.get(n); if (!p || p.ctx !== ctx) { p = { ctx, b: fetch(base() + `se/${n}.mp3?v=1`).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).catch(() => { seC.delete(n); return null; }) }; seC.set(n, p); }
    const buf = await p.b; if (!buf) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.playbackRate.value = (pitch || 100) / 100; g.gain.value = 1.5 * v * Math.min(1.5, (vol ?? 100) / 100);
    let node = s; node.connect(g); node = g; if (pan && ctx.createStereoPanner) { const q = ctx.createStereoPanner(); q.pan.value = pan; node.connect(q); node = q; } node.connect(ctx.destination); s.start();
  }
  async function has(id) { const I = await index(); return I[id] || 0; }
  /* o: { top, back, front(캔버스 512×384), user/target: {el(움직일 그림 칸), img, pan}, A(연출), cry(), speed, alive() } */
  async function play(o) {
    const A = o.A, gp = n => n ? img(base() + `g/${n}.png?v=1`) : Promise.resolve(null);
    const sheet = await gp(A.g), pre = {};
    for (const t of A.t) if ((t[0] === 1 || t[0] === 3) && t[2] && !pre[t[2]]) pre[t[2]] = await gp(t[2]);
    const U = o.user, T = o.target, uo = center(U.el, o.top), to = center(T.el, o.top);
    const src = [FU[0], FU[1], FT[0], FT[1]], dst = [uo[0], uo[1], to[0], to[1]];
    const bk = o.back.getContext('2d'), fr = o.front.getContext('2d');
    const bg = plane(), fg = plane(), N = A.f.length, t0 = performance.now(), sp = o.speed || 1;
    const keep = [U.el, T.el].map(e => [e.style.transform, e.style.opacity, e.style.visibility, e.style.transition]);
    [U.el, T.el].forEach(e => { e.style.transition = 'none'; });
    const lerp = (a, b, f) => a + (b - a) * f;
    function timing(f) {
      for (const t of A.t) { if (t[0] !== 2 && t[0] !== 4) continue; const [ty, fr0, du, x, y, op, col] = t; if (!du || du <= 0 || fr0 + du < f || fr0 >= f) continue;
        const k = (f - fr0) / du, P = ty === 2 ? bg : fg; if (!P.old) continue;
        if (x != null) P.ox = P.old.ox - (x - P.old.ox) * k; if (y != null) P.oy = P.old.oy - (y - P.old.oy) * k;
        if (op != null) P.op = lerp(P.old.op, op, k);
        P.col = P.old.col.map((v, i) => col[i] != null ? lerp(v, col[i], k) : v); }
      for (const t of A.t) { if (t[1] !== f) continue;
        if (t[0] === 0) { const who = U; if (t[2]) snd(t[2], t[3], t[4], who.pan); else o.cry?.(); }
        else if (t[0] === 1 || t[0] === 3) { const P = t[0] === 1 ? bg : fg; P.img = t[2] ? pre[t[2]] : null; P.ox = -(t[3] || 0); P.oy = -(t[4] || 0); P.op = t[5] || 0; P.col = (t[6] || [0, 0, 0, 0]).slice(); }
        else { const P = t[0] === 2 ? bg : fg; P.old = { ox: P.ox, oy: P.oy, op: P.op, col: P.col.slice() }; } }
    }
    function frame(f) {
      bk.clearRect(0, 0, W, H); fr.clearRect(0, 0, W, H); drawPlane(bk, bg);
      const F = A.f[f] || [], seen = new Set();
      for (const C of F) {
        const i = C[0], pat = C[1], cx = C[2], cy = C[3], zx = cv(C, 4, 100), zy = cv(C, 5, 100), ang = cv(C, 6, 0), op = cv(C, 9, 255), foc = cv(C, 10, 4), pri = cv(C, 11, 1);
        let x = cx, y = cy, m = !!C[7];
        if (foc === 1) { x = cx + to[0] - FT[0]; y = cy + to[1] - FT[1]; }
        else if (foc === 2) { x = cx + uo[0] - FU[0]; y = cy + uo[1] - FU[1]; }
        else if (foc === 3) { [x, y] = tp(src, dst, cx, cy); if (pat >= 0 && rev(src[0], src[2], dst[0], dst[2])) m = !m; }
        const ctx = pri === 0 || pri === 2 ? bk : fr;
        if (i < 2) {
          const S = i === 0 ? U : T, oc = i === 0 ? uo : to; seen.add(i);
          if (pat >= 0) { S.el.style.visibility = 'hidden'; drawCel(ctx, sheet, x, y, m, C); continue; }
          S.el.style.visibility = ''; S.el.style.opacity = op / 255;
          S.el.style.transform = `translate(${(x - oc[0]) / 2}px,${(y - oc[1]) / 2}px) rotate(${-ang}deg) scale(${(m ? -1 : 1) * zx / 100},${zy / 100})`;
          continue;
        }
        if (pat === -1 || pat === -2) { const S = pat === -1 ? U : T; if (S.img?.complete && S.img.naturalWidth) { const r = S.img.getBoundingClientRect(), t = o.top.getBoundingClientRect(), z = t.width / (o.top.offsetWidth || 1), w = r.width / z * 2, h = r.height / z * 2; ctx.save(); ctx.globalAlpha = op / 255; ctx.translate(x, y); ctx.rotate(-ang * Math.PI / 180); ctx.scale((m ? -1 : 1) * zx / 100, zy / 100); ctx.imageSmoothingEnabled = false; ctx.drawImage(S.img, -w / 2, -h / 2, w, h); ctx.restore(); } continue; }
        drawCel(ctx, sheet, x, y, m, C);
      }
      for (const i of [0, 1]) if (!seen.has(i)) (i ? T : U).el.style.visibility = 'hidden';
      drawPlane(fr, fg);
    }
    let last = -1;
    await new Promise(res => { const tick = () => { if (o.alive && !o.alive()) return res(); const f = Math.floor((performance.now() - t0) / 50 * sp); if (f >= N) return res(); if (f !== last) { for (let k = last + 1; k < f; k++) timing(k); timing(f); last = f; frame(f); } requestAnimationFrame(tick); }; tick(); });
    bk.clearRect(0, 0, W, H); fr.clearRect(0, 0, W, H);
    [U.el, T.el].forEach((e, i) => { [e.style.transform, e.style.opacity, e.style.visibility] = keep[i]; requestAnimationFrame(() => { e.style.transition = keep[i][3]; }); });
  }
  return { has, get, play, snd };
})();
