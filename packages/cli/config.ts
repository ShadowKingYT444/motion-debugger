import {createHash,randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {readFile,mkdir,writeFile,rename,copyFile,unlink,lstat} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import {validateLocalUrl} from '../core/index';
import {assertSafePath,prepareSkills,skillsPreview,assertSkillsCurrent,installSkills} from './skills';

export const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const metadata=JSON.parse(await readFile(path.join(packageRoot,'package.json'),'utf8')) as {name:string;version:string};
export const clients=['generic','codex','claude-code','cursor','vscode','opencode'] as const;
export type Client=typeof clients[number];
export interface InitOptions {client:Client;config?:string;local?:boolean;origin?:string;artifactDir?:string;sourceRoots?:string[];apply?:boolean;confirm?:string;skills?:boolean;project?:string}
export function defaultConfig(client:Client,project?:string) {
  if(project){const base=path.resolve(project);return path.join(base,client==='codex'?'.codex/config.toml':client==='claude-code'?'.mcp.json':client==='cursor'?'.cursor/mcp.json':client==='vscode'?'.vscode/mcp.json':client==='opencode'?'opencode.json':'.motion-debugger/mcp.json')}
  switch(client) {
    case 'codex':return path.join(process.env.CODEX_HOME??path.join(homedir(),'.codex'),'config.toml');
    case 'claude-code':return path.resolve('.mcp.json');
    case 'cursor':return path.resolve('.cursor/mcp.json');
    case 'vscode':return path.resolve('.vscode/mcp.json');
    case 'opencode':return path.resolve('opencode.json');
    default:return path.resolve('.motion-debugger/mcp.json');
  }
}
export function serverEntry(options:InitOptions) {
  const env:Record<string,string>={MOTION_ARTIFACT_DIR:path.resolve(options.project??process.cwd(),options.artifactDir??'.motion-evidence')};
  if(options.origin){const origin=validateLocalUrl(options.origin);if(origin.origin!==options.origin)throw new Error('--origin must be an exact loopback origin without a trailing slash or path');env.MOTION_ALLOWED_ORIGINS=options.origin}
  if(options.sourceRoots?.length)env.MOTION_SOURCE_ROOTS=options.sourceRoots.map(root=>path.resolve(options.project??process.cwd(),root)).join(path.delimiter);
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
  const key=options.client==='opencode'?'mcp':options.client==='vscode'?'servers':'mcpServers';
  const existing=before.trim()?JSON.parse(before):{};
  if(!existing||typeof existing!=='object'||Array.isArray(existing))throw new Error('Configuration root must be a JSON object (JSONC comments are not supported; merge the preview manually)');
  if(existing[key]!==undefined&&(!existing[key]||typeof existing[key]!=='object'||Array.isArray(existing[key])))throw new Error(`${key} must be an object`);
  if(options.client==='opencode'&&existing.mcp?.servers)throw new Error('OpenCode v2 configuration detected. This installer targets OpenCode 1.x; merge a v2 snippet manually instead');
  const server=options.client==='opencode'?{type:'local',command:[entry.command,...entry.args],environment:entry.env,enabled:true}:options.client==='vscode'?{type:'stdio',...entry}:entry;
  return JSON.stringify({...existing,[key]:{...existing[key],'motion-debugger':server}},null,2)+'\n';
}
async function readConfig(target:string){
  await assertSafePath(target);
  try{const info=await lstat(target);if(!info.isFile())throw new Error(`Configuration destination must be a regular file: ${target}`);return {exists:true,text:await readFile(target,'utf8'),mode:info.mode&0o777}}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {exists:false,text:'',mode:0o600};throw error}
}
export async function approvePreview(options:{apply?:boolean;confirm?:string},token:string,description:string) {
  let approved=options.confirm===token;
  if(options.confirm&&!approved)throw new Error('Confirmation token does not match this exact preview. Nothing was written');
  if(!approved&&process.stdin.isTTY&&process.stdout.isTTY) {
    const input=createInterface({input:process.stdin,output:process.stdout});
    try {approved=(await input.question(`Apply the displayed ${description}? Type yes: `)).trim()==='yes'}finally{input.close()}
  }
  if(!approved)throw new Error('Nothing was written. Review this preview, then rerun with --apply --confirm <confirmationToken> (or confirm interactively)');
}
export async function init(options:InitOptions) {
  const project=options.project??(options.skills?process.cwd():undefined);
  const target=path.resolve(options.config??defaultConfig(options.client,project));
  const original=await readConfig(target),before=original.text,after=configText(options,before);
  const skillPlan=options.skills?await prepareSkills(options.client,project!,packageRoot):undefined;
  const skills=skillPlan?skillsPreview(skillPlan):undefined;
  const token=createHash('sha256').update(JSON.stringify({target,original,after,...(skills?{skills}:{})})).digest('hex');
  const changed=before!==after,skillsChanged=!!skillPlan?.skills.some(skill=>skill.status==='install');
  console.log(JSON.stringify({client:options.client,target,package:`${metadata.name}@${metadata.version}`,runtime:options.local?'absolute local path; keep this installed package in place':'version-pinned npm runtime; requires this version to be published',changed,confirmationToken:token,before,after,...(skills?{skills,skillsChanged}:{})},null,2));
  if(!options.apply||(!changed&&!skillsChanged))return;
  await approvePreview(options,token,`configuration${skillPlan?' and skill installation':''} changes`);
  const assertCurrent=async()=>{if(JSON.stringify(await readConfig(target))!==JSON.stringify(original))throw new Error('Configuration changed after preview. Nothing was written; rerun to review it')};
  await assertCurrent();if(skillPlan)await assertSkillsCurrent(skillPlan);
  let rollback:(()=>Promise<void>)|undefined;
  let backup:string|undefined;const temporary=`${target}.motion-debugger-${randomUUID()}.tmp`;
  try {
    if(changed){await mkdir(path.dirname(target),{recursive:true});await assertSafePath(target);await assertCurrent();
      if(original.exists){backup=`${target}.motion-debugger-${Date.now()}-${randomUUID()}.bak`;await copyFile(target,backup,constants.COPYFILE_EXCL)}
      await writeFile(temporary,after,{flag:'wx',mode:original.mode});
    }
    if(skillPlan)rollback=await installSkills(skillPlan);
    if(changed){await assertCurrent();await rename(temporary,target)}
  }catch(error){if(rollback)await rollback();throw error}
  finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error})}
  console.log(JSON.stringify({applied:true,target,...(backup?{backup}:{}),...(skills?{skills}:{} )},null,2));
}
export async function installSkillsOnly(options:InitOptions) {
  if(options.config||options.local||options.origin||options.artifactDir||options.sourceRoots)throw new Error('skills install accepts --client, --project, --apply and --confirm only');
  const plan=await prepareSkills(options.client,options.project??process.cwd(),packageRoot),preview=skillsPreview(plan);
  const changed=plan.skills.some(skill=>skill.status==='install');
  const token=createHash('sha256').update(JSON.stringify({client:options.client,...preview})).digest('hex');
  console.log(JSON.stringify({client:options.client,package:`${metadata.name}@${metadata.version}`,changed,confirmationToken:token,...preview},null,2));
  if(!options.apply||!changed)return;
  await approvePreview(options,token,'skill installation changes');await installSkills(plan);
  console.log(JSON.stringify({applied:true,...preview},null,2));
}
