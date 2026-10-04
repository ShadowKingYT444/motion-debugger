import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import type {Page} from 'playwright';
import {chromiumOptions} from '../../server/browser';
import {performNativeDrag,capture} from '../../packages/core/capture';
import {createMotionServer} from '../../packages/mcp/server';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import type {CaptureRecipe} from '../../packages/core/types';
// Seeded range/export fixture. Real native input and browser API failures; no coding-agent claim.
const html=`<!doctype html><style>body{margin:24px;font:16px system-ui}input{display:block;width:280px;height:40px}#preview{width:280px;height:80px;background:#ace}pre{white-space:pre-wrap;max-width:280px}</style><label>Timeline<input id="timeline" type="range" min="0" max="100" value="0"></label><div id="preview">Preview 0</div><button id="export">Export current frame</button><pre id="result" data-held="false">Pending</pre><div id="zero" style="width:0;height:0"></div><div id="wide" style="width:3000px;height:30px"></div><script>
window.trace=[];window.reversals=0;window.previous=0;window.direction=0;window.held=false;const slider=document.querySelector('#timeline'),preview=document.querySelector('#preview'),result=document.querySelector('#result');
slider.addEventListener('pointerdown',e=>{held=true;result.dataset.held='true';trace.push({type:e.type,trusted:e.isTrusted,buttons:e.buttons,value:slider.value});});
slider.addEventListener('pointermove',e=>{if(held)trace.push({type:e.type,trusted:e.isTrusted,buttons:e.buttons,value:slider.value});});
window.addEventListener('pointerup',e=>{if(held){held=false;result.dataset.held='false';trace.push({type:e.type,trusted:e.isTrusted,buttons:e.buttons,value:slider.value});}});
slider.addEventListener('input',e=>{const value=Number(slider.value),next=Math.sign(value-previous);if(next&&direction&&next!==direction)reversals++;if(next)direction=next;previous=value;preview.textContent='Preview '+value;preview.dataset.value=slider.value;trace.push({type:e.type,trusted:e.isTrusted,value});});
document.querySelector('#export').onclick=()=>{result.dataset.exportCoherent=String(preview.dataset.value===slider.value&&!held);result.dataset.reversals=String(reversals);result.textContent=JSON.stringify({value:Number(slider.value),preview:Number(preview.dataset.value),held,reversals,trustedAll:trace.every(e=>e.trusted),heldMoves:trace.filter(e=>e.type==='pointermove').every(e=>e.buttons===1),moves:trace.filter(e=>e.type==='pointermove').length,down:trace.filter(e=>e.type==='pointerdown').length,up:trace.filter(e=>e.type==='pointerup').length});};
</script>`;
const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`,root=path.resolve(`artifacts/v2/drag/${Date.now()}`);await mkdir(root,{recursive:true});await writeFile(path.join(root,'fixture.html'),html);await writeFile(path.join(root,'harness.ts'),await readFile(new URL(import.meta.url)));
const provenance:any={runtimeFunctions:{dragSha256:createHash('sha256').update(performNativeDrag.toString()).digest('hex'),captureSha256:createHash('sha256').update(capture.toString()).digest('hex')},files:[]};
for(const file of ['packages/core/types.ts','packages/core/safety.ts','packages/core/capture.ts']){const bytes=await readFile(file),name=file.replaceAll('/','_');await writeFile(path.join(root,name),bytes);provenance.files.push({file,snapshot:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}await writeFile(path.join(root,'provenance.json'),JSON.stringify(provenance,null,2));
const mcp=createMotionServer({artifactRoot:path.join(root,'captures')}),client=new Client({name:'native-drag-browser',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();await mcp.connect(a);await client.connect(b);
const runs:any[]=[];
const drag={action:'drag' as const,selector:'#timeline',points:[{x:.1,y:.5},{x:.85,y:.5},{x:.15,y:.5},{x:.7,y:.5}],durationMs:450,steps:18};
try{
 for(const scenario of ['desktop','mobile','reduced','missing','zero','out-of-viewport']){
  const failed=['missing','zero','out-of-viewport'].includes(scenario),recipe:CaptureRecipe={url:origin,selector:'#preview',durationMs:1500,viewport:scenario==='mobile'?{width:390,height:844}:{width:640,height:480},reducedMotion:scenario==='reduced'?'reduce':'no-preference',actions:[{...drag,selector:scenario==='missing'?'#missing':scenario==='zero'?'#zero':scenario==='out-of-viewport'?'#wide':'#timeline'},{action:'click',selector:'#export'}],contract:{outcomes:{required:[{id:'coherent-export',selector:'#result',attributes:{'data-held':'false','data-export-coherent':'true','data-reversals':'2'},textIncludes:'"held":false',visible:true}]}}};
  const response=await client.callTool({name:'motion_capture',arguments:{recipe}}),report=JSON.parse((response.content as any)[0].text);runs.push({scenario,isError:response.isError??false,...report});await writeFile(path.join(root,'verification.json'),JSON.stringify({status:'running',scope:'Actual MCP protocol and Chromium seeded native pointer range/export fixture',runs},null,2));
  if(failed){assert.equal(response.isError,true);assert.equal(report.status,'incomplete');assert.equal(report.delivery.status,'failed');continue;}
  assert.notEqual(response.isError,true);assert.equal(report.delivery.status,'passed',JSON.stringify(report.delivery));const state=JSON.parse(report.delivery.required[0].text);assert.equal(state.value,state.preview);assert.equal(state.held,false);assert.equal(state.reversals,2);assert.ok(state.value>=68&&state.value<=73);assert.equal(state.trustedAll,true);assert.equal(state.heldMoves,true);assert.equal(state.moves,18);assert.equal(state.down,1);assert.equal(state.up,1);assert.ok(report.assertions.find((x:any)=>x.id==='browser-errors').passed);
  console.log(JSON.stringify({scenario,id:report.id,delivery:report.delivery.status,value:state.value,reversals:state.reversals}));
 }
 const browser=await chromium.launch(chromiumOptions());
 try{
  const page=await browser.newPage({viewport:{width:640,height:480}});await page.goto(origin);let moves=0;
  const wrapped=new Proxy(page,{get(target,key){if(key==='mouse')return {down:()=>target.mouse.down(),up:()=>target.mouse.up(),move:async(x:number,y:number)=>{if(++moves===3)throw Error('Seeded transport failure while pointer held');await target.mouse.move(x,y)}};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}}) as Page;
  await assert.rejects(()=>performNativeDrag(wrapped,drag,2000),/Seeded transport failure/);
  const state=await page.evaluate(()=>({held:(window as any).held,trace:(window as any).trace}));assert.equal(state.held,false);assert.ok(state.trace.some((e:any)=>e.type==='pointerup'&&e.trusted));await page.locator('#export').click();const result=JSON.parse(await page.locator('#result').innerText());assert.equal(result.held,false);runs.push({scenario:'held-error-release-cleanup',scope:'Injected verifier transport exception after real native mouse down; actual browser received trusted pointerup',passed:true,state});await page.screenshot({path:path.join(root,'cleanup.png')});
 }finally{await browser.close();}
 await writeFile(path.join(root,'verification.json'),JSON.stringify({status:'passed',scope:'Actual MCP protocol and Chromium seeded native range/export fixture; expected rejection captures retained, transport-exception cleanup labeled',runs},null,2));console.log(root);
}catch(error){await writeFile(path.join(root,'failure.json'),JSON.stringify({status:'failed',error:String(error),runs},null,2));throw error;}
finally{await client.close();await mcp.close();await new Promise<void>(resolve=>server.close(()=>resolve()));}
