/* Ledgerline site behaviour. Loaded before motion-kit.js so text is split before the kit runs.
 * Everything here degrades to readable static content without JS or under reduced motion. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const OUT = (t) => 1 - Math.pow(1 - t, 4);

  /* ---------- split headings into masked words (keeps <em>) ---------- */
  function splitHeading(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const ctx = { i: 0 };
    const build = (node) => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          const mask = document.createElement('span'); mask.className = 'mk-mask'; mask.setAttribute('aria-hidden', 'true');
          const piece = document.createElement('span'); piece.className = 'mk-piece'; piece.style.setProperty('--i', ctx.i++);
          piece.textContent = tok; mask.appendChild(piece); frag.appendChild(mask);
        });
        return frag;
      }
      const clone = node.cloneNode(false);
      node.childNodes.forEach((c) => clone.appendChild(build(c)));
      return clone;
    };
    const kids = [...el.childNodes].map(build);
    el.textContent = '';
    kids.forEach((k) => el.appendChild(k));
    el.setAttribute('aria-label', label);
    el.dataset.splitDone = '1';
  }
  $$('[data-split]').forEach(splitHeading);

  /* ---------- manifesto words ---------- */
  const mani = $('#manifesto');
  if (mani) {
    const words = mani.textContent.trim().split(/\s+/);
    mani.setAttribute('aria-label', words.join(' '));
    mani.innerHTML = words.map((w, i) => `<span aria-hidden="true" style="--t:${(i / words.length).toFixed(3)}">${w}</span>`).join(' ');
  }

  /* ---------- "seen" observer for custom reveals ---------- */
  const seenTargets = [...$$('#bars, #checks, #lat-chart, .cmp, .signup')];
  if (reduce || !('IntersectionObserver' in window)) seenTargets.forEach((el) => el.classList.add('seen'));
  else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    seenTargets.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => seenTargets.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('seen'); }), 400));
  }

  /* visible-tracker used to pause loops off-screen */
  function watchVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((es) => cb(es[es.length - 1].isIntersecting), { threshold: 0.05 }).observe(el);
  }

  /* number tween */
  function tween(from, to, ms, fn) {
    if (reduce) { fn(to); return; }
    const t0 = performance.now();
    const step = (now) => { const t = clamp((now - t0) / ms); fn(from + (to - from) * OUT(t)); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const money = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- nav ---------- */
  const toggle = $('.nav-toggle'), links = $('#nav-links');
  if (toggle) {
    const set = (open) => { toggle.setAttribute('aria-expanded', String(open)); links.classList.toggle('is-open', open); };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---------- hero ledger tape ---------- */
  (function ledger() {
    const host = $('#ledger-rows'); if (!host) return;
    const pool = [
      ['Card capture · Oak & Ember', 'wallet:aria', 'payable:oak', 125.0],
      ['Payout · Tessellate', 'payable:tess', 'bank:fbo_01', 4820.15],
      ['FX · USD to EUR', 'fx:usd', 'fx:eur', 2300.0],
      ['Refund · order 8812', 'payable:oak', 'wallet:ines', 39.9],
      ['Top-up · ACH', 'bank:fbo_01', 'wallet:kofi', 500.0],
      ['Platform fee · 2.9%', 'payable:oak', 'revenue:fees', 3.63],
      ['Transfer · wallet to wallet', 'wallet:aria', 'wallet:jun', 48.0],
      ['Card capture · Northbeam', 'wallet:mei', 'payable:nbeam', 1249.0],
      ['Payroll · batch 0412', 'treasury:ops', 'wallet:staff', 18420.0],
      ['Chargeback hold', 'wallet:noor', 'hold:disputes', 86.5],
    ];
    const stack = document.createElement('ol'); stack.className = 'stack'; host.appendChild(stack);
    const drEl = $('#sum-dr'), crEl = $('#sum-cr');
    let total = 482310.55, n = 0, visible = true, timer = 0;
    const pad = (x, l = 2) => String(x).padStart(l, '0');
    const stamp = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const id = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    function row(e, date) {
      const li = document.createElement('li'); li.className = 'l-row';
      li.innerHTML = `<span class="l-time">${stamp(date)}</span><div class="l-main"><div class="l-desc"></div><div class="l-acc"><b>DR</b> ${e[1]} &nbsp;<b>CR</b> ${e[2]}</div></div><span class="l-amt">${money(e[3])}</span>`;
      li.querySelector('.l-desc').textContent = e[0];
      return li;
    }
    function push(animate) {
      const e = pool[n++ % pool.length], now = new Date(Date.now() - (animate ? 0 : (6 - stack.children.length) * 1700));
      const li = row(e, now);
      stack.prepend(li);
      total += e[3];
      if (animate) {
        li.classList.add('is-new');
        const h = li.offsetHeight;
        stack.style.transition = 'none'; stack.style.transform = `translate3d(0,${-h}px,0)`;
        void stack.offsetHeight;
        stack.style.transition = 'transform 700ms cubic-bezier(.16,1,.3,1)'; stack.style.transform = 'translate3d(0,0,0)';
        const from = total - e[3];
        tween(from, total, 700, (v) => { drEl.textContent = crEl.textContent = money(v); });
      } else { drEl.textContent = crEl.textContent = money(total); }
      while (stack.children.length > 7) stack.lastChild.remove();
    }
    total -= pool.slice(0, 5).reduce((a, e) => a + e[3], 0);
    for (let i = 0; i < 5; i++) push(false);
    if (reduce) return;
    const loop = () => { timer = setTimeout(() => { if (visible && !document.hidden) push(true); loop(); }, 2300); };
    watchVisible($('#ledger'), (v) => { visible = v; });
    setTimeout(loop, 3600);
  })();

  /* ---------- signature: follow one payment ---------- */
  (function story() {
    const sec = $('.story'); if (!sec) return;
    const stage = $('#story-stage');
    const steps = $$('.step', sec), ticks = $$('.story-ticks i', sec), rows = $$('.sheet-rows li', sec);
    const nodes = $$('.pipe-node', sec), labels = $$('.pipe-label', sec);
    const path = $('#pipe-draw'), dot = $('#pipe-dot');
    const sums = { dr: $('[data-sum="dr"]', sec), cr: $('[data-sum="cr"]', sec) }, delta = $('#sheet-delta');
    const L = path.getTotalLength();
    const pts = [[50, 100], [225, 45], [405, 105], [590, 50]];
    const nodeLen = pts.map(([x, y]) => { let best = 0, bd = 1e9; for (let l = 0; l <= L; l += 1) { const q = path.getPointAtLength(l); const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; best = l; } } return best; });
    nodeLen[0] = 0; nodeLen[3] = L;
    const P = [0.04, 0.27, 0.5, 0.74];          // scroll progress at which the dot reaches each node
    const S = [0, 0.2, 0.44, 0.69];              // scroll progress at which each step's copy takes over
    const state = { step: -1, rows: '', nodes: '', sums: '' };

    function lenAt(p) {
      if (p <= P[0]) return 0;
      if (p >= P[3]) return L;
      for (let i = 0; i < 3; i++) if (p <= P[i + 1]) return nodeLen[i] + (nodeLen[i + 1] - nodeLen[i]) * ease((p - P[i]) / (P[i + 1] - P[i]));
      return L;
    }
    function apply(p) {
      const len = lenAt(p);
      stage.style.setProperty('--t', (len / L).toFixed(4));
      const pt = path.getPointAtLength(len);
      dot.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
      stage.style.setProperty('--gx', ((p - 0.5) * 36).toFixed(2));
      stage.style.setProperty('--gy', ((0.5 - p) * 14).toFixed(2));
      let step = 0; S.forEach((s, i) => { if (p >= s) step = i; });
      if (step !== state.step) {
        state.step = step;
        steps.forEach((el, i) => { el.classList.toggle('is-active', i === step); el.classList.toggle('is-past', i < step); });
      }
      ticks.forEach((t, i) => { const end = i < 3 ? S[i + 1] : 1; t.style.setProperty('--f', clamp((p - S[i]) / (end - S[i])).toFixed(3)); });
      const rk = rows.map((r) => (p >= parseFloat(r.dataset.at) ? 1 : 0)).join('');
      if (rk !== state.rows) { state.rows = rk; rows.forEach((r, i) => r.classList.toggle('on', rk[i] === '1')); }
      const nk = nodes.map((_, i) => (p >= P[i] - 0.004 ? 1 : 0)).join('');
      if (nk !== state.nodes) { state.nodes = nk; nodes.forEach((n, i) => { n.classList.toggle('on', nk[i] === '1'); labels[i].classList.toggle('on', nk[i] === '1'); }); }
      const sk = p >= 0.75 ? 'settled' : p >= 0.58 ? 'balanced' : 'open';
      if (sk !== state.sums) {
        state.sums = sk;
        const b = delta.querySelector('b');
        if (sk === 'open') { sums.dr.textContent = sums.cr.textContent = b.textContent = '—'; delta.classList.remove('ok'); }
        else { sums.dr.textContent = sums.cr.textContent = '125.00'; b.textContent = sk === 'settled' ? '0.00  settled ✓' : '0.00  balanced ✓'; delta.classList.add('ok'); }
      }
    }
    if (reduce) { apply(1); steps.forEach((s) => { s.classList.add('is-active'); s.classList.remove('is-past'); }); return; }
    let queued = false;
    const read = () => { queued = false; const r = sec.getBoundingClientRect(); const total = r.height - innerHeight; apply(clamp(total > 0 ? -r.top / total : 0)); };
    const req = () => { if (!queued) { queued = true; requestAnimationFrame(read); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    read();
  })();

  /* ---------- API demo: code highlight, tabs, send ---------- */
  (function api() {
    const KW = /^(curl|const|await|import|from|new)$/;
    const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(#.*$)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]+\b)|(--json|-H)/gm;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    function hl(src) {
      let out = '', last = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(src))) {
        out += esc(src.slice(last, m.index)); last = re.lastIndex;
        if (m[1]) out += m[2] ? `<span class="t-k">${esc(m[1])}</span>${esc(m[2])}` : `<span class="t-s">${esc(m[1])}</span>`;
        else if (m[3]) out += `<span class="t-c">${esc(m[3])}</span>`;
        else if (m[4]) out += `<span class="t-n">${m[4]}</span>`;
        else if (m[5]) out += KW.test(m[5]) ? `<span class="t-w">${m[5]}</span>` : esc(m[5]);
        else out += `<span class="t-w">${m[6]}</span>`;
      }
      return out + esc(src.slice(last));
    }
    $$('.code code').forEach((c) => { c.innerHTML = hl(c.textContent); });
    const resp = $('#resp-body'), respCode = $('code', resp);
    const lines = respCode.textContent.split('\n');
    respCode.innerHTML = lines.map((l) => `<span class="ln">${hl(l) || ' '}</span>`).join('');

    const tabs = $('#lang-tabs'), ink = $('.tab-ink', tabs), btns = $$('[role=tab]', tabs);
    const move = (tab) => { ink.style.setProperty('--x', tab.offsetLeft + 'px'); ink.style.setProperty('--s', (tab.offsetWidth / 100).toFixed(3)); };
    function select(tab, focus) {
      btns.forEach((b) => { const on = b === tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; const p = document.getElementById(b.getAttribute('aria-controls')); p.classList.toggle('is-on', on); p.setAttribute('aria-hidden', String(!on)); });
      move(tab); if (focus) tab.focus();
    }
    tabs.addEventListener('click', (e) => { const t = e.target.closest('[role=tab]'); if (t) select(t); });
    tabs.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); select(btns[(i + 1) % btns.length], true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); select(btns[(i + btns.length - 1) % btns.length], true); }
    });
    const place = () => move(btns.find((b) => b.getAttribute('aria-selected') === 'true'));
    place(); addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

    const send = $('#send'), status = $('#status');
    const lns = $$('.ln', resp);
    let busy = false;
    function run() {
      if (busy) return; busy = true; send.disabled = true;
      status.className = 'status wait'; status.textContent = 'Sending…';
      resp.classList.add('is-wait');
      const t = reduce ? 0 : 520;
      setTimeout(() => {
        lns.forEach((l, i) => { l.style.transitionDelay = reduce ? '0ms' : `${i * 45}ms`; });
        resp.classList.remove('is-wait');
        status.className = 'status'; status.textContent = '201 Created · ';
        tween(120, 38, 600, (v) => { status.textContent = `201 Created · ${Math.round(v)} ms`; });
        busy = false; send.disabled = false;
      }, t);
    }
    send.addEventListener('click', run);
    const win = $('.win');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(run, 500); } }, { threshold: 0.4 });
      io.observe(win);
    } else status.textContent = '201 Created · 38 ms';
    status.textContent = '201 Created · 38 ms';
  })();

  /* ---------- reliability tiles ---------- */
  (function tiles() {
    const bars = $('#bars');
    if (bars) {
      const warn = new Set([23, 61]);
      bars.innerHTML = Array.from({ length: 90 }, (_, i) => `<i${warn.has(i) ? ' class="warn"' : ''} style="--i:${i}" title="${90 - i} days ago: ${warn.has(i) ? 'degraded (elevated latency, no data loss)' : 'operational'}"></i>`).join('');
    }
    $$('#checks li').forEach((li, i) => li.style.setProperty('--i', i));

    // latency chart: deterministic illustrative series
    const chart = $('#lat-chart');
    if (chart) {
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const N = 49, p50 = [], p99 = [];
      let a = 12, b = 37;
      for (let i = 0; i < N; i++) {
        a += (rnd() - 0.5) * 2.2 + (12 - a) * 0.15; b += (rnd() - 0.5) * 6 + (38 - b) * 0.18;
        if (i === 31) b += 9;
        p50.push(a); p99.push(b);
      }
      const X = (i) => (i / (N - 1)) * 400, Y = (v) => 140 - (v / 62) * 140;
      const smooth = (arr) => {
        let d = `M${X(0).toFixed(1)} ${Y(arr[0]).toFixed(1)}`;
        for (let i = 1; i < arr.length; i++) { const mx = (X(i - 1) + X(i)) / 2, my = (Y(arr[i - 1]) + Y(arr[i])) / 2; d += ` Q${X(i - 1).toFixed(1)} ${Y(arr[i - 1]).toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
        return d + ` L${X(arr.length - 1).toFixed(1)} ${Y(arr[arr.length - 1]).toFixed(1)}`;
      };
      $('#lat-p50').setAttribute('d', smooth(p50));
      $('#lat-p99').setAttribute('d', smooth(p99));
      $('#lat-area').setAttribute('d', smooth(p99) + ` L400 140 L0 140 Z`);
      const cursor = $('#lat-cursor'), read = $('#lat-read');
      const rest = 'p99 · 38 ms';
      chart.addEventListener('pointermove', (e) => {
        const r = chart.getBoundingClientRect(); const i = Math.round(clamp((e.clientX - r.left) / r.width) * (N - 1));
        cursor.setAttribute('x1', X(i)); cursor.setAttribute('x2', X(i)); chart.classList.add('is-hover');
        const mins = Math.round((i / (N - 1)) * 24 * 60), hh = String(Math.floor(mins / 60) % 24).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
        read.textContent = `${hh}:${mm} · p50 ${p50[i].toFixed(0)} · p99 ${p99[i].toFixed(0)} ms`;
      });
      chart.addEventListener('pointerleave', () => { chart.classList.remove('is-hover'); read.textContent = rest; });
    }

    // hash chain with a verifier sweep
    const chain = $('#chain');
    if (chain) {
      const hashes = ['a91f', '3c07', 'e5d2', '7b48', '0fa6'];
      chain.innerHTML = hashes.map((h, i) => `<div class="blk"><b>${h}…</b>#${8841 + i}</div>${i < hashes.length - 1 ? '<span class="link"></span>' : ''}`).join('');
      const blks = $$('.blk', chain), lks = $$('.link', chain);
      const paint = (k) => { blks.forEach((b, i) => b.classList.toggle('on', i <= k)); lks.forEach((l, i) => l.classList.toggle('on', i < k)); };
      if (reduce) paint(blks.length - 1);
      else {
        let k = -1, vis = false;
        watchVisible(chain, (v) => { vis = v; });
        setInterval(() => { if (!vis || document.hidden) return; k = k >= blks.length + 1 ? -1 : k + 1; paint(k); }, 650);
      }
    }
  })();

  /* ---------- pricing calculator ---------- */
  (function calc() {
    const range = $('#calc-range'); if (!range) return;
    const eN = $('#calc-entries'), pN = $('#calc-price'), note = $('#calc-note'), bar = $('#tier-bar');
    const fmtE = (e) => (e >= 1e9 ? `${(e / 1e9).toFixed(1).replace(/\.0$/, '')}B` : e >= 1e6 ? `${(e / 1e6).toFixed(e >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M` : `${Math.round(e / 1e3)}k`);
    const cost = (E) => Math.max(0, Math.min(E, 1e7) - 1e5) * 0.4 / 1000 + Math.max(0, Math.min(E, 1e8) - 1e7) * 0.22 / 1000 + Math.max(0, E - 1e8) * 0.1 / 1000;
    let shown = cost(1e7);
    function update() {
      const s = +range.value, E = Math.round(Math.pow(10, 5 + 4 * s / 100) / 1e4) * 1e4 || 1e5;
      const price = cost(E);
      eN.textContent = fmtE(E);
      bar.style.setProperty('--f', (s / 100).toFixed(3));
      range.setAttribute('aria-valuetext', `${fmtE(E)} entries per month, about $${Math.round(price)}`);
      tween(shown, price, 380, (v) => { pN.textContent = v < 1 && price < 1 ? 'Free' : '$' + Math.round(v).toLocaleString('en-US'); });
      shown = price;
      note.textContent = price <= 0 ? 'Fits inside the free Build tier' : E > 5e8 ? 'Past 500M entries a month, a dedicated cell is usually cheaper. Talk to us.' : `Blended $${(price / (E / 1000)).toFixed(2)} per 1k entries`;
    }
    range.addEventListener('input', update);
    update();
  })();

  /* ---------- sign-up ---------- */
  (function signup() {
    const form = $('#signup-form'); if (!form) return;
    const input = $('#email'), msg = $('#form-msg'), field = $('.field', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { field.classList.add('err'); msg.className = 'form-msg err'; msg.textContent = 'Enter a valid work email to get sandbox keys.'; input.focus(); return; }
      field.classList.remove('err'); msg.className = 'form-msg'; msg.textContent = `Sandbox keys queued for ${v}. (Demo form: nothing was sent.)`;
    });
    input.addEventListener('input', () => field.classList.remove('err'));
    const copy = $('#copy');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('npm i @ledgerline/node'); copy.textContent = 'Copied'; } catch (_) { copy.textContent = 'Press Ctrl+C'; }
      setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
    });
  })();
})();
