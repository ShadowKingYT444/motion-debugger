// Exercise the transparent transport against a fresh installed native MCP runtime.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {sha256} from './source-snapshot.mjs';
const [runtime,proofRoot]=process.argv.slice(2);
if(!runtime||!proofRoot||!path.isAbsolute(runtime)||!path.isAbsolute(proofRoot))throw Error('Expected absolute installed runtime and new proof directory');
await mkdir(proofRoot);const source=path.join(proofRoot,'source');await mkdir(source);
const html='<!doctype html><html><meta charset="utf-8"><style>#mark{width:60px;height:60px;background:#65f5bf;transition:transform .25s}body{background:#172025;color:white}</style><button id="launch">Create</button><div id="mark"></div><output id="status">Ready</output><script>document.querySelector("#launch").onclick=()=>{document.querySelector("#mark").style.transform="translateX(120px)";document.querySelector("#status").textContent="Delivered"}</script></html>';
await writeFile(path.join(source,'index.html'),html);
const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const proof={startedAt:new Date().toISOString(),runtime,runtimeSha256:sha256(await readFile(runtime)),fixtureSha256:sha256(Buffer.from(html)),status:'running'};
const client=new Client({name:'fresh-audited-runtime-smoke',version:'1'});
try{
 await client.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve('scripts/study/audit-mcp.mjs'),runtime,source,path.join(proofRoot,'audit')],env:{...process.env,MOTION_ARTIFACT_DIR:path.join(proofRoot,'captures'),MOTION_ALLOWED_ORIGINS:origin,MOTION_SOURCE_ROOTS:source,CHROMIUM_PATH:process.env.CHROMIUM_PATH??'/usr/bin/google-chrome'}}));
 const toolNames=(await client.listTools()).tools.map(tool=>tool.name).sort();assert.equal(toolNames.length,6);proof.tools=toolNames;
 const catalog=await client.callTool({name:'motion_recipe',arguments:{}});assert.notEqual(catalog.isError,true);assert.equal(catalog.structuredContent.recipes.length,7);
 const recipe={url:origin,selector:'#mark',durationMs:1800,actions:[{action:'click',selector:'#launch'},{action:'wait',ms:400}],contract:{outcomes:{required:[{id:'delivered',selector:'#status',visible:true,textIncludes:'Delivered'}]}}};
 const capture=await client.callTool({name:'motion_capture',arguments:{recipe}});assert.notEqual(capture.isError,true,JSON.stringify(capture.structuredContent));const id=capture.structuredContent.id;assert.ok(id);proof.capture=capture.structuredContent;
 const frames=await client.callTool({name:'motion_frames',arguments:{captureId:id,selection:'journey',maxWidth:960,maxHeight:720}});assert.notEqual(frames.isError,true);const images=frames.content.filter(item=>item.type==='image');assert.ok(images.length>0);proof.nativeImageCount=images.length;proof.frames=frames.structuredContent;
 for(let i=0;i<images.length;i++)await writeFile(path.join(proofRoot,`native-${i}.png`),Buffer.from(images[i].data,'base64'));
 await client.close();const calls=(await readFile(path.join(proofRoot,'audit/calls.jsonl'),'utf8')).trim().split('\n').map(line=>JSON.parse(line));assert.equal(calls.length,3);assert.ok(calls.every(call=>call.stableApplicationSource));proof.auditCalls=calls;proof.status='passed';
}catch(error){proof.status='failed';proof.error=error.stack;throw error;}finally{await client.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));proof.finishedAt=new Date().toISOString();await writeFile(path.join(proofRoot,'verification.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({status:proof.status,proofRoot,nativeImageCount:proof.nativeImageCount}));}
