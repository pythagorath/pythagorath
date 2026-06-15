// Phase 5.5 Decision Engine - Error Intelligence
// Root cause analysis, error taxonomy, error prediction, preventive scaffolding
// Understands WHY errors happen and prevents them proactively

import { loadUserData, saveUserData } from './pilotStorage';
import type { MisconceptionType } from './questionIntelligenceEngine';
import type { EvidencePattern } from './misconceptionDetector';

// ============ Types ============

export interface ErrorEvent {
  id: string;
  skillId: string;
  questionId: string;
  timestamp: string;
  studentAnswer: number | string;
  correctAnswer: number | string;
  responseTimeMs: number;
  rootCause: RootCause;
  errorCategory: ErrorCategory;
  contextFactors: ContextFactor[];
  severity: 'trivial' | 'minor' | 'significant' | 'critical';
  wasPreventable: boolean;
}

export type RootCause =
  | 'knowledge_gap'         // Doesn't know the concept
  | 'procedural_error'      // Knows concept but executes wrong
  | 'careless_mistake'      // Knows it, just slipped
  | 'misconception'         // Has wrong mental model
  | 'fatigue_induced'       // Error due to tiredness
  | 'speed_pressure'        // Rushed, didn't think
  | 'reading_error'         // Misread the question
  | 'transfer_failure'      // Can't apply to new context
  | 'working_memory'        // Forgot intermediate step
  | 'unknown';

export type ErrorCategory =
  | 'computational'    // Wrong calculation
  | 'conceptual'       // Wrong understanding
  | 'procedural'       // Wrong steps
  | 'attention'        // Careless/rushed
  | 'transfer'         // Can't generalize
  | 'memory';          // Forgot something

export type ContextFactor =
  | 'high_fatigue'
  | 'fast_response'
  | 'long_session'
  | 'new_concept'
  | 'complex_question'
  | 'after_break'
  | 'consecutive_errors'
  | 'first_attempt';

export interface ErrorProfile {
  userId: string;
  totalErrors: number;
  rootCauseDistribution: Record<RootCause, number>;
  categoryDistribution: Record<ErrorCategory, number>;
  errorRate: number; // 0-100
  commonPatterns: ErrorPattern[];
  predictions: ErrorPrediction[];
  preventiveActions: PreventiveAction[];
}

export interface ErrorPattern {
  description: string;
  frequency: number;
  skills: string[];
  rootCause: RootCause;
  timeOfDay: string | null;
  sessionPosition: 'early' | 'middle' | 'late' | null;
}

export interface ErrorPrediction {
  skillId: string;
  predictedErrorType: RootCause;
  probability: number; // 0-100
  basedOn: string;
  preventiveAction: PreventiveAction;
}

export interface PreventiveAction {
  type: PreventiveType;
  messageAr: string;
  timing: 'before_question' | 'during_question' | 'after_error';
  priority: number;
}

export type PreventiveType =
  | 'reminder'         // Quick reminder before question
  | 'slow_down'        // Ask student to slow down
  | 'warm_up'          // Give easier question first
  | 'scaffold'         // Add scaffolding
  | 'visual_aid'       // Show visual support
  | 'break_suggest'    // Suggest a break
  | 'concept_review'   // Quick concept review
  | 'worked_example';  // Show how to solve similar

// ============ Root Cause Analysis ============

/**
 * Analyze the root cause of an error.
 */
export function analyzeRootCause(
  studentAnswer: number | string,
  correctAnswer: number | string,
  responseTimeMs: number,
  skillMastery: number,
  fatigueLevel: number,
  consecutiveWrong: number,
  isNewConcept: boolean,
  sessionMinutes: number
): { rootCause: RootCause; category: ErrorCategory; confidence: number; contextFactors: ContextFactor[] } {
  const contextFactors: ContextFactor[] = [];

  // Collect context
  if (fatigueLevel > 60) contextFactors.push('high_fatigue');
  if (responseTimeMs < 2000) contextFactors.push('fast_response');
  if (sessionMinutes > 12) contextFactors.push('long_session');
  if (isNewConcept) contextFactors.push('new_concept');
  if (consecutiveWrong >= 2) contextFactors.push('consecutive_errors');

  const student = Number(studentAnswer);
  const correct = Number(correctAnswer);
  const bothNumeric = Number.isFinite(student) && Number.isFinite(correct);

  // Rule-based root cause detection
  let rootCause: RootCause = 'unknown';
  let category: ErrorCategory = 'attention';
  let confidence = 50;

  // Fast response + close answer = careless mistake
  if (responseTimeMs < 2500 && bothNumeric && Math.abs(student - correct) <= 2) {
    rootCause = 'careless_mistake';
    category = 'attention';
    confidence = 75;
  }
  // High fatigue + late session = fatigue induced
  else if (fatigueLevel > 60 && sessionMinutes > 10) {
    rootCause = 'fatigue_induced';
    category = 'attention';
    confidence = 70;
  }
  // Very fast response = speed pressure
  else if (responseTimeMs < 1500) {
    rootCause = 'speed_pressure';
    category = 'attention';
    confidence = 65;
  }
  // New concept + wrong = knowledge gap
  else if (isNewConcept && skillMastery < 30) {
    rootCause = 'knowledge_gap';
    category = 'conceptual';
    confidence = 80;
  }
  // Has mastery but wrong = procedural or transfer
  else if (skillMastery > 60 && !isNewConcept) {
    rootCause = consecutiveWrong >= 2 ? 'working_memory' : 'procedural_error';
    category = consecutiveWrong >= 2 ? 'memory' : 'procedural';
    confidence = 60;
  }
  // Low mastery + wrong = misconception or knowledge gap
  else if (skillMastery < 40) {
    rootCause = consecutiveWrong >= 3 ? 'misconception' : 'knowledge_gap';
    category = 'conceptual';
    confidence = 65;
  }
  // Medium mastery
  else {
    rootCause = 'procedural_error';
    category = 'procedural';
    confidence = 50;
  }

  return { rootCause, category, confidence, contextFactors };
}

/**
 * Record an error event for pattern analysis.
 */
export function recordError(event: Omit<ErrorEvent, 'id'>): void {
  const errors = loadUserData<ErrorEvent[]>('errorIntelligence', []);
  errors.push({
    ...event,
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  });
  saveUserData('errorIntelligence', errors.slice(-200));
}

// ============ Error Prediction ============

/**
 * Predict likely errors for upcoming questions.
 * Used by Decision Engine for preventive scaffolding.
 */
export function predictErrors(
  skillId: string,
  skillMastery: number,
  fatigueLevel: number,
  sessionMinutes: number,
  consecutiveCorrect: number
): ErrorPrediction[] {
  const errors = loadUserData<ErrorEvent[]>('errorIntelligence', []);
  const skillErrors = errors.filter(e => e.skillId === skillId);
  const predictions: ErrorPrediction[] = [];

  if (skillErrors.length === 0 && skillMastery > 60) {
    return []; // No history and good mastery = low risk
  }

  // Predict based on fatigue
  if (fatigueLevel > 50) {
    predictions.push({
      skillId,
      predictedErrorType: 'fatigue_induced',
      probability: Math.min(80, fatigueLevel),
      basedOn: `مستوى التعب ${fatigueLevel}%`,
      preventiveAction: {
        type: 'break_suggest',
        messageAr: 'خذ نفساً عميقاً قبل السؤال التالي 🧘',
        timing: 'before_question',
        priority: 7,
      },
    });
  }

  // Predict based on mastery
  if (skillMastery < 40) {
    predictions.push({
      skillId,
      predictedErrorType: 'knowledge_gap',
      probability: Math.min(80, 80 - skillMastery),
      basedOn: `إتقان منخفض ${skillMastery}%`,
      preventiveAction: {
        type: 'scaffold',
        messageAr: 'سأساعدك خطوة بخطوة 📝',
        timing: 'before_question',
        priority: 8,
      },
    });
  }

  // Predict based on error history pattern
  if (skillErrors.length >= 3) {
    const recentRootCauses = skillErrors.slice(-5).map(e => e.rootCause);
    const mostCommon = findMostCommon(recentRootCauses);

    if (mostCommon) {
      predictions.push({
        skillId,
        predictedErrorType: mostCommon,
        probability: 60,
        basedOn: 'نمط أخطاء سابقة',
        preventiveAction: getPreventiveForCause(mostCommon),
      });
    }
  }

  // Predict based on session position
  if (sessionMinutes > 12 && consecutiveCorrect < 2) {
    predictions.push({
      skillId,
      predictedErrorType: 'careless_mistake',
      probability: 45,
      basedOn: 'جلسة طويلة مع أداء متوسط',
      preventiveAction: {
        type: 'slow_down',
        messageAr: 'خذ وقتك، لا تستعجل 🐢',
        timing: 'before_question',
        priority: 5,
      },
    });
  }

  return predictions.sort((a, b) => b.probability - a.probability);
}

// ============ Error Profile ============

/**
 * Build comprehensive error profile for a student.
 */
export function buildErrorProfile(userId: string): ErrorProfile {
  const errors = loadUserData<ErrorEvent[]>('errorIntelligence', []);

  const rootCauseDistribution: Record<RootCause, number> = {
    knowledge_gap: 0, procedural_error: 0, careless_mistake: 0,
    misconception: 0, fatigue_induced: 0, speed_pressure: 0,
    reading_error: 0, transfer_failure: 0, working_memory: 0, unknown: 0,
  };

  const categoryDistribution: Record<ErrorCategory, number> = {
    computational: 0, conceptual: 0, procedural: 0,
    attention: 0, transfer: 0, memory: 0,
  };

  for (const error of errors) {
    rootCauseDistribution[error.rootCause]++;
    categoryDistribution[error.errorCategory]++;
  }

  // Find patterns
  const patterns = detectErrorPatterns(errors);

  // Generate predictions for weak skills
  const weakSkills = [...new Set(errors.slice(-20).map(e => e.skillId))];
  const predictions: ErrorPrediction[] = [];
  for (const skillId of weakSkills.slice(0, 3)) {
    const preds = predictErrors(skillId, 40, 30, 5, 0);
    predictions.push(...preds);
  }

  // Generate preventive actions
  const preventiveActions = generatePreventiveActions(rootCauseDistribution, errors.length);

  return {
    userId,
    totalErrors: errors.length,
    rootCauseDistribution,
    categoryDistribution,
    errorRate: 0, // Would need total attempts to calculate
    commonPatterns: patterns,
    predictions,
    preventiveActions,
  };
}

// ============ Helpers ============

function detectErrorPatterns(errors: ErrorEvent[]): ErrorPattern[] {
  if (errors.length < 5) return [];

  const patterns: ErrorPattern[] = [];

  // Pattern: Same root cause on same skill
  const skillCauseMap: Record<string, Record<RootCause, number>> = {};
  for (const e of errors) {
    if (!skillCauseMap[e.skillId]) skillCauseMap[e.skillId] = {} as Record<RootCause, number>;
    skillCauseMap[e.skillId][e.rootCause] = (skillCauseMap[e.skillId][e.rootCause] || 0) + 1;
  }

  for (const [skillId, causes] of Object.entries(skillCauseMap)) {
    const topCause = Object.entries(causes).sort((a, b) => b[1] - a[1])[0];
    if (topCause && topCause[1] >= 3) {
      patterns.push({
        description: `خطأ متكرر من نوع "${topCause[0]}" في المهارة ${skillId}`,
        frequency: topCause[1],
        skills: [skillId],
        rootCause: topCause[0] as RootCause,
        timeOfDay: null,
        sessionPosition: null,
      });
    }
  }

  // Pattern: Errors cluster late in sessions
  const lateErrors = errors.filter(e => e.contextFactors.includes('long_session'));
  if (lateErrors.length > errors.length * 0.4) {
    patterns.push({
      description: 'أخطاء تتركز في نهاية الجلسات',
      frequency: lateErrors.length,
      skills: [...new Set(lateErrors.map(e => e.skillId))],
      rootCause: 'fatigue_induced',
      timeOfDay: null,
      sessionPosition: 'late',
    });
  }

  return patterns.slice(0, 5);
}

function generatePreventiveActions(
  distribution: Record<RootCause, number>,
  totalErrors: number
): PreventiveAction[] {
  if (totalErrors === 0) return [];

  const actions: PreventiveAction[] = [];
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  for (const [cause, count] of sorted.slice(0, 3)) {
    if (count === 0) continue;
    actions.push(getPreventiveForCause(cause as RootCause));
  }

  return actions;
}

function getPreventiveForCause(cause: RootCause): PreventiveAction {
  switch (cause) {
    case 'knowledge_gap':
      return { type: 'concept_review', messageAr: 'خلنا نراجع المفهوم أولاً 📖', timing: 'before_question', priority: 9 };
    case 'procedural_error':
      return { type: 'worked_example', messageAr: 'شاهد كيف نحل مثال مشابه ✏️', timing: 'before_question', priority: 8 };
    case 'careless_mistake':
      return { type: 'slow_down', messageAr: 'تأنَّ وتحقق من إجابتك 🔍', timing: 'during_question', priority: 5 };
    case 'fatigue_induced':
      return { type: 'break_suggest', messageAr: 'استرح قليلاً ثم عد بنشاط 🧘', timing: 'before_question', priority: 7 };
    case 'speed_pressure':
      return { type: 'slow_down', messageAr: 'لا تستعجل، خذ وقتك 🐢', timing: 'before_question', priority: 6 };
    case 'misconception':
      return { type: 'scaffold', messageAr: 'سأوضح لك الفكرة بطريقة مختلفة 💡', timing: 'after_error', priority: 9 };
    case 'working_memory':
      return { type: 'visual_aid', messageAr: 'استخدم الرسم لتتذكر الخطوات 🎨', timing: 'before_question', priority: 6 };
    case 'transfer_failure':
      return { type: 'warm_up', messageAr: 'خلنا نبدأ بمثال أسهل 🌱', timing: 'before_question', priority: 7 };
    default:
      return { type: 'reminder', messageAr: 'ركز جيداً 🎯', timing: 'before_question', priority: 4 };
  }
}

function findMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  let maxItem: T = arr[0];
  let maxCount = 0;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  }
  return maxItem;
}