import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { installInstrumentation } from './instrumentation';
import './fixture.css';

const trace = installInstrumentation();
const CARD_ID = 'card-42';
interface CardData { id:string; revision:number; title:string; status:string }
const INITIAL_CARD: CardData = {id:CARD_ID,revision:0,title:'Preparing your workspace',status:'loading'};

function AnimatedCard({ card }: { card: CardData }) {
  const ref = useRef<HTMLElement>(null);
  // SOURCE: mount-only-entrance
  useLayoutEffect(() => {
    const node = ref.current!;
    trace.mark('react-mount','AnimatedCard mounted',{cardId:card.id,revision:card.revision,sourceKey:'mount-only-entrance'},node);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = node.animate([
      {transform:'translateX(-240px)',opacity:0.1},
      {transform:'translateX(0px)',opacity:1}
    ],{duration:reduced ? 0 : 1400,easing:'linear',fill:'both'});
    // SOURCE: cancel-on-unmount
    return () => {
      trace.mark('react-unmount','AnimatedCard unmounted',{cardId:card.id,revision:card.revision,sourceKey:'cancel-on-unmount'},node);
      animation.cancel();
    };
  }, []);
  return <article className="fixture-card" ref={ref} data-motion-card data-card-id={card.id} data-revision={card.revision}>
    <span className="fixture-card-label">Workspace / 042</span>
    <div className="fixture-card-mark" aria-hidden="true">M</div>
    <h2>{card.title}</h2>
    <p>{card.status === 'ready' ? 'Your project is ready. Pick up where you left off.' : 'Retrieving the latest project details…'}</p>
    <div className="fixture-card-footer"><span className={`fixture-status ${card.status}`}>{card.status === 'ready' ? 'Ready to open' : 'Waiting for API'}</span><span>Revision {card.revision}</span></div>
  </article>;
}

export function Fixture() {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'fixed' ? 'fixed' : 'baseline';
  const delayValue = Number(params.get('delay') ?? 350);
  const delay = Number.isInteger(delayValue) && delayValue >= 150 && delayValue <= 800 ? delayValue : 350;
  const [card,setCard] = useState<CardData>(INITIAL_CARD);
  const [visible,setVisible] = useState(false);
  const [error,setError] = useState('');
  const pending = useRef(false);
  useEffect(()=>{
    trace.finalState={cardId:card.id,revision:card.revision,title:card.title,status:card.status};
  },[card]);
  async function showCard() {
    if (pending.current || visible) return;
    pending.current=true;
    setVisible(true);
    const requestId = 'workspace-request-1';
    trace.mark('request-start','GET /api/fixture-data started',{requestId,delayMs:delay,sourceKey:'request-state'});
    try {
      const response = await fetch(`/api/fixture-data?delay=${delay}`,{headers:{'X-Motion-Request':requestId}});
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const next:CardData = await response.json();
      trace.mark('request-resolve','Workspace response received',{requestId,revision:next.revision,sourceKey:'request-state'});
      // SOURCE: request-state
      trace.mark('state-update','Response commits revision 0 → 1',{requestId,revisionBefore:0,revisionAfter:next.revision,cardId:next.id,sourceKey:'request-state'});
      setCard(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      trace.mark('request-error','Request failed',{requestId,error:String(e)});
    } finally { pending.current=false; }
  }
  // SOURCE: render-key
  const identityKey = mode === 'fixed' ? card.id : card.revision;
  return <main className="fixture-page">
    <header className="fixture-header"><span>Motion Debugger / Controlled fixture</span><span className="fixture-mode">{mode === 'fixed' ? 'Stable identity · patched' : 'Revision identity · baseline'}</span></header>
    <section className="fixture-content">
      <div className="fixture-intro"><span className="fixture-eyebrow">01 / Async entrance</span><h1>One card. One request.<br/>One interrupted entrance.</h1><p>The API replies after {delay}ms. The card enters over 1,400ms.</p><button id="show-card" onClick={showCard} disabled={visible}>Show workspace card</button>{error && <p role="alert">{error}</p>}</div>
      <div className="fixture-stage" aria-live="polite"><div className="fixture-stage-grid" aria-hidden="true"/>{visible ? <AnimatedCard key={identityKey} card={card}/> : <div className="fixture-placeholder">The entrance starts on click</div>}<span className="fixture-stage-caption">Logical card: card-42 / data revision: {card.revision}</span></div>
    </section>
    <footer className="fixture-footer"><span>Instrumented React fixture · real localhost API · linear Web Animations</span><span>Not a general-purpose root-cause analyzer</span></footer>
  </main>;
}
