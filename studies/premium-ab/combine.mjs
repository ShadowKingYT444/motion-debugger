#!/usr/bin/env node
// Combine summarized A/B batches into pair-level statistics.
//   node studies/premium-ab/combine.mjs <batch results.json>... > combined.json
// Unit of analysis: a (task, seed) pair of one control site and one treatment site. Each pair was
// judged twice with A/B swapped; per pair we average the two judgments so position bias cancels.
// Significance: exact two-sided sign-flip permutation test over pairs (2^n enumerations), which
// assumes nothing about the score distribution. Judgments within a pair are not independent and
// are never counted as separate samples.
import {readFile} from 'node:fs/promises';

const files=process.argv.slice(2);if(!files.length)throw new Error('Pass one or more results.json files');
const dims=['visual_design','motion_quality','interaction_polish','mobile_robustness','overall_premium'];
const pairs=new Map();
for(const [batch,file] of files.entries())for(const row of JSON.parse(await readFile(file,'utf8')).rows){
  const id=`${row.task}-${row.seed}`;const pair=pairs.get(id)??{id,task:row.task,seed:row.seed,batch:batch+1,judgments:[]};
  pair.judgments.push({winner:row.winner,confidence:row.confidence,diff:Object.fromEntries(dims.map(dim=>[dim,row.scores.treatment[dim]-row.scores.control[dim]]))});
  pairs.set(id,pair);
}
const list=[...pairs.values()].map(pair=>({...pair,
  preference:pair.judgments.reduce((sum,judgment)=>sum+(judgment.winner==='treatment'?1:judgment.winner==='control'?-1:0),0)/pair.judgments.length,
  diff:Object.fromEntries(dims.map(dim=>[dim,pair.judgments.reduce((sum,judgment)=>sum+judgment.diff[dim],0)/pair.judgments.length]))}));

function signFlip(values) {
  const n=values.length,observed=values.reduce((a,b)=>a+b,0);let extreme=0;
  for(let mask=0;mask<1<<n;mask++){let total=0;for(let i=0;i<n;i++)total+=mask&(1<<i)?-values[i]:values[i];if(Math.abs(total)>=Math.abs(observed)-1e-9)extreme++}
  return extreme/(1<<n);
}
const mean=(values)=>values.reduce((a,b)=>a+b,0)/values.length;
const round=(value,digits=3)=>Number(value.toFixed(digits));
const judgments=list.flatMap(pair=>pair.judgments);
const out={
  pairs:list.length,judgments:judgments.length,
  judgmentWins:{treatment:judgments.filter(j=>j.winner==='treatment').length,control:judgments.filter(j=>j.winner==='control').length,tie:judgments.filter(j=>j.winner==='tie').length},
  pairOutcomes:{treatment:list.filter(p=>p.preference>0).length,control:list.filter(p=>p.preference<0).length,even:list.filter(p=>p.preference===0).length},
  preference:{meanPerPair:round(mean(list.map(p=>p.preference))),pTwoSided:round(signFlip(list.map(p=>p.preference)),4)},
  dimensions:Object.fromEntries(dims.map(dim=>{const values=list.map(p=>p.diff[dim]);return [dim,{meanTreatmentMinusControl:round(mean(values),2),pairsFavoringTreatment:values.filter(v=>v>0).length,pairsFavoringControl:values.filter(v=>v<0).length,pTwoSided:round(signFlip(values),4)}]})),
  byTask:Object.fromEntries([...new Set(list.map(p=>p.task))].map(task=>{const subset=list.filter(p=>p.task===task);return [task,{pairs:subset.length,meanPreference:round(mean(subset.map(p=>p.preference)),2),meanOverallDiff:round(mean(subset.map(p=>p.diff.overall_premium)),2)}]})),
  byBatch:Object.fromEntries([...new Set(list.map(p=>p.batch))].map(batch=>{const subset=list.filter(p=>p.batch===batch);return [`batch${batch}`,{pairs:subset.length,meanPreference:round(mean(subset.map(p=>p.preference)),2),meanOverallDiff:round(mean(subset.map(p=>p.diff.overall_premium)),2)}]})),
  pairDetail:list.map(p=>({id:p.id,batch:p.batch,preference:p.preference,overallDiff:p.diff.overall_premium,motionDiff:p.diff.motion_quality,winners:p.judgments.map(j=>j.winner)}))
};
console.log(JSON.stringify(out,null,2));
