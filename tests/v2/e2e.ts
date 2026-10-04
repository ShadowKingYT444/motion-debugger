import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {exampleRecipes} from '../../src/examples/recipes';
import type {MotionCapture,MotionComparison} from '../../packages/core/types';

const port=4184,origin=`http://127.0.0.1:${port}`,artifactRoot=path.resolve('artifacts/v2/captures');
await mkdir(artifactRoot,{recursive:true});
const app=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let appLog='';app.stdout?.on('data',data=>appLog+=String(data));app.stderr?.on('data',data=>appLog+=String(data));
for(let i=0;i<80;i++){try{if((await fetch(`${origin}/api/health`)).ok)break}catch{};if(i===79)throw new Error(`No readiness: ${appLog}`);await new Promise(resolve=>setTimeout(resolve,250))}
const safetyServer=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  if(req.url?.startsWith('/boundary')){
    const continuous=req.url.includes('continuous');
    res.end(`<button id="retarget">Retarget</button><div id="boundary-target" style="width:40px;height:40px;background:#286b50;transform:translateX(0px)">Rig</div><script>
    const el=document.getElementById('boundary-target');
    const held=el.animate([{transform:'translateX(150px)'},{transform:'translateX(150px)'}],{duration:1,fill:'both'});
    document.getElementById('retarget').onclick=()=>{held.cancel();queueMicrotask(()=>el.animate([{transform:'translateX(${continuous?150:0}px)'},{transform:'translateX(300px)'}],{duration:1000,fill:'both',easing:'linear'}))};
    </script>`);return;
  }
  if(req.url==='/raf'){
    res.end(`<button id="start">Start motion</button><div id="raf-target" style="width:40px;height:40px;background:#286b50">Rig</div><script>
    document.getElementById('start').onclick=()=>{let start=null,blocked=false;const tick=t=>{start??=t;document.getElementById('raf-target').style.transform='translateX('+((t-start)*.2)+'px)';if(!blocked&&t-start>250){blocked=true;const until=performance.now()+40;while(performance.now()<until){}}requestAnimationFrame(tick)};requestAnimationFrame(tick)};
    </script>`);return;
  }
  res.end(req.url==='/private'?'<main data-motion-private>Test-only private marker</main>':'<details id="safe-target" data-state="ready" aria-busy="false" role="status" open><summary>Safe socket policy fixture</summary></details><script>new WebSocket("ws://example.invalid/prohibited")</script>');
});
await new Promise<void>(resolve=>safetyServer.listen(0,'127.0.0.1',resolve));
const safetyOrigin=`http://127.0.0.1:${(safetyServer.address() as {port:number}).port}`;
const transport=new StdioClientTransport({command:process.execPath,args:['build/mcp/index.js'],cwd:process.cwd(),env:{PATH:process.env.PATH??'',HOME:process.env.HOME??'',...(process.env.PLAYWRIGHT_BROWSERS_PATH?{PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH}:{}),...(process.env.CHROMIUM_PATH?{CHROMIUM_PATH:process.env.CHROMIUM_PATH}:{}),MOTION_ARTIFACT_DIR:artifactRoot,MOTION_ALLOWED_ORIGINS:`${origin},${safetyOrigin}`,MOTION_SOURCE_ROOTS:process.cwd()},stderr:'pipe'});
const client=new Client({name:'coding-agent-motion-workflow-test',version:'0.2.0'});
const results:unknown[]=[];
try {
  await client.connect(transport);assert.equal(client.getServerVersion()?.name,'motion-debugger');
  const tools=await client.listTools();assert.deepEqual(tools.tools.map(tool=>tool.name).sort(),['motion_capture','motion_compare','motion_frames','motion_inspect','motion_list','motion_probe','motion_recipe','motion_review']);
  const verifier=spawn(process.execPath,['src/examples/verify-examples.mjs'],{cwd:process.cwd(),env:{...process.env,BASE_URL:origin,QA_OUTPUT:'artifacts/qa/examples'},stdio:['ignore','pipe','pipe']});
  let verifierLog='';verifier.stdout?.on('data',data=>verifierLog+=String(data));verifier.stderr?.on('data',data=>verifierLog+=String(data));
  const verifierCode=await new Promise<number|null>(resolve=>verifier.on('exit',resolve));
  await writeFile('artifacts/v2/examples-verification.log',verifierLog);
  assert.equal(verifierCode,0,verifierLog);console.log(verifierLog);
  for(const [scenario,pair]of Object.entries(exampleRecipes(origin))) {
    const ids:string[]=[];
    for(const [version,recipe]of [['before',pair.before],['after',pair.after]] as const) {
      // A saturated shared runner can miss the unchanged 80ms evidence gate.
      // Retry only inadequate sampling, never a valid capture's failed motion contract.
      // Keep every attempt and its recording so the retry remains visible.
      let report:MotionCapture|undefined;
      const attempts:unknown[]=[];
      for(let attempt=1;attempt<=3;attempt++){
        const result=await client.callTool({name:'motion_capture',arguments:{recipe}},undefined,{timeout:45000});
        assert.notEqual(result.isError,true,JSON.stringify(result));
        const captured=result.structuredContent as {id:string};assert.ok(captured.id);
        const resource=await client.readResource({uri:`motion-evidence://capture/${captured.id}`});
        report=JSON.parse((resource.contents[0] as {text:string}).text) as MotionCapture;
        attempts.push({attempt,captureId:report.id,metrics:report.metrics,assertions:report.assertions});
        await writeFile(`artifacts/v2/${scenario}-${version}-attempts.json`,JSON.stringify(attempts,null,2));
        if(report.metrics.sufficientEvidence)break;
      }
      assert.ok(report?.metrics.sufficientEvidence,JSON.stringify(attempts));
      const data={id:report.id};ids.push(data.id);
      assert.ok(report.events.some(event=>event.origin==='app-annotated'&&event.source));
      assert.ok(report.assertions.find(a=>a.id==='browser-errors')?.passed);
      assert.ok(report.assertions.find(a=>a.id==='network-policy')?.passed);
      if(version==='before')assert.ok(report.assertions.some(a=>!a.passed),`${scenario} baseline must violate its intended temporal contract`);
      else assert.ok(report.assertions.every(a=>a.passed),JSON.stringify(report.assertions.filter(a=>!a.passed)));
      if(scenario==='kinetic'&&version==='before'){
        const filmstrip=await client.callTool({name:'motion_frames',arguments:{captureId:data.id,timestampsMs:[100,800,1250]}},undefined,{timeout:45000});
        assert.notEqual(filmstrip.isError,true,JSON.stringify(filmstrip));
        const images=(filmstrip.content as {type:string;data?:string}[]).filter(item=>item.type==='image');
        assert.equal(images.length,3);assert.ok(images.every(item=>Buffer.from(item.data!,'base64').subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))));
        assert.ok(new Set(images.map(item=>item.data)).size>1,'Recorded frames must reflect actual different video states');
        await writeFile('artifacts/v2/agent-frame-evidence.json',JSON.stringify(filmstrip.structuredContent,null,2));
      }
      const inspection=await client.callTool({name:'motion_inspect',arguments:{captureId:data.id,fromMs:0,toMs:600,includeSamples:true}});assert.notEqual(inspection.isError,true);
      results.push({scenario,version,captureId:data.id,assertions:report.assertions,metrics:report.metrics});
    }
    const comparisonResult=await client.callTool({name:'motion_compare',arguments:{beforeId:ids[0],afterId:ids[1]}});
    const comparison=comparisonResult.structuredContent as unknown as MotionComparison;
    assert.ok(comparison.comparable,JSON.stringify(comparison.comparabilityIssues));
    assert.equal(comparison.contractsPassed.before,false);assert.equal(comparison.contractsPassed.after,true);assert.ok(comparison.finalEquivalent,`${scenario} final state unchanged`);
    await writeFile(`artifacts/v2/${scenario}-comparison.json`,JSON.stringify(comparison,null,2));
    // Deliberately narrow detector/evidence ablation: final-state-only assertions vs temporal contracts, not an LLM trial.
    const beforeResource=await client.readResource({uri:`motion-evidence://capture/${ids[0]}`});
    const before=JSON.parse((beforeResource.contents[0] as {text:string}).text) as MotionCapture;
    const finalOnly=before.assertions.filter(a=>a.id.startsWith('final-'));
    assert.ok(finalOnly.length&&finalOnly.every(a=>a.passed));
    results.push({scenario,ablation:{withoutTemporalEvidence:'Final-state-only checks pass and miss the seeded transient defect',withTemporalEvidence:'Caller temporal contract fails on baseline and passes on repair',isLLMTrial:false,finalOnlyAssertions:finalOnly,comparison}});
  }
  const rafResult=await client.callTool({name:'motion_capture',arguments:{recipe:{url:safetyOrigin+'/raf',selector:'#raf-target',actions:[{action:'click',selector:'#start'},{action:'wait',ms:850}],durationMs:1100,contract:{maxStepAt60HzPx:5,maxSampleGapMs:80,final:{visible:true}}}}},undefined,{timeout:30000});
  assert.notEqual(rafResult.isError,true,JSON.stringify(rafResult));
  const rafData=rafResult.structuredContent as {id:string;assertions:{id:string;passed:boolean}[];metrics:{maxStepAt60HzPx:number}};
  assert.ok(rafData.assertions.every(a=>a.passed),JSON.stringify(rafData));
  await writeFile('artifacts/v2/raf-phase-regression.json',JSON.stringify(rafData,null,2));
  // Fresh direct browser witnesses, separate from the old false-negative trace.
  // The continuous case restores its canceled state from a queued microtask.
  for(const mode of ['reset','continuous']){
    const boundaryResult=await client.callTool({name:'motion_capture',arguments:{recipe:{url:safetyOrigin+'/boundary?'+mode,selector:'#boundary-target',actions:[{action:'click',selector:'#retarget'},{action:'wait',ms:750}],durationMs:1000,contract:{maxStepAt60HzPx:40,final:{visible:true}}}}},undefined,{timeout:30000});
    assert.notEqual(boundaryResult.isError,true,JSON.stringify(boundaryResult));
    const boundaryId=(boundaryResult.structuredContent as {id:string}).id;
    const raw=await client.readResource({uri:`motion-evidence://capture/${boundaryId}`});
    const boundaryReport=JSON.parse((raw.contents[0] as {text:string}).text) as MotionCapture;
    assert.ok((boundaryReport.metrics.animationBoundarySamples??0)>0,'Actual browser must provide operation-boundary evidence');
    assert.equal(boundaryReport.assertions.find(a=>a.id==='animation-boundary-step')?.passed,mode==='continuous');
    assert.ok(boundaryReport.assertions.find(a=>a.id==='browser-errors')?.passed);
    assert.ok(boundaryReport.assertions.find(a=>a.id==='network-policy')?.passed);
    await writeFile(`artifacts/v2/animation-boundary-${mode}.json`,JSON.stringify({captureId:boundaryId,metrics:boundaryReport.metrics,assertions:boundaryReport.assertions,events:boundaryReport.events.filter(e=>e.type==='animation-boundary')},null,2));
  }
  const socketResult=await client.callTool({name:'motion_capture',arguments:{recipe:{url:safetyOrigin+'/socket',selector:'#safe-target',actions:[],durationMs:700,contract:{final:{attributes:{'aria-busy':'false',open:'',role:'status'}}}}}},undefined,{timeout:30000});
  assert.notEqual(socketResult.isError,true,JSON.stringify(socketResult));
  const socketData=socketResult.structuredContent as {id:string;assertions:{id:string;passed:boolean}[]};
  assert.equal(socketData.assertions.find(a=>a.id==='network-policy')?.passed,false,'WebSocket attempt is blocked and reported');
  for(const key of ['aria-busy','open','role'])assert.equal(socketData.assertions.find(a=>a.id==='final-'+key)?.passed,true,'Observable accessibility/boolean state: '+key);
  const privateResult=await client.callTool({name:'motion_capture',arguments:{recipe:{url:safetyOrigin+'/private',selector:'main',actions:[],durationMs:700}}},undefined,{timeout:30000});
  assert.equal(privateResult.isError,true,'private-marked page is rejected without a successful recording report');
  results.push({security:{webSocketBlocked:true,privatePageRejected:true,socketCaptureId:socketData.id}});
  const listed=await client.callTool({name:'motion_list',arguments:{}});assert.notEqual(listed.isError,true);
  await writeFile('artifacts/v2/workflow-verification.json',JSON.stringify({transport:'actual MCP stdio, official SDK client',tools:tools.tools.map(t=>t.name),results},null,2));
  console.log(JSON.stringify({passed:true,scenarios:Object.keys(exampleRecipes(origin)).length,realCaptures:Object.keys(exampleRecipes(origin)).length*2,transport:'stdio',artifactRoot},null,2));
}finally {
  await client.close();safetyServer.close();app.kill('SIGTERM');await writeFile('artifacts/v2/server.log',appLog);
}
