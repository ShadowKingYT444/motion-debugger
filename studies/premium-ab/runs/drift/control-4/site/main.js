(function () {
  'use strict';
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceMQ.matches;
  var paused = reduced;           // user-controlled background motion switch
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- motion toggle ---------- */
  var mt = $('#motionToggle');
  function applyMotion() {
    doc.dataset.motion = paused ? 'paused' : 'playing';
    mt.setAttribute('aria-pressed', String(paused));
    mt.title = paused ? 'Play background motion' : 'Pause background motion';
    mt.setAttribute('aria-label', paused ? 'Play background motion' : 'Pause background motion');
    if (!paused) loop();
    else drawSky(performance.now(), true);
  }
  mt.addEventListener('click', function () { paused = !paused; applyMotion(); });
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', function (e) { reduced = e.matches; paused = e.matches; applyMotion(); });

  /* ---------- nav ---------- */
  var nav = $('#nav'), burger = $('#burger'), navLinks = $('#navLinks');
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    navLinks.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', navLinks).forEach(function (a) {
    a.addEventListener('click', function () {
      burger.setAttribute('aria-expanded', 'false'); navLinks.classList.remove('open'); document.body.style.overflow = '';
    });
  });

  /* ---------- starfield sky ---------- */
  var cv = $('#sky'), cx = cv.getContext('2d'), stars = [], shoot = null, W = 0, H = 0, dpr = 1;
  function sizeSky() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(clamp(W * H / 7000, 70, 220));
    stars = [];
    for (var i = 0; i < n; i++) {
      var z = Math.random();
      stars.push({ x: Math.random() * W, y: Math.random() * H * 1.4, z: z, r: .4 + z * 1.2, p: Math.random() * 6.28, s: .4 + Math.random() * 1.4, h: Math.random() < .2 ? 30 : 230 });
    }
  }
  var scrollY = window.scrollY, lastShoot = 0;
  function drawSky(t, still) {
    cx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = still ? .75 : .55 + .45 * Math.sin(t / 1000 * s.s + s.p);
      var y = ((s.y - scrollY * (.04 + s.z * .14)) % (H * 1.4) + H * 1.4) % (H * 1.4) - H * .2;
      cx.globalAlpha = tw * (.35 + s.z * .65);
      cx.fillStyle = s.h === 30 ? '#ffd9b0' : '#cfd6ff';
      cx.beginPath(); cx.arc(s.x, y, s.r, 0, 6.283); cx.fill();
    }
    if (!still) {
      if (!shoot && t - lastShoot > 7000 && Math.random() < .004) {
        shoot = { x: Math.random() * W * .8 + W * .2, y: Math.random() * H * .35, l: 0 }; lastShoot = t;
      }
      if (shoot) {
        shoot.l += 14; shoot.x -= 10; shoot.y += 5;
        var g = cx.createLinearGradient(shoot.x, shoot.y, shoot.x + 120, shoot.y - 60);
        g.addColorStop(0, 'rgba(255,240,220,.9)'); g.addColorStop(1, 'rgba(255,240,220,0)');
        cx.globalAlpha = clamp(1 - shoot.l / 420, 0, 1);
        cx.strokeStyle = g; cx.lineWidth = 1.5;
        cx.beginPath(); cx.moveTo(shoot.x, shoot.y); cx.lineTo(shoot.x + 120, shoot.y - 60); cx.stroke();
        if (shoot.l > 420) shoot = null;
      }
    }
    cx.globalAlpha = 1;
  }
  var raf = 0;
  function loop(t) {
    if (paused) { raf = 0; return; }
    drawSky(t || performance.now(), false);
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', function () { sizeSky(); drawSky(performance.now(), paused); });

  /* ---------- scroll driven: progress, nav, how-it-works, hypnogram ---------- */
  var bar = $('.scroll-progress i');
  var how = $('#how'), steps = $$('.step', how), layers = $$('.layer', how), howBar = $('#howBar');
  var curStep = -1;
  function setStep(i) {
    if (i === curStep) return;
    curStep = i;
    steps.forEach(function (s, k) {
      s.classList.toggle('on', k === i);
      $('.step-head', s).setAttribute('aria-expanded', String(k === i));
    });
    layers.forEach(function (l, k) { l.classList.toggle('on', k === i); });
  }
  steps.forEach(function (s, i) {
    $('.step-head', s).addEventListener('click', function () {
      // jump to the matching scroll position
      var r = how.getBoundingClientRect();
      var span = how.offsetHeight - window.innerHeight;
      var target = window.scrollY + r.top + span * ((i + .5) / 3);
      window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  // hypnogram
  var hypPath = $('#hypPath'), hypGhost = $('#hypGhost'), hypHead = $('#hypHead'), hypMarks = $('#hypMarks'), hyp = $('#hyp');
  var Y = { A: 40, R: 100, L: 170, D: 240 };
  var seq = [[0,'A'],[14,'L'],[28,'D'],[75,'L'],[88,'R'],[100,'L'],[118,'D'],[160,'L'],[178,'R'],[195,'L'],[215,'D'],[235,'L'],[262,'R'],[290,'L'],[310,'R'],[335,'L'],[360,'R'],[385,'L'],[405,'R'],[425,'L'],[450,'R'],[470,'A'],[480,'A']];
  var d = '', plen = 0, marks = [];
  seq.forEach(function (p, i) {
    var x = (p[0] / 480 * 1000).toFixed(1), y = Y[p[1]];
    d += (i === 0 ? 'M' + x + ' ' + y : ' H' + x + ' V' + y);
  });
  hypPath.setAttribute('d', d); hypGhost.setAttribute('d', d);
  var adapt = [[28,'D'],[88,'R'],[118,'D'],[178,'R'],[262,'R'],[450,'R']];
  adapt.forEach(function (a) {
    var el = document.createElement('i');
    el.style.left = (a[0] / 480 * 100) + '%'; el.style.top = (Y[a[1]] / 320 * 100) + '%';
    el.dataset.x = a[0] / 480; hypMarks.appendChild(el); marks.push(el);
  });
  function setHyp(p) {
    if (!plen) { plen = hypPath.getTotalLength(); hypPath.style.strokeDasharray = plen; }
    hypPath.style.strokeDashoffset = plen * (1 - p);
    var pt = hypPath.getPointAtLength(plen * p);
    hypHead.style.left = (pt.x / 1000 * 100) + '%'; hypHead.style.top = (pt.y / 320 * 100) + '%';
    marks.forEach(function (m) { m.classList.toggle('on', pt.x / 1000 >= parseFloat(m.dataset.x)); });
  }
  var hypDone = false;

  var ticking = false;
  function onScroll() {
    scrollY = window.scrollY;
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  function update() {
    ticking = false;
    var maxS = doc.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (maxS > 0 ? scrollY / maxS : 0) + ')';
    nav.classList.toggle('scrolled', scrollY > 30);
    // how
    var hr = how.getBoundingClientRect(), hs = how.offsetHeight - window.innerHeight;
    var hp = clamp(-hr.top / hs, 0, .9999);
    setStep(Math.floor(hp * 3));
    howBar.style.transform = 'scaleX(' + clamp(-hr.top / hs, 0, 1) + ')';
    // hypnogram: drawn as the figure travels through the viewport
    var r = hyp.getBoundingClientRect(), vh = window.innerHeight;
    var p = clamp((vh * .92 - r.top) / (vh * .62 + r.height * .3), 0, 1);
    if (reduced) p = 1;
    setHyp(p);
    // active nav link
    var cur = '';
    ['how', 'science', 'features', 'stories', 'plans'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < vh * .4) cur = id;
    });
    $$('a', navLinks).forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + cur); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- reveals ---------- */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.hasAttribute('data-count')) count(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' }) : null;
  $$('.reveal').forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); });
  var cio = io;
  function count(el) {
    var n = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
    if (reduced) { el.textContent = n + suf; return; }
    var t0 = performance.now(), dur = 1600;
    (function tick(t) {
      var k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(n * e) + suf;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  $$('[data-count]').forEach(function (el) {
    el.textContent = el.dataset.count + (el.dataset.suffix || ''); // real value is the default
    var host = el.closest('.reveal') || el;
    if (cio && !reduced) {
      var o = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { o.disconnect(); count(el); }
      }, { threshold: .6 });
      el.textContent = '0' + (el.dataset.suffix || '');
      o.observe(el);
    }
  });

  /* ---------- pointer effects ---------- */
  $$('[data-spot]').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  if (!coarse && !reduced) {
    $$('.magnet').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px');
        b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .28).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
    var hd = $('.hero-device'), tl = $('#tilt');
    hd.addEventListener('pointermove', function (e) {
      var r = hd.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      tl.style.transform = 'perspective(1000px) rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg)';
    });
    hd.addEventListener('pointerleave', function () { tl.style.transform = ''; });
    tl.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
  }

  /* ---------- phone live demo text ---------- */
  var states = [
    { t: '11:42', l: 'Winding down', s: 'Breathing 6 per minute', n: 'Dimming cues. Starting slow rain.', snd: 'Rain on slate' },
    { t: '12:31', l: 'Light sleep', s: 'Cycle 1 of 5', n: 'You settled. Easing the mix down 4 dB.', snd: 'Rain, softer' },
    { t: '2:14', l: 'Deep sleep', s: 'Cycle 2 of 5', n: 'Softening highs by 3 dB. Your breathing slowed.', snd: 'Tidal drift' },
    { t: '4:48', l: 'REM sleep', s: 'Cycle 4 of 5', n: 'Keeping it quiet so dreams stay uninterrupted.', snd: 'Low cabin hum' },
    { t: '6:41', l: 'Waking window', s: 'Lightest phase found', n: 'Bringing in sunrise and birdsong, gently.', snd: 'Dawn wind' }
  ];
  var si = 2, fadeEls = [$('#stageLabel'), $('#stageSub'), $('#sndName'), $('#scrNote')];
  function showState(i) {
    var s = states[i];
    $('#clockTime').textContent = s.t; $('#stageLabel').textContent = s.l; $('#stageSub').textContent = s.s;
    $('#scrNote').textContent = s.n; $('#sndName').textContent = s.snd;
  }
  if (!reduced) {
    setInterval(function () {
      if (paused || document.hidden) return;
      fadeEls.forEach(function (e) { e.style.opacity = 0; });
      setTimeout(function () {
        si = (si + 1) % states.length; showState(si);
        fadeEls.forEach(function (e) { e.style.opacity = 1; });
      }, 450);
    }, 4200);
  }

  /* ---------- billing toggle ---------- */
  var bM = $('#bMonthly'), bY = $('#bYearly'), pill = $('.billing .pill');
  function placePill() {
    var on = bY.getAttribute('aria-pressed') === 'true' ? bY : bM;
    pill.style.width = on.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + (on.offsetLeft - 5) + 'px)';
  }
  function setBilling(yearly) {
    bY.setAttribute('aria-pressed', String(yearly)); bM.setAttribute('aria-pressed', String(!yearly));
    placePill();
    $$('.amt[data-m]').forEach(function (a) { tween(a, parseFloat(a.dataset[yearly ? 'y' : 'm'])); });
    $$('.billed').forEach(function (b) { b.textContent = b.dataset[yearly ? 'y' : 'm']; });
  }
  function tween(el, to) {
    var from = parseFloat(el.textContent) || 0;
    if (reduced) { el.textContent = to.toFixed(2); return; }
    var t0 = performance.now(), dur = 700;
    (function tick(t) {
      var k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = (from + (to - from) * e).toFixed(2);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  bM.addEventListener('click', function () { setBilling(false); });
  bY.addEventListener('click', function () { setBilling(true); });
  window.addEventListener('resize', placePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);

  /* ---------- soundscape mixer (Web Audio, synthesised) ---------- */
  var AC = window.AudioContext || window.webkitAudioContext;
  var actx, master, tone, analyser, nodes = {}, active = {}, calm = .3;
  var vz = $('#viz'), vx = vz.getContext('2d'), vData, playing = 0, vraf = 0;
  var noteEl = $('#mixerNote'), calmNote = $('#calmNote');

  function noiseBuf(kind) {
    var len = actx.sampleRate * 4, b = actx.createBuffer(1, len, actx.sampleRate), o = b.getChannelData(0), last = 0;
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + .02 * w) / 1.02; o[i] = last * 3.5; }
      else if (kind === 'pink') {
        b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
        b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
        o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
      } else o[i] = w * .5;
    }
    // crossfade ends for a seamless loop
    var f = 2048; for (var j = 0; j < f; j++) { var k = j / f; o[len - f + j] = o[len - f + j] * (1 - k) + o[j] * k; }
    return b;
  }
  function src(kind) { var s = actx.createBufferSource(); s.buffer = noiseBuf(kind); s.loop = true; s.start(); return s; }
  function lfo(freq, depth, param) {
    var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); return o;
  }
  function build() {
    actx = new AC();
    master = actx.createGain(); master.gain.value = .5;
    tone = actx.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = .4;
    analyser = actx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = .82;
    vData = new Uint8Array(analyser.frequencyBinCount);
    tone.connect(master); master.connect(analyser); analyser.connect(actx.destination);
    function layer(name, g) { g.gain.value = 0; g.connect(tone); nodes[name] = g; }
    // rain
    var rg = actx.createGain(), rhp = actx.createBiquadFilter(), rlp = actx.createBiquadFilter();
    rhp.type = 'highpass'; rhp.frequency.value = 1200; rlp.type = 'lowpass'; rlp.frequency.value = 8000;
    src('white').connect(rhp); rhp.connect(rlp); rlp.connect(rg); layer('rain', rg); nodes.rainBase = .3;
    // ocean
    var og = actx.createGain(), oswell = actx.createGain(), olp = actx.createBiquadFilter();
    olp.type = 'lowpass'; olp.frequency.value = 600; oswell.gain.value = .6;
    src('brown').connect(olp); olp.connect(oswell); oswell.connect(og); lfo(.11, .4, oswell.gain); layer('ocean', og); nodes.oceanBase = 1.1;
    // wind
    var wg = actx.createGain(), wbp = actx.createBiquadFilter(); wbp.type = 'bandpass'; wbp.Q.value = 1.2; wbp.frequency.value = 420;
    src('pink').connect(wbp); wbp.connect(wg); lfo(.07, 260, wbp.frequency); layer('wind', wg); nodes.windBase = .9;
    // hum
    var hg = actx.createGain(), hlp = actx.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 400;
    [55, 55.4, 82.5, 110.2].forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain(); o.type = i > 1 ? 'sine' : 'triangle'; o.frequency.value = f; g.gain.value = i > 1 ? .05 : .09; o.connect(g); g.connect(hlp); o.start(); });
    hlp.connect(hg); layer('hum', hg); nodes.humBase = 1;
    applyCalm();
  }
  function applyCalm() {
    if (!actx) return;
    var t = actx.currentTime;
    tone.frequency.setTargetAtTime(9000 - calm * 7400, t, .3);       // softer highs as the night calms
    master.gain.setTargetAtTime(.62 - calm * .3, t, .3);               // quieter floor once settled
  }
  function setLayer(name, on) {
    var g = nodes[name]; if (!g) return;
    g.gain.setTargetAtTime(on ? nodes[name + 'Base'] : 0, actx.currentTime, on ? 1.2 : .6);
  }
  $$('.lyr').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!AC) { noteEl.textContent = 'Your browser does not support Web Audio.'; return; }
      if (!actx) build();
      if (actx.state === 'suspended') actx.resume();
      var name = b.dataset.layer, on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on)); $('small', b).textContent = on ? 'Playing' : 'Off';
      active[name] = on; setLayer(name, on);
      playing = Object.keys(active).filter(function (k) { return active[k]; }).length;
      noteEl.textContent = playing ? 'Drift is mixing ' + playing + ' layer' + (playing > 1 ? 's' : '') + ' live. Everything here is generated in your browser.' : 'Tap a layer to start. Headphones recommended, volume kept low.';
      startViz();
    });
  });
  var calmIn = $('#calm');
  function calmText() {
    calmNote.textContent = calm < .34 ? 'Drift is brightening the mix to mask your room.' : calm < .67 ? 'Settling in. Drift is rolling off the high end.' : 'Deep and calm. Drift keeps only a soft, low floor.';
  }
  calmIn.addEventListener('input', function () { calm = calmIn.value / 100; applyCalm(); calmText(); });
  calmText();

  function drawViz(t) {
    var w = vz.width, h = vz.height, n = 48;
    vx.clearRect(0, 0, w, h);
    var bw = w / n;
    if (analyser && playing) analyser.getByteFrequencyData(vData);
    var gr = vx.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#7f8cff'); gr.addColorStop(.6, '#c3a6ff'); gr.addColorStop(1, '#ffc98a');
    vx.fillStyle = gr;
    for (var i = 0; i < n; i++) {
      var v;
      if (playing) { var idx = Math.floor(Math.pow(i / n, 1.4) * vData.length * .7); v = vData[idx] / 255; v = Math.pow(v, 1.3); }
      else v = .06 + .04 * Math.sin(t / 900 + i * .5);
      var bh = Math.max(4, v * h * .9);
      var x = i * bw + bw * .2, r = (bw * .6) / 2;
      vx.beginPath(); vx.moveTo(x, h - 2); vx.lineTo(x, h - 2 - bh + r); vx.arc(x + r, h - 2 - bh + r, r, Math.PI, 0); vx.lineTo(x + 2 * r, h - 2); vx.closePath(); vx.fill();
    }
  }
  function startViz() {
    if (vraf) return;
    (function f(t) {
      drawViz(t);
      var keep = playing || (!paused && !reduced);
      vraf = keep ? requestAnimationFrame(f) : 0;
    })(performance.now());
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) startViz(); else if (!playing && vraf) { cancelAnimationFrame(vraf); vraf = 0; }
    }).observe(vz);
  } else startViz();
  drawViz(0);

  /* ---------- init ---------- */
  sizeSky();
  applyMotion();
  setBilling(true);
  update();
  window.addEventListener('load', function () { placePill(); update(); });
})();
