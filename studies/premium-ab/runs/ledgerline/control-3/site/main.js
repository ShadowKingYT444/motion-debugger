(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const isStatic = () => root.classList.contains('static');
  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- motion toggle ---------- */
  const mt = $('#motionToggle');
  const userReduced = root.classList.contains('static');
  const syncToggle = () => {
    mt.textContent = isStatic() ? 'Resume motion' : 'Pause motion';
    mt.setAttribute('aria-pressed', String(isStatic()));
  };
  mt.addEventListener('click', () => {
    root.classList.toggle('static');
    syncToggle();
    if (!isStatic()) { startFeed(); } else { stopFeed(); }
    drawStatic();
    $$('[data-reveal]').forEach(e => e.classList.add('in'));
  });
  syncToggle();

  /* ---------- hero headline split ---------- */
  const split = el => {
    let i = 0;
    const walk = (node, parent) => {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { parent.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = t; s.style.setProperty('--i', i++);
            w.appendChild(s); parent.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          const c = n.cloneNode(false); parent.appendChild(c); walk(n, c);
        }
      });
    };
    const label = el.textContent;
    const frag = document.createElement('span');
    walk(el, frag);
    el.setAttribute('aria-label', label);
    el.textContent = '';
    [...frag.childNodes].forEach(n => { if (n.nodeType === 1 && !n.classList.contains('w')) n.setAttribute('aria-hidden', 'true'); else if (n.nodeType === 1) n.setAttribute('aria-hidden', 'true'); el.appendChild(n); });
  };
  $$('[data-split]').forEach(split);

  /* ---------- reveal ---------- */
  const revealTargets = $$('[data-reveal],[data-split]');
  revealTargets.forEach(el => { if (el.dataset.delay) el.style.setProperty('--rd', el.dataset.delay); });
  if (hasIO) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(el => io.observe(el));
  } else revealTargets.forEach(el => el.classList.add('in'));

  /* ---------- scroll: progress, nav, statement, glow ---------- */
  const bar = $('.progress i'), nav = $('#nav');
  const stateEl = $('#stateText');
  const words = stateEl.textContent.trim().split(/\s+/);
  stateEl.setAttribute('aria-label', words.join(' '));
  stateEl.innerHTML = words.map(w => `<span class="sw" aria-hidden="true">${w}</span>`).join(' ');
  const sw = $$('.sw', stateEl);
  let lastY = 0, ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 24);
    const mobileOpen = $('#navLinks').classList.contains('open');
    nav.classList.toggle('hide', y > lastY + 4 && y > 500 && !mobileOpen ? true : (y < lastY - 4 ? false : nav.classList.contains('hide')));
    lastY = y;
    const r = stateEl.getBoundingClientRect();
    const p = clamp((innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    const n = Math.round(p * (sw.length + 2));
    sw.forEach((s, i) => s.classList.toggle('lit', i < n));
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // section highlight in nav
  const links = $$('#navLinks a');
  if (hasIO) {
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('cur', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['product', 'api', 'trust', 'customers', 'pricing'].forEach(id => so.observe($('#' + id)));
  }

  // mobile menu
  const burger = $('#burger'), navLinks = $('#navLinks');
  const setMenu = o => { navLinks.classList.toggle('open', o); burger.setAttribute('aria-expanded', String(o)); nav.classList.toggle('open-menu', o); nav.classList.remove('hide'); };
  burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- pointer effects ---------- */
  if (fine) {
    document.addEventListener('pointermove', e => {
      const t = e.target.closest && e.target.closest('.spot');
      if (t) { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    }, { passive: true });
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        if (isStatic()) return;
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
    const hero = $('.hero'), card = $('#ledgerCard'), glow = $('#heroGlow');
    hero.addEventListener('pointermove', e => {
      if (isStatic()) return;
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
      glow.style.setProperty('--gx', (px * 80).toFixed(0) + 'px');
      glow.style.setProperty('--gy', (py * 60).toFixed(0) + 'px');
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    });
    hero.addEventListener('pointerleave', () => {
      card.style.setProperty('--ry', '0deg'); card.style.setProperty('--rx', '0deg'); mouse.on = false;
    });
  }

  /* ---------- counters ---------- */
  const counters = $$('[data-count]');
  const runCount = el => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '';
    const show = v => { el.textContent = pre + v.toFixed(dec); };
    if (isStatic() || end === 0) { show(end); return; }
    const t0 = performance.now(), dur = 1800;
    const step = t => {
      const p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      show(end * e); if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  counters.forEach(c => { c.textContent = (c.dataset.pre || '') + parseFloat(c.dataset.count).toFixed(+(c.dataset.dec || 0)); });
  if (hasIO) {
    const co = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } }), { threshold: 0.6 });
    counters.forEach(c => co.observe(c));
  }

  /* ---------- hero canvas: flows into the ledger ---------- */
  const cv = $('#flow'), ctx = cv.getContext('2d');
  const mouse = { x: 0, y: 0, on: false };
  let W = 0, H = 0, dpr = 1, lanes = [], hub = { x: 0, y: 0 }, parts = [], heroVisible = true, raf = 0, tPrev = 0, tAcc = 0;
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  const build = () => {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W > 1020;
    hub = wide ? { x: W * 0.72, y: H * 0.5 } : { x: W * 0.5, y: H * 0.78 };
    lanes = [];
    const n = wide ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const y = H * (0.12 + 0.76 * (i / (n - 1)));
      lanes.push({ in: true, p: [{ x: -20, y }, { x: hub.x * 0.45, y }, { x: hub.x * 0.6, y: hub.y }, hub] });
    }
    for (let i = 0; i < 4; i++) {
      const y = H * (0.2 + 0.6 * (i / 3));
      lanes.push({ in: false, p: [hub, { x: hub.x + (W - hub.x) * 0.45, y: hub.y }, { x: hub.x + (W - hub.x) * 0.6, y }, { x: W + 20, y }] });
    }
    parts = [];
    drawStatic();
  };
  const spawn = () => {
    const l = lanes[(Math.random() * lanes.length) | 0];
    parts.push({ l, t: 0, v: 0.12 + Math.random() * 0.16, c: Math.random() < 0.14 ? '110,168,255' : '182,255,92', s: 1 + Math.random() * 1.4 });
  };
  const drawLanes = () => {
    ctx.lineWidth = 1;
    lanes.forEach(l => {
      const [a, b, c, d] = l.p;
      const g = ctx.createLinearGradient(a.x, a.y, d.x, d.y);
      g.addColorStop(0, 'rgba(182,255,92,0)'); g.addColorStop(.5, 'rgba(182,255,92,.13)'); g.addColorStop(1, 'rgba(182,255,92,.03)');
      if (!l.in) { g.addColorStop(0, 'rgba(182,255,92,.1)'); g.addColorStop(1, 'rgba(182,255,92,0)'); }
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y); ctx.stroke();
    });
  };
  const drawHub = (t) => {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.00035 + i / 3) % 1;
      ctx.strokeStyle = `rgba(182,255,92,${0.22 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, 18 + ph * 150, 0, 6.2832); ctx.stroke();
    }
    const g = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 90);
    g.addColorStop(0, 'rgba(182,255,92,.35)'); g.addColorStop(1, 'rgba(182,255,92,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hub.x, hub.y, 90, 0, 6.2832); ctx.fill();
  };
  const drawStatic = () => {
    if (!W) return;
    ctx.clearRect(0, 0, W, H); drawLanes();
    ctx.fillStyle = 'rgba(182,255,92,.7)';
    lanes.forEach((l, i) => { const t = 0.2 + (i % 4) * 0.2; const [a, b, c, d] = l.p; ctx.beginPath(); ctx.arc(bez(a.x, b.x, c.x, d.x, t), bez(a.y, b.y, c.y, d.y, t), 2, 0, 6.2832); ctx.fill(); });
    drawHub(0);
  };
  const frame = (now) => {
    raf = 0;
    if (isStatic() || !heroVisible) return;
    const dt = Math.min(0.05, (now - (tPrev || now)) / 1000); tPrev = now;
    tAcc += dt; while (tAcc > 0.09) { tAcc -= 0.09; if (parts.length < 150) spawn(); }
    ctx.clearRect(0, 0, W, H); drawLanes(); drawHub(now);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; const [a, b, c, d] = p.l.p;
      // mouse repel: slow near cursor for a subtle "inspect" feel
      let v = p.v;
      p.t += v * dt * (p.l.in ? 1 : 1.1);
      if (p.t >= 1) { parts.splice(i, 1); if (p.l.in && Math.random() < 0.7) pulses.push({ x: hub.x, y: hub.y, a: 1 }); continue; }
      for (let k = 0; k < 8; k++) {
        const tt = Math.max(0, p.t - k * 0.012);
        const x = bez(a.x, b.x, c.x, d.x, tt), y = bez(a.y, b.y, c.y, d.y, tt);
        let boost = 1;
        if (mouse.on) { const dx = x - mouse.x, dy = y - mouse.y; boost = 1 + Math.max(0, 1 - Math.hypot(dx, dy) / 160) * 1.5; }
        ctx.fillStyle = `rgba(${p.c},${(1 - k / 8) * 0.8})`;
        ctx.beginPath(); ctx.arc(x, y, p.s * (1 - k / 11) * boost, 0, 6.2832); ctx.fill();
      }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const q = pulses[i]; q.a -= dt * 2.2;
      if (q.a <= 0) { pulses.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(182,255,92,${q.a * 0.35})`; ctx.beginPath(); ctx.arc(q.x, q.y, 10 + (1 - q.a) * 26, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  };
  const pulses = [];
  const kick = () => { if (!raf && !isStatic() && heroVisible) { tPrev = 0; raf = requestAnimationFrame(frame); } };
  build();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); kick(); }, 150); });
  if (hasIO) new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; if (heroVisible) kick(); }).observe($('.hero'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  // restart canvas when motion resumes
  mt.addEventListener('click', () => { kick(); });
  kick();

  /* ---------- live ledger feed ---------- */
  const rowsEl = $('#rows'), balEl = $('#bal'), cntEl = $('#entryCount');
  let bal = 4812904.18, entries = 18442, feedTimer = 0;
  const kinds = [
    ['Card capture', 'card_{h} → merchant', 1, 8, 420],
    ['RTP payout', 'escrow → acct_{n}', 1, 900, 24000],
    ['ACH credit', 'payroll → acct_{n}', 1, 1200, 9500],
    ['Interchange fee', 'merchant → fees', -1, .4, 9],
    ['FedNow transfer', 'treasury → acct_{n}', 1, 300, 15000],
    ['Refund', 'merchant → card_{h}', -1, 8, 260],
    ['FX swap USD→EUR', 'fx:usd → fx:eur', 1, 500, 12000],
    ['Wire in', 'ext:bank → treasury', 1, 20000, 180000]
  ];
  const rid = () => Math.random().toString(36).slice(2, 5);
  const nid = () => 1000 + ((Math.random() * 9000) | 0);
  const addRow = () => {
    const k = kinds[(Math.random() * kinds.length) | 0];
    const amt = Math.round((k[3] + Math.random() * (k[4] - k[3])) * 100) / 100;
    const now = new Date(); const ts = [now.getHours(), now.getMinutes(), now.getSeconds()].map(v => String(v).padStart(2, '0')).join(':');
    const li = document.createElement('li'); li.className = 'row new';
    li.innerHTML = `<span class="r-t mono">${ts}</span><span class="r-d"><b>${k[0]}</b><i class="mono">${k[1].replace('{h}', rid()).replace('{n}', nid())}</i></span><span class="r-a mono ${k[2] > 0 ? 'pos' : 'neg'}">${k[2] > 0 ? '' : '−'}${fmt(amt)}</span>`;
    rowsEl.insertBefore(li, rowsEl.firstChild);
    while (rowsEl.children.length > 7) rowsEl.lastChild.remove();
    bal += k[2] * amt; entries += 2;
    balEl.textContent = fmt(bal); cntEl.textContent = '· ' + entries.toLocaleString('en-US') + ' entries';
  };
  const startFeed = () => { if (isStatic() || feedTimer) return; const loop = () => { addRow(); feedTimer = setTimeout(loop, 1100 + Math.random() * 900); }; feedTimer = setTimeout(loop, 1400); };
  const stopFeed = () => { clearTimeout(feedTimer); feedTimer = 0; };
  startFeed();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopFeed(); else startFeed(); });

  /* ---------- product tabs ---------- */
  const prod = $('#prod'), ptabs = $$('.ptab'), panels = $$('.panel');
  const titles = ['POST /v1/transfers', 'GET /v1/ledgers/ledger_8f2kq/entries', 'GET /v1/reconciliations/run_0442'];
  let cur = 0, tourPaused = false;
  const stageTitle = $('#stageTitle');
  const playPanel = p => { p.classList.remove('run'); void p.offsetWidth; p.classList.add('run'); };
  const select = i => {
    cur = (i + ptabs.length) % ptabs.length;
    ptabs.forEach((t, k) => { t.classList.toggle('active', k === cur); t.setAttribute('aria-selected', String(k === cur)); });
    panels.forEach((p, k) => p.classList.toggle('active', k === cur));
    playPanel(panels[cur]); stageTitle.textContent = titles[cur];
  };
  ptabs.forEach((t, i) => t.addEventListener('click', () => { if (i === cur) { playPanel(panels[cur]); return; } select(i); }));
  ptabs.forEach(t => t.addEventListener('animationend', e => { if (e.animationName === 'tabfill' && t.classList.contains('active') && !tourPaused) select(cur + 1); }, true));
  $('#replay').addEventListener('click', () => playPanel(panels[cur]));
  const tp = $('#tabPause');
  tp.addEventListener('click', () => { tourPaused = !tourPaused; prod.classList.toggle('paused', tourPaused); tp.textContent = tourPaused ? 'Resume tour' : 'Pause tour'; tp.setAttribute('aria-pressed', String(tourPaused)); });
  // restart the tour clock only once visible
  if (hasIO) {
    prod.classList.add('idle');
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { prod.classList.remove('idle'); playPanel(panels[cur]); o.disconnect(); } }, { threshold: 0.35 }).observe(prod);
  }

  /* ---------- API ---------- */
  const samples = {
    curl: `curl https://api.ledgerline.dev/v1/transfers \\
  -u sk_test_51Nq: \\
  -H "Idempotency-Key: ord_9021" \\
  -d source="acct_merchant_escrow" \\
  -d destination="acct_payout_4417" \\
  -d amount=12480 \\
  -d currency="usd" \\
  -d rail="rtp"`,
    node: `import Ledgerline from "@ledgerline/node";

const ll = new Ledgerline(process.env.LEDGERLINE_KEY);

const transfer = await ll.transfers.create({
  source: "acct_merchant_escrow",
  destination: "acct_payout_4417",
  amount: 12480,        // minor units
  currency: "usd",
  rail: "rtp",          // falls back to FedNow, then ACH
}, { idempotencyKey: "ord_9021" });

console.log(transfer.status);`,
    python: `import os
from ledgerline import Ledgerline

ll = Ledgerline(api_key=os.environ["LEDGERLINE_KEY"])

transfer = ll.transfers.create(
    source="acct_merchant_escrow",
    destination="acct_payout_4417",
    amount=12480,          # minor units
    currency="usd",
    rail="rtp",            # falls back to FedNow, then ACH
    idempotency_key="ord_9021",
)

print(transfer.status)`
  };
  const response = `{
  "id": "txn_01J9X4Q8M2",
  "object": "transfer",
  "status": "settled",
  "amount": 12480,
  "currency": "usd",
  "rail": "rtp",
  "entries": [
    { "debit":  "acct_merchant_escrow", "amount": 12480 },
    { "credit": "acct_payout_4417",     "amount": 12480 }
  ],
  "balanced": true,
  "settled_in_ms": 38
}`;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hl = line => esc(line).replace(/((?<!:)\/\/.*|#.*$)|(&quot;[^&]*&quot;|"[^"]*"|'[^']*')|\b(import|from|const|await|new|true|false|print|console|os)\b|(\b\d+\b)|((?<=\s)-[uHd](?=\s))|(\b[a-z_]+)(?=\()/g,
    (m, c, s, k, n, fl, f, off, str) => {
      if (c) return `<span class="c">${c}</span>`;
      if (s) { return /^\s*:/.test(str.slice(off + m.length)) ? `<span class="key">${s}</span>` : `<span class="s">${s}</span>`; }
      if (k) return `<span class="k">${k}</span>`;
      if (n) return `<span class="n">${n}</span>`;
      if (fl) return `<span class="fl">${fl}</span>`;
      if (f) return `<span class="f">${f}</span>`;
      return m;
    });
  const render = (el, text, cls) => { el.innerHTML = text.split('\n').map(l => `<span class="ln${cls ? ' ' + cls : ''}">${hl(l) || ' '}</span>`).join(''); };
  let lang = 'curl'; const code = $('#codeBlock'), resp = $('#respBlock');
  const setLang = l => { lang = l; $$('.tab').forEach(t => { t.classList.toggle('active', t.dataset.lang === l); t.setAttribute('aria-selected', String(t.dataset.lang === l)); }); render(code, samples[l]); };
  $$('.tab').forEach(t => t.addEventListener('click', () => setLang(t.dataset.lang)));
  setLang('curl');
  render(resp, response, 'rl');
  const status = $('#respStatus'), foot = $('#respFoot'), send = $('#sendBtn');
  let sending = false;
  const sendReq = () => {
    if (sending) return; sending = true;
    const lines = $$('.ln', resp);
    lines.forEach(l => l.classList.remove('in'));
    foot.innerHTML = '&nbsp;'; status.className = 'status mono wait'; status.textContent = 'sending…';
    const reveal = () => {
      status.className = 'status mono ok'; status.textContent = '201 Created';
      if (isStatic()) { lines.forEach(l => l.classList.add('in')); foot.textContent = '✓ ledger balanced · settled in 38 ms'; sending = false; return; }
      lines.forEach((l, i) => setTimeout(() => l.classList.add('in'), i * 55));
      setTimeout(() => { foot.textContent = '✓ ledger balanced · settled in 38 ms'; sending = false; }, lines.length * 55 + 100);
    };
    isStatic() ? reveal() : setTimeout(reveal, 650);
  };
  send.addEventListener('click', sendReq);
  if (hasIO) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { setTimeout(sendReq, 900); o.disconnect(); } }, { threshold: 0.55 }).observe($('.resp'));
  else $$('.ln', resp).forEach(l => l.classList.add('in'));
  $('#copyBtn').addEventListener('click', e => {
    const b = e.currentTarget;
    (navigator.clipboard ? navigator.clipboard.writeText(samples[lang]) : Promise.reject()).then(() => { b.textContent = 'Copied'; }, () => { b.textContent = 'Press ⌘C'; });
    setTimeout(() => b.textContent = 'Copy', 1600);
  });

  /* ---------- uptime bars + latency ---------- */
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bars = $('#bars'); const barsTip = $('#barsTip');
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today.getTime() - (89 - i) * 864e5);
    const deg = i === 23 || i === 61;
    const el = document.createElement('i'); el.style.setProperty('--k', i);
    if (deg) el.className = 'deg';
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    el.dataset.t = deg ? `${label} · degraded: webhook delivery delayed up to 4 min (resolved)` : `${label} · operational`;
    bars.appendChild(el);
  }
  bars.addEventListener('pointerover', e => { if (e.target.dataset && e.target.dataset.t) barsTip.textContent = e.target.dataset.t; });
  bars.addEventListener('pointerleave', () => barsTip.textContent = 'Hover a day');
  const lat = $('#latSvg'); const N = 60;
  const pts = (base, amp, spike) => Array.from({ length: N }, (_, i) => {
    let v = base + (rnd() - 0.5) * amp + Math.sin(i / 5) * amp * 0.25; if (spike && i === 38) v += amp * 2.2; return v;
  });
  const p50 = pts(14, 3, false), p99 = pts(36, 7, true);
  const toPath = (a, lo, hi) => a.map((v, i) => `${i ? 'L' : 'M'}${(i / (N - 1) * 600).toFixed(1)} ${(130 - (v - lo) / (hi - lo) * 115).toFixed(1)}`).join(' ');
  $('#latP99').setAttribute('d', toPath(p99, 0, 56)); $('#latP50').setAttribute('d', toPath(p50, 0, 56));
  $('#latArea').setAttribute('d', toPath(p50, 0, 56) + ' L600 140 L0 140Z');
  $$('#latP99,#latP50').forEach(p => p.setAttribute('pathLength', '1'));
  if (hasIO) {
    const vo = new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } }), { threshold: 0.4 });
    vo.observe(bars); vo.observe(lat);
  }

  /* ---------- testimonials ---------- */
  const stories = [
    { q: '“We deleted a reconciliation team’s worth of cron jobs in the first month. The ledger is the source of truth now, and finance finally believes it.”', n: 'Maya Rosen', r: 'VP Engineering, Northwind Pay', a: 'MR', m: '11 weeks → 9 days', l: 'to launch instant payouts' },
    { q: '“Idempotency and webhooks that just work meant our on-call stopped dreaming about duplicate transfers. We’ve moved nine figures a day without a single stuck payment.”', n: 'Daniel Okafor', r: 'Head of Platform, Kestrel', a: 'DO', m: '0 duplicate transfers', l: 'across 14 months in production' },
    { q: '“Our auditors asked for point-in-time balances for every account. With Ledgerline that was a query, not a project.”', n: 'Ines Duarte', r: 'CTO, Halcyon', a: 'ID', m: '3 weeks → 1 afternoon', l: 'to produce a SOC 2 evidence set' }
  ];
  const pb = $('#proofBody'), ptbs = $$('.ptb');
  let pi = 0, pTimer = 0;
  const showStory = i => {
    pi = i; const s = stories[i];
    ptbs.forEach((b, k) => { b.classList.toggle('active', k === i); b.setAttribute('aria-selected', String(k === i)); });
    $('#pQuote').textContent = s.q; $('#pName').textContent = s.n; $('#pRole').textContent = s.r; $('#pAv').textContent = s.a; $('#pMetric').textContent = s.m; $('#pMetricLabel').textContent = s.l;
    pb.classList.remove('swap'); void pb.offsetWidth; if (!isStatic()) pb.classList.add('swap');
  };
  const autoStory = () => { clearInterval(pTimer); if (!isStatic()) pTimer = setInterval(() => showStory((pi + 1) % 3), 7500); };
  ptbs.forEach((b, i) => b.addEventListener('click', () => { showStory(i); autoStory(); }));
  $('.proof').addEventListener('pointerenter', () => clearInterval(pTimer));
  $('.proof').addEventListener('pointerleave', autoStory);
  if (hasIO) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { autoStory(); o.disconnect(); } }, { threshold: 0.5 }).observe($('.proof'));

  /* ---------- pricing ---------- */
  const sw2 = $('#billSwitch'), gp = $('#growthPrice'), vol = $('#vol'), volOut = $('#volOut'), estOut = $('#estOut'), estNote = $('#estNote');
  let annual = false;
  const volFrom = v => { const raw = Math.pow(10, 4 + (v / 100) * 3.7); const step = raw < 1e5 ? 1e3 : raw < 1e6 ? 1e4 : raw < 1e7 ? 1e5 : 1e6; return Math.round(raw / step) * step; };
  const tween = (el, from, to, cb) => {
    if (isStatic()) { cb(to); return; }
    const t0 = performance.now(); const step = t => { const p = clamp((t - t0) / 500, 0, 1), e = 1 - Math.pow(1 - p, 3); cb(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  let shownGrowth = 499;
  const calc = () => {
    const v = volFrom(+vol.value); volOut.textContent = v.toLocaleString('en-US');
    vol.style.setProperty('--p', vol.value + '%');
    const base = annual ? 399 : 499; let cost, note;
    if (v <= 10000) { cost = 0; note = 'Fits the free Developer sandbox. Go live whenever you’re ready.'; }
    else if (v > 20e6) { cost = null; note = 'At this scale, Enterprise pricing is volume-based. Talk to engineering.'; }
    else { cost = base + Math.max(0, v - 1e6) * 0.0006; note = `Growth plan, billed ${annual ? 'annually' : 'monthly'}${v > 1e6 ? ' · includes overage at $0.0006 per entry' : ' · 1M entries included'}.`; }
    estNote.textContent = note;
    if (cost === null) estOut.textContent = 'Custom'; else estOut.textContent = cost === 0 ? '$0' : '$' + Math.round(cost).toLocaleString('en-US');
  };
  vol.addEventListener('input', calc);
  sw2.addEventListener('click', () => {
    annual = !annual; sw2.setAttribute('aria-checked', String(annual));
    $('#bMo').classList.toggle('on', !annual); $('#bYr').classList.toggle('on', annual);
    const to = annual ? 399 : 499; tween(gp, shownGrowth, to, v => { gp.textContent = Math.round(v); }); shownGrowth = to; calc();
  });
  $('#bYr').addEventListener('click', () => { if (!annual) sw2.click(); });
  $('#bMo').addEventListener('click', () => { if (annual) sw2.click(); });
  calc();

  /* ---------- signup ---------- */
  const form = $('#signup'), email = $('#email'), msg = $('#formMsg'), field = $('.field', form);
  const okMsg = msg.textContent;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      msg.textContent = 'Enter a valid work email, like you@company.com'; msg.classList.add('err');
      field.classList.remove('err'); void field.offsetWidth; field.classList.add('err'); email.focus(); return;
    }
    form.hidden = true; $('#doneMail').textContent = v; $('#done').hidden = false; $('#done').scrollIntoView({ block: 'nearest' });
  });
  email.addEventListener('input', () => { msg.textContent = okMsg; msg.classList.remove('err'); field.classList.remove('err'); });
})();
