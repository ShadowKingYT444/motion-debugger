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
    const {tools}=await client.listTools();assert.deepEqual(tools.map(t=>t.name).sort(),['motion_capture','motion_compare','motion_frames','motion_inspect','motion_list']);
    assert.equal(tools.find(t=>t.name==='motion_capture')?.annotations?.readOnlyHint,false);
    const list=await client.callTool({name:'motion_list',arguments:{}});assert.notEqual(list.isError,true);
    const guide=await client.readResource({uri:'motion-evidence://guide'});assert.match((guide.contents[0] as {text:string}).text,/same recipe/);
    const invalid=await client.callTool({name:'motion_capture',arguments:{recipe:{url:'https://example.com',selector:'#target',actions:[]}}});assert.equal(invalid.isError,true);
    const invalidInspect=await client.callTool({name:'motion_inspect',arguments:{captureId:'../../.env'}});assert.equal(invalidInspect.isError,true);
  }finally{await client.close()}
});
