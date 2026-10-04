import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Independent actual Chrome/WebGL check of the original scene factory defaults.
// This integration fixture does not establish flagship art direction or agent gains.
const root=path.resolve('artifacts/v2/colony'),runId=new Date().toISOString().replace(/[:.]/g,'-'),runRoot=path.join(root,runId);
await mkdir(runRoot,{recursive:true});
const candidates=[process.env.MOTION_THREE_DIR,path.resolve('studies/ants-launch/node_modules/three'),path.resolve('studies/ants-launch/shared/node_modules/three'),path.resolve('node_modules/three'),path.resolve(root,'dependencies/node_modules/three')].filter(Boolean);
let threeRoot;
for(const candidate of candidates){try{await access(path.join(candidate,'build/three.module.js'));threeRoot=candidate;break;}catch{}}
if(!threeRoot)throw new Error('An existing local Three.js installation is required; set MOTION_THREE_DIR to its package directory');
const version=JSON.parse(await readFile(path.join(threeRoot,'package.json'),'utf8')).version;
const recipeRoot=process.env.MOTION_COLONY_SOURCE_DIR?pathToFileURL(path.resolve(process.env.MOTION_COLONY_SOURCE_DIR)+path.sep):new URL('../../plugin/motion-debugger/skills/motion/recipes/',import.meta.url),modules=new Map();
for(const name of ['spring','colony-scene'])modules.set(`/recipes/${name}.mjs`,await readFile(new URL(`${name}.mjs`,recipeRoot),'utf8'));
for(const name of ['three.module.js','three.core.js'])modules.set(`/vendor/${name}`,await readFile(path.join(threeRoot,'build',name),'utf8'));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Actual colony WebGL verification</title>
<style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#f4eddf;color:#27241e;font:16px system-ui}main{max-width:1100px;margin:auto}h1{font-size:clamp(28px,4vw,46px);margin:8px 0}p{max-width:780px;line-height:1.5}canvas{display:block;width:100%;height:540px;background:#f4eddf;border:1px solid #c9c0ae;border-radius:16px}button{font:inherit;background:#fffaf0;color:inherit;border:1px solid #867b68;border-radius:8px;padding:12px 18px;cursor:pointer}button:focus-visible{outline:3px solid #1672d0;outline-offset:3px}nav{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}output{display:block;min-height:28px}@media(max-width:500px){body{padding:16px}canvas{height:380px}button{padding:10px 12px}}</style>
<main><h1>Colony scene: real WebGL check</h1><p>Original recipe defaults. These walkers, lights, materials and camera are rendered by Chrome through a local Three.js module.</p><canvas id="colony" aria-label="Articulated ant colony"></canvas><nav aria-label="Scene controls"><button id="assemble">Assemble queue</button><button id="replay">Replay orbit</button><button id="pause">Pause</button></nav><output id="status" aria-live="polite">Starting renderer</output></main>
<script type="module">
import * as THREE from '/vendor/three.module.js';import {createColonyScene} from '/recipes/colony-scene.mjs';
const canvas=document.querySelector('#colony'),status=document.querySelector('#status'),media=matchMedia('(prefers-reduced-motion: reduce)');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
const colony=createColonyScene({THREE,renderer,count:18,reducedMotion:media.matches});
let frame,last,disposed=false;window.events=[];window.frameTimes=[];
const resize=()=>{const {width,height}=canvas.getBoundingClientRect();if(width&&height)colony.resize(width,height,devicePixelRatio);};
const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
const preference=()=>colony.setReducedMotion(media.matches);media.addEventListener('change',preference);
function draw(time){if(disposed)return;const delta=last===undefined?0:(time-last)/1000;if(delta>0)window.frameTimes.push(delta*1000);last=time;colony.update(Math.min(.05,delta));status.textContent=colony.state.progress===1?'Queue assembled':colony.state.paused?'Paused':colony.state.reducedMotion?'Reduced motion: static orbit':'Orbit active';frame=requestAnimationFrame(draw);}
document.querySelector('#assemble').onclick=()=>{colony.setProgress(1);window.events.push({kind:'assemble',time:performance.now()});};
document.querySelector('#replay').onclick=()=>{colony.setProgress(0);window.events.push({kind:'replay',time:performance.now()});};
document.querySelector('#pause').onclick=event=>{colony.setPaused(!colony.state.paused);event.target.textContent=colony.state.paused?'Resume':'Pause';window.events.push({kind:'pause',time:performance.now(),paused:colony.state.paused});};
const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
window.snapshot=()=>({state:colony.state,geometries:renderer.info.memory.geometries,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,canvas:{width:canvas.width,height:canvas.height,css:canvas.getBoundingClientRect().toJSON()},context:{version:gl.getParameter(gl.VERSION),vendor:gl.getParameter(debug?debug.UNMASKED_VENDOR_WEBGL:gl.VENDOR),renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER)},events:window.events,frameTimes:window.frameTimes});
window.pixelCoverage=()=>{const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)opaque++;return opaque/(canvas.width*canvas.height);};
window.geometrySnapshot=()=>{const ants=colony.scene.children.filter(item=>item.isGroup&&(item.children.length===9||item.children.length===14)),ground=colony.scene.children.find(item=>item.isMesh&&item.position.y<0),points=ground.geometry.attributes.position;cameraUpdate();let clipX=0,clipY=0,minSpacing=Infinity;for(let i=0;i<points.count;i++){const point=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(ground.matrixWorld).project(colony.camera);clipX=Math.max(clipX,Math.abs(point.x));clipY=Math.max(clipY,Math.abs(point.y));}for(let i=0;i<ants.length;i++)for(let j=0;j<i;j++)minSpacing=Math.min(minSpacing,ants[i].position.distanceTo(ants[j].position));return {ants:ants.length,clipX,clipY,minSpacing,gaitStopped:ants.every(ant=>ant.children.filter(child=>child.isGroup&&child.position.y>.2&&child.position.y<.4).every(leg=>leg.rotation.y===0&&leg.rotation.z===0))};};
function cameraUpdate(){colony.camera.updateMatrixWorld(true);colony.scene.updateMatrixWorld(true);}
window.rotateScene=value=>{colony.scene.rotation.y=value;};
window.instanceProbe=()=>{cameraUpdate();const ant=colony.scene.children.find(item=>item.isGroup&&(item.children.length===9||item.children.length===14)),body=ant.children[0],batch=colony.scene.children.find(item=>item.isInstancedMesh&&item.material===body.material);if(!batch)return {instanced:false};const local=new THREE.Matrix4();batch.getMatrixAt(0,local);const world=new THREE.Matrix4().multiplyMatrices(batch.matrixWorld,local);return {instanced:true,maxWorldTransformError:Math.max(...world.elements.map((value,index)=>Math.abs(value-body.matrixWorld.elements[index])))};};
window.dispose=()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();media.removeEventListener('change',preference);colony.dispose();const memory={...renderer.info.memory};renderer.dispose();return memory;};
frame=requestAnimationFrame(draw);window.ready=true;
</script></html>`;
await writeFile(path.join(runRoot,'fixture.html'),html);
for(const [name,source] of modules){const file=path.join(runRoot,'source',name.slice(1));await mkdir(path.dirname(file),{recursive:true});await writeFile(file,source);}
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(modules.has(req.url)){res.setHeader('Content-Type','text/javascript');res.end(modules.get(req.url));}else{res.statusCode=404;res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,executablePath=process.env.MOTION_CHROME_PATH??'/usr/bin/google-chrome';
const launch={executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
const results=[],browser=await chromium.launch(launch);
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),chrome:browser.version(),launch,node:process.version,three:{version,root:threeRoot},fixtureSha256:createHash('sha256').update(html).digest('hex'),moduleSha256:Object.fromEntries([...modules].map(([name,source])=>[name,createHash('sha256').update(source).digest('hex')]))};
let failure;
try{
for(const scenario of [{name:'desktop',viewport:{width:1180,height:850},reducedMotion:'no-preference'},{name:'mobile',viewport:{width:390,height:844},reducedMotion:'no-preference'},{name:'reduced-motion',viewport:{width:1180,height:850},reducedMotion:'reduce'}]){
  const directory=path.join(runRoot,scenario.name);await mkdir(directory,{recursive:true});
  const context=await browser.newContext({viewport:scenario.viewport,deviceScaleFactor:1,reducedMotion:scenario.reducedMotion,recordVideo:{dir:directory,size:scenario.viewport}});
  const page=await context.newPage(),video=page.video(),errors=[],consoleErrors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});const checks=[],telemetry={};let scenarioFailure;
  try{
    await page.goto(origin);await page.waitForFunction(()=>window.ready&&window.snapshot().state.renderedFrames>2);
    const initial=await page.evaluate(()=>window.snapshot());assert.match(initial.context.version,/WebGL/);assert.ok(initial.drawCalls>0&&initial.triangles>0&&initial.geometries>0);const coverage=await page.evaluate(()=>window.pixelCoverage());assert.ok(coverage>.05,'Actual WebGL framebuffer contains rendered geometry');checks.push('actual WebGL draw calls, triangles and nonempty framebuffer');
    const quietStart=await page.evaluate(()=>window.frameTimes.length);await page.waitForTimeout(1500);const quietIntervals=await page.evaluate(start=>window.frameTimes.slice(start),quietStart);const sortedQuiet=quietIntervals.slice().sort((a,b)=>a-b);const quietCadence={durationMs:1500,samples:quietIntervals.length,p50Ms:sortedQuiet[Math.floor(sortedQuiet.length*.5)],p95Ms:sortedQuiet[Math.floor(sortedQuiet.length*.95)],maxMs:sortedQuiet.at(-1),intervalsMs:quietIntervals,scope:'Actual rAF cadence during an untouched recorded scene window; software renderer and browser/video overhead apply. Not a smoothness or physical GPU verdict.'};
    Object.assign(telemetry,{initial,coverage,quietCadence});
    // Export actual framebuffer pixels without screenshot clipping/viewport overrides:
    // those transient overrides can change screencast frame dimensions and letterbox video.
    const canvasImage=async name=>{const url=await page.locator('#colony').evaluate(canvas=>canvas.toDataURL('image/png'));const png=Buffer.from(url.split(',')[1],'base64');if(name)await writeFile(path.join(directory,name),png);return png;};
    await page.screenshot({path:path.join(directory,'initial-page.png')});const start=await canvasImage('orbit-start.png');await page.waitForTimeout(600);const later=await canvasImage('orbit-later.png');
    const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
    if(scenario.reducedMotion==='reduce'){assert.equal(sha(start),sha(later),'Reduced-motion scene pixels stay static');checks.push('reduced-motion orbit is pixel-static');}
    else{assert.notEqual(sha(start),sha(later),'Actual canvas pixels change during articulation and orbit');checks.push('real canvas pixels change over the running orbit');}
    await page.click('#pause');const pauseA=await canvasImage('paused.png');await page.waitForTimeout(250);const pauseB=await canvasImage();assert.equal(sha(pauseA),sha(pauseB),'Paused simulation has identical pixels');
    await page.evaluate(()=>window.rotateScene(.23));await page.waitForTimeout(150);const rotated=await canvasImage('rotated-paused.png');assert.notEqual(sha(pauseA),sha(rotated),'Scene rotation changes actual pixels');const instanceProbe=await page.evaluate(()=>window.instanceProbe());if(instanceProbe.instanced)assert.ok(instanceProbe.maxWorldTransformError<1e-5,'Instanced parts follow exactly one scene transform');await page.evaluate(()=>window.rotateScene(0));await page.waitForTimeout(150);
    await page.click('#pause');checks.push('pause freezes actual rendered pixels, scene rotation stays correct and resume is operable');
    await page.click('#assemble');await page.waitForFunction(()=>window.snapshot().state.progress===1);assert.equal(await page.locator('#status').textContent(),'Queue assembled');const assembled=await canvasImage('assembled.png');await page.screenshot({path:path.join(directory,'assembled-page.png')});await page.waitForTimeout(1000);assert.notEqual(sha(start),sha(assembled),'Meaningful assembly changes real scene pixels');checks.push('assembly reaches endpoint and changes the rendered scene');
    const geometry=await page.evaluate(()=>window.geometrySnapshot());telemetry.geometry=geometry;assert.equal(geometry.ants,18);assert.ok(geometry.minSpacing>.93,'Assembled ants occupy separated destinations');assert.equal(geometry.gaitStopped,true,'Actual stationary joint transforms stop striding');assert.ok(geometry.clipX<.93&&geometry.clipY<.93,JSON.stringify({message:'Actual projected stage vertices fit inside the viewport',geometry}));const settledA=await canvasImage('settled.png');await page.waitForTimeout(250);const settledB=await canvasImage();assert.equal(sha(settledA),sha(settledB),'Assembled scene pixels stop moving');assert.ok(initial.drawCalls<=20,JSON.stringify({message:'Instancing bounds actual scene draw calls',drawCalls:initial.drawCalls}));checks.push('spaced stationary queue, pixel-static arrival, fitted camera and bounded draw calls');
    await page.locator('#replay').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.snapshot().state.progress===0);checks.push('keyboard replay returns to orbit state');
    if(scenario.reducedMotion!=='reduce'){
      await page.click('#assemble');await page.waitForTimeout(90);await page.click('#replay');await page.waitForFunction(()=>window.snapshot().state.progress===0);checks.push('rapid assembly reversal reaches the original endpoint');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const final=await page.evaluate(()=>window.snapshot());await page.waitForTimeout(250);const memory=await page.evaluate(()=>window.dispose());assert.equal(memory.geometries,0,'Scene-owned WebGL geometry resources are disposed');assert.deepEqual(errors,[]);checks.push('scene geometry is disposed and no uncaught browser error');
    results.push({...scenario,status:'passed',checks,coverage,initial,final,geometry,instanceProbe,quietCadence,errors,consoleErrors,screenshotHashes:{start:sha(start),later:sha(later),assembled:sha(assembled)},screenshots:['initial-page.png','orbit-start.png','orbit-later.png','paused.png','assembled.png','assembled-page.png','settled.png','rotated-paused.png'].map(name=>path.join(directory,name))});
  }catch(error){scenarioFailure=error;results.push({...scenario,status:'failed',checks,...telemetry,errors,consoleErrors,error:error.stack});await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
  finally{await context.close();if(video){const recording=path.join(directory,'recording.webm');await video.saveAs(recording);results.at(-1).recording=recording;}}
  if(scenarioFailure)throw scenarioFailure;
}
}catch(error){failure=error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));const report=JSON.stringify({status:failure?'failed':'passed',runId,scope:'Real system Chrome WebGL using software ANGLE/SwiftShader. Original scene factory integration, not a flagship visual quality verdict, physical GPU benchmark or agent A/B.',origin,provenance,results,error:failure?.stack},null,2);await writeFile(path.join(runRoot,'browser-verification.json'),report);await writeFile(path.join(root,'browser-verification.json'),report);}
if(failure)throw failure;
console.log(JSON.stringify({status:'passed',report:path.join(root,'browser-verification.json'),threeVersion:version,scenarios:results.map(({name,checks,recording})=>({name,checks,recording}))},null,2));
