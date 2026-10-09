/* ==========================================================================
   HALO — launch page behaviour
   GSAP + ScrollTrigger + Lenis (CDN), canvas, WebAudio. No build step.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.add('reduced');
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[halo] ' + name + ' failed', e); } };

  // shared energy signal (0..1) driven by the generative audio, read by canvas + CSS
  const sig = { energy: 0 };

  /* ------------------------------------------------------------------
     Speaker illustration (shared SVG, themable with CSS variables)
     ------------------------------------------------------------------ */
  function speakerSVG(id, kind) {
    const obj = kind === 'object';
    const vb = obj ? '0 -120 320 620' : '0 0 320 480';
    const tw = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      return `<circle cx="${(160 + Math.cos(a) * 98).toFixed(1)}" cy="${(112 + Math.sin(a) * 17).toFixed(1)}" r="5.5"/>`;
    }).join('');
    const core = obj ? `
      <g class="sp-core" fill="none" stroke="var(--glow)" stroke-width="1.1" stroke-linejoin="round">
        <path d="M48 108 V404 A112 20 0 0 0 272 404 V108"/>
        <ellipse cx="160" cy="108" rx="112" ry="20"/>
        <g style="fill:rgba(var(--glow-rgb),.35)">${tw}</g>
        <ellipse cx="160" cy="392" rx="88" ry="15"/><ellipse cx="160" cy="392" rx="58" ry="10"/><ellipse cx="160" cy="392" rx="28" ry="5"/>
        <path d="M104 388 L138 252 M216 388 L182 252"/><ellipse cx="160" cy="252" rx="22" ry="4"/>
        <ellipse cx="66" cy="250" rx="9" ry="52"/><ellipse cx="66" cy="250" rx="4" ry="30"/>
        <ellipse cx="254" cy="250" rx="9" ry="52"/><ellipse cx="254" cy="250" rx="4" ry="30"/>
        <rect x="126" y="142" width="68" height="62" rx="6"/><path d="M136 158 H184 M136 172 H184 M136 186 H168"/>
      </g>` : '';
    return `
<svg class="spk" viewBox="${vb}" role="img" aria-label="Halo speaker, ${kind === 'object' ? 'exploded view' : 'front view'}">
  <defs>
    <linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" style="stop-color:var(--fab-d)"/><stop offset=".22" style="stop-color:var(--fab-m)"/><stop offset=".44" style="stop-color:var(--fab-l)"/><stop offset=".74" style="stop-color:var(--fab-m)"/><stop offset="1" style="stop-color:var(--fab-d)"/>
    </linearGradient>
    <linearGradient id="${id}e" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".16" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/>
    </linearGradient>
    <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--glow)" stop-opacity=".5"/><stop offset=".2" style="stop-color:var(--glow)" stop-opacity=".08"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/>
    </linearGradient>
    <pattern id="${id}k" width="7" height="9" patternUnits="userSpaceOnUse">
      <path d="M0 1.2 L3.5 7.2 L7 1.2" fill="none" stroke="#000" stroke-opacity=".32" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M0 0.2 L3.5 6.2 L7 0.2" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width=".8"/>
    </pattern>
    <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6e6b66"/><stop offset=".18" stop-color="#cfccc6"/><stop offset=".34" stop-color="#f6f4ef"/><stop offset=".52" stop-color="#a9a59e"/><stop offset=".72" stop-color="#e5e2dc"/><stop offset=".9" stop-color="#8d8983"/><stop offset="1" stop-color="#5e5b57"/>
    </linearGradient>
    <linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5e3f22"/><stop offset=".3" stop-color="#b98c5a"/><stop offset=".5" stop-color="#d1a874"/><stop offset=".78" stop-color="#a27648"/><stop offset="1" stop-color="#523519"/>
    </linearGradient>
    <pattern id="${id}g" width="60" height="7" patternUnits="userSpaceOnUse">
      <path d="M0 1.5 C15 0.5 30 3 60 1.5 M0 5 C20 6.2 40 4 60 5" fill="none" stroke="#3b2511" stroke-opacity=".28" stroke-width=".8"/>
    </pattern>
    <radialGradient id="${id}d" cx=".5" cy=".4" r=".7">
      <stop offset="0" stop-color="#2a2724"/><stop offset=".7" stop-color="#121110"/><stop offset="1" stop-color="#0a0908"/>
    </radialGradient>
    <radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}q" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--glow)" stop-opacity=".42"/><stop offset=".6" style="stop-color:var(--glow)" stop-opacity=".1"/><stop offset="1" style="stop-color:var(--glow)" stop-opacity="0"/></radialGradient>
    <filter id="${id}b" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${id}c" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>

  <ellipse class="floor-glow sp-shadow" cx="160" cy="452" rx="250" ry="40" fill="url(#${id}q)"/>
  <ellipse class="sp-shadow" cx="160" cy="452" rx="150" ry="18" fill="url(#${id}s)"/>

  <g class="sp-base">
    <ellipse cx="160" cy="444" rx="146" ry="24" fill="#000" opacity=".55"/>
    <path d="M52 420 V436 A108 15 0 0 0 268 436 V420 Z" fill="url(#${id}o)"/>
    <path d="M52 420 V436 A108 15 0 0 0 268 436 V420 Z" fill="url(#${id}g)"/>
    <path d="M52 420 V436 A108 15 0 0 0 268 436 V420 Z" fill="url(#${id}e)" opacity=".7"/>
  </g>

  ${core}

  <g class="sp-body">
    <ellipse cx="160" cy="84" rx="140" ry="26" fill="#0b0a09"/>
    <path d="M20 84 A140 26 0 0 0 300 84 V412 A140 26 0 0 1 20 412 Z" fill="url(#${id}f)"/>
    <path d="M20 84 A140 26 0 0 0 300 84 V412 A140 26 0 0 1 20 412 Z" fill="url(#${id}k)"/>
    <path d="M20 84 A140 26 0 0 0 300 84 V412 A140 26 0 0 1 20 412 Z" fill="url(#${id}e)"/>
    <path class="spill" d="M20 84 A140 26 0 0 0 300 84 V412 A140 26 0 0 1 20 412 Z" fill="url(#${id}v)"/>
  </g>

  <g class="sp-top">
    <ellipse class="spill" cx="160" cy="62" rx="170" ry="48" fill="url(#${id}q)"/>
    <path d="M20 70 V84 A140 26 0 0 0 300 84 V70 Z" fill="url(#${id}a)"/>
    <path d="M20 70 V84 A140 26 0 0 0 300 84 V70 Z" fill="url(#${id}e)" opacity=".5"/>
    <ellipse cx="160" cy="70" rx="140" ry="26" fill="url(#${id}a)"/>
    <ellipse cx="160" cy="70" rx="140" ry="26" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/>
    <ellipse cx="160" cy="71" rx="124" ry="21.5" fill="url(#${id}d)"/>
    <ellipse class="halo-bloom" cx="160" cy="71" rx="110" ry="17.5" fill="none" style="stroke:var(--glow)" stroke-width="7" filter="url(#${id}c)" opacity=".7"/>
    <ellipse class="halo-base" cx="160" cy="71" rx="110" ry="17.5" fill="none" style="stroke:var(--glow)" stroke-width="2.2" opacity=".6"/>
    <ellipse class="halo-run" cx="160" cy="71" rx="110" ry="17.5" fill="none" style="stroke:#fff" stroke-width="2.6" stroke-linecap="round" pathLength="100" filter="url(#${id}b)"/>
    <ellipse class="halo-run" cx="160" cy="71" rx="110" ry="17.5" fill="none" style="stroke:#fff" stroke-width="1.6" stroke-linecap="round" pathLength="100"/>
    <ellipse cx="160" cy="71" rx="9" ry="1.6" fill="#fff" opacity=".35"/>
  </g>
</svg>`;
  }

  $$('[data-speaker]').forEach((el, i) => {
    const kind = el.dataset.speaker;
    el.innerHTML = speakerSVG('sp' + i, kind);
  });

  /* ------------------------------------------------------------------
     Text splitting helpers
     ------------------------------------------------------------------ */
  function splitInto(el, wrapFn) {
    const out = el.cloneNode(false);
    const walk = (src, dst) => {
      src.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) dst.appendChild(document.createTextNode(' '));
            else dst.appendChild(wrapFn(tok));
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') dst.appendChild(n.cloneNode());
          else { const c = n.cloneNode(false); dst.appendChild(c); walk(n, c); }
        }
      });
    };
    walk(el, out);
    el.textContent = '';
    while (out.firstChild) el.appendChild(out.firstChild);
  }
  const maskWrap = (t) => { const w = document.createElement('span'); w.className = 'mw'; const i = document.createElement('span'); i.className = 'mi'; i.textContent = t; w.appendChild(i); return w; };
  const wordWrap = (t) => { const w = document.createElement('span'); w.className = 'w'; w.textContent = t; return w; };

  /* ------------------------------------------------------------------
     Smooth scroll (Lenis) + ScrollTrigger sync
     ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduce && window.Lenis) {
    safe('lenis', () => {
      lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      if (hasGSAP) {
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add((t) => lenis.raf(t * 1000));
        window.gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    });
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      if (lenis) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) }); history.replaceState(null, '', id); }
    });
  });

  /* ------------------------------------------------------------------
     Nav, progress, cursor
     ------------------------------------------------------------------ */
  const nav = $('#nav');
  const bar = $('.progress');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';
    nav.classList.toggle('scrolled', y > 40);
    if (y > 240 && y > lastY + 4) nav.classList.add('hide');
    else if (y < lastY - 4 || y < 240) nav.classList.remove('hide');
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('.nav-links a');
  const secs = links.map((a) => $(a.getAttribute('href')));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          const idx = secs.indexOf(en.target);
          links.forEach((l, i) => l.classList.toggle('active', i === idx));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach((s) => s && io.observe(s));
  }

  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const cur = $('.cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy, shown = false;
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cur.style.opacity = 1; cx = tx; cy = ty; }
      const hot = e.target.closest && e.target.closest('a, button, [data-cursor], .dial, input, label');
      cur.classList.toggle('hover', !!hot);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { cur.style.opacity = 0; shown = false; });
    const loop = () => {
      cx = lerp(cx, tx, .2); cy = lerp(cy, ty, .2);
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ------------------------------------------------------------------
     Generative audio ("Listen")
     ------------------------------------------------------------------ */
  const audio = (() => {
    let ac = null, master = null, analyser = null, oscs = [], timer = null, playing = false, raf = 0, buf = null;
    function start() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = ac || new AC();
      if (ac.state === 'suspended') ac.resume();
      master = ac.createGain(); master.gain.value = 0;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = .3;
      analyser = ac.createAnalyser(); analyser.fftSize = 512; buf = new Uint8Array(analyser.fftSize);
      const dl = ac.createDelay(1.5); dl.delayTime.value = .46;
      const fb = ac.createGain(); fb.gain.value = .5;
      const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1500;
      lp.connect(master); lp.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(master);
      master.connect(analyser); analyser.connect(ac.destination);
      oscs = [];
      [146.83, 220, 293.66, 369.99, 440].forEach((f, i) => {
        [-6, 6].forEach((d) => {
          const o = ac.createOscillator(); o.type = i < 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = d;
          const g = ac.createGain(); g.gain.value = i < 2 ? .05 : .03;
          const l = ac.createOscillator(); l.frequency.value = .04 + Math.random() * .08;
          const lg = ac.createGain(); lg.gain.value = g.gain.value * .7;
          l.connect(lg); lg.connect(g.gain);
          o.connect(g); g.connect(lp); o.start(); l.start(); oscs.push(o, l);
        });
      });
      const scale = [587.33, 659.25, 739.99, 880, 987.77, 1108.73, 1318.51];
      const pluck = () => {
        const f = scale[Math.floor(Math.random() * scale.length)];
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ac.createGain(); const t = ac.currentTime;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + 2.6);
        o.connect(g); g.connect(lp); o.start(t); o.stop(t + 2.8);
      };
      pluck(); timer = setInterval(() => { if (Math.random() < .8) pluck(); }, 1250);
      master.gain.linearRampToValueAtTime(.55, ac.currentTime + 2.2);
      playing = true;
      const tick = () => {
        if (!playing) return;
        analyser.getByteTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
        const rms = Math.sqrt(s / buf.length);
        sig.energy = lerp(sig.energy, clamp(rms * 7, 0, 1), .2);
        root.style.setProperty('--pulse', sig.energy.toFixed(3));
        raf = requestAnimationFrame(tick);
      };
      tick();
      return true;
    }
    function stop() {
      if (!playing) return;
      playing = false; cancelAnimationFrame(raf); clearInterval(timer);
      const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + .8);
      const toStop = oscs; setTimeout(() => { toStop.forEach((o) => { try { o.stop(); } catch (e) {} }); }, 900);
      const fade = () => { sig.energy *= .9; root.style.setProperty('--pulse', sig.energy.toFixed(3)); if (sig.energy > .01) requestAnimationFrame(fade); else { sig.energy = 0; root.style.setProperty('--pulse', 0); } };
      fade();
    }
    return { start, stop, get playing() { return playing; } };
  })();

  const soundBtn = $('#soundToggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      if (audio.playing) { audio.stop(); soundBtn.setAttribute('aria-pressed', 'false'); soundBtn.classList.remove('is-playing'); $('.lbl', soundBtn).textContent = 'Listen'; }
      else if (audio.start()) { soundBtn.setAttribute('aria-pressed', 'true'); soundBtn.classList.add('is-playing'); $('.lbl', soundBtn).textContent = 'Stop'; }
    });
  }

  /* ------------------------------------------------------------------
     Hero rings canvas
     ------------------------------------------------------------------ */
  safe('rings', () => {
    const cv = $('#rings'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const hero = $('.hero');
    let w = 0, h = 0, dpr = 1, rings = [], dust = [], acc = 0, last = 0, vis = true, raf = 0, started = false;
    const rgb = () => (getComputedStyle(root).getPropertyValue('--glow-rgb') || '255,191,134').trim();
    let col = rgb(); let colT = 0;
    function resize() {
      const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dust = Array.from({ length: w < 700 ? 34 : 70 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + .3, s: Math.random() * .3 + .05, p: Math.random() * 6.28 }));
    }
    resize(); window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { vis = e[0].isIntersecting; if (vis && !raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } }).observe(hero);

    function origin() {
      const s = $('.hero-speaker .spk'); const r = cv.getBoundingClientRect();
      if (!s) return { x: w / 2, y: h * .5 };
      const sr = s.getBoundingClientRect();
      return { x: sr.left + sr.width / 2 - r.left, y: sr.top + sr.height * (70 / 480) - r.top, sh: sr.height };
    }
    function draw(dt, now) {
      ctx.clearRect(0, 0, w, h);
      if (now - colT > 600) { col = rgb(); colT = now; }
      const o = origin(); const maxR = Math.max(w * .62, 420);
      // dust
      dust.forEach((d) => {
        d.y -= d.s * dt * 20; d.p += dt * .8; if (d.y < -4) { d.y = h + 4; d.x = Math.random() * w; }
        const a = (.25 + .25 * Math.sin(d.p)) * (.5 + sig.energy);
        ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
      });
      // rings
      const period = 1.9 - sig.energy * .9;
      acc += dt;
      if (acc > period) { acc = 0; rings.push({ r: 20, e: sig.energy }); }
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i]; g.r += dt * (150 + g.r * .55);
        const p = g.r / maxR; if (p >= 1) { rings.splice(i, 1); continue; }
        const a = Math.pow(1 - p, 1.6) * (.42 + g.e * .5);
        ctx.strokeStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; ctx.lineWidth = 1 + (1 - p) * 1.4;
        ctx.beginPath(); ctx.ellipse(o.x, o.y, g.r, g.r * .17, 0, 0, 6.283); ctx.stroke();
      }
    }
    function drawStatic() {
      ctx.clearRect(0, 0, w, h); const o = origin(); col = rgb();
      [.18, .32, .5, .72].forEach((f, i) => { const R = Math.max(w * .62, 420) * f; ctx.strokeStyle = 'rgba(' + col + ',' + (.3 - i * .06).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(o.x, o.y, R, R * .17, 0, 0, 6.283); ctx.stroke(); });
    }
    function frame(now) {
      raf = 0; if (!vis || document.hidden) return;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      draw(dt, now); raf = requestAnimationFrame(frame);
    }
    if (reduce) { drawStatic(); window.addEventListener('resize', drawStatic); setTimeout(drawStatic, 300); }
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } });
  });

  /* ------------------------------------------------------------------
     Room coverage demo
     ------------------------------------------------------------------ */
  safe('room', () => {
    const stage = $('#demoStage'), cv = $('#room'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const seg = $('#seg'), covEl = $('#cov'), covBar = $('#covBar');
    const heat = document.createElement('canvas'); const hctx = heat.getContext('2d');
    const CELL = 6, ROOM_M = 6.4;
    let W = 0, H = 0, dpr = 1, gw = 0, gh = 0, img = null;
    let mix = 1, target = 1, spk = { x: .5, y: .62 }, dirty = true, vis = false, last = 0, raf = 0, t = 0, drag = false, cov = 0, covShown = -1;
    let col = [255, 191, 134], colT = 0;
    const readCol = () => { const s = getComputedStyle(root).getPropertyValue('--glow-rgb').split(',').map((n) => parseInt(n, 10)); if (s.length === 3 && s.every((n) => !isNaN(n))) col = s; };

    function resize() {
      const r = stage.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gw = Math.ceil(W / CELL); gh = Math.ceil(H / CELL); heat.width = gw; heat.height = gh; img = hctx.createImageData(gw, gh); dirty = true;
    }
    const dirG = (theta, c, m) => {
      const f = (1 + c) / 2;
      const conv = .1 + .9 * Math.pow(f, 2.4);
      const halo = 1 + .05 * Math.cos(8 * theta);
      return conv * (1 - m) + halo * m;
    };
    const scale = () => W / ROOM_M;
    function compute() {
      const sc = scale(), sx = spk.x * W, sy = spk.y * H, vals = [];
      const data = img.data;
      for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) {
          const px = (i + .5) * CELL, py = (j + .5) * CELL;
          const dx = (px - sx) / sc, dy = (py - sy) / sc;
          const dist = Math.hypot(dx, dy); const d = Math.max(dist, .45);
          const th = Math.atan2(dx, -dy), c = dist > 0.001 ? -dy / dist : 1;
          const amp = dirG(th, c, mix) / Math.pow(d, .7) + .25;
          const db = 20 * Math.log10(amp);
          if (dist > .9) vals.push(db);
          const a = Math.pow(clamp((db + 9) / 12, 0, 1), 1.5) * .95;
          const k = (j * gw + i) * 4;
          data[k] = col[0]; data[k + 1] = col[1]; data[k + 2] = col[2]; data[k + 3] = Math.round(a * 255);
        }
      }
      hctx.putImageData(img, 0, 0);
      vals.sort((a, b) => a - b);
      const med = vals[vals.length >> 1] || 0; let n = 0;
      for (let i = 0; i < vals.length; i++) if (Math.abs(vals[i] - med) <= 3) n++;
      cov = vals.length ? n / vals.length * 100 : 0;
    }
    function furniture() {
      const sc = scale();
      ctx.save(); ctx.strokeStyle = 'rgba(242,237,228,.22)'; ctx.fillStyle = 'rgba(242,237,228,.045)'; ctx.lineWidth = 1;
      const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); };
      rr(W * .5 - sc * 1.15, 12, sc * 2.3, sc * .85, 8);                 // sofa
      rr(W * .08, H - sc * 1.2 - 14, sc * .9, sc * 1.2, 8);                 // desk
      rr(W - sc * .8 - 16, H * .35, sc * .8, sc * .8, 99);                  // plant / chair
      ctx.fillStyle = 'rgba(242,237,228,.35)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText('SOFA', W * .5, 12 + sc * .45 + 3);
      ctx.restore();
      ctx.strokeStyle = 'rgba(242,237,228,.18)'; ctx.strokeRect(.5, .5, W - 1, H - 1);
    }
    function waves() {
      const sx = spk.x * W, sy = spk.y * H, maxR = Math.hypot(W, H) * .75;
      for (let k = 0; k < 4; k++) {
        const p = ((t * .22 + k / 4) % 1), r = p * maxR;
        ctx.beginPath();
        for (let a = 0; a <= 64; a++) {
          const th = (a / 64) * Math.PI * 2 - Math.PI / 2;
          const dx = Math.cos(th), dy = Math.sin(th);
          const thr = Math.atan2(dx, -dy), c = -dy;
          const R = r * Math.pow(dirG(thr, c, mix), .8);
          const x = sx + dx * R, y = sy + dy * R;
          a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.strokeStyle = 'rgba(' + col.join(',') + ',' + ((1 - p) * .55).toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    function marker() {
      const sx = spk.x * W, sy = spk.y * H;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26); g.addColorStop(0, 'rgba(' + col.join(',') + ',.55)'); g.addColorStop(1, 'rgba(' + col.join(',') + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#0d0b0a'; ctx.strokeStyle = 'rgb(' + col.join(',') + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 13, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f2ede4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 6.283); ctx.stroke();
      if (mix < .95) { // facing arrow for the conventional speaker
        ctx.fillStyle = 'rgba(242,237,228,' + (1 - mix).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(sx, sy - 27); ctx.lineTo(sx - 6, sy - 18); ctx.lineTo(sx + 6, sy - 18); ctx.closePath(); ctx.fill();
      }
    }
    function render() {
      if (performance.now() - colT > 600) { readCol(); colT = performance.now(); dirty = true; }
      if (dirty) { compute(); dirty = false; }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(heat, 0, 0, gw * CELL, gh * CELL);
      furniture();
      if (!reduce) waves();
      marker();
      const shown = Math.round(cov);
      if (shown !== covShown) { covShown = shown; covEl.textContent = shown; covBar.style.width = shown + '%'; }
    }
    function frame(now) {
      raf = 0; if (!vis) return;
      const dt = Math.min((now - last) / 1000, .05); last = now; t += dt;
      if (Math.abs(mix - target) > .002) { mix = lerp(mix, target, 1 - Math.exp(-dt * 5)); dirty = true; } else if (mix !== target) { mix = target; dirty = true; }
      render(); raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && vis) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function setMode(m) {
      target = m === 'halo' ? 1 : 0; seg.dataset.mode = m;
      $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
      if (reduce) { mix = target; dirty = true; render(); } else kick();
    }
    $$('button', seg).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

    const move = (e) => {
      const r = stage.getBoundingClientRect();
      spk.x = clamp((e.clientX - r.left) / r.width, .06, .94); spk.y = clamp((e.clientY - r.top) / r.height, .12, .94); dirty = true;
      if (reduce) render(); else kick();
    };
    stage.addEventListener('pointerdown', (e) => { drag = true; stage.classList.add('drag'); stage.setPointerCapture(e.pointerId); move(e); });
    stage.addEventListener('pointermove', (e) => { if (drag) move(e); });
    const up = () => { drag = false; stage.classList.remove('drag'); };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);

    resize(); readCol();
    window.addEventListener('resize', () => { resize(); if (reduce) render(); });
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { vis = e[0].isIntersecting; if (vis) kick(); }).observe(stage); else { vis = true; kick(); }
    render();
  });

  /* ------------------------------------------------------------------
     Small interactive bits (no GSAP dependency)
     ------------------------------------------------------------------ */
  // driver ring diagram
  safe('drivers', () => {
    const g = $('#drvRing'); if (!g) return;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'drv'); c.setAttribute('cx', (Math.cos(a) * 36).toFixed(2)); c.setAttribute('cy', (Math.sin(a) * 36).toFixed(2)); c.setAttribute('r', '6');
      c.style.animationDelay = (-i * .3).toFixed(2) + 's'; g.appendChild(c);
    }
  });

  // battery cells
  const cells = $('#cells');
  if (cells) for (let i = 0; i < 18; i++) { const c = document.createElement('i'); c.className = 'on'; cells.appendChild(c); }

  // volume dial
  safe('dial', () => {
    const dial = $('#dial'); if (!dial) return;
    const val = $('#dialVal'); let v = 42, drag = false;
    const set = (n) => { v = clamp(Math.round(n), 0, 100); dial.style.setProperty('--v', v); val.textContent = v; dial.setAttribute('aria-valuenow', v); };
    set(42);
    const fromPointer = (e) => {
      const r = dial.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      let a = Math.atan2(dx, -dy) * 180 / Math.PI; a = (a + 360) % 360;
      let rel = (a - 210 + 360) % 360;
      if (rel > 270) rel = rel > 315 ? 0 : 270;
      set(rel / 270 * 100);
    };
    dial.addEventListener('pointerdown', (e) => { drag = true; dial.setPointerCapture(e.pointerId); fromPointer(e); });
    dial.addEventListener('pointermove', (e) => { if (drag) fromPointer(e); });
    dial.addEventListener('pointerup', () => { drag = false; });
    dial.addEventListener('pointercancel', () => { drag = false; });
    dial.addEventListener('keydown', (e) => {
      const k = e.key; let d = 0;
      if (k === 'ArrowRight' || k === 'ArrowUp') d = 4; else if (k === 'ArrowLeft' || k === 'ArrowDown') d = -4; else if (k === 'Home') return set(0), e.preventDefault(); else if (k === 'End') return set(100), e.preventDefault();
      if (d) { e.preventDefault(); set(v + d); }
    });
  });

  // tile spotlight
  $$('[data-tile]').forEach((t) => {
    t.addEventListener('pointermove', (e) => { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  });

  // finish selector
  safe('finish', () => {
    const names = { kalk: 'Kalk', fjord: 'Fjord', glode: 'Gløde' };
    $$('#finishOpts input').forEach((inp) => {
      inp.addEventListener('change', () => {
        root.dataset.finish = inp.value; $('#finishName').textContent = names[inp.value];
        const box = $('.pre-visual .box');
        if (hasGSAP && !reduce) window.gsap.fromTo(box, { scale: .96, y: 10 }, { scale: 1, y: 0, duration: 1.1, ease: 'elastic.out(1,.55)' });
      });
    });
  });

  // reserve form (demo: nothing is transmitted)
  safe('form', () => {
    const f = $('#reserve'), msg = $('#formMsg'), em = $('#email'); if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim());
      msg.style.color = ok ? '' : '#ff9d7a';
      msg.textContent = ok ? 'Thank you — you’re on the list. (This is a design preview: nothing was sent or stored.)' : 'Please enter a valid email address.';
      if (!ok) em.focus();
    });
  });

  /* ------------------------------------------------------------------
     GSAP: reveals, pinned object, horizontal materials
     ------------------------------------------------------------------ */
  function finalStates() {
    $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
  }
  if (!hasGSAP) { finalStates(); return; }

  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  // split headings / statement
  $$('.split').forEach((el) => splitInto(el, maskWrap));
  const stmt = $('#statement'); if (stmt) splitInto(stmt, wordWrap);

  // -- hero intro
  safe('hero', () => {
    const chars = $$('.hero-word .ch > span');
    const sp = $('.hero-speaker .tilt');
    const metaEls = [$('.hero-tag'), $('.hero-side p'), $('.hero-side .cta')];
    const foot = $$('.hero-foot span');
    const navEls = [$('.logo'), ...$$('.nav-links a'), $('.nav .pill')];
    if (reduce) return;
    gsap.set(chars, { yPercent: 115 });
    gsap.set(sp, { y: 80, opacity: 0, scale: .94 });
    gsap.set(metaEls, { y: 30, opacity: 0 });
    gsap.set(foot, { opacity: 0 });
    gsap.set(navEls, { y: -16, opacity: 0 });
    gsap.set('#rings', { opacity: 0 });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .15 });
    tl.to(chars, { yPercent: 0, duration: 1.6, stagger: .09 }, 0)
      .to('#rings', { opacity: 1, duration: 2 }, .2)
      .to(sp, { y: 0, opacity: 1, scale: 1, duration: 1.8, ease: 'power3.out' }, .35)
      .to(metaEls, { y: 0, opacity: 1, duration: 1.2, stagger: .12 }, .9)
      .to(foot, { opacity: 1, duration: 1, stagger: .1 }, 1.1)
      .to(navEls, { y: 0, opacity: 1, duration: 1, stagger: .05 }, .7);

    // pointer tilt + counter-parallax on the wordmark
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      const word = $('.hero-word');
      const rx = gsap.quickTo(sp, 'rotationX', { duration: 1.1, ease: 'power3' });
      const ry = gsap.quickTo(sp, 'rotationY', { duration: 1.1, ease: 'power3' });
      const wx = gsap.quickTo(word, 'x', { duration: 1.4, ease: 'power3' });
      gsap.set(sp, { transformPerspective: 1100 });
      $('.hero').addEventListener('pointermove', (e) => {
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        ry(nx * 14); rx(-ny * 7); wx(-nx * 36);
      });
    }
    // hero scroll: speaker drifts slower than the page, word fades
    gsap.to('.hero-word', { yPercent: 18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-speaker .spk', { yPercent: -4, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });

  // -- statement: words light up with scroll
  safe('statement', () => {
    const words = $$('#statement .w');
    if (reduce) return;
    gsap.set(words, { opacity: .14 });
    gsap.to(words, { opacity: 1, ease: 'none', stagger: .12, duration: .4, scrollTrigger: { trigger: '.statement', start: 'top 72%', end: 'bottom 62%', scrub: .5 } });
  });

  // -- split headings
  safe('headings', () => {
    if (reduce) return;
    $$('.split').forEach((el) => {
      gsap.from($$('.mi', el), { yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 46, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  });

  // -- counters
  safe('counters', () => {
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      if (reduce) { el.textContent = end; return; }
      const o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
    });
    if (cells) {
      const ci = $$('i', cells);
      if (reduce) return;
      ci.forEach((c) => c.classList.remove('on'));
      ScrollTrigger.create({ trigger: cells, start: 'top 92%', once: true, onEnter: () => ci.forEach((c, i) => gsap.delayedCall(i * .06 + .1, () => c.classList.add('on'))) });
    }
  });

  // -- frequency curve draw
  safe('curve', () => {
    const p = $('#curve'); if (!p || reduce) return;
    const L = p.getTotalLength();
    gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
    gsap.set('.curve-glow', { opacity: 0 });
    gsap.set('.graph .band', { opacity: 0 });
    ScrollTrigger.create({ trigger: '.graph', start: 'top 85%', once: true, onEnter: () => {
      gsap.to(p, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut' });
      gsap.to('.graph .band', { opacity: 1, duration: 2, delay: .8 });
      gsap.to('.curve-glow', { opacity: .18, duration: 2, delay: 1 });
    } });
  });

  // -- bento tiles
  safe('tiles', () => {
    if (reduce) return;
    ScrollTrigger.batch('.tile', { start: 'top 92%', once: true, onEnter: (b) => gsap.from(b, { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .12 }) });
  });

  // -- specs
  safe('specs', () => {
    if (reduce) return;
    $$('.spec-row').forEach((row) => {
      gsap.fromTo(row, { '--lx': 0 }, { '--lx': 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 92%', once: true } });
      gsap.from($$('dt, dd', row), { y: 24, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: row, start: 'top 92%', once: true } });
    });
    $$('.dim .dp').forEach((p) => {
      const L = p.getTotalLength ? p.getTotalLength() : 0; if (!L) return;
      gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
    });
    gsap.set('.dim text', { opacity: 0 });
    ScrollTrigger.create({ trigger: '.dim', start: 'top 80%', once: true, onEnter: () => {
      gsap.to('.dim .dp', { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', stagger: .15 });
      gsap.to('.dim text', { opacity: 1, duration: 1, delay: 1.6, stagger: .2 });
    } });
  });

  // -- pre-order + footer
  safe('preorder', () => {
    if (reduce) return;
    gsap.from('.pre-visual .box', { y: 80, opacity: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.preorder', start: 'top 70%', once: true } });
    gsap.from('.pre-copy > *:not(.h2)', { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: '.pre-copy', start: 'top 70%', once: true } });
    gsap.to('.pre-visual .box', { y: -30, ease: 'none', scrollTrigger: { trigger: '.preorder', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.foot-word', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  });

  // -- pinned exploded object + horizontal materials
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const sec = $('#object'); if (!sec) return;
    sec.classList.add('is-pinned');
    const vis = $('#objVisual .obj-inner');
    const top = $('.sp-top', vis), body = $('.sp-body', vis), base = $('.sp-base', vis), core = $('.sp-core', vis);
    const shadows = $$('.sp-shadow', vis), spill = $$('.sp-top .spill', vis);
    const steps = $$('.obj-step'), prog = $$('.obj-progress i');
    gsap.set(steps, { opacity: 0, y: 28 });
    gsap.set(steps[0], { opacity: 1, y: 0 });
    gsap.set(prog, { scaleX: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: { trigger: '.obj-stage', start: 'top top', end: '+=480%', pin: true, scrub: .9, anticipatePin: 1, invalidateOnRefresh: true }
    });
    tl.fromTo(vis, { scale: .93 }, { scale: 1, duration: .8, ease: 'power2.out' }, 0)
      .to(prog[0], { scaleX: 1, duration: 1, ease: 'none' }, 0)
      // 01 -> 02 : lift the crown
      .to(steps[0], { opacity: 0, y: -28, duration: .4 }, .85)
      .to(steps[1], { opacity: 1, y: 0, duration: .4 }, 1.1)
      .to(top, { y: -116, duration: 1 }, 1)
      .to(spill, { scale: 1.12, svgOrigin: '160 70', duration: 1 }, 1)
      .to(prog[1], { scaleX: 1, duration: 1, ease: 'none' }, 1)
      // 02 -> 03 : dissolve the sleeve, reveal the core
      .to(steps[1], { opacity: 0, y: -28, duration: .4 }, 1.95)
      .to(steps[2], { opacity: 1, y: 0, duration: .4 }, 2.2)
      .to(body, { opacity: .06, duration: 1 }, 2)
      .fromTo(core, { opacity: 0, scale: .96, svgOrigin: '160 250' }, { opacity: 1, scale: 1, duration: 1 }, 2)
      .to(prog[2], { scaleX: 1, duration: 1, ease: 'none' }, 2)
      // 03 -> 04 : the oak foot steps away
      .to(steps[2], { opacity: 0, y: -28, duration: .4 }, 3.05)
      .to(steps[3], { opacity: 1, y: 0, duration: .4 }, 3.3)
      .to(base, { y: 46, duration: 1 }, 3.1)
      .to(shadows, { opacity: .55, duration: 1 }, 3.1)
      .to(prog[3], { scaleX: 1, duration: 1.5, ease: 'none' }, 3.1)
      // reassemble
      .to(steps[3], { opacity: 0, y: -28, duration: .4 }, 4.5)
      .to([top, base], { y: 0, duration: 1.1 }, 4.4)
      .to(spill, { scale: 1, duration: 1.1 }, 4.4)
      .to(body, { opacity: 1, duration: 1 }, 4.5)
      .to(core, { opacity: 0, duration: .8 }, 4.4)
      .to(shadows, { opacity: 1, duration: 1 }, 4.4)
      .to(vis, { scale: 1.04, duration: 1.1 }, 4.4)
      .to({}, { duration: .3 });
    return () => { sec.classList.remove('is-pinned'); };
  });

  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const sec = $('#materials'), pin = $('#matPin'), track = $('#matTrack'); if (!sec || !pin || !track) return;
    sec.classList.add('is-hscroll');
    track.style.width = 'max-content';
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (s) => { const b = $('.mat-bar i'); if (b) b.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')'; }
      }
    });
    $$('.swatch').forEach((sw) => {
      const tex = $('.tex', sw);
      gsap.fromTo(tex, { xPercent: -9 }, { xPercent: 9, ease: 'none', scrollTrigger: { trigger: sw, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    return () => { sec.classList.remove('is-hscroll'); track.style.width = ''; };
  });

  mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    $$('.mat-card, .mat-end').forEach((c) => gsap.from(c, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 90%', once: true } }));
  });

  // fonts change layout; refresh once everything has loaded
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', () => setTimeout(refresh, 200));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(refresh, 100));
})();
