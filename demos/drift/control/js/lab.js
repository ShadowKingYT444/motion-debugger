/* Drift — soundscape lab: adaptive three-layer mix, visualised and (optionally) heard */
(function () {
  'use strict';
  var D = (window.Drift = window.Drift || {});
  D.state = D.state || { ambient: true };
  var $ = function (id) { return document.getElementById(id); };
  var TAU = Math.PI * 2;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var rest = $('rest'), noise = $('noise');
  if (!rest || !noise) return;
  var restOut = $('restOut'), noiseOut = $('noiseOut');
  var canvas = $('labCanvas'), ctx = canvas.getContext('2d');
  var soundBtn = $('soundBtn'), soundLabel = $('soundLabel'), soundIcon = $('soundIcon');
  var autoBtn = $('autoBtn');
  var caption = $('labCaption'), stateEl = $('labState');
  var bars = { rain: $('barRain'), ocean: $('barOcean'), hum: $('barHum') };
  var pcts = { rain: $('pctRain'), ocean: $('pctOcean'), hum: $('pctHum') };

  var auto = true, visible = false, playing = false;
  var cur = { r: 0.24, n: 0.18 };                       // slider values 0..1
  var mix = { rain: 0.2, ocean: 0.3, hum: 0.5, level: 0.4 }; // smoothed
  var lastCaption = '', lastState = '';

  /* ---------- the "AI": slider state -> mix ---------- */
  function compute(r, n) {
    var rain = 0.12 + 0.82 * n;
    var ocean = 0.2 + 0.62 * r * (1 - 0.35 * n);
    var hum = 0.14 + 0.7 * (1 - r) * (1 - 0.45 * n);
    var sum = rain + ocean + hum;
    return { rain: rain / sum, ocean: ocean / sum, hum: hum / sum, level: 0.34 + 0.5 * Math.max(n, r * 0.85) };
  }
  function restWord(v) { return v < 0.25 ? 'Settled' : v < 0.55 ? 'Stirring' : v < 0.8 ? 'Restless' : 'Tossing'; }
  function noiseWord(v) { return v < 0.2 ? 'Quiet' : v < 0.5 ? 'Murmur' : v < 0.75 ? 'Traffic' : 'Sirens'; }
  function describe(r, n) {
    if (r > 0.6 && n > 0.6) return ['Awake · 1:05 AM', 'A rough patch. Layering rain over slow swells until you settle.'];
    if (n > 0.6) return ['Light sleep · street noise', 'Street noise rising — adding rain to mask it in 0.8 seconds.'];
    if (r > 0.6) return ['Restless · 12:40 AM', 'You’re turning over. Slow ocean swells to pace your breathing.'];
    if (r < 0.3 && n < 0.35) return ['Deep sleep · 2:14 AM', 'Settling in — keeping it soft and low, with a warm hum.'];
    return ['Light sleep · 3:30 AM', 'Reading your breathing — easing the hum up for slow-wave sleep.'];
  }

  function paintSlider(el) { el.style.setProperty('--val', el.value + '%'); }
  function setFromSliders() {
    cur.r = rest.value / 100; cur.n = noise.value / 100;
    paintSlider(rest); paintSlider(noise);
    restOut.textContent = restWord(cur.r); noiseOut.textContent = noiseWord(cur.n);
  }
  function setAuto(on) {
    auto = on; autoBtn.setAttribute('aria-pressed', String(on));
  }
  function userTouched() { if (auto) setAuto(false); setFromSliders(); }
  rest.addEventListener('input', userTouched);
  noise.addEventListener('input', userTouched);
  autoBtn.addEventListener('click', function () { setAuto(!auto); });
  setFromSliders();

  /* ---------- canvas ---------- */
  var W = 0, H = 0, dpr = 1, drops = [];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drops = [];
    for (var i = 0; i < 150; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, v: 160 + Math.random() * 260, l: 10 + Math.random() * 26, k: Math.random() });
  }
  var lastT = 0;
  function draw(t, dt) {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);

    // faint time grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= 8; gx++) { var x = (gx / 8) * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    ctx.globalCompositeOperation = 'lighter';

    // HUM: broad, slow violet ribbons
    var ha = H * (0.035 + 0.12 * mix.hum);
    for (var b = 0; b < 3; b++) {
      ctx.beginPath();
      for (var x1 = 0; x1 <= W; x1 += 6) {
        var y1 = H * 0.42 + Math.sin(x1 * 0.012 + t * 0.55 + b * 1.4) * ha + Math.sin(x1 * 0.005 - t * 0.3 + b) * ha * 0.6;
        if (x1 === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
      }
      ctx.strokeStyle = 'rgba(' + (120 + b * 20) + ',' + (104 + b * 12) + ',255,' + (0.1 + 0.22 * mix.hum).toFixed(3) + ')';
      ctx.lineWidth = 16 - b * 4; ctx.lineJoin = 'round'; ctx.stroke();
      if (b === 2) { ctx.strokeStyle = 'rgba(190,180,255,' + (0.35 + 0.5 * mix.hum).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.stroke(); }
    }

    // OCEAN: swells with warm fill
    var oa = H * (0.04 + 0.16 * mix.ocean);
    for (var o = 0; o < 2; o++) {
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x2 = 0; x2 <= W; x2 += 6) {
        var y2 = H * (0.66 + o * 0.05) + Math.sin(x2 * 0.011 + t * (0.9 + o * 0.3) + o * 2) * oa + Math.sin(x2 * 0.027 - t * 0.7) * oa * 0.38;
        ctx.lineTo(x2, y2);
      }
      ctx.lineTo(W, H); ctx.closePath();
      var og = ctx.createLinearGradient(0, H * 0.45, 0, H);
      og.addColorStop(0, 'rgba(255,170,130,' + (0.12 + 0.34 * mix.ocean - o * 0.06).toFixed(3) + ')');
      og.addColorStop(1, 'rgba(255,120,150,0)');
      ctx.fillStyle = og; ctx.fill();
      if (o === 0) {
        ctx.beginPath();
        for (var x3 = 0; x3 <= W; x3 += 6) {
          var y3 = H * 0.66 + Math.sin(x3 * 0.011 + t * 0.9) * oa + Math.sin(x3 * 0.027 - t * 0.7) * oa * 0.38;
          if (x3 === 0) ctx.moveTo(x3, y3); else ctx.lineTo(x3, y3);
        }
        ctx.strokeStyle = 'rgba(255,205,170,' + (0.4 + 0.5 * mix.ocean).toFixed(3) + ')'; ctx.lineWidth = 1.8; ctx.stroke();
      }
    }

    // RAIN: streaks
    var active = Math.round(drops.length * clamp(mix.rain * 1.35, 0, 1));
    ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for (var i = 0; i < active; i++) {
      var d = drops[i];
      if (D.state.ambient) { d.y += d.v * dt; d.x -= d.v * dt * 0.14; }
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * (W + 60); }
      if (d.x < -10) d.x = W + 10;
      ctx.strokeStyle = 'rgba(190,225,255,' + (0.14 + 0.5 * mix.rain * (0.4 + 0.6 * d.k)).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.14, d.y + d.l); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // master level meter (right edge)
    var mh = H * 0.7 * mix.level;
    var mg = ctx.createLinearGradient(0, H - 18 - mh, 0, H - 18);
    mg.addColorStop(0, 'rgba(244,236,220,0.9)'); mg.addColorStop(1, 'rgba(244,236,220,0.15)');
    ctx.fillStyle = mg; ctx.fillRect(W - 14, H - 18 - mh, 3, mh);
  }

  function frame(now) {
    var tt = D.clock ? D.clock.t : now / 1000;
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    if (visible) {
      if (auto && D.state.ambient) {
        var ta = tt;
        var r = 0.5 + 0.46 * Math.sin(ta * 0.26), n = 0.5 + 0.46 * Math.sin(ta * 0.19 + 1.9);
        rest.value = Math.round(r * 100); noise.value = Math.round(n * 100);
        setFromSliders();
      }
      var m = compute(cur.r, cur.n), k = 1 - Math.pow(0.001, dt); // ~ smoothing
      mix.rain += (m.rain - mix.rain) * k; mix.ocean += (m.ocean - mix.ocean) * k;
      mix.hum += (m.hum - mix.hum) * k; mix.level += (m.level - mix.level) * k;
      draw(tt, D.state.ambient ? dt : 0);
      updateReadout(m);
      if (playing) updateAudio();
    }
    requestAnimationFrame(frame);
  }

  var readoutT = 0;
  function updateReadout(m) {
    var now = performance.now();
    if (now - readoutT < 90) return; readoutT = now;
    ['rain', 'ocean', 'hum'].forEach(function (k) {
      var p = Math.round(mix[k] * 100);
      bars[k].style.width = p + '%'; pcts[k].textContent = p + '%';
    });
    var d = describe(cur.r, cur.n);
    if (d[0] !== lastState) { lastState = d[0]; stateEl.textContent = d[0]; }
    if (d[1] !== lastCaption) { lastCaption = d[1]; caption.textContent = d[1]; }
  }

  var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) resize(); }, { threshold: 0.05 });
  io.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  /* ---------- audio (opt-in; generated in the browser) ---------- */
  var ac = null, nodes = null;
  function noiseBuffer(type, secs) {
    var len = Math.floor(ac.sampleRate * secs), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0), i;
    if (type === 'pink') {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      }
    } else {
      var last = 0;
      for (i = 0; i < len; i++) { var w2 = Math.random() * 2 - 1; last = (last + 0.02 * w2) / 1.02; d[i] = last * 3.5; }
    }
    var f = Math.floor(ac.sampleRate * 0.04);
    for (i = 0; i < f; i++) { var q = i / f; d[i] *= q; d[len - 1 - i] *= q; }
    return buf;
  }
  function loop(buf) { var s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

  function buildAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    ac = new Ctx();
    var master = ac.createGain(); master.gain.value = 0;
    var comp = ac.createDynamicsCompressor();
    master.connect(comp); comp.connect(ac.destination);

    // rain: pink noise, band-limited
    var rainSrc = loop(noiseBuffer('pink', 7));
    var rhp = ac.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 900;
    var rlp = ac.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 7500;
    var rainG = ac.createGain(); rainG.gain.value = 0;
    rainSrc.connect(rhp); rhp.connect(rlp); rlp.connect(rainG); rainG.connect(master);

    // ocean: brown noise with slow swell
    var oceanSrc = loop(noiseBuffer('brown', 9));
    var olp = ac.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 650;
    var swell = ac.createGain(); swell.gain.value = 0.62;
    var lfo = ac.createOscillator(); lfo.frequency.value = 0.085;
    var lfoDepth = ac.createGain(); lfoDepth.gain.value = 0.38;
    lfo.connect(lfoDepth); lfoDepth.connect(swell.gain); lfo.start();
    var oceanG = ac.createGain(); oceanG.gain.value = 0;
    oceanSrc.connect(olp); olp.connect(swell); swell.connect(oceanG); oceanG.connect(master);

    // hum: stacked low sines (root + fifth + octave), slow tremolo
    var humG = ac.createGain(); humG.gain.value = 0;
    var hlp = ac.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 340;
    var trem = ac.createGain(); trem.gain.value = 0.8;
    var tl = ac.createOscillator(); tl.frequency.value = 0.07;
    var td = ac.createGain(); td.gain.value = 0.2; tl.connect(td); td.connect(trem.gain); tl.start();
    [[55, 0.5], [82.5, 0.28], [110.4, 0.2], [164.9, 0.06]].forEach(function (p) {
      var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = p[0];
      var g = ac.createGain(); g.gain.value = p[1]; o.connect(g); g.connect(hlp); o.start();
    });
    hlp.connect(trem); trem.connect(humG); humG.connect(master);

    nodes = { master: master, rain: rainG, ocean: oceanG, hum: humG };
    return true;
  }
  function updateAudio() {
    if (!ac || !nodes) return;
    var t = ac.currentTime, lv = mix.level;
    nodes.rain.gain.setTargetAtTime(mix.rain * lv * 0.9, t, 0.3);
    nodes.ocean.gain.setTargetAtTime(mix.ocean * lv * 1.25, t, 0.3);
    nodes.hum.gain.setTargetAtTime(mix.hum * lv * 0.55, t, 0.3);
  }
  function setPlaying(on) {
    if (on) {
      if (!ac && !buildAudio()) { soundLabel.textContent = 'Not supported'; return; }
      ac.resume();
      playing = true; updateAudio();
      nodes.master.gain.setTargetAtTime(0.5, ac.currentTime, 0.8);
    } else {
      playing = false;
      if (nodes) nodes.master.gain.setTargetAtTime(0, ac.currentTime, 0.35);
      if (ac) setTimeout(function () { if (!playing) ac.suspend(); }, 1400);
    }
    soundBtn.setAttribute('aria-pressed', String(on));
    soundLabel.textContent = on ? 'Mute' : 'Listen';
    soundIcon.firstElementChild.setAttribute('href', on ? '#i-mute' : '#i-sound');
  }
  soundBtn.addEventListener('click', function () { setPlaying(!playing); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) setPlaying(false); });
  // stop the sound when the lab scrolls well out of view
  new IntersectionObserver(function (es) { if (!es[0].isIntersecting && playing) setPlaying(false); }, { rootMargin: '-30% 0px -30% 0px', threshold: 0 }).observe($('lab'));

  D.lab = { setAuto: setAuto };
})();
