import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readdir,readFile,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createMotionServer} from '../../packages/mcp/server';
import {recordedFrames} from '../../packages/core/frames';
import {inspect} from '../../packages/core/capture';

// Actual unforced browser clicks: visible geometry is deliberately not pointer clickability.
test('failed Undo keeps incomplete decodable evidence through MCP; privacy and security rejections purge pixels',{timeout:90000},async t=>{
  const artifactRoot=await mkdtemp(path.join(tmpdir(),'motion-failure-evidence-'));
  const server=createServer((req,res)=>{
    const scenario=req.url;
    res.setHeader('Content-Type','text/html');
    res.end(`<!doctype html><html><body>
      ${scenario==='/sensitive'?'<input type="password" value="fixture secret">':''}
      <button id="remove">Remove</button>
      <div id="target" style="width:120px;height:50px;background:green">Quantity: 2</div>
      <button id="undo" style="pointer-events:none">Undo</button>
      <script>document.querySelector('#remove').onclick=()=>{
        document.querySelector('#target').textContent='Removed';
        const undo=document.querySelector('#undo'),rect=undo.getBoundingClientRect(),style=getComputedStyle(undo);
        window.dispatchEvent(new CustomEvent('motion:mark',{detail:{type:'removed',label:'Item removed',state:{quantity:0,undoWidth:rect.width,undoHeight:rect.height,undoPointerEvents:style.pointerEvents,undoVisibility:style.visibility}}}));
        ${scenario==='/late-private'?"document.body.insertAdjacentHTML('beforeend','<div data-motion-private>private fixture</div>');":''}
        ${scenario==='/network-rejection'?"fetch('https://example.com/blocked').catch(()=>{});":''}
      };document.querySelector('#undo').onclick=()=>document.querySelector('#target').textContent='Quantity: 2';</script>
    </body></html>`);
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const mcp=createMotionServer({artifactRoot});
  const client=new Client({name:'failure-evidence-browser-regression',version:'1'});
  const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
  await mcp.connect(serverTransport);await client.connect(clientTransport);
  t.after(async()=>{await client.close();await mcp.close();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(artifactRoot,{recursive:true,force:true})});
  const recipe=(scenario:string)=>({url:`${origin}/${scenario}`,selector:'#target',durationMs:600,viewport:{width:640,height:480},actions:[{action:'click',selector:'#remove'},{action:'wait',ms:50},{action:'click',selector:'#undo'}],contract:{final:{textIncludes:'Quantity: 2'}}});
  const failed=await client.callTool({name:'motion_capture',arguments:{recipe:recipe('undo')}});
  assert.equal(failed.isError,true);
  const compact=failed.structuredContent as any;
  assert.equal(compact.status,'incomplete');assert.equal(compact.failure.stage,'interaction');
  assert.equal(compact.failure.actionIndex,2);assert.equal(compact.failure.action,'click');assert.equal(compact.failure.selector,'#undo');
  assert.ok(compact.failure.elapsedMs>=500&&compact.failure.elapsedMs<1600,'Blocked input uses the declared 600ms interaction window rather than an unrelated 3-second timeout');assert.equal(compact.metrics.sufficientEvidence,false);
  assert.ok(compact.assertions.every((assertion:any)=>!assertion.passed));
  assert.equal(compact.evidence.finalScreenshot,'');
  const report=await inspect(compact.id,{artifactRoot});
  const removed=report.events.find(event=>event.type==='removed');
  assert.ok(removed,'Successful earlier actions retain actual app event');
  assert.ok(Number(removed.detail.undoWidth)>0&&Number(removed.detail.undoHeight)>0);
  assert.equal(removed.detail.undoVisibility,'visible');assert.equal(removed.detail.undoPointerEvents,'none');
  assert.equal(report.events.filter(event=>event.type==='click').length,1,'Only the successful Remove dispatches a real click; Undo is not forced');
  assert.ok(report.samples.length>0,'Actual prior browser samples survive click failure');
  const images=await recordedFrames(report.id,{artifactRoot},[100]);
  assert.equal(images.frames.length,1);assert.ok(images.frames[0].png.length>100);assert.ok(images.frames[0].width>0);
  const listed=(await client.callTool({name:'motion_list',arguments:{}})).structuredContent as any;
  assert.deepEqual(listed.captures.map(({id,status,passed}:any)=>({id,status,passed})),[{id:report.id,status:'incomplete',passed:false}]);
  const inspected=await client.callTool({name:'motion_inspect',arguments:{captureId:report.id,includeSamples:true}});
  assert.notEqual(inspected.isError,true);assert.equal((inspected.structuredContent as any).status,'incomplete');
  const resource=await client.readResource({uri:`motion-evidence://capture/${report.id}`});
  assert.equal(JSON.parse((resource.contents[0] as any).text).status,'incomplete');
  const comparisons=await client.callTool({name:'motion_compare',arguments:{beforeId:report.id,afterId:report.id}});
  assert.notEqual(comparisons.isError,true);assert.equal((comparisons.structuredContent as any).comparable,false);
  const summary:any={status:'passed',createdAt:new Date().toISOString(),environment:report.environment,artifactLifecycle:'Isolated fixture artifacts are cleaned after this regression; IDs document the verified run, not persistent captures.',scope:'Actual Chromium unforced pointer-events:none Undo timeout, video decode, MCP error/list/inspect/resource discoverability and privacy/security purge',retained:{id:report.id,failure:report.failure,eventCount:report.events.length,sampleCount:report.samples.length,decodedFrame:{width:images.frames[0].width,height:images.frames[0].height,sha256:images.frames[0].sha256}},rejected:[]};
  for(const scenario of ['sensitive','late-private','network-rejection']){
    const previous=new Set(await readdir(artifactRoot));
    const rejected=await client.callTool({name:'motion_capture',arguments:{recipe:recipe(scenario)}});
    assert.equal(rejected.isError,true);assert.equal(rejected.structuredContent,undefined);
    const [id]=(await readdir(artifactRoot)).filter(id=>!previous.has(id));assert.ok(id);
    assert.deepEqual(await readdir(path.join(artifactRoot,id)),['failure.json'],'Rejected capture leaves no video, screenshots or report');
    assert.equal(JSON.parse(await readFile(path.join(artifactRoot,id,'failure.json'),'utf8')).status,'rejected');
    summary.rejected.push({scenario,id,files:['failure.json']});
  }
  await mkdir('artifacts/v2/failure-evidence',{recursive:true});
  await writeFile('artifacts/v2/failure-evidence/browser-verification.json',JSON.stringify(summary,null,2));
});
