import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../../packages/core/analysis';
import type {CaptureRecipe,MotionSample} from '../../packages/core/types';
test('constant speed can exceed a raw step budget at lower cadence while normalized velocity passes; a reset fails both',()=>{
  // Explicit synthetic unit inputs. These are not a recording or a product-quality score.
  const recipe:CaptureRecipe={url:'http://127.0.0.1:4173',selector:'#target',actions:[],durationMs:1000,contract:{maxFrameStepPx:20,maxStepAt60HzPx:20,maxSampleGapMs:80}};
  const final={visible:true,attributes:{},text:'',x:1000,y:0,opacity:1};
  const trajectory=(interval:number,jump=false):MotionSample[]=>Array.from({length:Math.floor(1000/interval)+1},(_,i)=>({t:i*interval,nodeId:'same',logicalId:'target',x:i*interval+(jump&&i*interval>=500?150:0),y:0,width:10,height:10,opacity:1,translateX:0,translateY:0,scaleX:1,scaleY:1,rotationDeg:0,animationTime:null,containmentOverflowPx:null,containerRect:null}));
  const normal=analyze(trajectory(16),[],recipe,final),lowerCadence=analyze(trajectory(32),[],recipe,final),reset=analyze(trajectory(32,true),[],recipe,final);
  assert.equal(normal.metrics.sufficientEvidence,true);assert.equal(lowerCadence.metrics.sufficientEvidence,true);
  assert.equal(normal.assertions.find(a=>a.id==='frame-step')?.passed,true);
  assert.equal(lowerCadence.assertions.find(a=>a.id==='frame-step')?.passed,false);
  assert.equal(lowerCadence.assertions.find(a=>a.id==='normalized-step')?.passed,true);
  assert.equal(normal.metrics.maxStepAt60HzPx,lowerCadence.metrics.maxStepAt60HzPx);
  assert.equal(reset.assertions.find(a=>a.id==='frame-step')?.passed,false);
  assert.equal(reset.assertions.find(a=>a.id==='normalized-step')?.passed,false);
});
