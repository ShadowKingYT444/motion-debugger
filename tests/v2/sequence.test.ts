import test from 'node:test';
import assert from 'node:assert/strict';
const {createElapsedSequence} = await import(new URL('../../plugin/motion-debugger/skills/motion/recipes/elapsed-sequence.mjs', import.meta.url).href);

class Signal {
  hidden = false; matches = false;
  listeners = new Map<string, Set<() => void>>();
  addEventListener(name: string, callback: () => void) {if (!this.listeners.has(name)) this.listeners.set(name,new Set()); this.listeners.get(name)!.add(callback);}
  removeEventListener(name: string, callback: () => void) {this.listeners.get(name)?.delete(callback);}
  emit(name: string) {for (const listener of this.listeners.get(name) ?? []) listener();}
}
function fixture(reducedMotion = false, extra: Record<string,unknown> = {}) {
  let time = 0, handle = 0;
  const pending = new Map<number,{kind: string; callback: (timestamp?: number) => void; delay?: number}>();
  const history = new Map<number,(timestamp?: number) => void>();
  const clock = {now() {assert.equal(this,clock,'clock method keeps its receiver'); return time;}};
  const schedule = {
    requestFrame(callback: (timestamp?: number) => void) {assert.equal(this,schedule); pending.set(++handle,{kind:'frame',callback}); history.set(handle,callback); return handle;},
    cancelFrame(id: number) {assert.equal(this,schedule);pending.delete(id);},
    setTimeout(callback: () => void, delay: number) {assert.equal(this,schedule);pending.set(++handle,{kind:'timer',callback,delay});history.set(handle,callback);return handle;},
    clearTimeout(id: number) {assert.equal(this,schedule);pending.delete(id);}
  };
  const document = new Signal(), media = new Signal();media.matches = reducedMotion;
  const changes: any[] = [], completions: any[] = [];
  const sequence = createElapsedSequence({phases:[{id:'assign',durationMs:1000,pose:'assigned'},{id:'deliver',durationMs:1000,pose:'delivered'}],clock,schedule,document,media,onChange:(state: any)=>changes.push(state),onComplete:(state: any)=>completions.push(state),...extra});
  const advance = (value: number) => {time = value;};
  const tick = (value: number, timestamp = -123) => {advance(value);const next=pending.entries().next().value as [number,{callback:(timestamp?:number)=>void}] | undefined;assert.ok(next,'exactly one callback is scheduled');pending.delete(next[0]);next[1].callback(timestamp);};
  return {sequence,pending,history,advance,tick,document,media,changes,completions};
}

test('sequence requires explicit positive finite durations and unique phase identities',()=>{
  for(const phases of [[],[{id:'a',durationMs:0}],[{id:'a',durationMs:Infinity}],[{id:'a',durationMs:NaN}],[{id:'a',durationMs:-1}],[{id:'a',durationMs:1},{id:'a',durationMs:2}]]) assert.throws(()=>createElapsedSequence({phases}),/duration|IDs/);
  assert.throws(()=>createElapsedSequence({phases:[{id:'a',durationMs:Number.MAX_VALUE},{id:'b',durationMs:Number.MAX_VALUE}]}),/Total sequence/);
});
test('long frame gaps use actual elapsed clock, complete once and stop scheduling',()=>{
  const f=fixture();assert.equal(f.pending.size,0);f.sequence.play();f.sequence.play();assert.equal(f.pending.size,1);
  f.tick(600,0);assert.equal(f.sequence.state.elapsedMs,600);assert.equal(f.sequence.state.phase.id,'assign');
  f.tick(1450,1);assert.equal(f.sequence.state.phase.id,'deliver');assert.equal(f.sequence.state.phase.elapsedMs,450);
  f.tick(5000,2);assert.equal(f.sequence.state.status,'completed');assert.equal(f.sequence.state.elapsedMs,2000);assert.equal(f.sequence.state.progress,1);assert.equal(f.completions.length,1);assert.equal(f.pending.size,0);
  for(const callback of f.history.values())callback(9000);assert.equal(f.completions.length,1);assert.equal(f.pending.size,0);
  f.sequence.play();f.tick(7000);assert.equal(f.completions.length,2);f.sequence.dispose();
});
test('pause/resume preserves elapsed continuity, while cancel/replay invalidate stale callbacks',()=>{
  const f=fixture();f.sequence.play();f.advance(400);f.sequence.pause();assert.equal(f.sequence.state.elapsedMs,400);assert.equal(f.sequence.state.status,'paused');assert.equal(f.pending.size,0);
  f.advance(10000);f.sequence.resume();f.tick(10600);assert.equal(f.sequence.state.elapsedMs,1000);assert.equal(f.sequence.state.phase.id,'deliver');
  const stale=f.history.get([...f.pending.keys()][0])!;f.sequence.cancel();const count=f.changes.length;assert.equal(f.sequence.state.status,'cancelled');assert.equal(f.sequence.state.elapsedMs,0);stale();assert.equal(f.changes.length,count);assert.equal(f.completions.length,0);
  f.sequence.replay();f.tick(12600);assert.equal(f.sequence.state.status,'completed');assert.equal(f.completions.length,1);f.sequence.dispose();
});
test('hidden-tab time is excluded and user pause remains paused after becoming visible',()=>{
  const f=fixture();f.sequence.play();f.advance(300);f.document.hidden=true;f.document.emit('visibilitychange');assert.equal(f.sequence.state.status,'suspended');assert.equal(f.sequence.state.elapsedMs,300);assert.equal(f.pending.size,0);
  f.advance(10300);f.document.hidden=false;f.document.emit('visibilitychange');f.tick(10700);assert.equal(f.sequence.state.elapsedMs,700);
  f.document.hidden=true;f.document.emit('visibilitychange');f.sequence.pause();f.advance(20000);f.document.hidden=false;f.document.emit('visibilitychange');assert.equal(f.sequence.state.status,'paused');assert.equal(f.pending.size,0);
  f.sequence.resume();f.tick(21300);assert.equal(f.sequence.state.status,'completed');f.sequence.dispose();
});
test('reduced motion paints meaningful phase poses using bounded timers and real semantics',()=>{
  const f=fixture(true);f.sequence.play();assert.equal(f.sequence.state.poseProgress,1);assert.equal(f.sequence.state.progress,0);assert.equal(f.sequence.state.phase.pose,'assigned');assert.equal([...f.pending.values()][0].kind,'timer');assert.equal([...f.pending.values()][0].delay,1000);
  f.tick(1300);assert.equal(f.sequence.state.phase.pose,'delivered');assert.equal(f.sequence.state.elapsedMs,1300);assert.equal([...f.pending.values()][0].delay,700);assert.equal([...f.pending.values()][0].kind,'timer');
  f.tick(2500);assert.equal(f.sequence.state.status,'completed');assert.equal(f.completions.length,1);assert.equal(f.pending.size,0);f.sequence.dispose();
});
test('dynamic reduced-motion changes swap schedulers without resetting elapsed time',()=>{
  const f=fixture();f.sequence.play();f.advance(350);f.media.matches=true;f.media.emit('change');assert.equal(f.sequence.state.elapsedMs,350);assert.equal(f.sequence.state.poseProgress,1);assert.equal([...f.pending.values()][0].kind,'timer');assert.equal([...f.pending.values()][0].delay,650);
  f.advance(600);f.media.matches=false;f.media.emit('change');assert.equal(f.sequence.state.elapsedMs,600);assert.equal(f.sequence.state.poseProgress,.6);assert.equal(f.pending.size,1);assert.equal([...f.pending.values()][0].kind,'frame');f.tick(2000);assert.equal(f.completions.length,1);f.sequence.dispose();
});
test('dispose removes listeners and invalidates every queued callback without late notification',()=>{
  const f=fixture();f.sequence.play();const count=f.changes.length;f.sequence.dispose();f.sequence.dispose();assert.equal(f.sequence.state.status,'disposed');assert.equal(f.pending.size,0);assert.equal(f.document.listeners.get('visibilitychange')?.size,0);assert.equal(f.media.listeners.get('change')?.size,0);
  f.advance(10000);for(const callback of f.history.values())callback();f.document.emit('visibilitychange');f.media.emit('change');assert.equal(f.changes.length,count);assert.equal(f.completions.length,0);assert.throws(()=>f.sequence.play(),/disposed/);
});
test('onChange cancellation at the endpoint prevents stale completion and replay owns a new epoch',()=>{
  let sequence: any, complete=0;
  const f=fixture(false,{onChange:(state:any)=>{if(state.status==='completed')sequence.cancel();},onComplete:()=>complete++});sequence=f.sequence;sequence.play();f.tick(2000);assert.equal(sequence.state.status,'cancelled');assert.equal(complete,0);assert.equal(f.pending.size,0);sequence.dispose();
});
