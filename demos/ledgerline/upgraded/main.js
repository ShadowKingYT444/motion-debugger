/* ==========================================================================
   Ledgerline — interactions and motion
   Functions work without GSAP; choreography uses GSAP + ScrollTrigger +
   SplitText (Kinetic personality: quint-out, 450–750 ms, 40–60 ms stagger).
   See the motion score at the top of styles.css and in PREMIUM.md.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const quint = t => 1 - Math.pow(1 - clamp(t), 5);
  const io = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rand = (a, b) => a + Math.random() * (b - a);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const root = document.documentElement;

  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { reduced: mqReduce.matches, paused: false };
  const ambientOn = () => !state.reduced && !state.paused && !document.hidden;
  const emitMotion = () => document.dispatchEvent(new Event('ll:motion'));
  const onMotion = fn => { document.addEventListener('ll:motion', fn); document.addEventListener('visibilitychange', fn); };
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', e => { state.reduced = e.matches; emitMotion(); });

  const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /** Roll a number into an element (quint-out). */
  function tween(el, from, to, dur, fmt) {
    cancelAnimationFrame(el._tw);
    if (state.reduced || dur <= 0) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / dur);
      el.textContent = fmt(lerp(from, to, quint(t)));
      if (t < 1) el._tw = requestAnimationFrame(step);
    };
    el._tw = requestAnimationFrame(step);
  }

  /* ---------- nav ---------- */
  function initNav() {
    const nav = $('#nav');
    const links = $$('.nav-links a');
    const menu = $('#menu');
    const burger = $('.burger');
    let lastY = scrollY, ticking = false;

    const onScroll = () => {
      ticking = false;
      const y = scrollY;
      nav.classList.toggle('is-stuck', y > 24);
      if (!menu.classList.contains('is-open') && !nav.contains(document.activeElement)) {
        if (y > lastY + 6 && y > 640) nav.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 640) nav.classList.remove('is-hidden');
      }
      lastY = y;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
    onScroll();

    const sectionOf = { product: 'product', flow: 'product', developers: 'developers', reliability: 'reliability', customers: 'customers', pricing: 'pricing', faq: 'pricing' };
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const key = sectionOf[e.target.id];
          links.forEach(a => a.classList.toggle('is-active', !!key && a.getAttribute('href') === '#' + key));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(sectionOf).concat('top', 'start').forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    }

    const setMenu = open => {
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      root.style.overflow = open ? 'hidden' : '';
      nav.classList.remove('is-hidden');
    };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  /* ---------- the live ledger page (hero) ---------- */
  function initLedger() {
    const rowsEl = $('#ledgerRows');
    if (!rowsEl) return { start() {} };
    const sheet = $('#ledger');
    const balEl = $('#balance'), deltaEl = $('#delta .delta-v');
    const drEl = $('#sumDr'), crEl = $('#sumCr');
    const req = $('#req'), reqKey = $('#reqKey'), reqLat = $('#reqLat');
    const toggle = $('#ledgerToggle');

    const TPL = [
      ['Marrow Freight', 'payout', 'RTP', -1, [1800, 9400]],
      ['Tessera Treasury', 'deposit', 'FedNow', 1, [5000, 42000]],
      ['Halcyon Lending', 'disbursement', 'ACH', -1, [900, 15000]],
      ['Kestrel Card', 'settlement', 'Card', 1, [120, 2400]],
      ['Northwind Pay', 'payout', 'SEPA', -1, [400, 6200]],
      ['Plumeline', 'top-up', 'RTP', 1, [2000, 25000]],
      ['Orbital Credit', 'repayment', 'ACH', 1, [300, 4800]],
      ['Quillon', 'refund', 'Card', -1, [20, 480]],
      ['Northwind Pay', 'collection', 'FedNow', 1, [800, 12000]],
    ];
    let cents = 248130942, dr = 1240291820, cr = 1240291820, lastIdx = -1;
    const hist = [];
    const fmtC = c => money(c / 100);
    const fmtT = d => d.toTimeString().slice(0, 8);
    const make = when => {
      let i; do { i = Math.floor(Math.random() * TPL.length); } while (i === lastIdx);
      lastIdx = i;
      const [name, kind, rail, sign, [lo, hi]] = TPL[i];
      return { name, kind, rail, sign, amt: Math.round(rand(lo, hi) * 100), when };
    };
    const rowEl = e => {
      const li = document.createElement('li');
      li.className = 'row';
      const amt = fmtC(e.amt);
      li.innerHTML = '<span class="t">' + fmtT(e.when) + '</span><span class="p"><b>' + e.name + '</b> ' + e.kind + '</span><span class="r">' + e.rail + '</span>' +
        '<span class="dr">' + (e.sign < 0 ? amt : '') + '</span><span class="cr">' + (e.sign > 0 ? amt : '') + '</span>';
      return li;
    };
    const updateDelta = () => {
      const cutoff = Date.now() - 60000;
      while (hist.length && hist[0].t < cutoff) hist.shift();
      const net = hist.reduce((s, h) => s + h.amt, 0);
      deltaEl.textContent = (net >= 0 ? '+' : '\u2212') + '$' + fmtC(Math.abs(net));
    };

    // Seed chronologically: oldest at the top of the page, newest on the writing line.
    rowsEl.innerHTML = '';
    const now = Date.now();
    [40, 36, 31, 27, 22, 17, 12, 8, 5, 2].forEach(off => {
      const e = make(new Date(now - off * 1000));
      hist.push({ t: now - off * 1000, amt: e.sign * e.amt });
      cents += e.sign * e.amt; dr += e.amt; cr += e.amt;
      rowsEl.appendChild(rowEl(e));
    });
    balEl.textContent = fmtC(cents); drEl.textContent = fmtC(dr); crEl.textContent = fmtC(cr);
    updateDelta();

    const push = () => {
      const e = make(new Date());
      const prevC = cents, prevD = dr;
      cents += e.sign * e.amt; dr += e.amt; cr += e.amt;
      hist.push({ t: Date.now(), amt: e.sign * e.amt });
      const li = rowEl(e);
      li.classList.add('is-new');
      rowsEl.appendChild(li);
      const rowH = li.offsetHeight;
      rowsEl.animate([{ transform: 'translateY(' + rowH + 'px)' }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
      li.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 720, delay: 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      setTimeout(() => li.classList.remove('is-new'), 1800);
      while (rowsEl.children.length > 12) rowsEl.firstElementChild.remove();
      tween(balEl, prevC, cents, 800, fmtC);
      tween(drEl, prevD, dr, 800, fmtC);
      tween(crEl, prevD, cr, 800, fmtC);
      updateDelta();
      reqKey.textContent = 'idem_' + Math.random().toString(16).slice(2, 10);
      reqLat.textContent = String(Math.round(rand(24, 46)));
      req.classList.add('tick');
      setTimeout(() => req.classList.remove('tick'), 420);
    };

    let visible = false, started = false, timer = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (!started || !visible || !ambientOn()) return;
      timer = setTimeout(() => { push(); schedule(); }, rand(1700, 2600));
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; schedule(); }, { threshold: 0.1 }).observe(sheet);
    } else visible = true;
    onMotion(schedule);
    setInterval(updateDelta, 4000);
    if (state.reduced) toggle.hidden = true;
    return { start() { started = true; schedule(); } };
  }

  /* ---------- signature scene: one payment, posted ---------- */
  function makeScene() {
    const sheet = $('#psheet');
    if (!sheet) return () => {};
    const steps = $$('.step');
    const statusEl = $('[data-status-label]', sheet);
    const LABELS = ['received · deduped', 'posted · pending', 'settled · RTP', 'reconciled'];
    const rows = $$('[data-row]', sheet);
    const rowParts = rows.map(r => Array.from(r.children));
    const balA = $('[data-bal="available"]', sheet), balP = $('[data-bal="pending"]', sheet);
    const line1 = $('[data-rail-line]', sheet), line2 = $('[data-rail-line2]', sheet), dot = $('[data-rail-dot]', sheet);
    const nodeRail = $('[data-node="rail"]', sheet), nodeBank = $('[data-node="bank"]', sheet);
    const timer = $('[data-timer]', sheet);
    const stmt = $('[data-stmt]', sheet), matchLine = $('[data-match-line]', sheet), awaitEl = $('[data-await]', sheet);
    const logs = $$('[data-log]', sheet);
    const stamp = $('[data-stamp]', sheet);
    const totals = $$('[data-total]', sheet);
    const A0 = 2481309.42, AMT = 4200;
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    let lastStep = -1, lastStatus = -1, lw = 0;
    const lineW = () => lw || (lw = line1.parentElement.offsetWidth);
    addEventListener('resize', () => { lw = 0; });

    let lastP = -1;
    return p => {
      if (Math.abs(p - lastP) < .0004) return;
      lastP = p;
      const post = seg(p, .12, .3), settle = seg(p, .36, .58), recon = seg(p, .62, .8), stampP = seg(p, .84, .93);
      const step = p < .12 ? 0 : p < .36 ? 1 : p < .62 ? 2 : 3;
      if (step !== lastStep) { steps.forEach((s, i) => s.classList.toggle('is-on', i === step)); lastStep = step; }
      const st = recon > .5 ? 3 : settle > .6 ? 2 : post > .5 ? 1 : 0;
      if (st !== lastStatus) {
        statusEl.textContent = LABELS[st];
        statusEl.classList.toggle('is-final', st === 3);
        if (lastStatus !== -1 && !state.reduced) statusEl.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
        lastStatus = st;
      }

      const ePost = io(post), eSettle = io(settle), eRecon = quint(recon);
      balA.textContent = money(A0 - AMT * ePost);
      balP.textContent = money(AMT * ePost - AMT * eSettle);
      // Ink each entry in from the left in the first part of its stage; the ruled line stays, as on a
      // real page, and figures appear whole once the pen has passed them (never cut mid-digit).
      [post, settle, recon].forEach((v, i) => {
        const ink = quint(clamp(v / .45));
        const [text, ...figures] = rowParts[i];
        text.style.clipPath = 'inset(0 ' + ((1 - ink) * 100).toFixed(2) + '% 0 0)';
        figures.forEach((el, k) => { el.style.opacity = clamp((ink - .55 - k * .12) / .2).toFixed(3); });
      });
      const tot = money(AMT * (ePost + eSettle));
      totals.forEach(t => { t.textContent = tot; });

      const s1 = seg(settle, 0, .55), s2 = seg(settle, .5, 1);
      line1.style.transform = 'scaleX(' + io(s1).toFixed(4) + ')';
      line2.style.transform = 'scaleX(' + io(s2).toFixed(4) + ')';
      dot.style.transform = 'translateX(' + (io(s1) * lineW()).toFixed(1) + 'px)';
      dot.style.opacity = settle > 0 && settle < 1 && s1 < 1 ? 1 : 0;
      nodeRail.classList.toggle('is-on', s1 >= 1);
      nodeBank.classList.toggle('is-on', s2 >= 1);
      timer.textContent = (8.1 * eSettle).toFixed(1);

      stmt.style.transform = 'translateX(' + ((1 - eRecon) * 120).toFixed(1) + 'px)';
      stmt.style.opacity = clamp(recon * 2.5).toFixed(3);
      stmt.style.visibility = recon > 0 ? 'visible' : 'hidden';
      awaitEl.style.opacity = (1 - clamp(recon * 4)).toFixed(3);
      awaitEl.style.visibility = recon < .25 ? 'visible' : 'hidden';
      matchLine.style.transform = 'scaleX(' + io(seg(recon, .45, 1)).toFixed(4) + ')';

      logs.forEach((l, i) => l.classList.toggle('is-off', [true, post > .5, settle > .9, recon > .9][i] === false));

      const sp = quint(stampP);
      stamp.style.opacity = clamp(stampP * 3).toFixed(3);
      stamp.style.visibility = stampP > 0 ? 'visible' : 'hidden';
      stamp.style.transform = 'rotate(-9deg) scale(' + (1.45 - .45 * sp).toFixed(4) + ')';
      totals.forEach(t => t.style.setProperty('--rule-p', seg(p, .8, .9).toFixed(3)));
    };
  }

  /* ---------- API terminal ---------- */
  function initApi() {
    const term = $('#term');
    if (!term) return;
    const tabs = $$('.tabs button', term);
    const ind = $('.tab-ind', term);
    const pres = $$('.term-code pre', term);
    const KW = {
      node: 'import|from|const|let|await|new|async|return|function|export',
      python: 'from|import|def|return|None|True|False|print',
      go: 'func|err|nil|ctx|package|import|return|var|range|if|for',
      curl: 'curl',
    };
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rx = {};
    const build = lang => {
      const comment = lang === 'node' || lang === 'go' ? '\\/\\/[^\\n]*' : '#[^\\n]*';
      const str = lang === 'curl' ? '"(?:[^"\\\\\\n]|\\\\.)*"|\'[^\'\\n]*\'' : '"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'';
      const prop = lang === 'python' ? '\\b[a-z_]\\w*(?==(?!=))' : lang === 'curl' ? '(?!)' : '\\b[A-Za-z_]\\w*(?=\\s*:(?!:))';
      const flag = lang === 'curl' ? '|(?<=\\s)-[A-Za-z]\\b' : '';
      return new RegExp('(' + comment + ')|(' + str + ')|(\\b\\d[\\d_]*(?:\\.\\d+)?\\b)|(\\b(?:' + KW[lang] + ')\\b(?!\\s*:(?!:))' + flag + ')|(\\b[A-Za-z_]\\w*(?=\\())|(' + prop + ')', 'g');
    };
    const highlight = (line, lang) => {
      if (lang === 'json') {
        return esc(line).replace(/("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g, (m, s, colon, kw, num) => {
          if (s) return colon ? '<span class="tk-f">' + s + '</span>' + colon : '<span class="tk-s">' + s + '</span>';
          if (kw) return '<span class="tk-k">' + kw + '</span>';
          return '<span class="tk-n">' + num + '</span>';
        });
      }
      if (!rx[lang]) rx[lang] = build(lang);
      let out = '', last = 0, m;
      const re = rx[lang];
      re.lastIndex = 0;
      while ((m = re.exec(line))) {
        out += esc(line.slice(last, m.index));
        const cls = m[1] ? 'tk-c' : m[2] ? 'tk-s' : m[3] ? 'tk-n' : m[4] ? 'tk-k' : m[5] ? 'tk-f' : 'tk-p';
        out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      return out + esc(line.slice(last));
    };
    pres.forEach(pre => {
      const code = $('code', pre);
      code.innerHTML = code.textContent.split('\n').map(l => '<span class="tk-line">' + (highlight(l, pre.dataset.lang) || ' ') + '</span>').join('');
    });

    const place = () => {
      const sel = tabs.find(t => t.getAttribute('aria-selected') === 'true');
      ind.style.setProperty('--ix', sel.offsetLeft + 'px');
      ind.style.setProperty('--iw', sel.offsetWidth);
    };
    const select = lang => {
      tabs.forEach(t => { const on = t.dataset.lang === lang; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      pres.forEach(p => p.classList.toggle('is-on', p.dataset.lang === lang));
      place();
    };
    tabs.forEach((t, i) => {
      t.tabIndex = i === 0 ? 0 : -1;
      t.addEventListener('click', () => select(t.dataset.lang));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        n.focus(); select(n.dataset.lang);
      });
    });
    place();
    addEventListener('resize', place);
    if (document.fonts) document.fonts.ready.then(place);

    const runBtn = $('#runBtn'), body = $('#resBody code'), status = $('#resStatus');
    let busy = false;
    const rid = n => Array.from({ length: n }, () => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 54)]).join('');
    runBtn.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      runBtn.classList.add('is-busy');
      status.className = 'res-status';
      status.textContent = 'Sending\u2026';
      body.innerHTML = '';
      await wait(state.reduced ? 0 : rand(380, 520));
      const lat = Math.round(rand(24, 42));
      const lines = [
        '{',
        '  "id": "txn_' + rid(8) + '",',
        '  "object": "transfer",',
        '  "status": "settling",',
        '  "amount": 420000,',
        '  "currency": "usd",',
        '  "rail": "rtp",',
        '  "entries": [',
        '    { "account": "acct_operating", "direction": "debit", "amount": 420000 },',
        '    { "account": "acct_marrow_freight", "direction": "credit", "amount": 420000 }',
        '  ],',
        '  "idempotency_key": "payout_8f2a91",',
        '  "created_at": "' + new Date().toISOString() + '"',
        '}',
      ];
      lines.forEach((l, i) => {
        const s = document.createElement('span');
        s.className = 'rline';
        s.style.animationDelay = state.reduced ? '0s' : (i * 40) + 'ms';
        s.innerHTML = highlight(l, 'json') || '&nbsp;';
        body.appendChild(s);
      });
      await wait(state.reduced ? 0 : lines.length * 40 + 120);
      status.className = 'res-status on';
      status.textContent = '201 Created \u00b7 ' + lat + ' ms';
      runBtn.classList.remove('is-busy');
      busy = false;
    });
  }

  /* ---------- reliability ---------- */
  function initReliability() {
    const bars = $('#uptimeBars');
    const tip = $('#uptimeTip');
    if (bars) {
      const N = 90;
      const degraded = { 23: ['99.93%', 'elevated p99 for 11 min, no failed writes'], 61: ['99.89%', 'one rail degraded for 17 min, auto-failover'] };
      const today = new Date();
      const frag = document.createDocumentFragment();
      for (let i = 0; i < N; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - (N - 1 - i));
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const b = document.createElement('i');
        b.className = 'ub' + (degraded[i] ? ' deg' : '');
        b.dataset.tip = degraded[i] ? label + ' \u00b7 ' + degraded[i][0] + ' \u00b7 ' + degraded[i][1] : label + ' \u00b7 100% \u00b7 no incidents';
        frag.appendChild(b);
      }
      bars.appendChild(frag);
      const idle = tip.textContent;
      bars.addEventListener('pointerover', e => { if (e.target.dataset && e.target.dataset.tip) tip.textContent = e.target.dataset.tip; });
      bars.addEventListener('pointerleave', () => { tip.textContent = idle; });
    }

    const svg = $('#regionsSvg');
    const btn = $('#drillBtn');
    const statusEl = $('#regionsStatus');
    if (!svg) return;
    const statusT = $('span', statusEl);
    const quorum = $('#quorumT');
    const names = { ue: 'us-east', eu: 'eu-west', ap: 'ap-southeast' };
    const syncAnim = () => {
      if (typeof svg.pauseAnimations !== 'function') return;
      if (ambientOn()) svg.unpauseAnimations(); else svg.pauseAnimations();
    };
    onMotion(syncAnim);
    syncAnim();
    let running = false;
    btn.addEventListener('click', async () => {
      if (running) return;
      running = true;
      btn.disabled = true;
      const keys = Object.keys(names);
      const k = keys[Math.floor(Math.random() * keys.length)];
      const g = $('.reg[data-r="' + k + '"]', svg);
      const ms = state.reduced ? 400 : 2400;
      g.classList.add('down');
      svg.dataset.down = k;
      quorum.textContent = 'quorum 2 / 3';
      statusEl.classList.add('warn');
      statusT.textContent = names[k] + ' unreachable. Writes keep committing on the 2-of-3 quorum. Lost entries: 0.';
      await wait(ms);
      statusT.textContent = 'Traffic rerouted in 1.8 s. Idempotent retries return the original results.';
      await wait(ms);
      g.classList.remove('down');
      delete svg.dataset.down;
      quorum.textContent = 'quorum 3 / 3';
      statusEl.classList.remove('warn');
      statusT.textContent = names[k] + ' rejoined and replayed 1,204 entries in 1.9 s. Quorum restored.';
      await wait(ms * 1.2);
      statusT.textContent = 'All regions healthy. Writes commit on a 2-of-3 quorum.';
      btn.disabled = false;
      running = false;
    });
  }

  /* ---------- embossed compliance seals (guilloché rosettes) ---------- */
  function initSeals() {
    $$('svg.seal').forEach((svg, n) => {
      svg.setAttribute('viewBox', '-70 -70 140 140');
      const id = 'sealpath' + n;
      const wave = (R, amp, lobes, phase) => {
        let path = '';
        for (let i = 0; i <= 480; i++) {
          const t = (i / 480) * Math.PI * 2;
          const r = R + amp * Math.sin(lobes * t + phase);
          path += (i ? 'L' : 'M') + (r * Math.cos(t)).toFixed(2) + ' ' + (r * Math.sin(t)).toFixed(2);
        }
        return path + 'Z';
      };
      const lobes = [18, 15, 21, 16, 20, 14][n % 6];
      let roses = '';
      for (let k = 0; k < 5; k++) roses += '<path class="rose" d="' + wave(36, 4.5, lobes, k * Math.PI * 2 / 5) + '"/>';
      for (let k = 0; k < 4; k++) roses += '<path class="rose" d="' + wave(24, 5.5, Math.round(lobes / 2), k * Math.PI / 2) + '" opacity=".7"/>';
      svg.innerHTML =
        '<circle class="ring-b" r="66"/><circle class="ring" r="61"/>' +
        '<path id="' + id + '" d="M0,-52 a52,52 0 1,1 -0.01,0" fill="none"/>' +
        '<text class="st"><textPath href="#' + id + '" textLength="320" lengthAdjust="spacing">' + svg.dataset.seal + '</textPath></text>' +
        '<circle class="ring" r="44"/>' +
        roses +
        '<circle r="17" fill="#0a231c"/>' +
        '<text class="core" text-anchor="middle" dy="5">' + svg.dataset.core + '</text>';
    });
  }

  /* ---------- testimonials ---------- */
  function initProof() {
    const wrap = $('#proof');
    if (!wrap) return;
    const quotes = $$('.quote', wrap), metrics = $$('.qm', wrap), dots = $$('.qdots button', wrap);
    const DUR = 8500;
    let idx = 0, t0 = performance.now(), hold = false, visible = false, raf = 0, last = 0;
    const set = i => {
      idx = (i + quotes.length) % quotes.length;
      quotes.forEach((q, k) => q.classList.toggle('is-on', k === idx));
      metrics.forEach((q, k) => q.classList.toggle('is-on', k === idx));
      dots.forEach((d, k) => { d.setAttribute('aria-selected', String(k === idx)); d.style.setProperty('--qp', k === idx && state.reduced ? 1 : 0); });
      t0 = performance.now();
    };
    const frame = now => {
      raf = 0;
      if (!visible || !ambientOn()) return;
      if (hold) t0 += now - last;
      last = now;
      const p = clamp((now - t0) / DUR);
      dots[idx].style.setProperty('--qp', p.toFixed(4));
      if (p >= 1) set(idx + 1);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible && ambientOn()) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    dots.forEach((d, i) => d.addEventListener('click', () => set(i)));
    $('#qPrev').addEventListener('click', () => set(idx - 1));
    $('#qNext').addEventListener('click', () => set(idx + 1));
    wrap.addEventListener('pointerenter', () => { hold = true; });
    wrap.addEventListener('pointerleave', () => { hold = false; });
    wrap.addEventListener('focusin', () => { hold = true; });
    wrap.addEventListener('focusout', () => { hold = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) t0 = performance.now(); kick(); }, { threshold: 0.3 }).observe(wrap);
    }
    onMotion(kick);
    set(0);
  }

  /* ---------- pricing ---------- */
  function initPricing() {
    const vol = $('#vol');
    if (!vol) return;
    const out = $('#volOut'), tr = $('#volTransfers');
    const total = $('#estTotal'), base = $('#estBase'), usage = $('#estUsage'), rate = $('#estRate'), fine = $('#estFine');
    const price = $('#scalePrice');
    const billing = $('.billing');
    const bbtns = $$('button', billing);
    const bind = $('.billing-ind', billing);
    let annual = false, shownTotal = 0;
    const fmtEntries = n => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : Math.round(n / 1000) + 'K');
    const entries = v => {
      const raw = Math.pow(10, 5 + (v / 1000) * 3);
      const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
      return Math.round(raw / mag) * mag;
    };
    const calc = n => {
      const over = Math.max(0, n - 1e6);
      const u = Math.min(over, 9e6) * 0.40 / 1000 + Math.min(Math.max(over - 9e6, 0), 40e6) * 0.25 / 1000 + Math.max(over - 49e6, 0) * 0.12 / 1000;
      const b = annual ? 399 : 499;
      return { b, u, t: b + u, r: (b + u) / n * 1000 };
    };
    const money0 = v => Math.round(v).toLocaleString('en-US');
    const render = animate => {
      const v = +vol.value;
      const n = entries(v);
      const c = calc(n);
      vol.style.setProperty('--p', (v / 10) + '%');
      out.textContent = fmtEntries(n);
      tr.textContent = '\u2248 ' + fmtEntries(n / 2) + ' transfers';
      base.textContent = '$' + c.b;
      usage.textContent = c.u === 0 ? '$0' : '$' + money0(c.u);
      rate.textContent = '$' + c.r.toFixed(2) + ' / 1,000';
      if (animate) tween(total, shownTotal, c.t, 450, money0); else total.textContent = money0(c.t);
      shownTotal = c.t;
      fine.textContent = n > 5e7 ? 'At this volume Enterprise committed-use rates usually beat the public tiers. Talk to sales for a quote.' : 'Tiered rates: $0.40, then $0.25 beyond 10M, then $0.12 beyond 50M per 1,000 entries.';
    };
    vol.addEventListener('input', () => render(true));
    render(false);
    const placeB = () => {
      const sel = bbtns.find(b => b.getAttribute('aria-pressed') === 'true');
      bind.style.setProperty('--ix', sel.offsetLeft + 'px');
      bind.style.setProperty('--iw', sel.offsetWidth);
    };
    bbtns.forEach(b => b.addEventListener('click', () => {
      const was = annual;
      annual = b.dataset.bill === 'annual';
      bbtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      placeB();
      if (was !== annual) {
        tween(price, annual ? 499 : 399, annual ? 399 : 499, 450, v => '$' + Math.round(v));
        render(true);
      }
    }));
    placeB();
    addEventListener('resize', placeB);
    if (document.fonts) document.fonts.ready.then(placeB);
  }

  /* ---------- FAQ: one open at a time ---------- */
  function initFaq() {
    const items = $$('.qa');
    items.forEach(d => d.addEventListener('toggle', () => {
      if (d.open) items.forEach(o => { if (o !== d) o.open = false; });
    }));
  }

  /* ---------- copy buttons ---------- */
  function initCopy() {
    const doCopy = async (text, btn) => {
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else {
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
      } catch (_) { /* clipboard unavailable: still show feedback */ }
      btn.classList.add('is-done');
      setTimeout(() => btn.classList.remove('is-done'), 1600);
    };
    $$('[data-copy]').forEach(b => b.addEventListener('click', () => doCopy(b.dataset.copy, b)));
    const dc = $('#doneCopy');
    if (dc) dc.addEventListener('click', () => doCopy($('.done-code pre').textContent, dc));
  }

  /* ---------- sign-up ---------- */
  function initSignup() {
    const form = $('#signup');
    if (!form) return;
    const input = $('#email'), err = $('#emailErr'), done = $('#signupDone');
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    input.addEventListener('input', () => { form.classList.remove('has-err'); err.hidden = true; input.removeAttribute('aria-invalid'); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value.trim();
      if (!re.test(v)) {
        form.classList.remove('has-err'); void form.offsetWidth;
        form.classList.add('has-err'); err.hidden = false;
        input.setAttribute('aria-invalid', 'true'); input.focus();
        return;
      }
      const bytes = new Uint8Array(24);
      (window.crypto || { getRandomValues: a => a.map(() => Math.random() * 256) }).getRandomValues(bytes);
      const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      $('#doneKey').textContent = 'sk_test_' + Array.from(bytes, b => alpha[b % alpha.length]).join('');
      $('#doneEmail').textContent = v;
      form.hidden = true;
      done.hidden = false;
      done.setAttribute('tabindex', '-1');
      done.focus({ preventScroll: true });
    });
  }

  /* ---------- global motion toggle ---------- */
  function initMotionToggle() {
    const btns = [$('#motionToggle'), $('#ledgerToggle')].filter(Boolean);
    const label = $('#motionToggle span');
    const apply = () => {
      root.toggleAttribute('data-paused', state.paused);
      btns.forEach(b => b.setAttribute('aria-pressed', String(state.paused)));
      if (label) label.textContent = state.paused ? 'Resume ambient motion' : 'Pause ambient motion';
      const lt = $('#ledgerToggle');
      if (lt) lt.setAttribute('aria-label', state.paused ? 'Resume the live ledger stream' : 'Pause the live ledger stream');
      emitMotion();
    };
    btns.forEach(b => b.addEventListener('click', () => { state.paused = !state.paused; apply(); }));
    if (state.reduced) { const mt = $('#motionToggle'); if (mt) mt.hidden = true; }
  }

  /* ==========================================================================
     Choreography (GSAP)
     ========================================================================== */
  function initMotion(ledger, renderScene) {
    const flow = $('#flow');
    const finalState = () => {
      renderScene(1);
      flow.classList.add('is-static');
      $$('.step').forEach(s => s.classList.add('is-on'));
      ledger.start();
    };
    if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
      root.classList.remove('js');
      finalState();
      return;
    }
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const Q = 'power4.out'; // quint-out, the Kinetic clock
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hiddenSel = '[data-motion]:not([data-motion="hero"]):not([data-motion="stagger"]), [data-motion="stagger"] > *';
    const once = (trigger, start = 'clamp(top 85%)') => ({ trigger, start, once: true });

    const mm = gsap.matchMedia();
    mm.add({ all: 'all', motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 961px)' }, ctx => {
      const { motion, desktop } = ctx.conditions;
      if (!motion) {
        gsap.set(hiddenSel, { autoAlpha: 1 });
        $$('.statement-text .mark').forEach(m => m.style.setProperty('--rule-p', 1));
        finalState();
        return;
      }

      /* Hero: the entrance runs in CSS from first paint (headline lines, the page tilting in, the rest
         overlapping, settled ≈1.4 s). Here: the ledger starts posting once it has settled, and the
         totals roll only if the script arrived in time to roll them with the entrance. */
      const hero = $('.hero');
      const sheet = $('.sheet', hero);
      setTimeout(() => ledger.start(), Math.max(0, 1500 - performance.now()));
      if (performance.now() < 700) $$('[data-hero-count]', hero).forEach(el => {
        const txt = el.textContent.trim(), end = parseFloat(txt), dec = (txt.split('.')[1] || '').length;
        const o = { v: end * .6 };
        el.textContent = o.v.toFixed(dec);
        gsap.to(o, { v: end, duration: 1.1, delay: Math.max(0, .6 - performance.now() / 1000), ease: Q, onUpdate: () => { el.textContent = o.v.toFixed(dec); } });
      });

      // The hero leaves: the page lies flatter and sinks, the copy drifts up, the slip moves faster (foreground).
      const exit = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to(sheet, { '--rx2': '12deg', '--ty2': '-60px', ease: 'none', scrollTrigger: exit });
      gsap.to('.hero-copy', { yPercent: -14, autoAlpha: .2, ease: 'none', scrollTrigger: exit });
      // Parallax on the separate `translate` property, so it never fights the CSS entrance transform.
      gsap.to('.slip', { '--py': '-160px', ease: 'none', scrollTrigger: exit });
      gsap.to('.req', { '--py': '-90px', ease: 'none', scrollTrigger: exit });

      /* Headings: masked lines rise. */
      $$('[data-motion="heading"]').forEach(el => {
        gsap.set(el, { autoAlpha: 1 });
        SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
          onSplit: self => gsap.from(self.lines, { yPercent: 112, duration: .75, ease: Q, stagger: .06, scrollTrigger: once(el, 'clamp(top 88%)') }),
        });
      });

      /* Visual slabs: clip reveal with a counter-scale inside. */
      $$('[data-motion="image"]').forEach(el => {
        const inner = el.firstElementChild || el;
        gsap.timeline({ scrollTrigger: once(el, 'clamp(top 82%)') })
          .set(el, { autoAlpha: 1 })
          .from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: .9, ease: Q })
          .from(inner, { scale: 1.08, duration: 1.1, ease: Q }, 0);
      });

      /* Numbers roll up from 60% of their value; the HTML holds the final text. */
      $$('[data-motion="count"]').forEach(el => {
        gsap.set(el, { autoAlpha: 1 });
        const [, prefix, digits, suffix] = el.textContent.trim().match(/^(\D*)([\d.,]+)(.*)$/) || [];
        if (!digits) return;
        const end = parseFloat(digits.replace(/,/g, ''));
        const decimals = (digits.split('.')[1] || '').length;
        const format = v => prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: digits.includes(',') }) + suffix;
        const s = { v: end * .6 };
        el.textContent = format(s.v);
        gsap.to(s, { v: end, duration: 1.3, ease: Q, onUpdate: () => { el.textContent = format(s.v); }, scrollTrigger: once(el, 'clamp(top 90%)') });
      });

      /* Groups: children rise in reading order. */
      $$('[data-motion="stagger"]').forEach(group => {
        gsap.set(group, { autoAlpha: 1 });
        gsap.from(group.children, { y: 24, scale: .985, autoAlpha: 0, duration: .65, ease: Q, stagger: .05, scrollTrigger: once(group, 'clamp(top 84%)') });
      });
      $$('[data-motion="fade"]').forEach(el => {
        gsap.from(el, { y: 16, autoAlpha: 0, duration: .65, ease: Q, scrollTrigger: once(el, 'clamp(top 88%)') });
      });

      /* Statement: words ink in as they are read; the double rule draws under the promise. */
      const statement = $('[data-read]');
      if (statement) {
        const words = SplitText.create(statement, { type: 'words' }).words;
        gsap.fromTo(words, { color: '#75877c' }, { color: '#0f241d', ease: 'none', stagger: .1, scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 50%', scrub: true } });
        const mark = $('.mark', statement);
        gsap.fromTo(mark, { '--rule-p': 0 }, { '--rule-p': 1, ease: 'none', scrollTrigger: { trigger: statement, start: 'top 55%', end: 'bottom 48%', scrub: true } });
      }

      /* The ledger spread opens from the gutter; then its entries post, bars grow, flows draw. */
      const spread = $('[data-spread]');
      if (spread) {
        const flows = $$('.flows .fl', spread);
        flows.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
        gsap.timeline({ scrollTrigger: once(spread, 'clamp(top 78%)'), defaults: { ease: Q } })
          .from(spread, { clipPath: 'inset(0% 50% 0% 50%)', duration: 1.1, ease: 'power3.inOut' })
          .from($$('[data-post]', spread), { clipPath: 'inset(0 100% 0 0)', duration: .6, stagger: .08 }, .55)
          .from($$('.tt-bar i', spread), { scaleX: 0, duration: .7, stagger: .05 }, .6)
          .to(flows, { strokeDashoffset: 0, duration: .8, stagger: .08, ease: 'power3.inOut' }, .7)
          .from($$('.recon .conn', spread), { scaleX: 0, duration: .5, stagger: .07 }, .8);
      }

      /* Signature: one pinned, scrubbed payment (≤180vh). Phones get the finished sheet. */
      if (desktop && flow) {
        const s = { p: 0 };
        renderScene(0);
        gsap.timeline({ scrollTrigger: { trigger: $('.flow-track', flow), start: 'top top', end: 'bottom bottom', scrub: .6 } })
          .to(s, { p: 1, duration: 1, ease: 'none', onUpdate: () => renderScene(s.p) });
        flow.classList.remove('is-static');
      } else {
        finalStateScene();
      }

      /* Reliability: the 90-day tally grows in date order; seals engrave. */
      const ubs = $$('.ub');
      if (ubs.length) gsap.from(ubs, { scaleY: 0, duration: .5, ease: Q, stagger: .006, scrollTrigger: once('#uptimeBars', 'clamp(top 88%)') });
      $$('.seal .rose').forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.to('.seal .rose', { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', stagger: .008, scrollTrigger: once('.seals', 'clamp(top 88%)') });

      /* Magnetic primary actions, fine pointers only. */
      if (finePointer) $$('[data-magnetic]').forEach(el => {
        const x = gsap.quickTo(el, 'x', { duration: .45, ease: 'power3.out' });
        const y = gsap.quickTo(el, 'y', { duration: .45, ease: 'power3.out' });
        const move = e => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .25); y((e.clientY - r.top - r.height / 2) * .25); };
        const leave = () => { x(0); y(0); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
        return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
      });
    });

    function finalStateScene() {
      renderScene(1);
      flow.classList.add('is-static');
      $$('.step').forEach(s => s.classList.add('is-on'));
    }

    // Re-measure pins once the real fonts are in.
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ---------- boot ---------- */
  initNav();
  initApi();
  initReliability();
  initSeals();
  initProof();
  initPricing();
  initFaq();
  initCopy();
  initSignup();
  initMotionToggle();
  const ledger = initLedger();
  const renderScene = makeScene();
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  // Split the headline in the real face; never hold the hero back longer than ~350 ms.
  Promise.race([fontsReady, wait(350)]).then(() => initMotion(ledger, renderScene));
})();
