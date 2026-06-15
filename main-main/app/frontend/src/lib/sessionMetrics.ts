// Real Usage & Learning Validation Sprint - Session Flow Metrics
// Tracks and analyzes session-level engagement data

export interface SessionMetric {
  sessionId: string;
  date: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  questionsAttempted: number;
  questionsCorrect: number;
  skillsWorkedOn: string[];
  missionsCompleted: number;
  missionsTotal: number;
  fatigueDetected: boolean;
  fatigueAtQuestion: number | null;
  engagementScore: number;
}

export interface AggregateMetrics {
  avgSessionTime: number;
  questionCompletionRate: number;
  retryRate: number;
  missionCompletionRate: number;
  masteryGrowthSpeed: number;
  dailyReturnRate: number;
  avgEngagement: number;
  peakEngagementDay: string;
  lowestEngagementDay: string;
}

const METRICS_KEY = 'pythagorasSessionMetrics';

export function getSessionMetrics(): SessionMetric[] {
  return JSON.parse(localStorage.getItem(METRICS_KEY) || '[]');
}

export function saveSessionMetric(metric: SessionMetric): void {
  const metrics = getSessionMetrics();
  metrics.push(metric);
  // Keep last 100 sessions
  const trimmed = metrics.slice(-100);
  localStorage.setItem(METRICS_KEY, JSON.stringify(trimmed));
}

export function startSession(): { sessionId: string; startTime: number } {
  return {
    sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime: Date.now(),
  };
}

export function endSession(
  sessionId: string,
  startTime: number,
  data: {
    questionsAttempted: number;
    questionsCorrect: number;
    skillsWorkedOn: string[];
    missionsCompleted: number;
    missionsTotal: number;
    fatigueDetected: boolean;
    fatigueAtQuestion: number | null;
  }
): SessionMetric {
  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  const completionRate = data.questionsAttempted > 0
    ? data.questionsCorrect / data.questionsAttempted
    : 0;
  const missionRate = data.missionsTotal > 0
    ? data.missionsCompleted / data.missionsTotal
    : 0;

  const engagementScore = Math.round(
    completionRate * 40 +
    missionRate * 30 +
    (durationMinutes >= 5 ? 20 : durationMinutes * 4) +
    (!data.fatigueDetected ? 10 : 0)
  );

  const metric: SessionMetric = {
    sessionId,
    date: new Date().toISOString().split('T')[0],
    startTime,
    endTime,
    durationMinutes,
    questionsAttempted: data.questionsAttempted,
    questionsCorrect: data.questionsCorrect,
    skillsWorkedOn: data.skillsWorkedOn,
    missionsCompleted: data.missionsCompleted,
    missionsTotal: data.missionsTotal,
    fatigueDetected: data.fatigueDetected,
    fatigueAtQuestion: data.fatigueAtQuestion,
    engagementScore,
  };

  saveSessionMetric(metric);
  return metric;
}

export function calculateAggregateMetrics(metrics: SessionMetric[]): AggregateMetrics {
  if (metrics.length === 0) {
    return {
      avgSessionTime: 0,
      questionCompletionRate: 0,
      retryRate: 0,
      missionCompletionRate: 0,
      masteryGrowthSpeed: 0,
      dailyReturnRate: 0,
      avgEngagement: 0,
      peakEngagementDay: '-',
      lowestEngagementDay: '-',
    };
  }

  const totalTime = metrics.reduce((s, m) => s + m.durationMinutes, 0);
  const totalQuestions = metrics.reduce((s, m) => s + m.questionsAttempted, 0);
  const totalCorrect = metrics.reduce((s, m) => s + m.questionsCorrect, 0);
  const totalMissions = metrics.reduce((s, m) => s + m.missionsTotal, 0);
  const totalMissionsCompleted = metrics.reduce((s, m) => s + m.missionsCompleted, 0);

  // Daily return rate: unique days with sessions / total span days
  const dates = [...new Set(metrics.map(m => m.date))].sort();
  const spanDays = dates.length > 1
    ? Math.ceil((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  // Group by date for peak/lowest
  const byDate: Record<string, number[]> = {};
  metrics.forEach(m => {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m.engagementScore);
  });

  const dateAvgs = Object.entries(byDate).map(([date, scores]) => ({
    date,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
  dateAvgs.sort((a, b) => b.avg - a.avg);

  return {
    avgSessionTime: Math.round(totalTime / metrics.length),
    questionCompletionRate: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    retryRate: Math.round(
      (metrics.filter(m => m.questionsAttempted > 0 && m.questionsCorrect / m.questionsAttempted < 0.5).length / metrics.length) * 100
    ),
    missionCompletionRate: totalMissions > 0 ? Math.round((totalMissionsCompleted / totalMissions) * 100) : 0,
    masteryGrowthSpeed: 0, // Calculated externally from simulation
    dailyReturnRate: Math.round((dates.length / spanDays) * 100),
    avgEngagement: Math.round(metrics.reduce((s, m) => s + m.engagementScore, 0) / metrics.length),
    peakEngagementDay: dateAvgs[0]?.date || '-',
    lowestEngagementDay: dateAvgs[dateAvgs.length - 1]?.date || '-',
  };
}