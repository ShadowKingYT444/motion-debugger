import {createServer,type Server} from 'node:http';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,type Browser,type BrowserContext,type Page} from 'playwright';
import {chromiumOptions} from '../../server/browser';
import {validateLocalUrl} from './safety';
import {critiqueInitScript,critiqueSectionMotionScript,critiqueSectionsScript,critiqueStaticScript,critiqueVisibilitySampleScript} from './critique-probe';

// motion critique: a provider-neutral visual + motion lint for a local page. It records what
// actually moved (Web Animations, CSS transitions, inline-style JS motion), how it was timed and
// eased, whether motion reaches the whole page, whether interactive elements answer hover/focus,
// and the classic premium-UI failures (stuck-invisible reveals, overflow, contrast, jank). It also
// renders contact sheets so a multimodal agent can look at the real page. Heuristic, not taste.

export type Severity='blocker'|'major'|'minor'|'polish';
export interface CritiqueFinding {id:string;severity:Severity;area:'motion'|'interaction'|'layout'|'visual'|'accessibility'|'runtime';title:string;evidence:string;fix:string}
export interface RecordedAnimation {id:number;phase:string;kind:string;name:string;target:string;duration:number;delay:number;iterations:number|'infinite';easing:string;properties:string[];keyframeEasings:string[];seenAt:number;docTop:number|null;inView:boolean|null;onHovered?:boolean}
export interface CritiqueOptions {outDir?:string;viewports?:Array<'desktop'|'mobile'>;reducedMotion?:boolean;hover?:boolean;offline?:boolean;allowedOrigins?:string[];signal?:AbortSignal}
export interface CritiqueReport {
  url:string;createdAt:string;score:number;grade:string;findings:CritiqueFinding[];
  motion:{animations:number;byPhase:Record<string,number>;easings:Record<string,number>;durations:{p10:number;median:number;p90:number}|null;properties:Record<string,number>;entranceSpanMs:number|null;entranceStartGroups:number;jsMotionMutations:number;sectionCoverage:{sections:number;withMotion:number;missing:string[]};hover:{tested:number;responsive:number;animated:number;silent:string[]};focus:{tested:number;visible:number};reducedMotion:{rule:boolean;runningLongAnimations:number;hiddenAfterScroll:number}|null;frameStats:{scrollFrames:number;over32ms:number;over50ms:number;p95Ms:number}|null;layoutShift:number;longAnimationFrames:number};
  pages:Record<string,unknown>;images:Record<string,string>;notes:string[];
}

const DESKTOP={width:1440,height:900},MOBILE={width:390,height:844};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.mp4':'video/mp4','.webm':'video/webm','.ico':'image/x-icon','.txt':'text/plain'};

/** Serve a local folder on loopback so a plain static build can be critiqued without a dev server. */
export async function serveStatic(target:string):Promise<{url:string;close:()=>Promise<void>}> {
  const info=await stat(target);const root=info.isDirectory()?path.resolve(target):path.dirname(path.resolve(target));const entry=info.isDirectory()?'index.html':path.basename(target);
  const server:Server=createServer(async(request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url??'/','http://x').pathname);let file=path.resolve(root,'.'+(pathname==='/'?'/'+entry:pathname));
      if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end();return}
      if((await stat(file).catch(()=>null))?.isDirectory())file=path.join(file,'index.html');
      const body=await readFile(file);response.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]??'application/octet-stream','cache-control':'no-store'}).end(body);
    }catch{response.writeHead(404).end('Not found')}
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw new Error('Static server failed to bind');
  return {url:`http://127.0.0.1:${address.port}/`,close:()=>new Promise(resolve=>server.close(()=>resolve()))};
}

const quantile=(values:number[],q:number)=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(q*(sorted.length-1)+.5))]};
export function classifyEasing(easing:string):'linear'|'default-ease'|'ease-in'|'ease-out'|'ease-in-out'|'custom-curve'|'spring-or-steps' {
  const value=easing.trim();
  if(value==='linear')return 'linear';if(value==='ease')return 'default-ease';if(value==='ease-in')return 'ease-in';if(value==='ease-out')return 'ease-out';if(value==='ease-in-out')return 'ease-in-out';
  if(value.startsWith('linear(')||value.startsWith('steps'))return 'spring-or-steps';
  const bezier=value.match(/cubic-bezier\(([^)]+)\)/);
  if(bezier){const [x1,,x2]=bezier[1].split(',').map(Number);if(x1>=.5&&x2>=.9)return 'ease-in';return 'custom-curve'}
  return 'custom-curve';
}
const hoverInfoScript=`(() => { const el = document.querySelector('[data-mc-h]'); const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
  const sig = el.localName + '.' + [...el.classList].sort().join('.') + '|' + ((el.closest('nav,header,footer') || {}).localName || 'body');
  return { sig, visible: r.width > 8 && r.height > 8 && s.visibility !== 'hidden' && Number(s.opacity) > .1, label: (el.textContent || el.getAttribute('aria-label') || el.localName).trim().replace(/\\s+/g, ' ').slice(0, 32) }; })()`;
const hoverSnapshotScript=`(() => { const el = document.querySelector('[data-mc-h]'); if (!el) return '';
  const pick = (s) => [s.transform, s.backgroundColor, s.color, s.boxShadow, s.opacity, s.borderColor, s.textDecorationLine, s.outlineColor, s.backgroundImage, s.backgroundSize, s.textDecorationColor, s.width, s.letterSpacing, s.filter, s.scale, s.translate].join('|');
  const all = [el, ...el.querySelectorAll('*')].slice(0, 30);
  return all.map(node => pick(getComputedStyle(node)) + pick(getComputedStyle(node, '::before')) + pick(getComputedStyle(node, '::after'))).join('#') + '@' + (el.parentElement ? pick(getComputedStyle(el.parentElement)) : ''); })()`;
const layoutProperty=/^(width|height|top|left|right|bottom|margin|padding|inset|font-size|max-height|max-width|min-height)/i;

async function contactSheet(browser:Browser,frames:Array<{label:string;png:Buffer}>,columns:number,cellWidth:number,file:string,title:string) {
  if(!frames.length)return;
  const page=await browser.newPage({viewport:{width:columns*(cellWidth+16)+16,height:400},deviceScaleFactor:1});
  try{
    const cells=frames.map(frame=>`<figure><img src="data:image/jpeg;base64,${frame.png.toString('base64')}"><figcaption>${frame.label.replace(/[<&]/g,'')}</figcaption></figure>`).join('');
    await page.setContent(`<!doctype html><style>body{margin:0;padding:16px;background:#111;color:#ddd;font:13px/1.3 system-ui,sans-serif}h1{font-size:15px;margin:0 0 12px;font-weight:600}main{display:grid;grid-template-columns:repeat(${columns},${cellWidth}px);gap:16px}figure{margin:0}img{width:100%;display:block;border:1px solid #333;border-radius:4px}figcaption{padding-top:5px;color:#aaa}</style><h1>${title.replace(/[<&]/g,'')}</h1><main>${cells}</main>`);
    await page.waitForFunction(()=>[...document.images].every(image=>image.complete));
    await page.screenshot({path:file,fullPage:true,type:'png'});
  }finally{await page.close()}
}

async function newPage(browser:Browser,viewport:{width:number;height:number},options:CritiqueOptions,extra:{reducedMotion?:'reduce'|'no-preference';isMobile?:boolean}={}):Promise<{context:BrowserContext;page:Page;external:Set<string>;failed:string[]}> {
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:extra.reducedMotion??'no-preference',isMobile:extra.isMobile,hasTouch:extra.isMobile,serviceWorkers:'block'});
  const external=new Set<string>(),failed:string[]=[];
  await context.route('**/*',route=>{
    const request=route.request();const url=new URL(request.url());
    if(['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.protocol==='data:'||url.protocol==='blob:')return route.continue();
    external.add(url.origin);
    // Fonts, styles, scripts and images may come from a CDN in ordinary local development. Anything
    // that could send data (non-GET, fetch/XHR, sockets) stays blocked, as does everything with --offline.
    const passive=['font','stylesheet','script','image','media'].includes(request.resourceType())&&request.method()==='GET';
    return passive&&!options.offline?route.continue():route.abort('blockedbyclient');
  });
  await context.addInitScript({content:critiqueInitScript});
  const page=await context.newPage();
  page.on('pageerror',error=>failed.push(`pageerror: ${error.message.slice(0,240)}`));
  page.on('console',message=>{if(message.type()==='error')failed.push(`console: ${message.text().slice(0,240)}`)});
  page.on('requestfailed',request=>{const reason=request.failure()?.errorText??'';if(!reason.includes('BLOCKED_BY_CLIENT')&&!reason.includes('blockedbyclient'))failed.push(`request failed: ${request.url().slice(0,160)} ${reason}`)});
  return {context,page,external,failed};
}
const sampleVisibility=(page:Page):Promise<unknown>=>page.evaluate(critiqueVisibilitySampleScript).catch(()=>0);
// Same-origin external scripts count too: most pages check matchMedia from a separate file.
const reducedMotionInScripts=(page:Page)=>page.evaluate(`Promise.all([...document.scripts].filter(s => s.src && new URL(s.src).origin === location.origin).map(s => fetch(s.src).then(r => r.text()).catch(() => ''))).then(texts => texts.some(t => /prefers-reduced-motion/.test(t)))`).catch(()=>false) as Promise<boolean>;
const setPhase=(page:Page,phase:string)=>page.evaluate(`window.__mc&&(window.__mc.phase=${JSON.stringify(phase)})`);
const shot=async(page:Page,file?:string)=>page.screenshot({type:'jpeg',quality:72,...(file?{path:file}:{})});

async function smoothScroll(page:Page,to:number,sample=false) {
  const from=await page.evaluate('scrollY') as number;const distance=to-from;const steps=Math.max(1,Math.ceil(Math.abs(distance)/120));
  // Optional sampling every ~360px catches scroll-linked states that sit between settled stops.
  for(let index=0;index<steps;index++){await page.mouse.wheel(0,distance/steps);await sleep(16);if(sample&&index%3===2)await page.evaluate(critiqueVisibilitySampleScript).catch(()=>0)}
}

/** Record a page like a visitor would: entrance, a full scroll, hovers and keyboard focus. */
export async function critique(rawTarget:string,options:CritiqueOptions={}):Promise<CritiqueReport> {
  let served:{url:string;close:()=>Promise<void>}|undefined;let target=rawTarget;
  if(!/^https?:\/\//.test(rawTarget)){served=await serveStatic(rawTarget);target=served.url}
  validateLocalUrl(target,served?[]:options.allowedOrigins);
  const outDir=path.resolve(options.outDir??path.join('.motion-critique',new Date().toISOString().replace(/[:.]/g,'-')));
  await mkdir(path.join(outDir,'frames'),{recursive:true});
  const browser=await chromium.launch(chromiumOptions());
  const findings:CritiqueFinding[]=[];const notes:string[]=[];const images:Record<string,string>={};const pages:Record<string,unknown>={};
  const add=(finding:CritiqueFinding)=>findings.push(finding);
  let animations:RecordedAnimation[]=[];let mutations:Record<string,{count:number;layout:number;motion:number;elements:Record<string,number>}>={};
  let coverage={sections:0,withMotion:0,missing:[] as string[]};let hover={tested:0,responsive:0,animated:0,silent:[] as string[]};let focus={tested:0,visible:0};
  let frameStats:CritiqueReport['motion']['frameStats']=null;let reducedHidden:Array<{selector:string;text:string}>=[];let layoutShift=0,longFrames=0;let reduced:CritiqueReport['motion']['reducedMotion']=null;
  const runtimeErrors=new Set<string>();const externalOrigins=new Set<string>();
  try{
    // ---------- desktop: entrance, scroll, hover, focus ----------
    if((options.viewports??['desktop','mobile']).includes('desktop')){
      const {context,page,external,failed}=await newPage(browser,DESKTOP,options);
      try{
        const started=Date.now();
        await page.goto(target,{waitUntil:'commit',timeout:20000});
        const entrance:Array<{label:string;png:Buffer}>=[];
        for(const at of [80,250,500,850,1300,2000,3000]){
          const wait=at-(Date.now()-started);if(wait>0)await sleep(wait);
          const elapsed=Date.now()-started;const png=await shot(page,path.join(outDir,'frames',`desktop-entrance-${String(elapsed).padStart(4,'0')}ms.jpg`));entrance.push({label:`t≈${elapsed} ms`,png});
        }
        await page.waitForLoadState('load',{timeout:10000}).catch(()=>notes.push('Desktop load event did not fire within 10 s'));
        await sleep(600);await sampleVisibility(page);
        const sections=await page.evaluate(critiqueSectionsScript) as Array<{index:number;tag:string;id:string;cls:string;top:number;height:number}>;
        await setPhase(page,'scroll');
        const docHeight=await page.evaluate('document.scrollingElement.scrollHeight') as number;
        const stops:number[]=[];for(let y=Math.round(DESKTOP.height*.75);y<docHeight-DESKTOP.height*.5;y+=Math.round(DESKTOP.height*.75))stops.push(y);
        const sampled=stops.length>11?Array.from({length:11},(_,i)=>stops[Math.round(i*(stops.length-1)/10)]):stops;
        const scrollFrames:Array<{label:string;png:Buffer}>=[{label:'top (after entrance)',png:entrance[entrance.length-1].png}];
        let previous=0;
        for(const y of sampled){
          // Scroll through intermediate stops too, so scroll-linked effects see continuous input.
          await smoothScroll(page,y,true);await sleep(700);
          const actual=await page.evaluate('Math.round(scrollY)') as number;if(actual===previous&&y>previous+50){notes.push(`Scrolling stalled at ${actual}px (page may hijack or lock scroll)`);break}previous=actual;
          await sampleVisibility(page);
          scrollFrames.push({label:`scrollY ${actual}px`,png:await shot(page,path.join(outDir,'frames',`desktop-scroll-${String(actual).padStart(5,'0')}.jpg`))});
        }
        await smoothScroll(page,docHeight,true);await sleep(700);await sampleVisibility(page);
        const sectionMotion=await page.evaluate(critiqueSectionMotionScript) as Array<{index:number;animated:number;classChanged:number}>;
        coverage={sections:sections.length,withMotion:sectionMotion.filter(item=>item.animated+item.classChanged>0).length,missing:sections.filter(section=>{const found=sectionMotion.find(item=>item.index===section.index);return !found||found.animated+found.classChanged===0}).map(section=>`${section.tag}${section.id?'#'+section.id:''}${section.cls?'.'+section.cls:''} (y=${section.top})`)};
        const staticDesktop=await page.evaluate(critiqueStaticScript) as any;pages.desktop=staticDesktop;
        if(!staticDesktop.reducedMotionRule&&await reducedMotionInScripts(page))staticDesktop.reducedMotionRule=true;
        await setPhase(page,'hover');
        await page.evaluate('scrollTo(0,0)');await sleep(500);
        if(options.hover!==false){
          const candidates=await page.$$('a[href],button,[role=button],input[type=submit],summary');
          const seen=new Set<string>();const crops:Array<{label:string;png:Buffer}>=[];
          for(const handle of candidates){
            if(hover.tested>=12)break;
            await page.evaluate(`document.querySelectorAll('[data-mc-h]').forEach(el => el.removeAttribute('data-mc-h'))`);
            if(!await handle.evaluate(el=>{el.setAttribute('data-mc-h','1');return true}).catch(()=>false))continue;
            const info=await page.evaluate(hoverInfoScript).catch(()=>null) as {sig:string;visible:boolean;label:string}|null;
            if(!info||!info.visible||seen.has(info.sig))continue;seen.add(info.sig);
            try{
              await handle.scrollIntoViewIfNeeded({timeout:1500});await page.mouse.move(2,2);await sleep(250);
              const snapshot=()=>page.evaluate(hoverSnapshotScript) as Promise<string>;
              const before=await snapshot();const box=await handle.boundingBox();if(!box)continue;
              const pad=24;const clip={x:Math.max(0,box.x-pad),y:Math.max(0,box.y-pad),width:Math.min(DESKTOP.width-Math.max(0,box.x-pad),box.width+pad*2),height:Math.min(DESKTOP.height-Math.max(0,box.y-pad),box.height+pad*2)};
              const beforePng=clip.width>4&&clip.height>4&&crops.length<12?await page.screenshot({type:'jpeg',quality:80,clip}):null;
              const count=await page.evaluate('window.__mc.anims.length') as number;// only animations on the hovered control count as its feedback
              await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:4});await sleep(420);
              const after=await snapshot();const animated=await page.evaluate(`window.__mc.anims.slice(${count}).some(a => a.onHovered)`) as boolean;
              if(beforePng&&crops.length<12)crops.push({label:`${info.label} — rest`,png:beforePng},{label:`${info.label} — hover`,png:await page.screenshot({type:'jpeg',quality:80,clip})});
              hover.tested++;if(before!==after)hover.responsive++;else hover.silent.push(info.label||info.sig);if(animated)hover.animated++;
            }catch{/* detached or obscured controls are skipped rather than counted */}
          }
          await page.mouse.move(2,2);
          await contactSheet(browser,crops,4,320,path.join(outDir,'hover.png'),'Hover states (rest → hover), desktop');if(crops.length)images.hover='hover.png';
        }
        // keyboard focus visibility
        await page.evaluate('scrollTo(0,0); document.activeElement && document.activeElement.blur && document.activeElement.blur()');
        for(let index=0;index<8;index++){
          await page.keyboard.press('Tab');await sleep(120);
          const visible=await page.evaluate(`(() => { const el = document.activeElement; if (!el || el === document.body) return null; const s = getComputedStyle(el); const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0; const ring = s.boxShadow && s.boxShadow !== 'none'; return outline || ring || el.matches(':focus-visible') && s.outlineStyle === 'auto'; })()`);
          if(visible===null)break;focus.tested++;if(visible)focus.visible++;
        }
        const state=await page.evaluate('({anims: window.__mc.anims, mutations: window.__mc.mutations, frames: window.__mc.frames, shifts: window.__mc.shifts, longFrames: window.__mc.longFrames, errors: window.__mc.errors})') as any;
        animations=state.anims;mutations=state.mutations;layoutShift=state.shifts;longFrames=state.longFrames;for(const error of state.errors)runtimeErrors.add(error);
        const scrollTimes=(state.frames as Array<[string,number]>).filter(frame=>frame[0]==='scroll').map(frame=>frame[1]);const deltas=scrollTimes.slice(1).map((time,index)=>time-scrollTimes[index]).filter(delta=>delta<500);
        if(deltas.length>30)frameStats={scrollFrames:deltas.length,over32ms:deltas.filter(delta=>delta>32).length,over50ms:deltas.filter(delta=>delta>50).length,p95Ms:Math.round(quantile(deltas,.95)*10)/10};
        await contactSheet(browser,entrance,4,340,path.join(outDir,'desktop-entrance.png'),`Desktop entrance timeline (1440×900) — ${target}`);images.desktopEntrance='desktop-entrance.png';
        await contactSheet(browser,scrollFrames,4,340,path.join(outDir,'desktop-scroll.png'),'Desktop scroll journey (each frame ~700 ms after a smooth wheel scroll)');images.desktopScroll='desktop-scroll.png';
        await page.screenshot({path:path.join(outDir,'desktop-full.jpg'),fullPage:true,type:'jpeg',quality:60}).catch(()=>{});images.desktopFull='desktop-full.jpg';
        for(const item of failed)runtimeErrors.add(item);for(const origin of external)externalOrigins.add(origin);
        notes.push(`Desktop journey took ${Math.round((Date.now()-started)/100)/10}s`);
      }finally{await context.close()}
    }
    // ---------- mobile ----------
    if((options.viewports??['desktop','mobile']).includes('mobile')){
      const {context,page,failed}=await newPage(browser,MOBILE,options,{isMobile:true});
      try{
        await page.goto(target,{waitUntil:'load',timeout:20000});await sleep(1800);await sampleVisibility(page);
        const frames:Array<{label:string;png:Buffer}>=[{label:'first viewport',png:await shot(page,path.join(outDir,'frames','mobile-0.jpg'))}];
        const height=await page.evaluate('document.scrollingElement.scrollHeight') as number;
        const stops=[.2,.4,.6,.8].map(fraction=>Math.round(fraction*(height-MOBILE.height)));
        for(const y of stops){await page.evaluate(`scrollTo(0,${y})`);await sleep(250);await smoothScroll(page,y+200,true);await sleep(700);await sampleVisibility(page);frames.push({label:`scrollY ≈${y+200}px`,png:await shot(page,path.join(outDir,'frames',`mobile-${y+200}.jpg`))})}
        await sampleVisibility(page);
        await page.evaluate('scrollTo(0, document.scrollingElement.scrollHeight)');await sleep(700);await sampleVisibility(page);
        pages.mobile=await page.evaluate(critiqueStaticScript);
        await page.evaluate('scrollTo(0,0)');await sleep(300);
        await contactSheet(browser,frames,5,240,path.join(outDir,'mobile.png'),'Mobile (390×844) — first viewport and scroll positions');images.mobile='mobile.png';
        for(const item of failed)runtimeErrors.add(item);
      }finally{await context.close()}
    }
    // ---------- reduced motion ----------
    if(options.reducedMotion!==false){
      const {context,page}=await newPage(browser,DESKTOP,options,{reducedMotion:'reduce'});
      try{
        await page.goto(target,{waitUntil:'load',timeout:20000});await sleep(1500);
        const height=await page.evaluate('document.scrollingElement.scrollHeight') as number;
        for(let y=0;y<height;y+=DESKTOP.height*.8){await page.evaluate(`scrollTo(0,${Math.round(y)})`);await sleep(450);await sampleVisibility(page)}
        await sleep(600);
        const running=await page.evaluate(`document.getAnimations().filter(a => { const t = a.effect && a.effect.getComputedTiming(); if (!t) return false; const kf = a.effect.getKeyframes ? a.effect.getKeyframes() : []; const moves = kf.some(f => 'transform' in f || 'translate' in f || 'rotate' in f || 'scale' in f || 'left' in f || 'top' in f); return a.playState === 'running' && moves && (t.iterations === Infinity || Number(t.duration) > 250); }).length`) as number;
        const statics=await page.evaluate(critiqueStaticScript) as any;
        reducedHidden=statics.hidden??[];reduced={rule:!!(pages.desktop as any)?.reducedMotionRule||statics.reducedMotionRule||await reducedMotionInScripts(page),runningLongAnimations:running,hiddenAfterScroll:statics.hiddenCount};
      }finally{await context.close()}
    }
  }finally{await browser.close();await served?.close()}

  // ---------- analysis ----------
  const ui=animations.filter(anim=>anim.iterations!=='infinite'&&anim.duration>0&&anim.duration<=4000);
  const easings:Record<string,number>={};for(const anim of ui){const kind=anim.keyframeEasings.length&&anim.easing==='linear'?classifyEasing(anim.keyframeEasings[0]):classifyEasing(anim.easing);easings[kind]=(easings[kind]??0)+1}
  const properties:Record<string,number>={};for(const anim of animations)for(const property of anim.properties)properties[property]=(properties[property]??0)+1;
  const durations=ui.map(anim=>anim.duration);
  const byPhase:Record<string,number>={};for(const anim of animations)byPhase[anim.phase]=(byPhase[anim.phase]??0)+1;
  const jsMotion=Object.values(mutations).reduce((sum,bucket)=>sum+bucket.motion,0);
  const load=animations.filter(anim=>anim.phase==='load'&&anim.iterations!=='infinite');
  const starts=[...new Set(load.map(anim=>Math.round((anim.seenAt+anim.delay)/40)))];
  const entranceSpan=load.length?Math.max(...load.map(anim=>anim.seenAt+anim.delay+anim.duration))-Math.min(...load.map(anim=>anim.seenAt+anim.delay)):null;
  const desktop=pages.desktop as any,mobile=pages.mobile as any;
  const loadJs=mutations.load?.motion??0;

  // motion presence and choreography
  if(!animations.length&&jsMotion<5)add({id:'no-motion',severity:'blocker',area:'motion',title:'Nothing on the page moves',evidence:'No Web Animations, CSS transitions/animations or inline-style transform/opacity changes were observed during load, scroll or hover.',fix:'Add an entrance sequence for the hero (headline lines/words rising 16–32px with opacity, 60–90ms stagger, 600–900ms each, ease-out-expo cubic-bezier(.16,1,.3,1)), scroll reveals for each section, and hover/press feedback on every control.'});
  else{
    if(!load.length&&loadJs<5)add({id:'no-entrance',severity:'major',area:'motion',title:'The first viewport has no entrance choreography',evidence:'No animation started during the first ~3 s after navigation.',fix:'Sequence the hero: eyebrow → headline (split by line or word, masked rise) → subcopy → CTAs → visual. Stagger 60–100ms, 600–1000ms each, ease-out-expo. Keep the total under ~1.6s so the page feels fast.'});
    else if(load.length>=3&&starts.length<=1)add({id:'entrance-not-staggered',severity:'major',area:'motion',title:'Entrance animations all start at once',evidence:`${load.length} load animations share one start time; nothing leads the eye.`,fix:'Give the entrance an order of importance: offset successive elements by 50–100ms (CSS `animation-delay: calc(var(--i) * 70ms)` or a JS stagger) so the headline lands first and supporting elements follow.'});
    if(entranceSpan!==null&&entranceSpan>2600)add({id:'entrance-too-slow',severity:'minor',area:'motion',title:'Entrance sequence is long',evidence:`Load animations span ${Math.round(entranceSpan)} ms.`,fix:'Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.'});
    if(coverage.sections>=3&&coverage.withMotion/coverage.sections<.5)add({id:'motion-stops-after-hero',severity:'major',area:'motion',title:'Motion does not reach most of the page',evidence:`${coverage.withMotion}/${coverage.sections} top-level sections showed any motion when scrolled into view. Static: ${coverage.missing.slice(0,5).join(', ')}.`,fix:'Give each section a reveal tied to its content: titles rise with a mask, cards/grid items stagger in (40–80ms apart), numbers count up, images scale from 1.06→1 with a clip/opacity reveal. Trigger with IntersectionObserver (threshold ~0.2, once) or CSS `animation-timeline: view()`.'});
    else if(coverage.sections>=3&&coverage.withMotion<coverage.sections)add({id:'sections-without-motion',severity:'polish',area:'motion',title:'Some sections are static',evidence:`Static on scroll: ${coverage.missing.slice(0,5).join(', ')}.`,fix:'Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.'});
    const linear=ui.filter(anim=>(anim.keyframeEasings.length?classifyEasing(anim.keyframeEasings[0]):classifyEasing(anim.easing))==='linear'&&anim.properties.some(property=>/transform|translate|scale|rotate|top|left|clip/.test(property))&&anim.duration>=150);
    const generic=ui.filter(anim=>['default-ease'].includes(classifyEasing(anim.easing))&&!anim.keyframeEasings.length);
    if(ui.length>=3&&linear.length/ui.length>.3)add({id:'linear-movement',severity:'major',area:'motion',title:'Movement uses linear easing',evidence:`${linear.length}/${ui.length} UI animations move with linear timing, e.g. ${linear.slice(0,3).map(anim=>anim.target).join('; ')}.`,fix:'Linear motion reads mechanical. Use ease-out for entrances (cubic-bezier(.16,1,.3,1) or (.22,1,.36,1)), ease-in-out for on-screen moves (cubic-bezier(.65,0,.35,1)), and springs for interactive retargeting. Keep linear for marquees, progress and continuous rotation only.'});
    if(ui.length>=6&&generic.length/ui.length>.6)add({id:'default-easing',severity:'minor',area:'motion',title:'Most motion uses the browser default `ease`',evidence:`${generic.length}/${ui.length} animations use the unspecified default curve.`,fix:'Define motion tokens once (e.g. --ease-out: cubic-bezier(.16,1,.3,1); --ease-in-out: cubic-bezier(.65,0,.35,1); --dur-1: 160ms; --dur-2: 280ms; --dur-3: 600ms; --dur-4: 900ms) and use them everywhere so the page has one recognizable motion voice.'});
    const easeInEntrances=ui.filter(anim=>anim.phase!=='hover'&&classifyEasing(anim.easing)==='ease-in'&&anim.duration>=200);
    if(easeInEntrances.length>=2)add({id:'ease-in-entrance',severity:'minor',area:'motion',title:'Elements enter with ease-in',evidence:`${easeInEntrances.length} reveal animations accelerate into their resting place (e.g. ${easeInEntrances[0].target}).`,fix:'Arriving elements should decelerate (ease-out); reserve ease-in for elements leaving the screen.'});
    const layoutAnimated=animations.filter(anim=>anim.properties.some(property=>layoutProperty.test(property))&&anim.duration>=120);
    const layoutJs=Object.values(mutations).reduce((sum,bucket)=>sum+bucket.layout,0);
    if(layoutAnimated.length>=2||layoutJs>40)add({id:'layout-properties-animated',severity:'minor',area:'motion',title:'Layout properties are animated',evidence:`${layoutAnimated.length} animations/transitions on ${[...new Set(layoutAnimated.flatMap(anim=>anim.properties.filter(property=>layoutProperty.test(property))))].slice(0,5).join(', ')||'layout'}; ${layoutJs} inline-style layout writes.`,fix:'Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.'});
    const slowHover=animations.filter(anim=>anim.phase==='hover'&&anim.onHovered&&anim.duration>600&&anim.iterations!=='infinite');
    if(slowHover.length>=2)add({id:'slow-hover',severity:'minor',area:'interaction',title:'Hover feedback is sluggish',evidence:`${slowHover.length} hover transitions last over 600 ms (e.g. ${slowHover[0].target}: ${Math.round(slowHover[0].duration)} ms).`,fix:'Hover/press feedback should start immediately and settle in 150–300ms; longer feels laggy under the pointer.'});
    const tooFast=ui.filter(anim=>anim.phase!=='hover'&&anim.duration>0&&anim.duration<120&&anim.properties.some(property=>/transform|opacity/.test(property)));
    if(tooFast.length>=4)add({id:'reveals-too-fast',severity:'polish',area:'motion',title:'Some reveals are too quick to register',evidence:`${tooFast.length} non-hover animations under 120 ms.`,fix:'Content reveals read best at 500–900ms with ease-out; micro-feedback 120–250ms.'});
    const infinite=animations.filter(anim=>anim.iterations==='infinite');
    const infiniteTargets=new Set(infinite.map(anim=>anim.target));
    if(infiniteTargets.size>6)add({id:'too-much-ambient-motion',severity:'minor',area:'motion',title:'Many elements loop forever',evidence:`${infiniteTargets.size} distinct elements run infinite animations.`,fix:'Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.'});
  }
  if(hover.tested>=3&&hover.responsive/hover.tested<.7)add({id:'controls-without-hover',severity:'major',area:'interaction',title:'Interactive elements give no hover feedback',evidence:`${hover.tested-hover.responsive}/${hover.tested} distinct controls did not change on hover: ${hover.silent.slice(0,6).join(', ')}.`,fix:'Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.'});
  else if(hover.tested>=3&&hover.responsive>0&&hover.animated/hover.responsive<.5)add({id:'hover-snaps',severity:'minor',area:'interaction',title:'Hover states snap instead of transitioning',evidence:`${hover.responsive} controls change on hover but only ${hover.animated} animate the change.`,fix:'Add `transition: transform .2s var(--ease-out), background-color .2s, box-shadow .2s` (name properties; avoid `all`) so state changes feel physical.'});
  if(focus.tested>=3&&focus.visible/focus.tested<.6)add({id:'focus-invisible',severity:'major',area:'accessibility',title:'Keyboard focus is not visible',evidence:`${focus.tested-focus.visible}/${focus.tested} tabbed elements showed no outline or focus ring.`,fix:'Style :focus-visible with a clear ring (outline: 2px solid var(--accent); outline-offset: 3px). Never remove outlines without a replacement.'});
  if(desktop?.hiddenCount>0)add({id:'stuck-invisible',severity:'blocker',area:'motion',title:'Content stays invisible after scrolling the whole page',evidence:`${desktop.hiddenCount} text/image elements still have opacity≈0 after a full scroll: ${desktop.hidden.slice(0,4).map((item:any)=>`${item.selector} "${item.text}"`).join('; ')}.`,fix:'A reveal never fired. Check the IntersectionObserver targets/threshold (use threshold ≤0.15 and a negative bottom rootMargin, not 1.0), that every hidden element gets observed, and gate the hidden initial state behind a class added by JS (`.js [data-reveal]{opacity:0}`) so content is never lost if script fails.'});
  if(reduced){
    if(!reduced.rule)add({id:'no-reduced-motion',severity:'major',area:'accessibility',title:'No prefers-reduced-motion handling',evidence:'No `prefers-reduced-motion` media query or script check was found.',fix:'Add `@media (prefers-reduced-motion: reduce)` that removes travel/parallax/scrub motion and loops, keeping short opacity fades so content still appears. In JS, check matchMedia before starting scroll-linked or looping motion.'});
    else if(reduced.runningLongAnimations>2)add({id:'reduced-motion-ignored',severity:'minor',area:'accessibility',title:'Movement continues with reduced motion requested',evidence:`${reduced.runningLongAnimations} moving animations still run with prefers-reduced-motion: reduce.`,fix:'Under reduced motion, stop loops and large transforms; use opacity-only transitions.'});
    if(reduced.hiddenAfterScroll>0&&!(desktop?.hiddenCount>0))add({id:'reduced-motion-hides-content',severity:'blocker',area:'accessibility',title:'Reduced-motion visitors lose content',evidence:`${reduced.hiddenAfterScroll} elements stay invisible when prefers-reduced-motion is set: ${reducedHidden.slice(0,4).map(item=>`${item.selector} "${item.text}"`).join('; ')}.`,fix:'The reduced-motion branch skips the code that reveals content. Make elements visible by default under reduced motion instead of skipping the reveal.'});
  }
  if(frameStats&&frameStats.scrollFrames>60&&frameStats.over50ms/frameStats.scrollFrames>.08)add({id:'scroll-jank',severity:'major',area:'runtime',title:'Scrolling drops frames',evidence:`${frameStats.over50ms}/${frameStats.scrollFrames} frames took >50 ms during scroll (p95 ${frameStats.p95Ms} ms, headless Chromium).`,fix:'Avoid scroll handlers that read layout and write styles each event; use transforms on composited layers, IntersectionObserver or CSS scroll-driven animations, and limit blur/backdrop-filter on large or many elements.'});
  if(layoutShift>.1)add({id:'layout-shift',severity:'major',area:'layout',title:'Layout shifts while loading',evidence:`Cumulative layout shift ${layoutShift.toFixed(3)}.`,fix:'Reserve space for images/media (width/height or aspect-ratio), load fonts with metric-matched fallbacks, and animate entrances with transform rather than inserting space.'});
  if(desktop?.overflowX>1)add({id:'desktop-overflow',severity:'major',area:'layout',title:'Desktop page scrolls horizontally',evidence:`Document is ${desktop.overflowX}px wider than the viewport: ${desktop.wide.map((item:any)=>item.selector).slice(0,3).join(', ')}.`,fix:'Contain decorative/offscreen elements with overflow: clip on their section, and avoid 100vw widths alongside a scrollbar.'});
  if(mobile){
    if(mobile.overflowX>1)add({id:'mobile-overflow',severity:'blocker',area:'layout',title:'Mobile page scrolls sideways',evidence:`At 390px the document is ${mobile.overflowX}px too wide; offenders: ${mobile.wide.map((item:any)=>`${item.selector} (right ${item.right}px)`).slice(0,4).join(', ')}.`,fix:'Make grids collapse (minmax(0,1fr)), let long words wrap (overflow-wrap:anywhere for headings), clamp display type with clamp(), and set overflow-x: clip on sections with off-canvas decoration.'});
    if(mobile.hiddenCount>0&&!(desktop?.hiddenCount>0))add({id:'mobile-stuck-invisible',severity:'blocker',area:'motion',title:'Content stays invisible on mobile',evidence:`${mobile.hiddenCount} elements never revealed at 390px: ${mobile.hidden.slice(0,3).map((item:any)=>item.selector).join('; ')}.`,fix:'Reveal thresholds that work on desktop can fail for tall mobile elements; use threshold ≤0.1 or rootMargin instead of a large visible fraction.'});
    if(mobile.clipped.length)add({id:'mobile-clipped-text',severity:'major',area:'layout',title:'Text is clipped on mobile',evidence:`Overflowing: ${mobile.clipped.join(', ')}.`,fix:'Use fluid type (clamp()) and allow wrapping; never set overflow:hidden on a heading container sized for desktop.'});
    if(mobile.smallTargets.length>=3)add({id:'small-tap-targets',severity:'minor',area:'accessibility',title:'Tap targets are small on mobile',evidence:mobile.smallTargets.slice(0,4).map((item:any)=>`${item.selector} ${item.w}×${item.h}`).join(', '),fix:'Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).'});
    if(mobile.smallText>2)add({id:'small-mobile-text',severity:'minor',area:'visual',title:'Body text is small on mobile',evidence:`${mobile.smallText} paragraphs under 14px at 390px.`,fix:'Keep body copy ≥16px on phones.'});
  }
  if(desktop){
    if(desktop.contrastFailures>=3)add({id:'low-contrast',severity:'major',area:'accessibility',title:'Text contrast is too low',evidence:`${desktop.contrastFailures}/${desktop.contrastChecked} checked text elements fail WCAG AA, e.g. ${desktop.contrast.slice(0,3).map((item:any)=>`"${item.text}" ${item.ratio}:1`).join(', ')}.`,fix:'Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.'});
    else if(desktop.contrastFailures>0)add({id:'some-low-contrast',severity:'polish',area:'accessibility',title:'A few text elements have low contrast',evidence:desktop.contrast.slice(0,3).map((item:any)=>`"${item.text}" ${item.ratio}:1`).join(', '),fix:'Raise contrast of these elements to at least 4.5:1.'});
    const families=Object.entries(desktop.families as Record<string,number>).sort((a,b)=>b[1]-a[1]);
    const primary=families[0]?.[0]??'';
    if(/^(Times New Roman|Times|serif|Arial|Helvetica|sans-serif|DejaVu Sans|DejaVu Serif|Liberation Serif|Liberation Sans)$/i.test(primary))add({id:'default-typeface',severity:'minor',area:'visual',title:'Typography falls back to a generic default face',evidence:`Most text renders in ${primary}.`,fix:'Choose a deliberate type pairing (a characterful display face + a neutral text face) or a refined system stack (ui-sans-serif, "Inter", "SF Pro Text", system-ui) — and verify the font actually loads.'});
    if(families.length>4)add({id:'too-many-typefaces',severity:'polish',area:'visual',title:'Too many typefaces',evidence:families.map(entry=>entry[0]).slice(0,6).join(', '),fix:'Use one or two families; create hierarchy with size, weight and spacing.'});
    if(desktop.h1Size&&desktop.bodySize&&desktop.h1Size/desktop.bodySize<2.4)add({id:'weak-hierarchy',severity:'minor',area:'visual',title:'Headline hierarchy is timid',evidence:`h1 is ${desktop.h1Size}px against ${desktop.bodySize}px body text (${(desktop.h1Size/desktop.bodySize).toFixed(1)}×).`,fix:'Premium marketing pages usually set the hero headline at 3.5–6× body size (clamp(2.75rem, 6vw, 5.5rem)) with tight tracking (-0.02 to -0.04em) and line-height ~1.0–1.1.'});
    if(!desktop.h1Size)add({id:'no-h1',severity:'minor',area:'accessibility',title:'Page has no h1',evidence:'No <h1> element found.',fix:'Give the hero headline an <h1>.'});
    if(desktop.longLines.length>=2)add({id:'long-lines',severity:'polish',area:'visual',title:'Paragraph line length is too long',evidence:desktop.longLines.slice(0,3).join(', '),fix:'Cap reading measure at ~60–75 characters (max-width: 62ch).'});
    if(desktop.clipped.length)add({id:'desktop-clipped-text',severity:'minor',area:'layout',title:'Text is clipped on desktop',evidence:desktop.clipped.join(', '),fix:'Allow wrapping or enlarge the container.'});
  }
  const errors=[...runtimeErrors].filter(error=>!/favicon/.test(error));
  if(errors.length)add({id:'runtime-errors',severity:errors.some(error=>error.startsWith('pageerror'))?'major':'minor',area:'runtime',title:'The page logs errors',evidence:errors.slice(0,4).join(' | '),fix:'Fix script errors first — a thrown error often stops the animation code that follows it.'});
  if(externalOrigins.size)notes.push(`External origins requested: ${[...externalOrigins].join(', ')}${options.offline?' (blocked by --offline)':' (passive font/style/script/image GETs allowed; anything else blocked)'}`);

  const weights:Record<Severity,number>={blocker:22,major:11,minor:5,polish:2};
  const score=Math.max(0,100-findings.reduce((sum,finding)=>sum+weights[finding.severity],0));
  const grade=score>=90?'A':score>=78?'B':score>=62?'C':score>=45?'D':'F';
  const order:Severity[]=['blocker','major','minor','polish'];findings.sort((a,b)=>order.indexOf(a.severity)-order.indexOf(b.severity));
  const report:CritiqueReport={url:served?rawTarget:target,createdAt:new Date().toISOString(),score,grade,findings,
    motion:{animations:animations.length,byPhase,easings,durations:durations.length?{p10:Math.round(quantile(durations,.1)),median:Math.round(quantile(durations,.5)),p90:Math.round(quantile(durations,.9))}:null,properties,entranceSpanMs:entranceSpan===null?null:Math.round(entranceSpan),entranceStartGroups:starts.length,jsMotionMutations:jsMotion,sectionCoverage:coverage,hover,focus,reducedMotion:reduced,frameStats,layoutShift:Math.round(layoutShift*1000)/1000,longAnimationFrames:longFrames},
    pages,images,notes};
  await writeFile(path.join(outDir,'report.json'),JSON.stringify({...report,animations:animations.slice(0,400)},null,2));
  await writeFile(path.join(outDir,'report.md'),critiqueMarkdown(report,outDir));
  return {...report,images:Object.fromEntries(Object.entries(images).map(([key,file])=>[key,path.join(outDir,file)]))};
}

export function critiqueMarkdown(report:CritiqueReport,outDir:string):string {
  const m=report.motion;const lines=[`# Motion critique — ${report.grade} (${report.score}/100)`,'',`Target: ${report.url}`,'',
    '## Look at the page first','',...Object.entries(report.images).map(([key,file])=>`- ${key}: ${path.isAbsolute(file)?file:path.join(outDir,file)}`),'','Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.','',
    '## Findings',''];
  if(!report.findings.length)lines.push('No lint findings. Now raise the craft: review the contact sheets against the premium-motion checklist.','');
  for(const finding of report.findings)lines.push(`### [${finding.severity}] ${finding.title}`,`- Evidence: ${finding.evidence}`,`- Fix: ${finding.fix}`,'');
  lines.push('## Motion profile','',`- Animations observed: ${m.animations} (${Object.entries(m.byPhase).map(([phase,count])=>`${phase} ${count}`).join(', ')||'none'}); inline-style JS motion writes: ${m.jsMotionMutations}`,
    `- Easing mix: ${Object.entries(m.easings).map(([kind,count])=>`${kind} ${count}`).join(', ')||'n/a'}`,`- Durations: ${m.durations?`p10 ${m.durations.p10} ms · median ${m.durations.median} ms · p90 ${m.durations.p90} ms`:'n/a'}`,
    `- Entrance: ${m.entranceSpanMs===null?'none':`${m.entranceSpanMs} ms span, ${m.entranceStartGroups} distinct start times`}`,`- Sections with motion on scroll: ${m.sectionCoverage.withMotion}/${m.sectionCoverage.sections}`,
    `- Hover: ${m.hover.responsive}/${m.hover.tested} controls respond, ${m.hover.animated} animate · Focus visible: ${m.focus.visible}/${m.focus.tested}`,
    `- Reduced motion: ${m.reducedMotion?`${m.reducedMotion.rule?'handled':'not handled'}; ${m.reducedMotion.runningLongAnimations} moving animations still running`:'not tested'}`,
    `- Scroll frames: ${m.frameStats?`${m.frameStats.over50ms}/${m.frameStats.scrollFrames} over 50 ms, p95 ${m.frameStats.p95Ms} ms (headless; indicative)`:'n/a'} · CLS ${m.layoutShift}`,'');
  if(report.notes.length)lines.push('## Notes','',...report.notes.map(note=>`- ${note}`),'');
  return lines.join('\n');
}
