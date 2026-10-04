import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecipe,recipeWarnings} from '../../packages/core/safety';
import {performNativeDrag} from '../../packages/core/capture';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createMotionServer} from '../../packages/mcp/server';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {Page} from 'playwright';
import type {CaptureRecipe} from '../../packages/core/types';
const drag={action:'drag' as const,selector:'#timeline',points:[{x:.1,y:.5},{x:.9,y:.5},{x:.2,y:.5},{x:.7,y:.5}],durationMs:100,steps:6};
const recipe:CaptureRecipe={url:'http://127.0.0.1:4173',selector:'#preview',actions:[drag],durationMs:1000};
test('drag schema bounds a held native path and rejects malformed input',()=>{
 assert.ok(validateRecipe(recipe,{artifactRoot:'/tmp/unused'}));
 for(const change of [{points:[{x:0,y:0}]},{points:Array(13).fill({x:0,y:0})},{points:[{x:-.1,y:0},{x:1,y:0}]},{points:[{x:0,y:0},{x:1.1,y:0}]},{points:[{x:0,y:0},{x:NaN,y:0}]},{durationMs:99},{durationMs:2001},{steps:1},{steps:61},{force:true}])assert.throws(()=>validateRecipe({...recipe,actions:[{...drag,...change}]},{artifactRoot:'/tmp/unused'}));
});
test('known impossible positive outcome schedule produces a precise warning without deleting late evidence',()=>{
 const late={...recipe,durationMs:500,actions:[{...drag,durationMs:400},{action:'wait' as const,ms:100}],contract:{outcomes:{required:[{id:'export',selector:'#result',visible:true}]}}};
 assert.ok(validateRecipe(late,{artifactRoot:'/tmp/unused'}));assert.match(recipeWarnings(late)[0],/500ms.*500ms.*after actions/);
 assert.deepEqual(recipeWarnings(recipe),[]);assert.match(recipeWarnings({...late,contract:undefined})[0],/500ms.*500ms/);
});
function fakePage({throwMove=false,count=1,rect={x:10,y:10,width:100,height:20},signal}:{throwMove?:boolean;count?:number;rect?:any;signal?:AbortController}={}){
 const events:string[]=[],moves:{x:number;y:number}[]=[];
 const page={locator:()=>({count:async()=>count,evaluate:async()=>false,scrollIntoViewIfNeeded:async()=>{},boundingBox:async()=>rect,hover:async()=>events.push('hover')}),viewportSize:()=>({width:640,height:480}),waitForTimeout:async()=>{},mouse:{down:async()=>{events.push('down');signal?.abort()},move:async(x:number,y:number)=>{moves.push({x,y});if(throwMove)throw Error('Seeded pointer transport failure')},up:async()=>events.push('up')}} as unknown as Page;
 return {page,events,moves};
}
test('every reversal waypoint is visited and native release always runs on held errors',async()=>{
 const valid=fakePage();await performNativeDrag(valid.page,drag,1000);assert.deepEqual(valid.events,['hover','down','up']);assert.equal(valid.moves.length,6);
 assert.ok(valid.moves.some(p=>p.x===100));assert.ok(valid.moves.some(p=>p.x===30));assert.equal(valid.moves.at(-1)?.x,80);
 const failed=fakePage({throwMove:true});await assert.rejects(()=>performNativeDrag(failed.page,drag,1000),/Seeded/);assert.deepEqual(failed.events,['hover','down','up']);
 const releaseFailed=fakePage();releaseFailed.page.mouse.up=async()=>{throw new Error('Release transport failed')};await assert.rejects(()=>performNativeDrag(releaseFailed.page,drag,1000),/Release transport failed/);
 const controller=new AbortController(),aborted=fakePage({signal:controller});await assert.rejects(()=>performNativeDrag(aborted.page,drag,1000,controller.signal),/canceled/);assert.deepEqual(aborted.events,['hover','down','up']);
});
test('missing, ambiguous, zero and offscreen targets cannot start a drag',async()=>{
 for(const config of [{count:0},{count:2},{rect:null},{rect:{x:10,y:10,width:0,height:20}},{rect:{x:630,y:10,width:100,height:20}}]){const f=fakePage(config);await assert.rejects(()=>performNativeDrag(f.page,drag,1000));assert.ok(!f.events.includes('down'));}
 const insufficient=fakePage();await assert.rejects(()=>performNativeDrag(insufficient.page,drag,99),/remaining capture deadline/);assert.deepEqual(insufficient.events,[]);
});
test('actual MCP protocol exposes drag and keeps failed/unverified delivery separate in lists',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'motion-drag-protocol-'));
 for(const [index,delivery]of ['passed','failed','unverified'].entries()){const id=`10000000-0000-4000-8000-${String(index).padStart(12,'0')}`;await mkdir(path.join(root,id));await writeFile(path.join(root,id,'report.json'),JSON.stringify({id,createdAt:'fixture',recipe,delivery:{status:delivery},assertions:[{passed:true}]}));}
 const server=createMotionServer({artifactRoot:root}),client=new Client({name:'native-drag-protocol',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);const listed=await client.listTools();assert.match(JSON.stringify(listed.tools.find(t=>t.name==='motion_capture')?.inputSchema),/Ordered selector-relative coordinates/);const result=await client.callTool({name:'motion_list',arguments:{}});const captures=(JSON.parse((result.content as any)[0].text) as any).captures;assert.equal(captures.length,3);for(const row of captures){assert.equal(row.temporalPassed,true);assert.equal(row.passed,row.delivery==='passed');if(row.delivery==='unverified')assert.match(row.assessment,/Temporal contracts only/);}}finally{await client.close();await server.close();}
});
