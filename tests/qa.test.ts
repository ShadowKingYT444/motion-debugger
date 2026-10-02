import test from 'node:test';
import assert from 'node:assert/strict';
import {compareAssertions, computeMetrics, diagnose} from '../server/analysis';
import type {CaptureReport,FrameSample,TraceEvent} from '../src/types';

// Synthetic inputs below test rejection rules only; they are not captured browser evidence.
const state={cardId:'card-42',revision:1,title:'Motion lab workspace',status:'ready'};
function sample(t:number,x:number|null,opacity:number|null):FrameSample {
  return {t,nodeId:x===null?null:'node',x,y:x===null?null:100,width:x===null?null:300,height:x===null?null:200,opacity,translateX:x===null?null:x-400,animationTime:x===null?null:Math.min(t,1400)};
}
function report(mode:'baseline'|'fixed',events:TraceEvent[]=[],samples:FrameSample[]=[]):CaptureReport {
  return {mode,events,samples,metrics:computeMetrics(events,samples),finalState:{...state},durationMs:2300,
    media:{videoUrl:null,videoOffsetMs:0,posterUrl:'',finalUrl:'',mimeType:'video/webm',durationMs:2300},assertions:[]};
}
function assertion(b:CaptureReport,f:CaptureReport,id:string){return compareAssertions(b,f).find(a=>a.id===id)!;}

test('empty captures do not pass fixed continuity or final geometry',()=>{
  const b=report('baseline'),f=report('fixed');
  assert.equal(assertion(b,f,'fixed-continuity').passed,false);
  assert.equal(assertion(b,f,'final-geometry').passed,false);
});

test('null-only rAF rows cannot stand in for observed trajectories',()=>{
  const samples=Array.from({length:140},(_,i)=>sample(i*17,null,null));
  const b=report('baseline',[],samples),f=report('fixed',[],samples);
  assert.equal(assertion(b,f,'fixed-continuity').passed,false);
  assert.equal(assertion(b,f,'final-geometry').passed,false);
});

test('matching but unfinished endpoints do not pass final geometry',()=>{
  const samples=Array.from({length:140},(_,i)=>sample(i*17,300+Math.min(i,80),0.8));
  const b=report('baseline',[],samples),f=report('fixed',[],samples);
  assert.equal(assertion(b,f,'final-geometry').passed,false);
});

test('non-finite geometry cannot pass fixed continuity',()=>{
  const samples=Array.from({length:140},(_,i)=>sample(i*17,Infinity,1));
  const b=report('baseline',[],samples),f=report('fixed',[],samples);
  assert.equal(assertion(b,f,'fixed-continuity').passed,false);
});

test('a plausible failure chain with a failed API assertion remains inconclusive',()=>{
  const event=(id:string,type:string,t:number,nodeId?:string,detail:TraceEvent['detail']={}):TraceEvent=>({id,type,t,nodeId,detail,label:type,origin:'browser-observed'});
  const events=[event('response','request-resolve',350),event('update','state-update',351),event('unmount','react-unmount',352,'old'),event('cancel','animation-cancel',352,'old',{active:true}),event('remove','dom-remove',353,'old',{cardId:'card-42'}),event('add','dom-add',353,'new',{cardId:'card-42'}),event('start','animation-start',354,'new')];
  const b=report('baseline',events,[sample(330,250,.4),sample(360,200,.1),sample(2300,400,1)]);
  const f=report('fixed',[],[sample(10,200,.1),sample(1400,400,1),sample(2300,400,1)]);
  b.assertions=[{id:'baseline-api',label:'API',passed:false,detail:'HTTP 500'}];
  f.assertions=[{id:'fixed-api',label:'API',passed:true,detail:'HTTP 200'}];
  assert.equal(diagnose(b,f,[]).confidence,'inconclusive');
});

test('missing capture assertions cannot create verified-fixture confidence',()=>{
  const event=(id:string,type:string,t:number,nodeId?:string,detail:TraceEvent['detail']={}):TraceEvent=>({id,type,t,nodeId,detail,label:type,origin:'browser-observed'});
  const baselineEvents=[event('mount1','react-mount',1,'old'),event('add1','dom-add',1,'old',{cardId:'card-42'}),event('start1','animation-start',1,'old'),event('response','request-resolve',350),event('update','state-update',351),event('unmount','react-unmount',352,'old'),event('cancel','animation-cancel',352,'old',{active:true}),event('remove','dom-remove',353,'old',{cardId:'card-42'}),event('add','dom-add',353,'new',{cardId:'card-42'}),event('mount2','react-mount',354,'new'),event('start2','animation-start',354,'new')];
  const fixedEvents=[event('mount','react-mount',1,'node'),event('add','dom-add',1,'node'),event('start','animation-start',1,'node')];
  const continuous=Array.from({length:140},(_,i)=>sample(i*17,160+240*Math.min(i*17/1400,1),.1+.9*Math.min(i*17/1400,1)));
  const broken=continuous.map(s=>({...s}));
  broken[21]=sample(357,170,.12);
  const b=report('baseline',baselineEvents,broken),f=report('fixed',fixedEvents,continuous);
  assert.equal(diagnose(b,f,[]).confidence,'inconclusive');
});
