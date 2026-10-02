import { useEffect, useRef, useState } from 'react';
import './examples.css';
import KineticScene from './KineticScene';

type Scenario = 'kinetic' | 'drawer' | 'reveal' | 'cursor';
type Mode = 'baseline' | 'fixed';
const SCENARIOS: { id: Scenario; title: string; note: string }[] = [
  { id: 'kinetic', title: 'Redirect a courier', note: 'Anticipation. Flight. Redirect. Settle.' },
  { id: 'drawer', title: 'Interrupt a drawer', note: 'Open. Close. Change your mind.' },
  { id: 'reveal', title: 'Reveal live data', note: 'A response arrives in the middle of an entrance.' },
  { id: 'cursor', title: 'Follow the cursor', note: 'A little curiosity. A very quick reversal.' },
];
function mark(type: string, label: string, sourceKey: string, state: Record<string, string | number | boolean | null> = {}) {
  window.dispatchEvent(new CustomEvent('motion:mark', { detail: { type, label, sourceKey, state } }));
}
function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={diagonal ? 'M5 15 15 5M5 5h10v10' : 'M3 10h13m-5-5 5 5-5 5'} /></svg>; }
function LampArt({ small = false }: { small?: boolean }) {
  return <svg className={`lamp-art ${small ? 'small' : ''}`} viewBox="0 0 360 280" role="img" aria-label="Original sculptural loop lamp in warm porcelain"><defs><linearGradient id={`porcelain-${small}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f9f5e8"/><stop offset=".4" stopColor="#e8e0ca"/><stop offset="1" stopColor="#b9b19e"/></linearGradient><linearGradient id={`inner-${small}`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#938a76"/><stop offset="1" stopColor="#e0d7bd"/></linearGradient><filter id={`shadow-${small}`}><feGaussianBlur stdDeviation="9"/></filter></defs><ellipse cx="183" cy="247" rx="83" ry="10" fill="#655d4a" opacity=".17" filter={`url(#shadow-${small})`}/><path d="M122 232V108a58 58 0 0 1 116 0v124" fill="none" stroke={`url(#porcelain-${small})`} strokeWidth="38" strokeLinecap="round"/><path d="M132 226V111a48 48 0 0 1 96 0v115" fill="none" stroke={`url(#inner-${small})`} strokeWidth="5" opacity=".55"/><ellipse cx="180" cy="235" rx="78" ry="19" fill={`url(#porcelain-${small})`}/><ellipse cx="180" cy="229" rx="78" ry="16" fill="#ece4ce"/><path d="M107 229c30 14 116 14 146 0" fill="none" stroke="#d3cab3" strokeWidth="2"/><circle cx="239" cy="228" r="3" fill="#a39984"/><path d="M108 233c-26 18-57 8-68 14" fill="none" stroke="#b3aa95" strokeWidth="2" strokeLinecap="round"/><path d="M143 89c9-27 43-40 65-24" fill="none" stroke="#fffbed" strokeWidth="5" opacity=".8" strokeLinecap="round"/></svg>;
}
function Product({ onOpen, open = false }: { onOpen?: () => void; open?: boolean }) {
  return <article className="studio-product"><div className="product-art"><span className="object-label">OBJECT / 001</span><LampArt /><span className="art-caption">A softer kind of light</span></div><div className="product-copy"><div><span className="mini-eyebrow">THE EVENING COLLECTION</span><h3>Loop light</h3><p>Warm porcelain. A quiet glow.</p></div><button type="button" id="open-details" className="product-open" onClick={onOpen} aria-expanded={open} aria-controls="product-drawer">Take a closer look <Arrow /></button></div></article>;
}
function DrawerScene({ mode, resetKey }: { mode: Mode; resetKey: number }) {
  const drawer = useRef<HTMLElement>(null);
  const animation = useRef<Animation | null>(null);
  const [open, setOpen] = useState(false);
  const [settled, setSettled] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    setOpen(false); setSettled(false); animation.current?.cancel();
    if (drawer.current) { drawer.current.style.transform = 'translateX(110%)'; drawer.current.dataset.state = 'closed'; }
  }, [mode, resetKey]);
  const change = (next: boolean) => {
    const element = drawer.current!;
    const currentTransform = getComputedStyle(element).transform;
    const number = ++generation.current;
    animation.current?.cancel();
    if (!next && element.contains(document.activeElement)) document.getElementById('open-details')?.focus({ preventScroll: true });
    setOpen(next); setSettled(false); element.dataset.state = next ? 'open' : 'closed';
    mark('state-update', next ? 'Detail drawer opens' : 'Detail drawer reverses to close', 'drawer-continuity', { open: next, mode });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // SOURCE: drawer-continuity
    const from = mode === 'fixed' ? currentTransform : next ? 'translateX(110%)' : 'translateX(0%)';
    const to = next ? 'translateX(0%)' : 'translateX(110%)';
    const duration = mode === 'fixed' && reduced ? 0 : next ? 900 : 700;
    animation.current = element.animate([{ transform: from }, { transform: to }], { duration, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    animation.current.finished.then(() => {
      if (generation.current !== number) return;
      setSettled(true); mark('transition-settled', next ? 'Detail drawer is open' : 'Detail drawer is closed', 'drawer-continuity', { open: next, mode });
    }).catch(() => {});
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) change(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, mode]);
  return <div className="drawer-scene"><div className="scene-intro"><span className="scene-index">02 / A CHANGE OF MIND</span><h2>Nothing should<br/>{' '}jump ahead of you.</h2><p>Try opening, closing, and reopening<br/>{' '}before the drawer settles.</p><span className="scene-key">You control the interruption</span></div><div className="product-position"><Product onOpen={() => change(true)} open={open}/></div><aside id="product-drawer" ref={drawer} className={`product-drawer ${open ? 'is-open' : ''}`} data-motion-id="loop-details" data-state="closed" aria-label="Loop light details" aria-hidden={!open}><div className="drawer-top"><button type="button" id="close-details" aria-label="Close product details" className="drawer-close" onClick={() => change(false)} tabIndex={open ? 0 : -1}>×</button><span>THE DETAILS</span><span className="drawer-status">{settled ? 'Settled' : open ? 'Opening' : 'Closed'}</span></div><div id="drawer-content" className="drawer-content" role="region" aria-label="Product specifications" tabIndex={open ? 0 : -1}><div className="drawer-art"><LampArt small/></div><span className="mini-eyebrow">DESIGNED FOR SLOW EVENINGS</span><h3>Made to make<br/>{' '}room feel like home.</h3><p>A hand-finished ceramic loop, a warm dimmable glow, and just enough presence.</p><div className="material-list"><div><span>Finish</span><strong>Warm porcelain</strong></div><div><span>Light</span><strong>2,700 K · dimmable</strong></div><div><span>Size</span><strong>24 × 18 cm</strong></div></div><span className="drawer-bottom">Original illustration · interaction example</span></div></aside></div>;
}
function RevealScene({ mode, resetKey }: { mode: Mode; resetKey: number }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const card = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { abort.current?.abort(); setShow(false); setReady(false); setError(''); }, [mode, resetKey]);
  useEffect(() => {
    if (!show || !card.current) return;
    const reduce = mode === 'fixed' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.current.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0px)' }], { duration: reduce ? 0 : 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  }, [show, mode]);
  useEffect(() => {
    if (!ready || !content.current) return;
    const reduce = mode === 'fixed' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    content.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 0 : mode === 'fixed' ? 260 : 1, fill: 'both' });
  }, [ready, mode]);
  const load = async () => {
    if (show) return;
    setShow(true); setError('');
    const controller = new AbortController(); abort.current = controller;
    mark('request-start', 'Material details request starts', 'reveal-request', { endpoint: '/api/fixture-data', delayMs: 350 });
    try {
      // SOURCE: reveal-request
      const response = await fetch('/api/fixture-data?delay=350', { signal: controller.signal });
      if (!response.ok) throw new Error(`API response ${response.status}`);
      const data = await response.json() as { revision: number; status: string };
      mark('request-resolve', 'Live material details arrive during entrance', 'reveal-request', { revision: data.revision, status: data.status });
      mark('state-update', 'Material data replaces the loading layout', 'reveal-reserved-space', { ready: true, mode });
      setReady(true);
    } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
  };
  return <div className="reveal-scene"><div className="scene-intro"><span className="scene-index">03 / AN ANSWER ARRIVES</span><h2>Leave a little<br/>{' '}room for what’s next.</h2><p>Real API data comes back after 350 ms.<br/>{' '}The entrance is still in motion.</p><button id="load-materials" type="button" className="scene-button" onClick={() => void load()} disabled={show}>Reveal the materials <Arrow /></button>{error && <p role="alert">{error}</p>}</div><div className="reveal-position">{show ? <article id="reveal-card" ref={card} className={`reveal-card ${mode === 'fixed' ? 'reserved' : ''} ${ready ? 'ready' : ''}`} data-motion-id="materials" data-state={ready ? 'ready' : 'loading'}><div className="reveal-top"><span className="mini-eyebrow">A FEW GOOD MATERIALS</span><span className="response-dot">{ready ? 'Live response' : 'Loading'}</span></div>{ready ? <div ref={content} className="reveal-content"><div className="material-swatches"><i/><i/><i/></div><h3>Good things,<br/>{' '}thoughtfully chosen.</h3><p>Warm porcelain, a linen-covered cord, and a light you can turn down.</p><div className="material-list"><div><span>Body</span><strong>Glazed ceramic</strong></div><div><span>Cord</span><strong>Woven linen</strong></div><div><span>Packaging</span><strong>Recycled paper</strong></div></div><span className="reveal-signature">Considered, inside and out.</span></div> : <div className="reveal-skeleton" aria-label="Loading material details"><div className="skeleton-swatch"/><i/><i/><i/></div>}</article> : <div className="reveal-placeholder"><span className="placeholder-cross">+</span><span>Something good is on its way</span></div>}</div></div>;
}
function Buddy({ mode }: { mode: Mode }) {
  const body = useRef<HTMLDivElement>(null);
  const pupils = useRef<(HTMLSpanElement | null)[]>([]);
  const animations = useRef<(Animation | null)[]>([null, null]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!body.current) return;
      const box = body.current.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / 180));
      const dy = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / 180));
      body.current.style.setProperty('--lean-x', `${dx * 3}deg`);
      const reduce = mode === 'fixed' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      mark('pointer-target', 'The gaze changes direction', 'cursor-bounds', { gazeX: Math.round(dx * 100) / 100, gazeY: Math.round(dy * 100) / 100, mode });
      pupils.current.forEach((pupil, index) => {
        if (!pupil) return;
        const current = getComputedStyle(pupil).transform;
        animations.current[index]?.cancel();
        // SOURCE: cursor-bounds
        const target = `translate(${dx * 5}px, ${dy * 3}px)`;
        const frames = mode === 'fixed' ? [{ transform: current }, { transform: target }] : [{ transform: 'translate(0px,0px)' }, { transform: `translate(${dx * 20}px, ${dy * 12}px)`, offset: .34 }, { transform: target }];
        animations.current[index] = pupil.animate(frames, { duration: reduce ? 0 : mode === 'fixed' ? 180 : 460, easing: mode === 'fixed' ? 'cubic-bezier(.22,1,.36,1)' : 'ease-out', fill: 'both' });
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); animations.current.forEach(animation => animation?.cancel()); };
  }, [mode]);
  return <div ref={body} id="motion-buddy" className="motion-buddy" data-state="attentive" data-motion-id="studio-buddy"><svg className="buddy-shape" viewBox="0 0 260 250" aria-hidden="true"><defs><radialGradient id="pebble" cx=".3" cy=".2" r=".9"><stop stopColor="#ffd4ae"/><stop offset=".45" stopColor="#eda67e"/><stop offset="1" stopColor="#c7785c"/></radialGradient><filter id="pebble-shadow"><feGaussianBlur stdDeviation="9"/></filter></defs><ellipse cx="137" cy="225" rx="78" ry="9" fill="#976544" opacity=".16" filter="url(#pebble-shadow)"/><path d="M63 38C96 10 153 18 190 45c42 31 43 87 26 125-17 39-61 58-109 40-39-15-70-26-78-68-9-44 6-80 34-104Z" fill="url(#pebble)"/><path d="M52 87c10-33 42-56 68-55" fill="none" stroke="#ffe0c0" strokeWidth="5" opacity=".5" strokeLinecap="round"/><path d="M111 157q14 11 29-1" fill="none" stroke="#81482f" strokeWidth="3" strokeLinecap="round"/><ellipse cx="87" cy="143" rx="10" ry="5" fill="#dc8970" opacity=".45"/><ellipse cx="165" cy="144" rx="10" ry="5" fill="#dc8970" opacity=".45"/></svg><div id="buddy-eye" className="buddy-eye eye-left"><span id="buddy-pupil" className="buddy-pupil" ref={element => { pupils.current[0] = element; }} data-motion-id="left-pupil" data-state="attentive"/></div><div className="buddy-eye eye-right"><span className="buddy-pupil" ref={element => { pupils.current[1] = element; }}/></div></div>;
}
function CursorScene({ mode, resetKey }: { mode: Mode; resetKey: number }) {
  return <div className="cursor-scene"><div className="scene-intro"><span className="scene-index">04 / A LITTLE CURIOSITY</span><h2>Attention should<br/>{' '}stay in the room.</h2><p>Move your pointer. Reverse quickly.<br/>{' '}Watch the eyes, not just the end pose.</p><div className="gaze-controls"><button type="button" id="gaze-left">← Over here</button></div><span className="scene-key">Try a fast left → right → left</span></div><div className="buddy-position"><Buddy key={`${mode}-${resetKey}`} mode={mode}/><span className="buddy-caption">A very small studio assistant</span><span className="buddy-ground"/></div><button type="button" id="gaze-right" className="gaze-right-anchor">And here →</button></div>;
}

export default function Examples() {
  const params = new URLSearchParams(location.search);
  const initial = params.get('scenario');
  const [scenario, setScenario] = useState<Scenario>(initial === 'drawer' || initial === 'reveal' || initial === 'cursor' ? initial : 'kinetic');
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'baseline' ? 'baseline' : 'fixed');
  const [resetKey, setResetKey] = useState(0);
  const [running, setRunning] = useState(false);
  const runGeneration = useRef(0);
  useEffect(() => { const url = new URL(location.href); url.searchParams.set('scenario', scenario); url.searchParams.set('mode', mode); history.replaceState(null, '', url); setResetKey(key => key + 1); ++runGeneration.current; setRunning(false); }, [scenario, mode]);
  const demo = async () => {
    if (running) return;
    const token = ++runGeneration.current; setRunning(true); setResetKey(key => key + 1);
    const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    await wait(60);
    const click = (id: string) => { if (token === runGeneration.current) document.getElementById(id)?.click(); };
    if (scenario === 'kinetic') { click('courier-replay'); await wait(4300); }
    if (scenario === 'drawer') { click('open-details'); await wait(180); click('close-details'); await wait(110); click('open-details'); await wait(1050); }
    if (scenario === 'reveal') { click('load-materials'); await wait(1300); }
    if (scenario === 'cursor') { for (const id of ['gaze-left', 'gaze-right', 'gaze-left']) { const rect = document.getElementById(id)?.getBoundingClientRect(); if (rect && token === runGeneration.current) window.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })); await wait(100); } await wait(600); }
    if (token === runGeneration.current) setRunning(false);
  };
  return <div className="showcase"><header className="showcase-header"><a className="showcase-brand" href="/examples" aria-label="Motion debugger examples"><span className="brand-eyes"><i/><i/></span>motion<span className="brand-slash">/</span>debugger</a><div className="showcase-nav"><span>LOCAL TOOLS FOR CODING AGENTS</span><a href="/evidence-v1">Evidence viewer <Arrow diagonal/></a></div></header><main className="showcase-main"><section className="showcase-hero"><div><span className="showcase-eyebrow">A MOTION DEBUGGER. NOT ANOTHER SCREENSHOT.</span><h1>Good motion lives<br/>{' '}between the frames.</h1></div><div className="hero-aside"><span className="hero-rule"/><p>Original interaction examples for a<br/>{' '}local recorder, library, and MCP tool.</p><span>Feel the defect. Then inspect the sequence.</span></div></section><div className="example-toolbar"><div className="example-tabs" role="tablist" aria-label="Motion examples">{SCENARIOS.map((item, index) => <button type="button" role="tab" id={`tab-${item.id}`} aria-selected={scenario === item.id} aria-controls="example-stage" tabIndex={scenario === item.id ? 0 : -1} onClick={() => setScenario(item.id)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = SCENARIOS[(index + (event.key === 'ArrowRight' ? 1 : SCENARIOS.length - 1)) % SCENARIOS.length]; setScenario(next.id); document.getElementById(`tab-${next.id}`)?.focus(); } }} key={item.id}><span>0{index + 1}</span>{item.title}</button>)}</div><div className="mode-control" aria-label="Example source branch" style={scenario === 'kinetic' ? { display: 'none' } : undefined}><button type="button" aria-pressed={mode === 'baseline'} onClick={() => setMode('baseline')}><i className="mode-dot baseline"/>Seeded defect</button><button type="button" aria-pressed={mode === 'fixed'} onClick={() => setMode('fixed')}><i className="mode-dot fixed"/>Example repair</button></div></div><section id="example-stage" role="tabpanel" aria-labelledby={`tab-${scenario}`} className="example-stage"><div className="stage-topbar"><span className="stage-window"><i/><i/><i/></span><span>THE QUIET STUDIO</span><span className="stage-branch">{scenario === 'kinetic' ? 'Live side-by-side · original rig' : mode === 'fixed' ? 'Continuity branch' : 'Seeded regression branch'}</span></div><div className={`stage-surface scenario-${scenario}`}>{scenario === 'kinetic' ? <KineticScene resetKey={resetKey} mode={mode}/> : scenario === 'drawer' ? <DrawerScene mode={mode} resetKey={resetKey}/> : scenario === 'reveal' ? <RevealScene mode={mode} resetKey={resetKey}/> : <CursorScene mode={mode} resetKey={resetKey}/>}</div><div className="stage-footer"><span>{SCENARIOS.find(item => item.id === scenario)?.note}</span><div><button type="button" className="reset-demo" onClick={() => { ++runGeneration.current; setRunning(false); setResetKey(key => key + 1); }}>Reset</button><button type="button" className="run-demo" onClick={() => void demo()} disabled={running}>{running ? 'Playing the sequence…' : 'Play the sequence'}<Arrow/></button></div></div></section><section className="agent-note" aria-label="Coding agent integration"><div className="agent-note-icon">⌘</div><div><h2>The example is the surface. Your agent is the workflow.</h2><p>Capture a real local interaction, read the temporal evidence, patch your source, then compare the same sequence.</p></div><span className="agent-note-tag">CLI · LIBRARY · MCP</span></section><footer className="showcase-footer"><span>Original procedural artwork · intentionally seeded examples · handwritten repair branches</span><span>These examples demonstrate motion contracts. They are not claims of an autonomous AI repair.</span></footer></main></div>;
}
