import type { FrameSample, TraceEvent } from '../types';

export interface FixtureTrace {
  start(): void;
  mark(type: string, label: string, detail?: TraceEvent['detail'], element?: Element): TraceEvent;
  nodeId(element: Element): string;
  events: TraceEvent[];
  samples: FrameSample[];
  finish(): void;
  startedAt: number | null;
  finalState: {cardId:string;revision:number;title:string;status:string} | null;
}

declare global { interface Window { __motionTrace: FixtureTrace; } }

export function installInstrumentation(): FixtureTrace {
  const mode = new URLSearchParams(location.search).get('mode') === 'fixed' ? 'fixed' : 'baseline';
  const events: TraceEvent[] = [];
  const samples: FrameSample[] = [];
  const nodes = new WeakMap<Element, string>();
  let nodeSequence = 0, animationSequence = 0, raf = 0;
  let startedAt: number | null = null;
  const time = () => startedAt === null ? -1 : Number((performance.now() - startedAt).toFixed(2));
  const nodeId = (element: Element) => {
    if (!nodes.has(element)) nodes.set(element, `${mode}-node-${++nodeSequence}`);
    return nodes.get(element)!;
  };
  const emit = (type: string, label: string, detail: TraceEvent['detail'] = {}, element?: Element, origin: TraceEvent['origin'] = 'app-annotated') => {
    const event: TraceEvent = {id:`${mode}-event-${events.length + 1}`,t:time(),type,label,origin,detail};
    if (element) event.nodeId = nodeId(element);
    if (typeof detail.requestId === 'string') event.requestId = detail.requestId;
    events.push(event);
    return event;
  };
  const originalAnimate = Element.prototype.animate;
  Element.prototype.animate = function(...args: Parameters<Element['animate']>) {
    const animation = originalAnimate.apply(this, args);
    if (!this.matches('[data-motion-card]')) return animation;
    const animationId = `${mode}-animation-${++animationSequence}`;
    const startEvent = emit('animation-start','Entrance animation starts',{durationMs:1400,animationTime:Number(animation.currentTime ?? 0)},this,'browser-observed');
    startEvent.animationId = animationId;
    const originalCancel = animation.cancel.bind(animation);
    animation.cancel = () => {
      const cancelEvent = emit('animation-cancel','Entrance animation canceled',{
        animationTime:Number(animation.currentTime ?? 0),playState:animation.playState,
        active:animation.playState === 'running' && Number(animation.currentTime ?? 0) < 1400
      },this,'browser-observed');
      cancelEvent.animationId = animationId;
      originalCancel();
    };
    animation.finished.then(() => {
      const finishEvent = emit('animation-finish','Entrance animation completes',{animationTime:Number(animation.currentTime ?? 0)},this,'browser-observed');
      finishEvent.animationId = animationId;
    }).catch(() => { /* Cancellation is captured synchronously above. */ });
    return animation;
  };
  const reportTree = (node: Node, type: 'dom-add'|'dom-remove') => {
    if (!(node instanceof Element)) return;
    const cards = [...(node.matches('[data-motion-card]') ? [node] : []), ...node.querySelectorAll('[data-motion-card]')];
    for (const card of cards) emit(type, type === 'dom-add' ? 'Card DOM node added' : 'Card DOM node removed',{
      cardId:card.getAttribute('data-card-id'),revision:Number(card.getAttribute('data-revision'))
    },card,'browser-observed');
  };
  new MutationObserver(records => {
    if (startedAt === null) return;
    for (const record of records) {
      record.removedNodes.forEach(node => reportTree(node,'dom-remove'));
      record.addedNodes.forEach(node => reportTree(node,'dom-add'));
    }
  }).observe(document.documentElement,{childList:true,subtree:true});

  const sample = () => {
    const element = document.querySelector<HTMLElement>('[data-motion-card]');
    if (element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const transform = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
      const animation = element.getAnimations()[0];
      samples.push({t:time(),nodeId:nodeId(element),x:rect.x,y:rect.y,width:rect.width,height:rect.height,
        opacity:Number(style.opacity),translateX:transform.m41,animationTime:animation ? Number(animation.currentTime ?? 0) : null});
    } else samples.push({t:time(),nodeId:null,x:null,y:null,width:null,height:null,opacity:null,translateX:null,animationTime:null});
    raf = requestAnimationFrame(sample);
  };
  const trace: FixtureTrace = {
    events,samples,startedAt,finalState:null,nodeId,
    mark:(type,label,detail,element)=>emit(type,label,detail,element),
    start:() => {
      cancelAnimationFrame(raf); events.length=0; samples.length=0;
      startedAt=performance.now(); trace.startedAt=startedAt;
      emit('input','Show card clicked',{control:'show-card'},undefined,'browser-observed');
      sample();
    },
    finish:()=>{cancelAnimationFrame(raf);emit('capture-complete','Observation window ends',{},undefined,'runner');}
  };
  document.addEventListener('click',event=>{
    const target=event.target;
    if(target instanceof Element && target.closest('#show-card')) {
      trace.start();
      events[0].detail.trusted=event.isTrusted;
    }
  },true);
  window.__motionTrace = trace;
  return trace;
}
