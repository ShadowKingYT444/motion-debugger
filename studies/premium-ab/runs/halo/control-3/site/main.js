/* Halo launch page. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const RM = root.classList.contains('rm');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const glowRGB = () => getComputedStyle(root).getPropertyValue('--glow-rgb').trim() || '255,196,130';

  /* ---------- 1. Clone the hero speaker illustration everywhere it is needed ---------- */
  const heroSvg = $('#heroSpeaker');
  const heroMarkers = $('#heroSpeakerWrap .markers');
  $$('[data-clone-speaker]').forEach((host) => {
    const c = heroSvg.cloneNode(true);
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.removeAttribute('role');
    c.removeAttribute('aria-label');
    host.appendChild(c);
    if (host.id === 'anatSpeaker') host.appendChild(heroMarkers.cloneNode(true));
  });

  /* ---------- 2. Decorative dial ticks ---------- */
  $$('[data-ticks]').forEach((g) => {
    const n = +g.dataset.ticks, r1 = +g.dataset.r1, r2 = +g.dataset.r2;
    let html = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, long = i % 5 === 0 ? 7 : 0;
      const x1 = 400 + Math.cos(a) * (r1 - long), y1 = 400 + Math.sin(a) * (r1 - long);
      const x2 = 400 + Math.cos(a) * r2, y2 = 400 + Math.sin(a) * r2;
      html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    g.innerHTML = html;
  });

  /* ---------- 3. Text splitting (word masks) and scrub text ---------- */
  function wrapWords(el, make) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            frag.appendChild(make(part, i++));
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(el);
    return i;
  }
  $$('[data-split]').forEach((el) => {
    el.style.setProperty('--base', (parseFloat(el.dataset.delay) || 0) + 's');
    wrapWords(el, (txt, i) => {
      const w = document.createElement('span'); w.className = 'w';
      const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = txt;
      wi.style.setProperty('--i', i);
      w.appendChild(wi);
      return w;
    });
  });
  const scrubEl = $('[data-scrub]');
  let scrubWords = [];
  if (scrubEl) {
    wrapWords(scrubEl, (txt) => { const s = document.createElement('span'); s.className = 'sw'; s.textContent = txt; return s; });
    scrubWords = $$('.sw', scrubEl);
  }

  /* ---------- 4. Reveal on scroll ---------- */
  const revealTargets = $$('[data-reveal], [data-split], .dims, .foot-mark, #frChart, #frArea');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((t) => io.observe(t));
  } else revealTargets.forEach((t) => t.classList.add('in'));

  // counters
  const counters = $$('[data-count]');
  function runCount(el) {
    const end = +el.dataset.count;
    if (RM) { el.textContent = end; return; }
    const t0 = performance.now(), dur = 1800;
    const step = (now) => {
      const p = clamp((now - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => { if (!RM) c.textContent = '0'; cio.observe(c); });
  }

  /* ---------- 5. Finish picker (global state) ---------- */
  const finNames = { chalk: 'Chalk', fjord: 'Fjord', ember: 'Ember' };
  function setFinish(name) {
    root.dataset.finish = name;
    $$('.fin').forEach((b) => {
      const on = b.dataset.finish === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    const fn = $('#finName'); if (fn) fn.textContent = finNames[name];
    window.dispatchEvent(new Event('halo:finish'));
  }
  $$('.fin').forEach((b) => b.addEventListener('click', () => setFinish(b.dataset.finish)));

  /* ---------- 6. Speaker glow, ripples, hero intro ---------- */
  const speakers = $$('svg.speaker').map((svg) => ({
    svg,
    far: $('.s-glow-far', svg), mid: $('.s-glow-mid', svg), core: $('.s-glow-core', svg), spill: $('.s-spill', svg),
    vis: svg === heroSvg,
  }));
  if ('IntersectionObserver' in window) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { const s = speakers.find((x) => x.svg === e.target); if (s) s.vis = e.isIntersecting; });
    }, { rootMargin: '10% 0px' });
    speakers.forEach((s) => sio.observe(s.svg));
  } else speakers.forEach((s) => (s.vis = true));

  const heroLight = $('#heroLight');
  const heroEl = $('[data-hero]');
  let heroVisible = true, ignite = RM ? 1 : 0, igniteStart = 0, audioLevel = 0, vol = 0.64;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; }).observe(heroEl);
  }

  function startHero() {
    if (root.classList.contains('hero-ready')) return;
    root.classList.add('hero-ready');
    igniteStart = performance.now() + 500;
  }
  window.addEventListener('load', () => setTimeout(startHero, 60));
  setTimeout(startHero, 1400); // failsafe if load is slow

  const ripples = $('#ripples');
  function spawnRipple(power = 1) {
    if (RM || !ripples || !heroVisible) return;
    const el = document.createElement('i'); el.className = 'ripple';
    ripples.appendChild(el);
    const a = el.animate(
      [{ transform: 'translate(-50%,-50%) scale(.12)', opacity: 0.85 * power }, { transform: 'translate(-50%,-50%) scale(2)', opacity: 0 }],
      { duration: 5200, easing: 'cubic-bezier(.1,.55,.3,1)' }
    );
    a.onfinish = () => el.remove();
  }
  if (!RM) setInterval(() => { if (!audioOn) spawnRipple(.7); }, 3400);

  /* ---------- 7. Audio demo (user-initiated WebAudio) ---------- */
  let audioOn = false, actx, master, analyser, adata, pluckTimer;
  const soundBtns = $$('[data-sound]');
  function buildAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    actx = new AC();
    master = actx.createGain(); master.gain.value = 0;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 0.4;
    analyser = actx.createAnalyser(); analyser.fftSize = 512; adata = new Uint8Array(analyser.fftSize);
    const dl = actx.createDelay(1.5); dl.delayTime.value = 0.47;
    const fb = actx.createGain(); fb.gain.value = 0.44;
    const wet = actx.createGain(); wet.gain.value = 0.45;
    lp.connect(master); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
    master.connect(analyser); analyser.connect(actx.destination);
    [146.83, 220, 329.63, 369.99].forEach((f, i) => {
      const o = actx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 5;
      const g = actx.createGain(); g.gain.value = 0.05;
      const lfo = actx.createOscillator(); lfo.frequency.value = 0.06 + i * 0.03;
      const lg = actx.createGain(); lg.gain.value = 0.03;
      lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(lp); o.start(); lfo.start();
    });
    window.__pluckLP = lp;
    return true;
  }
  const scale = [293.66, 329.63, 369.99, 440, 493.88, 554.37, 659.25, 739.99, 880];
  function pluck() {
    if (!audioOn) return;
    const f = scale[Math.floor(Math.random() * scale.length)];
    const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = actx.createGain(); const t = actx.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.connect(g); g.connect(window.__pluckLP); o.start(t); o.stop(t + 3);
    spawnRipple(1);
    pluckTimer = setTimeout(pluck, 1100 + Math.random() * 1500);
  }
  function setAudio(on) {
    if (on && !actx && !buildAudio()) return;
    audioOn = on;
    soundBtns.forEach((b) => {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const l = $('.lbl', b); if (l) l.textContent = on ? 'Mute' : 'Hear the ring';
    });
    if (on) {
      actx.resume();
      master.gain.cancelScheduledValues(actx.currentTime);
      master.gain.setTargetAtTime(0.9, actx.currentTime, 0.5);
      clearTimeout(pluckTimer); pluckTimer = setTimeout(pluck, 400);
    } else {
      clearTimeout(pluckTimer);
      master.gain.setTargetAtTime(0, actx.currentTime, 0.25);
      setTimeout(() => { if (!audioOn && actx) actx.suspend(); }, 1400);
    }
  }
  soundBtns.forEach((b) => b.addEventListener('click', () => setAudio(!audioOn)));

  /* ---------- 8. Mini volume dial ---------- */
  (function () {
    const svg = $('#miniDial'); if (!svg) return;
    const arc = $('#miniDialArc'), handle = $('#miniDialHandle'), val = $('#miniDialVal');
    const ARC = 282.74;
    function set(v) {
      vol = clamp(v);
      arc.style.strokeDasharray = `${(ARC * vol).toFixed(2)} 376.99`;
      const a = (135 + 270 * vol) * Math.PI / 180;
      handle.setAttribute('cx', (80 + 60 * Math.cos(a)).toFixed(2));
      handle.setAttribute('cy', (80 + 60 * Math.sin(a)).toFixed(2));
      val.textContent = Math.round(vol * 100);
      svg.setAttribute('aria-valuenow', Math.round(vol * 100));
    }
    function fromPointer(e) {
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      let deg = Math.atan2(dy, dx) * 180 / Math.PI;
      let a = (deg - 135 + 720) % 360;
      if (a > 270) a = a > 315 ? 0 : 270;
      set(a / 270);
    }
    let down = false;
    svg.addEventListener('pointerdown', (e) => { down = true; svg.setPointerCapture(e.pointerId); fromPointer(e); });
    svg.addEventListener('pointermove', (e) => { if (down) fromPointer(e); });
    svg.addEventListener('pointerup', () => { down = false; });
    svg.addEventListener('pointercancel', () => { down = false; });
    svg.addEventListener('keydown', (e) => {
      const k = { ArrowRight: .05, ArrowUp: .05, ArrowLeft: -.05, ArrowDown: -.05 }[e.key];
      if (k) { e.preventDefault(); set(vol + k); }
    });
    set(vol);
  })();

  /* ---------- 9. Sound field canvas ---------- */
  (function () {
    const cv = $('#field'); if (!cv) return;
    const stage = $('#fieldStage'), handle = $('#fieldHandle'), hint = $('#fieldHint');
    const seg = $('.seg'), thumb = $('.seg-thumb', seg), spreadVal = $('#spreadVal'), spreadBar = $('#spreadBar');
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, rx, ry, rw, rh;
    let target = 1, m = RM ? 1 : 0.0; // mode mix: 0 conventional, 1 halo
    if (RM) m = 1;
    const sp = { x: 0.3, y: 0.5 };
    const seats = [[.07, .25], [.07, .75], [.17, .5], [.55, .2], [.58, .8], [.68, .5], [.9, .22], [.92, .78], [.82, .5]];
    let visible = false, rgb = glowRGB(), shownSpread = 0, lastT = 0, simT = 0.5;

    const pattern = (th, mix) => {
      const conv = 0.04 + 0.96 * Math.pow(Math.max(Math.cos(th), 0), 5);
      const halo = 1 + 0.06 * Math.cos(4 * th);
      return conv * (1 - mix) + halo * mix;
    };

    function resize() {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pad = 18; rx = pad; ry = pad; rw = W - pad * 2; rh = H - pad * 2;
      place(); placeThumb(); if (RM) draw(0);
    }
    function place() {
      handle.style.left = (rx + sp.x * rw) + 'px';
      handle.style.top = (ry + sp.y * rh) + 'px';
    }
    function placeThumb() {
      const b = $('button.on', seg); if (!b) return;
      thumb.style.width = b.offsetWidth + 'px';
      thumb.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    }
    function setMode(i) {
      target = i;
      $$('button', seg).forEach((b) => { const on = +b.dataset.mode === i; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      placeThumb();
      if (RM) { m = i; draw(0); }
    }
    $$('button', seg).forEach((b) => b.addEventListener('click', () => setMode(+b.dataset.mode)));

    // dragging the speaker
    let dragging = false;
    const move = (e) => {
      const r = cv.getBoundingClientRect();
      sp.x = clamp((e.clientX - r.left - rx) / rw, 0.05, 0.95);
      sp.y = clamp((e.clientY - r.top - ry) / rh, 0.08, 0.92);
      place(); if (RM) draw(0);
    };
    handle.addEventListener('pointerdown', (e) => { dragging = true; handle.classList.add('drag'); handle.setPointerCapture(e.pointerId); hint.classList.add('gone'); move(e); });
    handle.addEventListener('pointermove', (e) => { if (dragging) move(e); });
    const end = () => { dragging = false; handle.classList.remove('drag'); };
    handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-.03, 0], ArrowRight: [.03, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04] }[e.key];
      if (!d) return; e.preventDefault();
      sp.x = clamp(sp.x + d[0], .05, .95); sp.y = clamp(sp.y + d[1], .08, .92); hint.classList.add('gone'); place(); if (RM) draw(0);
    });

    function levels() {
      const px = rx + sp.x * rw, py = ry + sp.y * rh, ref = (rw + rh) / 2;
      return seats.map(([sx, sy]) => {
        const x = rx + sx * rw, y = ry + sy * rh, dx = x - px, dy = y - py;
        const d = Math.hypot(dx, dy) / ref, th = Math.atan2(dy, dx);
        const pat = pattern(th, m);
        const lvl = pat / Math.sqrt(Math.max(d, 0.06));
        return { x, y, d, th, pat, db: 20 * Math.log10(lvl / 4.08) };
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const px = rx + sp.x * rw, py = ry + sp.y * rh;
      // room
      ctx.save();
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, 14); else ctx.rect(rx, ry, rw, rh); ctx.strokeStyle = 'rgba(241,236,227,.22)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.clip();
      // floor dots
      ctx.fillStyle = 'rgba(241,236,227,.07)';
      for (let gx = rx + 14; gx < rx + rw; gx += 28) for (let gy = ry + 14; gy < ry + rh; gy += 28) ctx.fillRect(gx, gy, 1.5, 1.5);

      const maxR = Math.hypot(rw, rh) * 0.95, gap = Math.min(rw, rh) * 0.22, speed = gap * 0.55;
      // ambient glow
      const g0 = ctx.createRadialGradient(px, py, 0, px, py, maxR * 0.5);
      g0.addColorStop(0, `rgba(${rgb},${0.16 * m + 0.05})`); g0.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g0; ctx.fillRect(rx, ry, rw, rh);
      // conventional cone
      if (m < 0.98) {
        ctx.save(); ctx.translate(px, py);
        const gc = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.7);
        gc.addColorStop(0, `rgba(${rgb},${0.2 * (1 - m)})`); gc.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = gc; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, maxR * 0.7, -0.7, 0.7); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // rings
      const N = 90, K = Math.ceil(maxR / gap) + 1, off = (t * speed) % gap;
      ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let k = 0; k < K; k++) {
        const r = off + k * gap;
        const fall = Math.pow(clamp(1 - r / maxR), 1.3);
        if (fall <= 0.01) continue;
        for (let j = 0; j < N; j++) {
          const a0 = (j / N) * Math.PI * 2, a1 = ((j + 1) / N) * Math.PI * 2 + 0.02;
          const al = pattern((a0 + a1) / 2, m) * fall * 0.85 * Math.min(1, r / 24);
          if (al < 0.025) continue;
          ctx.strokeStyle = `rgba(${rgb},${al.toFixed(3)})`;
          ctx.beginPath(); ctx.arc(px, py, r, a0, a1); ctx.stroke();
        }
      }
      // seats
      const L = levels(); let mx = -99, mn = 99;
      L.forEach((s) => { mx = Math.max(mx, s.db); mn = Math.min(mn, s.db); });
      L.forEach((s) => {
        const b = clamp((s.db + 30) / 30);
        // pulse when a ring passes
        let bump = 0;
        for (let k = 0; k < K; k++) { const r = off + k * gap, dd = (r - s.d * ((rw + rh) / 2)) / 14; bump = Math.max(bump, Math.exp(-dd * dd) * s.pat); }
        const a = 0.14 + 0.86 * b;
        ctx.beginPath(); ctx.arc(s.x, s.y, 5 + 4 * b + bump * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${clamp(a * (0.7 + 0.5 * bump)).toFixed(3)})`;
        ctx.shadowColor = `rgba(${rgb},${(0.9 * b).toFixed(2)})`; ctx.shadowBlur = 16 * b + bump * 10; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(241,236,227,${(0.35 + 0.35 * b).toFixed(2)})`;
        ctx.font = '500 10px "DM Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText((s.db >= -0.5 ? '0' : Math.round(s.db)) + ' dB', s.x, s.y + 22);
      });
      ctx.restore();

      const spread = mx - mn;
      shownSpread = RM ? spread : lerp(shownSpread, spread, 0.12);
      spreadVal.textContent = Math.round(shownSpread);
      spreadBar.style.transform = `scaleX(${clamp(shownSpread / 40, 0.04, 1).toFixed(3)})`;
    }

    function loop(now) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
      simT += dt; m = lerp(m, target, 1 - Math.pow(0.001, dt));
      if (Math.abs(m - target) < 0.002) m = target;
      draw(simT);
      requestAnimationFrame(loop);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => {
        const v = e[0].isIntersecting;
        if (v && !visible && !RM) { visible = true; lastT = performance.now(); requestAnimationFrame(loop); }
        visible = v;
      }, { rootMargin: '80px' }).observe(stage);
    }
    window.addEventListener('halo:finish', () => { rgb = glowRGB(); if (RM) draw(0); });
    new ResizeObserver(resize).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);
    resize();
  })();

  /* ---------- 10. Frequency response chart ---------- */
  (function () {
    const svg = $('#frChart'); if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const X0 = 44, X1 = 880, Y0 = 14, Y1 = 236, DB = 10;
    const xOf = (f) => X0 + (Math.log10(f / 20) / 3) * (X1 - X0);
    const yOf = (db) => Y0 + ((DB - db) / (2 * DB)) * (Y1 - Y0);
    const resp = (f) => {
      const lf = Math.log10(f);
      const hp = -10 * Math.log10(1 + Math.pow(31 / f, 4));
      const lp = -10 * Math.log10(1 + Math.pow(f / 26000, 4));
      const rip = 0.45 * Math.sin(2 * Math.PI * lf * 3.1 + 0.6) + 0.25 * Math.sin(2 * Math.PI * lf * 7.3 + 1);
      const bump = 0.5 * Math.exp(-Math.pow((lf - Math.log10(3200)) / 0.22, 2));
      const dip = -0.4 * Math.exp(-Math.pow((lf - Math.log10(230)) / 0.12, 2));
      return hp + lp + (rip + bump + dip) * clamp((f - 25) / 30);
    };
    const mk = (n, a, parent = svg) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); parent.appendChild(e); return e; };
    const grid = $('#frGrid');
    [-6, 0, 6].forEach((d) => {
      mk('line', { x1: X0, x2: X1, y1: yOf(d), y2: yOf(d), class: 'gl' }, grid);
      const t = mk('text', { x: 0, y: yOf(d) + 4 }, grid); t.textContent = (d > 0 ? '+' : '') + d;
    });
    [[20, '20 Hz'], [100, '100'], [1000, '1 kHz'], [10000, '10 kHz'], [20000, '20k']].forEach(([f, l]) => {
      mk('line', { x1: xOf(f), x2: xOf(f), y1: Y0, y2: Y1, class: 'gl' }, grid);
      const t = mk('text', { x: xOf(f), y: Y1 + 28, 'text-anchor': f === 20 ? 'start' : f === 20000 ? 'end' : 'middle' }, grid); t.textContent = l;
    });
    const band = $('#frBand');
    band.setAttribute('x', xOf(38)); band.setAttribute('width', xOf(20000) - xOf(38));
    band.setAttribute('y', yOf(2)); band.setAttribute('height', yOf(-2) - yOf(2));
    const bl = mk('text', { x: xOf(20000) - 4, y: yOf(2) - 8, 'text-anchor': 'end' }, grid); bl.textContent = '±2 dB';
    let d = '', n = 220;
    for (let i = 0; i <= n; i++) {
      const f = 20 * Math.pow(1000, i / n);
      d += (i ? 'L' : 'M') + xOf(f).toFixed(1) + ' ' + yOf(clamp(resp(f), -DB, DB)).toFixed(1);
    }
    $('#frLine').setAttribute('d', d);
    $('#frArea').setAttribute('d', d + `L${X1} ${Y1}L${X0} ${Y1}Z`);
    // draw-in
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { svg.classList.add('draw'); o.disconnect(); } }, { threshold: 0.35 }).observe(svg);
    } else svg.classList.add('draw');

    const cur = $('#frCursor'), dot = $('#frDot'), out = $('#frReadout');
    const fmt = (f) => (f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 1 : 2) + ' kHz' : Math.round(f) + ' Hz');
    function hover(e) {
      const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 900;
      const cx = clamp(x, X0, X1), f = 20 * Math.pow(10, ((cx - X0) / (X1 - X0)) * 3), db = resp(f);
      cur.setAttribute('x1', cx); cur.setAttribute('x2', cx);
      dot.setAttribute('cx', cx); dot.setAttribute('cy', yOf(clamp(db, -DB, DB)));
      out.textContent = `${fmt(f)}  ·  ${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
      svg.classList.add('hov');
    }
    svg.addEventListener('pointermove', hover);
    svg.addEventListener('pointerdown', hover);
    svg.addEventListener('pointerleave', () => { svg.classList.remove('hov'); out.textContent = 'Move across the curve'; });
  })();

  /* ---------- 11. Scroll-driven scenes ---------- */
  const nav = $('#nav'), navProg = $('#navProgress');
  const heroStage = $('#heroStage'), heroCopy = $('#heroCopy'), dial = $('#dial'), heroWrap = $('#heroSpeakerWrap');
  const statement = $('[data-statement]');
  const anat = $('[data-anatomy]'), anatStage = $('.anatomy-stage', anat);
  const steps = $$('.step', anat), sns = $$('.sn', anat), anatBar = $('#anatBar'), anatLabel = $('#anatLabel');
  const labels = ['Aperture · 6 mm', 'Knit · Danish wool', 'Axis · 6 drivers', 'Foot · solid oak'];
  let lastY = 0, curStep = -1, ticking = false;

  function setStep(i) {
    if (i === curStep) return;
    curStep = i;
    anatStage.dataset.step = i;
    steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); });
    sns.forEach((s, k) => s.classList.toggle('on', k <= i));
    anatLabel.textContent = labels[i];
  }
  setStep(0);

  function update() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    // nav
    if (y < 80 || y < lastY - 3) nav.classList.remove('hide');
    else if (y > lastY + 4 && y > 160) nav.classList.add('hide');
    lastY = y;
    const docH = root.scrollHeight - vh;
    navProg.style.transform = `scaleX(${docH > 0 ? clamp(y / docH) : 0})`;

    // hero parallax
    const hr = heroEl.getBoundingClientRect();
    if (hr.bottom > -50 && !RM) {
      const p = clamp(-hr.top / hr.height);
      heroStage.style.transform = `translate(-50%, calc(-50% + ${(p * 110).toFixed(1)}px)) scale(${(1 - p * 0.1).toFixed(3)})`;
      heroCopy.style.transform = `translateY(${(-p * 70).toFixed(1)}px)`;
      heroCopy.style.opacity = (1 - p * 1.1).toFixed(3);
    }

    // statement scrub
    if (statement && scrubWords.length && !RM) {
      const r = statement.getBoundingClientRect(), R = statement.offsetHeight - vh;
      const p = clamp(-r.top / (R * 0.82) + 0.04, 0, 1.2), n = scrubWords.length;
      scrubWords.forEach((w, i) => { w.style.opacity = (0.16 + 0.84 * clamp(p * (n + 4) - i)).toFixed(3); });
    }

    // anatomy
    const ar = anat.getBoundingClientRect(), AR = anat.offsetHeight - vh;
    const ap = clamp(-ar.top / AR);
    setStep(Math.min(3, Math.floor(ap * 4)));
    anatBar.style.transform = `scaleX(${ap.toFixed(3)})`;
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  update();

  /* ---------- 12. Pointer parallax (hero) + glow loop ---------- */
  let tx = 0, ty = 0, cx = 0, cy = 0;
  if (!RM && !coarse) {
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  function frame(now) {
    // ignite
    if (!RM && igniteStart) ignite = easeOut(clamp((now - igniteStart) / 2800));
    const breathe = RM ? 0 : Math.sin(now / 1150) * 0.5 + Math.sin(now / 2700) * 0.5;
    if (analyser && audioOn) {
      analyser.getByteTimeDomainData(adata);
      let s = 0; for (let i = 0; i < adata.length; i++) { const v = (adata[i] - 128) / 128; s += v * v; }
      audioLevel = lerp(audioLevel, Math.min(1, Math.sqrt(s / adata.length) * 3.2), 0.2);
    } else audioLevel = lerp(audioLevel, 0, 0.05);
    const g = clamp(ignite * ((0.72 + 0.1 * breathe) * (0.78 + 0.22 * vol) + audioLevel * 0.5), 0, 1);

    for (const s of speakers) {
      if (!s.vis) continue;
      if (s.far) s.far.style.opacity = (0.92 * g).toFixed(3);
      if (s.mid) s.mid.style.opacity = (0.95 * g).toFixed(3);
      if (s.spill) s.spill.style.opacity = clamp(g * 1.05).toFixed(3);
      if (s.core) s.core.style.opacity = (0.3 + 0.7 * g).toFixed(3);
    }
    if (heroLight && heroVisible) heroLight.style.opacity = (g * 0.95).toFixed(3);

    if (!RM && !coarse && heroVisible) {
      cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
      heroWrap.style.translate = `${(cx * -10).toFixed(2)}px ${(cy * -6).toFixed(2)}px`;
      dial.style.translate = `${(cx * 22).toFixed(2)}px ${(cy * 14).toFixed(2)}px`;
      if (heroLight) heroLight.style.translate = `${(cx * 36).toFixed(2)}px ${(cy * 20).toFixed(2)}px`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 13. Buttons magnet, card glow ---------- */
  if (!RM && !coarse) {
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  $$('[data-glow]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- 14. Pre-order form (preview only; nothing is sent anywhere) ---------- */
  const form = $('#poForm'), msg = $('#poMsg'), email = $('#poEmail');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        msg.className = 'po-msg err'; msg.textContent = 'That email does not look quite right. Try again?'; email.focus(); return;
      }
      msg.className = 'po-msg ok';
      msg.textContent = `Thank you. Your ${finNames[root.dataset.finish]} Halo is held for ${v}. This is a launch preview, so no payment was taken.`;
      email.value = '';
    });
  }
})();
