/* Atelier Norr — page behaviour. Pairs with motion-kit.js (reveals, split text, --p scenes).
 * Own work here: drawings that draw themselves, nav state, process step labels, the sun, the enquiry form. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /* ---- drawings: strokes draw when they come into view (hero: straight away) ---- */
  const draws = $$('.draw');
  const drawn = (el) => el.classList.add('is-drawn');
  const startDraws = () => {
    if (reduce.matches || !('IntersectionObserver' in window)) { draws.forEach(drawn); return; }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { drawn(entry.target); io.unobserve(entry.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    draws.forEach((el) => io.observe(el));
    // anything already scrolled past (anchor jumps, restored scroll) is shown
    addEventListener('load', () => setTimeout(() => draws.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) drawn(el); }), 400));
  };
  // wait for the font-gated start in <head> so the hero draws after the headline lands
  if (document.documentElement.classList.contains('mk-ready') || !document.documentElement.classList.contains('mk-js')) startDraws();
  else addEventListener('norr:ready', startDraws, { once: true });

  /* ---- nav: hairline after scroll, scroll-spy, mobile menu ---- */
  const nav = $('#nav');
  const sections = $$('main > section[data-theme]');
  const links = $$('.nav-links a[href^="#"]:not(.btn)');
  const spy = links.map((a) => ({ a, section: $(a.getAttribute('href')) })).filter((x) => x.section);
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      nav.classList.toggle('is-scrolled', scrollY > 24);
      const probe = nav.offsetHeight / 2;
      for (const section of sections) {
        const r = section.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { nav.dataset.theme = section.dataset.theme; break; }
      }
      const mid = innerHeight * 0.4;
      for (const { a, section } of spy) {
        const r = section.getBoundingClientRect();
        a.classList.toggle('is-active', r.top <= mid && r.bottom > mid);
      }
      updateProcess();
    });
  };

  const toggle = $('.nav-toggle');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav-toggle-label').textContent = open ? 'Close' : 'Menu';
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

  /* ---- process: label the stage the assembly is in ---- */
  const process = $('#process');
  const steps = $$('.step', process);
  const stages = (process.dataset.stages || '0').split(',').map(Number);
  const stageLabel = $('.asm-step b', process);
  const romans = ['I', 'II', 'III', 'IIII'];
  let current = -1;
  function updateProcess() {
    const r = process.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = total > 0 ? clamp01(-r.top / total) : 1;
    let idx = 0;
    stages.forEach((start, i) => { if (p >= start - 0.005) idx = i; });
    if (idx === current) return;
    current = idx;
    steps.forEach((step, i) => step.classList.toggle('is-active', i === idx));
    if (stageLabel) stageLabel.textContent = romans[idx] || 'I';
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---- the sun: one ambient loop, paused off-screen, hidden tabs and reduced motion ---- */
  const heroSvg = $('.hero-svg');
  if (heroSvg && typeof heroSvg.pauseAnimations === 'function') {
    let visible = true;
    const sync = () => {
      if (reduce.matches || !visible || document.hidden) heroSvg.pauseAnimations();
      else heroSvg.unpauseAnimations();
    };
    if ('IntersectionObserver' in window) new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(heroSvg);
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener?.('change', sync);
    sync();
  }

  /* ---- enquiry form: composes an email, no server needed ---- */
  const form = $('#enquiry');
  if (form) {
    const note = $('.form-note', form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let ok = true;
      $$('.field', form).forEach((field) => {
        const input = $('input, textarea', field);
        const bad = !input.value.trim() || (input.type === 'email' && !/^\S+@\S+\.\S+$/.test(input.value.trim()));
        field.classList.toggle('is-bad', bad);
        if (bad && ok) { input.focus(); ok = false; }
      });
      if (!ok) { note.textContent = 'Please complete the highlighted fields.'; return; }
      const data = new FormData(form);
      const subject = `Enquiry: ${data.get('kind')}`;
      const body = `${data.get('message')}\n\n${data.get('name')}\n${data.get('email')}`;
      note.textContent = 'Opening your mail app. If nothing opens, write to studio@atelier-norr.example.';
      location.href = `mailto:studio@atelier-norr.example?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
    form.addEventListener('input', (event) => { const field = event.target.closest('.field'); if (field) field.classList.remove('is-bad'); });
  }
})();
