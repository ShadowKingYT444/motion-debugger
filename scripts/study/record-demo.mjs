// Capture actual saved outputs for README playback. No synthetic frames or repaired-mode toggle.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {chromium} from 'playwright';
import path from 'node:path';
const output=path.resolve('artifacts/study-videos');await mkdir(output,{recursive:true});
const child=spawn(process.execPath,['scripts/demo-study.mjs','--reuse-builds','--require-all','--port','0'],{stdio:['ignore','pipe','pipe']});
let log='',browser;const reports=[];
try{
 const session=await new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(Error('Demo startup timed out')),600000);child.stdout.on('data',x=>{log+=x;buffer+=x;const line=buffer.split('\n').find(x=>x.startsWith('STUDY_DEMO_READY '));if(line){clearTimeout(timer);resolve(JSON.parse(line.slice('STUDY_DEMO_READY '.length)))}});child.stderr.on('data',x=>log+=x);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error(`Demo exited: ${code}`))})});
 browser=await chromium.launch({headless:true});
 for(const item of session.snapshots){
  if(item.status!=='ready')throw Error(`Snapshot unavailable: ${item.arm}/${item.stage}`);
  const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:output,size:{width:1280,height:900}},serviceWorkers:'block'});
  const origin=item.origin;await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===origin||['data:','blob:'].includes(u.protocol)?route.continue():route.abort()});
  const page=await context.newPage(),events=[];const start=Date.now();page.on('pageerror',e=>events.push({t:Date.now()-start,error:e.message}));
  await page.goto(origin,{waitUntil:'networkidle'});await page.waitForTimeout(2000);
  await page.screenshot({path:path.join(output,`${item.arm}-${item.stage}.png`)});
  const speed=item.arm==='baseline'?'button[data-speed="3"]':'[data-speed="3"]';
  try{await page.locator(speed).click({timeout:4000});events.push({t:Date.now()-start,action:'select high speed',status:'completed'})}catch(error){events.push({t:Date.now()-start,action:'select high speed',error:String(error)})}
  await page.waitForTimeout(3500);
  const video=page.video();await context.close();const source=await video.path(),filename=`${item.arm}-${item.stage}.webm`;await rename(source,path.join(output,filename));
  reports.push({arm:item.arm,stage:item.stage,source:item.source,manifestHash:item.manifestHash,filename,events,recordedDurationMs:Date.now()-start,note:'Actual Chromium recording, real saved source. Runtime cadence and screenshot capture pauses remain visible; this is not a smoothness benchmark.'});
 }
 await writeFile(path.join(output,'provenance.json'),JSON.stringify({sourceCommit:process.env.GITHUB_SHA||null,reports},null,2));
}finally{await browser?.close();child.kill('SIGTERM');await writeFile(path.join(output,'launcher.log'),log)}
