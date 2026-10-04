/** Native observation fixture for the post-PR #10 audit, not a motion demo.
 * Run: CHROMIUM_PATH=/path/to/chromium node --import tsx \
 *   tests/diagnostics/post-pr10.native.mjs --out artifacts/new-native-audit
 * The independent rAF collector records real geometry and unforced clicks.
 * It calls the shipped pure analysis/review functions. It does NOT exercise
 * capture(), the shipped browser probe, MCP, video decoding, or display FPS.
 * Output is observational: completing this script is not a correctness pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {analyzeActors} from '../../packages/core/actor-analysis.ts';
import {reviewSummary} from '../../packages/core/review.ts';
const driverVersion=createRequire(import.meta.url)('playwright/package.json').version;
const {values}=parseArgs({options:{out:{type:'string'}}});
const output=path.resolve(values.out??`artifacts/post-pr10-native-${Date.now()}`);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.mkdirSync(output); // Refuse to overwrite any earlier evidence directory.
const pose = x => ({position:{x,y:20,space:'screen',unit:'css-px'}});
function plan({maxResponseMs=80,maxSettlingMs=500}={}) {
  return {schemaVersion:1,id:'audit-move',clock:'browser-monotonic-ms',
    actors:[{id:'part',binding:{kind:'dom',selector:'#part'},sources:[{file:'motion.js',line:1}],protectedAttributes:['geometry']}],
    beats:[{id:'move-part',actorIds:['part'],trigger:'Click #move-part',purpose:'Move the selected part to its destination',from:pose(0),to:pose(100),after:[],overlapMs:0,durationMs:300}],
    inputPolicy:{mode:'retarget',winner:'latest-input',carry:'position-and-velocity'},
    acceptance:{usefulCompletion:'Selected part remains at its destination',forbiddenVisible:['#error'],reducedMotion:'meaningful-final-pose',actors:[{actorId:'part',destination:pose(100),positionToleranceCssPx:1,orientationToleranceRad:.02,maxStepAt60HzPx:50,maxResponseMs,maxSettlingMs,requiredTravelCssPx:90,continuity:'position',identityRequired:true}]},
    edits:{permittedFiles:['motion.js'],protectedFiles:['design.css'],parameters:['pose-path']}};
}
function recipe({durationMs=1200,settleMs=100}={}) {
  return {url:'http://127.0.0.1:4400/',selector:'#stage',actions:[{action:'click',selector:'#move-part'}],durationMs,viewport:{width:800,height:600},
    actors:[{id:'part',kind:'dom',selector:'#part',acceptance:{continuity:'position',inputPolicy:'retarget',maxStepAt60HzPx:50,maxReplacements:0,destination:{x:100,y:20,tolerancePx:1,deadlineMs:1100,settleMs},minTravelPx:90}}],
    contract:{outcomes:{required:[{id:'done',selector:'#done',visible:true}],forbiddenVisible:['#error']}}};
}

const core={analyzeActors,reviewSummary};
const fixtures={plan,recipe};
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const results={schemaVersion:1,auditCommit:'fde065cdea0aecb4631e9106b48e0b53e327a8df',browser:browser.version(),driver:driverVersion,
    scope:'Native Chromium DOM geometry and unforced click observations, passed to hash-verified shipped analysis/review functions. An independent fixture collector is used, NOT the shipped capture/probe/MCP transport. No video or display-performance claim.',runs:[]};
  try{
    for(const scenario of ['unrelated-input','leaves-destination']){
      const context=await browser.newContext({viewport:{width:800,height:600},reducedMotion:'no-preference'});
      try{
        const page=await context.newPage();
        await page.setContent(`<!doctype html><meta charset="utf-8"><title>Motion audit native fixture</title><style>body{margin:0}#stage{position:relative;width:800px;height:200px}#part{position:absolute;left:0;top:20px;width:30px;height:30px;background:#c50}button{margin:10px}</style><div id="stage"><div id="part"></div></div><button id="unrelated">Unrelated action</button><button id="move-part">Move selected part</button><div id="done" hidden>Done</div><div id="error" hidden></div>`);
        await page.evaluate(({scenario})=>{
          const part=document.querySelector('#part');window.audit={events:[],samples:[],scenario};
          const data=window.audit;let start,frame,active=false;
          document.addEventListener('click',e=>{if(active)data.events.push({id:`event-${data.events.length+1}`,t:performance.now()-start,type:'click',label:e.target.id,origin:'browser-observed',detail:{trusted:e.isTrusted,selector:'#'+e.target.id}});},true);
          document.querySelector('#move-part').addEventListener('click',()=>{
            const animation=part.animate([{transform:'translateX(0px)'},{transform:'translateX(100px)'}],{duration:300,fill:'forwards',easing:'linear'});
            animation.finished.then(()=>{
              document.querySelector('#done').hidden=false;
              if(scenario==='leaves-destination')setTimeout(()=>part.animate([{transform:'translateX(100px)'},{transform:'translateX(300px)'}],{duration:250,fill:'forwards',easing:'linear'}),180);
            });
          });
          function sample(t){if(!active)return;const r=part.getBoundingClientRect();data.samples.push({actorId:'part',kind:'dom',origin:'browser-observed',t:t-start,observedAtMs:performance.now()-start,nodeId:'fixture-stable-part',visible:!!r.width,screen:{x:r.x,y:r.y,width:r.width,height:r.height},transform:null});frame=requestAnimationFrame(sample);}
          data.start=()=>{start=performance.now();active=true;frame=requestAnimationFrame(sample);};
          data.stop=()=>{active=false;cancelAnimationFrame(frame);return {events:data.events,samples:data.samples,durationMs:performance.now()-start,done:!document.querySelector('#done').hidden,finalX:part.getBoundingClientRect().x};};
          data.start();
        },{scenario});
        await page.waitForTimeout(120);
        if(scenario==='unrelated-input'){await page.locator('#unrelated').click();await page.waitForTimeout(420);}
        await page.locator('#move-part').click();
        await page.waitForTimeout(1100);
        const data=await page.evaluate(()=>window.audit.stop());
        const recipe=fixtures.recipe({durationMs:Math.floor(data.durationMs),settleMs:scenario==='settling-dwell'?300:100});
        recipe.actors[0].acceptance.destination.deadlineMs=Math.floor(data.durationMs)-10;
        const actorAnalysis=core.analyzeActors(data.samples,data.events,recipe);
        const actualInput=data.events.find(e=>e.detail.selector==='#move-part');
        const before=data.samples.filter(s=>s.observedAtMs<=actualInput.t).at(-1);
        const changed=data.samples.find(s=>s.observedAtMs>actualInput.t&&Math.abs(s.screen.x-before.screen.x)>.5);
        const observedResponseMs=changed?changed.observedAtMs-actualInput.t:null;
        const report={id:'native-fixture',recipe,events:data.events,actorSamples:data.samples,actorAnalysis,metrics:{sufficientEvidence:actorAnalysis.actors[0].coverage.sufficient},assertions:[],findings:[],delivery:{status:data.done?'passed':'unverified'},artifacts:{video:''},environment:{browser:browser.version(),viewport:{width:800,height:600}},limitations:['Independent native fixture collector; not full capture/MCP execution.']};
        const summary=core.reviewSummary(report,fixtures.plan({maxSettlingMs:scenario==='settling-dwell'?450:800}));
        results.runs.push({scenario,observed:data,actorAnalysis,review:summary.transitions[0],independentChecks:{correctTriggerId:actualInput.id,inputToObservedGeometryChangeMs:observedResponseMs,destinationDistanceAtEnd:Math.abs(data.finalX-100),stableDwellMs:recipe.actors[0].acceptance.destination.settleMs}});
      }finally{await context.close();}
    }
  }finally{await browser.close();fs.writeFileSync(path.join(output,'native-observations.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});}
  console.log(JSON.stringify({browser:results.browser,driver:results.driver,runs:results.runs.map(r=>({scenario:r.scenario,coverage:r.actorAnalysis.actors[0].coverage.sufficient,correctResponseMs:r.independentChecks.inputToObservedGeometryChangeMs,reportedResponseMs:r.review.measurements.inputToObservedGeometryChangeMs,reportedResponseStatus:r.review.measurements.responseStatus,arrivalAtMs:r.actorAnalysis.actors[0].metrics.arrivalAtMs,reportedSettlingMs:r.review.measurements.settlingMs,reportedSettlingStatus:r.review.measurements.settlingStatus,finalX:r.observed.finalX,arrivalAssertion:r.actorAnalysis.actors[0].assertions.find(a=>a.id.endsWith(':arrival'))?.status}))},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
