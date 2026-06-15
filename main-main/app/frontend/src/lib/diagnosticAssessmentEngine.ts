// Assessment Intelligence Sprint - Diagnostic Assessment Engine
// Orchestrates diagnostic assessments: connects misconception detection,
// skill diagnosis, remediation triggering, and mastery confidence estimation
// Understands WHY mistakes happen, not just that they happened

import { loadUserData, saveUserData } from './pilotStorage';
import { matchAnswerToMisconception, getMisconceptionById, type PatternMatch, type MisconceptionCategory } from './misconceptionTaxonomy';
import { initRemediation, type RemediationType } from './cognitiveRemediation';

// ============ Types ============

export interface DiagnosticSession {
  id: string;
  studentId: string;
  startedAt: string;
  completedAt: string | null;
  mode: DiagnosticMode;
  targetSkills: string[];
  results: DiagnosticResult[];
  overallDiagnosis: OverallDiagnosis | null;
  interactionTelemetry: InteractionTelemetry;
  status: 'active' | 'completed' | 'abandoned';
}

export type DiagnosticMode =
  | 'full_diagnostic'      // Comprehensive skill assessment
  | 'targeted_probe'       // Probe specific suspected weakness
  | 'misconception_hunt'   // Actively search for misconceptions
  | 'mastery_verification' // Verify claimed mastery
  | 'prerequisite_check';  // Check if prerequisites are solid

export interface DiagnosticResult {
  questionId: string;
  skillId: string;
  studentAnswer: number | string;
  correctAnswer: number | string;
  isCorrect: boolean;
  responseTimeMs: number;
  timestamp: string;
  misconceptionMatches: PatternMatch[];
  rootCauseEstimate: RootCauseEstimate;
  confidenceInResult: number; // 0-100
}

export interface RootCauseEstimate {
  primaryCause: RootCause;
  confidence: number; // 0-100
  secondaryCauses: { cause: RootCause; probability: number }[];
  evidence: string[];
}

export type RootCause =
  | 'knowledge_gap'
  | 'procedural_error'
  | 'careless_mistake'
  | 'misconception'
  | 'fatigue'
  | 'speed_pressure'
  | 'reading_error'
  | 'transfer_failure'
  | 'working_memory'
  | 'guessing';

export interface OverallDiagnosis {
  skillMastery: Record<string, SkillMasteryDiagnosis>;
  detectedMisconceptions: DetectedMisconception[];
  prerequisiteGaps: string[];
  remediationPlan: RemediationRecommendation[];
  confidenceLevel: number; // 0-100
  summaryAr: string;
}

export interface SkillMasteryDiagnosis {
  skillId: string;
  masteryLevel: number; // 0-100
  confidence: number; // 0-100
  questionsAsked: number;
  questionsCorrect: number;
  avgResponseTime: number;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  misconceptionRisk: number; // 0-100
}

export interface DetectedMisconception {
  misconceptionId: string;
  category: MisconceptionCategory;
  confidence: number;
  evidenceCount: number;
  firstDetectedAt: string;
  affectedSkills: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RemediationRecommendation {
  priority: number; // 1 = highest
  skillId: string;
  misconceptionId: string | null;
  type: RemediationType;
  reason: string;
  estimatedSessions: number;
  urgency: 'immediate' | 'soon' | 'scheduled';
}

export interface InteractionTelemetry {
  totalTime: number;
  avgResponseTime: number;
  hesitationCount: number; // responses > 15s
  rushCount: number; // responses < 2s
  changeCount: number; // answer changes
  frustrationScore: number; // 0-100
  engagementScore: number; // 0-100
  fatigueIndicators: number;
}

// ============ Configuration ============

const CONFIG = {
  maxQuestionsPerSession: 20,
  minQuestionsForDiagnosis: 5,
  misconceptionConfidenceThreshold: 60,
  masteryThreshold: 80,
  hesitationThresholdMs: 15000,
  rushThresholdMs: 2000,
  fatigueResponseTimeIncrease: 1.5, // 50% slower = fatigue
  guessingSpeedMs: 1500,
  minCorrectForMastery: 0.8,
};

// ============ Session Management ============

export function createDiagnosticSession(
  studentId: string,
  mode: DiagnosticMode,
  targetSkills: string[]
): DiagnosticSession {
  const session: DiagnosticSession = {
    id: `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    mode,
    targetSkills,
    results: [],
    overallDiagnosis: null,
    interactionTelemetry: {
      totalTime: 0,
      avgResponseTime: 0,
      hesitationCount: 0,
      rushCount: 0,
      changeCount: 0,
      frustrationScore: 0,
      engagementScore: 100,
      fatigueIndicators: 0,
    },
    status: 'active',
  };

  saveDiagnosticSession(session);
  return session;
}

// ============ Answer Processing ============

export function processAnswer(
  session: DiagnosticSession,
  questionId: string,
  skillId: string,
  studentAnswer: number | string,
  correctAnswer: number | string,
  responseTimeMs: number,
  questionContext?: string
): DiagnosticResult {
  const isCorrect = String(studentAnswer) === String(correctAnswer);

  // Detect misconception patterns
  const misconceptionMatches = isCorrect
    ? []
    : matchAnswerToMisconception(studentAnswer, correctAnswer, skillId, questionContext);

  // Estimate root cause
  const rootCauseEstimate = estimateRootCause(
    isCorrect,
    responseTimeMs,
    misconceptionMatches,
    session.results,
    session.interactionTelemetry
  );

  const result: DiagnosticResult = {
    questionId,
    skillId,
    studentAnswer,
    correctAnswer,
    isCorrect,
    responseTimeMs,
    timestamp: new Date().toISOString(),
    misconceptionMatches,
    rootCauseEstimate,
    confidenceInResult: calculateResultConfidence(isCorrect, responseTimeMs, misconceptionMatches),
  };

  // Update session
  session.results.push(result);
  updateTelemetry(session, responseTimeMs);

  // Check if we should trigger immediate remediation
  const shouldRemediate = checkRemediationTrigger(session);
  if (shouldRemediate) {
    triggerRemediation(session, shouldRemediate);
  }

  saveDiagnosticSession(session);
  return result;
}

// ============ Root Cause Analysis ============

function estimateRootCause(
  isCorrect: boolean,
  responseTimeMs: number,
  misconceptions: PatternMatch[],
  history: DiagnosticResult[],
  telemetry: InteractionTelemetry
): RootCauseEstimate {
  if (isCorrect) {
    return {
      primaryCause: 'knowledge_gap', // placeholder, not really applicable
      confidence: 0,
      secondaryCauses: [],
      evidence: ['Correct answer'],
    };
  }

  const causes: { cause: RootCause; probability: number; evidence: string[] }[] = [];

  // Check for guessing (very fast, random)
  if (responseTimeMs < CONFIG.guessingSpeedMs) {
    causes.push({
      cause: 'guessing',
      probability: 70 + Math.min(20, (CONFIG.guessingSpeedMs - responseTimeMs) / 50),
      evidence: [`Response time ${responseTimeMs}ms < ${CONFIG.guessingSpeedMs}ms threshold`],
    });
  }

  // Check for misconception
  if (misconceptions.length > 0 && misconceptions[0].confidence > 50) {
    causes.push({
      cause: 'misconception',
      probability: misconceptions[0].confidence,
      evidence: [`Matched misconception ${misconceptions[0].misconceptionId} with ${misconceptions[0].confidence}% confidence`],
    });
  }

  // Check for fatigue
  if (telemetry.fatigueIndicators > 2 && responseTimeMs > CONFIG.hesitationThresholdMs) {
    causes.push({
      cause: 'fatigue',
      probability: 50 + telemetry.fatigueIndicators * 10,
      evidence: [`${telemetry.fatigueIndicators} fatigue indicators, slow response`],
    });
  }

  // Check for careless mistake (was correct before on same skill, fast response)
  const sameSkillHistory = history.filter(r => r.skillId === history[history.length - 1]?.skillId);
  const previouslyCorrect = sameSkillHistory.filter(r => r.isCorrect).length;
  if (previouslyCorrect > 0 && responseTimeMs < 5000) {
    causes.push({
      cause: 'careless_mistake',
      probability: 40 + previouslyCorrect * 15,
      evidence: [`Previously answered ${previouslyCorrect} correctly on this skill, fast response`],
    });
  }

  // Check for speed pressure
  if (responseTimeMs < CONFIG.rushThresholdMs && telemetry.rushCount > 2) {
    causes.push({
      cause: 'speed_pressure',
      probability: 55,
      evidence: [`Rush pattern detected: ${telemetry.rushCount} fast responses`],
    });
  }

  // Default: knowledge gap
  if (causes.length === 0 || causes.every(c => c.probability < 40)) {
    causes.push({
      cause: 'knowledge_gap',
      probability: 60,
      evidence: ['No specific pattern detected, likely knowledge gap'],
    });
  }

  // Sort by probability
  causes.sort((a, b) => b.probability - a.probability);

  return {
    primaryCause: causes[0].cause,
    confidence: Math.min(100, causes[0].probability),
    secondaryCauses: causes.slice(1).map(c => ({ cause: c.cause, probability: c.probability })),
    evidence: causes[0].evidence,
  };
}

// ============ Telemetry Update ============

function updateTelemetry(session: DiagnosticSession, responseTimeMs: number): void {
  const t = session.interactionTelemetry;
  const results = session.results;

  t.totalTime = results.reduce((s, r) => s + r.responseTimeMs, 0);
  t.avgResponseTime = results.length > 0 ? t.totalTime / results.length : 0;

  if (responseTimeMs > CONFIG.hesitationThresholdMs) t.hesitationCount++;
  if (responseTimeMs < CONFIG.rushThresholdMs) t.rushCount++;

  // Fatigue detection: are responses getting slower?
  if (results.length >= 5) {
    const recent5 = results.slice(-5).map(r => r.responseTimeMs);
    const earlier5 = results.slice(Math.max(0, results.length - 10), results.length - 5).map(r => r.responseTimeMs);
    if (earlier5.length > 0) {
      const recentAvg = recent5.reduce((s, v) => s + v, 0) / recent5.length;
      const earlierAvg = earlier5.reduce((s, v) => s + v, 0) / earlier5.length;
      if (recentAvg > earlierAvg * CONFIG.fatigueResponseTimeIncrease) {
        t.fatigueIndicators++;
      }
    }
  }

  // Frustration: many wrong answers in a row
  const recentCorrectness = results.slice(-5).map(r => r.isCorrect);
  const recentWrong = recentCorrectness.filter(c => !c).length;
  t.frustrationScore = Math.min(100, recentWrong * 20 + t.hesitationCount * 5);

  // Engagement: mix of speed and correctness
  const correctRate = results.filter(r => r.isCorrect).length / Math.max(1, results.length);
  t.engagementScore = Math.max(0, Math.min(100, correctRate * 50 + (1 - t.rushCount / Math.max(1, results.length)) * 50));
}

// ============ Remediation Trigger ============

function checkRemediationTrigger(session: DiagnosticSession): DetectedMisconception | null {
  // Aggregate misconception evidence across results
  const misconceptionEvidence: Record<string, { count: number; totalConfidence: number; skills: Set<string> }> = {};

  for (const result of session.results) {
    for (const match of result.misconceptionMatches) {
      if (!misconceptionEvidence[match.misconceptionId]) {
        misconceptionEvidence[match.misconceptionId] = { count: 0, totalConfidence: 0, skills: new Set() };
      }
      misconceptionEvidence[match.misconceptionId].count++;
      misconceptionEvidence[match.misconceptionId].totalConfidence += match.confidence;
      misconceptionEvidence[match.misconceptionId].skills.add(result.skillId);
    }
  }

  // Find misconceptions above threshold
  for (const [id, evidence] of Object.entries(misconceptionEvidence)) {
    const avgConfidence = evidence.totalConfidence / evidence.count;
    if (evidence.count >= 2 && avgConfidence >= CONFIG.misconceptionConfidenceThreshold) {
      const profile = getMisconceptionById(id);
      return {
        misconceptionId: id,
        category: profile?.category || 'arithmetic',
        confidence: Math.round(avgConfidence),
        evidenceCount: evidence.count,
        firstDetectedAt: session.results.find(r => r.misconceptionMatches.some(m => m.misconceptionId === id))?.timestamp || '',
        affectedSkills: Array.from(evidence.skills),
        severity: profile?.severity || 'medium',
      };
    }
  }

  return null;
}

function triggerRemediation(session: DiagnosticSession, misconception: DetectedMisconception): void {
  const profile = getMisconceptionById(misconception.misconceptionId);
  if (!profile) return;

  // Use cognitive remediation system
  for (const skillId of misconception.affectedSkills) {
    initRemediation(
      session.studentId,
      skillId,
      profile.remediationPath.primaryStrategy,
      misconception.misconceptionId
    );
  }
}

// ============ Session Completion & Diagnosis ============

export function completeDiagnosticSession(session: DiagnosticSession): OverallDiagnosis {
  const diagnosis = generateOverallDiagnosis(session);
  session.overallDiagnosis = diagnosis;
  session.completedAt = new Date().toISOString();
  session.status = 'completed';
  saveDiagnosticSession(session);
  saveStudentDiagnosticHistory(session.studentId, diagnosis);
  return diagnosis;
}

function generateOverallDiagnosis(session: DiagnosticSession): OverallDiagnosis {
  // Skill mastery analysis
  const skillMastery: Record<string, SkillMasteryDiagnosis> = {};
  const skillResults: Record<string, DiagnosticResult[]> = {};

  for (const result of session.results) {
    if (!skillResults[result.skillId]) skillResults[result.skillId] = [];
    skillResults[result.skillId].push(result);
  }

  for (const [skillId, results] of Object.entries(skillResults)) {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const mastery = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgTime = results.reduce((s, r) => s + r.responseTimeMs, 0) / Math.max(1, total);

    // Confidence based on sample size
    const confidence = Math.min(95, 30 + total * 15);

    // Trend detection
    let trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';
    if (results.length >= 4) {
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));
      const firstRate = firstHalf.filter(r => r.isCorrect).length / firstHalf.length;
      const secondRate = secondHalf.filter(r => r.isCorrect).length / secondHalf.length;
      if (secondRate > firstRate + 0.15) trend = 'improving';
      else if (secondRate < firstRate - 0.15) trend = 'declining';
      else trend = 'stable';
    }

    // Misconception risk
    const misconceptionResults = results.filter(r => r.misconceptionMatches.length > 0);
    const misconceptionRisk = total > 0 ? Math.round((misconceptionResults.length / total) * 100) : 0;

    skillMastery[skillId] = {
      skillId,
      masteryLevel: mastery,
      confidence,
      questionsAsked: total,
      questionsCorrect: correct,
      avgResponseTime: Math.round(avgTime),
      trend,
      misconceptionRisk,
    };
  }

  // Detected misconceptions
  const detectedMisconceptions: DetectedMisconception[] = [];
  const misconceptionAgg: Record<string, { count: number; totalConf: number; skills: Set<string>; firstTime: string }> = {};

  for (const result of session.results) {
    for (const match of result.misconceptionMatches) {
      if (!misconceptionAgg[match.misconceptionId]) {
        misconceptionAgg[match.misconceptionId] = { count: 0, totalConf: 0, skills: new Set(), firstTime: result.timestamp };
      }
      misconceptionAgg[match.misconceptionId].count++;
      misconceptionAgg[match.misconceptionId].totalConf += match.confidence;
      misconceptionAgg[match.misconceptionId].skills.add(result.skillId);
    }
  }

  for (const [id, agg] of Object.entries(misconceptionAgg)) {
    const avgConf = Math.round(agg.totalConf / agg.count);
    if (avgConf >= 50) {
      const profile = getMisconceptionById(id);
      detectedMisconceptions.push({
        misconceptionId: id,
        category: profile?.category || 'arithmetic',
        confidence: avgConf,
        evidenceCount: agg.count,
        firstDetectedAt: agg.firstTime,
        affectedSkills: Array.from(agg.skills),
        severity: profile?.severity || 'medium',
      });
    }
  }

  // Prerequisite gaps
  const prerequisiteGaps: string[] = [];
  for (const [skillId, diag] of Object.entries(skillMastery)) {
    if (diag.masteryLevel < 40 && diag.confidence > 50) {
      prerequisiteGaps.push(skillId);
    }
  }

  // Remediation plan
  const remediationPlan: RemediationRecommendation[] = [];
  let priority = 1;

  // Critical misconceptions first
  for (const misc of detectedMisconceptions.filter(m => m.severity === 'critical' || m.severity === 'high')) {
    const profile = getMisconceptionById(misc.misconceptionId);
    remediationPlan.push({
      priority: priority++,
      skillId: misc.affectedSkills[0] || '',
      misconceptionId: misc.misconceptionId,
      type: profile?.remediationPath.primaryStrategy || 'conceptual_error',
      reason: `مفهوم خاطئ مكتشف: ${profile?.nameAr || misc.misconceptionId}`,
      estimatedSessions: profile?.remediationPath.estimatedSessions || 3,
      urgency: misc.severity === 'critical' ? 'immediate' : 'soon',
    });
  }

  // Weak skills
  for (const [skillId, diag] of Object.entries(skillMastery)) {
    if (diag.masteryLevel < 50 && !remediationPlan.some(r => r.skillId === skillId)) {
      remediationPlan.push({
        priority: priority++,
        skillId,
        misconceptionId: null,
        type: diag.misconceptionRisk > 50 ? 'conceptual_error' : 'knowledge_gap' as RemediationType,
        reason: `مستوى إتقان منخفض: ${diag.masteryLevel}%`,
        estimatedSessions: 2,
        urgency: diag.masteryLevel < 30 ? 'immediate' : 'scheduled',
      });
    }
  }

  // Confidence level
  const totalQuestions = session.results.length;
  const confidenceLevel = Math.min(95, 20 + totalQuestions * 8);

  // Arabic summary
  const weakSkillCount = Object.values(skillMastery).filter(s => s.masteryLevel < 50).length;
  const summaryAr = `تم تشخيص ${Object.keys(skillMastery).length} مهارة. ` +
    `${detectedMisconceptions.length} مفهوم خاطئ مكتشف. ` +
    `${weakSkillCount} مهارة تحتاج تدخل. ` +
    `مستوى الثقة: ${confidenceLevel}%`;

  return {
    skillMastery,
    detectedMisconceptions,
    prerequisiteGaps,
    remediationPlan,
    confidenceLevel,
    summaryAr,
  };
}

// ============ Confidence Calculation ============

function calculateResultConfidence(
  isCorrect: boolean,
  responseTimeMs: number,
  misconceptions: PatternMatch[]
): number {
  let confidence = 50;

  // Correct answers with reasonable time = high confidence
  if (isCorrect && responseTimeMs > CONFIG.rushThresholdMs && responseTimeMs < CONFIG.hesitationThresholdMs) {
    confidence = 90;
  } else if (isCorrect && responseTimeMs < CONFIG.rushThresholdMs) {
    confidence = 60; // Might be guessing
  } else if (!isCorrect && misconceptions.length > 0) {
    confidence = 75; // We know why it's wrong
  } else if (!isCorrect) {
    confidence = 65;
  }

  return confidence;
}

// ============ Persistence ============

function saveDiagnosticSession(session: DiagnosticSession): void {
  const sessions = loadUserData<DiagnosticSession[]>(`diagnostic_sessions_${session.studentId}`) || [];
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.push(session);
  // Keep last 20 sessions
  const trimmed = sessions.slice(-20);
  saveUserData(`diagnostic_sessions_${session.studentId}`, trimmed);
}

function saveStudentDiagnosticHistory(studentId: string, diagnosis: OverallDiagnosis): void {
  const history = loadUserData<OverallDiagnosis[]>(`diagnostic_history_${studentId}`) || [];
  history.push(diagnosis);
  const trimmed = history.slice(-10);
  saveUserData(`diagnostic_history_${studentId}`, trimmed);
}

export function getStudentDiagnosticHistory(studentId: string): OverallDiagnosis[] {
  return loadUserData<OverallDiagnosis[]>(`diagnostic_history_${studentId}`) || [];
}

export function getActiveDiagnosticSession(studentId: string): DiagnosticSession | null {
  const sessions = loadUserData<DiagnosticSession[]>(`diagnostic_sessions_${studentId}`) || [];
  return sessions.find(s => s.status === 'active') || null;
}

// ============ Analytics Queries ============

export function getStudentWeakSkills(studentId: string): SkillMasteryDiagnosis[] {
  const history = getStudentDiagnosticHistory(studentId);
  if (history.length === 0) return [];
  const latest = history[history.length - 1];
  return Object.values(latest.skillMastery)
    .filter(s => s.masteryLevel < 60)
    .sort((a, b) => a.masteryLevel - b.masteryLevel);
}

export function getStudentMisconceptions(studentId: string): DetectedMisconception[] {
  const history = getStudentDiagnosticHistory(studentId);
  if (history.length === 0) return [];
  const latest = history[history.length - 1];
  return latest.detectedMisconceptions.sort((a, b) => b.confidence - a.confidence);
}

export function getClassDiagnosticSummary(studentIds: string[]): {
  totalAssessments: number;
  avgMastery: number;
  commonMisconceptions: { id: string; studentCount: number; avgConfidence: number }[];
  weakestSkills: { skillId: string; avgMastery: number; studentCount: number }[];
} {
  let totalAssessments = 0;
  let totalMastery = 0;
  let masteryCount = 0;
  const miscCount: Record<string, { students: Set<string>; totalConf: number; count: number }> = {};
  const skillWeakness: Record<string, { totalMastery: number; count: number; weakStudents: number }> = {};

  for (const studentId of studentIds) {
    const history = getStudentDiagnosticHistory(studentId);
    totalAssessments += history.length;

    if (history.length === 0) continue;
    const latest = history[history.length - 1];

    for (const [skillId, diag] of Object.entries(latest.skillMastery)) {
      totalMastery += diag.masteryLevel;
      masteryCount++;
      if (!skillWeakness[skillId]) skillWeakness[skillId] = { totalMastery: 0, count: 0, weakStudents: 0 };
      skillWeakness[skillId].totalMastery += diag.masteryLevel;
      skillWeakness[skillId].count++;
      if (diag.masteryLevel < 50) skillWeakness[skillId].weakStudents++;
    }

    for (const misc of latest.detectedMisconceptions) {
      if (!miscCount[misc.misconceptionId]) miscCount[misc.misconceptionId] = { students: new Set(), totalConf: 0, count: 0 };
      miscCount[misc.misconceptionId].students.add(studentId);
      miscCount[misc.misconceptionId].totalConf += misc.confidence;
      miscCount[misc.misconceptionId].count++;
    }
  }

  const commonMisconceptions = Object.entries(miscCount)
    .map(([id, data]) => ({
      id,
      studentCount: data.students.size,
      avgConfidence: Math.round(data.totalConf / data.count),
    }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 10);

  const weakestSkills = Object.entries(skillWeakness)
    .map(([skillId, data]) => ({
      skillId,
      avgMastery: Math.round(data.totalMastery / data.count),
      studentCount: data.weakStudents,
    }))
    .filter(s => s.avgMastery < 60)
    .sort((a, b) => a.avgMastery - b.avgMastery)
    .slice(0, 10);

  return {
    totalAssessments,
    avgMastery: masteryCount > 0 ? Math.round(totalMastery / masteryCount) : 0,
    commonMisconceptions,
    weakestSkills,
  };
}