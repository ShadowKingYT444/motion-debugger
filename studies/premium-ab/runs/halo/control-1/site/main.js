/* ==========================================================
   HALO — launch page behaviour (vanilla JS, optional Lenis)
   ========================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const TAU = Math.PI * 2;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vw = innerWidth, vh = innerHeight;
  let paused = false;

  /* ---------- speaker illustration (SVG, shared by hero / materials / pre-order) ---------- */
  const speakerSVG = u => `
<svg class="speaker" viewBox="0 0 400 600" role="img" aria-label="Halo wireless speaker">
  <defs>
    <linearGradient id="${u}b" x1="0" x2="1"><stop offset="0" style="stop-color:var(--fab-2)"/><stop offset=".3" style="stop-color:var(--fab-hi)"/><stop offset=".52" style="stop-color:var(--fab-1)"/><stop offset="1" style="stop-color:var(--fab-2)"/></linearGradient>
    <linearGradient id="${u}s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".62"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></linearGradient>
    <linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".4"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <linearGradient id="${u}m" x1="0" x2="1"><stop offset="0" stop-color="#5a564f"/><stop offset=".18" stop-color="#cfc9be"/><stop offset=".32" stop-color="#f6f2ea"/><stop offset=".5" stop-color="#9a958b"/><stop offset=".66" stop-color="#e4dfd5"/><stop offset=".85" stop-color="#6b675f"/><stop offset="1" stop-color="#34312d"/></linearGradient>
    <pattern id="${u}k" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="#000" opacity=".42"/><circle cx="4.5" cy="4.5" r="1.1" fill="#000" opacity=".42"/></pattern>
    <radialGradient id="${u}g"><stop offset="0" style="stop-color:var(--glow);stop-opacity:.6"/><stop offset=".5" style="stop-color:var(--glow);stop-opacity:.16"/><stop offset="1" style="stop-color:var(--glow);stop-opacity:0"/></radialGradient>
    <filter id="${u}f" x="-30%" y="-300%" width="160%" height="700%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${u}h" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <ellipse cx="200" cy="506" rx="150" ry="18" fill="#000" opacity=".6" filter="url(#${u}h)"/>
  <ellipse class="ground-glow" cx="200" cy="510" rx="215" ry="34" fill="url(#${u}g)"/>
  <path d="M95 150V490A105 28 0 0 0 305 490V150Z" fill="url(#${u}b)"/>
  <path d="M95 150V490A105 28 0 0 0 305 490V150Z" fill="url(#${u}k)"/>
  <path d="M95 150V490A105 28 0 0 0 305 490V150Z" fill="url(#${u}s)"/>
  <path d="M95 150V490A105 28 0 0 0 305 490V150Z" fill="url(#${u}v)"/>
  <path d="M93 454V490A107 29 0 0 0 307 490V454A107 29 0 0 1 93 454Z" fill="url(#${u}m)"/>
  <path d="M93 454V490A107 29 0 0 0 307 490V454A107 29 0 0 1 93 454Z" fill="url(#${u}s)" opacity=".45"/>
  <text x="200" y="400" text-anchor="middle" font-family="DM Mono, monospace" font-size="9" letter-spacing="6" fill="#fff" opacity=".26">HALO</text>
  <ellipse cx="200" cy="150" rx="105" ry="28" fill="url(#${u}m)"/>
  <ellipse cx="200" cy="150" rx="92" ry="23" fill="#0c0b0a"/>
  <ellipse class="bloom" cx="200" cy="150" rx="150" ry="52" fill="url(#${u}g)"/>
  <ellipse class="ring-blur" cx="200" cy="150" rx="76" ry="18.5" filter="url(#${u}f)"/>
  <ellipse class="ring" cx="200" cy="150" rx="76" ry="18.5"/>
  <ellipse cx="200" cy="150" rx="60" ry="14.5" fill="#161412"/>
  <ellipse cx="200" cy="150" rx="3" ry="1" fill="#fff" opacity=".35"/>
  <g class="pulses"><ellipse class="pulse" cx="200" cy="150" rx="76" ry="18.5"/><ellipse class="pulse" cx="200" cy="150" rx="76" ry="18.5"/><ellipse class="pulse" cx="200" cy="150" rx="76" ry="18.5"/></g>
</svg>`;
  $$('[data-speaker]').forEach((el, i) => { el.innerHTML = speakerSVG('sp' + i + '-'); });

  /* ---------- glow colour (for canvases) ---------- */
  let glow = [255, 179, 107];
  function parseColor(s) {
    s = (s || '').trim();
    let m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (m) return [+m[1], +m[2], +m[3]];
    m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      let h = m[1]; if (h.length === 3) h = h.split('').map(c => c + c).join('');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    return null;
  }
  function refreshGlow() {
    const c = parseColor(getComputedStyle(root).getPropertyValue('--glow'));
    if (c) glow = c;
  }
  refreshGlow();
  const rgba = a => `rgba(${glow[0]},${glow[1]},${glow[2]},${a})`;

  /* ---------- loader ---------- */
  const loader = $('#loader');
  let loaded = false;
  function finishLoad() {
    if (loaded) return; loaded = true;
    root.classList.remove('loading');
    document.body.classList.add('ready');
    if (loader) { loader.classList.add('out'); setTimeout(() => loader.remove(), 1500); }
  }
  root.classList.add('loading');
  (function runLoader() {
    const pct = $('#loader-pct'), ring = $('#loader-ring');
    const dur = reduce ? 200 : 1700, t0 = performance.now();
    (function tick() {
      const p = clamp((performance.now() - t0) / dur), e = easeOut(p);
      if (pct) pct.textContent = String(Math.round(e * 100)).padStart(2, '0');
      if (ring) ring.style.strokeDashoffset = String(1 - e);
      if (p < 1) requestAnimationFrame(tick);
      else {
        const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        Promise.race([fonts, new Promise(r => setTimeout(r, 1400))]).then(() => setTimeout(finishLoad, 120));
      }
    })();
  })();
  setTimeout(finishLoad, 6000);

  /* ---------- smooth scroll (optional) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    try { lenis = new Lenis({ lerp: .09, wheelMultiplier: .95 }); } catch (e) { lenis = null; }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    const t = $(id); if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { duration: 1.7, offset: id === '#features' || id === '#object' ? 0 : -10 });
    else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- text splitting ---------- */
  function splitWords(el, mask) {
    const words = []; let n = 0;
    const frag = document.createDocumentFragment();
    const walk = (node, target) => {
      node.childNodes.forEach(c => {
        if (c.nodeType === 3) {
          c.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { target.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            if (mask) {
              s.className = 'mw';
              const i = document.createElement('span'); i.textContent = tok; i.style.setProperty('--i', n++);
              s.appendChild(i);
            } else { s.className = 'w'; s.textContent = tok; }
            target.appendChild(s); words.push(s);
          });
        } else if (c.nodeType === 1) {
          if (c.tagName === 'BR') { target.appendChild(c.cloneNode()); return; }
          const k = c.cloneNode(false); target.appendChild(k); walk(c, k);
        }
      });
    };
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    walk(el, frag);
    el.textContent = ''; el.appendChild(frag);
    el.setAttribute('aria-label', label);
    return words;
  }
  $$('[data-words]').forEach(el => { splitWords(el, true); el.classList.add('rvw'); });
  const manifestoWords = splitWords($('#manifesto-text'), false);
  // words inside <em> are styled by CSS (.manifesto em .w)

  /* ---------- reveal on view ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.rv, .rvw, .spec-row').forEach(el => io.observe(el));

  /* ---------- counters ---------- */
  const counters = $$('[data-count]');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    const dur = reduce ? 1 : 1800, t0 = performance.now();
    (function step(now) {
      const p = clamp((now - t0) / dur), v = to * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p));
      el.textContent = v.toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }), { threshold: .6 });
  counters.forEach(c => cio.observe(c));

  /* ---------- theme / colourway ---------- */
  const THEMES = { dusk: 'Dusk', chalk: 'Chalk', fjord: 'Fjord', moss: 'Moss' };
  let theme = 'dusk', qty = 1;
  const PRICE = 690, DEP = 50;
  function setTheme(t) {
    theme = t; root.dataset.theme = t;
    $$('[data-theme-pick]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themePick === t)));
    ['colour-name', 'po-colour', 'sum-colour'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = THEMES[t]; });
    let k = 0; const iv = setInterval(() => { refreshGlow(); if (++k > 12) clearInterval(iv); }, 90);
  }
  $$('[data-theme-pick]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themePick)));
  function money(n) { return '€' + n.toLocaleString('en-GB'); }
  function setQty(n) {
    qty = clamp(n, 1, 4);
    $('#q-out').textContent = qty; $('#sum-qty').textContent = qty;
    $('#po-price').textContent = money(PRICE * qty); $('#sum-price').textContent = money(PRICE * qty);
    $('#sum-dep').textContent = money(DEP * qty); $('#sum-bal').textContent = money((PRICE - DEP) * qty);
  }
  $('#q-minus').addEventListener('click', () => setQty(qty - 1));
  $('#q-plus').addEventListener('click', () => setQty(qty + 1));
  $('#po-form').addEventListener('submit', e => {
    e.preventDefault();
    const em = $('#email'), msg = $('#po-msg');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) {
      em.classList.add('bad'); msg.textContent = 'Please enter a valid email address.'; em.focus(); return;
    }
    em.classList.remove('bad'); msg.textContent = '';
    $('#done-text').textContent = `${qty} × Halo in ${THEMES[theme]} is reserved. A confirmation will go to ${em.value.trim()} when pre-orders ship.`;
    $('#po-card').classList.add('sent');
  });
  $('#email').addEventListener('input', e => { e.target.classList.remove('bad'); $('#po-msg').textContent = ''; });

  /* ---------- motion toggle ---------- */
  const mt = $('#motion');
  mt.addEventListener('click', () => {
    paused = !paused; root.classList.toggle('paused', paused);
    mt.setAttribute('aria-pressed', String(paused));
    mt.setAttribute('aria-label', paused ? 'Resume ambient motion' : 'Pause ambient motion');
  });
  if (reduce) { paused = true; root.classList.add('paused'); mt.setAttribute('aria-pressed', 'true'); }

  /* ---------- canvas helper ---------- */
  function fitCanvas(c, ctxRef) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctxRef.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }
  function observeVisible(el, cb) {
    const o = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: '100px' });
    o.observe(el);
  }

  /* ---------- hero waves ---------- */
  const wc = $('#waves'), wx = wc.getContext('2d');
  let wW = 0, wH = 0, wcx = 0, wcy = 0, wVis = true;
  const bursts = [];
  const heroSpeaker = $('#hero-speaker');
  function sizeWaves() {
    ({ w: wW, h: wH } = fitCanvas(wc, wx));
    const hero = $('#hero');
    let ox = 0, oy = 0, n = heroSpeaker;   // layout position, ignoring transforms
    while (n && n !== hero) { ox += n.offsetLeft; oy += n.offsetTop; n = n.offsetParent; }
    wcx = ox + heroSpeaker.offsetWidth * .5;
    wcy = oy + heroSpeaker.offsetHeight * (150 / 600);
  }
  observeVisible($('#hero'), v => { wVis = v; });
  function drawWaves(t, scrollY) {
    wx.clearRect(0, 0, wW, wH);
    const maxR = Math.hypot(Math.max(wcx, wW - wcx), wH) * 1.05;
    const beat = .75 + .25 * Math.sin(t * .0015);
    const off = scrollY * -.06;
    wx.lineWidth = 1.2;
    const N = 11, period = 9000;
    for (let i = 0; i < N; i++) {
      const k = ((t / period) + i / N) % 1;
      const r = Math.pow(k, .85) * maxR;
      const a = Math.pow(1 - k, 1.7) * .5 * beat * Math.min(1, k * 12);
      if (a < .01) continue;
      wx.strokeStyle = rgba(a.toFixed(3));
      wx.beginPath(); wx.ellipse(wcx, wcy + off, r, r * .22, 0, 0, TAU); wx.stroke();
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const k = (t - bursts[i]) / 3200;
      if (k >= 1) { bursts.splice(i, 1); continue; }
      const r = easeOut(k) * maxR * .8;
      wx.strokeStyle = rgba(((1 - k) * .7).toFixed(3)); wx.lineWidth = 2;
      wx.beginPath(); wx.ellipse(wcx, wcy + off, r, r * .22, 0, 0, TAU); wx.stroke();
    }
  }
  $('#hero').addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    if (!paused) bursts.push(performance.now());
  });

  /* pre-order waves */
  const pc2 = $('#po-waves'), px2 = pc2.getContext('2d');
  let p2W = 0, p2H = 0, p2Vis = false;
  function sizePo() { ({ w: p2W, h: p2H } = fitCanvas(pc2, px2)); }
  observeVisible($('#preorder'), v => { p2Vis = v; });
  function drawPo(t) {
    px2.clearRect(0, 0, p2W, p2H);
    const cx = p2W / 2, cy = p2H * .322;
    const maxR = p2W * .5;
    px2.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const k = ((t / 8000) + i / 8) % 1, r = k * maxR;
      px2.strokeStyle = rgba((Math.pow(1 - k, 1.6) * .4).toFixed(3));
      px2.beginPath(); px2.ellipse(cx, cy, r, r * .22, 0, 0, TAU); px2.stroke();
    }
  }

  /* ---------- polar dispersion diagram ---------- */
  const polar = $('#polar'), pctx = polar.getContext('2d');
  let pW = 0, pH = 0, pVis = false, pm = 0, pTarget = 0, pAuto = true;
  function sizePolar() { ({ w: pW, h: pH } = fitCanvas(polar, pctx)); }
  function gainAt(th, m) {
    const c = Math.cos(th);
    const conv = .04 + .96 * Math.pow(Math.max(0, c), 6);
    const halo = .92 + .08 * Math.cos(6 * th);
    return lerp(conv, halo, m);
  }
  const covEl = $('#cov'), varEl = $('#var');
  let lastCov = '', lastVar = '';
  const btnConv = $('#pt-conv'), btnHalo = $('#pt-halo');
  function setPolar(v, manual) {
    pTarget = v; if (manual) pAuto = false;
    btnConv.setAttribute('aria-pressed', String(v === 0)); btnHalo.setAttribute('aria-pressed', String(v === 1));
  }
  btnConv.addEventListener('click', () => setPolar(0, true));
  btnHalo.addEventListener('click', () => setPolar(1, true));
  setPolar(0, false);
  observeVisible($('#polar-card'), v => {
    pVis = v;
    if (v && pAuto) setTimeout(() => { if (pAuto) setPolar(1, false); }, reduce ? 200 : 1600);
  });
  function drawPolar(t) {
    pm += (pTarget - pm) * .05;
    if (Math.abs(pTarget - pm) < .001) pm = pTarget;
    const w = pW, h = pH, cx = w / 2, cy = h / 2 + h * .02, R = Math.min(w, h) * .43;
    pctx.clearRect(0, 0, w, h);
    pctx.lineWidth = 1; pctx.strokeStyle = 'rgba(239,232,220,.09)';
    for (let i = 1; i <= 4; i++) { pctx.beginPath(); pctx.arc(cx, cy, R * i / 4, 0, TAU); pctx.stroke(); }
    for (let a = 0; a < 12; a++) {
      const th = a / 12 * TAU; pctx.beginPath();
      pctx.moveTo(cx, cy); pctx.lineTo(cx + Math.sin(th) * R, cy - Math.cos(th) * R); pctx.stroke();
    }
    // wavefronts
    const N = 7, M = 90;
    pctx.lineWidth = 1.8;
    for (let i = 0; i < N; i++) {
      const k = ((t * .00016) + i / N) % 1, r = k * R;
      for (let j = 0; j < M; j++) {
        const t0 = j / M * TAU, t1 = (j + 1) / M * TAU;
        const g = gainAt((t0 + t1) / 2, pm);
        const a = g * (1 - k) * .9 * Math.min(1, k * 10);
        if (a < .025) continue;
        pctx.strokeStyle = rgba(a.toFixed(3));
        pctx.beginPath(); pctx.arc(cx, cy, r, t0 - Math.PI / 2, t1 - Math.PI / 2 + .012); pctx.stroke();
      }
    }
    // pattern outline
    pctx.beginPath();
    for (let j = 0; j <= 180; j++) {
      const th = j / 180 * TAU, g = gainAt(th, pm), r = R * (.06 + .94 * g);
      const x = cx + Math.sin(th) * r, y = cy - Math.cos(th) * r;
      j ? pctx.lineTo(x, y) : pctx.moveTo(x, y);
    }
    pctx.closePath(); pctx.fillStyle = rgba(.07); pctx.fill();
    pctx.strokeStyle = rgba(.95); pctx.lineWidth = 2; pctx.stroke();
    // listeners
    for (let i = 0; i < 8; i++) {
      const th = (i + .5) / 8 * TAU, g = gainAt(th, pm), rr = R * .9;
      const x = cx + Math.sin(th) * rr, y = cy - Math.cos(th) * rr;
      const s = 4.5 + 4 * g;
      pctx.beginPath(); pctx.arc(x, y, s + 6 * g, 0, TAU); pctx.fillStyle = rgba((.18 * g).toFixed(3)); pctx.fill();
      pctx.beginPath(); pctx.arc(x, y, s, 0, TAU); pctx.fillStyle = `rgba(239,232,220,${(.15 + .85 * g).toFixed(3)})`; pctx.fill();
    }
    // speaker (top view)
    pctx.beginPath(); pctx.arc(cx, cy, R * .1, 0, TAU); pctx.fillStyle = '#0d0c0b'; pctx.fill();
    pctx.strokeStyle = rgba(1); pctx.lineWidth = 2; pctx.stroke();
    for (let i = 0; i < 6; i++) {
      const th = i / 6 * TAU; pctx.beginPath();
      pctx.arc(cx + Math.sin(th) * R * .065, cy - Math.cos(th) * R * .065, 1.6, 0, TAU);
      pctx.fillStyle = rgba(.9); pctx.fill();
    }
    // readouts
    const cov = Math.round(lerp(70, 360, pm)) + '°';
    const vr = '±' + lerp(11.8, 1.4, pm).toFixed(1) + ' dB';
    if (cov !== lastCov) { covEl.textContent = cov; lastCov = cov; }
    if (vr !== lastVar) { varEl.textContent = vr; lastVar = vr; }
  }

  /* ---------- frequency response ---------- */
  const fr = $('#fr');
  const FX0 = 50, FX1 = 970, FY0 = 140, DBS = 17;
  const fx = f => FX0 + (Math.log10(f / 20) / 3) * (FX1 - FX0);
  const fInv = x => 20 * Math.pow(10, ((x - FX0) / (FX1 - FX0)) * 3);
  const dbAt = (f, v = 0) =>
    -10 * Math.log10(1 + Math.pow(34 / f, 4)) - 10 * Math.log10(1 + Math.pow(f / 21000, 6))
    + 1.5 * Math.exp(-Math.pow(Math.log10(f / 3200) / .22, 2)) - .6 * Math.exp(-Math.pow(Math.log10(f / 700) / .18, 2))
    + .35 * Math.sin(Math.log10(f) * 9 + v);
  function curve(v, amp = 1) {
    let d = '';
    for (let i = 0; i <= 160; i++) {
      const f = 20 * Math.pow(1000, i / 160);
      const y = FY0 - dbAt(f, v) * DBS * amp;
      d += (i ? 'L' : 'M') + fx(f).toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  (function buildFr() {
    let g = '';
    [6, 3, 0, -3, -6, -9].forEach(db => {
      const y = FY0 - db * DBS;
      g += `<line class="grid" x1="${FX0}" x2="${FX1}" y1="${y}" y2="${y}" ${db === 0 ? 'stroke-opacity="1"' : 'stroke-opacity=".55"'}/><text x="${FX0 - 12}" y="${y + 4}" text-anchor="end">${db > 0 ? '+' : ''}${db}</text>`;
    });
    [[20, '20'], [50, '50'], [100, '100'], [200, '200'], [500, '500'], [1000, '1k'], [2000, '2k'], [5000, '5k'], [10000, '10k'], [20000, '20k']].forEach(([f, l]) => {
      g += `<line class="grid" x1="${fx(f)}" x2="${fx(f)}" y1="${FY0 - 6 * DBS}" y2="${FY0 + 9 * DBS}" stroke-opacity=".4"/><text x="${fx(f)}" y="${FY0 + 9 * DBS + 22}" text-anchor="middle">${l}${f === 20000 ? ' Hz' : ''}</text>`;
    });
    const main = curve(0);
    fr.innerHTML = `
      <defs><linearGradient id="frg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--glow);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--glow);stop-opacity:0"/></linearGradient></defs>
      ${g}
      <path class="area" id="fr-area" d="${main}L${fx(20000)} ${FY0 + 9 * DBS}L${fx(20)} ${FY0 + 9 * DBS}Z" fill="url(#frg)"/>
      <path class="alt" id="fr-a" pathLength="1" d="${curve(1.3, 1.25)}"/>
      <path class="alt" id="fr-b" pathLength="1" d="${curve(2.6, .8)}"/>
      <path class="main" id="fr-main" pathLength="1" d="${main}"/>
      <line class="cross" id="fr-cross" y1="${FY0 - 6 * DBS}" y2="${FY0 + 9 * DBS}"/><circle class="dot" id="fr-dot" r="5"/>`;
  })();
  const frMain = $('#fr-main'), frA = $('#fr-a'), frB = $('#fr-b'), frArea = $('#fr-area');
  const frCross = $('#fr-cross'), frDot = $('#fr-dot'), frRead = $('#fr-read');
  function frMove(e) {
    const r = fr.getBoundingClientRect();
    const x = clamp(((e.clientX - r.left) / r.width) * 1000, FX0, FX1);
    const f = fInv(x), db = dbAt(f);
    frCross.setAttribute('x1', x); frCross.setAttribute('x2', x); frCross.style.opacity = 1;
    frDot.setAttribute('cx', x); frDot.setAttribute('cy', FY0 - db * DBS); frDot.style.opacity = 1;
    frRead.textContent = (f >= 1000 ? (f / 1000).toFixed(2) + ' kHz' : Math.round(f) + ' Hz') + '  ' + (db >= 0 ? '+' : '') + db.toFixed(1) + ' dB';
  }
  fr.addEventListener('pointermove', frMove);
  fr.addEventListener('pointerleave', () => { frCross.style.opacity = 0; frDot.style.opacity = 0; frRead.textContent = 'Move over the curve'; });

  /* ---------- feature visuals: whisper bars ---------- */
  (function buildBars() {
    const g = $('#bars'); let s = '';
    for (let i = 0; i < 25; i++) {
      const x = 30 + i * 10.4, env = Math.sin((i / 24) * Math.PI);
      const h = 30 + env * 130;
      s += `<rect x="${x.toFixed(1)}" y="${(100 - h / 2).toFixed(1)}" width="5" height="${h.toFixed(1)}" rx="2.5" style="--t:${(0.9 + (i * 37 % 7) / 8).toFixed(2)}s;--dl:${(-(i * 53 % 11) / 10).toFixed(2)}s"/>`;
    }
    g.innerHTML = s;
  })();

  /* ---------- exploded object ---------- */
  const objSec = $('#object'), exSvg = $('#ex-svg');
  const LAYER = { ring: $('#ex-ring'), cap: $('#ex-cap'), sleeve: $('#ex-sleeve'), drivers: $('#ex-drivers'), base: $('#ex-base') };
  const OFF = { ring: -210, cap: -150, sleeve: -80, drivers: 30, base: 150 };
  const ACTIVE = [Object.keys(LAYER), ['ring', 'cap'], ['sleeve'], ['drivers'], ['base']];
  const steps = $$('.step'), ticks = $$('.ptick');
  let curStep = -1;
  function updateObject() {
    const r = objSec.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(-r.top / (r.height - vh));
    const e = ease(clamp(p / .28));
    for (const k in LAYER) LAYER[k].setAttribute('transform', `translate(0 ${(OFF[k] * e).toFixed(2)})`);
    exSvg.style.transform = `scale(${(1 - .07 * e).toFixed(3)}) translateY(${(e * 10).toFixed(1)}px)`;
    const idx = p < .3 ? 0 : 1 + Math.min(3, Math.floor((p - .3) / .175));
    if (idx !== curStep) {
      curStep = idx;
      steps.forEach((s, i) => s.classList.toggle('active', i === idx));
      ticks.forEach((t, i) => t.classList.toggle('on', i < idx));
      const act = ACTIVE[idx];
      for (const k in LAYER) LAYER[k].classList.toggle('dim', !act.includes(k));
    }
  }

  /* ---------- manifesto ---------- */
  const manSec = $('#manifesto'), mr1 = $('#mring1'), mr2 = $('#mring2');
  function updateManifesto() {
    const r = manSec.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(-r.top / (r.height - vh));
    const n = manifestoWords.length, q = clamp((p - .06) / .78) * (n + 4);
    for (let i = 0; i < n; i++) {
      const o = clamp((q - i) / 3);
      manifestoWords[i].style.opacity = (.14 + .86 * o).toFixed(3);
    }
    mr1.style.setProperty('--s', (.35 + p * .9).toFixed(3)); mr1.style.setProperty('--o', (Math.sin(p * Math.PI) * .9).toFixed(3));
    mr2.style.setProperty('--s', (.2 + p * 1.1).toFixed(3)); mr2.style.setProperty('--o', (Math.sin(p * Math.PI) * .9).toFixed(3));
  }

  /* ---------- horizontal features ---------- */
  const hSec = $('#features'), hStick = $('#h-sticky'), hTrack = $('#h-track'), hBar = $('#h-bar'), hCount = $('#h-count');
  const hCards = $$('.hcard', hTrack);
  let hOn = false, hTotal = 0;
  function sizeH() {
    hOn = innerWidth > 900;
    if (!hOn) { hSec.style.height = ''; hTrack.style.transform = ''; return; }
    hTotal = Math.max(0, hTrack.scrollWidth - innerWidth);
    hSec.style.height = (vh + hTotal) + 'px';
  }
  function updateH() {
    if (!hOn) return;
    const r = hSec.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    hTrack.style.transform = `translate3d(${(-p * hTotal).toFixed(1)}px,0,0)`;
    hBar.style.transform = `scaleX(${p.toFixed(4)})`;
    const idx = clamp(Math.round(p * (hCards.length - 2)) + 1, 1, hCards.length - 1);
    const label = String(idx).padStart(2, '0') + ' / 05';
    if (hCount.textContent !== label) hCount.textContent = label;
  }
  // mobile: update counter from native scroll
  hTrack.addEventListener('scroll', () => {
    if (hOn) return;
    const i = clamp(Math.round(hTrack.scrollLeft / (hCards[0].offsetWidth + 14)) + 1, 1, 5);
    hCount.textContent = String(i).padStart(2, '0') + ' / 05';
  }, { passive: true });

  /* ---------- hero parallax + nav + marquee ---------- */
  const heroTitle = $('#hero-title'), heroCopy = $('#hero-copy');
  const nav = $('#nav'), progress = $('#progress'), marquee = $('#marquee');
  let docH = 1, lastY = 0, mx = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  let marqueeX = 0, marqueeW = 1, vel = 0, mouseX = 0, mouseY = 0, sMouseX = 0, sMouseY = 0;
  function measure() {
    vw = innerWidth; vh = innerHeight;
    docH = Math.max(1, document.documentElement.scrollHeight - vh);
    marqueeW = marquee.scrollWidth / 2;
  }
  addEventListener('pointermove', e => { mouseX = e.clientX / vw - .5; mouseY = e.clientY / vh - .5; cx = e.clientX; cy = e.clientY; }, { passive: true });

  function updateHero(y) {
    if (y > vh * 1.3) return;
    const k = y / vh;
    if (innerWidth > 900) {
      heroTitle.style.transform = `translate3d(${(sMouseX * -18).toFixed(1)}px, ${(y * .32 + sMouseY * -10).toFixed(1)}px, 0)`;
      heroSpeaker.style.transform = ready() ? `translate3d(${(sMouseX * 14).toFixed(1)}px, ${(-y * .12 + sMouseY * 8).toFixed(1)}px, 0) rotate(${(sMouseX * 1.2).toFixed(2)}deg)` : '';
    } else {
      heroTitle.style.transform = `translate3d(0, ${(y * .2).toFixed(1)}px, 0)`;
    }
    heroCopy.style.opacity = innerWidth > 900 ? (1 - clamp(k * 1.6)).toFixed(3) : '';
  }
  const ready = () => document.body.classList.contains('ready');
  let speakerTransitionCleared = false;
  // remove the intro transition from speaker once settled so parallax stays crisp
  setTimeout(() => { speakerTransitionCleared = true; heroSpeaker.style.transition = 'none'; }, 5200);

  /* ---------- cursor ---------- */
  const cur = $('#cursor');
  let curX = 0, curY = 0;
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', () => cur.classList.add('on'), { once: true });
    document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('[data-cursor]')));
    document.addEventListener('mouseleave', () => cur.classList.remove('on'));
  }
  // card tilt / glow follow
  $$('[data-tilt]').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (x * 100) + '%'); c.style.setProperty('--my', (y * 100) + '%');
      c.style.setProperty('--a', Math.round(x * 140 + y * 60));
    });
  });
  $$('[data-glowcard]').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  // magnetic buttons
  $$('.btn').forEach(b => {
    if (!matchMedia('(pointer: fine)').matches || reduce) return;
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * .18).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * .28).toFixed(1)}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- main loop ---------- */
  let frameN = 0, tPaused = 0, tClock = 0, lastT = 0;
  function frame(now) {
    const y = window.scrollY || window.pageYOffset;
    vel = lerp(vel, y - lastY, .15); lastY = y;
    frameN++;
    if (!paused) tClock += now - (lastT || now);
    lastT = now;

    progress.style.transform = `scaleX(${clamp(y / docH).toFixed(4)})`;
    nav.classList.toggle('solid', y > 40);
    if (vel > 3 && y > 500) nav.classList.add('hide');
    else if (vel < -2 || y < 500) nav.classList.remove('hide');

    sMouseX = lerp(sMouseX, mouseX, .06); sMouseY = lerp(sMouseY, mouseY, .06);
    updateHero(y);
    updateManifesto();
    updateObject();
    updateH();

    // frequency curve drawing
    const frr = fr.getBoundingClientRect();
    if (frr.top < vh && frr.bottom > 0) {
      const p = clamp((vh * .88 - frr.top) / (vh * .5)), e = easeOut(p);
      frMain.style.strokeDashoffset = (1 - e).toFixed(4);
      frA.style.strokeDashoffset = (1 - clamp(e * 1.2 - .1)).toFixed(4);
      frB.style.strokeDashoffset = (1 - clamp(e * 1.2 - .2)).toFixed(4);
      frArea.style.opacity = (clamp((p - .5) / .5) * 1).toFixed(3);
    }

    // marquee: base drift + scroll velocity
    if (!paused) marqueeX -= .55 + Math.abs(vel) * .35;
    if (marqueeW > 1) { if (marqueeX <= -marqueeW) marqueeX += marqueeW; }
    marquee.style.transform = `translate3d(${marqueeX.toFixed(1)}px,0,0)`;

    if (frameN % 12 === 0) refreshGlow();

    if (wVis && !(paused && frameN % 2)) drawWaves(tClock, y);
    if (pVis) drawPolar(tClock);
    if (p2Vis) drawPo(tClock);

    // cursor
    curX = lerp(curX, cx, .2); curY = lerp(curY, cy, .2);
    cur.style.transform = `translate3d(${curX.toFixed(1)}px,${curY.toFixed(1)}px,0)`;
  }
  function raf(t) {
    if (lenis) lenis.raf(t);
    frame(t);
    requestAnimationFrame(raf);
  }

  function resize() {
    vw = innerWidth; vh = innerHeight;
    sizeWaves(); sizePo(); sizePolar(); sizeH(); measure();
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  addEventListener('load', () => { resize(); setTimeout(resize, 600); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  resize();
  setQty(1);
  requestAnimationFrame(raf);
})();
