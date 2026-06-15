// Real-Time Adaptive Educational Intelligence Sprint
// Module 4: Misconception Response Engine
// Real-time response when misconception probability rises
// Triggers: remediation, simplify, revisit prerequisite, targeted practice, switch visual strategy

import { loadUserData, saveUserData } from './pilotStorage';
import { type RealTimeSignals } from './realTimeTelemetry';

// ============ Types ============

export interface MisconceptionAlert {
  id: string;
  studentId: string;
  skillId: string;
  misconceptionType: MisconceptionType;
  probability: number; // 0-100
  evidence: MisconceptionEvidence[];
  detectedAt: string;
  status: 'active' | 'responding' | 'resolved' | 'persistent';
  responseHistory: MisconceptionResponse[];
}

export type MisconceptionType =
  | 'place_value_confusion'
  | 'operation_inverse'
  | 'digit_swap'
  | 'off_by_one'
  | 'carry_borrow_error'
  | 'zero_handling'
  | 'fraction_whole_confusion'
  | 'comparison_reversal'
  | 'counting_skip'
  | 'pattern_overgeneralization'
  | 'visual_misinterpretation'
  | 'procedural_shortcut'
  | 'guessing_pattern'
  | 'perseveration';

export interface MisconceptionEvidence {
  timestamp: string;
  questionId: string;
  expectedAnswer: string;
  givenAnswer: string;
  errorPattern: string;
  confidence: number;
}

export interface MisconceptionResponse {
  id: string;
  timestamp: string;
  responseType: ResponseType;
  params: ResponseParams;
  outcome: ResponseOutcome | null;
}

export type ResponseType =
  | 'immediate_remediation'
  | 'simplify_concept'
  | 'revisit_prerequisite'
  | 'targeted_practice'
  | 'switch_visual'
  | 'concrete_example'
  | 'guided_discovery'
  | 'error_confrontation'
  | 'analogy_bridge'
  | 'decompose_steps';

export interface ResponseParams {
  targetSkillId: string;
  prerequisiteSkillId?: string;
  visualStrategy?: 'number_line' | 'blocks' | 'abacus' | 'fingers' | 'groups' | 'diagram';
  scaffoldLevel: number; // 1-5
  exampleCount: number;
  includeCounterExample: boolean;
  paceMultiplier: number; // 0.5 = half speed, 2.0 = double
}

export interface ResponseOutcome {
  resolved: boolean;
  attemptsAfter: number;
  correctAfter: number;
  probabilityAfter: number;
  timeToResolveMs: number;
}

export interface ResponseStrategy {
  misconceptionType: MisconceptionType;
  probabilityThreshold: number;
  responses: Array<{
    level: number; // escalation level 1-5
    type: ResponseType;
    defaultParams: Partial<ResponseParams>;
    description: string;
  }>;
}

// ============ Response Strategies ============

const RESPONSE_STRATEGIES: ResponseStrategy[] = [
  {
    misconceptionType: 'place_value_confusion',
    probabilityThreshold: 40,
    responses: [
      { level: 1, type: 'concrete_example', defaultParams: { scaffoldLevel: 2, exampleCount: 2, includeCounterExample: false, paceMultiplier: 1.5 }, description: 'Show place value with blocks' },
      { level: 2, type: 'switch_visual', defaultParams: { visualStrategy: 'blocks', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Switch to base-10 blocks visualization' },
      { level: 3, type: 'decompose_steps', defaultParams: { scaffoldLevel: 4, exampleCount: 3, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Break number into ones/tens/hundreds' },
      { level: 4, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Go back to counting by 10s' },
      { level: 5, type: 'guided_discovery', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.5 }, description: 'Guided discovery of place value patterns' },
    ],
  },
  {
    misconceptionType: 'operation_inverse',
    probabilityThreshold: 45,
    responses: [
      { level: 1, type: 'error_confrontation', defaultParams: { scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.3 }, description: 'Show the error explicitly' },
      { level: 2, type: 'concrete_example', defaultParams: { visualStrategy: 'groups', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Use physical grouping examples' },
      { level: 3, type: 'analogy_bridge', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Bridge with real-world analogy' },
      { level: 4, type: 'targeted_practice', defaultParams: { scaffoldLevel: 4, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Focused practice on operation distinction' },
      { level: 5, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.5 }, description: 'Revisit basic operation concepts' },
    ],
  },
  {
    misconceptionType: 'carry_borrow_error',
    probabilityThreshold: 40,
    responses: [
      { level: 1, type: 'switch_visual', defaultParams: { visualStrategy: 'abacus', scaffoldLevel: 2, exampleCount: 2, includeCounterExample: false, paceMultiplier: 1.5 }, description: 'Use abacus for carry visualization' },
      { level: 2, type: 'decompose_steps', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Break into explicit carry steps' },
      { level: 3, type: 'concrete_example', defaultParams: { visualStrategy: 'blocks', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Physical regrouping with blocks' },
      { level: 4, type: 'guided_discovery', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Discover carry pattern through examples' },
      { level: 5, type: 'immediate_remediation', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.5 }, description: 'Full remediation of carry/borrow concept' },
    ],
  },
  {
    misconceptionType: 'off_by_one',
    probabilityThreshold: 50,
    responses: [
      { level: 1, type: 'switch_visual', defaultParams: { visualStrategy: 'number_line', scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.3 }, description: 'Number line visualization' },
      { level: 2, type: 'error_confrontation', defaultParams: { scaffoldLevel: 2, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Show off-by-one pattern' },
      { level: 3, type: 'targeted_practice', defaultParams: { scaffoldLevel: 3, exampleCount: 4, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Practice boundary cases' },
      { level: 4, type: 'decompose_steps', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Explicit counting steps' },
      { level: 5, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Revisit counting fundamentals' },
    ],
  },
  {
    misconceptionType: 'guessing_pattern',
    probabilityThreshold: 55,
    responses: [
      { level: 1, type: 'simplify_concept', defaultParams: { scaffoldLevel: 3, exampleCount: 1, includeCounterExample: false, paceMultiplier: 2.0 }, description: 'Simplify to build confidence' },
      { level: 2, type: 'guided_discovery', defaultParams: { scaffoldLevel: 4, exampleCount: 2, includeCounterExample: false, paceMultiplier: 2.0 }, description: 'Guide through solution process' },
      { level: 3, type: 'decompose_steps', defaultParams: { scaffoldLevel: 4, exampleCount: 2, includeCounterExample: false, paceMultiplier: 2.5 }, description: 'Break into tiny achievable steps' },
      { level: 4, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 5, exampleCount: 3, includeCounterExample: false, paceMultiplier: 2.5 }, description: 'Go back to mastered prerequisite' },
      { level: 5, type: 'immediate_remediation', defaultParams: { scaffoldLevel: 5, exampleCount: 4, includeCounterExample: false, paceMultiplier: 3.0 }, description: 'Full remediation from basics' },
    ],
  },
  {
    misconceptionType: 'digit_swap',
    probabilityThreshold: 45,
    responses: [
      { level: 1, type: 'switch_visual', defaultParams: { visualStrategy: 'blocks', scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.3 }, description: 'Visual digit position emphasis' },
      { level: 2, type: 'error_confrontation', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Highlight swap pattern' },
      { level: 3, type: 'targeted_practice', defaultParams: { scaffoldLevel: 3, exampleCount: 4, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Practice digit ordering' },
      { level: 4, type: 'concrete_example', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Physical number building' },
      { level: 5, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Revisit number formation' },
    ],
  },
  {
    misconceptionType: 'zero_handling',
    probabilityThreshold: 45,
    responses: [
      { level: 1, type: 'concrete_example', defaultParams: { scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.3 }, description: 'Zero as placeholder examples' },
      { level: 2, type: 'switch_visual', defaultParams: { visualStrategy: 'number_line', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Number line with zero' },
      { level: 3, type: 'analogy_bridge', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Real-world zero analogies' },
      { level: 4, type: 'targeted_practice', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Zero-specific practice' },
      { level: 5, type: 'guided_discovery', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Discover zero properties' },
    ],
  },
  {
    misconceptionType: 'counting_skip',
    probabilityThreshold: 40,
    responses: [
      { level: 1, type: 'switch_visual', defaultParams: { visualStrategy: 'fingers', scaffoldLevel: 2, exampleCount: 2, includeCounterExample: false, paceMultiplier: 1.5 }, description: 'Finger counting support' },
      { level: 2, type: 'concrete_example', defaultParams: { visualStrategy: 'number_line', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Number line hop visualization' },
      { level: 3, type: 'decompose_steps', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'One-by-one counting steps' },
      { level: 4, type: 'targeted_practice', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Sequential counting practice' },
      { level: 5, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.5 }, description: 'Revisit number sequence' },
    ],
  },
  {
    misconceptionType: 'perseveration',
    probabilityThreshold: 50,
    responses: [
      { level: 1, type: 'error_confrontation', defaultParams: { scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Gently show repeated error' },
      { level: 2, type: 'analogy_bridge', defaultParams: { scaffoldLevel: 3, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'New angle on same concept' },
      { level: 3, type: 'switch_visual', defaultParams: { visualStrategy: 'diagram', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Completely different visual' },
      { level: 4, type: 'simplify_concept', defaultParams: { scaffoldLevel: 4, exampleCount: 3, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Simplify and rebuild' },
      { level: 5, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 5, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.5 }, description: 'Start from prerequisite' },
    ],
  },
  {
    misconceptionType: 'comparison_reversal',
    probabilityThreshold: 45,
    responses: [
      { level: 1, type: 'switch_visual', defaultParams: { visualStrategy: 'number_line', scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.3 }, description: 'Number line comparison' },
      { level: 2, type: 'concrete_example', defaultParams: { visualStrategy: 'blocks', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Physical size comparison' },
      { level: 3, type: 'error_confrontation', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Show reversal pattern' },
      { level: 4, type: 'targeted_practice', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Comparison drills' },
      { level: 5, type: 'guided_discovery', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Discover comparison rules' },
    ],
  },
  {
    misconceptionType: 'fraction_whole_confusion',
    probabilityThreshold: 45,
    responses: [
      { level: 1, type: 'concrete_example', defaultParams: { visualStrategy: 'groups', scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Pizza/pie fraction examples' },
      { level: 2, type: 'switch_visual', defaultParams: { visualStrategy: 'diagram', scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Part-whole diagrams' },
      { level: 3, type: 'decompose_steps', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Step-by-step fraction building' },
      { level: 4, type: 'analogy_bridge', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Real-world fraction analogies' },
      { level: 5, type: 'revisit_prerequisite', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.5 }, description: 'Revisit whole number division' },
    ],
  },
  {
    misconceptionType: 'pattern_overgeneralization',
    probabilityThreshold: 50,
    responses: [
      { level: 1, type: 'error_confrontation', defaultParams: { scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.3 }, description: 'Show where pattern breaks' },
      { level: 2, type: 'concrete_example', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Counter-examples' },
      { level: 3, type: 'guided_discovery', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Discover correct pattern boundaries' },
      { level: 4, type: 'targeted_practice', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Boundary case practice' },
      { level: 5, type: 'decompose_steps', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Explicit rule application steps' },
    ],
  },
  {
    misconceptionType: 'visual_misinterpretation',
    probabilityThreshold: 45,
    responses: [
      { level: 1, type: 'switch_visual', defaultParams: { visualStrategy: 'blocks', scaffoldLevel: 2, exampleCount: 2, includeCounterExample: false, paceMultiplier: 1.5 }, description: 'Switch to clearer visual' },
      { level: 2, type: 'decompose_steps', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Break visual into parts' },
      { level: 3, type: 'guided_discovery', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Guide visual reading' },
      { level: 4, type: 'concrete_example', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Physical manipulation' },
      { level: 5, type: 'simplify_concept', defaultParams: { scaffoldLevel: 5, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.5 }, description: 'Simplify visual completely' },
    ],
  },
  {
    misconceptionType: 'procedural_shortcut',
    probabilityThreshold: 50,
    responses: [
      { level: 1, type: 'error_confrontation', defaultParams: { scaffoldLevel: 2, exampleCount: 2, includeCounterExample: true, paceMultiplier: 1.3 }, description: 'Show shortcut failure' },
      { level: 2, type: 'decompose_steps', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Full procedure steps' },
      { level: 3, type: 'guided_discovery', defaultParams: { scaffoldLevel: 3, exampleCount: 3, includeCounterExample: true, paceMultiplier: 1.5 }, description: 'Discover why full procedure matters' },
      { level: 4, type: 'targeted_practice', defaultParams: { scaffoldLevel: 4, exampleCount: 4, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Practice full procedure' },
      { level: 5, type: 'immediate_remediation', defaultParams: { scaffoldLevel: 5, exampleCount: 5, includeCounterExample: true, paceMultiplier: 2.0 }, description: 'Full procedure remediation' },
    ],
  },
];

// ============ Engine State ============

interface MisconceptionEngineState {
  activeAlerts: Map<string, MisconceptionAlert>;
  escalationLevels: Map<string, number>; // alertId -> current level
  responseLog: MisconceptionResponse[];
}

const engineState: MisconceptionEngineState = {
  activeAlerts: new Map(),
  escalationLevels: new Map(),
  responseLog: [],
};

// ============ Core Functions ============

export function detectAndRespond(
  studentId: string,
  skillId: string,
  misconceptionType: MisconceptionType,
  probability: number,
  evidence: MisconceptionEvidence,
  signals?: RealTimeSignals
): MisconceptionResponse | null {
  const alertKey = `${studentId}_${skillId}_${misconceptionType}`;

  // Find or create alert
  let alert = engineState.activeAlerts.get(alertKey);
  if (!alert) {
    alert = {
      id: `ma_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      studentId,
      skillId,
      misconceptionType,
      probability,
      evidence: [evidence],
      detectedAt: new Date().toISOString(),
      status: 'active',
      responseHistory: [],
    };
    engineState.activeAlerts.set(alertKey, alert);
    engineState.escalationLevels.set(alertKey, 0);
  } else {
    alert.probability = probability;
    alert.evidence.push(evidence);
    if (alert.evidence.length > 10) alert.evidence = alert.evidence.slice(-10);
  }

  // Find matching strategy
  const strategy = RESPONSE_STRATEGIES.find(s => s.misconceptionType === misconceptionType);
  if (!strategy) return null;

  // Check if probability exceeds threshold
  if (probability < strategy.probabilityThreshold) return null;

  // Get current escalation level
  let level = engineState.escalationLevels.get(alertKey) ?? 0;

  // Escalate if previous response didn't resolve
  if (alert.responseHistory.length > 0) {
    const lastResponse = alert.responseHistory[alert.responseHistory.length - 1];
    if (lastResponse.outcome && !lastResponse.outcome.resolved) {
      level = Math.min(level + 1, strategy.responses.length - 1);
    }
  }

  // Get response for current level
  const responseConfig = strategy.responses[level];
  if (!responseConfig) return null;

  // Build response params
  const params: ResponseParams = {
    targetSkillId: skillId,
    scaffoldLevel: responseConfig.defaultParams.scaffoldLevel ?? 2,
    exampleCount: responseConfig.defaultParams.exampleCount ?? 2,
    includeCounterExample: responseConfig.defaultParams.includeCounterExample ?? false,
    paceMultiplier: responseConfig.defaultParams.paceMultiplier ?? 1.5,
    ...responseConfig.defaultParams,
  };

  // Adjust based on signals
  if (signals) {
    if (signals.frustrationScore > 60) {
      params.paceMultiplier *= 1.3;
      params.scaffoldLevel = Math.min(5, params.scaffoldLevel + 1);
    }
    if (signals.cognitiveLoadScore > 70) {
      params.exampleCount = Math.max(1, params.exampleCount - 1);
    }
  }

  const response: MisconceptionResponse = {
    id: `mr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    responseType: responseConfig.type,
    params,
    outcome: null,
  };

  // Update state
  alert.status = 'responding';
  alert.responseHistory.push(response);
  engineState.escalationLevels.set(alertKey, level);
  engineState.responseLog.push(response);

  return response;
}

export function recordResponseOutcome(
  studentId: string,
  skillId: string,
  misconceptionType: MisconceptionType,
  outcome: ResponseOutcome
): void {
  const alertKey = `${studentId}_${skillId}_${misconceptionType}`;
  const alert = engineState.activeAlerts.get(alertKey);
  if (!alert || alert.responseHistory.length === 0) return;

  // Update last response outcome
  const lastResponse = alert.responseHistory[alert.responseHistory.length - 1];
  lastResponse.outcome = outcome;

  // Update alert status
  if (outcome.resolved) {
    alert.status = 'resolved';
    alert.probability = outcome.probabilityAfter;
  } else if (alert.responseHistory.length >= 3 && alert.responseHistory.every(r => r.outcome && !r.outcome.resolved)) {
    alert.status = 'persistent';
  }

  // Persist
  persistMisconceptionData(studentId);
}

export function getActiveAlerts(studentId: string): MisconceptionAlert[] {
  const alerts: MisconceptionAlert[] = [];
  engineState.activeAlerts.forEach(alert => {
    if (alert.studentId === studentId && (alert.status === 'active' || alert.status === 'responding')) {
      alerts.push(alert);
    }
  });
  return alerts;
}

export function getMisconceptionHistory(studentId: string): MisconceptionAlert[] {
  const alerts: MisconceptionAlert[] = [];
  engineState.activeAlerts.forEach(alert => {
    if (alert.studentId === studentId) {
      alerts.push(alert);
    }
  });
  return alerts;
}

export function getResponseStrategies(): ResponseStrategy[] {
  return RESPONSE_STRATEGIES;
}

export function clearResolvedAlerts(studentId: string): number {
  let cleared = 0;
  engineState.activeAlerts.forEach((alert, key) => {
    if (alert.studentId === studentId && alert.status === 'resolved') {
      engineState.activeAlerts.delete(key);
      engineState.escalationLevels.delete(key);
      cleared++;
    }
  });
  return cleared;
}

function persistMisconceptionData(studentId: string): void {
  const alerts = getMisconceptionHistory(studentId);
  saveUserData(`misconception_alerts_${studentId}`, alerts);
}

export function loadMisconceptionData(studentId: string): void {
  const data = loadUserData<MisconceptionAlert[]>(`misconception_alerts_${studentId}`);
  if (data) {
    data.forEach(alert => {
      const key = `${alert.studentId}_${alert.skillId}_${alert.misconceptionType}`;
      engineState.activeAlerts.set(key, alert);
    });
  }
}