/* Atelier Norr — page choreography. Works alongside motion-kit.js (reveals, counters, marquee, magnetic). */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 760px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (x) => x * x * (3 - 2 * x);
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- annual rings (seeded so the tree is always the same tree) ---------- */
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function buildRings(g, markGroup) {
    const rand = rng(1976), N = 30, steps = 112;
    let r = 10; const radii = [];
    for (let i = 0; i < N; i++) { r += (i % 7 === 3 ? 4 : 8) + rand() * 9; radii.push(r); }
    const scale = 372 / radii[N - 1];
    const ph = [rand() * 6, rand() * 6, rand() * 6, rand() * 6];
    const frag = document.createDocumentFragment();
    const pt = (i, a) => {
      const rr = radii[i] * scale;
      const wob = 1 + 0.022 * Math.sin(2 * a + ph[0] + i * 0.05) + 0.015 * Math.sin(3 * a + ph[1] + i * 0.07) + 0.008 * Math.sin(5 * a + ph[2] + i * 0.11) + 0.004 * Math.sin(8 * a + ph[3]);
      return [400 + i * 0.55 + Math.cos(a) * rr * wob, 400 - i * 0.35 + Math.sin(a) * rr * wob * 0.97];
    };
    for (let i = 0; i < N; i++) {
      let d = '';
      for (let s = 0; s <= steps; s++) { const [x, y] = pt(i, (s / steps) * Math.PI * 2); d += (s ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d + 'Z'); p.setAttribute('pathLength', '1');
      p.style.setProperty('--k', i);
      const late = i % 5 === 2;
      p.style.strokeWidth = (late ? 1.7 : 0.8 + rand() * 0.5).toFixed(2);
      p.style.opacity = (late ? 0.85 : 0.38 + rand() * 0.3).toFixed(2);
      if (i === 21) { p.classList.add('cr'); p.style.strokeWidth = '2.2'; p.style.opacity = '1'; }
      frag.appendChild(p);
    }
    // checks (radial cracks) that open outward from the pith
    [[3.5, 14], [3.75, 17], [5.55, 12]].forEach(([a, from], j) => {
      const p = document.createElementNS(NS, 'path');
      const [x0, y0] = pt(from, a), [x1, y1] = pt(N - 1, a + 0.04);
      p.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`);
      p.setAttribute('pathLength', '1'); p.classList.add('cr-line');
      p.style.setProperty('--k', N + j); p.style.strokeWidth = '0.9';
      frag.appendChild(p);
    });
    const pith = document.createElementNS(NS, 'circle');
    pith.setAttribute('cx', 400); pith.setAttribute('cy', 400); pith.setAttribute('r', 3); pith.setAttribute('fill', 'currentColor');
    frag.appendChild(pith);
    g.appendChild(frag);
    if (markGroup) {
      const [x, y] = pt(21, 0.9);
      const line = $('.mark-line', markGroup), dot = $('.mark-dot', markGroup), text = $('.mark-text', markGroup);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      line.setAttribute('x1', x); line.setAttribute('y1', y); line.setAttribute('x2', x); line.setAttribute('y2', 770);
      text.setAttribute('x', x + 2); text.setAttribute('y', 788); text.setAttribute('text-anchor', 'end');
    }
  }
  const ringsSvg = $('#heroRings');
  const ringsG = $('.rings-g', ringsSvg);
  buildRings(ringsG, $('.rings-mark', ringsSvg));

  /* ---------- hero entrance: commit hidden state, then go ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('hero-ready')));

  /* ---------- manifesto: words become opaque as you read ---------- */
  const mText = $('#manifestoText');
  {
    const words = mText.textContent.trim().split(/\s+/);
    mText.setAttribute('aria-label', words.join(' '));
    mText.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--t:${(i / words.length).toFixed(4)}">${w}</span>`).join(' ');
  }

  /* ---------- project gallery sizing ---------- */
  const hs = $('#hscroll'), hTrack = $('#hTrack'), panels = $$('.proj', hTrack), arts = $$('.panel-art', hTrack);
  const projNow = $('#projNow');
  const pinned = () => !reduce && !phone.matches;
  function sizeGallery() {
    if (!pinned()) { hs.style.height = ''; hTrack.style.removeProperty('--tx'); return; }
    const dist = Math.max(0, hTrack.scrollWidth - innerWidth);
    hs.style.height = (dist + innerHeight * 1.25) + 'px';
  }

  /* ---------- process: blueprint parts ---------- */
  const slatG = $('#slatsG');
  {
    const xs = [];
    for (let x = 129; x < 212; x += 11) xs.push(x);
    for (let x = 429; x < 512; x += 11) xs.push(x);
    xs.forEach((x, i) => {
      const r = document.createElementNS(NS, 'rect');
      const a = 0.72 + (i / xs.length) * 0.1;
      r.setAttribute('x', x); r.setAttribute('y', 254); r.setAttribute('width', 8); r.setAttribute('height', 156);
      r.setAttribute('class', 'part p-down'); r.dataset.a = a.toFixed(3); r.dataset.b = (a + 0.1).toFixed(3);
      slatG.appendChild(r);
    });
  }
  const parts = $$('.part').map((el) => ({ el, a: parseFloat(el.dataset.a), b: parseFloat(el.dataset.b), last: -1 }));
  const procScroll = $('#processScroll'), procStage = $('.process-stage', procScroll);
  const stepEls = $$('.step'), steps = [0, 0.27, 0.52, 0.8];
  const phases = ['Phase 01 — Site', 'Phase 02 — Grain', 'Phase 03 — Frame', 'Phase 04 — Light'];
  const phaseEl = $('#phase'), sun = $('#sun');
  let curStep = -1;
  function updateProcess(p) {
    for (const part of parts) {
      const t = reduce ? 1 : smooth(clamp((p - part.a) / (part.b - part.a)));
      if (Math.abs(t - part.last) > 0.002) { part.el.style.setProperty('--t', t.toFixed(3)); part.last = t; }
    }
    const e = 1 - Math.pow(1 - p, 2);
    sun.style.setProperty('--sunx', (80 + 460 * p).toFixed(1) + 'px');
    sun.style.setProperty('--suny', (222 - 138 * e).toFixed(1) + 'px');
    procScroll.style.setProperty('--pp', p.toFixed(4));
    let s = 0; steps.forEach((v, i) => { if (p >= v) s = i; });
    if (s !== curStep) {
      curStep = s;
      stepEls.forEach((el, i) => el.classList.toggle('is-active', i === s));
      phaseEl.textContent = phases[s];
    }
  }

  /* ---------- one scroll loop ---------- */
  const bar = $('.progress'), wordmark = $('.wordmark'), footer = $('.footer');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight, vw = innerWidth, y = scrollY;
    const doc = root.scrollHeight - vh;
    bar.style.setProperty('--sp', doc > 0 ? (y / doc).toFixed(4) : 0);

    // hero rings: slow turn on scroll + pointer drift
    if (!reduce && y < vh * 1.4) {
      pointer.x += (pointer.tx - pointer.x) * 0.08; pointer.y += (pointer.ty - pointer.y) * 0.08;
      ringsG.style.transform = `translate3d(${(pointer.x * 14).toFixed(1)}px, ${(pointer.y * 10 - y * 0.06).toFixed(1)}px, 0) rotate(${(y * 0.018).toFixed(2)}deg)`;
      if (Math.abs(pointer.tx - pointer.x) > 0.002 || Math.abs(pointer.ty - pointer.y) > 0.002) schedule();
    }

    if (!reduce) {
      const m = $('#manifesto').getBoundingClientRect();
      if (m.bottom > -100 && m.top < vh + 100) mText.style.setProperty('--p', clamp(-m.top / (m.height - vh)).toFixed(4));
    }

    if (pinned()) {
      const r = hs.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) {
        const p = clamp(-r.top / (r.height - vh));
        const dist = Math.max(0, hTrack.scrollWidth - vw);
        // gallery moves during the first 80% of the pin, then rests on the last panel
        const q = clamp(p / 0.8);
        hTrack.style.setProperty('--tx', (-q * dist).toFixed(1) + 'px');
        $('#projBar').parentNode.style.setProperty('--hp', q.toFixed(3));
        let best = 0, bd = 1e9;
        panels.forEach((el, i) => {
          const b = el.getBoundingClientRect(), c = b.left + b.width / 2;
          if (Math.abs(c - vw * 0.42) < bd) { bd = Math.abs(c - vw * 0.42); best = i; }
          arts[i].style.setProperty('--ix', ((c - vw / 2) * -0.07).toFixed(1) + 'px');
        });
        const label = String(best + 1).padStart(2, '0');
        if (projNow.textContent !== label) projNow.textContent = label;
      }
    }

    const pr = procScroll.getBoundingClientRect();
    if (reduce) { if (curStep < 0) updateProcess(1); }
    else if (pr.bottom > -100 && pr.top < vh + 100) updateProcess(clamp(-pr.top / (pr.height - vh)));

    if (!reduce) {
      const f = footer.getBoundingClientRect();
      wordmark.style.setProperty('--wm', clamp((vh - f.top) / (f.height * 0.9)).toFixed(3));
    }
  }
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { sizeGallery(); schedule(); });
  if (finePointer && !reduce) {
    addEventListener('pointermove', (e) => { pointer.tx = e.clientX / innerWidth - 0.5; pointer.ty = e.clientY / innerHeight - 0.5; schedule(); }, { passive: true });
  }
  sizeGallery();
  addEventListener('load', () => { sizeGallery(); schedule(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { sizeGallery(); schedule(); });
  if (reduce) updateProcess(1);
  schedule();

  /* ---------- mask-rise titles ---------- */
  const rises = $$('.rise, [data-clip]');
  if (reduce || !('IntersectionObserver' in window)) rises.forEach((el) => el.classList.add('in'));
  else {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    rises.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => rises.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('in'); }), 400));
  }

  /* ---------- enquiry form -> prepared email ---------- */
  const form = $('#enquiry'), note = $('#formNote');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form), name = (d.get('name') || '').toString().trim(), email = (d.get('email') || '').toString().trim(), brief = (d.get('brief') || '').toString().trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !brief) { note.textContent = 'Please add your name, a valid email and a few words about the project.'; return; }
    note.textContent = 'Opening your email app with your message…';
    location.href = 'mailto:studio@atelier-norr.example?subject=' + encodeURIComponent('Enquiry from ' + name) + '&body=' + encodeURIComponent(brief + '\n\n— ' + name + ' (' + email + ')');
  });
})();
