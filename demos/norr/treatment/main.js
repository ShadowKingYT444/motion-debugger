/* Atelier Norr — page scripts. Runs before motion-kit.js so generated SVG exists when the kit wires reveals. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- hero entrance: start on the first frame after parse ---- */
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

  /* ---- tree rings (philosophy): irregular closed paths, drawn by scroll via the kit's data-draw="scrub" ---- */
  const ringsArt = document.getElementById('ringsArt');
  if (ringsArt) {
    const rings = 17;
    for (let k = 0; k < rings; k++) {
      const R = 14 + k * 17.4;
      const pts = [];
      const S = 120;
      for (let i = 0; i < S; i++) {
        const a = (i / S) * Math.PI * 2;
        const r = R * (1 + 0.035 * Math.sin(3 * a + k * 0.55) + 0.02 * Math.sin(5 * a - k * 0.4) + 0.01 * Math.sin(9 * a + k * 0.8));
        pts.push(`${(300 + Math.cos(a) * r).toFixed(1)} ${(300 + Math.sin(a) * r * 1.05).toFixed(1)}`);
      }
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${pts.join('L')}Z`);
      path.setAttribute('opacity', (0.35 + 0.65 * (1 - k / rings)).toFixed(2));
      ringsArt.appendChild(path);
    }
  }

  /* ---- cladding boards in the anatomy drawing: staggered scrub windows ---- */
  const boards = document.getElementById('boards');
  if (boards) {
    const n = 38;
    for (let i = 0; i < n; i++) {
      const rect = document.createElementNS(NS, 'rect');
      const a = 0.72 + (i / (n - 1)) * 0.12;
      rect.setAttribute('class', 'part grow');
      rect.setAttribute('x', (151 + i * 13.4).toFixed(1));
      rect.setAttribute('y', '296');
      rect.setAttribute('width', '7');
      rect.setAttribute('height', '156');
      rect.setAttribute('style', `--a:${a.toFixed(3)};--b:${(a + 0.05).toFixed(3)}`);
      boards.appendChild(rect);
    }
  }

  /* ---- hero end-grain canvas: alive without input, leans toward the pointer ---- */
  function endGrain() {
    const cv = document.getElementById('rings');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const N = 46;
    let w = 0, h = 0, dpr = 1, px = 0, py = 0, tx = 0, ty = 0, visible = true, running = false;
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      if (!running) draw(0);
    };
    const fills = ['#B97C45', '#D6A06A', '#CE9660', '#DDAA74'];
    function draw(time) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#DDAA74';
      ctx.fillRect(0, 0, w, h);
      const cx = w * 0.5 + px * w * 0.06, cy = h * 0.62 + py * h * 0.04;
      const maxR = Math.hypot(w, h) * 0.62;
      for (let k = N; k >= 1; k--) {
        const f = k / N, R = maxR * f;
        const sx = (1 - f) * px * w * 0.06, sy = (1 - f) * py * h * 0.05;
        ctx.beginPath();
        const S = 96;
        for (let i = 0; i <= S; i++) {
          const a = (i / S) * Math.PI * 2;
          const wob = 1 + 0.03 * Math.sin(3 * a + k * 0.31 + time * 0.00018) + 0.018 * Math.sin(5 * a - k * 0.23 + time * 0.00027) + 0.01 * Math.sin(9 * a + k * 0.5 - time * 0.00033);
          const r = R * wob;
          const x = cx + sx + Math.cos(a) * r, y = cy + sy + Math.sin(a) * r * 1.04;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        const band = k % 4;
        ctx.fillStyle = fills[band];
        ctx.fill();
        ctx.strokeStyle = band === 0 ? 'rgba(84,44,16,.42)' : 'rgba(84,44,16,.16)';
        ctx.lineWidth = band === 0 ? 1.4 : 0.7;
        ctx.stroke();
      }
      // radial check (a drying crack) and pith
      ctx.strokeStyle = 'rgba(58,26,6,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let s = 1; s <= 18; s++) { const d = (s / 18) * maxR * 0.95; ctx.lineTo(cx + d * 0.55 + Math.sin(s * 1.7) * 2.2, cy - d * 0.83 + Math.cos(s * 2.3) * 1.6); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(70,32,10,.8)'; ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, 7); ctx.fill();
    }
    const loop = (time) => {
      if (!visible) { running = false; return; }
      px += (tx - px) * 0.06; py += (ty - py) * 0.06;
      draw(time);
      requestAnimationFrame(loop);
    };
    const kick = () => { if (!running && visible && !reduce.matches) { running = true; requestAnimationFrame(loop); } };
    size();
    addEventListener('resize', size);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; kick(); }).observe(cv);
    if (finePointer.matches && !reduce.matches) {
      addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
    }
    kick();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  }

  /* ---- anatomy: caption steps follow scroll progress; the drawing itself is pure CSS from --p ---- */
  function anatomy() {
    const sec = document.getElementById('anatomy');
    if (!sec) return;
    const steps = [...sec.querySelectorAll('.step')];
    const rail = [...sec.querySelectorAll('.rail li')];
    const starts = [0, 0.18, 0.7, 0.86];
    let queued = false, last = -1;
    const update = () => {
      queued = false;
      const r = sec.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 1;
      let idx = 0;
      starts.forEach((s, i) => { if (p >= s) idx = i; });
      if (idx === last) return;
      last = idx;
      steps.forEach((el, i) => { el.classList.toggle('is-active', i === idx); el.classList.toggle('is-past', i < idx); });
      rail.forEach((li, i) => li.classList.toggle('is-done', i <= idx));
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---- page progress hairline on the nav ---- */
  function navProgress() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    let queued = false;
    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      nav.style.setProperty('--sp', max > 0 ? clamp(scrollY / max).toFixed(4) : 0);
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  const init = () => { endGrain(); anatomy(); navProgress(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
