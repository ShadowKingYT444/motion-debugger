import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {prepareAssembly} from '../scripts/prepare-assembly.mjs';
import {createAssemblyMotion} from '../examples/assembly/scaffold/controller.mjs';
import {DESIGN} from '../examples/assembly/design.mjs';
test('future common inputs omit authored motion, evidence and history and never overwrite a destination',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'assembly-input-'));try{
    const directory=path.join(root,'common'),input=await prepareAssembly(directory);
    assert.equal(input.referenceMotionIncluded,false);assert.equal(input.campaignRunnable,false);
    assert.ok(!Object.keys(input.files).some(file=>/recording|\.webm|\.git\//.test(file)));
    assert.equal(await readFile(path.join(directory,'motion/controller.mjs'),'utf8'),await readFile('examples/assembly/scaffold/controller.mjs','utf8'));
    assert.notEqual(await readFile(path.join(directory,'motion/controller.mjs'),'utf8'),await readFile('examples/assembly/motion/controller.mjs','utf8'));
    const before=await readFile(path.join(directory,'INPUT-MANIFEST.json'),'utf8');await assert.rejects(prepareAssembly(directory),/overwrite/);assert.equal(await readFile(path.join(directory,'INPUT-MANIFEST.json'),'utf8'),before);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('common scaffold has useful controls/endpoints but does not pretend to supply a motion solution',()=>{
  const control=createAssemblyMotion(DESIGN);assert.equal(control.state.selected,'standard');control.open();assert.equal(control.state.progress,1);assert.equal(control.state.playing,false);control.select('tele');assert.equal(control.state.selected,'tele');control.seek(.35);assert.equal(control.state.progress,.35);control.release();assert.equal(control.state.paused,true);control.resume();assert.equal(control.state.progress,1);control.inspect();assert.equal(control.state.view,'inspector');control.open();assert.equal(control.state.view,'assembled');assert.equal(control.state.progress,0);
});
