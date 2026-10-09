/* Ledgerline — interactions and motion. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { paused: mqReduce.matches, reduced: mqReduce.matches };
  const fmt = new Intl.NumberFormat('en-US');
  const usd = (n, d = 0) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ---------- global motion control ---------- */
  const motionBtn = $('#motionBtn'), motionLbl = $('#motionLbl');
  const listeners = [];
  function setPaused(p) {
    state.paused = p;
    root.dataset.motion = p ? 'paused' : 'running';
    motionBtn.setAttribute('aria-pressed', String(p));
    motionBtn.setAttribute('aria-label', p ? 'Play motion' : 'Pause motion');
    motionLbl.textContent = p ? 'Play motion' : 'Pause motion';
    const svg = $('#consensus');
    if (svg && svg.pauseAnimations) p ? svg.pauseAnimations() : svg.unpauseAnimations();
    listeners.forEach(f => f(p));
  }
  motionBtn.addEventListener('click', () => setPaused(!state.paused));
  mqReduce.addEventListener?.('change', e => { state.reduced = e.matches; setPaused(e.matches); });

  /* ---------- word-split headlines ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
    $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  }
  $$('.split').forEach(splitWords);

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal],.split').forEach(el => { if (el.id !== 'h1') io.observe(el); });
  const startHero = () => $('#h1').classList.add('in');
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve())
    .then(() => requestAnimationFrame(startHero));

  /* "in view" for run-once triggers (code, key terminal) */
  const runIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('run'); runIO.unobserve(e.target); }
  }), { threshold: 0.35 });
  $$('.keyterm').forEach(el => runIO.observe(el));
  if (state.reduced) $$('.keyterm').forEach(el => el.classList.add('run'));

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
    if (state.reduced || to === 0) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1800;
    const tick = now => {
      const p = clamp((now - t0) / dur, 0, 1), eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- nav, progress, menu ---------- */
  const nav = $('#nav'), bar = $('#progress'), grid = $('#heroGrid');
  const sections = ['product', 'api', 'reliability', 'security', 'customers', 'pricing'].map(id => $('#' + id));
  const links = $$('.nav-links a');
  const flowSec = $('#flow-sec');
  let ticking = false;
  const stepEls = $$('.step'), panels = $$('.fpanel'), fStatus = $('#fStatus');
  const statusText = ['Received', 'Authorized', 'Held', 'Posted', 'Settled'];
  let curStep = -1;
  function setStep(s) {
    if (s === curStep) return; curStep = s;
    stepEls.forEach((el, i) => el.classList.toggle('on', i <= s && i === s));
    panels.forEach(p => p.classList.toggle('on', +p.dataset.min <= s + 1));
    fStatus.textContent = statusText[s + 1] ?? statusText[0];
    fStatus.dataset.s = String(s + 1);
  }
  setStep(0);
  function onScroll() {
    ticking = false;
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    nav.classList.toggle('scrolled', y > 20);
    if (!state.reduced && y < innerHeight * 1.2) grid.style.transform = `translate3d(0,${y * 0.18}px,0)`;
    let cur = null; sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s.id; });
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    if (!root.classList.contains('no-sticky')) {
      const r = flowSec.getBoundingClientRect();
      const total = flowSec.offsetHeight - innerHeight;
      const p = clamp(-r.top / Math.max(1, total), 0, 1);
      flowSec.style.setProperty('--fp', p.toFixed(3));
      $('#steps').style.setProperty('--fp', clamp(p * 1.15, 0, 1).toFixed(3));
      setStep(clamp(Math.floor(p * 4.0), 0, 3));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  const applySticky = () => root.classList.toggle('no-sticky', state.reduced || innerHeight < 560);
  applySticky(); addEventListener('resize', applySticky); onScroll();

  const burger = $('#burger'), mmenu = $('#mmenu');
  const toggleMenu = open => {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    mmenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu(!root.classList.contains('menu-open')));
  $$('a', mmenu).forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

  /* ---------- card spotlight + magnetic buttons ---------- */
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  if (!state.reduced && matchMedia('(pointer:fine)').matches) {
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.32;
        b.style.transform = `translate(${x}px,${y}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- logo marquee ---------- */
  const track = $('#logoTrack');
  [...track.children].forEach(c => { const n = c.cloneNode(true); n.setAttribute('aria-hidden', 'true'); track.append(n); });

  /* ---------- hero canvas flow ---------- */
  (function hero() {
    const stage = $('#stage'), cv = $('#flow'), ctx = cv.getContext('2d');
    const L = $$('[data-node="l"]', stage), R = $$('[data-node="r"]', stage), card = $('#ledgerCard');
    const feed = $('#feed'), cE = $('#cEntries'), cV = $('#cVol');
    let W = 0, H = 0, lp = [], rp = [], parts = [], visible = true, last = 0, spawnT = 0, entries = 0, volume = 0, raf = 0;
    const amounts = [18.5, 42, 75.1, 120, 250, 420, 640, 1250, 2400, 89.99, 19.99, 310];
    const rails = ['card → wallet', 'ach → wallet', 'wire → ops', 'wallet → rtp', 'wallet → bank', 'sub-ledger', 'fednow', 'payout'];

    function measure() {
      const sr = stage.getBoundingClientRect(); W = sr.width; H = sr.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cr = card.getBoundingClientRect();
      const dotPt = el => { const r = $('.dot', el).getBoundingClientRect(); return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top }; };
      const pad = 18;
      lp = L.map((el, i) => ({ a: dotPt(el), b: { x: cr.left - sr.left, y: cr.top - sr.top + pad + (cr.height - pad * 2) * (i + 0.5) / L.length } }));
      rp = R.map((el, i) => ({ a: { x: cr.right - sr.left, y: cr.top - sr.top + pad + (cr.height - pad * 2) * (i + 0.5) / R.length }, b: dotPt(el), el }));
      if (state.paused) draw();
    }
    const pt = (p, t) => {
      const { a, b } = p, mx = a.x + (b.x - a.x) * 0.5, u = 1 - t;
      return { x: u*u*u*a.x + 3*u*u*t*mx + 3*u*t*t*mx + t*t*t*b.x, y: u*u*u*a.y + 3*u*u*t*a.y + 3*u*t*t*b.y + t*t*t*b.y };
    };
    function spawn(side, idx) {
      const paths = side === 'l' ? lp : rp; if (!paths.length) return;
      const i = idx ?? Math.floor(Math.random() * paths.length);
      parts.push({ side, i, t: 0, v: (side === 'l' ? 0.00052 : 0.00062) * (0.85 + Math.random() * 0.4), amt: amounts[Math.floor(Math.random() * amounts.length)] });
    }
    function land(p) {
      if (p.side === 'l') {
        card.classList.add('pulse'); setTimeout(() => card.classList.remove('pulse'), 260);
        post(p.amt);
        spawn('r');
        parts[parts.length - 1].amt = p.amt;
      } else {
        const el = rp[p.i].el; el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 520);
      }
    }
    function post(amt) {
      entries += 2; volume += amt; cE.textContent = fmt.format(entries); cV.textContent = usd(Math.round(volume));
      const li = document.createElement('li');
      const id = 'pay_' + Math.random().toString(36).slice(2, 8);
      li.innerHTML = `<span>${id} · ${rails[Math.floor(Math.random() * rails.length)]}</span><span class="amt">+${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span><span class="ms">${8 + Math.floor(Math.random() * 38)}ms</span>`;
      feed.prepend(li); while (feed.children.length > 4) feed.lastChild.remove();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(238,242,234,.09)';
      [...lp, ...rp].forEach(p => {
        const mx = p.a.x + (p.b.x - p.a.x) * 0.5;
        ctx.beginPath(); ctx.moveTo(p.a.x, p.a.y); ctx.bezierCurveTo(mx, p.a.y, mx, p.b.y, p.b.x, p.b.y); ctx.stroke();
      });
      parts.forEach(p => {
        const path = (p.side === 'l' ? lp : rp)[p.i]; if (!path) return;
        for (let k = 14; k >= 0; k--) {
          const t = clamp(p.t - k * 0.014, 0, 1), q = pt(path, t), a = (1 - k / 15);
          ctx.beginPath(); ctx.fillStyle = `rgba(196,255,90,${a * a * 0.55})`;
          ctx.arc(q.x, q.y, k === 0 ? 3.4 : 2.4 * a + 0.4, 0, 6.283); ctx.fill();
        }
        const q = pt(path, p.t);
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 16); g.addColorStop(0, 'rgba(196,255,90,.5)'); g.addColorStop(1, 'rgba(196,255,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 16, 0, 6.283); ctx.fill();
      });
    }
    function frame(now) {
      raf = 0;
      if (state.paused || !visible) { last = 0; return; }
      const dt = Math.min(48, last ? now - last : 16); last = now;
      spawnT -= dt; if (spawnT <= 0) { spawn('l'); spawnT = 420 + Math.random() * 520; }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += p.v * dt * 1.6;
        if (p.t >= 1) { parts.splice(i, 1); land(p); }
      }
      draw(); raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && !state.paused && visible) raf = requestAnimationFrame(frame); };
    function reset() {
      parts = []; entries = 0; volume = 0; cE.textContent = '0'; cV.textContent = '$0'; feed.innerHTML = ''; spawnT = 0;
      if (state.paused && !state.reduced) setPaused(false);
      spawn('l', 0); spawn('l', 2); kick(); if (state.paused) { staticFill(); }
    }
    function staticFill() {
      parts = [];
      for (let i = 0; i < L.length; i++) { spawn('l', i); parts[parts.length - 1].t = 0.25 + 0.5 * Math.random(); }
      for (let i = 0; i < R.length; i++) { spawn('r', i); parts[parts.length - 1].t = 0.3 + 0.4 * Math.random(); }
      [1250, 420, 75.1, 2400].forEach(a => post(a)); draw();
    }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0.05 }).observe(stage);
    new ResizeObserver(measure).observe(stage);
    listeners.push(p => { if (p) { cancelAnimationFrame(raf); raf = 0; } else { last = 0; kick(); } });
    $('#replay').addEventListener('click', reset);
    measure();
    if (state.paused) staticFill(); else { spawn('l', 1); spawn('l', 3); kick(); }
  })();

  /* ---------- events stream ---------- */
  (function events() {
    const box = $('#events'); if (!box) return;
    const names = ['payment.created', 'payment.authorized', 'entry.posted', 'balance.updated', 'payment.settled', 'payout.sent', 'recon.matched', 'account.funded'];
    let n = 0, timer = 0, visible = false;
    const add = () => {
      const d = document.createElement('div');
      const id = (Math.random().toString(36).slice(2, 7));
      d.innerHTML = `<b>●</b><span>${names[n++ % names.length]}</span><span>evt_${id}</span>`;
      box.prepend(d); while (box.children.length > 7) box.lastChild.remove();
    };
    for (let i = 0; i < 6; i++) add();
    const go = () => { clearInterval(timer); if (!state.paused && visible) timer = setInterval(add, 1300); };
    new IntersectionObserver(es => { visible = es[0].isIntersecting; go(); }).observe(box);
    listeners.push(go);
  })();

  /* ---------- API tabs + replay ---------- */
  (function api() {
    const tabs = $$('.tab'), panes = $$('[data-pane]'), resp = $('#resp'), st = $('#respStatus'), ms = $('#respMs'), btn = $('#runBtn');
    const grid = $('#apiGrid');
    function replay(pane) {
      pane.classList.remove('run');
      void pane.offsetWidth;
      pane.classList.add('run');
    }
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.setAttribute('aria-selected', String(x === t)));
      panes.forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; });
      const pane = $(`[data-pane="${t.dataset.tab}"]`); replay(pane);
    }));
    function send() {
      const pane = panes.find(p => !p.hidden);
      resp.classList.remove('ready', 'run'); st.textContent = 'sending…'; st.classList.add('wait'); ms.textContent = '';
      replay(pane);
      const wait = state.reduced ? 0 : 650;
      setTimeout(() => {
        resp.classList.add('ready'); void resp.offsetWidth; resp.classList.add('run');
        st.classList.remove('wait'); st.textContent = '201 Created'; ms.textContent = (30 + Math.floor(Math.random() * 18)) + ' ms';
      }, wait);
    }
    btn.addEventListener('click', send);
    // first reveal: hold lines until section scrolls into view
    const panesAll = [...panes, resp];
    if (!state.reduced) panesAll.forEach(p => p.classList.remove('run'));
    new IntersectionObserver((es, o) => {
      if (es[0].isIntersecting) { o.disconnect(); const pane = panes.find(p => !p.hidden); pane.classList.add('run'); setTimeout(() => resp.classList.add('run'), 700); }
    }, { threshold: 0.3 }).observe(grid);
  })();

  /* ---------- uptime bars + readout ---------- */
  (function uptime() {
    const box = $('#uptime'), read = $('#upRead'); if (!box) return;
    const bad = { 23: 'Elevated webhook latency · 14 min', 61: 'Partial RTP degradation · 9 min' };
    const today = new Date('2026-10-08T00:00:00Z');
    for (let i = 0; i < 90; i++) {
      const d = new Date(today - (89 - i) * 864e5), el = document.createElement('i');
      el.style.setProperty('--k', i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      el.dataset.t = label + ' · ' + (bad[i] || '100% operational');
      if (bad[i]) el.className = 'w';
      box.append(el);
    }
    box.addEventListener('pointerover', e => { if (e.target.dataset.t) read.innerHTML = `<b>${e.target.dataset.t}</b>`; });
    box.addEventListener('pointerleave', () => { read.textContent = 'Hover a day'; });
  })();

  /* ---------- consensus diagram ---------- */
  (function consensus() {
    const svg = $('#consensus'); if (!svg) return;
    const nodes = [
      { n: 'iad', x: 220, y: 56, lead: true }, { n: 'fra', x: 66, y: 112 }, { n: 'sin', x: 374, y: 112 },
      { n: 'gru', x: 112, y: 214 }, { n: 'sfo', x: 328, y: 214 }
    ];
    const NS = 'http://www.w3.org/2000/svg';
    let h = '';
    nodes.slice(1).forEach((f, i) => {
      h += `<path id="pp${i}" class="ln2" d="M${nodes[0].x} ${nodes[0].y} L${f.x} ${f.y}"/>`;
      h += `<path id="pb${i}" d="M${f.x} ${f.y} L${nodes[0].x} ${nodes[0].y}" fill="none"/>`;
    });
    nodes.slice(1).forEach((f, i) => { // outbound write
      h += `<circle r="4" fill="#c4ff5a"><animateMotion dur="3.6s" begin="${(i * 0.12).toFixed(2)}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.35;1" calcMode="linear"><mpath href="#pp${i}"/></animateMotion><animate attributeName="opacity" dur="3.6s" begin="${(i * 0.12).toFixed(2)}s" values="1;1;0;0" keyTimes="0;0.34;0.36;1" repeatCount="indefinite"/></circle>`;
    });
    nodes.slice(1).forEach((f, i) => { // acks back, staggered by latency
      const b = 1.4 + i * 0.28;
      h += `<circle r="3.2" fill="#eef2ea"><animateMotion dur="3.6s" begin="${b.toFixed(2)}s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.0001;0.3;1" calcMode="linear"><mpath href="#pb${i}"/></animateMotion><animate attributeName="opacity" dur="3.6s" begin="${b.toFixed(2)}s" values="0;1;1;0;0" keyTimes="0;0.01;0.29;0.31;1" repeatCount="indefinite"/></circle>`;
    });
    nodes.forEach(nd => {
      h += `<g><circle class="nd ${nd.lead ? 'lead' : ''}" cx="${nd.x}" cy="${nd.y}" r="${nd.lead ? 24 : 19}"/><text x="${nd.x}" y="${nd.y + 4}" text-anchor="middle" style="fill:${nd.lead ? '#c4ff5a' : '#8a949d'}">${nd.n}</text></g>`;
    });
    svg.innerHTML = h;
    if (state.paused && svg.pauseAnimations) svg.pauseAnimations();
  })();

  /* ---------- testimonials ---------- */
  (function quotes() {
    const q = $('#quotes'), prev = $('#qPrev'), next = $('#qNext'), bar = $('#qBar');
    const step = () => (q.firstElementChild?.getBoundingClientRect().width || 500) + 16;
    prev.addEventListener('click', () => q.scrollBy({ left: -step(), behavior: state.reduced ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => q.scrollBy({ left: step(), behavior: state.reduced ? 'auto' : 'smooth' }));
    const upd = () => {
      const max = q.scrollWidth - q.clientWidth, p = max > 0 ? q.scrollLeft / max : 0, w = clamp(q.clientWidth / q.scrollWidth, 0.15, 1);
      bar.style.width = (w * 100) + '%'; bar.style.transform = `translateX(${p * (1 / w - 1) * 100}%)`;
    };
    q.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    q.addEventListener('keydown', e => { if (e.key === 'ArrowRight') next.click(); if (e.key === 'ArrowLeft') prev.click(); });
    // drag to scroll with a mouse
    let down = false, sx = 0, sl = 0;
    q.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = q.scrollLeft; q.style.scrollSnapType = 'none'; q.style.cursor = 'grabbing'; });
    addEventListener('pointermove', e => { if (down) q.scrollLeft = sl - (e.clientX - sx); });
    addEventListener('pointerup', () => { if (!down) return; down = false; q.style.scrollSnapType = ''; q.style.cursor = ''; });
  })();

  /* ---------- pricing ---------- */
  (function pricing() {
    const tg = $('#prToggle'), btns = $$('button', tg), thumb = $('#prThumb'), gp = $('#growthPrice');
    function place() {
      const b = btns.find(x => x.getAttribute('aria-pressed') === 'true');
      thumb.style.setProperty('--tw', b.offsetWidth + 'px'); thumb.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    }
    let cur = 499, annual = false;
    function roll(to) {
      const from = cur; cur = to;
      if (state.reduced) { gp.textContent = to; return; }
      const t0 = performance.now();
      const tick = now => { const p = clamp((now - t0) / 700, 0, 1), e = 1 - Math.pow(1 - p, 4); gp.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      annual = b.dataset.bill === 'a'; place(); roll(+gp.dataset[annual ? 'a' : 'm']); calc();
    }));
    const range = $('#calcRange'), out = $('#calcOut'), nEl = $('#calcN'), cbB = $('#cbBase'), cbU = $('#cbUse');
    function calc() {
      const v = +range.value, M = Math.max(1, Math.round(Math.pow(10, v / 100 * 3 + 0.0)));
      const snapped = M < 10 ? M : M < 100 ? Math.round(M / 5) * 5 : Math.round(M / 50) * 50;
      const base = +gp.dataset[annual ? 'a' : 'm'], use = Math.max(0, snapped - 5) * 1000 * 0.04;
      nEl.textContent = snapped >= 1000 ? '1B' : snapped + 'M';
      out.textContent = usd(Math.round(base + use)); cbB.textContent = usd(base); cbU.textContent = usd(Math.round(use));
      range.style.setProperty('--p', v + '%');
    }
    range.addEventListener('input', calc);
    addEventListener('resize', place);
    (document.fonts?.ready || Promise.resolve()).then(place); place(); calc();
  })();

  /* ---------- signup form (demo) ---------- */
  (function form() {
    const f = $('#sform'), email = $('#fEmail'), err = $('#fErr'), box = $('#keybox');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      email.setAttribute('aria-invalid', String(!ok));
      err.textContent = ok ? '' : 'Enter a valid work email address.';
      if (!ok) { email.focus(); return; }
      box.textContent = 'sk_test_demo_' + Array.from({ length: 12 }, () => '•').join('');
      f.classList.add('done');
    });
    email.addEventListener('input', () => { email.removeAttribute('aria-invalid'); err.textContent = ''; });
    $('#again').addEventListener('click', () => { f.classList.remove('done'); f.reset(); email.focus(); });
  })();
})();
