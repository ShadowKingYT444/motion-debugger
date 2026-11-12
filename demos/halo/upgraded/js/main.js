/* Halo 02 — page behaviour and choreography.
   Runs before GSAP (deferred scripts execute in order); the scroll choreography starts on DOMContentLoaded,
   once GSAP has executed. Everything that is content works without it. */
(function () {
  'use strict';
  const H = window.Halo;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const TAU = Math.PI * 2;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const phoneQ = matchMedia('(max-width: 760px)');
  const root = document.documentElement;
  const body = document.body;
  const state = { pal: 'oat', qty: 1 };
  const svgEl = (tag, attrs, parent) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  /* ------------------------------------------------------------
     Speakers (procedural canvas renders, drawn only when they change)
     ------------------------------------------------------------ */
  function grab(el, spk) {
    let lastX = 0, lastT = 0, id = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      id = e.pointerId;
      try { el.setPointerCapture(id); } catch (_) {}
      spk.dragging = true; spk.vel = 0; lastX = e.clientX; lastT = performance.now();
    });
    el.addEventListener('pointermove', (e) => {
      if (!spk.dragging || e.pointerId !== id) return;
      const now = performance.now(), dx = e.clientX - lastX, dts = Math.max(8, now - lastT) / 1000, dth = dx / spk.R;
      spk.user += dth; spk.vel = spk.vel * 0.55 + (dth / dts) * 0.45; lastX = e.clientX; lastT = now;
    });
    const end = (e) => { if (e.pointerId !== id) return; spk.dragging = false; id = null; spk.vel = clamp(spk.vel, -9, 9); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  const base = { tilt: 0.2, autoSpeed: 0, glow: 1, ripples: false, ambient: false, drag: false, wFrac: 0.3 };
  const heroEl = $('.hero');
  const hero = new H.Speaker($('#heroCanvas'), Object.assign({}, base, { scale: 0.66, cy: 0.43 }));
  hero.base = 0.5;
  const heroGrab = document.createElement('div');
  heroGrab.className = 'hero__grab';
  heroGrab.setAttribute('aria-hidden', 'true');
  heroEl.appendChild(heroGrab);
  grab(heroGrab, hero);

  function configureHero() {
    if (phoneQ.matches) { hero.o.scale = 0.7; hero.o.cy = 0.5; hero.o.wFrac = 0.3; }
    else { hero.o.scale = 0.66; hero.o.cy = 0.43; hero.o.wFrac = 0.3; }
    hero.resize();
    const u = hero.R * Math.cos(hero.tiltT), ry = hero.R * Math.sin(hero.tiltT);
    const canvas = hero.canvas, off = canvas.getBoundingClientRect().top - heroEl.getBoundingClientRect().top;
    heroGrab.style.width = (hero.R * 2) + 'px';
    heroGrab.style.top = (off + hero.cy - 1.5 * u - ry) + 'px';
    heroGrab.style.height = (3 * u + 2 * ry) + 'px';
  }
  configureHero();

  const speakers = { hero };
  function lazy(el, make) {
    if (!('IntersectionObserver' in window)) { make(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); make(); } }, { rootMargin: '700px 0px' });
    io.observe(el);
  }
  // Heavy canvases are built once, either while the browser is idle after the hero settles or when the visitor
  // nears them, whichever comes first, and drawn once straight away so scrolling never pays for them.
  const prime = (s) => { s.render(performance.now() / 1000, 0.016); s.dirty = false; };
  function initMat() {
    if (speakers.mat) return;
    speakers.mat = new H.Speaker($('#matCanvas'), Object.assign({}, base, { scale: 0.7, cy: 0.53, palette: state.pal }));
    speakers.mat.base = 0.9;
    prime(speakers.mat);
    const g = document.createElement('div');
    g.className = 'mat__grab'; g.setAttribute('aria-hidden', 'true');
    $('.mat__stage').appendChild(g);
    grab(g, speakers.mat);
  }
  function initPre() {
    if (speakers.preA) return;
    speakers.preA = new H.Speaker($('#preCanvasA'), Object.assign({}, base, { scale: 0.7, cy: 0.5, wFrac: 0.2, palette: state.pal }));
    speakers.preB = new H.Speaker($('#preCanvasB'), Object.assign({}, base, { scale: 0.7, cy: 0.5, wFrac: 0.2, palette: state.pal }));
    speakers.preA.base = 0.3; speakers.preB.base = 2.4;
    prime(speakers.preA); prime(speakers.preB);
  }
  lazy($('#matCanvas'), initMat);
  lazy($('#preCanvasA'), initPre);
  const each = (fn) => Object.keys(speakers).forEach((k) => fn(speakers[k]));

  /* ------------------------------------------------------------
     Room simulation
     ------------------------------------------------------------ */
  let sim = null, simVisible = false, tuneTouched = false;
  const seg = $('.seg');
  function setTune(v, user) {
    if (user) tuneTouched = true;
    if (sim) sim.setTune(v);
    seg.style.setProperty('--i', v);
    $$('button', seg).forEach((b) => {
      const on = +b.dataset.tune === v;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  function initSim() {
    if (sim) return;
    sim = new H.RoomSim($('#roomCanvas'), $('#simHandle'), $('#sim'));
    sim.tune = 0; sim.tuneT = 0;
    sim.frame(performance.now() / 1000, 0.016);
    new IntersectionObserver((es) => { simVisible = es[es.length - 1].isIntersecting; }, { rootMargin: '80px' }).observe($('#roomCanvas'));
  }
  lazy($('#roomCanvas'), initSim);
  $$('button', seg).forEach((b) => b.addEventListener('click', () => setTune(+b.dataset.tune, true)));
  const simIO = new IntersectionObserver((es) => {
    if (es[0].isIntersecting) { simIO.disconnect(); setTimeout(() => { if (!tuneTouched) setTune(1); }, reduce ? 300 : 2200); }
  }, { threshold: 0.5 });
  simIO.observe($('#sim'));

  /* ------------------------------------------------------------
     Main loop: cheap when nothing changes
     ------------------------------------------------------------ */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (H.audio) H.audio.update(dt);
    const live = !!(H.audio && H.audio.on) || H.level > 0.002;
    each((s) => { s.live = live; });
    H.Speaker.frame(t, dt);
    if (sim && simVisible) sim.frame(t, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(configureHero, 120); });

  /* ------------------------------------------------------------
     Colourway: speakers, the knit macro and the chapter ground
     ------------------------------------------------------------ */
  const WOOL = { oat: ['#dacdb6', '#13212c'], graphite: ['#3e3e41', '#eef0ea'], fjord: ['#a6b8c1', '#13212c'] };
  const knit = $('#knitCanvas');
  function drawKnit() {
    if (!knit) return;
    const w = knit.clientWidth, h = knit.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    knit.width = Math.round(w * dpr); knit.height = Math.round(h * dpr);
    const c = knit.getContext('2d');
    const f = H.palettes[state.pal].fabric;
    const col = (k, a) => 'rgba(' + Math.min(255, f[0] * k | 0) + ',' + Math.min(255, f[1] * k | 0) + ',' + Math.min(255, f[2] * k | 0) + ',' + (a === undefined ? 1 : a) + ')';
    c.fillStyle = col(0.42);
    c.fillRect(0, 0, knit.width, knit.height);
    // stockinette: columns of Vs, each leg a plump loop of yarn lit from the upper left
    const sw = 18 * dpr, sh = sw * 0.92;
    const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    const leg = (cx, cy, rot, k) => {
      c.save(); c.translate(cx, cy); c.rotate(rot);
      const rx = sw * 0.25, ry = sh * 0.62;
      c.fillStyle = 'rgba(0,0,0,0.30)';
      c.beginPath(); c.ellipse(sw * 0.04, sh * 0.08, rx * 1.04, ry * 1.02, 0, 0, TAU); c.fill();
      const gr = c.createRadialGradient(-rx * 0.35, -ry * 0.35, rx * 0.1, 0, 0, ry * 1.05);
      gr.addColorStop(0, col(Math.min(1.3, k * 1.22))); gr.addColorStop(0.55, col(k)); gr.addColorStop(1, col(k * 0.62));
      c.fillStyle = gr;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
      // a few fibres catching the light
      c.strokeStyle = col(Math.min(1.4, k * 1.3), 0.35); c.lineWidth = Math.max(0.6, dpr * 0.6);
      c.beginPath(); c.moveTo(-rx * 0.5, -ry * 0.6); c.quadraticCurveTo(-rx * 0.2, 0, -rx * 0.45, ry * 0.6); c.stroke();
      c.restore();
    };
    for (let r = -1; r * sh < knit.height + sh; r++) {
      for (let j = -1; j * sw < knit.width + sw; j++) {
        const x = j * sw, y = r * sh, n = hash(j, r);
        const k = 0.92 + n * 0.14 + 0.05 * Math.sin(j * 0.27 + r * 0.09);
        leg(x + sw * 0.29, y + sh * 0.5, -0.42, k * 1.03);
        leg(x + sw * 0.71, y + sh * 0.5, 0.42, k * 0.95);
      }
    }
    // light from the upper left, falling away across the knit
    const g = c.createLinearGradient(0, 0, knit.width, knit.height);
    g.addColorStop(0, 'rgba(255,248,236,0.18)'); g.addColorStop(0.45, 'rgba(255,248,236,0)'); g.addColorStop(1, 'rgba(10,16,24,0.36)');
    c.fillStyle = g; c.fillRect(0, 0, knit.width, knit.height);
    knitDrawn = true;
  }
  let knitDrawn = false;
  lazy(knit, () => { if (!knitDrawn) drawKnit(); });

  const idle = window.requestIdleCallback ? (fn) => requestIdleCallback(fn, { timeout: 1200 }) : (fn) => setTimeout(fn, 120);
  const warm = [initSim, () => { if (!knitDrawn) drawKnit(); }, initMat, initPre];
  const warmNext = () => { const fn = warm.shift(); if (!fn) return; fn(); idle(warmNext); };
  addEventListener('load', () => setTimeout(() => idle(warmNext), 1800));

  const matName = $('#matName'), matDesc = $('#matDesc');
  let onPalette = null;
  function setPalette(key) {
    state.pal = key;
    const p = H.palettes[key];
    each((s) => { s.setPalette(key); });
    matName.textContent = p.name;
    matDesc.textContent = p.desc;
    root.style.setProperty('--wool-g', WOOL[key][0]);
    root.style.setProperty('--wool-i', WOOL[key][1]);
    ['#matSwatches .swatch', '#preSwatches .chip'].forEach((sel) => $$(sel).forEach((b) => {
      const on = b.dataset.pal === key;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    }));
    if (knitDrawn) drawKnit();
    if (onPalette) onPalette(key);
  }
  $$('#matSwatches .swatch, #preSwatches .chip').forEach((b) => b.addEventListener('click', () => setPalette(b.dataset.pal)));

  /* ------------------------------------------------------------
     Directivity: a listener walks once round both speakers
     ------------------------------------------------------------ */
  const AIM = -Math.PI / 2;
  function polar(svg, kind) {
    const R = 100;
    const D = kind === 'conv'
      ? (a) => 0.07 + 0.93 * Math.pow(0.5 + 0.5 * Math.cos(a - AIM), 1.8)
      : (a) => 0.9 + 0.1 * Math.cos(6 * (a - AIM));
    for (let i = 1; i <= 3; i++) svgEl('circle', { class: 'pg', cx: 0, cy: 0, r: R * i / 3 }, svg);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      svgEl('line', { class: 'pg pg-spoke', x1: Math.cos(a) * 14, y1: Math.sin(a) * 14, x2: Math.cos(a) * R, y2: Math.sin(a) * R }, svg);
    }
    let d = '';
    for (let i = 0; i <= 144; i++) {
      const a = i / 144 * TAU, r = R * (0.12 + 0.88 * D(a));
      d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(2) + ' ' + (Math.sin(a) * r).toFixed(2);
    }
    svgEl('path', { class: 'pballoon', d: d + 'Z' }, svg);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU + 0.13, v = D(a);
      svgEl('circle', { class: 'pseat', cx: Math.cos(a) * R * 1.1, cy: Math.sin(a) * R * 1.1, r: (1.2 + 2.6 * v).toFixed(2), opacity: (0.18 + 0.82 * v).toFixed(2) }, svg);
    }
    if (kind === 'conv') {
      svgEl('rect', { class: 'pspk', x: -9, y: -12, width: 18, height: 24, rx: 2.5 }, svg);
      svgEl('circle', { class: 'pspk-hole', cx: 0, cy: -3, r: 4.5 }, svg);
    } else {
      svgEl('circle', { class: 'pspk', cx: 0, cy: 0, r: 12 }, svg);
      svgEl('circle', { cx: 0, cy: 0, r: 9, fill: 'none', stroke: '#ffb36b', 'stroke-width': 2.4 }, svg);
    }
    const trace = svgEl('path', { class: 'ptrace', d: '' }, svg);
    const ring = svgEl('circle', { class: 'plisten-ring', r: 9 }, svg);
    const dot = svgEl('circle', { class: 'plisten', r: 4.6 }, svg);
    const RL = R * 0.8;
    return {
      D,
      update(p) {
        const end = AIM + p * TAU;
        let path = '';
        const n = Math.max(1, Math.round(p * 120));
        for (let i = 0; i <= n; i++) {
          const a = AIM + (i / n) * p * TAU;
          path += (i ? 'L' : 'M') + (Math.cos(a) * RL).toFixed(2) + ' ' + (Math.sin(a) * RL).toFixed(2);
        }
        trace.setAttribute('d', p > 0.002 ? path : '');
        const x = Math.cos(end) * RL, y = Math.sin(end) * RL;
        dot.setAttribute('cx', x.toFixed(2)); dot.setAttribute('cy', y.toFixed(2));
        ring.setAttribute('cx', x.toFixed(2)); ring.setAttribute('cy', y.toFixed(2));
        return D(end);
      }
    };
  }
  const plotA = polar($('#polarA'), 'conv'), plotB = polar($('#polarB'), 'halo');
  const readA = $('#readA'), readB = $('#readB');
  const fmtDb = (v) => { const db = Math.round(20 * Math.log10(v)); return db === 0 ? '0 dB' : '−' + Math.abs(db) + ' dB'; };
  function walk(p) {
    const a = plotA.update(p), b = plotB.update(p);
    const ta = fmtDb(a), tb = fmtDb(b);
    if (readA.textContent !== ta) readA.textContent = ta;
    if (readB.textContent !== tb) readB.textContent = tb;
  }
  walk(0.5);

  /* ------------------------------------------------------------
     Anatomy: the exploded axis
     ------------------------------------------------------------ */
  const anatSvg = $('#anatSvg');
  const CX = 300, RX = 128, RY = 33;
  const parts = [];
  const GAPS = [65, 76, 41, 28, 56];
  const WINDOWS = [[0.08, 0.28], [0.27, 0.44], [0.42, 0.58], [0.56, 0.72], [0.70, 0.86]];
  const SLEEVE = [0.02, 0.12];
  // a label appears only once its gap leaves room for it (a label block is ~72 units tall)
  const LABEL_AT = [0, 0.87, 0.45, 0.3, 0.3, 0.78];
  (function buildAnatomy() {
    const defs = '<defs>' +
      '<linearGradient id="gAlu" x1="0" x2="1"><stop offset="0" stop-color="#6f6c66"/><stop offset=".22" stop-color="#d9d4ca"/><stop offset=".36" stop-color="#f7f4ee"/><stop offset=".6" stop-color="#a6a199"/><stop offset=".86" stop-color="#5c5955"/><stop offset="1" stop-color="#807b74"/></linearGradient>' +
      '<radialGradient id="gAluTop" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#faf8f3"/><stop offset=".6" stop-color="#cdc8bf"/><stop offset="1" stop-color="#8f8a82"/></radialGradient>' +
      '<linearGradient id="gDark" x1="0" x2="1"><stop offset="0" stop-color="#0f1922"/><stop offset=".3" stop-color="#334657"/><stop offset=".45" stop-color="#253545"/><stop offset="1" stop-color="#0c141b"/></linearGradient>' +
      '<radialGradient id="gDarkTop" cx=".4" cy=".4" r=".8"><stop offset="0" stop-color="#3a4d5e"/><stop offset="1" stop-color="#16222d"/></radialGradient>' +
      '<linearGradient id="gLamp" x1="0" x2="1"><stop offset="0" stop-color="#c9641c"/><stop offset=".4" stop-color="#ffe2b8"/><stop offset=".6" stop-color="#ffc07a"/><stop offset="1" stop-color="#c25c14"/></linearGradient>' +
      '<radialGradient id="gCone" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#58697a"/><stop offset=".7" stop-color="#18242f"/><stop offset="1" stop-color="#0a1117"/></radialGradient>' +
      '<radialGradient id="gCap" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#eef0ea"/><stop offset="1" stop-color="#7a848b"/></radialGradient>' +
      '<radialGradient id="gWarm"><stop offset="0" stop-color="rgba(255,179,107,.55)"/><stop offset="1" stop-color="rgba(255,179,107,0)"/></radialGradient>' +
      '<pattern id="pKnit" width="8" height="10" patternUnits="userSpaceOnUse"><rect width="8" height="10" fill="#b9ab93"/><path d="M1 0 L4 9.4 L7 0" fill="none" stroke="#e2d5bf" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.5 .8 L3.9 8" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".9" stroke-linecap="round"/></pattern>' +
      '<linearGradient id="gShade" x1="0" x2="1"><stop offset="0" stop-color="rgba(10,16,24,.5)"/><stop offset=".22" stop-color="rgba(255,250,240,.16)"/><stop offset=".42" stop-color="rgba(10,16,24,0)"/><stop offset=".8" stop-color="rgba(10,16,24,.38)"/><stop offset="1" stop-color="rgba(10,16,24,.7)"/></linearGradient>' +
      '<linearGradient id="gSleeveTop" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgba(255,170,90,.55)"/><stop offset=".25" stop-color="rgba(255,170,90,0)"/></linearGradient>' +
      '</defs>';
    function disc(y, t, side, top, rx, ry) {
      rx = rx || RX; ry = ry || RY;
      const L = CX - rx, R = CX + rx;
      return '<path d="M' + L + ' ' + y + ' L' + L + ' ' + (y + t) + ' A' + rx + ' ' + ry + ' 0 0 0 ' + R + ' ' + (y + t) + ' L' + R + ' ' + y + ' A' + rx + ' ' + ry + ' 0 0 1 ' + L + ' ' + y + ' Z" fill="' + side + '" stroke="rgba(238,240,234,.16)"/>' +
        '<ellipse cx="' + CX + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + top + '" stroke="rgba(238,240,234,.22)"/>';
    }
    function driver(a, ymid, size) {
      const x = CX + RX * Math.sin(a), c = Math.cos(a), yy = ymid + RY * c, rx = size * c, ry = size;
      return '<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="' + (rx + 2.5 * c).toFixed(1) + '" ry="' + (ry + 2.5) + '" fill="#0a1117" stroke="rgba(238,240,234,.28)"/>' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry + '" fill="url(#gCone)"/>' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="' + (rx * 0.3).toFixed(1) + '" ry="' + (ry * 0.3).toFixed(1) + '" fill="url(#gCap)" opacity=".85"/>';
    }
    const P = [
      { y: 170, t: 22, n: 'The crown', s: ['Turned from one aluminium billet.', 'Touch dial and six microphones.'], build() {
        let s = disc(170, 22, 'url(#gAlu)', 'url(#gAluTop)');
        for (let i = 1; i < 6; i++) s += '<ellipse cx="' + CX + '" cy="170" rx="' + (RX * (0.2 + i * 0.15)) + '" ry="' + (RY * (0.2 + i * 0.15)) + '" fill="none" stroke="rgba(0,0,0,.07)"/>';
        s += '<ellipse cx="' + CX + '" cy="170" rx="' + (RX * 0.5) + '" ry="' + (RY * 0.5) + '" fill="#bdb8ae" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>';
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; s += '<line x1="' + (CX + Math.cos(a) * RX * 0.34) + '" y1="' + (170 + Math.sin(a) * RY * 0.34) + '" x2="' + (CX + Math.cos(a) * RX * 0.44) + '" y2="' + (170 + Math.sin(a) * RY * 0.44) + '" stroke="rgba(0,0,0,.3)"/>'; }
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; s += '<ellipse cx="' + (CX + Math.cos(a) * RX * 0.76) + '" cy="' + (170 + Math.sin(a) * RY * 0.76) + '" rx="3.2" ry="1.6" fill="#16222d"/>'; }
        return s;
      } },
      { y: 192, t: 9, n: 'The halo', s: ['96 LEDs behind an opal light guide.', 'Warm only: 2700 K, nothing else.'], build() {
        let s = '<ellipse class="a-warm" cx="' + CX + '" cy="196" rx="' + (RX * 1.9) + '" ry="' + (RY * 3.2) + '" fill="url(#gWarm)"/>';
        // glow from stacked translucent strokes, not a blur filter: the part moves every scroll frame
        [[14, 0.06], [8, 0.12], [4, 0.28]].forEach((g) => { s += '<ellipse cx="' + CX + '" cy="196" rx="' + (RX * 0.99) + '" ry="' + (RY * 0.99 + 3) + '" fill="none" stroke="#ffb36b" stroke-width="' + g[0] + '" opacity="' + g[1] + '"/>'; });
        s += disc(192, 9, 'url(#gLamp)', 'rgba(255,200,130,.16)', RX * 0.99, RY * 0.99);
        s += '<ellipse cx="' + CX + '" cy="192" rx="' + (RX * 0.99) + '" ry="' + (RY * 0.99) + '" fill="none" stroke="#ffb36b" stroke-width="3"/>';
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; s += '<circle cx="' + (CX + Math.cos(a) * RX * 0.8) + '" cy="' + (192 + Math.sin(a) * RY * 0.8) + '" r="1.8" fill="#ffe7c2"/>'; }
        return s;
      } },
      { y: 201, t: 74, n: 'The ring', s: ['Six 50 mm full-range drivers,', '60° apart, each with its own 40 W amp.'], build() {
        let s = disc(201, 74, 'url(#gDark)', 'url(#gDarkTop)');
        s += driver(-Math.PI / 3, 238, 21) + driver(Math.PI / 3, 238, 21) + driver(0, 238, 24);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; s += '<circle cx="' + (CX + Math.cos(a) * RX * 0.62) + '" cy="' + (201 + Math.sin(a) * RY * 0.62) + '" r="5" fill="none" stroke="rgba(238,240,234,.3)"/><circle cx="' + (CX + Math.cos(a) * RX * 0.62) + '" cy="' + (201 + Math.sin(a) * RY * 0.62) + '" r="2" fill="#ffb36b"/>'; }
        return s;
      } },
      { y: 275, t: 92, n: 'The chamber', s: ['A sealed 3.1-litre cavity. Two opposed', '130 mm radiators cancel each other.'], build() {
        let s = disc(275, 92, 'url(#gDark)', 'url(#gDarkTop)');
        const a = -0.62, x = CX + RX * Math.sin(a), c = Math.cos(a), yy = 321 + RY * c;
        s += '<ellipse cx="' + x + '" cy="' + yy + '" rx="' + (36 * c) + '" ry="38" fill="#0c141b" stroke="rgba(238,240,234,.3)" stroke-width="1.2"/><ellipse cx="' + x + '" cy="' + yy + '" rx="' + (27 * c) + '" ry="29" fill="url(#gCone)"/>';
        for (let i = 1; i < 4; i++) s += '<ellipse cx="' + x + '" cy="' + yy + '" rx="' + (27 * c * i / 4) + '" ry="' + (29 * i / 4) + '" fill="none" stroke="rgba(238,240,234,.1)"/>';
        return s;
      } },
      { y: 367, t: 44, n: 'The woofer', s: ['165 mm long-throw, fires into the', 'floor. 180 W, down to 32 Hz.'], build() {
        let s = disc(367, 44, 'url(#gDark)', 'url(#gDarkTop)');
        s += '<ellipse cx="' + CX + '" cy="367" rx="' + (RX * 0.86) + '" ry="' + (RY * 0.86) + '" fill="#0a1117" stroke="rgba(238,240,234,.3)"/><ellipse cx="' + CX + '" cy="369" rx="' + (RX * 0.7) + '" ry="' + (RY * 0.7) + '" fill="url(#gCone)"/>';
        for (let i = 1; i < 4; i++) s += '<ellipse cx="' + CX + '" cy="369" rx="' + (RX * 0.7 * i / 4) + '" ry="' + (RY * 0.7 * i / 4) + '" fill="none" stroke="rgba(238,240,234,.09)"/>';
        s += '<ellipse cx="' + CX + '" cy="371" rx="' + (RX * 0.2) + '" ry="' + (RY * 0.2) + '" fill="url(#gCap)"/>';
        s += '<g class="a-down">';
        for (let i = 0; i < 3; i++) s += '<path d="M' + (CX - 60 - i * 12) + ' ' + (426 + i * 9) + ' q' + (60 + i * 12) + ' ' + (16 + i * 4) + ' ' + (120 + i * 24) + ' 0" fill="none" stroke="#ffb36b" stroke-width="1.5" stroke-dasharray="3 5" opacity="' + (0.85 - i * 0.22) + '"/>';
        return s + '</g>';
      } },
      { y: 411, t: 18, n: 'The base', s: ['A decoupled plinth. The shelf stays', 'quiet. The room does not.'], build() {
        let s = disc(411, 18, 'url(#gAlu)', 'url(#gAluTop)', RX * 0.94, RY * 0.94);
        s += '<ellipse cx="' + CX + '" cy="411" rx="' + (RX * 0.78) + '" ry="' + (RY * 0.78) + '" fill="#1a2733" stroke="rgba(238,240,234,.15)"/>';
        return s;
      } }
    ];
    const label = (mid, num, title, lines) => {
      const x0 = CX + RX * 0.96, x1 = CX + RX + 46, tx = x1 + 16;
      return '<g class="lbl"><line x1="' + x0 + '" y1="' + mid + '" x2="' + x1 + '" y2="' + mid + '"/><circle cx="' + x1 + '" cy="' + mid + '" r="3"/>' +
        '<text class="n" x="' + tx + '" y="' + (mid - 22) + '">' + num + '</text>' +
        '<text class="t" x="' + tx + '" y="' + (mid - 2) + '">' + title + '</text>' +
        '<text class="s" x="' + tx + '" y="' + (mid + 18) + '">' + lines[0] + '</text>' +
        '<text class="s" x="' + tx + '" y="' + (mid + 35) + '">' + lines[1] + '</text></g>';
    };
    const groups = P.map((p, i) => '<g class="a-part" data-i="' + i + '">' + p.build() + label(p.y + p.t / 2 + RY * 0.55, '0' + (i + 1), p.n, p.s) + '</g>');
    // the knitted sleeve: what you see before the speaker comes apart
    const sy0 = 201, sy1 = 411, L = CX - RX * 1.01, Rr = CX + RX * 1.01;
    const side = 'M' + L + ' ' + sy0 + ' L' + L + ' ' + sy1 + ' A' + (RX * 1.01) + ' ' + RY + ' 0 0 0 ' + Rr + ' ' + sy1 + ' L' + Rr + ' ' + sy0 + ' A' + (RX * 1.01) + ' ' + RY + ' 0 0 1 ' + L + ' ' + sy0 + ' Z';
    const sleeve = '<g class="a-sleeve"><path d="' + side + '" fill="url(#pKnit)"/><path d="' + side + '" fill="url(#gShade)"/><path d="' + side + '" fill="url(#gSleeveTop)"/>' +
      label(306 + RY * 0.55, 'Knit', 'The sleeve', ['One seamless knitted tube, about', '26,000 stitches. Acoustically open.']) + '</g>';
    // draw from the base up, so each part covers the top of the one beneath it
    const order = [5, 4, 3, 2].map((i) => groups[i]).join('') + sleeve + groups[1] + groups[0];
    anatSvg.innerHTML = defs + '<g id="anatRoot">' + order + '</g>';
    $$('.a-part', anatSvg).sort((a, b) => a.dataset.i - b.dataset.i).forEach((g) => parts.push({ el: g, lbl: $('.lbl', g) }));
    parts.root = $('#anatRoot', anatSvg);
    parts.sleeve = $('.a-sleeve', anatSvg);
    parts.sleeveLbl = $('.a-sleeve .lbl', anatSvg);
    parts.warm = $('.a-warm', anatSvg);
    parts.down = $('.a-down', anatSvg);
  })();

  function explode(p) {
    const e = WINDOWS.map((w) => ease(clamp((p - w[0]) / (w[1] - w[0]))));
    const sl = ease(clamp((p - SLEEVE[0]) / (SLEEVE[1] - SLEEVE[0])));
    parts.sleeve.setAttribute('opacity', (1 - sl).toFixed(3));
    parts.sleeve.setAttribute('transform', 'translate(0 ' + (sl * 46).toFixed(2) + ')');
    parts.sleeve.style.display = sl > 0.999 ? 'none' : '';
    parts.sleeveLbl.classList.toggle("on", p < 0.085);
    let acc = 0, spread = 0;
    parts.forEach((pt, i) => {
      if (i > 0) acc += GAPS[i - 1] * e[i - 1];
      pt.el.setAttribute('transform', 'translate(0 ' + acc.toFixed(2) + ')');
      const shown = i === 0 ? p >= 0.085 : e[i - 1] > LABEL_AT[i];
      pt.lbl.classList.toggle('on', shown);
    });
    spread = acc;
    parts.root.setAttribute('transform', 'translate(0 ' + (70 - spread / 2).toFixed(2) + ')');
    parts.warm.setAttribute('opacity', (0.35 + 0.65 * e[0]).toFixed(3));
    parts.down.setAttribute('opacity', e[4].toFixed(3));
  }
  explode(1);
  // phones show the exploded object without its side labels (the list below carries them), so centre it
  const fitAnat = () => anatSvg.setAttribute('viewBox', phoneQ.matches ? '140 60 320 620' : '60 40 760 660');
  fitAnat();
  phoneQ.addEventListener('change', fitAnat);

  /* ------------------------------------------------------------
     Frequency response on the certificate (illustrative, drawn to the ±3 dB tolerance)
     ------------------------------------------------------------ */
  const resp = $('#respSvg');
  const respCurve = (function buildResponse() {
    const X0 = 70, X1 = 990, Y0 = 20, Y1 = 250;
    const lf0 = Math.log10(16), lf1 = Math.log10(26000);
    const fx = (f) => X0 + (Math.log10(f) - lf0) / (lf1 - lf0) * (X1 - X0);
    const dy = (db) => Y0 + (9 - db) / 27 * (Y1 - Y0);
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach((f) => svgEl('line', { class: 'resp-grid', x1: fx(f), x2: fx(f), y1: Y0, y2: Y1 }, resp));
    [6, 0, -6, -12, -18].forEach((d) => {
      svgEl('line', { class: 'resp-grid', x1: X0, x2: X1, y1: dy(d), y2: dy(d) }, resp);
      const t = svgEl('text', { class: 'resp-lbl', x: X0 - 14, y: dy(d) + 5, 'text-anchor': 'end' }, resp);
      t.textContent = (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d);
    });
    svgEl('rect', { class: 'resp-band', x: fx(32), width: fx(22000) - fx(32), y: dy(3), height: dy(-3) - dy(3) }, resp);
    [[20, '20 Hz'], [100, '100'], [1000, '1 kHz'], [10000, '10 kHz']].forEach((a) => {
      const t = svgEl('text', { class: 'resp-lbl', x: fx(a[0]), y: Y1 + 30, 'text-anchor': 'middle' }, resp);
      t.textContent = a[1];
    });
    const level = (f) => {
      const lo = -10 * Math.log10(1 + Math.pow(32 / f, 6));
      const hi = -10 * Math.log10(1 + Math.pow(f / 22000, 8));
      const l = Math.log10(f);
      const fade = clamp((f - 45) / 60) * clamp((15000 - f) / 4000);
      const ripple = (0.9 * Math.sin(l * 3.3 + 0.6) + 0.45 * Math.sin(l * 8.1 + 1.2)) * fade;
      return lo + hi + ripple;
    };
    let d = '';
    for (let i = 0; i <= 220; i++) {
      const f = Math.pow(10, lf0 + (i / 220) * (lf1 - lf0));
      d += (i ? 'L' : 'M') + fx(f).toFixed(1) + ' ' + dy(Math.max(-17, level(f))).toFixed(1);
    }
    const curve = svgEl('path', { class: 'resp-curve', d, pathLength: 1 }, resp);
    [[32, '32 Hz'], [22000, '22 kHz']].forEach((a) => {
      svgEl('circle', { class: 'resp-dot', cx: fx(a[0]), cy: dy(-3), r: 4.5 }, resp);
      const t = svgEl('text', { class: 'resp-lbl', x: fx(a[0]) + (a[0] < 100 ? 10 : -10), y: dy(-3) + 24, 'text-anchor': a[0] < 100 ? 'start' : 'end' }, resp);
      t.textContent = a[1];
    });
    return curve;
  })();

  // pictograms: solid strokes draw, dashed ones fade
  $$('.picto').forEach((svg) => $$('path, rect, circle, line', svg).forEach((el) => {
    if (el.getAttribute('stroke-dasharray') || (el.tagName === 'circle' && el.classList.contains('picto__lamp'))) el.dataset.fadeIn = '';
    else { el.setAttribute('pathLength', '1'); el.dataset.draw = ''; }
  }));

  /* ------------------------------------------------------------
     Pre-order
     ------------------------------------------------------------ */
  const PRICE = { 1: 1290, 2: 2390 }, DEPOSIT = 100;
  const eur = (n) => '€' + Math.round(n).toLocaleString('en-US');
  const sumEls = { total: $('#sumTotal'), today: $('#sumToday'), bal: $('#sumBal') };
  const shown = { total: PRICE[1], today: DEPOSIT, bal: PRICE[1] - DEPOSIT };
  function tweenSum(key, to) {
    const from = shown[key], t0 = performance.now(), dur = reduce ? 1 : 650;
    (function step(now) {
      const k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      sumEls[key].textContent = eur(lerp(from, to, e));
      if (k < 1) requestAnimationFrame(step); else shown[key] = to;
    })(t0);
  }
  const preSpeakers = $('#preSpeakers');
  function setQty(q) {
    state.qty = q;
    $$('#preQty .card').forEach((b) => {
      const on = +b.dataset.qty === q;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    preSpeakers.classList.toggle('is-pair', q === 2);
    $('#preCanvasB').classList.toggle('is-off', q !== 2);
    $('#preCanvasB').setAttribute('aria-hidden', q === 2 ? 'false' : 'true');
    tweenSum('total', PRICE[q]); tweenSum('today', DEPOSIT); tweenSum('bal', PRICE[q] - DEPOSIT);
  }
  $$('#preQty .card').forEach((b) => b.addEventListener('click', () => setQty(+b.dataset.qty)));

  const form = $('#orderForm'), email = $('#email'), msg = $('#formMsg'), submitText = $('#submitText');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = email.value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    email.classList.toggle('is-bad', !ok);
    msg.className = 'field__msg ' + (ok ? 'is-ok' : 'is-bad');
    if (!ok) { msg.textContent = 'Please enter a valid email address.'; email.focus(); return; }
    msg.textContent = 'You are on the list. We will email a secure link for your €100 deposit to ' + v + '.';
    submitText.textContent = 'Reserved';
    email.disabled = true;
    if (speakers.preA) { speakers.preA.boost = 1.2; speakers.preA.vel += 3; }
    if (speakers.preB) { speakers.preB.boost = 1.2; speakers.preB.vel -= 3; }
  });
  email.addEventListener('input', () => {
    email.classList.remove('is-bad');
    if (msg.classList.contains('is-bad')) { msg.textContent = ''; msg.className = 'field__msg'; }
  });

  /* ------------------------------------------------------------
     Sound
     ------------------------------------------------------------ */
  const soundBtn = $('#soundToggle'), heroPlay = $('#heroPlay');
  function syncSound(on) {
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Stop ambient sound' : 'Play ambient sound');
    $('b', soundBtn).textContent = on ? 'on' : 'off';
    heroPlay.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('.btn__t', heroPlay).textContent = on ? 'Pause the room' : 'Play the room';
    body.classList.toggle('sound-on', on);
  }
  function toggleSound() {
    const on = H.audio.toggle();
    syncSound(!!on);
    hero.boost = 0.6;
  }
  soundBtn.addEventListener('click', toggleSound);
  heroPlay.addEventListener('click', toggleSound);

  /* ------------------------------------------------------------
     Navigation, menu, anchors
     ------------------------------------------------------------ */
  const nav = $('#nav'), menuBtn = $('#menuBtn'), menu = $('#menu');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  let scrollAnim = 0;
  function scrollToY(target) {
    cancelAnimationFrame(scrollAnim);
    if (reduce) { window.scrollTo(0, target); return; }
    const start = window.scrollY, dist = target - start, t0 = performance.now();
    const dur = clamp(Math.abs(dist) / 2.6, 700, 1800);
    (function step(now) {
      const k = clamp((now - t0) / dur);
      window.scrollTo(0, start + dist * ease(k));
      if (k < 1) scrollAnim = requestAnimationFrame(step);
    })(t0);
  }
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => addEventListener(ev, () => cancelAnimationFrame(scrollAnim), { passive: true }));
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = id === '#top' ? null : $(id);
    if (id !== '#top' && !t) return;
    e.preventDefault();
    setMenu(false);
    scrollToY(t ? t.getBoundingClientRect().top + window.scrollY : 0);
    if (t && id === '#main') t.setAttribute('tabindex', '-1'), t.focus({ preventScroll: true });
  }));

  let lastY = window.scrollY, navTick = false;
  function updateNav() {
    navTick = false;
    const y = window.scrollY;
    nav.classList.toggle('is-compact', y > 40);
    const down = y > lastY + 4, up = y < lastY - 4;
    if (down && y > innerHeight * 0.9 && !body.classList.contains('menu-open')) nav.classList.add('is-hidden');
    else if (up || y < innerHeight * 0.5) nav.classList.remove('is-hidden');
    if (down || up) lastY = y;
  }
  addEventListener('scroll', () => { if (!navTick) { navTick = true; requestAnimationFrame(updateNav); } }, { passive: true });
  updateNav();

  /* ------------------------------------------------------------
     Choreography (GSAP + ScrollTrigger + SplitText)
     ------------------------------------------------------------ */
  function staticState() {
    explode(1);
    walk(0.5);
  }

  function choreograph() {
    const gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
    if (!gsap || !ST) { root.classList.remove('js'); staticState(); return; }
    gsap.registerPlugin(ST);
    if (Split) gsap.registerPlugin(Split);

    // Hand the hero over from its CSS entrance to the scroll exit once it has settled.
    setTimeout(() => heroEl.classList.add('is-settled'), reduce ? 0 : 1750);

    const mm = gsap.matchMedia();
    mm.add({ all: 'all', motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 761px)' }, (ctx) => {
      const { motion, desktop } = ctx.conditions;
      if (!motion) {
        gsap.set('[data-motion]:not([data-motion="stagger"]), [data-motion="stagger"] > *', { autoAlpha: 1 });
        staticState();
        respCurve.style.strokeDashoffset = '0';
        return;
      }

      /* chapters: the page ground and ink cross-fade at each chapter */
      root.classList.add('chapters');
      const chapters = $$('[data-ground]');
      const colours = (sec) => { const cs = getComputedStyle(sec); return { g: cs.getPropertyValue('--sg').trim(), i: cs.getPropertyValue('--si').trim() }; };
      let active = null;
      // One fixed layer cross-fades the ground; the ink and the ground tokens swap once, mid-fade, with CSS
      // transitions suspended for that frame. Tweening the tokens themselves would repaint every element per frame.
      const bg = document.createElement('div');
      bg.className = 'chapter-bg';
      bg.setAttribute('aria-hidden', 'true');
      body.prepend(bg);
      let swap = null;
      const applyTokens = (c) => {
        root.classList.add('is-shifting');
        root.style.setProperty('--ground', c.g);
        root.style.setProperty('--ink', c.i);
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-shifting')));
      };
      const setChapter = (sec, instant) => {
        if (active === sec && !instant) return;
        active = sec;
        const c = colours(sec);
        if (swap) swap.kill();
        if (instant) { gsap.set(bg, { backgroundColor: c.g }); applyTokens(c); return; }
        gsap.to(bg, { backgroundColor: c.g, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
        swap = gsap.delayedCall(0.2, () => applyTokens(c));
      };
      const mid = innerHeight * 0.55;
      const first = chapters.find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || chapters[0];
      setChapter(first, true);
      chapters.forEach((sec) => ST.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) setChapter(sec); } }));
      onPalette = () => { const m = $('#materials'); if (active === m) { active = null; setChapter(m); } };

      /* hero exit: the headline parts, the speaker sinks back */
      const hx = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true } });
      if (desktop) {
        hx.to('.hl--1', { xPercent: -7, opacity: 0.25 }, 0)
          .to('.hl--2', { xPercent: 9, opacity: 0.25 }, 0)
          .to('.hero__visual', { yPercent: -8, scale: 0.9 }, 0)
          .to('.hero__window', { yPercent: 14 }, 0)
          .to('.hero__side', { y: -70, opacity: 0 }, 0);
      } else {
        hx.to('.hero__visual', { yPercent: -10, scale: 0.94 }, 0);
      }

      /* headings: masked lines rise */
      $$('[data-motion="heading"]').forEach((el) => {
        gsap.set(el, { autoAlpha: 1 });
        if (!Split) return;
        Split.create(el, {
          type: 'lines', mask: 'lines', autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, {
            yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 86%', once: true }
          })
        });
      });

      /* visuals: clip reveal with the content counter-scaling */
      // Run through the Web Animations API so the browser, not a per-frame style write, drives the clip and scale.
      $$('[data-motion="image"]').forEach((el) => {
        const inner = el.querySelector('.sim__inner canvas, canvas, .pre__speakers') || el;
        ST.create({ trigger: el, start: 'top 82%', once: true, onEnter: () => {
          el.style.visibility = 'visible';
          el.animate([{ clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }], { duration: 1200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
          if (inner !== el) inner.animate([{ transform: 'scale(1.14)' }, { transform: 'none' }], { duration: 1600, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
        } });
      });

      $$('[data-motion="stagger"]').forEach((group) => {
        gsap.from(group.children, { y: 32, scale: 0.98, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
          scrollTrigger: { trigger: group, start: 'top 84%', once: true } });
      });

      $$('[data-motion="fade"]').forEach((el) => {
        gsap.from(el, { y: 22, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });

      /* manual pictograms draw as their row arrives */
      $$('.feat__row').forEach((row) => {
        const draw = $$('[data-draw]', row), fade = $$('[data-fade-in]', row);
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 86%', once: true } });
        if (draw.length) { gsap.set(draw, { strokeDasharray: 1, strokeDashoffset: 1 }); tl.to(draw, { strokeDashoffset: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, 0.15); }
        if (fade.length) tl.from(fade, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.5);
      });

      /* the response curve draws on the certificate */
      gsap.set(respCurve, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.to(respCurve, { strokeDashoffset: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '#respSvg', start: 'top 82%', once: true } });

      /* supporting scene: the listener walks once round both speakers */
      const walker = { p: 0 };
      walk(0);
      gsap.to(walker, { p: 1, ease: 'none', onUpdate: () => walk(walker.p),
        scrollTrigger: { trigger: '#dirFig', start: 'top 78%', end: 'bottom 22%', scrub: 0.6 } });

      /* signature: the exploded axis, scrubbed inside the sticky stage */
      if (desktop) {
        const ex = { p: 0 };
        explode(0);
        gsap.to(ex, { p: 1, ease: 'none', onUpdate: () => explode(ex.p),
          scrollTrigger: { trigger: '.anat', start: 'top top', end: 'bottom bottom', scrub: 0.8 } });
      } else {
        explode(1);
      }

      /* magnetic primary actions, fine pointers only */
      if (fine) $$('[data-magnetic]').forEach((el) => {
        const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
        const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
        const move = (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.3); };
        const leave = () => { x(0); y(0); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
        ctx.add(() => () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
      });

      return () => { root.classList.remove('chapters'); onPalette = null; bg.remove(); root.style.removeProperty('--ground'); root.style.removeProperty('--ink'); };
    });

    document.fonts && document.fonts.ready.then(() => ST.refresh());
  }

  // This file is deferred ahead of GSAP, so wait for DOMContentLoaded: by then every deferred script has run.
  if (document.readyState === 'complete') choreograph();
  else document.addEventListener('DOMContentLoaded', choreograph);
})();
