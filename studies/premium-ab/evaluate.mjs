#!/usr/bin/env node
// Evaluate a premium-motion A/B run tree (<root>/<task>/<arm>-<seed>/site).
//   node --import tsx studies/premium-ab/evaluate.mjs record   --root <runs> --out <eval>
//   node --import tsx studies/premium-ab/evaluate.mjs packets  --root <runs> --out <eval> [--seed 7]
//   node --import tsx studies/premium-ab/evaluate.mjs summarize --out <eval>
// record: re-renders every site with the same neutral recorder (both arms, same build) and keeps
//         objective metrics. Contact sheets are the judges' only view of each site.
// packets: blinded pairs per (task, seed); each pair appears twice with A/B swapped, under unrelated
//          ids, to measure and cancel position bias. The arm key is written outside the packets.
// summarize: joins judge verdicts (<eval>/judgments/<packet>.json) with the key and metrics.
import {cp,mkdir,readFile,readdir,writeFile,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {critique} from '../../packages/core/critique.ts';

const [mode,...rest]=process.argv.slice(2);
const args=Object.fromEntries(rest.reduce((pairs,value,index,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[index+1]]]:pairs,[]));
const out=path.resolve(args.out??'premium-ab-eval');
const exists=async(file)=>!!(await stat(file).catch(()=>null));

async function runs(root) {
  const list=[];
  for(const task of (await readdir(root)).sort())for(const run of (await readdir(path.join(root,task)).catch(()=>[])).sort()){
    const match=run.match(/^(control|treatment)-(\d+)$/);if(!match)continue;
    list.push({task,arm:match[1],seed:Number(match[2]),site:path.join(root,task,run,'site'),id:`${task}-${run}`});
  }
  return list;
}

async function sourceStats(site) {
  let bytes=0,files=0;const kinds={};
  async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const file=path.join(dir,entry.name);if(entry.isDirectory()){await walk(file);continue}const ext=path.extname(entry.name);if(!['.html','.css','.js','.mjs','.svg'].includes(ext))continue;const size=(await stat(file)).size;bytes+=size;files++;kinds[ext]=(kinds[ext]??0)+size}}
  await walk(site);return {bytes,files,kinds};
}

if(mode==='record'){
  const root=path.resolve(args.root);const metrics=[];
  for(const run of await runs(root)){
    const dest=path.join(out,'recordings',run.id);
    if(!await exists(path.join(run.site,'index.html'))){metrics.push({...run,missing:true});console.log(`missing ${run.id}`);continue}
    if(!await exists(path.join(dest,'report.json'))){
      await rm(dest,{recursive:true,force:true});
      try{await critique(run.site,{outDir:dest})}catch(error){metrics.push({...run,error:String(error).slice(0,300)});console.log(`error ${run.id}: ${error}`);continue}
    }
    const report=JSON.parse(await readFile(path.join(dest,'report.json'),'utf8'));
    const count=(severity)=>report.findings.filter(finding=>finding.severity===severity).length;
    const m=report.motion;
    metrics.push({...run,score:report.score,grade:report.grade,blockers:count('blocker'),majors:count('major'),minors:count('minor'),findings:report.findings.map(finding=>finding.id),
      animations:m.animations,entranceStartGroups:m.entranceStartGroups,sectionCoverage:m.sectionCoverage.sections?Number((m.sectionCoverage.withMotion/m.sectionCoverage.sections).toFixed(2)):null,
      hoverResponsive:m.hover.tested?Number((m.hover.responsive/m.hover.tested).toFixed(2)):null,focusVisible:m.focus.tested?Number((m.focus.visible/m.focus.tested).toFixed(2)):null,
      reducedMotionHandled:m.reducedMotion?.rule??null,customEasingShare:(()=>{const total=Object.values(m.easings).reduce((a,b)=>a+b,0);return total?Number((((m.easings['custom-curve']??0)+(m.easings['spring-or-steps']??0))/total).toFixed(2)):null})(),
      cls:m.layoutShift,source:await sourceStats(run.site)});
    console.log(`recorded ${run.id}: ${report.grade} ${report.score}`);
  }
  await mkdir(out,{recursive:true});await writeFile(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));
}

if(mode==='packets'){
  const root=path.resolve(args.root);const all=await runs(root);let seed=Number(args.seed??7);
  const random=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
  const pairs=[];
  for(const control of all.filter(run=>run.arm==='control')){const treatment=all.find(run=>run.arm==='treatment'&&run.task===control.task&&run.seed===control.seed);if(treatment)pairs.push({task:control.task,seed:control.seed,control,treatment})}
  const packets=[];for(const pair of pairs){const first=random()<.5;packets.push({...pair,a:first?'control':'treatment'},{...pair,a:first?'treatment':'control'})}
  // Shuffle so the swapped copy of a pair is not adjacent and ids carry no information.
  for(let i=packets.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[packets[i],packets[j]]=[packets[j],packets[i]]}
  const key=[];await rm(path.join(out,'packets'),{recursive:true,force:true});
  for(const [index,packet] of packets.entries()){
    const id=`p${String(index+1).padStart(2,'0')}`,dir=path.join(out,'packets',id);await mkdir(dir,{recursive:true});
    for(const [label,arm] of [['A',packet.a],['B',packet.a==='control'?'treatment':'control']]){
      const run=packet[arm];const source=path.join(out,'recordings',run.id);
      for(const image of ['desktop-entrance.png','desktop-scroll.png','hover.png','mobile.png'])if(await exists(path.join(source,image)))await cp(path.join(source,image),path.join(dir,`${label}-${image}`));
    }
    const brief=JSON.parse(await readFile(new URL('./tasks.json',import.meta.url),'utf8')).tasks.find(task=>task.id===packet.task).brief;
    await writeFile(path.join(dir,'BRIEF.txt'),brief+'\n');
    key.push({packet:id,task:packet.task,seed:packet.seed,A:packet.a,B:packet.a==='control'?'treatment':'control'});
  }
  await writeFile(path.join(out,'packet-key.json'),JSON.stringify(key,null,2));
  console.log(`${packets.length} packets in ${path.join(out,'packets')}`);
}

if(mode==='summarize'){
  const key=JSON.parse(await readFile(path.join(out,'packet-key.json'),'utf8'));
  const metrics=JSON.parse(await readFile(path.join(out,'metrics.json'),'utf8'));
  const dims=['visual_design','motion_quality','interaction_polish','mobile_robustness','overall_premium'];
  const rows=[];
  for(const entry of key){
    const file=path.join(out,'judgments',`${entry.packet}.json`);if(!await exists(file))continue;
    const verdict=JSON.parse(await readFile(file,'utf8'));
    const arm=(label)=>label==='A'?entry.A:label==='B'?entry.B:'tie';
    rows.push({...entry,winner:arm(verdict.winner),confidence:verdict.confidence,scores:{[entry.A]:verdict.scores.A,[entry.B]:verdict.scores.B},positionPicked:verdict.winner,rationale:verdict.rationale});
  }
  const wins={treatment:0,control:0,tie:0};for(const row of rows)wins[row.winner]++;
  const mean=(values)=>values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)):null;
  const dimension=Object.fromEntries(dims.map(dim=>[dim,{control:mean(rows.map(row=>row.scores.control?.[dim]).filter(Number.isFinite)),treatment:mean(rows.map(row=>row.scores.treatment?.[dim]).filter(Number.isFinite))}]));
  const position={A:rows.filter(row=>row.positionPicked==='A').length,B:rows.filter(row=>row.positionPicked==='B').length,tie:rows.filter(row=>row.positionPicked==='tie').length};
  // Pair-level result: both orderings must agree for a decisive pair win.
  const pairs={};for(const row of rows){const id=`${row.task}-${row.seed}`;(pairs[id]??=[]).push(row.winner)}
  const pairOutcomes=Object.fromEntries(Object.entries(pairs).map(([id,list])=>[id,list.every(winner=>winner===list[0])?list[0]:'split']));
  const byArm=(arm,field)=>mean(metrics.filter(item=>item.arm===arm&&Number.isFinite(item[field])).map(item=>item[field]));
  const objective=Object.fromEntries(['score','blockers','majors','animations','sectionCoverage','hoverResponsive','focusVisible','customEasingShare','cls'].map(field=>[field,{control:byArm('control',field),treatment:byArm('treatment',field)}]));
  objective.reducedMotionHandled={control:metrics.filter(item=>item.arm==='control'&&item.reducedMotionHandled).length+'/'+metrics.filter(item=>item.arm==='control').length,treatment:metrics.filter(item=>item.arm==='treatment'&&item.reducedMotionHandled).length+'/'+metrics.filter(item=>item.arm==='treatment').length};
  const summary={judgments:rows.length,wins,pairOutcomes,position,dimension,objective,rows};
  await writeFile(path.join(out,'results.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({judgments:rows.length,wins,pairOutcomes,position,dimension,objective},null,2));
}
