// Phase 5.5 Decision Engine - Difficulty Calibration Engine
// Personalized difficulty calculation based on actual performance
// Difficulty ladder with smooth transitions

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultyProfile {
  skillId: string;
  currentLevel: DifficultyLevel;
  numericDifficulty: number; // 0-100 continuous scale
  calibrationHistory: CalibrationPoint[];
  personalizedThresholds: DifficultyThresholds;
  stabilityScore: number; // 0-100, how stable the calibration is
  lastCalibrated: string;
}

export interface CalibrationPoint {
  timestamp: string;
  difficulty: number;
  performance: number; // 0-100 accuracy at that difficulty
  responseTimeMs: number;
  isCorrect: boolean;
}

export interface DifficultyThresholds {
  easyMax: number;      // Below this = easy (personalized)
  mediumMax: number;    // Below this = medium, above = hard
  targetZone: [number, number]; // Optimal difficulty range (ZPD)
}

export interface CalibrationResult {
  level: DifficultyLevel;
  numericDifficulty: number;
  confidence: number;
  reasoning: string;
  shouldAdjust: boolean;
  adjustDirection: 'up' | 'down' | 'none';
}

export interface DifficultyLadder {
  rungs: DifficultyRung[];
  currentRung: number;
  highestReached: number;
  totalClimbs: number;
  totalFalls: number;
}

export interface DifficultyRung {
  level: number; // 1-10
  label: string;
  difficultyRange: [number, number];
  requiredAccuracy: number; // Accuracy needed to advance
  requiredConsecutive: number; // Consecutive correct to advance
}

// ============ Configuration ============

const DEFAULT_THRESHOLDS: DifficultyThresholds = {
  easyMax: 35,
  mediumMax: 65,
  targetZone: [40, 70],
};

const LADDER_RUNGS: DifficultyRung[] = [
  { level: 1, label: 'مبتدئ', difficultyRange: [0, 15], requiredAccuracy: 90, requiredConsecutive: 3 },
  { level: 2, label: 'أساسي', difficultyRange: [10, 25], requiredAccuracy: 85, requiredConsecutive: 3 },
  { level: 3, label: 'متقدم مبتدئ', difficultyRange: [20, 35], requiredAccuracy: 80, requiredConsecutive: 3 },
  { level: 4, label: 'متوسط', difficultyRange: [30, 50], requiredAccuracy: 75, requiredConsecutive: 4 },
  { level: 5, label: 'متوسط متقدم', difficultyRange: [40, 60], requiredAccuracy: 70, requiredConsecutive: 4 },
  { level: 6, label: 'جيد', difficultyRange: [50, 70], requiredAccuracy: 70, requiredConsecutive: 4 },
  { level: 7, label: 'جيد جداً', difficultyRange: [60, 80], requiredAccuracy: 65, requiredConsecutive: 5 },
  { level: 8, label: 'ممتاز', difficultyRange: [70, 85], requiredAccuracy: 65, requiredConsecutive: 5 },
  { level: 9, label: 'متفوق', difficultyRange: [80, 92], requiredAccuracy: 60, requiredConsecutive: 5 },
  { level: 10, label: 'خبير', difficultyRange: [88, 100], requiredAccuracy: 60, requiredConsecutive: 6 },
];

// ============ Core Calibration ============

/**
 * Calibrate difficulty based on real performance data.
 * Called by the Decision Engine.
 */
export function calibrateDifficulty(
  skillId: string,
  recentPerformance: number,
  consecutiveCorrect: number,
  consecutiveWrong: number
): CalibrationResult {
  const profile = loadDifficultyProfile(skillId);
  const thresholds = profile.personalizedThresholds;

  let numericDifficulty = profile.numericDifficulty;
  let shouldAdjust = false;
  let adjustDirection: 'up' | 'down' | 'none' = 'none';
  let reasoning = '';

  // Upward adjustment: student is performing well
  if (consecutiveCorrect >= 3 && recentPerformance > 75) {
    const increment = calculateIncrement(consecutiveCorrect, recentPerformance, profile.stabilityScore);
    numericDifficulty = Math.min(100, numericDifficulty + increment);
    shouldAdjust = true;
    adjustDirection = 'up';
    reasoning = `أداء ممتاز (${recentPerformance}%) مع ${consecutiveCorrect} إجابات صحيحة متتالية`;
  }
  // Downward adjustment: student is struggling
  else if (consecutiveWrong >= 2 || recentPerformance < 40) {
    const decrement = calculateDecrement(consecutiveWrong, recentPerformance);
    numericDifficulty = Math.max(5, numericDifficulty - decrement);
    shouldAdjust = true;
    adjustDirection = 'down';
    reasoning = `صعوبة (${recentPerformance}%) مع ${consecutiveWrong} أخطاء متتالية`;
  }
  // In target zone
  else {
    reasoning = 'الأداء في المنطقة المثالية';
  }

  // Determine level from numeric difficulty
  const level: DifficultyLevel =
    numericDifficulty <= thresholds.easyMax ? 'easy' :
    numericDifficulty <= thresholds.mediumMax ? 'medium' : 'hard';

  // Calculate confidence based on calibration history
  const confidence = Math.min(100, profile.calibrationHistory.length * 10 + profile.stabilityScore);

  // Save updated profile
  const updatedProfile: DifficultyProfile = {
    ...profile,
    currentLevel: level,
    numericDifficulty,
    lastCalibrated: new Date().toISOString(),
    calibrationHistory: [
      ...profile.calibrationHistory.slice(-20),
      {
        timestamp: new Date().toISOString(),
        difficulty: numericDifficulty,
        performance: recentPerformance,
        responseTimeMs: 0,
        isCorrect: consecutiveWrong === 0,
      },
    ],
  };

  // Update stability score
  updatedProfile.stabilityScore = calculateStability(updatedProfile.calibrationHistory);

  // Personalize thresholds based on history
  updatedProfile.personalizedThresholds = personalizeThresholds(updatedProfile.calibrationHistory);

  saveDifficultyProfile(skillId, updatedProfile);

  return { level, numericDifficulty, confidence, reasoning, shouldAdjust, adjustDirection };
}

function calculateIncrement(consecutive: number, performance: number, stability: number): number {
  // Larger jumps when very confident, smaller when calibrating
  const base = 5;
  const consecutiveBonus = Math.min(10, consecutive * 2);
  const performanceBonus = (performance - 75) / 10;
  const stabilityDamper = stability > 70 ? 0.7 : 1.0; // Slow down when stable

  return Math.max(2, Math.round((base + consecutiveBonus + performanceBonus) * stabilityDamper));
}

function calculateDecrement(consecutiveWrong: number, performance: number): number {
  // Faster drops to prevent frustration
  const base = 8;
  const errorBonus = Math.min(15, consecutiveWrong * 5);
  const performancePenalty = Math.max(0, (40 - performance) / 5);

  return Math.max(5, Math.round(base + errorBonus + performancePenalty));
}

function calculateStability(history: CalibrationPoint[]): number {
  if (history.length < 3) return 20;

  // Stability = low variance in recent difficulty levels
  const recent = history.slice(-10);
  const difficulties = recent.map(h => h.difficulty);
  const mean = difficulties.reduce((s, d) => s + d, 0) / difficulties.length;
  const variance = difficulties.reduce((s, d) => s + (d - mean) ** 2, 0) / difficulties.length;
  const stdDev = Math.sqrt(variance);

  // Lower std dev = more stable
  return Math.max(0, Math.min(100, 100 - stdDev * 3));
}

function personalizeThresholds(history: CalibrationPoint[]): DifficultyThresholds {
  if (history.length < 5) return DEFAULT_THRESHOLDS;

  // Find the difficulty where student achieves ~70% accuracy (ZPD)
  const recentPoints = history.slice(-15);
  const successPoints = recentPoints.filter(p => p.isCorrect);
  const failPoints = recentPoints.filter(p => !p.isCorrect);

  const avgSuccessDiff = successPoints.length > 0
    ? successPoints.reduce((s, p) => s + p.difficulty, 0) / successPoints.length
    : 50;
  const avgFailDiff = failPoints.length > 0
    ? failPoints.reduce((s, p) => s + p.difficulty, 0) / failPoints.length
    : 70;

  // ZPD is between average success and average fail difficulty
  const zpdCenter = (avgSuccessDiff + avgFailDiff) / 2;

  return {
    easyMax: Math.max(15, Math.round(zpdCenter - 20)),
    mediumMax: Math.min(85, Math.round(zpdCenter + 15)),
    targetZone: [
      Math.max(20, Math.round(zpdCenter - 15)),
      Math.min(85, Math.round(zpdCenter + 15)),
    ],
  };
}

// ============ Difficulty Ladder ============

/**
 * Get the student's position on the difficulty ladder for a skill.
 */
export function getDifficultyLadder(skillId: string): DifficultyLadder {
  const stored = loadUserData<DifficultyLadder | null>(`ladder_${skillId}`, null);
  if (stored) return stored;

  return {
    rungs: LADDER_RUNGS,
    currentRung: 1,
    highestReached: 1,
    totalClimbs: 0,
    totalFalls: 0,
  };
}

/**
 * Update ladder position based on performance.
 */
export function updateLadder(
  skillId: string,
  accuracy: number,
  consecutiveCorrect: number
): { ladder: DifficultyLadder; moved: 'up' | 'down' | 'none'; newLevel: number } {
  const ladder = getDifficultyLadder(skillId);
  const currentRung = LADDER_RUNGS[ladder.currentRung - 1];

  if (!currentRung) {
    return { ladder, moved: 'none', newLevel: ladder.currentRung };
  }

  // Check if should climb
  if (accuracy >= currentRung.requiredAccuracy && consecutiveCorrect >= currentRung.requiredConsecutive) {
    if (ladder.currentRung < 10) {
      ladder.currentRung++;
      ladder.totalClimbs++;
      ladder.highestReached = Math.max(ladder.highestReached, ladder.currentRung);
      saveLadder(skillId, ladder);
      return { ladder, moved: 'up', newLevel: ladder.currentRung };
    }
  }

  // Check if should fall (poor performance)
  if (accuracy < 40 && ladder.currentRung > 1) {
    ladder.currentRung--;
    ladder.totalFalls++;
    saveLadder(skillId, ladder);
    return { ladder, moved: 'down', newLevel: ladder.currentRung };
  }

  return { ladder, moved: 'none', newLevel: ladder.currentRung };
}

// ============ Persistence ============

function loadDifficultyProfile(skillId: string): DifficultyProfile {
  const stored = loadUserData<DifficultyProfile | null>(`diffProfile_${skillId}`, null);
  if (stored) return stored;

  return {
    skillId,
    currentLevel: 'easy',
    numericDifficulty: 30,
    calibrationHistory: [],
    personalizedThresholds: DEFAULT_THRESHOLDS,
    stabilityScore: 20,
    lastCalibrated: new Date().toISOString(),
  };
}

function saveDifficultyProfile(skillId: string, profile: DifficultyProfile): void {
  saveUserData(`diffProfile_${skillId}`, profile);
}

function saveLadder(skillId: string, ladder: DifficultyLadder): void {
  saveUserData(`ladder_${skillId}`, ladder);
}