// Phase 5.5 Decision Engine - Session Intelligence
// Smart session planning: warm-up → learn → practice → assess → cool-down
// Adapts in real-time based on student performance

import { loadUserData, saveUserData } from './pilotStorage';
import type { DifficultyLevel } from './difficultyCalibration';

// ============ Types ============

export type SessionPhaseType =
  | 'warm_up'      // Easy review of mastered skills (2-3 questions)
  | 'learn'        // Introduce new concept with scaffolding
  | 'practice'     // Guided then independent practice
  | 'assess'       // Quick mastery check
  | 'cool_down'    // Easy questions, positive ending
  | 'remediation'  // Address detected issues
  | 'review'       // Spaced repetition of older skills
  | 'challenge';   // Extension for high performers

export interface SessionPlan {
  id: string;
  createdAt: string;
  phases: SessionPhase[];
  currentPhaseIndex: number;
  totalEstimatedMinutes: number;
  adaptations: SessionAdaptation[];
  status: 'planned' | 'in_progress' | 'completed' | 'abandoned';
  targetSkills: string[];
  actualDuration: number; // seconds
}

export interface SessionPhase {
  type: SessionPhaseType;
  skillId: string | null;
  difficulty: DifficultyLevel;
  questionsPlanned: number;
  questionsCompleted: number;
  questionsCorrect: number;
  estimatedMinutes: number;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'extended';
  scaffoldLevel: 'none' | 'hint' | 'guided' | 'full';
  notes: string;
}

export interface SessionAdaptation {
  timestamp: string;
  fromPhase: SessionPhaseType;
  toPhase: SessionPhaseType;
  reason: AdaptationReason;
  trigger: string;
}

export type AdaptationReason =
  | 'high_performance'
  | 'struggling'
  | 'fatigue_detected'
  | 'misconception_found'
  | 'time_pressure'
  | 'mastery_achieved'
  | 'engagement_drop';

export interface SessionPlanInput {
  studentMastery: Record<string, number>; // skillId -> mastery%
  targetSkillIds: string[];
  availableMinutes: number;
  recentPerformance: number; // 0-100
  retentionDueSkills: string[];
  studentSpeed: 'slow' | 'normal' | 'fast';
}

// ============ Session Plan Generator ============

/**
 * Generate an intelligent session plan based on student state.
 */
export function generateSessionPlan(input: SessionPlanInput): SessionPlan {
  const phases: SessionPhase[] = [];
  const { targetSkillIds, availableMinutes, recentPerformance, retentionDueSkills, studentSpeed } = input;

  // Time allocation based on available minutes
  const timeAlloc = calculateTimeAllocation(availableMinutes, recentPerformance);

  // Phase 1: Warm-up (review mastered skill, build confidence)
  const warmUpSkill = selectWarmUpSkill(input.studentMastery, retentionDueSkills);
  phases.push({
    type: 'warm_up',
    skillId: warmUpSkill,
    difficulty: 'easy',
    questionsPlanned: studentSpeed === 'slow' ? 2 : 3,
    questionsCompleted: 0,
    questionsCorrect: 0,
    estimatedMinutes: timeAlloc.warmUp,
    status: 'pending',
    scaffoldLevel: 'none',
    notes: 'مراجعة سريعة لبناء الثقة',
  });

  // Phase 2: Learn (introduce or continue new concept)
  const learnSkill = selectLearnSkill(targetSkillIds, input.studentMastery);
  if (learnSkill) {
    const mastery = input.studentMastery[learnSkill] || 0;
    phases.push({
      type: 'learn',
      skillId: learnSkill,
      difficulty: mastery < 30 ? 'easy' : 'medium',
      questionsPlanned: 3,
      questionsCompleted: 0,
      questionsCorrect: 0,
      estimatedMinutes: timeAlloc.learn,
      status: 'pending',
      scaffoldLevel: mastery < 20 ? 'full' : 'guided',
      notes: mastery < 20 ? 'تقديم مفهوم جديد مع دعم كامل' : 'تعميق الفهم',
    });
  }

  // Phase 3: Practice (independent practice)
  const practiceSkill = learnSkill || targetSkillIds[0];
  if (practiceSkill) {
    phases.push({
      type: 'practice',
      skillId: practiceSkill,
      difficulty: 'medium',
      questionsPlanned: studentSpeed === 'slow' ? 4 : 5,
      questionsCompleted: 0,
      questionsCorrect: 0,
      estimatedMinutes: timeAlloc.practice,
      status: 'pending',
      scaffoldLevel: 'hint',
      notes: 'تدريب مستقل مع تلميحات عند الحاجة',
    });
  }

  // Phase 4: Review (if retention skills are due)
  if (retentionDueSkills.length > 0 && availableMinutes >= 10) {
    const reviewSkill = retentionDueSkills[0];
    phases.push({
      type: 'review',
      skillId: reviewSkill,
      difficulty: 'medium',
      questionsPlanned: 3,
      questionsCompleted: 0,
      questionsCorrect: 0,
      estimatedMinutes: timeAlloc.review,
      status: 'pending',
      scaffoldLevel: 'none',
      notes: 'مراجعة للحفاظ على الإتقان',
    });
  }

  // Phase 5: Assess (quick mastery check)
  if (learnSkill && availableMinutes >= 12) {
    phases.push({
      type: 'assess',
      skillId: learnSkill,
      difficulty: 'medium',
      questionsPlanned: 3,
      questionsCompleted: 0,
      questionsCorrect: 0,
      estimatedMinutes: timeAlloc.assess,
      status: 'pending',
      scaffoldLevel: 'none',
      notes: 'فحص سريع للإتقان',
    });
  }

  // Phase 6: Cool-down (easy, positive ending)
  phases.push({
    type: 'cool_down',
    skillId: warmUpSkill || targetSkillIds[0] || null,
    difficulty: 'easy',
    questionsPlanned: 2,
    questionsCompleted: 0,
    questionsCorrect: 0,
    estimatedMinutes: timeAlloc.coolDown,
    status: 'pending',
    scaffoldLevel: 'none',
    notes: 'إنهاء إيجابي بأسئلة سهلة',
  });

  const totalEstimated = phases.reduce((sum, p) => sum + p.estimatedMinutes, 0);

  return {
    id: `session_${Date.now()}`,
    createdAt: new Date().toISOString(),
    phases,
    currentPhaseIndex: 0,
    totalEstimatedMinutes: totalEstimated,
    adaptations: [],
    status: 'planned',
    targetSkills: targetSkillIds,
    actualDuration: 0,
  };
}

// ============ Real-Time Adaptation ============

/**
 * Adapt the session plan based on real-time performance.
 */
export function adaptSessionPlan(
  plan: SessionPlan,
  trigger: {
    consecutiveCorrect: number;
    consecutiveWrong: number;
    fatigueLevel: number;
    misconceptionDetected: boolean;
    currentPhaseCorrectRate: number;
  }
): { plan: SessionPlan; adapted: boolean; adaptation: SessionAdaptation | null } {
  const currentPhase = plan.phases[plan.currentPhaseIndex];
  if (!currentPhase || currentPhase.status !== 'active') {
    return { plan, adapted: false, adaptation: null };
  }

  let adaptation: SessionAdaptation | null = null;

  // Adaptation: Struggling → add remediation
  if (trigger.consecutiveWrong >= 3 && currentPhase.type !== 'remediation') {
    adaptation = {
      timestamp: new Date().toISOString(),
      fromPhase: currentPhase.type,
      toPhase: 'remediation',
      reason: 'struggling',
      trigger: `${trigger.consecutiveWrong} consecutive wrong`,
    };

    // Insert remediation phase
    const remediationPhase: SessionPhase = {
      type: 'remediation',
      skillId: currentPhase.skillId,
      difficulty: 'easy',
      questionsPlanned: 3,
      questionsCompleted: 0,
      questionsCorrect: 0,
      estimatedMinutes: 3,
      status: 'pending',
      scaffoldLevel: 'full',
      notes: 'مسار علاجي بسبب صعوبات متكررة',
    };

    plan.phases.splice(plan.currentPhaseIndex + 1, 0, remediationPhase);
    currentPhase.status = 'completed';
    plan.currentPhaseIndex++;
    plan.adaptations.push(adaptation);

    return { plan, adapted: true, adaptation };
  }

  // Adaptation: High performance → skip to challenge or advance
  if (trigger.consecutiveCorrect >= 5 && currentPhase.type === 'practice') {
    adaptation = {
      timestamp: new Date().toISOString(),
      fromPhase: currentPhase.type,
      toPhase: 'challenge',
      reason: 'high_performance',
      trigger: `${trigger.consecutiveCorrect} consecutive correct`,
    };

    currentPhase.status = 'completed';

    // Replace remaining phases with challenge
    const challengePhase: SessionPhase = {
      type: 'challenge',
      skillId: currentPhase.skillId,
      difficulty: 'hard',
      questionsPlanned: 3,
      questionsCompleted: 0,
      questionsCorrect: 0,
      estimatedMinutes: 3,
      status: 'pending',
      scaffoldLevel: 'none',
      notes: 'تحدي إضافي بسبب الأداء الممتاز',
    };

    plan.phases.splice(plan.currentPhaseIndex + 1, 0, challengePhase);
    plan.currentPhaseIndex++;
    plan.adaptations.push(adaptation);

    return { plan, adapted: true, adaptation };
  }

  // Adaptation: Fatigue → skip to cool-down
  if (trigger.fatigueLevel > 70) {
    adaptation = {
      timestamp: new Date().toISOString(),
      fromPhase: currentPhase.type,
      toPhase: 'cool_down',
      reason: 'fatigue_detected',
      trigger: `fatigue at ${trigger.fatigueLevel}%`,
    };

    // Mark remaining phases as skipped
    for (let i = plan.currentPhaseIndex + 1; i < plan.phases.length; i++) {
      if (plan.phases[i].type !== 'cool_down') {
        plan.phases[i].status = 'skipped';
      }
    }

    currentPhase.status = 'completed';
    // Jump to cool-down
    const coolDownIdx = plan.phases.findIndex((p, i) => i > plan.currentPhaseIndex && p.type === 'cool_down');
    if (coolDownIdx >= 0) {
      plan.currentPhaseIndex = coolDownIdx;
    }
    plan.adaptations.push(adaptation);

    return { plan, adapted: true, adaptation };
  }

  // Adaptation: Misconception → insert remediation
  if (trigger.misconceptionDetected && currentPhase.type !== 'remediation') {
    adaptation = {
      timestamp: new Date().toISOString(),
      fromPhase: currentPhase.type,
      toPhase: 'remediation',
      reason: 'misconception_found',
      trigger: 'misconception detected',
    };

    const remPhase: SessionPhase = {
      type: 'remediation',
      skillId: currentPhase.skillId,
      difficulty: 'easy',
      questionsPlanned: 4,
      questionsCompleted: 0,
      questionsCorrect: 0,
      estimatedMinutes: 4,
      status: 'pending',
      scaffoldLevel: 'full',
      notes: 'علاج مفهوم خاطئ مكتشف',
    };

    plan.phases.splice(plan.currentPhaseIndex + 1, 0, remPhase);
    plan.adaptations.push(adaptation);

    return { plan, adapted: true, adaptation };
  }

  return { plan, adapted: false, adaptation: null };
}

/**
 * Advance to next phase in the session plan.
 */
export function advancePhase(plan: SessionPlan): SessionPlan {
  const current = plan.phases[plan.currentPhaseIndex];
  if (current) {
    current.status = 'completed';
  }

  const nextIdx = plan.currentPhaseIndex + 1;
  if (nextIdx < plan.phases.length) {
    plan.currentPhaseIndex = nextIdx;
    plan.phases[nextIdx].status = 'active';
  } else {
    plan.status = 'completed';
  }

  return plan;
}

// ============ Helpers ============

function calculateTimeAllocation(
  totalMinutes: number,
  performance: number
): Record<string, number> {
  // Distribute time based on performance and total available
  const base = Math.max(8, totalMinutes);

  if (performance > 75) {
    // High performer: less warm-up, more challenge
    return {
      warmUp: Math.round(base * 0.10),
      learn: Math.round(base * 0.25),
      practice: Math.round(base * 0.25),
      review: Math.round(base * 0.15),
      assess: Math.round(base * 0.15),
      coolDown: Math.round(base * 0.10),
    };
  }

  if (performance < 40) {
    // Struggling: more warm-up, more practice, less assessment
    return {
      warmUp: Math.round(base * 0.15),
      learn: Math.round(base * 0.20),
      practice: Math.round(base * 0.35),
      review: Math.round(base * 0.10),
      assess: Math.round(base * 0.10),
      coolDown: Math.round(base * 0.10),
    };
  }

  // Average: balanced
  return {
    warmUp: Math.round(base * 0.12),
    learn: Math.round(base * 0.22),
    practice: Math.round(base * 0.28),
    review: Math.round(base * 0.15),
    assess: Math.round(base * 0.13),
    coolDown: Math.round(base * 0.10),
  };
}

function selectWarmUpSkill(
  mastery: Record<string, number>,
  retentionDue: string[]
): string | null {
  // Prefer a mastered skill that's due for retention
  const masteredAndDue = retentionDue.filter(s => (mastery[s] || 0) >= 70);
  if (masteredAndDue.length > 0) {
    return masteredAndDue[Math.floor(Math.random() * masteredAndDue.length)];
  }

  // Otherwise pick any mastered skill
  const mastered = Object.entries(mastery)
    .filter(([, m]) => m >= 70)
    .map(([id]) => id);

  if (mastered.length > 0) {
    return mastered[Math.floor(Math.random() * mastered.length)];
  }

  return null;
}

function selectLearnSkill(
  targetSkills: string[],
  mastery: Record<string, number>
): string | null {
  // Pick the target skill with lowest mastery that's > 0 (in progress)
  // or the first one if none started
  const inProgress = targetSkills
    .filter(s => (mastery[s] || 0) > 0 && (mastery[s] || 0) < 70)
    .sort((a, b) => (mastery[a] || 0) - (mastery[b] || 0));

  if (inProgress.length > 0) return inProgress[0];

  // Start a new skill
  const notStarted = targetSkills.filter(s => (mastery[s] || 0) === 0);
  return notStarted.length > 0 ? notStarted[0] : targetSkills[0] || null;
}

// ============ Persistence ============

export function saveSessionPlan(plan: SessionPlan): void {
  saveUserData(`sessionPlan_${plan.id}`, plan);
  const history = loadUserData<string[]>('sessionPlanHistory', []);
  if (!history.includes(plan.id)) {
    history.push(plan.id);
    saveUserData('sessionPlanHistory', history.slice(-30));
  }
}

export function loadSessionPlan(planId: string): SessionPlan | null {
  return loadUserData<SessionPlan | null>(`sessionPlan_${planId}`, null);
}

export function getSessionHistory(): string[] {
  return loadUserData<string[]>('sessionPlanHistory', []);
}