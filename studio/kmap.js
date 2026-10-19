// v3.08 경완: 작업실 지도를 카카오 지도로. 지도 코드는 Leaflet 으로 짜여 있어서, 카카오 지도 위에 Leaflet 과 같은 이름의 함수들
// (L.map · L.polygon · L.marker · L.popup · L.Control …)을 만들어 얹는다. 반경·손잡이·포켓몬 그림은 지도 위 투명한 칸(SVG·div)에 그리고,
// 지도를 끌거나 확대하면 카카오 좌표 변환(getProjection)으로 자리를 다시 잡는다. 확대 단계는 Leaflet 줌 숫자로 바꿔서 알려 준다.
(() => {
  const K = () => window.kakao.maps, NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.append(e); return e; };
  class Point { constructor(x, y) { this.x = x; this.y = y; } distanceTo(p) { p = pt(p); return Math.hypot(p.x - this.x, p.y - this.y); } }
  const pt = p => p instanceof Point ? p : Array.isArray(p) ? new Point(p[0], p[1]) : new Point(p.x, p.y);
  class LatLng { constructor(a, b) { this.lat = +a; this.lng = +b; }
    toBounds(m) { const la = 180 * m / 40075017, lo = la / Math.cos(Math.PI / 180 * this.lat); return new Bounds([this.lat - la, this.lng - lo], [this.lat + la, this.lng + lo]); }
    equals(o) { o = ll(o); return Math.abs(o.lat - this.lat) < 1e-9 && Math.abs(o.lng - this.lng) < 1e-9; } }
  const ll = (a, b) => a instanceof LatLng ? a : Array.isArray(a) ? new LatLng(a[0], a[1]) : a && typeof a === 'object' ? new LatLng(a.lat, a.lng ?? a.lon) : new LatLng(a, b);
  const kll = p => { p = ll(p); return new (K().LatLng)(p.lat, p.lng); };
  class Bounds { constructor(a, b) { this._s = this._w = Infinity; this._n = this._e = -Infinity; if (a) this.extend(a); if (b) this.extend(b); }
    extend(o) { if (o instanceof Bounds) { if (o.isValid()) { this.extend([o._s, o._w]); this.extend([o._n, o._e]); } return this; }
      if (Array.isArray(o) && typeof o[0] !== 'number') { o.forEach(x => this.extend(x)); return this; }
      const p = ll(o); this._s = Math.min(this._s, p.lat); this._n = Math.max(this._n, p.lat); this._w = Math.min(this._w, p.lng); this._e = Math.max(this._e, p.lng); return this; }
    isValid() { return this._s <= this._n; }
    pad(r) { const h = (this._n - this._s) * r, w = (this._e - this._w) * r; return new Bounds([this._s - h, this._w - w], [this._n + h, this._e + w]); }
    contains(o) { if (o instanceof Bounds) return o._s >= this._s && o._n <= this._n && o._w >= this._w && o._e <= this._e; const p = ll(o); return p.lat >= this._s && p.lat <= this._n && p.lng >= this._w && p.lng <= this._e; }
    getSouth() { return this._s; } getNorth() { return this._n; } getWest() { return this._w; } getEast() { return this._e; }
    getCenter() { return new LatLng((this._s + this._n) / 2, (this._w + this._e) / 2); } }

  class Ev {
    on(t, f) { this._ev ||= {}; for (const k of t.split(' ')) (this._ev[k] ||= []).push(f); return this; }
    off(t, f) { for (const k of t.split(' ')) if (this._ev?.[k]) this._ev[k] = f ? this._ev[k].filter(g => g !== f) : []; return this; }
    fire(t, e = {}) { e.type = t; e.target ||= this; for (const f of [...(this._ev?.[t] || [])]) f.call(this, e); return e; }
    listens(t) { return !!this._ev?.[t]?.length; } }

  // 지도: 카카오 지도 + 그 위 투명한 칸(.kmap-ov). 칸 안의 .kmap-fr 를 지도가 움직인 만큼 옮기고, 확대가 바뀌거나 멈추면 모두 다시 잡는다
  class KMap extends Ev {
    constructor(id, o = {}) { super();
      const el = this._el = typeof id === 'string' ? document.getElementById(id) : id; el.classList.add('kmap');
      this._kd = mk('div', 'kmap-k', el); this._ov = mk('div', 'kmap-ov', el); this._fr = mk('div', 'kmap-fr', this._ov);
      this._panes = {}; this._mkPane('overlayPane', 400); this._mkPane('markerPane', 600); this._mkPane('tooltipPane', 650); this._mkPane('popupPane', 700);
      this._cc = mk('div', 'leaflet-control-container', el); this._corners = {};
      for (const v of ['top', 'bottom']) for (const h of ['left', 'right']) this._corners[v + h] = mk('div', `leaflet-${v} leaflet-${h}`, this._cc);
      const c = ll(o.center || [37.5665, 126.978]);
      this._k = new (K().Map)(this._kd, { center: kll(c), level: 5, keyboardShortcuts: true });
      { const pr = this._k.getProjection(), a = pr.containerPointFromCoords(kll(c)), b = pr.containerPointFromCoords(kll([c.lat, c.lng + .01])), cos = Math.cos(c.lat * Math.PI / 180), mpp = .01 * 111320 * cos / Math.max(1e-6, Math.abs(b.x - a.x));
        this._z0 = Math.log2(156543.03 * cos / mpp) + this._k.getLevel(); }   // Leaflet 줌 = _z0 - 카카오 단계 (한 단계에 두 배)
      if (o.minZoom != null) this._k.setMaxLevel(this._lv(o.minZoom));
      if (o.maxZoom != null) this._k.setMinLevel(this._lv(o.maxZoom));
      if (o.zoom != null) this._k.setLevel(this._lv(o.zoom));
      this._layers = new Set(); this._drag = true; this._noClick = 0;
      this.dragging = { enable: () => { if (!this._drag) { this._drag = true; this._k.setDraggable(true); } }, disable: () => { if (this._drag) { this._drag = false; this._k.setDraggable(false); } }, enabled: () => this._drag };
      const E = K().event;
      E.addListener(this._k, 'center_changed', () => this._pan());
      E.addListener(this._k, 'bounds_changed', () => this._pan());
      E.addListener(this._k, 'zoom_start', () => { this._ov.style.visibility = 'hidden'; });
      E.addListener(this._k, 'zoom_changed', () => { this._full(); this._ov.style.visibility = ''; this.fire('zoomend'); });
      E.addListener(this._k, 'idle', () => { this._full(); this._ov.style.visibility = ''; this.fire('moveend'); });
      E.addListener(this._k, 'click', me => { if (Date.now() - this._noClick < 350) return; this.closePopup(); this.fire('click', { latlng: new LatLng(me.latLng.getLat(), me.latLng.getLng()) }); });
      for (const t of ['mousemove', 'mouseup']) el.addEventListener(t, ev => { if (this.listens(t)) this.fire(t, { originalEvent: ev, latlng: this.mouseEventToLatLng(ev) }); }, true);
      // 반경·포켓몬 위에서 끌면 지도를 직접 옮기고, 휠은 그 자리를 가운데로 확대 (이 칸은 카카오 지도 바깥이라 카카오가 못 받는다)
      this._ov.addEventListener('pointerdown', ev => { if (ev.button > 0 || !this._drag) return;
        const x0 = ev.clientX, y0 = ev.clientY; let lx = x0, ly = y0, moved = false;
        const mv = e => { if (e.pointerId !== ev.pointerId) return; if (!this._drag) return up(); if (!moved && Math.hypot(e.clientX - x0, e.clientY - y0) < 4) return; moved = true;
          const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; this._panPx(dx, dy); };
        const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (moved) this._noClick = Date.now(); };
        addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up); });
      this._ov.addEventListener('wheel', ev => { ev.preventDefault(); const now = Date.now(); if (now - (this._wt || 0) < 220 || !ev.deltaY) return; this._wt = now;
        this._k.setLevel(this._k.getLevel() + (ev.deltaY > 0 ? 1 : -1), { anchor: kll(this.mouseEventToLatLng(ev)), animate: { duration: 200 } }); }, { passive: false });
      this._ov.addEventListener('dblclick', ev => { ev.preventDefault(); this._k.setLevel(this._k.getLevel() - 1, { anchor: kll(this.mouseEventToLatLng(ev)), animate: { duration: 200 } }); });
      if (o.zoomControl !== false) { const z = mk('div', 'leaflet-control-zoom leaflet-bar leaflet-control', this._corners.topleft); z.innerHTML = '<a href="#" role="button" title="확대" aria-label="확대">+</a><a href="#" role="button" title="축소" aria-label="축소">−</a>';
        z.addEventListener('click', e => { const a = e.target.closest('a'); e.preventDefault(); e.stopPropagation(); if (a) this._k.setLevel(this._k.getLevel() + (a === z.firstChild ? -1 : 1), { animate: { duration: 200 } }); }); }
      this._full();
    }
    get kakao() { return this._k; }
    _lv(z) { return Math.max(1, Math.min(14, Math.round(this._z0 - z))); }
    _mkPane(n, z) { const d = mk('div', 'leaflet-pane', this._fr); d.style.zIndex = z; this._panes[n] = d; return d; }
    _svg(pane) { const d = this._panes[pane] || this._panes.overlayPane; if (!d._svg) { d._svg = document.createElementNS(NS, 'svg'); d.append(d._svg); this._svgSize(d._svg); } return d._svg; }
    _svgSize(s) { const W = this._el.clientWidth || 800, H = this._el.clientHeight || 600, m = Math.max(W, H);
      s.setAttribute('width', W + 2 * m); s.setAttribute('height', H + 2 * m); s.setAttribute('viewBox', `${-m} ${-m} ${W + 2 * m} ${H + 2 * m}`); s.style.left = s.style.top = -m + 'px'; }
    _pt(p) { const q = this._k.getProjection().containerPointFromCoords(kll(p)); return new Point(q.x, q.y); }
    _lp(p) { const q = this._pt(p); return [q.x - this._off.x, q.y - this._off.y]; }   // .kmap-fr 안 자리
    _pan() { if (!this._ref || this._k.getLevel() !== this._lvl) return this._full(); const q = this._pt(this._ref); this._off = { x: q.x - this._r0.x, y: q.y - this._r0.y }; this._fr.style.transform = `translate(${this._off.x}px,${this._off.y}px)`; }
    _full() { this._lvl = this._k.getLevel(); const c = this._k.getCenter(); this._ref = new LatLng(c.getLat(), c.getLng()); this._r0 = this._pt(this._ref); this._off = { x: 0, y: 0 }; this._fr.style.transform = '';
      for (const d of Object.values(this._panes)) if (d._svg) this._svgSize(d._svg); for (const l of this._layers) l._upd(); }
    _panPx(dx, dy) { this._k.setCenter(kll(this.containerPointToLatLng([this._el.clientWidth / 2 - dx, this._el.clientHeight / 2 - dy]))); }
    _fireClick(ev) { if (Date.now() - this._noClick < 350) return; this.closePopup(); this.fire('click', { originalEvent: ev, latlng: this.mouseEventToLatLng(ev) }); }
    _corner(p) { return this._corners[p] || this._corners.topright; }
    getContainer() { return this._el; } getPane(n) { return this._panes[n]; } createPane(n) { return this._mkPane(n, 450); }
    getZoom() { return this._z0 - this._k.getLevel(); }
    getCenter() { const c = this._k.getCenter(); return new LatLng(c.getLat(), c.getLng()); }
    getBounds() { const b = this._k.getBounds(), s = b.getSouthWest(), n = b.getNorthEast(); return new Bounds([s.getLat(), s.getLng()], [n.getLat(), n.getLng()]); }
    latLngToContainerPoint(p) { return this._pt(p); }
    containerPointToLatLng(p) { p = pt(p); const c = this._k.getProjection().coordsFromContainerPoint(new (K().Point)(p.x, p.y)); return new LatLng(c.getLat(), c.getLng()); }
    mouseEventToLatLng(ev) { const r = this._el.getBoundingClientRect(); return this.containerPointToLatLng([ev.clientX - r.left, ev.clientY - r.top]); }
    setView(p, z) { if (z != null) this._k.setLevel(this._lv(z)); this._k.setCenter(kll(p)); return this; }
    panTo(p) { this._k.panTo(kll(p)); return this; }
    flyTo(p, z) { const lv = z == null ? this._k.getLevel() : this._lv(z); if (lv === this._k.getLevel()) this._k.panTo(kll(p)); else { this._k.setCenter(kll(p)); this._k.setLevel(lv, { animate: { duration: 300 } }); } return this; }
    flyToBounds(b, o = {}) { b = b instanceof Bounds ? b : new Bounds(b); if (!b.isValid()) return this; const pd = o.padding ? pt(o.padding) : new Point(0, 0);
      this._k.setBounds(new (K().LatLngBounds)(kll([b._s, b._w]), kll([b._n, b._e])), pd.y, pd.x, pd.y, pd.x); if (o.maxZoom != null && this.getZoom() > o.maxZoom + .01) this._k.setLevel(this._lv(o.maxZoom)); return this; }
    fitBounds(b, o) { return this.flyToBounds(b, o); }
    invalidateSize() { this._k.relayout(); this._full(); return this; }
    addLayer(l) { if (l._map === this) return this; l._map = this; if (l instanceof Group) l._ls.forEach(x => this.addLayer(x)); else { this._layers.add(l); l._onAdd(this); } return this; }
    removeLayer(l) { if (l._map !== this) return this; if (l instanceof Group) l._ls.forEach(x => this.removeLayer(x)); else { l._onRemove(); this._layers.delete(l); } l._map = null; return this; }
    hasLayer(l) { return l._map === this; }
    closePopup() { if (this._popup) { this.removeLayer(this._popup); this._popup = null; } return this; }
  }

  class Layer extends Ev {
    addTo(t) { t.addLayer(this); return this; }
    remove() { this._grp?._ls.delete(this); this._grp = null; this._map?.removeLayer(this); return this; }
    getElement() { return this._e; }
    _onRemove() { this._e?.remove(); this._e = null; this._tip?.remove(); this._tip = null; }
    _upd() {}
    // 마우스 이벤트를 Leaflet 모양({ latlng, originalEvent, target })으로
    _bind(e) { for (const t of ['click', 'mouseover', 'mouseout', 'mousedown', 'contextmenu']) e.addEventListener(t, ev => { const m = this._map; if (!m) return;
      if (t === 'click' && Date.now() - m._noClick < 350) { ev.stopPropagation(); return; }
      const le = this.fire(t, { originalEvent: ev, latlng: m.mouseEventToLatLng(ev) });
      if (t === 'click' && this.options.bubblingMouseEvents && !le._stopped && !ev._stopped) m._fireClick(ev); }); }
    bindTooltip(txt, o = {}) { this._tt = [txt, o]; if (!this._ttb) { this._ttb = 1;
      this.on('mouseover', () => { const m = this._map; if (!m || this._tip) return; const [h, op] = this._tt; this._tip = mk('div', `leaflet-tooltip leaflet-tooltip-${op.direction || 'top'} ${op.className || ''}`, m._panes.tooltipPane); this._tip.innerHTML = h; this._tipUpd(); });
      this.on('mouseout', () => { this._tip?.remove(); this._tip = null; }); } return this; }
    _tipUpd() { if (!this._tip || !this._map) return; const [x, y] = this._map._lp(this._center()), [ox, oy] = this._tt[1].offset || [0, 0]; this._tip.style.transform = `translate(${x + ox}px,${y + oy}px) translate(-50%,-100%)`; }
  }
  class Group extends Layer { constructor(ls) { super(); this._ls = new Set(); (ls || []).forEach(l => this.addLayer(l)); }
    addLayer(l) { l._grp?._ls.delete(l); l._grp = this; this._ls.add(l); if (this._map) this._map.addLayer(l); return this; }
    removeLayer(l) { l.remove(); return this; }
    clearLayers() { [...this._ls].forEach(l => l.remove()); return this; }
    eachLayer(f) { this._ls.forEach(f); return this; }
    _onAdd() {} }

  const normLL = x => (x || []).map(p => Array.isArray(p) && Array.isArray(p[0]) ? null : ll(p)).filter(Boolean);
  class Path extends Layer {
    constructor(lls, o, closed) { super(); this._closed = closed; this._lls = normLL(lls);
      this.options = { color: '#3388ff', weight: 3, opacity: 1, fill: closed, fillColor: null, fillOpacity: .2, interactive: true, bubblingMouseEvents: true, ...o }; }
    _onAdd(m) { const e = this._e = document.createElementNS(NS, 'path'); m._svg(this.options.pane).append(e); this._style(); this._upd(); this._bind(e); }
    _d() { const P = this._lls.map(p => this._map._lp(p)); return P.length ? 'M' + P.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + (this._closed ? 'Z' : '') : 'M0 0'; }
    _upd() { if (this._e && this._map) this._e.setAttribute('d', this._d()); this._tipUpd(); }
    _center() { return new Bounds(this._lls).getCenter(); }
    setLatLngs(x) { this._lls = normLL(x); this._upd(); return this; }
    getLatLngs() { return this._lls; }
    setStyle(s) { Object.assign(this.options, s); this._style(); return this; }
    _style() { const o = this.options, e = this._e; if (!e) return; const A = (k, v) => v == null ? e.removeAttribute(k) : e.setAttribute(k, v);
      A('class', ['leaflet-path', o.interactive ? 'leaflet-interactive' : '', o.className || ''].filter(Boolean).join(' '));
      A('stroke', o.stroke === false ? 'none' : o.color); A('stroke-width', o.weight); A('stroke-opacity', o.opacity); A('stroke-linecap', 'round'); A('stroke-linejoin', 'round'); A('stroke-dasharray', o.dashArray || null);
      A('fill', o.fill ? o.fillColor || o.color : 'none'); A('fill-opacity', o.fillOpacity); A('fill-rule', 'evenodd'); e.style.pointerEvents = o.interactive ? 'visiblePainted' : 'none'; }
    bringToFront() { this._e?.parentNode?.append(this._e); return this; }
  }
  class CircleMarker extends Path {
    constructor(p, o) { super([p], { radius: 10, fill: true, ...o }, true); }
    _d() { const [x, y] = this._map._lp(this._lls[0]), r = this.options.radius; return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; }
    setLatLng(p) { return this.setLatLngs([p]); } getLatLng() { return this._lls[0]; } }

  class DivIcon { constructor(o) { this.options = { iconSize: [12, 12], className: 'leaflet-div-icon', ...o }; } }
  class Marker extends Layer {
    constructor(p, o) { super(); this._ll = ll(p); this.options = { interactive: true, draggable: false, zIndexOffset: 0, riseOnHover: false, bubblingMouseEvents: false, ...o }; this._rise = 0; }
    _onAdd(m) { const o = this.options, ic = (o.icon || new DivIcon()).options, e = this._e = mk('div', ['leaflet-marker-icon', ic.className, o.interactive ? 'leaflet-interactive' : ''].filter(Boolean).join(' '), m._panes.markerPane);
      const [w, h] = ic.iconSize || [12, 12], a = ic.iconAnchor || [w / 2, h / 2]; e.innerHTML = ic.html || '';
      Object.assign(e.style, { width: w + 'px', height: h + 'px', marginLeft: -a[0] + 'px', marginTop: -a[1] + 'px', pointerEvents: o.interactive ? 'auto' : 'none' });
      this._upd(); if (!o.interactive) return; this._bind(e);
      if (o.riseOnHover) { e.addEventListener('mouseover', () => { this._rise = 250; this._upd(); }); e.addEventListener('mouseout', () => { this._rise = 0; this._upd(); }); }
      if (o.draggable) e.addEventListener('pointerdown', ev => { if (ev.button > 0 || !this.dragging?.enabled?.() === false) return; ev.stopPropagation(); ev.preventDefault();
        const r = m._el.getBoundingClientRect(), p0 = m._pt(this._ll), dx = ev.clientX - r.left - p0.x, dy = ev.clientY - r.top - p0.y; let moved = false;
        const mv = e2 => { if (e2.pointerId !== ev.pointerId) return; if (!moved && Math.hypot(e2.clientX - ev.clientX, e2.clientY - ev.clientY) < 3) return; if (!moved) { moved = true; this.fire('dragstart'); }
          this._ll = m.containerPointToLatLng([e2.clientX - r.left - dx, e2.clientY - r.top - dy]); this._upd(); this.fire('drag', { latlng: this._ll }); };
        const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (moved) { m._noClick = Date.now(); this.fire('dragend'); } };
        addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up); }); }
    _upd() { if (!this._e || !this._map) return; const [x, y] = this._map._lp(this._ll); this._e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; this._e.style.zIndex = Math.round(y) + (this.options.zIndexOffset || 0) + this._rise + 10000; this._tipUpd(); }
    _center() { return this._ll; }
    setLatLng(p) { this._ll = ll(p); this._upd(); return this; } getLatLng() { return this._ll; }
  }
  class Popup extends Layer {
    constructor(o) { super(); this.options = { offset: [0, 7], className: '', ...o }; this._html = ''; }
    setLatLng(p) { this._ll = ll(p); this._upd(); return this; } getLatLng() { return this._ll; }
    setContent(h) { this._html = h; if (this._e) this._e.querySelector('.leaflet-popup-content').innerHTML = h; return this; }
    openOn(m) { m.closePopup(); m._popup = this; m.addLayer(this); return this; }
    _onAdd(m) { const e = this._e = mk('div', 'leaflet-popup ' + this.options.className, m._panes.popupPane);
      e.innerHTML = '<div class="leaflet-popup-content-wrapper"><div class="leaflet-popup-content"></div></div><div class="leaflet-popup-tip-container"><div class="leaflet-popup-tip"></div></div>'; this.setContent(this._html);
      for (const t of ['pointerdown', 'mousedown', 'click', 'dblclick', 'wheel']) e.addEventListener(t, ev => ev.stopPropagation()); this._upd(); }
    _upd() { if (!this._e || !this._map || !this._ll) return; const [x, y] = this._map._lp(this._ll), [ox, oy] = this.options.offset; this._e.style.transform = `translate(${x + ox}px,${y + oy}px) translate(-50%,calc(-100% - 12px))`; }
  }
  class Ctl { addTo(m) { const d = this._c = this.onAdd(m); d.classList.add('leaflet-control'); const c = m._corner(this.options.position || 'topright'); if (/^bottom/.test(this.options.position)) c.prepend(d); else c.append(d); return this; }
    remove() { this._c?.remove(); return this; } getContainer() { return this._c; } }

  const stopP = e => { if (!e) return; e._stopped = true; if (e.originalEvent) e.originalEvent._stopped = true; else e.stopPropagation?.(); };
  const prevD = e => { (e?.originalEvent || e)?.preventDefault?.(); };
  window.KL = {
    kakao: true, Point, LatLng, LatLngBounds: Bounds,
    map: (id, o) => new KMap(id, o),
    latLng: (a, b) => ll(a, b), latLngBounds: (a, b) => new Bounds(a, b), point: (x, y) => new Point(x, y),
    polygon: (p, o) => new Path(p, o, true), polyline: (p, o) => new Path(p, o, false), circleMarker: (p, o) => new CircleMarker(p, o),
    marker: (p, o) => new Marker(p, o), divIcon: o => new DivIcon(o), popup: o => new Popup(o), layerGroup: ls => new Group(ls),
    canvas: () => null, svg: () => null, tileLayer: () => ({ addTo() { return this; }, remove() { return this; } }),
    Control: { extend: proto => class extends Ctl { constructor(o) { super(); Object.assign(this, proto); this.options = { ...(proto.options || {}), ...o }; } } },
    DomUtil: { create: mk },
    DomEvent: {
      disableClickPropagation(el) { for (const t of ['click', 'dblclick', 'mousedown', 'pointerdown', 'touchstart']) el.addEventListener(t, ev => ev.stopPropagation()); return this; },
      disableScrollPropagation(el) { el.addEventListener('wheel', ev => ev.stopPropagation()); return this; },
      stopPropagation(e) { stopP(e); return this; }, preventDefault(e) { prevD(e); return this; }, stop(e) { prevD(e); stopP(e); return this; },
      on(el, t, f) { t.split(' ').forEach(k => el.addEventListener(k, f)); return this; }, off(el, t, f) { t.split(' ').forEach(k => el.removeEventListener(k, f)); return this; } },
  };
  const css = `.kmap{overflow:hidden}.kmap-k{position:absolute;inset:0;z-index:0}.kmap-ov{position:absolute;inset:0;z-index:1;overflow:hidden;pointer-events:none}
.kmap-fr{position:absolute;left:0;top:0;width:0;height:0}.kmap-fr .leaflet-pane{position:absolute;left:0;top:0}.kmap-fr svg{position:absolute;overflow:visible;pointer-events:none}
.kmap .leaflet-interactive{cursor:pointer;touch-action:none}.kmap .leaflet-marker-icon{position:absolute;left:0;top:0;user-select:none;-webkit-user-select:none}
.kmap .leaflet-control-container>div{position:absolute;z-index:1000;pointer-events:none}.kmap .leaflet-top{top:0}.kmap .leaflet-bottom{bottom:0}.kmap .leaflet-left{left:0}.kmap .leaflet-right{right:0}
.kmap .leaflet-control{position:relative;pointer-events:auto;float:left;clear:both}.kmap .leaflet-right .leaflet-control{float:right}.kmap .leaflet-top .leaflet-control{margin-top:10px}.kmap .leaflet-bottom .leaflet-control{margin-bottom:10px}.kmap .leaflet-left .leaflet-control{margin-left:10px}.kmap .leaflet-right .leaflet-control{margin-right:10px}
.kmap .leaflet-popup{position:absolute;left:0;top:0;text-align:center;pointer-events:auto}.kmap .leaflet-popup-content-wrapper{background:#fff;color:#333;box-shadow:0 3px 14px rgba(0,0,0,.4);border-radius:12px;padding:1px;text-align:left}.kmap .leaflet-popup-content{margin:13px 20px;line-height:1.3;font-size:13px}
.kmap .leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-left:-20px;overflow:hidden;pointer-events:none}.kmap .leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;transform:rotate(45deg);background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.4)}
.kmap .leaflet-bar{border-radius:4px;box-shadow:0 1px 5px rgba(0,0,0,.4);overflow:hidden}.kmap .leaflet-control-zoom a{display:block;width:34px;height:34px;line-height:34px;text-align:center;background:#fff;color:#333;font:700 18px/34px system-ui,sans-serif;text-decoration:none;border-bottom:1px solid #ddd}.kmap .leaflet-control-zoom a:last-child{border-bottom:0}.kmap .leaflet-control-zoom a:hover{background:#f2f4f8}
.kmap .leaflet-tooltip{position:absolute;left:0;top:0;padding:6px;background:#fff;border-radius:3px;color:#222;white-space:nowrap;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,.4);font:12px/1.4 system-ui,sans-serif}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
})();
