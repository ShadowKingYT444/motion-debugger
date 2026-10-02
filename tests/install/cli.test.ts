import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configText} from '../../packages/cli/config';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function run(args:string[],cwd=root){return spawnSync(process.execPath,[path.join(root,'build/cli/index.js'),...args],{cwd,encoding:'utf8'})}
test('all client configurations preserve unrelated servers and use a pinned runtime',()=>{
  for(const client of ['generic','claude-code','cursor','vscode'] as const){const key=client==='vscode'?'servers':'mcpServers';const output=JSON.parse(configText({client},JSON.stringify({theme:'dark',[key]:{existing:{command:'existing'}}})));assert.equal(output.theme,'dark');assert.equal(output[key].existing.command,'existing');assert.deepEqual(output[key]['motion-debugger'].args,['--yes','motion-debugger@0.3.0','mcp']);if(client==='vscode')assert.equal(output[key]['motion-debugger'].type,'stdio')}
});
test('Codex TOML is idempotent and does not replace unmanaged entries',()=>{
  const original='model = "test"\n\n[mcp_servers.other]\ncommand = "existing"\n';const output=configText({client:'codex',local:true},original);assert.ok(output.startsWith(original));assert.match(output,/\[mcp_servers.motion-debugger.env\]/);assert.equal(configText({client:'codex',local:true},output),output);assert.throws(()=>configText({client:'codex'},'[mcp_servers.motion-debugger]\ncommand="custom"\n'),/unmanaged/);assert.throws(()=>configText({client:'codex'},'# BEGIN motion-debugger (managed)\n'),/Malformed/)
});
test('init is read-only until exact diff confirmation, preserves content, backs up, and rejects stale tokens',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'motion-config-test-'));
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
  assert.equal(run(['--version']).stdout.trim(),'0.3.0');assert.equal(run(['--help']).status,0);for(const args of [['typo'],['init','--client','invalid'],['demo','--port','bad'],['capture'],['config','--apply'],['doctor','--unrecognized'],['config','--origin','https://example.com']])assert.equal(run(args).status,1,JSON.stringify(args))
});
