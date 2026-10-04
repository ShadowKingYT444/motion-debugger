import * as THREE from './assets/vendor/three.module.js';
const $=id=>document.getElementById(id);
const TAU=Math.PI*2;
const palettes={acid:{name:'Acid',colors:['#c7f959','#a38cf3','#efefce'],caption:'a bright kind of bold'},signal:{name:'Signal',colors:['#ff735d','#748aff','#ffd7b5'],caption:'warmth with a wild side'},glacier:{name:'Glacier',colors:['#67e4ed','#ad9cf5','#e3f5ef'],caption:'cool, clear, collected'}};
const styles={pulse:{number:'01',label:'PULSE / RHYTHMIC & ORGANIC',description:'Rhythmic. Organic. A breath of fresh energy.'},weave:{number:'02',label:'WEAVE / FLUID & CONNECTED',description:'Fluid. Connected. Better together.'},orbit:{number:'03',label:'ORBIT / SPATIAL & SCULPTURAL',description:'Spatial. Sculptural. A little otherworldly.'}};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={name:'LOOP',style:'orbit',palette:'acid',intensity:65,phase:0.12,playing:!reduced.matches};
let animatedIntensity=65,visualColors=palettes.acid.colors.map(c=>new THREE.Color(c));
let scrubbing=false,wasPlaying=false,lastFrame=performance.now(),lastSwitch=0,previousStyle=null,exportSnapshot=null,closingTimer,toastTimer;
let renderer,scene,camera,sculpture,rings=[],beads=[],core,webgl=true;
const artElements={pulse:$('pulse-art'),weave:$('weave-art'),orbit:$('orbit-canvas')};
$('orbit-canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();webgl=false;renderer=null;$('orbit-canvas').hidden=true;$('orbit-canvas').classList.remove('active');$('fallback-canvas').hidden=false;artElements.orbit=$('fallback-canvas');artElements.orbit.classList.toggle('active',state.style==='orbit');$('render-status').textContent='VECTOR PREVIEW';resize();});
const exportGeometry=new THREE.TorusGeometry(1.38,.235,10,52),coreExportGeometry=new THREE.SphereGeometry(.43,20,12);
try{
 renderer=new THREE.WebGLRenderer({canvas:$('orbit-canvas'),antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
}catch(error){webgl=false;$('orbit-canvas').hidden=true;$('fallback-canvas').hidden=false;artElements.orbit=$('fallback-canvas');$('render-status').textContent='VECTOR PREVIEW';}
scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(4.2,3.5,7.8);camera.lookAt(0,.15,0);
scene.add(new THREE.HemisphereLight(0xf6ffec,0x444054,2.4));
const key=new THREE.DirectionalLight(0xffffff,4.5);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;scene.add(key);
const rim=new THREE.DirectionalLight(0xb4a5ff,4);rim.position.set(4,2,-4);scene.add(rim);
const fill=new THREE.PointLight(0xc7f959,14,20);fill.position.set(-4,0,2);scene.add(fill);
sculpture=new THREE.Group();sculpture.position.y=.15;scene.add(sculpture);
for(let i=0;i<3;i++){
 const mat=new THREE.MeshPhysicalMaterial({color:palettes.acid.colors[i],metalness:i===2?.75:.34,roughness:i===2?.19:.26,clearcoat:1,clearcoatRoughness:.16});
 const mesh=new THREE.Mesh(new THREE.TorusGeometry(1.38,.235,32,112),mat);mesh.castShadow=true;mesh.receiveShadow=true;sculpture.add(mesh);rings.push(mesh);
}
core=new THREE.Mesh(new THREE.SphereGeometry(.43,40,24),new THREE.MeshPhysicalMaterial({color:0xc9d3ba,metalness:.9,roughness:.21,clearcoat:1}));core.castShadow=true;sculpture.add(core);
for(let i=0;i<5;i++){const bead=new THREE.Mesh(new THREE.SphereGeometry(.09+(i%2)*.045,16,12),new THREE.MeshPhysicalMaterial({color:i%2?0xa38cf3:0xc7f959,metalness:.5,roughness:.22}));sculpture.add(bead);beads.push(bead);}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.22}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.9;floor.receiveShadow=true;scene.add(floor);
const ringBases=[[.85,.25,.25],[1.75,.6,1.35],[-.3,1.15,.6]];
function poseOrbit(phase,intensity,colors){const t=phase*TAU,a=intensity/100;sculpture.rotation.set(.1*Math.sin(t),t,.13*Math.cos(t));sculpture.position.y=.15+.11*a*Math.sin(t);rings.forEach((mesh,i)=>{const b=ringBases[i];mesh.rotation.set(b[0]+Math.sin(t+i*2)*.35*a,b[1]+Math.cos(t+i)*.3*a,b[2]+Math.sin(t+i)*.24*a);mesh.scale.set(1,1+(i===0?.14:-.06),1);mesh.position.set(Math.sin(t+i*2)*.11*a,Math.cos(t+i*2)*.09*a,0);mesh.material.color.copy(colors[i]);});beads.forEach((mesh,i)=>{const q=t+i*TAU/5;mesh.position.set(Math.cos(q)*2.05,Math.sin(q*2)*.65,Math.sin(q)*2.05);mesh.material.color.copy(colors[i%3]);});core.scale.setScalar(.9+.12*a*Math.sin(t));scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
const hexColors=()=>visualColors.map(c=>'#'+c.getHexString());
const fmt=n=>Number(n.toFixed(2));
function pulseMarkup(phase,intensity,colors){const t=phase*TAU,a=intensity/100;let shapes='<defs><filter id="pulse-shadow"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-opacity=".27"/></filter></defs><g filter="url(#pulse-shadow)">';for(let j=0;j<7;j++){const r=255-j*31+Math.sin(t-j*.48)*19*a;const angle=Math.sin(t+j*.3)*.065*a+(j%2?.08:-.08);let d='';for(let k=0;k<=128;k++){const q=k/128*TAU;const squircle=Math.pow(Math.pow(Math.cos(q),4)+Math.pow(Math.sin(q),4),-.25);const rr=r*squircle*(1+Math.cos(q*4+t-j*.35)*.037*a);const x=450+Math.cos(q+angle)*rr,y=365+Math.sin(q+angle)*rr;d+=(k?'L':'M')+fmt(x)+','+fmt(y);}shapes+=`<path d="${d}Z" fill="${j%2?'#18191d':colors[(j/2|0)%3]}"/>`;}
 shapes+='</g>';return shapes;}
function weaveMarkup(phase,intensity,colors){
 const t=phase*TAU,a=intensity/100,parts=[],underlays=[];
 const point=(u,i,vertical)=>{const offset=(i-1)*112;const wave=Math.sin(u*TAU+t+i*1.8)*108*a;return vertical?[450+offset+wave,125+u*485]:[170+u*560,365+offset+wave];};
 for(let v=0;v<2;v++)for(let i=0;i<3;i++){
  const width=43+13*a;let d='';
  for(let j=0;j<=64;j++){const p=point(j/64,i,v);d+=(j?'L':'M')+fmt(p[0])+','+fmt(p[1]);}
  underlays.push(`<path d="${d}" stroke="#101114" stroke-width="${width+8}"/>`);
  for(let j=0;j<64;j++){
   const u=j/64,u2=(j+1)/64,p=point(u,i,v),p2=point(u2,i,v),z=Math.sin((u+u2)/2*TAU+t+i*1.8+(v?Math.PI:0));
   const color=colors[(i+v)%3];
   parts.push({z,markup:`<path d="M${fmt(p[0])},${fmt(p[1])}L${fmt(p2[0])},${fmt(p2[1])}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`});
  }
 }
 parts.sort((a,b)=>a.z-b.z);return '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'+underlays.join('')+'</g>'+parts.map(p=>p.markup).join('');
}
function resize(){const box=$('artwork').getBoundingClientRect();camera.aspect=box.width/box.height;camera.updateProjectionMatrix();if(renderer)renderer.setSize(box.width,box.height,false);else{const cv=$('fallback-canvas');cv.width=Math.round(box.width*Math.min(devicePixelRatio,1.5));cv.height=Math.round(box.height*Math.min(devicePixelRatio,1.5));}}
new ResizeObserver(resize).observe($('artwork'));resize();
function orbitPolygons(width,height){let faces=[];const world=new THREE.Vector3(),n=new THREE.Vector3(),light=new THREE.Vector3(-.3,.7,.6).normalize(),normalMatrix=new THREE.Matrix3();for(const mesh of [...rings,core,...beads]){const geometry=rings.includes(mesh)?exportGeometry:mesh===core?coreExportGeometry:mesh.geometry;const pos=geometry.attributes.position,normal=geometry.attributes.normal,idx=geometry.index;normalMatrix.getNormalMatrix(mesh.matrixWorld);const verts=[],norms=[];for(let k=0;k<pos.count;k++){world.fromBufferAttribute(pos,k).applyMatrix4(mesh.matrixWorld);const z=world.clone().applyMatrix4(camera.matrixWorldInverse).z;world.project(camera);verts.push([fmt((world.x*.5+.5)*width),fmt((-world.y*.5+.5)*height),z]);n.fromBufferAttribute(normal,k).applyMatrix3(normalMatrix).normalize();norms.push(n.dot(light));}
for(let k=0;k<idx.count;k+=3){const ids=[idx.getX(k),idx.getX(k+1),idx.getX(k+2)],p=ids.map(i=>verts[i]);const cross=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);if(cross>=0)continue;const shade=Math.max(.32,Math.min(1.12,.57+ids.reduce((s,i)=>s+norms[i],0)/3*.55));const col=mesh.material.color.clone().multiplyScalar(shade);faces.push({z:p.reduce((s,q)=>s+q[2],0)/3,points:p,color:'#'+col.getHexString()});}}
faces.sort((a,b)=>a.z-b.z);return faces;}
function fallbackDraw(){const cv=$('fallback-canvas'),ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);const faces=orbitPolygons(cv.width,cv.height);faces.forEach(face=>{ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();ctx.strokeStyle=face.color;ctx.lineWidth=.5;ctx.stroke();});}
function updateTransport(){const icon=state.playing?'<path d="M8 5v14M16 5v14"/>':'<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>';const verb=state.playing?'Pause':'Play';$('play').querySelector('svg').innerHTML=icon;$('play').querySelector('span').textContent=verb;$('play').setAttribute('aria-label',verb+' animation');$('stage-pause').querySelector('svg').innerHTML=icon;$('stage-pause').setAttribute('aria-label',verb+' animation');$('stage-pause').title=verb+' animation';$('play-status').textContent=state.playing?'IN MOTION':'STILL, WITH CHARACTER';$('mobile-play').textContent=state.playing?'Ⅱ':'▶';$('mobile-play').setAttribute('aria-label',verb+' animation');$('motion-note').innerHTML=reduced.matches?'Reduced motion.<br>You control the rhythm.':'Drag time.<br>Find your moment.';}
function updateTimeline(){if(!scrubbing)$('timeline').value=Math.round(state.phase*1000);$('timeline').style.setProperty('--fill',state.phase*100+'%');$('time-value').textContent=(state.phase*6).toFixed(2).padStart(5,'0')+' / 06.00';$('timeline').setAttribute('aria-valuetext',(state.phase*6).toFixed(2)+' seconds of 6');}
function setStyle(style){if(style===state.style)return;previousStyle=state.style;state.style=style;lastSwitch=performance.now();for(const [key,el] of Object.entries(artElements))el.classList.toggle('active',key===style);document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===style)));$('style-number').textContent=styles[style].number;$('specimen-label').textContent=styles[style].label;$('style-description').textContent=styles[style].description;$('mobile-style').textContent=style.toUpperCase();updateArtLabel();}
const measureContext=document.createElement('canvas').getContext('2d');
function fitNames(){
 const mobile=innerWidth<=700;
 let font=mobile?60:Math.min(105,innerWidth*.076);measureContext.font=`800 ${font}px Arial`;
 const available=innerWidth*(mobile?.77:.86);font*=Math.min(1,available/measureContext.measureText(state.name.toUpperCase()).width);
 $('stage-name').style.fontSize=font+'px';
 let miniFont=29;measureContext.font='800 29px Arial';miniFont*=Math.min(1,Math.max(230,$('mobile-name').parentElement.clientWidth*.77)/measureContext.measureText(state.name.toUpperCase()).width);$('mobile-name').style.fontSize=miniFont+'px';
}
window.addEventListener('resize',fitNames);
function updateArtLabel(){$('artwork').setAttribute('aria-label',`${state.name} mark in ${styles[state.style].label.toLowerCase()}, ${palettes[state.palette].name} palette, ${state.intensity}% intensity`);}
function setPalette(palette){state.palette=palette;document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===palette)));$('palette-name').innerHTML=palettes[palette].name+' <span>— '+palettes[palette].caption+'</span>';document.documentElement.style.setProperty('--accent',palettes[palette].colors[0]);updateArtLabel();}
$('brand-name').addEventListener('input',e=>{state.name=e.target.value.trim()||'LOOP';$('stage-name').textContent=state.name.toUpperCase();$('mobile-name').textContent=state.name.toUpperCase();$('name-count').textContent=e.target.value.length+' / 12';fitNames();updateArtLabel();});
$('brand-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();$('toast').textContent='Your name. Your next move.';showToast('Your name. Your next move.');}});
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>setStyle(b.dataset.style)));
document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>setPalette(b.dataset.palette)));
$('intensity').addEventListener('input',e=>{state.intensity=Number(e.target.value);$('intensity-value').textContent=state.intensity+'%';e.target.style.setProperty('--fill',((state.intensity-10)/90*100)+'%');updateArtLabel();});
function togglePlay(){state.playing=!state.playing;lastFrame=performance.now();updateTransport();}
$('play').addEventListener('click',togglePlay);$('mobile-play').addEventListener('click',togglePlay);$('stage-pause').addEventListener('click',togglePlay);
$('replay').addEventListener('click',()=>{state.phase=0;if(!reduced.matches)state.playing=true;lastFrame=performance.now();updateTimeline();updateTransport();showToast(reduced.matches?'Back to the first pose':'A fresh start. Same good rhythm.');});
$('timeline').addEventListener('pointerdown',()=>{scrubbing=true;wasPlaying=state.playing;state.playing=false;updateTransport();});
const endScrub=()=>{if(!scrubbing)return;scrubbing=false;state.playing=wasPlaying;lastFrame=performance.now();updateTransport();};
window.addEventListener('pointerup',endScrub);window.addEventListener('pointercancel',endScrub);window.addEventListener('blur',endScrub);
$('timeline').addEventListener('input',e=>{state.phase=Number(e.target.value)/1000;updateTimeline();});
$('timeline').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key)){state.playing=false;updateTransport();}});
reduced.addEventListener('change',()=>{if(reduced.matches)state.playing=false;updateTransport();});
document.querySelectorAll('[data-study]').forEach(b=>b.addEventListener('click',()=>{setStyle(b.dataset.study);document.querySelector('.hero').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});showToast(styles[b.dataset.study].label.split(' / ')[0]+' — a new kind of energy');}));
function showToast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2400);}
const xml=s=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function createSVG(snapshot){const cols=palettes[snapshot.palette].colors;const heading=`<text x="60" y="700" font-family="Arial,Helvetica,sans-serif" font-size="${snapshot.name.length>7?Math.round(560/snapshot.name.length):90}" font-weight="800" letter-spacing="-4" fill="#f2f1e9">${xml(snapshot.name.toUpperCase())}</text>`;let content;
if(snapshot.style==='orbit'){const oldAspect=camera.aspect;camera.aspect=1200/760;camera.updateProjectionMatrix();poseOrbit(snapshot.phase,snapshot.intensity,cols.map(c=>new THREE.Color(c)));content=orbitPolygons(1200,760).map(f=>`<polygon points="${f.points.map(p=>p[0]+','+p[1]).join(' ')}" fill="${f.color}" stroke="${f.color}" stroke-width=".45"/>`).join('');camera.aspect=oldAspect;camera.updateProjectionMatrix();}else{content=`<g transform="translate(290 -5) scale(.96)">${snapshot.style==='pulse'?pulseMarkup(snapshot.phase,snapshot.intensity,cols):weaveMarkup(snapshot.phase,snapshot.intensity,cols)}</g>`;}
return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc"><title id="title">${xml(snapshot.name)} — ${snapshot.style} identity</title><desc id="desc">Original LOOP concept. ${palettes[snapshot.palette].name} palette, ${snapshot.intensity}% intensity. Pose at ${(snapshot.phase*6).toFixed(2)} seconds.</desc><rect width="1200" height="760" fill="#18191d"/>${content}${heading}<text x="60" y="40" font-family="Arial,Helvetica,sans-serif" font-size="11" letter-spacing="2" fill="#a4a69f">LOOP / ${snapshot.style.toUpperCase()} / ORIGINAL CONCEPT</text></svg>`;}
function openExport(){clearTimeout(closingTimer);exportSnapshot={...state};exportSnapshot.svg=createSVG(exportSnapshot);$('export-preview').innerHTML=exportSnapshot.svg;$('detail-name').textContent=exportSnapshot.name;$('detail-style').textContent=exportSnapshot.style[0].toUpperCase()+exportSnapshot.style.slice(1);$('detail-palette').textContent=palettes[exportSnapshot.palette].name;$('detail-intensity').textContent=exportSnapshot.intensity+'%';$('detail-time').textContent=(exportSnapshot.phase*6).toFixed(2)+'s of 6.00s';$('download-status').textContent='';$('export-dialog').showModal();document.body.style.overflow='hidden';requestAnimationFrame(()=>$('export-dialog').classList.add('open'));}
function closeExport(){if(!$('export-dialog').open)return;$('export-dialog').classList.remove('open');closingTimer=setTimeout(()=>{$('export-dialog').close();document.body.style.overflow='';$('export-open').focus();},reduced.matches?0:300);}
$('export-dialog').addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const controls=[...$('export-dialog').querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')].filter(el=>el.getClientRects().length);
 const first=controls[0],last=controls.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
$('export-open').addEventListener('click',openExport);$('export-close').addEventListener('click',closeExport);$('export-dialog').addEventListener('cancel',e=>{e.preventDefault();closeExport();});$('export-dialog').addEventListener('click',e=>{if(e.target===$('export-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeExport();}});
function download(content,type,extension){const slug=(exportSnapshot.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'loop');const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${slug}-${exportSnapshot.style}.${extension}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('download-status').textContent=extension==='svg'?'SVG still downloaded. Your moment, captured.':'Motion configuration downloaded. Your rhythm, saved.';}
$('download-svg').addEventListener('click',()=>download(exportSnapshot.svg,'image/svg+xml','svg'));
$('download-json').addEventListener('click',()=>{const s=exportSnapshot;const config={schema:'loop.motion.v1',concept:'LOOP — original kinetic identity studio concept',name:s.name,displayName:s.name.toUpperCase(),style:s.style,palette:{id:s.palette,name:palettes[s.palette].name,colors:palettes[s.palette].colors,background:'#18191d'},intensity:s.intensity,durationSeconds:6,phase:s.phase,timeSeconds:Number((s.phase*6).toFixed(4)),loop:true,export:{type:'motion-configuration',svg:'static vector pose',orbitRendering:'projected vector surface; 3D lighting differs'},motion:{algorithm:s.style==='pulse'?'nested-squircle-breath-v1':s.style==='weave'?'depth-sorted-sine-braid-v1':'interlocking-torus-orbit-v1',radiansPerLoop:TAU},reducedMotion:reduced.matches};download(JSON.stringify(config,null,2)+'\n','application/json','json');});
let lastMiniSize='';
function renderMini(){
 if(innerWidth>700)return;
 const cv=$('mobile-canvas'),flat=$('mobile-flat'),box=$('mobile-canvas').getBoundingClientRect(),ratio=Math.min(devicePixelRatio,1.5),size=box.width+':'+box.height;
 if(size!==lastMiniSize){cv.width=box.width*ratio;cv.height=box.height*ratio;lastMiniSize=size;}
 cv.hidden=state.style!=='orbit';flat.style.display=state.style==='orbit'?'none':'block';
 if(state.style==='orbit'){
  const source=webgl?$('orbit-canvas'):$('fallback-canvas'),ctx=cv.getContext('2d'),h=cv.height*1.17,w=h*source.width/source.height;
  ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(source,cv.width-w+cv.width*.06,-cv.height*.13,w,h);
 }else flat.innerHTML=state.style==='pulse'?$('pulse-art').innerHTML:$('weave-art').innerHTML;
}
function updateScrollComposition(){
 if(innerWidth<=700)return;
 const hero=document.querySelector('.hero'),progress=Math.max(0,Math.min(1,scrollY/(hero.clientHeight*.65)));
 hero.classList.toggle('exploring',progress>.55);
 $('artwork').style.transform=`translate(${-100*progress}px,${200*progress}px) scale(${1-.28*progress})`;
 document.querySelector('.hero-copy').style.opacity=1-progress;
 document.querySelector('.hero-copy').style.transform=`translateY(${-40*progress}px)`;
}
document.querySelectorAll('a[href="#create"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const y=$('create').getBoundingClientRect().top+scrollY-(innerWidth>700?Math.min(390,innerHeight*.42):12);window.scrollTo({top:y,behavior:reduced.matches?'instant':'smooth'});}));
function frame(now){const delta=Math.min((now-lastFrame)/1000,.08);lastFrame=now;if(state.playing&&!scrubbing&&!document.hidden)state.phase=(state.phase+delta/6)%1;const lerp=reduced.matches?1:1-Math.exp(-delta*10);animatedIntensity+=(state.intensity-animatedIntensity)*lerp;visualColors.forEach((c,i)=>c.lerp(new THREE.Color(palettes[state.palette].colors[i]),lerp));const colors=hexColors();const fading=now-lastSwitch<750;const needs=s=>state.style===s||(fading&&previousStyle===s);if(needs('orbit')){poseOrbit(state.phase,animatedIntensity,visualColors);if(renderer)renderer.render(scene,camera);else if(now%100<24||!state.playing)fallbackDraw();}if(needs('pulse'))$('pulse-art').innerHTML=pulseMarkup(state.phase,animatedIntensity,colors);if(needs('weave'))$('weave-art').innerHTML=weaveMarkup(state.phase,animatedIntensity,colors);renderMini();updateScrollComposition();updateTimeline();requestAnimationFrame(frame);}
artElements.orbit.classList.add('active');updateTransport();updateTimeline();updateArtLabel();$('intensity').style.setProperty('--fill',((65-10)/90*100)+'%');fitNames();requestAnimationFrame(frame);
