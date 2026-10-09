/* Halo — Lydværk. Vanilla JS, no dependencies. Every reveal has a visible default; JS only enhances. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = mq.matches;
  let paused = reduced;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------------------------------------------------------------- reveal */
  const revealEls = $$('[data-reveal], .spec');
  const showAll = () => revealEls.forEach(el => el.classList.add('in'));
  if (reduced || !hasIO) {
    showAll();
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
    // Failsafe: anything already above the viewport on load (e.g. anchor jump) must not stay hidden.
    addEventListener('load', () => {
      revealEls.forEach(el => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('in'); });
    });
  }

  /* ---------------------------------------------------------------- intro */
  const heroReveals = $$('.hero [data-reveal]');
  function ready() { root.classList.add('ready'); }
  function unready() { root.classList.remove('ready'); }
  const fontsGate = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve();
  fontsGate.then(() => requestAnimationFrame(() => requestAnimationFrame(ready)));
  setTimeout(ready, 1600); // never leave the hero dark if fonts stall

  /* ---------------------------------------------------------------- motion toggle */
  const motionBtn = $('#motionBtn');
  const jobs = [];
  function setPaused(p) {
    paused = p;
    root.classList.toggle('paused', p);
    motionBtn.textContent = p ? 'Play motion' : 'Pause motion';
    motionBtn.setAttribute('aria-pressed', String(p));
    jobs.forEach(j => (j.dirty = true));
  }
  motionBtn.addEventListener('click', () => setPaused(!paused));
  root.classList.toggle('paused', paused);
  if (paused) { motionBtn.textContent = 'Play motion'; motionBtn.setAttribute('aria-pressed', 'true'); }

  $('#replayBtn').addEventListener('click', () => {
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    unready();
    heroReveals.forEach(el => el.classList.remove('in'));
    void root.offsetWidth;
    setTimeout(() => { ready(); heroReveals.forEach(el => el.classList.add('in')); }, reduced ? 50 : 700);
  });

  /* ---------------------------------------------------------------- canvas job runner */
  function addJob(el, draw, opts = {}) {
    const job = { el, draw, t: opts.t0 || 0, visible: false, dirty: true, ...opts };
    jobs.push(job);
    if (hasIO) {
      new IntersectionObserver(es => es.forEach(e => { job.visible = e.isIntersecting; if (e.isIntersecting) job.dirty = true; }), { rootMargin: '80px' }).observe(el);
    } else job.visible = true;
    return job;
  }
  function fitCanvas(c) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const j of jobs) {
      if (!j.visible) continue;
      if (paused && !j.dirty) continue;
      if (!paused) j.t += dt;
      j.dirty = false;
      j.draw(j.t, dt);
    }
    scrollTasks();
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------- hero rings */
  const hero = $('.hero');
  const heroObj = $('.hero-object');
  const heroCanvas = $('.hero-canvas');
  addJob(heroCanvas, (t) => {
    const { ctx, w, h } = fitCanvas(heroCanvas);
    ctx.clearRect(0, 0, w, h);
    const hr = hero.getBoundingClientRect();
    const or = heroObj.getBoundingClientRect();
    const cx = or.left - hr.left + or.width * 0.5;
    const cy = or.top - hr.top + or.height * (130 / 560);
    const r0 = or.width * (101 / 400);
    const maxR = Math.hypot(w, h) * 0.8;
    const n = 7, period = 1.7, cycle = n * period;
    for (let i = 0; i < n; i++) {
      const age = ((t + i * period) % cycle) / cycle;
      const r = r0 + (1 - Math.pow(1 - age, 2.2)) * maxR;
      const a = Math.pow(1 - age, 1.7) * 0.4;
      ctx.strokeStyle = `rgba(232,163,92,${a.toFixed(3)})`;
      ctx.lineWidth = 0.8 + (1 - age) * 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.282, 0, 0, TAU);
      ctx.stroke();
    }
  }, { t0: 2.2 });

  // pointer parallax on the hero object
  let px = 0, py = 0, tpx = 0, tpy = 0;
  if (!reduced && matchMedia('(hover:hover)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      tpx = (e.clientX - r.left) / r.width - 0.5;
      tpy = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener('pointerleave', () => { tpx = 0; tpy = 0; });
  }
  const heroGiant = $('.hero-giant');

  /* ---------------------------------------------------------------- statement word scrub */
  const stEl = $('#statement');
  const words = [];
  (function splitWords() {
    const text = stEl.textContent.trim().split(/\s+/);
    stEl.textContent = '';
    text.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w'; s.textContent = w;
      stEl.appendChild(s);
      if (i < text.length - 1) stEl.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  })();

  /* ---------------------------------------------------------------- object (pinned zoom) */
  const track = $('#objTrack');
  const zoom = $('#objZoom');
  const steps = $$('.obj-step');
  const dots = $$('#objDots i');
  const objNo = $('#objNo');
  // camera: [pointX, pointY (fractions of speaker box), scale]
  const cams = [[0.5, 0.5, 1], [0.5, 0.232, 2.5], [0.5, 0.56, 3.2], [0.5, 0.8, 2.3]];
  let activeStep = 0;
  function objectUpdate() {
    const r = track.getBoundingClientRect();
    const total = r.height - innerHeight;
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const p = clamp(-r.top / total);
    const f = p * (cams.length - 1);
    const i = Math.min(cams.length - 2, Math.floor(f));
    let t = f - i;
    t = reduced ? Math.round(t) : smooth(clamp((t - 0.18) / 0.64));
    const a = cams[i], b = cams[i + 1];
    const s = lerp(a[2], b[2], t), pxx = lerp(a[0], b[0], t), pyy = lerp(a[1], b[1], t);
    zoom.style.transform = `translate(${(-(pxx - 0.5) * s * 100).toFixed(2)}%, ${(-(pyy - 0.5) * s * 100).toFixed(2)}%) scale(${s.toFixed(3)})`;
    const idx = Math.round(f);
    if (idx !== activeStep) {
      activeStep = idx;
      steps.forEach((el, k) => el.classList.toggle('on', k === idx));
      objNo.textContent = `0${idx + 1} / 04`;
    }
    dots.forEach((d, k) => d.style.setProperty('--f', clamp(f - k + 1).toFixed(3)));
  }

  /* ---------------------------------------------------------------- scroll tasks */
  const nav = $('#nav');
  const bar = $('.progress');
  let lastY = -1, lastW = 0, lastH = 0, navY = 0;
  function scrollTasks() {
    const y = scrollY;
    // pointer parallax easing
    px = lerp(px, tpx, 0.06); py = lerp(py, tpy, 0.06);
    if (!reduced) {
      heroObj.style.translate = `${(px * -14).toFixed(2)}px ${(py * -10 - Math.min(y, 800) * 0.04).toFixed(2)}px`;
      heroGiant.style.transform = `translate3d(${(px * 22).toFixed(1)}px, ${(Math.min(y, 1200) * 0.18).toFixed(1)}px, 0)`;
    }
    if (y === lastY && innerWidth === lastW && innerHeight === lastH) return;
    lastY = y; lastW = innerWidth; lastH = innerHeight;
    const doc = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${doc > 0 ? clamp(y / doc) : 0})`;
    if (y > 240 && y > navY + 4) nav.classList.add('hide');
    else if (y < navY - 4 || y < 240) nav.classList.remove('hide');
    navY = y;
    // statement
    if (!reduced) {
      const r = stEl.getBoundingClientRect();
      const p = clamp((innerHeight * 0.88 - r.top) / (r.height + innerHeight * 0.3));
      const N = words.length;
      words.forEach((w, i) => { w.style.opacity = (0.22 + 0.78 * clamp((p * (N + 10) - i) / 7)).toFixed(3); });
    }
    objectUpdate();
  }

  /* ---------------------------------------------------------------- colourways */
  const colours = {
    chalk: { name: 'Chalk', body: '#cfc8ba', plate: '#8f897d' },
    fjord: { name: 'Fjord', body: '#43565f', plate: '#262f34' },
    moss: { name: 'Moss', body: '#5c6650', plate: '#2f3429' },
    ember: { name: 'Ember', body: '#a65a3c', plate: '#4a2a1c' }
  };
  const groups = $$('[data-swatches]');
  function setColour(key) {
    const c = colours[key]; if (!c) return;
    root.style.setProperty('--body', c.body);
    root.style.setProperty('--plate', c.plate);
    groups.forEach(g => $$('.sw', g).forEach(b => b.setAttribute('aria-checked', String(b.dataset.colour === key))));
    $('#matName').textContent = c.name;
    $('#orderColour').textContent = c.name;
    currentColour = key;
  }
  let currentColour = 'chalk';
  groups.forEach(g => {
    const btns = $$('.sw', g);
    btns.forEach((b, i) => {
      b.addEventListener('click', () => setColour(b.dataset.colour));
      b.addEventListener('keydown', e => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
        e.preventDefault();
        const d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        const nb = btns[(i + d + btns.length) % btns.length];
        nb.focus(); setColour(nb.dataset.colour);
      });
    });
  });

  /* ---------------------------------------------------------------- room simulation */
  const roomCanvas = $('#roomCanvas');
  const roomPanel = $('#roomPanel');
  const rooms = {
    studio: { w: 0.5, h: 0.64, name: 'Studio · 3.6 × 3.2 m' },
    living: { w: 0.76, h: 0.78, name: 'Living room · 5.2 × 4.1 m' },
    open: { w: 0.96, h: 0.9, name: 'Open plan · 8.4 × 5.6 m' }
  };
  const room = { key: 'living', w: rooms.living.w, h: rooms.living.h, u: 0.36, v: 0.55, k: 1, target: 1 };
  const calBtn = $('#calBtn'), calLabel = $('#calLabel');
  const respLine = $('#respLine'), respArea = $('#respArea'), respGhost = $('#respGhost');
  const respRead = $('#respRead'), respState = $('#respState');
  const bumps = [[70, 34, 26], [150, -28, 22], [260, 20, 30], [420, -22, 28], [520, 14, 24]];
  function curve(k) {
    let d = '';
    for (let x = 0; x <= 600; x += 5) {
      let y = 110;
      for (const [c, a, wd] of bumps) y -= k * a * Math.exp(-Math.pow((x - c) / wd, 2));
      y += Math.sin(x * 0.09) * (1 + 3 * k) * 0.5;
      d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
    }
    return d;
  }
  respGhost.setAttribute('d', curve(1));
  let lastK = -1;
  function updateResp() {
    if (Math.abs(room.k - lastK) < 0.002) return;
    lastK = room.k;
    const d = curve(room.k);
    respLine.setAttribute('d', d);
    respArea.setAttribute('d', d + 'L600 200L0 200Z');
    respRead.textContent = '±' + (1.2 + 5.6 * room.k).toFixed(1) + ' dB';
    const moving = Math.abs(room.k - room.target) > 0.01;
    respState.textContent = moving ? 'Measuring…' : (room.target === 0 ? 'Calibrated' : 'Uncorrected');
  }
  function setCal(on) {
    room.target = on ? 0 : 1;
    calBtn.setAttribute('aria-pressed', String(on));
    calLabel.textContent = on ? 'Calibrated to this room' : 'Calibrate to this room';
    roomJob.dirty = true;
  }
  calBtn.addEventListener('click', () => setCal(room.target !== 0));
  const roomName = $('#roomName');
  $$('#roomSeg button').forEach(b => b.addEventListener('click', () => {
    room.key = b.dataset.room;
    $$('#roomSeg button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    roomName.textContent = rooms[room.key].name;
    setCal(false);
    roomJob.dirty = true;
  }));
  roomName.textContent = rooms.living.name;

  const seats = [[0.18, 0.82], [0.8, 0.24], [0.82, 0.8], [0.12, 0.22]];
  const th0 = -0.6;
  const dirGain = (th, k) => 1 - k * 0.62 * (0.5 + 0.5 * Math.cos(th - th0));
  const roomJob = addJob(roomCanvas, (t, dt) => {
    const { ctx, w: W, h: H } = fitCanvas(roomCanvas);
    // tween room size & calibration
    const tr = rooms[room.key];
    const ease = reduced && paused ? 1 : 1 - Math.exp(-dt * 7);
    if (Math.abs(room.w - tr.w) + Math.abs(room.h - tr.h) > 0.001) { room.w = lerp(room.w, tr.w, ease || 1); room.h = lerp(room.h, tr.h, ease || 1); roomJob.dirty = true; }
    else { room.w = tr.w; room.h = tr.h; }
    if (Math.abs(room.k - room.target) > 0.001) {
      const step = (dt || 0.016) * 0.55;
      room.k = room.k < room.target ? Math.min(room.target, room.k + step) : Math.max(room.target, room.k - step);
      roomJob.dirty = true;
    } else room.k = room.target;
    updateResp();

    ctx.clearRect(0, 0, W, H);
    const rw = W * room.w, rh = H * room.h;
    const rx = (W - rw) / 2, ry = (H - rh) / 2;
    const sx = rx + room.u * rw, sy = ry + room.v * rh;
    const scale = Math.min(W, H) / 380;
    const Rmax = Math.hypot(rw, rh) * 1.05;
    const gap = Rmax / 7;
    const speed = 78 * scale;

    // room floor
    ctx.save();
    ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 12); ctx.clip();
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Rmax * 0.6);
    g.addColorStop(0, 'rgba(232,163,92,0.16)'); g.addColorStop(1, 'rgba(232,163,92,0)');
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);

    const sources = [[sx, sy, 1], [2 * rx - sx, sy, 0.4], [2 * (rx + rw) - sx, sy, 0.4], [sx, 2 * ry - sy, 0.4], [sx, 2 * (ry + rh) - sy, 0.4]];
    sources.forEach(([ox, oy, wt], si) => {
      const segs = si === 0 ? 60 : 30;
      for (let i = 0; i < 7; i++) {
        const r = (t * speed + i * gap) % Rmax;
        const base = Math.pow(1 - r / Rmax, 1.5) * wt;
        if (base < 0.01 || r < 4) continue;
        ctx.lineWidth = si === 0 ? 1.6 : 1.1;
        for (let s = 0; s < segs; s++) {
          const a0 = (s / segs) * TAU, a1 = ((s + 1.05) / segs) * TAU;
          const a = base * dirGain((a0 + a1) / 2, room.k) * 0.85;
          ctx.strokeStyle = `rgba(232,163,92,${a.toFixed(3)})`;
          ctx.beginPath(); ctx.arc(ox, oy, r, a0, a1); ctx.stroke();
        }
      }
    });
    // calibration sweep
    if (room.target === 0 && room.k > 0.001) {
      const pr = 1 - room.k;
      ctx.strokeStyle = `rgba(236,230,218,${(0.7 * (1 - pr)).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, pr * Rmax, 0, TAU); ctx.stroke();
    }
    // furniture
    ctx.strokeStyle = 'rgba(236,230,218,0.2)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(rx + rw * 0.1, ry + rh - 26 * scale - 6, rw * 0.34, 26 * scale, 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx + rw * 0.76, ry + rh * 0.52, 15 * scale, 0, TAU); ctx.stroke();
    ctx.restore();

    // walls
    ctx.strokeStyle = 'rgba(236,230,218,0.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 12); ctx.stroke();

    // listeners: brightness reveals how evenly the room is covered
    seats.forEach(([u, v]) => {
      const lx = rx + u * rw, ly = ry + v * rh;
      const th = Math.atan2(ly - sy, lx - sx);
      const gain = dirGain(th, room.k);
      ctx.fillStyle = `rgba(236,230,218,${(0.25 + 0.75 * gain).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(lx, ly, (3 + 3 * gain) * Math.max(0.8, scale), 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(236,230,218,${(0.5 * gain).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(lx, ly, (7 + 6 * gain) * Math.max(0.8, scale), 0, TAU); ctx.stroke();
    });

    // speaker
    ctx.save();
    ctx.shadowColor = 'rgba(232,163,92,0.9)'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#1f1c19'; ctx.strokeStyle = '#e8a35c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, 13 * Math.max(0.8, scale), 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ece6da'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, TAU); ctx.fill();
  }, { t0: 1.4 });

  // drag the speaker
  let dragging = false;
  function moveSpeaker(e) {
    const r = roomCanvas.getBoundingClientRect();
    const rw = r.width * room.w, rh = r.height * room.h;
    const rx = (r.width - rw) / 2, ry = (r.height - rh) / 2;
    room.u = clamp((e.clientX - r.left - rx) / rw, 0.07, 0.93);
    room.v = clamp((e.clientY - r.top - ry) / rh, 0.09, 0.91);
    roomJob.dirty = true;
  }
  roomPanel.addEventListener('pointerdown', e => { dragging = true; roomPanel.classList.add('drag'); roomPanel.setPointerCapture(e.pointerId); moveSpeaker(e); });
  roomPanel.addEventListener('pointermove', e => { if (dragging) moveSpeaker(e); });
  const endDrag = () => { dragging = false; roomPanel.classList.remove('drag'); };
  roomPanel.addEventListener('pointerup', endDrag);
  roomPanel.addEventListener('pointercancel', endDrag);

  /* ---------------------------------------------------------------- volume dial */
  const vol = $('#vol'), volArc = $('#volArc'), volDot = $('#volDot'), volNum = $('#volNum');
  let volV = 0.46;
  function setVol(v) {
    volV = clamp(v);
    volArc.setAttribute('stroke-dasharray', `${(volV * 565.5).toFixed(1)} 566`);
    const a = volV * TAU - Math.PI / 2;
    volDot.setAttribute('cx', (110 + 90 * Math.cos(a)).toFixed(1));
    volDot.setAttribute('cy', (110 + 90 * Math.sin(a)).toFixed(1));
    volNum.textContent = Math.round(volV * 100);
    vol.setAttribute('aria-valuenow', Math.round(volV * 100));
  }
  function volFromEvent(e) {
    const r = vol.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    let v = (Math.atan2(dx, -dy) + TAU) % TAU / TAU;
    if (volV > 0.75 && v < 0.25) v = 1;
    else if (volV < 0.25 && v > 0.75) v = 0;
    setVol(v);
  }
  let volDrag = false;
  vol.addEventListener('pointerdown', e => { volDrag = true; vol.setPointerCapture(e.pointerId); volFromEvent(e); });
  vol.addEventListener('pointermove', e => { if (volDrag) volFromEvent(e); });
  vol.addEventListener('pointerup', () => (volDrag = false));
  vol.addEventListener('pointercancel', () => (volDrag = false));
  vol.addEventListener('keydown', e => {
    const m = { ArrowRight: 0.02, ArrowUp: 0.02, ArrowLeft: -0.02, ArrowDown: -0.02, PageUp: 0.1, PageDown: -0.1 };
    if (e.key in m) { e.preventDefault(); setVol(volV + m[e.key]); }
    if (e.key === 'Home') { e.preventDefault(); setVol(0); }
    if (e.key === 'End') { e.preventDefault(); setVol(1); }
  });
  setVol(volV);

  /* ---------------------------------------------------------------- battery + counters */
  const battArc = $('#battArc');
  if (hasIO && !reduced) {
    battArc.setAttribute('stroke-dashoffset', '503');
    const bio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { battArc.setAttribute('stroke-dashoffset', '42'); bio.disconnect(); }
    }), { threshold: 0.4 });
    bio.observe(battArc);
  } else battArc.setAttribute('stroke-dashoffset', '42');

  function countUp(el) {
    const target = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    const t0 = performance.now(), dur = 1700;
    (function step(now) {
      const p = clamp((now - t0) / dur);
      el.textContent = (target * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p))).toFixed(dec);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target.toFixed(dec);
    })(t0);
  }
  if (hasIO && !reduced) {
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
    }), { threshold: 0.6 });
    $$('[data-count]').forEach(el => { cio.observe(el); });
  }

  /* ---------------------------------------------------------------- tiles, magnetic buttons */
  $$('.tile').forEach(t => t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  if (!reduced && matchMedia('(hover:hover)').matches) {
    $$('.btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------------- order form (client-side preview only) */
  const form = $('#orderForm'), email = $('#orderEmail'), status = $('#orderStatus');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      status.textContent = 'Please enter a valid email address.';
      status.style.color = '#e07a5f';
      email.focus();
      return;
    }
    status.style.color = '';
    status.textContent = `Noted: a Halo in ${colours[currentColour].name} for ${v}. Launch preview, nothing was sent.`;
  });

  /* ---------------------------------------------------------------- go */
  setColour('chalk');
  scrollTasks();
  requestAnimationFrame(tick);
  addEventListener('resize', () => { jobs.forEach(j => (j.dirty = true)); lastY = -1; });
  if (location.hash) setTimeout(() => lastY = -1, 50);
})();
