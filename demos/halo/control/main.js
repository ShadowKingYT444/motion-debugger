/* Halo One — launch page behaviour. No build step; Lenis (smooth scroll) is optional. */
(function () {
  'use strict';
  var root = document.documentElement;
  var MOTION = root.classList.contains('motion');

  try { init(); } catch (err) {
    // Never leave the page hidden if something goes wrong.
    console.error(err);
    root.classList.remove('motion');
    root.classList.add('no-motion', 'ready');
    var l = document.getElementById('loader'); if (l) l.style.display = 'none';
  }

  function init() {
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 4); };
    var easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

    function tween(from, to, ms, cb, ease, done) {
      if (!MOTION) { cb(to); if (done) done(); return; }
      var t0 = performance.now(), f = ease || easeOut;
      (function step(now) {
        var k = clamp((now - t0) / ms, 0, 1);
        cb(lerp(from, to, f(k)));
        if (k < 1) requestAnimationFrame(step); else if (done) done();
      })(t0);
    }

    /* ---------------------------------------------------------------
       Speaker artwork (SVG, original). Colours come from CSS variables
       so every instance re-tints when the finish changes.
    --------------------------------------------------------------- */
    var speakers = [];
    function speakerSVG(p) {
      var body = 'M90 80V500A120 28 0 0 0 330 500V80A120 28 0 0 1 90 80Z';
      var base = 'M90 466V500A120 28 0 0 0 330 500V466A120 28 0 0 1 90 466Z';
      return '' +
      '<svg class="spk" viewBox="0 0 420 580" role="img" aria-label="Halo One speaker">' +
      '<defs>' +
        '<linearGradient id="' + p + 'b" x1="0" x2="1"><stop offset="0" style="stop-color:var(--fc)"/><stop offset=".22" style="stop-color:var(--fb)"/><stop offset=".46" style="stop-color:var(--fa)"/><stop offset=".78" style="stop-color:var(--fb)"/><stop offset="1" style="stop-color:var(--fc)"/></linearGradient>' +
        '<linearGradient id="' + p + 's" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".2" stop-color="#000" stop-opacity=".05"/><stop offset=".42" stop-color="#fff" stop-opacity=".09"/><stop offset=".72" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient>' +
        '<linearGradient id="' + p + 'v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>' +
        '<radialGradient id="' + p + 't" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>' +
        '<pattern id="' + p + 'k" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0L2 4L4 0" stroke="rgba(0,0,0,.34)" fill="none" stroke-width=".9"/><path d="M0 2H4" stroke="rgba(255,255,255,.07)" stroke-width=".6"/></pattern>' +
        '<clipPath id="' + p + 'c"><path d="' + body + '"/></clipPath>' +
        '<filter id="' + p + 'f" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>' +
        '<filter id="' + p + 'g" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="2.5"/></filter>' +
      '</defs>' +
      '<ellipse class="floor-glow" cx="210" cy="512" rx="205" ry="32" fill="#ffb36b" opacity=".3" filter="url(#' + p + 'f)"/>' +
      '<ellipse cx="210" cy="508" rx="150" ry="20" fill="#000" opacity=".75" filter="url(#' + p + 'f)"/>' +
      /* ring, back half */
      '<g class="ring-back">' +
        '<path d="M30 330A180 44 0 0 1 390 330" fill="none" stroke="#ff9a4d" stroke-width="7" opacity=".38" filter="url(#' + p + 'f)"/>' +
        '<path d="M30 330A180 44 0 0 1 390 330" fill="none" stroke="#ffd9a8" stroke-width="1.4" opacity=".4"/>' +
        '<circle class="rl-b" r="4" cx="210" cy="286" fill="#fff" opacity="0"/>' +
        '<circle class="rl-b2" r="3" cx="210" cy="286" fill="#ffe2bd" opacity="0"/>' +
      '</g>' +
      /* body */
      '<g clip-path="url(#' + p + 'c)">' +
        '<rect x="80" y="40" width="260" height="500" fill="url(#' + p + 'b)"/>' +
        '<rect x="80" y="40" width="260" height="500" fill="url(#' + p + 'k)"/>' +
        '<rect x="80" y="40" width="260" height="500" fill="url(#' + p + 's)"/>' +
        '<rect x="80" y="40" width="260" height="500" fill="url(#' + p + 'v)"/>' +
        '<ellipse class="body-glow" cx="210" cy="372" rx="150" ry="46" fill="#ffa652" opacity=".34" filter="url(#' + p + 'f)"/>' +
      '</g>' +
      '<path d="' + base + '" style="fill:var(--fm)"/><path d="' + base + '" fill="url(#' + p + 's)"/>' +
      '<path d="M90 466A120 28 0 0 0 330 466" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>' +
      /* seam of light */
      '<path d="M90 330A120 28 0 0 0 330 330" fill="none" stroke="#ff9a4d" stroke-width="5" opacity=".7" filter="url(#' + p + 'g)"/>' +
      '<path class="seam" d="M90 330A120 28 0 0 0 330 330" fill="none" stroke="#ffe3bd" stroke-width="1.6"/>' +
      /* top crown */
      '<ellipse cx="210" cy="80" rx="120" ry="28" style="fill:var(--fm)"/>' +
      '<ellipse cx="210" cy="80" rx="120" ry="28" fill="url(#' + p + 't)"/>' +
      '<ellipse cx="210" cy="80" rx="120" ry="28" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<ellipse cx="210" cy="81" rx="98" ry="22" fill="rgba(0,0,0,.34)"/>' +
      '<ellipse class="crown-ring" cx="210" cy="81" rx="74" ry="16.5" fill="none" stroke="#ffd9a8" stroke-width="1.4"/>' +
      '<ellipse cx="210" cy="81" rx="5" ry="1.4" fill="#ffd9a8"/>' +
      /* ring, front half */
      '<g class="ring-front">' +
        '<path d="M30 330A180 44 0 0 0 390 330" fill="none" stroke="#ff9a4d" stroke-width="8" opacity=".55" filter="url(#' + p + 'f)"/>' +
        '<path d="M30 330A180 44 0 0 0 390 330" fill="none" stroke="#ffe3bd" stroke-width="1.8" opacity=".9"/>' +
        '<circle class="rl-f" r="4.5" cx="210" cy="374" fill="#fff" opacity="0"/>' +
        '<circle class="rl-f2" r="3.2" cx="210" cy="374" fill="#ffe2bd" opacity="0"/>' +
      '</g>' +
      '</svg>';
    }
    $$('[data-speaker]').forEach(function (el, i) {
      el.innerHTML = speakerSVG('sp' + i);
      var svg = el.firstChild;
      speakers.push({
        el: el, svg: svg, vis: true,
        lb: $('.rl-b', svg), lb2: $('.rl-b2', svg), lf: $('.rl-f', svg), lf2: $('.rl-f2', svg),
        glow: $('.floor-glow', svg), bglow: $('.body-glow', svg), crown: $('.crown-ring', svg)
      });
    });
    var ioSpk = new IntersectionObserver(function (es) {
      es.forEach(function (e) { speakers.forEach(function (s) { if (s.el === e.target) s.vis = e.isIntersecting; }); });
    });
    speakers.forEach(function (s) { ioSpk.observe(s.el); });

    function updateSpeakers(t) {
      speakers.forEach(function (s) {
        if (!s.vis) return;
        placeLight(s.lf, s.lb, t * 0.00062, 1);
        placeLight(s.lf2, s.lb2, t * 0.00062 + Math.PI, .7);
        var b = 0.5 + 0.5 * Math.sin(t * 0.0016);
        s.glow.setAttribute('opacity', (0.22 + 0.16 * b).toFixed(3));
        s.bglow.setAttribute('opacity', (0.26 + 0.14 * b).toFixed(3));
        s.crown.setAttribute('stroke-opacity', (0.65 + 0.35 * b).toFixed(3));
      });
    }
    function placeLight(front, back, a, k) {
      var x = 210 + 180 * Math.cos(a), y = 330 + 44 * Math.sin(a), isFront = Math.sin(a) > 0;
      var depth = 0.55 + 0.45 * Math.abs(Math.sin(a));
      var el = isFront ? front : back, off = isFront ? back : front;
      el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', y.toFixed(1));
      el.setAttribute('opacity', (k * (isFront ? 0.95 : 0.5 * depth + .1)).toFixed(2));
      off.setAttribute('opacity', '0');
    }
    if (!MOTION) updateSpeakers(Math.PI / 0.00062 * 0.38);

    /* ---------------------------------------------------------------
       Finish selection (shared across the page)
    --------------------------------------------------------------- */
    var FINISH = {
      chalk:    { fa: '#ece6d9', fb: '#d2cabb', fc: '#8b8477', fm: '#dcd8d0', name: 'Chalk',    note: 'bleached oat' },
      dune:     { fa: '#c9ab87', fb: '#a98c69', fc: '#5d4a35', fm: '#cdb596', name: 'Dune',     note: 'warm sand' },
      graphite: { fa: '#58554f', fb: '#363431', fc: '#121110', fm: '#6e6b68', name: 'Graphite', note: 'soft charcoal' }
    };
    var curFinish = 'dune', curCols = { fa: '', fb: '', fc: '', fm: '' }, finishAnim = 0;
    var hex2rgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
    ['fa', 'fb', 'fc', 'fm'].forEach(function (k) { curCols[k] = hex2rgb(FINISH.dune[k]); });
    function setFinish(key) {
      if (!FINISH[key]) return;
      var from = {}, to = FINISH[key];
      Object.keys(curCols).forEach(function (k) { from[k] = curCols[k].slice(); });
      var id = ++finishAnim;
      tween(0, 1, 800, function (t) {
        if (id !== finishAnim) return;
        ['fa', 'fb', 'fc', 'fm'].forEach(function (k) {
          var tr = hex2rgb(to[k]);
          curCols[k] = from[k].map(function (v, i) { return v + (tr[i] - v) * t; });
          root.style.setProperty('--' + k, 'rgb(' + curCols[k].map(Math.round).join(',') + ')');
        });
      }, easeIO);
      curFinish = key;
      $$('[data-finish]').forEach(function (b) {
        var on = b.getAttribute('data-finish') === key;
        b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
      });
      $('#finishName').textContent = to.name; $('#finishNote').textContent = to.note;
    }
    $$('[data-finish]').forEach(function (b) {
      b.addEventListener('click', function () { setFinish(b.getAttribute('data-finish')); });
    });
    $$('.swatches').forEach(function (g) {
      g.addEventListener('keydown', function (e) {
        var keys = Object.keys(FINISH), i = keys.indexOf(curFinish);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { setFinish(keys[(i + 1) % 3]); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { setFinish(keys[(i + 2) % 3]); }
        else return;
        e.preventDefault();
        var nb = $('[data-finish="' + curFinish + '"]', g); if (nb) nb.focus();
      });
    });

    /* ---------------------------------------------------------------
       Text splitting: hero wordmark + scroll-lit statement
    --------------------------------------------------------------- */
    var heroWord = $('#heroWord');
    heroWord.innerHTML = 'Halo'.split('').map(function (c, i) { return (i === 2 ? '<span class="gap" aria-hidden="true"></span>' : '') + '<span class="c" style="--i:' + i + '" aria-hidden="true">' + c + '</span>'; }).join('');
    var stmt = $('#stmt'), stmtText = stmt.textContent.trim();
    stmt.setAttribute('aria-label', stmtText);
    var words = stmtText.split(/\s+/);
    stmt.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + ' </span>'; }).join('');
    var stmtWords = $$('.w', stmt);

    /* ---------------------------------------------------------------
       Reveals, counters
    --------------------------------------------------------------- */
    $$('[data-reveal]').forEach(function (el) { el.style.setProperty('--rd', el.getAttribute('data-delay') || 0); });
    if (MOTION) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
      $$('[data-reveal]').forEach(function (el) { io.observe(el); });

      var ioCount = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          ioCount.unobserve(e.target);
          var el = e.target, to = parseFloat(el.getAttribute('data-count')), dec = +el.getAttribute('data-dec') || 0;
          tween(0, to, 2000, function (v) { el.textContent = v.toFixed(dec); });
        });
      }, { threshold: 0.6 });
      $$('[data-count]').forEach(function (el) { el.textContent = (0).toFixed(+el.getAttribute('data-dec') || 0); ioCount.observe(el); });
    }

    /* ---------------------------------------------------------------
       Exploded view
    --------------------------------------------------------------- */
    var LAYERS = [
      { key: 'cap',  y: 250, h: 26,  off: -190 },
      { key: 'knit', y: 276, h: 120, off: -95 },
      { key: 'drv',  y: 396, h: 76,  off: 0 },
      { key: 'woof', y: 472, h: 100, off: 95 },
      { key: 'base', y: 572, h: 36,  off: 190 }
    ];
    var CX = 300, RX = 130, RY = 30;
    function discPath(y, h) {
      var yb = y + h;
      return 'M' + (CX - RX) + ' ' + y + 'V' + yb + 'A' + RX + ' ' + RY + ' 0 0 0 ' + (CX + RX) + ' ' + yb + 'V' + y + 'A' + RX + ' ' + RY + ' 0 0 1 ' + (CX - RX) + ' ' + y + 'Z';
    }
    function frontPt(deg, y) { var a = deg * Math.PI / 180; return { x: CX + RX * Math.sin(a), y: y + RY * Math.cos(a), c: Math.cos(a) }; }
    function layerMarkup(o) {
      var s = discPath(o.y, o.h), m = '', top = '';
      var shade = '<path d="' + s + '" fill="url(#xs)"/>';
      if (o.key === 'cap') {
        m = '<path d="' + s + '" style="fill:var(--fm)"/>' + shade;
        top = '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="' + RX + '" ry="' + RY + '" style="fill:var(--fm)"/>' +
          '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="' + RX + '" ry="' + RY + '" fill="url(#xt)"/>' +
          '<ellipse cx="' + CX + '" cy="' + (o.y + 1) + '" rx="106" ry="24" fill="rgba(0,0,0,.34)"/>' +
          '<ellipse cx="' + CX + '" cy="' + (o.y + 1) + '" rx="80" ry="18" fill="none" stroke="#ffd9a8" stroke-width="1.6"/>' +
          '<ellipse cx="' + CX + '" cy="' + (o.y + 1) + '" rx="6" ry="1.6" fill="#ffd9a8"/>';
      } else if (o.key === 'knit') {
        m = '<path d="' + s + '" fill="url(#xb)"/><path d="' + s + '" fill="url(#xk)"/>' + shade;
        top = '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="' + RX + '" ry="' + RY + '" fill="url(#xb)"/>' +
          '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="' + RX + '" ry="' + RY + '" fill="url(#xk)"/>' +
          '<ellipse cx="' + CX + '" cy="' + (o.y + 2) + '" rx="116" ry="26" fill="rgba(0,0,0,.55)"/>';
      } else if (o.key === 'drv') {
        m = '<path d="' + s + '" fill="#26231f"/>' + shade;
        top = '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="' + RX + '" ry="' + RY + '" fill="#1a1816"/>' +
          '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="116" ry="26" fill="#0d0c0b"/>';
        [-72, -43, -14, 14, 43, 72].forEach(function (d) {
          var p = frontPt(d, o.y + 22), rx = 3 + 8 * p.c;
          m += '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="10" fill="#070605" stroke="#8a8378" stroke-width="1"/>' +
               '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + (rx * .5).toFixed(1) + '" ry="5" fill="#c9b99c" opacity=".85"/>';
        });
        [-58, -20, 20, 58].forEach(function (d) {
          var p = frontPt(d, o.y + 54), rx = 4 + 12 * p.c;
          m += '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="14" fill="#090807" stroke="#8a8378" stroke-width="1"/>' +
               '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + (rx * .55).toFixed(1) + '" ry="7.5" fill="none" stroke="#5b564e"/>' +
               '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + (rx * .2).toFixed(1) + '" ry="3" fill="#8a8378"/>';
        });
      } else if (o.key === 'woof') {
        m = '<path d="' + s + '" fill="#1f1c19"/>' + shade;
        top = '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="' + RX + '" ry="' + RY + '" fill="#171412"/>' +
          '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="110" ry="24.5" fill="#0b0a09" stroke="#3a3631"/>' +
          '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="78" ry="17" fill="#15120f" stroke="#2d2a26"/>' +
          '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="44" ry="9.5" fill="#0b0a09" stroke="#3a3631"/>' +
          '<ellipse cx="' + CX + '" cy="' + (o.y - 1) + '" rx="20" ry="4.2" style="fill:var(--fm)"/>';
        [-34, 34].forEach(function (d) {
          var p = frontPt(d, o.y + 50), rx = 4 + 24 * p.c;
          m += '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="36" fill="#0b0a09" stroke="#8a8378" stroke-width="1.2"/>' +
               '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + (rx * .62).toFixed(1) + '" ry="22" fill="none" stroke="#4a463f"/>';
        });
      } else {
        m = '<path d="' + s + '" style="fill:var(--fm)"/>' + shade;
        top = '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="' + RX + '" ry="' + RY + '" fill="#1a1715"/>' +
          '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="112" ry="25" fill="url(#xc)"/>';
        for (var i = 0; i < 24; i++) {
          var a = i / 24 * Math.PI * 2;
          top += '<line x1="' + (CX + 14 * Math.cos(a)).toFixed(1) + '" y1="' + (o.y + 3 * Math.sin(a)).toFixed(1) + '" x2="' + (CX + 110 * Math.cos(a)).toFixed(1) + '" y2="' + (o.y + 24.5 * Math.sin(a)).toFixed(1) + '" stroke="rgba(255,255,255,.07)"/>';
        }
        top += '<ellipse cx="' + CX + '" cy="' + o.y + '" rx="14" ry="3.2" style="fill:var(--fm)"/>';
        m += '<ellipse class="xglow" cx="' + CX + '" cy="' + (o.y + o.h + 6) + '" rx="150" ry="34" fill="none" stroke="#ff9a4d" stroke-width="8" filter="url(#xf)" opacity="0"/>' +
             '<path d="M' + (CX - RX) + ' ' + (o.y + o.h - 2) + 'A' + RX + ' ' + RY + ' 0 0 0 ' + (CX + RX) + ' ' + (o.y + o.h - 2) + '" fill="none" stroke="#ffe3bd" stroke-width="1.6" opacity=".9"/>';
      }
      return m + top;
    }
    var exSvg = $('#explode');
    exSvg.innerHTML =
      '<defs>' +
        '<linearGradient id="xb" x1="0" x2="1"><stop offset="0" style="stop-color:var(--fc)"/><stop offset=".22" style="stop-color:var(--fb)"/><stop offset=".46" style="stop-color:var(--fa)"/><stop offset=".78" style="stop-color:var(--fb)"/><stop offset="1" style="stop-color:var(--fc)"/></linearGradient>' +
        '<linearGradient id="xs" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".2" stop-color="#000" stop-opacity=".05"/><stop offset=".42" stop-color="#fff" stop-opacity=".09"/><stop offset=".72" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient>' +
        '<radialGradient id="xt" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>' +
        '<radialGradient id="xc" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3a342d"/><stop offset="1" stop-color="#0d0b0a"/></radialGradient>' +
        '<pattern id="xk" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0L2 4L4 0" stroke="rgba(0,0,0,.34)" fill="none" stroke-width=".9"/><path d="M0 2H4" stroke="rgba(255,255,255,.07)" stroke-width=".6"/></pattern>' +
        '<filter id="xf" x="-30%" y="-150%" width="160%" height="400%"><feGaussianBlur stdDeviation="9"/></filter>' +
      '</defs>' +
      '<line id="xAxis" x1="300" y1="20" x2="300" y2="845" stroke="#ffb36b" stroke-opacity=".35" stroke-dasharray="3 7" opacity="0"/>' +
      '<ellipse id="xShadow" cx="300" cy="846" rx="150" ry="9" fill="#ffb36b" opacity="0" filter="url(#xf)"/>' +
      LAYERS.slice().reverse().map(function (o) {
        var idx = LAYERS.indexOf(o);
        return '<g class="xl" data-i="' + idx + '">' + layerMarkup(o) + '</g>';
      }).join('');
    var xl = LAYERS.map(function (o, i) { return $('.xl[data-i="' + i + '"]', exSvg); });
    var xGlow = $('.xglow', exSvg), xAxis = $('#xAxis'), xShadow = $('#xShadow');

    var steps = $$('#steps li'), stepMeter = $('#stepMeter'), stepCount = $('#stepCount');
    var objEl = $('#object'), activeStep = -1;
    var EXP_END = 0.2;

    function setStep(i) {
      if (i === activeStep) return;
      activeStep = i;
      steps.forEach(function (li, k) { li.classList.toggle('on', k === i); });
      stepCount.textContent = '0' + (i + 1);
    }
    function renderObject(p) {
      var e = easeIO(clamp(p / EXP_END, 0, 1));
      var sp = clamp((p - EXP_END) / (1 - EXP_END), 0, 0.9999);
      var idx = p < EXP_END ? 0 : Math.floor(sp * 5);
      var focus = p >= EXP_END * 0.85;
      LAYERS.forEach(function (o, i) {
        xl[i].setAttribute('transform', 'translate(0 ' + (o.off * e).toFixed(2) + ')');
        var hot = focus && i === idx;
        xl[i].classList.toggle('hot', hot);
        xl[i].style.opacity = focus ? (hot ? 1 : 0.32) : 1;
      });
      xGlow.setAttribute('opacity', (e * (idx === 4 && focus ? 0.9 : 0.45)).toFixed(2));
      xAxis.setAttribute('opacity', (e * 0.7).toFixed(2));
      xShadow.setAttribute('opacity', (e * 0.35).toFixed(2));
      stepMeter.style.transform = 'scaleX(' + clamp(p, 0, 1).toFixed(4) + ')';
      setStep(idx);
    }
    if (!MOTION) {
      LAYERS.forEach(function (o, i) { xl[i].setAttribute('transform', 'translate(0 ' + o.off + ')'); });
      xGlow.setAttribute('opacity', '.6'); xAxis.setAttribute('opacity', '.6');
      steps.forEach(function (li) { li.classList.add('on'); });
    }
    steps.forEach(function (li, k) {
      $('.step-h', li).addEventListener('click', function () {
        if (!MOTION) return;
        var top = objEl.getBoundingClientRect().top + window.scrollY, total = objEl.offsetHeight - window.innerHeight;
        var p = EXP_END + (k + 0.5) / 5 * (1 - EXP_END);
        scrollToY(top + total * p);
      });
    });

    /* ---------------------------------------------------------------
       Smooth scroll (Lenis, optional) + anchor handling
    --------------------------------------------------------------- */
    var lenis = null;
    function scrollToY(y) {
      if (lenis) lenis.scrollTo(y, { duration: 1.6 });
      else window.scrollTo({ top: y, behavior: MOTION ? 'smooth' : 'auto' });
    }
    function boot() {
      if (MOTION && window.Lenis) {
        try {
          lenis = new window.Lenis({ duration: 1.2, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
        } catch (e) { lenis = null; }
      }
    }
    if (window.Lenis) boot(); else window.addEventListener('load', boot);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = $(id); if (!t) return;
        e.preventDefault();
        var y = id === '#top' ? 0 : t.getBoundingClientRect().top + window.scrollY - (id === '#object' ? 0 : 20);
        scrollToY(y);
        try { history.replaceState(null, '', id); } catch (er) {}
      });
    });

    /* ---------------------------------------------------------------
       Hero canvas — ripples travelling across the floor
    --------------------------------------------------------------- */
    var hero = $('#top'), hc = $('#heroCanvas'), hx = hc.getContext('2d');
    var heroSpk = $('#heroSpk'), heroStage = $('#heroStage');
    var hw = 0, hh = 0, hdpr = 1, heroVis = true;
    function sizeHero() {
      hdpr = Math.min(window.devicePixelRatio || 1, 2);
      hw = hero.clientWidth; hh = hero.clientHeight;
      hc.width = hw * hdpr; hc.height = hh * hdpr;
      hx.setTransform(hdpr, 0, 0, hdpr, 0, 0);
    }
    sizeHero();
    new IntersectionObserver(function (es) { heroVis = es[0].isIntersecting; }).observe(hero);
    function drawHero(t) {
      hx.clearRect(0, 0, hw, hh);
      var cx = heroSpk.offsetLeft + heroSpk.offsetWidth / 2;
      var cy = heroSpk.offsetTop + heroSpk.offsetHeight * (506 / 580);
      var maxR = Math.max(hw * 0.72, 500), N = 7;
      var g = hx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.5);
      g.addColorStop(0, 'rgba(255,150,70,.20)'); g.addColorStop(1, 'rgba(255,150,70,0)');
      hx.fillStyle = g; hx.save(); hx.translate(cx, cy); hx.scale(1, 0.26); hx.translate(-cx, -cy);
      hx.beginPath(); hx.arc(cx, cy, maxR * 0.5, 0, 7); hx.fill(); hx.restore();
      for (var k = 0; k < N; k++) {
        var ph = ((t / 7200) + k / N) % 1, r = easeOut(ph) * maxR;
        var a = Math.pow(1 - ph, 1.7) * 0.5;
        hx.strokeStyle = 'rgba(255,190,120,' + a.toFixed(3) + ')';
        hx.lineWidth = 1.2;
        hx.beginPath(); hx.ellipse(cx, cy, r, r * 0.26, 0, 0, 6.2832); hx.stroke();
      }
      // faint dust
      for (var d = 0; d < 26; d++) {
        var sd = d * 97.13, px = (Math.sin(sd) * 0.5 + 0.5) * hw, py = ((Math.cos(sd * 1.7) * 0.5 + 0.5) * hh * 0.8 - t * 0.004 * (0.4 + (d % 5) * 0.2)) % (hh * 0.8);
        if (py < 0) py += hh * 0.8;
        hx.fillStyle = 'rgba(255,220,180,' + (0.12 + 0.12 * Math.sin(t * 0.001 + d)).toFixed(3) + ')';
        hx.fillRect(px, py, 1.5, 1.5);
      }
    }
    window.addEventListener('resize', function () { sizeHero(); sizeField(); if (!MOTION) { drawHero(1800); drawField(1500); } });
    if (!MOTION) drawHero(1800);

    // pointer tilt
    var tiltT = { x: 0, y: 0 }, tiltC = { x: 0, y: 0 };
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tiltT.x = (e.clientX - r.left) / r.width - 0.5; tiltT.y = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener('pointerleave', function () { tiltT.x = 0; tiltT.y = 0; });

    /* ---------------------------------------------------------------
       Sound-field canvas
    --------------------------------------------------------------- */
    var fc = $('#fieldCanvas'), fx = fc.getContext('2d');
    var fw = 0, fh = 0, fdpr = 1, fieldVis = false, modeCur = 1, modeTgt = 1;
    var you = { x: 0.72, y: 0.64 };
    var LIS = [[.66, .17], [.86, .4], [.88, .8], [.6, .86], [.38, .86], [.16, .76], [.14, .22], [.4, .12]];
    var spkPos = { x: 0.38, y: 0.5 };
    var readYou = $('#readYou'), readSpread = $('#readSpread');
    function sizeField() {
      fdpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = fc.getBoundingClientRect(); fw = r.width; fh = r.height;
      fc.width = Math.round(fw * fdpr); fc.height = Math.round(fh * fdpr);
      fx.setTransform(fdpr, 0, 0, fdpr, 0, 0);
    }
    function intensity(th, m) {
      var c = Math.max(0, Math.cos(th));
      var conv = 0.05 + 0.95 * Math.pow(c, 2.4);
      var halo = 1 + 0.07 * Math.sin(5 * th + 1.2);
      return conv * (1 - m) + halo * m;
    }
    function levelAt(px, py, m) {
      var dx = px * fw - spkPos.x * fw, dy = py * fh - spkPos.y * fh;
      var d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      var dn = Math.max(d / (fw * 0.28), 0.5);
      var att = 6 * Math.log2(dn / 0.5) * (0.4 - 0.31 * m);
      return 20 * Math.log10(intensity(th, m)) - att;
    }
    function drawField(t) {
      if (!fw) return;
      var m = modeCur;
      fx.clearRect(0, 0, fw, fh);
      var sx = spkPos.x * fw, sy = spkPos.y * fh;
      // room floor
      fx.strokeStyle = 'rgba(241,236,226,.07)'; fx.lineWidth = 1;
      for (var gx = (sx % 40); gx < fw; gx += 40) { fx.beginPath(); fx.moveTo(gx, 0); fx.lineTo(gx, fh); fx.stroke(); }
      for (var gy = (sy % 40); gy < fh; gy += 40) { fx.beginPath(); fx.moveTo(0, gy); fx.lineTo(fw, gy); fx.stroke(); }
      // waves
      var maxR = Math.hypot(fw, fh) * 0.62, gap = Math.min(fw, 900) * 0.085, n = Math.ceil(maxR / gap) + 1, speed = fw * 0.16, SEG = 96;
      for (var k = 0; k < n; k++) {
        var r = ((t / 1000) * speed + k * gap) % (n * gap);
        if (r > maxR) continue;
        var fade = Math.pow(1 - r / maxR, 1.3);
        for (var s = 0; s < SEG; s++) {
          var a0 = s / SEG * Math.PI * 2, a1 = (s + 1.05) / SEG * Math.PI * 2, I = intensity((a0 + a1) / 2, m);
          var al = Math.min(1, I) * fade * 0.8;
          if (al < 0.012) continue;
          fx.strokeStyle = 'rgba(255,' + Math.round(150 + 60 * I) + ',' + Math.round(80 + 70 * I) + ',' + al.toFixed(3) + ')';
          fx.lineWidth = 1 + 1.8 * Math.min(1, I);
          fx.beginPath(); fx.arc(sx, sy, r, a0, a1); fx.stroke();
        }
      }
      // speaker
      var gl = fx.createRadialGradient(sx, sy, 0, sx, sy, 60);
      gl.addColorStop(0, 'rgba(255,170,90,.5)'); gl.addColorStop(1, 'rgba(255,170,90,0)');
      fx.fillStyle = gl; fx.beginPath(); fx.arc(sx, sy, 60, 0, 7); fx.fill();
      fx.fillStyle = '#0a0908'; fx.strokeStyle = '#ffd9a8'; fx.lineWidth = 1.5;
      fx.beginPath(); fx.arc(sx, sy, 14, 0, 7); fx.fill(); fx.stroke();
      fx.fillStyle = '#ffb36b'; fx.beginPath(); fx.arc(sx, sy, 5, 0, 7); fx.fill();
      if (m < 0.5) { // front marker for a conventional speaker
        fx.globalAlpha = 1 - m * 2; fx.fillStyle = '#ffd9a8';
        fx.beginPath(); fx.moveTo(sx + 22, sy); fx.lineTo(sx + 32, sy - 5); fx.lineTo(sx + 32, sy + 5); fx.closePath(); fx.fill();
        fx.globalAlpha = 1;
      }
      // listeners
      var lv = [], i;
      for (i = 0; i < LIS.length; i++) lv.push(levelAt(LIS[i][0], LIS[i][1], m));
      var yl = levelAt(you.x, you.y, m);
      fx.font = '500 10px "JetBrains Mono", monospace'; fx.textAlign = 'center';
      for (i = 0; i < LIS.length; i++) dot(LIS[i][0] * fw, LIS[i][1] * fh, lv[i], false);
      dot(you.x * fw, you.y * fh, yl, true);
      var all = lv.concat([yl]), mx = Math.max.apply(null, all), mn = Math.min.apply(null, all);
      readYou.textContent = (yl >= 0 ? '+' : '−') + Math.abs(yl).toFixed(1) + ' dB';
      readSpread.textContent = '±' + ((mx - mn) / 2).toFixed(1) + ' dB';
    }
    function dot(x, y, L, isYou) {
      var q = clamp(1 + L / 24, 0.06, 1);
      var g = fx.createRadialGradient(x, y, 0, x, y, 8 + 22 * q);
      g.addColorStop(0, 'rgba(255,190,120,' + (0.55 * q).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,190,120,0)');
      fx.fillStyle = g; fx.beginPath(); fx.arc(x, y, 8 + 22 * q, 0, 7); fx.fill();
      fx.beginPath(); fx.arc(x, y, isYou ? 7 : 4.5, 0, 7);
      fx.fillStyle = isYou ? '#f1ece2' : 'rgba(255,217,168,' + (0.25 + 0.75 * q).toFixed(2) + ')'; fx.fill();
      if (isYou) { fx.strokeStyle = 'rgba(241,236,226,.6)'; fx.lineWidth = 1; fx.beginPath(); fx.arc(x, y, 13, 0, 7); fx.stroke(); }
      fx.fillStyle = isYou ? '#f1ece2' : 'rgba(241,236,226,.55)';
      fx.fillText(isYou ? 'YOU' : (Math.abs(L) < 0.5 ? '0' : (L >= 0 ? '+' : '−') + Math.abs(L).toFixed(0)), x, y - (isYou ? 20 : 12));
    }
    sizeField();
    new IntersectionObserver(function (es) { fieldVis = es[0].isIntersecting; if (fieldVis) sizeField(); }).observe(fc);
    var fieldStatic = 0;
    function redrawStatic() { if (MOTION) return; cancelAnimationFrame(fieldStatic); fieldStatic = requestAnimationFrame(function () { drawField(1500); if (Math.abs(modeCur - modeTgt) > 0.01) { modeCur = lerp(modeCur, modeTgt, 0.25); redrawStatic(); } else { modeCur = modeTgt; drawField(1500); } }); }
    function placeYou(e) {
      var r = fc.getBoundingClientRect();
      you.x = clamp((e.clientX - r.left) / r.width, 0.03, 0.97); you.y = clamp((e.clientY - r.top) / r.height, 0.05, 0.95);
      redrawStatic();
    }
    var dragging = false;
    fc.addEventListener('pointerdown', function (e) { dragging = true; try { fc.setPointerCapture(e.pointerId); } catch (er) {} placeYou(e); });
    fc.addEventListener('pointermove', function (e) { if (dragging) placeYou(e); });
    fc.addEventListener('pointerup', function () { dragging = false; });
    fc.addEventListener('pointercancel', function () { dragging = false; });
    $$('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        modeTgt = +b.getAttribute('data-mode');
        $$('[data-mode]').forEach(function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); });
        redrawStatic();
      });
    });
    if (!MOTION) drawField(1500);

    // frequency response plot
    (function () {
      var X0 = 24, X1 = 548, Y0 = 60, S = 7, lf0 = Math.log10(20), lf1 = Math.log10(20000);
      var px = function (f) { return X0 + (Math.log10(f) - lf0) / (lf1 - lf0) * (X1 - X0); };
      var db = function (f) {
        var lo = -10 * Math.log10(1 + Math.pow(32 / f, 4)), hi = -10 * Math.log10(1 + Math.pow(f / 24000, 4));
        var rip = 0.55 * Math.sin(Math.log(f) * 5.5) + 0.35 * Math.sin(Math.log(f) * 13 + 1) + 1.1 * Math.exp(-Math.pow(Math.log10(f / 120), 2) / 0.03);
        return lo + hi + rip * (f > 40 ? 1 : 0.4);
      };
      var d = '', pts = [], i, f;
      for (i = 0; i <= 140; i++) { f = Math.pow(10, lf0 + (lf1 - lf0) * i / 140); pts.push([px(f), Y0 - db(f) * S]); }
      d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');
      $('#frLine').setAttribute('d', d);
      $('#frArea').setAttribute('d', d + 'L' + X1 + ' 170L' + X0 + ' 170Z');
      var grid = '', lab = '';
      [-3, 0, 3].forEach(function (g) { grid += '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + (Y0 - g * S) + '" y2="' + (Y0 - g * S) + '"' + (g ? ' stroke-dasharray="3 5"' : '') + '/>'; });
      [[20, '20 Hz'], [100, '100'], [1000, '1k'], [10000, '10k'], [20000, '20k']].forEach(function (a) {
        grid += '<line y1="20" y2="170" x1="' + px(a[0]).toFixed(1) + '" x2="' + px(a[0]).toFixed(1) + '"/>';
        lab += '<text x="' + px(a[0]).toFixed(1) + '" y="186" text-anchor="' + (a[0] === 20 ? 'start' : a[0] === 20000 ? 'end' : 'middle') + '">' + a[1] + '</text>';
      });
      lab += '<text x="' + (X1 - 2) + '" y="' + (Y0 - 3 * S - 5) + '" text-anchor="end">+3 dB</text><text x="' + (X1 - 2) + '" y="' + (Y0 + 3 * S + 13) + '" text-anchor="end">−3 dB</text>';
      $('#frGrid').innerHTML = grid; $('#frLabels').innerHTML = lab;
      if (!MOTION) $('#frArea').setAttribute('opacity', '1');
    })();

    /* ---------------------------------------------------------------
       Room lab
    --------------------------------------------------------------- */
    var ROOMS = {
      studio: { w: 300, h: 216, m: '5.5 m', n: '4.0 m', bloom: 8.1, after: 0.9 },
      living: { w: 420, h: 290, m: '7.2 m', n: '5.3 m', bloom: 7.4, after: 0.6 },
      open:   { w: 560, h: 350, m: '9.6 m', n: '6.7 m', bloom: 5.2, after: 0.8 }
    };
    var NS = 'http://www.w3.org/2000/svg';
    var rRect = $('#roomRect'), rClip = $('#roomClipRect'), rSpk = $('#roomSpk'), rRings = $('#rings'), rBloom = $('#blooms'), rCover = $('#cover');
    var rFurn = $('#furn'), dimW = $('#dimW'), dimH = $('#dimH'), sweep = $('#sweep'), sweepPath = $('#sweepPath');
    var calBtn = $('#calBtn'), calLabel = $('#calLabel'), calStatus = $('#calStatus'), calBloom = $('#calBloom');
    var room = { w: ROOMS.living.w, h: ROOMS.living.h }, roomKey = 'living', calibrated = false, busy = false, bloomVal = ROOMS.living.bloom, roomAnim = 0;
    for (var ri = 0; ri < 4; ri++) {
      var c = document.createElementNS(NS, 'circle'); c.style.animationDelay = (-ri * 1.2) + 's'; rRings.appendChild(c);
    }
    for (var bi = 0; bi < 4; bi++) { rBloom.appendChild(document.createElementNS(NS, 'ellipse')); }
    function layoutRoom(w, h) {
      var x = (640 - w) / 2, y = (440 - h) / 2 - 6;
      [rRect, rClip].forEach(function (r) { r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); });
      var sx = x + w * 0.3, sy = y + h * 0.42;
      rSpk.setAttribute('transform', 'translate(' + sx + ' ' + sy + ')');
      var far = Math.max(Math.hypot(sx - x, sy - y), Math.hypot(sx - x - w, sy - y), Math.hypot(sx - x, sy - y - h), Math.hypot(sx - x - w, sy - y - h));
      $$('circle', rRings).forEach(function (c) { c.setAttribute('cx', sx); c.setAttribute('cy', sy); c.setAttribute('r', far); });
      rCover.setAttribute('cx', sx); rCover.setAttribute('cy', sy); rCover.setAttribute('r', far);
      var corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
      $$('ellipse', rBloom).forEach(function (e, i) {
        e.setAttribute('cx', corners[i][0]); e.setAttribute('cy', corners[i][1]);
        e.setAttribute('rx', w * 0.2); e.setAttribute('ry', h * 0.26); e.setAttribute('fill', 'url(#bloomG)');
      });
      rFurn.innerHTML =
        '<rect x="' + (x + w * 0.38) + '" y="' + (y + h - 40) + '" width="' + w * 0.36 + '" height="26" rx="8"/>' +
        '<circle cx="' + (x + w * 0.56) + '" cy="' + (y + h * 0.66) + '" r="' + Math.max(12, w * 0.032) + '"/>' +
        '<rect x="' + (x + w * 0.44) + '" y="' + (y + h * 0.5) + '" width="' + w * 0.26 + '" height="' + h * 0.28 + '" rx="4" stroke-dasharray="3 5"/>' +
        '<circle cx="' + (x + w - 24) + '" cy="' + (y + 24) + '" r="10"/>' +
        '<line x1="' + (x + w * 0.5) + '" x2="' + (x + w * 0.8) + '" y1="' + (y + 1) + '" y2="' + (y + 1) + '" stroke-width="4" stroke-opacity=".6"/>';
      dimW.setAttribute('x', 320); dimW.setAttribute('y', y + h + 22); dimW.textContent = ROOMS[roomKey].m;
      dimH.setAttribute('transform', 'translate(' + (x - 14) + ' ' + (y + h / 2) + ') rotate(-90)'); dimH.textContent = ROOMS[roomKey].n;
      $$('ellipse', rBloom).forEach(function (e) { e.style.opacity = calibrated ? 0.08 : 0.8; });
      room.sx = sx; room.sy = sy; room.far = far;
    }
    function setRoom(key) {
      if (busy) return;
      var from = { w: room.w, h: room.h }, to = ROOMS[key];
      roomKey = key; calibrated = false;
      var id = ++roomAnim;
      tween(0, 1, 1100, function (t) {
        if (id !== roomAnim) return;
        room.w = lerp(from.w, to.w, t); room.h = lerp(from.h, to.h, t); layoutRoom(room.w, room.h);
      }, easeIO);
      $$('[data-room]').forEach(function (b) { var on = b.getAttribute('data-room') === key; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      calStatus.textContent = 'Uncalibrated'; calLabel.textContent = 'Run RoomSense';
      tween(bloomVal, to.bloom, 800, function (v) { bloomVal = v; calBloom.textContent = '+' + v.toFixed(1) + ' dB'; });
    }
    $$('[data-room]').forEach(function (b) { b.addEventListener('click', function () { setRoom(b.getAttribute('data-room')); }); });
    layoutRoom(room.w, room.h);
    calBtn.addEventListener('click', function () {
      if (busy) return;
      var R = ROOMS[roomKey];
      busy = true; calBtn.disabled = true; calLabel.textContent = 'Listening…'; calStatus.textContent = 'Measuring…';
      var finish = function () {
        calibrated = true; busy = false; calBtn.disabled = false;
        calLabel.textContent = 'Run again'; calStatus.textContent = 'Calibrated';
        $$('ellipse', rBloom).forEach(function (e) { e.style.opacity = 0.08; });
        tween(bloomVal, R.after, 1200, function (v) { bloomVal = v; calBloom.textContent = '+' + v.toFixed(1) + ' dB'; });
      };
      if (!MOTION) { finish(); return; }
      sweep.setAttribute('opacity', 1);
      tween(0, 1, 2600, function (t) {
        var a = t * Math.PI * 2 * 1.5 - Math.PI / 2, w = 0.7, r = room.far;
        var sx = room.sx, sy = room.sy;
        sweepPath.setAttribute('d', 'M' + sx + ' ' + sy + 'L' + (sx + r * Math.cos(a - w)) + ' ' + (sy + r * Math.sin(a - w)) + 'A' + r + ' ' + r + ' 0 0 1 ' + (sx + r * Math.cos(a)) + ' ' + (sy + r * Math.sin(a)) + 'Z');
        sweep.setAttribute('opacity', t > 0.92 ? (1 - t) / 0.08 : 1);
      }, function (t) { return t; }, function () { sweep.setAttribute('opacity', 0); finish(); });
    });

    /* feature tile spotlight */
    $$('.feat').forEach(function (f) {
      f.addEventListener('pointermove', function (e) {
        var r = f.getBoundingClientRect();
        f.style.setProperty('--mx', (e.clientX - r.left) + 'px'); f.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* ---------------------------------------------------------------
       Pre-order
    --------------------------------------------------------------- */
    var qty = 1, priceShown = 4990, priceEl = $('#priceN'), eurEl = $('#priceEur');
    var fmt = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    function setQty(q) {
      qty = q;
      $$('[data-qty]').forEach(function (b) { var on = +b.getAttribute('data-qty') === q; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      var to = q === 1 ? 4990 : 9480;
      tween(priceShown, to, 900, function (v) { priceShown = v; priceEl.textContent = fmt(v); });
      eurEl.textContent = '≈ €' + fmt(to / 7.46);
    }
    $$('[data-qty]').forEach(function (b) { b.addEventListener('click', function () { setQty(+b.getAttribute('data-qty')); }); });
    var form = $('#reserveForm'), email = $('#email'), msg = $('#formMsg'), done = $('#done');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        email.setAttribute('aria-invalid', 'true'); msg.textContent = 'Please enter a valid email address.'; email.focus(); return;
      }
      email.removeAttribute('aria-invalid'); msg.textContent = '';
      // Front-end demo: nothing is transmitted anywhere.
      $('#doneText').textContent = 'We’ll write to ' + v + ' with a deposit link for ' + (qty === 1 ? 'your Halo One' : 'your stereo pair') + ' in ' + FINISH[curFinish].name + '.';
      form.hidden = true; done.hidden = false; done.setAttribute('tabindex', '-1'); done.focus({ preventScroll: true });
    });
    email.addEventListener('input', function () { if (email.getAttribute('aria-invalid')) { email.removeAttribute('aria-invalid'); msg.textContent = ''; } });

    /* ---------------------------------------------------------------
       Nav, motion toggle, cursor, magnetic buttons
    --------------------------------------------------------------- */
    var nav = $('#nav'), progress = $('#progress');
    var navLinks = $$('.nav-links a'), navTargets = navLinks.map(function (a) { return $(a.getAttribute('href')); });
    var mt = $('#motionToggle'), mLabel = $('#motionLabel');
    mt.setAttribute('aria-pressed', MOTION); mLabel.textContent = MOTION ? 'Motion on' : 'Motion off';
    mt.addEventListener('click', function () {
      try { localStorage.setItem('halo-motion', MOTION ? 'off' : 'on'); } catch (e) {}
      window.location.reload();
    });

    var cursor = $('#cursor');
    if (MOTION && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      var cx = 0, cy = 0, tx = 0, ty = 0, seen = false;
      window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; if (!seen) { seen = true; cx = tx; cy = ty; cursor.classList.add('on'); } });
      document.addEventListener('pointerleave', function () { cursor.classList.remove('on'); seen = false; });
      document.addEventListener('pointerover', function (e) { cursor.classList.toggle('big', !!e.target.closest('a,button,.swatch,canvas,input')); });
      (function loop() { cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2); cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'; requestAnimationFrame(loop); })();
      $$('[data-magnetic]').forEach(function (b) {
        b.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect();
          b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px)';
        });
        b.addEventListener('pointerleave', function () { b.style.transform = ''; });
      });
    }

    /* ---------------------------------------------------------------
       Main frame loop (scroll-linked effects + canvases)
    --------------------------------------------------------------- */
    var objP = 0, objT = 0, sy = -1, stmtP = 0;
    function frame(time) {
      if (lenis) lenis.raf(time);
      var y = window.scrollY, vh = window.innerHeight;
      if (y !== sy) {
        sy = y;
        nav.classList.toggle('scrolled', y > 40);
        var doc = document.documentElement.scrollHeight - vh;
        progress.style.transform = 'scaleX(' + (doc > 0 ? clamp(y / doc, 0, 1) : 0).toFixed(4) + ')';
        var cur = -1; navTargets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top < vh * 0.4) cur = i; });
        navLinks.forEach(function (a, i) { a.classList.toggle('cur', i === cur); });
      }
      if (MOTION) {
        // statement words light up
        var sr = stmt.getBoundingClientRect();
        var sp = clamp((vh * 0.82 - sr.top) / (sr.height + vh * 0.28), 0, 1);
        stmtP = lerp(stmtP, sp, 0.14);
        var n = stmtWords.length, hot = stmtP * (n + 5);
        for (var i = 0; i < n; i++) stmtWords[i].style.opacity = (0.14 + 0.86 * clamp(hot - i, 0, 1)).toFixed(3);

        // pinned exploded view
        var or = objEl.getBoundingClientRect();
        if (or.top < vh && or.bottom > 0) {
          objT = clamp(-or.top / (or.height - vh), 0, 1);
          objP = lerp(objP, objT, 0.12); if (Math.abs(objP - objT) < 0.0004) objP = objT;
          renderObject(objP);
        }

        // hero parallax + tilt + canvases
        if (heroVis) {
          tiltC.x = lerp(tiltC.x, tiltT.x, 0.06); tiltC.y = lerp(tiltC.y, tiltT.y, 0.06);
          heroSpk.style.transform = 'translate3d(' + (tiltC.x * -16).toFixed(1) + 'px,' + (y * 0.1).toFixed(1) + 'px,0) rotateY(' + (tiltC.x * 12).toFixed(2) + 'deg) rotateX(' + (tiltC.y * -5).toFixed(2) + 'deg)';
          heroWord.style.transform = 'translate3d(' + (tiltC.x * 14).toFixed(1) + 'px,' + (y * 0.24).toFixed(1) + 'px,0)';
          drawHero(time);
        }
        if (fieldVis) {
          modeCur = lerp(modeCur, modeTgt, 0.07); if (Math.abs(modeCur - modeTgt) < 0.002) modeCur = modeTgt;
          drawField(time);
        }
        updateSpeakers(time);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* ---------------------------------------------------------------
       Intro sequence
    --------------------------------------------------------------- */
    var loader = $('#loader'), loaderN = $('#loaderN'), ring = $('.loader-ring circle');
    function reveal() {
      root.classList.add('ready');
      loader.classList.add('out');
      setTimeout(function () { loader.style.display = 'none'; }, 1200);
    }
    if (!MOTION) { root.classList.add('ready'); }
    else {
      var fontsReady = false, countDone = false, started = performance.now();
      var check = function () { if (countDone && (fontsReady || performance.now() - started > 3200)) reveal(); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fontsReady = true; check(); }); else fontsReady = true;
      tween(0, 100, 1500, function (v) { loaderN.textContent = Math.round(v); ring.style.strokeDashoffset = (1 - v / 100).toFixed(3); }, easeIO, function () { countDone = true; setTimeout(check, 120); });
      setTimeout(function () { if (!root.classList.contains('ready')) reveal(); }, 4200);
    }
  }
})();
