import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('real local API enforces payload, origin, source and request boundaries',{timeout:20000},async()=>{
  const port=4183,origin=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',data=>{log+=String(data)});server.stderr.on('data',data=>{log+=String(data)});
  try {
    for(let i=0;i<50;i++){
      try{if((await fetch(`${origin}/api/health`)).ok)break;}catch{}
      assert.equal(server.exitCode,null,log);
      assert.ok(i<49,`No readiness: ${log}`);
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    for(const body of [null,[],{}, {fixture:'key-remount',delayMs:0},{fixture:'key-remount',delayMs:801},{fixture:'key-remount',delayMs:'350'},{fixture:'key-remount',delayMs:350,url:'http://example.com'}]) {
      const response=await fetch(`${origin}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      assert.equal(response.status,400,JSON.stringify(body));
    }
    assert.equal((await fetch(`${origin}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'})).status,400);
    assert.equal((await fetch(`${origin}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oversized:'a'.repeat(3000)})})).status,413);
    assert.equal((await fetch(`${origin}/api/runs`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify({fixture:'key-remount',delayMs:350})})).status,403);
    assert.equal((await fetch(`${origin}/api/source?file=../../package.json`)).status,400);
    assert.equal((await fetch(`${origin}/api/runs/missing`)).status,404);
    assert.equal((await fetch(`${origin}/api/fixture-data?delay=wrong`)).status,400);
    const before=performance.now();
    const response=await fetch(`${origin}/api/fixture-data?delay=150`);
    assert.equal(response.status,200);assert.ok(performance.now()-before>=140);
    assert.deepEqual(await response.json(),{id:'card-42',revision:1,title:'Motion lab workspace',status:'ready'});
  }finally{
    server.kill('SIGTERM');
    await new Promise<void>(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',()=>resolve())});
  }
});
