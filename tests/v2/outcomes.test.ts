import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDelivery,compare} from '../../packages/core/analysis';
import {assessCapture} from '../../packages/core/assessment';
import {validateRecipe} from '../../packages/core/safety';
import type {CaptureRecipe,MotionOutcomeObservation} from '../../packages/core/types';

const recipe:CaptureRecipe={url:'http://127.0.0.1:4173',selector:'#target',actions:[],durationMs:1000,contract:{outcomes:{timeoutMs:900,required:[{id:'result',selector:'#result',visible:true,textIncludes:'Ready',attributes:{'data-state':'complete'}}],forbiddenVisible:['#error']}}};
const observation:MotionOutcomeObservation={id:'result',selector:'#result',count:1,visible:true,text:'Ready',attributes:{'data-state':'complete'},observedAtMs:900,passed:true};
const options={artifactRoot:'/tmp/motion-outcomes-unit'};
test('functional completion is independent of stable trajectory and catches visible caught errors',()=>{
  const failed=analyzeDelivery(recipe,{required:[observation],forbiddenVisible:[{selector:'#error',observedAtMs:100,text:'Illegal invocation'}],elapsedMs:1000});
  assert.equal(failed.status,'failed');assert.match(failed.reasons.join(' '),/forbidden/i);
  assert.equal(analyzeDelivery(recipe,{required:[observation],forbiddenVisible:[],elapsedMs:1000}).status,'passed');
});
test('missing, ambiguous, late, and failed outcomes cannot establish functional completion',()=>{
  for(const required of [[],[{...observation,count:0,passed:false}],[{...observation,count:2,passed:false}],[{...observation,observedAtMs:901}],[{...observation,passed:false}],[{...observation,visible:false}],[{...observation,text:'Pending'}],[{...observation,attributes:{}}],[{...observation,observedAtMs:NaN}]]){
    const result=analyzeDelivery(recipe,{required,forbiddenVisible:[],elapsedMs:1000});assert.equal(result.status,'failed');assert.ok(result.reasons.length);
  }
  assert.equal(analyzeDelivery(recipe,{required:[observation],forbiddenVisible:[],elapsedMs:1000},false).status,'failed');
});
test('exploratory capture has unverified delivery rather than an implied product success',()=>{
  assert.equal(analyzeDelivery({...recipe,contract:undefined}).status,'unverified');
  assert.equal(analyzeDelivery(recipe).status,'unverified');
});
test('outcome schema allows bounded declarative checks and rejects unsafe or vacuous contracts',()=>{
  assert.ok(validateRecipe(recipe,options));
  const cases=[{}, {required:[]}, {required:[{id:'empty',selector:'#target'}]}, {required:[{id:'result',selector:'#target',visible:true,script:'alert(1)'}]}, {timeoutMs:12001,required:recipe.contract!.outcomes!.required}, {required:Array.from({length:13},(_,i)=>({id:String(i),selector:'#x',visible:true}))}, {required:[{id:'x',selector:'#x',attributes:{'data-token':'secret'}}]}, {required:[{id:'x',selector:'#x',textIncludes:''}]}, {required:[{id:'x',selector:'#x',attributes:{}}]}, {required:[{id:'x',selector:'#x',visible:true},{id:'x',selector:'#y',visible:true}]}, {required:recipe.contract!.outcomes!.required,forbiddenVisible:Array(13).fill('#error')}];
  for(const outcomes of cases)assert.throws(()=>validateRecipe({...recipe,contract:{outcomes}},options));
});

test('comparison keeps functional delivery distinct and refuses different outcome contracts',()=>{
  const make=(status:'passed'|'failed')=>({id:status,recipe,metrics:{sufficientEvidence:true},environment:{},coverage:{version:'1'},assertions:['valid-trajectory','browser-errors','network-policy'].map(id=>({id,passed:true})),final:{visible:true,text:'Ready',attributes:{}},findings:[],delivery:{status}} as unknown as import('../../packages/core/types').MotionCapture);
  const before=make('passed'),after=make('failed');
  const result=compare(before,after);
  assert.equal(result.comparable,true);assert.deepEqual(result.contractsPassed,{before:true,after:true});
  assert.deepEqual(result.functionalDelivery,{before:'passed',after:'failed'});assert.match(result.interpretation,/do not prove functional delivery/);
  after.recipe={...recipe,contract:{...recipe.contract,outcomes:{...recipe.contract!.outcomes!,timeoutMs:800}}};
  assert.ok(compare(before,after).comparabilityIssues.includes('Different contract'));
});

test('comparison separates observed actor behavior from evidence validity and reports both directions',()=>{
  const actorRecipe={...recipe,actors:[{id:'part',kind:'dom' as const,selector:'#part',acceptance:{continuity:'position' as const,maxStepAt60HzPx:20}}]};
  const make=(status:'passed'|'failed',value:number)=>({id:`${status}-${value}`,recipe:actorRecipe,status:'complete',metrics:{sufficientEvidence:true},environment:{},coverage:{version:'1'},assertions:['valid-trajectory','browser-errors','network-policy'].map(id=>({id,passed:true,status:'passed'})),actorAnalysis:{version:'1',status,limitations:[],actors:[{actorId:'part',kind:'dom',evidence:'browser-geometry',status,pixelStatus:'unverified',coverage:{sufficient:true,sampleCount:64,maxGapMs:16,reasons:[]},metrics:{maxStepAt60HzPx:value,maxStepPx:value,travelPx:100,replacements:0,maxVelocityChangePxPerMs:0,arrivalAtMs:null},assertions:[{id:'actor:part:position',label:'position',passed:status==='passed',status,actual:String(value),expected:'≤20'}],findings:status==='failed'?[{type:'position-step',summary:'jump',sampleTimes:[400,416],eventIds:[]}]:[]} ]},final:{visible:true,text:'Ready',attributes:{}},findings:[],delivery:{status:'passed'}} as unknown as import('../../packages/core/types').MotionCapture);
  const failed=make('failed',40),passed=make('passed',10),improved=compare(failed,passed);
  assert.equal(improved.comparable,true);assert.deepEqual(improved.contractsPassed,{before:false,after:true});assert.deepEqual(improved.actorContractsPassed,{before:false,after:true});assert.deepEqual(improved.improvements,['actor:part:position']);assert.equal(improved.actorDeltas?.['actor:part:maxStepAt60HzPx'].change,-30);
  const regressed=compare(passed,failed);assert.equal(regressed.comparable,true);assert.deepEqual(regressed.regressions,['actor:part:position']);assert.match(regressed.interpretation,/regresses/);
  failed.actorAnalysis!.actors[0].coverage.sufficient=false;assert.equal(compare(failed,passed).comparable,false);
  failed.actorAnalysis!.actors[0].coverage.sufficient=true;failed.actorAnalysis!.actors[0].kind='scene';failed.actorAnalysis!.actors[0].evidence='app-reported-scene';assert.equal(compare(failed,passed).comparable,false);
});
test('comparison requires exact actor ID/kind correspondence and shared assessment never validates sparse failures',()=>{
  const actorRecipe={...recipe,actors:[{id:'part',kind:'dom' as const,selector:'#part',acceptance:{continuity:'position' as const,maxStepAt60HzPx:20}}]};
  const actor={actorId:'part',kind:'dom' as const,evidence:'browser-geometry' as const,status:'failed' as const,pixelStatus:'unverified' as const,coverage:{sufficient:true,sampleCount:64,maxGapMs:16,reasons:[]},metrics:{maxStepAt60HzPx:40,maxStepPx:40,travelPx:100,replacements:0,maxVelocityChangePxPerMs:0,arrivalAtMs:null},assertions:[{id:'actor:part:position',label:'position',passed:false,status:'failed' as const,actual:'40',expected:'≤20'}],findings:[]};
  const make=()=>({schemaVersion:'2.0' as const,id:'exact',recipe:actorRecipe,status:'complete' as const,metrics:{sufficientEvidence:true},environment:{},coverage:{version:'1'},assertions:['valid-trajectory','browser-errors','network-policy'].map(id=>({id,passed:true,status:'passed'})),actorAnalysis:{version:'1' as const,status:'failed' as const,limitations:[],actors:[structuredClone(actor)]},final:{visible:true,text:'Ready',attributes:{}},findings:[],delivery:{status:'passed'}} as unknown as import('../../packages/core/types').MotionCapture);
  const before=make(),after=make();assert.equal(compare(before,after).comparable,true);assert.equal(assessCapture(before).evidence,'valid');assert.equal(assessCapture(before).behavior,'failed');
  after.actorAnalysis!.actors=[];assert.equal(compare(before,after).comparable,false);assert.match(compare(before,after).comparabilityIssues.join(' '),/missing/);
  after.actorAnalysis!.actors=[structuredClone(actor),structuredClone(actor)];assert.match(compare(before,after).comparabilityIssues.join(' '),/duplicated/);
  after.actorAnalysis!.actors=[{...structuredClone(actor),actorId:'extra'}];assert.match(compare(before,after).comparabilityIssues.join(' '),/missing.*extra/);
  after.actorAnalysis!.actors=[{...structuredClone(actor),kind:'svg'}];assert.match(compare(before,after).comparabilityIssues.join(' '),/kind/);
  const sparse=make();sparse.actorAnalysis!.actors[0].coverage.sufficient=false;assert.equal(assessCapture(sparse).evidence,'insufficient');assert.equal(assessCapture(sparse).behavior,'failed');assert.equal(compare(before,sparse).comparable,false);
});
