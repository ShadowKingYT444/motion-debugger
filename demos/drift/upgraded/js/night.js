/* Drift — the signature scene: one illustrative night, scored.
 * Builds the hypnogram (sleep stages) and the sound stream (rain, ocean, hum, room noise) from data,
 * and exposes render(p) for scroll progress 0..1: the clock runs 10:00 PM → 6:24 AM, both charts draw to a
 * playhead, notes arrive as the playhead passes them, the phase copy swaps in place, and first light rises. */
(function () {
  'use strict';
  var D = (window.Drift = window.Drift || {});
  var $ = function (id) { return document.getElementById(id); };
  var plot = $('chartPlot');
  if (!plot) return;

  var TOT = 520;                       // minutes on the axis: 10:00 PM → 6:40 AM
  var END = 504;                       // the scene ends at 6:24 AM
  var X = function (m) { return (m / TOT) * 1000; };
  var Y = { A: 16, R: 72, L: 128, D: 184 };   // in the 0..200 viewBox (8%, 36%, 64%, 92%)
  var NAMES = { A: 'Awake', R: 'REM sleep', L: 'Light sleep', D: 'Deep sleep' };

  var drift = [[0, 'A'], [41, 'L'], [52, 'D'], [104, 'L'], [120, 'R'], [134, 'L'], [142, 'D'], [192, 'L'], [212, 'R'], [232, 'L'],
    [244, 'D'], [282, 'L'], [306, 'R'], [334, 'L'], [350, 'D'], [372, 'L'], [398, 'R'], [430, 'L'], [452, 'R'], [478, 'L'], [504, 'A'], [520, 'A']];
  var typical = [[0, 'A'], [56, 'L'], [74, 'D'], [94, 'L'], [114, 'R'], [128, 'L'], [146, 'A'], [153, 'L'], [178, 'D'], [196, 'L'], [228, 'R'],
    [250, 'L'], [268, 'A'], [280, 'L'], [308, 'D'], [322, 'L'], [348, 'R'], [374, 'L'], [400, 'A'], [410, 'L'], [440, 'R'], [462, 'L'], [482, 'A'], [520, 'A']];

  function stageAt(seq, m) { var s = seq[0][1]; for (var i = 0; i < seq.length; i++) if (seq[i][0] <= m) s = seq[i][1]; return s; }
  function stepPath(seq) {
    var d = 'M0 ' + Y[seq[0][1]];
    for (var i = 1; i < seq.length; i++) d += 'H' + X(seq[i][0]).toFixed(1) + 'V' + Y[seq[i][1]];
    return d;
  }

  // Grid: hour lines and stage rows.
  var NS = 'http://www.w3.org/2000/svg';
  var grid = $('hypGrid');
  function line(x1, y1, x2, y2, cls) { var l = document.createElementNS(NS, 'line'); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); l.setAttribute('class', cls); grid.appendChild(l); }
  Object.keys(Y).forEach(function (k) { line(0, Y[k], 1000, Y[k], 'row'); });
  [0, 120, 240, 360, 480].forEach(function (m) { line(X(m), 0, X(m), 200, 'hour'); });

  $('hypTypical').setAttribute('d', stepPath(typical));
  var dPath = stepPath(drift);
  $('hypGhost').setAttribute('d', dPath);
  $('hypDrift').setAttribute('d', dPath);
  $('hypGlow').setAttribute('d', dPath);
  // Stage blocks under the trace, coloured by stage (the data palette from PREMIUM.md).
  var blocks = $('hypBlocks');
  for (var b = 0; b < drift.length - 1; b++) {
    var r = document.createElementNS(NS, 'rect');
    var x0 = X(drift[b][0]), x1 = X(drift[b + 1][0]);
    r.setAttribute('x', x0.toFixed(1)); r.setAttribute('width', Math.max(0, x1 - x0).toFixed(1));
    r.setAttribute('y', Y[drift[b][1]] - 7); r.setAttribute('height', 14);
    r.setAttribute('class', 'blk-' + drift[b][1]);
    blocks.appendChild(r);
  }

  // Sound stream, minute by minute: the mix follows the stage, and rain swells to mask the 2:50 siren.
  var LV = {
    hum: { A: 0.22, L: 0.42, D: 0.74, R: 0.34 },
    ocean: { A: 0.42, L: 0.34, D: 0.2, R: 0.56 },
    rain: { A: 0.12, L: 0.22, D: 0.14, R: 0.2 }
  };
  var STEP = 2, N = TOT / STEP + 1, layers = { hum: [], ocean: [], rain: [] }, room = [];
  for (var i = 0; i < N; i++) {
    var m = i * STEP, s = stageAt(drift, m);
    var fadeIn = Math.min(1, Math.max(0.15, (m - 4) / 30));           // soundscape starts before the pillow
    var wake = m >= 496 ? Math.max(0.25, 1 - (m - 496) / 24) : 1;      // eases out inside the wake window
    var siren = Math.exp(-Math.pow((m - 291) / 5, 2));
    layers.hum.push(LV.hum[s] * fadeIn * wake);
    layers.ocean.push(LV.ocean[s] * fadeIn * wake);
    layers.rain.push((LV.rain[s] + 0.62 * siren) * fadeIn * wake);
    room.push(0.12 + 0.03 * Math.sin(m * 0.37) + 0.02 * Math.sin(m * 1.3) + 0.7 * Math.exp(-Math.pow((m - 290) / 2.2, 2)) + (m < 30 ? 0.12 : 0));
  }
  function smooth(arr, k) {
    var out = arr.slice(), a = 1 - k, j;
    for (j = 1; j < out.length; j++) out[j] = out[j - 1] * k + out[j] * a;
    for (j = out.length - 2; j >= 0; j--) out[j] = out[j + 1] * k + out[j] * a;
    return out;
  }
  layers.hum = smooth(layers.hum, 0.8); layers.ocean = smooth(layers.ocean, 0.8); layers.rain = smooth(layers.rain, 0.55);

  // Centred streamgraph in a 0..120 viewBox.
  var H = 120, mid = 64, SC = 72;
  var order = ['hum', 'ocean', 'rain'];
  var bands = { hum: [[], []], ocean: [[], []], rain: [[], []] };
  for (i = 0; i < N; i++) {
    var total = layers.hum[i] + layers.ocean[i] + layers.rain[i];
    var y = mid + (total * SC) / 2;
    order.forEach(function (k) {
      var y2 = y - layers[k][i] * SC;
      bands[k][0].push(y); bands[k][1].push(y2); y = y2;
    });
  }
  function area(lo, hi) {
    var d = 'M0 ' + lo[0].toFixed(1), j;
    for (j = 1; j < N; j++) d += 'L' + X(j * STEP).toFixed(1) + ' ' + lo[j].toFixed(1);
    for (j = N - 1; j >= 0; j--) d += 'L' + X(j * STEP).toFixed(1) + ' ' + hi[j].toFixed(1);
    return d + 'Z';
  }
  $('sHum').setAttribute('d', area(bands.hum[0], bands.hum[1]));
  $('sOcean').setAttribute('d', area(bands.ocean[0], bands.ocean[1]));
  $('sRain').setAttribute('d', area(bands.rain[0], bands.rain[1]));
  $('streamGhost').setAttribute('d', area(bands.hum[0], bands.rain[1]));
  var rd = 'M0 ' + (H - 8 - room[0] * 60).toFixed(1);
  for (i = 1; i < N; i++) rd += 'L' + X(i * STEP).toFixed(1) + ' ' + (H - 8 - room[i] * 60).toFixed(1);
  $('sRoom').setAttribute('d', rd);

  // ---- render(p) ----
  var hypDrawn = $('hypDrawn'), streamDrawn = $('streamDrawn'), playhead = $('playhead');
  var clockT = $('clockT'), clockAp = $('clockAp'), status = $('clockStatus');
  var notes = [].slice.call(plot.querySelectorAll('.notes li'));
  var phases = [].slice.call(document.querySelectorAll('#phases .phase'));
  var dawn = document.querySelector('.chart-dawn');
  var dot = playhead.querySelector('i');

  // Scroll is spent where the reading is: wind-down and wake get room, the middle of the night moves faster.
  var KEYS = [[0, 0], [0.2, 46], [0.8, 474], [1, END]];
  function minutesAt(p) {
    for (var k = 1; k < KEYS.length; k++) {
      if (p <= KEYS[k][0]) {
        var a = KEYS[k - 1], b = KEYS[k], t = (p - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return END;
  }
  function clock(m) {
    var mins = Math.round(22 * 60 + m), hh = Math.floor(mins / 60) % 24, mm = mins % 60;
    return [(hh % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm, hh >= 12 ? 'PM' : 'AM'];
  }
  function statusAt(m) {
    if (m >= 496) return 'Light sleep found · waking gently with sound and light';
    if (m >= 284 && m <= 300) return 'Siren outside · rain up, masked in 0.8 s';
    var s = stageAt(drift, m);
    if (s === 'A') return m < 30 ? 'Awake · winding down, lights at 20%' : 'Awake · Low tide starts, breathing 4-7-8';
    if (s === 'D') return 'Deep sleep · heart 52 bpm · easing the hum up';
    if (s === 'R') return 'REM sleep · slow ocean swells';
    return 'Light sleep · keeping it soft and low';
  }
  function smoothstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  var lastClock = '', lastStatus = '';
  function render(p) {
    p = Math.max(0, Math.min(1, p));
    var m = minutesAt(p), x = (m / TOT) * 100;
    var clip = 'inset(-12% ' + (100 - x).toFixed(2) + '% -12% 0)';
    hypDrawn.style.clipPath = clip;
    streamDrawn.style.clipPath = clip;
    playhead.style.transform = 'translate3d(' + (plot.clientWidth * x / 100).toFixed(1) + 'px,0,0)';
    dot.style.transform = 'translate3d(0,' + ((Y[stageAt(drift, m)] / 200) * plot.clientHeight).toFixed(1) + 'px,0)';
    var c = clock(m), cs = c[0] + c[1];
    if (cs !== lastClock) { lastClock = cs; clockT.textContent = c[0]; clockAp.textContent = c[1]; }
    var st = statusAt(m);
    if (st !== lastStatus) { lastStatus = st; status.textContent = st; }
    notes.forEach(function (n) { n.classList.toggle('on', m >= parseFloat(n.getAttribute('data-at')) - 0.5); });
    // Phase copy swaps in place around p = .2 and p = .8.
    var w = [1 - smoothstep(0.17, 0.21, p), smoothstep(0.17, 0.21, p) * (1 - smoothstep(0.77, 0.81, p)), smoothstep(0.77, 0.81, p)];
    phases.forEach(function (ph, k) {
      ph.style.opacity = w[k].toFixed(3);
      ph.style.transform = 'translate3d(0,' + ((1 - w[k]) * (k < active(w) ? -14 : 14)).toFixed(1) + 'px,0)';
      ph.setAttribute('aria-hidden', w[k] < 0.5 ? 'true' : 'false');
    });
    if (dawn) dawn.style.opacity = smoothstep(0.82, 1, p).toFixed(3);
    plot.classList.toggle('is-waking', m >= 500);
  }
  function active(w) { var a = 0; for (var k = 1; k < w.length; k++) if (w[k] > w[a]) a = k; return a; }

  // Static version (phones, reduced motion, no scroll scene): the whole night, every phase listed.
  function settle() {
    render(1);
    phases.forEach(function (ph) { ph.style.opacity = ''; ph.style.transform = ''; ph.removeAttribute('aria-hidden'); });
    clockT.textContent = '6:24'; clockAp.textContent = 'AM';
  }

  D.night = { render: render, settle: settle };
  settle();
  window.addEventListener('resize', function () { if (D.night.last != null) render(D.night.last); });
})();
