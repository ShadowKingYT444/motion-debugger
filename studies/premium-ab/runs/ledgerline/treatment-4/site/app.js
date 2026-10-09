/* Ledgerline — page behaviour. Motion kit handles reveals, counters, magnetic, tilt, spotlight, marquee.
   This file adds: masked headline lines, the margin-rule progress, the pinned transfer story,
   the live journal and event feeds, the API tabs, charts, pricing estimator and form. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  /* deterministic pseudo-random so the sample data is stable */
  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  /* number tween */
  const tweens = new WeakMap();
  function roll(el, to, format, ms = 600) {
    if (reduce) { el.textContent = format(to); el._v = to; return; }
    const from = el._v ?? to;
    const t0 = performance.now();
    cancelAnimationFrame(tweens.get(el));
    const tick = (now) => {
      const t = clamp((now - t0) / ms);
      const v = from + (to - from) * (1 - Math.pow(1 - t, 3));
      el.textContent = format(v); el._v = v;
      if (t < 1) tweens.set(el, requestAnimationFrame(tick));
    };
    tweens.set(el, requestAnimationFrame(tick));
  }

  /* ---------- reveal bookkeeping (scroll-checked: robust to anchor jumps) ---------- */
  const pending = [];
  const lineEls = $$('[data-lines]').filter((el) => !el.closest('.hero'));
  lineEls.forEach((el) => pending.push([el, 'is-in']));
  ['.balance', '.tt', '.rails', '.bars', '.lat'].forEach((s) => $$(s).forEach((el) => pending.push([el, 'in-view'])));
  function checkPending() {
    const vh = innerHeight;
    for (let i = pending.length - 1; i >= 0; i--) {
      const [el, cls] = pending[i];
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.88) { el.classList.add(cls); pending.splice(i, 1); }
    }
  }

  /* live loops only while visible */
  if ('IntersectionObserver' in window) {
    const live = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting)), { threshold: 0.2 });
    $$('[data-live]').forEach((el) => live.observe(el));
  } else $$('[data-live]').forEach((el) => el.classList.add('is-live'));

  /* ---------- hero entrance ---------- */
  const heroH1 = $('.hero [data-lines]');
  setTimeout(() => heroH1 && heroH1.classList.add("is-in"), 40);

  /* ---------- generic feed (transform-only list that shifts down as entries arrive) ---------- */
  function createFeed(host, max, make) {
    const items = [];
    return function push(animate = true) {
      const el = make();
      el.style.setProperty('--k', 0);
      items.forEach((it, i) => it.style.setProperty('--k', i + 1));
      if (animate) el.classList.add('enter');
      host.appendChild(el);
      items.unshift(el);
      if (animate) { void el.offsetWidth; el.classList.remove('enter'); }
      while (items.length > max) { const old = items.pop(); old.classList.add('leave'); setTimeout(() => old.remove(), 700); }
    };
  }
  function whileVisible(el, fn, ms) {
    let visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.1 }).observe(el);
    setInterval(() => { if (visible && !document.hidden) fn(); }, ms);
  }

  /* hero journal */
  const jHost = $('#journal-rows');
  if (jHost) {
    const r = rng(7);
    const labels = [['Payout', 'merchant_41', 'dr'], ['Card settlement', 'acq_eu_02', 'cr'], ['Refund', 'cust_2209', 'dr'], ['Top-up', 'float_eu', 'cr'], ['Payroll', 'run_0812', 'dr'], ['Invoice paid', 'acme_ltd', 'cr'], ['Transfer', 'ops_usd', 'dr'], ['Pay-in', 'sepa_inst', 'cr']];
    const balEl = $('#bal');
    let bal = 1284906.40, clock = 14 * 3600 + 2 * 60 + 11, n = 0;
    const hex = () => Math.floor(r() * 0xffffff).toString(16).padStart(6, '0');
    const money = (v) => '€' + fmt(v);
    const make = () => {
      const [what, who, dir] = labels[n++ % labels.length];
      const amt = Math.round((20 + r() * r() * 4800) * 100) / 100;
      bal += dir === 'cr' ? amt : -amt;
      clock += 2 + Math.floor(r() * 3);
      const t = [Math.floor(clock / 3600), Math.floor(clock / 60) % 60, clock % 60].map((x) => String(x).padStart(2, '0')).join(':');
      const el = document.createElement('div');
      el.className = 'row'; el.setAttribute('role', 'listitem');
      el.innerHTML = `<span class="t">${t}</span><span class="m">${what} · ${who}<small>txn_${hex()}</small></span><span class="a ${dir}">${dir === 'cr' ? '+' : '−'}${fmt(amt)}</span>`;
      return el;
    };
    const push = createFeed(jHost, 6, make);
    for (let i = 0; i < 6; i++) push(false);
    balEl.textContent = money(bal);
    if (!reduce) whileVisible(jHost, () => { push(true); roll(balEl, bal, money, 700); }, 2400);
  }

  /* event stream tile */
  const evHost = $('#events');
  if (evHost) {
    const r = rng(31);
    const names = [['transfer', 'created'], ['transfer', 'posted'], ['transfer', 'settled'], ['payout', 'paid'], ['webhook', 'delivered'], ['account', 'balance_updated']];
    let clock = 14 * 3600 + 2 * 60 + 40, i = 0;
    const make = () => {
      const [a, b] = names[i++ % names.length];
      clock += 1 + Math.floor(r() * 2);
      const t = [Math.floor(clock / 3600), Math.floor(clock / 60) % 60, clock % 60].map((x) => String(x).padStart(2, '0')).join(':');
      const el = document.createElement('div');
      el.className = 'ev';
      el.innerHTML = `<span class="t">${t}</span><span class="n2">${a}.<em>${b}</em></span><span class="sig">v1=${Math.floor(r() * 0xffffff).toString(16).padStart(6, '0')}…</span>`;
      return el;
    };
    const push = createFeed(evHost, 6, make);
    for (let k = 0; k < 6; k++) push(false);
    if (!reduce) whileVisible(evHost, () => push(true), 1500);
  }

  /* ---------- pinned story ---------- */
  const story = $('#story');
  const rig = $('#rig');
  const steps = $$('#steps .step');
  const codes = $$('[data-code]', rig), chips = $$('[data-chip]', rig);
  const lit = $$('[data-from],[data-lit]', rig);
  const pathA = $('#pathA'), pathB = $('#pathB'), pathC = $('#pathC'), packet = $('#packet');
  const elapsed = $('#elapsed'), railFill = $('.story-rail');
  const elapsedBy = [0, 0, 12, 41, 214];
  let curStep = -1;
  function setStep(s) {
    if (s === curStep) return;
    curStep = s;
    steps.forEach((el, i) => { el.classList.toggle('is-active', i + 1 === s); el.classList.toggle('is-done', i + 1 < s); });
    codes.forEach((el) => el.classList.toggle('on', +el.dataset.code === s));
    chips.forEach((el) => el.classList.toggle('on', +el.dataset.chip === s));
    lit.forEach((el) => el.classList.toggle('on', s >= +(el.dataset.from || el.dataset.lit)));
    roll(elapsed, elapsedBy[s], (v) => Math.round(v) + ' ms', 500);
  }
  function drawStory(p) {
    const seg = (a, b) => clamp((p - a) / (b - a));
    const A = seg(0, 0.22), C = seg(0.5, 0.62), B = seg(0.72, 0.95);
    pathA.style.strokeDashoffset = 1 - A;
    pathC.style.strokeDashoffset = 1 - C;
    pathB.style.strokeDashoffset = 1 - B;
    let x = 146 + 154 * A, y = 142;
    if (p >= 0.5) { x = 300; y = 142 + 106 * C; }
    if (p >= 0.62) { y = 142 + 106 * (1 - seg(0.62, 0.72)); }
    if (p >= 0.72) { y = 142; x = 300 + 216 * B; }
    packet.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    packet.classList.toggle('on', p > 0.004);
    railFill.style.setProperty('--sp', p.toFixed(4));
    setStep(p < 0.25 ? 1 : p < 0.5 ? 2 : p < 0.72 ? 3 : 4);
  }
  if (story && rig) {
    if (reduce) { drawStory(1); }
    else drawStory(0);
  }

  /* ---------- manifesto words ---------- */
  const man = $('#manifesto');
  let words = [];
  if (man) {
    man.setAttribute('aria-label', man.textContent.trim());
    words = man.textContent.trim().split(/\s+/);
    man.innerHTML = words.map((w) => `<span aria-hidden="true">${w}</span>`).join(' ');
    words = $$('span', man);
    if (reduce) words.forEach((w) => w.classList.add('lit'));
  }

  /* ---------- one scroll loop ---------- */
  const rule = $('.rule');
  let queued = false;
  function frame() {
    queued = false;
    const vh = innerHeight;
    const doc = document.documentElement;
    rule.style.setProperty('--sp', clamp(scrollY / Math.max(1, doc.scrollHeight - vh)).toFixed(4));
    if (story && !reduce) {
      const r = story.getBoundingClientRect();
      drawStory(clamp(-r.top / Math.max(1, r.height - vh)));
    }
    if (man && !reduce) {
      const r = man.getBoundingClientRect();
      const p = clamp((vh * 0.86 - r.top) / (vh * 0.5 + r.height * 0.4));
      const count = Math.round(p * words.length * 1.08);
      words.forEach((w, i) => w.classList.toggle('lit', i < count));
    }
    checkPending();
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  addEventListener('load', queue);
  frame();

  /* ---------- API tabs + simulated request ---------- */
  const tabsEl = $('.tabs');
  if (tabsEl) {
    const ink = $('.tab-ink', tabsEl);
    const tabs = $$('[role=tab]', tabsEl);
    const move = (tab) => { ink.style.setProperty('--x', tab.offsetLeft - 4 + 'px'); ink.style.setProperty('--sx', (tab.offsetWidth / 100).toFixed(4)); };
    const select = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).classList.toggle('is-active', on); });
      move(tab); if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i + tabs.length - 1) % tabs.length], true); }
      });
    });
    const place = () => move(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
    place(); addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  const send = $('#send'), out = $('#resp-out'), meta = $('#resp-meta');
  const J = (k) => `<span class="k">"${k}"</span>`;
  const respLines = [
    '{',
    `  ${J('id')}: <span class="s">"txn_9f2c41a7"</span>,`,
    `  ${J('object')}: <span class="s">"transfer"</span>,`,
    `  ${J('status')}: <span class="ok">"settled"</span>,`,
    `  ${J('amount')}: <span class="n">25000</span>, ${J('currency')}: <span class="s">"eur"</span>,`,
    `  ${J('entries')}: [`,
    `    { ${J('account')}: <span class="s">"acct_ops_eur"</span>, ${J('direction')}: <span class="s">"debit"</span> },`,
    `    { ${J('account')}: <span class="s">"acct_merchant_41"</span>, ${J('direction')}: <span class="s">"credit"</span> }`,
    '  ],',
    `  ${J('rail')}: <span class="s">"sepa_instant"</span>,`,
    `  ${J('idempotency_key')}: <span class="s">"ord_8841"</span>`,
    '}'
  ];
  if (send) send.addEventListener('click', () => {
    send.disabled = true; meta.textContent = '· sending…';
    out.innerHTML = '';
    setTimeout(() => {
      respLines.forEach((html, i) => {
        const line = document.createElement('span');
        line.className = 'ln'; line.innerHTML = html + '\n';
        out.appendChild(line);
        setTimeout(() => line.classList.add('in'), reduce ? 0 : 40 + i * 55);
      });
      meta.textContent = '· 201 Created · 38 ms · simulated';
      setTimeout(() => { send.disabled = false; }, reduce ? 0 : 900);
    }, reduce ? 0 : 320);
  });

  /* ---------- time-travel tile ---------- */
  const ttLine = $('#tt-line');
  if (ttLine) {
    const r = rng(11), N = 48, pts = [];
    let v = 0.35;
    for (let i = 0; i < N; i++) { v = clamp(v + (r() - 0.42) * 0.12 + (i > 30 && i < 36 ? -0.1 : 0.012), 0.08, 0.95); pts.push(v); }
    const X = (i) => (i / (N - 1)) * 400, Y = (val) => 108 - val * 92;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p).toFixed(1)}`).join(' ');
    ttLine.setAttribute('d', d);
    $('#tt-area').setAttribute('d', `${d} L400 120 L0 120 Z`);
    const range = $('#tt-range'), mark = $('#tt-mark'), dot = $('#tt-dot'), val = $('#tt-val'), time = $('#tt-time');
    const upd = () => {
      const f = (range.value / 100) * (N - 1), i = Math.min(N - 2, Math.floor(f)), t = f - i;
      const p = pts[i] + (pts[i + 1] - pts[i]) * t, x = (f / (N - 1)) * 400;
      mark.setAttribute('x1', x); mark.setAttribute('x2', x);
      dot.setAttribute('cx', x); dot.setAttribute('cy', Y(p));
      val.textContent = '€' + fmt(210000 + p * 1240000, 0);
      const secs = 9 * 3600 + (range.value / 100) * (5 * 3600 + 2 * 60 + 11);
      time.textContent = [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, Math.floor(secs) % 60].map((x2) => String(x2).padStart(2, '0')).join(':');
    };
    range.addEventListener('input', upd); upd();
  }

  /* ---------- uptime bars + latency chart ---------- */
  const bars = $('#bars');
  if (bars) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) {
      const el = document.createElement('i');
      el.style.setProperty('--n', i);
      const deg = i === 23 || i === 61;
      if (deg) { el.className = 'deg'; el.title = `Day ${i - 89}: degraded for 3 minutes (sample)`; } else el.title = `Day ${i - 89}: 100% (sample)`;
      frag.appendChild(el);
    }
    bars.appendChild(frag);
  }
  const l50 = $('#lat50'), l99 = $('#lat99');
  if (l50 && l99) {
    const r = rng(5), n = 44;
    const build = (base, jitter, spikeAt, spike) => Array.from({ length: n }, (_, i) => {
      let v = base + (r() - 0.5) * jitter;
      if (spikeAt.includes(i)) v += spike;
      const x = 30 + (i / (n - 1)) * 530, y = 180 - v * 2.5;
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    l50.setAttribute('d', build(9, 2.4, [], 0));
    l99.setAttribute('d', build(37, 8, [11, 29], 11));
  }

  /* ---------- pricing estimator ---------- */
  const vol = $('#vol');
  if (vol) {
    const cV = $('#calc-vol'), cC = $('#calc-cost'), cR = $('#calc-rate');
    const nice = (x) => { const m = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / m) * m; };
    const cost = (tx) => Math.min(tx, 1e5) * 0.02 + clamp(tx - 1e5, 0, 9e5) * 0.012 + Math.max(0, tx - 1e6) * 0.006;
    const upd = () => {
      const tx = nice(Math.pow(10, 4 + (vol.value / 100) * 3));
      const c = cost(tx);
      cV.textContent = tx.toLocaleString('en-US');
      roll(cC, c, (x) => '$' + Math.round(x).toLocaleString('en-US'), 450);
      cR.textContent = '$' + (c / tx).toFixed(4);
    };
    vol.addEventListener('input', upd); upd();
  }

  /* ---------- sign-up + copy ---------- */
  const form = $('#signup'), msg = $('#form-msg'), email = $('#email');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    msg.textContent = ok ? 'Demo only: no email was sent. Your sandbox key would arrive at ' + email.value.trim() : 'Enter a valid work email to get a key.';
    if (!ok) email.focus();
  });
  const copy = $('#copy'), copied = $('#copied');
  if (copy) copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('npm i @ledgerline/node'); copied.textContent = 'Copied to clipboard'; }
    catch { copied.textContent = 'Press Ctrl+C to copy'; }
    setTimeout(() => { copied.textContent = ''; }, 2200);
  });
})();
