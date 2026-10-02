import { chromium } from 'playwright';
import { mkdir, rename, readFile, writeFile } from 'node:fs/promises';
import type {CaptureMode,CaptureReport,RunReport} from '../src/types';
import {computeMetrics,compareAssertions,diagnose,validGeometry} from './analysis';
import {fixtureSources,attachSources} from './source-map';
import {chromiumOptions} from './browser';

const MIN_CAPTURE_DURATION_MS=2200;
export async function captureRun(run:RunReport,root:string,port:number,onProgress?:(stage:string)=>void):Promise<RunReport> {
  const sources=await fixtureSources(root);
  await mkdir(`${root}/artifacts/runs/${run.id}`,{recursive:true});
  await writeFile(`${root}/artifacts/runs/${run.id}/fixture.tsx`,await readFile(`${root}/src/fixture/Fixture.tsx`,'utf8'));
  const captureDurationMs=Math.max(MIN_CAPTURE_DURATION_MS,run.delayMs+1400+350);
  const browser=await chromium.launch(chromiumOptions());
  const browserVersion=browser.version();
  async function captureMode(mode:CaptureMode):Promise<CaptureReport> {
    onProgress?.(`Capturing ${mode}`);
    const directory=`${root}/artifacts/runs/${run.id}/${mode}`;
    await mkdir(directory,{recursive:true});
    const context=await browser.newContext({viewport:{width:960,height:640},reducedMotion:'no-preference',recordVideo:{dir:directory,size:{width:960,height:640}}});
    const videoStart=performance.now();
    const page=await context.newPage();
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    const networkEvidence:{status:number;url:string;requestId:string|null}[]=[];
    page.on('response',response=>{
      if(response.url().includes('/api/fixture-data'))networkEvidence.push({status:response.status(),url:response.url(),requestId:response.request().headers()['x-motion-request'] ?? null});
    });
    try {
      await page.goto(`http://127.0.0.1:${port}/fixture?mode=${mode}&delay=${run.delayMs}`,{waitUntil:'networkidle'});
      const videoOffsetMs=performance.now()-videoStart;
      await page.locator('#show-card').click();
      await page.waitForTimeout(run.delayMs+50);
      await page.screenshot({path:`${directory}/poster.png`,animations:'allow'});
      // rAF sampling is the clock authority; screenshot latency is not used for trajectory metrics.
      await page.waitForFunction((duration)=>!!window.__motionTrace.startedAt && performance.now()-window.__motionTrace.startedAt>=duration,captureDurationMs,{timeout:10000});
      await page.evaluate(()=>window.__motionTrace.finish());
      await page.screenshot({path:`${directory}/final.png`,animations:'allow'});
      const data=await page.evaluate(()=>{
        const trace=window.__motionTrace;
        return {events:trace.events,samples:trace.samples,finalState:trace.finalState,durationMs:performance.now()-(trace.startedAt ?? performance.now())};
      });
      const domState=await page.locator('[data-motion-card]').evaluate(element=>({cardId:element.getAttribute('data-card-id'),revision:Number(element.getAttribute('data-revision')),title:element.querySelector('h2')?.textContent}));
      attachSources(data.events,sources);
      const network=networkEvidence[0];
      data.events.push({id:`${mode}-network-verified`,t:data.events.find(e=>e.type==='request-resolve')?.t ?? 0,type:'network-verified',label:'Playwright observed a real API response',origin:'runner',requestId:network?.requestId??undefined,detail:{status:network?.status ?? 0,endpoint:'/api/fixture-data',responseCount:networkEvidence.length}});
      const metrics=computeMetrics(data.events,data.samples);
      if(!data.finalState)throw new Error('Fixture did not expose final state');
      const finalState=data.finalState;
      const video=page.video();
      await context.close();
      let videoUrl:string|null=null;
      if(video){await rename(await video.path(),`${directory}/video.webm`);videoUrl=`/artifacts/runs/${run.id}/${mode}/video.webm`;}
      return {
        mode,events:data.events.sort((a,b)=>a.t-b.t),samples:data.samples,metrics,finalState,
        durationMs:Number(data.durationMs.toFixed(2)),
        media:{videoUrl,videoOffsetMs:Math.round(videoOffsetMs),posterUrl:`/artifacts/runs/${run.id}/${mode}/poster.png`,finalUrl:`/artifacts/runs/${run.id}/${mode}/final.png`,mimeType:'video/webm',durationMs:Math.round(data.durationMs+videoOffsetMs)},
        assertions:[
          {id:`${mode}-api`,label:'A real backend response was captured',passed:networkEvidence.length===1 && network?.status===200,detail:`${networkEvidence.length} request; HTTP ${network?.status ?? 'missing'}`},
          {id:`${mode}-console`,label:'Fixture has no uncaught browser errors',passed:errors.length===0,detail:errors.length?errors.join('; '):'No page errors'},
          {id:`${mode}-dom-state`,label:'DOM agrees with captured final state',passed:domState.cardId===finalState.cardId&&domState.revision===finalState.revision&&domState.title===finalState.title,detail:`${domState.cardId} / revision ${domState.revision} / ${domState.title}`},
          {id:`${mode}-samples`,label:'rAF trajectory covers the observation window',passed:data.samples.filter(validGeometry).length>=50 && data.samples.filter(validGeometry)[0]?.t<100 && data.samples.filter(validGeometry).at(-1)!.t>=captureDurationMs-50 && data.samples.filter(validGeometry).at(-1)!.opacity!>=0.999 && Math.abs(data.samples.filter(validGeometry).at(-1)!.translateX!)<0.5,detail:`${data.samples.filter(validGeometry).length} valid geometry frames sampled over ${data.samples.at(-1)?.t.toFixed(0)}ms`}
        ]
      };
    }catch(error){await context.close();throw error;}
  }
  try {
    const baseline=await captureMode('baseline'),fixed=await captureMode('fixed');
    return {...run,status:'complete',finishedAt:new Date().toISOString(),baseline,fixed,
      diagnosis:diagnose(baseline,fixed,Object.values(sources)),
      patch:{file:'src/fixture/Fixture.tsx',before:'const identityKey = card.revision;',after:'const identityKey = card.id;',diff:'- <AnimatedCard key={card.revision} card={card} />\n+ <AnimatedCard key={card.id} card={card} />',explanation:'Keep identity tied to the logical card, while revision remains ordinary state. The fixed capture executes the stable-key branch of the same fixture.',appliedToFixture:true},
      assertions:[...baseline.assertions,...fixed.assertions,...compareAssertions(baseline,fixed)],
      environment:{browser:`Chromium ${browserVersion}`,viewport:{width:960,height:640},animationDurationMs:1400,sampleClock:'performance.now() in the fixture page, relative to click',reducedMotion:'no-preference',target:'Allowlisted local key-remount fixture'}
    };
  } finally {await browser.close();}
}
