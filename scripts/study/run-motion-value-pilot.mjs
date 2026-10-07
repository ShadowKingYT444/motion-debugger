// Nine-session native-host pilot. Hidden action values live only in this process until generation ends.
import {createHash,randomInt} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {cp,mkdir,mkdtemp,readFile,readdir,rename,rm,stat,symlink,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {snapshotSource,sha256} from './source-snapshot.mjs';
import {equivalentOutcome,summarizeFunction,validateActionEffects,validateExport,validateMotionObservations,validatePublicState,validateRelationship} from './motion-value-evaluator.mjs';

const root=process.cwd();
const argv=process.argv.slice(2);
const arg=name=>argv[argv.indexOf(name)+1];
const packagePath=path.resolve(arg('--package')??'');
const codex=arg('--codex')??'/home/terryd/.bello/runtime/native-codex/ba27107574789187a147e3a3caa159e0f5d435bd071759be623fe5745c5bdc07/bin/codex';
const budgetSeconds=Number(arg('--budget-seconds')??900);
if(!packagePath||!Number.isFinite(budgetSeconds)||budgetSeconds<60||budgetSeconds>900)throw Error('Use --package <packed tgz> [--codex <binary>] [--budget-seconds 60..900]');
await stat(packagePath);await stat(codex);
const stamp=new Date().toISOString().replaceAll(':','-');
const runDir=path.join(root,'artifacts/motion-value-pilot',stamp);await mkdir(runDir,{recursive:true});
const inputs=JSON.parse(await readFile(path.join(root,'studies/motion-value-pilot/TASKS.json'),'utf8'));
const arms=[{id:'ordinary',label:'strong ordinary tools'},{id:'construction',label:'identical construction materials, no runtime feedback'},{id:'motion',label:'full installed Motion plugin'}];
const digest=async file=>sha256(await readFile(file));
const json=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n');
const run=(command,args,cwd=root,timeout=120000)=>execFileSync(command,args,{cwd,encoding:'utf8',timeout});
const self=fileURLToPath(import.meta.url);
const packageSha=await digest(packagePath);
const taskFiles=['TASKS.json',...inputs.tasks.flatMap(task=>[`assets/${task.id}.svg`,`contracts/${task.id}.md`])];
const inputHashes=Object.fromEntries(await Promise.all(taskFiles.map(async name=>[name,await digest(path.join(root,'studies/motion-value-pilot',name))])));
const firstProduct=randomInt(0,3);
const heldOut={schemaVersion:1,field:{modeOrder:randomInt(2)?['#mode-a','#mode-b','#mode-a']:['#mode-b','#mode-a','#mode-b'],waveSteps:randomInt(3,8),scroll:[randomInt(55,76),randomInt(8,31),randomInt(72,94)]},commerce:{products:[firstProduct,(firstProduct+randomInt(1,3))%3],filters:randomInt(2)?['#filter-a','#filter-b','#filter-a']:['#filter-b','#filter-a','#filter-b'],variants:randomInt(2)?['#variant-a','#variant-b']:['#variant-b','#variant-a'],cartToggles:randomInt(2,5)},creative:{selections:randomInt(2)?['#select-a','#select-b','#select-a']:['#select-b','#select-a','#select-b'],playheadSteps:randomInt(3,9),zoomClicks:randomInt(1,4)}};
const heldOutCommitment=sha256(Buffer.from(JSON.stringify(heldOut)));
const configuredSettings=JSON.parse(run('python3',['-c',"import os,json,tomllib;from pathlib import Path;p=Path(os.environ.get('CODEX_HOME',str(Path.home()/'.codex')))/'config.toml';d=tomllib.loads(p.read_text()) if p.exists() else {};profile=d.get('profile');s={**d,**d.get('profiles',{}).get(profile,{})};print(json.dumps({'model':s.get('model'),'reasoningEffort':s.get('model_reasoning_effort'),'profile':profile,'mcpNames':sorted(s.get('mcp_servers',{}).keys())}))"]));
if(configuredSettings.mcpNames.some(name=>/motion/i.test(name)))throw Error('Global configuration already exposes Motion; cannot isolate ordinary arms');
const protocol={schemaVersion:2,status:'preregistered',createdAt:new Date().toISOString(),scope:'3 tasks x 3 arms x 1 repetition; exploratory/confounded cohort unless construction bytes below are identical',sessionWallBudgetSeconds:budgetSeconds,serialGeneration:true,serialBrowserGrading:true,arms,tasks:inputs.tasks.map(({id,title,prompt})=>({id,title,promptSha256:sha256(Buffer.from(prompt))})),inputHashes,scaffoldVersion:'blank-static-v1',dependencyLockSha256:await digest(path.join(root,'package-lock.json')),package:{path:path.relative(root,packagePath),sha256:packageSha},runnerSha256:await digest(self),heldOutActionCommitmentSha256:heldOutCommitment,heldOutValues:'withheld in evaluator process until all nine final source snapshots are frozen',nativeHost:{cliVersion:run(codex,['--version']).trim(),configuredSettings,modelOverride:null,providerWireIdentity:'unverified'},browser:{executable:process.env.CHROMIUM_PATH??'/usr/bin/google-chrome',playwrightVersion:JSON.parse(await readFile(path.join(root,'node_modules/playwright/package.json'),'utf8')).version},thresholds:{requiredViewportWidths:[1280,390],cadenceGateMs:80,creativeOverlay:'center and size deltas <= max(4px, 10% selected-object diagonal)'},moneyCost:'unknown',humanPreference:'unverified',globalConfigurationChanged:false};
await json(path.join(runDir,'PRE_REGISTRATION.json'),protocol);

const runtime=path.join(runDir,'installed-package');await mkdir(runtime);
run('tar',['-xzf',packagePath,'-C',runtime]);
await symlink(path.join(root,'node_modules'),path.join(runtime,'package/node_modules'));
const binary=path.join(runtime,'package/build/cli/index.js');
const frozenSkills=path.join(runtime,'package/plugin/motion-debugger/skills'),constructionManifest=await snapshotSource(frozenSkills);protocol.constructionMaterials={source:'same packed tarball used by full arm',digest:constructionManifest.digest,files:constructionManifest.files};await json(path.join(runDir,'PRE_REGISTRATION.json'),protocol);
const runnerSource=path.join(runDir,'runner-source');await mkdir(runnerSource);
for(const file of ['audit-mcp.mjs','source-snapshot.mjs','motion-value-evaluator.mjs','run-motion-value-pilot.mjs'])await cp(path.join(root,'scripts/study',file),path.join(runnerSource,file));

const scaffold=task=>({
 'index.html':`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${task.title}</title><link rel="stylesheet" href="style.css"></head><body><main id="app"><h1>${task.title}</h1><p>Build this interface from the frozen brief.</p></main><script src="app.js"></script></body></html>\n`,
 'style.css':'*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:system-ui,sans-serif}body{background:#111;color:#f7f7f2}\n',
 'app.js':'// Blank shared application scaffold.\n',
 'server.mjs':`import{createServer}from'node:http';import{readFile}from'node:fs/promises';import path from'node:path';const port=Number(process.env.PILOT_PORT);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};createServer(async(req,res)=>{try{const p=path.join(process.cwd(),req.url==='/'?'index.html':decodeURIComponent(req.url));if(!p.startsWith(process.cwd()))throw Error();const b=await readFile(p);res.setHeader('Content-Type',types[path.extname(p)]??'application/octet-stream');res.end(b)}catch{res.writeHead(404);res.end('Not found')}}).listen(port,'127.0.0.1',()=>console.log('READY '+port));\n`,
 'AGENTS.md':`Complete the supplied local static application autonomously. Do not fetch remote resources, read outside this workspace, inspect evaluator code, or use other agents. Keep an initial working checkpoint in INITIAL_CHECKPOINT/ once the app first works. Use the supplied asset and public contract. You may use the local Playwright dependency and /usr/bin/google-chrome for ordinary browser inspection. Start the app with PILOT_PORT=$PILOT_PORT node server.mjs. Do not modify TASK.md, CONTRACT.md, asset.svg, or INITIAL_CHECKPOINT after creating it.\n`
});
const workspaces=[];
for(let ti=0;ti<inputs.tasks.length;ti++)for(let ai=0;ai<arms.length;ai++){
 const task=inputs.tasks[ti],arm=arms[ai],id=`${task.id}-${arm.id}`;
 const workspace=await mkdtemp(path.join(os.tmpdir(),`motion-pilot-${id}-`));
 const files=scaffold(task);for(const [name,value]of Object.entries(files))await writeFile(path.join(workspace,name),value);
 await cp(path.join(root,'studies/motion-value-pilot/assets',`${task.id}.svg`),path.join(workspace,'asset.svg'));
 await writeFile(path.join(workspace,'TASK.md'),`# ${task.title}\n\n${task.prompt}\n`);
 await cp(path.join(root,'studies/motion-value-pilot/contracts',`${task.id}.md`),path.join(workspace,'CONTRACT.md'));
 await symlink(path.join(root,'node_modules'),path.join(workspace,'node_modules'));
 const baseline=await snapshotSource(workspace,path.join(runDir,'shared-baselines',id));
 workspaces.push({task,arm,id,workspace,port:43100+ti*10+ai,baseline});
}
const baselineDigests=new Set(workspaces.map(item=>item.baseline.digest));
// Baselines differ only by frozen task brief/asset/contract; each arm within a task must be byte-identical.
for(const task of inputs.tasks){const values=workspaces.filter(x=>x.task.id===task.id).map(x=>x.baseline.digest);if(new Set(values).size!==1)throw Error(`Unequal shared baseline for ${task.id}`)}
protocol.sharedBaselines=Object.fromEntries(workspaces.map(({id,baseline})=>[id,baseline.digest]));protocol.status='generation-running';await json(path.join(runDir,'PRE_REGISTRATION.json'),protocol);

async function installArm(item){
 const {workspace,arm,port}=item;
 if(arm.id==='construction'){
  const destination=path.join(workspace,'CONSTRUCTION_MATERIALS');await mkdir(destination);
  await cp(frozenSkills,destination,{recursive:true});
 }
 if(arm.id==='motion'){
  const preview=JSON.parse(run(process.execPath,[binary,'init','--client','codex','--local','--skills','--project',workspace],workspace));
  run(process.execPath,[binary,'init','--client','codex','--local','--skills','--project',workspace,'--apply','--confirm',preview.confirmationToken],workspace);
  const audit=path.join(runDir,'sessions',item.id,'mcp-audit'),captures=path.join(runDir,'sessions',item.id,'captures');
  const config=`[mcp_servers.motion-debugger]\ncommand = ${JSON.stringify(process.execPath)}\nargs = ${JSON.stringify([path.join(runnerSource,'audit-mcp.mjs'),binary,workspace,audit])}\n[mcp_servers.motion-debugger.env]\nMOTION_ARTIFACT_DIR = ${JSON.stringify(captures)}\nMOTION_ALLOWED_ORIGINS = ${JSON.stringify(`http://127.0.0.1:${port}`)}\nMOTION_SOURCE_ROOTS = ${JSON.stringify(workspace)}\nCHROMIUM_PATH = ${JSON.stringify(protocol.browser.executable)}\n`;
  await mkdir(path.join(workspace,'.codex'),{recursive:true});await writeFile(path.join(workspace,'.codex/config.toml'),config);await writeFile(path.join(runDir,'sessions',item.id,'EXECUTED-CONFIG.toml'),config);
 }
}
function armInstruction(arm){
 if(arm.id==='ordinary')return 'Use your strong ordinary coding and browser workflow. Motion Debugger materials and runtime are intentionally unavailable.';
 if(arm.id==='construction')return 'Use the complete frozen skill tree under CONSTRUCTION_MATERIALS as construction guidance, including motion/SKILL.md and its references/recipes. These bytes come from the same packed plugin as the full arm. Runtime Motion tools are intentionally unavailable; do not attempt to call them.';
 return 'Use $motion-debugger naturally as shipped. The installed Motion MCP is available; decide yourself when observation/review is useful, and preserve abstention if no source improvement is warranted.';
}
async function executeSession(item){
 const directory=path.join(runDir,'sessions',item.id);await mkdir(directory,{recursive:true});
 const started=Date.now();let setupError;
 try{await installArm(item)}catch(error){setupError=error.stack??String(error)}
 const prompt=`${armInstruction(item.arm)}\n\nRead TASK.md, CONTRACT.md, AGENTS.md, and asset.svg. Build the complete application within this workspace. You have one total wall budget including setup and browser review. Preserve the initial working checkpoint when it first works, then inspect and refine the actual app. Do not inspect hidden grader material because it is not part of the workspace. Finish with a concise account of what you tested and any limits.`;
 await writeFile(path.join(directory,'PROMPT.txt'),prompt);
 const remaining=Math.max(1,budgetSeconds*1000-(Date.now()-started));let exit={code:null,signal:null},timedOut=false;
 if(!setupError){
  const args=['exec','--json','--ephemeral','--sandbox','danger-full-access','--skip-git-repo-check','-c',`projects.${JSON.stringify(item.workspace)}.trust_level="trusted"`,'-C',item.workspace,'-o',path.join(directory,'FINAL.txt'),'-'];
  const child=spawn(codex,args,{cwd:item.workspace,detached:true,env:{...process.env,PILOT_PORT:String(item.port)},stdio:['pipe','pipe','pipe']});
  const out=createWriteStream(path.join(directory,'AGENT.jsonl')),err=createWriteStream(path.join(directory,'STDERR.log'));child.stdout.pipe(out);child.stderr.pipe(err);child.stdin.end(prompt);
  const timer=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGTERM')}catch{}},remaining);
  exit=await new Promise(resolve=>{child.once('error',error=>resolve({code:null,signal:null,error:String(error)}));child.once('exit',(code,signal)=>resolve({code,signal}))});clearTimeout(timer);
  await Promise.all([new Promise(resolve=>out.end(resolve)),new Promise(resolve=>err.end(resolve))]);
 }
 const final=await snapshotSource(item.workspace,path.join(directory,'final-source'));
 const initialPath=path.join(item.workspace,'INITIAL_CHECKPOINT');let initial=null;try{initial=await snapshotSource(initialPath,path.join(directory,'initial-source'))}catch{}
 const receipt={schemaVersion:1,id:item.id,task:item.task.id,arm:item.arm.id,status:setupError?'setup-failed':timedOut?'timed-out':exit.code===0?'completed':'agent-failed',startedAt:new Date(started).toISOString(),finishedAt:new Date().toISOString(),wallMs:Date.now()-started,budgetMs:budgetSeconds*1000,setupIncluded:true,exit,setupError:setupError??null,baselineDigest:item.baseline.digest,initialDigest:initial?.digest??null,finalDigest:final.digest,sourceChanged:item.baseline.digest!==final.digest,moneyCost:'unknown',configuredSettings,providerWireIdentity:'unverified'};
 await json(path.join(directory,'SESSION.json'),receipt);return {...item,directory,receipt};
}

const sessions=[];
for(const item of workspaces){console.log(JSON.stringify({stage:'generation',id:item.id,index:sessions.length+1,total:workspaces.length}));sessions.push(await executeSession(item));}
// Reveal only after all final source snapshots exist.
await json(path.join(runDir,'HELD_OUT_ACTIONS.json'),{...heldOut,commitmentSha256:heldOutCommitment,revealedAt:new Date().toISOString()});
protocol.status='grading-running';protocol.generationFinishedAt=new Date().toISOString();await json(path.join(runDir,'PRE_REGISTRATION.json'),protocol);

const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
async function serve(source){const server=createServer(async(req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html';const file=path.resolve(source,relative);if(!file.startsWith(path.resolve(source)+path.sep)&&file!==path.resolve(source,'index.html'))throw Error('outside');const bytes=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes)}catch{res.writeHead(404);res.end('Not found')}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,origin:`http://127.0.0.1:${server.address().port}`}}
const clean=value=>JSON.parse(JSON.stringify(value));
const state=page=>page.evaluate(()=>typeof window.__pilotState==='function'?window.__pilotState():null);
async function safe(checks,label,fn,validate=value=>value!==null&&value!==undefined){try{const actual=await fn();if(!validate(actual))throw Error('result failed its explicit evaluator contract');checks.push({label,passed:true,actual:clean(actual)});return actual}catch(error){checks.push({label,passed:false,error:error.message});return null}}
async function click(page,selector){const locator=page.locator(selector).first();await locator.waitFor({state:'visible',timeout:2500});await locator.click()}
async function downloadState(page,dir){const control=page.locator('#export').first();await control.waitFor({state:'visible',timeout:2500});const [download]=await Promise.all([page.waitForEvent('download',{timeout:3000}),control.click()]),file=path.join(dir,'export.json');await download.saveAs(file);return JSON.parse(await readFile(file,'utf8'))}
async function applyJourney(page,task,values){
 const trace=[],observe=async(label,fn)=>{const before=await state(page);await fn();await page.waitForTimeout(80);const after=await state(page);const motion=await page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);return{x:r.x,y:r.y,w:r.width,h:r.height,opacity:Number(s.opacity),visibility:s.visibility,display:s.display,viewportIntersection:Math.max(0,right-left)*Math.max(0,bottom-top)}};return{t:performance.now(),boxes:[...document.querySelectorAll('[data-product-id],[data-object-id],#product,#part-label,#selection-overlay,#waveform,#playhead')].map(box)}});trace.push({label,before,after,motion});};
 if(task==='field'){for(const selector of values.modeOrder)await observe('mode selection',()=>click(page,selector));const wave=page.locator('#waveform');await wave.focus();await observe('waveform keyboard',async()=>{for(let i=0;i<values.waveSteps;i++)await page.keyboard.press('ArrowRight')});const box=await wave.boundingBox();if(box)await observe('waveform pointer drag',async()=>{await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.85,box.y+box.height/2,{steps:5});await page.mouse.move(box.x+box.width*.35,box.y+box.height/2,{steps:5});await page.mouse.up()});for(const percentage of values.scroll)await observe('scroll chapter',async()=>{await page.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/100),percentage);await page.waitForTimeout(100)})}
 if(task==='commerce'){const products=page.locator('[data-product-id]');for(const index of values.products)await observe('product selection',()=>products.nth(index).click());for(const selector of values.filters)await observe('filter reversal',()=>click(page,selector));for(const selector of values.variants)await observe('variant selection',()=>click(page,selector));await observe('add to cart',()=>click(page,'#add-to-cart'));for(let i=0;i<values.cartToggles;i++)await observe('cart toggle',()=>click(page,'#cart'))}
 if(task==='creative'){for(const selector of values.selections)await observe('object selection',()=>click(page,selector));for(let i=0;i<values.zoomClicks;i++)await observe('zoom',()=>click(page,'#zoom-in'));const playhead=page.locator('#playhead');await playhead.focus();await observe('playhead keyboard',async()=>{for(let i=0;i<values.playheadSteps;i++)await page.keyboard.press('ArrowRight')});const box=await playhead.boundingBox();if(box)await observe('playhead pointer drag',async()=>{await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height/2,{steps:5});await page.mouse.move(box.x+box.width*.3,box.y+box.height/2,{steps:5});await page.mouse.up()});await observe('undo',()=>click(page,'#undo'))}
 const viewport=page.viewportSize();if(viewport?.width>700){await page.setViewportSize({width:900,height:Math.max(600,viewport.height-80)});await page.waitForTimeout(100);await page.setViewportSize(viewport);}await page.waitForTimeout(600);return trace;
}
async function geometry(page,task){return page.evaluate(task=>{const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);return{x:r.x,y:r.y,w:r.width,h:r.height,opacity:Number(s.opacity),visibility:s.visibility,display:s.display,viewportIntersection:Math.max(0,right-left)*Math.max(0,bottom-top)}};if(task==='field'){const a=document.querySelector('#part-label'),b=document.querySelector('#product');if(!a||!b)return null;return{kind:'label-product',a:box(a),b:box(b)}}if(task==='commerce'){const s=window.__pilotState?.()?.selectedProduct,e=s!==null&&s!==undefined?document.querySelector(`[data-product-id="${CSS.escape(String(s))}"]`):null;return e?{kind:'selected-product',selected:s,box:box(e)}:null}const s=window.__pilotState?.()?.selectedObject,a=document.querySelector('#selection-overlay'),b=s!==null&&s!==undefined?document.querySelector(`[data-object-id="${CSS.escape(String(s))}"]`):null;return a&&b?{kind:'selection-overlay',selected:s,a:box(a),b:box(b)}:null},task)}
async function grade(session,browser,sourceKind){
 const dir=path.join(session.directory,`grade-${sourceKind}`);await mkdir(dir,{recursive:true});const checks=[],errors=[];const source=path.join(session.directory,`${sourceKind}-source`),sourceDigest=sourceKind==='initial'?session.receipt.initialDigest:session.receipt.finalDigest,{server,origin}=await serve(source);
 let desktopState=null,alternateState=null,exported=null,geometryResult=null,primaryTrace=[],videoPath=null;
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:path.join(dir,'video'),size:{width:1280,height:800}},acceptDownloads:true,reducedMotion:'no-preference'});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(`desktop pageerror: ${error.message}`));page.on('console',message=>{if(message.type()==='error')errors.push(`desktop console: ${message.text()}`)});await safe(checks,'desktop app loads',async()=>{await page.goto(origin,{waitUntil:'domcontentloaded',timeout:6000});await page.screenshot({path:path.join(dir,'desktop-before.png'),fullPage:true});return page.title()},value=>typeof value==='string'&&value.trim().length>0);
  primaryTrace=await safe(checks,'held-out primary journey completes',()=>applyJourney(page,session.task.id,heldOut[session.task.id]),value=>Array.isArray(value))??[];
  const effects=validateActionEffects(primaryTrace);checks.push({label:'every control has an observed effect',passed:effects.passed,actual:effects});
  const motion=validateMotionObservations(primaryTrace.map(item=>item.motion));checks.push({label:'motion observations cover intermediate geometry',passed:motion.passed,actual:motion});
  desktopState=await safe(checks,'public state satisfies contract',()=>state(page),value=>validatePublicState(session.task.id,value).passed);
  geometryResult=await safe(checks,'required relationship is measurable',()=>geometry(page,session.task.id));
  exported=await safe(checks,'export downloads parseable JSON',()=>downloadState(page,dir));const independentlyObservedAfterExport=await state(page),exportCheck=validateExport(session.task.id,exported,independentlyObservedAfterExport);checks.push({label:'export equals independently observed state',passed:exportCheck.passed,actual:exportCheck});await page.screenshot({path:path.join(dir,'desktop-after.png'),fullPage:true});
  // Replay the same final choices through a reversed prefix; exact state must be stable after settling.
  await page.reload({waitUntil:'domcontentloaded'});const v=heldOut[session.task.id];
  const alternate=session.task.id==='field'?{...v,modeOrder:[v.modeOrder.at(-1)==='#mode-a'?'#mode-b':'#mode-a',...v.modeOrder]}:session.task.id==='commerce'?{...v,products:[(v.products[0]+1)%3,...v.products],filters:[v.filters.at(-1)==='#filter-a'?'#filter-b':'#filter-a',...v.filters],variants:[v.variants.at(-1)==='#variant-a'?'#variant-b':'#variant-a',...v.variants]}:{...v,selections:[v.selections.at(-1)==='#select-a'?'#select-b':'#select-a',...v.selections]};
  await applyJourney(page,session.task.id,alternate);alternateState=await state(page);
  const equivalence=equivalentOutcome(session.task.id,desktopState,alternateState);checks.push({label:'history-independent replay reaches same public state',passed:equivalence.passed,actual:equivalence});
  const video=page.video();await context.close();videoPath=video?await video.path():null;if(videoPath)await rename(videoPath,path.join(dir,'desktop.webm'));
  for(const spec of [{name:'mobile',viewport:{width:390,height:844},reducedMotion:'no-preference'},{name:'reduced',viewport:{width:1280,height:800},reducedMotion:'reduce'}]){const c=await browser.newContext({viewport:spec.viewport,reducedMotion:spec.reducedMotion});await c.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());const p=await c.newPage();p.on('pageerror',error=>errors.push(`${spec.name} pageerror: ${error.message}`));p.on('console',message=>{if(message.type()==='error')errors.push(`${spec.name} console: ${message.text()}`)});await safe(checks,`${spec.name} journey remains functional`,async()=>{await p.goto(origin,{waitUntil:'domcontentloaded',timeout:6000});await applyJourney(p,session.task.id,heldOut[session.task.id]);const result=await state(p);await p.screenshot({path:path.join(dir,`${spec.name}.png`),fullPage:true});return result},value=>validatePublicState(session.task.id,value).passed);await c.close()}
 }catch(error){errors.push(error.stack??String(error))}finally{await new Promise(resolve=>server.close(resolve))}
 const relationship=validateRelationship(session.task.id,geometryResult);checks.push({label:'independent relationship evidence',passed:relationship.passed,actual:relationship});checks.push({label:'no runtime errors',passed:errors.length===0,actual:{errors:[...errors]}});
 const functionSummary=summarizeFunction(checks,errors),functionPassed=functionSummary.passed;
 const motionConsistencyPassed=relationship.passed&&checks.find(c=>c.label==='motion observations cover intermediate geometry')?.passed===true&&checks.find(c=>c.label==='history-independent replay reaches same public state')?.passed===true;
 let calls=[];try{const files=(await readdir(path.join(session.directory,'mcp-audit'))).filter(x=>/^\d+-call\.json$/.test(x));calls=await Promise.all(files.map(async name=>{const value=JSON.parse(await readFile(path.join(session.directory,'mcp-audit',name),'utf8'));return{tool:value.request?.params?.name,startedAt:value.startedAt,stableApplicationSource:value.stableApplicationSource,beforeDigest:value.before?.digest,afterDigest:value.after?.digest,responseSha256:value.responseSha256}}))}catch{}
 const receipt={schemaVersion:2,gradeKind:'supplemental-corrected-v2',sourceKind,id:session.id,task:session.task.id,arm:session.arm.id,status:errors.length?'graded-with-errors':'graded',functionPassed,motionConsistencyPassed,staticComposition:'unverified-no-blinded-human-judge',normalSpeedPreference:'unverified-no-blinded-human-judge',checks,errors,desktopState,exportedState:exported,sourceDigest,sessionWallMs:session.receipt.wallMs,moneyCost:'unknown',unverifiedCoverage:relationship.passed?[]:[relationship.status],motionAdoption:{called:calls.length>0,calls,verifiedRepairBindings:[],causalRepairAttribution:'unverified-without-source-checkpoint-to-diff-binding'},recording:'desktop.webm',screenshots:['desktop-before.png','desktop-after.png','mobile.png','reduced.png']};await json(path.join(dir,'SUPPLEMENTAL-GRADE.json'),receipt);return receipt;
}
const browser=await chromium.launch({headless:true,executablePath:protocol.browser.executable,args:['--disable-dev-shm-usage']});const grades=[];
try{for(const session of sessions){console.log(JSON.stringify({stage:'grading',id:session.id,index:grades.length+1,total:sessions.length}));const initial=session.receipt.initialDigest?await grade(session,browser,'initial'):null,final=await grade(session,browser,'final');grades.push({initial,final})}}finally{await browser.close()}
const finalGrades=grades.map(value=>value.final),results={schemaVersion:2,status:'completed',gradeKind:'supplemental-corrected-v2',finishedAt:new Date().toISOString(),scope:protocol.scope,preregistration:'PRE_REGISTRATION.json',heldOutActions:'HELD_OUT_ACTIONS.json',heldOutCommitmentVerified:sha256(Buffer.from(JSON.stringify(heldOut)))===heldOutCommitment,configuredSettings,budgetSeconds,moneyCost:'unknown',humanPreference:'unverified',sessions:sessions.map((session,index)=>({...session.receipt,grades:grades[index]})),rawCounts:Object.fromEntries(arms.map(arm=>{const values=finalGrades.filter(g=>g.arm===arm.id);return[arm.id,{runs:values.length,functionPassed:values.filter(v=>v.functionPassed).length,motionConsistencyPassed:values.filter(v=>v.motionConsistencyPassed).length,motionAdoption:values.filter(v=>v.motionAdoption.called).length}]})),interpretation:'Small one-repetition-per-task pilot. Initial and final source are graded separately. Raw outcomes are not statistically conclusive and do not establish aesthetic preference.'};
await json(path.join(runDir,'SUPPLEMENTAL-RESULTS.json'),results);console.log(JSON.stringify({status:'completed',runDir,rawCounts:results.rawCounts}));
