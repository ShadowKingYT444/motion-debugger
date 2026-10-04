import {createSpring} from './spring.mjs';
import {createActorBindings,validatePose} from './transition-bindings.mjs';

const channels=['x','y','z','rx','ry','rz','sx','sy','sz','opacity'];
function values(pose){return [pose.position.x,pose.position.y,pose.position.z??0,...(pose.orientationRad??[0,0,0]),...(pose.scale??[1,1,1]),pose.opacity??1];}
/** Persistent actor controller. Consumer advances it in its existing render step; there is no scheduler. */
export function createPersistentHandoff({bindings,frequency=3,reducedMotion=false}={}) {
  const actors=createActorBindings(bindings);actors.begin();const state=new Map();let paused=false,disposed=false,reduced=Boolean(reducedMotion);
  for(const id of actors.ids){const pose=validatePose(actors.get(id).getPose());state.set(id,{pose,initial:pose,opacity:pose.opacity!==undefined,springs:values(pose).map(value=>createSpring({value,frequency,reducedMotion:reduced}))});}
  const alive=()=>{if(disposed)throw new Error('Transition disposed');};
  function currentPose(id){const entry=state.get(id),v=entry.springs.map(spring=>spring.state.value);const pose={position:{x:v[0],y:v[1],z:v[2],unit:entry.pose.position.unit,space:entry.pose.position.space},orientationRad:v.slice(3,6),scale:v.slice(6,9)};if(entry.opacity)pose.opacity=v[9];return pose;}
  function paint(id){const pose=currentPose(id);actors.get(id).applyPose(pose);return pose;}
  function target(id,next,{direct=false}={}) {
    alive();actors.get(id);next=validatePose(next);const entry=state.get(id);
    if(next.position.unit!==entry.pose.position.unit||next.position.space!==entry.pose.position.space)throw new Error('Cannot retarget across coordinate spaces');
    if(next.opacity!==undefined&&!entry.opacity)throw new Error('Opacity channel requires an explicit owned binding');
    entry.pose=next;const targets=values(next);
    // Direct scrub and intentional cuts explicitly reset velocity; native retarget leaves every spring untouched.
    entry.springs.forEach((spring,index)=>{if(direct){spring.dispose();entry.springs[index]=createSpring({value:targets[index],frequency,reducedMotion:reduced});}else spring.retarget(targets[index]);});
    paint(id);return snapshot();
  }
  function snapshot(){return {paused,reducedMotion:reduced,actors:actors.ids.map(id=>({id,pose:currentPose(id),targetPose:structuredClone(state.get(id).pose),channels:Object.fromEntries(channels.map((channel,index)=>[channel,state.get(id).springs[index].state])),settled:state.get(id).springs.every(spring=>spring.state.settled)}))};}
  return {retarget:(id,pose)=>target(id,pose),seek:(id,pose)=>target(id,pose,{direct:true}),
    advance(seconds){alive();if(!Number.isFinite(seconds)||seconds<0)throw new TypeError('Nonnegative elapsed seconds required');if(!paused)for(const id of actors.ids){state.get(id).springs.forEach(spring=>spring.advance(seconds));paint(id);}return snapshot();},
    setPaused(next){alive();paused=Boolean(next);return snapshot();},
    setReducedMotion(next){alive();reduced=Boolean(next);for(const id of actors.ids){state.get(id).springs.forEach(spring=>spring.setReducedMotion(reduced));paint(id);}return snapshot();},
    replay(){alive();for(const id of actors.ids)target(id,state.get(id).initial,{direct:true});return snapshot();},
    get state(){return snapshot();},dispose(){if(disposed)return;disposed=true;for(const entry of state.values())entry.springs.forEach(spring=>spring.dispose());}
  };
}
/** Stage existing actors by an acyclic relative schedule. The user's app still owns open/close/reopen state. */
export function createStagedDecomposition({bindings,beats,frequency=3,reducedMotion=false}={}) {
  if(!Array.isArray(beats)||!beats.length||beats.length>24)throw new Error('One to twenty-four beats required');
  const byId=new Map(),starts=new Map(),visiting=new Set();
  for(const beat of beats){if(!beat?.id||byId.has(beat.id)||!Array.isArray(beat.after)||!Array.isArray(beat.targets)||!beat.targets.length||!Number.isFinite(beat.durationMs)||beat.durationMs<=0||!Number.isFinite(beat.overlapMs)||beat.overlapMs<0||beat.overlapMs>beat.durationMs||!beat.after.length&&beat.overlapMs>0)throw new Error('Invalid staged beat');byId.set(beat.id,beat);}
  function start(id){if(starts.has(id))return starts.get(id);if(visiting.has(id))throw new Error('Cyclic phase dependency');const beat=byId.get(id);if(!beat)throw new Error(`Missing beat ${id}`);visiting.add(id);const value=beat.after.length?Math.max(...beat.after.map(dependency=>start(dependency)+byId.get(dependency).durationMs))-beat.overlapMs:0;if(value<0)throw new Error('Overlap precedes transition start');visiting.delete(id);starts.set(id,value);return value;}
  for(const beat of beats)start(beat.id);
  const rank=new Map([...starts.keys()].map((id,index)=>[id,index]));
  const controller=createPersistentHandoff({bindings,frequency,reducedMotion});
  for(const beat of beats)for(const target of beat.targets){if(!bindings.some(binding=>binding.id===target.actorId)){controller.dispose();throw new Error(`Missing binding ${target.actorId}`);}validatePose(target.pose);}
  let elapsedMs=0,paused=false,played=new Set(),disposed=false,reduced=Boolean(reducedMotion);
  function due(){for(const beat of beats.filter(beat=>!played.has(beat.id)).sort((a,b)=>starts.get(a.id)-starts.get(b.id)||rank.get(a.id)-rank.get(b.id))){if(!reduced&&starts.get(beat.id)>elapsedMs)continue;for(const target of beat.targets)controller.retarget(target.actorId,target.pose);played.add(beat.id);}}
  const alive=()=>{if(disposed)throw new Error('Transition disposed');};
  return {advance(seconds){alive();if(!Number.isFinite(seconds)||seconds<0)throw new TypeError('Nonnegative elapsed seconds required');if(!paused){let remaining=seconds*1000;due();while(remaining>0){const next=Math.min(...beats.filter(beat=>!played.has(beat.id)).map(beat=>starts.get(beat.id)),Infinity);const step=Math.min(remaining,Math.max(0,next-elapsedMs));controller.advance(step/1000);elapsedMs+=step;remaining-=step;due();if(step===0&&next===Infinity)break;}}return this.state;},setPaused(next){alive();paused=Boolean(next);controller.setPaused(paused);},setReducedMotion(next){alive();reduced=Boolean(next);controller.setReducedMotion(reduced);due();},replay(){alive();elapsedMs=0;played=new Set();controller.replay();due();},get state(){return {...controller.state,elapsedMs,startedBeats:[...played]};},dispose(){disposed=true;controller.dispose();}};
}
/** Direct pointer input is a pose seek. Release resumes velocity-preserving target settling. */
export function createDragReleaseSettling(options) {
  const controller=createPersistentHandoff(options);let dragging=null;
  return {...controller,beginDrag(actorId){if(!options.bindings.some(binding=>binding.id===actorId))throw new Error(`Missing binding ${actorId}`);dragging=actorId;},dragTo(pose){if(dragging===null)throw new Error('No active drag');return controller.seek(dragging,pose);},release(pose){if(dragging===null)throw new Error('No active drag');const id=dragging;dragging=null;return controller.retarget(id,pose);},cancel(pose){if(dragging===null)return controller.state;const id=dragging;dragging=null;return controller.retarget(id,pose);},get state(){return {...controller.state,dragging};}};
}
