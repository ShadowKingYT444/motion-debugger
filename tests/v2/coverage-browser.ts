import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {capture} from '../../packages/core/capture';

// Seeded diagnostic fixtures. All evidence below is read from actual Chromium.
const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  const scenario=req.url;
  res.end(`<button id="run">Run lifecycle</button><div id="target" style="width:40px;height:40px;background:green">Ready</div><script>
    const target=document.querySelector('#target');
    document.querySelector('button').onclick=()=>{
      ${scenario==='/remove'?"setTimeout(()=>target.remove(),200);setTimeout(()=>document.body.append(target),600);":scenario==='/hidden'?"setTimeout(()=>target.style.display='none',200);setTimeout(()=>target.style.display='',600);":"setTimeout(()=>{const end=performance.now()+150;while(performance.now()<end){}},300);"}
    };
  </script>`);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const artifactRoot='artifacts/v2/coverage/captures';await mkdir(artifactRoot,{recursive:true});
const results=[];
try {
  for(const scenario of ['remove','hidden','stall']){
    const report=await capture({url:`${origin}/${scenario}`,selector:'#target',durationMs:1400,actions:[{action:'click',selector:'#run'}],contract:{targetPresence:'may-disappear',maxSampleGapMs:80,maxFrameStepPx:2,final:{visible:true}}},{artifactRoot});
    assert.ok(report.assertions.find(a=>a.id==='browser-errors')?.passed);
    assert.ok(report.assertions.find(a=>a.id==='final-visible')?.passed);
    if(scenario==='stall'){
      assert.equal(report.coverage?.cadenceSufficient,false);
      assert.equal(report.assertions.find(a=>a.id==='frame-step')?.status,'inconclusive');
      assert.ok(report.metrics.maxSampleGapMs>80||report.metrics.maxObservedSampleGapMs!>80||report.metrics.maxObservationLagMs!>80);
    }else{
      assert.equal(report.coverage?.cadenceSufficient,true,JSON.stringify(report.coverage));
      assert.equal(report.metrics.sufficientEvidence,true);
      assert.equal(report.metrics.replacements,0,'Removing and reinserting the same DOM node is not a replacement');
      assert.ok(scenario==='remove'?report.metrics.absentSamples!>0:report.metrics.hiddenSamples!>0);
      assert.equal(report.metrics.maxFrameStepPx,0,'Do not bridge target lifecycle boundaries');
    }
    results.push({scenario,id:report.id,environment:report.environment,metrics:report.metrics,coverage:report.coverage,assertions:report.assertions,artifacts:report.artifacts});
    console.log(JSON.stringify({scenario,metrics:report.metrics,coverage:report.coverage}));
  }
  await writeFile('artifacts/v2/coverage/browser-verification.json',JSON.stringify({status:'passed',scope:'Actual browser lifecycle and explicit 150ms main-thread-stall fixtures; no agent benchmark',results},null,2));
}finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
