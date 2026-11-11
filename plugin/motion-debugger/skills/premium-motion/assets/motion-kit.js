/*! motion-kit.js — premium-motion skill (Motion Debugger). Dependency-free, ~7 KB min.
 * Copy next to your page and load with <script src="motion-kit.js" defer></script>.
 * React, Next.js, Vue, Svelte: load it once (Next.js: <Script src="/motion-kit.js" strategy="afterInteractive"/>).
 * Elements added later (route changes, client renders) are wired automatically, and removed ones are released.
 * Pair with motion-kit.css. Every effect is opt-in through data attributes and is
 * safe without JavaScript (content stays visible) and under prefers-reduced-motion.
 *
 *   data-reveal="up|fade|scale|left|right|clip|blur"  reveal once when scrolled into view
 *   data-stagger="70"            on a parent: children reveal in sequence (ms apart)
 *   data-split="lines|words|chars"  masked text rise (use on headings; inline markup such as <em> is kept)
 *   data-delay="120"             extra delay (ms) for one element
 *   data-count="1280" data-count-decimals="1" data-count-prefix="$" data-count-suffix="%" data-count-from="900"
 *                                (write the final value in the HTML too; until it runs the kit shows the from value)
 *   data-progress                sets --p (0→1) while the element scrolls through the viewport
 *                                (pin a child with position:sticky inside a tall parent for storytelling)
 *   data-parallax="0.15"         translateY by speed × distance from viewport centre
 *   data-magnetic="0.3"          element leans toward the pointer
 *   data-spotlight               sets --mx/--my (px) on pointer move for radial highlights
 *   data-tilt="6"                3D tilt toward the pointer (max degrees)
 *   data-marquee                 duplicates children for a seamless loop (CSS does the motion)
 *   data-nav                     toggles .is-scrolled after 24px and .is-hidden when scrolling down
 *
 * Scroll scenes (the advanced layer — see TASTE.md for when to use which):
 *   data-hscroll + [data-hscroll-track]  pinned section whose track slides sideways as you scroll down
 *                                (phones and reduced motion fall back to a native swipe row)
 *   data-stack                   on a parent: children pin and pile up; covered cards recede (--cover 0→1)
 *   data-expand                  inside a data-progress parent: media grows from an inset card to full-bleed
 *   data-exit                    hero/section content drifts up, shrinks and fades as it scrolls away (--exit)
 *   data-read                    words brighten one by one as the block is read (--read 0→1)
 *   data-draw / data-draw="scrub"  <svg> strokes draw on reveal, or follow the nearest --p
 *   data-scramble                text resolves from scrambled glyphs when revealed
 *   data-bg="#0E0E0C" data-ink="#F3EFE6"  the page background and ink cross-fade while this section
 *                                holds the middle of the viewport (opt-in: html.mk-themed sets body colours)
 *   --velocity on <html>         smoothed scroll speed, -1…1, for skew/stretch (.mk-velocity-skew, marquees)
 */
(() => {
  const root = document.documentElement;
  root.classList.add('mk-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  // Every setup pass is idempotent: an element is wired once per feature, so refresh() and
  // DOM mutations (SPA routes, client-rendered sections) only touch new elements.
  const seen = {};
  const fresh = (feature, list) => { const set = (seen[feature] ||= new WeakSet()); return list.filter((el) => !set.has(el) && set.add(el)); };

  function split(el) {
    if (el.dataset.splitDone) return;
    const mode = el.dataset.split || 'words';
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    let index = 0;
    const piece = (text) => {
      const mask = document.createElement('span'); mask.className = 'mk-mask'; mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span'); inner.className = 'mk-piece'; inner.style.setProperty('--i', index++); inner.textContent = text;
      mask.append(inner); return mask;
    };
    // Split every text node in place, so <em>, <strong>, coloured spans and <br> keep their styling.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { fragment.append(' '); continue; }
        if (mode === 'chars') { const word = document.createElement('span'); word.className = 'mk-word'; for (const char of part) word.append(piece(char)); fragment.append(word); }
        else fragment.append(piece(part));
      }
      node.replaceWith(fragment);
    }
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

  const formatCount = (el, value) => {
    const decimals = Number(el.dataset.countDecimals || 0);
    return (el.dataset.countPrefix || '') + value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (el.dataset.countSuffix || '');
  };
  // Counters never sit at 0: before they run they show their starting value (60% of the end by default).
  const countFrom = (el) => (el.dataset.countFrom !== undefined ? parseFloat(el.dataset.countFrom) : parseFloat(el.dataset.count) * 0.6);
  function count(el) {
    if (el.dataset.countDone) return;
    el.dataset.countDone = '1';
    const end = parseFloat(el.dataset.count), from = countFrom(el);
    if (reduce.matches) { el.textContent = formatCount(el, end); return; }
    const duration = Number(el.dataset.countDuration || 1400);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = formatCount(el, from + (end - from) * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFXYZ0123456789';
  function scramble(el) {
    const target = el.dataset.scrambleText || el.textContent;
    el.dataset.scrambleText = target;
    el.classList.add('mk-live');
    if (reduce.matches) { el.textContent = target; return; }
    el.setAttribute('aria-label', target);
    const duration = Number(el.dataset.scrambleDuration || 1100);
    const start = performance.now() + (parseFloat(el.style.getPropertyValue('--mk-delay')) || 0);
    const frame = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const settled = Math.floor(target.length * (1 - Math.pow(1 - t, 3)));
      el.textContent = target.slice(0, settled) + [...target.slice(settled)].map((c) => (c === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      if (t < 1) requestAnimationFrame(frame); else { el.textContent = target; el.removeAttribute('aria-label'); }
    };
    requestAnimationFrame(frame);
  }

  function wrapWords(el) {
    if (el.dataset.readDone) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    const total = nodes.reduce((n, node) => n + node.nodeValue.trim().split(/\s+/).length, 0);
    let index = 0;
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { fragment.append(part); continue; }
        const span = document.createElement('span');
        span.className = 'mk-w';
        span.style.setProperty('--t', (index++ / total).toFixed(4));
        span.textContent = part;
        fragment.append(span);
      }
      node.replaceWith(fragment);
    }
    el.dataset.readDone = '1';
  }

  function reveal(el) {
    el.classList.add('is-in');
    if (el.hasAttribute('data-reveal')) {
      // Hand the element back to its own styles once the reveal has finished.
      const delay = parseFloat(el.style.getPropertyValue('--mk-delay')) || 0;
      setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, delay + 1300);
    }
    if (el.hasAttribute('data-scramble')) scramble(el);
    if (el.dataset.count !== undefined) count(el);
    $$('[data-count]', el).forEach(count);
  }

  function setupReveals() {
    $$('[data-split]').forEach(split);
    for (const el of fresh('count-init', $$('[data-count]'))) if (!el.dataset.countDone) el.textContent = formatCount(el, reduce.matches ? parseFloat(el.dataset.count) : countFrom(el));
    for (const parent of fresh('stagger', $$('[data-stagger]'))) {
      const gap = Number(parent.dataset.stagger || 70);
      [...parent.children].forEach((child, i) => {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', parent.dataset.staggerReveal || 'up');
        child.style.setProperty('--mk-delay', `${i * gap + Number(child.dataset.delay || 0)}ms`);
      });
    }
    for (const el of $$('[data-delay]')) if (!el.style.getPropertyValue('--mk-delay')) el.style.setProperty('--mk-delay', `${el.dataset.delay}ms`);
    for (const svg of fresh('draw', $$('svg[data-draw]'))) {
      $$('path,line,polyline,polygon,circle,ellipse,rect', svg).forEach((shape, i) => {
        shape.setAttribute('pathLength', '1');
        shape.classList.add('mk-draw-path');
        shape.style.setProperty('--di', i);
      });
    }
    const targets = fresh('reveal', $$('[data-reveal],[data-split],[data-count],[data-scramble],svg[data-draw]:not([data-draw="scrub"])'));
    if (!targets.length) return;
    if (reduce.matches || !('IntersectionObserver' in window)) { targets.forEach(reveal); return; }
    // Low threshold + negative bottom margin: tall elements on phones still trigger.
    // A fully clipped element reports intersectionRatio 0 and never crosses a threshold,
    // so clip reveals watch their parent instead.
    io ||= new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { (watched.get(entry.target) || []).forEach(reveal); watched.delete(entry.target); io.unobserve(entry.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    for (const el of targets) {
      const sentinel = el.dataset.reveal === 'clip' && el.parentElement ? el.parentElement : el;
      if (!watched.has(sentinel)) { watched.set(sentinel, []); io.observe(sentinel); }
      watched.get(sentinel).push(el);
    }
    // Safety net: anything already scrolled past (anchor jumps, restored scroll) is shown.
    const passed = () => setTimeout(() => targets.forEach((el) => { if (el.isConnected && el.getBoundingClientRect().bottom < 0) reveal(el); }), 400);
    if (document.readyState === 'complete') passed(); else addEventListener('load', passed, { once: true });
  }
  let io = null;
  const watched = new Map();

  // Scroll-linked work shares one rAF-throttled loop and reads layout once per frame.
  // Each entry is [owner element or null, update]; entries whose owner left the DOM are dropped.
  let scrollers = [];
  const addScroller = (owner, update) => { scrollers.push([owner, update]); };
  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const vh = innerHeight;
      scrollers = scrollers.filter(([owner]) => !owner || owner.isConnected);
      for (const [, update] of scrollers) update(vh);
    });
  }

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const narrow = matchMedia('(max-width: 760px)');

  function setupHscroll() {
    for (const section of fresh('hscroll', $$('[data-hscroll]'))) {
      const track = section.querySelector('[data-hscroll-track]');
      if (!track) continue;
      let stage = track.parentElement;
      if (stage === section) { stage = document.createElement('div'); section.insertBefore(stage, track); stage.appendChild(track); }
      stage.classList.add('mk-pin');
      let distance = 0;
      const size = () => {
        const on = !reduce.matches && !narrow.matches;
        section.classList.toggle('mk-hscroll-on', on);
        if (!on) { section.style.height = ''; track.style.transform = ''; distance = 0; return; }
        distance = Math.max(0, track.scrollWidth - stage.clientWidth);
        section.style.height = `${Math.round(innerHeight + distance)}px`;
      };
      size();
      addEventListener('resize', () => { if (section.isConnected) size(); });
      addEventListener('load', () => { size(); onScroll(); }, { once: true });
      addScroller(section, (vh) => {
        if (!distance) return;
        const r = section.getBoundingClientRect();
        const p = clamp01(-r.top / Math.max(1, r.height - vh));
        track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
        section.style.setProperty('--p', p.toFixed(4));
      });
    }
  }

  function setupStack() {
    for (const parent of fresh('stack', $$('[data-stack]'))) {
      const cards = [...parent.children];
      cards.forEach((card, i) => { card.classList.add('mk-stack-card'); card.style.setProperty('--i', i); });
      if (reduce.matches) continue;
      addScroller(parent, (vh) => {
        for (let i = 0; i < cards.length - 1; i++) {
          const top = cards[i].getBoundingClientRect().top, next = cards[i + 1].getBoundingClientRect().top;
          cards[i].style.setProperty('--cover', clamp01((vh - next) / Math.max(1, vh - top)).toFixed(4));
        }
      });
    }
  }

  let themeSections = [], themeCurrent = null, themesOn = false;
  const applyTheme = (section) => {
    if (section === themeCurrent) return;
    themeCurrent = section;
    root.style.setProperty('--page-bg', section.dataset.bg);
    if (section.dataset.ink) root.style.setProperty('--page-ink', section.dataset.ink);
  };
  function setupThemes() {
    // Re-read on every pass so a client-side route change brings its own chapters.
    themeSections = $$('[data-bg]');
    if (!themeSections.length) {
      if (themesOn) { root.classList.remove('mk-themed'); root.style.removeProperty('--page-bg'); root.style.removeProperty('--page-ink'); themeCurrent = null; }
      return;
    }
    root.classList.add('mk-themed');
    if (!themeCurrent || !themeCurrent.isConnected) { themeCurrent = null; applyTheme(themeSections[0]); }
    if (themesOn) return;
    themesOn = true;
    addScroller(null, (vh) => {
      const mid = vh / 2;
      for (const section of themeSections) {
        const r = section.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { applyTheme(section); return; }
      }
    });
  }

  // Smoothed scroll velocity (-1…1) on <html> as --velocity; decays to 0 when scrolling stops.
  let velocity = 0, lastY = scrollY, lastT = performance.now(), decaying = false;
  function trackVelocity() {
    const now = performance.now(), dt = Math.max(16, now - lastT);
    const instant = Math.max(-1, Math.min(1, (scrollY - lastY) / dt / 3));
    velocity += (instant - velocity) * 0.35;
    lastY = scrollY; lastT = now;
    root.style.setProperty('--velocity', velocity.toFixed(3));
    if (!decaying) { decaying = true; requestAnimationFrame(decay); }
  }
  function decay() {
    if (performance.now() - lastT > 60) velocity *= 0.86;
    root.style.setProperty('--velocity', Math.abs(velocity) < 0.002 ? '0' : velocity.toFixed(3));
    if (Math.abs(velocity) < 0.002) { velocity = 0; decaying = false; return; }
    requestAnimationFrame(decay);
  }

  let listening = false, velocityOn = false;
  function setupScroll() {
    setupHscroll();
    setupStack();
    setupThemes();
    $$('[data-read]').forEach(wrapWords);
    if (reduce.matches) $$('[data-read]').forEach((el) => el.style.setProperty('--read', '1'));
    else {
      for (const el of fresh('read', $$('[data-read]'))) {
        addScroller(el, (vh) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--read', clamp01((vh * 0.85 - r.top) / (vh * 0.35 + r.height)).toFixed(4));
        });
      }
      for (const el of fresh('exit', $$('[data-exit]'))) {
        addScroller(el, () => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--exit', clamp01(-r.top / Math.max(1, r.height)).toFixed(4));
        });
      }
      if (!velocityOn) { velocityOn = true; addScroller(null, trackVelocity); }
    }
    for (const el of fresh('progress', $$('[data-progress]'))) {
      addScroller(el, (vh) => {
        const r = el.getBoundingClientRect();
        const total = r.height - vh;
        const p = total > 0 ? -r.top / total : (vh - r.top) / (vh + r.height);
        el.style.setProperty('--p', clamp01(p).toFixed(4));
      });
    }
    if (!reduce.matches) for (const el of fresh('parallax', $$('[data-parallax]'))) {
      const speed = parseFloat(el.dataset.parallax || '0.15');
      addScroller(el, (vh) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    }
    for (const nav of fresh('nav', $$('[data-nav]'))) {
      let last = scrollY;
      addScroller(nav, () => {
        const y = scrollY;
        nav.classList.toggle('is-scrolled', y > 24);
        nav.classList.toggle('is-hidden', y > last && y > 400 && !nav.contains(document.activeElement));
        last = y;
      });
    }
    if (scrollers.length && !listening) {
      listening = true;
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
    }
    if (scrollers.length) onScroll();
  }

  function setupPointer() {
    if (!finePointer.matches) return;
    for (const el of fresh('spotlight', $$('[data-spotlight]'))) {
      el.addEventListener('pointermove', (event) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${event.clientX - r.left}px`);
        el.style.setProperty('--my', `${event.clientY - r.top}px`);
      });
    }
    if (reduce.matches) return;
    for (const el of fresh('magnetic', $$('[data-magnetic]'))) {
      const strength = parseFloat(el.dataset.magnetic || '0.3');
      el.addEventListener('pointermove', (event) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate3d(${(event.clientX - r.left - r.width / 2) * strength}px, ${(event.clientY - r.top - r.height / 2) * strength}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    }
    for (const el of fresh('tilt', $$('[data-tilt]'))) {
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
  // Frameworks mount and replace sections after load. Watch for added elements (text-only changes
  // such as a running counter are ignored) and wire them on the next frame.
  let pending = false;
  const observer = 'MutationObserver' in window ? new MutationObserver((records) => {
    if (pending || !records.some((record) => [...record.addedNodes].some((node) => node.nodeType === 1))) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; start(); });
  }) : null;
  const boot = () => { start(); if (observer) observer.observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.motionKit = { reveal, split, count, scramble, refresh: start };
})();
