// Real-browser regression for the code agents copy from the premium-motion skill:
// references/motion-stack.md (GSAP + ScrollTrigger + SplitText + Lenis) and the shader in commands/imagery.md.
// The code is extracted from the Markdown itself, so the documented snippet is the tested snippet.
// GSAP and Lenis are served from pinned devDependencies instead of the CDN so the test runs offline.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {chromiumOptions} from '../server/browser.ts';

const root=path.resolve(import.meta.dirname,'..');
const skill=path.join(root,'plugin/motion-debugger/skills/premium-motion');
const stackDoc=await readFile(path.join(skill,'references/motion-stack.md'),'utf8');
const imageryDoc=await readFile(path.join(skill,'commands/imagery.md'),'utf8');
const block=(doc,heading,lang)=>{const start=doc.indexOf(heading);assert.ok(start>=0,`missing section ${heading}`);const match=doc.slice(start).match(new RegExp('```'+lang+'\\n([\\s\\S]*?)```'));assert.ok(match,`missing ${lang} block after ${heading}`);return match[1]};

const load=block(stackDoc,'## Load','html');
const head=load.match(/<head>([\s\S]*?)<\/head>/)[1];
const external=[...head.matchAll(/(?:href|src)="(https:[^"]+)"/g)].map(match=>match[1]);
const motionJs=block(stackDoc,'## motion.js','js');
const shader=block(imageryDoc,'## A fullscreen shader','html');
const local={'gsap.min.js':'node_modules/gsap/dist/gsap.min.js','ScrollTrigger.min.js':'node_modules/gsap/dist/ScrollTrigger.min.js','SplitText.min.js':'node_modules/gsap/dist/SplitText.min.js','lenis.min.js':'node_modules/lenis/dist/lenis.min.js','lenis.css':'node_modules/lenis/dist/lenis.css'};
const cdn=url=>{const name=Object.keys(local).find(file=>url.endsWith('/'+file));assert.ok(name,`no local copy for ${url}`);return `/vendor/${name}`};
assert.ok(external.length>=4&&head.includes('src="motion.js"'),'the Load block loads the libraries and motion.js in the head');

const page=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${head.replace(/(href|src)="(https:[^"]+)"/g,(_,attr,url)=>`${attr}="${cdn(url)}"`).replace('src="motion.js"','src="/motion.js"')}
<style>:root{--ground:#f4f1ea;--ink:#16130f}body{margin:0;background:var(--ground);color:var(--ink);font:18px/1.5 sans-serif}
section{min-height:100vh;padding:80px 40px;box-sizing:border-box}.vis{height:300px;background:#a55;overflow:hidden}.vis .inner{height:100%;background:#335}
.track-wrap{padding:0}.track{display:flex;gap:24px;width:max-content;padding:80px 40px}.track>div{width:600px;height:400px;background:#ccc}
.field{width:100%;height:300px;display:block}</style></head><body>
<section data-motion="hero"><h1>A headline set from a fact, long enough to wrap onto two lines</h1><p data-hero-rest>Supporting copy.</p><a data-hero-rest data-magnetic href="#x">Primary action</a><div class="vis" data-hero-visual><div class="inner"></div></div></section>
<section data-ground="#16130f" data-ink="#f4f1ea"><h2 data-motion="heading">A section heading that reveals by line</h2><div class="vis" data-motion="image"><div class="inner"></div></div><p><span data-motion="count">38.5 ms</span> and <span data-motion="count">$12,400</span></p></section>
<section data-scene><div data-stage><div data-scene-part>Part A</div><div data-scene-part>Part B</div><p data-scene-step style="opacity:0">Step one</p><p data-scene-step style="opacity:0">Step two</p></div></section>
<section class="track-wrap"><div data-stage><div class="track" data-track><div></div><div></div><div></div><div></div></div></div></section>
<section data-ground="#f4f1ea" data-ink="#16130f"><ul data-motion="stagger"><li>One</li><li>Two</li><li>Three</li></ul><p data-motion="fade">A paragraph.</p>${shader}</section>
</body></html>`;

const server=createServer(async(request,response)=>{
  const url=new URL(request.url,'http://x').pathname;
  if(url==='/'){response.writeHead(200,{'content-type':'text/html'}).end(page);return}
  if(url==='/favicon.ico'){response.writeHead(204).end();return}
  if(url==='/motion.js'){response.writeHead(200,{'content-type':'text/javascript'}).end(motionJs);return}
  const name=url.startsWith('/vendor/')&&url.slice(8);
  if(name&&local[name]){response.writeHead(200,{'content-type':name.endsWith('.css')?'text/css':'text/javascript'}).end(await readFile(path.join(root,local[name])));return}
  response.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;

// Record shader compile and link results inside the page.
// Layout shift is summed exactly as the critic sums it (critique-probe.ts), so a pass here means no layout-shift finding.
const shaderProbe=()=>{window.__gl=[];window.__cls=0;try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__cls+=entry.value}).observe({type:'layout-shift',buffered:true})}catch{};for(const proto of [WebGLRenderingContext.prototype]){const compile=proto.compileShader,link=proto.linkProgram;
  proto.compileShader=function(s){compile.call(this,s);if(!this.getShaderParameter(s,this.COMPILE_STATUS))window.__gl.push('compile: '+this.getShaderInfoLog(s))};
  proto.linkProgram=function(p){link.call(this,p);if(!this.getProgramParameter(p,this.LINK_STATUS))window.__gl.push('link: '+this.getProgramInfoLog(p));window.__glLinked=true}}};

const hiddenMotion=()=>[...document.querySelectorAll('[data-motion], [data-motion="stagger"] > *')].filter(el=>{const s=getComputedStyle(el);return s.visibility==='hidden'||parseFloat(s.opacity)<0.99}).map(el=>el.tagName+'['+(el.dataset.motion||'child')+']');

const browser=await chromium.launch(chromiumOptions());
const results={};
try{
  for(const [name,options] of Object.entries({desktop:{viewport:{width:1440,height:900}},reduced:{viewport:{width:1440,height:900},reducedMotion:'reduce'},phone:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}})){
    const context=await browser.newContext(options);
    await context.addInitScript(shaderProbe);
    const tab=await context.newPage();
    const errors=[];tab.on('pageerror',error=>errors.push(error.message));tab.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
    await tab.goto(origin,{waitUntil:'load'});
    await tab.waitForTimeout(1800);
    const heroLines=await tab.evaluate(()=>document.querySelectorAll('[data-motion="hero"] h1 [aria-hidden] , [data-motion="hero"] h1 div').length);
    const heroVisible=await tab.evaluate(()=>getComputedStyle(document.querySelector('[data-motion="hero"]')).visibility);
    // Scroll through the page in real wheel steps so every trigger fires, then return to the top.
    const height=await tab.evaluate(()=>document.documentElement.scrollHeight);
    for(let y=0;y<height+2000;y+=400){await tab.mouse.wheel(0,400);await tab.waitForTimeout(60)}
    await tab.waitForTimeout(2200);
    const hidden=await tab.evaluate(hiddenMotion);
    const count=await tab.evaluate(()=>[...document.querySelectorAll('[data-motion="count"]')].map(el=>el.textContent).join(' | '));
    const pins=await tab.evaluate(()=>document.querySelectorAll('.pin-spacer').length);
    const gl=await tab.evaluate(()=>({errors:window.__gl,linked:!!window.__glLinked}));
    const scroll=await tab.evaluate(()=>{const track=document.querySelector('[data-track]'),stage=track.parentElement;return{sceneHeight:document.querySelector('[data-scene]').offsetHeight,sticky:getComputedStyle(stage).position,partMoved:getComputedStyle(document.querySelector('[data-scene-part]')).transform!=='none',trackX:Math.round(new DOMMatrix(getComputedStyle(track).transform).m41),distance:track.scrollWidth-stage.clientWidth,swipe:getComputedStyle(stage).overflowX}});
    const cls=await tab.evaluate(()=>Math.round(window.__cls*1000)/1000);
    results[name]={errors,heroLines,heroVisible,hidden,count,pins,cls,scroll,gl};
    await context.close();
  }
}finally{await browser.close();server.close()}

console.log(JSON.stringify(results,null,1));
for(const [name,result] of Object.entries(results)){
  assert.deepEqual(result.errors,[],`${name}: no page or console errors`);
  assert.deepEqual(result.hidden,[],`${name}: every data-motion element ends visible`);
  assert.equal(result.count,'38.5 ms | $12,400',`${name}: counters end on the exact text written in the HTML`);
  assert.equal(result.heroVisible,'visible',`${name}: the hero is shown`);
  assert.deepEqual(result.gl.errors,[],`${name}: the documented shader compiles and links`);
  assert.ok(result.gl.linked,`${name}: the documented shader program was linked`);
  assert.equal(result.pins,0,`${name}: no JS pins (scenes use sticky stages)`);
  assert.ok(result.cls<=0.1,`${name}: layout shift ${result.cls} stays within the critic's 0.1 limit`);
}
assert.ok(results.desktop.heroLines>=2,'desktop: the hero headline is split into masked lines');
const d=results.desktop.scroll;
assert.equal(d.sticky,'sticky','desktop: scene and track stages stick');
assert.ok(d.sceneHeight>=2*900,'desktop: the scene section is tall enough to scrub');
assert.ok(d.partMoved,'desktop: the scene timeline scrubbed its parts');
assert.ok(d.distance>0&&Math.abs(d.trackX+d.distance)<=2,`desktop: the track slid its full length (${d.trackX} of -${d.distance})`);
for(const name of ['reduced','phone']){const r=results[name].scroll;assert.equal(r.trackX,0,`${name}: the track is not scrubbed`);assert.equal(r.swipe,'auto',`${name}: the track is a native swipe row`);assert.ok(!r.partMoved,`${name}: the scene is not scrubbed`)}
console.log('motion stack: documented GSAP/Lenis code and shader verified at desktop, reduced motion and phone, with no layout shift');
