#!/usr/bin/env node
// Generate host adapters from the one authored plugin. Never edit agent configuration.
import {access, chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, utimes, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const generator = 'motion-debugger/plugin-packages/v1';
const hosts = ['codex', 'claude-code', 'cursor', 'skills'];
const forbidden = new Set(['node_modules', '.git', '.env', 'artifacts', 'studies', '.motion-debugger', '.motion-evidence']);
const fixedTime = new Date('1980-01-01T00:00:00Z');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

async function readSafe(file) {
  if (await realpath(file) !== file || !(await lstat(file)).isFile()) throw new Error(`Symlinks or special files are not allowed in packages: ${file}`);
  return readFile(file);
}

async function files(root, prefix = '') {
  const found = [];
  for (const entry of (await readdir(path.join(root, prefix))).sort()) {
    if (forbidden.has(entry) || entry.startsWith('.env') || /[\r\n\\]/.test(entry)) throw new Error(`Unsafe package entry: ${prefix}/${entry}`);
    const relative = prefix ? `${prefix}/${entry}` : entry;
    const info = await lstat(path.join(root, relative));
    if (info.isSymbolicLink()) throw new Error(`Symlinks are not allowed in packages: ${relative}`);
    if (info.isDirectory()) found.push(...await files(root, relative));
    else if (info.isFile()) found.push(relative);
    else throw new Error(`Unsupported package entry: ${relative}`);
  }
  return found.sort();
}

async function copyTree(from, to) {
  if (await realpath(from) !== from || (await lstat(from)).isSymbolicLink()) throw new Error(`Symlinks are not allowed in packages: ${from}`);
  for (const relative of await files(from)) {
    await mkdir(path.dirname(path.join(to, relative)), {recursive: true});
    await writeFile(path.join(to, relative), await readSafe(path.join(from, relative)));
  }
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), {recursive: true});
  await writeFile(file, json(value));
}

async function inventory(root) {
  const result = {};
  for (const file of await files(root)) {
    const bytes = await readFile(path.join(root, file));
    result[file] = {sha256: sha256(bytes), bytes: bytes.length};
  }
  return result;
}

function provenance(sourceRoot) {
  const git = args => spawnSync('git', ['-C', sourceRoot, ...args], {encoding: 'utf8'});
  const revision = git(['rev-parse', 'HEAD']);
  if (revision.status !== 0) return {commit: null, dirty: null};
  const status = git(['status', '--porcelain']);
  return {commit: revision.stdout.trim(), dirty: status.status === 0 ? Boolean(status.stdout.trim()) : null};
}

async function normalize(root) {
  for (const file of await files(root)) {
    await chmod(path.join(root, file), file === 'scripts/mcp.mjs' ? 0o755 : 0o644);
    await utimes(path.join(root, file), fixedTime, fixedTime);
  }
}

async function safeOutput(sourceRoot, requested) {
  const out = path.resolve(requested);
  if (inside(out, sourceRoot) || inside(sourceRoot, out) && !inside(path.join(sourceRoot, 'dist'), out)) {
    throw new Error('Output must be outside source directories or under dist/');
  }
  // Refuse symlinked ancestors, including a not-yet-created output beneath one.
  for (let candidate = out; ; candidate = path.dirname(candidate)) {
    try {
      await lstat(candidate);
      if (await realpath(candidate) !== candidate) throw new Error(`Output path contains a symlink: ${candidate}`);
      break;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (path.dirname(candidate) === candidate) throw new Error('Cannot resolve output parent');
  }
  try {
    const current = JSON.parse(await readFile(path.join(out, 'release-index.json'), 'utf8'));
    if (current.generator !== generator || !current.files) throw new Error('Unmanaged output directory');
    const actual = await inventory(out);
    const expected = Object.keys(current.files).concat('release-index.json').sort();
    if (json(Object.keys(actual)) !== json(expected)) throw new Error('Output contains files not managed by the packager');
    for (const [file, record] of Object.entries(current.files)) {
      if (actual[file]?.sha256 !== record.sha256) throw new Error(`Output was edited; preserve it before rebuilding: ${file}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try { await access(out); throw new Error('Refusing to replace an unmanaged output directory'); }
    catch (check) { if (check.code !== 'ENOENT') throw check; }
  }
  return out;
}

function setupReadme(host) {
  const loading = {
    codex: 'Load this extracted folder using your Codex plugin workflow. The `.codex-plugin/plugin.json` adapter uses Codex root/data substitutions.',
    'claude-code': 'Load with `claude --plugin-dir /absolute/path/to/motion-debugger`. Validate with `claude plugin validate /absolute/path/to/motion-debugger`. Invoke `/motion-debugger:motion` followed by your normal design prompt.',
    cursor: 'Copy the extracted folder into `~/.cursor/plugins/local/motion-debugger`, then reload Cursor and inspect Customize. Local plugin imports must be allowed. Invoke `/motion` followed by your normal design prompt. Evidence is stored under `.motion-debugger/evidence` relative to the MCP process working directory.',
    skills: 'This is a standalone skills fallback, not a native plugin. Copy each complete skill directory into a host-supported Agent Skills folder. Gemini/OpenCode discovery and normal-prompt invocation are unverified. Configure MCP separately with the main package CLI; this archive does not include or activate a server.'
  }[host];
  return `# Motion Debugger — ${host}\n\n${loading}\n\n` + (host === 'skills' ? '' : 'Before enabling this folder, run from its root:\n\n```sh\nnpm ci --ignore-scripts\nnode node_modules/playwright/cli.js install chromium\n```\n\nNode.js 22+ is required. Browser download and runtime installation are explicit; this package does not install itself or modify your host configuration. Linux browser OS libraries must already be available.\n\n') + 'The `skills/motion/` router includes portable animation recipes. Attach or invoke the skill and send your ordinary website/app prompt. Use only trusted, credential-free local development pages for recordings.\n\nProject license: UNLICENSED. Third-party notices retain their own terms and do not grant a project license. Host manifest checks and an MCP protocol connection do not prove that an actual coding agent loaded or used the plugin. RELEASE.json records source identity and hashes; it is not a validation verdict.\n';
}

export async function buildPluginPackages({sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.join(sourceRoot, 'dist/plugins')} = {}) {
  sourceRoot = await realpath(sourceRoot);
  const plugin = path.join(sourceRoot, 'plugin/motion-debugger');
  const metadata = JSON.parse(await readSafe(path.join(sourceRoot, 'package.json')));
  if (metadata.private !== true || metadata.license !== 'UNLICENSED') throw new Error('Expected private UNLICENSED project; no licensing changes are permitted');
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(metadata.version)) throw new Error('Invalid release version');
  for (const file of ['build/mcp/index.js', 'plugin/motion-debugger/scripts/mcp.mjs']) {
    try { await access(path.join(sourceRoot, file)); } catch { throw new Error('Run npm run build before packaging plugins'); }
  }
  const sourceManifest = JSON.parse(await readSafe(path.join(plugin, '.codex-plugin/plugin.json')));
  const runtime = JSON.parse(await readSafe(path.join(plugin, 'package.json')));
  const lock = JSON.parse(await readSafe(path.join(plugin, 'package-lock.json')));
  if ([sourceManifest.version, runtime.version, lock.version, lock.packages?.['']?.version].some(version => version !== metadata.version)) throw new Error('Version mismatch; rebuild the plugin and update its lockfile before packaging');
  if (runtime.private !== true || runtime.dependencies?.playwright !== metadata.dependencies?.playwright || lock.packages?.['']?.dependencies?.playwright !== runtime.dependencies.playwright || lock.packages?.['node_modules/playwright']?.version !== runtime.dependencies.playwright) throw new Error('Plugin runtime lock does not match the root Playwright dependency');
  await access(path.join(plugin, 'skills/motion/SKILL.md'));
  if (!(await files(path.join(plugin, 'skills/motion/recipes'))).some(file => file.endsWith('.mjs'))) throw new Error('Missing executable motion recipes');
  const output = await safeOutput(sourceRoot, out);
  await mkdir(path.dirname(output), {recursive: true});
  const stage = await mkdtemp(path.join(path.dirname(output), '.motion-plugin-stage-'));
  const source = provenance(sourceRoot);
  const index = {generator, version: metadata.version, license: metadata.license, source, packages: {}, files: {}};
  let backup;
  try {
    for (const host of hosts) {
      const directory = path.join(stage, host, 'motion-debugger');
      await mkdir(directory, {recursive: true});
      await copyTree(path.join(plugin, 'skills'), path.join(directory, 'skills'));
      await writeFile(path.join(directory, 'README.md'), setupReadme(host));
      await writeFile(path.join(directory, 'LICENSE.txt'), 'Motion Debugger project license: UNLICENSED. Third-party components retain the terms of their accompanying notices.\n');
      if (host !== 'skills') {
        for (const file of ['package.json', 'package-lock.json', 'THIRD_PARTY_LICENSES.txt']) await writeFile(path.join(directory, file), await readSafe(path.join(plugin, file)));
        await mkdir(path.join(directory, 'scripts'), {recursive: true});
        await writeFile(path.join(directory, 'scripts/mcp.mjs'), await readSafe(path.join(plugin, 'scripts/mcp.mjs')));
        await copyTree(path.join(plugin, 'workflows'), path.join(directory, 'workflows'));
        const manifest = {name: sourceManifest.name, version: metadata.version, description: sourceManifest.description, author: sourceManifest.author, repository: sourceManifest.repository, license: metadata.license, skills: './skills/'};
        const rootToken = {codex: 'PLUGIN_ROOT', 'claude-code': 'CLAUDE_PLUGIN_ROOT', cursor: 'CURSOR_PLUGIN_ROOT'}[host];
        const data = {codex: '${PLUGIN_DATA}/evidence', 'claude-code': '${CLAUDE_PLUGIN_DATA}/evidence', cursor: '.motion-debugger/evidence'}[host];
        const mcpFile = host === 'cursor' ? 'mcp.json' : '.mcp.json';
        const mcp = {mcpServers: {'motion-debugger': {command: 'node', args: [`\${${rootToken}}/scripts/mcp.mjs`], env: {MOTION_ARTIFACT_DIR: data}}}};
        await writeJson(path.join(directory, mcpFile), mcp);
        if (host === 'codex') await writeJson(path.join(directory, '.codex-plugin/plugin.json'), {...sourceManifest, mcpServers: './.mcp.json'});
        else await writeJson(path.join(directory, host === 'cursor' ? '.cursor-plugin/plugin.json' : '.claude-plugin/plugin.json'), {...manifest, mcpServers: `./${mcpFile}`});
      }
      const payload = await inventory(directory);
      await writeJson(path.join(directory, 'RELEASE.json'), {generator, host, version: metadata.version, license: metadata.license, source, validation: 'not asserted by packaging', hashScope: 'Payload files; RELEASE.json itself is hashed by release-index.json', files: payload});
      await normalize(directory);
      const archive = `motion-debugger-${metadata.version}-${host}.zip`;
      const entries = (await files(directory)).map(file => `motion-debugger/${file}`);
      const zipped = spawnSync('zip', ['-q', '-X', path.join(stage, archive), '-@'], {cwd: path.dirname(directory), input: entries.join('\n') + '\n', encoding: 'utf8', env: {...process.env, TZ: 'UTC'}});
      if (zipped.error || zipped.status !== 0) throw new Error(`ZIP creation failed; install the zip utility: ${zipped.error?.message ?? zipped.stderr}`);
      index.packages[host] = {directory: `${host}/motion-debugger`, archive, archiveSha256: sha256(await readFile(path.join(stage, archive))), payloadFiles: Object.keys(payload).length, hostValidation: 'unverified'};
    }
    index.files = await inventory(stage);
    await writeJson(path.join(stage, 'release-index.json'), index);
    try { await access(output); backup = await mkdtemp(path.join(path.dirname(output), '.motion-plugin-backup-')); await rm(backup, {recursive: true}); await rename(output, backup); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(stage, output); }
    catch (error) { if (backup) await rename(backup, output); throw error; }
    if (backup) await rm(backup, {recursive: true});
    return {...index, output};
  } catch (error) { await rm(stage, {recursive: true, force: true}); throw error; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--out')) {
    console.error('Usage: node scripts/package-plugins.mjs [--out <directory>]'); process.exitCode = 1;
  } else {
    try { const result = await buildPluginPackages(args.length ? {out: args[1]} : {}); console.log(json({output: result.output, version: result.version, packages: result.packages})); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
