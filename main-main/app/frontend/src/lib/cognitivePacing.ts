// Phase 5.5 Deep - Cognitive Pacing Engine
// Monitors cognitive load in real-time during learning sessions
// Enforces: max 2-3 new concepts per session, smart breaks, fatigue detection
// Integrates with personalizationEngine and adaptiveService

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface CognitivePacingState {
  sessionId: string;
  startedAt: string;
  newConceptsIntroduced: number;
  totalQuestionsAttempted: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  avgResponseTimeMs: number;
  responseTimeTrend: 'speeding_up' | 'stable' | 'slowing_down';
  fatigueLevel: number; // 0-100
  cognitiveLoad: number; // 0-100
  breaksTaken: number;
  lastBreakAt: string | null;
  minutesSinceStart: number;
  skillsAttempted: string[];
  alerts: PacingAlert[];
  phase: SessionPhase;
}

export type SessionPhase =
  | 'warmup'        // First 2-3 questions (easy review)
  | 'learning'      // Core learning phase
  | 'peak'          // High engagement, good performance
  | 'fatigue'       // Performance declining
  | 'cooldown';     // Wrapping up, easy questions

export interface PacingAlert {
  type: AlertType;
  timestamp: string;
  message: string;
  emoji: string;
  action: PacingAction;
  dismissed: boolean;
}

export type AlertType =
  | 'fatigue_detected'
  | 'cognitive_overload'
  | 'too_many_concepts'
  | 'break_needed'
  | 'session_too_long'
  | 'frustration_rising'
  | 'speed_declining'
  | 'engagement_dropping';

export type PacingAction =
  | 'suggest_break'
  | 'reduce_difficulty'
  | 'switch_activity'
  | 'end_session'
  | 'review_mode'
  | 'celebrate'
  | 'none';

export interface PacingRecommendation {
  action: PacingAction;
  reason: string;
  messageAr: string;
  emoji: string;
  priority: number; // 1-10
  durationSeconds: number; // How long the action should last
}

export interface SessionPacingConfig {
  maxNewConcepts: number;
  maxSessionMinutes: number;
  breakIntervalMinutes: number;
  breakDurationSeconds: number;
  fatigueThreshold: number;
  cognitiveLoadThreshold: number;
  minQuestionsBeforeNewConcept: number;
}

// ============ Configuration ============

const DEFAULT_CONFIG: SessionPacingConfig = {
  maxNewConcepts: 2,           // Max 2 new concepts per session for young learners
  maxSessionMinutes: 15,       // 15 min max for grades 1-2
  breakIntervalMinutes: 7,     // Break every 7 minutes
  breakDurationSeconds: 30,    // 30 second micro-break
  fatigueThreshold: 60,        // Alert at 60% fatigue
  cognitiveLoadThreshold: 75,  // Alert at 75% cognitive load
  minQuestionsBeforeNewConcept: 3, // Must answer 3 correctly before new concept
};

// Fatigue indicators weights
const FATIGUE_WEIGHTS = {
  timeElapsed: 0.25,        // Longer session = more fatigue
  consecutiveWrong: 0.30,   // Errors increase fatigue
  slowingDown: 0.20,        // Slower responses = fatigue
  noBreaks: 0.15,           // No breaks = fatigue builds
  manyQuestions: 0.10,      // Many questions = fatigue
};

// ============ Core Pacing Engine ============

/**
 * Initialize a new pacing session.
 */
export function initPacingSession(config?: Partial<SessionPacingConfig>): CognitivePacingState {
  return {
    sessionId: `pace_${Date.now()}`,
    startedAt: new Date().toISOString(),
    newConceptsIntroduced: 0,
    totalQuestionsAttempted: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    avgResponseTimeMs: 0,
    responseTimeTrend: 'stable',
    fatigueLevel: 0,
    cognitiveLoad: 0,
    breaksTaken: 0,
    lastBreakAt: null,
    minutesSinceStart: 0,
    skillsAttempted: [],
    alerts: [],
    phase: 'warmup',
  };
}

/**
 * Update pacing state after each answer.
 * Returns updated state and any recommendations.
 */
export function updatePacing(
  state: CognitivePacingState,
  responseTimeMs: number,
  isCorrect: boolean,
  skillId: string,
  isNewConcept: boolean,
  config: SessionPacingConfig = DEFAULT_CONFIG
): { state: CognitivePacingState; recommendation: PacingRecommendation | null } {
  const safeTime = Number.isFinite(responseTimeMs) && responseTimeMs > 0 ? responseTimeMs : 5000;
  const now = Date.now();
  const startTime = new Date(state.startedAt).getTime();
  const minutesSinceStart = Number.isFinite(startTime) ? (now - startTime) / 60000 : 0;

  // Update basic counters
  const updated: CognitivePacingState = {
    ...state,
    totalQuestionsAttempted: state.totalQuestionsAttempted + 1,
    consecutiveCorrect: isCorrect ? state.consecutiveCorrect + 1 : 0,
    consecutiveWrong: isCorrect ? 0 : state.consecutiveWrong + 1,
    minutesSinceStart,
    skillsAttempted: state.skillsAttempted.includes(skillId)
      ? state.skillsAttempted
      : [...state.skillsAttempted, skillId],
  };

  // Track new concepts
  if (isNewConcept) {
    updated.newConceptsIntroduced = state.newConceptsIntroduced + 1;
  }

  // Update response time average and trend
  const prevAvg = state.avgResponseTimeMs || safeTime;
  updated.avgResponseTimeMs = prevAvg * 0.7 + safeTime * 0.3; // Exponential moving average

  if (safeTime > prevAvg * 1.3) {
    updated.responseTimeTrend = 'slowing_down';
  } else if (safeTime < prevAvg * 0.7) {
    updated.responseTimeTrend = 'speeding_up';
  } else {
    updated.responseTimeTrend = 'stable';
  }

  // Calculate fatigue level
  updated.fatigueLevel = calculateFatigue(updated, config);

  // Calculate cognitive load
  updated.cognitiveLoad = calculateCognitiveLoad(updated, config);

  // Determine session phase
  updated.phase = determinePhase(updated, config);

  // Check for alerts and generate recommendation
  const recommendation = checkForAlerts(updated, config);

  return { state: updated, recommendation };
}

/**
 * Record that a break was taken.
 */
export function recordBreak(state: CognitivePacingState): CognitivePacingState {
  return {
    ...state,
    breaksTaken: state.breaksTaken + 1,
    lastBreakAt: new Date().toISOString(),
    fatigueLevel: Math.max(0, state.fatigueLevel - 20), // Break reduces fatigue
    cognitiveLoad: Math.max(0, state.cognitiveLoad - 15),
  };
}

/**
 * Check if a new concept can be introduced.
 */
export function canIntroduceNewConcept(
  state: CognitivePacingState,
  config: SessionPacingConfig = DEFAULT_CONFIG
): { allowed: boolean; reason: string } {
  if (state.newConceptsIntroduced >= config.maxNewConcepts) {
    return {
      allowed: false,
      reason: `وصلت للحد الأقصى (${config.maxNewConcepts} مفاهيم جديدة). أكمل التدريب على ما تعلمته.`,
    };
  }

  if (state.fatigueLevel > config.fatigueThreshold) {
    return {
      allowed: false,
      reason: 'مستوى التعب مرتفع. خذ استراحة أولاً.',
    };
  }

  if (state.cognitiveLoad > config.cognitiveLoadThreshold) {
    return {
      allowed: false,
      reason: 'الحمل المعرفي مرتفع. تدرب أكثر على المفاهيم الحالية.',
    };
  }

  if (state.consecutiveCorrect < config.minQuestionsBeforeNewConcept) {
    return {
      allowed: false,
      reason: `أجب ${config.minQuestionsBeforeNewConcept - state.consecutiveCorrect} أسئلة صحيحة أولاً.`,
    };
  }

  return { allowed: true, reason: '' };
}

// ============ Internal Calculations ============

function calculateFatigue(state: CognitivePacingState, config: SessionPacingConfig): number {
  let fatigue = 0;

  // Time-based fatigue
  const timeRatio = Math.min(1, state.minutesSinceStart / config.maxSessionMinutes);
  fatigue += timeRatio * 100 * FATIGUE_WEIGHTS.timeElapsed;

  // Error-based fatigue
  const errorFatigue = Math.min(1, state.consecutiveWrong / 5);
  fatigue += errorFatigue * 100 * FATIGUE_WEIGHTS.consecutiveWrong;

  // Speed decline fatigue
  if (state.responseTimeTrend === 'slowing_down') {
    fatigue += 60 * FATIGUE_WEIGHTS.slowingDown;
  }

  // No-break fatigue
  const minutesSinceBreak = state.lastBreakAt
    ? (Date.now() - new Date(state.lastBreakAt).getTime()) / 60000
    : state.minutesSinceStart;
  const breakOverdue = Math.min(1, Math.max(0, minutesSinceBreak - config.breakIntervalMinutes) / config.breakIntervalMinutes);
  fatigue += breakOverdue * 100 * FATIGUE_WEIGHTS.noBreaks;

  // Question volume fatigue
  const questionFatigue = Math.min(1, state.totalQuestionsAttempted / 20);
  fatigue += questionFatigue * 100 * FATIGUE_WEIGHTS.manyQuestions;

  return Math.max(0, Math.min(100, Math.round(fatigue)));
}

function calculateCognitiveLoad(state: CognitivePacingState, config: SessionPacingConfig): number {
  let load = 0;

  // New concepts contribute heavily
  load += (state.newConceptsIntroduced / Math.max(1, config.maxNewConcepts)) * 40;

  // Different skills attempted
  load += Math.min(30, state.skillsAttempted.length * 8);

  // Consecutive wrong = overload
  load += Math.min(30, state.consecutiveWrong * 10);

  return Math.max(0, Math.min(100, Math.round(load)));
}

function determinePhase(state: CognitivePacingState, config: SessionPacingConfig): SessionPhase {
  if (state.totalQuestionsAttempted <= 3) return 'warmup';
  if (state.fatigueLevel > 70) return 'fatigue';
  if (state.minutesSinceStart > config.maxSessionMinutes * 0.85) return 'cooldown';
  if (state.consecutiveCorrect >= 3 && state.fatigueLevel < 30) return 'peak';
  return 'learning';
}

function checkForAlerts(
  state: CognitivePacingState,
  config: SessionPacingConfig
): PacingRecommendation | null {
  // Priority order: session too long > fatigue > overload > break needed > too many concepts

  // Session too long
  if (state.minutesSinceStart > config.maxSessionMinutes) {
    return {
      action: 'end_session',
      reason: 'session_too_long',
      messageAr: 'أحسنت! لقد تدربت بما يكفي اليوم. استرح وعد غداً 🌙',
      emoji: '🌙',
      priority: 10,
      durationSeconds: 0,
    };
  }

  // High fatigue
  if (state.fatigueLevel >= config.fatigueThreshold && state.phase === 'fatigue') {
    return {
      action: 'suggest_break',
      reason: 'fatigue_detected',
      messageAr: 'يبدو أنك متعب قليلاً. خذ استراحة قصيرة! 🧘',
      emoji: '🧘',
      priority: 8,
      durationSeconds: config.breakDurationSeconds,
    };
  }

  // Cognitive overload
  if (state.cognitiveLoad >= config.cognitiveLoadThreshold) {
    return {
      action: 'review_mode',
      reason: 'cognitive_overload',
      messageAr: 'خلنا نراجع ما تعلمناه قبل ما نكمل 📚',
      emoji: '📚',
      priority: 7,
      durationSeconds: 60,
    };
  }

  // Frustration (many consecutive wrong)
  if (state.consecutiveWrong >= 4) {
    return {
      action: 'reduce_difficulty',
      reason: 'frustration_rising',
      messageAr: 'لا بأس! خلنا نجرب أسئلة أسهل 🌱',
      emoji: '🌱',
      priority: 6,
      durationSeconds: 0,
    };
  }

  // Break overdue
  const minutesSinceBreak = state.lastBreakAt
    ? (Date.now() - new Date(state.lastBreakAt).getTime()) / 60000
    : state.minutesSinceStart;
  if (minutesSinceBreak > config.breakIntervalMinutes && state.totalQuestionsAttempted > 5) {
    return {
      action: 'suggest_break',
      reason: 'break_needed',
      messageAr: 'وقت استراحة قصيرة! حرك جسمك قليلاً 🏃',
      emoji: '🏃',
      priority: 4,
      durationSeconds: config.breakDurationSeconds,
    };
  }

  // Celebrate peak performance
  if (state.phase === 'peak' && state.consecutiveCorrect >= 5) {
    return {
      action: 'celebrate',
      reason: 'engagement_dropping', // reuse type for positive
      messageAr: 'ممتاز! أنت في قمة أدائك! 🌟🎉',
      emoji: '🎉',
      priority: 2,
      durationSeconds: 3,
    };
  }

  return null;
}

// ============ Persistence ============

export function savePacingSession(state: CognitivePacingState): void {
  const history = loadUserData<CognitivePacingState[]>('pacingHistory', []);
  history.push(state);
  saveUserData('pacingHistory', history.slice(-30));
}

export function getPacingHistory(): CognitivePacingState[] {
  return loadUserData<CognitivePacingState[]>('pacingHistory', []);
}

/**
 * Get average session stats for adaptive config adjustment.
 */
export function getAdaptiveConfig(age: number): SessionPacingConfig {
  // Younger children need shorter sessions and fewer concepts
  if (age <= 6) {
    return {
      ...DEFAULT_CONFIG,
      maxNewConcepts: 1,
      maxSessionMinutes: 10,
      breakIntervalMinutes: 5,
      fatigueThreshold: 50,
    };
  }
  if (age <= 7) {
    return {
      ...DEFAULT_CONFIG,
      maxNewConcepts: 2,
      maxSessionMinutes: 12,
      breakIntervalMinutes: 6,
    };
  }
  // Age 8+
  return {
    ...DEFAULT_CONFIG,
    maxNewConcepts: 3,
    maxSessionMinutes: 18,
    breakIntervalMinutes: 8,
  };
}