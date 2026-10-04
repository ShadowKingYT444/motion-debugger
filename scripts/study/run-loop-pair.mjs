// Actual native Codex sessions, equal wall budgets and untouched frozen endpoints.
import {mkdtemp,mkdir,readFile,writeFile,cp,symlink,access} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {snapshotSource,sha256} from './source-snapshot.mjs';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
if(args.includes('--help')){console.log('node scripts/study/run-loop-pair.mjs --package /absolute/motion.tgz [--budget-seconds 1800] [--prepare-only]\nResume prepared inputs with --run /absolute/trial-directory. Requires configured Codex CLI; no model override or global settings changes.');process.exit(0);}
for(let i=0;i<args.length;i++){if(['--package','--budget-seconds','--run'].includes(args[i]))i++;else if(args[i]!=='--prepare-only')throw Error('Unknown argument: '+args[i]);}
const budget=Number(option('--budget-seconds')??1800);if(!Number.isInteger(budget)||budget<60||budget>3600)throw Error('Budget must be60–3600seconds');
const study=path.join(root,'studies/loop-studio');
const run=(command,values,cwd)=>execFileSync(command,values,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:'1'},timeout:240000});
const settings=JSON.parse(run('python3',['-c',"import os,json,tomllib;from pathlib import Path;p=Path(os.environ.get('CODEX_HOME',str(Path.home()/'.codex')))/'config.toml';d=tomllib.loads(p.read_text()) if p.exists() else {};profile=d.get('profile');s={**d,**d.get('profiles',{}).get(profile,{})};print(json.dumps({'model':s.get('model'),'reasoningEffort':s.get('model_reasoning_effort'),'profile':profile,'globalMcpServers':list(d.get('mcp_servers',{}))}))"],root));
if(settings.globalMcpServers.some(name=>/motion/i.test(name)))throw Error('Matched baseline requires no global Motion MCP server');
const cliVersion=run('codex',['--version'],root).trim();
let directory,protocol;
if(option('--run')){
 directory=path.resolve(option('--run'));protocol=JSON.parse(await readFile(path.join(directory,'PROTOCOL.json'),'utf8'));
 if(protocol.status!=='prepared')throw Error('Only an unstarted prepared trial may run');
 if(JSON.stringify(protocol.configuredSettings)!==JSON.stringify(settings)||protocol.cliVersion!==cliVersion)throw Error('Native agent settings changed after preparation');
 for(const arm of Object.values(protocol.arms))if((await snapshotSource(arm.workspace)).digest!==arm.initialInputDigest)throw Error('Prepared application inputs changed');
}else{
 const tarball=option('--package');if(!tarball||!path.isAbsolute(tarball))throw Error('Provide an absolute already-built tarball');
 try{await access(path.join(study,'source'));throw Error('A frozen LOOP pair already exists; preserve it before creating another study');}catch(error){if(error.code!=='ENOENT')throw error;}
 const id=new Date().toISOString().replace(/[:.]/g,'-');directory=path.join(root,'artifacts/loop-studio/trials',id);await mkdir(directory,{recursive:true});
 const workspace=await mkdtemp(path.join(os.tmpdir(),'motion-loop-paired-'));
 const tooling=path.join(directory,'tooling');await mkdir(tooling);await cp(tarball,path.join(tooling,'motion-debugger.tgz'));
 await writeFile(path.join(tooling,'package.json'),JSON.stringify({name:'loop-motion-tooling',private:true,type:'module'}));
 await writeFile(path.join(directory,'TOOLING-INSTALL.log'),run('npm',['install','--omit=dev','--ignore-scripts','--no-audit','--no-fund','./motion-debugger.tgz'],tooling));
 const binary=path.join(tooling,'node_modules/motion-debugger/build/cli/index.js');
 const dependencies={name:'loop-studio',version:'1.0.0',private:true,type:'module',scripts:{start:'node server.mjs'},dependencies:{three:'0.186.1',playwright:'1.63.0'}};
 await writeFile(path.join(workspace,'package.json'),JSON.stringify(dependencies,null,2));
 await writeFile(path.join(directory,'DEPENDENCIES-INSTALL.log'),run('npm',['install','--ignore-scripts','--no-audit','--no-fund'],workspace));
 const commonInstructions=`# Shared study environment\n\nBuild the requested product directly in this fresh project. Work in this session; ephemeral host subagent setup is unavailable. Do not read another candidate workspace or modify global settings.\n\nVanilla HTML/CSS/JS with local Three0.186.1 and Playwright1.63.0 are provided. Use local assets/vendor/three.module.js in browser imports; dependencies in the parent node_modules support your normal tests. Use process.env.LOOP_PREVIEW_PORT for your local server port. Serve static source without a bundler so the exact delivered files can be opened. Keep authored input/asset files in this project; put test media and reports in evidence/.\n\nBrowser tests may use process.env.CHROMIUM_PATH for the installed Chrome executable. Use ordinary native pointer/keyboard input; do not force controls or substitute runtime source. View actual saved images through an image-viewing tool; a screenshot file path alone is not visual review. Keep browser contexts disposable and pages credential-free. Read process.env.LOOP_DEADLINE_UNIX_MS for your absolute wall deadline. Use elapsed time for your deadline, reserve final six minutes for verification, and finish with runnable source and a candid execution record.\n`;
 protocol={schemaVersion:1,status:'prepared',directory,workspace,budgetSeconds:budget,cliVersion,configuredSettings:settings,modelOverride:null,modelIdentityLimit:'Configured settings and native execution logs, not provider-wire identity',pluginTarballSha256:sha256(await readFile(tarball)),sharedDependencyLockSha256:sha256(await readFile(path.join(workspace,'package-lock.json'))),permissions:'Equal full local sandbox for authorized credential-free builds/tests; no global setting changed',audit:'Assisted MCP messages pass transparently through audited native CLI server. Source snapshots before/after each call expose changes; audit I/O overhead counts inside the same budget.',arms:{}};
 for(const name of ['ordinary','motion']){
  const app=path.join(workspace,name),logs=path.join(directory,name);await mkdir(app);await mkdir(logs);
  await writeFile(path.join(app,'package.json'),JSON.stringify(dependencies,null,2));await cp(path.join(workspace,'package-lock.json'),path.join(app,'package-lock.json'));
  await symlink('../node_modules',path.join(app,'node_modules'),'dir');
  await cp(path.join(study,'BRIEF.md'),path.join(app,'BRIEF.md'));await cp(path.join(study,'REFERENCES.md'),path.join(app,'REFERENCES.md'));await writeFile(path.join(app,'AGENTS.md'),commonInstructions);
  await mkdir(path.join(app,'assets/vendor'),{recursive:true});for(const file of ['three.module.js','three.core.js'])await cp(path.join(workspace,'node_modules/three/build',file),path.join(app,'assets/vendor',file));await cp(path.join(workspace,'node_modules/three/LICENSE'),path.join(app,'assets/vendor/THREE-LICENSE.txt'));
  run('git',['init','-q'],app);
  const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const prompt=(name==='motion'?'$motion\n\n':'')+await readFile(path.join(study,'BRIEF.md'),'utf8');await writeFile(path.join(logs,'PROMPT.txt'),prompt);
  if(name==='motion'){
   const setup=[binary,'init','--client','codex','--local','--skills','--project',app];const plan=JSON.parse(run(process.execPath,setup,app));await writeFile(path.join(logs,'SETUP-PLAN.json'),JSON.stringify(plan,null,2));run(process.execPath,[...setup,'--apply','--confirm',plan.confirmationToken],app);
   await cp(path.join(app,'.codex/config.toml'),path.join(logs,'INSTALLED-CONFIG.toml'));
   const auditArgs=[path.join(root,'scripts/study/audit-mcp.mjs'),binary,app,path.join(logs,'mcp-audit')];
   await writeFile(path.join(app,'.codex/config.toml'),`[mcp_servers.motion-debugger]\ncommand = ${JSON.stringify(process.execPath)}\nargs = ${JSON.stringify(auditArgs)}\n[mcp_servers.motion-debugger.env]\nMOTION_ARTIFACT_DIR = ${JSON.stringify(path.join(logs,'captures'))}\nMOTION_ALLOWED_ORIGINS = ${JSON.stringify('http://127.0.0.1:'+port)}\nMOTION_SOURCE_ROOTS = ${JSON.stringify(app)}\nCHROMIUM_PATH = ${JSON.stringify(process.env.CHROMIUM_PATH??'/usr/bin/google-chrome')}\n`);
   await cp(path.join(app,'.codex/config.toml'),path.join(logs,'AUDITED-CONFIG.toml'));
  }
  protocol.arms[name]={workspace:app,logs,port,promptSha256:sha256(Buffer.from(prompt)),commonInstructionsSha256:sha256(Buffer.from(commonInstructions)),initialInputDigest:(await snapshotSource(app)).digest,status:'prepared'};
 }
 if(protocol.arms.ordinary.initialInputDigest!==protocol.arms.motion.initialInputDigest)throw Error('Common initial application inputs differ');
 await writeFile(path.join(directory,'PROTOCOL.json'),JSON.stringify(protocol,null,2)+'\n');
 console.log(JSON.stringify({prepared:directory,workspace,pluginTarballSha256:protocol.pluginTarballSha256}));
 if(args.includes('--prepare-only'))process.exit(0);
}
// Execute a frozen transport, not a mutable working-tree wrapper.
const runnerSource=path.join(directory,'runner-source');await mkdir(runnerSource,{recursive:true});
protocol.runnerSource={};
for(const file of ['run-loop-pair.mjs','audit-mcp.mjs','source-snapshot.mjs']){
 const bytes=await readFile(path.join(root,'scripts/study',file));await writeFile(path.join(runnerSource,file),bytes);
 protocol.runnerSource[file]={sha256:sha256(bytes),bytes:bytes.length};
}
const treatmentConfig=path.join(protocol.arms.motion.workspace,'.codex/config.toml');
const originalConfig=await readFile(treatmentConfig,'utf8');
const frozenConfig=originalConfig.replace(JSON.stringify(path.join(root,'scripts/study/audit-mcp.mjs')),JSON.stringify(path.join(runnerSource,'audit-mcp.mjs')));
if(frozenConfig===originalConfig)throw Error('Prepared treatment transport was not the expected owned wrapper');
await writeFile(treatmentConfig,frozenConfig);await writeFile(path.join(protocol.arms.motion.logs,'EXECUTED-CONFIG.toml'),frozenConfig);
protocol.executedTreatmentConfigSha256=sha256(Buffer.from(frozenConfig));
protocol.status='running';protocol.startedAt=new Date().toISOString();
let saving=Promise.resolve();
const save=()=>{const text=JSON.stringify(protocol,null,2)+'\n';saving=saving.then(async()=>{await writeFile(path.join(directory,'PROTOCOL.json'),text);await writeFile(path.join(study,'PROTOCOL.json'),text);});return saving;};
await save();
const jobs=Object.entries(protocol.arms).map(async([name,state])=>{
 const command=['exec','--json','--ephemeral','--sandbox','danger-full-access','--skip-git-repo-check','-C',state.workspace,'-o',path.join(state.logs,'FINAL.txt'),'-'];
 state.startedAt=new Date().toISOString();state.startedUnixMs=Date.now();state.deadlineUnixMs=state.startedUnixMs+protocol.budgetSeconds*1000;state.command=['codex',...command];state.status='running';
 const child=spawn('codex',command,{cwd:state.workspace,detached:true,env:{...process.env,LOOP_PREVIEW_PORT:String(state.port),LOOP_STARTED_UNIX_MS:String(state.startedUnixMs),LOOP_DEADLINE_UNIX_MS:String(state.deadlineUnixMs),CHROMIUM_PATH:process.env.CHROMIUM_PATH??'/usr/bin/google-chrome'},stdio:['pipe','pipe','pipe']});state.pid=child.pid;
 const {createWriteStream}=await import('node:fs');const events=createWriteStream(path.join(state.logs,'AGENT.jsonl')),stderr=createWriteStream(path.join(state.logs,'STDERR.log'));child.stdout.pipe(events);child.stderr.pipe(stderr);
 child.stdin.end(await readFile(path.join(state.logs,'PROMPT.txt'),'utf8'));let timedOut=false,kill;
 const timer=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGTERM');}catch{}kill=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},10000);},protocol.budgetSeconds*1000);
 console.log(JSON.stringify({arm:name,pid:state.pid,startedAt:state.startedAt,deadline:new Date(state.deadlineUnixMs).toISOString()}));
 const exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});clearTimeout(timer);clearTimeout(kill);
 await Promise.all([new Promise(resolve=>events.end(resolve)),new Promise(resolve=>stderr.end(resolve))]);
 state.finishedAt=new Date().toISOString();state.finishedUnixMs=Date.now();state.elapsedMs=state.finishedUnixMs-state.startedUnixMs;state.exit=exit;state.status=timedOut?'time-limited':exit.code===0?'completed':'failed';
 const destination=path.join(study,'source',name);await mkdir(destination,{recursive:true});const manifest=await snapshotSource(state.workspace,destination);
 state.applicationInputDigest=manifest.digest;state.sourceManifestSha256=sha256(await readFile(path.join(destination,'SOURCE-HASHES.json')));state.afterDeadlineSourceFiles=Object.entries(manifest.observedFiles).filter(([,item])=>item.mtimeMs>state.deadlineUnixMs).map(([file])=>file);state.rawEventsSha256=sha256(await readFile(path.join(state.logs,'AGENT.jsonl')));
 await writeFile(path.join(state.logs,'FROZEN-OBSERVATION.json'),JSON.stringify(manifest,null,2));await save();console.log(JSON.stringify({arm:name,status:state.status,elapsedMs:state.elapsedMs,sourceManifestSha256:state.sourceManifestSha256,afterDeadlineSourceFiles:state.afterDeadlineSourceFiles}));
});
await Promise.all(jobs);protocol.status='frozen-awaiting-independent-review';protocol.finishedAt=new Date().toISOString();await save();
console.log(JSON.stringify({status:protocol.status,protocol:path.join(study,'PROTOCOL.json'),directory}));
