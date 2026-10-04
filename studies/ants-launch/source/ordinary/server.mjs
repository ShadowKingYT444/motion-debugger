import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw new Error();const data=await readFile(file.endsWith('/')?file+'index.html':file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(5173,'127.0.0.1',()=>console.log('Anthropic Ants → http://127.0.0.1:5173'));
