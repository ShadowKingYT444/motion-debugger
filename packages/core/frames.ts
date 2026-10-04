import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
import {chromiumOptions} from '../../server/browser';
import type {CoreOptions,MotionCapture} from './types';

export interface RecordedFrame {captureTimeMs:number;videoSeekMs:number;width:number;height:number;sourceWidth:number;sourceHeight:number;scale:number;path:string;sha256:string;png:Buffer}
export interface FrameOptions {selection?:'finding'|'journey';maxWidth?:number;maxHeight?:number}
export function frameDimensions(sourceWidth:number,sourceHeight:number,options:FrameOptions={}) {
  const {maxWidth=720,maxHeight=540}=options;
  if(![sourceWidth,sourceHeight].every(value=>Number.isFinite(value)&&value>0)||!Number.isInteger(maxWidth)||!Number.isInteger(maxHeight)||maxWidth<120||maxWidth>1280||maxHeight<120||maxHeight>960)throw new Error('Frame dimensions must be bounded: width 120–1280, height 120–960');
  const scale=Math.min(1,maxWidth/sourceWidth,maxHeight/sourceHeight);
  return {width:Math.max(1,Math.round(sourceWidth*scale)),height:Math.max(1,Math.round(sourceHeight*scale)),sourceWidth,sourceHeight,scale};
}
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function frameRequestAllowed(host:string|undefined,requestOrigin:string|undefined,expectedOrigin:string) {
  if(!expectedOrigin)return false;
  return host===new URL(expectedOrigin).host&&(!requestOrigin||requestOrigin===expectedOrigin);
}

/** Report paths are untrusted: resolve fixed filenames under this capture, never artifacts.video. */
export async function frameSource(id:string,options:CoreOptions) {
  if(!uuid.test(id))throw new Error('Capture ID must be a UUID');
  const root=await realpath(path.resolve(options.artifactRoot));
  const directory=await realpath(path.join(root,id));
  if(directory!==path.join(root,id))throw new Error('Capture directory must not be a symlink');
  const reportPath=await realpath(path.join(directory,'report.json'));
  const video=await realpath(path.join(directory,'video.webm'));
  if(reportPath!==path.join(directory,'report.json')||video!==path.join(directory,'video.webm'))throw new Error('Capture artifacts must not be symlinks');
  const [reportStat,videoStat]=await Promise.all([stat(reportPath),stat(video)]);
  if(!reportStat.isFile()||reportStat.size>4_000_000||!videoStat.isFile()||videoStat.size<32||videoStat.size>128_000_000)throw new Error('Capture artifact size or type is invalid');
  const report=JSON.parse(await readFile(reportPath,'utf8')) as MotionCapture;
  if(report.id!==id||report.schemaVersion!=='2.0')throw new Error('Capture report identity or schema mismatch');
  const duration=report.recipe?.durationMs,offset=report.artifacts?.videoOffsetMs;
  if(!Number.isFinite(duration)||duration!<500||duration!>12000||!Number.isFinite(offset)||offset<0||offset>30000)throw new Error('Capture timing metadata is invalid');
  return {directory,video,size:videoStat.size,report,duration:duration!,offset};
}

export function frameTimes(report:MotionCapture,requested?:number[],selection:FrameOptions['selection']='finding') {
  const duration=report.recipe.durationMs!;
  if(requested&&(!Array.isArray(requested)||requested.length<1||requested.length>6||requested.some(t=>!Number.isFinite(t)||t<0||t>duration)))throw new Error('Request one to six finite timestamps within the capture duration');
  if(requested)return [...new Set(requested)].sort((a,b)=>a-b);
  if(selection==='journey')return [...new Set(Array.from({length:6},(_,index)=>Math.round(duration*index/5)))];
  if(selection!=='finding')throw new Error('Frame selection must be finding or journey');
  const ordered=[...(report.findings??[])].sort((a,b)=>Number(b.confidence==='contract-violation')-Number(a.confidence==='contract-violation'));
  let center:number|undefined;
  for(const finding of ordered){
    center=finding.sampleTimes?.find(Number.isFinite)??report.events?.find(event=>finding.eventIds?.includes(event.id)&&Number.isFinite(event.t))?.t;
    if(center!==undefined)break;
  }
  center??=duration/2;
  return [...new Set([center-100,center,center+100].map(t=>Math.round(Math.max(0,Math.min(duration,t)))))];
}

/** Decode the actual recording with the already installed Chromium; no rerun or synthetic frame. */
export async function recordedFrames(id:string,options:CoreOptions,requested?:number[],frameOptions:FrameOptions={}) {
  if(options.signal?.aborted)throw new Error('Frame extraction canceled');
  frameDimensions(1,1,frameOptions);
  const source=await frameSource(id,options),times=frameTimes(source.report,requested,frameOptions.selection);
  const token=randomUUID();let origin='';
  const server=createServer((req,res)=>{
    if(!frameRequestAllowed(req.headers.host,req.headers.origin,origin)){res.writeHead(403).end();return}
    if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405).end();return}
    if(req.url===`/view/${token}`){
      res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'none'; media-src 'self'"});
      res.end(`<!doctype html><html><body><video id="recording" preload="auto" src="/video/${token}" muted></video></body></html>`);return;
    }
    if(req.url!==`/video/${token}`){res.writeHead(404).end();return}
    const headers={'Content-Type':'video/webm','Accept-Ranges':'bytes','Cache-Control':'no-store'};
    let start=0,end=source.size-1;
    if(req.headers.range){
      const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if(!match){res.writeHead(416).end();return}
      start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=source.size){res.writeHead(416).end();return}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${source.size}`});
    }else res.writeHead(200,{...headers,'Content-Length':source.size});
    if(req.method==='HEAD'){res.end();return}
    const stream=createReadStream(source.video,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  const frames:RecordedFrame[]=[];
  const abort=()=>{void browser?.close().catch(()=>{});server.closeAllConnections();server.close()};
  options.signal?.addEventListener('abort',abort,{once:true});
  try {
    browser=await chromium.launch(chromiumOptions());
    if(options.signal?.aborted)throw new Error('Frame extraction canceled');
    const context=await browser.newContext({viewport:{width:720,height:540},serviceWorkers:'block'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage();await page.goto(`${origin}/view/${token}`,{waitUntil:'domcontentloaded',timeout:10000});
    await page.waitForFunction(()=>{const video=document.querySelector('video')!;return video.readyState>=2&&Number.isFinite(video.duration)&&video.duration>0},{},{timeout:10000});
    const output=path.join(source.directory,`frames-${randomUUID()}`);await mkdir(output);
    for(const captureTimeMs of times){
      if(options.signal?.aborted)throw new Error('Frame extraction canceled');
      const frame=await page.evaluate(async ({milliseconds,maxWidth,maxHeight})=>{
        const video=document.querySelector('video')!;video.pause();
        const seek=Math.max(0,Math.min(milliseconds/1000,video.duration-.04));
        if(Math.abs(video.currentTime-seek)>.001)await new Promise<void>((resolve,reject)=>{
          const timeout=setTimeout(()=>reject(new Error('Recorded frame seek timed out')),5000);
          video.addEventListener('seeked',()=>{clearTimeout(timeout);resolve()},{once:true});video.currentTime=seek;
        });
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        const scale=Math.min(1,maxWidth/video.videoWidth,maxHeight/video.videoHeight),canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
        canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height);
        return {png:canvas.toDataURL('image/png').split(',')[1],width:canvas.width,height:canvas.height,sourceWidth:video.videoWidth,sourceHeight:video.videoHeight,scale,videoSeekMs:video.currentTime*1000};
      },{milliseconds:captureTimeMs+source.offset,maxWidth:frameOptions.maxWidth??720,maxHeight:frameOptions.maxHeight??540});
      const png=Buffer.from(frame.png,'base64');if(png.length>2_000_000||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Decoded frame is not a bounded PNG');
      const filename=path.join(output,`${frames.length+1}-${Math.round(captureTimeMs)}ms.png`);await writeFile(filename,png);
      frames.push({captureTimeMs,videoSeekMs:Math.round(frame.videoSeekMs),width:frame.width,height:frame.height,sourceWidth:frame.sourceWidth,sourceHeight:frame.sourceHeight,scale:frame.scale,path:filename,sha256:createHash('sha256').update(png).digest('hex'),png});
    }
    const alignment='Actual recorded-video frames. Capture timestamps are mapped with the measured host videoOffsetMs; seeking and alignment are approximate. Use rAF evidence for precise motion metrics.';
    await writeFile(path.join(output,'frames.json'),JSON.stringify({captureId:id,alignment,videoOffsetMs:source.offset,frames:frames.map(({png,...metadata})=>metadata)},null,2));
    return {captureId:id,alignment,videoOffsetMs:source.offset,frames};
  }finally{options.signal?.removeEventListener('abort',abort);try{await browser?.close()}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}}
}
