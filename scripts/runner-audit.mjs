// Bounded diagnostic on the real working page. No fabricated motion samples.
import {chromium} from 'playwright';
import {installBrowserProbe} from '../packages/core/browser-probe.ts';
import {launchRepairCase} from './demo-repair.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve('artifacts/runner-audit');await mkdir(output,{recursive:true});
const cache=process.argv[process.argv.indexOf('--cache')+1];
const session=await launchRepairCase({port:0,offline:process.argv.includes('--offline'),...(process.argv.includes('--cache')?{cache}:{})});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const results=[];
try {
 for(const mode of ['plain','probe','probe+video']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',...(mode==='probe+video'?{recordVideo:{dir:output,size:{width:1440,height:1000}}}:{})});
  const origin=session.snapshots.find(x=>x.stage==='after').origin;
  await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===origin||['data:','blob:'].includes(u.protocol)?route.continue():route.abort()});
  if(mode!=='plain')await context.addInitScript({content:`(()=>{const __name=x=>x;(${installBrowserProbe.toString()})({selector:'#scene'});})()`});
  const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});
  const observed=await page.evaluate(async mode=>{
    const frames=[],begin=performance.now();
    if(mode!=='plain')window.__motionProbe.start();
    await new Promise(resolve=>{
      function tick(t){frames.push(t-begin);if(t-begin<1800)requestAnimationFrame(tick);else resolve();}
      requestAnimationFrame(tick);
    });
    if(mode!=='plain')window.__motionProbe.stop();
    return {frames,probe:mode==='plain'?null:{events:window.__motionProbe.events,samples:window.__motionProbe.samples}};
  },mode);
  const gaps=observed.frames.slice(1).map((t,i)=>t-observed.frames[i]);
  results.push({mode,frameCount:observed.frames.length,maxRafGapMs:Math.max(...gaps),gapsOver80:gaps.filter(x=>x>80).length,observed});
  await context.close();
 }
 const cdp=await browser.newBrowserCDPSession();const info=await cdp.send('SystemInfo.getInfo');await cdp.detach();
 await writeFile(path.join(output,'report.json'),JSON.stringify({scope:'One serial 1800ms actual 3D-page observation per mode; diagnostic association, not a causal benchmark. Plain/probe modes do not produce recordings and cannot replace final video evidence.',browser:browser.version(),renderer:info.gpu.auxAttributes?.glRenderer,results},null,2));
 console.log(JSON.stringify(results.map(({observed,...item})=>item)));
}finally{await browser.close();await session.close()}
