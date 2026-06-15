// Content Intelligence Sprint - Error Pattern Analyzer
// Tracks error types beyond correct/wrong: counting_error, place_value_confusion,
// rushed_answer, pattern_confusion, operation_confusion

export type ErrorType =
  | 'counting_error'
  | 'place_value_confusion'
  | 'rushed_answer'
  | 'pattern_confusion'
  | 'operation_confusion'
  | 'concept_gap'
  | 'careless_mistake'
  | 'none';

export interface AnswerRecord {
  questionId: string;
  skillId: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  errorType: ErrorType;
  responseTimeMs: number;
  timestamp: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ErrorPattern {
  errorType: ErrorType;
  count: number;
  percentage: number;
  label: string;
  description: string;
  recommendation: string;
}

export interface StudentErrorProfile {
  totalAnswers: number;
  totalErrors: number;
  errorRate: number;
  patterns: ErrorPattern[];
  dominantError: ErrorType | null;
  avgResponseTime: number;
  rushRate: number; // % of answers under 3 seconds
}

const ERROR_LABELS: Record<ErrorType, string> = {
  counting_error: 'خطأ في العد',
  place_value_confusion: 'خلط في القيمة المكانية',
  rushed_answer: 'إجابة متسرعة',
  pattern_confusion: 'خلط في الأنماط',
  operation_confusion: 'خلط بين العمليات',
  concept_gap: 'فجوة في المفهوم',
  careless_mistake: 'خطأ بسيط',
  none: 'صحيح',
};

const ERROR_DESCRIPTIONS: Record<ErrorType, string> = {
  counting_error: 'يخطئ في العد بزيادة أو نقصان واحد',
  place_value_confusion: 'يخلط بين العشرات والآحاد',
  rushed_answer: 'يجيب بسرعة دون تفكير كافٍ',
  pattern_confusion: 'لا يتعرف على النمط المتكرر',
  operation_confusion: 'يخلط بين الجمع والطرح أو الضرب والقسمة',
  concept_gap: 'لم يفهم المفهوم الأساسي',
  careless_mistake: 'يعرف الإجابة لكن أخطأ بالاختيار',
  none: 'لا يوجد خطأ',
};

const ERROR_RECOMMENDATIONS: Record<ErrorType, string> = {
  counting_error: 'تدريب على العد باستخدام أدوات ملموسة',
  place_value_confusion: 'استخدام عصي العد والمكعبات لفهم القيمة المكانية',
  rushed_answer: 'تشجيع على قراءة السؤال مرتين قبل الإجابة',
  pattern_confusion: 'تمارين أنماط بصرية متدرجة',
  operation_confusion: 'ربط كل عملية بقصة حياتية واضحة',
  concept_gap: 'العودة للمهارة السابقة وإعادة الشرح',
  careless_mistake: 'تمارين مراجعة سريعة مع التركيز',
  none: '',
};

/**
 * Classify error type based on question context and answer
 */
export function classifyError(
  selectedAnswer: number,
  correctAnswer: number,
  options: string[],
  skillId: string,
  responseTimeMs: number,
  questionText: string
): ErrorType {
  if (selectedAnswer === correctAnswer) return 'none';

  // Rushed answer: less than 3 seconds
  if (responseTimeMs < 3000) return 'rushed_answer';

  const selectedText = options[selectedAnswer] || '';
  const correctText = options[correctAnswer] || '';

  // Check for counting error (off by 1)
  const selectedNum = parseInt(selectedText.replace(/[^\d]/g, ''));
  const correctNum = parseInt(correctText.replace(/[^\d]/g, ''));

  if (!isNaN(selectedNum) && !isNaN(correctNum)) {
    if (Math.abs(selectedNum - correctNum) === 1) return 'counting_error';

    // Place value confusion: digits swapped (e.g., 47 vs 74)
    if (selectedNum >= 10 && correctNum >= 10) {
      const selStr = selectedNum.toString();
      const corStr = correctNum.toString();
      if (selStr.length === corStr.length && selStr.split('').sort().join('') === corStr.split('').sort().join('')) {
        return 'place_value_confusion';
      }
    }
  }

  // Operation confusion: skill involves addition/subtraction
  if (skillId.includes('N-012') || skillId.includes('N-013') || skillId.includes('C-001') || skillId.includes('C-002')) {
    if (questionText.includes('+') || questionText.includes('-') || questionText.includes('جمع') || questionText.includes('طرح')) {
      // If the wrong answer is the result of the opposite operation
      return 'operation_confusion';
    }
  }

  // Pattern confusion
  if (skillId.includes('P-') || questionText.includes('نمط') || questionText.includes('أكمل')) {
    return 'pattern_confusion';
  }

  // Default: concept gap if hard question, careless if easy
  if (responseTimeMs > 15000) return 'concept_gap';
  return 'careless_mistake';
}

/**
 * Analyze error patterns from answer history
 */
export function analyzeErrorPatterns(answers: AnswerRecord[]): StudentErrorProfile {
  const totalAnswers = answers.length;
  const errors = answers.filter(a => !a.isCorrect);
  const totalErrors = errors.length;
  const errorRate = totalAnswers > 0 ? Math.round((totalErrors / totalAnswers) * 100) : 0;

  // Count each error type
  const errorCounts: Record<ErrorType, number> = {
    counting_error: 0,
    place_value_confusion: 0,
    rushed_answer: 0,
    pattern_confusion: 0,
    operation_confusion: 0,
    concept_gap: 0,
    careless_mistake: 0,
    none: 0,
  };

  for (const a of errors) {
    errorCounts[a.errorType]++;
  }

  // Build patterns array (excluding 'none')
  const patterns: ErrorPattern[] = Object.entries(errorCounts)
    .filter(([type]) => type !== 'none')
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      errorType: type as ErrorType,
      count,
      percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0,
      label: ERROR_LABELS[type as ErrorType],
      description: ERROR_DESCRIPTIONS[type as ErrorType],
      recommendation: ERROR_RECOMMENDATIONS[type as ErrorType],
    }))
    .sort((a, b) => b.count - a.count);

  // Dominant error
  const dominantError = patterns.length > 0 ? patterns[0].errorType : null;

  // Response time analysis
  const avgResponseTime = totalAnswers > 0
    ? Math.round(answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / totalAnswers)
    : 0;
  const rushCount = answers.filter(a => a.responseTimeMs < 3000).length;
  const rushRate = totalAnswers > 0 ? Math.round((rushCount / totalAnswers) * 100) : 0;

  return {
    totalAnswers,
    totalErrors,
    errorRate,
    patterns,
    dominantError,
    avgResponseTime,
    rushRate,
  };
}

/**
 * Get error patterns for a specific skill
 */
export function getSkillErrorPatterns(answers: AnswerRecord[], skillId: string): ErrorPattern[] {
  const skillAnswers = answers.filter(a => a.skillId === skillId && !a.isCorrect);
  if (skillAnswers.length === 0) return [];

  const errorCounts: Partial<Record<ErrorType, number>> = {};
  for (const a of skillAnswers) {
    errorCounts[a.errorType] = (errorCounts[a.errorType] || 0) + 1;
  }

  return Object.entries(errorCounts)
    .map(([type, count]) => ({
      errorType: type as ErrorType,
      count: count!,
      percentage: Math.round((count! / skillAnswers.length) * 100),
      label: ERROR_LABELS[type as ErrorType],
      description: ERROR_DESCRIPTIONS[type as ErrorType],
      recommendation: ERROR_RECOMMENDATIONS[type as ErrorType],
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Save answer record to localStorage
 */
export function saveAnswerRecord(record: AnswerRecord): void {
  const key = 'pythagorasAnswerHistory';
  const existing: AnswerRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push(record);
  // Keep last 500 answers
  const trimmed = existing.slice(-500);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

/**
 * Get all answer records from localStorage
 */
export function getAnswerHistory(): AnswerRecord[] {
  const key = 'pythagorasAnswerHistory';
  return JSON.parse(localStorage.getItem(key) || '[]');
}

/**
 * Get hardest questions (lowest success rate)
 */
export function getHardestQuestions(answers: AnswerRecord[], minAttempts: number = 3): {
  questionId: string;
  attempts: number;
  successRate: number;
  commonError: ErrorType;
}[] {
  const questionStats: Record<string, { attempts: number; correct: number; errors: ErrorType[] }> = {};

  for (const a of answers) {
    if (!questionStats[a.questionId]) {
      questionStats[a.questionId] = { attempts: 0, correct: 0, errors: [] };
    }
    questionStats[a.questionId].attempts++;
    if (a.isCorrect) questionStats[a.questionId].correct++;
    else questionStats[a.questionId].errors.push(a.errorType);
  }

  return Object.entries(questionStats)
    .filter(([, stats]) => stats.attempts >= minAttempts)
    .map(([questionId, stats]) => {
      const errorCounts: Partial<Record<ErrorType, number>> = {};
      for (const e of stats.errors) {
        errorCounts[e] = (errorCounts[e] || 0) + 1;
      }
      const commonError = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ErrorType || 'concept_gap';

      return {
        questionId,
        attempts: stats.attempts,
        successRate: Math.round((stats.correct / stats.attempts) * 100),
        commonError,
      };
    })
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 10);
}