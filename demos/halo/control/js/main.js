/* Halo — page choreography: loader, scroll scenes, cursor, interactions. */
(function () {
  'use strict';
  const H = window.Halo;
  const TAU = Math.PI * 2;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  const body = document.body;

  try { history.scrollRestoration = 'manual'; } catch (_) {}
  window.scrollTo(0, 0);

  let vw = innerWidth, vh = innerHeight;
  let y = 0, sy = 0, prevY = 0, vel = 0, velS = 0;
  const state = { pal: 'oat', qty: 1 };

  /* ------------------------------------------------------------
     Text splitting
     ------------------------------------------------------------ */
  function splitWords(el, cls, inner) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    let idx = 0;
    const out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = cls;
            s.setAttribute('aria-hidden', 'true');
            if (inner) {
              const i = document.createElement('i');
              i.textContent = w;
              i.style.setProperty('--i', idx);
              s.appendChild(i);
            } else s.textContent = w;
            idx++;
            out.push(s);
            frag.appendChild(s);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    })(el);
    return out;
  }
  $$('[data-split]').forEach((el) => splitWords(el, 'sw', true));
  const ideaEl = $('#ideaText');
  const ideaWords = ideaEl ? splitWords(ideaEl, 'mw', false) : [];

  /* ------------------------------------------------------------
     Reveals
     ------------------------------------------------------------ */
  const revealTargets = $$('[data-reveal], [data-split]:not(.hero__title), .sg');
  $$('.sg dl > div').forEach((row, i) => row.style.setProperty('--r', i % 6));
  if (reduce) {
    revealTargets.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((el) => io.observe(el));
  }

  // counters
  function countUp(el) {
    const to = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = to + suffix; return; }
    const t0 = performance.now(), dur = 2000;
    (function step(now) {
      const k = clamp((now - t0) / dur);
      const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      el.textContent = Math.round(to * e) + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ------------------------------------------------------------
     Layout cache
     ------------------------------------------------------------ */
  const themeSecs = $$('[data-theme]').map((el) => ({ el, theme: el.dataset.theme, top: 0, bottom: 0 }));
  const labelSecs = $$('[data-label]').map((el, i) => ({ el, label: el.dataset.label, i, top: 0 }));
  const scenes = {};
  const hsEl = $('#hs'), hsTrack = $('#hsTrack');
  let docH = 1;

  function measure() {
    vw = innerWidth; vh = innerHeight;
    const sc = window.scrollY;
    themeSecs.forEach((s) => { const r = s.el.getBoundingClientRect(); s.top = r.top + sc; s.bottom = r.bottom + sc; });
    labelSecs.forEach((s) => { s.top = s.el.getBoundingClientRect().top + sc; });
    ['storyTrack', 'anatTrack'].forEach((id) => {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      scenes[id] = { top: r.top + sc, h: el.offsetHeight };
    });
    if (hsEl && hsTrack) {
      if (vw > 860) {
        const dist = Math.max(0, hsTrack.scrollWidth - vw);
        hsEl.style.height = (dist + vh * 1.05) + 'px';
      } else hsEl.style.height = '';
      const r = hsEl.getBoundingClientRect();
      scenes.hs = { top: r.top + sc, h: hsEl.offsetHeight, dist: Math.max(0, hsTrack.scrollWidth - vw) };
    }
    docH = document.documentElement.scrollHeight;
    configureSpeakers();
  }

  /* ------------------------------------------------------------
     Speakers
     ------------------------------------------------------------ */
  const heroEl = $('#top');
  const hero = new H.Speaker($('#heroCanvas'), { scale: 0.78, cy: 0.5, tilt: 0.2, autoSpeed: 0.22, glow: 1 });
  const story = new H.Speaker($('#storyCanvas'), { scale: 0.8, cx: 0.66, cy: 0.52, tilt: 0.2, autoSpeed: 0, glow: 0.85, ripples: false, wFrac: 0.3 });
  const mat = new H.Speaker($('#matCanvas'), { scale: 0.74, cy: 0.54, tilt: 0.2, autoSpeed: 0.25, glow: 0.95, ripples: false, wFrac: 0.3 });
  const preA = new H.Speaker($('#preCanvasA'), { scale: 0.72, cy: 0.52, tilt: 0.2, autoSpeed: 0.2, glow: 1, ripples: true, wFrac: 0.4, drag: false });
  const preB = new H.Speaker($('#preCanvasB'), { scale: 0.72, cy: 0.52, tilt: 0.2, autoSpeed: -0.2, glow: 1, ripples: true, wFrac: 0.4, drag: false });
  preB.base = 2.3;
  story.base = 0.9;
  const allSpeakers = [hero, story, mat, preA, preB];
  if (reduce) allSpeakers.forEach((s) => { s.o.autoSpeed = 0; s.autoOn = 0; });

  function configureSpeakers() {
    const w = vw;
    if (w < 760) { hero.o.scale = 0.46; hero.o.cy = 0.3; hero.o.wFrac = 0.3; }
    else if (w < 1100) { hero.o.scale = 0.58; hero.o.cy = 0.42; hero.o.wFrac = 0.28; }
    else { hero.o.scale = 0.78; hero.o.cy = 0.5; hero.o.wFrac = 0.3; }
    hero.resize();
    heroEl.style.setProperty('--spk-w', (hero.R * 2).toFixed(0) + 'px');
    if (w < 900) { story.o.cx = 0.5; story.o.cy = 0.35; story.o.scale = 0.46; story.o.wFrac = 0.3; }
    else { story.o.cx = 0.67; story.o.cy = 0.53; story.o.scale = 0.8; story.o.wFrac = 0.3; }
    story.resize();
  }

  // pointer parallax on the hero
  heroEl.addEventListener('pointermove', (e) => {
    const r = heroEl.getBoundingClientRect();
    hero.px = ((e.clientX - r.left) / r.width - 0.5) * 2;
    hero.py = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  heroEl.addEventListener('pointerleave', () => { hero.px = 0; hero.py = 0; });

  /* colourway */
  const matName = $('#matName'), matDesc = $('#matDesc');
  function setPalette(key, from) {
    state.pal = key;
    const p = H.palettes[key];
    allSpeakers.forEach((s) => s.setPalette(key));
    matName.textContent = p.name;
    matDesc.textContent = p.desc;
    const f = p.fabric;
    root.style.setProperty('--knit', 'rgb(' + f.map((v) => Math.round(v)).join(',') + ')');
    root.style.setProperty('--knit-dark', 'rgb(' + f.map((v) => Math.round(v * 0.52)).join(',') + ')');
    ['#matSwatches .swatch', '#preSwatches .chip'].forEach((sel) => {
      $$(sel).forEach((b) => {
        const on = b.dataset.pal === key;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    });
    if (from !== 'init') { mat.boost = 0.7; preA.boost = 0.7; preB.boost = 0.7; }
  }
  $$('#matSwatches .swatch, #preSwatches .chip').forEach((b) => b.addEventListener('click', () => setPalette(b.dataset.pal)));
  setPalette('oat', 'init');

  /* ------------------------------------------------------------
     Story (object) scene
     ------------------------------------------------------------ */
  const steps = $$('#storySteps .step');
  const callouts = $$('#callouts .callout');
  const storyNum = $('#storyNum'), storyBar = $('#storyBar');
  let storyIdx = -1;
  const STORY = [
    { tilt: 0.2, glow: 0.75, ripple: 0 },
    { tilt: 0.26, glow: 1.3, ripple: 0 },
    { tilt: 0.62, glow: 0.9, ripple: 0 },
    { tilt: 0.1, glow: 1.0, ripple: 1 }
  ];
  function setStoryStep(i) {
    storyIdx = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    callouts.forEach((c) => c.classList.toggle('is-active', +c.dataset.step === i));
    storyNum.textContent = '0' + (i + 1);
    const t = STORY[i];
    story.tiltT = t.tilt; story.glowT = t.glow; story.rippleT = t.ripple;
    if (i === 1) story.boost = 0.8;
  }
  story.onFrame = (s) => {
    const a = s.anchors;
    callouts.forEach((c) => {
      const p = a[c.dataset.anchor];
      if (p) c.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
    });
  };
  function updateStory() {
    const sc = scenes.storyTrack; if (!sc) return;
    const p = clamp((sy - sc.top) / (sc.h - vh));
    storyBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    const idx = Math.min(3, Math.floor(p * 4 + 0.0001));
    if (idx !== storyIdx) setStoryStep(idx);
    story.scrollRot = p * TAU * 1.15;
  }

  /* ------------------------------------------------------------
     Anatomy (exploded view)
     ------------------------------------------------------------ */
  const svg = $('#anatSvg');
  const CX = 250, RX = 128, RY = 33;
  const parts = [];
  (function buildAnatomy() {
    const defs = '<defs>' +
      '<linearGradient id="gAlu" x1="0" x2="1"><stop offset="0" stop-color="#6d665b"/><stop offset=".22" stop-color="#d4ccbc"/><stop offset=".36" stop-color="#f6f1e6"/><stop offset=".6" stop-color="#a39b8b"/><stop offset=".86" stop-color="#58524a"/><stop offset="1" stop-color="#7d7568"/></linearGradient>' +
      '<radialGradient id="gAluTop" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#f8f3e9"/><stop offset=".6" stop-color="#c9c1b1"/><stop offset="1" stop-color="#8d8576"/></radialGradient>' +
      '<linearGradient id="gDark" x1="0" x2="1"><stop offset="0" stop-color="#17140f"/><stop offset=".3" stop-color="#3a342d"/><stop offset=".45" stop-color="#2a251f"/><stop offset="1" stop-color="#0f0d0b"/></linearGradient>' +
      '<radialGradient id="gDarkTop" cx=".4" cy=".4" r=".8"><stop offset="0" stop-color="#3a342d"/><stop offset="1" stop-color="#171410"/></radialGradient>' +
      '<linearGradient id="gAmber" x1="0" x2="1"><stop offset="0" stop-color="#d06a1c"/><stop offset=".4" stop-color="#ffe0ae"/><stop offset=".6" stop-color="#ffc178"/><stop offset="1" stop-color="#c85e14"/></linearGradient>' +
      '<radialGradient id="gCone" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#5b5349"/><stop offset=".7" stop-color="#1c1814"/><stop offset="1" stop-color="#0c0a08"/></radialGradient>' +
      '<radialGradient id="gCap" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#efe7d7"/><stop offset="1" stop-color="#7d7466"/></radialGradient>' +
      '<filter id="fGlow" x="-30%" y="-300%" width="160%" height="700%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>';

    function disc(y, t, side, top, rx, ry, sw) {
      rx = rx || RX; ry = ry || RY;
      const L = CX - rx, R = CX + rx;
      return '<path class="a-stroke" d="M' + L + ' ' + y + ' L' + L + ' ' + (y + t) + ' A' + rx + ' ' + ry + ' 0 0 0 ' + R + ' ' + (y + t) + ' L' + R + ' ' + y + ' A' + rx + ' ' + ry + ' 0 0 1 ' + L + ' ' + y + ' Z" fill="' + side + '" stroke="rgba(255,255,255,.16)" stroke-width="' + (sw || 1) + '"/>' +
        '<ellipse class="a-stroke" cx="' + CX + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + top + '" stroke="rgba(255,255,255,.22)" stroke-width="' + (sw || 1) + '"/>';
    }
    function driver(a, ymid, size) {
      const x = CX + RX * Math.sin(a), c = Math.cos(a);
      const yy = ymid + RY * c;
      const rx = size * c, ry = size;
      return '<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="' + (rx + 2.5 * c).toFixed(1) + '" ry="' + (ry + 2.5) + '" fill="#0b0907" stroke="rgba(255,255,255,.28)" stroke-width="1"/>' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry + '" fill="url(#gCone)" stroke="rgba(255,255,255,.1)"/>' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="' + (rx * 0.3).toFixed(1) + '" ry="' + (ry * 0.3).toFixed(1) + '" fill="url(#gCap)" opacity=".85"/>';
    }

    const defsOut = [];
    const defsPart = [
      { y: 170, t: 22, off: -52, name: 'Crown', build() {
        let s = disc(170, 22, 'url(#gAlu)', 'url(#gAluTop)');
        for (let i = 1; i < 6; i++) s += '<ellipse cx="' + CX + '" cy="170" rx="' + (RX * (0.2 + i * 0.15)) + '" ry="' + (RY * (0.2 + i * 0.15)) + '" fill="none" stroke="rgba(0,0,0,.07)"/>';
        s += '<ellipse cx="' + CX + '" cy="170" rx="' + (RX * 0.5) + '" ry="' + (RY * 0.5) + '" fill="#b9b1a2" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>';
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; s += '<line x1="' + (CX + Math.cos(a) * RX * 0.34) + '" y1="' + (170 + Math.sin(a) * RY * 0.34) + '" x2="' + (CX + Math.cos(a) * RX * 0.44) + '" y2="' + (170 + Math.sin(a) * RY * 0.44) + '" stroke="rgba(0,0,0,.35)"/>'; }
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; s += '<ellipse cx="' + (CX + Math.cos(a) * RX * 0.76) + '" cy="' + (170 + Math.sin(a) * RY * 0.76) + '" rx="3.2" ry="1.6" fill="#15110d"/>'; }
        s += '<circle cx="' + CX + '" cy="' + (170 + RY * 0.18) + '" r="3" fill="#ffd9a0" filter="url(#fGlow)"/>';
        return s;
      } },
      { y: 192, t: 9, off: 13, name: 'Halo', build() {
        let s = '<g filter="url(#fGlow)">' + disc(192, 9, 'url(#gAmber)', 'rgba(255,200,130,.16)', RX * 0.99, RY * 0.99, 1.2) + '</g>';
        s += '<ellipse cx="' + CX + '" cy="192" rx="' + (RX * 0.99) + '" ry="' + (RY * 0.99) + '" fill="none" stroke="#ffb15a" stroke-width="3"/>';
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; s += '<circle cx="' + (CX + Math.cos(a) * RX * 0.8) + '" cy="' + (192 + Math.sin(a) * RY * 0.8) + '" r="1.8" fill="#ffe7c2"/>'; }
        return s;
      } },
      { y: 201, t: 74, off: 89, name: 'Ring', build() {
        let s = disc(201, 74, 'url(#gDark)', 'url(#gDarkTop)');
        s += driver(-Math.PI / 3, 238, 21) + driver(Math.PI / 3, 238, 21) + driver(0, 238, 24);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; s += '<circle cx="' + (CX + Math.cos(a) * RX * 0.62) + '" cy="' + (201 + Math.sin(a) * RY * 0.62) + '" r="5" fill="none" stroke="rgba(255,255,255,.3)"/><circle cx="' + (CX + Math.cos(a) * RX * 0.62) + '" cy="' + (201 + Math.sin(a) * RY * 0.62) + '" r="2" fill="#ffb15a" opacity=".8"/>'; }
        return s;
      } },
      { y: 275, t: 92, off: 130, name: 'Chamber', build() {
        let s = disc(275, 92, 'url(#gDark)', 'url(#gDarkTop)');
        const a = -0.62, x = CX + RX * Math.sin(a), c = Math.cos(a), yy = 321 + RY * c;
        s += '<ellipse cx="' + x + '" cy="' + yy + '" rx="' + (36 * c) + '" ry="38" fill="#0f0c0a" stroke="rgba(255,255,255,.3)" stroke-width="1.2"/><ellipse cx="' + x + '" cy="' + yy + '" rx="' + (27 * c) + '" ry="29" fill="url(#gCone)" stroke="rgba(255,255,255,.12)"/>';
        for (let i = 1; i < 4; i++) s += '<ellipse cx="' + x + '" cy="' + yy + '" rx="' + (27 * c * i / 4) + '" ry="' + (29 * i / 4) + '" fill="none" stroke="rgba(255,255,255,.1)"/>';
        for (let i = 0; i < 8; i++) s += '<path d="M' + (CX + 14 + i * 7) + ' ' + (292 + 0) + ' q5 4 10 0" fill="none" stroke="rgba(255,255,255,.14)"/>';
        return s;
      } },
      { y: 367, t: 44, off: 158, name: 'Woofer', build() {
        let s = disc(367, 44, 'url(#gDark)', 'url(#gDarkTop)');
        s += '<ellipse cx="' + CX + '" cy="367" rx="' + (RX * 0.86) + '" ry="' + (RY * 0.86) + '" fill="#0a0806" stroke="rgba(255,255,255,.3)"/><ellipse cx="' + CX + '" cy="369" rx="' + (RX * 0.7) + '" ry="' + (RY * 0.7) + '" fill="url(#gCone)" stroke="rgba(255,255,255,.1)"/>';
        for (let i = 1; i < 4; i++) s += '<ellipse cx="' + CX + '" cy="369" rx="' + (RX * 0.7 * i / 4) + '" ry="' + (RY * 0.7 * i / 4) + '" fill="none" stroke="rgba(255,255,255,.09)"/>';
        s += '<ellipse cx="' + CX + '" cy="371" rx="' + (RX * 0.2) + '" ry="' + (RY * 0.2) + '" fill="url(#gCap)"/>';
        for (let i = 0; i < 3; i++) s += '<path d="M' + (CX - 60 - i * 10) + ' ' + (426 + i * 9) + ' q' + (60 + i * 10) + ' ' + (16 + i * 4) + ' ' + (120 + i * 20) + ' 0" fill="none" stroke="#ffb15a" stroke-width="1.5" stroke-dasharray="3 5" opacity="' + (0.8 - i * 0.2) + '"/>';
        return s;
      } },
      { y: 411, t: 18, off: 214, name: 'Base', build() {
        let s = disc(411, 18, 'url(#gAlu)', 'url(#gAluTop)', RX * 0.94, RY * 0.94);
        s += '<ellipse cx="' + CX + '" cy="411" rx="' + (RX * 0.78) + '" ry="' + (RY * 0.78) + '" fill="#1c1814" stroke="rgba(255,255,255,.15)"/><ellipse cx="' + CX + '" cy="411" rx="' + (RX * 0.5) + '" ry="' + (RY * 0.5) + '" fill="none" stroke="rgba(255,255,255,.12)"/>';
        return s;
      } }
    ];
    let html = defs + '<g id="anatRoot">';
    defsPart.forEach((p, i) => {
      const mid = p.y + p.t / 2 + RY * 0.7;
      const lx = CX + RX + 66;
      html += '<g class="a-part" data-i="' + i + '">' + p.build() +
        '<g class="a-label"><line x1="' + (CX + RX * 0.9) + '" y1="' + mid + '" x2="' + (lx - 16) + '" y2="' + mid + '"/><circle cx="' + lx + '" cy="' + mid + '" r="15"/><text x="' + lx + '" y="' + (mid + 5) + '" text-anchor="middle">0' + (i + 1) + '</text></g></g>';
      parts.push({ off: p.off, name: p.name });
    });
    html += '</g>';
    svg.innerHTML = html;
    $$('.a-part', svg).forEach((g, i) => { parts[i].el = g; parts[i].label = $('.a-label', g); });
    parts.rootEl = $('#anatRoot', svg);
  })();

  const anatItems = $$('#anatList li');
  let anatIdx = -1;
  function updateAnatomy(t) {
    const sc = scenes.anatTrack; if (!sc) return;
    const p = clamp((sy - sc.top) / (sc.h - vh));
    const e = smooth(clamp(p / 0.2));
    const idx = clamp(Math.floor((p - 0.16) / (0.84 / 6)), 0, 5);
    if (idx !== anatIdx) {
      anatIdx = idx;
      anatItems.forEach((li, k) => li.classList.toggle('is-active', k === idx));
    }
    parts.rootEl.setAttribute('transform', 'translate(0,' + (110 * (1 - e) - 12 * e).toFixed(2) + ')');
    parts.forEach((pt, i) => {
      const bob = reduce ? 0 : Math.sin(t * 0.9 + i * 0.9) * 2.2 * e;
      const lift = (i === idx && e > 0.9) ? -10 : 0;
      if (pt.cur === undefined) pt.cur = 0;
      pt.cur += (lift - pt.cur) * 0.12;
      pt.el.setAttribute('transform', 'translate(0,' + (pt.off * e + bob + pt.cur).toFixed(2) + ')');
      pt.el.style.opacity = e < 0.6 ? 1 : (i === idx ? 1 : 0.5);
      pt.label.classList.toggle('is-on', e > 0.7);
      pt.el.classList.toggle('is-active', i === idx && e > 0.7);
    });
  }

  /* ------------------------------------------------------------
     Room + polar
     ------------------------------------------------------------ */
  const sim = new H.RoomSim($('#roomCanvas'), $('#simHandle'), $('#sim'));
  sim.tune = 0; sim.tuneT = 0;
  const polars = [new H.Polar($('#polarA'), 'conv', $('#readA')), new H.Polar($('#polarB'), 'halo', $('#readB'))];
  const seg = $('.seg');
  let tuneTouched = false;
  function setTune(v, user) {
    if (user) tuneTouched = true;
    sim.setTune(v);
    seg.style.setProperty('--i', v);
    $$('button', seg).forEach((b) => {
      const on = +b.dataset.tune === v;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  $$('button', seg).forEach((b) => b.addEventListener('click', () => setTune(+b.dataset.tune, true)));
  const simIO = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      simIO.disconnect();
      setTimeout(() => { if (!tuneTouched) setTune(1); }, reduce ? 300 : 2400);
    }
  }, { threshold: 0.5 });
  simIO.observe($('#sim'));

  /* ------------------------------------------------------------
     Horizontal features
     ------------------------------------------------------------ */
  const hsNum = $('#hsNum'), hsBar = $('#hsBar');
  function updateHS() {
    const sc = scenes.hs; if (!sc || !hsTrack) return;
    if (vw <= 860) { hsTrack.style.transform = ''; return; }
    const p = clamp((sy - sc.top) / (sc.h - vh));
    hsTrack.style.transform = 'translate3d(' + (-p * sc.dist).toFixed(1) + 'px,0,0)';
    hsBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    hsNum.textContent = '0' + (Math.min(4, Math.round(p * 4)) + 1);
  }

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
      const v = lerp(from, to, e);
      sumEls[key].textContent = eur(v);
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
    $('#preCanvasB').setAttribute('aria-hidden', q === 2 ? 'false' : 'true');
    tweenSum('total', PRICE[q]); tweenSum('today', DEPOSIT); tweenSum('bal', PRICE[q] - DEPOSIT);
    preA.boost = 0.6; preB.boost = 0.6;
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
    preA.boost = 1.4; preB.boost = 1.4;
    preA.vel += 3; preB.vel -= 3;
  });
  email.addEventListener('input', () => { email.classList.remove('is-bad'); if (msg.classList.contains('is-bad')) { msg.textContent = ''; msg.className = 'field__msg'; } });

  // FAQ with animated height
  $$('.faq details').forEach((d) => {
    const s = $('summary', d), c = $('div', d);
    s.addEventListener('click', (e) => {
      e.preventDefault();
      if (reduce) { d.open = !d.open; return; }
      if (d.open) {
        const h = c.offsetHeight;
        const a = c.animate({ height: [h + 'px', '0px'] }, { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
        a.onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = c.offsetHeight;
        c.animate({ height: ['0px', h + 'px'] }, { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });

  /* ------------------------------------------------------------
     Sound toggle
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
    hero.boost = 0.8;
  }
  soundBtn.addEventListener('click', toggleSound);
  heroPlay.addEventListener('click', toggleSound);

  /* ------------------------------------------------------------
     Navigation, menu, anchors, rail
     ------------------------------------------------------------ */
  const nav = $('#nav'), menuBtn = $('#menuBtn'), menu = $('#menu');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  let scrollAnim = null;
  function scrollToY(target) {
    if (reduce) { window.scrollTo(0, target); return; }
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    const start = window.scrollY, dist = target - start;
    const dur = clamp(Math.abs(dist) / 2.4, 800, 2000);
    const t0 = performance.now();
    (function step(now) {
      const k = clamp((now - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, start + dist * e);
      if (k < 1) scrollAnim = requestAnimationFrame(step); else scrollAnim = null;
    })(t0);
  }
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => addEventListener(ev, () => {
    if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; }
  }, { passive: true }));
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = id === '#top' ? null : $(id);
    e.preventDefault();
    setMenu(false);
    scrollToY(t ? t.getBoundingClientRect().top + window.scrollY : 0);
  }));

  const navLinks = $$('[data-nav]');
  const rail = $('#rail'), railRing = $('#railRing'), railNum = $('#railNum'), railLabel = $('#railLabel');
  let navHidden = false, lastNavY = 0, curLabel = -1, curTheme = '';
  function updateNav() {
    const dy = y - lastNavY;
    if (y > 160 && dy > 6 && !body.classList.contains('menu-open')) { if (!navHidden) { nav.classList.add('is-hidden'); navHidden = true; } }
    else if (dy < -6 || y < 160) { if (navHidden) { nav.classList.remove('is-hidden'); navHidden = false; } }
    if (Math.abs(dy) > 6) lastNavY = y;
    nav.classList.toggle('is-solid', y > 40);
    // theme under the nav
    const probe = y + 38;
    let theme = 'dark';
    for (let i = 0; i < themeSecs.length; i++) { if (themeSecs[i].top <= probe && themeSecs[i].bottom > probe) theme = themeSecs[i].theme; }
    if (theme !== curTheme) { curTheme = theme; nav.classList.toggle('on-light', theme === 'light'); }
    // section label
    let cur = 0;
    for (let i = 0; i < labelSecs.length; i++) if (labelSecs[i].top <= y + vh * 0.45) cur = i;
    if (cur !== curLabel) {
      curLabel = cur;
      railNum.textContent = ('0' + cur).slice(-2);
      railLabel.textContent = labelSecs[cur].label;
      const id = labelSecs[cur].el.id;
      navLinks.forEach((l) => l.classList.toggle('is-current', l.getAttribute('href') === '#' + id));
    }
    const prog = clamp(y / Math.max(1, docH - vh));
    railRing.style.strokeDashoffset = (100 - prog * 100).toFixed(2);
    rail.classList.toggle('is-on', introDone && y > 80);
  }

  /* ------------------------------------------------------------
     Cursor + magnetic buttons
     ------------------------------------------------------------ */
  if (fine && !reduce) {
    body.classList.add('has-cursor');
    const cur = $('#cursor'), dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur), label = $('.cursor__label', cur);
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; cur.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
    $('#heroCanvas').dataset.cursor = 'Drag';
    $('#storyCanvas').dataset.cursor = 'Drag';
    $('#matCanvas').dataset.cursor = 'Drag';
    $('#polarA').dataset.cursor = 'Move';
    $('#polarB').dataset.cursor = 'Move';
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest ? e.target.closest('[data-cursor], a, button, summary, input, label') : null;
      cur.classList.remove('is-link', 'is-label');
      if (!t) return;
      if (t.dataset.cursor) { label.textContent = t.dataset.cursor; cur.classList.add('is-label'); }
      else cur.classList.add('is-link');
    });
    cur.tick = () => {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    };
    scenes.cursor = cur;

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.28).toFixed(1) + 'px');
        el.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  /* ------------------------------------------------------------
     Marquee + hero + idea
     ------------------------------------------------------------ */
  const mq = $('#marqueeTrack');
  let mqX = 0, mqHalf = 1, mqSkew = 0;
  const hwL = $('#hwL'), hwR = $('#hwR'), heroCanvas = $('#heroCanvas');
  const heroCopy = $('.hero__copy'), heroFoot = $('.hero__foot'), heroTop = $('.hero__top');
  function updateHero() {
    const p = clamp(sy / vh);
    if (p > 1.02) { return; }
    const sp = Math.min(vw * 0.2, 340);
    hwL.style.transform = 'translate3d(' + (-p * sp).toFixed(1) + 'px,' + (-p * 40).toFixed(1) + 'px,0)';
    hwR.style.transform = 'translate3d(' + (p * sp).toFixed(1) + 'px,' + (-p * 40).toFixed(1) + 'px,0)';
    heroCanvas.style.transform = 'translate3d(0,' + (-p * vh * 0.1).toFixed(1) + 'px,0)';
    const f = clamp(1 - p * 1.7);
    heroCopy.style.opacity = f; heroCopy.style.transform = 'translate3d(0,' + (-p * 60).toFixed(1) + 'px,0)';
    heroTop.style.opacity = f; heroFoot.style.opacity = f;
    hero.scrollRot = sy * 0.0042;
    hero.tiltT = 0.2 + p * 0.1;
  }
  let ideaLast = -1;
  function updateIdea() {
    if (!ideaEl || !ideaWords.length) return;
    const r = ideaEl.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = reduce ? 1 : clamp((vh * 0.86 - r.top) / (r.height + vh * 0.86 - vh * 0.48));
    if (Math.abs(p - ideaLast) < 0.002) return;
    ideaLast = p;
    const n = ideaWords.length;
    for (let i = 0; i < n; i++) {
      const o = clamp((p - (i / n) * 0.88) / 0.12);
      ideaWords[i].style.opacity = (0.16 + 0.84 * o).toFixed(3);
    }
  }
  function updateMat() {
    const r = $('#matStage').getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    mat.scrollRot = (r.top / vh) * 1.3;
  }

  /* ------------------------------------------------------------
     Main loop
     ------------------------------------------------------------ */
  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now; t += dt;
    y = window.scrollY;
    vel = y - prevY; prevY = y;
    velS += (vel - velS) * (1 - Math.exp(-dt * 8));
    sy += (y - sy) * (reduce ? 1 : 1 - Math.exp(-dt * 12));
    if (Math.abs(y - sy) < 0.05) sy = y;

    H.audio.update(dt);
    updateNav();
    updateHero();
    updateIdea();
    updateStory();
    updateAnatomy(t);
    updateHS();
    updateMat();

    // marquee
    if (mq && !reduce) {
      mqX -= (46 + Math.abs(velS) * 22) * dt;
      if (mqX <= -mqHalf) mqX += mqHalf;
      mqSkew += (clamp(velS * 0.35, -7, 7) - mqSkew) * 0.1;
      mq.style.transform = 'translate3d(' + mqX.toFixed(1) + 'px,0,0) skewX(' + (-mqSkew).toFixed(2) + 'deg)';
    }

    H.Speaker.frame(t, dt);
    const ta = reduce ? 1.7 : t;
    if (sim.visible) sim.frame(ta, dt);
    polars.forEach((p) => { if (p.visible) p.frame(ta); });
    if (scenes.cursor) scenes.cursor.tick();
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------
     Loader
     ------------------------------------------------------------ */
  let introDone = false;
  const loader = $('#loader'), loadRing = $('#loadRing'), loadNum = $('#loadNum');
  function startIntro() {
    if (introDone) return;
    introDone = true;
    loader.classList.add('is-out');
    body.classList.remove('is-loading');
    measure();
    setTimeout(() => {
      root.classList.add('hero-in');
      $('.hero__title').classList.add('in');
    }, reduce ? 0 : 520);
    setTimeout(() => { loader.style.display = 'none'; }, 1500);
  }
  function runLoader() {
    if (reduce) { startIntro(); return; }
    let fontsReady = false;
    const settle = () => { fontsReady = true; };
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(settle); setTimeout(settle, 2600); } else fontsReady = true;
    const t0 = performance.now(), DUR = 1500;
    (function step(now) {
      const k = clamp((now - t0) / DUR);
      let p = 1 - Math.pow(1 - k, 2.4);
      if (!fontsReady) p = Math.min(p, 0.92);
      loadRing.style.strokeDashoffset = (100 - p * 100).toFixed(2);
      loadNum.textContent = Math.round(p * 100);
      if (p >= 1) { setTimeout(startIntro, 160); return; }
      requestAnimationFrame(step);
    })(t0);
    setTimeout(startIntro, 6000);
  }

  /* ------------------------------------------------------------ init */
  syncSound(false);
  measure();
  mqHalf = mq ? mq.scrollWidth / 2 : 1;
  let rm;
  const remeasure = () => { cancelAnimationFrame(rm); rm = requestAnimationFrame(() => { measure(); mqHalf = mq ? mq.scrollWidth / 2 : 1; }); };
  addEventListener('resize', remeasure);
  new ResizeObserver(remeasure).observe(body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  addEventListener('load', () => { remeasure(); setTimeout(remeasure, 800); });
  requestAnimationFrame(frame);
  runLoader();
})();
