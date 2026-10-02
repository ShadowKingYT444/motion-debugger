/** Public contract shared by the capture service and evidence dashboard. All timings are ms relative to the click. */
export type CaptureMode = 'baseline' | 'fixed';
export type RunStatus = 'queued' | 'running' | 'complete' | 'failed';
export interface SourceRef { file: string; line: number; endLine?: number; excerpt: string; label: string }
export interface TraceEvent {
  id: string; t: number; type: string; label: string;
  origin: 'browser-observed' | 'app-annotated' | 'runner';
  nodeId?: string; animationId?: string; requestId?: string;
  detail: Record<string, string | number | boolean | null>; source?: SourceRef;
}
export interface FrameSample { t: number; nodeId: string | null; x: number | null; y: number | null; width: number | null; height: number | null; opacity: number | null; translateX: number | null; animationTime: number | null }
export interface EvidenceEdge { from: string; to: string; relation: string; confidence: 'observed' | 'annotated' | 'fixture-mapped' }
export interface Assertion { id: string; label: string; passed: boolean; detail: string }
export interface CaptureMetrics {
  mounts: number; replacements: number; animationStarts: number; cancellationsWhileActive: number;
  maxBackwardJumpPx: number; maxOpacityDrop: number; settledAtMs: number | null; sampleCount: number;
}
export interface CaptureReport {
  mode: CaptureMode; events: TraceEvent[]; samples: FrameSample[]; metrics: CaptureMetrics;
  finalState: { cardId: string; revision: number; title: string; status: string };
  media: { videoUrl: string | null; videoOffsetMs: number; posterUrl: string; finalUrl: string; mimeType: 'video/webm'; durationMs: number };
  durationMs: number; assertions: Assertion[];
}
export interface Diagnosis {
  title: string; summary: string; rule: string; confidence: 'verified-fixture' | 'inconclusive';
  evidenceEventIds: string[]; edges: EvidenceEdge[]; sources: SourceRef[];
  limitations: string[];
}
export interface RunSummary { id: string; status: RunStatus; createdAt: string; delayMs: number; fixture: 'key-remount'; error?: string }
export interface RunReport extends RunSummary {
  finishedAt?: string; baseline?: CaptureReport; fixed?: CaptureReport;
  diagnosis?: Diagnosis;
  patch?: { file: string; before: string; after: string; explanation: string; diff: string; appliedToFixture: boolean };
  assertions?: Assertion[];
  environment?: { browser: string; viewport: {width:number;height:number}; animationDurationMs:number; sampleClock: string; reducedMotion: string; target: string };
}
