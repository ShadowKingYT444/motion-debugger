// Enforce the wall-clock budget independently of worker reasoning/tool latency.
import {cp,mkdir,readFile,writeFile,readdir,symlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [arm,deadlineText,studyPath='studies/local-aer-20261003']=process.argv.slice(2);
if(!['control','treatment'].includes(arm))throw Error('Owned local trial arm required');
const deadline=Date.parse(deadlineText),delay=deadline-Date.now();
if(!Number.isFinite(delay)||delay<0||delay>30*60000)throw Error('Deadline must be within thirty minutes');
const study=path.resolve(studyPath),source=path.join(study,arm),dest=path.join(study,`frozen-${arm}`);
console.log(`FREEZE_SCHEDULED ${arm} ${new Date(deadline).toISOString()}`);
await new Promise(resolve=>setTimeout(resolve,delay));
await mkdir(dest);
const excluded=new Set(['node_modules','dist','.agents','.codex','.motion-evidence','.motion-debugger','evidence']);
for(const entry of await readdir(source,{withFileTypes:true}))if(!excluded.has(entry.name))await cp(path.join(source,entry.name),path.join(dest,entry.name),{recursive:true});
const hashes={};
async function hash(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await hash(file);else hashes[path.relative(dest,file)]=createHash('sha256').update(await readFile(file)).digest('hex')}}
await hash(dest);
await writeFile(path.join(dest,'SOURCE-HASHES.json'),JSON.stringify(hashes,null,2)+'\n');
await writeFile(path.join(dest,'FREEZE.json'),JSON.stringify({arm,assignedDeadline:new Date(deadline).toISOString(),frozenAt:new Date().toISOString(),method:'Coordinator timer copied runtime source at deadline. Later worker edits cannot affect this endpoint.',sourceManifestSha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')},null,2)+'\n');
await symlink(path.join(source,'node_modules'),path.join(dest,'node_modules'),'dir');
console.log(`SOURCE_FROZEN ${arm} ${new Date().toISOString()}`);
