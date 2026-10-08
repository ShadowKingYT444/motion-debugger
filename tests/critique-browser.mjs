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
