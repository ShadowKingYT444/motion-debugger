// Consumer-side validation: real dependency installation, never npm link or repo node_modules.
import {mkdtemp,writeFile,readFile,rm,lstat,cp,mkdir} from 'node:fs/promises';
import {appendFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const skipBrowser=process.argv.includes('--skip-browser');
if(process.argv.slice(2).some(arg=>arg!=='--skip-browser'))throw new Error('Only --skip-browser is supported');
const root=process.cwd();const temp=await mkdtemp(path.join(os.tmpdir(),'motion-packed-install-'));
const proofDir=path.join(root,'artifacts/install');await rm(proofDir,{recursive:true,force:true});await mkdir(proofDir,{recursive:true});
const proof={schemaVersion:'1.0',startedAt:new Date().toISOString(),status:'running',node:process.version,platform:process.platform,skipBrowser,consumer:temp,checks:[]};
await writeFile(path.join(proofDir,'verification.json'),JSON.stringify(proof,null,2));
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(command,args,cwd=temp){const result=spawnSync(command,args,{cwd,encoding:'utf8',env:{...process.env,PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:'1',npm_config_cache:path.join(temp,'.npm-cache')},timeout:240000});appendFileSync(path.join(proofDir,'commands.log'),`\n$ ${command} ${args.join(' ')}\nexit=${result.status}\n${result.stdout??''}\n${result.stderr??''}\n`);if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed (${result.status})\n${result.stdout}\n${result.stderr}`);return result.stdout}
let server;
try {
  console.log(run(npm,['run','build'],root));
  const packed=JSON.parse(run(npm,['pack','--ignore-scripts','--json','--pack-destination',temp],root));const tarball=path.join(temp,packed[0].filename);proof.package={filename:packed[0].filename,integrity:packed[0].integrity,shasum:packed[0].shasum,size:packed[0].size,unpackedSize:packed[0].unpackedSize};proof.checks.push('package-built-and-packed');await cp(tarball,path.join(proofDir,packed[0].filename));
  await writeFile(path.join(temp,'package.json'),JSON.stringify({name:'motion-debugger-install-consumer',version:'1.0.0',private:true,type:'module'}));
  console.log(`Packed artifact: ${tarball}`);
  console.log(run(npm,['install','--omit=dev','--ignore-scripts','--no-audit','--no-fund',tarball]));
  proof.checks.push('fresh-npm-dependency-install');
  const installed=path.join(temp,'node_modules/motion-debugger');const installedStat=await lstat(installed);assert.equal(installedStat.isDirectory(),true);assert.equal(installedStat.isSymbolicLink(),false);
  const binary=path.join(installed,'build/cli/index.js');assert.equal(run(process.execPath,[binary,'--version']).trim(),'0.3.0');
  run(process.execPath,['--input-type=module','-e','import {validateRecipe,compare} from "motion-debugger"; if(typeof validateRecipe!=="function"||typeof compare!=="function")process.exit(1)']);
  for(const client of ['codex','claude-code','cursor','vscode']) {const text=run(process.execPath,[binary,'config','--client',client,'--local']);assert.ok(text.includes('motion-debugger'));}
  proof.checks.push('installed-cli-version-and-core-import','four-client-config-formats');
  const config=path.join(temp,'mcp.json');const plan=JSON.parse(run(process.execPath,[binary,'init','--config',config,'--local']));
  run(process.execPath,[binary,'init','--config',config,'--local','--apply','--confirm',plan.confirmationToken]);assert.ok(JSON.parse(await readFile(config,'utf8')).mcpServers['motion-debugger']);
  proof.checks.push('confirmed-config-write');
  const smoke=`import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';const client=new Client({name:'installed-package-smoke',version:'1.0.0'});await client.connect(new StdioClientTransport({command:process.execPath,args:[${JSON.stringify(binary)},'mcp']}));try{const tools=await client.listTools();if(!tools.tools.some(t=>t.name==='motion_capture'))throw new Error('Missing tool');const result=await client.callTool({name:'motion_list',arguments:{}});if(result.isError)throw new Error(JSON.stringify(result));console.log('Installed MCP handshake + motion_list passed')}finally{await client.close()}`;
  console.log(run(process.execPath,['--input-type=module','-e',smoke]));
  proof.checks.push('installed-mcp-sdk-handshake-and-motion-list');
  const standalonePlugin=path.join(temp,'standalone-plugin');await cp(path.join(installed,'plugin/motion-debugger'),standalonePlugin,{recursive:true});
  console.log(run(npm,['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],standalonePlugin));
  console.log(run(process.execPath,['--input-type=module','-e',smoke.replace(JSON.stringify(binary)+",'mcp'",JSON.stringify(path.join(standalonePlugin,'scripts/mcp.mjs')))]));
  proof.checks.push('standalone-plugin-dependency-install-and-sdk-handshake');
  console.log(run(process.execPath,[binary,'doctor',...(skipBrowser?['--skip-launch']:[])]));
  console.log(run(npm,['exec','--offline','--','motion-debugger','--version']));
  for(const scenario of ['kinetic','drawer','reveal','cursor']){const recipe=JSON.parse(run(process.execPath,[binary,'recipe',scenario]));assert.equal(recipe.sourceRefs,undefined);assert.ok(recipe.actions.length>0);}
  proof.checks.push(skipBrowser?'browser-launch-explicitly-skipped':'browser-launched');
  const port=4197;let log='';server=spawn(process.execPath,[binary,'demo','--port',String(port),'--data-dir',path.join(temp,'demo-data')],{cwd:temp,stdio:['ignore','pipe','pipe']});server.stdout.on('data',data=>log+=data);server.stderr.on('data',data=>log+=data);
  for(let attempt=0;;attempt++){try{const response=await fetch(`http://127.0.0.1:${port}/api/health`);if(response.ok)break}catch{}if(attempt>100||server.exitCode!==null)throw new Error(`Installed demo failed to start: ${log}`);await new Promise(resolve=>setTimeout(resolve,100))}
  const response=await fetch(`http://127.0.0.1:${port}/examples`);assert.equal(response.status,200);assert.match(await response.text(),/<html/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'})).status,403);
  proof.checks.push('packaged-demo-loopback-http-and-cross-origin-defense');
  if(!skipBrowser) {
    const ids=[];
    for(const mode of ['baseline','fixed']){
      const recipeFile=path.join(temp,`kinetic-${mode}.json`);await writeFile(recipeFile,run(process.execPath,[binary,'recipe','kinetic','--mode',mode,'--origin',`http://127.0.0.1:${port}`]));
      const captured=JSON.parse(run(process.execPath,[binary,'capture',recipeFile]));ids.push(captured.id);
      assert.equal(captured.metrics.sufficientEvidence,true);assert.ok((await lstat(captured.evidence.video)).size>1000);
      if(mode==='baseline')assert.ok(captured.assertions.some(item=>!item.passed),'Seeded transient defect must fail its temporal contract');else assert.ok(captured.assertions.every(item=>item.passed),JSON.stringify(captured.assertions.filter(item=>!item.passed)));
      const inspected=JSON.parse(run(process.execPath,[binary,'inspect',captured.id]));assert.equal(inspected.id,captured.id);
    }
    const comparison=JSON.parse(run(process.execPath,[binary,'compare',...ids]));assert.equal(comparison.comparable,true);assert.equal(comparison.contractsPassed.before,false);assert.equal(comparison.contractsPassed.after,true);assert.equal(comparison.finalEquivalent,true);
    await cp(path.join(temp,'.motion-evidence'),path.join(proofDir,'captures'),{recursive:true});
    proof.checks.push('installed-cli-two-webm-captures-inspect-and-before-after-comparison');proof.comparison=comparison;
    console.log('Installed package: two actual WebM captures + inspect + before/after contract comparison passed');
  }
  console.log(`Fresh tarball install: CLI/core import/config/recipes/SDK stdio/packaged demo passed. Browser launch: ${skipBrowser?'explicitly SKIPPED':'passed'}`);
  console.log(`Consumer workspace: ${temp}`);
  proof.status='passed';proof.finishedAt=new Date().toISOString();await writeFile(path.join(proofDir,'verification.json'),JSON.stringify(proof,null,2));
  console.log(`Install verification saved: ${proofDir}`);
}catch(error){
  proof.status='failed';proof.finishedAt=new Date().toISOString();proof.error=error instanceof Error?error.stack:String(error);
  await writeFile(path.join(proofDir,'verification.json'),JSON.stringify(proof,null,2));
  const partialCaptures=path.join(temp,'.motion-evidence');await cp(partialCaptures,path.join(proofDir,'captures'),{recursive:true}).catch(()=>{});
  throw error;
}finally {
  if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve))}
  if(process.env.MOTION_KEEP_INSTALL_TEST!=='1')await rm(temp,{recursive:true,force:true});
}
