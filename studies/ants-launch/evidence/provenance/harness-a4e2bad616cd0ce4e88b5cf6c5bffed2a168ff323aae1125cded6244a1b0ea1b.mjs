import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {launchViewer} from '../../scripts/demo-ants.mjs';

// Held-out expectations registered before candidate source/UI inspection. Selectors may map
// the frozen UI, but expectations are shared and cannot be relaxed for either study arm.
export const EXPECTATIONS=Object.freeze({
  task:'Launch reaches all four advertised work stages and provides a useful repair-cafe plan, rather than only a finished animation.',
  pause:'Pause freezes displayed task elapsed time and rendered scene pixels; resume continues both.',
  cancelReplay:'Cancel ends active work with truthful state; replay restarts work and reaches the same useful result.',
  drawer:'Pointer and keyboard opening work; focus stays inside the open drawer; Escape closes and restores opener focus.',
  controls:'Every advertised control, including view changes and downloads, performs its advertised action using unforced input.',
  responsive:'Same functional expectations at desktop1440x960 and mobile390x844 without horizontal overflow or inaccessible controls.',
  reduced:'Reduced-motion completes task and controls without requiring decorative animation.',
  fallback:'Rendering fallback preserves usable task, controls, and output.',
  evidence:'Normal viewport video includes navigation/entrance, work, interruptions, and useful final result; hashes tie source, runtime, and video together.'
});
const exec=promisify(execFile),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=path.resolve(process.env.ANTS_HELDOUT_ROOT??'artifacts/ants-launch/heldout');
const summary={createdAt:new Date().toISOString(),expectations:EXPECTATIONS,expectationsSha256:sha(JSON.stringify(EXPECTATIONS)),status:'not-run',runs:[],limitations:['These are held-out browser acceptance checks of paired coding-agent builds, not a general blind model benchmark.','DOM stage sampling and task state do not establish perceptual smoothness.','Temporal scene pixel checks use decoded native video; encoder noise and polling cadence require explicit interpretation.','Screenshots are collected separately from recordings because screenshot viewport overrides can perturb native CDP screencast cropping.']};
await mkdir(root,{recursive:true});
const registeredFile=path.join(root,'expectations.json');
try{const registered=JSON.parse(await readFile(registeredFile,'utf8'));assert.equal(registered.sha256,summary.expectationsSha256);summary.expectationsRegisteredAt=registered.registeredAt;}catch(error){if(error.code!=='ENOENT')throw error;summary.expectationsRegisteredAt=summary.createdAt;await writeFile(registeredFile,JSON.stringify({registeredAt:summary.createdAt,expectations:EXPECTATIONS,sha256:summary.expectationsSha256},null,2));}
async function maximize(page){const cdp=await page.context().newCDPSession(page);try{const w=await cdp.send('Browser.getWindowForTarget');await cdp.send('Browser.setWindowBounds',{windowId:w.windowId,bounds:{windowState:'maximized'}});}finally{await cdp.detach();}}
async function decodeRgb(file,time,width,height){return (await exec('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(time),'-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{encoding:'buffer',maxBuffer:width*height*3+10000})).stdout;}
async function calibrate(browser,mode='headless'){
  const directory=path.join(root,`calibration-${mode}`);await mkdir(directory,{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:directory,size:mode==='headless'?{width:1440,height:960}:{width:1920,height:1080}}});
  const page=await context.newPage();if(mode==='headed')await maximize(page);
  await page.setContent('<style>html,body{margin:0;background:#606060;width:100%;height:100%}.corner{position:fixed;width:40px;height:40px}</style><div class="corner" style="left:0;top:0;background:#f00"></div><div class="corner" style="right:0;top:0;background:#0f0"></div><div class="corner" style="left:0;bottom:0;background:#00f"></div><div class="corner" style="right:0;bottom:0;background:#ff0"></div>');
  await page.waitForTimeout(1000);const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})),video=page.video();await context.close();
  const file=await video.path(),metadata=JSON.parse((await exec('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file])).stdout);
  const stream=metadata.streams.find(s=>s.codec_type==='video'),pixels=await decodeRgb(file,.6,stream.width,stream.height);
  const coordinates=[[20,20,[255,0,0]],[1420,20,[0,255,0]],[20,940,[0,0,255]],[1420,940,[255,255,0]]];
  const corners=coordinates.map(([x,y,expected])=>{const offset=(y*stream.width+x)*3,actual=[...pixels.subarray(offset,offset+3)];return {x,y,expected,actual,passed:actual.every((value,i)=>Math.abs(value-expected[i])<=20)};});
  await exec('ffmpeg',['-hide_banner','-loglevel','error','-ss','0.6','-i',file,'-frames:v','1','-y',path.join(directory,'frame.png')]);
  const result={fixture:'Handwritten native recorder calibration, no candidate app involvement',mode,viewport,width:stream.width,height:stream.height,video:file,videoSha256:sha(await readFile(file)),corners,passed:corners.every(c=>c.passed)};
  await writeFile(path.join(directory,'calibration.json'),JSON.stringify(result,null,2));assert.ok(result.passed,JSON.stringify(result));return result;
}
if(process.env.ANTS_CALIBRATE_ONLY==='1'){
  const mode=process.env.ANTS_CALIBRATE_MODE??'headless';
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:mode==='headless',args:['--no-sandbox','--disable-dev-shm-usage']});
  try{console.log(JSON.stringify(await calibrate(browser,mode)));}finally{await browser.close();}
}
async function fileRecord(file){const bytes=await readFile(file);return {file,bytes:bytes.length,sha256:sha(bytes)};}
async function sourceFiles(directory,prefix=''){
  const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const relative=path.join(prefix,entry.name),file=path.join(directory,entry.name);if(entry.isDirectory())files.push(...await sourceFiles(file,relative));else if(entry.isFile())files.push({relative,...await fileRecord(file)});else throw Error(`Unexpected non-regular frozen source: ${file}`);}return files.sort((a,b)=>a.relative.localeCompare(b.relative));
}
async function measureVideo(file){const data=JSON.parse((await exec('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file])).stdout),stream=data.streams.find(item=>item.codec_type==='video');return {width:stream.width,height:stream.height,durationSeconds:Number(data.format.duration),frameRate:stream.avg_frame_rate,codec:stream.codec_name};}
async function viewportFrame(file,seconds,output){await exec('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(seconds),'-i',file,'-frames:v','1','-y',output]);return fileRecord(output);}
function pixelDelta(a,b){assert.equal(a.length,b.length);let sum=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;if(d>12)changed++;}return {meanAbsChannelDelta:sum/a.length,channelsOver12:changed/a.length};}
async function scenePixels(file,seconds,rect){return (await exec('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(seconds),'-i',file,'-vf',`crop=${rect.width}:${rect.height}:${rect.x}:${rect.y}`,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{encoding:'buffer',maxBuffer:rect.width*rect.height*3+10000})).stdout;}
async function runtime(page,browser){const cdp=await browser.newBrowserCDPSession();try{const gpu=await cdp.send('SystemInfo.getInfo');return {browser:browser.version(),mode:'headless',executable:'/usr/bin/google-chrome',flags:['--no-sandbox','--disable-dev-shm-usage'],gpu:gpu.gpu,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}))};}finally{await cdp.detach();}}
async function recordCheck(run,id,fn){try{const detail=await fn();run.checks.push({id,passed:true,detail});return detail;}catch(error){run.checks.push({id,passed:false,error:error.message.split('\n').slice(0,5).join('\n')});return undefined;}}
if(process.env.ANTS_DISCOVER==='1'){
 const viewer=await launchViewer(process.cwd(),0),browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const arm of viewer.arms){const page=await browser.newPage({viewport:{width:1440,height:960}});await page.goto(arm.origin);await page.waitForTimeout(1500);await page.screenshot({path:path.join(root,`${arm.id}-discovery.png`)});console.log(JSON.stringify({arm:arm.id,origin:arm.origin,state:await page.evaluate(()=>({state:window.antsState??window.antsDebug?.state,buttons:[...document.querySelectorAll('button,a[href]')].map(e=>({id:e.id,text:e.textContent.trim(),hidden:e.hidden,rect:e.getBoundingClientRect().toJSON()})),canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),fallback:!document.querySelector('#fallback').hidden}))}));await page.close();}}
 finally{await browser.close();await viewer.close();}
}
const MAP={ordinary:{task:'#run',pause:'#run',about:'[data-open="about"]',stages:'.stages li',scene:'.visual'},motion:{task:'#launch',pause:'#pause',about:'#details',stages:'.steps li',scene:'.scene-shell'}};
async function stateOf(page,arm){return page.evaluate(id=>{const debug=id==='ordinary'?window.antsState:window.antsDebug?.state;const mode=id==='ordinary'?document.body.dataset.mode:document.body.dataset.taskState;return {mode,elapsed:debug?.elapsed,stage:debug?.stage,paused:id==='ordinary'?mode==='paused':document.querySelector('#pause')?.getAttribute('aria-pressed')==='true',status:document.querySelector('#status')?.textContent,displayedTime:document.querySelector('#time')?.textContent??null};},arm);}
async function waitMode(page,arm,mode,timeout=60000){await page.waitForFunction(({arm,mode})=>(arm==='ordinary'?document.body.dataset.mode:document.body.dataset.taskState)===mode,{arm,mode},{timeout});}
async function setupTrace(page,arm){await page.evaluate(id=>{const start=performance.now(),samples=[],input=[];const sample=()=>{const mode=id==='ordinary'?document.body.dataset.mode:document.body.dataset.taskState;const stages=[...document.querySelectorAll(id==='ordinary'?'.stages li':'.steps li')];const active=stages.findIndex(e=>id==='ordinary'?e.classList.contains('active'):e.dataset.state==='active');const done=stages.map(e=>id==='ordinary'?e.classList.contains('done'):e.dataset.state==='complete');samples.push({t:performance.now()-start,mode,active,done,status:document.querySelector('#status')?.textContent,scrollY});};const timer=setInterval(sample,50);for(const type of ['click','keydown'])document.addEventListener(type,e=>input.push({t:performance.now()-start,type,key:e.key,id:e.target.id,text:e.target.textContent?.trim().slice(0,120)}),true);window.__antsHeldout={samples,input,snapshot:sample,stop(){clearInterval(timer);sample();return {samples,input}}};sample();},arm);}
async function assertStages(page,arm,from){const trace=await page.evaluate(()=>{window.__antsHeldout.snapshot();return window.__antsHeldout.samples}),during=trace.slice(from).filter(s=>s.mode==='running'||s.mode==='paused'),seen=[...new Set(during.map(s=>s.active).filter(i=>i>=0))];assert.deepEqual(seen,[0,1,2,3]);const last=trace.at(-1);assert.ok(last.done.every(Boolean),'All four visible stages report completion');return {seen,last};}
async function tabTo(page,selector,max=60){for(let i=0;i<max;i++){await page.keyboard.press('Tab');if(await page.locator(selector).evaluate(e=>document.activeElement===e))return i+1;}throw Error(`Keyboard could not reach ${selector} in ${max} Tab presses`);}
async function drawerJourney(page,arm,opener,{keyboard=false,close='Escape'}={}){
 if(keyboard){await tabTo(page,opener);await page.keyboard.press('Enter');}else await page.locator(opener).click({timeout:4000});
 await page.waitForFunction(()=>document.querySelector('#drawer').open);await page.waitForTimeout(500);
 const title=await page.locator('#drawer').innerText();assert.ok(title.length>30);
 for(let i=0;i<5;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert.ok(await page.evaluate(()=>document.querySelector('#drawer').contains(document.activeElement)),'Drawer traps keyboard focus');}
 if(close==='Escape')await page.keyboard.press('Escape');else await page.locator('#close-drawer').click({timeout:4000});
 await page.waitForFunction(()=>!document.querySelector('#drawer').open,{},{timeout:5000});
 assert.ok(await page.locator(opener).evaluate(e=>document.activeElement===e),'Drawer restores opener focus');return {title:title.slice(0,250),keyboard,close};
}
async function planJourney(page,arm,run){
 await page.locator('#read-plan').click({timeout:4000});await page.waitForFunction(()=>document.querySelector('#drawer').open);await page.waitForTimeout(500);
 const text=await page.locator('#drawer').innerText();
 for(const pattern of [/repair caf[eé]/i,/20|twenty/i,/volunteer/i,/room|venue/i,/tool|suppl/i,/\d{1,2}:\d{2}/,/qualified|electrical|safety/i])assert.match(text,pattern);
 if(arm==='motion')await recordCheck(run,'drawer-download',async()=>{const [download]=await Promise.all([page.waitForEvent('download',{timeout:5000}),page.locator('#plan-content a[download]').click({timeout:4000})]);const file=path.join(run.directory,'drawer-plan.txt');await download.saveAs(file);const bytes=await readFile(file,'utf8');assert.match(bytes,/repair caf[eé]/i);assert.match(bytes,/volunteer/i);return {...await fileRecord(file),suggestedFilename:download.suggestedFilename()};});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#drawer').open,{},{timeout:5000});assert.ok(await page.locator('#read-plan').evaluate(e=>document.activeElement===e));return {text};
}
async function sceneRect(page){const selector=await page.locator('#colony').isVisible()?'#colony':'#fallback';return page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();const x=Math.max(0,Math.ceil(r.x)),y=Math.max(0,Math.ceil(r.y)),width=Math.floor(Math.min(innerWidth,r.right)-x),height=Math.floor(Math.min(innerHeight,r.bottom)-y);return {x,y,width,height};});}
async function taskJourney(page,arm,run,mark,{full=true,keyboard=false}={}){
 const m=MAP[arm];await page.locator(m.task).scrollIntoViewIfNeeded();await page.waitForTimeout(700);
 const from=await page.evaluate(()=>window.__antsHeldout.samples.length);
 if(keyboard){await tabTo(page,m.task);await page.keyboard.press('Enter');}else await page.locator(m.task).click({timeout:4000});
 await waitMode(page,arm,'running',4000);mark('task-launched');await page.waitForTimeout(1400);
 if(full){
  await recordCheck(run,'pause-freezes-task-clock',async()=>{
   await page.locator(m.pause).click({timeout:4000});mark('paused');await page.waitForTimeout(300);const first=await stateOf(page,arm);assert.equal(first.paused,true);const rect=await sceneRect(page);const start=mark('pause-pixels-start');await page.waitForTimeout(1600);const end=mark('pause-pixels-end'),second=await stateOf(page,arm);assert.equal(second.paused,true);assert.equal(second.elapsed,first.elapsed);assert.equal(second.displayedTime,first.displayedTime);run.pauseWindow={start,end,rect};return {first,second};
  });
  await recordCheck(run,'resume-continues-task-clock',async()=>{const before=await stateOf(page,arm);await page.locator(m.pause).click({timeout:4000});mark('resumed');await page.waitForTimeout(700);const after=await stateOf(page,arm);assert.equal(after.paused,false);assert.ok(after.elapsed>before.elapsed);return {before,after};});
 }
 await recordCheck(run,'four-stages-and-useful-plan',async()=>{await waitMode(page,arm,'complete');mark('task-complete');const stages=await assertStages(page,arm,from),plan=await planJourney(page,arm,run);mark('plan-read');run.planText=plan.text;return {...stages,plan};});
 if(arm==='motion')await recordCheck(run,'result-download',async()=>{const [download]=await Promise.all([page.waitForEvent('download',{timeout:5000}),page.locator('#result a[download]').click({timeout:4000})]);const file=path.join(run.directory,'result-plan.txt');await download.saveAs(file);assert.match(await readFile(file,'utf8'),/repair caf[eé]/i);return {...await fileRecord(file),suggestedFilename:download.suggestedFilename()};});
 if(full){
  await recordCheck(run,'replay-and-cancel',async()=>{assert.match(await page.locator(m.task).innerText(),/Replay/i);await page.locator(m.task).click({timeout:4000});await waitMode(page,arm,'running',4000);mark('replayed');await page.waitForTimeout(700);const replay=await stateOf(page,arm);assert.ok(replay.elapsed<5);await page.locator('#cancel').click({timeout:4000});await waitMode(page,arm,'cancelled',4000);mark('cancelled');const cancelled=await stateOf(page,arm);assert.equal(cancelled.elapsed,0);assert.match(cancelled.status,/cancel/i);assert.equal(await page.locator('#read-plan').isVisible(),false);return {replay,cancelled};});
  const restart=await page.evaluate(()=>window.__antsHeldout.samples.length);
  await recordCheck(run,'restart-after-cancel-completes-again',async()=>{await page.locator(m.task).click({timeout:4000});mark('restarted');await waitMode(page,arm,'complete');mark('restart-complete');await assertStages(page,arm,restart);return await planJourney(page,arm,run);});
 }
}
async function advertisedControls(page,arm,run,mark){
 const m=MAP[arm];
 if(arm==='ordinary'){
  for(let i=0;i<4;i++)await recordCheck(run,`stage-details-${i+1}`,async()=>{const opener=`button[data-stage="${i}"]`;await page.locator(opener).click({timeout:4000});await page.waitForFunction(()=>document.querySelector('#drawer').open);const text=await page.locator('#drawer').innerText();assert.match(text,new RegExp(`STAGE ${i+1} / 4`));if(i===3){await page.locator('#drawer-plan').click({timeout:4000});assert.match(await page.locator('#drawer').innerText(),/repair caf[eé]/i);}await page.locator('#close-drawer').click({timeout:4000});await page.waitForFunction(()=>!document.querySelector('#drawer').open);return {text:text.slice(0,180)};});
  await recordCheck(run,'return-to-colony',async()=>{await page.locator('#again').click({timeout:4000});await page.waitForFunction(()=>scrollY<5,{},{timeout:5000});assert.equal(await page.locator('#launch').evaluate(e=>document.activeElement===e),true);return {scrollY:await page.evaluate(()=>scrollY)};});
  await recordCheck(run,'explore-idea-link',async()=>{await page.getByRole('link',{name:/Explore the idea/}).click({timeout:4000});await page.waitForTimeout(500);assert.ok(await page.locator('#how').evaluate(e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().top<innerHeight));return {scrollY:await page.evaluate(()=>scrollY)};});
  await recordCheck(run,'idea-navigation',async()=>{await page.getByRole('link',{name:'The idea',exact:true}).click({timeout:4000});await page.waitForTimeout(500);assert.ok(await page.locator('#how').evaluate(e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().top<innerHeight));return {scrollY:await page.evaluate(()=>scrollY)};});
 }else await recordCheck(run,'return-to-colony',async()=>{await page.getByRole('link',{name:/Back to the colony/}).click({timeout:4000});await page.waitForFunction(()=>scrollY<5,{},{timeout:5000});return {scrollY:await page.evaluate(()=>scrollY)};});
 await page.getByRole('link',{name:'Anthropic Ants home',exact:true}).click({timeout:4000});await page.waitForTimeout(600);mark('all-controls-reviewed');
}
async function runOne(browser,arm,scenario,source){
 const viewport=scenario==='mobile'?{width:390,height:844}:{width:1440,height:960},reducedMotion=scenario==='reduced'?'reduce':'no-preference';
 const directory=path.join(root,`${arm.id}-${scenario}-${Date.now()}`);await mkdir(directory,{recursive:true});
 const run={arm:arm.id,scenario,directory,origin:arm.origin,sourceDigest:arm.sourceDigest,source,viewport,reducedMotion,checks:[],events:[],pageErrors:[],consoleWarnings:[],networkRequests:[],status:'running'};
 const context=await browser.newContext({viewport,reducedMotion,acceptDownloads:true,recordVideo:{dir:directory,size:viewport}}),videoStart=performance.now();
 const page=await context.newPage(),mark=name=>{const seconds=(performance.now()-videoStart)/1000;run.events.push({name,seconds});console.log(JSON.stringify({progress:{arm:run.arm,scenario,name,seconds}}));return seconds;};
 page.on('pageerror',e=>run.pageErrors.push(e.message));page.on('console',e=>{if(e.type()==='warning'||e.type()==='error')run.consoleWarnings.push({type:e.type(),text:e.text()});});page.on('request',request=>run.networkRequests.push({url:request.url(),method:request.method()}));
 let video;
 try{
  mark('navigation-start');await page.goto(arm.origin,{waitUntil:'load',timeout:15000});mark('navigation-complete');run.traceStartSeconds=mark('trace-start');await setupTrace(page,arm.id);await page.waitForTimeout(1200);mark('entrance-reviewed');run.runtime=await runtime(page,browser);if(scenario==='fallback')run.runtime.flags.push('--disable-webgl');
  await recordCheck(run,'renderer',async()=>{const fallback=await page.locator('#fallback').isVisible();assert.equal(fallback,scenario==='fallback');const gl=await page.locator('#colony').evaluate(canvas=>{const context=canvas.getContext('webgl2')??canvas.getContext('webgl');if(!context)return null;const info=context.getExtension('WEBGL_debug_renderer_info');return {version:context.getParameter(context.VERSION),renderer:context.getParameter(info?.UNMASKED_RENDERER_WEBGL??context.RENDERER),width:canvas.width,height:canvas.height};});if(scenario!=='fallback')assert.ok(gl,'Actual WebGL context exists');return {fallback,gl};});
  await recordCheck(run,'responsive-initial',async()=>{const dimensions=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(dimensions.document<=dimensions.viewport+1,'No horizontal document overflow');return dimensions;});
  await recordCheck(run,'keyboard-skip-link',async()=>{await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.classList.contains('skip')));await page.keyboard.press('Enter');await page.waitForTimeout(500);assert.ok(await page.locator('#demo').evaluate(e=>e.getBoundingClientRect().top<innerHeight));await page.getByRole('link',{name:'Anthropic Ants home',exact:true}).click({timeout:4000});await page.waitForFunction(()=>scrollY<5,{},{timeout:5000});return {activated:true};});
  await recordCheck(run,'navigation-colony-link',async()=>{await page.locator('nav a[href="#demo"]').click({timeout:4000});await page.waitForTimeout(500);assert.ok(await page.locator('#demo').evaluate(e=>e.getBoundingClientRect().top<innerHeight));await page.getByRole('link',{name:'Anthropic Ants home',exact:true}).click({timeout:4000});await page.waitForFunction(()=>scrollY<5,{},{timeout:5000});return {activated:true};});
  await recordCheck(run,'about-drawer-pointer-focus-escape',()=>drawerJourney(page,arm.id,MAP[arm.id].about));
  await recordCheck(run,'about-drawer-keyboard-close',()=>drawerJourney(page,arm.id,MAP[arm.id].about,{keyboard:true,close:'button'}));
  if(scenario==='desktop')await recordCheck(run,'advertised-view-controls',async()=>{
    const box=await page.locator('#colony').boundingBox();assert.ok(box);mark('view-before');
    await page.mouse.move(box.x+box.width*.65,box.y+box.height*.55);
    if(arm.id==='ordinary'){await page.mouse.down();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.55,{steps:12});await page.mouse.up();await page.locator('#colony').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');}
    await page.waitForTimeout(1000);mark('view-after');return {advertised:arm.id==='ordinary'?'Pointer drag and arrow keyboard':'Pointer response and scroll camera',box};
  });
  await recordCheck(run,'hero-launch-or-demo-navigation',async()=>{await page.getByRole(arm.id==='ordinary'?'button':'link',{name:/Put the colony to work/}).click({timeout:4000});await page.waitForTimeout(700);assert.ok(await page.locator('#demo').evaluate(e=>e.getBoundingClientRect().top<innerHeight));if(arm.id==='ordinary'){await waitMode(page,arm.id,'running',4000);await page.locator('#cancel').click({timeout:4000});await waitMode(page,arm.id,'cancelled',4000);}return {state:await stateOf(page,arm.id),scrollY:await page.evaluate(()=>scrollY)};});
  mark('scroll-close-view');
  await taskJourney(page,arm.id,run,mark,{full:true,keyboard:scenario==='reduced'});
  if(scenario==='desktop')await advertisedControls(page,arm.id,run,mark);
  await recordCheck(run,'no-uncaught-errors',async()=>{assert.deepEqual(run.pageErrors,[]);return {pageErrors:run.pageErrors,warnings:run.consoleWarnings};});
  await recordCheck(run,'all-local-resources',async()=>{const remote=run.networkRequests.filter(item=>!item.url.startsWith(arm.origin)&&!item.url.startsWith('data:')&&!item.url.startsWith('blob:'));assert.deepEqual(remote,[]);return {requestCount:run.networkRequests.length};});
  run.trace=await page.evaluate(()=>window.__antsHeldout.stop());mark('journey-end');await page.waitForTimeout(500);video=page.video();
 }catch(error){run.checks.push({id:'journey-completed',passed:false,error:error.message});run.trace=await page.evaluate(()=>window.__antsHeldout?.stop()).catch(()=>null);mark('journey-failed');video=page.video();}
 finally{await context.close();}
 if(video){run.video=await fileRecord(await video.path());run.videoMetadata=await measureVideo(run.video.file);run.videoTransform={scale:1,timeScale:1,crop:null,rawFile:run.video.file};
  await recordCheck(run,'recording-covers-complete-viewport-journey',async()=>{assert.equal(run.videoMetadata.width,viewport.width);assert.equal(run.videoMetadata.height,viewport.height);const end=run.events.find(e=>e.name==='journey-end');assert.ok(end,'Normal journey reached its end');assert.ok(run.videoMetadata.durationSeconds>=end.seconds-.3);assert.ok(run.events.some(e=>e.name==='navigation-start'));assert.ok(run.events.some(e=>e.name==='task-complete'));assert.ok(run.events.some(e=>e.name==='plan-read'));return {metadata:run.videoMetadata,clock:'Approximate host offset from page creation to native recording; seek uncertainty ±~100ms, not exact per-frame app synchronization'};});
  const points=[['entrance',run.events.find(e=>e.name==='entrance-reviewed')?.seconds],['task',run.events.find(e=>e.name==='task-launched')?.seconds+2],['result',run.events.find(e=>e.name==='plan-read')?.seconds-.3],['final',Math.max(.1,run.videoMetadata.durationSeconds-.3)]];
  const taskStart=run.events.find(e=>e.name==='task-launched')?.seconds;
  for(let stage=0;stage<4;stage++){const sample=run.trace?.samples.find(s=>s.active===stage&&run.traceStartSeconds+s.t/1000>=taskStart);if(sample)points.push([`stage-${stage+1}`,run.traceStartSeconds+sample.t/1000+.5]);}
  run.frames=[];for(const [label,time]of points)if(Number.isFinite(time)&&time>0&&time<run.videoMetadata.durationSeconds)run.frames.push({label,seconds:time,...await viewportFrame(run.video.file,time,path.join(directory,`${label}-frame.png`))});
  if(run.pauseWindow&&run.pauseWindow.rect.width>0&&run.pauseWindow.rect.height>0)await recordCheck(run,'pause-freezes-rendered-scene-pixels',async()=>{const {start,end,rect}=run.pauseWindow,aTime=start+.3,bTime=end-.3;const a=await scenePixels(run.video.file,aTime,rect),b=await scenePixels(run.video.file,bTime,rect),delta=pixelDelta(a,b);assert.ok(delta.meanAbsChannelDelta<=1.5&&delta.channelsOver12<=.002,JSON.stringify(delta));run.frames.push({label:'paused-a',seconds:aTime,...await viewportFrame(run.video.file,aTime,path.join(directory,'paused-a-frame.png'))},{label:'paused-b',seconds:bTime,...await viewportFrame(run.video.file,bTime,path.join(directory,'paused-b-frame.png'))});return {aTime,bTime,rect,delta,tolerance:'Lossy VP8 stationary pixels: mean absolute RGB channel delta≤1.5 and ≤0.2% channels changing by>12; numerical freeze tolerance, not visual quality score'};});
 }
 const screenshotContext=await browser.newContext({viewport,reducedMotion});try{const screenshotPage=await screenshotContext.newPage();await screenshotPage.goto(arm.origin);await screenshotPage.waitForTimeout(1200);const file=path.join(directory,'initial-screenshot.png');await screenshotPage.screenshot({path:file});run.initialScreenshot=await fileRecord(file);}finally{await screenshotContext.close();}
 run.status=run.checks.every(c=>c.passed)?'passed':'failed';await writeFile(path.join(directory,'verification.json'),JSON.stringify(run,null,2));console.log(JSON.stringify({arm:run.arm,scenario:run.scenario,status:run.status,checks:run.checks.map(({id,passed,error})=>({id,passed,error})),video:run.video}));return run;
}
if(process.env.ANTS_STUDY_READY==='1'||(!process.env.ANTS_CALIBRATE_ONLY&&!process.env.ANTS_DISCOVER)){
 const viewer=await launchViewer(process.cwd(),0);const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  summary.calibration=await calibrate(browser);summary.protocol=await fileRecord(path.resolve('studies/ants-launch/PROTOCOL.json'));summary.harness=await fileRecord(new URL(import.meta.url).pathname);await writeFile(path.join(root,`harness-${summary.harness.sha256}.mjs`),await readFile(summary.harness.file));
  const selected=(process.env.ANTS_SCENARIOS??'desktop,mobile,reduced,fallback').split(',');
  for(const scenario of selected){let driver=browser;if(scenario==='fallback')driver=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-webgl']});
   try{for(const arm of viewer.arms){if(process.env.ANTS_ARM&&process.env.ANTS_ARM!==arm.id)continue;const source=await sourceFiles(path.resolve('studies/ants-launch/source',arm.id));summary.runs.push(await runOne(driver,arm,scenario,source));await writeFile(path.join(root,'verification.json'),JSON.stringify(summary,null,2));}}
   finally{if(driver!==browser)await driver.close();}
  }
  summary.status=summary.runs.length&&summary.runs.every(r=>r.status==='passed')?'passed':'failed';summary.finishedAt=new Date().toISOString();await writeFile(path.join(root,`attempt-${Date.now()}.json`),JSON.stringify(summary,null,2));await writeFile(path.join(root,'verification.json'),JSON.stringify(summary,null,2));if(summary.status!=='passed')process.exitCode=1;
 }finally{await browser.close();await viewer.close();}
}
