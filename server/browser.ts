import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

export function chromiumOptions() {
  const mode=process.env.MOTION_BROWSER_MODE??'headless';
  if(!['headless','headed'].includes(mode))throw new Error('MOTION_BROWSER_MODE must be headless or headed');
  // Prefer Playwright's version-matched browser, then an explicitly configured/system browser.
  const system=['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(existsSync);
  const executablePath=process.env.CHROMIUM_PATH ?? (existsSync(chromium.executablePath()) ? undefined : system);
  return {headless:mode==='headless',...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']};
}
