import type {CaptureRecipe,MotionEvent,MotionSample} from './types';

export function installBrowserProbe(config:{selector:string;containment?:CaptureRecipe['contract'] extends infer _ ? {selector:string;shape?:'rect'|'circle';maxOverflowPx:number;minOpacity?:number} : never}) {
  const events:MotionEvent[]=[],samples:MotionSample[]=[];
  const ids=new WeakMap<Element,string>();let idSequence=0,animationSequence=0,startTime:number|null=null,raf=0;
  const now=()=>startTime===null?-1:Number((performance.now()-startTime).toFixed(3));
  const nodeId=(node:Element)=>{if(!ids.has(node))ids.set(node,`node-${++idSequence}`);return ids.get(node)!};
  const matches=(node:Element)=>{try{return node.matches(config.selector)}catch{return false}};
  const logicalId=(node:Element)=>node.getAttribute('data-motion-id') || node.id || config.selector;
  const emit=(type:string,label:string,origin:MotionEvent['origin'],detail:MotionEvent['detail']={},node?:Element,animationId?:string)=>{
    if(startTime===null)return;
    const event:MotionEvent={id:`event-${events.length+1}`,t:now(),type,label,origin,detail};
    if(node){event.nodeId=nodeId(node);event.logicalId=logicalId(node)}if(animationId)event.animationId=animationId;
    events.push(event);
  };
  const originalAnimate=Element.prototype.animate;
  Element.prototype.animate=function(...args:Parameters<Element['animate']>) {
    const animation=originalAnimate.apply(this,args);
    if(!matches(this))return animation;
    const animationId=`animation-${++animationSequence}`;
    const duration=Number(animation.effect?.getComputedTiming().activeDuration ?? 0);
    emit('animation-start','Web Animation started','browser-observed',{durationMs:duration},this,animationId);
    const originalCancel=animation.cancel.bind(animation);
    animation.cancel=()=>{
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
  for(const type of ['click','pointermove','keydown'])document.addEventListener(type,event=>{
    if(type==='pointermove' && events.at(-1)?.type==='pointermove' && now()-events.at(-1)!.t<25)return;
    const target=event.target;
    emit(type,type==='click'?'Click interaction':type==='keydown'?'Keyboard interaction':'Pointer moved','browser-observed',{
      trusted:event.isTrusted,...(event instanceof MouseEvent?{x:event.clientX,y:event.clientY}:{}),...(event instanceof KeyboardEvent?{key:event.key}:{})
    },target instanceof Element&&matches(target)?target:undefined);
  },true);
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
  const sample=(frameTime?:number)=>{
    const sampleTime=frameTime===undefined?now():Number((frameTime-startTime!).toFixed(3));
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
      samples.push({t:sampleTime,nodeId:nodeId(node),logicalId:logicalId(node),x:rect.x,y:rect.y,width:rect.width,height:rect.height,opacity:Number(style.opacity),translateX:matrix.m41,translateY:matrix.m42,scaleX:Math.hypot(matrix.a,matrix.b),scaleY:Math.hypot(matrix.c,matrix.d),rotationDeg:Math.atan2(matrix.b,matrix.a)*180/Math.PI,animationTime:animation?Number(animation.currentTime ?? 0):null,containmentOverflowPx:overflow,containerRect});
    }else samples.push({t:sampleTime,nodeId:null,logicalId:null,x:null,y:null,width:null,height:null,opacity:null,translateX:null,translateY:null,scaleX:null,scaleY:null,rotationDeg:null,animationTime:null,containmentOverflowPx:null,containerRect:null});
    raf=requestAnimationFrame(sample);
  };
  (window as unknown as {__motionProbe:unknown}).__motionProbe={
    events,samples,startTime,
    start:()=>{events.length=0;samples.length=0;startTime=performance.now();emit('capture-start','Capture window started','runner');sample()},
    stop:()=>{cancelAnimationFrame(raf);emit('capture-end','Capture window ended','runner')},
    mark:(type:string,label:string,detail:MotionEvent['detail'])=>emit(type,label,'runner',detail),
    time:now
  };
}
