import test from 'node:test';
import assert from 'node:assert/strict';
import {ReviewSchema,reviewFrameTimes,reviewSummary,motionReview} from '../../packages/core/review';
import {interruptionRecipes,probeClassification,motionProbe} from '../../packages/core/replay';
import {validateDetail} from '../../packages/core/frames';
import type {MotionCapture} from '../../packages/core/types';
import type {TransitionPlan} from '../../packages/core/transitions';
const plan={id:'test',actors:[],acceptance:{actors:[]}} as unknown as TransitionPlan;
const report=()=>({id:'1',recipe:{url:'http://localhost:4000',selector:'#target',actions:[],durationMs:1000},environment:{viewport:{width:800,height:600}},events:[{id:'e1',t:100,type:'click',origin:'browser-observed',detail:{trusted:true}},{id:'e2',t:350,type:'keydown',origin:'browser-observed',detail:{trusted:true}}],metrics:{sufficientEvidence:true},assertions:[],findings:[],delivery:{status:'passed'},artifacts:{video:'/native.webm'},limitations:[]} as unknown as MotionCapture);
test('event evidence prioritizes an actual interruption and keeps arrival within frame budget',()=>{
  assert.deepEqual(reviewFrameTimes(report(),3),[100,350,1000]);
  const flagged=report();flagged.findings=[{type:'frame-step',confidence:'contract-violation',sampleTimes:[400],eventIds:[],summary:'seeded reset'}];
  assert.deepEqual(reviewFrameTimes(flagged,3),[340,400,460]);
  assert.throws(()=>reviewFrameTimes(report(),7));
});
test('review frames prioritize the earliest observed forbidden error over motion findings',()=>{
  const failed=report();
  failed.findings=[{type:'frame-step',confidence:'contract-violation',sampleTimes:[400],eventIds:[],summary:'seeded reset'}];
  failed.delivery={status:'failed',required:[],elapsedMs:1000,reasons:['Visible caught error'],forbiddenVisible:[{selector:'#later-error',observedAtMs:600,text:'Later error'},{selector:'#task-error',observedAtMs:280,text:'Illegal invocation'}]};
  assert.deepEqual(reviewFrameTimes(failed,1),[280]);
  assert.deepEqual(reviewFrameTimes(failed,3),[220,280,340]);
  assert.deepEqual(reviewFrameTimes(failed,6),[100,220,280,340,350,1000]);
});
test('review keeps incomplete, weak, delivery failure and scene annotation outcomes distinct',()=>{
  assert.equal(reviewSummary(report(),plan).summary.outcome,'passed');
  assert.equal(reviewSummary({...report(),status:'incomplete'},plan).summary.outcome,'failed');
  assert.equal(reviewSummary({...report(),metrics:{...report().metrics,sufficientEvidence:false}},plan).summary.outcome,'unverified');
  assert.equal(reviewSummary({...report(),delivery:undefined},plan).summary.outcome,'unverified');
  assert.equal(reviewSummary(report(),plan).summary.motionPreference,'unverified');
});
test('interruption grid retains non-monotonic offsets and refuses excessive native time/actions',()=>{
  const recipe={url:'http://localhost:4000',selector:'#target',actions:[{action:'click' as const,selector:'#open'},{action:'key' as const,key:'Escape' as const}],durationMs:1000};
  const request={recipe,beforeActionIndex:1,offsetsMs:[300,20,180]};
  const attempts=interruptionRecipes(request,{artifactRoot:'/unused'});
  assert.deepEqual(attempts.map(recipe=>recipe.actions[1]),[{action:'wait',ms:300},{action:'wait',ms:20},{action:'wait',ms:180}]);
  assert.throws(()=>interruptionRecipes({...request,maxTotalCaptureMs:2000},{artifactRoot:'/unused'}),/budget/);
  assert.throws(()=>interruptionRecipes({...request,beforeActionIndex:2},{artifactRoot:'/unused'}),/existing action/);
  assert.throws(()=>interruptionRecipes({...request,offsetsMs:[20,20]},{artifactRoot:'/unused'}),/unique/);
});
test('weak/incomplete captures cannot masquerade as application failures in offset probes',()=>{
  assert.equal(probeClassification(report()),'passed');
  assert.equal(probeClassification({...report(),status:'incomplete'}),'infrastructure-failure');
  assert.equal(probeClassification({...report(),metrics:{...report().metrics,sufficientEvidence:false}}),'infrastructure-failure');
  assert.equal(probeClassification({...report(),delivery:undefined}),'unverified');
});
test('detail crops must preserve native viewport provenance',()=>{
  validateDetail({x:20,y:30,width:100,height:100},{width:800,height:600});
  for(const crop of [{x:-1,y:0,width:100,height:100},{x:0,y:0,width:900,height:100},{x:0,y:NaN,width:100,height:100}])assert.throws(()=>validateDetail(crop,{width:800,height:600}));
});
test('new review validates plans before reading arbitrary files or opening browsers',async()=>{
  assert.throws(()=>ReviewSchema.parse({plan:{},recipe:report().recipe}));
  await assert.rejects(motionReview({plan:{} as never,recipe:{url:'http://localhost:4000',selector:'#target',actions:[]}},{artifactRoot:'/unused'}));
  const controller=new AbortController();controller.abort();
  await assert.rejects(motionProbe({recipe:{url:'http://localhost:4000',selector:'#target',actions:[]},beforeActionIndex:0,offsetsMs:[10]},{artifactRoot:'/unused',signal:controller.signal}));
});
