#!/usr/bin/env node
import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function startAssembly({port=4122,root=path.resolve(fileURLToPath(new URL('../examples/assembly',import.meta.url)))}={}){
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Port must be0–65535');
  const base=await realpath(root);let origin='';
  const server=createServer(async(req,res)=>{
    if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403).end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    try{const url=new URL(req.url,origin),relative=decodeURIComponent(url.pathname).replace(/^\/assembly\/?/,'/').replace(/^\//,'')||'index.html';const target=await realpath(path.join(base,relative));if(!target.startsWith(base+path.sep)||(await stat(target)).isDirectory()){res.writeHead(404).end();return;}const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.txt':'text/plain'}[path.extname(target)]??'application/octet-stream';const data=await readFile(target);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'"});req.method==='HEAD'?res.end():res.end(data);}catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});origin=`http://127.0.0.1:${server.address().port}`;
  return {origin,server,close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.some((arg,index)=>index%2===0&&arg!=='--port'))throw new Error('Only --port is accepted');const port=args.length?Number(args[1]):4122;
  const viewer=await startAssembly({port});console.log(`ASSEMBLY: ${viewer.origin}`);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await viewer.close();process.exit()});
}
