import {spawn} from 'node:child_process';
import {rename} from 'node:fs/promises';
import path from 'node:path';
import type {Page} from 'playwright';

type Size={width:number;height:number};
/** Opt-in native compositor recording for headed displays that scale CDP frames. */
export function recordingSurface(viewport:Size,headless:boolean):Size|undefined {
  const raw=process.env.MOTION_RECORDING_SURFACE;
  if(!raw)return undefined;
  if(headless)throw new Error('MOTION_RECORDING_SURFACE requires headed mode');
  const match=/^(\d{3,4})x(\d{3,4})$/.exec(raw);
  if(!match)throw new Error('MOTION_RECORDING_SURFACE must be WIDTHxHEIGHT');
  const width=Number(match[1]),height=Number(match[2]);
  if(width<viewport.width||height<viewport.height||width>2560||height>1600||width*height>4_096_000||width%2||height%2)throw new Error('Recording surface must cover the viewport with even dimensions, at most 2560x1600 and 4096000 pixels');
  return {width,height};
}

export async function prepareRecordingPage(page:Page,surface:Size|undefined) {
  if(!surface)return;
  const session=await page.context().newCDPSession(page);
  try {
    const window=await session.send('Browser.getWindowForTarget');
    await session.send('Browser.setWindowBounds',{windowId:window.windowId,bounds:{windowState:'maximized'}});
    const screen=await page.evaluate(()=>({width:globalThis.screen.width,height:globalThis.screen.height}));
    if(screen.width>surface.width||screen.height>surface.height)throw new Error('Native display exceeds the declared recording surface; run a full-viewport recorder calibration before capturing');
  }finally{await session.detach()}
}

/** Preserve native source, remove only compositor padding. No scaling or timing change. */
export async function finalizeRecording(source:string,directory:string,viewport:Size,surface:Size|undefined) {
  const video=path.join(directory,'video.webm');
  if(!surface){await rename(source,video);return {video};}
  const rawVideo=path.join(directory,'video-native.webm');await rename(source,rawVideo);
  await new Promise<void>((resolve,reject)=>{
    const child=spawn('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',rawVideo,'-vf',`crop=${viewport.width}:${viewport.height}:0:0`,'-an','-c:v','libvpx','-crf','8','-b:v','1M','-deadline','realtime','-cpu-used','8','-threads','1','-fps_mode','passthrough',video],{stdio:['ignore','ignore','pipe']});
    let error='';child.stderr.on('data',data=>{error=(error+data).slice(-1000)});
    const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('Native recording crop exceeded 30 seconds'));},30000);
    child.once('error',cause=>{clearTimeout(timer);reject(cause)});
    child.once('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(`Native recording crop failed (${code}): ${error}`))});
  });
  return {video,rawVideo,recordingTransform:{sourceSize:surface,crop:{x:0,y:0,...viewport},scale:1,timeScale:1}};
}
