import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

for (const entry of ['build/mcp/index.js','plugin/motion-debugger/scripts/mcp.mjs']) test(`actual SDK stdio client initializes, discovers tools/resources and enforces safety (${entry})`,{timeout:20000},async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'motion-mcp-'));
  const transport=new StdioClientTransport({command:process.execPath,args:[entry],cwd:process.cwd(),env:{PATH:process.env.PATH??'',MOTION_ARTIFACT_DIR:root},stderr:'pipe'});
  const client=new Client({name:'motion-protocol-verifier',version:'0.2.0'});
  try {
    await client.connect(transport);
    assert.equal(client.getServerVersion()?.name,'motion-debugger');
    const {tools}=await client.listTools();assert.deepEqual(tools.map(t=>t.name).sort(),['motion_capture','motion_compare','motion_frames','motion_inspect','motion_list','motion_probe','motion_recipe','motion_review']);
    assert.equal(tools.find(t=>t.name==='motion_capture')?.annotations?.readOnlyHint,false);
    const budget=tools.find(t=>t.name==='motion_review')?.inputSchema.properties?.budget as {type?:string;default?:unknown;properties?:Record<string,{default?:unknown}>};
    assert.equal(budget.type,'object');assert.deepEqual(budget.default,{maxFrames:6,maxWidth:720,maxHeight:540});
    assert.equal(budget.properties?.maxFrames.default,6,'Scalar bounds/defaults remain exposed');
    const reviewSchema=tools.find(t=>t.name==='motion_review')!.inputSchema;
    const noTupleItems=(value:unknown)=>{if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){assert.ok(key!=='items'||!Array.isArray(item),'Native host requires a single items schema');noTupleItems(item);}};
    noTupleItems(reviewSchema);
    const wirePose=(reviewSchema.properties!.plan as any).properties.beats.items.properties.from;
    for(const field of ['orientationRad','scale']){assert.equal(wirePose.properties[field].minItems,3);assert.equal(wirePose.properties[field].maxItems,3);assert.equal(wirePose.properties[field].items.type,'number');}
    // Native hosts need the clock semantics in the schema, not only an optional document.
    const schema=JSON.stringify(tools.find(t=>t.name==='motion_capture')?.inputSchema);
    assert.match(schema,/Deadline from capture START/);
    assert.match(schema,/not an extra post-action timeout/);
    const list=await client.callTool({name:'motion_list',arguments:{}});assert.notEqual(list.isError,true);
    const guide=await client.readResource({uri:'motion-evidence://guide'});assert.match((guide.contents[0] as {text:string}).text,/same recipe/);
    const invalid=await client.callTool({name:'motion_capture',arguments:{recipe:{url:'https://example.com',selector:'#target',actions:[]}}});assert.equal(invalid.isError,true);
    const invalidReview=await client.callTool({name:'motion_review',arguments:{plan:{},recipe:{url:'https://example.com',selector:'#target',actions:[]}}});assert.equal(invalidReview.isError,true);
    const invalidProbe=await client.callTool({name:'motion_probe',arguments:{recipe:{url:'https://example.com',selector:'#target',actions:[]},beforeActionIndex:0,offsetsMs:[10]}});assert.equal(invalidProbe.isError,true);
    const invalidInspect=await client.callTool({name:'motion_inspect',arguments:{captureId:'../../.env'}});assert.equal(invalidInspect.isError,true);
    const catalog=await client.callTool({name:'motion_recipe',arguments:{}});assert.notEqual(catalog.isError,true);
    const recipe=await client.callTool({name:'motion_recipe',arguments:{id:'spring'}});assert.notEqual(recipe.isError,true);
    assert.match(JSON.stringify(recipe),/source/);
    const invalidRecipe=await client.callTool({name:'motion_recipe',arguments:{id:'../../.env'}});assert.equal(invalidRecipe.isError,true);
  }finally{await client.close()}
});
