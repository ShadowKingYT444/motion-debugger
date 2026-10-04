import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {readSourceRef} from '../../packages/core/safety';
test('authored browser modules retain exact source hashes while source-root/private restrictions remain',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'motion-source-module-'));
 try{
  const file=path.join(root,'motion.mjs'),bytes='export const state = 1;\n';await writeFile(file,bytes);
  const ref=await readSourceRef({file,line:1},[root]);assert.equal(ref.sha256,createHash('sha256').update(bytes).digest('hex'));assert.ok(ref.excerpt.includes('export const'));
  await assert.rejects(readSourceRef({file,line:1},[]),/explicitly configured/);
  const privateFile=path.join(root,'.env.mjs');await writeFile(privateFile,bytes);await assert.rejects(readSourceRef({file:privateFile,line:1},[root]),/ordinary web source/);
 }finally{await rm(root,{recursive:true,force:true});}
});
