#!/usr/bin/env node
// Premium-motion A/B runner. Creates an isolated workspace per (task, arm, seed) and runs a coding
// agent on the identical prompt. The treatment workspace receives exactly what an installation
// provides — the premium-motion skill folder, a one-paragraph agent-instructions pointer, and the
// `motion-debugger` CLI on PATH. The control workspace is empty. Agent hosts are templates, so the
// same study runs on Claude Code, Codex, OpenCode or Gemini CLI.
//
//   node studies/premium-ab/run.mjs --root <dir> --agent claude --model claude-sonnet-5-5 \
//     --tasks halo,ledgerline --arms control,treatment --seeds 1,2 --parallel 8 --cli <frozen cli.js>
import {spawn} from 'node:child_process';
import {cp,mkdir,readFile,writeFile,chmod,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,index,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[index+1]?.startsWith('--')||all[index+1]===undefined?'true':all[index+1]]]:pairs,[]));
const bank=JSON.parse(await readFile(path.join(here,'tasks.json'),'utf8'));
const root=path.resolve(args.root??'premium-ab-runs');
const agent=args.agent??'claude',model=args.model??'claude-sonnet-5-5';
const skillSource=path.resolve(args.skill??path.join(here,'../../plugin/motion-debugger/skills/premium-motion'));
const cli=args.cli?path.resolve(args.cli):undefined;
const timeoutMs=Number(args.timeoutMin??45)*60000,parallel=Number(args.parallel??4);
const list=(value,fallback)=>(value??fallback).split(',').map(item=>item.trim()).filter(Boolean);
const tasks=list(args.tasks,bank.tasks.map(task=>task.id).join(',')),arms=list(args.arms,'control,treatment'),seeds=list(args.seeds,'1');

// Where each host discovers project skills and standing instructions.
const hosts={
  claude:{skills:'.claude/skills',instructions:'CLAUDE.md',command:(prompt)=>['claude',['-p',prompt,'--model',model,'--setting-sources','project','--strict-mcp-config','--dangerously-skip-permissions','--output-format','stream-json','--verbose']]},
  codex:{skills:'.agents/skills',instructions:'AGENTS.md',command:(prompt)=>['codex',['exec','--skip-git-repo-check','--dangerously-bypass-approvals-and-sandbox','-m',model,'--json',prompt]]},
  opencode:{skills:'.opencode/skills',instructions:'AGENTS.md',command:(prompt)=>['opencode',['run','-m',model,'--format','json',prompt]]},
  gemini:{skills:'.gemini/skills',instructions:'GEMINI.md',command:(prompt)=>['gemini',['-p',prompt,'-m',model,'--yolo','--output-format','stream-json']]}
};
const host=hosts[agent];if(!host)throw new Error(`Unknown agent ${agent}; choose ${Object.keys(hosts).join(', ')}`);
export const pointer=(skillDir)=>`## Motion Debugger\n\nFor any web page, UI or animation work in this project, read and follow the premium-motion skill at \`${skillDir}/premium-motion/SKILL.md\` before writing code, and review the rendered result with \`motion-debugger critique <folder-or-local-url>\` (look at the contact-sheet images it writes) before you finish.\n`;

async function prepare(task,arm,seed) {
  const dir=path.join(root,task.id,`${arm}-${seed}`),site=path.join(dir,'site');
  await mkdir(site,{recursive:true});
  const env={...process.env};delete env.CLAUDECODE;delete env.CLAUDE_CODE_ENTRYPOINT;
  if(arm==='treatment'){
    await cp(skillSource,path.join(site,host.skills,'premium-motion'),{recursive:true});
    await writeFile(path.join(site,host.instructions),pointer(host.skills));
    if(!cli)throw new Error('--cli <path to built motion-debugger cli> is required for the treatment arm');
    const bin=path.join(dir,'bin');await mkdir(bin,{recursive:true});
    await writeFile(path.join(bin,'motion-debugger'),`#!/bin/sh\nexec node ${JSON.stringify(cli)} "$@"\n`);await chmod(path.join(bin,'motion-debugger'),0o755);
    env.PATH=`${bin}${path.delimiter}${env.PATH}`;
  }
  return {dir,site,env};
}

async function runOne(task,arm,seed) {
  const {dir,site,env}=await prepare(task,arm,seed);
  if(await stat(path.join(dir,'run.json')).catch(()=>null)){console.log(`skip ${task.id}/${arm}-${seed} (already ran)`);return}
  const prompt=bank.promptTemplate.replace('{brief}',task.brief);
  const [command,commandArgs]=host.command(prompt);
  const started=Date.now();console.log(`start ${task.id}/${arm}-${seed}`);
  const transcript=(await import('node:fs')).createWriteStream(path.join(dir,'transcript.jsonl'));
  const stderr=(await import('node:fs')).createWriteStream(path.join(dir,'stderr.log'));
  const code=await new Promise(resolve=>{
    const child=spawn(command,commandArgs,{cwd:site,env,stdio:['ignore','pipe','pipe']});
    child.stdout.pipe(transcript);child.stderr.pipe(stderr);
    const timer=setTimeout(()=>{child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),5000)},timeoutMs);
    child.on('close',(exit,signal)=>{clearTimeout(timer);resolve(exit??signal)});
  });
  const record={task:task.id,arm,seed,agent,model,prompt,exit:code,timedOut:Date.now()-started>=timeoutMs,durationSec:Math.round((Date.now()-started)/1000),startedAt:new Date(started).toISOString()};
  await writeFile(path.join(dir,'run.json'),JSON.stringify(record,null,2));
  console.log(`done ${task.id}/${arm}-${seed} exit=${code} ${record.durationSec}s`);
}

const jobs=[];for(const seed of seeds)for(const id of tasks)for(const arm of arms){const task=bank.tasks.find(item=>item.id===id);if(!task)throw new Error(`Unknown task ${id}`);jobs.push(()=>runOne(task,arm,seed))}
let next=0;await Promise.all(Array.from({length:Math.min(parallel,jobs.length)},async()=>{while(next<jobs.length)await jobs[next++]()}));
