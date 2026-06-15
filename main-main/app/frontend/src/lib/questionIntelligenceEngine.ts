// Learning Intelligence Sprint - Question Intelligence Layer
// Every question carries: skillId, prerequisiteSkills, misconceptionType, retentionTag,
// remediationTarget, difficultyWeight, cognitiveLevel
// Plus Quality Metrics: success rate, average time, retry frequency, misconception frequency

import { getAllQuestions, type Question } from '@/data/mathSkillsData';

// ============ Types ============

export type MisconceptionType =
  | 'counting_confusion'
  | 'place_value_confusion'
  | 'operation_switch'
  | 'visual_misread'
  | 'sequence_confusion'
  | 'none';

export type CognitiveLevel =
  | 'recall'        // تذكر - basic fact retrieval
  | 'understand'    // فهم - comprehension
  | 'apply'         // تطبيق - use in new context
  | 'analyze';      // تحليل - break down and reason

export type RetentionTag =
  | 'core'          // أساسي - must be retained long-term
  | 'procedural'    // إجرائي - step-by-step skill
  | 'conceptual'    // مفاهيمي - deep understanding
  | 'fluency';      // طلاقة - speed and accuracy

export interface QuestionIntelligence {
  questionId: string;
  skillId: string;
  prerequisiteSkills: string[];
  misconceptionType: MisconceptionType;
  retentionTag: RetentionTag;
  remediationTarget: string; // skillId to remediate if failed
  difficultyWeight: number; // 1-10 scale
  cognitiveLevel: CognitiveLevel;
}

export interface QuestionQualityMetrics {
  questionId: string;
  totalAttempts: number;
  successCount: number;
  successRate: number; // 0-100
  averageTime: number; // ms
  retryFrequency: number; // avg retries per student
  misconceptionFrequency: Record<MisconceptionType, number>;
  lastUpdated: string;
}

// ============ Storage ============

const QUALITY_METRICS_KEY = 'pythagorasQuestionQuality';

function getStoredMetrics(): Record<string, QuestionQualityMetrics> {
  const stored = localStorage.getItem(QUALITY_METRICS_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveMetrics(metrics: Record<string, QuestionQualityMetrics>): void {
  localStorage.setItem(QUALITY_METRICS_KEY, JSON.stringify(metrics));
}

// ============ Intelligence Inference ============

/**
 * Infer prerequisite skills for a question based on its skill and domain
 */
function inferPrerequisiteSkills(question: Question): string[] {
  const { skillId, grade, difficulty } = question;
  const prereqs: string[] = [];

  // Hard questions require the same skill at easier level
  if (difficulty === 'hard' || difficulty === 'medium') {
    // Basic counting is prerequisite for most Grade 1 skills
    if (grade === 1 && !skillId.includes('G1-N-001')) {
      prereqs.push('G1-N-001'); // العد من 1 إلى 5
    }
    if (grade === 1 && skillId.includes('G1-A')) {
      prereqs.push('G1-N-002'); // العد من 1 إلى 10
      prereqs.push('G1-N-011'); // تكوين العدد 10
    }
  }

  // Grade 2 requires Grade 1 foundations
  if (grade === 2) {
    if (skillId.includes('G2-N')) {
      prereqs.push('G1-N-002'); // counting to 10
      prereqs.push('G1-N-014'); // numbers 11-20
    }
    if (skillId.includes('G2-A') || skillId.includes('G2-C')) {
      prereqs.push('G1-N-011'); // composing 10
    }
  }

  return [...new Set(prereqs)].filter(p => p !== skillId);
}

/**
 * Infer misconception type based on question characteristics
 */
function inferMisconceptionType(question: Question): MisconceptionType {
  const { skillId, questionText } = question;
  const text = questionText.toLowerCase();

  if (skillId.includes('-N-') && (text.includes('عد') || text.includes('كم'))) {
    return 'counting_confusion';
  }
  if (skillId.includes('G2-N') && (text.includes('آحاد') || text.includes('عشرات') || text.includes('منزلة'))) {
    return 'place_value_confusion';
  }
  if (skillId.includes('-A-') || text.includes('جمع') || text.includes('طرح') || text.includes('+') || text.includes('-')) {
    return 'operation_switch';
  }
  if (question.visualType || text.includes('شكل') || text.includes('صورة') || text.includes('رسم')) {
    return 'visual_misread';
  }
  if (skillId.includes('-P-') || text.includes('نمط') || text.includes('تسلسل') || text.includes('التالي')) {
    return 'sequence_confusion';
  }

  return 'counting_confusion'; // default for math
}

/**
 * Infer retention tag based on skill type
 */
function inferRetentionTag(question: Question): RetentionTag {
  const { skillId, difficulty } = question;

  // Core facts that must be retained
  if (skillId.includes('-N-001') || skillId.includes('-N-002') || skillId.includes('-N-003')) {
    return 'core';
  }
  // Procedural (step-by-step operations)
  if (skillId.includes('-A-') || skillId.includes('-C-')) {
    return 'procedural';
  }
  // Conceptual understanding
  if (skillId.includes('-G-') || skillId.includes('-P-') || difficulty === 'hard') {
    return 'conceptual';
  }
  // Fluency (speed drills)
  if (difficulty === 'easy' && (skillId.includes('-N-') || skillId.includes('-A-'))) {
    return 'fluency';
  }

  return 'core';
}

/**
 * Infer cognitive level
 */
function inferCognitiveLevel(question: Question): CognitiveLevel {
  const { difficulty, questionText } = question;
  const text = questionText.toLowerCase();

  if (difficulty === 'easy' && (text.includes('ما هو') || text.includes('كم') || text.includes('اختر'))) {
    return 'recall';
  }
  if (text.includes('لماذا') || text.includes('اشرح') || text.includes('فسر')) {
    return 'analyze';
  }
  if (difficulty === 'hard' || text.includes('حل') || text.includes('أوجد') || text.includes('استخدم')) {
    return 'apply';
  }

  return 'understand';
}

/**
 * Calculate difficulty weight (1-10)
 */
function inferDifficultyWeight(question: Question): number {
  const { difficulty, grade } = question;
  let base = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 5 : 8;

  // Grade 2 is slightly harder
  if (grade === 2) base += 1;

  // Visual questions add complexity
  if (question.visualType) base += 0.5;

  return Math.min(10, Math.round(base));
}

/**
 * Infer remediation target - which skill to practice if this question is failed
 */
function inferRemediationTarget(question: Question): string {
  const prereqs = inferPrerequisiteSkills(question);
  // Remediate the most fundamental prerequisite
  if (prereqs.length > 0) return prereqs[0];
  // Otherwise remediate the same skill
  return question.skillId;
}

// ============ Main Engine ============

/**
 * questionIntelligenceEngine - generates intelligence metadata for all questions
 */
export function questionIntelligenceEngine(): QuestionIntelligence[] {
  const allQuestions = getAllQuestions();

  return allQuestions.map(q => ({
    questionId: q.id,
    skillId: q.skillId,
    prerequisiteSkills: inferPrerequisiteSkills(q),
    misconceptionType: inferMisconceptionType(q),
    retentionTag: inferRetentionTag(q),
    remediationTarget: inferRemediationTarget(q),
    difficultyWeight: inferDifficultyWeight(q),
    cognitiveLevel: inferCognitiveLevel(q),
  }));
}

/**
 * Get intelligence for a specific question
 */
export function getQuestionIntelligence(questionId: string): QuestionIntelligence | null {
  const allQuestions = getAllQuestions();
  const question = allQuestions.find(q => q.id === questionId);
  if (!question) return null;

  return {
    questionId: question.id,
    skillId: question.skillId,
    prerequisiteSkills: inferPrerequisiteSkills(question),
    misconceptionType: inferMisconceptionType(question),
    retentionTag: inferRetentionTag(question),
    remediationTarget: inferRemediationTarget(question),
    difficultyWeight: inferDifficultyWeight(question),
    cognitiveLevel: inferCognitiveLevel(question),
  };
}

// ============ Quality Metrics ============

/**
 * Record a question attempt for quality metrics
 */
export function recordQuestionAttempt(
  questionId: string,
  correct: boolean,
  responseTime: number,
  misconception: MisconceptionType = 'none',
  isRetry: boolean = false
): void {
  const metrics = getStoredMetrics();

  if (!metrics[questionId]) {
    metrics[questionId] = {
      questionId,
      totalAttempts: 0,
      successCount: 0,
      successRate: 0,
      averageTime: 0,
      retryFrequency: 0,
      misconceptionFrequency: {
        counting_confusion: 0,
        place_value_confusion: 0,
        operation_switch: 0,
        visual_misread: 0,
        sequence_confusion: 0,
        none: 0,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  const m = metrics[questionId];
  m.totalAttempts++;
  if (correct) m.successCount++;
  m.successRate = Math.round((m.successCount / m.totalAttempts) * 100);

  // Running average for response time
  m.averageTime = Math.round(((m.averageTime * (m.totalAttempts - 1)) + responseTime) / m.totalAttempts);

  // Track retries
  if (isRetry) {
    m.retryFrequency = Math.round(((m.retryFrequency * (m.totalAttempts - 1)) + 1) / m.totalAttempts * 100) / 100;
  }

  // Track misconceptions
  if (!correct && misconception !== 'none') {
    m.misconceptionFrequency[misconception]++;
  }

  m.lastUpdated = new Date().toISOString();
  saveMetrics(metrics);
}

/**
 * Get quality metrics for a question
 */
export function getQuestionQualityMetrics(questionId: string): QuestionQualityMetrics | null {
  const metrics = getStoredMetrics();
  return metrics[questionId] || null;
}

/**
 * Get all quality metrics
 */
export function getAllQualityMetrics(): QuestionQualityMetrics[] {
  const metrics = getStoredMetrics();
  return Object.values(metrics);
}

/**
 * Get weakest questions (lowest success rate with minimum attempts)
 */
export function getWeakestQuestions(minAttempts: number = 3, limit: number = 10): QuestionQualityMetrics[] {
  const metrics = getAllQualityMetrics();
  return metrics
    .filter(m => m.totalAttempts >= minAttempts)
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, limit);
}

/**
 * Get questions with highest misconception frequency
 */
export function getMostConfusingQuestions(limit: number = 10): (QuestionQualityMetrics & { topMisconception: MisconceptionType })[] {
  const metrics = getAllQualityMetrics();
  return metrics
    .filter(m => m.totalAttempts >= 2)
    .map(m => {
      const entries = Object.entries(m.misconceptionFrequency) as [MisconceptionType, number][];
      const top = entries.filter(([k]) => k !== 'none').sort((a, b) => b[1] - a[1])[0];
      return { ...m, topMisconception: top ? top[0] : 'none' as MisconceptionType };
    })
    .filter(m => m.topMisconception !== 'none')
    .sort((a, b) => {
      const aTotal = Object.values(a.misconceptionFrequency).reduce((s, v) => s + v, 0) - a.misconceptionFrequency.none;
      const bTotal = Object.values(b.misconceptionFrequency).reduce((s, v) => s + v, 0) - b.misconceptionFrequency.none;
      return bTotal - aTotal;
    })
    .slice(0, limit);
}

/**
 * Get average metrics across all questions for a skill
 */
export function getSkillQuestionMetrics(skillId: string): {
  avgSuccessRate: number;
  avgTime: number;
  totalAttempts: number;
  questionCount: number;
} {
  const allQuestions = getAllQuestions().filter(q => q.skillId === skillId);
  const metrics = getStoredMetrics();

  let totalSuccess = 0;
  let totalTime = 0;
  let totalAttempts = 0;
  let counted = 0;

  for (const q of allQuestions) {
    const m = metrics[q.id];
    if (m && m.totalAttempts > 0) {
      totalSuccess += m.successRate;
      totalTime += m.averageTime;
      totalAttempts += m.totalAttempts;
      counted++;
    }
  }

  return {
    avgSuccessRate: counted > 0 ? Math.round(totalSuccess / counted) : 0,
    avgTime: counted > 0 ? Math.round(totalTime / counted) : 0,
    totalAttempts,
    questionCount: counted,
  };
}