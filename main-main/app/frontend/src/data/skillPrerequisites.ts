// Skill Prerequisites Map - defines dependency tree for all skills
// Each skill maps to an array of prerequisite skill IDs

export const skillPrerequisites: Record<string, string[]> = {
  // ===== Grade 1 - Semester 1 =====
  'G1-N-001': [], // العد من 1 إلى 5 - foundation skill
  'G1-N-002': ['G1-N-001'], // العد من 1 إلى 10
  'G1-N-003': ['G1-N-002'], // قراءة الأعداد حتى 10
  'G1-N-004': ['G1-N-003'], // كتابة الأعداد حتى 10
  'G1-N-005': ['G1-N-002'], // مطابقة العدد بالكمية
  'G1-N-006': ['G1-N-005'], // المقارنة بين الكميات
  'G1-N-007': ['G1-N-002'], // معرفة الصفر
  'G1-N-008': ['G1-N-002'], // أكثر بواحد
  'G1-N-009': ['G1-N-008'], // أقل بواحد
  'G1-N-010': ['G1-N-001'], // تكوين العدد 5
  'G1-N-011': ['G1-N-010', 'G1-N-002'], // تكوين العدد 10
  'G1-N-014': ['G1-N-002'], // الأعداد من 11 إلى 20
  'G1-N-015': ['G1-N-002'], // الضعف
  'G1-N-016': ['G1-N-002'], // التقدير والعد المنظم
  'G1-N-017': ['G1-N-002'], // الأعداد الزوجية والفردية
  'G1-G-001': [], // التعرف على الأشكال البسيطة - foundation
  'G1-G-002': ['G1-G-001'], // بناء الأشكال وتصنيفها
  'G1-G-004': ['G1-G-001'], // المجسمات ثلاثية الأبعاد
  'G1-P-001': [], // استكمال النمط - foundation
  'G1-M-001': ['G1-N-006'], // مقارنة الأطوال
  'G1-M-002': ['G1-N-006'], // مقارنة السعة
  'G1-M-003': ['G1-N-006'], // مقارنة الوزن
  'G1-T-001': ['G1-N-002'], // قراءة الوقت بالساعة
  'G1-T-002': ['G1-N-002'], // التعرف على النقود العمانية
  'G1-T-005': ['G1-T-001'], // قراءة الوقت بالنصف ساعة
  'G1-T-006': ['G1-T-002', 'G1-N-010'], // جمع النقود البسيطة
  'G1-D-001': ['G1-N-002'], // عد وتسجيل بيانات بسيطة

  // ===== Grade 1 - Semester 2 =====
  'G1-N-012': ['G1-N-011', 'G1-N-002'], // الجمع ضمن 10
  'G1-N-013': ['G1-N-012', 'G1-N-009'], // الطرح ضمن 10
  'G1-N-018': ['G1-N-012'], // الجمع على خط الأعداد
  'G1-N-019': ['G1-N-011'], // العدد المكمل للعشرة
  'G1-N-020': ['G1-N-015', 'G1-N-012'], // الضعف والنصف
  'G1-N-021': ['G1-N-014'], // العشرات والآحاد
  'G1-N-022': ['G1-N-021'], // العد بالعشرات حتى 100
  'G1-G-003': ['G1-G-001', 'G1-N-002'], // عد الأشكال
  'G1-G-005': ['G1-G-001'], // التماثل في الأشكال
  'G1-T-003': [], // أيام الأسبوع - foundation
  'G1-T-004': ['G1-T-003'], // أشهر السنة
  'G1-D-002': ['G1-D-001'], // قراءة مخطط الصور والمكعبات
  'G1-D-003': ['G1-D-001'], // التصنيف باستخدام مخطط فن

  // ===== Grade 2 - Semester 1 =====
  'G2-N-001': ['G1-N-021', 'G1-N-022'], // قراءة الأعداد حتى 100
  'G2-N-002': ['G2-N-001'], // استخدام لوحة المائة
  'G2-N-003': ['G1-N-017', 'G2-N-001'], // العد بالاثنينات
  'G2-N-004': ['G2-N-001'], // العد بالخمسات
  'G2-N-005': ['G1-N-022'], // العد بالعشرات
  'G2-N-006': ['G2-N-001'], // ترتيب الأعداد حتى 100
  'G2-N-007': ['G2-N-006'], // مقارنة الأعداد حتى 100
  'G2-N-008': ['G2-N-001', 'G2-N-005'], // التقريب إلى أقرب عشرة
  'G2-N-009': ['G1-N-011', 'G1-N-012'], // الأزواج العددية للعدد 20
  'G2-N-010': ['G2-N-009', 'G2-N-005'], // الأزواج العددية حتى 100
  'G2-C-001': ['G1-N-012', 'G1-N-014'], // الجمع ضمن 20
  'G2-C-002': ['G1-N-013', 'G2-C-001'], // الطرح ضمن 20
  'G2-C-005': ['G2-C-001', 'G2-C-002'], // عائلة الحقائق
  'G2-A-001': ['G2-N-003'], // فهم المصفوفات
  'G2-G-001': ['G1-G-001'], // التعرف على الأشكال ثنائية الأبعاد
  'G2-G-002': ['G1-G-004'], // التعرف على المجسمات
  'G2-G-003': ['G1-G-005'], // التماثل
  'G2-M-001': ['G1-M-001'], // قياس الطول بالسنتيمتر
  'G2-M-002': ['G1-M-003'], // قياس الكتلة بالغرام
  'G2-M-003': ['G1-T-001', 'G1-T-005'], // قياس الوقت
  'G2-M-004': ['G1-T-006'], // النقود
  'G2-T-001': ['G2-M-003'], // قراءة الوقت بالدقائق
  'G2-T-002': ['G2-T-001'], // حساب الفترة الزمنية
  'G2-T-003': ['G2-M-004', 'G2-C-001'], // جمع وطرح النقود
  'G2-T-004': ['G2-T-003', 'G2-N-007'], // مقارنة الأسعار

  // ===== Grade 2 - Semester 2 =====
  'G2-N-011': ['G1-N-015', 'G2-C-001'], // الضعف
  'G2-N-012': ['G2-N-003'], // العد بالثلاثات
  'G2-N-013': ['G2-N-003'], // العد بالأربعات
  'G2-C-003': ['G2-C-001', 'G2-N-001'], // الجمع ضمن 100
  'G2-C-004': ['G2-C-002', 'G2-C-003'], // الطرح ضمن 100
  'G2-C-006': ['G2-C-004'], // الفرق بين عددين
  'G2-A-002': ['G2-A-001'], // الضرب باستخدام المصفوفات
  'G2-G-004': ['G2-G-001'], // المضلعات المتقدمة
  'G2-G-005': ['G2-G-001'], // الدوران والحركة
  'G2-M-005': ['G1-M-002'], // قياس السعة باللتر
  'G2-D-001': ['G1-D-002'], // قراءة البيانات المصورة
  'G2-D-002': ['G2-D-001', 'G2-N-007'], // مقارنة البيانات
  'G2-D-003': ['G2-D-001'], // التمثيل بالمكعبات أو الصور
  'G2-F-001': ['G1-N-020'], // الكسور: النصف والربع

  // ===== Additional Skills =====
  'G1-N-023': ['G1-N-006'], // ترتيب الأعداد حتى 10
  'G1-N-024': ['G1-N-002', 'G1-N-008'], // العدد المفقود في التسلسل
  'G1-N-025': ['G1-N-012', 'G1-N-013'], // العدد المفقود في المعادلة
  'G1-N-026': ['G1-N-012', 'G1-N-013'], // قصص الجمع والطرح (مسائل كلامية)
  'G1-N-027': ['G1-N-021', 'G1-N-012'], // إضافة/طرح 1 أو 10 (مصنع الأعداد)
  'G1-P-002': ['G1-P-001'], // إنشاء نمط جديد
  'G1-T-007': ['G1-T-003'], // ترتيب أحداث اليوم
  'G1-M-004': ['G1-M-003'], // القياس بالميزان (تساوي الأوزان)
  'G1-D-004': ['G1-D-003'], // مخطط كارول
  'G2-N-014': ['G1-N-021', 'G2-N-001'], // القيمة المكانية (عشرات وآحاد)
  'G2-N-015': ['G2-N-011', 'G1-N-020'], // النصف
  'G2-N-016': ['G1-N-017', 'G2-N-001'], // الأعداد الزوجية والفردية (الصف الثاني)
  'G2-C-007': ['G2-C-001', 'G1-N-019'], // الجمع بالتجميع (عبور العشرة)
  'G2-C-008': ['G2-C-003', 'G2-C-004'], // مسائل كلامية (جمع وطرح)
  'G2-C-009': ['G2-C-005'], // التساوي/التكافؤ (آلة التساوي)
  'G2-A-003': ['G2-A-002', 'G2-N-003', 'G2-N-004'], // الضرب في 2 و 5 و 10
  'G2-G-006': ['G2-G-005'], // الموقع والاتجاه
  'G2-M-006': ['G2-M-001'], // قياس الطول بالمتر
  'G2-F-002': ['G2-F-001'], // الكسور: ثلاثة أرباع
  'G2-F-003': ['G2-F-001'], // كسور المجموعات
};

// New skills to add to the skills array
export const additionalSkills = [
  { id: 'G1-N-023', name: 'ترتيب الأعداد حتى 10', grade: 1 as const, semester: 1 as const, domain: 'المقارنة والتكوين', curriculumRef: 'الوحدة 2 - ترتيب الأعداد', prerequisites: ['G1-N-006'] },
  { id: 'G1-N-024', name: 'العدد المفقود في التسلسل', grade: 1 as const, semester: 1 as const, domain: 'الأعداد والعد', curriculumRef: 'الوحدة 2 - العدد المفقود', prerequisites: ['G1-N-002', 'G1-N-008'] },
  { id: 'G1-N-025', name: 'العدد المفقود في المعادلة', grade: 1 as const, semester: 2 as const, domain: 'الجمع والطرح', curriculumRef: 'النشاط 23 - العدد المفقود', prerequisites: ['G1-N-012', 'G1-N-013'] },
  { id: 'G1-N-026', name: 'قصص الجمع والطرح', grade: 1 as const, semester: 2 as const, domain: 'الجمع والطرح', curriculumRef: 'النشاط 24 - مسائل كلامية', prerequisites: ['G1-N-012', 'G1-N-013'] },
  { id: 'G1-N-027', name: 'إضافة/طرح 1 أو 10', grade: 1 as const, semester: 2 as const, domain: 'الجمع والطرح', curriculumRef: 'النشاط 20 - مصنع الأعداد', prerequisites: ['G1-N-021', 'G1-N-012'] },
  { id: 'G1-P-002', name: 'إنشاء نمط جديد', grade: 1 as const, semester: 1 as const, domain: 'الأنماط', curriculumRef: 'الوحدة 1 - اصنع نمطاً', prerequisites: ['G1-P-001'] },
  { id: 'G1-T-007', name: 'ترتيب أحداث اليوم', grade: 1 as const, semester: 2 as const, domain: 'الوقت والنقود', curriculumRef: 'النشاط 17 - ترتيب الأحداث', prerequisites: ['G1-T-003'] },
  { id: 'G1-M-004', name: 'القياس بالميزان', grade: 1 as const, semester: 2 as const, domain: 'القياس', curriculumRef: 'النشاط 18 - تساوي الأوزان', prerequisites: ['G1-M-003'] },
  { id: 'G1-D-004', name: 'مخطط كارول', grade: 1 as const, semester: 2 as const, domain: 'البيانات', curriculumRef: 'النشاط 19 - مخطط كارول', prerequisites: ['G1-D-003'] },
  { id: 'G2-N-014', name: 'القيمة المكانية (عشرات وآحاد)', grade: 2 as const, semester: 1 as const, domain: 'الأعداد حتى 100', curriculumRef: 'النشاط 2-2 - القيمة المكانية', prerequisites: ['G1-N-021', 'G2-N-001'] },
  { id: 'G2-N-015', name: 'النصف', grade: 2 as const, semester: 2 as const, domain: 'الأزواج العددية', curriculumRef: 'النشاط 22 - النصف', prerequisites: ['G2-N-011', 'G1-N-020'] },
  { id: 'G2-N-016', name: 'الأعداد الزوجية والفردية (متقدم)', grade: 2 as const, semester: 2 as const, domain: 'الأعداد حتى 100', curriculumRef: 'النشاط 21 - فردي أم زوجي؟', prerequisites: ['G1-N-017', 'G2-N-001'] },
  { id: 'G2-C-007', name: 'الجمع بالتجميع (عبور العشرة)', grade: 2 as const, semester: 1 as const, domain: 'الجمع والطرح', curriculumRef: 'النشاط 6-3 - عبور العشرة', prerequisites: ['G2-C-001', 'G1-N-019'] },
  { id: 'G2-C-008', name: 'مسائل كلامية (جمع وطرح)', grade: 2 as const, semester: 2 as const, domain: 'الجمع والطرح', curriculumRef: 'النشاط 25 - حل المسائل', prerequisites: ['G2-C-003', 'G2-C-004'] },
  { id: 'G2-C-009', name: 'التساوي والتكافؤ', grade: 2 as const, semester: 1 as const, domain: 'الجمع والطرح', curriculumRef: 'النشاط 5-2 - آلة التساوي', prerequisites: ['G2-C-005'] },
  { id: 'G2-A-003', name: 'الضرب في 2 و 5 و 10', grade: 2 as const, semester: 2 as const, domain: 'المصفوفات والضرب', curriculumRef: 'النشاط 26 - جداول الضرب', prerequisites: ['G2-A-002', 'G2-N-003', 'G2-N-004'] },
  { id: 'G2-G-006', name: 'الموقع والاتجاه', grade: 2 as const, semester: 2 as const, domain: 'الأشكال والمجسمات', curriculumRef: 'النشاط 29 - فوق، تحت، يمين، يسار', prerequisites: ['G2-G-005'] },
  { id: 'G2-M-006', name: 'قياس الطول بالمتر', grade: 2 as const, semester: 2 as const, domain: 'القياس', curriculumRef: 'النشاط 20 - المتر', prerequisites: ['G2-M-001'] },
  { id: 'G2-F-002', name: 'الكسور: ثلاثة أرباع', grade: 2 as const, semester: 2 as const, domain: 'الكسور', curriculumRef: 'النشاط 25 - ثلاثة أرباع', prerequisites: ['G2-F-001'] },
  { id: 'G2-F-003', name: 'كسور المجموعات', grade: 2 as const, semester: 2 as const, domain: 'الكسور', curriculumRef: 'النشاط 25 - نصف المجموعة', prerequisites: ['G2-F-001'] },
];

// Helper to get prerequisites for a skill
export function getPrerequisites(skillId: string): string[] {
  return skillPrerequisites[skillId] || [];
}

// Helper to get skills that depend on a given skill
export function getDependents(skillId: string): string[] {
  return Object.entries(skillPrerequisites)
    .filter(([, prereqs]) => prereqs.includes(skillId))
    .map(([id]) => id);
}

// Get the full dependency chain (recursive)
export function getFullPrerequisiteChain(skillId: string, visited = new Set<string>()): string[] {
  if (visited.has(skillId)) return [];
  visited.add(skillId);
  
  const directPrereqs = getPrerequisites(skillId);
  const allPrereqs: string[] = [...directPrereqs];
  
  for (const prereq of directPrereqs) {
    const chain = getFullPrerequisiteChain(prereq, visited);
    for (const id of chain) {
      if (!allPrereqs.includes(id)) {
        allPrereqs.push(id);
      }
    }
  }
  
  return allPrereqs;
}

// Check if a skill is ready to learn (all prerequisites mastered)
export function isSkillReady(skillId: string, masteredSkills: Set<string>): boolean {
  const prereqs = getPrerequisites(skillId);
  return prereqs.every(p => masteredSkills.has(p));
}

// Get recommended next skills based on current mastery
export function getRecommendedNextSkills(masteredSkills: Set<string>, allSkillIds: string[]): string[] {
  return allSkillIds.filter(id => {
    if (masteredSkills.has(id)) return false;
    return isSkillReady(id, masteredSkills);
  });
}

// Diagnose root cause: find unmastered prerequisites causing failure
export function diagnoseWeakness(failedSkillId: string, masteredSkills: Set<string>): { rootCauses: string[]; suggestedPath: string[] } {
  const prereqs = getPrerequisites(failedSkillId);
  const unmasteredPrereqs = prereqs.filter(p => !masteredSkills.has(p));
  
  // Go deeper to find root causes
  const rootCauses: string[] = [];
  const suggestedPath: string[] = [];
  
  for (const prereq of unmasteredPrereqs) {
    const deeperPrereqs = getPrerequisites(prereq);
    const deeperUnmastered = deeperPrereqs.filter(p => !masteredSkills.has(p));
    
    if (deeperUnmastered.length === 0) {
      // This is a root cause - prerequisite not mastered but its own prereqs are fine
      rootCauses.push(prereq);
    } else {
      // Go deeper
      for (const dp of deeperUnmastered) {
        if (!rootCauses.includes(dp)) rootCauses.push(dp);
      }
    }
  }
  
  // Build suggested learning path from root causes to target
  const allNeeded = [...rootCauses, ...unmasteredPrereqs, failedSkillId];
  // Remove duplicates and order by dependency depth
  const uniquePath = [...new Set(allNeeded)];
  suggestedPath.push(...uniquePath);
  
  return { rootCauses: rootCauses.length > 0 ? rootCauses : unmasteredPrereqs, suggestedPath };
}

// Advanced diagnostic: analyze error patterns across multiple skills
export function analyzeErrorPatterns(
  progressMap: Record<string, { attempts: number; correctCount: number; history?: { difficulty: string; score: number }[] }>
): { weakDomains: string[]; commonMistakeTypes: string[]; suggestedFocus: string[] } {
  const domainFailures: Record<string, number> = {};
  const domainAttempts: Record<string, number> = {};
  
  // Map skill IDs to domains
  const skillDomainMap: Record<string, string> = {};
  for (const [skillId] of Object.entries(skillPrerequisites)) {
    // Extract domain from skill ID pattern
    if (skillId.includes('-N-')) skillDomainMap[skillId] = 'الأعداد';
    else if (skillId.includes('-G-')) skillDomainMap[skillId] = 'الهندسة';
    else if (skillId.includes('-M-')) skillDomainMap[skillId] = 'القياس';
    else if (skillId.includes('-T-')) skillDomainMap[skillId] = 'الوقت والنقود';
    else if (skillId.includes('-D-')) skillDomainMap[skillId] = 'البيانات';
    else if (skillId.includes('-P-')) skillDomainMap[skillId] = 'الأنماط';
    else if (skillId.includes('-C-')) skillDomainMap[skillId] = 'العمليات الحسابية';
    else if (skillId.includes('-A-')) skillDomainMap[skillId] = 'الضرب والمصفوفات';
    else if (skillId.includes('-F-')) skillDomainMap[skillId] = 'الكسور';
  }

  for (const [skillId, progress] of Object.entries(progressMap)) {
    if (progress.attempts === 0) continue;
    const domain = skillDomainMap[skillId] || 'أخرى';
    domainAttempts[domain] = (domainAttempts[domain] || 0) + progress.attempts;
    const failures = progress.attempts - progress.correctCount;
    domainFailures[domain] = (domainFailures[domain] || 0) + failures;
  }

  // Find weak domains (>40% failure rate)
  const weakDomains: string[] = [];
  for (const [domain, failures] of Object.entries(domainFailures)) {
    const attempts = domainAttempts[domain] || 1;
    if (failures / attempts > 0.4) {
      weakDomains.push(domain);
    }
  }

  // Analyze common mistake types
  const commonMistakeTypes: string[] = [];
  let hardFailCount = 0;
  let easyFailCount = 0;
  let totalHistoryEntries = 0;

  for (const progress of Object.values(progressMap)) {
    if (progress.history) {
      for (const h of progress.history) {
        totalHistoryEntries++;
        if (h.score < 50) {
          if (h.difficulty === 'hard') hardFailCount++;
          if (h.difficulty === 'easy') easyFailCount++;
        }
      }
    }
  }

  if (totalHistoryEntries > 0) {
    if (easyFailCount / totalHistoryEntries > 0.2) {
      commonMistakeTypes.push('صعوبة في الأساسيات - يحتاج مراجعة المفاهيم الأولية');
    }
    if (hardFailCount / totalHistoryEntries > 0.3) {
      commonMistakeTypes.push('يحتاج تدريب تدريجي على المستويات الأصعب');
    }
  }

  // Suggest focus areas
  const suggestedFocus = weakDomains.slice(0, 3);
  
  return { weakDomains, commonMistakeTypes, suggestedFocus };
}