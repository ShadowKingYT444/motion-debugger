import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {snapshotSource,sha256} from '../scripts/study/source-snapshot.mjs';

test('study snapshots retain exact regular inputs and exclude evidence/runtime links',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'motion-study-snapshot-'));
 try{
  const source=path.join(root,'source'),destination=path.join(root,'frozen');await mkdir(source);
  await writeFile(path.join(source,'index.html'),'<h1>Original specimen</h1>');
  await mkdir(path.join(source,'evidence'));await writeFile(path.join(source,'evidence','private.txt'),'excluded');
  await writeFile(path.join(source,'AGENT.jsonl'),'excluded');await symlink('/etc/passwd',path.join(source,'outside'));
  const first=await snapshotSource(source,destination),second=await snapshotSource(source);
  assert.equal(first.digest,second.digest);assert.deepEqual(Object.keys(first.files),['index.html']);assert.deepEqual(first.skippedSymlinks,['outside']);
  assert.equal((await readFile(path.join(destination,'index.html'),'utf8')),'<h1>Original specimen</h1>');
  await writeFile(path.join(source,'index.html'),'<h1>Changed specimen</h1>');assert.notEqual((await snapshotSource(source)).digest,first.digest);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('audited native transport returns unchanged JSON and binds before/after application source', {timeout:10000},async t=>{
 const capability=spawn(process.execPath,['-e','process.stdout.write("nested-node-ok")'],{stdio:['ignore','pipe','pipe']}),capabilityChunks=[];capability.stdout.on('data',chunk=>capabilityChunks.push(chunk));await new Promise(resolve=>capability.once('close',resolve));
 if(Buffer.concat(capabilityChunks).toString()!=='nested-node-ok'){t.skip('Nested Node execution is unavailable in this command sandbox');return;}
 const root=await mkdtemp(path.join(os.tmpdir(),'motion-study-audit-'));let child;
 try{
  const source=path.join(root,'source'),audit=path.join(root,'audit'),runtime=path.join(root,'runtime.mjs');await mkdir(source);
  await writeFile(path.join(source,'index.html'),'<h1>LOOP</h1>');
  await writeFile(runtime,"import {createInterface} from 'node:readline';const input=createInterface({input:process.stdin});input.on('line',line=>{const request=JSON.parse(line);process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{content:[{type:'image',mimeType:'image/png',data:'AA=='},{type:'text',text:'Native μ source'}],structuredContent:{exact:true}}})+'\\n')});");
  child=spawn(process.execPath,[path.resolve('scripts/study/audit-mcp.mjs'),runtime,source,audit],{stdio:['pipe','pipe','pipe']});let output='',error='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk);
  const request={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'motion_frames',arguments:{captureId:'fixture'}}};child.stdin.end(JSON.stringify(request)+'\n');
  const code=await new Promise(resolve=>child.once('close',resolve));assert.equal(code,0,error);
  const response=JSON.parse(output),record=JSON.parse(await readFile(path.join(audit,'0001-call.json'),'utf8'));
  assert.deepEqual(response,record.response);assert.equal(response.result.content[1].text,'Native μ source');assert.equal(record.responseSha256,sha256(Buffer.from(output.trimEnd())));assert.equal(record.stableApplicationSource,true);assert.deepEqual(record.request,request);
  assert.equal((await readFile(path.join(audit,'0001-before/index.html'),'utf8')),'<h1>LOOP</h1>');
 }finally{child?.kill('SIGTERM');await rm(root,{recursive:true,force:true});}
});
