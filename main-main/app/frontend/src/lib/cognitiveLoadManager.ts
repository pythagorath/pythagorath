// Real-Time Adaptive Educational Intelligence Sprint
// Module 5: Dynamic Cognitive Load Management
// Detects overload signals and dynamically adjusts: complexity, interaction length, distractions, pacing, visuals

import { type RealTimeSignals } from './realTimeTelemetry';
import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface CognitiveLoadState {
  studentId: string;
  sessionId: string;
  currentLoad: number; // 0-100
  intrinsicLoad: number; // from task difficulty
  extraneousLoad: number; // from UI/distractions
  germaneLoad: number; // productive learning effort
  overloadDetected: boolean;
  overloadCount: number;
  interventions: LoadIntervention[];
  loadHistory: LoadSnapshot[];
  config: CognitiveLoadConfig;
}

export interface LoadSnapshot {
  timestamp: string;
  load: number;
  intrinsic: number;
  extraneous: number;
  germane: number;
  signals: Partial<RealTimeSignals>;
}

export interface LoadIntervention {
  id: string;
  timestamp: string;
  type: InterventionType;
  reason: string;
  params: InterventionParams;
  applied: boolean;
  effectiveDelta: number | null; // load reduction achieved
}

export type InterventionType =
  | 'reduce_complexity'
  | 'shorten_interaction'
  | 'remove_distractions'
  | 'slow_progression'
  | 'simplify_visuals'
  | 'reduce_options'
  | 'chunk_content'
  | 'add_rest_point'
  | 'switch_modality'
  | 'provide_structure';

export interface InterventionParams {
  intensity: 'light' | 'moderate' | 'aggressive';
  duration: 'temporary' | 'session' | 'persistent';
  targetElement?: string;
  reductionTarget: number; // target load after intervention
}

export interface CognitiveLoadConfig {
  overloadThreshold: number; // default 75
  warningThreshold: number; // default 60
  optimalRange: [number, number]; // default [30, 55]
  measurementInterval: number; // ms between measurements, default 2000
  maxInterventionsPerSession: number; // default 8
  recoveryTimeMs: number; // time to wait after intervention, default 10000
  ageGroup: 'young' | 'middle' | 'older'; // affects thresholds
}

// ============ Constants ============

const AGE_CONFIGS: Record<string, Partial<CognitiveLoadConfig>> = {
  young: { overloadThreshold: 65, warningThreshold: 50, optimalRange: [20, 45], maxInterventionsPerSession: 10 },
  middle: { overloadThreshold: 75, warningThreshold: 60, optimalRange: [30, 55], maxInterventionsPerSession: 8 },
  older: { overloadThreshold: 80, warningThreshold: 65, optimalRange: [35, 60], maxInterventionsPerSession: 6 },
};

const DEFAULT_CONFIG: CognitiveLoadConfig = {
  overloadThreshold: 75,
  warningThreshold: 60,
  optimalRange: [30, 55],
  measurementInterval: 2000,
  maxInterventionsPerSession: 8,
  recoveryTimeMs: 10000,
  ageGroup: 'young',
};

// ============ State ============

let currentState: CognitiveLoadState | null = null;

// ============ Core Functions ============

export function initCognitiveLoadManager(
  studentId: string,
  sessionId: string,
  ageGroup?: 'young' | 'middle' | 'older'
): CognitiveLoadState {
  const age = ageGroup ?? 'young';
  const config: CognitiveLoadConfig = {
    ...DEFAULT_CONFIG,
    ...AGE_CONFIGS[age],
    ageGroup: age,
  };

  currentState = {
    studentId,
    sessionId,
    currentLoad: 20, // start low
    intrinsicLoad: 20,
    extraneousLoad: 0,
    germaneLoad: 0,
    overloadDetected: false,
    overloadCount: 0,
    interventions: [],
    loadHistory: [],
    config,
  };

  return currentState;
}

export function updateCognitiveLoad(
  signals: RealTimeSignals,
  taskDifficulty: number, // 1-10
  uiComplexity: number, // 1-10
  learningEngagement: number // 0-100
): CognitiveLoadState {
  if (!currentState) {
    currentState = initCognitiveLoadManager('unknown', 'unknown');
  }

  // Calculate intrinsic load (from task difficulty)
  const intrinsicLoad = Math.min(100, taskDifficulty * 10);

  // Calculate extraneous load (from UI, distractions, poor design)
  const extraneousLoad = Math.min(100,
    uiComplexity * 5 +
    (100 - signals.attentionScore) * 0.3 +
    signals.frustrationScore * 0.2
  );

  // Calculate germane load (productive learning effort)
  const germaneLoad = Math.min(100,
    learningEngagement * 0.5 +
    signals.engagementScore * 0.3 +
    (100 - signals.rushScore) * 0.2
  );

  // Total cognitive load (weighted sum, capped at 100)
  const totalLoad = Math.min(100,
    intrinsicLoad * 0.4 +
    extraneousLoad * 0.3 +
    signals.cognitiveLoadScore * 0.2 +
    signals.hesitationScore * 0.1
  );

  // Smooth the load (EMA)
  const alpha = 0.4;
  const smoothedLoad = currentState.currentLoad * (1 - alpha) + totalLoad * alpha;

  // Check for overload
  const wasOverloaded = currentState.overloadDetected;
  const isOverloaded = smoothedLoad > currentState.config.overloadThreshold;

  if (isOverloaded && !wasOverloaded) {
    currentState.overloadCount++;
  }

  // Record snapshot
  const snapshot: LoadSnapshot = {
    timestamp: new Date().toISOString(),
    load: smoothedLoad,
    intrinsic: intrinsicLoad,
    extraneous: extraneousLoad,
    germane: germaneLoad,
    signals: {
      hesitationScore: signals.hesitationScore,
      frustrationScore: signals.frustrationScore,
      cognitiveLoadScore: signals.cognitiveLoadScore,
      engagementScore: signals.engagementScore,
    },
  };

  currentState = {
    ...currentState,
    currentLoad: smoothedLoad,
    intrinsicLoad,
    extraneousLoad,
    germaneLoad,
    overloadDetected: isOverloaded,
    loadHistory: [...currentState.loadHistory.slice(-30), snapshot],
  };

  return currentState;
}

export function getRecommendedIntervention(signals: RealTimeSignals): LoadIntervention | null {
  if (!currentState) return null;

  // Check if we've hit max interventions
  if (currentState.interventions.length >= currentState.config.maxInterventionsPerSession) {
    return null;
  }

  // Check recovery time from last intervention
  const lastIntervention = currentState.interventions[currentState.interventions.length - 1];
  if (lastIntervention) {
    const timeSince = Date.now() - new Date(lastIntervention.timestamp).getTime();
    if (timeSince < currentState.config.recoveryTimeMs) {
      return null;
    }
  }

  // Determine intervention based on load components
  const { currentLoad, intrinsicLoad, extraneousLoad, config } = currentState;

  if (currentLoad < config.warningThreshold) return null;

  let type: InterventionType;
  let reason: string;
  let intensity: InterventionParams['intensity'];

  if (currentLoad > config.overloadThreshold) {
    intensity = 'aggressive';
  } else if (currentLoad > config.warningThreshold + 10) {
    intensity = 'moderate';
  } else {
    intensity = 'light';
  }

  // Choose intervention based on dominant load source
  if (extraneousLoad > intrinsicLoad && extraneousLoad > 40) {
    // Extraneous load dominant → reduce distractions
    if (signals.attentionScore < 40) {
      type = 'remove_distractions';
      reason = 'High extraneous load with low attention';
    } else {
      type = 'simplify_visuals';
      reason = 'Extraneous load from visual complexity';
    }
  } else if (intrinsicLoad > 70) {
    // Intrinsic load too high → reduce complexity
    if (signals.hesitationScore > 60) {
      type = 'chunk_content';
      reason = 'High intrinsic load with hesitation - break into chunks';
    } else if (signals.frustrationScore > 50) {
      type = 'reduce_complexity';
      reason = 'Task too complex, causing frustration';
    } else {
      type = 'slow_progression';
      reason = 'High intrinsic load - slow down';
    }
  } else if (signals.frustrationScore > 70) {
    type = 'add_rest_point';
    reason = 'High frustration signals - need a pause point';
  } else if (signals.rushScore > 60 && signals.cognitiveLoadScore > 60) {
    type = 'provide_structure';
    reason = 'Rushing under load - provide explicit structure';
  } else if (currentLoad > config.warningThreshold) {
    type = 'reduce_options';
    reason = 'General overload - reduce decision points';
  } else {
    return null;
  }

  const intervention: LoadIntervention = {
    id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    reason,
    params: {
      intensity,
      duration: intensity === 'aggressive' ? 'session' : 'temporary',
      reductionTarget: config.optimalRange[1],
    },
    applied: false,
    effectiveDelta: null,
  };

  return intervention;
}

export function applyIntervention(interventionId: string): void {
  if (!currentState) return;
  const intervention = currentState.interventions.find(i => i.id === interventionId);
  if (intervention) {
    intervention.applied = true;
  }
}

export function recordInterventionEffect(interventionId: string, loadAfter: number): void {
  if (!currentState) return;
  const intervention = currentState.interventions.find(i => i.id === interventionId);
  if (intervention) {
    intervention.effectiveDelta = currentState.currentLoad - loadAfter;
  }
}

export function addIntervention(intervention: LoadIntervention): void {
  if (!currentState) return;
  currentState.interventions.push(intervention);
}

export function getCognitiveLoadState(): CognitiveLoadState | null {
  return currentState;
}

export function isInOptimalZone(): boolean {
  if (!currentState) return true;
  const [low, high] = currentState.config.optimalRange;
  return currentState.currentLoad >= low && currentState.currentLoad <= high;
}

export function getLoadTrend(): 'increasing' | 'stable' | 'decreasing' {
  if (!currentState || currentState.loadHistory.length < 3) return 'stable';
  const recent = currentState.loadHistory.slice(-5);
  const first = recent[0].load;
  const last = recent[recent.length - 1].load;
  const diff = last - first;
  if (diff > 10) return 'increasing';
  if (diff < -10) return 'decreasing';
  return 'stable';
}

export function persistCognitiveLoadData(studentId: string, sessionId: string): void {
  if (!currentState) return;
  const key = `cogload_${studentId}_${sessionId}`;
  saveUserData(key, {
    overloadCount: currentState.overloadCount,
    interventions: currentState.interventions,
    avgLoad: currentState.loadHistory.length > 0
      ? currentState.loadHistory.reduce((a, b) => a + b.load, 0) / currentState.loadHistory.length
      : 0,
    timestamp: new Date().toISOString(),
  });
}

export function getSessionLoadSummary(): {
  avgLoad: number;
  peakLoad: number;
  overloadCount: number;
  interventionCount: number;
  timeInOptimalZone: number; // percentage
} {
  if (!currentState || currentState.loadHistory.length === 0) {
    return { avgLoad: 0, peakLoad: 0, overloadCount: 0, interventionCount: 0, timeInOptimalZone: 100 };
  }

  const loads = currentState.loadHistory.map(s => s.load);
  const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
  const peakLoad = Math.max(...loads);
  const [low, high] = currentState.config.optimalRange;
  const inZone = loads.filter(l => l >= low && l <= high).length;
  const timeInOptimalZone = (inZone / loads.length) * 100;

  return {
    avgLoad,
    peakLoad,
    overloadCount: currentState.overloadCount,
    interventionCount: currentState.interventions.length,
    timeInOptimalZone,
  };
}