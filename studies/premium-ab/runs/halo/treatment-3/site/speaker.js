/* Halo speaker: one CSS-built object, instanced wherever [data-speaker] appears.
   Layers are stacked rectangles shaded as a cylinder; --x (0..1) pulls them apart. */
(() => {
  const markup = `
<div class="lyr l-cap" style="--h:3;--o:-16;--c:var(--metal)"><i class="body"></i><i class="shade"></i></div>
<div class="lyr l-halo" style="--h:1.1;--o:-10.5;--c:var(--accent)"><i class="body"></i><i class="glow"></i><i class="shade"></i></div>
<div class="lyr l-upper" style="--h:10;--o:-5;--c:var(--fabric)"><i class="body"></i><i class="tex"></i><i class="shade"></i></div>
<div class="lyr l-drivers" style="--h:9;--o:0;--c:var(--fabric)"><i class="body"></i><i class="tex"></i><i class="inner"></i><i class="shade"></i></div>
<div class="lyr l-lower" style="--h:10.5;--o:5.5;--c:var(--fabric)"><i class="body"></i><i class="tex"></i><i class="shade"></i></div>
<div class="lyr l-base" style="--h:3;--o:11;--c:var(--mineral)"><i class="body"></i><i class="shade"></i></div>`;
  document.querySelectorAll('[data-speaker]').forEach((el) => {
    el.classList.add('speaker');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = markup;
  });
})();
