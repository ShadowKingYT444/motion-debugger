import type {MotionCapture,MotionEvent} from './types';

export type CaptureBehaviorStatus='passed'|'failed'|'unverified';
export type CaptureEvidenceStatus='valid'|'incomplete'|'insufficient';
export interface FailureMoment {id:string;kind:'delivery'|'actor'|'target';timeMs:number;summary:string}

const failed=(status:unknown,passed:unknown)=>status==='failed'||passed===false&&status!=='inconclusive';

/** One interpretation of capture health and product behavior for every public surface. */
export function assessCapture(report:MotionCapture) {
  const targetFailures=report.assertions.filter(assertion=>failed(assertion.status,assertion.passed));
  const targetUnverified=report.assertions.some(assertion=>assertion.status==='inconclusive');
  const actorFailures=report.actorAnalysis?.actors.flatMap(actor=>actor.assertions.filter(assertion=>assertion.status==='failed'))??[];
  const actorUnverified=Boolean(report.recipe.actors?.length)&&report.actorAnalysis?.status!=='passed'&&report.actorAnalysis?.status!=='failed';
  const expectedActors=report.recipe.actors??[],results=report.actorAnalysis?.actors??[];
  const actorCoverageInvalid=expectedActors.some(expected=>{const matches=results.filter(result=>result.actorId===expected.id);return matches.length!==1||matches[0].kind!==expected.kind||matches[0].evidence!=='browser-geometry'||!matches[0].coverage.sufficient;})||results.some(result=>!expectedActors.some(expected=>expected.id===result.actorId&&expected.kind===result.kind));
  const behavior:CaptureBehaviorStatus=report.delivery?.status==='failed'||targetFailures.length>0||actorFailures.length>0||report.actorAnalysis?.status==='failed'
    ?'failed'
    :report.delivery?.status==='passed'&&!targetUnverified&&!actorUnverified&&report.assertions.every(assertion=>assertion.passed)
      ?'passed':'unverified';
  const evidence:CaptureEvidenceStatus=report.status==='incomplete'?'incomplete':!report.metrics?.sufficientEvidence||actorCoverageInvalid?'insufficient':'valid';
  return {
    behavior,evidence,
    passed:behavior==='passed'&&evidence==='valid',
    delivery:report.delivery?.status??'unverified',
    temporal:targetFailures.length?'failed':targetUnverified||!report.metrics?.sufficientEvidence?'unverified':'passed',
    actors:report.actorAnalysis?.status??(report.recipe.actors?.length?'unverified':'not-requested'),
    reasons:[...(report.status==='incomplete'?[`Capture incomplete${report.failure?.message?`: ${report.failure.message}`:''}`]:[]),...(!report.metrics?.sufficientEvidence?['Target trajectory evidence is insufficient']:[]),...(actorCoverageInvalid?['Actor evidence is missing, sparse, mismatched, extra, or not independent browser geometry']:[])],
  };
}

function eventTime(report:MotionCapture,eventIds:string[]):number|undefined {
  return report.events.find((event:MotionEvent)=>eventIds.includes(event.id)&&Number.isFinite(event.t))?.t;
}

/** Distinct observed product-failure windows. Infrastructure timeouts are deliberately excluded. */
export function captureFailureMoments(report:MotionCapture):FailureMoment[] {
  const moments:FailureMoment[]=[];
  for(const failure of report.delivery?.forbiddenVisible??[])if(Number.isFinite(failure.observedAtMs))moments.push({id:`forbidden-visible:${failure.selector}`,kind:'delivery',timeMs:failure.observedAtMs,summary:`Forbidden selector ${failure.selector} was visible`});
  for(const [actorIndex,actor] of (report.actorAnalysis?.actors??[]).entries())for(const [findingIndex,finding] of actor.findings.entries()){
    const time=finding.sampleTimes.find(Number.isFinite)??eventTime(report,finding.eventIds);
    if(time!==undefined)moments.push({id:`actor:${actor.actorId}:${finding.type}:${actorIndex}:${findingIndex}`,kind:'actor',timeMs:time,summary:finding.summary});
  }
  for(const [index,finding] of (report.findings??[]).entries()){
    const time=finding.sampleTimes.find(Number.isFinite)??eventTime(report,finding.eventIds);
    if(time!==undefined)moments.push({id:`target:${finding.type}:${index}`,kind:'target',timeMs:time,summary:finding.summary});
  }
  return moments.sort((a,b)=>a.timeMs-b.timeMs||a.id.localeCompare(b.id));
}

/** Stable, specific signatures let probes retain a real defect through later capture failure. */
export function productFailureSignature(report:MotionCapture):string[] {
  const signatures:string[]=[];
  for(const item of report.delivery?.forbiddenVisible??[])signatures.push(`forbidden-visible:${item.selector}`);
  if(report.status!=='incomplete'&&report.delivery?.status==='failed'){
    for(const item of report.delivery.required.filter(item=>!item.passed))signatures.push(`outcome:${item.id}`);
    if(!report.delivery.forbiddenVisible.length&&!report.delivery.required.some(item=>!item.passed)&&report.delivery.errors?.some(error=>!/timeout|did not complete/i.test(error)))signatures.push('functional-delivery');
  }
  for(const assertion of report.assertions)if(assertion.status==='failed'||!assertion.passed&&assertion.status!=='inconclusive'&&report.metrics.sufficientEvidence)signatures.push(assertion.id);
  for(const actor of report.actorAnalysis?.actors??[])for(const assertion of actor.assertions)if(assertion.status==='failed')signatures.push(assertion.id);
  return [...new Set(signatures)].sort();
}
