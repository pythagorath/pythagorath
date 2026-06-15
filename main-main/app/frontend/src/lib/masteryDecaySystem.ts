// Learning Intelligence Sprint - Mastery Decay System
// Mastery decays when: student is absent, errors recur, retention reviews fail
// Adds confidenceScore per skill

import type { StudentSkillProgress } from '@/data/mathSkillsData';

// ============ Types ============

export interface SkillConfidence {
  skillId: string;
  confidenceScore: number; // 0-100
  masteryScore: number; // raw mastery 0-100
  decayRate: number; // daily decay rate
  lastActivity: string;
  absenceDays: number;
  failedRetentions: number;
  recurringErrors: number;
  stabilityTrend: 'rising' | 'stable' | 'falling';
}

export interface DecayEvent {
  skillId: string;
  type: 'absence' | 'error_recurrence' | 'retention_failure';
  decayAmount: number;
  timestamp: string;
  details: string;
}

// ============ Storage ============

const CONFIDENCE_KEY = 'pythagorasConfidence';
const DECAY_EVENTS_KEY = 'pythagorasDecayEvents';

function getStoredConfidence(): Record<string, SkillConfidence> {
  const stored = localStorage.getItem(CONFIDENCE_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveConfidence(data: Record<string, SkillConfidence>): void {
  localStorage.setItem(CONFIDENCE_KEY, JSON.stringify(data));
}

function getDecayEvents(): DecayEvent[] {
  const stored = localStorage.getItem(DECAY_EVENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveDecayEvents(events: DecayEvent[]): void {
  localStorage.setItem(DECAY_EVENTS_KEY, JSON.stringify(events.slice(-200)));
}

// ============ Decay Configuration ============

const BASE_DECAY_PER_DAY = 0.8; // 0.8% per day of absence
const ERROR_RECURRENCE_DECAY = 3; // 3% per recurring error
const RETENTION_FAILURE_DECAY = 8; // 8% per failed retention review
const MAX_DECAY_PER_DAY = 5; // cap at 5% per day
const CONFIDENCE_FLOOR = 10; // never goes below 10

// ============ Core Functions ============

/**
 * Calculate confidence score for a skill
 */
export function calculateConfidence(
  progress: StudentSkillProgress,
  failedRetentions: number = 0
): SkillConfidence {
  const stored = getStoredConfidence();
  const existing = stored[progress.skillId];

  const daysSince = getDaysSince(progress.lastAttemptDate);
  const accuracy = progress.attempts > 0 ? (progress.correctCount / progress.attempts) * 100 : 0;

  // Base mastery
  const masteryScore = Math.round(accuracy);

  // Absence decay
  const absenceDecay = Math.min(daysSince * BASE_DECAY_PER_DAY, daysSince * MAX_DECAY_PER_DAY);

  // Error recurrence decay
  const recurringErrors = progress.consecutiveWrong;
  const errorDecay = recurringErrors * ERROR_RECURRENCE_DECAY;

  // Retention failure decay
  const retentionDecay = failedRetentions * RETENTION_FAILURE_DECAY;

  // Total decay
  const totalDecay = absenceDecay + errorDecay + retentionDecay;

  // Confidence = mastery - decay, with floor
  let confidenceScore = Math.max(CONFIDENCE_FLOOR, Math.round(masteryScore - totalDecay));

  // Boost if recently active and doing well
  if (daysSince <= 1 && progress.consecutiveCorrect >= 2) {
    confidenceScore = Math.min(100, confidenceScore + 5);
  }

  // Determine trend
  let stabilityTrend: 'rising' | 'stable' | 'falling' = 'stable';
  if (existing) {
    if (confidenceScore > existing.confidenceScore + 5) stabilityTrend = 'rising';
    else if (confidenceScore < existing.confidenceScore - 5) stabilityTrend = 'falling';
  }

  const result: SkillConfidence = {
    skillId: progress.skillId,
    confidenceScore,
    masteryScore,
    decayRate: Math.round((absenceDecay + errorDecay + retentionDecay) * 10) / 10,
    lastActivity: progress.lastAttemptDate,
    absenceDays: daysSince,
    failedRetentions,
    recurringErrors,
    stabilityTrend,
  };

  // Save
  stored[progress.skillId] = result;
  saveConfidence(stored);

  return result;
}

/**
 * Apply decay to all tracked skills (call daily or on app open)
 */
export function applyDailyDecay(allProgress: StudentSkillProgress[]): SkillConfidence[] {
  const results: SkillConfidence[] = [];

  for (const p of allProgress) {
    if (p.attempts === 0) continue;
    const confidence = calculateConfidence(p);
    results.push(confidence);

    // Record decay event if significant
    if (confidence.absenceDays > 3 && confidence.decayRate > 2) {
      recordDecayEvent(p.skillId, 'absence', confidence.decayRate,
        `غياب ${confidence.absenceDays} أيام - انخفاض ${confidence.decayRate}%`);
    }
  }

  return results;
}

/**
 * Record a retention failure
 */
export function recordRetentionFailure(skillId: string, score: number): void {
  recordDecayEvent(skillId, 'retention_failure', RETENTION_FAILURE_DECAY,
    `فشل مراجعة الاحتفاظ - النتيجة ${score}%`);
}

/**
 * Record recurring errors
 */
export function recordErrorRecurrence(skillId: string, consecutiveWrong: number): void {
  if (consecutiveWrong >= 2) {
    recordDecayEvent(skillId, 'error_recurrence', consecutiveWrong * ERROR_RECURRENCE_DECAY,
      `${consecutiveWrong} أخطاء متتالية`);
  }
}

/**
 * Record a decay event
 */
function recordDecayEvent(skillId: string, type: DecayEvent['type'], decayAmount: number, details: string): void {
  const events = getDecayEvents();
  events.push({
    skillId,
    type,
    decayAmount,
    timestamp: new Date().toISOString(),
    details,
  });
  saveDecayEvents(events);
}

// ============ Analysis ============

/**
 * Get skills with highest decay (most at risk)
 */
export function getHighestDecaySkills(allProgress: StudentSkillProgress[], limit: number = 10): SkillConfidence[] {
  const results = applyDailyDecay(allProgress);
  return results
    .filter(r => r.masteryScore > 30) // Only skills that were somewhat learned
    .sort((a, b) => (b.masteryScore - b.confidenceScore) - (a.masteryScore - a.confidenceScore))
    .slice(0, limit);
}

/**
 * Get decay patterns - which types of decay are most common
 */
export function getDecayPatterns(): {
  absenceDecays: number;
  errorDecays: number;
  retentionDecays: number;
  totalEvents: number;
  avgDecayPerEvent: number;
} {
  const events = getDecayEvents();
  const absenceDecays = events.filter(e => e.type === 'absence').length;
  const errorDecays = events.filter(e => e.type === 'error_recurrence').length;
  const retentionDecays = events.filter(e => e.type === 'retention_failure').length;
  const totalDecay = events.reduce((s, e) => s + e.decayAmount, 0);

  return {
    absenceDecays,
    errorDecays,
    retentionDecays,
    totalEvents: events.length,
    avgDecayPerEvent: events.length > 0 ? Math.round(totalDecay / events.length * 10) / 10 : 0,
  };
}

/**
 * Get confidence scores for all skills
 */
export function getAllConfidenceScores(): SkillConfidence[] {
  const stored = getStoredConfidence();
  return Object.values(stored);
}

/**
 * Get skills that need immediate attention (high decay + was mastered)
 */
export function getCriticalDecaySkills(allProgress: StudentSkillProgress[]): SkillConfidence[] {
  const results = applyDailyDecay(allProgress);
  return results.filter(r =>
    r.masteryScore >= 70 && r.confidenceScore < 50 // Was good, now decayed
  ).sort((a, b) => a.confidenceScore - b.confidenceScore);
}

// ============ Helpers ============

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
}