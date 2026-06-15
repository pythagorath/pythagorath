// Pilot Storage - Per-user isolated localStorage management
// Each user gets their own namespace to prevent data mixing

const CURRENT_USER_KEY = 'pilot_current_user';
const USER_PREFIX = 'pilot_user_';

/**
 * Get the storage key prefix for a specific user
 */
function getUserPrefix(userId: string): string {
  return `${USER_PREFIX}${userId}_`;
}

/**
 * Get current logged-in user ID
 */
export function getCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

/**
 * Set current user (on login)
 */
export function setCurrentUser(userId: string): void {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}

/**
 * Clear current user (on logout)
 */
export function clearCurrentUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Save data for the current user with write verification
 */
export function saveUserData(key: string, data: unknown): boolean {
  const userId = getCurrentUserId();
  if (!userId) return false;
  try {
    const fullKey = getUserPrefix(userId) + key;
    const serialized = JSON.stringify(data);
    // Guard against empty/invalid serialization
    if (!serialized || serialized === 'undefined') return false;
    localStorage.setItem(fullKey, serialized);
    // Verify write succeeded (guards against quota exceeded silent failures)
    const verify = localStorage.getItem(fullKey);
    return verify === serialized;
  } catch (err) {
    console.warn('[pilotStorage] saveUserData failed:', key, err);
    return false;
  }
}

/**
 * Load data for the current user with corruption detection
 */
export function loadUserData<T>(key: string, defaultValue: T): T {
  const userId = getCurrentUserId();
  if (!userId) return defaultValue;
  try {
    const fullKey = getUserPrefix(userId) + key;
    const raw = localStorage.getItem(fullKey);
    if (!raw || raw === 'undefined' || raw === 'null') return defaultValue;
    const parsed = JSON.parse(raw);
    // Guard: if defaultValue is an object/array, ensure parsed is same type
    if (defaultValue !== null && typeof defaultValue === 'object') {
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('[pilotStorage] Type mismatch for key:', key, '- returning default');
        return defaultValue;
      }
    }
    return parsed as T;
  } catch (err) {
    console.warn('[pilotStorage] loadUserData parse error:', key, err);
    // Remove corrupted data
    try {
      const fullKey = getUserPrefix(userId) + key;
      localStorage.removeItem(fullKey);
    } catch { /* ignore */ }
    return defaultValue;
  }
}

/**
 * Load data for a specific user (admin use)
 */
export function loadUserDataById<T>(userId: string, key: string, defaultValue: T): T {
  try {
    const fullKey = getUserPrefix(userId) + key;
    const raw = localStorage.getItem(fullKey);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Return default on error
  }
  return defaultValue;
}

/**
 * Reset all progress data for a specific user (admin function)
 */
export function resetUserProgress(userId: string): void {
  const prefix = getUserPrefix(userId);
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Get all user IDs that have data stored
 */
export function getAllUserIdsWithData(): string[] {
  const userIds = new Set<string>();
  const prefixLen = USER_PREFIX.length;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(USER_PREFIX)) {
      const rest = key.slice(prefixLen);
      const underscoreIdx = rest.indexOf('_');
      if (underscoreIdx > 0) {
        userIds.add(rest.slice(0, underscoreIdx));
      }
    }
  }
  return Array.from(userIds);
}

/**
 * Get summary of a user's progress
 */
export function getUserProgressSummary(userId: string): {
  totalPoints: number;
  completedLessons: number;
  quizResults: number;
  streak: number;
  lastActive: string;
} {
  const progress = loadUserDataById(userId, 'student_progress', {
    totalPoints: 0,
    completedLessons: [],
    quizResults: [],
    lastActive: '',
  });
  const streakData = loadUserDataById(userId, 'streak_data', { count: 0, lastDate: '' });

  return {
    totalPoints: (progress as { totalPoints: number }).totalPoints || 0,
    completedLessons: Array.isArray((progress as { completedLessons: string[] }).completedLessons)
      ? (progress as { completedLessons: string[] }).completedLessons.length
      : 0,
    quizResults: Array.isArray((progress as { quizResults: unknown[] }).quizResults)
      ? (progress as { quizResults: unknown[] }).quizResults.length
      : 0,
    streak: (streakData as { count: number }).count || 0,
    lastActive: (progress as { lastActive: string }).lastActive || 'لم يسجل دخول بعد',
  };
}