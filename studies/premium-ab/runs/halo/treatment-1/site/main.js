/* Halo — page behaviour. Builds on motion-kit.js (reveals, counters, marquee, nav, magnetic, spotlight). */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  document.documentElement.classList.add('is-ready');

  /* ---------- manifesto: words light up as you read (kit writes --p) ---------- */
  const manifesto = $('.manifesto');
  if (manifesto) {
    const words = manifesto.textContent.trim().split(/\s+/);
    manifesto.setAttribute('aria-label', words.join(' '));
    manifesto.innerHTML = words.map((w, i) => `<span aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  }

  /* ---------- scroll loop: progress bar, pinned story, footer wordmark ---------- */
  const progress = $('.progress');
  const story = $('.story');
  const stage = $('.story-stage');
  const steps = $$('.step');
  const badges = $$('.badge');
  const wordmark = $('#wordmark');
  const footer = $('.footer');
  let lastStep = -1, lastLift = -1;

  function setStep(step) {
    if (step === lastStep) return;
    lastStep = step;
    stage.dataset.step = String(step);
    steps.forEach((el, i) => el.classList.toggle('is-active', i === step));
    badges.forEach((el) => el.classList.toggle('is-on', Number(el.dataset.b) === step));
  }

  function frame() {
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    if (progress) progress.style.setProperty('--scroll', (max > 0 ? scrollY / max : 0).toFixed(4));

    if (story && !reduce) {
      const r = story.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh));
      const lift = easeInOut(clamp((p - .1) / .3));
      if (Math.abs(lift - lastLift) > .0005) { stage.style.setProperty('--lift', lift.toFixed(4)); lastLift = lift; }
      setStep(p < .27 ? 0 : p < .5 ? 1 : p < .74 ? 2 : 3);
    }

    if (wordmark && !reduce) {
      const r = footer.getBoundingClientRect();
      const t = clamp((vh - r.top) / Math.max(r.height, 1));
      wordmark.style.setProperty('--wm', `${((1 - t) * 18).toFixed(1)}vh`);
    }
  }
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (reduce && stage) {
    stage.style.setProperty('--lift', '.8');
    stage.dataset.step = 'all';
    badges.forEach((b) => b.classList.add('is-on'));
  }
  frame();

  /* ---------- live-only animation: ambient loops run only on screen ---------- */
  const liveIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting));
  }, { threshold: 0.05 });
  $$('.panel-plan, .t-fill').forEach((el) => liveIO.observe(el));

  /* ---------- hero: ripples leave the halo; the glow follows the pointer ---------- */
  const hero = $('.hero');
  const canvas = $('.hero-field');
  const glow = $('.hero-glow');
  const heroObj = $('.hero-object');
  if (hero && canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, visible = true, raf = 0, origin = { x: 0, y: 0 };
    const ripples = [];
    let lastSpawn = -1e9;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0 };

    const measure = () => {
      const hr = hero.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = hr.width; H = hr.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const svg = $('svg', heroObj).getBoundingClientRect();
      origin = { x: svg.left - hr.left + svg.width / 2, y: svg.top - hr.top + svg.height * (147 / 580) };
      pointer.x = pointer.tx = origin.x; pointer.y = pointer.ty = origin.y;
    };

    const drawRipple = (r, t) => {
      const age = clamp((t - r.t0) / r.life);
      const rad = easeOut(age) * r.max;
      const alpha = Math.pow(1 - age, 1.6) * r.a;
      ctx.beginPath();
      ctx.ellipse(origin.x, origin.y + rad * .06, rad, rad * .24, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(242,166,90,${alpha.toFixed(3)})`;
      ctx.lineWidth = r.w;
      ctx.stroke();
      return age < 1;
    };

    const render = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (t - lastSpawn > 1500) { ripples.push({ t0: t, life: 7200, max: Math.max(W, H) * .82, a: .42, w: 1.1 }); lastSpawn = t; }
      for (let i = ripples.length - 1; i >= 0; i--) if (!drawRipple(ripples[i], t)) ripples.splice(i, 1);
    };

    const loop = (t) => {
      raf = 0;
      if (!visible) return;
      render(t);
      // pointer follow: glow eases toward the pointer, the object leans a little
      pointer.x = lerp(pointer.x, pointer.tx, .06); pointer.y = lerp(pointer.y, pointer.ty, .06);
      if (glow) glow.style.transform = `translate3d(${pointer.x.toFixed(1)}px, ${pointer.y.toFixed(1)}px, 0)`;
      const dx = (pointer.x - origin.x) / Math.max(W, 1), dy = (pointer.y - origin.y) / Math.max(H, 1);
      if (heroObj) heroObj.style.transform = `translate3d(${(dx * -14).toFixed(2)}px, ${(dy * -8).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const staticDraw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      [.18, .34, .52, .74].forEach((f, i) => drawRipple({ t0: 0, life: 1, max: Math.max(W, H) * .82, a: .5 - i * .08, w: 1 }, f * 1));
      if (glow) glow.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0)`;
    };

    measure();
    // static fallback draw uses age = f (life 1, t0 0)
    if (reduce) staticDraw();
    else {
      if (glow) glow.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0)`;
      raf = requestAnimationFrame(loop);
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }, { threshold: 0 }).observe(hero);
      if (finePointer) {
        hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top; });
        hero.addEventListener('pointerleave', () => { pointer.tx = origin.x; pointer.ty = origin.y; });
      }
      hero.addEventListener('pointerdown', (e) => {
        if (e.target.closest('a, button')) return;
        ripples.push({ t0: performance.now(), life: 4200, max: Math.max(W, H) * .6, a: .8, w: 1.8 });
      });
    }
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); if (reduce) staticDraw(); }, 120); });
    addEventListener('load', () => { measure(); if (reduce) staticDraw(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); if (reduce) staticDraw(); });
  }

  /* ---------- sound technology: room tabs + frequency response ---------- */
  const tabs = $('.room-tabs');
  if (tabs) {
    const ink = $('.tab-ink', tabs);
    const tabBtns = $$('[role=tab]', tabs);
    const plan = $('.panel-plan svg');
    const rawPath = $('#curve-raw');
    const fixPath = $('#curve-fix');
    const note = $('#plan-note'), num = $('#curve-num'), txt = $('#curve-txt');

    const rooms = {
      corner: { x: 70, y: 72, note: 'Boundary gain +6 dB', num: '+7 dB', txt: 'Bass swells in a corner. Halo trims 80 Hz and 160 Hz before they reach you.', bumps: [[.217, 7, .1], [.30, 3, .08], [.62, -1.5, .07]] },
      shelf: { x: 240, y: 54, note: 'Shelf reflection +3 dB at 250 Hz', num: '+3.5 dB', txt: 'A shelf bounces the lower mids back at you. Halo notches 250 Hz and lifts 1.2 kHz.', bumps: [[.365, 3.5, .08], [.593, -2.8, .06], [.1, 1.5, .1]] },
      open: { x: 240, y: 150, note: 'Free field, no boundary', num: '−2 dB', txt: 'Mid-room, a floor bounce carves a dip near 150 Hz. Halo fills it in.', bumps: [[.29, -2.4, .05], [.8, 1.2, .1], [.15, -.8, .12]] },
    };
    const N = 90;
    const dbToY = (db) => 150 - db * 12;
    const rawValues = (room) => Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1);
      let db = .55 * Math.sin(t * 38) + .3 * Math.sin(t * 91 + 1);
      for (const [c, a, w] of room.bumps) db += a * Math.exp(-Math.pow((t - c) / w, 2));
      if (t < .04) db -= (0.04 - t) * 120;
      return db;
    });
    const fixValues = Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1);
      return .35 * Math.sin(t * 23) + (t < .035 ? -(0.035 - t) * 90 : 0) - (t > .96 ? (t - .96) * 40 : 0);
    });
    const toPath = (vals) => vals.map((db, i) => `${i ? 'L' : 'M'}${(40 + (i / (N - 1)) * 430).toFixed(1)} ${dbToY(db).toFixed(1)}`).join('');

    let current = rawValues(rooms.corner), tween = 0;
    const setRaw = (vals) => rawPath.setAttribute('d', toPath(vals));
    const restartDraw = () => { fixPath.classList.remove('is-drawn'); void fixPath.getBoundingClientRect(); fixPath.classList.add('is-drawn'); };
    fixPath.setAttribute('d', toPath(fixValues));
    setRaw(current);

    function select(key, { focus = false, instant = false } = {}) {
      const room = rooms[key];
      tabBtns.forEach((b) => { const on = b.dataset.room === key; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on) { ink.style.setProperty('--x', `${b.offsetLeft}px`); ink.style.setProperty('--w', `${b.offsetWidth}px`); if (focus) b.focus(); } });
      plan.style.setProperty('--sx', `${room.x}px`); plan.style.setProperty('--sy', `${room.y}px`);
      note.textContent = room.note; num.textContent = room.num; txt.textContent = room.txt;
      const target = rawValues(room), from = current.slice();
      cancelAnimationFrame(tween);
      if (reduce || instant) { current = target; setRaw(current); }
      else {
        const t0 = performance.now();
        const step = (now) => {
          const t = easeInOut(clamp((now - t0) / 700));
          current = from.map((v, i) => lerp(v, target[i], t));
          setRaw(current);
          if (t < 1) tween = requestAnimationFrame(step);
        };
        tween = requestAnimationFrame(step);
        restartDraw();
      }
    }
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) select(b.dataset.room); });
    tabs.addEventListener('keydown', (e) => {
      const i = tabBtns.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); select(tabBtns[(i + d + tabBtns.length) % tabBtns.length].dataset.room, { focus: true }); }
    });
    select('corner', { instant: true });
    const sync = () => select(tabBtns.find((b) => b.getAttribute('aria-selected') === 'true').dataset.room, { instant: true });
    addEventListener('resize', sync);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { fixPath.classList.add('is-drawn'); io.disconnect(); } }, { threshold: 0.3 }).observe($('.panel-curve'));
    if (reduce) fixPath.classList.add('is-drawn');
  }

  /* ---------- finishes: materials stage + pre-order swatches stay in sync ---------- */
  const finishes = {
    fjord: { name: 'Fjord', label: 'Fjord · blue-grey wool, walnut', fabric: '#6f8190', wood: '#5a3b28', hi: '#7a5239', metal: '#c9c6be' },
    chalk: { name: 'Chalk', label: 'Chalk · undyed wool, white-oiled oak', fabric: '#d9d3c6', wood: '#b58b5a', hi: '#d0a574', metal: '#b9b6ae' },
    ember: { name: 'Ember', label: 'Ember · madder-red wool, smoked walnut', fabric: '#a5513a', wood: '#4a2f20', hi: '#6a4630', metal: '#c8b69a' },
    night: { name: 'Night', label: 'Night · charcoal wool, blackened ash', fabric: '#2b2b2d', wood: '#1e1b18', hi: '#34302b', metal: '#6d6b66' },
  };
  const matStage = $('#mat-stage');
  const groups = $$('[role=radiogroup]').filter((g) => g.querySelector('[data-finish]'));
  function setFinish(key) {
    const f = finishes[key];
    matStage.style.setProperty('--fabric', f.fabric); matStage.style.setProperty('--wood', f.wood);
    matStage.style.setProperty('--wood-hi', f.hi); matStage.style.setProperty('--metal', f.metal);
    $('#mat-label').textContent = f.label;
    $('#order-finish').textContent = f.name;
    groups.forEach((g) => $$('[data-finish]', g).forEach((b) => { const on = b.dataset.finish === key; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }));
  }
  groups.forEach((g) => {
    const btns = $$('[data-finish]', g);
    g.addEventListener('click', (e) => { const b = e.target.closest('[data-finish]'); if (b) setFinish(b.dataset.finish); });
    g.addEventListener('keydown', (e) => {
      const d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      const next = btns[(i + d + btns.length) % btns.length];
      setFinish(next.dataset.finish); next.focus();
    });
  });

  /* ---------- features: equaliser, dial, rooms, battery, switch ---------- */
  const eq = $('#eq');
  if (eq) {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 44; i++) {
      const bar = document.createElement('i');
      const base = .22 + .5 * Math.sin((i / 43) * Math.PI) * (.6 + rnd() * .4);
      bar.style.setProperty('--h', base.toFixed(2));
      bar.style.setProperty('--h2', clamp(base + .18 + rnd() * .3, .1, 1).toFixed(2));
      bar.style.setProperty('--d', `${(1.1 + rnd() * 1.4).toFixed(2)}s`);
      bar.style.setProperty('--dl', `${(-rnd() * 2).toFixed(2)}s`);
      eq.appendChild(bar);
    }
  }

  const dial = $('#dial');
  if (dial) {
    const val = $('#dial-val'), tick = $('#dial-tick'), numEl = $('#dial-num');
    let v = 42, lastAngle = -135 + 0.42 * 270;
    const paint = () => {
      const a = -135 + (v / 100) * 270;
      val.setAttribute('stroke-dashoffset', (1 - v / 100).toFixed(4));
      tick.setAttribute('transform', `rotate(${a.toFixed(1)} 100 100)`);
      numEl.textContent = Math.round(v);
      dial.setAttribute('aria-valuenow', String(Math.round(v)));
    };
    const fromPointer = (e) => {
      const r = dial.getBoundingClientRect();
      let a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
      if (a > 135 || a < -135) a = lastAngle >= 0 ? 135 : -135;
      lastAngle = a; v = clamp((a + 135) / 270, 0, 1) * 100; paint();
    };
    dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); fromPointer(e); dial.focus({ preventScroll: true }); });
    dial.addEventListener('pointermove', (e) => { if (dial.hasPointerCapture(e.pointerId)) fromPointer(e); });
    dial.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 2, ArrowUp: 2, ArrowLeft: -2, ArrowDown: -2, PageUp: 10, PageDown: -10, Home: -100, End: 100 }[e.key];
      if (k === undefined) return;
      e.preventDefault(); v = clamp(v + k, 0, 100); lastAngle = -135 + (v / 100) * 270; paint();
    });
    paint();
  }

  const roomsEl = $('#rooms');
  if (roomsEl) {
    const btns = $$('.room', roomsEl);
    const title = $('#multi-title');
    const update = () => {
      const on = btns.map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? i : -1)).filter((i) => i >= 0);
      title.textContent = on.length === 0 ? 'Nothing playing' : `Playing in ${on.length} room${on.length > 1 ? 's' : ''}`;
      const first = on[0] ?? 0, last = on[on.length - 1] ?? 0;
      roomsEl.style.setProperty('--rx', (first / (btns.length - 1)).toFixed(4));
      roomsEl.style.setProperty('--rs', on.length > 1 ? ((last - first) / (btns.length - 1)).toFixed(4) : '0');
    };
    roomsEl.addEventListener('click', (e) => { const b = e.target.closest('.room'); if (!b) return; b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); update(); });
    update();
  }

  const cells = $('#cells');
  if (cells) new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { cells.classList.add('is-full'); io.disconnect(); } }, { threshold: 0.4 }).observe(cells);

  const mic = $('#mic');
  if (mic) {
    const state = $('#mic-state');
    mic.addEventListener('click', () => {
      const on = mic.getAttribute('aria-checked') !== 'true';
      mic.setAttribute('aria-checked', String(on));
      state.textContent = on ? 'Microphones on' : 'Microphones off';
    });
  }

  /* ---------- pre-order form (demo only: nothing leaves the page) ---------- */
  const form = $('#order-form');
  if (form) {
    const email = $('#email'), confirmEl = $('#confirm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      email.setAttribute('aria-invalid', String(!ok));
      if (!ok) { email.focus(); email.style.borderColor = '#e0735a'; return; }
      email.style.borderColor = '';
      confirmEl.classList.remove('is-on'); void confirmEl.offsetWidth; confirmEl.classList.add('is-on');
      $('.label', form).textContent = 'Reserved';
    });
    email.addEventListener('input', () => { email.style.borderColor = ''; email.removeAttribute('aria-invalid'); });
  }
})();
