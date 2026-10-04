import {createSpring} from './spring.mjs';
// Only timing, overlap and retargeting live here. Art, assets and endpoints are protected.
export const MOTION={frequency:2.6,selectionFrequency:3.2,phases:{body:[.12,.92],ring:[.08,.85],sensor:[.25,1],lens:[0,.8]},release:'pause-at-visible-pose'};
export function createAssemblyMotion(design,reduced=false){
  let progress=createSpring({value:0,frequency:MOTION.frequency,reducedMotion:reduced}),inspector=createSpring({value:0,frequency:MOTION.frequency,reducedMotion:reduced});
  const selection=Object.fromEntries(Object.keys(design.lenses).map(id=>[id,createSpring({value:id==='standard'?1:0,frequency:MOTION.selectionFrequency,reducedMotion:reduced})]));
  let selected='standard',view='assembled',paused=false,held=false;
  const stage=(value,range)=>{const t=Math.max(0,Math.min(1,(value-range[0])/(range[1]-range[0])));return t*t*(3-2*t)};
  const mix=(a,b,t)=>a.map((value,index)=>value+(b[index]-value)*t);
  function positions(){
    const p=progress.state.value,q=inspector.state.value,result={};
    for(const id of ['body','ring','sensor'])result[id]=mix(mix(design.poses.assembled[id],design.poses.exploded[id],stage(p,MOTION.phases[id])),design.poses.inspector[id],q);
    const active=mix(mix(design.poses.assembled.selectedLens,design.poses.exploded.selectedLens,stage(p,MOTION.phases.lens)),design.poses.inspector.selectedLens,q);
    for(const id of Object.keys(selection))result['lens-'+id]=mix(design.poses.parked[id],active,selection[id].state.value);
    return result;
  }
  return {get state(){return {selected,view,paused,held,playing:!paused&&!(progress.state.settled&&inspector.state.settled&&Object.values(selection).every(spring=>spring.state.settled)),progress:progress.state.value,targetProgress:progress.state.target,inspector:inspector.state.value,settled:progress.state.settled&&inspector.state.settled&&Object.values(selection).every(spring=>spring.state.settled),positions:positions()};},
    open(){view=view==='assembled'?'exploded':'assembled';paused=false;held=false;progress.retarget(view==='assembled'?0:1);inspector.retarget(0);},
    inspect(){view=view==='inspector'?'exploded':'inspector';paused=false;held=false;progress.retarget(1);inspector.retarget(view==='inspector'?1:0);},
    select(id){if(!selection[id])throw new Error('Unknown lens');selected=id;paused=false;for(const [key,spring] of Object.entries(selection))spring.retarget(key===id?1:0);},
    pause(next=!paused){paused=Boolean(next);},
    seek(value){if(!Number.isFinite(value))throw new Error('Finite scrub required');paused=true;held=true;const p=Math.max(0,Math.min(1,value));progress.dispose();progress=createSpring({value:p,frequency:MOTION.frequency,reducedMotion:reduced});inspector.retarget(0);view=p===0?'assembled':'exploded';},
    release(){held=false;paused=true;},
    resume(){paused=false;held=false;progress.retarget(view==='assembled'?0:1);},
    replay(){paused=false;held=false;view='exploded';progress.dispose();progress=createSpring({value:0,target:1,frequency:MOTION.frequency,reducedMotion:reduced});inspector.retarget(0);},
    reduced(next){reduced=Boolean(next);progress.setReducedMotion(reduced);inspector.setReducedMotion(reduced);for(const spring of Object.values(selection))spring.setReducedMotion(reduced);},
    advance(seconds){if(!paused){progress.advance(seconds);inspector.advance(seconds);for(const spring of Object.values(selection))spring.advance(seconds);}return this.state;},
    dispose(){progress.dispose();inspector.dispose();for(const spring of Object.values(selection))spring.dispose();}
  };
}
