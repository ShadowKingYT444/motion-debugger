/* Drift — page choreography */
(function () {
  'use strict';
  var D = (window.Drift = window.Drift || {});
  D.state = D.state || { ambient: true, scrollY: 0, starFade: 1, px: 0, py: 0 };
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var animate = hasGSAP && !reduced;       // scroll choreography
  if (!animate) root.classList.add('no-anim');
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('[drift]', e); } }

  /* ------------------------------------------------------------
     Ambient motion toggle (also the reduced-motion opt-in)
     ------------------------------------------------------------ */
  var motionBtn = $('#motionToggle');
  function setAmbient(on) {
    D.state.ambient = on;
    root.classList.toggle('motion-off', !on);
    motionBtn.setAttribute('aria-pressed', String(on));
    $('.mt-state', motionBtn).textContent = on ? 'On' : 'Off';
  }
  motionBtn.addEventListener('click', function () { setAmbient(!D.state.ambient); });
  setAmbient(!reduced);

  /* ------------------------------------------------------------
     Smooth scroll (Lenis) + ScrollTrigger sync
     ------------------------------------------------------------ */
  var lenis = null;
  safe(function () {
    if (reduced || !window.Lenis) return;
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  });
  function scrollToY(y, immediate) {
    if (lenis) lenis.scrollTo(y, { duration: immediate ? 0 : 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) { return; }
      var target = id === '#top' ? null : $(id);
      if (id !== '#top' && !target) return;
      e.preventDefault();
      closeMenu();
      var y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY;
      if (id === '#how') { var head = $('.how-head'); y = head.getBoundingClientRect().top + window.scrollY - 70; }
      scrollToY(y);
    });
  });

  /* ------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------ */
  var menu = $('#mobileMenu'), menuBtn = $('#menuBtn');
  $$('a', menu).forEach(function (a, i) { a.style.setProperty('--n', i); });
  function openMenu() {
    menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu');
    menuBtn.firstElementChild.firstElementChild.setAttribute('href', '#i-close');
    requestAnimationFrame(function () { menu.classList.add('open'); });
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (menu.hidden) return;
    menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
    menuBtn.firstElementChild.firstElementChild.setAttribute('href', '#i-menu');
    setTimeout(function () { if (!menu.classList.contains('open')) menu.hidden = true; }, 500);
    if (lenis) lenis.start();
  }
  menuBtn.addEventListener('click', function () { menu.hidden || menu.classList.contains('open') === false ? openMenu() : closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ------------------------------------------------------------
     Word splitting + reveal-on-view (IntersectionObserver)
     ------------------------------------------------------------ */
  function splitWords(el) {
    var idx = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
            wi.style.setProperty('--i', idx++);
            w.appendChild(wi); frag.appendChild(w);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') {
          if (ch.tagName === 'EM') ch.classList.add('s');
          walk(ch);
        }
      });
    })(el);
  }
  $$('[data-split]').forEach(splitWords);
  var heroTitle = $('#heroTitle');
  heroTitle.style.setProperty('--sd', 220);

  // stagger delays among siblings
  var groups = new Map();
  $$('[data-reveal]').forEach(function (el) {
    var p = el.parentElement, n = groups.get(p) || 0; groups.set(p, n + 1);
    el.style.setProperty('--d', Math.min(n, 5) * 90);
  });

  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); revealIO.unobserve(e.target);
      if (e.target.matches('[data-split]')) {
        // headings reveal their sibling kicker/lede together (handled by their own observers)
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split]').forEach(function (el) { if (el !== heroTitle) revealIO.observe(el); });

  /* Hero intro: after fonts settle */
  var introDone = false;
  function startIntro() {
    if (introDone) return; introDone = true;
    $$('[data-intro]').forEach(function (el) { el.classList.add('in'); });
    heroTitle.classList.add('in');
    $('#orbStage').classList.add('in');
  }
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1600); })]).then(function () { requestAnimationFrame(startIntro); });
  setTimeout(startIntro, 2600);

  /* Counters */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count')), prefix = el.getAttribute('data-prefix') || '';
    if (!animate) { el.textContent = prefix + target; return; }
    var t0 = performance.now(), dur = 1900;
    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + Math.round(target * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  var countIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { countIO.observe(el); });

  /* ------------------------------------------------------------
     Pointer niceties: spotlight + magnetic buttons
     ------------------------------------------------------------ */
  $$('.spot').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(function (el) {
      var qx, qy;
      if (hasGSAP) { qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }); qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' }); }
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22, dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
        if (qx) { qx(dx); qy(dy); } else el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      el.addEventListener('pointerleave', function () { if (qx) { qx(0); qy(0); } else el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------
     Nav state
     ------------------------------------------------------------ */
  var nav = $('#nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ------------------------------------------------------------
     How it works: pinned, scroll-driven phone
     ------------------------------------------------------------ */
  var steps = $$('.step'), screens = $$('.scr'), device = $('#howDevice'), phone = $('#phone'), howBar = $('#howBar');
  var curStep = 0, howST = null;
  function setStep(i) {
    if (i === curStep) return; curStep = i;
    steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    $$('.ht').forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
    screens.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
    device.setAttribute('data-step', i);
  }
  steps.forEach(function (s, i) {
    $('.step-btn', s).addEventListener('click', function () {
      if (howST) {
        var y = howST.start + ((i + 0.5) / 3) * (howST.end - howST.start);
        scrollToY(y);
      } else setStep(i);
    });
  });

  /* ------------------------------------------------------------
     Science: hypnogram built from data, drawn by scroll
     ------------------------------------------------------------ */
  var hyp = { ready: false };
  function buildHypnogram() {
    var svg = $('#hypnoSvg'); if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var tall = window.innerWidth < 720;
    svg.setAttribute('viewBox', tall ? '0 0 1200 640' : '0 0 1200 380');
    svg.classList.toggle('tall', tall);
    var X0 = tall ? 190 : 130, X1 = 1170, TOT = 480;
    var Y = tall ? { A: 110, R: 260, L: 410, D: 560 } : { A: 52, R: 128, L: 204, D: 280 };
    var NAMES = { A: 'Awake', R: 'REM', L: 'Light', D: 'Deep' };
    var xs = function (m) { return X0 + (m / TOT) * (X1 - X0); };
    var typical = [[0,'A'],[26,'L'],[44,'D'],[64,'L'],[84,'R'],[98,'L'],[116,'A'],[123,'L'],[148,'D'],[166,'L'],[198,'R'],[220,'L'],[238,'A'],[250,'L'],[278,'D'],[292,'L'],[318,'R'],[344,'L'],[370,'A'],[380,'L'],[410,'R'],[432,'L'],[452,'A'],[480,'A']];
    var drift   = [[0,'A'],[11,'L'],[20,'D'],[74,'L'],[90,'R'],[104,'L'],[112,'D'],[164,'L'],[184,'R'],[204,'L'],[216,'D'],[252,'L'],[278,'R'],[308,'L'],[324,'D'],[346,'L'],[372,'R'],[408,'L'],[436,'R'],[462,'L'],[480,'A']];
    function pathOf(seq) {
      var d = 'M' + xs(seq[0][0]) + ' ' + Y[seq[0][1]];
      for (var i = 1; i < seq.length; i++) d += ' H' + xs(seq[i][0]) + ' V' + Y[seq[i][1]];
      return d;
    }
    function stageAt(seq, m) { var s = seq[0][1]; for (var i = 0; i < seq.length; i++) if (seq[i][0] <= m) s = seq[i][1]; return s; }
    function el(name, attrs, parent) { var e = document.createElementNS(NS, name); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); (parent || svg).appendChild(e); return e; }

    var grid = $('#hyGrid'), cyc = $('#hyCycles');
    el('rect', { x: X0, y: Y.D - (tall ? 50 : 26), width: X1 - X0, height: tall ? 100 : 52, rx: 14, class: 'hy-band' }, grid);
    Object.keys(Y).forEach(function (k) {
      el('line', { x1: X0, x2: X1, y1: Y[k], y2: Y[k], class: 'hy-line' }, grid);
      var t = el('text', { x: 0, y: Y[k] + (tall ? 10 : 4), class: 'hy-label' }, grid); t.textContent = NAMES[k];
    });
    ['10 PM', '12 AM', '2 AM', '4 AM', '6 AM'].forEach(function (lab, i) {
      var t = el('text', { x: xs(i * 120), y: tall ? 624 : 352, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle', class: 'hy-tick' }, grid); t.textContent = lab;
    });
    [0, 90, 180, 270, 360].forEach(function (m, i) {
      el('line', { x1: xs(m), x2: xs(m), y1: tall ? 50 : 30, y2: tall ? 590 : 318, class: 'hy-cyc' }, cyc);
      var t = el('text', { x: xs(m) + 8, y: tall ? 40 : 24, class: 'hy-cyc-t' }, cyc); t.textContent = tall ? 'C' + (i + 1) : 'Cycle ' + (i + 1);
    });

    var pT = $('#hyTypical'), pD = $('#hyDrift'), pG = $('#hyGlow');
    pT.setAttribute('d', pathOf(typical)); pD.setAttribute('d', pathOf(drift)); pG.setAttribute('d', pathOf(drift));
    var LT = pT.getTotalLength(), LD = pD.getTotalLength();
    var head = $('#hyHead'), timeEl = $('#hypnoTime');
    if (tall) { head.firstElementChild.setAttribute('r', 34); head.lastElementChild.setAttribute('r', 13); }

    function fmtClock(m) {
      var mins = 22 * 60 + Math.round(m), hh = Math.floor(mins / 60) % 24, mm = mins % 60;
      var ap = hh >= 12 ? 'PM' : 'AM', h12 = hh % 12 || 12;
      return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
    }
    hyp.set = function (p) {
      p = clamp(p, 0, 1);
      pT.style.strokeDasharray = LT; pT.style.strokeDashoffset = LT * (1 - p);
      pD.style.strokeDasharray = LD; pD.style.strokeDashoffset = LD * (1 - p);
      pG.style.strokeDasharray = LD; pG.style.strokeDashoffset = LD * (1 - p);
      var pt = pD.getPointAtLength(LD * p);
      head.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
      head.style.opacity = p > 0.003 ? 1 : 0;
      var m = ((pt.x - X0) / (X1 - X0)) * TOT;
      timeEl.textContent = fmtClock(m) + ' · ' + NAMES[stageAt(drift, m)];
    };
    hyp.ready = true;
    hyp.set(animate ? 0 : 1);
  }
  safe(buildHypnogram);

  /* ------------------------------------------------------------
     Plans: billing toggle
     ------------------------------------------------------------ */
  safe(function () {
    var btns = $$('.bill-btn'), pill = $('#billingPill'), amts = $$('.amt'), notes = $$('.bill-note[data-note-m]');
    var mode = 'monthly';
    function placePill() {
      var on = $('.bill-btn.is-on'); if (!on || getComputedStyle(pill).display === 'none') return;
      pill.style.width = on.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (on.offsetLeft - 5) + 'px)';
    }
    function tweenAmt(el, to) {
      var from = parseFloat(el.textContent) || 0, t0 = performance.now(), dur = reduced ? 1 : 750;
      (function step(now) {
        var p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = lerp(from, to, e).toFixed(2);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    function set(m) {
      mode = m;
      btns.forEach(function (b) { var on = b.getAttribute('data-bill') === m; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      placePill();
      amts.forEach(function (a) { tweenAmt(a, parseFloat(a.getAttribute(m === 'yearly' ? 'data-y' : 'data-m'))); });
      notes.forEach(function (n) { n.textContent = n.getAttribute(m === 'yearly' ? 'data-note-y' : 'data-note-m'); });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-bill')); }); });
    placePill(); window.addEventListener('resize', placePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);
  });

  /* ------------------------------------------------------------
     Testimonials: clone to cover wide screens
     ------------------------------------------------------------ */
  var rows = $$('.row-track');
  function dist(track) { return Math.min(track.scrollWidth * 0.2, 560); }
  safe(function () {
    rows.forEach(function (track) {
      var originals = $$('.quote', track);
      if (track.scrollWidth < window.innerWidth + 640) {
        originals.forEach(function (q) { var c = q.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
      }
    });
  });

  /* ------------------------------------------------------------
     Scroll choreography (GSAP)
     ------------------------------------------------------------ */
  /* ------------------------------------------------------------
     Night clock + star fade (plain scroll listener: works in every mode)
     ------------------------------------------------------------ */
  safe(function () {
    var ncTime = $('#ncTime'), ncLabel = $('#ncLabel'), ncBar = $('#ncBar'), nc = $('#nightclock');
    var phases = [[0.0, 'Winding down'], [0.1, 'Falling asleep'], [0.3, 'Deep sleep'], [0.55, 'REM'], [0.75, 'Light sleep'], [0.9, 'First light']];
    var START = 21 * 60 + 41, SPAN = 9 * 60 + 4, lastLabel = '', lastTime = '';
    function update() {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var p = clamp((window.scrollY || 0) / max, 0, 1);
      var mins = Math.round(START + p * SPAN), hh = Math.floor(mins / 60) % 24, mm = mins % 60;
      var t = ((hh % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (hh >= 12 ? 'PM' : 'AM');
      if (t !== lastTime) { lastTime = t; ncTime.textContent = t; }
      var label = phases[0][1]; phases.forEach(function (ph) { if (p >= ph[0]) label = ph[1]; });
      if (label !== lastLabel) { lastLabel = label; ncLabel.textContent = label; }
      nc.classList.toggle('day', p > 0.9);
      ncBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      D.state.starFade = 1 - clamp((p - 0.82) / 0.14, 0, 1) * 0.92;
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  if (!animate) {
    // no scroll choreography: show the settled "dawn" sky behaviour via simple state
    safe(function () { if (hyp.ready) hyp.set(1); });
    // static sky: follow the section in view without tweening
    safe(function () {
      var sky = $('#sky');
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var p = e.target.getAttribute('data-sky').split('|');
          sky.style.setProperty('--sky-top', p[0]); sky.style.setProperty('--sky-bot', p[1]); sky.style.setProperty('--glow', p[2] || 'rgba(255,140,120,.3)');
        });
      }, { rootMargin: '-50% 0px -50% 0px' });
      $$('[data-sky]').forEach(function (sec) { io.observe(sec); });
    });
    return;
  }

  safe(function () {
    // Sky colour per section
    var sky = $('#sky');
    $$('[data-sky]').forEach(function (sec) {
      var parts = sec.getAttribute('data-sky').split('|');
      ScrollTrigger.create({
        trigger: sec, start: 'top 58%', end: 'bottom 58%',
        onToggle: function (self) {
          if (self.isActive) gsap.to(sky, { '--sky-top': parts[0], '--sky-bot': parts[1], '--glow': parts[2] || 'rgba(255,140,120,.3)', duration: 1.6, ease: 'power2.out', overwrite: 'auto' });
        }
      });
    });

    // Nav active link
    $$('.nav-links a').forEach(function (a) {
      var sec = $(a.getAttribute('href')); if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: function (s) { a.classList.toggle('active', s.isActive); } });
    });

    // Hero parallax
    var heroEl = $('#top');
    gsap.to('.hero-text', { yPercent: -14, opacity: 0.12, ease: 'none', scrollTrigger: { trigger: heroEl, start: 'top top', end: '75% top', scrub: true } });
    gsap.to('#orbStage', { yPercent: 22, scale: 1.12, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true } });
    $$('[data-chip]').forEach(function (chip) {
      var depth = parseFloat(chip.getAttribute('data-depth')) || 0.5;
      gsap.to(chip, { y: -160 * depth, ease: 'none', scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true } });
    });
    gsap.to('.scroll-cue', { opacity: 0, ease: 'none', scrollTrigger: { trigger: heroEl, start: '8% top', end: '24% top', scrub: true } });

    // How it works: pin
    var pin = $('#howPin');
    howST = ScrollTrigger.create({
      trigger: pin, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 2.4); },
      pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 10,
      onUpdate: function (self) {
        var p = self.progress;
        setStep(clamp(Math.floor(p * 3), 0, 2));
        howBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        phone.style.setProperty('--ry', lerp(-10, 10, p).toFixed(2) + 'deg');
        phone.style.setProperty('--rx', lerp(5, -2, Math.sin(p * Math.PI)).toFixed(2) + 'deg');
      }
    });
    // Phone scale for narrow viewports (keeps CSS --ps as set in media query)

    // Hypnogram scrub
    if (hyp.ready) {
      ScrollTrigger.create({
        trigger: '#hypno', start: 'top 72%', end: 'bottom 38%', scrub: 0.6,
        onUpdate: function (self) { hyp.set(self.progress); }
      });
    }

    // Testimonial rows
    rows.forEach(function (track, i) {
      var d = function () { return dist(track); };
      gsap.fromTo(track, { x: function () { return i === 0 ? 0 : -d(); } }, {
        x: function () { return i === 0 ? -d() : 0; }, ease: 'none',
        scrollTrigger: { trigger: '#rows', start: 'top bottom', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true }
      });
    });

    // Download: the sun rises
    gsap.fromTo('.dawn-sun', { yPercent: 30 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '#download', start: 'top 70%', end: 'bottom bottom', scrub: true } });
    gsap.fromTo('.foot-word span', { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Recompute once fonts/layout settle
    var refresh = function () { ScrollTrigger.refresh(); };
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  });
})();
