/* Ledgerline marketing site — behavior and motion. No dependencies. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const root = document.documentElement;
  const coarse = matchMedia('(hover: none)').matches;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------
     Global motion switch (honours prefers-reduced-motion, user can pause)
  ------------------------------------------------------------------ */
  const motion = { on: !mqReduce.matches, subs: new Set() };
  const motionSw = $('#motionSw');
  function setMotion(on) {
    motion.on = on;
    root.dataset.motion = on ? 'on' : 'off';
    motionSw.setAttribute('aria-pressed', String(!on));
    motionSw.setAttribute('aria-label', on ? 'Pause all motion' : 'Resume motion');
    $('#motionLbl').textContent = on ? 'Motion on' : 'Motion off';
    $$('svg').forEach((s) => { if (s.pauseAnimations) on ? s.unpauseAnimations() : s.pauseAnimations(); });
    motion.subs.forEach((fn) => fn(on));
  }
  motionSw.addEventListener('click', () => setMotion(!motion.on));
  mqReduce.addEventListener && mqReduce.addEventListener('change', (e) => setMotion(!e.matches));

  /* rAF loop that only runs while visible, tab-active and motion is on */
  function makeLoop(draw, el) {
    let vis = false, raf = 0, last = 0;
    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      draw(dt, t / 1000);
      raf = requestAnimationFrame(tick);
    };
    const update = () => {
      const run = vis && motion.on && !document.hidden;
      if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; if (vis) draw(0, performance.now() / 1000); }
    };
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; update(); }, { rootMargin: '80px' }).observe(el);
    motion.subs.add(update);
    document.addEventListener('visibilitychange', update);
    return { redraw: () => draw(0, performance.now() / 1000) };
  }

  /* ------------------------------------------------------------------
     Reveal on scroll, split headlines, counters
  ------------------------------------------------------------------ */
  function splitWords(el) {
    let n = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi';
            wi.style.setProperty('--i', n++); wi.textContent = tok;
            w.appendChild(wi); frag.appendChild(w);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  }
  $$('[data-split]').forEach(splitWords);

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split]').forEach((el) => revealIO.observe(el));

  // hero headline
  const h1 = $('#h1');
  if (mqReduce.matches) h1.classList.add('in');
  else requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => h1.classList.add('in'), 120)));
  // safety: never leave content hidden
  setTimeout(() => $$('[data-reveal]:not(.in), [data-split]:not(.in)').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight) el.classList.add('in');
  }), 2500);

  function fmtNum(v, dec) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countUp(el, to, dec, dur = 1800, from = 0) {
    if (!motion.on) { el.textContent = fmtNum(to, dec); return; }
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = fmtNum(lerp(from, to, easeOut(p)), dec);
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  const countIO = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      countUp(el, parseFloat(el.dataset.to), parseInt(el.dataset.dec || '0', 10), 2000);
      el.closest('.stat') && el.closest('.stat').classList.add('in');
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => {
    if (motion.on) el.textContent = fmtNum(0, parseInt(el.dataset.dec || '0', 10));
    countIO.observe(el);
  });

  /* ------------------------------------------------------------------
     Header, progress, nav highlight, mobile menu
  ------------------------------------------------------------------ */
  const hdr = $('#hdr'), prog = $('#progress');
  const navLinks = $$('.nav a');
  const navSecs = navLinks.map((a) => $(a.getAttribute('href')));
  let lastY = 0, ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    hdr.classList.toggle('stuck', y > 20);
    if (!document.body.classList.contains('menu-open')) hdr.classList.toggle('hide', y > 500 && y > lastY + 4);
    if (y < lastY - 4) hdr.classList.remove('hide');
    lastY = y;
    let cur = -1;
    navSecs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    navLinks.forEach((a, i) => a.classList.toggle('active', i === cur));
    updatePin();
    updateFooterWord();
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', () => { onScroll(); });

  const burger = $('#burger');
  function toggleMenu(force) {
    const open = force !== undefined ? force : !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    burger.setAttribute('aria-expanded', String(open));
    hdr.classList.remove('hide');
  }
  burger.addEventListener('click', () => toggleMenu());
  $$('#mnav a').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

  /* ------------------------------------------------------------------
     Pointer effects: cursor glow, spotlight, magnetic buttons, card tilt
  ------------------------------------------------------------------ */
  const glow = $('#glow');
  if (!coarse) {
    let gx = 0, gy = 0, tx = 0, ty = 0, graf = 0;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY; glow.classList.add('on');
      const sp = e.target.closest && e.target.closest('.spot');
      if (sp) { const r = sp.getBoundingClientRect(); sp.style.setProperty('--mx', e.clientX - r.left + 'px'); sp.style.setProperty('--my', e.clientY - r.top + 'px'); }
      if (!graf && motion.on) graf = requestAnimationFrame(function f() {
        gx = lerp(gx, tx, 0.14); gy = lerp(gy, ty, 0.14);
        glow.style.transform = `translate3d(${gx}px,${gy}px,0)`;
        graf = (Math.abs(gx - tx) + Math.abs(gy - ty) > 0.5 && motion.on) ? requestAnimationFrame(f) : 0;
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));

    $$('[data-magnet]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        if (!motion.on) return;
        const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', (e.clientX - (r.left + r.width / 2)) * 0.22 + 'px');
        b.style.setProperty('--ty', (e.clientY - (r.top + r.height / 2)) * 0.28 + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    });

    const lcard = $('#lcard'), hero = $('.hero');
    hero.addEventListener('pointermove', (e) => {
      if (!motion.on) return;
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      lcard.style.transform = `rotateY(${px * -7}deg) rotateX(${py * 6}deg)`;
      mouse.x = px + 0.5; mouse.y = py + 0.5;
    });
    hero.addEventListener('pointerleave', () => { lcard.style.transform = ''; mouse.x = 0.5; mouse.y = 0.5; });
  }
  const mouse = { x: 0.5, y: 0.5 };

  /* ------------------------------------------------------------------
     Hero: flowing payment-rails canvas
  ------------------------------------------------------------------ */
  (function heroFlow() {
    const cv = $('#flow'), ctx = cv.getContext('2d');
    let W = 0, H = 0;
    const N = 9;
    const parts = Array.from({ length: 78 }, () => ({ c: Math.floor(Math.random() * N), t: Math.random(), s: rand(0.05, 0.13), w: Math.random() < 0.72 ? 1 : 0 }));
    let sm = { x: 0.5, y: 0.5 };
    function size() {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function pt(c, t, time) {
      const k = c / (N - 1);
      const my = (sm.y - 0.5) * 70 * (k - 0.5), mx = (sm.x - 0.5) * 60;
      const y0 = H * (0.14 + 0.72 * k) + Math.sin(time * 0.45 + c * 1.3) * 12;
      const y1 = H * (0.82 - 0.62 * k) + Math.cos(time * 0.4 + c) * 12;
      const x0 = -30, x3 = W + 30, x1 = W * 0.42 + mx, x2 = W * 0.58 + mx;
      const a = (1 - t), b = a * a, d = t * t;
      const B0 = b * a, B1 = 3 * b * t, B2 = 3 * a * d, B3 = d * t;
      return [B0 * x0 + B1 * x1 + B2 * x2 + B3 * x3, B0 * y0 + B1 * (y0 + my) + B2 * (y1 + my) + B3 * y1];
    }
    const loop = makeLoop((dt, time) => {
      sm.x = lerp(sm.x, mouse.x, 0.05); sm.y = lerp(sm.y, mouse.y, 0.05);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (let c = 0; c < N; c++) {
        ctx.beginPath();
        for (let i = 0; i <= 44; i++) { const p = pt(c, i / 44, time); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
      }
      for (const p of parts) {
        p.t += p.s * dt;
        if (p.t > 1) { p.t = 0; p.c = Math.floor(Math.random() * N); p.s = rand(0.05, 0.13); }
        const col = p.w ? '201,255,74' : '240,238,230';
        const head = pt(p.c, p.t, time);
        const steps = 7;
        let prev = head;
        for (let i = 1; i <= steps; i++) {
          const tt = p.t - i * 0.007; if (tt < 0) break;
          const q = pt(p.c, tt, time);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]);
          ctx.strokeStyle = `rgba(${col},${0.75 * (1 - i / steps)})`; ctx.lineWidth = 1.8 * (1 - i / (steps + 2)); ctx.stroke();
          prev = q;
        }
        ctx.beginPath(); ctx.arc(head[0], head[1], 2.1, 0, 7); ctx.fillStyle = `rgba(${col},0.95)`; ctx.fill();
        if (p.w) { ctx.beginPath(); ctx.arc(head[0], head[1], 7, 0, 7); ctx.fillStyle = 'rgba(201,255,74,0.08)'; ctx.fill(); }
      }
    }, cv);
    size(); loop.redraw();
    new ResizeObserver(() => { size(); loop.redraw(); }).observe(cv);
  })();

  /* ------------------------------------------------------------------
     Hero: live ledger stream
  ------------------------------------------------------------------ */
  (function ledgerStream() {
    const list = $('#lrows'), cnt = $('#lcount'), lat = $('#llat'), btn = $('#lpause');
    const kinds = [
      ['rtp.credit', 'assets:settlement:rtp', () => 'liabilities:wallet:acct_' + hex(4)],
      ['ach.debit', 'assets:receivable:ach', () => 'liabilities:merchant:m_' + hex(4)],
      ['card.capture', 'assets:receivable:card', () => 'revenue:fees:interchange'],
      ['payout.create', () => 'liabilities:wallet:acct_' + hex(4), () => 'liabilities:payout:pending'],
      ['fx.convert', 'assets:cash:eur:sepa', 'assets:cash:usd:operating'],
      ['fedNow.send', () => 'liabilities:wallet:acct_' + hex(4), 'assets:settlement:fednow']
    ];
    let count = 0, paused = false, timer = 0, vis = true;
    const money = (c, cur) => (cur === 'EUR' ? '€' : '$') + c.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function make(animate) {
      const k = pick(kinds), cur = k[0] === 'fx.convert' ? 'EUR' : 'USD';
      const amt = Math.round(Math.exp(rand(Math.log(8), Math.log(24000))) * 100) / 100;
      const dr = typeof k[1] === 'function' ? k[1]() : k[1], cr = typeof k[2] === 'function' ? k[2]() : k[2];
      const ms = Math.round(rand(21, 42));
      const li = document.createElement('li');
      li.className = 'tx' + (animate ? ' enter' : '');
      li.innerHTML = `<div class="tx-h"><b>txn_${hex(6)} · ${k[0]}</b><span class="ok">balanced · ${ms}ms</span></div>
        <div class="tx-l"><span class="tag dr">DR</span><span class="a">${dr}</span><span class="v">${money(amt, cur)}</span></div>
        <div class="tx-l"><span class="tag cr">CR</span><span class="a">${cr}</span><span class="v">${money(amt, cur)}</span></div>`;
      return { li, ms };
    }
    function add(animate) {
      const { li, ms } = make(animate);
      list.prepend(li);
      while (list.children.length > 5) list.lastElementChild.remove();
      count += 2; cnt.textContent = count.toLocaleString('en-US'); lat.textContent = ms + ' ms';
    }
    for (let i = 0; i < 3; i++) add(false);
    count = 1204; cnt.textContent = count.toLocaleString('en-US');
    function schedule() {
      clearTimeout(timer);
      if (paused || !motion.on || !vis || document.hidden) return;
      timer = setTimeout(() => { add(true); schedule(); }, rand(1100, 1900));
    }
    btn.addEventListener('click', () => {
      paused = !paused; btn.textContent = paused ? 'Resume' : 'Pause'; btn.setAttribute('aria-pressed', String(paused)); schedule();
    });
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; schedule(); }).observe(list);
    motion.subs.add(schedule);
    document.addEventListener('visibilitychange', schedule);
    schedule();
  })();

  /* install copy */
  $('#install').addEventListener('click', async () => {
    const lbl = $('#cpLabel');
    try { await navigator.clipboard.writeText('npm i @ledgerline/node'); lbl.textContent = 'Copied'; }
    catch (e) { lbl.textContent = 'Press ⌘C'; }
    setTimeout(() => (lbl.textContent = 'Copy'), 1800);
  });

  /* ------------------------------------------------------------------
     Logo marquee
  ------------------------------------------------------------------ */
  (function marquee() {
    const glyphs = [
      '<circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/>',
      '<path d="M3 17 11 3l8 14z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
      '<rect x="3.5" y="3.5" width="15" height="15" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/>',
      '<path d="M3 11h16M11 3v16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      '<path d="M4 4h14v14H4zM4 11h14" fill="none" stroke="currentColor" stroke-width="2.2"/>',
      '<path d="M11 2.5 19 11l-8 8.5L3 11z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>'
    ];
    const names = [['Halcyon', ''], ['Brightloop', 's'], ['Kestrel', ''], ['meridian_', 'm'], ['Plinth', ''], ['Tessellate', 's'], ['Auriga', ''], ['northgate', 'm']];
    const items = names.map((n, i) => `<span class="wm ${n[1]}"><svg viewBox="0 0 22 22" aria-hidden="true">${glyphs[i % glyphs.length]}</svg>${n[0]}</span>`).join('');
    $('#marq').innerHTML = items + items;
  })();

  /* ------------------------------------------------------------------
     Product: pinned scroll scenes
  ------------------------------------------------------------------ */
  const pin = $('#pin'), steps = $$('.step'), scenes = $$('.scene'), stageTag = $('#stageTag');
  const tags = ['payments.route()', 'ledger.post()', 'reconcile.match()'];
  let pinIdx = -1;
  function updatePin() {
    const r = pin.getBoundingClientRect();
    const total = pin.offsetHeight - innerHeight;
    const f = clamp(-r.top / total, 0, 0.9999) * 3;
    const idx = Math.floor(f);
    steps.forEach((s, i) => {
      s.style.setProperty('--p', i < idx ? 1 : i === idx ? clamp(f - idx, 0, 1).toFixed(3) : 0);
      s.classList.toggle('on', i === idx);
    });
    if (idx !== pinIdx) {
      pinIdx = idx;
      scenes.forEach((s, i) => s.classList.toggle('on', i === idx));
      stageTag.textContent = tags[idx];
    }
  }
  steps.forEach((s, i) => s.addEventListener('click', () => {
    const top = pin.getBoundingClientRect().top + scrollY;
    const total = pin.offsetHeight - innerHeight;
    scrollTo({ top: top + ((i + 0.5) / 3) * total, behavior: motion.on ? 'smooth' : 'auto' });
  }));

  /* ------------------------------------------------------------------
     API: code tabs, highlighter, simulated request
  ------------------------------------------------------------------ */
  (function api() {
    const samples = {
      curl: `curl https://api.ledgerline.dev/v1/transfers \\
  -H "Authorization: Bearer $LEDGERLINE_KEY" \\
  -H "Idempotency-Key: ord_8f21c9" \\
  -d amount=1240000 \\
  -d currency=USD \\
  -d source=acct_operating \\
  -d destination=acct_wallet_4a1 \\
  -d rail=rtp`,
      node: `import Ledgerline from "@ledgerline/node";

const ll = new Ledgerline(process.env.LEDGERLINE_KEY);

const transfer = await ll.transfers.create({
  amount: 1240000, // minor units
  currency: "USD",
  source: "acct_operating",
  destination: "acct_wallet_4a1",
  rail: "rtp",
}, { idempotencyKey: "ord_8f21c9" });

console.log(transfer.status); // "settled"`,
      python: `import os
from ledgerline import Ledgerline

ll = Ledgerline(api_key=os.environ["LEDGERLINE_KEY"])

transfer = ll.transfers.create(
    amount=1_240_000,  # minor units
    currency="USD",
    source="acct_operating",
    destination="acct_wallet_4a1",
    rail="rtp",
    idempotency_key="ord_8f21c9",
)

print(transfer.status)  # "settled"`
    };
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function highlight(line, lang) {
      const cm = lang === 'node' ? '\\/\\/.*' : lang === 'json' ? '(?!)' : '#.*';
      const re = new RegExp(`(${cm})|("(?:[^"\\\\]|\\\\.)*")(?=\\s*:)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(\\b\\d[\\d_]*(?:\\.\\d+)?\\b)|(\\b[A-Za-z_]\\w*)(?=\\()|(\\b(?:import|from|const|await|new|return|curl|true|false|null)\\b)|((?<=\\s)-[HXd]\\b)`, 'g');
      let out = '', last = 0, m;
      while ((m = re.exec(line))) {
        out += esc(line.slice(last, m.index));
        const cls = m[1] ? 't-c' : m[2] ? 't-f' : m[3] ? 't-s' : m[4] ? 't-n' : m[5] ? 't-f' : m[6] ? 't-k' : 't-k';
        out += `<span class="${cls}">${esc(m[0])}</span>`;
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      return out + esc(line.slice(last));
    }
    function render(el, text, lang) {
      el.innerHTML = text.split('\n').map((l, i) => `<span class="cl" style="--i:${i}">${highlight(l, lang) || '&#8203;'}</span>`).join('');
    }
    const codeEl = $('#codeEl'), tabs = $$('.tab');
    let lang = 'curl';
    render(codeEl, samples.curl, 'curl');
    tabs.forEach((t) => t.addEventListener('click', () => {
      lang = t.dataset.lang;
      tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
      render(codeEl, samples[lang], lang);
    }));

    const run = $('#run'), respEl = $('#respEl'), badge = $('#respBadge'), ms = $('#respMs');
    run.addEventListener('click', () => {
      run.disabled = true; badge.hidden = true; ms.textContent = '';
      respEl.innerHTML = '<span class="resp-empty"><span class="spinner"></span>Posting journal&hellip;</span>';
      const lat = Math.round(rand(27, 46));
      setTimeout(() => {
        const json = `{
  "id": "txn_01${hex(8).toUpperCase()}",
  "object": "transfer",
  "status": "settled",
  "amount": 1240000,
  "currency": "USD",
  "rail": "rtp",
  "entries": [
    { "account": "acct_operating", "direction": "debit" },
    { "account": "acct_wallet_4a1", "direction": "credit" }
  ],
  "balanced": true,
  "latency_ms": ${lat}
}`;
        render(respEl, json, 'json');
        badge.hidden = false; ms.textContent = `simulated sandbox response · ${lat} ms`;
        run.disabled = false;
      }, motion.on ? 520 : 0);
    });
  })();

  /* ------------------------------------------------------------------
     Reliability: uptime bars, latency chart, region failover
  ------------------------------------------------------------------ */
  (function uptime() {
    const el = $('#uptime'), tip = $('#tip');
    const now = new Date();
    const warn = { 61: 'Elevated webhook delay (4 min). No entries lost.', 23: 'Degraded ACH partner connectivity (11 min). Payments queued, none dropped.' };
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const b = document.createElement('i');
      b.style.setProperty('--i', 89 - i);
      b.dataset.t = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (warn[i]) { b.classList.add('warn'); b.dataset.d = warn[i]; } else b.dataset.d = '100% available';
      el.appendChild(b);
    }
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { el.classList.add('in'); o.disconnect(); } }, { threshold: 0.3 }).observe(el);
    el.addEventListener('pointerover', (e) => {
      const b = e.target.closest('i'); if (!b) return;
      const r = b.getBoundingClientRect();
      tip.innerHTML = `${b.dataset.t}<small>${b.dataset.d}</small>`;
      tip.style.left = r.left + r.width / 2 + 'px'; tip.style.top = r.top - 4 + 'px'; tip.classList.add('on');
    });
    el.addEventListener('pointerleave', () => tip.classList.remove('on'));
  })();

  (function latency() {
    const cv = $('#lat'), ctx = cv.getContext('2d'), out = $('#latNow');
    const N = 90, step = 0.25;
    let W = 0, H = 0, acc = 0, t = 0;
    const p99 = [], p50 = [];
    const sample = () => {
      t += 1;
      const spike = Math.random() < 0.06 ? rand(6, 14) : 0;
      return [clamp(34 + Math.sin(t * 0.21) * 4 + rand(-3, 3) + spike, 20, 58), clamp(11 + Math.sin(t * 0.17 + 1) * 1.4 + rand(-1, 1), 6, 18)];
    };
    for (let i = 0; i < N + 2; i++) { const s = sample(); p99.push(s[0]); p50.push(s[1]); }
    function size() { const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function line(arr, off, color, fill) {
      const dx = W / (N - 1);
      ctx.beginPath();
      arr.forEach((v, i) => { const x = (i - off) * dx, y = H - 16 - (v / 64) * (H - 24); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      if (fill) {
        ctx.lineTo((arr.length - 1 - off) * dx, H); ctx.lineTo(-off * dx, H); ctx.closePath();
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(201,255,74,0.22)'); g.addColorStop(1, 'rgba(201,255,74,0)');
        ctx.fillStyle = g; ctx.fill();
      }
    }
    const loop = makeLoop((dt) => {
      acc += dt;
      while (acc >= step) { acc -= step; const s = sample(); p99.push(s[0]); p50.push(s[1]); p99.shift(); p50.shift(); out.textContent = Math.round(s[0]); }
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px "JetBrains Mono", monospace';
      [20, 40, 60].forEach((v) => { const y = H - 16 - (v / 64) * (H - 24); ctx.beginPath(); ctx.setLineDash([3, 5]); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillText(v + 'ms', 2, y - 4); });
      const off = acc / step;
      line(p99, off, '#c9ff4a', true);
      line(p50, off, '#7fe7ff', false);
    }, cv);
    size(); loop.redraw();
    new ResizeObserver(() => { size(); loop.redraw(); }).observe(cv);
  })();

  (function regions() {
    const svg = $('#regions'), status = $('#regStatus');
    const nodes = [
      { id: 'us-west-2', x: 78, y: 120 }, { id: 'us-east-1', x: 190, y: 98 }, { id: 'sa-east-1', x: 212, y: 252 },
      { id: 'eu-west-1', x: 318, y: 74 }, { id: 'eu-central-1', x: 392, y: 130 }, { id: 'ap-south-1', x: 468, y: 214 },
      { id: 'ap-northeast-1', x: 540, y: 108 }, { id: 'ap-southeast-1', x: 522, y: 280 }
    ];
    const pairs = [[0, 1], [1, 3], [1, 2], [3, 4], [4, 5], [5, 6], [5, 7], [4, 6], [0, 2], [1, 4], [2, 5], [6, 7]];
    const mk = (n, a) => { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const gridG = mk('g', {});
    for (let x = 20; x < 600; x += 28) for (let y = 20; y < 320; y += 28) gridG.appendChild(mk('circle', { cx: x, cy: y, r: 1, fill: 'rgba(255,255,255,0.08)' }));
    svg.appendChild(gridG);
    const linkG = mk('g', {}), nodeG = mk('g', {});
    svg.appendChild(linkG); svg.appendChild(nodeG);
    const links = pairs.map(([a, b], i) => {
      const A = nodes[a], B = nodes[b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), bend = 0.18 * len * (i % 2 ? 1 : -1);
      const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
      const g = mk('g', { class: 'lk' });
      g.appendChild(mk('path', { id: 'rl' + i, class: 'link', d: `M${A.x},${A.y} Q${cx},${cy} ${B.x},${B.y}` }));
      for (let k = 0; k < 2; k++) {
        const c = mk('circle', { class: 'pk', r: 2.6 });
        const am = mk('animateMotion', { dur: (2.4 + (i % 4) * 0.4) + 's', begin: -(k * 1.3 + i * 0.37) + 's', repeatCount: 'indefinite', keyPoints: k ? '1;0' : '0;1', keyTimes: '0;1', calcMode: 'linear' });
        am.appendChild(mk('mpath', { href: '#rl' + i }));
        c.appendChild(am); g.appendChild(c);
      }
      linkG.appendChild(g);
      return { a, b, g };
    });
    const els = nodes.map((n, i) => {
      const g = mk('g', { class: 'nd', tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': 'Toggle ' + n.id });
      g.appendChild(mk('circle', { class: 'halo', cx: n.x, cy: n.y, r: 16 }));
      g.appendChild(mk('circle', { class: 'core', cx: n.x, cy: n.y, r: 7 }));
      const left = n.x > 440;
      const t = mk('text', { x: n.x + (left ? -14 : 0), y: n.y + (left ? 4 : 28), 'text-anchor': left ? 'end' : 'middle' }); t.textContent = n.id;
      g.appendChild(t);
      nodeG.appendChild(g);
      g.addEventListener('click', () => { touched = true; toggle(i); });
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); touched = true; toggle(i); } });
      return g;
    });
    const down = new Set();
    let touched = false;
    function nearest(i) {
      let best = -1, bd = 1e9;
      nodes.forEach((n, j) => { if (j === i || down.has(j)) return; const d = Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y); if (d < bd) { bd = d; best = j; } });
      return best;
    }
    function paint(msgIdx) {
      els.forEach((g, i) => { g.classList.toggle('down', down.has(i)); g.setAttribute('aria-pressed', String(down.has(i))); });
      links.forEach((l) => l.g.classList.toggle('off', down.has(l.a) || down.has(l.b)));
      if (!down.size) status.innerHTML = '<span><b>8 / 8</b> regions healthy · <span class="good">all traffic on primary paths</span></span><span>Click a node to simulate an outage</span>';
      else {
        const i = msgIdx !== undefined ? msgIdx : [...down].pop(), to = nearest(i), ms = Math.round(rand(180, 290));
        status.innerHTML = to < 0
          ? '<span class="bad">All regions offline</span><button type="button" id="regReset">Restore all</button>'
          : `<span><b class="bad">${nodes[i].id}</b> offline → rerouted to <b>${nodes[to].id}</b> in <b>${ms} ms</b> · <span class="good">0 entries lost</span></span><button type="button" id="regReset">Restore all</button>`;
        const rb = $('#regReset'); rb && rb.addEventListener('click', () => { touched = true; down.clear(); paint(); });
      }
    }
    function toggle(i) { down.has(i) ? down.delete(i) : down.add(i); paint(i); }
    paint();
    // one gentle auto-demo the first time the map is seen
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      if (!motion.on) return;
      setTimeout(() => { if (!touched && motion.on) toggle(1); }, 1800);
      setTimeout(() => { if (!touched && motion.on) { down.clear(); paint(); } }, 6200);
    }, { threshold: 0.6 }).observe(svg);
  })();

  (function orbit() {
    const keys = $('.keys');
    const speeds = [5, -8, 13];
    const items = $$('.ring', keys).map((r, ri) => { const sp = $$('.orb span', r); return sp.map((s, k) => ({ s, a: (k / sp.length) * 360 + ri * 40 })); });
    const loop = makeLoop((dt, time) => {
      const R = keys.clientWidth / 2, radii = [R, R * 0.72, R * 0.4];
      items.forEach((list, ri) => list.forEach((o) => {
        const a = ((o.a + speeds[ri] * time) * Math.PI) / 180;
        o.s.style.transform = `translate(calc(-50% + ${(Math.cos(a) * radii[ri]).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * radii[ri]).toFixed(1)}px))`;
      }));
    }, keys);
    loop.redraw();
    new ResizeObserver(() => loop.redraw()).observe(keys);
  })();

  /* ------------------------------------------------------------------
     Customers
  ------------------------------------------------------------------ */
  (function customers() {
    const data = [
      { name: 'Halcyon', glyph: '<circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/>', cls: '', who: 'Priya Raman', role: 'VP Engineering, Halcyon', color: '#c9ff4a',
        quote: 'We replaced three ledgers and a nightly reconciliation script with Ledgerline. Our first month-end close with zero manual adjustments felt like <mark>cheating.</mark>',
        m: [{ n: 9, dec: 0, s: ' days', t: 'to launch, down from 11 weeks' }, { n: 94, dec: 0, s: '%', t: 'fewer reconciliation breaks' }, { n: 4.2, dec: 1, s: '×', t: 'peak throughput headroom' }] },
      { name: 'Brightloop', glyph: '<path d="M3 17 11 3l8 14z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>', cls: 's', who: 'Marcus Ode', role: 'Head of Platform, Brightloop', color: '#7fe7ff',
        quote: 'Payout volume tripled in launch week and our p99 never moved. Idempotency keys alone removed <mark>an entire class of incidents</mark> from our on-call.',
        m: [{ n: 3, dec: 0, s: '×', t: 'launch-week payout volume' }, { n: 0, dec: 0, s: '', t: 'double payouts since go-live' }, { n: 38, dec: 0, s: ' ms', t: 'p99 write latency at peak' }] },
      { name: 'Kestrel', glyph: '<rect x="3.5" y="3.5" width="15" height="15" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/>', cls: '', who: 'Elena Voss', role: 'CTO, Kestrel Bank', color: '#ffb547',
        quote: 'Our auditors asked how we prove history. We handed them a hash chain and a query. <mark>The review took two days, not two quarters.</mark>',
        m: [{ n: 2, dec: 0, s: ' days', t: 'for the annual ledger audit' }, { n: 100, dec: 0, s: '%', t: 'of journals balanced, always' }, { n: 70, dec: 0, s: '%', t: 'less finance-eng toil' }] }
    ];
    const tabsEl = $('#custTabs'), quotesEl = $('#quotes'), metricsEl = $('#metrics');
    tabsEl.setAttribute('role', 'tablist');
    data.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'ct'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === 0));
      b.innerHTML = `<span class="wm ${d.cls}"><svg viewBox="0 0 22 22" aria-hidden="true" style="width:22px;height:22px">${d.glyph}</svg>${d.name}</span><i></i>`;
      b.addEventListener('click', () => select(i, true));
      tabsEl.appendChild(b);
      const q = document.createElement('figure');
      q.className = 'quote' + (i === 0 ? ' on' : ''); q.style.margin = 0;
      q.innerHTML = `<blockquote>&ldquo;${d.quote}&rdquo;</blockquote><figcaption class="who"><span class="av" style="background:${d.color}">${d.who.split(' ').map((w) => w[0]).join('')}</span><span><b>${d.who}</b><span>${d.role}</span></span></figcaption>`;
      quotesEl.appendChild(q);
    });
    const tabEls = $$('.ct', tabsEl), quoteEls = $$('.quote', quotesEl);
    function renderMetrics(i, animate) {
      metricsEl.innerHTML = data[i].m.map((m) => `<div class="m-card"><div class="n"><span class="cv">${fmtNum(animate && motion.on ? 0 : m.n, m.dec)}</span><em>${m.s}</em></div><p>${m.t}</p></div>`).join('');
      if (animate) $$('.cv', metricsEl).forEach((el, k) => countUp(el, data[i].m[k].n, data[i].m[k].dec, 1400));
    }
    let cur = 0, prog = 0, hover = false, vis = false, started = false;
    const DUR = 8000;
    function select(i, user) {
      cur = i; prog = 0;
      tabEls.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.lastElementChild.style.transform = 'scaleX(0)'; });
      quoteEls.forEach((q, k) => q.classList.toggle('on', k === i));
      renderMetrics(i, true);
      if (user) hover = false;
    }
    renderMetrics(0, false);
    new IntersectionObserver((es) => {
      vis = es[0].isIntersecting;
      if (vis && !started) { started = true; renderMetrics(0, true); }
    }, { threshold: 0.35 }).observe(quotesEl);
    $('.proof-grid').addEventListener('pointerenter', () => (hover = true));
    $('.proof-grid').addEventListener('pointerleave', () => (hover = false));
    let last = performance.now();
    (function tick(t) {
      const dt = t - last; last = t;
      if (vis && motion.on && !hover && !document.hidden) {
        prog += dt / DUR;
        tabEls[cur].lastElementChild.style.transform = `scaleX(${clamp(prog, 0, 1)})`;
        if (prog >= 1) select((cur + 1) % data.length);
      }
      requestAnimationFrame(tick);
    })(last);
  })();

  /* ------------------------------------------------------------------
     Pricing
  ------------------------------------------------------------------ */
  (function pricing() {
    let annual = false;
    const btns = $$('#billing button'), pill = $('#pill');
    const prices = $$('[data-price]'), meta = $('#growthMeta');
    function tween(el, to, fmt, dur = 700) {
      const from = el._v !== undefined ? el._v : to;
      el._v = to;
      if (!motion.on || from === to) { el.textContent = fmt(to); return; }
      const t0 = performance.now(); cancelAnimationFrame(el._r);
      const f = (t) => { const p = clamp((t - t0) / dur, 0, 1); el.textContent = fmt(lerp(from, to, easeOut(p))); if (p < 1) el._r = requestAnimationFrame(f); };
      el._r = requestAnimationFrame(f);
    }
    const usd = (v) => Math.round(v).toLocaleString('en-US');
    function placePill() {
      const b = btns.find((x) => x.getAttribute('aria-pressed') === 'true');
      pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    }
    function apply() {
      prices.forEach((p) => tween(p, parseFloat(annual ? p.dataset.a : p.dataset.m), usd));
      meta.textContent = annual ? 'Billed annually · 5M entries included, then $0.06 per 1,000' : '5M entries included, then $0.06 per 1,000';
      estimate();
    }
    btns.forEach((b) => b.addEventListener('click', () => {
      annual = b.dataset.b === 'annual';
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      placePill(); apply();
    }));
    placePill(); addEventListener('resize', placePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);

    const rng = $('#rng'), val = $('#rngVal'), out = $('#estOut'), note = $('#estNote');
    function entries() {
      const v = parseFloat(rng.value) / 100, m = Math.pow(10, v * 3);
      return m < 10 ? Math.round(m * 2) / 2 : m < 100 ? Math.round(m) : Math.round(m / 10) * 10;
    }
    const fmtM = (m) => (m >= 1000 ? (m / 1000).toFixed(m % 1000 ? 1 : 0).replace(/\.0$/, '') + 'B' : (Number.isInteger(m) ? m : m.toFixed(1)) + 'M');
    function estimate() {
      const m = entries();
      rng.style.setProperty('--fill', rng.value + '%');
      val.textContent = fmtM(m);
      if (m >= 500) {
        out.textContent = 'Custom'; out._v = undefined;
        note.textContent = 'At this volume Enterprise pricing is a better fit. Talk to sales.';
        return;
      }
      const cost = (490 + Math.max(0, m - 5) * 60) * (annual ? 0.8 : 1);
      tween(out, cost, (v) => '$' + usd(v), 450);
      note.textContent = `per month on Growth, billed ${annual ? 'annually' : 'monthly'}`;
    }
    rng.addEventListener('input', estimate);
    estimate();
  })();

  /* ------------------------------------------------------------------
     Sign-up form
  ------------------------------------------------------------------ */
  (function signup() {
    const form = $('#su'), email = $('#email'), field = $('#emailField'), err = $('#emailErr'), btn = $('#suBtn');
    const ok = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    email.addEventListener('input', () => { field.classList.remove('err'); err.textContent = ''; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!ok(email.value.trim())) {
        field.classList.remove('err'); void field.offsetWidth; field.classList.add('err');
        err.textContent = 'Enter a valid work email, like you@company.com'; email.focus(); return;
      }
      btn.disabled = true; btn.firstChild.textContent = 'Creating sandbox… ';
      setTimeout(() => {
        const a = new Uint8Array(24); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 256));
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        $('#keybox').textContent = 'sk_test_' + Array.from(a, (b) => chars[b % chars.length]).join('');
        form.classList.add('done');
      }, motion.on ? 900 : 0);
    });
  })();

  /* ------------------------------------------------------------------
     Footer wordmark fill
  ------------------------------------------------------------------ */
  const word = $('#ftrWord');
  function updateFooterWord() {
    const r = word.getBoundingClientRect();
    const p = clamp((innerHeight - r.top) / (innerHeight * 0.75), 0, 1);
    word.style.setProperty('--wf', (p * 100).toFixed(1) + '%');
  }

  /* init */
  setMotion(motion.on);
  onScroll();
})();
