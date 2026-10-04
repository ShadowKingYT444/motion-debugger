/** Opt-in transform bindings. Never replace the consumer's objects, materials, labels or camera. */
const finite = (value,label) => {if(!Number.isFinite(value))throw new TypeError(`Finite ${label} required`);return value;};
export function validatePose(pose) {
  if(!pose?.position || !['css-px','scene-unit'].includes(pose.position.unit) || !['screen','world','parent-local'].includes(pose.position.space))throw new TypeError('Explicit pose units and space required');
  const p=pose.position;finite(p.x,'x');finite(p.y,'y');if(p.z!==undefined)finite(p.z,'z');
  if(p.space==='screen'&&p.unit!=='css-px')throw new TypeError('Screen space requires CSS pixels');
  if(pose.orientationRad!==undefined && (!Array.isArray(pose.orientationRad)||pose.orientationRad.length!==3||!pose.orientationRad.every(Number.isFinite)))throw new TypeError('Three finite radians required');
  if(pose.scale!==undefined && (!Array.isArray(pose.scale)||pose.scale.length!==3||!pose.scale.every(value=>Number.isFinite(value)&&value>0)))throw new TypeError('Three positive scale values required');
  if(pose.opacity!==undefined && (!Number.isFinite(pose.opacity)||pose.opacity<0||pose.opacity>1))throw new TypeError('Opacity must be in [0,1]');
  return structuredClone(pose);
}
const identity = id => {if(typeof id!=='string'||!/^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/.test(id))throw new TypeError('Stable actor ID required');};
/** Resolve the existing element's screen anchor at transition start; call invalidate on resize/layout changes. */
export function createDOMBinding({id,element,kind='dom'}) {
  identity(id);if(!['dom','svg'].includes(kind)||!element?.getBoundingClientRect||!element.style)throw new TypeError('Owned DOM/SVG element required');
  const original={transform:element.style.transform,transformOrigin:element.style.transformOrigin,opacity:element.style.opacity};
  let baseTransform=original.transform,anchor=null,pose=null,valid=false,disposed=false;
  const alive=()=>{if(disposed)throw new Error('Binding disposed');};
  function begin() {
    alive();const rect=element.getBoundingClientRect();
    finite(rect.x,'anchor x');finite(rect.y,'anchor y');
    // Layout is measured once at start, not guessed from relative CSS values.
    baseTransform=element.style.transform;anchor={x:rect.x,y:rect.y};
    pose={position:{...anchor,unit:'css-px',space:'screen'},orientationRad:[0,0,0],scale:[1,1,1]};valid=true;return structuredClone(pose);
  }
  function applyPose(next) {
    alive();if(!valid)throw new Error('Binding invalidated; begin after viewport/layout changes');next=validatePose(next);
    if(next.position.space!=='screen'||next.position.unit!=='css-px')throw new Error('DOM binding requires screen CSS pixels');
    const [rx,ry,rz]=next.orientationRad??[0,0,0],[sx,sy,sz]=next.scale??[1,1,1];
    element.style.transform=`translate3d(${next.position.x-anchor.x}px, ${next.position.y-anchor.y}px, ${next.position.z??0}px) rotateX(${rx}rad) rotateY(${ry}rad) rotateZ(${rz}rad) scale3d(${sx},${sy},${sz}) ${baseTransform||''}`.trim();
    if(next.opacity!==undefined)element.style.opacity=String(next.opacity);
    pose=next;return structuredClone(pose);
  }
  return {id,kind,object:element,begin,applyPose,getPose(){alive();if(!valid)throw new Error('Binding invalidated');return structuredClone(pose);},invalidate(){alive();valid=false;},dispose({restore=false}={}){if(disposed)return;if(restore){element.style.transform=original.transform;element.style.transformOrigin=original.transformOrigin;element.style.opacity=original.opacity;}disposed=true;valid=false;}};
}
export function createSVGBinding(options){return createDOMBinding({...options,kind:'svg'});}
/** Consumer's Object3D and active camera, with scene-unit parent transforms. No Three dependency or new render loop. */
export function createThreeBinding({id,object,camera,cameraId}) {
  identity(id);identity(cameraId);if(!object?.position||!object?.rotation||!object?.scale||!camera)throw new TypeError('Owned Three object and active camera required');
  let valid=true,disposed=false;
  const alive=()=>{if(disposed)throw new Error('Binding disposed');if(!valid)throw new Error('Binding invalidated; begin after scene/camera changes');};
  const getPose=()=>{alive();return validatePose({position:{x:object.position.x,y:object.position.y,z:object.position.z,space:'parent-local',unit:'scene-unit'},orientationRad:[object.rotation.x,object.rotation.y,object.rotation.z],scale:[object.scale.x,object.scale.y,object.scale.z]});};
  const set=(target,values)=>{if(target.set)target.set(...values);else [target.x,target.y,target.z]=values;};
  return {id,kind:'three',object,camera,cameraId,getPose,begin(){if(disposed)throw new Error('Binding disposed');valid=true;return getPose();},applyPose(next){alive();next=validatePose(next);if(next.position.space!=='parent-local'||next.position.unit!=='scene-unit')throw new Error('Three binding writes parent-local scene units; project world destinations explicitly');if(next.opacity!==undefined)throw new Error('Consumer owns materials; map opacity with an explicit custom binding');set(object.position,[next.position.x,next.position.y,next.position.z??0]);if(next.orientationRad)set(object.rotation,next.orientationRad);if(next.scale)set(object.scale,next.scale);return getPose();},invalidate(){if(disposed)throw new Error('Binding disposed');valid=false;},dispose(){disposed=true;valid=false;}};
}
export function createActorBindings(bindings) {
  if(!Array.isArray(bindings)||!bindings.length||bindings.length>24)throw new Error('One to twenty-four actor bindings required');
  const actors=new Map();for(const binding of bindings){identity(binding.id);if(actors.has(binding.id))throw new Error(`Duplicate binding ${binding.id}`);if(binding.object&&[...actors.values()].some(actor=>actor.object===binding.object))throw new Error('One physical object cannot acquire multiple actor identities');if(typeof binding.getPose!=='function'||typeof binding.applyPose!=='function')throw new TypeError('Bindings require getPose/applyPose');actors.set(binding.id,binding);}
  if(bindings.filter(binding=>binding.kind!=='three').length>8||bindings.filter(binding=>binding.kind==='three').length>16)throw new Error('At most eight DOM/SVG and sixteen Three bindings');
  return {ids:[...actors.keys()],get(id){if(!actors.has(id))throw new Error(`Missing binding ${id}`);return actors.get(id);},begin(){for(const binding of actors.values())binding.begin?.();},invalidate(){for(const binding of actors.values())binding.invalidate?.();}};
}
