// Phase 5.5 - Prerequisite-Aware Learning Gate
// Enforces skill graph: no advancement without mastery of prerequisites
// Automatic fallback to weakest prerequisite when student is stuck
// Integrates with skillPrerequisites data and masteryEngineV2

import { skillPrerequisites, getFullPrerequisiteChain } from '@/data/skillPrerequisites';
import { calculateMasteryV2, type MasteryResult } from './masteryEngineV2';
import type { StudentSkillProgress } from '@/data/mathSkillsData';

// ============ Types ============

export interface PrerequisiteGateResult {
  allowed: boolean;
  reason: string;
  blockedBy: BlockingPrerequisite[];
  suggestedPath: string[];
  fallbackSkill: string | null;
  gateStrength: 'hard' | 'soft'; // hard = must master, soft = recommended
}

export interface BlockingPrerequisite {
  skillId: string;
  skillName: string;
  currentMastery: number;
  requiredMastery: number;
  gap: number;
  estimatedPracticeNeeded: number; // questions to reach mastery
}

export interface LearningPathNode {
  skillId: string;
  depth: number;
  mastery: number;
  status: 'mastered' | 'ready' | 'blocked' | 'not_started';
  prerequisites: string[];
  dependents: string[];
}

export interface SkillGraphAnalysis {
  totalSkills: number;
  masteredCount: number;
  readyToLearn: string[];
  blockedSkills: string[];
  criticalPath: string[]; // longest chain of unmastered skills
  bottlenecks: string[]; // skills blocking the most dependents
}

// ============ Configuration ============

const HARD_GATE_THRESHOLD = 60; // Must have 60% mastery to proceed (hard gate)
const SOFT_GATE_THRESHOLD = 40; // Recommended 40% mastery (soft gate)
const MASTERY_FOR_ADVANCEMENT = 70; // Ideal mastery before moving on
const MAX_FALLBACK_DEPTH = 3; // Don't go more than 3 levels back

// ============ Core Gate Logic ============

/**
 * Check if a student can attempt a skill based on prerequisite mastery.
 * Returns detailed gate result with suggestions.
 */
export function checkPrerequisiteGate(
  targetSkillId: string,
  allProgress: StudentSkillProgress[],
  skillNames: Record<string, string>
): PrerequisiteGateResult {
  const prereqs = skillPrerequisites[targetSkillId] || [];

  // No prerequisites = always allowed
  if (prereqs.length === 0) {
    return {
      allowed: true,
      reason: 'مهارة أساسية - لا تحتاج متطلبات سابقة',
      blockedBy: [],
      suggestedPath: [targetSkillId],
      fallbackSkill: null,
      gateStrength: 'hard',
    };
  }

  const blockedBy: BlockingPrerequisite[] = [];
  let worstMastery = 100;
  let worstSkillId = '';

  for (const prereqId of prereqs) {
    const progress = allProgress.find(p => p.skillId === prereqId);
    let mastery = 0;

    if (progress) {
      const result = calculateMasteryV2(progress);
      mastery = result.percentage;
    }

    if (mastery < HARD_GATE_THRESHOLD) {
      const gap = HARD_GATE_THRESHOLD - mastery;
      const estimatedPractice = Math.ceil(gap / 10) * 2; // rough estimate

      blockedBy.push({
        skillId: prereqId,
        skillName: skillNames[prereqId] || prereqId,
        currentMastery: mastery,
        requiredMastery: HARD_GATE_THRESHOLD,
        gap,
        estimatedPracticeNeeded: estimatedPractice,
      });

      if (mastery < worstMastery) {
        worstMastery = mastery;
        worstSkillId = prereqId;
      }
    }
  }

  if (blockedBy.length === 0) {
    return {
      allowed: true,
      reason: 'جميع المتطلبات السابقة متقنة ✓',
      blockedBy: [],
      suggestedPath: [targetSkillId],
      fallbackSkill: null,
      gateStrength: 'hard',
    };
  }

  // Build suggested path: from weakest prerequisite to target
  const suggestedPath = buildSuggestedPath(worstSkillId, targetSkillId, allProgress);

  return {
    allowed: false,
    reason: `يحتاج إتقان ${blockedBy.length} مهارة سابقة أولاً`,
    blockedBy: blockedBy.sort((a, b) => a.currentMastery - b.currentMastery),
    suggestedPath,
    fallbackSkill: worstSkillId,
    gateStrength: 'hard',
  };
}

/**
 * Soft gate check - allows access but with warning
 * Used for practice/exploration mode
 */
export function checkSoftGate(
  targetSkillId: string,
  allProgress: StudentSkillProgress[],
  skillNames: Record<string, string>
): PrerequisiteGateResult {
  const prereqs = skillPrerequisites[targetSkillId] || [];
  if (prereqs.length === 0) {
    return {
      allowed: true,
      reason: '',
      blockedBy: [],
      suggestedPath: [targetSkillId],
      fallbackSkill: null,
      gateStrength: 'soft',
    };
  }

  const weakPrereqs: BlockingPrerequisite[] = [];

  for (const prereqId of prereqs) {
    const progress = allProgress.find(p => p.skillId === prereqId);
    const mastery = progress ? calculateMasteryV2(progress).percentage : 0;

    if (mastery < SOFT_GATE_THRESHOLD) {
      weakPrereqs.push({
        skillId: prereqId,
        skillName: skillNames[prereqId] || prereqId,
        currentMastery: mastery,
        requiredMastery: SOFT_GATE_THRESHOLD,
        gap: SOFT_GATE_THRESHOLD - mastery,
        estimatedPracticeNeeded: Math.ceil((SOFT_GATE_THRESHOLD - mastery) / 10) * 2,
      });
    }
  }

  // Soft gate: always allowed but with recommendations
  return {
    allowed: true,
    reason: weakPrereqs.length > 0
      ? `يُنصح بمراجعة ${weakPrereqs.length} مهارة سابقة`
      : '',
    blockedBy: weakPrereqs,
    suggestedPath: [targetSkillId],
    fallbackSkill: weakPrereqs.length > 0 ? weakPrereqs[0].skillId : null,
    gateStrength: 'soft',
  };
}

// ============ Path Building ============

/**
 * Build optimal learning path from current state to target skill.
 * Respects prerequisite ordering and current mastery.
 */
function buildSuggestedPath(
  startSkillId: string,
  targetSkillId: string,
  allProgress: StudentSkillProgress[]
): string[] {
  const path: string[] = [];
  const visited = new Set<string>();

  // DFS from target backwards to find unmastered prerequisites
  function findUnmastered(skillId: string, depth: number): void {
    if (depth > MAX_FALLBACK_DEPTH || visited.has(skillId)) return;
    visited.add(skillId);

    const prereqs = skillPrerequisites[skillId] || [];
    for (const prereqId of prereqs) {
      const progress = allProgress.find(p => p.skillId === prereqId);
      const mastery = progress ? calculateMasteryV2(progress).percentage : 0;

      if (mastery < MASTERY_FOR_ADVANCEMENT) {
        findUnmastered(prereqId, depth + 1);
        if (!path.includes(prereqId)) {
          path.push(prereqId);
        }
      }
    }
  }

  findUnmastered(targetSkillId, 0);
  path.push(targetSkillId);

  return path;
}

/**
 * Build complete learning path for a grade, respecting prerequisites.
 * Returns skills in optimal learning order.
 */
export function buildOptimalLearningPath(
  gradeSkillIds: string[],
  allProgress: StudentSkillProgress[]
): LearningPathNode[] {
  const nodes: LearningPathNode[] = [];
  const masteryCache = new Map<string, number>();

  // Cache mastery calculations
  for (const progress of allProgress) {
    const result = calculateMasteryV2(progress);
    masteryCache.set(progress.skillId, result.percentage);
  }

  // Build dependency graph
  const dependentsMap = new Map<string, string[]>();
  for (const skillId of gradeSkillIds) {
    const prereqs = skillPrerequisites[skillId] || [];
    for (const prereqId of prereqs) {
      const deps = dependentsMap.get(prereqId) || [];
      deps.push(skillId);
      dependentsMap.set(prereqId, deps);
    }
  }

  for (const skillId of gradeSkillIds) {
    const mastery = masteryCache.get(skillId) || 0;
    const prereqs = skillPrerequisites[skillId] || [];
    const dependents = dependentsMap.get(skillId) || [];

    // Calculate depth (longest chain to a foundation skill)
    const depth = calculateDepth(skillId, new Set());

    // Determine status
    let status: LearningPathNode['status'];
    if (mastery >= MASTERY_FOR_ADVANCEMENT) {
      status = 'mastered';
    } else if (prereqs.length === 0) {
      status = mastery > 0 ? 'ready' : 'not_started';
    } else {
      const allPrereqsMet = prereqs.every(p => (masteryCache.get(p) || 0) >= HARD_GATE_THRESHOLD);
      status = allPrereqsMet ? 'ready' : 'blocked';
    }

    nodes.push({
      skillId,
      depth,
      mastery,
      status,
      prerequisites: prereqs,
      dependents,
    });
  }

  // Sort: ready skills first, then by depth (shallower first)
  return nodes.sort((a, b) => {
    const statusOrder = { ready: 0, not_started: 1, blocked: 2, mastered: 3 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.depth - b.depth;
  });
}

function calculateDepth(skillId: string, visited: Set<string>): number {
  if (visited.has(skillId)) return 0;
  visited.add(skillId);

  const prereqs = skillPrerequisites[skillId] || [];
  if (prereqs.length === 0) return 0;

  let maxDepth = 0;
  for (const prereqId of prereqs) {
    const d = calculateDepth(prereqId, visited);
    if (d + 1 > maxDepth) maxDepth = d + 1;
  }
  return maxDepth;
}

// ============ Graph Analysis ============

/**
 * Analyze the full skill graph to find bottlenecks, critical paths, and ready skills.
 */
export function analyzeSkillGraph(
  gradeSkillIds: string[],
  allProgress: StudentSkillProgress[]
): SkillGraphAnalysis {
  const masteryCache = new Map<string, number>();
  for (const progress of allProgress) {
    masteryCache.set(progress.skillId, calculateMasteryV2(progress).percentage);
  }

  let masteredCount = 0;
  const readyToLearn: string[] = [];
  const blockedSkills: string[] = [];

  // Build dependents count
  const dependentCount = new Map<string, number>();
  for (const skillId of gradeSkillIds) {
    const prereqs = skillPrerequisites[skillId] || [];
    for (const prereqId of prereqs) {
      dependentCount.set(prereqId, (dependentCount.get(prereqId) || 0) + 1);
    }
  }

  for (const skillId of gradeSkillIds) {
    const mastery = masteryCache.get(skillId) || 0;

    if (mastery >= MASTERY_FOR_ADVANCEMENT) {
      masteredCount++;
      continue;
    }

    const prereqs = skillPrerequisites[skillId] || [];
    if (prereqs.length === 0) {
      if (mastery < MASTERY_FOR_ADVANCEMENT) readyToLearn.push(skillId);
    } else {
      const allMet = prereqs.every(p => (masteryCache.get(p) || 0) >= HARD_GATE_THRESHOLD);
      if (allMet) {
        readyToLearn.push(skillId);
      } else {
        blockedSkills.push(skillId);
      }
    }
  }

  // Find bottlenecks: unmastered skills that block the most dependents
  const bottlenecks = gradeSkillIds
    .filter(id => (masteryCache.get(id) || 0) < HARD_GATE_THRESHOLD)
    .filter(id => (dependentCount.get(id) || 0) > 0)
    .sort((a, b) => (dependentCount.get(b) || 0) - (dependentCount.get(a) || 0))
    .slice(0, 5);

  // Find critical path (longest unmastered chain)
  const criticalPath = findCriticalPath(gradeSkillIds, masteryCache);

  return {
    totalSkills: gradeSkillIds.length,
    masteredCount,
    readyToLearn,
    blockedSkills,
    criticalPath,
    bottlenecks,
  };
}

function findCriticalPath(
  skillIds: string[],
  masteryCache: Map<string, number>
): string[] {
  let longestPath: string[] = [];

  for (const skillId of skillIds) {
    if ((masteryCache.get(skillId) || 0) >= MASTERY_FOR_ADVANCEMENT) continue;

    const path = traceUnmasteredChain(skillId, masteryCache, new Set());
    if (path.length > longestPath.length) {
      longestPath = path;
    }
  }

  return longestPath;
}

function traceUnmasteredChain(
  skillId: string,
  masteryCache: Map<string, number>,
  visited: Set<string>
): string[] {
  if (visited.has(skillId)) return [];
  visited.add(skillId);

  const mastery = masteryCache.get(skillId) || 0;
  if (mastery >= MASTERY_FOR_ADVANCEMENT) return [];

  const prereqs = skillPrerequisites[skillId] || [];
  let longestSubchain: string[] = [];

  for (const prereqId of prereqs) {
    const subchain = traceUnmasteredChain(prereqId, masteryCache, visited);
    if (subchain.length > longestSubchain.length) {
      longestSubchain = subchain;
    }
  }

  return [...longestSubchain, skillId];
}

// ============ Automatic Fallback ============

/**
 * When a student fails repeatedly on a skill, find the deepest weak prerequisite
 * to fall back to. Implements "automatic regression to foundation".
 */
export function findFallbackSkill(
  failedSkillId: string,
  allProgress: StudentSkillProgress[],
  maxDepth: number = MAX_FALLBACK_DEPTH
): { fallbackId: string; chain: string[]; reason: string } | null {
  const chain = getFullPrerequisiteChain(failedSkillId);
  if (chain.length === 0) return null;

  // Find the weakest prerequisite in the chain (up to maxDepth)
  let weakestId = '';
  let weakestMastery = 100;
  const limitedChain = chain.slice(0, maxDepth * 2); // limit search

  for (const prereqId of limitedChain) {
    const progress = allProgress.find(p => p.skillId === prereqId);
    const mastery = progress ? calculateMasteryV2(progress).percentage : 0;

    if (mastery < weakestMastery) {
      weakestMastery = mastery;
      weakestId = prereqId;
    }
  }

  if (!weakestId || weakestMastery >= HARD_GATE_THRESHOLD) return null;

  // Build the path from fallback to failed skill
  const pathToTarget = buildSuggestedPath(weakestId, failedSkillId, allProgress);

  return {
    fallbackId: weakestId,
    chain: pathToTarget,
    reason: weakestMastery < 30
      ? 'لم يتقن المهارة الأساسية - يحتاج بناء من الصفر'
      : 'مهارة سابقة ضعيفة - يحتاج تعزيز',
  };
}

/**
 * Determine if student should be redirected based on consecutive failures.
 * Returns null if no redirection needed.
 */
export function shouldRedirect(
  currentSkillId: string,
  consecutiveWrong: number,
  allProgress: StudentSkillProgress[]
): { redirectTo: string; reason: string } | null {
  // After 3 consecutive wrong, check prerequisites
  if (consecutiveWrong < 3) return null;

  const fallback = findFallbackSkill(currentSkillId, allProgress);
  if (fallback) {
    return {
      redirectTo: fallback.fallbackId,
      reason: fallback.reason,
    };
  }

  return null;
}