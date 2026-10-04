import * as THREE from './assets/vendor/three.module.js';
import {createKineticField} from './lib/kinetic-field.mjs';
import {createDrawer} from './lib/drawer.mjs';
const $=s=>document.querySelector(s);
const palettes={acid:{name:'Acid',colors:['#dcff52','#c7b9ff','#203089'],background:'#263eff'},ember:{name:'Ember',colors:['#ff7751','#ffe8ac','#822df0'],background:'#482075'},ice:{name:'Ice',colors:['#aefff3','#f0f1ff','#29666c'],background:'#10363c'}};
let name='LOOP',palette='acid',field,renderer,scene,camera,group,meshes=[],instances=[],dummy=new THREE.Object3D(),width=0,height=0,lastState,scrubbing=false,wasRunning=false,exportSnapshot=null;
document.body.append($('#specimen'));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let dock=0;
const stage=$('.hero'),canvas=$('#scene'),fallback=$('#fallback');
let materials=[],geometry;
function initializeScene(){
 try{
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');const software=debug&&/SwiftShader|llvmpipe/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));renderer.setPixelRatio(software?.8:Math.min(devicePixelRatio,1.35));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(32,1,.1,80);camera.position.set(0,0,12);camera.lookAt(0,0,0);group=new THREE.Group();scene.add(group);
 scene.add(new THREE.HemisphereLight('#f4f5ff','#172260',2.5));
 const key=new THREE.DirectionalLight('#ffffff',5);key.position.set(-3,5,6);scene.add(key);
 const rim=new THREE.DirectionalLight('#b5c8ff',4);rim.position.set(4,0,-2);scene.add(rim);
 const fill=new THREE.DirectionalLight('#fff3b0',1.8);fill.position.set(1,-4,3);scene.add(fill);
 // A procedural studio environment gives the surfaces real reflected light.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color('#273457');
 const lightPanel=(x,y,z,sx,sy,color)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);envScene.add(p);};
 lightPanel(-5,6,2,7,9,'#ffffff');lightPanel(5,2,-3,3,8,'#798fff');lightPanel(0,-3,5,8,2,'#f2f6ff');
 const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(envScene,.05);scene.environment=env.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 materials=palettes.acid.colors.map((color,i)=>new THREE.MeshStandardMaterial({color,metalness:i===2?.65:.22,roughness:i===2?.24:.28,envMapIntensity:1.25}));
 geometry=new THREE.CapsuleGeometry(.19,.40,5,14);
 for(let lane=0;lane<3;lane++){const mesh=new THREE.InstancedMesh(geometry,materials[lane],16);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);instances.push(mesh);}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();activateFallback();});
 }catch(error){console.info('LOOP is using its vector preview.',error.message);activateFallback();}
}
function activateFallback(){renderer=null;canvas.hidden=true;canvas.style.display='none';fallback.removeAttribute('hidden');$('#renderer-note').textContent='VECTOR / WEBGL FALLBACK';if(lastState)render(lastState);}
function resize(){const r=$('#specimen').getBoundingClientRect();width=r.width;height=r.height;if(renderer){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}if(lastState)render(lastState);}
function setGroup(){if(!group)return;const mobile=width<600;const aspect=width/height;group.position.set((mobile?0:aspect*1.05)*(1-dock),(mobile?-.7:.3)*(1-dock)+.22*dock,0);group.scale.setScalar((mobile?.89:1.24)*(1-dock)+(width<600?.93:1.05)*dock);group.rotation.set(.12,-.15,-.12);}
function render(state){
 lastState=state;
 if(renderer){if($('#specimen').style.visibility!=='hidden'){setGroup();state.points.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rotation,'YXZ');dummy.scale.setScalar(p.scale);dummy.updateMatrix();instances[Math.floor(i/16)].setMatrixAt(i%16,dummy.matrix);});instances.forEach(m=>m.instanceMatrix.needsUpdate=true);renderer.render(scene,camera);}}
 else{const x=dock?0:width<600?0:1.5,y=dock?-.25:width<600?1.1:.2,scale=width<600&&!dock?.72:1;fallback.innerHTML=`<g transform="translate(${x} ${y}) scale(${scale})">${vectorArt(state.points,palette,false)}</g>`;}
 if(!scrubbing){$('#timeline').value=Math.round(state.progress*1000);setRange($('#timeline'));}
 $('#time-value').textContent=`${(state.progress*8).toFixed(2).padStart(5,'0')} / 08.00`;
 const paused=state.status==='paused'||state.status==='posed'||state.status==='idle';
 const staticMode=state.reducedMotion;
 $('#play-label').textContent=paused?'Resume':'Pause';$('#play-icon').textContent=paused?'▶':'Ⅱ';$('#play').setAttribute('aria-label',paused?'Resume motion':'Pause motion');$('#hero-pause').setAttribute('aria-label',paused?'Resume motion':'Pause motion');$('#hero-pause').textContent=paused?'▶':'Ⅱ';
 $('#motion-status').innerHTML=`<i></i>${staticMode?'Static mode':paused?'Paused':'Playing'}`;
 stage.dataset.formation=state.mode;stage.dataset.status=paused?'paused':staticMode?'static':'playing';
}
function setRange(input){const v=(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100;input.style.setProperty('--fill',v+'%');}
function syncLabel(){const cap=field.state.mode[0].toUpperCase()+field.state.mode.slice(1);$('#specimen').setAttribute('aria-label',`${name} identity in ${cap} motion, ${palettes[palette].name} palette, ${Math.round(field.state.intensity*100)} percent intensity`);}
function setName(){name=$('#brand-name').value.trim()||'LOOP';$('#name-hint').textContent=$('#brand-name').value.trim()?'1–12 characters. Big ideas welcome.':'Using LOOP until you give it a name.';$('#specimen-name').textContent=name;$('#preview-name').textContent=name;$('#preview-name').style.fontSize=name.length>6?`${Math.min(70,270/name.length)}px`:'';const length=[...name].length;$('#specimen-name').style.fontSize=length>5?`min(${90/length*1.15}vw, ${width<600?140:270}px)`:'';syncLabel();}
function announce(text){$('#announcement').textContent=text;}
initializeScene();
field=createKineticField({count:48,mode:'orbit',intensity:.65,periodMs:8000,frequency:2.2,onChange:render});
resize();new ResizeObserver(resize).observe(stage);field.play();
$('#brand-name').addEventListener('input',setName);
$('.name-input').addEventListener('click',()=>$('#brand-name').focus());
const descriptions={pulse:'01—03 / PULSE<br>A radial rhythm. Room to breathe.',weave:'02—03 / WEAVE<br>Separate threads. A single expression.',orbit:'03—03 / ORBIT<br>Interlocking paths. A shared centre.'};$('#specimen-description').innerHTML=descriptions.orbit;
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});field.setMode(button.dataset.mode);$('#specimen-description').innerHTML=descriptions[button.dataset.mode];$('#preview-mode').textContent=button.dataset.mode.toUpperCase()+' / '+({pulse:'01',weave:'02',orbit:'03'}[button.dataset.mode]);syncLabel();announce(`${button.dataset.mode} motion selected`);}));
document.querySelectorAll('[data-palette]').forEach(button=>button.addEventListener('click',()=>{palette=button.dataset.palette;document.querySelectorAll('[data-palette]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});materials.forEach((m,i)=>m.color.set(palettes[palette].colors[i]));stage.style.background=palettes[palette].background;$('#live-preview').style.background=palettes[palette].background;$('#preview-palette').textContent=palettes[palette].name.toUpperCase()+' / '+Math.round(field.state.intensity*100)+'%';render(field.state);syncLabel();announce(`${palettes[palette].name} palette selected`);}));
$('#intensity').addEventListener('input',e=>{setRange(e.target);const value=Number(e.target.value);$('#intensity-value').textContent=value+'%';$('#preview-palette').textContent=palettes[palette].name.toUpperCase()+' / '+value+'%';$('#energy-description').textContent=value<35?'Quiet movement. A gentle presence.':value>75?'Full expression. No holding back.':'A confident rhythm, with room to breathe.';field.setIntensity(value/100);syncLabel();});
function togglePlay(){if(field.state.status==='paused'||field.state.status==='posed')field.play();else field.pause();}
$('#play').addEventListener('click',togglePlay);$('#hero-pause').addEventListener('click',togglePlay);
$('#replay').addEventListener('click',()=>{field.replay();announce('Motion replayed from the beginning');});
const timeline=$('#timeline');
timeline.addEventListener('pointerdown',e=>{scrubbing=true;wasRunning=field.state.status==='running';field.pause();timeline.setPointerCapture(e.pointerId);});
timeline.addEventListener('input',()=>{field.seek(Number(timeline.value)/1000,{immediate:true});setRange(timeline);});
function releaseScrub(){if(!scrubbing)return;scrubbing=false;if(wasRunning)field.resume();}
timeline.addEventListener('pointerup',releaseScrub);timeline.addEventListener('pointercancel',releaseScrub);timeline.addEventListener('lostpointercapture',releaseScrub);
let scrollQueued=false;
function placeSpecimen(){
 const a=stage.getBoundingClientRect(),b=$('#live-preview').getBoundingClientRect();
 let t=Math.min(1,Math.max(0,(innerHeight-b.top)/Math.min(440,innerHeight*.55)));t=t*t*(3-2*t);dock=t;
 const mix=(x,y)=>x+(y-x)*t;
 const element=$('#specimen');element.style.left=mix(a.left,b.left)+'px';element.style.top=mix(a.top,b.top)+'px';element.style.width=mix(a.width,b.width)+'px';element.style.height=mix(a.height,b.height)+'px';
 element.style.visibility=(b.bottom<0||a.top>innerHeight)?'hidden':'visible';
 stage.style.setProperty('--scroll-shift',Math.min(1,Math.max(0,scrollY/stage.offsetHeight)));
 resize();
}
window.addEventListener('scroll',()=>{if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{scrollQueued=false;placeSpecimen();});},{passive:true});
window.addEventListener('resize',placeSpecimen);placeSpecimen();
// Use the same positions, projection and palette for SVG preview and SVG download.
const escapeXml=s=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function projectedPoints(points){
 if(camera&&group){setGroup();group.updateMatrixWorld(true);camera.updateMatrixWorld(true);return points.map((p,i)=>{const v=new THREE.Vector3(p.x,p.y,p.z).applyMatrix4(group.matrixWorld);const depth=v.distanceTo(camera.position);v.project(camera);const dx=width<600?0:group.position.x;const center=new THREE.Vector3(group.position.x,group.position.y,0).project(camera);return{...p,i,x:(v.x-center.x)*3.7,y:-(v.y-center.y)*3.7*height/width,z:p.z,scale:p.scale*12/depth,angle:p.rotation};});}
 return points.map((p,i)=>({...p,i,y:-p.y,angle:-p.rotation}));
}
function vectorArt(points,pal,project=true){const poses=project?projectedPoints(points):points.map((p,i)=>({...p,i,y:-p.y,angle:-p.rotation}));return poses.sort((a,b)=>a.z-b.z).map(p=>{const color=palettes[pal].colors[Math.floor(p.i/16)];const brightness=.68+(p.z+2)/4*.4;return `<g transform="translate(${p.x.toFixed(4)} ${p.y.toFixed(4)}) rotate(${(-p.angle*180/Math.PI).toFixed(3)}) scale(${p.scale.toFixed(4)})"><rect x="-.19" y="-.39" width=".38" height=".78" rx=".19" fill="${color}"/><rect x="-.145" y="-.3" width=".06" height=".44" rx=".03" fill="white" opacity=".16"/></g>`;}).join('');}
function makeSvg(snapshot,{withName=true}={}){const title=escapeXml(snapshot.name);const bg=palettes[snapshot.palette].background;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3.3 -2.7 6.6 ${withName?'6.6':'5.4'}" role="img" aria-label="${title} ${snapshot.style} identity"><title>${title} — ${snapshot.style} / ${palettes[snapshot.palette].name}</title><desc>Original LOOP identity. Intensity ${Math.round(snapshot.intensity*100)}%. Static snapshot at ${(snapshot.progress*8).toFixed(2)} seconds.</desc><metadata>${escapeXml(JSON.stringify({name:snapshot.name,style:snapshot.style,palette:snapshot.palette,intensity:snapshot.intensity,progress:snapshot.progress}))}</metadata><rect x="-3.3" y="-2.7" width="6.6" height="${withName?'6.6':'5.4'}" fill="${bg}"/>${snapshot.art}${withName?`<text x="0" y="3.15" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${Math.min(.62,5/snapshot.name.length)}" letter-spacing="-.035" fill="#f2f1e9">${title}</text>`:''}</svg>`;}
function snapshot(){const s=field.state;return{name,style:s.mode,palette,intensity:s.intensity,progress:s.progress,art:vectorArt(s.points,palette),points:s.points.map(({id,x,y,z,rx,ry,rotation,scale})=>({id,x,y,z,rx,ry,rotation,scale}))};}
const drawer=createDrawer({dialog:$('#export-panel'),openButton:$('#export-open'),closeButton:$('#export-close')});
$('#export-open').addEventListener('click',()=>{exportSnapshot=snapshot();const s=exportSnapshot;$('#export-preview').innerHTML=makeSvg(s,{withName:false});$('#export-preview').style.background=palettes[s.palette].background;$('#export-name').textContent=s.name;$('#export-mode').textContent=s.style[0].toUpperCase()+s.style.slice(1);$('#export-palette').textContent=palettes[s.palette].name;$('#export-intensity').textContent=Math.round(s.intensity*100)+'%';$('#export-frame').textContent=(s.progress*8).toFixed(2)+'s';$('#download-status').textContent='Two useful files. One moving idea.';});
$('#export-panel').addEventListener('click',e=>{if(e.target===$('#export-panel')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)drawer.setOpen(false);}});
function download(text,type,extension){const blob=new Blob([text],{type});const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;const slug=exportSnapshot.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'identity';link.download=`loop-${slug}-${exportSnapshot.style}.${extension}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);$('#download-status').textContent=`${extension.toUpperCase()} downloaded. Keep making it yours.`;}
$('#download-svg').addEventListener('click',()=>download(makeSvg(exportSnapshot),'image/svg+xml','svg'));
$('#download-json').addEventListener('click',()=>{const s=exportSnapshot;download(JSON.stringify({format:'loop-motion-configuration',version:1,originalConcept:true,name:s.name,style:s.style,palette:{id:s.palette,...palettes[s.palette]},intensity:s.intensity,durationMs:8000,progress:s.progress,geometry:{type:'capsule',radius:.19,length:.4,count:48},snapshot:s.points,motion:{module:'lib/kinetic-field.mjs',formation:'kineticFormation',phase:s.progress,note:'Use the supplied original source to reproduce motion. SVG is a static projected snapshot.'}},null,2),'application/json','json');});
reduced.addEventListener('change',()=>announce(reduced.matches?'Reduced motion enabled. Use the timeline to explore static poses.':'Motion enabled.'));
window.addEventListener('pagehide',()=>{field.dispose();drawer.dispose();geometry?.dispose();materials.forEach(m=>m.dispose());scene?.environment?.dispose();renderer?.dispose();});
