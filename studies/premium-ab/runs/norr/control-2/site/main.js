(() => {
'use strict';
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const root = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- motion preference ---------- */
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
let stored = null;
try { stored = localStorage.getItem('norr-motion'); } catch (e) {}
let motion = stored ? stored === 'on' : !mq.matches;
const motionLabel = $('#motionLabel'), motionBtn = $('#motionToggle');
function setMotion(on, persist) {
  motion = on;
  root.dataset.motion = on ? 'on' : 'off';
  motionBtn.setAttribute('aria-pressed', String(!on));
  motionLabel.textContent = on ? 'Motion on' : 'Motion paused';
  if (persist) { try { localStorage.setItem('norr-motion', on ? 'on' : 'off'); } catch (e) {} }
  if (!on) { revealAll(); finishLoader(true); heroGo(); }
  measure(); drawRings(true);
}
motionBtn.addEventListener('click', () => setMotion(!motion, true));

/* ---------- helpers: split text into masked words ---------- */
function splitWords(el, cls = 'w') {
  let i = 0;
  const walk = (node, parent) => {
    node.childNodes.forEach(ch => {
      if (ch.nodeType === 3) {
        ch.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { parent.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = cls;
          const s = document.createElement('span'); s.textContent = tok; s.style.setProperty('--i', i++);
          w.appendChild(s); parent.appendChild(w);
        });
      } else if (ch.nodeName === 'BR') {
        parent.appendChild(ch.cloneNode());
      } else {
        const c = ch.cloneNode(false); parent.appendChild(c); walk(ch, c);
      }
    });
  };
  const label = el.textContent.replace(/\s+/g, ' ').trim();
  const frag = document.createElement('div');
  walk(el, frag);
  el.setAttribute('aria-label', label);
  el.innerHTML = '';
  Array.from(frag.childNodes).forEach(n => el.appendChild(n));
  $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  return i;
}
$$('[data-split]').forEach(el => splitWords(el));

/* scroll-scrubbed paragraph */
const scrub = $('#scrub');
let scrubWords = [];
if (scrub) {
  const walk = node => {
    Array.from(node.childNodes).forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) frag.appendChild(document.createTextNode(' '));
          else { const s = document.createElement('span'); s.className = 'sw'; s.textContent = t; frag.appendChild(s); }
        });
        node.replaceChild(frag, ch);
      } else if (ch.nodeType === 1) walk(ch);
    });
  };
  const label = scrub.textContent;
  walk(scrub);
  scrub.setAttribute('aria-label', label);
  scrubWords = $$('.sw', scrub);
  scrubWords.forEach(w => w.setAttribute('aria-hidden', 'true'));
}

/* ---------- reveal on view ---------- */
const revealEls = $$('.reveal, .reveal-fade, .reveal-title');
revealEls.forEach(el => { if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay + 's'); });
const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
const heroFades = $$('.hero .reveal-fade');
revealEls.forEach(el => { if (!el.closest('.hero')) io.observe(el); });
function revealAll() { revealEls.forEach(el => el.classList.add('in')); }

/* ---------- hero ---------- */
const hero = $('#hero');
$$('.hero .draw').forEach((p, i) => p.style.setProperty('--dd', (0.35 + i * 0.16).toFixed(2) + 's'));
let heroStarted = false;
function heroGo() {
  if (heroStarted) return; heroStarted = true;
  hero.classList.add('go');
  heroFades.forEach(el => el.classList.add('in'));
}

/* ---------- loader ---------- */
const loader = $('#loader'), loaderNum = $('#loaderNum');
let loaderDone = false;
function finishLoader(instant) {
  if (loaderDone) return; loaderDone = true;
  document.body.classList.remove('is-loading');
  if (instant) { loader.classList.add('is-gone'); return; }
  loader.classList.add('is-done');
  setTimeout(heroGo, 550);
  setTimeout(() => loader.classList.add('is-gone'), 1500);
}
function runLoader() {
  const start = performance.now(), dur = 1900;
  const fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
  let fonts = false; fontsReady.then(() => fonts = true);
  const step = now => {
    const t = clamp((now - start) / dur);
    const v = Math.round(ease(t) * 100);
    loaderNum.textContent = String(v).padStart(3, '0');
    if (t < 1 || (!fonts && now - start < 4000)) requestAnimationFrame(step);
    else finishLoader();
  };
  requestAnimationFrame(step);
}
document.body.classList.add('is-loading');

/* ---------- state for the loop ---------- */
let sy = window.scrollY, vw = innerWidth, vh = innerHeight, docH = 1;
let mx = 0, my = 0, tmx = 0, tmy = 0; // normalised -1..1 pointer
let px = innerWidth / 2, py = innerHeight / 2, cx = px, cy = py;
let lastSy = sy, vel = 0;

addEventListener('pointermove', e => {
  tmx = (e.clientX / vw - .5) * 2; tmy = (e.clientY / vh - .5) * 2;
  px = e.clientX; py = e.clientY;
  if (!cursor.classList.contains('is-on')) { cx = px; cy = py; cursor.classList.add('is-on'); }
}, { passive: true });
document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));

/* ---------- cursor ---------- */
const cursor = $('#cursor'), cLabel = $('.cursor__label', cursor);
document.addEventListener('pointerover', e => {
  const t = e.target.closest && e.target.closest('[data-cursor]');
  cursor.classList.remove('is-big', 'is-link');
  if (!t) return;
  const label = t.getAttribute('data-cursor');
  if (label) { cLabel.textContent = label; cursor.classList.add('is-big'); }
  else cursor.classList.add('is-link');
});

/* ---------- magnetic ---------- */
$$('[data-magnet]').forEach(el => {
  el.addEventListener('pointermove', e => {
    if (!motion) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * .28, y = (e.clientY - (r.top + r.height / 2)) * .35;
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

/* ---------- hero layers, marquee ---------- */
const layers = $$('.hero__scene .layer');
const heroContent = $('.hero__content');
const marquee = $('#marquee');
let marqX = 0, marqHalf = 1;

/* ---------- projects: horizontal scroll ---------- */
const projects = $('#projects'), pin = $('#hsPin'), track = $('#hsTrack');
const hsBar = $('#hsBar'), hsNow = $('#hsNow');
const cards = $$('.card', track);
let hsTop = 0, hsDist = 0, hsOn = false, hsCur = 0;

function measure() {
  vw = innerWidth; vh = innerHeight;
  docH = document.documentElement.scrollHeight;
  hsOn = motion && vw > 820;
  if (hsOn) {
    const last = track.lastElementChild;
    const trackW = last.offsetLeft + last.offsetWidth + parseFloat(getComputedStyle(track).paddingRight || 0);
    hsDist = Math.max(0, trackW - vw);
    projects.style.setProperty('--hs-h', (hsDist + vh) + 'px');
  } else {
    projects.style.removeProperty('--hs-h');
    track.style.transform = '';
    hsDist = 0;
  }
  hsTop = projects.getBoundingClientRect().top + window.scrollY;
  marqHalf = marquee.scrollWidth / 2;
  sizeRings();
}

/* ---------- process ---------- */
const stSets = $$('.st');
stSets.forEach(g => $$('.d', g).forEach((d, i) => d.style.setProperty('--k', i)));
const steps = $$('.step');
const stageTag = $('#stageTag');
let activeStep = -1;
function setStep(n) {
  if (n === activeStep) return; activeStep = n;
  steps.forEach((s, i) => s.classList.toggle('is-active', i === n));
  stSets.forEach((g, i) => g.classList.toggle('show', i === n));
  stageTag.textContent = `Stage 0${n + 1} / 05`;
}
const stepIO = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) setStep(steps.indexOf(e.target)); });
}, { rootMargin: '-40% 0px -50% 0px' });
steps.forEach(s => stepIO.observe(s));
const stageIO = new IntersectionObserver(es => {
  if (es[0].isIntersecting) { if (activeStep < 0) setStep(0); stageIO.disconnect(); }
}, { threshold: .3 });
stageIO.observe($('#stage'));

/* ---------- counters ---------- */
const cio = new IntersectionObserver(es => {
  es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, sep = el.dataset.sep;
    const fmt = v => sep ? v.toLocaleString('en-US') : String(v);
    if (!motion) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), d = 2200;
    const f = now => {
      const t = clamp((now - t0) / d), v = Math.round(end * (1 - Math.pow(2, -10 * t)) * (t >= 1 ? 1 : 1));
      el.textContent = fmt(t >= 1 ? end : v);
      if (t < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}, { threshold: .6 });
$$('[data-count]').forEach(el => cio.observe(el));

/* ---------- growth rings canvas ---------- */
const canvas = $('#rings'), g2 = canvas.getContext('2d');
const matSec = $('#material');
let cw = 0, ch = 0, dpr = 1, ringsVisible = false;
const RN = 46;
function sizeRings() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = matSec.getBoundingClientRect();
  cw = r.width; ch = r.height;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  drawRings(true);
}
new IntersectionObserver(es => { ringsVisible = es[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(matSec);
function drawRings(force) {
  if (!cw) return;
  if (!ringsVisible && !force) return;
  const t = motion ? performance.now() * .00028 : 0;
  const r = matSec.getBoundingClientRect();
  const prog = motion ? clamp(1 - r.top / (vh * .65)) : 1;
  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.clearRect(0, 0, cw, ch);
  const baseX = cw * (cw < 800 ? .7 : .72), baseY = ch * .5;
  const maxR = Math.max(cw, ch) * .62;
  const ox = motion ? mx * 24 : 0, oy = motion ? my * 16 : 0;
  const shown = prog * RN;
  for (let i = 1; i <= RN; i++) {
    if (i > shown) break;
    const frac = i / RN;
    const grow = clamp(shown - i + 1);
    const R = frac * maxR * grow;
    const sx = baseX + ox * (1 - frac), sy2 = baseY + oy * (1 - frac);
    g2.beginPath();
    const pts = 140;
    for (let k = 0; k <= pts; k++) {
      const a = k / pts * Math.PI * 2;
      const n = Math.sin(a * 3 + i * .35 + t * 2) * .022 + Math.sin(a * 5 - i * .21 - t * 3) * .012 + Math.sin(a * 2 + i * .1 + t) * .03 * frac;
      const rr = R * (1 + n) ;
      const x = sx + Math.cos(a) * rr * 1.12, y = sy2 + Math.sin(a) * rr * .86;
      k ? g2.lineTo(x, y) : g2.moveTo(x, y);
    }
    g2.closePath();
    const late = i % 6 < 2; // dense latewood bands
    g2.lineWidth = late ? 1.8 : .8;
    g2.strokeStyle = late ? `rgba(140,92,52,${.42 - frac * .18})` : `rgba(120,86,56,${.22 - frac * .1})`;
    g2.stroke();
  }
  // heartwood
  if (shown > 1) {
    g2.beginPath();
    g2.fillStyle = 'rgba(185,133,87,.28)';
    g2.ellipse(baseX + ox, baseY + oy, 7, 6, 0, 0, Math.PI * 2);
    g2.fill();
  }
}

/* ---------- nav, menu, anchors ---------- */
const nav = $('#nav'), menu = $('#menu'), menuBtn = $('#menuBtn');
const progress = $('#progress i');
function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.toggle('menu-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

let scrollAnim = null;
function scrollToY(y) {
  if (!motion) { window.scrollTo(0, y); return; }
  const from = window.scrollY, dist = y - from, dur = clamp(Math.abs(dist) / 2.2, 700, 1900);
  const t0 = performance.now(); const id = scrollAnim = {};
  const f = now => {
    if (scrollAnim !== id) return;
    const t = clamp((now - t0) / dur);
    window.scrollTo(0, from + dist * ease(t));
    if (t < 1) requestAnimationFrame(f); else scrollAnim = null;
  };
  requestAnimationFrame(f);
}
['wheel', 'touchstart'].forEach(ev => addEventListener(ev, () => { scrollAnim = null; }, { passive: true }));
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = $(id) || null;
  if (!target) return;
  e.preventDefault();
  const wasOpen = menu.classList.contains('is-open');
  setMenu(false);
  const go = () => {
    let y;
    if (target === projects && hsOn) y = hsTop;
    else y = target.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : 0);
    scrollToY(y);
  };
  wasOpen ? setTimeout(go, 50) : go();
  history.replaceState(null, '', id);
});
$('#toTop').addEventListener('click', () => scrollToY(0));

/* ---------- form ---------- */
const form = $('#form'), status = $('#formStatus');
form.addEventListener('submit', e => {
  e.preventDefault();
  let ok = true;
  $$('.field', form).forEach(f => {
    const i = $('input,textarea', f);
    let valid = !i.required || i.value.trim().length > 0;
    if (i.type === 'email') valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value.trim());
    f.classList.toggle('err', !valid);
    if (!valid) ok = false;
  });
  if (!ok) { status.textContent = 'Please complete the highlighted fields.'; return; }
  const d = new FormData(form);
  const body = `${d.get('msg')}\n\nSite: ${d.get('site') || '—'}\nFrom: ${d.get('name')} <${d.get('email')}>`;
  status.textContent = 'Thank you — opening your mail app. Prefer to write directly? studio@ateliernorr.example';
  location.href = 'mailto:studio@ateliernorr.example?subject=' + encodeURIComponent('Project enquiry — ' + d.get('name')) + '&body=' + encodeURIComponent(body);
  form.reset();
});
$$('.field input,.field textarea').forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('err')));

/* ---------- clock ---------- */
const clock = $('#clock');
try {
  const f = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });
  const tick = () => { clock.textContent = 'Oslo ' + f.format(new Date()); };
  tick(); setInterval(tick, 15000);
} catch (e) {}

/* ---------- main loop ---------- */
let navHidden = false;
function frame() {
  sy = window.scrollY;
  const dy = sy - lastSy; lastSy = sy;
  vel = lerp(vel, dy, .12);
  mx = lerp(mx, tmx, .06); my = lerp(my, tmy, .06);

  // nav
  const solid = sy > hero.offsetHeight - 90;
  nav.classList.toggle('is-solid', solid && !menu.classList.contains('is-open'));
  const hide = sy > 500 && dy > 2 && !menu.classList.contains('is-open');
  if (hide) navHidden = true; else if (dy < -2 || sy < 400) navHidden = false;
  nav.classList.toggle('is-hidden', navHidden);
  progress.style.transform = `scaleX(${clamp(sy / Math.max(1, docH - vh)).toFixed(4)})`;

  if (motion) {
    // cursor
    cx = lerp(cx, px, .2); cy = lerp(cy, py, .2);
    cursor.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;

    // hero
    if (sy < vh * 1.3) {
      layers.forEach(l => {
        const d = parseFloat(l.dataset.depth);
        l.style.transform = `translate(${(-mx * d * 18).toFixed(2)}px,${(-my * d * 6 + sy * d * .16).toFixed(2)}px)`;
      });
      const p = clamp(sy / (vh * .8));
      heroContent.style.transform = `translate3d(0,${(sy * .22).toFixed(1)}px,0)`;
      heroContent.style.opacity = (1 - p * 1.1).toFixed(3);
    }

    // marquee
    marqX -= .55 + Math.abs(vel) * .16;
    if (marqX <= -marqHalf) marqX += marqHalf;
    marquee.style.transform = `translate3d(${marqX.toFixed(1)}px,0,0)`;
  } else {
    layers.forEach(l => { l.style.transform = ''; });
    heroContent.style.transform = ''; heroContent.style.opacity = '';
  }

  // scrub text
  if (scrubWords.length) {
    const r = scrub.getBoundingClientRect();
    const p = motion ? clamp((vh * .8 - r.top) / (r.height + vh * .25)) : 1;
    const n = Math.round(p * scrubWords.length * 1.04);
    for (let i = 0; i < scrubWords.length; i++) scrubWords[i].classList.toggle('on', i < n);
  }

  // horizontal projects
  if (hsOn) {
    const p = clamp((sy - hsTop) / Math.max(1, hsDist));
    hsCur = lerp(hsCur, p, .1);
    if (Math.abs(hsCur - p) < .0002) hsCur = p;
    track.style.transform = `translate3d(${(-hsCur * hsDist).toFixed(1)}px,0,0)`;
    hsBar.style.transform = `scaleX(${hsCur.toFixed(4)})`;
    let best = 0, bd = 1e9;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const off = (r.left + r.width / 2 - vw / 2) / vw;
      const art = c.querySelector('.art-parallax');
      if (art) art.style.transform = `translate(${(-off * 70).toFixed(1)}px,0)`;
      if (Math.abs(off) < bd) { bd = Math.abs(off); best = i; }
    });
    hsNow.textContent = String(best + 1).padStart(2, '0');
  } else {
    cards.forEach(c => { const a = c.querySelector('.art-parallax'); if (a) a.style.transform = ''; });
  }

  drawRings();
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
setMotion(motion, false);
measure();
addEventListener('resize', () => { measure(); });
addEventListener('load', () => { measure(); setTimeout(measure, 400); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
requestAnimationFrame(frame);
if (motion) runLoader(); else { finishLoader(true); heroGo(); }
// safety net: never leave the page covered
setTimeout(() => { if (!loaderDone) finishLoader(); }, 7000);
})();
