export type MotionAction =
  | { action:'click'|'hover'; selector:string }
  | { action:'key'; key:string }
  | { action:'move'; x:number; y:number }
  | { action:'wait'; ms:number };
export interface MotionContract {
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
  t:number; nodeId:string|null; logicalId:string|null;
  x:number|null;y:number|null;width:number|null;height:number|null;
  opacity:number|null; translateX:number|null;translateY:number|null;
  scaleX:number|null;scaleY:number|null;rotationDeg:number|null;
  animationTime:number|null;
  containmentOverflowPx:number|null;containerRect:{x:number;y:number;width:number;height:number}|null;
}
export interface MotionMetrics {
  sufficientEvidence:boolean;validSamples:number;sampleCount:number;observedDurationMs:number;
  replacements:number;animationStarts:number;activeCancels:number;
  maxFrameStepPx:number;maxStepAt60HzPx:number;maxSampleGapMs:number;maxHeightStepPx:number;p95FrameStepPx:number;maxOpacityDrop:number;maxContainmentOverflowPx:number;containmentViolatingSamples:number;
  nodeIdentities:string[];
}
export interface MotionAssertion {id:string;label:string;passed:boolean;actual:string;expected:string}
export interface MotionFinding {
  type:'identity-replacement'|'active-animation-cancel'|'frame-step'|'height-step'|'opacity-drop'|'containment-overflow';
  summary:string;eventIds:string[];sampleTimes:number[];
  confidence:'observed'|'contract-violation';
}
export interface MotionCapture {
  schemaVersion:'2.0';id:string;createdAt:string;recipe:CaptureRecipe;
  environment:{browser:string;viewport:{width:number;height:number};clock:string;reducedMotion:string};
  events:MotionEvent[];samples:MotionSample[];metrics:MotionMetrics;
  assertions:MotionAssertion[];findings:MotionFinding[];
  final:{visible:boolean;attributes:Record<string,string>;text:string;x:number|null;y:number|null;opacity:number|null};
  artifacts:{directory:string;report:string;video:string;poster:string;finalScreenshot:string;videoOffsetMs:number};
  limitations:string[];
}
export interface MotionComparison {
  schemaVersion:'2.0';beforeId:string;afterId:string;
  comparable:boolean;comparabilityIssues:string[];
  contractsPassed:{before:boolean;after:boolean};
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
