import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {launchRepairViewer, CASE} from '../scripts/demo-repair.mjs';
import {verifySnapshot, hashDist} from '../scripts/demo-study.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'repair-report-test-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const directory = path.join(root, 'artifacts/repair-case');
  await mkdir(directory, {recursive:true});
  await mkdir(path.join(root, 'build/mcp'), {recursive:true});
  // Handwritten transport fixtures, never real browser evidence or recordings.
  const runtime = 'unit-test tool bytes';
  await writeFile(path.join(root, 'build/mcp/index.js'), runtime);
  const snapshots = [], manifest = {};
  for (const stage of ['before', 'after']) {
    const source = `${CASE}/${stage}`, sourceRoot = path.join(root, source);
    await mkdir(path.join(sourceRoot, 'src'), {recursive:true});
    const files = {'index.html':'<h1>Unit transport fixture</h1>',
      'package.json':JSON.stringify({scripts:{build:'vite build'}}),
      'package-lock.json':JSON.stringify({packages:{}}),
      'src/main.js':'// fixture', 'src/style.css':'body {color:black}'};
    const hashes = {};
    for (const [name, bytes] of Object.entries(files)) {
      await writeFile(path.join(sourceRoot, name), bytes); hashes[name] = sha(bytes);
    }
    await writeFile(path.join(sourceRoot, 'SOURCE-HASHES.json'), JSON.stringify(hashes));
    const dist = path.join(root, 'dist', stage); await mkdir(dist, {recursive:true});
    await writeFile(path.join(dist, 'index.html'), files['index.html']);
    const sourceDigest = (await verifySnapshot(sourceRoot)).digest;
    snapshots.push({stage, source, sourceDigest, distDigest:await hashDist(dist), dist});
    const video = Buffer.from('Unit transport fixture, not a playable browser recording');
    await writeFile(path.join(directory, `${stage}-browser.webm`), video);
    manifest[stage] = {sourceDigest, sha256:sha(video), bytes:video.length};
  }
  const git = args => execFileSync('git', args, {cwd:root, stdio:'pipe'}).toString().trim();
  git(['init']); git(['add', 'cases']);
  git(['-c', 'user.name=Unit Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Unit fixture']);
  const report = {scope:'Handwritten transport test only', status:'passed',
    sourceCommit:'63eff24c88dcbf42438230117834d8247e103367',
    implementationCommit:git(['rev-parse', 'HEAD']), runtimeSha256:sha(runtime),
    checks:snapshots.map(({stage, source, sourceDigest, distDigest}) =>
      ({stage, source, sourceDigest, distDigest, video:`${stage}-browser.webm`})),
    errors:[], captures:[], comparisons:[]};
  async function save(pin = true, bytes = JSON.stringify(report)) {
    await writeFile(path.join(directory, 'report.json'), bytes);
    if (pin) manifest.report = {sha256:sha(bytes)};
    await writeFile(path.join(directory, 'media.json'), JSON.stringify(manifest));
    return bytes;
  }
  await save();
  return {root, directory, snapshots, manifest, report, save, git};
}
async function viewer(t, f, options = {}) {
  const session = await launchRepairViewer(f.snapshots.map(x => ({...x})), f.root, {port:0, ...options});
  t.after(() => session.close());
  return session.origin;
}
async function unavailable(origin) {
  const response = await fetch(origin + '/evidence.json');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).status, 'unavailable');
  const html = await (await fetch(origin)).text();
  assert.match(html, /Report unavailable for this exact source and runtime/);
  assert.doesNotMatch(html, /href="\/evidence.json"/);
  assert.equal((await fetch(origin + '/evidence.json', {method:'HEAD'})).status, 404);
}

test('valid report serves exact pinned bytes over HTTP, with HEAD and read-only behavior', async t => {
  const f = await fixture(t), origin = await viewer(t, f);
  const response = await fetch(origin + '/evidence.json');
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), await readFile(path.join(f.directory, 'report.json'), 'utf8'));
  assert.match(await (await fetch(origin)).text(), /href="\/evidence.json"/);
  const head = await fetch(origin + '/evidence.json', {method:'HEAD'});
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal((await fetch(origin + '/evidence.json', {method:'POST'})).status, 405);
});

for (const [name, alter] of Object.entries({
  'original commit':f => {f.report.sourceCommit = 'a'.repeat(40);},
  'implementation commit':f => {f.report.implementationCommit = 'b'.repeat(40);},
  'source path':f => {f.report.checks[0].source = 'cases/other/before';},
  'source hash':f => {f.report.checks[0].sourceDigest = 'c'.repeat(64);},
  'page runtime hash':f => {f.report.checks[1].distDigest = 'd'.repeat(64);},
  'tool runtime hash':f => {f.report.runtimeSha256 = 'e'.repeat(64);},
  'duplicate stages':f => {f.report.checks[1] = {...f.report.checks[0]};},
  'missing provenance':f => {delete f.report.runtimeSha256;},
  'malformed checks':f => {f.report.checks = [null, null];},
  'malformed status':f => {f.report.status = 'made-up';},
  'malformed arrays':f => {f.report.captures = {};},
  'stale source shared by report and manifest':f => {
    f.report.checks[0].sourceDigest = f.manifest.before.sourceDigest = 'f'.repeat(64);
  },
})) test(`rejects ${name} even when the report digest is repinned`, async t => {
  const f = await fixture(t); alter(f); await f.save();
  await unavailable(await viewer(t, f));
});

test('tampered bytes cannot validate themselves using a digest inside the report', async t => {
  const f = await fixture(t);
  f.report.errors.push('deliberately tampered');
  f.report.sha256 = sha(JSON.stringify(f.report)); await f.save(false);
  await unavailable(await viewer(t, f));
});
test('missing report digest fails closed; explicit trusted pin preserves legacy local use', async t => {
  const f = await fixture(t), bytes = JSON.stringify(f.report);
  delete f.manifest.report; await f.save(false);
  await unavailable(await viewer(t, f));
  const origin = await viewer(t, f, {reportSha256:sha(bytes)});
  assert.equal((await fetch(origin + '/evidence.json')).status, 200);
});
test('invalid JSON and top-level shapes reject visibly even with matching digest', async t => {
  const f = await fixture(t);
  for (const bytes of ['{broken', 'null', '[]', '{}']) {
    await f.save(true, bytes); await unavailable(await viewer(t, f));
  }
});
test('stale committed implementation and changed local tool bytes are rejected independently', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, CASE, 'after/src/main.js');
  await writeFile(file, '// changed implementation'); f.git(['add', 'cases']);
  f.git(['-c', 'user.name=Unit Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Changed case']);
  await unavailable(await viewer(t, f));
  await writeFile(path.join(f.root, 'build/mcp/index.js'), 'changed runtime');
  await unavailable(await viewer(t, f));
});
test('viewer-only follow-up preserves valid older local report and source-matched video range serving', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'viewer-note.txt'), 'viewer-only fixture change'); f.git(['add', 'viewer-note.txt']);
  f.git(['-c', 'user.name=Unit Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Viewer follow-up']);
  const origin = await viewer(t, f);
  assert.equal((await fetch(origin + '/evidence.json')).status, 200);
  const video = await fetch(origin + '/recordings/before.webm', {headers:{Range:'bytes=0-3'}});
  assert.equal(video.status, 206); assert.equal(await video.text(), 'Unit');
  f.manifest.before.sourceDigest = 'a'.repeat(64); await f.save(false);
  const stale = await viewer(t, f);
  await unavailable(stale);
  assert.equal((await fetch(stale + '/recordings/before.webm')).status, 404);
});
