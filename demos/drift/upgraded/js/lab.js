/* Drift — soundscape lab: the adaptive three-layer mix, shown on the sheet and (optionally) heard.
 * Restlessness and room noise set the mix; the mix drives the lab sheet: rain = fine ripples,
 * ocean = long swells, hum = broad undulation and warm lamp light. */
(function () {
  'use strict';
  var D = (window.Drift = window.Drift || {});
  D.state = D.state || { ambient: true };
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var rest = $('rest'), noise = $('noise');
  if (!rest || !noise) return;
  var restOut = $('restOut'), noiseOut = $('noiseOut');
  var soundBtn = $('soundBtn'), soundLabel = $('soundLabel'), soundIcon = $('soundIcon');
  var autoBtn = $('autoBtn');
  var caption = $('labCaption'), stateEl = $('labState');
  var bars = { rain: $('barRain'), ocean: $('barOcean'), hum: $('barHum') };
  var pcts = { rain: $('pctRain'), ocean: $('pctOcean'), hum: $('pctHum') };
  var sheet = D.sheets && D.sheets.lab;

  var auto = !reduce.matches, visible = false, playing = false;
  var cur = { r: 0.24, n: 0.18 };
  var mix = { rain: 0.2, ocean: 0.3, hum: 0.5, level: 0.4 };
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
  function setAuto(on) { auto = on; autoBtn.setAttribute('aria-pressed', String(on)); if (on) kick(); }
  function userTouched() { if (auto) setAuto(false); setFromSliders(); kick(); }
  rest.addEventListener('input', userTouched);
  noise.addEventListener('input', userTouched);
  autoBtn.addEventListener('click', function () { setAuto(!auto); });
  setAuto(auto);
  setFromSliders();

  /* ---------- loop: smooth the mix, drive the sheet and the readout ---------- */
  var lastT = 0, autoT = 0, running = false;
  function frame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    if (auto && D.state.ambient && !reduce.matches) {
      autoT += dt;
      var r = 0.5 + 0.46 * Math.sin(autoT * 0.26 + 4.2), n = 0.5 + 0.46 * Math.sin(autoT * 0.19 + 5.1);
      rest.value = Math.round(r * 100); noise.value = Math.round(n * 100);
      setFromSliders();
    }
    var m = compute(cur.r, cur.n), k = 1 - Math.pow(0.02, dt);
    var settled = true;
    ['rain', 'ocean', 'hum', 'level'].forEach(function (key) {
      var d = m[key] - mix[key]; mix[key] += d * k; if (Math.abs(d) > 0.002) settled = false;
    });
    if (sheet) sheet.set({ mix: [mix.rain * 2.2, mix.ocean * 2, mix.hum * 1.6], warmth: mix.hum, amp: 0.75 + mix.level * 0.6 });
    updateReadout();
    if (playing) updateAudio();
    if (visible && (auto || !settled || playing)) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (running) return; running = true; lastT = performance.now(); requestAnimationFrame(frame); }

  var readoutT = 0;
  function updateReadout() {
    var now = performance.now();
    if (now - readoutT < 90) return; readoutT = now;
    ['rain', 'ocean', 'hum'].forEach(function (key) {
      var p = Math.round(mix[key] * 100);
      bars[key].style.transform = 'scaleX(' + (mix[key]).toFixed(3) + ')';
      pcts[key].textContent = p + '%';
    });
    var d = describe(cur.r, cur.n);
    if (d[0] !== lastState) { lastState = d[0]; stateEl.textContent = d[0]; }
    if (d[1] !== lastCaption) { lastCaption = d[1]; caption.textContent = d[1]; }
  }
  // Start from the computed mix so the first still is already right.
  (function () { var m0 = compute(cur.r, cur.n); mix.rain = m0.rain; mix.ocean = m0.ocean; mix.hum = m0.hum; mix.level = m0.level; readoutT = 0; updateReadout(); })();

  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0.05 }).observe($('lab'));
  document.addEventListener('drift:ambient', kick);

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
      playing = true; updateAudio(); kick();
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
