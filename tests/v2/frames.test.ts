import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {frameSource,frameTimes,frameRequestAllowed,recordedFrames,frameDimensions} from '../../packages/core/frames';
import type {MotionCapture} from '../../packages/core/types';

const id='11111111-2222-4333-8444-555555555555';
const report=()=>({schemaVersion:'2.0',id,recipe:{durationMs:2400},artifacts:{videoOffsetMs:500,video:'/untrusted/path'},findings:[{confidence:'contract-violation',sampleTimes:[800]}]} as MotionCapture);
test('temporary recording endpoint rejects rebinding hosts and foreign origins',()=>{
  assert.equal(frameRequestAllowed('127.0.0.1:5000',undefined,'http://127.0.0.1:5000'),true);
  assert.equal(frameRequestAllowed('127.0.0.1:5000','http://127.0.0.1:5000','http://127.0.0.1:5000'),true);
  assert.equal(frameRequestAllowed('attacker.test:5000',undefined,'http://127.0.0.1:5000'),false);
  assert.equal(frameRequestAllowed('127.0.0.1:5000','https://attacker.test','http://127.0.0.1:5000'),false);
  assert.equal(frameRequestAllowed('127.0.0.1:5000',undefined,''),false);
});
test('pre-cancelled frame requests do not read files or launch a browser',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(recordedFrames(id,{artifactRoot:'/nonexistent',signal:controller.signal}),/canceled/);
});
test('frame selection prefers actual failing time window and bounds explicit requests',()=>{
  assert.deepEqual(frameTimes(report()),[700,800,900]);
  assert.deepEqual(frameTimes(report(),[1200,0,1200]),[0,1200]);
  for(const times of [[],[-1],[2401],[NaN],[0,1,2,3,4,5,6]])assert.throws(()=>frameTimes(report(),times));
});
test('frame selection includes observed identity and cancellation event windows',()=>{
  const identity={...report(),findings:[{type:'identity-replacement',summary:'node replaced',confidence:'observed',sampleTimes:[400],eventIds:[]}]} as MotionCapture;
  assert.deepEqual(frameTimes(identity),[300,400,500]);
  const cancel={...report(),findings:[{type:'active-animation-cancel',summary:'cancel observed',confidence:'observed',sampleTimes:[],eventIds:['cancel-1']}],events:[{id:'cancel-1',t:600,type:'animation-cancel',label:'cancel',origin:'browser-observed',detail:{}}]} as MotionCapture;
  assert.deepEqual(frameTimes(cancel),[500,600,700]);
});
test('journey selection covers the complete interaction instead of a single finding',()=>{
  assert.deepEqual(frameTimes(report(),undefined,'journey'),[0,480,960,1440,1920,2400]);
  assert.deepEqual(frameTimes(report(),[0,1200,2400],'journey'),[0,1200,2400]);
});
test('detail frames preserve aspect and never upscale or conceal source dimensions',()=>{
  assert.deepEqual(frameDimensions(1280,800,{maxWidth:1280,maxHeight:960}),{width:1280,height:800,sourceWidth:1280,sourceHeight:800,scale:1});
  assert.deepEqual(frameDimensions(390,844,{maxWidth:1280,maxHeight:960}),{width:390,height:844,sourceWidth:390,sourceHeight:844,scale:1});
  assert.equal(frameDimensions(1280,800).width,720);
  for(const bounds of [{maxWidth:99999},{maxHeight:-1},{maxWidth:NaN}])assert.throws(()=>frameDimensions(1280,800,bounds));
});
test('recorded frame source resolves fixed capture files and ignores untrusted report paths',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'motion-frame-source-')),directory=path.join(root,id);await mkdir(directory);
  await writeFile(path.join(directory,'report.json'),JSON.stringify(report()));await writeFile(path.join(directory,'video.webm'),Buffer.alloc(64));
  const source=await frameSource(id,{artifactRoot:root});assert.equal(source.video,path.join(directory,'video.webm'));
  await assert.rejects(frameSource('../../.env',{artifactRoot:root}),/UUID/);
  await writeFile(path.join(directory,'report.json'),JSON.stringify({...report(),id:'wrong'}));
  await assert.rejects(frameSource(id,{artifactRoot:root}),/identity/);
});
test('frame source rejects symlinked captures and symlinked video artifacts',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'motion-frame-root-')),outside=await mkdtemp(path.join(os.tmpdir(),'motion-frame-outside-'));
  await symlink(outside,path.join(root,id),'dir');await assert.rejects(frameSource(id,{artifactRoot:root}),/symlink/);
  const clean=await mkdtemp(path.join(os.tmpdir(),'motion-frame-clean-')),directory=path.join(clean,id);await mkdir(directory);
  await writeFile(path.join(directory,'report.json'),JSON.stringify(report()));await writeFile(path.join(outside,'recording'),Buffer.alloc(64));
  await symlink(path.join(outside,'recording'),path.join(directory,'video.webm'));await assert.rejects(frameSource(id,{artifactRoot:clean}),/symlink/);
});
test('frame source fails closed for missing video and invalid timing',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'motion-frame-invalid-')),directory=path.join(root,id);await mkdir(directory);
  await writeFile(path.join(directory,'report.json'),JSON.stringify(report()));await assert.rejects(frameSource(id,{artifactRoot:root}),/ENOENT/);
  await writeFile(path.join(directory,'video.webm'),Buffer.alloc(64));
  await writeFile(path.join(directory,'report.json'),JSON.stringify({...report(),artifacts:{videoOffsetMs:-3}}));
  await assert.rejects(frameSource(id,{artifactRoot:root}),/timing/);
});
