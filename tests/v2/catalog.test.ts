import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdtemp,mkdir,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {transform} from 'esbuild';
import {motionCatalog,motionRecipe} from '../../packages/core/catalog';

const modules = new URL('../../plugin/motion-debugger/skills/motion/recipes/',import.meta.url);
const load = (name:string) => import(new URL(`${name}.mjs`,modules).href);

test('catalog returns shipped complete source dependencies and rejects arbitrary paths',async()=>{
  const catalog=motionCatalog();assert.equal(catalog.length,7);
  catalog[0].files=['../../.env'];assert.deepEqual(motionCatalog()[0].files,['recipes/spring.mjs']);
  for(const entry of motionCatalog()){
    const recipe=await motionRecipe(entry.id);
    assert.deepEqual(recipe.sources.filter(file=>file.language==='javascript').map(file=>file.path),entry.files);
    assert.ok(recipe.sources.every(file=>file.source.length>100 && Buffer.byteLength(file.source)<65536));
    for(const file of recipe.sources.filter(file=>file.language==='javascript')) {
      const exported=await import(new URL(file.path,new URL('../../plugin/motion-debugger/skills/motion/',import.meta.url)).href);
      assert.ok(Object.keys(exported).length>0);
    }
  }
  for(const id of ['../../.env','/etc/passwd','spring.mjs','SPRING','https://attacker.test/recipe'])await assert.rejects(motionRecipe(id),/Unknown motion recipe/);
});

test('catalog resolves npm and standalone plugin layouts independently of cwd and rejects symlinked sources',async()=>{
  const temporary=await mkdtemp(path.join(os.tmpdir(),'motion-catalog-'));
  try {
    const source=await readFile(new URL('../../packages/core/catalog.ts',import.meta.url),'utf8');
    const compiled=await transform(source,{loader:'ts',format:'esm',target:'node22'});
    for(const layout of ['npm','plugin']){
      const root=path.join(temporary,layout),base=layout==='npm'?path.join(root,'plugin/motion-debugger/skills/motion'):path.join(root,'skills/motion');
      const moduleFile=layout==='npm'?path.join(root,'build/core/index.mjs'):path.join(root,'scripts/mcp.mjs');
      await mkdir(path.dirname(moduleFile),{recursive:true});await mkdir(path.join(base,'recipes'),{recursive:true});await mkdir(path.join(base,'references'),{recursive:true});
      await writeFile(moduleFile,compiled.code);await writeFile(path.join(base,'SKILL.md'),'Packaged catalog marker');
      await writeFile(path.join(base,'recipes/spring.mjs'),'export const shipped = true;');
      for(const name of ['usage.md','evidence.md'])await writeFile(path.join(base,'references',name),'Packaged reference');
      const packed=await import(pathToFileURL(moduleFile).href);assert.equal((await packed.motionRecipe('spring')).sources[0].source,'export const shipped = true;');
      await rm(path.join(base,'recipes/spring.mjs'));const outside=path.join(root,'outside.mjs');await writeFile(outside,'secret');await symlink(outside,path.join(base,'recipes/spring.mjs'));
      await assert.rejects(packed.motionRecipe('spring'),/ordinary packaged file/);
    }
  } finally {await rm(temporary,{recursive:true,force:true});}
});

test('analytic spring preserves position and velocity through reversal and settles at new target',async()=>{
  const {createSpring}=await load('spring');
  const spring=createSpring({target:100,frequency:2});spring.advance(.12);
  const before=spring.state;assert.ok(before.value>0 && before.value<100);assert.ok(before.velocity>0);
  spring.retarget(-20);assert.equal(spring.state.value,before.value);assert.equal(spring.state.velocity,before.velocity);
  const after=spring.advance(.00001);assert.ok(Math.abs(after.value-before.value)<.02);assert.ok(after.velocity>0);
  for(let i=0;i<300;i++)spring.advance(1/60);
  assert.deepEqual(spring.state,{value:-20,velocity:0,target:-20,settled:true});
  spring.dispose();assert.throws(()=>spring.advance(.1),/disposed/);assert.throws(()=>spring.retarget(2),/disposed/);
});

test('spring elapsed-time integration is cadence-independent, including long frame gaps',async()=>{
  const {createSpring}=await load('spring');const one=createSpring({target:1,frequency:1}),many=createSpring({target:1,frequency:1});
  one.advance(.5);for(let i=0;i<50;i++)many.advance(.01);
  assert.ok(Math.abs(one.state.value-many.state.value)<1e-12);assert.ok(Math.abs(one.state.velocity-many.state.velocity)<1e-12);
  one.advance(1000);assert.equal(one.state.value,1);assert.equal(one.state.velocity,0);
  for(const invalid of [-1,NaN,Infinity])assert.throws(()=>many.advance(invalid));
});

test('reduced motion immediately retains meaningful targets and resets velocity',async()=>{
  const {createSpring}=await load('spring');const spring=createSpring({value:0,target:10,reducedMotion:true});
  assert.deepEqual(spring.state,{value:10,velocity:0,target:10,settled:true});spring.retarget(-2);assert.equal(spring.state.value,-2);
  spring.setReducedMotion(false);spring.retarget(30);spring.advance(.08);assert.ok(spring.state.velocity>0);
  spring.setReducedMotion(true);assert.deepEqual(spring.state,{value:30,velocity:0,target:30,settled:true});
});

test('animated spring uses one loop on retarget, responds to preference changes and disposes listeners',async()=>{
  const {animateSpring}=await load('spring');
  const pending=new Map<number,(time:number)=>void>();let next=0,change:(()=>void)|undefined,removed=false,paint=0;
  const media={matches:false,addEventListener(_event:string,fn:()=>void){change=fn;},removeEventListener(_event:string,fn:()=>void){removed=fn===change;}};
  const animation=animateSpring(()=>paint++,{media,requestFrame:(fn:(time:number)=>void)=>{pending.set(++next,fn);return next;},cancelFrame:(id:number)=>pending.delete(id)});
  animation.retarget(100);animation.retarget(50);assert.equal(pending.size,1);
  const frame=[...pending.entries()][0];pending.delete(frame[0]);frame[1](0);assert.equal(pending.size,1);
  media.matches=true;change?.();assert.equal(animation.state.value,50);assert.equal(pending.size,0);
  animation.retarget(-4);assert.equal(animation.state.value,-4);assert.equal(pending.size,0);
  media.matches=false;change?.();animation.retarget(20);assert.equal(pending.size,1);
  animation.dispose();animation.dispose();assert.equal(pending.size,0);assert.equal(removed,true);assert.ok(paint>=3);assert.throws(()=>animation.retarget(4),/disposed/);
});

test('chapter state clamps endpoints and makes the complete narrative reachable',async()=>{
  const {chapterState}=await load('scroll-chapters');
  assert.deepEqual(chapterState(-2,3).map((state:{progress:number})=>state.progress),[0,0,0]);
  assert.deepEqual(chapterState(.5,3).map((state:{progress:number})=>state.progress),[1,.5,0]);
  assert.deepEqual(chapterState(2,3).map((state:{progress:number})=>state.progress),[1,1,1]);
  assert.throws(()=>chapterState(.3,0));
});

test('colony factory creates articulated geometry, pauses simulation, snaps reduced motion and disposes owned resources',async()=>{
  const {createColonyScene}=await load('colony-scene');const resources:any[]=[];
  class Vector {x=0;y=0;z=0;set(x:number,y:number,z:number){this.x=x;this.y=y;this.z=z;}setScalar(x:number){this.set(x,x,x);}}
  class Object3D {position=new Vector();scale=new Vector();rotation={x:0,y:0,z:0};children:any[]=[];add(...items:any[]){this.children.push(...items);}clear(){this.children=[];}lookAt(){}updateProjectionMatrix(){}updateMatrixWorld(){}traverse(fn:(item:any)=>void){fn(this);for(const child of this.children)child.traverse(fn);}}
  class Resource {disposed=0;args:any[];constructor(...args:any[]){this.args=args;resources.push(this);}dispose(){this.disposed++;}}
  class Mesh extends Object3D {isMesh=true;constructor(public geometry:any,public material:any){super();}}
  class InstancedMesh extends Mesh {instanceMatrix={setUsage(){},needsUpdate:false};setMatrixAt(){}dispose(){}}
  class Matrix4 {copy(){return this;}invert(){return this;}multiplyMatrices(){return this;}}
  const T={Scene:Object3D,Group:Object3D,PerspectiveCamera:class extends Object3D {fov:number;constructor(fov:number,..._args:any[]){super();this.fov=fov;}},AmbientLight:class extends Object3D {constructor(..._args:any[]){super();}},DirectionalLight:class extends Object3D {constructor(..._args:any[]){super();}},SphereGeometry:Resource,CylinderGeometry:Resource,PlaneGeometry:Resource,DataTexture:Resource,MeshStandardMaterial:Resource,MeshBasicMaterial:Resource,PCFSoftShadowMap:2,RGBAFormat:1023,InstancedMesh,Matrix4,Mesh};
  let frames=0;const renderer={shadowMap:{enabled:false,type:123},render(){frames++;},setSize(){},setPixelRatio(){}};
  const colony=createColonyScene({THREE:T,renderer,count:3});colony.update(.1);
  const ant=colony.scene.children.find((item:any)=>item.children.length===14);assert.ok(ant);
  const leg=ant.children[7];const initial=leg.rotation.y;
  colony.setPaused(true);colony.update(.1);assert.equal(leg.rotation.y,initial);
  colony.setPaused(false);colony.update(.1);assert.notEqual(leg.rotation.y,initial);
  colony.setProgress(1);colony.setReducedMotion(true);colony.update(.1);assert.equal(colony.state.progress,1);assert.equal(leg.rotation.y,0);
  colony.resize(800,600,3);assert.equal(colony.camera.aspect,800/600);assert.equal(frames,4);
  assert.equal(renderer.shadowMap.enabled,true);colony.dispose();colony.dispose();assert.ok(resources.every(resource=>resource.disposed===1));assert.throws(()=>colony.update(.1),/disposed/);assert.deepEqual(renderer.shadowMap,{enabled:false,type:123});
  const dense=createColonyScene({THREE:T,renderer,count:48});dense.update(.1);dense.update(.1);dense.setProgress(1);for(let i=0;i<250;i++)dense.update(.02);
  const agents=dense.scene.children.filter((item:any)=>item.children.length===14);assert.equal(agents.length,48);assert.equal(dense.state.batches,8);
  let minimumDistance=Infinity;for(let i=0;i<agents.length;i++)for(let j=0;j<i;j++)minimumDistance=Math.min(minimumDistance,Math.hypot(agents[i].position.x-agents[j].position.x,agents[i].position.z-agents[j].position.z));
  assert.ok(minimumDistance>.93,'Every assembled ant has a unique, body-sized spaced destination even at the count limit');
  assert.ok(agents.every((agent:any)=>agent.children.slice(7,13).every((leg:any)=>leg.rotation.y===0&&leg.rotation.z===0)),'Stationary ants stop striding');
  const beforeCamera=dense.camera.position.z;dense.resize(390,600,1);assert.ok(Number.isFinite(dense.camera.position.z)&&dense.camera.position.z>beforeCamera,'Narrow view moves back to preserve the scene bounds');
  dense.dispose();assert.ok(resources.every(resource=>resource.disposed===1));assert.deepEqual(renderer.shadowMap,{enabled:false,type:123});
});
