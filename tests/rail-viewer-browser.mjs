import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';

// --origin also runs unchanged against a separately installed tarball.
const index=process.argv.indexOf('--origin');
const viewer=index<0?await (await import('../scripts/demo-rail.mjs')).launchRail(0):null;
const origin=index<0?viewer.origin:process.argv[index+1];
const output=path.resolve('artifacts/rail-viewer',new Date().toISOString().replaceAll(':','-'));
await mkdir(output,{recursive:true});
const executablePath=process.env.CHROMIUM_PATH??(existsSync(chromium.executablePath())?undefined:['/usr/bin/chromium','/usr/bin/google-chrome'].find(existsSync));
const browser=await chromium.launch({executablePath,headless:true});
const results=[];
const servedHashes={};
for(const file of ['viewer.js','']) {
  const response=await fetch(new URL(file,origin.endsWith('/')?origin:origin+'/'));
  assert.equal(response.status,200);
  servedHashes[file||'viewer.html']=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
}
let commit=null,workingTree=null;
try {commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();workingTree=execFileSync('git',['status','--porcelain'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();} catch {}
try {
  for(const viewport of [{width:1600,height:1000},{width:390,height:844}]) {
    const name=viewport.width===390?'mobile':'desktop';
    const dir=path.join(output,name);await mkdir(dir,{recursive:true});
    const context=await browser.newContext({viewport,recordVideo:{dir,size:viewport}});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const video=page.video();
    try {
      await page.goto(origin,{waitUntil:'networkidle'});
      for(const title of ['Ordinary railway app','Motion-assisted railway app']) {
        const frame=page.frameLocator(`iframe[title="${title}"]`);
        await frame.locator('#summit').click();
        await frame.locator('#service-name').filter({hasText:/Summit/i}).waitFor();
        await frame.locator('#pause').click();
        await frame.locator('#replay').click();
      }
      await page.screenshot({path:path.join(dir,'live-desktop.png'),fullPage:true});
      await page.locator('#mobile').click();
      for(const frame of page.frames().slice(1))assert.equal(await frame.evaluate(()=>innerWidth),390);
      await page.screenshot({path:path.join(dir,'live-mobile.png'),fullPage:true});
      await page.locator('#film').click();
      await page.locator('#play').waitFor();
      await page.waitForFunction(()=>!document.getElementById('play').disabled);
      assert.deepEqual(await page.locator('video').evaluateAll(videos=>videos.map(video=>video.getAttribute('src'))),[
        'evidence/ordinary-mobile/journey.webm','evidence/motion-mobile/journey.webm',
      ]);
      await page.locator('#play').click();
      await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(video=>video.currentTime>.3&&!video.paused));
      await page.locator('#play').click();
      const paused=await page.locator('video').evaluateAll(videos=>videos.map(video=>video.currentTime));
      await page.waitForTimeout(250);
      assert.deepEqual(await page.locator('video').evaluateAll(videos=>videos.map(video=>video.currentTime)),paused);
      // A real keyboard seek must affect both films and leave them paused.
      await page.locator('#seek').focus();await page.locator('#seek').press('Home');
      await page.locator('#seek').press('ArrowRight');
      await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(video=>!video.seeking));
      const sought=await page.locator('video').evaluateAll(videos=>videos.map(video=>({time:video.currentTime,paused:video.paused})));
      assert.ok(sought.every(video=>video.paused&&Math.abs(video.time-.05)<.01),JSON.stringify(sought));
      await page.locator('#restart').click();
      await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(video=>video.currentTime>.3&&!video.paused));
      await page.waitForTimeout(700);
      await page.screenshot({path:path.join(dir,'film-mobile.png'),fullPage:true});
      await page.locator('#desktop').click();
      await page.waitForFunction(()=>!document.getElementById('play').disabled);
      assert.ok(await page.locator('video').evaluateAll(videos=>videos.every(video=>video.paused&&video.getAttribute('src').includes('-desktop/'))));
      await page.locator('#restart').click();await page.waitForTimeout(1000);
      await page.screenshot({path:path.join(dir,'film-desktop.png'),fullPage:true});
      await page.locator('#live').click();
      assert.ok(await page.locator('video').evaluateAll(videos=>videos.every(video=>video.paused)));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.route('**/evidence/*-mobile/journey.webm',route=>route.abort());
      await page.reload({waitUntil:'networkidle'});
      await page.locator('#mobile').click();await page.locator('#film').click();
      await page.locator('#note').filter({hasText:'Recording unavailable'}).waitFor();
      assert.equal(await page.locator('#play').isDisabled(),true);
      assert.deepEqual(errors,[]);
      results.push({name,status:'passed',viewport});
    } catch(error) {
      results.push({name,status:'failed',viewport,error:String(error)});
      throw error;
    } finally {await context.close();await video.saveAs(path.join(dir,'viewer.webm'));}
  }
} finally {
  await writeFile(path.join(output,'verification.json'),JSON.stringify({schemaVersion:'rail-viewer-1',createdAt:new Date().toISOString(),origin,chromium:browser.version(),node:process.version,commit,workingTree,servedHashes,results},null,2));
  await browser.close();await viewer?.close();
  console.log(`A/B viewer evidence: ${output}`);
}
