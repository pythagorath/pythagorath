// Real-Time Adaptive Educational Intelligence Sprint
// Module 1: Real-Time Cognitive Telemetry Layer
// Tracks live interaction signals: hesitation, retries, rhythm, clicks, drag/drop, latency, abandonment, corrections
// Feeds signals to decision engine in real-time (<50ms processing)

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface TelemetryEvent {
  id: string;
  studentId: string;
  sessionId: string;
  skillId: string;
  timestamp: number; // performance.now() for precision
  wallTime: string; // ISO timestamp
  type: TelemetryEventType;
  value: number;
  metadata: Record<string, unknown>;
}

export type TelemetryEventType =
  | 'answer_start'
  | 'answer_submit'
  | 'answer_change'
  | 'hesitation_detected'
  | 'rapid_response'
  | 'retry_attempt'
  | 'hint_request'
  | 'skip_attempt'
  | 'click_pattern'
  | 'drag_start'
  | 'drag_end'
  | 'drag_error'
  | 'focus_lost'
  | 'focus_regained'
  | 'scroll_behavior'
  | 'abandonment_signal'
  | 'correction_made'
  | 'backtrack'
  | 'interaction_rhythm_change'
  | 'frustration_indicator'
  | 'engagement_spike'
  | 'engagement_drop';

export interface TelemetryWindow {
  studentId: string;
  sessionId: string;
  windowStart: number;
  windowEnd: number;
  events: TelemetryEvent[];
  signals: RealTimeSignals;
  trend: SignalTrend;
}

export interface RealTimeSignals {
  hesitationScore: number; // 0-100, higher = more hesitation
  rushScore: number; // 0-100, higher = more rushing
  frustrationScore: number; // 0-100
  engagementScore: number; // 0-100
  cognitiveLoadScore: number; // 0-100
  confidenceScore: number; // 0-100
  rhythmStability: number; // 0-100, higher = more stable
  attentionScore: number; // 0-100
  retryIntensity: number; // 0-100
  abandonmentRisk: number; // 0-100
}

export interface SignalTrend {
  direction: 'improving' | 'stable' | 'declining' | 'volatile';
  velocity: number; // rate of change per second
  confidence: number; // 0-100
  predictedNext: Partial<RealTimeSignals>;
}

export interface TelemetryConfig {
  windowSizeMs: number; // sliding window size (default 30s)
  sampleRateMs: number; // how often to compute signals (default 500ms)
  hesitationThresholdMs: number; // pause > this = hesitation (default 8000)
  rushThresholdMs: number; // response < this = rush (default 1500)
  maxEventsInWindow: number; // cap for memory (default 200)
  signalSmoothingFactor: number; // EMA alpha (default 0.3)
}

// ============ Default Config ============

const DEFAULT_CONFIG: TelemetryConfig = {
  windowSizeMs: 30000,
  sampleRateMs: 500,
  hesitationThresholdMs: 8000,
  rushThresholdMs: 1500,
  maxEventsInWindow: 200,
  signalSmoothingFactor: 0.3,
};

// ============ Telemetry State ============

interface TelemetryState {
  config: TelemetryConfig;
  currentWindow: TelemetryWindow | null;
  previousWindows: TelemetryWindow[];
  eventBuffer: TelemetryEvent[];
  lastSignals: RealTimeSignals | null;
  lastComputeTime: number;
  interactionStartTime: number | null;
  answerStartTime: number | null;
  responseTimes: number[];
  sessionEventCount: number;
}

const state: TelemetryState = {
  config: DEFAULT_CONFIG,
  currentWindow: null,
  previousWindows: [],
  eventBuffer: [],
  lastSignals: null,
  lastComputeTime: 0,
  interactionStartTime: null,
  answerStartTime: null,
  responseTimes: [],
  sessionEventCount: 0,
};

// ============ Core Functions ============

export function initTelemetrySession(
  studentId: string,
  sessionId: string,
  config?: Partial<TelemetryConfig>
): void {
  state.config = { ...DEFAULT_CONFIG, ...config };
  state.currentWindow = {
    studentId,
    sessionId,
    windowStart: performance.now(),
    windowEnd: performance.now() + state.config.windowSizeMs,
    events: [],
    signals: createEmptySignals(),
    trend: { direction: 'stable', velocity: 0, confidence: 0, predictedNext: {} },
  };
  state.previousWindows = [];
  state.eventBuffer = [];
  state.lastSignals = null;
  state.lastComputeTime = performance.now();
  state.interactionStartTime = performance.now();
  state.answerStartTime = null;
  state.responseTimes = [];
  state.sessionEventCount = 0;
}

export function recordTelemetryEvent(
  studentId: string,
  sessionId: string,
  skillId: string,
  type: TelemetryEventType,
  value: number = 0,
  metadata: Record<string, unknown> = {}
): TelemetryEvent {
  const event: TelemetryEvent = {
    id: `te_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    sessionId,
    skillId,
    timestamp: performance.now(),
    wallTime: new Date().toISOString(),
    type,
    value,
    metadata,
  };

  state.eventBuffer.push(event);
  state.sessionEventCount++;

  // Track answer timing
  if (type === 'answer_start') {
    state.answerStartTime = event.timestamp;
  } else if (type === 'answer_submit' && state.answerStartTime !== null) {
    const responseTime = event.timestamp - state.answerStartTime;
    state.responseTimes.push(responseTime);
    state.answerStartTime = null;

    // Auto-detect hesitation/rush
    if (responseTime > state.config.hesitationThresholdMs) {
      recordTelemetryEvent(studentId, sessionId, skillId, 'hesitation_detected', responseTime);
    } else if (responseTime < state.config.rushThresholdMs) {
      recordTelemetryEvent(studentId, sessionId, skillId, 'rapid_response', responseTime);
    }
  }

  // Add to current window
  if (state.currentWindow) {
    state.currentWindow.events.push(event);
    // Cap events in window
    if (state.currentWindow.events.length > state.config.maxEventsInWindow) {
      state.currentWindow.events = state.currentWindow.events.slice(-state.config.maxEventsInWindow);
    }
  }

  return event;
}

export function computeRealTimeSignals(): RealTimeSignals {
  const now = performance.now();

  // Slide window if needed
  if (state.currentWindow && now > state.currentWindow.windowEnd) {
    state.previousWindows.push({ ...state.currentWindow });
    if (state.previousWindows.length > 5) {
      state.previousWindows = state.previousWindows.slice(-5);
    }
    state.currentWindow = {
      ...state.currentWindow,
      windowStart: now,
      windowEnd: now + state.config.windowSizeMs,
      events: [],
    };
  }

  const windowEvents = state.currentWindow?.events ?? [];
  const signals = computeSignalsFromEvents(windowEvents, now);

  // Apply EMA smoothing
  if (state.lastSignals) {
    const alpha = state.config.signalSmoothingFactor;
    const smoothed = smoothSignals(state.lastSignals, signals, alpha);
    state.lastSignals = smoothed;
    if (state.currentWindow) {
      state.currentWindow.signals = smoothed;
      state.currentWindow.trend = computeTrend(state.previousWindows, smoothed);
    }
    state.lastComputeTime = now;
    return smoothed;
  }

  state.lastSignals = signals;
  if (state.currentWindow) {
    state.currentWindow.signals = signals;
  }
  state.lastComputeTime = now;
  return signals;
}

export function getCurrentSignals(): RealTimeSignals {
  if (state.lastSignals) return state.lastSignals;
  return computeRealTimeSignals();
}

export function getCurrentTrend(): SignalTrend {
  return state.currentWindow?.trend ?? { direction: 'stable', velocity: 0, confidence: 0, predictedNext: {} };
}

export function getSessionTelemetrySummary(): {
  totalEvents: number;
  avgResponseTime: number;
  hesitationRate: number;
  rushRate: number;
  signals: RealTimeSignals;
  trend: SignalTrend;
} {
  const signals = getCurrentSignals();
  const trend = getCurrentTrend();
  const avgResponse = state.responseTimes.length > 0
    ? state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length
    : 0;

  const hesitations = state.eventBuffer.filter(e => e.type === 'hesitation_detected').length;
  const rushes = state.eventBuffer.filter(e => e.type === 'rapid_response').length;
  const total = state.responseTimes.length || 1;

  return {
    totalEvents: state.sessionEventCount,
    avgResponseTime: avgResponse,
    hesitationRate: hesitations / total,
    rushRate: rushes / total,
    signals,
    trend,
  };
}

export function persistTelemetrySession(studentId: string, sessionId: string): void {
  const summary = getSessionTelemetrySummary();
  const key = `telemetry_sessions_${studentId}`;
  const existing = loadUserData<Array<{ sessionId: string; summary: typeof summary; timestamp: string }>>(key) ?? [];
  existing.push({ sessionId, summary, timestamp: new Date().toISOString() });
  // Keep last 20 sessions
  const trimmed = existing.slice(-20);
  saveUserData(key, trimmed);
}

// ============ Signal Computation ============

function computeSignalsFromEvents(events: TelemetryEvent[], now: number): RealTimeSignals {
  if (events.length === 0) return createEmptySignals();

  const windowDuration = Math.max(1000, now - (events[0]?.timestamp ?? now));

  // Hesitation
  const hesitations = events.filter(e => e.type === 'hesitation_detected');
  const hesitationScore = Math.min(100, (hesitations.length / Math.max(1, events.length)) * 300);

  // Rush
  const rushes = events.filter(e => e.type === 'rapid_response');
  const rushScore = Math.min(100, (rushes.length / Math.max(1, events.length)) * 300);

  // Frustration (retries + skips + abandonment signals)
  const frustrationEvents = events.filter(e =>
    e.type === 'retry_attempt' || e.type === 'skip_attempt' ||
    e.type === 'frustration_indicator' || e.type === 'abandonment_signal'
  );
  const frustrationScore = Math.min(100, (frustrationEvents.length / Math.max(1, events.length)) * 200);

  // Engagement
  const engagementPositive = events.filter(e =>
    e.type === 'answer_submit' || e.type === 'engagement_spike' || e.type === 'drag_end'
  ).length;
  const engagementNegative = events.filter(e =>
    e.type === 'focus_lost' || e.type === 'engagement_drop' || e.type === 'abandonment_signal'
  ).length;
  const engagementRatio = engagementPositive / Math.max(1, engagementPositive + engagementNegative);
  const engagementScore = Math.min(100, engagementRatio * 100);

  // Cognitive Load (combination of hesitation, retries, corrections)
  const loadEvents = events.filter(e =>
    e.type === 'hesitation_detected' || e.type === 'retry_attempt' ||
    e.type === 'correction_made' || e.type === 'answer_change'
  );
  const cognitiveLoadScore = Math.min(100, (loadEvents.length / Math.max(1, events.length)) * 250);

  // Confidence (quick correct answers, no retries)
  const submits = events.filter(e => e.type === 'answer_submit');
  const quickCorrect = submits.filter(e => (e.metadata?.correct as boolean) && e.value < 5000).length;
  const confidenceScore = submits.length > 0
    ? Math.min(100, (quickCorrect / submits.length) * 100)
    : 50;

  // Rhythm stability (variance of response times)
  const responseTimes = state.responseTimes.slice(-10);
  let rhythmStability = 50;
  if (responseTimes.length >= 3) {
    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const variance = responseTimes.reduce((a, b) => a + (b - mean) ** 2, 0) / responseTimes.length;
    const cv = Math.sqrt(variance) / Math.max(1, mean); // coefficient of variation
    rhythmStability = Math.max(0, Math.min(100, 100 - cv * 100));
  }

  // Attention (focus events)
  const focusLost = events.filter(e => e.type === 'focus_lost').length;
  const focusRegained = events.filter(e => e.type === 'focus_regained').length;
  const attentionScore = Math.max(0, Math.min(100, 100 - focusLost * 20 + focusRegained * 10));

  // Retry intensity
  const retries = events.filter(e => e.type === 'retry_attempt').length;
  const retryIntensity = Math.min(100, (retries / Math.max(1, windowDuration / 10000)) * 50);

  // Abandonment risk
  const recentEvents = events.slice(-10);
  const recentAbandonment = recentEvents.filter(e =>
    e.type === 'abandonment_signal' || e.type === 'skip_attempt' || e.type === 'focus_lost'
  ).length;
  const abandonmentRisk = Math.min(100, recentAbandonment * 25);

  return {
    hesitationScore,
    rushScore,
    frustrationScore,
    engagementScore,
    cognitiveLoadScore,
    confidenceScore,
    rhythmStability,
    attentionScore,
    retryIntensity,
    abandonmentRisk,
  };
}

function smoothSignals(prev: RealTimeSignals, curr: RealTimeSignals, alpha: number): RealTimeSignals {
  return {
    hesitationScore: prev.hesitationScore * (1 - alpha) + curr.hesitationScore * alpha,
    rushScore: prev.rushScore * (1 - alpha) + curr.rushScore * alpha,
    frustrationScore: prev.frustrationScore * (1 - alpha) + curr.frustrationScore * alpha,
    engagementScore: prev.engagementScore * (1 - alpha) + curr.engagementScore * alpha,
    cognitiveLoadScore: prev.cognitiveLoadScore * (1 - alpha) + curr.cognitiveLoadScore * alpha,
    confidenceScore: prev.confidenceScore * (1 - alpha) + curr.confidenceScore * alpha,
    rhythmStability: prev.rhythmStability * (1 - alpha) + curr.rhythmStability * alpha,
    attentionScore: prev.attentionScore * (1 - alpha) + curr.attentionScore * alpha,
    retryIntensity: prev.retryIntensity * (1 - alpha) + curr.retryIntensity * alpha,
    abandonmentRisk: prev.abandonmentRisk * (1 - alpha) + curr.abandonmentRisk * alpha,
  };
}

function computeTrend(previousWindows: TelemetryWindow[], current: RealTimeSignals): SignalTrend {
  if (previousWindows.length < 2) {
    return { direction: 'stable', velocity: 0, confidence: 20, predictedNext: {} };
  }

  // Compare engagement trend across windows
  const engagementHistory = previousWindows.map(w => w.signals.engagementScore);
  engagementHistory.push(current.engagementScore);

  const frustrationHistory = previousWindows.map(w => w.signals.frustrationScore);
  frustrationHistory.push(current.frustrationScore);

  const engagementSlope = linearSlope(engagementHistory);
  const frustrationSlope = linearSlope(frustrationHistory);

  let direction: SignalTrend['direction'] = 'stable';
  if (engagementSlope > 2 && frustrationSlope < -1) direction = 'improving';
  else if (engagementSlope < -2 || frustrationSlope > 2) direction = 'declining';
  else if (Math.abs(engagementSlope) > 5 || Math.abs(frustrationSlope) > 5) direction = 'volatile';

  const velocity = (engagementSlope - frustrationSlope) / 2;
  const confidence = Math.min(100, previousWindows.length * 20);

  return {
    direction,
    velocity,
    confidence,
    predictedNext: {
      engagementScore: Math.max(0, Math.min(100, current.engagementScore + engagementSlope)),
      frustrationScore: Math.max(0, Math.min(100, current.frustrationScore + frustrationSlope)),
    },
  };
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function createEmptySignals(): RealTimeSignals {
  return {
    hesitationScore: 0,
    rushScore: 0,
    frustrationScore: 0,
    engagementScore: 50,
    cognitiveLoadScore: 0,
    confidenceScore: 50,
    rhythmStability: 50,
    attentionScore: 100,
    retryIntensity: 0,
    abandonmentRisk: 0,
  };
}

// ============ Utility Exports ============

export function getRecentResponseTimes(count: number = 10): number[] {
  return state.responseTimes.slice(-count);
}

export function getEventBuffer(): TelemetryEvent[] {
  return [...state.eventBuffer];
}

export function clearTelemetrySession(): void {
  state.currentWindow = null;
  state.previousWindows = [];
  state.eventBuffer = [];
  state.lastSignals = null;
  state.responseTimes = [];
  state.sessionEventCount = 0;
  state.answerStartTime = null;
  state.interactionStartTime = null;
}