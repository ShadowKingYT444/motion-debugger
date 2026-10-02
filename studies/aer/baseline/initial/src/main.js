import * as THREE from 'three';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#fan-canvas');
const stage = $('#stage');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const state = { power: true, speed: 1, finish: 'oxide', reduced: reducedQuery.matches };
const finishColors = { oxide: 0xb96043, chalk: 0xe2dfd3, graphite: 0x454c46 };
const finishNames = { oxide: 'Oxide', chalk: 'Chalk', graphite: 'Graphite' };
const speedNames = ['Soft', 'Steady', 'Fresh'];
const speeds = [0, 5.3, 8.7, 13.2];
const orbit = { yaw: -0.34, pitch: 0, targetYaw: -0.34, targetPitch: 0 };
let renderer, scene, camera, object, rotor, frameRequest, lastTime;
let velocity = 0, angle = 0, revealed = false, frameCount = 0, loadStart = performance.now();
const bodyMaterials = [];
const dialog = $('#details-drawer');
let drawerTrigger = null;

function syncControls(announce = true) {
  $('#power-toggle').setAttribute('aria-pressed', String(state.power));
  $('#power-toggle').setAttribute('aria-label', `Turn fan ${state.power ? 'off' : 'on'}`);
  $('#power-status').textContent = state.power ? `${speedNames[state.speed - 1]} air. Find your rhythm.` : 'Off. A moment of stillness.';
  document.querySelectorAll('[data-speed]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === state.speed)));
  document.querySelectorAll('[data-finish]').forEach((button) => {
    const selected = button.dataset.finish === state.finish;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('selected', selected);
  });
  $('#finish-name').textContent = finishNames[state.finish];
  $('#drawer-finish').textContent = `${finishNames[state.finish]} · matte`;
  $('.stage-label span').textContent = `01 — ${finishNames[state.finish].toUpperCase()}`;
  $('#motion-note').hidden = !state.reduced;
  if (announce) $('#control-announcement').textContent = `Fan ${state.power ? 'on' : 'off'}, ${speedNames[state.speed - 1]} speed. ${finishNames[state.finish]} finish.${state.reduced ? ' Reduced motion: blades remain still.' : ''}`;
}
$('#power-toggle').addEventListener('click', () => { state.power = !state.power; syncControls(); });
document.querySelectorAll('[data-speed]').forEach((button) => button.addEventListener('click', () => { state.speed = Number(button.dataset.speed); syncControls(); }));
document.querySelectorAll('[data-finish]').forEach((button) => button.addEventListener('click', () => {
  state.finish = button.dataset.finish;
  bodyMaterials.forEach((material) => material.color.setHex(finishColors[state.finish]));
  syncControls();
}));
reducedQuery.addEventListener('change', () => {
  state.reduced = reducedQuery.matches;
  if (state.reduced) { velocity = 0; orbit.yaw = orbit.targetYaw; orbit.pitch = orbit.targetPitch; }
  syncControls();
});
syncControls(false);

function openDetails(event) {
  drawerTrigger = event.currentTarget;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  $('#close-details').focus();
}
['#header-details', '#open-details', '#footer-details'].forEach((selector) => $(selector).addEventListener('click', openDetails));
function closeDetails() { dialog.close(); }
$('#close-details').addEventListener('click', closeDetails);
$('#return-object').addEventListener('click', closeDetails);
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDetails();
});
dialog.addEventListener('close', () => { document.body.style.overflow = ''; drawerTrigger?.focus(); });

function material(color, roughness = 0.58, metalness = 0.05) { return new THREE.MeshStandardMaterial({ color, roughness, metalness }); }
function mesh(geometry, surface, parent, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, surface);
  item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
}
function cylinder(radiusTop, radiusBottom, height, surface, parent, x, y, z, axis = 'y') {
  const item = mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 64), surface, parent, x, y, z);
  if (axis === 'z') item.rotation.x = Math.PI / 2;
  return item;
}
function tube(points, radius, surface, parent) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), surface, parent);
}
function ring(radius, thickness, surface, parent, z = 0) { return mesh(new THREE.TorusGeometry(radius, thickness, 10, 128), surface, parent, 0, 0, z); }

function buildFan() {
  object = new THREE.Group(); scene.add(object);
  const body = material(finishColors[state.finish], 0.68, 0.03);
  const rim = material(finishColors[state.finish], 0.48, 0.08);
  bodyMaterials.push(body, rim);
  const dark = material(0x34382e, 0.72, 0.06);
  const bladeMat = material(0xd4cdbb, 0.44, 0.06);
  const grilleMat = material(0x797668, 0.5, 0.45);
  const rubber = material(0x343a31, 0.95, 0);
  const base = cylinder(0.6, 0.62, 0.115, body, object, 0, 0.14, 0);
  base.scale.z = 0.88;
  const baseLip = cylinder(0.595, 0.61, 0.036, rim, object, 0, 0.195, 0);
  baseLip.scale.z = 0.88;
  const pad = cylinder(0.535, 0.55, 0.028, rubber, object, 0, 0.071, 0);
  pad.scale.z = 0.86;
  // The rearward stem keeps the center of mass over the compact foot.
  tube([[0, .21, .12], [0, .42, .24], [0, .8, .3], [0, 1.22, .18], [0, 1.42, .08]], .115, body, object);
  cylinder(.12, .12, .41, rim, object, 0, 1.53, .015, 'z');
  cylinder(.065, .065, .03, dark, object, -.14, 1.49, .025, 'z');
  const head = new THREE.Group(); head.position.set(0, 1.76, 0); head.rotation.x = -.075; object.add(head);
  // A continuous lathed enclosure, rather than a flat disk, gives a sculpted edge.
  const profile = [[.89,-.30],[.98,-.28],[1.035,-.19],[1.055,-.06],[1.05,.10],[1.025,.20],[.98,.24],[.93,.23],[.915,.16],[.927,.08],[.925,-.12],[.89,-.20]];
  const housing = mesh(new THREE.LatheGeometry(profile.map(([r,z]) => new THREE.Vector2(r,z)), 128), body, head);
  housing.rotation.x = Math.PI / 2;
  ring(1.008, .025, rim, head, .195);
  ring(.931, .015, dark, head, .16);
  // Back motor and vents remain visible when the object is orbited.
  cylinder(.32,.39,.3,body,head,0,0,-.32,'z');
  cylinder(.22,.22,.02,dark,head,0,0,-.485,'z');
  for (let i = 0; i < 36; i++) {
    const theta = i * Math.PI * 2 / 36;
    tube([[Math.cos(theta)*.28,Math.sin(theta)*.28,-.39],[Math.cos(theta)*.58,Math.sin(theta)*.58,-.29],[Math.cos(theta)*.91,Math.sin(theta)*.91,-.23]], .008, grilleMat, head);
  }
  rotor = new THREE.Group(); rotor.position.z = -.045; head.add(rotor);
  // Five swept, curved blades built from an original Bezier outline.
  const blade = new THREE.Shape();
  blade.moveTo(.13,-.08);
  blade.bezierCurveTo(.30,-.13,.67,-.38,.84,-.27);
  blade.bezierCurveTo(1.01,-.13,.88,.17,.7,.27);
  blade.bezierCurveTo(.53,.36,.29,.18,.15,.09);
  blade.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(blade, {depth:.028, bevelEnabled:true, bevelSegments:3, steps:1, bevelSize:.014, bevelThickness:.009, curveSegments:32});
  for (let i=0;i<5;i++) {
    const leaf = mesh(bladeGeometry,bladeMat,rotor); leaf.rotation.z = i*Math.PI*2/5;
  }
  cylinder(.18,.21,.105,bladeMat,rotor,0,0,.04,'z');
  // A fine, open front guard allows the blade motion to be read clearly.
  ring(.925,.012,grilleMat,head,.222);
  ring(.65,.0065,grilleMat,head,.275);
  ring(.37,.0065,grilleMat,head,.31);
  for(let i=0;i<24;i++) {
    const theta=i*Math.PI*2/24;
    const point=(r,z,offset=0)=>[Math.cos(theta+offset)*r,Math.sin(theta+offset)*r,z];
    tube([point(.12,.325),point(.40,.312,.025),point(.68,.28,.017),point(.925,.222)],.007,grilleMat,head);
  }
  cylinder(.121,.121,.055,rim,head,0,0,.323,'z');
  cylinder(.057,.057,.004,body,head,0,0,.353,'z');
  // Discreet physical power control and USB-C recess on the base.
  const button = cylinder(.053,.053,.019,dark,object,.26,.214,.19); button.scale.z=.95;
  const usb = mesh(new THREE.BoxGeometry(.12,.037,.013),dark,object,0,.142,-.548);
  usb.rotation.x=.04;
  object.rotation.y=orbit.yaw;
}

function resize() {
  if (!renderer) return;
  const { width, height } = stage.getBoundingClientRect();
  if(!width || !height) return;
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  camera.position.set(0,2.85,window.innerWidth <= 700 ? 7.3 : 6.95);
  camera.lookAt(0,1.42,0);
  camera.updateProjectionMatrix();
}
function reveal() {
  revealed=true;
  $('#loading-reveal').classList.add('ready');
  stage.dataset.ready='true';
}
function renderFrame(time) {
  const dt=Math.min(lastTime === undefined ? 1/60 : (time-lastTime)/1000,.05); lastTime=time;
  const goal=state.power && !state.reduced ? speeds[state.speed] : 0;
  const damping=1-Math.exp(-dt*(state.power ? 3.4 : 2.5));
  velocity+=(goal-velocity)*damping;
  if(state.reduced || Math.abs(velocity)<.002) velocity=0;
  angle=(angle-velocity*dt)%(Math.PI*2);
  rotor.rotation.z=angle;
  const orbitEase=state.reduced ? 1 : 1-Math.exp(-dt*12);
  orbit.yaw+=(orbit.targetYaw-orbit.yaw)*orbitEase;
  orbit.pitch+=(orbit.targetPitch-orbit.pitch)*orbitEase;
  object.rotation.y=orbit.yaw; object.rotation.x=orbit.pitch;
  renderer.render(scene,camera);
  frameCount++;
  if(!revealed) {
    const elapsed=time-loadStart;
    $('#loading-data').textContent=`${renderer.info.render.triangles.toLocaleString()} faces · ${Math.round(canvas.width)} × ${Math.round(canvas.height)} render`;
    if(frameCount>=8 && elapsed>=600) reveal();
  }
  // Read-only data makes actual state and render performance inspectable.
  canvas.dataset.power=String(state.power); canvas.dataset.speed=String(state.speed); canvas.dataset.velocity=velocity.toFixed(3); canvas.dataset.angle=angle.toFixed(4); canvas.dataset.reducedMotion=String(state.reduced);
  frameRequest=requestAnimationFrame(renderFrame);
}
function init3D() {
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setClearColor(0x000000,0);
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(33,1,.1,50);
    scene.add(new THREE.HemisphereLight(0xfff9e7,0x898d78,2.6));
    const key=new THREE.DirectionalLight(0xfff4de,4.5);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.normalBias=.035;key.shadow.bias=-.0002;scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(4,3,-3);scene.add(fill);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x555d3d,opacity:.18}));ground.rotation.x=-Math.PI/2;ground.position.y=.045;ground.receiveShadow=true;scene.add(ground);
    buildFan();resize();
    new ResizeObserver(resize).observe(stage);
    requestAnimationFrame(renderFrame);
  } catch(error) {
    console.error('AER 3D initialization failed:',error);
    $('#canvas-error').hidden=false; $('#loading-reveal').classList.add('ready');
    canvas.removeAttribute('tabindex');canvas.setAttribute('aria-label','3D preview unavailable');
    $('#orbit-hint').textContent='3D VIEW UNAVAILABLE';
  }
}
canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();cancelAnimationFrame(frameRequest);$('#canvas-error').hidden=false;$('#canvas-error p').textContent='The 3D context was interrupted. Reload the page to restore the view.';});

let dragging = null;
function resetOrbit(){orbit.targetYaw=-.34;orbit.targetPitch=0;}
$('#reset-view').addEventListener('click',resetOrbit);
canvas.addEventListener('pointerdown',(event)=>{
  if(event.pointerType==='mouse' && event.button!==0) return;
  if(dragging) return;
  dragging={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:orbit.targetYaw,pitch:orbit.targetPitch};
  canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
});
canvas.addEventListener('pointermove',(event)=>{
  if(!dragging || event.pointerId!==dragging.id) return;
  const factor=window.innerWidth<=700 ? .006 : .005;
  orbit.targetYaw=THREE.MathUtils.clamp(dragging.yaw+(event.clientX-dragging.x)*factor,-1.05,.8);
  orbit.targetPitch=THREE.MathUtils.clamp(dragging.pitch+(event.clientY-dragging.y)*.0035,-.24,.25);
});
function endDrag(event){if(dragging && event.pointerId===dragging.id) {dragging=null;if(canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);}}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',()=>{dragging=null;});
canvas.addEventListener('keydown',(event)=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) event.preventDefault();
  if(event.key==='Home') resetOrbit();
  if(event.key==='ArrowLeft') orbit.targetYaw=THREE.MathUtils.clamp(orbit.targetYaw-.1,-1.05,.8);
  if(event.key==='ArrowRight') orbit.targetYaw=THREE.MathUtils.clamp(orbit.targetYaw+.1,-1.05,.8);
  if(event.key==='ArrowUp') orbit.targetPitch=THREE.MathUtils.clamp(orbit.targetPitch-.06,-.24,.25);
  if(event.key==='ArrowDown') orbit.targetPitch=THREE.MathUtils.clamp(orbit.targetPitch+.06,-.24,.25);
});
init3D();
