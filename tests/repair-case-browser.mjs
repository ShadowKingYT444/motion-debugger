// Actual source-pair browser observations plus the real shipped MCP transport.
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { launchRepairCase, CASE } from '../scripts/demo-repair.mjs';
import { ROOT } from '../scripts/demo-study.mjs';
import {execFileSync} from 'node:child_process';
const output=path.join(ROOT,'artifacts/repair-case');await mkdir(output,{recursive:true});
const cacheIndex=process.argv.indexOf('--cache');
const options={port:0,offline:process.argv.includes('--offline'),...(cacheIndex>=0?{cache:process.argv[cacheIndex+1]}:{})};
let session,browser,client;
// Direction is a functional observation after real rAF progress, not a claim
// about 60ms wall-clock smoothness on a software-rendered shared runner.
async function observeReversal(page,fromX){
 return page.evaluate(fromX=>new Promise(resolve=>{
  const start=performance.now(),samples=[];
  function read(t){
   const d=document.querySelector('#details'),x=d.getBoundingClientRect().x;
   samples.push({t:t-start,observedAtMs:performance.now()-start,x});
   if(x>fromX+2||x<fromX-.1||performance.now()-start>1000)resolve(samples);else requestAnimationFrame(read);
  }
  requestAnimationFrame(read);
 }),fromX);
}
// Native CSS transitions may start after a delayed compositor commit. Wait for
// observed completion when a step intends a fully closed drawer; interruption
// waits and all intermediate/reversal assertions retain their original timing.
async function waitForClosed(page) {
 const observe=()=>page.evaluate(()=>{const d=document.querySelector('#details'),r=d.getBoundingClientRect();return {t:performance.now(),open:d.open,modal:d.matches(':modal'),display:getComputedStyle(d).display,width:r.width,focusedTag:document.activeElement.tagName,focusedId:document.activeElement.id,focusedText:document.activeElement.textContent.slice(0,80),animations:d.getAnimations().map(a=>({time:a.currentTime,state:a.playState,pending:a.pending})),events:window.nativeDialogEvents,trace:window.drawerTrace}});
 const before=await observe();let failure;
 try{await page.waitForFunction(()=>{const d=document.querySelector('#details');return !d.open&&getComputedStyle(d).display==='none'},undefined,{timeout:3000});}
 catch(error){failure=error;throw error;}
 finally{
  const after=await observe();const observation={url:page.url(),before,after,waitMs:after.t-before.t,status:failure?'failed':'passed',error:failure?.message};
  report.closeSettlements.push(observation);await writeFile(path.join(output,`close-settlement-${report.closeSettlements.length}.json`),JSON.stringify(observation,null,2));
 }
}

const report={scope:'New source-repair case; actual browser behavior and SDK MCP transport, not a blind-agent benchmark or universal motion-quality score',sourceCommit:'63eff24c88dcbf42438230117834d8247e103367',checks:[],errors:[],captures:[],comparisons:[],closeSettlements:[]};
report.harnessSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
report.implementationCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
report.runtimeSha256=createHash('sha256').update(await readFile(path.join(ROOT,'build/mcp/index.js'))).digest('hex');
try {
 session=await launchRepairCase(options);
 const executablePath=process.env.MOTION_CHROME_PATH??process.env.CHROMIUM_PATH;
 browser=await chromium.launch({...(executablePath?{executablePath}:{})});
 report.browser={version:browser.version(),executablePath:executablePath??'Playwright default headless shell'};
 for(const item of session.snapshots){
  const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:output,size:{width:1440,height:1000}},serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===item.origin||['data:','blob:'].includes(u.protocol))return route.continue();report.errors.push('Blocked external request '+u.origin);return route.abort()});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.reopenBoundaries=[];document.addEventListener('click',event=>{if(event.target.closest('[data-open-details]')){const d=document.querySelector('#details'),r=d.getBoundingClientRect();window.reopenBoundaries.push({t:performance.now(),x:r.x,width:r.width,open:d.open});}},true);window.drawerTrace=[];window.traceDrawer=false;window.traceStart=0;function sample(t){if(window.traceDrawer){const d=document.querySelector('#details'),r=d.getBoundingClientRect();window.drawerTrace.push({t:t-window.traceStart,open:d.open,x:r.x,width:r.width,opacity:Number(getComputedStyle(d).opacity),display:getComputedStyle(d).display})}requestAnimationFrame(sample)}requestAnimationFrame(sample)});
  await page.addInitScript(()=>{window.nativeDialogEvents=[];document.addEventListener('DOMContentLoaded',()=>{const d=document.querySelector('#details');for(const type of ['cancel','close'])d.addEventListener(type,event=>window.nativeDialogEvents.push({type,t:performance.now(),open:d.open,defaultPrevented:event.defaultPrevented,display:getComputedStyle(d).display,width:d.getBoundingClientRect().width}))})});
  await page.goto(item.origin,{waitUntil:'networkidle'});await page.waitForTimeout(1000);
  for(const width of [1440,960,390,320]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${item.stage}: ${width}px layout`);
   await page.screenshot({path:path.join(output,`${item.stage}-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  assert.equal(await page.evaluate(()=>window.__aer.getState().failed),false,'Actual procedural WebGL scene must render');
  const canvas=page.locator('#scene canvas');const frameA=await canvas.screenshot();await page.waitForTimeout(300);const frameB=await canvas.screenshot();
  assert.notEqual(createHash('sha256').update(frameA).digest('hex'),createHash('sha256').update(frameB).digest('hex'),'Normal mode must show actual changing 3D pixels');
  await writeFile(path.join(output,`${item.stage}-rotor-a.png`),frameA);await writeFile(path.join(output,`${item.stage}-rotor-b.png`),frameB);
  await page.locator('[data-speed="3"]').click();await page.waitForTimeout(120);await page.locator('#power').click();await page.waitForTimeout(80);await page.locator('#power').click();
  await page.locator('#orbit-right').click();await page.waitForTimeout(80);await page.locator('#orbit-left').click();await page.locator('#reset-view').click();
  assert.equal(await page.locator('#power').getAttribute('aria-pressed'),'true');
  await page.locator('[data-open-details]').first().click();await page.waitForTimeout(500);
  await page.evaluate(()=>{window.drawerTrace=[];window.traceDrawer=true;window.traceStart=performance.now()});
  const closeStart=await page.evaluate(()=>{const d=document.querySelector('#details');return {t:performance.now(),open:d.open,focused:document.activeElement?.id,rect:d.getBoundingClientRect().toJSON(),display:getComputedStyle(d).display,animations:d.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime}))}});
  await page.keyboard.press('Escape');await page.waitForTimeout(160);
  const exitTrace=await page.evaluate(()=>window.drawerTrace);
  const closeEnd=await page.evaluate(()=>{const d=document.querySelector('#details');return {t:performance.now(),open:d.open,focused:document.activeElement?.id,rect:d.getBoundingClientRect().toJSON(),display:getComputedStyle(d).display,animations:d.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime}))}});
  await writeFile(path.join(output,`${item.stage}-exit-observation.json`),JSON.stringify({browser:report.browser,sourceDigest:item.sourceDigest,distDigest:item.distDigest,closeStart,closeEnd,exitTrace,nativeEvents:await page.evaluate(()=>window.nativeDialogEvents)},null,2));
  const exiting=exitTrace.filter(x=>!x.open&&x.width>0);
  if(item.stage==='before')assert.equal(exiting.length,0,'Original close removes the rendered drawer immediately');
  else assert.ok(exiting.length>=2,'Repair retains actual intermediate exit frames');
  await page.waitForTimeout(500);await waitForClosed(page);
  assert.equal(await page.locator('#details').evaluate(d=>getComputedStyle(d).display),'none');
  assert.equal(await page.locator('[data-open-details]').first().evaluate(el=>document.activeElement===el),true,'Escape restores opener focus');
  // Keyboard-native open / interrupted close / reopen. No fixed-mode URL or source substitution.
  await page.keyboard.press('Enter');await page.waitForTimeout(100);await page.keyboard.press('Escape');await page.waitForTimeout(80);
  const reversalFrom=await page.locator('#details').evaluate(d=>({x:d.getBoundingClientRect().x,width:d.getBoundingClientRect().width}));
  await page.keyboard.press('Enter');
  const reversalEventFrom=await page.evaluate(()=>window.reopenBoundaries.at(-1));
  const immediateReopen=await page.locator('#details').evaluate(d=>({x:d.getBoundingClientRect().x,open:d.open}));
  const reversalObservations=item.stage==='after'?await observeReversal(page,reversalEventFrom.x):[];
  const reversalTo=await page.locator('#details').evaluate(d=>({x:d.getBoundingClientRect().x,width:d.getBoundingClientRect().width}));
  await page.waitForTimeout(450);assert.equal(await page.locator('#details').evaluate(d=>d.open),true);
  if(item.stage==='after'){assert.ok(reversalFrom.width>0);assert.ok(immediateReopen.x<=reversalEventFrom.x+2,'Reentry preserves the current pose');assert.ok(reversalObservations.at(-1).x<reversalEventFrom.x,'Reopening reverses the visible exit toward the open pose');assert.ok(reversalObservations.every(s=>s.x<=reversalEventFrom.x+2),'No outward reset during reversal')}
  await page.screenshot({path:path.join(output,`${item.stage}-reopened.png`)});
  await page.keyboard.press('Escape');await page.waitForTimeout(500);await waitForClosed(page);
  const repeated=[];
  if(item.stage==='after')for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const delay of [0,20,60,80]){
    await page.locator('.site-header [data-open-details]').click();await page.waitForTimeout(100);
    await page.keyboard.press('Escape');await page.waitForTimeout(delay);
    const from=await page.locator('#details').evaluate(d=>({x:d.getBoundingClientRect().x,width:d.getBoundingClientRect().width}));
    assert.equal(await page.locator('.site-header [data-open-details]').evaluate(el=>document.activeElement===el),true);
    await page.keyboard.press('Enter');
    const eventFrom=await page.evaluate(()=>window.reopenBoundaries.at(-1));
    const immediate=await page.locator('#details').evaluate(d=>({x:d.getBoundingClientRect().x,open:d.open}));
    assert.equal(immediate.open,true);
    assert.ok(immediate.x<=eventFrom.x+2,'Reentry must not reset farther offscreen');
    const observations=await observeReversal(page,eventFrom.x);
    assert.ok(observations.every(s=>s.x<=eventFrom.x+2),'No outward reset during observed frames');
    assert.ok(observations.at(-1).x<eventFrom.x,'A real frame progresses toward open');
    const to=await page.locator('#details').evaluate(d=>d.getBoundingClientRect().x);
    assert.ok(to<=eventFrom.x+2,'Reentry continues toward its open pose');
    repeated.push({width,delay,from,eventFrom,immediate,to,observations});
    await page.waitForTimeout(450);await page.keyboard.press('Escape');await page.waitForTimeout(450);await waitForClosed(page);
   }
  }
  await page.setViewportSize({width:390,height:844});await page.locator('[data-open-details]').first().click();await page.waitForTimeout(450);
  await page.screenshot({path:path.join(output,`${item.stage}-mobile-drawer.png`)});await page.keyboard.press('Escape');await page.waitForTimeout(450);await waitForClosed(page);
  await page.setViewportSize({width:1440,height:1000});
  const resumedA=await canvas.screenshot();await page.waitForTimeout(300);const resumedB=await canvas.screenshot();
  assert.notEqual(createHash('sha256').update(resumedA).digest('hex'),createHash('sha256').update(resumedB).digest('hex'),'The real 3D renderer resumes after the exit');
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
  const reducedA=await page.evaluate(()=>window.__aer.getState());await page.waitForTimeout(300);const reducedB=await page.evaluate(()=>window.__aer.getState());
  assert.equal(reducedA.angle,reducedB.angle,'Reduced motion freezes the rotor');
  await page.locator('[data-open-details]').first().click();assert.ok(await page.locator('#details').evaluate(d=>{const m=new DOMMatrix(getComputedStyle(d).transform);return Math.abs(m.m41)<.01}), 'Reduced-motion drawer opens at its final pose');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#details').evaluate(d=>getComputedStyle(d).display),'none','Reduced-motion close must be immediate');
  await page.screenshot({path:path.join(output,`${item.stage}-reduced.png`),fullPage:true});
  await page.evaluate(()=>{window.traceDrawer=false});const trace=await page.evaluate(()=>window.drawerTrace);
  await writeFile(path.join(output,`${item.stage}-drawer-trace.json`),JSON.stringify(trace,null,2));
  report.checks.push({stage:item.stage,source:item.source,sourceDigest:item.sourceDigest,distDigest:item.distDigest,video:`${item.stage}-browser.webm`,repeated,exitRenderedSamples:exiting.length,reversalFrom,reversalEventFrom,immediateReopen,reversalTo,reversalObservations,viewports:[1440,960,390,320],verified:['actual changing WebGL pixels','rapid power/speed retarget','orbit reversal/reset','Escape close/focus restoration','interrupted keyboard reopen','mobile drawer','reduced motion rotor/instant drawer']});
  const video=page.video();await context.close();
  await copyFile(await video.path(),path.join(output,`${item.stage}-browser.webm`));
 }
 await browser.close();browser=undefined;
 // The host has already applied the native-transition source repair above. Tools only collect and inspect evidence.
 client=new Client({name:'new-source-repair-case',version:'1.0.0'});
 await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(ROOT,'build/mcp/index.js')],cwd:ROOT,env:{PATH:process.env.PATH||'',CHROMIUM_PATH:process.env.CHROMIUM_PATH||'',PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH||'',MOTION_ARTIFACT_DIR:path.join(output,'motion'),MOTION_ALLOWED_ORIGINS:session.snapshots.map(x=>x.origin).join(','),MOTION_SOURCE_ROOTS:path.join(ROOT,CASE)},stderr:'pipe'}));
 const ids=[];
 for(const item of session.snapshots){
  const recipe={url:item.origin,selector:'#details',durationMs:2200,viewport:{width:1440,height:1000},reducedMotion:'no-preference',actions:[{action:'click',selector:'[data-open-details]:first-of-type'},{action:'wait',ms:500},{action:'key',key:'Escape'},{action:'wait',ms:90},{action:'key',key:'Enter'},{action:'wait',ms:500},{action:'key',key:'Escape'},{action:'wait',ms:400}],contract:{targetPresence:'may-disappear',maxReplacements:0,maxSampleGapMs:80,final:{visible:false}}};
  // Avoid the original app's two openers: select the uniquely identified header control.
  recipe.actions[0].selector='.site-header [data-open-details]';
  const capture=await client.callTool({name:'motion_capture',arguments:{recipe}},undefined,{timeout:45000});
  await writeFile(path.join(output,`${item.stage}-mcp-capture.json`),JSON.stringify(capture,null,2));
  if(capture.isError||!capture.structuredContent?.id){report.captures.push({stage:item.stage,status:'blocked',response:capture});continue}
  const id=capture.structuredContent.id;ids.push(id);
  const inspection=await client.callTool({name:'motion_inspect',arguments:{captureId:id,includeSamples:true,fromMs:450,toMs:1050}});
  await writeFile(path.join(output,`${item.stage}-mcp-inspection.json`),JSON.stringify(inspection,null,2));
  const frames=await client.callTool({name:'motion_frames',arguments:{captureId:id,timestampsMs:[500,600,700]}},undefined,{timeout:45000});
  let frameIndex=0;for(const block of frames.content??[])if(block.type==='image')await writeFile(path.join(output,`${item.stage}-recorded-${frameIndex++}.png`),Buffer.from(block.data,'base64'));
  report.captures.push({stage:item.stage,id,status:'captured',assertions:capture.structuredContent.assertions,metrics:capture.structuredContent.metrics,coverage:capture.structuredContent.coverage,frames:frames.structuredContent??{isError:frames.isError},note:'Cadence and final state are reported exactly. Exit continuity is a separate explicit browser observation, not a built-in universal semantic detector.'});
 }
 if(ids.length===2){const comparison=await client.callTool({name:'motion_compare',arguments:{beforeId:ids[0],afterId:ids[1]}});report.comparisons.push(comparison.structuredContent??comparison)}
 assert.deepEqual(report.errors,[]);report.status='passed';
} catch(error){report.status='failed';report.failure=String(error);process.exitCode=1;console.error(error)}
finally{await client?.close();await browser?.close();await session?.close();await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));const media={report:{sha256:createHash('sha256').update(await readFile(path.join(output,'report.json'))).digest('hex')}};for(const check of report.checks){try{const bytes=await readFile(path.join(output,`${check.stage}-browser.webm`));media[check.stage]={sourceDigest:check.sourceDigest,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};}catch{}}await writeFile(path.join(output,'media.json'),JSON.stringify(media,null,2));console.log(`Source repair report: ${output}/report.json (${report.status})`)}
