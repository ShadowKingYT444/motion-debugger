/* Atelier Norr — page behaviour. Reveals/split/count/magnetic/marquee/nav come from motion-kit.js;
 * this file adds the bespoke pieces: growth rings, the pinned gallery, the scroll-drawn house, the lit manifesto. */
(() => {
  const root = document.documentElement;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const compactMQ = matchMedia('(max-width: 960px), (prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- hero entrance gate ---------- */
  const ready = () => root.classList.add('is-ready');
  requestAnimationFrame(() => requestAnimationFrame(ready));
  setTimeout(ready, 1200); // never leave the hero hidden

  /* ---------- growth rings (seeded, so every visit draws the same tree) ---------- */
  function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function buildRings(target, { count, seed, hot = [], core = 3, labels = null }) {
    const rnd = seeded(seed);
    const radii = []; let r = 0;
    for (let i = 0; i < count; i++) { r += 0.55 + rnd() * 0.9; radii.push(r); }
    const scale = 376 / radii[radii.length - 1];
    const N = 132;
    radii.forEach((raw, i) => {
      const base = raw * scale, a = 0.010 + 0.022 * (i / count);
      const p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28;
      const ex = i * 0.42, ey = -i * 0.2;
      let d = '';
      for (let k = 0; k < N; k++) {
        const th = (k / N) * Math.PI * 2;
        const w = Math.sin(2 * th + p1) * 0.5 + Math.sin(3 * th + p2) * 0.32 + Math.sin(5 * th + p3) * 0.18;
        const rr = base * (1 + a * w);
        d += (k ? 'L' : 'M') + (Math.cos(th) * rr + ex).toFixed(1) + ' ' + (Math.sin(th) * rr + ey).toFixed(1);
      }
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d + 'Z');
      path.setAttribute('pathLength', '1');
      path.style.setProperty('--i', i);
      if (i < core) path.setAttribute('class', 'core');
      if (hot.includes(i)) path.setAttribute('class', 'hot');
      target.appendChild(path);
      if (labels) {
        const lab = labels.find((l) => l.i === i);
        if (lab) {
          const g = document.createElementNS(NS, 'g');
          const x = Math.cos(lab.a) * base + ex, y = Math.sin(lab.a) * base + ey;
          g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          g.style.setProperty('--k', labels.indexOf(lab));
          g.innerHTML = `<circle r="3.5"/><text x="11" y="4">${lab.t}</text>`;
          $('#ring-labels').appendChild(g);
        }
      }
    });
  }
  const deg = (d) => (d * Math.PI) / 180;
  buildRings($('#rings'), {
    count: 36, seed: 4231, hot: [6, 17, 29],
    labels: [{ i: 6, a: deg(-38), t: '1871 &middot; seedling' }, { i: 17, a: deg(78), t: '1946 &middot; dry summer' }, { i: 29, a: deg(-108), t: '2019 &middot; felled' }],
  });
  const rings2 = $('#rings-2');
  if (rings2) buildRings(rings2, { count: 30, seed: 977, hot: [10, 22], core: 0 });

  /* ---------- pointer drift on the rings ---------- */
  const ringsSvg = $('.rings-svg');
  if (ringsSvg && finePointer.matches && !reduceMQ.matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    const step = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      ringsSvg.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) rotate(${(cx * 0.05).toFixed(3)}deg)`;
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.05) requestAnimationFrame(step); else running = false;
    };
    addEventListener('pointermove', (e) => {
      if (scrollY > innerHeight) return;
      tx = (e.clientX / innerWidth - 0.5) * -26; ty = (e.clientY / innerHeight - 0.5) * -18;
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: true });
  }

  /* ---------- manifesto: words light up with scroll (kit writes --p) ---------- */
  const manifesto = $('#manifesto');
  if (manifesto) {
    const words = manifesto.textContent.trim().split(/\s+/);
    manifesto.innerHTML = words.map((w, i) => `<span class="w" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  }

  /* ---------- prepare drawing paths ---------- */
  $$('.card-art svg').forEach((svg) => $$('.dr', svg).forEach((el, i) => { el.setAttribute('pathLength', '1'); el.style.setProperty('--k', (i * 0.045).toFixed(3)); }));

  // clapboard for the story house: vertical boards left→right, each drawn bottom→top
  const boards = $('#boards');
  const top = (x) => 290 - 120 * (1 - Math.abs(x - 450) / 220);
  if (boards) for (let x = 238; x <= 662; x += 8) {
    if ([230, 340, 450, 560, 670].some((p) => Math.abs(p - x) < 4)) continue;
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 440); l.setAttribute('y2', (top(x) + 7).toFixed(1));
    l.setAttribute('pathLength', '1');
    l.style.setProperty('--s', (0.47 + ((x - 230) / 440) * 0.15).toFixed(3));
    boards.appendChild(l);
  }
  $$('.story-svg .draw').forEach((el) => el.setAttribute('pathLength', '1'));

  /* ---------- scroll loop ---------- */
  const works = $('.works'), track = $('#track'), cards = $$('.card'), bar = $('.works-bar i'), cur = $('.works-count .cur');
  const story = $('.story'), steps = $$('.step'), phase = $('.ph'), phName = $('.ph-name'), sun = $('#sun');
  const phaseNames = ['Site &mdash; levels, contours, axes', 'Frame &mdash; glulam GL30c, 115 &times; 360', 'Envelope &mdash; larch boards, 21 &times; 120', 'Light &mdash; glazing set to the sun path'];
  let dist = 0, activeStep = -1, activeCard = -1;

  function layout() {
    if (compactMQ.matches) { works.style.height = ''; dist = 0; return; }
    dist = Math.max(0, track.scrollWidth - innerWidth);
    const h = Math.round(dist + innerHeight * 1.2) + 'px';
    if (works.style.height !== h) works.style.height = h;
  }

  const progressOf = (el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };

  function frame() {
    const vh = innerHeight;
    root.style.setProperty('--scroll', (scrollY / Math.max(1, document.documentElement.scrollHeight - vh)).toFixed(4));

    if (works && !compactMQ.matches) {
      const r = works.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) {
        const raw = progressOf(works);
        const p = clamp((raw - 0.04) / 0.9);
        const eased = p; // linear mapping keeps scroll and motion 1:1
        track.style.setProperty('--tx', (-eased * dist).toFixed(1) + 'px');
        if (bar) bar.parentElement.style.setProperty('--wp', eased.toFixed(4));
        if (bar) bar.style.setProperty('--wp', eased.toFixed(4));
        works.style.setProperty('--wp', eased.toFixed(4));
        const idx = clamp(Math.round(eased * (cards.length - 1) + 0.0001), 0, cards.length - 1);
        if (idx !== activeCard) { activeCard = idx; cur.textContent = String(idx + 1).padStart(2, '0'); }
        for (const c of cards) {
          const left = c.getBoundingClientRect().left;
          c.style.setProperty('--d', clamp((innerWidth * 0.94 - left) / (innerWidth * 0.5)).toFixed(3));
        }
      }
    }

    if (story) {
      const r = story.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) {
        const p = clamp((progressOf(story) - 0.01) / 0.95);
        story.style.setProperty('--p', p.toFixed(4));
        const idx = p < 0.21 ? 0 : p < 0.46 ? 1 : p < 0.72 ? 2 : 3;
        if (idx !== activeStep) {
          activeStep = idx;
          steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
          phase.textContent = `Phase 0${idx + 1} / 04`;
          phName.innerHTML = phaseNames[idx];
        }
        const t = 0.06 + 0.88 * p;
        sun.setAttribute('transform', `translate(${(110 + 680 * t).toFixed(1)} ${(420 - 1240 * t * (1 - t)).toFixed(1)})`);
      }
    }
  }

  let queued = false;
  const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; frame(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { layout(); onScroll(); });
  addEventListener('load', () => { layout(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); onScroll(); });
  layout(); frame();

  /* ---------- menu ---------- */
  const btn = $('.menu-btn'), menu = $('#menu');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
})();
