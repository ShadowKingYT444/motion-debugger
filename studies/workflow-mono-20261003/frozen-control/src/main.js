import * as THREE from 'three';
import './style.css';

const materials = {
  obsidian: { name: 'Obsidian', finish: 'Soft-touch graphite', price: 489, shell: '#292a2a', face: '#343535', trim: '#a9a49a', cushion: '#161717', seam: '#77746c' },
  chalk: { name: 'Chalk', finish: 'Ceramic ivory', price: 489, shell: '#d9d5cb', face: '#ece9e1', trim: '#99958b', cushion: '#b6b1a6', seam: '#79766e' },
  umber: { name: 'Umber', finish: 'Anodized bronze', price: 519, shell: '#593c32', face: '#735045', trim: '#c49a77', cushion: '#382c28', seam: '#b48c70' },
};
const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
const stored = (() => { try { return JSON.parse(localStorage.getItem('mono-one-state') || '{}'); } catch { return {}; } })();
const state = {
  materialId: materials[stored.materialId] ? stored.materialId : 'obsidian',
  cart: Array.isArray(stored.cart) ? stored.cart.filter((line) => materials[line.materialId] && Number.isInteger(line.qty) && line.qty > 0) : [],
  nextId: 1,
  lastRemoved: null,
};
state.nextId = state.cart.reduce((next, line) => Math.max(next, Number(line.id?.match(/^mono-(\d+)$/)?.[1] || 0) + 1), 1);
let undoTimer;
let model, renderer, camera, scene, headphone, shellMeshes = [], faceMeshes = [], trimMeshes = [], cushionMeshes = [], seamMeshes = [];
let desiredYaw = -0.16, desiredPitch = 0.035, pointerStart = null, lastScroll = 0;

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="#top" aria-label="MONO home">MONO<span class="wordmark-dot">.</span></a>
    <nav class="desktop-nav" aria-label="Main navigation"><a href="#sound">The sound</a><a href="#materials">Materials</a><a href="#details">Details</a></nav>
    <button class="cart-trigger" type="button" data-action="open-cart" aria-label="Open bag, 0 items">Bag <span class="cart-count">0</span><span class="cart-arrow" aria-hidden="true">↗</span></button>
  </header>

  <section class="hero" id="top" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="eyebrow"><span class="eyebrow-rule"></span>Introducing MONO One <span class="eyebrow-index">01 / 03</span></div>
      <h1 id="hero-title">Sound,<br><em>considered.</em></h1>
      <p class="hero-lede">A quieter kind of extraordinary.<br>Made for the moments that matter.</p>
      <div class="hero-actions"><a class="text-link" href="#materials">Find your finish <span aria-hidden="true">↗</span></a><span class="hero-note">Wireless over-ear · Adaptive sound</span></div>
      <div class="hero-material" aria-label="Choose a finish">
        <div class="micro-label">Choose your finish</div>
        <div class="swatch-row" role="group" aria-label="Headphone finish">
          <button class="swatch" type="button" data-material="obsidian" aria-label="Obsidian, $489" aria-pressed="true"><span class="swatch-dot swatch-obsidian"></span><span class="swatch-name">Obsidian</span></button>
          <button class="swatch" type="button" data-material="chalk" aria-label="Chalk, $489" aria-pressed="false"><span class="swatch-dot swatch-chalk"></span><span class="swatch-name">Chalk</span></button>
          <button class="swatch" type="button" data-material="umber" aria-label="Umber, $519" aria-pressed="false"><span class="swatch-dot swatch-umber"></span><span class="swatch-name">Umber</span></button>
        </div>
      </div>
    </div>
    <div class="hero-visual" aria-label="Interactive product view">
      <div class="visual-kicker"><span>MONO / 01</span><span>STUDIO EDITION</span></div>
      <div class="stage-orbit stage-orbit-one"></div><div class="stage-orbit stage-orbit-two"></div>
      <div class="stage-shadow" aria-hidden="true"></div>
      <div class="loading-state" aria-live="polite"><span class="loading-mark">M</span><span>Preparing your listening space</span></div>
      <canvas id="product-canvas" role="img" aria-label="Three-dimensional view of MONO One headphones. Drag to explore." tabindex="0"></canvas>
      <div class="visual-caption"><span class="material-caption">OBSIDIAN / SOFT-TOUCH GRAPHITE</span><span>01 — 03</span></div>
      <div class="orbit-control"><span class="drag-hint"><span class="drag-icon" aria-hidden="true">↔</span> Drag to explore</span><button type="button" class="reset-view" data-action="reset-view">Reset view <span aria-hidden="true">⟲</span></button></div>
      <span class="visual-side-note">FORM FOLLOWS FEELING</span>
    </div>
    <div class="hero-bottom"><span>01&nbsp;&nbsp;—&nbsp;&nbsp;A study in less</span><a href="#sound" aria-label="Scroll to the sound story">Scroll to discover <span aria-hidden="true">↓</span></a></div>
  </section>

  <section class="manifesto reveal" id="sound" aria-labelledby="sound-title">
    <div class="manifesto-label"><span class="section-index">01 / THE LISTEN</span><span class="small-rule"></span></div>
    <div class="manifesto-main"><p class="section-overline">Nothing between you and the music.</p><h2 id="sound-title">The room gets quieter.<br><em>The music gets closer.</em></h2><p class="manifesto-copy">Adaptive noise control listens with you. A custom 40 mm driver brings every breath, brush and bass line into clear focus. Turn on awareness when the world calls you back.</p></div>
    <div class="sound-stats"><div class="stat"><span class="stat-value">40<span>mm</span></span><span class="stat-label">Custom bio-cellulose driver</span></div><div class="stat"><span class="stat-value">32<span>h</span></span><span class="stat-label">Listening, with ANC on</span></div><div class="stat"><span class="stat-value">24<span>bit</span></span><span class="stat-label">Lossless over USB-C</span></div></div>
    <div class="waveform" aria-label="Illustration of an audio waveform"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div class="wave-labels"><span>20 Hz</span><span>Balanced by design</span><span>20 kHz</span></div>
  </section>

  <section class="materials-section" id="materials" aria-labelledby="materials-title">
    <div class="materials-intro reveal"><div class="section-index">02 / THE OBJECT</div><div><p class="section-overline">Three finishes. One point of view.</p><h2 id="materials-title">Made to be<br><em>lived in.</em></h2></div><p class="materials-description">Formed in anodized aluminum. Finished by hand. The soft parts are replaceable, because good things should be kept.</p></div>
    <div class="material-cards reveal" role="group" aria-label="Select a MONO One finish">
      <button class="material-card selected" type="button" data-material="obsidian" aria-pressed="true"><span class="card-no">01</span><span class="card-swatch card-obsidian"></span><span class="card-copy"><strong>Obsidian</strong><small>Soft-touch graphite</small></span><span class="card-check" aria-hidden="true">↗</span></button>
      <button class="material-card" type="button" data-material="chalk" aria-pressed="false"><span class="card-no">02</span><span class="card-swatch card-chalk"></span><span class="card-copy"><strong>Chalk</strong><small>Ceramic ivory</small></span><span class="card-check" aria-hidden="true">↗</span></button>
      <button class="material-card" type="button" data-material="umber" aria-pressed="false"><span class="card-no">03</span><span class="card-swatch card-umber"></span><span class="card-copy"><strong>Umber</strong><small>Anodized bronze</small></span><span class="card-check" aria-hidden="true">↗</span></button>
    </div>
    <div class="material-detail reveal"><div class="material-current"><span class="current-dot"></span><span><strong class="current-name">Obsidian</strong><small class="current-finish">Soft-touch graphite</small></span></div><div class="detail-note">Your finish is reflected in the product view above.</div><div class="current-price">$489</div><button class="button button-dark add-to-bag" type="button" data-action="add-item">Add to bag <span aria-hidden="true">↗</span></button></div>
  </section>

  <section class="details-section" id="details" aria-labelledby="details-title">
    <div class="details-heading reveal"><div class="section-index">03 / THE DETAILS</div><div><p class="section-overline">A little thought goes a long way.</p><h2 id="details-title">Everything has<br><em>its reason.</em></h2></div></div>
    <div class="details-grid reveal">
      <article class="detail-panel comfort-panel"><span class="detail-number">01 — FIT</span><div class="detail-art comfort-art"><span class="art-ring"></span><span class="art-ring art-ring-inner"></span><span class="art-center">M</span></div><h3>Soft where it matters.</h3><p>Slow-rebound memory foam meets a breathable knit wrap. A feather-light frame settles in and stays there.</p><span class="panel-foot">328 g&nbsp;&nbsp; / &nbsp;&nbsp;Pressure-balanced</span></article>
      <article class="detail-panel clarity-panel"><span class="detail-number">02 — CLARITY</span><div class="detail-art dial-art"><span class="dial-center"></span><span class="dial-tick tick-a"></span><span class="dial-tick tick-b"></span><span class="dial-tick tick-c"></span><span class="dial-line"></span></div><h3>Silence with a sense of place.</h3><p>Three listening modes, shaped around your day. Focus in full. Let the street in. Or meet somewhere between.</p><span class="panel-foot">Adaptive ANC&nbsp;&nbsp; / &nbsp;&nbsp;Transparency</span></article>
      <article class="detail-panel connection-panel"><span class="detail-number">03 — CONNECTION</span><div class="detail-art connection-art"><span class="connection-orbit orbit-a"></span><span class="connection-orbit orbit-b"></span><span class="connection-core">M</span><span class="connection-node"></span></div><h3>Nothing lost in translation.</h3><p>Move from phone to laptop without a pause. Speak naturally; six beam-forming microphones do the listening.</p><span class="panel-foot">Multipoint&nbsp;&nbsp; / &nbsp;&nbsp;USB-C lossless</span></article>
    </div>
    <div class="spec-strip reveal"><div class="spec-heading"><span class="section-index">AT A GLANCE</span><span>Built around your listening.</span></div><div class="spec-items"><div><small>DRIVER</small><strong>40 mm bio-cellulose</strong></div><div><small>BATTERY</small><strong>32 hours with ANC</strong></div><div><small>CHARGING</small><strong>USB-C · 10 min for 5 h</strong></div><div><small>IN THE BOX</small><strong>Case · cable · adapter</strong></div></div></div>
  </section>

  <section class="closing-section reveal"><div class="closing-mark" aria-hidden="true">M</div><p class="section-overline">A good thing, heard fully.</p><h2>Meet your<br><em>new favorite.</em></h2><button class="button button-light" type="button" data-action="scroll-to-materials">Choose your MONO <span aria-hidden="true">↗</span></button><span class="closing-meta">MONO ONE&nbsp;&nbsp; / &nbsp;&nbsp;EST. FOR THE LISTEN</span></section>
  <footer class="site-footer"><a class="wordmark" href="#top">MONO<span class="wordmark-dot">.</span></a><span>Sound, considered.</span><span class="local-note">Independent concept · Local checkout demo</span><span>© MONO STUDIO 2026</span></footer>

  <div class="purchase-bar" aria-label="Quick purchase"><div class="purchase-product"><span class="purchase-dot"></span><span><strong>MONO One</strong><small class="sticky-material">Obsidian</small></span></div><span class="sticky-price">$489</span><button type="button" class="button button-dark sticky-add" data-action="add-item">Add to bag <span aria-hidden="true">↗</span></button></div>

  <dialog class="cart-dialog" aria-labelledby="cart-title">
    <div class="cart-panel">
      <div class="cart-header"><div><span class="section-index">MONO / YOUR SELECTION</span><h2 id="cart-title">Your bag<span class="cart-title-dot">.</span></h2></div><button class="close-cart" type="button" data-action="close-cart" aria-label="Close bag">×</button></div>
      <div class="cart-body"></div>
      <div class="undo-message" aria-live="polite" hidden><span>Removed from your bag.</span><button type="button" data-action="undo-remove">Undo</button></div>
      <div class="cart-footer"><div class="cart-subtotal"><span>Subtotal</span><strong>$0</strong></div><p class="cart-disclaimer">Local concept checkout. No payment or order is processed.</p><button type="button" class="button button-dark checkout-button" data-action="checkout">Continue to checkout <span aria-hidden="true">↗</span></button><button class="continue-link" type="button" data-action="close-cart">Continue exploring <span aria-hidden="true">↓</span></button></div>
    </div>
  </dialog>
  <div class="toast" role="status" aria-live="polite"></div>
`;

const canvas = document.querySelector('#product-canvas');
const dialog = document.querySelector('.cart-dialog');
const cartBody = document.querySelector('.cart-body');
const loadingState = document.querySelector('.loading-state');
const toast = document.querySelector('.toast');
function saveState() {
  try { localStorage.setItem('mono-one-state', JSON.stringify({ materialId: state.materialId, cart: state.cart })); } catch { /* Private browsing can disable local storage. */ }
}
function setMaterial(id, shouldScroll = false) {
  if (!materials[id]) return;
  state.materialId = id;
  const material = materials[id];
  document.querySelectorAll('[data-material]').forEach((button) => {
    const active = button.dataset.material === id;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('.current-name').textContent = material.name;
  document.querySelector('.current-finish').textContent = material.finish;
  document.querySelector('.current-price').textContent = money(material.price);
  document.querySelector('.sticky-material').textContent = material.name;
  document.querySelector('.sticky-price').textContent = money(material.price);
  document.querySelector('.material-caption').textContent = `${material.name.toUpperCase()} / ${material.finish.toUpperCase()}`;
  document.querySelector('.current-dot').style.backgroundColor = material.shell;
  document.querySelector('.purchase-dot').style.backgroundColor = material.shell;
  document.querySelector('.add-to-bag').setAttribute('aria-label', `Add MONO One in ${material.name}, ${money(material.price)}, to bag`);
  document.querySelector('.sticky-add').setAttribute('aria-label', `Add MONO One in ${material.name}, ${money(material.price)}, to bag`);
  updateProductMaterial(id);
  if (shouldScroll && window.matchMedia('(max-width: 760px)').matches) document.querySelector('.hero-visual').scrollIntoView({ behavior: 'smooth', block: 'center' });
  saveState();
}

function updateHeader() {
  const quantity = state.cart.reduce((sum, line) => sum + line.qty, 0);
  document.querySelector('.cart-count').textContent = quantity;
  document.querySelector('.cart-trigger').setAttribute('aria-label', `Open bag, ${quantity} ${quantity === 1 ? 'item' : 'items'}`);
}
function renderCart() {
  updateHeader();
  const total = state.cart.reduce((sum, line) => sum + materials[line.materialId].price * line.qty, 0);
  document.querySelector('.cart-subtotal strong').textContent = money(total);
  document.querySelector('.checkout-button').disabled = state.cart.length === 0;
  if (!state.cart.length) {
    cartBody.innerHTML = `<div class="empty-bag"><span class="empty-mark">M</span><h3>Room for something good.</h3><p>Your bag is ready when you are.</p><button class="button button-dark" type="button" data-action="scroll-to-materials">Explore finishes <span aria-hidden="true">↗</span></button></div>`;
    return;
  }
  cartBody.innerHTML = state.cart.map((line) => {
    const item = materials[line.materialId];
    return `<article class="cart-item" data-line="${line.id}"><div class="cart-item-art cart-art-${line.materialId}"><span class="cart-art-band"></span><span class="cart-art-cup"></span></div><div class="cart-item-info"><span class="item-kicker">MONO / 01</span><strong>MONO One</strong><span class="item-finish">${item.name} · ${item.finish}</span><div class="item-swatches" role="group" aria-label="Change ${item.name} finish">${Object.entries(materials).map(([id, color]) => `<button type="button" class="mini-swatch mini-${id}" data-action="change-line-material" data-line-id="${line.id}" data-material-id="${id}" aria-label="Change bag item to ${color.name}" aria-pressed="${id === line.materialId}"></button>`).join('')}</div><div class="quantity-control" aria-label="Quantity controls"><button type="button" data-action="decrement" data-line-id="${line.id}" aria-label="Decrease quantity">−</button><span aria-live="polite">${line.qty}</span><button type="button" data-action="increment" data-line-id="${line.id}" aria-label="Increase quantity">+</button><button type="button" class="remove-item" data-action="remove-item" data-line-id="${line.id}">Remove</button></div></div><strong class="item-price">${money(item.price * line.qty)}</strong></article>`;
  }).join('');
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2600);
}
function openCart() { renderCart(); if (!dialog.open) dialog.showModal(); }
function addItem() {
  state.lastRemoved = null;
  const existing = state.cart.find((line) => line.materialId === state.materialId);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: `mono-${state.nextId++}`, materialId: state.materialId, qty: 1 });
  saveState(); renderCart(); showToast(`${materials[state.materialId].name} added to your bag.`); openCart();
}
function removeLine(id) {
  const index = state.cart.findIndex((line) => line.id === id);
  if (index < 0) return;
  state.lastRemoved = { line: state.cart[index], index };
  state.cart.splice(index, 1);
  clearTimeout(undoTimer);
  document.querySelector('.undo-message').hidden = false;
  undoTimer = setTimeout(() => { state.lastRemoved = null; document.querySelector('.undo-message').hidden = true; }, 6500);
  renderCart(); saveState();
}
function changeLineMaterial(lineId, nextMaterial) {
  const line = state.cart.find((item) => item.id === lineId);
  if (!line || !materials[nextMaterial]) return;
  const duplicate = state.cart.find((item) => item.id !== lineId && item.materialId === nextMaterial);
  if (duplicate) { duplicate.qty += line.qty; state.cart = state.cart.filter((item) => item.id !== lineId); }
  else line.materialId = nextMaterial;
  setMaterial(nextMaterial); renderCart(); saveState();
}
document.addEventListener('click', (event) => {
  const materialButton = event.target.closest('[data-material]');
  if (materialButton) { setMaterial(materialButton.dataset.material, true); return; }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, lineId, materialId } = control.dataset;
  if (action === 'open-cart') openCart();
  if (action === 'close-cart') dialog.close();
  if (action === 'add-item') addItem();
  if (action === 'reset-view') resetView();
  if (action === 'scroll-to-materials') { dialog.close(); document.querySelector('#materials').scrollIntoView({ behavior: 'smooth' }); }
  if (action === 'increment') { const line = state.cart.find((item) => item.id === lineId); if (line) line.qty += 1; renderCart(); saveState(); }
  if (action === 'decrement') { const line = state.cart.find((item) => item.id === lineId); if (line) { if (line.qty > 1) { line.qty -= 1; renderCart(); saveState(); } else removeLine(lineId); } }
  if (action === 'remove-item') removeLine(lineId);
  if (action === 'change-line-material') changeLineMaterial(lineId, materialId);
  if (action === 'undo-remove' && state.lastRemoved) { state.cart.splice(Math.min(state.lastRemoved.index, state.cart.length), 0, state.lastRemoved.line); state.lastRemoved = null; clearTimeout(undoTimer); document.querySelector('.undo-message').hidden = true; renderCart(); saveState(); }
  if (action === 'checkout') { if (state.cart.length) showToast('Local demo only. No order has been placed.'); }
});
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { document.querySelector('.cart-trigger').focus({ preventScroll: true }); });

function createHeadphones() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.37, 9.3);
  camera.lookAt(0, 1.38, 0);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x625b55, 2.05));
  const key = new THREE.DirectionalLight(0xfff7ed, 3.2); key.position.set(-4.8, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe6e1da, 2.45); rim.position.set(5, 4, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xd9c6b4, 1.05); fill.position.set(2, 0, 6); scene.add(fill);

  headphone = new THREE.Group();
  model = new THREE.Group();
  headphone.rotation.y = -0.16;
  model.add(headphone); scene.add(model);

  const shell = new THREE.MeshPhysicalMaterial({ color: materials[state.materialId].shell, roughness: 0.34, metalness: 0.24, clearcoat: 0.28, clearcoatRoughness: 0.3 });
  const face = new THREE.MeshPhysicalMaterial({ color: materials[state.materialId].face, roughness: 0.28, metalness: 0.18, clearcoat: 0.35 });
  const trim = new THREE.MeshStandardMaterial({ color: materials[state.materialId].trim, roughness: 0.26, metalness: 0.72 });
  const cushion = new THREE.MeshStandardMaterial({ color: materials[state.materialId].cushion, roughness: 0.88, metalness: 0.02 });
  const seam = new THREE.MeshStandardMaterial({ color: materials[state.materialId].seam, roughness: 0.64, metalness: 0.14 });
  const dark = new THREE.MeshStandardMaterial({ color: '#111314', roughness: 0.68 });
  const inner = new THREE.MeshStandardMaterial({ color: '#171819', roughness: 0.96 });

  const bandPoints = [
    new THREE.Vector3(-1.48, 1.28, 0), new THREE.Vector3(-1.49, 1.86, 0.035), new THREE.Vector3(-1.19, 2.35, 0.08),
    new THREE.Vector3(-0.67, 2.66, 0.12), new THREE.Vector3(0, 2.76, 0.14), new THREE.Vector3(0.67, 2.66, 0.12),
    new THREE.Vector3(1.19, 2.35, 0.08), new THREE.Vector3(1.49, 1.86, 0.035), new THREE.Vector3(1.48, 1.28, 0),
  ];
  const bandCurve = new THREE.CatmullRomCurve3(bandPoints);
  const outerBand = new THREE.Mesh(new THREE.TubeGeometry(bandCurve, 100, 0.145, 16, false), shell);
  const innerCurve = new THREE.CatmullRomCurve3(bandPoints.map((p) => new THREE.Vector3(p.x, p.y - 0.145, p.z + 0.002)));
  const headPad = new THREE.Mesh(new THREE.TubeGeometry(innerCurve, 100, 0.078, 12, false), cushion);
  headphone.add(outerBand, headPad);
  const pipingCurve = new THREE.CatmullRomCurve3(bandPoints.map((p) => new THREE.Vector3(p.x, p.y + 0.085, p.z + 0.01)));
  const piping = new THREE.Mesh(new THREE.TubeGeometry(pipingCurve, 100, 0.014, 8, false), trim); headphone.add(piping);

  for (const side of [-1, 1]) {
    const cup = new THREE.Group(); cup.position.set(side * 1.5, 0.83, 0.01); cup.rotation.y = side * 0.12;
    const backing = new THREE.Mesh(new THREE.SphereGeometry(0.64, 48, 36), dark); backing.scale.set(0.85, 1.08, 0.45); backing.position.z = -0.1; cup.add(backing);
    const housing = new THREE.Mesh(new THREE.SphereGeometry(0.61, 48, 40), shell); housing.scale.set(0.82, 1.055, 0.45); cup.add(housing); shellMeshes.push(housing);
    const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.027, 12, 64), trim); trimRing.scale.set(0.94, 1.13, 0.45); trimRing.position.z = 0.255; cup.add(trimRing); trimMeshes.push(trimRing);
    const facePlate = new THREE.Mesh(new THREE.SphereGeometry(0.49, 48, 40), face); facePlate.scale.set(0.84, 1.08, 0.24); facePlate.position.z = 0.245; cup.add(facePlate); faceMeshes.push(facePlate);
    const cushionRing = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.135, 20, 64), cushion); cushionRing.scale.set(0.93, 1.12, 0.72); cushionRing.position.z = 0.32; cup.add(cushionRing); cushionMeshes.push(cushionRing);
    const opening = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 32), inner); opening.scale.set(0.78, 1.06, 0.18); opening.position.z = 0.3; cup.add(opening);
    const seamRing = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.008, 6, 64), seam); seamRing.scale.set(0.84, 1.08, 0.4); seamRing.position.z = 0.29; cup.add(seamRing); seamMeshes.push(seamRing);
    const badge = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.009, 6, 32), trim); badge.position.set(0, 0.69, 0.282); cup.add(badge);
    const badgeDot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), trim); badgeDot.position.set(0, 0.69, 0.294); cup.add(badgeDot);
    for (let i = 0; i < 5; i += 1) { const vent = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), dark); vent.position.set((i - 2) * 0.057, -0.72, 0.3); cup.add(vent); }
    const slider = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.13), trim); slider.position.set(0, 0.98, -0.015); slider.scale.x = 0.65; cup.add(slider);
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), shell); hinge.scale.set(0.75, 1, 0.8); hinge.position.set(0, 1.18, 0.015); cup.add(hinge); shellMeshes.push(hinge);
    headphone.add(cup);
  }
  const nose = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.007, 6, 24), trim); nose.position.set(0, 2.735, 0.24); headphone.add(nose);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.fov = rect.width < 500 ? 37 : 32;
    camera.position.z = rect.width < 500 ? 10.6 : 9.3;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(time) {
    const scrollFactor = reduced ? 0 : Math.min(window.scrollY / (window.innerHeight * 1.5), 1);
    const targetY = desiredYaw - scrollFactor * 0.3;
    model.rotation.y += (targetY - model.rotation.y) * 0.075;
    model.rotation.x += (desiredPitch - model.rotation.x) * 0.075;
    model.position.y += ((reduced ? 0 : Math.sin(time * 0.00045) * 0.025) - model.position.y) * 0.025;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setTimeout(() => loadingState.classList.add('loaded'), 320);
}
function updateProductMaterial(id) {
  if (!scene) return;
  const colors = materials[id];
  for (const mesh of shellMeshes) mesh.material.color.set(colors.shell);
  for (const mesh of faceMeshes) mesh.material.color.set(colors.face);
  for (const mesh of trimMeshes) mesh.material.color.set(colors.trim);
  for (const mesh of cushionMeshes) mesh.material.color.set(colors.cushion);
  for (const mesh of seamMeshes) mesh.material.color.set(colors.seam);
}
function resetView() { desiredYaw = -0.16; desiredPitch = 0.035; showToast('View reset.'); }
canvas.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY, yaw: desiredYaw, pitch: desiredPitch, id: event.pointerId }; canvas.setPointerCapture(event.pointerId); canvas.classList.add('dragging'); });
canvas.addEventListener('pointermove', (event) => { if (!pointerStart || pointerStart.id !== event.pointerId) return; desiredYaw = pointerStart.yaw + (event.clientX - pointerStart.x) * 0.008; desiredPitch = THREE.MathUtils.clamp(pointerStart.pitch + (event.clientY - pointerStart.y) * 0.003, -0.23, 0.28); });
const endDrag = () => { pointerStart = null; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') desiredYaw -= 0.16; if (event.key === 'ArrowRight') desiredYaw += 0.16; if (event.key === 'ArrowUp') desiredPitch = THREE.MathUtils.clamp(desiredPitch + 0.08, -0.23, 0.28); if (event.key === 'ArrowDown') desiredPitch = THREE.MathUtils.clamp(desiredPitch - 0.08, -0.23, 0.28); if (event.key.startsWith('Arrow')) event.preventDefault(); });

try { createHeadphones(); } catch (error) { console.error('Product renderer could not start:', error); loadingState.innerHTML = '<span>Product view unavailable in this browser.</span>'; }
setMaterial(state.materialId);
renderCart();
const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); } }), { threshold: 0.16 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
const purchaseBar = document.querySelector('.purchase-bar');
const heroObserver = new IntersectionObserver((entries) => { const entry = entries[0]; purchaseBar.classList.toggle('shown', !entry.isIntersecting && window.scrollY > 320); }, { threshold: 0.08 });
heroObserver.observe(document.querySelector('.hero'));
let scrollRaf = false;
window.addEventListener('scroll', () => { if (scrollRaf) return; scrollRaf = true; requestAnimationFrame(() => { document.documentElement.style.setProperty('--page-progress', `${Math.min(window.scrollY / (document.documentElement.scrollHeight - window.innerHeight), 1) * 100}%`); scrollRaf = false; }); }, { passive: true });
setTimeout(() => { if (!loadingState.classList.contains('loaded')) loadingState.classList.add('loaded'); }, 1700);
