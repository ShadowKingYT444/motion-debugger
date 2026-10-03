import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingSurface} from '../../server/recording';
test('native compositor surface is bounded and explicitly headed',()=>{
  const prior=process.env.MOTION_RECORDING_SURFACE;
  const viewport={width:1280,height:800};
  try{
    delete process.env.MOTION_RECORDING_SURFACE;
    assert.equal(recordingSurface(viewport,false),undefined);
    process.env.MOTION_RECORDING_SURFACE='1920x1080';
    assert.deepEqual(recordingSurface(viewport,false),{width:1920,height:1080});
    assert.throws(()=>recordingSurface(viewport,true),/requires headed/);
    for(const value of ['1280x700','1921x1080','9999x9999','1920x1080;echo bad']){
      process.env.MOTION_RECORDING_SURFACE=value;
      assert.throws(()=>recordingSurface(viewport,false));
    }
  }finally{if(prior===undefined)delete process.env.MOTION_RECORDING_SURFACE;else process.env.MOTION_RECORDING_SURFACE=prior;}
});
