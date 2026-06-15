// Complete Oman Curriculum Data Structure
// Used by seed script and admin dashboard for curriculum management

export interface SubjectDefinition {
  name: string;
  name_en: string;
  gradeFrom: number;
  gradeTo: number;
  icon: string;
  description: string;
  displayOrder: number;
}

export interface GradeDefinition {
  name: string;
  displayOrder: number;
}

export interface SemesterDefinition {
  name: string;
}

// Country
export const OMAN_COUNTRY = {
  id: 1,
  name_ar: 'سلطنة عمان',
  name_en: 'Oman',
  code: 'OM',
  flag_emoji: '🇴🇲',
  is_active: true,
  display_order: 1,
};

// Curriculum
export const OMAN_CURRICULUM = {
  id: 1,
  country_id: 1,
  name_ar: 'المنهج العماني',
  name_en: 'Oman National Curriculum',
  academic_year: '2025-2026',
  is_active: true,
  display_order: 1,
};

// 12 Grades
export const OMAN_GRADES: GradeDefinition[] = [
  { name: 'الصف الأول', displayOrder: 1 },
  { name: 'الصف الثاني', displayOrder: 2 },
  { name: 'الصف الثالث', displayOrder: 3 },
  { name: 'الصف الرابع', displayOrder: 4 },
  { name: 'الصف الخامس', displayOrder: 5 },
  { name: 'الصف السادس', displayOrder: 6 },
  { name: 'الصف السابع', displayOrder: 7 },
  { name: 'الصف الثامن', displayOrder: 8 },
  { name: 'الصف التاسع', displayOrder: 9 },
  { name: 'الصف العاشر', displayOrder: 10 },
  { name: 'الصف الحادي عشر', displayOrder: 11 },
  { name: 'الصف الثاني عشر', displayOrder: 12 },
];

// 2 Semesters per grade
export const OMAN_SEMESTERS: SemesterDefinition[] = [
  { name: 'الفصل الأول' },
  { name: 'الفصل الثاني' },
];

// 14 Subject Entries (Math splits at Grades 11-12)
// Corrected grade-subject rules per Oman National Curriculum
export const OMAN_SUBJECTS: SubjectDefinition[] = [
  {
    name: 'الرياضيات',
    name_en: 'Mathematics',
    gradeFrom: 1,
    gradeTo: 10,
    icon: '📐',
    description: 'مادة الرياضيات - تطوير المهارات الحسابية والتفكير المنطقي',
    displayOrder: 1,
  },
  {
    name: 'الرياضيات الأساسية',
    name_en: 'Basic Mathematics',
    gradeFrom: 11,
    gradeTo: 12,
    icon: '📐',
    description: 'مادة الرياضيات الأساسية - المفاهيم الرياضية الأساسية للصفوف العليا',
    displayOrder: 2,
  },
  {
    name: 'الرياضيات المتقدمة',
    name_en: 'Advanced Mathematics',
    gradeFrom: 11,
    gradeTo: 12,
    icon: '📊',
    description: 'مادة الرياضيات المتقدمة - التفاضل والتكامل والجبر المتقدم',
    displayOrder: 3,
  },
  {
    name: 'اللغة العربية',
    name_en: 'Arabic Language',
    gradeFrom: 1,
    gradeTo: 12,
    icon: '📖',
    description: 'مادة اللغة العربية - القراءة والكتابة والتعبير',
    displayOrder: 4,
  },
  {
    name: 'اللغة الإنجليزية',
    name_en: 'English Language',
    gradeFrom: 1,
    gradeTo: 12,
    icon: '🔤',
    description: 'مادة اللغة الإنجليزية - مهارات التواصل باللغة الإنجليزية',
    displayOrder: 5,
  },
  {
    name: 'العلوم',
    name_en: 'Science',
    gradeFrom: 1,
    gradeTo: 8,
    icon: '🔬',
    description: 'مادة العلوم - استكشاف الطبيعة والتجارب العلمية',
    displayOrder: 6,
  },
  {
    name: 'الفيزياء',
    name_en: 'Physics',
    gradeFrom: 9,
    gradeTo: 12,
    icon: '⚛️',
    description: 'مادة الفيزياء - القوانين الفيزيائية والميكانيكا والكهرباء',
    displayOrder: 7,
  },
  {
    name: 'الكيمياء',
    name_en: 'Chemistry',
    gradeFrom: 9,
    gradeTo: 12,
    icon: '🧪',
    description: 'مادة الكيمياء - العناصر والتفاعلات الكيميائية',
    displayOrder: 8,
  },
  {
    name: 'الأحياء',
    name_en: 'Biology',
    gradeFrom: 9,
    gradeTo: 12,
    icon: '🧬',
    description: 'مادة الأحياء - الكائنات الحية والأنظمة البيولوجية',
    displayOrder: 9,
  },
  {
    name: 'التربية الإسلامية',
    name_en: 'Islamic Education',
    gradeFrom: 1,
    gradeTo: 12,
    icon: '🕌',
    description: 'مادة التربية الإسلامية - القرآن والسيرة والفقه',
    displayOrder: 10,
  },
  {
    name: 'الدراسات الاجتماعية',
    name_en: 'Social Studies',
    gradeFrom: 5,
    gradeTo: 10,
    icon: '🌍',
    description: 'مادة الدراسات الاجتماعية - التاريخ والجغرافيا والمجتمع',
    displayOrder: 11,
  },
  {
    name: 'هذا وطني',
    name_en: 'This Is My Homeland',
    gradeFrom: 11,
    gradeTo: 12,
    icon: '🇴🇲',
    description: 'مادة هذا وطني - التعريف بسلطنة عمان وتاريخها ومؤسساتها',
    displayOrder: 12,
  },
  {
    name: 'التاريخ',
    name_en: 'History',
    gradeFrom: 11,
    gradeTo: 12,
    icon: '📜',
    description: 'مادة التاريخ - الحضارات والأحداث التاريخية',
    displayOrder: 13,
  },
  {
    name: 'العلوم البيئية',
    name_en: 'Environmental Science',
    gradeFrom: 11,
    gradeTo: 12,
    icon: '🌱',
    description: 'مادة العلوم البيئية - البيئة والتنمية المستدامة',
    displayOrder: 14,
  },
  {
    name: 'الجغرافيا والتقنيات الحديثة',
    name_en: 'Geography and Modern Technologies',
    gradeFrom: 12,
    gradeTo: 12,
    icon: '🗺️',
    description: 'مادة الجغرافيا والتقنيات الحديثة - نظم المعلومات الجغرافية والتقنيات المعاصرة',
    displayOrder: 15,
  },
];

// Helper: Get subjects for a specific grade number
export function getSubjectsForGrade(gradeNumber: number): SubjectDefinition[] {
  return OMAN_SUBJECTS.filter(
    (s) => gradeNumber >= s.gradeFrom && gradeNumber <= s.gradeTo
  );
}

// Helper: Get grade name by number
export function getGradeName(gradeNumber: number): string {
  return OMAN_GRADES[gradeNumber - 1]?.name || `الصف ${gradeNumber}`;
}

// Summary stats
export const OMAN_CURRICULUM_STATS = {
  totalGrades: 12,
  totalSemesters: 24,
  totalSubjects: 15, // 15 entries: Math(1-10) + Basic Math(11-12) + Adv Math(11-12) + 12 others
  academicYear: '2025-2026',
};