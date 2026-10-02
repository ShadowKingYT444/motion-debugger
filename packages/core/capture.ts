import {chromium} from 'playwright';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {chromiumOptions} from '../../server/browser';
import {installBrowserProbe} from './browser-probe';
import {analyze} from './analysis';
import {validateRecipe,validateLocalUrl,readSourceRef} from './safety';
import type {CaptureRecipe,CoreOptions,MotionCapture,MotionEvent,MotionSample} from './types';

export async function capture(input:CaptureRecipe,options:CoreOptions):Promise<MotionCapture> {
  const recipe=validateRecipe(input,options),targetUrl=validateLocalUrl(recipe.url,options.allowedOrigins);
  const artifactRoot=path.resolve(options.artifactRoot),id=randomUUID(),directory=path.join(artifactRoot,id);
  const sources:Record<string,NonNullable<MotionEvent['source']>>={};
  for(const [key,ref]of Object.entries(recipe.sourceRefs??{}))sources[key]=await readSourceRef(ref,options.sourceRoots??[]);
  await mkdir(directory,{recursive:true});
  const viewport=recipe.viewport??{width:1440,height:960},durationMs=recipe.durationMs??2400;
  const effectiveRecipe={...recipe,durationMs,viewport};
  const browser=await chromium.launch(chromiumOptions());
  const abort=()=>void browser.close();options.signal?.addEventListener('abort',abort,{once:true});
  try {
    if(options.signal?.aborted)throw new Error('Capture canceled');
    const context=await browser.newContext({viewport,reducedMotion:recipe.reducedMotion??'no-preference',serviceWorkers:'block',recordVideo:{dir:directory,size:viewport}});
    const errors:string[]=[],blocked:{url:string;method:string}[]=[];
    const allowed=new Set([targetUrl.origin,...(options.allowedOrigins??[])]);
    await context.route('**/*',async route=>{
      const raw=route.request().url();
      try {
        const url=new URL(raw);
        if(url.protocol==='data:'||url.protocol==='blob:')return route.continue();
        validateLocalUrl(raw);
        if(!allowed.has(url.origin))throw new Error('Origin blocked');
        return route.continue();
      }catch{blocked.push({url:raw.split('?')[0].slice(0,200),method:route.request().method()});return route.abort('blockedbyclient')}
    });
    await context.routeWebSocket('**/*',socket=>{
      blocked.push({url:socket.url().split('?')[0].slice(0,200),method:'WEBSOCKET'});
      socket.close({code:1008,reason:'Motion capture blocks WebSocket connections'});
    });
    // TSX/keepNames can insert a __name helper into serialized functions. Bind that harmless naming helper locally.
    const probeConfig=JSON.stringify({selector:recipe.selector,containment:recipe.contract?.containment});
    await context.addInitScript({content:`(()=>{const __name=(value)=>value;(${installBrowserProbe.toString()})(${probeConfig});})()`});
    const videoStart=performance.now();
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(targetUrl.href,{waitUntil:'networkidle',timeout:15000});
    if(await page.locator('input[type="password"],input[autocomplete="current-password"],input[autocomplete="new-password"],input[autocomplete="cc-number"],[data-motion-private]').count())throw new Error('Sensitive/private page content is not supported. Use a trusted credential-free development fixture.');
    // Validate selector syntax and an unambiguous initial target, without reading credentials or caller storage.
    if(await page.locator(recipe.selector).count()>1)throw new Error('Target selector must identify at most one element');
    await page.screenshot({path:path.join(directory,'poster.png'),animations:'allow',mask:[page.locator('input[type="password"]')]});
    if(!await page.evaluate(()=>typeof (window as any).__motionProbe?.start==='function'))throw new Error(`Motion probe initialization failed: ${errors[0]??'probe missing'}`);
    await page.evaluate(()=>{(window as any).__motionProbe.start()});
    const videoOffsetMs=Math.round(performance.now()-videoStart);
    const start=performance.now();
    for(const action of recipe.actions){
      if(options.signal?.aborted)throw new Error('Capture canceled');
      if(action.action==='wait'){await page.waitForTimeout(action.ms);continue}
      if(action.action==='move'){await page.mouse.move(action.x,action.y);continue}
      if(action.action==='key'){await page.keyboard.press(action.key);continue}
      const locator=page.locator(action.selector);
      if(await locator.count()!==1)throw new Error('Interaction selectors must identify exactly one element');
      const sensitive=await locator.evaluate(element=>element.matches('input[type="password"],input[autocomplete="current-password"],input[autocomplete="new-password"],input[autocomplete="cc-number"]')||!!element.closest('[data-motion-private]'));
      if(sensitive)throw new Error('Credential/private-field interactions are not supported');
      if(action.action==='click')await locator.click({timeout:3000});else await locator.hover({timeout:3000});
    }
    await page.waitForTimeout(Math.max(0,durationMs-(performance.now()-start)));
    await page.evaluate(()=>{(window as any).__motionProbe.stop()});
    await page.screenshot({path:path.join(directory,'final.png'),animations:'allow',mask:[page.locator('input[type="password"]')]});
    const data=await page.evaluate(()=>{
      const trace=(window as any).__motionProbe;return {events:trace.events,samples:trace.samples};
    }) as {events:MotionEvent[];samples:MotionSample[]};
    const finalSelector=recipe.contract?.final?.selector??recipe.selector;
    const final=await page.locator(finalSelector).first().evaluate(element=>{
      const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
      const attributes:Record<string,string>={};
      for(const attribute of [...element.attributes])if((/^(data-|aria-)/.test(attribute.name)||['open','disabled','hidden','role'].includes(attribute.name))&&!/private|secret|token|password|credential/i.test(attribute.name))attributes[attribute.name]=attribute.value.slice(0,500);
      return {visible:rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&Number(style.opacity)>.01,attributes,text:element.textContent?.trim().slice(0,1000)??'',x:rect.x,y:rect.y,opacity:Number(style.opacity)};
    }).catch(()=>({visible:false,attributes:{},text:'',x:null,y:null,opacity:null}));
    for(const event of data.events){const sourceKey=event.detail.sourceKey;if(typeof sourceKey==='string'&&sources[sourceKey])event.source=sources[sourceKey]}
    const result=analyze(data.samples,data.events,effectiveRecipe,final);
    result.assertions.push({id:'browser-errors',label:'No uncaught page errors',passed:errors.length===0,actual:errors.join('; ').slice(0,500)||'none',expected:'none'});
    result.assertions.push({id:'network-policy',label:'No forbidden network requests',passed:blocked.length===0,actual:String(blocked.length),expected:'0 outside configured local origins'});
    const video=page.video();await context.close();if(!video)throw new Error('Browser did not create a recording');await rename(await video.path(),path.join(directory,'video.webm'));
    const report:MotionCapture={schemaVersion:'2.0',id,createdAt:new Date().toISOString(),recipe:effectiveRecipe,environment:{browser:`Chromium ${browser.version()}`,viewport,clock:'page time origin: geometry observed in a post-rAF task after app callbacks, labeled with its rAF frame timestamp; observedAtMs records read time; superseded samples omitted; performance.now for events and supplemental WAAPI operation-boundary reads; relative to capture start',reducedMotion:recipe.reducedMotion??'no-preference'},events:data.events,samples:data.samples,...result,final,artifacts:{directory,report:path.join(directory,'report.json'),video:path.join(directory,'video.webm'),poster:path.join(directory,'poster.png'),finalScreenshot:path.join(directory,'final.png'),videoOffsetMs},limitations:['Use only trusted credential-free development pages; recordings are not automatically redacted.','Fresh browser context, no user profile, credentials or authenticated sessions are imported.','Only configured loopback origins can load resources; third-party network requests are blocked.','Frame-step, height, opacity and containment are supplied contracts, not universal motion-quality scores.','Mutations are timestamped at MutationObserver delivery; recording seeks use approximate host offsets.','WAAPI cancel/start batches include supplemental before/after geometry reads after microtasks. They are not painted-frame evidence and do not increase rAF sample counts. Geometry reads may force style/layout work. CSS-only changes and old captures do not gain these boundaries.','CSS cancellation events and Web Animations calls are observed where available; arbitrary animation-library internals are not inferred.','Source mappings and application marks are explicitly supplied annotations.']};
    await writeFile(report.artifacts.report,JSON.stringify(report,null,2));return report;
  }catch(error){await browser.close();await rm(directory,{recursive:true,force:true});await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'failure.json'),JSON.stringify({id,error:error instanceof Error?error.message.split('\n')[0]:String(error)},null,2));throw error}
  finally {options.signal?.removeEventListener('abort',abort);await browser.close()}
}
export async function inspect(id:string,options:CoreOptions):Promise<MotionCapture> {
  if(!/^[a-f\d-]{36}$/.test(id))throw new Error('Capture ID must be a UUID');
  return JSON.parse(await readFile(path.join(path.resolve(options.artifactRoot),id,'report.json'),'utf8')) as MotionCapture;
}
export function compact(report:MotionCapture) {
  return {id:report.id,label:report.recipe.label,url:report.recipe.url,selector:report.recipe.selector,metrics:report.metrics,assertions:report.assertions,findings:report.findings,final:report.final,evidence:report.artifacts,resourceUri:`motion-evidence://capture/${report.id}`,limitations:report.limitations};
}
