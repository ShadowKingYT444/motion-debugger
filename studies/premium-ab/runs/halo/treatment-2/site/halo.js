/* Halo Two — page behaviour. Loads BEFORE motion-kit.js so word-splitting is ready when the kit scans the DOM. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => reduceMQ.matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  /* ---- word walker: wraps words in masks while keeping inline elements (em) ---- */
  function wrapWords(root, make) {
    const out = document.createDocumentFragment();
    let n = 0;
    const walk = (node, into) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) into.appendChild(document.createTextNode(' '));
            else into.appendChild(make(part, n++));
          }
        } else if (child.nodeType === 1) {
          if (child.tagName === 'BR') { into.appendChild(child.cloneNode()); continue; }
          const shell = child.cloneNode(false);
          walk(child, shell);
          into.appendChild(shell);
        }
      }
    };
    walk(root, out);
    return { frag: out, count: n };
  }

  /* [data-rise]: masked word rise. Hands the markup to the kit's split styles. */
  for (const el of $$('[data-rise]')) {
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    const { frag } = wrapWords(el, (word, i) => {
      const mask = document.createElement('span');
      mask.className = 'mk-mask'; mask.setAttribute('aria-hidden', 'true');
      const piece = document.createElement('span');
      piece.className = 'mk-piece'; piece.style.setProperty('--i', i); piece.textContent = word;
      mask.appendChild(piece);
      return mask;
    });
    el.textContent = '';
    el.appendChild(frag);
    el.setAttribute('data-split', 'words');
    el.setAttribute('data-split-done', '1');
  }

  /* manifesto: each word gets a threshold */
  const manifestoText = $('.manifesto-text');
  if (manifestoText) {
    const total = manifestoText.textContent.trim().split(/\s+/).length;
    manifestoText.setAttribute('aria-label', manifestoText.textContent.trim());
    const { frag } = wrapWords(manifestoText, (word, i) => {
      const s = document.createElement('span');
      s.className = 'w'; s.style.setProperty('--t', (i / total).toFixed(3)); s.textContent = word;
      s.setAttribute('aria-hidden', 'true');
      return s;
    });
    manifestoText.textContent = '';
    manifestoText.appendChild(frag);
  }

  /* calibration bars */
  const bars = $('.bars');
  if (bars) for (let i = 0; i < 30; i++) { const b = document.createElement('i'); b.style.setProperty('--i', i); bars.appendChild(b); }

  /* ---- scroll-linked: anatomy story ---- */
  const story = $('.story');
  const steps = $$('.step', story);
  const layers = Object.fromEntries($$('.ly', story).map((g) => [g.classList[1].replace('ly-', ''), g]));
  const focusMap = [[], ['cap', 'halo'], ['drivers', 'chamber'], ['sleeve'], ['woofer', 'base']];
    let curStep = 0;

  function applyStep(idx) {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    const focus = focusMap[idx];
    for (const [name, g] of Object.entries(layers)) {
      const on = focus.includes(name);
      g.classList.toggle('is-dim', focus.length > 0 && !on);
      g.classList.toggle('is-focus', name === 'sleeve' && on);
    }
  }

  function updateStory() {
    if (reduce()) return;
    const r = story.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = clamp(-r.top / total);
    const e = Math.min(smooth(clamp((p - 0.04) / 0.16)), smooth(clamp((1 - p - 0.02) / 0.14)));
    story.style.setProperty('--e', e.toFixed(4));
    steps.forEach((s, i) => s.style.setProperty('--f', clamp(p * steps.length - i).toFixed(3)));
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    if (idx !== curStep) { curStep = idx; applyStep(idx); }
  }
  let queued = false;
  const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; updateStory(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateStory();
  reduceMQ.addEventListener?.('change', () => { story.style.removeProperty('--e'); updateStory(); });

  /* ---- hero: pointer parallax with eased follow ---- */
  const heroSpeaker = $('.hero-speaker');
  const heroGlow = $('.hero-glow');
  const hero = $('.hero');
  if (finePointer && heroSpeaker) {
    let tx = 0, ty = 0, x = 0, y = 0, running = false;
    const step = () => {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      if (!reduce()) {
        heroSpeaker.style.transform = `translate3d(${(x * 14).toFixed(2)}px, ${(y * 8).toFixed(2)}px, 0) rotate(${(x * 1.2).toFixed(2)}deg)`;
        heroGlow.style.translate = `${(-x * 30).toFixed(1)}px ${(-y * 20).toFixed(1)}px`;
      }
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.002) requestAnimationFrame(step); else running = false;
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!running) { running = true; requestAnimationFrame(step); }
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!running) { running = true; requestAnimationFrame(step); } });
  }

  /* ---- tabs with sliding ink ---- */
  const tabs = $('.tabs');
  const ink = $('.tab-ink', tabs);
  const tabBtns = $$('[role=tab]', tabs);
  function moveInk(tab) {
    if (!tab) { ink.style.setProperty('--cl', '50%'); ink.style.setProperty('--cr', '50%'); return; }
    const total = tabs.clientWidth - 8; // ink spans the tray (inset 4px each side)
    ink.style.setProperty('--cl', Math.max(0, tab.offsetLeft - 4) + 'px');
    ink.style.setProperty('--cr', Math.max(0, total - (tab.offsetLeft - 4 + tab.offsetWidth)) + 'px');
  }
  const selectedTab = () => tabBtns.find((t) => t.getAttribute('aria-selected') === 'true');
  const notes = {
    centre: 'In the middle, Halo sends one even wavefront to every wall at the same moment. Nothing to tune; nothing to aim.',
    wall: 'Against a wall, the near reflection arrives early and boosts the bass. Halo hears it in calibration and eases the low end back.',
    corner: 'In a corner, two walls reinforce each other. Halo narrows its low-frequency output toward the room and keeps the mids open.'
  };
  const noteEl = $('#roomNote');
  let noteTimer;
  function setNote(key) {
    clearTimeout(noteTimer);
    noteEl.classList.add('is-out');
    noteTimer = setTimeout(() => { noteEl.textContent = notes[key]; noteEl.classList.remove('is-out'); }, 180);
  }
  let room; // set below
  function pickTab(tab, announce = true) {
    tabBtns.forEach((t) => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
    moveInk(tab);
    if (tab && announce) { setNote(tab.dataset.spot); room?.goTo(tab.dataset.spot); }
  }
  tabs.addEventListener('click', (e) => { const t = e.target.closest('[role=tab]'); if (t) pickTab(t); });
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const i = tabBtns.indexOf(document.activeElement); if (i < 0) return;
    const next = tabBtns[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabBtns.length) % tabBtns.length];
    next.focus(); pickTab(next); e.preventDefault();
  });
  tabBtns.forEach((t, i) => { t.tabIndex = i === 0 ? 0 : -1; });
  const placeInk = () => { ink.style.transition = 'none'; moveInk(selectedTab()); void ink.offsetWidth; ink.style.transition = ''; };
  placeInk();
  document.fonts?.ready.then(placeInk);
  addEventListener('resize', placeInk);

  /* ---- room: canvas simulation ---- */
  const cv = $('#roomCanvas');
  const ctx = cv.getContext('2d');
  const spots = { centre: [0.5, 0.5], wall: [0.5, 0.15], corner: [0.12, 0.18] };
  const seats = [
    { fx: 0.2, fy: 0.8, name: 'Sofa' }, { fx: 0.44, fy: 0.84, name: 'Sofa' },
    { fx: 0.87, fy: 0.68, name: 'Kitchen' }, { fx: 0.86, fy: 0.2, name: 'Desk' }
  ];
  const furniture = [ // fractions x,y,w,h of the room, round flag
    { x: 0.1, y: 0.76, w: 0.42, h: 0.17 }, { x: 0.3, y: 0.42, w: 0.12, h: 0.12, round: true },
    { x: 0.8, y: 0.06, w: 0.16, h: 0.28 }, { x: 0.78, y: 0.56, w: 0.2, h: 0.34 }
  ];
  const ROOM_M = 5.6; // metres across, for the distance readout
  let W = 0, H = 0, dpr = 1, rect = { x: 0, y: 0, w: 0, h: 0 };
  const src = { x: 0.5, y: 0.5 }, tgt = { x: 0.5, y: 0.5 };
  let rings = [], lastSpawn = -1e9, visible = false, raf = 0, last = 0, drag = false;
  const flash = seats.map(() => 0);

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mx = Math.max(18, W * 0.04), my = 26;
    const rw = W - mx * 2, rh = H - my * 2;
    rect = { x: mx, y: my, w: rw, h: rh };
    if (reduce() || !visible) draw(performance.now(), true);
  }
  const P = (fx, fy) => [rect.x + fx * rect.w, rect.y + fy * rect.h];
  const px2m = () => ROOM_M / rect.w;

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw(now, still = false) {
    ctx.clearRect(0, 0, W, H);
    // room
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(239,233,222,.28)';
    roundRect(rect.x, rect.y, rect.w, rect.h, 10); ctx.stroke();
    for (const f of furniture) {
      const [x, y] = P(f.x, f.y);
      ctx.fillStyle = 'rgba(239,233,222,.035)'; ctx.strokeStyle = 'rgba(239,233,222,.12)'; ctx.lineWidth = 1;
      const fw = f.round ? f.h * rect.h : f.w * rect.w, fh = f.h * rect.h;
      roundRect(x, y, fw, fh, f.round ? fh / 2 : 8); ctx.fill(); ctx.stroke();
    }
    const [sx, sy] = P(src.x, src.y);
    const maxR = Math.hypot(rect.w, rect.h) * 1.05;

    // rings, clipped to the room; direct + first-order wall images
    ctx.save();
    roundRect(rect.x, rect.y, rect.w, rect.h, 10); ctx.clip();
    for (const ring of rings) {
      const age = (now - ring.t0) / 1000;
      const r = age * (still ? 1 : 230);
      if (r <= 0 || r > maxR) continue;
      const a = Math.pow(1 - r / maxR, 1.5);
      const ox = ring.x, oy = ring.y;
      const images = [[ox, oy, 1], [2 * rect.x - ox, oy, 0.42], [2 * (rect.x + rect.w) - ox, oy, 0.42], [ox, 2 * rect.y - oy, 0.42], [ox, 2 * (rect.y + rect.h) - oy, 0.42]];
      for (const [ix, iy, k] of images) {
        ctx.beginPath(); ctx.arc(ix, iy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,184,105,${(0.7 * a * k).toFixed(3)})`; ctx.lineWidth = k === 1 ? 1.8 : 1.2; ctx.stroke();
      }
      if (!ring.hit) ring.hit = [];
      seats.forEach((s, i) => {
        const [qx, qy] = P(s.fx, s.fy);
        const d = Math.hypot(qx - ox, qy - oy);
        if (!ring.hit[i] && r >= d) { ring.hit[i] = true; flash[i] = 1; }
      });
    }
    ctx.restore();

    // seats + distance readout
    seats.forEach((s, i) => {
      const [qx, qy] = P(s.fx, s.fy);
      const f = flash[i]; if (!still) flash[i] = Math.max(0, f - 0.025);
      ctx.beginPath(); ctx.arc(qx, qy, 4 + f * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,233,222,${0.55 + f * 0.45})`; ctx.shadowColor = 'rgba(255,184,105,.9)'; ctx.shadowBlur = f * 22; ctx.fill(); ctx.shadowBlur = 0;
      const d = Math.hypot(qx - sx, qy - sy) * px2m();
      ctx.font = '500 11px "Inter Tight", system-ui, sans-serif'; ctx.fillStyle = 'rgba(189,180,165,.9)'; ctx.textAlign = 'center';
      ctx.fillText(`${s.name} · ${d.toFixed(1)} m`, qx, qy + 20);
    });

    // source
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60);
    g.addColorStop(0, 'rgba(255,184,105,.5)'); g.addColorStop(1, 'rgba(255,184,105,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 60, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.fillStyle = '#d7cfc0'; ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.strokeStyle = '#ffd9a6'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fillStyle = '#2a2622'; ctx.fill();
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!drag) { // critically damped follow, frame-rate independent
      const k = 1 - Math.exp(-dt * 9);
      src.x += (tgt.x - src.x) * k; src.y += (tgt.y - src.y) * k;
    }
    if (now - lastSpawn > 1250) {
      const [sx, sy] = P(src.x, src.y); rings.push({ x: sx, y: sy, t0: now }); lastSpawn = now;
      rings = rings.filter((r) => (now - r.t0) / 1000 * 230 < Math.hypot(rect.w, rect.h) * 1.05);
    }
    draw(now);
    raf = requestAnimationFrame(frame);
  }
  const stillRings = () => {
    const [sx, sy] = P(src.x, src.y);
    rings = [260, 560, 900, 1300].map((t) => ({ x: sx, y: sy, t0: -t }));
    draw(0, true);
  };
  function start() { if (reduce()) { stillRings(); return; } if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: '80px' }).observe(cv);

  room = {
    goTo(key) { const [fx, fy] = spots[key]; tgt.x = fx; tgt.y = fy; if (reduce()) { src.x = fx; src.y = fy; stillRings(); } }
  };

  const toFrac = (e) => {
    const b = cv.getBoundingClientRect();
    return { x: clamp((e.clientX - b.left - rect.x) / rect.w, 0.03, 0.97), y: clamp((e.clientY - b.top - rect.y) / rect.h, 0.05, 0.95) };
  };
  cv.addEventListener('pointerdown', (e) => {
    const b = cv.getBoundingClientRect();
    const [sx, sy] = P(src.x, src.y);
    if (Math.hypot(e.clientX - b.left - sx, e.clientY - b.top - sy) < 40) {
      drag = true; cv.setPointerCapture(e.pointerId); cv.classList.add('is-dragging'); pickTab(null, false); e.preventDefault();
    }
  });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const f = toFrac(e); src.x = tgt.x = f.x; src.y = tgt.y = f.y; if (reduce()) stillRings(); });
  const endDrag = () => { drag = false; cv.classList.remove('is-dragging'); };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  new ResizeObserver(resize).observe(cv);
  resize();
  reduceMQ.addEventListener?.('change', () => { if (reduce()) { cancelAnimationFrame(raf); raf = 0; stillRings(); } else start(); });

  /* ---- pause off-screen ambient loops ---- */
  const ambient = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '60px' });
  $$('.hero-visual, .hero-glow, .bars, .rooms, .marquee-band').forEach((el) => ambient.observe(el));

  /* ---- calibration status cycle ---- */
  const status = $('.status-text');
  const phases = ['Listening to the room…', 'Mapping the nearest reflections…', 'Easing the low end…', 'Tuned. Saved to this spot.'];
  let phase = 0, calVisible = false;
  if (status && !reduce()) {
    setInterval(() => {
      if (!calVisible) return;
      status.classList.add('is-out');
      setTimeout(() => { phase = (phase + 1) % phases.length; status.textContent = phases[phase]; status.classList.remove('is-out'); }, 240);
    }, 2400);
    new IntersectionObserver(([e]) => { calVisible = e.isIntersecting; }).observe(status);
  }

  /* ---- touch ring dial ---- */
  const dial = $('.dial');
  if (dial) {
    const num = $('.dial-num', dial);
    let v = 0.42, dragging = false;
    const set = (nv) => { v = clamp(nv); dial.style.setProperty('--v', v.toFixed(4)); const n = Math.round(v * 100); num.textContent = n; dial.setAttribute('aria-valuenow', n); };
    const fromPointer = (e) => {
      const b = dial.getBoundingClientRect();
      let a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI + 90; // 0 = top
      if (a > 180) a -= 360; if (a < -180) a += 360;
      set((clamp(a, -135, 135) + 135) / 270);
    };
    dial.addEventListener('pointerdown', (e) => { dragging = true; dial.setPointerCapture(e.pointerId); fromPointer(e); });
    dial.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
    dial.addEventListener('pointerup', () => { dragging = false; });
    dial.addEventListener('pointercancel', () => { dragging = false; });
    dial.addEventListener('wheel', (e) => { e.preventDefault(); set(v - Math.sign(e.deltaY) * 0.03); }, { passive: false });
    dial.addEventListener('keydown', (e) => {
      const d = { ArrowUp: .02, ArrowRight: .02, ArrowDown: -.02, ArrowLeft: -.02, PageUp: .1, PageDown: -.1 }[e.key];
      if (d !== undefined) { set(v + d); e.preventDefault(); }
    });
    set(v);
  }

  /* ---- finish picker ---- */
  const finishBtns = $$('[data-finish]');
  const finishName = $('#finishName');
  finishBtns.forEach((b) => b.addEventListener('click', () => {
    finishBtns.forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    document.documentElement.dataset.finish = b.dataset.finish;
    finishName.textContent = b.getAttribute('aria-label');
  }));

  /* ---- reserve form (no backend: confirms locally) ---- */
  const form = $('#reserveForm'), msg = $('#formMsg'), email = $('#email');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    msg.classList.toggle('is-error', !ok);
    msg.textContent = ok ? `Thank you. We will write to ${email.value.trim()} when your slot opens. No payment taken.` : 'Please enter a valid email address.';
    if (!ok) email.focus();
  });
})();
