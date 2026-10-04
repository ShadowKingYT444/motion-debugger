#!/usr/bin/env node
// A new source-repair case. No historical study inputs are modified.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ROOT, parseArgs, prepareSnapshot, startLoopbackServer, serveDist, serveEvidence } from './demo-study.mjs';
export const CASE = 'cases/aer-drawer-continuity';
const ORIGINAL_COMMIT = '63eff24c88dcbf42438230117834d8247e103367';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

async function loadReport(directory, manifest, snapshots, root, reportSha256) {
  try {
    const bytes = await readFile(path.join(directory, 'report.json'));
    const expected = reportSha256 ?? manifest?.report?.sha256;
    // This pin comes from the separately generated media manifest (or the
    // owner's existing local evidence pin), never from the report being read.
    if (!hash(expected) || sha(bytes) !== expected) throw Error('Report hash is missing or does not match trusted provenance.');
    let report;
    try { report = JSON.parse(bytes); } catch { throw Error('Report JSON is malformed.'); }
    if (!report || Array.isArray(report) || typeof report !== 'object' ||
        typeof report.scope !== 'string' || !report.scope ||
        !['passed', 'failed'].includes(report.status) ||
        !Array.isArray(report.checks) || report.checks.length !== 2 ||
        !['errors', 'captures', 'comparisons'].every(key => Array.isArray(report[key])) ||
        typeof report.implementationCommit !== 'string' || !/^[a-f0-9]{40}$/.test(report.implementationCommit) ||
        !hash(report.runtimeSha256)) throw Error('Report provenance or structure is malformed.');
    if (report.sourceCommit !== ORIGINAL_COMMIT) throw Error('Report original source commit does not match this case.');
    for (const stage of ['before', 'after']) {
      const item = snapshots.find(item => item.stage === stage);
      const checks = report.checks.filter(check => check?.stage === stage);
      const check = checks[0];
      if (!item || checks.length !== 1 || check.source !== item.source ||
          !hash(check.sourceDigest) || check.sourceDigest !== item.sourceDigest ||
          !hash(check.distDigest) || check.distDigest !== item.distDigest ||
          check.video !== `${stage}-browser.webm` || manifest?.[stage]?.sourceDigest !== item.sourceDigest)
        throw Error('Report source or page runtime does not match the generated case.');
    }
    if (sha(await readFile(path.join(root, 'build/mcp/index.js'))) !== report.runtimeSha256)
      throw Error('Report tool runtime does not match the local build.');
    // A viewer-only follow-up commit may reuse valid local evidence. Require
    // a real ancestor with identical case and MCP build inputs, not HEAD text
    // copied into (and then self-validated by) a mutable report.
    try {
      const git = args => execFileSync('git', args, {cwd: root, stdio: 'pipe'});
      git(['merge-base', '--is-ancestor', report.implementationCommit, 'HEAD']);
      git(['diff', '--quiet', report.implementationCommit, '--', CASE,
        'packages/core', 'packages/mcp', 'server/browser.ts', 'scripts-build.mjs',
        'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.library.json']);
      for (const item of snapshots) {
        if (sha(git(['show', `${report.implementationCommit}:${item.source}/SOURCE-HASHES.json`])) !== item.sourceDigest)
          throw Error('Source manifest changed.');
      }
    } catch { throw Error('Report implementation commit does not match the case and tool sources.'); }
    return {bytes};
  } catch (error) {
    return {message: error.code === 'ENOENT' ? 'Report or local tool build is missing.' :
      error instanceof SyntaxError ? 'Media manifest JSON is malformed.' : error.message};
  }
}

export async function launchRepairCase(options = {}) {
  const workspace = path.join(ROOT, '.motion-debugger/repair-case');
  await mkdir(path.join(workspace, 'home'), { recursive: true });
  await writeFile(path.join(workspace, 'empty.npmrc'), '');
  await writeFile(path.join(workspace, 'empty-global.npmrc'), '');
  // Separate workspaces per launch prevent one session from changing another's builds.
  const run = await import('node:fs/promises').then(fs => fs.mkdtemp(path.join(workspace, 'session-')));
  const snapshots = [];
  for (const stage of ['before', 'after']) {
    const item = { id: stage, stage, arm: 'new-case', source: `${CASE}/${stage}` };
    const result = await prepareSnapshot(ROOT, item, options, run);
    if (result.status !== 'ready') throw Error(`${stage}: ${result.message}`);
    snapshots.push(result);
  }
  return launchRepairViewer(snapshots, ROOT, options);
}

// Separate preparation from serving so provenance rejection is tested over HTTP.
export async function launchRepairViewer(snapshots, root = ROOT, options = {}) {
  const media=new Map();
  const directory=path.join(root,'artifacts/repair-case');
  let manifest;
  try {
    manifest=JSON.parse(await readFile(path.join(directory,'media.json'),'utf8'));
    for(const stage of ['before','after']){
      const entry=manifest[stage];
      if(!entry||entry.sourceDigest!==snapshots.find(x=>x.stage===stage).sourceDigest)continue;
      const bytes=await readFile(path.join(directory,`${stage}-browser.webm`));
      if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)continue;
      media.set(`/recordings/${stage}.webm`,{bytes,type:'video/webm'});
    }
  }catch{}
  const evidence=await loadReport(directory,manifest,snapshots,root,options.reportSha256);
  const servers = [];
  try {
    const viewer = await startLoopbackServer(async (request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      if(media.has(pathname)){serveEvidence(media.get(pathname),request,response);return;}
      if(pathname==='/evidence.json'){
        response.setHeader('Content-Type','application/json');
        if(evidence.bytes)response.end(request.method==='HEAD'?undefined:evidence.bytes);
        else {response.writeHead(404);response.end(request.method==='HEAD'?undefined:JSON.stringify({status:'unavailable',message:evidence.message}));}
        return;
      }
      if (pathname === '/api/case') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(snapshots.map(({dist,...item})=>item))); return; }
      if (pathname === '/case.md') { response.setHeader('Content-Type', 'text/plain; charset=utf-8'); response.end(await readFile(path.join(root, CASE, 'README.md'))); return; }
      if (pathname !== '/') { response.writeHead(404);response.end('Not found');return; }
      response.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'unsafe-inline'; media-src 'self'; frame-src ${snapshots.map(x=>x.origin).join(' ')}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drawer continuity / new source-repair case</title><style>*{box-sizing:border-box}body{margin:0;background:#efefea;color:#202821;font:14px/1.5 system-ui}header,main{padding:20px 24px}header{border-bottom:1px solid #cdd1c8}h1{font-size:24px;margin:0 0 8px}h2{font-size:18px}p{max-width:1000px}a{color:#355e44;text-underline-offset:3px}a:focus-visible{outline:2px solid #145dcc;outline-offset:4px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}article{min-width:0}video{display:block;width:100%;max-height:280px;background:#171d19;margin-bottom:16px}iframe{display:block;width:100%;height:760px;border:1px solid #cdd1c8;background:white}.source{font:11px/1.5 monospace;overflow-wrap:anywhere}@media(max-width:800px){.pair{grid-template-columns:1fr}header,main{padding:16px}iframe{height:720px}}</style><header><h1>Follow the drawer through a reversal</h1><p>New repair case from the saved final treatment page. The original abruptly removes the drawer on close. The source repair gives the native dialog a visible exit and reverses from its current pose when reopened.</p><p><strong>Try it:</strong> open details, press Escape during entry, then immediately reopen. Repeat at a narrow width or with your system's reduced-motion setting. <a href="/case.md">Source change, reproduction and evidence limits</a></p><p>This is one agent-authored source repair of an observed behavior, outside the frozen AER comparison. It does not rerun agents or establish a benchmark advantage.</p></header>${evidence.bytes?'<p><a href="/evidence.json">Actual browser checks and temporal coverage report</a></p>':'<p role="status">Report unavailable for this exact source and runtime. Run npm run test:repair:browser, or supply a trusted --report-sha256 pin for an existing local report.</p>'}<main class="pair">${snapshots.map(item=>`<article><h2>${item.stage==='before'?'Before / original final page':'After / source repair'}</h2><p><a href="${item.origin}/" target="_blank" rel="noopener">Open full page</a></p>${media.has(`/recordings/${item.stage}.webm`)?`<p>Actual Chromium recording · ${item.stage==='before'?'original page':'repeated keyboard reversals after source repair'}</p><video controls playsinline preload="metadata" src="/recordings/${item.stage}.webm" aria-label="${item.stage} actual browser recording"></video>`:'<p>Recording unavailable for this exact source. Run npm run test:repair:browser first.</p>'}<iframe src="${item.origin}/" title="${item.stage} drawer continuity case" sandbox="allow-scripts allow-same-origin"></iframe><p class="source">${item.source}<br>Source manifest SHA256 ${item.sourceDigest}<br>Runtime build SHA256 ${item.distDigest}</p></article>`).join('')}</main></html>`);
    }, options.port ?? 4111);
    servers.push(viewer);
    for (const item of snapshots) {
      const app = await startLoopbackServer((req,res)=>serveDist(item.dist,req,res,viewer.origin));
      item.origin = app.origin; servers.push(app);
    }
    return { origin: viewer.origin, snapshots, close: async()=>Promise.all(servers.map(x=>x.close())) };
  } catch (error) { await Promise.all(servers.map(x=>x.close()));throw error; }
}
async function main() {
  const argv = process.argv.slice(2);
  const pinIndex = argv.indexOf('--report-sha256');
  let reportSha256;
  if (pinIndex >= 0) {
    reportSha256 = argv[pinIndex + 1];
    if (!hash(reportSha256)) throw Error('--report-sha256 needs a trusted SHA-256 digest');
    argv.splice(pinIndex, 2);
  }
  const options = {...parseArgs(argv), ...(reportSha256 ? {reportSha256} : {})};
  if (options.help) { console.log('npm run demo:repair -- [--port 4111] [--offline] [--cache DIRECTORY] [--report-sha256 TRUSTED_DIGEST]\nNew isolated source-repair case; original AER history is preserved.');return; }
  const session = await launchRepairCase({...options,port:process.argv.includes('--port')?options.port:4111});
  console.log('REPAIR_CASE_READY '+JSON.stringify({origin:session.origin,snapshots:session.snapshots.map(({dist,...item})=>item)}));
  let closing=false;
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(closing)return;closing=true;await session.close()});
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1});
