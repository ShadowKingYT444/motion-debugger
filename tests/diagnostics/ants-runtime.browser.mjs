/** Native-browser diagnostic; not a Motion MCP or agent benchmark.
 * Run: CHROMIUM_PATH=/path/to/chromium node tests/diagnostics/ants-runtime.browser.mjs
 * Optional exact artifacts: --ants /path/to/HTMLs --out /path/to/new/evidence
 * Uses setContent deliberately: no navigation, persistence, or network-fidelity claim.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {chromium} from 'playwright';

const {values} = parseArgs({options:{ants:{type:'string'},out:{type:'string'}}});
const oldTimers = 'setTimer = setTimeout, clearTimer = clearTimeout';
const newTimers = 'setTimer = (callback, delay) => window.setTimeout(callback, delay), clearTimer = timer => window.clearTimeout(timer)';
const expectedHashes = {
  'Ants-Motion-Workflow.html':'b44682f60729d0341b1158e843cd229683395cf03ad6a55b40c47a9466230e4d',
  'Ants-Ordinary-Workflow.html':'3f832b38acda430919899f4dba29b742aee538aa49b3e944e1b361cce4cc1147',
};
const sha = value => createHash('sha256').update(value).digest('hex');
if(values.out) await mkdir(values.out); // Refuse reuse rather than overwrite earlier evidence.
const result = {mode:'Native Chromium, Playwright setContent, real timers, fresh contexts; no MCP or page-navigation test',runs:[],artifacts:{}};
let browser;
async function inPage(viewport,reducedMotion,run) {
  const context=await browser.newContext({viewport,reducedMotion,serviceWorkers:'block'});
  try {
    // These known HTMLs are self-contained. No external requests are needed.
    await context.route('**/*',route=>route.abort());
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(3000);
    page.on('pageerror',error=>errors.push(error.message));
    return await run(page,errors);
  } finally { await context.close(); }
}
const motionState=page=>page.evaluate(()=>({
  status:document.querySelector('#workflow').dataset.status,
  progress:document.querySelector('#workflow-progress').getAttribute('aria-valuenow'),
  stages:document.querySelector('#progress-label').textContent,
  errorHidden:document.querySelector('#task-error').hidden,
  error:document.querySelector('#task-error').textContent,
  finalTitle:document.querySelector('#status-title').textContent,
}));
async function screenshot(page,name) {
  if(values.out) await page.screenshot({path:path.join(values.out,`${name}.png`)});
}
try {
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  result.browser=browser.version();
  await inPage({width:800,height:600},'no-preference',async page=>{
    await page.setContent('<!doctype html><title>Native timer receiver diagnostic</title>');
    const native=await page.evaluate(async()=>{
      const wrong={setTimer:window.setTimeout,clearTimer:window.clearTimeout};
      let setError='',clearError='';
      try{wrong.setTimer(()=>{},10)}catch(error){setError=error.message}
      const handle=window.setTimeout(()=>{},1000);
      try{wrong.clearTimer(handle)}catch(error){clearError=error.message}
      window.clearTimeout(handle);
      const safe={setTimer:(fn,ms)=>window.setTimeout(fn,ms),clearTimer:id=>window.clearTimeout(id)};
      let completed=false,canceledRan=false;
      safe.setTimer(()=>{completed=true},10);
      const canceled=safe.setTimer(()=>{canceledRan=true},10);safe.clearTimer(canceled);
      await new Promise(resolve=>window.setTimeout(resolve,60));
      return {setError,clearError,completed,canceledRan};
    });
    result.runs.push({name:'isolated-native-timers',...native});
    assert.match(native.setError,/Illegal invocation/i);
    assert.match(native.clearError,/Illegal invocation/i);
    assert.equal(native.completed,true);assert.equal(native.canceledRan,false);
  });
  if(values.ants) {
    const sources={};
    for(const [name,expected] of Object.entries(expectedHashes)) {
      const bytes=await readFile(path.join(values.ants,name));
      assert.equal(sha(bytes),expected,`${name}: source changed; do not silently reuse old conclusions`);
      result.artifacts[name]={sha256:sha(bytes),bytes:bytes.length};sources[name]=bytes.toString('utf8');
    }
    const original=sources['Ants-Motion-Workflow.html'];
    assert.equal(original.split(oldTimers).length,2,'Expected one timer-default site');
    const fixed=original.replace(oldTimers,newTimers);
    result.artifacts['motion-timer-wrapper-only']={sha256:sha(fixed),bytes:Buffer.byteLength(fixed)};
    for(const [name,html,width,reducedMotion] of [
      ['motion-original',original,1440,'no-preference'],
      ['motion-timer-fixed',fixed,1440,'no-preference'],
      ['motion-timer-fixed-mobile-reduced',fixed,390,'reduce'],
    ]) {
      await inPage({width,height:960},reducedMotion,async(page,errors)=>{
        await page.setContent(html,{waitUntil:'load'});
        await page.locator('#send-task').click(); // Actual unforced browser input.
        if(name==='motion-original') {
          await page.waitForTimeout(7000); // Past its nominal six-second workflow.
          const state=await motionState(page);
          result.runs.push({name,width,reducedMotion,waitAfterSubmitMs:7000,state,uncaughtPageErrors:[...errors]});
          assert.equal(state.status,'running');assert.equal(state.progress,'0');
          assert.equal(state.errorHidden,false);assert.match(state.error,/Illegal invocation/i);
          assert.equal(errors.length,0,'The user-visible failure is caught, not an uncaught pageerror');
        } else {
          await page.waitForFunction(()=>document.querySelector('#workflow').dataset.status==='complete',null,{timeout:9000});
          const state=await motionState(page);
          assert.equal(state.progress,'100');assert.equal(state.errorHidden,true);
          await screenshot(page,name);
          // Both native set and clear paths must work; do not test only the first submit.
          await page.locator('#replay-task').click();
          await page.waitForTimeout(160);await page.locator('#pause-task').click();
          const paused=await motionState(page);assert.equal(paused.status,'paused');
          await page.waitForTimeout(200);assert.deepEqual(await motionState(page),paused);
          await page.locator('#pause-task').click();assert.equal((await motionState(page)).status,'running');
          await page.locator('#cancel-task').click();assert.equal((await motionState(page)).status,'cancelled');
          await page.waitForTimeout(200);assert.equal((await motionState(page)).status,'cancelled');
          assert.equal(errors.length,0);
          result.runs.push({name,width,reducedMotion,state,checks:['complete','replay','pause holds','resume','cancel holds'],uncaughtPageErrors:[...errors]});
        }
        if(name==='motion-original') await screenshot(page,name);
      });
    }
    await inPage({width:1440,height:960},'no-preference',async(page,errors)=>{
      await page.setContent(sources['Ants-Ordinary-Workflow.html'],{waitUntil:'load'});
      await page.locator('[data-scenario="lisbon"]').click();
      await page.locator('#request-form [type=submit]').click();
      // Ordinary takes about 7.8 seconds; do not use the treatment's duration as its deadline.
      await page.waitForFunction(()=>document.querySelector('#status-badge').textContent==='Plan ready',null,{timeout:11000});
      const state=await page.evaluate(()=>({status:document.querySelector('#status-badge').textContent,deliverableHidden:document.querySelector('#deliverable').hidden,downloadDisabled:document.querySelector('#download').disabled}));
      assert.equal(state.deliverableHidden,false);assert.equal(state.downloadDisabled,false);assert.equal(errors.length,0);
      result.runs.push({name:'ordinary-original',state,uncaughtPageErrors:[...errors]});
      await screenshot(page,'ordinary-original');
    });
  }
  result.passed=true;
} catch(error) {
  result.passed=false;result.failure=error.stack??String(error);process.exitCode=1;
} finally {
  await browser?.close();
  const text=JSON.stringify(result,null,2)+'\n';
  if(values.out) await writeFile(path.join(values.out,'results.json'),text,{flag:'wx'});
  console.log(text);
}
