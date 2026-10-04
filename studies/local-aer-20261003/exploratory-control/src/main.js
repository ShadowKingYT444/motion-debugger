import './style.css';
import * as THREE from 'three';

const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const powerIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M7 5.5a8 8 0 1 0 10 0"/></svg>';
document.querySelector('#app').innerHTML = `
<header class="site-header"><a class="wordmark" href="#" aria-label="AER home">aer<span class="wordmark-dot">®</span></a><span class="nav-note">Objects for a softer everyday</span><button class="quiet-button details-trigger" data-open-details>Explore the details ${arrow}</button></header>
<main>
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-copy"><p class="eyebrow"><span></span>DESK FAN / CONCEPT 01</p><h1 id="hero-title">A little movement.<br>A different<br><em>atmosphere.</em></h1><p class="intro">A sculptural desk companion.<br>Made to move air. Designed to make space.</p>
  <div class="control-deck" aria-label="Fan controls"><div class="control-top"><span class="small-label">TAKE IT FOR A SPIN</span><span id="status" class="status"><i></i>Running</span></div><div class="control-row"><button id="power" class="power-button" aria-label="Fan power" aria-pressed="true">${powerIcon}</button><div class="speed-control" role="group" aria-label="Fan speed"><button data-speed="1" aria-pressed="true"><span>01</span>Low</button><button data-speed="2" aria-pressed="false"><span>02</span>Medium</button><button data-speed="3" aria-pressed="false"><span>03</span>High</button></div></div><p class="control-caption">Your pace. Your space.</p></div>
  </div>
  <div class="product-stage"><div class="stage-heading"><span>AER / GRAPHITE</span><span class="stage-index">01 — 03</span></div><div id="scene" role="img" aria-label="Interactive 3D model of AER: a circular graphite desk fan on a sculptural pedestal. Drag to orbit or use the view buttons." tabindex="0"><div id="scene-fallback" hidden><svg viewBox="0 0 240 260" aria-hidden="true"><ellipse cx="120" cy="241" rx="61" ry="11"/><path d="M110 146h20v92h-20z"/><circle cx="120" cy="93" r="80" fill="none" stroke="currentColor" stroke-width="9"/><circle cx="120" cy="93" r="65" fill="none" stroke="currentColor" stroke-width="2"/><path d="M120 93C160 30 185 63 177 86L120 93M120 93C57 80 72 41 95 43L120 93M120 93C141 164 100 165 84 146L120 93"/><circle cx="120" cy="93" r="16"/></svg><strong>AER, in profile</strong><p>3D rendering is unavailable on this device. Power and speed controls remain available.</p></div></div><div class="stage-bottom"><span class="orbit-hint">DRAG TO EXPLORE <span aria-hidden="true">↔</span></span><div class="view-controls" role="group" aria-label="Product view"><button id="orbit-left" aria-label="Rotate view left">←</button><button id="reset-view" aria-label="Reset product view">Reset view</button><button id="orbit-right" aria-label="Rotate view right">→</button></div></div><div class="telemetry" id="telemetry" aria-live="off" aria-busy="true"><span class="telemetry-icon" aria-hidden="true">⌁</span><span class="telemetry-title">Scene telemetry</span><span id="telemetry-value" class="telemetry-loading">Reading live scene…</span><span class="telemetry-tag">MODEL DATA</span></div></div>
</section>
<section class="manifesto" aria-label="Design philosophy"><div class="manifesto-heading"><p class="eyebrow">LESS, BUT CONSIDERED</p><h2>Small footprint.<br>Quiet presence.</h2></div><div class="feature"><span class="feature-index">01 / FORM</span><h3>Room to breathe</h3><p>A circular silhouette, a grounded base and just enough detail. An object that belongs on your desk.</p></div><div class="feature"><span class="feature-index">02 / FEEL</span><h3>Set your rhythm</h3><p>Three speeds and a single power control. Explore the form from every angle, at your own pace.</p></div><button class="text-link" data-open-details>Inside the design ${arrow}</button></section>
<footer><a href="#" class="footer-logo" aria-label="AER home">aer</a><span>Concept object. Real-time geometry.</span><span>Designed to take up less.</span></footer>
</main>
<dialog id="details" aria-labelledby="details-title"><div class="drawer-shell"><header class="drawer-header"><span class="eyebrow">OBJECT NOTES / 01</span><button id="close-details" aria-label="Close details">×</button></header><div class="drawer-content"><p class="drawer-kicker">AER / GRAPHITE</p><h2 id="details-title">Considered from<br>every angle.</h2><p class="drawer-intro">A compact fan concept built around an honest circular form. Every surface you see is generated in the browser.</p><div class="mini-fan" aria-hidden="true"><span></span></div><dl class="spec-list"><div><dt>Form</dt><dd>Circular head / pedestal base</dd></div><div><dt>Finish</dt><dd>Graphite body / satin alloy accents</dd></div><div><dt>Control</dt><dd>Power + three speed levels</dd></div><div><dt>Scene</dt><dd>Procedural WebGL geometry</dd></div><div><dt>Interaction</dt><dd>Drag, touch or arrow keys</dd></div></dl><p class="concept-note">This is an interactive design concept, not a product for sale. Scene telemetry reports the rendered model, not measurements from a physical fan.</p><button class="drawer-return" id="return-to-fan">Back to the object ${arrow}</button></div></div></dialog>`;

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { power: true, speed: 1, reducedMotion: reduced.matches, ready: false, failed: false, rpm: 0, angle: 0, orbit: { yaw: .32, pitch: .12 }, frameCount: 0 };
const targets = [0, 4.5, 7.5, 12];
const $ = s => document.querySelector(s);
let markClock = 0;
function mark(label) {
  dispatchEvent(new CustomEvent('motion:mark', { detail: { type: 'aer-state', label, sourceKey: 'aer.motor', state: { power: state.power, speed: state.speed, rpm: Number(state.rpm.toFixed(2)), angle: Number(state.angle.toFixed(4)), reducedMotion: state.reducedMotion, ready: state.ready } } }));
}
function sync() {
  $('#power').setAttribute('aria-pressed', String(state.power));
  document.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === state.speed)));
  $('#status').classList.toggle('off', !state.power);
  $('#status').innerHTML = `<i></i>${state.power ? 'Running' : 'Standby'}`;
  $('#scene').dataset.power = String(state.power); $('#scene').dataset.speed = String(state.speed);
  $('#scene').dataset.reducedMotion = String(state.reducedMotion);
  $('.control-caption').textContent = state.reducedMotion ? 'Reduced motion: blade animation paused.' : 'Your pace. Your space.';
  mark('controls-changed');
}
$('#power').addEventListener('click', () => {state.power = !state.power; sync();});
document.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => {state.speed = Number(button.dataset.speed); sync();}));
reduced.addEventListener('change', e => {state.reducedMotion = e.matches; sync();});

const dialog = $('#details'); let opener;
function openDetails(e) { opener = e.currentTarget; if (!dialog.open) dialog.showModal(); mark('details-open'); }
function closeDetails() { dialog.close(); opener?.focus(); mark('details-close'); }
document.querySelectorAll('[data-open-details]').forEach(b => b.addEventListener('click', openDetails));
$('#close-details').addEventListener('click', closeDetails); $('#return-to-fan').addEventListener('click', closeDetails);
dialog.addEventListener('click', e => { if (e.target === dialog) closeDetails(); });
dialog.addEventListener('cancel', () => {mark('details-escape');});

let currentYaw = .32, currentPitch = .12;
function adjustView(amount) {state.orbit.yaw = THREE.MathUtils.clamp(state.orbit.yaw + amount, -.85, .85); mark('view-retarget');}
$('#orbit-left').addEventListener('click', () => adjustView(-.24)); $('#orbit-right').addEventListener('click', () => adjustView(.24));
$('#reset-view').addEventListener('click', () => {state.orbit.yaw=.32; state.orbit.pitch=.12;mark('view-reset');});
$('#scene').addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home',' '].includes(e.key)) e.preventDefault();
  if (e.key==='ArrowLeft') adjustView(-.16); if (e.key==='ArrowRight') adjustView(.16);
  if (e.key==='ArrowUp') state.orbit.pitch = Math.min(.42, state.orbit.pitch+.08);
  if (e.key==='ArrowDown') state.orbit.pitch = Math.max(-.15, state.orbit.pitch-.08);
  if (e.key==='Home') {state.orbit.yaw=.32; state.orbit.pitch=.12;}
  if (e.key===' ') {state.power = !state.power;sync();}
});
let drag;
const stage = $('#scene');
stage.addEventListener('pointerdown', e => {if (!e.isPrimary || (e.pointerType==='mouse' && e.button!==0)) return; drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:state.orbit.yaw,pitch:state.orbit.pitch};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
stage.addEventListener('pointermove', e => {if (!drag || drag.id!==e.pointerId) return;state.orbit.yaw=THREE.MathUtils.clamp(drag.yaw+(e.clientX-drag.x)*.004,-.85,.85);state.orbit.pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.002,-.15,.42);});
function releaseDrag() {drag=null;stage.classList.remove('dragging');}
stage.addEventListener('pointerup', releaseDrag);stage.addEventListener('pointercancel',releaseDrag);stage.addEventListener('lostpointercapture',releaseDrag);

let renderer, observer, raf, disposed=false, motorVelocity=0, scene, camera, blades, fan, geometries=new Set(), materials=new Set(), lastTime=0, lastTelemetry=0, settleTimer;
function material(params) {const m=new THREE.MeshStandardMaterial(params);materials.add(m);return m;}
function mesh(geometry, mat, parent, x=0,y=0,z=0) {geometries.add(geometry);const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(radiusTop,radiusBottom,height, mat,parent,x,y,z) {return mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,64),mat,parent,x,y,z);}
function ring(radius,tube,mat,parent,z) {return mesh(new THREE.TorusGeometry(radius,tube,10,100),mat,parent,0,0,z);}
function initScene() {
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  renderer.domElement.setAttribute('aria-hidden','true');stage.append(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,40);
  const graphite=material({color:0x353a39,roughness:.57,metalness:.36});const rim=material({color:0x9daba8,roughness:.31,metalness:.72});const cream=material({color:0xc4cec8,roughness:.5,metalness:.23});const bronze=material({color:0xa8a391,roughness:.36,metalness:.66});const wire=material({color:0x69716d,roughness:.52,metalness:.65});
  scene.add(new THREE.HemisphereLight(0xfafbf4,0x5e685e,2.2));
  const key=new THREE.DirectionalLight(0xffffff,4.4);key.position.set(-3,8,4.5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.radius=4;key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-4;key.shadow.bias=-.0002;scene.add(key);
  const fill=new THREE.DirectionalLight(0xd1e4df,2.1);fill.position.set(4,2,-2);scene.add(fill);
  fan=new THREE.Group();fan.position.y=.12;scene.add(fan);
  const head=new THREE.Group();head.position.y=.38;fan.add(head);
  const housing=cylinder(1.42,1.38,.46,graphite,head,0,0,-.10);housing.rotation.x=Math.PI/2;
  ring(1.39,.077,rim,head,.19); ring(1.32,.024,graphite,head,.27);ring(1.37,.028,graphite,head,-.32);
  // A real rotor: three individually extruded curved blades, under the guard.
  blades=new THREE.Group();blades.position.z=.245;head.add(blades);
  const shape=new THREE.Shape();shape.moveTo(.08,.17);shape.bezierCurveTo(.26,.30,.72,.72,.57,1.13);shape.bezierCurveTo(.51,1.31,.20,1.30,.01,1.20);shape.bezierCurveTo(-.18,1.10,-.12,.50,.08,.17);
  const bladeGeometry=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1,curveSegments:20});
  for(let i=0;i<3;i++){const b=mesh(bladeGeometry,cream,blades);b.rotation.z=i*Math.PI*2/3;}
  // Sparse concentric wire guard retains a readable moving rotor.
  [ .39,.58,.77,.96,1.15,1.30 ].forEach(r=>ring(r,.009,wire,head,.39));
  const spokeGeo=new THREE.CylinderGeometry(.008,.008,2.62,8);
  for(let i=0;i<8;i++){const spoke=mesh(spokeGeo,wire,head,0,0,.39);spoke.rotation.z=i*Math.PI/8;}
  const hub=cylinder(.25,.25,.14,bronze,head,0,0,.405);hub.rotation.x=Math.PI/2;
  const logo=cylinder(.115,.115,.006,graphite,head,0,0,.48);logo.rotation.x=Math.PI/2;
  const stem=cylinder(.13,.17,1.56,graphite,fan,0,-1.24,-.12);stem.rotation.z=-.05;
  const collar=cylinder(.20,.20,.18,rim,fan,.036,-1.94,-.12);
  const base=cylinder(.73,.80,.12,graphite,fan,0,-2.055,-.12);base.scale.z=.74;
  const baseTrim=cylinder(.74,.77,.025,rim,fan,0,-2.12,-.12);baseTrim.scale.z=.74;
  const foot=cylinder(.70,.70,.02,graphite,fan,0,-2.14,-.12);foot.scale.z=.74;
  const ground=mesh(new THREE.PlaneGeometry(200,200),material({color:0xeae9e2,roughness:1}),scene,0,-2.04,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  function resize() {const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);const half=2.48;const aspect=rect.width/rect.height;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();}
  observer=new ResizeObserver(resize);observer.observe(stage);resize();
  raf=requestAnimationFrame(tick);
}
function tick(time) {
  if(disposed)return;
  const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
  if(!document.hidden){
    const target=state.power&&!state.reducedMotion?targets[state.speed]:0;
    motorVelocity+=(target-motorVelocity)*(1-Math.exp(-dt*3.2));if(state.reducedMotion)motorVelocity=0;
    state.angle=(state.angle+motorVelocity*dt)%(Math.PI*2);blades.rotation.z=state.angle;state.rpm=motorVelocity*60/(2*Math.PI);
    const damping=state.reducedMotion?1:1-Math.exp(-dt*10);
    currentYaw+=(state.orbit.yaw-currentYaw)*damping;currentPitch+=(state.orbit.pitch-currentPitch)*damping;
    camera.position.set(Math.sin(currentYaw)*8, .9+currentPitch*5, Math.cos(currentYaw)*8);camera.lookAt(0,-.25,0);renderer.render(scene,camera);state.frameCount++;
    if(!state.ready&&!settleTimer){settleTimer=setTimeout(()=>{state.ready=true;$('#telemetry').setAttribute('aria-busy','false');$('#telemetry').classList.add('ready');$('#telemetry-value').classList.remove('telemetry-loading');mark('scene-ready');},550);}
    if(time-lastTelemetry>250&&state.ready){$('#telemetry-value').textContent=state.reducedMotion?'Motion paused · 3D ready':`${Math.round(state.rpm)} rpm · ${renderer.info.render.triangles.toLocaleString()} triangles`;lastTelemetry=time;}
    if(time-markClock>250){mark('rotor-sample');markClock=time;}
  }
  raf=requestAnimationFrame(tick);
}
function fallback(error){state.failed=true;$('#scene-fallback').hidden=false;renderer?.domElement.remove();$('#telemetry').setAttribute('aria-busy','false');$('#telemetry-value').textContent='3D unavailable · controls ready';$('#telemetry').classList.add('ready');console.warn('AER WebGL fallback:',error?.message||error);mark('scene-fallback');}
try{initScene();}catch(error){fallback(error);}
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(settleTimer);observer?.disconnect();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer?.dispose();}
window.addEventListener('pagehide',dispose,{once:true});
window.__aer={getState:()=>({...state,orbit:{...state.orbit},renderer:renderer?{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}:null}),dispose};
sync();
