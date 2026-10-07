export type MotionAction =
  | { action:'click'|'hover'; selector:string }
  | { action:'key'; key:string }
  | { action:'move'; x:number; y:number }
  | { action:'drag'; selector:string; points:{x:number;y:number}[]; durationMs:number; steps?:number; end?:'release'|'cancel' }
  | { action:'scroll'; deltaY:number }
  | { action:'wait'; ms:number }
  | { action:'resize'; width:number; height:number }
  | { action:'pointer-cancel' }
  | { action:'reduced-motion'; value:'reduce'|'no-preference' };
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
  actors?:MotionActorBinding[];
  /** Versioned executable correspondence between plan beats and runner actions. */
  intent?:{
    schemaVersion:1;
    beats:{beatId:string;actionIndexes:number[]}[];
  };
  sourceRefs?:Record<string,{file:string;line:number;endLine?:number}>;
}
export interface MotionEvent {
  id:string; t:number; type:string; label:string;
  origin:'browser-observed'|'app-annotated'|'runner';
  nodeId?:string; animationId?:string; logicalId?:string;
  detail:Record<string,string|number|boolean|null>;
  source?:{file:string;line:number;endLine?:number;excerpt:string;sha256?:string};
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
  actorSamples?:MotionActorSample[];
  actorAnalysis?:MotionActorAnalysis;
  performanceDiagnostics?:MotionPerformanceDiagnostics;
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
  actorContractsPassed?:{before:boolean;after:boolean};
  functionalDelivery?:{before:MotionDelivery['status'];after:MotionDelivery['status']};
  deltas:Record<string,{before:number;after:number;change:number}>;
  actorDeltas?:Record<string,{before:number;after:number;change:number}>;
  improvements?:string[];
  regressions?:string[];
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

/** Opt-in observation, with explicit units and intent. Scene reports cannot certify pixels. */
export type MotionActorBinding = {
  id:string;
  acceptance?:{
    continuity?:'position'|'position-and-velocity'|'none';
    inputPolicy?:'retarget'|'direct-scrub'|'cut';
    maxStepAt60HzPx?:number;
    maxVelocityChangePxPerMs?:number;
    maxReplacements?:number;
    destination?:{
      x:number;y:number;tolerancePx:number;deadlineMs:number;settleMs?:number;
      /** Legacy omission is conservatively terminal through the capture end. */
      mode?:'terminal'|'waypoint';
      /** Explicit runner action epoch that activates this destination. */
      afterActionIndex?:number;
      /** Required for a waypoint: retain the pose until this later action starts. */
      holdUntilActionIndex?:number;
    };
    minTravelPx?:number;
    /** Browser-observed 2D orientation. Angles and bounds are radians. */
    orientation?:{
      axis:'z';unit:'radian';maxStepAt60HzRad?:number;
      destinationRad?:number;toleranceRad?:number;
      phase?:MotionActorPhase;
    };
    /** Browser-observed center-to-center relationship to another registered actor. */
    anchor?:{
      actorId:string;space:'screen';unit:'css-px';
      offset:{x:number;y:number};tolerancePx:number;phase?:MotionActorPhase;
    };
  };
} & ({kind:'dom'|'svg';selector:string}|{kind:'scene'});
export interface MotionActorPhase {
  startMs?:number;endMs?:number;
  afterEventLabel?:string;
  eventOccurrence?:'first'|'latest';
}
export interface MotionActorSample {
  actorId:string;kind:MotionActorBinding['kind'];
  origin:'browser-observed'|'app-reported'|'recorded-pixels';
  /** Capture-relative clock; DOM reads follow app callbacks, scene reads follow its render call. */
  t:number;observedAtMs:number;renderTimeMs?:number;
  nodeId:string|null;visible:boolean|null;
  screen:{x:number;y:number;width:number;height:number}|null;
  /** Column-major local transform for DOM, world transform for scene, radians in scene orientation. */
  transform:number[]|null;
  worldPosition?:{x:number;y:number;z:number};
  orientationRadians?:{x:number;y:number;z:number};
  cameraWorldMatrix?:number[];cameraProjectionMatrix?:number[];
}
export interface MotionActorResult {
  actorId:string;kind:MotionActorBinding['kind'];
  evidence:'browser-geometry'|'app-reported-scene'|'recorded-pixels';
  status:'passed'|'failed'|'unverified';pixelStatus:'unverified'|'observed';
  coverage:{sufficient:boolean;sampleCount:number;maxGapMs:number;reasons:string[]};
  metrics:{maxStepAt60HzPx:number;maxStepPx:number;travelPx:number;replacements:number;maxVelocityChangePxPerMs:number;arrivalAtMs:number|null;destinationConfirmedAtMs?:number|null;terminalDepartureAtMs?:number|null;maxOrientationStepAt60HzRad?:number;finalOrientationErrorRad?:number|null;orientationSampleCount?:number;orientationMaxReadGapMs?:number;maxAnchorErrorPx?:number;anchorPairCount?:number;anchorUniqueSubjectCount?:number;anchorUniqueReferenceCount?:number;anchorMaxReadSkewMs?:number;anchorPairMaxFrameGapMs?:number;anchorPairMaxReadGapMs?:number;anchorPairMaxObservationLagMs?:number};
  assertions:MotionAssertion[];
  findings:{type:'position-step'|'velocity-change'|'identity-replacement'|'arrival'|'terminal-departure'|'travel'|'orientation-step'|'orientation-destination'|'anchor-drift';summary:string;sampleTimes:number[];eventIds:string[]}[];
}
export interface MotionActorAnalysis {
  version:'1';status:'passed'|'failed'|'unverified';actors:MotionActorResult[];
  limitations:string[];
}
export interface MotionPerformanceDiagnostics {
  actorObservation?:{maxScenePublishMs:number;retainedBytes:number;retainedSamples:number;truncated:boolean;maxReadMs:number};
  longAnimationFrames:{status:'supported'|'unsupported'|'observer-error';thresholdMs:50;excludesPresentationTime:true};
}
/** A post-render snapshot is an app annotation, even when it comes from Three.js. */
export interface MotionSceneActorSnapshot {
  actorId:string;visible:boolean;screen:MotionActorSample['screen'];transform:number[];
  worldPosition?:{x:number;y:number;z:number};orientationRadians?:{x:number;y:number;z:number};
  cameraWorldMatrix:number[];cameraProjectionMatrix:number[];
}
