// Real-browser regression for `critique`: a fixture with labeled seeded defects must surface them,
// and a kit-built control must pass. Measurements come from actual Chromium runs, not fixtures.
import assert from 'node:assert/strict';
import {cp,mkdtemp,readdir,rm} from 'node:fs/promises';
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
  assert.equal(good.craft.collisions+good.craft.covered+good.craft.hollow+good.craft.deadSpace+good.craft.misaligned,0,`kit-built control should have no finish defects; got ${JSON.stringify(good.craft)}`);
  // Finish (craft) checks: every labelled seeded defect in the sloppy fixture must be found in real frames,
  // and each finding must ship an annotated crop.
  const sloppy=await critique(path.join(root,'tests/fixtures/critique/sloppy'),{outDir:path.join(work,'sloppy-report'),reducedMotion:false,hover:false});
  const sloppyIds=new Set(sloppy.findings.map(finding=>finding.id));
  for(const expected of ['text-collision','copy-under-sticky','hollow-containers','dead-space','near-miss-alignment','double-spaced-code','edge-crowding','mismatched-buttons','orphan-headings','shrunken-text','clipped-code','placeholder-content'])
    assert.ok(sloppyIds.has(expected),`sloppy fixture should report ${expected}; got ${[...sloppyIds].join(', ')}`);
  assert.ok(sloppy.images.craft,'craft findings come with an annotated craft.png');
  // Kit regressions: data-split keeps inline markup, and a counter never shows 0 before it runs.
  {
    const {chromium}=await import('playwright');const {chromiumOptions}=await import('../server/browser.ts');const {serveStatic}=await import('../packages/core/critique.ts');
    const served=await serveStatic(crafted);const browser=await chromium.launch(chromiumOptions());
    try{
      const page=await browser.newPage();await page.goto(served.url,{waitUntil:'load'});await page.waitForTimeout(300);
      const kit=await page.evaluate(()=>({em:document.querySelector('h1 em')?.querySelectorAll('.mk-piece').length??0,label:document.querySelector('h1')?.getAttribute('aria-label'),counter:document.querySelector('[data-count]')?.textContent}));
      assert.ok(kit.em>=1,'data-split keeps <em> and splits inside it');
      assert.equal(kit.label,'Motion that explains the product');
      assert.notEqual(kit.counter?.trim(),'0','counters show a starting value, not 0, before they run');
    }finally{await browser.close();await served.close()}
  }
  // A preloader that locks scrolling past the entrance window must not truncate the scroll journey.
  const preloader=await critique(path.join(root,'tests/fixtures/critique/preloader'),{outDir:path.join(work,'preloader-report'),viewports:['desktop'],reducedMotion:false,hover:false});
  const scrollShots=(await readdir(path.join(work,'preloader-report','frames'))).filter(file=>file.startsWith('desktop-scroll-'));
  assert.ok(scrollShots.length>=3,`scroll journey should continue after the preloader unlocks; got ${scrollShots.length} frames`);
  console.log(JSON.stringify({flawed:{score:flawed.score,findings:[...ids]},crafted:{score:good.score,findings:good.findings.map(finding=>finding.id)},sloppy:{score:sloppy.score,craft:sloppy.craft}},null,2));
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
