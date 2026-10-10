/* Atelier Norr — motion layer.
   Vanilla JS, no dependencies. Content is fully readable without it; this file adds
   the intro, scroll choreography, pinned gallery, process drawing, dialog and form. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    sget: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  try { init(); } catch (err) {
    if (window.console) console.error('[norr] motion layer failed, showing static page', err);
    clearTimeout(window.__norrFailsafe);
    root.classList.remove('is-loading');
    root.classList.add('no-anim');
  }

  function init() {
    /* ------------------------------------------------------------------
       Motion preference (OS setting + visible toggle)
       ------------------------------------------------------------------ */
    var osQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var saved = store.get('norr-motion');
    var reduced = saved ? saved === 'off' : osQuery.matches;
    var toggleBtn = $('.motion-toggle');

    function applyMotion() {
      root.setAttribute('data-motion', reduced ? 'reduced' : 'full');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-pressed', reduced ? 'true' : 'false');
        $('.motion-toggle__txt', toggleBtn).textContent = reduced ? 'Motion off' : 'Motion on';
      }
      setupCursor();
    }
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        reduced = !reduced;
        store.set('norr-motion', reduced ? 'off' : 'on');
        applyMotion();
        measure();
      });
    }
    if (osQuery.addEventListener) {
      osQuery.addEventListener('change', function (e) {
        if (!store.get('norr-motion')) { reduced = e.matches; applyMotion(); measure(); }
      });
    }

    /* ------------------------------------------------------------------
       One-time DOM preparation
       ------------------------------------------------------------------ */
    // stroke-draw elements need normalised path length
    $$('svg').forEach(function (svg) {
      $$('.draw', svg).forEach(function (el, i) { el.setAttribute('pathLength', '1'); el.style.setProperty('--i', i % 28); });
    });
    $$('.pd').forEach(function (el) {
      el.setAttribute('pathLength', '1');
      if (el.dataset.t) el.style.setProperty('--t', el.dataset.t);
      if (el.closest('.drawing')) { el.style.strokeDasharray = '1 1'; el.style.strokeDashoffset = '1'; }
    });

    // hero line / fade indices
    $$('[data-hero="line"]').forEach(function (el, i) { el.style.setProperty('--hi', i); });
    $$('[data-hero="fade"]').forEach(function (el, i) { el.style.setProperty('--hi', i); });

    // split text into masked words
    function splitNode(node, state, mode) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            if (mode === 'scrub') {
              var s = document.createElement('span'); s.className = 'sw'; s.textContent = part; frag.appendChild(s); state.words.push(s);
            } else {
              var w = document.createElement('span'); w.className = 'w';
              var i = document.createElement('span'); i.className = 'wi'; i.textContent = part; i.style.setProperty('--wi', state.i++);
              w.appendChild(i); frag.appendChild(w);
            }
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) { splitNode(ch, state, mode); }
      });
    }
    $$('[data-split]').forEach(function (el) { el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim()); splitNode(el, { i: 0 }, 'split'); });
    var statementEl = $('[data-scrub]');
    var scrubState = { words: [] };
    if (statementEl) splitNode(statementEl, scrubState, 'scrub');
    var words = scrubState.words;

    // counters start at zero until seen
    var counters = $$('[data-count]');
    counters.forEach(function (el) { el.setAttribute('data-final', el.textContent); if (!reduced) el.textContent = '0'; });

    /* ------------------------------------------------------------------
       Reveal observers
       ------------------------------------------------------------------ */
    var cards = $$('.card');
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        if (t.classList.contains('card')) {
          $('.card__art', t).classList.add('in');
          t.classList.add('in-view');
        } else {
          t.classList.add('in');
        }
        revealIO.unobserve(t);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    $$('[data-reveal]:not([data-reveal="clip"]), [data-split], .studio__rings, .principle, .carbon, .form').forEach(function (el) { revealIO.observe(el); });
    cards.forEach(function (c) { revealIO.observe(c); });
    // section-label rule lines
    $$('.section-label').forEach(function (el) { revealIO.observe(el); });

    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countIO.unobserve(e.target);
        countUp(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countIO.observe(el); });

    function countUp(el) {
      var final = el.getAttribute('data-final');
      var target = +el.dataset.count;
      if (reduced) { el.textContent = final; return; }
      var sep = !!el.dataset.sep;
      var t0 = performance.now(), dur = 2200;
      (function step(now) {
        var t = clamp((now - t0) / dur);
        var e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        var v = Math.round(target * e);
        el.textContent = sep ? v.toLocaleString('en-US') : String(v);
        if (t < 1) requestAnimationFrame(step); else el.textContent = final;
      })(t0);
    }

    /* ------------------------------------------------------------------
       Layout measurements (cached; scroll loop only reads numbers)
       ------------------------------------------------------------------ */
    var vw = innerWidth, vh = innerHeight;
    var S = { sections: [], stTop: 0, stH: 1, ringsTop: 0, grid: { top: 0, h: 1 }, steps: [], marqueeW: 1 };
    var work = $('.work'), workPin = $('.work__pin'), workTrack = $('.work__track');
    var W = { pinned: false, travel: 0, top: 0, x: 0, cards: [] };

    function abs(el) { return el.getBoundingClientRect().top + window.scrollY; }

    function layoutWork() {
      var wide = innerWidth >= 900 && innerHeight >= 520;
      var wantPinned = !reduced && wide;
      var wantScroller = reduced && wide;
      var wasPinned = W.pinned;
      work.classList.toggle('work--pinned', wantPinned);
      work.classList.toggle('work--scroller', wantScroller);
      W.pinned = wantPinned;
      if (!wantPinned) {
        workPin.style.height = '';
        workTrack.style.transform = '';
        cards.forEach(function (c) { var a = $('.card__art-in', c); if (a) a.style.transform = ''; });
        return;
      }
      // measured without clearing the pin height first, so the document never shrinks mid-measure
      W.travel = Math.max(0, workTrack.scrollWidth - innerWidth);
      var h = (W.travel + innerHeight) + 'px';
      if (workPin.style.height !== h) workPin.style.height = h;
      W.top = abs(workPin);
      W.cards = cards.map(function (c) {
        return { el: c, art: $('.card__art-in', c), left: c.offsetLeft, w: c.offsetWidth };
      });
      if (!wasPinned) W.x = 0;
    }

    function measure() {
      var keepY = window.scrollY;
      vw = innerWidth; vh = innerHeight;
      layoutWork();
      S.sections = $$('[data-section]').map(function (el) {
        return { id: el.dataset.section, theme: el.dataset.theme || 'light', top: abs(el), h: el.offsetHeight };
      });
      if (statementEl) { S.stTop = abs(statementEl); S.stH = statementEl.offsetHeight; }
      var rings = $('.studio__rings');
      if (rings) S.ringsTop = abs(rings.parentNode);
      var grid = $('.process__grid');
      if (grid) { S.grid.top = abs(grid); S.grid.h = grid.offsetHeight; }
      S.steps = $$('.step').map(function (el) { var r = el.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
      var row = $('.marquee__row');
      if (row) S.marqueeW = row.getBoundingClientRect().width || 1;
      S.marqueeTop = abs($('.marquee'));
      S.heroH = $('.hero').offsetHeight;
      if (Math.abs(window.scrollY - keepY) > 1) window.scrollTo({ top: keepY, behavior: 'instant' });
    }

    var resizeTimer, lastBodyH = 0;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 120); });
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        var h = document.body.scrollHeight;
        if (Math.abs(h - lastBodyH) > 2) { lastBodyH = h; clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 80); }
      }).observe(document.body);
    }
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    /* ------------------------------------------------------------------
       Header, menu, dots
       ------------------------------------------------------------------ */
    var header = $('.site-header');
    var menu = $('#menu'), menuBtn = $('.menu-toggle');
    var menuOpen = false;
    function setMenu(open) {
      menuOpen = open;
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { menu.removeAttribute('inert'); } else { menu.setAttribute('inert', ''); }
      root.classList.toggle('menu-open', open);
      header.setAttribute('data-theme', open ? 'dark' : currentTheme);
      header.classList.remove('is-hidden');
    }
    $$('.menu__nav a').forEach(function (a, i) { a.style.setProperty('--mi', i); a.addEventListener('click', function () { setMenu(false); }); });
    menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });

    var currentTheme = 'light', currentSection = '';
    var dotsEl = $('.dots'); var dotLinks = $$('.dots a'), navLinks = $$('.primary a');

    function updateSections(sy) {
      var probe = sy + 40, id = 'top', theme = 'light';
      var probe2 = sy + vh * 0.45, active = 'top', dTheme = 'light';
      for (var i = 0; i < S.sections.length; i++) {
        var s = S.sections[i];
        if (probe >= s.top) { theme = s.theme; }
        if (probe2 >= s.top) { active = s.id; dTheme = s.theme; }
      }
      if (theme !== currentTheme) { currentTheme = theme; if (!menuOpen) header.setAttribute('data-theme', theme); }
      if (dTheme !== dotsEl.getAttribute('data-theme')) dotsEl.setAttribute('data-theme', dTheme);
      if (active !== currentSection) {
        currentSection = active;
        dotLinks.forEach(function (a) { a.classList.toggle('is-active', a.dataset.dot === active); });
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.dataset.nav === active); });
      }
    }

    /* ------------------------------------------------------------------
       Cursor, magnetic buttons, card sheen
       ------------------------------------------------------------------ */
    var cur = { x: -100, y: -100, rx: -100, ry: -100, on: false };
    var curDot = $('.cursor__dot'), curRing = $('.cursor__ring'), curLabel = $('.cursor__label');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var cursorBound = false;
    function setupCursor() {
      var want = fine.matches && !reduced;
      cur.on = want;
      root.classList.toggle('has-cursor', want);
      if (!want || cursorBound) return;
      cursorBound = true;
      window.addEventListener('pointermove', function (e) { cur.x = e.clientX; cur.y = e.clientY; root.classList.remove('cursor-hidden'); }, { passive: true });
      document.addEventListener('pointerleave', function () { root.classList.add('cursor-hidden'); });
      document.addEventListener('pointerover', function (e) {
        var t = e.target.closest ? e.target.closest('[data-cursor], a, button, label, input, textarea') : null;
        root.classList.remove('cursor-view', 'cursor-link');
        if (!t) return;
        if (t.hasAttribute('data-cursor')) { curLabel.textContent = t.getAttribute('data-cursor'); root.classList.add('cursor-view'); }
        else { root.classList.add('cursor-link'); }
      });
    }

    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (!cur.on) return;
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.24) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.32) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    cards.forEach(function (c) {
      var inner = $('.card__art-in', c);
      c.addEventListener('pointermove', function (e) {
        var r = inner.getBoundingClientRect();
        inner.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        inner.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    var sheens = $$('.card__sheen');
    sheens.forEach(function (s) { s.parentNode.addEventListener('pointermove', function (e) { var r = s.getBoundingClientRect(); s.style.setProperty('--mx', (e.clientX - r.left) + 'px'); s.style.setProperty('--my', (e.clientY - r.top) + 'px'); }); });

    /* ------------------------------------------------------------------
       Hero mouse parallax
       ------------------------------------------------------------------ */
    var heroLayers = $$('.hero [data-depth]');
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', function (e) { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

    /* ------------------------------------------------------------------
       Scroll loop
       ------------------------------------------------------------------ */
    var heroScene = $('.hero__scene'), heroInner = $('.hero__inner'), heroMeta = $('.hero__meta');
    var progressBar = $('.progress span');
    var ringsEl = $('.studio__rings');
    var marqueeTrack = $('.marquee__track');
    var workNo = $('#workNo'), workBar = $('.work__progress'), lastWorkIdx = -1;
    var sy = window.scrollY, ly = sy, vel = 0, hideAcc = 0;
    var mx = 0, mdir = -1;
    var pr = { f: -1, svgSun: $('#pr-sun'), layers: [], steps: $$('.step'), stageNo: $('#stageNo'), stageName: $('#stageName'), idx: -1 };
    var stageNames = ['Listen', 'Read the site', 'Draft in timber', 'Prefabricate', 'Raise & tend'];
    $$('.drawing .layer').forEach(function (g) {
      pr.layers.push({
        g: g,
        n: +g.dataset.layer,
        pd: $$('.pd', g).map(function (e) { return { e: e, t: +(e.dataset.t || 0) }; }),
        pf: $$('.pf', g).map(function (e) { return { e: e, t: +(e.dataset.t || 0), slide: +(e.dataset.slide || 0) }; })
      });
    });

    function frame() {
      try { tick(); } catch (e) { if (!frame.warned && window.console) { frame.warned = true; console.error('[norr] frame error', e); } }
      requestAnimationFrame(frame);
    }

    function tick() {
      sy = window.scrollY;
      var dy = sy - ly; ly = sy;
      vel = lerp(vel, dy, 0.14);

      // cursor
      if (cur.on) {
        cur.rx = lerp(cur.rx, cur.x, 0.2); cur.ry = lerp(cur.ry, cur.y, 0.2);
        curDot.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0)';
        curRing.style.transform = 'translate3d(' + cur.rx.toFixed(1) + 'px,' + cur.ry.toFixed(1) + 'px,0)';
      }

      // progress bar
      var max = Math.max(1, document.documentElement.scrollHeight - vh);
      progressBar.style.setProperty('--p', clamp(sy / max).toFixed(4));

      // header hide/show
      header.classList.toggle('is-stuck', sy > 24);
      if (!menuOpen) {
        if (dy > 4 && sy > 160) header.classList.add('is-hidden');
        else if (dy < -4 || sy < 160) header.classList.remove('is-hidden');
      }
      updateSections(sy);

      // hero
      if (sy < vh * 1.3) {
        var hp = clamp(sy / vh);
        if (!reduced) {
          heroScene.style.transform = 'translate3d(0,' + (sy * 0.22).toFixed(1) + 'px,0) scale(' + (1 + hp * 0.04).toFixed(4) + ')';
          heroInner.style.transform = 'translate3d(0,' + (-sy * 0.14).toFixed(1) + 'px,0)';
          heroInner.style.opacity = (1 - clamp(hp * 1.5)).toFixed(3);
          heroMeta.style.opacity = (1 - clamp(hp * 2.5)).toFixed(3);
          mouse.x = lerp(mouse.x, mouse.tx, 0.05); mouse.y = lerp(mouse.y, mouse.ty, 0.05);
          for (var i = 0; i < heroLayers.length; i++) {
            var d = +heroLayers[i].dataset.depth;
            heroLayers[i].style.transform = 'translate(' + (-mouse.x * d * 26).toFixed(2) + 'px,' + (-mouse.y * d * 10).toFixed(2) + 'px)';
          }
        } else {
          heroScene.style.transform = ''; heroInner.style.transform = ''; heroInner.style.opacity = ''; heroMeta.style.opacity = '';
          heroLayers.forEach(function (l) { l.style.transform = ''; });
        }
      }

      // marquee
      if (sy + vh > S.marqueeTop - 100 && sy < S.marqueeTop + 400) {
        if (!reduced) {
          if (vel > 0.4) mdir = -1; else if (vel < -0.4) mdir = 1;
          mx += mdir * (0.7 + Math.min(18, Math.abs(vel)) * 0.55);
          if (mx <= -S.marqueeW) mx += S.marqueeW;
          if (mx > 0) mx -= S.marqueeW;
          marqueeTrack.style.transform = 'translate3d(' + mx.toFixed(2) + 'px,0,0)';
        } else { marqueeTrack.style.transform = ''; }
      }

      // statement scrub
      if (words.length) {
        if (reduced) {
          if (!statementEl._flat) { words.forEach(function (w) { w.style.setProperty('--o', 1); }); statementEl._flat = true; }
        } else {
          statementEl._flat = false;
          var from = vh * 0.88, to = vh * 0.32;
          var rel = (S.stTop - sy);
          var p = clamp((from - rel) / (from - to + S.stH));
          var n = words.length, head = p * (n + 5);
          for (var k = 0; k < n; k++) {
            var o = clamp((head - k) / 5);
            var prevO = words[k]._o;
            if (prevO === undefined || Math.abs(prevO - o) > 0.01) { words[k]._o = o; words[k].style.setProperty('--o', o.toFixed(3)); }
          }
        }
      }

      // growth rings
      if (ringsEl && !reduced && sy + vh > S.ringsTop && sy < S.ringsTop + 3000) {
        var rp = sy - S.ringsTop;
        ringsEl.style.transform = 'translate3d(0,' + (rp * -0.06).toFixed(1) + 'px,0) rotate(' + (rp * 0.018).toFixed(2) + 'deg)';
      }

      // pinned gallery
      if (W.pinned) {
        var wp = clamp((sy - W.top) / Math.max(1, W.travel));
        var target = wp * W.travel;
        W.x = lerp(W.x, target, 0.11);
        if (Math.abs(W.x - target) < 0.1) W.x = target;
        if (sy > W.top - vh && sy < W.top + W.travel + vh * 2) {
          workTrack.style.transform = 'translate3d(' + (-W.x).toFixed(2) + 'px,0,0)';
          var best = 0, bestD = 1e9;
          for (var c = 0; c < W.cards.length; c++) {
            var cd = W.cards[c];
            var center = cd.left + cd.w / 2 - W.x;
            var off = (center - vw / 2) / vw;
            cd.art.style.transform = 'translate3d(' + (-off * cd.w * 0.1).toFixed(1) + 'px,0,0)';
            var dd = Math.abs(center - vw * 0.45);
            if (dd < bestD) { bestD = dd; best = c; }
          }
          workBar.style.setProperty('--p', wp.toFixed(4));
          if (best !== lastWorkIdx) {
            lastWorkIdx = best;
            workNo.textContent = String(best + 1).padStart(2, '0');
            workNo.classList.remove('tick'); void workNo.offsetWidth; workNo.classList.add('tick');
          }
        }
      }

      // process drawing
      processFrame();
    }

    function processFrame() {
      var steps = S.steps;
      if (!steps.length) return;
      if (sy + vh < S.grid.top - vh * 0.2 || sy > S.grid.top + S.grid.h + vh * 0.2) return;
      var pos = sy + vh / 2, f;
      var spacing = steps.length > 1 ? steps[1] - steps[0] : vh;
      if (pos <= steps[0]) f = (pos - steps[0]) / spacing;
      else if (pos >= steps[steps.length - 1]) f = steps.length - 1 + (pos - steps[steps.length - 1]) / spacing;
      else {
        for (var i = 0; i < steps.length - 1; i++) {
          if (pos >= steps[i] && pos < steps[i + 1]) { f = i + (pos - steps[i]) / (steps[i + 1] - steps[i]); break; }
        }
      }
      if (reduced) f = Math.round(f);
      pr.f = reduced ? f : lerp(pr.f, f, 0.1);
      if (Math.abs(pr.f - f) < 0.002) pr.f = f;

      var idx = clamp(Math.round(f), 0, steps.length - 1);
      if (idx !== pr.idx) {
        pr.idx = idx;
        pr.steps.forEach(function (el, j) { el.classList.toggle('is-active', j === idx); });
        pr.stageNo.textContent = '0' + (idx + 1);
        pr.stageName.textContent = stageNames[idx];
      }

      pr.layers.forEach(function (L) {
        var s = clamp(pr.f - (L.n - 2));
        L.pd.forEach(function (o) {
          var local = clamp((s - o.t * 0.55) / 0.45);
          o.e.style.strokeDashoffset = (1 - local).toFixed(4);
        });
        L.pf.forEach(function (o) {
          var local = clamp((s - o.t * 0.7) / 0.3);
          o.e.style.opacity = local.toFixed(3);
          if (o.slide) o.e.style.transform = 'translateY(' + ((1 - local) * o.slide).toFixed(1) + 'px)';
        });
        if (L.n <= 2) L.g.style.opacity = (1 - 0.78 * clamp(pr.f - L.n)).toFixed(3);
      });
      // sun travels its arc across the five movements
      var t = clamp((pr.f + 1) / 5) * 0.92 + 0.04;
      var u = 1 - t;
      var sx = u * u * 70 + 2 * t * u * 330 + t * t * 590;
      var sy2 = u * u * 400 + 2 * t * u * -60 + t * t * 400;
      pr.svgSun.setAttribute('transform', 'translate(' + sx.toFixed(1) + ' ' + sy2.toFixed(1) + ')');
    }

    /* ------------------------------------------------------------------
       Project dialog
       ------------------------------------------------------------------ */
    var modal = $('#projectModal');
    var modalArt = $('#modalArt'), modalTitle = $('#modalTitle'), modalSub = $('#modalSub'), modalContent = $('#modalContent'), modalNo = $('#modalNo');
    var modalIdx = 0;
    var openerBtn = null;

    function uniqueSvg(svg, suffix) {
      var ids = $$('[id]', svg).map(function (n) { return n.id; });
      var html = svg.outerHTML;
      ids.forEach(function (id) {
        html = html.split('#' + id + ')').join('#' + id + suffix + ')')
          .split('"#' + id + '"').join('"#' + id + suffix + '"')
          .split('id="' + id + '"').join('id="' + id + suffix + '"');
      });
      var tmp = document.createElement('div'); tmp.innerHTML = html;
      var out = tmp.firstElementChild;
      out.setAttribute('aria-hidden', 'true');
      return out;
    }
    function fillModal(i) {
      var card = cards[i];
      modalIdx = i;
      modalNo.textContent = String(i + 1).padStart(2, '0');
      modalTitle.textContent = $('.card__open', card).textContent;
      modalSub.textContent = $$('.card__sub span', card).map(function (s) { return s.textContent; }).join('  ·  ');
      modalContent.innerHTML = $('.detail', card).innerHTML;
      var svg = uniqueSvg($('.card__art-in svg', card), '-m');
      modalArt.innerHTML = '';
      modalArt.appendChild(svg);
      $$('.shimmer, .twinkle, .glow, .flake', svg).forEach(function (n) { n.style.animationPlayState = reduced ? 'paused' : 'running'; });
    }
    function openModal(i, ev) {
      fillModal(i);
      root.classList.add('modal-open');
      modalArt.classList.remove('in');
      modal.showModal();
      modal.scrollTop = 0; $('.modal__body', modal).scrollTop = 0;
      requestAnimationFrame(function () { modalArt.classList.add('in'); });
      if (!reduced && modal.animate) {
        var x = ev && ev.clientX ? ev.clientX : innerWidth / 2, y = ev && ev.clientY ? ev.clientY : innerHeight / 2;
        var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
        modal.animate([{ clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)' }, { clipPath: 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)' }], { duration: 1050, easing: 'cubic-bezier(.72,0,.18,1)' });
      }
      $('.modal__close', modal).focus({ preventScroll: true });
    }
    function closeModal() {
      if (!modal.open) return;
      var done = function () { modal.close(); root.classList.remove('modal-open'); modalArt.classList.remove('in'); };
      if (reduced || !modal.animate) { done(); return; }
      modal.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(30px)' }], { duration: 480, easing: 'cubic-bezier(.7,0,.3,1)' }).finished.then(done, done);
    }
    function swapModal(dir) {
      var n = (modalIdx + dir + cards.length) % cards.length;
      modalContent.classList.add('is-swapping');
      wait(reduced ? 0 : 280).then(function () {
        fillModal(n);
        modalArt.classList.remove('in'); void modalArt.offsetWidth; modalArt.classList.add('in');
        modalContent.classList.remove('is-swapping');
        $('.modal__body', modal).scrollTop = 0;
      });
    }
    $$('.card__open').forEach(function (btn) {
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.addEventListener('click', function (e) { openerBtn = btn; openModal(+btn.dataset.open, e); });
    });
    $('.modal__close', modal).addEventListener('click', closeModal);
    $('#modalPrev').addEventListener('click', function () { swapModal(-1); });
    $('#modalNext').addEventListener('click', function () { swapModal(1); });
    modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
    modal.addEventListener('close', function () { root.classList.remove('modal-open'); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') swapModal(1);
      if (e.key === 'ArrowLeft') swapModal(-1);
    });

    /* ------------------------------------------------------------------
       Enquiry form
       ------------------------------------------------------------------ */
    var form = $('#enquiry');
    var rules = {
      'f-name': function (v) { return v.trim().length >= 2 ? '' : 'Please tell us your name.'; },
      'f-email': function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
      'f-msg': function (v) { return v.trim().length >= 10 ? '' : 'A few words about the place and the project will help us reply well.'; }
    };
    function validateField(id) {
      var input = document.getElementById(id), msg = rules[id](input.value);
      var wrap = input.parentNode;
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
      $('.form__done', form).removeAttribute('hidden');
      form.classList.add('is-done');
      window.location.href = href;
    });
    $('#formReset').addEventListener('click', function () { form.reset(); form.classList.remove('is-done'); $('#f-name').focus(); });

    /* ------------------------------------------------------------------
       Footer wordmark letters
       ------------------------------------------------------------------ */
    var fw = $('.footer__word');
    $$('span', fw).forEach(function (s, i) { s.style.setProperty('--li', i); });
    var fwIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fw.classList.add('in'); fwIO.disconnect(); } }); }, { threshold: 0.25 });
    fwIO.observe(fw);

    /* ------------------------------------------------------------------
       Intro sequence
       ------------------------------------------------------------------ */
    function runIntro() {
      var pre = $('.preloader'), num = $('#loadNum');
      if (reduced) {
        pre.classList.add('is-gone');
        root.classList.remove('is-loading');
        root.classList.add('hero-in');
        clearTimeout(window.__norrFailsafe);
        return;
      }
      var seen = store.sget('norr-seen') === '1';
      store.sset('norr-seen', '1');
      var dur = seen ? 650 : 2000;
      var fontsReady = Promise.race([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(), wait(1800)]);
      var t0 = performance.now();
      new Promise(function (resolve) {
        (function tick(now) {
          var t = clamp((now - t0) / dur);
          var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          num.textContent = String(Math.round(e * 100)).padStart(3, '0');
          pre.style.setProperty('--load', e.toFixed(3));
          if (t < 1) requestAnimationFrame(tick); else resolve();
        })(t0);
      }).then(function () { return fontsReady; }).then(function () {
        pre.classList.add('is-done');
        root.classList.remove('is-loading');
        return wait(420);
      }).then(function () {
        root.classList.add('hero-in');
        clearTimeout(window.__norrFailsafe);
        return wait(900);
      }).then(function () {
        pre.classList.add('is-gone');
        root.classList.remove('is-loading');
        measure();
      });
    }

    /* ------------------------------------------------------------------
       Go
       ------------------------------------------------------------------ */
    applyMotion();
    measure();
    setMenu(false);
    requestAnimationFrame(frame);
    runIntro();

    // anchor links: keep focus sensible after in-page jumps
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var id = a.getAttribute('href').slice(1);
        var t = id && document.getElementById(id);
        if (t && !t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      });
    });
  }
})();
