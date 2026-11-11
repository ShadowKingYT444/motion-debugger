// Real-browser regression for the premium-motion kit inside client-rendered apps (React, Next.js, Vue):
// elements mounted after load must be wired, repeated refreshes must not double-wire, and removed
// elements must be released. Measured in Chromium, not simulated.
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {chromiumOptions} from '../server/browser.ts';

const assets=path.resolve(import.meta.dirname,'../plugin/motion-debugger/skills/premium-motion/assets');
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="motion-kit.css"><style>body{margin:0}section{min-height:120vh;padding:40px}</style></head>
<body><main id="app"><section><h1 data-reveal>Server-rendered heading</h1></section></main><script src="motion-kit.js"></script></body></html>`;

const work=await mkdtemp(path.join(os.tmpdir(),'motion-kit-browser-'));
const file=path.join(work,'index.html');await writeFile(file,html);
for(const name of ['motion-kit.js','motion-kit.css'])await writeFile(path.join(work,name),await readFile(path.join(assets,name)));
const browser=await chromium.launch(chromiumOptions());
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(file).href,{waitUntil:'load'});
  assert.ok(await page.evaluate(()=>document.documentElement.classList.contains('mk-js')),'kit armed');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('h1')).opacity==='1',null,{timeout:4000});

  // A client render adds a below-the-fold section after load, the way a framework route change does.
  await page.evaluate(()=>{
    const section=document.createElement('section');section.id='late';
    section.innerHTML='<h2 data-reveal>Mounted later</h2><p data-count="420" data-count-suffix=" ms">420 ms</p><div data-progress style="height:150vh"></div>';
    document.getElementById('app').append(section);
  });
  await page.waitForTimeout(100);
  const before=await page.evaluate(()=>({opacity:getComputedStyle(document.querySelector('#late h2')).opacity,count:document.querySelector('#late p').textContent}));
  assert.equal(before.opacity,'0','a late reveal target is armed (hidden until it scrolls into view)');
  assert.notEqual(before.count,'0 ms','a late counter never shows 0');

  await page.evaluate(()=>document.getElementById('late').scrollIntoView());
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#late h2')).opacity==='1',null,{timeout:4000});
  await page.waitForFunction(()=>document.querySelector('#late p').textContent==='420 ms',null,{timeout:4000});
  const progress=await page.evaluate(()=>document.querySelector('#late [data-progress]').style.getPropertyValue('--p'));
  assert.ok(progress!=='','a late data-progress scene receives --p from the shared scroll loop');

  // Refreshing repeatedly must not wire elements twice: a parallax element would move twice as far.
  await page.evaluate(()=>{const el=document.createElement('div');el.id='para';el.dataset.parallax='0.2';el.textContent='layer';document.getElementById('late').append(el)});
  await page.waitForTimeout(100);
  await page.mouse.wheel(0,200);await page.waitForTimeout(200);
  const once=await page.evaluate(()=>document.getElementById('para').style.transform);
  await page.evaluate(()=>{window.motionKit.refresh();window.motionKit.refresh()});
  await page.mouse.wheel(0,-1);await page.mouse.wheel(0,1);await page.waitForTimeout(200);
  const after=await page.evaluate(()=>document.getElementById('para').style.transform);
  assert.equal(after,once,'refresh() is idempotent');

  // Unmounting a scene releases its scroll work without errors.
  await page.evaluate(()=>document.getElementById('late').remove());
  await page.mouse.wheel(0,-400);await page.waitForTimeout(200);
  assert.deepEqual(errors,[],'no page errors');
  console.log('motion kit: late mounts wired, refresh idempotent, unmounts released');
}finally{await browser.close();await rm(work,{recursive:true,force:true})}
