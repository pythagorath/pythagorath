// Phase 5.5 Decision Engine - Curriculum Knowledge Graph
// Dynamic graph with relationships: prerequisite, reinforces, extends
// Query functions, gap analysis, path optimization

import { skillPrerequisites } from '@/data/skillPrerequisites';
import { calculateMasteryV2 } from './masteryEngineV2';
import type { StudentSkillProgress } from '@/data/mathSkillsData';

// ============ Types ============

export type RelationType = 'prerequisite' | 'reinforces' | 'extends' | 'parallel' | 'inverse';

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: RelationType;
  strength: number; // 0-1, how strong the relationship
  bidirectional: boolean;
}

export interface KnowledgeNode {
  id: string;
  nameAr: string;
  grade: number;
  category: string;
  domain: KnowledgeDomain;
  complexity: number; // 1-5
  estimatedMinutes: number;
  mastery: number;
  edges: KnowledgeEdge[];
}

export type KnowledgeDomain =
  | 'number_sense'
  | 'operations'
  | 'geometry'
  | 'measurement'
  | 'patterns'
  | 'data'
  | 'problem_solving';

export interface KnowledgeGapAnalysis {
  gaps: KnowledgeGap[];
  criticalPath: string[];
  estimatedRecoveryMinutes: number;
  recommendations: GapRecommendation[];
}

export interface KnowledgeGap {
  skillId: string;
  nameAr: string;
  gapSeverity: 'minor' | 'moderate' | 'critical';
  blockedSkills: string[];
  prerequisitesMet: boolean;
  estimatedEffort: number; // minutes
}

export interface GapRecommendation {
  skillId: string;
  action: 'learn' | 'review' | 'remediate' | 'assess';
  priority: number;
  reason: string;
}

export interface GraphQuery {
  type: 'path' | 'neighbors' | 'gaps' | 'cluster' | 'reachable';
  fromSkillId?: string;
  toSkillId?: string;
  maxDepth?: number;
  relationFilter?: RelationType[];
}

export interface GraphQueryResult {
  nodes: string[];
  edges: KnowledgeEdge[];
  metadata: Record<string, unknown>;
}

// ============ Knowledge Domain Mapping ============

const CATEGORY_TO_DOMAIN: Record<string, KnowledgeDomain> = {
  'N': 'number_sense',
  'C': 'operations',
  'G': 'geometry',
  'M': 'measurement',
  'P': 'patterns',
  'D': 'data',
  'T': 'problem_solving',
  'A': 'operations',
  'F': 'number_sense',
};

// ============ Reinforcement Relationships ============
// Skills that reinforce each other (not prerequisites, but related)

const REINFORCEMENT_EDGES: [string, string, number][] = [
  // Counting reinforces addition
  ['G1-N-002', 'G1-N-012', 0.7],
  ['G1-N-005', 'G1-N-012', 0.6],
  // Addition reinforces subtraction understanding
  ['G1-N-012', 'G1-N-013', 0.8],
  // Place value reinforces multi-digit operations
  ['G2-N-001', 'G2-C-003', 0.9],
  ['G2-N-002', 'G2-C-004', 0.9],
  // Patterns reinforce number sense
  ['G1-P-001', 'G1-N-016', 0.5],
  // Geometry reinforces spatial reasoning for number line
  ['G1-G-001', 'G1-N-005', 0.4],
  // Measurement extends number operations
  ['G1-M-001', 'G1-N-012', 0.5],
  ['G2-M-001', 'G2-C-003', 0.6],
];

// ============ Core Graph Construction ============

/**
 * Build the full curriculum knowledge graph.
 */
export function buildKnowledgeGraph(
  skillIds: string[],
  skillNames: Record<string, string>,
  allProgress: StudentSkillProgress[]
): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const masteryCache = new Map<string, number>();
  for (const p of allProgress) {
    masteryCache.set(p.skillId, calculateMasteryV2(p).percentage);
  }

  const allEdges: KnowledgeEdge[] = [];

  // Build prerequisite edges
  for (const skillId of skillIds) {
    const prereqs = skillPrerequisites[skillId] || [];
    for (const prereqId of prereqs) {
      allEdges.push({
        from: prereqId,
        to: skillId,
        relation: 'prerequisite',
        strength: 1.0,
        bidirectional: false,
      });
    }
  }

  // Build reinforcement edges
  for (const [from, to, strength] of REINFORCEMENT_EDGES) {
    if (skillIds.includes(from) && skillIds.includes(to)) {
      allEdges.push({
        from,
        to,
        relation: 'reinforces',
        strength,
        bidirectional: true,
      });
    }
  }

  // Build extension edges (same category, higher grade)
  for (const skillId of skillIds) {
    if (skillId.startsWith('G1')) {
      const g2Equivalent = skillId.replace('G1', 'G2');
      if (skillIds.includes(g2Equivalent)) {
        allEdges.push({
          from: skillId,
          to: g2Equivalent,
          relation: 'extends',
          strength: 0.8,
          bidirectional: false,
        });
      }
    }
  }

  // Build nodes
  const nodes: KnowledgeNode[] = skillIds.map(id => {
    const category = id.split('-')[1] || 'N';
    const grade = id.startsWith('G1') ? 1 : 2;
    const nodeEdges = allEdges.filter(e => e.from === id || e.to === id);
    const mastery = masteryCache.get(id) || 0;

    return {
      id,
      nameAr: skillNames[id] || id,
      grade,
      category,
      domain: CATEGORY_TO_DOMAIN[category] || 'number_sense',
      complexity: estimateComplexity(id, nodeEdges),
      estimatedMinutes: 5 + Math.floor(Math.random() * 5),
      mastery,
      edges: nodeEdges,
    };
  });

  return { nodes, edges: allEdges };
}

function estimateComplexity(skillId: string, edges: KnowledgeEdge[]): number {
  const prereqCount = edges.filter(e => e.to === skillId && e.relation === 'prerequisite').length;
  const grade = skillId.startsWith('G1') ? 1 : 2;
  return Math.min(5, grade + prereqCount);
}

// ============ Graph Queries ============

/**
 * Query the knowledge graph for various analyses.
 */
export function queryKnowledgeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  query: GraphQuery
): GraphQueryResult {
  switch (query.type) {
    case 'path':
      return findPath(nodes, edges, query.fromSkillId!, query.toSkillId!);
    case 'neighbors':
      return findNeighbors(nodes, edges, query.fromSkillId!, query.maxDepth || 1, query.relationFilter);
    case 'gaps':
      return findGaps(nodes, edges);
    case 'cluster':
      return findCluster(nodes, edges, query.fromSkillId!);
    case 'reachable':
      return findReachable(nodes, edges, query.fromSkillId!, query.maxDepth || 10);
    default:
      return { nodes: [], edges: [], metadata: {} };
  }
}

function findPath(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  fromId: string,
  toId: string
): GraphQueryResult {
  // BFS shortest path
  const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (id === toId) {
      const pathEdges = edges.filter(e =>
        path.includes(e.from) && path.includes(e.to)
      );
      return { nodes: path, edges: pathEdges, metadata: { pathLength: path.length } };
    }
    if (visited.has(id)) continue;
    visited.add(id);

    const outgoing = edges.filter(e => e.from === id || (e.bidirectional && e.to === id));
    for (const edge of outgoing) {
      const nextId = edge.from === id ? edge.to : edge.from;
      if (!visited.has(nextId)) {
        queue.push({ id: nextId, path: [...path, nextId] });
      }
    }
  }

  return { nodes: [], edges: [], metadata: { pathFound: false } };
}

function findNeighbors(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  skillId: string,
  maxDepth: number,
  relationFilter?: RelationType[]
): GraphQueryResult {
  const visited = new Set<string>();
  const queue: { id: string; depth: number }[] = [{ id: skillId, depth: 0 }];
  const resultNodes: string[] = [];
  const resultEdges: KnowledgeEdge[] = [];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);
    if (id !== skillId) resultNodes.push(id);

    const connected = edges.filter(e => {
      const isConnected = e.from === id || e.to === id || (e.bidirectional && (e.from === id || e.to === id));
      if (!isConnected) return false;
      if (relationFilter && !relationFilter.includes(e.relation)) return false;
      return true;
    });

    for (const edge of connected) {
      resultEdges.push(edge);
      const nextId = edge.from === id ? edge.to : edge.from;
      if (!visited.has(nextId)) {
        queue.push({ id: nextId, depth: depth + 1 });
      }
    }
  }

  return { nodes: resultNodes, edges: resultEdges, metadata: { depth: maxDepth } };
}

function findGaps(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): GraphQueryResult {
  // Find skills with low mastery that block other skills
  const gapNodes = nodes
    .filter(n => n.mastery < 60)
    .filter(n => {
      const dependents = edges.filter(e => e.from === n.id && e.relation === 'prerequisite');
      return dependents.length > 0;
    })
    .map(n => n.id);

  const gapEdges = edges.filter(e => gapNodes.includes(e.from) || gapNodes.includes(e.to));

  return { nodes: gapNodes, edges: gapEdges, metadata: { gapCount: gapNodes.length } };
}

function findCluster(nodes: KnowledgeNode[], edges: KnowledgeEdge[], skillId: string): GraphQueryResult {
  // Find all skills in the same domain/category cluster
  const node = nodes.find(n => n.id === skillId);
  if (!node) return { nodes: [], edges: [], metadata: {} };

  const clusterNodes = nodes
    .filter(n => n.domain === node.domain && n.grade === node.grade)
    .map(n => n.id);

  const clusterEdges = edges.filter(e => clusterNodes.includes(e.from) && clusterNodes.includes(e.to));

  return { nodes: clusterNodes, edges: clusterEdges, metadata: { domain: node.domain } };
}

function findReachable(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  fromId: string,
  maxDepth: number
): GraphQueryResult {
  const visited = new Set<string>();
  const queue: { id: string; depth: number }[] = [{ id: fromId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    const outgoing = edges.filter(e => e.from === id);
    for (const edge of outgoing) {
      if (!visited.has(edge.to)) {
        queue.push({ id: edge.to, depth: depth + 1 });
      }
    }
  }

  visited.delete(fromId);
  return { nodes: [...visited], edges: [], metadata: { reachableCount: visited.size } };
}

// ============ Gap Analysis ============

/**
 * Perform comprehensive gap analysis for a student.
 */
export function analyzeKnowledgeGaps(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): KnowledgeGapAnalysis {
  const gaps: KnowledgeGap[] = [];

  for (const node of nodes) {
    if (node.mastery >= 70) continue;

    // Find skills blocked by this gap
    const blockedSkills = edges
      .filter(e => e.from === node.id && e.relation === 'prerequisite')
      .map(e => e.to);

    // Check if prerequisites are met
    const prereqEdges = edges.filter(e => e.to === node.id && e.relation === 'prerequisite');
    const prereqsMet = prereqEdges.every(e => {
      const prereqNode = nodes.find(n => n.id === e.from);
      return prereqNode ? prereqNode.mastery >= 60 : true;
    });

    const severity: KnowledgeGap['gapSeverity'] =
      blockedSkills.length >= 3 ? 'critical' :
      blockedSkills.length >= 1 ? 'moderate' : 'minor';

    gaps.push({
      skillId: node.id,
      nameAr: node.nameAr,
      gapSeverity: severity,
      blockedSkills,
      prerequisitesMet: prereqsMet,
      estimatedEffort: node.estimatedMinutes * (1 - node.mastery / 100),
    });
  }

  // Sort by severity and blocked count
  gaps.sort((a, b) => {
    const severityOrder = { critical: 0, moderate: 1, minor: 2 };
    const sDiff = severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity];
    if (sDiff !== 0) return sDiff;
    return b.blockedSkills.length - a.blockedSkills.length;
  });

  // Critical path: ordered sequence to address gaps
  const criticalPath = gaps
    .filter(g => g.prerequisitesMet && g.gapSeverity !== 'minor')
    .map(g => g.skillId)
    .slice(0, 10);

  const estimatedRecoveryMinutes = gaps.reduce((sum, g) => sum + g.estimatedEffort, 0);

  // Recommendations
  const recommendations: GapRecommendation[] = gaps.slice(0, 5).map((gap, i) => ({
    skillId: gap.skillId,
    action: !gap.prerequisitesMet ? 'remediate' as const :
      gap.gapSeverity === 'critical' ? 'learn' as const :
      gap.gapSeverity === 'moderate' ? 'review' as const : 'assess' as const,
    priority: 10 - i,
    reason: gap.gapSeverity === 'critical'
      ? `يحجب ${gap.blockedSkills.length} مهارات أخرى`
      : `مستوى الإتقان منخفض`,
  }));

  return { gaps, criticalPath, estimatedRecoveryMinutes: Math.round(estimatedRecoveryMinutes), recommendations };
}