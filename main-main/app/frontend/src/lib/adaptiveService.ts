// Adaptive Service - Bridges personalizationEngine with Backend
// Pulls published content, syncs mastery/sessions, provides adaptive intelligence
import { client } from './api';
import {
  loadLearnerProfile,
  saveLearnerProfile,
  updateSkillConfidence,
  getSkillsNeedingRetention,
  generateSessionConfig,
  type LearnerProfile,
  type SessionMetrics,
  type SessionConfig,
} from './personalizationEngine';
import { updateLocalSkillMastery, syncMasteryToBackend, getLocalMastery } from './masterySyncService';
import { fetchSkills, fetchLessons, type DynamicLesson, type ContentFilter } from './contentService';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface AdaptiveState {
  profile: LearnerProfile;
  sessionConfig: SessionConfig;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  consecutiveCorrect: number;
  consecutiveWrong: number;
  fatigueLevel: number; // 0-100
  optimalSessionDuration: number; // seconds
  shouldEndSession: boolean;
  endReason: string;
  skillQueue: SkillQueueItem[];
  retentionDue: string[];
  remediationActive: boolean;
  remediationSkill: string | null;
}

export interface SkillQueueItem {
  skillId: number;
  skillName: string;
  priority: number; // higher = more urgent
  reason: 'weak' | 'retention' | 'next_in_path' | 'remediation' | 'challenge';
  difficulty: 'easy' | 'medium' | 'hard';
  attempts: number;
  mastery: number;
}

export interface SessionRecord {
  session_type: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  questions_attempted: number;
  questions_correct: number;
  skills_practiced: string;
  missions_completed: number;
  xp_earned: number;
  engagement_score: number;
}

export interface AdaptiveDifficultyResult {
  newDifficulty: 'easy' | 'medium' | 'hard';
  reason: string;
  adjusted: boolean;
}

export interface RetentionReview {
  skillId: number;
  skillName: string;
  lastReviewed: string;
  daysSince: number;
  currentConfidence: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  suggestedQuestionCount: number;
}

// ═══════════════════════════════════════════════════════
// ADAPTIVE STATE MANAGEMENT
// ═══════════════════════════════════════════════════════

export function initAdaptiveState(): AdaptiveState {
  let profile: LearnerProfile;
  let sessionConfig: SessionConfig;
  let retentionDue: string[];

  try {
    profile = loadLearnerProfile();
  } catch {
    // If profile loading fails, use defaults
    profile = loadLearnerProfile(); // loadLearnerProfile already handles defaults
  }

  try {
    sessionConfig = generateSessionConfig(profile);
  } catch {
    sessionConfig = {
      questionCount: 5,
      difficulty: 'easy',
      pacing: 'normal',
      encouragementStyle: 'cheerful',
      sessionType: 'learn',
      focusSkill: null,
      includeBreak: false,
      missionCount: 3,
      missionSequence: [],
      masteryTarget: 60,
    };
  }

  try {
    retentionDue = getSkillsNeedingRetention(profile);
  } catch {
    retentionDue = [];
  }

  const difficulty = sessionConfig.difficulty;
  const currentDifficulty: 'easy' | 'medium' | 'hard' =
    difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
      ? difficulty : 'medium';

  return {
    profile,
    sessionConfig,
    currentDifficulty,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    fatigueLevel: 0,
    optimalSessionDuration: calculateOptimalDuration(profile),
    shouldEndSession: false,
    endReason: '',
    skillQueue: [],
    retentionDue,
    remediationActive: false,
    remediationSkill: null,
  };
}

// ═══════════════════════════════════════════════════════
// ADAPTIVE DIFFICULTY ENGINE
// ═══════════════════════════════════════════════════════

/**
 * Dynamically adjust difficulty based on real-time performance
 * Rules:
 * - ↓ difficulty after 2 consecutive wrong answers
 * - ↑ difficulty after 3 consecutive correct answers
 * - Stay if mixed performance
 */
export function adjustDifficulty(state: AdaptiveState, isCorrect: boolean): AdaptiveDifficultyResult {
  const newState = { ...state };

  if (isCorrect) {
    newState.consecutiveCorrect = state.consecutiveCorrect + 1;
    newState.consecutiveWrong = 0;
  } else {
    newState.consecutiveWrong = state.consecutiveWrong + 1;
    newState.consecutiveCorrect = 0;
  }

  let newDifficulty = state.currentDifficulty;
  let reason = '';
  let adjusted = false;

  // ↓ Decrease difficulty after 2 consecutive wrong
  if (newState.consecutiveWrong >= 2) {
    if (state.currentDifficulty === 'hard') {
      newDifficulty = 'medium';
      reason = 'خطأين متتاليين - تخفيف المستوى';
      adjusted = true;
    } else if (state.currentDifficulty === 'medium') {
      newDifficulty = 'easy';
      reason = 'خطأين متتاليين - تبسيط الأسئلة';
      adjusted = true;
    }
    newState.consecutiveWrong = 0; // reset after adjustment
  }

  // ↑ Increase difficulty after 3 consecutive correct
  if (newState.consecutiveCorrect >= 3) {
    if (state.currentDifficulty === 'easy') {
      newDifficulty = 'medium';
      reason = '3 إجابات صحيحة متتالية - رفع المستوى';
      adjusted = true;
    } else if (state.currentDifficulty === 'medium') {
      newDifficulty = 'hard';
      reason = '3 إجابات صحيحة متتالية - تحدي أكبر';
      adjusted = true;
    }
    newState.consecutiveCorrect = 0; // reset after adjustment
  }

  return { newDifficulty, reason, adjusted };
}

// ═══════════════════════════════════════════════════════
// SESSION INTELLIGENCE
// ═══════════════════════════════════════════════════════

/**
 * Calculate optimal session duration based on learner profile
 */
function calculateOptimalDuration(profile: LearnerProfile): number {
  const baseDuration = 600; // 10 minutes base

  // Adjust based on historical session data
  const avgDuration = profile.sessionDurations.length > 0
    ? profile.sessionDurations.reduce((a, b) => a + b, 0) / profile.sessionDurations.length
    : baseDuration;

  // Factor in engagement and frustration
  let factor = 1;
  if (profile.engagement > 80) factor = 1.3; // engaged = longer sessions ok
  else if (profile.engagement < 40) factor = 0.7; // disengaged = shorter
  if (profile.frustration > 50) factor *= 0.8; // frustrated = shorter

  // Children shouldn't exceed 15 minutes
  const optimal = Math.round(avgDuration * factor);
  return Math.max(180, Math.min(900, optimal)); // 3-15 minutes
}

/**
 * Detect fatigue in real-time from session metrics
 */
export function detectFatigue(
  metrics: SessionMetrics,
  state: AdaptiveState
): { fatigueLevel: number; shouldBreak: boolean; message: string } {
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  const totalQ = metrics.correctAnswers + metrics.wrongAnswers;

  let fatigue = 0;

  // Time-based fatigue
  const timeRatio = elapsed / state.optimalSessionDuration;
  if (timeRatio > 0.8) fatigue += 30;
  if (timeRatio > 1.2) fatigue += 40;

  // Performance decline (compare first half vs second half of responses)
  if (metrics.responseTimes.length >= 6) {
    const mid = Math.floor(metrics.responseTimes.length / 2);
    const firstHalf = metrics.responseTimes.slice(0, mid);
    const secondHalf = metrics.responseTimes.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // Slowing down = fatigue
    if (secondAvg > firstAvg * 1.5) fatigue += 25;
  }

  // Hesitation increase
  if (totalQ >= 4 && metrics.hesitations > totalQ * 0.4) fatigue += 20;

  // Consecutive wrong at end
  if (metrics.consecutiveWrong >= 2 && totalQ >= 4) fatigue += 15;

  fatigue = Math.min(100, fatigue);

  const shouldBreak = fatigue >= 60 || elapsed > state.optimalSessionDuration * 1.3;
  const message = fatigue >= 60
    ? 'يبدو أنك تعبت قليلاً، ما رأيك نأخذ استراحة؟ ☕'
    : fatigue >= 40
    ? 'أنت تبذل جهد رائع! بقي قليل 💪'
    : '';

  return { fatigueLevel: fatigue, shouldBreak, message };
}

/**
 * Check if session should end
 */
export function shouldEndSession(
  metrics: SessionMetrics,
  state: AdaptiveState
): { shouldEnd: boolean; reason: string } {
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  const totalQ = metrics.correctAnswers + metrics.wrongAnswers;

  // Time limit exceeded
  if (elapsed > state.optimalSessionDuration * 1.5) {
    return { shouldEnd: true, reason: 'وقت الجلسة انتهى - أحسنت!' };
  }

  // High fatigue
  if (state.fatigueLevel >= 80) {
    return { shouldEnd: true, reason: 'وقت استراحة! ارجع لما تكون مستعد' };
  }

  // Too many consecutive failures (frustration prevention)
  if (metrics.consecutiveWrong >= 4) {
    return { shouldEnd: true, reason: 'خلنا نرجع بكرة بطاقة جديدة! 🌟' };
  }

  // Minimum questions completed and good performance
  if (totalQ >= state.sessionConfig.questionCount && metrics.correctAnswers >= totalQ * 0.6) {
    return { shouldEnd: true, reason: 'أكملت جلسة اليوم بنجاح! 🎉' };
  }

  return { shouldEnd: false, reason: '' };
}

// ═══════════════════════════════════════════════════════
// SKILL QUEUE & PATH OPTIMIZATION
// ═══════════════════════════════════════════════════════

/**
 * Build optimized skill queue based on:
 * - Skip mastered skills
 * - Focus on weak skills (zone of proximal development)
 * - Include retention reviews
 * - Add remediation for prerequisites
 */
export async function buildSkillQueue(
  profile: LearnerProfile,
  filter?: ContentFilter
): Promise<SkillQueueItem[]> {
  const queue: SkillQueueItem[] = [];
  let localMastery: Record<string, { mastery_level?: number; attempts_count?: number }> = {};

  try {
    localMastery = getLocalMastery();
  } catch {
    localMastery = {};
  }

  try {
    // Fetch published skills from backend
    const skills = await fetchSkills(undefined, undefined, undefined, filter);
    if (!Array.isArray(skills)) throw new Error('Invalid skills response');
    const publishedSkills = skills.filter(s => s.status === 'published' || s.status === 'active');

    for (const skill of publishedSkills) {
      if (!skill.id || !skill.name) continue; // Skip invalid entries
      const masteryData = localMastery[String(skill.id)];
      const confidence = profile.skillConfidence[skill.name] || 0;
      const mastery = masteryData?.mastery_level || 0;

      // Skip fully mastered (>90% confidence, reviewed recently)
      const lastReviewed = profile.skillLastReviewed[skill.name];
      let daysSinceReview = 999;
      if (lastReviewed) {
        const parsed = new Date(lastReviewed).getTime();
        if (Number.isFinite(parsed)) {
          daysSinceReview = (Date.now() - parsed) / (1000 * 60 * 60 * 24);
        }
      }

      if (confidence >= 90 && daysSinceReview < 7) continue;

      // Determine priority and reason
      let priority = 50;
      let reason: SkillQueueItem['reason'] = 'next_in_path';
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

      // Weak skills get highest priority
      if (profile.weakSkills.includes(skill.name)) {
        priority = 90;
        reason = 'weak';
        difficulty = 'easy';
      }
      // Retention due
      else if (confidence >= 70 && daysSinceReview > 7) {
        priority = 75;
        reason = 'retention';
        difficulty = 'medium';
      }
      // Low mastery = remediation
      else if (mastery < 0.3 && (masteryData?.attempts_count || 0) > 2) {
        priority = 85;
        reason = 'remediation';
        difficulty = 'easy';
      }
      // High confidence = challenge
      else if (confidence >= 70 && confidence < 90) {
        priority = 40;
        reason = 'challenge';
        difficulty = 'hard';
      }

      queue.push({
        skillId: skill.id,
        skillName: skill.name,
        priority,
        reason,
        difficulty,
        attempts: masteryData?.attempts_count || 0,
        mastery: Math.round(mastery * 100),
      });
    }
  } catch (err) {
    console.warn('Failed to fetch skills from backend, using profile data:', err);
    // Fallback: build from profile weak skills
    const weakSkills = Array.isArray(profile.weakSkills) ? profile.weakSkills : [];
    for (const skill of weakSkills) {
      if (!skill) continue;
      queue.push({
        skillId: 0,
        skillName: skill,
        priority: 90,
        reason: 'weak',
        difficulty: 'easy',
        attempts: 0,
        mastery: 0,
      });
    }
  }

  // Sort by priority (highest first)
  queue.sort((a, b) => b.priority - a.priority);
  return queue.slice(0, 10); // Top 10 skills
}

// ═══════════════════════════════════════════════════════
// REMEDIATION FLOW
// ═══════════════════════════════════════════════════════

/**
 * Trigger remediation when weakness detected
 * Routes to easier prerequisite content
 */
export function triggerRemediation(
  state: AdaptiveState,
  failedSkill: string
): { remediationSkill: string; message: string; difficulty: 'easy' } {
  // Find prerequisite skill
  const prereqMap: Record<string, string> = {
    'طرح': 'جمع',
    'ضرب': 'جمع',
    'قسمة': 'ضرب',
    'كسور': 'قسمة',
    'جمل': 'حروف',
    'تعريف': 'حروف',
    'أضداد': 'حروف',
    'مقارنة': 'تسلسل',
    'وقت': 'تسلسل',
  };

  const remediation = prereqMap[failedSkill] || failedSkill;

  return {
    remediationSkill: remediation,
    message: `خلنا نقوّي ${remediation} أول، بعدين نرجع لـ${failedSkill} 🌱`,
    difficulty: 'easy',
  };
}

/**
 * Check if remediation is complete
 */
export function checkRemediationComplete(
  profile: LearnerProfile,
  remediationSkill: string
): boolean {
  const confidence = profile.skillConfidence[remediationSkill] || 0;
  return confidence >= 60; // Need 60% confidence to exit remediation
}

// ═══════════════════════════════════════════════════════
// SPACED REPETITION - BACKEND SYNC
// ═══════════════════════════════════════════════════════

/**
 * Get retention reviews that are due, synced with backend
 */
export async function getRetentionReviews(profile: LearnerProfile): Promise<RetentionReview[]> {
  const reviews: RetentionReview[] = [];
  const now = Date.now();

  // Guard: ensure masteredSkills is a valid array
  const masteredSkills = Array.isArray(profile?.masteredSkills) ? profile.masteredSkills : [];

  for (const skill of masteredSkills) {
    if (!skill || typeof skill !== 'string') continue;

    const lastReviewed = profile.skillLastReviewed?.[skill];
    const confidence = Math.max(0, Math.min(100, Number(profile.skillConfidence?.[skill]) || 50));

    if (!lastReviewed) {
      reviews.push({
        skillId: 0,
        skillName: skill,
        lastReviewed: '',
        daysSince: 999,
        currentConfidence: confidence,
        urgency: 'critical',
        suggestedQuestionCount: 3,
      });
      continue;
    }

    const parsedTime = new Date(lastReviewed).getTime();
    if (!Number.isFinite(parsedTime)) {
      // Invalid date - treat as never reviewed
      reviews.push({
        skillId: 0,
        skillName: skill,
        lastReviewed: '',
        daysSince: 999,
        currentConfidence: confidence,
        urgency: 'critical',
        suggestedQuestionCount: 3,
      });
      continue;
    }

    const daysSince = (now - parsedTime) / (1000 * 60 * 60 * 24);
    if (!Number.isFinite(daysSince) || daysSince < 0) continue;

    // Interval based on confidence
    const interval = confidence >= 90 ? 14 : confidence >= 70 ? 7 : confidence >= 50 ? 3 : 1;

    if (daysSince >= interval) {
      const urgency: RetentionReview['urgency'] =
        daysSince > interval * 3 ? 'critical' :
        daysSince > interval * 2 ? 'high' :
        daysSince > interval * 1.5 ? 'medium' : 'low';

      const suggestedQuestionCount = urgency === 'critical' ? 5 :
        urgency === 'high' ? 4 : urgency === 'medium' ? 3 : 2;

      reviews.push({
        skillId: 0,
        skillName: skill,
        lastReviewed,
        daysSince: Math.round(daysSince),
        currentConfidence: confidence,
        urgency,
        suggestedQuestionCount,
      });
    }
  }

  // Sort by urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  reviews.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return reviews;
}

/**
 * Record retention review result to backend
 */
export async function recordRetentionReview(
  skillName: string,
  skillId: number,
  questionsAsked: number,
  questionsCorrect: number,
  timeSpent: number
): Promise<void> {
  const profile = loadLearnerProfile();
  const retentionScore = questionsAsked > 0 ? (questionsCorrect / questionsAsked) * 100 : 0;
  const passed = retentionScore >= 70;

  // Update local profile
  const updated = updateSkillConfidence(profile, skillName, questionsCorrect, questionsAsked);
  saveLearnerProfile(updated);

  // Calculate next review date
  const confidence = updated.skillConfidence[skillName] || 50;
  const nextIntervalDays = passed
    ? (confidence >= 90 ? 14 : confidence >= 70 ? 7 : 3)
    : 1; // Failed = review tomorrow

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + nextIntervalDays);

  // Sync to backend
  try {
    await client.entities.retention_history.create({
      data: {
        skill_id: skillId,
        review_type: 'spaced_repetition',
        questions_asked: questionsAsked,
        questions_correct: questionsCorrect,
        retention_score: retentionScore,
        time_spent_seconds: timeSpent,
        passed,
        next_review_at: nextReviewAt.toISOString(),
      },
    });
  } catch (err) {
    console.warn('Failed to sync retention review to backend:', err);
  }
}

// ═══════════════════════════════════════════════════════
// SESSION PERSISTENCE - BACKEND SYNC
// ═══════════════════════════════════════════════════════

/**
 * Save completed session to backend
 */
export async function saveSessionToBackend(
  metrics: SessionMetrics,
  config: SessionConfig,
  profile: LearnerProfile,
  xpEarned: number
): Promise<void> {
  const startTime = Number.isFinite(metrics.startTime) ? metrics.startTime : Date.now() - 300000;
  const duration = Math.max(0, Math.round((Date.now() - startTime) / 1000));
  const totalQ = Math.max(0, (metrics.correctAnswers || 0) + (metrics.wrongAnswers || 0));
  const engagement = totalQ > 0 ? Math.round(Math.max(0, Math.min(100, profile.engagement || 0))) : 0;

  const sessionRecord: SessionRecord = {
    session_type: config.sessionType || 'learn',
    started_at: new Date(startTime).toISOString(),
    ended_at: new Date().toISOString(),
    duration_seconds: duration,
    questions_attempted: totalQ,
    questions_correct: Math.max(0, Math.min(totalQ, metrics.correctAnswers || 0)),
    skills_practiced: config.focusSkill || '',
    missions_completed: Math.max(0, config.missionCount || 0),
    xp_earned: Math.max(0, xpEarned || 0),
    engagement_score: engagement,
  };

  // If offline, queue for later
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueSessionLocally(sessionRecord);
    return;
  }

  try {
    await client.entities.learning_sessions.create({ data: sessionRecord });
  } catch (err) {
    console.warn('Failed to save session to backend:', err);
    queueSessionLocally(sessionRecord);
  }
}

/** Queue session record locally for later sync */
function queueSessionLocally(record: SessionRecord): void {
  try {
    const pending = JSON.parse(localStorage.getItem('pendingSessions') || '[]');
    pending.push(record);
    localStorage.setItem('pendingSessions', JSON.stringify(pending.slice(-20)));
  } catch {
    // Storage full or unavailable - best effort
  }
}

/**
 * Sync pending sessions that failed to save
 */
export async function syncPendingSessions(): Promise<number> {
  const pending = JSON.parse(localStorage.getItem('pendingSessions') || '[]');
  if (pending.length === 0) return 0;

  let synced = 0;
  const remaining: SessionRecord[] = [];

  for (const session of pending) {
    try {
      await client.entities.learning_sessions.create({ data: session });
      synced++;
    } catch {
      remaining.push(session);
    }
  }

  localStorage.setItem('pendingSessions', JSON.stringify(remaining));
  return synced;
}

// ═══════════════════════════════════════════════════════
// MASTERY TRACKING - BAYESIAN UPDATE WITH BACKEND SYNC
// ═══════════════════════════════════════════════════════

/**
 * Update mastery after answering a question
 * Uses Bayesian update and syncs to backend
 */
export function updateMasteryAfterAnswer(
  profile: LearnerProfile,
  skillName: string,
  skillId: number,
  isCorrect: boolean,
  responseTime: number
): LearnerProfile {
  // Validate inputs
  if (!profile || !skillName || !Number.isFinite(skillId)) {
    return profile || loadLearnerProfile();
  }

  const safeResponseTime = Number.isFinite(responseTime) && responseTime > 0 ? responseTime : 10;

  // Get current mastery data
  let localMastery: Record<string, { mastery_level?: number; confidence_score?: number; attempts_count?: number; correct_count?: number; streak?: number }> = {};
  try {
    localMastery = getLocalMastery();
  } catch {
    localMastery = {};
  }

  const existing = localMastery[String(skillId)] || {
    skill_id: skillId,
    mastery_level: 0,
    confidence_score: 0,
    attempts_count: 0,
    correct_count: 0,
    streak: 0,
    status: 'new' as const,
    last_practiced_at: new Date().toISOString(),
  };

  // Sanitize existing values
  const safeAttempts = Math.max(0, Number(existing.attempts_count) || 0);
  const safeCorrectCount = Math.max(0, Math.min(safeAttempts, Number(existing.correct_count) || 0));
  const safeStreak = Math.max(0, Number(existing.streak) || 0);
  const safePrior = Math.max(0, Math.min(1, Number(existing.mastery_level) || 0));

  // Update counts
  const newAttempts = safeAttempts + 1;
  const newCorrect = safeCorrectCount + (isCorrect ? 1 : 0);
  const newStreak = isCorrect ? safeStreak + 1 : 0;

  // Bayesian mastery update
  // Prior: current mastery level (clamped 0-1)
  // Evidence: recent performance with time weighting
  const likelihood = isCorrect ? 1 : 0;
  const timeWeight = safeResponseTime < 5 ? 1.2 : safeResponseTime > 15 ? 0.7 : 1.0;
  const sqrtAttempts = Math.sqrt(newAttempts);
  const evidenceWeight = sqrtAttempts > 0 ? Math.min(1, 1 / sqrtAttempts) : 1; // diminishing returns
  let posterior = safePrior + (likelihood - safePrior) * evidenceWeight * timeWeight * 0.3;

  // Guard against NaN and clamp to [0, 1]
  if (!Number.isFinite(posterior)) posterior = safePrior;
  posterior = Math.max(0, Math.min(1, posterior));

  // Confidence score (certainty of mastery estimate) - clamped [0, 1]
  let confidenceScore = Math.min(1, newAttempts / 10) * (newCorrect / Math.max(1, newAttempts));
  if (!Number.isFinite(confidenceScore)) confidenceScore = 0;
  confidenceScore = Math.max(0, Math.min(1, confidenceScore));

  // Update local mastery
  try {
    updateLocalSkillMastery(String(skillId), {
      mastery_level: posterior,
      confidence_score: confidenceScore,
      attempts_count: newAttempts,
      correct_count: Math.min(newCorrect, newAttempts),
      streak: newStreak,
    });
  } catch (err) {
    console.warn('Failed to update local mastery:', err);
  }

  // Update profile confidence
  try {
    const updatedProfile = updateSkillConfidence(profile, skillName, isCorrect ? 1 : 0, 1);
    return updatedProfile;
  } catch {
    return profile;
  }
}

/**
 * Batch sync mastery to backend (call periodically or on session end)
 */
export async function syncAllMastery(): Promise<void> {
  try {
    await syncMasteryToBackend();
  } catch (err) {
    console.warn('Mastery sync failed:', err);
  }
}

// ═══════════════════════════════════════════════════════
// PUBLISHED CONTENT FETCHING
// ═══════════════════════════════════════════════════════

/**
 * Fetch only published/active lessons for adaptive sequencing
 */
export async function getPublishedLessonsForSkill(
  skillId: number,
  filter?: ContentFilter
): Promise<DynamicLesson[]> {
  try {
    const allLessons = await fetchLessons(undefined, filter);
    return allLessons.filter(l => l.status === 'published' || l.status === 'active');
  } catch {
    return [];
  }
}

/**
 * Get next skill in learning path (zone of proximal development)
 * - Not mastered yet
 * - Prerequisites are met
 * - Appropriate difficulty
 */
export function getNextSkillInPath(
  queue: SkillQueueItem[],
  profile: LearnerProfile
): SkillQueueItem | null {
  // Zone of proximal development: skills that are challenging but achievable
  // Mastery between 20-70% is the sweet spot
  const zpd = queue.filter(s => s.mastery >= 20 && s.mastery <= 70);
  if (zpd.length > 0) return zpd[0];

  // If no ZPD skills, get the highest priority unmastered
  const unmastered = queue.filter(s => s.mastery < 80);
  if (unmastered.length > 0) return unmastered[0];

  // All mastered - return retention review
  const retention = queue.filter(s => s.reason === 'retention');
  return retention[0] || null;
}

// ═══════════════════════════════════════════════════════
// PROGRESS ANALYTICS DATA
// ═══════════════════════════════════════════════════════

export interface ProgressData {
  totalSkills: number;
  masteredSkills: number;
  learningSkills: number;
  weakSkills: number;
  overallMastery: number; // 0-100
  streakDays: number;
  totalXP: number;
  totalSessions: number;
  avgSessionDuration: number;
  avgAccuracy: number;
  weeklyProgress: WeeklyPoint[];
  skillBreakdown: SkillProgress[];
  achievements: Achievement[];
  retentionHealth: number; // 0-100
}

export interface WeeklyPoint {
  day: string;
  mastery: number;
  sessions: number;
  xp: number;
}

export interface SkillProgress {
  name: string;
  mastery: number;
  confidence: number;
  status: 'mastered' | 'learning' | 'weak' | 'new';
  lastPracticed: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedDate?: string;
}

/**
 * Calculate comprehensive progress data for analytics display
 */
export function calculateProgressData(profile: LearnerProfile): ProgressData {
  const localMastery = getLocalMastery();
  const masteryEntries = Object.values(localMastery);

  const totalSkills = Math.max(masteryEntries.length, profile.masteredSkills.length + profile.weakSkills.length + 3);
  const masteredCount = profile.masteredSkills.length;
  const weakCount = profile.weakSkills.length;
  const learningCount = totalSkills - masteredCount - weakCount;

  // Overall mastery
  const confidenceValues = Object.values(profile.skillConfidence);
  const overallMastery = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length)
    : 0;

  // Average accuracy
  const avgAccuracy = profile.totalAttempts > 0
    ? Math.round((profile.totalCorrect / profile.totalAttempts) * 100)
    : 0;

  // Average session duration
  const avgSessionDuration = profile.sessionDurations.length > 0
    ? Math.round(profile.sessionDurations.reduce((a, b) => a + b, 0) / profile.sessionDurations.length)
    : 0;

  // XP estimate
  const totalXP = profile.totalCorrect * 5 + profile.totalSessions * 10 + masteredCount * 50;

  // Weekly progress (simulated from session data)
  const weeklyProgress = generateWeeklyProgress(profile);

  // Skill breakdown
  const skillBreakdown = generateSkillBreakdown(profile);

  // Achievements
  const achievements = calculateAchievements(profile);

  // Retention health
  const retentionSkills = getSkillsNeedingRetention(profile);
  const retentionHealth = masteredCount > 0
    ? Math.round(((masteredCount - retentionSkills.length) / masteredCount) * 100)
    : 100;

  return {
    totalSkills,
    masteredSkills: masteredCount,
    learningSkills: learningCount,
    weakSkills: weakCount,
    overallMastery,
    streakDays: profile.consecutiveDays,
    totalXP,
    totalSessions: profile.totalSessions,
    avgSessionDuration,
    avgAccuracy,
    weeklyProgress,
    skillBreakdown,
    achievements,
    retentionHealth,
  };
}

function generateWeeklyProgress(profile: LearnerProfile): WeeklyPoint[] {
  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const today = new Date().getDay();
  const sessions = profile.sessionDurations.slice(-7);

  return days.map((day, i) => {
    const isActive = i <= today && sessions.length > i;
    return {
      day,
      mastery: isActive ? Math.min(100, (profile.confidence || 50) + (i * 3)) : 0,
      sessions: isActive ? 1 : 0,
      xp: isActive ? Math.round(20 + Math.random() * 30) : 0,
    };
  });
}

function generateSkillBreakdown(profile: LearnerProfile): SkillProgress[] {
  const skills: SkillProgress[] = [];

  for (const skill of profile.masteredSkills) {
    skills.push({
      name: skill,
      mastery: profile.skillConfidence[skill] || 90,
      confidence: profile.skillConfidence[skill] || 90,
      status: 'mastered',
      lastPracticed: profile.skillLastReviewed[skill] || '',
    });
  }

  for (const skill of profile.weakSkills) {
    skills.push({
      name: skill,
      mastery: profile.skillConfidence[skill] || 20,
      confidence: profile.skillConfidence[skill] || 20,
      status: 'weak',
      lastPracticed: profile.skillLastReviewed[skill] || '',
    });
  }

  // Add some learning skills from confidence data
  for (const [skill, conf] of Object.entries(profile.skillConfidence)) {
    if (!profile.masteredSkills.includes(skill) && !profile.weakSkills.includes(skill)) {
      skills.push({
        name: skill,
        mastery: conf,
        confidence: conf,
        status: conf >= 60 ? 'learning' : 'new',
        lastPracticed: profile.skillLastReviewed[skill] || '',
      });
    }
  }

  return skills.sort((a, b) => b.mastery - a.mastery);
}

function calculateAchievements(profile: LearnerProfile): Achievement[] {
  return [
    {
      id: 'first_session',
      title: 'أول خطوة',
      description: 'أكملت أول جلسة تعلم',
      emoji: '🎯',
      earned: profile.totalSessions >= 1,
      earnedDate: profile.totalSessions >= 1 ? profile.lastSessionDate : undefined,
    },
    {
      id: 'streak_3',
      title: 'مثابر',
      description: '3 أيام متتالية',
      emoji: '🔥',
      earned: profile.longestStreak >= 3,
    },
    {
      id: 'streak_7',
      title: 'بطل الأسبوع',
      description: '7 أيام متتالية',
      emoji: '⭐',
      earned: profile.longestStreak >= 7,
    },
    {
      id: 'mastery_5',
      title: 'متقن',
      description: 'أتقنت 5 مهارات',
      emoji: '🏅',
      earned: profile.masteredSkills.length >= 5,
    },
    {
      id: 'mastery_10',
      title: 'خبير',
      description: 'أتقنت 10 مهارات',
      emoji: '🏆',
      earned: profile.masteredSkills.length >= 10,
    },
    {
      id: 'accuracy_80',
      title: 'دقيق',
      description: 'دقة أعلى من 80%',
      emoji: '🎯',
      earned: profile.totalAttempts > 10 && (profile.totalCorrect / profile.totalAttempts) >= 0.8,
    },
    {
      id: 'sessions_10',
      title: 'منتظم',
      description: '10 جلسات تعلم',
      emoji: '📚',
      earned: profile.totalSessions >= 10,
    },
    {
      id: 'fast_learner',
      title: 'سريع البديهة',
      description: 'متوسط إجابة أقل من 5 ثوان',
      emoji: '⚡',
      earned: profile.avgResponseTime < 5 && profile.totalAttempts > 20,
    },
  ];
}