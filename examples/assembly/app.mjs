import {DESIGN,createCameraScene} from './design.mjs';
import {createAssemblyMotion} from './motion/controller.mjs';
import {createSceneActorAdapter} from './motion/scene-actor-adapter.mjs';
const stage=document.querySelector('#stage'),media=matchMedia('(prefers-reduced-motion: reduce)'),motion=createAssemblyMotion(DESIGN,media.matches),label=document.querySelector('#actor-label');
let observer;let THREE,renderer,scene,camera,actors,rig,last=null,width=0,height=0,rendererKind='svg-fallback',frame=0,disposed=false;
const fallback=document.querySelector('#fallback'),svgNodes={body:'body',ring:'ring',sensor:'sensor','lens-wide':'wide','lens-standard':'standard','lens-tele':'tele'};
const projected={};let lastControlKey='';
function resize(){width=stage.clientWidth;height=stage.clientHeight;if(renderer){renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width<500?39:DESIGN.camera.fov;camera.updateProjectionMatrix();}paint(motion.state);}
function project(id){if(renderer){const world=new THREE.Vector3();actors[id].getWorldPosition(world);const point=world.clone().project(camera);return {x:(point.x+1)*width/2,y:(1-point.y)*height/2,world:world.toArray()};}const position=motion.state.positions[id];const scale=Math.min(width/7.6,height/5.6);return {x:width*.45+(position[0]+position[2]*.45)*scale,y:height*.47-position[1]*scale-position[2]*.23*scale,world:position};}
function updateControls(state){
  const key=[state.selected,state.view,state.paused,state.settled].join('|');if(key===lastControlKey)return;lastControlKey=key;
  for(const button of document.querySelectorAll('[data-lens]'))button.setAttribute('aria-pressed',String(button.dataset.lens===state.selected));
  const spec=DESIGN.lenses[state.selected];document.querySelector('#selection').dataset.selected=state.selected;document.querySelector('#selection').textContent=spec.focalLengthMm+' mm';
  document.querySelector('#lens-label').textContent=spec.focalLengthMm+' MM / '+spec.name.split(' / ')[0];
  const open=document.querySelector('#open');open.setAttribute('aria-expanded',String(state.view!=='assembled'));open.innerHTML=(state.view==='assembled'?'Open the camera':'Reassemble the camera')+' <span>↗</span>';
  document.querySelector('#inspect').setAttribute('aria-pressed',String(state.view==='inspector'));document.querySelector('#inspector-copy').hidden=state.view!=='inspector';
  document.querySelector('#pause').innerHTML=(state.paused?'▶ <span>Resume</span>':'Ⅱ <span>Pause</span>');document.querySelector('#pause').setAttribute('aria-label',state.paused?'Resume motion':'Pause motion');
  document.querySelector('#view-label').textContent=state.view==='assembled'?'01  ASSEMBLED':state.view==='exploded'?'02  COMPONENT VIEW':'03  THE INSPECTOR';
  document.querySelector('#status').textContent=(state.paused?'Paused':state.settled?state.view[0].toUpperCase()+state.view.slice(1):'In motion')+' · '+spec.focalLengthMm+' mm selected';
}
function paint(state){
  if(!width||!height)return;
  if(renderer){for(const [id,object] of Object.entries(actors))object.position.set(...state.positions[id]);renderer.render(scene,camera);}
  else {fallback.hidden=false;const svg=document.querySelector('#fallback-scene');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);for(const [id,key] of Object.entries(svgNodes)){const point=project(id);document.querySelector('#svg-'+key).setAttribute('transform',`translate(${point.x} ${point.y}) scale(${Math.min(width/720,height/520)})`);}}
  for(const id of Object.keys(state.positions))projected[id]=project(id);
  const anchor=projected['lens-'+state.selected],lx=Math.max(14,Math.min(width-156,anchor.x+34)),ly=Math.max(67,Math.min(height-75,anchor.y-70));
  label.style.transform=`translate(${lx}px,${ly}px)`;document.querySelector('#leader-path').setAttribute('d',`M${anchor.x},${anchor.y} L${lx+5},${ly+23} L${lx+30},${ly+23}`);
  document.querySelector('#scrubber').value=String(Math.round(state.progress*1000));document.querySelector('#progress-label').textContent=String(Math.round(state.progress*100)).padStart(2,'0')+'%';
  // Opt-in annotations copied only after this consumer's render. They cannot establish native pixels.
  if(renderer&&observer){const rect=stage.getBoundingClientRect();observer.afterRender(camera,{x:rect.x,y:rect.y,width,height},performance.now());}
}
function act(fn){fn();updateControls(motion.state);paint(motion.state);}
document.querySelector('#open').onclick=()=>act(()=>motion.open());document.querySelector('#inspect').onclick=()=>act(()=>motion.inspect());
for(const button of document.querySelectorAll('[data-lens]'))button.onclick=()=>act(()=>motion.select(button.dataset.lens));
document.querySelector('#pause').onclick=()=>act(()=>motion.state.paused?motion.resume():motion.pause());document.querySelector('#replay').onclick=()=>act(()=>motion.replay());
const scrub=document.querySelector('#scrubber');scrub.addEventListener('input',()=>act(()=>motion.seek(Number(scrub.value)/1000)));scrub.addEventListener('pointerdown',event=>scrub.setPointerCapture(event.pointerId));for(const type of ['pointerup','pointercancel','blur'])scrub.addEventListener(type,()=>act(()=>motion.release()));
document.querySelector('#export').onclick=()=>{const state=motion.state,spec=DESIGN.lenses[state.selected],config={format:'assembly-config-1',product:'ASSEMBLY',selected:state.selected,lens:{focalLengthMm:spec.focalLengthMm,perspective:spec.name},view:state.view};const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='assembly-'+spec.focalLengthMm+'mm.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
media.addEventListener('change',()=>act(()=>motion.reduced(media.matches)));
Object.defineProperty(window,'__assemblyDebug',{get(){const state=motion.state;return {selected:state.selected,view:state.view,playing:state.playing,paused:state.paused,progress:state.progress,targetProgress:state.targetProgress,settled:state.settled,reducedMotion:media.matches,renderer:rendererKind,parts:Object.entries(state.positions).map(([id,position])=>({id,position:renderer?actors[id].position.toArray():[...position],visible:renderer?actors[id].visible:true,projected:{...projected[id]}})).concat([{id:'lens',position:renderer?actors['lens-'+state.selected].position.toArray():[...state.positions['lens-'+state.selected]],visible:true,projected:{...projected['lens-'+state.selected]}}])};}});
try{
  if(new URLSearchParams(location.search).has('fallback'))throw new Error('Requested fallback');
  THREE=await import('./assets/vendor/three.module.js');renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));({scene,camera,actors,rig}=createCameraScene(THREE,renderer));stage.prepend(renderer.domElement);rendererKind='webgl';observer=createSceneActorAdapter();for(const [id,object] of Object.entries(actors)){const bounds=id==='body'?{min:{x:-1.68,y:-1.04,z:-.54},max:{x:1.68,y:1.30,z:.63}}:id==='sensor'?{min:{x:-.45,y:-.345,z:-.06},max:{x:.45,y:.345,z:.105}}:id==='ring'?{min:{x:-.7,y:-.7,z:-.1},max:{x:.7,y:.7,z:.1}}:{min:{x:-.65,y:-.65,z:0},max:{x:.65,y:.65,z:DESIGN.lenses[id.replace('lens-','')].length+.1}};observer.register({id,object,localBounds:bounds});}renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;rendererKind='svg-fallback';fallback.hidden=false;paint(motion.state);});
}catch{renderer=null;fallback.hidden=false;}
resize();new ResizeObserver(resize).observe(stage);updateControls(motion.state);
function tick(t){if(disposed)return;const dt=last===null?0:Math.max(0,(t-last)/1000);last=t;const state=motion.advance(document.hidden?0:dt);paint(state);if(state.settled)updateControls(state);frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);
addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);motion.dispose();observer?.dispose();renderer?.dispose();},{once:true});
