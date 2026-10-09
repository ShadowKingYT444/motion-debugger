/* Atelier Norr — interaction & motion (vanilla JS, no dependencies) */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const desktopQ = matchMedia('(min-width:900px)');
  let menuOpen = false;

  /* ---------- seeded random ---------- */
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------- split headings into masked lines ---------- */
  $$('.split').forEach(el => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.innerHTML = parts.map((p, i) => `<span class="line" aria-hidden="true"><span style="--i:${i}">${p.trim()}</span></span>`).join('');
  });

  /* ---------- pine forests that follow the ridge lines ---------- */
  $$('.forest').forEach(g => {
    const ridge = document.getElementById(g.dataset.ridge);
    if (!ridge || !ridge.getTotalLength) return;
    const total = ridge.getTotalLength();
    const pts = [];
    for (let i = 0; i <= 600; i++) { const p = ridge.getPointAtLength(total * i / 600); pts.push([p.x, p.y]); }
    const yAt = x => {
      let best = pts[0];
      for (let i = 0; i < pts.length; i++) if (Math.abs(pts[i][0] - x) < Math.abs(best[0] - x)) best = pts[i];
      return best[1];
    };
    const gap = +g.dataset.gap, H = +g.dataset.h, rand = rng(+g.dataset.seed || 7);
    let d = '';
    for (let x = -10; x < 1620; x += gap * (0.6 + rand() * 0.8)) {
      const y = yAt(clamp(x, 0, 1600)) + 10;
      const h = H * (0.5 + rand() * 0.6), w = h * (0.3 + rand() * 0.08);
      const t = [
        [x, y - h], [x + w * .26, y - h * .66], [x + w * .12, y - h * .66], [x + w * .38, y - h * .36],
        [x + w * .17, y - h * .36], [x + w * .5, y], [x - w * .5, y], [x - w * .17, y - h * .36],
        [x - w * .38, y - h * .36], [x - w * .12, y - h * .66], [x - w * .26, y - h * .66]
      ];
      d += 'M' + t.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', g.dataset.fill);
    g.appendChild(path);
  });

  /* ---------- starfield ---------- */
  const starCanvas = $('#stars');
  let stars = [], starCtx = null, starsAlive = true;
  if (starCanvas) {
    starCtx = starCanvas.getContext('2d');
    const sizeStars = () => {
      const r = starCanvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      starCanvas.width = r.width * dpr; starCanvas.height = r.height * dpr;
      const rand = rng(42);
      stars = Array.from({ length: 140 }, () => ({ x: rand(), y: rand() * .55, r: .4 + rand() * 1.1, p: rand() * 6.28, s: .4 + rand() * 1.4 }));
      drawStars(0);
    };
    const drawStars = t => {
      const w = starCanvas.width, h = starCanvas.height;
      starCtx.clearRect(0, 0, w, h);
      stars.forEach(s => {
        const a = reduce ? .7 : .35 + .55 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
        starCtx.fillStyle = `rgba(255,244,225,${a * (1 - s.y * 1.1)})`;
        starCtx.beginPath(); starCtx.arc(s.x * w, s.y * h, s.r * (w / 1400 + .6), 0, 6.283); starCtx.fill();
      });
    };
    sizeStars();
    addEventListener('resize', sizeStars);
    if (!reduce) {
      const loop = t => { if (starsAlive) drawStars(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    var setStarsAlive = v => { starsAlive = v; };
  }

  /* ---------- intro loader ---------- */
  const loader = $('.loader');
  const hero = $('#hero');
  let started = false;
  const heroIn = () => {
    $$('.hero .rv, .hero .display, .hero .blueprint').forEach(el => el.classList.add('in'));
  };
  const start = () => {
    if (started) return; started = true;
    root.classList.add('ready');
    heroIn();
    if (loader) {
      loader.classList.add('done');
      setTimeout(() => loader.classList.add('gone'), 1300);
    }
  };
  $('.display').style.setProperty('--base', '.45s');

  if (loader && !reduce) {
    $$('.loader-word span').forEach((s, i) => s.style.setProperty('--i', i));
    const num = $('#loadNum'), t0 = performance.now(), dur = 1900;
    const tick = now => {
      const p = clamp((now - t0) / dur);
      num.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(start, 250);
    };
    requestAnimationFrame(tick);
    setTimeout(start, 4200); // failsafe
  } else {
    start();
  }

  /* ---------- scroll-in reveals ---------- */
  const revealTargets = $$('.rv, .split, .rings, .pr, .award').filter(el => !el.closest('.hero'));
  if (reduce || !('IntersectionObserver' in window)) {
    revealTargets.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .16, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(el => io.observe(el));
    // award rows stagger
    $$('.award').forEach((el, i) => el.style.setProperty('--d', (i % 6) * 0.07 + 's'));
  }

  /* ---------- counters ---------- */
  const counters = $$('[data-count]');
  const runCount = el => {
    const target = +el.dataset.count, dur = 2200, t0 = performance.now();
    const step = now => {
      const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (reduce || !('IntersectionObserver' in window)) counters.forEach(el => el.textContent = el.dataset.count);
  else {
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); }
    }), { threshold: .6 });
    counters.forEach(el => cio.observe(el));
  }

  /* ---------- word-by-word scroll scrub ---------- */
  const scrub = $('#scrub');
  let words = [];
  if (scrub) {
    const text = scrub.textContent.trim();
    scrub.setAttribute('aria-label', text);
    scrub.innerHTML = text.split(/\s+/).map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    words = $$('.w', scrub);
    if (reduce) words.forEach(w => w.style.setProperty('--o', 1));
  }

  /* ---------- horizontal projects ---------- */
  const hs = $('#hs'), hsTrack = $('#hsTrack'), hsFill = $('#hsFill'), hsNow = $('#hsNow');
  const cards = $$('.card', hsTrack);
  let hsMax = 0, hsOn = false;
  const measureHS = () => {
    hsOn = desktopQ.matches && !reduce;
    if (!hsOn) { hs.style.height = ''; hsTrack.style.transform = ''; cards.forEach(c => c.style.removeProperty('--px')); return; }
    hsMax = Math.max(0, hsTrack.scrollWidth - innerWidth);
    hs.style.height = (hsMax + innerHeight) + 'px';
  };

  /* ---------- process frame ---------- */
  const steps = $$('.step');
  const stepsEl = $('#steps');
  const frameGroups = $$('#frameSvg g[data-g]');
  const frameLabel = $('#frameStep');
  let activeStep = -1;
  const setStep = i => {
    if (i === activeStep) return; activeStep = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    frameLabel.textContent = steps[i].dataset.step;
  };
  const drawFrame = p => {
    frameGroups.forEach((g, i) => {
      const gp = clamp(p * 5.2 - i * .92);
      $$('.pp', g).forEach(el => {
        el.style.strokeDashoffset = (1 - gp).toFixed(4);
        if (el.classList.contains('win')) el.style.setProperty('--wo', clamp((gp - .6) * 2.5).toFixed(3));
      });
    });
  };
  drawFrame(reduce ? 1 : 0);

  /* ---------- main scroll update ---------- */
  const nav = $('#nav'), progress = $('.progress');
  const parallax = $$('[data-speed]');
  const sections = ['studio', 'projects', 'process', 'awards', 'contact'].map(id => $('#' + id));
  let lastY = scrollY, ticking = false;

  const update = () => {
    ticking = false;
    const sy = scrollY, vh = innerHeight, vw = innerWidth;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty('--p', max > 0 ? (sy / max).toFixed(4) : 0);

    // nav show/hide
    const dy = sy - lastY;
    if (Math.abs(dy) > 6) {
      nav.classList.toggle('hide', dy > 0 && sy > vh * .6 && !menuOpen);
      lastY = sy;
    }

    // hero parallax (only while visible)
    if (!reduce && sy < vh * 1.2) {
      hero.style.setProperty('--sy', sy.toFixed(1));
      if (setStarsAlive) setStarsAlive(sy < vh);
    }

    // word scrub
    if (words.length && !reduce) {
      const r = scrub.getBoundingClientRect();
      const start = vh * .85, end = vh * .25;
      const p = clamp((start - r.top) / (start - end + r.height * .55));
      const n = words.length;
      for (let i = 0; i < n; i++) {
        const wp = clamp(p * (n + 6) - i, 0, 1);
        words[i].style.setProperty('--o', (.14 + .86 * wp).toFixed(3));
      }
    }

    // horizontal gallery
    if (hsOn) {
      const r = hs.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, hs.offsetHeight - vh));
      hsTrack.style.transform = `translate3d(${(-p * hsMax).toFixed(1)}px,0,0)`;
      hsFill.parentElement.style.setProperty('--hp', p.toFixed(4));
      cards.forEach(c => {
        const cr = c.getBoundingClientRect();
        c.style.setProperty('--px', (((cr.left + cr.width / 2) - vw / 2) / vw).toFixed(3));
      });
      // current card = closest to center-left
      let idx = 0, best = 1e9;
      cards.forEach((c, i) => { const cr = c.getBoundingClientRect(); const d = Math.abs(cr.left + cr.width / 2 - vw * .5); if (d < best) { best = d; idx = i; } });
      hsNow.textContent = String(idx + 1).padStart(2, '0');
    }

    // process
    if (stepsEl) {
      const r = stepsEl.getBoundingClientRect();
      const lastH = steps[steps.length - 1].offsetHeight;
      const denom = Math.max(1, r.height - lastH / 2 + vh * .15);
      const p = reduce ? 1 : clamp((vh * .65 - r.top) / denom);
      drawFrame(p);
      if (desktopQ.matches) {
        let idx = 0, best = 1e9;
        steps.forEach((s, i) => { const sr = s.getBoundingClientRect(); const d = Math.abs(sr.top + sr.height / 2 - vh * .5); if (d < best) { best = d; idx = i; } });
        setStep(idx);
      } else {
        steps.forEach(s => s.classList.add('is-active'));
        frameLabel.textContent = 'Listen — Draw — Frame — Raise — Keep';
      }
    }

    // generic parallax
    if (!reduce) parallax.forEach(el => {
      const pr = el.parentElement.getBoundingClientRect();
      const off = (pr.top + pr.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
      el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
    });

    // footer giant word
    const g = $('.giant');
    if (g && !reduce) {
      const gr = g.getBoundingClientRect();
      const p = clamp((vh - gr.top) / (vh * .6));
      g.style.transform = `translate3d(0,${((1 - p) * 40).toFixed(1)}px,0)`;
      g.style.opacity = (.2 + .8 * p).toFixed(2);
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measureHS(); onScroll(); });
  desktopQ.addEventListener && desktopQ.addEventListener('change', () => { measureHS(); onScroll(); });
  addEventListener('load', () => { measureHS(); update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureHS(); update(); });
  measureHS(); update();

  /* ---------- hero mouse parallax (smoothed) ---------- */
  if (!reduce && finePointer) {
    let tx = 0, ty = 0, cx = 0;
    addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; });
    const loop = () => {
      cx = lerp(cx, tx, .06);
      if (scrollY < innerHeight) hero.style.setProperty('--mx', cx.toFixed(3));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- custom cursor ---------- */
  const cursor = $('.cursor'), label = $('.cursor-label');
  if (finePointer && cursor && !reduce) {
    root.classList.add('has-cursor');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; root.classList.add('cursor-on'); });
    document.addEventListener('mouseleave', () => root.classList.remove('cursor-on'));
    const loop = () => {
      cx = lerp(cx, x, .22); cy = lerp(cy, y, .22);
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    $$('[data-cursor]').forEach(el => {
      const txt = el.dataset.cursor;
      el.addEventListener('mouseenter', () => {
        if (txt) { label.textContent = txt; cursor.classList.add('view'); }
        else cursor.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => { cursor.classList.remove('view', 'hover'); });
    });
    $$('a, button, input, textarea, select').forEach(el => {
      if (el.hasAttribute('data-cursor')) return;
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduce) {
    $$('.magnet').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.setProperty('--mx', (dx * .28).toFixed(1) + 'px');
        el.style.setProperty('--my', (dy * .38).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  /* ---------- mobile menu ---------- */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    menuOpen = open;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) nav.classList.remove('hide');
  };
  burger.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  /* ---------- smooth anchors (accounts for pinned gallery) ---------- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) { if (id === '#') e.preventDefault(); return; }
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      history.replaceState(null, '', id);
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- form ---------- */
  const form = $('#form'), msg = $('#formMsg');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('.field', form).forEach(f => {
      const i = $('input,textarea,select', f);
      const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
      f.classList.toggle('err', bad); if (bad) ok = false;
    });
    if (!ok) { msg.textContent = 'Please complete the highlighted fields.'; return; }
    const d = new FormData(form);
    const body = `${d.get('msg')}\n\n— ${d.get('name')} (${d.get('email')})\nProject type: ${d.get('type')}`;
    msg.textContent = `Thank you, ${String(d.get('name')).split(' ')[0]} — opening your mail app to send this to the studio.`;
    location.href = `mailto:studio@ateliernorr.example?subject=${encodeURIComponent('Enquiry — ' + d.get('type'))}&body=${encodeURIComponent(body)}`;
  });
  $$('.field input,.field textarea,.field select', form || document).forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('err')));
})();
