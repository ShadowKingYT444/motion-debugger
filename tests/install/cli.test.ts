import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,readdir,mkdir,symlink,lstat,realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {shouldUseInitWizard,prepareInitWizard} from '../../packages/cli/wizard';
import {configText} from '../../packages/cli/config';
import {prepareSkills,installSkills,assertSkillsCurrent,skillNames,skillDirectories} from '../../packages/cli/skills';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function run(args:string[],cwd=root){return spawnSync(process.execPath,[path.join(root,'build/cli/index.js'),...args],{cwd,encoding:'utf8'})}
test('all client configurations preserve unrelated servers and use a pinned runtime',()=>{
  for(const client of ['generic','claude-code','cursor','vscode'] as const){const key=client==='vscode'?'servers':'mcpServers';const output=JSON.parse(configText({client},JSON.stringify({theme:'dark',[key]:{existing:{command:'existing'}}})));assert.equal(output.theme,'dark');assert.equal(output[key].existing.command,'existing');assert.deepEqual(output[key]['motion-debugger'].args,['--yes','motion-debugger@0.5.0','mcp']);if(client==='vscode')assert.equal(output[key]['motion-debugger'].type,'stdio')}
});
test('Codex TOML is idempotent and does not replace unmanaged entries',()=>{
  const original='model = "test"\n\n[mcp_servers.other]\ncommand = "existing"\n';const output=configText({client:'codex',local:true},original);assert.ok(output.startsWith(original));assert.match(output,/\[mcp_servers.motion-debugger.env\]/);assert.equal(configText({client:'codex',local:true},output),output);assert.throws(()=>configText({client:'codex'},'[mcp_servers.motion-debugger]\ncommand="custom"\n'),/unmanaged/);assert.throws(()=>configText({client:'codex'},'# BEGIN motion-debugger (managed)\n'),/Malformed/)
});
test('init is read-only until exact diff confirmation, preserves content, backs up, and rejects stale tokens',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-config-test-')));
  try {
    const target=path.join(dir,'mcp.json'),original=JSON.stringify({mcpServers:{existing:{command:'keep'}}},null,2)+'\n';await writeFile(target,original);
    const args=['init','--client','cursor','--config',target,'--local'];
    const preview=run(args,dir);assert.equal(preview.status,0,preview.stderr);const planned=JSON.parse(preview.stdout);assert.equal(await readFile(target,'utf8'),original);
    const refused=run([...args,'--apply'],dir);assert.equal(refused.status,1);assert.equal(await readFile(target,'utf8'),original);
    const stale=run([...args,'--apply','--confirm','bad'],dir);assert.equal(stale.status,1);assert.equal(await readFile(target,'utf8'),original);
    const applied=run([...args,'--apply','--confirm',planned.confirmationToken],dir);assert.equal(applied.status,0,applied.stderr);assert.equal(JSON.parse(await readFile(target,'utf8')).mcpServers.existing.command,'keep');assert.ok((await readdir(dir)).some(name=>name.endsWith('.bak')));
    const repeat=run(args,dir);assert.equal(JSON.parse(repeat.stdout).changed,false);
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('CLI errors are diagnosable and help/version work without repo tools',()=>{
  assert.equal(run(['--version']).stdout.trim(),'0.5.0');assert.equal(run(['--help']).status,0);for(const args of [['typo'],['init','--client','invalid'],['demo','--port','bad'],['capture'],['config','--apply'],['doctor','--unrecognized'],['config','--origin','https://example.com']])assert.equal(run(args).status,1,JSON.stringify(args))
});

test('init --local enters the human wizard while scripted destinations and approvals opt out',()=>{
  for(const args of [[],['--local'],['--local','--origin','http://127.0.0.1:4173'],['--artifact-dir','./evidence']])assert.equal(shouldUseInitWizard(args,true),true);
  for(const args of [['--client','codex'],['--local','--client','cursor'],['--config','./mcp.json'],['--apply'],['--confirm','hash'],['--skills'],['--project','./project']])assert.equal(shouldUseInitWizard(args,true),false);
  assert.equal(shouldUseInitWizard(['--local'],false),false);
});
test('wizard requires explicit browser consent and keeps the selected local runtime/settings',async()=>{
  for(const consent of ['', 'n', 'no', 'y', 'YES']) {
    const questions:string[]=[],answers=['Codex',consent,'yes'];const plan=await prepareInitWizard({client:'generic',local:true,artifactDir:'./chosen-evidence'},async question=>{questions.push(question);return answers.shift()!});
    assert.equal(plan.options.client,'codex');assert.equal(plan.options.local,true);assert.equal(plan.options.artifactDir,'./chosen-evidence');assert.equal(plan.options.apply,true);assert.equal(plan.downloadBrowser,['y','YES'].includes(consent));assert.match(questions[1],/explicitly downloads a browser/);assert.equal(plan.options.skills,true);assert.equal(plan.options.project,process.cwd());
  }
  const generic=await prepareInitWizard({client:'generic',local:true},async()=> '');assert.equal(generic.options.client,'generic');assert.equal(generic.downloadBrowser,false);
  let prompts=0;await assert.rejects(prepareInitWizard({client:'generic'},async()=>{prompts++;return 'invalid-client'}),/Unsupported client/);assert.equal(prompts,1);
});

async function exists(file:string){try{await lstat(file);return true}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error}}
async function assertInstalled(directory:string) {
  for(const name of skillNames) {
    const source=path.join(root,'plugin/motion-debugger/skills',name),target=path.join(directory,name);
    const compare=async(from:string,to:string)=>{for(const item of await readdir(from,{withFileTypes:true})){if(item.isDirectory())await compare(path.join(from,item.name),path.join(to,item.name));else assert.deepEqual(await readFile(path.join(to,item.name)),await readFile(path.join(from,item.name)))}};
    await compare(source,target);
  }
}
test('skills install previews all five complete skills for every supported workspace client',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-skills-clients-')));
  try {
    for(const client of ['codex','claude-code','cursor','vscode'] as const) {
      const project=path.join(dir,client);await mkdir(project);const destination=path.join(project,skillDirectories[client]!);
      const args=['skills','install','--client',client,'--project',project];
      const preview=run(args,dir);assert.equal(preview.status,0,preview.stderr);const plan=JSON.parse(preview.stdout);
      assert.equal(plan.directory,destination);assert.equal(plan.skills.length,5);assert.equal(await exists(destination),false);
      assert.equal(run([...args,'--apply'],dir).status,1);assert.equal(run([...args,'--apply','--confirm','bad'],dir).status,1);assert.equal(await exists(destination),false);
      const applied=run([...args,'--apply','--confirm',plan.confirmationToken],dir);assert.equal(applied.status,0,applied.stderr);await assertInstalled(destination);
      assert.equal(JSON.parse(run(args,dir).stdout).changed,false);assert.equal(run([...args,'--apply'],dir).status,0);
    }
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('combined init approves skills and project MCP together, preserves unrelated files, and backs up existing config',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-complete-init-')));
  try {
    const target=path.join(dir,'.codex/config.toml'),skills=path.join(dir,'.agents/skills');await mkdir(path.dirname(target));
    const original='model = "keep"\n\n[mcp_servers.other]\ncommand = "keep"\n';await writeFile(target,original);
    await mkdir(path.join(skills,'other-skill'),{recursive:true});await writeFile(path.join(skills,'other-skill/SKILL.md'),'keep instructions');
    const args=['init','--client','codex','--local','--skills','--project',dir];const output=run(args,os.tmpdir());assert.equal(output.status,0,output.stderr);const plan=JSON.parse(output.stdout);
    assert.equal(plan.target,target);assert.equal(plan.skillsChanged,true);assert.equal(await readFile(target,'utf8'),original);
    assert.match(plan.after,new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    const result=run([...args,'--apply','--confirm',plan.confirmationToken],os.tmpdir());assert.equal(result.status,0,result.stderr);
    assert.ok((await readFile(target,'utf8')).startsWith(original));await assertInstalled(skills);assert.equal(await readFile(path.join(skills,'other-skill/SKILL.md'),'utf8'),'keep instructions');
    assert.ok((await readdir(path.dirname(target))).some(name=>name.endsWith('.bak')));
    assert.equal(JSON.parse(run(args,dir).stdout).skillsChanged,false);
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('colliding skill instructions or extra files abort the whole preview without MCP changes',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-skill-collision-')));
  try {
    const collision=path.join(dir,'.agents/skills/motion-design');await mkdir(collision,{recursive:true});await writeFile(path.join(collision,'SKILL.md'),'unrelated');
    const result=run(['init','--client','codex','--local','--skills','--project',dir],dir);assert.equal(result.status,1);assert.match(result.stderr,/Skill collision/);
    assert.equal(await exists(path.join(dir,'.codex/config.toml')),false);assert.equal(await readFile(path.join(collision,'SKILL.md'),'utf8'),'unrelated');assert.equal(await exists(path.join(dir,'.agents/skills/motion-evidence')),false);
    await rm(collision,{recursive:true});const args=['skills','install','--client','codex','--project',dir],plan=JSON.parse(run(args,dir).stdout);
    assert.equal(run([...args,'--apply','--confirm',plan.confirmationToken],dir).status,0);await writeFile(path.join(collision,'custom.txt'),'keep this');
    const refused=run(args,dir);assert.equal(refused.status,1);assert.match(refused.stderr,/Skill collision/);assert.equal(await readFile(path.join(collision,'custom.txt'),'utf8'),'keep this');
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('project, parent, folder and nested symlinks are refused without writing through them',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-skill-symlinks-')));
  try {
    const real=path.join(dir,'real'),linked=path.join(dir,'linked');await mkdir(real);await symlink(real,linked,'dir');
    assert.match(run(['skills','install','--client','codex','--project',linked],dir).stderr,/Symbolic-link/);
    await symlink(real,path.join(real,'.agents'),'dir');assert.match(run(['init','--client','codex','--local','--skills','--project',real],dir).stderr,/Symbolic-link/);
    await rm(path.join(real,'.agents'));await mkdir(path.join(real,'.agents/skills'),{recursive:true});await symlink(real,path.join(real,'.agents/skills/motion-design'),'dir');
    assert.match(run(['skills','install','--client','codex','--project',real],dir).stderr,/Symbolic-link/);
    await rm(path.join(real,'.agents/skills/motion-design'));await mkdir(path.join(real,'.agents/skills/motion-design'));await symlink(path.join(root,'package.json'),path.join(real,'.agents/skills/motion-design/SKILL.md'));
    assert.match(run(['skills','install','--client','codex','--project',real],dir).stderr,/Symbolic links/);
    await symlink(real,path.join(dir,'config-parent'),'dir');assert.match(run(['init','--client','cursor','--local','--config',path.join(dir,'config-parent/mcp.json')],dir).stderr,/Symbolic-link/);
    assert.equal(await exists(path.join(real,'mcp.json')),false);
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('stale combined skill confirmation is refused and changed destinations are detected before commit',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-skill-stale-')));
  try {
    const args=['init','--client','codex','--local','--skills','--project',dir];const plan=JSON.parse(run(args,dir).stdout);
    // An identical skill appearing changes the exact plan even though it is safe to retain.
    const prepared=await prepareSkills('codex',dir,root);await installSkills(prepared);
    const stale=run([...args,'--apply','--confirm',plan.confirmationToken],dir);assert.equal(stale.status,1);assert.match(stale.stderr,/does not match/);assert.equal(await exists(path.join(dir,'.codex/config.toml')),false);
    const current=await prepareSkills('codex',dir,root);await writeFile(path.join(dir,'.agents/skills/motion-evidence/custom.txt'),'keep');
    await assert.rejects(assertSkillsCurrent(current),/changed after preview/);
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('a late MCP commit failure rolls back all newly installed skills, without touching unrelated folders',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-skill-rollback-')));
  try {
    // Deliberately choose a config path that will become the skills directory during apply.
    const config=path.join(dir,'.agents/skills'),args=['init','--client','codex','--local','--skills','--project',dir,'--config',config];
    const preview=run(args,dir);assert.equal(preview.status,0,preview.stderr);const plan=JSON.parse(preview.stdout);
    const result=run([...args,'--apply','--confirm',plan.confirmationToken],dir);assert.equal(result.status,1);assert.match(result.stderr,/regular file/);
    for(const name of skillNames)assert.equal(await exists(path.join(config,name)),false);
    assert.equal((await readdir(path.join(dir,'.agents'))).some(name=>name.endsWith('.tmp')),false);
    assert.equal((await readdir(config)).length,0);
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('skills command rejects unsupported options and invalid project targets',async()=>{
  for(const args of [['skills'],['skills','remove'],['skills','install'],['skills','install','--client','codex','--local'],['skills','install','--client','codex','--skills'],['skills','install','--client','codex','--project','/'],['skills','install','--client','codex','--project','/does-not-exist'],['config','--skills'],['config','--project','.']])assert.equal(run(args).status,1,JSON.stringify(args));
});
test('wizard offers project skills for supported clients, allows explicit opt-out, and does not offer generic skills',async()=>{
  for(const answer of ['','yes','y','no','n']){const replies=['cursor','no',answer];const plan=await prepareInitWizard({client:'generic'},async()=>replies.shift()!);assert.equal(!!plan.options.skills,!['n','no'].includes(answer));}
  const replies=['generic','no'];const generic=await prepareInitWizard({client:'generic'},async()=>replies.shift()!);assert.equal(generic.options.skills,undefined);assert.equal(replies.length,0);
});

test('late config failure retains identical pre-existing skills and unrelated instructions',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-skill-existing-rollback-')));
  try {
    await installSkills(await prepareSkills('codex',dir,root));const destination=path.join(dir,'.agents/skills');
    for(const name of skillNames.filter(name=>name!=='motion-design'))await rm(path.join(destination,name),{recursive:true});
    await mkdir(path.join(destination,'unrelated'));await writeFile(path.join(destination,'unrelated/SKILL.md'),'keep');
    const args=['init','--client','codex','--local','--skills','--project',dir,'--config',path.join(destination,'motion-evidence')];
    const preview=run(args,dir);assert.equal(preview.status,0,preview.stderr);const plan=JSON.parse(preview.stdout);assert.equal(plan.skills.skills.find((skill:{name:string})=>skill.name==='motion-design').status,'unchanged');
    const result=run([...args,'--apply','--confirm',plan.confirmationToken],dir);assert.equal(result.status,1);
    assert.deepEqual((await readdir(destination)).sort(),['motion-design','unrelated']);assert.equal(await readFile(path.join(destination,'unrelated/SKILL.md'),'utf8'),'keep');
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('rollback preserves user changes made after installation and removes other new skills',async()=>{
  const dir=await realpath(await mkdtemp(path.join(os.tmpdir(),'motion-skill-safe-rollback-')));
  try {
    const rollback=await installSkills(await prepareSkills('codex',dir,root));const destination=path.join(dir,'.agents/skills');
    await writeFile(path.join(destination,'motion-evidence/custom.txt'),'user changes');await assert.rejects(rollback(),/preserved changed/);
    assert.deepEqual(await readdir(destination),['motion-evidence']);assert.equal(await readFile(path.join(destination,'motion-evidence/custom.txt'),'utf8'),'user changes');
  }finally{await rm(dir,{recursive:true,force:true})}
});
