import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
http.createServer((req,res)=>{let target;try{target=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;} const file=path.resolve(root,'.'+(target==='/'?'/index.html':target));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;} fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});}).listen(Number(process.env.LOOP_PREVIEW_PORT||3000),'0.0.0.0',()=>console.log('LOOP preview ready'));
