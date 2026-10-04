import test from 'node:test';
import type {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js';
import {createMotionServer} from '../../packages/mcp/server';
import {RecipeSchema,validateRecipe,recipeWarnings} from '../../packages/core/safety';
import type {MotionRecipeMetadata,MotionRecipeSource} from '../../packages/core/catalog';

async function connected(t:TestContext) {
  const root=await mkdtemp(path.join(os.tmpdir(),'motion-catalog-workflow-'));
  const server=createMotionServer({artifactRoot:root});
  const client=new Client({name:'advertised-workflow-verifier',version:'1'});
  const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
  t.after(async()=>{await client.close();await server.close();await rm(root,{recursive:true,force:true});});
  await server.connect(serverTransport);await client.connect(clientTransport);
  return {client,root};
}
async function call(client:Client,args:Record<string,unknown>={}) {
  const result=CallToolResultSchema.parse(await client.callTool({name:'motion_recipe',arguments:args}));
  assert.notEqual(result.isError,true);
  const text=result.content?.find(item=>item.type==='text');assert.ok(text && text.type==='text');
  const data=JSON.parse(text.text);assert.deepEqual(result.structuredContent,data);
  return data;
}

test('SDK catalog quickstart validates under the actual capture schema and advertised limits',async t=>{
  const {client,root}=await connected(t),catalog=await call(client);
  assert.equal(catalog.workflow.exampleNeedsAppSelectors,true);
  const example=RecipeSchema.parse(catalog.workflow.exampleCapture.recipe);
  assert.deepEqual(validateRecipe(example,{artifactRoot:root}),example);
  assert.deepEqual(recipeWarnings(example),[],'The example leaves time for actions and positive outcome observation');
  assert.ok(example.contract?.outcomes?.required.length);
  const limits=catalog.workflow.limits;
  const probe=(changes:Record<string,unknown>)=>({...example,...changes});
  RecipeSchema.parse(probe({durationMs:limits.durationMs}));assert.throws(()=>RecipeSchema.parse(probe({durationMs:limits.durationMs+1})));
  RecipeSchema.parse(probe({actions:Array.from({length:limits.actions},()=>({action:'wait',ms:0}))}));assert.throws(()=>RecipeSchema.parse(probe({actions:Array.from({length:limits.actions+1},()=>({action:'wait',ms:0}))})));
  RecipeSchema.parse(probe({actions:[{action:'wait',ms:limits.waitPerActionMs}]}));assert.throws(()=>RecipeSchema.parse(probe({actions:[{action:'wait',ms:limits.waitPerActionMs+1}]})));
  const points=Array.from({length:limits.dragWaypoints},(_,i)=>({x:i/(limits.dragWaypoints-1),y:.5}));
  const drag={action:'drag',selector:'#scrubber',points,durationMs:limits.dragDurationMs};
  RecipeSchema.parse(probe({actions:[drag]}));assert.throws(()=>RecipeSchema.parse(probe({actions:[{...drag,durationMs:limits.dragDurationMs+1}]})));assert.throws(()=>RecipeSchema.parse(probe({actions:[{...drag,points:[...points,{x:.5,y:.5}]}]})));
  const waits=[{action:'wait',ms:limits.waitPerActionMs},{action:'wait',ms:limits.waitPerActionMs},{action:'wait',ms:limits.totalWaitMs-2*limits.waitPerActionMs}];
  validateRecipe(probe({durationMs:limits.durationMs,actions:waits}),{artifactRoot:root});
  assert.throws(()=>validateRecipe(probe({actions:[...waits,{action:'wait',ms:1}]}),{artifactRoot:root}),/10000ms/);
});

test('SDK recipe catalog delivers all seven exact authored modules and their integration references',async t=>{
  const {client}=await connected(t),catalog=await call(client);
  const entries=catalog.recipes as MotionRecipeMetadata[];
  assert.deepEqual(entries.map(entry=>entry.id).sort(),['colony-scene','drawer','elapsed-sequence','kinetic-field','scroll-chapters','spring','task-handoff']);
  const skill=new URL('../../plugin/motion-debugger/skills/motion/',import.meta.url);
  const delivered=new Set<string>();
  for(const entry of entries) {
    const response=await call(client,{id:entry.id}) as MotionRecipeSource;
    assert.equal(response.id,entry.id);assert.deepEqual(response.files,entry.files);
    assert.deepEqual(response.sources.map(source=>source.path),[...entry.files,'references/usage.md','references/evidence.md']);
    for(const source of response.sources) {
      assert.deepEqual(Buffer.from(source.source,'utf8'),await readFile(new URL(source.path,skill)),`${entry.id} ships exact ${source.path} bytes`);
      if(source.language==='javascript')delivered.add(source.path);
    }
  }
  const authored=(await readdir(new URL('recipes/',skill))).filter(name=>name.endsWith('.mjs')).map(name=>'recipes/'+name).sort();
  assert.deepEqual([...delivered].sort(),authored,'Every authored recipe is discoverable through the MCP catalog');
  assert.equal(delivered.size,7);
});
