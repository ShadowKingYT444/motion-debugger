import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,validateLocalUrl,validateRecipe} from '../../packages/core/index';
import type {MotionSample,CaptureRecipe} from '../../packages/core/types';
const options={artifactRoot:'/tmp/motion-v2-unit'};
const recipe:CaptureRecipe={url:'http://127.0.0.1:4173/examples',selector:'#target',actions:[],durationMs:1000,contract:{maxFrameStepPx:20,maxHeightStepPx:2,containment:{selector:'#container',maxOverflowPx:1},final:{attributes:{'data-state':'ready'}}}};
const final={visible:true,attributes:{'data-state':'ready'},text:'ready',x:10,y:10,opacity:1};
function samples():MotionSample[]{return Array.from({length:65},(_,i)=>({t:i*16,nodeId:'node-1',logicalId:'target',x:10+i,y:10,width:100,height:100,opacity:1,translateX:i,translateY:0,scaleX:1,scaleY:1,rotationDeg:0,animationTime:null,containmentOverflowPx:0,containerRect:{x:0,y:0,width:300,height:300}}))}
test('generic contracts reject local protocol, credential, remote and hidden recipe expansion',()=>{
  for(const url of ['https://example.com','file:///tmp/index.html','http://user:password@localhost:4173','http://127.0.0.1:4173?token=secret','http://127.0.0.2:4173'])assert.throws(()=>validateLocalUrl(url));
  assert.throws(()=>validateRecipe({...recipe,script:'alert(1)'},options));
  assert.throws(()=>validateRecipe({...recipe,actions:[{action:'fill',selector:'input',value:'secret'}]},options));
  assert.throws(()=>validateRecipe({...recipe,viewport:{width:320,height:320},actions:[{action:'move',x:900,y:10}]},options));
  assert.ok(validateRecipe(recipe,options));
});
test('empty/null evidence cannot pass temporal contracts',()=>{
  const result=analyze([],[],recipe,final);assert.equal(result.assertions.find(a=>a.id==='valid-trajectory')?.passed,false);assert.equal(result.assertions.find(a=>a.id==='containment')?.passed,false);
});
test('finite trajectories pass while actual height jump/containment overflow fail supplied contracts',()=>{
  const good=analyze(samples(),[],recipe,final);assert.ok(good.assertions.every(a=>a.passed));
  const bad=samples();bad[25].height=280;bad[25].containmentOverflowPx=25;
  const result=analyze(bad,[],recipe,final);assert.equal(result.metrics.maxHeightStepPx,180);assert.equal(result.metrics.maxContainmentOverflowPx,25);assert.equal(result.assertions.find(a=>a.id==='height-step')?.passed,false);assert.equal(result.assertions.find(a=>a.id==='containment')?.passed,false);
});

test('actual CI drawer traces separate reset jumps from legitimate motion despite variable cadence',async()=>{
  const {readFile}=await import('node:fs/promises');
  const traces=JSON.parse(await readFile('tests/v2/fixtures/drawer-cadence.json','utf8'));
  const contractRecipe={...recipe,durationMs:2400,contract:{maxStepAt60HzPx:40,maxSampleGapMs:80}};
  const before=analyze(traces.before.samples,[],contractRecipe,traces.before.final);
  const after=analyze(traces.after.samples,[],contractRecipe,traces.after.final);
  assert.equal(before.metrics.maxFrameStepPx,151.49);
  assert.equal(after.metrics.maxFrameStepPx,49.584);
  assert.equal(before.metrics.maxStepAt60HzPx,96.367);
  assert.equal(after.metrics.maxStepAt60HzPx,37.579);
  assert.equal(before.assertions.find(a=>a.id==='normalized-step')?.passed,false);
  assert.equal(after.assertions.find(a=>a.id==='normalized-step')?.passed,true);
});
