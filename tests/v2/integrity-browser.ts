import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {capture} from '../../packages/core/capture';
import {analyze} from '../../packages/core/analysis';
import type {MotionCapture} from '../../packages/core/types';

// Trusted local fixtures with explicit defects: late target insertion and app
// marks that reuse browser event names. Measurements come only from Chromium.
const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  if(req.url==='/late')res.end(`<button id="run">Insert late target</button><script>
    document.querySelector('button').onclick=()=>setTimeout(()=>{const el=document.createElement('div');el.id='target';el.textContent='Ready';el.style.cssText='width:40px;height:40px;background:green';document.body.append(el)},200);
  </script>`);
  else res.end(`<button id="run">Emit annotations${req.url==='/observed'?' and cancel animation':''}</button><div id="target" style="width:40px;height:40px;background:green">Ready</div><script>
    document.querySelector('button').onclick=()=>{
      for(const type of ['animation-start','animationstart','animation-cancel'])window.dispatchEvent(new CustomEvent('motion:mark',{detail:{type,label:'Explicit fixture annotation',state:{active:true}}}));
      ${req.url==='/observed'?"const animation=document.querySelector('#target').animate([{opacity:1},{opacity:1}],{duration:6000});setTimeout(()=>animation.cancel(),50);":''}
    };
  </script>`);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const artifactRoot=path.resolve('artifacts/v2/integrity/captures');
await mkdir(artifactRoot,{recursive:true});
const reports:MotionCapture[]=[];
try {
  for(const scenario of ['late','annotations','observed']){
    const report=await capture({url:`${origin}/${scenario}`,selector:'#target',actions:[{action:'click',selector:'#run'}],durationMs:1000,contract:{maxSampleGapMs:80,maxActiveCancels:0,final:{visible:true}}},{artifactRoot});
    reports.push(report);
    assert.ok(report.assertions.find(a=>a.id==='browser-errors')?.passed);
    assert.ok(report.assertions.find(a=>a.id==='network-policy')?.passed);
    assert.ok(report.assertions.find(a=>a.id==='final-visible')?.passed);
    const observed=report.events.filter(e=>e.origin==='browser-observed');
    if(scenario==='late'){
      const finite=report.samples.filter(s=>s.nodeId!==null);
      assert.ok(finite.length>=20,'Enough late samples to reproduce old false pass');
      assert.ok(finite[0].t>80,'Measured missing initial trajectory');
      assert.ok(finite.at(-1)!.t>=900);
      assert.ok(report.metrics.maxSampleGapMs<=80,'Opening coverage fails independently of later cadence');
      assert.equal(report.metrics.sufficientEvidence,false);
      assert.equal(report.assertions.find(a=>a.id==='valid-trajectory')?.passed,false);
    }else{
      assert.ok(report.metrics.sufficientEvidence,JSON.stringify(report.assertions));
      assert.equal(report.events.filter(e=>e.origin==='app-annotated').length,3);
      assert.equal(report.metrics.animationStarts,scenario==='observed'?1:0);
      assert.equal(report.metrics.activeCancels,scenario==='observed'?1:0);
      assert.equal(report.assertions.find(a=>a.id==='active-cancels')?.passed,scenario==='annotations');
      for(const finding of report.findings.filter(f=>f.type==='active-animation-cancel'))assert.ok(finding.eventIds.every(id=>observed.some(e=>e.id===id&&e.type==='animation-cancel')));
    }
    // Deterministic reanalysis of actual recorded input, preserving provenance.
    assert.deepEqual(analyze(report.samples,report.events,report.recipe,report.final).metrics,report.metrics);
    console.log(JSON.stringify({scenario,captureId:report.id,metrics:report.metrics,failedAssertions:report.assertions.filter(a=>!a.passed)}));
  }
  const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  await writeFile('artifacts/v2/integrity/browser-verification.json',JSON.stringify({commit,dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),browser:reports[0].environment.browser,passed:true,captures:reports.map(r=>({id:r.id,url:r.recipe.url,report:r.artifacts.report,metrics:r.metrics,assertions:r.assertions})),limitations:['Local seeded fixtures, not historical AER recaptures or an agent benchmark.','Late target insertion intentionally fails trajectory integrity; real cancellation intentionally fails its supplied budget.']},null,2));
}finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
