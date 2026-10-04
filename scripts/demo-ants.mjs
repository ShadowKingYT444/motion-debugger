#!/usr/bin/env node
// Read-only frozen snapshots. No dependency installation or build execution.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, readdir, lstat, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startLoopbackServer} from './demo-study.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arms = ['ordinary', 'motion'];
const studies = {
  'ants-launch': {title:'Ants — motion study',eyebrow:'Frozen local comparison · Anthropic Ants concept'},
  'loop-studio': {title:'LOOP — motion study',eyebrow:'Frozen local comparison · LOOP studio'},
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.mp4':'video/mp4','.webm':'video/webm','.md':'text/plain; charset=utf-8'};
const documents = ['STUDY.json','README.md','PROMPT.md','METHOD.md','RESULTS.md','RESULTS.json'];
const safeName = name => typeof name === 'string' && name.length > 0 && !name.startsWith('/') && !/[\\\0\r\n]/.test(name) && name.split('/').every(part => part && part !== '.' && part !== '..' && !part.startsWith('.env') && !['node_modules','.git','.npmrc'].includes(part));

export function parseArgs(argv) {
  const options = {port: 4120};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port') {
      const raw = argv[++i];
      if (!/^\d+$/.test(raw ?? '') || Number(raw) > 65535) throw Error('--port must be 0–65535');
      options.port = Number(raw);
    } else if (argv[i] === '--help') options.help = true;
    else throw Error(`Unsupported option ${argv[i]}; this viewer serves only 127.0.0.1`);
  }
  return options;
}

async function ordinaryFile(root, name) {
  if (!safeName(name)) throw Error('Unsafe file path');
  if (await realpath(root) !== root) throw Error('Snapshot root or ancestor is a symlink');
  const file = path.join(root, name);
  if (await realpath(file) !== file || !(await lstat(file)).isFile()) throw Error(`Symlink or special file: ${name}`);
  return readFile(file);
}

async function walk(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, prefix), {withFileTypes:true})) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!safeName(name)) throw Error(`Unsafe snapshot entry: ${name}`);
    if (entry.isSymbolicLink()) throw Error(`Snapshot symlink: ${name}`);
    if (entry.isDirectory()) result.push(...await walk(root, name));
    else if (entry.isFile()) result.push(name);
    else throw Error(`Unsupported snapshot entry: ${name}`);
  }
  return result.sort();
}

export async function verifySource(directory) {
  directory = path.resolve(directory);
  const bytes = await ordinaryFile(directory, 'SOURCE-HASHES.json');
  const manifest = JSON.parse(bytes);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(manifest)) throw Error('Invalid SOURCE-HASHES.json');
  const versioned = Object.hasOwn(manifest,'schemaVersion');
  if (versioned && (manifest.schemaVersion !== 1 || JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(['files','schemaVersion']) || !object(manifest.files))) throw Error('Invalid SOURCE-HASHES.json schema1');
  const entries = versioned ? manifest.files : manifest;
  const hashes = Object.fromEntries(Object.entries(entries).map(([name,entry])=>[name,versioned ? entry?.sha256 : entry]));
  const sizes = {}, files = {};
  for (const required of ['index.html','package.json','package-lock.json']) if (!hashes[required]) throw Error(`Missing mandatory source: ${required}`);
  for (const [name, expected] of Object.entries(hashes)) {
    const entry = entries[name];
    if (!safeName(name) || name === 'SOURCE-HASHES.json' || typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected) || versioned && (!object(entry) || JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(['bytes','sha256']) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0)) throw Error(`Invalid source manifest entry: ${name}`);
    const content = await ordinaryFile(directory, name);
    if (versioned && content.length !== entry.bytes) throw Error(`Source byte size mismatch: ${name}`);
    if (sha(content) !== expected) throw Error(`Source hash mismatch: ${name}`);
    Object.defineProperty(sizes,name,{value:content.length,enumerable:true});
    Object.defineProperty(files,name,{value:{sha256:expected,bytes:content.length},enumerable:true});
  }
  const actual = (await walk(directory)).filter(name => name !== 'SOURCE-HASHES.json');
  if (JSON.stringify(actual) !== JSON.stringify(Object.keys(hashes).sort())) throw Error('SOURCE-HASHES.json must cover every file exactly');
  const html = (await ordinaryFile(directory, 'index.html')).toString('utf8');
  const missingAssets = [];
  for (const match of html.matchAll(/<(?:script|link|img|source)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const target = match[1];
    if (/^(?:data:|blob:|#)/.test(target)) continue;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) { missingAssets.push(`External asset blocked: ${target}`); continue; }
    const name = target.replace(/^\//,'').split(/[?#]/)[0];
    if (!safeName(name) || !hashes[name]) missingAssets.push(`Missing runtime asset: ${target}`);
  }
  const imports = {};
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    Object.assign(imports, JSON.parse(match[1]).imports ?? {});
  }
  // All files remain hash-covered, but only scripts reached by the browser are
  // dependency roots. Saved Node servers/tests must never be treated as browser code.
  const modules = [], visited = new Set();
  const enqueue = async name => {
    if(visited.has(name)) return;
    visited.add(name);
    if(/\.(?:js|mjs)$/.test(name)) modules.push([name,(await ordinaryFile(directory,name)).toString('utf8')]);
  };
  for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const type=/\btype\s*=\s*["']([^"']+)["']/i.exec(script[1])?.[1]?.toLowerCase();
    if(type && !['module','text/javascript','application/javascript'].includes(type)) continue;
    const target=/\bsrc\s*=\s*["']([^"']+)["']/i.exec(script[1])?.[1];
    if(!target) {modules.push(['index.html',script[2]]);continue;}
    const resolved=new URL(target,'http://snapshot.invalid/index.html');
    const name=decodeURIComponent(resolved.pathname).slice(1);
    if(resolved.origin==='http://snapshot.invalid' && safeName(name) && Object.hasOwn(hashes,name)) await enqueue(name);
  }
  for(let index=0;index<modules.length;index++) {
    const [name,code]=modules[index];
    for(const match of code.matchAll(/(?:\b(?:import|export)\s+(?:[\w*$,\s{}]+?\s+from\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\))/g)) {
    let target=match[1] ?? match[2];
    let base=name;
    if(!target.startsWith('.') && !target.startsWith('/') && !/^[a-z][a-z\d+.-]*:/i.test(target)) {
      if(Object.hasOwn(imports,target)) target=imports[target];
      else {const prefix=Object.keys(imports).filter(key=>key.endsWith('/') && target.startsWith(key)).sort((a,b)=>b.length-a.length)[0];if(prefix)target=imports[prefix]+target.slice(prefix.length);else{missingAssets.push(`Unresolved module import in ${name}: ${target}`);continue;}}
      base='index.html'; // Import-map addresses resolve against the document.
    }
    const resolved=new URL(target,`http://snapshot.invalid/${base}`);
    if(resolved.origin!=='http://snapshot.invalid'){missingAssets.push(`External module blocked in ${name}: ${target}`);continue;}
    const asset=decodeURIComponent(resolved.pathname).slice(1);
    if(!safeName(asset) || !Object.hasOwn(hashes,asset))missingAssets.push(`Missing runtime module in ${name}: ${target}`);
    else await enqueue(asset);
    }
  }
  if (missingAssets.length) throw Error(missingAssets.join('; '));
  JSON.parse((await ordinaryFile(directory,'package.json')).toString());
  JSON.parse((await ordinaryFile(directory,'package-lock.json')).toString());
  // sourceDigest keeps the legacy raw-manifest meaning. The runner's application
  // identity hashes its files object separately, preserving the manifest order.
  return {directory,hashes,sizes,sourceDigest:sha(bytes),manifestSha256:sha(bytes),applicationInputDigest:sha(JSON.stringify(versioned ? manifest.files : files))};
}

async function checkedBytes(source, name) {
  if (!Object.hasOwn(source.hashes, name)) throw Object.assign(Error('Unlisted source file'), {status:404});
  const bytes = await ordinaryFile(source.directory, name);
  if (bytes.length !== source.sizes[name] || sha(bytes) !== source.hashes[name]) throw Object.assign(Error('Source changed after verification'), {status:409});
  return bytes;
}

function sendBytes(req, res, bytes, type, ranges = false) {
  res.setHeader('Content-Type',type);
  if (ranges) res.setHeader('Accept-Ranges','bytes');
  let start = 0, end = bytes.length - 1, status = 200;
  if (ranges && req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    const numeric = match && [match[1],match[2]].filter(Boolean).every(value=>Number.isSafeInteger(Number(value)));
    if (numeric && (match[1] || match[2])) {
      if (!match[1]) start = Math.max(0, bytes.length - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end,Number(match[2])); }
    }
    if (!numeric || !match[1] && !match[2] || !match[1] && Number(match[2]) === 0 || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length) {
      res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});res.end();return;
    }
    status = 206;res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);
  }
  res.setHeader('Content-Length',end - start + 1);res.writeHead(status);res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start,end + 1));
}

export async function serveSource(source, req, res, viewerOrigin) {
  res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; base-uri 'none'; form-action 'none'; frame-ancestors ${viewerOrigin}`);
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\//,'') || 'index.html'; }
  catch { res.writeHead(400);res.end('Invalid path');return; }
  if (!safeName(name)) { res.writeHead(403);res.end('Invalid path');return; }
  if (name === 'package.json' || name === 'package-lock.json' || name === 'SOURCE-HASHES.json') { res.writeHead(404);res.end('Not a runtime endpoint');return; }
  try { sendBytes(req,res,await checkedBytes(source,name),TYPES[path.extname(name)] ?? 'application/octet-stream'); }
  catch (error) { res.writeHead(error.status ?? (error.code === 'ENOENT' ? 404 : 409));res.end('Frozen runtime asset unavailable: ' + error.message); }
}

const viewerHtml = selected => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${selected.title}</title><style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#111518;color:#eaf0ed}*{box-sizing:border-box}body{margin:0}header{padding:12px 20px;border-bottom:1px solid #2d3938;background:radial-gradient(ellipse at 80% 0,#304a47,transparent 60%)}.eyebrow{color:#9bc6bf;font-size:10px;letter-spacing:.12em;text-transform:uppercase}h1{font-weight:500;letter-spacing:-.03em;font-size:26px;margin:4px 0}p{line-height:1.5;color:#bacbc7}header p{font-size:12px;margin:4px 0 9px}.toolbar{display:flex;gap:7px;flex-wrap:wrap;align-items:center}button,a.control{background:#263531;color:#eff8f4;border:1px solid #526661;border-radius:7px;padding:7px 10px;font:inherit;font-size:12px;text-decoration:none;cursor:pointer}button:hover,a.control:hover{background:#395046}button:focus-visible,a:focus-visible{outline:3px solid #aff3c8;outline-offset:3px}main{padding:12px 16px}.panels{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.panel{border:1px solid #3b4c48;border-radius:10px;overflow:hidden;background:#19201e;min-width:0}.panel-head{padding:10px;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}h2{font-size:15px;margin:0 0 3px}.status{font-size:10px;color:#b7c9c2;overflow-wrap:anywhere}.actions{display:flex;gap:6px}.frame-wrap{position:relative;width:100%;background:#090e0c;overflow:hidden}iframe{display:block;position:absolute;top:0;left:0;width:1440px;height:960px;border:0;background:#fff;transform-origin:top left}.unavailable{padding:30px;color:#ddc5a8;min-height:280px}.evidence{margin:24px 4px}.recordings{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px}video{width:100%;max-height:72vh;object-fit:contain;background:#000}a{color:#bef0d8}.note{font-size:11px}.panel:fullscreen{height:100vh;width:100vw;border-radius:0;border:0}.panel:fullscreen .frame-wrap{overflow:auto}@media(max-width:900px){.panels,.recordings{grid-template-columns:minmax(0,1fr)}header{padding:12px 16px}.actions{flex-wrap:wrap}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style><header><div class="eyebrow">${selected.eyebrow}</div><h1>Watch the whole experience.</h1><p>Fit desktop shows each complete 1440 × 960 live viewport at panel scale. Fullscreen and Open page use the available native viewport. Recordings keep their full resolution and framing. This viewer assigns no score or improvement claim.</p><div class="toolbar"><button id="reload">Reload both pages</button><button id="desktop" aria-pressed="true">Fit desktop</button><button id="narrow" aria-pressed="false">390px width</button><span id="study-status" class="note">Loading saved study status…</span></div></header><main><section class="panels" id="panels" aria-label="Interactive study pages"></section><section class="evidence"><h2>Study evidence</h2><p id="study-note">Runtime behavior remains unverified by the viewer. Full videos preserve the captured framing and timing.</p><div id="documents" class="toolbar"></div><div id="recordings" class="recordings"></div></section></main><script type="module" src="/viewer.mjs"></script></html>`;
const js = `const study=await(await fetch('/api/study')).json();
const panels=document.querySelector('#panels');let mode='desktop';
document.querySelector('#study-status').textContent=study.status??'No study manifest available';
document.querySelector('#study-note').textContent=study.note??'No outcome is asserted. Runtime behavior remains unverified by this viewer.';
function fitFrames(){for(const panel of document.querySelectorAll('.panel')){const frame=panel.querySelector('iframe');if(!frame)continue;const wrap=frame.parentElement;const full=document.fullscreenElement===panel;const width=full?Math.round(wrap.clientWidth):mode==='narrow'?390:1440;const height=full?Math.max(320,innerHeight-panel.querySelector('.panel-head').offsetHeight):960;const scale=full?1:Math.min(mode==='narrow'?1:Infinity,wrap.clientWidth/width);frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform='scale('+scale+')';frame.style.left=Math.max(0,(wrap.clientWidth-width*scale)/2)+'px';wrap.style.height=Math.ceil(height*scale)+'px';frame.dataset.displayMode=full?'fullscreen':mode;frame.dataset.viewport=width+'x'+height;frame.dataset.displayScale=String(scale);}}
const resize=new ResizeObserver(fitFrames);
for(const arm of study.arms){
 const panel=document.createElement('article');panel.className='panel';const head=document.createElement('div');head.className='panel-head';const title=document.createElement('div');const h=document.createElement('h2');h.textContent=arm.id==='ordinary'?'Ordinary build':'Motion plugin build';const status=document.createElement('div');status.className='status';status.textContent=arm.message;title.append(h,status);head.append(title);const actions=document.createElement('div');actions.className='actions';
 if(arm.origin){const open=document.createElement('a');open.className='control';open.textContent='Open page';open.href=arm.origin;open.target='_blank';open.rel='noopener noreferrer';const full=document.createElement('button');full.textContent='Fullscreen';full.addEventListener('click',()=>panel.requestFullscreen());actions.append(open,full);}head.append(actions);panel.append(head);
 if(arm.origin){const wrap=document.createElement('div');wrap.className='frame-wrap';const frame=document.createElement('iframe');frame.title=(arm.id==='ordinary'?'Ordinary':'Motion plugin')+' frozen page';frame.src=arm.origin;frame.sandbox='allow-scripts allow-same-origin allow-popups allow-downloads';frame.allow='fullscreen';wrap.append(frame);panel.append(wrap);resize.observe(wrap);}else{const absent=document.createElement('div');absent.className='unavailable';absent.textContent='Page unavailable: '+arm.message;panel.append(absent);}panels.append(panel);
}
fitFrames();document.addEventListener('fullscreenchange',fitFrames);window.addEventListener('resize',fitFrames);
document.querySelector('#reload').addEventListener('click',()=>{for(const frame of document.querySelectorAll('iframe'))frame.src=frame.src;});
for(const id of ['desktop','narrow'])document.querySelector('#'+id).addEventListener('click',()=>{mode=id;for(const button of ['desktop','narrow'])document.querySelector('#'+button).setAttribute('aria-pressed',String(button===mode));fitFrames();});
for(const doc of study.documents){const link=document.createElement('a');link.className='control';link.href=doc.url;link.textContent=doc.name;link.target='_blank';link.rel='noopener';document.querySelector('#documents').append(link);}
for(const recording of study.recordings){const card=document.createElement('article');const h=document.createElement('h3');h.textContent=recording.label;card.append(h);if(recording.available){const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=recording.url;card.append(video);const link=document.createElement('a');link.href=recording.url;link.textContent='Open full recording';link.target='_blank';link.rel='noopener';card.append(link);}else{const p=document.createElement('p');p.textContent='Recording unavailable: '+recording.message;card.append(p);}document.querySelector('#recordings').append(card);}`;

export async function launchViewer(root = ROOT, port = 4120, {study: studyName = 'ants-launch'} = {}) {
  if (typeof studyName !== 'string' || !Object.hasOwn(studies,studyName)) throw Error('Unknown study; choose ants-launch or loop-studio');
  const selected = studies[studyName];
  const directory = path.join(path.resolve(root),'studies',studyName);
  const available = [], servers = [], recordings = [], docs = new Map();
  let study = null;
  for (const name of documents) {
    try { const bytes = await ordinaryFile(directory,name);docs.set(name,bytes);if(name === 'STUDY.json') study = JSON.parse(bytes); }
    catch (error) { if (error.code !== 'ENOENT') console.error(`Study document unavailable: ${name}: ${error.message}`); }
  }
  for (const id of arms) {
    try { const source = await verifySource(path.join(directory,'source',id));available.push({id,status:'ready',message:'Hash-verified static snapshot · runtime behavior unverified',sourceDigest:source.sourceDigest,manifestSha256:source.manifestSha256,applicationInputDigest:source.applicationInputDigest,source}); }
    catch(error) { available.push({id,status:error.code === 'ENOENT' ? 'unavailable' : 'failed',message:error.message}); }
  }
  const seen = new Set();
  for (const item of Array.isArray(study?.recordings) ? study.recordings : []) {
    const result = {id:item.id,arm:item.arm,label:String(item.label ?? `${item.arm} recording`),available:false};
    try {
      if (!/^[a-z0-9-]{1,80}$/.test(item.id) || seen.has(item.id) || !arms.includes(item.arm) || !safeName(item.file) || !item.file.startsWith('evidence/') || !/\.(?:mp4|webm)$/.test(item.file) || !/^[a-f0-9]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || item.bytes > 256e6) throw Error('Invalid recording allowlist entry');
      seen.add(item.id);const bytes = await ordinaryFile(directory,item.file);
      if(bytes.length !== item.bytes || sha(bytes) !== item.sha256) throw Error('Recording does not match saved size/hash');
      Object.assign(result,{available:true,url:`/recordings/${item.id}`,sha256:item.sha256,bytes:item.bytes,file:item.file});
    } catch(error) { result.message=error.message; }
    recordings.push(result);
  }
  let viewer;
  try {
    viewer = await startLoopbackServer(async(req,res)=>{
      const route = new URL(req.url,'http://127.0.0.1').pathname;
      res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-src ${servers.map(s=>s.origin).join(' ') || "'none'"}; media-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
      if(route === '/') return sendBytes(req,res,Buffer.from(viewerHtml(selected)),TYPES['.html']);
      if(route === '/viewer.mjs') return sendBytes(req,res,Buffer.from(js),TYPES['.mjs']);
      if(route === '/api/study') return sendBytes(req,res,Buffer.from(JSON.stringify({study:studyName,status:typeof study?.status === 'string' ? study.status : null,note:typeof study?.note === 'string' ? study.note : null,arms:available.map(({source,...item})=>item),documents:[...docs.keys()].map(name=>({name,url:`/study/${name}`})),recordings:recordings.map(({file,...item})=>item)})),TYPES['.json']);
      if(route.startsWith('/study/') && docs.has(route.slice(7))) return sendBytes(req,res,docs.get(route.slice(7)),TYPES[path.extname(route)]);
      const recording = recordings.find(item=>item.available && route === `/recordings/${item.id}`);
      if(recording){try{const bytes=await ordinaryFile(directory,recording.file);if(bytes.length!==recording.bytes || sha(bytes)!==recording.sha256)throw Error('Recording changed');return sendBytes(req,res,bytes,TYPES[path.extname(recording.file)],true);}catch{res.writeHead(409);res.end('Verified recording unavailable');return;}}
      res.writeHead(404);res.end('Not found');
    },port);
    for (const arm of available.filter(item=>item.source)) {
      const server = await startLoopbackServer((req,res)=>serveSource(arm.source,req,res,viewer.origin));servers.push(server);arm.origin=server.origin;
    }
    return {origin:viewer.origin,study:studyName,arms:available.map(({source,...item})=>item),close:async()=>{await Promise.all(servers.map(server=>server.close()));await viewer.close();}};
  } catch(error){await Promise.all(servers.map(server=>server.close()));if(viewer)await viewer.close();throw error;}
}

if(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {const options=parseArgs(process.argv.slice(2));if(options.help)console.log('node scripts/demo-ants.mjs [--port 0–65535]\nRead-only static frozen Ants snapshots; no npm/build execution.');else{const viewer=await launchViewer(ROOT,options.port);console.log(`Ants study: ${viewer.origin}`);console.log(JSON.stringify(viewer.arms,null,2));let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await viewer.close();process.exit();};process.on('SIGINT',stop);process.on('SIGTERM',stop);}}
  catch(error){console.error(error.message);process.exitCode=1;}
}
