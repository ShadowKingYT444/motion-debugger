import assert from 'node:assert/strict';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {build} from 'esbuild';

// Original hand-authored app regression. No agent treatment, blind judgment or superiority arm.
const root=path.resolve('examples/assembly'),contract=JSON.parse(await readFile(path.join(root,'public-contract.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const output=path.resolve('artifacts/assembly'),runId=new Date().toISOString().replace(/[:.]/g,'-'),directory=path.join(output,runId);
await mkdir(directory,{recursive:true});
const sourceHashes={};
async function hashTree(folder,prefix=''){
  for(const item of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.join(prefix,item.name),absolute=path.join(folder,item.name);
    if(item.isDirectory())await hashTree(absolute,relative);
    else if(item.isFile())sourceHashes[relative]=sha(await readFile(absolute));
    else throw new Error('Demo source must not contain symbolic links');
  }
}
await hashTree(root);
let protectedManifest=null;
assert.ok(existsSync(path.join(root,contract.protectedDesign.manifest)),'Freeze a protected design manifest before browser verification');
if(existsSync(path.join(root,contract.protectedDesign.manifest))){
  protectedManifest=JSON.parse(await readFile(path.join(root,contract.protectedDesign.manifest),'utf8'));
  const hashes=protectedManifest.files??protectedManifest.protectedFiles;
  assert.ok(hashes&&typeof hashes==='object'&&!Array.isArray(hashes),'Protected manifest must provide files:{relativePath:sha256}');
  for(const [file,value] of Object.entries(hashes)){const expected=typeof value==='string'?value:value.sha256;assert.match(expected,/^[a-f0-9]{64}$/i);assert.equal(sourceHashes[file],expected,`Protected design source changed: ${file}`);}
}
const bundle=await build({entryPoints:['packages/core/browser-probe.ts'],platform:'browser',format:'iife',globalName:'AssemblyEvidence',write:false,bundle:true});
const probeSource=bundle.outputFiles[0].text;
let origin=process.env.MOTION_ASSEMBLY_ORIGIN,server;
if(origin){const parsed=new URL(origin);assert.ok(['localhost','127.0.0.1','[::1]'].includes(parsed.hostname));assert.ok(!parsed.username&&!parsed.password);}
else{
  server=createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),relative=pathname==='/'||pathname==='/assembly/'?'index.html':pathname.replace(/^\/assembly\//,'').replace(/^\//,'');
      const file=path.resolve(root,relative);
      if(!file.startsWith(root+path.sep)||!(await stat(file)).isFile()){res.writeHead(404).end('Not found');return;}
      res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':'application/octet-stream');
      res.end(await readFile(file));
    }catch{res.writeHead(404).end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
}
const allowedOrigin=new URL(origin).origin;
const executablePath=process.env.CHROMIUM_PATH??(existsSync(chromium.executablePath())?undefined:['/usr/bin/chromium','/usr/bin/google-chrome'].find(existsSync));
const baselineArgs=['--no-sandbox','--disable-dev-shm-usage'];
const results=[],provenance={gitCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),node:process.version,sourceHashes,protectedManifest,publicContractSha256:sourceHashes['public-contract.json'],probeSha256:sha(probeSource)};
const scenarios=[{name:'desktop',viewport:contract.viewports.desktop},{name:'mobile',viewport:contract.viewports.mobile},{name:'reduced',viewport:contract.viewports.desktop,reducedMotion:'reduce'},{name:'fallback',viewport:contract.viewports.desktop,fallback:true},{name:'forced-webgl-failure',viewport:contract.viewports.mobile,forcedFallback:true}];
let browser,failure;
const accept=contract.acceptance;
const read=page=>page.evaluate(()=>window.__assemblyDebug);
const requiredControls=['#open','[data-lens="wide"]','[data-lens="standard"]','[data-lens="tele"]','#inspect','#scrubber','#pause','#replay','#export'];
async function assertControls(page){for(const selector of requiredControls){const control=page.locator(selector);assert.equal(await control.count(),1,selector);assert.equal(await control.isEnabled(),true,`${selector} must remain enabled`);assert.equal(await control.evaluate(node=>node.tabIndex>=0),true,`${selector} must be keyboard reachable`);}}
async function awaitPose(page,view,target=1){
  await page.waitForFunction(({view,target,tolerance})=>{const state=window.__assemblyDebug;return state?.view===view&&Math.abs(state.progress-target)<=tolerance&&!state.playing},{view,target,tolerance:accept.settledProgressTolerance},{timeout:accept.maxSettlingMs+500,polling:25});
}
async function beginWindow(page){await page.evaluate(()=>{window.__motionProbe.stop();window.__assemblyWindowClock={pagePerformanceNowMs:performance.now(),pageTimeOriginMs:performance.timeOrigin};window.__motionProbe.start()});}
async function finishWindow(page,name,folder){
  const data=await page.evaluate(()=>{window.__motionProbe.stop();const trace=window.__motionProbe;return {events:trace.events,actorSamples:trace.actorSamples,samples:trace.samples,performanceDiagnostics:trace.performanceDiagnostics,windowClock:window.__assemblyWindowClock}});
  const file=path.join(folder,`${name}-trace.json`);await writeFile(file,JSON.stringify(data,null,2));
  const selected=(await read(page)).selected;
  const scene=data.actorSamples.filter(sample=>sample.kind==='scene'),byActor=new Map();
  for(const sample of scene){if(!byActor.has(sample.actorId))byActor.set(sample.actorId,[]);byActor.get(sample.actorId).push(sample);}
  const actorMetrics=[];
  for(const [actorId,samples] of byActor){let maxGapMs=0,maxStepAt60HzPx=0,travelPx=0;const steps=[];
    for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dt=b.observedAtMs-a.observedAtMs;maxGapMs=Math.max(maxGapMs,dt);if(data.events.some(event=>event.origin==='browser-observed'&&event.type==='resize'&&event.t>=a.t-80&&event.t<=b.t+80))continue;if(!a.visible||!b.visible||!a.screen||!b.screen||dt<=0||dt>80)continue;const px=Math.hypot(b.screen.x-a.screen.x,b.screen.y-a.screen.y);travelPx+=px;maxStepAt60HzPx=Math.max(maxStepAt60HzPx,px/dt*(1000/60));steps.push({fromMs:a.t,toMs:b.t,stepPx:px,dt});}
    actorMetrics.push({actorId,sampleCount:samples.length,visibleSamples:samples.filter(sample=>sample.visible).length,maxGapMs,maxStepAt60HzPx,travelPx,annotationStatus:maxGapMs>80||samples.length<20?'insufficient':'observed',pixelStatus:'unverified',steps});
  }
  const inputs=data.events.filter(event=>event.origin==='browser-observed'&&event.detail.trusted===true),responses=[];
  for(const input of inputs.filter(event=>event.type==='click'&&['#open','#inspect'].includes(event.detail.selector))){
    const changes=[];for(const [actorId,samples] of byActor){const before=samples.filter(sample=>sample.observedAtMs<=input.t).at(-1),after=before?samples.find(sample=>sample.observedAtMs>input.t&&sample.screen&&before.screen&&(Math.hypot(sample.screen.x-before.screen.x,sample.screen.y-before.screen.y)>.1||sample.visible!==before.visible)):null;if(after)changes.push({actorId,...after});}
    const after=changes.sort((a,b)=>a.observedAtMs-b.observedAtMs)[0];
    responses.push({eventId:input.id,selector:input.detail.selector,inputAtMs:input.t,firstChangedActor:after?.actorId??null,firstChangedAnnotationAtMs:after?.observedAtMs??null,annotationResponseMs:after?after.observedAtMs-input.t:null,method:'Trusted browser event to changed app-reported post-render geometry',pixelResponse:'unverified'});
  }
  return {name,selected,windowClock:data.windowClock,recordingAlignment:{uncertaintyMs:null,method:'Window page-monotonic origin retained; native video alignment is uncalibrated. Window-relative event time is not a decoded media timestamp.'},path:file,sha256:sha(await readFile(file)),actualInputs:inputs,actorMetrics,responses,performanceDiagnostics:data.performanceDiagnostics,interpretation:'Post-render scene annotations and browser input clocks. Independent painted actor continuity, response latency and human trackability remain unverified.'};
}
function assertAnnotatedIntent(window,scenario){
  const checks=[];
  if(scenario.reducedMotion==='reduce'){return {status:'not-applicable',reason:'Reduced motion uses explicit endpoint cuts; ordinary retarget continuity and travel are excluded.',checks};}
  if(window.name==='direct-scrub-and-cancellation'||window.name==='inspector-and-replay'){return {status:'not-applicable',reason:'Explicit direct scrubbing and authorized replay resets are excluded from retarget continuity.',checks};}
  const lens=window.actorMetrics.find(actor=>actor.actorId==='lens-'+window.selected);
  if(!lens||lens.visibleSamples<accept.minimumVisibleActorSamples||lens.maxGapMs>accept.maxProjectedProbeGapMs||window.performanceDiagnostics.actorObservation?.truncated){return {status:'unverified',reason:'Actor count, sampling gap or retained budget is insufficient under the unchanged 80ms gate.',checks};}
  assert.ok(lens.maxStepAt60HzPx<=accept.maxStepAt60HzPx,`App-reported lens geometry exceeds the published retarget budget: ${lens.maxStepAt60HzPx}`);checks.push('App-reported lens position stays within explicit CSS-pixel interval-average displacement budget');
  if(window.name==='rapid-selection-reversal'){assert.ok(lens.travelPx>=accept.requiredLensTravelCssPx,`Lens annotated travel ${lens.travelPx}px is insufficient`);checks.push('App-reported lens executes at least the required nonstatic travel');}
  const responses=window.responses.filter(response=>response.annotationResponseMs!==null);
  for(const response of responses)assert.ok(response.annotationResponseMs<=accept.maxInputToObservedChangeMs,`Annotated response exceeds published bound: ${JSON.stringify(response)}`);
  if(responses.length)checks.push('Measured input-to-changed-annotation intervals stay within the published response bound');
  return {status:'observed',checks,pixelStatus:'unverified',reason:'Passing app-reported intent assertions does not certify independent rendered continuity or physical presentation latency.'};
}
try{
  for(const scenario of scenarios){
    if(!browser||scenario.forcedFallback){if(browser)await browser.close();browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:[...baselineArgs,...(scenario.forcedFallback?['--disable-webgl','--disable-webgl2','--disable-gpu']:[])]});provenance.browser=browser.version();}
    const folder=path.join(directory,scenario.name);await mkdir(folder,{recursive:true});
    const context=await browser.newContext({viewport:scenario.viewport,reducedMotion:scenario.reducedMotion??'no-preference',hasTouch:true,acceptDownloads:true,serviceWorkers:'block',recordVideo:{dir:folder,size:scenario.viewport}});
    const blocked=[],errors=[];await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===allowedOrigin||['data:','blob:'].includes(url.protocol))return route.continue();blocked.push(url.origin+url.pathname);return route.abort();});
    await context.addInitScript({content:`${probeSource}\nAssemblyEvidence.installBrowserProbe({selector:'#stage',actors:[{id:'body',kind:'scene'},{id:'ring',kind:'scene'},{id:'sensor',kind:'scene'},{id:'lens-wide',kind:'scene'},{id:'lens-standard',kind:'scene'},{id:'lens-tele',kind:'scene'},{id:'label',kind:'dom',selector:'#actor-label'}]});`});
    const page=await context.newPage(),video=page.video(),checks=[],windows=[],screenshots=[];let result={...scenario,status:'failed',checks},scenarioFailure;
    page.on('pageerror',error=>errors.push(error.message));
    async function screenshot(name,stage=false){const file=path.join(folder,`${name}.png`);await(stage?page.locator('#stage'):page).screenshot({path:file,...(!stage?{fullPage:true}:{})});const entry={name,path:file,sha256:sha(await readFile(file)),kind:stage?'native-stage-pixels':'native-whole-page-pixels'};screenshots.push(entry);return entry;}
    try{
      await page.goto(`${origin.replace(/\/$/,'')}/${scenario.fallback?'?fallback=1':''}`,{waitUntil:'networkidle'});
      await page.waitForFunction(()=>window.__assemblyDebug?.parts?.length>=4,null,{timeout:15000,polling:25});
      const initial=await read(page);assert.equal(initial.selected,'standard');assert.equal(initial.view,'assembled');assert.ok(Math.abs(initial.progress)<accept.settledProgressTolerance);
      assert.ok(initial.parts.every(part=>part.position.length===3&&part.position.every(Number.isFinite)));await assertControls(page);
      if(scenario.fallback||scenario.forcedFallback){assert.equal(initial.renderer,'svg-fallback');assert.equal(await page.locator('#fallback').isVisible(),true);assert.ok(await page.locator('#stage svg').count());}
      else assert.notEqual(initial.renderer,'svg-fallback','Normal fixture must exercise real WebGL');
      await screenshot('assembled');const assembledPixels=await screenshot('assembled-stage',true);checks.push('Original assembled endpoint has real pixels, enabled controls, stable selected state and finite actor coordinates');
      await beginWindow(page);await page.click('#open');await page.waitForTimeout(scenario.reducedMotion?30:90);await assertControls(page);
      await page.click('[data-lens="wide"]');await page.waitForTimeout(55);await page.click('[data-lens="standard"]');await page.waitForTimeout(45);await page.click('[data-lens="tele"]');
      assert.equal((await read(page)).selected,'tele');assert.equal(await page.locator('#selection').getAttribute('data-selected'),'tele');assert.ok((await page.locator('#lens-label').textContent()).includes('85'));
      await page.click('#open');await page.waitForTimeout(scenario.reducedMotion?20:110);await page.click('#open');
      await awaitPose(page,'exploded');const exploded=await read(page);assert.equal(exploded.selected,'tele');assert.equal(exploded.targetProgress,1);await assertControls(page);
      await screenshot('exploded');const explodedPixels=await screenshot('exploded-stage',true);assert.notEqual(assembledPixels.sha256,explodedPixels.sha256,'Native endpoint pixels must visibly change');
      windows.push(await finishWindow(page,'rapid-selection-reversal',folder));checks.push('Actual open/reverse/open and wide→standard→tele inputs preserve the latest selected state and reach the exploded endpoint; native endpoint pixels differ');
      const slider=page.locator('#scrubber');await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();assert.ok(box);const sliderX=value=>box.x+9+value*(box.width-18),sliderY=box.y+box.height/2;
      await beginWindow(page);await page.mouse.move(sliderX(.2),sliderY);await page.mouse.down();
      for(const value of [.3,.45,.65,.82,.72,.55,.34]){await page.mouse.move(sliderX(value),sliderY);await page.waitForTimeout(20);const expected=await slider.evaluate(node=>(Number(node.value)-Number(node.min||0))/(Number(node.max||100)-Number(node.min||0)));const state=await read(page);assert.ok(Math.abs(state.progress-expected)<=accept.scrubProgressTolerance,JSON.stringify({value,expected,state}));assert.equal(state.paused,true);}
      await screenshot('held-scrub-reversal');await page.mouse.up();const released=await read(page);assert.equal(released.paused,true);assert.equal(released.playing,false);
      await page.waitForTimeout(150);assert.ok(Math.abs((await read(page)).progress-released.progress)<=accept.pauseProgressTolerance);
      const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sliderX(.6),y:sliderY}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sliderX(.4),y:sliderY}]});await page.waitForTimeout(35);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();
      const cancelled=await read(page);assert.equal(cancelled.paused,true);assert.equal(cancelled.playing,false);await page.waitForTimeout(150);assert.ok(Math.abs((await read(page)).progress-cancelled.progress)<=accept.pauseProgressTolerance);
      await slider.focus();await page.keyboard.press('ArrowLeft');const keyed=await read(page);assert.ok(keyed.progress<cancelled.progress);assert.equal(keyed.paused,true);checks.push('Native held mouse scrub reverses directly; release, actual CDP touch cancellation and native range keyboard seek hold a paused pose');
      windows.push(await finishWindow(page,'direct-scrub-and-cancellation',folder));
      await page.click('#pause');await awaitPose(page,'exploded');await beginWindow(page);await page.click('#open');await page.waitForTimeout(scenario.reducedMotion?20:110);await page.click('#pause');const paused=await read(page);assert.equal(paused.paused,true);
      await page.waitForTimeout(200);const held=await read(page);assert.ok(Math.abs(paused.progress-held.progress)<=accept.pauseProgressTolerance);
      for(const part of paused.parts){const counterpart=held.parts.find(item=>item.id===part.id);assert.ok(counterpart);assert.ok(part.position.every((value,index)=>Math.abs(value-counterpart.position[index])<=accept.pauseWorldPositionTolerance),`${part.id} moves while paused`);}
      await screenshot('paused');await page.click('#pause');await awaitPose(page,'assembled',0);checks.push('Pause stops observed actor positions and progress; resume reassembles without discarding the selected lens');
      await page.click('#open');await page.waitForTimeout(scenario.reducedMotion?20:85);await page.setViewportSize(scenario.name==='mobile'?contract.viewports.desktop:contract.viewports.mobile);await awaitPose(page,'exploded');await page.setViewportSize(scenario.viewport);await page.waitForTimeout(60);
      assert.equal((await read(page)).selected,'tele');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push('Actual resize during motion preserves the latest selection and reaches the endpoint without horizontal overflow');
      windows.push(await finishWindow(page,'pause-resume-and-resize',folder));
      await beginWindow(page);await page.click('#inspect');await awaitPose(page,'inspector');await screenshot('inspector');await page.click('#replay');await awaitPose(page,'exploded');assert.equal((await read(page)).selected,'tele');checks.push('Inspector and explicit replay complete with the selected configuration intact');windows.push(await finishWindow(page,'inspector-and-replay',folder));
      await page.locator('[data-lens="wide"]').focus();await page.keyboard.press('Enter');assert.equal((await read(page)).selected,'wide');await page.waitForTimeout(accept.maxSettlingMs);await page.locator('#inspect').focus();await page.keyboard.press('Space');await awaitPose(page,'inspector');
      const downloadPromise=page.waitForEvent('download');await page.locator('#export').focus();await page.keyboard.press('Enter');const download=await downloadPromise,exportPath=path.join(folder,'selected-config.json');await download.saveAs(exportPath);const saved=JSON.parse(await readFile(exportPath,'utf8'));
      assert.equal(saved.product,accept.export.product);assert.equal(saved.format,accept.export.format);assert.equal(saved.selected,'wide');assert.equal(saved.view,'inspector');assert.equal(typeof saved.lens.focalLengthMm,'number');checks.push('Native keyboard activation exports a downloaded JSON configuration with the actual current selected lens and view');
      await page.click('#open');await page.waitForTimeout(50);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__assemblyDebug.reducedMotion===true,null,{timeout:accept.reducedMotionSettleMs+100});await awaitPose(page,'assembled',0);await page.click('#open');await awaitPose(page,'exploded');checks.push('Reduced motion from load or an actual media preference change preserves useful final views');
      for(const window of windows)window.intentChecks=assertAnnotatedIntent(window,scenario);
      await screenshot('final');await assertControls(page);assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
      result={...scenario,status:'passed',scope:'Functional and app-reported intent checks, independent native endpoint screenshots and a complete native recording. Painted actor continuity, actual presentation latency, physical mobile performance, human trackability and aesthetic superiority remain unverified.',checks,initial,exploded,released,cancelled,paused,saved,windows,screenshots,errors,blocked};
    }catch(error){scenarioFailure=error;result={...result,error:error.stack,windows,screenshots,errors,blocked};await screenshot('failure').catch(()=>{});}
    finally{await context.close();if(video){const recording=path.join(folder,'visitor-native.webm');await video.saveAs(recording);result.recording={path:recording,sha256:sha(await readFile(recording)),speed:1,clock:'Native browser and real user input; encoded cadence is not physical display FPS'};}results.push(result);}
    if(scenarioFailure)throw scenarioFailure;
  }
  const after={...sourceHashes};for(const file of Object.keys(after))after[file]=sha(await readFile(path.join(root,file)));assert.deepEqual(after,sourceHashes,'Protected and app source changed during verification');
}catch(error){failure=error;}
finally{
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
  const report={status:failure?'failed':'passed',runId,scope:'Original hand-authored ASSEMBLY engineering demo. No ordinary-agent/treatment arm or superiority claim. Campaign protocol remains non-runnable.',origin,provenance,results,error:failure?.stack,limitations:['Desktop/mobile are viewport emulations on the recorded host, not physical mobile performance evidence.','Scene snapshots are app reported and cannot independently pass rendered continuity.','Screenshots and native recordings require temporal visual review; image differences do not establish human trackability or aesthetic preference.','Published numerical values are development acceptance bounds pending independent native calibration and benchmark freeze.']};
  await writeFile(path.join(directory,'browser-verification.json'),JSON.stringify(report,null,2));await writeFile(path.join(output,'browser-verification.json'),JSON.stringify(report,null,2));
}
if(failure)throw failure;
console.log(JSON.stringify({status:'passed',report:path.join(output,'browser-verification.json'),scenarios:results.map(result=>({name:result.name,checks:result.checks,recording:result.recording}))},null,2));
