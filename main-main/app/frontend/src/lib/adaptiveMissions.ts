// Content Intelligence Sprint - Adaptive Daily Missions
// Generates personalized daily missions based on:
// - Weakness areas, prerequisites, retention reviews, recent mistakes, mastery decay

import type { StudentSkillProgress, Skill } from '@/data/mathSkillsData';
import { skillPrerequisites } from '@/data/skillPrerequisites';
import { calculateMasteryV2 } from './masteryEngineV2';
import { getDueRetentionReviews, getDailyRetentionTasks } from './retentionEngine';
import { getAnswerHistory, analyzeErrorPatterns, getSkillErrorPatterns } from './errorPatternAnalyzer';

export interface Mission {
  id: string;
  skillId: string;
  skillName: string;
  type: 'retention_review' | 'weakness_drill' | 'error_fix' | 'new_skill' | 'prerequisite_repair';
  priority: number; // 1=highest
  reason: string;
  emoji: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  questionCount: number;
}

/**
 * Generate today's adaptive missions (max 3)
 */
export function generateAdaptiveMissions(
  allProgress: StudentSkillProgress[],
  allSkills: Skill[],
  grade: 1 | 2
): Mission[] {
  const gradeSkills = allSkills.filter(s => s.grade === grade);
  const gradeProgress = allProgress.filter(p => gradeSkills.some(s => s.id === p.skillId));
  const missions: Mission[] = [];
  const usedSkills = new Set<string>();

  // --- Priority 1: Retention Reviews (overdue/due) ---
  const retentionTasks = getDailyRetentionTasks(
    gradeProgress,
    Object.fromEntries(gradeSkills.map(s => [s.id, s.name]))
  );

  for (const task of retentionTasks.slice(0, 1)) {
    if (usedSkills.has(task.skillId)) continue;
    usedSkills.add(task.skillId);
    missions.push({
      id: `ret-${task.skillId}`,
      skillId: task.skillId,
      skillName: task.skillName,
      type: 'retention_review',
      priority: 1,
      reason: task.reason,
      emoji: '🔄',
      difficulty: 'medium',
      estimatedMinutes: 5,
      questionCount: 5,
    });
  }

  // --- Priority 2: Error Pattern Fix (recurring mistakes) ---
  const answerHistory = getAnswerHistory();
  const recentAnswers = answerHistory.filter(a => {
    const daysSince = (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7 && gradeSkills.some(s => s.id === a.skillId);
  });

  if (recentAnswers.length > 0) {
    const profile = analyzeErrorPatterns(recentAnswers);
    if (profile.dominantError && profile.errorRate > 30) {
      // Find skill with most errors of dominant type
      const errorSkills: Record<string, number> = {};
      for (const a of recentAnswers.filter(a => a.errorType === profile.dominantError)) {
        errorSkills[a.skillId] = (errorSkills[a.skillId] || 0) + 1;
      }
      const topErrorSkill = Object.entries(errorSkills).sort((a, b) => b[1] - a[1])[0];

      if (topErrorSkill && !usedSkills.has(topErrorSkill[0])) {
        const skill = gradeSkills.find(s => s.id === topErrorSkill[0]);
        if (skill) {
          usedSkills.add(skill.id);
          missions.push({
            id: `err-${skill.id}`,
            skillId: skill.id,
            skillName: skill.name,
            type: 'error_fix',
            priority: 2,
            reason: `تصحيح: ${profile.patterns[0]?.label || 'أخطاء متكررة'}`,
            emoji: '🔧',
            difficulty: 'easy',
            estimatedMinutes: 5,
            questionCount: 5,
          });
        }
      }
    }
  }

  // --- Priority 3: Prerequisite Repair (weak prerequisite blocking progress) ---
  const developingSkills = gradeProgress
    .filter(p => p.status === 'developing' || p.status === 'needs_practice')
    .filter(p => !usedSkills.has(p.skillId));

  for (const prog of developingSkills.slice(0, 3)) {
    const prereqs = skillPrerequisites[prog.skillId] || [];
    for (const prereqId of prereqs) {
      if (usedSkills.has(prereqId)) continue;
      const prereqProgress = allProgress.find(p => p.skillId === prereqId);
      if (prereqProgress && prereqProgress.attempts > 0) {
        const mastery = calculateMasteryV2(prereqProgress);
        if (mastery.percentage < 60) {
          const skill = allSkills.find(s => s.id === prereqId);
          if (skill) {
            usedSkills.add(prereqId);
            missions.push({
              id: `prereq-${prereqId}`,
              skillId: prereqId,
              skillName: skill.name,
              type: 'prerequisite_repair',
              priority: 3,
              reason: 'تقوية الأساس',
              emoji: '🧱',
              difficulty: 'easy',
              estimatedMinutes: 5,
              questionCount: 5,
            });
            break;
          }
        }
      }
    }
    if (missions.length >= 3) break;
  }

  // --- Priority 4: Weakness Drill (lowest mastery skills) ---
  if (missions.length < 3) {
    const weakest = gradeProgress
      .filter(p => p.attempts > 0 && !usedSkills.has(p.skillId))
      .map(p => ({ ...p, mastery: calculateMasteryV2(p) }))
      .filter(p => p.mastery.percentage < 60)
      .sort((a, b) => a.mastery.percentage - b.mastery.percentage);

    for (const weak of weakest.slice(0, 3 - missions.length)) {
      const skill = gradeSkills.find(s => s.id === weak.skillId);
      if (skill && !usedSkills.has(skill.id)) {
        usedSkills.add(skill.id);
        missions.push({
          id: `weak-${skill.id}`,
          skillId: skill.id,
          skillName: skill.name,
          type: 'weakness_drill',
          priority: 4,
          reason: `إتقان ${weak.mastery.percentage}% فقط`,
          emoji: '💪',
          difficulty: weak.mastery.percentage < 30 ? 'easy' : 'medium',
          estimatedMinutes: 7,
          questionCount: 7,
        });
      }
    }
  }

  // --- Priority 5: New Skill (if all else is good) ---
  if (missions.length < 3) {
    const notStarted = gradeProgress
      .filter(p => p.status === 'not_started' && !usedSkills.has(p.skillId));

    for (const ns of notStarted) {
      const prereqs = skillPrerequisites[ns.skillId] || [];
      const allPrereqsMet = prereqs.length === 0 || prereqs.every(prereqId => {
        const pp = allProgress.find(p => p.skillId === prereqId);
        return pp && (pp.status === 'good' || pp.status === 'mastered');
      });

      if (allPrereqsMet) {
        const skill = gradeSkills.find(s => s.id === ns.skillId);
        if (skill) {
          usedSkills.add(skill.id);
          missions.push({
            id: `new-${skill.id}`,
            skillId: skill.id,
            skillName: skill.name,
            type: 'new_skill',
            priority: 5,
            reason: 'مهارة جديدة جاهزة',
            emoji: '🌟',
            difficulty: 'easy',
            estimatedMinutes: 8,
            questionCount: 5,
          });
          break;
        }
      }
    }
  }

  return missions.slice(0, 3).sort((a, b) => a.priority - b.priority);
}

/**
 * Get mission summary stats
 */
export function getMissionStats(missions: Mission[]): {
  totalMinutes: number;
  totalQuestions: number;
  types: string[];
} {
  return {
    totalMinutes: missions.reduce((sum, m) => sum + m.estimatedMinutes, 0),
    totalQuestions: missions.reduce((sum, m) => sum + m.questionCount, 0),
    types: [...new Set(missions.map(m => m.type))],
  };
}