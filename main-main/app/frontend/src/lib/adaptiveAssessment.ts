// Phase 5.5 Deep - Adaptive Assessment Intelligence
// Adaptive question selection, confidence estimation, diagnostic mode
// Integrates with assessmentIntelligence.ts for IRT and CAT

import { loadUserData, saveUserData } from './pilotStorage';
import type { MisconceptionType } from './questionIntelligenceEngine';

// ============ Types ============

export interface AssessmentQuestion {
  id: string;
  skillId: string;
  difficulty: number; // IRT difficulty parameter (-3 to 3)
  discrimination: number; // IRT discrimination (0.5 to 2.5)
  guessing: number; // IRT guessing parameter (0 to 0.3)
  text: string;
  options: string[];
  correctIndex: number;
  misconceptionTarget: MisconceptionType | null;
  cognitiveLevel: 'recall' | 'understand' | 'apply' | 'analyze';
  usageCount: number;
  lastUsed: string | null;
}

export interface AdaptiveState {
  sessionId: string;
  mode: AssessmentMode;
  currentAbility: number; // Theta estimate (-3 to 3)
  abilityStdError: number; // Standard error of estimate
  questionsAsked: number;
  questionsCorrect: number;
  responseHistory: AssessmentResponse[];
  skillDiagnosis: Record<string, SkillDiagnosis>;
  terminationReason: TerminationReason | null;
  confidence: number; // 0-100, how confident we are in the estimate
  startedAt: string;
}

export type AssessmentMode =
  | 'placement'     // Initial placement test
  | 'diagnostic'    // Identify specific weaknesses
  | 'mastery_check' // Verify mastery of specific skill
  | 'adaptive_practice'; // Ongoing adaptive practice

export interface AssessmentResponse {
  questionId: string;
  skillId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  difficulty: number;
  abilityAfter: number;
  timestamp: string;
}

export interface SkillDiagnosis {
  skillId: string;
  questionsAsked: number;
  questionsCorrect: number;
  estimatedMastery: number; // 0-100
  confidence: number; // 0-100
  misconceptionDetected: MisconceptionType | null;
  recommendation: 'mastered' | 'practice' | 'remediate' | 'insufficient_data';
}

export type TerminationReason =
  | 'max_questions'
  | 'sufficient_precision'
  | 'all_skills_diagnosed'
  | 'student_fatigue'
  | 'time_limit';

export interface QuestionSelectionResult {
  question: AssessmentQuestion | null;
  reason: string;
  targetDifficulty: number;
  targetSkill: string | null;
}

// ============ Configuration ============

const MAX_QUESTIONS_PLACEMENT = 15;
const MAX_QUESTIONS_DIAGNOSTIC = 20;
const MAX_QUESTIONS_MASTERY = 8;
const MAX_QUESTIONS_PRACTICE = 30;
const PRECISION_THRESHOLD = 0.3; // Stop when SE < 0.3
const MIN_QUESTIONS_PER_SKILL = 3;
const ABILITY_INITIAL = 0; // Start at average
const ABILITY_SE_INITIAL = 1.5; // High uncertainty initially

// ============ Core Assessment Engine ============

/**
 * Initialize an adaptive assessment session.
 */
export function initAssessment(mode: AssessmentMode, targetSkills?: string[]): AdaptiveState {
  return {
    sessionId: `assess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    mode,
    currentAbility: ABILITY_INITIAL,
    abilityStdError: ABILITY_SE_INITIAL,
    questionsAsked: 0,
    questionsCorrect: 0,
    responseHistory: [],
    skillDiagnosis: targetSkills
      ? Object.fromEntries(targetSkills.map(s => [s, createEmptyDiagnosis(s)]))
      : {},
    terminationReason: null,
    confidence: 0,
    startedAt: new Date().toISOString(),
  };
}

function createEmptyDiagnosis(skillId: string): SkillDiagnosis {
  return {
    skillId,
    questionsAsked: 0,
    questionsCorrect: 0,
    estimatedMastery: 50,
    confidence: 0,
    misconceptionDetected: null,
    recommendation: 'insufficient_data',
  };
}

/**
 * Select the next optimal question based on current state.
 * Uses maximum information criterion from IRT.
 */
export function selectNextQuestion(
  state: AdaptiveState,
  questionPool: AssessmentQuestion[]
): QuestionSelectionResult {
  // Check termination
  const termination = checkTermination(state);
  if (termination) {
    return { question: null, reason: termination, targetDifficulty: 0, targetSkill: null };
  }

  const theta = state.currentAbility;

  // Filter out recently used questions
  const recentIds = new Set(state.responseHistory.slice(-5).map(r => r.questionId));
  const available = questionPool.filter(q => !recentIds.has(q.id));

  if (available.length === 0) {
    return { question: null, reason: 'no_questions_available', targetDifficulty: 0, targetSkill: null };
  }

  // Mode-specific selection
  switch (state.mode) {
    case 'diagnostic':
      return selectDiagnosticQuestion(state, available, theta);
    case 'mastery_check':
      return selectMasteryQuestion(state, available, theta);
    case 'placement':
    case 'adaptive_practice':
    default:
      return selectAdaptiveQuestion(available, theta);
  }
}

function selectAdaptiveQuestion(
  pool: AssessmentQuestion[],
  theta: number
): QuestionSelectionResult {
  // Maximum information: select question with difficulty closest to theta
  // Fisher information is maximized when difficulty ≈ ability
  const targetDifficulty = theta;

  const scored = pool.map(q => ({
    question: q,
    information: calculateFisherInformation(q, theta),
  }));

  scored.sort((a, b) => b.information - a.information);

  // Add some randomization to top 3 to avoid predictability
  const topN = scored.slice(0, Math.min(3, scored.length));
  const selected = topN[Math.floor(Math.random() * topN.length)];

  return {
    question: selected.question,
    reason: 'maximum_information',
    targetDifficulty,
    targetSkill: selected.question.skillId,
  };
}

function selectDiagnosticQuestion(
  state: AdaptiveState,
  pool: AssessmentQuestion[],
  theta: number
): QuestionSelectionResult {
  // In diagnostic mode, prioritize skills with insufficient data
  const underDiagnosed = Object.values(state.skillDiagnosis)
    .filter(d => d.questionsAsked < MIN_QUESTIONS_PER_SKILL)
    .sort((a, b) => a.questionsAsked - b.questionsAsked);

  if (underDiagnosed.length > 0) {
    const targetSkill = underDiagnosed[0].skillId;
    const skillQuestions = pool.filter(q => q.skillId === targetSkill);

    if (skillQuestions.length > 0) {
      // Select question at appropriate difficulty for this skill
      const skillDiag = state.skillDiagnosis[targetSkill];
      const targetDiff = skillDiag.estimatedMastery > 60 ? theta + 0.5 : theta - 0.5;

      const closest = skillQuestions.reduce((best, q) =>
        Math.abs(q.difficulty - targetDiff) < Math.abs(best.difficulty - targetDiff) ? q : best
      );

      return {
        question: closest,
        reason: 'diagnostic_coverage',
        targetDifficulty: targetDiff,
        targetSkill,
      };
    }
  }

  // Fall back to adaptive selection
  return selectAdaptiveQuestion(pool, theta);
}

function selectMasteryQuestion(
  state: AdaptiveState,
  pool: AssessmentQuestion[],
  theta: number
): QuestionSelectionResult {
  // For mastery check, use questions slightly above current ability
  const targetDifficulty = theta + 0.3;

  // Also target specific misconceptions if detected
  const diagWithMisconceptions = Object.values(state.skillDiagnosis)
    .filter(d => d.misconceptionDetected);

  if (diagWithMisconceptions.length > 0) {
    const targetMisconception = diagWithMisconceptions[0].misconceptionDetected;
    const misconceptionQuestions = pool.filter(q => q.misconceptionTarget === targetMisconception);
    if (misconceptionQuestions.length > 0) {
      return {
        question: misconceptionQuestions[Math.floor(Math.random() * misconceptionQuestions.length)],
        reason: 'misconception_probe',
        targetDifficulty,
        targetSkill: diagWithMisconceptions[0].skillId,
      };
    }
  }

  return selectAdaptiveQuestion(pool, targetDifficulty);
}

// ============ Ability Estimation (EAP) ============

/**
 * Update ability estimate after a response using Expected A Posteriori (EAP).
 * More robust than MLE for short tests.
 */
export function updateAbilityEstimate(
  state: AdaptiveState,
  question: AssessmentQuestion,
  isCorrect: boolean,
  responseTimeMs: number
): AdaptiveState {
  const response: AssessmentResponse = {
    questionId: question.id,
    skillId: question.skillId,
    isCorrect,
    responseTimeMs,
    difficulty: question.difficulty,
    abilityAfter: 0, // Will be updated
    timestamp: new Date().toISOString(),
  };

  // EAP estimation using numerical integration
  const newAbility = estimateEAP(state, question, isCorrect);
  const newSE = estimateStandardError(state, question);

  response.abilityAfter = newAbility;

  // Update skill diagnosis
  const updatedDiagnosis = { ...state.skillDiagnosis };
  if (!updatedDiagnosis[question.skillId]) {
    updatedDiagnosis[question.skillId] = createEmptyDiagnosis(question.skillId);
  }
  const diag = updatedDiagnosis[question.skillId];
  diag.questionsAsked++;
  if (isCorrect) diag.questionsCorrect++;
  diag.estimatedMastery = Math.max(0, Math.min(100,
    Math.round((diag.questionsCorrect / diag.questionsAsked) * 100)
  ));
  diag.confidence = Math.min(100, diag.questionsAsked * 25);
  diag.recommendation = getDiagnosisRecommendation(diag);

  // Detect misconception from wrong answers
  if (!isCorrect && question.misconceptionTarget && !diag.misconceptionDetected) {
    // If failed a misconception-targeted question, flag it
    diag.misconceptionDetected = question.misconceptionTarget;
  }

  const confidence = Math.min(100, Math.round((1 - newSE / ABILITY_SE_INITIAL) * 100));

  return {
    ...state,
    currentAbility: newAbility,
    abilityStdError: newSE,
    questionsAsked: state.questionsAsked + 1,
    questionsCorrect: state.questionsCorrect + (isCorrect ? 1 : 0),
    responseHistory: [...state.responseHistory, response],
    skillDiagnosis: updatedDiagnosis,
    confidence: Math.max(0, confidence),
  };
}

function estimateEAP(
  state: AdaptiveState,
  question: AssessmentQuestion,
  isCorrect: boolean
): number {
  // Simple EAP: weighted average of prior and likelihood
  const prior = state.currentAbility;
  const priorWeight = Math.max(0.3, 1 - state.questionsAsked * 0.05);

  // Likelihood-based update
  const pCorrect = iccProbability(state.currentAbility, question);
  const evidenceDirection = isCorrect ? 1 : -1;

  // Step size decreases with more questions (stabilization)
  const stepSize = Math.max(0.1, 0.5 / Math.sqrt(state.questionsAsked + 1));

  // Update based on surprise: if expected correct and was correct, small update
  const surprise = isCorrect ? (1 - pCorrect) : pCorrect;
  const update = evidenceDirection * surprise * stepSize * question.discrimination;

  let newAbility = prior + update;

  // Clamp to reasonable range
  newAbility = Math.max(-3, Math.min(3, newAbility));

  // Guard against NaN
  if (!Number.isFinite(newAbility)) return prior;

  return Math.round(newAbility * 100) / 100;
}

function estimateStandardError(state: AdaptiveState, question: AssessmentQuestion): number {
  // SE decreases with more information gathered
  const totalInfo = state.responseHistory.reduce((sum, r) => {
    // Approximate information from each question
    return sum + 0.25 * question.discrimination;
  }, calculateFisherInformation(question, state.currentAbility));

  const se = totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : ABILITY_SE_INITIAL;
  return Math.max(0.1, Math.min(ABILITY_SE_INITIAL, se));
}

// ============ IRT Functions ============

/**
 * 3-Parameter Logistic (3PL) ICC probability.
 */
function iccProbability(theta: number, question: AssessmentQuestion): number {
  const { difficulty, discrimination, guessing } = question;
  const safeDisc = Math.max(0.1, Math.min(3, discrimination));
  const safeGuess = Math.max(0, Math.min(0.4, guessing));

  const exponent = -safeDisc * (theta - difficulty);
  // Prevent overflow
  const safeExp = Math.max(-20, Math.min(20, exponent));
  const logistic = 1 / (1 + Math.exp(safeExp));

  return safeGuess + (1 - safeGuess) * logistic;
}

/**
 * Fisher Information for a question at given ability level.
 */
function calculateFisherInformation(question: AssessmentQuestion, theta: number): number {
  const p = iccProbability(theta, question);
  const q = 1 - p;
  const { discrimination, guessing } = question;

  if (p <= 0 || q <= 0) return 0;

  const safeDisc = Math.max(0.1, discrimination);
  const safeGuess = Math.max(0, Math.min(0.4, guessing));

  // Fisher information for 3PL
  const numerator = safeDisc * safeDisc * Math.pow(p - safeGuess, 2);
  const denominator = (1 - safeGuess) * (1 - safeGuess) * p * q;

  if (denominator <= 0) return 0;
  const info = numerator / denominator;

  return Number.isFinite(info) ? Math.max(0, info) : 0;
}

// ============ Termination Logic ============

function checkTermination(state: AdaptiveState): TerminationReason | null {
  const maxQ = getMaxQuestions(state.mode);

  if (state.questionsAsked >= maxQ) return 'max_questions';
  if (state.abilityStdError < PRECISION_THRESHOLD && state.questionsAsked >= 5) return 'sufficient_precision';

  // Diagnostic: all skills have enough data
  if (state.mode === 'diagnostic') {
    const allDiagnosed = Object.values(state.skillDiagnosis)
      .every(d => d.questionsAsked >= MIN_QUESTIONS_PER_SKILL);
    if (allDiagnosed) return 'all_skills_diagnosed';
  }

  return null;
}

function getMaxQuestions(mode: AssessmentMode): number {
  switch (mode) {
    case 'placement': return MAX_QUESTIONS_PLACEMENT;
    case 'diagnostic': return MAX_QUESTIONS_DIAGNOSTIC;
    case 'mastery_check': return MAX_QUESTIONS_MASTERY;
    case 'adaptive_practice': return MAX_QUESTIONS_PRACTICE;
  }
}

function getDiagnosisRecommendation(diag: SkillDiagnosis): SkillDiagnosis['recommendation'] {
  if (diag.questionsAsked < MIN_QUESTIONS_PER_SKILL) return 'insufficient_data';
  if (diag.estimatedMastery >= 80) return 'mastered';
  if (diag.misconceptionDetected || diag.estimatedMastery < 40) return 'remediate';
  return 'practice';
}

// ============ Results & Reporting ============

/**
 * Generate assessment report from completed session.
 */
export function generateAssessmentReport(state: AdaptiveState): {
  overallAbility: number;
  abilityLabel: string;
  confidence: number;
  skillResults: SkillDiagnosis[];
  strengths: string[];
  weaknesses: string[];
  recommendedPath: string[];
  summary: string;
} {
  const ability = state.currentAbility;
  const abilityLabel = ability >= 1.5 ? 'متقدم'
    : ability >= 0.5 ? 'جيد'
    : ability >= -0.5 ? 'متوسط'
    : ability >= -1.5 ? 'أقل من المتوسط'
    : 'يحتاج دعم';

  const skillResults = Object.values(state.skillDiagnosis);
  const strengths = skillResults.filter(d => d.recommendation === 'mastered').map(d => d.skillId);
  const weaknesses = skillResults.filter(d => d.recommendation === 'remediate').map(d => d.skillId);
  const recommendedPath = skillResults
    .filter(d => d.recommendation === 'practice' || d.recommendation === 'remediate')
    .sort((a, b) => a.estimatedMastery - b.estimatedMastery)
    .map(d => d.skillId);

  const accuracy = state.questionsAsked > 0
    ? Math.round((state.questionsCorrect / state.questionsAsked) * 100)
    : 0;

  const summary = `أجاب على ${state.questionsAsked} سؤال بدقة ${accuracy}%. ` +
    `المستوى: ${abilityLabel}. ` +
    (weaknesses.length > 0 ? `يحتاج تقوية ${weaknesses.length} مهارة.` : 'أداء ممتاز!');

  return {
    overallAbility: Math.round(ability * 100) / 100,
    abilityLabel,
    confidence: state.confidence,
    skillResults,
    strengths,
    weaknesses,
    recommendedPath,
    summary,
  };
}

// ============ Persistence ============

export function saveAssessmentState(state: AdaptiveState): void {
  saveUserData(`assessment_${state.sessionId}`, state);
  // Also save to history
  const history = loadUserData<string[]>('assessmentHistory', []);
  if (!history.includes(state.sessionId)) {
    history.push(state.sessionId);
    saveUserData('assessmentHistory', history.slice(-20));
  }
}

export function loadAssessmentState(sessionId: string): AdaptiveState | null {
  return loadUserData<AdaptiveState | null>(`assessment_${sessionId}`, null);
}