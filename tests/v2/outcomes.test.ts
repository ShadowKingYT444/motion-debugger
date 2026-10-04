import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDelivery,compare} from '../../packages/core/analysis';
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
