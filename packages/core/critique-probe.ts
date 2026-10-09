// Browser-side instrumentation for motion critique. Kept as plain JavaScript strings so the
// exact source runs in the page without bundler helpers. Everything here observes; nothing
// mutates the page under review.

export const critiqueInitScript=String.raw`(() => {
  if (window.__mc) return;
  const mc = window.__mc = { phase: 'load', anims: [], mutations: {}, frames: [], shifts: 0, longFrames: 0, errors: [], t0: performance.now() };
  const ids = new WeakMap(); let next = 1;
  const path = (el) => {
    if (!el || el.nodeType !== 1) return '';
    const parts = [];
    for (let node = el, depth = 0; node && node.nodeType === 1 && depth < 4; node = node.parentElement, depth++) {
      let part = node.localName;
      if (node.id) { parts.unshift(part + '#' + node.id); break; }
      const cls = [...node.classList].filter(c => c.length < 32).slice(0, 2);
      if (cls.length) part += '.' + cls.join('.');
      parts.unshift(part);
    }
    return parts.join(' > ');
  };
  const props = (anim) => {
    try {
      const frames = anim.effect && anim.effect.getKeyframes ? anim.effect.getKeyframes() : [];
      const out = new Set(); const easings = new Set();
      for (const frame of frames) for (const key of Object.keys(frame)) {
        if (key === 'easing') { if (frame.easing && frame.easing !== 'linear') easings.add(frame.easing); continue; }
        if (!['offset', 'computedOffset', 'composite'].includes(key)) out.add(key);
      }
      if (anim.transitionProperty) out.add(anim.transitionProperty);
      return { properties: [...out], keyframeEasings: [...easings] };
    } catch { return { properties: [], keyframeEasings: [] }; }
  };
  const poll = () => {
    let list = [];
    try { list = document.getAnimations(); } catch { return; }
    for (const anim of list) {
      if (ids.has(anim)) continue;
      ids.set(anim, next++);
      const timing = anim.effect && anim.effect.getComputedTiming ? anim.effect.getComputedTiming() : {};
      const target = anim.effect && anim.effect.target;
      const pseudo = anim.effect && anim.effect.pseudoElement;
      const rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      mc.anims.push({
        id: ids.get(anim), phase: mc.phase, kind: anim.constructor && anim.constructor.name || 'Animation',
        name: anim.animationName || anim.transitionProperty || anim.id || '',
        target: path(target) + (pseudo || ''), duration: Number(timing.duration) || 0, delay: Number(timing.delay) || 0,
        iterations: timing.iterations === Infinity ? 'infinite' : timing.iterations, easing: timing.easing || 'linear',
        ...props(anim), seenAt: Math.round(performance.now() - mc.t0),
        docTop: rect ? Math.round(rect.top + scrollY) : null, inView: rect ? rect.bottom > 0 && rect.top < innerHeight : null,
        onHovered: !!(target && target.closest && target.closest('[data-mc-h]'))
      });
      if (target) target.__mcAnimated = true;
    }
  };
  setInterval(poll, 30);
  const raf = (t) => { poll(); mc.frames.push([mc.phase, t]); if (mc.frames.length > 20000) mc.frames.splice(0, 5000); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  const layoutProps = /(^|;|\s)(top|left|right|bottom|width|height|margin[a-z-]*|padding[a-z-]*)\s*:/i;
  const motionProps = /(transform|translate|rotate|scale|opacity|clip-path|filter|stroke-dashoffset|--[\w-]+)\s*:/i;
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const el = record.target; if (!el || el.nodeType !== 1) continue;
      const style = el.getAttribute('style') || '';
      if (style === (record.oldValue || '')) continue;
      const key = mc.phase;
      const bucket = mc.mutations[key] = mc.mutations[key] || { count: 0, layout: 0, motion: 0, elements: {} };
      bucket.count++;
      if (layoutProps.test(style)) bucket.layout++;
      if (motionProps.test(style)) { bucket.motion++; el.__mcAnimated = true; }
      const id = path(el); bucket.elements[id] = (bucket.elements[id] || 0) + 1;
    }
  });
  const start = () => observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'], attributeOldValue: true, subtree: true });
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  // Class toggles drive most CSS reveals; mark them so section coverage sees transition-less reveals too.
  const classObserver = new MutationObserver((records) => { for (const record of records) if (record.target.nodeType === 1 && mc.phase !== 'load-static') record.target.__mcClassChanged = mc.phase; });
  const startClasses = () => classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
  if (document.documentElement) startClasses(); else document.addEventListener('DOMContentLoaded', startClasses);
  try { new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) mc.shifts += entry.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  try { new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (entry.duration > 50) mc.longFrames++; }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
  addEventListener('error', (event) => mc.errors.push(String(event.message || event.error).slice(0, 300)));
  addEventListener('unhandledrejection', (event) => mc.errors.push('Unhandled rejection: ' + String(event.reason).slice(0, 280)));
})();`;

const visibilityHelpers=String.raw`  // A clip-path that collapses to zero area hides content as completely as opacity 0.
  const collapsed = (el, clip) => {
    if (!clip || clip === 'none') return false;
    if (/^(circle|ellipse)\(\s*0(px|%)?[\s)]/.test(clip)) return true;
    const inset = clip.match(/^inset\(([^)]*)\)/); if (!inset) return false;
    const r = el.getBoundingClientRect();
    const len = (x, size) => x.endsWith('%') ? parseFloat(x) / 100 * size : parseFloat(x) || 0;
    const v = inset[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
    const [t, ri = t, b = t, l = ri] = v;
    return len(t, r.height) + len(b, r.height) >= r.height - 0.5 || len(l, r.width) + len(ri, r.width) >= r.width - 0.5;
  };
  const effectiveOpacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); o *= Number(s.opacity); if (s.visibility === 'hidden' || s.display === 'none' || collapsed(n, s.clipPath)) return 0; } return o; };
  const intentionallyHidden = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { if (n.hidden || n.getAttribute('aria-hidden') === 'true' || n.inert) return true; const s = getComputedStyle(n); if (s.position === 'fixed' && n !== document.body) return true; if (n.localName === 'dialog' && !n.open) return true; } return false; };
  const hasOwnText = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2);
  const textEls = [...document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,button,span,blockquote,figcaption,label,td,th,dt,dd,img,svg,small,strong,em')].filter(el => {
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    return el.localName === 'img' || el.localName === 'svg' || hasOwnText(el);
  });
`;

// Page-level structural measurements. Returns plain data; called with page.evaluate(string).
export const critiqueStaticScript=String.raw`(() => {
  // Mobile Chrome widens the layout viewport to fit overflowing content; measure against the device width.
  const vw = screen.width && screen.width < innerWidth ? screen.width : innerWidth, vh = innerHeight;
  const path = (el) => {
    const parts = [];
    for (let node = el, depth = 0; node && node.nodeType === 1 && depth < 4; node = node.parentElement, depth++) {
      let part = node.localName; if (node.id) { parts.unshift(part + '#' + node.id); break; }
      const cls = [...node.classList].filter(c => c.length < 32).slice(0, 2); if (cls.length) part += '.' + cls.join('.'); parts.unshift(part);
    }
    return parts.join(' > ');
  };
${visibilityHelpers}  // Inactive carousel slides, tab panels and success messages are hidden alternatives layered
  // over a visible sibling. The hiding ancestor overlapping a visible sibling marks that pattern.
  const ownHidden = (n) => { const s = getComputedStyle(n); return Number(s.opacity) < 0.08 || s.visibility === 'hidden' || collapsed(n, s.clipPath); };
  const stackedAlternative = (el) => {
    let hider = null; for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) if (ownHidden(n)) hider = n;
    if (!hider || !hider.parentElement) return false;
    const a = hider.getBoundingClientRect(); const area = Math.max(1, a.width * a.height);
    return [...hider.parentElement.children].some(sib => {
      if (sib === hider || effectiveOpacity(sib) < 0.5) return false;
      const b = sib.getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return w > 0 && h > 0 && w * h >= area * 0.5;
    });
  };
  const hidden = [];
  // Content that was visible while in view and later faded (scroll-away heroes, crossfading
  // story steps) is not stuck; neither is content that was never inside the viewport.
  const seen = window.__mcVis;
  for (const el of textEls) {
    if (intentionallyHidden(el)) continue;
    const s = getComputedStyle(el); if (s.display === 'none') continue;
    // Stuck = still hidden now AND never seen visible while in the viewport (when sampled).
    let o = effectiveOpacity(el);
    if (seen && o < 0.08 && (!seen.has(el) || seen.get(el) >= 0.08)) continue;
    if (o < 0.08 && stackedAlternative(el)) continue;
    if (o < 0.08) hidden.push({ selector: path(el), text: (el.textContent || el.getAttribute('alt') || el.localName).trim().slice(0, 60), opacity: Number(o.toFixed(3)) });
  }
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  // Resolve what is actually painted under the text: the paint stack at the text's centre, so a
  // sliding pill or card behind (but not around) the label counts. Images/gradients → unknown.
  const background = (el) => {
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const stack = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementsFromPoint(x, y) : [];
    const below = stack.length ? stack.filter(n => n !== el && !el.contains(n)) : [];
    const chain = below.length ? below : (() => { const list = []; for (let n = el.parentElement; n && n.nodeType === 1; n = n.parentElement) list.push(n); return list; })();
    for (const n of [el, ...chain]) { const s = getComputedStyle(n); if (s.backgroundImage && s.backgroundImage !== 'none') return null; const c = parse(s.backgroundColor); if (c && c.a > 0.85 && Number(s.opacity) > 0.85) return c; }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const contrast = [];
  let checked = 0;
  for (const el of textEls) {
    if (el.localName === 'img' || el.localName === 'svg' || intentionallyHidden(el)) continue;
    const s = getComputedStyle(el); const fg = parse(s.color); if (!fg || fg.a < 0.5 || effectiveOpacity(el) < 0.5) continue;
    const bg = background(el); if (!bg) continue; checked++;
    const a = lum(fg), b = lum(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 600;
    const need = size >= 24 || (size >= 18.6 && bold) ? 3 : 4.5;
    if (ratio < need) contrast.push({ selector: path(el), text: el.textContent.trim().slice(0, 40), ratio: Number(ratio.toFixed(2)), need });
  }
  const families = {};
  for (const el of textEls) { if (el.localName === 'img' || el.localName === 'svg') continue; const fam = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim(); families[fam] = (families[fam] || 0) + (el.textContent || '').trim().length; }
  const bodySize = parseFloat(getComputedStyle(document.querySelector('p') || document.body).fontSize);
  const h1 = document.querySelector('h1'); const h1Size = h1 ? parseFloat(getComputedStyle(h1).fontSize) : null;
  const longLines = [...document.querySelectorAll('p')].filter(p => { const s = getComputedStyle(p); const chars = p.getBoundingClientRect().width / (parseFloat(s.fontSize) * 0.5); return p.textContent.trim().length > 120 && chars > 95; }).slice(0, 5).map(path);
  const overflowX = Math.max(document.scrollingElement.scrollWidth, innerWidth) - vw;
  const wide = overflowX > 1 ? [...document.body.querySelectorAll('*')].filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 6).map(el => ({ selector: path(el), right: Math.round(el.getBoundingClientRect().right) })) : [];
  const clipped = [...document.querySelectorAll('h1,h2,h3,button,a')].filter(el => { const s = getComputedStyle(el); return el.scrollWidth > el.clientWidth + 2 && s.overflow !== 'visible' && s.textOverflow !== 'ellipsis' && el.clientWidth > 0; }).slice(0, 6).map(path);
  const interactive = [...document.querySelectorAll('a[href],button,[role=button],input[type=submit],summary')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !intentionallyHidden(el); });
  const smallTargets = vw < 600 ? interactive.filter(el => { const r = el.getBoundingClientRect(); const inline = getComputedStyle(el).display === 'inline' && el.closest('p,li'); return !inline && (r.height < 36 || r.width < 36); }).slice(0, 8).map(el => ({ selector: path(el), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) })) : [];
  const smallText = vw < 600 ? [...document.querySelectorAll('p,li')].filter(el => parseFloat(getComputedStyle(el).fontSize) < 14 && el.textContent.trim().length > 40).length : 0;
  const media = { canvas: document.querySelectorAll('canvas').length, video: document.querySelectorAll('video').length, svg: document.querySelectorAll('svg').length, img: document.images.length };
  const reducedMotionRule = [...document.styleSheets].some(sheet => { try { return [...sheet.cssRules].some(rule => rule.conditionText && rule.conditionText.includes('prefers-reduced-motion')); } catch { return false; } }) || [...document.scripts].some(s => (s.textContent || '').includes('prefers-reduced-motion'));
  return { viewport: { width: vw, height: vh }, docHeight: document.scrollingElement.scrollHeight, hidden: hidden.slice(0, 20), hiddenCount: hidden.length, textElementCount: textEls.length,
    contrast: contrast.slice(0, 10), contrastFailures: contrast.length, contrastChecked: checked, families, bodySize, h1Size, longLines, overflowX, wide, clipped, smallTargets, smallText, media, reducedMotionRule,
    interactiveCount: interactive.length, title: document.title };
})()`;

// Top-level content blocks used to judge whether motion reaches the whole page.
export const critiqueSectionsScript=String.raw`(() => {
  let root = document.querySelector('main') || document.body;
  for (let i = 0; i < 3; i++) { const kids = [...root.children].filter(el => el.getBoundingClientRect().height > 40); if (kids.length === 1 && kids[0].children.length) root = kids[0]; else break; }
  const blocks = [...root.children].concat(root !== document.body ? [...document.body.children].filter(el => el !== root && !el.contains(root)) : []);
  return blocks.filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.height >= 160 && s.position !== 'fixed' && !['script', 'style', 'noscript'].includes(el.localName); })
    .map((el, index) => { el.setAttribute('data-mc-section', String(index)); const r = el.getBoundingClientRect(); return { index, tag: el.localName, id: el.id || '', cls: [...el.classList].slice(0, 2).join('.'), top: Math.round(r.top + scrollY), height: Math.round(r.height) }; });
})()`;

export const critiqueSectionMotionScript=String.raw`(() => [...document.querySelectorAll('[data-mc-section]')].map(section => {
  let animated = 0, classChanged = 0;
  for (const el of [section, ...section.querySelectorAll('*')]) { if (el.__mcAnimated) animated++; if (el.__mcClassChanged && el.__mcClassChanged !== 'load-static') classChanged++; }
  return { index: Number(section.getAttribute('data-mc-section')), animated, classChanged };
}))()`;

// Record, for every text/image element inside the viewport right now, the highest effective
// visibility observed so far. Called after each settled scroll stop.
export const critiqueVisibilitySampleScript=String.raw`(() => {
  const vw = innerWidth, vh = innerHeight;
${visibilityHelpers}
  const seen = window.__mcVis = window.__mcVis || new Map();
  for (const el of textEls) {
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
    const o = effectiveOpacity(el);
    if (!seen.has(el) || seen.get(el) < o) seen.set(el, o);
  }
  return seen.size;
})()`;
