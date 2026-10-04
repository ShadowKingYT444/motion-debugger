import {chromium} from 'playwright';
import type {BrowserContext,Page} from 'playwright';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {chromiumOptions} from '../../server/browser';
import {recordingSurface,prepareRecordingPage,finalizeRecording} from '../../server/recording';
import {installBrowserProbe} from './browser-probe';
import {analyze,analyzeDelivery} from './analysis';
import {finiteGeometry,measureCoverage,targetState} from './coverage';
import {validateRecipe,validateLocalUrl,readSourceRef,recipeWarnings} from './safety';
import type {CaptureRecipe,CoreOptions,MotionCapture,MotionEvent,MotionSample,MotionContract,MotionDeliveryObservation} from './types';

const privateSelector='input[type="password"],input[autocomplete="current-password"],input[autocomplete="new-password"],input[autocomplete="cc-number"],[data-motion-private]';

/** Declarative DOM observations only. No caller scripts or application marks establish completion. */
function installOutcomeObserver(config:NonNullable<MotionContract['outcomes']>,durationMs:number) {
  const start=performance.now(),deadline=Math.min(config.timeoutMs??durationMs,durationMs);
  const forbiddenVisible:MotionDeliveryObservation['forbiddenVisible']=[],errors:string[]=[];
  let required:MotionDeliveryObservation['required']=[],actionsComplete=false;
  const sensitive='input[type="password"],input[autocomplete="current-password"],input[autocomplete="new-password"],input[autocomplete="cc-number"],[data-motion-private]';
  const visible=(element:Element)=>{
    const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
    return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.visibility!=='collapse'&&Number(style.opacity)>.01&&element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
  };
  const observe=()=>{
    const observedAtMs=performance.now()-start,next:MotionDeliveryObservation['required']=[];
    for(const expected of config.required){
      try {
        const elements=document.querySelectorAll(expected.selector),element=elements[0];
        if(element&&(element.matches(sensitive)||element.closest(sensitive)||element.querySelector(sensitive))){
          if(!errors.includes('Outcome selector references private content'))errors.push('Outcome selector references private content');continue;
        }
        const attributes:Record<string,string>={};
        if(element)for(const key of Object.keys(expected.attributes??{})){const value=element.getAttribute(key);if(value!==null)attributes[key]=value.slice(0,500);}
        const text=element?.textContent?.trim().slice(0,1000)??'',isVisible=element?visible(element):false;
        const passed=elements.length===1&&(expected.visible===undefined||expected.visible===isVisible)&&(expected.textIncludes===undefined||text.includes(expected.textIncludes))&&Object.entries(expected.attributes??{}).every(([key,value])=>attributes[key]===value);
        next.push({id:expected.id,selector:expected.selector,count:elements.length,visible:isVisible,text,attributes,observedAtMs,passed,...(!passed?{reason:elements.length!==1?`Expected exactly one match, observed ${elements.length}`:'Observable condition not satisfied'}:{})});
      }catch(error){if(!errors.includes(`Invalid outcome selector: ${expected.selector}`))errors.push(`Invalid outcome selector: ${expected.selector}`);}
    }
    // Only post-action observations made within the deadline may establish success.
    if(actionsComplete&&observedAtMs<=deadline)required=next;
    else if(actionsComplete&&observedAtMs>deadline&&next.some(item=>!item.passed)&&!errors.includes('Required final state is not satisfied'))errors.push('Required final state is not satisfied');
    for(const selector of config.forbiddenVisible??[]){
      try {
        if(forbiddenVisible.some(item=>item.selector===selector))continue;
        const element=[...document.querySelectorAll(selector)].find(visible);
        if(element){
          const privateContent=element.matches(sensitive)||!!element.closest(sensitive)||!!element.querySelector(sensitive);
          forbiddenVisible.push({selector,observedAtMs,text:privateContent?'(private content omitted)':element.textContent?.trim().slice(0,500)??''});
        }
      }catch{if(!errors.includes(`Invalid forbidden selector: ${selector}`))errors.push(`Invalid forbidden selector: ${selector}`);}
    }
  };
  const observer=new MutationObserver(observe);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
  const timer=setInterval(observe,50);observe();
  (window as any).__motionOutcomes={
    finishActions(){actionsComplete=true;observe();if(performance.now()-start>deadline)errors.push('Actions completed after the functional outcome deadline');},
    stop():MotionDeliveryObservation {observe();clearInterval(timer);observer.disconnect();return {required,forbiddenVisible,elapsedMs:performance.now()-start,errors};}
  };
}

/** An unsuccessful interaction with explicitly incomplete, privacy-checked evidence. */
export class CaptureFailureError extends Error {
  constructor(message:string,public readonly evidence:MotionCapture){super(message);this.name='CaptureFailureError'}
}

/** Native held pointer path. No DOM-dispatched input or forced hit testing. */
export async function performNativeDrag(page:Page,action:Extract<CaptureRecipe['actions'][number],{action:'drag'}>,timeoutMs:number,signal?:AbortSignal) {
  const started=performance.now(),deadline=started+timeoutMs;
  const remaining=()=>Math.max(1,deadline-performance.now());
  const check=()=>{if(signal?.aborted)throw new Error('Capture canceled during drag');if(performance.now()>=deadline)throw new Error('Drag action exceeds capture deadline');};
  if(timeoutMs<action.durationMs)throw new Error('Drag duration exceeds remaining capture deadline');
  const locator=page.locator(action.selector);
  if(await locator.count()!==1)throw new Error('Drag selector must identify exactly one element');
  if(await locator.evaluate(element=>element.matches('input[type="password"],input[autocomplete="current-password"],input[autocomplete="new-password"],input[autocomplete="cc-number"]')||!!element.closest('[data-motion-private]')))throw new Error('Credential/private-field interactions are not supported');
  const initialRect=await locator.boundingBox();
  if(!initialRect||initialRect.width<=0||initialRect.height<=0)throw new Error('Drag target must have nonzero rendered geometry');
  await locator.scrollIntoViewIfNeeded({timeout:remaining()});check();
  const rect=await locator.boundingBox(),viewport=page.viewportSize();
  if(!rect||rect.width<=0||rect.height<=0)throw new Error('Drag target must have nonzero rendered geometry');
  if(!viewport||rect.x<0||rect.y<0||rect.x+rect.width>viewport.width||rect.y+rect.height>viewport.height)throw new Error('Drag target must fit inside the capture viewport');
  const insetX=Math.min(.5,rect.width/2),insetY=Math.min(.5,rect.height/2);
  const point=(p:{x:number;y:number})=>({x:rect.x+Math.min(rect.width-insetX,Math.max(insetX,p.x*rect.width)),y:rect.y+Math.min(rect.height-insetY,Math.max(insetY,p.y*rect.height))});
  const first=point(action.points[0]);
  await locator.hover({position:{x:first.x-rect.x,y:first.y-rect.y},timeout:remaining()});check();
  const moves=Math.max(action.steps??24,action.points.length-1),segments=action.points.length-1;
  if(deadline-performance.now()<action.durationMs)throw new Error('Drag duration exceeds remaining capture deadline after target preparation');
  let held=false,dragFailed=false;
  try {
    await page.mouse.down();held=true;const pathStart=performance.now();
    // Allocate interpolation to each segment so a sharp supplied reversal cannot be skipped.
    for(let segment=0,completed=0;segment<segments;segment++){
      const count=Math.floor((segment+1)*moves/segments)-Math.floor(segment*moves/segments);
      const a=point(action.points[segment]),b=point(action.points[segment+1]);
      for(let step=1;step<=count;step++){
        check();const due=pathStart+action.durationMs*(++completed/moves),delay=due-performance.now();
        if(delay>0)await page.waitForTimeout(Math.min(delay,remaining()));check();
        await page.mouse.move(a.x+(b.x-a.x)*step/count,a.y+(b.y-a.y)*step/count);check();
      }
    }
  } catch(error) {dragFailed=true;throw error;}
  finally {if(held)try{await page.mouse.up();}catch(error){if(!dragFailed)throw error;}}
}

export async function capture(input:CaptureRecipe,options:CoreOptions):Promise<MotionCapture> {
  const recipe=validateRecipe(input,options),targetUrl=validateLocalUrl(recipe.url,options.allowedOrigins);
  const artifactRoot=path.resolve(options.artifactRoot),id=randomUUID(),directory=path.join(artifactRoot,id);
  const sources:Record<string,NonNullable<MotionEvent['source']>>={};
  for(const [key,ref]of Object.entries(recipe.sourceRefs??{}))sources[key]=await readSourceRef(ref,options.sourceRoots??[]);
  await mkdir(directory,{recursive:true});
  const viewport=recipe.viewport??{width:1440,height:960},durationMs=recipe.durationMs??2400;
  const effectiveRecipe={...recipe,durationMs,viewport};
  const browserOptions=chromiumOptions();
  const surface=recordingSurface(viewport,browserOptions.headless);
  const browser=await chromium.launch(browserOptions);
  const abort=()=>void browser.close().catch(()=>{});options.signal?.addEventListener('abort',abort,{once:true});
  let context:BrowserContext|undefined,page:Page|undefined,privacyPassed=false,stage='initialization',actionIndex:number|undefined;
  let videoOffsetMs=0,start=performance.now();
  const errors:string[]=[],blocked:{url:string;method:string}[]=[];
  let gpu='unavailable',diagnostics={devicePixelRatio:1,visibilityState:'unavailable'};
  const environment=()=>({browser:`Chromium ${browser.version()}`,browserMode:browserOptions.headless?'headless' as const:'headed' as const,viewport,diagnostics:{...diagnostics,webglRenderers:[gpu]},probeSha256:createHash('sha256').update(installBrowserProbe.toString()).digest('hex'),analyzerSha256:createHash('sha256').update([analyze,analyzeDelivery,installOutcomeObserver,measureCoverage,targetState,finiteGeometry].map(fn=>fn.toString()).join('\n')).digest('hex'),clock:'page time origin: geometry observed in a post-rAF task after app callbacks, labeled with its rAF frame timestamp; observedAtMs and geometryTimeMs record read time; displacement normalization uses the associated rAF interval; actual read gaps and lag are independently gated; superseded samples omitted; performance.now for events and supplemental WAAPI operation-boundary reads; relative to capture start',reducedMotion:recipe.reducedMotion??'no-preference'});
  try {
    if(options.signal?.aborted)throw new Error('Capture canceled');
    context=await browser.newContext({viewport,reducedMotion:recipe.reducedMotion??'no-preference',serviceWorkers:'block',recordVideo:{dir:directory,size:surface??viewport}});
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
    page=await context.newPage();stage='recording-preparation';page.on('pageerror',error=>errors.push(error.message));
    await prepareRecordingPage(page,surface);stage='navigation';
    await page.goto(targetUrl.href,{waitUntil:'networkidle',timeout:15000});
    stage='privacy-scan';
    if(await page.locator(privateSelector).count())throw new Error('Sensitive/private page content is not supported. Use a trusted credential-free development fixture.');
    privacyPassed=true;stage='probe-setup';
    // Validate selector syntax and an unambiguous initial target, without reading credentials or caller storage.
    if(await page.locator(recipe.selector).count()>1)throw new Error('Target selector must identify at most one element');
    gpu=await browser.newBrowserCDPSession().then(async session=>{
      try {const info=await session.send('SystemInfo.getInfo');return String(info.gpu.auxAttributes?.glRenderer??'unavailable').slice(0,300);}
      finally {await session.detach();}
    }).catch(()=> 'unavailable');
    diagnostics=await page.evaluate(()=>({devicePixelRatio:window.devicePixelRatio,visibilityState:document.visibilityState}));
    await page.screenshot({path:path.join(directory,'poster.png'),animations:'allow',mask:[page.locator('input[type="password"]')]});
    if(!await page.evaluate(()=>typeof (window as any).__motionProbe?.start==='function'))throw new Error(`Motion probe initialization failed: ${errors[0]??'probe missing'}`);
    await page.evaluate(`(()=>{const __name=(value)=>value;(window).__motionProbe.start();${recipe.contract?.outcomes?`(${installOutcomeObserver.toString()})(${JSON.stringify(recipe.contract.outcomes)},${durationMs});`:''}})()`);
    videoOffsetMs=Math.round(performance.now()-videoStart);
    start=performance.now();stage='interaction';
    for(const [index,action] of recipe.actions.entries()){
      actionIndex=index;
      if(options.signal?.aborted)throw new Error('Capture canceled');
      const remaining=Math.max(0,durationMs-(performance.now()-start));
      if(remaining<=0)throw new Error('Capture deadline exceeded during interaction');
      if(action.action==='wait'){if(action.ms>remaining)throw new Error('Wait action exceeds capture deadline');await page.waitForTimeout(action.ms);continue}
      if(action.action==='drag'){await performNativeDrag(page,action,Math.max(1,Math.min(3000,durationMs-(performance.now()-start))),options.signal);continue}
      if(action.action==='move'){await page.mouse.move(action.x,action.y);continue}
      if(action.action==='scroll'){await page.mouse.wheel(0,action.deltaY);continue}
      if(action.action==='key'){await page.keyboard.press(action.key);continue}
      const locator=page.locator(action.selector);
      if(await locator.count()!==1)throw new Error('Interaction selectors must identify exactly one element');
      const sensitive=await locator.evaluate(element=>element.matches('input[type="password"],input[autocomplete="current-password"],input[autocomplete="new-password"],input[autocomplete="cc-number"]')||!!element.closest('[data-motion-private]'));
      if(sensitive){privacyPassed=false;throw new Error('Credential/private-field interactions are not supported')}
      const actionTimeout=Math.max(1,Math.min(3000,durationMs-(performance.now()-start)));
      if(action.action==='click')await locator.click({timeout:actionTimeout});else await locator.hover({timeout:actionTimeout});
    }
    if(performance.now()-start>durationMs)throw new Error('Capture deadline exceeded during interaction');
    if(recipe.contract?.outcomes)await page.evaluate(()=>{(window as any).__motionOutcomes.finishActions()});
    stage='settling';actionIndex=undefined;
    await page.waitForTimeout(Math.max(0,durationMs-(performance.now()-start)));
    stage='finalization';
    const outcomeObservation=recipe.contract?.outcomes?await page.evaluate(()=>(window as any).__motionOutcomes.stop()) as MotionDeliveryObservation:undefined;
    const delivery=analyzeDelivery(effectiveRecipe,outcomeObservation);
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
    // A dynamically introduced private field must not survive final recording flush either.
    if(await page.locator(privateSelector).count()){privacyPassed=false;throw new Error('Sensitive/private page content appeared during capture')}
    const video=page.video();await context.close();if(!video)throw new Error('Browser did not create a recording');
    if(outcomeObservation){
      for(const message of errors)delivery.reasons.push(`Uncaught page error: ${message}`);
      if(errors.length||blocked.length){delivery.status='failed';if(blocked.length)delivery.reasons.push('Forbidden network requests observed');}
    }

    stage='recording-finalization';
    let recording:Pick<MotionCapture['artifacts'],'video'|'rawVideo'|'recordingTransform'|'recordingError'>,recordingFailure:MotionCapture['failure'];
    try{recording=await finalizeRecording(await video.path(),directory,viewport,surface)}catch(cause){
      if(!privacyPassed||blocked.length)throw cause;
      const message=cause instanceof Error?cause.message.split('\n')[0]:'Recording finalization failed',rawVideo=path.join(directory,'video-native.webm');
      recording={video:'',...(await stat(rawVideo).then(info=>info.isFile()).catch(()=>false)?{rawVideo}:{}),recordingError:message};
      recordingFailure={stage,elapsedMs:Math.round(performance.now()-start),message};
      result.metrics.sufficientEvidence=false;
      result.assertions=result.assertions.map(assertion=>({...assertion,passed:false,status:'inconclusive',actual:'Recording did not finalize'}));
      result.assertions.push({id:'recording-completed',label:'Recording finalized',passed:false,status:'failed',actual:message,expected:'Decodable viewport video'});
    }
    const report:MotionCapture={schemaVersion:'2.0',...(recordingFailure?{status:'incomplete' as const,failure:recordingFailure}:{}),id,createdAt:new Date().toISOString(),recipe:effectiveRecipe,environment:environment(),events:data.events,samples:data.samples,...result,delivery,final,artifacts:{directory,report:path.join(directory,'report.json'),...recording,poster:path.join(directory,'poster.png'),finalScreenshot:path.join(directory,'final.png'),videoOffsetMs},limitations:['Use only trusted credential-free development pages; recordings are not automatically redacted.','Fresh browser context, no user profile, credentials or authenticated sessions are imported.','Only configured loopback origins can load resources; third-party network requests are blocked.','Frame-step, height, opacity and containment are supplied contracts, not universal motion-quality scores.','Functional delivery uses bounded post-action DOM conditions and sticky visible forbidden-state observations. It is independent of temporal quality; absent outcomes are unverified. Visibility checks do not prove unoccluded pixels or general usability. Polling is 50ms with mutation observations; an error shorter than observation coverage can escape.','Mutations are timestamped at MutationObserver delivery; recording seeks use approximate host offsets.','WAAPI cancel/start batches include supplemental before/after geometry reads after microtasks. They are not painted-frame evidence and do not increase rAF sample counts. Geometry reads may force style/layout work. CSS-only changes and old captures do not gain these boundaries.','Post-rAF tasks use MessageChannel. Geometry reads and recorder work can perturb the runner; observedAtMs, probe cost and actual gaps are reported. Visible means nonzero rendered geometry and computed visibility/opacity, not proof of unoccluded pixels.',
'CSS cancellation events and Web Animations calls are observed where available; arbitrary animation-library internals are not inferred.','Source mappings and application marks are explicitly supplied annotations.']};
    if(recordingFailure)report.limitations.push('Incomplete recording: source pixels may remain available as rawVideo, but finalization failed and contracts/comparison cannot pass.');
    if(surface)report.limitations.push('Native compositor recording retains raw source and crops padding without scaling or timing changes. Display coverage requires separate decoded-frame calibration; screen bounds alone do not establish correct pixel coverage.');
    await writeFile(report.artifacts.report,JSON.stringify(report,null,2));
    if(recordingFailure){await writeFile(path.join(directory,'failure.json'),JSON.stringify({id,status:'incomplete',...recordingFailure,artifacts:report.artifacts},null,2));throw new CaptureFailureError(recordingFailure.message,report)}
    return report;
  }catch(error){
    if(error instanceof CaptureFailureError)throw error;
    const message=error instanceof Error?error.message.split('\n')[0]:String(error);
    // Fail closed: no pixels survive a privacy/security rejection or an unreadable privacy scan.
    const retain=privacyPassed&&stage==='interaction'&&blocked.length===0&&page&&context&&
      await page.locator(privateSelector).count().then(count=>count===0).catch(()=>false);
    if(retain&&page&&context){
      const failedAction=actionIndex===undefined?undefined:recipe.actions[actionIndex];
      const failure={stage,actionIndex,action:failedAction?.action,selector:failedAction&&'selector' in failedAction?failedAction.selector:undefined,elapsedMs:Math.round(performance.now()-start),message};
      const failedOutcomeObservation=recipe.contract?.outcomes?await page.evaluate(()=>(window as any).__motionOutcomes?.stop()).catch(()=>undefined) as MotionDeliveryObservation|undefined:undefined;
      const delivery=analyzeDelivery(effectiveRecipe,failedOutcomeObservation,false);
      const data=await page.evaluate(()=>{
        const trace=(window as any).__motionProbe;try{trace?.stop()}catch{}
        return {events:trace?.events??[],samples:trace?.samples??[]};
      }).catch(()=>({events:[],samples:[]})) as {events:MotionEvent[];samples:MotionSample[]};
      for(const event of data.events){const sourceKey=event.detail.sourceKey;if(typeof sourceKey==='string'&&sources[sourceKey])event.source=sources[sourceKey]}
      const video=page.video();await context.close().catch(()=>{});
      let recording:Pick<MotionCapture['artifacts'],'video'|'rawVideo'|'recordingTransform'|'recordingError'>={video:''};
      if(video)try{recording=await finalizeRecording(await video.path(),directory,viewport,surface)}catch(cause){
        const rawVideo=path.join(directory,'video-native.webm');
        recording={video:'',...(await stat(rawVideo).then(info=>info.isFile()).catch(()=>false)?{rawVideo}:{}),recordingError:cause instanceof Error?cause.message.split('\n')[0]:'Recording finalization failed'};
      }
      const final={visible:false,attributes:{},text:'',x:null,y:null,opacity:null};
      const result=analyze(data.samples,data.events,effectiveRecipe,final);
      result.metrics.sufficientEvidence=false;
      result.assertions=result.assertions.map(assertion=>({...assertion,passed:false,status:'inconclusive',actual:'Capture did not complete'}));
      result.assertions.push({id:'capture-completed',label:'Interaction recipe completed',passed:false,status:'failed',actual:`Action ${actionIndex} failed`,expected:'All requested actions complete'});
      const report:MotionCapture={schemaVersion:'2.0',status:'incomplete',failure,id,createdAt:new Date().toISOString(),recipe:effectiveRecipe,environment:environment(),events:data.events,samples:data.samples,...result,delivery,final,artifacts:{directory,report:path.join(directory,'report.json'),...recording,poster:path.join(directory,'poster.png'),finalScreenshot:'',videoOffsetMs},limitations:['Incomplete capture: the interaction recipe failed; final state was not measured and contracts cannot pass.','Evidence is retained only after credential-free page scans pass and no network-policy rejection was observed.','A rendered visible target does not prove pointer clickability.','Video alignment is approximate. Empty artifact paths mean unavailable evidence.','Recorded samples and events describe only the observed portion; do not use an incomplete capture as a completed before/after comparison.','Opt-in native recordings retain their source and crop only viewport padding; crop metadata is not proof of pixel fidelity. Calibrate the full viewport separately.']};
      await writeFile(report.artifacts.report,JSON.stringify(report,null,2));
      await writeFile(path.join(directory,'failure.json'),JSON.stringify({id,status:'incomplete',...failure,artifacts:report.artifacts},null,2));
      throw new CaptureFailureError(message,report);
    }
    await browser.close().catch(()=>{});await rm(directory,{recursive:true,force:true});await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'failure.json'),JSON.stringify({id,status:'rejected',error:message},null,2));throw error;
  }
  finally {options.signal?.removeEventListener('abort',abort);await browser.close().catch(()=>{})}
}
export async function inspect(id:string,options:CoreOptions):Promise<MotionCapture> {
  if(!/^[a-f\d-]{36}$/.test(id))throw new Error('Capture ID must be a UUID');
  return JSON.parse(await readFile(path.join(path.resolve(options.artifactRoot),id,'report.json'),'utf8')) as MotionCapture;
}
export function compact(report:MotionCapture) {
  return {id:report.id,recipeWarnings:recipeWarnings(report.recipe),...(report.status?{status:report.status,failure:report.failure}:{}),label:report.recipe.label,url:report.recipe.url,selector:report.recipe.selector,environment:report.environment,metrics:report.metrics,coverage:report.coverage,delivery:report.delivery??analyzeDelivery(report.recipe),assertions:report.assertions,findings:report.findings,final:report.final,evidence:report.artifacts,resourceUri:`motion-evidence://capture/${report.id}`,limitations:report.limitations};
}
