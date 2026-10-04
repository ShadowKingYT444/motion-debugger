import test from 'node:test';
import assert from 'node:assert/strict';
const {createKineticField,kineticFormation}=await import(new URL('../../plugin/motion-debugger/skills/motion/recipes/kinetic-field.mjs',import.meta.url).href);
class Signal {
  hidden=false;matches=false;listeners=new Map<string,Set<()=>void>>();
  addEventListener(name:string,fn:()=>void){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name)!.add(fn);}
  removeEventListener(name:string,fn:()=>void){this.listeners.get(name)?.delete(fn);}
  emit(name:string){for(const fn of this.listeners.get(name)??[])fn();}
}
function fixture(reduced=false,extra:any={}){
  let time=0,id=0;const pending=new Map<number,()=>void>(),history=new Map<number,()=>void>();
  const schedule={requestFrame(fn:()=>void){assert.equal(this,schedule);pending.set(++id,fn);history.set(id,fn);return id;},cancelFrame(handle:number){assert.equal(this,schedule);pending.delete(handle);}};
  const clock={now(){assert.equal(this,clock);return time;}};const document=new Signal(),media=new Signal();media.matches=reduced;
  const changes:any[]=[];const field=createKineticField({count:36,periodMs:8000,schedule,clock,document,media,onChange:(state:any)=>changes.push(state),...extra});
  return {field,pending,history,changes,document,media,advance(value:number){time=value;},tick(value:number){time=value;const next=pending.entries().next().value as [number,()=>void]|undefined;assert.ok(next);pending.delete(next[0]);next[1]();}};
}
const motion=(state:any)=>state.points.map(({id,x,y,z,rotation,scale,opacity,velocity}:any)=>({id,x,y,z,rotation,scale,opacity,velocity}));

test('formations are finite bounded composed poses with stable capped identities and distinct spatial structure',()=>{
  const forms=['pulse','weave','orbit'].map(mode=>kineticFormation(mode,1000));
  for(const form of forms){assert.equal(form.length,64);assert.equal(new Set(form.map((p:any)=>p.id)).size,64);assert.deepEqual(form.map((p:any)=>p.id),forms[0].map((p:any)=>p.id));for(const p of form){for(const key of ['x','y','z','rotation','scale','opacity'])assert.ok(Number.isFinite(p[key]));assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1);assert.ok(p.scale>0&&p.opacity>0&&p.opacity<=1);}}
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(forms[i].reduce((sum:number,p:any,n:number)=>sum+Math.hypot(p.x-forms[j][n].x,p.y-forms[j][n].y),0)/64>.35,'Materially different normalized placements');
  assert.deepEqual(kineticFormation('weave',8,{phase:.25}),kineticFormation('weave',8,{phase:100.25}));
  assert.throws(()=>kineticFormation('unknown'),/Choose/);assert.throws(()=>kineticFormation('pulse',0),/count/);assert.throws(()=>kineticFormation('pulse',8,{phase:NaN}),/finite/);
});
test('rapid retarget preserves every instantaneous position and velocity and eventually reaches the latest composed pose',()=>{
  const f=fixture();f.field.setMode('weave');f.tick(70);const before=motion(f.field.state);assert.ok(before.some((p:any)=>Math.abs(p.velocity.x)>.01));
  f.field.setMode('orbit');assert.deepEqual(motion(f.field.state),before);f.field.setMode('pulse');assert.deepEqual(motion(f.field.state),before);assert.equal(f.pending.size,1);
  f.tick(140);f.field.pose('orbit');const targets=f.field.state.points.map((p:any)=>p.target);f.tick(1500);assert.equal(f.field.state.status,'posed');assert.equal(f.pending.size,0);
  f.field.state.points.forEach((p:any,i:number)=>{for(const key of ['x','y','z','rotation','scale','opacity'])assert.equal(p[key],targets[i][key]);});f.field.dispose();
});
test('full elapsed monotonic time determines looping phase despite a multi-second renderer gap',()=>{
  const f=fixture();f.field.play();f.field.play();assert.equal(f.pending.size,1);f.tick(10000);assert.equal(f.field.state.elapsedMs,10000);assert.equal(f.field.state.phase,.25);assert.equal(f.pending.size,1);
  const paused=f.field.pause();f.advance(30000);assert.equal(f.field.state.elapsedMs,paused.elapsedMs);assert.deepEqual(motion(f.field.state),motion(paused));f.field.resume();f.tick(32000);assert.equal(f.field.state.elapsedMs,12000);assert.equal(f.field.state.phase,.5);f.field.dispose();
});
test('pause and hidden suspension freeze all channels; replay restarts phase without resetting pose velocity',()=>{
  const f=fixture();f.field.play();f.tick(1000);f.document.hidden=true;f.document.emit('visibilitychange');const hidden=f.field.state;assert.equal(hidden.status,'suspended');assert.equal(f.pending.size,0);
  f.advance(11000);f.document.hidden=false;f.document.emit('visibilitychange');f.tick(11200);assert.equal(f.field.state.elapsedMs,1200);
  f.field.pause();f.document.hidden=true;f.document.emit('visibilitychange');f.advance(20000);f.document.hidden=false;f.document.emit('visibilitychange');assert.equal(f.field.state.status,'paused');assert.equal(f.pending.size,0);
  const before=motion(f.field.state);f.field.replay();assert.deepEqual(motion(f.field.state),before);assert.equal(f.field.state.elapsedMs,0);f.field.dispose();
});
test('reduced motion changes meaningful formations without decorative scheduling and actual media changes preserve identities',()=>{
  const f=fixture(true);f.field.play();assert.equal(f.pending.size,0);f.field.setMode('weave');assert.equal(f.pending.size,0);assert.equal(f.field.state.settled,true);assert.equal(f.field.state.phase,0);assert.deepEqual(f.field.state.points.map((p:any)=>p.id),kineticFormation('pulse').map((p:any)=>p.id));
  f.field.pose('orbit');assert.equal(f.field.state.status,'posed');f.media.matches=false;f.media.emit('change');f.field.play();f.tick(1000);assert.equal(f.pending.size,1);f.media.matches=true;f.media.emit('change');assert.equal(f.pending.size,0);assert.equal(f.field.state.phase,.125);assert.equal(f.field.state.settled,true);f.field.dispose();
});
test('disposal invalidates stale callbacks and removes owned listeners',()=>{
  const f=fixture();f.field.play();const changes=f.changes.length;f.field.dispose();f.field.dispose();for(const fn of f.history.values())fn();f.media.emit('change');f.document.emit('visibilitychange');assert.equal(f.changes.length,changes);assert.equal(f.pending.size,0);assert.equal(f.field.state.status,'disposed');assert.equal(f.media.listeners.get('change')?.size,0);assert.equal(f.document.listeners.get('visibilitychange')?.size,0);assert.throws(()=>f.field.play(),/disposed/);
});

test('paused seek preserves instantaneous motion then settles selected phase without restarting transport',()=>{
  const f=fixture();f.field.play();f.field.setMode('weave');f.tick(80);f.field.pause();const before=motion(f.field.state);f.field.seek(.75);assert.deepEqual(motion(f.field.state),before);assert.equal(f.field.state.status,'paused');assert.equal(f.field.state.progress,.75);assert.equal(f.field.state.phase,.75);assert.equal(f.pending.size,1);
  f.tick(1500);assert.equal(f.field.state.status,'paused');assert.equal(f.field.state.settled,true);assert.equal(f.field.state.seeking,false);assert.equal(f.field.state.phase,.75);assert.equal(f.pending.size,0);
  f.advance(30000);f.field.resume();f.tick(31000);assert.equal(f.field.state.elapsedMs,7000);assert.equal(f.field.state.phase,.875);assert.equal(f.field.state.progress,.875);f.field.dispose();
});
test('immediate held scrubbing maps exact poses forward/back and preserves manual pause, including cyclic endpoint',()=>{
  const f=fixture();f.field.play();f.tick(350);f.field.pause();
  for(const progress of [.2,.8,.3,1,0]){f.field.seek(progress,{immediate:true});assert.equal(f.field.state.status,'paused');assert.equal(f.field.state.progress,progress);assert.equal(f.field.state.phase,progress%1);assert.equal(f.pending.size,0);assert.equal(f.field.state.settled,true);assert.ok(f.field.state.points.every((p:any)=>Object.values(p.velocity).every(v=>v===0)));const poses=kineticFormation('pulse',36,{phase:progress%1});f.field.state.points.forEach((p:any,i:number)=>{for(const key of ['x','y','z','scale','opacity'])assert.equal(p[key],poses[i][key]);});}
  const before=f.field.state;for(const value of [-.001,1.001,NaN,Infinity])assert.throws(()=>f.field.seek(value),/progress/);assert.deepEqual(f.field.state,before);f.field.dispose();
});
test('running seek reanchors elapsed phase while replay restarts from zero without resetting channel velocity',()=>{
  const f=fixture();f.field.play();f.tick(500);const before=motion(f.field.state);f.field.seek(.5);assert.deepEqual(motion(f.field.state),before);assert.equal(f.pending.size,1);assert.equal(f.field.state.status,'running');f.tick(1500);assert.equal(f.field.state.elapsedMs,5000);assert.equal(f.field.state.phase,.625);
  const replayBefore=motion(f.field.state);f.field.replay();assert.deepEqual(motion(f.field.state),replayBefore);assert.equal(f.field.state.progress,0);assert.equal(f.field.state.phase,0);f.field.dispose();
});
test('reduced seek retains selected phase and endpoint with no RAF even during held scrubbing and media change',()=>{
  const f=fixture(true);f.field.play();f.field.pause();for(const progress of [.1,.9,.4,1]){f.field.seek(progress);assert.equal(f.field.state.status,'paused');assert.equal(f.field.state.progress,progress);assert.equal(f.field.state.phase,progress%1);assert.equal(f.pending.size,0);assert.equal(f.field.state.settled,true);}
  f.field.seek(.6);f.media.matches=false;f.media.emit('change');assert.equal(f.field.state.phase,.6);assert.equal(f.field.state.status,'paused');assert.equal(f.pending.size,0);f.advance(10000);f.field.resume();f.tick(10800);assert.ok(Math.abs(f.field.state.phase-.7)<1e-12);f.field.dispose();
});

test('auto-pause from a renderer callback does not recursively observe running and preserves native elapsed state',()=>{
  let field:any,autoPauses=0;const states:any[]=[];
  const f=fixture(false,{onChange:(state:any)=>{states.push(state);if(field&&state.status==='running'&&state.elapsedMs>=200){autoPauses++;field.pause();}}});field=f.field;
  field.play();f.tick(350);assert.equal(autoPauses,1);assert.equal(field.state.status,'paused');assert.equal(field.state.elapsedMs,350);assert.equal(f.pending.size,0);assert.equal(states.at(-1).status,'paused');assert.deepEqual(motion(states.at(-1)),motion(field.state));assert.ok(states.length<6);field.dispose();
});
test('callback failure exposes paused error and cancels scheduling; play/resume recover after renderer repair',()=>{
  const original=new Error('Seeded renderer failure');let fail=false,calls=0;
  const f=fixture(false,{onChange:()=>{calls++;if(fail)throw original;}});f.field.play();fail=true;assert.throws(()=>f.tick(400),(error:any)=>error===original);
  assert.equal(f.field.state.status,'paused');assert.deepEqual(f.field.state.error,{name:'Error',message:original.message});assert.equal(f.pending.size,0);const held=motion(f.field.state);f.advance(3000);assert.deepEqual(motion(f.field.state),held);
  assert.throws(()=>f.field.resume(),(error:any)=>error===original);assert.equal(f.pending.size,0);fail=false;f.field.play();assert.equal(f.field.state.status,'running');assert.equal(f.field.state.error,null);assert.equal(f.pending.size,1);f.tick(3500);assert.equal(f.field.state.elapsedMs,900);assert.ok(calls<8);f.field.dispose();
});
test('constructor renderer failure releases listeners since no disposal handle can be returned',()=>{
  const document=new Signal(),media=new Signal();const original=new Error('Seeded initial render failure');let scheduled=0;
  assert.throws(()=>createKineticField({document,media,clock:{now:()=>0},schedule:{requestFrame:()=>++scheduled,cancelFrame:()=>{}},onChange:()=>{throw original;}}),(error:any)=>error===original);
  assert.equal(document.listeners.get('visibilitychange')?.size,0);assert.equal(media.listeners.get('change')?.size,0);assert.equal(scheduled,0);assert.doesNotThrow(()=>{document.emit('visibilitychange');media.emit('change');});
});
test('paused mode/intensity selection preserves position and velocity then converges while its timeline remains frozen',()=>{
  const f=fixture();f.field.play();f.tick(400);f.field.pause();const elapsed=f.field.state.elapsedMs,before=motion(f.field.state);f.field.setMode('weave');assert.deepEqual(motion(f.field.state),before);assert.equal(f.field.state.status,'paused');assert.equal(f.field.state.seeking,true);assert.equal(f.pending.size,1);
  f.tick(1600);assert.equal(f.field.state.status,'paused');assert.equal(f.field.state.elapsedMs,elapsed);assert.equal(f.field.state.settled,true);assert.equal(f.pending.size,0);const settled=motion(f.field.state);
  f.field.setIntensity(.1);assert.deepEqual(motion(f.field.state),settled);assert.equal(f.pending.size,1);f.tick(3200);assert.equal(f.field.state.status,'paused');assert.equal(f.field.state.elapsedMs,elapsed);assert.equal(f.field.state.intensity,.1);assert.equal(f.field.state.settled,true);assert.equal(f.pending.size,0);f.field.state.points.forEach((p:any)=>{for(const key of ['x','y','z','scale','opacity'])assert.equal(p[key],p.target[key]);});f.field.dispose();
});

test('Play starts continuous playback from paused posing; Resume restores finite intent without resetting position/velocity',()=>{
  const continuous=fixture();continuous.field.pose('weave');continuous.tick(80);continuous.field.pause();const held=motion(continuous.field.state);assert.equal(continuous.field.state.status,'paused');continuous.field.play();assert.deepEqual(motion(continuous.field.state),held);assert.equal(continuous.field.state.status,'running');assert.equal(continuous.pending.size,1);continuous.field.play();assert.equal(continuous.pending.size,1);continuous.tick(500);assert.equal(continuous.field.state.elapsedMs,420);assert.equal(continuous.field.state.phase,420/8000);continuous.field.dispose();
  const finite=fixture();finite.field.pose('weave');finite.tick(80);finite.field.pause();const finiteHeld=motion(finite.field.state);finite.field.resume();assert.deepEqual(motion(finite.field.state),finiteHeld);assert.equal(finite.field.state.status,'posing');assert.equal(finite.pending.size,1);finite.tick(1500);assert.equal(finite.field.state.status,'posed');assert.equal(finite.field.state.phase,0);assert.equal(finite.pending.size,0);finite.field.dispose();
});
