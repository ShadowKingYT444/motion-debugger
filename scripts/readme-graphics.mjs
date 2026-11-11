#!/usr/bin/env node
// Renders the README graphics from real study data and real recorded frames. Nothing is drawn by
// hand: charts read the summarized results, and every site image is a frame the recorder captured.
//
//   node scripts/readme-graphics.mjs --batch studies/premium-ab/results/batch4 [--out docs/assets]
//
// Inputs (from studies/premium-ab/evaluate.mjs and combine.mjs):
//   <batch>/results.json, <batch>/combined.json, <batch>/metrics.json, <batch>/recordings/<task>-<arm>-<seed>/
// Outputs:
//   <out>/results-light.png, results-dark.png      blinded judge scores and measured page metrics
//   <out>/critic-light.png, critic-dark.png        finish defects the critic outlined on a control site
//   demos/<task>/compare.jpg                       hero + scroll frames, without vs with the plugin
//   <out>/banner.png                               README header built from two of those frames
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2);const option=(name,fallback)=>{const i=argv.indexOf(`--${name}`);return i>=0?argv[i+1]:fallback};
const batch=path.resolve(option('batch','studies/premium-ab/results/batch4'));
const out=path.resolve(option('out','docs/assets'));
const only=option('only')?.split(',');
const want=(name)=>!only||only.includes(name);
const read=async(file)=>JSON.parse(await readFile(path.join(batch,file),'utf8'));
const results=await read('results.json'),combined=await read('combined.json'),metrics=await read('metrics.json');
const pairs=JSON.parse(await readFile(path.join(root,'demos/pairs.json'),'utf8'));
const dataUrl=async(file)=>`data:image/${file.endsWith('.png')?'png':'jpeg'};base64,${(await readFile(file)).toString('base64')}`;
const esc=(text)=>String(text).replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

const system=['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(existsSync);
const executablePath=process.env.CHROMIUM_PATH??(existsSync(chromium.executablePath())?undefined:system);
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const FONTS=`<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;
async function render(html,file,{width,height,type='png',scale=2}) {
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:scale});
  try{
    await page.setContent(html,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    const size=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}));
    await page.setViewportSize({width:Math.max(width,size.w),height:Math.max(1,size.h)});
    await page.screenshot({path:file,type,...(type==='jpeg'?{quality:86}:{}),fullPage:true});
    console.log(`wrote ${path.relative(root,file)}`);
  }finally{await page.close()}
}
// Light and dark tokens. Series: control is a muted neutral, treatment the emphasis hue (validated
// reference blue); text never wears the series colour.
const themes={
  light:{surface:'#fcfcfb',panel:'#f3f2ee',line:'#e2e0da',ink:'#0b0b0b',ink2:'#52514e',ink3:'#7b7a75',control:'#a3a19b',treatment:'#2a78d6',good:'#1b7a4f'},
  dark:{surface:'#121211',panel:'#1a1a19',line:'#2c2b29',ink:'#ffffff',ink2:'#c3c2b7',ink3:'#8f8e86',control:'#77756f',treatment:'#3987e5',good:'#4cc38a'}
};
const css=(t)=>`:root{--surface:${t.surface};--panel:${t.panel};--line:${t.line};--ink:${t.ink};--ink2:${t.ink2};--ink3:${t.ink3};--control:${t.control};--treatment:${t.treatment};--good:${t.good}}
*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink);font:15px/1.45 "Inter Tight",ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.mono{font-family:"JetBrains Mono",ui-monospace,monospace}`;

// ---------- results: blinded judge scores (dumbbells) + measured metrics ----------
const dimLabels={overall_premium:'Overall premium',visual_design:'Visual design',distinctiveness:'Distinctiveness',motion_quality:'Motion quality',interaction_polish:'Interaction polish',mobile_robustness:'Mobile robustness'};
function resultsHtml(t) {
  const dims=Object.keys(dimLabels).filter(dim=>results.dimension[dim]?.control!=null);
  const lo=Math.max(1,Math.floor(Math.min(...dims.flatMap(dim=>[results.dimension[dim].control,results.dimension[dim].treatment]))-1)),hi=10;
  const x=(v)=>((v-lo)/(hi-lo)*100).toFixed(2)+'%';
  const p=(dim)=>combined.dimensions[dim]?.pTwoSided;
  const fmtP=(v)=>v==null?'':v<0.001?'p < 0.001':`p = ${v<0.01?v.toFixed(3):v.toFixed(2)}`;
  const rows=dims.map(dim=>{const c=results.dimension[dim].control,tr=results.dimension[dim].treatment,d=tr-c;const left=Math.min(c,tr),right=Math.max(c,tr);
    return `<div class="row"><div class="label">${dimLabels[dim]}</div><div class="track">${Array.from({length:hi-lo+1},(_,i)=>`<i style="left:${x(lo+i)}"></i>`).join('')}
      <b class="bar" style="left:${x(left)};width:calc(${x(right)} - ${x(left)})"></b><span class="dot c" style="left:${x(c)}" title="Without ${c}"></span><span class="dot t" style="left:${x(tr)}" title="With ${tr}"></span>
      <em class="v c" style="left:${x(c)}">${c.toFixed(1)}</em><em class="v t" style="left:${x(tr)}">${tr.toFixed(1)}</em></div>
      <div class="delta"><strong>${d>=0?'+':''}${d.toFixed(2)}</strong><span>${fmtP(p(dim))}</span></div></div>`}).join('');
  const arm=(field,armName)=>metrics.filter(item=>item.arm===armName&&Number.isFinite(item[field])).map(item=>item[field]);
  const avg=(values)=>values.length?values.reduce((a,b)=>a+b,0)/values.length:NaN;
  const stat=(label,field,unit,better,digits=1,max)=>{const c=avg(arm(field,'control')),tr=avg(arm(field,'treatment'));const scale=max??Math.max(c,tr)*1.15;
    return `<div class="stat"><div class="stat-label">${label}<span>${better}</span></div>
      <div class="hbar"><span class="c" style="width:${(c/scale*100).toFixed(1)}%"></span><em>${c.toFixed(digits)}${unit}</em></div>
      <div class="hbar"><span class="t" style="width:${(tr/scale*100).toFixed(1)}%"></span><em>${tr.toFixed(digits)}${unit}</em></div></div>`};
  const n=combined.pairs,j=combined.judgments,w=combined.judgmentWins;
  return `<!doctype html><html><head>${FONTS}<style>${css(t)}
  .wrap{width:1200px;padding:44px 48px 40px}
  h1{font-size:26px;letter-spacing:-.02em;margin:0 0 6px;font-weight:600}.sub{color:var(--ink2);margin:0 0 26px;font-size:15px}
  .legend{display:flex;gap:22px;margin:0 0 22px;color:var(--ink2);font-size:14px}.legend span{display:inline-flex;align-items:center;gap:8px}.legend i{width:12px;height:12px;border-radius:50%;display:inline-block}
  .grid{display:grid;grid-template-columns:1.55fr 1fr;gap:28px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:24px 26px}
  .card h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);margin:0 0 18px;font-weight:600}
  .row{display:grid;grid-template-columns:150px 1fr 104px;align-items:center;gap:16px;height:58px}
  .label{font-weight:500}.track{position:relative;height:40px}.track i{position:absolute;top:8px;bottom:8px;width:1px;background:var(--line)}
  .bar{position:absolute;top:19px;height:2px;background:var(--treatment);opacity:.45}
  .dot{position:absolute;top:13px;width:14px;height:14px;margin-left:-7px;border-radius:50%;box-shadow:0 0 0 2px var(--panel)}.dot.c{background:var(--control)}.dot.t{background:var(--treatment)}
  .v{position:absolute;top:-6px;font-style:normal;font-size:12px;color:var(--ink2);transform:translateX(-50%)}.v.t{top:30px;color:var(--ink)}
  .delta{text-align:right}.delta strong{display:block;font-size:17px;font-weight:600}.delta span{font-size:12px;color:var(--ink3)}
  .axis{display:grid;grid-template-columns:150px 1fr 104px;gap:16px;color:var(--ink3);font-size:12px;margin-top:4px}.axis div{position:relative;height:16px}.axis b{position:absolute;font-weight:400;transform:translateX(-50%)}
  .stat{margin-bottom:22px}.stat-label{display:flex;justify-content:space-between;font-weight:500;margin-bottom:8px}.stat-label span{color:var(--ink3);font-weight:400;font-size:12px}
  .hbar{display:flex;align-items:center;gap:10px;height:22px;margin:4px 0}.hbar span{height:14px;border-radius:0 4px 4px 0;display:block}.hbar .c{background:var(--control)}.hbar .t{background:var(--treatment)}.hbar em{font-style:normal;font-size:13px;color:var(--ink)}
  .foot{margin-top:18px;color:var(--ink3);font-size:12.5px}</style></head><body><div class="wrap">
  <h1>Blinded judges preferred the plugin's site in ${combined.pairOutcomes.treatment} of ${n} matched pairs</h1>
  <p class="sub">Same brief, same builder model, one fresh agent per site. Opus judges saw only neutral recordings, each pair twice with sides swapped. ${w.treatment} of ${j} judgments picked the plugin's site.</p>
  <div class="legend"><span><i style="background:var(--control)"></i>Without the plugin</span><span><i style="background:var(--treatment)"></i>With premium-motion</span></div>
  <div class="grid"><div class="card"><h2>Judge scores, mean of ${j} judgments (1–10)</h2>${rows}
    <div class="axis"><div></div><div>${Array.from({length:hi-lo+1},(_,i)=>`<b style="left:${x(lo+i)}">${lo+i}</b>`).join('')}</div><div style="text-align:right">Δ, sign-flip test</div></div>${n<6?`<p class="foot">With ${n} pairs the smallest p this exact test can produce is ${(2/2**n).toFixed(3)}.</p>`:''}</div>
  <div class="card"><h2>Measured on every site</h2>
    ${stat('Template traits','templateTraits',' / 9','fewer is better',1,9)}
    ${stat('Finish defects found','craftDefects','','fewer is better',1)}
    ${stat('Critic score','score','','higher is better',0,100)}
    <p class="foot">Measured by the same critic on both arms after the builds finished. The plugin's agents iterated against this critic, so these numbers show that they used it, not an independent quality measure.</p></div></div>
  </div></body></html>`;
}

// ---------- compare: hero + scroll frames per brief ----------
async function framesFor(run) {
  const dir=path.join(batch,'recordings',run,'frames');
  const files=(await readdir(dir)).filter(file=>file.startsWith('desktop-scroll-')).sort();
  const entrance=(await readdir(dir)).filter(file=>file.startsWith('desktop-entrance-')).sort().at(-1);
  // Hero after the entrance, then three evenly spaced scroll stops.
  const picks=[entrance,...[.25,.5,.78].map(q=>files[Math.min(files.length-1,Math.round(q*(files.length-1)))])].filter(Boolean);
  return Promise.all(picks.map(file=>dataUrl(path.join(dir,file))));
}
async function compareHtml(pair,seed) {
  const control=await framesFor(`${pair.id}-control-${seed}`),treatment=await framesFor(`${pair.id}-treatment-${seed}`);
  const strip=(label,frames,tone)=>`<div class="arm"><div class="tag ${tone}">${label}</div><div class="frames">${frames.map(src=>`<img src="${src}">`).join('')}</div></div>`;
  return `<!doctype html><html><head>${FONTS}<style>${css(themes.dark)}
  body{background:#0d0d0c}.wrap{width:1840px;padding:36px 40px 40px}
  h1{font-size:26px;font-weight:600;letter-spacing:-.01em;margin:0 0 4px;color:#f5f4ef}p{margin:0 0 24px;color:#a8a69e;font-size:16px}
  .arm{display:grid;grid-template-columns:150px 1fr;gap:20px;align-items:center;margin-top:16px}
  .tag{font-size:14px;font-weight:600;line-height:1.3}.tag.c{color:#bdbbb3}.tag.t{color:#7fb2f0}
  .frames{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}img{width:100%;display:block;border-radius:8px;border:1px solid #2a2a28}</style></head><body><div class="wrap">
  <h1>${esc(pair.title)}</h1><p>Same prompt and builder model. Hero after the entrance, then three points down the page, captured by the same recorder.</p>
  ${strip('Without the plugin',control,'c')}${strip('With premium-motion',treatment,'t')}</div></body></html>`;
}

// ---------- critic: annotated finish defects from one control site ----------
async function criticHtml(t,run) {
  const report=JSON.parse(await readFile(path.join(batch,'recordings',run,'report.json'),'utf8'));
  const craft=await dataUrl(path.join(batch,'recordings',run,'craft.png'));
  const items=report.findings.filter(finding=>['text-collision','copy-under-sticky','hollow-containers','dead-space','near-miss-alignment','edge-crowding','double-spaced-code','clipped-code','shrunken-text','orphan-headings','default-template'].includes(finding.id)).slice(0,6);
  return `<!doctype html><html><head>${FONTS}<style>${css(t)}
  .wrap{width:1200px;padding:40px 48px}h1{font-size:24px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}.sub{color:var(--ink2);margin:0 0 22px}
  .grid{display:grid;grid-template-columns:1.35fr 1fr;gap:26px;align-items:start}img{width:100%;border-radius:12px;border:1px solid var(--line);display:block}
  ul{list-style:none;margin:0;padding:0}li{padding:12px 0;border-top:1px solid var(--line)}li:first-child{border-top:0}
  .sev{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink3)}.t{font-weight:600;margin:2px 0}.e{color:var(--ink2);font-size:13px}</style></head><body><div class="wrap">
  <h1>What the critic caught on a site built without the plugin</h1><p class="sub">Measured in the real frames and outlined on crops (red: the element, orange: the empty band). The same check runs on every site.</p>
  <div class="grid"><img src="${craft}"><ul>${items.map(finding=>`<li><div class="sev">${esc(finding.severity)} · ${esc(finding.id)}</div><div class="t">${esc(finding.title)}</div><div class="e">${esc(finding.evidence.slice(0,170))}${finding.evidence.length>170?'…':''}</div></li>`).join('')}</ul></div></div></body></html>`;
}

// ---------- banner: two real hero frames under the product promise ----------
async function bannerHtml(run) {
  const [control]=await framesFor(run.control),[treatment]=await framesFor(run.treatment);
  return `<!doctype html><html><head>${FONTS}<style>${css(themes.dark)}
  body{background:#0c0c0b}.wrap{width:1280px;height:560px;position:relative;overflow:hidden;padding:56px 60px;background:radial-gradient(900px 500px at 85% 20%,#1d2a3f 0,transparent 60%),#0c0c0b}
  .kicker{font:500 13px "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#7fb2f0;margin:0 0 22px}
  h1{font-size:64px;line-height:1.02;letter-spacing:-.035em;font-weight:600;color:#f5f4ef;margin:0;max-width:560px}
  p{color:#b1afa7;font-size:19px;line-height:1.45;max-width:470px;margin:22px 0 0}
  .shots{position:absolute;right:-40px;top:70px;width:690px;height:470px}
  figure{position:absolute;margin:0;width:560px;border-radius:12px;overflow:hidden;box-shadow:0 30px 60px -20px rgb(0 0 0/.7);border:1px solid #2c2c2a}
  figure img{display:block;width:100%}figcaption{position:absolute;left:12px;top:12px;font:500 12px "JetBrains Mono",monospace;padding:6px 10px;border-radius:6px;background:rgb(12 12 11/.82);color:#d6d4cc}
  .a{top:0;left:0;opacity:.9}.b{top:150px;left:120px}.b figcaption{color:#9cc4f5}</style></head><body><div class="wrap">
  <div class="kicker">Motion Debugger</div><h1>Pages your agent has actually looked at.</h1>
  <p>A design skill that steers coding agents away from the default AI template, and a real-browser critic that shows them what is broken, unfinished or generic before you do.</p>
  <div class="shots"><figure class="a"><img src="${control}"><figcaption>without the plugin</figcaption></figure><figure class="b"><img src="${treatment}"><figcaption>with premium-motion</figcaption></figure></div></div></body></html>`;
}

try{
  await mkdir(out,{recursive:true});
  if(want('results'))for(const [name,t] of Object.entries(themes))await render(resultsHtml(t),path.join(out,`results-${name}.png`),{width:1200,height:100});
  const seed=Number(option('seed','1'));
  if(want('compare'))for(const pair of pairs.pairs)if(existsSync(path.join(batch,'recordings',`${pair.id}-control-${seed}`)))await render(await compareHtml(pair,seed),path.join(root,'demos',pair.id,'compare.jpg'),{width:1840,height:100,type:'jpeg',scale:1});
  const criticRun=option('critic');
  if(want('critic')&&criticRun)for(const [name,t] of Object.entries(themes))await render(await criticHtml(t,criticRun),path.join(out,`critic-${name}.png`),{width:1200,height:100});
  const bannerPair=option('banner');
  if(want('banner')&&bannerPair)await render(await bannerHtml({control:`${bannerPair}-control-${seed}`,treatment:`${bannerPair}-treatment-${seed}`}),path.join(out,'banner.png'),{width:1280,height:560});
}finally{await browser.close()}
