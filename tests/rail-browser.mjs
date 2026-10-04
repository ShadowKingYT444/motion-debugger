import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,readdir,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {launchRail,root} from '../scripts/demo-rail.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const output=path.join(root,'evidence');await mkdir(output,{recursive:true});
async function hashes(directory,prefix=''){let result={};for(const item of await readdir(directory,{withFileTypes:true})){if(['evidence','verification'].includes(item.name))continue;const name=prefix+item.name,file=path.join(directory,item.name);if(item.isDirectory())Object.assign(result,await hashes(file,name+'/'));else if(item.isFile())result[name]=sha(await readFile(file));else throw new Error('Nonregular source file')}return result}
const sourceHashes={ordinary:await hashes(path.join(root,'source/ordinary')),motion:await hashes(path.join(root,'source/motion'))};
const viewer=await launchRail(0),results=[];
const executablePath=process.env.CHROMIUM_PATH??(existsSync(chromium.executablePath())?undefined:['/usr/bin/chromium','/usr/bin/google-chrome'].find(existsSync));
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const environment={chromium:browser.version(),node:process.version,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),sourceHashes};
const required=['#harbor','#summit','#overview','#focus','#pause','#replay','#export','#scrub','#network','#service-name'];
try{for(const scenario of [{name:'desktop',viewport:{width:1440,height:960}},{name:'mobile',viewport:{width:390,height:844}},{name:'reduced',viewport:{width:1440,height:960},reducedMotion:'reduce'}])for(const arm of ['ordinary','motion']){
 const dir=path.join(output,`${arm}-${scenario.name}`);await mkdir(dir,{recursive:true});const context=await browser.newContext({viewport:scenario.viewport,reducedMotion:scenario.reducedMotion??'no-preference',recordVideo:{dir,size:scenario.viewport},acceptDownloads:true});
 const page=await context.newPage();const video=page.video(),errors=[],checks=[],events=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{window.__railFrameTimes=[];function tick(t){window.__railFrameTimes.push(t);if(window.__railFrameTimes.length<5000)requestAnimationFrame(tick)}requestAnimationFrame(tick)});
 const state=()=>page.evaluate(()=>window.dispatchState?.()??null);
 async function step(label,action,expect){const before=await state();const at=await page.evaluate(()=>performance.now());let error=null;try{await action();await page.waitForTimeout(220);if(expect&&!expect(await state()))throw new Error('Unexpected state')}catch(e){error=e.message}const after=await state();events.push({label,pagePerformanceNowMs:at,before,after,error});checks.push({label,passed:!error,error})}
 try{
  await page.goto(viewer.origin+'/'+arm+'/',{waitUntil:'networkidle'});await page.waitForTimeout(900);
  for(const selector of required){const element=page.locator(selector);checks.push({label:`visible ${selector}`,passed:await element.count()===1&&await element.isVisible()})}
  await page.screenshot({path:path.join(dir,'initial.png')});
  await step('select Harbor',()=>page.locator('#harbor').click(),s=>s&&/harbor/i.test(s.service));
  await step('station focus',()=>page.locator('#focus').click());await page.waitForTimeout(650);
  await step('switch Summit mid-focus',()=>page.locator('#summit').click(),s=>s&&/summit/i.test(s.service));
  await step('overview reversal',()=>page.locator('#overview').click());
  await step('focus again',()=>page.locator('#focus').click());
  await step('reverse during transition',()=>page.locator('#overview').click());await page.waitForTimeout(900);
  await page.screenshot({path:path.join(dir,'interruption.png')});
  await step('pause',()=>page.locator('#pause').click(),s=>s?.paused===true);const paused=await state();await page.waitForTimeout(500);const later=await state();checks.push({label:'paused clock remains stable',passed:!!paused&&paused.time===later?.time});
  await step('timetable scrub forward and reverse',async()=>{const range=page.locator('#scrub');await range.focus();await range.press('End');await page.waitForTimeout(350);await range.press('Home');await page.waitForTimeout(350);await range.press('ArrowRight')});
  await page.screenshot({path:path.join(dir,'scrub.png')});
  await step('resume',()=>page.locator('#pause').click(),s=>s?.paused===false);
  await step('replay',()=>page.locator('#replay').click(),s=>s?.paused===false);
  await step('keyboard service selection',async()=>{await page.locator('#harbor').focus();await page.keyboard.press('Enter')},s=>s&&/harbor/i.test(s.service));
  await step('configuration export',async()=>{const downloadPromise=page.waitForEvent('download',{timeout:3000});await page.locator('#export').click();const download=await downloadPromise;await download.saveAs(path.join(dir,'dispatch.json'));JSON.parse(await readFile(path.join(dir,'dispatch.json'),'utf8'))});
  await page.waitForTimeout(700);await page.screenshot({path:path.join(dir,'final.png')});
 }catch(error){checks.push({label:'journey',passed:false,error:error.message})}
 const frameTimes=await page.evaluate(()=>window.__railFrameTimes??[]);const intervals=frameTimes.slice(1).map((t,i)=>t-frameTimes[i]);const coverage=await page.evaluate(()=>({viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 checks.push({label:'no horizontal page overflow',passed:coverage.scrollWidth<=coverage.viewportWidth+1});checks.push({label:'no uncaught page errors',passed:errors.length===0});
 await context.close();const native=await video.path();await rename(native,path.join(dir,'journey.webm'));
 const assets={};for(const file of await readdir(dir)){if(file==='report.json')continue;const bytes=await readFile(path.join(dir,file));assets[file]={sha256:sha(bytes),bytes:bytes.length}}
 const report={arm,scenario:scenario.name,viewport:scenario.viewport,reducedMotion:scenario.reducedMotion??'no-preference',status:checks.every(c=>c.passed)?'passed':'failed',checks,events,errors,frameSampling:{samples:frameTimes.length,maxGapMs:intervals.length?Math.max(...intervals):null,integrityGateMs:80,adequate:intervals.length>1&&Math.max(...intervals)<=80,scope:'Browser rAF timing; not physical display FPS or painted train continuity'},assets,sourceHashes:sourceHashes[arm],environment};
 await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));results.push(report);console.log(JSON.stringify({arm,scenario:scenario.name,status:report.status,failed:checks.filter(c=>!c.passed).map(c=>c.label),sampling:report.frameSampling}));
 }
 const current={ordinary:await hashes(path.join(root,'source/ordinary')),motion:await hashes(path.join(root,'source/motion'))};if(JSON.stringify(current)!==JSON.stringify(sourceHashes))throw new Error('Source changed during verification');
 const report={schemaVersion:1,createdAt:new Date().toISOString(),kind:'Independent agent workflow pair; not blind benchmark',status:results.every(r=>r.status==='passed')?'passed':'failed',environment,results};await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2));
}catch(e){console.error(e);process.exitCode=1}finally{await browser.close();await viewer.close()}
