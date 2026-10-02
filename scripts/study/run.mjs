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
const ledger=[];const record=(kind,data)=>ledger.push({at:new Date().toISOString(),kind,...data});
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
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(700);await page.screenshot({path:path.join(output,'reduced-motion.png')});
 const dom=await page.locator('body').innerText();await writeFile(path.join(output,'visible-text.txt'),dom);
 await writeFile(path.join(output,'ordinary-browser.json'),JSON.stringify({checks,errors,consoleMessages,blocked,scope:'Ordinary browser observations, identical harness for both arms. Missing pass fields are observations, not successes.'},null,2));
 await context.close();
 if(request.arm==='treatment'&&Array.isArray(request.motion)&&request.motion.length){
  client=new Client({name:'paired-study-tool-bridge',version:'1.0.0'});
  await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'build/mcp/index.js')],cwd:root,env:{PATH:process.env.PATH||'',HOME:process.env.HOME||'',MOTION_ARTIFACT_DIR:path.join(output,'motion'),MOTION_ALLOWED_ORIGINS:origin,MOTION_SOURCE_ROOTS:project},stderr:'pipe'}));
  for(const [index,item] of request.motion.entries()){
   const recipe={...item.recipe,url:origin+(item.path||'/')};
   const capture=await client.callTool({name:'motion_capture',arguments:{recipe}},undefined,{timeout:45000});record('motion_capture',{request:recipe,response:capture.structuredContent||capture});
   await writeFile(path.join(output,`motion-${index}-response.json`),JSON.stringify(capture,null,2));
   if(!capture.isError&&capture.structuredContent?.id){
    const frames=await client.callTool({name:'motion_frames',arguments:{captureId:capture.structuredContent.id,...(item.timestampsMs?{timestampsMs:item.timestampsMs}:{})}},undefined,{timeout:45000});
    const metadata=frames.structuredContent||frames;record('motion_frames',{captureId:capture.structuredContent.id,response:metadata});
    await writeFile(path.join(output,`motion-${index}-frames.json`),JSON.stringify(metadata,null,2));
   }
  }
 }
 record('completed',{arm:request.arm,phase:request.phase});
} catch(error){record('runner-failure',{error:String(error)});process.exitCode=1}
finally {await client?.close();await browser?.close();if(app?.pid){try{process.kill(-app.pid,'SIGTERM')}catch{}}await writeFile(path.join(output,'app.log'),appLog);await writeFile(path.join(output,'execution.json'),JSON.stringify({request,ledger},null,2));}
