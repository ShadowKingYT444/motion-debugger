/* ==========================================================
   DRIFT — interactions & motion
   Vanilla JS, no dependencies.
   ========================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('ok');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var NS = 'http://www.w3.org/2000/svg';

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var paused = mqReduce.matches;
  var vw = window.innerWidth, vh = window.innerHeight;

  /* ---------- Motion on/off ---------- */
  var motionBtn = $('#motionBtn');
  function applyPaused() {
    root.classList.toggle('paused', paused);
    motionBtn.setAttribute('aria-pressed', String(paused));
    motionBtn.setAttribute('aria-label', paused ? 'Resume ambient motion' : 'Pause ambient motion');
    if (paused) drawSky(0);
  }
  motionBtn.addEventListener('click', function () { paused = !paused; applyPaused(); });

  /* ---------- Shared animation ticker ---------- */
  var tasks = [];
  var visIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.__vis = e.isIntersecting; });
  }, { rootMargin: '80px' }) : null;
  function addTask(fn, el) {
    if (el) { el.__vis = !visIO; if (visIO) visIO.observe(el); }
    tasks.push({ fn: fn, el: el });
  }
  var lastT = 0;
  function frame(ms) {
    requestAnimationFrame(frame);
    var t = ms / 1000, dt = Math.min(0.05, t - lastT); lastT = t;
    if (paused || document.hidden) return;
    for (var i = 0; i < tasks.length; i++) {
      var k = tasks[i];
      if (!k.el || k.el.__vis) k.fn(t, dt);
    }
  }
  requestAnimationFrame(frame);

  /* ---------- Word-split headings ---------- */
  function split(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (tk) {
            if (!tk) return;
            if (/^\s+$/.test(tk)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var s = document.createElement('span'); s.textContent = tk; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay + 'ms');
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    $$('.w', el).forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
    el.classList.add('split-ready');
  }
  $$('[data-split]').forEach(split);

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('[data-reveal], [data-split], #bars');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { rio.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add('in'); });

  /* ---------- Nav ---------- */
  var nav = $('#nav'), burger = $('#burger');
  burger.addEventListener('click', function () {
    var open = !nav.classList.contains('nav-open');
    nav.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#links a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); });
  });
  var navLinks = $$('#links a');
  var secIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      navLinks.forEach(function (a) { a.classList.toggle('act', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { secIO.observe(s); });

  /* ---------- Starfield ---------- */
  var sky = $('#sky'), sg = sky.getContext('2d');
  var stars = [], DPR = 1, shoot = null, nextShoot = 4, dawnP = 0, px = 0, py = 0, spx = 0, spy = 0;
  function sizeSky() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    sky.width = vw * DPR; sky.height = vh * DPR;
    var n = Math.round(vw * vh / 6500);
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * vw, y: Math.random() * vh, z: Math.random() * 0.9 + 0.1, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.6, hue: Math.random() });
    }
    drawSky(0);
  }
  function drawSky(t) {
    sg.setTransform(DPR, 0, 0, DPR, 0, 0);
    sg.clearRect(0, 0, vw, vh);
    var sy = window.scrollY || 0, fade = 1 - dawnP * 0.8;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var y = ((s.y - sy * s.z * 0.18 - spy * s.z * 14) % vh + vh) % vh;
      var x = ((s.x - spx * s.z * 22) % vw + vw) % vw;
      var a = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * s.z * fade;
      sg.globalAlpha = a;
      sg.fillStyle = s.hue > 0.85 ? '#ffd9c2' : s.hue < 0.25 ? '#cfd6ff' : '#ffffff';
      sg.beginPath(); sg.arc(x, y, s.z * 1.25 + 0.15, 0, 6.283); sg.fill();
    }
    if (shoot) {
      var p = shoot.life;
      var gx = sg.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12);
      gx.addColorStop(0, 'rgba(255,255,255,' + (0.9 * (1 - p)) + ')'); gx.addColorStop(1, 'rgba(255,255,255,0)');
      sg.globalAlpha = 1; sg.strokeStyle = gx; sg.lineWidth = 1.6;
      sg.beginPath(); sg.moveTo(shoot.x, shoot.y); sg.lineTo(shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12); sg.stroke();
    }
    sg.globalAlpha = 1;
  }
  addTask(function (t, dt) {
    spx = lerp(spx, px, 0.04); spy = lerp(spy, py, 0.04);
    if (shoot) {
      shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt; shoot.life += dt / 0.9;
      if (shoot.life >= 1) shoot = null;
    } else if (t > nextShoot) {
      shoot = { x: Math.random() * vw * 0.7 + vw * 0.2, y: Math.random() * vh * 0.35, vx: 520 + Math.random() * 240, vy: 220 + Math.random() * 120, life: 0 };
      nextShoot = t + 8 + Math.random() * 9;
    }
    drawSky(t);
  }, null);
  window.addEventListener('resize', sizeSky);
  sizeSky();

  /* ---------- Scroll-linked ---------- */
  var progress = $('.progress'), dawn = $('.dawn'), heroCopy = $('.hero__copy'), phone = $('#phone'), dl = $('#download');
  var ticking = false, tiltX = 0, tiltY = 0;
  function onScroll() {
    ticking = false;
    var sy = window.scrollY, max = document.documentElement.scrollHeight - vh;
    progress.style.transform = 'scaleX(' + (max > 0 ? clamp(sy / max, 0, 1) : 0) + ')';
    nav.classList.toggle('scrolled', sy > 24);
    var r = dl.getBoundingClientRect();
    dawnP = clamp(1 - r.top / (vh * 0.95), 0, 1);
    dawn.style.opacity = (dawnP * 0.95).toFixed(3);
    if (sy < vh * 1.3) {
      var f = clamp(sy / (vh * 0.8), 0, 1);
      heroCopy.style.opacity = (1 - f * 0.9).toFixed(3);
      heroCopy.style.transform = 'translate3d(0,' + (sy * 0.12).toFixed(1) + 'px,0)';
      phone.style.setProperty('--py', (-sy * 0.07).toFixed(1) + 'px');
    }
    if (paused) drawSky(0);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Pointer effects ---------- */
  var glow = $('.glow'), gx = 0, gy = 0, tx = 0, ty = 0;
  if (finePointer) {
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      px = (e.clientX / vw - 0.5); py = (e.clientY / vh - 0.5);
      glow.classList.add('on');
      if (!paused && e.clientY < vh * 1.1 && window.scrollY < vh) {
        var b = phone.getBoundingClientRect();
        var dx = (e.clientX - (b.left + b.width / 2)) / vw, dy = (e.clientY - (b.top + b.height / 2)) / vh;
        phone.style.setProperty('--ry', (dx * 14).toFixed(2) + 'deg');
        phone.style.setProperty('--rx', (-dy * 10).toFixed(2) + 'deg');
      }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { glow.classList.remove('on'); });
    addTask(function () {
      gx = lerp(gx, tx, 0.1); gy = lerp(gy, ty, 0.1);
      glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
    }, null);

    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (paused) return;
        var b = el.getBoundingClientRect();
        var dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
        el.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.3).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.cell').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var b = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - b.left) + 'px');
        c.style.setProperty('--my', (e.clientY - b.top) + 'px');
      });
    });
  }

  /* ---------- Counters ---------- */
  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
    if (paused) { el.textContent = end.toFixed(dec); return; }
    var start = performance.now(), dur = 1800;
    (function step(now) {
      var p = clamp((now - start) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (end * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  /* ---------- How it works: stage ---------- */
  var stage = $('#stage'), steps = $$('.step');
  var sceneTimer = null, clockTween = 0;
  function setScene(i) {
    stage.dataset.active = i;
    steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    clearInterval(sceneTimer); cancelAnimationFrame(clockTween);
    if (i === 1) {
      var msgs = [
        'Restless at 1:12 AM — lifting rain, easing the pad',
        'Heart rate settling — thinning the wind',
        'Neighbour’s door at 2:03 — masking with a low tide',
        'Deep sleep reached — fading to near silence'
      ];
      var vals = [[60, 30, 44, 22], [48, 18, 52, 14], [72, 36, 30, 10], [14, 6, 20, 4]];
      var n = 0;
      var go = function () {
        if (paused) return;
        var v = vals[n % vals.length], r = $('#reason');
        r.style.opacity = 0;
        setTimeout(function () { r.textContent = msgs[n % msgs.length]; r.style.opacity = 1; n++; }, 350);
        $$('#layers .layer').forEach(function (l, k) {
          l.querySelector('i').style.setProperty('--v', v[k] + '%');
          l.querySelector('em').textContent = v[k];
        });
      };
      sceneTimer = setInterval(go, 3200);
    }
    if (i === 2) {
      var clock = $('#clock'), msg = $('#clockMsg'), t0 = performance.now(), dur = paused ? 1 : 4200;
      var run = function (now) {
        var p = clamp((now - t0) / dur, 0, 1), mins = 370 + Math.round(p * 32); // 06:10 -> 06:42
        clock.textContent = '0' + Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0');
        msg.textContent = p < 0.55 ? 'Light-sleep window opening' : 'Light sleep detected — waking you gently';
        if (p < 1) clockTween = requestAnimationFrame(run);
      };
      clockTween = requestAnimationFrame(run);
    } else {
      $('#clock').textContent = '06:10'; $('#clockMsg').textContent = 'Light-sleep window opening';
    }
  }
  var mobile = window.matchMedia('(max-width: 900px)');
  var stepIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) setScene(parseInt(e.target.dataset.i, 10)); });
  }, { rootMargin: mobile.matches ? '-56% 0px -20% 0px' : '-42% 0px -42% 0px' });
  steps.forEach(function (s) { stepIO.observe(s); });
  setScene(0);

  // live tag values
  var hr = $('[data-live="hr"]'), db = $('[data-live="db"]');
  setInterval(function () {
    if (paused) return;
    hr.textContent = (56 + Math.round(Math.random() * 5)) + ' bpm';
    db.textContent = (29 + Math.round(Math.random() * 4)) + ' dB';
  }, 1800);

  /* ---------- Wave helpers ---------- */
  function wavePath(w, h, amp, f, ph, steps) {
    var d = '';
    for (var i = 0; i <= steps; i++) {
      var x = i / steps, env = Math.sin(Math.PI * x);
      var y = h / 2 + Math.sin(x * f * 6.283 + ph) * amp * env + Math.sin(x * f * 2.1 * 6.283 - ph * 1.3) * amp * 0.35 * env;
      d += (i ? 'L' : 'M') + (x * w).toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  function liveWave(svg, w, h, cfgs) {
    var paths = $$('path', svg);
    addTask(function (t) {
      for (var i = 0; i < paths.length; i++) {
        var c = cfgs[i];
        paths[i].setAttribute('d', wavePath(w, h, c.a * (0.8 + 0.2 * Math.sin(t * 0.6 + i)), c.f, t * c.s + i, 60));
      }
    }, svg);
  }
  liveWave($('#wave'), 400, 80, [{ a: 14, f: 2, s: 0.8 }, { a: 18, f: 2.6, s: -0.6 }, { a: 22, f: 1.7, s: 1.1 }]);
  liveWave($('#lw'), 600, 200, [{ a: 40, f: 1.6, s: 0.5 }, { a: 52, f: 2.2, s: -0.7 }, { a: 62, f: 1.3, s: 0.9 }, { a: 46, f: 2.9, s: -1.1 }]);

  /* ---------- Hypnogram ---------- */
  (function () {
    var svg = $('#hypno'); if (!svg) return;
    var L = 78, Rr = 782, B = 300, ys = [62, 132, 202, 272], names = ['Awake', 'REM', 'Light', 'Deep'];
    var X = function (t) { return L + (Rr - L) * t / 8; };
    var pts = [[0, 0], [0.3, 2], [0.6, 3], [1.5, 3], [1.8, 2], [2.0, 1], [2.2, 1], [2.3, 2], [2.6, 3], [3.2, 3], [3.5, 2], [3.7, 1], [4.1, 1], [4.2, 2], [4.6, 3], [4.9, 2], [5.2, 1], [5.8, 1], [5.9, 2], [6.4, 2], [6.6, 1], [7.2, 1], [7.3, 0], [8, 0]];
    var h = '<defs><linearGradient id="hg" gradientUnits="userSpaceOnUse" x1="' + L + '" x2="' + Rr + '" y1="0" y2="0"><stop offset="0" stop-color="#5fe0cf"/><stop offset=".55" stop-color="#8b7bff"/><stop offset="1" stop-color="#ffb48a"/></linearGradient></defs><g class="grid">';
    ys.forEach(function (y, i) { h += '<line x1="' + L + '" x2="' + Rr + '" y1="' + y + '" y2="' + y + '"/><text class="lbl" x="' + (L - 14) + '" y="' + (y + 4.5) + '" text-anchor="end">' + names[i] + '</text>'; });
    var hrs = ['11 PM', '12', '1', '2', '3', '4', '5', '6', '7 AM'];
    hrs.forEach(function (t, i) { h += '<text class="hr" x="' + X(i) + '" y="' + (B + 34) + '">' + t + '</text>'; });
    h += '</g>';
    var d = 'M' + X(pts[0][0]) + ' ' + ys[pts[0][1]];
    for (var i = 1; i < pts.length; i++) d += ' H' + X(pts[i][0]).toFixed(1) + ' V' + ys[pts[i][1]];
    h += '<path class="halo" d="' + d + '"/><path class="line" d="' + d + '"/>';
    [[0.3, 1], [3.5, 2], [7.3, 3]].forEach(function (m) {
      var x = X(m[0]).toFixed(1);
      h += '<g class="mk" data-t="' + m[0] + '"><line x1="' + x + '" x2="' + x + '" y1="38" y2="' + B + '"/><circle cx="' + x + '" cy="26" r="12"/><text x="' + x + '" y="30.5">' + m[1] + '</text></g>';
    });
    svg.innerHTML = h;
    var line = $('.line', svg), halo = $('.halo', svg), mks = $$('.mk', svg);
    var len = line.getTotalLength(), dur = 4200;
    var instant = paused;
    [line, halo].forEach(function (p) { p.style.strokeDasharray = len; p.style.strokeDashoffset = instant ? 0 : len; });
    if (instant) mks.forEach(function (m) { m.classList.add('on'); });
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      if (instant) return;
      [line, halo].forEach(function (p) {
        p.style.transition = 'stroke-dashoffset ' + dur + 'ms cubic-bezier(.6,.05,.3,1)';
        p.getBoundingClientRect();
        p.style.strokeDashoffset = 0;
      });
      mks.forEach(function (m) { setTimeout(function () { m.classList.add('on'); }, 500 + parseFloat(m.dataset.t) / 8 * dur * 0.9); });
    }, { threshold: 0.35 });
    io.observe(svg);
  })();

  /* ---------- Sound lab (Web Audio) ---------- */
  (function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    var ui = $('#lab'), playBtn = $('#play'), range = $('#nRange'), hint = $('#vizHint');
    var cv = $('#vizc'), cg = cv.getContext('2d');
    var ctx = null, master = null, analyser = null, bufs = null, voice = null, playing = false, preset = 'rain', night = 0;
    var fdata = new Uint8Array(256);
    var keys = [[0, 1, 1], [0.12, 0.9, 0.85], [0.35, 0.4, 0.35], [0.55, 0.22, 0.15], [0.62, 0.5, 0.55], [0.72, 0.3, 0.3], [0.9, 0.3, 0.3], [1, 0.75, 0.85]];
    function curve(t) {
      for (var i = 1; i < keys.length; i++) {
        if (t <= keys[i][0]) {
          var a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]);
          return { vol: lerp(a[1], b[1], u), cut: lerp(a[2], b[2], u) };
        }
      }
      return { vol: 1, cut: 1 };
    }
    function stageLabel(t) {
      if (t < 0.1) return 'Wind-down · full presence';
      if (t < 0.3) return 'Falling asleep · layers thinning';
      if (t < 0.57) return 'Deep sleep · almost silent';
      if (t < 0.7) return 'Light stirring · lifting a layer';
      if (t < 0.92) return 'Final cycle · staying soft';
      return 'Sunrise · gently swelling';
    }
    function fmt(t) {
      var m = Math.round(23 * 60 + t * 480) % 1440, h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM';
      return ((h % 12) || 12) + ':' + String(mm).padStart(2, '0') + ' ' + ap;
    }
    function makeNoise(type) {
      var sr = ctx.sampleRate, len = sr * 6, N = Math.floor(sr * 0.5);
      var b = ctx.createBuffer(2, len, sr);
      for (var c = 0; c < 2; c++) {
        var s = new Float32Array(len + N), last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, i, w;
        for (i = 0; i < s.length; i++) {
          w = Math.random() * 2 - 1;
          if (type === 'brown') { last = (last + 0.02 * w) / 1.02; s[i] = last * 3.2; }
          else {
            b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
            b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
            s[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
          }
        }
        var d = b.getChannelData(c);
        for (i = 0; i < len; i++) d[i] = i < N ? s[i] * (i / N) + s[len + i] * (1 - i / N) : s[i];
      }
      return b;
    }
    function init() {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.86;
      master.connect(analyser); analyser.connect(ctx.destination);
      bufs = { pink: makeNoise('pink'), brown: makeNoise('brown') };
    }
    function src(buf) { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = 0; s.start(0, Math.random() * 4); return s; }
    function osc(type, f, g) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; var gn = ctx.createGain(); gn.gain.value = g; o.connect(gn); o.start(); return { o: o, g: gn }; }

    function makeVoice(name) {
      var out = ctx.createGain(); out.gain.value = 0; out.connect(master);
      var nodes = [], filters = [], range_ = { lo: 300, hi: 3000 };
      if (name === 'rain') {
        var s1 = src(bufs.pink), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
        var g1 = ctx.createGain(); g1.gain.value = 0.9; s1.connect(lp); lp.connect(g1); g1.connect(out);
        var s2 = src(bufs.pink), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
        var g2 = ctx.createGain(); g2.gain.value = 0.16; s2.connect(hp); hp.connect(g2); g2.connect(out);
        var l = osc('sine', 0.23, 0.06); l.g.connect(g2.gain);
        nodes = [s1, s2, l.o]; filters = [lp]; range_ = { lo: 700, hi: 5200 };
      } else if (name === 'ocean') {
        var s3 = src(bufs.brown), lp3 = ctx.createBiquadFilter(); lp3.type = 'lowpass'; lp3.Q.value = 0.7;
        var sw = ctx.createGain(); sw.gain.value = 0.55; s3.connect(lp3); lp3.connect(sw); sw.connect(out);
        var l2 = osc('sine', 0.11, 0.38); l2.g.connect(sw.gain);
        var s4 = src(bufs.pink), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.6;
        var fg = ctx.createGain(); fg.gain.value = 0.05; s4.connect(bp); bp.connect(fg); fg.connect(out);
        var l3 = osc('sine', 0.11, 0.04); l3.g.connect(fg.gain);
        nodes = [s3, s4, l2.o, l3.o]; filters = [lp3]; range_ = { lo: 260, hi: 1500 };
      } else {
        var s5 = src(bufs.brown), lp5 = ctx.createBiquadFilter(); lp5.type = 'lowpass'; lp5.Q.value = 0.9;
        var g5 = ctx.createGain(); g5.gain.value = 0.75; s5.connect(lp5); lp5.connect(g5); g5.connect(out);
        var pads = [osc('sine', 110, 0.05), osc('sine', 164.81, 0.032), osc('triangle', 220.5, 0.012)];
        pads.forEach(function (p) { p.g.connect(out); nodes.push(p.o); });
        var l4 = osc('sine', 0.07, 0.02); l4.g.connect(pads[0].g.gain); nodes.push(l4.o);
        nodes.push(s5); filters = [lp5]; range_ = { lo: 150, hi: 700 };
      }
      return {
        out: out, nodes: nodes,
        apply: function (c, imm) {
          var f = range_.lo + (range_.hi - range_.lo) * c.cut * c.cut, tc = imm ? 0.01 : 0.25;
          filters.forEach(function (fl) { fl.frequency.setTargetAtTime(f, ctx.currentTime, tc); });
          out.gain.setTargetAtTime(c.vol, ctx.currentTime, imm ? 0.4 : 0.3);
        },
        stop: function () {
          out.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
          setTimeout(function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); out.disconnect(); }, 1500);
        }
      };
    }
    function setPreset(p) {
      preset = p;
      $$('.preset', ui).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.p === p)); });
      hint.textContent = ({ rain: 'Rain', ocean: 'Ocean', hush: 'Night pad' })[p] + ' · adaptive';
      if (playing) { if (voice) voice.stop(); voice = makeVoice(p); voice.apply(curve(night), true); }
    }
    function play() {
      if (!AC) { hint.textContent = 'Audio not supported in this browser'; return; }
      if (!ctx) init();
      ctx.resume();
      playing = true;
      voice = makeVoice(preset); voice.apply(curve(night), true);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.4);
      ui.classList.add('playing');
      playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Pause soundscape');
    }
    function stop() {
      playing = false;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      var v = voice; voice = null;
      if (v) v.stop();
      setTimeout(function () { if (!playing) ctx.suspend(); }, 1700);
      ui.classList.remove('playing');
      playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Play soundscape');
    }
    playBtn.addEventListener('click', function () { playing ? stop() : play(); });
    $$('.preset', ui).forEach(function (b) { b.addEventListener('click', function () { setPreset(b.dataset.p); }); });
    function onRange() {
      night = range.value / 100;
      range.style.setProperty('--p', range.value + '%');
      $('#nTime').textContent = fmt(night);
      $('#nStage').textContent = stageLabel(night);
      if (playing && voice) voice.apply(curve(night), false);
    }
    range.addEventListener('input', onRange); onRange();

    // visualiser
    function sizeViz() {
      var r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); cg.setTransform(d, 0, 0, d, 0, 0);
    }
    window.addEventListener('resize', sizeViz); sizeViz();
    var energy = 0;
    function drawViz(t) {
      var W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
      cg.clearRect(0, 0, W, H);
      var live = playing && analyser;
      if (live) analyser.getByteFrequencyData(fdata);
      var c = curve(night), n = 64, mid = H * 0.5;
      var avg = 0;
      for (var layer = 0; layer < 3; layer++) {
        cg.beginPath();
        for (var i = 0; i <= n; i++) {
          var x = i / n * W, u = i / n, env = Math.sin(Math.PI * u);
          var f = live ? fdata[Math.floor(Math.pow(u, 1.6) * 90)] / 255 : 0;
          if (layer === 0) avg += f / (n + 1);
          var idle = 0.14 + 0.06 * Math.sin(t * 0.8 + u * 7 + layer);
          var amp = (live ? (0.12 + f * 1.1) : idle) * env * H * (0.2 + layer * 0.07);
          var y = mid + Math.sin(u * (5 + layer * 2.3) + t * (0.7 + layer * 0.4) + layer * 2) * amp;
          if (i) cg.lineTo(x, y); else cg.moveTo(x, y);
        }
        var g = cg.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(95,224,207,' + (0.35 + layer * 0.3) + ')'); g.addColorStop(0.5, 'rgba(139,123,255,' + (0.4 + layer * 0.3) + ')'); g.addColorStop(1, 'rgba(255,180,138,' + (0.35 + layer * 0.3) + ')');
        cg.strokeStyle = g; cg.lineWidth = 1.5 + layer * 0.8; cg.stroke();
      }
      // night-level meter (vol)
      cg.fillStyle = 'rgba(255,255,255,.06)'; cg.fillRect(18, H - 22, 90, 4);
      cg.fillStyle = 'rgba(201,191,255,.9)'; cg.fillRect(18, H - 22, 90 * c.vol, 4);
      cg.fillStyle = 'rgba(156,158,195,.9)'; cg.font = '600 10px Manrope, sans-serif'; cg.fillText('LEVEL', 18, H - 30);
    }
    addTask(drawViz, $('#viz'));
    drawViz(0);
  })();

  /* ---------- Plans toggle ---------- */
  (function () {
    var wrap = $('#plansWrap'), btns = $$('[data-bill]', wrap), prices = $$('.price b[data-m]', wrap), bills = $$('.bill[data-bm]', wrap);
    function set(mode) {
      wrap.dataset.billing = mode;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.bill === mode)); });
      prices.forEach(function (el) {
        var to = parseFloat(el.dataset[mode === 'yearly' ? 'y' : 'm']), from = parseFloat(el.textContent) || 0;
        if (paused) { el.textContent = to; return; }
        var t0 = performance.now();
        (function step(now) {
          var p = clamp((now - t0) / 650, 0, 1), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(lerp(from, to, e));
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
      bills.forEach(function (el) { el.textContent = el.dataset[mode === 'yearly' ? 'by' : 'bm']; });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.bill); }); });
  })();

  /* ---------- Marquee: duplicate for seamless loop ---------- */
  $$('.marq__row').forEach(function (row) {
    $$('.quote', row).forEach(function (q) {
      var c = q.cloneNode(true); c.setAttribute('aria-hidden', 'true'); row.appendChild(c);
    });
  });

  applyPaused();
})();
