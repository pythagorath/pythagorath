// Educational Intelligence Hub - Central Wiring Layer
// Connects: Knowledge Graph, Decision Engine, Session Intelligence, 
// Skill Graph, Difficulty Calibration, Learning State Machine, Error Intelligence,
// Misconception Detector, Cognitive Pacing, Prerequisite Gating, Remediation
//
// This is the SINGLE entry point for all adaptive educational decisions.

import { getNextDecision, getDecisionHistory, getDecisionAnalytics, type StudentState, type Decision } from './adaptiveDecisionEngine';
import { buildKnowledgeGraph, analyzeKnowledgeGaps, type KnowledgeGapAnalysis, type KnowledgeNode, type KnowledgeEdge } from './curriculumKnowledgeGraph';
import { buildEnhancedGraph, generateSkillRecommendations, findShortestPath, findHangingSkills, type SkillNode, type GraphMetrics, type SkillRecommendation } from './skillGraphEnhanced';
import { generateSessionPlan, adaptSessionPlan, type SessionPlan, type SessionPlanInput } from './sessionIntelligence';
import { calibrateDifficulty, type CalibrationResult } from './difficultyCalibration';
import { getLearningState, type SkillLearningState } from './learningStateMachine';
import { analyzeRootCause } from './errorIntelligence';
import { analyzeAnswer, createDetectionSession, type MisconceptionSignal, type DetectionSession, type SessionAnswer } from './misconceptionDetector';
import { updatePacing, initPacingSession, type CognitivePacingState, type PacingRecommendation } from './cognitivePacing';
import { checkPrerequisiteGate, type PrerequisiteGateResult } from './prerequisiteGating';
import { initRemediation, type RemediationState } from './cognitiveRemediation';
import { generateFeedback, type FeedbackResult, type FeedbackContext } from './intelligentFeedback';
import { loadUserData, saveUserData } from './pilotStorage';
import type { StudentSkillProgress } from '@/data/mathSkillsData';

// ═══════════════════════════════════════════════════════
// UNIFIED TYPES
// ═══════════════════════════════════════════════════════

export interface IntelligenceContext {
  userId: string;
  grade: 1 | 2;
  currentSkillId: string | null;
  sessionStartTime: number;
  allProgress: StudentSkillProgress[];
  skillNames: Record<string, string>;
  gradeSkillIds: string[];
}

export interface IntelligenceSnapshot {
  timestamp: string;
  // Decision Engine
  lastDecision: Decision | null;
  decisionHistory: Decision[];
  decisionAnalytics: ReturnType<typeof getDecisionAnalytics>;
  // Knowledge Graph
  knowledgeGaps: KnowledgeGapAnalysis;
  graphNodeCount: number;
  graphEdgeCount: number;
  // Skill Graph
  skillMetrics: GraphMetrics;
  recommendations: SkillRecommendation[];
  hangingSkills: { skillId: string; nameAr: string; mastery: number }[];
  bottleneckSkills: SkillNode[];
  // Session
  currentSession: SessionPlan | null;
  // Learning States
  skillStates: Record<string, string>;
  // Difficulty
  currentDifficulty: CalibrationResult | null;
  // Pacing
  pacingState: CognitivePacingState | null;
  pacingRecommendation: PacingRecommendation | null;
  // Misconceptions
  activeMisconceptions: MisconceptionSignal[];
  // Errors
  recentErrors: unknown[];
  predictedErrors: string[];
  // Summary
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs_attention' | 'critical';
  healthScore: number; // 0-100
  actionItems: ActionItem[];
}

export interface ActionItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  type: 'remediation' | 'advancement' | 'review' | 'intervention' | 'assessment';
  title: string;
  description: string;
  targetSkillId: string | null;
  automated: boolean;
}

export interface AdaptiveResponse {
  decision: Decision;
  feedback: FeedbackResult | null;
  sessionAdapted: boolean;
  newDifficulty: CalibrationResult;
  prerequisiteCheck: PrerequisiteGateResult | null;
  misconceptions: MisconceptionSignal[];
  pacing: PacingRecommendation | null;
}

// ═══════════════════════════════════════════════════════
// INTELLIGENCE HUB - MAIN API
// ═══════════════════════════════════════════════════════

/**
 * Get a full intelligence snapshot for a student.
 * Used by admin dashboards and analytics.
 */
export function getIntelligenceSnapshot(ctx: IntelligenceContext): IntelligenceSnapshot {
  const { userId, gradeSkillIds, allProgress, skillNames } = ctx;

  // Build graphs
  const { nodes: kgNodes, edges: kgEdges } = buildKnowledgeGraph(gradeSkillIds, skillNames, allProgress);
  const knowledgeGaps = analyzeKnowledgeGaps(kgNodes, kgEdges);
  const { nodes: sgNodes, metrics: skillMetrics } = buildEnhancedGraph(gradeSkillIds, allProgress, skillNames);

  // Recommendations
  const recommendations = generateSkillRecommendations(sgNodes, 5);
  const hangingSkills = findHangingSkills(sgNodes);
  const bottleneckSkills = sgNodes.filter(n => n.isBottleneck).slice(0, 5);

  // Decision analytics
  const decisionAnalytics = getDecisionAnalytics(userId);
  const decisionHistory = getDecisionHistory(userId).slice(-10);
  const lastDecision = decisionHistory.length > 0 ? decisionHistory[decisionHistory.length - 1] : null;

  // Learning states
  const skillStates: Record<string, string> = {};
  for (const skillId of gradeSkillIds) {
    const stateObj = getLearningState(skillId);
    skillStates[skillId] = stateObj.currentState;
  }

  // Pacing
  const pacingState = loadUserData<CognitivePacingState | null>(`pacing_${userId}`, null);
  const pacingRecommendation: PacingRecommendation | null = pacingState && pacingState.fatigueLevel > 50
    ? { action: 'suggest_break' as const, reason: 'fatigue', urgency: pacingState.fatigueLevel }
    : null;

  // Misconceptions
  const activeMisconceptions = loadUserData<MisconceptionSignal[]>(`misconceptions_${userId}`, []);

  // Errors
  const recentErrors = loadUserData<unknown[]>(`errors_${userId}`, []).slice(-5);
  const predictedErrors: string[] = []; // Predicted errors based on patterns

  // Current session
  const currentSession = loadUserData<SessionPlan | null>(`currentSession_${userId}`, null);

  // Difficulty
  const currentDifficulty: CalibrationResult | null = ctx.currentSkillId
    ? calibrateDifficulty(ctx.currentSkillId, calculateOverallPerformance(allProgress), 0, 0)
    : null;

  // Health score
  const { healthScore, overallHealth } = calculateHealthScore(skillMetrics, knowledgeGaps, activeMisconceptions, pacingState);

  // Action items
  const actionItems = generateActionItems(recommendations, knowledgeGaps, activeMisconceptions, bottleneckSkills, hangingSkills);

  return {
    timestamp: new Date().toISOString(),
    lastDecision,
    decisionHistory,
    decisionAnalytics,
    knowledgeGaps,
    graphNodeCount: kgNodes.length,
    graphEdgeCount: kgEdges.length,
    skillMetrics,
    recommendations,
    hangingSkills,
    bottleneckSkills,
    currentSession,
    skillStates,
    currentDifficulty,
    pacingState,
    pacingRecommendation,
    activeMisconceptions,
    recentErrors,
    predictedErrors,
    overallHealth,
    healthScore,
    actionItems,
  };
}

/**
 * Process a student answer and get a full adaptive response.
 * This is the main runtime entry point during learning sessions.
 */
export function processAnswer(
  ctx: IntelligenceContext,
  answer: {
    questionId: string;
    skillId: string;
    isCorrect: boolean;
    responseTimeMs: number;
    selectedOption: number;
    correctOption: number;
    consecutiveCorrect: number;
    consecutiveWrong: number;
    questionsAttempted: number;
  }
): AdaptiveResponse {
  const { userId, allProgress, skillNames, gradeSkillIds } = ctx;

  // 1. Detect misconceptions via detection session
  const session = createDetectionSession();
  const sessionAnswer: SessionAnswer = {
    questionId: answer.questionId,
    skillId: answer.skillId,
    isCorrect: answer.isCorrect,
    selectedAnswer: answer.selectedOption,
    correctAnswer: answer.correctOption,
    responseTimeMs: answer.responseTimeMs,
    timestamp: Date.now(),
  };
  const detectionResult = analyzeAnswer(session, sessionAnswer);
  const misconceptions: MisconceptionSignal[] = detectionResult.signals || [];

  // 2. Check pacing
  let pacingState = loadUserData<CognitivePacingState | null>(`pacing_${userId}`, null);
  if (!pacingState) {
    pacingState = initPacingSession();
  }
  pacingState = updatePacing(pacingState, answer.responseTimeMs, answer.isCorrect);
  saveUserData(`pacing_${userId}`, pacingState);
  const pacing: PacingRecommendation | null = pacingState.fatigueLevel > 50
    ? { action: 'suggest_break' as const, reason: 'fatigue', urgency: pacingState.fatigueLevel }
    : null;

  // 3. Calibrate difficulty
  const performance = answer.isCorrect
    ? Math.min(100, 50 + answer.consecutiveCorrect * 10)
    : Math.max(0, 50 - answer.consecutiveWrong * 10);
  const newDifficulty = calibrateDifficulty(
    answer.skillId,
    performance,
    answer.consecutiveCorrect,
    answer.consecutiveWrong
  );

  // 4. Get learning state
  const learningStateObj = getLearningState(answer.skillId);
  const learningState = learningStateObj.currentState;

  // 5. Build student state for decision engine
  const studentState: StudentState = {
    userId,
    profile: {
      learningStyle: 'visual',
      pace: 'normal',
      engagement: performance > 60 ? 80 : 40,
      preferredDifficulty: newDifficulty.level,
      strengths: [],
      weaknesses: [],
    },
    currentSkillId: answer.skillId,
    sessionDurationMs: Date.now() - (ctx.sessionStartTime || Date.now()),
    questionsAttempted: answer.questionsAttempted,
    consecutiveCorrect: answer.consecutiveCorrect,
    consecutiveWrong: answer.consecutiveWrong,
    fatigueLevel: pacingState?.fatigueLevel || 0,
    cognitiveLoad: pacingState?.cognitiveLoad || 30,
    activeMisconceptions: misconceptions,
    recentSkillStates: { [answer.skillId]: learningState },
    pacingState,
    lastDecision: null,
  };

  // 6. Get decision
  const decision = getNextDecision(studentState);

  // 7. Generate feedback
  let feedback: FeedbackResult | null = null;
  if (!answer.isCorrect || answer.consecutiveCorrect >= 3) {
    feedback = generateFeedback(
      answer.skillId,
      answer.isCorrect,
      answer.consecutiveCorrect,
      answer.consecutiveWrong,
      misconceptions.length > 0 ? misconceptions[0].type : null
    );
  }

  // 8. Check prerequisites for next skill if transitioning
  let prerequisiteCheck: PrerequisiteGateResult | null = null;
  if (decision.type === 'skill_transition' && decision.action.targetSkillId) {
    prerequisiteCheck = checkPrerequisiteGate(decision.action.targetSkillId, allProgress, skillNames);
  }

  // 9. Adapt session if active
  const currentSession = loadUserData<SessionPlan | null>(`currentSession_${userId}`, null);
  let sessionAdapted = false;
  if (currentSession && currentSession.status === 'in_progress') {
    const { adapted, plan: updatedPlan } = adaptSessionPlan(currentSession, {
      consecutiveCorrect: answer.consecutiveCorrect,
      consecutiveWrong: answer.consecutiveWrong,
      fatigueLevel: pacingState?.fatigueLevel || 0,
      misconceptionDetected: misconceptions.length > 0,
      currentPhaseCorrectRate: performance,
    });
    if (adapted) {
      saveUserData(`currentSession_${userId}`, updatedPlan);
      sessionAdapted = true;
    }
  }

  // 10. Save misconceptions
  if (misconceptions.length > 0) {
    const existing = loadUserData<MisconceptionSignal[]>(`misconceptions_${userId}`, []);
    existing.push(...misconceptions);
    saveUserData(`misconceptions_${userId}`, existing.slice(-20));
  }

  // 11. Analyze error if incorrect
  if (!answer.isCorrect) {
    const errorAnalysis = analyzeRootCause(
      answer.selectedOption,
      answer.correctOption,
      answer.responseTimeMs,
      50, // skill mastery estimate
      pacingState?.fatigueLevel || 0
    );
    const errors = loadUserData<unknown[]>(`errors_${userId}`, []);
    errors.push(errorAnalysis);
    saveUserData(`errors_${userId}`, errors.slice(-30));
  }

  return {
    decision,
    feedback,
    sessionAdapted,
    newDifficulty,
    prerequisiteCheck,
    misconceptions,
    pacing,
  };
}

/**
 * Start a new intelligent session for a student.
 */
export function startIntelligentSession(ctx: IntelligenceContext): SessionPlan {
  const { userId, allProgress, gradeSkillIds, skillNames } = ctx;

  // Build skill graph for recommendations
  const { nodes } = buildEnhancedGraph(gradeSkillIds, allProgress, skillNames);
  const recommendations = generateSkillRecommendations(nodes, 3);

  // Get mastery map
  const masteryMap: Record<string, number> = {};
  for (const p of allProgress) {
    masteryMap[p.skillId] = p.correctCount / Math.max(1, p.totalAttempts) * 100;
  }

  // Get retention-due skills (mastery 60-80, not practiced recently)
  const retentionDue = nodes
    .filter(n => n.mastery >= 60 && n.mastery < 80)
    .slice(0, 3)
    .map(n => n.id);

  const input: SessionPlanInput = {
    studentMastery: masteryMap,
    targetSkillIds: recommendations.map(r => r.skillId),
    availableMinutes: 15,
    recentPerformance: calculateOverallPerformance(allProgress),
    retentionDueSkills: retentionDue,
    studentSpeed: 'normal',
  };

  const plan = generateSessionPlan(input);
  plan.status = 'in_progress';
  plan.phases[0].status = 'active';

  saveUserData(`currentSession_${userId}`, plan);
  return plan;
}

/**
 * Get remediation path for a struggling student.
 */
export function getRemediationPath(
  ctx: IntelligenceContext,
  skillId: string
): { session: RemediationState; prerequisitePath: string[]; gapAnalysis: KnowledgeGapAnalysis } {
  const { allProgress, gradeSkillIds, skillNames } = ctx;

  // Start remediation
  const session = initRemediation(skillId, 'reteach');

  // Find prerequisite path
  const path = findShortestPath(skillId, allProgress, skillNames);
  const prerequisitePath = path ? path.nodes : [];

  // Gap analysis
  const { nodes, edges } = buildKnowledgeGraph(gradeSkillIds, skillNames, allProgress);
  const gapAnalysis = analyzeKnowledgeGaps(nodes, edges);

  return { session, prerequisitePath, gapAnalysis };
}

/**
 * Admin: Get class-wide intelligence summary.
 */
export function getClassIntelligenceSummary(
  students: { userId: string; name: string; grade: 1 | 2; allProgress: StudentSkillProgress[] }[],
  gradeSkillIds: string[],
  skillNames: Record<string, string>
): ClassIntelligenceSummary {
  const studentSnapshots: StudentBrief[] = [];
  let totalHealth = 0;
  const skillDifficulty: Record<string, { attempts: number; failures: number }> = {};
  const commonMisconceptions: Record<string, number> = {};

  for (const student of students) {
    const performance = calculateOverallPerformance(student.allProgress);
    const { nodes } = buildEnhancedGraph(gradeSkillIds, student.allProgress, skillNames);
    const metrics = nodes.length > 0 ? {
      mastered: nodes.filter(n => n.mastery >= 70).length,
      learning: nodes.filter(n => n.mastery >= 30 && n.mastery < 70).length,
      notStarted: nodes.filter(n => n.mastery < 30).length,
    } : { mastered: 0, learning: 0, notStarted: gradeSkillIds.length };

    const health = Math.min(100, performance + (metrics.mastered / Math.max(1, gradeSkillIds.length)) * 50);
    totalHealth += health;

    studentSnapshots.push({
      userId: student.userId,
      name: student.name,
      grade: student.grade,
      healthScore: Math.round(health),
      masteredCount: metrics.mastered,
      learningCount: metrics.learning,
      needsAttention: health < 40,
    });

    // Aggregate skill difficulty
    for (const p of student.allProgress) {
      if (!skillDifficulty[p.skillId]) {
        skillDifficulty[p.skillId] = { attempts: 0, failures: 0 };
      }
      skillDifficulty[p.skillId].attempts += p.totalAttempts;
      skillDifficulty[p.skillId].failures += (p.totalAttempts - p.correctCount);
    }

    // Aggregate misconceptions
    const misconceptions = loadUserData<MisconceptionSignal[]>(`misconceptions_${student.userId}`, []);
    for (const m of misconceptions) {
      commonMisconceptions[m.type] = (commonMisconceptions[m.type] || 0) + 1;
    }
  }

  // Find hardest skills
  const hardestSkills = Object.entries(skillDifficulty)
    .filter(([, d]) => d.attempts >= 5)
    .map(([skillId, d]) => ({
      skillId,
      nameAr: skillNames[skillId] || skillId,
      failureRate: Math.round((d.failures / d.attempts) * 100),
    }))
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, 10);

  // Top misconceptions
  const topMisconceptions = Object.entries(commonMisconceptions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    totalStudents: students.length,
    avgHealthScore: students.length > 0 ? Math.round(totalHealth / students.length) : 0,
    studentsNeedingAttention: studentSnapshots.filter(s => s.needsAttention).length,
    studentSnapshots,
    hardestSkills,
    topMisconceptions,
    classCompletionRate: Math.round(
      studentSnapshots.reduce((sum, s) => sum + s.masteredCount, 0) /
      Math.max(1, students.length * gradeSkillIds.length) * 100
    ),
  };
}

// ═══════════════════════════════════════════════════════
// TYPES FOR CLASS SUMMARY
// ═══════════════════════════════════════════════════════

export interface ClassIntelligenceSummary {
  totalStudents: number;
  avgHealthScore: number;
  studentsNeedingAttention: number;
  studentSnapshots: StudentBrief[];
  hardestSkills: { skillId: string; nameAr: string; failureRate: number }[];
  topMisconceptions: { type: string; count: number }[];
  classCompletionRate: number;
}

export interface StudentBrief {
  userId: string;
  name: string;
  grade: 1 | 2;
  healthScore: number;
  masteredCount: number;
  learningCount: number;
  needsAttention: boolean;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function calculateOverallPerformance(allProgress: StudentSkillProgress[]): number {
  if (allProgress.length === 0) return 50;
  const totalAttempts = allProgress.reduce((sum, p) => sum + p.totalAttempts, 0);
  const totalCorrect = allProgress.reduce((sum, p) => sum + p.correctCount, 0);
  if (totalAttempts === 0) return 50;
  return Math.round((totalCorrect / totalAttempts) * 100);
}

function calculateHealthScore(
  metrics: GraphMetrics,
  gaps: KnowledgeGapAnalysis,
  misconceptions: MisconceptionSignal[],
  pacing: CognitivePacingState | null
): { healthScore: number; overallHealth: IntelligenceSnapshot['overallHealth'] } {
  let score = 50;

  // Completion rate contributes up to 30 points
  score += (metrics.completionRate / 100) * 30;

  // Fewer gaps = better (up to 20 points)
  const criticalGaps = gaps.gaps.filter(g => g.gapSeverity === 'critical').length;
  score += Math.max(0, 20 - criticalGaps * 5);

  // Fewer misconceptions = better (up to 10 points)
  score += Math.max(0, 10 - misconceptions.length * 2);

  // Pacing health (up to 10 points)
  if (pacing) {
    score += pacing.fatigueLevel < 30 ? 10 : pacing.fatigueLevel < 60 ? 5 : 0;
  } else {
    score += 5; // Neutral if no pacing data
  }

  // Fewer bottlenecks (up to 10 points)
  score += Math.max(0, 10 - metrics.bottleneckCount * 3);

  const healthScore = Math.max(0, Math.min(100, Math.round(score)));

  let overallHealth: IntelligenceSnapshot['overallHealth'];
  if (healthScore >= 80) overallHealth = 'excellent';
  else if (healthScore >= 65) overallHealth = 'good';
  else if (healthScore >= 50) overallHealth = 'fair';
  else if (healthScore >= 30) overallHealth = 'needs_attention';
  else overallHealth = 'critical';

  return { healthScore, overallHealth };
}

function generateActionItems(
  recommendations: SkillRecommendation[],
  gaps: KnowledgeGapAnalysis,
  misconceptions: MisconceptionSignal[],
  bottlenecks: SkillNode[],
  hanging: { skillId: string; nameAr: string; mastery: number }[]
): ActionItem[] {
  const items: ActionItem[] = [];

  // Critical gaps need remediation
  for (const gap of gaps.gaps.filter(g => g.gapSeverity === 'critical').slice(0, 2)) {
    items.push({
      id: `action_gap_${gap.skillId}`,
      priority: 'high',
      type: 'remediation',
      title: `علاج فجوة حرجة: ${gap.nameAr}`,
      description: `هذه المهارة تحجب ${gap.blockedSkills.length} مهارات أخرى`,
      targetSkillId: gap.skillId,
      automated: true,
    });
  }

  // Active misconceptions
  for (const m of misconceptions.slice(0, 2)) {
    items.push({
      id: `action_misc_${m.type}_${Date.now()}`,
      priority: 'high',
      type: 'intervention',
      title: `معالجة مفهوم خاطئ: ${getMisconceptionLabel(m.type)}`,
      description: `تم اكتشاف نمط خطأ متكرر في ${m.skillContext}`,
      targetSkillId: m.skillContext,
      automated: true,
    });
  }

  // Bottleneck skills
  for (const bn of bottlenecks.slice(0, 2)) {
    items.push({
      id: `action_bn_${bn.id}`,
      priority: 'medium',
      type: 'advancement',
      title: `فتح عنق الزجاجة: ${bn.nameAr}`,
      description: `إتقان هذه المهارة يفتح ${bn.criticalityScore} مهارات`,
      targetSkillId: bn.id,
      automated: false,
    });
  }

  // Hanging skills close to completion
  for (const h of hanging.filter(s => s.mastery >= 50).slice(0, 1)) {
    items.push({
      id: `action_hang_${h.skillId}`,
      priority: 'low',
      type: 'review',
      title: `إكمال مهارة معلقة: ${h.nameAr}`,
      description: `الإتقان ${Math.round(h.mastery)}% - قريب من الاكتمال`,
      targetSkillId: h.skillId,
      automated: false,
    });
  }

  return items.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getMisconceptionLabel(type: string): string {
  const labels: Record<string, string> = {
    'off_by_one': 'خطأ بمقدار واحد',
    'digit_swap': 'تبديل الأرقام',
    'operation_inverse': 'عكس العملية',
    'guessing': 'تخمين عشوائي',
    'perseveration': 'تكرار نفس الإجابة',
    'place_value': 'خطأ في القيمة المكانية',
    'carry_error': 'خطأ في الحمل',
    'borrow_error': 'خطأ في الاستلاف',
  };
  return labels[type] || type;
}