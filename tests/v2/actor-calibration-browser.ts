import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {capture} from '../../packages/core/capture';
import {measurePixelActorContinuity} from '../../packages/core/pixel-actors';

// Deliberately seeded detector-development fixtures, not a blind agent benchmark.
// ffmpeg decodes native pixels in a separate diagnostic pass; no synchronous app reads.
const server=createServer((req,res)=>{
  const scenario=(req.url??'/').slice(1);
  res.setHeader('Content-Type','text/html');
  res.end(`<!doctype html><style>body{margin:0;background:#101018}button{height:32px}canvas{display:block}</style><button id="run">Run seeded ${scenario} fixture</button><canvas id="stage" width="320" height="160"></canvas><script>
    const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),scenario=${JSON.stringify(scenario)},rendererStartedAt=performance.now();let begin=null;
    const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    document.querySelector('button').onclick=()=>{begin=performance.now()};
    function render(t){
      const elapsed=begin===null?0:Math.max(0,t-begin),rendererElapsed=Math.max(0,t-rendererStartedAt),fast=scenario==='fast';
      const x=fast?20+Math.min(240,elapsed*.24):elapsed<420?20:260;
      const visible=!(scenario==='hidden-first-ready'&&rendererElapsed<500)&&!(scenario==='hidden-interior'&&begin!==null&&elapsed>=360&&elapsed<620);
      ctx.fillStyle='#101018';ctx.fillRect(0,0,320,160);
      if(visible){ctx.fillStyle='rgb(20,220,40)';ctx.fillRect(x,60,24,24)}
      ctx.fillStyle='rgb(230,80,210)';ctx.fillRect(4,140,12,12);
      const reported=scenario==='spoof'?20+Math.min(240,elapsed*.24):x;
      const world=[...identity];world[12]=reported;
      window.__motionActors?.publish([{actorId:'part',visible,screen:visible?{x:reported,y:92,width:24,height:24}:null,transform:world,cameraWorldMatrix:identity,cameraProjectionMatrix:identity}],performance.now());
      requestAnimationFrame(render);
    }requestAnimationFrame(render);
  </script>`);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`,artifactRoot=path.resolve('artifacts/v2/actor-calibration/captures');
await mkdir(artifactRoot,{recursive:true});
const marker={r:230,g:80,b:210,tolerance:20,minPixels:50};
const markerVisible=(frame:{width:number;height:number;rgba:Uint8Array})=>{
  let pixels=0;
  for(let offset=0;offset<frame.rgba.length;offset+=4)if(frame.rgba[offset+3]>=200&&Math.abs(frame.rgba[offset]-marker.r)<=marker.tolerance&&Math.abs(frame.rgba[offset+1]-marker.g)<=marker.tolerance&&Math.abs(frame.rgba[offset+2]-marker.b)<=marker.tolerance&&++pixels>=marker.minPixels)return true;
  return false;
};
const gitCommit=spawnSync('git',['rev-parse','HEAD']).stdout.toString().trim(),worktreeModified=spawnSync('git',['status','--porcelain']).stdout.length>0;
const fixtureSourceSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
const results=[];
try{
  for(const scenario of ['jump','spoof','fast','scrub','hidden-first-ready','hidden-interior']){
    const inputPolicy=scenario==='scrub'?'direct-scrub' as const:'retarget' as const;
    const report=await capture({url:`${origin}/${scenario}`,selector:'#stage',viewport:{width:320,height:320},durationMs:1400,actions:[{action:'click',selector:'#run'}],actors:[{id:'part',kind:'scene',acceptance:{continuity:'position',inputPolicy,maxStepAt60HzPx:12,minTravelPx:20}}],contract:{maxFrameStepPx:.001}},{artifactRoot});
    assert.equal(report.metrics.maxFrameStepPx,0,'Canvas bounds remain stationary');
    assert.equal(report.actorAnalysis?.status,'unverified','Annotations never certify painted motion');
    assert.ok(report.actorSamples!.length>=20);
    const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height:frame=best_effort_timestamp_time','-of','json',report.artifacts.video],{maxBuffer:16_000_000});
    if(probe.error)throw probe.error;if(probe.status!==0)throw new Error(probe.stderr.toString());
    const metadata=JSON.parse(probe.stdout.toString()),width=metadata.streams[0].width,height=metadata.streams[0].height;
    const decoded=spawnSync('ffmpeg',['-v','error','-threads','1','-i',report.artifacts.video,'-f','rawvideo','-pix_fmt','rgba','-vsync','0','pipe:1'],{maxBuffer:128_000_000});
    if(decoded.error)throw decoded.error;if(decoded.status!==0)throw new Error(decoded.stderr.toString());
    const size=width*height*4;
    assert.equal(decoded.stdout.length,metadata.frames.length*size);
    const rawFrames=metadata.frames.map((frame:{best_effort_timestamp_time:string},index:number)=>({width,height,cssSize:report.environment.viewport,presentationTimeMs:Number(frame.best_effort_timestamp_time)*1000,rgba:new Uint8Array(decoded.stdout.subarray(index*size,(index+1)*size))}));
    const readyIndex=rawFrames.findIndex(markerVisible);
    assert.notEqual(readyIndex,-1,'The independent readiness marker must appear in the native film');
    const frames=rawFrames.slice(readyIndex);
    assert.equal(frames.length,rawFrames.length-readyIndex,'Every decoded frame from readiness through EOF must be evaluated');
    assert.equal(frames.at(-1)?.presentationTimeMs,rawFrames.at(-1)?.presentationTimeMs,'The trailing native frame must be retained');
    assert.ok(frames.every(markerVisible),'The readiness marker must remain visible through the evaluated tail');
    const pixel=measurePixelActorContinuity(frames,{actorId:'part',color:{r:20,g:220,b:40},tolerance:20,minPixels:150},{maxStepAt60HzPx:12,inputPolicy});
    const expected=scenario==='fast'?'passed':scenario==='scrub'?'not-applicable':scenario.startsWith('hidden-')?'unverified':'failed';
    assert.equal(pixel.status,expected,JSON.stringify({scenario,pixel:{...pixel,samples:undefined},coverage:report.coverage,film:{decodedFrames:rawFrames.length,readyIndex}}));
    assert.equal(report.performanceDiagnostics?.longAnimationFrames.thresholdMs,50);
    const videoSha256=createHash('sha256').update(await readFile(report.artifacts.video)).digest('hex'),reportSha256=createHash('sha256').update(await readFile(report.artifacts.report)).digest('hex');
    results.push({scenario,provenance:{gitCommit,worktreeModified,fixtureSourceSha256,videoSha256,reportSha256},captureId:report.id,environment:report.environment,film:{fullRawFilm:report.artifacts.video,fullFrameCount:rawFrames.length,startupPrefixFrameCount:readyIndex,readyTimestampMs:frames[0].presentationTimeMs,evaluatedFrameCount:frames.length,evaluatedThroughEof:true,finalTimestampMs:rawFrames.at(-1)?.presentationTimeMs??null,marker},canvasMaxStepPx:report.metrics.maxFrameStepPx,annotationStatus:report.actorAnalysis?.status,annotationPeak:report.actorAnalysis?.actors[0].metrics.maxStepAt60HzPx,pixel:{...pixel,samples:undefined},performanceDiagnostics:report.performanceDiagnostics,artifacts:report.artifacts});
    console.log(JSON.stringify({scenario,captureId:report.id,annotationStatus:report.actorAnalysis?.status,pixelStatus:pixel.status,pixelPeak:pixel.peak}));
  }
  await writeFile(path.resolve('artifacts/v2/actor-calibration/browser-verification.json'),JSON.stringify({status:'passed',scope:'Actual-browser native recordings of explicitly manual detector fixtures: seeded internal canvas jumps, smooth spoofed annotations, legitimate fast travel, explicit direct scrub, and missing-actor controls. These are not generated traces, an agent benchmark, or an ordinary/full repair campaign.',results},null,2));
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
