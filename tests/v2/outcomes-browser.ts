import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {capture,compact,CaptureFailureError} from '../../packages/core/capture';
import type {CaptureRecipe} from '../../packages/core/types';

// Seeded outcome fixtures and handwritten repairs. Actual Chromium checks; no agent benchmark.
const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  res.end(`<button id="run">Run task</button><div id="target" style="width:40px;height:40px;background:green">Stable</div><div id="result" data-state="pending">Pending</div><div id="error" hidden></div><script>
    document.querySelector('#run').onclick=()=>{
      ${req.url==='/caught'?`setTimeout(()=>{try {const bad=document.createElement;bad('div')}catch(error){document.querySelector('#error').hidden=false;document.querySelector('#error').textContent=error.message;setTimeout(()=>document.querySelector('#error').hidden=true,25)}document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},120);`:req.url==='/missing'?`document.querySelector('#result').remove();`:req.url==='/ambiguous'?`setTimeout(()=>{const other=document.createElement('div');other.id='result';other.textContent='Ready';other.dataset.state='complete';document.body.append(other);document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},120);`:req.url==='/late'?`setTimeout(()=>{document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},450);`:`setTimeout(()=>{document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},120);`}
    };
  </script>`);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const artifactRoot='artifacts/v2/outcomes/captures';await mkdir(artifactRoot,{recursive:true});
const results=[];
try {
  for(const scenario of ['caught','missing','ambiguous','late','actions-late','valid','exploratory']){
    const recipe:CaptureRecipe={url:`${origin}/${scenario}`,selector:'#target',durationMs:650,viewport:{width:640,height:480},actions:[{action:'click',selector:'#run'},...(scenario==='actions-late'?[{action:'wait' as const,ms:300}]:[])],contract:{maxFrameStepPx:2,maxSampleGapMs:80,...(scenario==='exploratory'?{}:{outcomes:{timeoutMs:scenario==='late'||scenario==='actions-late'?300:650,required:[{id:'result',selector:'#result',visible:true,textIncludes:'Ready',attributes:{'data-state':'complete'}}],forbiddenVisible:['#error']}})}};
    const started=performance.now(),report=await capture(recipe,{artifactRoot}),wallMs=performance.now()-started;
    assert.ok(report.assertions.find(a=>a.id==='browser-errors')?.passed,'Caught app failures are not uncaught page errors');
    assert.equal(report.metrics.maxFrameStepPx,0,'Stable geometry does not establish successful completion');
    assert.equal(report.delivery?.status,scenario==='valid'?'passed':scenario==='exploratory'?'unverified':'failed',JSON.stringify(report.delivery));
    assert.equal(compact(report).delivery.status,report.delivery?.status);
    if(scenario==='caught'){
      assert.equal(report.delivery?.forbiddenVisible.length,1,'Persist transient caught errors even after their UI disappears');
      assert.match(report.delivery!.forbiddenVisible[0].text,/Illegal invocation/i);
      assert.equal(report.delivery!.required[0].passed,true,'Valid result cannot override a caught visible error');
    }
    if(scenario==='missing'){assert.equal(report.delivery!.required[0].passed,false);assert.equal(report.delivery!.required[0].count,0);}
    if(scenario==='actions-late')assert.match(report.delivery!.reasons.join(' '),/Actions completed after/);
    if(scenario==='ambiguous')assert.equal(report.delivery!.required[0].count,2);
    if(scenario==='late')assert.equal(report.delivery!.required[0].passed,false,'Completion after outcome deadline does not pass');
    assert.ok(report.delivery!.elapsedMs<=900,'Outcome waits stay inside capture window; recording finalization is separate');
    results.push({scenario,id:report.id,wallMs,environment:report.environment,delivery:report.delivery,metrics:report.metrics,artifacts:report.artifacts});
    console.log(JSON.stringify({scenario,delivery:report.delivery,wallMs}));
  }
  await assert.rejects(()=>capture({url:`${origin}/valid`,selector:'#target',durationMs:500,actions:[{action:'wait',ms:700}],contract:{outcomes:{required:[{id:'result',selector:'#result',textIncludes:'Ready'}]}}},{artifactRoot}),error=>error instanceof CaptureFailureError&&error.evidence.delivery?.status==='failed'&&/capture deadline/.test(error.message));
  await writeFile('artifacts/v2/outcomes/browser-verification.json',JSON.stringify({status:'passed',scope:'Actual Chromium seeded task outcomes and caught native Illegal invocation; explicit fixture repairs, not agent benchmark',results},null,2));
}finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
