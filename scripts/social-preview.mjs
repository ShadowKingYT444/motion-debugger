// Renders docs/assets/social-preview.png (1280×640), the image GitHub shows when the repository link is shared.
// Upload it under Settings → General → Social preview. Uses IBM Plex if installed, else system fonts.
// Run: node --import tsx scripts/social-preview.mjs
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {chromiumOptions} from '../server/browser.ts';

const root=path.resolve(import.meta.dirname,'..');
const poster=(await readFile(path.join(root,'demos/ledgerline/poster.jpg'))).toString('base64');
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1280px;height:640px;overflow:hidden;background:#0d0f13;color:#f2efe8;font-family:'IBM Plex Sans',system-ui,sans-serif;position:relative}
.top{position:absolute;left:64px;right:64px;top:52px;display:flex;justify-content:space-between;align-items:flex-start}
.brand{display:flex;align-items:center;gap:14px;font:600 26px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.04em;color:#9aa7bd}
.mark{width:40px;height:40px;border-radius:11px;background:#ffb33d;display:grid;place-items:center}
h1{position:absolute;left:64px;top:118px;font-weight:700;font-size:66px;line-height:1.02;letter-spacing:-.035em;max-width:820px}
h1 span{color:#ffb33d}
.sub{position:absolute;left:66px;top:272px;font:500 22px/1.35 'IBM Plex Mono',ui-monospace,monospace;color:#9aa7bd}
.agents{font:500 18px/1 'IBM Plex Mono',ui-monospace,monospace;color:#6f7b8f;text-align:right;line-height:1.5}
.shot{position:absolute;left:64px;right:64px;bottom:0;height:262px;border-radius:16px 16px 0 0;overflow:hidden;border:1px solid #2a2f38;border-bottom:0;
  background:url(data:image/jpeg;base64,${poster}) center top/100% auto no-repeat}
</style></head><body>
<div class="top"><div class="brand"><div class="mark"><svg width="26" height="20" viewBox="0 0 26 20"><path d="M3 17V4l10 8 10-8v13" fill="none" stroke="#151b26" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>MOTION DEBUGGER</div>
<div class="agents">Claude Code · Cursor · Codex<br>any coding agent</div></div>
<h1>Vibe-coded sites that don't <span>look</span> vibe-coded.</h1>
<p class="sub">A real-browser critic + design skill for your coding agent</p>
<div class="shot"></div>
</body></html>`;
const browser=await chromium.launch(chromiumOptions());
try{
  const page=await browser.newPage({viewport:{width:1280,height:640},deviceScaleFactor:1});
  await page.setContent(html,{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(root,'docs/assets/social-preview.png')});
  console.log('wrote docs/assets/social-preview.png');
}finally{await browser.close()}
