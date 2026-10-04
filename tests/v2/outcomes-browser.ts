import {createServer} from 'node:http';
import {mkdir,writeFile,readFile,realpath,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {capture,compact,CaptureFailureError} from '../../packages/core/capture';
import type {CaptureRecipe,MotionCapture} from '../../packages/core/types';

// Seeded outcome fixtures and handwritten repairs. Actual Chromium checks; no agent benchmark.
const artifactDirectory=path.resolve('artifacts/v2/outcomes'),runId=new Date().toISOString().replace(/[:.]/g,'-'),runRoot=path.join(artifactDirectory,runId),artifactRoot=path.join(runRoot,'captures');
await mkdir(artifactRoot,{recursive:true});
const sha=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
const scenarios=['caught','missing','ambiguous','late','actions-late','valid','exploratory'];
const fixtureHtml=(scenario:string)=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Seeded outcome fixture: ${scenario}</title><button id="run">Run task</button><div id="target" style="width:40px;height:40px;background:green">Stable</div><div id="result" data-state="pending">Pending</div><div id="error" hidden></div><script>
    document.querySelector('#run').onclick=()=>{
      ${scenario==='caught'?`setTimeout(()=>{try {const bad=document.createElement;bad('div')}catch(error){document.querySelector('#error').hidden=false;document.querySelector('#error').textContent=error.message;setTimeout(()=>document.querySelector('#error').hidden=true,25)}document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},120);`:scenario==='missing'?`document.querySelector('#result').remove();`:scenario==='ambiguous'?`setTimeout(()=>{const other=document.createElement('div');other.id='result';other.textContent='Ready';other.dataset.state='complete';document.body.append(other);document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},120);`:scenario==='late'?`setTimeout(()=>{document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},450);`:`setTimeout(()=>{document.querySelector('#result').textContent='Ready';document.querySelector('#result').dataset.state='complete'},120);`}
    };
  </script></html>`;
const fixtures=new Map(scenarios.map(scenario=>[scenario,Buffer.from(fixtureHtml(scenario))]));
await mkdir(path.join(runRoot,'fixtures'),{recursive:true});
for(const[scenario,bytes]of fixtures)await writeFile(path.join(runRoot,'fixtures',`${scenario}.html`),bytes);
const sourceFiles=['tests/v2/outcomes-browser.ts','packages/core/capture.ts','packages/core/analysis.ts','packages/core/browser-probe.ts','packages/core/coverage.ts','packages/core/safety.ts','packages/core/types.ts','server/browser.ts','server/recording.ts','package.json','package-lock.json'];
const sourceHashes:Record<string,{sha256:string;bytes:number}>={};
for(const name of sourceFiles){const bytes=await readFile(name);sourceHashes[name]={sha256:sha(bytes),bytes:bytes.length};const file=path.join(runRoot,'source',name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);}
const runtimeSource=[capture,compact].map(fn=>fn.toString()).join('\n');await writeFile(path.join(runRoot,'capture-runtime-functions.txt'),runtimeSource);
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),node:process.version,playwright:JSON.parse(await readFile('node_modules/playwright/package.json','utf8')).version,sourceFiles:sourceHashes,captureRuntimeFunctionsSha256:sha(runtimeSource),fixtures:Object.fromEntries([...fixtures].map(([scenario,bytes])=>[scenario,{file:`fixtures/${scenario}.html`,sha256:sha(bytes),bytes:bytes.length}]))};
await writeFile(path.join(runRoot,'provenance.json'),JSON.stringify(provenance,null,2));
const server=createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return;}
  if(req.headers.host!==`127.0.0.1:${(server.address() as {port:number}).port}`){res.writeHead(403);res.end();return;}
  const fixture=fixtures.get(new URL(req.url??'/','http://127.0.0.1').pathname.slice(1));
  if(!fixture){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Length',fixture.length);
  res.end(req.method==='HEAD'?undefined:fixture);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const results:Record<string,unknown>[]=[];let failure:unknown;
async function saveRecipe(name:string,recipe:CaptureRecipe){const bytes=JSON.stringify(recipe,null,2)+'\n',file=`recipes/${name}.json`;await mkdir(path.join(runRoot,'recipes'),{recursive:true});await writeFile(path.join(runRoot,file),bytes);return {file,sha256:sha(bytes),bytes:Buffer.byteLength(bytes)};}
async function captureArtifacts(artifacts:Record<string,unknown>){const files:Record<string,{file:string;sha256:string;bytes:number}>={};for(const key of ['report','video','rawVideo','poster','finalScreenshot']){const value=artifacts[key];if(typeof value!=='string'||!value)continue;const absolute=path.resolve(value);if(!absolute.startsWith(artifactRoot+path.sep)||await realpath(absolute)!==absolute||!(await lstat(absolute)).isFile())throw new Error(`Unexpected capture artifact: ${key}`);const bytes=await readFile(absolute);files[key]={file:path.relative(runRoot,absolute),sha256:sha(bytes),bytes:bytes.length};}return files;}
try {
  for(const scenario of scenarios){
    const recipe:CaptureRecipe={url:`${origin}/${scenario}`,selector:'#target',durationMs:650,viewport:{width:640,height:480},actions:[{action:'click',selector:'#run'},...(scenario==='actions-late'?[{action:'wait' as const,ms:300}]:[])],contract:{maxFrameStepPx:2,maxSampleGapMs:80,...(scenario==='exploratory'?{}:{outcomes:{timeoutMs:scenario==='late'||scenario==='actions-late'?300:650,required:[{id:'result',selector:'#result',visible:true,textIncludes:'Ready',attributes:{'data-state':'complete'}}],forbiddenVisible:['#error']}})}};
    const inputRecipe=await saveRecipe(scenario,recipe),served=await fetch(recipe.url);assert.equal(served.status,200);assert.equal(sha(Buffer.from(await served.arrayBuffer())),provenance.fixtures[scenario].sha256,'Served fixture bytes match the archived source');
    const started=performance.now();let report:MotionCapture;
    try{report=await capture(recipe,{artifactRoot});}catch(error){if(error instanceof CaptureFailureError){results.push({scenario,id:error.evidence.id,fixture:provenance.fixtures[scenario],inputRecipe,effectiveRecipe:await saveRecipe(`${scenario}-effective`,error.evidence.recipe),unexpectedCaptureFailure:error.message,environment:error.evidence.environment,delivery:error.evidence.delivery,artifacts:error.evidence.artifacts,artifactFiles:await captureArtifacts(error.evidence.artifacts)});}throw error;}
    const wallMs=performance.now()-started;
    results.push({scenario,id:report.id,fixture:provenance.fixtures[scenario],inputRecipe,effectiveRecipe:await saveRecipe(`${scenario}-effective`,report.recipe),wallMs,environment:report.environment,delivery:report.delivery,metrics:report.metrics,artifacts:report.artifacts,artifactFiles:await captureArtifacts(report.artifacts)});
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
    console.log(JSON.stringify({scenario,delivery:report.delivery,wallMs}));
  }
  const deadlineRecipe:CaptureRecipe={url:`${origin}/valid`,selector:'#target',durationMs:500,actions:[{action:'wait',ms:700}],contract:{outcomes:{required:[{id:'result',selector:'#result',textIncludes:'Ready'}]}}},inputRecipe=await saveRecipe('capture-deadline',deadlineRecipe);
  let deadlineError:CaptureFailureError|undefined;
  try{await capture(deadlineRecipe,{artifactRoot});}catch(error){if(!(error instanceof CaptureFailureError))throw error;deadlineError=error;}
  assert.ok(deadlineError,'An overlong action must fail the capture deadline');
  results.push({scenario:'capture-deadline',id:deadlineError.evidence.id,fixture:provenance.fixtures.valid,inputRecipe,effectiveRecipe:await saveRecipe('capture-deadline-effective',deadlineError.evidence.recipe),expectedCaptureFailure:deadlineError.message,environment:deadlineError.evidence.environment,delivery:deadlineError.evidence.delivery,artifacts:deadlineError.evidence.artifacts,artifactFiles:await captureArtifacts(deadlineError.evidence.artifacts)});
  assert.equal(deadlineError.evidence.delivery?.status,'failed');assert.match(deadlineError.message,/capture deadline/);
}catch(error){failure=error;}
finally {await new Promise<void>(resolve=>server.close(()=>resolve()));const report=JSON.stringify({status:failure?'failed':'passed',runId,scope:'Actual Chromium seeded task outcomes and caught native Illegal invocation; archived exact served fixtures and handwritten repairs, not an agent benchmark',origin,provenance,results,error:failure instanceof Error?failure.stack:failure},null,2);await writeFile(path.join(runRoot,'browser-verification.json'),report);await writeFile(path.join(artifactDirectory,'browser-verification.json'),report);}
if(failure)throw failure;
console.log(JSON.stringify({status:'passed',report:path.join(runRoot,'browser-verification.json'),scenarios:results.map(result=>result.scenario)},null,2));
