// Real-Time Adaptive Educational Intelligence Sprint
// Module 3: Real-Time Mastery Tracking
// Continuous mastery updates DURING interaction, not just post-activity
// Uses Bayesian updates with telemetry-weighted evidence

import { loadUserData, saveUserData } from './pilotStorage';
import { type RealTimeSignals } from './realTimeTelemetry';

// ============ Types ============

export interface RealTimeMasteryState {
  skillId: string;
  studentId: string;
  mastery: number; // 0-100
  confidence: number; // 0-100 (how sure we are about mastery estimate)
  velocity: number; // rate of mastery change per interaction
  lastUpdated: string;
  evidenceCount: number;
  streakCorrect: number;
  streakWrong: number;
  microUpdates: MicroMasteryUpdate[];
}

export interface MicroMasteryUpdate {
  timestamp: string;
  delta: number; // mastery change
  evidence: MasteryEvidence;
  masteryAfter: number;
  confidenceAfter: number;
}

export interface MasteryEvidence {
  type: 'correct' | 'incorrect' | 'partial' | 'hint_used' | 'self_corrected' | 'timeout';
  responseTimeMs: number;
  difficulty: number; // 1-10
  hesitationDetected: boolean;
  rushDetected: boolean;
  attemptNumber: number;
  cognitiveLoadAtTime: number;
  confidenceAtTime: number;
}

export interface MasteryThresholds {
  notStarted: number; // below this = not started (default 5)
  introduced: number; // below this = introduced (default 20)
  practicing: number; // below this = practicing (default 40)
  developing: number; // below this = developing (default 60)
  proficient: number; // below this = proficient (default 80)
  mastered: number; // above this = mastered (default 90)
}

export type MasteryLevel = 'not_started' | 'introduced' | 'practicing' | 'developing' | 'proficient' | 'mastered';

// ============ Constants ============

const DEFAULT_THRESHOLDS: MasteryThresholds = {
  notStarted: 5,
  introduced: 20,
  practicing: 40,
  developing: 60,
  proficient: 80,
  mastered: 90,
};

// Bayesian update parameters
const BASE_CORRECT_GAIN = 8; // base mastery gain for correct answer
const BASE_INCORRECT_LOSS = 5; // base mastery loss for incorrect
const DIFFICULTY_MULTIPLIER = 0.15; // extra gain per difficulty level
const SPEED_BONUS = 0.3; // bonus for fast correct answers
const HESITATION_PENALTY = 0.2; // reduced gain if hesitating
const HINT_PENALTY = 0.5; // reduced gain if hint was used
const SELF_CORRECT_BONUS = 0.4; // partial credit for self-correction
const CONFIDENCE_DECAY = 0.02; // confidence decays slightly each update without evidence
const MAX_MICRO_UPDATES = 30; // keep last N micro updates

// ============ State ============

const masteryStates: Map<string, RealTimeMasteryState> = new Map();

// ============ Core Functions ============

export function initRealTimeMastery(studentId: string, skillId: string, initialMastery?: number): RealTimeMasteryState {
  const key = `${studentId}_${skillId}`;
  const existing = masteryStates.get(key);
  if (existing) return existing;

  // Try loading from persistence
  const persisted = loadUserData<RealTimeMasteryState>(`rtmastery_${key}`);
  if (persisted) {
    masteryStates.set(key, persisted);
    return persisted;
  }

  const state: RealTimeMasteryState = {
    skillId,
    studentId,
    mastery: initialMastery ?? 0,
    confidence: initialMastery !== undefined ? 50 : 10,
    velocity: 0,
    lastUpdated: new Date().toISOString(),
    evidenceCount: 0,
    streakCorrect: 0,
    streakWrong: 0,
    microUpdates: [],
  };

  masteryStates.set(key, state);
  return state;
}

export function updateMasteryRealTime(
  studentId: string,
  skillId: string,
  evidence: MasteryEvidence,
  signals?: RealTimeSignals
): RealTimeMasteryState {
  const key = `${studentId}_${skillId}`;
  let state = masteryStates.get(key);
  if (!state) {
    state = initRealTimeMastery(studentId, skillId);
  }

  // Calculate mastery delta based on evidence
  const delta = calculateMasteryDelta(evidence, state, signals);

  // Apply update with bounds
  const newMastery = Math.max(0, Math.min(100, state.mastery + delta));

  // Update confidence based on evidence consistency
  const newConfidence = updateConfidence(state, evidence, delta);

  // Calculate velocity (rate of change)
  const velocity = calculateVelocity(state.microUpdates, delta);

  // Update streaks
  let streakCorrect = state.streakCorrect;
  let streakWrong = state.streakWrong;
  if (evidence.type === 'correct') {
    streakCorrect++;
    streakWrong = 0;
  } else if (evidence.type === 'incorrect') {
    streakWrong++;
    streakCorrect = 0;
  } else if (evidence.type === 'self_corrected') {
    streakCorrect++;
    streakWrong = 0;
  }

  // Record micro update
  const microUpdate: MicroMasteryUpdate = {
    timestamp: new Date().toISOString(),
    delta,
    evidence,
    masteryAfter: newMastery,
    confidenceAfter: newConfidence,
  };

  const microUpdates = [...state.microUpdates, microUpdate].slice(-MAX_MICRO_UPDATES);

  // Build new state
  const newState: RealTimeMasteryState = {
    ...state,
    mastery: newMastery,
    confidence: newConfidence,
    velocity,
    lastUpdated: new Date().toISOString(),
    evidenceCount: state.evidenceCount + 1,
    streakCorrect,
    streakWrong,
    microUpdates,
  };

  masteryStates.set(key, newState);

  // Auto-persist every 5 updates
  if (newState.evidenceCount % 5 === 0) {
    persistMastery(studentId, skillId);
  }

  return newState;
}

export function getMasteryLevel(studentId: string, skillId: string): MasteryLevel {
  const state = getRealTimeMastery(studentId, skillId);
  if (!state) return 'not_started';
  return masteryToLevel(state.mastery);
}

export function getRealTimeMastery(studentId: string, skillId: string): RealTimeMasteryState | null {
  const key = `${studentId}_${skillId}`;
  return masteryStates.get(key) ?? null;
}

export function getAllSkillMasteries(studentId: string): RealTimeMasteryState[] {
  const results: RealTimeMasteryState[] = [];
  masteryStates.forEach((state) => {
    if (state.studentId === studentId) {
      results.push(state);
    }
  });
  return results;
}

export function getMasterySnapshot(studentId: string): Record<string, { mastery: number; level: MasteryLevel; velocity: number }> {
  const snapshot: Record<string, { mastery: number; level: MasteryLevel; velocity: number }> = {};
  masteryStates.forEach((state) => {
    if (state.studentId === studentId) {
      snapshot[state.skillId] = {
        mastery: state.mastery,
        level: masteryToLevel(state.mastery),
        velocity: state.velocity,
      };
    }
  });
  return snapshot;
}

export function persistMastery(studentId: string, skillId: string): void {
  const key = `${studentId}_${skillId}`;
  const state = masteryStates.get(key);
  if (state) {
    saveUserData(`rtmastery_${key}`, state);
  }
}

export function persistAllMasteries(studentId: string): void {
  masteryStates.forEach((state) => {
    if (state.studentId === studentId) {
      saveUserData(`rtmastery_${state.studentId}_${state.skillId}`, state);
    }
  });
}

// ============ Calculation Helpers ============

function calculateMasteryDelta(
  evidence: MasteryEvidence,
  state: RealTimeMasteryState,
  signals?: RealTimeSignals
): number {
  let delta = 0;

  switch (evidence.type) {
    case 'correct': {
      delta = BASE_CORRECT_GAIN;
      // Difficulty bonus
      delta += evidence.difficulty * DIFFICULTY_MULTIPLIER * BASE_CORRECT_GAIN;
      // Speed bonus (fast correct = more confident mastery)
      if (evidence.responseTimeMs < 3000 && !evidence.rushDetected) {
        delta *= (1 + SPEED_BONUS);
      }
      // Hesitation penalty (correct but hesitant = less confident)
      if (evidence.hesitationDetected) {
        delta *= (1 - HESITATION_PENALTY);
      }
      // Streak bonus
      if (state.streakCorrect >= 3) {
        delta *= 1.2;
      }
      // High mastery = diminishing returns
      if (state.mastery > 80) {
        delta *= 0.5;
      }
      break;
    }
    case 'incorrect': {
      delta = -BASE_INCORRECT_LOSS;
      // Higher difficulty = less penalty
      delta += evidence.difficulty * 0.3;
      // Streak penalty (consecutive wrong = bigger loss)
      if (state.streakWrong >= 2) {
        delta *= 1.3;
      }
      // Low mastery floor (don't punish too much at low levels)
      if (state.mastery < 20) {
        delta *= 0.5;
      }
      break;
    }
    case 'partial': {
      delta = BASE_CORRECT_GAIN * 0.4;
      break;
    }
    case 'hint_used': {
      // Correct with hint = reduced gain
      delta = BASE_CORRECT_GAIN * HINT_PENALTY;
      break;
    }
    case 'self_corrected': {
      // Self-correction shows metacognition
      delta = BASE_CORRECT_GAIN * SELF_CORRECT_BONUS;
      break;
    }
    case 'timeout': {
      delta = -BASE_INCORRECT_LOSS * 0.3;
      break;
    }
  }

  // Telemetry signal modifiers
  if (signals) {
    // High cognitive load reduces gains
    if (signals.cognitiveLoadScore > 70) {
      delta *= 0.8;
    }
    // High frustration reduces penalties (student is struggling, be gentle)
    if (signals.frustrationScore > 60 && delta < 0) {
      delta *= 0.7;
    }
    // Rush detection invalidates speed bonus
    if (signals.rushScore > 70 && delta > 0) {
      delta *= 0.6;
    }
  }

  return delta;
}

function updateConfidence(state: RealTimeMasteryState, evidence: MasteryEvidence, delta: number): number {
  let confidence = state.confidence;

  // Consistent evidence increases confidence
  if (
    (evidence.type === 'correct' && state.streakCorrect >= 2) ||
    (evidence.type === 'incorrect' && state.streakWrong >= 2)
  ) {
    confidence = Math.min(100, confidence + 3);
  }

  // Contradictory evidence decreases confidence
  if (
    (evidence.type === 'correct' && state.streakWrong > 0) ||
    (evidence.type === 'incorrect' && state.streakCorrect > 0)
  ) {
    confidence = Math.max(10, confidence - 5);
  }

  // More evidence = more confidence (up to a point)
  if (state.evidenceCount < 10) {
    confidence = Math.min(100, confidence + 2);
  }

  // Natural decay
  confidence = Math.max(10, confidence - CONFIDENCE_DECAY * 100);

  return confidence;
}

function calculateVelocity(microUpdates: MicroMasteryUpdate[], currentDelta: number): number {
  if (microUpdates.length < 2) return currentDelta;

  // Use last 5 updates to calculate velocity
  const recent = microUpdates.slice(-5);
  const deltas = recent.map(u => u.delta);
  deltas.push(currentDelta);

  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

function masteryToLevel(mastery: number): MasteryLevel {
  if (mastery < DEFAULT_THRESHOLDS.notStarted) return 'not_started';
  if (mastery < DEFAULT_THRESHOLDS.introduced) return 'introduced';
  if (mastery < DEFAULT_THRESHOLDS.practicing) return 'practicing';
  if (mastery < DEFAULT_THRESHOLDS.developing) return 'developing';
  if (mastery < DEFAULT_THRESHOLDS.proficient) return 'proficient';
  return 'mastered';
}

// ============ Exports for Testing/Admin ============

export function resetMasteryState(studentId: string, skillId: string): void {
  const key = `${studentId}_${skillId}`;
  masteryStates.delete(key);
}

export function getThresholds(): MasteryThresholds {
  return { ...DEFAULT_THRESHOLDS };
}