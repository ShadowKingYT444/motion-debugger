// Real-browser regression for `critique`: a fixture with labeled seeded defects must surface them,
// and a kit-built control must pass. Measurements come from actual Chromium runs, not fixtures.
import assert from 'node:assert/strict';
import {cp,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {critique} from '../packages/core/critique.ts';

const root=path.resolve(import.meta.dirname,'..');
const work=await mkdtemp(path.join(os.tmpdir(),'critique-browser-'));
try{
  const flawed=await critique(path.join(root,'tests/fixtures/critique/flawed'),{outDir:path.join(work,'flawed-report')});
  const ids=new Set(flawed.findings.map(finding=>finding.id));
  for(const expected of ['stuck-invisible','motion-stops-after-hero','entrance-not-staggered','linear-movement','controls-without-hover','focus-invisible','no-reduced-motion','mobile-overflow'])
    assert.ok(ids.has(expected),`flawed fixture should report ${expected}; got ${[...ids].join(', ')}`);
  assert.ok(flawed.score<45,`flawed fixture should grade poorly, got ${flawed.score}`);
  for(const image of ['desktopEntrance','desktopScroll','mobile'])assert.ok(flawed.images[image],`missing ${image} contact sheet`);

  const crafted=path.join(work,'crafted');
  await cp(path.join(root,'tests/fixtures/critique/crafted'),crafted,{recursive:true});
  for(const file of ['motion-kit.js','motion-kit.css'])await cp(path.join(root,'plugin/motion-debugger/skills/premium-motion/assets',file),path.join(crafted,file));
  const good=await critique(crafted,{outDir:path.join(work,'crafted-report')});
  const severe=good.findings.filter(finding=>finding.severity==='blocker'||finding.severity==='major');
  assert.deepEqual(severe.map(finding=>finding.id),[],'kit-built control should have no blocker/major findings');
  assert.equal(good.motion.sectionCoverage.withMotion,good.motion.sectionCoverage.sections,'every section of the control moves');
  assert.ok(good.motion.entranceStartGroups>=4,'control entrance is staggered');
  assert.equal(good.motion.reducedMotion?.hiddenAfterScroll,0,'reduced motion keeps content visible');
  assert.ok(good.score>=90,`control should score ≥90, got ${good.score}`);
  console.log(JSON.stringify({flawed:{score:flawed.score,findings:[...ids]},crafted:{score:good.score,findings:good.findings.map(finding=>finding.id)}},null,2));
}finally{await rm(work,{recursive:true,force:true})}

// Protocol path: an actual MCP SDK stdio client (what any MCP host speaks) calls motion_critique on
// both shipped servers and receives findings plus native PNG contact sheets.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
for(const entry of ['build/mcp/index.js','plugin/motion-debugger/scripts/mcp.mjs']){
  const evidence=await mkdtemp(path.join(os.tmpdir(),'critique-mcp-'));
  const client=new Client({name:'critique-protocol-verifier',version:'1.0.0'});
  try{
    await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,entry)],cwd:root,env:{PATH:process.env.PATH??'',HOME:process.env.HOME??'',MOTION_ARTIFACT_DIR:evidence},stderr:'pipe'}));
    const result=await client.callTool({name:'motion_critique',arguments:{target:path.join(root,'tests/fixtures/critique/flawed'),desktopOnly:true}});
    assert.notEqual(result.isError,true,JSON.stringify(result.content).slice(0,300));
    const text=result.content.filter(item=>item.type==='text').map(item=>item.text).join('\n');
    assert.match(text,/stays invisible|Content stays invisible/,'MCP critique reports the seeded invisible content');
    const images=result.content.filter(item=>item.type==='image');
    assert.ok(images.length>=2,'MCP critique returns contact sheets as image content');
    assert.ok(images.every(image=>image.mimeType==='image/png'&&Buffer.from(image.data,'base64').subarray(1,4).toString()==='PNG'),'images are real PNGs');
    assert.ok(result.structuredContent.score<45);
    console.log(`MCP ${entry}: ${images.length} images, score ${result.structuredContent.score}`);
  }finally{await client.close();await rm(evidence,{recursive:true,force:true})}
}
