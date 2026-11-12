import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// An installed Chrome, Chromium or Edge, for when Playwright's own browser has not been downloaded.
function systemBrowsers():string[] {
  if(process.platform==='darwin')return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
  if(process.platform==='win32')return [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter((base):base is string=>!!base).flatMap(base=>[path.join(base,'Google','Chrome','Application','chrome.exe'),path.join(base,'Chromium','Application','chrome.exe'),path.join(base,'Microsoft','Edge','Application','msedge.exe')]);
  return ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/snap/bin/chromium','/usr/bin/microsoft-edge'];
}

export function chromiumOptions() {
  const mode=process.env.MOTION_BROWSER_MODE??'headless';
  if(!['headless','headed'].includes(mode))throw new Error('MOTION_BROWSER_MODE must be headless or headed');
  // Prefer Playwright's version-matched browser, then an explicitly configured/system browser.
  const system=systemBrowsers().find(existsSync);
  const executablePath=process.env.CHROMIUM_PATH ?? (existsSync(chromium.executablePath()) ? undefined : system);
  return {headless:mode==='headless',...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']};
}
