/* Halo — acoustic visualisations: the room heat map and the polar comparison. */
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
      [0.00, 16, 12, 10], [0.22, 52, 27, 15], [0.42, 128, 60, 20], [0.60, 205, 105, 34],
      [0.76, 255, 165, 80], [0.90, 255, 213, 148], [1.00, 255, 244, 224]
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
      this.tune += (this.tuneT - this.tune) * (1 - Math.exp(-dt * 4.5));
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

      // wavefronts
      const sp = this.px(this.src.x, this.src.y);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      const ppm = w / LX;
      for (let i = 0; i < 6; i++) {
        const ph = ((t * 0.28 + i / 6) % 1);
        const rr = ph * 5.2 * ppm;
        ctx.strokeStyle = 'rgba(255,236,206,' + (Math.pow(1 - ph, 2) * 0.28).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sp[0], sp[1], rr, 0, TAU); ctx.stroke();
      }
      ctx.restore();

      // furniture
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,244,228,0.34)';
      ctx.fillStyle = 'rgba(12,9,7,0.34)';
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
      ctx.strokeStyle = 'rgba(255,244,228,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

      // seats
      ctx.font = '500 ' + Math.max(9, Math.min(12, w / 70)) + 'px "DM Mono", ui-monospace, monospace';
      ctx.textBaseline = 'middle';
      this.seats.forEach((s) => {
        const p = this.px(s.x, s.y);
        ctx.fillStyle = 'rgba(11,10,9,0.78)';
        ctx.beginPath(); ctx.arc(p[0], p[1], 5.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p[0], p[1], 5.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(255,248,236,0.92)';
        ctx.fillText(s.name.toUpperCase(), p[0] + 11, p[1]);
      });

      // speaker marker
      ctx.save();
      ctx.translate(sp[0], sp[1]);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      let g = ctx.createRadialGradient(0, 0, 4, 0, 0, 38);
      g.addColorStop(0, 'rgba(255,200,120,0.55)'); g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0b0a09'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb15a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,177,90,' + (0.55 - 0.4 * pulse).toFixed(3) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 19 + pulse * 9, 0, TAU); ctx.stroke();
      ctx.restore();

      if (this.handle) this.handle.style.transform = 'translate(' + (this.canvas.offsetLeft + sp[0]).toFixed(1) + 'px,' + (this.canvas.offsetTop + sp[1]).toFixed(1) + 'px) translate(-50%,-50%)';

      // readouts (throttled)
      if (this.textDirty || Math.abs(this.tune - this.tuneT) > 0.001) {
        const now = performance.now();
        if (now - this.lastText > 60) {
          this.lastText = now; this.textDirty = false;
          this.seatEls.forEach((el, k) => {
            const v = lerp(this.stats.a[k], this.stats.b[k], this.tune);
            el.querySelector('b').textContent = (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + ' dB';
            el.querySelector('u').style.width = (clamp((v + 12) / 22) * 100).toFixed(1) + '%';
          });
          const sp2 = lerp(this.stats.sa, this.stats.sb, this.tune);
          if (this.spreadEl) this.spreadEl.textContent = '±' + sp2.toFixed(1) + ' dB';
        }
      }
    }
  }

  /* ============================================================
     Polar comparison
     ============================================================ */
  const shared = { angle: 2.4, user: false, dist: 0.62 };

  class Polar {
    constructor(canvas, kind, readEl) {
      this.canvas = canvas; this.kind = kind; this.readEl = readEl;
      this.ctx = canvas.getContext('2d');
      this.visible = false; this.w = 1; this.h = 1; this.dpr = 1;
      this.aim = -Math.PI / 2;
      this.lastTxt = '';
      this.bind();
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver((e) => { this.visible = e[e.length - 1].isIntersecting; }, { rootMargin: '80px' }).observe(canvas);
    }

    D(th) {
      const d = th - this.aim;
      if (this.kind === 'conv') {
        const c = 0.5 + 0.5 * Math.cos(d);
        return 0.07 + 0.93 * Math.pow(c, 1.8);
      }
      return 0.9 + 0.1 * Math.cos(6 * d);
    }

    bind() {
      const c = this.canvas;
      c.style.touchAction = 'pan-y';
      let down = false;
      const set = (e) => {
        const r = c.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        shared.angle = Math.atan2(y, x);
        shared.dist = clamp(Math.hypot(x, y) / (r.width * 0.46), 0.25, 1);
        shared.user = true;
      };
      c.addEventListener('pointerdown', (e) => { down = true; try { c.setPointerCapture(e.pointerId); } catch (_) {} set(e); });
      c.addEventListener('pointermove', (e) => { if (down) set(e); });
      const end = () => { down = false; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    }

    resize() {
      const c = this.canvas;
      const w = Math.max(1, c.clientWidth), h = Math.max(1, c.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = w; this.h = h; this.dpr = dpr;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }

    frame(t) {
      const ctx = this.ctx, w = this.w, h = this.h, dpr = this.dpr;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
      const halo = this.kind === 'halo';
      const tone = halo ? '255,177,90' : '214,208,196';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // guides
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = 'rgba(239,233,222,' + (0.05 + i * 0.012) + ')';
        ctx.beginPath(); ctx.arc(cx, cy, R * i / 3, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(239,233,222,0.06)';
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      }

      // directivity balloon
      const SEG = 120;
      ctx.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const a = i / SEG * TAU, r = R * (0.12 + 0.88 * this.D(a));
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
      const gb = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
      gb.addColorStop(0, 'rgba(' + tone + ',0.28)'); gb.addColorStop(1, 'rgba(' + tone + ',0.05)');
      ctx.fillStyle = gb; ctx.fill();
      ctx.strokeStyle = 'rgba(' + tone + ',0.9)'; ctx.lineWidth = 1.6; ctx.stroke();

      // wavefronts, loudness varies with direction
      const NSEG = 72;
      for (let k = 0; k < 4; k++) {
        const ph = ((t * 0.3 + k / 4) % 1);
        const rr = R * (0.14 + ph * 0.86);
        for (let i = 0; i < NSEG; i++) {
          const a0 = i / NSEG * TAU, a1 = (i + 1.04) / NSEG * TAU;
          const D = this.D((a0 + a1) / 2);
          const al = Math.pow(1 - ph, 1.4) * (0.1 + 0.9 * D) * 0.8;
          ctx.strokeStyle = 'rgba(' + tone + ',' + al.toFixed(3) + ')';
          ctx.lineWidth = 0.7 + 2.4 * D * (1 - ph * 0.5);
          ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.stroke();
        }
      }

      // people around the edge
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + 0.1;
        const D = this.D(a);
        const rr = R * 1.0;
        ctx.fillStyle = 'rgba(' + tone + ',' + (0.12 + 0.88 * D).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2 + 3.2 * D, 0, TAU); ctx.fill();
      }

      // speaker
      ctx.save();
      ctx.translate(cx, cy);
      if (!halo) {
        ctx.rotate(this.aim + Math.PI / 2);
        ctx.fillStyle = '#d6d0c4';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-R * 0.1, -R * 0.14, R * 0.2, R * 0.28, 4); else ctx.rect(-R * 0.1, -R * 0.14, R * 0.2, R * 0.28);
        ctx.fill();
        ctx.fillStyle = '#0b0a09'; ctx.beginPath(); ctx.arc(0, -R * 0.03, R * 0.055, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = '#0b0a09'; ctx.strokeStyle = '#ffb15a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd9a0';
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU + t * 0.2;
          ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.075, Math.sin(a) * R * 0.075, 2, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();

      // the listener
      const ang = shared.user ? shared.angle : (2.35 + Math.sin(t * 0.35) * 1.15 + t * 0.12);
      const dist = shared.user ? shared.dist : 0.78;
      const lx = cx + Math.cos(ang) * R * dist, ly = cy + Math.sin(ang) * R * dist;
      const D = this.D(ang);
      const db = 20 * Math.log10(D);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lx, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#faf6ee';
      ctx.beginPath(); ctx.arc(lx, ly, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(lx, ly, 12 + 2 * Math.sin(t * 3), 0, TAU); ctx.stroke();

      const txt = (db > -0.05 ? '0' : '−' + Math.abs(db).toFixed(0)) + ' dB';
      if (txt !== this.lastTxt && this.readEl) { this.readEl.textContent = txt; this.lastTxt = txt; }
    }
  }

  Halo.RoomSim = RoomSim;
  Halo.Polar = Polar;
})(window);
