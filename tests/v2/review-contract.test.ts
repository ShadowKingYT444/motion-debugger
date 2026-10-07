import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {reviewRecipe,reviewSummary,reviewFrameTimes,motionReview,interactionEpochs} from '../../packages/core/review';
import {inspect} from '../../packages/core/capture';
import {validateRecipe,RecipeSchema} from '../../packages/core/safety';
import {probeClassification,probeFailureSignature} from '../../packages/core/replay';
import type {TransitionPlan} from '../../packages/core/transitions';
import type {CaptureRecipe,MotionCapture} from '../../packages/core/types';

// Deliberately synthetic unit inputs for contract and filesystem guards only.
// These fixtures are never browser measurements or published passing evidence.
const pose=(x:number)=>({position:{x,y:20,space:'screen' as const,unit:'css-px' as const}});
function plan():TransitionPlan {return {schemaVersion:1,id:'selected-lens',clock:'browser-monotonic-ms',actors:[{id:'lens',binding:{kind:'dom',selector:'#lens'},sources:[{file:'motion.js',line:1}],protectedAttributes:['geometry','material']}],beats:[{id:'handoff',actorIds:['lens'],trigger:'open',purpose:'Keep lens identifiable during its handoff',from:pose(10),to:pose(100),after:[],overlapMs:0,durationMs:300}],inputPolicy:{mode:'retarget',winner:'latest-input',carry:'position-and-velocity'},acceptance:{usefulCompletion:'Lens details shown',forbiddenVisible:['#error'],reducedMotion:'meaningful-final-pose',actors:[{actorId:'lens',destination:pose(100),positionToleranceCssPx:2,orientationToleranceRad:.02,maxStepAt60HzPx:20,maxResponseMs:80,maxSettlingMs:500,requiredTravelCssPx:80,continuity:'position-and-velocity',identityRequired:true}]},edits:{permittedFiles:['motion.js'],protectedFiles:['design.css'],parameters:['pose-path']}};}
function recipe():CaptureRecipe {return {url:'http://127.0.0.1:4400/',selector:'#stage',actions:[],durationMs:1000,viewport:{width:800,height:600},actors:[{id:'lens',kind:'dom',selector:'#lens',acceptance:{continuity:'position-and-velocity',inputPolicy:'retarget',maxStepAt60HzPx:20,maxReplacements:0,destination:{x:100,y:20,tolerancePx:2,deadlineMs:800,settleMs:20},minTravelPx:80}}],contract:{outcomes:{required:[{id:'details',selector:'#details',visible:true}],forbiddenVisible:['#error']}}};}
function report():MotionCapture {return {schemaVersion:'2.0',id:randomUUID(),createdAt:'2026-10-04T00:00:00.000Z',recipe:recipe(),environment:{viewport:{width:800,height:600}},events:[{id:'actual-click',t:100,type:'click',label:'open',origin:'browser-observed',detail:{trusted:true}}],actorSamples:[{actorId:'lens',kind:'dom',origin:'browser-observed',t:80,observedAtMs:80,nodeId:'node-1',screen:{x:10,y:20,width:30,height:30},visible:true,transform:null},{actorId:'lens',kind:'dom',origin:'browser-observed',t:130,observedAtMs:130,nodeId:'node-1',screen:{x:25,y:20,width:30,height:30},visible:true,transform:null},{actorId:'lens',kind:'dom',origin:'browser-observed',t:400,observedAtMs:400,nodeId:'node-1',screen:{x:100,y:20,width:30,height:30},visible:true,transform:null}],actorAnalysis:{version:'1',status:'passed',limitations:[],actors:[{actorId:'lens',kind:'dom',status:'passed',evidence:'browser-geometry',pixelStatus:'unverified',coverage:{sufficient:true,sampleCount:30,maxGapMs:20,reasons:[]},metrics:{maxStepAt60HzPx:10,maxStepPx:10,travelPx:90,replacements:0,maxVelocityChangePxPerMs:.1,arrivalAtMs:400},assertions:[{id:'actor:lens:velocity',label:'Velocity near observed input',passed:true,status:'passed',actual:'0.1 CSS px/ms with adjacent observed estimates',expected:'Explicit supplied velocity bound'}],findings:[]}]},samples:[],metrics:{sufficientEvidence:true},assertions:[],findings:[],delivery:{status:'passed',required:[],forbiddenVisible:[],elapsedMs:1000,reasons:[]},final:{visible:true,attributes:{},text:'details',x:100,y:20,opacity:1},artifacts:{directory:'/untrusted/report-supplied/directory',report:'/untrusted/report.json',video:'',poster:'',finalScreenshot:'',videoOffsetMs:0},limitations:[]} as unknown as MotionCapture;}

test('native review refuses weakened plan bindings, continuity, travel, identity and destination contracts',()=>{
  assert.equal(reviewRecipe(plan(),recipe()).actors![0].id,'lens');
  const refuses=(change:(value:any)=>void,match:RegExp)=>{const value=recipe();change(value);assert.throws(()=>reviewRecipe(plan(),value),match);};
  refuses(value=>value.actors=[],/Missing binding/);
  refuses(value=>value.actors[0].selector='#different',/binding differs/);
  refuses(value=>value.actors[0].acceptance.inputPolicy='cut',/input policy differs/);
  refuses(value=>delete value.actors[0].acceptance.maxStepAt60HzPx,/continuity bound differs/);
  refuses(value=>value.actors[0].acceptance.continuity='none',/continuity policy differs/);
  refuses(value=>delete value.actors[0].acceptance.minTravelPx,/travel bound differs/);
  refuses(value=>value.actors[0].acceptance.maxReplacements=1,/identity continuity/);
  refuses(value=>delete value.actors[0].acceptance.destination,/destination differs/);
  refuses(value=>value.actors[0].acceptance.destination.x=90,/destination differs/);
  refuses(value=>value.actors[0].acceptance.destination.tolerancePx=3,/destination differs/);
  refuses(value=>delete value.contract.outcomes,/missing plan-required functional outcomes/);
  refuses(value=>delete value.contract.outcomes.forbiddenVisible,/missing plan-required forbidden-visible/);
  refuses(value=>value.contract.outcomes.forbiddenVisible=[],/missing plan-required forbidden-visible/);
  const multiple=plan();multiple.acceptance.forbiddenVisible.push('#fatal');assert.throws(()=>reviewRecipe(multiple,recipe()),/#fatal/);
  const preview=plan();preview.clock='controlled-preview-ms';assert.throws(()=>reviewRecipe(preview,recipe()),/Native review requires/);
});

test('absent baseline or response keeps native intent outcome unverified despite declarative actor passes',()=>{
  const baseline=report();const verified=reviewSummary(baseline,plan());assert.equal(verified.summary.outcome,'passed');assert.equal(verified.transitions[0].measurements.inputToObservedGeometryChangeMs,30);assert.equal(verified.transitions[0].measurements.settlingMs,300);
  const missingBefore=report();missingBefore.actorSamples=missingBefore.actorSamples!.slice(1);const beforeSummary=reviewSummary(missingBefore,plan());assert.equal(beforeSummary.transitions[0].measurements.responseStatus,'unverified');assert.equal(beforeSummary.summary.outcome,'unverified');
  const frozen=report();frozen.actorSamples!.forEach(sample=>{sample.screen!.x=10;});const responseSummary=reviewSummary(frozen,plan());assert.equal(responseSummary.transitions[0].measurements.responseStatus,'failed');assert.equal(responseSummary.summary.outcome,'failed');assert.equal(responseSummary.transitions[0].measurements.responseEpochs[0].status,'failed');
});

test('response and settling use observed trusted input and enforce required bounds separately',()=>{
  const slow=report();slow.actorSamples![1].observedAtMs=200;slow.actorSamples![1].t=200;assert.equal(reviewSummary(slow,plan()).transitions[0].measurements.responseStatus,'failed');assert.equal(reviewSummary(slow,plan()).summary.outcome,'failed');
  const late=report();late.actorAnalysis!.actors[0].metrics.arrivalAtMs=700;const summary=reviewSummary(late,plan());assert.equal(summary.transitions[0].measurements.settlingMs,600);assert.equal(summary.transitions[0].measurements.settlingStatus,'failed');assert.equal(summary.summary.outcome,'failed');
  const orientation=plan();orientation.acceptance.actors[0].destination.orientationRad=[0,1,0];assert.equal(reviewSummary(report(),orientation).summary.outcome,'unverified');
  const world=plan();world.acceptance.actors[0].destination.position={x:1,y:2,space:'world',unit:'scene-unit'};assert.equal(reviewSummary(report(),world).transitions[0].measurements.destinationStatus,'unverified-projection');assert.equal(reviewSummary(report(),world).summary.outcome,'unverified');
});

test('synthetic app input cannot establish response or displace trusted frame-selection events',()=>{
  const synthetic=report();synthetic.events[0].detail.trusted=false;const summary=reviewSummary(synthetic,plan());assert.equal(summary.transitions[0].measurements.responseStatus,'unverified');assert.equal(summary.transitions[0].measurements.settlingStatus,'unverified');assert.equal(summary.summary.outcome,'unverified');assert.ok(!reviewFrameTimes(synthetic,3).includes(100));
  const mixed=report();mixed.events.unshift({...mixed.events[0],id:'synthetic-before-input',t:20,detail:{trusted:false}});assert.equal(reviewSummary(mixed,plan()).transitions[0].measurements.inputToObservedGeometryChangeMs,30);
  mixed.actorAnalysis!.actors[0].findings=[{type:'position-step',summary:'Synthetic unit finding',sampleTimes:[140],eventIds:[]}];assert.equal(reviewSummary(mixed,plan()).transitions[0].windows[0].input!.id,'actual-click');
});

test('definite useful-outcome failure survives weak cadence and failure signatures distinguish defects',()=>{
  const weak=report();weak.metrics.sufficientEvidence=false;weak.delivery!.status='failed';weak.delivery!.forbiddenVisible=[{selector:'#error',observedAtMs:300,text:'Error'}];assert.equal(probeClassification(weak),'failed');assert.deepEqual(probeFailureSignature(weak),['forbidden-visible:#error']);
  const reset=report();reset.assertions=[{id:'actor:lens:position',label:'Position',passed:false,status:'failed',actual:'unit reset',expected:'continuous'}];assert.deepEqual(probeFailureSignature(reset),['actor:lens:position']);assert.notDeepEqual(probeFailureSignature(reset),probeFailureSignature(weak));
});

test('every explicitly mapped input epoch is evaluated and an earlier violation cannot be hidden by a passing final input',()=>{
  const value=report();value.recipe.actions=[{action:'click',selector:'#go'},{action:'click',selector:'#back'}];value.recipe.intent={schemaVersion:1,beats:[{beatId:'handoff',actionIndexes:[0,1]}]};
  value.events=[{id:'go',t:100,type:'click',label:'generic',origin:'browser-observed',detail:{trusted:true,selector:'#go',actionIndex:0}},{id:'back',t:600,type:'click',label:'generic',origin:'browser-observed',detail:{trusted:true,selector:'#back',actionIndex:1}}];
  value.actorSamples=Array.from({length:61},(_,index)=>{const t=index*20,x=t<320?10:t<620?40:100;return{...report().actorSamples![0],t,observedAtMs:t,screen:{...report().actorSamples![0].screen!,x}}});value.actorAnalysis!.actors[0].metrics.arrivalAtMs=700;
  const measurement=reviewSummary(value,plan()).transitions[0].measurements;assert.equal(measurement.inputAttribution,'explicit-action-metadata');assert.deepEqual(measurement.responseEpochs.map((epoch:any)=>epoch.responseMs),[220,20]);assert.deepEqual(measurement.responseEpochs.map((epoch:any)=>epoch.status),['failed','passed']);assert.equal(measurement.responseStatus,'failed');assert.equal(reviewSummary(value,plan()).summary.outcome,'failed');
  delete value.recipe.intent;const unknown=reviewSummary(value,plan()).transitions[0].measurements;assert.equal(unknown.inputAttribution,'unattributable');assert.equal(unknown.responseStatus,'unverified');
});
test('no-change response exemption uses the uniquely mapped beat target, not the global final destination',()=>{
  const value=report(),twoBeatPlan=plan();
  twoBeatPlan.beats=[
    {id:'go',actorIds:['lens'],trigger:'go',purpose:'Move away from the final pose',from:pose(100),to:pose(50),after:[],overlapMs:0,durationMs:300},
    {id:'back',actorIds:['lens'],trigger:'back',purpose:'Return to the final pose',from:pose(50),to:pose(100),after:['go'],overlapMs:0,durationMs:300}
  ];
  value.recipe.actions=[{action:'click',selector:'#go'},{action:'click',selector:'#back'}];
  value.recipe.intent={schemaVersion:1,beats:[{beatId:'go',actionIndexes:[0]},{beatId:'back',actionIndexes:[1]}]};
  value.events=[{id:'go',t:100,type:'click',label:'go',origin:'browser-observed',detail:{trusted:true,selector:'#go',actionIndex:0}},{id:'back',t:600,type:'click',label:'back',origin:'browser-observed',detail:{trusted:true,selector:'#back',actionIndex:1}}];
  value.actorSamples=Array.from({length:61},(_,index)=>({...report().actorSamples![0],t:index*20,observedAtMs:index*20,screen:{...report().actorSamples![0].screen!,x:100}}));
  value.actorAnalysis!.actors[0].metrics.arrivalAtMs=600;
  assert.doesNotThrow(()=>reviewRecipe(twoBeatPlan,value.recipe));
  const summary=reviewSummary(value,twoBeatPlan);
  assert.deepEqual(summary.transitions[0].measurements.responseEpochs.map((epoch:any)=>epoch.status),['failed','no-change-valid-pose']);
  assert.equal(summary.transitions[0].measurements.responseStatus,'failed');
  assert.equal(summary.summary.outcome,'failed');
});
test('a uniquely mapped input already at its own screen-space beat target remains a valid no-op',()=>{
  const value=report();value.recipe.intent={schemaVersion:1,beats:[{beatId:'handoff',actionIndexes:[0]}]};value.events[0].detail.actionIndex=0;
  value.actorSamples=Array.from({length:51},(_,index)=>({...report().actorSamples![0],t:index*20,observedAtMs:index*20,screen:{...report().actorSamples![0].screen!,x:100}}));
  value.actorAnalysis!.actors[0].metrics.arrivalAtMs=100;
  const summary=reviewSummary(value,plan());assert.equal(summary.transitions[0].measurements.responseEpochs[0].status,'no-change-valid-pose');assert.equal(summary.transitions[0].measurements.responseStatus,'passed');assert.equal(summary.summary.outcome,'passed');
});
test('ambiguous beat-to-action correspondence cannot grant a no-change response pass',()=>{
  const value=report(),ambiguous=plan();ambiguous.beats.push({id:'alternate',actorIds:['lens'],trigger:'alternate',purpose:'A second possible target',from:pose(100),to:pose(50),after:[],overlapMs:0,durationMs:300});
  value.recipe.intent={schemaVersion:1,beats:[{beatId:'handoff',actionIndexes:[0]},{beatId:'alternate',actionIndexes:[0]}]};value.events[0].detail.actionIndex=0;value.actorSamples=Array.from({length:51},(_,index)=>({...report().actorSamples![0],t:index*20,observedAtMs:index*20,screen:{...report().actorSamples![0].screen!,x:100}}));
  const summary=reviewSummary(value,ambiguous);assert.equal(summary.transitions[0].measurements.responseEpochs[0].status,'unverified-target-correspondence');assert.equal(summary.transitions[0].measurements.responseStatus,'unverified');assert.equal(summary.summary.outcome,'unverified');
});
test('pointer epochs require concrete contact and control identity, including overlap and cancellation',()=>{
  const event=(id:string,t:number,type:string,selector:string,pointerId?:number)=>({id,t,type,label:'Pointer moved',origin:'browser-observed' as const,detail:{trusted:true,selector,...(pointerId===undefined?{}:{pointerId,pointerType:'mouse'})}});
  const epochs=interactionEpochs([event('go-down',100,'pointerdown','#go',1),event('back-down',110,'pointerdown','#back',2),event('back-up',120,'pointerup','#back',2),event('back-click',125,'click','#back',2),event('go-up',130,'pointerup','#go',1),event('go-click',135,'click','#go',1)]);assert.deepEqual(epochs.map(epoch=>epoch.events.map(item=>item.id)),[['back-down','back-up','back-click'],['go-down','go-up','go-click']]);assert.deepEqual(epochs.map(epoch=>epoch.clock.id),['back-click','go-click']);
  const canceled=interactionEpochs([event('down',10,'pointerdown','#go',4),event('cancel',20,'pointercancel','#go',4)]);assert.equal(canceled.length,1);assert.equal(canceled[0].clock.id,'cancel');
  const uncertain=interactionEpochs([event('down-u',10,'pointerdown','#go'),event('up-u',20,'pointerup','#go'),event('click-u',25,'click','#go')]);assert.equal(uncertain.length,3);assert.ok(uncertain.every(epoch=>epoch.association==='uncertain'));
});

test('reused review writes only beneath validated artifact root, ignoring report-supplied directory',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'motion-review-boundary-'));try {
    const outside=path.join(root,'outside'),artifactRoot=path.join(root,'evidence'),value=report(),directory=path.join(artifactRoot,value.id);await mkdir(directory,{recursive:true});await mkdir(outside);await writeFile(path.join(outside,'review.json'),'Owned sentinel');value.artifacts.directory=outside;value.recipe=validateRecipe(value.recipe,{artifactRoot});
    await writeFile(path.join(directory,'report.json'),JSON.stringify(value));const result=await motionReview({plan:plan(),recipe:RecipeSchema.parse(recipe()),captureId:value.id,budget:{maxFrames:1}},{artifactRoot});assert.equal(result.metadata.summary.outcome,'unverified','Missing native recording cannot establish a passed review');assert.equal(path.dirname(result.metadata.packet),directory);assert.match(path.basename(result.metadata.packet),/^review-[a-f0-9-]+\.json$/);assert.equal(await readFile(path.join(outside,'review.json'),'utf8'),'Owned sentinel');assert.deepEqual(await readdir(outside),['review.json']);assert.equal((await inspect(value.id,{artifactRoot})).id,value.id);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('inspect refuses symlinked capture directories/reports and mismatched report identities',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'motion-inspect-symlink-'));try {
    const artifactRoot=path.join(root,'evidence'),owned=path.join(root,'owned'),value=report();await mkdir(artifactRoot);await mkdir(owned);await writeFile(path.join(owned,'report.json'),JSON.stringify(value));const directory=path.join(artifactRoot,value.id);await symlink(owned,directory,'dir');await assert.rejects(inspect(value.id,{artifactRoot}),/symlinks/);await rm(directory);await mkdir(directory);await symlink(path.join(owned,'report.json'),path.join(directory,'report.json'));await assert.rejects(inspect(value.id,{artifactRoot}),/symlinks/);await rm(path.join(directory,'report.json'));await writeFile(path.join(directory,'report.json'),JSON.stringify({...value,id:randomUUID()}));await assert.rejects(inspect(value.id,{artifactRoot}),/identity or schema/);await writeFile(path.join(directory,'report.json'),JSON.stringify({...value,schemaVersion:'historical-other-schema'}));await assert.rejects(inspect(value.id,{artifactRoot}),/identity or schema/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('pre-input arrival cannot establish settling after the trigger',()=>{const value=report();value.actorAnalysis!.actors[0].metrics.arrivalAtMs=50;const result=reviewSummary(value,plan());assert.equal(result.transitions[0].measurements.settlingStatus,'unverified');assert.equal(result.summary.outcome,'unverified');});

test('requested velocity continuity cannot pass without adequate actor velocity evidence',()=>{
  const missing=report();missing.actorAnalysis!.actors[0].assertions=[];
  const missingResult=reviewSummary(missing,plan());
  assert.equal(missingResult.transitions[0].status,'passed','Synthetic declarative actor pass alone cannot establish requested velocity continuity');
  assert.equal(missingResult.transitions[0].measurements.velocityStatus,'unverified');
  assert.equal(missingResult.summary.outcome,'unverified');
  const weak=report();weak.actorAnalysis!.actors[0].coverage.sufficient=false;
  assert.equal(reviewSummary(weak,plan()).transitions[0].measurements.velocityStatus,'unverified');
  assert.equal(reviewSummary(weak,plan()).summary.outcome,'unverified');
  const inconclusive=report();inconclusive.actorAnalysis!.actors[0].assertions[0].passed=false;inconclusive.actorAnalysis!.actors[0].assertions[0].status='inconclusive';
  assert.equal(reviewSummary(inconclusive,plan()).summary.outcome,'unverified');
  const failed=report();failed.actorAnalysis!.actors[0].assertions[0].passed=false;failed.actorAnalysis!.actors[0].assertions[0].status='failed';
  assert.equal(reviewSummary(failed,plan()).transitions[0].measurements.velocityStatus,'failed');
  assert.equal(reviewSummary(failed,plan()).summary.outcome,'failed','A definite velocity failure stays failed, including with weak overall coverage');
  failed.actorAnalysis!.actors[0].coverage.sufficient=false;assert.equal(reviewSummary(failed,plan()).summary.outcome,'failed');
  const verified=reviewSummary(report(),plan());assert.equal(verified.transitions[0].measurements.velocityStatus,'passed');assert.equal(verified.summary.outcome,'passed');
  const positionOnly=plan();positionOnly.acceptance.actors[0].continuity='position';
  const notRequested=reviewSummary(missing,positionOnly);assert.equal(notRequested.transitions[0].measurements.velocityStatus,'not-requested');assert.equal(notRequested.summary.outcome,'passed');
});
test('feature coverage reports evidence state instead of treating assertion presence as measurement',()=>{
  const missing=report(),features=reviewSummary(missing,plan()).featureCoverage.actors[0].features;assert.equal(features.position.status,'unsupported-unverified');assert.equal(features.velocity.status,'independent-measured-passed');assert.equal(features.destination.status,'unsupported-unverified');
  const insufficient=report();insufficient.actorAnalysis!.actors[0].coverage.sufficient=false;assert.equal(reviewSummary(insufficient,plan()).featureCoverage.actors[0].features.velocity.status,'insufficient');
  const failed=report();failed.actorAnalysis!.actors[0].assertions[0].status='failed';failed.actorAnalysis!.actors[0].assertions[0].passed=false;assert.equal(reviewSummary(failed,plan()).featureCoverage.actors[0].features.velocity.status,'independent-measured-failed');
  const scene=report();scene.actorAnalysis!.actors[0].evidence='app-reported-scene';assert.equal(reviewSummary(scene,plan()).featureCoverage.actors[0].features.velocity.status,'annotation-only');
});
