// Assessment Intelligence Sprint - Assessment State Persistence
// Educational state tracking, mastery persistence, interaction telemetry,
// assessment synchronization, and adaptive consistency

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface AssessmentState {
  studentId: string;
  lastUpdated: string;
  version: number;
  masterySnapshot: MasterySnapshot;
  activeRemediations: ActiveRemediation[];
  assessmentQueue: QueuedAssessment[];
  telemetryBuffer: TelemetryEvent[];
  syncStatus: SyncStatus;
  adaptiveConfig: AdaptiveConfig;
}

export interface MasterySnapshot {
  skills: Record<string, SkillMasteryState>;
  overallLevel: number; // 0-100
  lastAssessmentDate: string;
  totalAssessments: number;
  streakDays: number;
}

export interface SkillMasteryState {
  level: number; // 0-100
  confidence: number; // 0-100
  lastPracticed: string;
  practiceCount: number;
  decayRate: number; // how fast this skill decays without practice
  nextReviewDate: string;
}

export interface ActiveRemediation {
  id: string;
  skillId: string;
  misconceptionId: string | null;
  startedAt: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  progress: number; // 0-100
  sessionsCompleted: number;
  sessionsTotal: number;
  lastSessionAt: string;
}

export interface QueuedAssessment {
  id: string;
  type: 'diagnostic' | 'mastery_check' | 'review' | 'placement';
  skillIds: string[];
  priority: number; // 1 = highest
  scheduledFor: string;
  reason: string;
  createdAt: string;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: TelemetryType;
  data: Record<string, unknown>;
  synced: boolean;
}

export type TelemetryType =
  | 'assessment_started'
  | 'assessment_completed'
  | 'question_answered'
  | 'misconception_detected'
  | 'remediation_started'
  | 'remediation_progress'
  | 'mastery_updated'
  | 'session_ended'
  | 'state_restored';

export interface SyncStatus {
  lastSyncAt: string;
  pendingEvents: number;
  syncErrors: number;
  isOnline: boolean;
  retryCount: number;
}

export interface AdaptiveConfig {
  difficultyLevel: number; // 1-10
  pacingSpeed: 'slow' | 'normal' | 'fast';
  scaffoldingLevel: 'high' | 'medium' | 'low' | 'none';
  preferredInteractions: string[];
  sessionLengthMinutes: number;
  breakFrequencyMinutes: number;
}

// ============ State Manager ============

export class AssessmentStateManager {
  private state: AssessmentState;
  private studentId: string;
  private dirty: boolean = false;

  constructor(studentId: string) {
    this.studentId = studentId;
    this.state = this.loadState();
  }

  // ============ State Access ============

  getState(): AssessmentState {
    return { ...this.state };
  }

  getMasterySnapshot(): MasterySnapshot {
    return { ...this.state.masterySnapshot };
  }

  getSkillMastery(skillId: string): SkillMasteryState | null {
    return this.state.masterySnapshot.skills[skillId] || null;
  }

  getActiveRemediations(): ActiveRemediation[] {
    return [...this.state.activeRemediations];
  }

  getAssessmentQueue(): QueuedAssessment[] {
    return [...this.state.assessmentQueue].sort((a, b) => a.priority - b.priority);
  }

  getAdaptiveConfig(): AdaptiveConfig {
    return { ...this.state.adaptiveConfig };
  }

  // ============ Mastery Updates ============

  updateSkillMastery(skillId: string, newLevel: number, confidence: number): void {
    const existing = this.state.masterySnapshot.skills[skillId];
    const now = new Date().toISOString();

    this.state.masterySnapshot.skills[skillId] = {
      level: Math.max(0, Math.min(100, Math.round(newLevel))),
      confidence: Math.max(0, Math.min(100, Math.round(confidence))),
      lastPracticed: now,
      practiceCount: (existing?.practiceCount ?? 0) + 1,
      decayRate: calculateDecayRate(newLevel, existing?.practiceCount ?? 0),
      nextReviewDate: calculateNextReview(newLevel, existing?.practiceCount ?? 0),
    };

    // Update overall level
    const skills = Object.values(this.state.masterySnapshot.skills);
    this.state.masterySnapshot.overallLevel = skills.length > 0
      ? Math.round(skills.reduce((s, sk) => s + sk.level, 0) / skills.length)
      : 0;

    this.state.masterySnapshot.lastAssessmentDate = now;
    this.state.masterySnapshot.totalAssessments++;

    this.addTelemetry('mastery_updated', { skillId, newLevel, confidence });
    this.dirty = true;
  }

  // ============ Remediation Management ============

  startRemediation(skillId: string, misconceptionId: string | null, totalSessions: number): string {
    const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const remediation: ActiveRemediation = {
      id,
      skillId,
      misconceptionId,
      startedAt: new Date().toISOString(),
      status: 'active',
      progress: 0,
      sessionsCompleted: 0,
      sessionsTotal: totalSessions,
      lastSessionAt: new Date().toISOString(),
    };

    this.state.activeRemediations.push(remediation);
    this.addTelemetry('remediation_started', { skillId, misconceptionId });
    this.dirty = true;
    return id;
  }

  updateRemediationProgress(remediationId: string, sessionsCompleted: number): void {
    const rem = this.state.activeRemediations.find(r => r.id === remediationId);
    if (!rem) return;

    rem.sessionsCompleted = sessionsCompleted;
    rem.progress = Math.round((sessionsCompleted / rem.sessionsTotal) * 100);
    rem.lastSessionAt = new Date().toISOString();

    if (rem.sessionsCompleted >= rem.sessionsTotal) {
      rem.status = 'completed';
    }

    this.addTelemetry('remediation_progress', { remediationId, progress: rem.progress });
    this.dirty = true;
  }

  // ============ Assessment Queue ============

  queueAssessment(type: QueuedAssessment['type'], skillIds: string[], priority: number, reason: string): string {
    const id = `aq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const assessment: QueuedAssessment = {
      id,
      type,
      skillIds,
      priority,
      scheduledFor: new Date().toISOString(),
      reason,
      createdAt: new Date().toISOString(),
    };

    this.state.assessmentQueue.push(assessment);
    // Keep queue manageable
    this.state.assessmentQueue = this.state.assessmentQueue
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 10);

    this.dirty = true;
    return id;
  }

  dequeueAssessment(): QueuedAssessment | null {
    if (this.state.assessmentQueue.length === 0) return null;
    const next = this.state.assessmentQueue.shift()!;
    this.dirty = true;
    return next;
  }

  // ============ Adaptive Config ============

  updateAdaptiveConfig(updates: Partial<AdaptiveConfig>): void {
    this.state.adaptiveConfig = { ...this.state.adaptiveConfig, ...updates };
    this.dirty = true;
  }

  // ============ Telemetry ============

  addTelemetry(type: TelemetryType, data: Record<string, unknown>): void {
    const event: TelemetryEvent = {
      id: `tel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      data,
      synced: false,
    };

    this.state.telemetryBuffer.push(event);
    this.state.syncStatus.pendingEvents = this.state.telemetryBuffer.filter(e => !e.synced).length;

    // Keep buffer manageable
    if (this.state.telemetryBuffer.length > 100) {
      this.state.telemetryBuffer = this.state.telemetryBuffer.slice(-50);
    }

    this.dirty = true;
  }

  // ============ Decay & Review ============

  applyMasteryDecay(): void {
    const now = Date.now();

    for (const [skillId, skill] of Object.entries(this.state.masterySnapshot.skills)) {
      const lastPracticed = new Date(skill.lastPracticed).getTime();
      const daysSince = (now - lastPracticed) / 86400000;

      if (daysSince > 1) {
        // Exponential decay based on skill-specific rate
        const decayFactor = Math.pow(1 - skill.decayRate, daysSince);
        const newLevel = Math.max(10, Math.round(skill.level * decayFactor));

        if (newLevel < skill.level) {
          this.state.masterySnapshot.skills[skillId] = {
            ...skill,
            level: newLevel,
            confidence: Math.max(20, skill.confidence - Math.round(daysSince * 2)),
          };
        }
      }
    }

    this.dirty = true;
  }

  getSkillsNeedingReview(): string[] {
    const now = new Date().toISOString();
    return Object.entries(this.state.masterySnapshot.skills)
      .filter(([, skill]) => skill.nextReviewDate <= now)
      .map(([skillId]) => skillId);
  }

  // ============ Persistence ============

  save(): void {
    if (!this.dirty) return;
    this.state.lastUpdated = new Date().toISOString();
    this.state.version++;
    saveUserData(`assessment_state_${this.studentId}`, this.state);
    this.dirty = false;
  }

  private loadState(): AssessmentState {
    const saved = loadUserData<AssessmentState>(`assessment_state_${this.studentId}`);
    if (saved) {
      this.addTelemetry('state_restored', { version: saved.version });
      return saved;
    }
    return this.createDefaultState();
  }

  private createDefaultState(): AssessmentState {
    return {
      studentId: this.studentId,
      lastUpdated: new Date().toISOString(),
      version: 1,
      masterySnapshot: {
        skills: {},
        overallLevel: 0,
        lastAssessmentDate: '',
        totalAssessments: 0,
        streakDays: 0,
      },
      activeRemediations: [],
      assessmentQueue: [],
      telemetryBuffer: [],
      syncStatus: {
        lastSyncAt: new Date().toISOString(),
        pendingEvents: 0,
        syncErrors: 0,
        isOnline: true,
        retryCount: 0,
      },
      adaptiveConfig: {
        difficultyLevel: 5,
        pacingSpeed: 'normal',
        scaffoldingLevel: 'medium',
        preferredInteractions: ['fill_blank', 'multiple_choice', 'drag_drop'],
        sessionLengthMinutes: 20,
        breakFrequencyMinutes: 10,
      },
    };
  }
}

// ============ Utility Functions ============

function calculateDecayRate(masteryLevel: number, practiceCount: number): number {
  // Higher mastery + more practice = slower decay
  const masteryFactor = masteryLevel / 100;
  const practiceFactor = Math.min(1, practiceCount / 10);
  return Math.max(0.01, 0.1 * (1 - masteryFactor * 0.5) * (1 - practiceFactor * 0.3));
}

function calculateNextReview(masteryLevel: number, practiceCount: number): string {
  // Spaced repetition: higher mastery = longer intervals
  const baseDays = 1;
  const masteryMultiplier = 1 + (masteryLevel / 100) * 5; // 1-6x
  const practiceMultiplier = 1 + Math.min(3, practiceCount * 0.3); // 1-4x
  const intervalDays = Math.round(baseDays * masteryMultiplier * practiceMultiplier);

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate.toISOString();
}

// ============ Global Analytics ============

export function getClassAssessmentState(studentIds: string[]): {
  avgOverallMastery: number;
  activeRemediationCount: number;
  pendingAssessments: number;
  studentsWithDecay: number;
  avgStreakDays: number;
} {
  let totalMastery = 0;
  let totalRemediations = 0;
  let totalPending = 0;
  let decayCount = 0;
  let totalStreak = 0;
  let count = 0;

  for (const studentId of studentIds) {
    const state = loadUserData<AssessmentState>(`assessment_state_${studentId}`);
    if (!state) continue;

    totalMastery += state.masterySnapshot.overallLevel;
    totalRemediations += state.activeRemediations.filter(r => r.status === 'active').length;
    totalPending += state.assessmentQueue.length;
    totalStreak += state.masterySnapshot.streakDays;
    count++;

    // Check for decay
    const skillsNeedReview = Object.values(state.masterySnapshot.skills)
      .filter(s => new Date(s.nextReviewDate) < new Date());
    if (skillsNeedReview.length > 2) decayCount++;
  }

  return {
    avgOverallMastery: count > 0 ? Math.round(totalMastery / count) : 0,
    activeRemediationCount: totalRemediations,
    pendingAssessments: totalPending,
    studentsWithDecay: decayCount,
    avgStreakDays: count > 0 ? Math.round(totalStreak / count) : 0,
  };
}