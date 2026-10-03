import './style.css';
import * as THREE from 'three';

const materials = {
  pumice: {
    name: 'Pumice',
    finish: 'Ceramic / brushed titanium',
    description: 'Pale mineral ceramic with a soft, brushed titanium edge.',
    price: 390,
    swatch: '#b8a995',
    shell: 0xb6a792,
    face: 0xc7b69f,
    trim: 0xe2d6c6,
    hardware: 0x8d7d6d,
    roughness: 0.32,
    metalness: 0.42
  },
  oxide: {
    name: 'Oxide',
    finish: 'Anodised / warm nickel',
    description: 'A deep, kiln-fired red with a warm nickel highlight.',
    price: 420,
    swatch: '#8e4438',
    shell: 0x824236,
    face: 0xa65848,
    trim: 0xd49a78,
    hardware: 0xb28b70,
    roughness: 0.3,
    metalness: 0.48
  },
  cinder: {
    name: 'Cinder',
    finish: 'Graphite / dark titanium',
    description: 'Smoked graphite, finely textured, with a dark titanium edge.',
    price: 390,
    swatch: '#444746',
    shell: 0x343838,
    face: 0x505453,
    trim: 0xb3b0a8,
    hardware: 0x7a7c79,
    roughness: 0.38,
    metalness: 0.56
  }
};

const app = document.body;
const money = function (value) { return '€' + value.toLocaleString('en-US'); };
const clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let selectedMaterial = 'pumice';
let manualYaw = 0;
let manualPitch = 0;
let pointerYaw = 0;
let pointerPitch = 0;
let scrollYaw = -0.22;
let scrollPitch = -0.025;
let scenes = [];
let animationFrame = 0;
let resizeObserver;
let cart = [];
let lastRemoved = null;
let undoTimer = 0;
let previousFocus = null;

function formatPrice(id) {
  return money(materials[id].price);
}

function createTube(points, radius, material, tubularSegments, radialSegments) {
  const curve = new THREE.CatmullRomCurve3(points.map(function (point) {
    return new THREE.Vector3(point[0], point[1], point[2]);
  }));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments || 72, radius, radialSegments || 10, false), material);
}

function cylinderBetween(start, end, radius, material, segments) {
  const from = new THREE.Vector3(start[0], start[1], start[2]);
  const to = new THREE.Vector3(end[0], end[1], end[2]);
  const direction = new THREE.Vector3().subVectors(to, from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments || 16), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createHeadphones() {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);

  const cushionMaterial = new THREE.MeshStandardMaterial({ color: 0x242524, roughness: 0.9, metalness: 0.02 });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: 0x302f2d, roughness: 0.37, metalness: 0.42 });
  const padInnerMaterial = new THREE.MeshStandardMaterial({ color: 0x1e201f, roughness: 0.96, metalness: 0.01 });
  const shellMaterial = new THREE.MeshStandardMaterial({ color: materials.pumice.shell, roughness: materials.pumice.roughness, metalness: materials.pumice.metalness });
  const faceMaterial = new THREE.MeshStandardMaterial({ color: materials.pumice.face, roughness: 0.28, metalness: 0.38 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: materials.pumice.trim, roughness: 0.2, metalness: 0.72 });
  const hardwareMaterial = new THREE.MeshStandardMaterial({ color: materials.pumice.hardware, roughness: 0.28, metalness: 0.76 });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x484847, roughness: 0.28, metalness: 0.78 });
  const shellMeshes = [];
  const faceMeshes = [];
  const trimMeshes = [];
  const hardwareMeshes = [];

  model.add(createTube([
    [-1.07, 0.08, -0.02], [-1.02, 0.68, -0.04], [-0.81, 1.28, -0.06],
    [-0.44, 1.68, -0.08], [0, 1.82, -0.08], [0.44, 1.68, -0.08],
    [0.81, 1.28, -0.06], [1.02, 0.68, -0.04], [1.07, 0.08, -0.02]
  ], 0.145, bandMaterial, 104, 14));
  model.add(createTube([
    [-0.91, 0.31, 0.025], [-0.87, 0.79, 0.015], [-0.66, 1.26, 0.005],
    [-0.35, 1.55, 0], [0, 1.64, 0], [0.35, 1.55, 0],
    [0.66, 1.26, 0.005], [0.87, 0.79, 0.015], [0.91, 0.31, 0.025]
  ], 0.075, cushionMaterial, 88, 12));
  model.add(createTube([
    [-0.91, 0.33, 0.05], [-0.88, 0.79, 0.045], [-0.67, 1.25, 0.04],
    [-0.34, 1.54, 0.04], [0, 1.64, 0.04], [0.34, 1.54, 0.04],
    [0.67, 1.25, 0.04], [0.88, 0.79, 0.045], [0.91, 0.33, 0.05]
  ], 0.011, hardwareMaterial, 88, 8));

  const cupGroups = [];
  [-1, 1].forEach(function (side) {
    const cup = new THREE.Group();
    cup.position.set(side * 1.08, -0.12, 0.03);
    cup.rotation.y = -side * 0.12;
    model.add(cup);
    cupGroups.push(cup);

    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 28), shellMaterial);
    shell.scale.set(0.61, 0.75, 0.39);
    shell.position.z = -0.025;
    cup.add(shell);
    shellMeshes.push(shell);

    const backCap = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), darkMetalMaterial);
    backCap.scale.set(0.52, 0.65, 0.12);
    backCap.position.z = -0.335;
    cup.add(backCap);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.045, 10, 72), trimMaterial);
    outerRing.scale.set(1.19, 1.46, 1);
    outerRing.position.z = 0.294;
    cup.add(outerRing);
    trimMeshes.push(outerRing);

    const front = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 28), faceMaterial);
    front.scale.set(0.51, 0.64, 0.155);
    front.position.z = 0.315;
    cup.add(front);
    faceMeshes.push(front);

    const insetRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 8, 64), hardwareMaterial);
    insetRing.scale.set(1, 1.46, 1);
    insetRing.position.z = 0.451;
    cup.add(insetRing);
    hardwareMeshes.push(insetRing);

    const innerMark = new THREE.Mesh(new THREE.CircleGeometry(0.205, 48), faceMaterial);
    innerMark.position.z = 0.46;
    cup.add(innerMark);

    const innerPad = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.075, 10, 64), cushionMaterial);
    innerPad.scale.set(1.0, 1.27, 1);
    innerPad.position.z = -0.335;
    cup.add(innerPad);

    const innerOpening = new THREE.Mesh(new THREE.CircleGeometry(0.41, 48), padInnerMaterial);
    innerOpening.scale.y = 1.22;
    innerOpening.position.z = -0.345;
    cup.add(innerOpening);

    const lowerMark = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), trimMaterial);
    lowerMark.position.set(0, -0.53, 0.46);
    cup.add(lowerMark);
    trimMeshes.push(lowerMark);

    const sidePlate = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), hardwareMaterial);
    sidePlate.scale.set(0.14, 0.23, 0.06);
    sidePlate.position.set(side * 0.57, 0.01, -0.025);
    cup.add(sidePlate);
    hardwareMeshes.push(sidePlate);

    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), darkMetalMaterial);
    hinge.scale.set(1, 1, 0.7);
    hinge.position.set(side * 0.55, 0.35, 0);
    cup.add(hinge);
    model.add(cylinderBetween([side * 1.015, 0.48, -0.02], [side * 1.08, 0.18, 0.04], 0.063, hardwareMaterial, 18));
    model.add(cylinderBetween([side * 1.0, 0.48, -0.12], [side * 1.0, 0.18, -0.11], 0.035, darkMetalMaterial, 14));
    hardwareMeshes.push(hinge);
  });

  const pivotL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 22, 18), hardwareMaterial);
  const pivotR = pivotL.clone();
  pivotL.position.set(-1.08, 0.02, 0.12);
  pivotR.position.set(1.08, 0.02, 0.12);
  model.add(pivotL, pivotR);
  hardwareMeshes.push(pivotL, pivotR);

  const accentLine = createTube([
    [-0.53, 1.72, 0.008], [-0.28, 1.80, 0.008], [0, 1.83, 0.008],
    [0.28, 1.80, 0.008], [0.53, 1.72, 0.008]
  ], 0.012, trimMaterial, 40, 8);
  model.add(accentLine);
  trimMeshes.push(accentLine);

  const materialTargets = { shellMeshes: shellMeshes, faceMeshes: faceMeshes, trimMeshes: trimMeshes, hardwareMeshes: hardwareMeshes };

  return { root: root, model: model, materialTargets: materialTargets, cupGroups: cupGroups };
}

function applyMaterial(targets, materialId) {
  const data = materials[materialId];
  targets.shellMeshes.forEach(function (mesh) {
    mesh.material.color.setHex(data.shell);
    mesh.material.roughness = data.roughness;
    mesh.material.metalness = data.metalness;
  });
  targets.faceMeshes.forEach(function (mesh) {
    mesh.material.color.setHex(data.face);
    mesh.material.roughness = Math.max(0.22, data.roughness - 0.04);
    mesh.material.metalness = data.metalness * 0.85;
  });
  targets.trimMeshes.forEach(function (mesh) {
    mesh.material.color.setHex(data.trim);
  });
  targets.hardwareMeshes.forEach(function (mesh) {
    mesh.material.color.setHex(data.hardware);
  });
}

function setupScene(canvas) {
  const host = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.38, 7.5);
  camera.lookAt(0, 0.28, 0);

  scene.add(new THREE.HemisphereLight(0xfff8ed, 0x45413d, 2.25));
  const key = new THREE.DirectionalLight(0xfff2e4, 3.15);
  key.position.set(-3.7, 5.2, 6.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd8e0e9, 1.55);
  fill.position.set(4.5, 1.4, 4.0);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf3d8c2, 3.4);
  rim.position.set(1.0, 3.0, -4.0);
  scene.add(rim);
  const bounce = new THREE.PointLight(0xc7b8a4, 1.2);
  bounce.position.set(-3, -2, 3.5);
  scene.add(bounce);

  const product = createHeadphones();
  product.root.scale.setScalar(canvas.id === 'scene' ? 1.17 : 1.2);
  product.root.position.y = -0.16;
  product.model.rotation.set(-0.018, -0.21, 0);
  scene.add(product.root);
  applyMaterial(product.materialTargets, selectedMaterial);

  const item = { canvas: canvas, host: host, renderer: renderer, scene: scene, camera: camera, product: product, visible: false };
  const resize = function () {
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  return { item: item, resize: resize };
}

function updateSceneControls() {
  document.querySelectorAll('[data-orbit]').forEach(function (button) {
    button.addEventListener('click', function () {
      const direction = button.getAttribute('data-orbit');
      if (direction === 'reset') {
        manualYaw = 0;
        manualPitch = 0;
      } else {
        manualYaw = clamp(manualYaw + Number(direction) * 0.46, -1.05, 1.05);
      }
    });
  });
}

function updateScrollIntent() {
  const top = window.scrollY || window.pageYOffset;
  const materialSection = document.getElementById('materials');
  const materialTop = materialSection.getBoundingClientRect().top + top;
  const heroTop = document.getElementById('top').getBoundingClientRect().top + top;
  const span = Math.max(1, materialTop - heroTop);
  const progress = clamp((top + window.innerHeight * 0.38 - heroTop) / span, 0, 1);
  scrollYaw = reduceMotion.matches ? -0.22 : -0.22 + progress * 0.57;
  scrollPitch = reduceMotion.matches ? -0.025 : -0.025 + progress * 0.055;

  const sticky = document.getElementById('sticky-purchase');
  sticky.classList.toggle('is-visible', top > window.innerHeight * 0.48);
}

function selectMaterial(materialId) {
  if (!materials[materialId]) return;
  selectedMaterial = materialId;
  const data = materials[materialId];

  document.querySelectorAll('.material-option').forEach(function (button) {
    const isSelected = button.getAttribute('data-material') === materialId;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  document.getElementById('selected-name').textContent = data.name;
  document.getElementById('selected-description').textContent = data.description;
  document.getElementById('selected-price').textContent = formatPrice(materialId);
  document.getElementById('sticky-name').textContent = data.name;
  document.getElementById('sticky-price').textContent = formatPrice(materialId);
  document.getElementById('sticky-swatch').style.backgroundColor = data.swatch;
  document.querySelector('#scene').setAttribute('aria-label', 'Three-dimensional MONO 01 headphones in the ' + data.name + ' finish');

  scenes.forEach(function (sceneItem) {
    applyMaterial(sceneItem.product.materialTargets, materialId);
  });
  document.getElementById('live-announcement').textContent = data.name + ' finish selected. ' + data.finish + '. Concept price ' + formatPrice(materialId) + '.';
}

function renderCart() {
  const itemsHost = document.getElementById('cart-items');
  const subtotal = document.getElementById('cart-total');
  const count = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
  const total = cart.reduce(function (sum, item) { return sum + materials[item.id].price * item.quantity; }, 0);
  const bagCount = document.getElementById('bag-count');
  bagCount.textContent = String(count);
  document.getElementById('open-cart').setAttribute('aria-label', 'Open bag, ' + count + (count === 1 ? ' item' : ' items'));
  subtotal.textContent = money(total);
  document.getElementById('checkout-preview').disabled = count === 0;
  document.getElementById('checkout-feedback').textContent = '';

  if (!cart.length) {
    itemsHost.innerHTML = '<div class="empty-bag" id="empty-bag"><span class="empty-ring"></span><p>Your bag is quiet.</p><a href="#materials" id="empty-bag-link">Choose a finish <span aria-hidden="true">↗</span></a></div>';
    return;
  }

  itemsHost.innerHTML = cart.map(function (item) {
    const data = materials[item.id];
    return '<article class="cart-item" data-cart-item="' + item.id + '">' +
      '<span class="cart-item-swatch" style="--item-swatch:' + data.swatch + '" aria-hidden="true"></span>' +
      '<div class="cart-item-main"><div class="cart-item-title"><div><h3>MONO 01</h3><p>' + data.name + ' <span>·</span> ' + data.finish + '</p></div><strong>' + money(data.price * item.quantity) + '</strong></div>' +
      '<div class="cart-item-controls"><div class="quantity-control" aria-label="' + data.name + ' quantity">' +
      '<button type="button" data-cart-action="decrease" data-cart-id="' + item.id + '" aria-label="Decrease ' + data.name + ' quantity">−</button>' +
      '<span aria-live="polite">' + item.quantity + '</span>' +
      '<button type="button" data-cart-action="increase" data-cart-id="' + item.id + '" aria-label="Increase ' + data.name + ' quantity">+</button>' +
      '</div><button class="remove-item" type="button" data-cart-action="remove" data-cart-id="' + item.id + '">Remove</button></div></div></article>';
  }).join('');
}

function openCart() {
  const layer = document.getElementById('cart-layer');
  const drawer = document.getElementById('cart-drawer');
  previousFocus = document.activeElement;
  layer.classList.add('is-open');
  layer.setAttribute('aria-hidden', 'false');
  drawer.removeAttribute('inert');
  drawer.setAttribute('aria-hidden', 'false');
  app.classList.add('cart-open');
  window.setTimeout(function () { document.getElementById('close-cart').focus(); }, reduceMotion.matches ? 0 : 180);
}

function closeCart() {
  const layer = document.getElementById('cart-layer');
  const drawer = document.getElementById('cart-drawer');
  layer.classList.remove('is-open');
  layer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('inert', '');
  drawer.setAttribute('aria-hidden', 'true');
  app.classList.remove('cart-open');
  document.getElementById('checkout-feedback').textContent = '';
  if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
}

function addCurrentMaterial() {
  const existing = cart.find(function (item) { return item.id === selectedMaterial; });
  if (existing) existing.quantity += 1;
  else cart.push({ id: selectedMaterial, quantity: 1 });
  renderCart();
  document.getElementById('live-announcement').textContent = 'One ' + materials[selectedMaterial].name + ' MONO 01 added to your bag.';
  openCart();
}

function showUndo(item, index) {
  const toast = document.getElementById('undo-toast');
  document.getElementById('undo-copy').textContent = materials[item.id].name + ' removed from your bag.';
  toast.hidden = false;
  clearTimeout(undoTimer);
  undoTimer = window.setTimeout(function () {
    toast.hidden = true;
    lastRemoved = null;
  }, 5200);
  lastRemoved = { item: item, index: index };
}

function handleCartAction(event) {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const id = button.getAttribute('data-cart-id');
  const index = cart.findIndex(function (item) { return item.id === id; });
  if (index < 0) return;
  const action = button.getAttribute('data-cart-action');
  if (action === 'increase') cart[index].quantity += 1;
  if (action === 'decrease') {
    cart[index].quantity -= 1;
    if (cart[index].quantity <= 0) {
      const removed = cart.splice(index, 1)[0];
      showUndo(removed, index);
    }
  }
  if (action === 'remove') {
    const removed = cart.splice(index, 1)[0];
    showUndo(removed, index);
  }
  renderCart();
}

function initReveals() {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (item) { item.classList.add('is-in'); });
    return;
  }
  app.classList.add('reveal-ready');
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.13, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function (item, index) {
    item.style.setProperty('--reveal-delay', Math.min(index % 4, 3) * 85 + 'ms');
    observer.observe(item);
  });
}

function initScenes() {
  const canvasElements = [document.getElementById('scene'), document.getElementById('configure-scene')];
  const initialized = canvasElements.map(setupScene);
  scenes = initialized.map(function (entry) { return entry.item; });
  resizeObserver = new ResizeObserver(function () {
    initialized.forEach(function (entry) { entry.resize(); });
  });
  initialized.forEach(function (entry) { resizeObserver.observe(entry.item.host); });

  const visibilityObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      const sceneItem = scenes.find(function (item) { return item.host === entry.target; });
      if (sceneItem) sceneItem.visible = entry.isIntersecting;
    });
  }, { rootMargin: '120px 0px' });
  scenes.forEach(function (sceneItem) { visibilityObserver.observe(sceneItem.host); });

  scenes.forEach(function (sceneItem) {
    sceneItem.host.addEventListener('pointermove', function (event) {
      const bounds = sceneItem.host.getBoundingClientRect();
      pointerYaw = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.28;
      pointerPitch = ((event.clientY - bounds.top) / bounds.height - 0.5) * -0.16;
    });
    sceneItem.host.addEventListener('pointerleave', function () {
      pointerYaw = 0;
      pointerPitch = 0;
    });
  });

  const loader = document.getElementById('loading-screen');
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      app.classList.remove('is-loading');
      loader.setAttribute('aria-hidden', 'true');
      window.setTimeout(function () { loader.remove(); }, reduceMotion.matches ? 0 : 520);
      updateScrollIntent();
    });
  });

  let previousTime = 0;
  function frame(now) {
    animationFrame = window.requestAnimationFrame(frame);
    const delta = Math.min(48, now - previousTime || 16);
    previousTime = now;
    const rate = reduceMotion.matches ? 1 : 1 - Math.pow(0.0016, delta / 16.67);
    scenes.forEach(function (sceneItem) {
      const model = sceneItem.product.model;
      const targetYaw = scrollYaw + manualYaw + (reduceMotion.matches ? 0 : pointerYaw);
      const targetPitch = scrollPitch + manualPitch + (reduceMotion.matches ? 0 : pointerPitch);
      model.rotation.y += (targetYaw - model.rotation.y) * rate;
      model.rotation.x += (targetPitch - model.rotation.x) * rate;
      sceneItem.product.root.rotation.z += (0 - sceneItem.product.root.rotation.z) * rate;
      if (sceneItem.visible) sceneItem.renderer.render(sceneItem.scene, sceneItem.camera);
    });
  }
  animationFrame = window.requestAnimationFrame(frame);
}

function initInteractions() {
  document.querySelectorAll('.material-option').forEach(function (button) {
    button.addEventListener('click', function () {
      selectMaterial(button.getAttribute('data-material'));
    });
  });
  updateSceneControls();

  document.getElementById('add-to-bag').addEventListener('click', addCurrentMaterial);
  document.getElementById('sticky-add').addEventListener('click', addCurrentMaterial);
  document.getElementById('open-cart').addEventListener('click', openCart);
  document.getElementById('close-cart').addEventListener('click', closeCart);
  document.getElementById('cart-scrim').addEventListener('click', closeCart);
  document.getElementById('continue-shopping').addEventListener('click', closeCart);
  document.getElementById('cart-items').addEventListener('click', handleCartAction);

  document.getElementById('checkout-preview').addEventListener('click', function () {
    document.getElementById('checkout-feedback').textContent = 'This concept has no payment service. Your selection stays in this local demo.';
  });

  document.getElementById('undo-remove').addEventListener('click', function () {
    if (!lastRemoved) return;
    cart.splice(Math.min(lastRemoved.index, cart.length), 0, lastRemoved.item);
    lastRemoved = null;
    clearTimeout(undoTimer);
    document.getElementById('undo-toast').hidden = true;
    renderCart();
    document.getElementById('live-announcement').textContent = 'Item restored to your bag.';
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.getElementById('cart-layer').classList.contains('is-open')) closeCart();
    if (event.key === 'Tab' && document.getElementById('cart-layer').classList.contains('is-open')) {
      const drawer = document.getElementById('cart-drawer');
      const focusable = Array.from(drawer.querySelectorAll('button:not(:disabled), a[href]')).filter(function (item) { return item.offsetParent !== null; });
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.querySelectorAll('.main-nav a, .text-link, .button[href], #empty-bag-link, .back-top').forEach(function (link) {
    link.addEventListener('click', function () {
      if (document.getElementById('cart-layer').classList.contains('is-open')) closeCart();
    });
  });

  window.addEventListener('scroll', updateScrollIntent, { passive: true });
  window.addEventListener('resize', updateScrollIntent);
  reduceMotion.addEventListener('change', updateScrollIntent);
}

function handleWebglError(error) {
  console.error('MONO 01 3D scene failed to start:', error);
  app.classList.add('scene-fallback');
  const loader = document.getElementById('loading-screen');
  if (loader) loader.remove();
  app.classList.remove('is-loading');
  document.querySelectorAll('.stage').forEach(function (stage) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-error';
    fallback.innerHTML = '<span>MONO 01</span><p>Three-dimensional preview is unavailable in this browser.</p>';
    stage.appendChild(fallback);
  });
}

function boot() {
  initInteractions();
  renderCart();
  selectMaterial(selectedMaterial);
  initReveals();
  try {
    initScenes();
  } catch (error) {
    handleWebglError(error);
  }
}

boot();

window.addEventListener('pagehide', function () {
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  if (resizeObserver) resizeObserver.disconnect();
  scenes.forEach(function (sceneItem) {
    sceneItem.renderer.dispose();
  });
});
