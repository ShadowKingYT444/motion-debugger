/* Halo H1 — page behaviour. Pairs with motion-kit.js (reveals, scroll scenes, chapter colours).
 * Everything here is progressive: without it the page is a complete static layout. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (name, attrs = {}, parent) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  };
  const fx = (n) => (Math.round(n * 10) / 10).toString();
  root.classList.add('js-draw');

  /* ---------- hero entrance: starts once the display face is in (400 ms at most) ---------- */
  function heroGo() {
    const hero = $('.hero');
    if (!hero) return;
    let done = false;
    const go = () => { if (done) return; done = true; requestAnimationFrame(() => hero.classList.add('hero-go')); };
    if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('200 100px Archivo'), new Promise((r) => setTimeout(r, 400))]).then(go, go);
    else go();
    setTimeout(go, 500);
  }

  /* ---------- nav ---------- */
  function initNav() {
    const nav = $('#nav');
    if (!nav) return;
    const toggle = $('.nav-toggle', nav);
    const po = $('#preorder');
    const set = () => {
      nav.classList.toggle('is-scrolled', scrollY > 24);
      if (po) root.classList.toggle('on-signal', po.getBoundingClientRect().top < innerHeight / 2);
    };
    set();
    addEventListener('scroll', set, { passive: true });
    const close = () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', close));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    matchMedia('(min-width: 861px)').addEventListener('change', close);
  }

  /* ---------- draw-on-view for custom figures ---------- */
  function initSeen() {
    const targets = $$('[data-seen]');
    if (reduce.matches || !('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('seen')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
    }, { threshold: 0.2 });
    targets.forEach((t) => io.observe(t));
    addEventListener('load', () => setTimeout(() => targets.forEach((t) => { if (t.getBoundingClientRect().bottom < 0) t.classList.add('seen'); }), 400));
  }

  /* ---------- 01 the sweep (a logarithmic sine sweep, drawn to the page width) ---------- */
  function initSweep() {
    const svg = $('.sweep');
    if (!svg) return;
    const path = $('.sweep-path', svg), axis = $('.sweep-axis', svg);
    const build = () => {
      const r = svg.getBoundingClientRect();
      const W = Math.max(240, Math.round(r.width)), H = Math.max(60, Math.round(r.height));
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      axis.setAttribute('x2', W); axis.setAttribute('y1', H / 2); axis.setAttribute('y2', H / 2);
      const mid = H / 2, amp = mid * 0.86, fa = 1, fb = Math.min(70, W / 13), ratio = fb / fa;
      const n = Math.round(W * 1.6);
      let d = '';
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const phase = 2 * Math.PI * (fa / Math.log(ratio)) * (Math.pow(ratio, u) - 1);
        const env = Math.min(1, u / 0.03, (1 - u) / 0.03);
        d += (i ? 'L' : 'M') + fx(u * W) + ' ' + fx(mid - amp * env * Math.sin(phase));
      }
      path.setAttribute('d', d);
    };
    build();
    if ('ResizeObserver' in window) { let w = svg.clientWidth; new ResizeObserver(() => { if (Math.abs(svg.clientWidth - w) > 4) { w = svg.clientWidth; build(); } }).observe(svg); }
  }

  /* ---------- 02 exploded view: which part is being described ---------- */
  function initObject() {
    const sec = $('.object');
    if (!sec) return;
    const stage = $('.ex-stage', sec), items = $$('.steps li', sec);
    const pinned = matchMedia('(min-width: 861px) and (prefers-reduced-motion: no-preference)');
    let cur = -2, queued = false;
    const apply = () => {
      queued = false;
      let idx = -1;
      if (pinned.matches) {
        const p = parseFloat(sec.style.getPropertyValue('--p')) || 0;
        idx = Math.max(0, Math.min(4, Math.floor(p * 5)));
      }
      if (idx === cur) return;
      cur = idx;
      stage.dataset.step = idx;
      items.forEach((li, i) => li.classList.toggle('is-on', i === idx));
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    pinned.addEventListener('change', queue);
    apply();
    // Clicking a step jumps the scroll to the middle of its range.
    items.forEach((li, i) => {
      li.tabIndex = 0;
      const jump = () => {
        if (!pinned.matches) return;
        const total = sec.offsetHeight - innerHeight;
        scrollTo({ top: sec.offsetTop + total * (i * 0.2 + 0.1), behavior: reduce.matches ? 'auto' : 'smooth' });
      };
      li.addEventListener('click', jump);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } });
    });
  }

  /* ---------- 03 polar plot ---------- */
  function initPolar() {
    const svg = $('#polar');
    if (!svg) return;
    const cx = 260, cy = 260, R = 208, N = 240, FLOOR = 40;
    const grid = $('.p-grid', svg), conv = $('.p-conv', svg), halo = $('.p-halo', svg), fill = $('.p-halo-fill', svg);
    const rOf = (L) => R * Math.max(0, (FLOOR + L) / FLOOR);
    for (const L of [0, -6, -12, -18, -24, -30]) svgEl('circle', { cx, cy, r: rOf(L) }, grid);
    for (let a = 0; a < 360; a += 30) {
      const t = (a * Math.PI) / 180;
      svgEl('line', { x1: cx, y1: cy, x2: fx(cx + R * Math.sin(t)), y2: fx(cy - R * Math.cos(t)) }, grid);
      const lab = svgEl('text', { x: fx(cx + (R + 18) * Math.sin(t)), y: fx(cy - (R + 18) * Math.cos(t)), 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grid);
      lab.textContent = a + '°';
    }
    [[0, '0'], [-6, '−6'], [-12, '−12'], [-18, '−18'], [-24, '−24'], [-30, '−30 dB']].forEach(([L, s]) => {
      const t = (14 * Math.PI) / 180, r = rOf(L);
      const lab = svgEl('text', { x: fx(cx + r * Math.sin(t) + 4), y: fx(cy - r * Math.cos(t) - 3) }, grid);
      lab.textContent = s;
    });
    // Design-target patterns at 500 Hz, 2 kHz and 8 kHz. Halo: six-fold ripple from the ring of tweeters.
    const ripple = [0.4, 1.6, 3.2], K = [3.4, 9, 16], P = [1, 1.15, 1.3];
    const haloL = (t, f) => -ripple[f] * (1 - Math.cos(6 * t)) / 2 - 0.1 * (f + 1) * Math.sin(3 * t + 0.8);
    const convL = (t, f) => Math.max(-FLOOR, -K[f] * Math.pow(1 - Math.cos(t), P[f]));
    const target = (f) => ({ h: Array.from({ length: N }, (_, i) => haloL((2 * Math.PI * i) / N, f)), c: Array.from({ length: N }, (_, i) => convL((2 * Math.PI * i) / N, f)) });
    const toPath = (arr) => arr.map((L, i) => {
      const t = (2 * Math.PI * i) / N, r = rOf(L);
      return (i ? 'L' : 'M') + fx(cx + r * Math.sin(t)) + ' ' + fx(cy - r * Math.cos(t));
    }).join('') + 'Z';
    const state = target(1);
    const paint = () => { const h = toPath(state.h); halo.setAttribute('d', h); fill.setAttribute('d', h); conv.setAttribute('d', toPath(state.c)); };
    paint();

    let raf = 0;
    const morph = (f) => {
      const to = target(f), from = { h: state.h.slice(), c: state.c.slice() };
      cancelAnimationFrame(raf);
      if (reduce.matches) { state.h = to.h; state.c = to.c; paint(); return; }
      const t0 = performance.now(), dur = 800;
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur), e = u >= 1 ? 1 : 1 - Math.pow(2, -10 * u);
        for (let i = 0; i < N; i++) { state.h[i] = from.h[i] + (to.h[i] - from.h[i]) * e; state.c[i] = from.c[i] + (to.c[i] - from.c[i]) * e; }
        paint();
        if (u < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const seg = $('.seg'), ink = $('.seg-ink', seg), buttons = $$('button', seg);
    const place = (btn) => { ink.style.setProperty('--x', btn.offsetLeft + 'px'); ink.style.setProperty('--w', btn.offsetWidth); };
    const pick = (btn, animate = true) => {
      buttons.forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      place(btn);
      if (animate) morph(Number(btn.dataset.f));
    };
    buttons.forEach((b) => b.addEventListener('click', () => pick(b)));
    seg.addEventListener('keydown', (e) => {
      const i = buttons.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : null;
      if (next === null) return;
      e.preventDefault();
      const b = buttons[(next + buttons.length) % buttons.length];
      b.focus(); pick(b);
    });
    const first = buttons.find((b) => b.getAttribute('aria-checked') === 'true');
    pick(first, false);
    addEventListener('resize', () => place(buttons.find((b) => b.getAttribute('aria-checked') === 'true')));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(buttons.find((b) => b.getAttribute('aria-checked') === 'true')));
  }

  /* ---------- 03 frequency response ---------- */
  function initResponse() {
    const svg = $('#fr');
    if (!svg) return;
    const W = 560, H = 300, pl = 44, pr = 10, pt = 10, pb = 30, top = 9, bottom = -15;
    const lo = Math.log10(20), span = 3;
    const X = (f) => pl + ((Math.log10(f) - lo) / span) * (W - pl - pr);
    const Y = (db) => pt + ((top - db) / (top - bottom)) * (H - pt - pb);
    const grid = $('.f-grid', svg);
    for (const f of [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
      svgEl('line', { x1: fx(X(f)), x2: fx(X(f)), y1: pt, y2: H - pb }, grid);
      const t = svgEl('text', { x: fx(X(f)), y: H - 8, 'text-anchor': 'middle' }, grid);
      t.textContent = f >= 1000 ? f / 1000 + 'k' : String(f);
    }
    for (const db of [6, 0, -6, -12]) {
      svgEl('line', { x1: pl, x2: W - pr, y1: fx(Y(db)), y2: fx(Y(db)), class: db === 0 ? 'f-zero' : '' }, grid);
      const t = svgEl('text', { x: pl - 8, y: fx(Y(db)), 'text-anchor': 'end', 'dominant-baseline': 'central' }, grid);
      t.textContent = (db > 0 ? '+' : db < 0 ? '−' : '') + Math.abs(db);
    }
    const unit = svgEl('text', { x: pl - 8, y: pt - 1, 'text-anchor': 'end' }, grid); unit.textContent = 'dB';
    $('.f-band', svg).setAttribute('d', `M${pl} ${fx(Y(3))}H${W - pr}V${fx(Y(-3))}H${pl}Z`);
    const g = (f, c, w, a) => a * Math.exp(-Math.pow((Math.log10(f) - Math.log10(c)) / w, 2));
    const fix = (f) => -10 * Math.log10(1 + Math.pow(38 / f, 4)) - 10 * Math.log10(1 + Math.pow(f / 22000, 6)) + 0.45 * Math.sin(Math.log10(f) * 14.5 + 0.6) * (f > 70 ? 1 : 0.4);
    const raw = (f) => fix(f) + g(f, 58, 0.05, 6.5) + g(f, 92, 0.04, -7) + g(f, 140, 0.05, 4.5) + g(f, 230, 0.06, -3.2) + g(f, 360, 0.07, 2.2) + 0.35 * Math.sin(Math.log10(f) * 31);
    const build = (fn) => { let d = ''; const n = 260; for (let i = 0; i <= n; i++) { const f = Math.pow(10, lo + (span * i) / n); d += (i ? 'L' : 'M') + fx(X(f)) + ' ' + fx(Y(Math.max(bottom + 0.5, fn(f)))); } return d; };
    $('.f-raw', svg).setAttribute('d', build(raw));
    $('.f-fix', svg).setAttribute('d', build(fix));
  }

  /* ---------- 04 colourways: the object, the page ground and the order form follow one choice ---------- */
  const WOOL = {
    nordhavn: { name: 'Nordhavn', code: '120', c: '#3F5A6B', hi: '#7F9BAB', lo: '#1F313D', bg: '#CBD6DB' },
    amager: { name: 'Amager', code: '950', c: '#303437', hi: '#62686D', lo: '#15181A', bg: '#D3D6D4' },
    refshale: { name: 'Refshale', code: '460', c: '#B5684A', hi: '#E2A283', lo: '#6F3624', bg: '#E8CDBF' },
    dyrehaven: { name: 'Dyrehaven', code: '640', c: '#66744F', hi: '#98A878', lo: '#364229', bg: '#D3D9C4' },
  };
  const OAK = { soaped: 'Soaped oak', smoked: 'Smoked oak' };
  const choice = { wool: 'nordhavn', oak: 'soaped' };

  function initConfig() {
    const mat = $('#materials');
    const render = () => {
      const w = WOOL[choice.wool];
      root.style.setProperty('--wool', w.c); root.style.setProperty('--wool-hi', w.hi); root.style.setProperty('--wool-lo', w.lo);
      root.style.setProperty('--smoke', choice.oak === 'smoked' ? '1' : '0');
      if (mat) {
        mat.dataset.bg = w.bg;
        const r = mat.getBoundingClientRect(), mid = innerHeight / 2;
        if (r.top <= mid && r.bottom > mid) root.style.setProperty('--page-bg', w.bg);
      }
      const cap = $('#mat-cap-name'), capf = $('#mat-cap-foot'), line = $('#po-line');
      if (cap) cap.textContent = `${w.name} ${w.code}`;
      if (capf) capf.textContent = OAK[choice.oak];
      if (line) line.textContent = `Halo H1, ${w.name} ${w.code}, ${OAK[choice.oak].toLowerCase()}`;
      $$('input[name="wool"]').forEach((i) => { i.checked = i.value === choice.wool; });
      $$('input[name="po-wool"]').forEach((i) => { i.checked = i.value === choice.wool; });
      $$('input[name="po-oak"]').forEach((i) => { i.checked = i.value === choice.oak; });
      $$('.foot-pick button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.oak === choice.oak)));
    };
    $$('input[name="wool"], input[name="po-wool"]').forEach((i) => i.addEventListener('change', () => { choice.wool = i.value; render(); }));
    $$('input[name="po-oak"]').forEach((i) => i.addEventListener('change', () => { choice.oak = i.value; render(); }));
    $$('.foot-pick button').forEach((b) => b.addEventListener('click', () => { choice.oak = b.dataset.oak; render(); }));
    const group = $('.foot-pick');
    if (group) group.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      choice.oak = choice.oak === 'soaped' ? 'smoked' : 'soaped';
      render();
      $(`.foot-pick [data-oak="${choice.oak}"]`).focus();
    });
    render();
  }

  /* ---------- 07 pre-order form (concept page: nothing is sent anywhere) ---------- */
  function initForm() {
    const form = $('#po-form');
    if (!form) return;
    const email = $('#po-email'), err = $('#po-err'), done = $('#po-done');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!email.checkValidity() || !email.value.trim()) {
        err.hidden = false; email.setAttribute('aria-invalid', 'true'); email.focus();
        return;
      }
      err.hidden = true; email.removeAttribute('aria-invalid');
      const w = WOOL[choice.wool];
      const n = String(1 + Math.floor(Math.random() * 500)).padStart(4, '0');
      done.hidden = false;
      done.textContent = `Number ${n} is held for you: Halo H1 in ${w.name} ${w.code} with a ${OAK[choice.oak].toLowerCase()} foot. A confirmation goes to ${email.value.trim()}. This is a concept page, so nothing was charged and nothing was sent.`;
    });
    email.addEventListener('input', () => { if (email.checkValidity()) { err.hidden = true; email.removeAttribute('aria-invalid'); } });
  }

  const start = () => { heroGo(); initNav(); initSeen(); initSweep(); initObject(); initPolar(); initResponse(); initConfig(); initForm(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
