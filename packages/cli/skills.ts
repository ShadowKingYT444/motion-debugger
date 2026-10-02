import {createHash,randomUUID} from 'node:crypto';
import {lstat,readdir,readFile,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import type {Client} from './config';

export const skillNames=['motion-design','motion-3d-ui','motion-evidence','motion-build-inspect-repair'] as const;
export const skillDirectories:Partial<Record<Client,string>>={codex:'.agents/skills','claude-code':'.claude/skills',cursor:'.cursor/skills',vscode:'.github/skills'};
type FileEntry={path:string;data:Buffer};
type Snapshot={directories:string[];files:FileEntry[]};
export interface SkillInstallPlan {
  project:string;directory:string;source:string;
  skills:{name:string;target:string;status:'install'|'unchanged';snapshot:Snapshot}[];
}
function digest(snapshot:Snapshot){return {directories:snapshot.directories,files:snapshot.files.map(file=>({path:file.path,sha256:createHash('sha256').update(file.data).digest('hex')}))}}
function same(a:Snapshot,b:Snapshot){return JSON.stringify(digest(a))===JSON.stringify(digest(b))}
async function stat(file:string){try{return await lstat(file)}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error}}
/** Reject symlinks in every existing ancestor, not just the final file. */
export async function assertSafePath(target:string) {
  const absolute=path.resolve(target);let current=path.parse(absolute).root;
  for(const segment of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current=path.join(current,segment);const info=await stat(current);
    if(!info)continue;
    if(info.isSymbolicLink())throw new Error(`Symbolic-link paths are not modified: ${current}. Choose a real workspace/destination`);
    if(current!==absolute&&!info.isDirectory())throw new Error(`Destination ancestor is not a directory: ${current}`);
  }
}
async function snapshotTree(root:string):Promise<Snapshot|undefined> {
  await assertSafePath(root);const info=await stat(root);if(!info)return undefined;
  if(!info.isDirectory())throw new Error(`Skill destination must be a directory: ${root}`);
  const result:Snapshot={directories:[],files:[]};
  async function visit(directory:string,relative='') {
    for(const name of (await readdir(directory)).sort()) {
      const child=path.join(directory,name),local=relative?`${relative}/${name}`:name,childStat=await lstat(child);
      if(childStat.isSymbolicLink())throw new Error(`Symbolic links are not allowed in skill folders: ${child}`);
      if(childStat.isDirectory()){result.directories.push(local);await visit(child,local)}
      else if(childStat.isFile())result.files.push({path:local,data:await readFile(child)});
      else throw new Error(`Unsupported filesystem entry in skill folder: ${child}`);
    }
  }
  await visit(root);return result;
}
export async function prepareSkills(client:Client,projectInput:string,packageRoot:string):Promise<SkillInstallPlan> {
  const relative=skillDirectories[client];if(!relative)throw new Error('Skills require --client codex, claude-code, cursor, or vscode');
  const project=path.resolve(projectInput);if(project===path.parse(project).root)throw new Error('Choose a project directory, not a filesystem root');
  await assertSafePath(project);if(!(await stat(project))?.isDirectory())throw new Error(`Project directory must already exist: ${project}`);
  const directory=path.join(project,relative),source=path.join(packageRoot,'plugin/motion-debugger/skills');await assertSafePath(directory);
  const skills:SkillInstallPlan['skills']=[];
  for(const name of skillNames) {
    const snapshot=await snapshotTree(path.join(source,name));if(!snapshot||!snapshot.files.some(file=>file.path==='SKILL.md'))throw new Error(`Packaged skill is missing SKILL.md: ${name}`);
    const target=path.join(directory,name),existing=await snapshotTree(target);
    if(existing&&!same(existing,snapshot))throw new Error(`Skill collision at ${target}. Nothing was written. Preserve or move that folder and review again; existing skill instructions are never overwritten`);
    skills.push({name,target,status:existing?'unchanged':'install',snapshot});
  }
  return {project,directory,source,skills};
}
export function skillsPreview(plan:SkillInstallPlan) {
  return {project:plan.project,directory:plan.directory,skills:plan.skills.map(({name,target,status,snapshot})=>({name,target,status,...digest(snapshot)}))};
}
export async function assertSkillsCurrent(plan:SkillInstallPlan) {
  await assertSafePath(plan.project);await assertSafePath(plan.directory);
  for(const skill of plan.skills) {
    const source=await snapshotTree(path.join(plan.source,skill.name)),existing=await snapshotTree(skill.target);
    if(!source||!same(source,skill.snapshot)|| (skill.status==='install'?!!existing:!existing||!same(existing,skill.snapshot)))throw new Error(`Skill source or destination changed after preview: ${skill.target}. Nothing was written; rerun to review it`);
  }
}
/** Stage complete folders, then rename; rollback only newly installed, still-identical folders. */
export async function installSkills(plan:SkillInstallPlan):Promise<()=>Promise<void>> {
  await assertSkillsCurrent(plan);const pending=plan.skills.filter(skill=>skill.status==='install');
  const committed:typeof pending=[];const staged:{skill:typeof pending[number];temporary:string}[]=[];
  const rollback=async()=>{const errors:string[]=[];for(const skill of [...committed].reverse()){try{const current=await snapshotTree(skill.target);if(current&&same(current,skill.snapshot))await rm(skill.target,{recursive:true});else if(current)errors.push(`Installed skill changed: ${skill.target}`)}catch(error){errors.push(error instanceof Error?error.message:String(error))}}if(errors.length)throw new Error(`Rollback preserved changed or unsafe folders. Review manually: ${errors.join('; ')}`)};
  try {
    if(!pending.length)return rollback;
    await mkdir(plan.directory,{recursive:true});await assertSafePath(plan.directory);
    for(const skill of pending) {
      const temporary=path.join(plan.directory,`.${skill.name}.motion-debugger-${randomUUID()}.tmp`);
      await mkdir(temporary,{mode:0o700});staged.push({skill,temporary});
      for(const directory of skill.snapshot.directories)await mkdir(path.join(temporary,directory),{recursive:true});
      for(const file of skill.snapshot.files)await writeFile(path.join(temporary,file.path),file.data,{flag:'wx',mode:0o644});
    }
    await assertSkillsCurrent(plan);
    for(const {skill,temporary} of staged) {
      await assertSafePath(skill.target);if(await stat(skill.target))throw new Error(`Skill destination appeared after preview: ${skill.target}`);
      await rename(temporary,skill.target);committed.push(skill);
    }
    return rollback;
  }catch(error){await rollback();throw error}
  finally{for(const {temporary} of staged)await rm(temporary,{recursive:true,force:true})}
}
