// Transparent study transport: preserve protocol messages; source snapshots and logs use stderr/files only.
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdir,appendFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {snapshotSource,sha256} from './source-snapshot.mjs';

const [runtime,source,directory]=process.argv.slice(2);
if(!runtime||!source||!directory)throw Error('Expected runtime, application source and audit directory');
await mkdir(directory,{recursive:true});
const child=spawn(process.execPath,[runtime,'mcp'],{stdio:['pipe','pipe','pipe'],env:process.env});
child.stderr.pipe(process.stderr);
const pending=new Map();let ordinal=0;
async function freeze(stage,id) {
 const destination=path.join(directory,`${id}-${stage}`);await mkdir(destination,{recursive:true});
 const manifest=await snapshotSource(source,destination);await writeFile(path.join(destination,'OBSERVATION.json'),JSON.stringify({observedAt:new Date().toISOString(),...manifest},null,2));return manifest;
}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
const forwardInput=(async()=>{
 const input=createInterface({input:process.stdin});
 for await(const line of input){
  let request;try{request=JSON.parse(line)}catch{child.stdin.write(line+'\n');continue}
  if(request.method==='tools/call'){
   const id=String(++ordinal).padStart(4,'0'),before=await freeze('before',id);
   pending.set(JSON.stringify(request.id),{id,request,before,startedAt:new Date().toISOString()});
  }
  child.stdin.write(line+'\n');
 }
 child.stdin.end();
})();
const forwardOutput=(async()=>{
 const output=createInterface({input:child.stdout});
 for await(const line of output){
  let response;try{response=JSON.parse(line)}catch{process.stdout.write(line+'\n');continue}
  const entry=pending.get(JSON.stringify(response.id));
  if(entry){
   const after=await freeze('after',entry.id);pending.delete(JSON.stringify(response.id));
   const result={...entry,finishedAt:new Date().toISOString(),after,stableApplicationSource:entry.before.digest===after.digest,responseSha256:sha256(Buffer.from(line)),response};
   await writeFile(path.join(directory,entry.id+'-call.json'),JSON.stringify(result,null,2));
   await appendFile(path.join(directory,'calls.jsonl'),JSON.stringify({id:entry.id,tool:entry.request.params?.name,startedAt:entry.startedAt,finishedAt:result.finishedAt,beforeDigest:entry.before.digest,afterDigest:after.digest,stableApplicationSource:result.stableApplicationSource,responseSha256:result.responseSha256})+'\n');
  }
  process.stdout.write(line+'\n');
 }
})();
const exit=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});
try{const [,,code]=await Promise.all([forwardInput,forwardOutput,exit]);process.exitCode=code??1}catch(error){process.stderr.write('Study audit failed: '+error.message+'\n');child.kill('SIGTERM');process.exitCode=1}
