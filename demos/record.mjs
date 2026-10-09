#!/usr/bin/env node
// Records the same scripted visit of each control/treatment site and renders side-by-side films.
// Every frame is a real Chromium compositor frame (CDP screencast) of the committed site; nothing is
// generated or retimed except resampling to a constant 30 fps.
//
//   node demos/record.mjs                      # all pairs in demos/pairs.json → demos/<id>/comparison.{mp4,gif}
//   node demos/record.mjs --pairs norr --out artifacts/showcase --no-gif
//
// The visit: load and watch the entrance for 3.5 s, sweep the pointer across the hero, then scroll
// the whole page with real wheel input at a constant ~1100 px/s, and hold the end for 1.5 s.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
import {mkdir,readFile,rm,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const argv=process.argv.slice(2);
const flag=(name)=>argv.includes(`--${name}`);
const option=(name,fallback)=>{const index=argv.indexOf(`--${name}`);return index>=0?argv[index+1]:fallback};
const out=path.resolve(option('out',here));
const manifestFile=path.resolve(option('manifest',path.join(here,'pairs.json'))),base=path.dirname(manifestFile);
const manifest=JSON.parse(await readFile(manifestFile,'utf8'));
const wanted=option('pairs')?.split(',');
const pairs=manifest.pairs.filter(pair=>!wanted||wanted.includes(pair.id));
const viewport={width:1440,height:900};

const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
async function serve(root) {
  const server=createServer(async(request,response)=>{
    let file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://x').pathname));
    if(!file.startsWith(root)){response.writeHead(403).end();return}
    if((await stat(file).catch(()=>null))?.isDirectory())file=path.join(file,'index.html');
    const body=await readFile(file).catch(()=>null);
    if(!body){response.writeHead(404).end();return}
    response.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(body);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise(resolve=>server.close(resolve))};
}

const run=(command,args)=>new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['ignore','ignore','pipe']});let error='';
  child.stderr.on('data',chunk=>{error+=chunk});
  child.on('close',code=>code===0?resolve():reject(new Error(`${command} exited ${code}\n${error.slice(-2000)}`)));
});

async function record(browser,siteDir,framesDir) {
  await rm(framesDir,{recursive:true,force:true});await mkdir(framesDir,{recursive:true});
  const server=await serve(path.resolve(siteDir));
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  const frames=[];const writes=[];
  cdp.on('Page.screencastFrame',({data,metadata,sessionId})=>{
    const file=path.join(framesDir,`f${String(frames.length).padStart(5,'0')}.jpg`);
    frames.push({file,t:metadata.timestamp});writes.push(writeFile(file,Buffer.from(data,'base64')));
    cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
  });
  await page.goto('about:blank');
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:viewport.width,maxHeight:viewport.height,everyNthFrame:1});
  const started=Date.now()/1000;
  await page.goto(server.url,{waitUntil:'commit'});
  await page.mouse.move(viewport.width*.25,viewport.height*.55);
  await page.waitForTimeout(3500);
  for(let step=0;step<=40;step++){await page.mouse.move(viewport.width*(.25+step/80),viewport.height*(.55-step/400));await page.waitForTimeout(20)}
  await page.waitForTimeout(400);
  let last=-1,still=0;
  for(let tick=0;tick<1600&&still<25;tick++){
    await page.mouse.wheel(0,44);await page.waitForTimeout(40);
    if(tick%5===4){const y=await page.evaluate(()=>scrollY);still=y===last?still+5:0;last=y}
  }
  await page.waitForTimeout(1500);
  await cdp.send('Page.stopScreencast');
  await Promise.all(writes);
  const height=await page.evaluate(()=>document.scrollingElement.scrollHeight);
  await context.close();await server.close();
  // Concat demuxer with each frame held until the next one arrived, then resampled to 30 fps.
  const lines=[];
  frames.forEach((frame,index)=>{const next=frames[index+1]?.t??frame.t+1/30;lines.push(`file '${frame.file}'`,`duration ${Math.max(1/120,next-frame.t).toFixed(4)}`)});
  lines.push(`file '${frames.at(-1).file}'`);
  await writeFile(path.join(framesDir,'frames.txt'),lines.join('\n'));
  return {frames:frames.length,seconds:Number((frames.at(-1).t-frames[0].t).toFixed(2)),pageHeight:height,startedAt:started};
}

async function header(browser,file,pair) {
  const page=await browser.newPage({viewport:{width:1920,height:72},deviceScaleFactor:1});
  const cell=(label,detail,accent)=>`<div><b style="color:${accent}">${label}</b><span>${detail}</span></div>`;
  await page.setContent(`<style>body{margin:0;display:grid;grid-template-columns:1fr 1fr;height:72px;background:#0b0b0c;font:600 22px/1 Inter,ui-sans-serif,system-ui,sans-serif;color:#f2f0ea}
    div{display:flex;align-items:center;gap:14px;padding:0 28px;border-bottom:1px solid #2a2a2a}div+div{border-left:1px solid #2a2a2a}span{font-weight:400;color:#a8a6a0;font-size:18px}</style>
    ${cell('Without the plugin',`${pair.title} · Sonnet 5.5, same prompt`,'#c9c6bd')}${cell('With premium-motion',`${pair.title} · Sonnet 5.5, same prompt`,'#e8ff59')}`);
  await page.screenshot({path:file});await page.close();
}

// Prefer Playwright's version-matched browser, then a configured or system Chromium.
const system=['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(existsSync);
const executablePath=process.env.CHROMIUM_PATH??(existsSync(chromium.executablePath())?undefined:system);
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars']});
const summary=[];
try{
  for(const pair of pairs){
    const dir=path.join(out,pair.id);await mkdir(dir,{recursive:true});
    const work=path.join(dir,'.frames');
    const arms={};
    for(const arm of ['control','treatment']){
      arms[arm]=await record(browser,path.join(base,pair[arm]),path.join(work,arm));
      console.log(`${pair.id}/${arm}: ${arms[arm].frames} frames over ${arms[arm].seconds}s, page ${arms[arm].pageHeight}px`);
    }
    await header(browser,path.join(work,'header.png'),pair);
    const duration=Math.max(arms.control.seconds,arms.treatment.seconds).toFixed(2);
    // Each side at 960×600, the shorter visit holds its last frame, labels on top.
    const side=(input)=>`[${input}:v]fps=30,scale=960:600:flags=lanczos,tpad=stop_mode=clone:stop_duration=60,trim=duration=${duration},setpts=PTS-STARTPTS`;
    const filter=`${side(0)}[a];${side(1)}[b];[a][b]hstack[v];[2:v][v]vstack,format=yuv420p[out]`;
    const mp4=path.join(dir,'comparison.mp4');
    await run('ffmpeg',['-y','-f','concat','-safe','0','-i',path.join(work,'control','frames.txt'),'-f','concat','-safe','0','-i',path.join(work,'treatment','frames.txt'),'-i',path.join(work,'header.png'),'-filter_complex',filter,'-map','[out]','-c:v','libx264','-preset','slow','-crf','25','-movflags','+faststart',mp4]);
    if(!flag('no-gif')){
      // README preview: the first 14 s at 1.6× speed, 880 px wide, 10 fps, one shared palette (about 4 MB).
      const gif=path.join(dir,'comparison.gif');
      await run('ffmpeg',['-y','-i',mp4,'-filter_complex','[0:v]setpts=PTS/1.6,trim=duration=14,fps=10,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle','-loop','0',gif]);
    }
    const poster=path.join(dir,'poster.jpg');
    await run('ffmpeg',['-y','-ss','2.5','-i',mp4,'-frames:v','1','-q:v','3',poster]);
    if(!flag('keep-frames'))await rm(work,{recursive:true,force:true});
    summary.push({id:pair.id,title:pair.title,control:arms.control,treatment:arms.treatment,durationSec:Number(duration)});
  }
}finally{await browser.close()}
await writeFile(path.join(out,'recordings.json'),JSON.stringify({recordedAt:new Date().toISOString(),viewport,journey:'3.5 s entrance, pointer sweep, wheel scroll 44 px per 40 ms to the end, 1.5 s hold',pairs:summary},null,2)+'\n');
