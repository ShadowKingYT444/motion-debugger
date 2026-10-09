(() => {
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  let paused = false;

  // ---- Clocks (work without any library)
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });
  const tick = () => {
    const t = fmt.format(new Date());
    const c1 = $('#clock'), c2 = $('#clock2');
    if (c1) c1.textContent = 'Trondheim ' + t;
    if (c2) c2.textContent = 'Now ' + t + ' in Trondheim';
  };
  tick(); setInterval(tick, 20000);

  // ---- Mobile menu
  const menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', false);
  }));

  // ---- Header theme + hide on scroll
  const header = $('#header');
  const themed = $$('[data-theme]');
  let lastY = scrollY;
  const headerState = () => {
    const y = scrollY;
    let theme = 'light';
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= 40 && r.bottom > 40) { theme = s.dataset.theme; break; }
    }
    header.classList.toggle('on-dark', theme === 'dark');
    const goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (!document.body.classList.contains('menu-open')) {
      if (goingDown && y > 300) header.classList.add('hide');
      else if (goingUp || y < 300) header.classList.remove('hide');
    }
    if (goingDown || goingUp) lastY = y;
  };
  addEventListener('scroll', headerState, { passive: true });
  headerState();

  // ---- Motion pause toggle
  const mt = $('#motionToggle'), mtl = $('#mtLabel');
  const grainState = { run: true };
  mt.addEventListener('click', () => {
    paused = !paused;
    doc.classList.toggle('motion-paused', paused);
    mt.setAttribute('aria-pressed', paused);
    mtl.textContent = paused ? 'Resume motion' : 'Pause motion';
    if (hasGSAP) { paused ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume(); }
  });

  // ---- Fail-safe: no GSAP or reduced motion => static, fully visible page
  const finishStatic = () => {
    $('#preloader').remove();
    document.body.classList.remove('is-loading');
    const st = $('#statement'); if (st) wordsify(st);
    $$('[data-count]').forEach(el => el.textContent = numFmt(+el.dataset.count, el));
    $$('.step').forEach(s => s.classList.add('is-active'));
    initGrain(true);
    initAnchors(null);
  };

  function numFmt(n, el) { return el && el.dataset.sep ? n.toLocaleString('en-US') : String(n); }

  function wordsify(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      el.append(s); if (i < words.length - 1) el.append(' ');
    });
    return $$('.w', el);
  }

  function initAnchors(lenis) {
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset: 0, duration: 1.6 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }));
  }

  // ---- Wood-grain canvas
  function initGrain(staticOnly) {
    const cv = $('#grainCanvas'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let w, h, dpr, visible = false, raf, t0 = 0;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const knots = [{ x: .72, y: .38, r: .16, k: 70 }, { x: .2, y: .78, r: .11, k: 45 }];
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const lines = Math.round(h / 9);
      for (let i = 0; i < lines; i++) {
        const base = (i / lines) * h * 1.2 - h * .1;
        const tone = .1 + .22 * (0.5 + 0.5 * Math.sin(i * .37 + Math.sin(i * .11) * 3));
        ctx.beginPath();
        for (let x = 0; x <= w + 12; x += 12) {
          let y = base + Math.sin(x * .004 + i * .05 + t * .00018) * 14 + Math.sin(x * .011 + i * .13 - t * .00026) * 5 + Math.sin(x * .0012 + t * .0001) * 30;
          for (const k of knots) {
            const dx = x - k.x * w, dy = base - k.y * h, d = Math.hypot(dx, dy), R = k.r * Math.min(w, h) * 1.6;
            if (d < R) y += (dy >= 0 ? 1 : -1) * k.k * Math.exp(-(d * d) / (R * R * .35)) * Math.cos(d * .03 - t * .0003) * .6 + (dy >= 0 ? 1 : -1) * k.k * Math.exp(-(d * d) / (R * R * .25));
          }
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${200 + (i % 5) * 4},${140 + (i % 7) * 3},${88},${tone})`;
        ctx.lineWidth = i % 6 === 0 ? 1.4 : .8;
        ctx.stroke();
      }
    };
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (paused || !visible) return;
      draw(t);
    };
    size(); draw(0);
    addEventListener('resize', () => { size(); draw(performance.now()); });
    if (staticOnly) return;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(cv);
    raf = requestAnimationFrame(loop);
  }

  if (!hasGSAP || reduce) { finishStatic(); initCursor(); return; }

  // =============== GSAP experience ===============
  doc.classList.add('anim');
  document.body.classList.add('is-loading');
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: .09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  initAnchors(lenis);
  initCursor();
  initGrain(false);

  // ---- Preloader + hero intro
  const pre = $('#preloader');
  const counter = { v: 0 };
  const preTl = gsap.timeline({ onComplete: () => { initHeroParallax(); pre.remove(); document.body.classList.remove('is-loading'); lenis && lenis.start(); ScrollTrigger.refresh(); } });
  preTl
    .to('.pre-frame path', { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut', stagger: .25 }, 0)
    .to(counter, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { $('#preCount').textContent = Math.round(counter.v); } }, 0)
    .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, 1.9)
    .add(heroIntro(), 2.2);

  function heroIntro() {
    const tl = gsap.timeline();
    tl.fromTo('.hero-title .ln>span', { yPercent: 112 }, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: .12 }, 0)
      .to('[data-hero-fade]', { opacity: 1, duration: 1.2, ease: 'power2.out', stagger: .15 }, .5)
      .from('.site-header', { opacity: 0, duration: 1.2, ease: 'power2.out' }, .6)
      .fromTo('.sun', { y: 160 }, { y: 0, duration: 3, ease: 'power3.out' }, 0)
      .fromTo('.sun-wrap', { opacity: 0 }, { opacity: 1, duration: 1.6 }, 0)
      .fromTo('.m-far', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 2, ease: 'power3.out' }, .1)
      .fromTo('.m-mid', { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 2, ease: 'power3.out' }, .25)
      .fromTo('.m-near', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 2, ease: 'power3.out' }, .4)
      .fromTo('.trees', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.8, ease: 'power3.out' }, .6)
      .to('.hall .draw', { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', stagger: .14 }, .7)
      .to('.hall-fill', { opacity: 1, duration: 1.4 }, 2.4)
      .to('.hall-glow', { opacity: 1, duration: 1.6 }, 2.9);
    return tl;
  }
  // set initial hero hidden states (so there's no flash under the preloader)
  gsap.set('.hero-art .m-far,.hero-art .m-mid,.hero-art .m-near,.hero-art .trees', { opacity: 0 });
  gsap.set('.sun-wrap', { opacity: 0 });
  gsap.set('.ln>span', { yPercent: 112 });
  gsap.set('[data-reveal]', { y: 36 });

  // ---- Hero parallax (scroll + pointer) — created once the intro has finished
  function initHeroParallax() {
    const heroTl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    heroTl
      .to('.m-far', { y: -40 }, 0).to('.m-mid', { y: -90 }, 0).to('.m-near', { y: -140 }, 0)
      .to('.trees,.ground,.hall', { y: -170 }, 0)
      .to('.sun-wrap', { y: 120 }, 0)
      .to('.hero-inner', { y: -90, opacity: .15 }, 0);
    if (fine) {
      const qx = gsap.quickTo('.hero-art', 'x', { duration: 1.2, ease: 'power3.out' });
      const qy = gsap.quickTo('.hero-art', 'y', { duration: 1.2, ease: 'power3.out' });
      addEventListener('pointermove', e => {
        if (scrollY > innerHeight) return;
        qx((e.clientX / innerWidth - .5) * -18); qy((e.clientY / innerHeight - .5) * -10);
      });
      gsap.to('.hero-art', { scale: 1.04, duration: 1.4, ease: 'power2.out' });
    }
  }

  // ---- Generic reveals
  $$('[data-split]').forEach(el => {
    gsap.to($$('.ln>span', el), {
      yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: .1,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .12 })
  });

  // ---- Philosophy: word-by-word scrubbed reveal
  const words = wordsify($('#statement'));
  gsap.to(words, {
    opacity: 1, ease: 'none', stagger: .5,
    scrollTrigger: { trigger: '#statement', start: 'top 80%', end: 'bottom 45%', scrub: .4 }
  });
  // Counters
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = numFmt(Math.round(o.v), el); } })
    });
  });

  // ---- Projects: horizontal pinned scroll on desktop
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('#track'), pin = $('.projects-pin');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8,
        invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: self => gsap.set('#projBar', { scaleX: self.progress })
      }
    });
    $$('.card').forEach((card, i) => {
      gsap.fromTo($('.card-art svg', card), { xPercent: 5 }, {
        xPercent: -5, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
      gsap.from(card, {
        opacity: 0, y: 70, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 92%', toggleActions: 'play none none reverse' }
      });
    });
    return () => { gsap.set('#projBar', { scaleX: 0 }); };
  });
  mm.add('(max-width: 899px)', () => {
    $$('.card').forEach(card => {
      gsap.from(card, { opacity: 0, y: 60, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 88%' } });
      gsap.fromTo($('.card-art svg', card), { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  // ---- Process: timber frame builds with scroll
  const parts = $$('#frame .fp');
  const dot = $('.fp-dot');
  const steps = $$('.step');
  const stepNum = $('#stepNum'), stepName = $('#stepName');
  const n = parts.length;
  let activeIdx = -1;
  ScrollTrigger.create({
    trigger: '#steps', start: 'top 60%', end: 'bottom 70%', scrub: true,
    onUpdate: self => {
      parts.forEach((el, i) => {
        el.style.strokeDashoffset = 1 - gsap.utils.clamp(0, 1, self.progress * (n + 1) - i);
      });
      dot.style.opacity = self.progress > .9 ? 1 : 0;
    }
  });
  steps.forEach((s, i) => {
    ScrollTrigger.create({
      trigger: s, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) { steps.forEach(x => x.classList.remove('is-active')); s.classList.add('is-active'); setStep(i); } }
    });
  });
  function setStep(i) {
    if (i === activeIdx) return; activeIdx = i;
    gsap.fromTo([stepNum, stepName], { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .7, ease: 'expo.out', stagger: .05 });
    stepNum.textContent = String(i + 1).padStart(2, '0');
    stepName.textContent = steps[i].dataset.name;
  }
  steps[0].classList.add('is-active');

  // ---- Grain section parallax scale
  gsap.fromTo('#grainCanvas', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '#grain', start: 'top bottom', end: 'bottom top', scrub: true } });

  // ---- Awards: staggered row entrance
  gsap.from('.award', {
    opacity: 0, y: 40, duration: 1, ease: 'expo.out', stagger: .09,
    scrollTrigger: { trigger: '#awardList', start: 'top 80%' }
  });

  // ---- Contact: giant wordmark rise + magnetic mail link
  gsap.from('.giant', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.giant', start: 'top 100%', end: 'top 70%', scrub: true } });
  if (fine) {
    $$('.magnetic').forEach(m => {
      const xTo = gsap.quickTo(m, 'x', { duration: .6, ease: 'power3.out' });
      const yTo = gsap.quickTo(m, 'y', { duration: .6, ease: 'power3.out' });
      m.addEventListener('pointermove', e => {
        const r = m.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .18); yTo((e.clientY - (r.top + r.height / 2)) * .3);
      });
      m.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  // Refresh after fonts + load so pin distances are right
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());

  // Safety: if intro stalls for any reason, never trap the user
  setTimeout(() => { if (document.body.classList.contains('is-loading') && !paused) { preTl.progress(1); } }, 7000);

  // ---- Custom cursor
  function initCursor() {
    if (!fine) return;
    const c = $('#cursor'); if (!c) return;
    document.body.classList.add('cursor-on');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
    const loop = () => {
      cx += (x - cx) * .2; cy += (y - cy) * .2;
      c.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(loop);
    };
    loop();
    const inner = $('span', c);
    document.addEventListener('pointerover', e => {
      const t = e.target.closest ? e.target.closest('[data-cursor],[data-cursor-label],a,button,.award') : null;
      const label = t && t.dataset ? t.dataset.cursorLabel : null;
      c.classList.toggle('is-link', !!t);
      c.classList.toggle('has-label', !!label);
      inner.textContent = label || '';
    });
    document.addEventListener('pointerleave', () => c.classList.remove('is-link', 'has-label'));
  }
})();
