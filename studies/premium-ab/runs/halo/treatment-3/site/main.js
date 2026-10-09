/* Halo 02 — page behaviour. Runs after speaker.js and motion-kit.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* Finish applied to every speaker instance. */
  const heroFinish = document.documentElement;
  heroFinish.dataset.finish = 'chalk';

  /* ---------- hero: pointer moves the light across the cylinder ---------- */
  (() => {
    const hero = $('.hero');
    const speakers = $$('#hero-speaker');
    let tx = 0, cx = 0, raf = 0;
    const loop = () => {
      cx = lerp(cx, tx, 0.08);
      speakers.forEach((s) => s.style.setProperty('--lx', cx.toFixed(3)));
      raf = Math.abs(tx - cx) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    if (reduce.matches) return;
    hero.addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  })();

  /* ---------- manifesto: words light up as you read ---------- */
  (() => {
    const el = $('#manifesto');
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  })();

  /* ---------- pinned story: step state from progress ---------- */
  (() => {
    const story = $('#object'), stage = $('.stage', story);
    const steps = $$('.step', story), n = $('[data-step-n]');
    let current = -1, queued = false;
    const update = () => {
      queued = false;
      const r = story.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
      if (idx !== current) {
        current = idx;
        stage.dataset.step = idx;
        steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
        n.textContent = String(idx + 1).padStart(2, '0');
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    update();
  })();

  /* ---------- visibility helper for ambient loops ---------- */
  const watch = (el, onChange) => {
    if (!('IntersectionObserver' in window)) { onChange(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => onChange(e.isIntersecting)), { rootMargin: '80px' }).observe(el);
  };

  /* ---------- sound field canvas ---------- */
  (() => {
    const cv = $('#field'), ctx = cv.getContext('2d');
    const read = $('#field-read');
    const places = { open: [0.5, 0.46], wall: [0.5, 0.14], corner: [0.1, 0.16] };
    const roomM = { w: 5, h: 3.4 };
    let W = 0, H = 0, dpr = 1, room, running = false, raf = 0, t0 = performance.now();
    const sp = { x: places.open[0], y: places.open[1] };
    let spT = { ...sp };
    const ls = { x: 0.74, y: 0.74 }; let lsT = { ...ls };
    let lastRead = 0;

    function size() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const m = Math.max(14, W * 0.04);
      room = { x0: m, y0: m, x1: W - m, y1: H - m };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }

    const P = (u) => ({ x: room.x0 + u.x * (room.x1 - room.x0), y: room.y0 + u.y * (room.y1 - room.y0) });

    function draw(now) {
      const t = reduce.matches ? 1.4 : (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const rw = room.x1 - room.x0, rh = room.y1 - room.y0;
      // floor
      const g = ctx.createLinearGradient(0, room.y0, 0, room.y1);
      g.addColorStop(0, '#171410'); g.addColorStop(1, '#0f0d0a');
      ctx.fillStyle = g; ctx.fillRect(room.x0, room.y0, rw, rh);
      // furniture (outlines): sofa and rug
      ctx.strokeStyle = 'rgba(255,240,220,.1)'; ctx.lineWidth = 1;
      ctx.strokeRect(room.x0 + rw * 0.58, room.y0 + rh * 0.8, rw * 0.34, rh * 0.14);
      ctx.setLineDash([3, 5]); ctx.strokeRect(room.x0 + rw * 0.3, room.y0 + rh * 0.38, rw * 0.4, rh * 0.4); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,240,220,.28)'; ctx.font = '500 10px "Inter Tight", sans-serif';
      ctx.fillText('SOFA', room.x0 + rw * 0.58 + 8, room.y0 + rh * 0.8 + 18);

      const s = P(sp);
      const walls = { l: room.x0, r: room.x1, t: room.y0, b: room.y1 };
      const src = [{ x: s.x, y: s.y, a: 1 }];
      const mx = [2 * walls.l - s.x, 2 * walls.r - s.x], my = [2 * walls.t - s.y, 2 * walls.b - s.y];
      mx.forEach((x) => src.push({ x, y: s.y, a: 0.4 }));
      my.forEach((y) => src.push({ x: s.x, y, a: 0.4 }));
      mx.forEach((x) => my.forEach((y) => src.push({ x, y, a: 0.18 })));

      ctx.save();
      ctx.beginPath(); ctx.rect(room.x0, room.y0, rw, rh); ctx.clip();
      const lambda = Math.max(26, W * 0.055), speed = lambda / 2.4;
      const Rmax = Math.hypot(rw, rh) * 1.15;
      const phase = (t * speed) % lambda;
      for (let k = 0; k < src.length; k++) {
        const o = src[k];
        for (let r = phase; r < Rmax; r += lambda) {
          const fall = Math.pow(1 - r / Rmax, 1.5);
          const a = o.a * fall * (r < lambda ? r / lambda : 1);
          if (a < 0.01) continue;
          ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = k === 0 ? `rgba(243,185,122,${(a * 0.9).toFixed(3)})` : `rgba(241,236,226,${(a * 0.55).toFixed(3)})`;
          ctx.lineWidth = k === 0 ? 1.4 : 1;
          ctx.stroke();
        }
      }
      ctx.restore();

      // walls
      ctx.strokeStyle = 'rgba(255,240,220,.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(room.x0, room.y0, rw, rh);

      // listener and direct path
      const l = P(ls);
      ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(241,236,226,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(l.x, l.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#f1ece2'; ctx.beginPath(); ctx.arc(l.x, l.y, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(241,236,226,.35)'; ctx.beginPath(); ctx.arc(l.x, l.y, 11 + Math.sin(t * 2) * 1.5, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(241,236,226,.7)'; ctx.fillText('YOU', l.x + 16, l.y + 4);

      // speaker + halo
      const pulse = 1 + Math.sin(t * 2.2) * 0.06;
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 34);
      glow.addColorStop(0, 'rgba(243,185,122,.55)'); glow.addColorStop(1, 'rgba(243,185,122,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(s.x, s.y, 34 * pulse, 0, 7); ctx.fill();
      ctx.fillStyle = '#d9d3c7'; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#f3b97a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.stroke();

      if (now - lastRead > 120) {
        lastRead = now;
        const dpx = Math.hypot(l.x - s.x, l.y - s.y), m = dpx / rw * roomM.w;
        read.textContent = `Listener ${m.toFixed(1)} m · arrives in ${(m / 343 * 1000).toFixed(1)} ms`;
      }
    }

    function frame(now) {
      sp.x = lerp(sp.x, spT.x, 0.1); sp.y = lerp(sp.y, spT.y, 0.1);
      ls.x = lerp(ls.x, lsT.x, 0.14); ls.y = lerp(ls.y, lsT.y, 0.14);
      draw(now);
      raf = running ? requestAnimationFrame(frame) : 0;
    }
    function start() { if (!running && !reduce.matches) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; }
    watch(cv, (v) => (v ? start() : stop()));
    addEventListener('resize', size);

    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      lsT = { x: clamp((e.clientX - r.left - room.x0) / (room.x1 - room.x0), 0.04, 0.96), y: clamp((e.clientY - r.top - room.y0) / (room.y1 - room.y0), 0.04, 0.96) };
      if (reduce.matches) { ls.x = lsT.x; ls.y = lsT.y; draw(performance.now()); }
    });
    cv.addEventListener('pointerleave', () => { lsT = { x: 0.74, y: 0.74 }; if (reduce.matches) { ls.x = 0.74; ls.y = 0.74; draw(performance.now()); } });

    // tabs
    const tabs = $('.tabs'), ink = $('.tab-ink', tabs);
    const move = (tab) => { ink.style.setProperty('--x', tab.offsetLeft - 4 + 'px'); ink.style.setProperty('--w', tab.offsetWidth + 'px'); };
    tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('[role=tab]'); if (!tab) return;
      $$('[role=tab]', tabs).forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      move(tab);
      const p = places[tab.dataset.place]; spT = { x: p[0], y: p[1] };
      if (reduce.matches) { sp.x = p[0]; sp.y = p[1]; draw(performance.now()); }
    });
    const place = () => move($('[aria-selected=true]', tabs));
    addEventListener('resize', place);
    document.fonts && document.fonts.ready.then(place);
    place();
    size();
    if (document.fonts) document.fonts.ready.then(size);
  })();

  /* ---------- frequency response ---------- */
  (() => {
    const svg = $('#resp'), off = $('.p-off', svg), on = $('.p-on', svg), grid = $('.grid', svg);
    const N = 150, X0 = 8, X1 = 632, Y0 = 108, S = 8.6;
    const g = (x, c, w, h) => h * Math.exp(-Math.pow((x - c) / w, 2));
    const dB = (x, corrected) => {
      if (corrected) return 1.1 * Math.sin(x * 19) * 0.7 + 0.5 * Math.sin(x * 43 + 1) - g(x, 0.02, 0.05, 1.2);
      return g(x, 0.1, 0.045, 6.2) - g(x, 0.19, 0.04, 7.4) + g(x, 0.3, 0.05, 3.8) - g(x, 0.46, 0.06, 4.2) + 2 * Math.sin(x * 22) * (1 - x * 0.5) + g(x, 0.72, 0.1, 2.2);
    };
    const path = (c) => {
      let d = '';
      for (let i = 0; i <= N; i++) { const x = i / N; d += (i ? 'L' : 'M') + (X0 + x * (X1 - X0)).toFixed(1) + ' ' + (Y0 - dB(x, c) * S).toFixed(1); }
      return d;
    };
    off.setAttribute('d', path(false)); on.setAttribute('d', path(true));
    for (let i = -2; i <= 2; i++) grid.insertAdjacentHTML('beforeend', `<line x1="0" x2="640" y1="${Y0 - i * 3 * S}" y2="${Y0 - i * 3 * S}"/>`);
    watch(svg, (v) => { if (v) svg.classList.add('is-drawn'); });
    if (reduce.matches) svg.classList.add('is-drawn');
    const btn = $('#corr'), val = $('#resp-val'), state = $('#resp-state');
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(v));
      svg.classList.toggle('on', v);
      val.textContent = v ? '±1.4 dB' : '±7.4 dB';
      state.textContent = v ? 'room corrected' : 'uncorrected';
    });
  })();

  /* ---------- listening tile: sweeping frequency readout + ambient on view ---------- */
  $$('.tile').forEach((t) => watch(t, (v) => t.classList.toggle('in-view', v)));
  (() => {
    const tile = $('.t-listen'), hz = $('#eq-hz');
    const list = ['32 Hz', '63 Hz', '125 Hz', '250 Hz', '500 Hz', '1 kHz', '2 kHz', '4 kHz', '8 kHz', '16 kHz'];
    let i = 1, timer = 0;
    watch(tile, (v) => {
      clearInterval(timer);
      if (v && !reduce.matches) timer = setInterval(() => { i = (i + 1) % list.length; hz.textContent = list[i]; }, 900);
    });
  })();

  /* ---------- volume dial ---------- */
  (() => {
    const dial = $('#dial'), val = $('#dial-val');
    let v = 0.42;
    const set = (n) => {
      v = clamp(n, 0, 1);
      dial.style.setProperty('--v', v.toFixed(3));
      dial.setAttribute('aria-valuenow', Math.round(v * 100));
      val.textContent = Math.round(v * 100);
    };
    set(v);
    const fromPointer = (e) => {
      const r = dial.getBoundingClientRect();
      let a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90; // 0 = top
      if (a > 180) a -= 360;
      a = clamp(a, -135, 135);
      set((a + 135) / 270);
    };
    dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); dial.classList.add('drag'); fromPointer(e); });
    dial.addEventListener('pointermove', (e) => { if (dial.classList.contains('drag')) fromPointer(e); });
    const end = () => dial.classList.remove('drag');
    dial.addEventListener('pointerup', end); dial.addEventListener('pointercancel', end);
    dial.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.1 : 0.02;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(v + step);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(v - step);
      else if (e.key === 'Home') set(0); else if (e.key === 'End') set(1); else return;
      e.preventDefault();
    });
  })();

  /* ---------- privacy switch ---------- */
  (() => {
    const b = $('#mic'), label = $('#mic-label'), note = $('#mic-note');
    b.addEventListener('click', () => {
      const off = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(off));
      label.textContent = off ? 'Microphones off' : 'Microphones on, calibrating';
      note.textContent = off ? 'Hardware-cut. No software can turn them back on.' : 'Used only during the forty-second room measurement.';
    });
  })();

  /* ---------- pre-order ---------- */
  (() => {
    const names = { chalk: 'Chalk', moss: 'Moss', ink: 'Ink' };
    const fins = $$('.fin'), out = $('#po-finish'), sp = $('#po-speaker');
    fins.forEach((b) => b.addEventListener('click', () => {
      fins.forEach((f) => f.setAttribute('aria-checked', String(f === b)));
      sp.dataset.finish = b.dataset.f;
      out.textContent = `Halo 02 in ${names[b.dataset.f]}`;
    }));
    // roving arrows for the radio group
    $('.finish').addEventListener('keydown', (e) => {
      const i = fins.findIndex((f) => f === document.activeElement);
      if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const nxt = fins[(i + (e.key === 'ArrowRight' ? 1 : fins.length - 1)) % fins.length];
      nxt.focus(); nxt.click(); e.preventDefault();
    });
    sp.dataset.finish = 'chalk';
    const form = $('#reserve'), note = $('#form-note'), email = $('#email');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^\S+@\S+\.\S+$/.test(email.value.trim());
      note.classList.toggle('ok', ok);
      note.textContent = ok ? `Thank you. This is a demonstration page, so no deposit was taken and nothing was sent.` : 'Please enter a valid email address.';
      form.classList.toggle('done', ok);
    });
  })();

  /* the hero speaker and the story speaker keep the default finish; set data-finish on instances */
  $$('#hero-speaker, #story-speaker').forEach((s) => { s.dataset.finish = 'chalk'; });
})();
