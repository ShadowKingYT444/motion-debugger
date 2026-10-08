import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {classifyEasing,serveStatic} from '../packages/core/critique';

test('easing classification separates defaults, linear, ease-in curves and custom curves',()=>{
  assert.equal(classifyEasing('linear'),'linear');
  assert.equal(classifyEasing('ease'),'default-ease');
  assert.equal(classifyEasing('ease-in'),'ease-in');
  assert.equal(classifyEasing('cubic-bezier(0.55, 0, 1, 0.45)'),'ease-in');
  assert.equal(classifyEasing('cubic-bezier(0.16, 1, 0.3, 1)'),'custom-curve');
  assert.equal(classifyEasing('linear(0, 0.5 20%, 1)'),'spring-or-steps');
});

test('static server stays inside the served folder',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'critique-static-'));
  await writeFile(path.join(dir,'index.html'),'<h1>ok</h1>');
  const served=await serveStatic(dir);
  try{
    assert.match(served.url,/^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal(await (await fetch(served.url)).text(),'<h1>ok</h1>');
    assert.equal((await fetch(served.url+'..%2f..%2fetc%2fpasswd')).status===200,false);
  }finally{await served.close();await rm(dir,{recursive:true,force:true})}
});
