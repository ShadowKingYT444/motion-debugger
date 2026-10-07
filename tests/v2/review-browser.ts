import {createServer} from 'node:http';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {capture} from '../../packages/core/capture';
import {motionReview,reviewRecipe} from '../../packages/core/review';
import {motionProbe} from '../../packages/core/replay';
import type {TransitionPlan} from '../../packages/core/transitions';

const server=createServer((_req,res)=>{
  res.setHeader('Content-Type','text/html');
  res.end(`<!doctype html><style>body{margin:0}#scene{width:320px;height:240px;background:#e8edf1}#part{position:absolute;top:80px;left:20px;width:24px;height:24px;background:#22aa88}#scrub{width:280px;height:40px;touch-action:none;background:#ddd}</style><button id="go">Run seeded reset</button><div id="scene"><div id="part"></div></div><div id="scrub" tabindex="0">Native held input</div><output id="state">Ready</output><script>go.onclick=()=>{setTimeout(()=>{part.style.left='260px';state.textContent='Complete'},400)};scrub.onpointerdown=e=>scrub.setPointerCapture(e.pointerId);scrub.onpointercancel=()=>{state.textContent='Canceled'};</script>`);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`,artifactRoot=path.resolve('artifacts/v2/review/captures');await mkdir(artifactRoot,{recursive:true});
const pose=(x:number)=>({position:{x,y:80,unit:'css-px' as const,space:'screen' as const}});
const plan:TransitionPlan={schemaVersion:1,id:'seeded-dom-reset',clock:'browser-monotonic-ms',actors:[{id:'part',binding:{kind:'dom',selector:'#part'},sources:[{file:'fixture.html',line:1}],protectedAttributes:['material','geometry']}],beats:[{id:'open',actorIds:['part'],trigger:'click #go',purpose:'Follow the same part',from:pose(20),to:pose(260),after:[],overlapMs:0,durationMs:700}],inputPolicy:{mode:'retarget',winner:'latest-input',carry:'position-and-velocity'},acceptance:{usefulCompletion:'Complete',forbiddenVisible:['#error'],reducedMotion:'meaningful-final-pose',actors:[{actorId:'part',destination:pose(260),positionToleranceCssPx:2,orientationToleranceRad:0,maxStepAt60HzPx:12,maxResponseMs:700,maxSettlingMs:1000,requiredTravelCssPx:20,continuity:'position',identityRequired:true}]},edits:{permittedFiles:['motion.js'],protectedFiles:['fixture.html'],parameters:['spring-response']}};
const recipe={url:origin,selector:'#scene',durationMs:1400,viewport:{width:320,height:320},actors:[{id:'part',kind:'dom' as const,selector:'#part',acceptance:{continuity:'position' as const,inputPolicy:'retarget' as const,maxStepAt60HzPx:12,maxReplacements:0,minTravelPx:20,destination:{x:260,y:80,tolerancePx:2,deadlineMs:1300,settleMs:50}}}],actions:[{action:'wait' as const,ms:100},{action:'click' as const,selector:'#go'}],contract:{maxFrameStepPx:.001,outcomes:{required:[{id:'completed',selector:'#state',textIncludes:'Complete'}],forbiddenVisible:['#error']}}};
const proofs=[];
try{
  const request={plan,recipe,budget:{maxFrames:6,detailActorId:'part'}};
  for(const entry of ['build/mcp/index.js','plugin/motion-debugger/scripts/mcp.mjs']){
    const client=new Client({name:'review-native-sdk-calibration',version:'1'});
    await client.connect(new StdioClientTransport({command:process.execPath,args:[entry],env:{PATH:process.env.PATH??'',MOTION_ARTIFACT_DIR:artifactRoot},stderr:'pipe'}));
    try{
      const result=await client.callTool({name:'motion_review',arguments:request});assert.notEqual(result.isError,true,JSON.stringify(result));
      const metadata=result.structuredContent as any,images=(result.content as Array<{type:string;data?:string}>).filter(block=>block.type==='image');
      assert.equal(metadata.summary.outcome,'failed');assert.equal(metadata.summary.functionalDelivery,'passed');assert.equal(metadata.capture.metrics.maxFrameStepPx,0);
      assert.equal(metadata.transitions[0].status,'failed');assert.ok(metadata.transitions[0].windows.some((window:any)=>window.type==='position-step'));
      assert.ok(images.length>=2&&images.length<=6);assert.equal(metadata.cost.imageCount,images.length);assert.ok(metadata.evidence.frames.some((frame:any)=>frame.kind==='detail'));
      for(const [index,block] of images.entries()){assert.equal(block.type,'image');if(block.type==='image')assert.equal(createHash('sha256').update(Buffer.from(block.data!,'base64')).digest('hex'),metadata.cost.deliveredPngSha256[index]);}
      const reused=await client.callTool({name:'motion_review',arguments:{...request,captureId:metadata.captureId}});assert.notEqual(reused.isError,true);assert.equal((reused.structuredContent as any).cost.decodeCacheHit,true);assert.equal((reused.structuredContent as any).cost.captureAttempts,0);
      const altered=await client.callTool({name:'motion_review',arguments:{...request,captureId:metadata.captureId,recipe:{...recipe,actions:[]}}});assert.equal(altered.isError,true);
      proofs.push({entry,captureId:metadata.captureId,summary:metadata.summary,cost:metadata.cost,frames:metadata.evidence.frames,packet:metadata.packet});
    }finally{await client.close()}
  }
  const grid=await motionProbe({recipe,beforeActionIndex:1,offsetsMs:[100,10],maxTotalCaptureMs:2800},{artifactRoot});assert.equal(grid.attempts.length,2);assert.ok(grid.attempts.every(attempt=>attempt.status==='failed'));
  const gesture=await capture({url:origin,selector:'#scene',durationMs:1400,viewport:{width:390,height:844},actions:[{action:'drag',selector:'#scrub',points:[{x:.2,y:.5},{x:.8,y:.5},{x:.3,y:.5}],durationMs:300,end:'cancel'},{action:'resize',width:420,height:844},{action:'reduced-motion',value:'reduce'}],contract:{outcomes:{required:[{id:'cancel',selector:'#state',textIncludes:'Canceled'}]}}},{artifactRoot});
  assert.ok(gesture.events.some(event=>event.type==='pointercancel'&&event.detail.trusted===true));assert.equal(gesture.delivery?.status,'passed');assert.ok(gesture.events.some(event=>event.type==='resize'));assert.ok(gesture.events.some(event=>event.type==='reduced-motion'));
  const proof={status:'passed',scope:'Actual Chromium + official SDK clients for built npm and standalone MCP endpoints, native review PNG delivery/cache/reuse rejection, non-monotonic interruption grid and native touch cancellation/resize/reduced motion; not native agent host verification',proofs,grid,gesture:{id:gesture.id,delivery:gesture.delivery,events:gesture.events,environment:gesture.environment}};
  await writeFile(path.resolve('artifacts/v2/review/browser-verification.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({status:'passed',proofs:proofs.map(proof=>({entry:proof.entry,captureId:proof.captureId,imageCount:proof.cost.imageCount})),gesture:gesture.id,grid:grid.attempts.map(attempt=>attempt.status)}));
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
