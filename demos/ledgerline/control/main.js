/* Ledgerline — interactions & motion
   Progressive enhancement: content is readable without JS; GSAP/Lenis are optional. */
(() => {
  'use strict';
  window.__ll = 1;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let motionPref = !rmq.matches;
  const motion = () => motionPref;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const motionListeners = [];
  const onMotion = (fn) => motionListeners.push(fn);

  // seeded PRNG for stable "historical" data
  function mulberry(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  if (!motionPref) html.classList.add('motion-off');

  /* ------------------------------------------------------------
     Smooth scroll (Lenis) — optional
  ------------------------------------------------------------ */
  let lenis = null;
  if (window.Lenis && motionPref) {
    try {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } catch (e) { lenis = null; }
  }

  /* ------------------------------------------------------------
     Split headings into masked words
  ------------------------------------------------------------ */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi';
            wi.style.setProperty('--i', i++); wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    };
    walk(el);
  }
  const heroTitle = $('#heroTitle');
  if (heroTitle) heroTitle.dataset.d = '150';
  $$('.split').forEach(splitWords);

  /* ------------------------------------------------------------
     View-triggered reveals
  ------------------------------------------------------------ */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 });
  $$('[data-reveal], .split, [data-inview]').forEach((el) => {
    if (el.dataset.d) el.style.setProperty('--d', el.dataset.d + 'ms');
    revealIO.observe(el);
  });

  function onView(el, fn, margin = '0px 0px -12% 0px') {
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.disconnect(); } });
    }, { rootMargin: margin, threshold: 0.05 });
    io.observe(el);
  }

  /* ------------------------------------------------------------
     Nav, progress, wordmark
  ------------------------------------------------------------ */
  const nav = $('#nav');
  const bar = $('#progressBar');
  const wordmark = $('#wordmark');
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 20);
    if (!nav.classList.contains('open')) {
      if (y > lastY + 6 && y > 480) nav.classList.add('hide');
      else if (y < lastY - 6 || y < 480) nav.classList.remove('hide');
    }
    lastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    if (wordmark) {
      const r = wordmark.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp(1 - (r.top - vh * 0.25) / (vh * 0.75), 0, 1);
      wordmark.style.setProperty('--fill', (p * 100).toFixed(1) + '%');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // active section link
  const links = $$('#navLinks a');
  const secIO = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['platform', 'api', 'reliability', 'security', 'customers', 'pricing'].forEach((id) => { const s = document.getElementById(id); if (s) secIO.observe(s); });

  // mobile menu
  const burger = $('#burger');
  function closeMenu() { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.remove('hide');
  });

  // anchor links
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(t, { offset: id === '#top' ? 0 : -56, duration: 1.5 });
    else t.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'start' });
  });

  /* ------------------------------------------------------------
     Global motion toggle
  ------------------------------------------------------------ */
  const mBtn = $('#motionToggle');
  function setMotion(on) {
    motionPref = on;
    html.classList.toggle('motion-off', !on);
    mBtn.setAttribute('aria-label', on ? 'Pause site animations' : 'Resume site animations');
    mBtn.setAttribute('aria-pressed', String(!on));
    motionListeners.forEach((fn) => fn(on));
  }
  mBtn.addEventListener('click', () => setMotion(!motionPref));
  mBtn.setAttribute('aria-pressed', String(!motionPref));
  rmq.addEventListener && rmq.addEventListener('change', (e) => setMotion(!e.matches));

  /* ------------------------------------------------------------
     Pointer effects: hero glow, magnetic buttons, spotlight cards
  ------------------------------------------------------------ */
  const hero = $('.hero');
  if (finePointer && hero) {
    let tx = 50, ty = 30, cx = 50, cy = 30, glowActive = false;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      if (!glowActive) { glowActive = true; requestAnimationFrame(glowLoop); }
    });
    function glowLoop() {
      cx = lerp(cx, tx, 0.07); cy = lerp(cy, ty, 0.07);
      hero.style.setProperty('--mx', cx.toFixed(2) + '%');
      hero.style.setProperty('--my', cy.toFixed(2) + '%');
      if (Math.abs(cx - tx) + Math.abs(cy - ty) > 0.05 && motion()) requestAnimationFrame(glowLoop); else glowActive = false;
    }
  }
  if (finePointer) {
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        if (!motion()) return;
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + (dx * 0.18).toFixed(1) + 'px,' + (dy * 0.28).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }
  $$('.scard').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--x', (e.clientX - r.left) + 'px');
      c.style.setProperty('--y', (e.clientY - r.top) + 'px');
    });
  });

  /* ------------------------------------------------------------
     Count-ups
  ------------------------------------------------------------ */
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  $$('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const sep = el.dataset.sep === '1';
    const pre = el.dataset.pre || '';
    const render = (v) => {
      el.textContent = pre + (sep ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec));
    };
    if (to === 0) { render(0); return; }
    onView(el, () => {
      if (!motion()) { render(to); return; }
      const t0 = performance.now(), dur = 1900;
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        render(to * easeOutExpo(p));
        if (p < 1) requestAnimationFrame(step); else render(to);
      };
      requestAnimationFrame(step);
    });
  });

  /* ------------------------------------------------------------
     Hero console: live ledger
  ------------------------------------------------------------ */
  const flowSvg = $('#flowSvg');
  const streamList = $('#streamList');
  const flowBtn = $('#flowToggle');
  const flowLabel = $('#flowToggleLabel');
  const flow = (() => {
    const paths = { A: $('#pA'), B: $('#pB'), D: $('#pD'), E: $('#pE') };
    const len = {};
    Object.keys(paths).forEach((k) => { len[k] = paths[k].getTotalLength(); });
    const g = $('#particles');
    const bal = { W: 2314684.12, C: 904118.5, F: 41882.4, B: 1904220.0 };
    const els = { W: $('#bW'), C: $('#bC'), F: $('#bF'), B: $('#bB') };
    const nodes = { W: $('#nW'), C: $('#nC'), F: $('#nF'), B: $('#nB'), L: $('#nL') };
    const ring = $('#ring');
    const statEntries = $('#statEntries'), statLat = $('#statLat'), statReplay = $('#statReplay');
    let entries = 4812330, replays = 12904, latTimer = 0, statTimer = 0;
    let running = false, visible = true, active = false, last = 0, spawnIn = 300;
    const parts = [];
    const AMOUNTS = [12.4, 48, 120, 260.75, 89.99, 15, 640.25, 1840, 32.1, 75, 2480, 9.5];
    const KIND = {
      A: [['Wallet payout', 'wallets → bank'], ['P2P transfer', 'wallets → bank'], ['Bill pay', 'wallets → bank']],
      B: [['Card capture', 'cards → wallets'], ['Top-up', 'cards → wallets'], ['Marketplace sale', 'cards → wallets']]
    };

    function setBal(k) { els[k].textContent = '$' + fmt(bal[k]); flash(nodes[k]); }
    function flash(n) { n.classList.add('flash'); setTimeout(() => n.classList.remove('flash'), 420); }
    function pulse() {
      flash(nodes.L);
      ring.classList.remove('go'); void ring.getBBox(); ring.classList.add('go');
    }
    function mkParticle(k, color, r, onArrive) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'p'); c.setAttribute('r', r); c.setAttribute('fill', 'currentColor');
      c.style.color = color; g.appendChild(c);
      const p = { k, t: 0, dur: rand(900, 1300), el: c, onArrive };
      parts.push(p); return p;
    }
    function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function addRow(txn, animate) {
      const li = document.createElement('li');
      if (animate) li.className = 'new';
      const sign = txn.src === 'B' ? '+' : '−';
      li.innerHTML =
        '<span class="id mono">' + txn.id + '</span>' +
        '<span class="rt"><b>' + txn.kind + '</b><i>' + txn.route + '</i></span>' +
        '<span class="amt mono ' + (txn.src === 'B' ? 'cr' : 'dr') + '">' + sign + fmt(txn.amt) + '</span>' +
        '<span class="ms mono">' + txn.ms + 'ms</span>';
      streamList.prepend(li);
      while (streamList.children.length > 7) streamList.lastElementChild.remove();
    }
    function mkTxn() {
      const src = Math.random() < 0.52 ? 'B' : 'A';
      const [kind, route] = pick(KIND[src]);
      const base = pick(AMOUNTS);
      const amt = +(base * rand(0.9, 1.1)).toFixed(2);
      return { id: 'txn_' + Math.random().toString(36).slice(2, 8), src, kind, route, amt, ms: Math.round(rand(11, 36)) };
    }
    function launch() {
      const t = mkTxn();
      const fee = +(t.amt * 0.015).toFixed(2);
      addRow(t, true);
      mkParticle(t.src === 'B' ? 'B' : 'A', t.src === 'B' ? '#7aa8ff' : '#ff6f4e', 4.2, () => {
        bal[t.src === 'B' ? 'C' : 'W'] -= t.amt; setBal(t.src === 'B' ? 'C' : 'W');
        pulse();
        mkParticle('D', '#d6ff55', 3.2, () => { bal.F += fee; setBal('F'); });
        mkParticle('E', '#6df0c2', 4.2, () => { bal.B += t.amt - fee; setBal('B'); });
      });
    }
    function update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt / p.dur;
        const tt = clamp(p.t, 0, 1);
        const pt = paths[p.k].getPointAtLength(ease(tt) * len[p.k]);
        p.el.setAttribute('cx', pt.x.toFixed(1)); p.el.setAttribute('cy', pt.y.toFixed(1));
        p.el.style.opacity = tt < 0.08 ? tt / 0.08 : tt > 0.92 ? (1 - tt) / 0.08 : 1;
        if (p.t >= 1) { p.el.remove(); parts.splice(i, 1); p.onArrive && p.onArrive(); }
      }
      spawnIn -= dt;
      if (spawnIn <= 0) { launch(); spawnIn = rand(620, 1150); }
      entries += dt * 0.34;
      statTimer += dt;
      if (statTimer > 90) { statTimer = 0; statEntries.textContent = Math.floor(entries).toLocaleString('en-US'); }
      latTimer += dt;
      if (latTimer > 1400) {
        latTimer = 0; statLat.textContent = Math.round(rand(35, 41)) + ' ms';
        if (Math.random() < 0.5) { replays++; statReplay.textContent = replays.toLocaleString('en-US'); }
      }
    }
    function tick(now) {
      const dt = Math.min(now - last, 64); last = now;
      if (running && visible && !document.hidden) { update(dt); requestAnimationFrame(tick); } else active = false;
    }
    function kick() { if (!active && running && visible) { active = true; last = performance.now(); requestAnimationFrame(tick); } }
    function set(on) {
      running = on;
      flowBtn.setAttribute('aria-pressed', String(!on));
      flowBtn.setAttribute('aria-label', on ? 'Pause live ledger animation' : 'Play live ledger animation');
      flowLabel.textContent = on ? 'Pause' : 'Play';
      if (on) kick();
    }
    // seed rows
    for (let i = 0; i < 6; i++) addRow(mkTxn(), false);
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0 }).observe($('#console'));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    return { set, isRunning: () => running };
  })();
  flow.set(motionPref);
  flowBtn.addEventListener('click', () => flow.set(!flow.isRunning()));
  onMotion((on) => flow.set(on));

  /* ------------------------------------------------------------
     Platform story: sticky stage + panes
  ------------------------------------------------------------ */
  (function story() {
    const steps = $$('.step');
    const panes = steps.map((s) => $('.pane', s));
    const stageInner = $('#stageInner');
    const mq = window.matchMedia('(max-width: 899px)');
    let current = -1;
    function place() {
      panes.forEach((p, i) => {
        if (mq.matches) steps[i].appendChild(p); else stageInner.appendChild(p);
      });
      panes.forEach((p) => p.classList.remove('is-active'));
      steps.forEach((s) => s.classList.remove('is-active'));
      current = -1;
      if (!mq.matches) activate(0);
    }
    function activate(i) {
      if (mq.matches) { panes[i].classList.add('is-active'); steps[i].classList.add('is-active'); return; }
      if (i === current) return;
      current = i;
      steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
      panes.forEach((p, j) => p.classList.toggle('is-active', j === i));
    }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        activate(steps.indexOf(e.target));
      });
    }, { rootMargin: mq.matches ? '-10% 0px -25% 0px' : '-42% 0px -50% 0px', threshold: 0 });
    steps.forEach((s) => io.observe(s));
    // robust fallback for stacked (mobile) layout: animate each pane when it scrolls into view
    const paneIO = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting && mq.matches) e.target.classList.add('is-active'); });
    }, { threshold: 0.12 });
    panes.forEach((p) => paneIO.observe(p));
    mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place);
    place();
  })();

  /* ------------------------------------------------------------
     API: tabs, highlighting, send request
  ------------------------------------------------------------ */
  (function api() {
    const CODE = {
      curl:
`curl https://api.ledgerline.dev/v1/transfers \\
  -H "Authorization: Bearer $LEDGERLINE_KEY" \\
  -H "Idempotency-Key: ord_9421_capture" \\
  -d '{
    "source": "acct_customer_8f2a",
    "destination": "acct_platform_float",
    "amount": "120.00",
    "currency": "USD",
    "rail": "rtp",
    "splits": [{ "destination": "acct_fees", "amount": "1.80" }]
  }'`,
      node:
`import Ledgerline from "@ledgerline/node";

const ll = new Ledgerline(process.env.LEDGERLINE_KEY);

const transfer = await ll.transfers.create({
  source: "acct_customer_8f2a",
  destination: "acct_platform_float",
  amount: "120.00",
  currency: "USD",
  rail: "rtp",
  splits: [{ destination: "acct_fees", amount: "1.80" }],
}, { idempotencyKey: "ord_9421_capture" });

console.log(transfer.status); // "posted"`,
      python:
`import os
from ledgerline import Ledgerline

ll = Ledgerline(api_key=os.environ["LEDGERLINE_KEY"])

transfer = ll.transfers.create(
    source="acct_customer_8f2a",
    destination="acct_platform_float",
    amount="120.00",
    currency="USD",
    rail="rtp",
    splits=[{"destination": "acct_fees", "amount": "1.80"}],
    idempotency_key="ord_9421_capture",
)

print(transfer.status)  # "posted"`
    };

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function highlight(line, lang) {
      const comment = lang === 'node' ? '\\/\\/.*' : lang === 'python' ? '#.*' : '(?!)';
      const re = new RegExp(
        '(' + comment + ')|' +                                         // 1 comment
        '("(?:[^"\\\\]|\\\\.)*"(?=\\s*:))|' +                          // 2 json key
        '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)|' + // 3 string
        '(\\b[A-Za-z_]\\w*(?=:\\s))|' +                                // 4 object key
        '(\\b(?:import|from|const|await|new|def|true|false|null|None|True|False|as)\\b)|' + // 5 keyword
        '(\\b\\d+(?:\\.\\d+)?\\b)|' +                                  // 6 number
        '(^curl\\b|\\s-[A-Za-z]\\b)|' +                                // 7 curl / flag
        '(\\b[A-Za-z_]\\w*(?=\\())', 'g');                             // 8 call
      let out = '', i = 0, m;
      while ((m = re.exec(line))) {
        out += esc(line.slice(i, m.index));
        const cls = m[1] ? 'c' : m[2] ? 'p' : m[3] ? 's' : m[4] ? 'p' : m[5] ? 'k' : m[6] ? 'n' : m[7] ? 'k' : 'f';
        out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
        i = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      return out + esc(line.slice(i));
    }
    function render(el, text, lang) {
      el.classList.remove('in');
      el.innerHTML = text.split('\n').map((l, i) => '<span class="ln" style="--i:' + i + '">' + (highlight(l, lang) || ' ') + '</span>').join('');
      void el.offsetWidth;
      el.classList.add('in');
    }

    const req = $('#codeReq'), res = $('#codeRes');
    const tabs = $$('.tab');
    let lang = 'curl', shown = false;
    function show(l) {
      lang = l;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.lang === l)));
      render(req, CODE[l], l);
    }
    // render invisible at first, play on view
    req.innerHTML = CODE.curl.split('\n').map((l, i) => '<span class="ln" style="--i:' + i + '">' + (highlight(l, 'curl') || ' ') + '</span>').join('');
    onView(req, () => { shown = true; show('curl'); }, '0px 0px -15% 0px');
    tabs.forEach((t) => t.addEventListener('click', () => { shown = true; show(t.dataset.lang); }));
    // keyboard arrows on tablist
    $('.tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = tabs.findIndex((t) => t.dataset.lang === lang);
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); n.click();
    });
    // CSS fallback if the reveal never fires
    setTimeout(() => { if (!shown) req.classList.add('in'); }, 6000);

    const copyBtn = $('#copyBtn');
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(CODE[lang]); copyBtn.textContent = 'Copied'; }
      catch (e) { copyBtn.textContent = 'Select & copy'; }
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
    });

    const runBtn = $('#runBtn'), idle = $('#respIdle'), st = $('#respStatus'), lat = $('#respLat');
    let busy = false;
    function respJSON() {
      const id = 'txf_' + Array.from({ length: 10 }, () => 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'[Math.floor(Math.random() * 32)]).join('');
      return [
        '{',
        '  "id": "' + id + '",',
        '  "object": "transfer",',
        '  "status": "posted",',
        '  "amount": "120.00",',
        '  "currency": "USD",',
        '  "rail": "rtp",',
        '  "entries": [',
        '    { "account": "acct_customer_8f2a", "dr": "120.00" },',
        '    { "account": "acct_platform_float", "cr": "118.20" },',
        '    { "account": "acct_fees", "cr": "1.80" }',
        '  ],',
        '  "balanced": true,',
        '  "idempotency_key": "ord_9421_capture",',
        '  "posted_at": "' + new Date().toISOString() + '"',
        '}'
      ].join('\n');
    }
    runBtn.addEventListener('click', () => {
      if (busy) return; busy = true; runBtn.disabled = true;
      idle.style.display = 'none'; res.style.display = 'block'; res.innerHTML = '';
      st.className = 'status wait'; st.lastElementChild.textContent = 'Posting…'; lat.textContent = '';
      const target = Math.round(rand(24, 38));
      const t0 = performance.now(), dur = motion() ? 520 : 10;
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        lat.textContent = Math.round(target * p) + ' ms';
        if (p < 1) requestAnimationFrame(step);
        else {
          st.className = 'status ok'; st.lastElementChild.textContent = '201 Created';
          lat.textContent = target + ' ms';
          render(res, respJSON(), 'json');
          busy = false; runBtn.disabled = false;
        }
      };
      requestAnimationFrame(step);
    });
  })();

  /* ------------------------------------------------------------
     Reliability: uptime bars, latency chart, failover sim
  ------------------------------------------------------------ */
  (function reliability() {
    const up = $('#uptime'), read = $('#upRead');
    const rnd = mulberry(7);
    const days = [];
    const now = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(now); d.setDate(now.getDate() - (89 - i));
      let status = 'ok', pct = 100;
      if (i === 31) { status = 'deg'; pct = 99.982; }
      else if (i === 64) { status = 'deg'; pct = 99.991; }
      else if (rnd() < 0.06) pct = 99.999;
      days.push({ d, status, pct });
      const b = document.createElement('i');
      b.style.setProperty('--i', i);
      if (status === 'deg') b.className = 'deg';
      b.dataset.i = i;
      up.appendChild(b);
    }
    const label = (x) => x.d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + x.pct.toFixed(3) + '% · ' + (x.status === 'deg' ? 'webhook delays, no data loss' : 'no incidents');
    up.addEventListener('pointerover', (e) => {
      const b = e.target.closest('i'); if (!b) return;
      read.innerHTML = '<span>' + label(days[+b.dataset.i]) + '</span>';
    });
    up.addEventListener('pointerleave', () => { read.innerHTML = '<span>90 days ago</span><span>Today</span>'; });

    // latency chart
    const r2 = mulberry(21);
    const N = 96, x0 = 30, x1 = 600;
    const pts99 = [], pts50 = [];
    for (let i = 0; i < N; i++) {
      const spike = Math.exp(-Math.pow((i - 58) / 3, 2)) * 9;
      const v99 = 34 + Math.sin(i / 9) * 2.5 + (r2() - 0.5) * 5 + spike;
      const v50 = 9 + Math.sin(i / 7) * 0.9 + (r2() - 0.5) * 1.4;
      const x = x0 + (i / (N - 1)) * (x1 - x0);
      const y = (v) => 175 - (v / 60) * 155;
      pts99.push([x, y(v99)]); pts50.push([x, y(v50)]);
    }
    const toPath = (p) => p.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
    const l99 = $('#line99'), l50 = $('#line50'), ar = $('#area50');
    l99.setAttribute('d', toPath(pts99)); l50.setAttribute('d', toPath(pts50));
    ar.setAttribute('d', toPath(pts50) + ' L' + x1 + ',175 L' + x0 + ',175 Z');
    [l99, l50].forEach((p) => {
      const L = p.getTotalLength();
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      p.dataset.len = L;
    });
    onView($('#chart'), () => {
      [l99, l50].forEach((p, i) => {
        p.style.transition = motion() ? 'stroke-dashoffset 2.2s cubic-bezier(.16,1,.3,1) ' + (i * 0.25) + 's' : 'none';
        p.style.strokeDashoffset = 0;
      });
    });
    // fail-safe for reduced motion: draw immediately
    if (!motion()) { l99.style.strokeDashoffset = 0; l50.style.strokeDashoffset = 0; }

    // regions
    const REG = [
      { id: 'us-east-1', n: 'N. Virginia', s: 28, ms: 6 },
      { id: 'us-west-2', n: 'Oregon', s: 14, ms: 11 },
      { id: 'eu-west-1', n: 'Dublin', s: 22, ms: 7 },
      { id: 'eu-central-1', n: 'Frankfurt', s: 16, ms: 9 },
      { id: 'ap-southeast-1', n: 'Singapore', s: 12, ms: 13 },
      { id: 'ap-northeast-1', n: 'Tokyo', s: 8, ms: 12 }
    ];
    const regionsEl = $('#regions');
    const rows = REG.map((r, i) => {
      const el = document.createElement('div');
      el.className = 'region'; el.style.setProperty('--i', i);
      el.innerHTML = '<span class="d"></span><span class="nm">' + r.id + '<small>' + r.n + '</small></span><span class="sh"><i style="--s:' + r.s * 3 + '%"></i></span><span class="ms">' + r.ms + ' ms</span>';
      regionsEl.appendChild(el); return el;
    });
    const log = $('#foLog'), btn = $('#foBtn'), state = $('#regionState');
    let down = false, busy = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, motion() ? ms : 30));
    function line(cls, txt) {
      const d = document.createElement('div'); d.className = cls; d.textContent = txt; log.appendChild(d);
      while (log.children.length > 6) log.firstElementChild.remove();
    }
    function distribute(offline) {
      const live = REG.map((r, i) => i).filter((i) => !(offline && i === 0));
      const tot = live.reduce((a, i) => a + REG[i].s, 0);
      REG.forEach((r, i) => {
        const el = rows[i];
        const share = offline && i === 0 ? 0 : (REG[i].s / tot) * 100;
        el.querySelector('.sh i').style.setProperty('--s', Math.min(share * 3, 100) + '%');
        const ms = el.querySelector('.ms');
        ms.textContent = offline && i === 0 ? 'offline' : (r.ms + (offline ? 1 + (i % 3) : 0)) + ' ms';
      });
    }
    const stamp = (o) => '14:02:' + String(11 + Math.floor(o / 1000)).padStart(2, '0') + '.' + String(Math.floor(o % 1000)).padStart(3, '0');
    btn.addEventListener('click', async () => {
      if (busy) return; busy = true; btn.disabled = true;
      log.innerHTML = '';
      if (!down) {
        rows[0].classList.add('down'); state.textContent = 'us-east-1 failing';
        distribute(true);
        line('e', stamp(4) + '  health check failed  region=us-east-1'); await sleep(550);
        rows[0].classList.remove('down'); rows[0].classList.add('rerouting');
        line('m', stamp(219) + '  quorum lost for 3 shards, electing leaders'); await sleep(600);
        line('g', stamp(231) + '  leaders moved → eu-west-1, us-west-2'); await sleep(550);
        line('g', stamp(402) + '  traffic rebalanced · 0 requests dropped'); await sleep(500);
        line('g', stamp(655) + '  1,204 idempotent retries replayed, 0 duplicates'); await sleep(500);
        line('g', stamp(710) + '  invariant check: Σ debits − Σ credits = 0.00 ✓');
        rows[0].classList.remove('rerouting'); rows[0].classList.add('down');
        state.textContent = 'degraded · serving 5 of 6';
        btn.textContent = 'Restore us-east-1'; down = true;
      } else {
        line('m', '14:09:40.002  us-east-1 rejoining, catching up from log');
        rows[0].classList.remove('down'); rows[0].classList.add('rerouting'); await sleep(700);
        line('g', '14:09:41.380  caught up · 2,911 entries verified');
        distribute(false); rows[0].classList.remove('rerouting'); await sleep(500);
        line('g', '14:09:42.100  all regions healthy');
        state.textContent = 'all healthy';
        btn.textContent = 'Simulate us-east-1 outage'; down = false;
      }
      busy = false; btn.disabled = false;
    });
  })();

  /* ------------------------------------------------------------
     Customer quotes
  ------------------------------------------------------------ */
  (function quotes() {
    const Q = [
      [['9d → 1h', 'Month-end close time'], ['62%', 'Fewer finance-ops tickets'], ['$4.1B', 'Annualised volume on Ledgerline']],
      [['0', 'Duplicate payouts in 14 months'], ['41 ms', 'p99 payout posting latency'], ['3×', 'Faster release cadence for money flows']],
      [['11 wks', 'From kickoff to production'], ['100%', 'Entries reconciled automatically'], ['38%', 'Lower payments infrastructure cost']]
    ];
    const quotes = $$('.quote'), tabs = $$('.qt'), side = $('#qSide');
    const DUR = 8000;
    let idx = 0, prog = 0, paused = false, vis = false, running = false, last = 0;
    function metrics(i) {
      side.innerHTML = Q[i].map((m, k) => '<div class="metric" style="opacity:0;transform:translateY(12px);transition:opacity .6s ' + (k * 90) + 'ms,transform .7s var(--out) ' + (k * 90) + 'ms"><div class="num">' + m[0] + '</div><p>' + m[1] + '</p></div>').join('');
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.metric', side).forEach((m) => { m.style.opacity = 1; m.style.transform = 'none'; })));
    }
    function set(i, user) {
      idx = i; prog = 0;
      quotes.forEach((q, j) => q.classList.toggle('on', j === i));
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.style.setProperty('--p', 0); });
      metrics(i);
      if (user) paused = false;
    }
    tabs.forEach((t, i) => t.addEventListener('click', () => set(i, true)));
    const box = $('#quotes');
    box.addEventListener('pointerenter', () => { paused = true; });
    box.addEventListener('pointerleave', () => { paused = false; kick(); });
    box.addEventListener('focusin', () => { paused = true; });
    box.addEventListener('focusout', () => { paused = false; kick(); });
    function loop(now) {
      const dt = Math.min(now - last, 64); last = now;
      if (motion() && vis && !paused && !document.hidden) {
        prog += dt / DUR;
        tabs[idx].style.setProperty('--p', clamp(prog, 0, 1));
        if (prog >= 1) set((idx + 1) % quotes.length);
        requestAnimationFrame(loop);
      } else running = false;
    }
    function kick() { if (!running && motion() && vis) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) kick(); }, { threshold: 0.3 }).observe(box);
    onMotion(() => kick());
    metrics(0);
    tabs[0].style.setProperty('--p', 0);
  })();

  /* ------------------------------------------------------------
     Pricing calculator
  ------------------------------------------------------------ */
  (function pricing() {
    const range = $('#calcRange'), volEl = $('#calcVol'), totEl = $('#calcTot'), note = $('#calcNote');
    let shown = 0, target = 0, anim = false;
    function volume(v) {
      const raw = Math.pow(10, 4 + (4 * v) / 100);
      const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
      return Math.round(raw / mag) * mag; // 2 sig figs
    }
    function cost(n) {
      const t1 = Math.min(n, 1e6) * 0.0012;
      const t2 = Math.max(0, Math.min(n, 1e7) - 1e6) * 0.0009;
      const t3 = Math.max(0, n - 1e7) * 0.0005;
      return Math.max(450, t1 + t2 + t3);
    }
    function short(n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : Math.round(n / 1e3) + 'K'; }
    function paint() { totEl.textContent = '$' + Math.round(shown).toLocaleString('en-US'); }
    function loop() {
      shown = lerp(shown, target, motion() ? 0.16 : 1);
      if (Math.abs(shown - target) < 0.6) shown = target;
      paint();
      if (shown !== target) requestAnimationFrame(loop); else anim = false;
    }
    function update() {
      const v = parseFloat(range.value);
      range.style.setProperty('--p', v + '%');
      const n = volume(v), c = cost(n);
      volEl.textContent = short(n);
      target = c;
      if (!anim) { anim = true; requestAnimationFrame(loop); }
      const eff = c / n;
      note.textContent = c <= 450 ? 'Minimum applies below roughly 375K entries. Volume tiers: $0.0012 up to 1M, $0.0009 to 10M, $0.0005 beyond.' :
        'Effective rate $' + eff.toFixed(5) + ' per entry. Volume tiers: $0.0012 up to 1M, $0.0009 to 10M, $0.0005 beyond.' + (n >= 2e7 ? ' Above 20M, ask about committed-volume discounts.' : '');
    }
    range.addEventListener('input', update);
    shown = cost(volume(parseFloat(range.value)));
    update();
  })();

  /* ------------------------------------------------------------
     Sign-up
  ------------------------------------------------------------ */
  (function signup() {
    const form = $('#signupForm'), email = $('#email'), err = $('#formErr'), wrap = $('#form');
    const keyVal = $('#keyVal'), snip = $('#keySnip'), copy = $('#copyKey');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        err.textContent = 'Enter a valid work email to get your sandbox key.';
        email.focus(); return;
      }
      err.textContent = '';
      const bytes = new Uint8Array(18);
      (window.crypto || { getRandomValues: (a) => a.map(() => Math.random() * 256) }).getRandomValues(bytes);
      const key = 'lk_test_' + Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
      keyVal.textContent = key;
      snip.textContent = 'export LEDGERLINE_KEY=' + key + '\n\ncurl https://api.ledgerline.dev/v1/accounts \\\n  -H "Authorization: Bearer $LEDGERLINE_KEY"';
      wrap.classList.add('done');
    });
    email.addEventListener('input', () => { err.textContent = ''; });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(keyVal.textContent); copy.textContent = 'Copied'; } catch (e) { copy.textContent = 'Select & copy'; }
      setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
    });
  })();

  /* ------------------------------------------------------------
     GSAP scroll-linked enhancements (optional)
  ------------------------------------------------------------ */
  function enhance() {
    if (!(window.gsap && window.ScrollTrigger)) return;
    gsap.registerPlugin(ScrollTrigger);
    if (!motion()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      gsap.to('#console', { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
      gsap.to('#heroTitle', { yPercent: -8, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '55% top', scrub: true } });
      gsap.fromTo('.cta-bg svg', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#signup', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo('.vault', { rotate: -12 }, { rotate: 12, ease: 'none', scrollTrigger: { trigger: '#security', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      gsap.utils.toArray('.princ').forEach((el, i) => {
        gsap.fromTo(el, { yPercent: 6 * (i + 1) }, { yPercent: -2 * (i + 1), ease: 'none', scrollTrigger: { trigger: '.principles', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
  }
  enhance();
})();
