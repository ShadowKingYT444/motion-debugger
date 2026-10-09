/* Halo One — page behaviour: anatomy steps, hero + room canvases, mode tabs, colourways, form, progress.
   Scroll-linked CSS variables (--p, --read, --exit, --cover) are written by motion-kit.js. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const AMBER = '255,184,104';

  /* ---------- page progress + anatomy step activation (one rAF-throttled scroll loop) ---------- */
  const anatomy = $('.anatomy');
  const steps = $$('.step', anatomy);
  const ticks = $$('.ticks li', anatomy);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty('--page-progress', max > 0 ? (scrollY / max).toFixed(4) : 0);
      if (anatomy && !reduce.matches) {
        const r = anatomy.getBoundingClientRect();
        const p = clamp01(-r.top / Math.max(1, r.height - innerHeight));
        const active = Math.min(steps.length - 1, Math.floor(p * steps.length));
        if (anatomy.dataset.active !== String(active)) {
          anatomy.dataset.active = active;
          steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
          ticks.forEach((t, i) => t.classList.toggle('on', i <= active));
        }
      }
    });
  }
  if (anatomy && reduce.matches) steps.forEach((s) => s.classList.add('is-active'));
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- canvas helpers ---------- */
  function fit(canvas) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  // Runs a draw function every frame while the canvas is on screen; paints once under reduced motion.
  function live(canvas, draw) {
    let visible = false, raf = 0;
    const loop = (t) => { draw(t); raf = visible ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }, { rootMargin: '80px' }).observe(canvas);
    addEventListener('resize', () => draw(performance.now()));
    draw(1200);
    return () => draw(performance.now());
  }

  /* ---------- hero: wavefront rings from the halo, leaning toward the pointer ---------- */
  const hero = $('#heroRings');
  if (hero) {
    const obj = $('.hero-object');
    const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    addEventListener('pointermove', (e) => { ptr.tx = e.clientX / innerWidth; ptr.ty = e.clientY / innerHeight; }, { passive: true });
    const drawHero = (t) => {
      const { ctx, w, h } = fit(hero);
      ctx.clearRect(0, 0, w, h);
      ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
      const hr = hero.getBoundingClientRect(), or = obj.getBoundingClientRect();
      // the ring sits ~27% down the object
      const cx = or.left - hr.left + or.width * 0.5 + (ptr.x - 0.5) * 14;
      const cy = or.top - hr.top + or.height * 0.27 + (ptr.y - 0.5) * 10;
      const tilt = 0.2 + ptr.y * 0.16;
      const maxR = Math.hypot(w, h) * 0.62;
      const period = 7200;
      for (let k = 0; k < 7; k++) {
        const f = ((t / period) + k / 7) % 1;
        const eased = 1 - Math.pow(1 - f, 2.2);
        const r = 70 + eased * maxR;
        const a = Math.pow(1 - f, 1.6) * 0.34;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * tilt, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${AMBER},${a.toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    };
    live(hero, drawHero);
  }

  /* ---------- sound: top-down room simulation ---------- */
  const roomCv = $('#room');
  if (roomCv) {
    let mode = 'omni';
    const seats = [[0.2, 0.74], [0.5, 0.84], [0.8, 0.72], [0.84, 0.3], [0.16, 0.28]];
    const you = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6 };
    const roSpread = $('#roSpread'), roYou = $('#roYou');
    const sources = () => (mode === 'pair' ? [{ x: 0.3, y: 0.3, a: Math.PI * 0.32 }, { x: 0.7, y: 0.3, a: Math.PI * 0.68 }] : [{ x: 0.5, y: 0.42, a: Math.PI * 0.5 }]);
    const dirGain = (src, ang) => {
      if (mode === 'omni') return 1;
      const c = Math.max(0, Math.cos(ang - src.a));
      return 0.05 + 0.95 * Math.pow(c, mode === 'beam' ? 3 : 2);
    };
    const level = (nx, ny, w, h) => {
      let sum = 0;
      for (const s of sources()) {
        const dx = (nx - s.x) * w, dy = (ny - s.y) * h;
        const d = Math.hypot(dx, dy);
        const k = mode === 'omni' ? 0.6 : mode === 'beam' ? 1.1 : 0.8;
        sum += dirGain(s, Math.atan2(dy, dx)) / Math.pow(1 + d / (w * 0.3), k) * (mode === 'pair' ? 0.75 : 1);
      }
      return sum;
    };
    const db = (v) => 20 * Math.log10(Math.max(v, 0.001));

    const drawRoom = (t) => {
      const { ctx, w, h } = fit(roomCv);
      ctx.clearRect(0, 0, w, h);
      you.x += (you.tx - you.x) * 0.12; you.y += (you.ty - you.y) * 0.12;
      const pad = 18;
      // walls
      ctx.strokeStyle = 'rgba(242,237,228,.22)'; ctx.lineWidth = 1.5;
      roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 14); ctx.stroke();
      // furniture (line art)
      ctx.strokeStyle = 'rgba(242,237,228,.14)'; ctx.lineWidth = 1;
      roundRect(ctx, w * 0.12, h * 0.86, w * 0.44, h * 0.09, 10); ctx.stroke();           // sofa
      ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.62, w * 0.07, w * 0.07, 0, 0, 7); ctx.stroke(); // table
      roundRect(ctx, w * 0.76, h * 0.06, w * 0.18, h * 0.07, 6); ctx.stroke();            // shelf
      ctx.setLineDash([3, 6]); roundRect(ctx, w * 0.26, h * 0.52, w * 0.34, h * 0.26, 20); ctx.stroke(); ctx.setLineDash([]); // rug

      const maxR = Math.hypot(w, h) * 0.9;
      const srcs = sources();
      srcs.forEach((s, si) => {
        const sx = s.x * w, sy = s.y * h;
        for (let k = 0; k < 6; k++) {
          const f = ((t / 5200) + k / 6 + si * 0.08) % 1;
          const r = f * maxR * 0.78 + 6;
          const fade = Math.pow(1 - f, 1.5);
          if (mode === 'omni') {
            ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${AMBER},${(fade * 0.55).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.stroke();
          } else {
            const seg = 90;
            for (let i = 0; i < seg; i++) {
              const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1.15) / seg) * Math.PI * 2;
              const g = dirGain(s, (a0 + a1) / 2);
              if (g < 0.06) continue;
              ctx.beginPath(); ctx.arc(sx, sy, r, a0, a1);
              ctx.strokeStyle = `rgba(${AMBER},${(fade * g * 0.7).toFixed(3)})`; ctx.lineWidth = 1 + g * 1.2; ctx.stroke();
            }
          }
        }
        // speaker
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 34);
        grad.addColorStop(0, `rgba(${AMBER},.5)`); grad.addColorStop(1, `rgba(${AMBER},0)`);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill();
        ctx.fillStyle = '#17120c'; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, 7); ctx.fill();
        ctx.strokeStyle = '#FFE2BC'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, 7); ctx.stroke();
      });

      // seats + listener
      const levels = seats.map(([nx, ny]) => level(nx, ny, w, h));
      seats.forEach(([nx, ny], i) => {
        const v = clamp01(levels[i] * 1.1);
        ctx.beginPath(); ctx.arc(nx * w, ny * h, 4 + v * 4, 0, 7);
        ctx.fillStyle = `rgba(242,237,228,${(0.25 + v * 0.7).toFixed(2)})`; ctx.fill();
      });
      const yl = level(you.x, you.y, w, h);
      const yx = you.x * w, yy = you.y * h;
      ctx.beginPath(); ctx.arc(yx, yy, 9, 0, 7); ctx.fillStyle = '#F2EDE4'; ctx.fill();
      ctx.beginPath(); ctx.arc(yx, yy, 16 + Math.sin(t / 400) * 1.5, 0, 7); ctx.strokeStyle = 'rgba(242,237,228,.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = '500 11px "Inter Tight", sans-serif'; ctx.fillStyle = 'rgba(242,237,228,.8)';
      ctx.fillText('YOU', yx + 22, yy + 4);

      const vals = levels.map(db);
      const spread = (Math.max(...vals) - Math.min(...vals)) / 2;
      roSpread.textContent = `±${spread.toFixed(1)} dB`;
      roYou.textContent = `${db(yl) <= 0 ? '−' : '+'}${Math.abs(db(yl)).toFixed(1)} dB`;
    };
    function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    const redraw = live(roomCv, drawRoom);
    const move = (e) => {
      const r = roomCv.getBoundingClientRect();
      you.tx = clamp01((e.clientX - r.left) / r.width); you.ty = clamp01((e.clientY - r.top) / r.height);
      if (reduce.matches) { you.x = you.tx; you.y = you.ty; redraw(); }
    };
    roomCv.addEventListener('pointermove', move);
    roomCv.addEventListener('pointerdown', move);

    // mode tabs with a sliding indicator
    const group = $('.modes'), ink = $('.mode-ink', group), btns = $$('.mode', group);
    const place = (btn) => { ink.style.setProperty('--x', `${btn.offsetLeft - 4}px`); ink.style.setProperty('--w', `${btn.offsetWidth}px`); };
    btns.forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      place(b);
      if (reduce.matches) redraw();
    }));
    const init = () => place($('.mode[aria-pressed="true"]', group));
    init(); addEventListener('resize', init); addEventListener('load', init);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  }

  /* ---------- pre-order: colourways + reservation ---------- */
  const po = $('#poSpeaker'), nameEl = $('#colorName');
  $$('input[name="color"]').forEach((input) => input.addEventListener('change', () => {
    po.style.setProperty('--fabric', input.dataset.color);
    nameEl.textContent = input.value;
  }));
  const form = $('#reserve'), note = $('#formNote'), email = $('#email');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    note.classList.toggle('ok', ok);
    note.textContent = ok
      ? `Thank you. A Halo One in ${nameEl.textContent} is held for you. (Demonstration form: nothing was sent.)`
      : 'Please enter a valid email address to reserve.';
    if (!ok) email.focus();
  });
})();
