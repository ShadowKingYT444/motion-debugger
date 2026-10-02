import { useEffect, useRef, useState } from 'react';
import './kinetic.css';

type Pose = { x: number; y: number; vx: number; vy: number; tilt: number; antenna: number; antennaV: number };
const home = (): Pose => ({ x: 74, y: 166, vx: 0, vy: 0, tilt: 0, antenna: 0, antennaV: 0 });
const CYCLE_MS = 6800;
const FIXED_STEP = 1 / 120;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
function motionMark(type: string, label: string, state: Record<string, string | number | boolean>) {
  window.dispatchEvent(new CustomEvent('motion:mark', { detail: { type, label, sourceKey: 'courier-continuity', state } }));
}

function CourierLane({ variant, selected, refs }: { variant: 'baseline' | 'fixed'; selected: boolean; refs: React.MutableRefObject<Record<string, SVGElement | null>> }) {
  const bind = (key: string) => (node: SVGElement | null) => { refs.current[`${variant}-${key}`] = node; };
  return <article className={`courier-lane ${variant}`} aria-label={`${variant === 'baseline' ? 'Seeded defect' : 'Handcrafted repair'} courier animation`}>
    <div className="courier-lane-label"><span><i/>{variant === 'baseline' ? 'Seeded defect' : 'Handcrafted repair'}</span><span>{variant === 'baseline' ? 'Pose resets on redirect' : 'Position + velocity preserved'}</span></div>
    <svg className="courier-plane" viewBox="0 0 460 270" role="img" aria-label="An original apricot courier carrying a note between two mail trays">
      <defs><linearGradient id={`courier-clay-${variant}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fbc2a2"/><stop offset="1" stopColor="#d48764"/></linearGradient></defs>
      <path d="M48 214H412" stroke="#d9d3c5" strokeWidth="1"/>
      <path d="M76 164C142 53 254 42 366 164" fill="none" stroke="#ddd5c8" strokeDasharray="3 7"/>
      <path d="M54 203h42l8 10H46Z" fill="#ddd5c7"/><path d="M342 203h46l8 10h-62Z" fill="#c6cbbb"/>
      <text x="74" y="243" textAnchor="middle">OUTBOX</text><text x="365" y="243" textAnchor="middle">DELIVERED</text>
      <ellipse ref={bind('shadow')} cx="74" cy="212" rx="34" ry="4" fill="#554132" opacity=".13"/>
      <g ref={bind('rig')} id={selected ? 'courier-target' : 'courier-peer'} data-motion-id="courier" data-state="waiting" transform="translate(74 166)">
        <g ref={bind('tilt')}>
          <path ref={bind('arm-left')} d="M-27-6Q-57-16-52-38" fill="none" stroke="#815947" strokeWidth="5" strokeLinecap="round"/>
          <path ref={bind('arm-right')} d="M27-6Q53-15 51-39" fill="none" stroke="#815947" strokeWidth="5" strokeLinecap="round"/>
          <g ref={bind('legs')} fill="none" stroke="#815947" strokeWidth="5" strokeLinecap="round"><path d="M-13 22-18 38-29 38M13 22 18 38 29 38"/></g>
          <g ref={bind('antenna')}><path d="M0-38V-58" stroke="#815947" strokeWidth="3" strokeLinecap="round"/><circle cy="-60" r="6" fill="#b7bea1"/><circle cx="-1.5" cy="-62" r="2" fill="#edf0df"/></g>
          <g ref={bind('body')}>
            <path d="M-34-20Q-32-42 0-42Q32-42 34-20L39 9Q39 32 0 32Q-39 32-39 9Z" fill={`url(#courier-clay-${variant})`}/>
            <path d="M-24-24Q-19-33-6-33" fill="none" stroke="#ffe2c9" strokeWidth="3" strokeLinecap="round" opacity=".75"/>
            <g ref={bind('face')}><rect x="-17" y="-15" width="9" height="15" rx="4.5" fill="#473d32"/><rect x="8" y="-15" width="9" height="15" rx="4.5" fill="#473d32"/><circle cx="-13" cy="-11" r="1.7" fill="#fff8e9"/><circle cx="12" cy="-11" r="1.7" fill="#fff8e9"/><path d="M-4 6Q0 10 4 6" fill="none" stroke="#815947" strokeWidth="2" strokeLinecap="round"/></g>
            <ellipse cx="-23" cy="1" rx="5" ry="3" fill="#c8745f" opacity=".5"/><ellipse cx="23" cy="1" rx="5" ry="3" fill="#c8745f" opacity=".5"/>
          </g>
          <g ref={bind('note')} transform="translate(0 27)"><rect x="-22" y="-9" width="44" height="29" rx="3" fill="#fcf7e8" stroke="#c4b8a2"/><path d="m-21-7 21 15 21-15" fill="none" stroke="#c4b8a2"/><circle cy="7" r="3.3" fill="#a9b398"/></g>
        </g>
      </g>
      <g ref={bind('receipt')} opacity="0"><path d="m351 187 8 8 18-19" stroke="#78866c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></g>
    </svg>
  </article>;
}

/** A deterministic two-lane rig. All visible poses are computed from real elapsed time. */
export default function KineticScene({ resetKey, mode }: { resetKey: number; mode: 'baseline' | 'fixed' }) {
  const refs = useRef<Record<string, SVGElement | null>>({});
  const elapsed = useRef(0);
  const poses = useRef({ baseline: home(), fixed: home() });
  const redirectAt = useRef(1050);
  const didRedirect = useRef(false);
  const didSettle = useRef(false);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('autoplay') === '0');
  const [loop, setLoop] = useState(new URLSearchParams(location.search).get('autoplay') !== '0');
  const [phase, setPhase] = useState('Anticipate');
  const phaseRef = useRef('Anticipate');
  const [replay, setReplay] = useState(0);
  const reduced = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stage = useRef<HTMLDivElement>(null);
  const jump = useRef(0);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = media.matches; if (media.matches) { setPaused(true); setPhase('Reduced motion · paused'); } };
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    elapsed.current = 0; poses.current = { baseline: home(), fixed: home() }; redirectAt.current = 1050; didRedirect.current = false; didSettle.current = false; jump.current = 0;
    phaseRef.current = 'Anticipate'; setPhase(reduced.current ? 'Reduced motion · paused' : 'Anticipate');
  }, [resetKey, replay]);
  useEffect(() => {
    let request = 0, last = 0;
    const draw = (variant: 'baseline' | 'fixed', time: number) => {
      const p = poses.current[variant], element = (name: string) => refs.current[`${variant}-${name}`];
      const speed = Math.hypot(p.vx, p.vy), moving = time >= 220 && (time < 3900 || time >= 4800 && time < 6500);
      const anticipation = time < 220 ? Math.sin(time / 220 * Math.PI) : 0;
      const flutter = moving ? Math.sin(time / 64) * Math.min(20, speed / 9) : 0;
      element('rig')?.setAttribute('transform', `translate(${p.x.toFixed(3)} ${p.y.toFixed(3)})`);
      element('rig')?.setAttribute('data-state', time >= 4800 ? 'returning' : time >= 3900 ? 'delivered' : time >= redirectAt.current ? 'redirected' : time >= 220 ? 'in-flight' : 'anticipating');
      element('tilt')?.setAttribute('transform', `rotate(${p.tilt.toFixed(2)})`);
      element('body')?.setAttribute('transform', `scale(${1 + anticipation * .17} ${1 - anticipation * .2})`);
      element('antenna')?.setAttribute('transform', `rotate(${p.antenna.toFixed(2)} 0 -38)`);
      element('arm-left')?.setAttribute('transform', `rotate(${-flutter.toFixed(2)} -27 -6)`);
      element('arm-right')?.setAttribute('transform', `rotate(${flutter.toFixed(2)} 27 -6)`);
      element('legs')?.setAttribute('transform', `rotate(${clamp(-p.vx / 12, -18, 18).toFixed(2)} 0 22)`);
      element('face')?.setAttribute('transform', `translate(${clamp(p.vx / 70, -3, 3).toFixed(2)} -1)`);
      element('note')?.setAttribute('transform', `translate(0 27) rotate(${(-p.antenna * .45).toFixed(2)})`);
      element('shadow')?.setAttribute('cx', p.x.toFixed(3)); element('shadow')?.setAttribute('rx', `${Math.max(12, 34 - (166 - p.y) * .14)}`);
      element('shadow')?.setAttribute('opacity', `${Math.max(.04, .14 - (166 - p.y) / 1300)}`);
      element('receipt')?.setAttribute('opacity', time >= 3900 && time < 4800 ? '1' : '0');
    };
    const tick = (now: number) => {
      if (!paused && !reduced.current) {
        const dt = last ? Math.min((now - last) / 1000, .05) : FIXED_STEP;
        const start = elapsed.current; elapsed.current += dt * 1000;
        let t = elapsed.current;
        if (t >= CYCLE_MS && loop) {
          elapsed.current = 0; t = 0; poses.current = { baseline: home(), fixed: home() }; didRedirect.current = false; didSettle.current = false; jump.current = 0;
          motionMark('sequence-start', 'Courier delivery loops', { cycleMs: CYCLE_MS });
        }
        // SOURCE: courier-continuity — seeded regression resets the pose on interruption.
        if (t >= redirectAt.current && !didRedirect.current) {
          didRedirect.current = true; jump.current = Math.hypot(poses.current.baseline.x - 74, poses.current.baseline.y - 166);
          poses.current.baseline = home();
          motionMark('state-update', 'Mid-flight destination changes; seeded lane resets its pose', { seededJumpPx: Math.round(jump.current), repairedVelocityPreserved: true });
        }
        const target = t < 220 ? [74, 166] : t < redirectAt.current ? [310, 73] : t < 2050 ? [155, 76] : t >= 4800 ? [74, 166] : [365, 166];
        for (const variant of ['baseline', 'fixed'] as const) {
          const p = poses.current[variant];
          if (t >= 3900 && t < 4800 || t >= 6500) { p.x = t >= 6500 ? 74 : 365; p.y = 166; p.vx = 0; p.vy = 0; p.tilt = 0; p.antenna = 0; p.antennaV = 0; }
          else {
            const steps = Math.max(1, Math.ceil(dt / FIXED_STEP)), h = dt / steps;
            for (let step = 0; step < steps; step++) {
              p.vx += ((target[0] - p.x) * 62 - p.vx * 11) * h; p.vy += ((target[1] - p.y) * 62 - p.vy * 11) * h;
              p.x += p.vx * h; p.y += p.vy * h;
              p.tilt += (clamp(p.vx / 22, -18, 18) - p.tilt) * Math.min(1, h * 14);
              p.antennaV += ((-p.tilt * 1.4 - p.antenna) * 95 - p.antennaV * 9) * h; p.antenna += p.antennaV * h;
            }
          }
          draw(variant, t);
        }
        const nextPhase = t < 220 ? 'Anticipate' : t < redirectAt.current ? 'Take flight' : t < 2050 ? 'Redirect mid-flight' : t < 3900 ? 'Deliver + settle' : t < 4800 ? 'Same final pose' : 'Return to outbox';
        if (nextPhase !== phaseRef.current) { phaseRef.current = nextPhase; setPhase(nextPhase); }
        if (t >= 3900 && !didSettle.current) { didSettle.current = true; motionMark('transition-settled', 'Both couriers deliver the same note in the same final pose', { state: 'delivered', finalX: 365, finalY: 166 }); }
        stage.current?.setAttribute('data-time-ms', `${Math.round(t)}`); stage.current?.setAttribute('data-seeded-jump', `${Math.round(jump.current)}`);
        if (start < 4400 && t >= 4400 && !loop) { setPaused(true); }
      } else { for (const variant of ['baseline', 'fixed'] as const) draw(variant, elapsed.current); }
      last = now; request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick); return () => cancelAnimationFrame(request);
  }, [paused, loop, replay, resetKey]);
  const restart = () => {
    motionMark('sequence-start', 'Courier delivery restarts from the same source pose', { reducedMotion: reduced.current, cycleMs: CYCLE_MS });
    if (reduced.current) { elapsed.current = 4000; poses.current = { baseline: { ...home(), x: 365 }, fixed: { ...home(), x: 365 } }; setPhase('Same final pose · reduced motion'); }
    else { setReplay(key => key + 1); setPaused(false); }
  };
  return <div className="kinetic-scene" ref={stage} data-time-ms="0" data-seeded-jump="0">
    <div className="kinetic-heading"><div><span className="scene-index">01 / THE INTERRUPTED DELIVERY</span><h2>A change of plan.<br/>A world of difference.</h2></div><p>The same note. The same landing.<br/>Watch what happens during the redirect.</p></div>
    <div className="courier-comparison"><CourierLane variant="baseline" selected={mode === 'baseline'} refs={refs}/><CourierLane variant="fixed" selected={mode === 'fixed'} refs={refs}/></div>
    <div className="kinetic-strip"><div className="motion-phase"><span className={`motion-live ${paused ? 'paused' : ''}`}/><span>{phase}</span></div><div className="kinetic-actions"><button id="courier-redirect" type="button" disabled={paused || didRedirect.current} title={paused ? 'Play the delivery to redirect it' : didRedirect.current ? 'Replay to try another redirect' : 'Change the destination during flight'} onClick={() => { redirectAt.current = Math.max(300, elapsed.current); }}>Redirect now</button><button id="courier-replay" type="button" onClick={restart}>Replay delivery</button><button id="courier-pause" type="button" aria-pressed={paused} onClick={() => { if (reduced.current) restart(); else if (elapsed.current >= CYCLE_MS) restart(); else setPaused(value => !value); }}>{paused ? reduced.current ? 'Show final pose' : 'Play motion' : 'Pause motion'}</button></div></div>
    <label className="courier-loop"><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)}/>Repeat preview</label>
  </div>;
}
