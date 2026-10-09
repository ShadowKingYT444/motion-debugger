/*! motion-kit.js — premium-motion skill (Motion Debugger). Dependency-free, ~4 KB min.
 * Copy next to your page and load with <script src="motion-kit.js" defer></script>.
 * Pair with motion-kit.css. Every effect is opt-in through data attributes and is
 * safe without JavaScript (content stays visible) and under prefers-reduced-motion.
 *
 *   data-reveal="up|fade|scale|left|right|clip|blur"  reveal once when scrolled into view
 *   data-stagger="70"            on a parent: children reveal in sequence (ms apart)
 *   data-split="lines|words|chars"  masked text rise (use on headings)
 *   data-delay="120"             extra delay (ms) for one element
 *   data-count="1280" data-count-decimals="1" data-count-prefix="$" data-count-suffix="%"
 *   data-progress                sets --p (0→1) while the element scrolls through the viewport
 *                                (pin a child with position:sticky inside a tall parent for storytelling)
 *   data-parallax="0.15"         translateY by speed × distance from viewport centre
 *   data-magnetic="0.3"          element leans toward the pointer
 *   data-spotlight               sets --mx/--my (px) on pointer move for radial highlights
 *   data-tilt="6"                3D tilt toward the pointer (max degrees)
 *   data-marquee                 duplicates children for a seamless loop (CSS does the motion)
 *   data-nav                     toggles .is-scrolled after 24px and .is-hidden when scrolling down
 */
(() => {
  const root = document.documentElement;
  root.classList.add('mk-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function split(el) {
    if (el.dataset.splitDone) return;
    const mode = el.dataset.split || 'words';
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    const words = text.split(' ');
    let index = 0;
    const wrap = (inner) => `<span class="mk-mask" aria-hidden="true"><span class="mk-piece" style="--i:${index++}">${inner}</span></span>`;
    if (mode === 'chars') el.innerHTML = words.map((word) => `<span class="mk-word">${[...word].map(wrap).join('')}</span>`).join(' ');
    else el.innerHTML = words.map(wrap).join(' ');
    if (mode === 'lines') {
      // Group measured words into lines so each line rises as one piece.
      const pieces = $$('.mk-piece', el);
      let line = -1, top = null;
      for (const piece of pieces) {
        const y = Math.round(piece.getBoundingClientRect().top);
        if (top === null || Math.abs(y - top) > 4) { line++; top = y; }
        piece.style.setProperty('--i', line);
      }
    }
    el.dataset.splitDone = '1';
  }

  function count(el) {
    const end = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.countDecimals || 0);
    const format = (value) => (el.dataset.countPrefix || '') + value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (el.dataset.countSuffix || '');
    if (reduce.matches) { el.textContent = format(end); return; }
    const duration = Number(el.dataset.countDuration || 1600);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = format(end * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function reveal(el) {
    el.classList.add('is-in');
    if (el.hasAttribute('data-reveal')) {
      // Hand the element back to its own styles once the reveal has finished.
      const delay = parseFloat(el.style.getPropertyValue('--mk-delay')) || 0;
      setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, delay + 1300);
    }
    if (el.dataset.count !== undefined) count(el);
    $$('[data-count]', el).forEach(count);
  }

  function setupReveals() {
    $$('[data-split]').forEach(split);
    for (const parent of $$('[data-stagger]')) {
      const gap = Number(parent.dataset.stagger || 70);
      [...parent.children].forEach((child, i) => {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', parent.dataset.staggerReveal || 'up');
        child.style.setProperty('--mk-delay', `${i * gap + Number(child.dataset.delay || 0)}ms`);
      });
    }
    for (const el of $$('[data-delay]')) if (!el.style.getPropertyValue('--mk-delay')) el.style.setProperty('--mk-delay', `${el.dataset.delay}ms`);
    const targets = $$('[data-reveal],[data-split],[data-count]');
    if (reduce.matches || !('IntersectionObserver' in window)) { targets.forEach(reveal); return; }
    // Low threshold + negative bottom margin: tall elements on phones still trigger.
    // A fully clipped element reports intersectionRatio 0 and never crosses a threshold,
    // so clip reveals watch their parent instead.
    const watched = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { (watched.get(entry.target) || []).forEach(reveal); watched.delete(entry.target); io.unobserve(entry.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    for (const el of targets) {
      const sentinel = el.dataset.reveal === 'clip' && el.parentElement ? el.parentElement : el;
      if (!watched.has(sentinel)) { watched.set(sentinel, []); io.observe(sentinel); }
      watched.get(sentinel).push(el);
    }
    // Safety net: anything already scrolled past (anchor jumps, restored scroll) is shown.
    addEventListener('load', () => setTimeout(() => targets.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) reveal(el); }), 400));
  }

  // Scroll-linked work shares one rAF-throttled loop and reads layout once per frame.
  const scrollers = [];
  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const vh = innerHeight;
      for (const item of scrollers) item(vh);
    });
  }

  function setupScroll() {
    for (const el of $$('[data-progress]')) {
      scrollers.push((vh) => {
        const r = el.getBoundingClientRect();
        const total = r.height - vh;
        const p = total > 0 ? -r.top / total : (vh - r.top) / (vh + r.height);
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
      });
    }
    if (!reduce.matches) for (const el of $$('[data-parallax]')) {
      const speed = parseFloat(el.dataset.parallax || '0.15');
      scrollers.push((vh) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    }
    for (const nav of $$('[data-nav]')) {
      let last = scrollY;
      scrollers.push(() => {
        const y = scrollY;
        nav.classList.toggle('is-scrolled', y > 24);
        nav.classList.toggle('is-hidden', y > last && y > 400 && !nav.contains(document.activeElement));
        last = y;
      });
    }
    if (scrollers.length) {
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
      onScroll();
    }
  }

  function setupPointer() {
    if (!finePointer.matches) return;
    for (const el of $$('[data-spotlight]')) {
      el.addEventListener('pointermove', (event) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${event.clientX - r.left}px`);
        el.style.setProperty('--my', `${event.clientY - r.top}px`);
      });
    }
    if (reduce.matches) return;
    for (const el of $$('[data-magnetic]')) {
      const strength = parseFloat(el.dataset.magnetic || '0.3');
      el.addEventListener('pointermove', (event) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate3d(${(event.clientX - r.left - r.width / 2) * strength}px, ${(event.clientY - r.top - r.height / 2) * strength}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    }
    for (const el of $$('[data-tilt]')) {
      const max = parseFloat(el.dataset.tilt || '6');
      el.addEventListener('pointermove', (event) => {
        const r = el.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - 0.5, y = (event.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    }
  }

  function setupMarquee() {
    for (const el of $$('[data-marquee]')) {
      if (el.dataset.marqueeDone) continue;
      const items = [...el.children];
      for (const item of items) { const copy = item.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); el.appendChild(copy); }
      el.dataset.marqueeDone = '1';
    }
  }

  const start = () => { setupMarquee(); setupReveals(); setupScroll(); setupPointer(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.motionKit = { reveal, split, count, refresh: start };
})();
