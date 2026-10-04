import type {MotionActorSample} from './types';

export interface NativePixelFrame {
  /** Actual decoded presentation timestamp, relative to capture. Requested seek time is insufficient. */
  presentationTimeMs:number;
  /** Full image size in CSS pixels; required to avoid treating device pixels as CSS pixels. */
  cssSize:{width:number;height:number};
  width:number;height:number;rgba:Uint8Array|Uint8ClampedArray;
}
export interface ActorPixelMask {actorId:string;color:{r:number;g:number;b:number};tolerance:number;minPixels:number}
/** Separate diagnostic pass over decoded native images; never adds synchronous reads to a renderer. */
export function observeActorPixels(frames:NativePixelFrame[],mask:ActorPixelMask):MotionActorSample[]{
  if(!/^[\w.-]{1,80}$/.test(mask.actorId)||!Object.values(mask.color).every(value=>Number.isInteger(value)&&value>=0&&value<=255)||!Number.isFinite(mask.tolerance)||mask.tolerance<0||mask.tolerance>64||!Number.isInteger(mask.minPixels)||mask.minPixels<1)throw new Error('Invalid bounded diagnostic actor mask');
  if(frames.length>300)throw new Error('Diagnostic pixel tracking is bounded to 300 frames');
  return frames.map((frame,index)=>{
    if(!Number.isFinite(frame.presentationTimeMs)||frame.presentationTimeMs<0||index>0&&frame.presentationTimeMs<=frames[index-1].presentationTimeMs||!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<1||frame.height<1||frame.width*frame.height>8000000||frame.rgba.length!==frame.width*frame.height*4||!frame.cssSize||![frame.cssSize.width,frame.cssSize.height].every(value=>Number.isFinite(value)&&value>0&&value<=4000))throw new Error('Invalid decoded native frame or presentation clock');
    let minX=frame.width,minY=frame.height,maxX=-1,maxY=-1,count=0;
    for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
      const offset=(y*frame.width+x)*4;
      if(frame.rgba[offset+3]<200||Math.abs(frame.rgba[offset]-mask.color.r)>mask.tolerance||Math.abs(frame.rgba[offset+1]-mask.color.g)>mask.tolerance||Math.abs(frame.rgba[offset+2]-mask.color.b)>mask.tolerance)continue;
      count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    const visible=count>=mask.minPixels;
    return {actorId:mask.actorId,kind:'scene',origin:'recorded-pixels',t:frame.presentationTimeMs,observedAtMs:frame.presentationTimeMs,nodeId:mask.actorId,visible,screen:visible?{x:minX*frame.cssSize.width/frame.width,y:minY*frame.cssSize.height/frame.height,width:(maxX-minX+1)*frame.cssSize.width/frame.width,height:(maxY-minY+1)*frame.cssSize.height/frame.height}:null,transform:null};
  });
}

export function measurePixelActorContinuity(frames:NativePixelFrame[],mask:ActorPixelMask,contract:{maxStepAt60HzPx:number;inputPolicy:'retarget'|'direct-scrub'|'cut'}) {
  if(!Number.isFinite(contract.maxStepAt60HzPx)||contract.maxStepAt60HzPx<0)throw new Error('Pixel continuity requires an explicit nonnegative CSS-pixel budget');
  const samples=observeActorPixels(frames,mask),steps:{fromMs:number;toMs:number;px:number;normalized:number}[]=[];
  let adequate=samples.length>=20&&samples.every(sample=>sample.visible);
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i],dt=b.t-a.t;
    if(dt>80)adequate=false;
    if(!a.screen||!b.screen||dt<=0||dt>80)continue;
    const px=Math.hypot(b.screen.x-a.screen.x,b.screen.y-a.screen.y);
    steps.push({fromMs:a.t,toMs:b.t,px,normalized:px/dt*(1000/60)});
  }
  const peak=steps.reduce((a,b)=>b.normalized>a.normalized?b:a,{fromMs:0,toMs:0,px:0,normalized:0}),excluded=contract.inputPolicy==='direct-scrub'||contract.inputPolicy==='cut';
  return {version:'1' as const,evidence:'decoded-native-pixels' as const,status:excluded?'not-applicable' as const:!adequate?'unverified' as const:peak.normalized>contract.maxStepAt60HzPx?'failed' as const:'passed' as const,coverageSufficient:adequate,peak,samples,
    limitations:['A diagnostic color mask is only valid for the declared isolated actor fixture; it is not a general object-recognition or occlusion oracle.','Decoded presentation timestamps measure recording cadence, not physical display FPS.','This separate decoding run does not add per-frame pixel reads to the application performance path.','A passing supplied displacement budget does not certify aesthetic quality or human trackability.']};
}
