import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CaptureReport, FrameSample, RunReport, RunSummary, TraceEvent } from '../types';
import './dashboard.css';

type IconName = 'wave' | 'record' | 'play' | 'pause' | 'reset' | 'arrow' | 'check' | 'alert' | 'code' | 'image' | 'download' | 'chevron';
function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    wave: <path d="M2 10h3l2-6 4 13 3-10 2 3h4" />,
    record: <><circle cx="11" cy="11" r="7" /><circle cx="11" cy="11" r="2" fill="currentColor" /></>,
    play: <path d="m8 4 10 7-10 7Z" />,
    pause: <><path d="M7 4v14M15 4v14" /></>,
    reset: <><path d="M5 7a7 7 0 1 1-1 7M4 3v5h5" /></>,
    arrow: <><path d="M4 11h14m-5-5 5 5-5 5" /></>,
    check: <><circle cx="11" cy="11" r="8" /><path d="m7 11 3 3 5-6" /></>,
    alert: <><path d="m11 3 9 16H2Z" /><path d="M11 8v4m0 3v.1" /></>,
    code: <><path d="m7 5-5 6 5 6m8-12 5 6-5 6m-3-14-3 16" /></>,
    image: <><rect x="3" y="3" width="16" height="16" rx="2" /><path d="m3 15 5-5 4 4 3-3 4 4" /><circle cx="14" cy="7" r="1" /></>,
    download: <><path d="M11 3v11m-4-4 4 4 4-4M4 16v3h14v-3" /></>,
    chevron: <path d="m8 6 5 5-5 5" />,
  };
  return <svg className={`icon ${className}`} viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Capture service returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}
const formatMs = (n: number) => `${Math.round(n).toLocaleString()} ms`;
const shortId = (id: string) => id.length > 13 ? id.slice(-10) : id;
const isPending = (run?: RunSummary | null) => run?.status === 'queued' || run?.status === 'running';
const findSample = (capture: CaptureReport | undefined, t: number): FrameSample | undefined => capture?.samples.reduce<FrameSample | undefined>((nearest, sample) => !nearest || Math.abs(sample.t - t) < Math.abs(nearest.t - t) ? sample : nearest, undefined);
type SelectedEvent = { event: TraceEvent; mode: 'baseline' | 'fixed' };
function allEvents(run: RunReport): SelectedEvent[] {
  return [...(run.baseline?.events.map(event => ({ event, mode: 'baseline' as const })) || []), ...(run.fixed?.events.map(event => ({ event, mode: 'fixed' as const })) || [])].sort((a, b) => a.event.t - b.event.t || a.mode.localeCompare(b.mode));
}
function outcome(capture?: CaptureReport) {
  if (!capture) return 'Awaiting capture';
  return capture.metrics.cancellationsWhileActive > 0 ? `${capture.metrics.cancellationsWhileActive} active cancellation${capture.metrics.cancellationsWhileActive === 1 ? '' : 's'}` : 'No active cancellations';
}

export default function Dashboard() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(new URLSearchParams(location.search).get('run'));
  const [run, setRun] = useState<RunReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [delayMs, setDelayMs] = useState(350);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(.5);
  const [metric, setMetric] = useState<'x' | 'opacity'>('x');
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [source, setSource] = useState<{ file: string; content: string } | null>(null);
  const [sourceError, setSourceError] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);
  const initialized = useRef<string | null>(null);
  const savedViews = useRef(new Map<string, { time: number; event: SelectedEvent | null; metric: 'x' | 'opacity'; sourceOpen: boolean }>());
  const timelineRef = useRef<HTMLElement>(null);
  const duration = Math.max(run?.baseline?.durationMs || 0, run?.fixed?.durationMs || 0, 1);
  const busy = creating || runs.some(isPending) || isPending(run);

  const refreshRuns = useCallback(async () => {
    const result = await request<{ runs: RunSummary[] }>('/api/runs');
    setRuns(result.runs);
    return result.runs;
  }, []);

  useEffect(() => {
    let active = true;
    refreshRuns().then(items => {
      if (active) { setSelectedId(id => id || items[0]?.id || null); setLoading(false); }
    }).catch(e => { if (active) { setError(String(e.message)); setLoading(false); } });
    return () => { active = false; };
  }, [refreshRuns]);

  // Keep an in-flight capture current even when inspecting a different, completed run.
  useEffect(() => {
    if (!runs.some(isPending)) return;
    const interval = setInterval(() => { void refreshRuns().catch(() => { /* Selected-run polling reports connection errors. */ }); }, 1000);
    return () => clearInterval(interval);
  }, [runs.some(isPending), refreshRuns]);

  useEffect(() => {
    if (run?.status === 'complete' && run.id === selectedId) savedViews.current.set(run.id, { time, event: selectedEvent, metric, sourceOpen });
  }, [run?.id, run?.status, selectedId, time, selectedEvent, metric, sourceOpen]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    setLoading(true);
    setRun(previous => previous?.id === selectedId ? previous : null);
    setPlaying(false);
    const restored = savedViews.current.get(selectedId);
    setSelectedEvent(restored?.event || null);
    setTime(restored?.time || 0);
    setMetric(restored?.metric || 'x');
    setSourceOpen(restored?.sourceOpen || false);
    const url = new URL(location.href); url.searchParams.set('run', selectedId); history.replaceState(null, '', url);
    const poll = async () => {
      try {
        const report = await request<RunReport>(`/api/runs/${encodeURIComponent(selectedId)}`, { signal: controller.signal });
        if (!active) return;
        setRun(report); setLoading(false); setError('');
        setRuns(items => [report, ...items.filter(item => item.id !== report.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        if (report.status === 'complete' && initialized.current !== report.id && !restored) {
          initialized.current = report.id;
          const event = report.baseline?.events.find(item => item.type === 'animation-cancel') || report.baseline?.events.find(item => item.type === 'request-resolve');
          if (event) { setSelectedEvent({ event, mode: 'baseline' }); setTime(Math.max(0, event.t)); }
        }
        if (isPending(report)) timer = setTimeout(poll, 1000);
      } catch (e) {
        if (active && !controller.signal.aborted) { setError((e as Error).message); setLoading(false); }
      }
    };
    void poll();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [selectedId, reloadKey]);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 100) * speed; previous = now;
      setTime(value => { const next = value + delta; if (next >= duration) { setPlaying(false); return duration; } return next; });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, duration]);

  const capture = async () => {
    if (busy) return;
    setCreating(true); setError(''); setPlaying(false);
    try {
      const result = await request<{ id: string; status: 'queued' }>('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fixture: 'key-remount', delayMs }) });
      setRuns(items => [{ id: result.id, status: result.status, createdAt: new Date().toISOString(), fixture: 'key-remount', delayMs }, ...items]);
      setSelectedId(result.id);
    } catch (e) { setError((e as Error).message); }
    finally { setCreating(false); }
  };

  const selectEvent = (item: SelectedEvent) => { setSelectedEvent(item); setTime(Math.max(0, item.event.t)); setPlaying(false); };
  const seek = (t: number) => { setTime(Math.max(0, Math.min(duration, t))); setPlaying(false); };
  const jumpToBreak = () => {
    const event = run?.baseline?.events.find(item => item.type === 'animation-cancel') || run?.baseline?.events.find(item => item.type === 'request-resolve');
    if (event) { selectEvent({ event, mode: 'baseline' }); timelineRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  };
  const showSource = async () => {
    setSourceOpen(value => !value);
    if (source || sourceLoading) return;
    setSourceLoading(true); setSourceError('');
    try { setSource(await request<{ file: string; content: string }>('/api/source?file=src%2Ffixture%2FFixture.tsx')); }
    catch (e) { setSourceError((e as Error).message); }
    finally { setSourceLoading(false); }
  };
  const complete = run?.status === 'complete';
  const verified = run?.diagnosis?.confidence === 'verified-fixture';
  const assertionsPassed = run?.assertions?.filter(item => item.passed).length || 0;

  return <div className="dashboard">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Icon name="wave" /></span>Motion debugger <span className="mono muted" style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>0.1</span></div>
      <div className="topbar-meta"><span className="mono">CONTROLLED FIXTURE</span><span className="local-status"><span className="status-dot" /> Local workspace</span></div>
    </header>
    <div className="workspace">
      <aside className="sidebar" aria-label="Capture navigation">
        <span className="nav-label">Regression case</span>
        <div className="case-item"><Icon name="wave" /><div><strong>Key-remount entrance</strong><span>React · Web Animations</span></div></div>
        <span className="nav-label">Capture history <span className="mono" style={{ marginLeft: 4 }}>{runs.length}</span></span>
        <div className="run-list">
          {runs.map(item => <button key={item.id} data-run-id={item.id} type="button" className={`run-item ${selectedId === item.id ? 'selected' : ''}`} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
            <span className="run-item-top"><span className="mono run-item-id">{shortId(item.id)}</span><span className={`status ${item.status === 'complete' ? 'pass' : item.status === 'failed' ? 'fail' : 'pending'}`}>{item.status === 'complete' ? 'Ready' : item.status === 'failed' ? 'Failed' : 'Running'}</span></span>
            <span className="run-item-time">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.delayMs} ms response</span>
          </button>)}
        </div>
        {runs.length === 0 && <p className="sidebar-note">Recorded runs will appear here</p>}
        <p className="sidebar-note">Capture data stays on this machine. Each run records both variants in Chromium.</p>
      </aside>
      <main className="main-content">
        <div className="page-heading">
          <div><div className="breadcrumb">Regression cases <Icon name="chevron" /> Key-remount entrance</div><h1>One response. Two motion paths.</h1><p>Compare a React key remount against a stable-key repair using browser evidence.</p></div>
          <div className="capture-controls"><label className="delay-field">API delay <select value={delayMs} disabled={busy} onChange={event => setDelayMs(Number(event.target.value))}><option value={200}>200 ms</option><option value={350}>350 ms</option><option value={600}>600 ms</option><option value={800}>800 ms</option></select></label><button type="button" className="button primary" disabled={busy} onClick={() => void capture()}><Icon name="record" />{busy ? 'Recording…' : 'Record & verify'}</button></div>
        </div>
        {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" className="button" onClick={() => { setError(''); setReloadKey(value => value + 1); void refreshRuns().then(items => { if (!selectedId) setSelectedId(items[0]?.id || null); }).catch(e => setError(e.message)); }}>Retry connection</button></div>}
        {loading && !run && <div className="progress-region" role="status"><h2>Loading capture evidence</h2><p>Reading local run history and recorded artifacts.</p><div className="progress-track" /></div>}
        {!loading && !run && !selectedId && <div className="empty-state"><Icon name="record" /><h2>Record the regression and its repair</h2><p>A delayed API response updates a React key during an entrance animation. Capture both variants to connect the visible jump to its event trace.</p><button type="button" className="button primary" disabled={busy} onClick={() => void capture()}><Icon name="record" />Start first capture</button><div className="empty-detail"><span>Real browser samples</span><span>Video + event trace</span><span>Measured assertions</span></div></div>}
        {run && isPending(run) && <div className="progress-region" role="status" aria-live="polite"><h2>Recording broken and fixed variants</h2><p>Chromium is collecting video, DOM identity, animation lifecycle, request timing, and frame samples. Usually takes 7–12 seconds.</p><div className="progress-track" /></div>}
        {run?.status === 'failed' && <div className="report-banner"><Icon name="alert" className="report-icon" /><div><h2>Capture did not complete</h2><p>{run.error?.split('\n')[0] || 'No complete evidence was produced. Start a new capture to retry.'}</p>{run.error?.includes('\n') && <details className="capture-error-details"><summary>Technical details</summary><pre>{run.error}</pre></details>}</div></div>}
        {complete && run && <>
          {run.diagnosis && <div className={`report-banner ${verified ? '' : 'inconclusive'}`}><Icon name={verified ? 'alert' : 'wave'} className="report-icon" /><div><h2>{run.diagnosis.title}</h2><p>{run.diagnosis.summary}</p></div><span className="run-stamp mono">{verified ? 'FIXTURE VERIFIED' : 'INCONCLUSIVE'}</span></div>}
          <section aria-labelledby="replay-title">
            <div className="section-head"><h2 id="replay-title">Synchronized replay</h2><span className="section-caption mono">{run.environment?.viewport.width} × {run.environment?.viewport.height} · {run.environment?.browser || 'Chromium'}</span></div>
            <div className="replay-grid"><Replay capture={run.baseline} time={time} mode="baseline" /><Replay capture={run.fixed} time={time} mode="fixed" /></div>
            <div className="transport">
              <button type="button" className="icon-button" aria-label={playing ? 'Pause synchronized replay' : 'Play synchronized replay'} onClick={() => { if (time >= duration) setTime(0); setPlaying(value => !value); }}><Icon name={playing ? 'pause' : 'play'} /></button>
              <button type="button" className="icon-button" aria-label="Reset replay to input" onClick={() => seek(0)}><Icon name="reset" /></button>
              <span className="timecode mono">{formatMs(time)} <span className="muted">/ {formatMs(duration)}</span></span>
              <input aria-label="Replay time in milliseconds" className="scrubber" type="range" min="0" max={duration} step="1" value={time} onChange={event => seek(Number(event.target.value))} />
              <select aria-label="Playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={.25}>0.25×</option><option value={.5}>0.5×</option><option value={1}>1×</option></select>
              <button type="button" className="skip-event" onClick={jumpToBreak}>Jump to interruption <Icon name="arrow" /></button>
            </div>
          </section>
          <section className="evidence-grid" ref={timelineRef} aria-labelledby="evidence-title">
            <div className="evidence-main"><div className="evidence-tabs"><h2 id="evidence-title">Motion evidence</h2><div className="legend"><span className="legend-item"><i className="line-marker" />Broken</span><span className="legend-item"><i className="line-marker fixed" />Fixed</span></div></div>
              <div className="chart"><div className="chart-header"><span>{metric === 'x' ? 'Element position · px' : 'Computed opacity · 0–1'} <span className="chart-unit">rAF samples</span></span><div className="segmented" aria-label="Motion metric"><button type="button" aria-pressed={metric === 'x'} onClick={() => setMetric('x')}>Position x</button><button type="button" aria-pressed={metric === 'opacity'} onClick={() => setMetric('opacity')}>Opacity</button></div></div><MotionChart run={run} duration={duration} time={time} metric={metric} seek={seek} /></div>
              <EventTimeline run={run} duration={duration} time={time} selected={selectedEvent} select={selectEvent} />
            </div>
            <EventInspector run={run} selected={selectedEvent} select={selectEvent} />
          </section>
          <div className="bottom-grid">
            <section className="source-panel" aria-labelledby="patch-title"><div className="section-head"><h2 id="patch-title">Stable-key repair</h2><span className="section-caption">{run.patch?.appliedToFixture ? 'Fixed fixture branch' : 'Suggested change'}</span></div>
              {run.patch ? <><div className="patch-container"><div className="patch-header"><span className="mono">{run.patch.file}</span><button type="button" className="button" aria-expanded={sourceOpen} onClick={() => void showSource()}><Icon name="code" />{sourceOpen ? 'Hide source' : 'View source'}</button></div><pre className="patch" aria-label="Source patch">{run.patch.diff.split('\n').map((line, i) => <span key={i} className={`patch-line ${line.startsWith('+') && !line.startsWith('+++') ? 'add' : line.startsWith('-') && !line.startsWith('---') ? 'remove' : line.startsWith('@') || line.startsWith('---') || line.startsWith('+++') ? 'meta' : ''}`}>{line || ' '}</span>)}</pre>{sourceOpen && <div className="source-expanded">{sourceLoading ? <p role="status">Loading fixture source…</p> : sourceError ? <p role="alert">{sourceError}</p> : source && <pre className="source-content">{source.content.split('\n').map((line, i) => <span key={i}><span className="source-line-number">{i + 1}</span>{line || ' '}</span>)}</pre>}</div>}</div><p className="patch-note">{run.patch.explanation}</p></> : <p className="muted">No source patch was produced for this run.</p>}
            </section>
            <section className="assertions-panel" aria-labelledby="assertions-title"><div className="section-head"><h2 id="assertions-title">Regression proof</h2><span className="section-caption mono">{assertionsPassed}/{run.assertions?.length || 0} passed</span></div><div className="assertions-list">{run.assertions?.length ? run.assertions.map(assertion => <div className={`assertion ${assertion.passed ? 'pass' : 'fail'}`} key={assertion.id}><Icon name={assertion.passed ? 'check' : 'alert'} /><div><span className="assertion-scope">{assertion.id.startsWith('baseline-') ? 'Broken capture' : assertion.id.startsWith('fixed-') ? 'Fixed capture' : 'Comparison'}</span><strong>{assertion.label}</strong><p>{assertion.detail}</p></div><span className="assertion-result">{assertion.passed ? 'PASS' : 'FAIL'}</span></div>) : <div className="assertion"><p>No measured assertions available.</p></div>}</div>
              {run.diagnosis?.limitations.map((item, i) => <p className="patch-note" key={i}>{item}</p>)}
            </section>
          </div>
          <footer className="report-footer"><span>Measured in {run.environment?.browser || 'Chromium'} · {run.environment?.sampleClock || 'requestAnimationFrame'} · response {run.delayMs} ms · animation {run.environment?.animationDurationMs || '—'} ms</span><div className="report-links"><a href={`/api/runs/${encodeURIComponent(run.id)}`} target="_blank" rel="noreferrer">Raw evidence JSON ↗</a><a href={`/fixture?mode=baseline&delay=${run.delayMs}`} target="_blank" rel="noreferrer">Open fixture ↗</a></div></footer>
        </>}
      </main>
    </div>
  </div>;
}

function Replay({ capture, time, mode }: { capture?: CaptureReport; time: number; mode: 'baseline' | 'fixed' }) {
  const video = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  const [finalFrame, setFinalFrame] = useState(false);
  const sample = findSample(capture, time);
  const sync = useCallback(() => {
    if (!video.current || !capture) return;
    const offset = (time + capture.media.videoOffsetMs) / 1000;
    const target = Number.isFinite(video.current.duration) ? Math.min(Math.max(0, offset), video.current.duration) : Math.max(0, offset);
    if (video.current.readyState >= 1 && Math.abs(video.current.currentTime - target) > .02) video.current.currentTime = target;
  }, [capture, time]);
  useEffect(sync, [sync]);
  useEffect(() => { setMediaError(false); setFinalFrame(false); }, [capture]);
  const hasVideo = Boolean(capture?.media.videoUrl && !mediaError);
  return <div className="replay-panel"><div className="replay-heading"><span className={`replay-label ${mode === 'fixed' ? 'fixed' : ''}`}><i className="marker" />{mode === 'baseline' ? 'Broken · revision key' : 'Fixed · stable key'}</span><span className="mono">{capture?.metrics.sampleCount || 0} samples</span></div><div className="replay-stage">
    {hasVideo && capture ? <video ref={video} src={capture.media.videoUrl!} poster={capture.media.posterUrl} muted playsInline preload="auto" onLoadedData={sync} onError={() => setMediaError(true)} aria-label={`${mode === 'baseline' ? 'Broken' : 'Fixed'} recorded browser replay`} /> : capture?.media.posterUrl ? <img src={finalFrame ? capture.media.finalUrl : capture.media.posterUrl} alt={`${mode} ${finalFrame ? 'final' : 'initial'} captured browser frame`} /> : <div className="media-empty"><Icon name="image" />No browser media available for this capture.</div>}
  </div><div className="replay-footer"><span className={`status ${capture?.metrics.cancellationsWhileActive ? 'fail' : capture ? 'pass' : ''}`}>{outcome(capture)}</span><span className="mono">x <span className="value">{sample?.x === null || sample?.x === undefined ? '—' : sample.x.toFixed(1)}</span> · α <span className="value">{sample?.opacity === null || sample?.opacity === undefined ? '—' : sample.opacity.toFixed(2)}</span></span></div>{capture && <div className="replay-metrics"><span>Max backtrack <strong className="mono">{capture.metrics.maxBackwardJumpPx.toFixed(1)} px</strong></span><span>Opacity drop <strong className="mono">{capture.metrics.maxOpacityDrop.toFixed(3)}</strong></span></div>}{capture && !hasVideo && <div className="media-fallback"><span>Still frames only. Scrubbing does not reconstruct motion.</span><button type="button" onClick={() => setFinalFrame(value => !value)}>{finalFrame ? 'Show initial frame' : 'Show final frame'}</button></div>}</div>;
}

function MotionChart({ run, duration, time, metric, seek }: { run: RunReport; duration: number; time: number; metric: 'x' | 'opacity'; seek: (t: number) => void }) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(700);
  // Match the SVG coordinate space to its CSS width so measurement labels stay
  // 10px at every viewport instead of shrinking with a fixed-width viewBox.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(Math.max(220, next));
    });
    observer.observe(chart);
    return () => observer.disconnect();
  }, []);
  const height = 150, left = 42, right = 8, top = 8, bottom = 26;
  const samples = [...(run.baseline?.samples || []), ...(run.fixed?.samples || [])];
  const values = samples.map(sample => sample[metric]).filter((value): value is number => value !== null);
  const min = metric === 'opacity' ? 0 : values.length ? Math.floor(Math.min(...values) / 10) * 10 : 0;
  const max = metric === 'opacity' ? 1 : values.length ? Math.max(min + 10, Math.ceil(Math.max(...values) / 10) * 10) : 1;
  const x = (t: number) => left + Math.max(0, Math.min(duration, t)) / duration * (width - left - right);
  const y = (v: number) => top + (1 - (v - min) / (max - min)) * (height - top - bottom);
  const path = (capture?: CaptureReport) => {
    let connected = false;
    return (capture?.samples || []).filter(sample => sample.t >= 0).map(sample => {
      const value = sample[metric];
      if (value === null) { connected = false; return ''; }
      const command = connected ? 'L' : 'M'; connected = true;
      return `${command}${x(sample.t).toFixed(2)},${y(value).toFixed(2)}`;
    }).join(' ');
  };
  const response = run.baseline?.events.find(event => event.type === 'request-resolve');
  const timeTicks = width < 300 ? [0, .5, 1] : [0, .25, .5, .75, 1];
  return <svg ref={chartRef} className="chart-view" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric === 'x' ? 'Horizontal position' : 'Opacity'} sampled from broken and fixed browser captures. Use replay slider to inspect a time.`} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); const position = (event.clientX - rect.left) / rect.width * width; seek((position - left) / (width - left - right) * duration); }}>
    {[0, .5, 1].map(fraction => { const value = min + fraction * (max - min); return <g key={fraction}><line className="chart-grid" x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text x={left - 8} y={y(value) + 3} textAnchor="end">{metric === 'opacity' ? value.toFixed(1) : Math.round(value)}</text></g>; })}
    {response && <g><rect x={x(response.t) - 2} y={top} width="4" height={height - top - bottom} fill="#edaa8e" opacity=".12" /><text x={Math.min(x(response.t) + 6, width - 115)} y={top + 10}>response</text></g>}
    <path className="trace-line chart-baseline" d={path(run.baseline)} /><path className="trace-line chart-fixed" d={path(run.fixed)} />
    <line className="chart-cursor" x1={x(time)} x2={x(time)} y1={top} y2={height - bottom} />
    {timeTicks.map(fraction => <text className="chart-time-tick" key={fraction} x={x(duration * fraction)} y={height - 5} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}>{Math.round(duration * fraction)} ms</text>)}
  </svg>;
}

const lanes = [
  { label: 'Input', types: ['input'] },
  { label: 'Network', types: ['request-start', 'request-resolve', 'request-error', 'network-verified'] },
  { label: 'React state', types: ['state-update', 'react-mount', 'react-unmount'] },
  { label: 'DOM identity', types: ['dom-add', 'dom-remove'] },
  { label: 'Animation', types: ['animation-start', 'animation-cancel', 'animation-finish'] },
];
function EventTimeline({ run, duration, time, selected, select }: { run: RunReport; duration: number; time: number; selected: SelectedEvent | null; select: (item: SelectedEvent) => void }) {
  const events = useMemo(() => allEvents(run).filter(item => item.event.t >= 0 && item.event.t <= duration), [run, duration]);
  return <div className="timeline"><div className="timeline-heading"><span>Event timeline · nearby events grouped</span><span>Relative to input</span></div>{lanes.map(lane => {
    const groups = new Map<string, SelectedEvent[]>();
    events.filter(item => lane.types.includes(item.event.type)).forEach(item => {
      const key = `${item.mode}-${Math.round(item.event.t / 16)}`;
      const group = groups.get(key) || []; group.push(item); groups.set(key, group);
    });
    return <div className="timeline-row" key={lane.label}><span className="lane-label">{lane.label}</span><div className="lane-track"><span className="lane-playhead" style={{ left: `${time / duration * 100}%` }} />{[...groups].map(([key, group]) => {
      const item = group.find(value => value.event.type === 'animation-cancel') || group[0];
      const active = group.some(value => selected?.event.id === value.event.id && selected?.mode === value.mode);
      return <button type="button" key={key} className={`event-point variant-${item.mode}`} style={{ left: `${Math.max(1.2, Math.min(98.8, item.event.t / duration * 100))}%`, top: item.mode === 'baseline' ? 0 : 24 }} aria-label={`${item.mode === 'baseline' ? 'Broken' : 'Fixed'}: ${group.map(value => value.event.label).join('; ')}, ${formatMs(item.event.t)}`} title={`${item.mode}: ${group.map(value => value.event.label).join('; ')} · ${formatMs(item.event.t)}`} aria-pressed={active} onClick={() => select(item)}><span className="event-dot">{group.length > 1 ? group.length : ''}</span></button>;
    })}</div></div>;
  })}<div className="timeline-axis mono"><span>0</span><span>{formatMs(duration / 2)}</span><span>{formatMs(duration)}</span></div></div>;
}
function EventInspector({ run, selected, select }: { run: RunReport; selected: SelectedEvent | null; select: (item: SelectedEvent) => void }) {
  const events = useMemo(() => allEvents(run), [run]);
  const index = selected ? events.findIndex(item => item.event.id === selected.event.id && item.mode === selected.mode) : -1;
  const links = selected ? run.diagnosis?.edges.filter(edge => edge.from === selected.event.id || edge.to === selected.event.id) || [] : [];
  return <aside className="event-inspector" aria-label="Event inspector"><div className="inspector-title">Event inspector <span className="mono">{index >= 0 ? `${index + 1} / ${events.length}` : `${events.length} events`}</span></div><label className="event-select-label">Select exact event<select aria-label="Select exact event" className="event-select" value={index} onChange={event => select(events[Number(event.target.value)])}><option value={-1} disabled>Choose an event</option>{events.map((item, i) => <option key={`${item.mode}-${item.event.id}`} value={i}>{item.mode === 'baseline' ? 'Broken' : 'Fixed'} · {Math.round(item.event.t)} ms · {item.event.label}</option>)}</select></label>{selected ? <><h3>{selected.event.label}</h3><span className={`status ${selected.mode === 'baseline' ? 'fail' : 'pass'}`}>{selected.mode === 'baseline' ? 'Broken capture' : 'Fixed capture'} · {formatMs(selected.event.t)}</span><dl className="event-meta"><dt>Type</dt><dd className="mono">{selected.event.type}</dd><dt>Origin</dt><dd>{selected.event.origin}</dd>{selected.event.nodeId && <><dt>DOM node</dt><dd className="mono">{selected.event.nodeId}</dd></>}{selected.event.animationId && <><dt>Animation</dt><dd className="mono">{selected.event.animationId}</dd></>}{selected.event.requestId && <><dt>Request</dt><dd className="mono">{selected.event.requestId}</dd></>}</dl>{selected.event.source && <div className="event-source"><span className="muted">Fixture source mapping</span><div className="mono">{selected.event.source.file}:{selected.event.source.line}</div><pre>{selected.event.source.excerpt}</pre></div>}{Object.keys(selected.event.detail).length > 0 && <pre className="inspector-json">{JSON.stringify(selected.event.detail, null, 2)}</pre>}{links.length > 0 && <div className="event-links">{links.map((edge, i) => <p key={i}>{edge.relation}<span>{edge.confidence} evidence</span></p>)}</div>}</> : <p className="inspector-empty">Select a timeline event to see its origin, identity, and source mapping.</p>}<div className="inspector-nav"><button type="button" className="button" disabled={index <= 0} onClick={() => select(events[index - 1])}>← Previous</button><button type="button" className="button" disabled={index >= events.length - 1} onClick={() => select(events[index + 1])}>Next →</button></div></aside>;
}
