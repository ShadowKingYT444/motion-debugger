#!/usr/bin/env node
import {mkdir,readFile,writeFile,cp,lstat,rename,rm,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const source=fileURLToPath(new URL('../examples/assembly/',import.meta.url));
export async function prepareAssembly(destination){
  if(!path.isAbsolute(destination))throw new Error('Destination must be an absolute new directory');
  if(await lstat(destination).then(()=>true,()=>false))throw new Error('Refusing to overwrite an existing directory');
  const parent=path.dirname(destination);await mkdir(parent,{recursive:true});const staging=path.join(parent,'.assembly-'+randomUUID());await mkdir(staging);
  try{
    for(const name of ['index.html','style.css','design.mjs','design-manifest.json','public-contract.json','app.mjs','assets'])await cp(path.join(source,name),path.join(staging,name),{recursive:true,errorOnExist:true,force:false});
    await mkdir(path.join(staging,'motion'));
    for(const name of ['spring.mjs','scene-actor-adapter.mjs'])await cp(path.join(source,'motion',name),path.join(staging,'motion',name));
    await cp(path.join(source,'scaffold/controller.mjs'),path.join(staging,'motion/controller.mjs'));
    const files={};async function hashTree(directory,prefix=''){for(const item of await readdir(directory,{withFileTypes:true})){const relative=path.join(prefix,item.name);if(item.isDirectory())await hashTree(path.join(directory,item.name),relative);else if(item.isFile())files[relative]=createHash('sha256').update(await readFile(path.join(directory,item.name))).digest('hex');else throw new Error('Common inputs cannot contain symlinks');}}
    await hashTree(staging);
    const manifest={schemaVersion:'assembly-common-input-1',task:'motion-creation-from-functional-endpoints',status:'prepared-not-evaluated',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files,scaffold:'The supplied controller changes poses instantly. It is a functional baseline, not a normal-motion task pass or an ordinary agent output.',referenceMotionIncluded:false,campaignRunnable:false};
    await writeFile(path.join(staging,'INPUT-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');await rename(staging,destination);return {destination,...manifest};
  }catch(error){await rm(staging,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--destination')throw new Error('Use --destination /absolute/new-directory');console.log(JSON.stringify(await prepareAssembly(path.resolve(args[1])),null,2));}
