// Assessment Intelligence Sprint - Cognitive Interaction Analysis
// Tracks behavioral signals: hesitation, retries, frustration, engagement
// Feeds signals into the decision engine for adaptive responses

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface InteractionEvent {
  id: string;
  studentId: string;
  sessionId: string;
  timestamp: string;
  eventType: InteractionEventType;
  metadata: Record<string, number | string | boolean>;
}

export type InteractionEventType =
  | 'answer_submitted'
  | 'answer_changed'
  | 'hint_requested'
  | 'question_skipped'
  | 'long_pause'
  | 'rapid_answers'
  | 'back_navigation'
  | 'retry_attempt'
  | 'frustration_signal'
  | 'engagement_drop'
  | 'focus_lost'
  | 'focus_regained';

export interface BehavioralProfile {
  studentId: string;
  sessionId: string;
  updatedAt: string;
  metrics: BehavioralMetrics;
  patterns: BehavioralPattern[];
  cognitiveState: CognitiveState;
  recommendations: BehavioralRecommendation[];
}

export interface BehavioralMetrics {
  avgResponseTime: number;
  responseTimeVariance: number;
  hesitationCount: number; // pauses > 15s
  rushCount: number; // responses < 2s
  retryCount: number;
  hintRequestCount: number;
  skipCount: number;
  answerChangeCount: number;
  correctAfterHesitation: number;
  incorrectAfterRush: number;
  totalInteractions: number;
  sessionDurationMs: number;
  activeTimeMs: number; // time actually engaged
  idleTimeMs: number; // time idle/unfocused
}

export interface BehavioralPattern {
  type: PatternType;
  confidence: number; // 0-100
  frequency: number; // times observed
  lastObserved: string;
  educationalImpact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export type PatternType =
  | 'consistent_hesitation'    // Always slow, thinking carefully
  | 'speed_accuracy_tradeoff'  // Fast but inaccurate
  | 'improvement_after_hint'   // Hints help significantly
  | 'frustration_spiral'       // Errors lead to more errors
  | 'warm_up_effect'           // Better performance after first few questions
  | 'fatigue_decline'          // Performance drops over time
  | 'retry_persistence'        // Keeps trying after failure
  | 'avoidance_behavior'       // Skips difficult questions
  | 'guessing_pattern'         // Random fast answers
  | 'careful_methodical';      // Slow, accurate, systematic

export interface CognitiveState {
  attention: number; // 0-100
  frustration: number; // 0-100
  engagement: number; // 0-100
  fatigue: number; // 0-100
  confidence: number; // 0-100
  cognitiveLoad: number; // 0-100
  overallReadiness: number; // 0-100, composite score
}

export interface BehavioralRecommendation {
  action: RecommendedAction;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  trigger: string;
}

export type RecommendedAction =
  | 'slow_down_pacing'
  | 'increase_difficulty'
  | 'decrease_difficulty'
  | 'offer_break'
  | 'provide_encouragement'
  | 'switch_activity_type'
  | 'provide_hint'
  | 'revisit_prerequisite'
  | 'end_session'
  | 'celebrate_progress';

// ============ Configuration ============

const CONFIG = {
  hesitationThresholdMs: 15000,
  rushThresholdMs: 2000,
  frustrationWindow: 5, // last N interactions
  frustrationThreshold: 3, // N wrong in window = frustration
  fatigueCheckInterval: 8, // check every N interactions
  engagementDecayRate: 0.05, // per idle second
  maxSessionMinutes: 25,
  breakSuggestionMinutes: 15,
};

// ============ Session Tracker ============

export class InteractionTracker {
  private events: InteractionEvent[] = [];
  private studentId: string;
  private sessionId: string;
  private sessionStart: number;
  private lastActivityTime: number;

  constructor(studentId: string, sessionId: string) {
    this.studentId = studentId;
    this.sessionId = sessionId;
    this.sessionStart = Date.now();
    this.lastActivityTime = Date.now();
  }

  recordEvent(eventType: InteractionEventType, metadata: Record<string, number | string | boolean> = {}): void {
    const event: InteractionEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      studentId: this.studentId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      eventType,
      metadata,
    };
    this.events.push(event);
    this.lastActivityTime = Date.now();
  }

  recordAnswer(isCorrect: boolean, responseTimeMs: number, wasChanged: boolean = false): void {
    this.recordEvent('answer_submitted', { isCorrect, responseTimeMs, wasChanged });

    if (responseTimeMs > CONFIG.hesitationThresholdMs) {
      this.recordEvent('long_pause', { durationMs: responseTimeMs });
    }
    if (responseTimeMs < CONFIG.rushThresholdMs) {
      this.recordEvent('rapid_answers', { responseTimeMs });
    }
    if (wasChanged) {
      this.recordEvent('answer_changed', { responseTimeMs });
    }
  }

  recordHintRequest(): void {
    this.recordEvent('hint_requested', {});
  }

  recordSkip(): void {
    this.recordEvent('question_skipped', {});
  }

  recordRetry(): void {
    this.recordEvent('retry_attempt', {});
  }

  // ============ Analysis ============

  getMetrics(): BehavioralMetrics {
    const answerEvents = this.events.filter(e => e.eventType === 'answer_submitted');
    const responseTimes = answerEvents.map(e => Number(e.metadata.responseTimeMs) || 0);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length
      : 0;

    const variance = responseTimes.length > 1
      ? responseTimes.reduce((s, t) => s + Math.pow(t - avgResponseTime, 2), 0) / responseTimes.length
      : 0;

    const sessionDuration = Date.now() - this.sessionStart;
    const idleTime = Math.max(0, sessionDuration - responseTimes.reduce((s, t) => s + Math.min(t, 30000), 0));

    return {
      avgResponseTime: Math.round(avgResponseTime),
      responseTimeVariance: Math.round(variance),
      hesitationCount: this.events.filter(e => e.eventType === 'long_pause').length,
      rushCount: this.events.filter(e => e.eventType === 'rapid_answers').length,
      retryCount: this.events.filter(e => e.eventType === 'retry_attempt').length,
      hintRequestCount: this.events.filter(e => e.eventType === 'hint_requested').length,
      skipCount: this.events.filter(e => e.eventType === 'question_skipped').length,
      answerChangeCount: this.events.filter(e => e.eventType === 'answer_changed').length,
      correctAfterHesitation: answerEvents.filter(e =>
        Number(e.metadata.responseTimeMs) > CONFIG.hesitationThresholdMs && e.metadata.isCorrect
      ).length,
      incorrectAfterRush: answerEvents.filter(e =>
        Number(e.metadata.responseTimeMs) < CONFIG.rushThresholdMs && !e.metadata.isCorrect
      ).length,
      totalInteractions: this.events.length,
      sessionDurationMs: sessionDuration,
      activeTimeMs: sessionDuration - idleTime,
      idleTimeMs: idleTime,
    };
  }

  getCognitiveState(): CognitiveState {
    const metrics = this.getMetrics();
    const answerEvents = this.events.filter(e => e.eventType === 'answer_submitted');
    const recentAnswers = answerEvents.slice(-CONFIG.frustrationWindow);

    // Attention: based on response time consistency and focus
    const attention = Math.max(0, Math.min(100,
      100 - (metrics.idleTimeMs / Math.max(1, metrics.sessionDurationMs)) * 100
      - metrics.skipCount * 10
    ));

    // Frustration: based on recent errors and behavioral signals
    const recentErrors = recentAnswers.filter(e => !e.metadata.isCorrect).length;
    const frustration = Math.min(100, Math.max(0,
      recentErrors * 20
      + metrics.retryCount * 5
      + metrics.skipCount * 15
      - metrics.hintRequestCount * 5 // Asking for help reduces frustration
    ));

    // Engagement: based on activity patterns
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    const baseEngagement = 100 - (timeSinceLastActivity / 1000) * CONFIG.engagementDecayRate * 100;
    const engagement = Math.max(0, Math.min(100,
      baseEngagement - metrics.skipCount * 10 + (metrics.retryCount > 0 ? 10 : 0)
    ));

    // Fatigue: based on session duration and performance decline
    const sessionMinutes = metrics.sessionDurationMs / 60000;
    const fatigue = Math.min(100, Math.max(0,
      (sessionMinutes / CONFIG.maxSessionMinutes) * 60
      + (metrics.hesitationCount > 3 ? 20 : 0)
    ));

    // Confidence: based on recent success rate
    const recentCorrect = recentAnswers.filter(e => e.metadata.isCorrect).length;
    const confidence = recentAnswers.length > 0
      ? Math.round((recentCorrect / recentAnswers.length) * 100)
      : 50;

    // Cognitive load: based on response time and hesitation
    const cognitiveLoad = Math.min(100, Math.max(0,
      (metrics.avgResponseTime / 10000) * 40
      + metrics.hesitationCount * 10
      + metrics.answerChangeCount * 15
    ));

    // Overall readiness
    const overallReadiness = Math.round(
      attention * 0.2 +
      (100 - frustration) * 0.25 +
      engagement * 0.2 +
      (100 - fatigue) * 0.2 +
      confidence * 0.15
    );

    return {
      attention: Math.round(attention),
      frustration: Math.round(frustration),
      engagement: Math.round(engagement),
      fatigue: Math.round(fatigue),
      confidence: Math.round(confidence),
      cognitiveLoad: Math.round(cognitiveLoad),
      overallReadiness: Math.round(overallReadiness),
    };
  }

  detectPatterns(): BehavioralPattern[] {
    const metrics = this.getMetrics();
    const patterns: BehavioralPattern[] = [];
    const now = new Date().toISOString();

    // Speed-accuracy tradeoff
    if (metrics.rushCount > 3 && metrics.incorrectAfterRush > 2) {
      patterns.push({
        type: 'speed_accuracy_tradeoff',
        confidence: Math.min(90, 50 + metrics.incorrectAfterRush * 15),
        frequency: metrics.incorrectAfterRush,
        lastObserved: now,
        educationalImpact: 'negative',
        description: 'يجيب بسرعة لكن بدقة منخفضة',
      });
    }

    // Frustration spiral
    const answerEvents = this.events.filter(e => e.eventType === 'answer_submitted');
    let consecutiveWrong = 0;
    let maxConsecutiveWrong = 0;
    for (const evt of answerEvents) {
      if (!evt.metadata.isCorrect) { consecutiveWrong++; maxConsecutiveWrong = Math.max(maxConsecutiveWrong, consecutiveWrong); }
      else consecutiveWrong = 0;
    }
    if (maxConsecutiveWrong >= 4) {
      patterns.push({
        type: 'frustration_spiral',
        confidence: Math.min(90, 40 + maxConsecutiveWrong * 12),
        frequency: 1,
        lastObserved: now,
        educationalImpact: 'negative',
        description: 'سلسلة أخطاء متتالية تشير لإحباط',
      });
    }

    // Improvement after hint
    if (metrics.hintRequestCount > 0) {
      const hintIndices = this.events.map((e, i) => e.eventType === 'hint_requested' ? i : -1).filter(i => i >= 0);
      let correctAfterHint = 0;
      for (const idx of hintIndices) {
        const nextAnswer = this.events.slice(idx + 1).find(e => e.eventType === 'answer_submitted');
        if (nextAnswer?.metadata.isCorrect) correctAfterHint++;
      }
      if (correctAfterHint > 0) {
        patterns.push({
          type: 'improvement_after_hint',
          confidence: Math.min(85, 40 + correctAfterHint * 20),
          frequency: correctAfterHint,
          lastObserved: now,
          educationalImpact: 'positive',
          description: 'يستفيد من التلميحات بشكل جيد',
        });
      }
    }

    // Avoidance behavior
    if (metrics.skipCount >= 3) {
      patterns.push({
        type: 'avoidance_behavior',
        confidence: Math.min(85, 40 + metrics.skipCount * 15),
        frequency: metrics.skipCount,
        lastObserved: now,
        educationalImpact: 'negative',
        description: 'يتجنب الأسئلة الصعبة بالتخطي',
      });
    }

    // Guessing pattern
    if (metrics.rushCount > 5 && metrics.incorrectAfterRush / Math.max(1, metrics.rushCount) > 0.6) {
      patterns.push({
        type: 'guessing_pattern',
        confidence: Math.min(90, 50 + metrics.rushCount * 8),
        frequency: metrics.rushCount,
        lastObserved: now,
        educationalImpact: 'negative',
        description: 'نمط تخمين: إجابات سريعة عشوائية',
      });
    }

    // Careful methodical
    if (metrics.avgResponseTime > 8000 && metrics.totalInteractions > 5) {
      const correctRate = answerEvents.filter(e => e.metadata.isCorrect).length / Math.max(1, answerEvents.length);
      if (correctRate > 0.7) {
        patterns.push({
          type: 'careful_methodical',
          confidence: 75,
          frequency: answerEvents.length,
          lastObserved: now,
          educationalImpact: 'positive',
          description: 'أسلوب منهجي: بطيء لكن دقيق',
        });
      }
    }

    return patterns;
  }

  getRecommendations(): BehavioralRecommendation[] {
    const state = this.getCognitiveState();
    const patterns = this.detectPatterns();
    const metrics = this.getMetrics();
    const recommendations: BehavioralRecommendation[] = [];

    // High frustration
    if (state.frustration > 70) {
      recommendations.push({
        action: 'decrease_difficulty',
        priority: 'high',
        reason: 'مستوى إحباط مرتفع',
        trigger: `frustration=${state.frustration}`,
      });
      recommendations.push({
        action: 'provide_encouragement',
        priority: 'high',
        reason: 'يحتاج دعم معنوي',
        trigger: `frustration=${state.frustration}`,
      });
    }

    // High fatigue
    if (state.fatigue > 70) {
      recommendations.push({
        action: 'offer_break',
        priority: 'high',
        reason: 'إرهاق واضح',
        trigger: `fatigue=${state.fatigue}`,
      });
    }

    // Session too long
    if (metrics.sessionDurationMs > CONFIG.breakSuggestionMinutes * 60000) {
      recommendations.push({
        action: 'offer_break',
        priority: 'medium',
        reason: `جلسة طويلة: ${Math.round(metrics.sessionDurationMs / 60000)} دقيقة`,
        trigger: 'session_duration',
      });
    }

    // Guessing pattern
    if (patterns.some(p => p.type === 'guessing_pattern')) {
      recommendations.push({
        action: 'slow_down_pacing',
        priority: 'high',
        reason: 'نمط تخمين مكتشف',
        trigger: 'guessing_detected',
      });
    }

    // Low engagement
    if (state.engagement < 40) {
      recommendations.push({
        action: 'switch_activity_type',
        priority: 'medium',
        reason: 'انخفاض المشاركة',
        trigger: `engagement=${state.engagement}`,
      });
    }

    // High confidence + good performance = increase difficulty
    if (state.confidence > 80 && state.frustration < 20) {
      recommendations.push({
        action: 'increase_difficulty',
        priority: 'low',
        reason: 'أداء ممتاز، يمكن زيادة التحدي',
        trigger: `confidence=${state.confidence}`,
      });
    }

    return recommendations;
  }

  // ============ Persistence ============

  getProfile(): BehavioralProfile {
    return {
      studentId: this.studentId,
      sessionId: this.sessionId,
      updatedAt: new Date().toISOString(),
      metrics: this.getMetrics(),
      patterns: this.detectPatterns(),
      cognitiveState: this.getCognitiveState(),
      recommendations: this.getRecommendations(),
    };
  }

  save(): void {
    const profile = this.getProfile();
    saveUserData(`interaction_profile_${this.studentId}_${this.sessionId}`, profile);

    // Update aggregate
    const aggregate = loadUserData<BehavioralProfile[]>(`interaction_history_${this.studentId}`) || [];
    aggregate.push(profile);
    saveUserData(`interaction_history_${this.studentId}`, aggregate.slice(-20));
  }
}

// ============ Analytics Functions ============

export function getStudentInteractionHistory(studentId: string): BehavioralProfile[] {
  return loadUserData<BehavioralProfile[]>(`interaction_history_${studentId}`) || [];
}

export function getClassBehavioralSummary(studentIds: string[]): {
  avgEngagement: number;
  avgFrustration: number;
  avgFatigue: number;
  commonPatterns: { type: PatternType; count: number }[];
  studentsNeedingAttention: string[];
} {
  let totalEngagement = 0;
  let totalFrustration = 0;
  let totalFatigue = 0;
  let count = 0;
  const patternCounts: Partial<Record<PatternType, number>> = {};
  const needAttention: string[] = [];

  for (const studentId of studentIds) {
    const history = getStudentInteractionHistory(studentId);
    if (history.length === 0) continue;
    const latest = history[history.length - 1];

    totalEngagement += latest.cognitiveState.engagement;
    totalFrustration += latest.cognitiveState.frustration;
    totalFatigue += latest.cognitiveState.fatigue;
    count++;

    if (latest.cognitiveState.frustration > 60 || latest.cognitiveState.engagement < 30) {
      needAttention.push(studentId);
    }

    for (const pattern of latest.patterns) {
      patternCounts[pattern.type] = (patternCounts[pattern.type] || 0) + 1;
    }
  }

  const commonPatterns = Object.entries(patternCounts)
    .map(([type, cnt]) => ({ type: type as PatternType, count: cnt }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    avgEngagement: count > 0 ? Math.round(totalEngagement / count) : 0,
    avgFrustration: count > 0 ? Math.round(totalFrustration / count) : 0,
    avgFatigue: count > 0 ? Math.round(totalFatigue / count) : 0,
    commonPatterns,
    studentsNeedingAttention: needAttention,
  };
}