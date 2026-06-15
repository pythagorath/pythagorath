// Enhanced Skill Mastery System
// Calculates mastery using: accuracy, consistency, speed, error patterns, difficulty weight, streaks

import { type StudentSkillProgress } from '../data/mathSkillsData';
import { getPrerequisites, diagnoseWeakness } from '../data/skillPrerequisites';

export interface SkillMasteryData {
  skillId: string;
  skillName: string;
  mastery: number; // 0-100
  totalAttempted: number;
  correctCount: number;
  trend: 'improving' | 'declining' | 'stable';
  readyToAdvance: boolean;
}

export interface Recommendation {
  skillId: string;
  skillName: string;
  type: 'review' | 'practice' | 'advance' | 'prerequisite';
  message: string;
  priority: number; // 1 = highest
}

export interface SkillHistorySnapshot {
  date: string;
  data: { skillId: string; skillName: string; mastery: number }[];
  academicScore: number;
}

export interface DiagnosticResult {
  failedSkillId: string;
  failedSkillName: string;
  rootCauses: { skillId: string; skillName: string }[];
  suggestedPath: { skillId: string; skillName: string }[];
  explanation: string;
}

// ===== Enhanced Mastery Calculation =====
// Factors: accuracy (40%), consistency (20%), difficulty weight (20%), streak bonus (10%), recency (10%)

export function calculateEnhancedMastery(progress: StudentSkillProgress): number {
  if (progress.attempts === 0) return 0;

  // 1. Base accuracy (40% weight)
  const accuracy = (progress.correctCount / progress.attempts) * 100;
  const accuracyScore = accuracy * 0.4;

  // 2. Consistency - based on history variance (20% weight)
  let consistencyScore = 0;
  if (progress.history && progress.history.length >= 2) {
    const scores = progress.history.map(h => h.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    // Lower std dev = more consistent = higher score
    consistencyScore = Math.max(0, (100 - stdDev * 2)) * 0.2;
  } else {
    consistencyScore = accuracy * 0.2 * 0.5; // partial credit if few attempts
  }

  // 3. Difficulty weight (20% weight) - harder questions mastered = higher mastery
  let difficultyScore = 0;
  if (progress.history && progress.history.length > 0) {
    const difficultyWeights: Record<string, number> = { easy: 0.6, medium: 0.8, hard: 1.0 };
    const weightedScores = progress.history.map(h => {
      const weight = difficultyWeights[h.difficulty] || 0.6;
      return h.score * weight;
    });
    const avgWeighted = weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length;
    difficultyScore = avgWeighted * 0.2;
  } else {
    difficultyScore = accuracy * 0.2 * 0.5;
  }

  // 4. Streak bonus (10% weight) - consecutive correct answers
  const streakBonus = Math.min(progress.consecutiveCorrect * 10, 100) * 0.1;

  // 5. Recency (10% weight) - recent activity counts more
  let recencyScore = 0;
  if (progress.lastAttemptDate) {
    const daysSince = Math.floor((Date.now() - new Date(progress.lastAttemptDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) recencyScore = 100 * 0.1;
    else if (daysSince <= 3) recencyScore = 80 * 0.1;
    else if (daysSince <= 7) recencyScore = 60 * 0.1;
    else if (daysSince <= 14) recencyScore = 40 * 0.1;
    else recencyScore = 20 * 0.1;
  }

  const totalMastery = Math.round(accuracyScore + consistencyScore + difficultyScore + streakBonus + recencyScore);
  return Math.min(100, Math.max(0, totalMastery));
}

// Determine mastery status from score
export function getMasteryStatus(mastery: number): StudentSkillProgress['status'] {
  if (mastery >= 85) return 'mastered';
  if (mastery >= 70) return 'good';
  if (mastery >= 40) return 'developing';
  if (mastery > 0) return 'needs_practice';
  return 'not_started';
}

// Calculate trend from history
export function calculateTrend(history: { date: string; score: number }[]): 'improving' | 'declining' | 'stable' {
  if (!history || history.length < 2) return 'stable';
  
  // Compare last 2 entries
  const recent = history.slice(-3);
  if (recent.length < 2) return 'stable';
  
  const first = recent[0].score;
  const last = recent[recent.length - 1].score;
  const diff = last - first;
  
  if (diff > 10) return 'improving';
  if (diff < -10) return 'declining';
  return 'stable';
}

// ===== Recommendations Engine =====

export function generateRecommendations(
  progressList: StudentSkillProgress[],
  allSkills: { id: string; name: string }[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const skillNameMap = new Map(allSkills.map(s => [s.id, s.name]));
  const masteredSet = new Set(
    progressList.filter(p => calculateEnhancedMastery(p) >= 85).map(p => p.skillId)
  );

  for (const progress of progressList) {
    const mastery = calculateEnhancedMastery(progress);
    const skillName = skillNameMap.get(progress.skillId) || progress.skillId;

    // Skills that need practice (attempted but low mastery)
    if (progress.attempts > 0 && mastery < 40) {
      // Check if prerequisites are the issue
      const prereqs = getPrerequisites(progress.skillId);
      const unmasteredPrereqs = prereqs.filter(p => !masteredSet.has(p));
      
      if (unmasteredPrereqs.length > 0) {
        // Suggest prerequisite first
        for (const prereq of unmasteredPrereqs.slice(0, 2)) {
          const prereqName = skillNameMap.get(prereq) || prereq;
          recommendations.push({
            skillId: prereq,
            skillName: prereqName,
            type: 'prerequisite',
            message: `أتقن "${prereqName}" أولاً لتتمكن من "${skillName}"`,
            priority: 1,
          });
        }
      } else {
        recommendations.push({
          skillId: progress.skillId,
          skillName,
          type: 'practice',
          message: `تحتاج لمزيد من التمرين على "${skillName}"`,
          priority: 2,
        });
      }
    }

    // Skills declining - need review
    if (progress.history && progress.history.length >= 2) {
      const trend = calculateTrend(progress.history);
      if (trend === 'declining' && mastery < 70) {
        recommendations.push({
          skillId: progress.skillId,
          skillName,
          type: 'review',
          message: `مستواك في "${skillName}" يتراجع. راجع هذه المهارة`,
          priority: 2,
        });
      }
    }

    // Skills ready to advance
    if (mastery >= 85) {
      const prereqs = getPrerequisites(progress.skillId);
      // Find skills that have this as a prerequisite and are not yet started
      const nextSkills = progressList.filter(p => {
        const pPrereqs = getPrerequisites(p.skillId);
        return pPrereqs.includes(progress.skillId) && p.attempts === 0;
      });
      
      for (const next of nextSkills.slice(0, 1)) {
        const nextName = skillNameMap.get(next.skillId) || next.skillId;
        // Check if all prereqs for next skill are mastered
        const nextPrereqs = getPrerequisites(next.skillId);
        if (nextPrereqs.every(p => masteredSet.has(p))) {
          recommendations.push({
            skillId: next.skillId,
            skillName: nextName,
            type: 'advance',
            message: `أنت جاهز للانتقال إلى "${nextName}"!`,
            priority: 3,
          });
        }
      }
    }
  }

  // Sort by priority and deduplicate
  const seen = new Set<string>();
  return recommendations
    .sort((a, b) => a.priority - b.priority)
    .filter(r => {
      if (seen.has(r.skillId)) return false;
      seen.add(r.skillId);
      return true;
    })
    .slice(0, 8);
}

// ===== Diagnostic System =====

export function runDiagnostic(
  failedSkillId: string,
  progressList: StudentSkillProgress[],
  allSkills: { id: string; name: string }[]
): DiagnosticResult {
  const skillNameMap = new Map(allSkills.map(s => [s.id, s.name]));
  const masteredSet = new Set(
    progressList.filter(p => calculateEnhancedMastery(p) >= 70).map(p => p.skillId)
  );

  const { rootCauses, suggestedPath } = diagnoseWeakness(failedSkillId, masteredSet);
  const failedSkillName = skillNameMap.get(failedSkillId) || failedSkillId;

  const rootCauseDetails = rootCauses.map(id => ({
    skillId: id,
    skillName: skillNameMap.get(id) || id,
  }));

  const pathDetails = suggestedPath.map(id => ({
    skillId: id,
    skillName: skillNameMap.get(id) || id,
  }));

  let explanation = '';
  if (rootCauseDetails.length > 0) {
    const names = rootCauseDetails.map(r => `"${r.skillName}"`).join(' و ');
    explanation = `صعوبتك في "${failedSkillName}" قد تكون بسبب عدم إتقان: ${names}. ابدأ بهذه المهارات أولاً.`;
  } else {
    explanation = `تحتاج لمزيد من التمرين على "${failedSkillName}". حاول مرة أخرى بأسئلة أسهل.`;
  }

  return {
    failedSkillId,
    failedSkillName,
    rootCauses: rootCauseDetails,
    suggestedPath: pathDetails,
    explanation,
  };
}

// ===== Academic Score =====

export function calculateAcademicScore(progressList: StudentSkillProgress[]): number {
  const attempted = progressList.filter(p => p.attempts > 0);
  if (attempted.length === 0) return 0;

  const totalMastery = attempted.reduce((sum, p) => sum + calculateEnhancedMastery(p), 0);
  const maxPossible = progressList.length * 100;
  
  // Weight: attempted skills count more, but total coverage matters
  const coverageBonus = (attempted.length / progressList.length) * 20;
  const avgMastery = totalMastery / attempted.length;
  
  return Math.round(Math.min(100, avgMastery * 0.8 + coverageBonus));
}

// ===== Adaptive Difficulty =====

export function getRecommendedDifficulty(progress: StudentSkillProgress): 'easy' | 'medium' | 'hard' {
  const mastery = calculateEnhancedMastery(progress);
  
  // Factor in consecutive correct/wrong
  if (progress.consecutiveWrong >= 2) return 'easy';
  if (progress.consecutiveCorrect >= 3 && mastery >= 70) return 'hard';
  
  if (mastery < 40) return 'easy';
  if (mastery < 70) return 'medium';
  return 'hard';
}

// ===== History Management =====

const HISTORY_KEY = 'skill_mastery_history';

export function saveSkillHistory(snapshot: SkillHistorySnapshot): void {
  try {
    const existing = getSkillHistory();
    existing.push(snapshot);
    // Keep last 30 snapshots
    const trimmed = existing.slice(-30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

export function getSkillHistory(): SkillHistorySnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

// ===== Mastery Label =====

export interface MasteryLabelInfo {
  label: string;
  emoji: string;
  color: string;
}

export function getMasteryLabel(mastery: number): string {
  if (mastery >= 85) return 'متقن';
  if (mastery >= 70) return 'جيد';
  if (mastery >= 40) return 'قيد التطوير';
  if (mastery > 0) return 'يحتاج تمرين';
  return 'لم يبدأ';
}

export function getMasteryLabelDetailed(mastery: number): MasteryLabelInfo {
  if (mastery >= 85) return { label: 'متقن', emoji: '🌟', color: 'bg-green-100 text-green-700' };
  if (mastery >= 70) return { label: 'جيد', emoji: '✅', color: 'bg-blue-100 text-blue-700' };
  if (mastery >= 40) return { label: 'قيد التطوير', emoji: '📈', color: 'bg-yellow-100 text-yellow-700' };
  if (mastery > 0) return { label: 'يحتاج تمرين', emoji: '⚠️', color: 'bg-red-100 text-red-700' };
  return { label: 'لم يبدأ', emoji: '⬜', color: 'bg-gray-100 text-gray-500' };
}

// ===== Adaptive Difficulty (legacy name - accepts number or progress) =====

export function getAdaptiveDifficulty(progressOrMastery: StudentSkillProgress | number): 'easy' | 'medium' | 'hard' {
  if (typeof progressOrMastery === 'number') {
    // Simple mastery-based difficulty
    if (progressOrMastery >= 80) return 'hard';
    if (progressOrMastery >= 50) return 'medium';
    return 'easy';
  }
  return getRecommendedDifficulty(progressOrMastery);
}

// ===== Legacy compatibility exports =====

export function calculateSkillMastery(
  _attempts: unknown[],
  _questions: unknown[],
  skills: { id: number; name: string }[]
): SkillMasteryData[] {
  // Legacy function - returns basic mastery data
  return skills.map(skill => ({
    skillId: String(skill.id),
    skillName: skill.name,
    mastery: 0,
    totalAttempted: 0,
    correctCount: 0,
    trend: 'stable' as const,
    readyToAdvance: false,
  }));
}

export function getRecommendations(masteryData: SkillMasteryData[]): Recommendation[] {
  return masteryData
    .filter(d => d.mastery < 50 && d.totalAttempted > 0)
    .map(d => ({
      skillId: d.skillId,
      skillName: d.skillName,
      type: 'practice' as const,
      message: `تحتاج لمزيد من التمرين على "${d.skillName}"`,
      priority: 2,
    }))
    .slice(0, 5);
}

export function getAcademicScore(masteryData: SkillMasteryData[]): number {
  if (masteryData.length === 0) return 0;
  const total = masteryData.reduce((sum, d) => sum + d.mastery, 0);
  return Math.round(total / masteryData.length);
}