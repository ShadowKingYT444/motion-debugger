import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const root=process.cwd(),requestFile=process.argv[2];
if(!requestFile)throw Error('A committed study request is required');
const request=JSON.parse(await readFile(requestFile,'utf8'));
const project=path.resolve(request.project),output=path.resolve('artifacts/study',request.arm,request.phase);
if(!project.startsWith(path.join(root,'studies')+path.sep)||!['baseline','treatment'].includes(request.arm)||!['initial','final'].includes(request.phase))throw Error('Invalid owned-study scope');
await mkdir(output,{recursive:true});
const ledger=[];const record=(kind,data)=>{ledger.push({at:new Date().toISOString(),kind,...data});console.log(`[${request.arm}/${request.phase}] ${kind}${data.name?' '+data.name:''}${data.status?' '+data.status:''}`)};
let app,browser,client;let appLog='';
try {
 for(const args of [['ci','--no-audit','--no-fund'],['run','build']]){
  const result=spawnSync('npm',args,{cwd:project,encoding:'utf8',timeout:180000});record('command',{command:'npm',args,status:result.status,stdout:result.stdout,stderr:result.stderr});
  if(result.status!==0)throw Error(`App command failed: npm ${args.join(' ')}`);
 }
 const port=4200,origin=`http://127.0.0.1:${port}`;
 app=spawn('npm',['run','preview','--','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:project,stdio:['ignore','pipe','pipe'],detached:true});
 app.stdout.on('data',x=>appLog+=String(x));app.stderr.on('data',x=>appLog+=String(x));
 for(let i=0;;i++){try{if((await fetch(origin)).ok)break}catch{}if(i>120||app.exitCode!==null)throw Error('Owned app did not become ready');await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:path.join(output,'videos'),size:{width:1440,height:1000}},serviceWorkers:'block'});
 const blocked=[];await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return route.continue();blocked.push(u.origin+u.pathname);return route.abort()});
 const page=await context.newPage();const errors=[],consoleMessages=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleMessages.push({type:m.type(),text:m.text()})});
 const checks=[];
 for(const [width,height] of [[1440,1000],[390,844],[320,720]]){
  await page.setViewportSize({width,height});await page.goto(origin,{waitUntil:'networkidle'});await page.waitForTimeout(1000);
  const geometry=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,headings:[...document.querySelectorAll('h1')].map(x=>x.textContent),canvases:[...document.querySelectorAll('canvas')].map(x=>({width:x.width,height:x.height,displayWidth:x.getBoundingClientRect().width,displayHeight:x.getBoundingClientRect().height}))}));
  checks.push({name:`${width}px layout`,passed:geometry.scrollWidth<=width+1,observed:geometry});
  await page.screenshot({path:path.join(output,`layout-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin,{waitUntil:'networkidle'});await page.waitForTimeout(500);
 const selectors=request.selectors||{};
 async function click(selector){await page.locator(selector).click({timeout:5000})}
 for(const step of request.actions||[]){
  try{
   if(step.action==='click')await click(step.selector);
   else if(step.action==='key')await page.keyboard.press(step.key);
   else if(step.action==='wait')await page.waitForTimeout(Math.min(step.ms,5000));
   else if(step.action==='drag') {const box=await page.locator(step.selector).boundingBox();if(!box)throw Error('No drag target');await page.mouse.move(box.x+box.width*.35,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55,{steps:12});await page.mouse.up();}
   else throw Error('Unknown ordinary browser action');
   if(step.screenshot)await page.screenshot({path:path.join(output,step.screenshot+'.png')});
   const observed=await page.evaluate(s=>Object.fromEntries(Object.entries(s).map(([key,selector])=>[key,[...document.querySelectorAll(selector)].map(e=>({text:e.textContent,attributes:Object.fromEntries([...e.attributes].map(a=>[a.name,a.value])),rect:{x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}}))])),selectors);
   record('browser-action',{step,status:'completed',observed});
  }catch(error){checks.push({name:`action ${step.action}`,passed:false,error:String(error),step});record('browser-action',{step,status:'failed',error:String(error)});}
 }
 if(selectors.canvas){
  try{const canvas=page.locator(selectors.canvas);const a=await canvas.screenshot();await page.waitForTimeout(337);const b=await canvas.screenshot();await writeFile(path.join(output,'canvas-frame-a.png'),a);await writeFile(path.join(output,'canvas-frame-b.png'),b);checks.push({name:'two canvas observations',observed:{different:createHash('sha256').update(a).digest('hex')!==createHash('sha256').update(b).digest('hex')},note:'Pixel difference is evidence only, not a pass/fail motion-quality score'});}catch(error){checks.push({name:'canvas observation',passed:false,error:String(error)});}
 }
 // Shared semantic observations; app-provided state is labelled, not treated as independent truth.
 const observeState=()=>page.evaluate(s=>({activeElement:document.activeElement?.id||document.activeElement?.tagName,appAnnotatedState:window.__aer?.getState?.()??null,canvasDataset:document.querySelector(s.canvas)?.dataset?{...document.querySelector(s.canvas).dataset}:null,powerPressed:document.querySelector(s.power)?.getAttribute('aria-pressed'),drawerOpen:document.querySelector(s.drawer)?.open??null,rectangles:Object.fromEntries(Object.entries(s).map(([key,selector])=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return [key,r?{x:r.x,y:r.y,width:r.width,height:r.height}:null]})),overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'&&(r.left<-.5||r.right>innerWidth+.5)}).slice(0,30).map(e=>({tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className:'',left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}),selectors);
 async function observed(name,fn){try{await fn();record('shared-observation',{name,status:'observed',value:await observeState()});}catch(error){record('shared-observation',{name,status:'error',error:String(error)})}}
 await page.goto(origin,{waitUntil:'networkidle'});await page.waitForTimeout(2000);
 await observed('resources at two seconds',async()=>{});await page.waitForTimeout(6000);await observed('resources at eight seconds',async()=>{});
 await observed('power off and settle',async()=>{await click(selectors.power);await page.waitForTimeout(4000)});
 await page.waitForTimeout(500);await observed('power off angle followup',async()=>{});
 await observed('select high while off',async()=>{await page.locator(selectors.speeds).nth(2).click();await page.waitForTimeout(150)});
 await observed('power on and settle',async()=>{await click(selectors.power);await page.waitForTimeout(2200)});
 await observed('focus canvas',async()=>{await page.locator(selectors.canvas).focus()});
 for(const key of ['ArrowLeft','ArrowLeft','ArrowLeft','ArrowUp','ArrowUp','Home','Space','Tab'])await observed(`keyboard ${key}`,async()=>{await page.keyboard.press(key)});
 await observed('desktop orbit out and back',async()=>{const box=await page.locator(selectors.canvas).boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5-120,box.y+box.height*.5,{steps:12});await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5,{steps:12});await page.mouse.up();await page.screenshot({path:path.join(output,'orbit-roundtrip.png')})});
 await observed('open drawer focus',async()=>{await click(selectors.open)});await observed('escape focus restoration',async()=>{await page.keyboard.press('Escape')});
 for(let i=0;i<10;i++)await observed(`drawer repetition ${i+1}`,async()=>{await click(selectors.open);await click(selectors.close)});
 await page.setViewportSize({width:320,height:1000});await page.waitForTimeout(1000);
 await observed('320px overflow and touch orbit',async()=>{const box=await page.locator(selectors.canvas).boundingBox();const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});const x=box.x+box.width*.4,y=box.y+box.height*.5;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*10,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.screenshot({path:path.join(output,'touch-orbit-320.png'),fullPage:true})});
 await page.setViewportSize({width:1440,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(700);await page.screenshot({path:path.join(output,'reduced-motion.png')});
 await observed('reduced motion at 700ms',async()=>{});await page.waitForTimeout(1000);await observed('reduced motion at 1700ms',async()=>{});
 const dom=await page.locator('body').innerText();await writeFile(path.join(output,'visible-text.txt'),dom);
 await writeFile(path.join(output,'ordinary-browser.json'),JSON.stringify({checks,errors,consoleMessages,blocked,scope:'Ordinary browser observations, identical harness for both arms. Missing pass fields are observations, not successes.'},null,2));
 await context.close();await browser.close();browser=undefined;
 if(request.arm==='treatment'&&Array.isArray(request.motion)&&request.motion.length){
  client=new Client({name:'paired-study-tool-bridge',version:'1.0.0'});
  await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'build/mcp/index.js')],cwd:root,env:{PATH:process.env.PATH||'',HOME:process.env.HOME||'',MOTION_ARTIFACT_DIR:path.resolve('artifacts/study',request.arm,'motion'),MOTION_ALLOWED_ORIGINS:origin,MOTION_SOURCE_ROOTS:project},stderr:'pipe'}));
  for(const [index,item] of request.motion.entries()){
   const recipe={...item.recipe,url:origin+(item.path||'/')};
   const capture=await client.callTool({name:'motion_capture',arguments:{recipe}},undefined,{timeout:45000});record('motion_capture',{request:recipe,response:capture.structuredContent||capture});
   await writeFile(path.join(output,`motion-${index}-response.json`),JSON.stringify(capture,null,2));
   if(!capture.isError&&capture.structuredContent?.id){
    const inspection=await client.callTool({name:'motion_inspect',arguments:{captureId:capture.structuredContent.id,includeSamples:true,...(item.inspectWindow||{})}});
    record('motion_inspect',{captureId:capture.structuredContent.id,response:inspection.structuredContent||inspection});
    await writeFile(path.join(output,`motion-${index}-inspection.json`),JSON.stringify(inspection.structuredContent||inspection,null,2));
    if(request.phase==='final'&&request.comparePhase==='initial'){
     const previous=JSON.parse(await readFile(path.resolve('artifacts/study',request.arm,'initial',`motion-${index}-response.json`),'utf8'));
     if(previous.structuredContent?.id){const compared=await client.callTool({name:'motion_compare',arguments:{beforeId:previous.structuredContent.id,afterId:capture.structuredContent.id}});record('motion_compare',{response:compared.structuredContent||compared});await writeFile(path.join(output,`motion-${index}-comparison.json`),JSON.stringify(compared.structuredContent||compared,null,2));}
    }
    const frames=await client.callTool({name:'motion_frames',arguments:{captureId:capture.structuredContent.id,...(item.timestampsMs?{timestampsMs:item.timestampsMs}:{})}},undefined,{timeout:45000});
    const metadata=frames.structuredContent||frames;record('motion_frames',{captureId:capture.structuredContent.id,response:metadata});
    await writeFile(path.join(output,`motion-${index}-frames.json`),JSON.stringify(metadata,null,2));
   }
  }
 }
 record('completed',{arm:request.arm,phase:request.phase});
} catch(error){record('runner-failure',{error:String(error)});process.exitCode=1}
finally {await client?.close();await browser?.close();if(app?.pid){try{process.kill(-app.pid,'SIGTERM')}catch{}}await writeFile(path.join(output,'app.log'),appLog);await writeFile(path.join(output,'execution.json'),JSON.stringify({request,ledger},null,2));}
