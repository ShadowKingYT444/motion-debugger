/* Halo 02 — page behaviour. Dependency-free. Pairs with assets/motion-kit.js (reveals, counters, magnetic, tilt, spotlight). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => reduceMq.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const mobile = () => innerWidth <= 760;

  /* ---------- visibility helper: run a loop only while an element is on screen ---------- */
  function whenVisible(el, on, off, margin = '120px') {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? on() : off && off())), { rootMargin: margin }).observe(el);
  }

  /* =====================================================================
     SPEAKER component (five cylindrical segments; also used for the anatomy)
     ===================================================================== */
  function speakerHTML(labels) {
    const L = (t) => (labels ? `<b class="lbl">${t}</b>` : '');
    return `<div class="xv"><div class="floor"></div>
      <div class="seg seg-a"><i class="top"></i><span class="halo-line"></span><span class="halo-glow"></span>${L('01 Touch ring')}</div>
      <div class="seg seg-b"><i class="top"></i>${L('02 Waveguide')}</div>
      <div class="seg seg-c"><i class="top"></i>${L('03 Knit sleeve')}</div>
      <div class="seg seg-d"><i class="top"></i>${L('04 Woofer')}</div>
      <div class="seg seg-e"><i class="top"></i>${L('05 Base')}</div></div>`;
  }
  $$('[data-speaker]').forEach((el) => { el.innerHTML = speakerHTML(el.hasAttribute('data-labels')); });

  /* =====================================================================
     HERO: floor rings in perspective, pointer lean, tap-to-pulse
     ===================================================================== */
  function initHero() {
    const cv = $('#rings'), hero = $('.hero'), anchor = $('.hero-anchor'), spk = $('.hero-spk'), stage = $('.hero-stage');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, running = false, last = 0, t = 0, nextAuto = 0.9;
    const pulses = [];
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    const SQ = 0.26;

    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const sc = mobile() ? clamp((stage.clientHeight * 0.86) / 440, 0.5, 1) : clamp((innerHeight * 0.6) / 440, 0.7, 1.45);
      spk.style.setProperty('--sc', sc.toFixed(3));
      const a = anchor.getBoundingClientRect();
      cx = a.left - r.left; cy = a.top - r.top;
      if (reduce()) draw(0);
    }
    function spawn(strength = 1, x = cx, y = cy) { pulses.push({ t0: t, s: strength, x, y }); if (pulses.length > 12) pulses.shift(); }

    function draw(dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const maxR = Math.max(W * 0.75, 760);
      // guide rings: the floor plan of the room
      for (let i = 1; i <= 9; i++) {
        const r = 70 * Math.pow(i, 1.28);
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * SQ, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(242,237,228,${Math.max(0.012, 0.062 - i * 0.0055)})`; ctx.lineWidth = 1; ctx.stroke();
      }
      for (const p of pulses) {
        const age = (t - p.t0) / 6.2;
        if (age < 0 || age > 1) continue;
        const r = maxR * easeOut(age);
        const a = Math.pow(1 - age, 1.6) * 0.6 * p.s;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * SQ, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245,201,135,${a.toFixed(3)})`; ctx.lineWidth = 1 + (1 - age) * 1.6; ctx.stroke();
      }
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;
      if (t > nextAuto) { spawn(1); nextAuto = t + 2.1; }
      while (pulses.length && t - pulses[0].t0 > 6.4) pulses.shift();
      lean.x += (lean.tx - lean.x) * (1 - Math.exp(-dt * 4)); lean.y += (lean.ty - lean.y) * (1 - Math.exp(-dt * 4));
      spk.style.transform = `translate3d(${lean.x.toFixed(2)}px, ${lean.y.toFixed(2)}px, 0)`;
      draw(dt);
      requestAnimationFrame(frame);
    }
    function start() { if (running || reduce()) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }

    size();
    addEventListener('resize', size);
    if (reduce()) { pulses.push({ t0: -1.2, s: 1, x: cx, y: cy }, { t0: -2.8, s: 0.8, x: cx, y: cy }); t = 0; draw(0); return; }
    whenVisible(hero, start, stop, '0px');
    cv.addEventListener('pointerdown', (e) => {
      const r = hero.getBoundingClientRect();
      spawn(1.15); spawn(0.55, e.clientX - r.left, e.clientY - r.top);
    });
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      lean.tx = (e.clientX / innerWidth - 0.5) * -16; lean.ty = (e.clientY / innerHeight - 0.5) * -8;
    });
    hero.addEventListener('pointerleave', () => { lean.tx = 0; lean.ty = 0; });
  }

  /* =====================================================================
     ANATOMY (pinned): scroll progress drives --q (explode) and the active step
     ===================================================================== */
  const anatomy = (() => {
    const sec = $('.anatomy');
    if (!sec) return () => {};
    const xv = $('.a-device .xv'), segs = $$('.seg', xv), steps = $$('.astep', sec), rail = $$('.a-rail span', sec), wrap = $('.xv-wrap', sec);
    let active = -1;
    function fit() {
      const vh = innerHeight;
      const avail = mobile() ? vh * 0.52 - 24 : vh - 130;
      wrap.style.setProperty('--asc', clamp(avail / 640, 0.4, 1.05).toFixed(3));
    }
    fit(); addEventListener('resize', fit);
    return function update(vh) {
      if (reduce()) return;
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh), 0, 1);
      const spread = smooth((p - 0.02) / 0.16) * (1 - smooth((p - 0.9) / 0.08));
      xv.style.setProperty('--q', spread.toFixed(3));
      const idx = p < 0.12 ? 0 : p > 0.88 ? 6 : 1 + Math.min(4, Math.floor(((p - 0.12) / 0.76) * 5));
      if (idx !== active) {
        active = idx;
        const layer = idx >= 1 && idx <= 5 ? idx - 1 : -1;
        steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
        segs.forEach((s, i) => s.classList.toggle('on', i === layer));
        rail.forEach((s, i) => s.classList.toggle('on', i === idx - 1));
        xv.classList.toggle('dimming', layer >= 0);
        xv.style.setProperty('--halo-on', layer === -1 || layer === 0 ? '1' : '0.5');
      }
    };
  })();

  /* ---------- manifesto: words light up as you read ---------- */
  const manifesto = (() => {
    const m = $('#manifesto');
    if (!m) return () => {};
    const words = m.textContent.trim().split(/\s+/);
    m.setAttribute('aria-label', words.join(' '));
    m.innerHTML = words.map((w, i) => `<span class="w${/^(disappear|larger)/.test(w) ? ' em' : ''}" aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
    return function update(vh) {
      if (reduce()) { m.style.setProperty('--p', 1); return; }
      const r = m.getBoundingClientRect();
      m.style.setProperty('--p', clamp((vh * 0.86 - r.top) / (vh * 0.34 + r.height), 0, 1).toFixed(3));
    };
  })();

  /* ---------- materials: vertical scroll drives a horizontal track ---------- */
  const hscroll = (() => {
    const hs = $('#hs'), track = $('#hs-track');
    if (!hs) return () => {};
    const measure = () => { track.style.setProperty('--travel', Math.max(0, track.scrollWidth - innerWidth) + 'px'); };
    measure(); addEventListener('resize', measure); addEventListener('load', measure);
    return function update(vh) {
      if (mobile() || reduce()) return;
      const r = hs.getBoundingClientRect();
      track.style.setProperty('--p', clamp(-r.top / (r.height - vh), 0, 1).toFixed(4));
    };
  })();

  /* ---------- one rAF-throttled scroll loop ---------- */
  const bar = $('.progress');
  let queued = false;
  function frame() {
    queued = false;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.setProperty('--page', max > 0 ? clamp(scrollY / max, 0, 1).toFixed(4) : 0);
    anatomy(vh); manifesto(vh); hscroll(vh);
  }
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();

  /* =====================================================================
     SLIDING TABS
     ===================================================================== */
  function initTabs(group, onChange) {
    const ink = $('.tab-ink', group), tabs = $$('[role=tab]', group);
    const move = (tab) => { ink.style.setProperty('--x', tab.offsetLeft - 4 + 'px'); ink.style.setProperty('--w', tab.offsetWidth + 'px'); };
    const select = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      move(tab); if (focus) tab.focus(); onChange(+tab.dataset.mode);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true); }
      });
    });
    const sel = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    ink.style.transition = 'none'; select(sel); ink.getBoundingClientRect(); ink.style.transition = '';
    addEventListener('resize', () => { const s = tabs.find((t) => t.getAttribute('aria-selected') === 'true'); ink.style.transition = 'none'; move(s); ink.getBoundingClientRect(); ink.style.transition = ''; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { const s = tabs.find((t) => t.getAttribute('aria-selected') === 'true'); ink.style.transition = 'none'; move(s); ink.getBoundingClientRect(); ink.style.transition = ''; });
  }

  /* =====================================================================
     SOUND: top-down room with wavefronts and five listeners
     ===================================================================== */
  function initRoom() {
    const cv = $('#room');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const spreadEl = $('#spread'), hint = $('#room-hint');
    const FACE = Math.PI / 2; // conventional speaker faces the sofa (down)
    const listeners = [{ x: 0.17, y: 0.26, n: 'A' }, { x: 0.83, y: 0.24, n: 'B' }, { x: 0.88, y: 0.7, n: 'C' }, { x: 0.52, y: 0.9, n: 'D' }, { x: 0.12, y: 0.72, n: 'E' }].map((l) => ({ ...l, b: 0.5 }));
    const S = { d: 1, target: 1, sx: 0.5, sy: 0.4, tx: 0.5, ty: 0.4, drag: false, moved: false, spread: 1.4, pulses: [], acc: 0.9, t: 0 };
    let W = 0, H = 0, dpr = 1, running = false, last = 0;
    const pad = 20;
    const px = (nx) => pad + nx * (W - pad * 2), py = (ny) => pad + ny * (H - pad * 2);
    const amp = (th) => lerp(0.1 + 0.9 * Math.pow((1 + Math.cos(th - FACE)) / 2, 1.7), 1, S.d);

    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      draw(0);
    }
    function roomPath() {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad, pad, W - pad * 2, H - pad * 2, 18); else ctx.rect(pad, pad, W - pad * 2, H - pad * 2);
    }
    function draw(dt) {
      if (!W) return;
      if (reduce()) { S.d = S.target; S.sx = S.tx; S.sy = S.ty; }
      else {
        S.d += (S.target - S.d) * (1 - Math.exp(-dt * 6));
        const k = 1 - Math.exp(-dt * 12); S.sx += (S.tx - S.sx) * k; S.sy += (S.ty - S.sy) * k;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // room, rug, sofa, table (quiet line drawing)
      roomPath(); ctx.fillStyle = 'rgba(255,255,255,.018)'; ctx.fill(); ctx.strokeStyle = 'rgba(242,237,228,.22)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(242,237,228,.09)'; ctx.setLineDash([3, 6]); ctx.strokeRect(px(0.22), py(0.2), px(0.78) - px(0.22), py(0.76) - py(0.2)); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(242,237,228,.14)'; ctx.strokeRect(px(0.36), py(0.93), px(0.68) - px(0.36), py(0.99) - py(0.93));
      ctx.beginPath(); ctx.arc(px(0.5), py(0.66), 16, 0, Math.PI * 2); ctx.stroke();

      const cx = px(S.sx), cy = py(S.sy);
      // wavefronts
      ctx.save(); roomPath(); ctx.clip();
      if (!reduce()) {
        S.t += dt; S.acc += dt;
        if (S.acc > 0.95) { S.acc = 0; S.pulses.push(0); }
      } else if (!S.pulses.length) S.pulses.push(0.7, 1.5, 2.3);
      const speed = (W - pad * 2) * 0.28, life = 3.6, N = 120;
      for (let i = 0; i < S.pulses.length; i++) {
        if (!reduce()) S.pulses[i] += dt;
        const age = S.pulses[i];
        if (age > life) continue;
        const r = Math.max(2, age * speed), fade = Math.pow(1 - age / life, 1.2);
        for (let j = 0; j < N; j++) {
          const a0 = (j / N) * Math.PI * 2, a1 = ((j + 1.2) / N) * Math.PI * 2, am = (a0 + a1) / 2;
          const a = amp(am) * fade * 0.62;
          if (a < 0.015) continue;
          ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1);
          ctx.strokeStyle = `rgba(245,201,135,${a.toFixed(3)})`; ctx.lineWidth = 1.6; ctx.stroke();
        }
      }
      if (!reduce()) S.pulses = S.pulses.filter((a) => a <= life);
      ctx.restore();

      // listeners
      let lo = 99, hi = -99;
      for (const l of listeners) {
        const lx = px(l.x), ly = py(l.y), dx = lx - cx, dy = ly - cy, dist = Math.hypot(dx, dy) / (W - pad * 2);
        const a = amp(Math.atan2(dy, dx));
        const level = a / (1 + dist * 2.4 * (1 - 0.65 * S.d));
        const db = 20 * Math.log10(level); lo = Math.min(lo, db); hi = Math.max(hi, db);
        const b = clamp(level * 1.15, 0.06, 1);
        l.b += (b - l.b) * (reduce() ? 1 : 1 - Math.exp(-dt * 8));
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14 + l.b * 26);
        g.addColorStop(0, `rgba(245,201,135,${(0.15 + l.b * 0.7).toFixed(3)})`); g.addColorStop(1, 'rgba(245,201,135,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 14 + l.b * 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(242,237,228,${(0.35 + l.b * 0.65).toFixed(3)})`; ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.font = '500 11px "Inter Tight", sans-serif'; ctx.fillStyle = 'rgba(242,237,228,.55)'; ctx.textAlign = 'center';
        ctx.fillText(l.n, lx, ly - 14 - 0);
      }
      const spread = hi - lo;
      S.spread += (spread - S.spread) * (reduce() ? 1 : 1 - Math.exp(-dt * 7));
      spreadEl.textContent = S.spread.toFixed(1);

      // speaker (top view) + facing wedge for the conventional mode
      if (S.d < 0.99) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(FACE); ctx.globalAlpha = 1 - S.d;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 54, -0.7, 0.7); ctx.closePath();
        ctx.fillStyle = 'rgba(245,201,135,.14)'; ctx.fill(); ctx.restore();
      }
      if (!S.moved && !reduce()) {
        ctx.beginPath(); ctx.arc(cx, cy, 24 + Math.sin(S.t * 3) * 3, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(242,237,228,.28)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fillStyle = '#1b1815'; ctx.fill();
      ctx.strokeStyle = '#f5c987'; ctx.lineWidth = 2.6; ctx.shadowColor = 'rgba(245,201,135,.8)'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = '#6b665c'; ctx.fill();
    }
    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      draw(dt); requestAnimationFrame(loop);
    }
    const start = () => { if (running || reduce()) return; running = true; last = performance.now(); requestAnimationFrame(loop); };
    const stop = () => { running = false; };

    const toNorm = (e) => { const r = cv.getBoundingClientRect(); return [clamp(((e.clientX - r.left) - pad) / (r.width - pad * 2), 0.06, 0.94), clamp(((e.clientY - r.top) - pad) / (r.height - pad * 2), 0.08, 0.92)]; };
    const markMoved = () => { if (!S.moved) { S.moved = true; hint.textContent = 'Move it anywhere'; } };
    cv.addEventListener('pointerdown', (e) => { S.drag = true; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); [S.tx, S.ty] = toNorm(e); markMoved(); if (reduce()) draw(0); });
    cv.addEventListener('pointermove', (e) => { if (!S.drag) return; [S.tx, S.ty] = toNorm(e); if (reduce()) draw(0); });
    const end = () => { S.drag = false; cv.classList.remove('dragging'); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04] }[e.key];
      if (!d) return; e.preventDefault(); S.tx = clamp(S.tx + d[0], 0.06, 0.94); S.ty = clamp(S.ty + d[1], 0.08, 0.92); markMoved(); if (reduce()) draw(0);
    });

    initTabs($('.tabs'), (mode) => { S.target = mode; if (reduce()) draw(0); });
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv); else addEventListener('resize', size);
    whenVisible(cv, start, stop);
  }

  /* =====================================================================
     FEATURES
     ===================================================================== */
  // room correction curve: morphs between the raw room and the tuned response
  function initTune() {
    const path = $('#curve-path'), btn = $('#tune-btn'), note = $('#curve-note');
    if (!path) return;
    const N = 60, raw = [], tuned = [];
    const g = (i, c, w) => Math.exp(-((i - c) ** 2) / w);
    for (let i = 0; i < N; i++) {
      tuned[i] = 85 + 2.6 * Math.sin(i * 0.52) + 1.8 * Math.sin(i * 1.3 + 1);
      raw[i] = clamp(tuned[i] + 34 * g(i, 7, 9) - 30 * g(i, 13, 5) + 15 * g(i, 24, 16) - 14 * g(i, 41, 22) + 6 * Math.sin(i * 2.1) + 4 * Math.sin(i * 4.7), 10, 160);
    }
    let t = 0, target = 0, running = false, last = 0;
    function render() {
      let d = '', lo = 999, hi = -999;
      for (let i = 0; i < N; i++) {
        const y = lerp(raw[i], tuned[i], t); lo = Math.min(lo, y); hi = Math.max(hi, y);
        d += (i ? 'L' : 'M') + ((i / (N - 1)) * 480).toFixed(1) + ' ' + y.toFixed(1);
      }
      path.setAttribute('d', d);
      const dev = ((hi - lo) / 2) * 0.2;
      note.textContent = (t > 0.5 ? 'Tuned' : 'Untuned') + ': ±' + dev.toFixed(1) + ' dB at this spot.' + (t < 0.02 ? ' Press the button.' : '');
    }
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      t += (target - t) * (1 - Math.exp(-dt * 2.6));
      if (Math.abs(target - t) < 0.002) { t = target; running = false; }
      render(); if (running) requestAnimationFrame(loop);
    }
    function go(v) {
      target = v; btn.setAttribute('aria-pressed', v === 1); btn.textContent = v ? 'Reset' : 'Tune this room';
      if (reduce()) { t = target; render(); return; }
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    }
    btn.addEventListener('click', () => go(target ? 0 : 1));
    render();
    let done = false;
    whenVisible($('.t-tune'), () => { if (done) return; done = true; setTimeout(() => go(1), 1500); }, null, '-20%');
  }

  // touch-ring dial
  function initDial() {
    const dial = $('#dial');
    if (!dial) return;
    const out = $('#dial-out');
    let v = 42;
    const set = (n) => { v = clamp(Math.round(n), 0, 100); dial.style.setProperty('--v', v); dial.setAttribute('aria-valuenow', v); out.textContent = v; };
    const fromPointer = (e) => {
      const r = dial.getBoundingClientRect();
      const deg = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
      let a = (deg - 135 + 360) % 360;
      if (a > 270) a = a < 315 ? 270 : 0;
      set(a / 2.7);
    };
    dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); dial.classList.add('dragging'); dial.dataset.drag = '1'; fromPointer(e); });
    dial.addEventListener('pointermove', (e) => { if (dial.dataset.drag) fromPointer(e); });
    const end = () => { delete dial.dataset.drag; dial.classList.remove('dragging'); };
    dial.addEventListener('pointerup', end); dial.addEventListener('pointercancel', end);
    dial.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 2, ArrowUp: 2, ArrowLeft: -2, ArrowDown: -2, PageUp: 10, PageDown: -10 }[e.key];
      if (e.key === 'Home') { e.preventDefault(); set(0); } else if (e.key === 'End') { e.preventDefault(); set(100); } else if (step) { e.preventDefault(); set(v + step); }
    });
    dial.style.setProperty('--v', 0);
    let done = false;
    whenVisible(dial, () => { if (done) return; done = true; setTimeout(() => set(42), 700); }, null, '-15%');
  }

  // privacy switch
  function initMic() {
    const sw = $('#mic'), msg = $('#mic-state');
    if (!sw) return;
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on);
      msg.textContent = on ? 'Microphones physically disconnected' : 'Microphones connected, for room tuning only';
    });
  }

  /* ---------- finishes: one choice, shared by the whole page ---------- */
  function initFinish() {
    const groups = $$('.finishes');
    const names = $$('[data-finish-name]');
    const swatches = $$('.swatch');
    function apply(name, focusIn) {
      root.dataset.finish = name;
      swatches.forEach((s) => { const on = s.dataset.finish === name; s.setAttribute('aria-checked', on); s.tabIndex = on ? 0 : -1; });
      names.forEach((n) => { n.textContent = name[0].toUpperCase() + name.slice(1); });
      if (focusIn) focusIn.focus();
    }
    groups.forEach((g) => {
      const items = $$('.swatch', g);
      items.forEach((s, i) => {
        s.addEventListener('click', () => apply(s.dataset.finish));
        s.addEventListener('keydown', (e) => {
          if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
          e.preventDefault();
          const n = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length];
          apply(n.dataset.finish, n);
        });
      });
    });
    apply(root.dataset.finish || 'chalk');
  }

  /* ---------- frequency response chart ---------- */
  function initResponse() {
    const line = $('#resp-line'), band = $('#resp-band');
    if (!line) return;
    const x = (f) => 40 + (Math.log10(f / 20) / 3) * 500, y = (db) => 125 - db * 8;
    const resp = (f) => -10 * Math.log10(1 + Math.pow(36 / f, 4)) - 10 * Math.log10(1 + Math.pow(f / 26000, 4)) + 0.9 * Math.sin(2.2 * Math.log(f / 20)) * Math.min(1, f / 80) + 0.7 * Math.sin(7 * Math.log(f / 20) + 1) * Math.min(1, f / 400) * 0.6;
    let d = '';
    for (let i = 0; i <= 140; i++) { const f = 20 * Math.pow(1000, i / 140); d += (i ? 'L' : 'M') + x(f).toFixed(1) + ' ' + y(resp(f)).toFixed(1); }
    line.setAttribute('d', d);
    band.setAttribute('d', `M${x(38).toFixed(1)} ${y(3)}H540V${y(-3)}H${x(38).toFixed(1)}Z`);
  }

  /* ---------- pre-order form (no network: demonstrates the confirmation state) ---------- */
  function initForm() {
    const form = $('#po-form'), msg = $('#form-msg'), email = $('#email');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      msg.className = 'form-msg ' + (ok ? 'ok' : 'err');
      msg.textContent = ok
        ? `Reserved: Halo 02 in ${root.dataset.finish[0].toUpperCase() + root.dataset.finish.slice(1)}. We will email ${email.value.trim()} a secure link for the deposit.`
        : 'Please enter a valid email address.';
      if (!ok) email.focus();
    });
  }

  function initMisc() {
    const po = $('.po-visual');
    if (po) whenVisible(po, () => po.classList.add('live'), () => po.classList.remove('live'));
    const fitPo = () => root.style.setProperty('--psc', mobile() ? 0.8 : clamp(innerHeight * 0.64 / 440, 0.8, 1.3).toFixed(3));
    fitPo(); addEventListener('resize', fitPo);
  }

  initHero(); initRoom(); initTune(); initDial(); initMic(); initFinish(); initResponse(); initForm(); initMisc();
  // Anchor jumps and restored scroll: make sure scroll-linked state is right after layout settles.
  addEventListener('load', () => { frame(); });
})();
