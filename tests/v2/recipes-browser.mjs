import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {chromiumOptions} from '../../server/browser.ts';

// Original recipe integration fixture, not a blind coding-agent benchmark.
const recipeRoot=new URL('../../plugin/motion-debugger/skills/motion/recipes/',import.meta.url);
const artifactRoot=path.resolve('artifacts/v2/recipes');await mkdir(artifactRoot,{recursive:true});
const runId=new Date().toISOString().replace(/[:.]/g,'-'),runRoot=path.join(artifactRoot,runId);await mkdir(runRoot,{recursive:true});
const modules=new Map();
for(const name of ['spring','drawer','task-handoff'])modules.set(`/recipes/${name}.mjs`,await readFile(new URL(`${name}.mjs`,recipeRoot),'utf8'));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Recipe browser verification</title>
<style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#f4eddc;color:#24231f;font:16px system-ui}h1{font-size:clamp(28px,5vw,48px);max-width:700px}button{font:inherit;padding:14px;border:1px solid #645f4d;border-radius:10px;background:#fffaf0;color:inherit;cursor:pointer}button:focus-visible{outline:3px solid #096bd9;outline-offset:4px}#stage{position:relative;height:220px;width:100%;max-width:750px;display:flex;justify-content:space-between;align-items:center;border-block:1px solid #b9b098;margin:32px 0}#token{position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:#d24625;pointer-events:none;box-shadow:0 0 0 5px #d2462525}button[data-assigned=true]{background:#e1e7c7}dialog{position:fixed;inset:0 0 0 auto;margin:0;height:100dvh;width:min(340px,90vw);max-height:none;border:0;background:#e1e7c7;padding:28px}dialog::backdrop{background:#252c2560}dialog button{display:block;margin:16px 0}output{display:block;min-height:50px;line-height:1.5}@media(max-width:500px){body{padding:20px}#stage button{padding:12px 8px}}</style>
<main><h1>Discover, delegate, arrive.</h1><p>Actual local browser checks for the shipped construction modules.</p><button id="open" aria-controls="dialog">Open task panel</button><button id="open-plan">Read completed plan</button>
<section id="stage" aria-label="Task delegation"><button data-worker="0">Scout</button><button data-worker="1">Planner</button><button data-worker="2">Builder</button><div id="token" aria-hidden="true"></div></section><output id="result" aria-live="polite">Ready</output></main>
<dialog id="dialog" aria-labelledby="title"><h2 id="title">Task details</h2><p>Closing can reverse before its flight ends.</p><button id="close">Close panel</button><button id="reopen">Keep panel open</button><button id="action">Inspect plan</button><output id="details"></output></dialog>
<script type="module">
import {createDrawer} from '/recipes/drawer.mjs';import {createTaskHandoff} from '/recipes/task-handoff.mjs';
const dialog=document.querySelector('#dialog'),stage=document.querySelector('#stage');
window.drawer=createDrawer({dialog,openButton:document.querySelector('#open'),closeButton:document.querySelector('#close')});
window.handoff=createTaskHandoff({stage,token:document.querySelector('#token'),workers:[...document.querySelectorAll('[data-worker]')],onArrive:({index})=>{const result=document.querySelector('#result');result.textContent=['Scout received the task','Planner received the task','Builder received the task'][index];result.dataset.worker=String(index);result.dataset.state='complete';}});
document.querySelector('#open-plan').onclick=()=>window.drawer.setOpen(true);document.querySelector('#reopen').onclick=()=>window.drawer.setOpen(true);document.querySelector('#action').onclick=()=>document.querySelector('#details').textContent='Plan inspected';
window.timeline=[];window.snapshots={};
function watch(element,key,state){element.addEventListener('click',event=>{window.snapshots[key]={selector:event.target.id||event.target.dataset.worker,before:state()};},true);element.addEventListener('click',()=>{window.snapshots[key].after=state();window.timeline.push({atMs:performance.now(),kind:key,...window.snapshots[key]});});}
watch(stage,'handoff',()=>window.handoff.state);watch(dialog,'drawer',()=>window.drawer.state);
window.dispose=()=>{window.drawer.dispose();window.handoff.dispose();};window.ready=true;
</script></html>`;
const server=createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(modules.has(req.url)){res.setHeader('Content-Type','text/javascript');res.end(modules.get(req.url));}else{res.statusCode=404;res.end('Not found');}}catch{res.statusCode=500;res.end('Fixture failed');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch(chromiumOptions());
const results=[];
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),node:process.version,chromium:browser.version(),fixtureSha256:createHash('sha256').update(html).digest('hex'),recipeSha256:Object.fromEntries([...modules].map(([name,source])=>[name,createHash('sha256').update(source).digest('hex')]))};
let failure;
try{
  for(const scenario of [{name:'desktop',viewport:{width:1100,height:760},reducedMotion:'no-preference'},{name:'mobile',viewport:{width:390,height:844},reducedMotion:'no-preference'},{name:'reduced-motion',viewport:{width:1100,height:760},reducedMotion:'reduce'}]){
    const directory=path.join(runRoot,scenario.name);await mkdir(directory,{recursive:true});
    const context=await browser.newContext({viewport:scenario.viewport,reducedMotion:scenario.reducedMotion,recordVideo:{dir:directory,size:scenario.viewport}});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));const video=page.video();
    let scenarioFailure;const checks=[];
    try{
      await page.goto(origin);await page.waitForFunction(()=>window.ready);await page.screenshot({path:path.join(directory,'initial.png')});
      await page.click('#open');await page.waitForFunction(()=>document.querySelector('#dialog').dataset.motionState==='open');
      assert.equal(await page.locator('#open').getAttribute('aria-expanded'),'true');await page.click('#action');assert.equal(await page.locator('#details').textContent(),'Plan inspected');
      await page.screenshot({path:path.join(directory,'drawer-open.png')});
      await page.keyboard.press('Tab');assert.equal(await page.locator('#close').evaluate(element=>element===document.activeElement),true,'Tab from the last modal control wraps to its first');
      await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#action').evaluate(element=>element===document.activeElement),true,'Reverse Tab stays within the modal');checks.push('forward and reverse keyboard focus containment');
      if(scenario.reducedMotion==='no-preference'){
        await page.click('#close');await page.waitForTimeout(40);
        // Use actual pointer coordinates: locator.click waits for stability and cannot
        // exercise a button deliberately traveling during the reversal window.
        const box=await page.locator('#reopen').boundingBox();assert.ok(box);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
        const snapshot=await page.evaluate(()=>window.snapshots.drawer);assert.equal(snapshot.selector,'reopen');assert.equal(snapshot.before.value,snapshot.after.value);assert.equal(snapshot.before.velocity,snapshot.after.velocity);assert.ok(snapshot.before.velocity<0,'Panel is closing when reopened');
        await page.waitForFunction(()=>document.querySelector('#dialog').dataset.motionState==='open');checks.push('rapid drawer reopen preserves exact position and velocity');
      }
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#dialog').open);assert.equal(await page.locator('#open').evaluate(element=>element===document.activeElement),true);checks.push('native modal action, Escape and focus restoration');
      await page.click('#open-plan');await page.waitForFunction(()=>document.querySelector('#dialog').dataset.motionState==='open');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#dialog').open);assert.equal(await page.locator('#open-plan').evaluate(element=>element===document.activeElement),true,'Programmatic secondary opener receives focus back');checks.push('secondary opener focus restoration');
      await page.locator('button[data-worker="2"]').click();
      if(scenario.reducedMotion==='no-preference')await page.waitForTimeout(45);
      await page.locator('button[data-worker="1"]').click();
      const snapshot=await page.evaluate(()=>window.snapshots.handoff);
      if(scenario.reducedMotion==='no-preference'){assert.equal(snapshot.before.x.value,snapshot.after.x.value);assert.equal(snapshot.before.x.velocity,snapshot.after.x.velocity);assert.ok(snapshot.before.x.velocity>0);checks.push('pointer handoff reversal preserves exact position and velocity');}
      else {assert.equal(snapshot.after.x.value,snapshot.after.x.target);assert.equal(snapshot.after.x.velocity,0);checks.push('reduced motion immediately reaches selected destination');}
      await page.waitForFunction(()=>document.querySelector('#result').dataset.worker==='1'&&document.querySelector('#stage').dataset.handoff==='arrived');assert.equal(await page.locator('#result').textContent(),'Planner received the task');
      const tokenBox=await page.locator('#token').boundingBox(),workerBox=await page.locator('button[data-worker="1"]').boundingBox();assert.ok(tokenBox&&workerBox);assert.ok(tokenBox.y+tokenBox.height<workerBox.y,'Arrived task token keeps worker label readable');checks.push('arrived token does not obscure worker label');
      await page.locator('button[data-worker="0"]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#result').dataset.worker==='0'&&document.querySelector('#stage').dataset.handoff==='arrived');checks.push('keyboard selection and replay reach meaningful completion');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(directory,'completed.png'),fullPage:true});
      const state=await page.evaluate(()=>({handoff:window.handoff.state,drawer:window.drawer.state,timeline:window.timeline}));
      await page.evaluate(()=>window.dispose());await page.locator('button[data-worker="2"]').click();assert.equal(await page.locator('#result').getAttribute('data-worker'),'0');assert.deepEqual(errors,[]);checks.push('disposed listeners do not react and no uncaught browser errors');
      results.push({...scenario,status:'passed',checks,state,screenshots:['initial.png','drawer-open.png','completed.png'].map(file=>path.join(directory,file))});
    }catch(error){scenarioFailure=error;results.push({...scenario,status:'failed',checks,error:error.stack,errors});await page.screenshot({path:path.join(directory,'failure.png'),fullPage:true}).catch(()=>{});}
    finally{await context.close();if(video){const saved=path.join(directory,'recording.webm');await video.saveAs(saved);results.at(-1).recording=saved;}}
    if(scenarioFailure)throw scenarioFailure;
  }
}catch(error){failure=error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));const report=JSON.stringify({status:failure?'failed':'passed',runId,scope:'Actual Chromium recipe integration fixture; functional and interruption checks, not a visual quality verdict or agent benchmark',origin,provenance,results,error:failure?.stack},null,2);await writeFile(path.join(runRoot,'browser-verification.json'),report);await writeFile(path.join(artifactRoot,'browser-verification.json'),report);}
if(failure)throw failure;
console.log(JSON.stringify({status:'passed',report:path.join(artifactRoot,'browser-verification.json'),scenarios:results.map(result=>({name:result.name,checks:result.checks,recording:result.recording}))},null,2));
