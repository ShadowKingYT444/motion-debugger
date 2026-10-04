import type {CaptureRecipe,MotionEvent,MotionSample,MotionActorSample,MotionPerformanceDiagnostics,MotionSceneActorSnapshot} from './types';

export function installBrowserProbe(config:{selector:string;actors?:CaptureRecipe['actors'];containment?:CaptureRecipe['contract'] extends infer _ ? {selector:string;shape?:'rect'|'circle';maxOverflowPx:number;minOpacity?:number} : never}) {
  const events:MotionEvent[]=[],samples:MotionSample[]=[],actorSamples:MotionActorSample[]=[];
  const actors=config.actors??[],domActors=actors.filter(actor=>actor.kind!=='scene'),sceneIds=new Set(actors.filter(actor=>actor.kind==='scene').map(actor=>actor.id));
  if(domActors.length>8||sceneIds.size>16||new Set(actors.map(actor=>actor.id)).size!==actors.length)throw new Error('Actor bindings require unique IDs, at most 8 DOM/SVG and 16 scene actors');
  const performanceDiagnostics:MotionPerformanceDiagnostics={actorObservation:{maxScenePublishMs:0,retainedBytes:0,retainedSamples:0,truncated:false,maxReadMs:0},longAnimationFrames:{status:'unsupported',thresholdMs:50,excludesPresentationTime:true}};
  // Copies are bounded; excess observations remain visibly incomplete rather than silently wrapping.
  let actorOverflow=false,actorBytes=0;
  const appendActor=(sample:MotionActorSample)=>{const serialized=JSON.stringify(sample,null,2),bytes=serialized.length+serialized.split('\n').length*4+1;if(actorSamples.length<12000&&actorBytes+bytes<=2500000){actorSamples.push(sample);actorBytes+=bytes;performanceDiagnostics.actorObservation!.retainedBytes=actorBytes;performanceDiagnostics.actorObservation!.retainedSamples=actorSamples.length}else if(!actorOverflow){actorOverflow=true;performanceDiagnostics.actorObservation!.truncated=true;emit('actor-buffer-overflow','Actor observation buffer exhausted','browser-observed')}};
  const ids=new WeakMap<Element,string>();let idSequence=0,animationSequence=0,startTime:number|null=null,raf=0,generation=0,running=false,maxReadMs=0,superseded=0;
  const now=()=>startTime===null?-1:Number((performance.now()-startTime).toFixed(3));
  const nodeId=(node:Element)=>{if(!ids.has(node))ids.set(node,`node-${++idSequence}`);return ids.get(node)!};
  const matches=(node:Element)=>{try{return node.matches(config.selector)||domActors.some(actor=>'selector' in actor&&node.matches(actor.selector))}catch{return false}};
  const logicalId=(node:Element)=>node.getAttribute('data-motion-id') || node.id || domActors.find(actor=>'selector' in actor&&node.matches(actor.selector))?.id || config.selector;
  const emit=(type:string,label:string,origin:MotionEvent['origin'],detail:MotionEvent['detail']={},node?:Element,animationId?:string)=>{
    if(startTime===null)return;
    const event:MotionEvent={id:`event-${events.length+1}`,t:now(),type,label,origin,detail};
    if(node){event.nodeId=nodeId(node);event.logicalId=logicalId(node);const actor=domActors.find(binding=>'selector' in binding&&node.matches(binding.selector));if(actor){event.detail={...detail,actorId:actor.id,...(!node.matches(config.selector)?{actorOnly:true}:{})}}}if(animationId)event.animationId=animationId;
    events.push(event);
  };
  // A rAF interval can hide a reset between cancel() and animate(). Observe the
  // net geometry change of that operation batch separately, after microtasks.
  // Do not put these reads in the rAF trajectory or inflate its cadence evidence.
  const boundarySnapshot=(node:Element)=>{
    if(!node.isConnected)return null;
    const rect=node.getBoundingClientRect(),style=getComputedStyle(node),opacity=Number(style.opacity);
    if(!rect.width||!rect.height||style.visibility==='hidden'||style.display==='none'||opacity<=.01)return null;
    return {t:now(),x:rect.x,y:rect.y,opacity};
  };
  type Boundary={before:NonNullable<ReturnType<typeof boundarySnapshot>>;timer:number};
  const boundaries=new Map<Element,Boundary>();
  const finishBoundary=(node:Element,batch:Boundary)=>{
    if(boundaries.get(node)!==batch)return;
    boundaries.delete(node);clearTimeout(batch.timer);
    if(!running)return;
    const after=boundarySnapshot(node);if(!after)return;
    emit('animation-boundary','Geometry across an animation operation batch','browser-observed',{
      fromMs:batch.before.t,toMs:after.t,fromX:batch.before.x,fromY:batch.before.y,
      toX:after.x,toY:after.y,fromOpacity:batch.before.opacity,toOpacity:after.opacity
    },node);
  };
  const beginBoundary=(node:Element)=>{
    if(!running||boundaries.has(node))return;
    const before=boundarySnapshot(node);if(!before)return;
    const batch:Boundary={before,timer:0};boundaries.set(node,batch);
    // One timer coalesces cancel + replacement animate + their microtasks. An
    // intermediate canceled style that is restored in the same batch is not a jump.
    batch.timer=window.setTimeout(()=>finishBoundary(node,batch),0);
  };
  const originalAnimate=Element.prototype.animate;
  Element.prototype.animate=function(...args:Parameters<Element['animate']>) {
    const targetMatches=matches(this);if(targetMatches)beginBoundary(this);
    const animation=originalAnimate.apply(this,args);
    if(!targetMatches)return animation;
    const animationId=`animation-${++animationSequence}`;
    const duration=Number(animation.effect?.getComputedTiming().activeDuration ?? 0);
    emit('animation-start','Web Animation started','browser-observed',{durationMs:duration},this,animationId);
    const originalCancel=animation.cancel.bind(animation);
    animation.cancel=()=>{
      beginBoundary(this);
      const currentTime=Number(animation.currentTime ?? 0);
      emit('animation-cancel','Web Animation canceled','browser-observed',{currentTime,durationMs:duration,active:animation.playState==='running'&&currentTime<duration},this,animationId);
      originalCancel();
    };
    animation.finished.then(()=>emit('animation-finish','Web Animation finished','browser-observed',{currentTime:Number(animation.currentTime ?? 0)},this,animationId)).catch(()=>{});
    return animation;
  };
  for(const type of ['animationstart','animationcancel','animationend','transitionstart','transitioncancel','transitionend'])document.addEventListener(type,event=>{
    const target=event.target;if(target instanceof Element&&matches(target))emit(type,type,'browser-observed',{},target);
  },true);
  new MutationObserver(records=>{
    for(const record of records)for(const [nodes,type] of [[record.removedNodes,'dom-remove'],[record.addedNodes,'dom-add']] as const)nodes.forEach(node=>{
      if(!(node instanceof Element))return;
      const targets=[...(matches(node)?[node]:[]),...node.querySelectorAll(config.selector)];
      for(const target of targets)emit(type,type==='dom-add'?'Target node added':'Target node removed','browser-observed',{},target);
    });
  }).observe(document,{childList:true,subtree:true});
  for(const type of ['click','pointermove','pointerdown','pointerup','pointercancel','keydown','wheel'])document.addEventListener(type,event=>{
    if(type==='pointermove' && events.at(-1)?.type==='pointermove' && now()-events.at(-1)!.t<25)return;
    const target=event.target;
    emit(type,type==='click'?'Click interaction':type==='keydown'?'Keyboard interaction':type==='wheel'?'Scroll interaction':'Pointer moved','browser-observed',{
      trusted:event.isTrusted,...(target instanceof Element?{selector:target.id?`#${target.id}`:target.tagName.toLowerCase()}:{}),...(event instanceof MouseEvent?{x:event.clientX,y:event.clientY}:{}),...(event instanceof KeyboardEvent?{key:event.key}:{}),...(event instanceof WheelEvent?{deltaX:event.deltaX,deltaY:event.deltaY,deltaMode:event.deltaMode}:{})
    },target instanceof Element&&matches(target)?target:undefined);
  },true);
  window.addEventListener('resize',()=>emit('resize','Viewport changed','browser-observed',{width:innerWidth,height:innerHeight}));
  if(typeof matchMedia==='function')matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>emit('reduced-motion','Reduced-motion preference changed','browser-observed',{reduced:event.matches}));
  window.addEventListener('motion:mark',event=>{
    const detail=(event as CustomEvent).detail;if(!detail||typeof detail!=='object')return;
    const data:MotionEvent['detail']={};
    if(typeof detail.sourceKey==='string')data.sourceKey=detail.sourceKey.slice(0,80);
    if(detail.state&&typeof detail.state==='object')for(const [key,value] of Object.entries(detail.state).slice(0,20))if(!/secret|token|password|authorization|cookie/i.test(key)&&['string','number','boolean'].includes(typeof value))data[key]=typeof value==='string'?value.slice(0,200):value as number|boolean;
    emit(String(detail.type||'app-mark').slice(0,80),String(detail.label||'Application mark').slice(0,200),'app-annotated',data);
  });
  try {new PerformanceObserver(list=>{
    for(const entry of list.getEntries()){
      const resource=entry as PerformanceResourceTiming;if(startTime===null||resource.startTime<startTime)continue;
      const url=new URL(resource.name);emit('network-resource','Resource request completed','browser-observed',{path:url.pathname,initiatorType:resource.initiatorType,startMs:Number((resource.startTime-startTime).toFixed(3)),responseEndMs:Number((resource.responseEnd-startTime).toFixed(3))});
    }
  }).observe({type:'resource',buffered:true})}catch{}
  try {new PerformanceObserver(list=>{
    for(const entry of list.getEntries())if(startTime!==null&&entry.startTime>=startTime)emit('long-task','Browser main-thread long task','browser-observed',{startMs:Number((entry.startTime-startTime).toFixed(3)),durationMs:Number(entry.duration.toFixed(3))});
  }).observe({type:'longtask',buffered:false})}catch{}
  try {
    if(PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')){
      const observer=new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          if(startTime===null||entry.startTime<startTime)continue;
          const loaf=entry as PerformanceEntry & {blockingDuration?:number;renderStart?:number;styleAndLayoutStart?:number;scripts?:{sourceURL?:string;sourceFunctionName?:string;duration?:number}[]};
          const detail:MotionEvent['detail']={startMs:Number((entry.startTime-startTime).toFixed(3)),durationMs:Number(entry.duration.toFixed(3))};
          for(const key of ['blockingDuration','renderStart','styleAndLayoutStart'] as const)if(typeof loaf[key]==='number'&&Number.isFinite(loaf[key]))detail[key]=key==='blockingDuration'?loaf[key]!:Number((loaf[key]!-startTime).toFixed(3));
          for(const [i,script] of (loaf.scripts??[]).slice(0,4).entries()){
            try{if(script.sourceURL)detail[`script${i}Path`]=new URL(script.sourceURL,location.href).pathname.slice(0,200)}catch{}
            if(typeof script.duration==='number')detail[`script${i}DurationMs`]=Number(script.duration.toFixed(3));
            if(typeof script.sourceFunctionName==='string')detail[`script${i}Function`]=script.sourceFunctionName.slice(0,100);
          }
          emit('long-animation-frame','Browser rendering update over 50ms; excludes presentation time','browser-observed',detail);
        }
      });
      observer.observe({type:'long-animation-frame',buffered:false});
      performanceDiagnostics.longAnimationFrames.status='supported';
    }
  }catch{performanceDiagnostics.longAnimationFrames.status='observer-error'}
  const numericArray=(value:unknown,length:number)=>Array.isArray(value)&&value.length===length&&value.every(n=>typeof n==='number'&&Number.isFinite(n))?value.slice() as number[]:null;
  const point=(value:unknown)=>{const p=value as {x?:unknown;y?:unknown;z?:unknown}|null;return p&&[p.x,p.y,p.z].every(n=>typeof n==='number'&&Number.isFinite(n))?{x:p.x as number,y:p.y as number,z:p.z as number}:undefined};
  (window as unknown as {__motionActors:unknown}).__motionActors={
    /** Call once after renderer.render(), using the same consumer clock; never installs a rAF. */
    publish:(batch:MotionSceneActorSnapshot[],renderTimestampMs=performance.now())=>{
      const publishStart=performance.now();
      if(!running||!Array.isArray(batch)||batch.length>16||!Number.isFinite(renderTimestampMs)||renderTimestampMs<startTime!||renderTimestampMs>performance.now()+1)return false;
      const seen=new Set<string>(),pending:MotionActorSample[]=[];
      for(const item of batch){
        if(!item||typeof item.actorId!=='string'||item.actorId.length>80||seen.has(item.actorId))return false;
        seen.add(item.actorId);
        // An app can publish its bounded scene while a recipe opts into a subset.
        // Unknown IDs are ignored, never promoted into evidence for a configured actor.
        if(!sceneIds.has(item.actorId))continue;
        if(typeof item.visible!=='boolean')return false;
        const transform=numericArray(item.transform,16),cameraWorldMatrix=numericArray(item.cameraWorldMatrix,16),cameraProjectionMatrix=numericArray(item.cameraProjectionMatrix,16),rect=item.screen;
        if(!transform||!cameraWorldMatrix||!cameraProjectionMatrix||rect!==null&&(!rect||![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)||rect.width<0||rect.height<0))return false;
        pending.push({actorId:item.actorId,kind:'scene',origin:'app-reported',t:Number((renderTimestampMs-startTime!).toFixed(3)),observedAtMs:now(),renderTimeMs:Number((renderTimestampMs-startTime!).toFixed(3)),nodeId:null,visible:item.visible,screen:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,transform,worldPosition:point(item.worldPosition),orientationRadians:point(item.orientationRadians),cameraWorldMatrix,cameraProjectionMatrix});
      }
      for(const sample of pending)appendActor(sample);
      performanceDiagnostics.actorObservation!.maxScenePublishMs=Math.max(performanceDiagnostics.actorObservation!.maxScenePublishMs,performance.now()-publishStart);
      return true;
    }
  };
  const observe=(frameTime:number)=>{
    const readStart=performance.now();
    const sampleTime=Number(Math.max(0,frameTime-startTime!).toFixed(3));
    const observedAtMs=now();
    const node=document.querySelector(config.selector);
    if(node){
      const rect=node.getBoundingClientRect(),style=getComputedStyle(node),matrix=style.transform==='none'?new DOMMatrix():new DOMMatrix(style.transform);
      const container=config.containment?document.querySelector(config.containment.selector):null;
      let containerRect:MotionSample['containerRect']=null,overflow:number|null=null;
      if(container){
        const c=container.getBoundingClientRect();containerRect={x:c.x,y:c.y,width:c.width,height:c.height};
        overflow=config.containment?.shape==='circle'?Math.max(0,Math.hypot(rect.x+rect.width/2-c.x-c.width/2,rect.y+rect.height/2-c.y-c.height/2)+Math.max(rect.width,rect.height)/2-Math.min(c.width,c.height)/2):Math.max(0,c.left-rect.left,c.top-rect.top,rect.right-c.right,rect.bottom-c.bottom);
      }
      const animation=node.getAnimations()[0];
      const hidden=rect.width<=0||rect.height<=0||style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)<=.01;
      samples.push({t:sampleTime,observedAtMs,geometryTimeMs:observedAtMs,targetState:hidden?'hidden':'visible',nodeId:nodeId(node),logicalId:logicalId(node),x:rect.x,y:rect.y,width:rect.width,height:rect.height,opacity:Number(style.opacity),translateX:matrix.m41,translateY:matrix.m42,scaleX:Math.hypot(matrix.a,matrix.b),scaleY:Math.hypot(matrix.c,matrix.d),rotationDeg:Math.atan2(matrix.b,matrix.a)*180/Math.PI,animationTime:animation?Number(animation.currentTime ?? 0):null,containmentOverflowPx:overflow,containerRect});
    }else samples.push({t:sampleTime,observedAtMs,geometryTimeMs:observedAtMs,targetState:'absent',nodeId:null,logicalId:null,x:null,y:null,width:null,height:null,opacity:null,translateX:null,translateY:null,scaleX:null,scaleY:null,rotationDeg:null,animationTime:null,containmentOverflowPx:null,containerRect:null});
    for(const actor of domActors){
      if(!('selector' in actor))continue;
      const matches=document.querySelectorAll(actor.selector),element=matches.length===1?matches[0]:null;
      if(!element){appendActor({actorId:actor.id,kind:actor.kind,origin:'browser-observed',t:sampleTime,observedAtMs:now(),nodeId:null,visible:false,screen:null,transform:null});continue;}
      const rect=element.getBoundingClientRect(),style=getComputedStyle(element),matrix=style.transform==='none'?new DOMMatrix():new DOMMatrix(style.transform);
      appendActor({actorId:actor.id,kind:actor.kind,origin:'browser-observed',t:sampleTime,observedAtMs:now(),nodeId:nodeId(element),visible:rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>.01,screen:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},transform:Array.from(matrix.toFloat64Array())});
    }
    maxReadMs=Math.max(maxReadMs,performance.now()-readStart);performanceDiagnostics.actorObservation!.maxReadMs=maxReadMs;
  };
  // MessageChannel avoids the nested-timer clamp while still observing after
  // the app's callbacks for this rAF. Never read an older frame after a newer
  // rAF: count the discarded task instead of inventing geometry for it.
  const channel=new MessageChannel();
  channel.port1.onmessage=event=>{
    if(!running)return;
    if(event.data.generation!==generation){superseded++;return;}
    observe(event.data.frameTime);
  };
  const sample=(frameTime:number)=>{
    if(!running)return;
    channel.port2.postMessage({generation:++generation,frameTime});
    raf=requestAnimationFrame(sample);
  };
  (window as unknown as {__motionProbe:unknown}).__motionProbe={
    events,samples,actorSamples,performanceDiagnostics,startTime,
    start:()=>{for(const batch of boundaries.values())clearTimeout(batch.timer);boundaries.clear();events.length=0;samples.length=0;actorSamples.length=0;actorOverflow=false;actorBytes=0;performanceDiagnostics.actorObservation={maxScenePublishMs:0,retainedBytes:0,retainedSamples:0,truncated:false,maxReadMs:0};maxReadMs=0;superseded=0;startTime=performance.now();running=true;emit('capture-start','Capture window started','runner');raf=requestAnimationFrame(sample)},
    stop:()=>{for(const [node,batch] of boundaries)finishBoundary(node,batch);running=false;generation++;cancelAnimationFrame(raf);emit('probe-cost','Geometry read cost and superseded post-rAF tasks','browser-observed',{maxReadMs:Number(maxReadMs.toFixed(3)),supersededTasks:superseded});emit('capture-end','Capture window ended','runner')},
    mark:(type:string,label:string,detail:MotionEvent['detail'])=>emit(type,label,'runner',detail),
    time:now
  };
}
