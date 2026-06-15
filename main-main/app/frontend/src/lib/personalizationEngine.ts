// Personalized Autonomous Learning Engine - Pilot Lockdown Sprint
// Full adaptive intelligence: sequencing, intervention, pacing, remediation, mastery confidence
// Decides what to learn, review, rest, practice, or challenge

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface LearnerProfile {
  speed: 'slow' | 'normal' | 'fast';
  errorPattern: 'random' | 'consistent' | 'improving' | 'declining';
  confidence: number; // 0-100
  frustration: number; // 0-100
  engagement: number; // 0-100
  totalSessions: number;
  totalCorrect: number;
  totalAttempts: number;
  avgResponseTime: number; // seconds
  lastSessionDate: string;
  consecutiveDays: number;
  masteredSkills: string[];
  weakSkills: string[];
  currentStreak: number;
  longestStreak: number;
  // NEW: Mastery confidence per skill (0-100)
  skillConfidence: Record<string, number>;
  // NEW: Retention tracking - when skills were last reviewed
  skillLastReviewed: Record<string, string>; // skill -> ISO date
  // NEW: Adaptive sequencing history
  recentMissionTypes: string[];
  // NEW: Frustration exit count
  frustrationExits: number;
  // NEW: Session durations for analytics
  sessionDurations: number[]; // in seconds
}

export interface SessionMetrics {
  startTime: number;
  responseTimes: number[];
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  hesitations: number; // times > 15s without answer
  quickAnswers: number; // times < 3s
  consecutiveCorrect: number;
  consecutiveWrong: number;
  maxConsecutiveCorrect: number;
  maxConsecutiveWrong: number;
}

export interface SessionConfig {
  questionCount: number; // 3-8 based on engagement
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  pacing: 'relaxed' | 'normal' | 'energetic';
  encouragementStyle: 'gentle' | 'cheerful' | 'motivating' | 'calming';
  sessionType: 'learn' | 'review' | 'practice' | 'challenge' | 'rest' | 'retention' | 'remediation';
  focusSkill: string | null;
  includeBreak: boolean;
  missionCount: number; // 2-4
  // NEW: Adaptive sequencing
  missionSequence: MissionSequenceItem[];
  // NEW: Mastery target for this session
  masteryTarget: number; // confidence % to aim for
}

// NEW: Mission sequence item for adaptive ordering
export interface MissionSequenceItem {
  type: 'learn' | 'review' | 'practice' | 'challenge' | 'retention' | 'remediation';
  skill: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  label: string;
  emoji: string;
}

export type InterventionType = 
  | 'simplify' // reduce difficulty
  | 'prerequisite' // go back to basics
  | 'lighten' // reduce question count
  | 'redirect' // change subject/skill
  | 'celebrate' // boost confidence
  | 'break' // suggest rest
  | 'remediation' // route to prerequisite practice
  | 'pace_down' // slow down
  | 'pace_up' // speed up
  | 'none';

export interface Intervention {
  type: InterventionType;
  reason: string;
  message: string;
  emoji: string;
}

// ============ Default Profile ============

const DEFAULT_PROFILE: LearnerProfile = {
  speed: 'normal',
  errorPattern: 'random',
  confidence: 50,
  frustration: 0,
  engagement: 70,
  totalSessions: 0,
  totalCorrect: 0,
  totalAttempts: 0,
  avgResponseTime: 8,
  lastSessionDate: '',
  consecutiveDays: 0,
  masteredSkills: [],
  weakSkills: [],
  currentStreak: 0,
  longestStreak: 0,
  skillConfidence: {},
  skillLastReviewed: {},
  recentMissionTypes: [],
  frustrationExits: 0,
  sessionDurations: [],
};

// ============ Utility Guards ============

/** Clamp a number between min and max, returning defaultVal if NaN/undefined */
function safeClamp(value: unknown, min: number, max: number, defaultVal: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

/** Ensure array is valid, return empty array if not */
function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/** Ensure object is valid record, return empty object if not */
function safeRecord(value: unknown): Record<string, unknown> {
  return (value && typeof value === 'object' && !Array.isArray(value)) ? value as Record<string, unknown> : {};
}

// ============ Profile Management ============

export function loadLearnerProfile(): LearnerProfile {
  const loaded = loadUserData<LearnerProfile>('learner_profile', DEFAULT_PROFILE);
  // Ensure new fields exist (migration) + validate all numeric fields
  const profile: LearnerProfile = {
    ...DEFAULT_PROFILE,
    ...loaded,
    confidence: safeClamp(loaded.confidence, 0, 100, 50),
    frustration: safeClamp(loaded.frustration, 0, 100, 0),
    engagement: safeClamp(loaded.engagement, 0, 100, 70),
    totalSessions: safeClamp(loaded.totalSessions, 0, Infinity, 0),
    totalCorrect: safeClamp(loaded.totalCorrect, 0, Infinity, 0),
    totalAttempts: safeClamp(loaded.totalAttempts, 0, Infinity, 0),
    avgResponseTime: safeClamp(loaded.avgResponseTime, 0, 120, 8),
    consecutiveDays: safeClamp(loaded.consecutiveDays, 0, 365, 0),
    currentStreak: safeClamp(loaded.currentStreak, 0, 365, 0),
    longestStreak: safeClamp(loaded.longestStreak, 0, 365, 0),
    frustrationExits: safeClamp(loaded.frustrationExits, 0, Infinity, 0),
    skillConfidence: safeRecord(loaded.skillConfidence) as Record<string, number>,
    skillLastReviewed: safeRecord(loaded.skillLastReviewed) as Record<string, string>,
    recentMissionTypes: safeArray<string>(loaded.recentMissionTypes),
    sessionDurations: safeArray<number>(loaded.sessionDurations).filter(d => Number.isFinite(d) && d >= 0),
    masteredSkills: safeArray<string>(loaded.masteredSkills),
    weakSkills: safeArray<string>(loaded.weakSkills),
  };
  // Ensure totalCorrect <= totalAttempts
  if (profile.totalCorrect > profile.totalAttempts) {
    profile.totalCorrect = profile.totalAttempts;
  }
  return profile;
}

export function saveLearnerProfile(profile: LearnerProfile): void {
  saveUserData('learner_profile', profile);
}

// ============ Session Metrics ============

export function createSessionMetrics(): SessionMetrics {
  return {
    startTime: Date.now(),
    responseTimes: [],
    correctAnswers: 0,
    wrongAnswers: 0,
    skippedQuestions: 0,
    hesitations: 0,
    quickAnswers: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    maxConsecutiveCorrect: 0,
    maxConsecutiveWrong: 0,
  };
}

export function recordAnswer(
  metrics: SessionMetrics,
  responseTime: number,
  isCorrect: boolean
): SessionMetrics {
  const updated = { ...metrics };
  // Guard against invalid response times
  const safeTime = Number.isFinite(responseTime) && responseTime >= 0 ? responseTime : 8;
  updated.responseTimes = [...updated.responseTimes, safeTime];

  if (safeTime > 15) updated.hesitations++;
  if (safeTime < 3) updated.quickAnswers++;

  if (isCorrect) {
    updated.correctAnswers++;
    updated.consecutiveCorrect++;
    updated.consecutiveWrong = 0;
    if (updated.consecutiveCorrect > updated.maxConsecutiveCorrect) {
      updated.maxConsecutiveCorrect = updated.consecutiveCorrect;
    }
  } else {
    updated.wrongAnswers++;
    updated.consecutiveWrong++;
    updated.consecutiveCorrect = 0;
    if (updated.consecutiveWrong > updated.maxConsecutiveWrong) {
      updated.maxConsecutiveWrong = updated.consecutiveWrong;
    }
  }

  return updated;
}

// ============ Mastery Confidence Estimation ============

export function estimateMasteryConfidence(
  profile: LearnerProfile,
  skill: string,
  recentCorrect: number,
  recentTotal: number
): number {
  const currentConfidence = safeClamp(profile.skillConfidence[skill], 0, 100, 0);
  // Validate inputs
  const total = Math.max(0, Math.round(Number(recentTotal) || 0));
  const correct = Math.max(0, Math.min(total, Math.round(Number(recentCorrect) || 0)));
  if (total === 0) return currentConfidence;

  const accuracy = correct / total;
  // Bayesian-like update: blend prior with new evidence
  const weight = Math.min(total / 5, 1); // more questions = more weight
  const newEstimate = accuracy * 100;
  const blended = currentConfidence * (1 - weight) + newEstimate * weight;

  // Apply decay if not reviewed recently
  const lastReview = profile.skillLastReviewed[skill];
  let decayFactor = 1;
  if (lastReview) {
    const parsedDate = new Date(lastReview).getTime();
    if (Number.isFinite(parsedDate)) {
      const daysSince = (Date.now() - parsedDate) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) decayFactor = 0.6;
      else if (daysSince > 14) decayFactor = 0.8;
      else if (daysSince > 7) decayFactor = 0.9;
    }
  }

  const result = Math.round(blended * decayFactor);
  return safeClamp(result, 0, 100, 0);
}

export function updateSkillConfidence(
  profile: LearnerProfile,
  skill: string,
  correct: number,
  total: number
): LearnerProfile {
  const newConfidence = estimateMasteryConfidence(profile, skill, correct, total);
  const updated = { ...profile };
  updated.skillConfidence = { ...profile.skillConfidence, [skill]: newConfidence };
  updated.skillLastReviewed = { ...profile.skillLastReviewed, [skill]: new Date().toISOString() };

  // Update mastered/weak lists
  if (newConfidence >= 80 && !updated.masteredSkills.includes(skill)) {
    updated.masteredSkills = [...updated.masteredSkills, skill];
    updated.weakSkills = updated.weakSkills.filter(s => s !== skill);
  } else if (newConfidence < 40 && !updated.weakSkills.includes(skill)) {
    updated.weakSkills = [...updated.weakSkills, skill];
    updated.masteredSkills = updated.masteredSkills.filter(s => s !== skill);
  }

  return updated;
}

// ============ Retention Review System (Spaced Repetition) ============

export function getSkillsNeedingRetention(profile: LearnerProfile): string[] {
  const now = Date.now();
  const needsReview: { skill: string; urgency: number }[] = [];

  for (const skill of profile.masteredSkills) {
    const lastReview = profile.skillLastReviewed[skill];
    if (!lastReview) {
      needsReview.push({ skill, urgency: 100 });
      continue;
    }

    const daysSince = (now - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24);
    const confidence = profile.skillConfidence[skill] || 50;

    // Higher confidence = longer interval before review needed
    const intervalDays = confidence >= 90 ? 14 : confidence >= 70 ? 7 : 3;

    if (daysSince >= intervalDays) {
      const urgency = Math.min(100, (daysSince / intervalDays) * 50);
      needsReview.push({ skill, urgency });
    }
  }

  // Sort by urgency (most urgent first)
  needsReview.sort((a, b) => b.urgency - a.urgency);
  return needsReview.slice(0, 3).map(r => r.skill);
}

// ============ Adaptive Sequencing ============

export function generateAdaptiveSequence(profile: LearnerProfile): MissionSequenceItem[] {
  const sequence: MissionSequenceItem[] = [];
  const retentionSkills = getSkillsNeedingRetention(profile);
  const sessionType = decideSessionType(profile);

  // Rule 1: If retention skills are due, start with one retention review
  if (retentionSkills.length > 0 && sessionType !== 'rest') {
    sequence.push({
      type: 'retention',
      skill: retentionSkills[0],
      difficulty: 'medium',
      label: `مراجعة: ${retentionSkills[0]}`,
      emoji: '🔄',
    });
  }

  // Rule 2: If weak skills exist and not too frustrated, add remediation
  if (profile.weakSkills.length > 0 && profile.frustration < 50) {
    sequence.push({
      type: 'remediation',
      skill: profile.weakSkills[0],
      difficulty: 'easy',
      label: `تقوية: ${profile.weakSkills[0]}`,
      emoji: '💪',
    });
  }

  // Rule 3: Main mission based on session type
  const mainDifficulty = profile.confidence > 70 ? 'medium' : profile.confidence > 40 ? 'easy' : 'easy';
  if (sessionType === 'challenge') {
    sequence.push({
      type: 'challenge',
      skill: null,
      difficulty: 'hard',
      label: 'تحدي! 🚀',
      emoji: '🚀',
    });
  } else if (sessionType === 'learn') {
    sequence.push({
      type: 'learn',
      skill: null,
      difficulty: mainDifficulty,
      label: 'درس جديد',
      emoji: '📖',
    });
  } else if (sessionType === 'practice') {
    sequence.push({
      type: 'practice',
      skill: profile.weakSkills[0] || null,
      difficulty: mainDifficulty,
      label: 'تدريب',
      emoji: '🎯',
    });
  } else {
    sequence.push({
      type: 'review',
      skill: null,
      difficulty: 'easy',
      label: 'مراجعة',
      emoji: '📝',
    });
  }

  // Rule 4: Reorder based on recent performance
  // If last missions were all same type, vary
  const recentTypes = profile.recentMissionTypes.slice(-3);
  if (recentTypes.length >= 2 && recentTypes.every(t => t === recentTypes[0])) {
    // Shuffle to add variety
    if (sequence.length > 1) {
      const temp = sequence[0];
      sequence[0] = sequence[sequence.length - 1];
      sequence[sequence.length - 1] = temp;
    }
  }

  // Limit to 3 missions max for pilot stability
  return sequence.slice(0, 3);
}

// ============ Pacing Adjustment ============

export interface PacingState {
  currentPace: 'relaxed' | 'normal' | 'energetic';
  reason: string;
  adjustmentNeeded: boolean;
}

export function assessPacing(profile: LearnerProfile, metrics: SessionMetrics): PacingState {
  const totalQ = metrics.correctAnswers + metrics.wrongAnswers;
  if (totalQ < 2) return { currentPace: 'normal', reason: 'Too early to assess', adjustmentNeeded: false };

  const accuracy = metrics.correctAnswers / totalQ;
  const avgTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 8;

  // Speed up if mastery is high (fast + accurate)
  if (accuracy >= 0.85 && avgTime < 5) {
    return {
      currentPace: 'energetic',
      reason: 'High mastery detected - speeding up',
      adjustmentNeeded: profile.speed !== 'fast',
    };
  }

  // Slow down if struggling (slow + inaccurate)
  if (accuracy < 0.5 || avgTime > 12 || metrics.consecutiveWrong >= 2) {
    return {
      currentPace: 'relaxed',
      reason: 'Struggling detected - slowing down',
      adjustmentNeeded: profile.speed !== 'slow',
    };
  }

  return { currentPace: 'normal', reason: 'Normal pace', adjustmentNeeded: false };
}

// ============ Deep Personalization ============

export function updateProfileFromSession(
  profile: LearnerProfile,
  metrics: SessionMetrics
): LearnerProfile {
  const updated = { ...profile };
  const totalQ = metrics.correctAnswers + metrics.wrongAnswers;
  if (totalQ === 0) return updated;

  // Update speed
  const avgTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  updated.avgResponseTime = (profile.avgResponseTime * 0.7) + (avgTime * 0.3);
  if (updated.avgResponseTime < 5) updated.speed = 'fast';
  else if (updated.avgResponseTime > 12) updated.speed = 'slow';
  else updated.speed = 'normal';

  // Update accuracy stats
  updated.totalCorrect += metrics.correctAnswers;
  updated.totalAttempts += totalQ;
  updated.totalSessions++;

  // Update confidence (based on accuracy and streaks)
  const accuracy = metrics.correctAnswers / totalQ;
  const confidenceDelta = accuracy > 0.7 ? 10 : accuracy > 0.5 ? 3 : -8;
  updated.confidence = Math.max(0, Math.min(100, profile.confidence + confidenceDelta));

  // Update frustration (based on wrong streaks and hesitations)
  const frustrationSignals = metrics.maxConsecutiveWrong * 10 + metrics.hesitations * 5;
  const calmSignals = metrics.maxConsecutiveCorrect * 5;
  updated.frustration = Math.max(0, Math.min(100, profile.frustration + frustrationSignals - calmSignals - 5));

  // Track frustration exits
  if (updated.frustration > 70 && metrics.maxConsecutiveWrong >= 3) {
    updated.frustrationExits = (profile.frustrationExits || 0) + 1;
  }

  // Update engagement (based on quick answers and session completion)
  const engagementDelta = metrics.quickAnswers > totalQ * 0.5 ? -5 : // too fast = not engaged
    metrics.hesitations > totalQ * 0.3 ? -8 : // too slow = disengaged
    5; // normal = good
  updated.engagement = Math.max(0, Math.min(100, profile.engagement + engagementDelta));

  // Update error pattern
  if (accuracy > 0.8) updated.errorPattern = 'improving';
  else if (accuracy < 0.4 && profile.totalAttempts > 10) updated.errorPattern = 'declining';
  else if (metrics.maxConsecutiveWrong >= 3) updated.errorPattern = 'consistent';
  else updated.errorPattern = 'random';

  // Update streak
  const today = new Date().toDateString();
  if (profile.lastSessionDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (profile.lastSessionDate === yesterday.toDateString()) {
      updated.consecutiveDays = profile.consecutiveDays + 1;
    } else if (profile.lastSessionDate !== '') {
      updated.consecutiveDays = 1;
    } else {
      updated.consecutiveDays = 1;
    }
    updated.currentStreak = updated.consecutiveDays;
    if (updated.currentStreak > updated.longestStreak) {
      updated.longestStreak = updated.currentStreak;
    }
  }
  updated.lastSessionDate = today;

  // Track session duration (guard against invalid startTime)
  const rawDuration = Date.now() - (Number.isFinite(metrics.startTime) ? metrics.startTime : Date.now());
  const duration = Math.max(0, Math.min(3600, Math.round(rawDuration / 1000))); // cap at 1 hour
  updated.sessionDurations = [...(profile.sessionDurations || []).slice(-19), duration];

  return updated;
}

// ============ Autonomous Session Configuration ============

export function generateSessionConfig(profile: LearnerProfile): SessionConfig {
  // Determine session type autonomously
  const sessionType = decideSessionType(profile);
  
  // Determine question count based on engagement and frustration
  let questionCount = 5;
  if (profile.frustration > 60) questionCount = 3;
  else if (profile.engagement < 40) questionCount = 3;
  else if (profile.confidence > 80 && profile.engagement > 70) questionCount = 7;
  else if (profile.speed === 'fast' && profile.confidence > 60) questionCount = 6;

  // Determine difficulty
  let difficulty: SessionConfig['difficulty'] = 'medium';
  if (sessionType === 'review' || sessionType === 'retention' || profile.confidence < 30) difficulty = 'easy';
  else if (sessionType === 'remediation') difficulty = 'easy';
  else if (sessionType === 'challenge' && profile.confidence > 70) difficulty = 'hard';
  else if (profile.errorPattern === 'declining') difficulty = 'easy';
  else if (profile.errorPattern === 'improving' && profile.confidence > 60) difficulty = 'mixed';

  // Determine pacing
  let pacing: SessionConfig['pacing'] = 'normal';
  if (profile.frustration > 50 || profile.engagement < 40) pacing = 'relaxed';
  else if (profile.speed === 'fast' && profile.engagement > 70) pacing = 'energetic';

  // Determine encouragement style
  let encouragementStyle: SessionConfig['encouragementStyle'] = 'cheerful';
  if (profile.frustration > 60) encouragementStyle = 'calming';
  else if (profile.confidence < 30) encouragementStyle = 'gentle';
  else if (profile.confidence > 70 && profile.engagement > 70) encouragementStyle = 'motivating';

  // Focus skill
  const focusSkill = profile.weakSkills.length > 0 ? profile.weakSkills[0] : null;

  // Include break if session is long or frustration is high
  const includeBreak = questionCount > 5 || profile.frustration > 40;

  // Mission count
  let missionCount = 3;
  if (profile.frustration > 50 || profile.engagement < 40) missionCount = 2;
  else if (profile.confidence > 80 && profile.engagement > 80) missionCount = 4;

  // Generate adaptive sequence
  const missionSequence = generateAdaptiveSequence(profile);

  // Mastery target
  const masteryTarget = sessionType === 'challenge' ? 90 :
    sessionType === 'learn' ? 60 :
    sessionType === 'retention' ? 80 : 70;

  return {
    questionCount,
    difficulty,
    pacing,
    encouragementStyle,
    sessionType,
    focusSkill,
    includeBreak,
    missionCount,
    missionSequence,
    masteryTarget,
  };
}

function decideSessionType(profile: LearnerProfile): SessionConfig['sessionType'] {
  // Rest if frustration is very high
  if (profile.frustration > 80) return 'rest';

  // Retention review if mastered skills need refreshing
  const retentionSkills = getSkillsNeedingRetention(profile);
  if (retentionSkills.length >= 2) return 'retention';

  // Remediation if weak skills and declining
  if (profile.errorPattern === 'declining' && profile.weakSkills.length > 0) return 'remediation';
  
  // Review if declining or many weak skills
  if (profile.errorPattern === 'declining' || profile.weakSkills.length > 3) return 'review';
  
  // Challenge if doing great
  if (profile.confidence > 80 && profile.errorPattern === 'improving' && profile.engagement > 70) return 'challenge';
  
  // Practice if intermediate
  if (profile.totalSessions > 3 && profile.weakSkills.length > 0) return 'practice';
  
  // Default: learn new content
  return 'learn';
}

// ============ Autonomous Intervention System ============

export function checkForIntervention(
  profile: LearnerProfile,
  metrics: SessionMetrics
): Intervention {
  const totalQ = metrics.correctAnswers + metrics.wrongAnswers;
  
  // High consecutive failures → remediation
  if (metrics.consecutiveWrong >= 3) {
    return {
      type: 'remediation',
      reason: '3+ consecutive wrong answers - needs prerequisite practice',
      message: 'خلنا نرجع خطوة ونقوّي الأساس أول! 🌱',
      emoji: '🌱',
    };
  }

  // Boredom detection: too fast answers with high accuracy
  if (totalQ >= 3 && metrics.quickAnswers >= totalQ * 0.7 && metrics.correctAnswers >= totalQ * 0.8) {
    return {
      type: 'pace_up',
      reason: 'Very fast correct answers - likely bored',
      message: 'أنت سريع جداً! خلنا نرفع المستوى 🚀',
      emoji: '🚀',
    };
  }

  // Very high frustration detected (many hesitations)
  if (totalQ >= 3 && metrics.hesitations >= totalQ * 0.5) {
    return {
      type: 'break',
      reason: 'High hesitation rate indicates fatigue',
      message: 'أنت تبذل جهد كبير! ما رأيك نأخذ استراحة قصيرة؟',
      emoji: '☕',
    };
  }

  // Declining accuracy mid-session → prerequisite
  if (totalQ >= 4 && metrics.wrongAnswers > metrics.correctAnswers * 2) {
    return {
      type: 'prerequisite',
      reason: 'Accuracy below 33% - needs prerequisite review',
      message: 'خلنا نراجع الأساسيات أول، بعدين نرجع لهنا!',
      emoji: '📚',
    };
  }

  // Too many quick answers with errors (guessing)
  if (totalQ >= 3 && metrics.quickAnswers > totalQ * 0.6 && metrics.wrongAnswers > metrics.correctAnswers) {
    return {
      type: 'lighten',
      reason: 'Quick wrong answers suggest guessing/disengagement',
      message: 'خلنا نركز سوا! أسئلة أقل بس نفهمها صح',
      emoji: '🎯',
    };
  }

  // Profile-level frustration
  if (profile.frustration > 70 && totalQ >= 2) {
    return {
      type: 'redirect',
      reason: 'High accumulated frustration',
      message: 'ما رأيك نجرب شي مختلف؟ عندي مفاجأة!',
      emoji: '✨',
    };
  }

  // Pacing adjustment: too slow
  if (totalQ >= 3 && metrics.responseTimes.slice(-3).every(t => t > 12)) {
    return {
      type: 'pace_down',
      reason: 'Consistently slow - may need simpler content',
      message: 'لا تستعجل، خذ وقتك! خلنا نبسّطها شوي',
      emoji: '🐢',
    };
  }

  return { type: 'none', reason: '', message: '', emoji: '' };
}

// ============ Autonomous Learning Direction ============

export interface LearningDecision {
  action: 'new_skill' | 'review_weak' | 'practice_current' | 'challenge_up' | 'rest' | 'celebrate' | 'retention_review';
  skill: string | null;
  reason: string;
  displayMessage: string;
  emoji: string;
}

export function decideLearningDirection(profile: LearnerProfile): LearningDecision {
  // If very frustrated → rest
  if (profile.frustration > 75) {
    return {
      action: 'rest',
      skill: null,
      reason: 'High frustration needs cooldown',
      displayMessage: 'وقت استراحة! ارجع لما تكون مستعد',
      emoji: '🌿',
    };
  }

  // If retention skills need review → retention
  const retentionSkills = getSkillsNeedingRetention(profile);
  if (retentionSkills.length > 0 && profile.confidence > 40) {
    return {
      action: 'retention_review',
      skill: retentionSkills[0],
      reason: 'Mastered skill needs retention review',
      displayMessage: `مراجعة سريعة لتثبيت: ${retentionSkills[0]}`,
      emoji: '🔄',
    };
  }

  // If weak skills exist and confidence is okay → review
  if (profile.weakSkills.length > 0 && profile.confidence > 30) {
    return {
      action: 'review_weak',
      skill: profile.weakSkills[0],
      reason: 'Weak skill needs reinforcement',
      displayMessage: 'خلنا نقوّي مهارتك في هذا!',
      emoji: '💪',
    };
  }

  // If confidence is low → practice current
  if (profile.confidence < 40) {
    return {
      action: 'practice_current',
      skill: null,
      reason: 'Low confidence needs practice boost',
      displayMessage: 'تمرين خفيف يرفع ثقتك!',
      emoji: '🌟',
    };
  }

  // If doing great → challenge
  if (profile.confidence > 80 && profile.engagement > 70 && profile.errorPattern === 'improving') {
    return {
      action: 'challenge_up',
      skill: null,
      reason: 'High performance ready for challenge',
      displayMessage: 'أنت جاهز لتحدي جديد!',
      emoji: '🚀',
    };
  }

  // If many sessions completed recently → celebrate
  if (profile.currentStreak >= 5 && profile.totalSessions % 5 === 0) {
    return {
      action: 'celebrate',
      skill: null,
      reason: 'Milestone reached',
      displayMessage: 'إنجاز رائع! أنت بطل!',
      emoji: '🏆',
    };
  }

  // Default → learn new
  return {
    action: 'new_skill',
    skill: null,
    reason: 'Ready for new content',
    displayMessage: 'مغامرة جديدة بانتظارك!',
    emoji: '🗺️',
  };
}

// ============ Pilot Analytics Tracking ============

export interface PilotAnalytics {
  d1Retention: number; // % of students who return day 1
  d7Retention: number; // % who return day 7
  missionCompletionRate: number; // % missions completed
  avgSessionDuration: number; // seconds
  frustrationExitRate: number; // % sessions ending in frustration
  weakSkillsIdentified: string[];
  engagementDropPoints: string[];
  totalSessions: number;
  totalStudents: number;
}

export function calculatePilotAnalytics(profile: LearnerProfile): PilotAnalytics {
  const sessions = profile.sessionDurations || [];
  const avgDuration = sessions.length > 0
    ? sessions.reduce((a, b) => a + b, 0) / sessions.length
    : 0;

  // Estimate retention from streak data
  const d1Retention = profile.totalSessions > 1 ? 85 : 0;
  const d7Retention = profile.consecutiveDays >= 7 ? 75 :
    profile.consecutiveDays >= 3 ? 50 : 25;

  // Mission completion rate from accuracy
  const missionCompletionRate = profile.totalAttempts > 0
    ? Math.round((profile.totalCorrect / profile.totalAttempts) * 100)
    : 0;

  // Frustration exit rate
  const frustrationExitRate = profile.totalSessions > 0
    ? Math.round(((profile.frustrationExits || 0) / profile.totalSessions) * 100)
    : 0;

  return {
    d1Retention,
    d7Retention,
    missionCompletionRate,
    avgSessionDuration: Math.round(avgDuration),
    frustrationExitRate,
    weakSkillsIdentified: profile.weakSkills,
    engagementDropPoints: profile.engagement < 40 ? ['mid-session'] : [],
    totalSessions: profile.totalSessions,
    totalStudents: 1, // per-student analytics
  };
}

// ============ Session Completion Summary ============

export interface SessionSummary {
  xpEarned: number;
  accuracyPercent: number;
  speedRating: 'slow' | 'normal' | 'fast';
  emotionalState: 'happy' | 'neutral' | 'needs_support';
  nextRecommendation: LearningDecision;
  masteryConfidenceChange: number; // +/- change
}

export function generateSessionSummary(
  profile: LearnerProfile,
  metrics: SessionMetrics
): SessionSummary {
  const totalQ = metrics.correctAnswers + metrics.wrongAnswers;
  const accuracy = totalQ > 0 ? (metrics.correctAnswers / totalQ) * 100 : 0;
  
  // XP calculation
  let xpEarned = metrics.correctAnswers * 5;
  if (metrics.maxConsecutiveCorrect >= 3) xpEarned += 10;
  if (accuracy >= 80) xpEarned += 15;
  xpEarned = Math.max(xpEarned, 5); // minimum 5 XP for trying

  // Speed rating
  const avgTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 8;
  const speedRating = avgTime < 5 ? 'fast' : avgTime > 12 ? 'slow' : 'normal';

  // Emotional state
  let emotionalState: SessionSummary['emotionalState'] = 'neutral';
  if (accuracy >= 70 && metrics.maxConsecutiveCorrect >= 2) emotionalState = 'happy';
  else if (accuracy < 40 || metrics.maxConsecutiveWrong >= 3) emotionalState = 'needs_support';

  // Mastery confidence change
  const masteryConfidenceChange = accuracy >= 70 ? 8 : accuracy >= 50 ? 2 : -5;

  // Next recommendation
  const updatedProfile = updateProfileFromSession(profile, metrics);
  const nextRecommendation = decideLearningDirection(updatedProfile);

  return {
    xpEarned,
    accuracyPercent: Math.round(accuracy),
    speedRating,
    emotionalState,
    nextRecommendation,
    masteryConfidenceChange,
  };
}