// Learning Intelligence Sprint - Smart Retention Reviews
// Reviews skills based on: mastery level, time since last review,
// skill type (core/procedural/conceptual/fluency), and error history
// Not all skills get the same review frequency

import type { StudentSkillProgress } from '@/data/mathSkillsData';
import { calculateConfidence, type SkillConfidence } from './masteryDecaySystem';
import { getRetentionSchedules, type RetentionSchedule } from './retentionEngine';
import type { RetentionTag } from './questionIntelligenceEngine';

// ============ Types ============

export interface SmartReviewItem {
  skillId: string;
  skillName: string;
  priority: number; // 1-100, higher = more urgent
  reason: string;
  reviewType: 'retention' | 'decay_prevention' | 'error_correction' | 'fluency_drill';
  suggestedDifficulty: 'easy' | 'medium' | 'hard';
  estimatedQuestions: number;
  daysOverdue: number;
}

export interface ReviewScheduleConfig {
  retentionTag: RetentionTag;
  baseIntervalDays: number;
  masteryMultiplier: number; // higher mastery = longer intervals
  errorPenalty: number; // errors shorten interval
}

// ============ Review Interval Configuration ============

const REVIEW_CONFIGS: Record<RetentionTag, ReviewScheduleConfig> = {
  core: {
    retentionTag: 'core',
    baseIntervalDays: 3, // Core facts need frequent review
    masteryMultiplier: 1.5,
    errorPenalty: 0.5,
  },
  procedural: {
    retentionTag: 'procedural',
    baseIntervalDays: 5, // Procedures need moderate review
    masteryMultiplier: 2.0,
    errorPenalty: 0.6,
  },
  conceptual: {
    retentionTag: 'conceptual',
    baseIntervalDays: 7, // Concepts retained longer once understood
    masteryMultiplier: 2.5,
    errorPenalty: 0.4,
  },
  fluency: {
    retentionTag: 'fluency',
    baseIntervalDays: 2, // Fluency needs daily/frequent practice
    masteryMultiplier: 1.2,
    errorPenalty: 0.7,
  },
};

// ============ Smart Review Engine ============

/**
 * Calculate personalized review interval for a skill
 */
function calculateReviewInterval(
  retentionTag: RetentionTag,
  masteryLevel: number, // 0-100
  errorCount: number,
  consecutiveCorrect: number
): number {
  const config = REVIEW_CONFIGS[retentionTag];

  // Base interval adjusted by mastery
  let interval = config.baseIntervalDays;

  // Higher mastery = longer intervals (up to 3x base)
  const masteryFactor = 1 + (masteryLevel / 100) * config.masteryMultiplier;
  interval *= masteryFactor;

  // Errors shorten the interval
  if (errorCount > 0) {
    interval *= Math.max(0.3, 1 - (errorCount * config.errorPenalty * 0.1));
  }

  // Consecutive correct answers extend interval
  if (consecutiveCorrect >= 3) {
    interval *= 1.3;
  }

  return Math.max(1, Math.round(interval));
}

/**
 * Determine retention tag for a skill based on its ID
 */
function inferRetentionTag(skillId: string): RetentionTag {
  // Number facts = core
  if (skillId.match(/G[12]-N-00[1-5]/)) return 'core';
  // Operations = procedural
  if (skillId.includes('-A-') || skillId.includes('-C-')) return 'procedural';
  // Geometry/patterns = conceptual
  if (skillId.includes('-G-') || skillId.includes('-P-')) return 'conceptual';
  // Basic counting/reading = fluency
  if (skillId.match(/G1-N-00[1-3]/) || skillId.includes('-M-')) return 'fluency';

  return 'core';
}

/**
 * Generate smart review list - prioritized by urgency
 */
export function generateSmartReviews(
  allProgress: StudentSkillProgress[],
  skillNames: Record<string, string>,
  limit: number = 5
): SmartReviewItem[] {
  const reviews: SmartReviewItem[] = [];
  const retentionSchedules = getRetentionSchedules();
  const now = new Date();

  for (const progress of allProgress) {
    if (progress.attempts === 0) continue;
    if (progress.status === 'not_started') continue;

    const confidence = calculateConfidence(progress);
    const retentionTag = inferRetentionTag(progress.skillId);
    const accuracy = (progress.correctCount / progress.attempts) * 100;

    // Calculate personalized interval
    const idealInterval = calculateReviewInterval(
      retentionTag,
      accuracy,
      progress.consecutiveWrong,
      progress.consecutiveCorrect
    );

    const daysSince = getDaysSince(progress.lastAttemptDate);
    const daysOverdue = daysSince - idealInterval;

    // Skip if not overdue
    if (daysOverdue < 0) continue;

    // Calculate priority (0-100)
    let priority = 0;

    // Overdue factor (max 40 points)
    priority += Math.min(40, daysOverdue * 5);

    // Decay factor (max 30 points)
    const decayGap = confidence.masteryScore - confidence.confidenceScore;
    priority += Math.min(30, decayGap);

    // Error recurrence factor (max 20 points)
    if (progress.consecutiveWrong >= 2) {
      priority += Math.min(20, progress.consecutiveWrong * 8);
    }

    // Retention failure factor (max 10 points)
    const schedule = retentionSchedules.find(s => s.skillId === progress.skillId);
    if (schedule && schedule.lastReviewScore !== null && schedule.lastReviewScore < 70) {
      priority += 10;
    }

    priority = Math.min(100, priority);

    // Determine review type
    let reviewType: SmartReviewItem['reviewType'] = 'retention';
    if (decayGap > 20) reviewType = 'decay_prevention';
    else if (progress.consecutiveWrong >= 2) reviewType = 'error_correction';
    else if (retentionTag === 'fluency') reviewType = 'fluency_drill';

    // Determine difficulty
    let suggestedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (confidence.confidenceScore < 40) suggestedDifficulty = 'easy';
    else if (confidence.confidenceScore > 75) suggestedDifficulty = 'hard';

    // Determine question count
    let estimatedQuestions = 3;
    if (reviewType === 'error_correction') estimatedQuestions = 5;
    else if (reviewType === 'fluency_drill') estimatedQuestions = 4;

    // Reason text
    let reason = '';
    if (reviewType === 'decay_prevention') reason = `انخفاض الثقة ${decayGap}% - يحتاج تعزيز`;
    else if (reviewType === 'error_correction') reason = `${progress.consecutiveWrong} أخطاء متتالية`;
    else if (reviewType === 'fluency_drill') reason = `تدريب طلاقة - آخر ممارسة منذ ${daysSince} يوم`;
    else reason = `مراجعة مستحقة منذ ${daysOverdue} يوم`;

    reviews.push({
      skillId: progress.skillId,
      skillName: skillNames[progress.skillId] || progress.skillId,
      priority,
      reason,
      reviewType,
      suggestedDifficulty,
      estimatedQuestions,
      daysOverdue,
    });
  }

  return reviews
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Get review statistics
 */
export function getReviewStats(allProgress: StudentSkillProgress[]): {
  totalDue: number;
  highPriority: number;
  byType: Record<string, number>;
  avgOverdueDays: number;
} {
  const reviews = generateSmartReviews(allProgress, {}, 100);

  const byType: Record<string, number> = {
    retention: 0,
    decay_prevention: 0,
    error_correction: 0,
    fluency_drill: 0,
  };

  for (const r of reviews) {
    byType[r.reviewType]++;
  }

  const totalOverdue = reviews.reduce((s, r) => s + r.daysOverdue, 0);

  return {
    totalDue: reviews.length,
    highPriority: reviews.filter(r => r.priority >= 60).length,
    byType,
    avgOverdueDays: reviews.length > 0 ? Math.round(totalOverdue / reviews.length) : 0,
  };
}

// ============ Helpers ============

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
}