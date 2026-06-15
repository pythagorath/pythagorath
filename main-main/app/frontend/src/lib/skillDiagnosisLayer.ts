// Assessment Intelligence Sprint - Skill Diagnosis Layer
// Maps every assessment result to: skill_id, mastery level, misconception probability,
// remediation recommendation, prerequisite weakness
// Central skill intelligence that aggregates all signals

import { loadUserData, saveUserData } from './pilotStorage';
import type { DetectedMisconception, SkillMasteryDiagnosis } from './diagnosticAssessmentEngine';
import { getMisconceptionById, getMisconceptionsForSkill, type MisconceptionCategory } from './misconceptionTaxonomy';
import type { RemediationType } from './cognitiveRemediation';

// ============ Types ============

export interface SkillDiagnosisRecord {
  skillId: string;
  studentId: string;
  timestamp: string;
  masteryLevel: number; // 0-100
  masteryConfidence: number; // 0-100
  misconceptionProbability: number; // 0-100
  detectedMisconceptions: string[]; // misconception IDs
  remediationRecommendation: SkillRemediation | null;
  prerequisiteWeakness: PrerequisiteWeakness[];
  performanceHistory: PerformancePoint[];
  lastAssessedAt: string;
  assessmentCount: number;
}

export interface SkillRemediation {
  type: RemediationType;
  urgency: 'immediate' | 'soon' | 'scheduled' | 'monitoring';
  reason: string;
  estimatedEffort: number; // sessions needed
  targetMisconception: string | null;
  suggestedActivities: string[];
}

export interface PrerequisiteWeakness {
  prerequisiteSkillId: string;
  currentMastery: number;
  requiredMastery: number;
  isBlocking: boolean;
  recommendation: string;
}

export interface PerformancePoint {
  timestamp: string;
  mastery: number;
  questionsAsked: number;
  questionsCorrect: number;
  responseTimeAvg: number;
}

export interface SkillHealthReport {
  skillId: string;
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number; // 0-100
  factors: HealthFactor[];
  trajectory: 'improving' | 'stable' | 'declining' | 'unknown';
  daysUntilDecay: number | null;
  nextAction: string;
}

export interface HealthFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  detail: string;
}

// ============ Skill Prerequisite Map ============

const SKILL_PREREQUISITES: Record<string, string[]> = {
  'G1-A-003': ['G1-A-001', 'G1-A-002'],
  'G1-B-001': ['G1-A-001', 'G1-A-003'],
  'G1-B-002': ['G1-B-001'],
  'G2-C-001': ['G1-A-003', 'G1-B-001'],
  'G2-C-002': ['G2-C-001', 'G1-B-002'],
  'G2-C-003': ['G2-C-001'],
  'G2-C-004': ['G2-C-002', 'G1-B-001'],
};

const MASTERY_THRESHOLDS = {
  excellent: 90,
  good: 75,
  fair: 55,
  poor: 35,
  critical: 0,
};

// ============ Core Diagnosis Functions ============

export function diagnoseSkill(
  studentId: string,
  skillId: string,
  assessmentResult: {
    questionsAsked: number;
    questionsCorrect: number;
    avgResponseTime: number;
    misconceptions: DetectedMisconception[];
  }
): SkillDiagnosisRecord {
  const existing = getSkillDiagnosis(studentId, skillId);

  // Calculate mastery
  const rawMastery = assessmentResult.questionsAsked > 0
    ? Math.round((assessmentResult.questionsCorrect / assessmentResult.questionsAsked) * 100)
    : 0;

  // Bayesian update with existing mastery
  const priorMastery = existing?.masteryLevel ?? 50;
  const priorWeight = existing ? Math.min(0.4, existing.assessmentCount * 0.1) : 0;
  const masteryLevel = Math.round(priorMastery * priorWeight + rawMastery * (1 - priorWeight));

  // Confidence based on data volume
  const assessmentCount = (existing?.assessmentCount ?? 0) + 1;
  const masteryConfidence = Math.min(95, 30 + assessmentCount * 12 + assessmentResult.questionsAsked * 5);

  // Misconception probability
  const misconceptionProbability = assessmentResult.misconceptions.length > 0
    ? Math.round(assessmentResult.misconceptions.reduce((s, m) => s + m.confidence, 0) / assessmentResult.misconceptions.length)
    : Math.max(0, (existing?.misconceptionProbability ?? 0) - 5); // Decay if no misconceptions detected

  // Detected misconceptions
  const detectedMisconceptions = assessmentResult.misconceptions.map(m => m.misconceptionId);

  // Prerequisite weakness check
  const prerequisiteWeakness = checkPrerequisiteWeakness(studentId, skillId);

  // Remediation recommendation
  const remediationRecommendation = generateRemediation(
    masteryLevel,
    misconceptionProbability,
    detectedMisconceptions,
    prerequisiteWeakness
  );

  // Performance history
  const performanceHistory = existing?.performanceHistory ?? [];
  performanceHistory.push({
    timestamp: new Date().toISOString(),
    mastery: masteryLevel,
    questionsAsked: assessmentResult.questionsAsked,
    questionsCorrect: assessmentResult.questionsCorrect,
    responseTimeAvg: assessmentResult.avgResponseTime,
  });
  // Keep last 20 points
  const trimmedHistory = performanceHistory.slice(-20);

  const record: SkillDiagnosisRecord = {
    skillId,
    studentId,
    timestamp: new Date().toISOString(),
    masteryLevel,
    masteryConfidence,
    misconceptionProbability,
    detectedMisconceptions,
    remediationRecommendation,
    prerequisiteWeakness,
    performanceHistory: trimmedHistory,
    lastAssessedAt: new Date().toISOString(),
    assessmentCount,
  };

  saveSkillDiagnosis(studentId, skillId, record);
  return record;
}

// ============ Prerequisite Analysis ============

function checkPrerequisiteWeakness(studentId: string, skillId: string): PrerequisiteWeakness[] {
  const prerequisites = SKILL_PREREQUISITES[skillId] || [];
  const weaknesses: PrerequisiteWeakness[] = [];

  for (const prereqId of prerequisites) {
    const prereqDiag = getSkillDiagnosis(studentId, prereqId);
    const currentMastery = prereqDiag?.masteryLevel ?? 0;
    const requiredMastery = 70; // Need at least 70% mastery in prerequisites

    if (currentMastery < requiredMastery) {
      weaknesses.push({
        prerequisiteSkillId: prereqId,
        currentMastery,
        requiredMastery,
        isBlocking: currentMastery < 40,
        recommendation: currentMastery < 40
          ? `يجب إتقان ${prereqId} أولاً قبل المتابعة`
          : `تحسين ${prereqId} سيساعد في فهم ${skillId}`,
      });
    }
  }

  return weaknesses;
}

// ============ Remediation Generation ============

function generateRemediation(
  masteryLevel: number,
  misconceptionProbability: number,
  detectedMisconceptions: string[],
  prerequisiteWeakness: PrerequisiteWeakness[]
): SkillRemediation | null {
  // No remediation needed if mastery is high
  if (masteryLevel >= 80 && misconceptionProbability < 20) return null;

  // Determine type and urgency
  let type: RemediationType = 'knowledge_gap' as RemediationType;
  let urgency: 'immediate' | 'soon' | 'scheduled' | 'monitoring' = 'scheduled';
  let reason = '';
  let targetMisconception: string | null = null;
  const suggestedActivities: string[] = [];

  // Blocking prerequisites
  const blockingPrereqs = prerequisiteWeakness.filter(p => p.isBlocking);
  if (blockingPrereqs.length > 0) {
    type = 'prerequisite_gap';
    urgency = 'immediate';
    reason = `متطلبات أساسية ناقصة: ${blockingPrereqs.map(p => p.prerequisiteSkillId).join(', ')}`;
    suggestedActivities.push('مراجعة المتطلبات الأساسية', 'تمارين تأسيسية');
  }
  // Active misconception
  else if (misconceptionProbability > 60 && detectedMisconceptions.length > 0) {
    type = 'conceptual_error';
    urgency = masteryLevel < 30 ? 'immediate' : 'soon';
    targetMisconception = detectedMisconceptions[0];
    const profile = getMisconceptionById(targetMisconception);
    reason = `مفهوم خاطئ: ${profile?.nameAr || targetMisconception}`;
    suggestedActivities.push('تصحيح المفهوم', 'أمثلة بصرية', 'تمرين موجه');
  }
  // Low mastery without clear misconception
  else if (masteryLevel < 50) {
    type = 'knowledge_gap' as RemediationType;
    urgency = masteryLevel < 25 ? 'immediate' : 'soon';
    reason = `مستوى إتقان منخفض: ${masteryLevel}%`;
    suggestedActivities.push('إعادة شرح', 'تمارين متدرجة', 'تعلم تفاعلي');
  }
  // Moderate mastery, needs practice
  else if (masteryLevel < 80) {
    type = 'fluency_deficit';
    urgency = 'scheduled';
    reason = `يحتاج مزيد من التمرين: ${masteryLevel}%`;
    suggestedActivities.push('تمارين سرعة', 'تطبيقات متنوعة');
  }

  return {
    type,
    urgency,
    reason,
    estimatedEffort: urgency === 'immediate' ? 3 : urgency === 'soon' ? 2 : 1,
    targetMisconception,
    suggestedActivities,
  };
}

// ============ Skill Health Report ============

export function getSkillHealthReport(studentId: string, skillId: string): SkillHealthReport {
  const diagnosis = getSkillDiagnosis(studentId, skillId);

  if (!diagnosis) {
    return {
      skillId,
      health: 'critical',
      healthScore: 0,
      factors: [{ name: 'لم يتم تقييمه', impact: 'negative', weight: 1, detail: 'لا توجد بيانات تقييم' }],
      trajectory: 'unknown',
      daysUntilDecay: null,
      nextAction: 'إجراء تقييم تشخيصي أولي',
    };
  }

  // Calculate health score
  let healthScore = diagnosis.masteryLevel;

  const factors: HealthFactor[] = [];

  // Mastery factor
  factors.push({
    name: 'مستوى الإتقان',
    impact: diagnosis.masteryLevel >= 70 ? 'positive' : diagnosis.masteryLevel >= 40 ? 'neutral' : 'negative',
    weight: 0.4,
    detail: `${diagnosis.masteryLevel}%`,
  });

  // Misconception factor
  if (diagnosis.misconceptionProbability > 30) {
    healthScore -= diagnosis.misconceptionProbability * 0.3;
    factors.push({
      name: 'احتمال مفهوم خاطئ',
      impact: 'negative',
      weight: 0.25,
      detail: `${diagnosis.misconceptionProbability}%`,
    });
  }

  // Prerequisite factor
  const blockingPrereqs = diagnosis.prerequisiteWeakness.filter(p => p.isBlocking);
  if (blockingPrereqs.length > 0) {
    healthScore -= 20;
    factors.push({
      name: 'متطلبات ناقصة',
      impact: 'negative',
      weight: 0.2,
      detail: `${blockingPrereqs.length} متطلب أساسي ضعيف`,
    });
  }

  // Trajectory
  let trajectory: 'improving' | 'stable' | 'declining' | 'unknown' = 'unknown';
  if (diagnosis.performanceHistory.length >= 3) {
    const recent = diagnosis.performanceHistory.slice(-3);
    const first = recent[0].mastery;
    const last = recent[recent.length - 1].mastery;
    if (last > first + 10) trajectory = 'improving';
    else if (last < first - 10) trajectory = 'declining';
    else trajectory = 'stable';
  }

  // Health category
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  let health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (healthScore >= MASTERY_THRESHOLDS.excellent) health = 'excellent';
  else if (healthScore >= MASTERY_THRESHOLDS.good) health = 'good';
  else if (healthScore >= MASTERY_THRESHOLDS.fair) health = 'fair';
  else if (healthScore >= MASTERY_THRESHOLDS.poor) health = 'poor';
  else health = 'critical';

  // Days until decay (simple estimate)
  const daysSinceAssessment = diagnosis.lastAssessedAt
    ? Math.floor((Date.now() - new Date(diagnosis.lastAssessedAt).getTime()) / 86400000)
    : null;
  const daysUntilDecay = daysSinceAssessment !== null ? Math.max(0, 14 - daysSinceAssessment) : null;

  // Next action
  let nextAction = 'استمر في التمرين';
  if (health === 'critical') nextAction = 'تدخل فوري: علاج مكثف';
  else if (health === 'poor') nextAction = 'جلسة علاجية قريبة';
  else if (trajectory === 'declining') nextAction = 'مراجعة وتثبيت';
  else if (daysUntilDecay !== null && daysUntilDecay < 3) nextAction = 'مراجعة لمنع النسيان';

  return { skillId, health, healthScore, factors, trajectory, daysUntilDecay, nextAction };
}

// ============ Batch Operations ============

export function getStudentSkillMap(studentId: string): SkillDiagnosisRecord[] {
  const allKeys = getAllSkillKeys(studentId);
  return allKeys.map(key => {
    const record = loadUserData<SkillDiagnosisRecord>(key);
    return record;
  }).filter((r): r is SkillDiagnosisRecord => r !== null);
}

export function getWeakestSkills(studentId: string, limit: number = 5): SkillDiagnosisRecord[] {
  return getStudentSkillMap(studentId)
    .sort((a, b) => a.masteryLevel - b.masteryLevel)
    .slice(0, limit);
}

export function getSkillsNeedingRemediation(studentId: string): SkillDiagnosisRecord[] {
  return getStudentSkillMap(studentId)
    .filter(s => s.remediationRecommendation !== null)
    .sort((a, b) => {
      const urgencyOrder = { immediate: 0, soon: 1, scheduled: 2, monitoring: 3 };
      const aUrgency = a.remediationRecommendation?.urgency || 'monitoring';
      const bUrgency = b.remediationRecommendation?.urgency || 'monitoring';
      return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
    });
}

export function getCurriculumWeaknessHeatmap(studentIds: string[], skillIds: string[]): {
  skillId: string;
  avgMastery: number;
  studentsBelowThreshold: number;
  misconceptionRate: number;
  category: MisconceptionCategory | null;
}[] {
  return skillIds.map(skillId => {
    let totalMastery = 0;
    let count = 0;
    let belowThreshold = 0;
    let misconceptionCount = 0;
    let topCategory: MisconceptionCategory | null = null;
    const catCounts: Partial<Record<MisconceptionCategory, number>> = {};

    for (const studentId of studentIds) {
      const diag = getSkillDiagnosis(studentId, skillId);
      if (diag) {
        totalMastery += diag.masteryLevel;
        count++;
        if (diag.masteryLevel < 60) belowThreshold++;
        if (diag.misconceptionProbability > 40) misconceptionCount++;

        // Track misconception categories
        for (const miscId of diag.detectedMisconceptions) {
          const profile = getMisconceptionById(miscId);
          if (profile) {
            catCounts[profile.category] = (catCounts[profile.category] || 0) + 1;
          }
        }
      }
    }

    // Find top category
    let maxCatCount = 0;
    for (const [cat, cnt] of Object.entries(catCounts)) {
      if (cnt > maxCatCount) {
        maxCatCount = cnt;
        topCategory = cat as MisconceptionCategory;
      }
    }

    return {
      skillId,
      avgMastery: count > 0 ? Math.round(totalMastery / count) : 0,
      studentsBelowThreshold: belowThreshold,
      misconceptionRate: count > 0 ? Math.round((misconceptionCount / count) * 100) : 0,
      category: topCategory,
    };
  });
}

// ============ Persistence ============

function getSkillDiagnosis(studentId: string, skillId: string): SkillDiagnosisRecord | null {
  return loadUserData<SkillDiagnosisRecord>(`skill_diag_${studentId}_${skillId}`);
}

function saveSkillDiagnosis(studentId: string, skillId: string, record: SkillDiagnosisRecord): void {
  saveUserData(`skill_diag_${studentId}_${skillId}`, record);
  // Also update the index
  const index = loadUserData<string[]>(`skill_diag_index_${studentId}`) || [];
  const key = `skill_diag_${studentId}_${skillId}`;
  if (!index.includes(key)) {
    index.push(key);
    saveUserData(`skill_diag_index_${studentId}`, index);
  }
}

function getAllSkillKeys(studentId: string): string[] {
  return loadUserData<string[]>(`skill_diag_index_${studentId}`) || [];
}