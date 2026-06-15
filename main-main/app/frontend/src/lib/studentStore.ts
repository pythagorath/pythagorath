// Student Store - manages level, streak, achievements, weakness tracking, and progress tracking
// PILOT VERSION: Uses per-user isolated storage via pilotStorage

import { saveUserData, loadUserData } from './pilotStorage';
import { monitorEvent } from './persistenceManager';

// ===== Student Progress Tracking (per-user localStorage) =====
export interface QuizResult {
  quizId: string;
  skillId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  date: string;
}

export interface LessonProgress {
  lessonId: string;
  subjectId: string;
  completedAt: string;
  pointsEarned: number;
}

export interface StudentProgress {
  totalPoints: number;
  completedLessons: string[];
  quizResults: QuizResult[];
  lessonsProgress: LessonProgress[];
  lastActive: string;
  totalStudyMinutes: number;
  weeklyActivity: Record<string, number>; // date -> minutes
}

const DEFAULT_PROGRESS: StudentProgress = {
  totalPoints: 0,
  completedLessons: [],
  quizResults: [],
  lessonsProgress: [],
  lastActive: '',
  totalStudyMinutes: 0,
  weeklyActivity: {},
};

function getProgressData(): StudentProgress {
  const data = loadUserData<StudentProgress>('student_progress', DEFAULT_PROGRESS);

  // Ensure all fields exist (defensive)
  return {
    totalPoints: data.totalPoints ?? 0,
    completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons : [],
    quizResults: Array.isArray(data.quizResults) ? data.quizResults : [],
    lessonsProgress: Array.isArray(data.lessonsProgress) ? data.lessonsProgress : [],
    lastActive: data.lastActive ?? '',
    totalStudyMinutes: data.totalStudyMinutes ?? 0,
    weeklyActivity: data.weeklyActivity && typeof data.weeklyActivity === 'object' ? data.weeklyActivity : {},
  };
}

function saveProgressData(data: StudentProgress): void {
  const result = saveUserData('student_progress', data);
  if (!result) {
    monitorEvent('progress_save_failed', { error: 'saveUserData returned false' });
  }
}

export function getStudentProgress(): StudentProgress {
  return getProgressData();
}

export function addPoints(points: number): number {
  const data = getProgressData();
  data.totalPoints += points;
  data.lastActive = new Date().toISOString();
  saveProgressData(data);
  // Notify header to update points display
  window.dispatchEvent(new Event('points-updated'));
  return data.totalPoints;
}

export function completeLesson(lessonId: string, subjectId: string, points: number): void {
  const data = getProgressData();
  if (!data.completedLessons.includes(lessonId)) {
    data.completedLessons.push(lessonId);
    data.lessonsProgress.push({
      lessonId,
      subjectId,
      completedAt: new Date().toISOString(),
      pointsEarned: points,
    });
    data.totalPoints += points;
  }
  data.lastActive = new Date().toISOString();
  saveProgressData(data);
  // Notify header to update points display
  window.dispatchEvent(new Event('points-updated'));
}

export function recordQuizResult(quizId: string, skillId: string, score: number, totalQuestions: number, correctAnswers: number): void {
  const data = getProgressData();
  data.quizResults.push({
    quizId,
    skillId,
    score,
    totalQuestions,
    correctAnswers,
    date: new Date().toISOString(),
  });
  // Award points based on score
  const pointsEarned = Math.round((score / 100) * 20);
  data.totalPoints += pointsEarned;
  data.lastActive = new Date().toISOString();
  saveProgressData(data);
}

export function addStudyMinutes(minutes: number): void {
  const data = getProgressData();
  data.totalStudyMinutes += minutes;
  const today = new Date().toISOString().split('T')[0];
  data.weeklyActivity[today] = (data.weeklyActivity[today] || 0) + minutes;
  data.lastActive = new Date().toISOString();
  saveProgressData(data);
}

export function getWeeklyActivityData(): { day: string; minutes: number }[] {
  const data = getProgressData();
  const result: { day: string; minutes: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    result.push({
      day: dayNames[d.getDay()],
      minutes: data.weeklyActivity[dateStr] || 0,
    });
  }
  return result;
}

export function getSkillScores(): Record<string, { attempts: number; avgScore: number }> {
  const data = getProgressData();
  const skillMap: Record<string, { total: number; count: number }> = {};
  for (const result of data.quizResults) {
    if (!skillMap[result.skillId]) {
      skillMap[result.skillId] = { total: 0, count: 0 };
    }
    skillMap[result.skillId].total += result.score;
    skillMap[result.skillId].count += 1;
  }
  const scores: Record<string, { attempts: number; avgScore: number }> = {};
  for (const [skillId, { total, count }] of Object.entries(skillMap)) {
    scores[skillId] = { attempts: count, avgScore: Math.round(total / count) };
  }
  return scores;
}

export function resetProgress(): void {
  saveUserData('student_progress', DEFAULT_PROGRESS);
  saveUserData('streak_data', { count: 0, lastDate: '' });
  saveUserData('wrong_answers', {});
  saveUserData('achievements', {});
  saveUserData('mastery_records', []);
}

export function getLevel(points: number): number {
  return Math.floor(points / 50) + 1;
}

export function getPointsForNextLevel(points: number): { current: number; needed: number; progress: number } {
  const currentLevel = getLevel(points);
  const pointsForCurrentLevel = (currentLevel - 1) * 50;
  const pointsInCurrentLevel = points - pointsForCurrentLevel;
  return {
    current: pointsInCurrentLevel,
    needed: 50,
    progress: Math.round((pointsInCurrentLevel / 50) * 100),
  };
}

interface StreakData {
  count: number;
  lastDate: string;
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getStreakData(): StreakData {
  return loadUserData<StreakData>('streak_data', { count: 0, lastDate: '' });
}

function saveStreakData(data: StreakData): void {
  saveUserData('streak_data', data);
}

export function getStreak(): number {
  const data = getStreakData();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  if (data.lastDate === today || data.lastDate === yesterday) {
    return data.count;
  }
  return 0;
}

export function updateStreak(): number {
  const data = getStreakData();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  if (data.lastDate === today) {
    return data.count;
  }

  if (data.lastDate === yesterday) {
    data.count += 1;
  } else {
    data.count = 1;
  }
  data.lastDate = today;
  saveStreakData(data);
  return data.count;
}

export function getStreakBadge(streak: number): { label: string; emoji: string; color: string } | null {
  if (streak >= 30) return { label: 'أسطوري!', emoji: '🏆', color: 'from-yellow-400 to-amber-600' };
  if (streak >= 14) return { label: 'رائع!', emoji: '🔥', color: 'from-orange-500 to-red-600' };
  if (streak >= 7) return { label: 'مثابر!', emoji: '⭐', color: 'from-purple-500 to-indigo-600' };
  if (streak >= 3) return { label: 'بداية قوية!', emoji: '💪', color: 'from-blue-500 to-cyan-500' };
  return null;
}

// Wrong answers tracking
function getWrongAnswersMap(): Record<string, number> {
  return loadUserData<Record<string, number>>('wrong_answers', {});
}

function saveWrongAnswersMap(map: Record<string, number>): void {
  saveUserData('wrong_answers', map);
}

export function trackWrongAnswer(skill: string): void {
  if (!skill) return;
  const map = getWrongAnswersMap();
  map[skill] = (map[skill] || 0) + 1;
  saveWrongAnswersMap(map);
}

export function getWrongAnswers(): Record<string, number> {
  return getWrongAnswersMap();
}

export function checkWeakness(skill: string): boolean {
  const map = getWrongAnswersMap();
  return (map[skill] || 0) >= 3;
}

export function getWeaknesses(): string[] {
  const map = getWrongAnswersMap();
  return Object.entries(map)
    .filter(([, count]) => count >= 3)
    .map(([skill]) => skill);
}

export function getTopWeaknesses(limit = 3): { skill: string; count: number }[] {
  const map = getWrongAnswersMap();
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([skill, count]) => ({ skill, count }));
}

// Achievements system
export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: string;
}

function getAchievementsData(): Record<string, string> {
  return loadUserData<Record<string, string>>('achievements', {});
}

function saveAchievementsData(data: Record<string, string>): void {
  saveUserData('achievements', data);
}

export function unlockAchievement(id: string): boolean {
  const data = getAchievementsData();
  if (data[id]) return false; // already unlocked
  data[id] = new Date().toISOString();
  saveAchievementsData(data);
  return true;
}

export function getAchievements(completedLessons: number, points: number, streak: number, quizPassed: number): Achievement[] {
  const data = getAchievementsData();

  const achievements: Achievement[] = [
    {
      id: 'first_lesson',
      title: 'أول خطوة',
      description: 'أكمل أول درس',
      emoji: '📖',
      unlocked: completedLessons >= 1 || !!data['first_lesson'],
    },
    {
      id: 'five_lessons',
      title: 'متعلم نشط',
      description: 'أكمل 5 دروس',
      emoji: '📚',
      unlocked: completedLessons >= 5 || !!data['five_lessons'],
    },
    {
      id: 'first_quiz',
      title: 'أول اختبار',
      description: 'اجتز أول اختبار بنجاح',
      emoji: '✅',
      unlocked: quizPassed >= 1 || !!data['first_quiz'],
    },
    {
      id: 'streak_3',
      title: 'بداية قوية',
      description: '3 أيام متتالية من الدراسة',
      emoji: '💪',
      unlocked: streak >= 3 || !!data['streak_3'],
    },
    {
      id: 'streak_7',
      title: 'أسبوع كامل',
      description: '7 أيام متتالية من الدراسة',
      emoji: '⭐',
      unlocked: streak >= 7 || !!data['streak_7'],
    },
    {
      id: 'level_2',
      title: 'ترقية!',
      description: 'الوصول إلى المستوى 2',
      emoji: '🎯',
      unlocked: getLevel(points) >= 2 || !!data['level_2'],
    },
    {
      id: 'level_5',
      title: 'متقدم',
      description: 'الوصول إلى المستوى 5',
      emoji: '🚀',
      unlocked: getLevel(points) >= 5 || !!data['level_5'],
    },
    {
      id: 'points_100',
      title: 'جامع النقاط',
      description: 'اجمع 100 نقطة',
      emoji: '💎',
      unlocked: points >= 100 || !!data['points_100'],
    },
  ];

  // Auto-unlock and save
  achievements.forEach((a) => {
    if (a.unlocked && !data[a.id]) {
      unlockAchievement(a.id);
      a.unlockedAt = new Date().toISOString();
    }
    if (data[a.id]) {
      a.unlockedAt = data[a.id];
    }
  });

  return achievements;
}

// Motivational messages
export function getMotivationalMessage(completedToday: number, streak: number): string {
  if (completedToday >= 3) return '🌟 أداء استثنائي اليوم! أنت نجم حقيقي!';
  if (completedToday >= 2) return '🎉 رائع! أكملت درسين اليوم، واصل!';
  if (completedToday >= 1) return '👏 أحسنت! بداية رائعة لليوم!';
  if (streak >= 7) return '🔥 أسبوع كامل! أنت مثابر بشكل مذهل!';
  if (streak >= 3) return '💪 ثلاثة أيام متتالية! استمر!';
  return '📚 مرحباً! هيا نبدأ رحلة التعلم اليوم!';
}

// Daily plan helper
export function getDailyPlan(
  lessons: { id: number; title: string; subject_id: number }[],
  completedLessons: number[],
  subjects: { id: number; name: string }[]
): { lesson: { id: number; title: string; subject_id: number }; subjectName: string }[] {
  const incomplete = lessons.filter((l) => !completedLessons.includes(l.id));
  // Pick up to 3 lessons from different subjects if possible
  const plan: { lesson: typeof incomplete[0]; subjectName: string }[] = [];
  const usedSubjects = new Set<number>();

  for (const lesson of incomplete) {
    if (plan.length >= 3) break;
    if (!usedSubjects.has(lesson.subject_id)) {
      usedSubjects.add(lesson.subject_id);
      const subject = subjects.find((s) => s.id === lesson.subject_id);
      plan.push({ lesson, subjectName: subject?.name || '' });
    }
  }

  // Fill remaining slots
  for (const lesson of incomplete) {
    if (plan.length >= 3) break;
    if (!plan.find((p) => p.lesson.id === lesson.id)) {
      const subject = subjects.find((s) => s.id === lesson.subject_id);
      plan.push({ lesson, subjectName: subject?.name || '' });
    }
  }

  return plan;
}

// Parent status indicator
export function getStudentStatus(
  streak: number,
  avgScore: number,
  completedThisWeek: number
): { label: string; color: string; emoji: string } {
  const score =
    (streak >= 3 ? 2 : streak >= 1 ? 1 : 0) +
    (avgScore >= 80 ? 2 : avgScore >= 60 ? 1 : 0) +
    (completedThisWeek >= 5 ? 2 : completedThisWeek >= 2 ? 1 : 0);

  if (score >= 5) return { label: 'ممتاز', color: 'text-green-700 bg-green-100 border-green-300', emoji: '🌟' };
  if (score >= 3) return { label: 'جيد', color: 'text-blue-700 bg-blue-100 border-blue-300', emoji: '👍' };
  return { label: 'يحتاج متابعة', color: 'text-amber-700 bg-amber-100 border-amber-300', emoji: '⚠️' };
}