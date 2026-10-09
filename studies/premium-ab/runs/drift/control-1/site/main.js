(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el, i) => {
    // stagger siblings in grids
    if (!el.style.getPropertyValue('--d') && el.parentElement && /grid|bento|sci-cards|plan-grid/.test(el.parentElement.className)) {
      const idx = [...el.parentElement.children].indexOf(el);
      el.style.setProperty('--d', (idx % 6) * 0.09 + 's');
    }
    io.observe(el);
  });

  /* ---------- scroll progress + nav ---------- */
  const prog = $('#progress'), nav = $('#nav');
  let lastY = 0;
  function onScroll() {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    nav.classList.toggle('solid', y > 40);
    nav.classList.toggle('hide', y > 500 && y > lastY + 4 && !$('#sheet').classList.contains('open'));
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;
    parallax(y);
  }
  const moon = $('#moon');
  function parallax(y) {
    if (reduce) return;
    if (y < innerHeight * 1.5) {
      moon.style.transform = `translate3d(0,${y * 0.25}px,0) scale(${1 + y * 0.0002})`;
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  const burger = $('#burger'), sheet = $('#sheet');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open);
    sheet.classList.toggle('open', open);
    sheet.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', sheet).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- magnetic buttons + tilt + spotlight ---------- */
  if (fine && !reduce) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.22}px,${y * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1), box-shadow .4s'; el.style.transform = ''; setTimeout(() => (el.style.transition = ''), 700); });
    });
    const phone = $('#phone');
    const hp = $('.hero-phone');
    hp.addEventListener('pointermove', (e) => {
      const r = hp.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      phone.style.transform = `rotateY(${px * 16}deg) rotateX(${-py * 12}deg)`;
    });
    hp.addEventListener('pointerleave', () => (phone.style.transform = ''));
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (!el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .15s linear, border-color .4s';
        el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = ''; el.style.transform = ''; });
    });
  }
  $$('.spot').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  });
  // features: add .in for bar animation
  const bio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: 0.3 });
  $$('.bcard').forEach((c) => bio.observe(c));

  /* ---------- starfield canvases ---------- */
  function sky(canvas, opts) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, stars = [], visible = true, mx = 0, my = 0, tx = 0, ty = 0, t0 = performance.now();
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, r.width * dpr);
      h = canvas.height = Math.max(1, r.height * dpr);
      const n = Math.round((r.width * r.height) / (opts.density || 5500));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, z: Math.random(),
        r: (Math.random() * 1.2 + 0.3) * dpr, p: Math.random() * 6.28, s: Math.random() * 1.5 + 0.5,
        c: Math.random() < 0.15 ? '255,201,138' : Math.random() < 0.3 ? '155,140,255' : '235,238,255'
      }));
    }
    function ribbon(t, k, col, amp, yBase, speed, alpha) {
      ctx.beginPath();
      const step = 14 * dpr;
      for (let x = -step; x <= w + step; x += step) {
        const nx = x / w;
        const y = yBase * h + Math.sin(nx * 3.2 + t * speed + k) * amp * h + Math.sin(nx * 7.1 - t * speed * 1.7 + k * 2) * amp * 0.35 * h + (mx * 30 * (k + 1)) * 0.2;
        x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(w + step, h); ctx.lineTo(-step, h); ctx.closePath();
      const g = ctx.createLinearGradient(0, (yBase - amp * 2) * h, 0, (yBase + 0.35) * h);
      g.addColorStop(0, `rgba(${col},${alpha})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fill();
    }
    function frame(now) {
      const t = (now - t0) / 1000;
      mx = lerp(mx, tx, 0.04); my = lerp(my, ty, 0.04);
      ctx.clearRect(0, 0, w, h);
      if (opts.ribbons) {
        ctx.globalCompositeOperation = 'screen';
        ribbon(t, 0, '94,224,208', 0.05, opts.y0 ?? 0.62, 0.22, 0.12);
        ribbon(t, 1.7, '155,140,255', 0.07, (opts.y0 ?? 0.62) + 0.08, 0.17, 0.16);
        ribbon(t, 3.3, '255,143,177', 0.05, (opts.y0 ?? 0.62) + 0.16, 0.13, 0.09);
        ctx.globalCompositeOperation = 'source-over';
      }
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.s + s.p);
        const x = (s.x + mx * 22 * s.z * dpr + (reduce ? 0 : t * 2 * s.z * dpr)) % w;
        const y = s.y + my * 14 * s.z * dpr;
        ctx.globalAlpha = (0.25 + s.z * 0.75) * tw;
        ctx.fillStyle = `rgb(${s.c})`;
        ctx.beginPath(); ctx.arc(x < 0 ? x + w : x, y, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // shooting star
      if (opts.shoot && !reduce) {
        const c = (t % 9) / 9;
        if (c < 0.07) {
          const p = c / 0.07, sx = w * 0.15 + p * w * 0.4, sy = h * 0.08 + p * h * 0.22;
          const g = ctx.createLinearGradient(sx, sy, sx - 140 * dpr, sy - 60 * dpr);
          g.addColorStop(0, `rgba(255,255,255,${1 - p})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 140 * dpr, sy - 60 * dpr); ctx.stroke();
        }
      }
    }
    let raf;
    function loop(now) { if (visible && !document.hidden) frame(now); raf = requestAnimationFrame(loop); }
    size();
    addEventListener('resize', () => { size(); if (reduce) frame(performance.now()); });
    new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(canvas);
    if (!reduce) {
      addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
      raf = requestAnimationFrame(loop);
    } else frame(performance.now() + 4000);
  }
  sky($('#sky'), { ribbons: true, shoot: true, y0: 0.66, density: 5200 });
  sky($('#sky2'), { ribbons: false, density: 6500 });

  /* ---------- hero phone ---------- */
  // clock
  const clock = $('#clock');
  const now = new Date();
  clock.textContent = `${now.getHours() > 12 ? now.getHours() - 12 : now.getHours() || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
  // waveform
  const wave = $('#phoneWave');
  const BARS = 34;
  for (let i = 0; i < BARS; i++) wave.appendChild(document.createElement('i'));
  const wb = [...wave.children];
  // mix bars
  const mixEls = $$('[data-mix]');
  let mixT = [0.7, 0.4, 0.55];
  function drawWave(t) {
    wb.forEach((b, i) => {
      const v = 0.5 + 0.28 * Math.sin(i * 0.45 + t * 1.3) + 0.2 * Math.sin(i * 0.9 - t * 0.8) * Math.sin(t * 0.5);
      b.style.height = clamp(v, 0.08, 1) * 100 + '%';
    });
  }
  function driftMix() {
    mixEls.forEach((m, i) => { mixT[i] = clamp(mixT[i] + (Math.random() - 0.5) * 0.5, 0.15, 0.95); m.style.width = mixT[i] * 100 + '%'; });
  }
  driftMix(); setInterval(driftMix, 2600);
  // breathing label synced to 8s cycle
  const bl = $('#breathLabel');
  setInterval(() => { bl.textContent = bl.textContent === 'Breathe in' ? 'Breathe out' : 'Breathe in'; }, 4000);
  let phoneVisible = true;
  new IntersectionObserver((e) => (phoneVisible = e[0].isIntersecting)).observe($('#phone'));
  (function waveLoop(ts) {
    if (phoneVisible && !document.hidden) drawWave(reduce ? 2 : ts / 1000);
    if (!reduce) requestAnimationFrame(waveLoop);
  })(0);
  if (reduce) drawWave(2);

  /* ---------- how it works: sticky steps ---------- */
  const steps = $$('.step'), scenes = $$('.scene'), dots = $$('#stageDots i'), stage = $('#stage');
  function sparkInit() {
    $$('[data-spark]').forEach((sp) => {
      if (!sp.children.length) for (let i = 0; i < 22; i++) sp.appendChild(document.createElement('i'));
    });
  }
  sparkInit();
  function sparkTick() {
    $$('[data-spark]').forEach((sp) => {
      const flat = sp.classList.contains('flat');
      [...sp.children].forEach((b, i) => { b.style.height = (flat ? 30 + Math.random() * 8 : 15 + Math.random() * 85) + '%'; });
    });
  }
  const layerVals = [
    [62, 38, 45, 20], [30, 55, 70, 12], [44, 72, 28, 36], [18, 40, 60, 54]
  ];
  let layerIdx = 0;
  function layerTick() {
    const v = layerVals[layerIdx++ % layerVals.length];
    $$('#layers .layer').forEach((l, i) => {
      $('i', l).style.width = v[i] + '%';
      $('em', l).textContent = v[i];
    });
  }
  let sparkTimer, layerTimer;
  function setStep(n) {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === n));
    scenes.forEach((s, i) => s.classList.toggle('on', i === n));
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    stage.dataset.active = n;
    clearInterval(sparkTimer); clearInterval(layerTimer);
    if (n === 0) { sparkTick(); sparkTimer = setInterval(sparkTick, 1400); }
    if (n === 1) { layerTick(); layerTimer = setInterval(layerTick, 2600); }
  }
  setStep(0);
  const sio = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) setStep(+e.target.dataset.step); });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  steps.forEach((s) => sio.observe(s));
  steps.forEach((s) => s.addEventListener('click', () => s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })));

  /* ---------- night explorer ---------- */
  // 10pm -> 7am, 30 min slots = 19 points. 0 awake,1 rem,2 light,3 deep
  const hyp = [0, 2, 2, 3, 3, 2, 3, 2, 1, 2, 3, 2, 1, 2, 1, 2, 1, 2, 0];
  const notes = {
    0: 'Awake or just settling. Drift lowers volume gradually as your heart rate falls.',
    1: 'REM. Dreams are vivid, so the mix stays soft and very steady, with no sudden changes.',
    2: 'Light sleep. Gentle masking sound covers small noises from the street and the house.',
    3: 'Deep sleep. Sound thins out to almost nothing so the body can do its restoring work.'
  };
  const names = ['Awake', 'REM', 'Light', 'Deep'];
  const mixByStage = { 0: [60, 35, 55, 20], 1: [28, 30, 38, 18], 2: [38, 22, 46, 24], 3: [10, 16, 20, 6] };
  const W = 900, H = 260, yFor = (s) => 24 + s * 70;
  const gridG = $('#hgrid');
  [0, 1, 2, 3].forEach((s) => {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 0); l.setAttribute('x2', W); l.setAttribute('y1', yFor(s)); l.setAttribute('y2', yFor(s));
    gridG.appendChild(l);
  });
  const n = hyp.length;
  const pts = hyp.map((s, i) => [(i / (n - 1)) * W, yFor(s)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < n; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1], mid = px + (x - px) * 0.5;
    d += ` L${mid - 6},${py} Q${mid},${py} ${mid},${(py + y) / 2} Q${mid},${y} ${mid + 6},${y} L${x},${y}`;
  }
  $('#hPath').setAttribute('d', d);
  $('#hPathDim').setAttribute('d', d);
  const area = d + ` L${W},${H} L0,${H} Z`;
  $('#hArea2').setAttribute('d', area);
  $('#hArea').setAttribute('d', '');

  const scrub = $('#scrub'), cursor = $('#cursor'), chartWrap = $('#chartWrap');
  const clip = $('#clipRect'), exTime = $('#exTime'), exStage = $('#exStage'), exNote = $('#exNote');
  const mixRows = $$('#exMix .em');
  let curStage = -1, userTouched = false, playing = !reduce, pos = 0;
  function fmtTime(p) {
    const mins = 22 * 60 + p * 9 * 60; // 10pm + up to 9h
    let hh = Math.floor(mins / 60) % 24; const mm = Math.floor((mins % 60) / 10) * 10;
    const ap = hh >= 12 ? 'pm' : 'am'; hh = hh % 12 || 12;
    return `${hh}:${String(mm).padStart(2, '0')} ${ap}`;
  }
  function stageAt(p) {
    const f = p * (n - 1), i = Math.round(f);
    return hyp[clamp(i, 0, n - 1)];
  }
  function setNight(p) {
    pos = p;
    scrub.value = p * 100;
    scrub.style.setProperty('--p', p * 100 + '%');
    clip.setAttribute('width', p * W);
    const wrapW = chartWrap.clientWidth - (innerWidth <= 640 ? 40 : 46);
    cursor.style.transform = `translateX(${p * wrapW}px)`;
    exTime.textContent = fmtTime(p);
    const s = stageAt(p);
    // y of cursor orb
    const f = p * (n - 1), i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1);
    const sm = lerp(hyp[i0], hyp[i1], clamp((f - i0 - 0.35) / 0.3, 0, 1));
    cursor.style.setProperty('--y', (yFor(sm) / H) * 100 + '%');
    cursor.firstElementChild.style.marginTop = '-11px';
    if (s !== curStage) {
      curStage = s;
      exStage.textContent = names[s];
      exNote.textContent = notes[s];
      mixRows.forEach((r, k) => { const v = mixByStage[s][k]; $('i', r).style.width = v + '%'; $('b', r).textContent = v; });
    }
  }
  scrub.addEventListener('input', () => { userTouched = true; setPlay(false); setNight(scrub.value / 100); });
  const playBtn = $('#exPlay');
  function setPlay(v) {
    playing = v;
    $('#icoPause').style.display = v ? '' : 'none';
    $('#icoPlay').style.display = v ? 'none' : '';
    playBtn.setAttribute('aria-label', v ? 'Pause playback' : 'Play night');
  }
  playBtn.addEventListener('click', () => { if (pos >= 0.999) pos = 0; setPlay(!playing); });
  setPlay(playing);
  let exVisible = false, last = performance.now();
  new IntersectionObserver((e) => (exVisible = e[0].isIntersecting), { threshold: 0.35 }).observe($('#explorer'));
  (function nightLoop(ts) {
    const dt = (ts - last) / 1000; last = ts;
    if (playing && exVisible && !document.hidden) {
      pos += dt / 28; // 28s for the whole night
      if (pos >= 1) { pos = 1; setPlay(false); }
      setNight(pos);
    }
    requestAnimationFrame(nightLoop);
  })(last);
  setNight(reduce ? 0.45 : 0);
  addEventListener('resize', () => setNight(pos));

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.to;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1800;
    (function tick(t) {
      const p = clamp((t - t0) / dur, 0, 1), eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }), { threshold: 0.6 });
  $$('[data-to]').forEach((el) => cio.observe(el));

  /* ---------- feature wave ---------- */
  const wp = $$('.viz-wave path');
  let fVisible = false;
  new IntersectionObserver((e) => (fVisible = e[0].isIntersecting)).observe($('.viz-wave'));
  function featWave(ts) {
    if (fVisible && !document.hidden) {
      const t = ts / 1000;
      wp.forEach((p, k) => {
        let s = '';
        for (let x = 0; x <= 400; x += 8) {
          const y = 60 + Math.sin(x * 0.02 * (1 + k * 0.4) + t * (0.8 + k * 0.5)) * (22 - k * 4) + Math.sin(x * 0.05 - t * 1.2 + k) * 8;
          s += (x ? 'L' : 'M') + x + ',' + y.toFixed(1);
        }
        p.setAttribute('d', s);
      });
    }
    if (!reduce) requestAnimationFrame(featWave);
  }
  featWave(2000);

  /* ---------- testimonials rail ---------- */
  const rail = $('#rail');
  const cardW = () => ($('.quote', rail).offsetWidth + 20);
  $('#next').addEventListener('click', () => rail.scrollBy({ left: cardW(), behavior: reduce ? 'auto' : 'smooth' }));
  $('#prev').addEventListener('click', () => rail.scrollBy({ left: -cardW(), behavior: reduce ? 'auto' : 'smooth' }));
  let down = false, sx = 0, sl = 0;
  rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('drag'); });
  addEventListener('pointermove', (e) => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
  addEventListener('pointerup', () => { down = false; rail.classList.remove('drag'); });
  rail.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') rail.scrollBy({ left: cardW(), behavior: 'smooth' });
    if (e.key === 'ArrowLeft') rail.scrollBy({ left: -cardW(), behavior: 'smooth' });
  });

  /* ---------- billing toggle ---------- */
  const tg = $('#billing'), tbtn = $$('button', tg), thumb = $('.thumb', tg);
  function placeThumb(b) { thumb.style.setProperty('--w', b.offsetWidth + 'px'); thumb.style.setProperty('--x', b.offsetLeft - 5 + 'px'); }
  function animatePrice(el, to) {
    const from = parseFloat(el.textContent) || 0;
    if (reduce) { el.textContent = to.toFixed(to % 1 ? 2 : 0); return; }
    const t0 = performance.now();
    (function tick(t) {
      const p = clamp((t - t0) / 700, 0, 1), e = 1 - Math.pow(1 - p, 3);
      const v = lerp(from, to, e);
      el.textContent = p < 1 ? v.toFixed(to % 1 || from % 1 ? 2 : 0) : (to % 1 ? to.toFixed(2) : String(to));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  function setBilling(mode) {
    tbtn.forEach((b) => { const on = b.dataset.bill === mode; b.classList.toggle('on', on); if (on) placeThumb(b); });
    $$('.amt').forEach((a) => animatePrice(a, +a.dataset[mode]));
    $$('[data-per]').forEach((p) => (p.textContent = mode === 'm' ? '/ month' : '/ month'));
    const labels = { m: ['Billed monthly', 'Billed monthly'], y: ['Billed $74.99 yearly', 'Billed $119.99 yearly'] };
    $$('[data-billed]').forEach((b, i) => (b.textContent = labels[mode][i]));
  }
  tbtn.forEach((b) => b.addEventListener('click', () => setBilling(b.dataset.bill)));
  const init = () => placeThumb($('.on', tg));
  init(); addEventListener('resize', init);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
})();
