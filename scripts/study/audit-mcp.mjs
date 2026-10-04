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
const pending=new Map();let ordinal=0, sequence=Promise.resolve();
async function freeze(stage,id) {
 const destination=path.join(directory,`${id}-${stage}`);await mkdir(destination,{recursive:true});
 const manifest=await snapshotSource(source,destination);await writeFile(path.join(destination,'OBSERVATION.json'),JSON.stringify({observedAt:new Date().toISOString(),...manifest},null,2));return manifest;
}
const input=createInterface({input:process.stdin});
input.on('line',line=>{sequence=sequence.then(async()=>{
 let request;try{request=JSON.parse(line);}catch{child.stdin.write(line+'\n');return;}
 if(request.method==='tools/call') {
  const id=String(++ordinal).padStart(4,'0');
  const before=await freeze('before',id);
  pending.set(JSON.stringify(request.id),{id,request,before,startedAt:new Date().toISOString()});
 }
 child.stdin.write(line+'\n');
}).catch(error=>{process.stderr.write('Study audit failed: '+error.message+'\n');child.kill('SIGTERM');process.exitCode=1;});});
const output=createInterface({input:child.stdout});
output.on('line',line=>{sequence=sequence.then(async()=>{
 let response;try{response=JSON.parse(line);}catch{process.stdout.write(line+'\n');return;}
 const entry=pending.get(JSON.stringify(response.id));
 if(entry) {
  const after=await freeze('after',entry.id);pending.delete(JSON.stringify(response.id));
  const result={...entry,finishedAt:new Date().toISOString(),after,stableApplicationSource:entry.before.digest===after.digest,responseSha256:sha256(Buffer.from(line)),response};
  await writeFile(path.join(directory,entry.id+'-call.json'),JSON.stringify(result,null,2));
  await appendFile(path.join(directory,'calls.jsonl'),JSON.stringify({id:entry.id,tool:entry.request.params?.name,startedAt:entry.startedAt,finishedAt:result.finishedAt,beforeDigest:entry.before.digest,afterDigest:after.digest,stableApplicationSource:result.stableApplicationSource,responseSha256:result.responseSha256})+'\n');
 }
 process.stdout.write(line+'\n');
}).catch(error=>{process.stderr.write('Study audit failed: '+error.message+'\n');child.kill('SIGTERM');process.exitCode=1;});});
input.on('close',()=>{sequence.then(()=>child.stdin.end());});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
child.on('exit',code=>{sequence.finally(()=>{process.exitCode=code??1;input.close();process.stdin.destroy();});});
