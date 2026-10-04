import './style.css';
import * as THREE from 'three';

const app = document.querySelector('#app');
const money = value => `$${value.toLocaleString('en-US')}`;
const materials = {
  obsidian: { name: 'Obsidian', finish: 'Soft-touch graphite', price: 780, shell: 0x272827, trim: 0x8d8a82, pad: 0x171918, swatch: '#303331' },
  chalk: { name: 'Chalk', finish: 'Warm mineral', price: 780, shell: 0xd4d0c8, trim: 0x9e988d, pad: 0x363632, swatch: '#d7d2c9' },
  clay: { name: 'Clay', finish: 'Burnished umber', price: 820, shell: 0x8f4a37, trim: 0xc49478, pad: 0x352723, swatch: '#94503c' },
};

app.innerHTML = `
  <div class="notice"><span>MONO / LISTENING OBJECT 01</span><span>CONCEPT EDITION&nbsp; — &nbsp;2026</span></div>
  <header class="site-header">
    <a class="wordmark" href="#top" aria-label="MONO home">mono<span>®</span></a>
    <nav aria-label="Main navigation"><a href="#design">Design</a><a href="#sound">Sound</a><a href="#details">Details</a></nav>
    <button class="bag-trigger" data-open-cart aria-label="Open bag">Bag <span class="bag-count">0</span><span class="bag-icon" aria-hidden="true">↗</span></button>
  </header>
  <section class="hero" id="top">
    <div class="hero-copy reveal">
      <p class="eyebrow"><i></i> A study in listening</p>
      <h1>Sound, with<br><em>space</em> to breathe.</h1>
      <p class="intro">A quieter kind of loud. MONO brings your music into focus, then lets the rest fall away.</p>
      <div class="hero-actions"><button class="button button-dark" data-add>Add to bag <span>↗</span></button><a class="text-link" href="#design">Meet MONO <span>↓</span></a></div>
      <div class="hero-note"><span>01 / 03</span><span>Made for the moments between</span></div>
    </div>
    <div class="hero-art" aria-label="Interactive 3D view of the MONO over-ear headphone">
      <div class="art-kicker"><span>01 — FORM STUDY</span><span>OBSIDIAN / MATTE</span></div>
      <div class="halo halo-one"></div><div class="halo halo-two"></div>
      <canvas id="product-canvas" aria-label="A three dimensional MONO headphone. Use the orbit controls below to change the view." role="img"></canvas>
      <div class="loading" id="loading"><span></span>Preparing the listening object</div>
      <div class="art-caption"><span>MONO / 01</span><span>01 — 03&nbsp;&nbsp; MATERIAL STUDIES</span></div>
      <div class="orbit-controls"><span>EXPLORE THE FORM</span><button data-orbit aria-pressed="false">Orbit view <span>↗</span></button><button class="reset-view" data-reset aria-label="Reset product view">⟲</button></div>
    </div>
  </section>
  <div class="ticker" aria-label="Designed to disappear into the moment"><span>LESS BETWEEN YOU AND THE MUSIC</span><b>✳</b><span>LESS BETWEEN YOU AND THE MUSIC</span><b>✳</b><span>LESS BETWEEN YOU AND THE MUSIC</span></div>
  <section class="design-section" id="design">
    <div class="section-intro reveal"><p class="eyebrow"><i></i> 01 — Considered form</p><h2>Nothing extra.<br><em>Everything felt.</em></h2><p>Every surface has a reason. Every detail earns its place.</p></div>
    <div class="material-panel reveal">
      <div class="material-copy"><span class="micro-label">THE FINISH / <span data-material-index>01</span></span><h3 data-material-name>Obsidian</h3><p data-material-finish>Soft-touch graphite</p><p class="material-description">A smooth, low-gloss shell and a cushion-soft seal. Choose the surface that feels like yours.</p>
        <div class="swatches" role="group" aria-label="Choose a headphone material">
          <button class="swatch is-selected" data-material="obsidian" aria-label="Obsidian, $780" aria-pressed="true"><i></i><span>Obsidian</span></button>
          <button class="swatch" data-material="chalk" aria-label="Chalk, $780" aria-pressed="false"><i></i><span>Chalk</span></button>
          <button class="swatch" data-material="clay" aria-label="Clay, $820" aria-pressed="false"><i></i><span>Clay</span></button>
        </div>
        <div class="price-line"><span>Concept edition</span><strong data-price>$780</strong></div>
        <button class="button button-outline" data-add>Choose this finish <span>↗</span></button>
      </div>
      <div class="material-visual"><div class="visual-grid"></div><div class="material-orbit">MATERIAL INDEX&nbsp; 01—03</div><div class="visual-word">01</div><div class="visual-spec"><span>ANODISED ALUMINIUM</span><span>SOFT-TOUCH FINISH</span></div><div class="visual-sweep"></div></div>
    </div>
  </section>
  <section class="sound-section" id="sound">
    <div class="sound-top reveal"><p class="eyebrow"><i></i> 02 — The listening space</p><h2>Leave the noise<br><em>at the door.</em></h2><p class="sound-lead">Thoughtful isolation. A naturally balanced signature. A little more room for the details you came for.</p></div>
    <div class="sound-stage reveal"><div class="sound-disc"><div class="disc-core"></div><span class="disc-label">MONO<br>01</span><div class="sound-wave wave-a"></div><div class="sound-wave wave-b"></div><div class="sound-wave wave-c"></div></div><div class="sound-aside"><span class="micro-label">THE MONO APPROACH / 03</span><p>Quiet is not an effect. It is the space we make for what matters.</p><a href="#details" class="text-link">See the details <span>↓</span></a></div></div>
  </section>
  <section class="details-section" id="details">
    <div class="details-heading reveal"><p class="eyebrow"><i></i> 03 — In good measure</p><h2>Made to stay<br><em>with you.</em></h2><p class="details-note">A considered set of details for everyday listening. Concept specifications shown for this study.</p></div>
    <div class="spec-list reveal">
      <div class="spec-row"><span>01</span><strong>Over-ear, closed-back</strong><span>Form</span></div><div class="spec-row"><span>02</span><strong>40 mm dynamic driver</strong><span>Driver</span></div><div class="spec-row"><span>03</span><strong>Up to 32 hours</strong><span>Listening time</span></div><div class="spec-row"><span>04</span><strong>USB-C / 3.5 mm</strong><span>Connections</span></div><div class="spec-row"><span>05</span><strong>Fold-flat, travel ready</strong><span>Carry</span></div>
    </div>
    <div class="details-footer"><span>BUILT AROUND THE LISTENING, NOT THE LOUDNESS.</span><span>MONO® / CONCEPT OBJECT</span></div>
  </section>
  <section class="closing"><p class="eyebrow"><i></i> Your listening, considered</p><h2>Find your<br><em>quiet.</em></h2><button class="button button-light" data-add>Choose your MONO <span>↗</span></button><div class="closing-mark">M.</div></section>
  <footer><a class="wordmark" href="#top">mono<span>®</span></a><span>LOCAL CONCEPT STORE / NO PAYMENT IS PROCESSED</span><a href="#top" class="back-top">BACK TO TOP ↑</a></footer>
  <div class="sticky-buy" id="sticky-buy"><span>MONO® / LISTENING OBJECT 01 <b data-sticky-material>OBSIDIAN</b></span><strong data-sticky-price>$780</strong><button class="button button-dark" data-add>Add to bag <span>↗</span></button></div>
  <div class="drawer-backdrop" data-close-cart></div>
  <aside class="cart-drawer" aria-labelledby="cart-title" aria-modal="true" role="dialog" aria-hidden="true" inert>
    <div class="drawer-head"><div><p class="eyebrow"><i></i> YOUR SELECTION</p><h2 id="cart-title">The bag <span class="drawer-count">(0)</span></h2></div><button class="drawer-close" data-close-cart aria-label="Close bag">×</button></div>
    <div class="cart-content" id="cart-content"></div><div class="cart-footer" id="cart-footer"></div>
  </aside>
  <div class="toast" role="status" aria-live="polite"></div>
`;

let selected = 'obsidian';
let quantity = 0;
let removed = null;
let lastFocus = null;
let toastTimer;
const canvas = document.querySelector('#product-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Procedural product study: lathed earcups, raised annuli, padded rings, yokes and a swept headband.
let renderer, scene, camera, product, shellMat, trimMat, padMat, orbitActive = false;
const materials3d = {};
function buildHeadphone() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0.15, 0.18, 7.4);
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene.add(new THREE.HemisphereLight(0xf9f2e8, 0x312d2a, 2.05));
  const key = new THREE.DirectionalLight(0xfff7ea, 3.1); key.position.set(-3.6, 5.5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9c5cf, 1.5); fill.position.set(4.5, 1.2, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf0a17f, 2); rim.position.set(1, 3, -4); scene.add(rim);
  shellMat = new THREE.MeshPhysicalMaterial({color:0x272827, roughness:.28, metalness:.08, clearcoat:.32, clearcoatRoughness:.22});
  trimMat = new THREE.MeshStandardMaterial({color:0x8d8a82, roughness:.26, metalness:.72});
  padMat = new THREE.MeshStandardMaterial({color:0x171918, roughness:.9, metalness:0});
  materials3d.obsidian = [0x272827,0x8d8a82,0x171918]; materials3d.chalk = [0xd4d0c8,0x9e988d,0x363632]; materials3d.clay = [0x8f4a37,0xc49478,0x352723];
  product = new THREE.Group(); scene.add(product);
  const main = new THREE.Group(); product.add(main);
  const curveTube = (points, radius, mat, seg=100) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,seg,radius,12,false),mat); main.add(mesh); return mesh;
  };
  curveTube([[-1.18,-.1,0],[-1.2,.52,.02],[-.94,1.17,.04],[-.49,1.57,.05],[0,1.69,.05],[.49,1.57,.05],[.94,1.17,.04],[1.2,.52,.02],[1.18,-.1,0]], .105, shellMat);
  curveTube([[-.99,-.02,.015],[-1.02,.52,.08],[-.78,1.1,.1],[-.38,1.42,.12],[0,1.5,.12],[.38,1.42,.12],[.78,1.1,.1],[1.02,.52,.08],[.99,-.02,.015]], .052, padMat);
  for (const side of [-1,1]) {
    const cup = new THREE.Group(); cup.position.set(side*1.16,-.14,.03); cup.rotation.y=side*-.16; main.add(cup);
    const backing = new THREE.Mesh(new THREE.CylinderGeometry(.49,.53,.28,64,1,false),shellMat); backing.rotation.x=Math.PI/2; cup.add(backing);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(.465,.052,16,72),trimMat); outer.position.z=.18; cup.add(outer);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(.415,.435,.075,64,1,false),shellMat); face.rotation.x=Math.PI/2; face.position.z=.175; cup.add(face);
    const faceRing = new THREE.Mesh(new THREE.TorusGeometry(.335,.012,8,64),trimMat); faceRing.position.z=.222; cup.add(faceRing);
    const cushion = new THREE.Mesh(new THREE.TorusGeometry(.36,.085,24,64),padMat); cushion.position.z=.03; cup.add(cushion);
    for(let i=0;i<9;i++){const vent=new THREE.Mesh(new THREE.SphereGeometry(.012,8,6),trimMat); const a=(i/9)*Math.PI*2; vent.position.set(Math.cos(a)*.28,Math.sin(a)*.28,.225);cup.add(vent);}
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(.09,.5,.095),trimMat); yoke.position.set(side*-.02,.39,-.015); yoke.rotation.z=side*.12; cup.add(yoke);
    const slider = new THREE.Mesh(new THREE.BoxGeometry(.16,.19,.12),shellMat); slider.position.set(side*-.015,.64,-.01); cup.add(slider);
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(.043,20,12),trimMat); bolt.position.set(0,.42,.06); cup.add(bolt);
    for(let i=0;i<3;i++){const seam=new THREE.Mesh(new THREE.BoxGeometry(.018,.08,.12),trimMat);seam.position.set(side*.018,.56+i*.045,.008);cup.add(seam);}
  }
  // The soft shadow is a single translucent canvas-like plane, not a shadow map.
  const shadowCanvas=document.createElement('canvas'); shadowCanvas.width=256; shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'); const grad=ctx.createRadialGradient(128,64,4,128,64,62); grad.addColorStop(0,'rgba(36,31,26,.22)');grad.addColorStop(.55,'rgba(36,31,26,.09)');grad.addColorStop(1,'rgba(36,31,26,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,256,128);
  const tex=new THREE.CanvasTexture(shadowCanvas); const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.55),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));shadow.position.set(0,-1.29,-.7);main.add(shadow);
  product.scale.setScalar(.96);
  setFinish(selected);
}
function setFinish(key) {
  selected=key; const color=materials3d[key];
  if(shellMat){shellMat.color.setHex(color[0]);trimMat.color.setHex(color[1]);padMat.color.setHex(color[2]);}
  const info=materials[key];
  document.querySelectorAll('[data-material]').forEach(b=>{const on=b.dataset.material===key;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',String(on));});
  document.querySelector('[data-material-name]').textContent=info.name;
  document.querySelector('[data-material-finish]').textContent=info.finish;
  document.querySelector('[data-material-index]').textContent=String(Object.keys(materials).indexOf(key)+1).padStart(2,'0');
  document.querySelector('[data-price]').textContent=money(info.price);
  document.querySelector('[data-sticky-material]').textContent=info.name.toUpperCase();
  document.querySelector('[data-sticky-price]').textContent=money(info.price);
  const cap=document.querySelector('.art-kicker span:last-child'); if(cap)cap.textContent=`${info.name.toUpperCase()} / MATTE`;
  const visual=document.querySelector('.material-visual'); visual.dataset.finish=key;
  document.querySelector('.visual-word').textContent=String(Object.keys(materials).indexOf(key)+1).padStart(2,'0');
  if(document.querySelector('.cart-drawer').classList.contains('is-open'))renderCart();
}
function fitScene() {
  if(!renderer)return;
  const box=canvas.getBoundingClientRect(); if(!box.width||!box.height)return;
  renderer.setSize(box.width,box.height,false); camera.aspect=box.width/box.height;
  camera.position.z=box.width<600?8.65:7.4; camera.updateProjectionMatrix();
}
let pointerX=0,pointerY=0,orbitX=0,orbitY=0,raf=0,lastT=0;
function render(t=0){
  raf=requestAnimationFrame(render); if(document.hidden)return;
  const dt=Math.min((t-lastT)/1000,.05);lastT=t;
  if(product){
    const idle=(!reducedMotion&&!orbitActive)?Math.sin(t*.00035)*.045:0;
    const targetY=pointerX*.2+idle+(orbitActive?.24:0);
    const targetX=pointerY*.09;
    orbitY+=(targetY-orbitY)*Math.min(1,dt*3.3);orbitX+=(targetX-orbitX)*Math.min(1,dt*3.3);
    product.rotation.y=orbitY;product.rotation.x=orbitX;
    product.position.y=Math.sin(t*.0011)*.018;
    renderer.render(scene,camera);
  }
}
try { buildHeadphone(); fitScene(); new ResizeObserver(fitScene).observe(canvas.parentElement); requestAnimationFrame(render); }
catch(err){ console.error('3D product scene unavailable',err);document.querySelector('#loading').innerHTML='The form is loading in simplified view'; }
window.addEventListener('resize',fitScene);
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointerX=((e.clientX-r.left)/r.width-.5)*2;pointerY=((e.clientY-r.top)/r.height-.5)*2;});
canvas.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
setTimeout(()=>document.querySelector('#loading')?.classList.add('is-hidden'),650);

function announce(text){const toast=document.querySelector('.toast');toast.textContent=text;toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),2600);}
function addToBag(){quantity+=1;renderCart();updateBagCount();announce(`${materials[selected].name} added to your bag`);}
function updateBagCount(){document.querySelector('.bag-count').textContent=quantity;document.querySelector('.drawer-count').textContent=`(${quantity})`;}
function renderCart(){
  const content=document.querySelector('#cart-content'),footer=document.querySelector('#cart-footer');updateBagCount();
  if(!quantity){content.innerHTML=`<div class="cart-empty"><span class="empty-mark">M.</span><h3>Your bag is quiet.</h3><p>Your selected finish will appear here.</p><button class="text-link" data-close-cart>Keep exploring <span>↗</span></button></div>`;footer.innerHTML='<span>LOCAL CONCEPT STORE</span><span>NO PAYMENT IS PROCESSED</span>';return;}
  const info=materials[selected];content.innerHTML=`<div class="cart-item"><div class="cart-thumb" data-finish="${selected}"><span>MONO</span><i></i></div><div class="cart-item-info"><span class="micro-label">LISTENING OBJECT / 01</span><h3>MONO®</h3><p>${info.name} · ${info.finish}</p><button class="remove-item">Remove item</button></div><strong>${money(info.price)}</strong></div><div class="quantity-row"><span>Quantity</span><div class="quantity-control"><button data-qty="-1" aria-label="Decrease quantity">−</button><span>${quantity}</span><button data-qty="1" aria-label="Increase quantity">+</button></div></div><div class="cart-material"><span>Selected finish</span><div class="cart-swatches">${Object.entries(materials).map(([key,m])=>`<button data-cart-material="${key}" class="${selected===key?'is-selected':''}" aria-label="${m.name}" aria-pressed="${selected===key}"><i style="--swatch:${m.swatch}"></i></button>`).join('')}</div></div>`;
  footer.innerHTML=`<div class="subtotal"><span>Subtotal</span><strong>${money(info.price*quantity)}</strong></div><p>Shipping and taxes are not calculated in this concept.</p><button class="button button-dark local-checkout">Continue <span>↗</span></button><span>LOCAL CONCEPT STORE · NO PAYMENT IS PROCESSED</span>`;
}
function openCart(){lastFocus=document.activeElement;renderCart();const d=document.querySelector('.cart-drawer');d.inert=false;d.setAttribute('aria-hidden','false');d.classList.add('is-open');document.querySelector('.drawer-backdrop').classList.add('is-open');document.body.classList.add('cart-open');requestAnimationFrame(()=>document.querySelector('.drawer-close').focus());}
function closeCart(){const d=document.querySelector('.cart-drawer');d.classList.remove('is-open');document.querySelector('.drawer-backdrop').classList.remove('is-open');document.body.classList.remove('cart-open');d.setAttribute('aria-hidden','true');d.inert=true;if(lastFocus?.focus)lastFocus.focus();}
app.addEventListener('click',e=>{
  const mat=e.target.closest('[data-material]'); if(mat){setFinish(mat.dataset.material);return;}
  if(e.target.closest('[data-add]')){addToBag();if(e.target.closest('.sticky-buy')||e.target.closest('.closing'))openCart();return;}
  if(e.target.closest('[data-open-cart]')){openCart();return;}
  if(e.target.closest('[data-close-cart]')){closeCart();return;}
  if(e.target.closest('[data-reset]')){orbitActive=false;document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');pointerX=pointerY=orbitX=orbitY=0;announce('View reset');return;}
  if(e.target.closest('[data-orbit]')){orbitActive=!orbitActive;const b=document.querySelector('[data-orbit]');b.setAttribute('aria-pressed',String(orbitActive));b.innerHTML=orbitActive?'Pause orbit <span>Ⅱ</span>':'Orbit view <span>↗</span>';return;}
  const qty=e.target.closest('[data-qty]');if(qty){quantity=Math.max(1,quantity+Number(qty.dataset.qty));renderCart();return;}
  const cm=e.target.closest('[data-cart-material]');if(cm){setFinish(cm.dataset.cartMaterial);renderCart();return;}
  if(e.target.closest('.remove-item')){removed={selected,quantity};quantity=0;renderCart();const t=document.querySelector('.toast');t.innerHTML='MONO removed <button class="undo-remove">Undo</button>';t.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('is-visible'),5000);return;}
  if(e.target.closest('.undo-remove')){if(removed){selected=removed.selected;quantity=removed.quantity;setFinish(selected);renderCart();updateBagCount();removed=null;announce('MONO restored to your bag');}return;}
  if(e.target.closest('.local-checkout')){announce('This local concept does not process payment');return;}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.cart-drawer').classList.contains('is-open'))closeCart();if(e.key==='Tab'&&document.querySelector('.cart-drawer').classList.contains('is-open')){const d=document.querySelector('.cart-drawer');const f=[...d.querySelectorAll('button:not([disabled]),a[href]')].filter(x=>x.offsetParent!==null);if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}});
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');revealObserver.unobserve(e.target);}}),{threshold:.14});document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
const sticky=document.querySelector('#sticky-buy');const heroObserver=new IntersectionObserver(([e])=>sticky.classList.toggle('is-visible',!e.isIntersecting),{threshold:.2});heroObserver.observe(document.querySelector('.hero'));
const design=document.querySelector('.design-section');window.addEventListener('scroll',()=>{const r=design.getBoundingClientRect(),vh=innerHeight;const progress=Math.max(0,Math.min(1,(vh-r.top)/(r.height+vh)));design.style.setProperty('--scroll-progress',progress);document.querySelector('.visual-sweep').style.transform=`translateY(${(1-progress)*120-30}%)`;},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else if(!document.hidden&&!raf)requestAnimationFrame(render);});
renderCart();
