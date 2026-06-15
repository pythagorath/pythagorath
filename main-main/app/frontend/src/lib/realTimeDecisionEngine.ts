// Real-Time Adaptive Educational Intelligence Sprint
// Module 2: Real-Time Decision Engine
// Makes live educational decisions during interaction based on telemetry signals
// Target: <100ms decision time, priority-based action selection

import {
  computeRealTimeSignals,
  getCurrentTrend,
  type RealTimeSignals,
  type SignalTrend,
} from './realTimeTelemetry';
import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export type RealTimeActionType =
  | 'simplify_explanation'
  | 'slow_pacing'
  | 'switch_interaction'
  | 'trigger_hint'
  | 'trigger_guided_correction'
  | 'rollback_skill'
  | 'generate_remediation'
  | 'increase_challenge'
  | 'reduce_cognitive_load'
  | 'provide_encouragement'
  | 'switch_visual_strategy'
  | 'trigger_break'
  | 'reduce_distractions'
  | 'shorten_interaction'
  | 'alternate_representation'
  | 'adaptive_scaffolding'
  | 'no_action';

export interface RealTimeDecision {
  id: string;
  timestamp: string;
  action: RealTimeActionType;
  priority: number; // 1-10, 10 = highest urgency
  confidence: number; // 0-100
  reasoning: string;
  triggerSignals: string[];
  suggestedParams: Record<string, unknown>;
  expiresInMs: number; // how long this decision is valid
}

export interface DecisionRule {
  id: string;
  name: string;
  condition: (signals: RealTimeSignals, trend: SignalTrend, context: DecisionContext) => boolean;
  action: RealTimeActionType;
  priority: number;
  confidence: number;
  reasoning: string;
  cooldownMs: number; // minimum time between triggering same rule
  params: (signals: RealTimeSignals, context: DecisionContext) => Record<string, unknown>;
}

export interface DecisionContext {
  studentId: string;
  sessionId: string;
  currentSkillId: string;
  questionsAttempted: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  sessionDurationMs: number;
  currentDifficulty: number; // 1-10
  scaffoldLevel: number; // 0-3
  recentDecisions: RealTimeDecision[];
  masteryLevel: number; // 0-100
  misconceptionActive: boolean;
}

interface EngineState {
  context: DecisionContext | null;
  rules: DecisionRule[];
  decisionHistory: RealTimeDecision[];
  ruleCooldowns: Map<string, number>;
  lastDecisionTime: number;
  decisionCount: number;
}

// ============ Engine State ============

const engineState: EngineState = {
  context: null,
  rules: [],
  decisionHistory: [],
  ruleCooldowns: new Map(),
  lastDecisionTime: 0,
  decisionCount: 0,
};

// ============ Default Rules ============

function getDefaultRules(): DecisionRule[] {
  return [
    // Rule 1: High frustration → simplify + encourage
    {
      id: 'high_frustration',
      name: 'High Frustration Response',
      condition: (signals, _trend, ctx) =>
        signals.frustrationScore > 70 && ctx.consecutiveWrong >= 2,
      action: 'simplify_explanation',
      priority: 9,
      confidence: 85,
      reasoning: 'Student showing high frustration with repeated errors',
      cooldownMs: 15000,
      params: (signals) => ({
        simplifyLevel: signals.frustrationScore > 85 ? 'maximum' : 'moderate',
        includeEncouragement: true,
      }),
    },
    // Rule 2: Cognitive overload → reduce load
    {
      id: 'cognitive_overload',
      name: 'Cognitive Overload Detection',
      condition: (signals, _trend) =>
        signals.cognitiveLoadScore > 75 && signals.hesitationScore > 60,
      action: 'reduce_cognitive_load',
      priority: 8,
      confidence: 80,
      reasoning: 'Cognitive load exceeds safe threshold with hesitation',
      cooldownMs: 20000,
      params: (signals) => ({
        reductionLevel: signals.cognitiveLoadScore > 90 ? 'aggressive' : 'moderate',
        removeDistractors: true,
        simplifyVisuals: true,
      }),
    },
    // Rule 3: Hesitation pattern → provide hint
    {
      id: 'hesitation_hint',
      name: 'Hesitation-Triggered Hint',
      condition: (signals, _trend, ctx) =>
        signals.hesitationScore > 60 && ctx.scaffoldLevel < 2,
      action: 'trigger_hint',
      priority: 6,
      confidence: 75,
      reasoning: 'Student hesitating significantly, needs guidance',
      cooldownMs: 10000,
      params: (_signals, ctx) => ({
        hintLevel: ctx.scaffoldLevel + 1,
        hintType: 'progressive',
      }),
    },
    // Rule 4: Declining engagement → switch interaction
    {
      id: 'engagement_decline',
      name: 'Engagement Decline Response',
      condition: (signals, trend) =>
        signals.engagementScore < 40 && trend.direction === 'declining',
      action: 'switch_interaction',
      priority: 7,
      confidence: 70,
      reasoning: 'Engagement declining, need to switch approach',
      cooldownMs: 30000,
      params: () => ({
        switchTo: 'gamified',
        includeNovelty: true,
      }),
    },
    // Rule 5: Rush pattern → slow pacing
    {
      id: 'rush_detection',
      name: 'Rush Pattern Slow Down',
      condition: (signals, _trend, ctx) =>
        signals.rushScore > 65 && ctx.consecutiveCorrect < 3,
      action: 'slow_pacing',
      priority: 5,
      confidence: 70,
      reasoning: 'Student rushing without mastery, need to slow down',
      cooldownMs: 15000,
      params: (signals) => ({
        slowFactor: signals.rushScore > 80 ? 2.0 : 1.5,
        enforceMinTime: true,
      }),
    },
    // Rule 6: Misconception active → guided correction
    {
      id: 'misconception_correction',
      name: 'Misconception Guided Correction',
      condition: (_signals, _trend, ctx) =>
        ctx.misconceptionActive && ctx.consecutiveWrong >= 1,
      action: 'trigger_guided_correction',
      priority: 8,
      confidence: 85,
      reasoning: 'Active misconception detected, need targeted correction',
      cooldownMs: 12000,
      params: (_signals, ctx) => ({
        correctionType: 'misconception_specific',
        skillId: ctx.currentSkillId,
        includeVisual: true,
      }),
    },
    // Rule 7: High abandonment risk → shorten + encourage
    {
      id: 'abandonment_prevention',
      name: 'Abandonment Prevention',
      condition: (signals) =>
        signals.abandonmentRisk > 60,
      action: 'shorten_interaction',
      priority: 9,
      confidence: 75,
      reasoning: 'High risk of student abandoning activity',
      cooldownMs: 25000,
      params: (signals) => ({
        shortenBy: signals.abandonmentRisk > 80 ? 0.5 : 0.3,
        addMilestone: true,
        encourageCompletion: true,
      }),
    },
    // Rule 8: Consecutive correct + high confidence → increase challenge
    {
      id: 'increase_challenge',
      name: 'Challenge Increase',
      condition: (signals, trend, ctx) =>
        ctx.consecutiveCorrect >= 4 && signals.confidenceScore > 70 &&
        trend.direction !== 'declining' && ctx.currentDifficulty < 8,
      action: 'increase_challenge',
      priority: 4,
      confidence: 80,
      reasoning: 'Student demonstrating mastery, ready for more challenge',
      cooldownMs: 20000,
      params: (_signals, ctx) => ({
        newDifficulty: Math.min(10, ctx.currentDifficulty + 1),
        gradual: true,
      }),
    },
    // Rule 9: Low attention → reduce distractions
    {
      id: 'attention_loss',
      name: 'Attention Loss Response',
      condition: (signals) =>
        signals.attentionScore < 40,
      action: 'reduce_distractions',
      priority: 6,
      confidence: 65,
      reasoning: 'Student attention dropping, simplify environment',
      cooldownMs: 20000,
      params: () => ({
        removeAnimations: true,
        highlightCore: true,
        reduceOptions: true,
      }),
    },
    // Rule 10: Volatile rhythm → adaptive scaffolding
    {
      id: 'rhythm_instability',
      name: 'Rhythm Instability Scaffolding',
      condition: (signals, trend) =>
        signals.rhythmStability < 30 && trend.direction === 'volatile',
      action: 'adaptive_scaffolding',
      priority: 5,
      confidence: 60,
      reasoning: 'Interaction rhythm unstable, provide structure',
      cooldownMs: 25000,
      params: (signals) => ({
        scaffoldType: 'structured_steps',
        breakIntoSteps: signals.rhythmStability < 15,
      }),
    },
    // Rule 11: Consecutive wrong + high load → rollback skill
    {
      id: 'skill_rollback',
      name: 'Skill Rollback',
      condition: (signals, _trend, ctx) =>
        ctx.consecutiveWrong >= 4 && signals.cognitiveLoadScore > 60 && ctx.currentDifficulty > 2,
      action: 'rollback_skill',
      priority: 8,
      confidence: 80,
      reasoning: 'Student struggling significantly, need to revisit prerequisite',
      cooldownMs: 30000,
      params: (_signals, ctx) => ({
        rollbackLevels: ctx.consecutiveWrong >= 6 ? 2 : 1,
        includeReview: true,
      }),
    },
    // Rule 12: Session fatigue → trigger break
    {
      id: 'session_fatigue',
      name: 'Session Fatigue Break',
      condition: (signals, trend, ctx) =>
        ctx.sessionDurationMs > 15 * 60 * 1000 && // 15+ minutes
        signals.engagementScore < 50 && trend.direction === 'declining',
      action: 'trigger_break',
      priority: 7,
      confidence: 75,
      reasoning: 'Long session with declining engagement, break needed',
      cooldownMs: 5 * 60 * 1000, // 5 min cooldown
      params: (_signals, ctx) => ({
        breakDuration: ctx.sessionDurationMs > 25 * 60 * 1000 ? 5 : 3,
        breakType: 'active_rest',
      }),
    },
  ];
}

// ============ Core Engine Functions ============

export function initRealTimeEngine(context: DecisionContext): void {
  engineState.context = context;
  engineState.rules = getDefaultRules();
  engineState.decisionHistory = [];
  engineState.ruleCooldowns = new Map();
  engineState.lastDecisionTime = performance.now();
  engineState.decisionCount = 0;
}

export function updateContext(updates: Partial<DecisionContext>): void {
  if (engineState.context) {
    engineState.context = { ...engineState.context, ...updates };
  }
}

export function makeRealTimeDecision(): RealTimeDecision {
  const startTime = performance.now();
  const signals = computeRealTimeSignals();
  const trend = getCurrentTrend();
  const context = engineState.context;

  if (!context) {
    return createNoActionDecision('No context initialized');
  }

  // Evaluate all rules, filter by cooldown, sort by priority
  const now = performance.now();
  const eligibleDecisions: Array<{ rule: DecisionRule; signals: RealTimeSignals }> = [];

  for (const rule of engineState.rules) {
    // Check cooldown
    const lastTrigger = engineState.ruleCooldowns.get(rule.id) ?? 0;
    if (now - lastTrigger < rule.cooldownMs) continue;

    // Evaluate condition
    try {
      if (rule.condition(signals, trend, context)) {
        eligibleDecisions.push({ rule, signals });
      }
    } catch {
      // Skip failed rules
    }
  }

  // No rules triggered
  if (eligibleDecisions.length === 0) {
    return createNoActionDecision('All signals within normal range');
  }

  // Sort by priority (highest first), then confidence
  eligibleDecisions.sort((a, b) => {
    if (b.rule.priority !== a.rule.priority) return b.rule.priority - a.rule.priority;
    return b.rule.confidence - a.rule.confidence;
  });

  // Take highest priority decision
  const winner = eligibleDecisions[0];
  const decision: RealTimeDecision = {
    id: `rtd_${Date.now()}_${engineState.decisionCount++}`,
    timestamp: new Date().toISOString(),
    action: winner.rule.action,
    priority: winner.rule.priority,
    confidence: winner.rule.confidence,
    reasoning: winner.rule.reasoning,
    triggerSignals: extractTriggerSignals(signals),
    suggestedParams: winner.rule.params(signals, context),
    expiresInMs: winner.rule.cooldownMs,
  };

  // Record cooldown
  engineState.ruleCooldowns.set(winner.rule.id, now);

  // Add to history
  engineState.decisionHistory.push(decision);
  if (engineState.decisionHistory.length > 50) {
    engineState.decisionHistory = engineState.decisionHistory.slice(-50);
  }

  // Update context with recent decisions
  if (engineState.context) {
    engineState.context.recentDecisions = engineState.decisionHistory.slice(-5);
  }

  const elapsed = performance.now() - startTime;
  if (elapsed > 100) {
    console.warn(`[RealTimeEngine] Decision took ${elapsed.toFixed(1)}ms (target <100ms)`);
  }

  return decision;
}

export function getDecisionHistory(): RealTimeDecision[] {
  return [...engineState.decisionHistory];
}

export function getActiveRules(): string[] {
  return engineState.rules.map(r => r.name);
}

export function addCustomRule(rule: DecisionRule): void {
  engineState.rules.push(rule);
}

export function persistDecisionHistory(studentId: string, sessionId: string): void {
  const key = `rt_decisions_${studentId}`;
  const existing = loadUserData<Array<{ sessionId: string; decisions: RealTimeDecision[]; timestamp: string }>>(key) ?? [];
  existing.push({
    sessionId,
    decisions: engineState.decisionHistory,
    timestamp: new Date().toISOString(),
  });
  saveUserData(key, existing.slice(-10));
}

// ============ Helpers ============

function createNoActionDecision(reasoning: string): RealTimeDecision {
  return {
    id: `rtd_noop_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'no_action',
    priority: 0,
    confidence: 100,
    reasoning,
    triggerSignals: [],
    suggestedParams: {},
    expiresInMs: 5000,
  };
}

function extractTriggerSignals(signals: RealTimeSignals): string[] {
  const triggers: string[] = [];
  if (signals.frustrationScore > 60) triggers.push(`frustration:${signals.frustrationScore.toFixed(0)}`);
  if (signals.hesitationScore > 50) triggers.push(`hesitation:${signals.hesitationScore.toFixed(0)}`);
  if (signals.cognitiveLoadScore > 60) triggers.push(`cogLoad:${signals.cognitiveLoadScore.toFixed(0)}`);
  if (signals.engagementScore < 40) triggers.push(`lowEngagement:${signals.engagementScore.toFixed(0)}`);
  if (signals.abandonmentRisk > 50) triggers.push(`abandonRisk:${signals.abandonmentRisk.toFixed(0)}`);
  if (signals.rushScore > 60) triggers.push(`rush:${signals.rushScore.toFixed(0)}`);
  if (signals.attentionScore < 40) triggers.push(`lowAttention:${signals.attentionScore.toFixed(0)}`);
  return triggers;
}