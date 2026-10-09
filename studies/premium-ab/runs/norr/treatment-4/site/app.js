/* Atelier Norr — page behaviour. Generic reveals live in motion-kit.js; this file adds
 * the growth rings, the manifesto, the horizontal project track, the pinned "raising a building" story,
 * the mobile menu and the enquiry form. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------- growth rings: wobbly, eccentric, irregular spacing like real years ---------- */
  function buildRings(svg) {
    const cfg = JSON.parse(svg.dataset.rings || '{}');
    const n = cfg.n || 24, rand = rng(cfg.seed || 1);
    const cx = 400, cy = 400, r0 = 10, r1 = 360;
    const widths = Array.from({ length: n }, () => 0.55 + rand() * 0.9);
    const total = widths.reduce((a, b) => a + b, 0);
    const ph = Array.from({ length: 6 }, () => rand() * Math.PI * 2);
    let acc = 0;
    const gRings = el('g', { class: 'ring-layer' });
    for (let i = 0; i < n; i++) {
      acc += widths[i];
      const r = r0 + (r1 - r0) * (acc / total);
      const t = i / (n - 1);
      const ox = cx + i * 0.8, oy = cy - i * 0.45;
      const pts = [];
      const steps = 120;
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const k = 1 + 0.045 * Math.sin(2 * a + ph[0] + t * 2) + 0.028 * Math.sin(3 * a + ph[1]) + 0.012 * Math.sin(7 * a + ph[2] + i * 0.35) + 0.006 * Math.sin(13 * a + ph[3] + i);
        pts.push(`${(ox + Math.cos(a) * r * k).toFixed(1)} ${(oy + Math.sin(a) * r * k * 0.97).toFixed(1)}`);
      }
      const g = el('g', { class: 'ring-g' });
      const cls = i === n - 1 ? 'ring felled' : (i % 6 === 5 ? 'ring major' : 'ring');
      g.appendChild(el('path', { class: cls, d: 'M' + pts.join('L') + 'Z', pathLength: '1', style: `--i:${i}` }));
      g.dataset.depth = (0.3 + t * 0.9).toFixed(2);
      gRings.appendChild(g);
    }
    svg.appendChild(gRings);
    const crackA = el('path', { class: 'crack', pathLength: '1', style: `--i:${n - 4}`, d: `M${cx} ${cy}L${cx + 190} ${cy - 40}L${cx + 330} ${cy - 22}` });
    svg.appendChild(crackA);
    if (cfg.labels) {
      const ticks = el('g', { class: 'ticks' });
      for (let s = 0; s < 96; s++) {
        const a = (s / 96) * Math.PI * 2, long = s % 8 === 0;
        const ra = r1 + 34, rb = ra + (long ? 20 : 9);
        ticks.appendChild(el('path', { class: 'tick', d: `M${(cx + Math.cos(a) * ra).toFixed(1)} ${(cy + Math.sin(a) * ra).toFixed(1)}L${(cx + Math.cos(a) * rb).toFixed(1)} ${(cy + Math.sin(a) * rb).toFixed(1)}` }));
      }
      svg.appendChild(ticks);
      const t1 = el('text', { class: 'rlabel', x: cx + 6, y: cy - 14 }); t1.textContent = 'Pith — 1881';
      const t2 = el('text', { class: 'rlabel', x: cx + 352, y: cy + 330, 'text-anchor': 'end', fill: 'currentColor' }); t2.textContent = 'Felled 2021 · Kemi';
      svg.appendChild(t1); svg.appendChild(t2);
    }
  }
  $$('[data-rings]').forEach(buildRings);

  /* draw non-hero rings when they approach the viewport */
  const ringIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-drawn'); ringIO.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px' }) : null;
  $$('.rings').forEach((svg) => { if (svg.id === 'heroRings') return; if (ringIO) ringIO.observe(svg); else svg.classList.add('is-drawn'); });

  /* ---------- hero entrance: starts on first frame ---------- */
  const heroSvg = $('#heroRings');
  const ready = () => { root.classList.add('is-ready'); heroSvg && heroSvg.classList.add('is-drawn'); };
  requestAnimationFrame(() => requestAnimationFrame(ready));

  /* ---------- pointer + scroll parallax on the hero rings (one rAF loop, runs only while moving) ---------- */
  if (heroSvg && !reduce.matches) {
    const layers = $$('.ring-g', heroSvg);
    const state = { tx: 0, ty: 0, x: 0, y: 0, rot: 0, trot: 0, running: false, visible: true };
    const frame = () => {
      state.x += (state.tx - state.x) * 0.07; state.y += (state.ty - state.y) * 0.07; state.rot += (state.trot - state.rot) * 0.1;
      for (const g of layers) { const d = +g.dataset.depth; g.style.transform = `translate3d(${(state.x * d * 26).toFixed(2)}px, ${(state.y * d * 26).toFixed(2)}px, 0)`; }
      heroSvg.style.transform = `rotate(${state.rot.toFixed(2)}deg)`;
      const moving = Math.abs(state.tx - state.x) > 0.002 || Math.abs(state.ty - state.y) > 0.002 || Math.abs(state.trot - state.rot) > 0.01;
      if (moving && state.visible) requestAnimationFrame(frame); else state.running = false;
    };
    const kick = () => { if (!state.running && state.visible) { state.running = true; requestAnimationFrame(frame); } };
    if (fine.matches) addEventListener('pointermove', (e) => { state.tx = e.clientX / innerWidth - 0.5; state.ty = e.clientY / innerHeight - 0.5; kick(); }, { passive: true });
    addEventListener('scroll', () => { state.trot = Math.min(scrollY, innerHeight * 1.2) * 0.022; kick(); }, { passive: true });
    new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; if (state.visible) kick(); }).observe($('.hero'));
  }

  /* ---------- manifesto: words light up as you read ---------- */
  const manifesto = $('#manifesto');
  if (manifesto) {
    const text = manifesto.textContent.trim().replace(/\s+/g, ' ');
    manifesto.setAttribute('aria-label', text);
    const words = text.split(' ');
    manifesto.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  }

  /* ---------- horizontal project track: vertical scroll drives x ---------- */
  const hscroll = $('#work'), track = $('#hsTrack'), now = $('#hsNow');
  function sizeTrack() {
    if (!hscroll || !track) return;
    const stacked = getComputedStyle(hscroll.querySelector('.hs-stage')).position !== 'sticky';
    if (stacked) { hscroll.style.removeProperty('--hs-h'); track.style.removeProperty('--hs-x'); return; }
    const dx = Math.max(0, track.scrollWidth - innerWidth);
    track.style.setProperty('--hs-x', `${-dx}px`);
    hscroll.style.setProperty('--hs-h', `${dx + innerHeight * 1.15}px`);
  }
  sizeTrack();
  addEventListener('resize', sizeTrack);
  addEventListener('load', sizeTrack);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeTrack);

  const cards = $$('.card[data-i]');
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      /* current project = card whose centre is nearest the left third of the viewport */
      if (now && cards.length) {
        let best = 0, bestD = Infinity;
        cards.forEach((c, i) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - innerWidth * 0.5); if (d < bestD) { bestD = d; best = i; } });
        const v = String(best + 1).padStart(2, '0');
        if (now.textContent !== v) now.textContent = v;
      }
      updateStory();
    });
  }

  /* ---------- pinned story: active step from progress ---------- */
  const story = $('#process');
  const steps = $$('.step', story), rail = $$('.story-rail li', story), caps = $$('.fc', story);
  let activeStep = -1;
  function updateStory() {
    if (!story) return;
    const p = parseFloat(story.style.getPropertyValue('--p')) || 0;
    const idx = Math.min(steps.length - 1, Math.floor((p / 0.9) * steps.length));
    if (idx === activeStep) return;
    activeStep = idx;
    steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    rail.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    caps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
  }

  /* timber screen: slats follow the roofline; generated so the geometry stays exact */
  const slatsG = $('#slats');
  if (slatsG) {
    const roofY = (x) => (x <= 320 ? 236 - (x - 110) * (136 / 210) : 236 - (530 - x) * (136 / 210));
    const list = [];
    for (let x = 152; x < 488; x += 9) {
      const cx = x + 3;
      const inBay = cx > 244 && cx < 394;
      const top = roofY(cx) + 8, bottom = inBay ? 264 : 380;
      if (bottom - top > 4) list.push({ x, top, h: bottom - top });
    }
    list.forEach((s, i) => {
      slatsG.appendChild(el('rect', { class: 'slat', x: s.x, y: s.top, width: 6, height: s.h, style: `--k:${i};fill-opacity:${(0.82 + ((i * 37) % 18) / 100).toFixed(2)}` }));
    });
    slatsG.style.setProperty('--n', list.length);
    slatsG.appendChild(el('path', { class: 'roof', pathLength: '1', d: 'M96 246L320 94L544 246' }));
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
  setTimeout(onScroll, 300);

  /* ---------- mobile menu ---------- */
  const menuBtn = $('.menu-btn'), menu = $('#menu');
  const links = $$('a', menu);
  links.forEach((a, i) => a.style.setProperty('--mi', i));
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.firstElementChild.textContent = open ? 'Close' : 'Menu';
  }
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  links.forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- enquiry form: composes a mail, never sends data anywhere itself ---------- */
  const form = $('#enquiry'), note = $('#formNote');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = (f.get('name') || '').toString().trim(), email = (f.get('email') || '').toString().trim(), brief = (f.get('brief') || '').toString().trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !brief) { note.textContent = 'Please add your name, a valid email and a few words about the site.'; return; }
    const body = `${brief}\n\n— ${name} (${email})`;
    note.textContent = 'Thank you. Your email app should open with the enquiry ready to send.';
    location.href = `mailto:studio@ateliernorr.example?subject=${encodeURIComponent('Enquiry from ' + name)}&body=${encodeURIComponent(body)}`;
  });
})();
