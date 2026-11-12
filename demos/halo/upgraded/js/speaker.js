/* Halo — procedural speaker renderer.
   A knitted cylinder, turned aluminium crown and a luminous ring, drawn with
   canvas 2D: the fabric is a real texture mapped column-by-column around a
   cylinder, so rotation, tilt and lighting are all live. */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgb = (c, a = 1) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
  const scale3 = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)];
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  const Halo = (global.Halo = global.Halo || {});
  Halo.level = 0;
  Halo.still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PALETTES = {
    oat: {
      key: 'oat', name: 'Oat', fabric: [224, 208, 182], alu: [232, 222, 204],
      desc: 'Undyed wool-blend knit with champagne anodised aluminium.'
    },
    graphite: {
      key: 'graphite', name: 'Graphite', fabric: [78, 77, 79], alu: [138, 133, 128],
      desc: 'Charcoal knit with smoked, hand-finished aluminium.'
    },
    fjord: {
      key: 'fjord', name: 'Fjord', fabric: [116, 146, 162], alu: [214, 219, 220],
      desc: 'Slate-blue knit with brushed silver aluminium.'
    }
  };
  Halo.palettes = PALETTES;

  // key light from upper left, slightly in front
  const LX = -0.62, LZ = 0.78;
  const LN = Math.hypot(LX, LZ);
  const lx = LX / LN, lz = LZ / LN;
  const lambert = (xn) => Math.max(0, xn * lx + Math.sqrt(Math.max(0, 1 - xn * xn)) * lz);

  function sidePath(ctx, cx, yA, yB, rx, ry) {
    ctx.beginPath();
    ctx.moveTo(cx - rx, yA);
    ctx.ellipse(cx, yA, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(cx + rx, yB);
    ctx.ellipse(cx, yB, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath();
  }

  function hGrad(ctx, cx, R, fn, n) {
    n = n || 40;
    const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      g.addColorStop(s, fn(-1 + 2 * s));
    }
    return g;
  }

  /* ---------- procedural knit detail texture ---------- */
  function makeTexture(R, dpr) {
    const TW = Math.round(TAU * R * dpr);
    const P = 72;
    const TH = Math.max(8, Math.round(2.55 * R * dpr));
    const cv = document.createElement('canvas');
    cv.width = TW + P * 2;
    cv.height = TH;
    const c = cv.getContext('2d');

    // crevices
    c.fillStyle = 'rgba(0,0,0,0.30)';
    c.fillRect(0, 0, cv.width, TH);

    const NS = 214;
    const sw = TW / NS;
    const sh = sw * 1.34;
    const rows = Math.ceil(TH / sh) + 2;
    const pad = Math.ceil(P / sw) + 1;
    const lw = sw * 0.5;

    const light = [];
    const core = [];
    for (let i = 0; i < 6; i++) { light.push(new Path2D()); core.push(new Path2D()); }
    const dark = new Path2D();

    for (let r = -1; r < rows; r++) {
      const y = r * sh;
      for (let j = -pad; j < NS + pad; j++) {
        const jm = ((j % NS) + NS) % NS;
        const n1 = hash(jm, r), n2 = hash(jm + 101, r + 7);
        const x = P + j * sw + (n1 - 0.5) * sw * 0.1;
        const yy = y + (n2 - 0.5) * sh * 0.06;
        const b = 1 + clamp(Math.floor((n2 * 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(r * 0.37 + jm * 0.05))) * 3.99), 0, 3);
        const L = light[b], K = core[b];
        // shadow under the stitch
        dark.moveTo(x + sw * 0.2, yy + sh * 0.2); dark.lineTo(x + sw * 0.56, yy + sh * 1.08);
        dark.moveTo(x + sw * 0.86, yy + sh * 0.2); dark.lineTo(x + sw * 0.56, yy + sh * 1.08);
        // left leg
        L.moveTo(x + sw * 0.16, yy + sh * 0.06); L.lineTo(x + sw * 0.5, yy + sh * 0.98);
        // right leg
        L.moveTo(x + sw * 0.84, yy + sh * 0.06); L.lineTo(x + sw * 0.5, yy + sh * 0.98);
        // lit core of each leg
        K.moveTo(x + sw * 0.13, yy + sh * 0.12); K.lineTo(x + sw * 0.42, yy + sh * 0.86);
        K.moveTo(x + sw * 0.8, yy + sh * 0.12); K.lineTo(x + sw * 0.52, yy + sh * 0.86);
      }
    }
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = lw * 1.05;
    c.strokeStyle = 'rgba(0,0,0,0.34)';
    c.stroke(dark);
    for (let i = 0; i < 6; i++) {
      c.lineWidth = lw;
      c.strokeStyle = 'rgba(255,255,255,' + (0.19 + i * 0.026).toFixed(3) + ')';
      c.stroke(light[i]);
    }
    for (let i = 0; i < 6; i++) {
      c.lineWidth = lw * 0.34;
      c.strokeStyle = 'rgba(255,255,255,' + (0.10 + i * 0.022).toFixed(3) + ')';
      c.stroke(core[i]);
    }

    // long-wave tonal drift of the yarn
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * cv.width, w = 40 + Math.random() * 160;
      const g = c.createLinearGradient(x, 0, x + w, 0);
      const dk = Math.random() < 0.5;
      const col = dk ? '0,0,0' : '255,255,255';
      g.addColorStop(0, 'rgba(' + col + ',0)');
      g.addColorStop(0.5, 'rgba(' + col + ',' + (0.010 + Math.random() * 0.022).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      c.fillStyle = g;
      c.fillRect(x, 0, w, TH);
    }

    // fuzz
    const fuzzA = new Path2D(), fuzzB = new Path2D();
    const nFuzz = Math.round(TW * TH / 1100);
    for (let i = 0; i < nFuzz; i++) {
      const x = Math.random() * cv.width, y = Math.random() * TH;
      const a = Math.random() * TAU, l = 2 + Math.random() * 5;
      const p = Math.random() < 0.5 ? fuzzA : fuzzB;
      p.moveTo(x, y); p.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    c.lineWidth = Math.max(0.6, dpr * 0.55);
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.stroke(fuzzA);
    c.strokeStyle = 'rgba(0,0,0,0.10)'; c.stroke(fuzzB);

    // debossed ring emblem (the "halo" mark)
    const ex = P + TW * 0.5, ey = TH * 0.64, er = R * dpr * 0.085;
    c.save();
    c.lineCap = 'round';
    c.lineWidth = R * dpr * 0.028;
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.arc(ex, ey, er, -Math.PI * 0.42, Math.PI * 1.42); c.stroke();
    c.lineWidth = R * dpr * 0.01;
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.arc(ex, ey + R * dpr * 0.018, er, 0.15, Math.PI - 0.15); c.stroke();
    c.fillStyle = 'rgba(255,190,110,0.55)';
    c.beginPath(); c.arc(ex, ey - er, R * dpr * 0.014, 0, TAU); c.fill();
    c.restore();

    // wrap padding: copy opposite edges so column sampling never leaves the texture
    c.clearRect(0, 0, P, TH);
    c.drawImage(cv, TW, 0, P, TH, 0, 0, P, TH);
    c.clearRect(P + TW, 0, P, TH);
    c.drawImage(cv, P, 0, P, TH, P + TW, 0, P, TH);

    return { canvas: cv, TW, TH, P };
  }

  /* ---------- Speaker ---------- */
  class Speaker {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({
        scale: 0.8, cx: 0.5, cy: 0.5, wFrac: 0.31, tilt: 0.22, glow: 1, ripples: true,
        drag: true, autoSpeed: 0.2, palette: 'oat', maxDpr: 2, ambient: true
      }, opts || {});
      const p = PALETTES[this.o.palette];
      this.pal = { fabric: p.fabric.slice(), alu: p.alu.slice() };
      this.palT = p;
      this.base = 0.55;
      this.auto = 0; this.user = 0; this.vel = 0; this.scrollRot = 0; this.scrollRotS = 0;
      this.autoOn = this.o.autoSpeed ? 1 : 0;
      this.tilt = this.tiltT = this.o.tilt;
      this.glow = this.glowT = this.o.glow;
      this.ripple = this.rippleT = this.o.ripples ? 1 : 0;
      this.px = 0; this.py = 0; this.pxS = 0; this.pyS = 0;
      this.boost = 0;
      this.levelOverride = null;
      this.visible = true;
      this.dragging = false;
      this.anchors = {};
      this.R = 100; this.dpr = 1; this.w = 1; this.h = 1;
      this.onFrame = null;
      this.rot = 0;
      this.live = false;   // true only while something must animate every frame (sound on)
      this.dirty = true;   // render once on the next frame
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas);
      this._io = new IntersectionObserver((e) => { this.visible = e[e.length - 1].isIntersecting; }, { rootMargin: '120px' });
      this._io.observe(canvas);
      if (this.o.drag) this.bindDrag();
      Speaker.all.push(this);
      this.resize();
    }

    setPalette(key) {
      if (!PALETTES[key]) return;
      this.palT = PALETTES[key];
      this.dirty = true;
    }

    // Render only when something changed: dragging, inertia, a palette or tilt easing, a boost.
    needsFrame() {
      if (this.live || this.dirty || this.dragging) return true;
      if (Math.abs(this.vel) > 0.002 || this.boost > 0.01) return true;
      if (this.o.autoSpeed && this.autoOn) return true;
      if (Math.abs(this.tiltT - this.tilt) > 0.0005 || Math.abs(this.glowT - this.glow) > 0.002) return true;
      if (Math.abs(this.scrollRot - this.scrollRotS) > 0.0005) return true;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(this.palT.fabric[i] - this.pal.fabric[i]) > 0.3 || Math.abs(this.palT.alu[i] - this.pal.alu[i]) > 0.3) return true;
      }
      return false;
    }

    resize() {
      const c = this.canvas;
      const w = Math.max(1, c.clientWidth), h = Math.max(1, c.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, this.o.maxDpr);
      this.dpr = dpr; this.w = w; this.h = h;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      this.R = Math.max(30, Math.min(h * this.o.scale / 3.55, w * this.o.wFrac));
      this.cx = w * this.o.cx;
      this.cy = h * this.o.cy;
      this.dirty = true;
      const key = Math.round(this.R * dpr / 6);
      if (key !== this._texKey) {
        this._texKey = key;
        this.tex = makeTexture(this.R, dpr);
      }
    }

    bindDrag() {
      const c = this.canvas;
      let lastX = 0, lastT = 0, id = null;
      c.style.touchAction = 'pan-y';
      c.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        id = e.pointerId;
        try { c.setPointerCapture(id); } catch (_) {}
        this.dragging = true; this.dirty = true; lastX = e.clientX; lastT = performance.now(); this.vel = 0;
        c.classList.add('is-drag');
      });
      c.addEventListener('pointermove', (e) => {
        if (!this.dragging || e.pointerId !== id) return;
        const now = performance.now();
        const dx = e.clientX - lastX;
        const dts = Math.max(8, now - lastT) / 1000;
        const dth = dx / this.R;
        this.user += dth;
        this.vel = this.vel * 0.55 + (dth / dts) * 0.45;
        lastX = e.clientX; lastT = now;
      });
      const end = (e) => {
        if (e.pointerId !== id) return;
        this.dragging = false; id = null; c.classList.remove('is-drag');
        this.vel = clamp(this.vel, -9, 9);
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      c.addEventListener('lostpointercapture', end);
    }

    render(t, dt) {
      const ctx = this.ctx, dpr = this.dpr, w = this.w, h = this.h;
      const k = 1 - Math.exp(-dt * 5);
      this.tilt += (this.tiltT - this.tilt) * k;
      this.glow += (this.glowT - this.glow) * k;
      this.ripple += (this.rippleT - this.ripple) * k;
      this.pxS += (this.px - this.pxS) * (1 - Math.exp(-dt * 4));
      this.pyS += (this.py - this.pyS) * (1 - Math.exp(-dt * 4));
      this.boost *= Math.exp(-dt * 2.2);
      const kp = 1 - Math.exp(-dt * 6);
      for (let i = 0; i < 3; i++) {
        this.pal.fabric[i] += (this.palT.fabric[i] - this.pal.fabric[i]) * kp;
        this.pal.alu[i] += (this.palT.alu[i] - this.pal.alu[i]) * kp;
      }
      if (!this.dragging) { this.user += this.vel * dt; this.vel *= Math.exp(-dt * 2.4); }
      this.auto += this.o.autoSpeed * dt * this.autoOn;
      this.scrollRotS += (this.scrollRot - this.scrollRotS) * (1 - Math.exp(-dt * 7));
      this.rot = this.base + this.auto + this.user + this.scrollRotS + this.pxS * 0.35;

      const lv = this.levelOverride != null ? this.levelOverride : Halo.level;
      this._still = Halo.still || !this.live;
      const breath = this._still ? 0.6 : 0.5 + 0.5 * Math.sin(t * 1.05);
      const I = clamp(this.glow * (0.62 + 0.2 * breath + 0.75 * lv) + this.boost * 0.5, 0, 1.6);

      const R = this.R, cx = this.cx, cy = this.cy + this.pyS * 0;
      const tilt = clamp(this.tilt + this.pyS * 0.05, 0.04, 0.9);
      const sT = Math.sin(tilt), cT = Math.cos(tilt);
      const ry = R * sT;
      const u = R * cT;
      const yTop = cy - 1.5 * u;
      const yCapBot = yTop + 0.26 * u;
      const yGapBot = yCapBot + 0.07 * u;
      const yBodyBot = yGapBot + 2.55 * u;
      const yBase = yBodyBot + 0.12 * u;
      const pal = this.pal;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      /* ambient halo in the air */
      if (this.o.ambient) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, yCapBot + 0.4 * u);
        ctx.scale(1, 1.05);
        const ga = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 3.4);
        ga.addColorStop(0, 'rgba(255,150,64,' + (0.20 * I).toFixed(3) + ')');
        ga.addColorStop(0.35, 'rgba(255,120,40,' + (0.075 * I).toFixed(3) + ')');
        ga.addColorStop(1, 'rgba(255,110,30,0)');
        ctx.fillStyle = ga;
        ctx.fillRect(-R * 3.4, -R * 3.4, R * 6.8, R * 6.8);
        ctx.restore();
      }

      /* floor: contact shadow, glow, ripples */
      const fl = Math.max(0.1, sT);
      ctx.save();
      ctx.translate(cx, yBase);
      ctx.scale(1, fl);
      let g = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 2.1);
      g.addColorStop(0, 'rgba(0,0,0,0.82)');
      g.addColorStop(0.42, 'rgba(0,0,0,0.36)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * 2.1, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      g = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 2.6);
      g.addColorStop(0, 'rgba(255,150,70,' + (0.20 * I).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * 2.6, 0, TAU); ctx.fill();
      ctx.restore();

      if (this.ripple > 0.01 && !this._still) {
        ctx.save();
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
          const ph = ((t * 0.2 + i / 6) % 1);
          const rr = R * (1.08 + ph * 4.6);
          const a = Math.pow(1 - ph, 2) * 0.42 * this.ripple * clamp(I, 0.3, 1.2);
          ctx.strokeStyle = 'rgba(255,170,96,' + a.toFixed(3) + ')';
          ctx.beginPath();
          ctx.ellipse(cx, yBase, rr, rr * fl, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }

      /* base plinth */
      const rb = R * 0.955, ryb = ry * 0.955;
      ctx.save();
      sidePath(ctx, cx, yBodyBot, yBase, rb, ryb);
      ctx.clip();
      const aluD = scale3(pal.alu, 0.42);
      ctx.fillStyle = hGrad(ctx, cx, rb, (xn) => {
        const f = 0.2 + 0.7 * lambert(xn) + 0.1 * Math.sqrt(1 - xn * xn);
        const sp = Math.exp(-Math.pow((xn + 0.33) / 0.1, 2)) * 0.5 + Math.exp(-Math.pow((xn - 0.64) / 0.08, 2)) * 0.22;
        const c = scale3(aluD, f * 1.2);
        return rgb([c[0] + 255 * sp * 0.4, c[1] + 255 * sp * 0.4, c[2] + 255 * sp * 0.4]);
      });
      ctx.fillRect(cx - rb, yBodyBot - 1, rb * 2, 0.14 * u + ryb + 2);
      // shadow cast by the overhanging sleeve
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 0.075 * u;
      ctx.beginPath(); ctx.ellipse(cx, yBodyBot + 0.01 * u, rb, ryb, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();
      // underglow along the base edge
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const widths = [12, 7, 3.5, 1.4], alphas = [0.04, 0.08, 0.18, 0.55];
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = 'rgba(255,160,76,' + (alphas[i] * clamp(I, 0, 1.2)).toFixed(3) + ')';
        ctx.lineWidth = widths[i];
        ctx.beginPath(); ctx.ellipse(cx, yBase, rb, ryb, 0, 0.02, Math.PI - 0.02); ctx.stroke();
      }
      ctx.restore();

      /* fabric body */
      this.drawBody(ctx, cx, R, ry, u, yGapBot, yBodyBot, I, pal);

      /* light ring */
      this.drawRing(ctx, cx, R, ry, yCapBot, yGapBot, I, t, lv);

      /* crown side + top */
      this.drawCap(ctx, cx, R, ry, sT, yTop, yCapBot, I, pal);

      /* bloom over everything */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ringMid = (yCapBot + yGapBot) / 2 + ry * 0.55;
      ctx.translate(cx, ringMid);
      ctx.scale(1, 0.42 + sT * 0.5);
      g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.9);
      g.addColorStop(0, 'rgba(255,170,84,' + (0.30 * I).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(255,140,60,' + (0.10 * I).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-R * 1.9, -R * 1.9, R * 3.8, R * 3.8);
      ctx.restore();

      // anchors for DOM callouts
      const a = this.anchors;
      a.crown = { x: cx + R * 0.34, y: yTop + ry * 0.12 };
      a.ring = { x: cx + R * 0.86, y: (yCapBot + yGapBot) / 2 + ry * Math.sqrt(1 - 0.86 * 0.86) };
      a.body = { x: cx + R * 0.52, y: yGapBot + 1.15 * u + ry * Math.sqrt(1 - 0.52 * 0.52) };
      a.base = { x: cx + R * 0.82, y: yBodyBot + 0.07 * u + ry * Math.sqrt(1 - 0.82 * 0.82) };
      a.top = yTop - ry; a.bottom = yBase + ry; a.R = R; a.cx = cx;

      if (this.onFrame) this.onFrame(this, t);
    }

    drawBody(ctx, cx, R, ry, u, yA, yB, I, pal) {
      const tex = this.tex;
      const bodyH = yB - yA;
      ctx.save();
      sidePath(ctx, cx, yA, yB, R, ry);
      ctx.clip();
      ctx.fillStyle = rgb(pal.fabric);
      ctx.fillRect(cx - R, yA, R * 2, bodyH + ry + 2);

      // texture mapped around the cylinder
      const N = Math.ceil(R * 2);
      const TW = tex.TW, TH = tex.TH, P = tex.P;
      let th0 = Math.asin(-1);
      for (let i = 0; i < N; i++) {
        const x1 = -1 + 2 * (i + 1) / N;
        const th1 = Math.asin(Math.min(1, x1));
        const thm = (th0 + th1) / 2;
        let uu = ((thm + this.rot) / TAU) % 1; if (uu < 0) uu += 1;
        const sw = Math.max(1, (th1 - th0) / TAU * TW);
        const sx = P + uu * TW - sw / 2;
        const yOff = ry * Math.cos(thm);
        ctx.drawImage(tex.canvas, sx, 0, sw, TH, cx - R + i - 0.2, yA + yOff, 1.4, bodyH);
        th0 = th1;
      }

      // light spilling from the ring, following the curve of the sleeve
      ctx.globalCompositeOperation = 'lighter';
      const a0 = 0.62 * I;
      const gs = ctx.createLinearGradient(0, 0, 0, 1.6 * u);
      gs.addColorStop(0, 'rgba(255,176,92,' + a0.toFixed(3) + ')');
      gs.addColorStop(0.06, 'rgba(255,150,70,' + (a0 * 0.7).toFixed(3) + ')');
      gs.addColorStop(0.22, 'rgba(255,128,52,' + (a0 * 0.28).toFixed(3) + ')');
      gs.addColorStop(0.6, 'rgba(255,110,40,' + (a0 * 0.06).toFixed(3) + ')');
      gs.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = gs;
      const step = 3;
      for (let i = 0; i < N; i += step) {
        const xn = -1 + 2 * (i + step / 2) / N;
        const yOff = ry * Math.sqrt(Math.max(0, 1 - xn * xn));
        ctx.save();
        ctx.translate(0, yA + yOff);
        ctx.fillRect(cx - R + i, 0, step + 0.6, 1.6 * u);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';

      // cylinder shading
      const dark = hGrad(ctx, cx, R, (xn) => {
        let f = 0.2 + 0.98 * Math.pow(lambert(xn), 0.9) + 0.2 * Math.pow(Math.max(0, xn), 10);
        f *= 1 - 0.3 * Math.pow(Math.abs(xn), 5);
        return 'rgba(2,1,0,' + clamp(1 - f, 0, 0.95).toFixed(3) + ')';
      }, 44);
      const lite = hGrad(ctx, cx, R, (xn) => {
        let f = 0.2 + 0.98 * Math.pow(lambert(xn), 0.9) + 0.2 * Math.pow(Math.max(0, xn), 10);
        return 'rgba(255,246,230,' + clamp((f - 1) * 0.55, 0, 0.5).toFixed(3) + ')';
      }, 44);
      ctx.fillStyle = dark; ctx.fillRect(cx - R, yA, R * 2, bodyH + ry + 2);
      const gv = ctx.createLinearGradient(0, yA, 0, yA + bodyH + ry);
      gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.35, 'rgba(0,0,0,0.04)'); gv.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = gv; ctx.fillRect(cx - R, yA, R * 2, bodyH + ry + 2);
      ctx.fillStyle = lite; ctx.fillRect(cx - R, yA, R * 2, bodyH + ry + 2);

      // ambient occlusion toward the bottom edge, following the curve
      const ga = ctx.createLinearGradient(0, bodyH - 0.55 * u, 0, bodyH + 0.02 * u);
      ga.addColorStop(0, 'rgba(0,0,0,0)');
      ga.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = ga;
      for (let i = 0; i < N; i += step) {
        const xn = -1 + 2 * (i + step / 2) / N;
        const yOff = ry * Math.sqrt(Math.max(0, 1 - xn * xn));
        ctx.save();
        ctx.translate(0, yA + yOff);
        ctx.fillRect(cx - R + i, bodyH - 0.55 * u, step + 0.6, 0.6 * u);
        ctx.restore();
      }
      ctx.restore();
    }

    drawRing(ctx, cx, R, ry, yA, yB, I, t, lv) {
      const hgt = yB - yA;
      ctx.save();
      sidePath(ctx, cx, yA, yB, R * 0.994, ry);
      ctx.clip();
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(cx - R, yA - 1, R * 2, hgt + ry + 3);
      const N = Math.ceil(R * 2 / 2);
      const hot = [255, 224, 168], warm = [255, 138, 48], dim = [60, 34, 18];
      const phase = this._still ? 0 : t * 0.55;
      const lvl = clamp(I, 0, 1.15);
      const prof = [0.5, 0.88, 1, 0.88, 0.5];
      for (let i = 0; i < N; i++) {
        const xn = -1 + 2 * (i + 0.5) / N;
        const th = Math.asin(xn);
        const z = Math.sqrt(Math.max(0, 1 - xn * xn));
        const yOff = ry * z;
        const comet = 0.86 + 0.14 * Math.sin(3 * (th + this.rot * 0.0) - phase * 2.2) + 0.1 * lv * Math.sin(th * 9 + t * 7);
        const e = clamp(lvl * comet * (0.55 + 0.45 * z), 0, 1.2);
        let c;
        if (e < 0.55) c = [lerp(dim[0], warm[0], e / 0.55), lerp(dim[1], warm[1], e / 0.55), lerp(dim[2], warm[2], e / 0.55)];
        else { const m = clamp((e - 0.55) / 0.6); c = [lerp(warm[0], hot[0], m), lerp(warm[1], hot[1], m), lerp(warm[2], hot[2], m)]; }
        const x = cx - R + i * 2;
        const seg = hgt / prof.length;
        for (let s = 0; s < prof.length; s++) {
          const f = prof[s];
          ctx.fillStyle = rgb(scale3(c, f));
          ctx.fillRect(x - 0.2, yA + yOff + s * seg - 0.4, 2.4, seg + 0.8);
        }
      }
      ctx.restore();
    }

    drawCap(ctx, cx, R, ry, sT, yTop, yCapBot, I, pal) {
      const alu = pal.alu;
      const capH = yCapBot - yTop;
      // side
      ctx.save();
      sidePath(ctx, cx, yTop, yCapBot, R, ry);
      ctx.clip();
      ctx.fillStyle = hGrad(ctx, cx, R, (xn) => {
        const z = Math.sqrt(Math.max(0, 1 - xn * xn));
        const f = 0.2 + 0.62 * lambert(xn) + 0.14 * z - 0.2 * Math.exp(-Math.pow((xn - 0.3) / 0.1, 2)) - 0.12 * Math.exp(-Math.pow((xn + 0.62) / 0.08, 2));
        const sp = Math.exp(-Math.pow((xn + 0.33) / 0.09, 2)) * 0.6 + Math.exp(-Math.pow((xn - 0.66) / 0.085, 2)) * 0.32 + Math.exp(-Math.pow((xn + 0.88) / 0.05, 2)) * 0.28;
        const c = scale3(alu, f * 1.0);
        return rgb([c[0] + 255 * sp * 0.5, c[1] + 255 * sp * 0.5, c[2] + 255 * sp * 0.5]);
      }, 56);
      ctx.fillRect(cx - R, yTop - 1, R * 2, capH + ry + 3);
      // lathe grooves following the curve
      const n = Math.max(3, Math.round(capH / 3.2));
      ctx.lineWidth = 0.7;
      for (let i = 1; i < n; i++) {
        const y = yTop + capH * i / n;
        ctx.strokeStyle = i % 2 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
        ctx.beginPath(); ctx.ellipse(cx, y, R, ry, 0, 0, Math.PI); ctx.stroke();
      }
      // warm bounce from the ring on the lower lip
      const gl = ctx.createLinearGradient(0, yCapBot - capH * 0.9, 0, yCapBot + ry);
      gl.addColorStop(0, 'rgba(255,150,70,0)');
      gl.addColorStop(1, 'rgba(255,150,70,' + (0.22 * I).toFixed(3) + ')');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gl;
      ctx.fillRect(cx - R, yCapBot - capH * 0.9, R * 2, capH * 0.9 + ry + 3);
      ctx.globalCompositeOperation = 'source-over';
      // lower shadow edge
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, yCapBot - 0.5, R, ry, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();

      // top face
      ctx.save();
      ctx.translate(cx, yTop);
      ctx.scale(1, sT);
      const rr = R * 0.998;
      let g = ctx.createRadialGradient(-0.3 * R, -0.35 * R, R * 0.05, 0, 0, rr * 1.05);
      g.addColorStop(0, rgb(scale3(alu, 1.04)));
      g.addColorStop(0.55, rgb(scale3(alu, 0.88)));
      g.addColorStop(1, rgb(scale3(alu, 0.64)));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.clip();
      if (ctx.createConicGradient) {
        const cg = ctx.createConicGradient(-0.5, 0, 0);
        cg.addColorStop(0.00, 'rgba(255,255,255,0.46)');
        cg.addColorStop(0.07, 'rgba(255,255,255,0)');
        cg.addColorStop(0.20, 'rgba(0,0,0,0.30)');
        cg.addColorStop(0.34, 'rgba(255,255,255,0)');
        cg.addColorStop(0.50, 'rgba(255,255,255,0.46)');
        cg.addColorStop(0.57, 'rgba(255,255,255,0)');
        cg.addColorStop(0.70, 'rgba(0,0,0,0.30)');
        cg.addColorStop(0.84, 'rgba(255,255,255,0)');
        cg.addColorStop(1.00, 'rgba(255,255,255,0.46)');
        ctx.fillStyle = cg;
        ctx.fillRect(-R, -R, R * 2, R * 2);
      }
      // lathe lines
      ctx.lineWidth = 0.6 / Math.max(0.3, sT);
      const stepR = R * 0.026;
      for (let r = R * 0.1, i = 0; r < rr; r += stepR, i++) {
        ctx.strokeStyle = i % 2 ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      }
      ctx.restore();

      // bevel
      ctx.lineWidth = R * 0.022;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, rr - R * 0.012, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.26)';
      ctx.beginPath(); ctx.arc(0, 0, rr - R * 0.012, 0.05, Math.PI - 0.05); ctx.stroke();

      // touch dial: recessed
      const dr = R * 0.52;
      g = ctx.createRadialGradient(0.12 * R, 0.16 * R, dr * 0.1, 0, 0, dr);
      g.addColorStop(0, rgb(scale3(alu, 0.8)));
      g.addColorStop(1, rgb(scale3(alu, 0.96)));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, dr, 0, TAU); ctx.fill();
      ctx.lineWidth = R * 0.03;
      ctx.strokeStyle = 'rgba(0,0,0,0.36)';
      ctx.beginPath(); ctx.arc(0, 0, dr, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = R * 0.02;
      ctx.beginPath(); ctx.arc(0, R * 0.012, dr + R * 0.018, 0.1, Math.PI - 0.1); ctx.stroke();
      // dial ticks that turn with the speaker
      for (let i = 0; i < 24; i++) {
        const a = this.rot + i / 24 * TAU;
        const major = i % 6 === 0;
        const r0 = dr * (major ? 0.62 : 0.72), r1 = dr * 0.86;
        ctx.strokeStyle = major ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)';
        ctx.lineWidth = R * (major ? 0.012 : 0.007);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
      }
      // lit indicator
      const ia = this.rot * 1.0 + Math.PI * 0.5;
      const ix = Math.cos(ia) * dr * 0.5, iy = Math.sin(ia) * dr * 0.5;
      g = ctx.createRadialGradient(ix, iy, 0, ix, iy, R * 0.09);
      g.addColorStop(0, 'rgba(255,214,150,' + clamp(0.9 * I, 0, 1).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ix - R * 0.1, iy - R * 0.1, R * 0.2, R * 0.2);
      ctx.fillStyle = 'rgba(255,238,200,0.95)';
      ctx.beginPath(); ctx.arc(ix, iy, R * 0.017, 0, TAU); ctx.fill();

      // microphone array
      for (let i = 0; i < 6; i++) {
        const a = this.rot + i / 6 * TAU + Math.PI / 6;
        const mx = Math.cos(a) * R * 0.76, my = Math.sin(a) * R * 0.76;
        ctx.fillStyle = 'rgba(10,8,6,0.8)';
        ctx.beginPath(); ctx.arc(mx, my, R * 0.022, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(mx - R * 0.004, my + R * 0.008, R * 0.012, 0, Math.PI); ctx.fill();
      }
      ctx.restore();

      // crisp highlight where the top face meets the side
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, yTop + 0.4, R, ry, 0, 0.12, Math.PI - 0.12); ctx.stroke();
      ctx.restore();
    }
  }

  Speaker.all = [];
  Speaker.frame = function (t, dt) {
    for (let i = 0; i < Speaker.all.length; i++) {
      const s = Speaker.all[i];
      if (s.visible && s.needsFrame()) { s.dirty = false; s.render(t, dt); }
    }
  };
  Halo.makeKnit = makeTexture;

  Halo.Speaker = Speaker;
  Halo.clamp = clamp;
  Halo.lerp = lerp;
})(window);
