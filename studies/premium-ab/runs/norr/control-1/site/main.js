(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasG = !!(window.gsap && window.ScrollTrigger);
  var loader = $('.loader');

  /* ---------- Fallback: everything visible, no motion ---------- */
  function showAll() {
    if (loader) loader.style.display = 'none';
    $$('.st').forEach(function (g) { g.classList.add('on'); });
    $$('[data-count]').forEach(function (el) { el.textContent = fmt(+el.dataset.count); });
    $$('.step').forEach(function (s) { s.classList.add('active'); });
  }
  function fmt(n) { return n.toLocaleString('en-US'); }

  /* ---------- Menu (works without GSAP) ---------- */
  var menu = $('#menu'), btn = $('#menuBtn');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    btn.firstElementChild.textContent = open ? 'Close' : 'Menu';
    menu.setAttribute('aria-hidden', !open);
    if (window.__lenis) { open ? window.__lenis.stop() : window.__lenis.start(); }
    else doc.body.style.overflow = open ? 'hidden' : '';
  }
  btn.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

  /* ---------- Contact form: composes a mailto, sends nothing itself ---------- */
  var form = $('#form'), note = $('#formNote');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form), name = (d.get('name') || '').trim(), email = (d.get('email') || '').trim(), msg = (d.get('msg') || '').trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !msg) { note.textContent = 'Please add your name, a valid email and a few words about the place.'; return; }
    note.textContent = 'Thank you, ' + name.split(' ')[0] + '. Opening your mail app with the message ready to send.';
    var body = encodeURIComponent(msg + '\n\n— ' + name + ' (' + email + ')');
    window.location.href = 'mailto:hello@atelier-norr.example?subject=' + encodeURIComponent('Commission enquiry') + '&body=' + body;
  });

  /* ---------- Hero grain canvas (timber-grain lines reacting to pointer) ---------- */
  (function grain() {
    var c = $('#grain'); if (!c) return;
    var ctx = c.getContext('2d'), w, h, dpr, mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, vis = true, t = 0;
    function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var n = Math.round(h / 16), i, x;
      ctx.lineWidth = 1;
      for (i = 0; i < n; i++) {
        var y0 = (i / n) * h, a = 6 + 10 * Math.sin(i * 0.37);
        ctx.beginPath();
        for (x = 0; x <= w; x += 24) {
          var dx = x / w - mx, dy = y0 / h - my, inf = Math.exp(-(dx * dx + dy * dy) * 9) * 26;
          var y = y0 + Math.sin(x * 0.006 + i * 0.5 + t) * a + Math.sin(x * 0.0021 - t * 0.6 + i) * a * 0.8 - inf;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(120,76,36,' + (0.07 + 0.08 * Math.abs(Math.sin(i * 0.9))) + ')';
        ctx.stroke();
      }
    }
    function tick() {
      if (vis) { mx += (tx - mx) * 0.06; my += (ty - my) * 0.06; t += 0.004; draw(); }
      requestAnimationFrame(tick);
    }
    window.addEventListener('resize', size); size();
    if (reduce) return;
    $('#hero').addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }).observe(c);
    tick();
  })();

  if (!hasG || reduce) { showAll(); if (reduce && hasG) { /* keep layout stable, no scrubbing */ } }
  if (!hasG) { return; }
  if (reduce) { return; }

  /* =====================================================
     GSAP experience
     ===================================================== */
  gsap.registerPlugin(ScrollTrigger);
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return;
        var el = $(id); if (!el) return; e.preventDefault();
        lenis.scrollTo(el, { offset: id === '#projects' ? 0 : 0, duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
      });
    });
    lenis.stop();
  }

  /* ---------- initial states ---------- */
  var heroLines = $$('.hero__title .line > span');
  gsap.set(heroLines, { yPercent: 115, rotate: 3 });
  gsap.set(['.hero__eyebrow', '.hero__lede', '.hero__foot .btn', '.hero__scroll'], { autoAlpha: 0, y: 24 });
  gsap.set('.nav', { autoAlpha: 0, y: -20 });
  gsap.set('.hero__sun', { yPercent: 60, autoAlpha: 0 });
  var draws = $$('.hero__art .draw');
  draws.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.__L = L; });
  $$('.lines .line > span').forEach(function (s) { gsap.set(s, { yPercent: 115, rotate: 2 }); });
  $$('[data-reveal]').forEach(function (el) { gsap.set(el, { autoAlpha: 0, y: 40 }); });

  /* ---------- preloader → hero intro ---------- */
  var num = $('#loadNum'), bar = $('.loader__bar i'), counter = { v: 0 };
  var intro = gsap.timeline({ paused: true });
  intro
    .to('.hero__sun', { yPercent: 0, autoAlpha: 0.85, duration: 2.6, ease: 'power3.out' }, 0)
    .to(heroLines, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out' }, 0.1)
    .to(draws, { strokeDashoffset: 0, duration: 2.4, stagger: 0.08, ease: 'power2.inOut' }, 0.2)
    .to('.nav', { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.5)
    .to(['.hero__eyebrow', '.hero__lede', '.hero__foot .btn', '.hero__scroll'], { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out' }, 0.7);

  var lt = gsap.timeline({
    onComplete: function () { if (lenis) lenis.start(); }
  });
  lt.to(counter, { v: 100, duration: 1.9, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(counter.v); } }, 0)
    .to(bar, { scaleX: 1, duration: 1.9, ease: 'power2.inOut' }, 0)
    .from('.loader__word span, .loader__word em', { yPercent: 110, duration: 1, stagger: 0.12, ease: 'expo.out' }, 0)
    .to('.loader__inner', { autoAlpha: 0, y: -30, duration: 0.5, ease: 'power2.in' }, 2.1)
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, 2.4)
    .add(function () { intro.play(); }, 2.7)
    .set('.loader', { display: 'none' });
  gsap.set('.loader', { clipPath: 'inset(0 0 0% 0)' });

  /* ---------- hero scroll parallax ---------- */
  gsap.to('.hero__art', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__sun', { y: 160, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { y: -60, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true } });

  /* ---------- section line reveals ---------- */
  $$('.lines').forEach(function (h) {
    gsap.to($$('.line > span', h), {
      yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 85%', once: true }
    });
  });
  $$('[data-reveal]').forEach(function (el) {
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- philosophy: word-by-word scrub ---------- */
  var st = $('#statement');
  var words = st.textContent.trim().split(/\s+/);
  st.setAttribute('aria-label', st.textContent.trim());
  st.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + ' </span>'; }).join('');
  gsap.fromTo($$('.w', st), { opacity: 0.12 }, {
    opacity: 1, ease: 'none', stagger: 0.08,
    scrollTrigger: { trigger: st, start: 'top 82%', end: 'bottom 48%', scrub: 0.6 }
  });

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var target = +el.dataset.count, o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 2.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: function () { el.textContent = fmt(Math.round(o.v)); }
    });
  });

  /* ---------- horizontal projects + responsive fallbacks ---------- */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    var track = $('#hsTrack'), section = $('.hs'), cards = $$('.card:not(.card--end)', track);
    var numEl = $('#hsNum'), barEl = $('#hsBar');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var proxy = { skew: 0 }, setSkew = gsap.quickTo(proxy, 'skew', { duration: 0.5, ease: 'power3.out' });
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: function () { return '+=' + dist(); },
        pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (self) {
          var p = self.progress, idx = Math.min(cards.length, Math.floor(p * cards.length * 0.999) + 1);
          numEl.textContent = '0' + idx;
          gsap.set(barEl, { scaleX: 0.2 + p * 0.8 });
          setSkew(gsap.utils.clamp(-3, 3, self.getVelocity() / -450));
          cards.forEach(function (c) { c.firstElementChild.style.transform = 'skewX(' + proxy.skew.toFixed(2) + 'deg)'; });
        }
      }
    });
    // card inner parallax
    cards.forEach(function (c) {
      var svg = $('svg', c);
      gsap.fromTo(svg, { xPercent: -3 }, {
        xPercent: 3, ease: 'none',
        scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });
    return function () { cards.forEach(function (c) { c.firstElementChild.style.transform = ''; }); };
  });
  mm.add('(max-width: 900px)', function () {
    $$('.card').forEach(function (c) {
      gsap.from(c, { autoAlpha: 0, y: 60, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
    });
  });

  /* ---------- process: sticky drawing + active step ---------- */
  var steps = $$('.step'), groups = $$('#procSvg .st'), label = $('#procLabel');
  var names = ['Site & listening', 'Foundations & timber schedule', 'The frame is raised', 'Cladding & finish', 'Light, returning'];
  var ol = $('#steps'), fill = doc.createElement('div'); fill.className = 'steps__line'; ol.appendChild(fill);
  gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: ol, start: 'top 60%', end: 'bottom 60%', scrub: true } });
  var curStage = 0;
  function setStage(n) {
    if (n === curStage) return; curStage = n;
    groups.forEach(function (g, i) { g.classList.toggle('on', i < n); });
    gsap.fromTo(label, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    label.textContent = names[n - 1];
  }
  groups.forEach(function (g, i) { g.classList.toggle('on', i === 0); });
  steps.forEach(function (s, i) {
    ScrollTrigger.create({
      trigger: s, start: 'top 58%', end: 'bottom 58%',
      onToggle: function (self) { s.classList.toggle('active', self.isActive); },
      onEnter: function () { setStage(i + 1); },
      onEnterBack: function () { setStage(i + 1); }
    });
  });
  mm.add('(max-width: 900px)', function () { steps.forEach(function (s) { s.classList.add('active'); }); });

  /* ---------- foot word ---------- */
  gsap.from('.foot__word span', {
    yPercent: 100, duration: 1.4, stagger: 0.08, ease: 'expo.out',
    scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true }
  });

  /* ---------- nav hide/show on scroll ---------- */
  var lastY = 0, navEl = $('#nav');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      var y = self.scroll(), down = y > lastY;
      if (!menu.classList.contains('open')) gsap.to(navEl, { yPercent: down && y > 200 ? -110 : 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      lastY = y;
    }
  });

  /* ---------- cursor + magnetic ---------- */
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (fine) {
    var cur = $('.cursor'), cl = $('.cursor__label');
    doc.body.classList.add('has-cursor');
    var qx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', function (e) { qx(e.clientX); qy(e.clientY); });
    $$('[data-cursor]').forEach(function (el) {
      var kind = el.dataset.cursor;
      el.addEventListener('pointerenter', function () { cur.classList.add('is-' + kind); if (kind === 'view') cl.textContent = 'View'; });
      el.addEventListener('pointerleave', function () { cur.classList.remove('is-' + kind); });
    });
    $$('[data-magnet]').forEach(function (el) {
      var mxq = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,0.5)' }), myq = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,0.5)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mxq((e.clientX - (r.left + r.width / 2)) * 0.28); myq((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', function () { mxq(0); myq(0); });
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  // failsafe: never leave the user stuck behind the loader
  setTimeout(function () { if (lenis) lenis.start(); }, 6000);
})();
