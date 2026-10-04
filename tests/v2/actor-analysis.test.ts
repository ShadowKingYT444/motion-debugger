import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {installBrowserProbe} from '../../packages/core/browser-probe';
import assert from 'node:assert/strict';
import {analyzeActors} from '../../packages/core/actor-analysis';
import {createSceneActorAdapter} from '../../packages/core/scene-adapter';
import {measurePixelActorContinuity,observeActorPixels} from '../../packages/core/pixel-actors';
import type {CaptureRecipe,MotionActorBinding,MotionActorSample} from '../../packages/core/types';
const binding:MotionActorBinding={id:'part',kind:'dom',selector:'#part',acceptance:{continuity:'position',inputPolicy:'retarget',maxStepAt60HzPx:12,minTravelPx:20}};
const recipe=(actor:MotionActorBinding=binding):CaptureRecipe=>({url:'http://127.0.0.1',selector:'canvas',durationMs:1000,actions:[],actors:[actor]});
function samples(jump=false):MotionActorSample[]{return Array.from({length:64},(_,i)=>({actorId:'part',kind:'dom',origin:'browser-observed',t:i*16,observedAtMs:i*16,nodeId:'node-1',visible:true,screen:{x:i*4+(jump&&i>=24?200:0),y:0,width:10,height:10},transform:null}))}
test('actor geometry identifies internal position change and retains fast intended travel',()=>{
  assert.equal(analyzeActors(samples(),[],recipe()).status,'passed');
  const bad=analyzeActors(samples(true),[],recipe());assert.equal(bad.status,'failed');assert.equal(bad.actors[0].findings[0].type,'position-step');
});
test('direct scrubbing and intentional cuts do not require position or velocity continuity',()=>{
  for(const inputPolicy of ['direct-scrub','cut'] as const){const actor={...binding,acceptance:{...binding.acceptance,inputPolicy}};const result=analyzeActors(samples(true),[],recipe(actor));assert.equal(result.status,'passed');assert.equal(result.actors[0].findings.length,0);}
});
test('scene annotations and spoofed origins cannot establish a visible-motion pass',()=>{
  const actor:MotionActorBinding={...binding,kind:'scene'};
  const annotations=samples().map(sample=>({...sample,kind:'scene' as const,origin:'app-reported' as const,nodeId:null}));
  const result=analyzeActors(annotations,[],recipe(actor));assert.equal(result.status,'unverified');assert.equal(result.actors[0].assertions.every(assertion=>!assertion.passed),true);
  assert.equal(analyzeActors(annotations.map(sample=>({...sample,origin:'browser-observed'})),[],recipe(actor)).actors[0].coverage.sufficient,false);
});
test('actor coverage preserves 80ms gate and refuses absence, duplicate clock and forged samples',()=>{
  const missing=samples();missing[20].visible=false;assert.equal(analyzeActors(missing,[],recipe()).status,'unverified');
  const lag=samples();lag[20].observedAtMs+=81;assert.equal(analyzeActors(lag,[],recipe()).status,'unverified');
  const duplicate=samples();duplicate[20].t=duplicate[19].t;assert.equal(analyzeActors(duplicate,[],recipe()).status,'unverified');
});
test('arrival requires dwell and travel so frozen poses cannot win',()=>{
  const actor={...binding,acceptance:{destination:{x:252,y:0,tolerancePx:5,deadlineMs:1000,settleMs:32},minTravelPx:20}};
  const frozen=samples().map(sample=>({...sample,screen:{...sample.screen!,x:252}}));
  const result=analyzeActors(frozen,[],recipe(actor));assert.equal(result.status,'failed');assert.equal(result.actors[0].metrics.arrivalAtMs,0);assert.equal(result.actors[0].findings[0].type,'travel');
});
test('scene adapter copies after consumer render and bounds actors without adding a scheduler',()=>{
  const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];let batch:any;
  const adapter=createSceneActorAdapter(snapshot=>{batch=snapshot;return true});
  const object={matrixWorld:{elements:[...identity]},visible:true};
  adapter.register({id:'part',object});
  const camera={matrixWorld:{elements:identity},matrixWorldInverse:{elements:identity},projectionMatrix:{elements:identity}};
  assert.equal(adapter.afterRender(camera,{width:500,height:300},42),true);assert.equal(batch[0].screen.x,250);
  object.matrixWorld.elements[12]=.5;assert.equal(batch[0].transform[12],0,'Snapshots do not retain live matrix arrays');
  adapter.afterRender(camera,{width:500,height:300},44);assert.equal(batch[0].screen.x,375);
  for(let i=0;i<15;i++)adapter.register({id:`other${i}`,object});assert.throws(()=>adapter.register({id:'overflow',object}));adapter.dispose();assert.equal(adapter.afterRender(camera,{width:500,height:300}),false);
});
test('separate pixel diagnosis detects actual image jumps even with stationary canvas annotations',()=>{
  const frames=Array.from({length:30},(_,i)=>{const width=100,height=10,rgba=new Uint8Array(width*height*4),x=i<15?2:82;for(let y=0;y<10;y++)for(let j=x;j<x+5;j++){const p=(y*width+j)*4;rgba[p]=20;rgba[p+1]=220;rgba[p+2]=40;rgba[p+3]=255;}return {width,height,cssSize:{width,height},rgba,presentationTimeMs:i*40};});
  const mask={actorId:'part',color:{r:20,g:220,b:40},tolerance:1,minPixels:10};
  assert.equal(measurePixelActorContinuity(frames,mask,{maxStepAt60HzPx:12,inputPolicy:'retarget'}).status,'failed');
  assert.equal(measurePixelActorContinuity(frames,mask,{maxStepAt60HzPx:12,inputPolicy:'direct-scrub'}).status,'not-applicable');
  assert.equal(observeActorPixels(frames,mask)[15].screen?.x,82);
});

test('scene publication copies only opted-in actors, rejects duplicates and invalid registered batches atomically',()=>{
  let clock=0;
  class ElementModel {animate(){throw new Error('unused')}}
  const window:any={addEventListener(){},setTimeout(){return 1}};
  const sandbox={window,Element:ElementModel,document:{addEventListener(){}},MutationObserver:class {observe(){}},performance:{now:()=>clock},MessageChannel:class {port1={onmessage:null};port2={postMessage(){}}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},clearTimeout(){},__name:(value:unknown)=>value};
  runInNewContext(`(${installBrowserProbe.toString()})({selector:'#stage',actors:[{id:'part',kind:'scene'},{id:'missing',kind:'scene'}]})`,sandbox);
  window.__motionProbe.start();clock=20;
  const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],part={actorId:'part',visible:true,screen:{x:10,y:20,width:10,height:10},transform:[...identity],cameraWorldMatrix:[...identity],cameraProjectionMatrix:[...identity]};
  assert.equal(window.__motionActors.publish([part,{actorId:'unconfigured'}],20),true);
  assert.equal(window.__motionProbe.actorSamples.length,1);assert.equal(window.__motionProbe.actorSamples[0].origin,'app-reported');
  part.transform[12]=100;assert.equal(window.__motionProbe.actorSamples[0].transform[12],0);
  assert.equal(window.__motionActors.publish([part,part],20),false);
  assert.equal(window.__motionActors.publish([part,{...part,actorId:'missing',transform:[NaN]}],20),false);
  assert.equal(window.__motionActors.publish(Array.from({length:17},(_,i)=>({actorId:'extra'+i})),20),false);
  assert.equal(window.__motionProbe.actorSamples.length,1,'Rejected batch does not append partial observations');
  const result=analyzeActors(window.__motionProbe.actorSamples,[],{...recipe({id:'part',kind:'scene'}),actors:[{id:'part',kind:'scene'},{id:'missing',kind:'scene'}]});
  assert.equal(result.status,'unverified');assert.equal(result.actors[1].coverage.sampleCount,0);
});

test('explicit requested continuity needs supplied measurement budgets before an actor can pass',()=>{
  const missingPosition:MotionActorBinding={...binding,acceptance:{continuity:'position',minTravelPx:20}};
  const position=analyzeActors(samples(),[],recipe(missingPosition));assert.equal(position.status,'unverified');assert.equal(position.actors[0].assertions.find(assertion=>assertion.id==='actor:part:position')?.status,'inconclusive');
  const missingVelocity:MotionActorBinding={...binding,acceptance:{...binding.acceptance,continuity:'position-and-velocity'}};
  const velocity=analyzeActors(samples(),[],recipe(missingVelocity));assert.equal(velocity.status,'unverified');assert.equal(velocity.actors[0].assertions.find(assertion=>assertion.id==='actor:part:velocity')?.status,'inconclusive');
  const velocityWithoutPosition:MotionActorBinding={...binding,acceptance:{continuity:'position-and-velocity',maxVelocityChangePxPerMs:1,minTravelPx:20}};
  const observedInput={id:'input-1',t:256,type:'click',label:'Actual trusted input unit fixture',origin:'browser-observed' as const,detail:{trusted:true}};
  const partial=analyzeActors(samples(),[observedInput],recipe(velocityWithoutPosition));assert.equal(partial.status,'unverified');assert.equal(partial.actors[0].assertions.find(assertion=>assertion.id==='actor:part:velocity')?.status,'passed');assert.equal(partial.actors[0].assertions.find(assertion=>assertion.id==='actor:part:position')?.status,'inconclusive');
  const supplied:MotionActorBinding={...binding,acceptance:{...binding.acceptance,continuity:'position-and-velocity',maxVelocityChangePxPerMs:1}};
  const absentAdjacency=analyzeActors(samples(),[],recipe(supplied));assert.equal(absentAdjacency.status,'unverified');assert.equal(absentAdjacency.actors[0].assertions.find(assertion=>assertion.id==='actor:part:velocity')?.status,'inconclusive');assert.match(absentAdjacency.actors[0].assertions.find(assertion=>assertion.id==='actor:part:velocity')!.actual,/0 adjacent estimates/);
  assert.equal(analyzeActors(samples(),[observedInput],recipe(supplied)).status,'passed');
});
