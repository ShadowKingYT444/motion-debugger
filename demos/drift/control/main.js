(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  let motionOn = !reduced;

  /* ---------- headline word split ---------- */
  const title = $('#heroTitle');
  if (title) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(title);
    // inner spans of <em> need delay index too: handled via --i on each
    requestAnimationFrame(() => requestAnimationFrame(() => title.classList.add('is-split')));
  }
  const dl = $('.download .display');
  if (dl) dl.classList.add('is-split');

  /* ---------- reveal on view ---------- */
  const revealEls = $$('[data-reveal], .pillar, .ring, .c-wake, .c-score');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('is-in'));
  setTimeout(() => $$('[data-reveal]').forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); }), 2500);

  /* ---------- counters ---------- */
  const countIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    if (!motionOn) { el.textContent = end.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1800;
    const tick = (t) => {
      const p = clamp((t - t0) / dur), eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (end * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .5 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- sky colour by scroll ---------- */
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
  const stops = [
    [0, '#070a1c', '#141a4a'], [.3, '#080b24', '#1a1650'], [.62, '#0a0c2a', '#241a5e'],
    [.85, '#120d2e', '#3a1c58'], [1, '#2a1238', '#a0505e']
  ];
  const sky = $('#sky');
  const setSky = (p) => {
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) if (p >= stops[i][0] && p <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
    const t = b[0] === a[0] ? 0 : (p - a[0]) / (b[0] - a[0]);
    sky.style.setProperty('--sky1', mix(a[1], b[1], t));
    sky.style.setProperty('--sky2', mix(a[2], b[2], t));
  };

  /* ---------- hypnogram data ---------- */
  const S = [0, 2, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 3, 3, 3, 2, 2, 1, 1, 2, 2, 3, 2, 2, 1, 2, 2, 1, 1, 2, 1, 1, 0];
  const names = ['Awake', 'REM', 'Light sleep', 'Deep sleep'];
  const stageColor = ['#ffc98a', '#ff9f9f', '#8b7bff', '#6fe0d0'];
  const vols = [[.72, .3, .1], [.3, .42, .3], [.42, .3, .38], [.1, .22, .7]];
  const notes = [
    'Reading your evening…', 'Heart rate easing — pacing sound to your breath',
    'Sleep fingerprint updated — cycles are ~92 min', 'Rain thinning, low hum rising',
    'Masking a passing car at 2:14 AM', 'Slow-wave window protected',
    'Finding your lightest moment…', 'Sunrise layer fading in'
  ];
  const hypLine = $('#hypLine'), hypGhost = $('#hypGhost'), hypDot = $('#hypDot');
  const VW = 600, yFor = (s) => 20 + s * 40;
  let hypLen = 0;
  if (hypLine) {
    const n = S.length;
    let d = `M0 ${yFor(S[0])}`;
    for (let i = 1; i < n; i++) { const x = (i / (n - 1) * VW).toFixed(1); d += ` H${x} V${yFor(S[i])}`; }
    hypLine.setAttribute('d', d); hypGhost.setAttribute('d', d);
    hypLen = hypLine.getTotalLength();
  }
  const timeOf = (p) => {
    const m = Math.round(22 * 60 + 30 + p * 495) % 1440;
    const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
    return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const night = { t: $('#nightTime'), badge: $('#nightStage'), note: $('#nightNote'), prog: $('#nightProg'),
    rain: $('#lyRain'), ocean: $('#lyOcean'), hum: $('#lyHum') };
  let lastStage = -1, lastNote = -1;
  const updateNight = (p) => {
    if (!hypLine) return;
    // dash progress in terms of x so the dot tracks the step path
    hypLine.style.strokeDashoffset = String(1 - p);
    const pt = hypLine.getPointAtLength(p * hypLen);
    hypDot.setAttribute('cx', pt.x); hypDot.setAttribute('cy', pt.y);
    const idx = Math.round(p * (S.length - 1)), st = S[idx];
    night.t.textContent = timeOf(p);
    night.prog.style.transform = `scaleX(${p})`;
    if (st !== lastStage) {
      lastStage = st;
      $('span', night.badge).textContent = names[st];
      const i = $('i', night.badge); i.style.background = stageColor[st]; i.style.boxShadow = `0 0 12px ${stageColor[st]}`;
      const v = vols[st];
      night.rain.style.width = v[0] * 100 + '%'; night.ocean.style.width = v[1] * 100 + '%'; night.hum.style.width = v[2] * 100 + '%';
    }
    const ni = Math.min(notes.length - 1, Math.floor(p * notes.length));
    if (ni !== lastNote) { lastNote = ni; night.note.textContent = notes[ni]; }
  };

  /* ---------- scroll handler ---------- */
  const nav = $('#nav'), bar = $('#progressBar');
  const stepsEl = $('#steps'), steps = $$('.step');
  const scrubEl = $('#scrub');
  const sunEl = $('.dawn .sun'), dlSec = $('#download');
  const links = $$('.nav-links a');
  const sections = links.map((a) => $(a.getAttribute('href')));
  let scrubWords = [];
  if (scrubEl) {
    scrubEl.innerHTML = scrubEl.textContent.trim().split(/\s+/).map((w) => `<span>${w}</span>`).join(' ');
    scrubWords = $$('span', scrubEl);
  }
  let lastY = 0, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, H = innerHeight, max = document.documentElement.scrollHeight - H;
    const p = max > 0 ? clamp(y / max) : 0;
    bar.style.transform = `scaleX(${p})`;
    setSky(p);
    nav.classList.toggle('scrolled', y > 40);
    nav.classList.toggle('hide', y > lastY + 4 && y > 500 && !$('#navLinks').classList.contains('open'));
    if (y < lastY - 4 || y < 500) nav.classList.remove('hide');
    lastY = y;

    // active nav link
    let cur = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < H * .4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));

    // how-it-works
    if (stepsEl) {
      const r = stepsEl.getBoundingClientRect();
      const prog = clamp((H * .45 - r.top) / (r.height - H * .2));
      updateNight(prog);
      let act = 0, best = 1e9;
      steps.forEach((s, i) => { const b = s.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - H * .5); if (d < best) { best = d; act = i; } });
      steps.forEach((s, i) => s.classList.toggle('is-active', i === act));
    }
    // scrub text
    if (scrubWords.length) {
      const r = scrubEl.getBoundingClientRect();
      const sp = clamp((H * .85 - r.top) / (r.height + H * .35));
      const lit = Math.round(sp * scrubWords.length * 1.05);
      scrubWords.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
    // dawn sun
    if (sunEl) {
      const r = dlSec.getBoundingClientRect();
      const t = clamp((H - r.top) / (H * 1.1));
      sunEl.style.setProperty('--rise', (45 - t * 45) + '%');
    }
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  onScroll();

  /* ---------- hero canvas ---------- */
  const cv = $('#heroCanvas');
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, Hh, dpr, stars = [], mx = 0, my = 0, tmx = 0, tmy = 0, visible = true, t0 = performance.now();
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect(); W = r.width; Hh = r.height;
      cv.width = W * dpr; cv.height = Hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * Hh / 9000);
      stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * Hh * .85, r: Math.random() * 1.3 + .2, s: Math.random() * 2 + .5, o: Math.random() * 6.28, z: Math.random() }));
    };
    const ribbons = [
      { c: '139,123,255', a: 46, f: 1.2, sp: .35, y: .8, w: 1.4 }, { c: '111,224,208', a: 38, f: 1.6, sp: -.28, y: .83, w: 1.2 },
      { c: '255,201,138', a: 30, f: .9, sp: .22, y: .86, w: 1.6 }, { c: '139,123,255', a: 56, f: 1.9, sp: -.4, y: .89, w: 1 },
      { c: '255,159,159', a: 26, f: 1.1, sp: .3, y: .92, w: 1.2 }, { c: '111,224,208', a: 34, f: 2.3, sp: .5, y: .95, w: .9 }
    ];
    const frame = (now) => {
      const t = (now - t0) / 1000;
      mx = lerp(mx, tmx, .05); my = lerp(my, tmy, .05);
      ctx.clearRect(0, 0, W, Hh);
      // stars
      for (const s of stars) {
        const tw = .5 + .5 * Math.sin(t * s.s + s.o);
        ctx.globalAlpha = .25 + tw * .7 * (.4 + s.z * .6);
        ctx.fillStyle = '#e8ecff';
        ctx.beginPath(); ctx.arc(s.x + mx * s.z * 18, s.y + my * s.z * 12, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // flowing ribbons
      ctx.globalCompositeOperation = 'lighter';
      ribbons.forEach((rb, k) => {
        for (let j = 0; j < 5; j++) {
          ctx.beginPath();
          const off = j * .35;
          for (let x = 0; x <= W; x += 8) {
            const nx = x / W;
            const env = Math.sin(nx * Math.PI);
            const y = Hh * rb.y + Math.sin(nx * rb.f * 6 + t * rb.sp * 2 + off + k) * rb.a * env + Math.sin(nx * 3 + t * .3 + k * 2) * rb.a * .5 * env + my * 10 + j * 3;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x + mx * 8, y);
          }
          ctx.strokeStyle = `rgba(${rb.c},${.5 - j * .09})`;
          ctx.lineWidth = rb.w; ctx.stroke();
        }
      });
      ctx.globalCompositeOperation = 'source-over';
    };
    let raf;
    const loop = (now) => { if (visible && motionOn) frame(now); raf = requestAnimationFrame(loop); };
    resize(); frame(performance.now());
    if (!reduced) raf = requestAnimationFrame(loop);
    addEventListener('resize', () => { resize(); frame(performance.now()); });
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe($('#hero'));
    addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; });

    // phone tilt + floating cards parallax
    const phone = $('#phone'), floats = $$('.float');
    addEventListener('pointermove', (e) => {
      if (!motionOn || innerWidth < 1020) return;
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      phone.style.transform = `rotateY(${x * -12}deg) rotateX(${y * 8}deg)`;
      floats.forEach((f, i) => { const k = (i + 1) * 10; f.style.transform = `translate(${x * k}px,${y * k}px)`; });
    });
  }

  /* ---------- phone live text ---------- */
  const bw = $('#breathWord'), ps = $('#phoneStage');
  if (bw && !reduced) {
    let inh = true;
    setInterval(() => { if (!motionOn) return; inh = !inh; bw.style.opacity = 0; setTimeout(() => { bw.textContent = inh ? 'Breathe in' : 'Breathe out'; bw.style.opacity = 1; }, 300); }, 5000);
    const st = ['Settling', 'Light sleep', 'Deep sleep']; let k = 0;
    setInterval(() => { if (motionOn) ps.textContent = st[++k % st.length]; }, 6000);
  }

  /* ---------- nav menu ---------- */
  const burger = $('#burger'), navLinks = $('#navLinks');
  burger.addEventListener('click', () => {
    const o = navLinks.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });
  navLinks.addEventListener('click', (e) => { if (e.target.tagName === 'A') { navLinks.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });

  /* ---------- magnetic buttons & card spotlight ---------- */
  if (matchMedia('(hover:hover)').matches) {
    $$('.magnet').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        if (!motionOn) return;
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
    $$('.spot').forEach((c) => c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
    }));
  }

  /* ---------- routine checklist ---------- */
  const checks = $$('#checks li');
  if (checks.length) {
    const cio = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return; cio.disconnect();
      checks.forEach((li, i) => setTimeout(() => li.classList.add('done'), motionOn ? 600 + i * 650 : 0));
    }, { threshold: .5 });
    cio.observe($('#checks'));
    checks.forEach((li) => li.addEventListener('click', () => li.classList.toggle('done')));
  }

  /* ---------- soundscape mixer ---------- */
  const sliders = $$('.sliders input'), presets = $$('#presets button');
  const levels = {}, target = {};
  const PRESETS = {
    drizzle: { rain: 55, ocean: 20, wind: 15, hum: 30 }, shore: { rain: 5, ocean: 78, wind: 25, hum: 20 },
    deep: { rain: 10, ocean: 15, wind: 5, hum: 82 }, storm: { rain: 40, ocean: 10, wind: 78, hum: 35 }
  };
  const paintSlider = (s) => s.style.setProperty('--v', s.value + '%');
  sliders.forEach((s) => { levels[s.dataset.ch] = target[s.dataset.ch] = +s.value; paintSlider(s);
    s.addEventListener('input', () => { levels[s.dataset.ch] = target[s.dataset.ch] = +s.value; paintSlider(s); applyAudio(); presets.forEach((b) => b.classList.remove('on')); }); });
  presets.forEach((b) => b.addEventListener('click', () => {
    presets.forEach((x) => x.classList.toggle('on', x === b)); Object.assign(target, PRESETS[b.dataset.p]);
  }));

  // audio engine
  let ac = null, nodes = null, playing = false;
  const playBtn = $('#mixPlay'), note = $('#audioNote');
  const noiseBuf = (type) => {
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    const f = 2000; for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[len - f + i] * (1 - a) * (1 - a) * 0; }
    return buf;
  };
  const src = (type) => { const s = ac.createBufferSource(); s.buffer = noiseBuf(type); s.loop = true; s.start(); return s; };
  const lfo = (freq, depth, param) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g).connect(param); o.start(); };
  const build = () => {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const mk = () => { const g = ac.createGain(); g.gain.value = 0; g.connect(master); return g; };
    const rain = mk(), ocean = mk(), wind = mk(), hum = mk();
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    src('white').connect(hp).connect(lp).connect(rain);
    const oc = ac.createBiquadFilter(); oc.type = 'lowpass'; oc.frequency.value = 520;
    const ocg = ac.createGain(); ocg.gain.value = .55; lfo(.09, .4, ocg.gain);
    src('brown').connect(oc).connect(ocg).connect(ocean);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = .9; lfo(.07, 260, bp.frequency);
    const wg = ac.createGain(); wg.gain.value = .7; lfo(.13, .3, wg.gain);
    src('brown').connect(bp).connect(wg).connect(wind);
    [55, 55.4, 110.3].forEach((f, i) => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = i === 2 ? .12 : .5; o.connect(g).connect(hum); o.start(); });
    nodes = { master, rain, ocean, wind, hum };
  };
  const applyAudio = () => {
    if (!nodes) return;
    const t = ac.currentTime, k = { rain: .26, ocean: 1.1, wind: 1.3, hum: .5 };
    Object.keys(k).forEach((c) => nodes[c].gain.setTargetAtTime((levels[c] / 100) * k[c], t, .25));
  };
  playBtn.addEventListener('click', async () => {
    try {
      if (!ac) build();
      if (!playing) {
        await ac.resume(); playing = true; applyAudio();
        nodes.master.gain.cancelScheduledValues(ac.currentTime);
        nodes.master.gain.setTargetAtTime(.6, ac.currentTime, 1.2);
        note.textContent = 'Playing — generated live in your browser. Drag the sliders.';
      } else {
        playing = false; nodes.master.gain.setTargetAtTime(0, ac.currentTime, .4);
        setTimeout(() => { if (!playing && ac) ac.suspend(); }, 1600);
        note.textContent = 'Paused. Tip: start quietly — sound begins soft and fades in.';
      }
      playBtn.setAttribute('aria-pressed', playing);
    } catch (err) { note.textContent = 'Audio is not available in this browser, but the visual mixer still works.'; }
  });

  // mixer visualiser
  const mv = $('#mixViz');
  if (mv) {
    const c = mv.getContext('2d'); let w, h, dp, vis = true;
    const cols = ['139,170,255', '111,224,208', '200,190,255', '255,201,138'], chs = ['rain', 'ocean', 'wind', 'hum'];
    const size = () => { dp = Math.min(devicePixelRatio || 1, 2); const r = mv.getBoundingClientRect(); w = r.width; h = r.height; mv.width = w * dp; mv.height = h * dp; c.setTransform(dp, 0, 0, dp, 0, 0); };
    size(); addEventListener('resize', size);
    new IntersectionObserver((e) => { vis = e[0].isIntersecting; }).observe(mv);
    const draw = (now) => {
      requestAnimationFrame(draw);
      if (!vis) return;
      // ease sliders towards preset targets
      sliders.forEach((s) => { const ch = s.dataset.ch; if (levels[ch] !== target[ch]) { levels[ch] = lerp(levels[ch], target[ch], .08); if (Math.abs(levels[ch] - target[ch]) < .3) levels[ch] = target[ch]; s.value = levels[ch]; paintSlider(s); applyAudio(); } });
      const t = now / 1000 * (motionOn ? 1 : 0);
      c.clearRect(0, 0, w, h);
      chs.forEach((ch, i) => {
        const a = levels[ch] / 100, fr = [14, 3.2, 1.8, 1.1][i] + i * .1, sp = [2.4, .9, .5, .35][i];
        c.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const nx = x / w, env = .35 + .65 * Math.sin(nx * Math.PI);
          const y = h / 2 + Math.sin(nx * fr * 2 + t * sp * 2 + i * 1.7) * a * h * .38 * env
            + (i === 0 ? Math.sin(nx * 40 + t * 8) * a * 6 * env : 0);
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.strokeStyle = `rgba(${cols[i]},${.25 + a * .7})`; c.lineWidth = 1.6 + a * 1.4; c.stroke();
      });
    };
    requestAnimationFrame(draw);
  }

  /* ---------- testimonials ---------- */
  const qs = $$('.q'), dots = $$('#qDots i'), qWrap = $('#quotes');
  let qi = 0, qTimer, qHover = false;
  const showQ = (n) => {
    qi = (n + qs.length) % qs.length;
    qs.forEach((q, i) => q.classList.toggle('is-on', i === qi)); dots.forEach((d, i) => d.classList.toggle('on', i === qi));
  };
  const startQ = () => { clearInterval(qTimer); qTimer = setInterval(() => { if (!qHover && motionOn) showQ(qi + 1); }, 7000); };
  $('#qPrev').addEventListener('click', () => { showQ(qi - 1); startQ(); });
  $('#qNext').addEventListener('click', () => { showQ(qi + 1); startQ(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { showQ(i); startQ(); }));
  qWrap.addEventListener('pointerenter', () => qHover = true); qWrap.addEventListener('pointerleave', () => qHover = false);
  startQ();

  /* ---------- pricing toggle ---------- */
  const tg = $('#billing'), tbtns = $$('button', tg), thumb = $('.thumb', tg);
  const moveThumb = () => { const b = $('button.on', tg); thumb.style.setProperty('--tx', b.offsetLeft - 5 + 'px'); thumb.style.setProperty('--tw', b.offsetWidth + 'px'); };
  const setBilling = (mode) => {
    tbtns.forEach((b) => b.classList.toggle('on', b.dataset.b === mode)); moveThumb();
    $$('.amt').forEach((a) => { a.textContent = a.dataset[mode]; a.classList.remove('swap'); void a.offsetWidth; if (motionOn) a.classList.add('swap'); });
    $$('.billed').forEach((b) => b.textContent = b.dataset[mode]);
    $$('.per').forEach((p) => p.textContent = '/ month');
  };
  tbtns.forEach((b) => b.addEventListener('click', () => setBilling(b.dataset.b)));
  addEventListener('resize', moveThumb);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(moveThumb);
  moveThumb();

  /* ---------- global motion toggle ---------- */
  const mt = $('#motionToggle');
  if (reduced) { mt.textContent = 'Motion reduced'; mt.disabled = true; }
  mt.addEventListener('click', () => {
    motionOn = !motionOn; root.classList.toggle('motion-off', !motionOn);
    mt.setAttribute('aria-pressed', !motionOn); mt.textContent = motionOn ? 'Pause motion' : 'Resume motion';
  });
})();
