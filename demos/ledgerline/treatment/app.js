/* app.js: Ledgerline page behaviour. Pairs with motion-kit.js (reveals, scenes, magnetic, marquee).
 * Everything here is progressive: the page reads correctly without it, and under
 * prefers-reduced-motion loops, travel and the canvas are skipped. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const root = document.documentElement;

  /* ---------- one shared rAF scroll loop ---------- */
  const scrollFns = [];
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scrollFns.forEach((fn) => fn()); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- page progress hairline ---------- */
  scrollFns.push(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty('--pg', max > 0 ? (scrollY / max).toFixed(4) : '0');
  });

  /* ---------- persistent "in view" flag for CSS-driven widgets ---------- */
  const inviewIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('inview'); inviewIO.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-inview], .window').forEach((el) => inviewIO.observe(el));
  addEventListener('load', () => setTimeout(() => $$('[data-inview], .window').forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('inview'); }), 500));

  /* ---------- tiny helpers ---------- */
  const money = (cents) => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function tween(from, to, ms, apply) {
    if (reduce) { apply(to); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const t = clamp((now - t0) / ms);
      apply(from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function whenVisible(el, on, off, threshold = 0.05) {
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? on() : off && off())), { threshold });
    io.observe(el);
  }

  /* =====================================================================
     HERO: ledger-line field. Rules of a ledger page that bend toward the pointer.
     ===================================================================== */
  function heroField() {
    const hero = $('.hero'), canvas = $('.hero-field');
    if (!hero || !canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    const gap = 30, sigma = 150;
    let w = 0, h = 0, running = false, visible = true;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, e: 0, te: 0, live: false };
    let sweepT0 = 0;
    const SWEEP = 2200;

    function size() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    const disp = (x, y) => {
      const dx = x - ptr.x, dy = y - ptr.y;
      const f = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      return { f, off: (dy / (Math.abs(dy) + 46)) * f * 30 * ptr.e };
    };
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(236,239,233,.075)';
      ctx.beginPath();
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = 0; x <= w + 16; x += 16) {
          const yy = y + (ptr.e > 0.01 ? disp(x, y).off : 0);
          x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
      }
      ctx.stroke();
      if (ptr.e < 0.02) return;
      for (let y = gap / 2; y < h; y += gap) {
        if (Math.abs(y - ptr.y) > sigma * 2.3) continue;
        let px = null, py = 0;
        for (let x = 0; x <= w + 16; x += 16) {
          const d = disp(x, y), yy = y + d.off;
          if (px !== null && d.f > 0.05) {
            ctx.strokeStyle = `rgba(200,247,58,${(d.f * 0.75 * ptr.e).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, yy); ctx.stroke();
          }
          px = x; py = yy;
        }
      }
    }
    function frame(now) {
      if (!visible) { running = false; return; }
      const sweep = now - sweepT0;
      if (!ptr.live && sweep < SWEEP) {
        const t = ease(clamp(sweep / SWEEP));
        ptr.tx = w * (0.1 + 0.68 * t); ptr.ty = h * (0.28 + 0.3 * t);
        ptr.te = Math.sin(clamp(sweep / SWEEP) * Math.PI) * 1.0;
      }
      ptr.x += (ptr.tx - ptr.x) * 0.16; ptr.y += (ptr.ty - ptr.y) * 0.16; ptr.e += (ptr.te - ptr.e) * 0.1;
      draw();
      const settled = Math.abs(ptr.tx - ptr.x) < 0.5 && Math.abs(ptr.ty - ptr.y) < 0.5 && ptr.e < 0.012 && ptr.te === 0 && (ptr.live || sweep >= SWEEP);
      if (settled) { ptr.e = 0; draw(); running = false; return; }
      requestAnimationFrame(frame);
    }
    const kick = () => { if (!running && visible) { running = true; requestAnimationFrame(frame); } };
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = canvas.getBoundingClientRect();
      if (!ptr.live) { ptr.live = true; ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; }
      ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; ptr.te = 1;
      kick();
    });
    hero.addEventListener('pointerleave', () => { ptr.te = 0; kick(); });
    whenVisible(hero, () => { visible = true; kick(); }, () => { visible = false; }, 0);
    addEventListener('resize', size);
    size();
    setTimeout(() => { sweepT0 = performance.now(); kick(); }, 380);
  }

  /* =====================================================================
     HERO: the console demos itself with a believable loop.
     ===================================================================== */
  function heroConsole() {
    const list = $('[data-c-journal]');
    if (!list) return;
    const body = $('[data-c-body]'), status = $('[data-c-status]'), totalEl = $('[data-c-total]'), bal = $('.c-bal');
    const ROWS = 6;
    const feed = [
      { from: 'acct_northwind_ops', to: 'acct_orchard_pay', cents: 482000, rail: 'fednow', ms: 41 },
      { from: 'acct_fathom_card', to: 'acct_vantor_fees', cents: 31250, rail: 'card', ms: 29 },
      { from: 'acct_kestrel_pool', to: 'acct_carrier_7734', cents: 96400, rail: 'rtp', ms: 36 },
      { from: 'acct_brightline_ops', to: 'acct_halcyon_sav', cents: 2500000, rail: 'sepa', ms: 44 },
      { from: 'acct_marlow_float', to: 'acct_tessera_fees', cents: 8640, rail: 'card', ms: 27 },
      { from: 'acct_halcyon_ops', to: 'acct_kestrel_pay', cents: 125000, rail: 'rtp', ms: 38 },
    ];
    let total = 133640, clock = 14 * 3600 + 2 * 60 + 9, n = 0, timer = 0, on = false;
    const rows = $$('.jr', list);
    totalEl.textContent = '$' + money(total);
    const stamp = () => {
      clock += 2 + Math.floor(Math.random() * 3);
      const s = clock % 60, m = Math.floor(clock / 60) % 60, hh = Math.floor(clock / 3600) % 24;
      return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    };
    const bodyHTML = (t) => `<span class="p">{</span> <span class="k">"from"</span><span class="p">:</span> <span class="s">"${t.from}"</span><span class="p">,</span>\n  <span class="k">"to"</span><span class="p">:</span>   <span class="s">"${t.to}"</span><span class="p">,</span>\n  <span class="k">"amount"</span><span class="p">:</span> <span class="n">${t.cents}</span><span class="p">,</span> <span class="k">"rail"</span><span class="p">:</span> <span class="s">"${t.rail}"</span> <span class="p">}</span>`;
    const rowEl = (time, acct, dc, amt) => {
      const li = document.createElement('li');
      li.className = 'jr is-new';
      li.innerHTML = `<span class="t">${time}</span><span class="acct">${acct}</span><span class="dc ${dc.toLowerCase()}">${dc}</span><span class="amt">${amt}</span>`;
      return li;
    };
    function post(t) {
      const time = stamp();
      const dr = rowEl(time, t.from, 'DR', '−' + money(t.cents));
      const cr = rowEl(time, t.to, 'CR', '+' + money(t.cents));
      rows.forEach((r) => { const k = (+r.style.getPropertyValue('--k')) + 2; r.style.setProperty('--k', k); if (k >= ROWS) { r.classList.add('is-old'); setTimeout(() => r.remove(), 600); } });
      dr.style.setProperty('--k', 0); cr.style.setProperty('--k', 1);
      list.prepend(cr); list.prepend(dr);
      rows.unshift(cr); rows.unshift(dr);
      while (rows.length > ROWS + 2) rows.pop();
      requestAnimationFrame(() => requestAnimationFrame(() => { dr.classList.remove('is-new'); cr.classList.remove('is-new'); }));
      const prev = total; total += t.cents;
      tween(prev, total, 800, (v) => { totalEl.textContent = '$' + money(Math.round(v)); });
      bal.classList.remove('is-flash'); void bal.offsetWidth; bal.classList.add('is-flash');
    }
    function cycle() {
      if (!on) return;
      const t = feed[n++ % feed.length];
      status.classList.add('is-pending'); status.textContent = 'pending';
      body.classList.add('is-swap');
      setTimeout(() => { body.innerHTML = bodyHTML(t); body.classList.remove('is-swap'); }, 260);
      setTimeout(() => {
        if (!on) return;
        status.classList.remove('is-pending'); status.innerHTML = `201 Created &middot; ${t.ms}&nbsp;ms`;
        post(t);
      }, 900);
      timer = setTimeout(cycle, 3800);
    }
    if (reduce) return;
    whenVisible($('.hero'), () => { if (!on) { on = true; timer = setTimeout(cycle, 4800); } }, () => { on = false; clearTimeout(timer); }, 0.15);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { on = false; clearTimeout(timer); } });
  }

  /* =====================================================================
     STORY: scroll progress picks the active step. Paths, packet and nodes are pure CSS from --p.
     ===================================================================== */
  function story() {
    const s = $('.story');
    if (!s) return;
    const steps = $$('.step', s), panels = $$('.panel', s);
    let cur = -1;
    const set = (i) => {
      if (i === cur) return;
      cur = i;
      steps.forEach((el, j) => el.classList.toggle('is-on', j === i));
      panels.forEach((el, j) => el.classList.toggle('is-on', j === i));
    };
    if (reduce) { set(3); return; }
    scrollFns.push(() => {
      const r = s.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = clamp(-r.top / Math.max(1, total));
      set(p < 0.27 ? 0 : p < 0.52 ? 1 : p < 0.77 ? 2 : 3);
    });
  }

  /* ---------- sliding-indicator segmented controls ---------- */
  function placeInk(wrap, ink, active) {
    ink.style.setProperty('--x', active.offsetLeft + 'px');
    ink.style.setProperty('--r', (active.offsetLeft + active.offsetWidth) + 'px');
  }

  /* =====================================================================
     API tabs (+ copy)
     ===================================================================== */
  function apiTabs() {
    const wrap = $('.tabs');
    if (!wrap) return;
    const ink = $('.tab-ink', wrap), tabs = $$('[role="tab"]', wrap), panes = $$('.pane');
    const select = (i, focus) => {
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      panes.forEach((p, j) => { p.hidden = j !== i; p.classList.toggle('is-on', j === i); });
      placeInk(wrap, ink, tabs[i]);
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
    const place = () => placeInk(wrap, ink, tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
    place();
    addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }
  function copyButtons() {
    $$('[data-copy], [data-copy-pane]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy || ($('.pane.is-on .code') || {}).textContent || '';
        try { await navigator.clipboard.writeText(text.trim()); } catch (e) {
          const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
          try { document.execCommand('copy'); } catch (err) { /* ignore */ } ta.remove();
        }
        const label = $('span', btn);
        if (label) { const old = label.textContent; label.textContent = 'Copied'; setTimeout(() => { label.textContent = old === 'Copied' ? 'Copy' : old; }, 1500); }
      });
    });
  }

  /* ---------- bento widgets ---------- */
  function idempotency() {
    const box = $('[data-idem]'), btn = $('[data-idem-btn]');
    if (!box || !btn) return;
    btn.addEventListener('click', () => {
      const on = box.classList.toggle('is-retry');
      btn.textContent = on ? 'Reset' : 'Retry the request';
    });
  }
  function timeTravel() {
    const box = $('[data-time]');
    if (!box) return;
    const svg = $('svg', box), line = $('.line', svg), area = $('.area', svg), cur = $('.cur', svg), knob = $('.knob', svg);
    const range = $('[data-tt-range]', box), tEl = $('[data-tt-t]', box), vEl = $('[data-tt-v]', box);
    const N = 41, W = 280, top = 10, bottom = 82;
    const series = []; let v = 18000, seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < N; i++) { v += (rnd() - 0.36) * 9000; v = Math.max(9000, v); series.push(v); }
    const min = Math.min(...series), max = Math.max(...series);
    const X = (i) => (i / (N - 1)) * W, Y = (val) => bottom - ((val - min) / (max - min)) * (bottom - top);
    const d = series.map((val, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(val).toFixed(1)}`).join('');
    line.setAttribute('d', d); area.setAttribute('d', `${d}L${W} 88L0 88Z`);
    function update() {
      const f = (range.value / 100) * (N - 1), i = Math.floor(f), j = Math.min(N - 1, i + 1), k = f - i;
      const val = series[i] + (series[j] - series[i]) * k;
      const x = (f / (N - 1)) * W;
      cur.setAttribute('x1', x); cur.setAttribute('x2', x); knob.setAttribute('cx', x); knob.setAttribute('cy', Y(val));
      const mins = Math.round((f / (N - 1)) * 24 * 60);
      tEl.textContent = `as of ${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      vEl.textContent = '$' + Math.round(val).toLocaleString('en-US') + '.00';
    }
    range.addEventListener('input', update);
    update();
  }

  /* ---------- reliability visuals ---------- */
  function reliabilityVisuals() {
    const up = $('.uptime');
    if (up) {
      for (let i = 0; i < 90; i++) {
        const b = document.createElement('i');
        if (i === 23 || i === 61) { b.className = 'dip'; b.style.transform = i === 23 ? 'scaleY(.5)' : 'scaleY(.72)'; b.title = 'Degraded, partial'; }
        up.append(b);
      }
    }
    const hist = $('.hist-bars');
    if (hist) {
      let html = '';
      for (let i = 0; i < 40; i++) {
        const x = i + 1.5, mu = Math.log(14), sd = 0.42;
        const dens = Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * sd * sd)) / x;
        const hgt = Math.max(2, dens * 380);
        html += `<rect x="${i * 8}" width="6" rx="1.5" y="${112 - hgt}" height="${hgt}" ${i * 8 > 212 ? 'opacity=".35"' : ''}/>`;
      }
      hist.innerHTML = html;
    }
  }

  /* =====================================================================
     PRICING: billing toggle + volume estimator
     ===================================================================== */
  function pricing() {
    const sec = $('.pricing');
    if (!sec) return;
    const bill = $('.bill'), ink = $('.bill-ink'), btns = $$('[data-bill]', bill);
    const slider = $('[data-vol]'), out = $('[data-vol-out]');
    const plans = { build: $('[data-plan="build"]'), scale: $('[data-plan="scale"]'), enterprise: $('[data-plan="enterprise"]') };
    const est = { build: $('[data-est="build"]'), scale: $('[data-est="scale"]'), enterprise: $('[data-est="enterprise"]') };
    const baseEl = $('[data-base]');
    let annual = false, shown = { build: 0, scale: 0, enterprise: 0 }, volume = 0;
    const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
    const short = (v) => {
      const p = Number(v.toPrecision(2));
      if (p >= 1e6) return '$' + (p / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'M';
      return '$' + Math.round(p / 1e3) + 'k';
    };
    function targets() {
      const base = annual ? 399 : 499;
      return {
        build: volume <= 1e5 ? 0 : null,
        scale: base + volume * 0.001,
        enterprise: 8000 + volume * 0.0004,
      };
    }
    function render(animate = true) {
      volume = Number((10 ** (5 + (slider.value / 100) * 3.7)).toPrecision(2));
      out.textContent = short(volume);
      slider.setAttribute('aria-valuetext', out.textContent + ' per month');
      baseEl.textContent = usd(annual ? 399 : 499);
      const tg = targets();
      const fit = volume <= 1e5 ? 'build' : volume <= 12e6 ? 'scale' : 'enterprise';
      Object.keys(plans).forEach((k) => plans[k].classList.toggle('is-fit', k === fit));
      Object.keys(est).forEach((k) => {
        if (tg[k] === null) { est[k].textContent = 'Outgrown'; shown[k] = 0; return; }
        const from = shown[k];
        const to = tg[k];
        shown[k] = to;
        if (!animate) { est[k].textContent = usd(to) + '/mo'; return; }
        tween(from, to, 420, (v) => { est[k].textContent = usd(v) + '/mo'; });
      });
    }
    slider.addEventListener('input', () => render(true));
    btns.forEach((b) => b.addEventListener('click', () => {
      annual = b.dataset.bill === 'annual';
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      placeInk(bill, ink, b);
      render(true);
    }));
    const place = () => placeInk(bill, ink, btns.find((b) => b.getAttribute('aria-pressed') === 'true'));
    place(); addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    render(false);
  }

  /* =====================================================================
     SIGN-UP: validation + typed terminal
     ===================================================================== */
  function signup() {
    const form = $('.signup');
    if (form) {
      const input = $('input', form), msg = $('.form-msg', form), btn = $('button[type="submit"]', form);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
        input.classList.toggle('is-bad', !ok);
        msg.className = 'form-msg ' + (ok ? 'ok' : 'bad');
        if (!ok) { msg.textContent = 'Enter a valid work email to get a key.'; input.focus(); return; }
        msg.textContent = 'Sandbox ready. Your key is on its way. (Demo form: nothing was sent.)';
        btn.disabled = true; btn.style.opacity = '.6';
      });
      input.addEventListener('input', () => input.classList.remove('is-bad'));
    }
    const term = $('.term');
    if (!term) return;
    const spans = $$('[data-type]', term);
    if (reduce) { term.classList.add('done'); return; }
    const texts = spans.map((s) => s.dataset.type);
    spans.forEach((s) => { s.textContent = ''; });
    let started = false, finished = false;
    const finish = () => { if (finished) return; finished = true; spans.forEach((s, i) => { s.textContent = texts[i]; s.classList.remove('caret'); }); term.classList.add('done'); };
    whenVisible(term, () => {
      if (started) return; started = true;
      let line = 0;
      const typeLine = () => {
        if (finished) return;
        if (line >= spans.length) { setTimeout(finish, 150); return; }
        const el = spans[line], text = texts[line]; let i = 0;
        el.classList.add('caret');
        const step = () => {
          if (finished) return;
          el.textContent = text.slice(0, ++i);
          if (i < text.length) setTimeout(step, 7 + Math.random() * 8);
          else { el.classList.remove('caret'); line++; setTimeout(typeLine, 140); }
        };
        step();
      };
      setTimeout(typeLine, 200);
    }, () => { if (started) finish(); }, 0.15);
  }

  /* ---------- boot ---------- */
  heroField();
  heroConsole();
  story();
  apiTabs();
  copyButtons();
  idempotency();
  timeTravel();
  reliabilityVisuals();
  pricing();
  signup();
  onScroll();
})();
