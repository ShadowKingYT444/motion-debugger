import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, writeFile, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildPluginPackages} from '../scripts/package-plugins.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'motion-plugin-test-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const plugin = path.join(root, 'plugin/motion-debugger');
  const put = async (file, value) => {
    await mkdir(path.dirname(path.join(root, file)), {recursive: true});
    await writeFile(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value));
  };
  const version = '0.4.0', dependencies = {playwright: '1.63.0'};
  await put('package.json', {version, dependencies, private: true, license: 'MIT'});
  await put('LICENSE', 'MIT License\n');
  await put('build/mcp/index.js', '// Built entrypoint');
  await put('plugin/motion-debugger/package.json', {name: 'motion-debugger-plugin', version, dependencies, private: true, type: 'module'});
  await put('plugin/motion-debugger/package-lock.json', {version, lockfileVersion: 3, packages: {'': {version, dependencies}, 'node_modules/playwright': {version: dependencies.playwright}}});
  await put('plugin/motion-debugger/.codex-plugin/plugin.json', {name: 'motion-debugger', version, description: 'Create and verify local motion', author: {name: 'Contributors'}, skills: './skills/'});
  await put('plugin/motion-debugger/scripts/mcp.mjs', '#!/usr/bin/env node\n// Bundled server\n');
  await put('plugin/motion-debugger/README.md', '# Source documentation\n');
  await put('plugin/motion-debugger/THIRD_PARTY_LICENSES.txt', 'Retained third-party notices\n');
  await put('plugin/motion-debugger/workflows/example.json', {name: 'Workflow'});
  await put('plugin/motion-debugger/skills/motion/SKILL.md', '---\nname: motion\ndescription: Create refined animated interfaces\n---\nUse recipes.\n');
  await put('plugin/motion-debugger/skills/motion/recipes/spring.mjs', 'export const spring = () => 1;\n');
  await put('plugin/motion-debugger/skills/motion-design/references/taste-LICENSE.txt', 'MIT notice retained\n');
  // These are deliberately present outside the copied allowlist.
  await put('studies/private/report.json', {secret: 'not shipped'});
  await put('plugin/motion-debugger/node_modules/cache/private.txt', 'not shipped');
  return {root, plugin, put};
}

test('host adapters include runnable payloads, recipes and exact file/archive hashes', async t => {
  const {root, plugin} = await fixture(t);
  const result = await buildPluginPackages({sourceRoot: root});
  const tokens = {codex: 'PLUGIN_ROOT', 'claude-code': 'CLAUDE_PLUGIN_ROOT', cursor: 'CURSOR_PLUGIN_ROOT'};
  for (const [host, release] of Object.entries(result.packages)) {
    const dir = path.join(result.output, release.directory);
    const record = JSON.parse(await readFile(path.join(dir, 'RELEASE.json'), 'utf8'));
    assert.equal(record.host, host);
    assert.equal(record.source.commit, null); // Synthetic fixture makes no Git provenance claim.
    for (const [file, value] of Object.entries(record.files)) {
      const bytes = await readFile(path.join(dir, file));
      assert.equal(hash(bytes), value.sha256);
      assert.equal(bytes.length, value.bytes);
    }
    assert.equal(await readFile(path.join(dir, 'skills/motion/recipes/spring.mjs'), 'utf8'), await readFile(path.join(plugin, 'skills/motion/recipes/spring.mjs'), 'utf8'));
    const archive = path.join(result.output, release.archive);
    assert.equal(hash(await readFile(archive)), release.archiveSha256);
    const listing = spawnSync('unzip', ['-Z1', archive], {encoding: 'utf8'});
    assert.equal(listing.status, 0, listing.stderr);
    const entries = listing.stdout.trim().split('\n');
    assert.ok(entries.every(file => file.startsWith('motion-debugger/') && !file.split('/').includes('..')));
    assert.deepEqual(entries.sort(), Object.keys(record.files).concat('RELEASE.json').map(file => `motion-debugger/${file}`).sort());
    for (const entry of entries) {
      const extracted = spawnSync('unzip', ['-p', archive, entry]);
      assert.equal(extracted.status, 0);
      assert.deepEqual(extracted.stdout, await readFile(path.join(dir, entry.slice('motion-debugger/'.length))));
    }
    assert.ok(!entries.some(file => /node_modules|studies|\.env|video\.webm/.test(file)));
    if (host === 'skills') {
      assert.ok(!entries.some(file => /mcp\.mjs|plugin\.json|package\.json/.test(file)));
    } else {
      const manifestFile = {codex: '.codex-plugin/plugin.json', 'claude-code': '.claude-plugin/plugin.json', cursor: '.cursor-plugin/plugin.json'}[host];
      const manifest = JSON.parse(await readFile(path.join(dir, manifestFile), 'utf8'));
      assert.equal(manifest.version, result.version);
      assert.equal(manifest.skills, './skills/');
      const mcp = JSON.parse(await readFile(path.join(dir, manifest.mcpServers), 'utf8'));
      assert.deepEqual(mcp.mcpServers['motion-debugger'].args, [`\${${tokens[host]}}/scripts/mcp.mjs`]);
      assert.equal(await readFile(path.join(dir, 'THIRD_PARTY_LICENSES.txt'), 'utf8'), 'Retained third-party notices\n');
    }
  }
  for (const [file, value] of Object.entries(result.files)) assert.equal(hash(await readFile(path.join(result.output, file))), value.sha256);
});

test('archives are byte-identical across destinations and safe managed rebuilds', async t => {
  const {root} = await fixture(t);
  const first = await buildPluginPackages({sourceRoot: root, out: path.join(root, 'dist/a')});
  const second = await buildPluginPackages({sourceRoot: root, out: path.join(root, 'dist/b')});
  for (const host of Object.keys(first.packages)) assert.equal(first.packages[host].archiveSha256, second.packages[host].archiveSha256);
  const rebuilt = await buildPluginPackages({sourceRoot: root, out: first.output});
  assert.deepEqual(first.packages, rebuilt.packages);
});

test('unmanaged and edited output is preserved, and source directories cannot be replaced', async t => {
  const {root} = await fixture(t);
  const out = path.join(root, 'dist/user-files');
  await mkdir(out, {recursive: true});
  await writeFile(path.join(out, 'keep.txt'), 'user file');
  await assert.rejects(buildPluginPackages({sourceRoot: root, out}), /unmanaged/);
  assert.equal(await readFile(path.join(out, 'keep.txt'), 'utf8'), 'user file');
  await assert.rejects(buildPluginPackages({sourceRoot: root, out: path.join(root, 'plugin')}), /source directories/);
  const built = await buildPluginPackages({sourceRoot: root});
  await writeFile(path.join(built.output, 'codex/motion-debugger/README.md'), 'user edit');
  await assert.rejects(buildPluginPackages({sourceRoot: root}), /Output was edited/);
  assert.equal(await readFile(path.join(built.output, 'codex/motion-debugger/README.md'), 'utf8'), 'user edit');
});

test('missing build and inconsistent release versions fail before output mutation', async t => {
  const {root, put} = await fixture(t);
  await rm(path.join(root, 'build/mcp/index.js'));
  await assert.rejects(buildPluginPackages({sourceRoot: root}), /Run npm run build/);
  await put('build/mcp/index.js', '// Built');
  await put('plugin/motion-debugger/package.json', {version: '0.1.0'});
  await assert.rejects(buildPluginPackages({sourceRoot: root}), /Version mismatch/);
});

test('skill symlinks and symlinked output ancestors cannot copy or overwrite outside files', async t => {
  const {root, plugin} = await fixture(t);
  await symlink(path.join(root, 'package.json'), path.join(plugin, 'skills/motion/leak.json'));
  await assert.rejects(buildPluginPackages({sourceRoot: root}), /Symlinks/);
  await rm(path.join(plugin, 'skills/motion/leak.json'));
  await mkdir(path.join(root, 'dist'), {recursive: true});
  await symlink(plugin, path.join(root, 'dist/link'));
  await assert.rejects(buildPluginPackages({sourceRoot: root, out: path.join(root, 'dist/link/output')}), /symlink/);
});
