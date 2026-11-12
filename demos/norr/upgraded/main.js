/* Atelier Norr — motion and interaction.
 *
 * MOTION SCORE — personality: Cinematic, because architecture is felt as light, scale and assembly:
 * the visitor should walk under the timber and watch a building raised, not browse photos.
 * chapter  | device                                                         | trigger        | timing
 * hero     | camera push into the glulam nave + masked headline (CSS);      | load           | 1.5s expo-out, 90ms stagger
 *          | exit: dolly through the arches, type lifts away                | scroll         | scrub
 * studio   | statement lights up as read; pine cladding silvers year 0 → 6  | scrub, no pin  | --p
 * ledger   | static band: material columns grow, numbers roll from 60%      | in view        | 1.2–1.4s expo-out
 * work     | editorial grid of five elevations, clip wipe + counter-scale   | in view        | 1.2s expo-out, 100ms stagger
 * process  | SIGNATURE: site model raised in five movements, day to night   | scrub 180vh    | sticky stage
 * awards   | lamellae 17 rolls up, index rows rise in reading order         | in view        | 0.9s, 80ms stagger
 * contact  | Falu-red chapter, masked heading, enquiry sheet rises          | in view        | 1.0s
 * footer   | wordmark letters rise                                          | in view        | 1.2s, 50ms stagger
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  var still = root.classList.contains('still');
  var lenis = null;

  /* ---------------- Hero geometry: keep the vanishing point where the slice-fitted SVG puts it ---------------- */
  var hero = $('.hero'), nave = $('.nave');
  var layers = $$('.nave__layer').map(function (el) { return { el: el, z: parseFloat(el.style.getPropertyValue('--z')) || 1, s: 1, o: 1 }; });
  function placeVanishingPoint() {
    if (!hero) return;
    var w = hero.clientWidth, h = hero.clientHeight, k = Math.max(w / 1600, h / 1000);
    var vy = (h - 1000 * k) / 2 + 560 * k;
    nave.style.setProperty('--vpy', vy.toFixed(1) + 'px');
  }
  placeVanishingPoint();
  window.addEventListener('resize', placeVanishingPoint);

  /* ---------------- Nav: tone per chapter, compact after scrolling, hides going down ---------------- */
  var nav = $('.nav'), lastY = window.scrollY, navTicking = false;
  function navScroll() {
    var y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (!root.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > 480);
    lastY = y; navTicking = false;
  }
  window.addEventListener('scroll', function () { if (!navTicking) { navTicking = true; requestAnimationFrame(navScroll); } }, { passive: true });
  navScroll();
  var toneSections = $$('[data-tone]').filter(function (el) { return el !== nav; });
  function updateTone() {
    var probe = 38, tone = 'dark';
    for (var i = 0; i < toneSections.length; i++) { var r = toneSections[i].getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { tone = toneSections[i].dataset.tone; break; } }
    if (nav.dataset.tone !== tone) nav.dataset.tone = tone;
    var active = '';
    ['studio', 'work', 'process', 'recognition'].forEach(function (id) { var s = document.getElementById(id); if (!s) return; var r = s.getBoundingClientRect(); if (r.top < innerHeight * 0.45 && r.bottom > innerHeight * 0.45) active = id; });
    if (!active) { var led = $('.ledger'); if (led) { var lr = led.getBoundingClientRect(); if (lr.top < innerHeight * 0.45 && lr.bottom > innerHeight * 0.45) active = 'studio'; } }
    $$('.nav__links a').forEach(function (a) { a.classList.toggle('is-active', a.dataset.nav === active); });
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(updateTone); }, { passive: true });
  updateTone();

  /* ---------------- Mobile menu ---------------- */
  var menuBtn = $('.nav__menu'), menu = $('#menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    $('.nav__menu-label', menuBtn).textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    root.classList.toggle('menu-open', open);
    if (open) { nav.classList.remove('is-hidden'); if (lenis) lenis.stop(); } else if (lenis) lenis.start();
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ---------------- Motion toggle ---------------- */
  var motionBtn = $('.footer__motion');
  if (motionBtn) {
    motionBtn.textContent = still ? 'Motion off' : 'Motion on';
    motionBtn.setAttribute('aria-pressed', still ? 'true' : 'false');
    motionBtn.addEventListener('click', function () { store.set('norr-motion', still ? null : 'off'); location.reload(); });
  }

  /* ---------------- Project dialog ---------------- */
  var modal = $('#projectModal'), modalArt = $('#modalArt'), projects = $$('.proj'), modalIdx = 0, artCount = 0, opener = null;
  var reducedNow = function () { return still || matchMedia('(prefers-reduced-motion: reduce)').matches; };
  function fillModal(i) {
    var card = projects[i];
    modalIdx = i;
    $('#modalNo').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(projects.length).padStart(2, '0');
    $('#modalTitle').textContent = $('.proj__open', card).textContent;
    $('#modalSub').textContent = $$('.proj__sub span', card).map(function (s) { return s.textContent; }).join('  ·  ');
    $('#modalLine').textContent = $('.proj__line', card).textContent;
    $('#modalContent').innerHTML = $('.detail', card).innerHTML;
    var name = $('[data-art]', card).dataset.art;
    modalArt.innerHTML = window.NorrArt ? window.NorrArt.plates[name]('mx' + (artCount++) + '-') : '';
  }
  function openModal(i) {
    fillModal(i);
    modal.showModal();
    root.classList.add('modal-open');
    if (lenis) lenis.stop();
    $('.modal__body', modal).scrollTop = 0;
    if (!reducedNow() && modal.animate) {
      modal.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' });
      modalArt.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    $('.modal__close', modal).focus({ preventScroll: true });
  }
  function closeModal() {
    if (!modal.open) return;
    var done = function () { modal.close(); };
    if (reducedNow() || !modal.animate) { done(); return; }
    modal.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(24px)' }], { duration: 420, easing: 'cubic-bezier(.7,0,.84,0)' }).finished.then(done, done);
  }
  function swapModal(dir) {
    var n = (modalIdx + dir + projects.length) % projects.length, content = $('#modalContent');
    content.classList.add('is-swapping');
    setTimeout(function () {
      fillModal(n); content.classList.remove('is-swapping'); $('.modal__body', modal).scrollTop = 0;
      if (!reducedNow() && modalArt.animate) modalArt.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
    }, reducedNow() ? 0 : 240);
  }
  $$('.proj__open').forEach(function (btn) {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.addEventListener('click', function () { opener = btn; openModal(+btn.dataset.open); });
  });
  $('.modal__close', modal).addEventListener('click', closeModal);
  $('#modalPrev').addEventListener('click', function () { swapModal(-1); });
  $('#modalNext').addEventListener('click', function () { swapModal(1); });
  modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modal.addEventListener('close', function () { root.classList.remove('modal-open'); if (lenis) lenis.start(); if (opener) opener.focus({ preventScroll: true }); });
  modal.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') swapModal(1); if (e.key === 'ArrowLeft') swapModal(-1); });

  /* ---------------- Enquiry form (validates, then opens the visitor's mail app) ---------------- */
  var form = $('#enquiry');
  var rules = {
    'f-name': function (v) { return v.trim().length >= 2 ? '' : 'Please tell us your name.'; },
    'f-email': function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
    'f-msg': function (v) { return v.trim().length >= 10 ? '' : 'A few words about the place and the project will help us reply well.'; }
  };
  function validateField(id) {
    var input = document.getElementById(id), msg = rules[id](input.value), wrap = input.parentNode;
    wrap.classList.toggle('has-err', !!msg);
    $('.field__err', wrap).textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  Object.keys(rules).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () { if (el.value) validateField(id); });
    el.addEventListener('input', function () { if (el.parentNode.classList.contains('has-err')) validateField(id); });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, first = null;
    Object.keys(rules).forEach(function (id) { if (!validateField(id)) { ok = false; if (!first) first = id; } });
    if (!ok) { document.getElementById(first).focus(); return; }
    var data = new FormData(form);
    var body = 'Name: ' + data.get('name') + '\nEmail: ' + data.get('email') + '\nProject: ' + data.get('kind') + '\nSite: ' + (data.get('site') || '—') + '\n\n' + data.get('message');
    var href = 'mailto:hello@ateliernorr.no?subject=' + encodeURIComponent('Enquiry — ' + data.get('kind')) + '&body=' + encodeURIComponent(body);
    $('#doneName').textContent = ', ' + String(data.get('name')).trim().split(/\s+/)[0];
    $('.sheet__done', form).hidden = false;
    window.location.href = href;
  });
  $('#formReset').addEventListener('click', function () { form.reset(); $('.sheet__done', form).hidden = true; $('#f-name').focus(); });

  /* ---------------- Hero dust: the one ambient loop, warm motes in the lamp light ---------------- */
  function dust(motion) {
    var cv = $('.nave__dust');
    if (!cv) return function () {};
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = 0, H = 0, motes = [], raf = 0, visible = true;
    var seed = 7; var rand = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function make() {
      motes = [];
      for (var i = 0; i < 70; i++) {
        var g = (rand() + rand() + rand()) / 3;
        motes.push({ x: (0.5 + (g - 0.5) * 1.6) * W, y: (0.32 + rand() * 0.6) * H, r: 0.5 + Math.pow(rand(), 2) * 2, v: 0.04 + rand() * 0.12, a: 0.15 + rand() * 0.5, ph: rand() * 6.28 });
      }
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        if (motion) { m.y -= m.v; m.x += Math.sin(t * 0.0004 + m.ph) * 0.12; if (m.y < H * 0.25) { m.y = H * 0.95; } }
        var a = m.a * (0.6 + 0.4 * Math.sin(t * 0.001 + m.ph));
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fillStyle = 'rgba(255,214,160,' + a.toFixed(3) + ')'; ctx.fill();
      }
      if (motion && visible) raf = requestAnimationFrame(draw);
    }
    size(); make(); draw(0);
    window.addEventListener('resize', function () { size(); make(); if (!motion) draw(0); });
    if (motion && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(draw); }).observe(hero);
      document.addEventListener('visibilitychange', function () { visible = !document.hidden; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(draw); });
    }
    return function () { cancelAnimationFrame(raf); };
  }

  /* ---------------- Without GSAP: everything visible, scenes stacked ---------------- */
  function boot() {
    if (!window.gsap || !window.ScrollTrigger) { root.classList.add('no-gsap'); dust(false); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    motion();
  }

  function motion() {
    var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var mm = gsap.matchMedia();

    mm.add({ all: 'all', reduce: '(prefers-reduced-motion: reduce)', desktop: '(min-width: 900px)' }, function (ctx) {
      var c = ctx.conditions, moving = !c.reduce && !still, desktop = c.desktop;
      var stopDust = dust(moving);
      ctx.add(function () { return stopDust; });
      if (!moving) {
        gsap.set('[data-motion], [data-motion="stagger"] > *', { autoAlpha: 1 });
        return;
      }

      /* Smooth scroll on desktop, on GSAP's ticker so ScrollTrigger stays in sync */
      if (desktop && window.Lenis) {
        lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
        lenis.on('scroll', ScrollTrigger.update);
        var raf = function (time) { lenis.raf(time * 1000); };
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        ctx.add(function () { return function () { gsap.ticker.remove(raf); lenis.destroy(); lenis = null; }; });
      }

      /* Hero exit: the camera dollies through the arches; type lifts away (never fully gone) */
      var copy = $('.hero__copy'), row = $('.hero__row');
      var dolly = 0, px = 0, py = 0, tx = 0, ty = 0;
      function paintNave() {
        for (var i = 0; i < layers.length; i++) {
          var L = layers[i], zz = L.z - 0.82 * dolly, s = L.z / Math.max(zz, 0.42), o = clamp((zz - 0.42) / 0.38, 0, 1);
          var depth = 1 / L.z;
          L.el.style.transform = 'translate3d(' + (px * 26 * depth).toFixed(2) + 'px,' + (py * 14 * depth).toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
          if (L.z < 2.2) L.el.style.opacity = o.toFixed(3);
        }
      }
      ScrollTrigger.create({
        trigger: hero, start: 'top top', end: 'bottom top',
        onUpdate: function (self) {
          dolly = self.progress; paintNave();
          gsap.set(copy, { yPercent: -18 * self.progress, autoAlpha: 1 - 0.85 * self.progress });
          gsap.set(row, { y: -60 * self.progress, autoAlpha: 1 - 0.85 * self.progress });
        }
      });
      if (finePointer) {
        var tick = function () { px += (tx - px) * 0.06; py += (ty - py) * 0.06; if (Math.abs(tx - px) > 0.001 || Math.abs(ty - py) > 0.001) paintNave(); };
        var move = function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; };
        window.addEventListener('pointermove', move, { passive: true });
        gsap.ticker.add(tick);
        ctx.add(function () { return function () { window.removeEventListener('pointermove', move); gsap.ticker.remove(tick); }; });
      }

      /* Headings: masked lines rise */
      $$('[data-motion="heading"]').forEach(function (el) {
        gsap.set(el, { autoAlpha: 1 });
        if (!window.SplitText) { gsap.from(el, { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }); return; }
        SplitText.create(el, {
          type: 'lines', mask: 'lines', autoSplit: true,
          onSplit: function (self) {
            return gsap.from(self.lines, { yPercent: 108, duration: 1.15, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
          }
        });
      });

      /* Visuals: clip wipe from below with the drawing counter-scaling inside */
      $$('[data-motion="image"]').forEach(function (el) {
        var inner = el.querySelector('.inner > svg') || el.querySelector('.inner') || el;
        gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%', once: true } })
          .set(el, { autoAlpha: 1 })
          .fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.out' })
          .fromTo(inner, { scale: 1.16 }, { scale: 1, duration: 1.6, ease: 'expo.out', transformOrigin: '50% 60%' }, 0);
      });

      /* Numbers roll up from 60% of their value; the HTML holds the final text */
      $$('[data-motion="count"]').forEach(function (el) {
        var m = el.textContent.trim().match(/^(\D*)([\d.,]+)(.*)$/);
        if (!m) return;
        var digits = m[2], end = parseFloat(digits.replace(/,/g, '')), dec = (digits.split('.')[1] || '').length;
        var fmt = function (v) { return m[1] + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: digits.indexOf(',') > -1 }) + m[3]; };
        var st = { v: end * 0.6 };
        el.textContent = fmt(st.v);
        gsap.to(st, { v: end, duration: 1.15, ease: 'expo.out', onUpdate: function () { el.textContent = fmt(Math.round(st.v * Math.pow(10, dec)) / Math.pow(10, dec)); }, scrollTrigger: { trigger: el, start: 'top 96%', once: true } });
      });

      /* Groups: children rise in reading order */
      $$('[data-motion="stagger"]').forEach(function (g) {
        gsap.set(g, { autoAlpha: 1 });
        gsap.from(g.children, { y: 32, scale: 0.98, autoAlpha: 0, duration: 0.95, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: g, start: 'top 85%', once: true } });
      });
      $$('[data-motion="fade"]').forEach(function (el) {
        gsap.fromTo(el, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });

      /* Studio: the statement lights up as it is read, and the pine sample silvers as you pass it */
      var statement = $('[data-read]');
      if (statement && window.SplitText) {
        var words = SplitText.create(statement, { type: 'words', wordsClass: 'w' }).words;
        gsap.fromTo(words, { color: '#6F7F8D' }, { color: '#0F2133', ease: 'none', stagger: 0.12, scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 42%', scrub: 0.6 } });
      }
      var clad = $('[data-silver]');
      if (clad) {
        var fresh = $$('.board__fresh', clad), yearEl = $('[data-year]', clad), order = [3, 0, 5, 1, 6, 2, 4];
        var stl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: clad, start: 'top 82%', end: 'bottom 30%', scrub: 0.6, onUpdate: function (self) { yearEl.textContent = Math.round(self.progress * 6); } } });
        order.forEach(function (bi, k) { stl.fromTo(fresh[bi], { opacity: 1 }, { opacity: 0, duration: 0.5 }, k * 0.07); });
        yearEl.textContent = '0';
      }

      /* Ledger: material columns grow from the baseline */
      var cols = $$('.column__fill');
      if (cols.length) gsap.from(cols, { scaleY: 0, duration: 1.4, ease: 'expo.out', stagger: 0.14, scrollTrigger: { trigger: '[data-columns]', start: 'top 75%', once: true } });

      /* Footer wordmark */
      var word = $$('.footer__word span');
      if (word.length) gsap.from(word, { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.footer__word', start: 'top 92%', once: true } });

      /* ---------- SIGNATURE: the site model raised across five movements (desktop) ---------- */
      if (desktop) processScene(ctx);
    });
  }

  function processScene(ctx) {
    var sec = $('[data-scene]'), svg = $('[data-model] svg');
    if (!sec || !svg) return;
    var q = function (s) { return $$(s, svg); };
    var steps = $$('.step', sec), ticks = $$('.steps__tick', sec), tag = $('[data-model-label]'), names = ['Listen', 'Read the site', 'Draft in timber', 'Prefabricate', 'Raise & tend'];
    var sun = $('[data-part="sun"]', svg), sunPts = (window.NorrArt && window.NorrArt.model.sunPts) || [];
    var current = -1;
    function setStep(i) {
      if (i === current) return; current = i;
      ticks.forEach(function (t, k) { t.classList.toggle('is-on', k <= i); });
      if (tag) tag.textContent = 'Site model 1:500 — ' + String(i + 1).padStart(2, '0') + ' ' + names[i];
    }
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, onUpdate: function (self) { setStep(Math.min(4, Math.floor(self.progress * 5 + 0.04))); } }
    });
    // one second of timeline = the whole scene
    tl.set({}, {}, 1);
    // 01 Listen: walkers move along the path, the wind draws in
    tl.fromTo(q('[data-walker]'), { x: 0, y: 0 }, { x: 46, y: -14, duration: 0.17, ease: 'power1.inOut', stagger: 0.008 }, 0.01);
    tl.fromTo(q('[data-part="wind"] .m-wind'), { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.12, ease: 'power2.inOut' }, 0.02);
    // 02 Read the site: the low winter sun path, the sun travels, the footprint lands, trees are kept
    tl.fromTo(q('[data-part="sunpath"] .m-sun-path, [data-part="sunpath"] text'), { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.2);
    if (sun && sunPts.length) {
      var sp = { t: 0.1 };
      var placeSun = function () { var f = sp.t * (sunPts.length - 1), i = Math.floor(f), k = f - i, a = sunPts[i], b = sunPts[Math.min(i + 1, sunPts.length - 1)]; sun.setAttribute('transform', 'translate(' + (a[0] + (b[0] - a[0]) * k).toFixed(1) + ' ' + (a[1] + (b[1] - a[1]) * k).toFixed(1) + ')'); };
      tl.fromTo(sun, { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.21);
      tl.fromTo(sp, { t: 0.08 }, { t: 0.92, duration: 0.18, ease: 'power1.inOut', onUpdate: placeSun }, 0.21);
      placeSun();
    }
    tl.fromTo(q('[data-part="foot"]'), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.27);
    tl.fromTo(q('[data-part="keep"] path'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.05, ease: 'back.out(2)', stagger: 0.012 }, 0.31);
    // 03 Draft in timber: the portals, ridge and eaves draw themselves
    tl.fromTo(q('[data-frame]'), { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.07, ease: 'power2.inOut', stagger: 0.011 }, 0.4);
    tl.fromTo(q('[data-part="dim"]'), { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.5);
    tl.to(q('[data-part="sunpath"], [data-part="keep"]'), { opacity: 0.35, duration: 0.05 }, 0.5);
    // 04 Prefabricate: numbered panels drop in, the frames become glulam
    tl.fromTo(q('[data-part="glulam"]'), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.6);
    tl.fromTo(q('[data-panel]'), { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.06, ease: 'power3.out', stagger: 0.0075 }, 0.61);
    tl.fromTo(q('[data-part="ids"]'), { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.7);
    tl.to(q('[data-part="dim"], [data-part="foot"]'), { opacity: 0, duration: 0.04 }, 0.72);
    // 05 Raise & tend: cladding and glass, nightfall, the building becomes a lantern, people gather at the threshold
    tl.fromTo(q('[data-part="clad"]'), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.8);
    tl.to(q('[data-part="ids"], [data-part="sunpath"], [data-part="keep"], [data-part="wind"]'), { opacity: 0, duration: 0.04 }, 0.8);
    tl.fromTo('.model__night', { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'power1.inOut' }, 0.84);
    tl.fromTo('.model__stars', { opacity: 0 }, { opacity: 0.9, duration: 0.08 }, 0.9);
    tl.fromTo(q('.m-night-ground'), { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.84);
    tl.fromTo(q('[data-part="lit"]'), { opacity: 0 }, { opacity: 1, duration: 0.07 }, 0.89);
    tl.fromTo(q('[data-part="spill"]'), { opacity: 0 }, { opacity: 1, duration: 0.07 }, 0.91);
    tl.fromTo('.model__tag', { backgroundColor: 'rgba(238,242,243,.86)' }, { backgroundColor: 'rgba(238,242,243,.94)', duration: 0.1 }, 0.84);
    q('[data-walker]').forEach(function (w) {
      var g = w.parentNode;
      tl.to(w, { x: parseFloat(g.dataset.dx), y: parseFloat(g.dataset.dy), duration: 0.13, ease: 'power2.inOut' }, 0.84);
    });
    // the text: one movement at a time, swapped in place (never slid sideways)
    steps.forEach(function (s, i) {
      if (i === 0) return;
      var at = i * 0.2 - 0.01;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -14, duration: 0.012, ease: 'power2.in' }, at);
      tl.fromTo(s, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.016, ease: 'power2.out', immediateRender: false }, at + 0.012);
    });
    setStep(0);
    ctx.add(function () { return function () { gsap.set(steps, { clearProps: 'all' }); }; });
  }

  // In-page links glide with Lenis when it is running.
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1), t = id ? document.getElementById(id) : document.body;
      if (!t) return;
      if (t.tagName !== 'BODY' && !t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      if (lenis) { e.preventDefault(); lenis.scrollTo(id === 'top' ? 0 : t, { duration: 1.4, easing: function (x) { return 1 - Math.pow(1 - x, 4); } }); history.replaceState(null, '', '#' + id); setTimeout(function () { t.focus({ preventScroll: true }); }, 1450); }
    });
  });

  // Re-measure scroll positions once the real fonts are in.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
