import {readdir,lstat,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const excluded = new Set(['.git','.codex','.agents','node_modules','evidence','artifacts','.motion-evidence','.motion-debugger','dist','INITIAL_CHECKPOINT','CONSTRUCTION_MATERIALS']);
/** Freeze regular application inputs, never follow links or include generated recordings/logs. */
export async function snapshotSource(source, destination) {
  const files={}, skipped=[]; let total=0;
  async function walk(relative='') {
    for(const entry of (await readdir(path.join(source,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
      const name=path.posix.join(relative,entry.name), file=path.join(source,name);
      if(excluded.has(entry.name)||/\.(?:log|jsonl|webm|mp4|tgz|zip)$/.test(entry.name)||['FINAL.txt','SOURCE-HASHES.json'].includes(entry.name))continue;
      const stat=await lstat(file);
      if(stat.isSymbolicLink()){skipped.push(name);continue;}
      if(stat.isDirectory()){await walk(name);continue;}
      if(!stat.isFile())throw Error('Unsupported application source: '+name);
      if(stat.size>20e6 || (total+=stat.size)>80e6 || Object.keys(files).length>=2000)throw Error('Application snapshot exceeds its source bounds');
      const bytes=await readFile(file);files[name]={sha256:sha256(bytes),bytes:bytes.length,mtimeMs:stat.mtimeMs};
      if(destination){await mkdir(path.dirname(path.join(destination,name)),{recursive:true});await writeFile(path.join(destination,name),bytes);}
    }
  }
  await walk();
  const identity=Object.fromEntries(Object.entries(files).map(([name,{sha256,bytes}])=>[name,{sha256,bytes}]));
  const digest=sha256(Buffer.from(JSON.stringify(identity)));
  const manifest={schemaVersion:1,digest,files:identity,observedFiles:files,skippedSymlinks:skipped};
  if(destination)await writeFile(path.join(destination,'SOURCE-HASHES.json'),JSON.stringify({schemaVersion:1,files:identity},null,2)+'\n');
  return manifest;
}
