import express from 'express';
import {createServer as createViteServer} from 'vite';
import {existsSync} from 'node:fs';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {captureRun} from './capture';
import type {RunReport,RunSummary} from '../src/types';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT ?? 4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be an integer 1024–65535');
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'2kb'}));
app.use('/api',(req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  // The runner is intentionally local-only. Reject cross-site browser requests to mutation routes.
  if(req.method==='POST') {
    const origin=req.headers.origin;
    if(origin && origin!==`http://127.0.0.1:${port}` && origin!==`http://localhost:${port}`)return res.status(403).json({error:'Only same-origin local requests are accepted'});
  }
  next();
});
const runs=new Map<string,RunReport>();
let busy=false;
await mkdir(path.join(root,'artifacts/runs'),{recursive:true});
for(const entry of await readdir(path.join(root,'artifacts/runs'))) {
  if(!/^[a-f\d-]{36}$/.test(entry))continue;
  try {
    const run:RunReport=JSON.parse(await readFile(path.join(root,'artifacts/runs',entry,'report.json'),'utf8'));
    if(run.status==='running'||run.status==='queued') {run.status='failed';run.error='Capture was interrupted by server restart. Run it again.';}
    runs.set(run.id,run);
  }catch{/* An interrupted artifact directory is not a complete report. */}
}
const persist=async(run:RunReport)=>{
  const dir=path.join(root,'artifacts/runs',run.id);await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,'report.json'),JSON.stringify(run,null,2));
};
const summarize=(run:RunReport):RunSummary=>({id:run.id,status:run.status,createdAt:run.createdAt,delayMs:run.delayMs,fixture:run.fixture,...(run.error?{error:run.error}:{})});
app.get('/api/health',(_req,res)=>res.json({ok:true,version:'0.1.0'}));
app.get('/api/runs',(_req,res)=>res.json({runs:[...runs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(summarize)}));
app.post('/api/runs',(req,res)=>{
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['fixture','delayMs'].includes(key))||body.fixture!=='key-remount'||!Number.isInteger(body.delayMs)||body.delayMs<150||body.delayMs>800) {
    return res.status(400).json({error:'Use {fixture:"key-remount",delayMs:150..800}. Arbitrary URLs, scripts and targets are not supported.'});
  }
  if(busy)return res.status(409).json({error:'A capture is already running. Wait for it to finish.'});
  busy=true;
  const run:RunReport={id:randomUUID(),status:'queued',createdAt:new Date().toISOString(),fixture:'key-remount',delayMs:body.delayMs};
  runs.set(run.id,run);
  res.status(202).json({id:run.id,status:run.status});
  setTimeout(async()=>{
    run.status='running';
    try {
      await persist(run);
      const completed=await captureRun(run,root,port,stage=>console.log(`[${run.id}] ${stage}`));
      runs.set(run.id,completed);await persist(completed);
    } catch(error) {
      console.error(error);run.status='failed';run.finishedAt=new Date().toISOString();
      run.error=error instanceof Error?error.message.split('\n').filter(Boolean).slice(0,3).join(' ').slice(0,700):'Capture failed';
      await writeFile(path.join(root,'artifacts/runs',run.id,'failure.log'),String(error));
      await persist(run);
    } finally {busy=false;}
  },0);
});
app.get('/api/runs/:id',(req,res)=>{
  const run=runs.get(req.params.id);return run?res.json(run):res.status(404).json({error:'Run not found'});
});
app.get('/api/source',async(req,res)=>{
  if(req.query.file!=='src/fixture/Fixture.tsx')return res.status(400).json({error:'Only the fixture source is available'});
  return res.json({file:req.query.file,content:await readFile(path.join(root,'src/fixture/Fixture.tsx'),'utf8')});
});
app.get('/api/fixture-data',async(req,res)=>{
  const delay=Number(req.query.delay);
  if(!Number.isInteger(delay)||delay<150||delay>800)return res.status(400).json({error:'delay must be 150–800 ms'});
  await new Promise(resolve=>setTimeout(resolve,delay));
  return res.json({id:'card-42',revision:1,title:'Motion lab workspace',status:'ready'});
});
app.use('/artifacts/runs',express.static(path.join(root,'artifacts/runs'),{index:false,dotfiles:'deny',setHeaders:res=>res.setHeader('Cache-Control','no-cache')}));
if(existsSync(path.join(root,'dist/index.html'))) {
  const distRoot=path.join(root,'dist');
  const sendIndex=(_req:express.Request,res:express.Response)=>res.sendFile('index.html',{root:distRoot});
  for(const route of ['/fixture','/evidence-v1','/report'])app.get(route,sendIndex);
  app.use(express.static(distRoot));
  app.use(sendIndex);
}else{
  const vite=await createViteServer({root,server:{middlewareMode:true,host:'127.0.0.1'},appType:'spa'});
  app.use(vite.middlewares);
}
app.use((error:Error & {status?:number},_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.status && error.status>=400 && error.status<600 ? error.status : 500).json({error:error.message}));
app.listen(port,'127.0.0.1',()=>console.log(`Motion Debugger: http://127.0.0.1:${port} (${existsSync(path.join(root,'dist/index.html'))?'production build':'development'})`));
