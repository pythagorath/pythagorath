// Assessment Intelligence Sprint - Math-Specific Misconception Taxonomy
// Comprehensive taxonomy of mathematical misconceptions with remediation paths
// Connects questions → misconception types → remediation strategies

import type { RemediationType } from './cognitiveRemediation';

// ============ Misconception Categories ============

export type MisconceptionCategory =
  | 'arithmetic'
  | 'place_value'
  | 'fraction'
  | 'sequencing'
  | 'comparison'
  | 'procedural'
  | 'measurement'
  | 'geometry';

export interface MisconceptionProfile {
  id: string;
  category: MisconceptionCategory;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  gradeRange: [number, number]; // e.g., [1, 3] for grades 1-3
  indicators: MisconceptionIndicator[];
  remediationPath: RemediationPath;
  prerequisiteSkills: string[];
  commonAge: [number, number]; // typical age range where this appears
  persistenceRisk: number; // 0-100, how likely to persist without intervention
}

export interface MisconceptionIndicator {
  pattern: string;
  description: string;
  weight: number; // 0-1, how strongly this indicates the misconception
  example: { question: string; wrongAnswer: string; correctAnswer: string };
}

export interface RemediationPath {
  primaryStrategy: RemediationType;
  steps: RemediationStep[];
  estimatedSessions: number;
  visualAids: string[];
  interactionTypes: string[];
}

export interface RemediationStep {
  order: number;
  titleAr: string;
  type: 'visual' | 'manipulative' | 'guided' | 'practice' | 'assessment';
  durationMinutes: number;
  description: string;
}

// ============ Arithmetic Misconceptions ============

const arithmeticMisconceptions: MisconceptionProfile[] = [
  {
    id: 'ARITH-001',
    category: 'arithmetic',
    nameAr: 'خطأ العد بواحد',
    nameEn: 'Off-by-one counting error',
    descriptionAr: 'الطالب يخطئ بواحد عند العد أو الجمع، غالباً بسبب عدم بدء العد من الرقم الصحيح',
    severity: 'medium',
    gradeRange: [1, 2],
    indicators: [
      { pattern: 'off_by_one_plus', description: 'Answer is always +1 from correct', weight: 0.9, example: { question: '3 + 4', wrongAnswer: '8', correctAnswer: '7' } },
      { pattern: 'off_by_one_minus', description: 'Answer is always -1 from correct', weight: 0.9, example: { question: '5 + 3', wrongAnswer: '7', correctAnswer: '8' } },
      { pattern: 'counting_start_error', description: 'Counts from the number instead of after it', weight: 0.85, example: { question: 'عد 3 خطوات من 5', wrongAnswer: '7', correctAnswer: '8' } },
    ],
    remediationPath: {
      primaryStrategy: 'conceptual_error',
      steps: [
        { order: 1, titleAr: 'العد بالأصابع', type: 'manipulative', durationMinutes: 5, description: 'Use fingers to count, emphasizing starting point' },
        { order: 2, titleAr: 'خط الأعداد', type: 'visual', durationMinutes: 5, description: 'Number line jumping from correct start' },
        { order: 3, titleAr: 'تمرين موجه', type: 'guided', durationMinutes: 5, description: 'Guided practice with immediate feedback' },
        { order: 4, titleAr: 'تمرين مستقل', type: 'practice', durationMinutes: 5, description: 'Independent practice with decreasing support' },
      ],
      estimatedSessions: 2,
      visualAids: ['number_line', 'finger_counting', 'blocks'],
      interactionTypes: ['drag_drop', 'tap_count', 'fill_blank'],
    },
    prerequisiteSkills: ['G1-A-001', 'G1-A-002'],
    commonAge: [5, 7],
    persistenceRisk: 30,
  },
  {
    id: 'ARITH-002',
    category: 'arithmetic',
    nameAr: 'عكس العملية الحسابية',
    nameEn: 'Operation inversion',
    descriptionAr: 'الطالب يستخدم عملية حسابية خاطئة (جمع بدل طرح أو العكس)',
    severity: 'high',
    gradeRange: [1, 3],
    indicators: [
      { pattern: 'add_instead_subtract', description: 'Uses addition when subtraction needed', weight: 0.95, example: { question: '9 - 4', wrongAnswer: '13', correctAnswer: '5' } },
      { pattern: 'subtract_instead_add', description: 'Uses subtraction when addition needed', weight: 0.95, example: { question: '6 + 3', wrongAnswer: '3', correctAnswer: '9' } },
      { pattern: 'sign_confusion', description: 'Confuses + and - symbols', weight: 0.8, example: { question: '7 - 2', wrongAnswer: '9', correctAnswer: '5' } },
    ],
    remediationPath: {
      primaryStrategy: 'conceptual_error',
      steps: [
        { order: 1, titleAr: 'فهم الرموز', type: 'visual', durationMinutes: 5, description: 'Visual distinction between + and - with real objects' },
        { order: 2, titleAr: 'قصص حسابية', type: 'manipulative', durationMinutes: 5, description: 'Story problems connecting operations to real situations' },
        { order: 3, titleAr: 'تمييز العمليات', type: 'guided', durationMinutes: 5, description: 'Sorting exercises: which operation fits?' },
        { order: 4, titleAr: 'تطبيق', type: 'practice', durationMinutes: 5, description: 'Mixed practice with operation identification first' },
      ],
      estimatedSessions: 3,
      visualAids: ['operation_symbols', 'story_illustrations', 'balance_scale'],
      interactionTypes: ['sort_classify', 'match', 'fill_blank'],
    },
    prerequisiteSkills: ['G1-A-001', 'G1-B-001'],
    commonAge: [5, 8],
    persistenceRisk: 45,
  },
  {
    id: 'ARITH-003',
    category: 'arithmetic',
    nameAr: 'خطأ الحمل في الجمع',
    nameEn: 'Carrying/regrouping error',
    descriptionAr: 'الطالب ينسى الحمل أو يحمل بشكل خاطئ عند جمع أعداد متعددة الأرقام',
    severity: 'high',
    gradeRange: [2, 4],
    indicators: [
      { pattern: 'no_carry', description: 'Ignores carry completely', weight: 0.9, example: { question: '27 + 15', wrongAnswer: '32', correctAnswer: '42' } },
      { pattern: 'wrong_carry_position', description: 'Carries to wrong column', weight: 0.85, example: { question: '38 + 24', wrongAnswer: '512', correctAnswer: '62' } },
      { pattern: 'double_carry', description: 'Carries when not needed', weight: 0.7, example: { question: '23 + 14', wrongAnswer: '47', correctAnswer: '37' } },
    ],
    remediationPath: {
      primaryStrategy: 'procedural_error',
      steps: [
        { order: 1, titleAr: 'المكعبات والعشرات', type: 'manipulative', durationMinutes: 5, description: 'Base-10 blocks showing regrouping physically' },
        { order: 2, titleAr: 'خطوة بخطوة', type: 'guided', durationMinutes: 5, description: 'Guided column addition with carry tracking' },
        { order: 3, titleAr: 'تمرين مع تلميحات', type: 'practice', durationMinutes: 5, description: 'Practice with visual carry reminders' },
        { order: 4, titleAr: 'تقييم', type: 'assessment', durationMinutes: 5, description: 'Assessment without support' },
      ],
      estimatedSessions: 3,
      visualAids: ['base_10_blocks', 'column_method', 'carry_arrows'],
      interactionTypes: ['step_by_step', 'drag_drop', 'fill_blank'],
    },
    prerequisiteSkills: ['G1-A-003', 'G2-C-001'],
    commonAge: [6, 9],
    persistenceRisk: 50,
  },
];

// ============ Place Value Misconceptions ============

const placeValueMisconceptions: MisconceptionProfile[] = [
  {
    id: 'PV-001',
    category: 'place_value',
    nameAr: 'عكس الأرقام',
    nameEn: 'Digit reversal/swap',
    descriptionAr: 'الطالب يعكس ترتيب الأرقام في العدد (مثلاً 47 بدل 74)',
    severity: 'high',
    gradeRange: [1, 3],
    indicators: [
      { pattern: 'digit_swap', description: 'Writes digits in reverse order', weight: 0.95, example: { question: 'اكتب العدد أربعة وسبعون', wrongAnswer: '47', correctAnswer: '74' } },
      { pattern: 'tens_ones_confusion', description: 'Confuses tens and ones place', weight: 0.9, example: { question: 'ما رقم العشرات في 56؟', wrongAnswer: '6', correctAnswer: '5' } },
    ],
    remediationPath: {
      primaryStrategy: 'conceptual_error',
      steps: [
        { order: 1, titleAr: 'جدول المنازل', type: 'visual', durationMinutes: 5, description: 'Place value chart with physical objects' },
        { order: 2, titleAr: 'تفكيك الأعداد', type: 'manipulative', durationMinutes: 5, description: 'Decompose numbers into tens and ones' },
        { order: 3, titleAr: 'بناء الأعداد', type: 'guided', durationMinutes: 5, description: 'Build numbers from place value components' },
        { order: 4, titleAr: 'تمرين', type: 'practice', durationMinutes: 5, description: 'Read and write multi-digit numbers' },
      ],
      estimatedSessions: 3,
      visualAids: ['place_value_chart', 'base_10_blocks', 'number_expander'],
      interactionTypes: ['drag_to_place', 'build_number', 'identify_digit'],
    },
    prerequisiteSkills: ['G1-A-002'],
    commonAge: [5, 8],
    persistenceRisk: 40,
  },
  {
    id: 'PV-002',
    category: 'place_value',
    nameAr: 'تجاهل الصفر المكاني',
    nameEn: 'Zero placeholder ignorance',
    descriptionAr: 'الطالب يتجاهل الصفر كحافظ مكان (مثلاً يكتب 15 بدل 105)',
    severity: 'high',
    gradeRange: [2, 4],
    indicators: [
      { pattern: 'zero_omission', description: 'Omits zero in middle of number', weight: 0.95, example: { question: 'اكتب مئة وخمسة', wrongAnswer: '15', correctAnswer: '105' } },
      { pattern: 'zero_value_confusion', description: 'Thinks zero means nothing/skip', weight: 0.85, example: { question: '203 = ___ مئات + ___ عشرات + ___ آحاد', wrongAnswer: '2, skip, 3', correctAnswer: '2, 0, 3' } },
    ],
    remediationPath: {
      primaryStrategy: 'conceptual_error',
      steps: [
        { order: 1, titleAr: 'دور الصفر', type: 'visual', durationMinutes: 5, description: 'Show zero as placeholder with physical chart' },
        { order: 2, titleAr: 'مقارنة أعداد', type: 'manipulative', durationMinutes: 5, description: 'Compare 15 vs 105 vs 150 with blocks' },
        { order: 3, titleAr: 'ملء الفراغات', type: 'guided', durationMinutes: 5, description: 'Fill in place value charts including zeros' },
        { order: 4, titleAr: 'كتابة أعداد', type: 'practice', durationMinutes: 5, description: 'Write numbers from spoken form' },
      ],
      estimatedSessions: 2,
      visualAids: ['place_value_chart', 'number_comparison', 'abacus'],
      interactionTypes: ['fill_chart', 'compare', 'write_number'],
    },
    prerequisiteSkills: ['G1-A-002', 'G2-C-001'],
    commonAge: [6, 9],
    persistenceRisk: 55,
  },
];

// ============ Fraction Misconceptions ============

const fractionMisconceptions: MisconceptionProfile[] = [
  {
    id: 'FRAC-001',
    category: 'fraction',
    nameAr: 'جمع البسط والمقام معاً',
    nameEn: 'Adding numerators and denominators',
    descriptionAr: 'الطالب يجمع البسط مع البسط والمقام مع المقام عند جمع الكسور',
    severity: 'critical',
    gradeRange: [3, 6],
    indicators: [
      { pattern: 'add_both_parts', description: 'Adds both numerator and denominator', weight: 0.95, example: { question: '1/3 + 1/4', wrongAnswer: '2/7', correctAnswer: '7/12' } },
      { pattern: 'no_common_denominator', description: 'Ignores need for common denominator', weight: 0.9, example: { question: '2/5 + 1/3', wrongAnswer: '3/8', correctAnswer: '11/15' } },
    ],
    remediationPath: {
      primaryStrategy: 'conceptual_error',
      steps: [
        { order: 1, titleAr: 'معنى الكسر', type: 'visual', durationMinutes: 5, description: 'Visual fraction bars showing parts of whole' },
        { order: 2, titleAr: 'المقام المشترك', type: 'manipulative', durationMinutes: 5, description: 'Physical fraction tiles finding common sizes' },
        { order: 3, titleAr: 'خطوات الجمع', type: 'guided', durationMinutes: 5, description: 'Step-by-step guided fraction addition' },
        { order: 4, titleAr: 'تمرين', type: 'practice', durationMinutes: 5, description: 'Practice with visual verification' },
      ],
      estimatedSessions: 4,
      visualAids: ['fraction_bars', 'fraction_circles', 'number_line_fractions'],
      interactionTypes: ['visual_compare', 'step_by_step', 'fill_blank'],
    },
    prerequisiteSkills: ['G3-FRAC-001'],
    commonAge: [8, 11],
    persistenceRisk: 65,
  },
  {
    id: 'FRAC-002',
    category: 'fraction',
    nameAr: 'الكسر الأكبر مقامه أكبر',
    nameEn: 'Larger denominator means larger fraction',
    descriptionAr: 'الطالب يعتقد أن الكسر ذو المقام الأكبر هو الأكبر قيمة',
    severity: 'high',
    gradeRange: [3, 5],
    indicators: [
      { pattern: 'bigger_denom_bigger_fraction', description: 'Chooses fraction with larger denominator as bigger', weight: 0.9, example: { question: 'أيهما أكبر: 1/3 أم 1/5؟', wrongAnswer: '1/5', correctAnswer: '1/3' } },
      { pattern: 'whole_number_thinking', description: 'Applies whole number logic to fractions', weight: 0.85, example: { question: 'رتب: 1/2, 1/4, 1/8', wrongAnswer: '1/8, 1/4, 1/2', correctAnswer: '1/2, 1/4, 1/8' } },
    ],
    remediationPath: {
      primaryStrategy: 'conceptual_error',
      steps: [
        { order: 1, titleAr: 'تقسيم الكعكة', type: 'visual', durationMinutes: 5, description: 'Cut a cake into different pieces - more cuts = smaller pieces' },
        { order: 2, titleAr: 'مقارنة بصرية', type: 'manipulative', durationMinutes: 5, description: 'Compare fraction strips side by side' },
        { order: 3, titleAr: 'ترتيب كسور', type: 'guided', durationMinutes: 5, description: 'Order fractions with visual support' },
        { order: 4, titleAr: 'تمرين', type: 'practice', durationMinutes: 5, description: 'Compare fractions independently' },
      ],
      estimatedSessions: 2,
      visualAids: ['fraction_strips', 'pie_charts', 'number_line'],
      interactionTypes: ['compare_visual', 'order_drag', 'select_larger'],
    },
    prerequisiteSkills: ['G3-FRAC-001'],
    commonAge: [8, 10],
    persistenceRisk: 50,
  },
];

// ============ Sequencing Misconceptions ============

const sequencingMisconceptions: MisconceptionProfile[] = [
  {
    id: 'SEQ-001',
    category: 'sequencing',
    nameAr: 'خطأ نمط التسلسل',
    nameEn: 'Sequence pattern error',
    descriptionAr: 'الطالب يحدد نمط التسلسل بشكل خاطئ أو يطبقه بشكل غير متسق',
    severity: 'medium',
    gradeRange: [1, 3],
    indicators: [
      { pattern: 'wrong_rule', description: 'Identifies wrong pattern rule', weight: 0.85, example: { question: '2, 4, 6, 8, ___', wrongAnswer: '9', correctAnswer: '10' } },
      { pattern: 'inconsistent_application', description: 'Applies rule inconsistently', weight: 0.8, example: { question: '5, 10, 15, ___', wrongAnswer: '25', correctAnswer: '20' } },
    ],
    remediationPath: {
      primaryStrategy: 'procedural_error',
      steps: [
        { order: 1, titleAr: 'اكتشاف النمط', type: 'visual', durationMinutes: 5, description: 'Highlight differences between consecutive terms' },
        { order: 2, titleAr: 'تطبيق القاعدة', type: 'guided', durationMinutes: 5, description: 'Guided application of pattern rule' },
        { order: 3, titleAr: 'تمرين', type: 'practice', durationMinutes: 5, description: 'Complete sequences independently' },
      ],
      estimatedSessions: 2,
      visualAids: ['number_line', 'pattern_blocks', 'arrows'],
      interactionTypes: ['fill_next', 'identify_rule', 'build_sequence'],
    },
    prerequisiteSkills: ['G1-A-001', 'G1-A-002'],
    commonAge: [5, 8],
    persistenceRisk: 25,
  },
];

// ============ Comparison Misconceptions ============

const comparisonMisconceptions: MisconceptionProfile[] = [
  {
    id: 'COMP-001',
    category: 'comparison',
    nameAr: 'خلط رموز المقارنة',
    nameEn: 'Comparison symbol confusion',
    descriptionAr: 'الطالب يخلط بين رمزي أكبر من وأصغر من',
    severity: 'medium',
    gradeRange: [1, 3],
    indicators: [
      { pattern: 'symbol_reversal', description: 'Uses > when < is correct and vice versa', weight: 0.9, example: { question: '5 ___ 9', wrongAnswer: '>', correctAnswer: '<' } },
      { pattern: 'direction_confusion', description: 'Confused about which way symbol points', weight: 0.85, example: { question: '12 ___ 7', wrongAnswer: '<', correctAnswer: '>' } },
    ],
    remediationPath: {
      primaryStrategy: 'conceptual_error',
      steps: [
        { order: 1, titleAr: 'التمساح الجائع', type: 'visual', durationMinutes: 5, description: 'Crocodile mouth always eats the bigger number' },
        { order: 2, titleAr: 'مقارنة أشياء', type: 'manipulative', durationMinutes: 5, description: 'Compare physical objects and use symbols' },
        { order: 3, titleAr: 'تمرين', type: 'practice', durationMinutes: 5, description: 'Fill in comparison symbols' },
      ],
      estimatedSessions: 2,
      visualAids: ['crocodile_mouth', 'number_line', 'balance_scale'],
      interactionTypes: ['select_symbol', 'compare_visual', 'fill_blank'],
    },
    prerequisiteSkills: ['G1-A-001'],
    commonAge: [5, 7],
    persistenceRisk: 20,
  },
];

// ============ Procedural Misconceptions ============

const proceduralMisconceptions: MisconceptionProfile[] = [
  {
    id: 'PROC-001',
    category: 'procedural',
    nameAr: 'خطأ ترتيب العمليات',
    nameEn: 'Order of operations error',
    descriptionAr: 'الطالب يحل العمليات من اليسار لليمين بدون مراعاة أولوية العمليات',
    severity: 'high',
    gradeRange: [3, 6],
    indicators: [
      { pattern: 'left_to_right_only', description: 'Solves strictly left to right', weight: 0.9, example: { question: '3 + 4 × 2', wrongAnswer: '14', correctAnswer: '11' } },
      { pattern: 'no_brackets_priority', description: 'Ignores brackets', weight: 0.85, example: { question: '(2 + 3) × 4', wrongAnswer: '14', correctAnswer: '20' } },
    ],
    remediationPath: {
      primaryStrategy: 'procedural_error',
      steps: [
        { order: 1, titleAr: 'قواعد الأولوية', type: 'visual', durationMinutes: 5, description: 'Visual hierarchy of operations' },
        { order: 2, titleAr: 'خطوة بخطوة', type: 'guided', durationMinutes: 5, description: 'Guided step-by-step with priority highlighting' },
        { order: 3, titleAr: 'تمرين', type: 'practice', durationMinutes: 5, description: 'Practice with self-checking' },
      ],
      estimatedSessions: 3,
      visualAids: ['priority_pyramid', 'step_highlighter', 'bracket_colors'],
      interactionTypes: ['order_steps', 'highlight_first', 'fill_blank'],
    },
    prerequisiteSkills: ['G2-C-001', 'G2-C-003'],
    commonAge: [8, 11],
    persistenceRisk: 45,
  },
];

// ============ Full Taxonomy Registry ============

export const MISCONCEPTION_TAXONOMY: MisconceptionProfile[] = [
  ...arithmeticMisconceptions,
  ...placeValueMisconceptions,
  ...fractionMisconceptions,
  ...sequencingMisconceptions,
  ...comparisonMisconceptions,
  ...proceduralMisconceptions,
];

// ============ Lookup Functions ============

export function getMisconceptionById(id: string): MisconceptionProfile | null {
  return MISCONCEPTION_TAXONOMY.find(m => m.id === id) || null;
}

export function getMisconceptionsByCategory(category: MisconceptionCategory): MisconceptionProfile[] {
  return MISCONCEPTION_TAXONOMY.filter(m => m.category === category);
}

export function getMisconceptionsForGrade(grade: number): MisconceptionProfile[] {
  return MISCONCEPTION_TAXONOMY.filter(m => grade >= m.gradeRange[0] && grade <= m.gradeRange[1]);
}

export function getMisconceptionsForSkill(skillId: string): MisconceptionProfile[] {
  return MISCONCEPTION_TAXONOMY.filter(m => m.prerequisiteSkills.includes(skillId));
}

export function getHighRiskMisconceptions(threshold: number = 50): MisconceptionProfile[] {
  return MISCONCEPTION_TAXONOMY.filter(m => m.persistenceRisk >= threshold)
    .sort((a, b) => b.persistenceRisk - a.persistenceRisk);
}

export function getRemediationForMisconception(misconceptionId: string): RemediationPath | null {
  const profile = getMisconceptionById(misconceptionId);
  return profile?.remediationPath || null;
}

// ============ Detection Matching ============

export interface PatternMatch {
  misconceptionId: string;
  confidence: number;
  matchedIndicators: string[];
  category: MisconceptionCategory;
}

export function matchAnswerToMisconception(
  studentAnswer: number | string,
  correctAnswer: number | string,
  skillId: string,
  questionContext?: string
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  const sAns = String(studentAnswer);
  const cAns = String(correctAnswer);

  // Check digit swap
  if (sAns.length === cAns.length && sAns.length >= 2) {
    const reversed = sAns.split('').reverse().join('');
    if (reversed === cAns) {
      matches.push({ misconceptionId: 'PV-001', confidence: 90, matchedIndicators: ['digit_swap'], category: 'place_value' });
    }
  }

  // Check off-by-one
  const numS = Number(studentAnswer);
  const numC = Number(correctAnswer);
  if (!isNaN(numS) && !isNaN(numC)) {
    if (Math.abs(numS - numC) === 1) {
      matches.push({ misconceptionId: 'ARITH-001', confidence: 70, matchedIndicators: ['off_by_one_plus'], category: 'arithmetic' });
    }

    // Check operation inversion (answer = a + b when should be a - b)
    if (questionContext?.includes('-') && numS === numC + 2 * Math.abs(numS - numC)) {
      matches.push({ misconceptionId: 'ARITH-002', confidence: 75, matchedIndicators: ['add_instead_subtract'], category: 'arithmetic' });
    }

    // Check no-carry error
    if (numC > 20 && numS < numC && (numC - numS) % 10 === 0) {
      matches.push({ misconceptionId: 'ARITH-003', confidence: 60, matchedIndicators: ['no_carry'], category: 'arithmetic' });
    }
  }

  // Check comparison symbol confusion
  if ((sAns === '>' && cAns === '<') || (sAns === '<' && cAns === '>')) {
    matches.push({ misconceptionId: 'COMP-001', confidence: 85, matchedIndicators: ['symbol_reversal'], category: 'comparison' });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

// ============ Category Statistics ============

export function getCategoryStats(): Record<MisconceptionCategory, { count: number; avgPersistence: number; avgSeverity: number }> {
  const categories: MisconceptionCategory[] = ['arithmetic', 'place_value', 'fraction', 'sequencing', 'comparison', 'procedural', 'measurement', 'geometry'];
  const severityMap = { low: 1, medium: 2, high: 3, critical: 4 };

  const stats: Record<string, { count: number; avgPersistence: number; avgSeverity: number }> = {};

  for (const cat of categories) {
    const items = getMisconceptionsByCategory(cat);
    if (items.length === 0) {
      stats[cat] = { count: 0, avgPersistence: 0, avgSeverity: 0 };
    } else {
      stats[cat] = {
        count: items.length,
        avgPersistence: Math.round(items.reduce((s, i) => s + i.persistenceRisk, 0) / items.length),
        avgSeverity: Math.round((items.reduce((s, i) => s + severityMap[i.severity], 0) / items.length) * 10) / 10,
      };
    }
  }

  return stats as Record<MisconceptionCategory, { count: number; avgPersistence: number; avgSeverity: number }>;
}