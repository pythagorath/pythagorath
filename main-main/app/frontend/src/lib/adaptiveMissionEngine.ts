// Real-Time Adaptive Educational Intelligence Sprint
// Module 7: Adaptive Mission Engine
// Missions evolve dynamically during usage based on live signals

import { loadUserData, saveUserData } from './pilotStorage';
import { type RealTimeSignals } from './realTimeTelemetry';

// ============ Types ============

export interface AdaptiveMission {
  id: string;
  studentId: string;
  title: string;
  titleAr: string;
  type: MissionType;
  status: MissionStatus;
  difficulty: number;
  targetSkills: string[];
  objectives: MissionObjective[];
  adaptations: MissionAdaptation[];
  rewards: MissionReward;
  startedAt: string;
  completedAt: string | null;
  dynamicParams: DynamicMissionParams;
}

export type MissionType =
  | 'skill_mastery'
  | 'practice_streak'
  | 'exploration'
  | 'remediation'
  | 'challenge'
  | 'review'
  | 'speed_run'
  | 'accuracy_focus'
  | 'cognitive_growth';

export type MissionStatus = 'available' | 'active' | 'adapted' | 'completed' | 'failed' | 'expired' | 'abandoned';

export interface MissionObjective {
  id: string;
  descriptionAr: string;
  type: ObjectiveType;
  target: number;
  current: number;
  completed: boolean;
  adaptedFrom?: number;
}

export type ObjectiveType =
  | 'correct_answers'
  | 'streak_length'
  | 'time_on_task'
  | 'skills_practiced'
  | 'mastery_gained'
  | 'no_hints_used'
  | 'self_corrections'
  | 'speed_target';

export interface MissionAdaptation {
  timestamp: string;
  reason: string;
  changes: string[];
  triggerSignal: string;
}

export interface MissionReward {
  points: number;
  badge?: string;
  bonusMultiplier: number;
}

export interface DynamicMissionParams {
  difficultyFloor: number;
  difficultyCeiling: number;
  timeLimit: number | null;
  hintBudget: number;
  mistakeAllowance: number;
  adaptationEnabled: boolean;
  frustrationThreshold: number;
  boredomThreshold: number;
}

// ============ Templates ============

interface MissionTemplate {
  type: MissionType;
  titleAr: string;
  objectives: Array<{ type: ObjectiveType; baseTarget: number; descAr: string }>;
  baseReward: MissionReward;
  baseDifficulty: number;
  suitableFor: Array<'struggling' | 'developing' | 'proficient' | 'mastered'>;
}

const TEMPLATES: MissionTemplate[] = [
  {
    type: 'practice_streak',
    titleAr: 'تحدي السلسلة',
    objectives: [{ type: 'streak_length', baseTarget: 5, descAr: 'سلسلة إجابات صحيحة' }],
    baseReward: { points: 20, bonusMultiplier: 1.0 },
    baseDifficulty: 4,
    suitableFor: ['developing', 'proficient'],
  },
  {
    type: 'skill_mastery',
    titleAr: 'إتقان مهارة',
    objectives: [{ type: 'mastery_gained', baseTarget: 20, descAr: 'نقاط إتقان مكتسبة' }],
    baseReward: { points: 30, badge: 'skill_master', bonusMultiplier: 1.2 },
    baseDifficulty: 5,
    suitableFor: ['developing', 'proficient'],
  },
  {
    type: 'remediation',
    titleAr: 'صحح وتعلم',
    objectives: [
      { type: 'correct_answers', baseTarget: 5, descAr: 'إجابات صحيحة' },
      { type: 'self_corrections', baseTarget: 2, descAr: 'تصحيحات ذاتية' },
    ],
    baseReward: { points: 25, bonusMultiplier: 1.3 },
    baseDifficulty: 3,
    suitableFor: ['struggling', 'developing'],
  },
  {
    type: 'challenge',
    titleAr: 'وضع التحدي',
    objectives: [
      { type: 'correct_answers', baseTarget: 8, descAr: 'إجابات صحيحة' },
      { type: 'no_hints_used', baseTarget: 1, descAr: 'بدون تلميحات' },
    ],
    baseReward: { points: 40, badge: 'challenger', bonusMultiplier: 1.5 },
    baseDifficulty: 7,
    suitableFor: ['proficient', 'mastered'],
  },
  {
    type: 'speed_run',
    titleAr: 'سباق السرعة',
    objectives: [
      { type: 'speed_target', baseTarget: 5, descAr: 'إجابات سريعة' },
      { type: 'correct_answers', baseTarget: 5, descAr: 'إجابات صحيحة' },
    ],
    baseReward: { points: 35, bonusMultiplier: 1.4 },
    baseDifficulty: 6,
    suitableFor: ['proficient', 'mastered'],
  },
  {
    type: 'exploration',
    titleAr: 'استكشف مهارات جديدة',
    objectives: [{ type: 'skills_practiced', baseTarget: 3, descAr: 'مهارات تمت ممارستها' }],
    baseReward: { points: 15, bonusMultiplier: 1.0 },
    baseDifficulty: 3,
    suitableFor: ['struggling', 'developing', 'proficient'],
  },
  {
    type: 'accuracy_focus',
    titleAr: 'تدريب الدقة',
    objectives: [{ type: 'correct_answers', baseTarget: 10, descAr: 'إجابات صحيحة' }],
    baseReward: { points: 25, bonusMultiplier: 1.2 },
    baseDifficulty: 5,
    suitableFor: ['developing', 'proficient'],
  },
  {
    type: 'cognitive_growth',
    titleAr: 'بناء العقل',
    objectives: [
      { type: 'time_on_task', baseTarget: 10, descAr: 'دقائق تركيز' },
      { type: 'mastery_gained', baseTarget: 10, descAr: 'نقاط إتقان' },
    ],
    baseReward: { points: 30, badge: 'brain_builder', bonusMultiplier: 1.3 },
    baseDifficulty: 4,
    suitableFor: ['struggling', 'developing', 'proficient'],
  },
];

// ============ State ============

const activeMissions: Map<string, AdaptiveMission> = new Map();
const completedMissions: AdaptiveMission[] = [];

// ============ Core Functions ============

export function generateMission(
  studentId: string,
  skillIds: string[],
  studentLevel: 'struggling' | 'developing' | 'proficient' | 'mastered',
  signals?: RealTimeSignals
): AdaptiveMission {
  const suitable = TEMPLATES.filter(t => t.suitableFor.includes(studentLevel));
  const template = suitable[Math.floor(Math.random() * suitable.length)] || TEMPLATES[0];

  let difficulty = template.baseDifficulty;
  if (signals) {
    if (signals.frustrationScore > 50) difficulty = Math.max(1, difficulty - 2);
    if (signals.confidenceScore > 80) difficulty = Math.min(10, difficulty + 1);
  }

  const objectives: MissionObjective[] = template.objectives.map((obj, idx) => ({
    id: `obj_${idx}`,
    descriptionAr: obj.descAr,
    type: obj.type,
    target: adjustTarget(obj.baseTarget, difficulty, studentLevel),
    current: 0,
    completed: false,
  }));

  const mission: AdaptiveMission = {
    id: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    studentId,
    title: template.titleAr,
    titleAr: template.titleAr,
    type: template.type,
    status: 'available',
    difficulty,
    targetSkills: skillIds.slice(0, 3),
    objectives,
    adaptations: [],
    rewards: { ...template.baseReward, points: Math.round(template.baseReward.points * (difficulty / 5)) },
    startedAt: new Date().toISOString(),
    completedAt: null,
    dynamicParams: {
      difficultyFloor: Math.max(1, difficulty - 2),
      difficultyCeiling: Math.min(10, difficulty + 2),
      timeLimit: null,
      hintBudget: studentLevel === 'struggling' ? 5 : 3,
      mistakeAllowance: studentLevel === 'struggling' ? 5 : 3,
      adaptationEnabled: true,
      frustrationThreshold: 60,
      boredomThreshold: 30,
    },
  };

  activeMissions.set(mission.id, mission);
  return mission;
}

export function adaptMissionRealTime(missionId: string, signals: RealTimeSignals): MissionAdaptation | null {
  const mission = activeMissions.get(missionId);
  if (!mission || !mission.dynamicParams.adaptationEnabled) return null;

  const changes: string[] = [];
  let reason = '';
  let triggerSignal = '';

  // Frustration too high - ease the mission
  if (signals.frustrationScore > mission.dynamicParams.frustrationThreshold) {
    reason = 'إحباط مرتفع - تسهيل المهمة';
    triggerSignal = `frustration:${signals.frustrationScore.toFixed(0)}`;

    mission.objectives.forEach(obj => {
      if (!obj.completed) {
        const newTarget = Math.max(Math.ceil(obj.target * 0.7), obj.current + 1);
        if (newTarget < obj.target) {
          obj.adaptedFrom = obj.adaptedFrom ?? obj.target;
          changes.push(`هدف "${obj.descriptionAr}": ${obj.target} → ${newTarget}`);
          obj.target = newTarget;
        }
      }
    });

    mission.dynamicParams.hintBudget += 2;
    mission.dynamicParams.mistakeAllowance += 2;
    changes.push('زيادة ميزانية التلميحات');
  }
  // Boredom/low engagement - increase challenge
  else if (signals.engagementScore < mission.dynamicParams.boredomThreshold && signals.confidenceScore > 70) {
    reason = 'ملل مع ثقة عالية - زيادة التحدي';
    triggerSignal = `engagement:${signals.engagementScore.toFixed(0)}`;

    mission.objectives.forEach(obj => {
      if (!obj.completed) {
        const newTarget = Math.min(Math.ceil(obj.target * 1.3), obj.target + 5);
        if (newTarget > obj.target) {
          obj.adaptedFrom = obj.adaptedFrom ?? obj.target;
          changes.push(`هدف "${obj.descriptionAr}": ${obj.target} → ${newTarget}`);
          obj.target = newTarget;
        }
      }
    });

    mission.rewards.bonusMultiplier = Math.min(2.0, mission.rewards.bonusMultiplier + 0.2);
    changes.push('زيادة مضاعف المكافأة');
  }
  // Cognitive overload - simplify
  else if (signals.cognitiveLoadScore > 75) {
    reason = 'حمل معرفي مرتفع - تبسيط';
    triggerSignal = `cogLoad:${signals.cognitiveLoadScore.toFixed(0)}`;

    mission.dynamicParams.mistakeAllowance += 1;
    mission.difficulty = Math.max(mission.dynamicParams.difficultyFloor, mission.difficulty - 1);
    changes.push('تخفيض الصعوبة وزيادة هامش الخطأ');
  } else {
    return null; // No adaptation needed
  }

  if (changes.length === 0) return null;

  const adaptation: MissionAdaptation = {
    timestamp: new Date().toISOString(),
    reason,
    changes,
    triggerSignal,
  };

  mission.adaptations.push(adaptation);
  mission.status = 'adapted';

  return adaptation;
}

export function updateMissionProgress(
  missionId: string,
  objectiveType: ObjectiveType,
  increment: number = 1
): boolean {
  const mission = activeMissions.get(missionId);
  if (!mission || mission.status === 'completed' || mission.status === 'failed') return false;

  if (mission.status === 'available') mission.status = 'active';

  let allCompleted = true;
  mission.objectives.forEach(obj => {
    if (obj.type === objectiveType && !obj.completed) {
      obj.current = Math.min(obj.target, obj.current + increment);
      if (obj.current >= obj.target) {
        obj.completed = true;
      }
    }
    if (!obj.completed) allCompleted = false;
  });

  if (allCompleted) {
    mission.status = 'completed';
    mission.completedAt = new Date().toISOString();
    completedMissions.push(mission);
    activeMissions.delete(missionId);
    return true;
  }

  return false;
}

export function failMission(missionId: string): void {
  const mission = activeMissions.get(missionId);
  if (mission) {
    mission.status = 'failed';
    activeMissions.delete(missionId);
  }
}

export function getActiveMissions(studentId: string): AdaptiveMission[] {
  const missions: AdaptiveMission[] = [];
  activeMissions.forEach(m => {
    if (m.studentId === studentId) missions.push(m);
  });
  return missions;
}

export function getCompletedMissions(studentId: string): AdaptiveMission[] {
  return completedMissions.filter(m => m.studentId === studentId);
}

export function getMissionById(missionId: string): AdaptiveMission | null {
  return activeMissions.get(missionId) ?? null;
}

export function persistMissions(studentId: string): void {
  const active = getActiveMissions(studentId);
  const completed = getCompletedMissions(studentId);
  saveUserData(`missions_active_${studentId}`, active);
  saveUserData(`missions_completed_${studentId}`, completed.slice(-20));
}

export function loadMissions(studentId: string): void {
  const active = loadUserData<AdaptiveMission[]>(`missions_active_${studentId}`);
  if (active) {
    active.forEach(m => activeMissions.set(m.id, m));
  }
}

// ============ Helpers ============

function adjustTarget(baseTarget: number, difficulty: number, level: string): number {
  const multiplier = difficulty / 5;
  let adjusted = Math.round(baseTarget * multiplier);

  if (level === 'struggling') adjusted = Math.max(2, Math.round(adjusted * 0.6));
  else if (level === 'mastered') adjusted = Math.round(adjusted * 1.4);

  return Math.max(1, adjusted);
}