import test from 'node:test';
import assert from 'node:assert/strict';
import {computeMetrics,diagnose,compareAssertions,validTrajectory} from '../server/analysis';
import {fixtureSources} from '../server/source-map';
import type {CaptureReport,FrameSample,TraceEvent} from '../src/types';

function event(id:string,type:string,t:number,nodeId?:string,detail:TraceEvent['detail']={}):TraceEvent{return {id,type,t,nodeId,detail,label:type,origin:'browser-observed'}};
function fixtureReport(mode:'baseline'|'fixed'):CaptureReport {
  const samples:FrameSample[]=Array.from({length:141},(_,i)=>{
    const t=i*16.67;
    const elapsed=mode==='baseline' && t>=350 ? t-350 : t;
    const progress=Math.min(elapsed/1400,1),translateX=-240+240*progress;
    return {t,nodeId:mode==='baseline'&&t>=350?'new':'old',x:400+translateX,y:100,width:320,height:240,opacity:.1+.9*progress,translateX,animationTime:elapsed};
  });
  const events=[event(`${mode}-mount`,'react-mount',1,'old'),event(`${mode}-start`,'animation-start',1,'old'),event(`${mode}-add`,'dom-add',2,'old',{cardId:'card-42'}),event(`${mode}-response`,'request-resolve',350),event(`${mode}-update`,'state-update',351)];
  if(mode==='baseline')events.push(event('unmount','react-unmount',352,'old'),event('cancel','animation-cancel',352,'old',{active:true,animationTime:350}),event('remove','dom-remove',353,'old',{cardId:'card-42'}),event('remount','react-mount',353,'new'),event('new-start','animation-start',353,'new'),event('new-add','dom-add',354,'new',{cardId:'card-42'}));
  return {mode,events,samples,metrics:computeMetrics(events,samples),durationMs:2350,finalState:{cardId:'card-42',revision:1,title:'Motion lab workspace',status:'ready'},media:{videoUrl:null,videoOffsetMs:0,posterUrl:'',finalUrl:'',mimeType:'video/webm',durationMs:2350},assertions:['api','console','dom-state','samples'].map(suffix=>({id:`${mode}-${suffix}`,label:suffix,passed:true,detail:'Synthetic unit-test input only'}))};
}
test('complete fixture proof establishes deterministic diagnosis and six cross-run assertions',()=>{
  const b=fixtureReport('baseline'),f=fixtureReport('fixed');
  assert.ok(validTrajectory(b));assert.ok(validTrajectory(f));
  assert.equal(diagnose(b,f,[]).confidence,'verified-fixture');
  assert.ok(compareAssertions(b,f).every(a=>a.passed));
  assert.equal(b.metrics.animationStarts,2);assert.equal(f.metrics.animationStarts,1);
});
test('API correlation without cancellation/replacement is not a diagnosis',()=>{
  const b=fixtureReport('fixed');b.mode='baseline';
  assert.equal(diagnose(b,fixtureReport('fixed'),[]).confidence,'inconclusive');
});
test('source references point at exact existing fixture snippets',async()=>{
  const sources=await fixtureSources(process.cwd());
  assert.deepEqual(Object.keys(sources).sort(),['cancel-on-unmount','mount-only-entrance','render-key','request-state'].sort());
  assert.match(sources['render-key'].excerpt,/card\.id : card\.revision/);
  assert.match(sources['cancel-on-unmount'].excerpt,/animation\.cancel\(\)/);
});
