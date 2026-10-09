/* Drift — page behaviour. Builds on motion-kit.js (reveals, counts, parallax, magnetic, spotlight). */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = reduceMQ.matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- masked word rise ---------- */
  function riseSplit(el) {
    let i = 0;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const out = document.createElement('div');
    const walk = (node, target) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { target.appendChild(document.createTextNode(' ')); return; }
            const rw = document.createElement('span'); rw.className = 'rw'; rw.setAttribute('aria-hidden', 'true');
            const pc = document.createElement('span'); pc.className = 'pc'; pc.style.setProperty('--i', i++); pc.textContent = tok;
            rw.appendChild(pc); target.appendChild(rw);
          });
        } else if (n.nodeType === 1) { const c = n.cloneNode(false); target.appendChild(c); walk(n, c); }
      });
    };
    walk(el, out);
    el.setAttribute('aria-label', label);
    el.replaceChildren(...out.childNodes);
    el.classList.add('is-split');
  }
  const rises = $$('.rise');
  rises.forEach((el) => { riseSplit(el); const d = parseFloat(el.dataset.delay || '0'); if (d) el.style.setProperty('--d', d + 'ms'); });
  // Hero title starts straight away; others when scrolled to.
  const heroTitle = $('.hero-title');
  requestAnimationFrame(() => requestAnimationFrame(() => heroTitle && heroTitle.classList.add('is-in')));
  const riseIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); riseIO.unobserve(e.target); }
  }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
  rises.forEach((el) => { if (el !== heroTitle) riseIO.observe(el); });
  addEventListener('load', () => setTimeout(() => rises.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('is-in'); }), 300));

  /* ---------- live toggles (pause ambient loops off-screen) ---------- */
  const liveIO = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '80px' });
  $$('[data-live]').forEach((el) => liveIO.observe(el));

  /* ---------- nav, page progress, menu ---------- */
  const nav = $('#nav');
  const pageProg = $('.page-progress');
  const menuBtn = $('.menu-btn'), menu = $('#menu');
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    nav.classList.toggle('menu-open', open);
    if (open) nav.classList.add('is-scrolled');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });

  /* ---------- hero canvas: slow night-water ribbons that lean toward the pointer ---------- */
  (function heroCanvas() {
    const canvas = $('.hero-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hero = canvas.closest('.hero');
    let w = 0, h = 0, dpr = 1, running = false, raf = 0, visible = true;
    const mouse = { x: -9999, y: 0, tx: -9999, ty: 0, a: 0 };
    const N = innerWidth < 700 ? 9 : 14;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.75);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(performance.now());
    };
    function draw(now) {
      const t = reduce ? 4 : now / 1000;
      ctx.clearRect(0, 0, w, h);
      mouse.x = lerp(mouse.x, mouse.tx, .06); mouse.y = lerp(mouse.y, mouse.ty, .06);
      mouse.a = lerp(mouse.a, mouse.tx > -9000 ? 1 : 0, .04);
      const base = h * .62;
      for (let k = 0; k < N; k++) {
        const f = k / (N - 1);
        const y0 = base + (f - .5) * h * .62;
        ctx.beginPath();
        const step = 14;
        for (let x = -20; x <= w + 20; x += step) {
          const nx = x / w;
          let y = y0
            + Math.sin(nx * 3.1 + t * .16 + f * 2.3) * (22 + f * 34)
            + Math.sin(nx * 7.4 - t * .23 + f * 5.1) * (7 + f * 8)
            + Math.sin(nx * 1.3 + t * .09 + k) * 30;
          const dx = (x - mouse.x) / 190, dy = (y0 - mouse.y) / 260;
          y -= Math.exp(-(dx * dx + dy * dy)) * 46 * mouse.a;
          x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const warm = f > .7;
        const alpha = .09 + Math.sin(f * Math.PI) * .3;
        ctx.strokeStyle = warm ? `rgba(240,201,135,${alpha * .85})` : `rgba(150,178,235,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    const loop = (now) => { if (!running) return; draw(now); raf = requestAnimationFrame(loop); };
    const setRun = () => {
      const should = visible && !reduce && !document.hidden;
      if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    };
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; setRun(); }).observe(hero);
    document.addEventListener('visibilitychange', setRun);
    hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.tx = -9999; });
    addEventListener('resize', resize);
    resize(); setRun();
  })();

  (function eqWave() {
    const mk = (sel, per, amp, ph) => { const p = $(sel); if (!p) return; let d = ''; for (let x = 0; x <= 480; x += 3) d += (x ? 'L' : 'M') + x + ' ' + (17 + Math.sin(x / per * Math.PI * 2 + ph) * amp).toFixed(1); p.setAttribute('d', d); };
    mk('.e1', 60, 12, 0); mk('.e2', 40, 8, 1.4);
  })();

  /* ---------- hero phone: breathing label + ticking values ---------- */
  (function phoneDemo() {
    const label = $('#breathLabel'), hr = $('#statHr'), tm = $('#scrTime');
    if (!label || reduce) { if (label) label.textContent = 'Breathe'; return; }
    // 10s cycle: in for 4s (0–40%), out for 6s.
    let phase = true;
    const swap = () => { label.style.opacity = 0; setTimeout(() => { label.textContent = phase ? 'Breathe in' : 'Breathe out'; label.style.opacity = 1; }, 220); };
    const cycle = () => { phase = true; swap(); setTimeout(() => { phase = false; swap(); }, 4000); };
    cycle(); setInterval(cycle, 10000);
    let hrv = 58, mins = 12;
    setInterval(() => {
      hrv = Math.max(52, hrv - (Math.random() < .6 ? 1 : 0) + (Math.random() < .15 ? 1 : 0));
      hr.textContent = hrv;
      mins = (mins + 1) % 60;
      tm.textContent = '23:' + String(mins).padStart(2, '0');
    }, 3200);
  })();

  /* ---------- manifesto: words light up as you read ---------- */
  (function manifesto() {
    const el = $('#manifesto'); if (!el) return;
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
    if (reduce) el.style.setProperty('--p', 1);
  })();

  /* ---------- the night (signature, scroll-linked) ---------- */
  (function night() {
    const story = $('#how'), stage = $('#storyStage'); if (!story) return;
    const navItems = $$('#storyNav li'), panels = $$('#panels .panel');
    const clock = $('#clock'), state = $('#clockState');
    const svgNS = 'http://www.w3.org/2000/svg';
    const X0 = 48, X1 = 628, TOTAL = 585; // minutes from 21:30 to 07:15
    const xAt = (t) => X0 + (t / TOTAL) * (X1 - X0);
    const yAt = (lv) => 44 + lv * 64;
    // [minutes since 21:30, level] 0 awake · 1 REM · 2 light · 3 deep
    const pts = [[0, 0], [98, 0], [104, 2], [118, 3], [150, 3], [158, 2], [178, 2], [184, 1], [196, 1], [202, 2], [226, 2], [233, 3], [262, 3], [270, 2], [290, 2], [296, 1], [320, 1], [326, 2], [336, 2], [341, .45], [348, .45], [353, 2], [372, 2], [380, 3], [404, 3], [411, 2], [440, 2], [446, 1], [482, 1], [488, 2], [512, 2], [520, 1], [546, 1], [552, .5], [558, 0], [585, 0]];
    const d = pts.map(([t, l], i) => `${i ? 'L' : 'M'}${xAt(t).toFixed(1)} ${yAt(l).toFixed(1)}`).join('');
    $('#hGhost').setAttribute('d', d); $('#hGlow').setAttribute('d', d); $('#hLine').setAttribute('d', d);
    // axes
    const grid = $('#hypnoGrid');
    [['Awake', 0], ['REM', 1], ['Light', 2], ['Deep', 3]].forEach(([n, l]) => {
      const line = document.createElementNS(svgNS, 'line'); line.setAttribute('x1', X0); line.setAttribute('x2', X1); line.setAttribute('y1', yAt(l)); line.setAttribute('y2', yAt(l)); grid.appendChild(line);
      const tx = document.createElementNS(svgNS, 'text'); tx.setAttribute('x', 0); tx.setAttribute('y', yAt(l) + 4); tx.textContent = n; grid.appendChild(tx);
    });
    ['22', '00', '02', '04', '06'].forEach((hh) => {
      const mins = ((+hh + (hh === '22' ? 0 : 24) - 21.5) * 60) % 1440;
      const t = (+hh >= 22 ? (+hh - 21.5) * 60 : (+hh + 24 - 21.5) * 60);
      const tx = document.createElementNS(svgNS, 'text'); tx.setAttribute('x', xAt(t)); tx.setAttribute('y', 292); tx.setAttribute('text-anchor', 'middle'); tx.textContent = hh + ':00'; grid.appendChild(tx);
      void mins;
    });
    const mark = $('#hMark'), markLine = $('#hMarkLine'), markText = $('#hMarkText');
    const mx = xAt(344); markLine.setAttribute('x1', mx); markLine.setAttribute('x2', mx); markLine.setAttribute('y1', 24); markLine.setAttribute('y2', 262); markText.setAttribute('x', mx - 6);
    const head = $('#hHead'), clipRect = $('#hypnoClipRect');
    const levelAt = (t) => {
      for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, l0] = pts[i - 1], [t1, l1] = pts[i]; return lerp(l0, l1, (t - t0) / Math.max(1, t1 - t0)); }
      return 0;
    };
    // p -> clock minutes (piecewise so each step starts on its own time)
    const keys = [[0, 21 * 60 + 30], [.25, 23 * 60 + 10], [.5, 26 * 60 + 30], [.75, 30 * 60 + 45], [1, 31 * 60 + 15]];
    const minutesAt = (p) => { for (let i = 1; i < keys.length; i++) if (p <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (p - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])); return keys[4][1]; };
    const labels = ['Winding down', 'Drifting off', 'Staying under', 'Waking gently'];
    let lastStep = -1, lastClock = '';

    function update(p) {
      const m = minutesAt(p);
      const t = m - (21 * 60 + 30);
      const hh = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
      const text = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
      if (text !== lastClock) { clock.textContent = text; lastClock = text; }
      const step = Math.min(3, Math.floor(p * 4 + 1e-6));
      if (step !== lastStep) {
        lastStep = step; stage.dataset.step = step; state.textContent = labels[step];
        navItems.forEach((li, i) => li.classList.toggle('is-active', i === step));
        panels.forEach((pn, i) => pn.classList.toggle('is-active', i === step));
      }
      const hx = xAt(t), hy = yAt(levelAt(t));
      clipRect.setAttribute('width', hx.toFixed(1));
      head.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
      mark.classList.toggle('on', t > 346 && t < 470);
      const sun = clamp((p - .72) / .2);
      story.style.setProperty('--p', p.toFixed(4));
      stage.style.setProperty('--sun', sun.toFixed(3));
      stage.style.setProperty('--p', p.toFixed(4));
    }

    if (reduce) { update(1); panels.forEach((pn) => pn.classList.add('is-active')); return; }
    let queued = false;
    const read = () => {
      queued = false;
      const r = story.getBoundingClientRect();
      update(clamp(-r.top / (r.height - innerHeight)));
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(read); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    read();
  })();

  /* ---------- science diagrams ---------- */
  (function science() {
    const NS = 'http://www.w3.org/2000/svg';
    $$('[data-wave]').forEach((p) => {
      const [perMin, amp] = p.dataset.wave.split(',').map(Number);
      const cycles = perMin / 3; // 3 minutes visible
      let d = '';
      for (let x = 0; x <= 320; x += 2) { const y = 65 - Math.sin((x / 320) * cycles * Math.PI * 2) * amp * 1.0; d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1); }
      p.setAttribute('d', d);
    });
    const g = $('#noiseBars');
    if (g) {
      let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 40; i++) {
        const spike = rnd() > .82;
        const hgt = spike ? 40 + rnd() * 70 : 8 + rnd() * 34;
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', 4 + i * 7.9); r.setAttribute('width', 4); r.setAttribute('rx', 2);
        r.setAttribute('y', 124 - hgt); r.setAttribute('height', hgt);
        r.setAttribute('class', 'nb' + (hgt < 46 ? ' masked' : ''));
        r.style.setProperty('--k', i);
        g.appendChild(r);
      }
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('drawn'); io.unobserve(e.target); } }), { threshold: 0.35 });
    $$('[data-draw]').forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => $$('[data-draw]').forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('drawn'); }), 300));
  })();

  /* ---------- mixer ---------- */
  (function mixer() {
    const root = $('#mixer'); if (!root) return;
    const inputs = $$('input[type=range]', root);
    const paths = ['mw1', 'mw2', 'mw3', 'mw4'].map((id) => $('#' + id));
    const conf = [{ f: 1.6, ph: 0 }, { f: 3.1, ph: 1.2 }, { f: 6.4, ph: 2.1 }, { f: 11, ph: 3.4 }];
    const render = () => {
      inputs.forEach((inp, k) => {
        const v = inp.value / 100;
        inp.style.setProperty('--val', inp.value + '%');
        let d = '';
        for (let x = 0; x <= 400; x += 4) {
          const env = .55 + .45 * Math.sin(x / 400 * Math.PI);
          const y = 55 + Math.sin(x / 400 * Math.PI * 2 * conf[k].f + conf[k].ph) * 40 * v * env;
          d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
        }
        paths[k].setAttribute('d', d);
        paths[k].style.opacity = (.25 + v * .75).toFixed(2);
      });
    };
    inputs.forEach((i) => i.addEventListener('input', render));
    render();
  })();

  /* ---------- routine toggles ---------- */
  (function routine() {
    const list = $('#routine'); if (!list) return;
    const sum = $('#routineSum');
    const mins = [4, 5, 8, 14];
    const update = () => {
      const btns = $$('button', list);
      const on = btns.filter((b) => b.getAttribute('aria-checked') === 'true');
      const total = btns.reduce((a, b, i) => a + (b.getAttribute('aria-checked') === 'true' ? mins[i] : 0), 0);
      sum.textContent = `${on.length} of ${btns.length} on · about ${total} min`;
    };
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true'));
      update();
    });
    update();
  })();

  /* ---------- pair waves ---------- */
  (function pairWaves() {
    const build = (sel, period, amp) => { const p = $(sel); if (!p) return; let d = ''; for (let x = 0; x <= 800; x += 4) d += (x ? 'L' : 'M') + x + ' ' + (12 + Math.sin(x / period * Math.PI * 2) * amp).toFixed(1); p.setAttribute('d', d); };
    build('.pw1', 100, 8); build('.pw2', 40, 5);
  })();

  /* ---------- horizontal stories (scroll-driven) ---------- */
  (function stories() {
    const sec = $('#stories'), track = $('#hsTrack'); if (!sec) return;
    let shift = 0, active = false;
    const measure = () => {
      active = !reduce && innerWidth > 900;
      if (!active) { sec.style.height = ''; sec.style.removeProperty('--hp'); track.style.removeProperty('--shift'); return; }
      shift = Math.max(0, track.scrollWidth - innerWidth);
      track.style.setProperty('--shift', shift + 'px');
      sec.style.height = (shift + innerHeight) + 'px';
      read();
    };
    let queued = false;
    function read() {
      queued = false; if (!active) return;
      const r = sec.getBoundingClientRect();
      track.style.setProperty('--hp', clamp(-r.top / Math.max(1, r.height - innerHeight)).toFixed(4));
    }
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(read); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', measure);
    addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  })();

  /* ---------- pricing ---------- */
  (function pricing() {
    const seg = $('#billing'); if (!seg) return;
    const ink = $('.seg-ink', seg), btns = $$('button', seg);
    const vals = $$('.p-val'), notes = $$('[data-bill-note]');
    const yearlyNotes = ['Billed $59.99 yearly', 'Billed $89.99 yearly'], monthlyNote = 'Billed monthly';
    const cur = vals.map((v) => parseFloat(v.dataset.y));
    const tweens = new Map();
    const moveInk = (b) => ink.style.setProperty('--x', b.dataset.bill === 'y' ? '100%' : '0%');
    const animate = (i, to) => {
      const el = vals[i], from = cur[i];
      if (reduce) { el.textContent = '$' + to.toFixed(2); cur[i] = to; return; }
      cancelAnimationFrame(tweens.get(i)); const t0 = performance.now(), dur = 600;
      const tick = (now) => {
        const t = clamp((now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
        cur[i] = lerp(from, to, e); el.textContent = '$' + cur[i].toFixed(2);
        if (t < 1) tweens.set(i, requestAnimationFrame(tick));
      };
      tweens.set(i, requestAnimationFrame(tick));
    };
    const select = (b) => {
      btns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      moveInk(b);
      const yearly = b.dataset.bill === 'y';
      vals.forEach((v, i) => { animate(i, parseFloat(yearly ? v.dataset.y : v.dataset.m)); });
      notes.forEach((n, i) => { n.textContent = yearly ? yearlyNotes[i] : monthlyNote; });
    };
    btns.forEach((b) => b.addEventListener('click', () => select(b)));
    const init = () => moveInk($('[aria-checked=true]', seg));
    init(); addEventListener('resize', init);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    // page scroll progress
    let q = false;
    const upd = () => {
      q = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      pageProg.style.setProperty('--pp', max > 0 ? (scrollY / max).toFixed(4) : 0);
      nav.classList.toggle('is-scrolled', scrollY > 24 || nav.classList.contains('menu-open'));
    };
    addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  })();
})();
