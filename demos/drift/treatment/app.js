/* Drift — page scripts. Builds every chart from one night of hypnogram data, then motion-kit.js
 * (loaded after this file) wires reveals and scroll scenes over the finished DOM. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const unpinnedMQ = matchMedia('(max-width: 980px), (max-height: 640px), (prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmt = (min) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); };
  const el = (name, attrs = {}, parent) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ------------------------------------------------------------------
     One illustrative night, 22:00 to 06:30 (510 minutes).
     level: 0 Wake, 1 REM, 2 N1, 3 N2, 4 N3
     ------------------------------------------------------------------ */
  const NIGHT = 510;
  const HYP = [
    [0, 0], [24, 2], [32, 3], [52, 4], [98, 3], [108, 1], [122, 3], [135, 4], [175, 3], [190, 1], [205, 3],
    [225, 4], [250, 3], [262, 1], [285, 3], [300, 4], [315, 3], [330, 1], [365, 3], [385, 1], [420, 0], [424, 1],
    [430, 3], [450, 2], [460, 1], [492, 1], [498, 0], [510, 0]
  ];
  const CYCLES = [0, 122, 205, 285, 365, 430, 510];
  const STAGE_NAME = ['Awake', 'REM', 'N1 · drowsy', 'N2 · light', 'N3 · deep'];
  const LEVEL_LABEL = ['Wake', 'REM', 'N1', 'N2', 'N3'];
  const levelAt = (min, data = HYP) => { let l = data[0][1]; for (const [t, v] of data) { if (t <= min) l = v; else break; } return l; };
  const stepPath = (data, w, h, pt, pb, x0 = 0, upTo = Infinity) => {
    const end = data[data.length - 1][0];
    const x = (t) => x0 + (t / end) * w;
    const y = (l) => pt + (h - pt - pb) * (l / 4);
    let d = `M${x0.toFixed(1)} ${y(data[0][1]).toFixed(1)}`;
    for (let i = 1; i < data.length; i++) {
      const [t, l] = data[i];
      if (t > upTo) { d += `H${x(upTo).toFixed(1)}`; return d; }
      d += `H${x(t).toFixed(1)}V${y(l).toFixed(1)}`;
    }
    return d;
  };

  /* scroll progress (0..1) of the descent <-> minutes after 22:00 */
  const PK = [0, .25, .5, .75, 1], TK = [0, 120, 270, 390, 510];
  const piece = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 0; i < xs.length - 1; i++) if (x <= xs[i + 1]) return lerp(ys[i], ys[i + 1], (x - xs[i]) / (xs[i + 1] - xs[i]));
    return ys[ys.length - 1];
  };
  const timeAtP = (p) => piece(PK, TK, p);
  const pAtTime = (m) => piece(TK, PK, m);

  /* soundscape layers: rain, brown noise, low pad, breath pace */
  const KF = [
    [0, [.62, .20, .30, .72]], [.125, [.62, .20, .30, .72]], [.375, [.44, .36, .16, .22]],
    [.625, [.22, .58, .06, 0]], [.875, [.32, .28, .38, 0]], [1, [.46, .08, .78, 0]]
  ];
  const mixAtP = (p) => {
    for (let i = 0; i < KF.length - 1; i++) if (p <= KF[i + 1][0]) {
      const [a, A] = KF[i], [b, B] = KF[i + 1];
      const s = smooth(clamp((p - a) / (b - a)));
      return A.map((v, k) => lerp(v, B[k], s));
    }
    return KF[KF.length - 1][1];
  };
  const overall = (m) => Math.sqrt(m.reduce((s, v) => s + v * v, 0)) / 2;
  const dbText = (v) => (v < .015 ? 'off' : '−' + Math.abs(Math.round(20 * Math.log10(v) - 3)) + ' dB');

  /* ------------------------------------------------------------------
     Coast dividers: organic chart-coast edges between colour chapters
     ------------------------------------------------------------------ */
  function buildCoasts() {
    $$('[data-coast]').forEach((svg) => {
      const r = mulberry32(Number(svg.dataset.coast) * 7919);
      const W = 1440, H = 80, pts = [];
      let x = -60;
      while (x < W + 120) { pts.push([x, 12 + r() * 50]); x += 60 + r() * 120; }
      pts.push([x, 12 + r() * 50], [x + 120, 12 + r() * 50]);
      let d = `M${pts[0][0]} ${H}L${pts[0][0]} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      d += `L${pts[pts.length - 1][0]} ${H}Z`;
      $('path', svg).setAttribute('d', d);
    });
  }

  /* ------------------------------------------------------------------
     Living contour chart (marching squares over drifting noise)
     ------------------------------------------------------------------ */
  function makeNoise(seed) {
    const r = mulberry32(seed), perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const g = (h, x, y) => { switch (h & 7) { case 0: return x + y; case 1: return x - y; case 2: return -x + y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
    const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255, u = f(xf), v = f(yf);
      const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
      return lerp(lerp(g(aa, xf, yf), g(ba, xf - 1, yf), u), lerp(g(ab, xf, yf - 1), g(bb, xf - 1, yf - 1), u), v);
    };
  }

  function contours(canvas) {
    const ctx = canvas.getContext('2d');
    const nA = makeNoise(7), nB = makeNoise(19);
    const cell = innerWidth < 760 ? 20 : 16;
    const levels = []; for (let k = -6; k <= 6; k++) levels.push(k * .16);
    const rgb = getComputedStyle(canvas).getPropertyValue('--line-rgb').trim().split(/\s+/).join(',') || '28,78,150';
    const soundings = canvas.hasAttribute('data-soundings');
    let W = 0, H = 0, cols = 0, rows = 0, dpr = 1, F = null, spots = [], visible = false, running = false, raf = 0, last = 0, t0 = performance.now() / 1000;
    const field = (x, y, t) => nA(x / 340 + t * .03, y / 340 - t * .012) * .78 + nB(x / 150 - t * .02, y / 150 + t * .016) * .3 + (y / Math.max(H, 1) - .5) * .3;

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const stride = cols + 1;
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) F[j * stride + i] = field(i * cell, j * cell, t);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      levels.forEach((L, li) => {
        const index = li % 4 === 0;
        ctx.beginPath();
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const a = F[j * stride + i], b = F[j * stride + i + 1], c = F[(j + 1) * stride + i + 1], d = F[(j + 1) * stride + i];
          const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x0 = i * cell, y0 = j * cell;
          const T = [x0 + cell * (L - a) / (b - a), y0], R = [x0 + cell, y0 + cell * (L - b) / (c - b)];
          const B = [x0 + cell * (L - d) / (c - d), y0 + cell], Lf = [x0, y0 + cell * (L - a) / (d - a)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (idx) {
            case 1: case 14: seg(Lf, B); break;
            case 2: case 13: seg(B, R); break;
            case 3: case 12: seg(Lf, R); break;
            case 4: case 11: seg(T, R); break;
            case 6: case 9: seg(T, B); break;
            case 7: case 8: seg(T, Lf); break;
            case 5: { const m = (a + b + c + d) / 4 > L; if (m) { seg(T, Lf); seg(B, R); } else { seg(T, R); seg(Lf, B); } break; }
            case 10: { const m = (a + b + c + d) / 4 > L; if (m) { seg(T, R); seg(Lf, B); } else { seg(T, Lf); seg(B, R); } break; }
          }
        }
        ctx.strokeStyle = `rgba(${rgb},${index ? .55 : .26})`;
        ctx.lineWidth = index ? 1.5 : 1;
        ctx.stroke();
      });
      if (soundings) {
        ctx.font = 'italic 400 13px Newsreader, Georgia, serif';
        ctx.fillStyle = `rgba(${rgb},.75)`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const [sx, sy] of spots) ctx.fillText(String(Math.max(1, Math.round((field(sx, sy, t) + 1.2) * 22))), sx, sy);
      }
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cols = Math.ceil(W / cell); rows = Math.ceil(H / cell); F = new Float32Array((cols + 1) * (rows + 1));
      spots = [];
      if (soundings) {
        const cr = canvas.getBoundingClientRect();
        const avoid = $$('.hero-meta, .lede, .hero-cta, .bulletin, .note-end, .ruler').map((n) => n.getBoundingClientRect()).map((b) => [b.left - cr.left - 24, b.top - cr.top - 18, b.right - cr.left + 24, b.bottom - cr.top + 18]);
        avoid.push([-10, -10, W + 10, 88]);
        const rr = mulberry32(5);
        for (let y = 90; y < H; y += 150) for (let x = 60; x < W; x += 190) {
          const sx = x + (rr() - .5) * 90, sy = y + (rr() - .5) * 60;
          if (!avoid.some((a) => sx > a[0] && sx < a[2] && sy > a[1] && sy < a[3])) spots.push([sx, sy]);
        }
      }
      draw(reduce.matches ? 0 : performance.now() / 1000 - t0);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return;
      last = now; draw(now / 1000 - t0);
    }
    function sync() {
      const should = visible && !document.hidden && !reduce.matches;
      if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }).observe(canvas);
    document.addEventListener('visibilitychange', sync);
    new ResizeObserver(resize).observe(canvas);
    resize();
  }

  /* ------------------------------------------------------------------
     Hero: the hypnogram trace drawn through the headline
     ------------------------------------------------------------------ */
  function heroTrace() {
    const box = $('.hero-chart'), svg = $('#heroTrace'), vessel = $('.vessel');
    const ghost = $('.trace-ghost', svg), live = $('.trace-live', svg);
    const st = { e: reduce.matches ? 1 : 0, L: 0 };
    function apply() {
      if (!st.L) return;
      live.style.strokeDasharray = `${st.L} ${st.L}`;
      live.style.strokeDashoffset = String(st.L * (1 - st.e));
      if (st.e > 0) {
        const pt = live.getPointAtLength(st.L * st.e);
        vessel.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
        vessel.classList.add('is-on');
      }
    }
    function build() {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      $$('.guide', svg).forEach((n) => n.remove());
      const pt = h * .04, pb = h * .04;
      for (let l = 0; l <= 4; l++) { const y = pt + (h - pt - pb) * l / 4; svg.insertBefore(el('path', { class: 'guide', d: `M0 ${y.toFixed(1)}H${w}` }), ghost); }
      const d = stepPath(HYP, w, h, pt, pb);
      ghost.setAttribute('d', d); live.setAttribute('d', d);
      st.L = live.getTotalLength();
      apply();
    }
    build();
    new ResizeObserver(build).observe(box);
    let started = false;
    function play() {
      if (started) return; started = true;
      if (reduce.matches) { st.e = 1; apply(); return; }
      const t0 = performance.now() + 380, dur = 1750;
      const tick = (now) => {
        const t = clamp((now - t0) / dur);
        st.e = easeInOut(t); apply();
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    const fontsReady = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]) : Promise.resolve();
    fontsReady.then(() => { build(); play(); });
  }

  /* ------------------------------------------------------------------
     Navigation menu
     ------------------------------------------------------------------ */
  function nav() {
    const btn = $('.nav-toggle'), menu = $('#menu');
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
      if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
      document.documentElement.style.overflow = open ? 'hidden' : '';
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    matchMedia('(min-width: 981px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* ------------------------------------------------------------------
     How it works: the descent console
     ------------------------------------------------------------------ */
  function descent() {
    const section = $('#how'), svg = $('#consoleHypno');
    const steps = $$('.step', section), chips = $$('.chips', section), notes = $$('.note', section);
    const bars = $$('[data-mix]', section), dbs = $$('[data-db]', section);
    const clockEl = $('#consoleClock'), chipEl = $('#stageChip'), rail = $('.steps', section);
    const g = { W: 0, H: 0, ML: 34, MR: 6, MT: 8, MB: 22 };
    let clipRect, headLine, headDot, liveSeg;
    let p = 0, shownP = -1, stageIdx = -1, manualP = .375, tween = 0;

    function build() {
      g.W = svg.clientWidth; g.H = svg.clientHeight;
      if (!g.W) return;
      svg.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`);
      svg.textContent = '';
      const pw = g.W - g.ML - g.MR, ph = g.H - g.MT - g.MB;
      const y = (l) => g.MT + ph * l / 4;
      for (let l = 0; l <= 4; l++) {
        el('path', { class: 'grid', d: `M${g.ML} ${y(l)}H${g.W - g.MR}` }, svg);
        const t = el('text', { x: 0, y: y(l) + 3.5 }, svg); t.textContent = LEVEL_LABEL[l];
      }
      [0, 120, 240, 360, 480].forEach((m) => { const t = el('text', { x: g.ML + pw * m / NIGHT, y: g.H - 4, 'text-anchor': m === 0 ? 'start' : 'middle' }, svg); t.textContent = pad2(((22 * 60 + m) / 60) % 24); });
      const d = stepPath(HYP, pw, g.H, g.MT, g.MB, g.ML);
      el('path', { class: 'ghost', d }, svg);
      const defs = el('defs', {}, svg);
      const cp = el('clipPath', { id: 'consoleClip' }, defs);
      clipRect = el('rect', { x: 0, y: 0, width: 0, height: g.H }, cp);
      liveSeg = el('path', { class: 'live', d, 'clip-path': 'url(#consoleClip)' }, svg);
      headLine = el('path', { class: 'head-line', d: `M0 ${g.MT}V${g.H - g.MB}` }, svg);
      headDot = el('circle', { class: 'head-dot', r: 5.5, cx: 0, cy: 0 }, svg);
      shownP = -1; render(p, true);
    }

    function render(pp, force) {
      if (!g.W || (!force && Math.abs(pp - shownP) < .0004)) return;
      shownP = pp;
      const min = timeAtP(pp), pw = g.W - g.ML - g.MR, x = g.ML + pw * min / NIGHT;
      const ph = g.H - g.MT - g.MB, lvl = levelAt(min);
      clipRect.setAttribute('width', x.toFixed(1));
      headLine.setAttribute('d', `M${x.toFixed(1)} ${g.MT}V${g.H - g.MB}`);
      headDot.setAttribute('cx', x.toFixed(1)); headDot.setAttribute('cy', (g.MT + ph * lvl / 4).toFixed(1));
      const label = fmt(22 * 60 + min);
      if (clockEl.textContent !== label) clockEl.textContent = label;
      const name = STAGE_NAME[lvl];
      if (chipEl.textContent !== name) chipEl.textContent = name;
      const m = mixAtP(pp);
      m.forEach((v, i) => { bars[i].style.setProperty('--v', v.toFixed(3)); const t = dbText(v); if (dbs[i].textContent !== t) dbs[i].textContent = t; });
      rail.style.setProperty('--rail', String(clamp((pp - .02) / .86).toFixed(3)));
      const idx = Math.min(3, Math.floor(pp * 4));
      steps.forEach((s, i) => s.classList.toggle('is-reached', pp >= i * .25 + .005));
      if (idx !== stageIdx) {
        stageIdx = idx;
        steps.forEach((s, i) => { s.classList.toggle('is-active', i === idx); const b = $('button', s); if (i === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
        chips.forEach((c, i) => c.classList.toggle('is-on', i === idx));
        notes.forEach((n, i) => n.classList.toggle('is-on', i === idx));
      }
    }

    const currentP = () => {
      if (unpinnedMQ.matches) return manualP;
      const r = section.getBoundingClientRect(), total = r.height - innerHeight;
      return total > 0 ? clamp(-r.top / total) : 0;
    };
    let queued = false;
    const onScroll = () => {
      if (queued || unpinnedMQ.matches) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; p = currentP(); render(p); });
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { build(); p = currentP(); render(p, true); });
    unpinnedMQ.addEventListener('change', () => { p = currentP(); render(p, true); });

    function glideTo(target) {
      cancelAnimationFrame(tween);
      const from = p, t0 = performance.now(), dur = reduce.matches ? 1 : 900;
      const tick = (now) => {
        const t = clamp((now - t0) / dur);
        p = lerp(from, target, easeOut(t)); manualP = p; render(p);
        if (t < 1) tween = requestAnimationFrame(tick);
      };
      tween = requestAnimationFrame(tick);
    }
    steps.forEach((s, i) => $('button', s).addEventListener('click', () => {
      const target = i * .25 + .125;
      if (unpinnedMQ.matches) { glideTo(target); return; }
      const r = section.getBoundingClientRect(), total = r.height - innerHeight;
      scrollTo({ top: scrollY + r.top + target * total, behavior: 'smooth' });
    }));

    manualP = .375;
    p = currentP();
    build();
    new ResizeObserver(() => { const w = svg.clientWidth; if (w && Math.abs(w - g.W) > 1) build(); }).observe(svg);
  }

  /* ------------------------------------------------------------------
     Science: architecture of a night
     ------------------------------------------------------------------ */
  function arch() {
    const fig = $('.arch'), svg = $('#archSvg');
    let drawn = false, revealed = false;
    function build() {
      const W = svg.clientWidth;
      if (!W) return;
      const small = W < 640;
      const ML = small ? 30 : 46, MR = 4, MT = 28, hypH = small ? 150 : 210, gap = small ? 30 : 38, mixH = small ? 54 : 70, axis = 24;
      const H = MT + hypH + gap + mixH + axis, pw = W - ML - MR;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      svg.textContent = '';
      const x = (t) => ML + pw * t / NIGHT, y = (l) => MT + 8 + (hypH - 16) * l / 4;
      for (let c = 0; c < 6; c++) {
        if (c % 2 === 0) el('rect', { class: 'band', x: x(CYCLES[c]), y: MT - 8, width: x(CYCLES[c + 1]) - x(CYCLES[c]), height: hypH + 8 + gap + mixH }, svg);
        const t = el('text', { x: (x(CYCLES[c]) + x(CYCLES[c + 1])) / 2, y: 12, 'text-anchor': 'middle' }, svg);
        t.textContent = small ? String(c + 1) : 'Cycle ' + (c + 1);
      }
      for (let l = 0; l <= 4; l++) {
        el('path', { class: 'grid', d: `M${ML} ${y(l)}H${W - MR}` }, svg);
        const t = el('text', { x: 0, y: y(l) + 3.5 }, svg); t.textContent = LEVEL_LABEL[l];
      }
      CYCLES.slice(1, -1).forEach((c) => el('path', { class: 'cut', d: `M${x(c)} ${MT - 8}V${MT + hypH + gap + mixH}` }, svg));
      let d = `M${ML} ${y(HYP[0][1]).toFixed(1)}`;
      for (let i = 1; i < HYP.length; i++) d += `H${x(HYP[i][0]).toFixed(1)}V${y(HYP[i][1]).toFixed(1)}`;
      const base = el('path', { class: 'base', d }, svg);
      const hl = [];
      for (let i = 0; i < HYP.length - 1; i++) {
        const [t, l] = HYP[i], t2 = HYP[i + 1][0];
        if (l === 4) hl.push(el('path', { class: 'hl-deep', d: `M${x(t) + 4} ${y(4)}H${x(t2) - 4}` }, svg));
        if (l === 1) hl.push(el('path', { class: 'hl-rem', d: `M${x(t) + 4} ${y(1)}H${x(t2) - 4}` }, svg));
      }
      if (!small) {
        const a1 = el('text', { class: 't-chart', x: x(336), y: y(4) + 5 }, svg); a1.textContent = 'Deep sleep thins out as the night goes on';
        const a2 = el('text', { class: 't-chart', x: x(214), y: y(0) + 5 }, svg); a2.textContent = 'REM stretches toward morning';
        hl.push(a1, a2);
      }
      const mTop = MT + hypH + gap, mBot = mTop + mixH;
      const lab = el('text', { x: 0, y: mTop + 10 }, svg); lab.textContent = 'MIX';
      const pts = [];
      for (let m = 0; m <= NIGHT; m += 3) { const v = overall(mixAtP(pAtTime(m))); pts.push([x(m), mBot - 4 - (mixH - 8) * clamp(v / .55)]); }
      const line = 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L');
      const fill = el('path', { class: 'mix-fill', d: `${line}L${x(NIGHT)} ${mBot}L${x(0)} ${mBot}Z` }, svg);
      const mix = el('path', { class: 'mix', d: line }, svg);
      if (!small) {
        const a3 = el('text', { class: 't-chart', x: x(150), y: mTop + 14 }, svg); a3.textContent = 'thins into deep sleep';
        const a4 = el('text', { class: 't-chart', x: x(428), y: mTop + 14 }, svg); a4.textContent = 'opens before waking';
        hl.push(a3, a4);
      }
      [0, 120, 240, 360, 480].forEach((m) => { const t = el('text', { x: x(m), y: H - 4, 'text-anchor': m === 0 ? 'start' : 'middle' }, svg); t.textContent = pad2(((22 * 60 + m) / 60) % 24) + ':00'; });
      const L = base.getTotalLength(), L2 = mix.getTotalLength();
      if (!drawn && !reduce.matches) {
        base.style.strokeDasharray = `${L} ${L}`; base.style.strokeDashoffset = L;
        mix.style.strokeDasharray = `${L2} ${L2}`; mix.style.strokeDashoffset = L2;
        [...hl, fill].forEach((n) => { n.style.opacity = 0; });
        svg._play = () => {
          base.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.65,0,.35,1)'; base.style.strokeDashoffset = 0;
          hl.forEach((n, i) => { n.style.transition = `opacity 600ms linear ${500 + i * 60}ms`; n.style.opacity = 1; });
          mix.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.65,0,.35,1) .4s'; mix.style.strokeDashoffset = 0;
          fill.style.transition = 'opacity 700ms linear 1.0s'; fill.style.opacity = 1;
          drawn = true;
        };
        if (revealed) svg._play();
      } else drawn = true;
    }
    build();
    new ResizeObserver(() => { const w = svg.clientWidth; if (w && Math.abs(w - (svg._w || 0)) > 1) { svg._w = w; build(); } }).observe(svg);
    new IntersectionObserver((entries, io) => { if (entries[0].isIntersecting) { revealed = true; if (svg._play) svg._play(); io.disconnect(); } }, { threshold: .3 }).observe(fig);
  }

  /* ------------------------------------------------------------------
     Small charts: sparklines, phone hypnograms, waveforms, tab bars
     ------------------------------------------------------------------ */
  function variant(seed) {
    const r = mulberry32(seed * 977 + 3), out = HYP.map(([t, l]) => [t, l]);
    for (let i = 1; i < out.length - 1; i++) out[i][0] = Math.max(1, out[i][0] + (r() - .5) * 26);
    for (let i = 1; i < out.length; i++) if (out[i][0] <= out[i - 1][0]) out[i][0] = out[i - 1][0] + 1;
    out.forEach((s, i) => { if (s[1] === 4 && r() < .25) s[1] = 3; if (i > 4 && i < out.length - 3 && s[1] === 3 && r() < .1) s[1] = 2; });
    return out;
  }
  function sparks() {
    $$('[data-spark]').forEach((svg) => {
      const w = 160, h = 40, data = variant(Number(svg.dataset.spark));
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
      svg.textContent = '';
      el('path', { d: stepPath(data, w - 6, h, 4, 4, 0) }, svg);
      const last = data[data.length - 1];
      el('circle', { cx: w - 6, cy: 4 + (h - 8) * last[1] / 4, r: 4.5 }, svg);
    });
  }
  function minis() {
    $$('[data-mini]').forEach((svg) => {
      const build = () => {
        const w = svg.clientWidth, h = svg.clientHeight;
        if (!w) return;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.textContent = '';
        const full = svg.dataset.mini === 'full';
        el('path', { d: stepPath(HYP, w, h, 3, 3), stroke: full ? '#FF7DB1' : 'rgba(255,255,255,.3)', 'stroke-width': full ? 2 : 1.4 }, svg);
        if (!full) {
          el('path', { d: stepPath(HYP, w, h, 3, 3, 0, 271), stroke: '#FF7DB1', 'stroke-width': 2.2 }, svg);
          el('circle', { cx: (271 / NIGHT * w).toFixed(1), cy: (3 + (h - 6) * 4 / 4).toFixed(1), r: 4, fill: '#FF7DB1', stroke: '#0D1D4A', 'stroke-width': 2 }, svg);
        }
      };
      build(); new ResizeObserver(build).observe(svg);
    });
    $$('[data-wave]').forEach((svg) => {
      const r = mulberry32(Number(svg.dataset.wave) * 131), f1 = 2 + r() * 5, f2 = 6 + r() * 9, ph = r() * 6, tilt = r();
      svg.setAttribute('viewBox', '0 0 100 30'); svg.setAttribute('preserveAspectRatio', 'none');
      let d = '';
      for (let i = 0; i <= 100; i += 1.25) {
        const env = .35 + .65 * Math.abs(Math.sin(i / 100 * Math.PI * (1 + tilt)));
        const v = 15 + 12 * env * (Math.sin(i / 100 * f1 * 6.283 + ph) * .6 + Math.sin(i / 100 * f2 * 6.283) * .4);
        d += (i === 0 ? 'M' : 'L') + i.toFixed(1) + ' ' + v.toFixed(2);
      }
      const path = el('path', { d }, svg); path.setAttribute('vector-effect', 'non-scaling-stroke');
    });
    const icons = [
      ['Tonight', '<path d="M5 14v-4M9.5 18V6M14 16V8M18.5 13v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'],
      ['Routine', '<path d="M7 7h12M7 12h12M7 17h8M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'],
      ['Library', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>'],
      ['Coach', '<path d="M5 6.5A2.5 2.5 0 0 1 7.500 4h9A2.500 2.500 0 0 1 19 6.500v7a2.500 2.500 0 0 1-2.500 2.500H11l-4 3.500V16H7.500A2.500 2.500 0 0 1 5 13.500z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>']
    ];
    $$('.tabbar').forEach((bar) => {
      const active = Number(bar.dataset.active || 0);
      bar.innerHTML = icons.map(([name, svg], i) => `<span class="tb${i === active ? ' on' : ''}"><svg viewBox="0 0 24 24">${svg}</svg>${name}</span>`).join('');
    });
  }

  /* ------------------------------------------------------------------
     Plans: billing toggle with rolling prices
     ------------------------------------------------------------------ */
  function plans() {
    const seg = $('.seg'), ink = $('.seg-ink'), btns = $$('button', seg);
    const per = { a: { drift: 'a month, billed $59.99 a year', deep: 'a month, billed $99.99 a year' }, m: { drift: 'a month, billed monthly', deep: 'a month, billed monthly' } };
    let mode = 'a';
    const place = () => {
      const b = btns.find((x) => x.getAttribute('aria-pressed') === 'true');
      ink.style.setProperty('--x', (b.offsetLeft - 4) + 'px'); ink.style.setProperty('--sx', (b.offsetWidth / 100).toFixed(3));
    };
    const roll = (node, to) => {
      const from = parseFloat(node.textContent.replace(/[^0-9.]/g, '')) || 0, t0 = performance.now(), dur = reduce.matches ? 1 : 600;
      const tick = (now) => {
        const t = clamp((now - t0) / dur), v = lerp(from, to, easeOut(t));
        node.textContent = '$' + v.toFixed(2);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.bill;
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      place();
      $$('.amt[data-m]').forEach((a, i) => {
        roll(a, parseFloat(mode === 'a' ? a.dataset.a : a.dataset.m));
        const small = a.parentElement.querySelector('.per');
        if (small) small.textContent = per[mode][i === 0 ? 'drift' : 'deep'];
      });
    }));
    place();
    addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  /* ------------------------------------------------------------------
     Download: bedtime calculator
     ------------------------------------------------------------------ */
  function calculator() {
    const wake = $('#wake'), out = $('#wakeOut'), opts = $$('#calcOpts li');
    const update = () => {
      const w = Number(wake.value);
      out.textContent = fmt(w);
      wake.style.setProperty('--fill', ((w - 300) / 300 * 100).toFixed(1) + '%');
      opts.forEach((li) => {
        const c = Number(li.dataset.cycles);
        $('.co-time', li).textContent = fmt(w - c * 90 - 15);
        $$('.cyc i', li).forEach((n, i) => { n.style.setProperty('--k', i); n.classList.toggle('on', i < c); });
      });
    };
    wake.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  function start() {
    buildCoasts();
    nav();
    sparks();
    minis();
    descent();
    arch();
    plans();
    calculator();
    heroTrace();
    $$('canvas[data-contours]').forEach(contours);
    requestAnimationFrame(() => requestAnimationFrame(() => $('.hero').classList.add('is-ready')));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
