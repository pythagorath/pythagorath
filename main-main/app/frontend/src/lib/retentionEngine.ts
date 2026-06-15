// Content Intelligence Sprint - Retention Engine
// Spaced Review: after mastery → review at 1 day, 3 days, 7 days, 14 days
// Measures information retention over time

import type { StudentSkillProgress } from '@/data/mathSkillsData';

export interface RetentionSchedule {
  skillId: string;
  masteredDate: string;
  nextReviewDate: string;
  reviewStage: number; // 0=1day, 1=3days, 2=7days, 3=14days
  lastReviewScore: number | null;
  retentionScore: number; // 0-100, how well retained
  status: 'pending' | 'due' | 'overdue' | 'completed';
}

export interface DailyRetentionTask {
  skillId: string;
  skillName: string;
  urgency: 'high' | 'medium' | 'low';
  daysSinceLastReview: number;
  expectedDecay: number;
  reason: string;
}

// Spaced repetition intervals in days
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
const STORAGE_KEY = 'pythagorasRetention';

/**
 * Get retention schedules from storage
 */
export function getRetentionSchedules(): RetentionSchedule[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

/**
 * Save retention schedules
 */
function saveRetentionSchedules(schedules: RetentionSchedule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

/**
 * Register a skill as mastered - start retention tracking
 */
export function registerMastery(skillId: string): void {
  const schedules = getRetentionSchedules();
  const existing = schedules.find(s => s.skillId === skillId);

  if (existing) {
    // Reset if re-mastered
    existing.masteredDate = new Date().toISOString();
    existing.reviewStage = 0;
    existing.nextReviewDate = getNextReviewDate(0);
    existing.retentionScore = 100;
    existing.status = 'pending';
  } else {
    schedules.push({
      skillId,
      masteredDate: new Date().toISOString(),
      nextReviewDate: getNextReviewDate(0),
      reviewStage: 0,
      lastReviewScore: null,
      retentionScore: 100,
      status: 'pending',
    });
  }

  saveRetentionSchedules(schedules);
}

/**
 * Record a retention review result
 */
export function recordRetentionReview(skillId: string, score: number): void {
  const schedules = getRetentionSchedules();
  const schedule = schedules.find(s => s.skillId === skillId);

  if (!schedule) return;

  schedule.lastReviewScore = score;
  schedule.retentionScore = score;

  if (score >= 70) {
    // Passed review - advance to next stage
    schedule.reviewStage = Math.min(schedule.reviewStage + 1, REVIEW_INTERVALS.length - 1);
    schedule.nextReviewDate = getNextReviewDate(schedule.reviewStage);
    schedule.status = 'pending';
  } else {
    // Failed review - reset to stage 0
    schedule.reviewStage = 0;
    schedule.nextReviewDate = getNextReviewDate(0);
    schedule.status = 'pending';
  }

  saveRetentionSchedules(schedules);
}

/**
 * Get skills due for retention review today
 */
export function getDueRetentionReviews(): RetentionSchedule[] {
  const schedules = getRetentionSchedules();
  const now = new Date();

  return schedules.filter(s => {
    const reviewDate = new Date(s.nextReviewDate);
    return reviewDate <= now && s.status !== 'completed';
  }).map(s => {
    const reviewDate = new Date(s.nextReviewDate);
    const daysPast = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...s,
      status: daysPast > 3 ? 'overdue' as const : 'due' as const,
    };
  });
}

/**
 * Calculate expected retention decay based on time since mastery
 * Uses simplified Ebbinghaus forgetting curve
 */
export function calculateRetentionDecay(daysSinceMastery: number, reviewStage: number): number {
  // Higher review stages = slower decay
  const stabilityFactor = 1 + reviewStage * 0.5;
  const retention = 100 * Math.exp(-0.1 * daysSinceMastery / stabilityFactor);
  return Math.max(0, Math.min(100, Math.round(retention)));
}

/**
 * Get daily retention tasks sorted by urgency
 */
export function getDailyRetentionTasks(
  allProgress: StudentSkillProgress[],
  skillNames: Record<string, string>
): DailyRetentionTask[] {
  const dueReviews = getDueRetentionReviews();
  const tasks: DailyRetentionTask[] = [];

  for (const review of dueReviews) {
    const daysSince = getDaysSince(review.nextReviewDate);
    const expectedDecay = calculateRetentionDecay(
      getDaysSince(review.masteredDate),
      review.reviewStage
    );

    let urgency: 'high' | 'medium' | 'low' = 'low';
    if (review.status === 'overdue' || expectedDecay < 50) urgency = 'high';
    else if (daysSince > 1 || expectedDecay < 70) urgency = 'medium';

    let reason = '';
    if (review.status === 'overdue') reason = 'متأخر عن موعد المراجعة';
    else if (review.reviewStage === 0) reason = 'مراجعة أولى بعد الإتقان';
    else reason = `مراجعة المرحلة ${review.reviewStage + 1}`;

    tasks.push({
      skillId: review.skillId,
      skillName: skillNames[review.skillId] || review.skillId,
      urgency,
      daysSinceLastReview: daysSince,
      expectedDecay,
      reason,
    });
  }

  // Sort: high urgency first
  return tasks.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

/**
 * Get retention stats summary
 */
export function getRetentionStats(): {
  totalTracked: number;
  dueCount: number;
  overdueCount: number;
  avgRetention: number;
  wellRetained: number;
  atRisk: number;
} {
  const schedules = getRetentionSchedules();
  const now = new Date();

  let dueCount = 0;
  let overdueCount = 0;
  let totalRetention = 0;
  let wellRetained = 0;
  let atRisk = 0;

  for (const s of schedules) {
    const daysSinceMastery = getDaysSince(s.masteredDate);
    const currentRetention = calculateRetentionDecay(daysSinceMastery, s.reviewStage);

    totalRetention += currentRetention;
    if (currentRetention >= 70) wellRetained++;
    else atRisk++;

    const reviewDate = new Date(s.nextReviewDate);
    if (reviewDate <= now) {
      const daysPast = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPast > 3) overdueCount++;
      else dueCount++;
    }
  }

  return {
    totalTracked: schedules.length,
    dueCount,
    overdueCount,
    avgRetention: schedules.length > 0 ? Math.round(totalRetention / schedules.length) : 0,
    wellRetained,
    atRisk,
  };
}

// Helpers
function getNextReviewDate(stage: number): string {
  const days = REVIEW_INTERVALS[stage] || 30;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
}