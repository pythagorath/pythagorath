// Real Usage & Learning Validation Sprint - Learning Simulator
// Simulates 3 student profiles over 7/14/30 days to validate the mastery engine

import type { StudentSkillProgress, Skill, Question } from '@/data/mathSkillsData';
import { skills, getQuestionsForSkill } from '@/data/mathSkillsData';
import { skillPrerequisites } from '@/data/skillPrerequisites';
import { calculateMasteryV2, updateProgressV2 } from './masteryEngineV2';
import { generateAdaptiveMissions } from './adaptiveMissions';

// ===== Student Profile Types =====
export interface SimulatedProfile {
  id: string;
  name: string;
  type: 'weak' | 'medium' | 'strong';
  grade: 1 | 2;
  characteristics: {
    baseAccuracy: number; // 0-1
    learningRate: number; // how fast they improve per session
    retentionRate: number; // how well they retain (0-1)
    attentionSpan: number; // minutes before fatigue
    motivationDecay: number; // how fast motivation drops in session
    errorPatterns: string[]; // common error types
    avgResponseTime: number; // seconds per question
    dailyReturnProbability: number; // 0-1, chance of returning next day
  };
}

export interface DaySimulation {
  day: number;
  date: string;
  sessionsCompleted: number;
  questionsAnswered: number;
  correctAnswers: number;
  missionsGenerated: number;
  missionsCompleted: number;
  skillsWorkedOn: string[];
  masteryGrowth: number; // average mastery change
  sessionMinutes: number;
  engagementScore: number; // 0-100
  fatiguePoint: number | null; // question # where fatigue kicked in
  retentionReviewsDone: number;
  streakDay: number;
  didReturn: boolean;
}

export interface SimulationResult {
  profile: SimulatedProfile;
  days: DaySimulation[];
  finalProgress: StudentSkillProgress[];
  metrics: SimulationMetrics;
  frictionPoints: FrictionPoint[];
  learningInsights: LearningInsight[];
}

export interface SimulationMetrics {
  totalDays: number;
  activeDays: number;
  totalQuestions: number;
  totalCorrect: number;
  overallAccuracy: number;
  avgSessionMinutes: number;
  avgQuestionsPerDay: number;
  completionRate: number;
  retryRate: number;
  missionCompletionRate: number;
  masteryGrowthSpeed: number; // skills mastered per week
  retentionEffectiveness: number; // % retained after review
  streakMax: number;
  streakBreaks: number;
  skillsMastered: number;
  skillsInProgress: number;
  skillsNotStarted: number;
  prerequisiteRecoveries: number;
}

export interface FrictionPoint {
  type: 'boredom' | 'complexity' | 'repetition' | 'visual_overload' | 'confusion';
  day: number;
  skillId: string;
  skillName: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LearningInsight {
  category: 'diagnosis' | 'prerequisites' | 'treatment' | 'missions' | 'retention';
  finding: string;
  isPositive: boolean;
  evidence: string;
}

// ===== Profile Definitions =====
export const studentProfiles: SimulatedProfile[] = [
  {
    id: 'weak-student',
    name: 'أحمد (طالب ضعيف)',
    type: 'weak',
    grade: 1,
    characteristics: {
      baseAccuracy: 0.3,
      learningRate: 0.02,
      retentionRate: 0.5,
      attentionSpan: 8,
      motivationDecay: 0.15,
      errorPatterns: ['counting_error', 'place_value_confusion', 'operation_mix'],
      avgResponseTime: 25,
      dailyReturnProbability: 0.6,
    },
  },
  {
    id: 'medium-student',
    name: 'فاطمة (طالبة متوسطة)',
    type: 'medium',
    grade: 1,
    characteristics: {
      baseAccuracy: 0.6,
      learningRate: 0.05,
      retentionRate: 0.75,
      attentionSpan: 15,
      motivationDecay: 0.08,
      errorPatterns: ['careless_mistake', 'word_problem_misread'],
      avgResponseTime: 15,
      dailyReturnProbability: 0.8,
    },
  },
  {
    id: 'strong-student',
    name: 'سارة (طالبة قوية)',
    type: 'strong',
    grade: 1,
    characteristics: {
      baseAccuracy: 0.85,
      learningRate: 0.08,
      retentionRate: 0.9,
      attentionSpan: 25,
      motivationDecay: 0.04,
      errorPatterns: ['speed_error'],
      avgResponseTime: 8,
      dailyReturnProbability: 0.92,
    },
  },
];

// ===== Simulation Engine =====

function initializeProgress(gradeSkills: Skill[]): StudentSkillProgress[] {
  return gradeSkills.map(skill => ({
    skillId: skill.id,
    attempts: 0,
    correctCount: 0,
    lastScore: 0,
    lastAttemptDate: '',
    status: 'not_started' as const,
    history: [],
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
  }));
}

function simulateQuestionAnswer(
  profile: SimulatedProfile,
  questionIndex: number,
  difficulty: 'easy' | 'medium' | 'hard',
  currentMastery: number
): boolean {
  const { baseAccuracy, motivationDecay, attentionSpan } = profile.characteristics;

  // Fatigue factor: accuracy drops after attention span
  const minutesElapsed = questionIndex * (profile.characteristics.avgResponseTime / 60);
  const fatigueFactor = minutesElapsed > attentionSpan
    ? Math.max(0.5, 1 - (minutesElapsed - attentionSpan) * motivationDecay)
    : 1;

  // Difficulty modifier
  const difficultyMod = difficulty === 'easy' ? 1.2 : difficulty === 'hard' ? 0.7 : 1.0;

  // Mastery boost: higher mastery = better accuracy
  const masteryBoost = currentMastery * 0.003; // 0-0.3 boost

  // Calculate probability of correct answer
  const probability = Math.min(0.95, (baseAccuracy + masteryBoost) * fatigueFactor * difficultyMod);

  return Math.random() < probability;
}

function detectFriction(
  profile: SimulatedProfile,
  day: number,
  skillId: string,
  skillName: string,
  questionsAnswered: number,
  correctRate: number,
  progress: StudentSkillProgress[]
): FrictionPoint | null {
  const { attentionSpan, characteristics } = { attentionSpan: profile.characteristics.attentionSpan, characteristics: profile.characteristics };

  // Boredom: too many easy questions for strong student
  if (profile.type === 'strong' && correctRate > 0.95 && questionsAnswered > 5) {
    return {
      type: 'boredom',
      day,
      skillId,
      skillName,
      description: 'أسئلة سهلة جداً للطالب المتقدم - يحتاج تحدي أكبر',
      severity: 'medium',
    };
  }

  // Complexity: too many wrong answers in a row
  if (correctRate < 0.25 && questionsAnswered >= 4) {
    return {
      type: 'complexity',
      day,
      skillId,
      skillName,
      description: 'المهارة صعبة جداً - الطالب يحتاج تبسيط أو مراجعة المتطلبات',
      severity: 'high',
    };
  }

  // Repetition: same skill practiced too many times without progress
  const skillProgress = progress.find(p => p.skillId === skillId);
  if (skillProgress && skillProgress.attempts > 15 && skillProgress.status === 'needs_practice') {
    return {
      type: 'repetition',
      day,
      skillId,
      skillName,
      description: 'تكرار بدون تقدم - يحتاج أسلوب مختلف',
      severity: 'high',
    };
  }

  // Visual overload: session too long
  const sessionMinutes = questionsAnswered * (characteristics.avgResponseTime / 60);
  if (sessionMinutes > attentionSpan * 1.5) {
    return {
      type: 'visual_overload',
      day,
      skillId,
      skillName,
      description: 'جلسة طويلة جداً - الطفل متعب بصرياً',
      severity: 'medium',
    };
  }

  // Confusion: oscillating scores (correct-wrong-correct-wrong)
  if (skillProgress && skillProgress.history.length >= 4) {
    const lastFour = skillProgress.history.slice(-4).map(h => h.score);
    const oscillating = lastFour.every((s, i) =>
      i === 0 || (s > 60) !== (lastFour[i - 1] > 60)
    );
    if (oscillating) {
      return {
        type: 'confusion',
        day,
        skillId,
        skillName,
        description: 'أداء متذبذب - الطالب لم يفهم المفهوم بوضوح',
        severity: 'medium',
      };
    }
  }

  return null;
}

export function runSimulation(
  profile: SimulatedProfile,
  durationDays: number
): SimulationResult {
  const gradeSkills = skills.filter(s => s.grade === profile.grade);
  let progress = initializeProgress(gradeSkills);
  const days: DaySimulation[] = [];
  const frictionPoints: FrictionPoint[] = [];
  let currentStreak = 0;
  let maxStreak = 0;
  let streakBreaks = 0;
  let totalMissionsGenerated = 0;
  let totalMissionsCompleted = 0;
  let prerequisiteRecoveries = 0;

  const startDate = new Date('2026-05-01');

  for (let day = 1; day <= durationDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day - 1);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Check if student returns today
    const returns = Math.random() < profile.characteristics.dailyReturnProbability;

    if (!returns) {
      currentStreak = 0;
      streakBreaks++;
      days.push({
        day,
        date: dateStr,
        sessionsCompleted: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        missionsGenerated: 0,
        missionsCompleted: 0,
        skillsWorkedOn: [],
        masteryGrowth: 0,
        sessionMinutes: 0,
        engagementScore: 0,
        fatiguePoint: null,
        retentionReviewsDone: 0,
        streakDay: 0,
        didReturn: false,
      });
      continue;
    }

    currentStreak++;
    maxStreak = Math.max(maxStreak, currentStreak);

    // Generate missions for today
    const missions = generateAdaptiveMissions(progress, gradeSkills, profile.grade);
    totalMissionsGenerated += missions.length;

    let dayQuestions = 0;
    let dayCorrect = 0;
    let daySessionMinutes = 0;
    const skillsWorkedOn: string[] = [];
    let fatiguePoint: number | null = null;
    let retentionReviewsDone = 0;
    let missionsCompleted = 0;

    // Calculate mastery before
    const masteryBefore = progress.reduce((sum, p) => {
      const m = calculateMasteryV2(p);
      return sum + m.percentage;
    }, 0) / progress.length;

    // Process each mission
    for (const mission of missions) {
      const skill = gradeSkills.find(s => s.id === mission.skillId);
      if (!skill) continue;

      // Get questions for this skill
      const availableQuestions = getQuestionsForSkill(mission.skillId);
      const questionCount = Math.min(mission.questionCount || 5, availableQuestions.length, 5);

      if (questionCount === 0) continue;

      const currentSkillProgress = progress.find(p => p.skillId === mission.skillId);
      const currentMastery = currentSkillProgress
        ? calculateMasteryV2(currentSkillProgress).percentage
        : 0;

      let missionCorrect = 0;
      let missionTotal = 0;

      for (let q = 0; q < questionCount; q++) {
        const questionDifficulty = mission.difficulty || 'medium';
        const isCorrect = simulateQuestionAnswer(
          profile,
          dayQuestions + q,
          questionDifficulty,
          currentMastery
        );

        missionTotal++;
        dayQuestions++;
        if (isCorrect) {
          missionCorrect++;
          dayCorrect++;
        }

        // Check for fatigue
        const minutesElapsed = dayQuestions * (profile.characteristics.avgResponseTime / 60);
        if (!fatiguePoint && minutesElapsed > profile.characteristics.attentionSpan) {
          fatiguePoint = dayQuestions;
        }
      }

      // Update progress for this skill
      if (currentSkillProgress) {
        const updatedProgress = updateProgressV2(
          currentSkillProgress,
          missionCorrect,
          missionTotal,
          mission.difficulty || 'medium'
        );
        // Update date to simulation date
        updatedProgress.lastAttemptDate = currentDate.toISOString();
        progress = progress.map(p =>
          p.skillId === mission.skillId ? updatedProgress : p
        );
      }

      skillsWorkedOn.push(mission.skillId);

      // Check if mission completed (>60% correct)
      if (missionCorrect / missionTotal >= 0.6) {
        missionsCompleted++;
      }

      if (mission.type === 'retention_review') {
        retentionReviewsDone++;
      }

      if (mission.type === 'prerequisite_repair') {
        prerequisiteRecoveries++;
      }

      // Detect friction
      const friction = detectFriction(
        profile,
        day,
        mission.skillId,
        mission.skillName,
        missionTotal,
        missionCorrect / missionTotal,
        progress
      );
      if (friction) {
        frictionPoints.push(friction);
      }

      daySessionMinutes += missionTotal * (profile.characteristics.avgResponseTime / 60);
    }

    totalMissionsCompleted += missionsCompleted;

    // Apply learning rate improvement
    progress = progress.map(p => {
      if (skillsWorkedOn.includes(p.skillId) && p.attempts > 0) {
        // Gradual improvement based on learning rate
        const improvement = profile.characteristics.learningRate;
        const newCorrectCount = Math.min(
          p.attempts,
          p.correctCount + (Math.random() < improvement ? 1 : 0)
        );
        return { ...p, correctCount: newCorrectCount };
      }
      return p;
    });

    // Calculate mastery after
    const masteryAfter = progress.reduce((sum, p) => {
      const m = calculateMasteryV2(p);
      return sum + m.percentage;
    }, 0) / progress.length;

    // Engagement score based on completion and accuracy
    const engagementScore = Math.round(
      (dayQuestions > 0 ? 40 : 0) +
      (missionsCompleted / Math.max(1, missions.length)) * 30 +
      (dayCorrect / Math.max(1, dayQuestions)) * 20 +
      (currentStreak > 1 ? 10 : 0)
    );

    days.push({
      day,
      date: dateStr,
      sessionsCompleted: missions.length > 0 ? 1 : 0,
      questionsAnswered: dayQuestions,
      correctAnswers: dayCorrect,
      missionsGenerated: missions.length,
      missionsCompleted,
      skillsWorkedOn,
      masteryGrowth: masteryAfter - masteryBefore,
      sessionMinutes: Math.round(daySessionMinutes),
      engagementScore,
      fatiguePoint,
      retentionReviewsDone,
      streakDay: currentStreak,
      didReturn: true,
    });
  }

  // Calculate final metrics
  const activeDays = days.filter(d => d.didReturn);
  const totalQuestions = days.reduce((s, d) => s + d.questionsAnswered, 0);
  const totalCorrect = days.reduce((s, d) => s + d.correctAnswers, 0);

  const finalMasteryStats = progress.reduce(
    (acc, p) => {
      const m = calculateMasteryV2(p);
      if (m.status === 'mastered') acc.mastered++;
      else if (m.status === 'good' || m.status === 'developing') acc.inProgress++;
      else acc.notStarted++;
      return acc;
    },
    { mastered: 0, inProgress: 0, notStarted: 0 }
  );

  const metrics: SimulationMetrics = {
    totalDays: durationDays,
    activeDays: activeDays.length,
    totalQuestions,
    totalCorrect,
    overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    avgSessionMinutes: activeDays.length > 0
      ? Math.round(activeDays.reduce((s, d) => s + d.sessionMinutes, 0) / activeDays.length)
      : 0,
    avgQuestionsPerDay: activeDays.length > 0
      ? Math.round(totalQuestions / activeDays.length)
      : 0,
    completionRate: Math.round((activeDays.length / durationDays) * 100),
    retryRate: Math.round(
      (progress.filter(p => p.attempts > 5 && p.status !== 'mastered').length / Math.max(1, progress.filter(p => p.attempts > 0).length)) * 100
    ),
    missionCompletionRate: totalMissionsGenerated > 0
      ? Math.round((totalMissionsCompleted / totalMissionsGenerated) * 100)
      : 0,
    masteryGrowthSpeed: Math.round((finalMasteryStats.mastered / Math.max(1, durationDays / 7)) * 10) / 10,
    retentionEffectiveness: Math.round(profile.characteristics.retentionRate * 100),
    streakMax: maxStreak,
    streakBreaks,
    skillsMastered: finalMasteryStats.mastered,
    skillsInProgress: finalMasteryStats.inProgress,
    skillsNotStarted: finalMasteryStats.notStarted,
    prerequisiteRecoveries,
  };

  // Generate learning insights
  const learningInsights = generateInsights(profile, metrics, progress, gradeSkills, frictionPoints);

  return {
    profile,
    days,
    finalProgress: progress,
    metrics,
    frictionPoints,
    learningInsights,
  };
}

function generateInsights(
  profile: SimulatedProfile,
  metrics: SimulationMetrics,
  progress: StudentSkillProgress[],
  gradeSkills: Skill[],
  frictionPoints: FrictionPoint[]
): LearningInsight[] {
  const insights: LearningInsight[] = [];

  // Diagnosis validation
  const weakSkills = progress.filter(p => {
    const m = calculateMasteryV2(p);
    return m.status === 'needs_practice' && p.attempts > 0;
  });
  insights.push({
    category: 'diagnosis',
    finding: weakSkills.length > 0
      ? `النظام شخّص ${weakSkills.length} مهارة ضعيفة بدقة`
      : 'لم يتم تشخيص نقاط ضعف واضحة',
    isPositive: weakSkills.length > 0,
    evidence: `${profile.name}: ${weakSkills.length} مهارات تحتاج تدريب من أصل ${progress.filter(p => p.attempts > 0).length} مهارة مُجربة`,
  });

  // Prerequisites validation
  const prereqIssues = progress.filter(p => {
    const prereqs = skillPrerequisites[p.skillId] || [];
    return prereqs.some(prereqId => {
      const prereqProgress = progress.find(pp => pp.skillId === prereqId);
      return prereqProgress && calculateMasteryV2(prereqProgress).percentage < 50;
    }) && p.attempts > 0;
  });
  insights.push({
    category: 'prerequisites',
    finding: prereqIssues.length > 0
      ? `${prereqIssues.length} مهارات تحتاج إصلاح المتطلبات أولاً`
      : 'تسلسل المتطلبات يعمل بشكل صحيح',
    isPositive: prereqIssues.length < 3,
    evidence: `عدد حالات البدء بمهارة قبل إتقان متطلباتها: ${prereqIssues.length}`,
  });

  // Treatment effectiveness
  const improvedSkills = progress.filter(p =>
    p.history.length >= 3 &&
    p.history[p.history.length - 1].score > p.history[0].score + 20
  );
  insights.push({
    category: 'treatment',
    finding: improvedSkills.length > 0
      ? `${improvedSkills.length} مهارات تحسنت بشكل ملحوظ بعد العلاج`
      : 'العلاج يحتاج وقت أطول لإظهار نتائج',
    isPositive: improvedSkills.length > 0,
    evidence: `نسبة التحسن: ${Math.round((improvedSkills.length / Math.max(1, progress.filter(p => p.attempts > 0).length)) * 100)}%`,
  });

  // Missions effectiveness
  insights.push({
    category: 'missions',
    finding: metrics.missionCompletionRate >= 60
      ? `المهمات اليومية فعالة - نسبة إتمام ${metrics.missionCompletionRate}%`
      : `المهمات صعبة - نسبة إتمام ${metrics.missionCompletionRate}% فقط`,
    isPositive: metrics.missionCompletionRate >= 60,
    evidence: `معدل ${metrics.avgQuestionsPerDay} سؤال/يوم، ${metrics.avgSessionMinutes} دقيقة/جلسة`,
  });

  // Retention effectiveness
  const retentionFriction = frictionPoints.filter(f => f.type === 'repetition');
  insights.push({
    category: 'retention',
    finding: retentionFriction.length < 3
      ? 'نظام الاحتفاظ يعمل بشكل مقبول'
      : `${retentionFriction.length} حالات تكرار بدون تقدم - الاحتفاظ يحتاج تحسين`,
    isPositive: retentionFriction.length < 3,
    evidence: `نسبة الاحتفاظ المتوقعة: ${metrics.retentionEffectiveness}%، حالات التكرار: ${retentionFriction.length}`,
  });

  return insights;
}

// ===== Run All Simulations =====
export function runAllSimulations(durationDays: 7 | 14 | 30): SimulationResult[] {
  return studentProfiles.map(profile => runSimulation(profile, durationDays));
}

// ===== Engagement Validation =====
export interface EngagementReport {
  dailyReturnRate: number;
  streakHealth: 'healthy' | 'fragile' | 'broken';
  missionMotivation: 'high' | 'medium' | 'low';
  rewardBalance: 'balanced' | 'too_easy' | 'too_hard';
  recommendations: string[];
}

export function validateEngagement(result: SimulationResult): EngagementReport {
  const { metrics, profile, days } = result;
  const activeDays = days.filter(d => d.didReturn);

  const dailyReturnRate = metrics.completionRate;

  const streakHealth: EngagementReport['streakHealth'] =
    metrics.streakMax >= 5 ? 'healthy' :
    metrics.streakMax >= 3 ? 'fragile' : 'broken';

  const missionMotivation: EngagementReport['missionMotivation'] =
    metrics.missionCompletionRate >= 70 ? 'high' :
    metrics.missionCompletionRate >= 40 ? 'medium' : 'low';

  const avgEngagement = activeDays.length > 0
    ? activeDays.reduce((s, d) => s + d.engagementScore, 0) / activeDays.length
    : 0;

  const rewardBalance: EngagementReport['rewardBalance'] =
    avgEngagement >= 70 ? 'balanced' :
    metrics.overallAccuracy > 85 ? 'too_easy' : 'too_hard';

  const recommendations: string[] = [];
  if (streakHealth === 'broken') {
    recommendations.push('تحسين نظام التذكير والتحفيز للعودة اليومية');
  }
  if (missionMotivation === 'low') {
    recommendations.push('تبسيط المهمات اليومية وتقليل عددها');
  }
  if (rewardBalance === 'too_hard') {
    recommendations.push('تقليل صعوبة الأسئلة للطالب الضعيف');
  }
  if (rewardBalance === 'too_easy') {
    recommendations.push('زيادة التحدي للطالب المتقدم');
  }
  if (metrics.avgSessionMinutes > profile.characteristics.attentionSpan) {
    recommendations.push('تقصير الجلسات لتناسب مدى انتباه الطفل');
  }

  return { dailyReturnRate, streakHealth, missionMotivation, rewardBalance, recommendations };
}

// ===== Parent Validation =====
export interface ParentValidation {
  reportClarity: 'clear' | 'moderate' | 'confusing';
  actionability: 'actionable' | 'vague' | 'overwhelming';
  usefulness: 'useful' | 'somewhat' | 'not_useful';
  issues: string[];
  score: number; // 0-100
}

export function validateParentExperience(result: SimulationResult): ParentValidation {
  const { metrics, frictionPoints, learningInsights } = result;
  const issues: string[] = [];

  // Check if parent can understand progress
  const hasWeakDiagnosis = learningInsights.some(i => i.category === 'diagnosis' && i.isPositive);
  const hasClearTreatment = learningInsights.some(i => i.category === 'treatment' && i.isPositive);

  if (!hasWeakDiagnosis) {
    issues.push('التقرير لا يوضح نقاط الضعف بشكل كافٍ');
  }
  if (!hasClearTreatment) {
    issues.push('لا يوجد اقتراح واضح لما يجب فعله');
  }
  if (frictionPoints.length > 5) {
    issues.push('كثرة المشاكل قد تربك ولي الأمر');
  }
  if (metrics.retryRate > 50) {
    issues.push('نسبة إعادة المحاولة عالية - قد يقلق ولي الأمر');
  }

  const reportClarity: ParentValidation['reportClarity'] =
    issues.length <= 1 ? 'clear' : issues.length <= 3 ? 'moderate' : 'confusing';

  const actionability: ParentValidation['actionability'] =
    hasClearTreatment && hasWeakDiagnosis ? 'actionable' :
    hasClearTreatment || hasWeakDiagnosis ? 'vague' : 'overwhelming';

  const usefulness: ParentValidation['usefulness'] =
    reportClarity === 'clear' && actionability === 'actionable' ? 'useful' :
    reportClarity !== 'confusing' ? 'somewhat' : 'not_useful';

  const score = Math.round(
    (reportClarity === 'clear' ? 40 : reportClarity === 'moderate' ? 25 : 10) +
    (actionability === 'actionable' ? 35 : actionability === 'vague' ? 20 : 5) +
    (usefulness === 'useful' ? 25 : usefulness === 'somewhat' ? 15 : 5)
  );

  return { reportClarity, actionability, usefulness, issues, score };
}