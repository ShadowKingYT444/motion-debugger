import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink,cp,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {parseArgs,verifySource,launchViewer} from '../scripts/demo-ants.mjs';
import {parseLoopArgs} from '../scripts/demo-loop.mjs';
import {snapshotSource} from '../scripts/study/source-snapshot.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function temp(t){const root=await mkdtemp(path.join(tmpdir(),'ants-viewer-test-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
async function fixture(root,arm='ordinary',study='ants-launch'){
  const directory=path.join(root,'studies',study,'source',arm);await mkdir(directory,{recursive:true});
  const payload={'index.html':'<!doctype html><button id="control">Interactive original</button><script type="module" src="entry.mjs"></script>','entry.mjs':'import { value } from "./vendor/module.mjs";document.querySelector("button").addEventListener("click",event=>event.currentTarget.textContent=value);','vendor/module.mjs':'export const value="Clicked";','package.json':JSON.stringify({scripts:{build:'DO NOT EXECUTE'},dependencies:{three:'0.180.0'}}),'package-lock.json':JSON.stringify({lockfileVersion:3}),'README.md':'Saved original source notes'};
  const hashes={};for(const [name,value]of Object.entries(payload)){await mkdir(path.dirname(path.join(directory,name)),{recursive:true});await writeFile(path.join(directory,name),value);hashes[name]=sha(value);}
  const save=()=>writeFile(path.join(directory,'SOURCE-HASHES.json'),JSON.stringify(hashes));await save();return {directory,payload,hashes,save};
}
test('only loopback and valid ports are accepted',()=>{assert.deepEqual(parseArgs(['--port','0']),{port:0});for(const args of [['--host','0.0.0.0'],['--port','65536'],['--port','-1'],['--port'],['--offline']])assert.throws(()=>parseArgs(args));});
test('LOOP wrapper has a fixed study and port, with no path or label CLI',()=>{
  assert.deepEqual(parseArgs([]),{port:4120});assert.deepEqual(parseLoopArgs([]),{port:4121});assert.deepEqual(parseLoopArgs(['--port','0']),{port:0});assert.deepEqual(parseLoopArgs(['--help']),{port:4121,help:true});
  for(const args of [['--study','ants-launch'],['--root','/tmp'],['--title','Injected'],['--host','0.0.0.0']])assert.throws(()=>parseLoopArgs(args),/Unsupported option/);
});
test('unknown or traversal study names reject before reading snapshots',async t=>{
  const root=await temp(t);
  for(const study of ['../outside','__proto__','constructor','unknown','LOOP','loop-studio/../ants-launch',null,{},42])await assert.rejects(launchViewer(root,0,{study}),/Unknown study/);
});
test('arbitrary static file shapes verify exact hashes/coverage without build execution',async t=>{
  const root=await temp(t),source=await fixture(root);assert.equal((await verifySource(source.directory)).sourceDigest,sha(await readFile(path.join(source.directory,'SOURCE-HASHES.json'))));
  await writeFile(path.join(source.directory,'entry.mjs'),'changed');await assert.rejects(verifySource(source.directory),/hash mismatch/);
  await writeFile(path.join(source.directory,'entry.mjs'),source.payload['entry.mjs']);await writeFile(path.join(source.directory,'extra.txt'),'unrecorded');await assert.rejects(verifySource(source.directory),/every file exactly/);
});
test('schema1 snapshots verify exact hashes, byte sizes and separate manifest/application identities',async t=>{
  const root=await temp(t),source=await fixture(root,'ordinary','loop-studio');
  const files=Object.fromEntries(Object.entries(source.hashes).map(([name,sha256])=>[name,{sha256,bytes:Buffer.byteLength(source.payload[name])}]));
  const manifest={schemaVersion:1,files},bytes=JSON.stringify(manifest,null,2)+'\n';await writeFile(path.join(source.directory,'SOURCE-HASHES.json'),bytes);
  const verified=await verifySource(source.directory);assert.deepEqual(verified.hashes,source.hashes);assert.equal(verified.sourceDigest,sha(bytes));assert.equal(verified.manifestSha256,sha(bytes));assert.equal(verified.applicationInputDigest,sha(JSON.stringify(files)));assert.notEqual(verified.applicationInputDigest,verified.manifestSha256);
  const viewer=await launchViewer(root,0,{study:'loop-studio'});t.after(()=>viewer.close());const api=await(await fetch(viewer.origin+'/api/study')).json();assert.equal(api.arms[0].status,'ready');assert.equal(api.arms[0].applicationInputDigest,verified.applicationInputDigest);assert.equal(api.arms[0].manifestSha256,verified.manifestSha256);assert.equal(await(await fetch(api.arms[0].origin+'/entry.mjs')).text(),source.payload['entry.mjs']);
  await writeFile(path.join(source.directory,'entry.mjs'),'tampered');assert.equal((await fetch(api.arms[0].origin+'/entry.mjs')).status,409);await assert.rejects(verifySource(source.directory),/Source byte size mismatch/);
  await writeFile(path.join(source.directory,'entry.mjs'),source.payload['entry.mjs'].replace('button','BUTTON'));await assert.rejects(verifySource(source.directory),/Source hash mismatch/);
  await writeFile(path.join(source.directory,'entry.mjs'),source.payload['entry.mjs']);await writeFile(path.join(source.directory,'extra.mjs'),'export {};');await assert.rejects(verifySource(source.directory),/every file exactly/);
});
test('actual snapshot producer and viewer agree on schema1 application-input identity',async t=>{
  const root=await temp(t),source=await fixture(root),destination=path.join(root,'studies/loop-studio/source/ordinary');
  const frozen=await snapshotSource(source.directory,destination),verified=await verifySource(destination);
  assert.equal(verified.applicationInputDigest,frozen.digest);assert.deepEqual(verified.hashes,source.hashes);assert.equal(verified.sourceDigest,sha(await readFile(path.join(destination,'SOURCE-HASHES.json'))));
});
test('schema1 rejects unsupported versions, mixed fields, invalid sizes and incomplete inventories',async t=>{
  const root=await temp(t),source=await fixture(root);
  const files=Object.fromEntries(Object.entries(source.hashes).map(([name,sha256])=>[name,{sha256,bytes:Buffer.byteLength(source.payload[name])}]));
  const invalid=[{schemaVersion:2,files},{schemaVersion:1,files:[]},{schemaVersion:1,files:null},{schemaVersion:1,files,extra:true},...[-1,1.5,'2',Number.MAX_SAFE_INTEGER+1,null].map(bytes=>({schemaVersion:1,files:{...files,'entry.mjs':{...files['entry.mjs'],bytes}}})),{schemaVersion:1,files:{...files,'entry.mjs':source.hashes['entry.mjs']}},{schemaVersion:1,files:{...files,'entry.mjs':{...files['entry.mjs'],mtimeMs:0}}},{schemaVersion:1,files:{...files,'../outside':{sha256:'a'.repeat(64),bytes:1}}}];
  for(const manifest of invalid){await writeFile(path.join(source.directory,'SOURCE-HASHES.json'),JSON.stringify(manifest));await assert.rejects(verifySource(source.directory),/Invalid SOURCE-HASHES|Invalid source manifest/);}
  await writeFile(path.join(source.directory,'SOURCE-HASHES.json'),JSON.stringify({schemaVersion:1,files:{...files,'entry.mjs':{...files['entry.mjs'],bytes:files['entry.mjs'].bytes+1}}}));await assert.rejects(verifySource(source.directory),/Source byte size mismatch/);
  const incomplete={...files};delete incomplete['README.md'];await writeFile(path.join(source.directory,'SOURCE-HASHES.json'),JSON.stringify({schemaVersion:1,files:incomplete}));await assert.rejects(verifySource(source.directory),/every file exactly/);
  delete incomplete['index.html'];await writeFile(path.join(source.directory,'SOURCE-HASHES.json'),JSON.stringify({schemaVersion:1,files:incomplete}));await assert.rejects(verifySource(source.directory),/Missing mandatory source/);
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
  const response=await fetch(viewer.origin),html=await response.text();assert.match(html,/Reload both pages/);assert.match(html,/Fit desktop/);assert.match(html,/complete 1440 × 960 live viewport at panel scale/);assert.match(html,/390px width/);assert.match(html,/assigns no score or improvement claim/);assert.match(html,/object-fit:contain/);
  const script=await(await fetch(viewer.origin+'/viewer.mjs')).text();assert.match(script,/requestFullscreen/);assert.match(script,/frame\.sandbox='allow-scripts allow-same-origin allow-popups allow-downloads'/);assert.match(script,/Open page/);assert.match(script,/createElement\('iframe'\)/);assert.match(script,/Page unavailable/);assert.doesNotMatch(script,/autoplay/);
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
test('LOOP isolates both verified static arms and exposes only exact study recordings',async t=>{
  const root=await temp(t),ordinary=await fixture(root,'ordinary','loop-studio'),motion=await fixture(root,'motion','loop-studio');
  // The other study deliberately contains different bytes: selection must stay fixed.
  const other=await fixture(root);await writeFile(path.join(other.directory,'index.html'),'<p>Ants only</p>');other.hashes['index.html']=sha('<p>Ants only</p>');await other.save();
  const directory=path.join(root,'studies/loop-studio');await mkdir(path.join(directory,'evidence'),{recursive:true});
  const video=Buffer.from('LOOP UNIT TRANSPORT: full bytes, not measured browser evidence');await writeFile(path.join(directory,'evidence/full.mp4'),video);
  await writeFile(path.join(directory,'STUDY.json'),JSON.stringify({status:'Synthetic LOOP transport fixture',note:'No product comparison outcome asserted',recordings:[{id:'motion-full',arm:'motion',label:'Full motion fixture',file:'evidence/full.mp4',sha256:sha(video),bytes:video.length}]}));
  const viewer=await launchViewer(root,0,{study:'loop-studio',title:'<script>injected</script>',path:'../outside'});t.after(()=>viewer.close());
  assert.equal(viewer.study,'loop-studio');const html=await(await fetch(viewer.origin)).text();assert.match(html,/<title>LOOP — motion study<\/title>/);assert.match(html,/Frozen local comparison · LOOP studio/);assert.doesNotMatch(html,/Anthropic Ants|injected/);assert.match(html,/assigns no score or improvement claim/);
  const api=await(await fetch(viewer.origin+'/api/study')).json();assert.equal(api.study,'loop-studio');assert.equal(api.status,'Synthetic LOOP transport fixture');assert.equal(api.arms.length,2);assert.equal(api.arms.every(arm=>arm.status==='ready'),true);assert.equal(new Set([viewer.origin,...api.arms.map(arm=>arm.origin)]).size,3);
  for(const [i,source] of [ordinary,motion].entries()) {assert.equal(api.arms[i].sourceDigest,sha(await readFile(path.join(source.directory,'SOURCE-HASHES.json'))));assert.equal(await(await fetch(api.arms[i].origin)).text(),source.payload['index.html']);assert.equal(await(await fetch(api.arms[i].origin+'/vendor/module.mjs')).text(),source.payload['vendor/module.mjs']);assert.equal((await fetch(api.arms[i].origin+'/SOURCE-HASHES.json')).status,404);}
  const url=viewer.origin+api.recordings[0].url,full=await fetch(url);assert.equal(full.headers.get('content-type'),'video/mp4');assert.deepEqual(Buffer.from(await full.arrayBuffer()),video);const range=await fetch(url,{headers:{Range:'bytes=5-15'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),video.subarray(5,16));
  assert.equal((await fetch(viewer.origin+'/studies/ants-launch/STUDY.json')).status,404);assert.equal((await fetch(viewer.origin+'/evidence/full.mp4')).status,404);
  await writeFile(path.join(motion.directory,'vendor/module.mjs'),'tampered');assert.equal((await fetch(api.arms[1].origin+'/vendor/module.mjs')).status,409);
  await writeFile(path.join(directory,'evidence/full.mp4'),'tampered');assert.equal((await fetch(url)).status,409);
  const ants=await launchViewer(root,0);t.after(()=>ants.close());assert.equal(ants.study,'ants-launch');assert.match(await(await fetch(ants.origin)).text(),/<title>Ants — motion study<\/title>/);
});
// Opt-in native proof: MOTION_VIEWER_BROWSER=1 node --import tsx --test tests/demo-ants.test.mjs
test('native iframe user clicks download exact SVG and JSON exports', {skip:process.env.MOTION_VIEWER_BROWSER!=='1'},async t=>{
  const {chromium}=await import('playwright'),{chromiumOptions}=await import('../server/browser.ts');
  const root=await temp(t),run=path.resolve('artifacts/loop-viewer-downloads',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(run,{recursive:true});
  const expected={svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><circle cx="30" cy="30" r="20" fill="#21a47b"/></svg>',json:JSON.stringify({fixture:'Synthetic iframe export proof',formation:'Orbit',progress:.75},null,2)};
  const sources=[];
  for(const arm of ['ordinary','motion']) {
    const source=await fixture(root,arm,'loop-studio');sources.push(source);
    const payload={...source.payload,'index.html':`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;position:relative;min-height:960px;background:#eef7f2;color:#163f35;font:24px system-ui}.caption{position:absolute;left:50px;top:160px;max-width:530px}#scene{position:absolute;left:65%;top:210px;width:28%;height:560px;background:radial-gradient(circle at 36% 25%,#c6f8d5,#268b78 35%,#143638 70%);border-radius:42% 58% 38% 62%;box-shadow:30px 40px 0 #98c8ae}.exports{position:absolute;left:50px;top:850px;display:flex;gap:12px}button{font:inherit;padding:12px}@media(max-width:600px){.caption{left:24px;top:40px;font-size:18px}#scene{left:20%;top:290px;width:60%;height:320px;box-shadow:10px 15px 0 #98c8ae}.exports{left:24px;top:700px;flex-wrap:wrap;max-width:330px}button{font-size:16px}}</style><div class="caption"><h1>Synthetic complete composition</h1><p>Original viewport fixture. No paired study result asserted.</p></div><div id="scene" role="img" aria-label="Synthetic scene landmark"></div><div class="exports"><button id="toggle">Play</button><button id="svg">Export SVG</button><button id="json">Export JSON</button></div><script type="module" src="entry.mjs"></script>`,
      'entry.mjs':`const exports=${JSON.stringify(expected)};for(const type of ['svg','json'])document.querySelector('#'+type).addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([exports[type]],{type:type==='svg'?'image/svg+xml':'application/json'}));const a=document.createElement('a');a.href=url;a.download='${arm}-fixture.'+type;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});document.querySelector('#toggle').addEventListener('click',event=>{const playing=event.currentTarget.textContent==='Play';event.currentTarget.textContent=playing?'Pause':'Play';document.body.dataset.count=String(Number(document.body.dataset.count??0)+1);});document.body.dataset.ready='true';`};
    const files={};for(const [name,bytes] of Object.entries(payload)){await writeFile(path.join(source.directory,name),bytes);files[name]={sha256:sha(bytes),bytes:Buffer.byteLength(bytes)};}
    await writeFile(path.join(source.directory,'SOURCE-HASHES.json'),JSON.stringify({schemaVersion:1,files},null,2));
  }
  await cp(path.join(root,'studies'),path.join(run,'fixture/studies'),{recursive:true});await cp(new URL('../scripts/demo-ants.mjs',import.meta.url),path.join(run,'demo-ants-tested.mjs'));await cp(new URL('./demo-ants.test.mjs',import.meta.url),path.join(run,'test-harness.mjs'));
  const viewer=await launchViewer(root,0,{study:'loop-studio'});let browser;
  const git=args=>spawnSync('git',args,{encoding:'utf8'});
  const report={status:'running',scope:'Synthetic credential-free viewer fit/native-control/export proof; not a coding-agent comparison',source:{commit:git(['rev-parse','HEAD']).stdout.trim(),dirty:!!git(['status','--porcelain']).stdout.trim()},node:process.version,browser:null,interDownloadWaitMs:1100,displayChecks:[],downloads:[],errors:[]};
  try {
    browser=await chromium.launch(chromiumOptions());report.browser=await browser.version();
    for(const [viewportName,viewport] of [['desktop',{width:1280,height:720}],['mobile',{width:390,height:844}]]) {
      const context=await browser.newContext({viewport,acceptDownloads:true,recordVideo:{dir:run,size:viewport}}),page=await context.newPage();
      page.on('pageerror',error=>report.errors.push(error.message));
      try {
        await page.goto(viewer.origin);await page.locator('iframe').first().waitFor();
        assert.equal(page.frames().length,3);assert.equal(new Set(page.frames().map(frame=>new URL(frame.url()).origin)).size,3);
        const composition=async index=>page.frameLocator('iframe').nth(index).locator('body').evaluate(()=>({width:innerWidth,height:innerHeight,scene:document.querySelector('#scene').getBoundingClientRect().toJSON()}));
        for(let index=0;index<2;index++){await page.frameLocator('iframe').nth(index).locator('body[data-ready="true"]').waitFor();const state=await composition(index);assert.equal(state.width,1440);assert.equal(state.height,960);assert.ok(state.scene.x>=0&&state.scene.y>=0&&state.scene.right<=1440&&state.scene.bottom<=960);}
        await page.screenshot({path:path.join(run,viewportName+'-fit-desktop.png')});
        if(viewportName==='desktop') {
          const cards=await page.locator('.panel').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));assert.ok(cards.every(card=>card.top>=0&&card.bottom<=viewport.height));
          await page.getByRole('button',{name:'390px width',exact:true}).click();for(let index=0;index<2;index++)assert.equal((await composition(index)).width,390);
          await page.screenshot({path:path.join(run,'desktop-narrow-mode.png')});await page.getByRole('button',{name:'Fit desktop',exact:true}).click();
          await page.getByRole('button',{name:'Fullscreen',exact:true}).first().click();await page.waitForFunction(()=>document.querySelector('iframe').dataset.displayMode==='fullscreen');const full=await composition(0);assert.equal(full.width,1280);assert.ok(full.height<=720&&full.height>=320);assert.equal(await page.locator('iframe').first().getAttribute('data-display-scale'),'1');await page.screenshot({path:path.join(run,'native-fullscreen.png')});await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>document.querySelector('iframe').dataset.viewport==='1440x960');
          const [popup]=await Promise.all([page.waitForEvent('popup'),page.getByRole('link',{name:'Open page',exact:true}).first().click()]);await popup.waitForLoadState('domcontentloaded');assert.equal(new URL(popup.url()).origin,viewer.arms[0].origin);assert.equal(await popup.evaluate(()=>innerWidth),1280);await popup.close();
          const originalFrames=page.frames().slice(1);const navigations=originalFrames.map(frame=>page.waitForEvent('framenavigated',{predicate:next=>next===frame}));await Promise.all([Promise.all(navigations),page.getByRole('button',{name:'Reload both pages',exact:true}).click()]);
        }
        report.displayChecks.push({viewport:viewportName,iframeViewport:{width:1440,height:960},bothScenesInsideViewport:true,completeCardsVisible:viewportName==='desktop',narrowMode:viewportName==='desktop',nativeFullscreen:viewportName==='desktop',openPage:viewportName==='desktop'});
        for(const [index,arm] of ['ordinary','motion'].entries()) {
          assert.ok((await page.locator('iframe').nth(index).getAttribute('sandbox')).split(' ').includes('allow-downloads'));
          const frame=page.frameLocator('iframe').nth(index);await frame.locator('body[data-ready="true"]').waitFor();
          await frame.locator('#toggle').click();assert.equal(await frame.locator('#toggle').textContent(),'Pause');await frame.locator('#toggle').press('Enter');assert.equal(await frame.locator('#toggle').textContent(),'Play');assert.equal(await frame.locator('body').getAttribute('data-count'),'2');
          for(const format of ['svg','json']) {
            report.pending={viewport:viewportName,arm,format};
            const [download]=await Promise.all([page.waitForEvent('download',{timeout:5000}),frame.locator('#'+format).click()]);
            assert.equal(download.suggestedFilename(),`${arm}-fixture.${format}`);assert.equal(await download.failure(),null);
            const filename=`${viewportName}-${arm}.${format}`;await download.saveAs(path.join(run,filename));const bytes=await readFile(path.join(run,filename));assert.deepEqual(bytes,Buffer.from(expected[format]));
            report.downloads.push({viewport:viewportName,arm,format,file:filename,bytes:bytes.length,sha256:sha(bytes),url:download.url(),input:'Native click inside sandboxed iframe'});delete report.pending;
            // Give each user download time to finish before the next input.
            await page.waitForTimeout(1100);
          }
          await page.locator('.panel').nth(index).scrollIntoViewIfNeeded();await page.waitForTimeout(200);await page.screenshot({path:path.join(run,`${viewportName}-${arm}.png`)});
        }
      }finally{await context.close();}
    }
    assert.deepEqual(report.errors,[]);assert.equal(report.downloads.length,8);
    await writeFile(path.join(sources[1].directory,'entry.mjs'),'tampered after exports');assert.equal((await fetch(viewer.arms[1].origin+'/entry.mjs')).status,409);
    report.sourceTamperRejected=true;report.status='passed';
  }catch(error){report.status='failed';report.error=String(error.stack??error);throw error;}
  finally {
    if(browser)await browser.close();await viewer.close();await writeFile(path.join(run,'browser-verification.json'),JSON.stringify(report,null,2));
    const inventory={};async function walk(directory,prefix=''){for(const entry of await readdir(directory,{withFileTypes:true})){const name=prefix+entry.name;if(entry.isDirectory())await walk(path.join(directory,entry.name),name+'/');else{const bytes=await readFile(path.join(directory,entry.name));inventory[name]={sha256:sha(bytes),bytes:bytes.length};}}}await walk(run);await writeFile(path.join(run,'EVIDENCE-HASHES.json'),JSON.stringify(inventory,null,2));
    console.log('Synthetic iframe export proof: '+path.join(run,'browser-verification.json'));
  }
});
