// Pythagoras Math Skills Engine - Data
// Based on Omani Math Curriculum for Grade 1 and Grade 2
// Source: Cambridge University Press - كتب الرياضيات العمانية

import { skillPrerequisites, additionalSkills, getPrerequisites, getDependents, getFullPrerequisiteChain, isSkillReady, getRecommendedNextSkills, diagnoseWeakness } from './skillPrerequisites';
import { additionalQuestions } from './additionalQuestions';
import { expansionQuestions } from './expansionQuestions';
import { sprintQuestions } from './sprintQuestions';
import { contentIntelligenceQuestions } from './contentIntelligenceQuestions';

export { skillPrerequisites, getPrerequisites, getDependents, getFullPrerequisiteChain, isSkillReady, getRecommendedNextSkills, diagnoseWeakness };

export interface Skill {
  id: string;
  name: string;
  grade: 1 | 2;
  semester: 1 | 2;
  domain: string;
  curriculumRef?: string;
  prerequisites: string[];
  customSkill?: boolean;
}

export interface Question {
  id: string;
  grade: 1 | 2;
  semester: 1 | 2;
  skillId: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  visualType?: 'number-line' | 'analog-clock' | 'coins' | 'counting-objects' | 'shapes' | 'pattern' | 'measurement' | 'simple-chart';
  visualData?: Record<string, unknown>;
}

export interface StudentSkillProgress {
  skillId: string;
  attempts: number;
  correctCount: number;
  lastScore: number;
  lastAttemptDate: string;
  status: 'not_started' | 'needs_practice' | 'developing' | 'good' | 'mastered';
  history: { date: string; score: number; difficulty: string }[];
  avgResponseTime?: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
}

export const domains = {
  grade1: [
    'الأعداد والعد',
    'قراءة وكتابة الأعداد',
    'المقارنة والتكوين',
    'الجمع والطرح',
    'الأشكال الهندسية',
    'الأنماط',
    'القياس',
    'الوقت والنقود',
    'البيانات',
  ],
  grade2: [
    'الأعداد حتى 100',
    'العد بالمضاعفات',
    'التقريب والمقارنة',
    'الأزواج العددية',
    'الجمع والطرح',
    'المصفوفات والضرب',
    'الأشكال والمجسمات',
    'القياس',
    'الوقت والنقود',
    'البيانات',
    'الكسور',
  ],
};

export const skills: Skill[] = [
  // ===== Grade 1 - Semester 1 =====
  // المصدر: كتاب الرياضيات - الصف الأول - الفصل الدراسي الأول
  { id: 'G1-N-001', name: 'العد من 1 إلى 5', grade: 1, semester: 1, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 1 - الأعداد حتى عشرة' },
  { id: 'G1-N-002', name: 'العد من 1 إلى 10', grade: 1, semester: 1, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 1 - كم العدد؟' },
  { id: 'G1-N-003', name: 'قراءة الأعداد حتى 10', grade: 1, semester: 1, domain: 'قراءة وكتابة الأعداد', curriculumRef: 'الوحدة 1 - الأعداد حتى عشرة' },
  { id: 'G1-N-004', name: 'كتابة الأعداد حتى 10', grade: 1, semester: 1, domain: 'قراءة وكتابة الأعداد', curriculumRef: 'الوحدة 1 - الأعداد حتى عشرة', customSkill: true },
  { id: 'G1-N-005', name: 'مطابقة العدد بالكمية', grade: 1, semester: 1, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 1 - كم العدد؟' },
  { id: 'G1-N-006', name: 'المقارنة بين الكميات', grade: 1, semester: 1, domain: 'المقارنة والتكوين', curriculumRef: 'الوحدة 2 - كومة صناديق الأحذية' },
  { id: 'G1-N-007', name: 'معرفة الصفر', grade: 1, semester: 1, domain: 'الأعداد والعد', customSkill: true },
  { id: 'G1-N-008', name: 'أكثر بواحد', grade: 1, semester: 1, domain: 'المقارنة والتكوين', curriculumRef: 'الوحدة 2 - بين' },
  { id: 'G1-N-009', name: 'أقل بواحد', grade: 1, semester: 1, domain: 'المقارنة والتكوين', curriculumRef: 'الوحدة 2 - القفز خطوتين إلى الخلف' },
  { id: 'G1-N-010', name: 'تكوين العدد 5', grade: 1, semester: 1, domain: 'المقارنة والتكوين', curriculumRef: 'الوحدة 1 - أزواج الأعداد' },
  { id: 'G1-N-011', name: 'تكوين العدد 10', grade: 1, semester: 1, domain: 'المقارنة والتكوين', curriculumRef: 'الوحدة 1 - تكوين العدد 10' },
  { id: 'G1-N-014', name: 'الأعداد من 11 إلى 20', grade: 1, semester: 1, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 1 - أعداد أكثر من عشرة بقليل' },
  { id: 'G1-N-015', name: 'الضعف', grade: 1, semester: 1, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 1 - الضعف / ضعف العدد' },
  { id: 'G1-N-016', name: 'التقدير والعد المنظم', grade: 1, semester: 1, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 1 - التقدير والعدّ' },
  { id: 'G1-N-017', name: 'الأعداد الزوجية والفردية', grade: 1, semester: 1, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 2 - الأعداد الزوجية والفردية' },
  { id: 'G1-G-001', name: 'التعرف على الأشكال البسيطة', grade: 1, semester: 1, domain: 'الأشكال الهندسية', curriculumRef: 'الوحدة 1 - ما الشكل؟' },
  { id: 'G1-G-002', name: 'بناء الأشكال وتصنيفها', grade: 1, semester: 1, domain: 'الأشكال الهندسية', curriculumRef: 'الوحدة 1 - صناعة أربعة مربعات' },
  { id: 'G1-G-004', name: 'المجسمات ثلاثية الأبعاد', grade: 1, semester: 1, domain: 'الأشكال الهندسية', curriculumRef: 'الوحدة 1 - المجسمات' },
  { id: 'G1-P-001', name: 'استكمال النمط', grade: 1, semester: 1, domain: 'الأنماط', curriculumRef: 'الوحدة 1 - ما التالي؟' },
  { id: 'G1-M-001', name: 'مقارنة الأطوال', grade: 1, semester: 1, domain: 'القياس', curriculumRef: 'الوحدة 1 - بصمة قدم عملاقة / الطول' },
  { id: 'G1-M-002', name: 'مقارنة السعة', grade: 1, semester: 1, domain: 'القياس', curriculumRef: 'الوحدة 1 - السعة' },
  { id: 'G1-M-003', name: 'مقارنة الوزن', grade: 1, semester: 1, domain: 'القياس', curriculumRef: 'الوحدة 1 - الأخف والأثقل' },
  { id: 'G1-T-001', name: 'قراءة الوقت بالساعة', grade: 1, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'الأوقات في مطعم المدرسة' },
  { id: 'G1-T-002', name: 'التعرف على النقود العمانية', grade: 1, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'الوحدة 2 - النقود' },
  { id: 'G1-T-005', name: 'قراءة الوقت بالنصف ساعة', grade: 1, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'الأوقات في مطعم المدرسة - النصف ساعة' },
  { id: 'G1-T-006', name: 'جمع النقود البسيطة', grade: 1, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'الوحدة 2 - النقود والشراء' },
  { id: 'G1-D-001', name: 'عد وتسجيل بيانات بسيطة', grade: 1, semester: 1, domain: 'البيانات', curriculumRef: 'مطعم المدرسة - تصنيف البيانات' },

  // ===== Grade 1 - Semester 2 =====
  // المصدر: كتاب الرياضيات - الصف الأول - الفصل الدراسي الثاني
  { id: 'G1-N-012', name: 'الجمع ضمن 10', grade: 1, semester: 2, domain: 'الجمع والطرح', curriculumRef: 'النشاط 21 - الإضافة / الجمع' },
  { id: 'G1-N-013', name: 'الطرح ضمن 10', grade: 1, semester: 2, domain: 'الجمع والطرح', curriculumRef: 'النشاط 21 - الطرح' },
  { id: 'G1-N-018', name: 'الجمع على خط الأعداد', grade: 1, semester: 2, domain: 'الجمع والطرح', curriculumRef: 'النشاط 21 - الإضافة على خط الأعداد' },
  { id: 'G1-N-019', name: 'العدد المكمل للعشرة', grade: 1, semester: 2, domain: 'الجمع والطرح', curriculumRef: 'النشاط 23 - كم تحتاج أكثر؟' },
  { id: 'G1-N-020', name: 'الضعف والنصف', grade: 1, semester: 2, domain: 'الجمع والطرح', curriculumRef: 'النشاط 22 - الضعف والنصف / الأنصاف' },
  { id: 'G1-N-021', name: 'العشرات والآحاد', grade: 1, semester: 2, domain: 'الأعداد والعد', curriculumRef: 'النشاط 20 - الآحاد والعشرات' },
  { id: 'G1-N-022', name: 'العد بالعشرات حتى 100', grade: 1, semester: 2, domain: 'الأعداد والعد', curriculumRef: 'النشاط 20 - العشرات' },
  { id: 'G1-G-003', name: 'عد الأشكال', grade: 1, semester: 2, domain: 'الأشكال الهندسية', curriculumRef: 'النشاط 22 - أنصاف الأشكال' },
  { id: 'G1-G-005', name: 'التماثل في الأشكال', grade: 1, semester: 2, domain: 'الأشكال الهندسية', curriculumRef: 'النشاط 22 - أنصاف الأشكال' },
  { id: 'G1-T-003', name: 'أيام الأسبوع', grade: 1, semester: 2, domain: 'الوقت والنقود', curriculumRef: 'النشاط 17 - يومي' },
  { id: 'G1-T-004', name: 'أشهر السنة', grade: 1, semester: 2, domain: 'الوقت والنقود', curriculumRef: 'النشاط 17 - أشهر السنة' },
  { id: 'G1-D-002', name: 'قراءة مخطط الصور والمكعبات', grade: 1, semester: 2, domain: 'البيانات', curriculumRef: 'النشاط 19 - التمثيل بالصور والمكعبات' },
  { id: 'G1-D-003', name: 'التصنيف باستخدام مخطط فن', grade: 1, semester: 2, domain: 'البيانات', curriculumRef: 'النشاط 19 - التصنيف' },

  // ===== Grade 2 - Semester 1 =====
  // المصدر: كتاب الرياضيات - الصف الثاني - الفصل الدراسي الأول
  { id: 'G2-N-001', name: 'قراءة الأعداد حتى 100', grade: 2, semester: 1, domain: 'الأعداد حتى 100', curriculumRef: 'النشاط 2-1 - ما بين العقود' },
  { id: 'G2-N-002', name: 'استخدام لوحة المائة', grade: 2, semester: 1, domain: 'الأعداد حتى 100', curriculumRef: 'النشاط 2-1 - لوحة المائة' },
  { id: 'G2-N-003', name: 'العد بالاثنينات', grade: 2, semester: 1, domain: 'العد بالمضاعفات', curriculumRef: 'النشاط 2-1 - كم العدد؟' },
  { id: 'G2-N-004', name: 'العد بالخمسات', grade: 2, semester: 1, domain: 'العد بالمضاعفات', curriculumRef: 'النشاط 2-1 - كم العدد؟' },
  { id: 'G2-N-005', name: 'العد بالعشرات', grade: 2, semester: 1, domain: 'العد بالمضاعفات', curriculumRef: 'النشاط 2-1 - كم العدد؟' },
  { id: 'G2-N-006', name: 'ترتيب الأعداد حتى 100', grade: 2, semester: 1, domain: 'الأعداد حتى 100', curriculumRef: 'النشاط 4-1 - خطّ الأعداد' },
  { id: 'G2-N-007', name: 'مقارنة الأعداد حتى 100', grade: 2, semester: 1, domain: 'التقريب والمقارنة', curriculumRef: 'النشاط 12-2 - أكبر من، أصغر من' },
  { id: 'G2-N-008', name: 'التقريب إلى أقرب عشرة', grade: 2, semester: 1, domain: 'التقريب والمقارنة', curriculumRef: 'النشاط 4-2 - تقريب العدد' },
  { id: 'G2-N-009', name: 'الأزواج العددية للعدد 20', grade: 2, semester: 1, domain: 'الأزواج العددية', curriculumRef: 'النشاط 5-1 - عشرون' },
  { id: 'G2-N-010', name: 'الأزواج العددية حتى 100', grade: 2, semester: 1, domain: 'الأزواج العددية', curriculumRef: 'النشاط 3-1 - 100 غرام' },
  { id: 'G2-C-001', name: 'الجمع ضمن 20', grade: 2, semester: 1, domain: 'الجمع والطرح', curriculumRef: 'النشاط 6-1 - كم طريقة؟' },
  { id: 'G2-C-002', name: 'الطرح ضمن 20', grade: 2, semester: 1, domain: 'الجمع والطرح', curriculumRef: 'النشاط 6-2 - قلوب ونجوم' },
  { id: 'G2-C-005', name: 'عائلة الحقائق', grade: 2, semester: 1, domain: 'الجمع والطرح', curriculumRef: 'النشاط 3-2 - مثلّث عائلة الحقائق' },
  { id: 'G2-A-001', name: 'فهم المصفوفات', grade: 2, semester: 1, domain: 'المصفوفات والضرب', curriculumRef: 'النشاط 7-1 - المصفوفات' },
  { id: 'G2-G-001', name: 'التعرف على الأشكال ثنائية الأبعاد', grade: 2, semester: 1, domain: 'الأشكال والمجسمات', curriculumRef: 'النشاط 8-1 - الأشكال' },
  { id: 'G2-G-002', name: 'التعرف على المجسمات', grade: 2, semester: 1, domain: 'الأشكال والمجسمات', curriculumRef: 'النشاط 8-2 - ابحث عن الأوجه' },
  { id: 'G2-G-003', name: 'التماثل', grade: 2, semester: 1, domain: 'الأشكال والمجسمات', curriculumRef: 'النشاط 8-3 - الوردات الورقية' },
  { id: 'G2-M-001', name: 'قياس الطول بالسنتيمتر', grade: 2, semester: 1, domain: 'القياس', curriculumRef: 'النشاط 9-2 - كم الطول؟' },
  { id: 'G2-M-002', name: 'قياس الكتلة بالغرام', grade: 2, semester: 1, domain: 'القياس', curriculumRef: 'النشاط 11-1 - صنع البسكويت' },
  { id: 'G2-M-003', name: 'قياس الوقت', grade: 2, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'النشاط 10-1 - قياس الوقت' },
  { id: 'G2-M-004', name: 'النقود', grade: 2, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'النشاط 11-3 - ما الثمن؟' },
  { id: 'G2-T-001', name: 'قراءة الوقت بالدقائق', grade: 2, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'النشاط 10-1 - الساعة والدقائق' },
  { id: 'G2-T-002', name: 'حساب الفترة الزمنية', grade: 2, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'النشاط 10-2 - كم استغرق؟' },
  { id: 'G2-T-003', name: 'جمع وطرح النقود', grade: 2, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'النشاط 11-3 - الباقي من الشراء' },
  { id: 'G2-T-004', name: 'مقارنة الأسعار', grade: 2, semester: 1, domain: 'الوقت والنقود', curriculumRef: 'النشاط 11-3 - أيهما أغلى؟' },

  // ===== Grade 2 - Semester 2 =====
  // المصدر: كتاب الرياضيات - الصف الثاني - الفصل الدراسي الثاني
  { id: 'G2-N-011', name: 'الضعف', grade: 2, semester: 2, domain: 'الأزواج العددية', curriculumRef: 'النشاط 22 - أيُّ ضِعْف؟' },
  { id: 'G2-N-012', name: 'العد بالثلاثات', grade: 2, semester: 2, domain: 'العد بالمضاعفات', curriculumRef: 'النشاط 23 - الكوكب الثلاثي' },
  { id: 'G2-N-013', name: 'العد بالأربعات', grade: 2, semester: 2, domain: 'العد بالمضاعفات', curriculumRef: 'النشاط 23 - الكوكب الرباعي' },
  { id: 'G2-C-003', name: 'الجمع ضمن 100', grade: 2, semester: 2, domain: 'الجمع والطرح', curriculumRef: 'النشاط 24 - جمع أم طرح؟' },
  { id: 'G2-C-004', name: 'الطرح ضمن 100', grade: 2, semester: 2, domain: 'الجمع والطرح', curriculumRef: 'النشاط 24 - جمع أم طرح؟' },
  { id: 'G2-C-006', name: 'الفرق بين عددين', grade: 2, semester: 2, domain: 'الجمع والطرح', customSkill: true },
  { id: 'G2-A-002', name: 'الضرب باستخدام المصفوفات', grade: 2, semester: 2, domain: 'المصفوفات والضرب', curriculumRef: 'النشاط 26 - صينية الكعكات' },
  { id: 'G2-G-004', name: 'المضلعات المتقدمة', grade: 2, semester: 2, domain: 'الأشكال والمجسمات', curriculumRef: 'النشاط 28 - ثانوغرام' },
  { id: 'G2-G-005', name: 'الدوران والحركة', grade: 2, semester: 2, domain: 'الأشكال والمجسمات', curriculumRef: 'النشاط 29 - اتجاهات اللعب' },
  { id: 'G2-M-005', name: 'قياس السعة باللتر', grade: 2, semester: 2, domain: 'القياس', curriculumRef: 'النشاط 20 - أباريق / صنع لتر' },
  { id: 'G2-D-001', name: 'قراءة البيانات المصورة', grade: 2, semester: 2, domain: 'البيانات', curriculumRef: 'النشاط 18 - ماذا أفضل؟' },
  { id: 'G2-D-002', name: 'مقارنة البيانات', grade: 2, semester: 2, domain: 'البيانات', curriculumRef: 'النشاط 18 - مقارنة البيانات' },
  { id: 'G2-D-003', name: 'التمثيل بالمكعبات أو الصور', grade: 2, semester: 2, domain: 'البيانات', curriculumRef: 'النشاط 18 - التمثيل بالمكعبات' },
  { id: 'G2-F-001', name: 'الكسور: النصف والربع', grade: 2, semester: 2, domain: 'الكسور', curriculumRef: 'النشاط 25 - أجزاء الكسور' },
];

export const questions: Question[] = [
  // ===== Grade 1 - Semester 1 =====
  { id: 'Q1-001', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم عدد التفاحات؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'نعد التفاحات: واحد، اثنان، ثلاثة. الإجابة هي 3', visualType: 'counting-objects', visualData: { emoji: '🍎', count: 3, arrangement: 'line' } },
  { id: 'Q1-002', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم عدد النجوم؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'نعد النجوم: 1، 2، 3، 4، 5. الإجابة هي 5', visualType: 'counting-objects', visualData: { emoji: '⭐', count: 5, arrangement: 'line' } },
  { id: 'Q1-003', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما العدد الذي يأتي بعد 6؟', options: ['5', '7', '8', '9'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد الذي يأتي بعد 6 هو 7', visualType: 'number-line', visualData: { start: 1, end: 10, highlight: [6, 7] } },
  { id: 'Q1-004', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما العدد الذي يأتي بعد 9؟', options: ['8', '10', '11', '7'], correctAnswer: 1, difficulty: 'medium', explanation: 'العدد الذي يأتي بعد 9 هو 10', visualType: 'number-line', visualData: { start: 1, end: 10, highlight: [9, 10] } },
  { id: 'Q1-005', grade: 1, semester: 1, skillId: 'G1-N-003', questionText: 'اختر العدد الذي يطابق التفاحات', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: 'أربع تفاحات تطابق العدد 4', visualType: 'counting-objects', visualData: { emoji: '🍎', count: 4, arrangement: 'grid' } },
  { id: 'Q1-006', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'أي صورة تمثل العدد 2؟', options: ['🐱', '🐱🐱', '🐱🐱🐱', '🐱🐱🐱🐱'], correctAnswer: 1, difficulty: 'easy', explanation: 'قطتان تمثل العدد 2', visualType: 'counting-objects', visualData: { emoji: '🐱', count: 2, arrangement: 'line' } },
  { id: 'Q1-007', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'أيهما أكثر؟', options: ['الأزرق أكثر', 'الأحمر أكثر', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '5 كرات حمراء أكثر من 3 كرات زرقاء', visualType: 'simple-chart', visualData: { type: 'pictograph', data: [{ label: 'أزرق', value: 3, emoji: '🔵' }, { label: 'أحمر', value: 5, emoji: '🔴' }] } },
  { id: 'Q1-008', grade: 1, semester: 1, skillId: 'G1-N-007', questionText: 'كم عدد الطيور على الشجرة الفارغة؟', options: ['1', '2', '0', '3'], correctAnswer: 2, difficulty: 'easy', explanation: 'الشجرة فارغة، لا يوجد طيور. العدد هو صفر (0)' },
  { id: 'Q1-009', grade: 1, semester: 1, skillId: 'G1-N-008', questionText: 'ما العدد الأكثر بواحد من 5؟', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', explanation: 'أكثر بواحد من 5 هو 6', visualType: 'number-line', visualData: { start: 1, end: 10, highlight: [5, 6] } },
  { id: 'Q1-010', grade: 1, semester: 1, skillId: 'G1-N-009', questionText: 'ما العدد الأقل بواحد من 8؟', options: ['6', '7', '8', '9'], correctAnswer: 1, difficulty: 'easy', explanation: 'أقل بواحد من 8 هو 7', visualType: 'number-line', visualData: { start: 1, end: 10, highlight: [7, 8] } },
  { id: 'Q1-011', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: 'ما العددان اللذان يكوّنان 5؟', options: ['2 و 3', '1 و 5', '4 و 2', '3 و 3'], correctAnswer: 0, difficulty: 'medium', explanation: '2 + 3 = 5، إذن 2 و 3 يكوّنان العدد 5' },
  { id: 'Q1-012', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل هو المثلث؟', options: ['⬜ مربع', '🔺 مثلث', '⭕ دائرة', '▬ مستطيل'], correctAnswer: 1, difficulty: 'easy', explanation: 'المثلث هو الشكل الذي له 3 أضلاع و 3 زوايا', visualType: 'shapes', visualData: { shape: 'triangle', count: 1, color: '#10B981' } },
  { id: 'Q1-013', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'كم عدد أضلاع المربع؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: 'المربع له 4 أضلاع متساوية', visualType: 'shapes', visualData: { shape: 'square', count: 1, color: '#6366F1' } },
  { id: 'Q1-014', grade: 1, semester: 1, skillId: 'G1-M-001', questionText: 'أيهما أطول: القلم أم المسطرة؟', options: ['القلم', 'المسطرة', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'المسطرة عادة أطول من القلم', visualType: 'measurement', visualData: { type: 'length', items: [{ name: 'القلم', value: 15, unit: 'سم' }, { name: 'المسطرة', value: 30, unit: 'سم' }] } },
  { id: 'Q1-033', grade: 1, semester: 1, skillId: 'G1-N-014', questionText: 'ما العدد الذي يأتي بعد 15؟', options: ['14', '16', '17', '20'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد الذي يأتي بعد 15 هو 16' },
  { id: 'Q1-034', grade: 1, semester: 1, skillId: 'G1-N-014', questionText: 'رتّب: 12، 18، 15 من الأصغر', options: ['18، 15، 12', '12، 15، 18', '15، 12، 18', '12، 18، 15'], correctAnswer: 1, difficulty: 'medium', explanation: 'الترتيب من الأصغر: 12، 15، 18' },
  { id: 'Q1-035', grade: 1, semester: 1, skillId: 'G1-N-015', questionText: 'ما ضعف العدد 3؟', options: ['5', '6', '7', '9'], correctAnswer: 1, difficulty: 'easy', explanation: 'ضعف 3 = 3 + 3 = 6' },
  { id: 'Q1-036', grade: 1, semester: 1, skillId: 'G1-N-015', questionText: 'ما ضعف العدد 5؟', options: ['8', '10', '12', '15'], correctAnswer: 1, difficulty: 'medium', explanation: 'ضعف 5 = 5 + 5 = 10' },
  { id: 'Q1-037', grade: 1, semester: 1, skillId: 'G1-N-016', questionText: 'خمّن: كم كرة تقريباً في الصورة؟ (الإجابة الصحيحة 8)', options: ['3', '5', '8', '15'], correctAnswer: 2, difficulty: 'medium', explanation: 'التقدير الصحيح هو حوالي 8 كرات' },
  { id: 'Q1-038', grade: 1, semester: 1, skillId: 'G1-N-017', questionText: 'أي عدد زوجي؟', options: ['3', '5', '6', '9'], correctAnswer: 2, difficulty: 'easy', explanation: '6 عدد زوجي لأنه يقبل القسمة على 2' },
  { id: 'Q1-039', grade: 1, semester: 1, skillId: 'G1-N-017', questionText: 'أي عدد فردي؟', options: ['2', '4', '7', '8'], correctAnswer: 2, difficulty: 'easy', explanation: '7 عدد فردي لأنه لا يقبل القسمة على 2' },
  { id: 'Q1-040', grade: 1, semester: 1, skillId: 'G1-G-004', questionText: 'أي مجسم يشبه علبة الحليب؟', options: ['كرة', 'مكعب', 'متوازي مستطيلات', 'مخروط'], correctAnswer: 2, difficulty: 'easy', explanation: 'علبة الحليب تشبه متوازي المستطيلات' },
  { id: 'Q1-041', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'الساعة تشير إلى الوقت التالي. ماذا نقول؟', options: ['الساعة الثامنة', 'الساعة التاسعة', 'الساعة العاشرة', 'الساعة الثالثة'], correctAnswer: 1, difficulty: 'easy', explanation: 'عندما يشير عقرب الساعات إلى 9 نقول: الساعة التاسعة', visualType: 'analog-clock', visualData: { hours: 9, minutes: 0 } },
  { id: 'Q1-042', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'كم ريالاً في هذه النقود؟', options: ['5', '10', '15', '20'], correctAnswer: 1, difficulty: 'easy', explanation: '5 + 5 = 10 ريالات', visualType: 'coins', visualData: { coins: [{ value: 5, label: '٥', count: 2 }], currency: 'ر.ع' } },
  { id: 'Q1-053', grade: 1, semester: 1, skillId: 'G1-T-005', questionText: 'انظر إلى الساعة. أين يكون عقرب الدقائق؟', options: ['على الرقم 12', 'على الرقم 6', 'على الرقم 3', 'على الرقم 9'], correctAnswer: 1, difficulty: 'easy', explanation: 'عند النصف ساعة يكون عقرب الدقائق على الرقم 6', visualType: 'analog-clock', visualData: { hours: 3, minutes: 30 } },
  { id: 'Q1-054', grade: 1, semester: 1, skillId: 'G1-T-005', questionText: 'ما الوقت الذي تشير إليه الساعة؟', options: ['الساعة 6 والنصف', 'الساعة 7 والنصف', 'الساعة 8', 'الساعة 7'], correctAnswer: 1, difficulty: 'medium', explanation: 'عقرب الساعات بين 7 و 8 وعقرب الدقائق على 6 يعني الساعة 7 والنصف', visualType: 'analog-clock', visualData: { hours: 7, minutes: 30 } },
  { id: 'Q1-055', grade: 1, semester: 1, skillId: 'G1-T-006', questionText: 'لديك هذه النقود. كم المجموع؟', options: ['2 ريال', '3 ريالات', '4 ريالات', '5 ريالات'], correctAnswer: 1, difficulty: 'easy', explanation: '2 + 1 = 3 ريالات', visualType: 'coins', visualData: { coins: [{ value: 2, label: '٢', count: 1 }, { value: 1, label: '١', count: 1 }], currency: 'ر.ع' } },
  { id: 'Q1-056', grade: 1, semester: 1, skillId: 'G1-T-006', questionText: 'اشتريت حلوى بـ 3 ريالات ولديك 5 ريالات. كم يتبقى؟', options: ['1 ريال', '2 ريال', '3 ريالات', '4 ريالات'], correctAnswer: 1, difficulty: 'medium', explanation: '5 - 3 = 2 ريال', visualType: 'coins', visualData: { coins: [{ value: 5, label: '٥', count: 1 }], currency: 'ر.ع' } },

  // ===== Grade 1 - Semester 2 =====
  { id: 'Q1-015', grade: 1, semester: 2, skillId: 'G1-N-011', questionText: 'ما العددان اللذان يكوّنان 10؟', options: ['3 و 7', '4 و 5', '2 و 6', '5 و 6'], correctAnswer: 0, difficulty: 'medium', explanation: '3 + 7 = 10' },
  { id: 'Q1-016', grade: 1, semester: 2, skillId: 'G1-N-011', questionText: 'أكمل: 6 + __ = 10', options: ['3', '4', '5', '2'], correctAnswer: 1, difficulty: 'medium', explanation: '6 + 4 = 10' },
  { id: 'Q1-017', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'ما ناتج 3 + 4؟', options: ['6', '7', '8', '5'], correctAnswer: 1, difficulty: 'easy', explanation: '3 + 4 = 7' },
  { id: 'Q1-018', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'ما ناتج 5 + 3؟', options: ['7', '8', '9', '6'], correctAnswer: 1, difficulty: 'easy', explanation: '5 + 3 = 8' },
  { id: 'Q1-019', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما ناتج 8 - 3؟', options: ['4', '5', '6', '3'], correctAnswer: 1, difficulty: 'easy', explanation: '8 - 3 = 5' },
  { id: 'Q1-020', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما ناتج 10 - 4؟', options: ['5', '6', '7', '4'], correctAnswer: 1, difficulty: 'medium', explanation: '10 - 4 = 6' },
  { id: 'Q1-021', grade: 1, semester: 2, skillId: 'G1-P-001', questionText: 'أكمل النمط: ما الشكل التالي؟', options: ['مثلث', 'دائرة', 'مربع', 'مستطيل'], correctAnswer: 1, difficulty: 'easy', explanation: 'النمط يتكرر: دائرة، مربع. إذن التالي هو دائرة', visualType: 'pattern', visualData: { items: ['⭕', '⬜', '⭕', '⬜', '⭕'], missingIndex: 4 } },
  { id: 'Q1-022', grade: 1, semester: 2, skillId: 'G1-P-001', questionText: 'أكمل النمط: ما اللون التالي؟', options: ['🔴', '🔵', '🟢', '🟡'], correctAnswer: 1, difficulty: 'easy', explanation: 'النمط يتكرر: أحمر، أزرق. إذن التالي هو أزرق', visualType: 'pattern', visualData: { items: ['🔴', '🔵', '🔴', '🔵', '🔴', '?'], missingIndex: 5 } },
  { id: 'Q1-023', grade: 1, semester: 2, skillId: 'G1-G-003', questionText: 'كم مثلثاً في الصورة؟ 🔺🔺🔺🔺', options: ['3', '4', '5', '2'], correctAnswer: 1, difficulty: 'easy', explanation: 'نعد المثلثات: 1، 2، 3، 4' },
  { id: 'Q1-024', grade: 1, semester: 2, skillId: 'G1-M-002', questionText: 'أي إناء يتسع لكمية أكبر من الماء؟', options: ['الكوب الصغير', 'الدلو الكبير', 'متساويان', 'الملعقة'], correctAnswer: 1, difficulty: 'easy', explanation: 'الدلو الكبير يتسع لكمية أكبر من الماء' },
  { id: 'Q1-025', grade: 1, semester: 2, skillId: 'G1-M-003', questionText: 'أيهما أثقل: الريشة أم الحجر؟', options: ['الريشة', 'الحجر', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الحجر أثقل من الريشة' },
  { id: 'Q1-026', grade: 1, semester: 2, skillId: 'G1-D-001', questionText: 'انظر إلى الفواكه. كم عدد الموز؟', options: ['2', '3', '4', '1'], correctAnswer: 1, difficulty: 'easy', explanation: 'نعد الموز 🍌: 1، 2، 3', visualType: 'simple-chart', visualData: { type: 'pictograph', data: [{ label: 'تفاح', value: 2, emoji: '🍎' }, { label: 'موز', value: 3, emoji: '🍌' }, { label: 'برتقال', value: 1, emoji: '🍊' }] } },
  { id: 'Q1-043', grade: 1, semester: 2, skillId: 'G1-N-018', questionText: 'استخدم خط الأعداد: 7 + 3 = ؟', options: ['9', '10', '11', '8'], correctAnswer: 1, difficulty: 'easy', explanation: 'نبدأ من 7 ونقفز 3 قفزات للأمام: 8، 9، 10', visualType: 'number-line', visualData: { start: 0, end: 12, highlight: [7, 8, 9, 10], jumpFrom: 7, jumpTo: 10, jumpCount: 3 } },
  { id: 'Q1-044', grade: 1, semester: 2, skillId: 'G1-N-019', questionText: 'كم تحتاج لتصل إلى 10 إذا كان معك 3؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: '3 + 7 = 10، إذن تحتاج 7' },
  { id: 'Q1-045', grade: 1, semester: 2, skillId: 'G1-N-020', questionText: 'ما نصف العدد 8؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: 'نصف 8 = 4' },
  { id: 'Q1-046', grade: 1, semester: 2, skillId: 'G1-N-020', questionText: 'ما ضعف العدد 4؟', options: ['6', '8', '10', '12'], correctAnswer: 1, difficulty: 'easy', explanation: 'ضعف 4 = 4 + 4 = 8' },
  { id: 'Q1-047', grade: 1, semester: 2, skillId: 'G1-N-021', questionText: 'العدد 35 يتكون من:', options: ['3 عشرات و 5 آحاد', '5 عشرات و 3 آحاد', '35 آحاد فقط', '3 آحاد و 5 عشرات'], correctAnswer: 0, difficulty: 'medium', explanation: '35 = 3 عشرات (30) + 5 آحاد (5)' },
  { id: 'Q1-048', grade: 1, semester: 2, skillId: 'G1-N-022', questionText: 'أكمل العد بالعشرات: 10، 20، 30، __', options: ['35', '40', '50', '31'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالعشرات: 10، 20، 30، 40' },
  { id: 'Q1-049', grade: 1, semester: 2, skillId: 'G1-T-003', questionText: 'ما اليوم الذي يأتي بعد الأحد؟', options: ['السبت', 'الاثنين', 'الثلاثاء', 'الأربعاء'], correctAnswer: 1, difficulty: 'easy', explanation: 'بعد يوم الأحد يأتي يوم الاثنين' },
  { id: 'Q1-050', grade: 1, semester: 2, skillId: 'G1-T-004', questionText: 'ما الشهر الذي يأتي بعد يناير؟', options: ['مارس', 'فبراير', 'أبريل', 'ديسمبر'], correctAnswer: 1, difficulty: 'easy', explanation: 'بعد شهر يناير يأتي شهر فبراير' },
  { id: 'Q1-051', grade: 1, semester: 2, skillId: 'G1-D-002', questionText: 'في مخطط الصور: 🍎🍎🍎 و 🍌🍌🍌🍌🍌. أيهما أكثر؟', options: ['التفاح', 'الموز', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الموز (5) أكثر من التفاح (3)' },
  { id: 'Q1-052', grade: 1, semester: 2, skillId: 'G1-G-005', questionText: 'أي شكل له خط تماثل؟', options: ['مثلث متساوي الأضلاع', 'شكل عشوائي', 'خط متعرج', 'نقطة'], correctAnswer: 0, difficulty: 'medium', explanation: 'المثلث متساوي الأضلاع له خطوط تماثل', visualType: 'shapes', visualData: { shape: 'triangle', count: 1, showSymmetry: true, color: '#8B5CF6' } },

  // ===== Grade 2 - Semester 1 =====
  { id: 'Q2-001', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'ما هو العدد: خمسة وأربعون؟', options: ['54', '45', '35', '55'], correctAnswer: 1, difficulty: 'easy', explanation: 'خمسة وأربعون = 45' },
  { id: 'Q2-002', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'اقرأ العدد 73', options: ['سبعة وثلاثون', 'ثلاثة وسبعون', 'سبعون وثلاثة', 'ثلاثة عشر'], correctAnswer: 1, difficulty: 'easy', explanation: '73 = ثلاثة وسبعون' },
  { id: 'Q2-003', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: 'في لوحة المائة، ما العدد الذي يقع أسفل 25؟', options: ['26', '35', '15', '24'], correctAnswer: 1, difficulty: 'medium', explanation: 'في لوحة المائة، العدد أسفل أي عدد يزيد عنه بـ 10. إذن أسفل 25 هو 35' },
  { id: 'Q2-004', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'أكمل العد بالاثنينات: 2، 4، 6، __', options: ['7', '8', '9', '10'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالاثنينات: 2، 4، 6، 8' },
  { id: 'Q2-005', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: 'أكمل العد بالخمسات: 5، 10، 15، __', options: ['16', '18', '20', '25'], correctAnswer: 2, difficulty: 'easy', explanation: 'العد بالخمسات: 5، 10، 15، 20' },
  { id: 'Q2-006', grade: 2, semester: 1, skillId: 'G2-N-005', questionText: 'أكمل العد: 10، 20، 30، __', options: ['35', '40', '50', '31'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالعشرات: 10، 20، 30، 40' },
  { id: 'Q2-007', grade: 2, semester: 1, skillId: 'G2-N-006', questionText: 'رتّب الأعداد من الأصغر: 45، 23، 67', options: ['67، 45، 23', '23، 45، 67', '45، 23، 67', '23، 67، 45'], correctAnswer: 1, difficulty: 'medium', explanation: 'الترتيب من الأصغر: 23، 45، 67' },
  { id: 'Q2-008', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'أي عدد أكبر: 56 أم 65؟', options: ['56', '65', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '65 > 56 لأن عشرات 65 (6) أكبر من عشرات 56 (5)' },
  { id: 'Q2-009', grade: 2, semester: 1, skillId: 'G2-N-008', questionText: 'قرّب العدد 47 إلى أقرب عشرة', options: ['40', '50', '45', '47'], correctAnswer: 1, difficulty: 'medium', explanation: '47 أقرب إلى 50 لأن آحاده (7) أكبر من 5' },
  { id: 'Q2-010', grade: 2, semester: 1, skillId: 'G2-N-008', questionText: 'قرّب العدد 32 إلى أقرب عشرة', options: ['30', '40', '35', '32'], correctAnswer: 0, difficulty: 'medium', explanation: '32 أقرب إلى 30 لأن آحاده (2) أقل من 5' },
  { id: 'Q2-011', grade: 2, semester: 1, skillId: 'G2-N-009', questionText: 'ما الزوج العددي للعدد 20: إذا كان أحدهما 8؟', options: ['10', '12', '14', '8'], correctAnswer: 1, difficulty: 'medium', explanation: '8 + 12 = 20، إذن الزوج هو 12' },
  { id: 'Q2-012', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: 'ما ناتج 9 + 7؟', options: ['15', '16', '17', '14'], correctAnswer: 1, difficulty: 'easy', explanation: '9 + 7 = 16' },
  { id: 'Q2-013', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: 'ما ناتج 15 - 8؟', options: ['6', '7', '8', '9'], correctAnswer: 1, difficulty: 'medium', explanation: '15 - 8 = 7' },
  { id: 'Q2-014', grade: 2, semester: 1, skillId: 'G2-C-005', questionText: 'إذا كان 7 + 8 = 15، فما ناتج 15 - 7؟', options: ['7', '8', '9', '6'], correctAnswer: 1, difficulty: 'medium', explanation: 'من عائلة الحقائق: 7 + 8 = 15، إذن 15 - 7 = 8' },
  { id: 'Q2-015', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: 'مصفوفة فيها 3 صفوف و 4 أعمدة. كم العدد الكلي؟', options: ['7', '10', '12', '14'], correctAnswer: 2, difficulty: 'medium', explanation: '3 × 4 = 12' },
  { id: 'Q2-016', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'كم ضلعاً للمستطيل؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: 'المستطيل له 4 أضلاع' },
  { id: 'Q2-017', grade: 2, semester: 1, skillId: 'G2-G-002', questionText: 'أي مجسم يشبه كرة القدم؟', options: ['مكعب', 'كرة', 'مخروط', 'أسطوانة'], correctAnswer: 1, difficulty: 'easy', explanation: 'كرة القدم تشبه الكرة (المجسم الكروي)' },
  { id: 'Q2-018', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'ما وحدة قياس الطول؟', options: ['كيلوغرام', 'لتر', 'سنتيمتر', 'ساعة'], correctAnswer: 2, difficulty: 'easy', explanation: 'السنتيمتر هو وحدة قياس الطول' },

  // ===== Grade 2 - Semester 2 =====
  { id: 'Q2-019', grade: 2, semester: 2, skillId: 'G2-N-010', questionText: 'ما الزوج العددي للعدد 100: إذا كان أحدهما 40؟', options: ['50', '60', '70', '80'], correctAnswer: 1, difficulty: 'medium', explanation: '40 + 60 = 100' },
  { id: 'Q2-020', grade: 2, semester: 2, skillId: 'G2-N-011', questionText: 'ما ضعف العدد 15؟', options: ['25', '30', '35', '20'], correctAnswer: 1, difficulty: 'easy', explanation: 'ضعف 15 = 15 + 15 = 30' },
  { id: 'Q2-021', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: 'ما ناتج 35 + 20؟', options: ['45', '55', '50', '65'], correctAnswer: 1, difficulty: 'easy', explanation: '35 + 20 = 55' },
  { id: 'Q2-022', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: 'ما ناتج 48 + 30؟', options: ['68', '78', '58', '88'], correctAnswer: 1, difficulty: 'medium', explanation: '48 + 30 = 78' },
  { id: 'Q2-023', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: 'ما ناتج 80 - 30؟', options: ['40', '50', '60', '70'], correctAnswer: 1, difficulty: 'easy', explanation: '80 - 30 = 50' },
  { id: 'Q2-024', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: 'ما ناتج 95 - 40؟', options: ['45', '55', '65', '50'], correctAnswer: 1, difficulty: 'medium', explanation: '95 - 40 = 55' },
  { id: 'Q2-025', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: 'ما الفرق بين 18 و 12؟', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', explanation: '18 - 12 = 6' },
  { id: 'Q2-026', grade: 2, semester: 2, skillId: 'G2-G-003', questionText: 'أي شكل له خط تماثل واحد على الأقل؟', options: ['مثلث متساوي الأضلاع', 'شكل عشوائي', 'خط مستقيم', 'نقطة'], correctAnswer: 0, difficulty: 'medium', explanation: 'المثلث متساوي الأضلاع له 3 خطوط تماثل' },
  { id: 'Q2-027', grade: 2, semester: 2, skillId: 'G2-M-002', questionText: 'ما وحدة قياس الكتلة؟', options: ['سنتيمتر', 'لتر', 'غرام', 'ثانية'], correctAnswer: 2, difficulty: 'easy', explanation: 'الغرام هو وحدة قياس الكتلة' },
  { id: 'Q2-028', grade: 2, semester: 2, skillId: 'G2-M-003', questionText: 'كم دقيقة في الساعة الواحدة؟', options: ['30', '45', '60', '100'], correctAnswer: 2, difficulty: 'easy', explanation: 'الساعة الواحدة = 60 دقيقة' },
  { id: 'Q2-029', grade: 2, semester: 2, skillId: 'G2-M-004', questionText: 'إذا كان لديك ورقة 5 ريالات وورقة ريال واحد، كم المجموع؟', options: ['5 ريالات', '6 ريالات', '7 ريالات', '10 ريالات'], correctAnswer: 1, difficulty: 'easy', explanation: '5 + 1 = 6 ريالات' },
  { id: 'Q2-043', grade: 2, semester: 1, skillId: 'G2-T-001', questionText: 'انظر إلى الساعة. كم دقيقة مرت بعد الساعة 3؟', options: ['5 دقائق', '10 دقائق', '15 دقيقة', '30 دقيقة'], correctAnswer: 2, difficulty: 'easy', explanation: '3:15 تعني مرور 15 دقيقة بعد الساعة 3', visualType: 'analog-clock', visualData: { hours: 3, minutes: 15 } },
  { id: 'Q2-044', grade: 2, semester: 1, skillId: 'G2-T-001', questionText: 'انظر إلى الساعة. أين يشير عقرب الدقائق؟', options: ['على الرقم 3', 'على الرقم 6', 'على الرقم 9', 'على الرقم 12'], correctAnswer: 2, difficulty: 'medium', explanation: 'عند 45 دقيقة يشير عقرب الدقائق إلى الرقم 9', visualType: 'analog-clock', visualData: { hours: 5, minutes: 45 } },
  { id: 'Q2-045', grade: 2, semester: 1, skillId: 'G2-T-002', questionText: 'بدأ الدرس الساعة 8 وانتهى الساعة 9. كم استغرق؟', options: ['30 دقيقة', '45 دقيقة', '60 دقيقة', '90 دقيقة'], correctAnswer: 2, difficulty: 'easy', explanation: 'من الساعة 8 إلى 9 = ساعة واحدة = 60 دقيقة' },
  { id: 'Q2-046', grade: 2, semester: 1, skillId: 'G2-T-002', questionText: 'بدأ اللعب الساعة 4:00 وانتهى 4:30. كم دقيقة لعب؟', options: ['15 دقيقة', '20 دقيقة', '30 دقيقة', '45 دقيقة'], correctAnswer: 2, difficulty: 'easy', explanation: 'من 4:00 إلى 4:30 = 30 دقيقة' },
  { id: 'Q2-047', grade: 2, semester: 1, skillId: 'G2-T-003', questionText: 'اشتريت كتاباً بـ 3 ريالات وقلماً بـ 2 ريال. كم دفعت؟', options: ['4 ريالات', '5 ريالات', '6 ريالات', '7 ريالات'], correctAnswer: 1, difficulty: 'easy', explanation: '3 + 2 = 5 ريالات', visualType: 'coins', visualData: { coins: [{ value: 3, label: '٣', count: 1 }, { value: 2, label: '٢', count: 1 }], currency: 'ر.ع' } },
  { id: 'Q2-048', grade: 2, semester: 1, skillId: 'G2-T-003', questionText: 'لديك هذه النقود واشتريت لعبة بـ 7 ريالات. كم الباقي؟', options: ['2 ريال', '3 ريالات', '4 ريالات', '5 ريالات'], correctAnswer: 1, difficulty: 'medium', explanation: '10 - 7 = 3 ريالات', visualType: 'coins', visualData: { coins: [{ value: 5, label: '٥', count: 2 }], currency: 'ر.ع' } },
  { id: 'Q2-049', grade: 2, semester: 1, skillId: 'G2-T-004', questionText: 'قلم بـ 2 ريال ودفتر بـ 5 ريالات. أيهما أغلى؟', options: ['القلم', 'الدفتر', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الدفتر (5 ريالات) أغلى من القلم (2 ريال)', visualType: 'coins', visualData: { coins: [{ value: 2, label: 'قلم ٢', count: 1 }, { value: 5, label: 'دفتر ٥', count: 1 }], currency: 'ر.ع' } },
  { id: 'Q2-050', grade: 2, semester: 1, skillId: 'G2-T-004', questionText: 'تفاحة بـ 200 بيسة وبرتقالة بـ 300 بيسة. كم الفرق؟', options: ['50 بيسة', '100 بيسة', '200 بيسة', '500 بيسة'], correctAnswer: 1, difficulty: 'medium', explanation: '300 - 200 = 100 بيسة' },
  { id: 'Q2-030', grade: 2, semester: 2, skillId: 'G2-D-001', questionText: 'في رسم بياني: التفاح=5، البرتقال=3، الموز=7. أي فاكهة الأكثر؟', options: ['التفاح', 'البرتقال', 'الموز', 'متساوية'], correctAnswer: 2, difficulty: 'easy', explanation: 'الموز (7) هو الأكثر عدداً' },
  { id: 'Q2-031', grade: 2, semester: 2, skillId: 'G2-D-002', questionText: 'إذا كان عدد الأولاد 12 وعدد البنات 15، من الأكثر؟', options: ['الأولاد', 'البنات', 'متساوون', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '15 > 12، إذن البنات أكثر' },
  { id: 'Q2-032', grade: 2, semester: 2, skillId: 'G2-D-003', questionText: 'كم مكعباً نحتاج لتمثيل العدد 4؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: 'نحتاج 4 مكعبات لتمثيل العدد 4' },
  { id: 'Q2-033', grade: 2, semester: 2, skillId: 'G2-N-012', questionText: 'أكمل العد بالثلاثات: 3، 6، 9، __', options: ['10', '11', '12', '15'], correctAnswer: 2, difficulty: 'easy', explanation: 'العد بالثلاثات: 3، 6، 9، 12' },
  { id: 'Q2-034', grade: 2, semester: 2, skillId: 'G2-N-012', questionText: 'كم عجلة في 4 دراجات ثلاثية العجلات؟', options: ['9', '12', '15', '8'], correctAnswer: 1, difficulty: 'medium', explanation: '4 × 3 = 12 عجلة' },
  { id: 'Q2-035', grade: 2, semester: 2, skillId: 'G2-N-013', questionText: 'أكمل العد بالأربعات: 4، 8، 12، __', options: ['14', '15', '16', '20'], correctAnswer: 2, difficulty: 'easy', explanation: 'العد بالأربعات: 4، 8، 12، 16' },
  { id: 'Q2-036', grade: 2, semester: 2, skillId: 'G2-N-013', questionText: 'كم عجلة في 3 سيارات؟', options: ['8', '10', '12', '16'], correctAnswer: 2, difficulty: 'medium', explanation: '3 × 4 = 12 عجلة' },
  { id: 'Q2-037', grade: 2, semester: 2, skillId: 'G2-A-002', questionText: 'صينية فيها 3 صفوف و 5 كعكات في كل صف. كم كعكة؟', options: ['8', '12', '15', '20'], correctAnswer: 2, difficulty: 'medium', explanation: '3 × 5 = 15 كعكة' },
  { id: 'Q2-038', grade: 2, semester: 2, skillId: 'G2-G-004', questionText: 'كم ضلعاً للمضلع السداسي؟', options: ['5', '6', '7', '8'], correctAnswer: 1, difficulty: 'easy', explanation: 'المضلع السداسي له 6 أضلاع' },
  { id: 'Q2-039', grade: 2, semester: 2, skillId: 'G2-G-005', questionText: 'ربع دورة باتجاه عقارب الساعة من الشمال تصل إلى:', options: ['الجنوب', 'الشرق', 'الغرب', 'الشمال'], correctAnswer: 1, difficulty: 'medium', explanation: 'ربع دورة باتجاه عقارب الساعة من الشمال = الشرق' },
  { id: 'Q2-040', grade: 2, semester: 2, skillId: 'G2-M-005', questionText: 'أيهما أكثر سعة: الكوب أم الدلو؟', options: ['الكوب', 'الدلو', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الدلو أكثر سعة من الكوب (الدلو يتسع لأكثر من لتر)' },
  { id: 'Q2-041', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ما ربع العدد 8؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'medium', explanation: 'ربع 8 = 8 ÷ 4 = 2' },
  { id: 'Q2-042', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ما نصف العدد 10؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'نصف 10 = 10 ÷ 2 = 5' },
];

// Initial student progress (all not started)
export const getInitialProgress = (): StudentSkillProgress[] => {
  const allSkills = getAllSkillsWithPrereqs();
  return allSkills.map(skill => ({
    skillId: skill.id,
    attempts: 0,
    correctCount: 0,
    lastScore: 0,
    lastAttemptDate: '',
    status: 'not_started' as const,
    history: [],
    avgResponseTime: undefined,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
  }));
};

// Demo progress with some skills started
export const getDemoProgress = (): StudentSkillProgress[] => {
  const progress = getInitialProgress();
  const demoUpdates: Record<string, Partial<StudentSkillProgress>> = {
    'G1-N-001': { attempts: 5, correctCount: 5, lastScore: 100, status: 'mastered', consecutiveCorrect: 5, consecutiveWrong: 0, history: [{ date: '2026-05-15', score: 80, difficulty: 'easy' }, { date: '2026-05-16', score: 100, difficulty: 'medium' }] },
    'G1-N-002': { attempts: 4, correctCount: 4, lastScore: 100, status: 'mastered', consecutiveCorrect: 4, consecutiveWrong: 0, history: [{ date: '2026-05-15', score: 90, difficulty: 'easy' }, { date: '2026-05-17', score: 100, difficulty: 'medium' }] },
    'G1-N-003': { attempts: 3, correctCount: 3, lastScore: 90, status: 'mastered', consecutiveCorrect: 3, consecutiveWrong: 0, history: [{ date: '2026-05-16', score: 90, difficulty: 'easy' }] },
    'G1-N-004': { attempts: 3, correctCount: 2, lastScore: 75, status: 'good', consecutiveCorrect: 2, consecutiveWrong: 0, history: [{ date: '2026-05-17', score: 75, difficulty: 'medium' }] },
    'G1-N-005': { attempts: 4, correctCount: 3, lastScore: 80, status: 'good', consecutiveCorrect: 2, consecutiveWrong: 0, history: [{ date: '2026-05-16', score: 60, difficulty: 'easy' }, { date: '2026-05-18', score: 80, difficulty: 'medium' }] },
    'G1-N-006': { attempts: 2, correctCount: 1, lastScore: 50, status: 'developing', consecutiveCorrect: 0, consecutiveWrong: 1, history: [{ date: '2026-05-18', score: 50, difficulty: 'easy' }] },
    'G1-N-007': { attempts: 1, correctCount: 0, lastScore: 30, status: 'needs_practice', consecutiveCorrect: 0, consecutiveWrong: 1, history: [{ date: '2026-05-18', score: 30, difficulty: 'easy' }] },
    'G1-N-008': { attempts: 2, correctCount: 1, lastScore: 60, status: 'developing', consecutiveCorrect: 1, consecutiveWrong: 0, history: [{ date: '2026-05-17', score: 60, difficulty: 'easy' }] },
    'G1-N-014': { attempts: 3, correctCount: 2, lastScore: 70, status: 'good', consecutiveCorrect: 2, consecutiveWrong: 0, history: [{ date: '2026-05-17', score: 70, difficulty: 'medium' }] },
    'G1-N-015': { attempts: 2, correctCount: 2, lastScore: 85, status: 'good', consecutiveCorrect: 2, consecutiveWrong: 0, history: [{ date: '2026-05-18', score: 85, difficulty: 'medium' }] },
    'G1-N-017': { attempts: 1, correctCount: 1, lastScore: 65, status: 'developing', consecutiveCorrect: 1, consecutiveWrong: 0, history: [{ date: '2026-05-18', score: 65, difficulty: 'easy' }] },
    'G1-G-001': { attempts: 3, correctCount: 3, lastScore: 95, status: 'mastered', consecutiveCorrect: 3, consecutiveWrong: 0, history: [{ date: '2026-05-15', score: 95, difficulty: 'medium' }] },
    'G1-G-004': { attempts: 2, correctCount: 1, lastScore: 55, status: 'developing', consecutiveCorrect: 0, consecutiveWrong: 1, history: [{ date: '2026-05-17', score: 55, difficulty: 'easy' }] },
    'G1-M-001': { attempts: 2, correctCount: 2, lastScore: 80, status: 'good', consecutiveCorrect: 2, consecutiveWrong: 0, history: [{ date: '2026-05-18', score: 80, difficulty: 'medium' }] },
    'G1-T-001': { attempts: 1, correctCount: 1, lastScore: 70, status: 'good', consecutiveCorrect: 1, consecutiveWrong: 0, history: [{ date: '2026-05-18', score: 70, difficulty: 'easy' }] },
    'G1-T-002': { attempts: 2, correctCount: 1, lastScore: 60, status: 'developing', consecutiveCorrect: 0, consecutiveWrong: 1, history: [{ date: '2026-05-17', score: 60, difficulty: 'easy' }] },
    'G2-N-001': { attempts: 3, correctCount: 2, lastScore: 70, status: 'good', consecutiveCorrect: 1, consecutiveWrong: 0, history: [{ date: '2026-05-18', score: 70, difficulty: 'medium' }] },
    'G2-N-002': { attempts: 2, correctCount: 1, lastScore: 55, status: 'developing', consecutiveCorrect: 0, consecutiveWrong: 1, history: [{ date: '2026-05-18', score: 55, difficulty: 'easy' }] },
    'G2-N-003': { attempts: 3, correctCount: 3, lastScore: 90, status: 'mastered', consecutiveCorrect: 3, consecutiveWrong: 0, history: [{ date: '2026-05-17', score: 90, difficulty: 'medium' }] },
    'G2-N-007': { attempts: 2, correctCount: 1, lastScore: 50, status: 'developing', consecutiveCorrect: 0, consecutiveWrong: 1, history: [{ date: '2026-05-18', score: 50, difficulty: 'easy' }] },
    'G2-C-001': { attempts: 2, correctCount: 2, lastScore: 85, status: 'good', consecutiveCorrect: 2, consecutiveWrong: 0, history: [{ date: '2026-05-18', score: 85, difficulty: 'medium' }] },
    'G2-G-001': { attempts: 1, correctCount: 1, lastScore: 75, status: 'good', consecutiveCorrect: 1, consecutiveWrong: 0, history: [{ date: '2026-05-18', score: 75, difficulty: 'easy' }] },
  };

  return progress.map(p => {
    const update = demoUpdates[p.skillId];
    if (update) {
      return { ...p, ...update, lastAttemptDate: '2026-05-18' } as StudentSkillProgress;
    }
    return p;
  });
};

// Get all skills including additional ones, with prerequisites applied
export function getAllSkillsWithPrereqs(): Skill[] {
  const baseWithPrereqs = skills.map(s => ({
    ...s,
    prerequisites: skillPrerequisites[s.id] || [],
  }));
  return [...baseWithPrereqs, ...additionalSkills.map(s => ({ ...s, prerequisites: skillPrerequisites[s.id] || s.prerequisites }))];
}

// Get all questions including additional ones, sprint questions, and content intelligence questions
export function getAllQuestions(): Question[] {
  return [...questions, ...additionalQuestions, ...expansionQuestions, ...sprintQuestions, ...contentIntelligenceQuestions];
}

// Get questions for a specific skill
export function getQuestionsForSkill(skillId: string): Question[] {
  return getAllQuestions().filter(q => q.skillId === skillId);
}

// Get questions by difficulty for adaptive quizzing
export function getAdaptiveQuestions(skillId: string, currentMastery: number): Question[] {
  const skillQuestions = getQuestionsForSkill(skillId);
  let targetDifficulty: 'easy' | 'medium' | 'hard';
  
  if (currentMastery < 40) targetDifficulty = 'easy';
  else if (currentMastery < 70) targetDifficulty = 'medium';
  else targetDifficulty = 'hard';
  
  // Prioritize target difficulty but include some variety
  const primary = skillQuestions.filter(q => q.difficulty === targetDifficulty);
  const secondary = skillQuestions.filter(q => q.difficulty !== targetDifficulty);
  
  return [...primary, ...secondary.slice(0, 2)];
}