/* Drift — page behaviour. Dependency-free. Pairs with assets/motion-kit.js (reveals, stagger, counters, spotlight, tilt, nav). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = reduceQ.matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const mobileQ = matchMedia('(max-width: 760px)');

  /* Run a callback only while an element is on screen (used for every ambient loop). */
  function whileVisible(el, start, stop, margin = '100px') {
    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: margin }).observe(el);
  }

  /* ---------- hero entrance: starts on first frame ---------- */
  const hero = $('.hero');
  if (hero) { void hero.offsetWidth; requestAnimationFrame(() => hero.classList.add('is-in')); }

  /* ---------- one-shot triggers: mask titles, live tiles, dawn ---------- */
  (function triggers() {
    const targets = $$('[data-mask], [data-live], .download');
    const show = (el) => {
      if (el.hasAttribute('data-mask')) el.classList.add('is-in');
      if (el.hasAttribute('data-live') || el.classList.contains('download')) el.classList.add('in-view');
      if (el.classList.contains('t-breath')) breathLoop();
    };
    if (!('IntersectionObserver' in window)) { targets.forEach(show); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((t) => io.observe(t));
    // Safety net for anchor jumps / restored scroll: anything above the fold is shown.
    const sweep = () => targets.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 0.9) show(el); });
    addEventListener('load', () => setTimeout(sweep, 400));
    addEventListener('hashchange', () => setTimeout(sweep, 700));
  })();

  /* ---------- hero field: stars and tide lines that lean toward the pointer ---------- */
  (function field() {
    const c = $('#field'); if (!c) return;
    const ctx = c.getContext('2d');
    let w = 0, h = 0, stars = [], raf = 0;
    const m = { x: 0.6, y: 0.5, tx: 0.6, ty: 0.5 };
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((w * h) / 11000) }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.72, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6.28, s: 0.5 + Math.random() * 1.1 }));
      draw(performance.now() / 1000);
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
        ctx.fillStyle = '#e8e4da';
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
      const N = 11;
      for (let i = 0; i < N; i++) {
        const warm = i >= N - 3;
        const base = h * (0.56 + i * 0.034);
        const amp = h * (0.03 + i * 0.0038) * (0.7 + m.y * 0.9);
        ctx.beginPath();
        for (let x = 0; x <= w + 10; x += 10) {
          const nx = x / w;
          const bump = Math.exp(-Math.pow((nx - m.x) / 0.16, 2)) * amp * 1.4 * Math.sin(t * 0.9 + i * 0.6);
          const y = base + Math.sin(nx * 5.2 + t * 0.32 + i * 0.55) * amp + Math.sin(nx * 11.5 + t * 0.21 - i * 0.8) * amp * 0.42 + bump;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = warm ? `rgba(240,184,120,${0.2 + (i - (N - 3)) * 0.1})` : `rgba(127,163,199,${0.05 + i * 0.018})`;
        ctx.lineWidth = warm ? 1.4 : 1;
        ctx.stroke();
      }
    }
    function loop(now) {
      m.x = lerp(m.x, m.tx, 0.04); m.y = lerp(m.y, m.ty, 0.04);
      draw(now / 1000);
      raf = requestAnimationFrame(loop);
    }
    addEventListener('resize', resize);
    resize();
    if (reduce) return;
    addEventListener('pointermove', (e) => { m.tx = e.clientX / innerWidth; m.ty = clamp(e.clientY / innerHeight); }, { passive: true });
    whileVisible(c, () => { if (!raf) raf = requestAnimationFrame(loop); }, () => { cancelAnimationFrame(raf); raf = 0; });
  })();

  /* ---------- phone: a product UI that demos itself ---------- */
  (function phone() {
    const label = $('#orbLabel'), clock = $('#phClock'), status = $('#phStatus');
    if (!label) return;
    const wrap = status.parentElement;
    if (reduce) return;
    let inhale = true;
    setInterval(() => { inhale = !inhale; label.style.opacity = 0; setTimeout(() => { label.textContent = inhale ? 'Breathe in' : 'Breathe out'; label.style.opacity = 1; }, 220); }, 4000);
    let mins = 42;
    setInterval(() => { mins = (mins + 1) % 60; clock.textContent = '11:' + String(mins).padStart(2, '0'); }, 5200);
    const msgs = ['Heart rate settling · easing the rain', 'Room is quiet · holding the tide', 'You have gone still · fading the hum', 'Wake window set · 6:40 to 7:10'];
    let k = 0;
    setInterval(() => { wrap.classList.add('swap'); setTimeout(() => { k = (k + 1) % msgs.length; status.textContent = msgs[k]; wrap.classList.remove('swap'); }, 320); }, 3800);
  })();

  /* ---------- signature: a night with Drift (pinned, scroll-scrubbed) ---------- */
  (function story() {
    const root = $('#story'); if (!root) return;
    const path = $('#hypPath'), ghost = $('#hypGhost'), dot = $('#hypDot');
    const steps = $$('.step', root), meters = [0, 1, 2, 3].map((i) => $('#m' + i));
    const roTime = $('#roTime'), roStage = $('#roStage');
    // Illustrative hypnogram: [t 0..1, stage 0 awake, 1 REM, 2 light, 3 deep]
    const pts = [[0, 0], [.04, 0], [.07, 2], [.11, 3], [.2, 3], [.24, 2], [.28, 1], [.31, 1], [.34, 2], [.38, 3], [.46, 3], [.5, 2], [.56, 1], [.6, 1], [.64, 2], [.68, 3], [.73, 2], [.78, 1], [.84, 1], [.88, 2], [.93, 2], [.97, 0], [1, 0]];
    const X = (t) => 40 + t * 740, Y = (s) => 30 + s * 85;
    let d = `M${X(pts[0][0])} ${Y(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const [t0, s0] = pts[i - 1], [t1, s1] = pts[i], cx = (X(t0) + X(t1)) / 2;
      d += ` C${cx.toFixed(1)} ${Y(s0)} ${cx.toFixed(1)} ${Y(s1)} ${X(t1).toFixed(1)} ${Y(s1)}`;
    }
    path.setAttribute('d', d); ghost.setAttribute('d', d);
    const total = path.getTotalLength(), S = 360, lens = [], ys = [];
    for (let i = 0; i <= S; i++) {
      const x = X(i / S); let lo = 0, hi = total;
      for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (path.getPointAtLength(mid).x < x) lo = mid; else hi = mid; }
      lens.push(hi); ys.push(path.getPointAtLength(hi).y);
    }
    // Mix levels at the centre of each step: tide, rain, pink cushion, dawn tones.
    const LV = [[.72, .22, .1, 0], [.4, .34, .5, 0], [.1, .08, .95, 0], [0, 0, .3, .9]];
    const stageNames = ['Awake', 'REM', 'Light sleep', 'Deep sleep'];
    const fmt = (p) => {
      let mins = 22 * 60 + 30 + p * 510; mins = Math.round(mins) % 1440;
      const h = Math.floor(mins / 60), mm = mins % 60, ap = h >= 12 ? 'pm' : 'am';
      return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`;
    };
    let shown = -1, cur = 0, raf = 0, active = false;
    const target = () => {
      const r = root.getBoundingClientRect();
      const total = r.height - innerHeight;
      return total > 0 ? clamp(-r.top / total) : 0;
    };
    function render(p) {
      root.style.setProperty('--p', p.toFixed(4));
      const f = p * S, i = Math.min(S - 1, Math.floor(f)), u = f - i;
      const len = lerp(lens[i], lens[i + 1], u), y = lerp(ys[i], ys[i + 1], u);
      path.style.strokeDashoffset = (1 - len / total).toFixed(4);
      dot.setAttribute('transform', `translate(${X(p).toFixed(1)} ${y.toFixed(1)})`);
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
      if (idx !== shown) { shown = idx; steps.forEach((s, n) => s.classList.toggle('is-active', n === idx)); }
      // interpolate the mix between step centres
      const pos = clamp(p * 4 - 0.5, 0, 3), a = Math.floor(pos), b = Math.min(3, a + 1), k = pos - a;
      meters.forEach((m, n) => { m.style.transform = `scaleX(${Math.max(0.02, lerp(LV[a][n], LV[b][n], k)).toFixed(3)})`; });
      roTime.textContent = fmt(p);
      roStage.textContent = stageNames[clamp(Math.round((y - 30) / 85), 0, 3)];
    }
    if (reduce) { render(1); return; }
    function loop() {
      const t = target();
      cur += (t - cur) * 0.14;
      if (Math.abs(t - cur) < 0.0004) cur = t;
      render(cur);
      raf = active ? requestAnimationFrame(loop) : 0;
    }
    whileVisible(root, () => { active = true; if (!raf) raf = requestAnimationFrame(loop); }, () => { active = false; }, '200px');
    render(target());
  })();

  /* ---------- manifesto: words light as you read ---------- */
  (function manifesto() {
    const el = $('#manifesto'); if (!el) return;
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--t:${(i / (words.length - 1)).toFixed(3)}">${w}</span>`).join(' ');
    if (reduce) el.style.setProperty('--p', 1);
  })();

  /* ---------- tabs with a sliding ink ---------- */
  function inkFor(tabs) {
    const ink = $('.tab-ink', tabs);
    const move = () => {
      const on = $('[aria-selected="true"], [aria-pressed="true"]', tabs); if (!on) return;
      ink.style.setProperty('--x', on.offsetLeft - 4 + 'px');
      ink.style.setProperty('--w', on.offsetWidth + 'px');
    };
    move();
    if ('ResizeObserver' in window) new ResizeObserver(move).observe(tabs);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(move);
    return move;
  }

  /* ---------- science: stage tabs + waveform ---------- */
  (function stages() {
    const tabs = $('#stageTabs'); if (!tabs) return;
    const move = inkFor(tabs);
    const panel = $('#stagePanel');
    const DATA = {
      awake: { title: 'Quiet the mind', body: 'Falling asleep is mostly about lowering arousal. A slow, masking tide and a paced breath give a busy mind something gentle to follow instead of a ceiling to stare at.', drift: 'Fades in a slow tide, paces your breath at 4-7-8 and keeps the volume below the noise of the room.', name: 'Awake · beta rhythms', hz: '13 to 30 Hz', f: [9, 23], a: [.16, .08], s: 2.2 },
      light: { title: 'The easy slide', body: 'Light sleep is about half the night. Breathing slows, muscles loosen and you are easy to wake, which makes sudden sounds the main threat to a good night.', drift: 'Thins out the textures and smooths every transition so nothing in the mix has a sharp edge.', name: 'Light sleep · theta', hz: '4 to 8 Hz', f: [4.5, 11], a: [.2, .1], s: 1.2 },
      deep: { title: 'Where the body repairs', body: 'Slow, large, rolling waves mark deep sleep, the stage most tied to feeling physically restored. It is also the stage that is hardest to rebuild once it is interrupted.', drift: 'Holds a steady pink-noise cushion and changes nothing unless the room itself changes.', name: 'Deep sleep · delta', hz: '0.5 to 4 Hz', f: [1.6, 3.4], a: [.34, .14], s: 0.55 },
      rem: { title: 'Where memory settles', body: 'Dreaming sleep arrives in longer stretches toward morning. The brain looks awake on the outside while the body stays still, and it is easily nudged by sound.', drift: 'Keeps the mix minimal and low, then begins the slow lift toward your wake window.', name: 'REM · fast and mixed', hz: 'Low amplitude', f: [8, 17], a: [.12, .07], s: 1.7 }
    };
    let cur = { f: [9, 23], a: [.16, .08], s: 2.2 }, tgt = DATA.awake;
    function select(btn, focus) {
      const key = btn.dataset.stage, data = DATA[key];
      $$('[role=tab]', tabs).forEach((t) => { const on = t === btn; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      panel.setAttribute('aria-labelledby', btn.id);
      if (focus) btn.focus();
      move(); tgt = data;
      panel.classList.add('swap');
      setTimeout(() => {
        $('#spTitle').textContent = data.title; $('#spBody').textContent = data.body; $('#spDrift').textContent = data.drift;
        $('#wvName').textContent = data.name; $('#wvHz').textContent = data.hz;
        panel.classList.remove('swap');
      }, reduce ? 0 : 200);
    }
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) select(b); });
    tabs.addEventListener('keydown', (e) => {
      const list = $$('[role=tab]', tabs), i = list.indexOf(document.activeElement);
      if (i < 0 || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
      select(list[n], true);
    });

    const c = $('#wave'), ctx = c.getContext('2d');
    let w = 0, h = 0, raf = 0, t0 = performance.now();
    function size() { const dpr = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 6); ctx.lineTo(w, h * i / 6); ctx.stroke(); }
      const layers = [{ k: 1, col: 'rgba(127,163,199,.95)', lw: 2.2, off: 0 }, { k: .7, col: 'rgba(240,184,120,.55)', lw: 1.5, off: 1.3 }, { k: .45, col: 'rgba(236,232,223,.22)', lw: 1.2, off: 2.6 }];
      layers.forEach((L) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const nx = x / w, env = 0.55 + 0.45 * Math.sin(nx * Math.PI);
          const y = h * 0.46 + h * env * L.k * (cur.a[0] * Math.sin(nx * cur.f[0] * 2 + t * cur.s + L.off) + cur.a[1] * Math.sin(nx * cur.f[1] * 2 - t * cur.s * 1.3 + L.off * 2));
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = L.col; ctx.lineWidth = L.lw; ctx.stroke();
      });
    }
    function loop(now) {
      const k = 0.06;
      cur.f = cur.f.map((v, i) => lerp(v, tgt.f[i], k)); cur.a = cur.a.map((v, i) => lerp(v, tgt.a[i], k)); cur.s = lerp(cur.s, tgt.s, k);
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }
    size(); addEventListener('resize', () => { size(); draw(1); });
    if (reduce) { draw(1); const redraw = () => { cur = { f: tgt.f, a: tgt.a, s: tgt.s }; draw(1); }; tabs.addEventListener('click', () => setTimeout(redraw, 10)); return; }
    whileVisible(c, () => { if (!raf) raf = requestAnimationFrame(loop); }, () => { cancelAnimationFrame(raf); raf = 0; });
  })();

  /* ---------- wake dial ticks ---------- */
  (function ticks() {
    const g = $('.d-ticks'); if (!g) return;
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 48; i++) {
      const a = (i * 7.5 - 90) * Math.PI / 180, big = i % 4 === 0, r1 = big ? 98 : 100, r2 = 106;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', 110 + Math.cos(a) * r1); l.setAttribute('y1', 110 + Math.sin(a) * r1);
      l.setAttribute('x2', 110 + Math.cos(a) * r2); l.setAttribute('y2', 110 + Math.sin(a) * r2);
      if (!big) l.setAttribute('opacity', '.5');
      g.appendChild(l);
    }
  })();

  /* ---------- 4-7-8 breathing label ---------- */
  let breathStarted = false;
  function breathLoop() {
    if (breathStarted) return; breathStarted = true;
    const el = $('#breathLabel'); if (!el || reduce) return;
    const seq = [['Breathe in', 4000], ['Hold', 7000], ['Breathe out', 8000]];
    let i = 0;
    const step = () => { el.textContent = seq[i][0]; const wait = seq[i][1]; i = (i + 1) % seq.length; setTimeout(step, wait); };
    step();
  }

  /* ---------- mixer: live canvas, sliders, generated audio ---------- */
  (function mixer() {
    const c = $('#mixCanvas'); if (!c) return;
    const ctx = c.getContext('2d');
    const sliders = $$('input[data-layer]');
    const vals = sliders.map((s) => +s.value / 100);
    let w = 0, h = 0, raf = 0;
    const paint = (s) => s.style.setProperty('--v', s.value + '%');
    sliders.forEach(paint);

    /* audio */
    let ac = null, layer = [], master = null, playing = false;
    function build() {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const noise = (brown) => {
        const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) { const r = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * r) / 1.02; data[i] = last * 3.5; } else data[i] = r; }
        const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s;
      };
      const filt = (type, f) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; return b; };
      // tide: brown noise swelling slowly
      const tide = ac.createGain(), tideLfo = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
      tideLfo.gain.value = 0.6; lfo.frequency.value = 0.09; depth.gain.value = 0.4; lfo.connect(depth); depth.connect(tideLfo.gain); lfo.start();
      const tn = noise(true), tf = filt('lowpass', 520); tn.connect(tf); tf.connect(tideLfo); tideLfo.connect(tide); tide.connect(master);
      // rain: filtered white noise
      const rain = ac.createGain(), rn = noise(false), hp = filt('highpass', 1400), lp = filt('lowpass', 7000);
      rn.connect(hp); hp.connect(lp); lp.connect(rain); rain.connect(master);
      // hum: two low sines
      const hum = ac.createGain();
      [55, 82.41].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = i ? 0.35 : 0.65; o.connect(g); g.connect(hum); o.start(); });
      hum.connect(master);
      layer = [tide, rain, hum];
      apply();
    }
    const scale = [1.0, 0.32, 0.22];
    function apply() { if (!ac) return; layer.forEach((g, i) => g.gain.setTargetAtTime(vals[i] * scale[i], ac.currentTime, 0.12)); }
    const btn = $('#playBtn'), label = $('.play-t', btn);
    btn.addEventListener('click', async () => {
      if (!window.AudioContext && !window.webkitAudioContext) return;
      if (!ac) build();
      playing = !playing;
      if (playing) await ac.resume();
      master.gain.setTargetAtTime(playing ? 0.5 : 0, ac.currentTime, 0.25);
      if (!playing) setTimeout(() => { if (!playing) ac.suspend(); }, 900);
      btn.setAttribute('aria-pressed', String(playing));
      label.textContent = playing ? 'Pause' : 'Hear it';
    });

    sliders.forEach((s, i) => s.addEventListener('input', () => { cancelTween(); vals[i] = +s.value / 100; paint(s); apply(); if (reduce) draw(0); }));

    /* presets: Drift "adapts" the mix; interruptible tween */
    const PRE = { restless: [.42, .7, .74], settled: [.26, .08, .34] };
    let tw = 0;
    const cancelTween = () => { cancelAnimationFrame(tw); tw = 0; };
    $$('.preset').forEach((b) => b.addEventListener('click', () => {
      cancelTween();
      const from = vals.slice(), to = PRE[b.dataset.preset], t0 = performance.now(), dur = reduce ? 1 : 1500;
      const tick = (now) => {
        const k = easeOut(clamp((now - t0) / dur));
        sliders.forEach((s, i) => { vals[i] = lerp(from[i], to[i], k); s.value = Math.round(vals[i] * 100); paint(s); });
        apply(); if (reduce) draw(0);
        if (k < 1) tw = requestAnimationFrame(tick);
      };
      tw = requestAnimationFrame(tick);
    }));

    function size() { const dpr = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const mid = h * 0.44;
      const L = [
        { v: vals[0], col: 'rgba(127,163,199,.95)', lw: 2.2, f: 2.2, s: .5, amp: .3, j: 0 },
        { v: vals[1], col: 'rgba(236,232,223,.55)', lw: 1.1, f: 15, s: 3.2, amp: .12, j: 1 },
        { v: vals[2], col: 'rgba(240,184,120,.9)', lw: 1.8, f: 5, s: 1.0, amp: .2, j: 0 }
      ];
      L.forEach((l, n) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const nx = x / w, env = 0.35 + 0.65 * Math.sin(nx * Math.PI);
          let y = mid + Math.sin(nx * l.f * 2 + t * l.s + n) * h * l.amp * l.v * env;
          if (l.j) y += Math.sin(nx * 71 + t * 9) * h * 0.02 * l.v * env;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.25 + 0.75 * Math.min(1, l.v * 1.6);
        ctx.strokeStyle = l.col; ctx.lineWidth = l.lw; ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    function loop(now) { draw(now / 1000); raf = requestAnimationFrame(loop); }
    size(); addEventListener('resize', () => { size(); draw(0); });
    if (reduce) { draw(0); return; }
    whileVisible(c, () => { if (!raf) raf = requestAnimationFrame(loop); }, () => { cancelAnimationFrame(raf); raf = 0; });
  })();

  /* ---------- testimonials: horizontal travel driven by vertical scroll ---------- */
  (function hscroll() {
    const root = $('#hscroll'); if (!root) return;
    const track = $('#hTrack');
    let max = 0, cur = 0, raf = 0, active = false;
    const enabled = () => !reduce && !mobileQ.matches;
    function measure() { max = Math.max(0, track.scrollWidth - innerWidth); root.style.setProperty('--max', max + 'px'); }
    function target() { const r = root.getBoundingClientRect(), t = r.height - innerHeight; return t > 0 ? clamp(-r.top / t) : 0; }
    function loop() {
      if (!enabled()) { raf = 0; return; }
      const t = target(); cur += (t - cur) * 0.14; if (Math.abs(t - cur) < 0.0005) cur = t;
      root.style.setProperty('--p', cur.toFixed(4));
      raf = active ? requestAnimationFrame(loop) : 0;
    }
    measure(); addEventListener('resize', () => { measure(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    whileVisible(root, () => { active = true; if (!raf) raf = requestAnimationFrame(loop); }, () => { active = false; }, '200px');
  })();

  /* ---------- plans: billing toggle with rolling prices ---------- */
  (function billing() {
    const tabs = $('#billTabs'); if (!tabs) return;
    const move = inkFor(tabs);
    const prices = $$('[data-price]'), billed = $$('[data-billed]');
    const fmt = (v) => (v === 0 ? '0' : v.toFixed(2));
    const state = new Map(prices.map((p) => [p, parseFloat(p.textContent)]));
    function set(mode) {
      $$('button', tabs).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bill === mode)));
      move();
      prices.forEach((el) => {
        const to = parseFloat(el.dataset.price.split(',')[mode === 'month' ? 0 : 1]), from = state.get(el), t0 = performance.now();
        const per = el.parentElement.querySelector('.per');
        if (per && el.dataset.price !== '0,0') per.textContent = '/ month';
        if (reduce) { el.textContent = fmt(to); state.set(el, to); return; }
        const tick = (now) => { const k = easeOut(clamp((now - t0) / 600)); const v = lerp(from, to, k); el.textContent = fmt(k >= 1 ? to : v); state.set(el, v); if (k < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      billed.forEach((el) => { const [m, y] = el.dataset.billed.split('|'); el.style.opacity = 0; setTimeout(() => { el.textContent = mode === 'month' ? m : y; el.style.opacity = 1; }, 160); });
    }
    billed.forEach((el) => { el.style.transition = 'opacity 200ms linear'; });
    tabs.addEventListener('click', (e) => { const b = e.target.closest('button[data-bill]'); if (b) set(b.dataset.bill); });
  })();
})();
