// Backend Progress Sync Service
// Syncs localStorage progress data to the backend when user is authenticated

import { client } from './api';

interface SyncableQuizResult {
  quiz_id: number;
  score: number;
  answers: string;
}

interface SyncableProgress {
  lesson_id: number;
  completed: boolean;
  completed_at: string;
}

// Save quiz attempt to backend
export async function syncQuizAttempt(quizId: number, score: number, answers: Record<string, number>): Promise<boolean> {
  try {
    await client.callEdgeFunction('save-progress', {
      body: {
        type: 'quiz_attempt',
        data: {
          quiz_id: quizId,
          score,
          answers: JSON.stringify(answers),
        },
      },
    });
    return true;
  } catch (error) {
    console.warn('Failed to sync quiz attempt to backend:', error);
    // Fallback: try direct entity API
    try {
      await client.from('quiz_attempts').insert({
        quiz_id: quizId,
        score,
        answers: JSON.stringify(answers),
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Save lesson completion to backend
export async function syncLessonProgress(lessonId: number, completedAt: string): Promise<boolean> {
  try {
    await client.from('student_progress').insert({
      lesson_id: lessonId,
      completed: true,
      completed_at: completedAt,
    });
    return true;
  } catch (error) {
    console.warn('Failed to sync lesson progress:', error);
    return false;
  }
}

// Fetch user's quiz history from backend
export async function fetchQuizHistory(): Promise<SyncableQuizResult[]> {
  try {
    const response = await client.from('quiz_attempts').select();
    if (response && Array.isArray(response)) {
      return response as SyncableQuizResult[];
    }
    return [];
  } catch {
    return [];
  }
}

// Fetch user's lesson progress from backend
export async function fetchLessonProgress(): Promise<SyncableProgress[]> {
  try {
    const response = await client.from('student_progress').select();
    if (response && Array.isArray(response)) {
      return response as SyncableProgress[];
    }
    return [];
  } catch {
    return [];
  }
}

// Batch sync all local progress to backend (called on login)
export async function batchSyncToBackend(
  quizResults: { quizId: string; skillId: string; score: number; totalQuestions: number; correctAnswers: number; date: string }[],
  completedLessons: { lessonId: string; completedAt: string }[]
): Promise<{ quizSynced: number; lessonsSynced: number }> {
  let quizSynced = 0;
  let lessonsSynced = 0;

  // Sync quiz results
  for (const result of quizResults) {
    const numericId = parseInt(result.quizId) || Math.abs(hashCode(result.quizId));
    const success = await syncQuizAttempt(numericId, result.score, { skill: parseInt(result.skillId) || 0 });
    if (success) quizSynced++;
  }

  // Sync lesson completions
  for (const lesson of completedLessons) {
    const numericId = parseInt(lesson.lessonId) || Math.abs(hashCode(lesson.lessonId));
    const success = await syncLessonProgress(numericId, lesson.completedAt);
    if (success) lessonsSynced++;
  }

  return { quizSynced, lessonsSynced };
}

// Simple hash function for string IDs
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// Check if backend sync is available (user is authenticated)
export function isSyncAvailable(): boolean {
  try {
    return !!client;
  } catch {
    return false;
  }
}