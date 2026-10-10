import type {Browser} from 'playwright';

// Craft lint for `critique`: the finish defects a design director catches at full resolution and an
// agent cannot see from source. Two kinds of evidence, both from the real page:
//  - a DOM sampler run at each settled scroll stop (only elements fully inside the viewport, so the
//    measurement matches the frame captured at the same moment), and
//  - pixel analysis of those captured frames (what was actually painted: empty bands, hollow boxes).
// Every instance keeps the frame and rectangle it was seen in, so findings ship with annotated crops.

export interface CraftRect {x:number;y:number;w:number;h:number}
export interface CraftSample {
  vw:number;vh:number;scrollY:number;
  boxes:Array<{id:number;selector:string}&CraftRect>;
  align:Array<{id:number;selector:string;child:string;dev:number;rect:CraftRect}>;
  controls:Array<{id:number;selector:string;heights:number[];rect:CraftRect}>;
  collisions:Array<{key:string;a:string;b:string;text:string;rect:CraftRect}>;
  covered:Array<{id:number;selector:string;by:string;text:string;rect:CraftRect}>;
  orphans:Array<{id:number;selector:string;word:string;rect:CraftRect}>;
  code:Array<{id:number;selector:string;ratio:number;clipped?:boolean;rect:CraftRect}>;
  edge:Array<{id:number;selector:string;text:string;gap:number;rect:CraftRect}>;
  shrunk?:Array<{id:number;selector:string;text:string;ratio:number;rect:CraftRect}>;
  placeholders?:Array<{id:number;selector:string;text:string;rect:CraftRect}>;
}
export interface CraftFrame {viewport:'desktop'|'mobile';label:string;image:Buffer;sample:CraftSample}
export interface CraftInstance {frame:number;viewport:'desktop'|'mobile';rect:CraftRect;label:string;detail:string;inner?:CraftRect}
export interface CraftResult {
  deadSpace:Array<CraftInstance&{run:number;fraction:number}>;
  hollow:Array<CraftInstance&{selector:string;emptyFraction:number}>;
  misaligned:Array<CraftInstance&{selector:string;dev:number}>;
  controls:Array<CraftInstance&{selector:string;heights:number[]}>;
  collisions:Array<CraftInstance&{text:string}>;
  covered:Array<CraftInstance&{selector:string;by:string}>;
  orphans:Array<CraftInstance&{selector:string;word:string}>;
  code:Array<CraftInstance&{selector:string;ratio:number}>;
  edge:Array<CraftInstance&{selector:string;text:string}>;
  shrunk:Array<CraftInstance&{selector:string;text:string}>;
  placeholders:Array<CraftInstance&{selector:string;text:string}>;
  framesAnalyzed:number;
}

export const critiqueCraftSampleScript=String.raw`(() => {
  const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight, mobile = vw < 600;
  const ids = window.__mcCraftIds = window.__mcCraftIds || new WeakMap();
  const idOf = (el) => { let id = ids.get(el); if (!id) { id = window.__mcCraftNext = (window.__mcCraftNext || 0) + 1; ids.set(el, id); } return id; };
  const path = (el) => {
    const parts = [];
    for (let node = el, depth = 0; node && node.nodeType === 1 && depth < 4; node = node.parentElement, depth++) {
      let part = node.localName; if (node.id) { parts.unshift(part + '#' + node.id); break; }
      const cls = [...node.classList].filter(c => c.length < 32 && !c.startsWith('mk-')).slice(0, 2); if (cls.length) part += '.' + cls.join('.'); parts.unshift(part);
    }
    return parts.join(' > ');
  };
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const styles = new Map(); const cs = (el) => { let s = styles.get(el); if (!s) { s = getComputedStyle(el); styles.set(el, s); } return s; };
  const opacity = new Map();
  const vis = (el) => { if (!el || el.nodeType !== 1) return 1; if (opacity.has(el)) return opacity.get(el); const s = cs(el); const v = s.display === 'none' || s.visibility === 'hidden' ? 0 : Number(s.opacity) * vis(el.parentElement); opacity.set(el, v); return v; };
  const fixedCache = new Map();
  const fixed = (el) => { if (!el || el.nodeType !== 1 || el === document.body) return false; if (fixedCache.has(el)) return fixedCache.get(el); const v = cs(el).position === 'fixed' || fixed(el.parentElement); fixedCache.set(el, v); return v; };
  const moving = (el) => !!el.closest('[aria-hidden="true"],[data-marquee],[data-hscroll-track],marquee');
  const inside = (r) => r.width > 0 && r.height > 0 && r.top >= -1 && r.left >= -1 && r.bottom <= vh + 1 && r.right <= vw + 1;
  const rect = (r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  const blockOf = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const d = cs(n).display; if (!/^(inline|inline-block|inline-flex|inline-grid|contents|ruby)$/.test(d)) return n; } return document.body; };
  // Overflow clipping by ancestors: text outside a mask, carousel or scroller is not painted.
  const clips = new Map(); const open = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
  const clipFor = (n) => {
    if (!n || n.nodeType !== 1 || n === document.body || n === document.documentElement) return open;
    if (clips.has(n)) return clips.get(n);
    const outer = clipFor(n.parentElement); const s = cs(n); let c = outer;
    const cx = s.overflowX !== 'visible', cy = s.overflowY !== 'visible';
    if (cx || cy) { const r = n.getBoundingClientRect(); c = { l: cx ? Math.max(outer.l, r.left) : outer.l, r: cx ? Math.min(outer.r, r.right) : outer.r, t: cy ? Math.max(outer.t, r.top) : outer.t, b: cy ? Math.min(outer.b, r.bottom) : outer.b }; }
    clips.set(n, c); return c;
  };
  const scrollsX = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = cs(n).overflowX; if (/auto|scroll|hidden|clip/.test(o) && n.scrollWidth > n.clientWidth + 4) return true; } return false; };

  // Visible text, one rect per line box fragment, with its owner element.
  const lines = []; const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode; if (!node.nodeValue.trim()) continue;
    const el = node.parentElement; if (!el || /^(script|style|noscript|template|title|option)$/.test(el.localName)) continue;
    const pr = el.getBoundingClientRect(); if (pr.bottom <= 0 || pr.top >= vh || pr.right <= 0 || pr.left >= vw) continue;
    if (fixed(el)) continue; const v = vis(el); if (v < 0.6) continue;
    const fs = parseFloat(cs(el).fontSize) || 16;
    range.selectNodeContents(node);
    const clip = clipFor(el);
    for (const r of range.getClientRects()) {
      const l = Math.max(r.left, clip.l), t = Math.max(r.top, clip.t), rr = Math.min(r.right, clip.r), b = Math.min(r.bottom, clip.b);
      if (rr - l >= 2 && b - t >= 2 && b > 0 && t < vh) lines.push({ l, t, r: rr, b, el, fs, h0: r.height });
    }
  }

  // Boxes a visitor reads as a container: a fill that differs from what is behind, an outline or a shadow.
  const behind = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const c = parse(cs(n).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const all = [...document.body.querySelectorAll('*')].filter(el => !(el instanceof SVGElement) && !/^(script|style|noscript|template|br|option)$/.test(el.localName));
  const boxes = [];
  for (const el of all) {
    if (boxes.length >= 60) break;
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 140 || r.width > vw * 0.94 || !inside(r)) continue;
    if (fixed(el) || vis(el) < 0.6 || moving(el)) continue;
    const s = cs(el);
    if (s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) continue;
    const bg = parse(s.backgroundColor), under = behind(el);
    const filled = bg && bg.a > 0.08 && (Math.abs(bg.r - under.r) + Math.abs(bg.g - under.g) + Math.abs(bg.b - under.b)) * bg.a > 10;
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(k => parseFloat(s['border' + k + 'Width']) >= 1 && s['border' + k + 'Style'] !== 'none' && ((parse(s['border' + k + 'Color']) || { a: 0 }).a > 0.08)).length;
    if (!filled && sides < 3 && (!s.boxShadow || s.boxShadow === 'none')) continue;
    // Media fills its own box; a box that is mostly an image, canvas or video is not a hollow card.
    const media = [...el.querySelectorAll('img,canvas,video,iframe')].some(m => { const mr = m.getBoundingClientRect(); return mr.width * mr.height > r.width * r.height * 0.5; });
    if (media) continue;
    boxes.push({ id: idOf(el), selector: path(el), ...rect(r), radius: parseFloat(s.borderTopLeftRadius) || 0 });
  }

  // Near-miss alignment: a vertical stack whose items almost share a left edge (1.5–16px apart).
  const align = [];
  const spread = (values) => Math.max(...values) - Math.min(...values);
  for (const parent of all) {
    if (align.length >= 30 || parent.childElementCount < 3) continue;
    const kids = [...parent.children].filter(k => { if (k instanceof SVGElement || /^(script|style|template|br|input|select|textarea|button|progress|meter|hr)$/.test(k.localName)) return false; const s = cs(k); if (parseFloat(s.fontSize) >= 48) return false; if (/absolute|fixed/.test(s.position) || s.display === 'none' || s.display === 'contents') return false; const r = k.getBoundingClientRect(); return r.width > 40 && r.height > 8 && inside(r) && vis(k) > 0.6; });
    if (kids.length < 3 || moving(parent)) continue;
    const rs = kids.map(k => k.getBoundingClientRect());
    const stacked = rs.every((r, i) => i === 0 || (r.top >= rs[i - 1].top + 6 && Math.min(r.right, rs[i - 1].right) - Math.max(r.left, rs[i - 1].left) > Math.min(r.width, rs[i - 1].width) * 0.5));
    if (!stacked) continue;
    const lefts = rs.map(r => r.left);
    if (spread(lefts) <= 1.5 || spread(rs.map(r => (r.left + r.right) / 2)) <= 1.5 || spread(rs.map(r => r.right)) <= 1.5) continue;
    const median = [...lefts].sort((a, b) => a - b)[Math.floor(lefts.length / 2)];
    const devs = lefts.map(l => Math.abs(l - median));
    if (devs.some(d => d > 16)) continue;
    const worst = devs.indexOf(Math.max(...devs));
    const union = { left: Math.min(...rs.map(r => r.left)), top: Math.min(...rs.map(r => r.top)), right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom)) };
    align.push({ id: idOf(parent), selector: path(parent), child: path(kids[worst]), dev: Math.round(devs[worst] * 10) / 10, rect: rect({ left: union.left, top: union.top, width: union.right - union.left, height: union.bottom - union.top }) });
  }

  // Buttons sitting in one row whose heights almost match (2–16px apart).
  const buttons = [...document.querySelectorAll('a[href],button,[role=button],input[type=submit]')].filter(el => {
    const r = el.getBoundingClientRect(); if (r.height < 24 || r.height > 90 || r.width < 40 || !inside(r) || fixed(el) || vis(el) < 0.6) return false;
    const s = cs(el); const bg = parse(s.backgroundColor); return (bg && bg.a > 0.2) || (parseFloat(s.borderTopWidth) >= 1 && s.borderTopStyle !== 'none' && (parse(s.borderTopColor) || { a: 0 }).a > 0.15);
  }).map(el => ({ el, r: el.getBoundingClientRect() })).sort((a, b) => a.r.left - b.r.left);
  const controls = []; const used = new Set();
  for (const a of buttons) {
    if (used.has(a.el)) continue;
    const row = [a];
    for (const b of buttons) { if (b === a || used.has(b.el)) continue; const last = row[row.length - 1].r; const overlap = Math.min(last.bottom, b.r.bottom) - Math.max(last.top, b.r.top); if (overlap > Math.min(last.height, b.r.height) * 0.5 && b.r.left - last.right < 48 && b.r.left >= last.right - 2) row.push(b); }
    if (row.length < 2) continue; row.forEach(item => used.add(item.el));
    const heights = row.map(item => Math.round(item.r.height)); const diff = Math.max(...heights) - Math.min(...heights);
    if (diff >= 2 && diff <= 16) { const l = row[0].r.left, t = Math.min(...row.map(i => i.r.top)), r = row[row.length - 1].r.right, b = Math.max(...row.map(i => i.r.bottom)); controls.push({ id: idOf(row[0].el), selector: row.map(i => path(i.el).split(' > ').pop()).join(' + '), heights, rect: rect({ left: l, top: t, width: r - l, height: b - t }) }); }
  }

  // Text painted over other text. Compare the ink core of each line (the middle 60% of its box) so
  // tight leading never counts, skip words of one block (split headings) and anything visibly covered.
  // Paint that hides what is under it: an opaque fill, a gradient or image fill, frosted glass, media.
  const covers = (n) => { if (/^(img|video|canvas|iframe)$/.test(n.localName)) return true; const s = cs(n); const c = parse(s.backgroundColor); return (c && c.a > 0.85) || (s.backgroundImage !== 'none' && vis(n) > 0.5) || (s.backdropFilter && s.backdropFilter !== 'none' && c && c.a > 0.2); };
  const occluded = (ea, eb, x, y) => {
    if (x < 0 || y < 0 || x >= vw || y >= vh) return true;
    const stack = document.elementsFromPoint(x, y);
    const ia = stack.findIndex(n => n === ea || ea.contains(n)), ib = stack.findIndex(n => n === eb || eb.contains(n));
    if (ia < 0 || ib < 0) return true;
    for (let i = 0; i < Math.max(ia, ib); i++) {
      const n = stack[i]; if (n === ea || n === eb || ea.contains(n) || eb.contains(n) || n.contains(ea) && n.contains(eb)) continue;
      if (covers(n)) return true;
    }
    return false;
  };
  const core = lines.filter(l => !moving(l.el)).map(l => { const trim = (l.b - l.t) * 0.2; return { ...l, ct: l.t + trim, cb: l.b - trim }; }).sort((a, b) => a.ct - b.ct);
  const collisions = []; const pairs = new Set();
  for (let i = 0; i < core.length && collisions.length < 12; i++) {
    const a = core[i];
    for (let j = i + 1; j < core.length && core[j].ct < a.cb; j++) {
      const b = core[j]; if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.cb, b.cb) - Math.max(a.ct, b.ct);
      if (w <= 3 || h <= 2) continue;
      const area = w * h, smaller = Math.min((a.r - a.l) * (a.cb - a.ct), (b.r - b.l) * (b.cb - b.ct));
      if (area < 40 || area < smaller * 0.25 || Math.max(a.fs, b.fs) / Math.min(a.fs, b.fs) > 2.5) continue;
      if (blockOf(a.el) === blockOf(b.el)) continue;
      const key = idOf(a.el) + ':' + idOf(b.el); if (pairs.has(key)) continue;
      if (occluded(a.el, b.el, Math.max(a.l, b.l) + w / 2, Math.max(a.ct, b.ct) + h / 2)) continue;
      pairs.add(key);
      const l = Math.min(a.l, b.l), t = Math.min(a.t, b.t);
      collisions.push({ key, a: path(a.el), b: path(b.el), text: (a.el.textContent.trim().slice(0, 30) + ' ⟷ ' + b.el.textContent.trim().slice(0, 30)).replace(/\s+/g, ' '), rect: rect({ left: l, top: t, width: Math.max(a.r, b.r) - l, height: Math.max(a.b, b.b) - t }) });
    }
  }

  // Copy that scrolls underneath a sticky panel (common when a pinned desktop scene collapses on phones).
  const stickyOf = (n) => { for (; n && n !== document.body; n = n.parentElement) if (cs(n).position === 'sticky') return n; return null; };
  const covered = []; const coveredSeen = new Set();
  for (const l of lines) {
    if (covered.length >= 8 || coveredSeen.has(l.el) || moving(l.el) || stickyOf(l.el)) continue;
    if (l.t < vh * 0.15 || l.b > vh || l.r - l.l < 40) continue;
    const text = l.el.textContent.trim(); if (text.length < 12) continue;
    const points = [[l.l + (l.r - l.l) * 0.25, (l.t + l.b) / 2], [l.l + (l.r - l.l) * 0.75, (l.t + l.b) / 2]];
    const hits = points.map(([x, y]) => { const top = document.elementFromPoint(x, y); if (!top || top === l.el || l.el.contains(top) || top.contains(l.el)) return null; const sticky = stickyOf(top); if (!sticky || sticky.contains(l.el)) return null; for (let n = top; n && n !== sticky.parentElement; n = n.parentElement) if (covers(n)) return sticky; return null; });
    if (!hits[0] || hits[0] !== hits[1]) continue;
    coveredSeen.add(l.el);
    covered.push({ id: idOf(l.el), selector: path(l.el), by: path(hits[0]), text: text.replace(/\s+/g, ' ').slice(0, 40), rect: rect({ left: l.l, top: l.t, width: l.r - l.l, height: l.b - l.t }) });
  }

  // Headings whose last line is one short word.
  const orphans = [];
  for (const h of document.querySelectorAll('h1,h2,h3')) {
    const r = h.getBoundingClientRect(); if (!inside(r) || fixed(h) || vis(h) < 0.6) continue;
    const fs = parseFloat(cs(h).fontSize) || 16; const words = [];
    const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const node = tw.currentNode; for (const m of node.nodeValue.matchAll(/\S+/g)) { range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length); const wr = range.getBoundingClientRect(); if (wr.width > 0) words.push({ text: m[0], top: wr.top, left: wr.left, right: wr.right }); } }
    if (words.length < 4) continue;
    const rows = []; for (const w of words) { const row = rows.find(x => Math.abs(x.top - w.top) < fs * 0.35); if (row) row.words.push(w); else rows.push({ top: w.top, words: [w] }); }
    if (rows.length < 2) continue; rows.sort((a, b) => a.top - b.top);
    const width = (row) => Math.max(...row.words.map(w => w.right)) - Math.min(...row.words.map(w => w.left));
    const last = rows[rows.length - 1];
    if (last.words.length === 1 && width(last) < Math.max(...rows.map(width)) * 0.35) orphans.push({ id: idOf(h), selector: path(h), word: last.words[0].text.slice(0, 24), rect: rect(r) });
  }

  // Code blocks set with a blank line between every line (line pitch far above the font size).
  const code = [];
  for (const el of document.querySelectorAll('pre')) {
    const r = el.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= vh || vis(el) < 0.6) continue;
    const tops = [...new Set(lines.filter(l => el.contains(l.el)).map(l => Math.round(l.t)))].sort((a, b) => a - b).filter((t, i, list) => i === 0 || t - list[i - 1] > 3);
    if (tops.length < 4) continue;
    const gaps = tops.slice(1).map((t, i) => t - tops[i]).sort((a, b) => a - b); const median = gaps[Math.floor(gaps.length / 2)];
    const fs = parseFloat(cs(el.querySelector('code') || el).fontSize) || 14;
    if (median / fs > 2.4) code.push({ id: idOf(el), selector: path(el), ratio: Math.round(median / fs * 10) / 10, rect: rect({ left: r.left, top: Math.max(0, r.top), width: r.width, height: Math.min(vh, r.bottom) - Math.max(0, r.top) }) });
  }
  // Code cut off at the box edge with no way to scroll it.
  for (const el of document.querySelectorAll('pre')) {
    const r = el.getBoundingClientRect(); if (!inside(r) || vis(el) < 0.6) continue;
    const clipper = [el, ...el.querySelectorAll('code')].find(n => /hidden|clip/.test(cs(n).overflowX) && n.scrollWidth > n.clientWidth + 6) || (() => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { if (/hidden|clip/.test(cs(n).overflowX) && el.scrollWidth > n.clientWidth + 6 && n.getBoundingClientRect().right < r.left + el.scrollWidth - 6) return n; } return null; })();
    if (clipper) code.push({ id: idOf(el), selector: path(el), ratio: 0, clipped: true, rect: rect(r) });
  }

  // Text drawn at a fraction of its font size: a scale transform (count-up, reveal) that never finished.
  const shrunk = []; const shrunkSeen = new Set();
  for (const l of lines) {
    if (shrunk.length >= 8 || shrunkSeen.has(l.el) || l.fs < 18 || moving(l.el)) continue;
    if (l.l < 0 || l.r > vw || l.t < 0 || l.b > vh) continue;
    const ratio = l.h0 / l.fs; if (ratio >= 0.55) continue;
    shrunkSeen.add(l.el);
    shrunk.push({ id: idOf(l.el), selector: path(l.el), text: l.el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), ratio: Math.round(ratio * 100) / 100, rect: rect({ left: l.l, top: l.t, width: Math.max(24, l.r - l.l), height: Math.max(12, l.b - l.t) }) });
  }

  // Placeholder tells a visitor reads as unfinished.
  const placeholders = [];
  for (const el of new Set(lines.map(l => l.el))) {
    if (placeholders.length >= 6) break;
    const text = (el.textContent || '').trim();
    const hit = text.match(/lorem ipsum|dolor sit amet|[\w.+-]+@[\w-]+\.example\b|\b(?:example\.(?:com|org))\b|\b0{2,3}[ .-]0{2,3}[ .-]0{2,4}\b|\bTODO\b|\bplaceholder\b|\b(?:Your|Company) (?:Name|Logo)\b/i);
    if (!hit) continue;
    const r = el.getBoundingClientRect(); if (!inside(r)) continue;
    placeholders.push({ id: idOf(el), selector: path(el), text: hit[0].slice(0, 40), rect: rect(r) });
  }

  // Copy pressed against the viewport edge (not moving tracks, scrolling rows or oversized display type).
  const edge = []; const edgeSeen = new Set(); const margin = mobile ? 14 : 16;
  for (const l of lines) {
    if (edge.length >= 12 || edgeSeen.has(l.el) || l.fs >= 64 || moving(l.el)) continue;
    if (l.l < 0 || l.r > vw || l.t < 0 || l.b > vh) continue;
    const gap = Math.min(l.l, vw - l.r); if (gap >= margin) continue;
    if (scrollsX(l.el)) continue;
    edgeSeen.add(l.el);
    edge.push({ id: idOf(l.el), selector: path(l.el), text: l.el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), gap: Math.round(gap), rect: rect({ left: l.l, top: l.t, width: l.r - l.l, height: l.b - l.t }) });
  }
  return { vw, vh, scrollY: Math.round(scrollY), boxes, align, controls, collisions, covered, orphans, code, edge, shrunk, placeholders };
})()`;

// Pixel analysis runs in a scratch page: each frame is decoded on a canvas, turned into an edge map
// (luminance steps above the threshold), and measured. A soft gradient or glow has no edges and
// reads as empty; text, lines, dots and UI do not. Grain overlays stay below the threshold.
const pixelScript=String.raw`async ({ data, boxes }) => {
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + data; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const canvas = new OffscreenCanvas(W, H); const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H); for (let i = 0; i < W * H; i++) lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const edge = new Uint8Array(W * H); const T = 22;
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) { const i = y * W + x; if (Math.abs(lum[i + 1] - lum[i]) > T || Math.abs(lum[i + W] - lum[i]) > T) edge[i] = 1; }
  const row = new Uint32Array(H); for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) n += edge[y * W + x]; row[y] = n; }
  let best = 0, bestTop = 0, run = 0;
  for (let y = 0; y < H; y++) { if (row[y] < 2) { run++; if (run > best) { best = run; bestTop = y - run + 1; } } else run = 0; }
  const cell = 24;
  const fills = boxes.map((b) => {
    const inset = Math.round(12 + Math.min(b.radius || 0, 40) * 0.35);
    const x0 = Math.max(0, b.x + inset), y0 = Math.max(0, b.y + inset), x1 = Math.min(W, b.x + b.w - inset), y1 = Math.min(H, b.y + b.h - inset);
    const cols = Math.floor((x1 - x0) / cell), rows = Math.floor((y1 - y0) / cell);
    if (cols < 3 || rows < 3) return null;
    const active = []; let on = 0;
    for (let r = 0; r < rows; r++) { const line = []; for (let c = 0; c < cols; c++) { let n = 0; for (let y = y0 + r * cell; y < y0 + (r + 1) * cell && n < 3; y++) for (let x = x0 + c * cell; x < x0 + (c + 1) * cell; x++) if (edge[y * W + x]) { n++; if (n >= 3) break; } line.push(n >= 3 ? 1 : 0); on += n >= 3 ? 1 : 0; } active.push(line); }
    // Largest band of cell rows with nothing drawn across the whole inner width. Whitespace beside a
    // short heading is normal; a full-width empty band (or an empty lower half) is what reads hollow.
    let run = 0, best = 0, bestEnd = -1;
    for (let r = 0; r < rows; r++) { if (active[r].every(v => !v)) { run++; if (run > best) { best = run; bestEnd = r; } } else run = 0; }
    const area = best * cols, rect = best ? { x: x0, y: y0 + (bestEnd - best + 1) * cell, w: cols * cell, h: best * cell } : null;
    return { id: b.id, fill: on / (rows * cols), emptyFraction: area / (rows * cols), empty: rect };
  });
  return { width: W, height: H, emptyRun: best, emptyTop: bestTop, fills };
}`;

const annotateScript=String.raw`async ({ data, rect, label, inner }) => {
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + data; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight, pad = 56;
  let x0 = Math.max(0, rect.x - pad), y0 = Math.max(0, rect.y - pad), x1 = Math.min(W, rect.x + rect.w + pad), y1 = Math.min(H, rect.y + rect.h + pad);
  const minW = Math.min(W, 520), minH = Math.min(H, 300);
  if (x1 - x0 < minW) { const grow = minW - (x1 - x0); x0 = Math.max(0, x0 - grow / 2); x1 = Math.min(W, x0 + minW); x0 = Math.max(0, x1 - minW); }
  if (y1 - y0 < minH) { const grow = minH - (y1 - y0); y0 = Math.max(0, y0 - grow / 2); y1 = Math.min(H, y0 + minH); y0 = Math.max(0, y1 - minH); }
  const canvas = document.createElement('canvas'); canvas.width = Math.round(x1 - x0); canvas.height = Math.round(y1 - y0);
  const ctx = canvas.getContext('2d'); ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  const box = (r, colour, dash) => { ctx.save(); ctx.setLineDash(dash); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeRect(r.x - x0 - 1, r.y - y0 - 1, r.w + 2, r.h + 2); ctx.lineWidth = 2; ctx.strokeStyle = colour; ctx.strokeRect(r.x - x0, r.y - y0, r.w, r.h); ctx.restore(); };
  box(rect, '#ff2d55', []);
  if (inner) { ctx.save(); ctx.fillStyle = 'rgba(255,45,85,.16)'; ctx.fillRect(inner.x - x0, inner.y - y0, inner.w, inner.h); ctx.restore(); box(inner, '#ff9f0a', [6, 4]); }
  const size = Math.max(13, Math.round(canvas.width / 46)); ctx.font = '600 ' + size + 'px system-ui, sans-serif'; const tw = ctx.measureText(label).width, lh = Math.round(size * 1.55);
  const lx = Math.max(4, Math.min(rect.x - x0, canvas.width - tw - size - 4)), ly = rect.y - y0 > lh + 6 ? rect.y - y0 - lh - 4 : Math.min(canvas.height - lh - 2, rect.y - y0 + rect.h + 4);
  ctx.fillStyle = '#ff2d55'; ctx.fillRect(lx, ly, tw + size, lh); ctx.fillStyle = '#fff'; ctx.fillText(label, lx + size / 2, ly + size * 1.12);
  return canvas.toDataURL('image/png').split(',')[1];
}`;

/** Measure the captured frames and merge per-element observations into craft defects. */
export async function analyzeCraft(browser:Browser,frames:CraftFrame[]):Promise<CraftResult> {
  const result:CraftResult={deadSpace:[],hollow:[],misaligned:[],controls:[],collisions:[],covered:[],orphans:[],code:[],edge:[],shrunk:[],placeholders:[],framesAnalyzed:frames.length};
  if(!frames.length)return result;
  const page=await browser.newPage({viewport:{width:200,height:200}});
  try{
    await page.setContent('<!doctype html><title>craft</title>');
    await page.evaluate(`window.__mcPixels = ${pixelScript}`);
    // Keep, per element, its best observation across stops: content mid-reveal or a pinned scene in
    // one state must not condemn a box that looks finished at another stop.
    const bestBox=new Map<number,(CraftInstance&{selector:string;emptyFraction:number})|null>();
    const bestAlign=new Map<number,CraftInstance&{selector:string;dev:number}>();
    const once=new Set<string>();const first=(key:string)=>!once.has(key)&&!!once.add(key);
    for(const [index,frame] of frames.entries()){
      const {sample}=frame;const base={frame:index,viewport:frame.viewport,label:frame.label};
      const pixels=await page.evaluate(([data,boxes])=>(window as any).__mcPixels({data,boxes}),[frame.image.toString('base64'),sample.boxes] as const) as {width:number;height:number;emptyRun:number;emptyTop:number;fills:Array<{id:number;fill:number;emptyFraction:number;empty:CraftRect|null}|null>};
      const fraction=pixels.emptyRun/pixels.height;
      if(fraction>=.5)result.deadSpace.push({...base,rect:{x:0,y:pixels.emptyTop,w:pixels.width,h:pixels.emptyRun},detail:`${pixels.emptyRun}px of a ${pixels.height}px screen with nothing drawn`,run:pixels.emptyRun,fraction});
      const minSide=frame.viewport==='mobile'?90:120;
      for(const [i,box] of sample.boxes.entries()){
        const fill=pixels.fills[i];if(!fill||!fill.empty)continue;
        const previous=bestBox.get(box.id);if(previous===null)continue;
        const hollow=fill.emptyFraction>=.38&&fill.empty.h>=minSide*.8;
        if(!hollow){bestBox.set(box.id,null);continue}
        if(!previous||fill.emptyFraction<previous.emptyFraction)bestBox.set(box.id,{...base,rect:{x:box.x,y:box.y,w:box.w,h:box.h},inner:fill.empty,detail:`${Math.round(fill.emptyFraction*100)}% of this box's height is an empty band`,selector:box.selector,emptyFraction:fill.emptyFraction});
      }
      for(const group of sample.align){const previous=bestAlign.get(group.id);if(!previous||group.dev<previous.dev)bestAlign.set(group.id,{...base,rect:group.rect,detail:`${group.child.split(' > ').pop()} sits ${group.dev}px off its siblings' edge`,selector:group.selector,dev:group.dev})}
      for(const row of sample.controls)if(first(`c${row.id}`))result.controls.push({...base,rect:row.rect,detail:`button heights ${row.heights.join(' / ')}px in one row`,selector:row.selector,heights:row.heights});
      for(const hit of sample.collisions)if(first(`x${hit.key}`))result.collisions.push({...base,rect:hit.rect,detail:`overlapping text: ${hit.text}`,text:hit.text});
      for(const line of sample.covered??[])if(first(`v${line.id}`))result.covered.push({...base,rect:line.rect,detail:`“${line.text}” is under the sticky ${line.by.split(' > ').pop()}`,selector:line.selector,by:line.by});
      for(const heading of sample.orphans)if(first(`o${heading.id}`))result.orphans.push({...base,rect:heading.rect,detail:`last line is only “${heading.word}”`,selector:heading.selector,word:heading.word});
      for(const block of sample.code)if(first(`k${block.clipped?'c':''}${block.id}`))result.code.push({...base,rect:block.rect,detail:block.clipped?'code is cut off at the box edge':`line pitch is ${block.ratio}× the font size`,selector:block.selector,ratio:block.ratio});
      for(const line of sample.shrunk??[])if(first(`s${line.id}`))result.shrunk.push({...base,rect:line.rect,detail:`“${line.text}” drawn at ${Math.round(line.ratio*100)}% of its line height`,selector:line.selector,text:line.text});
      for(const item of sample.placeholders??[])if(first(`p${item.id}`))result.placeholders.push({...base,rect:item.rect,detail:`placeholder text “${item.text}”`,selector:item.selector,text:item.text});
      for(const line of sample.edge)if(first(`e${line.id}`))result.edge.push({...base,rect:line.rect,detail:`${line.gap}px from the screen edge`,selector:line.selector,text:line.text});
    }
    for(const value of bestBox.values())if(value)result.hollow.push(value);
    for(const value of bestAlign.values())result.misaligned.push(value);
  }finally{await page.close()}
  return result;
}

/** Crop a frame around a defect and outline it, so the agent sees exactly what the finding means. */
export async function annotateCraft(browser:Browser,frames:CraftFrame[],instances:CraftInstance[]):Promise<Array<{label:string;png:Buffer}>> {
  if(!instances.length)return [];
  const page=await browser.newPage({viewport:{width:200,height:200}});const out:Array<{label:string;png:Buffer}>=[];
  try{
    await page.setContent('<!doctype html><title>annotate</title>');
    await page.evaluate(`window.__mcAnnotate = ${annotateScript}`);
    for(const instance of instances){
      const frame=frames[instance.frame];if(!frame)continue;
      const png=await page.evaluate(([data,rect,label,inner])=>(window as any).__mcAnnotate({data,rect,label,inner}),[frame.image.toString('base64'),instance.rect,instance.detail.slice(0,96),instance.inner??null] as const) as string;
      out.push({label:`${instance.viewport} · ${frame.label} — ${instance.detail.slice(0,70)}`,png:Buffer.from(png,'base64')});
    }
  }finally{await page.close()}
  return out;
}

// Template likeness: how many traits of the default AI-built landing page this page shares, measured
// on the settled first viewport. Not a defect; a page can earn every trait. It tells an agent when
// its "premium" page is the same page every other agent builds.
export interface TemplateTraits {count:number;of:number;traits:string[]}
export const critiqueTemplateScript=String.raw`(() => {
  const vw = innerWidth, vh = innerHeight, traits = [];
  const family = (el) => el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim() : '';
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const h1 = document.querySelector('h1');
  const display = family(h1);
  if (/^(Instrument Serif|Fraunces)$/i.test(display)) traits.push('display face ' + display);
  const body = family(document.querySelector('main p, section p, p') || document.body);
  if (/^(Inter|Inter Tight|Manrope|Geist)$/i.test(body)) traits.push('text face ' + body);
  if (h1) { const total = h1.textContent.trim().length; const italic = [...h1.querySelectorAll('*')].filter(n => getComputedStyle(n).fontStyle === 'italic' && n.textContent.trim().length && n.textContent.trim().length < total * 0.6); if (italic.length && getComputedStyle(h1).fontStyle !== 'italic') traits.push('italic accent word in the headline'); }
  let ground = null; for (const el of [document.body, document.documentElement, document.querySelector('main')]) { const c = el && parse(getComputedStyle(el).backgroundColor); if (c && c.a > 0.5) { ground = c; break; } }
  if (!ground) ground = { r: 255, g: 255, b: 255, a: 1 };
  const L = lum(ground);
  if (L < 0.02) traits.push('near-black ground');
  else if (L > 0.7 && ground.r >= ground.g && ground.g >= ground.b && ground.r - ground.b >= 6 && ground.r - ground.b <= 40) traits.push('warm paper ground');
  if (h1) {
    const hr = h1.getBoundingClientRect();
    const above = [...document.body.querySelectorAll('p,span,div,small,a')].filter(el => { const r = el.getBoundingClientRect(); if (!el.textContent.trim() || r.height > 40 || r.bottom > hr.top + 2 || hr.top - r.bottom > 140 || r.width < 20) return false; const s = getComputedStyle(el); return parseFloat(s.fontSize) <= 14 && (s.textTransform === 'uppercase' || parseFloat(s.letterSpacing) >= 0.06 * parseFloat(s.fontSize)); });
    if (above.length) traits.push('small uppercase eyebrow above the headline');
    if (hr.right < vw * 0.62 && hr.left < vw * 0.2) {
      const right = [...document.body.querySelectorAll('img,svg,canvas,video,figure,div,picture')].some(el => { if (el.contains(h1) || h1.contains(el)) return false; const r = el.getBoundingClientRect(); return r.left >= vw * 0.45 && r.top < vh && r.width > vw * 0.18 && r.height > vh * 0.25 && r.width < vw * 0.6; });
      if (right) traits.push('headline left, object right');
    }
  }
  const buttons = [...document.querySelectorAll('a[href],button')].filter(el => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0 && r.height >= 30 && r.height <= 72; });
  const filled = buttons.find(el => { const c = parse(getComputedStyle(el).backgroundColor); return c && c.a > 0.5; });
  if (filled && parseFloat(getComputedStyle(filled).borderTopLeftRadius) >= filled.getBoundingClientRect().height / 2 - 1) traits.push('pill buttons');
  const css = [...document.styleSheets].map(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText).join('\n'); } catch { return ''; } }).join('\n');
  if (document.querySelector('feTurbulence') || /feTurbulence|noise|grain/i.test(css)) traits.push('grain overlay');
  if (document.querySelector('[data-marquee],marquee,[class*="marquee" i],[class*="ticker" i]')) traits.push('marquee');
  return { count: traits.length, of: 9, traits };
})()`;
