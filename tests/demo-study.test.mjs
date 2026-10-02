import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs, verifySnapshot, commandEnvironment, prepareSnapshot, startLoopbackServer, serveDist, launchViewer, SNAPSHOTS } from '../scripts/demo-study.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
async function temp(t) { const dir = await mkdtemp(path.join(tmpdir(), 'study-demo-test-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; }
async function fixture(dir) {
  await mkdir(path.join(dir, 'src'), { recursive: true });
  const files = {
    'package.json': JSON.stringify({ scripts: { build: 'vite build' }, dependencies: { three: '0.170.0' }, devDependencies: { vite: '6.1.0' } }),
    'package-lock.json': JSON.stringify({ lockfileVersion: 3, packages: { 'node_modules/three': { resolved: 'https://registry.npmjs.org/three/-/three-0.170.0.tgz' } } }),
    'index.html': '<!doctype html><h1>Actual fixture build</h1>', 'src/main.js': 'console.log("saved source")', 'src/style.css': 'body{color:black}',
  };
  const manifest = {};
  for (const [name, content] of Object.entries(files)) { await writeFile(path.join(dir, name), content); manifest[name] = sha(content); }
  await writeFile(path.join(dir, 'SOURCE-HASHES.json'), JSON.stringify(manifest));
  return manifest;
}
async function replaceAndHash(dir, manifest, name, value) { await writeFile(path.join(dir, name), value); manifest[name] = sha(value); await writeFile(path.join(dir, 'SOURCE-HASHES.json'), JSON.stringify(manifest)); }

test('CLI refuses non-loopback host options and malformed ports', () => {
  assert.deepEqual(parseArgs(['--port', '0', '--offline', '--reuse-builds']), { port: 0, offline: true, reuse: true, prepareOnly: false, requireAll: false });
  for (const args of [['--host', '0.0.0.0'], ['--port', '65536'], ['--port', '-1'], ['--port', 'abc'], ['--cache']]) assert.throws(() => parseArgs(args));
});
test('source validation checks real hashes, exact versions and credential-free registry URLs', async t => {
  const dir = await temp(t); const manifest = await fixture(dir);
  assert.match((await verifySnapshot(dir)).digest, /^[a-f0-9]{64}$/);
  await writeFile(path.join(dir, 'src/main.js'), 'changed');
  await assert.rejects(verifySnapshot(dir), /hash mismatch/);
  await replaceAndHash(dir, manifest, 'src/main.js', 'changed');
  await replaceAndHash(dir, manifest, 'package.json', JSON.stringify({ scripts: { build: 'vite build' }, dependencies: { three: '^0.170.0' } }));
  await assert.rejects(verifySnapshot(dir), /exact pinned/);
  await replaceAndHash(dir, manifest, 'package.json', JSON.stringify({ scripts: { build: 'vite build' }, dependencies: { three: '0.170.0' } }));
  await replaceAndHash(dir, manifest, 'package-lock.json', JSON.stringify({ packages: { bad: { resolved: 'https://secret@registry.npmjs.org/pkg.tgz' } } }));
  await assert.rejects(verifySnapshot(dir), /credential-free/);
});
test('source manifests cannot read outside the snapshot', async t => {
  const dir = await temp(t), source = path.join(dir, 'source'); const manifest = await fixture(source);
  const secret = path.join(dir, 'secret.txt'); await writeFile(secret, 'do not serve');
  manifest['../secret.txt'] = sha('do not serve'); await writeFile(path.join(source, 'SOURCE-HASHES.json'), JSON.stringify(manifest));
  await assert.rejects(verifySnapshot(source), /Invalid source manifest entry/);
  delete manifest['../secret.txt']; manifest['linked.txt'] = sha('do not serve');
  await symlink(secret, path.join(source, 'linked.txt')); await writeFile(path.join(source, 'SOURCE-HASHES.json'), JSON.stringify(manifest));
  await assert.rejects(verifySnapshot(source), /escapes snapshot/);
});
test('source identity covers extra runtime inputs, not just the five required files', async t => {
  const source = await temp(t); await fixture(source);
  await writeFile(path.join(source, 'src/extra.js'), 'extra code');
  await assert.rejects(verifySnapshot(source), /not recorded in manifest/);
});
test('child command environment excludes auth and personal npm configuration', () => {
  const old = process.env.STUDY_DEMO_TEST_TOKEN; process.env.STUDY_DEMO_TEST_TOKEN = 'not-real-secret';
  try { const env = commandEnvironment('/tmp/study'); assert.equal(env.STUDY_DEMO_TEST_TOKEN, undefined); assert.equal(env.HOME, '/tmp/study/home'); assert.equal(env.CI, 'true'); assert.equal(env.npm_config_userconfig, undefined); }
  finally { if (old === undefined) delete process.env.STUDY_DEMO_TEST_TOKEN; else process.env.STUDY_DEMO_TEST_TOKEN = old; }
});
test('missing and tampered snapshots remain visible unavailable/failed results', async t => {
  const root = await temp(t), workspace = path.join(root, 'workspace');
  const item = SNAPSHOTS[0];
  assert.equal((await prepareSnapshot(root, item, {}, workspace)).status, 'unavailable');
  const source = path.join(root, 'studies/aer', item.arm, item.stage); await fixture(source);
  await writeFile(path.join(source, 'index.html'), 'tampered');
  const result = await prepareSnapshot(root, item, {}, workspace);
  assert.equal(result.status, 'failed'); assert.match(result.message, /hash mismatch/); assert.equal(result.dist, undefined);
});
test('static server binds only loopback and serves actual bytes with network restrictions', async t => {
  const root = await temp(t), dist = path.join(root, 'dist'); await mkdir(dist); await writeFile(path.join(dist, 'index.html'), '<h1>Saved output</h1>');
  await writeFile(path.join(root, 'private.txt'), 'private'); await symlink(path.join(root, 'private.txt'), path.join(dist, 'escape.txt'));
  const app = await startLoopbackServer((req, res) => serveDist(dist, req, res, 'http://127.0.0.1:4110')); t.after(() => app.close());
  assert.equal(app.server.address().address, '127.0.0.1');
  const response = await fetch(app.origin); assert.equal(response.status, 200); assert.equal(await response.text(), '<h1>Saved output</h1>');
  assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(app.origin + '/index.html', { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(app.origin, { method: 'POST' })).status, 405);
  const wrongHost = await new Promise((resolve, reject) => { const req = http.get(app.origin, { headers: { Host: 'malicious.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); });
  assert.equal(wrongHost, 403);
  assert.equal((await fetch(app.origin + '/%2e%2e%2fprivate.txt')).status, 403);
  assert.equal((await fetch(app.origin + '/escape.txt')).status, 403);
  assert.equal((await fetch(app.origin + '/missing.js')).status, 404);
});
test('viewer labels arms/stages, publishes only real ready origins and exposes failures', async t => {
  const root = await temp(t), dist = path.join(root, 'dist'); await mkdir(dist); await writeFile(path.join(dist, 'index.html'), '<h1>Not a mocked screenshot</h1>');
  await mkdir(path.join(root, 'studies/aer'), { recursive: true }); for (const name of ['PROMPT.md', 'METHOD.md', 'README.md']) await writeFile(path.join(root, 'studies/aer', name), `Real ${name}`);
  const snapshots = SNAPSHOTS.map((item, i) => ({ ...item, source: `studies/aer/${item.arm}/${item.stage}`, status: i === 0 ? 'ready' : i === 1 ? 'failed' : 'unavailable', message: i === 1 ? 'Build failed on purpose in test' : '', ...(i === 0 ? { dist } : {}) }));
  const viewer = await launchViewer(snapshots, root, 0); t.after(() => viewer.close());
  const html = await (await fetch(viewer.origin)).text(); assert.match(html, /Without the plugin/); assert.match(html, /With the plugin \+ skills/); assert.match(html, /Initial build/); assert.match(html, /Repaired build/); assert.match(html, /not a benchmark/);
  const api = await (await fetch(viewer.origin + '/api/study')).json(); assert.equal(api.snapshots.length, 4); assert.equal(api.snapshots[1].message, 'Build failed on purpose in test'); assert.equal(api.snapshots[0].dist, undefined);
  assert.notEqual(api.snapshots[0].origin, viewer.origin); assert.match(api.snapshots[0].origin, /^http:\/\/127\.0\.0\.1:/); assert.equal(api.snapshots[1].origin, undefined);
  assert.equal(await (await fetch(api.snapshots[0].origin)).text(), '<h1>Not a mocked screenshot</h1>');
  assert.equal(await (await fetch(viewer.origin + '/study/PROMPT.md')).text(), 'Real PROMPT.md');
  assert.equal((await fetch(viewer.origin + '/study/../package.json')).status, 404);
});
