import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {chromiumOptions} from '../../server/browser';
import {metadata,packageRoot} from './config';
const require=createRequire(import.meta.url);
export async function installBrowser() {
  const playwrightRoot=path.dirname(require.resolve('playwright/package.json'));
  const version=JSON.parse(require('node:fs').readFileSync(path.join(playwrightRoot,'package.json'),'utf8')).version;
  console.error(`Installing Chromium for Playwright ${version}. This downloads a browser into Playwright's cache; no agent settings will be changed. On Linux, missing system libraries need your normal OS package administrator (this command does not use sudo)`);
  await new Promise<void>((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(playwrightRoot,'cli.js'),'install','chromium'],{stdio:'inherit'});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`Chromium download exited ${code}. Check network/proxy and PLAYWRIGHT_BROWSERS_PATH, then retry motion-debugger setup --browser`)));
  });
}
export async function doctor(skipLaunch=false) {
  const options=chromiumOptions();
  const executable=options.executablePath??chromium.executablePath();
  const checks:{name:string;ok:boolean;detail:string}[]=[
    {name:'node',ok:Number(process.versions.node.split('.')[0])>=22,detail:process.version},
    {name:'packaged-demo',ok:existsSync(path.join(packageRoot,'build/assets/dist/index.html')),detail:path.join(packageRoot,'build/assets/dist/index.html')},
    {name:'mcp-entry',ok:existsSync(path.join(packageRoot,'build/mcp/index.js')),detail:path.join(packageRoot,'build/mcp/index.js')},
    {name:'chromium-executable',ok:existsSync(executable),detail:executable}
  ];
  if(!skipLaunch&&existsSync(executable)) {
    try{const browser=await chromium.launch({...options,timeout:15000});try{const page=await browser.newPage();await page.setContent('<title>Motion Debugger doctor</title>');checks.push({name:'chromium-launch',ok:await page.title()==='Motion Debugger doctor',detail:browser.version()})}finally{await browser.close()}}catch(error){checks.push({name:'chromium-launch',ok:false,detail:(error instanceof Error?error.message:String(error)).slice(0,4000)})}
  }
  const ok=checks.every(check=>check.ok);
  return {ok,package:`${metadata.name}@${metadata.version}`,checks,browserLaunchSkipped:skipLaunch,environment:{CHROMIUM_PATH:process.env.CHROMIUM_PATH??null,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH??null},...(!ok?{nextSteps:['Run motion-debugger setup --browser to explicitly download the version-matched Chromium','For a custom browser, set CHROMIUM_PATH to its executable and rerun doctor','If Chromium exists but cannot launch, inspect the launch error for missing Linux libraries or sandbox restrictions']}:{})};
}
