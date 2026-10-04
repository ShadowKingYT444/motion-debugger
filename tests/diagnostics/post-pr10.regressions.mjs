/** Opt-in regression specifications for the post-PR #10 audit.
 * Run in an installed checkout:
 *   node --import tsx --test tests/diagnostics/post-pr10.regressions.mjs
 * These tests assert the desired behavior and FAIL on fde065c.
 * All timelines and report envelopes below are synthetic unit fixtures, not
 * browser evidence, a completed demo, or an aesthetic/performance benchmark.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeActors} from '../../packages/core/actor-analysis.ts';
import {reviewRecipe,reviewSummary} from '../../packages/core/review.ts';
import {probeClassification} from '../../packages/core/replay.ts';

const pose = x => ({position:{x,y:20,space:'screen',unit:'css-px'}});
function plan({maxResponseMs=80,maxSettlingMs=500}={}) {
  return {schemaVersion:1,id:'audit-move',clock:'browser-monotonic-ms',
    actors:[{id:'part',binding:{kind:'dom',selector:'#part'},sources:[{file:'motion.js',line:1}],protectedAttributes:['geometry']}],
    beats:[{id:'move-part',actorIds:['part'],trigger:'Click #move-part',purpose:'Move the selected part to its destination',from:pose(0),to:pose(100),after:[],overlapMs:0,durationMs:300}],
    inputPolicy:{mode:'retarget',winner:'latest-input',carry:'position-and-velocity'},
    acceptance:{usefulCompletion:'Selected part remains at its destination',forbiddenVisible:['#error'],reducedMotion:'meaningful-final-pose',actors:[{actorId:'part',destination:pose(100),positionToleranceCssPx:1,orientationToleranceRad:.02,maxStepAt60HzPx:50,maxResponseMs,maxSettlingMs,requiredTravelCssPx:90,continuity:'position',identityRequired:true}]},
    edits:{permittedFiles:['motion.js'],protectedFiles:['design.css'],parameters:['pose-path']}};
}
function recipe({durationMs=1200,settleMs=100}={}) {
  return {url:'http://127.0.0.1:4400/',selector:'#stage',actions:[{action:'click',selector:'#move-part'}],durationMs,viewport:{width:800,height:600},
    actors:[{id:'part',kind:'dom',selector:'#part',acceptance:{continuity:'position',inputPolicy:'retarget',maxStepAt60HzPx:50,maxReplacements:0,destination:{x:100,y:20,tolerancePx:1,deadlineMs:1100,settleMs},minTravelPx:90}}],
    contract:{outcomes:{required:[{id:'done',selector:'#done',visible:true}],forbiddenVisible:['#error']}}};
}
const input = (id,t,selector='#move-part') => ({id,t,type:'click',label:selector,origin:'browser-observed',detail:{trusted:true,selector}});
function samplesAt(position,duration=1200) {
  return Array.from({length:duration/20+1},(_,i)=>({actorId:'part',kind:'dom',origin:'browser-observed',t:i*20,observedAtMs:i*20,nodeId:'stable-part',visible:true,screen:{x:position(i*20),y:20,width:30,height:30},transform:null}));
}
function report(samples,events,configuration=recipe()) {
  return {schemaVersion:'2.0',id:'00000000-0000-4000-8000-000000000001',createdAt:'2026-10-04T00:00:00.000Z',recipe:configuration,
    events,actorSamples:samples,actorAnalysis:analyzeActors(samples,events,configuration),samples:[],metrics:{sufficientEvidence:true},assertions:[],findings:[],
    delivery:{status:'passed',required:[],forbiddenVisible:[],elapsedMs:configuration.durationMs,reasons:[]},
    final:{visible:true,attributes:{},text:'Synthetic done state',x:0,y:0,opacity:1},environment:{viewport:{width:800,height:600}},
    artifacts:{directory:'unit-only',report:'unit-only',video:'unit-only-not-a-recording',poster:'',finalScreenshot:'',videoOffsetMs:0},limitations:['Synthetic unit fixture.']};
}
const linear = (t,start,end) => Math.max(0,Math.min(1,(t-start)/(end-start)))*100;

test('control: one correctly bound input and a stable destination can pass',()=>{
  const result=reviewSummary(report(samplesAt(t=>linear(t,100,300)),[input('move',100)]),plan());
  assert.equal(result.summary.outcome,'passed');
});

test('R1: plan-required forbidden states cannot be removed from the recipe',()=>{
  const weakened=recipe();weakened.contract.outcomes.forbiddenVisible=[];
  assert.throws(()=>reviewRecipe(plan(),weakened),/forbidden|outcome|acceptance/i);
});

test('R1b: dropping just one required error state is also rejected',()=>{
  const p=plan();p.acceptance.forbiddenVisible.push('#fatal');
  assert.throws(()=>reviewRecipe(p,recipe()),/forbidden|outcome|acceptance/i);
});

test('R2: do not rate a later actor from an unrelated earlier input',()=>{
  const observations=samplesAt(t=>linear(t,600,800));
  const events=[input('unrelated',100,'#unrelated'),input('move',600)];
  const result=reviewSummary(report(observations,events),plan());
  const actualFirstChange=observations.find(s=>s.t>600&&s.screen.x>.5).t-600;
  assert.equal(actualFirstChange,20,'Independent fixture oracle');
  // A future implementation can bind the correct input or explicitly abstain.
  // It must not issue a false failed response based on the unrelated click.
  assert.notEqual(result.transitions[0].measurements.responseStatus,'failed');
});

test('R3: historical arrival cannot pass a later departure without another input',()=>{
  const observations=samplesAt(t=>t<=500?linear(t,100,300):100+2*linear(t,500,900));
  const value=report(observations,[input('move',100)]);
  assert.equal(observations.at(-1).screen.x,300,'Final pose is 200px outside the destination');
  assert.notEqual(value.actorAnalysis.actors[0].assertions.find(a=>a.id==='actor:part:arrival').status,'passed');
  assert.notEqual(reviewSummary(value,plan()).summary.outcome,'passed');
});

test('R4: incomplete recording cannot erase an already definite product failure',()=>{
  const value=report(samplesAt(t=>linear(t,100,300)),[input('move',100)]);
  value.status='incomplete';value.delivery.status='failed';
  value.delivery.forbiddenVisible=[{selector:'#error',observedAtMs:200,text:'Save failed'}];
  value.delivery.reasons=['A visible forbidden state was observed before the later action failed'];
  value.failure={stage:'interaction',actionIndex:1,action:'click',elapsedMs:600,message:'A later action did not complete'};
  assert.equal(probeClassification(value),'failed');
});

test('control: incomplete capture with no established product defect stays infrastructure failure',()=>{
  const value=report([],[]);value.status='incomplete';value.delivery.status='unverified';value.metrics.sufficientEvidence=false;
  assert.equal(probeClassification(value),'infrastructure-failure');
});
