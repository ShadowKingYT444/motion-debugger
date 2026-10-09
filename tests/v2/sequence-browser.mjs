import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import http from 'node:http';

// Actual native scheduling check of the original sequence; no backend work or
// flagship quality/agent improvement is asserted by this standalone fixture.
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const output=path.resolve('artifacts/v2/sequence'),runId=new Date().toISOString().replace(/[:.]/g,'-'),directory=path.join(output,runId);
await mkdir(directory,{recursive:true});
const source=await readFile(new URL('../../plugin/motion-debugger/skills/motion/recipes/elapsed-sequence.mjs',import.meta.url),'utf8');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elapsed sequence native verification</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f5efe0;color:#233c30;font:17px system-ui;padding:30px}main{max-width:900px;margin:auto}h1{font-size:clamp(28px,5vw,44px);font-weight:500}p{line-height:1.5}.stage{height:180px;border:1px solid #9da99a;border-radius:18px;background:#e2e9da;position:relative;padding:24px;overflow:hidden}.token{width:65px;height:65px;border-radius:14px;background:#496b51;position:absolute;left:24px;top:70px}nav{display:flex;gap:9px;flex-wrap:wrap;margin:20px 0}button{font:inherit;padding:12px;border:1px solid #7e9984;background:#fffbed;border-radius:8px;color:inherit}button:focus-visible{outline:3px solid #367aca}output{display:block;line-height:1.8}</style>
<main><h1>Scripted UI sequence</h1><p>Original elapsed-clock recipe. Assign and deliver are presentation phases; this test does not perform or simulate backend work.</p><div class="stage"><span id="phase">Original pose</span><div class="token"></div></div><nav><button id="play">Play</button><button id="pause">Pause</button><button id="resume">Resume</button><button id="cancel">Cancel</button><button id="replay">Replay</button></nav><output id="status">idle</output></main>
<script type="module">
import {createElapsedSequence} from '/elapsed-sequence.mjs';
const status=document.querySelector('#status'),phase=document.querySelector('#phase'),token=document.querySelector('.token');
window.nativeFailures=[];window.nativeCounts={};window.recipeCounts={};
for(const name of ['requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout']){const native=window[name];window[name]=function(...args){window.nativeCounts[name]=(window.nativeCounts[name]??0)+1;if(new Error().stack.includes('/elapsed-sequence.mjs'))window.recipeCounts[name]=(window.recipeCounts[name]??0)+1;try{return Reflect.apply(native,this,args);}catch(error){window.nativeFailures.push(name+': '+error.message);throw error;}};}
const nativeNow=performance.now;performance.now=function(...args){try{return Reflect.apply(nativeNow,this,args);}catch(error){window.nativeFailures.push('performance.now: '+error.message);throw error;}};
window.changes=[];window.completions=[];
const sequence=createElapsedSequence({phases:[{id:'assign',durationMs:180,pose:'Assigned'},{id:'deliver',durationMs:260,pose:'Delivered'}],onChange:state=>{window.changes.push({at:performance.now(),state});status.textContent=state.status;phase.textContent=state.status==='cancelled'?'Original pose':state.phase.pose;const amount=state.status==='cancelled'?0:(state.phase.index+state.poseProgress)/2;token.style.transform='translateX('+amount*Math.max(0,token.parentElement.clientWidth-125)+'px)';},onComplete:state=>window.completions.push({at:performance.now(),state})});
for(const method of ['play','pause','resume','cancel','replay'])document.querySelector('#'+method).onclick=()=>sequence[method]();
window.read=()=>({state:sequence.state,changes:window.changes,completions:window.completions,nativeFailures:window.nativeFailures,nativeCounts:window.nativeCounts,recipeCounts:window.recipeCounts,transform:getComputedStyle(token).transform});window.dispose=()=>sequence.dispose();window.ready=true;
</script></html>`;
await writeFile(path.join(directory,'fixture.html'),html);await writeFile(path.join(directory,'elapsed-sequence.mjs'),source);
// Loopback-only server for the sequence page.
async function startLoopbackServer(handler){const server=http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end()}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections()})}}
const app=await startLoopbackServer((req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'");if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(req.url==='/elapsed-sequence.mjs'){res.setHeader('Content-Type','text/javascript');res.end(source);}else{res.writeHead(404);res.end('Not found');}});
const executablePath=process.env.MOTION_CHROME_PATH??process.env.CHROMIUM_PATH??'/usr/bin/google-chrome';
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),chrome:browser.version(),executablePath,node:process.version,fixtureSha256:sha(html),recipeSha256:sha(source)};
let failure;
try{
  for(const scenario of [{name:'desktop',viewport:{width:1180,height:850},reducedMotion:'no-preference'},{name:'mobile',viewport:{width:390,height:844},reducedMotion:'no-preference'},{name:'reduced',viewport:{width:1180,height:850},reducedMotion:'reduce'}]){
    const folder=path.join(directory,scenario.name);await mkdir(folder,{recursive:true});
    const context=await browser.newContext({viewport:scenario.viewport,reducedMotion:scenario.reducedMotion,recordVideo:{dir:folder,size:scenario.viewport}});
    const page=await context.newPage(),video=page.video(),errors=[],consoleErrors=[],checks=[];let result={...scenario,status:'failed',checks},scenarioError;
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    try{
      await page.goto(app.origin);await page.waitForFunction(()=>window.ready,null,{polling:25});await page.screenshot({path:path.join(folder,'initial.png')});
      await page.click('#play');await page.waitForFunction(()=>window.read().state.status==='completed',null,{polling:25});
      const first=await page.evaluate(()=>window.read());assert.equal(first.state.progress,1);assert.equal(first.state.elapsedMs,440);assert.equal(first.state.phase.id,'deliver');assert.equal(first.completions.length,1);assert.ok(first.completions[0].at-first.changes[0].at>=435,'Native sequence respects elapsed duration within clock measurement tolerance');
      const idleChanges=first.changes.length,idleFrames=first.recipeCounts.requestAnimationFrame??0;await page.waitForTimeout(160);const idle=await page.evaluate(()=>window.read());assert.equal(idle.changes.length,idleChanges);assert.equal(idle.recipeCounts.requestAnimationFrame??0,idleFrames);checks.push('native start reaches terminal pose once and has no idle RAF loop');
      if(scenario.reducedMotion==='reduce'){assert.equal(first.recipeCounts.requestAnimationFrame??0,0);assert.ok(first.changes.filter(item=>item.state.status==='running').every(item=>item.state.poseProgress===1));checks.push('native reduced mode uses phase timers without decorative frames');}
      await page.click('#replay');await page.waitForTimeout(55);await page.click('#pause');const paused=await page.evaluate(()=>window.read());assert.equal(paused.state.status,'paused');assert.ok(paused.state.elapsedMs>0&&paused.state.elapsedMs<440);await page.waitForTimeout(240);assert.equal((await page.evaluate(()=>window.read())).state.elapsedMs,paused.state.elapsedMs);checks.push('native pause excludes waiting time');
      await page.click('#resume');await page.waitForFunction(()=>window.read().state.status==='completed'&&window.completions.length===2,null,{polling:25});checks.push('native resume preserves elapsed progress and completes once');
      await page.click('#replay');await page.waitForTimeout(50);await page.click('#cancel');const cancelled=await page.evaluate(()=>window.read());assert.equal(cancelled.state.status,'cancelled');assert.equal(cancelled.state.elapsedMs,0);assert.equal(await page.locator('#phase').textContent(),'Original pose');assert.match(cancelled.transform,/matrix\(1, 0, 0, 1, 0, 0\)/);await page.waitForTimeout(500);assert.equal((await page.evaluate(()=>window.read())).completions.length,2);checks.push('native cancellation restores original pose with no late completion');
      await page.click('#replay');await page.waitForTimeout(35);await page.emulateMedia({reducedMotion:scenario.reducedMotion==='reduce'?'no-preference':'reduce'});await page.waitForFunction(expected=>window.read().state.reducedMotion===expected,scenario.reducedMotion!=='reduce',{polling:25});
      await page.waitForFunction(()=>window.read().state.status==='completed'&&window.completions.length===3,null,{polling:25});const final=await page.evaluate(()=>window.read());assert.equal(final.state.reducedMotion,scenario.reducedMotion!=='reduce');assert.equal(final.state.progress,1);checks.push('actual media preference change preserves sequence completion');
      await page.screenshot({path:path.join(folder,'completed.png')});await page.evaluate(()=>window.dispose());const disposed=await page.evaluate(()=>window.read());await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.read())).changes.length,disposed.changes.length);assert.equal(disposed.state.status,'disposed');assert.deepEqual(errors,[]);assert.deepEqual(final.nativeFailures,[]);assert.deepEqual(consoleErrors,[]);checks.push('native defaults remain bound with no caught or uncaught timer failures; disposal stops callbacks');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);result={...scenario,status:'passed',checks,first,paused,cancelled,final,errors,consoleErrors};
    }catch(error){scenarioError=error;result={...result,error:error.stack,errors,consoleErrors};await page.screenshot({path:path.join(folder,'failure.png')}).catch(()=>{});}
    finally{await context.close();if(video){const recording=path.join(folder,'recording.webm');await video.saveAs(recording);result.recording={path:recording,sha256:sha(await readFile(recording))};}results.push(result);}
    if(scenarioError)throw scenarioError;
  }
}catch(error){failure=error;}
finally{await browser.close();await app.close();const report=JSON.stringify({status:failure?'failed':'passed',runId,scope:'Original scripted UI recipe with actual native Chrome clocks/timers and complete recordings. No backend-work, flagship quality, or agent-improvement claim.',origin:app.origin,provenance,results,error:failure?.stack},null,2);await writeFile(path.join(directory,'browser-verification.json'),report);await writeFile(path.join(output,'browser-verification.json'),report);}
if(failure)throw failure;
console.log(JSON.stringify({status:'passed',report:path.join(output,'browser-verification.json'),scenarios:results.map(result=>({name:result.name,checks:result.checks,recording:result.recording}))},null,2));
