/* Drift — page behaviour. Loaded before motion-kit.js so split text is ready when the kit reveals it. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  let paused = false;

  /* ---------- text splitting that keeps <em> ---------- */
  function splitRich(el) {
    let i = 0;
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const mask = document.createElement('span');
            mask.className = 'mk-mask'; mask.setAttribute('aria-hidden', 'true');
            const piece = document.createElement('span');
            piece.className = 'mk-piece'; piece.style.setProperty('--i', i++); piece.textContent = part;
            mask.append(piece); frag.append(mask);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
  }
  $$('[data-rich]').forEach(splitRich);

  /* ---------- manifesto: words light up with scroll ---------- */
  const manifesto = $('#manifesto');
  if (manifesto) {
    const hl = (manifesto.dataset.hl || '').split(' ');
    const words = manifesto.textContent.trim().split(/\s+/);
    manifesto.setAttribute('aria-label', words.join(' '));
    manifesto.innerHTML = words.map((w, i) => {
      const bare = w.toLowerCase().replace(/[^a-z]/g, '');
      return `<span aria-hidden="true" class="${hl.includes(bare) ? 'hl' : ''}" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`;
    }).join(' ');
  }

  /* ---------- hero entrance ---------- */
  const go = () => root.classList.add('ready');
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 120))])
    .then(() => requestAnimationFrame(() => requestAnimationFrame(go)));

  /* ---------- helpers ---------- */
  function whenVisible(el, fn) {
    let on = true;
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { on = e[0].isIntersecting; fn(on); }, { rootMargin: '80px' }).observe(el);
    return () => on && !paused && !document.hidden;
  }

  /* pause CSS loops that are off screen */
  if ('IntersectionObserver' in window) {
    const off = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '60px' });
    $$('.hero-device, .t-breath, .t-private, .scroll-cue, .download').forEach((el) => off.observe(el));
  }

  /* ---------- hero canvas: stars + drifting sound lines ---------- */
  (function heroCanvas() {
    const c = $('.hero-canvas'); if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let w = 0, h = 0, stars = [], px = .72, tx = .72, raf = 0, running = false, grad;
    const lines = 7;
    function resize() {
      const r = c.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((w * h) / 9500) }, () => ({ x: Math.random() * w, y: Math.random() * h * .78, r: Math.random() * 1.1 + .25, p: Math.random() * 6.28, s: .4 + Math.random() * 1.1 }));
      grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(159,180,255,0)'); grad.addColorStop(.22, 'rgba(159,180,255,.75)'); grad.addColorStop(.65, 'rgba(243,201,139,.85)'); grad.addColorStop(1, 'rgba(243,201,139,0)');
      draw(performance.now());
    }
    function draw(ms) {
      const t = ms / 1000;
      px += (tx - px) * .045;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = (.25 + .55 * (.5 + .5 * Math.sin(t * s.s + s.p))) * (1 - s.y / (h * .85));
        ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      }
      ctx.strokeStyle = grad; ctx.lineWidth = 1.1;
      const base = h * (w < 700 ? .8 : .7);
      for (let i = 0; i < lines; i++) {
        const k = i / (lines - 1);
        ctx.globalAlpha = .1 + .42 * (1 - k) * (1 - k);
        ctx.beginPath();
        for (let x = 0; x <= w + 8; x += 8) {
          const nx = x / w;
          const bump = Math.exp(-Math.pow((nx - px) * 3.4, 2)) * 30;
          const y = base + k * h * .2
            + Math.sin(nx * 5 + t * .45 + k * 1.5) * (16 + k * 18)
            + Math.sin(nx * 11 - t * .32 + k * 3) * 7
            + bump * Math.sin(nx * 16 - t * 1.1 + k * 2) * (1 - k * .5);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const loop = (ms) => { if (!running) return; if (!paused) draw(ms); raf = requestAnimationFrame(loop); };
    resize();
    addEventListener('resize', resize);
    if (reduce) return;
    $('.hero').addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth; }, { passive: true });
    whenVisible($('.hero'), (on) => { if (on && !running) { running = true; raf = requestAnimationFrame(loop); } else if (!on) { running = false; cancelAnimationFrame(raf); } });
  })();

  /* ---------- phone: live mix, toasts, breathing label ---------- */
  (function phone() {
    const rows = $$('#phoneMix li');
    const presets = [[.62, .24, .4], [.46, .42, .46], [.32, .6, .5], [.5, .36, .62]];
    let n = 0;
    const alive = whenVisible($('.hero'), () => {});
    const tick = () => { if (alive()) { n = (n + 1) % presets.length; rows.forEach((r, i) => r.style.setProperty('--v', presets[n][i])); } setTimeout(tick, 2800); };
    if (!reduce) setTimeout(tick, 6500);

    const chip = $('#phoneChip'), msgs = ['Room got louder — rain +8%', 'Breathing slowed — hum fading out', 'Heart rate settling — dimming screen', 'Almost asleep — rain thinning'];
    let m = 0;
    const swap = () => {
      if (alive()) {
        chip.classList.add('is-out');
        setTimeout(() => { m = (m + 1) % msgs.length; chip.lastElementChild.textContent = msgs[m]; chip.classList.remove('is-out'); }, 380);
      }
      setTimeout(swap, 4200);
    };
    if (chip && !reduce) setTimeout(swap, 7500);

    const core = $('.orb .core'), label = $('#phoneBreath'); let inhale = true;
    if (core && label) core.addEventListener('animationiteration', () => { inhale = !inhale; label.textContent = inhale ? 'Breathe in' : 'Breathe out'; });
  })();

  /* ---------- signature: the night, scrubbed by scroll ---------- */
  (function story() {
    const section = $('[data-story]'); if (!section) return;
    const ncTime = $('#ncTime'), ncStage = $('#ncStage'), line = $('#hypLine'), ghost = $('#hypGhost'), dot = $('#hypDot'), clipRect = $('#hypClipRect');
    const chapters = $$('.chapter'), layerEls = $$('#layers li'), chaptersBox = $('#chapters');
    const gDusk = $('.g-dusk'), gDeep = $('.g-deep'), gDawn = $('.g-dawn');
    const X0 = 58, X1 = 592, W = X1 - X0, Y = [34, 88, 142, 196], eps = .006;
    const names = ['Awake', 'REM sleep', 'Light sleep', 'Deep sleep'];
    const segs = [[0, .10, 0], [.10, .15, 2], [.15, .26, 3], [.26, .30, 2], [.30, .35, 1], [.35, .38, 2], [.38, .48, 3], [.48, .52, 2], [.52, .58, 1], [.58, .60, 0], [.60, .64, 2], [.64, .70, 3], [.70, .74, 2], [.74, .82, 1], [.82, .86, 2], [.86, .92, 1], [.92, .96, 2], [.96, 1, 0]];
    const K = [[0, [.55, .15, .1, 0]], [.12, [.8, .25, .2, 0]], [.3, [.4, .65, .35, 0]], [.5, [.15, .55, .6, 0]], [.585, [.3, .45, .55, 0]], [.62, [.12, .5, .6, 0]], [.82, [.05, .3, .4, .05]], [.95, [0, .12, .15, .7]], [1, [0, .08, .1, .8]]];
    const thresholds = [0, .14, .5, .82];

    let d = '';
    segs.forEach(([a, b, l], i) => {
      const xs = X0 + a * W, xe = X0 + b * W, y = Y[l];
      if (i === 0) d += `M${xs} ${y}`; else d += `L${xs.toFixed(1)} ${Y[segs[i - 1][2]]}L${(xs + eps * W).toFixed(1)} ${y}`;
      d += `L${xe.toFixed(1)} ${y}`;
    });
    line.setAttribute('d', d); ghost.setAttribute('d', d);
    $('.hyp-grid').innerHTML = Y.map((y, i) => `<line x1="${X0}" x2="${X1}" y1="${y}" y2="${y}"/><text x="0" y="${y + 4}">${['Awake', 'REM', 'Light', 'Deep'][i]}</text>`).join('')
      + ['21:30', '00:00', '03:00', '06:45'].map((t, i) => `<text x="${[X0, X0 + W * .28, X0 + W * .64, X1][i]}" y="226" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}">${t}</text>`).join('');

    const segAt = (p) => { const i = segs.findIndex((s) => p <= s[1]); return i < 0 ? segs.length - 1 : i; };
    const yAt = (p) => { const i = segAt(p), s = segs[i]; let y = Y[s[2]]; if (i > 0) { const t = (p - s[0]) / eps; if (t < 1) y = lerp(Y[segs[i - 1][2]], y, clamp(t)); } return y; };
    const levelsAt = (p) => { for (let i = 1; i < K.length; i++) if (p <= K[i][0]) { const t = smooth((p - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return K[i][1].map((v, j) => lerp(K[i - 1][1][j], v, t)); } return K[K.length - 1][1]; };
    const pad = (n) => String(n).padStart(2, '0');
    let lastP = -1, lastChapter = -1, lastTime = '', lastStage = '';

    function apply(p) {
      clipRect.setAttribute('width', (X0 + p * W + 2).toFixed(1));
      dot.style.transform = `translate(${(X0 + p * W).toFixed(1)}px, ${yAt(p).toFixed(1)}px)`;
      const mins = 21 * 60 + 30 + p * 555;
      const time = `${pad(Math.floor(mins / 60) % 24)}:${pad(Math.floor(mins % 60))}`;
      if (time !== lastTime) { ncTime.textContent = time; lastTime = time; }
      const s = segs[segAt(p)];
      const stage = p < .1 ? 'Winding down' : p >= .96 ? 'Waking gently' : s[2] === 0 ? 'Brief stir, softening the mix' : names[s[2]];
      if (stage !== lastStage) { ncStage.textContent = stage; lastStage = stage; }
      const lv = levelsAt(p);
      layerEls.forEach((li, i) => { li.style.setProperty('--v', lv[i].toFixed(3)); li.lastElementChild.textContent = Math.round(lv[i] * 100) + '%'; });
      gDusk.style.opacity = clamp(1 - p / .25).toFixed(3);
      gDeep.style.opacity = (clamp((p - .08) / .2) * (1 - clamp((p - .8) / .15))).toFixed(3);
      gDawn.style.opacity = clamp((p - .78) / .2).toFixed(3);
      let ci = 0; thresholds.forEach((t, i) => { if (p >= t) ci = i; });
      if (ci !== lastChapter) { chapters.forEach((c, i) => c.classList.toggle('is-active', i === ci)); lastChapter = ci; }
      chaptersBox.style.setProperty('--sp', p.toFixed(3));
    }

    if (reduce) { apply(1); return; }
    let queued = false;
    const update = () => {
      queued = false;
      const r = section.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
      if (Math.abs(p - lastP) > 0.0004) { lastP = p; apply(p); }
    };
    const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    apply(0); update();
  })();

  /* ---------- one-shot "seen" states for draws and bars ---------- */
  (function seen() {
    const targets = $$('[data-seen]');
    if (reduce || !('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('is-seen')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-seen'); io.unobserve(e.target); } }), { threshold: .25 });
    targets.forEach((t) => io.observe(t));
    addEventListener('load', () => setTimeout(() => targets.forEach((t) => { if (t.getBoundingClientRect().bottom < 0) t.classList.add('is-seen'); }), 500));
  })();

  /* ---------- bento: faders, pacer, wake window ---------- */
  (function bento() {
    const faders = $$('#faders .fader');
    const presets = [[.6, .3, .45, .15], [.35, .55, .5, .3], [.2, .7, .35, .5], [.45, .4, .6, .2]];
    let n = 0;
    const box = $('#faders');
    const alive = box ? whenVisible(box, () => {}) : () => false;
    if (!reduce) setInterval(() => { if (!alive()) return; n = (n + 1) % presets.length; faders.forEach((f, i) => f.style.setProperty('--v', presets[n][i])); }, 2600);

    const core = $('.p-core'), label = $('#pacerLabel'); let inhale = true;
    if (core && label) core.addEventListener('animationiteration', () => { inhale = !inhale; label.textContent = inhale ? 'In' : 'Out'; });

    // wake window
    const R = 88, cx = 110, cy = 110, rad = Math.PI / 180;
    const pt = (a) => [cx + R * Math.cos(a * rad), cy - R * Math.sin(a * rad)];
    const arcs = $('#wakeArcs'), dotEl = $('#wakeDot'), read = $('#wakeRead'), seg = $('#wakeSeg');
    if (!arcs) return;
    const mins = [15, 30, 45], dotMin = { 15: 8, 30: 18, 45: 26 }; // angle offset (deg) of the "lightest moment" inside the window
    arcs.innerHTML = mins.map((m) => { const [x0, y0] = pt(90 + m), [x1, y1] = pt(90); return `<path data-min="${m}" d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`; }).join('');
    function setWake(m) {
      $$('#wakeArcs path').forEach((p) => p.classList.toggle('on', +p.dataset.min === m));
      const [x, y] = pt(90 + dotMin[m]); dotEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      read.textContent = `06:${pad2(60 - m)} – 07:00`;
      $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.min === m)));
      $('.seg-ink', seg).style.setProperty('--i', mins.indexOf(m));
    }
    const pad2 = (n) => String(n).padStart(2, '0');
    seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setWake(+b.dataset.min); });
    setWake(30);
  })();

  /* ---------- plans: billing toggle with a rolling price ---------- */
  (function plans() {
    const box = $('#billing'); if (!box) return;
    const amts = $$('.amt'), bills = $$('[data-bill-m]');
    const fmt = (v) => (v === 0 ? '0' : v.toFixed(2));
    function set(mode, animate) {
      $$('button', box).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bill === mode)));
      $('.seg-ink', box).style.setProperty('--i', mode === 'y' ? 1 : 0);
      amts.forEach((a, i) => {
        const next = fmt(parseFloat(mode === 'y' ? a.dataset.y : a.dataset.m));
        if (a.textContent === next) return;
        if (!animate || reduce || !a.animate) { a.textContent = next; return; }
        a.getAnimations().forEach((x) => x.cancel());
        const out = a.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-38%)', opacity: 0 }], { duration: 150, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards', delay: i * 40 });
        out.onfinish = () => {
          a.textContent = next;
          a.animate([{ transform: 'translateY(38%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
          out.cancel();
        };
      });
      bills.forEach((b) => { b.textContent = mode === 'y' ? b.dataset.billY : b.dataset.billM; });
    }
    box.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) set(b.dataset.bill, true); });
    set('y', false);
  })();

  /* ---------- nav menu (mobile) ---------- */
  (function menu() {
    const nav = $('.nav'), btn = $('.menu-btn'); if (!btn) return;
    const close = () => { nav.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(open)); });
    $$('.nav-links a').forEach((a) => a.addEventListener('click', close));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  })();

  /* ---------- pause ambient motion ---------- */
  (function pause() {
    const b = $('#pauseBtn'); if (!b) return;
    b.addEventListener('click', () => {
      paused = !paused; root.classList.toggle('is-paused', paused);
      b.setAttribute('aria-pressed', String(paused)); b.textContent = paused ? 'Resume ambient motion' : 'Pause ambient motion';
    });
  })();
})();
