export type MotionAction =
  | { action:'click'|'hover'; selector:string }
  | { action:'key'; key:string }
  | { action:'move'; x:number; y:number }
  | { action:'scroll'; deltaY:number }
  | { action:'wait'; ms:number };
export interface MotionContract {
  /** Positive task completion checks, independent of temporal quality. Deadline is from capture start. */
  outcomes?:{timeoutMs?:number;required:MotionOutcomeExpectation[];forbiddenVisible?:string[]};
  /** Default continuous. Explicitly allow lifecycle absence without treating it as a lost recorder frame. */
  targetPresence?:'continuous'|'may-disappear';
  maxFrameStepPx?:number;
  maxStepAt60HzPx?:number;
  maxSampleGapMs?:number;
  maxHeightStepPx?:number;
  maxOpacityDrop?:number;
  maxReplacements?:number;
  maxActiveCancels?:number;
  containment?:{selector:string;shape?:'rect'|'circle';maxOverflowPx:number;minOpacity?:number};
  final?: {selector?:string; attributes?:Record<string,string>; textIncludes?:string; visible?:boolean};
}
export interface MotionOutcomeExpectation {id:string;selector:string;attributes?:Record<string,string>;textIncludes?:string;visible?:boolean}
export interface MotionOutcomeObservation {id:string;selector:string;count:number;visible:boolean;text:string;attributes:Record<string,string>;observedAtMs:number;passed:boolean;reason?:string}
export interface MotionDeliveryObservation {required:MotionOutcomeObservation[];forbiddenVisible:{selector:string;observedAtMs:number;text:string}[];elapsedMs:number;errors?:string[]}
export interface MotionDelivery extends MotionDeliveryObservation {status:'passed'|'failed'|'unverified';timeoutMs?:number;reasons:string[]}
export interface CaptureRecipe {
  url:string; selector:string; label?:string;
  actions:MotionAction[];
  durationMs?:number;
  viewport?:{width:number;height:number};
  reducedMotion?:'reduce'|'no-preference';
  contract?:MotionContract;
  sourceRefs?:Record<string,{file:string;line:number;endLine?:number}>;
}
export interface MotionEvent {
  id:string; t:number; type:string; label:string;
  origin:'browser-observed'|'app-annotated'|'runner';
  nodeId?:string; animationId?:string; logicalId?:string;
  detail:Record<string,string|number|boolean|null>;
  source?:{file:string;line:number;endLine?:number;excerpt:string};
}
export interface MotionSample {
  targetState?:'absent'|'hidden'|'visible';
  /** Actual geometry-read clock, kept separate from the rAF trajectory clock. */
  geometryTimeMs?:number;
  t:number; observedAtMs?:number; nodeId:string|null; logicalId:string|null;
  x:number|null;y:number|null;width:number|null;height:number|null;
  opacity:number|null; translateX:number|null;translateY:number|null;
  scaleX:number|null;scaleY:number|null;rotationDeg:number|null;
  animationTime:number|null;
  containmentOverflowPx:number|null;containerRect:{x:number;y:number;width:number;height:number}|null;
}
export interface MotionMetrics {
  absentSamples?:number;hiddenSamples?:number;visibleSamples?:number;invalidSamples?:number;
  maxObservedSampleGapMs?:number;maxVisibleSampleGapMs?:number;maxObservationLagMs?:number;maxProbeReadMs?:number;
  /** Additive v2 fields; absent in captures made before boundary observation. */
  animationBoundarySamples?:number;maxAnimationBoundaryStepPx?:number;maxAnimationBoundaryStepAt60HzPx?:number;
  sufficientEvidence:boolean;validSamples:number;sampleCount:number;observedDurationMs:number;
  replacements:number;animationStarts:number;activeCancels:number;
  maxFrameStepPx:number;maxStepAt60HzPx:number;maxSampleGapMs:number;maxHeightStepPx:number;p95FrameStepPx:number;maxOpacityDrop:number;maxContainmentOverflowPx:number;containmentViolatingSamples:number;
  nodeIdentities:string[];
}
export interface MotionAssertion {id:string;label:string;passed:boolean;status?:'passed'|'failed'|'inconclusive';actual:string;expected:string}
export interface MotionCoverage {
  version:'1';cadenceSufficient:boolean;targetCoverageSufficient:boolean;
  targetPresence:'continuous'|'may-disappear';
  intervals:{state:'absent'|'hidden'|'visible'|'invalid';fromMs:number;toMs:number;samples:number}[];
  reasons:string[];
}
export interface MotionFinding {
  type:'identity-replacement'|'active-animation-cancel'|'animation-boundary-step'|'frame-step'|'height-step'|'opacity-drop'|'containment-overflow';
  summary:string;eventIds:string[];sampleTimes:number[];
  confidence:'observed'|'contract-violation';
}
export interface MotionCapture {
  /** Absent in legacy successful captures; incomplete captures cannot satisfy contracts. */
  status?:'complete'|'incomplete';
  failure?:{stage:string;actionIndex?:number;action?:MotionAction['action'];selector?:string;elapsedMs:number;message:string};
  schemaVersion:'2.0';id:string;createdAt:string;recipe:CaptureRecipe;
  environment:{browser:string;browserMode?:'headless'|'headed';probeSha256?:string;analyzerSha256?:string;diagnostics?:{devicePixelRatio:number;visibilityState:string;webglRenderers:string[]};viewport:{width:number;height:number};clock:string;reducedMotion:string};
  events:MotionEvent[];samples:MotionSample[];metrics:MotionMetrics;
  coverage?:MotionCoverage;
  /** Absent in legacy captures; absence never proves functional delivery. */
  delivery?:MotionDelivery;
  assertions:MotionAssertion[];findings:MotionFinding[];
  final:{visible:boolean;attributes:Record<string,string>;text:string;x:number|null;y:number|null;opacity:number|null};
  artifacts:{directory:string;report:string;video:string;rawVideo?:string;recordingTransform?:{sourceSize:{width:number;height:number};crop:{x:number;y:number;width:number;height:number};scale:number;timeScale:number};recordingError?:string;poster:string;finalScreenshot:string;videoOffsetMs:number};
  limitations:string[];
}
export interface MotionComparison {
  schemaVersion:'2.0';beforeId:string;afterId:string;
  comparable:boolean;comparabilityIssues:string[];
  contractsPassed:{before:boolean;after:boolean};
  functionalDelivery?:{before:MotionDelivery['status'];after:MotionDelivery['status']};
  deltas:Record<string,{before:number;after:number;change:number}>;
  finalEquivalent:boolean;
  interpretation:string;
  findings:{before:MotionFinding[];after:MotionFinding[]};
  limitations:string[];
}
export interface CoreOptions {
  artifactRoot:string;
  allowedOrigins?:string[];
  sourceRoots?:string[];
  signal?:AbortSignal;
}
