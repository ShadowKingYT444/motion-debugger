import {build} from 'esbuild';
import {mkdir,chmod} from 'node:fs/promises';
await mkdir('build',{recursive:true});
for(const entry of ['core','mcp','cli']) {
  await build({entryPoints:[`packages/${entry}/index.ts`],outfile:`build/${entry}/index.js`,platform:'node',target:'node22',format:'esm',bundle:true,packages:'external',sourcemap:true,...(entry==='core'?{}:{banner:{js:'#!/usr/bin/env node'}})});
  if(entry!=='core')await chmod(`build/${entry}/index.js`,0o755);
}

await mkdir('plugin/motion-debugger/scripts',{recursive:true});
await build({entryPoints:['packages/mcp/index.ts'],outfile:'plugin/motion-debugger/scripts/mcp.mjs',platform:'node',target:'node22',format:'esm',bundle:true,external:['playwright'],sourcemap:false,banner:{js:'#!/usr/bin/env node'}});
await chmod('plugin/motion-debugger/scripts/mcp.mjs',0o755);
