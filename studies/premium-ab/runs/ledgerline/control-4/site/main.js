(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var ease = function (t) { return 1 - Math.pow(1 - t, 4); };

  /* ---------- tween helper ---------- */
  function tween(from, to, ms, fn, done) {
    if (reduced) { fn(to); if (done) done(); return; }
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / ms);
      fn(from + (to - from) * ease(p));
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    })(t0);
  }

  /* ---------- nav, progress ---------- */
  var nav = $('#nav'), prog = $('#progress'), lastY = 0, ticking = false;
  function onScroll() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    nav.classList.toggle('scrolled', y > 20);
    var menuOpen = document.body.classList.contains('menu-open');
    nav.classList.toggle('hide', y > 500 && y > lastY + 4 && !menuOpen);
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  var menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('#navlinks a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); }); });

  /* ---------- reveal + counters ---------- */
  function runCounters(root) {
    var list = root.matches && root.matches('[data-count]') ? [root] : [];
    list = list.concat($$('[data-count]', root));
    list.forEach(function (el) {
      var to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), pre = el.dataset.prefix || '';
      if (to === 0) return;
      tween(0, to, 1800, function (v) { el.textContent = pre + v.toFixed(dec); });
    });
  }
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting || e.boundingClientRect.top < 0) {
        e.target.classList.add('in');
        runCounters(e.target);
        revealIO.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  $$('[data-reveal]').forEach(function (el) { revealIO.observe(el); });

  /* ---------- hero glow + magnetic buttons ---------- */
  var hero = $('.hero'), glow = $('#heroGlow');
  if (finePointer && !reduced) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      glow.style.left = (e.clientX - r.left) + 'px';
      glow.style.top = (e.clientY - r.top) + 'px';
    });
    $$('[data-magnet]').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }
  $$('.sec-item, .cm').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- marquee: duplicate for seamless loop ---------- */
  var track = $('#track');
  track.innerHTML += track.innerHTML + track.innerHTML + track.innerHTML;
  // track now holds 4 copies; animate by half = 2 copies
  track.style.animationDuration = '46s';

  /* ---------- live ledger feed ---------- */
  var feed = $('#feed'), toggle = $('#feedToggle');
  var accts = ['treasury', 'payroll', 'merchant_4821', 'reserve', 'fx_eur', 'fees', 'payouts', 'escrow_09', 'wallet_7d2', 'settle_us'];
  var posted = 48201, feedPaused = reduced, feedVisible = true, feedTimer;
  var elPosted = $('#tPosted'), elLat = $('#tLat');
  function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
  function stamp() { var d = new Date(); return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2) + '.' + pad(d.getMilliseconds(), 3); }
  function money(c) { return '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function rid() { var s = 'abcdefghjkmnpqrstuvwxyz23456789', o = 'txn_'; for (var i = 0; i < 4; i++) o += s[Math.floor(Math.random() * s.length)]; return o; }
  function addEntry(instant) {
    var a = Math.floor(Math.random() * accts.length), b = (a + 1 + Math.floor(Math.random() * (accts.length - 1))) % accts.length;
    var amt = Math.round(Math.pow(10, 3 + Math.random() * 3.6));
    var row = document.createElement('div');
    row.className = 'entry';
    row.innerHTML = '<span class="t">' + stamp() + '</span><span class="p">' + accts[a] + ' <i>→</i> ' + accts[b] + '</span><span class="a">' + money(amt) + '</span><span class="s">' + (instant ? 'posted' : 'pending') + '</span>';
    if (instant) { row.classList.add('done'); row.style.animation = 'none'; }
    feed.insertBefore(row, feed.firstChild);
    while (feed.children.length > 10) feed.removeChild(feed.lastChild);
    if (!instant) {
      setTimeout(function () {
        row.classList.add('done'); row.lastChild.textContent = (34 + Math.floor(Math.random() * 12)) + ' ms';
      }, 520);
      posted++; elPosted.textContent = posted.toLocaleString('en-US');
      elLat.textContent = (39 + Math.floor(Math.random() * 5)) + ' ms';
    }
  }
  for (var i = 0; i < 9; i++) addEntry(true);
  Array.prototype.forEach.call(feed.children, function (r) { r.lastChild.textContent = 'posted'; });
  function schedule() {
    clearTimeout(feedTimer);
    if (feedPaused || !feedVisible || document.hidden) return;
    feedTimer = setTimeout(function () { addEntry(false); schedule(); }, 900 + Math.random() * 1100);
  }
  toggle.textContent = feedPaused ? 'Play' : 'Pause';
  toggle.setAttribute('aria-pressed', feedPaused);
  toggle.addEventListener('click', function () {
    feedPaused = !feedPaused;
    toggle.textContent = feedPaused ? 'Play' : 'Pause';
    toggle.setAttribute('aria-pressed', feedPaused);
    schedule();
  });
  new IntersectionObserver(function (es) { feedVisible = es[0].isIntersecting; schedule(); }).observe($('#panel'));
  document.addEventListener('visibilitychange', schedule);
  schedule();

  /* ---------- product: sticky stage ---------- */
  var scenes = $$('#stage .scene'), tabs = $$('#stageTabs span'), steps = $$('.step');
  function setStage(i) {
    scenes.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    tabs.forEach(function (t, k) { t.classList.toggle('on', k === i); });
    steps.forEach(function (s, k) { s.classList.toggle('active', k === i); });
  }
  var stepIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) setStage(steps.indexOf(e.target)); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(function (s) { stepIO.observe(s); });
  // inline copies for narrow screens
  $$('.inline-scene').forEach(function (box) {
    var src = scenes[parseInt(box.dataset.scene, 10)];
    var c = src.cloneNode(true);
    c.classList.remove('active');
    box.appendChild(c);
    new IntersectionObserver(function (es, io) {
      if (es[0].isIntersecting) { c.classList.add('active'); io.disconnect(); }
    }, { threshold: 0.35 }).observe(box);
  });
  if (reduced) $$('svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });

  /* ---------- API tabs ---------- */
  var samples = {
    curl:
      'curl https://api.ledgerline.dev/v1/transfers \\\n' +
      '  -H "Authorization: Bearer $LEDGERLINE_KEY" \\\n' +
      '  -H "Idempotency-Key: payout_2291" \\\n' +
      '  -d source="acct_treasury" \\\n' +
      '  -d destination="acct_merchant_4821" \\\n' +
      '  -d amount=125000 \\\n' +
      '  -d currency="usd" \\\n' +
      '  -d rail="rtp"',
    node:
      'import Ledgerline from "@ledgerline/node";\n\n' +
      'const ll = new Ledgerline(process.env.LEDGERLINE_KEY);\n\n' +
      'const transfer = await ll.transfers.create({\n' +
      '  source: "acct_treasury",\n' +
      '  destination: "acct_merchant_4821",\n' +
      '  amount: 125_000, // minor units\n' +
      '  currency: "usd",\n' +
      '  rail: "rtp",\n' +
      '}, { idempotencyKey: "payout_2291" });',
    python:
      'import os\nfrom ledgerline import Ledgerline\n\n' +
      'll = Ledgerline(os.environ["LEDGERLINE_KEY"])\n\n' +
      'transfer = ll.transfers.create(\n' +
      '    source="acct_treasury",\n' +
      '    destination="acct_merchant_4821",\n' +
      '    amount=125_000,  # minor units\n' +
      '    currency="usd",\n' +
      '    rail="rtp",\n' +
      '    idempotency_key="payout_2291",\n' +
      ')'
  };
  var resp =
    '{\n  "id": "txn_01HZX9K2",\n  "status": "posted",\n  "amount": 125000,\n  "currency": "usd",\n  "entries": [\n' +
    '    { "account": "acct_treasury", "debit": 125000 },\n    { "account": "acct_merchant_4821", "credit": 125000 }\n  ],\n  "rail": "rtp",\n  "settled_in_ms": 41\n}';
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var re = /((?<!:)\/\/[^\n]*|#[^\n]*)|("(?:[^"\\\n]|\\.)*")|\b(import|from|const|await|new|curl|True|False|null)\b|((?<=\s)-[Hd](?=\s))|\b(\d[\d_]*)\b|(^[ \t]+)([a-z_]\w*)(?=[:=])/gm;
  function hl(code) {
    var out = esc(code).replace(re, function (m, c, s, k, flag, n, ind, prop, off, all) {
      if (c) return '<span class="c">' + c + '</span>';
      if (s) return all.charAt(off + m.length) === ':' ? '<span class="p">' + s + '</span>' : '<span class="s">' + s + '</span>';
      if (k) return '<span class="k">' + k + '</span>';
      if (flag) return '<span class="f">' + flag + '</span>';
      if (n) return '<span class="n">' + n + '</span>';
      if (prop) return ind + '<span class="p">' + prop + '</span>';
      return m;
    });
    return out.split('\n').map(function (l, i) { return '<span class="ln" style="--i:' + i + '">' + (l || ' ') + '</span>'; }).join('');
  }
  var codeBox = $('#codeBox'), respBox = $('#respBox'), lang = 'curl';
  function renderCode() { codeBox.innerHTML = hl(samples[lang]); }
  function renderResp() { respBox.innerHTML = hl(resp); }
  renderCode(); renderResp();
  var ind = $('#tabInd'), tabEls = $$('#langTabs .tab');
  function moveInd() { var t = $('#langTabs .tab[aria-selected="true"]'); ind.style.width = t.offsetWidth + 'px'; ind.style.transform = 'translateX(' + t.offsetLeft + 'px)'; }
  tabEls.forEach(function (t) {
    t.addEventListener('click', function () {
      lang = t.dataset.lang;
      tabEls.forEach(function (x) { x.setAttribute('aria-selected', x === t); });
      moveInd(); renderCode(); renderResp();
    });
  });
  moveInd(); window.addEventListener('resize', moveInd);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);
  $('#copyBtn').addEventListener('click', function () {
    var b = this;
    function ok() { b.textContent = 'Copied'; b.classList.add('ok'); setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('ok'); }, 1600); }
    try { navigator.clipboard.writeText(samples[lang]).then(ok, ok); } catch (e) { ok(); }
  });

  /* ---------- reliability: uptime + chart ---------- */
  var up = $('#uptime');
  for (var u = 0; u < 90; u++) {
    var cell = document.createElement('i');
    cell.style.setProperty('--i', u);
    var ago = 89 - u;
    var deg = (u === 23 || u === 61);
    if (deg) cell.className = 'dg';
    cell.title = (ago === 0 ? 'Today' : ago + ' days ago') + ' · ' + (deg ? '99.94% (minor degradation)' : '100%');
    up.appendChild(cell);
  }
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function series(base, amp, n) { var a = []; for (var i = 0; i < n; i++) a.push(base + (rnd() - 0.5) * 2 * amp + Math.sin(i / 4) * amp * 0.4); return a; }
  function pathFor(vals, x0, x1) {
    var n = vals.length, pts = vals.map(function (v, i) { return [x0 + (x1 - x0) * i / (n - 1), 180 - v * 2.5]; });
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < n; i++) { var mx = (pts[i - 1][0] + pts[i][0]) / 2; d += ' C' + mx.toFixed(1) + ' ' + pts[i - 1][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1); }
    return d;
  }
  var d99 = pathFor(series(38, 2.6, 36), 40, 600), d50 = pathFor(series(17, 1.1, 36), 40, 600);
  $('#l99').setAttribute('d', d99); $('#l50').setAttribute('d', d50);
  $('#area').setAttribute('d', d99 + ' L600 180 L40 180 Z');
  ['l99', 'l50'].forEach(function (id) {
    var p = $('#' + id), L = Math.ceil(p.getTotalLength()) + 2;
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
  });
  var inIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); inIO.unobserve(e.target); } });
  }, { threshold: 0.25 });
  inIO.observe(up); inIO.observe($('#chart'));
  if (!reduced) setInterval(function () { $('#liveP99').textContent = 'p99 ' + (36 + Math.floor(Math.random() * 6)) + ' ms'; }, 2200);

  /* ---------- testimonials ---------- */
  var qs = $$('.quote'), dots = $$('#qDots button'), qi = 0, qPaused = reduced, qBox = $('#quotes'), qHover = false;
  function showQ(n) {
    qi = (n + qs.length) % qs.length;
    qs.forEach(function (q, k) { q.classList.toggle('on', k === qi); });
    dots.forEach(function (d, k) {
      d.classList.remove('on', 'done');
      if (k < qi || (reduced && k === qi)) d.classList.add('done');
    });
    if (!reduced) { void qBox.offsetWidth; dots[qi].classList.add('on'); }
  }
  dots.forEach(function (d, k) {
    d.addEventListener('click', function () { showQ(k); });
    d.firstChild.addEventListener('animationend', function () { if (d.classList.contains('on')) { d.classList.remove('on'); d.classList.add('done'); showQ(qi + 1); } });
  });
  $('#qPrev').addEventListener('click', function () { showQ(qi - 1); });
  $('#qNext').addEventListener('click', function () { showQ(qi + 1); });
  var qp = $('#qPause');
  function syncQ() { qBox.classList.toggle('paused', qPaused || qHover); qp.textContent = qPaused ? 'Play' : 'Pause'; qp.setAttribute('aria-pressed', qPaused); }
  qp.addEventListener('click', function () { qPaused = !qPaused; syncQ(); });
  qBox.addEventListener('mouseenter', function () { qHover = true; syncQ(); });
  qBox.addEventListener('mouseleave', function () { qHover = false; syncQ(); });
  qBox.addEventListener('focusin', function () { qHover = true; syncQ(); });
  qBox.addEventListener('focusout', function () { qHover = false; syncQ(); });
  syncQ(); showQ(0);

  /* ---------- pricing ---------- */
  var yearly = true, togBtns = $$('#billToggle button'), pill = $('#pill');
  function movePill() { var b = $('#billToggle button[aria-pressed="true"]'); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (b.offsetLeft - 4) + 'px)'; }
  var priceEl = $('[data-price]'), curPrice = 399;
  function setPrice() {
    var to = parseInt(priceEl.dataset[yearly ? 'y' : 'm'], 10);
    tween(curPrice, to, 700, function (v) { priceEl.textContent = '$' + Math.round(v); }, function () { curPrice = to; });
    curPrice = to;
  }
  togBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      yearly = b.dataset.bill === 'y';
      togBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      movePill(); setPrice(); calc();
    });
  });
  movePill(); window.addEventListener('resize', movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);

  var range = $('#calcRange'), outEl = $('#calcOut'), volEl = $('#calcVol'), noteEl = $('#calcNote'), shown = 399;
  function calc() {
    var t = +range.value, raw = Math.pow(10, 5 + t * 3 / 100);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
    var vol = Math.round(raw / mag / 5) * 5 * mag; // 2 sig figs, snapped
    if (t >= 100) vol = 100000000;
    var base = yearly ? 399 : 499, cost = base;
    if (vol > 2000000) cost += (vol - 2000000) / 1000 * 0.12;
    cost = Math.round(cost);
    range.style.setProperty('--p', t + '%');
    volEl.textContent = vol.toLocaleString('en-US');
    noteEl.textContent = vol > 50000000 ? 'contact sales for volume pricing' : (yearly ? 'per month, billed annually' : 'per month, billed monthly');
    tween(shown, cost, 380, function (v) { outEl.textContent = '$' + Math.round(v).toLocaleString('en-US'); });
    shown = cost;
  }
  range.addEventListener('input', calc);
  range.style.setProperty('--p', range.value + '%');
  calc();

  /* ---------- signup form ---------- */
  var form = $('#signupForm'), msg = $('#formMsg'), email = $('#email');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = email.value.trim();
    form.classList.remove('err'); void form.offsetWidth;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      form.classList.add('err'); msg.className = 'form-msg bad';
      msg.textContent = 'Enter a valid work email, like you@company.com.';
      email.focus(); return;
    }
    var btn = $('button', form); btn.disabled = true; btn.firstChild.textContent = 'Creating sandbox… ';
    msg.className = 'form-msg'; msg.textContent = '';
    setTimeout(function () {
      btn.disabled = false; btn.firstChild.textContent = 'Get API keys ';
      msg.className = 'form-msg ok';
      msg.textContent = '✓ Sandbox ready. Keys would be sent to ' + v + '. (Demo form: nothing was submitted.)';
      form.reset();
    }, reduced ? 0 : 1000);
  });
  email.addEventListener('input', function () { form.classList.remove('err'); });
})();
