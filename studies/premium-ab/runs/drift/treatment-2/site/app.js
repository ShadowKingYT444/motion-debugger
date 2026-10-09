/* Drift — page behaviour. Pairs with motion-kit.js (reveals, --p progress, magnetic, tilt, spotlight). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* visible-only helper: run fn while el is on screen */
  const whenVisible = (el, on, off) => {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver((e) => (e[0].isIntersecting ? on() : off && off()), { threshold: 0.05 }).observe(el);
  };

  /* ---------------- manifesto: words light up with scroll ---------------- */
  const man = $('[data-words]');
  if (man) {
    const words = man.textContent.trim().split(/\s+/);
    man.setAttribute('aria-label', man.textContent.trim());
    man.innerHTML = words.map((w, i) => `<span aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  }

  /* ---------------- hero canvas: night tide + stars ---------------- */
  const hc = $('.hero-canvas');
  if (hc) {
    const ctx = hc.getContext('2d');
    let w = 0, h = 0, dpr = 1, running = false, raf = 0, t0 = performance.now();
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const stars = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random() * 0.62, r: Math.random() * 1.2 + 0.2, p: Math.random() * 6.28, s: Math.random() * 0.8 + 0.3 }));
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      const r = hc.getBoundingClientRect();
      w = r.width; h = r.height;
      hc.width = w * dpr; hc.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (now) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      pointer.x = lerp(pointer.x, pointer.tx, 0.08); pointer.y = lerp(pointer.y, pointer.ty, 0.08);
      for (const s of stars) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
        ctx.fillStyle = `rgba(236,233,225,${(a * 0.7).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); ctx.fill();
      }
      const lines = 11, base = h * (w < 700 ? 0.8 : 0.76), span = h * (w < 700 ? 0.2 : 0.22);
      for (let i = 0; i < lines; i++) {
        const k = i / (lines - 1);
        const y0 = base + k * span;
        ctx.beginPath();
        for (let x = 0; x <= w + 12; x += 12) {
          const nx = x / w;
          let y = y0 + Math.sin(nx * 5.5 + t * 0.35 + i * 0.5) * (6 + k * 22) + Math.sin(nx * 11 - t * 0.22 + i) * (3 + k * 8);
          const dx = x - pointer.x, dy = y - pointer.y, d = Math.hypot(dx, dy);
          if (d < 220) y += (1 - d / 220) ** 2 * -26 * Math.sin(t * 2 + i);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const hot = i === 4;
        const a = hot ? 0.7 : 0.1 + k * 0.26, rgb = hot ? '240,197,139' : '134,168,208';
        const gr = ctx.createLinearGradient(0, 0, w, 0), fade = w < 700 ? 1 : 0.3;
        gr.addColorStop(0, `rgba(${rgb},${(a * fade).toFixed(3)})`); gr.addColorStop(0.55, `rgba(${rgb},${(a * fade * 1.5).toFixed(3)})`); gr.addColorStop(0.8, `rgba(${rgb},${a.toFixed(3)})`);
        ctx.strokeStyle = gr;
        ctx.lineWidth = hot ? 1.6 : 1;
        ctx.stroke();
      }
    };
    const loop = (now) => { draw(now); raf = requestAnimationFrame(loop); };
    resize(); addEventListener('resize', resize);
    if (reduce) draw(t0 + 4000);
    else {
      addEventListener('pointermove', (e) => { const r = hc.getBoundingClientRect(); pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top; }, { passive: true });
      whenVisible(hc, () => { if (!running) { running = true; raf = requestAnimationFrame(loop); } }, () => { running = false; cancelAnimationFrame(raf); });
    }
  }

  /* ---------------- phone mixer + live-mix tile: gentle drifting values ---------------- */
  const bindMix = (rows, valEls, base) => {
    const set = () => rows.forEach((b, i) => {
      const v = clamp(base[i] + (Math.random() - 0.5) * 0.3, 0.08, 0.95);
      b.style.setProperty('--v', v.toFixed(2));
      if (valEls && valEls[i]) valEls[i].textContent = Math.round(v * 100) + '%';
    });
    set();
    if (reduce) return;
    let id = 0;
    whenVisible(rows[0], () => { if (!id) id = setInterval(set, 2600); }, () => { clearInterval(id); id = 0; });
  };
  const phoneMix = $('[data-mix]');
  if (phoneMix) bindMix($$('b', phoneMix), $$('em', phoneMix), [0.62, 0.28, 0.4]);
  const liveMix = $('[data-live-mix]');
  if (liveMix) bindMix($$('b', liveMix), null, [0.7, 0.45, 0.3, 0.2]);

  /* ---------------- the pinned night story (scroll = time) ---------------- */
  const story = $('[data-story]');
  if (story) {
    const hypLine = $('[data-hyp]', story), hypGhost = $('[data-hyp-ghost]', story), dot = $('[data-dot]', story);
    const clockEl = $('[data-clock]', story), ampm = $('[data-ampm]', story), stageEl = $('[data-stage]', story), note = $('[data-note]', story);
    const steps = $$('.step', story);
    const bars = [0, 1, 2, 3].map((i) => $(`[data-mix-bar="${i}"]`, story));
    const vals = [0, 1, 2, 3].map((i) => $(`[data-mix-val="${i}"]`, story));
    // 0 awake, 1 REM, 2 light, 3 deep — one sample per 15 minutes, 22:30 -> 06:45
    const series = [0, 0, 2, 2, 3, 3, 3, 2, 2, 1, 2, 3, 3, 3, 2, 2, 1, 2, 2, 3, 3, 2, 1, 1, 2, 2, 2, 1, 1, 2, 2, 1, 0, 0];
    const names = ['Awake', 'REM', 'Light sleep', 'Deep sleep'];
    const W = 640, laneY = (s) => 20 + s * 60;
    let d = '';
    series.forEach((s, i) => {
      const x = (i / (series.length - 1)) * W, y = laneY(s);
      if (!i) { d += `M${x.toFixed(1)} ${y}`; return; }
      const px = ((i - 1) / (series.length - 1)) * W, py = laneY(series[i - 1]), mx = (px + x) / 2;
      d += ` C${mx.toFixed(1)} ${py} ${mx.toFixed(1)} ${y} ${x.toFixed(1)} ${y}`;
    });
    hypLine.setAttribute('d', d); hypGhost.setAttribute('d', d);
    const mixKeys = [[.72, .5, .2, .12, 0], [.18, .5, .85, .6, .1], [.3, .38, .16, .3, .1], [0, 0, 0, .12, .72]];
    const mixAt = (k, p) => { const x = p * 4, i = Math.min(3, Math.floor(x)); return lerp(mixKeys[k][i], mixKeys[k][i + 1], x - i); };
    const notes = [
      'Winding down. Rain opens wide and soft, then narrows as your breathing slows.',
      'Sleep onset at 11:08. Volume steps down by a third so nothing holds you in light sleep.',
      'Deep sleep. A low hum carries the room; Drift only answers if you stir.',
      'Lightest point inside your window. Birds fade in and the screen warms. No alarm jolt.'
    ];
    let activeStep = -1, lastClock = '';
    const svg = hypLine.ownerSVGElement;
    const chart = dot.parentElement;
    const apply = (p) => {
      // clock
      const mins = Math.round((22 * 60 + 30 + p * 495) / 5) * 5, hh = Math.floor(mins / 60) % 24, mm = mins % 60;
      const label = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
      if (label !== lastClock) { clockEl.textContent = label; ampm.textContent = hh >= 12 ? 'PM' : 'AM'; lastClock = label; }
      // stage
      const si = series[Math.min(series.length - 1, Math.round(p * (series.length - 1)))];
      if (stageEl.textContent !== names[si]) stageEl.textContent = names[si];
      // dot on path
      const len = hypLine.getTotalLength(), pt = hypLine.getPointAtLength(p * len);
      const cw = chart.clientWidth - 52, ch = chart.clientHeight;
      dot.style.transform = `translate3d(${(pt.x / 640) * cw}px, ${(pt.y / 220) * ch}px, 0)`;
      // mix
      bars.forEach((b, k) => { const v = mixAt(k, p); b.style.setProperty('--v', v.toFixed(3)); b.style.transition = 'none'; vals[k].textContent = Math.round(v * 100) + '%'; });
      // steps
      const idx = p < 0.22 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
      if (idx !== activeStep) {
        activeStep = idx;
        steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
        note.classList.add('is-swap');
        setTimeout(() => { note.textContent = notes[idx]; note.classList.remove('is-swap'); }, 200);
      }
    };
    if (reduce) {
      story.style.setProperty('--p', 1);
      steps.forEach((s) => s.classList.add('is-active'));
      apply(1); note.textContent = notes[3];
      bars.forEach((b) => { b.style.transition = ''; });
    } else {
      let last = -1;
      const tick = () => {
        const p = parseFloat(story.style.getPropertyValue('--p')) || 0;
        if (Math.abs(p - last) > 0.0004) { last = p; apply(p); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---------------- noise tabs with sliding indicator ---------------- */
  const tabs = $('.tabs');
  if (tabs) {
    const ink = $('.tab-ink', tabs), btns = $$('[role=tab]', tabs);
    const panel = $('.panel'), title = $('[data-noise-title]'), text = $('[data-noise-text]'), use = $('[data-noise-use]');
    const info = {
      white: ['White noise', 'Equal energy at every frequency. Bright and hissy, it masks sudden sounds well but can feel sharp over a long night.', 'short masking when a street or neighbour is loud'],
      pink: ['Pink noise', 'Energy falls 3 dB per octave, closer to rain and rustling leaves. Studied for steadier sleep and for supporting slow waves.', 'the first hours, when you are settling and cycling into deep sleep'],
      brown: ['Brown noise', 'Energy falls 6 dB per octave, a low rumble like surf or a distant engine. Warm and heavy, easy to forget about.', 'deep sleep and the long middle of the night']
    };
    const move = (b) => { ink.style.setProperty('--x', b.offsetLeft - 4 + 'px'); ink.style.setProperty('--w', b.offsetWidth + 'px'); };
    const choose = (b, instant) => {
      const key = b.dataset.noise;
      btns.forEach((x) => { x.setAttribute('aria-selected', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      $$('.sp').forEach((p) => p.classList.toggle('is-on', p.classList.contains('sp-' + key)));
      move(b);
      const apply = () => { title.textContent = info[key][0]; text.textContent = info[key][1]; use.textContent = info[key][2]; panel.classList.remove('is-swap'); };
      if (instant || reduce) apply(); else { panel.classList.add('is-swap'); setTimeout(apply, 180); }
    };
    btns.forEach((b) => b.addEventListener('click', () => choose(b)));
    tabs.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length]; n.focus(); choose(n);
    });
    const init = () => choose(btns[0], true);
    init(); addEventListener('load', () => move($('[aria-selected=true]', tabs))); document.fonts && document.fonts.ready.then(() => move($('[aria-selected=true]', tabs)));
    addEventListener('resize', () => move($('[aria-selected=true]', tabs)));
  }

  /* ---------------- bento small bits ---------------- */
  $$('[data-routine] .toggle').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
  const bars = $('[data-bars]');
  if (bars) {
    const rects = $$('rect', bars);
    rects.forEach((r, i) => { r.style.setProperty('--bi', i); r.style.setProperty('--bar', reduce ? 1 : 0.02); });
    whenVisible(bars, () => requestAnimationFrame(() => rects.forEach((r) => r.style.setProperty('--bar', 1))));
  }
  const wakeTile = $('.tile-wake');
  if (wakeTile) whenVisible(wakeTile, () => setTimeout(() => wakeTile.classList.add('is-awake'), 500));

  /* ---------------- soundscapes: horizontal scroll + generated audio ---------------- */
  const hs = $('[data-hscroll]');
  if (hs) {
    const track = $('[data-track]', hs);
    const upd = () => {
      if (innerWidth <= 760 || reduce) { track.style.removeProperty('--shift'); return; }
      const p = clamp(parseFloat(hs.style.getPropertyValue('--p')) || 0, 0, 1);
      const max = Math.max(0, track.scrollWidth - innerWidth);
      track.style.setProperty('--shift', (-p * max).toFixed(1) + 'px');
    };
    const loop = () => { upd(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  let actx = null, current = null;
  const noise = (type) => {
    const len = actx.sampleRate * 5, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const wn = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * wn) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') {
        b0 = 0.99886 * b0 + wn * 0.0555179; b1 = 0.99332 * b1 + wn * 0.0750759; b2 = 0.969 * b2 + wn * 0.153852;
        b3 = 0.8665 * b3 + wn * 0.3104856; b4 = 0.55 * b4 + wn * 0.5329522; b5 = -0.7616 * b5 - wn * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + wn * 0.5362) * 0.11; b6 = wn * 0.115926;
      } else d[i] = wn;
    }
    const s = actx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s;
  };
  const lfo = (freq, depth, target) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o; };
  const recipes = {
    tide(out) { const n = noise('brown'), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.55; n.connect(f); f.connect(g); g.connect(out); return [n, lfo(0.09, 0.32, g.gain)]; },
    rain(out) { const n = noise('pink'), hp = actx.createBiquadFilter(), lp = actx.createBiquadFilter(), g = actx.createGain(); hp.type = 'highpass'; hp.frequency.value = 700; lp.type = 'lowpass'; lp.frequency.value = 8000; g.gain.value = 0.7; n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); return [n]; },
    wind(out) { const n = noise('pink'), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 1.1; g.gain.value = 1.4; n.connect(f); f.connect(g); g.connect(out); return [n, lfo(0.07, 320, f.frequency), lfo(0.13, 0.3, g.gain)]; },
    train(out) { const n = noise('brown'), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'lowpass'; f.frequency.value = 320; g.gain.value = 0.7; n.connect(f); f.connect(g); g.connect(out); return [n, lfo(2.2, 0.28, g.gain)]; },
    drone(out) { const nodes = []; [98, 98.6, 147.2, 196.4].forEach((fr, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = fr; g.gain.value = 0.16 / (i + 1); o.connect(g); g.connect(out); o.start(); nodes.push(o); }); nodes.push(lfo(0.11, 0.0, out.gain)); return nodes; },
    embers(out) { const n = noise('brown'), g = actx.createGain(), n2 = noise('white'), hp = actx.createBiquadFilter(), cg = actx.createGain(); g.gain.value = 0.35; n.connect(g); g.connect(out); hp.type = 'highpass'; hp.frequency.value = 3500; cg.gain.value = 0; n2.connect(hp); hp.connect(cg); cg.connect(out); const id = setInterval(() => { const t = actx.currentTime; if (Math.random() < 0.45) { cg.gain.setValueAtTime(0.3 * Math.random(), t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.05); } }, 90); return [n, n2, { stop() { clearInterval(id); } }]; }
  };
  const stopCurrent = () => {
    if (!current) return;
    const c = current; current = null;
    c.card.classList.remove('is-playing'); $('.play', c.card).setAttribute('aria-pressed', 'false');
    c.out.gain.cancelScheduledValues(actx.currentTime); c.out.gain.setTargetAtTime(0, actx.currentTime, 0.25);
    setTimeout(() => { c.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); c.out.disconnect(); }, 1200);
  };
  $$('.scape').forEach((card) => {
    const btn = $('.play', card);
    btn.addEventListener('click', async () => {
      const was = current && current.card === card;
      stopCurrent();
      if (was) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') await actx.resume();
        const out = actx.createGain(); out.gain.value = 0; out.connect(actx.destination);
        const nodes = recipes[card.dataset.sound](out);
        out.gain.setTargetAtTime(0.32, actx.currentTime, 0.5);
        current = { card, out, nodes };
        card.classList.add('is-playing'); btn.setAttribute('aria-pressed', 'true');
      } catch (e) { /* audio unavailable: stay silent */ }
    });
  });

  /* ---------------- testimonials ---------------- */
  const people = $$('.people [role=tab]'), quotes = $$('.quote');
  if (people.length) {
    let idx = 0, timerId = 0, paused = false, visible = false;
    const show = (i) => {
      idx = i;
      people.forEach((p, k) => p.setAttribute('aria-selected', String(k === i)));
      quotes.forEach((q, k) => q.classList.toggle('is-active', k === i));
      clearTimeout(timerId);
      if (!reduce && !paused && visible) timerId = setTimeout(() => show((idx + 1) % quotes.length), 7000);
    };
    people.forEach((p, i) => p.addEventListener('click', () => { paused = true; show(i); }));
    whenVisible($('.stories'), () => { visible = true; show(idx); }, () => { visible = false; clearTimeout(timerId); });
    show(0);
  }

  /* ---------------- billing toggle ---------------- */
  const billing = $('.billing');
  if (billing) {
    const ink = $('.bill-ink', billing), bs = $$('button', billing);
    const prices = $$('[data-price]'), pers = $$('[data-per]');
    const place = () => { const on = $('[aria-pressed=true]', billing); ink.style.setProperty('--x', on.offsetLeft - 4 + 'px'); ink.style.setProperty('--w', on.offsetWidth + 'px'); };
    const set = (mode, instant) => {
      bs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bill === mode)));
      place();
      prices.forEach((p) => {
        const apply = () => { p.textContent = p.dataset[mode]; p.classList.remove('is-swap'); };
        if (instant || reduce) apply(); else { p.classList.add('is-swap'); setTimeout(apply, 180); }
      });
      pers.forEach((p) => { p.textContent = mode === 'year' ? 'per month, billed yearly' : 'per month'; });
    };
    bs.forEach((b) => b.addEventListener('click', () => set(b.dataset.bill)));
    set('year', true); addEventListener('load', place); document.fonts && document.fonts.ready.then(place); addEventListener('resize', place);
  }

  /* ---------------- download: star field ---------------- */
  const sc = $('.stars');
  if (sc) {
    const ctx = sc.getContext('2d'); let w, h, dpr, raf = 0, run = false;
    const stars = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, p: Math.random() * 6.28, s: Math.random() + 0.3 }));
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); const r = sc.getBoundingClientRect(); w = r.width; h = r.height; sc.width = w * dpr; sc.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const draw = (now) => { ctx.clearRect(0, 0, w, h); const t = now / 1000; for (const s of stars) { ctx.fillStyle = `rgba(236,233,225,${(0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.s + s.p))).toFixed(3)})`; ctx.beginPath(); ctx.arc(s.x * w, s.y * h * 0.8, s.r, 0, 6.283); ctx.fill(); } };
    const loop = (n) => { draw(n); raf = requestAnimationFrame(loop); };
    size(); addEventListener('resize', size);
    if (reduce) draw(3000); else whenVisible(sc, () => { if (!run) { run = true; raf = requestAnimationFrame(loop); } }, () => { run = false; cancelAnimationFrame(raf); });
  }
})();
