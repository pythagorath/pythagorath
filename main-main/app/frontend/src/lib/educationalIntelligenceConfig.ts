// Educational Intelligence Configuration Layer
// Shared types, curriculum mappings, and skill graph connections
// Used by both Expansion Questions and Abacus Management systems

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type CognitiveType = 'recall' | 'comprehension' | 'application' | 'analysis' | 'synthesis' | 'evaluation';
export type InteractionType = 'multiple_choice' | 'drag_drop' | 'number_input' | 'visual_match' | 'sorting' | 'fill_blank' | 'true_false' | 'drawing' | 'abacus_manipulation' | 'dice_roll';
export type QuestionStatus = 'draft' | 'review' | 'published' | 'archived' | 'revision';
export type MisconceptionType = 'procedural' | 'conceptual' | 'factual' | 'careless' | 'language_barrier';
export type AbacusOperationType = 'represent' | 'read' | 'add' | 'subtract' | 'place_value' | 'mental_viz' | 'fast_mental' | 'carry' | 'borrow';
export type AbacusLevelStatus = 'draft' | 'published' | 'archived';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type AdaptiveSignal = 'mastery_level' | 'error_pattern' | 'response_time' | 'streak' | 'fatigue' | 'prerequisite_gap';

export interface SkillMapping {
  skillId: string;
  skillName: string;
  domain: string;
  subDomain: string;
}

export interface CurriculumMapping {
  grade: 1 | 2;
  semester: 1 | 2;
  unit: string;
  lesson: string;
  subject: string;
}

export interface PrerequisiteRelation {
  requiredSkillId: string;
  requiredMasteryLevel: number; // 0-100
  relationship: 'prerequisite' | 'corequisite' | 'recommended';
}

export interface RemediationTarget {
  targetSkillId: string;
  remediationType: 'reteach' | 'scaffold' | 'alternative_approach' | 'visual_aid' | 'decompose';
  priority: number;
}

export interface ManagedQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  // Skill & Curriculum
  skillMapping: SkillMapping;
  curriculumMapping: CurriculumMapping;
  // Cognitive
  cognitiveType: CognitiveType;
  difficulty: DifficultyLevel;
  masteryWeight: number; // 1-10
  // Relationships
  prerequisites: PrerequisiteRelation[];
  remediationTargets: RemediationTarget[];
  // Interaction
  interactionType: InteractionType;
  hasVisual: boolean;
  visualType?: string;
  visualData?: Record<string, unknown>;
  // Misconceptions
  misconceptionType: MisconceptionType[];
  commonErrors: string[];
  // Status
  status: QuestionStatus;
  createdBy: 'admin' | 'ai' | 'imported';
  createdAt: string;
  updatedAt: string;
  // Performance
  successRate: number;
  attempts: number;
  avgResponseTime: number;
  discriminationIndex: number; // IRT parameter
}

export interface AbacusExercise {
  id: string;
  levelId: string;
  title: string;
  instruction: string;
  operationType: AbacusOperationType;
  // Number ranges
  minValue: number;
  maxValue: number;
  operand1Range: [number, number];
  operand2Range: [number, number];
  // Configuration
  difficulty: DifficultyLevel;
  timeLimit: number; // seconds, 0 = unlimited
  hintsAllowed: number;
  showAbacus: boolean; // false for mental math
  // Curriculum
  skillMapping: SkillMapping;
  curriculumMapping: CurriculumMapping;
  // Adaptive
  masteryThreshold: number; // % correct to pass
  requiredStreak: number;
  adaptiveSpeedUp: boolean;
  // Status
  status: AbacusLevelStatus;
  order: number;
}

export interface AbacusLevel {
  id: string;
  stage: number;
  title: string;
  titleAr: string;
  description: string;
  icon: string;
  // Configuration
  exercises: AbacusExercise[];
  prerequisiteLevels: string[];
  // Progression
  masteryThreshold: number;
  requiredExercises: number;
  // Adaptive
  adaptivePacing: boolean;
  remediationPath: string[]; // level IDs to fall back to
  // Skill links
  linkedSkills: string[];
  grade: 1 | 2;
  // Status
  status: AbacusLevelStatus;
  order: number;
}

export interface AbacusModuleConfig {
  enabled: boolean;
  levels: AbacusLevel[];
  globalSettings: {
    questionsPerSession: number;
    maxHintsPerSession: number;
    adaptiveEnabled: boolean;
    mentalTransitionStage: number;
    maxDifficulty: DifficultyLevel;
    sessionCooldown: number; // minutes
    maxSessionsPerDay: number;
  };
}

export interface StudentAdaptiveState {
  studentId: string;
  grade: 1 | 2;
  currentMasteryLevels: Record<string, number>; // skillId -> mastery %
  completedLessons: string[];
  errorPatterns: Record<string, number>;
  avgResponseTime: number;
  currentStreak: number;
  fatigueLevel: number; // 0-100
  lastSessionDate: string;
  assignedMissions: string[];
  abacusProgress: {
    currentStage: number;
    stageMastery: Record<number, number>;
    visualizationLevel: string;
  };
}

// ═══════════════════════════════════════════════════════
// CURRICULUM DATA
// ═══════════════════════════════════════════════════════

export const GRADE_OPTIONS = [
  { value: 1, label: 'الصف الأول' },
  { value: 2, label: 'الصف الثاني' },
];

export const SEMESTER_OPTIONS = [
  { value: 1, label: 'الفصل الأول' },
  { value: 2, label: 'الفصل الثاني' },
];

export const SUBJECT_OPTIONS = [
  { value: 'math', label: 'الرياضيات' },
  { value: 'numbers', label: 'الأعداد' },
  { value: 'geometry', label: 'الهندسة' },
  { value: 'measurement', label: 'القياس' },
  { value: 'data', label: 'البيانات' },
  { value: 'patterns', label: 'الأنماط' },
];

export const COGNITIVE_TYPE_OPTIONS: { value: CognitiveType; label: string; icon: string }[] = [
  { value: 'recall', label: 'تذكّر', icon: '🧠' },
  { value: 'comprehension', label: 'فهم', icon: '💡' },
  { value: 'application', label: 'تطبيق', icon: '🔧' },
  { value: 'analysis', label: 'تحليل', icon: '🔍' },
  { value: 'synthesis', label: 'تركيب', icon: '🧩' },
  { value: 'evaluation', label: 'تقويم', icon: '⚖️' },
];

export const INTERACTION_TYPE_OPTIONS: { value: InteractionType; label: string; icon: string }[] = [
  { value: 'multiple_choice', label: 'اختيار من متعدد', icon: '☑️' },
  { value: 'drag_drop', label: 'سحب وإفلات', icon: '🖱️' },
  { value: 'number_input', label: 'إدخال رقم', icon: '🔢' },
  { value: 'visual_match', label: 'مطابقة بصرية', icon: '👁️' },
  { value: 'sorting', label: 'ترتيب', icon: '📊' },
  { value: 'fill_blank', label: 'ملء الفراغ', icon: '✏️' },
  { value: 'true_false', label: 'صح أو خطأ', icon: '✓✗' },
  { value: 'drawing', label: 'رسم', icon: '🎨' },
  { value: 'abacus_manipulation', label: 'تحريك المعداد', icon: '🧮' },
  { value: 'dice_roll', label: 'رمي النرد', icon: '🎲' },
];

export const MISCONCEPTION_TYPE_OPTIONS: { value: MisconceptionType; label: string }[] = [
  { value: 'procedural', label: 'إجرائي' },
  { value: 'conceptual', label: 'مفاهيمي' },
  { value: 'factual', label: 'حقائقي' },
  { value: 'careless', label: 'سهو' },
  { value: 'language_barrier', label: 'حاجز لغوي' },
];

export const ABACUS_OPERATION_OPTIONS: { value: AbacusOperationType; label: string; icon: string }[] = [
  { value: 'represent', label: 'تمثيل الأعداد', icon: '🔢' },
  { value: 'read', label: 'قراءة الأعداد', icon: '👁️' },
  { value: 'add', label: 'الجمع', icon: '➕' },
  { value: 'subtract', label: 'الطرح', icon: '➖' },
  { value: 'place_value', label: 'القيمة المكانية', icon: '🏗️' },
  { value: 'mental_viz', label: 'التصور الذهني', icon: '🧠' },
  { value: 'fast_mental', label: 'الحساب الذهني السريع', icon: '⚡' },
  { value: 'carry', label: 'الجمع مع الحمل', icon: '📤' },
  { value: 'borrow', label: 'الطرح مع الاستلاف', icon: '📥' },
];

export const SKILL_DOMAINS = [
  { id: 'numbers', label: 'الأعداد والعمليات', skills: [
    { id: 'G1-N-001', name: 'العد حتى 20' },
    { id: 'G1-N-002', name: 'الجمع حتى 10' },
    { id: 'G1-N-003', name: 'الطرح حتى 10' },
    { id: 'G1-N-017', name: 'الأعداد الزوجية والفردية' },
    { id: 'G1-N-018', name: 'الجمع على خط الأعداد' },
    { id: 'G1-N-019', name: 'العدد المكمل للعشرة' },
    { id: 'G1-N-020', name: 'الضعف والنصف' },
    { id: 'G1-N-021', name: 'العشرات والآحاد' },
    { id: 'G1-N-022', name: 'العد بالعشرات حتى 100' },
    { id: 'G2-N-001', name: 'العد حتى 100' },
    { id: 'G2-N-002', name: 'استخدام لوحة المائة' },
    { id: 'G2-N-009', name: 'الأزواج العددية للعدد 20' },
    { id: 'G2-N-010', name: 'الأزواج العددية حتى 100' },
  ]},
  { id: 'geometry', label: 'الهندسة', skills: [
    { id: 'G1-G-001', name: 'الأشكال الأساسية' },
    { id: 'G1-G-003', name: 'عد الأشكال' },
    { id: 'G1-G-005', name: 'التماثل في الأشكال' },
  ]},
  { id: 'measurement', label: 'القياس', skills: [
    { id: 'G1-M-002', name: 'مقارنة السعة' },
    { id: 'G1-M-003', name: 'مقارنة الوزن' },
  ]},
  { id: 'time', label: 'الوقت والنقود', skills: [
    { id: 'G1-T-003', name: 'أيام الأسبوع' },
    { id: 'G1-T-004', name: 'أشهر السنة' },
    { id: 'G1-T-005', name: 'قراءة الوقت بالنصف ساعة' },
    { id: 'G1-T-006', name: 'جمع النقود البسيطة' },
  ]},
  { id: 'data', label: 'البيانات', skills: [
    { id: 'G1-D-001', name: 'عد وتسجيل بيانات بسيطة' },
    { id: 'G1-D-002', name: 'قراءة مخطط الصور والمكعبات' },
  ]},
  { id: 'patterns', label: 'الأنماط', skills: [
    { id: 'G1-P-001', name: 'استكمال النمط' },
  ]},
  { id: 'abacus', label: 'المعداد', skills: [
    { id: 'AB-001', name: 'تمثيل الأعداد على المعداد' },
    { id: 'AB-002', name: 'قراءة الأعداد من المعداد' },
    { id: 'AB-003', name: 'الجمع البسيط بالمعداد' },
    { id: 'AB-004', name: 'الطرح البسيط بالمعداد' },
    { id: 'AB-005', name: 'القيمة المكانية بالمعداد' },
    { id: 'AB-006', name: 'الجمع مع الحمل بالمعداد' },
    { id: 'AB-007', name: 'الحساب الذهني بالمعداد' },
  ]},
  { id: 'dice', label: 'النرد', skills: [
    { id: 'DC-001', name: 'النرد - الجمع' },
    { id: 'DC-002', name: 'النرد - الطرح' },
    { id: 'DC-003', name: 'النرد - الضرب' },
    { id: 'DC-004', name: 'النرد - المقارنة' },
    { id: 'DC-005', name: 'النرد - الاحتمالات' },
    { id: 'DC-006', name: 'النرد - القيمة المكانية' },
  ]},
];

// ═══════════════════════════════════════════════════════
// ADAPTIVE HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Determine which questions are appropriate for a student based on adaptive state
 */
export function filterQuestionsForStudent(
  questions: ManagedQuestion[],
  studentState: StudentAdaptiveState
): ManagedQuestion[] {
  return questions.filter(q => {
    // Grade match
    if (q.curriculumMapping.grade !== studentState.grade) return false;
    // Status must be published
    if (q.status !== 'published') return false;
    // Check prerequisites
    const prereqsMet = q.prerequisites.every(p => {
      const mastery = studentState.currentMasteryLevels[p.requiredSkillId] || 0;
      return mastery >= p.requiredMasteryLevel;
    });
    if (!prereqsMet) return false;
    return true;
  });
}

/**
 * Determine which abacus level is appropriate for a student
 */
export function getStudentAbacusLevel(
  config: AbacusModuleConfig,
  studentState: StudentAdaptiveState
): AbacusLevel | null {
  if (!config.enabled) return null;
  const publishedLevels = config.levels
    .filter(l => l.status === 'published' && l.grade === studentState.grade)
    .sort((a, b) => a.order - b.order);
  
  // Find the first level where student hasn't reached mastery
  for (const level of publishedLevels) {
    const stageMastery = studentState.abacusProgress.stageMastery[level.stage] || 0;
    if (stageMastery < level.masteryThreshold) {
      // Check prerequisites
      const prereqsMet = level.prerequisiteLevels.every(prereqId => {
        const prereqLevel = publishedLevels.find(l => l.id === prereqId);
        if (!prereqLevel) return true;
        const prereqMastery = studentState.abacusProgress.stageMastery[prereqLevel.stage] || 0;
        return prereqMastery >= prereqLevel.masteryThreshold;
      });
      if (prereqsMet) return level;
    }
  }
  return publishedLevels[publishedLevels.length - 1] || null;
}

/**
 * Generate adaptive exercise parameters based on student state
 */
export function adaptExerciseForStudent(
  exercise: AbacusExercise,
  studentState: StudentAdaptiveState
): AbacusExercise {
  const mastery = studentState.abacusProgress.stageMastery[
    parseInt(exercise.levelId.split('-')[1]) || 1
  ] || 0;
  
  // Adjust difficulty based on mastery
  let adjustedDifficulty = exercise.difficulty;
  if (mastery > 80) adjustedDifficulty = Math.min(5, exercise.difficulty + 1) as DifficultyLevel;
  if (mastery < 40) adjustedDifficulty = Math.max(1, exercise.difficulty - 1) as DifficultyLevel;
  
  // Adjust time limit based on fatigue
  let adjustedTimeLimit = exercise.timeLimit;
  if (studentState.fatigueLevel > 60) adjustedTimeLimit = Math.round(exercise.timeLimit * 1.3);
  
  // Adjust hints based on streak
  let adjustedHints = exercise.hintsAllowed;
  if (studentState.currentStreak < 2) adjustedHints = Math.min(5, exercise.hintsAllowed + 1);
  
  return {
    ...exercise,
    difficulty: adjustedDifficulty,
    timeLimit: adjustedTimeLimit,
    hintsAllowed: adjustedHints,
  };
}

/**
 * Select next question based on adaptive signals
 */
export function selectNextQuestion(
  availableQuestions: ManagedQuestion[],
  studentState: StudentAdaptiveState,
  recentQuestionIds: string[]
): ManagedQuestion | null {
  if (availableQuestions.length === 0) return null;
  
  // Filter out recently asked questions
  const fresh = availableQuestions.filter(q => !recentQuestionIds.includes(q.id));
  const pool = fresh.length > 0 ? fresh : availableQuestions;
  
  // Score each question based on adaptive signals
  const scored = pool.map(q => {
    let score = 0;
    const skillMastery = studentState.currentMasteryLevels[q.skillMapping.skillId] || 0;
    
    // Prefer questions in ZPD (zone of proximal development)
    if (skillMastery >= 30 && skillMastery <= 70) score += 30;
    else if (skillMastery < 30) score += 10; // too hard
    else score += 5; // already mastered
    
    // Prefer remediation targets if student has error patterns
    const hasErrors = q.remediationTargets.some(r => 
      (studentState.errorPatterns[r.targetSkillId] || 0) > 2
    );
    if (hasErrors) score += 20;
    
    // Difficulty alignment
    const idealDifficulty = Math.ceil(skillMastery / 20) as DifficultyLevel;
    const diffDelta = Math.abs(q.difficulty - idealDifficulty);
    score += Math.max(0, 15 - diffDelta * 5);
    
    // Fatigue consideration - prefer easier when tired
    if (studentState.fatigueLevel > 50 && q.difficulty <= 2) score += 10;
    
    return { question: q, score };
  });
  
  // Sort by score descending and pick top
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.question || null;
}