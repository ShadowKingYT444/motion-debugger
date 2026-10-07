import {createHash} from 'node:crypto';

const fields={field:['mode','progress','chapter','exported'],commerce:['selectedProduct','filter','variant','cartCount','exported'],creative:['selectedObject','playhead','zoom','undoDepth','exported']};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const scalar=value=>typeof value==='string'||typeof value==='boolean'||finite(value);

export function validatePublicState(task,value){
 const required=fields[task];if(!required||!value||typeof value!=='object'||Array.isArray(value))return{passed:false,reason:'missing object state'};
 const missing=required.filter(key=>!Object.prototype.hasOwnProperty.call(value,key)),invalid=required.filter(key=>Object.prototype.hasOwnProperty.call(value,key)&&!scalar(value[key]));
 for(const key of task==='field'?['progress']:task==='commerce'?['cartCount']:['playhead','zoom','undoDepth'])if(Object.prototype.hasOwnProperty.call(value,key)&&!finite(value[key]))invalid.push(key);
 return{passed:missing.length===0&&invalid.length===0,missing,invalid:[...new Set(invalid)]};
}

export function validateExport(task,exported,observed){
 const stateCheck=validatePublicState(task,observed),exportCheck=validatePublicState(task,exported);if(!stateCheck.passed||!exportCheck.passed)return{passed:false,stateCheck,exportCheck};
 const mismatches=fields[task].filter(key=>JSON.stringify(exported[key])!==JSON.stringify(observed[key]));return{passed:mismatches.length===0,mismatches};
}

const validBox=box=>box&&[box.x,box.y,box.w,box.h].every(finite)&&box.w>0&&box.h>0&&box.opacity>.01&&box.visibility!=='hidden'&&box.display!=='none'&&box.viewportIntersection>0;
export function validateRelationship(task,geometry){
 if(!geometry)return{passed:false,status:'missing'};
 if(task==='creative'){
  if(!validBox(geometry.a)||!validBox(geometry.b))return{passed:false,status:'invalid-or-invisible-box'};
  const dx=Math.abs(geometry.a.x-geometry.b.x),dy=Math.abs(geometry.a.y-geometry.b.y),dw=Math.abs(geometry.a.w-geometry.b.w),dh=Math.abs(geometry.a.h-geometry.b.h),tolerance=Math.max(4,.1*Math.hypot(geometry.b.w,geometry.b.h));
  return{passed:dx<=tolerance&&dy<=tolerance&&dw<=tolerance&&dh<=tolerance,status:'selection-overlay-bounds',actual:{dx,dy,dw,dh,tolerance}};
 }
 if(task==='commerce')return{passed:false,status:validBox(geometry.box)?'partial-selected-card-only':'invalid-selected-card',reason:'The public hook does not expose detail, variant and cart-sheet geometry reconciliation.'};
 return{passed:false,status:validBox(geometry.a)&&validBox(geometry.b)?'ambiguous-part-anchor':'invalid-or-invisible-box',reason:'The public contract does not identify which product part the FIELD label must anchor to.'};
}

export function validateActionEffects(trace){
 if(!Array.isArray(trace)||!trace.length)return{passed:false,reason:'missing action observations'};
 const groups=new Map();for(const item of trace){const values=groups.get(item?.label)??[];values.push(item);groups.set(item?.label,values);}const failures=[...groups].filter(([,items])=>items.every(item=>!item||item.error||!item.before||!item.after||JSON.stringify(item.before)===JSON.stringify(item.after))).map(([label])=>label??'unknown');return{passed:failures.length===0,failures};
}

export function validateMotionObservations(observations){
 if(!Array.isArray(observations)||observations.length<3)return{passed:false,reason:'missing intermediate geometry'};
 const valid=observations.every(item=>finite(item?.t)&&Array.isArray(item?.boxes)&&item.boxes.some(validBox)),times=new Set(observations.map(item=>item.t));return{passed:valid&&times.size===observations.length,reason:valid?'ok':'invalid geometry observation'};
}

export function comparableState(task,value){
 if(!value||typeof value!=='object')return null;
 if(task==='field')return{mode:value.mode,progress:value.progress,chapter:value.chapter};
 if(task==='commerce')return{selectedProduct:value.selectedProduct,filter:value.filter,variant:value.variant,cartCount:value.cartCount};
 return{selectedObject:value.selectedObject,playhead:value.playhead,zoom:value.zoom};
}
export function equivalentOutcome(task,primary,alternate){const a=comparableState(task,primary),b=comparableState(task,alternate);return{passed:a!==null&&b!==null&&JSON.stringify(a)===JSON.stringify(b),primary:a,alternate:b,excluded:task==='creative'?['undoDepth','exported']:['exported']};}

export function applicationDigest(files){
 const entries=Object.entries(files).filter(([name])=>!/(^|\/)(?:AGENTS\.md|TASK\.md|CONTRACT\.md|asset\.svg|server\.mjs|INITIAL_CHECKPOINT|CONSTRUCTION_MATERIALS)(?:\/|$)/.test(name)).sort(([a],[b])=>a.localeCompare(b));
 return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

export function summarizeFunction(checks,errors=[]){const required=['desktop app loads','held-out primary journey completes','public state satisfies contract','every control has an observed effect','export equals independently observed state','history-independent replay reaches same public state','mobile journey remains functional','reduced journey remains functional','no runtime errors'];return{passed:errors.length===0&&required.every(label=>checks.find(check=>check.label===label)?.passed===true),required};}
