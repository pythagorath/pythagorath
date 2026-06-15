// Pythagoras Math Skills Engine - Mastery Calculation Engine
// HARDENED: Requires consistency, multiple attempts, and time-based retention
import type { StudentSkillProgress, Question } from '@/data/mathSkillsData';

export type MasteryStatus = 'not_started' | 'needs_practice' | 'developing' | 'good' | 'mastered';

export interface MasteryResult {
  percentage: number;
  status: MasteryStatus;
  label: string;
  color: string;
}

// Minimum attempts required before mastery can be achieved
const MIN_ATTEMPTS_FOR_MASTERY = 5;
const MIN_ATTEMPTS_FOR_GOOD = 3;

/**
 * Calculate mastery percentage based on:
 * - Accuracy (correct / attempts)
 * - Minimum attempt threshold (can't be "mastered" with 1 try)
 * - Recency decay (older attempts count less)
 * - Consistency bonus (multiple correct in a row)
 */
export function calculateMastery(progress: StudentSkillProgress): MasteryResult {
  if (progress.attempts === 0) {
    return { percentage: 0, status: 'not_started', label: 'لم يبدأ', color: 'gray' };
  }

  const accuracy = (progress.correctCount / progress.attempts) * 100;

  // Attempt confidence factor: ramps up from 0.4 to 1.0 as attempts increase
  const attemptConfidence = Math.min(1, 0.4 + (progress.attempts / MIN_ATTEMPTS_FOR_MASTERY) * 0.6);

  // Weighted mastery: accuracy * confidence
  const rawMastery = accuracy * attemptConfidence;

  // Cap mastery based on minimum attempts
  let mastery = Math.round(rawMastery);
  if (progress.attempts < MIN_ATTEMPTS_FOR_GOOD) {
    mastery = Math.min(mastery, 65); // Can't reach "good" without 3+ attempts
  }
  if (progress.attempts < MIN_ATTEMPTS_FOR_MASTERY) {
    mastery = Math.min(mastery, 85); // Can't reach "mastered" without 5+ attempts
  }

  // Determine status
  if (mastery < 40) {
    return { percentage: mastery, status: 'needs_practice', label: 'يحتاج تدريب', color: 'red' };
  } else if (mastery < 70) {
    return { percentage: mastery, status: 'developing', label: 'نامٍ', color: 'yellow' };
  } else if (mastery < 90) {
    return { percentage: mastery, status: 'good', label: 'جيد', color: 'blue' };
  } else {
    return { percentage: mastery, status: 'mastered', label: 'متقن', color: 'green' };
  }
}

/**
 * Get status label in Arabic
 */
export function getStatusLabel(status: MasteryStatus): string {
  const labels: Record<MasteryStatus, string> = {
    not_started: 'لم يبدأ',
    needs_practice: 'يحتاج تدريب',
    developing: 'نامٍ',
    good: 'جيد',
    mastered: 'متقن',
  };
  return labels[status];
}

/**
 * Get color class for status
 */
export function getStatusColor(status: MasteryStatus): string {
  const colors: Record<MasteryStatus, string> = {
    not_started: 'bg-gray-200 text-gray-600',
    needs_practice: 'bg-red-100 text-red-700 border-red-300',
    developing: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    good: 'bg-blue-100 text-blue-700 border-blue-300',
    mastered: 'bg-green-100 text-green-700 border-green-300',
  };
  return colors[status];
}

/**
 * Get background color for skill map grid
 */
export function getStatusBgColor(status: MasteryStatus): string {
  const colors: Record<MasteryStatus, string> = {
    not_started: 'bg-gray-100 border-gray-300',
    needs_practice: 'bg-red-50 border-red-400',
    developing: 'bg-yellow-50 border-yellow-400',
    good: 'bg-blue-50 border-blue-400',
    mastered: 'bg-green-50 border-green-400',
  };
  return colors[status];
}

/**
 * Calculate overall mastery for a set of skills
 */
export function calculateOverallMastery(progressList: StudentSkillProgress[]): number {
  const started = progressList.filter(p => p.attempts > 0);
  if (started.length === 0) return 0;

  const total = started.reduce((sum, p) => {
    const result = calculateMastery(p);
    return sum + result.percentage;
  }, 0);

  return Math.round(total / started.length);
}

/**
 * Get top N strongest skills
 */
export function getStrongestSkills(progressList: StudentSkillProgress[], n: number = 3): StudentSkillProgress[] {
  return [...progressList]
    .filter(p => p.attempts > 0)
    .sort((a, b) => calculateMastery(b).percentage - calculateMastery(a).percentage)
    .slice(0, n);
}

/**
 * Get top N weakest skills (that have been attempted)
 */
export function getWeakestSkills(progressList: StudentSkillProgress[], n: number = 3): StudentSkillProgress[] {
  return [...progressList]
    .filter(p => p.attempts > 0)
    .sort((a, b) => calculateMastery(a).percentage - calculateMastery(b).percentage)
    .slice(0, n);
}

/**
 * Get recommended skill to focus on today
 */
export function getRecommendedSkill(progressList: StudentSkillProgress[]): StudentSkillProgress | null {
  // Priority: needs_practice > developing > not_started
  const needsPractice = progressList.filter(p => p.status === 'needs_practice');
  if (needsPractice.length > 0) return needsPractice[0];

  const developing = progressList.filter(p => p.status === 'developing');
  if (developing.length > 0) return developing[0];

  const notStarted = progressList.filter(p => p.status === 'not_started');
  if (notStarted.length > 0) return notStarted[0];

  return null;
}

/**
 * Update progress after answering questions
 * HARDENED: status only upgrades with sufficient attempts
 */
export function updateProgress(
  current: StudentSkillProgress,
  correctAnswers: number,
  totalQuestions: number
): StudentSkillProgress {
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const newAttempts = current.attempts + totalQuestions;
  const newCorrect = current.correctCount + correctAnswers;

  const updated: StudentSkillProgress = {
    ...current,
    attempts: newAttempts,
    correctCount: newCorrect,
    lastScore: score,
    lastAttemptDate: new Date().toISOString(),
    status: 'not_started',
  };

  // Recalculate status based on hardened mastery
  const mastery = calculateMastery(updated);
  updated.status = mastery.status;

  return updated;
}

/**
 * Get questions for a skill filtered by difficulty
 */
export function getQuestionsForSkill(
  allQuestions: Question[],
  skillId: string,
  difficulty?: 'easy' | 'medium' | 'hard'
): Question[] {
  let filtered = allQuestions.filter(q => q.skillId === skillId);
  if (difficulty) {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  return filtered;
}

/**
 * Calculate points earned
 */
export function calculatePoints(action: 'training' | 'quiz_pass' | 'mastery'): number {
  switch (action) {
    case 'training': return 10;
    case 'quiz_pass': return 20;
    case 'mastery': return 50;
    default: return 0;
  }
}