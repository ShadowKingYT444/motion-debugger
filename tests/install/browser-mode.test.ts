import test from 'node:test';
import assert from 'node:assert/strict';
import {chromiumOptions} from '../../server/browser';
test('visible local capture is explicit and cannot inject browser flags',()=>{
 const prior=process.env.MOTION_BROWSER_MODE;
 try {
  delete process.env.MOTION_BROWSER_MODE;
  const defaultOptions=chromiumOptions();assert.equal(defaultOptions.headless,true);
  process.env.MOTION_BROWSER_MODE='headed';
  const visibleOptions=chromiumOptions();assert.equal(visibleOptions.headless,false);
  assert.deepEqual(visibleOptions.args,defaultOptions.args);
  assert.equal(visibleOptions.executablePath,defaultOptions.executablePath);
  process.env.MOTION_BROWSER_MODE='--disable-web-security';
  assert.throws(()=>chromiumOptions(),/must be headless or headed/);
 }finally {if(prior===undefined)delete process.env.MOTION_BROWSER_MODE;else process.env.MOTION_BROWSER_MODE=prior;}
});
