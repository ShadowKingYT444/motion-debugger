import {build} from 'esbuild';
import {mkdir,chmod,cp,rm,readFile,writeFile} from 'node:fs/promises';
const metadata=JSON.parse(await readFile('package.json','utf8'));
// npm-shrinkwrap travels with a CLI tarball and pins the transitive runtime graph.
await cp('package-lock.json','npm-shrinkwrap.json');
await mkdir('build',{recursive:true});
for(const entry of ['core','mcp','cli']) {
  await build({entryPoints:[`packages/${entry}/index.ts`],outfile:`build/${entry}/index.js`,platform:'node',target:'node22',format:'esm',bundle:true,packages:'external',sourcemap:true,...(entry==='core'?{}:{banner:{js:'#!/usr/bin/env node'}})});
  if(entry!=='core')await chmod(`build/${entry}/index.js`,0o755);
}
await rm('build/assets',{recursive:true,force:true});await mkdir('build/assets/src',{recursive:true});
// Ship the browser-only post-render adapter without Node/Playwright dependencies.
await build({entryPoints:['packages/core/scene-adapter.ts'],outfile:'plugin/motion-debugger/skills/motion/recipes/scene-actor-adapter.mjs',platform:'browser',target:'es2022',format:'esm',bundle:true});
await cp('plugin/motion-debugger/skills/motion/recipes/scene-actor-adapter.mjs','examples/assembly/motion/scene-actor-adapter.mjs');
await cp('dist','build/assets/dist',{recursive:true});await cp('src/fixture','build/assets/src/fixture',{recursive:true});await cp('src/examples','build/assets/src/examples',{recursive:true});
await cp('examples/assembly','build/assets/assembly',{recursive:true});
// Ship the A/B showcase: the agent-built sites, the side-by-side films and the viewer. README GIFs and the
// agent-upgraded demos (sites, films, manifest) stay in git, where the README links them.
await rm('build/assets/showcase',{recursive:true,force:true});
await cp('demos','build/assets/showcase',{recursive:true,filter:source=>!/(\.gif|upgrade\.mp4|upgrade-poster\.jpg|upgrades\.json|upgrade-recordings\.json|record\.mjs|README\.md)$/.test(source)&&!source.split(/[\\/]/).some(part=>part.startsWith('.')||part==='upgraded')});
await mkdir('plugin/motion-debugger/scripts',{recursive:true});
const pluginBuild=await build({metafile:true,entryPoints:['packages/mcp/index.ts'],outfile:'plugin/motion-debugger/scripts/mcp.mjs',platform:'node',target:'node22',format:'esm',bundle:true,external:['playwright'],sourcemap:false,banner:{js:'#!/usr/bin/env node'}});
await chmod('plugin/motion-debugger/scripts/mcp.mjs',0o755);
await rm('plugin/motion-debugger/scripts/cli.mjs',{force:true});
const plugin=JSON.parse(await readFile('plugin/motion-debugger/.codex-plugin/plugin.json','utf8'));plugin.version=metadata.version;await writeFile('plugin/motion-debugger/.codex-plugin/plugin.json',JSON.stringify(plugin,null,2)+'\n');
const pluginPackage=JSON.parse(await readFile('plugin/motion-debugger/package.json','utf8'));pluginPackage.version=metadata.version;pluginPackage.dependencies={playwright:metadata.dependencies.playwright};await writeFile('plugin/motion-debugger/package.json',JSON.stringify(pluginPackage,null,2)+'\n');
const pluginLock=JSON.parse(await readFile('plugin/motion-debugger/package-lock.json','utf8'));
if(pluginLock.packages[''].dependencies.playwright!==metadata.dependencies.playwright)throw new Error('Refresh the standalone plugin lockfile for the exact Playwright version before building');
pluginLock.version=metadata.version;pluginLock.packages[''].version=metadata.version;
await writeFile('plugin/motion-debugger/package-lock.json',JSON.stringify(pluginLock,null,2)+'\n');

const bundledPackages=[...new Set(Object.keys(pluginBuild.metafile.inputs).flatMap(input=>{const parts=input.replaceAll('\\','/').split('/'),index=parts.lastIndexOf('node_modules');if(index<0||!parts[index+1])return[];return[parts[index+1].startsWith('@')?`${parts[index+1]}/${parts[index+2]}`:parts[index+1]]}))].sort();
const notices=['Third-party packages bundled into scripts/mcp.mjs. These notices do not grant a license to the Motion Debugger project.'];
for(const name of bundledPackages){const base=`node_modules/${name}`;const pkg=JSON.parse(await readFile(`${base}/package.json`,'utf8'));let licenseText;for(const filename of ['LICENSE','LICENSE.txt','LICENSE.md','license','license.txt','COPYING']){try{licenseText=await readFile(`${base}/${filename}`,'utf8');break}catch{}}if(!licenseText)throw new Error(`Missing third-party license for bundled package ${name}`);notices.push(`\n===== ${name}@${pkg.version} (${pkg.license??'see license'}) =====\n${licenseText}`)}
await writeFile('plugin/motion-debugger/THIRD_PARTY_LICENSES.txt',notices.join('\n')+'\n');
