// Real SDK bridge for this local trial; stores unmodified tool responses and native frames.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {readFile,writeFile,mkdir,appendFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const [requestFile] = process.argv.slice(2);
const request = JSON.parse(await readFile(requestFile,'utf8'));
const output = path.resolve(request.output);
await mkdir(output,{recursive:true});
if((await readdir(output)).length)throw new Error("Choose a new empty output directory; prior tool evidence must not be overwritten");
const client = new Client({name:'local-motion-trial',version:'1.0.0'});
const transport = new StdioClientTransport({command:process.execPath,args:[path.resolve(request.entry),'mcp'],env:{...process.env,...(request.browserMode?{MOTION_BROWSER_MODE:request.browserMode}:{}),MOTION_ARTIFACT_DIR:path.resolve(request.artifactRoot),MOTION_ALLOWED_ORIGINS:request.origin,MOTION_SOURCE_ROOTS:path.resolve(request.project)},stderr:'pipe'});
const startedAt=new Date().toISOString();
await client.connect(transport);
try {
 const listing=await client.listTools();
 await writeFile(path.join(output,'tools.json'),JSON.stringify(listing,null,2));
 for(const [i,call] of request.calls.entries()) {
  const args=call.arguments;
  const result=await client.callTool({name:call.name,arguments:args},undefined,{timeout:90000});
  await writeFile(path.join(output,`${i}-${call.name}.json`),JSON.stringify(result,null,2));
  const nativeImages=result.content?.filter(x=>x.type==='image')||[];
  for(const [j,img] of nativeImages.entries())await writeFile(path.join(output,`${i}-frame-${j}.png`),Buffer.from(img.data,'base64'));
  await appendFile(path.join(output,'trace.jsonl'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),tool:call.name,arguments:args,isError:result.isError||false,responseFile:`${i}-${call.name}.json`,nativeImages:nativeImages.length})+'\n');
  console.log(JSON.stringify({tool:call.name,isError:result.isError||false,result:result.structuredContent||result.content?.filter(x=>x.type==='text'),nativeImages:nativeImages.length}));
 }
} finally {await client.close();}
