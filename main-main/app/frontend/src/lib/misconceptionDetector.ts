// Phase 5.5 Deep - Real-Time Misconception Detection Engine
// Detects misconception patterns in real-time during sessions
// Triggers targeted remediation automatically
// Integrates with cognitiveRemediation and prerequisiteGating

import { loadUserData, saveUserData } from './pilotStorage';
import type { MisconceptionType } from './questionIntelligenceEngine';
import { misconceptionProfiles } from './misconceptionMapping';
import { initRemediation, type RemediationType } from './cognitiveRemediation';

// ============ Types ============

export interface MisconceptionSignal {
  type: MisconceptionType;
  confidence: number; // 0-100, how sure we are
  evidence: MisconceptionEvidence[];
  detectedAt: string;
  skillContext: string;
}

export interface MisconceptionEvidence {
  questionId: string;
  studentAnswer: number | string;
  correctAnswer: number | string;
  responseTimeMs: number;
  pattern: EvidencePattern;
  timestamp: string;
}

export type EvidencePattern =
  | 'off_by_one'           // ±1 error (counting)
  | 'digit_swap'           // 47→74 (place value)
  | 'operation_inverse'    // used + instead of - or vice versa
  | 'rushed_random'        // <2s response, random answer
  | 'consistent_offset'    // always off by same amount
  | 'pattern_break'        // correct pattern then sudden wrong
  | 'near_miss'            // close to correct (rounding/estimation)
  | 'guessing'             // random distribution, fast responses
  | 'perseveration'        // repeating same wrong answer
  | 'unknown';

export interface DetectionSession {
  sessionId: string;
  startedAt: string;
  answers: SessionAnswer[];
  detectedMisconceptions: MisconceptionSignal[];
  remediationTriggered: boolean;
  currentConfidence: Record<MisconceptionType, number>;
}

export interface SessionAnswer {
  questionId: string;
  skillId: string;
  studentAnswer: number | string;
  correctAnswer: number | string;
  isCorrect: boolean;
  responseTimeMs: number;
  timestamp: string;
}

export interface DetectionResult {
  misconceptionDetected: boolean;
  signal: MisconceptionSignal | null;
  shouldTriggerRemediation: boolean;
  remediationType: RemediationType | null;
  feedbackMessage: string;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

// ============ Configuration ============

const DETECTION_WINDOW = 5; // Look at last N answers
const CONFIDENCE_THRESHOLD = 65; // Trigger remediation at this confidence
const GUESSING_SPEED_MS = 2000; // Answers faster than this may be guessing
const MIN_EVIDENCE_COUNT = 2; // Need at least 2 pieces of evidence
const PERSEVERATION_COUNT = 3; // Same wrong answer 3 times = perseveration

// ============ Core Detection Engine ============

/**
 * Analyze a new answer in context of recent session history.
 * Returns detection result with remediation recommendation.
 */
export function analyzeAnswer(
  session: DetectionSession,
  newAnswer: SessionAnswer
): DetectionResult {
  // Add to session
  const updatedSession: DetectionSession = {
    ...session,
    answers: [...session.answers, newAnswer],
  };

  // If correct, decay misconception confidence
  if (newAnswer.isCorrect) {
    return {
      misconceptionDetected: false,
      signal: null,
      shouldTriggerRemediation: false,
      remediationType: null,
      feedbackMessage: '',
      urgency: 'none',
    };
  }

  // Analyze the wrong answer for patterns
  const evidence = classifyError(newAnswer);
  const recentAnswers = updatedSession.answers.slice(-DETECTION_WINDOW);
  const recentWrong = recentAnswers.filter(a => !a.isCorrect);

  // Build evidence array from recent wrong answers
  const allEvidence: MisconceptionEvidence[] = recentWrong.map(a => ({
    questionId: a.questionId,
    studentAnswer: a.studentAnswer,
    correctAnswer: a.correctAnswer,
    responseTimeMs: a.responseTimeMs,
    pattern: classifyError(a),
    timestamp: a.timestamp,
  }));

  // Detect misconception type from evidence patterns
  const signal = detectMisconceptionFromEvidence(allEvidence, newAnswer.skillId);

  if (!signal || signal.confidence < CONFIDENCE_THRESHOLD) {
    return {
      misconceptionDetected: signal !== null,
      signal,
      shouldTriggerRemediation: false,
      remediationType: null,
      feedbackMessage: signal ? getEarlyWarningMessage(signal.type) : '',
      urgency: signal ? (signal.confidence > 40 ? 'low' : 'none') : 'none',
    };
  }

  // High confidence misconception detected
  const remediationType = mapMisconceptionToRemediation(signal.type);
  const urgency = signal.confidence >= 85 ? 'critical'
    : signal.confidence >= 75 ? 'high'
    : 'medium';

  return {
    misconceptionDetected: true,
    signal,
    shouldTriggerRemediation: true,
    remediationType,
    feedbackMessage: getMisconceptionFeedback(signal.type),
    urgency,
  };
}

/**
 * Classify a single wrong answer into an evidence pattern.
 */
function classifyError(answer: SessionAnswer): EvidencePattern {
  const student = Number(answer.studentAnswer);
  const correct = Number(answer.correctAnswer);

  // Check if both are numbers
  if (Number.isFinite(student) && Number.isFinite(correct)) {
    const diff = Math.abs(student - correct);

    // Off by one
    if (diff === 1) return 'off_by_one';

    // Digit swap (e.g., 47 → 74)
    if (isDigitSwap(student, correct)) return 'digit_swap';

    // Operation inverse (sum vs difference)
    // If student = a+b when correct = a-b, student-correct = 2b
    // This is heuristic - check if student answer could be from wrong operation
    if (student === correct + 2 * Math.min(student, correct) || student + correct === 2 * Math.max(student, correct)) {
      return 'operation_inverse';
    }

    // Consistent offset (check if same error repeated)
    if (diff > 1 && diff <= 10) return 'consistent_offset';

    // Near miss
    if (diff <= 2) return 'near_miss';
  }

  // Rushed/random
  if (answer.responseTimeMs < GUESSING_SPEED_MS) return 'rushed_random';

  return 'unknown';
}

function isDigitSwap(a: number, b: number): boolean {
  if (a < 10 || b < 10) return false;
  if (a > 99 || b > 99) return false; // Only handle 2-digit for now
  const aStr = String(a);
  const bStr = String(b);
  if (aStr.length !== bStr.length) return false;
  return aStr.split('').reverse().join('') === bStr;
}

/**
 * Detect misconception type from accumulated evidence.
 */
function detectMisconceptionFromEvidence(
  evidence: MisconceptionEvidence[],
  currentSkillId: string
): MisconceptionSignal | null {
  if (evidence.length < MIN_EVIDENCE_COUNT) return null;

  // Count pattern occurrences
  const patternCounts: Record<EvidencePattern, number> = {
    off_by_one: 0,
    digit_swap: 0,
    operation_inverse: 0,
    rushed_random: 0,
    consistent_offset: 0,
    pattern_break: 0,
    near_miss: 0,
    guessing: 0,
    perseveration: 0,
    unknown: 0,
  };

  for (const e of evidence) {
    patternCounts[e.pattern]++;
  }

  // Check for perseveration (same wrong answer repeated)
  const wrongAnswers = evidence.map(e => String(e.studentAnswer));
  const answerFreq: Record<string, number> = {};
  for (const a of wrongAnswers) {
    answerFreq[a] = (answerFreq[a] || 0) + 1;
  }
  const maxRepeat = Math.max(...Object.values(answerFreq), 0);
  if (maxRepeat >= PERSEVERATION_COUNT) {
    patternCounts.perseveration = maxRepeat;
  }

  // Check for guessing (many fast random answers)
  const fastAnswers = evidence.filter(e => e.responseTimeMs < GUESSING_SPEED_MS);
  if (fastAnswers.length >= 3) {
    patternCounts.guessing = fastAnswers.length;
  }

  // Map patterns to misconception types
  const misconceptionScores: Record<MisconceptionType, number> = {
    counting_confusion: patternCounts.off_by_one * 30 + patternCounts.consistent_offset * 15,
    place_value_confusion: patternCounts.digit_swap * 40 + patternCounts.consistent_offset * 10,
    operation_switch: patternCounts.operation_inverse * 35,
    visual_misread: patternCounts.near_miss * 20 + patternCounts.pattern_break * 15,
    sequence_confusion: patternCounts.consistent_offset * 20 + patternCounts.off_by_one * 10,
    none: patternCounts.guessing * 25 + patternCounts.rushed_random * 20,
  };

  // Find highest scoring misconception
  let bestType: MisconceptionType = 'none';
  let bestScore = 0;
  for (const [type, score] of Object.entries(misconceptionScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as MisconceptionType;
    }
  }

  if (bestType === 'none' || bestScore < 30) return null;

  // Normalize confidence to 0-100
  const confidence = Math.min(100, bestScore);

  return {
    type: bestType,
    confidence,
    evidence,
    detectedAt: new Date().toISOString(),
    skillContext: currentSkillId,
  };
}

// ============ Remediation Mapping ============

function mapMisconceptionToRemediation(type: MisconceptionType): RemediationType {
  switch (type) {
    case 'counting_confusion': return 'prerequisite_gap';
    case 'place_value_confusion': return 'conceptual_error';
    case 'operation_switch': return 'conceptual_error';
    case 'visual_misread': return 'attention_error';
    case 'sequence_confusion': return 'procedural_error';
    default: return 'procedural_error';
  }
}

// ============ Session Management ============

export function createDetectionSession(): DetectionSession {
  return {
    sessionId: `det_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
    answers: [],
    detectedMisconceptions: [],
    remediationTriggered: false,
    currentConfidence: {
      counting_confusion: 0,
      place_value_confusion: 0,
      operation_switch: 0,
      visual_misread: 0,
      sequence_confusion: 0,
      none: 0,
    },
  };
}

export function finalizeDetectionSession(session: DetectionSession): void {
  if (session.detectedMisconceptions.length === 0) return;

  // Save to history
  const history = loadUserData<DetectionSession[]>('misconceptionSessions', []);
  history.push(session);
  saveUserData('misconceptionSessions', history.slice(-20));
}

// ============ Feedback Messages ============

function getMisconceptionFeedback(type: MisconceptionType): string {
  switch (type) {
    case 'counting_confusion':
      return 'لاحظت أنك تخطئ في العد. خلنا نتدرب على العد بهدوء 🐢';
    case 'place_value_confusion':
      return 'يبدو أن هناك خلط بين العشرات والآحاد. خلنا نراجع القيمة المكانية 🔢';
    case 'operation_switch':
      return 'انتبه! يبدو أنك تخلط بين الجمع والطرح. خلنا نميز بينهم ➕➖';
    case 'visual_misread':
      return 'خذ وقتك في قراءة السؤال. انظر بعناية للأرقام والأشكال 👀';
    case 'sequence_confusion':
      return 'التسلسل مهم! خلنا نتدرب على ترتيب الأعداد 📊';
    default:
      return 'لا بأس! خلنا نحاول بطريقة مختلفة 💪';
  }
}

function getEarlyWarningMessage(type: MisconceptionType): string {
  switch (type) {
    case 'counting_confusion': return 'تأكد من العد بالترتيب 🔢';
    case 'place_value_confusion': return 'تذكر: العشرات على اليسار والآحاد على اليمين';
    case 'operation_switch': return 'اقرأ السؤال مرة ثانية: هل يطلب جمع أم طرح؟';
    case 'visual_misread': return 'انظر للسؤال مرة أخرى بعناية 👀';
    case 'sequence_confusion': return 'فكر في الترتيب... ماذا يأتي بعد؟';
    default: return '';
  }
}

// ============ Analytics ============

/**
 * Get misconception trends over time for a student.
 */
export function getMisconceptionTrends(): {
  type: MisconceptionType;
  frequency: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastSeen: string;
}[] {
  const sessions = loadUserData<DetectionSession[]>('misconceptionSessions', []);
  if (sessions.length === 0) return [];

  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;

  const typeStats: Record<MisconceptionType, { recent: number; older: number; lastSeen: string }> = {
    counting_confusion: { recent: 0, older: 0, lastSeen: '' },
    place_value_confusion: { recent: 0, older: 0, lastSeen: '' },
    operation_switch: { recent: 0, older: 0, lastSeen: '' },
    visual_misread: { recent: 0, older: 0, lastSeen: '' },
    sequence_confusion: { recent: 0, older: 0, lastSeen: '' },
    none: { recent: 0, older: 0, lastSeen: '' },
  };

  for (const session of sessions) {
    for (const signal of session.detectedMisconceptions) {
      const age = now - new Date(signal.detectedAt).getTime();
      if (age < week) {
        typeStats[signal.type].recent++;
      } else if (age < week * 2) {
        typeStats[signal.type].older++;
      }
      if (!typeStats[signal.type].lastSeen || signal.detectedAt > typeStats[signal.type].lastSeen) {
        typeStats[signal.type].lastSeen = signal.detectedAt;
      }
    }
  }

  return Object.entries(typeStats)
    .filter(([type]) => type !== 'none')
    .filter(([, stats]) => stats.recent > 0 || stats.older > 0)
    .map(([type, stats]) => ({
      type: type as MisconceptionType,
      frequency: stats.recent + stats.older,
      trend: stats.recent > stats.older + 1 ? 'increasing' as const
        : stats.recent < stats.older - 1 ? 'decreasing' as const
        : 'stable' as const,
      lastSeen: stats.lastSeen,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}