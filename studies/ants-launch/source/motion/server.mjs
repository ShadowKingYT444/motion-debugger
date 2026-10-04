import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
const root=process.cwd();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/')&&path!==root)throw Error();const body=await readFile(path===root+'/'||path===root?root+'/index.html':path);res.writeHead(200,{'Content-Type':types[extname(path)]||'text/html','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Anthropic Ants · http://127.0.0.1:4173'));
