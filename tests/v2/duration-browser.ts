import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {capture,CaptureFailureError,compact} from '../../packages/core/capture';
import type {CaptureRecipe} from '../../packages/core/types';

const root=path.resolve('artifacts/v2/duration',new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(root,{recursive:true});
const hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const fixture='<!doctype html><html><body><div id="target" style="width:80px;height:80px;background:#65edbb">Ready</div><button id="blocked" style="pointer-events:none">Blocked</button></body></html>';
await writeFile(path.join(root,'fixture.html'),fixture);
const sources:Record<string,{sha256:string;bytes:number}>={};
for(const file of ['tests/v2/duration-browser.ts','packages/core/capture.ts','packages/core/safety.ts']){const bytes=await readFile(file);await mkdir(path.dirname(path.join(root,'source',file)),{recursive:true});await writeFile(path.join(root,'source',file),bytes);sources[file]={sha256:hash(bytes),bytes:bytes.length};}
const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(fixture);});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const proof:any={createdAt:new Date().toISOString(),fixtureSha256:hash(fixture),sources,checks:[],status:'running'};
try{
 for(const scenario of ['long-wait','blocked-click','bounded-exploratory']){
  const recipe:CaptureRecipe={url,selector:'#target',durationMs:600,viewport:{width:640,height:480},actions:scenario==='long-wait'?[{action:'wait',ms:1500}]:scenario==='blocked-click'?[{action:'click',selector:'#blocked'}]:[{action:'wait',ms:100}],contract:{final:{visible:true}}};
  await writeFile(path.join(root,scenario+'-recipe.json'),JSON.stringify(recipe,null,2));
  let report;
  try{report=await capture(recipe,{artifactRoot:path.join(root,'captures')});assert.equal(scenario,'bounded-exploratory','Over-budget interaction must not return completed evidence');assert.equal(report.status,undefined);assert.equal(report.delivery?.status,'unverified');}
  catch(error){if(!(error instanceof CaptureFailureError))throw error;assert.notEqual(scenario,'bounded-exploratory');report=error.evidence;assert.equal(report.status,'incomplete');assert.equal(report.failure?.stage,'interaction');assert.equal(report.failure?.actionIndex,0);assert.ok((report.failure?.elapsedMs??Infinity)<1600,'Interaction respects its declared deadline rather than an unrelated 3-second click timeout');assert.ok(report.assertions.every(item=>!item.passed));}
  const bytes=await readFile(report.artifacts.video);assert.ok(bytes.length>1000);proof.checks.push({scenario,expectedFailure:scenario!=='bounded-exploratory',passed:true,report:compact(report),video:{bytes:bytes.length,sha256:hash(bytes)}});
 }
 proof.status='passed';
}catch(error){proof.status='failed';proof.error=error instanceof Error?error.stack:String(error);throw error;}
finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await writeFile(path.join(root,'verification.json'),JSON.stringify(proof,null,2));await writeFile(path.resolve('artifacts/v2/duration/browser-verification.json'),JSON.stringify(proof,null,2));console.log(root);}
