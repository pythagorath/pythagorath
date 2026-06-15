// Analytics Event Service - connects to backend analytics_events API
// Tracks user interactions for learning insights

import { client } from './api';

export type EventCategory = 
  | 'session' 
  | 'quiz' 
  | 'skill' 
  | 'navigation' 
  | 'engagement' 
  | 'error'
  | 'mission'
  | 'achievement';

export interface AnalyticsEvent {
  event_type: string;
  category: EventCategory;
  payload: Record<string, unknown>;
  timestamp?: string;
}

// Queue for batching events
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 10000; // 10 seconds
const MAX_QUEUE_SIZE = 20;

// Track an analytics event
export function trackEvent(
  eventType: string,
  category: EventCategory,
  payload: Record<string, unknown> = {}
): void {
  const event: AnalyticsEvent = {
    event_type: eventType,
    category,
    payload,
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(event);

  // Flush if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
  }
}

// Flush queued events to backend
async function flushEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    await client.from('analytics_events').insert(
      eventsToSend.map(e => ({
        event_type: e.event_type,
        category: e.category,
        payload: JSON.stringify(e.payload),
        event_timestamp: e.timestamp,
      }))
    );
  } catch (error) {
    // On failure, store locally for retry
    console.warn('Failed to flush analytics events:', error);
    const stored = JSON.parse(localStorage.getItem('pendingAnalytics') || '[]');
    stored.push(...eventsToSend);
    // Keep max 200 pending events
    localStorage.setItem('pendingAnalytics', JSON.stringify(stored.slice(-200)));
  }
}

// Retry sending pending events (call on app init when authenticated)
export async function retryPendingEvents(): Promise<void> {
  const stored = JSON.parse(localStorage.getItem('pendingAnalytics') || '[]');
  if (stored.length === 0) return;

  localStorage.removeItem('pendingAnalytics');
  eventQueue.push(...stored);
  await flushEvents();
}

// Convenience trackers
export function trackPageView(page: string): void {
  trackEvent('page_view', 'navigation', { page, url: window.location.pathname });
}

export function trackQuizStart(quizId: string, skillId: string): void {
  trackEvent('quiz_start', 'quiz', { quizId, skillId });
}

export function trackQuizComplete(
  quizId: string,
  skillId: string,
  score: number,
  totalQuestions: number,
  correctAnswers: number,
  timeSpentSeconds: number
): void {
  trackEvent('quiz_complete', 'quiz', {
    quizId,
    skillId,
    score,
    totalQuestions,
    correctAnswers,
    timeSpentSeconds,
    accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
  });
}

export function trackSkillPractice(skillId: string, masteryBefore: number, masteryAfter: number): void {
  trackEvent('skill_practice', 'skill', {
    skillId,
    masteryBefore,
    masteryAfter,
    improvement: masteryAfter - masteryBefore,
  });
}

export function trackMissionComplete(missionId: string, xpEarned: number): void {
  trackEvent('mission_complete', 'mission', { missionId, xpEarned });
}

export function trackAchievement(achievementId: string, name: string): void {
  trackEvent('achievement_unlocked', 'achievement', { achievementId, name });
}

export function trackEngagement(action: string, details: Record<string, unknown> = {}): void {
  trackEvent(action, 'engagement', details);
}

export function trackError(errorType: string, message: string, context?: Record<string, unknown>): void {
  trackEvent('error', 'error', { errorType, message, ...context });
}

// Session tracking integration
let currentSessionId: string | null = null;
let sessionStartTime: number | null = null;

export function startAnalyticsSession(): string {
  currentSessionId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStartTime = Date.now();
  trackEvent('session_start', 'session', { sessionId: currentSessionId });
  return currentSessionId;
}

export function endAnalyticsSession(metrics?: Record<string, unknown>): void {
  if (!currentSessionId || !sessionStartTime) return;
  
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);
  trackEvent('session_end', 'session', {
    sessionId: currentSessionId,
    durationSeconds: duration,
    ...metrics,
  });

  // Flush immediately on session end
  flushEvents();
  currentSessionId = null;
  sessionStartTime = null;
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (currentSessionId) {
      endAnalyticsSession();
    }
    flushEvents();
  });

  // Also flush on visibility change (mobile background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}