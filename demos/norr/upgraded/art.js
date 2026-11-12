/* Atelier Norr — built visuals. No stock, no images: SVG and canvas drawn from the brief.
 * Plates: five buildings at blue hour or winter day. Model: the process site model in isometric.
 * Everything here is deterministic (seeded) so every visit, and every critique, sees the same drawing.
 */
(function () {
  'use strict';

  var r2 = function (v) { return Math.round(v * 10) / 10; };
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pts(a) { return a.map(function (p) { return r2(p[0]) + ',' + r2(p[1]); }).join(' '); }
  function poly(a, attrs) { return '<polygon points="' + pts(a) + '" ' + (attrs || '') + '/>'; }
  function wrap(vb, inner) { return '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + inner + '</svg>'; }
  function lg(id, stops, x2, y2) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 === undefined ? 0 : x2) + '" y2="' + (y2 === undefined ? 1 : y2) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
  }
  function rg(id, color, a) { return '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + color + '" stop-opacity="' + a + '"/><stop offset=".45" stop-color="' + color + '" stop-opacity="' + (a * 0.32) + '"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></radialGradient>'; }
  function stars(rand, n, w, h, op) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<circle cx="' + r2(rand() * w) + '" cy="' + r2(Math.pow(rand(), 1.6) * h) + '" r="' + r2(0.6 + rand() * 1.3) + '" fill="#F4F7FA" opacity="' + r2((op || 0.8) * (0.35 + rand() * 0.65)) + '"/>';
    return s;
  }
  // A spruce: jagged tiers, lit on one side, optional snow on the tiers.
  function spruce(x, y, h, w, dark, lit, litLeft, snow) {
    var tiers = 6, L = [], R = [];
    for (var i = 1; i <= tiers; i++) {
      var ty = y - h + h * i / tiers, tw = w * (0.25 + 0.75 * i / tiers);
      L.push([x - tw, ty]); R.push([x + tw, ty]);
      if (i < tiers) { L.push([x - tw * 0.42, ty - h * 0.02]); R.push([x + tw * 0.42, ty - h * 0.02]); }
    }
    var top = [x, y - h - h * 0.04];
    var whole = [top].concat(L, R.slice().reverse());
    var half = litLeft ? [top].concat(L, [[x, y]]) : [top].concat(R, [[x, y]]);
    var out = '<rect x="' + r2(x - w * 0.07) + '" y="' + r2(y - 2) + '" width="' + r2(w * 0.14) + '" height="' + r2(h * 0.08) + '" fill="#2A1C12"/>';
    out += poly(whole, 'fill="' + dark + '"') + poly(half, 'fill="' + lit + '"');
    if (snow) {
      var sn = '';
      for (var j = 2; j <= tiers; j += 1) {
        var sy = y - h + h * j / tiers, sw = w * (0.25 + 0.75 * j / tiers);
        var sx0 = litLeft ? x - sw : x + sw * 0.1, sx1 = litLeft ? x - sw * 0.1 : x + sw;
        sn += '<path d="M' + r2(sx0) + ' ' + r2(sy) + ' Q' + r2((sx0 + sx1) / 2) + ' ' + r2(sy - h * 0.05) + ' ' + r2(sx1) + ' ' + r2(sy - h * 0.012) + '" stroke="' + snow + '" stroke-width="' + r2(Math.max(1.4, w * 0.09)) + '" stroke-linecap="round" fill="none"/>';
      }
      out += sn;
    }
    return out;
  }
  function figure(x, y, s, fill) {
    s = s || 1;
    return '<g fill="' + (fill || '#0B1520') + '"><circle cx="' + r2(x) + '" cy="' + r2(y - 15 * s) + '" r="' + r2(2.6 * s) + '"/><path d="M' + r2(x - 3 * s) + ' ' + r2(y - 11.5 * s) + 'h' + r2(6 * s) + 'l' + r2(1.2 * s) + ' ' + r2(11.5 * s) + 'h' + r2(-8.4 * s) + 'z"/></g>';
  }

  /* ---------------- 01 Fjordhall Library, Bodø: five arches at five scales, harbour at blue hour ---------------- */
  function fjordhall(p) {
    var rand = rng(11), base = 694, s = '';
    var defs = '<defs>' +
      lg(p + 'fs', [[0, '#0B1C2F'], [0.45, '#1B3A5E'], [0.78, '#55789B'], [0.92, '#C59A7E'], [1, '#EDBE8C']]) +
      lg(p + 'fw', [[0, '#2B4560'], [0.12, '#15293F'], [1, '#06111C']]) +
      lg(p + 'ft', [[0, '#6E4324'], [0.55, '#B07541'], [1, '#D9A062']]) +
      lg(p + 'fg', [[0, '#C9783A'], [0.5, '#F5B463'], [1, '#FFE4A8']]) +
      lg(p + 'fk', [[0, '#FFD08A', 0.55], [1, '#FFD08A', 0]]) +
      rg(p + 'fo', '#FFC877', 0.6) +
      '<pattern id="' + p + 'fr" width="1600" height="7" patternUnits="userSpaceOnUse"><rect width="1600" height="2.6" fill="#07121D" fill-opacity=".75"/></pattern>' +
      '</defs>';
    s += '<rect width="1600" height="' + base + '" fill="url(#' + p + 'fs)"/>';
    s += stars(rand, 46, 1600, 360, 0.7);
    s += '<path d="M0 640 L110 606 L210 626 L330 566 L430 612 L520 596 L640 640 L760 618 L880 646 L1000 600 L1120 632 L1260 584 L1380 622 L1500 600 L1600 618 V700 H0Z" fill="#1F3B58"/>';
    s += '<path d="M330 566 L290 590 L320 588 L350 600 Z M1260 584 L1215 610 L1250 606 L1280 620 Z M1000 600 L965 622 L995 620 Z" fill="#8FA6BC" opacity=".55"/>';
    s += '<path d="M0 668 L180 650 L360 664 L560 648 L760 666 L980 652 L1200 668 L1400 654 L1600 664 V700 H0Z" fill="#152C43"/>';
    for (var i = 0; i < 26; i++) { var lx = rand() * 1600; s += '<circle cx="' + r2(lx) + '" cy="' + r2(684 + rand() * 6) + '" r="1.5" fill="#FFD9A0" opacity="' + r2(0.5 + rand() * 0.5) + '"/>'; }
    s += '<rect y="' + base + '" width="1600" height="' + (1000 - base) + '" fill="url(#' + p + 'fw)"/>';
    // the building
    var A = [[1190, 232, 560], [930, 186, 432], [720, 150, 332], [550, 118, 252], [415, 92, 182]];
    var b = '';
    A.forEach(function (a) { b += '<ellipse cx="' + a[0] + '" cy="' + r2(base - a[2] * 0.42) + '" rx="' + r2(a[1] * 1.7) + '" ry="' + r2(a[2] * 0.8) + '" fill="url(#' + p + 'fo)" style="mix-blend-mode:screen"/>'; });
    b += '<rect x="300" y="' + (base - 18) + '" width="1150" height="18" fill="#1A120C"/><rect x="300" y="' + (base - 15) + '" width="1150" height="6" fill="#FFC877" opacity=".75"/>';
    A.forEach(function (a, k) {
      var cx = a[0], hs = a[1], h = a[2], t = 14 + (4 - k) * 2.5, hi = hs - t, hh = h - t * 1.15;
      b += '<path d="M' + (cx - hs) + ' ' + base + ' Q' + cx + ' ' + (base - 2 * h) + ' ' + (cx + hs) + ' ' + base + 'Z" fill="url(#' + p + 'ft)"/>';
      b += '<path d="M' + r2(cx - hi) + ' ' + base + ' Q' + cx + ' ' + r2(base - 2 * hh) + ' ' + r2(cx + hi) + ' ' + base + 'Z" fill="url(#' + p + 'fg)"/>';
      var m = '', step = hi / 6;
      for (var x = cx - hi + step; x < cx + hi - 1; x += step) { var top = base - hh * (1 - Math.pow((x - cx) / hi, 2)); m += 'M' + r2(x) + ' ' + r2(top) + 'V' + base; }
      [0.34, 0.64].forEach(function (f) { if (hh * f > 60) { var yy = base - hh * f, half = hi * Math.sqrt(1 - f); m += 'M' + r2(cx - half) + ' ' + r2(yy) + 'H' + r2(cx + half); } });
      b += '<path d="' + m + '" stroke="#6E401C" stroke-width="2.4" opacity=".75" fill="none"/>';
      b += '<path d="M' + r2(cx - hs + t * 0.5) + ' ' + base + ' Q' + cx + ' ' + r2(base - 2 * (h - t * 0.55)) + ' ' + r2(cx + hs - t * 0.5) + ' ' + base + '" stroke="#5A3418" stroke-width="1" opacity=".55" fill="none"/>';
      b += '<path d="M' + r2(cx - hi) + ' ' + base + ' Q' + cx + ' ' + r2(base - 2 * hh) + ' ' + r2(cx + hi) + ' ' + base + '" stroke="#FFE6B8" stroke-width="1.6" opacity=".7" fill="none"/>';
      if (k < 3) for (var q = 0; q < 3; q++) b += figure(cx - hi * 0.5 + q * hi * 0.45 + rand() * 10, base - 2, 0.9, '#3A2312');
    });
    s += '<g id="' + p + 'fb">' + b + '</g>';
    // reflection, broken by ripples
    s += '<g opacity=".5"><use href="#' + p + 'fb" transform="matrix(1 0 0 -.62 0 ' + r2(base * 1.62) + ')"/></g>';
    s += '<rect x="0" y="' + (base + 2) + '" width="1600" height="' + (998 - base) + '" fill="url(#' + p + 'fr)"/>';
    A.forEach(function (a) { s += '<rect x="' + r2(a[0] - a[1] * 0.25) + '" y="' + base + '" width="' + r2(a[1] * 0.5) + '" height="' + r2(150 + a[2] * 0.3) + '" fill="url(#' + p + 'fk)" opacity=".35" style="mix-blend-mode:screen"/>'; });
    s += '<rect x="0" y="' + (base - 2) + '" width="1600" height="6" fill="#18242F"/><rect x="0" y="' + (base - 3) + '" width="1600" height="2" fill="#D8E2EA" opacity=".8"/>';
    s += figure(250, base - 3, 1.1) + figure(268, base - 3, 1) + figure(1490, base - 3, 1.1);
    return wrap('0 0 1600 1000', defs + s);
  }

  /* ---------------- 02 Kvarv Chapel, Røros: larch A-frame, one slit of light, the valley at night ---------------- */
  function kvarv(p) {
    var rand = rng(23), s = '';
    var defs = '<defs>' +
      lg(p + 'ks', [[0, '#061426'], [0.55, '#122B49'], [1, '#33557A']]) +
      lg(p + 'kn', [[0, '#647D96'], [1, '#C5D3DE']]) +
      lg(p + 'kl', [[0, '#3E2715'], [0.5, '#6E4426'], [1, '#A36A3B']]) +
      lg(p + 'kt', [[0, '#FFF2CC'], [1, '#FFC877']]) +
      lg(p + 'kb', [[0, '#FFD38C', 0.85], [1, '#FFD38C', 0]]) +
      rg(p + 'ko', '#FFC06A', 0.75) +
      '</defs>';
    s += '<rect width="1000" height="880" fill="url(#' + p + 'ks)"/>' + stars(rand, 80, 1000, 560, 0.9);
    s += '<path d="M0 720 L120 610 L210 652 L330 520 L420 600 L520 556 L640 650 L760 536 L860 602 L1000 560 V880 H0Z" fill="#1C3856"/>';
    s += '<path d="M330 520 L289 565 L300 560 L312 572 L326 558 L342 570 L356 556 L380 565Z M760 536 L724 570 L736 566 L748 578 L764 564 L780 574 L794 562 L811 570Z M120 610 L92 636 L104 632 L116 640 L130 630 L150 638 L176 636Z M520 556 L470 578 L486 574 L500 582 L514 572 L532 580 L548 578Z" fill="#8FA8C0" opacity=".7"/>';
    s += '<path d="M0 806 C200 760 380 792 520 772 C700 746 850 792 1000 762 V880 H0Z" fill="#284664"/>';
    s += '<path d="M0 866 C250 826 600 856 1000 834 V1250 H0Z" fill="url(#' + p + 'kn)"/>';
    var trees = [[40, 880, 190, 34], [92, 870, 150, 28], [150, 884, 210, 36], [212, 872, 130, 24], [258, 886, 96, 18], [742, 870, 104, 20], [800, 878, 170, 30], [866, 868, 220, 38], [930, 880, 160, 28], [980, 872, 120, 22]];
    trees.forEach(function (t) { s += spruce(t[0], t[1], t[2], t[3], '#0B1E1E', '#24413D', true, '#A9BBCB'); });
    // the chapel
    var ax = 500, ay = 330, by = 1004, hw = 215, c = '';
    c += poly([[ax, ay], [ax - hw, by], [ax + hw, by]], 'fill="url(#' + p + 'kl)"');
    var bl = '';
    for (var x = ax - hw + 14; x < ax + hw - 6; x += 13) { var top = ay + Math.abs(x - ax) / hw * (by - ay); bl += 'M' + r2(x) + ' ' + r2(top) + 'V' + by; }
    c += '<path d="' + bl + '" stroke="#2A190C" stroke-width="1.4" opacity=".5" fill="none"/>';
    c += '<ellipse cx="500" cy="700" rx="230" ry="420" fill="url(#' + p + 'ko)" opacity=".55" style="mix-blend-mode:screen"/>';
    c += '<path d="M' + ax + ' ' + ay + ' L' + (ax - hw) + ' ' + by + ' M' + ax + ' ' + ay + ' L' + (ax + hw) + ' ' + by + '" stroke="#1E120A" stroke-width="13" fill="none"/>';
    c += '<path d="M' + (ax - 4) + ' ' + (ay + 12) + ' L' + (ax - hw + 5) + ' ' + (by - 2) + '" stroke="#C48A52" stroke-width="2" opacity=".7" fill="none"/>';
    c += '<ellipse cx="500" cy="690" rx="80" ry="360" fill="url(#' + p + 'ko)" style="mix-blend-mode:screen"/>';
    c += '<rect x="493" y="372" width="14" height="632" fill="url(#' + p + 'kt)"/>';
    c += '<rect x="497.5" y="380" width="5" height="620" fill="#FFFBEF" opacity=".9"/>';
    s += c;
    s += '<path d="M120 1040 C220 1012 330 996 420 998 C470 999 490 994 500 994 C530 994 580 998 640 1000 C730 1004 820 1020 900 1046 C760 1052 300 1052 120 1040Z" fill="#9DB1C3"/>';
    s += poly([[488, 1000], [512, 1000], [640, 1250], [360, 1250]], 'fill="url(#' + p + 'kb)" style="mix-blend-mode:screen"');
    s += '<ellipse cx="500" cy="1012" rx="300" ry="46" fill="url(#' + p + 'ko)" opacity=".7" style="mix-blend-mode:screen"/>';
    return wrap('0 0 1000 1250', defs + s);
  }

  /* ---------------- 03 Tromsø Culture House: three saw-teeth, north clerestories lit, aurora ---------------- */
  function tromso(p) {
    var rand = rng(37), s = '', g = 816, D = 230, low = 140, high = 330;
    var P = function (x, y, z) { return [x + 0.42 * y, g - z - 0.24 * y]; };
    var defs = '<defs>' +
      lg(p + 'ts', [[0, '#030B15'], [0.55, '#0A1C30'], [1, '#18354F']]) +
      lg(p + 'ta', [[0, '#7CFFD0', 0], [0.5, '#7CFFD0', 0.22], [0.86, '#9BFFDC', 0.72], [1, '#3DBFA0', 0]]) +
      lg(p + 'tb', [[0, '#8EC9FF', 0], [0.7, '#7AE6D2', 0.4], [1, '#7AE6D2', 0]]) +
      lg(p + 'tn', [[0, '#2E4963'], [1, '#6F889E']]) +
      lg(p + 'tw', [[0, '#64412A'], [1, '#3A2414']]) +
      lg(p + 'tg', [[0, '#FFE8B0'], [1, '#F2A14D']]) +
      lg(p + 'tr', [[0, '#9FB2C4'], [1, '#D9E3EB']], 1, 0) +
      rg(p + 'to', '#FFC06A', 0.7) +
      '<pattern id="' + p + 'tp" width="11" height="400" patternUnits="userSpaceOnUse"><rect width="2" height="400" fill="#C8FFEA" opacity=".35"/></pattern>' +
      '<clipPath id="' + p + 'tc"><path d="M-40 330 C260 210 520 360 820 250 C1100 150 1350 300 1650 210 C1850 150 2000 200 2140 170 L2140 300 C2000 330 1850 280 1650 340 C1350 430 1100 280 820 380 C520 490 260 340 -40 460Z"/></clipPath>' +
      '</defs>';
    s += '<rect width="2100" height="760" fill="url(#' + p + 'ts)"/>' + stars(rand, 110, 2100, 520, 0.85);
    s += '<path d="M200 160 C500 80 800 190 1100 120 C1400 60 1700 140 2000 90 L2000 150 C1700 200 1400 120 1100 190 C800 260 500 150 200 230Z" fill="url(#' + p + 'tb)" opacity=".7" style="mix-blend-mode:screen"/>';
    s += '<path d="M-40 330 C260 210 520 360 820 250 C1100 150 1350 300 1650 210 C1850 150 2000 200 2140 170 L2140 300 C2000 330 1850 280 1650 340 C1350 430 1100 280 820 380 C520 490 260 340 -40 460Z" fill="url(#' + p + 'ta)" style="mix-blend-mode:screen"/>';
    s += '<g clip-path="url(#' + p + 'tc)" style="mix-blend-mode:screen"><rect x="-40" y="140" width="2200" height="360" fill="url(#' + p + 'tp)" opacity=".6"/></g>';
    s += '<path d="M1280 764 L1550 470 L1630 432 L1700 452 L2100 700 V764Z" fill="#14283D"/>';
    s += '<path d="M1630 432 L1552 472 L1500 548 L1588 512 L1640 586 L1662 500 L1700 452Z" fill="#6A86A1" opacity=".55"/>';
    s += '<path d="M0 704 L180 646 L360 684 L520 636 L760 704 L900 690 L1100 716 L1300 700 V764 H0Z" fill="#11233A"/>';
    s += '<rect y="722" width="2100" height="44" fill="#08131F"/>';
    for (var i = 0; i < 60; i++) { var lx = rand() * 2100; s += '<circle cx="' + r2(lx) + '" cy="' + r2(714 + rand() * 6) + '" r="1.6" fill="#FFD9A0" opacity="' + r2(0.55 + rand() * 0.45) + '"/><rect x="' + r2(lx - 0.8) + '" y="724" width="1.6" height="' + r2(10 + rand() * 26) + '" fill="#FFD9A0" opacity=".28"/>'; }
    s += '<rect y="764" width="2100" height="136" fill="url(#' + p + 'tn)"/>';
    s += '<ellipse cx="1120" cy="840" rx="620" ry="70" fill="url(#' + p + 'to)" opacity=".75" style="mix-blend-mode:screen"/>';
    // building in oblique projection, seen from the north-west so the clerestories face us
    var x0s = [600, 960, 1320], W = 360, xe = 1680, b = '';
    x0s.forEach(function (x0) { b += poly([P(x0, 0, low), P(x0 + W, 0, high), P(x0 + W, D, high), P(x0, D, low)], 'fill="url(#' + p + 'tr)"'); b += '<path d="M' + pts([P(x0, 0, low), P(x0 + W, 0, high)]).replace(' ', ' L') + '" stroke="#F4F8FB" stroke-width="2.4" fill="none"/>'; });
    b += poly([P(xe, 0, 0), P(xe, D, 0), P(xe, D, low), P(xe, 0, low)], 'fill="#2A1A0E"');
    x0s.forEach(function (x0) {
      var x1 = x0 + W, ml = '';
      b += '<ellipse cx="' + r2(P(x1, D / 2, (low + high) / 2)[0]) + '" cy="' + r2(P(x1, D / 2, (low + high) / 2)[1]) + '" rx="170" ry="190" fill="url(#' + p + 'to)" style="mix-blend-mode:screen"/>';
      b += poly([P(x1, 0, low), P(x1, 0, high), P(x1, D, high), P(x1, D, low)], 'fill="url(#' + p + 'tg)"');
      for (var yy = D / 7; yy < D - 1; yy += D / 7) { var a = P(x1, yy, low), c = P(x1, yy, high); ml += 'M' + r2(a[0]) + ' ' + r2(a[1]) + 'L' + r2(c[0]) + ' ' + r2(c[1]); }
      var t1 = P(x1, 0, (low + high) / 2), t2 = P(x1, D, (low + high) / 2);
      ml += 'M' + r2(t1[0]) + ' ' + r2(t1[1]) + 'L' + r2(t2[0]) + ' ' + r2(t2[1]);
      b += '<path d="' + ml + '" stroke="#7A4A22" stroke-width="2.2" opacity=".75" fill="none"/>';
    });
    // front wall with its zig-zag top
    var front = [P(600, 0, 0), P(600, 0, low), P(960, 0, high), P(960, 0, low), P(1320, 0, high), P(1320, 0, low), P(1680, 0, high), P(1680, 0, 0)];
    b += poly(front, 'fill="url(#' + p + 'tw)"');
    var zt = function (x) { var k = (x - 600) % 360; return low + k / 360 * (high - low); }, bl = '';
    for (var x = 610; x < 1680; x += 12) { var q = P(x, 0, zt(x)); bl += 'M' + r2(q[0]) + ' ' + r2(q[1]) + 'V' + g; }
    b += '<path d="' + bl + '" stroke="#24150A" stroke-width="1.3" opacity=".55" fill="none"/>';
    b += '<rect x="650" y="' + (g - 92) + '" width="540" height="92" fill="url(#' + p + 'tg)" opacity=".95"/>';
    b += '<path d="M' + [710, 770, 830, 890, 950, 1010, 1070, 1130].map(function (x) { return x + ' ' + (g - 92) + 'V' + g; }).join('M') + 'M650 ' + (g - 60) + 'H1190" stroke="#6B3E1A" stroke-width="2.4" opacity=".7" fill="none"/>';
    b += '<ellipse cx="920" cy="' + (g - 40) + '" rx="340" ry="110" fill="url(#' + p + 'to)" style="mix-blend-mode:screen"/>';
    b += '<rect x="590" y="' + g + '" width="1100" height="6" fill="#0E0905"/>';
    s += b;
    [700, 720, 760, 905, 925, 1050, 1078, 1150].forEach(function (x, k) { s += figure(x, g - 1, 1.05 + (k % 3) * 0.08, '#2A160A'); });
    return wrap('0 0 2100 900', defs + s);
  }

  /* ---------------- 04 Villa Sæter, Hemsedal: a mono-pitch house leaning into the slope, winter noon ---------------- */
  function saeter(p) {
    var rand = rng(41), s = '';
    var defs = '<defs>' +
      lg(p + 'vs', [[0, '#557FA8'], [0.55, '#99B7D0'], [1, '#EAD5BA']]) +
      '<radialGradient id="' + p + 'vu" cx="1" cy=".58" r=".75"><stop offset="0" stop-color="#FFF0D2" stop-opacity=".95"/><stop offset=".35" stop-color="#FFE2B4" stop-opacity=".4"/><stop offset="1" stop-color="#FFE2B4" stop-opacity="0"/></radialGradient>' +
      lg(p + 'vn', [[0, '#B9C9D6'], [1, '#F8F6F1']], 1, 0.35) +
      lg(p + 'vp', [[0, '#E4B97F'], [1, '#C38B50']]) +
      lg(p + 'vg', [[0, '#8FB0C9'], [0.45, '#C6D5DF'], [0.62, '#F3D7A4'], [1, '#E3A863']]) +
      '</defs>';
    s += '<rect width="1000" height="1400" fill="url(#' + p + 'vs)"/><rect width="1000" height="1400" fill="url(#' + p + 'vu)"/>';
    s += '<path d="M0 640 L150 560 L300 612 L450 520 L620 602 L780 540 L1000 604 V780 H0Z" fill="#94AEC5"/>';
    s += '<path d="M450 520 L520 560 L500 600 L560 584 L620 602 Z M780 540 L850 566 L830 590 L900 584 Z M150 560 L210 586 L196 604 L240 596 Z" fill="#F1F4F6" opacity=".85"/>';
    var f = 'M0 744';
    for (var x = 0; x <= 1000; x += 18) f += ' L' + x + ' ' + r2(722 + Math.sin(x * 0.03) * 6 - rand() * 22) + ' L' + (x + 9) + ' ' + r2(744 + Math.sin(x * 0.02) * 4);
    s += '<path d="' + f + ' V820 H0Z" fill="#46606F"/>';
    var slope = function (x) { return 762 + 0.22 * x; };
    s += '<path d="M0 ' + slope(0) + ' L1000 ' + slope(1000) + ' V1400 H0Z" fill="url(#' + p + 'vn)"/>';
    [[60, 250, 30], [118, 190, 24], [170, 150, 20]].forEach(function (t) { s += '<path d="M' + t[0] + ' ' + r2(slope(t[0])) + ' l-150 30 l4 6 z" fill="#8EA4B8" opacity=".45"/>' + spruce(t[0], slope(t[0]) + 4, t[1], t[2], '#1F3836', '#3D5E52', false, '#FBFCFC'); });
    [[905, 160, 22], [962, 120, 18]].forEach(function (t) { s += spruce(t[0], slope(t[0]) + 4, t[1], t[2], '#1F3836', '#3D5E52', false, '#FBFCFC'); });
    // house
    var h = '';
    h += poly([[250, 738], [790, 568], [790, 902], [636, 902], [250, slope(250)]], 'fill="url(#' + p + 'vp)"');
    var bl = '';
    for (var bx = 262; bx < 640; bx += 13) { var top = 738 - (bx - 250) * (170 / 540); bl += 'M' + bx + ' ' + r2(top) + 'V' + r2(Math.min(902, slope(bx))); }
    h += '<path d="' + bl + '" stroke="#A06D3A" stroke-width="1.3" opacity=".5" fill="none"/>';
    h += '<rect x="318" y="744" width="46" height="62" fill="#33495A"/><rect x="318" y="744" width="46" height="62" fill="none" stroke="#7A532E" stroke-width="4"/>';
    h += poly([[640, 615], [790, 568], [790, 902], [640, 902]], 'fill="url(#' + p + 'vg)"');
    h += '<rect x="668" y="842" width="96" height="6" fill="#3B2A1C"/><rect x="676" y="848" width="4" height="40" fill="#3B2A1C"/><rect x="752" y="848" width="4" height="40" fill="#3B2A1C"/>';
    h += poly([[700, 842], [764, 842], [790, 826], [726, 826]], 'fill="#FFE7B8" opacity=".75"');
    h += '<ellipse cx="716" cy="770" rx="7" ry="5" fill="#FFF3D6"/><path d="M716 615V765" stroke="#3B2A1C" stroke-width="1.2"/>';
    h += '<path d="M690 600V902M740 584V902M640 760H790" stroke="#5A3A20" stroke-width="4" fill="none"/>';
    h += poly([[226, 746], [818, 560], [820, 538], [226, 724]], 'fill="#5E3E25"');
    h += '<path d="M222 724 Q220 700 246 698 L812 514 Q838 512 832 540 L820 540 L226 726Z" fill="#FBFCFD"/>';
    h += '<path d="M226 726 L820 540" stroke="#BAC9D6" stroke-width="3" fill="none"/>';
    h += '<rect x="630" y="902" width="160" height="12" fill="#4A3E33"/>';
    h += '<rect x="790" y="896" width="176" height="11" fill="#B9844C"/><rect x="790" y="892" width="176" height="5" fill="#FBFCFD"/>';
    h += '<rect x="884" y="907" width="7" height="' + r2(slope(884) - 907) + '" fill="#7A5432"/><rect x="954" y="907" width="7" height="' + r2(slope(954) - 907) + '" fill="#7A5432"/>';
    var rl = 'M792 856H966';
    for (var rx = 806; rx < 966; rx += 16) rl += 'M' + rx + ' 856V893';
    h += '<path d="' + rl + '" stroke="#8A5A30" stroke-width="2.4" fill="none"/>';
    s += h;
    s += '<path d="M236 ' + r2(slope(236) + 1) + ' Q246 ' + r2(slope(246) - 12) + ' 262 ' + r2(slope(262) - 8) + ' L640 ' + r2(slope(640) - 4) + ' L650 ' + r2(slope(650) + 2) + 'Z" fill="#F7F7F3"/>';
    var dots = '';
    for (var d = 0; d < 9; d++) { var dx = 930 - d * 38, dy = slope(dx) + 30 + d * 24; dots += '<ellipse cx="' + r2(dx + (d % 2) * 10) + '" cy="' + r2(dy) + '" rx="5" ry="2.4" fill="#A9BCCB"/>'; }
    s += dots;
    return wrap('150 380 800 1000', defs + s);
  }

  /* ---------------- 05 Skog School, Lillehammer: Falu red, glulam columns on a grid, a courtyard of birches ---------------- */
  function skog(p) {
    var rand = rng(53), s = '';
    var defs = '<defs>' +
      lg(p + 'ss', [[0, '#7DA2C2'], [0.65, '#C6D6E2'], [1, '#EEE6D9']]) +
      lg(p + 'sn', [[0, '#D5DFE7'], [1, '#F8F9F7']]) +
      lg(p + 'sr', [[0, '#A63C2C'], [1, '#86301F']]) +
      lg(p + 'sw', [[0, '#FFD99E'], [1, '#EFAE62']]) +
      lg(p + 'sc', [[0, '#4D6574'], [1, '#93AAB8']]) +
      lg(p + 'sg', [[0, '#E6B576'], [1, '#B67C42']], 1, 0) +
      '</defs>';
    s += '<rect width="1600" height="660" fill="url(#' + p + 'ss)"/>';
    s += '<path d="M0 560 C300 520 600 546 900 520 C1200 498 1400 530 1600 514 V660 H0Z" fill="#8DA5B8"/>';
    var f = 'M0 604';
    for (var x = 0; x <= 1600; x += 16) f += ' L' + (x + 8) + ' ' + r2(576 - rand() * 26) + ' L' + (x + 16) + ' ' + r2(602 + rand() * 4);
    s += '<path d="' + f + ' V660 H0Z" fill="#344C58"/>';
    s += '<rect y="630" width="1600" height="370" fill="url(#' + p + 'sn)"/>';
    // the school
    var b = '';
    b += '<rect x="150" y="422" width="1300" height="20" fill="#F7F9FA"/><rect x="150" y="440" width="1300" height="8" fill="#97A6B2"/><rect x="160" y="448" width="1280" height="10" fill="#561C14"/>';
    b += '<rect x="170" y="458" width="1260" height="150" fill="url(#' + p + 'sr)"/>';
    var bl = '';
    for (var bx = 178; bx < 1430; bx += 9) bl += 'M' + bx + ' 458V608';
    b += '<path d="' + bl + '" stroke="#5E1F15" stroke-width="1" opacity=".45" fill="none"/>';
    for (var w = 0; w < 13; w++) {
      var wx = 214 + w * 94, lit = (w % 4 === 1 || w === 7);
      b += '<rect x="' + wx + '" y="486" width="58" height="84" fill="url(#' + p + (lit ? 'sw' : 'sc') + ')"/>';
      b += '<path d="M' + wx + ' 486h58v84h-58zM' + (wx + 29) + ' 486v84M' + wx + ' 526h58" stroke="#F3EFE7" stroke-width="5" fill="none"/>';
    }
    b += '<rect x="170" y="616" width="1260" height="146" fill="#5E2219"/>';
    for (var gx = 0; gx < 12; gx++) b += '<rect x="' + (204 + gx * 104) + '" y="636" width="78" height="126" fill="url(#' + p + 'sw)" opacity="' + (gx % 3 === 2 ? 0.6 : 0.92) + '"/>';
    b += '<rect x="170" y="604" width="1260" height="16" fill="url(#' + p + 'sg)"/><path d="M170 609H1430M170 614H1430" stroke="#9C6634" stroke-width="1" opacity=".6"/>';
    for (var c = 0; c < 13; c++) b += '<rect x="' + (184 + c * 104) + '" y="620" width="16" height="142" fill="url(#' + p + 'sg)"/><rect x="' + (196 + c * 104) + '" y="620" width="4" height="142" fill="#8C5A2C" opacity=".6"/>';
    b += '<rect x="160" y="762" width="1280" height="8" fill="#56636C"/><path d="M150 770 Q800 752 1450 770 V778 H150Z" fill="#FBFCFC"/>';
    s += b;
    [[520, 772, '#2E5C8A'], [548, 772, '#D9A262'], [1012, 772, '#3B6E5A']].forEach(function (k) { s += '<g><circle cx="' + k[0] + '" cy="' + (k[1] - 21) + '" r="3.4" fill="#2A2018"/><path d="M' + (k[0] - 4.5) + ' ' + (k[1] - 17) + 'h9l1.6 11h-12.2z" fill="' + k[2] + '"/><rect x="' + (k[0] - 3.5) + '" y="' + (k[1] - 6) + '" width="7" height="6" fill="#2A2018"/></g>'; });
    // birch courtyard
    var birches = [[230, 950, 600], [430, 872, 430], [640, 978, 660], [880, 890, 470], [1090, 962, 620], [1290, 878, 440], [1470, 940, 560]];
    birches.forEach(function (t, k) {
      var x = t[0], y = t[1], h = t[2], lean = (rand() - 0.5) * 24, bw = 10 + h / 60, tw = 3;
      var top = [x + lean, y - h];
      var tr = '';
      tr += poly([[x + 4, y + 2], [x + 300, y + 24], [x + 292, y + 28], [x - 4, y + 4]], 'fill="#8FA6BA" opacity=".45"');
      var br = '';
      var tw2 = '';
      for (var j = 0; j < 14; j++) {
        var t0 = 0.34 + j * 0.046, bxp = x + lean * t0, byp = y - h * t0, dir = j % 2 ? 1 : -1, len = (50 + rand() * 120) * (1.1 - t0 * 0.6);
        var ex = bxp + dir * len * 0.8, ey = byp - len * 0.55;
        br += 'M' + r2(bxp) + ' ' + r2(byp) + ' Q' + r2(bxp + dir * len * 0.4) + ' ' + r2(byp - len * 0.36) + ' ' + r2(ex) + ' ' + r2(ey);
        for (var d2 = 0; d2 < 4; d2++) { var tt = 0.35 + d2 * 0.18, sx2 = bxp + (ex - bxp) * tt, sy2 = byp + (ey - byp) * tt - len * 0.12 * Math.sin(tt * 3.1); tw2 += 'M' + r2(sx2) + ' ' + r2(sy2) + ' q' + r2(dir * 6) + ' ' + r2(10 + rand() * 8) + ' ' + r2(dir * (8 + rand() * 10)) + ' ' + r2(22 + rand() * 26); }
      }
      tr += '<path d="' + tw2 + '" stroke="#7A625C" stroke-width=".9" fill="none" opacity=".55"/>';
      tr += '<path d="' + br + '" stroke="#55433D" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".9"/>';
      tr += poly([[x - bw / 2, y], [x + bw / 2, y], [top[0] + tw / 2, top[1]], [top[0] - tw / 2, top[1]]], 'fill="#F2F0EA"');
      tr += poly([[x + bw * 0.12, y], [x + bw / 2, y], [top[0] + tw / 2, top[1]], [top[0], top[1]]], 'fill="#C9C7C0"');
      var mk = '';
      for (var m = 0; m < 16; m++) { var mt = Math.pow(rand(), 0.8) * 0.85, mx = x + lean * mt, my = y - h * mt, mw = (bw * (1 - mt) + tw * mt) * (0.5 + rand() * 0.5); mk += '<rect x="' + r2(mx - mw / 2) + '" y="' + r2(my) + '" width="' + r2(mw) + '" height="' + r2(1.6 + rand() * 2.4) + '" fill="#262321"/>'; }
      mk += poly([[x - bw / 2, y], [x + bw / 2, y], [x + bw * 0.42, y - 26], [x - bw * 0.46, y - 34]], 'fill="#3A3330"');
      tr += mk;
      s += tr;
    });
    s += '<path d="M0 960 Q400 944 800 958 T1600 952 V1000 H0Z" fill="#F9FAF8" opacity=".9"/>';
    return wrap('0 0 1600 1000', defs + s);
  }

  var plates = { fjordhall: fjordhall, kvarv: kvarv, tromso: tromso, saeter: saeter, skog: skog };

  /* ---------------- The process site model (isometric) ---------------- */
  var C = Math.cos(Math.PI / 6), S = 0.5, K = 15;
  function iso(x, y, z) { return [(x - y) * C * K, ((x + y) * S - z) * K]; }
  function ipoly(a, cls, extra) { return '<polygon class="' + cls + '" points="' + pts(a.map(function (q) { return iso(q[0], q[1], q[2]); })) + '"' + (extra || '') + '/>'; }
  function ipath(a, cls, extra) { return '<path class="' + cls + '" d="M' + a.map(function (q) { var v = iso(q[0], q[1], q[2]); return r2(v[0]) + ' ' + r2(v[1]); }).join('L') + '"' + (extra || '') + '/>'; }
  function isoTree(x, y, h) {
    var b = iso(x, y, 0), w = h * 0.2 * K, t = [b[0], b[1] - h * K];
    return '<g class="m-tree"><rect class="m-trunk" x="' + r2(b[0] - 1.5) + '" y="' + r2(b[1] - 6) + '" width="3" height="7"/>' +
      '<polygon class="m-tree-d" points="' + pts([t, [b[0] - w, b[1] - 4], [b[0] + w, b[1] - 4]]) + '"/>' +
      '<polygon class="m-tree-l" points="' + pts([t, [b[0] - w, b[1] - 4], [b[0], b[1] - 2]]) + '"/></g>';
  }

  // Building: 24 × 12 m hall, six glulam portals, 5.5 m eaves, 10.5 m ridge, glazed public gable to the east.
  var L = 24, Wd = 12, H = 5.5, R = 10.5, FX = [0, 4.8, 9.6, 14.4, 19.2, 24];
  var TREES_BACK = [[-9, -6, 6.5], [6, -9, 7.5], [16, -10, 6], [-6, 3, 7], [29, -6, 7], [-10, 9, 6], [35, 2, 5.5]];
  var TREES_FRONT = [[-4, 19, 7], [11, 23, 6.5], [31, 17, 7.5], [36, 9, 6], [-11, 16, 5.5]];
  var WALK = [[-12, 22], [-6, 21], [-1, 19.5], [4, 20.5], [-9, 23.5], [1, 22.6]];
  var GATHER = [[27.6, 3.4], [28.8, 5.6], [27.2, 7.8], [29.6, 8.6], [30.4, 4.4], [28.4, 10.2]];

  function model(state, prefix) {
    var full = state === undefined;
    var st = full ? 4 : state, pre = prefix || 'm';
    var o = '', vis = function (n) { return full || st >= n; };
    var defs = '<defs><linearGradient id="' + pre + '-litg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE6B0"/><stop offset="1" stop-color="#F3A553"/></linearGradient><radialGradient id="' + pre + '-spill"><stop offset="0" stop-color="#FFC877" stop-opacity=".85"/><stop offset=".5" stop-color="#FFB25E" stop-opacity=".3"/><stop offset="1" stop-color="#FFB25E" stop-opacity="0"/></radialGradient></defs>';
    // base slab
    var x0 = -15, x1 = 39, y0 = -13, y1 = 27, th = 2.4;
    o += '<g class="m-base">' + ipoly([[x0, y1, 0], [x1, y1, 0], [x1, y1, -th], [x0, y1, -th]], 'm-ground-l') + ipoly([[x1, y0, 0], [x1, y1, 0], [x1, y1, -th], [x1, y0, -th]], 'm-ground-r') + ipoly([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], 'm-ground-top') + '</g>';
    // contours
    var cont = '';
    [[28, -6, 9, 0.2], [28, -6, 6, 1.1], [28, -6, 3.4, 2.1], [-6, 18, 7, 0.4], [-6, 18, 4, 1.4]].forEach(function (c, i) {
      var a = [];
      for (var k = 0; k <= 48; k++) { var th2 = k / 48 * Math.PI * 2, rr = c[2] * (1 + 0.14 * Math.sin(3 * th2 + i) + 0.07 * Math.sin(5 * th2 + 2 * i)); a.push([c[0] + Math.cos(th2) * rr * 1.25, c[1] + Math.sin(th2) * rr, 0]); }
      cont += ipath(a, 'm-contour');
    });
    o += '<g class="m-contours">' + cont + '</g>';
    o += ipath([[-14, 24.5, 0], [-6, 21.5, 0], [4, 19, 0], [14, 15, 0], [24, 9, 0], [30, 6, 0]], 'm-path', ' data-part="path"');
    o += '<g class="m-night-ground" opacity="' + (!full && st >= 4 ? 1 : 0) + '">' + ipoly([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], '', ' fill="#16324F" opacity=".5"') + '</g>';
    o += '<ellipse data-part="spill" class="m-spill-e" cx="' + r2(iso(29, 6, 0)[0]) + '" cy="' + r2(iso(29, 6, 0)[1]) + '" rx="' + (11 * K) + '" ry="' + (5.6 * K) + '" fill="url(#' + pre + '-spill)" opacity="' + (full ? 0 : st >= 4 ? 1 : 0) + '"/>';
    // wind
    if (vis(0)) {
      var wa = [[-12, -10, 4], [-2, -13, 4.6], [10, -13.5, 4.2], [22, -11, 4]];
      o += '<g data-part="wind">' + ipath(wa, 'm-wind', ' pathLength="1"') + ipath([[20.6, -12.4, 4.6], [22, -11, 4], [20.2, -10.4, 3.4]], 'm-wind') +
        '<text class="m-dim-t" x="' + r2(iso(-2, -13, 6.2)[0]) + '" y="' + r2(iso(-2, -13, 6.2)[1]) + '">WIND</text></g>';
    }
    // trees behind
    TREES_BACK.forEach(function (t) { o += isoTree(t[0], t[1], t[2]); });
    // read the site: sun path, footprint, kept trees
    if (vis(1)) {
      var sp = [];
      for (var k = 0; k <= 40; k++) { var a = (-70 + k / 40 * 230) * Math.PI / 180; sp.push([12 + Math.cos(a) * 24, 6 + Math.sin(a) * 24, 1 + Math.sin(k / 40 * Math.PI) * 10]); }
      var sunAt = full ? 0.5 : 0.62, si = Math.round(sunAt * 40), sv = iso(sp[si][0], sp[si][1], sp[si][2]);
      o += '<g data-part="sunpath">' + ipath(sp, 'm-sun-path', ' pathLength="1"') +
        '<g data-part="sun" transform="translate(' + r2(sv[0]) + ' ' + r2(sv[1]) + ')"><circle class="m-sun-halo" r="15"/><circle class="m-sun" r="6.5"/></g>' +
        '<text class="m-dim-t" x="' + r2(iso(sp[4][0], sp[4][1], sp[4][2])[0] + 14) + '" y="' + r2(iso(sp[4][0], sp[4][1], sp[4][2])[1]) + '">LOW WINTER SUN</text></g>';
      o += '<g data-part="foot">' + ipoly([[0, 0, 0.02], [L, 0, 0.02], [L, Wd, 0.02], [0, Wd, 0.02]], 'm-foot') + '</g>';
      var keep = '';
      [[-6, 3], [29, -6], [6, -9]].forEach(function (t) { var a2 = []; for (var k2 = 0; k2 <= 24; k2++) { var an = k2 / 24 * Math.PI * 2; a2.push([t[0] + Math.cos(an) * 2.6, t[1] + Math.sin(an) * 2.6, 0.02]); } keep += ipath(a2, 'm-keep'); });
      o += '<g data-part="keep">' + keep + '</g>';
      // store sun path points for the animation
      model.sunPts = sp.map(function (q) { return iso(q[0], q[1], q[2]); });
    }
    // the building
    var bld = '';
    if (vis(3)) {
      // back roof slope
      var back = '';
      for (var i = 0; i < 5; i++) back += ipoly([[FX[i] + 0.06, 0, H], [FX[i + 1] - 0.06, 0, H], [FX[i + 1] - 0.06, Wd / 2, R], [FX[i] + 0.06, Wd / 2, R]], 'm-panel m-panel-r', ' data-panel="b"');
      bld += '<g data-part="panels-back">' + back + '</g>';
    }
    if (vis(2)) {
      var fr = '';
      FX.forEach(function (x) { fr += ipath([[x, 0, 0], [x, 0, H], [x, Wd / 2, R], [x, Wd, H], [x, Wd, 0]], 'm-frame', ' pathLength="1" data-frame'); });
      fr += ipath([[0, Wd / 2, R], [L, Wd / 2, R]], 'm-frame', ' pathLength="1" data-frame') + ipath([[0, 0, H], [L, 0, H]], 'm-frame', ' pathLength="1" data-frame') + ipath([[0, Wd, H], [L, Wd, H]], 'm-frame', ' pathLength="1" data-frame');
      var dim = ipath([[0, Wd + 2.2, 0], [L, Wd + 2.2, 0]], 'm-dim') + ipath([[0, Wd + 1.6, 0], [0, Wd + 2.8, 0]], 'm-dim') + ipath([[L, Wd + 1.6, 0], [L, Wd + 2.8, 0]], 'm-dim');
      var dt = iso(L * 0.42, Wd + 3.6, 0);
      dim += '<text class="m-dim-t" x="' + r2(dt[0]) + '" y="' + r2(dt[1]) + '" transform="rotate(30 ' + r2(dt[0]) + ' ' + r2(dt[1]) + ')">24 M · 6 PORTALS</text>';
      bld += '<g data-part="frames">' + fr + '<g data-part="dim">' + dim + '</g></g>';
      var gl = '';
      FX.forEach(function (x) { gl += ipath([[x, Wd, 0], [x, Wd, H], [x, Wd / 2, R]], 'm-glulam'); });
      bld += '<g data-part="glulam" opacity="' + (full ? 0 : st >= 3 ? 1 : 0) + '">' + gl + '</g>';
    }
    if (vis(3)) {
      var wall = '', roof = '', ids = '';
      for (var j = 0; j < 5; j++) {
        var xa = FX[j] + 0.08, xb = FX[j + 1] - 0.08;
        wall += ipoly([[xa, Wd, 0], [xb, Wd, 0], [xb, Wd, H], [xa, Wd, H]], 'm-panel m-panel-w', ' data-panel="w"');
        roof += ipoly([[xa, Wd, H], [xb, Wd, H], [xb, Wd / 2, R], [xa, Wd / 2, R]], 'm-panel m-panel-r', ' data-panel="r"');
        var c1 = iso((xa + xb) / 2, Wd, H * 0.5);
        ids += '<text class="m-panel-id" text-anchor="middle" transform="matrix(.866 .5 0 1 ' + r2(c1[0]) + ' ' + r2(c1[1] + 4) + ')">W-0' + (j + 1) + '</text>';
      }
      var gable = ipoly([[L, 0, 0], [L, Wd, 0], [L, Wd, H], [L, Wd / 2, R], [L, 0, H]], 'm-panel m-panel-g', ' data-panel="g"');
      bld += '<g data-part="panels">' + roof + wall + gable + '<g data-part="ids">' + ids + '</g></g>';
    }
    if (vis(4)) {
      var clad = '', win = '', lit = '';
      for (var cx = 0.5; cx < L; cx += 0.6) clad += ipath([[cx, Wd, 0.15], [cx, Wd, H - 0.15]], 'm-clad');
      for (var w2 = 0; w2 < 5; w2++) {
        var wa2 = FX[w2] + 0.9, wb2 = FX[w2 + 1] - 0.9;
        win += ipoly([[wa2, Wd, 1.1], [wb2, Wd, 1.1], [wb2, Wd, 3.7], [wa2, Wd, 3.7]], 'm-glass');
        lit += ipoly([[wa2 + 0.08, Wd, 1.18], [wb2 - 0.08, Wd, 1.18], [wb2 - 0.08, Wd, 3.62], [wa2 + 0.08, Wd, 3.62]], 'm-lit', ' fill="url(#' + pre + '-litg)"');
      }
      var gg = [[L, 1.2, 0.2], [L, 10.8, 0.2], [L, 10.8, H + 0.2], [L, 6, R - 1], [L, 1.2, H + 0.2]];
      win += ipoly(gg, 'm-glass');
      lit += ipoly(gg, 'm-lit', ' fill="url(#' + pre + '-litg)"');
      var mull = '';
      [3.6, 6, 8.4].forEach(function (yy) { mull += ipath([[L, yy, 0.2], [L, yy, yy === 6 ? R - 1 : H + 0.2 + (1 - Math.abs(yy - 6) / 4.8) * (R - 1 - H - 0.2)]], 'm-frame'); });
      mull += ipath([[L, 1.2, 3], [L, 10.8, 3]], 'm-frame');
      var canopy = ipoly([[L, 3, 3.4], [L + 3.2, 3, 3.4], [L + 3.2, 9, 3.4], [L, 9, 3.4]], 'm-roof-snow') + ipoly([[L + 3.2, 3, 3.4], [L + 3.2, 9, 3.4], [L + 3.2, 9, 3.1], [L + 3.2, 3, 3.1]], 'm-panel m-panel-g');
      var snow = ipoly([[0.1, Wd + 0.25, H + 0.05], [L - 0.1, Wd + 0.25, H + 0.05], [L - 0.1, Wd / 2 + 0.4, R - 0.15], [0.1, Wd / 2 + 0.4, R - 0.15]], 'm-roof-snow');
      bld += '<g data-part="clad">' + clad + snow + win + '</g><g data-part="lit" opacity="' + (full ? 0 : 1) + '">' + lit + '</g><g data-part="clad">' + mull + canopy + '</g>';
    }
    o += '<g class="m-building">' + bld + '</g>';
    TREES_FRONT.forEach(function (t) { o += isoTree(t[0], t[1], t[2]); });
    // people: walkers in the first movements, gathered at the threshold at the end
    var ppl = '';
    for (var pi = 0; pi < 6; pi++) {
      var at = (!full && st >= 4) ? GATHER[pi] : WALK[pi], v = iso(at[0], at[1], 0), g2 = iso(GATHER[pi][0], GATHER[pi][1], 0);
      ppl += '<g class="m-person" data-person data-dx="' + r2(g2[0] - v[0]) + '" data-dy="' + r2(g2[1] - v[1]) + '" transform="translate(' + r2(v[0]) + ' ' + r2(v[1]) + ')"><g data-walker><circle cy="-21" r="3"/><path d="M-3.4 -17 h6.8 l1.2 17 h-9.2z"/></g></g>';
    }
    o += '<g data-part="people">' + ppl + '</g>';
    var vb = (function () { var a = iso(x0, y1, -th), b2 = iso(x1, y0, -th), c2 = iso(x0, y0, 0), d2 = iso(x1, y1, -th); var minX = a[0] - 30, maxX = b2[0] + 30, minY = iso(12, 6, 22)[1] - 60, maxY = d2[1] + 20; return [minX, minY, maxX - minX, maxY - minY].map(r2).join(' '); })();
    if (full) vb = '-440 -350 1020 900';
    return '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid ' + (full ? 'slice' : 'meet') + '" aria-hidden="true" focusable="false">' + defs + o + '</svg>';
  }

  /* ---------------- Pine cladding textures (fresh and silvered), drawn once on canvas ---------------- */
  function boardTexture(kind, seed) {
    var c = document.createElement('canvas'), w = 120, h = 900;
    c.width = w; c.height = h;
    var x = c.getContext('2d'), rand = rng(seed);
    var fresh = kind === 'fresh';
    var g = x.createLinearGradient(0, 0, w, 0);
    if (fresh) { g.addColorStop(0, '#BE854A'); g.addColorStop(0.45, '#D8A76B'); g.addColorStop(1, '#C18A50'); }
    else { g.addColorStop(0, '#8F9593'); g.addColorStop(0.45, '#B4B8B4'); g.addColorStop(1, '#979C99'); }
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // figure: long wavy grain lines with growth-ring cathedrals
    var lines = 46;
    for (var i = 0; i < lines; i++) {
      var bx = (i / lines) * w + rand() * 3, amp = 2 + rand() * 6, fq = 0.004 + rand() * 0.01, ph = rand() * 6;
      x.beginPath();
      for (var y = 0; y <= h; y += 6) { var px = bx + Math.sin(y * fq + ph) * amp + Math.sin(y * 0.03 + i) * 0.6; if (y === 0) x.moveTo(px, y); else x.lineTo(px, y); }
      var dark = rand() < 0.35;
      x.strokeStyle = fresh ? (dark ? 'rgba(120,62,22,.42)' : 'rgba(150,90,40,.22)') : (dark ? 'rgba(70,76,78,.42)' : 'rgba(95,100,100,.22)');
      x.lineWidth = dark ? 1.4 + rand() * 1.4 : 0.8;
      x.stroke();
    }
    // a knot or two
    for (var k = 0; k < 2; k++) {
      var kx = 20 + rand() * (w - 40), ky = 120 + rand() * (h - 240);
      for (var r = 1; r < 9; r++) { x.beginPath(); x.ellipse(kx, ky, r * 1.4, r * 2.6, 0, 0, Math.PI * 2); x.strokeStyle = fresh ? 'rgba(110,55,18,' + (0.5 - r * 0.04) + ')' : 'rgba(60,64,66,' + (0.5 - r * 0.04) + ')'; x.lineWidth = 1; x.stroke(); }
      x.beginPath(); x.ellipse(kx, ky, 3, 5, 0, 0, Math.PI * 2); x.fillStyle = fresh ? '#7A4520' : '#5E6466'; x.fill();
    }
    if (!fresh) {
      // weathering: darker streaks from the top, lighter bleached face
      for (var s2 = 0; s2 < 14; s2++) { var sx = rand() * w, sl = 80 + rand() * 500; var sg = x.createLinearGradient(0, 0, 0, sl); sg.addColorStop(0, 'rgba(60,64,66,.35)'); sg.addColorStop(1, 'rgba(60,64,66,0)'); x.fillStyle = sg; x.fillRect(sx, 0, 2 + rand() * 5, sl); }
    }
    return c.toDataURL('image/jpeg', 0.86);
  }

  function paintCladding(root) {
    if (!root) return;
    var fresh = [boardTexture('fresh', 3), boardTexture('fresh', 7)], silver = [boardTexture('silver', 5), boardTexture('silver', 9)];
    root.querySelectorAll('.board').forEach(function (b, i) {
      b.querySelector('.board__fresh').style.backgroundImage = 'url(' + fresh[i % 2] + ')';
      b.querySelector('.board__silver').style.backgroundImage = 'url(' + silver[(i + 1) % 2] + ')';
      b.querySelector('.board__fresh').style.backgroundPosition = '0 ' + (-i * 97) + 'px';
      b.querySelector('.board__silver').style.backgroundPosition = '0 ' + (-i * 131) + 'px';
    });
  }

  /* ---------------- Hero: floor and ceiling boards converging on the far gable ---------------- */
  function heroRays(g) {
    if (!g) return;
    var d = '';
    for (var x = -1600; x <= 3200; x += 110) d += 'M800 560L' + x + ' 0';
    var f = '';
    for (var x2 = -2400; x2 <= 4000; x2 += 95) f += 'M800 560L' + x2 + ' 1000';
    g.innerHTML = '<path d="' + d + '" stroke-opacity=".05"/><path d="' + f + '" stroke-opacity=".09"/>';
  }

  window.NorrArt = { plates: plates, model: model, paintCladding: paintCladding, heroRays: heroRays, iso: iso };

  // Paint everything that does not depend on motion straight away.
  function init() {
    document.querySelectorAll('[data-art]').forEach(function (el, i) { var f = plates[el.dataset.art]; if (f) el.innerHTML = f('p' + i + '-'); });
    heroRays(document.querySelector('.nave__rays'));
    paintCladding(document.querySelector('.cladding'));
    var m = document.querySelector('[data-model]');
    if (m) m.innerHTML = model(undefined, 'm');
    document.querySelectorAll('.step__fig').forEach(function (el, i) { el.innerHTML = model(i, 'ms' + i); if (i === 4) el.classList.add('is-night'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
