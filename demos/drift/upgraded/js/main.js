/* Drift — choreography and interactions.
 *
 * MOTION SCORE — personality: Silk, because Drift should feel patient and exact where sleep apps feel vague
 * chapter   | device                                                         | trigger          | timing
 * hero      | masked line rise + the sheet billows and settles (amp 2.3→1,   | load             | 1.1s lines, 100ms stagger; sheet 1.5s
 *           | camera 1.1→1); exit: type drifts up, the sheet calms + darkens | scrub on leave   | --
 * night     | SIGNATURE: hypnogram + sound stream draw to a playhead, clock  | scrub 180vh      | --p, scrub .8
 *           | runs 10:00 PM→6:24 AM, phases swap in place, first light rises |                  |
 * lab       | static console over the live sheet (interactive, not scrubbed) | in view          | 0.9s, 100ms stagger
 * science   | statement lights up as it is read; cycle rings draw; counts    | scrub / in view  | 1.2s; from 60%
 * features  | phone clip-reveal + counter-scale; the coach answers           | in view          | 1.1s
 * stories   | the big quote rises line by line; small quotes stagger         | in view          | 1s, 100ms
 * plans     | plan rows stagger; prices roll on the billing toggle           | in view / click  | 0.9s; 0.5s
 * download  | the sheet at sunrise; headline masked rise                     | in view          | 1.2s
 */
(function () {
  'use strict';
  var D = (window.Drift = window.Drift || {});
  D.state = D.state || { ambient: true };
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('[drift]', e); } }
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- ambient motion toggle ---------- */
  var motionBtn = $('#motionToggle');
  function setAmbient(on) {
    D.state.ambient = on;
    motionBtn.setAttribute('aria-pressed', String(on));
    root.classList.toggle('still', !on);
    if (D.sheet) D.sheet.wake();
    document.dispatchEvent(new CustomEvent('drift:ambient'));
  }
  motionBtn.addEventListener('click', function () { setAmbient(!D.state.ambient); });

  /* ---------- mobile menu ---------- */
  var menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
  function openMenu() {
    menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu');
    requestAnimationFrame(function () { menu.classList.add('open'); });
    root.classList.add('menu-open');
  }
  function closeMenu() {
    menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
    root.classList.remove('menu-open');
    setTimeout(function () { if (!menu.classList.contains('open')) menu.hidden = true; }, 360);
  }
  menuBtn.addEventListener('click', function () { if (menu.classList.contains('open')) closeMenu(); else openMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); menuBtn.focus(); } });

  /* ---------- nav: compacts after the first scroll, hides going down, returns going up ---------- */
  var nav = $('#nav'), lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 24);
    var down = y > lastY + 4, up = y < lastY - 4;
    if (down && y > 600 && !nav.contains(document.activeElement) && !menu.classList.contains('open')) nav.classList.add('hide');
    else if (up || y < 600) nav.classList.remove('hide');
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  nav.addEventListener('focusin', function () { nav.classList.remove('hide'); });

  /* ---------- billing toggle ---------- */
  safe(function () {
    var btns = $$('.bill-btn'), pill = $('#billingPill'), amts = $$('.amt'), notes = $$('.bill-note[data-note-m]');
    function placePill() {
      var on = $('.bill-btn.is-on'); if (!on) return;
      pill.style.width = on.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }
    function roll(el, to) {
      var from = parseFloat(el.textContent) || 0;
      if (reduceMQ.matches || !window.gsap) { el.textContent = to.toFixed(2); return; }
      var s = { v: from };
      gsap.to(s, { v: to, duration: 0.5, ease: 'power3.out', onUpdate: function () { el.textContent = s.v.toFixed(2); } });
    }
    function set(mode) {
      btns.forEach(function (b) { var on = b.getAttribute('data-bill') === mode; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      placePill();
      amts.forEach(function (a) { roll(a, parseFloat(a.getAttribute(mode === 'yearly' ? 'data-y' : 'data-m'))); });
      notes.forEach(function (n) { n.textContent = n.getAttribute(mode === 'yearly' ? 'data-note-y' : 'data-note-m'); });
      $$('.plan .per').forEach(function (p) { if (p.textContent !== 'forever') p.textContent = '/ month'; });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-bill')); }); });
    placePill();
    window.addEventListener('resize', placePill);
    if (document.fonts) document.fonts.ready.then(placePill);
  });

  /* ---------- the coach answers when it comes into view ---------- */
  safe(function () {
    var coach = $('#coach'); if (!coach) return;
    if (reduceMQ.matches) { coach.classList.add('answered'); return; }
    coach.classList.add('waiting');
    new IntersectionObserver(function (es, io) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      coach.classList.add('asking');
      setTimeout(function () { coach.classList.remove('waiting', 'asking'); coach.classList.add('answered'); }, 750);
    }, { threshold: 0.6 }).observe(coach);
  });

  /* ---------- science: sleep-cycle rings, built from data ---------- */
  safe(function () {
    var host = $('[data-cycles] .rings'); if (!host) return;
    // Proportions of light / deep / REM per ~90-minute cycle (deep early, REM late): textbook sleep architecture.
    var cycles = [[0.5, 0.42, 0.08], [0.52, 0.32, 0.16], [0.58, 0.16, 0.26], [0.6, 0.06, 0.34], [0.58, 0.02, 0.4]];
    var NS = 'http://www.w3.org/2000/svg', C = 2 * Math.PI * 44;
    cycles.forEach(function (c, i) {
      var fig = document.createElement('div'); fig.className = 'ring';
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100');
      var off = 0;
      ['light', 'deep', 'rem'].forEach(function (k, j) {
        var len = c[j] * C - 2.5;
        var a = document.createElementNS(NS, 'circle');
        a.setAttribute('cx', 50); a.setAttribute('cy', 50); a.setAttribute('r', 44);
        a.setAttribute('class', 'arc arc-' + k);
        a.setAttribute('stroke-dasharray', len.toFixed(2) + ' ' + (C - len).toFixed(2));
        a.setAttribute('stroke-dashoffset', (-off).toFixed(2));
        a.style.setProperty('--len', len.toFixed(2));
        svg.appendChild(a);
        off += c[j] * C;
      });
      fig.appendChild(svg);
      var lab = document.createElement('p'); lab.innerHTML = '<b>' + (i + 1) + '</b><span>from ' + ['10:41 PM', '12:11 AM', '1:41 AM', '3:11 AM', '4:41 AM'][i] + '</span>';
      fig.appendChild(lab);
      host.appendChild(fig);
    });
  });

  /* ---------- in-page links (Lenis-aware) ---------- */
  var lenis = null;
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) { e.preventDefault(); return; }
      var target = document.querySelector(id); if (!target) return;
      e.preventDefault();
      if (menu.classList.contains('open')) closeMenu();
      if (lenis) lenis.scrollTo(target, { duration: 1.4 });
      else target.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth' });
      if (id === '#main') { $('#main').setAttribute('tabindex', '-1'); $('#main').focus({ preventScroll: true }); }
    });
  });

  /* ---------- GSAP choreography ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('js');
    if (D.sheets && D.sheets.hero) D.sheets.hero.set({ amp: 1 });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  var hasSplit = !!window.SplitText;
  if (hasSplit) gsap.registerPlugin(SplitText);

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mm = gsap.matchMedia();

  mm.add({ all: 'all', motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 761px)' }, function (ctx) {
    var motion = ctx.conditions.motion, desktop = ctx.conditions.desktop;
    var sheets = D.sheets || {};

    // Chapters: the ground is the time of night. Colour changes stay under reduced motion.
    $$('[data-ground]').forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (self) {
          if (!self.isActive) return;
          gsap.to(root, { '--ground': sec.getAttribute('data-ground'), '--ink': sec.getAttribute('data-ink'), duration: motion ? 0.6 : 0, ease: 'power2.out', overwrite: 'auto' });
          var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', sec.getAttribute('data-ground'));
        }
      });
    });

    if (!motion) {
      gsap.set('[data-motion], [data-motion="stagger"] > *, [data-hero-rest], [data-hero-mark], .hero-title', { autoAlpha: 1 });
      if (sheets.hero) sheets.hero.set({ amp: 1, dark: 0 });
      if (D.night) D.night.settle();
      $$('.ring').forEach(function (r) { r.classList.add('in'); });
      return;
    }

    // Smooth scroll on desktop (Silk), driven by GSAP's ticker so ScrollTrigger stays in sync.
    if (desktop && window.Lenis) {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      var raf = function (time) { lenis.raf(time * 1000); };
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      ctx.add(function () { return function () { gsap.ticker.remove(raf); lenis.destroy(); lenis = null; }; });
    }

    /* Hero: the headline lands first; the sheet billows down and settles on its own track; the rest overlaps. */
    var hero = $('[data-motion="hero"]');
    if (hero) {
      var h1 = $('.hero-title', hero), visual = $('[data-hero-visual]', hero);
      var rest = $$('[data-hero-rest]', hero), marks = $$('[data-hero-mark]', hero);
      var hs = { amp: 2.3, dark: 0 };
      var pushSheet = function () { if (sheets.hero) sheets.hero.set({ amp: hs.amp, dark: hs.dark }); };
      var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.set(hero, { autoAlpha: 1 });
      if (hasSplit) {
        gsap.set(h1, { autoAlpha: 1 });
        SplitText.create(h1, {
          type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'line',
          onSplit: function (self) {
            return gsap.from(self.lines, { yPercent: 112, duration: 1.1, stagger: 0.1, ease: 'expo.out', delay: 0.05 });
          }
        });
      } else {
        tl.fromTo(h1, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.05);
      }
      tl.fromTo(hs, { amp: 2.3 }, { amp: 1, duration: 1.6, ease: 'expo.out', onUpdate: pushSheet }, 0.1)
        .fromTo(visual, { scale: 1.1 }, { scale: 1, duration: 1.6 }, 0.1)
        .fromTo(rest, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09 }, 0.55)
        .fromTo(marks, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.7);

      // Leaving: the copy drifts up and fades; the sheet calms and darkens into the night.
      gsap.to($$('.hero-copy, .marks', hero), {
        yPercent: -12, autoAlpha: 0.12, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
      var leave = { amp: 1, dark: 0 };
      gsap.to(leave, {
        amp: 0.45, dark: 0.75, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        onUpdate: function () { if (!tl.isActive() && sheets.hero) sheets.hero.set({ amp: leave.amp, dark: leave.dark }); }
      });
    }

    /* Headings: masked lines rise when they reach the lower part of the screen. */
    $$('[data-motion="heading"]').forEach(function (el) {
      gsap.set(el, { autoAlpha: 1 });
      if (!hasSplit) { gsap.from(el, { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }); return; }
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'line',
        onSplit: function (self) {
          return gsap.from(self.lines, {
            yPercent: 112, duration: 1.1, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
        }
      });
    });

    /* Visuals: a clip reveal with the content counter-scaling inside. */
    $$('[data-motion="image"]').forEach(function (el) {
      var inner = $('.inner', el) || el;
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 82%', once: true } })
        .set(el, { autoAlpha: 1 })
        .from(el, { clipPath: 'inset(18% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' })
        .from(inner, { scale: 1.14, duration: 1.6, ease: 'expo.out' }, 0);
    });

    /* Numbers count up from 60% of their value; the HTML holds the final text. */
    $$('[data-motion="count"]').forEach(function (el) {
      gsap.set(el, { autoAlpha: 1 });
      var match = el.textContent.trim().match(/^(\D*)([\d.,]+)(.*)$/);
      if (!match) return;
      var prefix = match[1], digits = match[2], suffix = match[3];
      var end = parseFloat(digits.replace(/,/g, ''));
      var state = { v: end * 0.6 };
      var decimals = (digits.split('.')[1] || '').length;
      var fmt = function (v) { return prefix + v.toFixed(decimals) + suffix; };
      gsap.to(state, {
        v: end, duration: 1.4, ease: 'expo.out',
        onStart: function () { el.textContent = fmt(state.v); },
        onUpdate: function () { el.textContent = fmt(state.v); },
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    /* Groups: children rise in reading order. */
    $$('[data-motion="stagger"]').forEach(function (group) {
      gsap.set(group, { autoAlpha: 1 });
      gsap.from(group.children, {
        y: 28, scale: 0.985, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: group, start: 'top 86%', once: true }
      });
    });

    $$('[data-motion="fade"]').forEach(function (el) {
      gsap.fromTo(el, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    /* Sleep-cycle rings draw in order. */
    var ringsHost = $('[data-cycles]');
    if (ringsHost) ScrollTrigger.create({
      trigger: ringsHost, start: 'top 80%', once: true,
      onEnter: function () { $$('.ring', ringsHost).forEach(function (r, i) { setTimeout(function () { r.classList.add('in'); }, i * 110); }); }
    });

    /* Supporting scene: the science statement lights up as it is read. */
    var read = $('[data-read]');
    if (read && hasSplit) {
      var words = SplitText.create(read, { type: 'words', wordsClass: 'w' });
      gsap.fromTo(words.words, { opacity: 0.42 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: read, start: 'top 78%', end: 'bottom 45%', scrub: 0.6 }
      });
      ctx.add(function () { return function () { words.revert(); }; });
    }

    /* SIGNATURE: one night, scored. One timeline scrubbed across the tall section while its stage sticks. */
    var scene = $('[data-scene]');
    if (scene && D.night) {
      if (desktop) {
        root.classList.add('scene-on');
        var st = { p: 0 };
        D.night.render(0);
        D.night.last = 0;
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true }
        }).to(st, { p: 1, duration: 1, onUpdate: function () { D.night.last = st.p; D.night.render(st.p); } });
        ctx.add(function () { return function () { root.classList.remove('scene-on'); D.night.settle(); }; });
      } else {
        // Phones: no pin; the night draws once as the chart comes into view, all three phases listed.
        var ps = { p: 0 };
        D.night.render(0.2);
        ScrollTrigger.create({
          trigger: '#chart', start: 'top 80%', once: true,
          onEnter: function () {
            gsap.fromTo(ps, { p: 0.2 }, { p: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: function () { D.night.render(ps.p); }, onComplete: function () { D.night.settle(); } });
          }
        });
        ctx.add(function () { return function () { D.night.settle(); }; });
      }
    }

    /* Magnetic controls, fine pointers only. */
    if (finePointer) $$('[data-magnetic]').forEach(function (el) {
      var x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      var y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      var move = function (e) { var r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.25); };
      var out = function () { x(0); y(0); };
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', out);
      ctx.add(function () { return function () { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', out); }; });
    });
  });

  // Re-measure scroll positions once the real fonts are in.
  if (document.fonts) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
