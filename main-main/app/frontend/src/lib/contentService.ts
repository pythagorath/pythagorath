// Dynamic Content Service - Fetches all educational content from backend
// Multi-country architecture: supports country/curriculum filtering
import { client } from '@/lib/api';

// Country & Curriculum types
export interface Country {
  id: number;
  name_ar: string;
  name_en: string;
  code: string;
  flag_emoji: string;
  is_active: boolean;
  display_order: number;
}

export interface Curriculum {
  id: number;
  country_id: number;
  name_ar: string;
  name_en: string;
  academic_year: string;
  is_active: boolean;
  display_order: number;
}

// Types matching backend schemas
export interface DynamicGrade {
  id: number;
  name: string;
  slug?: string;
  grade_number?: number;
  description?: string;
  display_order?: number;
  status: string;
  country_id?: number;
  curriculum_id?: number;
}

export interface DynamicSemester {
  id: number;
  name: string;
  grade_id: number;
  academic_year?: string;
  display_order?: number;
  status: string;
  country_id?: number;
  curriculum_id?: number;
}

export interface DynamicSubject {
  id: number;
  name: string;
  slug?: string;
  grade_id: number;
  semester_id: number;
  description?: string;
  icon?: string;
  display_order?: number;
  status: string;
  country_id?: number;
  curriculum_id?: number;
}

export interface DynamicUnit {
  id: number;
  name: string;
  subject_id: number;
  display_order?: number;
  description?: string;
  status: string;
  country_id?: number;
  curriculum_id?: number;
}

export interface DynamicLesson {
  id: number;
  name: string;
  title?: string;
  unit_id: number;
  objectives?: string;
  content_type?: string;
  content_data?: string;
  content_json?: string | object;
  lesson_type?: string;
  description?: string;
  display_order?: number;
  status: string;
  country_id?: number;
  curriculum_id?: number;
}

export interface DynamicSkill {
  id: number;
  name: string;
  slug?: string;
  grade_id: number;
  semester_id: number;
  subject_id: number;
  unit_id: number;
  lesson_id: number;
  domain: string;
  difficulty: string;
  mastery_threshold: number;
  display_order?: number;
  status: string;
  country_id?: number;
  curriculum_id?: number;
}

export interface DynamicQuestion {
  id: number;
  skill_id: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  options: string;
  correct_answer: string;
  explanation: string;
  status: string;
  country_id?: number;
  curriculum_id?: number;
}

// Parsed question for student use
export interface ParsedQuestion {
  id: number;
  text: string;
  options: string[];
  correct: number;
  skill: string;
  skillId: number;
  difficulty: string;
  explanation: string;
}

// Content filter context - passed through all fetch functions
export interface ContentFilter {
  countryId?: number;
  curriculumId?: number;
}

// Content cache to avoid redundant fetches
const cache: {
  countries?: Country[];
  curricula?: Curriculum[];
  grades?: DynamicGrade[];
  semesters?: DynamicSemester[];
  subjects?: DynamicSubject[];
  units?: DynamicUnit[];
  lessons?: DynamicLesson[];
  skills?: DynamicSkill[];
  questions?: DynamicQuestion[];
  lastFetch: Record<string, number>;
} = { lastFetch: {} };

const CACHE_TTL = 60000; // 1 minute cache
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

function isCacheValid(key: string): boolean {
  const last = cache.lastFetch[key];
  return !!last && (Date.now() - last) < CACHE_TTL;
}

/** Check if the browser is online */
function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** Retry wrapper for async fetch operations */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries && isOnline()) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/** Safely extract items array from API response */
function extractItems<T>(response: unknown): T[] {
  if (!response || typeof response !== 'object') return [];
  const resp = response as { data?: { items?: T[] } };
  return Array.isArray(resp?.data?.items) ? resp.data.items : [];
}

// ===== Country & Curriculum fetching =====

// Fetch all active countries
export async function fetchCountries(): Promise<Country[]> {
  if (isCacheValid('countries') && cache.countries) return cache.countries;
  if (!isOnline()) return cache.countries || [];
  try {
    const response = await withRetry(() => client.entities.countries.query({
      query: { is_active: true },
      sort: 'display_order',
      limit: 50,
    }));
    const items = extractItems<Country>(response);
    cache.countries = items;
    cache.lastFetch['countries'] = Date.now();
    return items;
  } catch (err) {
    console.error('Error fetching countries:', err);
    return cache.countries || [];
  }
}

// Fetch curricula (optionally filtered by country)
export async function fetchCurricula(countryId?: number): Promise<Curriculum[]> {
  const key = `curricula_${countryId || 'all'}`;
  if (isCacheValid(key) && cache.curricula) {
    return countryId ? cache.curricula.filter(c => c.country_id === countryId) : cache.curricula;
  }
  if (!isOnline()) return cache.curricula?.filter(c => !countryId || c.country_id === countryId) || [];
  try {
    const query: Record<string, unknown> = { is_active: true };
    if (countryId) query.country_id = countryId;
    const response = await withRetry(() => client.entities.curricula.query({
      query,
      sort: 'display_order',
      limit: 50,
    }));
    const items = extractItems<Curriculum>(response);
    if (!countryId) {
      cache.curricula = items;
    }
    cache.lastFetch[key] = Date.now();
    return items;
  } catch (err) {
    console.error('Error fetching curricula:', err);
    return cache.curricula?.filter(c => !countryId || c.country_id === countryId) || [];
  }
}

// ===== Content fetching with country/curriculum filtering =====

// Fetch all published grades filtered by country/curriculum
export async function fetchGrades(countryId?: number, curriculumId?: number): Promise<DynamicGrade[]> {
  const key = `grades_${countryId || 'all'}_${curriculumId || 'all'}`;
  if (isCacheValid(key) && cache.grades) {
    let filtered = cache.grades;
    if (countryId) filtered = filtered.filter(g => g.country_id === countryId);
    if (curriculumId) filtered = filtered.filter(g => g.curriculum_id === curriculumId);
    return filtered;
  }
  if (!isOnline()) return cache.grades || [];
  try {
    const query: Record<string, unknown> = { status: 'published' };
    if (countryId) query.country_id = countryId;
    if (curriculumId) query.curriculum_id = curriculumId;
    const response = await withRetry(() => client.entities.grades.query({
      query,
      sort: 'display_order',
      limit: 50,
    }));
    const items = extractItems<DynamicGrade>(response);
    if (!countryId && !curriculumId) {
      cache.grades = items;
    }
    cache.lastFetch[key] = Date.now();
    return items;
  } catch (err) {
    console.error('Error fetching grades:', err);
    return cache.grades || [];
  }
}

// Fetch semesters for a grade (with optional country/curriculum filter)
export async function fetchSemesters(gradeId?: number, filter?: ContentFilter): Promise<DynamicSemester[]> {
  const key = `semesters_${gradeId || 'all'}_${filter?.countryId || ''}_${filter?.curriculumId || ''}`;
  if (isCacheValid(key) && cache.semesters) {
    let filtered = cache.semesters;
    if (gradeId) filtered = filtered.filter(s => s.grade_id === gradeId);
    if (filter?.countryId) filtered = filtered.filter(s => s.country_id === filter.countryId);
    if (filter?.curriculumId) filtered = filtered.filter(s => s.curriculum_id === filter.curriculumId);
    return filtered;
  }
  if (!isOnline()) return cache.semesters || [];
  try {
    const query: Record<string, unknown> = { status: 'published' };
    if (gradeId) query.grade_id = gradeId;
    if (filter?.countryId) query.country_id = filter.countryId;
    if (filter?.curriculumId) query.curriculum_id = filter.curriculumId;
    const response = await withRetry(() => client.entities.semesters.query({
      query,
      sort: '-id',
      limit: 50,
    }));
    const items = extractItems<DynamicSemester>(response);
    if (!gradeId && !filter?.countryId && !filter?.curriculumId) {
      cache.semesters = items;
    }
    cache.lastFetch[key] = Date.now();
    return items;
  } catch (err) {
    console.error('Error fetching semesters:', err);
    return cache.semesters || [];
  }
}

// Fetch subjects (with optional country/curriculum filter)
export async function fetchSubjects(gradeId?: number, semesterId?: number, filter?: ContentFilter): Promise<DynamicSubject[]> {
  const key = `subjects_${gradeId || 'all'}_${semesterId || 'all'}_${filter?.countryId || ''}_${filter?.curriculumId || ''}`;
  if (isCacheValid(key) && cache.subjects) {
    let filtered = cache.subjects;
    if (gradeId) filtered = filtered.filter(s => s.grade_id === gradeId);
    if (semesterId) filtered = filtered.filter(s => s.semester_id === semesterId);
    if (filter?.countryId) filtered = filtered.filter(s => s.country_id === filter.countryId);
    if (filter?.curriculumId) filtered = filtered.filter(s => s.curriculum_id === filter.curriculumId);
    return filtered;
  }
  if (!isOnline()) return cache.subjects || [];
  try {
    const query: Record<string, unknown> = { status: 'published' };
    if (gradeId) query.grade_id = gradeId;
    if (semesterId) query.semester_id = semesterId;
    if (filter?.countryId) query.country_id = filter.countryId;
    if (filter?.curriculumId) query.curriculum_id = filter.curriculumId;
    const response = await withRetry(() => client.entities.admin_subjects.query({
      query,
      sort: '-id',
      limit: 50,
    }));
    const items = extractItems<DynamicSubject>(response);
    if (!gradeId && !semesterId && !filter?.countryId && !filter?.curriculumId) {
      cache.subjects = items;
    }
    cache.lastFetch[key] = Date.now();
    return items;
  } catch (err) {
    console.error('Error fetching subjects:', err);
    return cache.subjects || [];
  }
}

// Fetch units for a subject (with optional country/curriculum filter)
export async function fetchUnits(subjectId?: number, filter?: ContentFilter): Promise<DynamicUnit[]> {
  if (!isOnline()) return cache.units || [];
  try {
    const query: Record<string, unknown> = { status: 'published' };
    if (subjectId) query.subject_id = subjectId;
    if (filter?.countryId) query.country_id = filter.countryId;
    if (filter?.curriculumId) query.curriculum_id = filter.curriculumId;
    const response = await withRetry(() => client.entities.units.query({
      query,
      sort: 'display_order',
      limit: 100,
    }));
    const items = extractItems<DynamicUnit>(response);
    if (!subjectId && !filter?.countryId) cache.units = items;
    return items;
  } catch (err) {
    console.error('Error fetching units:', err);
    return cache.units || [];
  }
}

// Fetch lessons (with optional country/curriculum filter)
export async function fetchLessons(unitId?: number, filter?: ContentFilter): Promise<DynamicLesson[]> {
  if (!isOnline()) return cache.lessons || [];
  try {
    const query: Record<string, unknown> = { status: 'published' };
    if (unitId) query.unit_id = unitId;
    if (filter?.countryId) query.country_id = filter.countryId;
    if (filter?.curriculumId) query.curriculum_id = filter.curriculumId;
    const response = await withRetry(() => client.entities.admin_lessons.query({
      query,
      sort: 'display_order',
      limit: 200,
    }));
    const items = extractItems<DynamicLesson>(response);
    if (!unitId && !filter?.countryId) cache.lessons = items;
    return items;
  } catch (err) {
    console.error('Error fetching lessons:', err);
    return cache.lessons || [];
  }
}

// Fetch skills (with optional country/curriculum filter)
export async function fetchSkills(gradeId?: number, subjectId?: number, _unitId?: number, filter?: ContentFilter): Promise<DynamicSkill[]> {
  if (!isOnline()) return cache.skills || [];
  try {
    const query: Record<string, unknown> = { status: 'published' };
    if (gradeId) query.grade_id = gradeId;
    if (subjectId) query.subject_id = subjectId;
    if (filter?.countryId) query.country_id = filter.countryId;
    if (filter?.curriculumId) query.curriculum_id = filter.curriculumId;
    const response = await withRetry(() => client.entities.admin_skills.query({
      query,
      sort: '-id',
      limit: 200,
    }));
    const items = extractItems<DynamicSkill>(response);
    if (!gradeId && !subjectId && !filter?.countryId) cache.skills = items;
    return items;
  } catch (err) {
    console.error('Error fetching skills:', err);
    return cache.skills || [];
  }
}

// Fetch questions (with optional country/curriculum filter)
export async function fetchQuestions(skillIds?: number[], filter?: ContentFilter): Promise<DynamicQuestion[]> {
  if (!isOnline()) return cache.questions || [];
  try {
    const query: Record<string, unknown> = { status: 'published' };
    if (filter?.countryId) query.country_id = filter.countryId;
    if (filter?.curriculumId) query.curriculum_id = filter.curriculumId;
    const response = await withRetry(() => client.entities.admin_questions.query({
      query,
      sort: '-id',
      limit: 500,
    }));
    const items = extractItems<DynamicQuestion>(response);
    if (!filter?.countryId) cache.questions = items;
    if (skillIds && skillIds.length > 0) {
      return items.filter(q => skillIds.includes(q.skill_id));
    }
    return items;
  } catch (err) {
    console.error('Error fetching questions:', err);
    return cache.questions || [];
  }
}

// Parse questions into student-friendly format for diagnostic/missions
export function parseQuestionsForStudent(
  questions: DynamicQuestion[],
  skills: DynamicSkill[]
): ParsedQuestion[] {
  if (!Array.isArray(questions)) return [];
  if (!Array.isArray(skills)) skills = [];

  return questions
    .filter(q => q && q.id && q.question_text) // skip malformed entries
    .map(q => {
      let options: string[] = [];
      try {
        const parsed = JSON.parse(q.options || '[]');
        if (Array.isArray(parsed)) options = parsed.map(String);
      } catch {
        options = q.options ? q.options.split(',').map(o => o.trim()).filter(Boolean) : [];
      }

      // Ensure at least 2 options for a valid question
      if (options.length < 2) {
        options = ['—', '—'];
      }

      // Find correct answer index
      let correctIndex = 0;
      const correctStr = (q.correct_answer ?? '').trim();
      if (correctStr) {
        const numIdx = parseInt(correctStr);
        if (!isNaN(numIdx) && numIdx >= 0 && numIdx < options.length) {
          correctIndex = numIdx;
        } else {
          const idx = options.findIndex(o => o.trim() === correctStr);
          if (idx >= 0) correctIndex = idx;
        }
      }
      // Clamp to valid range
      correctIndex = Math.max(0, Math.min(options.length - 1, correctIndex));

      const skill = skills.find(s => s.id === q.skill_id);

      return {
        id: q.id,
        text: q.question_text,
        options,
        correct: correctIndex,
        skill: skill?.name || 'عام',
        skillId: q.skill_id || 0,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
      };
    });
}

// Get diagnostic questions filtered by country/curriculum
export async function getDiagnosticQuestions(filter?: ContentFilter): Promise<Record<string, Array<{ id: number; text: string; options: string[]; correct: number; skill: string }>>> {
  try {
    const [grades, subjects, skills, questions] = await Promise.all([
      fetchGrades(filter?.countryId, filter?.curriculumId),
      fetchSubjects(undefined, undefined, filter),
      fetchSkills(undefined, undefined, filter),
      fetchQuestions(undefined, filter),
    ]);

    if (questions.length === 0 || skills.length === 0) return {};

    const result: Record<string, Array<{ id: number; text: string; options: string[]; correct: number; skill: string }>> = {};

    for (const grade of grades) {
      const gradeSlug = grade.slug || `grade${grade.grade_number || grade.display_order}`;
      for (const subject of subjects) {
        if (subject.grade_id !== grade.id) continue;
        const subjectSlug = subject.slug || subject.name.toLowerCase();

        const relevantSkills = skills.filter(s => s.grade_id === grade.id && s.subject_id === subject.id);
        if (relevantSkills.length === 0) continue;

        const skillIds = new Set(relevantSkills.map(s => s.id));
        const relevantQuestions = questions.filter(q => skillIds.has(q.skill_id));
        if (relevantQuestions.length === 0) continue;

        const parsed = parseQuestionsForStudent(relevantQuestions, relevantSkills);
        const selected: ParsedQuestion[] = [];
        const usedSkills = new Set<number>();

        for (const q of parsed) {
          if (selected.length >= 5) break;
          if (!usedSkills.has(q.skillId)) {
            selected.push(q);
            usedSkills.add(q.skillId);
          }
        }

        if (selected.length < 5) {
          for (const q of parsed) {
            if (selected.length >= 5) break;
            if (!selected.find(s => s.id === q.id)) {
              selected.push(q);
            }
          }
        }

        const key = `${gradeSlug}_${subjectSlug}`;
        result[key] = selected.slice(0, 5).map(q => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correct: q.correct,
          skill: q.skill,
        }));

        if (subjectSlug !== 'math') {
          result[subjectSlug] = result[key];
        }
      }
    }

    return result;
  } catch (err) {
    console.error('Error building diagnostic questions:', err);
    return {};
  }
}

// Get lesson content for a specific lesson
export async function getLessonContent(lessonId: number): Promise<DynamicLesson | null> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) return null;
  if (!isOnline()) {
    // Try to find in cache
    return cache.lessons?.find(l => l.id === lessonId) || null;
  }
  try {
    const response = await withRetry(() => client.entities.admin_lessons.get({ id: String(lessonId) }));
    return response?.data || null;
  } catch (err) {
    console.error('Error fetching lesson content:', err);
    // Fallback to cache
    return cache.lessons?.find(l => l.id === lessonId) || null;
  }
}

// Get all content for student's selected grade+subject path (filtered by country)
export async function getStudentLearningPath(gradeId: number, subjectId: number, filter?: ContentFilter) {
  if (!Number.isFinite(gradeId) || !Number.isFinite(subjectId)) {
    return { units: [], skills: [], lessons: [] };
  }
  try {
    const [units, skills, allLessons] = await Promise.all([
      fetchUnits(subjectId, filter),
      fetchSkills(gradeId, subjectId, undefined, filter),
      fetchLessons(undefined, filter),
    ]);

    const unitIds = new Set((units || []).map(u => u.id));
    const lessons = (allLessons || []).filter(l => unitIds.has(l.unit_id));

    return { units: units || [], skills: skills || [], lessons };
  } catch (err) {
    console.error('Error fetching student learning path:', err);
    return { units: [], skills: [], lessons: [] };
  }
}

// Clear cache (useful after admin makes changes)
export function clearContentCache() {
  cache.countries = undefined;
  cache.curricula = undefined;
  cache.grades = undefined;
  cache.semesters = undefined;
  cache.subjects = undefined;
  cache.units = undefined;
  cache.lessons = undefined;
  cache.skills = undefined;
  cache.questions = undefined;
  cache.lastFetch = {};
}

// Subject color mapping based on slug/name string
export function getSubjectColor(slugOrName: string): string {
  const name = slugOrName.toLowerCase();
  if (name.includes('رياضيات') || name.includes('math') || name === 'math') return 'from-blue-500 to-indigo-600';
  if (name.includes('عربي') || name.includes('arabic') || name === 'arabic') return 'from-green-500 to-emerald-600';
  if (name.includes('علوم') || name.includes('science') || name === 'science') return 'from-purple-500 to-violet-600';
  if (name.includes('إنجليزي') || name.includes('english')) return 'from-orange-500 to-red-600';
  if (name.includes('دين') || name.includes('islamic')) return 'from-teal-500 to-cyan-600';
  return 'from-indigo-500 to-purple-600';
}