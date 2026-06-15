// ═══════════════════════════════════════════════════════════════════════════
// Subject Cognitive Templates - Phase 3A
// Deterministic interaction template engine for all Oman MVP subjects
// Maps subjects × grade ranges → appropriate interaction types & patterns
// NO adaptive AI, NO experimental systems - just stable, reusable templates
// ═══════════════════════════════════════════════════════════════════════════

import type { InteractionConfig } from '@/components/InteractionToolkit';

// ─── Types ───────────────────────────────────────────────────────────────

export interface CognitivePattern {
  /** Interaction type key (matches InteractionToolkit dispatcher) */
  interactionType: string;
  /** Arabic label for this pattern */
  label: string;
  /** Weight for selection (higher = more frequent) */
  weight: number;
  /** Cognitive skill targeted */
  cognitiveSkill: string;
}

export interface SubjectTemplate {
  /** Subject name in Arabic */
  subjectName: string;
  /** Subject name in English */
  subjectNameEn: string;
  /** Grade range this template applies to */
  gradeFrom: number;
  gradeTo: number;
  /** Ordered list of cognitive patterns for this subject+grade */
  patterns: CognitivePattern[];
  /** Suggested session structure (ordered interaction flow) */
  sessionFlow: string[];
  /** Description of educational approach */
  approach: string;
}

export type SubjectKey =
  | 'mathematics'
  | 'basic_mathematics'
  | 'advanced_mathematics'
  | 'arabic_language'
  | 'english_language'
  | 'science'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'islamic_education'
  | 'social_studies'
  | 'this_is_my_homeland'
  | 'history'
  | 'environmental_science'
  | 'geography_modern_tech';

// ─── Interaction Type Registry ───────────────────────────────────────────
// All supported interaction types in the system

export const INTERACTION_TYPES = {
  // Existing types (already in InteractionToolkit)
  drag_drop: 'سحب وإفلات',
  tap: 'اضغط للاختيار',
  matching: 'توصيل',
  number_line: 'خط الأعداد',
  counting_blocks: 'عدّ المكعبات',
  missing_number: 'العدد الناقص',
  sequence_ordering: 'ترتيب تسلسلي',
  shape_grouping: 'تصنيف أشكال',
  analog_clock: 'الساعة التناظرية',
  coin_money: 'النقود والعملات',
} as const;

// ─── Subject Templates ───────────────────────────────────────────────────

const MATHEMATICS_EARLY: SubjectTemplate = {
  subjectName: 'الرياضيات',
  subjectNameEn: 'Mathematics',
  gradeFrom: 1,
  gradeTo: 4,
  patterns: [
    { interactionType: 'counting_blocks', label: 'عدّ المكعبات', weight: 5, cognitiveSkill: 'counting' },
    { interactionType: 'tap', label: 'اختيار الإجابة', weight: 4, cognitiveSkill: 'recognition' },
    { interactionType: 'number_line', label: 'خط الأعداد', weight: 4, cognitiveSkill: 'number_sense' },
    { interactionType: 'missing_number', label: 'العدد الناقص', weight: 4, cognitiveSkill: 'pattern_recognition' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الأعداد', weight: 3, cognitiveSkill: 'sequencing' },
    { interactionType: 'shape_grouping', label: 'تصنيف الأشكال', weight: 3, cognitiveSkill: 'classification' },
    { interactionType: 'drag_drop', label: 'سحب وإفلات', weight: 3, cognitiveSkill: 'spatial_reasoning' },
    { interactionType: 'coin_money', label: 'النقود', weight: 2, cognitiveSkill: 'practical_math' },
    { interactionType: 'analog_clock', label: 'قراءة الساعة', weight: 2, cognitiveSkill: 'time_concepts' },
  ],
  sessionFlow: ['counting_blocks', 'tap', 'number_line', 'missing_number', 'drag_drop'],
  approach: 'تعلم حسي بصري مع أنشطة عد وتصنيف وترتيب تدريجية',
};

const MATHEMATICS_MIDDLE: SubjectTemplate = {
  subjectName: 'الرياضيات',
  subjectNameEn: 'Mathematics',
  gradeFrom: 5,
  gradeTo: 8,
  patterns: [
    { interactionType: 'tap', label: 'حل المعادلات', weight: 5, cognitiveSkill: 'equation_solving' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الخطوات', weight: 5, cognitiveSkill: 'step_by_step' },
    { interactionType: 'drag_drop', label: 'بناء المعادلات', weight: 4, cognitiveSkill: 'construction' },
    { interactionType: 'number_line', label: 'الأعداد على المستقيم', weight: 4, cognitiveSkill: 'number_sense' },
    { interactionType: 'missing_number', label: 'إيجاد المجهول', weight: 4, cognitiveSkill: 'algebraic_thinking' },
    { interactionType: 'matching', label: 'ربط المفاهيم', weight: 3, cognitiveSkill: 'concept_linking' },
    { interactionType: 'shape_grouping', label: 'الأشكال الهندسية', weight: 3, cognitiveSkill: 'geometry' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'drag_drop', 'missing_number', 'matching'],
  approach: 'حل مسائل خطوة بخطوة مع بناء معادلات وتفكير جبري',
};

const MATHEMATICS_UPPER: SubjectTemplate = {
  subjectName: 'الرياضيات',
  subjectNameEn: 'Mathematics',
  gradeFrom: 9,
  gradeTo: 10,
  patterns: [
    { interactionType: 'sequence_ordering', label: 'خطوات الحل', weight: 5, cognitiveSkill: 'procedural' },
    { interactionType: 'tap', label: 'اختيار الطريقة', weight: 5, cognitiveSkill: 'strategy_selection' },
    { interactionType: 'drag_drop', label: 'ترتيب البرهان', weight: 4, cognitiveSkill: 'logical_reasoning' },
    { interactionType: 'matching', label: 'ربط القوانين', weight: 4, cognitiveSkill: 'formula_application' },
    { interactionType: 'missing_number', label: 'إيجاد القيمة', weight: 3, cognitiveSkill: 'computation' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'drag_drop', 'matching', 'missing_number'],
  approach: 'تفكير منطقي وبرهان رياضي مع تطبيق القوانين',
};

const BASIC_MATHEMATICS: SubjectTemplate = {
  subjectName: 'الرياضيات الأساسية',
  subjectNameEn: 'Basic Mathematics',
  gradeFrom: 11,
  gradeTo: 12,
  patterns: [
    { interactionType: 'sequence_ordering', label: 'خطوات الحل', weight: 5, cognitiveSkill: 'procedural' },
    { interactionType: 'tap', label: 'اختيار الإجابة', weight: 5, cognitiveSkill: 'concept_application' },
    { interactionType: 'matching', label: 'ربط المفاهيم', weight: 4, cognitiveSkill: 'concept_linking' },
    { interactionType: 'drag_drop', label: 'بناء الحل', weight: 4, cognitiveSkill: 'construction' },
    { interactionType: 'missing_number', label: 'إيجاد المجهول', weight: 3, cognitiveSkill: 'algebraic_thinking' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop', 'missing_number'],
  approach: 'تطبيق المفاهيم الرياضية الأساسية في سياقات عملية',
};

const ADVANCED_MATHEMATICS: SubjectTemplate = {
  subjectName: 'الرياضيات المتقدمة',
  subjectNameEn: 'Advanced Mathematics',
  gradeFrom: 11,
  gradeTo: 12,
  patterns: [
    { interactionType: 'sequence_ordering', label: 'خطوات البرهان', weight: 5, cognitiveSkill: 'proof_construction' },
    { interactionType: 'drag_drop', label: 'بناء المعادلات', weight: 5, cognitiveSkill: 'equation_building' },
    { interactionType: 'tap', label: 'اختيار الاستراتيجية', weight: 4, cognitiveSkill: 'strategy_selection' },
    { interactionType: 'matching', label: 'ربط النظريات', weight: 4, cognitiveSkill: 'theorem_application' },
    { interactionType: 'missing_number', label: 'حساب القيم', weight: 3, cognitiveSkill: 'advanced_computation' },
  ],
  sessionFlow: ['sequence_ordering', 'drag_drop', 'tap', 'matching', 'missing_number'],
  approach: 'تفكير تجريدي وبرهان رياضي متقدم مع تطبيقات التفاضل والتكامل',
};

const ARABIC_LANGUAGE_EARLY: SubjectTemplate = {
  subjectName: 'اللغة العربية',
  subjectNameEn: 'Arabic Language',
  gradeFrom: 1,
  gradeTo: 4,
  patterns: [
    { interactionType: 'tap', label: 'اختيار الحرف/الكلمة', weight: 5, cognitiveSkill: 'letter_recognition' },
    { interactionType: 'matching', label: 'توصيل الكلمات', weight: 5, cognitiveSkill: 'word_association' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الجمل', weight: 4, cognitiveSkill: 'sentence_building' },
    { interactionType: 'drag_drop', label: 'بناء الكلمات', weight: 4, cognitiveSkill: 'word_construction' },
    { interactionType: 'shape_grouping', label: 'تصنيف الحروف', weight: 3, cognitiveSkill: 'classification' },
  ],
  sessionFlow: ['tap', 'matching', 'drag_drop', 'sequence_ordering', 'shape_grouping'],
  approach: 'تعلم الحروف والكلمات من خلال التوصيل والبناء والتصنيف',
};

const ARABIC_LANGUAGE_MIDDLE: SubjectTemplate = {
  subjectName: 'اللغة العربية',
  subjectNameEn: 'Arabic Language',
  gradeFrom: 5,
  gradeTo: 8,
  patterns: [
    { interactionType: 'tap', label: 'فهم القراءة', weight: 5, cognitiveSkill: 'reading_comprehension' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الفقرات', weight: 5, cognitiveSkill: 'text_organization' },
    { interactionType: 'matching', label: 'القواعد النحوية', weight: 4, cognitiveSkill: 'grammar' },
    { interactionType: 'drag_drop', label: 'إعراب الجمل', weight: 4, cognitiveSkill: 'syntax_analysis' },
    { interactionType: 'shape_grouping', label: 'تصنيف الكلمات', weight: 3, cognitiveSkill: 'word_classification' },
  ],
  sessionFlow: ['tap', 'matching', 'sequence_ordering', 'drag_drop', 'shape_grouping'],
  approach: 'فهم النصوص وتحليل القواعد النحوية وبناء الجمل',
};

const ARABIC_LANGUAGE_UPPER: SubjectTemplate = {
  subjectName: 'اللغة العربية',
  subjectNameEn: 'Arabic Language',
  gradeFrom: 9,
  gradeTo: 12,
  patterns: [
    { interactionType: 'tap', label: 'تحليل النصوص', weight: 5, cognitiveSkill: 'text_analysis' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الأفكار', weight: 5, cognitiveSkill: 'idea_organization' },
    { interactionType: 'matching', label: 'ربط المفاهيم البلاغية', weight: 4, cognitiveSkill: 'rhetoric' },
    { interactionType: 'drag_drop', label: 'بناء التعبير', weight: 4, cognitiveSkill: 'expression_building' },
    { interactionType: 'shape_grouping', label: 'تصنيف الأساليب', weight: 3, cognitiveSkill: 'style_classification' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop', 'shape_grouping'],
  approach: 'تحليل أدبي ونقدي مع بلاغة وتعبير متقدم',
};

const ENGLISH_LANGUAGE_EARLY: SubjectTemplate = {
  subjectName: 'اللغة الإنجليزية',
  subjectNameEn: 'English Language',
  gradeFrom: 1,
  gradeTo: 4,
  patterns: [
    { interactionType: 'tap', label: 'Vocabulary Choice', weight: 5, cognitiveSkill: 'vocabulary' },
    { interactionType: 'matching', label: 'Word Matching', weight: 5, cognitiveSkill: 'word_association' },
    { interactionType: 'drag_drop', label: 'Sentence Building', weight: 4, cognitiveSkill: 'sentence_structure' },
    { interactionType: 'sequence_ordering', label: 'Letter/Word Order', weight: 4, cognitiveSkill: 'phonics' },
    { interactionType: 'shape_grouping', label: 'Word Groups', weight: 3, cognitiveSkill: 'categorization' },
  ],
  sessionFlow: ['tap', 'matching', 'drag_drop', 'sequence_ordering', 'shape_grouping'],
  approach: 'تعلم المفردات والأصوات من خلال التوصيل والبناء',
};

const ENGLISH_LANGUAGE_MIDDLE: SubjectTemplate = {
  subjectName: 'اللغة الإنجليزية',
  subjectNameEn: 'English Language',
  gradeFrom: 5,
  gradeTo: 8,
  patterns: [
    { interactionType: 'tap', label: 'Reading Comprehension', weight: 5, cognitiveSkill: 'comprehension' },
    { interactionType: 'sequence_ordering', label: 'Sentence Structure', weight: 5, cognitiveSkill: 'grammar' },
    { interactionType: 'matching', label: 'Vocabulary Pairs', weight: 4, cognitiveSkill: 'vocabulary_depth' },
    { interactionType: 'drag_drop', label: 'Paragraph Building', weight: 4, cognitiveSkill: 'writing' },
    { interactionType: 'missing_number', label: 'Fill in Blanks', weight: 3, cognitiveSkill: 'cloze' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop', 'missing_number'],
  approach: 'فهم القراءة وبناء الجمل والتعبير الكتابي',
};

const ENGLISH_LANGUAGE_UPPER: SubjectTemplate = {
  subjectName: 'اللغة الإنجليزية',
  subjectNameEn: 'English Language',
  gradeFrom: 9,
  gradeTo: 12,
  patterns: [
    { interactionType: 'tap', label: 'Text Analysis', weight: 5, cognitiveSkill: 'critical_reading' },
    { interactionType: 'sequence_ordering', label: 'Essay Structure', weight: 5, cognitiveSkill: 'essay_organization' },
    { interactionType: 'matching', label: 'Concept Linking', weight: 4, cognitiveSkill: 'inference' },
    { interactionType: 'drag_drop', label: 'Argument Building', weight: 4, cognitiveSkill: 'argumentation' },
    { interactionType: 'missing_number', label: 'Context Clues', weight: 3, cognitiveSkill: 'contextual_understanding' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop', 'missing_number'],
  approach: 'تحليل نصوص متقدم وكتابة مقالات وتفكير نقدي',
};

const SCIENCE: SubjectTemplate = {
  subjectName: 'العلوم',
  subjectNameEn: 'Science',
  gradeFrom: 1,
  gradeTo: 8,
  patterns: [
    { interactionType: 'shape_grouping', label: 'تصنيف علمي', weight: 5, cognitiveSkill: 'classification' },
    { interactionType: 'sequence_ordering', label: 'ترتيب العمليات', weight: 5, cognitiveSkill: 'process_understanding' },
    { interactionType: 'matching', label: 'ربط المفاهيم', weight: 4, cognitiveSkill: 'concept_association' },
    { interactionType: 'tap', label: 'تحديد الأجزاء', weight: 4, cognitiveSkill: 'labeling' },
    { interactionType: 'drag_drop', label: 'ترتيب الدورات', weight: 4, cognitiveSkill: 'cycle_understanding' },
  ],
  sessionFlow: ['tap', 'shape_grouping', 'sequence_ordering', 'matching', 'drag_drop'],
  approach: 'استكشاف علمي من خلال التصنيف والترتيب وفهم العمليات الطبيعية',
};

const PHYSICS: SubjectTemplate = {
  subjectName: 'الفيزياء',
  subjectNameEn: 'Physics',
  gradeFrom: 9,
  gradeTo: 12,
  patterns: [
    { interactionType: 'sequence_ordering', label: 'خطوات حل المسألة', weight: 5, cognitiveSkill: 'problem_solving' },
    { interactionType: 'tap', label: 'تطبيق القوانين', weight: 5, cognitiveSkill: 'formula_application' },
    { interactionType: 'matching', label: 'ربط الكميات والوحدات', weight: 4, cognitiveSkill: 'unit_analysis' },
    { interactionType: 'drag_drop', label: 'بناء الدوائر/الرسوم', weight: 4, cognitiveSkill: 'diagram_construction' },
    { interactionType: 'missing_number', label: 'حساب القيم', weight: 4, cognitiveSkill: 'computation' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop', 'missing_number'],
  approach: 'تطبيق القوانين الفيزيائية وحل المسائل خطوة بخطوة مع فهم المخططات',
};

const CHEMISTRY: SubjectTemplate = {
  subjectName: 'الكيمياء',
  subjectNameEn: 'Chemistry',
  gradeFrom: 9,
  gradeTo: 12,
  patterns: [
    { interactionType: 'matching', label: 'ربط العناصر والخصائص', weight: 5, cognitiveSkill: 'element_properties' },
    { interactionType: 'sequence_ordering', label: 'ترتيب التفاعلات', weight: 5, cognitiveSkill: 'reaction_sequencing' },
    { interactionType: 'tap', label: 'تحديد المركبات', weight: 4, cognitiveSkill: 'compound_identification' },
    { interactionType: 'drag_drop', label: 'موازنة المعادلات', weight: 4, cognitiveSkill: 'equation_balancing' },
    { interactionType: 'shape_grouping', label: 'تصنيف المواد', weight: 3, cognitiveSkill: 'material_classification' },
  ],
  sessionFlow: ['tap', 'matching', 'sequence_ordering', 'drag_drop', 'shape_grouping'],
  approach: 'فهم التفاعلات الكيميائية وتصنيف المواد وموازنة المعادلات',
};

const BIOLOGY: SubjectTemplate = {
  subjectName: 'الأحياء',
  subjectNameEn: 'Biology',
  gradeFrom: 9,
  gradeTo: 12,
  patterns: [
    { interactionType: 'tap', label: 'تحديد الأجزاء', weight: 5, cognitiveSkill: 'labeling' },
    { interactionType: 'sequence_ordering', label: 'ترتيب العمليات الحيوية', weight: 5, cognitiveSkill: 'process_sequencing' },
    { interactionType: 'shape_grouping', label: 'تصنيف الكائنات', weight: 4, cognitiveSkill: 'taxonomy' },
    { interactionType: 'matching', label: 'ربط الوظائف والأعضاء', weight: 4, cognitiveSkill: 'structure_function' },
    { interactionType: 'drag_drop', label: 'بناء المخططات', weight: 3, cognitiveSkill: 'diagram_completion' },
  ],
  sessionFlow: ['tap', 'shape_grouping', 'sequence_ordering', 'matching', 'drag_drop'],
  approach: 'تصنيف الكائنات وفهم العمليات الحيوية وربط البنية بالوظيفة',
};

const ISLAMIC_EDUCATION_EARLY: SubjectTemplate = {
  subjectName: 'التربية الإسلامية',
  subjectNameEn: 'Islamic Education',
  gradeFrom: 1,
  gradeTo: 4,
  patterns: [
    { interactionType: 'tap', label: 'اختيار الإجابة', weight: 5, cognitiveSkill: 'recall' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الآيات', weight: 5, cognitiveSkill: 'memorization_support' },
    { interactionType: 'matching', label: 'توصيل المعاني', weight: 4, cognitiveSkill: 'comprehension' },
    { interactionType: 'drag_drop', label: 'ترتيب أركان الإسلام', weight: 3, cognitiveSkill: 'ordering' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop'],
  approach: 'حفظ وفهم من خلال الترتيب والتوصيل مع دعم الحفظ',
};

const ISLAMIC_EDUCATION_MIDDLE: SubjectTemplate = {
  subjectName: 'التربية الإسلامية',
  subjectNameEn: 'Islamic Education',
  gradeFrom: 5,
  gradeTo: 8,
  patterns: [
    { interactionType: 'tap', label: 'فهم الأحكام', weight: 5, cognitiveSkill: 'comprehension' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الأحداث', weight: 5, cognitiveSkill: 'chronology' },
    { interactionType: 'matching', label: 'ربط الأدلة بالأحكام', weight: 4, cognitiveSkill: 'evidence_linking' },
    { interactionType: 'drag_drop', label: 'تصنيف الأحكام', weight: 3, cognitiveSkill: 'classification' },
    { interactionType: 'shape_grouping', label: 'تصنيف العبادات', weight: 3, cognitiveSkill: 'categorization' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop', 'shape_grouping'],
  approach: 'فهم الأحكام الشرعية وربط الأدلة مع ترتيب الأحداث التاريخية',
};

const ISLAMIC_EDUCATION_UPPER: SubjectTemplate = {
  subjectName: 'التربية الإسلامية',
  subjectNameEn: 'Islamic Education',
  gradeFrom: 9,
  gradeTo: 12,
  patterns: [
    { interactionType: 'tap', label: 'تحليل النصوص الشرعية', weight: 5, cognitiveSkill: 'text_analysis' },
    { interactionType: 'sequence_ordering', label: 'ترتيب الاستدلال', weight: 5, cognitiveSkill: 'logical_reasoning' },
    { interactionType: 'matching', label: 'ربط القواعد الفقهية', weight: 4, cognitiveSkill: 'principle_application' },
    { interactionType: 'drag_drop', label: 'بناء الحجة', weight: 4, cognitiveSkill: 'argumentation' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'drag_drop'],
  approach: 'تحليل نصوص شرعية واستدلال فقهي مع فهم معمق للمقاصد',
};

const SOCIAL_STUDIES: SubjectTemplate = {
  subjectName: 'الدراسات الاجتماعية',
  subjectNameEn: 'Social Studies',
  gradeFrom: 5,
  gradeTo: 10,
  patterns: [
    { interactionType: 'sequence_ordering', label: 'ترتيب زمني', weight: 5, cognitiveSkill: 'chronology' },
    { interactionType: 'tap', label: 'تحديد المواقع/الأحداث', weight: 5, cognitiveSkill: 'identification' },
    { interactionType: 'matching', label: 'ربط الأحداث بالأسباب', weight: 4, cognitiveSkill: 'cause_effect' },
    { interactionType: 'shape_grouping', label: 'تصنيف الحضارات', weight: 4, cognitiveSkill: 'categorization' },
    { interactionType: 'drag_drop', label: 'ترتيب على الخريطة', weight: 3, cognitiveSkill: 'spatial_awareness' },
  ],
  sessionFlow: ['tap', 'sequence_ordering', 'matching', 'shape_grouping', 'drag_drop'],
  approach: 'فهم التسلسل الزمني وربط الأحداث بأسبابها مع التصنيف الجغرافي',
};

const THIS_IS_MY_HOMELAND: SubjectTemplate = {
  subjectName: 'هذا وطني',
  subjectNameEn: 'This Is My Homeland',
  gradeFrom: 11,
  gradeTo: 12,
  patterns: [
    { interactionType: 'tap', label: 'المفاهيم الوطنية', weight: 5, cognitiveSkill: 'concept_understanding' },
    { interactionType: 'matching', label: 'ربط المؤسسات بوظائفها', weight: 5, cognitiveSkill: 'institutional_knowledge' },
    { interactionType: 'sequence_ordering', label: 'التطور التاريخي', weight: 4, cognitiveSkill: 'historical_progression' },
    { interactionType: 'shape_grouping', label: 'تصنيف الإنجازات', weight: 3, cognitiveSkill: 'categorization' },
    { interactionType: 'drag_drop', label: 'استكشاف موجه', weight: 3, cognitiveSkill: 'guided_exploration' },
  ],
  sessionFlow: ['tap', 'matching', 'sequence_ordering', 'shape_grouping', 'drag_drop'],
  approach: 'فهم المؤسسات الوطنية والتطور التاريخي لسلطنة عمان',
};

const HISTORY: SubjectTemplate = {
  subjectName: 'التاريخ',
  subjectNameEn: 'History',
  gradeFrom: 11,
  gradeTo: 12,
  patterns: [
    { interactionType: 'sequence_ordering', label: 'التسلسل الزمني', weight: 5, cognitiveSkill: 'chronology' },
    { interactionType: 'tap', label: 'تحديد الأحداث', weight: 5, cognitiveSkill: 'event_identification' },
    { interactionType: 'matching', label: 'ربط الأسباب بالنتائج', weight: 4, cognitiveSkill: 'cause_effect' },
    { interactionType: 'shape_grouping', label: 'تصنيف العصور', weight: 4, cognitiveSkill: 'era_classification' },
    { interactionType: 'drag_drop', label: 'ترتيب الأحداث', weight: 3, cognitiveSkill: 'event_ordering' },
  ],
  sessionFlow: ['sequence_ordering', 'tap', 'matching', 'shape_grouping', 'drag_drop'],
  approach: 'تحليل تاريخي مع تسلسل زمني وربط الأسباب بالنتائج',
};

const ENVIRONMENTAL_SCIENCE: SubjectTemplate = {
  subjectName: 'العلوم البيئية',
  subjectNameEn: 'Environmental Science',
  gradeFrom: 11,
  gradeTo: 12,
  patterns: [
    { interactionType: 'matching', label: 'ربط العلاقات البيئية', weight: 5, cognitiveSkill: 'systems_thinking' },
    { interactionType: 'shape_grouping', label: 'تصنيف الأنظمة', weight: 5, cognitiveSkill: 'classification' },
    { interactionType: 'sequence_ordering', label: 'ترتيب السلاسل الغذائية', weight: 4, cognitiveSkill: 'process_understanding' },
    { interactionType: 'tap', label: 'تحديد المشكلات البيئية', weight: 4, cognitiveSkill: 'identification' },
    { interactionType: 'drag_drop', label: 'بناء النظام البيئي', weight: 3, cognitiveSkill: 'construction' },
  ],
  sessionFlow: ['matching', 'shape_grouping', 'sequence_ordering', 'tap', 'drag_drop'],
  approach: 'تفكير نظمي وفهم العلاقات البيئية والتصنيف',
};

const GEOGRAPHY_MODERN_TECH: SubjectTemplate = {
  subjectName: 'الجغرافيا والتقنيات الحديثة',
  subjectNameEn: 'Geography and Modern Technologies',
  gradeFrom: 12,
  gradeTo: 12,
  patterns: [
    { interactionType: 'tap', label: 'تحديد المواقع', weight: 5, cognitiveSkill: 'spatial_awareness' },
    { interactionType: 'matching', label: 'ربط التقنيات بالتطبيقات', weight: 5, cognitiveSkill: 'technology_application' },
    { interactionType: 'sequence_ordering', label: 'خطوات التحليل', weight: 4, cognitiveSkill: 'analytical_process' },
    { interactionType: 'drag_drop', label: 'بناء الخرائط', weight: 4, cognitiveSkill: 'map_construction' },
    { interactionType: 'shape_grouping', label: 'تصنيف البيانات', weight: 3, cognitiveSkill: 'data_classification' },
  ],
  sessionFlow: ['tap', 'matching', 'sequence_ordering', 'drag_drop', 'shape_grouping'],
  approach: 'تحليل جغرافي مع تطبيق نظم المعلومات الجغرافية',
};

// ─── Template Registry ───────────────────────────────────────────────────

/** All templates indexed by subject key and grade tier */
const ALL_TEMPLATES: SubjectTemplate[] = [
  MATHEMATICS_EARLY,
  MATHEMATICS_MIDDLE,
  MATHEMATICS_UPPER,
  BASIC_MATHEMATICS,
  ADVANCED_MATHEMATICS,
  ARABIC_LANGUAGE_EARLY,
  ARABIC_LANGUAGE_MIDDLE,
  ARABIC_LANGUAGE_UPPER,
  ENGLISH_LANGUAGE_EARLY,
  ENGLISH_LANGUAGE_MIDDLE,
  ENGLISH_LANGUAGE_UPPER,
  SCIENCE,
  PHYSICS,
  CHEMISTRY,
  BIOLOGY,
  ISLAMIC_EDUCATION_EARLY,
  ISLAMIC_EDUCATION_MIDDLE,
  ISLAMIC_EDUCATION_UPPER,
  SOCIAL_STUDIES,
  THIS_IS_MY_HOMELAND,
  HISTORY,
  ENVIRONMENTAL_SCIENCE,
  GEOGRAPHY_MODERN_TECH,
];

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Get the cognitive template for a subject at a specific grade level.
 * Returns the most appropriate template based on subject name and grade.
 */
export function getSubjectTemplate(subjectName: string, grade: number): SubjectTemplate | null {
  if (!subjectName || grade < 1 || grade > 12) return null;

  // Normalize subject name for matching
  const normalized = subjectName.trim();

  // Find matching template by subject name and grade range
  const match = ALL_TEMPLATES.find(
    (t) => t.subjectName === normalized && grade >= t.gradeFrom && grade <= t.gradeTo
  );

  return match || null;
}

/**
 * Get the cognitive template by English subject key and grade.
 */
export function getTemplateByKey(subjectKey: string, grade: number): SubjectTemplate | null {
  if (!subjectKey || grade < 1 || grade > 12) return null;

  const normalized = subjectKey.trim().toLowerCase();

  const match = ALL_TEMPLATES.find(
    (t) => t.subjectNameEn.toLowerCase().replace(/\s+/g, '_') === normalized && grade >= t.gradeFrom && grade <= t.gradeTo
  );

  return match || null;
}

/**
 * Get all templates for a specific grade (all subjects available at that grade).
 */
export function getTemplatesForGrade(grade: number): SubjectTemplate[] {
  if (grade < 1 || grade > 12) return [];
  return ALL_TEMPLATES.filter((t) => grade >= t.gradeFrom && grade <= t.gradeTo);
}

/**
 * Get recommended interaction types for a subject+grade combination.
 * Returns types sorted by weight (most important first).
 */
export function getRecommendedInteractionTypes(subjectName: string, grade: number): string[] {
  const template = getSubjectTemplate(subjectName, grade);
  if (!template) return ['tap', 'matching', 'sequence_ordering']; // safe defaults

  return template.patterns
    .sort((a, b) => b.weight - a.weight)
    .map((p) => p.interactionType);
}

/**
 * Get the session flow (ordered interaction sequence) for a subject+grade.
 */
export function getSessionFlow(subjectName: string, grade: number): string[] {
  const template = getSubjectTemplate(subjectName, grade);
  if (!template) return ['tap', 'matching', 'sequence_ordering'];
  return template.sessionFlow;
}

/**
 * Select interactions from a pool based on subject cognitive template.
 * Filters and prioritizes interactions matching the subject's patterns.
 */
export function selectByTemplate(
  interactions: InteractionConfig[],
  subjectName: string,
  grade: number,
  count: number = 5
): InteractionConfig[] {
  if (!interactions || interactions.length === 0) return [];

  const template = getSubjectTemplate(subjectName, grade);
  if (!template) {
    // No template found - return random selection
    return [...interactions].sort(() => Math.random() - 0.5).slice(0, count);
  }

  // Build weight map from template patterns
  const weightMap = new Map<string, number>();
  template.patterns.forEach((p) => weightMap.set(p.interactionType, p.weight));

  // Score each interaction based on template weights
  const scored = interactions.map((interaction) => ({
    interaction,
    score: weightMap.get(interaction.interaction_type) || 0,
  }));

  // Sort by score (highest first), then shuffle within same score
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5;
  });

  // Select ensuring type diversity (follow session flow order)
  const selected: InteractionConfig[] = [];
  const usedTypes = new Set<string>();

  // First pass: follow session flow for variety
  for (const flowType of template.sessionFlow) {
    if (selected.length >= count) break;
    const candidate = scored.find(
      (s) => s.interaction.interaction_type === flowType && !usedTypes.has(s.interaction.id.toString())
    );
    if (candidate) {
      selected.push(candidate.interaction);
      usedTypes.add(candidate.interaction.id.toString());
    }
  }

  // Second pass: fill remaining from highest scored
  for (const item of scored) {
    if (selected.length >= count) break;
    if (!usedTypes.has(item.interaction.id.toString())) {
      selected.push(item.interaction);
      usedTypes.add(item.interaction.id.toString());
    }
  }

  return selected.slice(0, count);
}

/**
 * Get cognitive skills targeted by a subject at a specific grade.
 */
export function getCognitiveSkills(subjectName: string, grade: number): string[] {
  const template = getSubjectTemplate(subjectName, grade);
  if (!template) return [];
  return template.patterns.map((p) => p.cognitiveSkill);
}

/**
 * Get all available subject templates (for admin display).
 */
export function getAllTemplates(): SubjectTemplate[] {
  return [...ALL_TEMPLATES];
}

/**
 * Validate if a subject is available for a given grade per Oman rules.
 */
export function isSubjectAvailableForGrade(subjectName: string, grade: number): boolean {
  return getSubjectTemplate(subjectName, grade) !== null;
}

/**
 * Get template summary for admin dashboard display.
 */
export function getTemplateSummary(): Array<{
  subject: string;
  subjectEn: string;
  grades: string;
  patternCount: number;
  primarySkills: string[];
}> {
  return ALL_TEMPLATES.map((t) => ({
    subject: t.subjectName,
    subjectEn: t.subjectNameEn,
    grades: `${t.gradeFrom}-${t.gradeTo}`,
    patternCount: t.patterns.length,
    primarySkills: t.patterns.slice(0, 3).map((p) => p.cognitiveSkill),
  }));
}