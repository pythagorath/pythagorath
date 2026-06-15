// Phase 5.5 Decision Engine - Central Adaptive Decision Engine
// Aggregates ALL signals from subsystems and makes unified educational decisions
// Every decision includes reasoning. Response target: <100ms

import { loadUserData, saveUserData } from './pilotStorage';
import type { LearnerProfile } from './personalizationEngine';
import type { CognitivePacingState, PacingRecommendation } from './cognitivePacing';
import type { MisconceptionSignal } from './misconceptionDetector';
import type { SkillRecommendation } from './skillGraphEnhanced';
import type { FeedbackResult } from './intelligentFeedback';
import { getLearningState, type LearningStateId } from './learningStateMachine';
import { queryKnowledgeGraph, type KnowledgeGapAnalysis } from './curriculumKnowledgeGraph';
import { calibrateDifficulty, type DifficultyLevel } from './difficultyCalibration';

// ============ Types ============

export interface StudentState {
  userId: string;
  profile: LearnerProfile;
  currentSkillId: string | null;
  sessionDurationMs: number;
  questionsAttempted: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  fatigueLevel: number;
  cognitiveLoad: number;
  activeMisconceptions: MisconceptionSignal[];
  recentSkillStates: Record<string, LearningStateId>;
  pacingState: CognitivePacingState | null;
  lastDecision: Decision | null;
}

export interface Decision {
  id: string;
  timestamp: string;
  type: DecisionType;
  action: DecisionAction;
  reasoning: DecisionReasoning;
  confidence: number; // 0-100
  priority: number; // 1-10
  metadata: Record<string, unknown>;
}

export type DecisionType =
  | 'next_activity'
  | 'difficulty_adjustment'
  | 'scaffolding_change'
  | 'pacing_intervention'
  | 'remediation_trigger'
  | 'session_control'
  | 'skill_transition'
  | 'feedback_style';

export interface DecisionAction {
  name: string;
  targetSkillId: string | null;
  difficulty: DifficultyLevel | null;
  scaffoldLevel: 'none' | 'hint' | 'guided' | 'full_support' | null;
  activityType: ActivityType | null;
  sessionAction: 'continue' | 'break' | 'switch' | 'end' | null;
  feedbackIntensity: 'minimal' | 'moderate' | 'detailed' | null;
}

export type ActivityType =
  | 'new_concept'
  | 'guided_practice'
  | 'independent_practice'
  | 'assessment'
  | 'review'
  | 'remediation'
  | 'challenge'
  | 'warm_up'
  | 'cool_down'
  | 'break';

export interface DecisionReasoning {
  primaryFactor: string;
  signals: SignalSummary[];
  alternatives: string[];
  tradeoffs: string;
}

export interface SignalSummary {
  source: string;
  signal: string;
  weight: number;
  value: number | string;
}

// ============ Signal Weights ============

const SIGNAL_WEIGHTS = {
  fatigue: 0.20,
  misconception: 0.25,
  mastery: 0.20,
  pacing: 0.15,
  engagement: 0.10,
  prerequisite: 0.10,
};

// ============ Core Decision Engine ============

/**
 * Main entry point: Get the next educational decision given current student state.
 * Designed for <100ms response time.
 */
export function getNextDecision(state: StudentState): Decision {
  const signals = collectSignals(state);
  const decision = synthesizeDecision(signals, state);

  // Log decision for analytics
  logDecision(decision, state.userId);

  return decision;
}

/**
 * Collect all signals from subsystems.
 */
function collectSignals(state: StudentState): SignalSummary[] {
  const signals: SignalSummary[] = [];

  // Fatigue signal
  signals.push({
    source: 'cognitivePacing',
    signal: 'fatigue_level',
    weight: SIGNAL_WEIGHTS.fatigue,
    value: state.fatigueLevel,
  });

  // Cognitive load signal
  signals.push({
    source: 'cognitivePacing',
    signal: 'cognitive_load',
    weight: SIGNAL_WEIGHTS.pacing,
    value: state.cognitiveLoad,
  });

  // Misconception signal
  const hasMisconception = state.activeMisconceptions.length > 0;
  const topMisconception = state.activeMisconceptions[0];
  signals.push({
    source: 'misconceptionDetector',
    signal: 'active_misconception',
    weight: SIGNAL_WEIGHTS.misconception,
    value: hasMisconception ? topMisconception.confidence : 0,
  });

  // Mastery/performance signal
  const performanceScore = calculatePerformanceScore(state);
  signals.push({
    source: 'masteryEngine',
    signal: 'performance_score',
    weight: SIGNAL_WEIGHTS.mastery,
    value: performanceScore,
  });

  // Engagement signal
  signals.push({
    source: 'personalizationEngine',
    signal: 'engagement',
    weight: SIGNAL_WEIGHTS.engagement,
    value: state.profile.engagement,
  });

  // Consecutive errors signal
  signals.push({
    source: 'sessionTracker',
    signal: 'consecutive_wrong',
    weight: 0.15,
    value: state.consecutiveWrong,
  });

  return signals;
}

/**
 * Synthesize a decision from collected signals.
 * Priority order: safety > remediation > progression > optimization
 */
function synthesizeDecision(signals: SignalSummary[], state: StudentState): Decision {
  const now = new Date().toISOString();
  const id = `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // Priority 1: Session safety (fatigue/overload)
  const fatigue = getSignalValue(signals, 'fatigue_level');
  const cogLoad = getSignalValue(signals, 'cognitive_load');

  if (fatigue > 80 || state.sessionDurationMs > 20 * 60 * 1000) {
    return createDecision(id, now, 'session_control', {
      name: 'end_session',
      targetSkillId: null,
      difficulty: null,
      scaffoldLevel: null,
      activityType: 'cool_down',
      sessionAction: 'end',
      feedbackIntensity: 'minimal',
    }, {
      primaryFactor: 'fatigue_critical',
      signals,
      alternatives: ['suggest_break'],
      tradeoffs: 'Student safety prioritized over learning progress',
    }, 95, 10);
  }

  if (fatigue > 60 || cogLoad > 75) {
    return createDecision(id, now, 'pacing_intervention', {
      name: 'suggest_break',
      targetSkillId: null,
      difficulty: null,
      scaffoldLevel: null,
      activityType: 'break',
      sessionAction: 'break',
      feedbackIntensity: 'moderate',
    }, {
      primaryFactor: fatigue > 60 ? 'fatigue_high' : 'cognitive_overload',
      signals,
      alternatives: ['reduce_difficulty', 'switch_activity'],
      tradeoffs: 'Short-term pause for long-term retention',
    }, 85, 9);
  }

  // Priority 2: Misconception remediation
  const misconceptionConf = getSignalValue(signals, 'active_misconception');
  if (misconceptionConf > 65 && state.activeMisconceptions.length > 0) {
    const misconception = state.activeMisconceptions[0];
    return createDecision(id, now, 'remediation_trigger', {
      name: 'start_remediation',
      targetSkillId: misconception.skillContext,
      difficulty: 'easy',
      scaffoldLevel: 'full_support',
      activityType: 'remediation',
      sessionAction: 'continue',
      feedbackIntensity: 'detailed',
    }, {
      primaryFactor: `misconception_${misconception.type}`,
      signals,
      alternatives: ['reduce_difficulty', 'switch_skill'],
      tradeoffs: 'Address root cause vs continue practice',
    }, misconceptionConf, 8);
  }

  // Priority 3: Frustration management
  if (state.consecutiveWrong >= 4) {
    return createDecision(id, now, 'difficulty_adjustment', {
      name: 'reduce_difficulty',
      targetSkillId: state.currentSkillId,
      difficulty: 'easy',
      scaffoldLevel: 'guided',
      activityType: 'guided_practice',
      sessionAction: 'continue',
      feedbackIntensity: 'detailed',
    }, {
      primaryFactor: 'frustration_rising',
      signals,
      alternatives: ['switch_skill', 'show_worked_example'],
      tradeoffs: 'Maintain motivation vs challenge level',
    }, 80, 7);
  }

  // Priority 4: Normal progression
  const performance = getSignalValue(signals, 'performance_score');

  if (state.consecutiveCorrect >= 5 && performance > 80) {
    // Student is excelling - increase challenge
    return createDecision(id, now, 'difficulty_adjustment', {
      name: 'increase_challenge',
      targetSkillId: state.currentSkillId,
      difficulty: 'hard',
      scaffoldLevel: 'none',
      activityType: 'challenge',
      sessionAction: 'continue',
      feedbackIntensity: 'minimal',
    }, {
      primaryFactor: 'high_performance_streak',
      signals,
      alternatives: ['introduce_new_concept', 'assessment'],
      tradeoffs: 'Push growth vs risk of overconfidence',
    }, 75, 5);
  }

  if (state.consecutiveCorrect >= 3 && performance > 60) {
    // Good progress - consider new concept or assessment
    const currentState = state.currentSkillId
      ? state.recentSkillStates[state.currentSkillId]
      : null;

    if (currentState === 'PROFICIENT' || currentState === 'MASTERED') {
      return createDecision(id, now, 'skill_transition', {
        name: 'advance_to_next',
        targetSkillId: null, // Will be resolved by skill graph
        difficulty: 'medium',
        scaffoldLevel: 'hint',
        activityType: 'new_concept',
        sessionAction: 'continue',
        feedbackIntensity: 'moderate',
      }, {
        primaryFactor: 'skill_mastered_advance',
        signals,
        alternatives: ['assessment_first', 'review_related'],
        tradeoffs: 'Progress forward vs consolidate current',
      }, 70, 5);
    }
  }

  // Default: continue current activity at calibrated difficulty
  const calibratedDifficulty = calibrateDifficulty(
    state.currentSkillId || '',
    performance,
    state.consecutiveCorrect,
    state.consecutiveWrong
  );

  return createDecision(id, now, 'next_activity', {
    name: 'continue_practice',
    targetSkillId: state.currentSkillId,
    difficulty: calibratedDifficulty.level,
    scaffoldLevel: performance < 50 ? 'guided' : 'hint',
    activityType: 'independent_practice',
    sessionAction: 'continue',
    feedbackIntensity: 'moderate',
  }, {
    primaryFactor: 'normal_progression',
    signals,
    alternatives: ['review', 'new_concept'],
    tradeoffs: 'Steady practice for skill consolidation',
  }, 60, 4);
}

// ============ Helpers ============

function createDecision(
  id: string,
  timestamp: string,
  type: DecisionType,
  action: DecisionAction,
  reasoning: DecisionReasoning,
  confidence: number,
  priority: number
): Decision {
  return { id, timestamp, type, action, reasoning, confidence, priority, metadata: {} };
}

function getSignalValue(signals: SignalSummary[], signalName: string): number {
  const signal = signals.find(s => s.signal === signalName);
  return typeof signal?.value === 'number' ? signal.value : 0;
}

function calculatePerformanceScore(state: StudentState): number {
  const total = state.questionsAttempted;
  if (total === 0) return 50;
  const accuracy = ((total - state.consecutiveWrong) / total) * 100;
  // Weight recent performance more
  const recentBonus = state.consecutiveCorrect * 5;
  const recentPenalty = state.consecutiveWrong * 8;
  return Math.max(0, Math.min(100, accuracy + recentBonus - recentPenalty));
}

// ============ Decision Logging ============

function logDecision(decision: Decision, userId: string): void {
  const key = `decisions_${userId}`;
  const history = loadUserData<Decision[]>(key, []);
  history.push(decision);
  saveUserData(key, history.slice(-50));
}

export function getDecisionHistory(userId: string): Decision[] {
  return loadUserData<Decision[]>(`decisions_${userId}`, []);
}

/**
 * Get decision analytics summary.
 */
export function getDecisionAnalytics(userId: string): {
  totalDecisions: number;
  typeDistribution: Record<DecisionType, number>;
  avgConfidence: number;
  topReasons: string[];
} {
  const history = getDecisionHistory(userId);
  const typeDistribution: Record<string, number> = {};
  let totalConfidence = 0;
  const reasonCounts: Record<string, number> = {};

  for (const d of history) {
    typeDistribution[d.type] = (typeDistribution[d.type] || 0) + 1;
    totalConfidence += d.confidence;
    reasonCounts[d.reasoning.primaryFactor] = (reasonCounts[d.reasoning.primaryFactor] || 0) + 1;
  }

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason]) => reason);

  return {
    totalDecisions: history.length,
    typeDistribution: typeDistribution as Record<DecisionType, number>,
    avgConfidence: history.length > 0 ? Math.round(totalConfidence / history.length) : 0,
    topReasons,
  };
}