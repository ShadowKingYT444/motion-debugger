/* Ledgerline page logic. Loads before motion-kit.js so the DOM it builds is picked up by the kit's reveals.
 * Everything here is illustrative: no network calls, no real keys. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 900px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);

  /* number roll: tween a value into a callback */
  const rolls = new WeakMap();
  function roll(el, to, { ms = 420, digits = 2, prefix = '', from } = {}) {
    const cur = rolls.get(el) ?? { v: from ?? to, raf: 0 };
    cancelAnimationFrame(cur.raf);
    const start = cur.v, t0 = performance.now();
    const write = (v) => { el.textContent = prefix + fmt(v, digits); };
    if (reduce.matches || ms === 0) { cur.v = to; write(to); rolls.set(el, cur); return; }
    const step = (now) => {
      const t = clamp((now - t0) / ms);
      cur.v = start + (to - start) * easeOut(t);
      write(cur.v);
      if (t < 1) cur.raf = requestAnimationFrame(step); else cur.v = to;
    };
    cur.raf = requestAnimationFrame(step);
    rolls.set(el, cur);
  }

  function onceInView(el, fn, margin = '0px 0px -10% 0px') {
    if (!el) return;
    if (reduce.matches || !('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold: 0.12, rootMargin: margin });
    io.observe(el);
    addEventListener('load', () => setTimeout(() => { if (el.getBoundingClientRect().bottom < 0) { io.disconnect(); fn(); } }, 400));
  }

  /* ------------------------------------------------------------------
     1. Hero journal: entries post in debit/credit pairs, newest on top
     ------------------------------------------------------------------ */
  const TX = [
    ['wallet:ana.ortiz', 'settle:marlow-books', 'Invoice 2291', 240.00],
    ['card:kestrel-4417', 'payout:plinth-payroll', 'Payroll batch 77', 8920.00],
    ['ops:tidewater-fleet', 'payout:carrier-0912', 'Load 5531 payout', 1310.00],
    ['wallet:li.huang', 'settle:harbor-coffee', 'Order 88123', 18.75],
    ['float:sepa-fra', 'wallet:noor.haddad', 'SEPA top-up', 500.00],
    ['wallet:jonas.k', 'fees:platform', 'Platform fee', 2.40],
    ['settle:marlow-books', 'payout:bank-ach', 'Daily sweep', 12480.55],
    ['hold:rental-9204', 'settle:driveshare', 'Hold capture', 312.00],
    ['wallet:sam.idowu', 'wallet:dana.okafor', 'Peer transfer', 64.00],
    ['fx:eur-usd-pool', 'wallet:tomas.weiss', 'EUR to USD', 1100.00],
    ['card:kestrel-9921', 'settle:bluebird-air', 'Booking LL4K', 623.40],
    ['wallet:priya.raman', 'settle:marlow-books', 'Invoice 2304', 1850.00],
  ];
  const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const refFor = (i) => { let s = (i + 1) * 2654435761 >>> 0, out = ''; for (let k = 0; k < 6; k++) { out += ALPHA[s % 32]; s = (Math.imul(s, 1103515245) + 12345) >>> 0; s = ((s >>> 3) ^ s) >>> 0; } return 'txn_' + out; };
  const clock = (d) => d.toISOString().slice(11, 23);

  const jBody = $('#journal');
  if (jBody) {
    const sumDr = $('#jSumDr'), sumCr = $('#jSumCr'), bal = $('#jBal');
    let total = 18402317.55, idx = 0, pairs = [], timer = 0;

    const row = (cls, cells) => { const d = document.createElement('div'); d.className = 'j-row' + (cls ? ' ' + cls : ''); d.innerHTML = cells; return d; };
    function build(tx, i, when) {
      const [dr, cr, memo, amt] = tx, a = fmt(amt), ref = refFor(i), time = clock(when);
      const pair = document.createElement('div'); pair.className = 'j-pair';
      pair.append(
        row('', `<span class="time">${time}</span><span class="ref">${ref}</span><span class="acct">${dr}</span><span class="memo">${memo}</span><span class="dr">${a}</span><span></span>`),
        row('cr', `<span class="time"></span><span class="ref"></span><span class="acct">${cr}</span><span class="memo"></span><span></span><span class="cr-amt">${a}</span>`)
      );
      return pair;
    }
    const place = () => pairs.forEach((p, i) => { p.style.setProperty('--slot', i); p.classList.toggle('is-out', i >= 3); });

    // Seed three earlier postings so the journal is full from the first frame.
    const now = Date.now();
    [9, 10, 11].forEach((t, k) => {
      const p = build(TX[t], 100 + k, new Date(now - (3 - k) * 2600));
      jBody.prepend(p); pairs.unshift(p);
    });
    place();

    function post(instant) {
      const tx = TX[idx % TX.length];
      const pair = build(tx, idx, new Date());
      idx++;
      pair.style.setProperty('--slot', -1); pair.style.opacity = '0'; pair.style.transition = 'none';
      jBody.prepend(pair); pairs.unshift(pair);
      void pair.offsetWidth;
      pair.style.transition = ''; pair.style.opacity = '';
      place();
      if (!instant) pair.classList.add('is-new');
      while (pairs.length > 4) { const old = pairs.pop(); setTimeout(() => old.remove(), 600); }
      total += tx[3];
      roll(sumDr, total, { ms: 600 }); roll(sumCr, total, { ms: 600 });
      bal.classList.remove('tick'); void bal.offsetWidth; bal.classList.add('tick');
    }
    rolls.set(sumDr, { v: total, raf: 0 }); rolls.set(sumCr, { v: total, raf: 0 });

    let visible = true, started = false;
    const run = () => { clearInterval(timer); if (!started || reduce.matches || !visible || document.hidden) return; timer = setInterval(() => post(), 2600); };
    if (!reduce.matches) {
      setTimeout(() => { started = true; post(); run(); }, 5200);
      if ('IntersectionObserver' in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; run(); }).observe($('.journal'));
      document.addEventListener('visibilitychange', run);
    }
  }

  /* ------------------------------------------------------------------
     2. Product: the signature pinned scene (scroll progress -> steps)
     ------------------------------------------------------------------ */
  const flow = $('#product');
  if (flow) {
    const machine = $('#machine'), steps = $$('.step', flow);
    const balA = $('#balA'), balB = $('#balB'), clk = $('#clock'), entSum = $('#entSum'), hookText = $('#hookText');
    const sums = $$('span', entSum);
    let cur = 0;
    const setSums = (v) => { sums[0].textContent = `\u03A3 debit ${v}`; sums[1].textContent = `\u03A3 credit ${v}`; };
    function setStep(n, instant) {
      if (n === cur) return;
      const prev = cur; cur = n;
      machine.dataset.step = n;
      steps.forEach((s) => s.classList.toggle('is-active', +s.dataset.step === n));
      setSums(n >= 2 ? '240.00' : '89.90');
      const ms = instant ? 0 : 520;
      if (n >= 3) {
        roll(balA, 1020.00, { ms, from: 1260.00 }); roll(balB, 8652.50, { ms, from: 8412.50 });
        hookText.innerHTML = 'evt_41d transfer.posted &rarr; 200 OK in 38 ms';
      } else if (prev >= 3 || prev === 0) {
        roll(balA, 1260.00, { ms: instant ? 0 : 320, from: 1020.00 }); roll(balB, 8412.50, { ms: instant ? 0 : 320, from: 8652.50 });
        hookText.innerHTML = 'evt_41c transfer.posted &rarr; 200 OK in 36 ms';
      }
    }
    let queued = false;
    function update() {
      queued = false;
      if (narrow.matches || reduce.matches) return;
      const r = flow.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
      machine.style.setProperty('--p', p.toFixed(4));
      clk.textContent = 4 + Math.round(34 * clamp(p / 0.88));
      setStep(p < 0.3 ? 1 : p < 0.62 ? 2 : 3);
    }
    const kick = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    function mode() {
      if (narrow.matches || reduce.matches) {
        // Stacked, static layout: show the finished transfer.
        cur = -1; setStep(3, true);
        machine.style.setProperty('--p', 1); clk.textContent = '38';
        steps.forEach((s) => s.classList.add('is-active'));
      } else { cur = -1; setStep(1, true); update(); }
    }
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
    narrow.addEventListener('change', mode); reduce.addEventListener('change', mode);
    mode();
  }

  /* ------------------------------------------------------------------
     3. API: language tabs, highlighted code, simulated response
     ------------------------------------------------------------------ */
  const SAMPLES = {
    curl: `curl https://api.ledgerline.dev/v1/transfers \\
  -H "Authorization: Bearer lk_test_51Jx9" \\
  -H "Idempotency-Key: 7f3c-9a1e" \\
  -d from=acct_ana_wallet \\
  -d to=acct_marlow_settle \\
  -d amount=24000 \\
  -d currency=usd`,
    node: `import Ledgerline from "@ledgerline/node";
const ll = new Ledgerline(process.env.LEDGERLINE_KEY);
const transfer = await ll.transfers.create({
  from: "acct_ana_wallet",
  to: "acct_marlow_settle",
  amount: 24000, // minor units
  currency: "usd",
}, { idempotencyKey: "7f3c-9a1e" });`,
    python: `import os
from ledgerline import Ledgerline
ll = Ledgerline(api_key=os.environ["LEDGERLINE_KEY"])
transfer = ll.transfers.create(
    from_account="acct_ana_wallet",
    to_account="acct_marlow_settle",
    amount=24000,  # minor units
    currency="usd",
    idempotency_key="7f3c-9a1e",
)`,
    go: `client := ledgerline.NewClient(os.Getenv("LEDGERLINE_KEY"))
transfer, err := client.Transfers.Create(ctx, &ledgerline.TransferParams{
    From:           "acct_ana_wallet",
    To:             "acct_marlow_settle",
    Amount:         24000, // minor units
    Currency:       "usd",
    IdempotencyKey: "7f3c-9a1e",
})`,
  };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const TOK = /(\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\])*")|(\b\d[\d_.]*\b)|(\b(?:import|from|const|await|new|def|nil|err|true|false|package|return|curl)\b)|((?<=\s)-[A-Za-z]\b)/g;
  function highlight(src) {
    let out = '', last = 0;
    for (const m of src.matchAll(TOK)) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 't-c' : m[2] ? 't-s' : m[3] ? 't-n' : 't-k';
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  const tabs = $('#tabs'), code = $('#codeBody');
  if (tabs && code) {
    const ink = $('.tab-ink', tabs), buttons = $$('[role=tab]', tabs);
    const moveInk = (tab) => { ink.style.setProperty('--x', tab.offsetLeft + 'px'); ink.style.setProperty('--sx', (tab.offsetWidth / 100).toFixed(4)); };
    const show = (lang, animate) => {
      const paint = () => { code.innerHTML = highlight(SAMPLES[lang]); code.classList.remove('swap'); };
      if (animate && !reduce.matches) { code.classList.add('swap'); setTimeout(paint, 150); } else paint();
    };
    buttons.forEach((tab) => tab.addEventListener('click', () => {
      if (tab.getAttribute('aria-selected') === 'true') return;
      buttons.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      moveInk(tab); show(tab.dataset.lang, true);
    }));
    tabs.addEventListener('keydown', (e) => {
      const i = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (next >= 0 && next < buttons.length) { buttons[next].focus(); buttons[next].click(); }
    });
    show('curl', false);
    const place = () => moveInk($('[aria-selected=true]', tabs));
    place(); addEventListener('load', place); addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

    const send = $('#sendBtn'), resp = $('#resp'), respTime = $('#respTime'), respStatus = $('#respStatus');
    const lines = $$('.rl', resp); lines.forEach((l, i) => l.style.setProperty('--k', i));
    let first = true;
    send.addEventListener('click', () => {
      resp.classList.remove('play'); void resp.offsetWidth; resp.classList.add('play');
      respStatus.textContent = '201 Created';
      const ms = 38 + Math.round(Math.random() * 8);
      if (reduce.matches) respTime.textContent = ms + ' ms';
      else { const t0 = performance.now(); const tick = (n) => { const t = clamp((n - t0) / 520); respTime.textContent = Math.round(4 + (ms - 4) * easeOut(t)) + ' ms'; if (t < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
      if (first) { send.firstChild.textContent = 'Send again '; first = false; }
    });
  }

  /* ------------------------------------------------------------------
     4. Reliability: uptime strip, latency histogram
     ------------------------------------------------------------------ */
  const up = $('#uptime');
  if (up) {
    for (let i = 0; i < 90; i++) { const s = document.createElement('span'); s.style.setProperty('--i', i); if (i === 61) s.className = 'warn'; up.append(s); }
    onceInView(up, () => up.classList.add('seen'));
  }
  const hist = $('#hist');
  if (hist) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, a, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); (parent || hist).append(e); return e; };
    const X0 = 20, W = 520, BASE = 206, H = 150, BINS = 26, MAXMS = 260, bw = W / BINS;
    const mu = Math.log(38), sg = 0.5;
    const pdf = (x) => Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * sg * sg)) / (x * sg);
    const dens = Array.from({ length: BINS }, (_, i) => pdf(i * 10 + 5));
    const mx = Math.max(...dens), heights = dens.map((d) => Math.max(2, (d / mx) * H));
    heights.forEach((h, i) => {
      const r = el('rect', { x: X0 + i * bw + 1.5, y: BASE - h, width: bw - 3, height: h }); r.style.setProperty('--i', i);
      if (i * 10 >= 120) r.setAttribute('class', 'tail');
    });
    el('line', { x1: X0, x2: X0 + W, y1: BASE, y2: BASE, class: 'axis' });
    [0, 50, 100, 150, 200, 250].forEach((v) => { const t = el('text', { x: X0 + (v / MAXMS) * W, y: 228, 'text-anchor': 'middle', class: 'tick-l' }); t.textContent = v + (v === 250 ? ' ms' : ''); });
    [[38, 'p50', '38 ms'], [121, 'p99', '121 ms'], [178, 'p99.9', '178 ms']].forEach(([ms, name, val]) => {
      const x = X0 + (ms / MAXMS) * W, bin = Math.min(BINS - 1, Math.floor(ms / 10)), top = BASE - heights[bin];
      el('line', { x1: x, x2: x, y1: 40, y2: top - 2, class: 'mark' });
      const t = el('text', { x, y: 14, 'text-anchor': 'middle' });
      const a = document.createElementNS(NS, 'tspan'); a.textContent = name; a.setAttribute('font-weight', '600');
      const b = document.createElementNS(NS, 'tspan'); b.textContent = val; b.setAttribute('x', x); b.setAttribute('dy', '15');
      t.append(a, b);
    });
    onceInView(hist, () => hist.classList.add('seen'));
  }

  /* ------------------------------------------------------------------
     5. Pricing: slider -> monthly estimate per plan
     ------------------------------------------------------------------ */
  const vol = $('#vol');
  if (vol) {
    const out = $('#volOut'), tiers = $$('.tier');
    const estB = $('#estBuild'), estS = $('#estScale'), estE = $('#estEnt'), estESub = $('#estEntSub');
    const LO = 3, SPAN = Math.log10(50e6) - 3;
    const toN = (t) => { const raw = Math.pow(10, LO + (t / 100) * SPAN); const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1); return Math.max(1000, Math.round(raw / mag) * mag); };
    const label = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n);
    const money = (v) => '$' + fmt(v, 0);
    const ticks = $('.est-ticks');
    if (ticks) $$('span', ticks).forEach((s, i) => { const n = [1e3, 1e4, 1e5, 1e6, 1e7, 5e7][i]; const pct = (Math.log10(n) - LO) / SPAN; s.style.left = `calc(11px + (100% - 22px) * ${pct.toFixed(4)})`; });
    const cache = new Map();
    const setMoney = (el, v, instant) => {
      const cur = cache.get(el) ?? v; cache.set(el, v);
      if (instant) { el.textContent = money(v); return; }
      const t0 = performance.now(), ms = 420;
      cancelAnimationFrame(el._raf);
      const step = (now) => { const t = clamp((now - t0) / ms); el.textContent = money(cur + (v - cur) * easeOut(t)); if (t < 1) el._raf = requestAnimationFrame(step); };
      if (reduce.matches) el.textContent = money(v); else el._raf = requestAnimationFrame(step);
    };
    function update(instant) {
      const t = parseFloat(vol.value), n = toN(t);
      vol.style.setProperty('--fill', t + '%');
      out.textContent = label(n);
      const build = Math.max(0, n - 1000) * 0.04, scale = 1200 + Math.max(0, n - 500000) * 0.012;
      const ent = n >= 5e6 ? n * 0.004 : null;
      setMoney(estB, build, instant); setMoney(estS, scale, instant);
      if (ent !== null) { setMoney(estE, ent, instant); estESub.textContent = 'indicative, annual contract'; }
      else { cancelAnimationFrame(estE._raf); cache.delete(estE); estE.textContent = 'Custom'; estESub.textContent = 'quote above 5M a month'; }
      const best = ent !== null && ent < Math.min(build, scale) ? 'enterprise' : build <= scale ? 'build' : 'scale';
      tiers.forEach((el) => el.classList.toggle('is-best', el.dataset.tier === best));
    }
    vol.addEventListener('input', () => update(false));
    update(true);
  }

  /* ------------------------------------------------------------------
     6. Sign-up: generate a sandbox key in the browser (demo only)
     ------------------------------------------------------------------ */
  const form = $('#signup');
  if (form) {
    const email = $('#email'), msg = $('#signupMsg'), box = $('#keybox'), keyText = $('#keyText'), copy = $('#copyKey');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = email.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) {
        msg.textContent = 'Enter a work email address, for example you@company.com.'; msg.classList.add('err'); email.setAttribute('aria-invalid', 'true'); email.focus(); return;
      }
      msg.classList.remove('err'); email.removeAttribute('aria-invalid');
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const bytes = new Uint8Array(24); (crypto || window.crypto).getRandomValues(bytes);
      const key = 'lk_test_' + [...bytes].map((b) => chars[b % chars.length]).join('');
      box.hidden = false; keyText.textContent = key;
      if (window.motionKit && !reduce.matches) window.motionKit.scramble(keyText);
      msg.textContent = `Sandbox ready for ${v}. Export it as LEDGERLINE_KEY and post your first transfer. Demo only: nothing was sent.`;
      copy.textContent = 'Copy';
    });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(keyText.textContent); copy.textContent = 'Copied'; }
      catch { const r = document.createRange(); r.selectNodeContents(keyText); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = 'Selected'; }
    });
  }

  /* ------------------------------------------------------------------
     0. Start the motion kit once the fonts are in, so split headlines
        and reveals measure real glyphs and nothing shifts afterwards.
     ------------------------------------------------------------------ */
  let booted = false;
  const boot = () => {
    if (booted) return; booted = true;
    const s = document.createElement('script');
    s.src = 'motion-kit.js';
    document.body.append(s);
  };
  const fontSpecs = ['extra-condensed 900 1em Archivo', '800 1em Archivo', '400 1em "IBM Plex Sans"', '600 1em "IBM Plex Sans"', '500 1em "IBM Plex Sans"', '400 1em "IBM Plex Mono"', '500 1em "IBM Plex Mono"'];
  if (document.fonts && document.fonts.load) {
    Promise.race([Promise.all(fontSpecs.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]).then(boot, boot);
  } else boot();
  setTimeout(() => { if (!window.motionKit) document.documentElement.classList.add('mk-late'); }, 4500);

  /* ------------------------------------------------------------------
     7. Navigation: mobile menu, anchor scrolling
     ------------------------------------------------------------------ */
  const nav = $('#nav'), toggle = $('#navToggle');
  if (nav && toggle) {
    const setOpen = (open) => { nav.classList.toggle('nav-open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.firstElementChild.textContent = open ? 'Close' : 'Menu'; };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('nav-open')));
    const start = $('#start');
    const mark = () => { if (!start) return; const r = start.getBoundingClientRect(); nav.classList.toggle('on-red', r.top < 40 && r.bottom > 40); };
    addEventListener('scroll', mark, { passive: true }); mark();
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (nav) { nav.classList.remove('nav-open'); toggle && toggle.setAttribute('aria-expanded', 'false'); toggle && (toggle.firstElementChild.textContent = 'Menu'); }
    target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', id);
  });
})();
