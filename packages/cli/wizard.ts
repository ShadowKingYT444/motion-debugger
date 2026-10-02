import {clients,type Client,type InitOptions} from './config';

/** Flags that choose an exact target or approval mode opt out of the human walkthrough. */
export function shouldUseInitWizard(args:string[],interactive:boolean) {
  return interactive&&!args.some(arg=>['--client','--config','--apply','--confirm'].includes(arg));
}
export async function prepareInitWizard(options:InitOptions,ask:(question:string)=>Promise<string>) {
  const selected=(await ask(`Client (${clients.join(', ')}), Enter for generic: `)).trim().toLowerCase()||'generic';
  if(!(clients as readonly string[]).includes(selected))throw new Error(`Unsupported client: ${selected}`);
  const answer=(await ask('Download Playwright’s version-matched Chromium now? This explicitly downloads a browser; no credentials or agent settings are imported. [y/N]: ')).trim().toLowerCase();
  return {options:{...options,client:selected as Client,apply:true},downloadBrowser:answer==='yes'||answer==='y'};
}
