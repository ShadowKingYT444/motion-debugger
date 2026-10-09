(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);

  const state = { on: !reduce.matches };
  const motionBtn = $('#motionToggle');
  function setMotion(on) {
    state.on = on;
    root.dataset.motion = on ? 'on' : 'off';
    motionBtn.setAttribute('aria-pressed', String(!on));
    const label = on ? 'Pause animations' : 'Play animations';
    motionBtn.setAttribute('aria-label', label);
    motionBtn.title = label;
    if (on) requestFrame();
  }
  motionBtn.addEventListener('click', () => setMotion(!state.on));
  reduce.addEventListener?.('change', e => setMotion(!e.matches));

  /* ---------- nav ---------- */
  const nav = $('#nav'), burger = $('#burger'), bar = $('#progressBar');
  let lastY = 0;
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    nav.classList.toggle('scrolled', y > 40);
    if (!nav.classList.contains('open')) nav.classList.toggle('hide', y > 300 && y > lastY + 4 ? true : (y < lastY - 4 ? false : nav.classList.contains('hide')));
    lastY = y;
    heroVisual.style.transform = y < innerHeight * 1.2 ? `translate3d(0,${(y * 0.1).toFixed(1)}px,0)` : '';
    updateQBar();
  }
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }));

  /* ---------- reveal ---------- */
  $$('.bento,.plan-grid,.sci-points,.quotes,.faq-list').forEach(g => {
    $$(':scope > .reveal', g).forEach((el, i) => el.style.setProperty('--rd', (i * 0.09).toFixed(2) + 's'));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* ---------- canvas: aurora sky + stars ---------- */
  const sky = $('#sky'), stars = $('#stars');
  const heroVisual = $('#heroVisual');
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const dpr = () => Math.min(devicePixelRatio || 1, 2);
  function sizeCanvas(c) {
    const r = c.getBoundingClientRect(), d = dpr();
    c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
    c._w = r.width; c._h = r.height; c._d = d;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mkStars = n => Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: rnd(.4, 1.5), p: rnd(0, 6.28), s: rnd(.4, 1.6), warm: Math.random() < .2 }));
  const skyStars = mkStars(170), dlStars = mkStars(130);
  const ribbons = [
    { y: .34, a: .07, f: 1.0, s: .22, ph: 0, th: .34, c: [125, 116, 255], al: .22 },
    { y: .44, a: .06, f: 1.4, s: -.17, ph: 2, th: .30, c: [90, 140, 255], al: .16 },
    { y: .56, a: .08, f: .8, s: .13, ph: 4, th: .36, c: [190, 120, 255], al: .15 },
    { y: .68, a: .05, f: 1.7, s: -.24, ph: 1, th: .24, c: [255, 190, 150], al: .09 }
  ];
  const vis = { sky: true, stars: false };
  function drawStars(c, list, t, drift) {
    const g = c.getContext('2d'), d = c._d;
    g.setTransform(d, 0, 0, d, 0, 0);
    if (c === stars) g.clearRect(0, 0, c._w, c._h);
    for (const s of list) {
      const a = .35 + .65 * (.5 + .5 * Math.sin(t * s.s + s.p));
      g.fillStyle = s.warm ? `rgba(255,214,170,${a})` : `rgba(215,220,255,${a})`;
      const x = ((s.x * c._w + (drift ? t * 4 * s.r : 0)) % c._w + c._w) % c._w;
      g.beginPath(); g.arc(x, s.y * c._h, s.r, 0, 6.283); g.fill();
    }
  }
  function drawSky(t) {
    const g = sky.getContext('2d'), w = sky._w, h = sky._h, d = sky._d;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, w, h);
    drawStars(sky, skyStars, t, true);
    g.globalCompositeOperation = 'lighter';
    ribbons.forEach((r, i) => {
      const grad = g.createLinearGradient(0, h * (r.y - r.th / 2), 0, h * (r.y + r.th / 2));
      const [R, G, B] = r.c;
      grad.addColorStop(0, `rgba(${R},${G},${B},0)`);
      grad.addColorStop(.5, `rgba(${R},${G},${B},${r.al})`);
      grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
      const px = mouse.x * (14 + i * 8), py = mouse.y * (8 + i * 5);
      const yAt = (x, off) => h * r.y + off + py + Math.sin(x * .0035 * r.f + t * r.s + r.ph) * h * r.a + Math.sin(x * .009 * r.f - t * r.s * 1.6 + r.ph) * h * r.a * .35;
      g.beginPath();
      const th = h * r.th / 2;
      for (let x = -10; x <= w + 10; x += 10) { const y = yAt(x + px, -th); x === -10 ? g.moveTo(x, y) : g.lineTo(x, y); }
      for (let x = w + 10; x >= -10; x -= 10) g.lineTo(x, yAt(x + px, th));
      g.closePath(); g.fillStyle = grad; g.fill();
    });
    g.globalCompositeOperation = 'source-over';
  }

  let T = 0, last = 0, raf = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (state.on) T += dt;
    mouse.x = lerp(mouse.x, mouse.tx, .06); mouse.y = lerp(mouse.y, mouse.ty, .06);
    if (vis.sky) drawSky(T);
    if (vis.stars) drawStars(stars, dlStars, T, true);
    if (vis.sky) {
      phoneWrap.style.translate = `${(-mouse.x * 16).toFixed(2)}px ${(-mouse.y * 12).toFixed(2)}px`;
      heroVisual.style.setProperty('--px', mouse.x.toFixed(3));
      heroVisual.style.setProperty('--py', mouse.y.toFixed(3));
    }
    if (state.on && (vis.sky || vis.stars)) requestFrame();
    else if (Math.abs(mouse.x - mouse.tx) + Math.abs(mouse.y - mouse.ty) > .002 && state.on) requestFrame();
  }
  function requestFrame() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  const phoneWrap = $('#phoneWrap');
  function resize() { sizeCanvas(sky); sizeCanvas(stars); drawSky(T); drawStars(stars, dlStars, T, true); onScroll(); layoutPill(); }
  addEventListener('resize', resize);
  $('#top').addEventListener('pointermove', e => {
    if (!fine.matches) return;
    mouse.tx = (e.clientX / innerWidth - .5) * 2; mouse.ty = (e.clientY / innerHeight - .5) * 2;
    if (!state.on) { /* static when paused */ }
  });
  $('#top').addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => { vis.sky = e.isIntersecting; if (e.isIntersecting) requestFrame(); }), { rootMargin: '100px' }).observe($('#top'));
    new IntersectionObserver(es => es.forEach(e => { vis.stars = e.isIntersecting; if (e.isIntersecting) requestFrame(); }), { rootMargin: '100px' }).observe($('.download'));
  }
  // moon follows pointer through CSS vars
  const moon = $('.moon');
  const moonStyle = document.createElement('style');
  moonStyle.textContent = '.moon{margin:calc(var(--py,0)*-22px) calc(var(--px,0)*26px) 0 0}';
  document.head.appendChild(moonStyle);

  /* ---------- phone cycle ---------- */
  const scenes = [
    { t: '11:42 PM', st: 'Winding down', sc: 'Rain on cedar', v: 70, p: .06, n: 'Heart rate is settling. Softening the rain over the next 12 minutes.' },
    { t: '12:31 AM', st: 'Light sleep', sc: 'Slow ocean', v: 54, p: .3, n: 'Sleep onset detected. Fading the melody out, keeping the swell.' },
    { t: '2:47 AM', st: 'Deep sleep', sc: 'Brown noise', v: 38, p: .52, n: 'Room noise rose 6 dB. Widening the masking band to cover it.' },
    { t: '5:10 AM', st: 'REM', sc: 'Wind in pines', v: 30, p: .78, n: 'Dreaming stage. Holding sound low and even, preparing sunrise.' },
    { t: '6:42 AM', st: 'Waking', sc: 'Sunrise chimes', v: 24, p: 1, n: 'Lightest sleep found. Easing you up with light and soft chimes.' }
  ];
  const ps = { time: $('#psTime'), stage: $('#psStage'), scene: $('#psScene'), vol: $('#psVol'), note: $('#psNote'), line: $('#psLine'), dot: $('#psDot'), bars: $('#psBars') };
  const psPath = $('.ps-base');
  $$('i', ps.bars).forEach((b, i) => b.style.setProperty('--k', i));
  let si = -1;
  function showScene(i, instant) {
    const s = scenes[i];
    const swap = () => {
      ps.time.textContent = s.t; ps.stage.textContent = s.st; ps.scene.textContent = s.sc; ps.vol.textContent = s.v + '%'; ps.note.textContent = s.n;
      ps.bars.style.setProperty('--amp', (s.v / 100).toFixed(2));
      [ps.stage, ps.scene, ps.note].forEach(el => el.classList.remove('fading'));
    };
    ps.line.style.strokeDashoffset = String(100 * (1 - s.p));
    const L = psPath.getTotalLength(), pt = psPath.getPointAtLength(L * s.p);
    ps.dot.setAttribute('cx', pt.x.toFixed(1)); ps.dot.setAttribute('cy', pt.y.toFixed(1));
    if (instant) return swap();
    [ps.stage, ps.scene, ps.note].forEach(el => el.classList.add('fading'));
    setTimeout(swap, 380);
  }
  ps.line.style.transition = 'none';
  showScene(0, true);
  requestAnimationFrame(() => requestAnimationFrame(() => { ps.line.style.transition = ''; }));
  setInterval(() => {
    if (!state.on || !vis.sky || document.hidden) return;
    si = (si + 1) % scenes.length; if (si === 0 && scenes[0]) { /* loop */ }
    showScene(si);
  }, 4600);
  si = 0;

  /* ---------- sound demo ---------- */
  const AC = window.AudioContext || window.webkitAudioContext;
  let ac, master, active = null;
  function noise(type) {
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  }
  function lfo(freq, depth, target) {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o;
  }
  function build(kind) {
    const nodes = [], out = ac.createGain(); out.gain.value = 0; out.connect(master);
    const add = n => { nodes.push(n); return n; };
    if (kind === 'rain') {
      const n = add(noise('white')), hp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), g = ac.createGain();
      hp.type = 'highpass'; hp.frequency.value = 900; lp.type = 'lowpass'; lp.frequency.value = 7500; g.gain.value = .35;
      n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); n.start(); add(lfo(.25, .07, g.gain));
    } else if (kind === 'ocean') {
      const n = add(noise('brown')), lp = ac.createBiquadFilter(), g = ac.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 650; g.gain.value = .5;
      n.connect(lp); lp.connect(g); g.connect(out); n.start(); add(lfo(.1, .38, g.gain)); add(lfo(.1, 260, lp.frequency));
    } else if (kind === 'wind') {
      const n = add(noise('white')), bp = ac.createBiquadFilter(), g = ac.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = .9; g.gain.value = .9;
      n.connect(bp); bp.connect(g); g.connect(out); n.start(); add(lfo(.13, 240, bp.frequency)); add(lfo(.07, .3, g.gain));
    } else {
      const n = add(noise('brown')), lp = ac.createBiquadFilter(), g = ac.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = .8;
      n.connect(lp); lp.connect(g); g.connect(out); n.start();
    }
    return { out, nodes };
  }
  function stopSound(s) {
    if (!s) return;
    s.out.gain.cancelScheduledValues(ac.currentTime); s.out.gain.setTargetAtTime(0, ac.currentTime, .25);
    setTimeout(() => s.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 1400);
  }
  $$('.chip').forEach(btn => btn.addEventListener('click', () => {
    if (!AC) return;
    if (!ac) { ac = new AC(); master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination); }
    if (ac.state === 'suspended') ac.resume();
    const kind = btn.dataset.sound, was = btn.getAttribute('aria-pressed') === 'true';
    $$('.chip').forEach(b => b.setAttribute('aria-pressed', 'false'));
    stopSound(active); active = null;
    if (!was) {
      active = build(kind); active.out.gain.setTargetAtTime(.9, ac.currentTime, .6);
      btn.setAttribute('aria-pressed', 'true');
    }
  }));

  /* ---------- how it works ---------- */
  const steps = $$('.step'), panels = $$('.panel', $('#stage')), dots = $$('.stage-dots i');
  $$('.step-vis').forEach(v => {
    const p = panels[+v.dataset.clone]; if (!p) return;
    const c = p.cloneNode(true); c.removeAttribute('data-panel'); c.classList.add('active'); v.appendChild(c);
  });
  function setStep(i) {
    steps.forEach((s, k) => s.classList.toggle('active', k === i));
    panels.forEach((p, k) => p.classList.toggle('active', k === i));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  }
  if ('IntersectionObserver' in window) {
    const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setStep(+e.target.dataset.step); }), { rootMargin: '-42% 0px -42% 0px' });
    steps.forEach(s => sio.observe(s));
  }

  /* ---------- hypnogram ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const Y = { W: 37.5, R: 112.5, L: 187.5, D: 262.5 };
  const seq = [[0, 'W'], [.35, 'L'], [.7, 'D'], [1.5, 'L'], [1.7, 'R'], [1.9, 'L'], [2.1, 'D'], [2.9, 'L'], [3.2, 'R'], [3.5, 'L'], [3.7, 'D'], [4.2, 'L'], [4.7, 'R'], [5.2, 'L'], [5.4, 'D'], [5.7, 'L'], [6.0, 'R'], [6.6, 'L'], [7.0, 'R'], [7.4, 'L'], [7.7, 'W'], [8, 'W']];
  const NAMES = { W: 'Awake', R: 'REM', L: 'Light sleep', D: 'Deep sleep' };
  const X = h => h * 100;
  let d = '';
  d = seq.map(([h, s], i) => {
    const x = X(h), y = Y[s];
    if (i === 0) return `M${x} ${y}`;
    const py = Y[seq[i - 1][1]], r = 6;
    return `L${x - r} ${py} C${x} ${py} ${x} ${py} ${x} ${py + Math.sign(y - py) * Math.min(Math.abs(y - py) / 2, 12)} L${x} ${y - Math.sign(y - py) * Math.min(Math.abs(y - py) / 2, 12)} C${x} ${y} ${x} ${y} ${x + r} ${y}`;
  }).join(' ');
  const hypPath = $('#hypPath'); hypPath.setAttribute('d', d);
  $('#hypArea').setAttribute('d', d + ' L800 300 L0 300 Z');
  const grid = $('#hypGrid');
  Object.values(Y).forEach(y => { const l = document.createElementNS(NS, 'line'); l.setAttribute('x1', 0); l.setAttribute('x2', 800); l.setAttribute('y1', y); l.setAttribute('y2', y); l.setAttribute('stroke', 'rgba(173,178,255,.1)'); l.setAttribute('stroke-dasharray', '2 6'); grid.appendChild(l); });
  [0, 200, 400, 600, 800].forEach(x => { const l = document.createElementNS(NS, 'line'); l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); l.setAttribute('y2', 300); l.setAttribute('stroke', 'rgba(173,178,255,.07)'); grid.appendChild(l); });
  const marks = $('#hypMarks');
  [[.35, 'L'], [2.9, 'L'], [6.6, 'L']].forEach(([h, s]) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', X(h)); c.setAttribute('cy', Y[s]); c.setAttribute('r', 4.5); c.setAttribute('fill', '#0b0f23'); c.setAttribute('stroke', '#7fe3d3'); c.setAttribute('stroke-width', 2); marks.appendChild(c); });
  const stageAt = h => { let s = seq[0][1]; for (const [t, k] of seq) if (h >= t) s = k; return s; };
  const doText = (h, s) => {
    if (h >= 2.75 && h < 3.05) return 'Street noise spiked. Widening the masking band so it does not pull you toward waking.';
    if (h < .35) return 'Drift fades the soundscape in as you settle, matching your breathing.';
    if (h >= 7.6) return 'Chimes rise gently. You wake from a light stage, not mid-dream.';
    if (h >= 6.3 && s !== 'R') return 'Lightest-sleep window approaching. Sunrise light starts to build.';
    return { L: 'Rain thins as breathing slows. Melody gone, steady texture stays.', D: 'Holding steady. Only sudden noises are masked, everything else stays out of the way.', R: 'Keeping sound low and even. Dreaming sleep is lighter, so no surprises.', W: 'Brief wake-up detected. Calm, steady sound helps you drop back in.' }[s];
  };
  const scrub = $('#scrub'), hypTime = $('#hypTime'), hypStage = $('#hypStage'), hypDo = $('#hypDo span'), hypDot = $('#hypDot'), hypHead = $('#hypHead');
  const fmt = h => { let m = Math.round(((23 + h) % 24) * 60); const H = Math.floor(m / 60) % 24, M = m % 60; return `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')} ${H >= 12 ? 'PM' : 'AM'}`; };
  let lastDo = '';
  function setScrub(h) {
    const s = stageAt(h);
    scrub.value = h; scrub.style.setProperty('--p', (h / 8 * 100) + '%');
    hypTime.textContent = fmt(h); hypStage.textContent = NAMES[s];
    hypDot.setAttribute('cx', X(h)); hypDot.setAttribute('cy', Y[s]);
    hypHead.setAttribute('x1', X(h)); hypHead.setAttribute('x2', X(h));
    const t = doText(h, s); if (t !== lastDo) { hypDo.textContent = t; lastDo = t; }
  }
  let sweep = 0;
  scrub.addEventListener('input', () => { cancelAnimationFrame(sweep); setScrub(+scrub.value); });
  setScrub(0);
  const hypCard = $('#hypCard');
  if ('IntersectionObserver' in window) {
    const hio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; hio.disconnect();
      if (!state.on) return setScrub(2.9);
      const t0 = performance.now(), dur = 3200, to = 2.95;
      const step = n => { const k = clamp((n - t0) / dur, 0, 1); setScrub(to * ease(k)); if (k < 1) sweep = requestAnimationFrame(step); };
      setTimeout(() => { sweep = requestAnimationFrame(step); }, 300);
    }), { threshold: .35 });
    hio.observe(hypCard);
  }

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(el => {
    const target = +el.dataset.count;
    if (!state.on || !('IntersectionObserver' in window)) return;
    el.textContent = '0';
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; cio.disconnect();
      const t0 = performance.now(), dur = 1600;
      const tick = n => { const k = clamp((n - t0) / dur, 0, 1); el.textContent = Math.round(target * ease(k)); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }), { threshold: .6 });
    cio.observe(el);
  });

  /* ---------- spotlight + magnetic ---------- */
  if (fine.matches) {
    $$('.spot').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px');
        el.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .32).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--bx', '0px'); el.style.setProperty('--by', '0px'); });
    });
  }

  /* ---------- carousel ---------- */
  const quotes = $('#quotes'), qBar = $('#qBar');
  function updateQBar() { const max = quotes.scrollWidth; qBar.style.transform = `scaleX(${clamp((quotes.scrollLeft + quotes.clientWidth) / max, .05, 1).toFixed(3)})`; }
  quotes.addEventListener('scroll', updateQBar, { passive: true });
  const stepBy = dir => quotes.scrollBy({ left: dir * ($('.quote', quotes).offsetWidth + 18), behavior: state.on ? 'smooth' : 'auto' });
  $('#prev').addEventListener('click', () => stepBy(-1));
  $('#next').addEventListener('click', () => stepBy(1));
  quotes.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); stepBy(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); stepBy(-1); } });
  let drag = null;
  quotes.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; drag = { x: e.clientX, l: quotes.scrollLeft, moved: false }; });
  addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4 && !drag.moved) { drag.moved = true; quotes.style.scrollSnapType = 'none'; quotes.style.cursor = 'grabbing'; }
    if (drag.moved) quotes.scrollLeft = drag.l - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return; const m = drag.moved; drag = null;
    if (m) { quotes.style.cursor = ''; const w = $('.quote', quotes).offsetWidth + 18, target = Math.round(quotes.scrollLeft / w) * w; quotes.scrollTo({ left: target, behavior: 'smooth' }); setTimeout(() => { quotes.style.scrollSnapType = ''; }, 500); }
  });

  /* ---------- billing ---------- */
  const billBtns = $$('.billing button'), pill = $('.bill-pill');
  function layoutPill() {
    const on = $('.billing button.on'); if (!on) return;
    pill.style.setProperty('--w', on.offsetWidth + 'px'); pill.style.setProperty('--x', (on.offsetLeft - 5) + 'px');
  }
  const prices = $$('.price b');
  const fmtP = v => v === 0 ? '0' : v.toFixed(2);
  const yearly = { billedPlus: 'Billed $79 yearly', billedFam: 'Billed $119 yearly' };
  const monthly = { billedPlus: 'Billed monthly', billedFam: 'Billed monthly' };
  function setBilling(mode) {
    billBtns.forEach(b => { const on = b.dataset.bill === mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    layoutPill();
    prices.forEach(el => {
      const to = +el.dataset[mode], from = parseFloat(el.textContent) || 0;
      if (!state.on || from === to) { el.textContent = fmtP(to); return; }
      const t0 = performance.now(), dur = 700;
      const tick = n => { const k = clamp((n - t0) / dur, 0, 1); el.textContent = fmtP(lerp(from, to, ease(k))); if (k < 1) requestAnimationFrame(tick); else el.textContent = fmtP(to); };
      requestAnimationFrame(tick);
    });
    const src = mode === 'year' ? yearly : monthly;
    $('#billedPlus').textContent = src.billedPlus; $('#billedFam').textContent = src.billedFam;
  }
  billBtns.forEach(b => b.addEventListener('click', () => setBilling(b.dataset.bill)));
  document.fonts && document.fonts.ready.then(layoutPill);

  /* ---------- init ---------- */
  addEventListener('scroll', onScroll, { passive: true });
  setMotion(state.on);
  resize();
  requestFrame();
})();
