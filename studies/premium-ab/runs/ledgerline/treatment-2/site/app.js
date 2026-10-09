/* Ledgerline — page behaviour. Dependency-free; motion-kit.js handles generic reveals. */
(() => {
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const ease = (t) => 1 - Math.pow(1 - t, 4);

  /* ---------- hero entrance ---------- */
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add('is-ready')));
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 90))]).then(ready);

  /* ---------- number roll helper ---------- */
  function roll(el, to, { duration = 520, decimals = 2, prefix = '' } = {}) {
    const from = parseFloat(el.dataset.v ?? '0') || 0;
    el.dataset.v = to;
    if (reduce.matches || from === to) { el.textContent = prefix + fmt(to, decimals); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / duration);
      el.textContent = prefix + fmt(from + (to - from) * ease(t), decimals);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- hero: streaming ledger ---------- */
  (() => {
    const list = $('#ledgerList');
    if (!list) return;
    const sumDr = $('#sumDr'), sumCr = $('#sumCr');
    const ROW = window.matchMedia('(max-width: 560px)').matches ? 42 : 42;
    const memos = [
      ['Card capture', 'acct_cus_5aa', 'acct_mrc_2d4', 86.4],
      ['Payout to bank', 'acct_mrc_2d4', 'acct_bnk_901', 12450],
      ['Refund #4821', 'acct_mrc_2d4', 'acct_cus_81f', 39.99],
      ['ACH credit', 'acct_bnk_17c', 'acct_cus_0b2', 2300],
      ['Platform fee', 'acct_mrc_c10', 'acct_fee_001', 14.2],
      ['RTP transfer', 'acct_cus_93e', 'acct_mrc_7f0', 1240],
      ['Wallet top-up', 'acct_bnk_17c', 'acct_wlt_6d2', 500],
      ['SEPA Instant', 'acct_cus_e11', 'acct_mrc_2d4', 718.5],
      ['Card capture', 'acct_cus_c3d', 'acct_mrc_a44', 255],
    ];
    let n = 0, dr = 1284306.5, cr = 1284306.5, clock = new Date(2026, 9, 8, 14, 2, 11);
    const time = () => { clock = new Date(clock.getTime() + 1000 + Math.random() * 1800); return clock.toTimeString().slice(0, 8); };
    const row = (t, memo, acct, amount, side) => {
      const li = document.createElement('li');
      li.className = 'ledger-row';
      li.innerHTML = `<span class="t">${t}</span><span class="m">${memo}<small>${acct}</small></span><span class="a ${side}">${side === 'cr' ? '+' : '−'}${fmt(amount)}</span>`;
      return li;
    };
    const pair = () => {
      const [memo, from, to, amount] = memos[n++ % memos.length];
      const t = time();
      return { amount, rows: [row(t, memo, to, amount, 'cr'), row(t, memo, from, amount, 'dr')] };
    };
    for (let i = 0; i < 4; i++) { const p = pair(); p.rows.forEach((r) => list.append(r)); }
    list.append(...[]);
    // seeded rows are oldest-first in DOM; reverse so newest sits on top
    [...list.children].reverse().forEach((r) => list.append(r));
    dr += 0; sumDr.dataset.v = dr; sumCr.dataset.v = cr; sumDr.textContent = fmt(dr); sumCr.textContent = fmt(cr);
    if (reduce.matches) return;

    let timer = null, visible = true;
    const tick = () => {
      if (!visible || document.hidden) return;
      const p = pair();
      p.rows.forEach((r) => r.classList.add('is-new'));
      list.classList.remove('is-shifting');
      list.prepend(p.rows[1]); list.prepend(p.rows[0]);
      list.style.transform = `translate3d(0, ${-ROW * 2}px, 0)`;
      void list.offsetHeight;
      list.classList.add('is-shifting');
      list.style.transform = 'translate3d(0, 0, 0)';
      dr += p.amount; cr += p.amount;
      roll(sumDr, dr); roll(sumCr, cr);
      while (list.children.length > 10) list.lastElementChild.remove();
    };
    const start = () => { if (!timer) timer = setInterval(tick, 2600); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe($('.ledger-card'));
    setTimeout(tick, 2600);
  })();

  /* ---------- manifesto: words light up as you read ---------- */
  const mani = $('#manifesto');
  if (mani) {
    const words = mani.textContent.trim().split(/\s+/);
    mani.setAttribute('aria-label', words.join(' '));
    mani.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  }

  /* ---------- pinned story ---------- */
  const story = $('#story');
  const storyApi = (() => {
    if (!story) return () => {};
    const scene = $('.scene', story), steps = $$('.step', story), entries = $$('.entry', story), nodes = $$('.node', story);
    const base = $('#pipeBase'), packet = $('#packet'), fill = $('#railFill');
    const stateText = $('#stateText'), chip = $('#stateChip'), elapsed = $('#elapsed');
    const len = base.getTotalLength(), x0 = base.getPointAtLength(0).x;
    const names = ['received', 'authorized', 'journaled', 'settled'];
    let last = -1;
    return function update(p) {
      const pp = reduce.matches ? 1 : clamp((p - 0.05) / 0.75);
      const step = Math.round(pp * 3);
      scene.style.setProperty('--p', pp.toFixed(4));
      story.style.setProperty('--sp', clamp(p).toFixed(4));
      const pt = base.getPointAtLength(pp * len);
      packet.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      elapsed.textContent = Math.round(38 * pp);
      nodes.forEach((n, i) => n.classList.toggle('on', pp >= i / 3 - 0.004));
      if (step === last) return;
      last = step;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === step));
      entries.forEach((e) => e.classList.toggle('on', step >= Number(e.dataset.from)));
      stateText.textContent = names[step];
      chip.classList.toggle('is-settled', step === 3);
    };
  })();

  /* ---------- one rAF-throttled scroll loop for custom scroll work ---------- */
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const vh = innerHeight;
      if (story) {
        const r = story.getBoundingClientRect();
        if (r.bottom > -100 && r.top < vh + 100) storyApi(clamp(-r.top / (r.height - vh)));
      }
      if (mani) {
        const r = mani.getBoundingClientRect();
        if (r.bottom > -200 && r.top < vh + 200) mani.style.setProperty('--p', clamp((vh * 0.88 - r.top) / (vh * 0.62)).toFixed(4));
      }
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
  if (reduce.matches) { storyApi(1); mani && mani.style.setProperty('--p', 1); }

  /* ---------- sliding indicator tabs ---------- */
  function slider(group, itemSel, activeTest) {
    const ink = $('.tab-ink', group);
    const place = () => {
      const t = $$(itemSel, group).find(activeTest);
      if (!t || !ink) return;
      ink.style.setProperty('--x', t.offsetLeft + 'px');
      ink.style.setProperty('--w', t.offsetWidth + 'px');
    };
    place();
    requestAnimationFrame(() => requestAnimationFrame(() => ink && ink.classList.add('is-placed')));
    addEventListener('resize', place);
    if (document.fonts) document.fonts.ready.then(place);
    return place;
  }

  /* ---------- API console ---------- */
  (() => {
    const tabs = $('.tabs[role=tablist]');
    if (!tabs) return;
    const btns = $$('[role=tab]', tabs), panels = btns.map((b) => $('#' + b.getAttribute('aria-controls')));
    panels.forEach((p) => p.removeAttribute('hidden'));
    const place = slider(tabs, '[role=tab]', (t) => t.getAttribute('aria-selected') === 'true');
    const show = (i, focus) => {
      btns.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => { p.classList.toggle('is-active', i === j); p.setAttribute('aria-hidden', String(i !== j)); });
      place();
      if (focus) btns[i].focus();
    };
    show(0);
    btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
    tabs.addEventListener('keydown', (e) => {
      const cur = btns.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      if (e.key === 'ArrowRight') { e.preventDefault(); show((cur + 1) % btns.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show((cur - 1 + btns.length) % btns.length, true); }
    });

    const resp = $('#resp'), st = $('#respStatus'), stText = $('#respStatusText'), ms = $('#respMs'), send = $('#sendBtn');
    $$('.rl', resp).forEach((l, i) => l.style.setProperty('--li', i));
    let busy = false;
    const run = () => {
      if (busy) return; busy = true;
      resp.classList.add('is-clear');
      st.classList.add('is-wait'); stText.textContent = 'Sending…'; ms.textContent = '— ms';
      const lat = Math.round(31 + Math.random() * 14);
      setTimeout(() => {
        resp.classList.remove('is-clear');
        st.classList.remove('is-wait'); stText.textContent = '201 Created'; ms.textContent = lat + ' ms';
        busy = false;
      }, reduce.matches ? 60 : 520);
    };
    send.addEventListener('click', run);
    if (!reduce.matches && 'IntersectionObserver' in window) {
      resp.classList.add('is-clear'); stText.textContent = 'Ready'; st.classList.add('is-wait'); ms.textContent = '— ms';
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setTimeout(run, 700); } }, { threshold: 0.4 });
      io.observe(resp);
      setTimeout(() => { if (resp.classList.contains('is-clear') && !busy) run(); }, 12000);
    }
  })();

  /* ---------- uptime bars ---------- */
  (() => {
    const bars = $('#bars');
    if (!bars) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) {
      const b = document.createElement('i');
      b.style.setProperty('--k', i);
      if (i === 61) { b.className = 'warn'; b.style.setProperty('--h', '.58'); }
      frag.append(b);
    }
    bars.append(frag);
    if (reduce.matches || !('IntersectionObserver' in window)) { bars.classList.add('is-in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { bars.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(bars);
  })();

  /* ---------- latency sparkline draw ---------- */
  (() => {
    const tile = $('.tile-latency');
    if (!tile) return;
    if (reduce.matches || !('IntersectionObserver' in window)) { tile.classList.add('is-drawn'); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { tile.classList.add('is-drawn'); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(tile);
  })();

  /* ---------- region failover ---------- */
  (() => {
    const btn = $('#failBtn'), svg = $('#regions'), note = $('#failNote');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Restore IAD' : 'Fail IAD';
      svg.classList.toggle('fail-a', on);
      note.textContent = on ? 'IAD down · rerouted in 1.2 s · 0 entries lost' : 'All regions healthy';
    });
  })();

  /* ---------- pricing toggle ---------- */
  (() => {
    const group = $('.billing');
    if (!group) return;
    const btns = $$('.bill', group), price = $('#scalePrice');
    const place = slider(group, '.bill', (b) => b.classList.contains('is-on'));
    price.dataset.v = price.dataset.monthly;
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      place();
      roll(price, Number(price.dataset[b.dataset.bill]), { decimals: 0, prefix: '$', duration: 600 });
    }));
  })();

  /* ---------- sign-up (demo, no network) ---------- */
  (() => {
    const form = $('#signupForm');
    if (!form) return;
    const input = $('#email'), msg = $('#formMsg');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      msg.classList.toggle('is-error', !ok); msg.classList.toggle('is-ok', ok);
      if (!ok) {
        msg.textContent = 'Enter a valid work email to continue.';
        input.setAttribute('aria-invalid', 'true');
        form.classList.remove('is-shake'); void form.offsetWidth; form.classList.add('is-shake');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      msg.textContent = 'Sandbox requested. This is a demo form, so nothing was sent.';
    });
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); msg.classList.remove('is-error'); msg.textContent = 'Demo form: nothing is sent or stored.'; } });
  })();
})();
