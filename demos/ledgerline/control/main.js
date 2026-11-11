/* ==========================================================================
   Ledgerline — interactions and motion
   Vanilla JS, no dependencies. Everything degrades to a readable static page.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const rand = (a, b) => a + Math.random() * (b - a);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const root = document.documentElement;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { reduced: mqReduce.matches, paused: false };
  const ambientOn = () => !state.reduced && !state.paused && !document.hidden;
  const emitMotion = () => document.dispatchEvent(new Event('ll:motion'));
  const onMotion = fn => { document.addEventListener('ll:motion', fn); document.addEventListener('visibilitychange', fn); };
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', e => { state.reduced = e.matches; emitMotion(); });

  const fmtInt = n => Math.round(n).toLocaleString('en-US');
  const fmtMoney2 = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /** Tween a number into an element. */
  function tween(el, from, to, dur, fmt) {
    cancelAnimationFrame(el._tw);
    if (state.reduced || dur <= 0) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / dur);
      el.textContent = fmt(lerp(from, to, easeOutExpo(t)));
      if (t < 1) el._tw = requestAnimationFrame(step);
    };
    el._tw = requestAnimationFrame(step);
  }

  /* ---------- scroll scheduler ---------- */
  const scrollHandlers = [];
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; scrollHandlers.forEach(h => h()); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  /* ---------- text splitting ---------- */
  function splitWords(el, wordClass, wrap) {
    let idx = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const inner = document.createElement('span');
            inner.className = wordClass;
            inner.textContent = part;
            inner.style.setProperty('--wi', idx++);
            if (wrap) {
              const outer = document.createElement('span');
              outer.className = 'w';
              outer.appendChild(inner);
              frag.appendChild(outer);
            } else frag.appendChild(inner);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return idx;
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    $$('[data-split]').forEach(el => splitWords(el, 'wi', true));
    $$('[data-stagger]').forEach(parent => {
      $$('[data-reveal]', parent).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 7)));
    });
    const targets = $$('[data-reveal], [data-split]:not([data-hero]), [data-wordmark]');
    if (!('IntersectionObserver' in window) || state.reduced) {
      targets.forEach(t => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(t => io.observe(t));
  }

  /* ---------- counters ---------- */
  function initCounters() {
    const els = $$('[data-count]');
    const run = el => {
      const to = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const fmt = v => pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (state.reduced) { el.textContent = fmt(to); return; }
      tween(el, 0, to, 2000, fmt);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    // show the zero state first so there's no flash of the final value
    els.forEach(el => {
      const dec = parseInt(el.dataset.decimals || '0', 10);
      if (!state.reduced) el.textContent = (el.dataset.prefix || '') + (0).toFixed(dec) + (el.dataset.suffix || '');
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  }

  /* ---------- nav ---------- */
  function initNav() {
    const nav = $('#nav');
    const bar = $('.progress i');
    const links = $$('.nav-links a');
    const ind = $('.nav-ind');
    const menu = $('#menu');
    const burger = $('.burger');
    let lastY = scrollY;
    let activeLink = null;

    const place = a => {
      if (!a) { ind.classList.remove('is-on'); return; }
      ind.style.setProperty('--ix', a.offsetLeft + 'px');
      ind.style.setProperty('--iw', a.offsetWidth + 'px');
      ind.classList.add('is-on');
    };
    const rest = () => place(activeLink);
    links.forEach(a => {
      a.addEventListener('pointerenter', () => place(a));
      a.addEventListener('focus', () => place(a));
    });
    $('.nav-links').addEventListener('pointerleave', rest);
    $('.nav-links').addEventListener('focusout', rest);

    const sectionOf = { product: 'product', flow: 'product', developers: 'developers', reliability: 'reliability', customers: 'customers', pricing: 'pricing', faq: 'pricing' };
    const secs = Object.keys(sectionOf).map(id => document.getElementById(id)).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const key = sectionOf[e.target.id];
          activeLink = links.find(a => a.getAttribute('href') === '#' + key) || null;
          links.forEach(a => a.classList.toggle('is-active', a === activeLink));
          rest();
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(s => io.observe(s));
      const hero = $('#top');
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { activeLink = null; links.forEach(a => a.classList.remove('is-active')); rest(); }
      }), { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
    }

    scrollHandlers.push(() => {
      const y = scrollY;
      const max = Math.max(1, root.scrollHeight - innerHeight);
      bar.style.transform = 'scaleX(' + clamp(y / max).toFixed(4) + ')';
      nav.classList.toggle('is-stuck', y > 24);
      const menuOpen = menu.classList.contains('is-open');
      if (!menuOpen) {
        if (y > lastY + 6 && y > 520) nav.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 520) nav.classList.remove('is-hidden');
      }
      lastY = y;
    });

    // mobile menu
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

    addEventListener('resize', rest);
    if (document.fonts) document.fonts.ready.then(rest);
  }

  /* ---------- pointer effects ---------- */
  function initPointer() {
    if (!finePointer.matches) return;
    // magnetic buttons
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (state.reduced) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate(' + (dx * 10).toFixed(1) + 'px,' + (dy * 8).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    // spotlight cards
    $$('[data-spot]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    // hero tilt
    const vis = $('.hero-vis');
    const card = $('#ledger');
    if (vis && card) {
      vis.addEventListener('pointermove', e => {
        if (state.reduced) return;
        const r = vis.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg');
      });
      vis.addEventListener('pointerleave', () => { card.style.setProperty('--ry', '0deg'); card.style.setProperty('--rx', '0deg'); });
    }
  }

  /* ---------- hero intro ---------- */
  function initHero() {
    $$('[data-hero]').forEach(el => el.style.setProperty('--hd', el.dataset.hero));
    const h1 = $('.hero-h1');
    const nav = $('#nav');
    h1.style.setProperty('--sd', '260ms');
    const go = () => {
      root.classList.add('hero-ready');
      nav.classList.add('is-ready');
      h1.classList.add('is-in');
    };
    if (state.reduced) { go(); return; }
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, wait(1500)]).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));
  }

  /* ---------- hero parallax ---------- */
  function initParallax() {
    const copy = $('.hero-copy');
    const vis = $('.hero-vis');
    const bg = $('.hero-bg');
    const ctaH = $('.cta-h');
    scrollHandlers.push(() => {
      if (state.reduced) return;
      const y = scrollY;
      if (y < innerHeight * 1.4) {
        copy.style.translate = '0 ' + (y * 0.1).toFixed(1) + 'px';
        vis.style.translate = '0 ' + (-y * 0.05).toFixed(1) + 'px';
        bg.style.translate = '0 ' + (y * 0.22).toFixed(1) + 'px';
      }
      const r = ctaH.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        ctaH.style.translate = '0 ' + (t * -28).toFixed(1) + 'px';
      }
    });
  }

  /* ---------- ledger "lanes" canvas (hero + CTA) ---------- */
  function lanes(canvas, opt) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rowH = 56, colW = 168, rowOff = 28;
    let w = 0, h = 0, dpr = 1, packets = [], visible = false, raf = 0, last = 0, spawnAcc = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!raf) draw();
    };

    const rowsN = () => Math.max(1, Math.floor((h - rowOff) / rowH));
    const colsN = () => Math.max(1, Math.floor(w / colW));

    const spawn = (initial) => {
      const horizontal = Math.random() < 0.8;
      const len = rand(90, 240);
      const speed = rand(150, 340);
      if (horizontal) {
        const y = rowOff + Math.floor(rand(0, rowsN())) * rowH;
        const dir = Math.random() < 0.88 ? 1 : -1;
        const head = initial ? rand(0, w) : (dir > 0 ? -10 : w + 10);
        packets.push({ h: true, line: y, head, dir, len, speed, branched: false });
      } else {
        const x = Math.floor(rand(1, colsN() + 1)) * colW;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const head = initial ? rand(0, h) : (dir > 0 ? -10 : h + 10);
        packets.push({ h: false, line: x, head, dir, len: len * 0.7, speed: speed * 0.8, branched: true });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (const p of packets) {
        const tail = p.head - p.dir * p.len;
        let g;
        if (p.h) g = ctx.createLinearGradient(tail, 0, p.head, 0);
        else g = ctx.createLinearGradient(0, tail, 0, p.head);
        g.addColorStop(0, opt.tail);
        g.addColorStop(1, opt.head);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (p.h) { ctx.moveTo(tail, p.line + 0.5); ctx.lineTo(p.head, p.line + 0.5); }
        else { ctx.moveTo(p.line + 0.5, tail); ctx.lineTo(p.line + 0.5, p.head); }
        ctx.stroke();
        ctx.fillStyle = opt.dot;
        ctx.shadowColor = opt.glow;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        if (p.h) ctx.arc(p.head, p.line + 0.5, 2.4, 0, 6.283);
        else ctx.arc(p.line + 0.5, p.head, 2.4, 0, 6.283);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const step = now => {
      raf = 0;
      if (!visible || !ambientOn()) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      spawnAcc += dt;
      const cap = Math.round((opt.max || 14) * clamp(w / 1200, 0.5, 1.4));
      if (spawnAcc > opt.every && packets.length < cap) { spawn(false); spawnAcc = 0; }
      for (const p of packets) {
        const prev = p.head;
        p.head += p.dir * p.speed * dt;
        if (p.h && !p.branched) {
          const a = Math.floor(prev / colW), b = Math.floor(p.head / colW);
          if (a !== b && p.head > 0 && p.head < w && Math.random() < 0.14) {
            const x = Math.max(a, b) * colW;
            packets.push({ h: false, line: x, head: p.line, dir: Math.random() < 0.5 ? 1 : -1, len: rand(60, 150), speed: p.speed * 0.9, branched: true });
            p.branched = true;
          }
        }
      }
      packets = packets.filter(p => {
        const lim = p.h ? w : h;
        return p.dir > 0 ? p.head - p.len < lim + 20 : p.head + p.len > -20;
      });
      draw();
      raf = requestAnimationFrame(step);
    };

    const kick = () => {
      if (visible && ambientOn() && !raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    };

    resize();
    new ResizeObserver(resize).observe(canvas);
    if (!state.reduced) { for (let i = 0; i < 5; i++) spawn(true); draw(); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(canvas);
    } else { visible = true; kick(); }
    onMotion(kick);
  }

  /* ---------- live ledger ---------- */
  function initLedger() {
    const rowsEl = $('#ledgerRows');
    if (!rowsEl) return;
    const card = $('#ledger');
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

    let cents = 248130942, dr = 1240291820, cr = 1240291820;
    let lastIdx = -1;
    const hist = [];
    const fmtC = c => fmtMoney2(c / 100);
    const fmtT = d => d.toTimeString().slice(0, 8);
    const make = (when) => {
      let i; do { i = Math.floor(Math.random() * TPL.length); } while (i === lastIdx);
      lastIdx = i;
      const [name, kind, rail, sign, [lo, hi]] = TPL[i];
      return { name, kind, rail, sign, amt: Math.round(rand(lo, hi) * 100), when };
    };
    const rowEl = (e, isNew) => {
      const li = document.createElement('li');
      li.className = 'lrow' + (isNew ? ' new' : '') + (e.sign < 0 ? ' is-debit' : '');
      li.innerHTML =
        '<span class="t">' + fmtT(e.when) + '</span>' +
        '<span class="d"><b>' + e.name + '</b><i>' + e.kind + '</i></span>' +
        '<span class="r">' + e.rail + '</span>' +
        '<span class="a ' + (e.sign > 0 ? 'credit' : 'debit') + '">' + (e.sign > 0 ? '+' : '\u2212') + fmtC(e.amt) + '</span>';
      return li;
    };
    const updateDelta = () => {
      const cutoff = Date.now() - 60000;
      while (hist.length && hist[0].t < cutoff) hist.shift();
      const net = hist.reduce((s, h) => s + h.amt, 0);
      deltaEl.textContent = (net >= 0 ? '+' : '\u2212') + '$' + fmtC(Math.abs(net));
      deltaEl.classList.toggle('neg', net < 0);
    };

    // seed
    rowsEl.innerHTML = '';
    const now = Date.now();
    [22, 17, 12, 7, 3].forEach(off => {
      const e = make(new Date(now - off * 1000));
      hist.push({ t: now - off * 1000, amt: e.sign * e.amt });
      cents += e.sign * e.amt; dr += e.amt; cr += e.amt;
      rowsEl.insertBefore(rowEl(e, false), rowsEl.firstChild);
    });
    balEl.textContent = fmtC(cents); drEl.textContent = fmtC(dr); crEl.textContent = fmtC(cr);
    updateDelta();

    const push = () => {
      const e = make(new Date());
      const prevC = cents, prevD = dr;
      cents += e.sign * e.amt; dr += e.amt; cr += e.amt;
      hist.push({ t: Date.now(), amt: e.sign * e.amt });
      rowsEl.insertBefore(rowEl(e, true), rowsEl.firstChild);
      while (rowsEl.children.length > 8) rowsEl.lastChild.remove();
      tween(balEl, prevC, cents, 900, v => fmtC(v));
      tween(drEl, prevD, dr, 900, v => fmtC(v));
      tween(crEl, prevD, cr, 900, v => fmtC(v));
      updateDelta();
      reqKey.textContent = 'idem_' + Math.random().toString(16).slice(2, 10);
      reqLat.textContent = String(Math.round(rand(24, 46)));
      req.classList.add('tick');
      setTimeout(() => req.classList.remove('tick'), 420);
    };

    let visible = false, timer = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (!visible || !ambientOn()) return;
      timer = setTimeout(() => { push(); schedule(); }, rand(1500, 2500));
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; schedule(); }, { threshold: 0.2 }).observe(card);
    } else visible = true;
    onMotion(schedule);
    setInterval(updateDelta, 4000);
    if (state.reduced) toggle.hidden = true;
  }

  /* ---------- scroll-fill statement ---------- */
  function initScrollFill() {
    const el = $('[data-scrollfill]');
    if (!el) return;
    const n = splitWords(el, 'sw', false);
    const words = $$('.sw', el);
    if (state.reduced) { words.forEach(w => w.style.setProperty('--o', 1)); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      if (r.bottom < -100 || r.top > vh + 100) {
        // keep end states correct when jumping past
        if (r.bottom < 0) words.forEach(w => w.style.setProperty('--o', 1));
        else words.forEach(w => w.style.setProperty('--o', 0));
        return;
      }
      const p = clamp((vh * 0.86 - r.top) / (vh * 0.36 + r.height));
      words.forEach((w, i) => {
        const start = (i / n) * 0.8;
        w.style.setProperty('--o', clamp((p - start) / 0.2).toFixed(3));
      });
    };
    scrollHandlers.push(update);
    update();
  }

  /* ---------- pinned flow ---------- */
  function initFlow() {
    const sec = $('[data-flow]');
    if (!sec) return;
    const track = $('.flow-track', sec);
    const steps = $$('.fstep', sec);
    const logs = $$('[data-log]', sec);
    const rows = $$('.lrow-s', sec);
    const nodes = $$('.node', sec);
    const lpanel = $('.lpanel', sec);
    const segs = [$('#seg0'), $('#seg1'), $('#seg2')];
    const segv = $('#segv');
    const packet = $('#packet'), glow = $('#packetGlow');
    const prog = $('.flow-prog i', sec);
    const desktop = matchMedia('(min-width: 961px) and (min-height: 621px)');

    const wp = [[0, 56], [0.2, 237], [0.44, 237], [0.58, 418], [0.72, 418], [0.84, 583], [1, 583]];
    const th = [0, 0.2, 0.5, 0.8];
    const nodeAt = [0.0, 0.18, 0.56, 0.82];

    const xAt = p => {
      for (let i = 0; i < wp.length - 1; i++) {
        if (p <= wp[i + 1][0]) {
          const t = (p - wp[i][0]) / (wp[i + 1][0] - wp[i][0]);
          return lerp(wp[i][1], wp[i + 1][1], smooth(clamp(t)));
        }
      }
      return wp[wp.length - 1][1];
    };

    let shown = -1, target = 0, raf = 0;
    const render = p => {
      const x = xAt(p);
      packet.setAttribute('cx', x.toFixed(1));
      glow.setAttribute('cx', x.toFixed(1));
      segs[0].style.strokeDashoffset = 1 - clamp(p / 0.2);
      segs[1].style.strokeDashoffset = 1 - clamp((p - 0.44) / 0.14);
      segs[2].style.strokeDashoffset = 1 - clamp((p - 0.72) / 0.12);
      segv.style.strokeDashoffset = 1 - clamp((p - 0.2) / 0.1);
      nodes.forEach((n, i) => n.classList.toggle('on', p >= nodeAt[i]));
      let idx = 0;
      th.forEach((t, i) => { if (p >= t) idx = i; });
      steps.forEach((s, i) => { s.classList.toggle('is-on', i === idx); s.classList.toggle('is-done', i < idx); });
      logs.forEach((l, i) => l.classList.toggle('on', p > 0.015 && i <= idx));
      rows.forEach((r, i) => r.classList.toggle('on', idx >= i + 1));
      lpanel.classList.toggle('on', idx >= 1);
      prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    };

    const progress = () => {
      const r = track.getBoundingClientRect();
      const total = Math.max(1, r.height - innerHeight);
      return clamp(-r.top / total);
    };
    const loop = () => {
      raf = 0;
      if (state.reduced) shown = target;
      else shown += (target - shown) * 0.14;
      if (Math.abs(target - shown) < 0.0006) shown = target;
      render(shown);
      if (shown !== target) raf = requestAnimationFrame(loop);
    };
    const update = () => {
      if (!desktop.matches) return;
      target = progress();
      if (shown < 0) shown = target;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    scrollHandlers.push(update);
    update();
    render(desktop.matches ? Math.max(0, shown) : 0);
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
      json: 'true|false|null',
    };
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rx = {};
    const build = lang => {
      const comment = lang === 'node' || lang === 'go' ? '\\/\\/[^\\n]*' : '#[^\\n]*';
      const str = lang === 'curl' ? '"(?:[^"\\\\\\n]|\\\\.)*"|\'[^\'\\n]*\'' : '"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'';
      const prop = lang === 'python' ? '\\b[a-z_]\\w*(?==(?!=))' : lang === 'curl' ? '(?!)' : '\\b[A-Za-z_]\\w*(?=\\s*:(?!:))';
      const flag = lang === 'curl' ? '|(?<=\\s)-[A-Za-z]\\b' : '';
      // groups: 1 comment, 2 string, 3 number, 4 keyword, 5 function, 6 prop, 7 flag
      return new RegExp(
        '(' + comment + ')|(' + str + ')|(\\b\\d[\\d_]*(?:\\.\\d+)?\\b)|(\\b(?:' + KW[lang] + ')\\b(?!\\s*:(?!:))' + flag + ')|(\\b[A-Za-z_]\\w*(?=\\())|(' + prop + ')', 'g');
    };
    const highlightLine = (line, lang) => {
      if (lang === 'json') {
        return esc(line).replace(/(&quot;|")/g, '"').replace(
          /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g,
          (m, s, colon, kw, num) => {
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
      const lang = pre.dataset.lang;
      code.innerHTML = code.textContent.split('\n').map(l => '<span class="tk-line">' + highlightLine(l, lang) + '</span>').join('');
    });

    const place = () => {
      const sel = tabs.find(t => t.getAttribute('aria-selected') === 'true');
      ind.style.setProperty('--ix', sel.offsetLeft + 'px');
      ind.style.setProperty('--iw', sel.offsetWidth + 'px');
    };
    const select = lang => {
      tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.lang === lang)));
      pres.forEach(p => p.classList.toggle('is-on', p.dataset.lang === lang));
      place();
    };
    tabs.forEach(t => t.addEventListener('click', () => select(t.dataset.lang)));
    tabs.forEach((t, i) => t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); select(n.dataset.lang);
    }));
    place();
    addEventListener('resize', place);
    if (document.fonts) document.fonts.ready.then(place);

    // simulated request
    const runBtn = $('#runBtn'), body = $('#resBody code'), status = $('#resStatus');
    let busy = false;
    const rid = n => Array.from({ length: n }, () => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 54)]).join('');
    runBtn.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      runBtn.classList.add('is-busy');
      status.className = 'res-status busy';
      status.innerHTML = '<i></i>Sending\u2026';
      body.innerHTML = '';
      await wait(state.reduced ? 0 : rand(380, 520));
      const lat = Math.round(rand(24, 42));
      const json = [
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
      ].join('\n');
      const lines = json.split('\n');
      lines.forEach((l, i) => {
        const s = document.createElement('span');
        s.className = 'rline';
        s.style.animationDelay = state.reduced ? '0s' : (i * 45) + 'ms';
        s.innerHTML = highlightLine(l, 'json') || '&nbsp;';
        body.appendChild(s);
      });
      await wait(state.reduced ? 0 : lines.length * 45 + 120);
      status.className = 'res-status on';
      status.innerHTML = '<i></i>201 Created \u00b7 ' + lat + ' ms';
      runBtn.classList.remove('is-busy');
      busy = false;
    });
  }

  /* ---------- reliability ---------- */
  function initReliability() {
    // uptime bars
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
        b.style.setProperty('--b', i);
        b.dataset.tip = degraded[i]
          ? label + ' \u00b7 ' + degraded[i][0] + ' \u00b7 ' + degraded[i][1]
          : label + ' \u00b7 100% \u00b7 no incidents';
        frag.appendChild(b);
      }
      bars.appendChild(frag);
      const idle = '';
      bars.addEventListener('pointerover', e => { if (e.target.dataset && e.target.dataset.tip) tip.textContent = e.target.dataset.tip; });
      bars.addEventListener('pointerleave', () => { tip.textContent = idle; });
    }

    // failure drill
    const svg = $('#regionsSvg');
    const btn = $('#drillBtn');
    const statusEl = $('#regionsStatus');
    const statusT = $('span', statusEl);
    const quorum = $('#quorumT');
    if (!svg) return;
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

  /* ---------- testimonials ---------- */
  function initProof() {
    const wrap = $('#proof');
    if (!wrap) return;
    const quotes = $$('.quote', wrap), metrics = $$('.qm', wrap), dots = $$('.qdots button', wrap);
    const DUR = 8500;
    let idx = 0, t0 = performance.now(), hold = false, visible = false, raf = 0;

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
      if (hold) t0 += now - (frame.last || now);
      frame.last = now;
      const p = clamp((now - t0) / DUR);
      dots[idx].style.setProperty('--qp', p.toFixed(4));
      if (p >= 1) set(idx + 1);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible && ambientOn()) { frame.last = performance.now(); t0 = Math.max(t0, 0); raf = requestAnimationFrame(frame); } };
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
      // round to 2 significant figures for a tidy readout
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
    const render = (animate) => {
      const v = +vol.value;
      const n = entries(v);
      const c = calc(n);
      vol.style.setProperty('--p', (v / 10) + '%');
      out.textContent = fmtEntries(n);
      tr.textContent = '\u2248 ' + fmtEntries(n / 2) + ' transfers';
      base.textContent = '$' + c.b;
      usage.textContent = c.u === 0 ? '$0' : '$' + money0(c.u);
      rate.textContent = '$' + c.r.toFixed(2) + ' / 1,000';
      if (animate) tween(total, shownTotal, c.t, 700, money0); else total.textContent = money0(c.t);
      shownTotal = c.t;
      fine.textContent = n > 5e7 ? 'At this volume Enterprise committed-use rates usually beat the public tiers. Talk to sales for a quote.' : 'Tiered rates: $0.40, then $0.25 beyond 10M, then $0.12 beyond 50M per 1,000 entries.';
    };
    vol.addEventListener('input', () => render(true));
    render(false);

    const placeB = () => {
      const sel = bbtns.find(b => b.getAttribute('aria-pressed') === 'true');
      bind.style.setProperty('--ix', sel.offsetLeft + 'px');
      bind.style.setProperty('--iw', sel.offsetWidth + 'px');
    };
    bbtns.forEach(b => b.addEventListener('click', () => {
      const wasAnnual = annual;
      annual = b.dataset.bill === 'annual';
      bbtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      placeB();
      if (wasAnnual !== annual) {
        tween(price, annual ? 499 : 399, annual ? 399 : 499, 700, v => '$' + Math.round(v));
        render(true);
      }
    }));
    placeB();
    addEventListener('resize', placeB);
    if (document.fonts) document.fonts.ready.then(placeB);
  }

  /* ---------- FAQ ---------- */
  function initFaq() {
    const items = $$('.qa');
    items.forEach((d, i) => {
      const sum = $('summary', d);
      const body = $('.qa-body', d);
      sum.setAttribute('aria-expanded', 'false');
      const open = (instant) => {
        d.open = true;
        sum.setAttribute('aria-expanded', 'true');
        if (instant) d.classList.add('is-open');
        else requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
      };
      const close = () => {
        d.classList.remove('is-open');
        sum.setAttribute('aria-expanded', 'false');
        const done = () => { if (!d.classList.contains('is-open')) d.open = false; };
        if (state.reduced) done();
        else { body.addEventListener('transitionend', done, { once: true }); setTimeout(done, 700); }
      };
      sum.addEventListener('click', e => {
        e.preventDefault();
        if (d.classList.contains('is-open')) close();
        else {
          items.forEach(o => { if (o !== d && o.classList.contains('is-open')) $('summary', o).click(); });
          open(false);
        }
      });
      if (i === 0) open(true);
    });
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

  /* ---------- footer wordmark ---------- */
  function initWordmark() {
    const el = $('[data-wordmark]');
    if (!el) return;
    const text = el.textContent;
    el.textContent = '';
    Array.from(text).forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = c; s.style.setProperty('--c', i);
      el.appendChild(s);
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
    if (state.reduced) {
      const mt = $('#motionToggle');
      if (mt) mt.hidden = true;
    }
  }

  /* ---------- boot ---------- */
  initReveal();
  initCounters();
  initNav();
  initHero();
  initPointer();
  initParallax();
  initWordmark();
  initScrollFill();
  initFlow();
  initApi();
  initReliability();
  initProof();
  initPricing();
  initFaq();
  initCopy();
  initSignup();
  initLedger();
  initMotionToggle();
  lanes($('.hero-canvas'), { tail: 'rgba(201,255,74,0)', head: 'rgba(201,255,74,.7)', dot: '#e4ff9a', glow: 'rgba(201,255,74,.9)', every: 0.45, max: 15 });

  // CTA lanes (ink on lime)
  const ctaLines = $('.cta-lines');
  if (ctaLines) {
    const c = document.createElement('canvas');
    ctaLines.appendChild(c);
    lanes(c, { tail: 'rgba(8,9,11,0)', head: 'rgba(8,9,11,.75)', dot: '#08090b', glow: 'rgba(8,9,11,.4)', every: 0.7, max: 10 });
  }

  // first paint of scroll-driven state
  onScroll();
  scrollHandlers.forEach(h => h());
  addEventListener('load', () => scrollHandlers.forEach(h => h()));
})();
