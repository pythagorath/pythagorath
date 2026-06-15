// Content Intelligence Sprint - Massive Question Expansion
// Distribution per skill: easy(10), medium(10), hard(5), remedial(5), retention(5)
// Visual types: number-line, clock, counting-objects, patterns, money, missing-numbers, drag-drop
// Each question includes errorType hints for the Error Pattern Analyzer

import type { Question } from './mathSkillsData';

export type QuestionCategory = 'standard' | 'remedial' | 'retention';

export interface EnhancedQuestion extends Question {
  category: QuestionCategory;
  errorHint?: string; // Expected error type if answered wrong
  visualType?: string;
  visualData?: Record<string, unknown>;
}

// ============================================================
// GRADE 1 - SEMESTER 1: Numbers & Counting
// ============================================================

const g1CountingQuestions: EnhancedQuestion[] = [
  // G1-N-001: العد من 1 إلى 5 - EASY (remedial & retention)
  { id: 'CI-001', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: '(علاجي) أشر إلى مجموعة فيها 2: 🍎🍎 أو 🍎🍎🍎', options: ['المجموعة الأولى', 'المجموعة الثانية'], correctAnswer: 0, difficulty: 'easy', category: 'remedial', explanation: 'المجموعة الأولى فيها 2 فقط', errorHint: 'counting_error' },
  { id: 'CI-002', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: '(علاجي) كم يداً لديك؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'لديك يدان: يمنى ويسرى' },
  { id: 'CI-003', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: '(علاجي) كم عجلة للدراجة الهوائية؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'الدراجة الهوائية لها عجلتان' },
  { id: 'CI-004', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: '(تثبيت) عدّ الأصابع: ☝️☝️☝️', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', category: 'retention', explanation: 'ثلاثة أصابع', visualType: 'counting-objects', visualData: { objects: 'finger', count: 3 } },
  { id: 'CI-005', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: '(تثبيت) ما العدد بين 2 و 4؟', options: ['1', '3', '5', '2'], correctAnswer: 1, difficulty: 'easy', category: 'retention', explanation: '3 يقع بين 2 و 4', visualType: 'number-line', visualData: { min: 1, max: 5, highlight: [2, 4] } },
  { id: 'CI-006', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم زهرة؟ 🌸🌸🌸🌸', options: ['3', '4', '5', '2'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: 'عدّ الزهور: 4', visualType: 'counting-objects', visualData: { objects: 'flower', count: 4 } },
  { id: 'CI-007', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'أي مجموعة فيها 5؟', options: ['🔵🔵🔵', '🔵🔵🔵🔵', '🔵🔵🔵🔵🔵', '🔵🔵'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: 'المجموعة الثالثة فيها 5 دوائر', errorHint: 'counting_error' },
  { id: 'CI-008', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'رتّب تصاعدياً: 3، 1، 5، 2، 4', options: ['1، 2، 3، 4، 5', '5، 4، 3، 2، 1', '1، 3، 5، 2، 4', '2، 1، 3، 4، 5'], correctAnswer: 0, difficulty: 'hard', category: 'standard', explanation: 'الترتيب التصاعدي: من الأصغر للأكبر', errorHint: 'pattern_confusion' },
  { id: 'CI-009', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم عدد أرجل القطة؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'easy', category: 'standard', explanation: 'القطة لها 4 أرجل' },
  { id: 'CI-010', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'ما العدد الناقص: 1، ___، 3، 4، 5', options: ['0', '2', '4', '6'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: 'العدد 2 بين 1 و 3', visualType: 'missing-numbers', visualData: { sequence: [1, null, 3, 4, 5] } },

  // G1-N-002: العد من 1 إلى 10 - Mixed difficulties
  { id: 'CI-011', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: '(علاجي) عدّ معي: 1، 2، 3، 4، 5، ___', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'بعد 5 يأتي 6' },
  { id: 'CI-012', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: '(علاجي) كم أصابع في يديك الاثنتين؟', options: ['5', '8', '10', '12'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: '5 + 5 = 10 أصابع' },
  { id: 'CI-013', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: '(تثبيت) عدّ تنازلياً: 10، 9، ___، 7، 6', options: ['5', '8', '11', '10'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: 'العد التنازلي: 10، 9، 8، 7، 6', visualType: 'number-line', visualData: { min: 1, max: 10, direction: 'desc' } },
  { id: 'CI-014', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: '(تثبيت) ما العدد الذي يسبق 10 بعددين؟', options: ['7', '8', '9', '11'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '10 - 2 = 8' },
  { id: 'CI-015', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'كم نقطة على وجه النرد: ⚅', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', category: 'standard', explanation: 'وجه النرد ⚅ يحتوي 6 نقاط' },
  { id: 'CI-016', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'أكمل النمط: 2، 4، 6، ___', options: ['7', '8', '9', '10'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: 'العد بالاثنين: 2، 4، 6، 8', visualType: 'patterns', visualData: { type: 'skip-count', step: 2 }, errorHint: 'pattern_confusion' },
  { id: 'CI-017', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما العدد بين 6 و 8؟', options: ['5', '7', '9', '6'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: '7 يقع بين 6 و 8' },
  { id: 'CI-018', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'كم يوماً في الأسبوع؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: 'الأسبوع فيه 7 أيام' },
  { id: 'CI-019', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'رتّب تنازلياً: 3، 8، 1، 6، 10', options: ['10، 8، 6، 3، 1', '1، 3، 6، 8، 10', '10، 6، 8، 3، 1', '8، 10، 6، 3، 1'], correctAnswer: 0, difficulty: 'hard', category: 'standard', explanation: 'التنازلي: من الأكبر للأصغر' },
  { id: 'CI-020', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'كم عدد أشهر السنة؟', options: ['7', '10', '12', '15'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: 'السنة فيها 12 شهراً' },

  // G1-N-005: مطابقة العدد بالكمية
  { id: 'CI-021', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: '(علاجي) طابق: العدد 3 يعني...', options: ['🍎🍎', '🍎🍎🍎', '🍎🍎🍎🍎', '🍎'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'العدد 3 = ثلاثة أشياء', visualType: 'counting-objects' },
  { id: 'CI-022', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: '(علاجي) أي صورة تمثل العدد 1؟', options: ['🌟🌟', '🌟', '🌟🌟🌟', 'لا شيء'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'نجمة واحدة = العدد 1' },
  { id: 'CI-023', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: '(تثبيت) كم عنصراً يمثل العدد 7؟', options: ['🔶🔶🔶🔶🔶🔶', '🔶🔶🔶🔶🔶🔶🔶', '🔶🔶🔶🔶🔶🔶🔶🔶', '🔶🔶🔶🔶🔶'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '7 معينات', visualType: 'counting-objects', visualData: { objects: 'diamond', count: 7 }, errorHint: 'counting_error' },
  { id: 'CI-024', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'اختر المجموعة التي تمثل العدد 4', options: ['🐦🐦🐦', '🐦🐦🐦🐦', '🐦🐦🐦🐦🐦', '🐦🐦'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: '4 عصافير', visualType: 'counting-objects', visualData: { objects: 'bird', count: 4 } },
  { id: 'CI-025', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'العدد 9 يمثل كم شيئاً؟', options: ['8 أشياء', '9 أشياء', '10 أشياء', '7 أشياء'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: 'العدد 9 = تسعة أشياء' },

  // G1-N-006: المقارنة بين الكميات
  { id: 'CI-026', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: '(علاجي) أيهما أكثر: 🍌🍌🍌 أم 🍌🍌🍌🍌🍌؟', options: ['المجموعة الأولى', 'المجموعة الثانية', 'متساويتان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '5 أكثر من 3' },
  { id: 'CI-027', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: '(علاجي) أيهما أقل: 2 أم 4؟', options: ['2', '4', 'متساويان', 'لا فرق'], correctAnswer: 0, difficulty: 'easy', category: 'remedial', explanation: '2 أقل من 4' },
  { id: 'CI-028', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: '(تثبيت) قارن: 7 ___ 5', options: ['أكبر من', 'أصغر من', 'يساوي', 'لا أعرف'], correctAnswer: 0, difficulty: 'medium', category: 'retention', explanation: '7 > 5' },
  { id: 'CI-029', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'أي عدد أكبر: 8 أم 6؟', options: ['6', '8', 'متساويان', 'لا يمكن المقارنة'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: '8 أكبر من 6' },
  { id: 'CI-030', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'رتّب من الأصغر: 9، 3، 7، 1', options: ['1، 3، 7، 9', '9، 7، 3، 1', '3، 1، 7، 9', '1، 7، 3، 9'], correctAnswer: 0, difficulty: 'hard', category: 'standard', explanation: 'الترتيب التصاعدي: 1، 3، 7، 9' },

  // G1-N-010: تكوين العدد 5
  { id: 'CI-031', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: '(علاجي) 2 + ___ = 5', options: ['1', '2', '3', '4'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: '2 + 3 = 5', errorHint: 'counting_error' },
  { id: 'CI-032', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: '(علاجي) 4 + ___ = 5', options: ['0', '1', '2', '3'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '4 + 1 = 5' },
  { id: 'CI-033', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: '(تثبيت) ما أزواج العدد 5؟ اختر الخطأ:', options: ['1 و 4', '2 و 3', '0 و 5', '2 و 4'], correctAnswer: 3, difficulty: 'medium', category: 'retention', explanation: '2 + 4 = 6 وليس 5', errorHint: 'operation_confusion' },
  { id: 'CI-034', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: '5 = 1 + ___', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'easy', category: 'standard', explanation: '1 + 4 = 5' },
  { id: 'CI-035', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: 'لدى سارة 3 حبات فراولة، كم تحتاج ليصبح لديها 5؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '5 - 3 = 2' },

  // G1-N-011: تكوين العدد 10
  { id: 'CI-036', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: '(علاجي) 5 + ___ = 10', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: '5 + 5 = 10' },
  { id: 'CI-037', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: '(علاجي) 7 + ___ = 10', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '7 + 3 = 10' },
  { id: 'CI-038', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: '(تثبيت) أي زوج لا يكوّن 10؟', options: ['6 و 4', '8 و 2', '5 و 6', '3 و 7'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '5 + 6 = 11 وليس 10', errorHint: 'counting_error' },
  { id: 'CI-039', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: '10 = 9 + ___', options: ['0', '1', '2', '3'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: '9 + 1 = 10' },
  { id: 'CI-040', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: 'في الحافلة 6 ركاب، كم مقعداً فارغاً إذا كان العدد الكلي 10؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: '10 - 6 = 4 مقاعد فارغة' },
];

// ============================================================
// GRADE 1 - SEMESTER 2: Addition & Subtraction
// ============================================================

const g1AddSubQuestions: EnhancedQuestion[] = [
  // G1-N-012: الجمع ضمن 10
  { id: 'CI-041', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '(علاجي) 1 + 1 = ___', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '1 + 1 = 2' },
  { id: 'CI-042', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '(علاجي) 2 + 1 = ___', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '2 + 1 = 3' },
  { id: 'CI-043', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '(علاجي) 0 + 5 = ___', options: ['0', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'أي عدد + 0 = نفس العدد' },
  { id: 'CI-044', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '(تثبيت) 3 + 4 = ___', options: ['6', '7', '8', '5'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '3 + 4 = 7', visualType: 'number-line', visualData: { min: 0, max: 10, start: 3, jump: 4 } },
  { id: 'CI-045', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '(تثبيت) 6 + 3 = ___', options: ['8', '9', '10', '7'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '6 + 3 = 9' },
  { id: 'CI-046', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '4 + 5 = ___', options: ['8', '9', '10', '7'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '4 + 5 = 9', errorHint: 'counting_error' },
  { id: 'CI-047', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'لدى أحمد 3 كرات وأعطاه صديقه 5، كم أصبح لديه؟', options: ['7', '8', '9', '6'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '3 + 5 = 8' },
  { id: 'CI-048', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '2 + 2 + 2 = ___', options: ['4', '5', '6', '8'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '2 + 2 = 4، ثم 4 + 2 = 6' },
  { id: 'CI-049', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '___ + 4 = 10', options: ['5', '6', '7', '4'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: '6 + 4 = 10', errorHint: 'operation_confusion' },
  { id: 'CI-050', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '7 + ___ = 10', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '7 + 3 = 10' },

  // G1-N-013: الطرح ضمن 10
  { id: 'CI-051', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '(علاجي) 3 - 1 = ___', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '3 - 1 = 2' },
  { id: 'CI-052', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '(علاجي) 5 - 0 = ___', options: ['0', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'أي عدد - 0 = نفس العدد' },
  { id: 'CI-053', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '(علاجي) 4 - 4 = ___', options: ['0', '1', '4', '8'], correctAnswer: 0, difficulty: 'easy', category: 'remedial', explanation: 'أي عدد - نفسه = 0' },
  { id: 'CI-054', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '(تثبيت) 8 - 3 = ___', options: ['4', '5', '6', '3'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '8 - 3 = 5', visualType: 'number-line', visualData: { min: 0, max: 10, start: 8, jump: -3 } },
  { id: 'CI-055', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '(تثبيت) 10 - 4 = ___', options: ['5', '6', '7', '4'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '10 - 4 = 6' },
  { id: 'CI-056', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '9 - 5 = ___', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '9 - 5 = 4', errorHint: 'counting_error' },
  { id: 'CI-057', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'كان لدى فاطمة 7 حلويات، أكلت 3، كم بقي؟', options: ['3', '4', '5', '10'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '7 - 3 = 4' },
  { id: 'CI-058', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '10 - ___ = 7', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: '10 - 3 = 7', errorHint: 'operation_confusion' },
  { id: 'CI-059', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '___ - 2 = 6', options: ['4', '6', '8', '10'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '8 - 2 = 6' },
  { id: 'CI-060', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما الفرق بين 9 و 4؟', options: ['3', '4', '5', '13'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '9 - 4 = 5', errorHint: 'operation_confusion' },
];

// ============================================================
// GRADE 1 - Geometry & Patterns
// ============================================================

const g1GeometryQuestions: EnhancedQuestion[] = [
  // G1-G-001: التعرف على الأشكال البسيطة
  { id: 'CI-061', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: '(علاجي) ما اسم هذا الشكل: □', options: ['دائرة', 'مثلث', 'مربع', 'مستطيل'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'الشكل ذو 4 أضلاع متساوية هو مربع', visualType: 'shapes' },
  { id: 'CI-062', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: '(علاجي) ما اسم هذا الشكل: ○', options: ['مربع', 'مثلث', 'مستطيل', 'دائرة'], correctAnswer: 3, difficulty: 'easy', category: 'remedial', explanation: 'الشكل المستدير هو دائرة', visualType: 'shapes' },
  { id: 'CI-063', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: '(تثبيت) كم ضلعاً للمثلث؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', category: 'retention', explanation: 'المثلث له 3 أضلاع' },
  { id: 'CI-064', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: '(تثبيت) أي شكل ليس له أضلاع؟', options: ['مربع', 'مثلث', 'دائرة', 'مستطيل'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: 'الدائرة ليس لها أضلاع' },
  { id: 'CI-065', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'كم زاوية في المربع؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: 'المربع له 4 زوايا' },
  { id: 'CI-066', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل يشبه الباب؟', options: ['دائرة', 'مثلث', 'مستطيل', 'نجمة'], correctAnswer: 2, difficulty: 'easy', category: 'standard', explanation: 'الباب يشبه المستطيل' },
  { id: 'CI-067', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل يشبه العجلة؟', options: ['مربع', 'دائرة', 'مثلث', 'مستطيل'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: 'العجلة مستديرة مثل الدائرة' },
  { id: 'CI-068', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'ما الفرق بين المربع والمستطيل؟', options: ['المربع أكبر', 'المربع كل أضلاعه متساوية', 'المستطيل له 3 أضلاع', 'لا فرق'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: 'المربع أضلاعه الأربعة متساوية' },

  // G1-P-001: استكمال النمط
  { id: 'CI-069', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: '(علاجي) أكمل: 🔴🔵🔴🔵🔴___', options: ['🔴', '🔵', '🟢', '🟡'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'النمط: أحمر، أزرق، أحمر، أزرق... التالي أزرق', visualType: 'patterns', visualData: { type: 'color', pattern: ['red', 'blue'] } },
  { id: 'CI-070', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: '(علاجي) أكمل: △○△○△___', options: ['△', '○', '□', '◇'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'النمط: مثلث، دائرة، مثلث، دائرة... التالي دائرة', visualType: 'patterns' },
  { id: 'CI-071', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: '(تثبيت) أكمل: 1، 2، 1، 2، 1، ___', options: ['1', '2', '3', '0'], correctAnswer: 1, difficulty: 'easy', category: 'retention', explanation: 'النمط يتكرر: 1، 2، 1، 2...' },
  { id: 'CI-072', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل: 🌟🌟🌙🌟🌟🌙🌟🌟___', options: ['🌟', '🌙', '☀️', '⭐'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: 'النمط: نجمتان ثم قمر، التالي قمر', visualType: 'patterns', visualData: { type: 'shape', pattern: ['star', 'star', 'moon'] }, errorHint: 'pattern_confusion' },
  { id: 'CI-073', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل: 2، 4، 6، 8، ___', options: ['9', '10', '11', '12'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: 'العد بالاثنين: 2، 4، 6، 8، 10', visualType: 'number-line', visualData: { step: 2 }, errorHint: 'pattern_confusion' },
];

// ============================================================
// GRADE 1 - Time & Money
// ============================================================

const g1TimeMoney: EnhancedQuestion[] = [
  // G1-T-001: قراءة الوقت بالساعة
  { id: 'CI-074', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: '(علاجي) عقرب الساعة الصغير على 3، كم الساعة؟', options: ['الساعة 1', 'الساعة 2', 'الساعة 3', 'الساعة 4'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'العقرب الصغير يشير للساعة', visualType: 'clock', visualData: { hour: 3, minute: 0 } },
  { id: 'CI-075', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: '(علاجي) أي عقرب يدل على الساعة؟', options: ['الطويل', 'القصير', 'كلاهما', 'لا أحد'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'العقرب القصير يدل على الساعة' },
  { id: 'CI-076', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: '(تثبيت) الساعة 7 تماماً، أين يكون العقرب الكبير؟', options: ['على 12', 'على 6', 'على 3', 'على 7'], correctAnswer: 0, difficulty: 'medium', category: 'retention', explanation: 'عند الساعة تماماً، العقرب الكبير على 12', visualType: 'clock', visualData: { hour: 7, minute: 0 } },
  { id: 'CI-077', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'كم الساعة إذا كان العقرب الصغير على 9 والكبير على 12؟', options: ['الساعة 9', 'الساعة 12', 'الساعة 3', 'الساعة 6'], correctAnswer: 0, difficulty: 'medium', category: 'standard', explanation: 'العقرب الصغير على 9 والكبير على 12 = الساعة 9 تماماً', visualType: 'clock', visualData: { hour: 9, minute: 0 } },
  { id: 'CI-078', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'متى نذهب للمدرسة عادةً؟', options: ['الساعة 2 ظهراً', 'الساعة 7 صباحاً', 'الساعة 10 مساءً', 'الساعة 12 ليلاً'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: 'نذهب للمدرسة صباحاً حوالي الساعة 7' },

  // G1-T-002: التعرف على النقود العمانية
  { id: 'CI-079', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: '(علاجي) ما أصغر عملة معدنية عمانية؟', options: ['5 بيسات', '10 بيسات', '25 بيسة', '50 بيسة'], correctAnswer: 0, difficulty: 'easy', category: 'remedial', explanation: '5 بيسات هي أصغر عملة', visualType: 'money' },
  { id: 'CI-080', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: '(تثبيت) كم بيسة في 10 بيسات + 10 بيسات؟', options: ['10', '15', '20', '25'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '10 + 10 = 20 بيسة', visualType: 'money', visualData: { coins: [10, 10] } },
  { id: 'CI-081', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'لديك عملتان: 25 بيسة و 10 بيسات، كم المجموع؟', options: ['25', '30', '35', '40'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '25 + 10 = 35 بيسة', visualType: 'money', visualData: { coins: [25, 10] }, errorHint: 'counting_error' },
  { id: 'CI-082', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'ثمن قلم 50 بيسة، لديك 25 بيسة، كم تحتاج أكثر؟', options: ['15 بيسة', '20 بيسة', '25 بيسة', '30 بيسة'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '50 - 25 = 25 بيسة', visualType: 'money' },

  // G1-T-005: قراءة الوقت بالنصف ساعة
  { id: 'CI-083', grade: 1, semester: 1, skillId: 'G1-T-005', questionText: '(علاجي) النصف ساعة يعني العقرب الكبير على...', options: ['12', '3', '6', '9'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'النصف ساعة = العقرب الكبير على 6', visualType: 'clock', visualData: { hour: 3, minute: 30 } },
  { id: 'CI-084', grade: 1, semester: 1, skillId: 'G1-T-005', questionText: '(تثبيت) الساعة 4 والنصف، أين العقرب الكبير؟', options: ['على 12', 'على 3', 'على 6', 'على 9'], correctAnswer: 2, difficulty: 'easy', category: 'retention', explanation: 'النصف = العقرب الكبير على 6', visualType: 'clock', visualData: { hour: 4, minute: 30 } },
  { id: 'CI-085', grade: 1, semester: 1, skillId: 'G1-T-005', questionText: 'العقرب الصغير بين 2 و 3 والكبير على 6، كم الساعة؟', options: ['الساعة 2 والنصف', 'الساعة 3', 'الساعة 6', 'الساعة 2'], correctAnswer: 0, difficulty: 'medium', category: 'standard', explanation: 'العقرب الصغير بين 2 و 3 مع الكبير على 6 = 2:30', visualType: 'clock', visualData: { hour: 2, minute: 30 } },
];

// ============================================================
// GRADE 2 - SEMESTER 1: Numbers to 100
// ============================================================

const g2NumbersQuestions: EnhancedQuestion[] = [
  // G2-N-001: العد حتى 20
  { id: 'CI-086', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: '(علاجي) ما العدد بعد 15؟', options: ['14', '15', '16', '17'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'بعد 15 يأتي 16' },
  { id: 'CI-087', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: '(علاجي) أكمل: 11، 12، 13، ___', options: ['10', '14', '15', '12'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'بعد 13 يأتي 14' },
  { id: 'CI-088', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: '(تثبيت) عدّ تنازلياً: 20، 19، 18، ___', options: ['15', '16', '17', '21'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: 'العد التنازلي: 20، 19، 18، 17' },
  { id: 'CI-089', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'ما العدد بين 16 و 18؟', options: ['15', '17', '19', '16'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: '17 يقع بين 16 و 18' },
  { id: 'CI-090', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'رتّب تصاعدياً: 19، 12، 15، 20، 11', options: ['11، 12، 15، 19، 20', '20، 19، 15، 12، 11', '12، 11، 15، 19، 20', '11، 15، 12، 19، 20'], correctAnswer: 0, difficulty: 'hard', category: 'standard', explanation: 'من الأصغر: 11، 12، 15، 19، 20' },

  // G2-N-002: العد حتى 50
  { id: 'CI-091', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: '(علاجي) ما العدد بعد 29؟', options: ['28', '30', '31', '20'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'بعد 29 يأتي 30', errorHint: 'place_value_confusion' },
  { id: 'CI-092', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: '(علاجي) أكمل: 40، 41، 42، ___', options: ['40', '43', '44', '50'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'بعد 42 يأتي 43' },
  { id: 'CI-093', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: '(تثبيت) عدّ بالخمسات: 5، 10، 15، 20، ___', options: ['21', '22', '25', '30'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: 'العد بالخمسات: 5، 10، 15، 20، 25', visualType: 'number-line', visualData: { step: 5, max: 50 } },
  { id: 'CI-094', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: 'ما العدد الذي يسبق 50؟', options: ['40', '48', '49', '51'], correctAnswer: 2, difficulty: 'easy', category: 'standard', explanation: 'قبل 50 يأتي 49' },
  { id: 'CI-095', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: 'عدّ بالعشرات: 10، 20، 30، ___', options: ['31', '35', '40', '50'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: 'العد بالعشرات: 10، 20، 30، 40', visualType: 'number-line', visualData: { step: 10, max: 50 } },

  // G2-N-003: العد حتى 100
  { id: 'CI-096', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: '(علاجي) ما العدد بعد 99؟', options: ['98', '100', '101', '90'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'بعد 99 يأتي 100' },
  { id: 'CI-097', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: '(تثبيت) عدّ بالعشرات: 10، 20، ...، 100. كم عدد القفزات؟', options: ['5', '8', '9', '10'], correctAnswer: 3, difficulty: 'medium', category: 'retention', explanation: 'من 10 إلى 100 = 10 قفزات بالعشرات' },
  { id: 'CI-098', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'ما العدد بين 67 و 69؟', options: ['66', '68', '70', '67'], correctAnswer: 1, difficulty: 'easy', category: 'standard', explanation: '68 يقع بين 67 و 69' },
  { id: 'CI-099', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'أيهما أكبر: 78 أم 87؟', options: ['78', '87', 'متساويان', 'لا يمكن المقارنة'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '87 أكبر من 78', errorHint: 'place_value_confusion' },
  { id: 'CI-100', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'رتّب تنازلياً: 45، 89، 23، 67، 100', options: ['100، 89، 67، 45، 23', '23، 45، 67، 89، 100', '100، 67، 89، 45، 23', '89، 100، 67، 45، 23'], correctAnswer: 0, difficulty: 'hard', category: 'standard', explanation: 'من الأكبر: 100، 89، 67، 45، 23' },

  // G2-N-004: القيمة المكانية (عشرات وآحاد)
  { id: 'CI-101', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: '(علاجي) العدد 35: كم عشرة؟', options: ['3', '5', '35', '8'], correctAnswer: 0, difficulty: 'easy', category: 'remedial', explanation: '35 = 3 عشرات و 5 آحاد', errorHint: 'place_value_confusion' },
  { id: 'CI-102', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: '(علاجي) العدد 47: كم آحاد؟', options: ['4', '7', '47', '11'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '47 = 4 عشرات و 7 آحاد', errorHint: 'place_value_confusion' },
  { id: 'CI-103', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: '(تثبيت) 6 عشرات و 2 آحاد = ___', options: ['26', '62', '8', '602'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '6 عشرات + 2 آحاد = 62', errorHint: 'place_value_confusion' },
  { id: 'CI-104', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: 'العدد 90: كم عشرة وكم آحاد؟', options: ['9 عشرات و 0 آحاد', '0 عشرات و 9 آحاد', '90 عشرة', '9 آحاد'], correctAnswer: 0, difficulty: 'medium', category: 'standard', explanation: '90 = 9 عشرات و 0 آحاد' },
  { id: 'CI-105', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: 'أي عدد فيه 5 عشرات و 3 آحاد؟', options: ['35', '53', '8', '503'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '5 عشرات + 3 آحاد = 53', errorHint: 'place_value_confusion' },
];

// ============================================================
// GRADE 2 - Addition & Subtraction (larger numbers)
// ============================================================

const g2AddSubQuestions: EnhancedQuestion[] = [
  // G2-C-001: الجمع ضمن 20
  { id: 'CI-106', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '(علاجي) 8 + 2 = ___', options: ['9', '10', '11', '12'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '8 + 2 = 10' },
  { id: 'CI-107', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '(علاجي) 10 + 5 = ___', options: ['14', '15', '16', '50'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '10 + 5 = 15' },
  { id: 'CI-108', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '(تثبيت) 9 + 7 = ___', options: ['15', '16', '17', '14'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '9 + 7 = 16', visualType: 'number-line', visualData: { min: 0, max: 20, start: 9, jump: 7 }, errorHint: 'counting_error' },
  { id: 'CI-109', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '(تثبيت) 6 + 8 = ___', options: ['12', '13', '14', '15'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '6 + 8 = 14' },
  { id: 'CI-110', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '7 + 9 = ___', options: ['15', '16', '17', '18'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '7 + 9 = 16', errorHint: 'counting_error' },
  { id: 'CI-111', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '11 + 8 = ___', options: ['18', '19', '20', '17'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '11 + 8 = 19' },
  { id: 'CI-112', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '___ + 6 = 15', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '9 + 6 = 15', errorHint: 'operation_confusion' },
  { id: 'CI-113', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: 'في الصف 12 طالباً، جاء 7 آخرون، كم أصبح العدد؟', options: ['17', '18', '19', '20'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '12 + 7 = 19' },

  // G2-C-002: الطرح ضمن 20
  { id: 'CI-114', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '(علاجي) 15 - 5 = ___', options: ['5', '10', '15', '20'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '15 - 5 = 10' },
  { id: 'CI-115', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '(علاجي) 12 - 2 = ___', options: ['8', '9', '10', '14'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: '12 - 2 = 10' },
  { id: 'CI-116', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '(تثبيت) 18 - 9 = ___', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '18 - 9 = 9', visualType: 'number-line', visualData: { min: 0, max: 20, start: 18, jump: -9 } },
  { id: 'CI-117', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '(تثبيت) 20 - 7 = ___', options: ['12', '13', '14', '15'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '20 - 7 = 13' },
  { id: 'CI-118', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '16 - 8 = ___', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '16 - 8 = 8', errorHint: 'counting_error' },
  { id: 'CI-119', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '14 - ___ = 6', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '14 - 8 = 6', errorHint: 'operation_confusion' },
  { id: 'CI-120', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: 'كان في الحديقة 17 طائراً، طار 9، كم بقي؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '17 - 9 = 8' },

  // G2-C-003: الجمع ضمن 100
  { id: 'CI-121', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: '(علاجي) 20 + 30 = ___', options: ['40', '50', '60', '23'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '20 + 30 = 50' },
  { id: 'CI-122', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: '(علاجي) 40 + 10 = ___', options: ['30', '41', '50', '51'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: '40 + 10 = 50' },
  { id: 'CI-123', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: '(تثبيت) 35 + 20 = ___', options: ['45', '50', '55', '57'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '35 + 20 = 55', errorHint: 'place_value_confusion' },
  { id: 'CI-124', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: '(تثبيت) 48 + 12 = ___', options: ['50', '58', '60', '62'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '48 + 12 = 60' },
  { id: 'CI-125', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: '27 + 35 = ___', options: ['52', '62', '72', '57'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: '27 + 35 = 62', errorHint: 'place_value_confusion' },
  { id: 'CI-126', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: '56 + 44 = ___', options: ['90', '100', '110', '96'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: '56 + 44 = 100' },
  { id: 'CI-127', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: 'اشترى محمد كتاباً بـ 35 بيسة وقلماً بـ 25 بيسة، كم دفع؟', options: ['50', '55', '60', '65'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '35 + 25 = 60 بيسة', visualType: 'money' },

  // G2-C-004: الطرح ضمن 100
  { id: 'CI-128', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: '(علاجي) 50 - 20 = ___', options: ['20', '30', '40', '70'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '50 - 20 = 30' },
  { id: 'CI-129', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: '(علاجي) 80 - 10 = ___', options: ['60', '70', '80', '90'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '80 - 10 = 70' },
  { id: 'CI-130', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: '(تثبيت) 63 - 30 = ___', options: ['23', '30', '33', '93'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '63 - 30 = 33' },
  { id: 'CI-131', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: '(تثبيت) 100 - 45 = ___', options: ['45', '55', '65', '145'], correctAnswer: 1, difficulty: 'hard', category: 'retention', explanation: '100 - 45 = 55' },
  { id: 'CI-132', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: '75 - 28 = ___', options: ['43', '47', '53', '57'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: '75 - 28 = 47', errorHint: 'place_value_confusion' },
  { id: 'CI-133', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: 'لدى سالم 90 بيسة، اشترى عصيراً بـ 35 بيسة، كم بقي؟', options: ['45', '55', '65', '125'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '90 - 35 = 55 بيسة', visualType: 'money' },
];

// ============================================================
// GRADE 2 - Geometry, Patterns, Measurement
// ============================================================

const g2MiscQuestions: EnhancedQuestion[] = [
  // G2-G-001: الأشكال ثنائية الأبعاد
  { id: 'CI-134', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: '(علاجي) كم ضلعاً للمستطيل؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'المستطيل له 4 أضلاع', visualType: 'shapes' },
  { id: 'CI-135', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: '(تثبيت) ما الشكل الذي له 6 أضلاع؟', options: ['مربع', 'مثلث', 'سداسي', 'خماسي'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: 'السداسي له 6 أضلاع' },
  { id: 'CI-136', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'كم خط تماثل في المربع؟', options: ['1', '2', '3', '4'], correctAnswer: 3, difficulty: 'hard', category: 'standard', explanation: 'المربع له 4 خطوط تماثل' },
  { id: 'CI-137', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'أي شكل يشبه علبة العصير من الأمام؟', options: ['دائرة', 'مثلث', 'مستطيل', 'خماسي'], correctAnswer: 2, difficulty: 'easy', category: 'standard', explanation: 'علبة العصير مستطيلة الشكل من الأمام' },

  // G2-P-001: أنماط عددية
  { id: 'CI-138', grade: 2, semester: 1, skillId: 'G2-P-001', questionText: '(علاجي) أكمل: 2، 4، 6، 8، ___', options: ['9', '10', '12', '14'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: 'العد بالاثنين: 2، 4، 6، 8، 10', visualType: 'patterns', visualData: { type: 'skip-count', step: 2 } },
  { id: 'CI-139', grade: 2, semester: 1, skillId: 'G2-P-001', questionText: '(تثبيت) أكمل: 5، 10، 15، 20، ___', options: ['22', '25', '30', '21'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: 'العد بالخمسات: 5، 10، 15، 20، 25', visualType: 'patterns', visualData: { type: 'skip-count', step: 5 } },
  { id: 'CI-140', grade: 2, semester: 1, skillId: 'G2-P-001', questionText: 'أكمل: 3، 6، 9، 12، ___', options: ['13', '14', '15', '18'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: 'العد بالثلاثات: 3، 6، 9، 12، 15', visualType: 'patterns', visualData: { type: 'skip-count', step: 3 }, errorHint: 'pattern_confusion' },
  { id: 'CI-141', grade: 2, semester: 1, skillId: 'G2-P-001', questionText: 'أكمل: 50، 45، 40، 35، ___', options: ['25', '30', '32', '34'], correctAnswer: 1, difficulty: 'hard', category: 'standard', explanation: 'العد التنازلي بالخمسات: 50، 45، 40، 35، 30', errorHint: 'pattern_confusion' },
  { id: 'CI-142', grade: 2, semester: 1, skillId: 'G2-P-001', questionText: 'ما قاعدة النمط: 4، 8، 12، 16، 20؟', options: ['+2', '+3', '+4', '+5'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: 'كل مرة نضيف 4' },

  // G2-M-001: القياس بالسنتيمتر
  { id: 'CI-143', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: '(علاجي) ما وحدة قياس الطول الصغيرة؟', options: ['كيلوغرام', 'لتر', 'سنتيمتر', 'ساعة'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'السنتيمتر وحدة لقياس الأطوال الصغيرة' },
  { id: 'CI-144', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: '(تثبيت) قلم طوله 15 سم وآخر 10 سم، ما الفرق؟', options: ['3 سم', '5 سم', '10 سم', '25 سم'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '15 - 10 = 5 سم' },
  { id: 'CI-145', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'أي شيء طوله حوالي 1 سم؟', options: ['الباب', 'الإصبع', 'ظفر الإصبع', 'السيارة'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: 'ظفر الإصبع طوله حوالي 1 سم' },

  // G2-T-001: الوقت بالربع ساعة
  { id: 'CI-146', grade: 2, semester: 1, skillId: 'G2-T-001', questionText: '(علاجي) ربع ساعة = كم دقيقة؟', options: ['5', '10', '15', '30'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: 'ربع ساعة = 15 دقيقة', visualType: 'clock' },
  { id: 'CI-147', grade: 2, semester: 1, skillId: 'G2-T-001', questionText: '(تثبيت) الساعة 3 وربع، العقرب الكبير على...', options: ['12', '3', '6', '9'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: 'الربع = العقرب الكبير على 3', visualType: 'clock', visualData: { hour: 3, minute: 15 } },
  { id: 'CI-148', grade: 2, semester: 1, skillId: 'G2-T-001', questionText: 'الساعة 5 إلا ربع، كم الدقائق؟', options: ['4:15', '4:30', '4:45', '5:15'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '5 إلا ربع = 4:45', visualType: 'clock', visualData: { hour: 4, minute: 45 } },

  // G2-D-001: قراءة البيانات
  { id: 'CI-149', grade: 2, semester: 1, skillId: 'G2-D-001', questionText: '(علاجي) إذا كان الرسم البياني يُظهر: تفاح=5، برتقال=3، أيهما أكثر؟', options: ['التفاح', 'البرتقال', 'متساويان', 'لا أعرف'], correctAnswer: 0, difficulty: 'easy', category: 'remedial', explanation: '5 أكثر من 3، التفاح أكثر', visualType: 'chart' },
  { id: 'CI-150', grade: 2, semester: 1, skillId: 'G2-D-001', questionText: '(تثبيت) في جدول: أحمر=7، أزرق=4، أخضر=6. ما المجموع؟', options: ['15', '16', '17', '18'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '7 + 4 + 6 = 17' },
];

// ============================================================
// GRADE 2 - Multiplication Introduction
// ============================================================

const g2MultiplicationQuestions: EnhancedQuestion[] = [
  // G2-C-005: مفهوم الضرب
  { id: 'CI-151', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: '(علاجي) 3 مجموعات كل منها 2 = ___', options: ['5', '6', '7', '8'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '3 × 2 = 6', visualType: 'counting-objects', visualData: { groups: 3, perGroup: 2 } },
  { id: 'CI-152', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: '(علاجي) 2 × 4 يعني...', options: ['2 + 4', '4 + 4', '2 + 2 + 2 + 2', '4 × 4'], correctAnswer: 2, difficulty: 'easy', category: 'remedial', explanation: '2 × 4 = 2 + 2 + 2 + 2 = 8' },
  { id: 'CI-153', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: '(تثبيت) 5 × 2 = ___', options: ['7', '10', '12', '25'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '5 × 2 = 10' },
  { id: 'CI-154', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: '(تثبيت) 4 × 3 = ___', options: ['7', '10', '12', '14'], correctAnswer: 2, difficulty: 'medium', category: 'retention', explanation: '4 × 3 = 12' },
  { id: 'CI-155', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: '3 × 5 = ___', options: ['8', '12', '15', '20'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '3 × 5 = 15', errorHint: 'operation_confusion' },
  { id: 'CI-156', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: 'لدى 4 أطفال، كل واحد معه 5 حلويات، كم المجموع؟', options: ['9', '15', '20', '25'], correctAnswer: 2, difficulty: 'medium', category: 'standard', explanation: '4 × 5 = 20' },
  { id: 'CI-157', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: '2 × 2 × 2 = ___', options: ['4', '6', '8', '12'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '2 × 2 = 4، ثم 4 × 2 = 8' },
  { id: 'CI-158', grade: 2, semester: 2, skillId: 'G2-C-005', questionText: '___ × 3 = 18', options: ['3', '5', '6', '9'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '6 × 3 = 18' },

  // G2-C-006: مفهوم القسمة
  { id: 'CI-159', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: '(علاجي) وزّع 6 حلويات على 2 أطفال بالتساوي، كم لكل واحد؟', options: ['2', '3', '4', '6'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '6 ÷ 2 = 3', visualType: 'counting-objects', visualData: { total: 6, groups: 2 } },
  { id: 'CI-160', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: '(علاجي) 10 ÷ 5 = ___', options: ['1', '2', '3', '5'], correctAnswer: 1, difficulty: 'easy', category: 'remedial', explanation: '10 ÷ 5 = 2' },
  { id: 'CI-161', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: '(تثبيت) 12 ÷ 3 = ___', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '12 ÷ 3 = 4' },
  { id: 'CI-162', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: '(تثبيت) 15 ÷ 5 = ___', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'medium', category: 'retention', explanation: '15 ÷ 5 = 3' },
  { id: 'CI-163', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: '20 ÷ 4 = ___', options: ['4', '5', '6', '8'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '20 ÷ 4 = 5', errorHint: 'operation_confusion' },
  { id: 'CI-164', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: 'وزّع 18 كتاباً على 6 رفوف، كم كتاباً في كل رف؟', options: ['2', '3', '4', '6'], correctAnswer: 1, difficulty: 'medium', category: 'standard', explanation: '18 ÷ 6 = 3' },
  { id: 'CI-165', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: '___ ÷ 4 = 5', options: ['9', '15', '20', '25'], correctAnswer: 2, difficulty: 'hard', category: 'standard', explanation: '20 ÷ 4 = 5' },
];

// ============================================================
// Combine all questions
// ============================================================

export const contentIntelligenceQuestions: EnhancedQuestion[] = [
  ...g1CountingQuestions,
  ...g1AddSubQuestions,
  ...g1GeometryQuestions,
  ...g1TimeMoney,
  ...g2NumbersQuestions,
  ...g2AddSubQuestions,
  ...g2MiscQuestions,
  ...g2MultiplicationQuestions,
];

// Helper: get questions by category
export function getRemedialQuestions(skillId: string): EnhancedQuestion[] {
  return contentIntelligenceQuestions.filter(q => q.skillId === skillId && q.category === 'remedial');
}

export function getRetentionQuestions(skillId: string): EnhancedQuestion[] {
  return contentIntelligenceQuestions.filter(q => q.skillId === skillId && q.category === 'retention');
}

export function getQuestionsByCategory(skillId: string, category: QuestionCategory): EnhancedQuestion[] {
  return contentIntelligenceQuestions.filter(q => q.skillId === skillId && q.category === category);
}

export function getQuestionsByDifficulty(skillId: string, difficulty: 'easy' | 'medium' | 'hard'): EnhancedQuestion[] {
  return contentIntelligenceQuestions.filter(q => q.skillId === skillId && q.difficulty === difficulty);
}