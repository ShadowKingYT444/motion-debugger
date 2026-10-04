import express from 'express';
import {mkdir,readFile,readdir,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {captureRun} from '../../server/capture';
import type {RunReport,RunSummary} from '../../src/types';
import {packageRoot,metadata} from './config';

export async function startDemo({port,dataDir}:{port:number;dataDir:string}) {
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('--port must be an integer 1024–65535');
  const assets=path.join(packageRoot,'build/assets');
  await readFile(path.join(assets,'dist/index.html'));
  await mkdir(path.join(dataDir,'artifacts/runs'),{recursive:true});
  await mkdir(path.join(dataDir,'src/fixture'),{recursive:true});
  await copyFile(path.join(assets,'src/fixture/Fixture.tsx'),path.join(dataDir,'src/fixture/Fixture.tsx'));
  const app=express();app.disable('x-powered-by');app.use(express.json({limit:'2kb'}));
  // Reject hostile Host headers as well as browser mutation origins (DNS-rebinding defense).
  app.use((req,res,next)=>{
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host??''))return res.status(403).json({error:'Only loopback Host headers are accepted'});
    if(req.method==='POST'&&req.headers.origin&&![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin))return res.status(403).json({error:'Only same-origin local requests are accepted'});
    next();
  });
  app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next()});
  const runs=new Map<string,RunReport>();let busy=false;
  for(const id of await readdir(path.join(dataDir,'artifacts/runs'))) {
    if(!/^[a-f\d-]{36}$/.test(id))continue;
    try{const run:RunReport=JSON.parse(await readFile(path.join(dataDir,'artifacts/runs',id,'report.json'),'utf8'));if(['running','queued'].includes(run.status)){run.status='failed';run.error='Capture was interrupted by demo restart. Run it again'}runs.set(id,run)}catch{}
  }
  const persist=async(run:RunReport)=>{const dir=path.join(dataDir,'artifacts/runs',run.id);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'report.json'),JSON.stringify(run,null,2))};
  const summary=(run:RunReport):RunSummary=>({id:run.id,status:run.status,createdAt:run.createdAt,delayMs:run.delayMs,fixture:run.fixture,...(run.error?{error:run.error}:{})});
  app.get('/api/health',(_req,res)=>res.json({ok:true,version:metadata.version}));
  app.get('/api/runs',(_req,res)=>res.json({runs:[...runs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(summary)}));
  app.post('/api/runs',(req,res)=>{
    const body=req.body;
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['fixture','delayMs'].includes(key))||body.fixture!=='key-remount'||!Number.isInteger(body.delayMs)||body.delayMs<150||body.delayMs>800)return res.status(400).json({error:'Use {fixture:"key-remount",delayMs:150..800}. Arbitrary targets are not supported by this demo API'});
    if(busy)return res.status(409).json({error:'A capture is already running'});busy=true;
    const run:RunReport={id:randomUUID(),status:'queued',createdAt:new Date().toISOString(),fixture:'key-remount',delayMs:body.delayMs};runs.set(run.id,run);res.status(202).json({id:run.id,status:run.status});
    setTimeout(async()=>{try{run.status='running';await persist(run);const completed=await captureRun(run,dataDir,port);runs.set(run.id,completed);await persist(completed)}catch(error){run.status='failed';run.finishedAt=new Date().toISOString();run.error=error instanceof Error?error.message.slice(0,700):String(error);await persist(run)}finally{busy=false}},0);
  });
  app.get('/api/runs/:id',(req,res)=>{const run=runs.get(req.params.id);return run?res.json(run):res.status(404).json({error:'Run not found'})});
  app.get('/api/source',async(req,res)=>{if(req.query.file!=='src/fixture/Fixture.tsx')return res.status(400).json({error:'Only demo fixture source is available'});res.json({file:req.query.file,content:await readFile(path.join(dataDir,'src/fixture/Fixture.tsx'),'utf8')})});
  app.get('/api/fixture-data',async(req,res)=>{const delay=Number(req.query.delay);if(!Number.isInteger(delay)||delay<150||delay>800)return res.status(400).json({error:'delay must be 150–800 ms'});await new Promise(resolve=>setTimeout(resolve,delay));res.json({id:'card-42',revision:1,title:'Motion lab workspace',status:'ready'})});
  app.use('/artifacts/runs',express.static(path.join(dataDir,'artifacts/runs'),{index:false,dotfiles:'deny'}));
  app.use('/assembly',express.static(path.join(assets,'assembly'),{dotfiles:'deny',setHeaders:res=>res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'")}));
  const rail=path.join(assets,'rail'),ab=express.Router();
  ab.use('/ordinary',express.static(path.join(rail,'source/ordinary'),{dotfiles:'deny'}));
  ab.use('/motion',express.static(path.join(rail,'source/motion'),{dotfiles:'deny'}));
  ab.use('/evidence',express.static(path.join(rail,'evidence'),{dotfiles:'deny'}));
  ab.get('/viewer.js',(_req,res)=>res.sendFile(path.join(rail,'viewer.js')));
  ab.get('/',(_req,res)=>res.sendFile(path.join(rail,'viewer.html')));
  ab.use((_req,res)=>res.status(404).send('A/B asset not found'));
  app.get('/ab',(req,res,next)=>req.path==='/ab'?res.redirect(308,'/ab/'):next());
  app.use('/ab/',ab);
  app.use(express.static(path.join(assets,'dist')));
  app.use((req,res)=>req.path.startsWith('/api/')?res.status(404).json({error:'API route not found'}):res.sendFile(path.join(assets,'dist/index.html')));
  app.use((error:Error & {status?:number},_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.status&&error.status>=400&&error.status<600?error.status:500).json({error:error.message}));
  const server=app.listen(port,'127.0.0.1');
  await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject)});
  console.log(`Motion Debugger ${metadata.version}: http://127.0.0.1:${port}\nSIGNAL A/B: http://127.0.0.1:${port}/ab/\nDemo evidence: ${dataDir}\nPress Ctrl+C to stop`);
  const shutdown=()=>server.close(()=>process.exit(0));process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
}
