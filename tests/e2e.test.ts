import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn, type ChildProcess} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium, type Browser} from 'playwright';
import {chromiumOptions} from '../server/browser';
import type {RunReport,CaptureReport} from '../src/types';

const port=Number(process.env.TEST_PORT ?? 4182);
const origin=`http://127.0.0.1:${port}`;
let server:ChildProcess,browser:Browser;
let serverLog='';
const request=(pathname:string,init?:RequestInit)=>fetch(`${origin}${pathname}`,init);
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

before(async()=>{
  await mkdir('artifacts/qa',{recursive:true});
  server=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  server.stdout?.on('data',data=>{serverLog+=String(data)});server.stderr?.on('data',data=>{serverLog+=String(data)});
  for(let i=0;i<80;i++) {
    if(server.exitCode!==null)throw new Error(`Server exited before readiness: ${serverLog}`);
    try{if((await request('/api/health')).ok)break;}catch{}
    if(i===79)throw new Error(`Server did not become ready: ${serverLog}`);
    await sleep(250);
  }
  browser=await chromium.launch(chromiumOptions());
});
after(async()=>{
  await browser?.close();
  server?.kill('SIGTERM');
  await writeFile('artifacts/qa/server.log',serverLog);
});

test('local API rejects arbitrary capture targets, delays and cross-origin mutations',async()=>{
  for(const body of [null,{fixture:'key-remount',delayMs:0},{fixture:'key-remount',delayMs:801},{fixture:'key-remount',delayMs:350,url:'http://example.com'},{fixture:'http://example.com',delayMs:350},{fixture:'key-remount',delayMs:'350'}]) {
    const response=await request('/api/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal(response.status,400);
  }
  const foreign=await request('/api/runs',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify({fixture:'key-remount',delayMs:350})});
  assert.equal(foreign.status,403);
  assert.equal((await request('/api/source?file=../../package.json')).status,400);
  assert.equal((await request('/api/runs/missing')).status,404);
});

test('three real baseline/fixed captures establish the proof at minimum, default and maximum API delay',{timeout:180000},async()=>{
  for(const delayMs of [150,350,800]) {
    const response=await request('/api/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fixture:'key-remount',delayMs})});
    assert.equal(response.status,202);
    const {id}=await response.json() as {id:string};
    const duplicate=await request('/api/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fixture:'key-remount',delayMs})});
    assert.equal(duplicate.status,409,'busy capture rejects duplicates');
    let report:RunReport|undefined;
    const deadline=Date.now()+45000;
    while(Date.now()<deadline) {
      report=await (await request(`/api/runs/${id}`)).json() as RunReport;
      if(report.status==='complete'||report.status==='failed')break;
      await sleep(500);
    }
    assert.equal(report?.status,'complete',report?.error ?? 'Capture timed out');
    assert.equal(report?.diagnosis?.confidence,'verified-fixture',JSON.stringify(report?.assertions));
    assert.equal(report?.assertions?.length,14);
    assert.ok(report?.assertions?.every(a=>a.passed),JSON.stringify(report?.assertions?.filter(a=>!a.passed)));
    assert.equal(report?.baseline?.metrics.replacements,1);
    assert.equal(report?.fixed?.metrics.replacements,0);
    assert.deepEqual(report?.baseline?.finalState,report?.fixed?.finalState);
    for(const mode of ['baseline','fixed'] as const) {
      const capture:CaptureReport=report![mode]!;
      assert.ok(capture.media.videoUrl);
      const videoResponse=await request(capture.media.videoUrl!);
      assert.equal(videoResponse.status,200);
      assert.match(videoResponse.headers.get('content-type') ?? '',/video\/webm/);
      assert.ok((await videoResponse.arrayBuffer()).byteLength>1000);
      assert.equal((await request(capture.media.finalUrl)).status,200);
    }
    console.log(JSON.stringify({runId:id,delayMs,baseline:report?.baseline?.metrics,fixed:report?.fixed?.metrics}));
  }
});

test('repeated activation makes only one request and reduced motion preserves final state',{timeout:30000},async()=>{
  for(const reducedMotion of ['no-preference','reduce'] as const) {
    const context=await browser.newContext({viewport:{width:960,height:640},reducedMotion});
    const page=await context.newPage();
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    let requestCount=0;
    page.on('request',request=>{if(request.url().includes('/api/fixture-data'))requestCount++});
    await page.goto(`${origin}/fixture?mode=fixed&delay=350`,{waitUntil:'networkidle'});
    await page.locator('#show-card').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>window.__motionTrace.finalState?.status==='ready');
    await page.waitForTimeout(1500);
    const trace=await page.evaluate(()=>({events:window.__motionTrace.events,samples:window.__motionTrace.samples,finalState:window.__motionTrace.finalState}));
    assert.equal(requestCount,1);
    assert.equal(trace.events.filter(e=>e.type==='react-mount').length,1);
    assert.equal(trace.events.filter(e=>e.type==='animation-cancel').length,0);
    assert.equal(trace.events[0].detail.trusted,true);
    assert.equal(trace.finalState?.revision,1);
    assert.equal(trace.finalState?.status,'ready');
    assert.equal(errors.length,0,errors.join('; '));
    const last=trace.samples.filter(s=>s.x!==null).at(-1)!;
    assert.equal(last.opacity,1);assert.equal(last.translateX,0);
    await page.screenshot({path:`artifacts/qa/fixture-${reducedMotion}.png`,animations:'allow'});
    await context.close();
  }
});

test('dashboard browser verification uses captured reports',{timeout:60000},async()=>{
  const verifier=spawn(process.execPath,['src/dashboard/verify-dashboard.mjs'],{cwd:process.cwd(),env:{...process.env,BASE_URL:origin,QA_OUTPUT:'artifacts/qa/dashboard'},stdio:['ignore','pipe','pipe']});
  let log='';verifier.stdout?.on('data',data=>{log+=String(data)});verifier.stderr?.on('data',data=>{log+=String(data)});
  const code=await new Promise<number|null>(resolve=>verifier.on('exit',resolve));
  await writeFile('artifacts/qa/dashboard-verification.log',log);
  assert.equal(code,0,log);
  console.log(log);
});
