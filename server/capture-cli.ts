export {};
const origin=process.env.MOTION_ORIGIN ?? 'http://127.0.0.1:4173';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error('MOTION_ORIGIN must be a local server origin');
const delayMs=Number(process.argv[2] ?? 350);
const response=await fetch(`${origin}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fixture:'key-remount',delayMs})});
const result=await response.json() as {id?:string;error?:string};
if(!response.ok||!result.id)throw new Error(result.error ?? `HTTP ${response.status}`);
for(;;){
  const run=await (await fetch(`${origin}/api/runs/${result.id}`)).json() as import('../src/types').RunReport;
  if(run.status==='failed')throw new Error(run.error ?? 'Capture failed');
  if(run.status==='complete') {
    console.log(JSON.stringify({id:run.id,status:run.status,confidence:run.diagnosis?.confidence,baseline:run.baseline?.metrics,fixed:run.fixed?.metrics,assertions:run.assertions},null,2));
    process.exitCode=run.assertions?.every(a=>a.passed)?0:1;
    break;
  }
  await new Promise(resolve=>setTimeout(resolve,1000));
}
