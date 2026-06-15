// Core Learning Quality Sprint - Enhanced Mastery Engine V2
// Features: retention checks, time-based review, mistake recurrence, stability scoring, root cause analysis

import type { StudentSkillProgress, Skill } from '@/data/mathSkillsData';
import { skillPrerequisites, getFullPrerequisiteChain } from '@/data/skillPrerequisites';

export type MasteryStatus = 'not_started' | 'needs_practice' | 'developing' | 'good' | 'mastered';

export interface MasteryResult {
  percentage: number;
  status: MasteryStatus;
  label: string;
  color: string;
  stability: number; // 0-100, how stable is the mastery
  needsReview: boolean;
  daysSinceLastAttempt: number;
}

export interface RootCauseResult {
  weakSkillId: string;
  weakSkillName: string;
  rootCauses: {
    skillId: string;
    skillName: string;
    mastery: number;
    isLikely: boolean;
    reason: string;
  }[];
  recommendation: string;
}

export interface RetentionCheck {
  skillId: string;
  lastMastered: string;
  daysSinceMastery: number;
  needsRetentionTest: boolean;
  retentionRisk: 'low' | 'medium' | 'high';
}

// Configuration
const MIN_ATTEMPTS_FOR_MASTERY = 5;
const MIN_ATTEMPTS_FOR_GOOD = 3;
const MIN_CONSECUTIVE_CORRECT = 3;
const RETENTION_CHECK_DAYS = 7; // Check retention after 7 days
const DECAY_RATE = 0.05; // 5% decay per week without practice

/** Clamp a number to [min, max], returning defaultVal if NaN/undefined */
function safeNum(value: unknown, min: number, max: number, defaultVal: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

/** Validate progress object has required numeric fields */
function sanitizeProgress(progress: StudentSkillProgress): StudentSkillProgress {
  return {
    ...progress,
    attempts: safeNum(progress.attempts, 0, 100000, 0),
    correctCount: safeNum(progress.correctCount, 0, Math.max(0, Number(progress.attempts) || 0), 0),
    consecutiveCorrect: safeNum(progress.consecutiveCorrect, 0, 1000, 0),
    consecutiveWrong: safeNum(progress.consecutiveWrong, 0, 1000, 0),
    lastScore: safeNum(progress.lastScore, 0, 100, 0),
    history: Array.isArray(progress.history) ? progress.history : [],
  };
}

/**
 * Calculate mastery with stability and retention
 */
export function calculateMasteryV2(progress: StudentSkillProgress): MasteryResult {
  // Sanitize inputs
  const p = sanitizeProgress(progress);

  if (p.attempts === 0) {
    return {
      percentage: 0, status: 'not_started', label: 'لم يبدأ', color: 'gray',
      stability: 0, needsReview: false, daysSinceLastAttempt: 999,
    };
  }

  // Ensure correctCount <= attempts
  const safeCorrect = Math.min(p.correctCount, p.attempts);
  const accuracy = (safeCorrect / p.attempts) * 100;
  const daysSince = getDaysSince(p.lastAttemptDate);

  // Attempt confidence factor
  const attemptConfidence = Math.min(1, 0.4 + (p.attempts / MIN_ATTEMPTS_FOR_MASTERY) * 0.6);

  // Consistency factor: rewards consecutive correct answers
  const consistencyBonus = Math.min(20, p.consecutiveCorrect * 4);
  const consistencyPenalty = Math.min(30, p.consecutiveWrong * 10);

  // Time decay: mastery decays if not practiced
  const weeksSince = daysSince / 7;
  const timeDecay = Math.max(0, 1 - (weeksSince * DECAY_RATE));

  // Stability: how consistent are scores over time
  const stability = calculateStability(p);

  // Raw mastery calculation
  let rawMastery = (accuracy * attemptConfidence + consistencyBonus - consistencyPenalty) * timeDecay;
  // Guard against NaN from any unexpected computation
  if (!Number.isFinite(rawMastery)) rawMastery = 0;
  rawMastery = Math.max(0, Math.min(100, rawMastery));

  // Cap mastery based on minimum attempts
  let mastery = Math.round(rawMastery);
  if (p.attempts < MIN_ATTEMPTS_FOR_GOOD) {
    mastery = Math.min(mastery, 65);
  }
  if (p.attempts < MIN_ATTEMPTS_FOR_MASTERY) {
    mastery = Math.min(mastery, 85);
  }
  // Require consecutive correct for mastery
  if (p.consecutiveCorrect < MIN_CONSECUTIVE_CORRECT) {
    mastery = Math.min(mastery, 89);
  }

  // Final clamp
  mastery = Math.max(0, Math.min(100, mastery));

  // Needs review if mastered but not practiced recently
  const needsReview = mastery >= 70 && daysSince >= RETENTION_CHECK_DAYS;

  // Determine status
  let status: MasteryStatus;
  let label: string;
  let color: string;

  if (mastery < 40) {
    status = 'needs_practice'; label = 'يحتاج تدريب'; color = 'red';
  } else if (mastery < 70) {
    status = 'developing'; label = 'نامٍ'; color = 'yellow';
  } else if (mastery < 90) {
    status = 'good'; label = 'جيد'; color = 'blue';
  } else {
    status = 'mastered'; label = 'متقن'; color = 'green';
  }

  return { percentage: mastery, status, label, color, stability, needsReview, daysSinceLastAttempt: daysSince };
}

/**
 * Calculate stability score (0-100) based on score variance over time
 */
function calculateStability(progress: StudentSkillProgress): number {
  if (!progress.history || !Array.isArray(progress.history) || progress.history.length < 2) return 50;

  const scores = progress.history
    .map(h => (h && typeof h.score === 'number' && Number.isFinite(h.score)) ? h.score : null)
    .filter((s): s is number => s !== null);

  if (scores.length < 2) return 50;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (!Number.isFinite(mean)) return 50;

  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  if (!Number.isFinite(stdDev)) return 50;

  // Lower std dev = higher stability
  // stdDev of 0 = 100 stability, stdDev of 30+ = 0 stability
  const stability = Math.max(0, Math.min(100, 100 - (stdDev * 3.3)));
  return Math.round(stability);
}

/**
 * Get days since a date string - returns 999 for invalid/missing dates
 */
function getDaysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return 999;
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return 999;
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) && days >= 0 ? days : 999;
}

/**
 * Root Cause Analysis - find WHY a skill is weak
 * Traces prerequisite chain to find the real problem
 */
export function rootCauseAnalysis(
  weakSkillId: string,
  allProgress: StudentSkillProgress[],
  allSkills: Skill[]
): RootCauseResult {
  const weakSkill = allSkills.find(s => s.id === weakSkillId);
  if (!weakSkill) {
    return { weakSkillId, weakSkillName: 'غير معروف', rootCauses: [], recommendation: '' };
  }

  // Get full prerequisite chain
  const prereqChain = getFullPrerequisiteChain(weakSkillId);
  const rootCauses: RootCauseResult['rootCauses'] = [];

  for (const prereqId of prereqChain) {
    const prereqSkill = allSkills.find(s => s.id === prereqId);
    if (!prereqSkill) continue;

    const prereqProgress = allProgress.find(p => p.skillId === prereqId);
    if (!prereqProgress) continue;

    const mastery = calculateMasteryV2(prereqProgress);

    if (mastery.percentage < 70) {
      // This prerequisite is weak - likely root cause
      let reason = '';
      if (mastery.percentage < 40) {
        reason = 'لم يتقن هذه المهارة الأساسية بعد';
      } else if (mastery.needsReview) {
        reason = 'أتقنها سابقاً لكن يحتاج مراجعة';
      } else if (mastery.stability < 50) {
        reason = 'أداؤه غير مستقر في هذه المهارة';
      } else {
        reason = 'مستوى متوسط يحتاج تعزيز';
      }

      rootCauses.push({
        skillId: prereqId,
        skillName: prereqSkill.name,
        mastery: mastery.percentage,
        isLikely: mastery.percentage < 50,
        reason,
      });
    }
  }

  // Sort by mastery (weakest first)
  rootCauses.sort((a, b) => a.mastery - b.mastery);

  // Generate recommendation
  let recommendation = '';
  if (rootCauses.length === 0) {
    recommendation = `المهارة "${weakSkill.name}" تحتاج تدريب مباشر. الأساسيات جيدة.`;
  } else if (rootCauses[0].mastery < 30) {
    recommendation = `ابدأ بتقوية "${rootCauses[0].skillName}" أولاً - هذا هو السبب الرئيسي.`;
  } else {
    recommendation = `راجع "${rootCauses[0].skillName}" ثم عد لـ "${weakSkill.name}".`;
  }

  return {
    weakSkillId,
    weakSkillName: weakSkill.name,
    rootCauses: rootCauses.slice(0, 3), // Top 3 root causes
    recommendation,
  };
}

/**
 * Get retention checks - skills that need review
 */
export function getRetentionChecks(
  allProgress: StudentSkillProgress[]
): RetentionCheck[] {
  const checks: RetentionCheck[] = [];

  for (const p of allProgress) {
    if (p.status === 'mastered' || p.status === 'good') {
      const daysSince = getDaysSince(p.lastAttemptDate);

      if (daysSince >= RETENTION_CHECK_DAYS) {
        let risk: 'low' | 'medium' | 'high' = 'low';
        if (daysSince > 21) risk = 'high';
        else if (daysSince > 14) risk = 'medium';

        checks.push({
          skillId: p.skillId,
          lastMastered: p.lastAttemptDate,
          daysSinceMastery: daysSince,
          needsRetentionTest: true,
          retentionRisk: risk,
        });
      }
    }
  }

  return checks.sort((a, b) => b.daysSinceMastery - a.daysSinceMastery);
}

/**
 * Get mistake patterns - recurring errors
 */
export function getMistakePatterns(progress: StudentSkillProgress): {
  hasRecurringMistakes: boolean;
  mistakeRate: number;
  trend: 'improving' | 'stable' | 'declining';
} {
  if (progress.attempts < 3) {
    return { hasRecurringMistakes: false, mistakeRate: 0, trend: 'stable' };
  }

  const mistakeRate = ((progress.attempts - progress.correctCount) / progress.attempts) * 100;
  const hasRecurringMistakes = progress.consecutiveWrong >= 2 || mistakeRate > 50;

  // Determine trend from history
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (progress.history && progress.history.length >= 3) {
    const recent = progress.history.slice(-2);
    const older = progress.history.slice(-4, -2);

    const recentAvg = recent.reduce((s, h) => s + h.score, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((s, h) => s + h.score, 0) / older.length
      : recentAvg;

    if (recentAvg > olderAvg + 10) trend = 'improving';
    else if (recentAvg < olderAvg - 10) trend = 'declining';
  }

  return { hasRecurringMistakes, mistakeRate: Math.round(mistakeRate), trend };
}

/**
 * Generate daily mission based on progress, retention, and weaknesses
 */
export function generateDailyMission(
  allProgress: StudentSkillProgress[],
  allSkills: Skill[],
  grade: 1 | 2
): { skillId: string; skillName: string; reason: string; type: 'review' | 'practice' | 'new' }[] {
  const missions: { skillId: string; skillName: string; reason: string; type: 'review' | 'practice' | 'new' }[] = [];
  const gradeSkills = allSkills.filter(s => s.grade === grade);

  // Priority 1: Retention reviews (mastered but not practiced)
  const retentionChecks = getRetentionChecks(
    allProgress.filter(p => gradeSkills.some(s => s.id === p.skillId))
  );
  if (retentionChecks.length > 0) {
    const skill = gradeSkills.find(s => s.id === retentionChecks[0].skillId);
    if (skill) {
      missions.push({
        skillId: skill.id,
        skillName: skill.name,
        reason: 'مراجعة للتثبيت',
        type: 'review',
      });
    }
  }

  // Priority 2: Weakest skill that needs practice
  const weakProgress = allProgress
    .filter(p => gradeSkills.some(s => s.id === p.skillId))
    .filter(p => p.status === 'needs_practice' || p.status === 'developing')
    .sort((a, b) => {
      const aM = calculateMasteryV2(a);
      const bM = calculateMasteryV2(b);
      return aM.percentage - bM.percentage;
    });

  if (weakProgress.length > 0 && missions.length < 2) {
    const skill = gradeSkills.find(s => s.id === weakProgress[0].skillId);
    if (skill) {
      missions.push({
        skillId: skill.id,
        skillName: skill.name,
        reason: 'تدريب على نقطة ضعف',
        type: 'practice',
      });
    }
  }

  // Priority 3: Next new skill to learn
  const notStarted = allProgress
    .filter(p => gradeSkills.some(s => s.id === p.skillId))
    .filter(p => p.status === 'not_started');

  if (notStarted.length > 0 && missions.length < 3) {
    // Find one whose prerequisites are met
    for (const p of notStarted) {
      const prereqs = skillPrerequisites[p.skillId] || [];
      const allPrereqsMet = prereqs.every(prereqId => {
        const prereqProgress = allProgress.find(pp => pp.skillId === prereqId);
        return prereqProgress && (prereqProgress.status === 'good' || prereqProgress.status === 'mastered');
      });

      if (allPrereqsMet || prereqs.length === 0) {
        const skill = gradeSkills.find(s => s.id === p.skillId);
        if (skill) {
          missions.push({
            skillId: skill.id,
            skillName: skill.name,
            reason: 'مهارة جديدة',
            type: 'new',
          });
          break;
        }
      }
    }
  }

  return missions.slice(0, 3); // Max 3 missions per day
}

/**
 * Update progress after answering - enhanced with tracking
 */
export function updateProgressV2(
  current: StudentSkillProgress,
  correctAnswers: number,
  totalQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard'
): StudentSkillProgress {
  // Validate inputs
  const safeTotal = Math.max(1, Math.round(Number(totalQuestions) || 1));
  const safeCorrect = Math.max(0, Math.min(safeTotal, Math.round(Number(correctAnswers) || 0)));
  const safeCurrent = sanitizeProgress(current);

  const score = Math.round((safeCorrect / safeTotal) * 100);
  const newAttempts = safeCurrent.attempts + safeTotal;
  const newCorrect = safeCurrent.correctCount + safeCorrect;
  const wrongThisRound = safeTotal - safeCorrect;

  const newConsecutiveCorrect = wrongThisRound === 0
    ? safeCurrent.consecutiveCorrect + safeCorrect
    : safeCorrect; // Reset if any wrong

  const newConsecutiveWrong = safeCorrect === 0
    ? safeCurrent.consecutiveWrong + wrongThisRound
    : 0; // Reset if any correct

  const newHistory = [
    ...(Array.isArray(safeCurrent.history) ? safeCurrent.history : []),
    { date: new Date().toISOString().split('T')[0], score, difficulty },
  ].slice(-20); // Keep last 20 entries

  const updated: StudentSkillProgress = {
    ...safeCurrent,
    attempts: newAttempts,
    correctCount: Math.min(newCorrect, newAttempts), // Ensure correctCount <= attempts
    lastScore: Math.max(0, Math.min(100, score)),
    lastAttemptDate: new Date().toISOString(),
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveWrong: newConsecutiveWrong,
    history: newHistory,
    status: 'not_started',
  };

  // Recalculate status
  const mastery = calculateMasteryV2(updated);
  updated.status = mastery.status;

  return updated;
}

/**
 * Simulate student profiles for testing
 */
export function simulateStudent(type: 'weak' | 'medium' | 'strong', skills: Skill[]): StudentSkillProgress[] {
  return skills.map(skill => {
    let attempts: number, correctRate: number, consecutive: number;

    switch (type) {
      case 'weak':
        attempts = Math.floor(Math.random() * 4) + 1;
        correctRate = 0.2 + Math.random() * 0.3; // 20-50%
        consecutive = 0;
        break;
      case 'medium':
        attempts = Math.floor(Math.random() * 6) + 3;
        correctRate = 0.5 + Math.random() * 0.3; // 50-80%
        consecutive = Math.floor(Math.random() * 3);
        break;
      case 'strong':
        attempts = Math.floor(Math.random() * 8) + 5;
        correctRate = 0.8 + Math.random() * 0.2; // 80-100%
        consecutive = Math.floor(Math.random() * 5) + 2;
        break;
    }

    const correctCount = Math.round(attempts * correctRate);
    const score = Math.round(correctRate * 100);

    const progress: StudentSkillProgress = {
      skillId: skill.id,
      attempts,
      correctCount,
      lastScore: score,
      lastAttemptDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'not_started',
      history: Array.from({ length: Math.min(attempts, 5) }, (_, i) => ({
        date: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        score: Math.round((correctRate + (Math.random() - 0.5) * 0.2) * 100),
        difficulty: type === 'weak' ? 'easy' : type === 'medium' ? 'medium' : 'hard',
      })),
      consecutiveCorrect: consecutive,
      consecutiveWrong: type === 'weak' ? Math.floor(Math.random() * 3) + 1 : 0,
    };

    const mastery = calculateMasteryV2(progress);
    progress.status = mastery.status;
    return progress;
  });
}