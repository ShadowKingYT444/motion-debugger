import { chromium } from 'playwright';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
page.on('console',m=>console.log('console:',m.type(),m.text()));page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.goto('http://127.0.0.1:5173');await page.waitForTimeout(1500);await page.screenshot({path:'evidence/desktop-initial.png'});await page.locator('#launch').click();await page.waitForTimeout(4500);await page.screenshot({path:'evidence/desktop-working.png'});await browser.close();
