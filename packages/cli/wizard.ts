import {access} from 'node:fs/promises';
import path from 'node:path';
import {clients,type Client,type InitOptions} from './config';

/** Flags that choose an exact target or approval mode opt out of the human walkthrough. */
export function shouldUseInitWizard(args:string[],interactive:boolean) {
  return interactive&&!args.some(arg=>['--client','--config','--apply','--confirm','--project','--skills'].includes(arg));
}
/** Suggest the coding agent a project already uses from files it keeps there. Only a default; the user still chooses. */
export async function detectClient(project:string):Promise<Client|undefined> {
  const markers:[Client,string[]][]=[['claude-code',['.claude','CLAUDE.md','.mcp.json']],['cursor',['.cursor','.cursorrules']],['codex',['.codex']],['opencode',['opencode.json']],['vscode',['.vscode/mcp.json','.github/copilot-instructions.md']]];
  for(const [client,files] of markers)for(const file of files){try{await access(path.join(project,file));return client}catch{}}
  return undefined;
}
export async function prepareInitWizard(options:InitOptions,ask:(question:string)=>Promise<string>,detected?:Client) {
  const fallback=detected??'generic';
  const selected=(await ask(`Client (${clients.join(', ')})${detected?` — detected ${detected}`:''}, Enter for ${fallback}: `)).trim().toLowerCase()||fallback;
  if(!(clients as readonly string[]).includes(selected))throw new Error(`Unsupported client: ${selected}`);
  const answer=(await ask('Download Playwright’s version-matched Chromium now? This explicitly downloads a browser; no credentials or agent settings are imported. [y/N]: ')).trim().toLowerCase();
  const skillAnswer=selected!=='generic'?(await ask('Include all seven Motion Debugger skill entries in this project? Existing different skills are never replaced. Review and approval follow. [Y/n]: ')).trim().toLowerCase():'no';
  if(!['','y','yes','n','no'].includes(skillAnswer))throw new Error('Answer yes or no for skill installation');
  const skills=!['n','no'].includes(skillAnswer);
  // Until an npm release exists, point the agent at this installed copy rather than an unpublished npx version.
  return {options:{...options,local:options.local??true,client:selected as Client,apply:true,...(skills?{skills:true,project:options.project??process.cwd()}:{})},downloadBrowser:answer==='yes'||answer==='y'};
}
