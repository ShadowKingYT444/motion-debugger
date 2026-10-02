import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,rename,copyFile,unlink,lstat} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import {validateLocalUrl} from '../core/index';

export const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const metadata=JSON.parse(await readFile(path.join(packageRoot,'package.json'),'utf8')) as {name:string;version:string};
export const clients=['generic','codex','claude-code','cursor','vscode'] as const;
export type Client=typeof clients[number];
export interface InitOptions {client:Client;config?:string;local?:boolean;origin?:string;artifactDir?:string;sourceRoots?:string[];apply?:boolean;confirm?:string}
export function defaultConfig(client:Client) {
  switch(client) {
    case 'codex':return path.join(process.env.CODEX_HOME??path.join(homedir(),'.codex'),'config.toml');
    case 'claude-code':return path.resolve('.mcp.json');
    case 'cursor':return path.resolve('.cursor/mcp.json');
    case 'vscode':return path.resolve('.vscode/mcp.json');
    default:return path.resolve('.motion-debugger/mcp.json');
  }
}
export function serverEntry(options:InitOptions) {
  const env:Record<string,string>={MOTION_ARTIFACT_DIR:path.resolve(options.artifactDir??'.motion-evidence')};
  if(options.origin){const origin=validateLocalUrl(options.origin);if(origin.origin!==options.origin)throw new Error('--origin must be an exact loopback origin without a trailing slash or path');env.MOTION_ALLOWED_ORIGINS=options.origin}
  if(options.sourceRoots?.length)env.MOTION_SOURCE_ROOTS=options.sourceRoots.map(root=>path.resolve(root)).join(path.delimiter);
  return options.local ? {command:process.execPath,args:[path.join(packageRoot,'build/mcp/index.js')],env} : {command:process.platform==='win32'?'npx.cmd':'npx',args:['--yes',`${metadata.name}@${metadata.version}`,'mcp'],env};
}
const start='# BEGIN motion-debugger (managed)';
const end='# END motion-debugger (managed)';
export function configText(options:InitOptions,before='') {
  const entry=serverEntry(options);
  if(options.client==='codex') {
    const q=(value:string)=>JSON.stringify(value);
    const block=[start,'[mcp_servers.motion-debugger]',`command = ${q(entry.command)}`,`args = [${entry.args.map(q).join(', ')}]`,'','[mcp_servers.motion-debugger.env]',...Object.entries(entry.env).map(([key,value])=>`${key} = ${q(value)}`),end].join('\n');
    const starts=before.split(start).length-1,ends=before.split(end).length-1;
    if(starts!==ends||starts>1)throw new Error('Malformed or duplicated Motion Debugger managed block; review your TOML manually');
    const unmanaged=starts===1?before.slice(0,before.indexOf(start))+before.slice(before.indexOf(end)+end.length):before;
    if(/^\s*\[mcp_servers\.(?:motion-debugger|"motion-debugger"|'motion-debugger')(?:\]|\.)/m.test(unmanaged))throw new Error('Existing unmanaged Motion Debugger TOML entry; remove or reconcile it manually first');
    return starts===1?before.slice(0,before.indexOf(start))+block+before.slice(before.indexOf(end)+end.length):`${before}${before&&!before.endsWith('\n')?'\n':''}${before?'\n':''}${block}\n`;
  }
  const key=options.client==='vscode'?'servers':'mcpServers';
  const existing=before.trim()?JSON.parse(before):{};
  if(!existing||typeof existing!=='object'||Array.isArray(existing))throw new Error('Configuration root must be a JSON object (JSONC comments are not supported; merge the preview manually)');
  if(existing[key]!==undefined&&(!existing[key]||typeof existing[key]!=='object'||Array.isArray(existing[key])))throw new Error(`${key} must be an object`);
  const server=options.client==='vscode'?{type:'stdio',...entry}:entry;
  return JSON.stringify({...existing,[key]:{...existing[key],'motion-debugger':server}},null,2)+'\n';
}
async function readConfig(target:string){try{if((await lstat(target)).isSymbolicLink())throw new Error('Symbolic-link configuration destinations are not rewritten; select the real destination or merge the preview manually');return await readFile(target,'utf8')}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return '';throw error}}
export async function init(options:InitOptions) {
  const target=path.resolve(options.config??defaultConfig(options.client));
  const before=await readConfig(target),after=configText(options,before);
  const token=createHash('sha256').update(JSON.stringify({target,before,after})).digest('hex');
  const changed=before!==after;
  console.log(JSON.stringify({client:options.client,target,package:`${metadata.name}@${metadata.version}`,runtime:options.local?'absolute local path; keep this installed package in place':'version-pinned npm runtime; requires this version to be published',changed,confirmationToken:token,before,after},null,2));
  if(!options.apply||!changed)return;
  let approved=options.confirm===token;
  if(options.confirm&&!approved)throw new Error('Confirmation token does not match this exact configuration preview. Nothing was written');
  if(!approved&&process.stdin.isTTY&&process.stdout.isTTY) {
    const input=createInterface({input:process.stdin,output:process.stdout});
    try {approved=(await input.question(`Apply the displayed change to ${target}? Type yes: `)).trim()==='yes'}finally{input.close()}
  }
  if(!approved)throw new Error('Nothing was written. Review this preview, then rerun with --apply --confirm <confirmationToken> (or confirm interactively)');
  if(await readConfig(target)!==before)throw new Error('Configuration changed after preview. Nothing was written; rerun to review it');
  await mkdir(path.dirname(target),{recursive:true});
  const backup=before?`${target}.motion-debugger-${Date.now()}.bak`:undefined;
  if(backup)await copyFile(target,backup);
  const temporary=`${target}.motion-debugger-${process.pid}.tmp`;
  try {await writeFile(temporary,after,{flag:'wx',mode:0o600});await rename(temporary,target)}catch(error){await unlink(temporary).catch(()=>{});throw error}
  console.log(JSON.stringify({applied:true,target,...(backup?{backup}:{})},null,2));
}
