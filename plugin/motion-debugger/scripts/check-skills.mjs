#!/usr/bin/env node
// Self-contained checks for this plugin's intentionally simple YAML skill frontmatter.
import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const pluginRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(pluginRoot,'.codex-plugin/plugin.json'),'utf8'));
if(manifest.skills!=='./skills/')throw new Error('Plugin must expose its ./skills/ directory');
const skillRoot=path.join(pluginRoot,'skills'),names=new Set(),skills=[];
for(const entry of await readdir(skillRoot,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const file=path.join(skillRoot,entry.name,'SKILL.md'),text=await readFile(file,'utf8');
  const frontmatter=/^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)?.[1];
  if(!frontmatter)throw new Error(`Missing frontmatter: ${file}`);
  const name=/^name:\s*([a-z0-9-]+)\s*$/m.exec(frontmatter)?.[1];
  const description=/^description:\s*(.+)$/m.exec(frontmatter)?.[1];
  if(name!==entry.name||name.length>64||names.has(name))throw new Error(`Invalid or duplicate skill name: ${entry.name}`);
  if(!description||description.length<20)throw new Error(`Missing useful discovery description: ${entry.name}`);
  if(/\[TODO[:\]]|\{TODO\}/i.test(text))throw new Error(`Unfinished skill: ${entry.name}`);
  if(text.includes('\\n\\n'))throw new Error(`Literal escaped paragraph separator in skill: ${entry.name}`);
  names.add(name);skills.push({name,description,file:path.relative(pluginRoot,file)});
}
for(const required of ['motion','motion-design','motion-3d-ui','motion-build-inspect-repair','motion-evidence'])if(!names.has(required))throw new Error(`Missing required skill: ${required}`);
await access(path.join(skillRoot,'motion-design/references/taste-LICENSE.txt'));
await access(path.join(skillRoot,'motion-design/references/taste-provenance.md'));
console.log(JSON.stringify({ok:true,plugin:manifest.name,skills:skills.sort((a,b)=>a.name.localeCompare(b.name))},null,2));
