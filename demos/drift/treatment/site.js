/* Drift — page behaviour on top of motion-kit.js.
 * Story steps, hero canvas (living visual), soundscape scenes, billing toggle. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /* ---------- pinned story: steps follow --p ---------- */
  function story() {
    const section = $('.story');
    if (!section) return;
    const steps = $$('.step', section);
    const rail = $('.rail i', section);
    let current = -1;
    const set = (i) => {
      if (i === current) return;
      current = i;
      section.dataset.step = i;
      steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
    };
    const update = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = clamp01(total > 0 ? -r.top / total : 0);
      set(p < 0.34 ? 0 : p < 0.68 ? 1 : 2);
      if (rail) rail.style.setProperty('--p', p.toFixed(3));
    };
    if (reduce.matches) return;
    let q = false;
    addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; update(); }); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- soundscape scenes (visual demo) ---------- */
  function scenes() {
    const viz = $('.mix-viz');
    if (!viz) return;
    const bars = $$('i', viz);
    const shapes = {
      rain: (i) => 0.25 + 0.55 * Math.abs(Math.sin(i * 12.9898) * 0.9),
      ocean: (i) => 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(i / 3.2 - 0.6)),
      forest: (i) => 0.15 + 0.35 * Math.abs(Math.sin(i * 1.7)) + (i % 6 === 2 ? 0.35 : 0),
      hum: (i) => 0.42 + 0.1 * Math.sin(i / 2.4),
    };
    const apply = (name) => {
      bars.forEach((b, i) => { b.style.setProperty('--k', i); b.style.setProperty('--h', Math.min(1, shapes[name](i)).toFixed(3)); });
    };
    apply('rain');
    $$('.chip').forEach((chip) => chip.addEventListener('click', () => {
      $$('.chip').forEach((c) => { const on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); });
      apply(chip.dataset.scene);
    }));
  }

  /* ---------- billing toggle ---------- */
  function billing() {
    const root = $('[data-period-root]');
    const toggle = $('.toggle');
    if (!root || !toggle) return;
    const buttons = $$('button', toggle);
    const place = () => {
      const on = $('.is-on', toggle);
      toggle.style.setProperty('--tw', on.offsetWidth + 'px');
      toggle.style.setProperty('--tx', (on.offsetLeft - 4) + 'px');
    };
    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      root.dataset.periodRoot = b.dataset.period;
      place();
    }));
    place();
    addEventListener('resize', place);
    addEventListener('load', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  /* ---------- hero canvas: breathing moon, orbits, wave field ---------- */
  function heroCanvas() {
    const canvas = $('.hero-canvas');
    const hero = $('.hero');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const phone = $('.hero-visual .phone');
    let w = 0, h = 0, dpr = 1, visible = true, raf = 0, last = 0;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      const r = hero.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce.matches) draw(0);
    };
    addEventListener('resize', resize);
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width; pointer.ty = (e.clientY - r.top) / r.height;
    });

    function draw(t) {
      pointer.x += (pointer.tx - pointer.x) * 0.04; pointer.y += (pointer.ty - pointer.y) * 0.04;
      ctx.clearRect(0, 0, w, h);
      // moon centre follows the phone
      const hr = hero.getBoundingClientRect();
      let cx = w * 0.74, cy = h * 0.46, size = Math.min(w, h) * 0.5;
      if (phone) {
        const pr = phone.getBoundingClientRect();
        cx = pr.left - hr.left + pr.width / 2; cy = pr.top - hr.top + pr.height / 2; size = Math.max(pr.width * 1.15, 280);
      }
      cx += (pointer.x - 0.5) * 24; cy += (pointer.y - 0.5) * 16;
      const breath = 0.5 + 0.5 * Math.sin(t / 1000 * (Math.PI * 2 / 9));
      // soft light source
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * (1.5 + breath * 0.15));
      g.addColorStop(0, 'rgba(243,201,139,0.20)'); g.addColorStop(0.35, 'rgba(120,150,255,0.09)'); g.addColorStop(1, 'rgba(7,10,18,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // orbits
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const rx = size * (0.78 + k * 0.28), ry = rx * 0.34;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.38 + k * 0.12);
        ctx.strokeStyle = `rgba(236,233,242,${0.13 - k * 0.03})`;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        const a = t / 1000 * (0.12 - k * 0.025) + k * 2.1;
        ctx.fillStyle = k === 0 ? 'rgba(243,201,139,0.95)' : 'rgba(236,233,242,0.6)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, k === 0 ? 3.2 : 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // wave field across the lower hero
      const lines = 7;
      for (let i = 0; i < lines; i++) {
        const base = h * (0.66 + i * 0.045);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const nx = x / w;
          const near = Math.exp(-Math.pow((nx - pointer.x) * 3.2, 2)) * (0.4 + (1 - Math.abs(pointer.y - 0.7)) * 0.6);
          const amp = 10 + i * 3 + near * 28;
          const y = base + Math.sin(nx * 5 + t / 1000 * 0.35 + i * 0.6) * amp * 0.6 + Math.sin(nx * 11 - t / 1000 * 0.22 + i) * amp * 0.25;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(190,205,255,${0.1 - i * 0.01})`;
        ctx.lineWidth = 1; ctx.stroke();
      }
      // faint stars
      for (let s = 0; s < 46; s++) {
        const sx = ((s * 97.31) % 1) * w, sy = ((s * 53.77) % 1) * h * 0.7;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * 0.6 + s));
        ctx.fillStyle = `rgba(236,233,242,${0.35 * tw})`;
        ctx.fillRect(sx, sy, 1.2, 1.2);
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < 30) return; // ~30fps is plenty for slow drift
      last = now; draw(now);
    }
    const start = () => { if (!raf && visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    resize();
    draw(2400);
    start();
  }

  const init = () => { story(); scenes(); billing(); heroCanvas(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
