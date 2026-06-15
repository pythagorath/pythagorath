// Phase 5.5 Deep - Enhanced Skill Graph Engine
// Sub-skills, pathfinding, hanging skill detection, recommendation engine
// Builds on prerequisiteGating with deeper graph analysis

import { skillPrerequisites, getFullPrerequisiteChain } from '@/data/skillPrerequisites';
import { calculateMasteryV2 } from './masteryEngineV2';
import type { StudentSkillProgress } from '@/data/mathSkillsData';

// ============ Types ============

export interface SubSkill {
  id: string;
  parentSkillId: string;
  nameAr: string;
  weight: number; // 0-1, contribution to parent mastery
  mastery: number; // 0-100
  practiceCount: number;
}

export interface SkillNode {
  id: string;
  nameAr: string;
  grade: number;
  category: string;
  mastery: number;
  status: 'mastered' | 'learning' | 'ready' | 'blocked' | 'hanging' | 'not_started';
  prerequisites: string[];
  dependents: string[];
  subSkills: SubSkill[];
  depth: number; // Distance from foundation
  breadth: number; // Number of siblings at same depth
  criticalityScore: number; // How many skills depend on this
  isBottleneck: boolean;
  isHanging: boolean; // Has no dependents and isn't mastered
}

export interface SkillPath {
  nodes: string[];
  totalEstimatedTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  reason: string;
}

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  avgBranching: number;
  completionRate: number;
  bottleneckCount: number;
  hangingCount: number;
  strongestChain: string[];
  weakestChain: string[];
  nextOptimalSkills: string[];
}

export interface SkillRecommendation {
  skillId: string;
  nameAr: string;
  reason: RecommendationReason;
  priority: number;
  estimatedMinutes: number;
  prerequisitesMet: boolean;
  pathToMastery: string[];
}

export type RecommendationReason =
  | 'bottleneck_unblock'   // Mastering this unblocks many skills
  | 'hanging_complete'     // Finish an isolated skill
  | 'chain_continue'       // Continue current learning chain
  | 'weakness_address'     // Address a weak area
  | 'retention_review'     // Review for retention
  | 'zpd_optimal';         // In zone of proximal development

// ============ Sub-Skill Definitions ============

/**
 * Define sub-skills for major skills.
 * Each parent skill decomposes into 2-4 sub-skills.
 */
const SUB_SKILL_MAP: Record<string, { nameAr: string; weight: number }[]> = {
  'G1-N-012': [ // الجمع ضمن 10
    { nameAr: 'جمع عددين مجموعهما ≤ 5', weight: 0.3 },
    { nameAr: 'جمع عددين مجموعهما ≤ 10', weight: 0.4 },
    { nameAr: 'جمع مع الصفر', weight: 0.15 },
    { nameAr: 'جمع المكمل للعشرة', weight: 0.15 },
  ],
  'G1-N-013': [ // الطرح ضمن 10
    { nameAr: 'طرح من أعداد ≤ 5', weight: 0.3 },
    { nameAr: 'طرح من أعداد ≤ 10', weight: 0.4 },
    { nameAr: 'طرح الصفر', weight: 0.15 },
    { nameAr: 'طرح العدد من نفسه', weight: 0.15 },
  ],
  'G2-C-001': [ // الجمع ضمن 20
    { nameAr: 'جمع بدون حمل', weight: 0.3 },
    { nameAr: 'جمع مع حمل (تجاوز العشرة)', weight: 0.4 },
    { nameAr: 'جمع ثلاثة أعداد', weight: 0.3 },
  ],
  'G2-C-003': [ // الجمع ضمن 100
    { nameAr: 'جمع عشرات كاملة', weight: 0.25 },
    { nameAr: 'جمع عدد من رقمين + رقم واحد', weight: 0.35 },
    { nameAr: 'جمع عددين من رقمين بدون حمل', weight: 0.2 },
    { nameAr: 'جمع عددين من رقمين مع حمل', weight: 0.2 },
  ],
  'G2-C-004': [ // الطرح ضمن 100
    { nameAr: 'طرح عشرات كاملة', weight: 0.25 },
    { nameAr: 'طرح رقم واحد من عدد من رقمين', weight: 0.35 },
    { nameAr: 'طرح بدون استلاف', weight: 0.2 },
    { nameAr: 'طرح مع استلاف', weight: 0.2 },
  ],
  'G1-N-002': [ // العد من 1 إلى 10
    { nameAr: 'العد التصاعدي', weight: 0.4 },
    { nameAr: 'العد التنازلي', weight: 0.3 },
    { nameAr: 'العد من رقم معين', weight: 0.3 },
  ],
  'G2-N-001': [ // قراءة الأعداد حتى 100
    { nameAr: 'قراءة أعداد العشرات', weight: 0.3 },
    { nameAr: 'قراءة أعداد من رقمين', weight: 0.4 },
    { nameAr: 'تمييز القيمة المكانية', weight: 0.3 },
  ],
};

// ============ Core Graph Functions ============

/**
 * Build enhanced skill graph with sub-skills, metrics, and analysis.
 */
export function buildEnhancedGraph(
  gradeSkillIds: string[],
  allProgress: StudentSkillProgress[],
  skillNames: Record<string, string>
): { nodes: SkillNode[]; metrics: GraphMetrics } {
  const masteryCache = new Map<string, number>();
  for (const p of allProgress) {
    masteryCache.set(p.skillId, calculateMasteryV2(p).percentage);
  }

  // Build dependents map
  const dependentsMap = new Map<string, string[]>();
  for (const skillId of gradeSkillIds) {
    const prereqs = skillPrerequisites[skillId] || [];
    for (const prereqId of prereqs) {
      const deps = dependentsMap.get(prereqId) || [];
      deps.push(skillId);
      dependentsMap.set(prereqId, deps);
    }
  }

  // Build nodes
  const nodes: SkillNode[] = gradeSkillIds.map(skillId => {
    const mastery = masteryCache.get(skillId) || 0;
    const prereqs = skillPrerequisites[skillId] || [];
    const dependents = dependentsMap.get(skillId) || [];
    const depth = calculateNodeDepth(skillId, new Set());
    const criticalityScore = calculateCriticality(skillId, dependentsMap, new Set());

    // Sub-skills
    const subSkillDefs = SUB_SKILL_MAP[skillId] || [];
    const subSkills: SubSkill[] = subSkillDefs.map((def, i) => ({
      id: `${skillId}_sub_${i}`,
      parentSkillId: skillId,
      nameAr: def.nameAr,
      weight: def.weight,
      mastery: mastery * (0.8 + Math.random() * 0.4), // Approximate from parent
      practiceCount: 0,
    }));

    // Determine status
    const allPrereqsMet = prereqs.every(p => (masteryCache.get(p) || 0) >= 60);
    let status: SkillNode['status'];
    if (mastery >= 80) status = 'mastered';
    else if (mastery >= 30) status = 'learning';
    else if (prereqs.length === 0 || allPrereqsMet) status = mastery > 0 ? 'ready' : 'not_started';
    else status = 'blocked';

    // Hanging: has no dependents, not mastered, and not a leaf in curriculum
    const isHanging = dependents.length === 0 && mastery < 70 && prereqs.length > 0;
    if (isHanging) status = 'hanging';

    const isBottleneck = criticalityScore >= 3 && mastery < 60;

    return {
      id: skillId,
      nameAr: skillNames[skillId] || skillId,
      grade: skillId.startsWith('G1') ? 1 : 2,
      category: skillId.split('-')[1] || 'N',
      mastery,
      status,
      prerequisites: prereqs,
      dependents,
      subSkills,
      depth,
      breadth: 0, // Calculated below
      criticalityScore,
      isBottleneck,
      isHanging,
    };
  });

  // Calculate breadth (siblings at same depth)
  const depthGroups = new Map<number, number>();
  for (const node of nodes) {
    depthGroups.set(node.depth, (depthGroups.get(node.depth) || 0) + 1);
  }
  for (const node of nodes) {
    node.breadth = depthGroups.get(node.depth) || 1;
  }

  // Calculate metrics
  const metrics = calculateGraphMetrics(nodes, gradeSkillIds, masteryCache);

  return { nodes, metrics };
}

function calculateNodeDepth(skillId: string, visited: Set<string>): number {
  if (visited.has(skillId)) return 0;
  visited.add(skillId);
  const prereqs = skillPrerequisites[skillId] || [];
  if (prereqs.length === 0) return 0;
  let maxDepth = 0;
  for (const p of prereqs) {
    const d = calculateNodeDepth(p, new Set([...visited]));
    if (d + 1 > maxDepth) maxDepth = d + 1;
  }
  return maxDepth;
}

function calculateCriticality(
  skillId: string,
  dependentsMap: Map<string, string[]>,
  visited: Set<string>
): number {
  if (visited.has(skillId)) return 0;
  visited.add(skillId);
  const directDeps = dependentsMap.get(skillId) || [];
  let total = directDeps.length;
  for (const dep of directDeps) {
    total += calculateCriticality(dep, dependentsMap, visited);
  }
  return total;
}

function calculateGraphMetrics(
  nodes: SkillNode[],
  allIds: string[],
  masteryCache: Map<string, number>
): GraphMetrics {
  let totalEdges = 0;
  let maxDepth = 0;

  for (const node of nodes) {
    totalEdges += node.prerequisites.length;
    if (node.depth > maxDepth) maxDepth = node.depth;
  }

  const avgBranching = nodes.length > 0 ? totalEdges / nodes.length : 0;
  const masteredCount = nodes.filter(n => n.mastery >= 70).length;
  const completionRate = nodes.length > 0 ? (masteredCount / nodes.length) * 100 : 0;
  const bottleneckCount = nodes.filter(n => n.isBottleneck).length;
  const hangingCount = nodes.filter(n => n.isHanging).length;

  // Find strongest chain (longest mastered sequence)
  const strongestChain = findLongestChain(nodes, n => n.mastery >= 70);
  const weakestChain = findLongestChain(nodes, n => n.mastery < 40 && n.status !== 'blocked');

  // Next optimal skills (ready + not mastered, sorted by criticality)
  const nextOptimalSkills = nodes
    .filter(n => (n.status === 'ready' || n.status === 'not_started') && n.mastery < 70)
    .sort((a, b) => b.criticalityScore - a.criticalityScore)
    .slice(0, 5)
    .map(n => n.id);

  return {
    totalNodes: nodes.length,
    totalEdges,
    maxDepth,
    avgBranching: Math.round(avgBranching * 10) / 10,
    completionRate: Math.round(completionRate),
    bottleneckCount,
    hangingCount,
    strongestChain: strongestChain.map(n => n.id),
    weakestChain: weakestChain.map(n => n.id),
    nextOptimalSkills,
  };
}

function findLongestChain(nodes: SkillNode[], filter: (n: SkillNode) => boolean): SkillNode[] {
  const filtered = nodes.filter(filter);
  if (filtered.length === 0) return [];

  let longest: SkillNode[] = [];

  for (const startNode of filtered) {
    const chain = traceChain(startNode, filtered, new Set());
    if (chain.length > longest.length) {
      longest = chain;
    }
  }

  return longest;
}

function traceChain(node: SkillNode, pool: SkillNode[], visited: Set<string>): SkillNode[] {
  if (visited.has(node.id)) return [];
  visited.add(node.id);

  let longestSub: SkillNode[] = [];
  for (const depId of node.dependents) {
    const depNode = pool.find(n => n.id === depId);
    if (depNode) {
      const sub = traceChain(depNode, pool, visited);
      if (sub.length > longestSub.length) longestSub = sub;
    }
  }

  return [node, ...longestSub];
}

// ============ Pathfinding ============

/**
 * Find shortest learning path from current state to target skill.
 * Uses BFS on prerequisite graph, only including unmastered skills.
 */
export function findShortestPath(
  targetSkillId: string,
  allProgress: StudentSkillProgress[],
  skillNames: Record<string, string>
): SkillPath | null {
  const masteryCache = new Map<string, number>();
  for (const p of allProgress) {
    masteryCache.set(p.skillId, calculateMasteryV2(p).percentage);
  }

  // If already mastered, no path needed
  if ((masteryCache.get(targetSkillId) || 0) >= 70) {
    return { nodes: [], totalEstimatedTime: 0, difficulty: 'easy', reason: 'مهارة متقنة بالفعل' };
  }

  // BFS backwards from target to find all unmastered prerequisites
  const path: string[] = [];
  const queue: string[] = [targetSkillId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const mastery = masteryCache.get(current) || 0;
    if (mastery < 70) {
      path.push(current);
      const prereqs = skillPrerequisites[current] || [];
      for (const p of prereqs) {
        if (!visited.has(p)) queue.push(p);
      }
    }
  }

  // Reverse to get learning order (foundations first)
  path.reverse();

  if (path.length === 0) return null;

  // Estimate time (5 min per unmastered skill)
  const totalEstimatedTime = path.length * 5;
  const difficulty = path.length > 5 ? 'hard' : path.length > 3 ? 'medium' : 'easy';

  return {
    nodes: path,
    totalEstimatedTime,
    difficulty,
    reason: `${path.length} مهارة تحتاج إتقان للوصول إلى "${skillNames[targetSkillId] || targetSkillId}"`,
  };
}

// ============ Hanging Skill Detection ============

/**
 * Find skills that are "hanging" - started but abandoned, no dependents pushing them.
 */
export function findHangingSkills(
  nodes: SkillNode[]
): { skillId: string; nameAr: string; mastery: number; daysSinceActivity: number }[] {
  return nodes
    .filter(n => n.isHanging)
    .map(n => ({
      skillId: n.id,
      nameAr: n.nameAr,
      mastery: n.mastery,
      daysSinceActivity: 0, // Would need progress data to calculate
    }))
    .sort((a, b) => b.mastery - a.mastery); // Higher mastery = closer to completion
}

// ============ Recommendation Engine ============

/**
 * Generate prioritized skill recommendations based on graph analysis.
 */
export function generateSkillRecommendations(
  nodes: SkillNode[],
  maxRecommendations: number = 5
): SkillRecommendation[] {
  const recommendations: SkillRecommendation[] = [];

  // Priority 1: Bottleneck skills (unblock the most)
  const bottlenecks = nodes
    .filter(n => n.isBottleneck && n.status !== 'blocked')
    .sort((a, b) => b.criticalityScore - a.criticalityScore);

  for (const node of bottlenecks.slice(0, 2)) {
    recommendations.push({
      skillId: node.id,
      nameAr: node.nameAr,
      reason: 'bottleneck_unblock',
      priority: 90 + node.criticalityScore,
      estimatedMinutes: Math.ceil((70 - node.mastery) / 10) * 3,
      prerequisitesMet: node.status !== 'blocked',
      pathToMastery: [node.id],
    });
  }

  // Priority 2: ZPD optimal (mastery 30-60%, prerequisites met)
  const zpdSkills = nodes
    .filter(n => n.mastery >= 30 && n.mastery < 60 && (n.status === 'learning' || n.status === 'ready'))
    .sort((a, b) => b.criticalityScore - a.criticalityScore);

  for (const node of zpdSkills.slice(0, 2)) {
    if (recommendations.some(r => r.skillId === node.id)) continue;
    recommendations.push({
      skillId: node.id,
      nameAr: node.nameAr,
      reason: 'zpd_optimal',
      priority: 75,
      estimatedMinutes: 5,
      prerequisitesMet: true,
      pathToMastery: [node.id],
    });
  }

  // Priority 3: Hanging skills (close to completion)
  const hanging = nodes
    .filter(n => n.isHanging && n.mastery >= 40)
    .sort((a, b) => b.mastery - a.mastery);

  for (const node of hanging.slice(0, 1)) {
    if (recommendations.some(r => r.skillId === node.id)) continue;
    recommendations.push({
      skillId: node.id,
      nameAr: node.nameAr,
      reason: 'hanging_complete',
      priority: 60,
      estimatedMinutes: Math.ceil((70 - node.mastery) / 15) * 3,
      prerequisitesMet: true,
      pathToMastery: [node.id],
    });
  }

  // Priority 4: Chain continuation (continue where student left off)
  const learning = nodes
    .filter(n => n.status === 'learning')
    .sort((a, b) => b.mastery - a.mastery);

  for (const node of learning.slice(0, 1)) {
    if (recommendations.some(r => r.skillId === node.id)) continue;
    recommendations.push({
      skillId: node.id,
      nameAr: node.nameAr,
      reason: 'chain_continue',
      priority: 55,
      estimatedMinutes: 5,
      prerequisitesMet: true,
      pathToMastery: [node.id],
    });
  }

  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxRecommendations);
}