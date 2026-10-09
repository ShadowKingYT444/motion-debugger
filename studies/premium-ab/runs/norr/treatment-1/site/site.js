/* Atelier Norr — site behaviour. Reveals/magnetics come from motion-kit.js; this file adds the bespoke pieces. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---- hero: start within one frame of first paint ---- */
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ready) : ready();

  /* ---- growth rings (generated, seeded so it is stable between visits) ---- */
  const svg = $('#rings');
  if (svg) {
    let seed = 20040611;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const NS = 'http://www.w3.org/2000/svg';
    const N = 34, PTS = 180;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'spin');
    let r = 14;
    const phases = Array.from({ length: 5 }, () => rnd() * Math.PI * 2);
    for (let i = 0; i < N; i++) {
      r += 7 + rnd() * 6 + (i % 9 === 0 ? 5 : 0); // wetter years grow wider
      const amp = 0.012 + (i / N) * 0.05;
      const drift = i * 0.55; // pith sits off-centre, as in real timber
      let d = '';
      for (let k = 0; k <= PTS; k++) {
        const a = (k / PTS) * Math.PI * 2;
        const wob = Math.sin(a * 2 + phases[0] + i * .07) * amp + Math.sin(a * 3 + phases[1]) * amp * .7 + Math.sin(a * 5 + phases[2] + i * .13) * amp * .35 + Math.sin(a * 9 + phases[3] + i * .4) * amp * .12;
        const rr = r * (1 + wob);
        const x = Math.cos(a) * rr + drift * 0.9, y = Math.sin(a) * rr * 0.96 - drift * 0.35;
        d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d + 'Z');
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', 'ring' + (i === 21 ? ' hot' : ''));
      p.style.setProperty('--i', i);
      g.appendChild(p);
    }
    const crack = document.createElementNS(NS, 'path');
    crack.setAttribute('class', 'check');
    crack.setAttribute('d', `M${(N * .55).toFixed(0)} 0L${r * 0.99 | 0} ${-r * .08 | 0}`);
    g.appendChild(crack);
    svg.appendChild(g);

    // pointer parallax, eased in rAF (transform only)
    if (!reduce && matchMedia('(hover: hover)').matches) {
      let tx = 0, ty = 0, cx = 0, cy = 0, run = false;
      const host = svg.parentElement;
      const step = () => {
        cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
        host.style.setProperty('--px', cx.toFixed(3)); host.style.setProperty('--py', cy.toFixed(3));
        svg.style.setProperty('--px', cx.toFixed(3)); svg.style.setProperty('--py', cy.toFixed(3));
        if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001) requestAnimationFrame(step); else run = false;
      };
      addEventListener('pointermove', (e) => {
        tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5;
        if (!run) { run = true; requestAnimationFrame(step); }
      }, { passive: true });
    }
  }

  /* ---- manifesto: words light up as you read ---- */
  const man = $('.manifesto');
  if (man) {
    const words = man.textContent.trim().split(/\s+/);
    man.setAttribute('aria-label', words.join(' '));
    man.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  }

  /* ---- scroll-linked extras (one passive listener, one rAF) ---- */
  const bar = $('.scroll-progress');
  const steps = $$('.step');
  const process = $('.process');
  const work = $('.work');
  const idx = $('#work-idx');
  let lastStep = -1, lastIdx = -1, queued = false;
  const prog = (el) => { const r = el.getBoundingClientRect(); const t = r.height - innerHeight; return t > 0 ? clamp(-r.top / t, 0, 1) : 0; };
  const frame = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (process && !reduce) {
      const p = prog(process);
      const s = clamp(Math.floor(p * steps.length * 0.98), 0, steps.length - 1);
      if (s !== lastStep) { steps.forEach((el, i) => el.classList.toggle('is-active', i === s)); lastStep = s; }
    }
    if (work && idx) {
      const p = prog(work);
      const n = clamp(Math.round(p * 4) + 1, 1, 5);
      if (n !== lastIdx) { idx.textContent = String(n).padStart(2, '0'); lastIdx = n; }
    }
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  queue();
  if (reduce) steps.forEach((el) => el.classList.add('is-active'));

  /* ---- clip reveals: observe an unclipped ancestor, keep the state ---- */
  const holders = $$('.proj, .foot');
  if (reduce || !('IntersectionObserver' in window)) holders.forEach((el) => el.classList.add('seen'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }), { threshold: 0.12 });
    holders.forEach((el) => io.observe(el));
  }

  /* ---- mobile menu ---- */
  const btn = $('.menu-btn'), menu = $('#menu');
  if (btn && menu) {
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); document.body.style.overflow = 'hidden'; }
      else { menu.classList.remove('is-open'); document.body.style.overflow = ''; setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 480); }
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  }
})();
