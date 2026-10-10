/* Drift — ambient canvases: night-sky starfield + hero listening orb */
(function () {
  'use strict';
  var D = (window.Drift = window.Drift || {});
  D.state = D.state || { ambient: true, scrollY: 0, starFade: 1, px: 0, py: 0 };

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var TAU = Math.PI * 2;

  /* A clock that freezes while ambient motion is paused */
  var clock = { t: 0, last: performance.now() };
  function tick(now) {
    var dt = Math.min(0.1, (now - clock.last) / 1000);
    clock.last = now;
    if (D.state.ambient) clock.t += dt;
    return clock.t;
  }

  /* ------------------------------------------------------------------
     Starfield
     ------------------------------------------------------------------ */
  function initStars() {
    var c = document.getElementById('stars');
    if (!c) return;
    var ctx = c.getContext('2d');
    var w = 0, h = 0, dpr = 1, stars = [], shoot = null, nextShoot = 6;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round((w * h) / 5600);
      stars = [];
      for (var i = 0; i < n; i++) {
        var hue = Math.random();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 1.5,
          r: Math.pow(Math.random(), 3) * 1.5 + 0.35,
          a: Math.random() * 0.55 + 0.3,
          tw: Math.random() * TAU,
          sp: 0.5 + Math.random() * 1.6,
          z: 0.2 + Math.random() * 0.8,
          c: hue < 0.12 ? '255,214,184' : hue < 0.28 ? '190,198,255' : '255,255,255'
        });
      }
    }

    var last = 0;
    function frame(now) {
      var t = tick(now);
      if (now - last > 30) { // ~30fps is plenty for a starfield
        last = now;
        draw(t, now);
      }
      requestAnimationFrame(frame);
    }

    function draw(t, now) {
      ctx.clearRect(0, 0, w, h);
      var sy = D.state.scrollY, fade = D.state.starFade;
      if (fade <= 0.01) return;
      var H = h * 1.5;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var y = (((s.y - sy * 0.14 * s.z) % H) + H) % H;
        if (y > h) continue;
        var x = s.x + D.state.px * 10 * s.z;
        var a = s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.tw)) * fade;
        ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')';
        if (s.r < 0.9) ctx.fillRect(x, y, s.r * 1.4, s.r * 1.4);
        else { ctx.beginPath(); ctx.arc(x, y, s.r * 0.8, 0, TAU); ctx.fill(); }
      }
      // rare shooting star
      if (D.state.ambient) {
        if (!shoot && t > nextShoot) {
          shoot = { x: Math.random() * w * 0.7 + w * 0.1, y: Math.random() * h * 0.35, t0: t };
          nextShoot = t + 9 + Math.random() * 9;
        }
        if (shoot) {
          var p = (t - shoot.t0) / 0.9;
          if (p >= 1) shoot = null;
          else {
            var len = 150, x0 = shoot.x + p * 360, y0 = shoot.y + p * 170;
            var g = ctx.createLinearGradient(x0, y0, x0 - len, y0 - len * 0.47);
            g.addColorStop(0, 'rgba(255,255,255,' + (0.85 * (1 - p) * fade) + ')');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - len, y0 - len * 0.47); ctx.stroke();
          }
        }
      }
    }

    resize();
    window.addEventListener('resize', function () { resize(); draw(clock.t, 0); });
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     Hero orb: a breathing moon wrapped in a listening ring
     ------------------------------------------------------------------ */
  function initOrb() {
    var stage = document.getElementById('orbStage');
    var c = document.getElementById('orb');
    if (!stage || !c) return;
    var ctx = c.getContext('2d');
    var w = 0, h = 0, dpr = 1, R = 300, cx = 0, cy = 0, visible = true;
    var craters = [
      [-0.38, -0.55, 0.15], [0.22, -0.7, 0.1], [0.5, -0.38, 0.19], [-0.62, -0.18, 0.1],
      [0.05, -0.28, 0.07], [0.62, 0.08, 0.09], [-0.2, 0.05, 0.13], [-0.45, 0.4, 0.08], [0.3, 0.38, 0.12]
    ];
    var N = 200;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = stage.clientWidth; h = stage.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = w < 760 ? Math.min(w * 0.58, 300) : Math.min(w * 0.27, h * 0.78, 440);
      cx = w / 2; cy = h + R * 0.5;
      draw(clock.t);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var breath = 0.5 + 0.5 * Math.sin(t * 0.78);        // slow 4-in / 4-out feel
      var Rm = R * (1 + 0.018 * breath);
      var ox = D.state.px * 14, oy = D.state.py * 6;
      var X = cx + ox, Y = cy + oy;

      // atmosphere
      var g = ctx.createRadialGradient(X, Y, Rm * 0.9, X, Y, Rm * 2.1);
      g.addColorStop(0, 'rgba(255,196,160,' + (0.26 + 0.08 * breath).toFixed(3) + ')');
      g.addColorStop(0.35, 'rgba(160,140,255,0.13)');
      g.addColorStop(1, 'rgba(60,50,160,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // concentric breath rings
      for (var k = 0; k < 3; k++) {
        var ph = ((t * 0.16 + k / 3) % 1);
        var rr = Rm * (1.06 + ph * 0.55);
        ctx.strokeStyle = 'rgba(214,206,255,' + (0.22 * (1 - ph)).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(X, Y, rr, 0, TAU); ctx.stroke();
      }

      // listening ring (radial bars)
      var r0 = Rm * 1.045;
      var barW = Math.max(1.3, (TAU * r0 / N) * 0.3);
      ctx.lineCap = 'round';
      for (var i = 0; i < N; i++) {
        var th = (i / N) * TAU;
        var sx = Math.cos(th), sy = Math.sin(th);
        if (Y + sy * r0 > h + 60 && Y + sy * (r0 + Rm * 0.3) > h + 60) continue;
        var e1 = 0.5 + 0.5 * Math.sin(th * 5 + t * 0.9);
        var e2 = 0.5 + 0.5 * Math.sin(th * 11 - t * 1.35 + 1.7);
        var e3 = 0.5 + 0.5 * Math.sin(th * 23 + t * 2.3);
        var a = e1 * 0.55 + e2 * 0.3 + e3 * 0.15;
        a = a * a;
        var len = Rm * (0.018 + 0.2 * a * (0.55 + 0.45 * breath));
        var x1 = X + sx * r0, y1 = Y + sy * r0, x2 = X + sx * (r0 + len), y2 = Y + sy * (r0 + len);
        var warm = 0.5 + 0.5 * Math.sin(th * 2 + t * 0.2);
        ctx.strokeStyle = 'rgba(' + Math.round(190 + 65 * warm) + ',' + Math.round(190 + 20 * warm) + ',255,' + (0.28 + 0.6 * a).toFixed(3) + ')';
        ctx.lineWidth = barW;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }

      // moon halo
      var hg = ctx.createRadialGradient(X, Y, Rm * 0.96, X, Y, Rm * 1.12);
      hg.addColorStop(0, 'rgba(255,240,220,0.55)'); hg.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(X, Y, Rm * 1.12, 0, TAU); ctx.fill();

      // moon body
      var mg = ctx.createRadialGradient(X - Rm * 0.28, Y - Rm * 0.42, Rm * 0.05, X, Y - Rm * 0.1, Rm * 1.02);
      mg.addColorStop(0, '#fffaf0'); mg.addColorStop(0.38, '#f4ecdc'); mg.addColorStop(0.75, '#d3c8e6'); mg.addColorStop(1, '#8e87cf');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(X, Y, Rm, 0, TAU); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(X, Y, Rm, 0, TAU); ctx.clip();
      for (var j = 0; j < craters.length; j++) {
        var cr = craters[j];
        var gx = X + cr[0] * Rm, gy = Y + cr[1] * Rm, gr = cr[2] * Rm;
        var cg = ctx.createRadialGradient(gx - gr * 0.25, gy - gr * 0.3, gr * 0.1, gx, gy, gr);
        cg.addColorStop(0, 'rgba(120,108,170,0.20)'); cg.addColorStop(0.8, 'rgba(120,108,170,0.09)'); cg.addColorStop(1, 'rgba(255,255,255,0.12)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
      }
      // terminator shading (a soft dusk on the lower right)
      var sg = ctx.createLinearGradient(X - Rm * 0.6, Y - Rm, X + Rm * 0.7, Y + Rm * 0.2);
      sg.addColorStop(0, 'rgba(40,30,110,0)'); sg.addColorStop(1, 'rgba(40,30,110,0.35)');
      ctx.fillStyle = sg; ctx.fillRect(X - Rm, Y - Rm, Rm * 2, Rm * 2);
      // sleeping waveform engraved across the moon
      ctx.strokeStyle = 'rgba(70,60,140,0.28)'; ctx.lineWidth = 1.5; ctx.beginPath();
      var wy = Y - Rm * 0.55;
      for (var x = -Rm; x <= Rm; x += 6) {
        var env = Math.sin(((x + Rm) / (2 * Rm)) * Math.PI);
        var yy = wy + Math.sin(x * 0.045 + t * 1.2) * 9 * env * (0.6 + 0.4 * breath) + Math.sin(x * 0.11 - t * 0.7) * 3 * env;
        if (x === -Rm) ctx.moveTo(X + x, yy); else ctx.lineTo(X + x, yy);
      }
      ctx.stroke();
      ctx.restore();
    }

    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 });
    io.observe(stage);

    function frame(now) {
      var t = tick(now);
      if (visible) draw(t);
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  /* pointer parallax (shared) */
  window.addEventListener('pointermove', function (e) {
    D.state.px += ((e.clientX / window.innerWidth - 0.5) * 2 - D.state.px) * 0.15;
    D.state.py += ((e.clientY / window.innerHeight - 0.5) * 2 - D.state.py) * 0.15;
  }, { passive: true });
  window.addEventListener('scroll', function () { D.state.scrollY = window.scrollY || window.pageYOffset || 0; }, { passive: true });

  D.clock = clock;
  D.initCanvases = function () { initStars(); initOrb(); };
  D.initCanvases();
})();
