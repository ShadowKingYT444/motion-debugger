import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

export function chromiumOptions() {
  // Prefer Playwright's version-matched browser, then an explicitly configured/system browser.
  const system=['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(existsSync);
  const executablePath=process.env.CHROMIUM_PATH ?? (existsSync(chromium.executablePath()) ? undefined : system);
  return {headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']};
}
