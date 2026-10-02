import type { Assertion, CaptureMetrics, CaptureReport, Diagnosis, EvidenceEdge, FrameSample, SourceRef, TraceEvent } from '../src/types';

export function validGeometry(s:FrameSample):boolean {
  return s.nodeId !== null && [s.t,s.x,s.y,s.width,s.height,s.opacity,s.translateX].every(v=>v !== null && Number.isFinite(v));
}
export function validTrajectory(capture:CaptureReport):boolean {
  const valid=capture.samples.filter(validGeometry);
  return valid.length>=50 && valid[0].t<100 && valid.at(-1)!.t>=2100 && valid[0].opacity!<0.2 && valid.at(-1)!.opacity!>=0.999 && Math.abs(valid.at(-1)!.translateX!)<0.5;
}

export function computeMetrics(events:TraceEvent[], samples:FrameSample[]):CaptureMetrics {
  const present = samples.filter(validGeometry);
  let maxBackwardJumpPx=0,maxOpacityDrop=0;
  for(let i=1;i<present.length;i++) {
    maxBackwardJumpPx=Math.max(maxBackwardJumpPx,present[i-1].x!-present[i].x!);
    maxOpacityDrop=Math.max(maxOpacityDrop,present[i-1].opacity!-present[i].opacity!);
  }
  const finalX=present.at(-1)?.x;
  const settled = present.find(s=>s.opacity!>=0.999 && finalX !== undefined && finalX !== null && Math.abs(s.x!-finalX)<0.5);
  return {
    mounts:events.filter(e=>e.type==='react-mount').length,
    replacements:Math.max(0,events.filter(e=>e.type==='dom-add').length-1),
    animationStarts:events.filter(e=>e.type==='animation-start').length,
    cancellationsWhileActive:events.filter(e=>e.type==='animation-cancel' && e.detail.active===true).length,
    maxBackwardJumpPx:Number(maxBackwardJumpPx.toFixed(2)),maxOpacityDrop:Number(maxOpacityDrop.toFixed(4)),
    settledAtMs:settled?.t ?? null,sampleCount:samples.length
  };
}

export function diagnose(baseline:CaptureReport, fixed:CaptureReport, sources:SourceRef[]):Diagnosis {
  const events=baseline.events;
  const cancel=events.find(e=>e.type==='animation-cancel' && e.detail.active===true);
  const removal=events.find(e=>e.type==='dom-remove' && e.nodeId===cancel?.nodeId);
  const addition=events.find(e=>e.type==='dom-add' && e.nodeId!==cancel?.nodeId && e.detail.cardId===removal?.detail.cardId && e.t>= (cancel?.t ?? Infinity)-2);
  const restart=events.find(e=>e.type==='animation-start' && e.nodeId===addition?.nodeId);
  const update=events.find(e=>e.type==='state-update');
  const response=events.find(e=>e.type==='request-resolve');
  const unmount=events.find(e=>e.type==='react-unmount' && e.nodeId===cancel?.nodeId);
  const captureChecks=(capture:CaptureReport)=>['api','console','dom-state','samples'].every(suffix=>capture.assertions.some(a=>a.id===`${capture.mode}-${suffix}` && a.passed));
  const captureVerified=captureChecks(baseline) && captureChecks(fixed) && baseline.assertions.every(a=>a.passed) && fixed.assertions.every(a=>a.passed) && validTrajectory(baseline) && validTrajectory(fixed);
  const verified=!!(captureVerified && cancel && removal && addition && restart && update && response && baseline.metrics.maxBackwardJumpPx>10 && baseline.metrics.maxOpacityDrop>0.05 && fixed.metrics.mounts===1 && fixed.metrics.animationStarts===1 && fixed.metrics.cancellationsWhileActive===0 && fixed.metrics.replacements===0 && fixed.metrics.maxBackwardJumpPx<2 && compareAssertions(baseline,fixed).every(a=>a.passed));
  const edges:EvidenceEdge[]=[];
  const edge=(from:TraceEvent|undefined,to:TraceEvent|undefined,relation:string,confidence:EvidenceEdge['confidence'])=>{if(from&&to)edges.push({from:from.id,to:to.id,relation,confidence})};
  edge(response,update,'Response is explicitly marked as the revision update','annotated');
  edge(update,unmount,'Fixture revision is used as React identity','fixture-mapped');
  edge(unmount,cancel,'Unmount cleanup calls animation.cancel()','fixture-mapped');
  edge(cancel,removal,'Canceled animation belongs to removed node','observed');
  edge(removal,addition,'Same logical card receives a different DOM identity','observed');
  edge(addition,restart,'Replacement node starts another entrance','observed');
  return {
    title:verified?'Async revision resets component identity':'Evidence did not establish the fixture failure chain',
    summary:verified?'The response updates revision while the entrance is active. Because the baseline uses revision as its React key, the same logical card is unmounted and replaced. Cleanup cancels the active animation; the replacement restarts from the entrance origin. The stable card.id key keeps the node and active animation across the same response.':'Inspect raw events and trajectories. The complete replacement/cancel/restart/jump rule was not satisfied.',
    rule:'Active cancellation + same-card DOM replacement + new-node animation restart + sampled backward geometry/opacity jump; fixed run preserves identity and continuity',
    confidence:verified?'verified-fixture':'inconclusive',
    evidenceEventIds:[response,update,unmount,cancel,removal,addition,restart].filter((e):e is TraceEvent=>!!e).map(e=>e.id),edges,sources,
    limitations:[
      'Deterministic diagnosis for this explicitly instrumented fixture; no LLM inference or automatic analysis of arbitrary apps.',
      'State and React lifecycle marks are application annotations. DOM identity, Web Animations calls and rAF geometry are browser observations.',
      'The source link from revision update to React remount is an explicit fixture mapping, not a source map inferred from video.',
      'Frame sampling can miss sub-frame glitches. Recordings and timings may differ slightly across machines.',
      'Runs use no-preference motion and a production-equivalent effect lifecycle without React StrictMode double invocation.'
    ]
  };
}

export function compareAssertions(baseline:CaptureReport,fixed:CaptureReport):Assertion[] {
  const b=baseline.metrics,f=fixed.metrics;
  const baselineLast=baseline.samples.filter(s=>s.x!==null).at(-1);
  const fixedLast=fixed.samples.filter(s=>s.x!==null).at(-1);
  return [
    {id:'baseline-chain',label:'Baseline reproduces cancel / replace / restart',passed:b.cancellationsWhileActive===1 && b.replacements===1 && b.animationStarts===2,detail:`${b.cancellationsWhileActive} active cancellation, ${b.replacements} replacement, ${b.animationStarts} animation starts`},
    {id:'baseline-discontinuity',label:'Baseline has an observed backward jump',passed:validTrajectory(baseline) && b.maxBackwardJumpPx>10 && b.maxOpacityDrop>0.05,detail:`${b.maxBackwardJumpPx}px backward jump; opacity drops ${b.maxOpacityDrop.toFixed(3)}`},
    {id:'fixed-identity',label:'Stable key preserves DOM and animation identity',passed:f.mounts===1 && f.replacements===0 && f.cancellationsWhileActive===0 && f.animationStarts===1,detail:`${f.mounts} mount, ${f.replacements} replacements, ${f.cancellationsWhileActive} active cancellations, ${f.animationStarts} animation start`},
    {id:'fixed-continuity',label:'Patched trajectory stays continuous',passed:validTrajectory(fixed) && f.maxBackwardJumpPx<2 && f.maxOpacityDrop<0.02,detail:`${f.maxBackwardJumpPx}px max backward step; opacity drop ${f.maxOpacityDrop.toFixed(3)} (2px / 0.02 tolerances)`},
    {id:'final-state',label:'Final API-driven state is unchanged',passed:JSON.stringify(baseline.finalState)===JSON.stringify(fixed.finalState) && fixed.finalState.revision===1 && fixed.finalState.status==='ready',detail:`Both runs end on ${fixed.finalState.cardId}, revision ${fixed.finalState.revision}, status ${fixed.finalState.status}`},
    {id:'final-geometry',label:'Final geometry and opacity match',passed:validTrajectory(baseline) && validTrajectory(fixed) && !!baselineLast && !!fixedLast && Math.abs(baselineLast.x!-fixedLast.x!)<1 && Math.abs(baselineLast.opacity!-fixedLast.opacity!)<0.001,detail:`Final x ${baselineLast?.x?.toFixed(2)} / ${fixedLast?.x?.toFixed(2)}px; opacity ${baselineLast?.opacity} / ${fixedLast?.opacity}`}
  ];
}
