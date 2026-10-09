/* Atelier Norr — interaction & motion.
   Everything is visible by default. Motion only layers on when GSAP loaded
   and the visitor has not asked for reduced motion. */
(function () {
  'use strict';
  var html = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = mqReduce.matches;
  var hasG = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var anim = hasG && !reduce;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- helpers that work without GSAP ---------- */

  // split a paragraph into word spans
  function splitWords(el) {
    var text = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = '';
    return text.map(function (t, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = t + (i < text.length - 1 ? ' ' : '');
      el.appendChild(s);
      return s;
    });
  }

  // growth rings: 18 slightly irregular closed paths
  function buildRings() {
    var svg = $('#rings');
    if (!svg) return [];
    var NS = 'http://www.w3.org/2000/svg';
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('id', 'ringsG');
    var rings = [];
    var N = 18;
    for (var i = 0; i < N; i++) {
      var r0 = 14 + i * 9.6 + Math.pow(i / N, 2) * 4;
      var pts = [];
      var seg = 90;
      for (var k = 0; k < seg; k++) {
        var a = (k / seg) * Math.PI * 2;
        var wob = Math.sin(a * 2 + i * 0.7) * (1.4 + i * 0.16) + Math.sin(a * 3 - i * 1.3) * (0.9 + i * 0.1) + Math.sin(a * 5 + i) * 0.6;
        var r = r0 + wob + Math.cos(a - 0.6) * i * 0.35;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var j = 1; j <= seg; j++) {
        var p0 = pts[(j - 1) % seg], p1 = pts[j % seg], p2 = pts[(j + 1) % seg], pm = pts[(j - 2 + seg) % seg];
        var c1 = [p0[0] + (p1[0] - pm[0]) / 6, p0[1] + (p1[1] - pm[1]) / 6];
        var c2 = [p1[0] - (p2[0] - p0[0]) / 6, p1[1] - (p2[1] - p0[1]) / 6];
        d += 'C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
      }
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d + 'Z');
      path.setAttribute('pathLength', '1');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', i % 3 === 0 ? '#9a6431' : '#141a17');
      path.setAttribute('stroke-width', i % 3 === 0 ? 2.2 : 1.1);
      path.setAttribute('stroke-opacity', (0.35 + (i / N) * 0.55).toFixed(2));
      path.setAttribute('class', 'ring');
      g.appendChild(path);
      rings.push(path);
    }
    var pith = document.createElementNS(NS, 'circle');
    pith.setAttribute('r', 4); pith.setAttribute('fill', '#c98b4e');
    g.appendChild(pith);
    // a crack
    var crack = document.createElementNS(NS, 'path');
    crack.setAttribute('d', 'M6 -2L60 -10L98 -4L132 -16L150 -12');
    crack.setAttribute('fill', 'none'); crack.setAttribute('stroke', '#141a17'); crack.setAttribute('stroke-width', 1.2); crack.setAttribute('stroke-opacity', .6);
    g.appendChild(crack);
    svg.appendChild(g);
    return rings;
  }

  var rings = buildRings();
  var manifesto = $('#manifesto');
  var quoteEl = $('.quote blockquote');
  var mWords = manifesto ? splitWords(manifesto) : [];
  var qWords = quoteEl ? splitWords(quoteEl) : [];

  // ambient motes on the hero canvas
  function motes() {
    var c = $('#motes');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var P = [];
    function size() {
      var r = c.getBoundingClientRect();
      W = r.width; H = r.height;
      c.width = W * dpr; c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(90, W / 18));
      while (P.length < n) P.push({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, v: .02 + Math.random() * .05, ph: Math.random() * 6.28, a: .25 + Math.random() * .55 });
      P.length = n;
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var x = (p.x + Math.sin(t * .0003 + p.ph) * .02) * W;
        var y = p.y * H;
        var tw = .6 + .4 * Math.sin(t * .0012 + p.ph);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,226,170,' + (p.a * tw).toFixed(3) + ')';
        ctx.arc(x, y, p.r, 0, 6.283);
        ctx.fill();
      }
    }
    function step(t, dt) {
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.v * dt / 1000 * .5;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      }
    }
    size();
    window.addEventListener('resize', size);
    if (reduce) { draw(0); return; }
    var running = true, last = performance.now();
    function loop(t) {
      if (running) { step(t, Math.min(64, t - last)); draw(t); }
      last = t;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { running = e[0].isIntersecting; }).observe(c);
    }
    mqReduce.addEventListener && mqReduce.addEventListener('change', function (e) { if (e.matches) { running = false; draw(0); } else { running = true; } });
  }
  motes();

  // mobile: keep the pavilion in frame
  function sceneAlign() {
    var s = $('#scene');
    if (!s) return;
    var mob = window.innerWidth < 760;
    s.classList.toggle('mob', mob);
    s.setAttribute('viewBox', mob ? '620 330 960 570' : '0 0 1600 900');
    s.setAttribute('preserveAspectRatio', mob ? 'xMidYMid meet' : 'xMidYMax slice');
  }
  sceneAlign();
  window.addEventListener('resize', sceneAlign);

  // contact form (static site: acknowledges locally, nothing is transmitted)
  var form = $('#form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = $('.form-note', form);
      var ok = form.checkValidity() && /.+@.+\..+/.test(form.email.value);
      if (!ok) {
        note.textContent = 'Please add your name, a valid email and a few words.';
        note.style.color = '#e7a98f';
        var bad = $$('input,textarea', form).filter(function (f) { return !f.value.trim(); })[0] || form.email;
        bad.focus();
        return;
      }
      note.style.color = '';
      note.textContent = 'Takk, ' + form.name.value.trim().split(' ')[0] + '. We will reply within a week.';
      form.reset();
    });
  }

  if (!anim) {
    // Static presentation: everything already visible. Still tidy the counters.
    return;
  }

  /* ======================== GSAP LAYER ======================== */
  html.classList.add('anim');
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out' });

  var DRAW = function (els) { els.forEach(function (e) { e.style.strokeDasharray = '1'; }); gsap.set(els, { strokeDashoffset: 1 }); };

  /* ----- progress bar ----- */
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .15 } });

  /* ----- hero intro ----- */
  (function hero() {
    var bl = $$('#bldg .d');
    DRAW(bl);
    var tl = gsap.timeline({ delay: .1 });
    tl.from('#lSky', { opacity: 0, duration: 1.2, ease: 'power2.out' }, 0)
      .from('.sun', { y: 70, duration: 2.4, ease: 'power2.out' }, 0)
      .from(['#lSun', '#lFar', '#lMid', '#lNear', '#lWater'], { opacity: 0, duration: 1.4, stagger: .14, ease: 'power2.out' }, .1)
      .from('#lBldg', { opacity: 0, duration: .6 }, .6)
      .to(bl, { strokeDashoffset: 0, duration: 1.6, stagger: .06, ease: 'power2.inOut' }, .7)
      .from('.lamp', { opacity: 0, duration: 1.4, ease: 'power1.inOut' }, 1.9)
      .from('.hero-title .l > span', { yPercent: 115, duration: 1.3, stagger: .12, ease: 'power4.out' }, .5)
      .from(['.hero-eyebrow', '.hero-sub', '.scroll-cue', '.hero-coords'], { y: 22, autoAlpha: 0, duration: 1, stagger: .12 }, 1.2)
      .from('.nav', { y: -24, autoAlpha: 0, duration: 1 }, .9);

    // scroll parallax (depth)
    var st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    var pl = gsap.timeline({ scrollTrigger: st, defaults: { ease: 'none' } });
    pl.to('#lSun', { y: 90 }, 0).to('#lFar', { y: 60 }, 0).to('#lMid', { y: 38 }, 0).to('#lNear', { y: 20 }, 0)
      .to('#lWater', { y: 12 }, 0).to('#lBldg', { y: 6 }, 0)
      .to('.hero-inner', { y: -90, opacity: .0 }, 0)
      .to('.hero-coords', { y: -40, opacity: 0 }, 0);

    // pointer parallax
    if (fine) {
      var qs = [['#lFar', 10], ['#lMid', 20], ['#lNear', 32], ['#lBldg', 8], ['#lSun', 5]].map(function (a) {
        return { f: gsap.quickTo(a[0], 'x', { duration: 1.2, ease: 'power3.out' }), k: a[1] };
      });
      $('.hero').addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - .5;
        qs.forEach(function (q) { q.f(-nx * q.k); });
      });
    }
  })();

  /* ----- generic reveals ----- */
  $$('.big-h, .mid-h, .huge-h').forEach(function (h) {
    var spans = $$('.l > span', h);
    if (spans.length) {
      gsap.from(spans, { yPercent: 115, duration: 1.2, stagger: .12, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
    } else {
      gsap.from(h, { y: 40, autoAlpha: 0, duration: 1, scrollTrigger: { trigger: h, start: 'top 88%' } });
    }
  });
  $$('.sec-head').forEach(function (s) {
    gsap.from(s.children, { y: 16, autoAlpha: 0, duration: .9, stagger: .1, scrollTrigger: { trigger: s, start: 'top 92%' } });
    var line = document.createElement('span');
    line.style.cssText = 'position:absolute;left:0;right:0;top:-1px;height:1px;background:currentColor;transform-origin:0 50%;opacity:.5;pointer-events:none';
    s.style.position = 'relative';
    s.appendChild(line);
    gsap.from(line, { scaleX: 0, duration: 1.6, ease: 'power3.inOut', scrollTrigger: { trigger: s, start: 'top 92%' } });
  });

  /* ----- philosophy ----- */
  function scrubWords(words, trigger, start, end) {
    gsap.to(words, { opacity: 1, ease: 'none', stagger: .4, scrollTrigger: { trigger: trigger, start: start, end: end, scrub: .4 } });
  }
  if (mWords.length) scrubWords(mWords, manifesto, 'top 82%', 'bottom 52%');
  if (qWords.length) scrubWords(qWords, quoteEl, 'top 85%', 'bottom 55%');

  if (rings.length) {
    DRAW(rings);
    gsap.to(rings, { strokeDashoffset: 0, ease: 'none', stagger: { each: .05 }, scrollTrigger: { trigger: '.rings', start: 'top 85%', end: 'bottom 35%', scrub: .6 } });
    gsap.to('#ringsG', { rotation: 360, svgOrigin: '0 0', duration: 300, repeat: -1, ease: 'none' });
  }
  gsap.from('.principle', { y: 50, autoAlpha: 0, duration: 1.1, stagger: .15, scrollTrigger: { trigger: '.principles', start: 'top 85%' } });
  gsap.from('.stats > div', { y: 30, autoAlpha: 0, duration: 1, stagger: .1, scrollTrigger: { trigger: '.stats', start: 'top 90%' } });
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count')), o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: function () {
        gsap.to(o, { v: end, duration: 2.2, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('en-US'); } });
      }
    });
    // start from zero only once the trigger is armed and below the fold
    if (el.getBoundingClientRect().top > window.innerHeight * .92) el.textContent = '0';
  });

  /* ----- projects ----- */
  $$('.project').forEach(function (p) {
    var img = $('.pimg', p), svg = $('.pimg svg', p), lines = $$('.ln', p), fills = $$('.fillin, .sk', p);
    var meta = $$('.pmeta > *', p);
    DRAW(lines);
    gsap.set(fills, { opacity: 0 });
    var tl = gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 78%' } });
    tl.fromTo(img, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.inOut' }, 0)
      .from(svg, { scale: 1.25, duration: 2, ease: 'power3.out' }, 0)
      .to(lines, { strokeDashoffset: 0, duration: 1.5, stagger: .07, ease: 'power2.inOut' }, .7)
      .to(fills, { opacity: 1, duration: 1.2, stagger: .05, ease: 'power1.out' }, 1.3)
      .from(meta, { y: 34, autoAlpha: 0, duration: 1, stagger: .09 }, .6);
    gsap.fromTo(svg, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
    var num = $('.pnum', p);
    if (num) gsap.fromTo(num, { y: 0 }, { y: -40, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ----- process ----- */
  (function process() {
    var groups = $$('#frame [data-step]');
    var steps = $$('.step');
    var no = $('.frame-no'), nm = $('.frame-name');
    groups.forEach(function (g) {
      $$('.d', g).forEach(function (el) { el._dash = el.getAttribute('stroke-dasharray') || 'none'; });
      $$('.f', g).forEach(function (el) { el._o = parseFloat(getComputedStyle(el).opacity) || 1; });
    });
    function paint(n, instant) {
      groups.forEach(function (g, i) {
        var show = i <= n;
        var ds = $$('.d', g), fs = $$('.f', g);
        ds.forEach(function (el, k) {
          var op = { strokeDashoffset: show ? 0 : 1, duration: instant ? 0 : (show ? 1.5 : .5), delay: instant ? 0 : (show ? .12 * k + (i === n ? .1 : 0) : 0), ease: 'power2.inOut', overwrite: true };
          if (show) {
            el.style.strokeDasharray = '1';
            op.onComplete = function () { if (el._dash !== 'none') el.style.strokeDasharray = el._dash; else el.style.strokeDasharray = 'none'; };
          } else el.style.strokeDasharray = '1';
          gsap.to(el, op);
        });
        fs.forEach(function (el, k) {
          gsap.to(el, { opacity: show ? el._o : 0, duration: instant ? 0 : (show ? 1 : .4), delay: instant ? 0 : (show ? .8 + .1 * k : 0), overwrite: true });
        });
      });
    }
    var cur = -1;
    function setStep(n) {
      if (n === cur) return;
      var first = cur < 0;
      cur = n;
      paint(n, first);
      steps.forEach(function (s, i) { s.classList.toggle('on', i === n); });
      if (no && nm) {
        gsap.to([no, nm], {
          autoAlpha: 0, y: -8, duration: .25, onComplete: function () {
            no.textContent = ('0' + (n + 1)).slice(-2);
            nm.innerHTML = steps[n].getAttribute('data-name');
            gsap.fromTo([no, nm], { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .45 });
          }
        });
      }
    }
    setStep(0);
    steps.forEach(function (s, i) {
      ScrollTrigger.create({
        trigger: s, start: 'top 62%', end: 'bottom 62%',
        onToggle: function (self) { if (self.isActive) setStep(i); }
      });
    });
  })();

  /* ----- awards ----- */
  gsap.from('.award', { y: 36, autoAlpha: 0, duration: 1, stagger: .09, scrollTrigger: { trigger: '.award-list', start: 'top 85%' } });

  /* ----- contact ----- */
  gsap.from(['.mail', '.offices > div', '.small'], { y: 36, autoAlpha: 0, duration: 1, stagger: .1, scrollTrigger: { trigger: '.contact-grid', start: 'top 85%' } });
  gsap.from('.form > *', { y: 30, autoAlpha: 0, duration: .9, stagger: .09, scrollTrigger: { trigger: '.form', start: 'top 88%' } });
  gsap.from('.wordmark span', { yPercent: 105, duration: 1.4, stagger: .1, ease: 'power4.out', scrollTrigger: { trigger: '.wordmark', start: 'top 100%' } });
  gsap.from('.foot-row', { autoAlpha: 0, duration: 1, scrollTrigger: { trigger: '.foot-row', start: 'top 100%' } });

  /* ----- magnetic button ----- */
  if (fine) {
    $$('[data-magnet]').forEach(function (b) {
      var qx = gsap.quickTo(b, 'x', { duration: .6, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: .6, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * .3); qy((e.clientY - (r.top + r.height / 2)) * .4);
      });
      b.addEventListener('pointerleave', function () { qx(0); qy(0); });
    });

    /* ----- cursor ----- */
    var cur = $('.cursor'), lab = $('.cursor-label', cur);
    var cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3.out' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3.out' });
    window.addEventListener('pointermove', function (e) { cur.classList.add('on'); cx(e.clientX); cy(e.clientY); }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.remove('on'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) { lab.textContent = t.getAttribute('data-cursor'); cur.classList.add('big'); }
      else cur.classList.remove('big');
    });
  }

  /* ----- layout settling ----- */
  var refresh = function () { ScrollTrigger.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
})();
