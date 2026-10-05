/** Opt-in sensitivity audit; seeded calibration defects are NOT agent benchmarks.
 * Run after npm ci && npm run build:
 *   node --import tsx tests/diagnostics/motion-value-sensitivity.mjs --out /tmp/new-motion-audit
 * The output path must be new. No existing source/study/evidence is overwritten.
 * Uses native setContent, real timers, unforced input, the shipped probe/analyzer.
 * This deliberately does not claim full capture/MCP navigation or physical FPS.
 */
import {parseArgs} from 'node:util';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {values}=parseArgs({options:{out:{type:'string'},repo:{type:'string'},core:{type:'string'},probe:{type:'string'},playwright:{type:'string'},'signal-root':{type:'string'}}});
if(!values.out)throw new Error('Supply --out with a NEW output directory');
const repo=path.resolve(values.repo??fileURLToPath(new URL('../../',import.meta.url)));
const load=p=>import(pathToFileURL(path.resolve(p)).href);
const {chromium}=values.playwright?await load(values.playwright):await import('playwright');
const {installBrowserProbe}=await load(values.probe??path.join(repo,'packages/core/browser-probe.ts'));
const {analyze,compare,reviewFrameTimes}=await load(values.core??path.join(repo,'build/core/index.js'));
const out=path.resolve(values.out);await mkdir(out); // Refuse reused evidence.
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=path.resolve(values['signal-root']??path.join(repo,'studies/rail-dispatch/source/motion'));
const calibrationHtml=kind=>`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#f5f2e9;color:#1d2730;font-family:Arial,sans-serif}button{margin:24px;padding:12px;font-size:18px}#stage{position:relative;width:640px;height:340px;margin:0;background:#e9e1cd}#actor{position:absolute;left:80px;top:130px;width:48px;height:48px;border-radius:50%;background:#ebae28;transform-origin:center;display:grid;place-items:center;font-size:34px;color:#20262d}#label{position:absolute;left:80px;top:220px;width:90px;height:30px;font-size:18px;color:#152730}#status{padding:15px}
</style></head><body><button id="start">Run transition</button><div id="stage"><div id="actor">➜</div><div id="label">Selected</div></div><div id="status">Ready</div><script>
let t0=null;const kind=${JSON.stringify(kind)};
document.querySelector('#start').onclick=()=>{t0=performance.now();requestAnimationFrame(tick)};
function tick(t){const u=Math.min(1,Math.max(0,(t-t0)/900)),s=u*u*(3-2*u),x=200*s;
 const angle=kind==='rotation-flip'&&u>.18&&u<.78?Math.floor((t-t0)/90)%2*180:0;
 const error=kind==='label-drift'?46*Math.sin(Math.PI*u)**2:0;
 document.querySelector('#actor').style.transform='translateX('+x+'px) rotate('+angle+'deg)';
 document.querySelector('#label').style.transform='translateX('+(x+error)+'px)';
 document.querySelector('#status').textContent=u===1?'Complete':'Moving';
 if(u<1)requestAnimationFrame(tick);
}
</script></body></html>`;
const files={};for(const name of ['index.html','style.css','app.js','recipes/spring.mjs'])files[name]=await readFile(path.join(root,name),'utf8');
const inlineSignal=files['index.html'].replace('<link rel="stylesheet" href="style.css">',`<style>${files['style.css']}</style>`).replace('<script type="module" src="app.js"></script>',`<script type="module">${files['recipes/spring.mjs'].replace(/export /g,'')}\n${files['app.js'].replace(/^import .*\n/,'')}</script>`);
const runtimeInputs={coreModule:values.core??'build/core/index.js',probeModule:values.probe??'packages/core/browser-probe.ts',coreSha256:sha(await readFile(values.core??path.join(repo,'build/core/index.js'))),probeSha256:sha(await readFile(values.probe??path.join(repo,'packages/core/browser-probe.ts')))};
const result={runtimeInputs,scope:'Native Chromium setContent observations using the exact shipped browser probe and analyzer bodies (execution provenance is in runtimeInputs). No page navigation, shipped capture orchestration, native-agent run, preference benchmark or physical display FPS claim.',environment:{node:process.version,driverModule:values.playwright??'playwright from project dependency installation',chromium:null},sourceInputs:Object.entries(files).map(([file,content])=>({file,sha256:sha(content),bytes:Buffer.byteLength(content)})),scenarios:[]};
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});result.environment.chromium=browser.version();
try{
 for(const kind of ['signal','signal-hidden','reference','rotation-flip','label-drift']){
  console.log('starting',kind);const signal=kind.startsWith('signal'),dir=path.join(out,kind);await mkdir(dir);
  const html=signal?(kind==='signal-hidden'?inlineSignal.replace('</head>','<style>#trains{visibility:hidden!important}</style></head>'):inlineSignal):calibrationHtml(kind);
  await writeFile(path.join(dir,'fixture.html'),html);
  const viewport=signal?{width:1440,height:1000}:{width:800,height:600};
  const context=await browser.newContext({viewport,serviceWorkers:'block',recordVideo:{dir,size:viewport}});
  await context.route('**/*',route=>route.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(3000);
  await page.setContent(html,{waitUntil:'load'});
  const recipe={url:'http://127.0.0.1/offline-fixture',selector:signal?'#network':'#stage',actions:signal?[{action:'wait',ms:300},{action:'click',selector:'#focus'},{action:'wait',ms:180},{action:'click',selector:'#summit'},{action:'wait',ms:180},{action:'click',selector:'#overview'},{action:'wait',ms:180},{action:'click',selector:'#focus'},{action:'click',selector:'#pause'},{action:'drag',selector:'#scrub',points:[{x:.2,y:.5},{x:.8,y:.5},{x:.35,y:.5}],durationMs:400},{action:'wait',ms:300}]:[{action:'wait',ms:180},{action:'click',selector:'#start'}],durationMs:signal?4000:2000,viewport,contract:{maxReplacements:0},...(!signal?{actors:[{id:'mark',kind:'dom',selector:'#actor',acceptance:{continuity:'position',inputPolicy:'retarget',maxStepAt60HzPx:30,maxReplacements:0,minTravelPx:180}},{id:'label',kind:'dom',selector:'#label',acceptance:{continuity:'position',inputPolicy:'retarget',maxStepAt60HzPx:30,maxReplacements:0,minTravelPx:180}}]}:{})};
  await page.evaluate(installBrowserProbe,{selector:recipe.selector,actors:recipe.actors});await page.evaluate(()=>window.__motionProbe.start());
  await page.waitForTimeout(signal?300:180);
  if(signal){
   await page.locator('#focus').click();await page.waitForTimeout(180);await page.locator('#summit').click();await page.waitForTimeout(180);await page.locator('#overview').click();await page.waitForTimeout(180);await page.locator('#focus').click();await page.locator('#pause').click();
   await page.locator('#scrub').scrollIntoViewIfNeeded();const r=await page.locator('#scrub').boundingBox();await page.mouse.move(r.x+.2*r.width,r.y+r.height/2);await page.mouse.down();
   const pts=[.2,.8,.35];const start=performance.now();for(let segment=0;segment<2;segment++)for(let n=1;n<=12;n++){const due=start+400*(segment*12+n)/24;await page.waitForTimeout(Math.max(0,due-performance.now()));await page.mouse.move(r.x+(pts[segment]+(pts[segment+1]-pts[segment])*n/12)*r.width,r.y+r.height/2);}await page.mouse.up();await page.waitForTimeout(300);
  }else await page.locator('#start').click();
  const remaining=recipe.durationMs-await page.evaluate(()=>window.__motionProbe.time());if(remaining>0)await page.waitForTimeout(remaining+15);
  const data=await page.evaluate(selector=>{window.__motionProbe.stop();const {events,samples,actorSamples,performanceDiagnostics}=window.__motionProbe;const el=document.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);return{events,samples,actorSamples,performanceDiagnostics,final:{visible:r.width>0&&r.height>0,text:el.textContent,attributes:{},x:r.x,y:r.y,opacity:Number(s.opacity)}}},recipe.selector);
  const state=await page.evaluate(()=>({service:document.querySelector('#service-name')?.textContent??null,pause:document.querySelector('#pause')?.textContent??null,completion:document.querySelector('#status')?.textContent??null,visibleTrains:[...document.querySelectorAll('#trains > g')].filter(el=>el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})).length}));
  const analyzed=analyze(data.samples,data.events,recipe,data.final,data.actorSamples);
  const marks=new Map(data.actorSamples.filter(s=>s.actorId==='mark').map(s=>[s.t,s]));
  let rotationFlips=0,flippedSamples=0,maxRelationError=0,lastAngle=null;
  for(const s of data.actorSamples){if(s.actorId==='mark'&&s.transform){const angle=Math.atan2(s.transform[1],s.transform[0]);if(s.transform[0]<-.9)flippedSamples++;if(lastAngle!==null&&Math.abs(Math.atan2(Math.sin(angle-lastAngle),Math.cos(angle-lastAngle)))>3)rotationFlips++;lastAngle=angle;}if(s.actorId==='label'&&s.screen&&marks.get(s.t)?.screen)maxRelationError=Math.max(maxRelationError,Math.abs(s.screen.x-marks.get(s.t).screen.x));}
  const observation={kind,browser:browser.version(),fixtureSha256:sha(html),scope:result.scope,recipe,observedState:state,declaredOutcomePassed:signal?state.service?.includes('Summit')&&state.pause?.includes('Resume'):state.completion==='Complete',uncaughtErrors:errors,analysis:analyzed,rotationFlips,flippedSamples,maxLabelOffsetErrorCssPx:maxRelationError,sampleCount:data.samples.length,actorSamples:data.actorSamples.length};
  await writeFile(path.join(dir,'observation.json'),JSON.stringify(observation,null,2));await writeFile(path.join(dir,'trace.json'),JSON.stringify(data,null,2));await page.screenshot({path:path.join(dir,'final.png')});const video=page.video();await context.close();const videoPath=await video.path();
  result.scenarios.push({...observation,video:path.relative(out,videoPath),videoSha256:sha(await readFile(videoPath)),traceSha256:sha(await readFile(path.join(dir,'trace.json')))});
  console.log(JSON.stringify({kind,outcomes:observation.declaredOutcomePassed,coverage:analyzed.metrics.sufficientEvidence,legacyPass:analyzed.assertions.every(a=>a.passed),actorStatus:analyzed.actorAnalysis?.status,rotationFlips,maxRelationError,visibleTrains:state.visibleTrains,errors}));
 }
 const synthetic={recipe:{durationMs:4000},events:[{id:'start',origin:'browser-observed',type:'click',t:100,detail:{trusted:true}},{id:'reverse',origin:'browser-observed',type:'click',t:900,detail:{trusted:true}}],findings:[],actorSamples:[],actorAnalysis:{actors:[{findings:[{sampleTimes:[800],eventIds:[],type:'position-step'}]},{findings:[{sampleTimes:[3400],eventIds:[],type:'position-step'}]}]}};
 result.frameSelection={scope:'Synthetic report unit input, not a recorded capture',requestedMaxFrames:6,returnedTimes:reviewFrameTimes(synthetic,6),lateFindingAtMs:3400,detailSourceTimes:reviewFrameTimes(synthetic,3)};
 // Synthetic guard test: valid comparable measurement conditions, one repaired actor violation.
 // These report stubs are unit inputs, NOT real capture IDs, measurements, or browser evidence.
 const guardBase={schemaVersion:'2.0',id:'synthetic-unit-before',recipe:{selector:'#stage',actions:[],durationMs:2000,viewport:{width:800,height:600},actors:[{id:'mark',kind:'dom',selector:'#actor',acceptance:{maxStepAt60HzPx:30}}]},environment:{browserMode:'headless',probeSha256:'same-unit-probe',analyzerSha256:'same-unit-analyzer'},coverage:{version:'1'},metrics:{sufficientEvidence:true},assertions:['valid-trajectory','browser-errors','network-policy'].map(id=>({id,passed:true,status:'passed'})),final:{visible:true,text:'Complete',attributes:{}},findings:[],delivery:{status:'passed'},actorAnalysis:{version:'1',status:'failed',actors:[{actorId:'mark',kind:'dom',status:'failed',coverage:{sufficient:true},assertions:[{id:'actor:mark:position',passed:false,status:'failed'}]}]}};
 const guardAfter=structuredClone(guardBase);guardAfter.id='synthetic-unit-after';guardAfter.actorAnalysis.status='passed';guardAfter.actorAnalysis.actors[0].status='passed';guardAfter.actorAnalysis.actors[0].assertions[0].passed=true;guardAfter.actorAnalysis.actors[0].assertions[0].status='passed';
 result.actorComparisonUnit={scope:'Synthetic report guard test only; not a recorded before/after repair',beforeActorStatus:'failed',afterActorStatus:'passed',sameRecipe:true,declaredCoverageSufficient:true,result:compare(guardBase,guardAfter)};

}finally{await browser.close();await writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));}
