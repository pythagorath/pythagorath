// Habit Formation Engine
// Transforms learning from a good experience into a daily habit
// Psychology: anticipation, momentum, tiny wins, curiosity, satisfaction

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface HabitProfile {
  // Streak & Return
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string; // YYYY-MM-DD
  totalVisits: number;
  streakRecoveryUsed: number; // times flexible recovery was used

  // Session History
  sessionsToday: number;
  sessionsThisWeek: number;
  averageSessionsPerDay: number;

  // Emotional Progression
  journeyLevel: number; // 1-20, visible growth
  journeyTitle: string;
  xpToNextLevel: number;
  totalXp: number;

  // Behavioral Analytics
  dailyReturnRate: number; // 0-100%
  streakRecoveryRate: number; // successful recoveries / total breaks
  sessionCompletionHappiness: number; // 0-100
  frustrationExits: number;
  curiosityEngagement: number; // 0-100

  // Curiosity Loop
  nextMissionHint: string;
  surpriseReady: boolean;
  challengeEvolution: number; // 0-100, how much challenges evolved

  // Tomorrow Preview
  tomorrowPreview: string;
  anticipationLevel: number; // 0-100
}

export interface TinyWin {
  id: string;
  emoji: string;
  message: string;
  type: 'micro' | 'quick' | 'confidence';
  timestamp: number;
}

export interface SessionEndFeeling {
  achievement: string;
  achievementEmoji: string;
  restMessage: string;
  returnDesire: string;
  returnEmoji: string;
  tomorrowHint: string;
  tomorrowEmoji: string;
}

export interface ComebackMessage {
  greeting: string;
  emoji: string;
  encouragement: string;
  streakStatus: string;
  streakEmoji: string;
}

// ============ Journey Levels ============

const JOURNEY_LEVELS: { level: number; title: string; xpNeeded: number }[] = [
  { level: 1, title: 'مستكشف صغير', xpNeeded: 0 },
  { level: 2, title: 'متعلم نشيط', xpNeeded: 50 },
  { level: 3, title: 'باحث ذكي', xpNeeded: 120 },
  { level: 4, title: 'نجم صاعد', xpNeeded: 220 },
  { level: 5, title: 'بطل المعرفة', xpNeeded: 350 },
  { level: 6, title: 'عالم المستقبل', xpNeeded: 520 },
  { level: 7, title: 'عبقري رياضيات', xpNeeded: 730 },
  { level: 8, title: 'فارس التعلم', xpNeeded: 1000 },
  { level: 9, title: 'أسطورة فيثاغورث', xpNeeded: 1350 },
  { level: 10, title: 'حكيم الأرقام', xpNeeded: 1800 },
];

// ============ Default Profile ============

const DEFAULT_HABIT_PROFILE: HabitProfile = {
  currentStreak: 0,
  longestStreak: 0,
  lastVisitDate: '',
  totalVisits: 0,
  streakRecoveryUsed: 0,
  sessionsToday: 0,
  sessionsThisWeek: 0,
  averageSessionsPerDay: 0,
  journeyLevel: 1,
  journeyTitle: 'مستكشف صغير',
  xpToNextLevel: 50,
  totalXp: 0,
  dailyReturnRate: 0,
  streakRecoveryRate: 0,
  sessionCompletionHappiness: 70,
  frustrationExits: 0,
  curiosityEngagement: 50,
  nextMissionHint: '',
  surpriseReady: false,
  challengeEvolution: 0,
  tomorrowPreview: '',
  anticipationLevel: 50,
};

// ============ Load/Save ============

export function loadHabitProfile(): HabitProfile {
  return loadUserData<HabitProfile>('habit_profile', DEFAULT_HABIT_PROFILE);
}

export function saveHabitProfile(profile: HabitProfile): void {
  saveUserData('habit_profile', profile);
}

// ============ Date Helpers ============

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(dateA: string, dateB: string): number {
  if (!dateA || !dateB) return 999;
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

// ============ 1. Daily Return Psychology ============

export function processReturn(profile: HabitProfile): { updatedProfile: HabitProfile; comeback: ComebackMessage } {
  const today = getToday();
  const daysSinceLastVisit = daysBetween(profile.lastVisitDate, today);
  const updated = { ...profile };

  if (profile.lastVisitDate === today) {
    // Same day return
    updated.sessionsToday += 1;
    return {
      updatedProfile: updated,
      comeback: {
        greeting: 'رجعت! 🎉',
        emoji: '🌟',
        encouragement: 'حماسك رائع!',
        streakStatus: `${updated.currentStreak} يوم متواصل`,
        streakEmoji: '🔥',
      },
    };
  }

  updated.lastVisitDate = today;
  updated.totalVisits += 1;
  updated.sessionsToday = 1;

  if (daysSinceLastVisit === 1) {
    // Perfect consecutive day
    updated.currentStreak += 1;
    updated.longestStreak = Math.max(updated.longestStreak, updated.currentStreak);
    updated.dailyReturnRate = Math.min(100, updated.dailyReturnRate + 5);

    return {
      updatedProfile: updated,
      comeback: {
        greeting: `يوم ${updated.currentStreak} متواصل!`,
        emoji: '🔥',
        encouragement: getStreakEncouragement(updated.currentStreak),
        streakStatus: `${updated.currentStreak} يوم`,
        streakEmoji: updated.currentStreak >= 7 ? '⚡' : '🔥',
      },
    };
  }

  if (daysSinceLastVisit <= 3) {
    // Flexible streak recovery - no punishment
    const recoveredStreak = Math.max(1, updated.currentStreak - 1); // only lose 1 day
    updated.currentStreak = recoveredStreak;
    updated.streakRecoveryUsed += 1;
    updated.streakRecoveryRate = updated.totalVisits > 0
      ? Math.round((updated.streakRecoveryUsed / updated.totalVisits) * 100)
      : 0;

    return {
      updatedProfile: updated,
      comeback: {
        greeting: 'أهلاً! اشتقنا لك',
        emoji: '💙',
        encouragement: 'رجعت وهذا هو المهم! نكمل من حيث وقفنا',
        streakStatus: `${recoveredStreak} يوم (محفوظ!)`,
        streakEmoji: '🛡️',
      },
    };
  }

  // Long absence (>3 days) - gentle restart, no shame
  updated.currentStreak = 1; // fresh start
  updated.dailyReturnRate = Math.max(0, updated.dailyReturnRate - 10);

  return {
    updatedProfile: updated,
    comeback: {
      greeting: 'مرحباً من جديد!',
      emoji: '🌈',
      encouragement: 'كل يوم جديد فرصة جديدة. يلا نبدأ!',
      streakStatus: 'بداية جديدة',
      streakEmoji: '🌱',
    },
  };
}

function getStreakEncouragement(streak: number): string {
  if (streak >= 14) return 'أنت بطل حقيقي! عادة التعلم صارت جزء منك';
  if (streak >= 7) return 'أسبوع كامل! أنت مذهل';
  if (streak >= 5) return 'خمسة أيام! استمر يا نجم';
  if (streak >= 3) return 'ثلاثة أيام متواصلة! رائع';
  return 'يوم جديد، إنجاز جديد!';
}

// ============ 2. Momentum Preservation ============

export function getFlexibleStreakMessage(profile: HabitProfile): string {
  if (profile.currentStreak >= 7) return `سلسلة ${profile.currentStreak} يوم! 🔥 أنت أسطورة`;
  if (profile.currentStreak >= 3) return `${profile.currentStreak} أيام متواصلة! 💪`;
  if (profile.streakRecoveryUsed > 0) return 'سلسلتك محفوظة! 🛡️ استمر';
  return 'كل يوم تتعلم فيه هو إنجاز 🌟';
}

// ============ 3. Tiny Wins System ============

const MICRO_WINS: Omit<TinyWin, 'timestamp'>[] = [
  { id: 'first_answer', emoji: '⭐', message: 'أول إجابة!', type: 'micro' },
  { id: 'quick_solve', emoji: '⚡', message: 'سريع!', type: 'quick' },
  { id: 'two_correct', emoji: '✨', message: 'اثنين صح!', type: 'micro' },
  { id: 'three_correct', emoji: '🌟', message: 'ثلاثة متتالية!', type: 'confidence' },
  { id: 'half_done', emoji: '🎯', message: 'نصف الطريق!', type: 'micro' },
  { id: 'almost_done', emoji: '🏁', message: 'قربت تخلص!', type: 'quick' },
  { id: 'no_mistakes', emoji: '💎', message: 'بدون أخطاء!', type: 'confidence' },
  { id: 'comeback_win', emoji: '💪', message: 'رجعت بقوة!', type: 'confidence' },
  { id: 'new_skill', emoji: '🧠', message: 'مهارة جديدة!', type: 'micro' },
  { id: 'perseverance', emoji: '🌱', message: 'ما استسلمت!', type: 'confidence' },
];

export function checkTinyWin(
  correctCount: number,
  totalCount: number,
  consecutiveCorrect: number,
  avgResponseTime: number,
  totalMissions: number,
  completedMissions: number
): TinyWin | null {
  const now = Date.now();

  if (totalCount === 1 && correctCount === 1) {
    return { ...MICRO_WINS[0], timestamp: now };
  }
  if (avgResponseTime < 4 && correctCount > 0) {
    return { ...MICRO_WINS[1], timestamp: now };
  }
  if (consecutiveCorrect === 2) {
    return { ...MICRO_WINS[2], timestamp: now };
  }
  if (consecutiveCorrect === 3) {
    return { ...MICRO_WINS[3], timestamp: now };
  }
  if (totalMissions > 0 && completedMissions === Math.ceil(totalMissions / 2)) {
    return { ...MICRO_WINS[4], timestamp: now };
  }
  if (totalMissions > 0 && completedMissions === totalMissions - 1) {
    return { ...MICRO_WINS[5], timestamp: now };
  }
  if (totalCount >= 3 && correctCount === totalCount) {
    return { ...MICRO_WINS[6], timestamp: now };
  }

  return null;
}

// ============ 4. Emotional Progression ============

export function addXpAndProgress(profile: HabitProfile, xpGained: number): {
  updatedProfile: HabitProfile;
  leveledUp: boolean;
  newTitle: string;
} {
  const updated = { ...profile };
  updated.totalXp += xpGained;

  // Find current level
  let newLevel = 1;
  for (const lvl of JOURNEY_LEVELS) {
    if (updated.totalXp >= lvl.xpNeeded) {
      newLevel = lvl.level;
    }
  }

  const leveledUp = newLevel > updated.journeyLevel;
  updated.journeyLevel = newLevel;

  const currentLevelData = JOURNEY_LEVELS.find(l => l.level === newLevel);
  const nextLevelData = JOURNEY_LEVELS.find(l => l.level === newLevel + 1);

  updated.journeyTitle = currentLevelData?.title || 'حكيم الأرقام';
  updated.xpToNextLevel = nextLevelData
    ? nextLevelData.xpNeeded - updated.totalXp
    : 0;

  return { updatedProfile: updated, leveledUp, newTitle: updated.journeyTitle };
}

export function getProgressionMessage(level: number): string {
  const messages: Record<number, string> = {
    2: 'صرت متعلم نشيط! 🌱',
    3: 'باحث ذكي! عقلك يكبر 🧠',
    4: 'نجم صاعد! أنت تتألق ⭐',
    5: 'بطل المعرفة! فخورين فيك 🏆',
    6: 'عالم المستقبل! لا حدود لك 🚀',
    7: 'عبقري رياضيات! مذهل 🎓',
    8: 'فارس التعلم! شجاع ومثابر ⚔️',
    9: 'أسطورة فيثاغورث! 🦉',
    10: 'حكيم الأرقام! وصلت القمة 👑',
  };
  return messages[level] || 'أنت تكبر كل يوم! 🌟';
}

// ============ 5. Curiosity Loop ============

const MISSION_HINTS = [
  'غدًا عندك تحدي جديد ممتع! 🎯',
  'في مفاجأة تنتظرك المرة الجاية! ✨',
  'مستوى جديد قريب... استعد! 🚀',
  'سؤال خاص جاي بكرة! 🧩',
  'تحدي السرعة ينتظرك! ⚡',
  'مهمة سرية قادمة... 🕵️',
];

const SURPRISES = [
  'سؤال بونص! إجابة صحيحة = نقاط مضاعفة ⭐',
  'مهمة خاصة من فيثاغورث! 🦉',
  'تحدي اليوم: أجب بدون تردد! ⚡',
  'جولة مفاجأة! 3 أسئلة سريعة 🎲',
];

export function generateCuriosityHint(profile: HabitProfile): string {
  const idx = (profile.totalVisits + profile.journeyLevel) % MISSION_HINTS.length;
  return MISSION_HINTS[idx];
}

export function checkSurprise(profile: HabitProfile): { hasSurprise: boolean; surprise: string } {
  // Surprise every 3rd visit or on streak milestones
  const shouldSurprise = profile.totalVisits % 3 === 0 || profile.currentStreak % 5 === 0;
  if (shouldSurprise && profile.totalVisits > 1) {
    const idx = profile.totalVisits % SURPRISES.length;
    return { hasSurprise: true, surprise: SURPRISES[idx] };
  }
  return { hasSurprise: false, surprise: '' };
}

// ============ 6. Session Completion Satisfaction ============

export function generateSessionEndFeeling(
  profile: HabitProfile,
  correctCount: number,
  totalCount: number
): SessionEndFeeling {
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
  const hint = generateCuriosityHint(profile);

  if (accuracy >= 0.8) {
    return {
      achievement: 'جلسة رائعة!',
      achievementEmoji: '🏆',
      restMessage: 'استحقيت استراحة',
      returnDesire: 'غدًا نكمل المشوار',
      returnEmoji: '🌅',
      tomorrowHint: hint,
      tomorrowEmoji: '✨',
    };
  }

  if (accuracy >= 0.5) {
    return {
      achievement: 'أحسنت! تقدمت',
      achievementEmoji: '⭐',
      restMessage: 'كل جلسة تقربك أكثر',
      returnDesire: 'المرة الجاية أفضل',
      returnEmoji: '💪',
      tomorrowHint: hint,
      tomorrowEmoji: '🎯',
    };
  }

  return {
    achievement: 'شكرًا إنك حاولت!',
    achievementEmoji: '💙',
    restMessage: 'المحاولة هي النجاح',
    returnDesire: 'بكرة يوم جديد',
    returnEmoji: '🌱',
    tomorrowHint: hint,
    tomorrowEmoji: '🌈',
  };
}

// ============ 7. Behavioral Retention Analytics ============

export interface RetentionAnalytics {
  dailyReturnRate: number;
  streakRecoveryRate: number;
  sessionCompletionHappiness: number;
  frustrationExits: number;
  curiosityEngagement: number;
  averageSessionLength: number; // minutes
  peakEngagementTime: string; // hour of day
}

export function trackSessionCompletion(profile: HabitProfile, completed: boolean, happy: boolean): HabitProfile {
  const updated = { ...profile };

  if (completed) {
    updated.sessionCompletionHappiness = Math.min(100,
      updated.sessionCompletionHappiness + (happy ? 5 : 2)
    );
    updated.curiosityEngagement = Math.min(100, updated.curiosityEngagement + 3);
  } else {
    updated.frustrationExits += 1;
    updated.sessionCompletionHappiness = Math.max(0, updated.sessionCompletionHappiness - 5);
  }

  // Update average sessions
  if (updated.totalVisits > 0) {
    updated.averageSessionsPerDay = Math.round(
      (updated.sessionsToday + updated.averageSessionsPerDay * (updated.totalVisits - 1)) / updated.totalVisits
    );
  }

  return updated;
}

export function getRetentionAnalytics(profile: HabitProfile): RetentionAnalytics {
  return {
    dailyReturnRate: profile.dailyReturnRate,
    streakRecoveryRate: profile.streakRecoveryRate,
    sessionCompletionHappiness: profile.sessionCompletionHappiness,
    frustrationExits: profile.frustrationExits,
    curiosityEngagement: profile.curiosityEngagement,
    averageSessionLength: 5, // estimated
    peakEngagementTime: '16:00', // afternoon
  };
}

// ============ Tomorrow Preview ============

const TOMORROW_PREVIEWS = [
  'غدًا: مغامرة أرقام جديدة! 🔢',
  'غدًا: تحدي ذكاء ممتع! 🧩',
  'غدًا: مهمة خاصة تنتظرك! 🎁',
  'غدًا: سباق مع الوقت! ⏱️',
  'غدًا: اكتشاف مهارة جديدة! 🗺️',
  'غدًا: مفاجأة من فيثاغورث! 🦉',
];

export function getTomorrowPreview(profile: HabitProfile): { message: string; emoji: string } {
  const idx = (profile.totalVisits + profile.currentStreak) % TOMORROW_PREVIEWS.length;
  const preview = TOMORROW_PREVIEWS[idx];
  const emojis = ['🌅', '🌟', '✨', '🎯', '🚀', '🦉'];
  return { message: preview, emoji: emojis[idx] };
}

// ============ Session Start Boost ============

export function getSessionStartBoost(profile: HabitProfile): {
  message: string;
  emoji: string;
  showStreak: boolean;
  streakCount: number;
} {
  if (profile.currentStreak >= 7) {
    return {
      message: `أسبوع كامل! أنت بطل 🏆`,
      emoji: '⚡',
      showStreak: true,
      streakCount: profile.currentStreak,
    };
  }
  if (profile.currentStreak >= 3) {
    return {
      message: `${profile.currentStreak} أيام! استمر`,
      emoji: '🔥',
      showStreak: true,
      streakCount: profile.currentStreak,
    };
  }
  if (profile.surpriseReady) {
    return {
      message: 'عندك مفاجأة اليوم! ✨',
      emoji: '🎁',
      showStreak: false,
      streakCount: profile.currentStreak,
    };
  }
  return {
    message: 'يلا نبدأ!',
    emoji: '🚀',
    showStreak: profile.currentStreak > 0,
    streakCount: profile.currentStreak,
  };
}