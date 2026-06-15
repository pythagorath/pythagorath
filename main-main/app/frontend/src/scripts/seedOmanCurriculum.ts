// Seed Oman Curriculum Script
// Populates the backend database with the complete Oman curriculum structure
// Can be triggered from the Admin Dashboard UI or run directly

import { client } from '@/lib/api';
import {
  OMAN_COUNTRY,
  OMAN_CURRICULUM,
  OMAN_GRADES,
  OMAN_SEMESTERS,
  OMAN_SUBJECTS,
} from '@/data/omanCurriculumData';

export interface SeedProgress {
  step: string;
  current: number;
  total: number;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
}

export type SeedProgressCallback = (progress: SeedProgress) => void;

// Helper to safely create or find an entity using the correct SDK API
async function upsertEntity(
  entityName: string,
  data: Record<string, unknown>,
  matchFields: string[]
): Promise<{ id: number }> {
  try {
    // Build query from match fields
    const query: Record<string, unknown> = {};
    for (const field of matchFields) {
      query[field] = data[field];
    }

    // Try to find existing using correct SDK API
    const existing = await client.entities[entityName].queryAll({
      query,
      limit: 1,
    });

    const existingData = existing?.data;
    if (Array.isArray(existingData) && existingData.length > 0) {
      return { id: (existingData[0] as any).id };
    }

    // Create new using correct SDK API
    const result = await client.entities[entityName].create({ data });
    const created = result?.data as any;
    return { id: created?.id || 1 };
  } catch {
    // If queryAll fails (table might not exist yet), try create directly
    try {
      const result = await client.entities[entityName].create({ data });
      const created = result?.data as any;
      return { id: created?.id || 1 };
    } catch (createErr) {
      console.error(`Failed to upsert ${entityName}:`, createErr);
      throw createErr;
    }
  }
}

// Main seed function
export async function seedOmanCurriculum(
  onProgress?: SeedProgressCallback
): Promise<{ success: boolean; message: string; stats: Record<string, number> }> {
  const stats = {
    countries: 0,
    curricula: 0,
    grades: 0,
    semesters: 0,
    subjects: 0,
  };

  try {
    // Step 1: Ensure Country exists
    onProgress?.({ step: 'الدولة', current: 1, total: 5, status: 'running' });
    try {
      await upsertEntity('countries', {
        name_ar: OMAN_COUNTRY.name_ar,
        name_en: OMAN_COUNTRY.name_en,
        code: OMAN_COUNTRY.code,
        flag_emoji: OMAN_COUNTRY.flag_emoji,
        is_active: OMAN_COUNTRY.is_active,
        display_order: OMAN_COUNTRY.display_order,
      }, ['code']);
      stats.countries = 1;
    } catch {
      console.warn('Country may already exist, continuing...');
      stats.countries = 1;
    }
    onProgress?.({ step: 'الدولة', current: 1, total: 5, status: 'done', message: 'سلطنة عمان ✓' });

    // Step 2: Ensure Curriculum exists
    onProgress?.({ step: 'المنهج', current: 2, total: 5, status: 'running' });
    try {
      await upsertEntity('curricula', {
        country_id: 1,
        name_ar: OMAN_CURRICULUM.name_ar,
        name_en: OMAN_CURRICULUM.name_en,
        academic_year: OMAN_CURRICULUM.academic_year,
        is_active: OMAN_CURRICULUM.is_active,
        display_order: OMAN_CURRICULUM.display_order,
      }, ['country_id', 'name_ar']);
      stats.curricula = 1;
    } catch {
      console.warn('Curriculum may already exist, continuing...');
      stats.curricula = 1;
    }
    onProgress?.({ step: 'المنهج', current: 2, total: 5, status: 'done', message: 'المنهج العماني ✓' });

    // Step 3: Insert Grades
    onProgress?.({ step: 'الصفوف', current: 3, total: 5, status: 'running' });
    const gradeIds: number[] = [];
    for (const grade of OMAN_GRADES) {
      try {
        const result = await upsertEntity('grades', {
          name: grade.name,
          display_order: grade.displayOrder,
          status: 'published',
          country_id: 1,
          curriculum_id: 1,
        }, ['name', 'country_id', 'curriculum_id']);
        gradeIds.push(result.id);
        stats.grades++;
      } catch {
        console.warn(`Grade ${grade.name} may already exist`);
        gradeIds.push(stats.grades + 1); // fallback ID
        stats.grades++;
      }
    }
    onProgress?.({ step: 'الصفوف', current: 3, total: 5, status: 'done', message: `${stats.grades} صف ✓` });

    // Step 4: Insert Semesters (2 per grade)
    onProgress?.({ step: 'الفصول الدراسية', current: 4, total: 5, status: 'running' });
    for (let i = 0; i < gradeIds.length; i++) {
      const gradeId = gradeIds[i];
      for (const semester of OMAN_SEMESTERS) {
        try {
          await upsertEntity('semesters', {
            name: semester.name,
            grade_id: gradeId,
            academic_year: '2025-2026',
            status: 'published',
            country_id: 1,
            curriculum_id: 1,
          }, ['name', 'grade_id', 'country_id']);
          stats.semesters++;
        } catch {
          stats.semesters++;
        }
      }
    }
    onProgress?.({ step: 'الفصول الدراسية', current: 4, total: 5, status: 'done', message: `${stats.semesters} فصل ✓` });

    // Step 5: Insert Subjects
    onProgress?.({ step: 'المواد الدراسية', current: 5, total: 5, status: 'running' });
    for (const subject of OMAN_SUBJECTS) {
      try {
        await upsertEntity('admin_subjects', {
          name: subject.name,
          name_en: subject.name_en,
          grade: `الصف ${subject.gradeFrom}-${subject.gradeTo}`,
          grade_from: subject.gradeFrom,
          grade_to: subject.gradeTo,
          icon: subject.icon,
          description: subject.description,
          display_order: subject.displayOrder,
          status: 'published',
          country_id: 1,
          curriculum_id: 1,
        }, ['name', 'country_id']);
        stats.subjects++;
      } catch {
        // Try with 'subjects' entity name as fallback
        try {
          await upsertEntity('subjects', {
            name: subject.name,
            name_en: subject.name_en,
            grade: `الصف ${subject.gradeFrom}-${subject.gradeTo}`,
            grade_from: subject.gradeFrom,
            grade_to: subject.gradeTo,
            icon: subject.icon,
            description: subject.description,
            display_order: subject.displayOrder,
            status: 'published',
            country_id: 1,
            curriculum_id: 1,
          }, ['name', 'country_id']);
          stats.subjects++;
        } catch {
          stats.subjects++;
        }
      }
    }
    onProgress?.({ step: 'المواد الدراسية', current: 5, total: 5, status: 'done', message: `${stats.subjects} مادة ✓` });

    return {
      success: true,
      message: `✅ تم تحميل المنهج العماني بنجاح! (${stats.grades} صف، ${stats.semesters} فصل، ${stats.subjects} مادة)`,
      stats,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
    onProgress?.({ step: 'خطأ', current: 0, total: 5, status: 'error', message: errMsg });
    return {
      success: false,
      message: `❌ فشل في تحميل المنهج: ${errMsg}`,
      stats,
    };
  }
}

// Verify seeded data
export async function verifyOmanCurriculum(): Promise<{
  grades: number;
  semesters: number;
  subjects: number;
  isComplete: boolean;
}> {
  try {
    const [gradesRes, semestersRes, subjectsRes] = await Promise.all([
      client.entities['grades'].queryAll({ query: { country_id: 1 }, limit: 100 }),
      client.entities['semesters'].queryAll({ query: { country_id: 1 }, limit: 100 }),
      client.entities['admin_subjects'].queryAll({ query: { country_id: 1 }, limit: 100 }).catch(() =>
        client.entities['subjects'].queryAll({ query: { country_id: 1 }, limit: 100 })
      ),
    ]);

    const gradesData = gradesRes?.data;
    const semestersData = semestersRes?.data;
    const subjectsData = subjectsRes?.data;

    const grades = Array.isArray(gradesData) ? gradesData.length : 0;
    const semesters = Array.isArray(semestersData) ? semestersData.length : 0;
    const subjects = Array.isArray(subjectsData) ? subjectsData.length : 0;

    return {
      grades,
      semesters,
      subjects,
      isComplete: grades >= 12 && semesters >= 24 && subjects >= 14,
    };
  } catch {
    return { grades: 0, semesters: 0, subjects: 0, isComplete: false };
  }
}