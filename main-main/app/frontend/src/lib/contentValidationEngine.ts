/**
 * Content Validation Engine
 * Validates content before publishing to protect student experience.
 * 
 * 6 Validation Types:
 * 1. Duplicate Detection - same name/title in same scope
 * 2. Invalid Subject/Grade Combinations - subjects assigned to wrong grades
 * 3. Invalid Interaction-Age Combinations - complex interactions for young students
 * 4. Curriculum Mismatches - content not aligned with curriculum structure
 * 5. Invalid Onboarding Flows - missing prerequisites for first interactions
 * 6. Invalid Routing Chains - broken navigation paths
 */

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory = 
  | 'duplicate'
  | 'grade_mismatch'
  | 'age_interaction'
  | 'curriculum_mismatch'
  | 'onboarding_flow'
  | 'routing_chain';

export interface ValidationResult {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  entity_type: string;
  entity_id: number;
  entity_name: string;
  message: string;
  suggestion: string;
  blocking: boolean; // If true, blocks publish
}

export interface ContentItem {
  id: number;
  name?: string;
  title?: string;
  status: string;
  grade_id?: number;
  semester_id?: number;
  subject_id?: number;
  unit_id?: number;
  lesson_id?: number;
  skill_id?: number;
  question_type?: string;
  difficulty?: string;
  display_order?: number;
  config_json?: string;
  [key: string]: unknown;
}

export interface ValidationContext {
  grades: ContentItem[];
  semesters: ContentItem[];
  subjects: ContentItem[];
  units: ContentItem[];
  lessons: ContentItem[];
  skills: ContentItem[];
  questions: ContentItem[];
}

// Grade ranges for subjects (Oman curriculum)
const SUBJECT_GRADE_RANGES: Record<string, [number, number]> = {
  'الرياضيات': [1, 12],
  'اللغة العربية': [1, 12],
  'اللغة الإنجليزية': [1, 12],
  'العلوم': [1, 12],
  'التربية الإسلامية': [1, 12],
  'الدراسات الاجتماعية': [1, 12],
  'الفيزياء': [7, 12],
  'الكيمياء': [7, 12],
  'الأحياء': [7, 12],
  'الجغرافيا': [7, 12],
  'التاريخ': [7, 12],
  'العلوم البيئية': [5, 12],
  'هذا وطني': [11, 12],
};

// Interaction complexity by type (1=simple, 3=complex)
const INTERACTION_COMPLEXITY: Record<string, number> = {
  'tap': 1,
  'counting_blocks': 1,
  'missing_number': 1,
  'number_line': 2,
  'drag_drop': 2,
  'matching': 2,
  'sequence_ordering': 2,
  'shape_grouping': 2,
  'analog_clock': 3,
  'coin_money': 3,
};

// Minimum grade for complex interactions
const MIN_GRADE_FOR_COMPLEXITY: Record<number, number> = {
  1: 1, // Simple: all grades
  2: 2, // Medium: grade 2+
  3: 3, // Complex: grade 3+
};

/**
 * Run all validations on content items
 */
export function validateContent(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  results.push(...detectDuplicates(context));
  results.push(...validateGradeCombinations(context));
  results.push(...validateAgeInteractions(context));
  results.push(...validateCurriculumAlignment(context));
  results.push(...validateOnboardingFlows(context));
  results.push(...validateRoutingChains(context));

  return results;
}

/**
 * Filter only blocking errors (prevent publish)
 */
export function getBlockingErrors(results: ValidationResult[]): ValidationResult[] {
  return results.filter(r => r.blocking);
}

/**
 * Filter warnings (allow publish but show)
 */
export function getWarnings(results: ValidationResult[]): ValidationResult[] {
  return results.filter(r => !r.blocking);
}

/**
 * 1. Duplicate Detection
 * Find items with same name in the same scope
 */
function detectDuplicates(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check subjects: same name in same grade+semester
  const subjectKeys = new Map<string, ContentItem[]>();
  for (const s of context.subjects) {
    const key = `${s.grade_id}-${s.semester_id}-${s.name}`;
    if (!subjectKeys.has(key)) subjectKeys.set(key, []);
    subjectKeys.get(key)!.push(s);
  }
  for (const [, items] of subjectKeys) {
    if (items.length > 1) {
      for (const item of items.slice(1)) {
        results.push({
          id: `dup-subject-${item.id}`,
          category: 'duplicate',
          severity: 'error',
          entity_type: 'subjects',
          entity_id: item.id,
          entity_name: item.name || '',
          message: `مادة مكررة: "${item.name}" موجودة أكثر من مرة في نفس الصف والفصل`,
          suggestion: 'احذف النسخة المكررة أو أعد تسميتها',
          blocking: true,
        });
      }
    }
  }

  // Check units: same name in same subject
  const unitKeys = new Map<string, ContentItem[]>();
  for (const u of context.units) {
    const key = `${u.subject_id}-${u.name}`;
    if (!unitKeys.has(key)) unitKeys.set(key, []);
    unitKeys.get(key)!.push(u);
  }
  for (const [, items] of unitKeys) {
    if (items.length > 1) {
      for (const item of items.slice(1)) {
        results.push({
          id: `dup-unit-${item.id}`,
          category: 'duplicate',
          severity: 'warning',
          entity_type: 'units',
          entity_id: item.id,
          entity_name: item.name || '',
          message: `وحدة مكررة: "${item.name}" موجودة أكثر من مرة في نفس المادة`,
          suggestion: 'تحقق من أن هذا مقصود أو أعد التسمية',
          blocking: false,
        });
      }
    }
  }

  // Check lessons: same title in same unit
  const lessonKeys = new Map<string, ContentItem[]>();
  for (const l of context.lessons) {
    const key = `${l.unit_id}-${l.title}`;
    if (!lessonKeys.has(key)) lessonKeys.set(key, []);
    lessonKeys.get(key)!.push(l);
  }
  for (const [, items] of lessonKeys) {
    if (items.length > 1) {
      for (const item of items.slice(1)) {
        results.push({
          id: `dup-lesson-${item.id}`,
          category: 'duplicate',
          severity: 'warning',
          entity_type: 'lessons',
          entity_id: item.id,
          entity_name: item.title || '',
          message: `درس مكرر: "${item.title}" موجود أكثر من مرة في نفس الوحدة`,
          suggestion: 'تحقق من أن هذا مقصود أو أعد التسمية',
          blocking: false,
        });
      }
    }
  }

  return results;
}

/**
 * 2. Invalid Subject/Grade Combinations
 */
function validateGradeCombinations(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const subject of context.subjects) {
    const subjectName = subject.name || '';
    const gradeId = subject.grade_id;
    if (!gradeId) continue;

    // Find the grade's display_order (which represents the actual grade number)
    const grade = context.grades.find(g => g.id === gradeId);
    const gradeNumber = grade?.display_order || gradeId;

    // Check against known ranges
    for (const [name, [min, max]] of Object.entries(SUBJECT_GRADE_RANGES)) {
      if (subjectName.includes(name) || name.includes(subjectName)) {
        if (gradeNumber < min || gradeNumber > max) {
          results.push({
            id: `grade-mismatch-${subject.id}`,
            category: 'grade_mismatch',
            severity: 'error',
            entity_type: 'subjects',
            entity_id: subject.id,
            entity_name: subjectName,
            message: `"${subjectName}" غير مناسبة للصف ${gradeNumber} (المدى المسموح: ${min}-${max})`,
            suggestion: `انقل المادة إلى صف بين ${min} و ${max}`,
            blocking: true,
          });
        }
        break;
      }
    }
  }

  return results;
}

/**
 * 3. Invalid Interaction-Age Combinations
 */
function validateAgeInteractions(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const question of context.questions) {
    const qType = question.question_type || '';
    const complexity = INTERACTION_COMPLEXITY[qType] || 1;
    const minGrade = MIN_GRADE_FOR_COMPLEXITY[complexity] || 1;

    // Find the skill → subject → grade chain
    const skill = context.skills.find(s => s.id === question.skill_id);
    if (!skill) continue;

    const gradeId = skill.grade_id;
    const grade = context.grades.find(g => g.id === gradeId);
    const gradeNumber = grade?.display_order || gradeId || 1;

    if (gradeNumber < minGrade) {
      results.push({
        id: `age-interaction-${question.id}`,
        category: 'age_interaction',
        severity: 'warning',
        entity_type: 'questions',
        entity_id: question.id,
        entity_name: (question as ContentItem & { question_text?: string }).question_text?.slice(0, 40) || `سؤال #${question.id}`,
        message: `نوع التفاعل "${qType}" معقد جداً للصف ${gradeNumber} (يُنصح بالصف ${minGrade}+)`,
        suggestion: `استخدم تفاعل أبسط مثل "tap" أو "counting_blocks" لهذا الصف`,
        blocking: false,
      });
    }
  }

  return results;
}

/**
 * 4. Curriculum Mismatches
 */
function validateCurriculumAlignment(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check units without subjects
  for (const unit of context.units) {
    if (unit.subject_id) {
      const subject = context.subjects.find(s => s.id === unit.subject_id);
      if (!subject) {
        results.push({
          id: `curriculum-orphan-unit-${unit.id}`,
          category: 'curriculum_mismatch',
          severity: 'error',
          entity_type: 'units',
          entity_id: unit.id,
          entity_name: unit.name || '',
          message: `الوحدة "${unit.name}" مرتبطة بمادة غير موجودة (ID: ${unit.subject_id})`,
          suggestion: 'اربط الوحدة بمادة موجودة أو احذفها',
          blocking: true,
        });
      }
    }
  }

  // Check lessons without units
  for (const lesson of context.lessons) {
    if (lesson.unit_id) {
      const unit = context.units.find(u => u.id === lesson.unit_id);
      if (!unit) {
        results.push({
          id: `curriculum-orphan-lesson-${lesson.id}`,
          category: 'curriculum_mismatch',
          severity: 'error',
          entity_type: 'lessons',
          entity_id: lesson.id,
          entity_name: lesson.title || '',
          message: `الدرس "${lesson.title}" مرتبط بوحدة غير موجودة (ID: ${lesson.unit_id})`,
          suggestion: 'اربط الدرس بوحدة موجودة أو احذفه',
          blocking: true,
        });
      }
    }
  }

  // Check skills without valid references
  for (const skill of context.skills) {
    if (skill.subject_id) {
      const subject = context.subjects.find(s => s.id === skill.subject_id);
      if (!subject) {
        results.push({
          id: `curriculum-orphan-skill-${skill.id}`,
          category: 'curriculum_mismatch',
          severity: 'warning',
          entity_type: 'skills',
          entity_id: skill.id,
          entity_name: skill.name || '',
          message: `المهارة "${skill.name}" مرتبطة بمادة غير موجودة`,
          suggestion: 'اربط المهارة بمادة صحيحة',
          blocking: false,
        });
      }
    }
  }

  return results;
}

/**
 * 5. Invalid Onboarding Flows
 */
function validateOnboardingFlows(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check subjects with no units
  for (const subject of context.subjects) {
    if (subject.status !== 'published') continue;
    const units = context.units.filter(u => u.subject_id === subject.id);
    if (units.length === 0) {
      results.push({
        id: `onboarding-no-units-${subject.id}`,
        category: 'onboarding_flow',
        severity: 'error',
        entity_type: 'subjects',
        entity_id: subject.id,
        entity_name: subject.name || '',
        message: `المادة "${subject.name}" منشورة لكن بدون وحدات`,
        suggestion: 'أضف وحدة واحدة على الأقل قبل النشر',
        blocking: true,
      });
    }
  }

  // Check units with no lessons
  for (const unit of context.units) {
    if (unit.status !== 'published') continue;
    const lessons = context.lessons.filter(l => l.unit_id === unit.id);
    if (lessons.length === 0) {
      results.push({
        id: `onboarding-no-lessons-${unit.id}`,
        category: 'onboarding_flow',
        severity: 'warning',
        entity_type: 'units',
        entity_id: unit.id,
        entity_name: unit.name || '',
        message: `الوحدة "${unit.name}" منشورة لكن بدون دروس`,
        suggestion: 'أضف درساً واحداً على الأقل',
        blocking: false,
      });
    }
  }

  // Check skills with no questions
  for (const skill of context.skills) {
    if (skill.status !== 'published') continue;
    const questions = context.questions.filter(q => q.skill_id === skill.id);
    if (questions.length === 0) {
      results.push({
        id: `onboarding-no-questions-${skill.id}`,
        category: 'onboarding_flow',
        severity: 'warning',
        entity_type: 'skills',
        entity_id: skill.id,
        entity_name: skill.name || '',
        message: `المهارة "${skill.name}" منشورة لكن بدون أسئلة`,
        suggestion: 'أضف أسئلة لهذه المهارة',
        blocking: false,
      });
    }
  }

  return results;
}

/**
 * 6. Invalid Routing Chains
 */
function validateRoutingChains(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check display_order gaps in published content
  for (const subject of context.subjects) {
    if (subject.status !== 'published') continue;
    const units = context.units
      .filter(u => u.subject_id === subject.id && u.status === 'published')
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    // Check for display_order conflicts
    const orders = units.map(u => u.display_order || 0);
    const uniqueOrders = new Set(orders);
    if (orders.length > 0 && uniqueOrders.size < orders.length) {
      results.push({
        id: `routing-order-conflict-${subject.id}`,
        category: 'routing_chain',
        severity: 'warning',
        entity_type: 'subjects',
        entity_id: subject.id,
        entity_name: subject.name || '',
        message: `المادة "${subject.name}" تحتوي وحدات بنفس ترتيب العرض`,
        suggestion: 'أعد ترتيب الوحدات لتجنب التعارض',
        blocking: false,
      });
    }
  }

  // Check for lessons with same display_order in same unit
  for (const unit of context.units) {
    if (unit.status !== 'published') continue;
    const lessons = context.lessons
      .filter(l => l.unit_id === unit.id && l.status === 'published');

    const orders = lessons.map(l => l.display_order || 0);
    const uniqueOrders = new Set(orders);
    if (orders.length > 1 && uniqueOrders.size < orders.length) {
      results.push({
        id: `routing-lesson-order-${unit.id}`,
        category: 'routing_chain',
        severity: 'warning',
        entity_type: 'units',
        entity_id: unit.id,
        entity_name: unit.name || '',
        message: `الوحدة "${unit.name}" تحتوي دروساً بنفس ترتيب العرض`,
        suggestion: 'أعد ترتيب الدروس لضمان تسلسل صحيح',
        blocking: false,
      });
    }
  }

  return results;
}

/**
 * Get validation summary stats
 */
export function getValidationSummary(results: ValidationResult[]) {
  const errors = results.filter(r => r.severity === 'error').length;
  const warnings = results.filter(r => r.severity === 'warning').length;
  const info = results.filter(r => r.severity === 'info').length;
  const blocking = results.filter(r => r.blocking).length;
  const canPublish = blocking === 0;

  return { errors, warnings, info, blocking, canPublish, total: results.length };
}

/**
 * Get category label in Arabic
 */
export function getCategoryLabel(category: ValidationCategory): string {
  const labels: Record<ValidationCategory, string> = {
    duplicate: 'تكرار',
    grade_mismatch: 'عدم تطابق الصف',
    age_interaction: 'تفاعل غير مناسب للعمر',
    curriculum_mismatch: 'عدم تطابق المنهج',
    onboarding_flow: 'تدفق بدء غير مكتمل',
    routing_chain: 'مشكلة في التسلسل',
  };
  return labels[category] || category;
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: ValidationSeverity): string {
  switch (severity) {
    case 'error': return 'text-red-600 bg-red-50 border-red-200';
    case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
  }
}