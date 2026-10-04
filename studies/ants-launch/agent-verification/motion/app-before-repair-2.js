import * as THREE from './assets/three.module.js';
import {createSpring} from './lib/spring.mjs';
import {createDrawer} from './lib/drawer.mjs';
const $=s=>document.querySelector(s);
const media=matchMedia('(prefers-reduced-motion: reduce)');
const state={mode:'ready',elapsed:0,stage:-1,paused:false,reduced:media.matches};
const stages=['Assignment','Parallel work','Coordinated handoff','A useful artifact'];
const captions=['A clear brief becomes a shared direction.','Three specialties. One goal. Work happens in parallel.','The pieces come together at the shared workbench.','A finished plan. Every contribution has a place.'];
const thresholds=[2.2,6,9,12];
let sceneController=null;
let drawerOpener=$('#details');
const drawer=createDrawer({dialog:$('#drawer'),openButton:$('#details'),closeButton:$('#close-drawer')});
$('#drawer').addEventListener('close',()=>drawerOpener.focus());
function showAbout(){drawerOpener=$('#details'); $('#about-content').hidden=false;$('#plan-content').hidden=true;$('#drawer').setAttribute('aria-labelledby','drawer-title'); }
$('#details').addEventListener('click',showAbout);
$('#read-plan').addEventListener('click',()=>{drawerOpener=$('#read-plan');$('#about-content').hidden=true;$('#plan-content').hidden=false;$('#drawer').setAttribute('aria-labelledby','plan-title');drawer.setOpen(true);$('#close-drawer').focus();});
function paint(){
 const running=state.mode==='running', complete=state.mode==='complete';
 $('#launch').disabled=running;$('#launch').innerHTML=(complete?'Replay example':state.mode==='cancelled'?'Launch again':'Launch example')+' <span>↗</span>';
 $('#pause').disabled=!running;$('#pause').textContent=state.paused?'Resume':'Pause';$('#pause').setAttribute('aria-pressed',String(state.paused));$('#cancel').disabled=!running;
 const words=state.mode==='ready'?'Ready when you are. The example takes about 12 seconds.':state.mode==='cancelled'?'Example cancelled. The colony is ready for a fresh start.':complete?'Complete. All four stages are finished. Your plan is ready.':state.paused?`Paused at ${stages[state.stage].toLowerCase()}. Resume when you’re ready.`:`${stages[state.stage]} — ${['sharing the brief.','three teams are preparing their contributions.','combining the work into one plan.','checking the finished artifact.'][state.stage]}`;
 $('#status').textContent=words;
 document.querySelectorAll('[data-step]').forEach((li,i)=>{const done=complete||(running&&i<state.stage);const active=running&&i===state.stage;li.dataset.state=done?'complete':active?'active':'waiting';li.querySelector('.step-status').textContent=done?'Done ✓':active?state.paused?'Paused':'Working':'Waiting';});
 $('#result').hidden=!complete;$('#scene-state').textContent=complete?'PLAN COMPLETE':running?(state.paused?'PAUSED':stages[state.stage].toUpperCase()):'AT THE READY';
 $('#scene-caption').textContent=state.stage<0?'A small colony. Ready for a shared purpose.':captions[state.stage];$('.scene-index').textContent=String(Math.max(1,state.stage+1)).padStart(2,'0')+' / 04';
 $('#fallback').dataset.stage=String(state.stage);sceneController?.setTask(state.stage,complete);document.body.dataset.taskState=state.mode;
}
function launch(){state.mode='running';state.elapsed=0;state.stage=0;state.paused=false;paint();}
$('#launch').addEventListener('click',launch);
$('#pause').addEventListener('click',()=>{state.paused=!state.paused;paint();});
$('#cancel').addEventListener('click',()=>{state.mode='cancelled';state.stage=-1;state.elapsed=0;state.paused=false;paint();});
media.addEventListener('change',()=>{state.reduced=media.matches;sceneController?.setReduced(state.reduced);});
function createWorkshop(){
 const canvas=$('#colony');const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xf4f0e8,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
 const scene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,70);camera.position.set(8,12,11);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xfff9e7,0x564432,1.5));
 const key=new THREE.DirectionalLight(0xffeed6,2.8);key.position.set(-5,12,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:35});key.shadow.bias=-.0004;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
 const rim=new THREE.DirectionalLight(0xffffff,1.8);rim.position.set(8,5,-9);scene.add(rim);
 const mats={body:new THREE.MeshPhysicalMaterial({color:0x292b26,roughness:.27,metalness:.4,clearcoat:.45,clearcoatRoughness:.3}),leg:new THREE.MeshStandardMaterial({color:0x36372f,roughness:.35,metalness:.32}),red:new THREE.MeshStandardMaterial({color:0xbd442c,roughness:.65}),edge:new THREE.MeshStandardMaterial({color:0x943923,roughness:.6}),paper:new THREE.MeshStandardMaterial({color:0xf8eddb,roughness:.86}),brass:new THREE.MeshStandardMaterial({color:0xd6ae6d,roughness:.36,metalness:.6}),eye:new THREE.MeshStandardMaterial({color:0x6f6551,roughness:.12,metalness:.6}),path:new THREE.MeshStandardMaterial({color:0xe0704d,roughness:.78})};
 const sphere=new THREE.SphereGeometry(1,24,16),cylinder=new THREE.CylinderGeometry(1,1,1,8),box=new THREE.BoxGeometry(1,1,1);const materials=new Set(Object.values(mats));const geometries=new Set([sphere,cylinder,box]);
 function mesh(g,m,parent=scene){const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function ellipsoid(parent,x,y,z,sx,sy,sz,m){const o=mesh(sphere,m,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function cyl(parent,x,y,z,r,h,m,segments=96){const g=new THREE.CylinderGeometry(r,r,h,segments);geometries.add(g);const o=mesh(g,m,parent);o.position.set(x,y,z);return o;}
 const clayCanvas=document.createElement('canvas');clayCanvas.width=clayCanvas.height=256;const clay=clayCanvas.getContext('2d');const pixels=clay.createImageData(256,256);let seed=873;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=128+((seed>>>24)-128)*.3;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}clay.putImageData(pixels,0,0);const clayTexture=new THREE.CanvasTexture(clayCanvas);clayTexture.wrapS=clayTexture.wrapT=THREE.RepeatWrapping;clayTexture.repeat.set(5,5);mats.red.bumpMap=clayTexture;mats.red.bumpScale=.035;mats.red.roughness=.83;
 const ground=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.15}));geometries.add(ground.geometry);materials.add(ground.material);ground.rotation.x=-Math.PI/2;ground.position.y=-.49;ground.castShadow=false;
 cyl(scene,0,-.28,0,5.65,.4,mats.edge);cyl(scene,0,-.07,0,5.7,.16,mats.red);
 const rings=[];for(const r of [5.48,5.34,2.0]){const g=new THREE.TorusGeometry(r,.018,6,128);geometries.add(g);const ring=mesh(g,mats.path);ring.rotation.x=Math.PI/2;ring.position.y=.018;rings.push(ring);}
 function label(text,color='#e8cdb2',size=15){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font=`${size*3}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});materials.add(mat);const g=new THREE.PlaneGeometry(2,.5);geometries.add(g);const m=mesh(g,mat);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;}
 const stationCoords=[[-3.1,-1.55],[2.9,-1.65],[.35,3.5]];
 ['MATERIALS','OUTREACH','SCHEDULE'].forEach((name,i)=>{const [x,z]=stationCoords[i];cyl(scene,x,.035,z,1.1,.06,mats.edge);const l=label(name);l.position.set(x,.072,z+.65);const small=cyl(scene,x,.09,z, .37,.055,mats.paper);for(let j=0;j<3;j++){const o=mesh(box,mats.paper);o.scale.set(.12,.055,.24);o.position.set(x+(j-1)*.21,.16,z-.12);}const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,.025,z),new THREE.Vector3(x*.55,.025,z*.2),new THREE.Vector3(0,.025,0));const g=new THREE.TubeGeometry(curve,24,.022,5,false);geometries.add(g);mesh(g,mats.path);});
 const center=cyl(scene,0,.04,0,1.65,.09,mats.edge);const cl=label('THE SHARED WORKBENCH');cl.position.set(0,.095,1.35);
 function pageTexture(){const c=document.createElement('canvas');c.width=512;c.height=700;const ctx=c.getContext('2d');ctx.fillStyle='#f7ecdb';ctx.fillRect(0,0,512,700);ctx.fillStyle='#ba432a';ctx.font='22px Arial';ctx.fillText('THE COLONY / 01',46,65);ctx.fillStyle='#302f28';ctx.font='48px Georgia';ctx.fillText('A Saturday',46,155);ctx.fillText('repair café.',46,210);ctx.font='17px Arial';ctx.fillText('TWENTY NEIGHBORS. ONE SHARED PLAN.',46,260);for(let i=0;i<4;i++){ctx.fillStyle='#c7462b';ctx.fillText('0'+(i+1),46,330+i*83);ctx.fillStyle='#888075';ctx.fillRect(90,317+i*83,350,3);ctx.fillRect(90,331+i*83,290,3);ctx.fillRect(90,345+i*83,320,3);}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
 const paperStack=new THREE.Group();scene.add(paperStack);paperStack.position.set(0,.13,0);paperStack.rotation.y=-.2;
 for(let i=0;i<3;i++){const p=mesh(box,mats.paper,paperStack);p.scale.set(1.35,.025,1.8);p.position.set(i*.025,i*.035,i*.03);p.rotation.y=i*.03;}
 const tex=pageTexture();const pm=new THREE.MeshStandardMaterial({map:tex,roughness:.9});materials.add(pm);const pg=new THREE.PlaneGeometry(1.35,1.8);geometries.add(pg);const written=mesh(pg,pm,paperStack);written.rotation.x=-Math.PI/2;written.position.y=.09;
 const seal=cyl(paperStack,.5,.14,.6,.13,.05,mats.brass,24);
 const ants=[];
 const base=[[-3.65,1.15],[-4.1,-.5],[-2.2,-3.6],[0,-4.25],[2.6,-3.65],[4,0],[3.5,2.1],[1.8,4],[-1.6,3.9],[-2.2,1.7]];
 const v1=new THREE.Vector3(),v2=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0);
 function segment(parent,r){const o=mesh(cylinder,mats.leg,parent);o.castShadow=false;o.scale.set(r,1,r);return o;}
 function connect(o,a,b,r){v1.set(...a);v2.set(...b).sub(v1);o.position.copy(v1).addScaledVector(v2,.5);o.scale.set(r,v2.length(),r);o.quaternion.setFromUnitVectors(axis,v2.normalize());}
 for(let i=0;i<10;i++){
  const ant=new THREE.Group();scene.add(ant);ant.scale.setScalar(i===0?1.02:.77+ (i%3)*.045);
  const body=new THREE.Group();ant.add(body);
  ellipsoid(body,-.59,.56,0,.52,.39,.34,mats.body);ellipsoid(body,-.08,.48,0,.15,.18,.15,mats.body);ellipsoid(body,.18,.47,0,.25,.27,.25,mats.body);ellipsoid(body,.64,.51,0,.3,.29,.27,mats.body);
  for(const side of [-1,1]){ellipsoid(body,.76,.6,side*.22,.067,.075,.036,mats.eye);ellipsoid(body,.95,.43,side*.08,.12,.04,.055,mats.leg);}
  // Narrow brass segment lines follow the abdomen instead of floating around it.
  for(let j=0;j<2;j++){const g=new THREE.TorusGeometry(.33-j*.055,.008,5,36);geometries.add(g);const band=mesh(g,mats.brass,body);band.rotation.y=Math.PI/2;band.position.set(-.48-j*.23,.56,0);band.scale.y=1.1;}
  const antenna=[];for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(.76,.72,side*.12);body.add(pivot);const a=segment(pivot,.019),b=segment(pivot,.016);connect(a,[0,0,0],[.2,.21,side*.16],.019);connect(b,[.2,.21,side*.16],[.46,.17,side*.25],.016);antenna.push(pivot);}
  const legs=[];for(let pair=0;pair<3;pair++)for(const side of [-1,1]){legs.push({pair,side,upper:segment(ant,.033),lower:segment(ant,.025),foot:segment(ant,.017)});}
  const token=mesh(box,mats.paper,ant);token.scale.set(.27,.07,.37);token.position.set(1.12,.37,0);token.visible=false;
  const [x,z]=base[i];ant.position.set(x,0,z);const sx=createSpring({value:x,frequency:1.05,reducedMotion:state.reduced}),sz=createSpring({value:z,frequency:1.05,reducedMotion:state.reduced});const yaw=createSpring({value:-Math.atan2(-z,-x),frequency:2,reducedMotion:state.reduced});ant.rotation.y=yaw.state.value;
  ants.push({ant,body,legs,antenna,token,sx,sz,yaw,phase:i*1.73,lastX:x,lastZ:z});
 }
 let task=-1,complete=false,clock=0,scrollTarget=0;const zoom=createSpring({value:0,frequency:1.4,reducedMotion:state.reduced});let width=1,height=1;
 function targetAnts(){ants.forEach((a,i)=>{let [x,z]=base[i];if(task===0){const angle=i/10*Math.PI*2;x=Math.cos(angle)*2.6;z=Math.sin(angle)*2.6;}else if(task===1){const [cx,cz]=stationCoords[i%3];const angle=Math.floor(i/3)*2.1+(i%3);x=cx+Math.cos(angle)*1.25;z=cz+Math.sin(angle)*1.1;}else if(task>=2){const angle=i/10*Math.PI*2+.2;x=Math.cos(angle)*(complete?2.25:2.05);z=Math.sin(angle)*(complete?2.25:2.05);}a.sx.retarget(x);a.sz.retarget(z);a.token.visible=task===2;});}
 function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;renderer.setSize(width,height,false);projection();}
 function projection(){const narrow=innerWidth<700;const half=narrow?5.3:7.0-zoom.state.value*1.1;const aspect=width/height;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 let visible=true;const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(canvas);
 const pointer={x:0,y:0};const px=createSpring({frequency:1}),py=createSpring({frequency:1});const onPointer=e=>{const r=canvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)/r.width-.5;pointer.y=(e.clientY-r.top)/r.height-.5;px.retarget(pointer.x*.35);py.retarget(pointer.y*.2);};canvas.addEventListener('pointermove',onPointer);const onLeave=()=>{px.retarget(0);py.retarget(0);};canvas.addEventListener('pointerleave',onLeave);
 function draw(dt){if(!visible)return;const frozen=state.paused;const active=state.mode==='running'&&!frozen;const movement=!state.reduced&&!frozen; if(movement)clock+=dt;
  if(!frozen){zoom.retarget(state.reduced?0:scrollTarget);zoom.advance(dt);if(!state.reduced){px.advance(dt);py.advance(dt);}}
  camera.position.set(8+(state.reduced?0:px.state.value),12-zoom.state.value*1.5,11+(state.reduced?0:py.state.value));camera.lookAt(0,.1,-zoom.state.value*.25);projection();
  ants.forEach((a,i)=>{const oldX=a.ant.position.x,oldZ=a.ant.position.z;if(!frozen){a.sx.advance(dt);a.sz.advance(dt);}a.ant.position.set(a.sx.state.value,0,a.sz.state.value);const dx=a.ant.position.x-oldX,dz=a.ant.position.z-oldZ;const speed=dt?Math.hypot(dx,dz)/dt:0;
   if(!frozen){let angle=speed>.015?-Math.atan2(dz,dx):-Math.atan2(-a.ant.position.z,-a.ant.position.x);while(angle-a.yaw.state.value>Math.PI)angle-=Math.PI*2;while(angle-a.yaw.state.value< -Math.PI)angle+=Math.PI*2;a.yaw.retarget(angle);a.yaw.advance(dt);}a.ant.rotation.y=a.yaw.state.value;
   const walk=movement?Math.min(1,speed*2):0;for(const leg of a.legs){const {pair,side}=leg;const phase=clock*10+a.phase+pair*Math.PI+(side>0?Math.PI:0);const stride=Math.sin(phase)*.17*walk,lift=Math.max(0,Math.cos(phase))*.13*walk;const hip=[.35-pair*.24,.43,side*.16],knee=[.58-pair*.55+stride*.4,.31,side*.55],foot=[.7-pair*.68+stride,.025+lift,side*.86];connect(leg.upper,hip,knee,.033);connect(leg.lower,knee,foot,.025);connect(leg.foot,foot,[foot[0]+.12,.02,foot[2]+side*.06],.017);}
   a.body.position.y=movement?Math.sin(clock*20+a.phase)*.012*walk:0;a.antenna.forEach((p,j)=>{p.rotation.y=movement&&active?Math.sin(clock*2+a.phase+j)*.12:0;});
  });
  paperStack.scale.setScalar(task===3||complete?1:task>=0?.72:.78);paperStack.rotation.y=task===3?-.08:-.2;seal.visible=complete;written.visible=task>=3||complete;
  renderer.render(scene,camera);
 }
 return {draw,setTask(s,c){task=s;complete=c;targetAnts();},setScroll(p){scrollTarget=p;},setReduced(r){zoom.setReducedMotion(r);ants.forEach(a=>[a.sx,a.sz,a.yaw].forEach(s=>s.setReducedMotion(r)));},dispose(){observer.disconnect();intersection.disconnect();canvas.removeEventListener('pointermove',onPointer);canvas.removeEventListener('pointerleave',onLeave);for(const a of ants){a.sx.dispose();a.sz.dispose();a.yaw.dispose();}zoom.dispose();px.dispose();py.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());tex.dispose();clayTexture.dispose();scene.traverse(o=>o.material?.map?.dispose());renderer.dispose();}};
}
try{sceneController=createWorkshop();}catch(error){console.warn('3D unavailable; using accessible task view.',error.message);$('#colony').hidden=true;$('#fallback').hidden=false;document.body.dataset.renderer='fallback';}
function scroll(){const r=$('#story').getBoundingClientRect();sceneController?.setScroll(Math.max(0,Math.min(1,-r.top/Math.max(1,r.height-innerHeight))));}
addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll);scroll();paint();
let last=null,frame;
function tick(t){const dt=last===null?0:Math.min(.5,(t-last)/1000);last=t;if(!document.hidden){if(state.mode==='running'&&!state.paused){state.elapsed+=dt;const stage=thresholds.findIndex(end=>state.elapsed<end);if(stage===-1){state.mode='complete';state.stage=3;paint();}else if(stage!==state.stage){state.stage=stage;paint();}}sceneController?.draw(Math.min(.15,dt));}frame=requestAnimationFrame(tick);}
frame=requestAnimationFrame(tick);
document.addEventListener('visibilitychange',()=>{last=null;});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);sceneController?.dispose();drawer.dispose();});
// Read-only diagnostics. Functional tests still use the visible controls and real timers.
window.antsDebug={get state(){return {...state}},get renderer(){return document.body.dataset.renderer||'webgl'}};
