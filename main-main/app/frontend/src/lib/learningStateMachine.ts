// Phase 5.5 Decision Engine - Learning State Machine
// States: NOT_STARTED → INTRODUCED → PRACTICING → DEVELOPING → PROFICIENT → MASTERED → NEEDS_REVIEW
// Each transition has clear conditions. No advancement without mastery.

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export type LearningStateId =
  | 'NOT_STARTED'
  | 'INTRODUCED'
  | 'PRACTICING'
  | 'DEVELOPING'
  | 'PROFICIENT'
  | 'MASTERED'
  | 'NEEDS_REVIEW';

export interface LearningState {
  id: LearningStateId;
  label: string;
  labelAr: string;
  description: string;
  color: string;
  minMastery: number;
  minAttempts: number;
  minConsecutiveCorrect: number;
  maxConsecutiveWrong: number; // If exceeded, may regress
}

export interface SkillLearningState {
  skillId: string;
  currentState: LearningStateId;
  previousState: LearningStateId | null;
  enteredAt: string;
  totalTimeInState: number; // seconds
  transitionHistory: StateTransition[];
  metrics: StateMetrics;
}

export interface StateTransition {
  from: LearningStateId;
  to: LearningStateId;
  timestamp: string;
  reason: TransitionReason;
  metrics: StateMetrics;
}

export type TransitionReason =
  | 'mastery_achieved'
  | 'sufficient_practice'
  | 'consecutive_correct'
  | 'assessment_passed'
  | 'decay_detected'
  | 'errors_accumulated'
  | 'time_elapsed'
  | 'manual_reset'
  | 'first_attempt';

export interface StateMetrics {
  mastery: number;
  attempts: number;
  correctCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  avgResponseTimeMs: number;
  daysSinceLastAttempt: number;
  retentionScore: number; // 0-100
}

export interface TransitionCheck {
  canAdvance: boolean;
  canRegress: boolean;
  nextState: LearningStateId | null;
  reason: TransitionReason | null;
  missingConditions: string[];
}

// ============ State Definitions ============

export const LEARNING_STATES: Record<LearningStateId, LearningState> = {
  NOT_STARTED: {
    id: 'NOT_STARTED',
    label: 'Not Started',
    labelAr: 'لم يبدأ',
    description: 'Student has not attempted this skill yet',
    color: '#94a3b8',
    minMastery: 0,
    minAttempts: 0,
    minConsecutiveCorrect: 0,
    maxConsecutiveWrong: 999,
  },
  INTRODUCED: {
    id: 'INTRODUCED',
    label: 'Introduced',
    labelAr: 'تم التقديم',
    description: 'Skill has been introduced, first attempts made',
    color: '#60a5fa',
    minMastery: 0,
    minAttempts: 1,
    minConsecutiveCorrect: 0,
    maxConsecutiveWrong: 10,
  },
  PRACTICING: {
    id: 'PRACTICING',
    label: 'Practicing',
    labelAr: 'يتدرب',
    description: 'Active practice, building understanding',
    color: '#fbbf24',
    minMastery: 30,
    minAttempts: 5,
    minConsecutiveCorrect: 2,
    maxConsecutiveWrong: 5,
  },
  DEVELOPING: {
    id: 'DEVELOPING',
    label: 'Developing',
    labelAr: 'يتطور',
    description: 'Showing consistent improvement',
    color: '#f97316',
    minMastery: 50,
    minAttempts: 10,
    minConsecutiveCorrect: 3,
    maxConsecutiveWrong: 4,
  },
  PROFICIENT: {
    id: 'PROFICIENT',
    label: 'Proficient',
    labelAr: 'متمكن',
    description: 'Can perform skill reliably with minimal support',
    color: '#22c55e',
    minMastery: 70,
    minAttempts: 15,
    minConsecutiveCorrect: 4,
    maxConsecutiveWrong: 3,
  },
  MASTERED: {
    id: 'MASTERED',
    label: 'Mastered',
    labelAr: 'أتقن',
    description: 'Full mastery demonstrated, ready for advancement',
    color: '#8b5cf6',
    minMastery: 85,
    minAttempts: 20,
    minConsecutiveCorrect: 5,
    maxConsecutiveWrong: 2,
  },
  NEEDS_REVIEW: {
    id: 'NEEDS_REVIEW',
    label: 'Needs Review',
    labelAr: 'يحتاج مراجعة',
    description: 'Previously mastered but showing decay',
    color: '#ef4444',
    minMastery: 0,
    minAttempts: 0,
    minConsecutiveCorrect: 0,
    maxConsecutiveWrong: 999,
  },
};

// State order for advancement
const STATE_ORDER: LearningStateId[] = [
  'NOT_STARTED', 'INTRODUCED', 'PRACTICING', 'DEVELOPING', 'PROFICIENT', 'MASTERED',
];

// ============ Core State Machine ============

/**
 * Get current learning state for a skill.
 */
export function getLearningState(skillId: string): SkillLearningState {
  const stored = loadUserData<SkillLearningState | null>(`lstate_${skillId}`, null);
  if (stored) return stored;

  return {
    skillId,
    currentState: 'NOT_STARTED',
    previousState: null,
    enteredAt: new Date().toISOString(),
    totalTimeInState: 0,
    transitionHistory: [],
    metrics: createEmptyMetrics(),
  };
}

/**
 * Check if a state transition should occur based on current metrics.
 */
export function checkTransition(
  skillId: string,
  metrics: StateMetrics
): TransitionCheck {
  const state = getLearningState(skillId);
  const currentStateDef = LEARNING_STATES[state.currentState];
  const currentIdx = STATE_ORDER.indexOf(state.currentState);

  const result: TransitionCheck = {
    canAdvance: false,
    canRegress: false,
    nextState: null,
    reason: null,
    missingConditions: [],
  };

  // Special case: NEEDS_REVIEW can go back to PRACTICING or higher
  if (state.currentState === 'NEEDS_REVIEW') {
    if (metrics.mastery >= 70 && metrics.consecutiveCorrect >= 3) {
      result.canAdvance = true;
      result.nextState = 'PROFICIENT';
      result.reason = 'mastery_achieved';
    } else if (metrics.mastery >= 50 && metrics.consecutiveCorrect >= 2) {
      result.canAdvance = true;
      result.nextState = 'DEVELOPING';
      result.reason = 'sufficient_practice';
    }
    return result;
  }

  // Check advancement conditions
  if (currentIdx < STATE_ORDER.length - 1) {
    const nextStateDef = LEARNING_STATES[STATE_ORDER[currentIdx + 1]];

    const masteryMet = metrics.mastery >= nextStateDef.minMastery;
    const attemptsMet = metrics.attempts >= nextStateDef.minAttempts;
    const consecutiveMet = metrics.consecutiveCorrect >= nextStateDef.minConsecutiveCorrect;

    if (masteryMet && attemptsMet && consecutiveMet) {
      result.canAdvance = true;
      result.nextState = STATE_ORDER[currentIdx + 1];
      result.reason = metrics.consecutiveCorrect >= 5 ? 'consecutive_correct' :
        metrics.mastery >= 85 ? 'mastery_achieved' : 'sufficient_practice';
    } else {
      if (!masteryMet) result.missingConditions.push(`الإتقان ${metrics.mastery}% < ${nextStateDef.minMastery}%`);
      if (!attemptsMet) result.missingConditions.push(`المحاولات ${metrics.attempts} < ${nextStateDef.minAttempts}`);
      if (!consecutiveMet) result.missingConditions.push(`متتالية صحيحة ${metrics.consecutiveCorrect} < ${nextStateDef.minConsecutiveCorrect}`);
    }
  }

  // Check regression conditions
  if (currentIdx > 1) { // Can't regress from NOT_STARTED or INTRODUCED
    // Regression due to errors
    if (metrics.consecutiveWrong > currentStateDef.maxConsecutiveWrong) {
      result.canRegress = true;
      result.nextState = STATE_ORDER[Math.max(1, currentIdx - 1)];
      result.reason = 'errors_accumulated';
    }

    // Regression due to decay (time elapsed without practice)
    if (metrics.daysSinceLastAttempt > 14 && metrics.retentionScore < 50) {
      result.canRegress = true;
      result.nextState = 'NEEDS_REVIEW';
      result.reason = 'decay_detected';
    }
  }

  return result;
}

/**
 * Execute a state transition.
 */
export function executeTransition(
  skillId: string,
  newState: LearningStateId,
  reason: TransitionReason,
  metrics: StateMetrics
): SkillLearningState {
  const current = getLearningState(skillId);

  const transition: StateTransition = {
    from: current.currentState,
    to: newState,
    timestamp: new Date().toISOString(),
    reason,
    metrics: { ...metrics },
  };

  const updated: SkillLearningState = {
    ...current,
    previousState: current.currentState,
    currentState: newState,
    enteredAt: new Date().toISOString(),
    totalTimeInState: 0,
    transitionHistory: [...current.transitionHistory.slice(-20), transition],
    metrics,
  };

  saveUserData(`lstate_${skillId}`, updated);
  return updated;
}

/**
 * Update metrics without necessarily transitioning.
 */
export function updateStateMetrics(skillId: string, metrics: Partial<StateMetrics>): SkillLearningState {
  const state = getLearningState(skillId);
  state.metrics = { ...state.metrics, ...metrics };
  saveUserData(`lstate_${skillId}`, state);
  return state;
}

/**
 * Get all skill states for a student.
 */
export function getAllSkillStates(skillIds: string[]): Record<string, SkillLearningState> {
  const result: Record<string, SkillLearningState> = {};
  for (const id of skillIds) {
    result[id] = getLearningState(id);
  }
  return result;
}

/**
 * Get progression summary.
 */
export function getProgressionSummary(skillIds: string[]): {
  stateDistribution: Record<LearningStateId, number>;
  totalMastered: number;
  totalInProgress: number;
  totalNotStarted: number;
  avgMastery: number;
  recentTransitions: StateTransition[];
} {
  const states = getAllSkillStates(skillIds);
  const distribution: Record<LearningStateId, number> = {
    NOT_STARTED: 0, INTRODUCED: 0, PRACTICING: 0,
    DEVELOPING: 0, PROFICIENT: 0, MASTERED: 0, NEEDS_REVIEW: 0,
  };

  let totalMastery = 0;
  const allTransitions: StateTransition[] = [];

  for (const state of Object.values(states)) {
    distribution[state.currentState]++;
    totalMastery += state.metrics.mastery;
    allTransitions.push(...state.transitionHistory);
  }

  const total = skillIds.length || 1;

  return {
    stateDistribution: distribution,
    totalMastered: distribution.MASTERED,
    totalInProgress: distribution.PRACTICING + distribution.DEVELOPING + distribution.PROFICIENT,
    totalNotStarted: distribution.NOT_STARTED,
    avgMastery: Math.round(totalMastery / total),
    recentTransitions: allTransitions
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 10),
  };
}

// ============ Helpers ============

function createEmptyMetrics(): StateMetrics {
  return {
    mastery: 0,
    attempts: 0,
    correctCount: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    avgResponseTimeMs: 0,
    daysSinceLastAttempt: 0,
    retentionScore: 100,
  };
}