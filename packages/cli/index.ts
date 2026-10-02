import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {capture,inspect,compact,compare} from '../core/index';
import {optionsFromEnvironment} from '../mcp/server';

const [command,...args]=process.argv.slice(2);
const options=optionsFromEnvironment();
try {
  let result:unknown;
  if(command==='capture') {
    if(!args[0])throw new Error('capture requires a recipe JSON path');
    const recipe=JSON.parse(await readFile(path.resolve(args[0]),'utf8'));
    result=compact(await capture(recipe,options));
  }else if(command==='inspect') {
    if(!args[0])throw new Error('inspect requires a capture UUID');result=compact(await inspect(args[0],options));
  }else if(command==='compare') {
    if(!args[0]||!args[1])throw new Error('compare requires before and after capture UUIDs');result=compare(await inspect(args[0],options),await inspect(args[1],options));
  }else if(command==='config') {
    const entry=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../mcp/index.js');
    result={mcpServers:{'motion-debugger':{command:process.execPath,args:[entry],env:{MOTION_ARTIFACT_DIR:path.resolve(options.artifactRoot)}}}};
  }else {
    console.log('Motion Debugger 0.2 — temporal evidence for coding agents\n\n  motion-debugger capture recipe.json\n  motion-debugger inspect <capture-id>\n  motion-debugger compare <before-id> <after-id>\n  motion-debugger config\n\nEnvironment: MOTION_ARTIFACT_DIR, MOTION_ALLOWED_ORIGINS, MOTION_SOURCE_ROOTS\nNo config is installed or changed by these commands.');process.exit(0);
  }
  console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1}
