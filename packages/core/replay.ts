import {z} from 'zod';
import {capture,CaptureFailureError} from './capture';
import {RecipeSchema,validateRecipe} from './safety';
import type {CaptureRecipe,CoreOptions,MotionCapture} from './types';

export const ProbeSchema=z.object({recipe:RecipeSchema,beforeActionIndex:z.number().int().min(0).max(15),offsetsMs:z.array(z.number().int().min(0).max(2000)).min(1).max(5),maxTotalCaptureMs:z.number().int().min(500).max(60000).default(24000),minimize:z.boolean().default(false)}).strict();
export type ProbeRequest=Omit<z.input<typeof ProbeSchema>,'recipe'> & {recipe:CaptureRecipe};
export function interruptionRecipes(input:ProbeRequest,options:CoreOptions):CaptureRecipe[] {
  const request=ProbeSchema.parse(input),recipe=validateRecipe(request.recipe,options);
  if(request.beforeActionIndex>=recipe.actions.length)throw new Error('Interruption index must identify an existing action');
  if(new Set(request.offsetsMs).size!==request.offsetsMs.length)throw new Error('Interruption offsets must be unique');
  const total=(recipe.durationMs??2400)*request.offsetsMs.length;
  if(total>request.maxTotalCaptureMs)throw new Error('Interruption grid exceeds total native capture budget');
  return request.offsetsMs.map(ms=>validateRecipe({...recipe,actions:[...recipe.actions.slice(0,request.beforeActionIndex),{action:'wait',ms},...recipe.actions.slice(request.beforeActionIndex)]},options));
}
export function probeClassification(report:MotionCapture):'failed'|'passed'|'unverified'|'infrastructure-failure' {
  if(report.status==='incomplete')return 'infrastructure-failure';
  if(report.delivery?.status==='failed'||report.assertions.some(assertion=>assertion.status==='failed')||report.actorAnalysis?.status==='failed')return 'failed';
  if(!report.metrics.sufficientEvidence)return 'infrastructure-failure';
  if(report.assertions.some(assertion=>!assertion.passed&&assertion.status!=='inconclusive'))return 'failed';
  return report.delivery?.status==='passed'&&(!report.recipe.actors?.length||report.actorAnalysis?.status==='passed')?'passed':'unverified';
}
export function probeFailureSignature(report:MotionCapture):string[] {
  return [...(report.delivery?.status==='failed'?['functional-delivery']:[]),...report.assertions.filter(assertion=>assertion.status==='failed'||!assertion.passed&&assertion.status!=='inconclusive'&&report.metrics.sufficientEvidence).map(assertion=>assertion.id),...report.actorAnalysis?.actors.flatMap(actor=>actor.assertions.filter(assertion=>assertion.status==='failed').map(assertion=>assertion.id))??[]].sort();
}
/** Fresh contexts restore the URL's initial state; every attempt remains recorded. No monotonic offset assumption. */
export async function motionProbe(input:ProbeRequest,options:CoreOptions) {
  const request=ProbeSchema.parse(input),recipes=interruptionRecipes(input,options),started=performance.now();
  const attempts:Array<{offsetMs:number;captureId:string;status:ReturnType<typeof probeClassification>;recipe:CaptureRecipe;failureSignature:string[];failure?:MotionCapture['failure']}> = [];
  let used=0;
  const run=async(recipe:CaptureRecipe)=>{if(options.signal?.aborted)throw new Error('Interruption probes canceled');used+=recipe.durationMs??2400;try{return await capture(recipe,options)}catch(error){if(error instanceof CaptureFailureError)return error.evidence;throw error;}};
  for(const [index,recipe] of recipes.entries()){
    const report=await run(recipe);attempts.push({offsetMs:request.offsetsMs[index],captureId:report.id,status:probeClassification(report),recipe,failureSignature:probeFailureSignature(report),failure:report.failure});
  }
  let minimized:typeof attempts[number]|undefined;
  const failed=attempts.find(attempt=>attempt.status==='failed');
  // Greedy deletion is a reproducible local minimum, not a claim of global minimization.
  // Keep setup action and final outcome wait. Preserve contracts and starting URL.
  if(request.minimize&&failed){
    let current:typeof attempts[number]=failed;
    const required=new Set([failed.recipe.actions[0],failed.recipe.actions[request.beforeActionIndex+1]]);
    minimized=current;
    for(let index=1;index<current.recipe.actions.length-1;index++){
      if(used+(current.recipe.durationMs??2400)>request.maxTotalCaptureMs)break;
      if(required.has(current.recipe.actions[index]))continue;
      const candidate:CaptureRecipe={...current.recipe,actions:current.recipe.actions.filter((_action,i)=>i!==index)};
      const report=await run(candidate),attempt:typeof attempts[number]={offsetMs:failed.offsetMs,captureId:report.id,status:probeClassification(report),recipe:candidate,failureSignature:probeFailureSignature(report),failure:report.failure};
      attempts.push(attempt);if(attempt.status==='failed'&&JSON.stringify(attempt.failureSignature)===JSON.stringify(failed.failureSignature)){current=attempt;minimized=attempt;index=0;}
    }
  }
  return {schemaVersion:'motion-probe-1',mode:'native-replay',startingState:'Fresh credential-free browser context navigated to the same URL for every attempt; no inherited profile/storage',attempts,...(minimized?{minimized}:{}),cost:{wallMs:Math.round(performance.now()-started),declaredNativeCaptureMs:used},limitations:['Grid offsets are requested waits. Use each report browser-observed input times for actual timing.','No monotonic assumption or silent infrastructure retries. Failure minimization is bounded greedy deletion, not a global proof.','Repeated stochastic failures need separate repetitions; one failed attempt is not a probability estimate.']};
}
