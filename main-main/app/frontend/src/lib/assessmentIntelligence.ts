// Phase 5: Assessment Intelligence System
// Adaptive Testing (CAT), Question Intelligence, Diagnostic Engine,
// Misconception Detection, Performance Prediction, Rubric & Portfolio Assessment

import { loadUserData, saveUserData } from './pilotStorage';

// ============ IRT Model (Simplified Item Response Theory) ============

export interface IRTParameters {
  discrimination: number; // a parameter (0.5-2.5) - how well question differentiates
  difficulty: number; // b parameter (-3 to 3) - question difficulty on logit scale
  guessing: number; // c parameter (0-0.35) - probability of guessing correctly
}

export interface CATState {
  studentAbility: number; // theta estimate (-3 to 3)
  abilityStdError: number; // standard error of estimate
  questionsAsked: number;
  responses: CATResponse[];
  isComplete: boolean;
  terminationReason: 'precision' | 'max_questions' | 'min_questions' | 'manual' | null;
}

export interface CATResponse {
  questionId: string;
  skillId: string;
  irtParams: IRTParameters;
  isCorrect: boolean;
  responseTimeMs: number;
  abilityAfter: number;
  informationGain: number;
}

export interface CATConfig {
  maxQuestions: number; // max questions before stopping (default 20)
  minQuestions: number; // min questions before can stop (default 5)
  precisionThreshold: number; // stop when SE < this (default 0.3)
  initialAbility: number; // starting theta (default 0)
  questionPool: CATQuestion[];
}

export interface CATQuestion {
  id: string;
  skillId: string;
  text: string;
  options: string[];
  correctIndex: number;
  irtParams: IRTParameters;
  tags: string[];
}

/** Validate and clamp IRT parameters to safe ranges */
function sanitizeIRTParams(params: IRTParameters): IRTParameters {
  return {
    discrimination: Math.max(0.1, Math.min(3, Number.isFinite(params.discrimination) ? params.discrimination : 1)),
    difficulty: Math.max(-4, Math.min(4, Number.isFinite(params.difficulty) ? params.difficulty : 0)),
    guessing: Math.max(0, Math.min(0.5, Number.isFinite(params.guessing) ? params.guessing : 0.25)),
  };
}

/** Clamp ability to valid range */
function clampAbility(theta: number): number {
  if (!Number.isFinite(theta)) return 0;
  return Math.max(-3, Math.min(3, theta));
}

// 3PL IRT probability function
export function irtProbability(ability: number, params: IRTParameters): number {
  const safe = sanitizeIRTParams(params);
  const theta = clampAbility(ability);
  const { discrimination: a, difficulty: b, guessing: c } = safe;
  const exponent = -a * (theta - b);
  // Guard against overflow in Math.exp
  const expVal = Math.exp(Math.max(-50, Math.min(50, exponent)));
  const result = c + (1 - c) / (1 + expVal);
  return Number.isFinite(result) ? result : c;
}

// Fisher Information for a question at given ability
export function fisherInformation(ability: number, params: IRTParameters): number {
  const safe = sanitizeIRTParams(params);
  const theta = clampAbility(ability);
  const p = irtProbability(theta, safe);
  const { discrimination: a, guessing: c } = safe;
  const pMinusC = p - c;
  const oneMinusP = 1 - p;
  const oneMinusC = 1 - c;
  if (oneMinusC === 0 || p === 0 || oneMinusP === 0) return 0;
  const numerator = a * a * pMinusC * pMinusC * oneMinusP * oneMinusP;
  const denominator = oneMinusC * oneMinusC * p * oneMinusP;
  const result = numerator / denominator;
  return Number.isFinite(result) ? Math.max(0, result) : 0;
}

// Select next best question (maximum information)
export function selectNextQuestion(
  state: CATState,
  availableQuestions: CATQuestion[],
  usedIds: Set<string>
): CATQuestion | null {
  const unused = availableQuestions.filter(q => !usedIds.has(q.id));
  if (unused.length === 0) return null;

  let bestQuestion = unused[0];
  let bestInfo = 0;

  for (const q of unused) {
    const info = fisherInformation(state.studentAbility, q.irtParams);
    if (info > bestInfo) {
      bestInfo = info;
      bestQuestion = q;
    }
  }

  return bestQuestion;
}

// Update ability estimate using Newton-Raphson MLE with safeguards
export function updateAbilityEstimate(responses: CATResponse[]): number {
  if (responses.length === 0) return 0;

  // Use EAP (Expected A Posteriori) as fallback for very few responses
  if (responses.length <= 2) {
    const correct = responses.filter(r => r.isCorrect).length;
    const ratio = correct / responses.length;
    return clampAbility((ratio - 0.5) * 4); // simple linear mapping
  }

  let theta = 0; // start at 0
  const maxIterations = 25;
  const convergence = 0.001;
  const dampingFactor = 0.8; // prevent oscillation

  for (let iter = 0; iter < maxIterations; iter++) {
    let numerator = 0;
    let denominator = 0;

    for (const r of responses) {
      const safeParams = sanitizeIRTParams(r.irtParams);
      const p = irtProbability(theta, safeParams);
      const { discrimination: a, guessing: c } = safeParams;
      const oneMinusC = 1 - c;
      if (oneMinusC === 0 || p === 0) continue;
      const w = a * (p - c) / (oneMinusC * p);
      if (!Number.isFinite(w)) continue;
      const u = r.isCorrect ? 1 : 0;

      numerator += w * (u - p);
      denominator += w * w * p * (1 - p);
    }

    if (denominator === 0 || !Number.isFinite(denominator)) break;
    const delta = (numerator / denominator) * dampingFactor;
    if (!Number.isFinite(delta)) break;
    theta += delta;

    // Clamp theta
    theta = clampAbility(theta);

    if (Math.abs(delta) < convergence) break;
  }

  return clampAbility(theta);
}

// Calculate standard error with bounds
export function calculateStdError(theta: number, responses: CATResponse[]): number {
  if (responses.length === 0) return 3;
  const safeTheta = clampAbility(theta);
  let totalInfo = 0;
  for (const r of responses) {
    const info = fisherInformation(safeTheta, r.irtParams);
    if (Number.isFinite(info)) totalInfo += info;
  }
  if (totalInfo <= 0) return 3;
  const se = 1 / Math.sqrt(totalInfo);
  return Number.isFinite(se) ? Math.min(3, Math.max(0.1, se)) : 3;
}

// Initialize CAT session
export function initCAT(config: Partial<CATConfig> = {}): CATState {
  return {
    studentAbility: config.initialAbility ?? 0,
    abilityStdError: 3,
    questionsAsked: 0,
    responses: [],
    isComplete: false,
    terminationReason: null,
  };
}

// Process a response and update state
export function processCATResponse(
  state: CATState,
  question: CATQuestion,
  isCorrect: boolean,
  responseTimeMs: number,
  config: CATConfig
): CATState {
  const newResponses: CATResponse[] = [
    ...state.responses,
    {
      questionId: question.id,
      skillId: question.skillId,
      irtParams: question.irtParams,
      isCorrect,
      responseTimeMs,
      abilityAfter: 0,
      informationGain: fisherInformation(state.studentAbility, question.irtParams),
    },
  ];

  const newAbility = updateAbilityEstimate(newResponses);
  const newSE = calculateStdError(newAbility, newResponses);
  const questionsAsked = state.questionsAsked + 1;

  // Update last response with new ability
  newResponses[newResponses.length - 1].abilityAfter = newAbility;

  // Check termination
  let isComplete = false;
  let terminationReason: CATState['terminationReason'] = null;

  if (questionsAsked >= config.maxQuestions) {
    isComplete = true;
    terminationReason = 'max_questions';
  } else if (questionsAsked >= config.minQuestions && newSE < config.precisionThreshold) {
    isComplete = true;
    terminationReason = 'precision';
  }

  return {
    studentAbility: newAbility,
    abilityStdError: newSE,
    questionsAsked,
    responses: newResponses,
    isComplete,
    terminationReason,
  };
}

// ============ Question Quality Intelligence ============

export interface QuestionQuality {
  questionId: string;
  discrimination: number; // point-biserial correlation (0-1)
  difficulty: number; // proportion correct (0-1)
  guessingFactor: number; // estimated guessing (0-0.5)
  avgResponseTime: number; // ms
  totalAttempts: number;
  successRate: number;
  distractorEffectiveness: number[]; // how well each wrong option works
  qualityScore: number; // 0-100 composite
  qualityLabel: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف' | 'يحتاج مراجعة';
  issues: string[];
  recommendations: string[];
}

export interface QuestionAttempt {
  questionId: string;
  studentAbility: number;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  responseTimeMs: number;
  timestamp: string;
}

// Analyze question quality from attempts
export function analyzeQuestionQuality(
  questionId: string,
  attempts: QuestionAttempt[],
  optionCount: number = 4
): QuestionQuality {
  if (attempts.length === 0) {
    return getDefaultQuality(questionId);
  }

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter(a => a.isCorrect).length;
  const successRate = correctAttempts / totalAttempts;
  const avgResponseTime = attempts.reduce((s, a) => s + a.responseTimeMs, 0) / totalAttempts;

  // Discrimination: point-biserial correlation approximation
  const highAbility = attempts.filter(a => a.studentAbility > 0);
  const lowAbility = attempts.filter(a => a.studentAbility <= 0);
  const highCorrectRate = highAbility.length > 0
    ? highAbility.filter(a => a.isCorrect).length / highAbility.length : 0.5;
  const lowCorrectRate = lowAbility.length > 0
    ? lowAbility.filter(a => a.isCorrect).length / lowAbility.length : 0.5;
  const discrimination = Math.max(0, Math.min(1, highCorrectRate - lowCorrectRate));

  // Guessing factor estimation
  const veryLowAbility = attempts.filter(a => a.studentAbility < -1);
  const guessingFactor = veryLowAbility.length > 3
    ? veryLowAbility.filter(a => a.isCorrect).length / veryLowAbility.length
    : 1 / optionCount;

  // Distractor effectiveness
  const distractorEffectiveness: number[] = [];
  for (let i = 0; i < optionCount; i++) {
    const selected = attempts.filter(a => a.selectedOption === i && !a.isCorrect).length;
    distractorEffectiveness.push(selected / Math.max(1, totalAttempts - correctAttempts));
  }

  // Quality score composite
  const discScore = discrimination * 40; // max 40
  const diffScore = (1 - Math.abs(successRate - 0.6)) * 30; // ideal ~60% correct, max 30
  const distractorScore = Math.min(1, distractorEffectiveness.filter(d => d > 0.1).length / (optionCount - 1)) * 20; // max 20
  const volumeScore = Math.min(10, totalAttempts / 5); // max 10
  const qualityScore = Math.round(discScore + diffScore + distractorScore + volumeScore);

  // Issues and recommendations
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (successRate > 0.9) {
    issues.push('السؤال سهل جداً');
    recommendations.push('زيادة صعوبة السؤال أو نقله لمستوى أقل');
  }
  if (successRate < 0.2) {
    issues.push('السؤال صعب جداً');
    recommendations.push('تبسيط السؤال أو إضافة تلميحات');
  }
  if (discrimination < 0.2) {
    issues.push('تمييزية ضعيفة');
    recommendations.push('مراجعة صياغة السؤال والخيارات');
  }
  if (guessingFactor > 0.4) {
    issues.push('نسبة تخمين عالية');
    recommendations.push('تحسين المشتتات لتكون أكثر جاذبية');
  }
  const unusedDistractors = distractorEffectiveness.filter(d => d < 0.05).length;
  if (unusedDistractors > 1) {
    issues.push(`${unusedDistractors} مشتتات غير فعالة`);
    recommendations.push('استبدال المشتتات غير المختارة بخيارات أكثر واقعية');
  }

  // Quality label
  let qualityLabel: QuestionQuality['qualityLabel'];
  if (qualityScore >= 80) qualityLabel = 'ممتاز';
  else if (qualityScore >= 60) qualityLabel = 'جيد';
  else if (qualityScore >= 40) qualityLabel = 'مقبول';
  else if (qualityScore >= 20) qualityLabel = 'ضعيف';
  else qualityLabel = 'يحتاج مراجعة';

  return {
    questionId,
    discrimination,
    difficulty: successRate,
    guessingFactor,
    avgResponseTime,
    totalAttempts,
    successRate,
    distractorEffectiveness,
    qualityScore,
    qualityLabel,
    issues,
    recommendations,
  };
}

function getDefaultQuality(questionId: string): QuestionQuality {
  return {
    questionId,
    discrimination: 0,
    difficulty: 0.5,
    guessingFactor: 0.25,
    avgResponseTime: 0,
    totalAttempts: 0,
    successRate: 0,
    distractorEffectiveness: [0.25, 0.25, 0.25, 0.25],
    qualityScore: 0,
    qualityLabel: 'يحتاج مراجعة',
    issues: ['لا توجد بيانات كافية'],
    recommendations: ['جمع المزيد من البيانات'],
  };
}

// ============ Diagnostic Assessment Engine ============

export type DiagnosticType = 'initial' | 'continuous' | 'summative';

export interface DiagnosticResult {
  type: DiagnosticType;
  studentId: string;
  timestamp: string;
  overallAbility: number; // -3 to 3
  skillLevels: Record<string, SkillDiagnosticLevel>;
  strengths: string[];
  weaknesses: string[];
  gaps: SkillGap[];
  placementLevel: string;
  recommendedPath: string[];
  confidence: number; // 0-100
}

export interface SkillDiagnosticLevel {
  skillId: string;
  skillName: string;
  level: 'not_assessed' | 'below_basic' | 'basic' | 'proficient' | 'advanced';
  score: number; // 0-100
  questionsAttempted: number;
  correctCount: number;
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  expectedLevel: number;
  actualLevel: number;
  gapSize: number; // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low';
  prerequisitesNeeded: string[];
}

// Run diagnostic assessment
export function runDiagnostic(
  type: DiagnosticType,
  studentId: string,
  responses: Array<{ skillId: string; skillName: string; isCorrect: boolean; difficulty: number }>,
  gradeLevel: number
): DiagnosticResult {
  // Group by skill
  const skillMap: Record<string, { correct: number; total: number; name: string; difficulties: number[] }> = {};
  
  for (const r of responses) {
    if (!skillMap[r.skillId]) {
      skillMap[r.skillId] = { correct: 0, total: 0, name: r.skillName, difficulties: [] };
    }
    skillMap[r.skillId].total++;
    skillMap[r.skillId].difficulties.push(r.difficulty);
    if (r.isCorrect) skillMap[r.skillId].correct++;
  }

  // Calculate skill levels
  const skillLevels: Record<string, SkillDiagnosticLevel> = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const gaps: SkillGap[] = [];

  for (const [skillId, data] of Object.entries(skillMap)) {
    const score = Math.round((data.correct / data.total) * 100);
    let level: SkillDiagnosticLevel['level'];
    
    if (score >= 90) { level = 'advanced'; strengths.push(data.name); }
    else if (score >= 70) { level = 'proficient'; strengths.push(data.name); }
    else if (score >= 50) { level = 'basic'; }
    else if (score >= 25) { level = 'below_basic'; weaknesses.push(data.name); }
    else { level = 'below_basic'; weaknesses.push(data.name); }

    skillLevels[skillId] = {
      skillId,
      skillName: data.name,
      level,
      score,
      questionsAttempted: data.total,
      correctCount: data.correct,
    };

    // Detect gaps
    const expectedLevel = gradeLevel * 20; // simplified expected score
    if (score < expectedLevel - 20) {
      gaps.push({
        skillId,
        skillName: data.name,
        expectedLevel,
        actualLevel: score,
        gapSize: expectedLevel - score,
        priority: score < 30 ? 'critical' : score < 50 ? 'high' : 'medium',
        prerequisitesNeeded: [],
      });
    }
  }

  // Overall ability
  const totalCorrect = responses.filter(r => r.isCorrect).length;
  const overallScore = totalCorrect / Math.max(1, responses.length);
  const overallAbility = (overallScore - 0.5) * 6; // map to -3..3

  // Placement
  let placementLevel: string;
  if (overallAbility > 1.5) placementLevel = 'متقدم';
  else if (overallAbility > 0.5) placementLevel = 'فوق المتوسط';
  else if (overallAbility > -0.5) placementLevel = 'متوسط';
  else if (overallAbility > -1.5) placementLevel = 'أقل من المتوسط';
  else placementLevel = 'يحتاج دعم مكثف';

  // Recommended path
  const recommendedPath = gaps
    .sort((a, b) => b.gapSize - a.gapSize)
    .slice(0, 5)
    .map(g => g.skillId);

  return {
    type,
    studentId,
    timestamp: new Date().toISOString(),
    overallAbility,
    skillLevels,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    gaps: gaps.sort((a, b) => b.gapSize - a.gapSize),
    placementLevel,
    recommendedPath,
    confidence: Math.min(95, 40 + responses.length * 3),
  };
}

// ============ Misconception Detection ============

export interface Misconception {
  id: string;
  type: string;
  label: string;
  description: string;
  indicators: string[];
  relatedSkills: string[];
  severity: 'mild' | 'moderate' | 'severe';
  frequency: number; // how often detected (0-100)
  intervention: MisconceptionIntervention;
}

export interface MisconceptionIntervention {
  type: 'visual' | 'concrete' | 'verbal' | 'practice' | 'reteach';
  description: string;
  steps: string[];
  estimatedTime: number; // minutes
}

export const COMMON_MISCONCEPTIONS: Misconception[] = [
  {
    id: 'mc_add_carry',
    type: 'place_value',
    label: 'خطأ في الحمل عند الجمع',
    description: 'الطالب ينسى حمل الرقم عند تجاوز العشرة',
    indicators: ['إجابة أقل بـ10 من الصحيحة', 'خطأ في خانة العشرات'],
    relatedSkills: ['addition', 'place_value'],
    severity: 'moderate',
    frequency: 0,
    intervention: {
      type: 'concrete',
      description: 'استخدام المكعبات لتمثيل الحمل',
      steps: ['عرض الجمع بالمكعبات', 'تجميع 10 آحاد في عشرة', 'نقل العشرة للخانة التالية', 'التدريب المتكرر'],
      estimatedTime: 15,
    },
  },
  {
    id: 'mc_sub_borrow',
    type: 'place_value',
    label: 'خطأ في الاستلاف عند الطرح',
    description: 'الطالب يطرح الأصغر من الأكبر بغض النظر عن الموقع',
    indicators: ['عكس الطرح في خانة الآحاد', 'إجابة موجبة دائماً'],
    relatedSkills: ['subtraction', 'place_value'],
    severity: 'severe',
    frequency: 0,
    intervention: {
      type: 'visual',
      description: 'تمثيل بصري للاستلاف',
      steps: ['رسم خانات القيمة المكانية', 'توضيح أن الأعلى يطرح منه', 'تمثيل الاستلاف بالسهم', 'تمارين متدرجة'],
      estimatedTime: 20,
    },
  },
  {
    id: 'mc_mult_add',
    type: 'operation_confusion',
    label: 'خلط الضرب بالجمع',
    description: 'الطالب يجمع بدلاً من الضرب',
    indicators: ['3×4=7 بدلاً من 12', 'إجابة = مجموع العددين'],
    relatedSkills: ['multiplication', 'addition'],
    severity: 'moderate',
    frequency: 0,
    intervention: {
      type: 'concrete',
      description: 'تمثيل الضرب كمجموعات متكررة',
      steps: ['رسم مجموعات متساوية', 'عد العناصر الكلية', 'ربط الضرب بالجمع المتكرر', 'جدول الضرب بالصور'],
      estimatedTime: 15,
    },
  },
  {
    id: 'mc_fraction_add',
    type: 'fraction_misconception',
    label: 'جمع البسط والمقام معاً',
    description: 'الطالب يجمع البسط مع البسط والمقام مع المقام',
    indicators: ['1/2 + 1/3 = 2/5', 'المقام يتغير دائماً'],
    relatedSkills: ['fractions', 'addition'],
    severity: 'severe',
    frequency: 0,
    intervention: {
      type: 'visual',
      description: 'استخدام الأشكال لتوضيح الكسور',
      steps: ['رسم دوائر مقسمة', 'توحيد المقامات بصرياً', 'توضيح لماذا لا نجمع المقامات', 'تمارين بالرسم'],
      estimatedTime: 25,
    },
  },
  {
    id: 'mc_count_skip',
    type: 'counting',
    label: 'تخطي أرقام عند العد',
    description: 'الطالب يتخطى أرقاماً عند العد التصاعدي أو التنازلي',
    indicators: ['عد غير متسلسل', 'أخطاء عند العد العكسي'],
    relatedSkills: ['counting', 'number_sense'],
    severity: 'mild',
    frequency: 0,
    intervention: {
      type: 'practice',
      description: 'تدريب العد بالإيقاع',
      steps: ['العد مع التصفيق', 'العد على خط الأعداد', 'ألعاب العد التنازلي', 'العد بالقفز (2، 5، 10)'],
      estimatedTime: 10,
    },
  },
  {
    id: 'mc_pattern_linear',
    type: 'pattern_thinking',
    label: 'افتراض أن كل نمط خطي',
    description: 'الطالب يفترض أن الفرق ثابت دائماً بين العناصر',
    indicators: ['خطأ في الأنماط غير الخطية', 'إجابة = العنصر السابق + ثابت'],
    relatedSkills: ['patterns', 'sequences'],
    severity: 'mild',
    frequency: 0,
    intervention: {
      type: 'verbal',
      description: 'مناقشة أنواع الأنماط المختلفة',
      steps: ['عرض أنماط مختلفة (×2، +1+2+3)', 'مقارنة الفروق', 'اكتشاف القاعدة', 'إنشاء أنماط جديدة'],
      estimatedTime: 15,
    },
  },
];

// Detect misconceptions from error patterns
export function detectMisconceptions(
  errors: Array<{ skillId: string; selectedAnswer: string; correctAnswer: string; questionContext: string }>
): Misconception[] {
  const detected: Misconception[] = [];
  const skillErrors: Record<string, number> = {};

  for (const err of errors) {
    skillErrors[err.skillId] = (skillErrors[err.skillId] || 0) + 1;
  }

  // Check each misconception's indicators
  for (const mc of COMMON_MISCONCEPTIONS) {
    const relatedErrors = mc.relatedSkills.reduce((sum, s) => sum + (skillErrors[s] || 0), 0);
    if (relatedErrors >= 2) {
      detected.push({ ...mc, frequency: Math.min(100, relatedErrors * 15) });
    }
  }

  return detected.sort((a, b) => b.frequency - a.frequency);
}

// ============ Performance Prediction ============

export interface PerformancePrediction {
  studentId: string;
  predictedScore: number; // 0-100
  confidence: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  projectedMastery: Record<string, number>; // skill -> projected mastery in 2 weeks
  recommendations: string[];
  alertType: 'none' | 'watch' | 'intervene' | 'urgent';
}

export interface RiskFactor {
  factor: string;
  weight: number; // 0-1
  description: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface StudentHistory {
  recentScores: number[]; // last 10 scores
  avgResponseTime: number;
  consistencyRate: number; // 0-1
  engagementLevel: number; // 0-100
  daysActive: number;
  daysSinceLastSession: number;
  streakLength: number;
  totalMastered: number;
  totalSkills: number;
  errorRate: number; // 0-1
  improvementRate: number; // positive = improving
}

// Predict student performance
export function predictPerformance(studentId: string, history: StudentHistory): PerformancePrediction {
  // Weighted prediction based on multiple factors
  const recentAvg = history.recentScores.length > 0
    ? history.recentScores.reduce((s, v) => s + v, 0) / history.recentScores.length : 50;
  
  const trendWeight = history.improvementRate * 10;
  const engagementFactor = history.engagementLevel / 100;
  const consistencyFactor = history.consistencyRate;
  const recencyPenalty = Math.min(1, history.daysSinceLastSession / 7) * -10;

  const predictedScore = Math.max(0, Math.min(100,
    recentAvg * 0.5 +
    trendWeight +
    engagementFactor * 20 +
    consistencyFactor * 15 +
    recencyPenalty +
    (history.streakLength > 3 ? 5 : 0)
  ));

  // Risk assessment
  const riskFactors: RiskFactor[] = [];
  let riskScore = 0;

  if (history.daysSinceLastSession > 3) {
    riskFactors.push({
      factor: 'غياب طويل',
      weight: 0.3,
      description: `${history.daysSinceLastSession} أيام منذ آخر جلسة`,
      trend: 'declining',
    });
    riskScore += 30;
  }

  if (history.improvementRate < -0.1) {
    riskFactors.push({
      factor: 'تراجع في الأداء',
      weight: 0.25,
      description: 'معدل التحسن سلبي',
      trend: 'declining',
    });
    riskScore += 25;
  }

  if (history.errorRate > 0.5) {
    riskFactors.push({
      factor: 'معدل أخطاء مرتفع',
      weight: 0.2,
      description: `${Math.round(history.errorRate * 100)}% أخطاء`,
      trend: history.improvementRate > 0 ? 'improving' : 'declining',
    });
    riskScore += 20;
  }

  if (history.engagementLevel < 40) {
    riskFactors.push({
      factor: 'تفاعل منخفض',
      weight: 0.15,
      description: `مستوى التفاعل ${history.engagementLevel}%`,
      trend: 'stable',
    });
    riskScore += 15;
  }

  if (history.consistencyRate < 0.4) {
    riskFactors.push({
      factor: 'عدم انتظام',
      weight: 0.1,
      description: 'أداء غير مستقر بين الجلسات',
      trend: 'stable',
    });
    riskScore += 10;
  }

  // Risk level
  let riskLevel: PerformancePrediction['riskLevel'];
  let alertType: PerformancePrediction['alertType'];
  if (riskScore >= 60) { riskLevel = 'critical'; alertType = 'urgent'; }
  else if (riskScore >= 40) { riskLevel = 'high'; alertType = 'intervene'; }
  else if (riskScore >= 20) { riskLevel = 'medium'; alertType = 'watch'; }
  else { riskLevel = 'low'; alertType = 'none'; }

  // Recommendations
  const recommendations: string[] = [];
  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendations.push('تواصل مع ولي الأمر');
    recommendations.push('تقليل صعوبة المحتوى مؤقتاً');
  }
  if (history.daysSinceLastSession > 3) {
    recommendations.push('إرسال تذكير للطالب');
  }
  if (history.errorRate > 0.5) {
    recommendations.push('مراجعة المهارات الأساسية');
    recommendations.push('تفعيل وضع العلاج');
  }
  if (history.engagementLevel < 40) {
    recommendations.push('تنويع أنشطة التعلم');
    recommendations.push('إضافة عناصر تحفيزية');
  }

  return {
    studentId,
    predictedScore: Math.round(predictedScore),
    confidence: Math.min(90, 30 + history.recentScores.length * 6),
    riskLevel,
    riskFactors,
    projectedMastery: {},
    recommendations,
    alertType,
  };
}

// ============ Rubric-Based Assessment ============

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
}

export interface RubricAssessment {
  studentId: string;
  rubricId: string;
  criteria: Array<{
    criterionId: string;
    score: number;
    feedback: string;
  }>;
  totalScore: number;
  maxScore: number;
  percentage: number;
  overallFeedback: string;
  timestamp: string;
}

// ============ Portfolio Assessment ============

export interface PortfolioEntry {
  id: string;
  studentId: string;
  type: 'quiz' | 'diagnostic' | 'project' | 'milestone' | 'achievement';
  title: string;
  description: string;
  score: number;
  maxScore: number;
  skills: string[];
  timestamp: string;
  evidence: string; // description of what was demonstrated
}

export interface StudentPortfolio {
  studentId: string;
  entries: PortfolioEntry[];
  growthSummary: GrowthSummary;
  milestones: string[];
  totalPoints: number;
}

export interface GrowthSummary {
  startLevel: number;
  currentLevel: number;
  growthPercentage: number;
  strongestGrowthArea: string;
  timespan: string;
  consistencyScore: number;
}

// Calculate growth from portfolio
export function calculateGrowth(entries: PortfolioEntry[]): GrowthSummary {
  if (entries.length < 2) {
    return {
      startLevel: 0,
      currentLevel: 0,
      growthPercentage: 0,
      strongestGrowthArea: 'غير محدد',
      timespan: '0 أيام',
      consistencyScore: 0,
    };
  }

  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const firstFive = sorted.slice(0, 5);
  const lastFive = sorted.slice(-5);

  const startLevel = firstFive.reduce((s, e) => s + (e.score / e.maxScore) * 100, 0) / firstFive.length;
  const currentLevel = lastFive.reduce((s, e) => s + (e.score / e.maxScore) * 100, 0) / lastFive.length;
  const growthPercentage = currentLevel - startLevel;

  // Find strongest growth area
  const skillGrowth: Record<string, { early: number[]; late: number[] }> = {};
  const midpoint = Math.floor(sorted.length / 2);
  
  sorted.forEach((entry, i) => {
    for (const skill of entry.skills) {
      if (!skillGrowth[skill]) skillGrowth[skill] = { early: [], late: [] };
      const pct = (entry.score / entry.maxScore) * 100;
      if (i < midpoint) skillGrowth[skill].early.push(pct);
      else skillGrowth[skill].late.push(pct);
    }
  });

  let strongestGrowthArea = 'عام';
  let maxGrowth = 0;
  for (const [skill, data] of Object.entries(skillGrowth)) {
    const earlyAvg = data.early.length > 0 ? data.early.reduce((s, v) => s + v, 0) / data.early.length : 0;
    const lateAvg = data.late.length > 0 ? data.late.reduce((s, v) => s + v, 0) / data.late.length : 0;
    const growth = lateAvg - earlyAvg;
    if (growth > maxGrowth) { maxGrowth = growth; strongestGrowthArea = skill; }
  }

  // Timespan
  const firstDate = new Date(sorted[0].timestamp);
  const lastDate = new Date(sorted[sorted.length - 1].timestamp);
  const days = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  // Consistency
  const scores = sorted.map(e => (e.score / e.maxScore) * 100);
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + Math.pow(v - avgScore, 2), 0) / scores.length;
  const consistencyScore = Math.max(0, 100 - Math.sqrt(variance));

  return {
    startLevel: Math.round(startLevel),
    currentLevel: Math.round(currentLevel),
    growthPercentage: Math.round(growthPercentage),
    strongestGrowthArea,
    timespan: `${days} يوم`,
    consistencyScore: Math.round(consistencyScore),
  };
}

// ============ Persistence ============

const ASSESSMENT_KEY = 'pythagorath_assessment_data';

export interface AssessmentStore {
  catSessions: CATState[];
  diagnosticResults: DiagnosticResult[];
  questionQualities: Record<string, QuestionQuality>;
  misconceptions: Misconception[];
  predictions: PerformancePrediction[];
  portfolioEntries: PortfolioEntry[];
  rubricAssessments: RubricAssessment[];
}

export function loadAssessmentStore(): AssessmentStore {
  const data = loadUserData<AssessmentStore | null>(ASSESSMENT_KEY, null);
  if (data) return data;
  return {
    catSessions: [],
    diagnosticResults: [],
    questionQualities: {},
    misconceptions: [],
    predictions: [],
    portfolioEntries: [],
    rubricAssessments: [],
  };
}

export function saveAssessmentStore(store: AssessmentStore): void {
  saveUserData(ASSESSMENT_KEY, store);
}

// ============ Mock Data Generation for Dashboard ============

export function generateMockAssessmentData(): AssessmentStore {
  const now = new Date();
  const mockDiagnostics: DiagnosticResult[] = [
    {
      type: 'initial',
      studentId: 'student_1',
      timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      overallAbility: -0.5,
      skillLevels: {
        counting: { skillId: 'counting', skillName: 'العد', level: 'proficient', score: 75, questionsAttempted: 5, correctCount: 4 },
        addition: { skillId: 'addition', skillName: 'الجمع', level: 'basic', score: 55, questionsAttempted: 5, correctCount: 3 },
        subtraction: { skillId: 'subtraction', skillName: 'الطرح', level: 'below_basic', score: 35, questionsAttempted: 5, correctCount: 2 },
        patterns: { skillId: 'patterns', skillName: 'الأنماط', level: 'proficient', score: 80, questionsAttempted: 5, correctCount: 4 },
        place_value: { skillId: 'place_value', skillName: 'القيمة المكانية', level: 'basic', score: 50, questionsAttempted: 4, correctCount: 2 },
      },
      strengths: ['الأنماط', 'العد'],
      weaknesses: ['الطرح', 'القيمة المكانية'],
      gaps: [
        { skillId: 'subtraction', skillName: 'الطرح', expectedLevel: 60, actualLevel: 35, gapSize: 25, priority: 'high', prerequisitesNeeded: ['counting'] },
        { skillId: 'place_value', skillName: 'القيمة المكانية', expectedLevel: 60, actualLevel: 50, gapSize: 10, priority: 'medium', prerequisitesNeeded: [] },
      ],
      placementLevel: 'أقل من المتوسط',
      recommendedPath: ['subtraction', 'place_value'],
      confidence: 78,
    },
    {
      type: 'continuous',
      studentId: 'student_1',
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      overallAbility: 0.3,
      skillLevels: {
        counting: { skillId: 'counting', skillName: 'العد', level: 'advanced', score: 92, questionsAttempted: 8, correctCount: 7 },
        addition: { skillId: 'addition', skillName: 'الجمع', level: 'proficient', score: 78, questionsAttempted: 8, correctCount: 6 },
        subtraction: { skillId: 'subtraction', skillName: 'الطرح', level: 'basic', score: 58, questionsAttempted: 7, correctCount: 4 },
        patterns: { skillId: 'patterns', skillName: 'الأنماط', level: 'advanced', score: 88, questionsAttempted: 6, correctCount: 5 },
        place_value: { skillId: 'place_value', skillName: 'القيمة المكانية', level: 'proficient', score: 72, questionsAttempted: 6, correctCount: 4 },
      },
      strengths: ['العد', 'الأنماط', 'الجمع'],
      weaknesses: ['الطرح'],
      gaps: [
        { skillId: 'subtraction', skillName: 'الطرح', expectedLevel: 60, actualLevel: 58, gapSize: 2, priority: 'low', prerequisitesNeeded: [] },
      ],
      placementLevel: 'فوق المتوسط',
      recommendedPath: ['subtraction'],
      confidence: 85,
    },
  ];

  const mockQualities: Record<string, QuestionQuality> = {};
  const questionIds = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
  const labels: QuestionQuality['qualityLabel'][] = ['ممتاز', 'جيد', 'جيد', 'مقبول', 'ممتاز', 'ضعيف', 'جيد', 'مقبول', 'ممتاز', 'يحتاج مراجعة'];
  
  questionIds.forEach((id, i) => {
    mockQualities[id] = {
      questionId: id,
      discrimination: 0.3 + Math.random() * 0.5,
      difficulty: 0.3 + Math.random() * 0.5,
      guessingFactor: 0.1 + Math.random() * 0.2,
      avgResponseTime: 3000 + Math.random() * 8000,
      totalAttempts: 20 + Math.floor(Math.random() * 80),
      successRate: 0.3 + Math.random() * 0.5,
      distractorEffectiveness: [0.3, 0.25, 0.25, 0.2],
      qualityScore: 20 + Math.floor(Math.random() * 70),
      qualityLabel: labels[i],
      issues: i === 5 ? ['تمييزية ضعيفة', 'مشتتات غير فعالة'] : i === 9 ? ['السؤال صعب جداً'] : [],
      recommendations: i === 5 ? ['مراجعة صياغة السؤال'] : i === 9 ? ['تبسيط السؤال'] : [],
    };
  });

  const mockPredictions: PerformancePrediction[] = [
    {
      studentId: 'student_1',
      predictedScore: 72,
      confidence: 78,
      riskLevel: 'low',
      riskFactors: [],
      projectedMastery: { counting: 95, addition: 85, subtraction: 65, patterns: 90 },
      recommendations: ['استمرار بنفس الوتيرة'],
      alertType: 'none',
    },
    {
      studentId: 'student_2',
      predictedScore: 45,
      confidence: 65,
      riskLevel: 'high',
      riskFactors: [
        { factor: 'غياب طويل', weight: 0.3, description: '5 أيام منذ آخر جلسة', trend: 'declining' },
        { factor: 'تراجع في الأداء', weight: 0.25, description: 'معدل التحسن سلبي', trend: 'declining' },
      ],
      projectedMastery: { counting: 60, addition: 45, subtraction: 30 },
      recommendations: ['تواصل مع ولي الأمر', 'تقليل صعوبة المحتوى'],
      alertType: 'intervene',
    },
    {
      studentId: 'student_3',
      predictedScore: 28,
      confidence: 55,
      riskLevel: 'critical',
      riskFactors: [
        { factor: 'غياب طويل', weight: 0.3, description: '10 أيام منذ آخر جلسة', trend: 'declining' },
        { factor: 'معدل أخطاء مرتفع', weight: 0.2, description: '65% أخطاء', trend: 'declining' },
        { factor: 'تفاعل منخفض', weight: 0.15, description: 'مستوى التفاعل 25%', trend: 'declining' },
      ],
      projectedMastery: { counting: 40, addition: 25 },
      recommendations: ['تواصل عاجل مع ولي الأمر', 'تفعيل وضع العلاج', 'تنويع أنشطة التعلم'],
      alertType: 'urgent',
    },
  ];

  const mockPortfolio: PortfolioEntry[] = Array.from({ length: 12 }, (_, i) => ({
    id: `entry_${i}`,
    studentId: 'student_1',
    type: (['quiz', 'diagnostic', 'milestone', 'achievement'] as const)[i % 4],
    title: ['اختبار العد', 'تشخيص الجمع', 'إتقان الأنماط', 'إنجاز: 10 أيام متتالية'][i % 4],
    description: 'وصف الإنجاز',
    score: 50 + Math.floor(Math.random() * 40) + Math.floor(i * 2),
    maxScore: 100,
    skills: [['counting'], ['addition'], ['patterns'], ['general']][i % 4],
    timestamp: new Date(now.getTime() - (12 - i) * 2 * 24 * 60 * 60 * 1000).toISOString(),
    evidence: 'أظهر الطالب فهماً جيداً',
  }));

  return {
    catSessions: [],
    diagnosticResults: mockDiagnostics,
    questionQualities: mockQualities,
    misconceptions: COMMON_MISCONCEPTIONS.map((mc, i) => ({ ...mc, frequency: i < 3 ? 40 + i * 15 : 10 + i * 5 })),
    predictions: mockPredictions,
    portfolioEntries: mockPortfolio,
    rubricAssessments: [],
  };
}