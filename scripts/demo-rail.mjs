#!/usr/bin/env node
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../studies/rail-dispatch');
export async function launchRail(port=4123){
 const app=express();app.disable('x-powered-by');
 app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next()});
 app.use('/ordinary',express.static(path.join(root,'source/ordinary'),{dotfiles:'deny'}));
 app.use('/motion',express.static(path.join(root,'source/motion'),{dotfiles:'deny'}));
 app.use('/evidence',express.static(path.join(root,'evidence'),{dotfiles:'deny'}));
 app.get('/viewer.js',(_req,res)=>res.sendFile(path.join(root,'viewer.js')));
 app.get('/',(_req,res)=>res.sendFile(path.join(root,'viewer.html')));
 const server=await new Promise(resolve=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s))});
 return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const index=process.argv.indexOf('--port');const port=index<0?4123:Number(process.argv[index+1]);
 if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Expected --port 0–65535');
 const viewer=await launchRail(port);console.log(`SIGNAL comparison: ${viewer.origin}`);
 for(const event of ['SIGTERM','SIGINT'])process.on(event,async()=>{await viewer.close();process.exit()});
}
