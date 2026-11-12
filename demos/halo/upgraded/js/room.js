/* Halo — the room heat map (image-source model). Draws only when the speaker moves or the tuning changes. */
(function (global) {
  'use strict';
  const Halo = (global.Halo = global.Halo || {});
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ============================================================
     Room heat map (image-source model, first + second order)
     ============================================================ */
  const LX = 6.4, LY = 4.2, C = 343;
  const GW = 112, GH = 74;

  const LUT = (function () {
    const stops = [
      [0.00, 14, 26, 38], [0.24, 28, 50, 68], [0.44, 62, 88, 108], [0.60, 150, 124, 104],
      [0.76, 255, 168, 98], [0.90, 255, 208, 150], [1.00, 255, 243, 226]
    ];
    const out = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let k = 0;
      while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
      const a = stops[k], b = stops[k + 1];
      const t = clamp((v - a[0]) / (b[0] - a[0]));
      out[i * 3] = lerp(a[1], b[1], t);
      out[i * 3 + 1] = lerp(a[2], b[2], t);
      out[i * 3 + 2] = lerp(a[3], b[3], t);
    }
    return out;
  })();

  class RoomSim {
    constructor(canvas, handle, root) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.handle = handle;
      this.root = root;
      this.off = document.createElement('canvas');
      this.off.width = GW; this.off.height = GH;
      this.octx = this.off.getContext('2d');
      this.img = this.octx.createImageData(GW, GH);
      this.A = new Float32Array(GW * GH);
      this.B = new Float32Array(GW * GH);
      this.src = { x: 1.0, y: 1.55 };
      this.tgt = { x: 1.0, y: 1.55 };
      this.tune = 1; this.tuneT = 1;
      this.dirty = true;
      this.visible = false;
      this.dragging = false;
      this.seats = [
        { name: 'Sofa', x: 5.15, y: 1.9 },
        { name: 'Desk', x: 3.85, y: 1.15 },
        { name: 'Kitchen', x: 1.5, y: 3.2 }
      ];
      this.seatEls = [].slice.call(root.querySelectorAll('.seat[data-seat]'));
      this.spreadEl = root.querySelector('#spread');
      this.stats = { a: [0, 0, 0], b: [0, 0, 0], sa: 0, sb: 0 };
      this.lastText = 0;
      this.t = 0;
      this.w = 1; this.h = 1; this.dpr = 1;
      this.xs = new Float32Array(GW); this.ys = new Float32Array(GH);
      for (let i = 0; i < GW; i++) this.xs[i] = (i + 0.5) / GW * LX;
      for (let j = 0; j < GH; j++) this.ys[j] = (j + 0.5) / GH * LY;
      this.bind();
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver((e) => { this.visible = e[e.length - 1].isIntersecting; }, { rootMargin: '80px' }).observe(canvas);
      this.compute();
    }

    setTune(v) { this.tuneT = v; }

    bind() {
      const h = this.handle;
      let id = null;
      h.addEventListener('pointerdown', (e) => {
        id = e.pointerId; this.dragging = true;
        try { h.setPointerCapture(id); } catch (_) {}
        h.classList.add('is-drag');
        this.moveTo(e);
      });
      h.addEventListener('pointermove', (e) => { if (this.dragging && e.pointerId === id) this.moveTo(e); });
      const end = (e) => { if (e.pointerId !== id) return; this.dragging = false; id = null; h.classList.remove('is-drag'); };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
      h.addEventListener('lostpointercapture', end);
      h.addEventListener('keydown', (e) => {
        const d = 0.2;
        const m = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
        if (!m) return;
        e.preventDefault();
        this.tgt.x = clamp(this.tgt.x + m[0], 0.4, LX - 0.4);
        this.tgt.y = clamp(this.tgt.y + m[1], 0.4, LY - 0.4);
      });
      // clicking the floor also moves the speaker
      this.canvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        this.moveTo(e);
      });
    }

    moveTo(e) {
      const r = this.canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * LX;
      const y = (e.clientY - r.top) / r.height * LY;
      this.tgt.x = clamp(x, 0.4, LX - 0.4);
      this.tgt.y = clamp(y, 0.4, LY - 0.4);
    }

    resize() {
      const c = this.canvas;
      const w = Math.max(1, c.clientWidth), h = Math.max(1, c.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = w; this.h = h; this.dpr = dpr;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      this.needsDraw = true;
    }

    compute() {
      const sx = this.src.x, sy = this.src.y;
      const imgs = [];
      for (let p = -1; p <= 1; p++) {
        for (let q = -1; q <= 1; q++) {
          const x = (p % 2 === 0) ? p * LX + sx : p * LX + (LX - sx);
          const y = (q % 2 === 0) ? q * LY + sy : q * LY + (LY - sy);
          imgs.push({ x, y, a: Math.pow(0.8, Math.abs(p) + Math.abs(q)) });
        }
      }
      const nI = imgs.length;
      const freqs = [96, 106, 118, 130, 142, 156];
      const ks = freqs.map((f) => TAU * f / C);
      const k0 = TAU * 120 / C;
      const r = new Float32Array(nI);
      const A = this.A, B = this.B;
      let sumA = 0, sumB = 0;
      for (let j = 0; j < GH; j++) {
        const y = this.ys[j];
        for (let i = 0; i < GW; i++) {
          const x = this.xs[i];
          for (let n = 0; n < nI; n++) {
            const dx = x - imgs[n].x, dy = y - imgs[n].y;
            r[n] = Math.sqrt(dx * dx + dy * dy);
          }
          // untuned: a single tone (standing-wave pattern)
          let re = 0, im = 0;
          for (let n = 0; n < nI; n++) {
            const am = imgs[n].a / (r[n] + 0.9);
            re += am * Math.cos(k0 * r[n]); im += am * Math.sin(k0 * r[n]);
          }
          const pa = re * re + im * im + 1e-6;
          // tuned: energy averaged across a band, then mean-pulled by the correction filter
          let e = 0;
          for (let f = 0; f < ks.length; f++) {
            let a = 0, b = 0;
            for (let n = 0; n < nI; n++) {
              const am = imgs[n].a / (r[n] + 0.9);
              a += am * Math.cos(ks[f] * r[n]); b += am * Math.sin(ks[f] * r[n]);
            }
            e += a * a + b * b;
          }
          e = e / ks.length + 1e-6;
          const idx = j * GW + i;
          A[idx] = 10 * Math.log10(pa);
          B[idx] = 10 * Math.log10(e);
          sumA += A[idx]; sumB += B[idx];
        }
      }
      const n = GW * GH;
      const mA = sumA / n, mB = sumB / n;
      const sortA = [], sortB = [];
      for (let i = 0; i < n; i++) {
        A[i] -= mA;
        B[i] = (B[i] - mB) * 0.5; // the correction filter flattens what the band-average leaves
        if (i % 7 === 0) { sortA.push(A[i]); sortB.push(B[i]); }
      }
      sortA.sort((a, b) => a - b); sortB.sort((a, b) => a - b);
      const q = (arr, p) => arr[Math.floor(p * (arr.length - 1))];
      this.stats.sa = (q(sortA, 0.9) - q(sortA, 0.1)) / 2;
      this.stats.sb = (q(sortB, 0.9) - q(sortB, 0.1)) / 2;
      this.seats.forEach((s, k) => {
        const i = clamp(Math.floor(s.x / LX * GW), 0, GW - 1), j = clamp(Math.floor(s.y / LY * GH), 0, GH - 1);
        this.stats.a[k] = A[j * GW + i];
        this.stats.b[k] = B[j * GW + i];
      });
      this.dirty = false;
      this.textDirty = true;
    }

    px(x, y) { return [x / LX * this.w, y / LY * this.h]; }

    frame(t, dt) {
      this.t = t;
      // ease speaker towards the target
      const k = 1 - Math.exp(-dt * 10);
      const dx = this.tgt.x - this.src.x, dy = this.tgt.y - this.src.y;
      if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
        this.src.x += dx * k; this.src.y += dy * k;
        this.dirty = true;
      }
      const tuning = Math.abs(this.tune - this.tuneT) > 0.0005;
      this.tune += (this.tuneT - this.tune) * (1 - Math.exp(-dt * 4.5));
      if (!tuning && !this.dirty && !this.needsDraw) return;
      this.needsDraw = false;
      if (this.dirty) this.compute();

      // heat map
      const d = this.img.data, A = this.A, B = this.B, m = this.tune;
      for (let i = 0, n = GW * GH; i < n; i++) {
        const v = lerp(A[i], B[i], m);
        const s = Math.pow(clamp((v + 13) / 24), 1.45) * 255 | 0;
        const o = i * 4, l = s * 3;
        d[o] = LUT[l]; d[o + 1] = LUT[l + 1]; d[o + 2] = LUT[l + 2]; d[o + 3] = 255;
      }
      this.octx.putImageData(this.img, 0, 0);

      const ctx = this.ctx, w = this.w, h = this.h, dpr = this.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.off, 0, 0, w, h);

      const sp = this.px(this.src.x, this.src.y);

      // furniture
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(232,240,244,0.38)';
      ctx.fillStyle = 'rgba(10,20,30,0.30)';
      const box = (x, y, bw, bh, r) => {
        const a = this.px(x, y), b = this.px(x + bw, y + bh);
        const rad = r || 6;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(a[0], a[1], b[0] - a[0], b[1] - a[1], rad); else ctx.rect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
        ctx.fill(); ctx.stroke();
      };
      box(5.45, 0.75, 0.8, 2.3, 8);     // sofa
      box(3.1, 0.15, 1.5, 0.6, 5);      // desk
      box(0.15, 3.5, 2.7, 0.55, 5);     // kitchen counter
      box(2.4, 1.5, 1.9, 1.5, 10);      // rug / table
      ctx.restore();

      // walls
      ctx.strokeStyle = 'rgba(232,240,244,0.75)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

      // seats
      ctx.font = '500 ' + Math.max(9, Math.min(12, w / 70)) + 'px Archivo, system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      this.seats.forEach((s) => {
        const p = this.px(s.x, s.y);
        ctx.fillStyle = 'rgba(14,26,38,0.85)';
        ctx.beginPath(); ctx.arc(p[0], p[1], 5.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#eef3f4'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p[0], p[1], 5.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(240,246,248,0.95)';
        ctx.fillText(s.name.toUpperCase(), p[0] + 11, p[1]);
      });

      if (this.handle) this.handle.style.transform = 'translate(' + (this.canvas.offsetLeft + sp[0]).toFixed(1) + 'px,' + (this.canvas.offsetTop + sp[1]).toFixed(1) + 'px) translate(-50%,-50%)';

      // readouts (throttled)
      if (this.textDirty || Math.abs(this.tune - this.tuneT) > 0.001) {
        const now = performance.now();
        if (now - this.lastText > 60) {
          this.lastText = now; this.textDirty = false;
          this.seatEls.forEach((el, k) => {
            const v = lerp(this.stats.a[k], this.stats.b[k], this.tune);
            el.querySelector('b').textContent = (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + ' dB';
            el.querySelector('u').style.transform = 'scaleX(' + clamp((v + 12) / 22).toFixed(3) + ')';
          });
          const sp2 = lerp(this.stats.sa, this.stats.sb, this.tune);
          if (this.spreadEl) this.spreadEl.textContent = '±' + sp2.toFixed(1) + ' dB';
        }
      }
    }
  }

  Halo.RoomSim = RoomSim;
})(window);
