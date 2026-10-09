/* Ledgerline site behaviour. Builds on motion-kit.js (reveals, counts, spotlight, magnetic, marquee, nav). */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const money = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- split headings into masked words (keeps <em>) ---------- */
  function splitWords(el) {
    let i = 0;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const out = document.createElement('div');
    const walk = (node, parent) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { parent.append(' '); return; }
            const m = document.createElement('span'); m.className = 'w'; m.setAttribute('aria-hidden', 'true');
            const s = document.createElement('span'); s.className = 'wi'; s.style.setProperty('--i', i++); s.textContent = tok;
            m.append(s); parent.append(m);
          });
        } else if (n.nodeType === 1) {
          const c = n.cloneNode(false); parent.append(c); walk(n, c);
        }
      });
    };
    walk(el, out);
    el.innerHTML = out.innerHTML;
    el.setAttribute('aria-label', label);
  }
  $$('[data-words]').forEach(splitWords);

  /* ---------- generic in-view triggers ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); if (!e.target.hasAttribute('data-live')) io.unobserve(e.target); }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-words], .bars, .chain').forEach((el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => $$('[data-words], .bars, .chain').forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('is-in'); }), 400));

  // ambient loops only run while visible
  const liveIO = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('live', e.isIntersecting)), { threshold: 0.2 });
  $$('[data-live]').forEach((el) => liveIO.observe(el));

  /* ---------- hero choreography ---------- */
  const go = () => root.classList.add('go');
  requestAnimationFrame(() => requestAnimationFrame(go));
  $$('#heroCode .cl').forEach((l, i) => l.style.setProperty('--d', 380 + i * 80));
  setTimeout(() => $$('#heroCode .cl').forEach((l) => l.classList.add('on')), 30);
  setTimeout(() => $('#heroStatus').classList.add('on'), 800);

  /* ---------- live ledger feed ---------- */
  const feed = $('#feed'), counter = $('#entryCount');
  const samples = [
    ['payer_17 → merch_02', '$18.40'], ['wallet_90 → fees', '$0.54'], ['escrow_5 → merch_44', '$1,250.00'],
    ['payer_63 → merch_09', '$74.99'], ['payroll_1 → wallet_31', '$2,310.25'], ['payer_08 → merch_12', '$9.00'],
    ['merch_44 → bank_out', '$4,880.10'], ['wallet_22 → wallet_71', '$35.00'],
  ];
  let n = 0, count = 1284330, txn = 0x7c3e1;
  function pushEntry() {
    const [route, amt] = samples[n++ % samples.length];
    const li = document.createElement('li'); li.className = 'fresh';
    li.innerHTML = `<span class="tx">tx_${(++txn).toString(16)}</span><span class="route">${route}</span><span class="amt">${amt}</span>`;
    feed.style.transition = 'none'; feed.prepend(li);
    feed.style.transform = 'translate3d(0,-44px,0)';
    void feed.offsetHeight;
    feed.style.transition = 'transform 420ms var(--ease-out)'; feed.style.transform = 'translate3d(0,0,0)';
    while (feed.children.length > 6) feed.lastElementChild.remove();
    setTimeout(() => li.classList.remove('fresh'), 1400);
    count += 1 + Math.floor(Math.random() * 6); counter.textContent = count.toLocaleString('en-US');
  }
  let feedTimer = null, heroVisible = true;
  let armed = false;
  const startFeed = () => { if (armed && !feedTimer && !reduce && heroVisible && !document.hidden) feedTimer = setInterval(pushEntry, 2600); };
  const stopFeed = () => { clearInterval(feedTimer); feedTimer = null; };
  new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; heroVisible ? startFeed() : stopFeed(); }).observe($('#console'));
  document.addEventListener('visibilitychange', () => (document.hidden ? stopFeed() : startFeed()));
  setTimeout(() => { armed = true; startFeed(); }, 3600);

  /* ---------- mobile menu ---------- */
  const menuBtn = $('#menuBtn'), links = $('#navLinks');
  const setMenu = (open) => { menuBtn.setAttribute('aria-expanded', String(open)); links.classList.toggle('open', open); };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- sliding-indicator segmented controls ---------- */
  function ink(group, selector, activeAttr) {
    const el = $('.tab-ink', group);
    const move = () => {
      const active = $(`${selector}[${activeAttr}="true"]`, group);
      if (!active) return;
      const inner = group.clientWidth - 8, left = active.offsetLeft - 4;
      el.style.setProperty('--l', left + 'px');
      el.style.setProperty('--r', Math.max(0, inner - left - active.offsetWidth) + 'px');
    };
    el.style.transition = 'none'; move(); void el.offsetWidth; el.style.transition = '';
    addEventListener('resize', move);
    if (document.fonts) document.fonts.ready.then(() => { el.style.transition = 'none'; move(); void el.offsetWidth; el.style.transition = ''; });
    return move;
  }

  /* ---------- API tabs + simulated run ---------- */
  const tabs = $('#tabs'), tabBtns = $$('[role=tab]', tabs);
  const moveTabs = ink(tabs, '[role=tab]', 'aria-selected');
  function selectTab(tab) {
    tabBtns.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).classList.toggle('is-active', on);
    });
    moveTabs();
  }
  tabBtns.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabBtns[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabBtns.length) % tabBtns.length];
      next.focus(); selectTab(next); e.preventDefault();
    });
  });
  const resp = $('#resp'), runBtn = $('#runBtn'), runLabel = $('#runLabel');
  $$('.rl', resp).forEach((l, i) => l.style.setProperty('--i', i));
  function run() {
    if (runBtn.classList.contains('is-busy')) return;
    resp.classList.remove('done'); runBtn.classList.add('is-busy'); runLabel.textContent = 'Posting…';
    setTimeout(() => {
      $('#respTime').textContent = (34 + Math.floor(Math.random() * 9)) + ' ms';
      resp.classList.add('done'); runBtn.classList.remove('is-busy'); runLabel.textContent = 'Run again';
      $('#runMeta').textContent = 'simulated response · balanced';
    }, reduce ? 0 : 560);
  }
  runBtn.addEventListener('click', run);
  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { setTimeout(run, 500); o.disconnect(); } }, { threshold: 0.35 }).observe(resp);

  /* ---------- uptime bars ---------- */
  const bars = $('#bars'), cap = $('#upCap');
  const deg = { 31: '99.982% · 4 min partial degradation, writes consistent', 64: '99.991% · 2 min elevated latency, no failed commits' };
  for (let i = 1; i <= 90; i++) {
    const b = document.createElement('i'); b.style.setProperty('--i', i);
    if (deg[i]) b.className = 'deg';
    b.dataset.day = i; bars.append(b);
  }
  bars.addEventListener('pointerover', (e) => {
    const d = e.target.dataset && e.target.dataset.day; if (!d) return;
    cap.textContent = `${90 - d} days ago · ${deg[d] || '100.000%'}`;
  });
  bars.addEventListener('pointerleave', () => { cap.textContent = 'Hover a day for detail'; });

  /* ---------- manifesto words ---------- */
  const man = $('#manifesto');
  const words = man.textContent.trim().split(/\s+/);
  man.setAttribute('aria-label', words.join(' '));
  man.innerHTML = words.map((w, i) => `<span aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');

  /* ---------- pricing toggle ---------- */
  const bill = $('#bill'), billBtns = $$('button', bill);
  const moveBill = ink(bill, 'button', 'aria-pressed');
  const nums = $$('.num');
  const tween = (el, to) => {
    const from = parseFloat(el.dataset.shown ?? el.textContent.replace(/[^0-9.]/g, '')) || 0;
    el.dataset.shown = to;
    if (reduce || from === to) { el.textContent = '$' + to; return; }
    const t0 = performance.now(), dur = 520;
    const step = (now) => {
      const t = clamp((now - t0) / dur);
      el.textContent = '$' + Math.round(from + (to - from) * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(step); else el.dataset.shown = to;
    };
    requestAnimationFrame(step);
  };
  billBtns.forEach((b) => b.addEventListener('click', () => {
    billBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    moveBill();
    nums.forEach((el) => tween(el, Number(el.dataset[b.dataset.period])));
  }));

  /* ---------- sign-up form ---------- */
  const form = $('#signupForm'), msg = $('#formMsg'), email = $('#email');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    msg.className = 'form-msg ' + (ok ? 'good' : 'err');
    msg.textContent = ok ? 'Sandbox ready (demo). In a live build, your keys would be on their way.' : 'Enter a valid work email to continue.';
    if (!ok) email.focus();
  });

  /* ---------- signature story ---------- */
  const story = $('#product');
  const stepEls = $$('.step', story);
  const rails = ['p1', 'p2', 'p3'].map((id) => { const el = document.getElementById(id); return { el, len: el.getTotalLength() }; });
  const coins = ['c1', 'c2', 'c3'].map((id) => document.getElementById(id));
  const rows = $$('.er[data-row]', story), sumRow = $('#sumRow'), toast = $('#toast');
  const nodes = { payer: $('#nPayer'), merch: $('#nMerch'), fees: $('#nFees'), core: $('#nCore') };
  const stateText = ['idempotency key received', 'posting entries', 'asserting debits = credits', 'committed · v8841207'];
  const coreText = ['awaiting commit', 'writing entries…', 'Σ debits = Σ credits', 'committed'];
  let lastIdx = -1;
  const live = $('#stepLive');
  function swapLive(idx) {
    const s = stepEls[idx];
    const fill = () => {
      live.querySelector('.n').textContent = s.querySelector('.step-n').textContent + ' / 04';
      live.querySelector('h3').textContent = s.querySelector('h3').textContent;
      live.querySelector('p').textContent = s.querySelector('p').textContent;
      live.classList.remove('swap');
    };
    if (reduce || lastIdx === 0 && !live.dataset.ready) { fill(); live.dataset.ready = '1'; return; }
    live.classList.add('swap'); setTimeout(fill, 160);
  }

  function renderStory(p) {
    const idx = p < 0.25 ? 0 : p < 0.52 ? 1 : p < 0.76 ? 2 : 3;
    if (idx !== lastIdx) {
      lastIdx = idx;
      stepEls.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      swapLive(idx);
      $('#lcState').textContent = stateText[idx]; $('#coreSub').textContent = coreText[idx];
    }
    const t = [seg(p, 0.02, 0.22), seg(p, 0.27, 0.45), seg(p, 0.31, 0.49)];
    rails.forEach((r, i) => {
      r.el.style.strokeDashoffset = (1 - t[i]).toFixed(4);
      const pt = r.el.getPointAtLength(r.len * t[i]);
      coins[i].setAttribute('cx', pt.x.toFixed(1)); coins[i].setAttribute('cy', pt.y.toFixed(1));
      coins[i].style.opacity = t[i] > 0.005 && t[i] < 0.995 ? 1 : 0;
    });
    nodes.payer.classList.toggle('hit', t[0] > 0.01);
    nodes.core.classList.toggle('hit', t[0] >= 1);
    nodes.merch.classList.toggle('hit', t[1] >= 1);
    nodes.fees.classList.toggle('hit', t[2] >= 1);
    [0.28, 0.35, 0.41].forEach((th, i) => rows[i].classList.toggle('on', p > th));
    sumRow.classList.toggle('on', p > 0.55);
    toast.classList.toggle('on', p > 0.8);
    $('#b0').textContent = money(1240 - 100 * seg(p, 0.28, 0.4));
    $('#b1').textContent = money(380 + 97.1 * seg(p, 0.35, 0.47));
    $('#b2').textContent = money(12.4 + 2.9 * seg(p, 0.41, 0.5));
  }

  /* ---------- scroll loop (one rAF, passive) ---------- */
  const navProgress = $('#navProgress'), signupLine = $('.signup-line'), signup = $('#start');
  let queued = false;
  function frame() {
    queued = false;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    navProgress.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (!reduce) {
      const r = story.getBoundingClientRect();
      if (r.bottom > -vh && r.top < vh * 2) renderStory(clamp(-r.top / (r.height - vh)));
    }
    const sr = signup.getBoundingClientRect();
    signupLine.style.setProperty('--lp', reduce ? 1 : clamp((vh - sr.top) / (vh * 0.9)).toFixed(3));
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  if (reduce) renderStory(1);
  frame();
})();
