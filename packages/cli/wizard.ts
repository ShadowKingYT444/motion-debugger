import {clients,type Client,type InitOptions} from './config';

/** Flags that choose an exact target or approval mode opt out of the human walkthrough. */
export function shouldUseInitWizard(args:string[],interactive:boolean) {
  return interactive&&!args.some(arg=>['--client','--config','--apply','--confirm','--project','--skills'].includes(arg));
}
export async function prepareInitWizard(options:InitOptions,ask:(question:string)=>Promise<string>) {
  const selected=(await ask(`Client (${clients.join(', ')}), Enter for generic: `)).trim().toLowerCase()||'generic';
  if(!(clients as readonly string[]).includes(selected))throw new Error(`Unsupported client: ${selected}`);
  const answer=(await ask('Download Playwright’s version-matched Chromium now? This explicitly downloads a browser; no credentials or agent settings are imported. [y/N]: ')).trim().toLowerCase();
  const skillAnswer=selected!=='generic'?(await ask('Include all seven Motion Debugger skill entries in this project? Existing different skills are never replaced. Review and approval follow. [Y/n]: ')).trim().toLowerCase():'no';
  if(!['','y','yes','n','no'].includes(skillAnswer))throw new Error('Answer yes or no for skill installation');
  const skills=!['n','no'].includes(skillAnswer);
  return {options:{...options,client:selected as Client,apply:true,...(skills?{skills:true,project:options.project??process.cwd()}:{})},downloadBrowser:answer==='yes'||answer==='y'};
}
