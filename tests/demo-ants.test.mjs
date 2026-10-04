import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs,verifySource,launchViewer} from '../scripts/demo-ants.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function temp(t){const root=await mkdtemp(path.join(tmpdir(),'ants-viewer-test-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
async function fixture(root,arm='ordinary'){
  const directory=path.join(root,'studies/ants-launch/source',arm);await mkdir(directory,{recursive:true});
  const payload={'index.html':'<!doctype html><button id="control">Interactive original</button><script type="module" src="entry.mjs"></script>','entry.mjs':'import { value } from "./vendor/module.mjs";document.querySelector("button").addEventListener("click",event=>event.currentTarget.textContent=value);','vendor/module.mjs':'export const value="Clicked";','package.json':JSON.stringify({scripts:{build:'DO NOT EXECUTE'},dependencies:{three:'0.180.0'}}),'package-lock.json':JSON.stringify({lockfileVersion:3}),'README.md':'Saved original source notes'};
  const hashes={};for(const [name,value]of Object.entries(payload)){await mkdir(path.dirname(path.join(directory,name)),{recursive:true});await writeFile(path.join(directory,name),value);hashes[name]=sha(value);}
  const save=()=>writeFile(path.join(directory,'SOURCE-HASHES.json'),JSON.stringify(hashes));await save();return {directory,payload,hashes,save};
}
test('only loopback and valid ports are accepted',()=>{assert.deepEqual(parseArgs(['--port','0']),{port:0});for(const args of [['--host','0.0.0.0'],['--port','65536'],['--port','-1'],['--port'],['--offline']])assert.throws(()=>parseArgs(args));});
test('arbitrary static file shapes verify exact hashes/coverage without build execution',async t=>{
  const root=await temp(t),source=await fixture(root);assert.equal((await verifySource(source.directory)).sourceDigest,sha(await readFile(path.join(source.directory,'SOURCE-HASHES.json'))));
  await writeFile(path.join(source.directory,'entry.mjs'),'changed');await assert.rejects(verifySource(source.directory),/hash mismatch/);
  await writeFile(path.join(source.directory,'entry.mjs'),source.payload['entry.mjs']);await writeFile(path.join(source.directory,'extra.txt'),'unrecorded');await assert.rejects(verifySource(source.directory),/every file exactly/);
});
test('missing assets and unresolved module imports are explicit failures',async t=>{
  const root=await temp(t),source=await fixture(root);
  await rm(path.join(source.directory,'vendor/module.mjs'));delete source.hashes['vendor/module.mjs'];await source.save();await assert.rejects(verifySource(source.directory),/Missing runtime module/);
  await writeFile(path.join(source.directory,'entry.mjs'),'import "three";');source.hashes['entry.mjs']=sha('import "three";');await source.save();await assert.rejects(verifySource(source.directory),/Unresolved module import/);
  const inline='<!doctype html><script type="module">import "https://example.com/private.js";</script>';await writeFile(path.join(source.directory,'index.html'),inline);source.hashes['index.html']=sha(inline);await source.save();await assert.rejects(verifySource(source.directory),/External module blocked/);
});
test('unreferenced Node servers and tests stay hash-covered without entering the browser graph',async t=>{
  const root=await temp(t),source=await fixture(root);
  for(const [name,code] of Object.entries({'server.mjs':'import http from "node:http";','browser.test.mjs':'import { chromium } from "playwright";'})) {await writeFile(path.join(source.directory,name),code);source.hashes[name]=sha(code);}
  await source.save();await verifySource(source.directory);
  await writeFile(path.join(source.directory,'server.mjs'),'changed backend');await assert.rejects(verifySource(source.directory),/Source hash mismatch: server.mjs/);
  source.hashes['server.mjs']=sha('changed backend');await source.save();
  await writeFile(path.join(source.directory,'vendor/module.mjs'),'import "./missing-browser.mjs";');source.hashes['vendor/module.mjs']=sha('import "./missing-browser.mjs";');await source.save();
  await assert.rejects(verifySource(source.directory),/Missing runtime module in vendor\/module.mjs: \.\/missing-browser.mjs/);
});
test('inline browser modules traverse mapped imports and reject missing reachable dependencies',async t=>{
  const root=await temp(t),source=await fixture(root);
  const inline='<script type="importmap">{"imports":{"fixture":"./vendor/module.mjs"}}</script><script type="module">import "fixture";</script><script type="application/json">{"example":"import node:fs"}</script>';
  await writeFile(path.join(source.directory,'index.html'),inline);source.hashes['index.html']=sha(inline);await source.save();await verifySource(source.directory);
  await writeFile(path.join(source.directory,'vendor/module.mjs'),'export { value } from "./absent.mjs";');source.hashes['vendor/module.mjs']=sha('export { value } from "./absent.mjs";');await source.save();
  await assert.rejects(verifySource(source.directory),/Missing runtime module in vendor\/module.mjs/);
});
test('manifest traversal and source symlinks cannot escape or disguise bytes',async t=>{
  const root=await temp(t),source=await fixture(root);source.hashes['../secret.txt']='a'.repeat(64);await source.save();await assert.rejects(verifySource(source.directory),/Invalid source manifest/);delete source.hashes['../secret.txt'];
  await writeFile(path.join(root,'secret.txt'),'secret');await symlink(path.join(root,'secret.txt'),path.join(source.directory,'leak.txt'));source.hashes['leak.txt']=sha('secret');await source.save();await assert.rejects(verifySource(source.directory),/Symlink/);
});
test('viewer exposes separate interactive origins, width/fullscreen controls, and missing arms honestly',async t=>{
  const root=await temp(t),source=await fixture(root);const viewer=await launchViewer(root,0);t.after(()=>viewer.close());
  const response=await fetch(viewer.origin),html=await response.text();assert.match(html,/Reload both pages/);assert.match(html,/390px width/);assert.match(html,/assigns no score or improvement claim/);assert.match(html,/object-fit:contain/);
  const script=await(await fetch(viewer.origin+'/viewer.mjs')).text();assert.match(script,/requestFullscreen/);assert.match(script,/Open page/);assert.match(script,/createElement\('iframe'\)/);assert.match(script,/Page unavailable/);assert.doesNotMatch(script,/autoplay/);
  const study=await(await fetch(viewer.origin+'/api/study')).json();assert.equal(study.arms[0].status,'ready');assert.equal(study.arms[1].status,'unavailable');assert.notEqual(study.arms[0].origin,viewer.origin);assert.equal(study.arms[1].origin,undefined);
  const arm=study.arms[0].origin;assert.equal(await(await fetch(arm)).text(),source.payload['index.html']);assert.match((await fetch(arm+'/entry.mjs')).headers.get('content-type'),/javascript/);assert.equal((await fetch(arm+'/package.json')).status,404);assert.equal((await fetch(arm+'/SOURCE-HASHES.json')).status,404);assert.equal((await fetch(arm+'/not-listed.txt')).status,404);assert.equal((await fetch(arm+'/%2e%2e%2fpackage.json')).status,403);assert.equal((await fetch(arm,{method:'POST'})).status,405);
  const wrong=await new Promise((resolve,reject)=>{const req=http.get(arm,{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(wrong,403);
  await writeFile(path.join(source.directory,'entry.mjs'),'changed after launch');assert.equal((await fetch(arm+'/entry.mjs')).status,409);
});
test('each ready arm receives its own origin and tampered arm receives none',async t=>{
  const root=await temp(t);await fixture(root,'ordinary');const motion=await fixture(root,'motion');const viewer=await launchViewer(root,0);const api=await(await fetch(viewer.origin+'/api/study')).json();assert.notEqual(api.arms[0].origin,api.arms[1].origin);await viewer.close();
  await writeFile(path.join(motion.directory,'index.html'),'tampered');const failed=await launchViewer(root,0);t.after(()=>failed.close());assert.equal(failed.arms[1].status,'failed');assert.match(failed.arms[1].message,/hash mismatch/);assert.equal(failed.arms[1].origin,undefined);
});
test('recordings serve exact allowlisted full bytes and validated ranges, with tamper rechecks',async t=>{
  const root=await temp(t),directory=path.join(root,'studies/ants-launch');await mkdir(path.join(directory,'evidence'),{recursive:true});
  const bytes=Buffer.from('UNIT TRANSPORT BYTES: not a playable browser recording');await writeFile(path.join(directory,'evidence/full.webm'),bytes);await writeFile(path.join(directory,'evidence/private.webm'),'private');
  await writeFile(path.join(directory,'STUDY.json'),JSON.stringify({status:'Unit transport fixture',note:'No motion measurement asserted',recordings:[{id:'ordinary-full',arm:'ordinary',file:'evidence/full.webm',sha256:sha(bytes),bytes:bytes.length},{id:'tampered',arm:'motion',file:'evidence/private.webm',sha256:'a'.repeat(64),bytes:7},{id:'escape',arm:'motion',file:'../secret.webm',sha256:'b'.repeat(64),bytes:8}]}));
  const viewer=await launchViewer(root,0);t.after(()=>viewer.close());const api=await(await fetch(viewer.origin+'/api/study')).json();assert.equal(api.recordings[0].available,true);assert.equal(api.recordings[1].available,false);assert.equal(api.recordings[2].available,false);assert.equal(api.status,'Unit transport fixture');assert.equal(api.documents[0].name,'STUDY.json');
  const url=viewer.origin+api.recordings[0].url;const full=await fetch(url);assert.equal(full.headers.get('content-type'),'video/webm');assert.deepEqual(Buffer.from(await full.arrayBuffer()),bytes);
  const partial=await fetch(url,{headers:{Range:'bytes=4-9'}});assert.equal(partial.status,206);assert.deepEqual(Buffer.from(await partial.arrayBuffer()),bytes.subarray(4,10));assert.equal(partial.headers.get('content-range'),`bytes 4-9/${bytes.length}`);
  const suffix=await fetch(url,{headers:{Range:'bytes=-3'}});assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),bytes.subarray(-3));const head=await fetch(url,{method:'HEAD'});assert.equal(head.headers.get('content-length'),String(bytes.length));assert.equal(await head.text(),'');
  for(const range of ['bytes=500-','bytes=8-3','bytes=-0','bytes=0-1,3-4','invalid'])assert.equal((await fetch(url,{headers:{Range:range}})).status,416);
  for(const route of ['/recordings/tampered','/recordings/escape','/evidence/private.webm','/study/../package.json'])assert.equal((await fetch(viewer.origin+route)).status,404);
  await writeFile(path.join(directory,'evidence/full.webm'),'changed');assert.equal((await fetch(url)).status,409);
});
