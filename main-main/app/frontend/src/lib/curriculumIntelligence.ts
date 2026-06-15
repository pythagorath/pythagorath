// Phase 5.5 - Curriculum Intelligence
// Connects admin-published content to adaptive decisions
// Ensures hierarchy consistency, handles empty states gracefully
// Provides intelligent content selection based on mastery and prerequisites

import { fetchSkills, fetchLessons, type DynamicLesson, type ContentFilter } from './contentService';
import { checkPrerequisiteGate, analyzeSkillGraph, type SkillGraphAnalysis } from './prerequisiteGating';
import { calculateMasteryV2 } from './masteryEngineV2';
import type { StudentSkillProgress } from '@/data/mathSkillsData';
import { skillPrerequisites } from '@/data/skillPrerequisites';

// ============ Types ============

export interface CurriculumNode {
  id: number;
  name: string;
  skillId: string;
  grade: number;
  semester: number;
  unit: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lessonCount: number;
  questionCount: number;
  status: 'published' | 'draft' | 'review';
  mastery: number;
  isReady: boolean; // prerequisites met
  isBlocked: boolean;
  blockReason: string;
}

export interface CurriculumUnit {
  name: string;
  skills: CurriculumNode[];
  completionRate: number;
  isLocked: boolean;
}

export interface CurriculumOverview {
  grade: number;
  semester: number;
  units: CurriculumUnit[];
  totalSkills: number;
  publishedSkills: number;
  masteredSkills: number;
  readySkills: number;
  blockedSkills: number;
  graphAnalysis: SkillGraphAnalysis | null;
  emptyState: EmptyStateInfo | null;
}

export interface EmptyStateInfo {
  type: 'no_content' | 'no_published' | 'all_mastered' | 'all_blocked';
  messageAr: string;
  actionAr: string;
  emoji: string;
}

export interface ContentRecommendation {
  skillId: string;
  skillName: string;
  reason: RecommendationReason;
  priority: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // minutes
  lessonIds: number[];
}

export type RecommendationReason =
  | 'next_in_path'       // Next logical skill in curriculum
  | 'prerequisite_weak'  // Prerequisite needs strengthening
  | 'retention_due'      // Mastered but needs review
  | 'remediation'        // Failed and needs scaffolded help
  | 'challenge'          // Ready for harder content
  | 'bottleneck';        // Blocking many other skills

// ============ Core Functions ============

/**
 * Build curriculum overview for a student, integrating admin content with mastery data.
 * Handles empty states gracefully.
 */
export async function buildCurriculumOverview(
  grade: number,
  semester: number,
  allProgress: StudentSkillProgress[],
  filter?: ContentFilter
): Promise<CurriculumOverview> {
  let skills: Awaited<ReturnType<typeof fetchSkills>> = [];
  let lessons: DynamicLesson[] = [];

  try {
    skills = await fetchSkills(undefined, undefined, undefined, filter);
  } catch {
    skills = [];
  }

  try {
    lessons = await fetchLessons(undefined, filter);
  } catch {
    lessons = [];
  }

  // Filter by grade/semester
  const gradeSkills = skills.filter(s =>
    (s.grade === grade || !s.grade) &&
    (s.semester === semester || !s.semester) &&
    (s.status === 'published' || s.status === 'active')
  );

  // Check for empty states
  if (skills.length === 0) {
    return createEmptyOverview(grade, semester, 'no_content');
  }

  if (gradeSkills.length === 0) {
    return createEmptyOverview(grade, semester, 'no_published');
  }

  // Build skill name map for prerequisite gating
  const skillNames: Record<string, string> = {};
  for (const s of skills) {
    if (s.skill_id) skillNames[s.skill_id] = s.name;
  }

  // Build curriculum nodes
  const nodes: CurriculumNode[] = gradeSkills.map(skill => {
    const skillLessons = lessons.filter(l => l.skill_id === skill.id);
    const progress = allProgress.find(p => p.skillId === skill.skill_id);
    const mastery = progress ? calculateMasteryV2(progress).percentage : 0;

    // Check prerequisite gate
    const gate = skill.skill_id
      ? checkPrerequisiteGate(skill.skill_id, allProgress, skillNames)
      : { allowed: true, reason: '', blockedBy: [] };

    return {
      id: skill.id,
      name: skill.name,
      skillId: skill.skill_id || '',
      grade: skill.grade || grade,
      semester: skill.semester || semester,
      unit: skill.unit || 'عام',
      difficulty: skill.difficulty || 'medium',
      lessonCount: skillLessons.length,
      questionCount: 0, // Could be populated from questions table
      status: skill.status || 'published',
      mastery,
      isReady: gate.allowed,
      isBlocked: !gate.allowed,
      blockReason: gate.allowed ? '' : gate.reason,
    };
  });

  // Group by unit
  const unitMap = new Map<string, CurriculumNode[]>();
  for (const node of nodes) {
    const unitSkills = unitMap.get(node.unit) || [];
    unitSkills.push(node);
    unitMap.set(node.unit, unitSkills);
  }

  const units: CurriculumUnit[] = Array.from(unitMap.entries()).map(([name, unitSkills]) => {
    const masteredInUnit = unitSkills.filter(s => s.mastery >= 70).length;
    const completionRate = unitSkills.length > 0
      ? Math.round((masteredInUnit / unitSkills.length) * 100)
      : 0;

    // Unit is locked if ALL skills are blocked
    const isLocked = unitSkills.every(s => s.isBlocked);

    return { name, skills: unitSkills, completionRate, isLocked };
  });

  // Graph analysis
  const gradeSkillIds = nodes.map(n => n.skillId).filter(Boolean);
  let graphAnalysis: SkillGraphAnalysis | null = null;
  if (gradeSkillIds.length > 0) {
    graphAnalysis = analyzeSkillGraph(gradeSkillIds, allProgress);
  }

  // Stats
  const masteredSkills = nodes.filter(n => n.mastery >= 70).length;
  const readySkills = nodes.filter(n => n.isReady && n.mastery < 70).length;
  const blockedSkills = nodes.filter(n => n.isBlocked).length;

  // Check if all mastered
  let emptyState: EmptyStateInfo | null = null;
  if (masteredSkills === nodes.length && nodes.length > 0) {
    emptyState = {
      type: 'all_mastered',
      messageAr: 'أحسنت! أتقنت جميع المهارات في هذا الفصل 🏆',
      actionAr: 'انتقل للفصل التالي أو راجع مهاراتك',
      emoji: '🏆',
    };
  } else if (blockedSkills === nodes.length && nodes.length > 0) {
    emptyState = {
      type: 'all_blocked',
      messageAr: 'تحتاج إتقان مهارات سابقة أولاً',
      actionAr: 'ارجع للفصل السابق وأكمل المهارات الأساسية',
      emoji: '🔒',
    };
  }

  return {
    grade,
    semester,
    units,
    totalSkills: nodes.length,
    publishedSkills: nodes.filter(n => n.status === 'published').length,
    masteredSkills,
    readySkills,
    blockedSkills,
    graphAnalysis,
    emptyState,
  };
}

// ============ Content Recommendations ============

/**
 * Generate intelligent content recommendations based on:
 * - Prerequisite graph position
 * - Current mastery levels
 * - Retention needs
 * - Bottleneck analysis
 */
export async function getContentRecommendations(
  grade: number,
  allProgress: StudentSkillProgress[],
  maxRecommendations: number = 5,
  filter?: ContentFilter
): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = [];

  let skills: Awaited<ReturnType<typeof fetchSkills>> = [];
  let lessons: DynamicLesson[] = [];

  try {
    skills = await fetchSkills(undefined, undefined, undefined, filter);
    lessons = await fetchLessons(undefined, filter);
  } catch {
    return [];
  }

  const publishedSkills = skills.filter(s =>
    (s.grade === grade || !s.grade) &&
    (s.status === 'published' || s.status === 'active')
  );

  if (publishedSkills.length === 0) return [];

  // Build mastery cache
  const masteryCache = new Map<string, number>();
  for (const p of allProgress) {
    masteryCache.set(p.skillId, calculateMasteryV2(p).percentage);
  }

  // Build skill name map
  const skillNames: Record<string, string> = {};
  for (const s of skills) {
    if (s.skill_id) skillNames[s.skill_id] = s.name;
  }

  // Analyze graph for bottlenecks
  const gradeSkillIds = publishedSkills.map(s => s.skill_id).filter(Boolean) as string[];
  const graphAnalysis = gradeSkillIds.length > 0
    ? analyzeSkillGraph(gradeSkillIds, allProgress)
    : null;

  for (const skill of publishedSkills) {
    if (!skill.skill_id) continue;

    const mastery = masteryCache.get(skill.skill_id) || 0;
    const skillLessons = lessons.filter(l => l.skill_id === skill.id);
    if (skillLessons.length === 0) continue; // No content available

    const gate = checkPrerequisiteGate(skill.skill_id, allProgress, skillNames);

    // Skip fully mastered (unless retention due)
    if (mastery >= 90) {
      // Check retention
      const progress = allProgress.find(p => p.skillId === skill.skill_id);
      if (progress) {
        const result = calculateMasteryV2(progress);
        if (result.needsReview) {
          recommendations.push({
            skillId: skill.skill_id,
            skillName: skill.name,
            reason: 'retention_due',
            priority: 70,
            difficulty: 'medium',
            estimatedDuration: 3,
            lessonIds: skillLessons.map(l => l.id),
          });
        }
      }
      continue;
    }

    // Blocked = suggest prerequisite
    if (!gate.allowed && gate.blockedBy.length > 0) {
      const weakest = gate.blockedBy[0];
      const prereqSkill = publishedSkills.find(s => s.skill_id === weakest.skillId);
      if (prereqSkill) {
        const prereqLessons = lessons.filter(l => l.skill_id === prereqSkill.id);
        if (prereqLessons.length > 0) {
          recommendations.push({
            skillId: weakest.skillId,
            skillName: weakest.skillName,
            reason: 'prerequisite_weak',
            priority: 85,
            difficulty: 'easy',
            estimatedDuration: 5,
            lessonIds: prereqLessons.map(l => l.id),
          });
        }
      }
      continue;
    }

    // Ready to learn - determine reason
    let reason: RecommendationReason = 'next_in_path';
    let priority = 50;

    // Bottleneck skills get higher priority
    if (graphAnalysis?.bottlenecks.includes(skill.skill_id)) {
      reason = 'bottleneck';
      priority = 80;
    }
    // Low mastery with attempts = remediation
    else if (mastery < 30 && (allProgress.find(p => p.skillId === skill.skill_id)?.attempts || 0) > 3) {
      reason = 'remediation';
      priority = 75;
    }
    // High mastery = challenge
    else if (mastery >= 60 && mastery < 90) {
      reason = 'challenge';
      priority = 45;
    }
    // Medium mastery = next in path
    else {
      priority = 60 - mastery * 0.3; // Lower mastery = higher priority
    }

    recommendations.push({
      skillId: skill.skill_id,
      skillName: skill.name,
      reason,
      priority,
      difficulty: mastery < 30 ? 'easy' : mastery < 60 ? 'medium' : 'hard',
      estimatedDuration: mastery < 30 ? 7 : mastery < 60 ? 5 : 3,
      lessonIds: skillLessons.map(l => l.id),
    });
  }

  // Sort by priority (highest first) and deduplicate by skillId
  const seen = new Set<string>();
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .filter(r => {
      if (seen.has(r.skillId)) return false;
      seen.add(r.skillId);
      return true;
    })
    .slice(0, maxRecommendations);
}

// ============ Content Pipeline Validation ============

/**
 * Validate that admin-published content forms a consistent hierarchy.
 * Returns issues that need attention.
 */
export function validateContentHierarchy(
  skills: Array<{ id: number; name: string; skill_id?: string; grade?: number }>,
  lessons: DynamicLesson[]
): ContentValidationResult {
  const issues: ContentIssue[] = [];

  // Check for skills without lessons
  for (const skill of skills) {
    const skillLessons = lessons.filter(l => l.skill_id === skill.id);
    if (skillLessons.length === 0) {
      issues.push({
        type: 'skill_no_lessons',
        severity: 'warning',
        skillId: skill.skill_id || String(skill.id),
        message: `المهارة "${skill.name}" ليس لها دروس منشورة`,
      });
    }
  }

  // Check for orphan lessons (no skill)
  for (const lesson of lessons) {
    if (!lesson.skill_id) {
      issues.push({
        type: 'lesson_no_skill',
        severity: 'info',
        skillId: '',
        message: `الدرس "${lesson.title}" غير مرتبط بمهارة`,
      });
    }
  }

  // Check prerequisite graph consistency
  for (const skill of skills) {
    if (!skill.skill_id) continue;
    const prereqs = skillPrerequisites[skill.skill_id] || [];
    for (const prereqId of prereqs) {
      const prereqExists = skills.some(s => s.skill_id === prereqId);
      if (!prereqExists) {
        issues.push({
          type: 'missing_prerequisite',
          severity: 'error',
          skillId: skill.skill_id,
          message: `المهارة "${skill.name}" تعتمد على "${prereqId}" غير موجودة`,
        });
      }
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    totalIssues: issues.length,
    errors: issues.filter(i => i.severity === 'error'),
    warnings: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
  };
}

export interface ContentValidationResult {
  isValid: boolean;
  totalIssues: number;
  errors: ContentIssue[];
  warnings: ContentIssue[];
  info: ContentIssue[];
}

export interface ContentIssue {
  type: 'skill_no_lessons' | 'lesson_no_skill' | 'missing_prerequisite' | 'circular_dependency';
  severity: 'error' | 'warning' | 'info';
  skillId: string;
  message: string;
}

// ============ Empty State Handling ============

function createEmptyOverview(
  grade: number,
  semester: number,
  type: EmptyStateInfo['type']
): CurriculumOverview {
  const emptyStates: Record<string, EmptyStateInfo> = {
    no_content: {
      type: 'no_content',
      messageAr: 'لا يوجد محتوى منشور بعد',
      actionAr: 'يرجى التواصل مع المعلم لإضافة المحتوى',
      emoji: '📭',
    },
    no_published: {
      type: 'no_published',
      messageAr: 'لا يوجد محتوى منشور لهذا الصف والفصل',
      actionAr: 'المحتوى قيد الإعداد، يرجى المحاولة لاحقاً',
      emoji: '🔧',
    },
  };

  return {
    grade,
    semester,
    units: [],
    totalSkills: 0,
    publishedSkills: 0,
    masteredSkills: 0,
    readySkills: 0,
    blockedSkills: 0,
    graphAnalysis: null,
    emptyState: emptyStates[type] || emptyStates['no_content'],
  };
}

// ============ Adaptive Content Selection ============

/**
 * Select the best content for a student right now.
 * Considers: prerequisites, mastery, retention, time of day, session history.
 */
export function selectOptimalContent(
  recommendations: ContentRecommendation[],
  recentSkills: string[], // Skills practiced in last 24h
  sessionCount: number // Sessions today
): ContentRecommendation | null {
  if (recommendations.length === 0) return null;

  // Filter out recently practiced (avoid repetition)
  const fresh = recommendations.filter(r => !recentSkills.includes(r.skillId));

  // If all are recent, allow repetition for remediation/retention
  const candidates = fresh.length > 0 ? fresh : recommendations.filter(
    r => r.reason === 'remediation' || r.reason === 'retention_due'
  );

  if (candidates.length === 0) return recommendations[0];

  // First session of day: start with retention or easy content
  if (sessionCount === 0) {
    const warmup = candidates.find(r =>
      r.reason === 'retention_due' || r.difficulty === 'easy'
    );
    if (warmup) return warmup;
  }

  // Later sessions: prioritize by recommendation priority
  return candidates[0];
}