import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationDigest,equivalentOutcome,summarizeFunction,validateActionEffects,validateExport,validateMotionObservations,validatePublicState,validateRelationship} from '../scripts/study/motion-value-evaluator.mjs';

test('supplemental evaluator rejects null/nonfinite state while accepting numeric ID zero',()=>{
 assert.equal(validatePublicState('commerce',null).passed,false);assert.equal(validatePublicState('commerce',{selectedProduct:0,filter:'all',variant:'blue',cartCount:1,exported:true}).passed,true);assert.equal(validatePublicState('creative',{selectedObject:0,playhead:NaN,zoom:1,undoDepth:0,exported:false}).passed,false);
});
test('export must equal independently observed current state',()=>{
 const state={selectedProduct:0,filter:'all',variant:'blue',cartCount:1,exported:true};assert.equal(validateExport('commerce',{...state},state).passed,true);assert.deepEqual(validateExport('commerce',{...state,variant:'red'},state).mismatches,['variant']);
});
test('no-op controls, detached overlays and missing motion observations fail',()=>{
 assert.equal(validateActionEffects([{label:'select',before:{selected:0},after:{selected:0}}]).passed,false);
 const visible={x:10,y:10,w:100,h:40,opacity:1,visibility:'visible',display:'block',viewportIntersection:1};assert.equal(validateRelationship('creative',{a:{...visible,x:500},b:visible}).passed,false);assert.equal(validateRelationship('creative',{a:{...visible,w:0},b:{...visible,w:0}}).passed,false);assert.equal(validateMotionObservations([]).passed,false);
});
test('equivalent creative outcomes ignore history depth only after specified undo semantics',()=>{
 const primary={selectedObject:'a',playhead:4,zoom:2,undoDepth:1,exported:false},alternate={...primary,undoDepth:3};assert.equal(equivalentOutcome('creative',primary,alternate).passed,true);assert.equal(equivalentOutcome('creative',primary,{...alternate,selectedObject:'b'}).passed,false);
});
test('function summary gates runtime errors and application digest excludes setup material',()=>{
 const labels=['desktop app loads','held-out primary journey completes','public state satisfies contract','every control has an observed effect','export equals independently observed state','history-independent replay reaches same public state','mobile journey remains functional','reduced journey remains functional','no runtime errors'],checks=labels.map(label=>({label,passed:true}));assert.equal(summarizeFunction(checks).passed,true);assert.equal(summarizeFunction(checks,['page error']).passed,false);assert.equal(applicationDigest({'index.html':'a','CONSTRUCTION_MATERIALS/SKILL.md':'one'}),applicationDigest({'index.html':'a','CONSTRUCTION_MATERIALS/SKILL.md':'two'}));
});
