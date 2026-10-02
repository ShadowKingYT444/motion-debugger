import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {exampleRecipes} from '../../src/examples/recipes';
import type {MotionCapture,MotionComparison} from '../../packages/core/types';

const port=4184,origin=`http://127.0.0.1:${port}`,artifactRoot=path.resolve('artifacts/v2/captures');
await mkdir(artifactRoot,{recursive:true});
const app=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let appLog='';app.stdout?.on('data',data=>appLog+=String(data));app.stderr?.on('data',data=>appLog+=String(data));
for(let i=0;i<80;i++){try{if((await fetch(`${origin}/api/health`)).ok)break}catch{};if(i===79)throw new Error(`No readiness: ${appLog}`);await new Promise(resolve=>setTimeout(resolve,250))}
const transport=new StdioClientTransport({command:process.execPath,args:['build/mcp/index.js'],cwd:process.cwd(),env:{PATH:process.env.PATH??'',HOME:process.env.HOME??'',MOTION_ARTIFACT_DIR:artifactRoot,MOTION_ALLOWED_ORIGINS:origin,MOTION_SOURCE_ROOTS:process.cwd()},stderr:'pipe'});
const client=new Client({name:'coding-agent-motion-workflow-test',version:'0.2.0'});
const results:unknown[]=[];
try {
  await client.connect(transport);assert.equal(client.getServerVersion()?.name,'motion-debugger');
  const tools=await client.listTools();assert.equal(tools.tools.length,4);
  for(const [scenario,pair]of Object.entries(exampleRecipes(origin))) {
    const ids:string[]=[];
    for(const [version,recipe]of [['before',pair.before],['after',pair.after]] as const) {
      const result=await client.callTool({name:'motion_capture',arguments:{recipe}},undefined,{timeout:45000});
      assert.notEqual(result.isError,true,JSON.stringify(result));
      const data=result.structuredContent as {id:string;assertions:{passed:boolean;id:string}[];evidence:{video:string};metrics:unknown};
      assert.ok(data.id);ids.push(data.id);
      const resource=await client.readResource({uri:`motion-evidence://capture/${data.id}`});
      const report=JSON.parse((resource.contents[0] as {text:string}).text) as MotionCapture;
      assert.ok(report.metrics.sufficientEvidence);
      assert.ok(report.events.some(event=>event.origin==='app-annotated'&&event.source));
      assert.ok(report.assertions.find(a=>a.id==='browser-errors')?.passed);
      assert.ok(report.assertions.find(a=>a.id==='network-policy')?.passed);
      if(version==='before')assert.ok(report.assertions.some(a=>!a.passed),`${scenario} baseline must violate its intended temporal contract`);
      else assert.ok(report.assertions.every(a=>a.passed),JSON.stringify(report.assertions.filter(a=>!a.passed)));
      const inspection=await client.callTool({name:'motion_inspect',arguments:{captureId:data.id,fromMs:0,toMs:600,includeSamples:true}});assert.notEqual(inspection.isError,true);
      results.push({scenario,version,captureId:data.id,assertions:report.assertions,metrics:report.metrics});
    }
    const comparisonResult=await client.callTool({name:'motion_compare',arguments:{beforeId:ids[0],afterId:ids[1]}});
    const comparison=comparisonResult.structuredContent as unknown as MotionComparison;
    assert.ok(comparison.comparable,JSON.stringify(comparison.comparabilityIssues));
    assert.equal(comparison.contractsPassed.before,false);assert.equal(comparison.contractsPassed.after,true);assert.ok(comparison.finalEquivalent,`${scenario} final state unchanged`);
    await writeFile(`artifacts/v2/${scenario}-comparison.json`,JSON.stringify(comparison,null,2));
    // Deliberately narrow detector/evidence ablation: final-state-only assertions vs temporal contracts, not an LLM trial.
    const beforeResource=await client.readResource({uri:`motion-evidence://capture/${ids[0]}`});
    const before=JSON.parse((beforeResource.contents[0] as {text:string}).text) as MotionCapture;
    const finalOnly=before.assertions.filter(a=>a.id.startsWith('final-'));
    assert.ok(finalOnly.length&&finalOnly.every(a=>a.passed));
    results.push({scenario,ablation:{withoutTemporalEvidence:'Final-state-only checks pass and miss the seeded transient defect',withTemporalEvidence:'Caller temporal contract fails on baseline and passes on repair',isLLMTrial:false,finalOnlyAssertions:finalOnly,comparison}});
  }
  const listed=await client.callTool({name:'motion_list',arguments:{}});assert.notEqual(listed.isError,true);
  await writeFile('artifacts/v2/workflow-verification.json',JSON.stringify({transport:'actual MCP stdio, official SDK client',tools:tools.tools.map(t=>t.name),results},null,2));
  const verifier=spawn(process.execPath,['src/examples/verify-examples.mjs'],{cwd:process.cwd(),env:{...process.env,BASE_URL:origin,QA_OUTPUT:'artifacts/qa/examples'},stdio:['ignore','pipe','pipe']});
  let verifierLog='';verifier.stdout?.on('data',data=>verifierLog+=String(data));verifier.stderr?.on('data',data=>verifierLog+=String(data));
  const verifierCode=await new Promise<number|null>(resolve=>verifier.on('exit',resolve));
  await writeFile('artifacts/v2/examples-verification.log',verifierLog);
  assert.equal(verifierCode,0,verifierLog);console.log(verifierLog);
  console.log(JSON.stringify({passed:true,scenarios:3,realCaptures:6,transport:'stdio',artifactRoot},null,2));
}finally {
  await client.close();app.kill('SIGTERM');await writeFile('artifacts/v2/server.log',appLog);
}
