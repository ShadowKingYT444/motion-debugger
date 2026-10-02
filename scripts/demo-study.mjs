#!/usr/bin/env node
// Saved source -> locked, explicit builds -> loopback-only, separate-origin previews.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rm, cp, realpath, lstat, stat, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { openSync, closeSync, unlinkSync } from 'node:fs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SNAPSHOTS = ['baseline', 'treatment'].flatMap(arm => ['initial', 'final'].map(stage => ({ arm, stage, id: `${arm}-${stage}` })));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const sha = value => createHash('sha256').update(value).digest('hex');
const inside = (base, target) => target.startsWith(base + path.sep);

export function parseArgs(argv) {
  const options = { port: 4110, offline: false, reuse: false, prepareOnly: false, requireAll: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--port') {
      const raw = argv[++i];
      if (!/^\d+$/.test(raw || '') || Number(raw) > 65535) throw Error('--port must be 0–65535');
      options.port = Number(raw);
    } else if (flag === '--cache') {
      const raw = argv[++i];
      if (!raw || raw.startsWith('--')) throw Error('--cache needs a directory');
      options.cache = path.resolve(raw);
    } else if (flag === '--offline') options.offline = true;
    else if (flag === '--reuse-builds') options.reuse = true;
    else if (flag === '--prepare-only') options.prepareOnly = true;
    else if (flag === '--require-all') options.requireAll = true;
    else if (flag === '--help') options.help = true;
    else throw Error(`Unknown option: ${flag}. This demo only supports 127.0.0.1, not a public host.`);
  }
  return options;
}

export async function verifySnapshot(source) {
  const manifestBytes = await readFile(path.join(source, 'SOURCE-HASHES.json'));
  const manifest = JSON.parse(manifestBytes);
  if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object') throw Error('Invalid source manifest');
  for (const required of ['package.json', 'package-lock.json', 'index.html', 'src/main.js', 'src/style.css']) {
    if (!manifest[required]) throw Error(`Source manifest is missing ${required}`);
  }
  for (const [name, expected] of Object.entries(manifest)) {
    const file = path.resolve(source, name);
    if (!inside(source, file) || !/^[a-f0-9]{64}$/.test(expected)) throw Error(`Invalid source manifest entry: ${name}`);
    if (!inside(await realpath(source), await realpath(file))) throw Error(`Source escapes snapshot: ${name}`);
    if (sha(await readFile(file)) !== expected) throw Error(`Source hash mismatch: ${name}. Refusing to present changed source as the saved snapshot.`);
  }
  // A cached manifest is meaningful only if it covers every runnable source input.
  async function verifyCoverage(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      const file = path.join(directory, entry.name), name = path.relative(source, file).split(path.sep).join('/');
      if (entry.isSymbolicLink()) throw Error(`Snapshot symlinks are not supported: ${name}`);
      if (entry.isDirectory()) await verifyCoverage(file);
      else if (entry.isFile() && name !== 'SOURCE-HASHES.json' && !name.endsWith('.md') && !manifest[name]) throw Error(`Runnable source is not recorded in manifest: ${name}`);
    }
  }
  await verifyCoverage(source);
  const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
  for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw Error('Snapshot dependencies must use exact pinned versions');
  }
  if (typeof pkg.scripts?.build !== 'string') throw Error('Snapshot has no explicit build script');
  const lock = JSON.parse(await readFile(path.join(source, 'package-lock.json'), 'utf8'));
  for (const entry of Object.values(lock.packages || {})) {
    if (!entry.resolved) continue;
    const url = new URL(entry.resolved);
    if (url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org' || url.username || url.password) throw Error('Only credential-free npm registry dependencies are supported');
  }
  return { digest: sha(manifestBytes), pkg };
}

// Never forward the calling shell's cloud/API tokens, npm auth, or personal config.
export function commandEnvironment(workspace) {
  const env = { PATH: process.env.PATH || '', HOME: path.join(workspace, 'home'), CI: 'true', NO_COLOR: '1' };
  for (const key of ['SYSTEMROOT', 'COMSPEC', 'PATHEXT', 'TMPDIR', 'TMP', 'TEMP']) if (process.env[key]) env[key] = process.env[key];
  return env;
}
async function command(args, cwd, env, lines) {
  console.log(`\n[${path.basename(cwd)}] npm ${args.join(' ')}`);
  lines.push(`$ npm ${args.join(' ')}\n`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(Error('npm command exceeded 180 seconds')); }, 180000);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { process.stdout.write(data); lines.push(String(data)); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(Error(`npm ${args[0]} failed (exit ${code}). See terminal and local build.log.`)); });
  });
}

export async function prepareSnapshot(root, item, options, workspace) {
  const source = path.join(root, 'studies/aer', item.arm, item.stage);
  const prepared = path.join(workspace, item.id);
  const result = { ...item, source: `studies/aer/${item.arm}/${item.stage}`, status: 'unavailable', message: 'Saved source snapshot is not present yet' };
  try { await stat(source); } catch (error) { if (error.code === 'ENOENT') return result; throw error; }
  const lines = [];
  try {
    const { digest } = await verifySnapshot(source);
    result.sourceDigest = digest;
    if (options.reuse) {
      try {
        const previous = JSON.parse(await readFile(path.join(prepared, 'prepared.json'), 'utf8'));
        if (previous.sourceDigest === digest && previous.distDigest === await hashDist(path.join(prepared, 'dist'))) {
          return { ...result, status: 'ready', message: 'Verified saved build', dist: path.join(prepared, 'dist') };
        }
      } catch { /* Missing/stale build is rebuilt, never shown as verified. */ }
    }
    await rm(prepared, { recursive: true, force: true });
    await cp(source, prepared, { recursive: true, dereference: false, filter: async file => {
      const relative = path.relative(source, file);
      if (relative.split(path.sep).some(part => ['node_modules', 'dist', '.git', '.npmrc', '.env'].includes(part) || part.startsWith('.env.'))) return false;
      if ((await lstat(file)).isSymbolicLink()) throw Error('Snapshot symlinks are not supported');
      return true;
    } });
    const config = path.join(workspace, 'empty.npmrc');
    const common = ['--ignore-scripts', '--no-audit', '--no-fund', `--cache=${options.cache || path.join(workspace, 'npm-cache')}`, `--userconfig=${config}`, `--globalconfig=${path.join(workspace, 'empty-global.npmrc')}`, '--registry=https://registry.npmjs.org'];
    await command(['ci', ...common, ...(options.offline ? ['--offline'] : [])], prepared, commandEnvironment(workspace), lines);
    // Explicit build only; dependency/prebuild/postbuild lifecycle hooks remain disabled.
    await command(['run', '--ignore-scripts', 'build'], prepared, commandEnvironment(workspace), lines);
    await verifySnapshot(prepared); // Build may not mutate saved source inputs.
    const distDigest = await hashDist(path.join(prepared, 'dist'));
    await writeFile(path.join(prepared, 'prepared.json'), JSON.stringify({ sourceDigest: digest, distDigest }, null, 2));
    return { ...result, status: 'ready', message: 'Locked install and explicit build completed', dist: path.join(prepared, 'dist') };
  } catch (error) {
    console.error(`[${item.id}] ${error.message}`);
    return { ...result, status: 'failed', message: error.message };
  } finally {
    await mkdir(prepared, { recursive: true });
    if (lines.length) await writeFile(path.join(prepared, 'build.log'), lines.join(''));
  }
}

async function hashDist(directory) {
  const entries = [];
  async function walk(dir) {
    for (const item of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, item.name);
      if (item.isSymbolicLink()) throw Error('Build output symlinks are not supported');
      if (item.isDirectory()) await walk(file);
      else if (item.isFile()) entries.push([path.relative(directory, file), sha(await readFile(file))]);
    }
  }
  await walk(directory);
  if (!entries.some(([name]) => name === 'index.html')) throw Error('Build did not emit dist/index.html');
  return sha(JSON.stringify(entries));
}

function guardRequest(request, response, port) {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Read-only demo'); return false; }
  if (request.headers.host !== `127.0.0.1:${port}`) { response.writeHead(403); response.end('Use the printed 127.0.0.1 URL'); return false; }
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  return true;
}
export async function startLoopbackServer(handler, port = 0) {
  const server = http.createServer((request, response) => {
    if (!guardRequest(request, response, server.address().port)) return;
    Promise.resolve(handler(request, response)).catch(error => { if (!response.headersSent) response.writeHead(500); response.end('Demo request failed'); console.error(error.message); });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); }) };
}
export async function serveDist(directory, request, response, viewerOrigin) {
  response.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'none'; worker-src 'self' blob:; base-uri 'none'; form-action 'none'; frame-ancestors ${viewerOrigin}`);
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); } catch { response.writeHead(400); response.end('Invalid path'); return; }
  if (pathname.includes('\\') || pathname.includes('\0')) { response.writeHead(400); response.end('Invalid path'); return; }
  const candidate = path.resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!inside(directory, candidate)) { response.writeHead(403); response.end('Path outside build'); return; }
  try {
    if (!inside(await realpath(directory), await realpath(candidate))) { response.writeHead(403); response.end('Path outside build'); return; }
    if (!(await stat(candidate)).isFile()) throw Object.assign(Error('Not a file'), { code: 'ENOENT' });
    const bytes = await readFile(candidate);
    response.writeHead(200, { 'Content-Type': TYPES[path.extname(candidate)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) { response.writeHead(404); response.end('Build asset not found'); } else throw error; }
}

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AER / Paired agent study</title><link rel="stylesheet" href="/viewer.css"></head><body><header class="masthead"><div><p class="eyebrow">MOTION DEBUGGER / SAVED CASE STUDY</p><h1>One brief. Two independent builds.</h1><p class="lede">Explore the real AER pages, before and after each agent's evidence-led repair.</p></div><button id="replay-all" type="button">Reload both pages</button></header><main><section class="context" aria-label="Study context"><p><strong>A paired demonstration, not a benchmark.</strong> Different tools and independently selected dependencies; one case cannot establish a general improvement.</p><nav aria-label="Study documents"><a href="/study/PROMPT.md" target="_blank" rel="noopener">Product brief</a><a href="/study/METHOD.md" target="_blank" rel="noopener">Method &amp; limits</a><a href="/study/README.md" target="_blank" rel="noopener">Evidence guide</a></nav></section><div id="summary" role="status" aria-live="polite">Loading saved build status…</div><section class="comparison" aria-label="Baseline and treatment comparison"><article class="arm" data-arm="baseline"><header class="arm-header"><div><p class="arm-index">ARM 01</p><h2>Without the plugin</h2><p>Ordinary coding &amp; browser evidence</p></div><a class="open-app" target="_blank" rel="noopener">Open full page ↗</a></header><div class="controls"><fieldset><legend>Saved stage</legend><label><input type="radio" name="baseline-stage" value="initial" checked> Initial build</label><label><input type="radio" name="baseline-stage" value="final"> Repaired build</label></fieldset><button class="reload" type="button">Reload</button></div><p class="stage-status" role="status" aria-live="polite"></p><div class="preview"></div><p class="provenance"></p></article><article class="arm" data-arm="treatment"><header class="arm-header"><div><p class="arm-index">ARM 02</p><h2>With the plugin + skills</h2><p>Design/3D workflow &amp; temporal evidence</p></div><a class="open-app" target="_blank" rel="noopener">Open full page ↗</a></header><div class="controls"><fieldset><legend>Saved stage</legend><label><input type="radio" name="treatment-stage" value="initial" checked> Initial build</label><label><input type="radio" name="treatment-stage" value="final"> Repaired build</label></fieldset><button class="reload" type="button">Reload</button></div><p class="stage-status" role="status" aria-live="polite"></p><div class="preview"></div><p class="provenance"></p></article></section><footer><p>These are runnable saved outputs, not screenshot composites. Stage selection loads a different preserved source build; it does not toggle a hidden repair inside an app.</p><p>The viewer does not run agents, call models, or collect new Motion MCP evidence. Follow the evidence guide for the actual build/inspect/repair record.</p></footer></main><script src="/viewer.js" defer></script></body></html>`;
const CSS = `:root{color-scheme:light;--canvas:#efefea;--surface:#fafaf7;--ink:#202821;--muted:#586259;--line:#cdd1c8;--accent:#355e44;--focus:#145dcc;--danger:#8d281c;--space:16px;--radius:5px}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}h1,h2,p{margin:0}h1{font-size:clamp(24px,2.5vw,34px);font-weight:600;line-height:1.2;letter-spacing:-.035em}h2{font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-.02em}a{color:var(--accent);text-underline-offset:3px}button{font:inherit;font-weight:550;min-height:36px;padding:6px 12px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:var(--radius);cursor:pointer}button:hover{background:#e4e8df}button:active{background:#d5ded2}button:disabled{cursor:default;opacity:.6}:focus-visible{outline:2px solid var(--focus);outline-offset:3px}.masthead{padding:28px 28px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px;background:var(--surface);border-bottom:1px solid var(--line)}.eyebrow,.arm-index{font-size:10px;font-weight:650;letter-spacing:.14em;margin-bottom:8px;color:var(--muted)}.lede{margin-top:10px;color:var(--muted)}main{padding:20px 28px}.context{display:flex;gap:20px;justify-content:space-between;align-items:center;margin-bottom:14px}.context p{max-width:790px}.context nav{display:flex;gap:16px;flex-wrap:wrap;flex-shrink:0;font-size:13px}#summary{color:var(--muted);font-size:12px;margin-bottom:16px}.comparison{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px}.arm{min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}.arm-header{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:20px 18px 16px}.arm-header p:not(.arm-index){font-size:12px;color:var(--muted);margin-top:4px}.open-app{font-size:12px;white-space:nowrap}.open-app[aria-disabled=true]{color:var(--muted);text-decoration:none;cursor:default}.controls{display:flex;justify-content:space-between;align-items:center;padding:0 18px 10px;gap:12px}fieldset{display:flex;border:0;padding:0;margin:0;gap:14px;flex-wrap:wrap}legend{font-size:11px;color:var(--muted);margin-bottom:5px}label{cursor:pointer;display:flex;align-items:center;min-height:28px;gap:5px}input{accent-color:var(--accent)}.stage-status{margin:0 18px 12px;font-size:12px;color:var(--muted);min-height:18px}.stage-status.error{color:var(--danger)}.preview{border-top:1px solid var(--line);border-bottom:1px solid var(--line);height:760px;background:white}.preview iframe{display:block;width:100%;height:100%;border:0;background:white}.empty{padding:36px 24px;max-width:520px}.empty strong{display:block;margin-bottom:8px}.empty p{overflow-wrap:anywhere;color:var(--muted)}.provenance{padding:10px 18px;font:10px/1.5 ui-monospace,monospace;color:var(--muted);overflow-wrap:anywhere}footer{font-size:12px;color:var(--muted);max-width:1100px;margin:20px 0 8px}footer p+p{margin-top:6px}@media(max-width:1100px){.context{align-items:flex-start;flex-direction:column;gap:10px}.arm-header{align-items:flex-start;flex-direction:column}.preview{height:700px}}@media(max-width:720px){.masthead{padding:20px;align-items:flex-start;flex-direction:column;gap:14px}main{padding:16px}.comparison{grid-template-columns:minmax(0,1fr);gap:20px}.arm-header{flex-direction:row;align-items:center}.controls{align-items:flex-end}.preview{height:720px}.context nav{gap:12px}}@media(max-width:390px){.arm-header{flex-direction:column;align-items:flex-start}.controls{padding-left:12px;padding-right:12px;gap:8px}fieldset{gap:7px}button{padding-left:8px;padding-right:8px}}`;
const JS = `const arms = [...document.querySelectorAll('[data-arm]')];
let snapshots = [];
function render(arm) {
  const stage = arm.querySelector('input:checked').value;
  const item = snapshots.find(x => x.arm === arm.dataset.arm && x.stage === stage);
  const status = arm.querySelector('.stage-status'), preview = arm.querySelector('.preview'), link = arm.querySelector('.open-app'), reload = arm.querySelector('.reload');
  preview.replaceChildren(); status.classList.remove('error');
  link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); link.tabIndex = -1; reload.disabled = true;
  arm.querySelector('.provenance').textContent = item ? item.source + (item.sourceDigest ? ' · manifest SHA256 ' + item.sourceDigest : '') : '';
  if (!item || item.status !== 'ready') {
    status.textContent = item?.status === 'failed' ? 'Build failed · this output is not being shown' : 'Snapshot unavailable';
    status.classList.add('error');
    const box = document.createElement('div'); box.className = 'empty';
    const title = document.createElement('strong'); title.textContent = item?.status === 'failed' ? 'The build needs attention' : 'No saved output for this stage';
    const text = document.createElement('p'); text.textContent = item?.message || 'The launcher could not load this snapshot.';
    box.append(title, text); preview.append(box); return;
  }
  status.textContent = (stage === 'initial' ? 'Initial build' : 'Repaired build') + ' · loading runnable page…';
  const frame = document.createElement('iframe');
  frame.title = (item.arm === 'baseline' ? 'Without the plugin' : 'With the plugin and skills') + ' — ' + (stage === 'initial' ? 'initial build' : 'repaired build');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin'); frame.src = item.origin + '/';
  frame.addEventListener('load', () => { if (frame.isConnected) status.textContent = (stage === 'initial' ? 'Initial build' : 'Repaired build') + ' · page loaded · frame ' + frame.clientWidth + 'px wide (not an interaction-quality pass)'; });
  preview.append(frame); link.href = item.origin + '/'; link.removeAttribute('aria-disabled'); link.removeAttribute('tabindex'); reload.disabled = false;
}
for (const arm of arms) {
  arm.addEventListener('change', event => { if (event.target.matches('input[type=radio]')) render(arm); });
  arm.querySelector('.reload').addEventListener('click', () => render(arm));
}
document.querySelector('#replay-all').addEventListener('click', () => arms.forEach(render));
fetch('/api/study').then(response => { if (!response.ok) throw Error('Saved build status request failed'); return response.json(); }).then(data => {
  snapshots = data.snapshots;
  const count = snapshots.filter(x => x.status === 'ready').length;
  document.querySelector('#summary').textContent = count + ' / 4 saved outputs built · ' + snapshots.filter(x => x.status === 'failed').length + ' failed · ' + snapshots.filter(x => x.status === 'unavailable').length + ' unavailable · credential-free loopback only';
  arms.forEach(render);
}).catch(error => { document.querySelector('#summary').textContent = error.message; arms.forEach(render); });`;

export async function launchViewer(snapshots, root = ROOT, port = 4110) {
  const servers = [];
  let viewer;
  try {
    viewer = await startLoopbackServer(async (request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      const frameOrigins = snapshots.filter(x => x.origin).map(x => x.origin).join(' ');
      response.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src ${frameOrigins || "'none'"}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
      let body, type;
      if (pathname === '/') { body = HTML; type = TYPES['.html']; }
      else if (pathname === '/viewer.css') { body = CSS; type = TYPES['.css']; }
      else if (pathname === '/viewer.js') { body = JS; type = TYPES['.js']; }
      else if (pathname === '/api/study') { body = JSON.stringify({ snapshots: snapshots.map(({ dist, ...item }) => item), limitation: 'One paired case; not a benchmark or general causal estimate.' }); type = TYPES['.json']; }
      else if (['/study/PROMPT.md', '/study/METHOD.md', '/study/README.md'].includes(pathname)) { body = await readFile(path.join(root, 'studies/aer', path.basename(pathname))); type = 'text/plain; charset=utf-8'; }
      else { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'Content-Type': type }); response.end(request.method === 'HEAD' ? undefined : body);
    }, port);
    servers.push(viewer);
    for (const item of snapshots.filter(x => x.status === 'ready')) {
      const app = await startLoopbackServer((request, response) => serveDist(item.dist, request, response, viewer.origin));
      item.origin = app.origin; servers.push(app);
    }
    return { origin: viewer.origin, close: async () => { await Promise.all(servers.map(x => x.close())); } };
  } catch (error) { await Promise.all(servers.map(x => x.close())); throw error; }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('npm run demo:study -- [--port 4110] [--reuse-builds] [--offline] [--cache DIRECTORY] [--prepare-only] [--require-all]\nBuilds saved snapshots using pinned lockfiles; serves only 127.0.0.1. See docs/DEMO.md.'); return;
  }
  const workspace = path.join(ROOT, '.motion-debugger/study-demo');
  await mkdir(path.join(workspace, 'home'), { recursive: true });
  const lockfile = path.join(workspace, 'launcher.lock');
  let lock;
  try { lock = openSync(lockfile, 'wx', 0o600); } catch (error) {
    if (error.code === 'EEXIST') throw Error('Another demo may be preparing or serving these copies. Stop it first. If it crashed, inspect .motion-debugger/study-demo/launcher.lock and remove it only after confirming its PID is no longer running.');
    throw error;
  }
  await writeFile(lockfile, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  process.once('exit', () => { closeSync(lock); try { unlinkSync(lockfile); } catch {} });
  await writeFile(path.join(workspace, 'empty.npmrc'), '');
  await writeFile(path.join(workspace, 'empty-global.npmrc'), '');
  console.log('AER saved paired case: preparing isolated copies. No agents, model APIs, or public server.\nDependency install: npm ci --ignore-scripts (official registry); build: explicit npm run --ignore-scripts build.');
  const snapshots = [];
  for (const item of SNAPSHOTS) snapshots.push(await prepareSnapshot(ROOT, item, options, workspace));
  const failed = snapshots.some(x => x.status === 'failed');
  const incomplete = snapshots.some(x => x.status !== 'ready');
  await writeFile(path.join(workspace, 'status.json'), JSON.stringify(snapshots.map(({ dist, ...item }) => item), null, 2));
  console.log('\n' + snapshots.map(x => `${x.id}: ${x.status} — ${x.message}`).join('\n'));
  if (failed || (options.requireAll && incomplete)) process.exitCode = 1;
  if (options.prepareOnly) return;
  const viewer = await launchViewer(snapshots, ROOT, options.port);
  console.log(`\nOpen ${viewer.origin}/ in a fresh, credential-free browser profile. Ctrl+C stops every owned server.`);
  console.log('STUDY_DEMO_READY ' + JSON.stringify({ origin: viewer.origin, snapshots: snapshots.map(({ dist, ...item }) => item) }));
  let closing = false;
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { if (closing) return; closing = true; await viewer.close(); });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
