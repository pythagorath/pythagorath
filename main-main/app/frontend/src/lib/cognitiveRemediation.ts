// Phase 5.5 - Cognitive Remediation Flow
// Structured scaffolding: hint → example → worked example → guided practice → retry
// Tracks misconceptions, provides targeted remediation, and measures improvement
// Integrates with prerequisiteGating and masteryEngineV2

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export type ScaffoldStage =
  | 'independent'      // No support - student tries alone
  | 'hint'             // Subtle hint about approach
  | 'visual_cue'      // Visual representation of the problem
  | 'worked_example'   // Full worked example shown
  | 'guided_practice'  // Step-by-step with feedback at each step
  | 'direct_teach';    // Explicit instruction before retry

export type RemediationType =
  | 'prerequisite_gap'   // Missing foundational knowledge
  | 'procedural_error'   // Knows concept but makes step errors
  | 'conceptual_error'   // Fundamental misunderstanding
  | 'fluency_deficit'    // Understands but too slow/uncertain
  | 'attention_error';   // Careless mistakes from inattention

export interface RemediationState {
  skillId: string;
  currentStage: ScaffoldStage;
  stageHistory: ScaffoldStageRecord[];
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalAttempts: number;
  remediationType: RemediationType;
  misconceptionId: string | null;
  startedAt: string;
  lastAttemptAt: string;
  resolved: boolean;
  improvementScore: number; // 0-100, tracks progress through remediation
}

export interface ScaffoldStageRecord {
  stage: ScaffoldStage;
  timestamp: string;
  wasCorrect: boolean;
  responseTime: number;
  escalatedFrom: ScaffoldStage | null;
}

export interface ScaffoldContent {
  stage: ScaffoldStage;
  titleAr: string;
  contentAr: string;
  emoji: string;
  visualType: 'none' | 'number_line' | 'blocks' | 'diagram' | 'animation';
  interactionType: 'observe' | 'guided_click' | 'fill_blank' | 'full_solve';
  timeAllowed: number; // seconds, 0 = unlimited
}

export interface RemediationPlan {
  skillId: string;
  remediationType: RemediationType;
  stages: ScaffoldContent[];
  estimatedDuration: number; // seconds
  prerequisitesToReview: string[];
  successCriteria: {
    minCorrect: number;
    minConsecutive: number;
    maxAttempts: number;
  };
}

export interface RemediationOutcome {
  skillId: string;
  resolved: boolean;
  stagesUsed: number;
  totalAttempts: number;
  finalAccuracy: number;
  timeSpent: number;
  improvementFromStart: number;
}

// ============ Configuration ============

const ESCALATION_THRESHOLD = 2; // Failures before escalating scaffold
const DE_ESCALATION_THRESHOLD = 3; // Successes before reducing scaffold
const MAX_REMEDIATION_ATTEMPTS = 15; // Give up after this many
const RESOLUTION_CONSECUTIVE = 3; // Consecutive correct to resolve

// ============ Scaffold Stage Ordering ============

const STAGE_ORDER: ScaffoldStage[] = [
  'independent',
  'hint',
  'visual_cue',
  'worked_example',
  'guided_practice',
  'direct_teach',
];

function getStageIndex(stage: ScaffoldStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function getNextStage(current: ScaffoldStage): ScaffoldStage {
  const idx = getStageIndex(current);
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : current;
}

function getPreviousStage(current: ScaffoldStage): ScaffoldStage {
  const idx = getStageIndex(current);
  return idx > 0 ? STAGE_ORDER[idx - 1] : current;
}

// ============ Core Remediation Logic ============

/**
 * Initialize a new remediation session for a struggling skill.
 */
export function initRemediation(
  skillId: string,
  remediationType: RemediationType,
  misconceptionId?: string
): RemediationState {
  return {
    skillId,
    currentStage: 'hint', // Start with a hint, not fully independent
    stageHistory: [],
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    totalAttempts: 0,
    remediationType,
    misconceptionId: misconceptionId || null,
    startedAt: new Date().toISOString(),
    lastAttemptAt: new Date().toISOString(),
    resolved: false,
    improvementScore: 0,
  };
}

/**
 * Process an answer during remediation and determine next scaffold level.
 * This is the core adaptive scaffolding engine.
 */
export function processRemediationAnswer(
  state: RemediationState,
  isCorrect: boolean,
  responseTime: number
): {
  updatedState: RemediationState;
  action: 'escalate' | 'de_escalate' | 'maintain' | 'resolve' | 'give_up';
  message: string;
  nextStage: ScaffoldStage;
} {
  const safeTime = Number.isFinite(responseTime) && responseTime > 0 ? responseTime : 10;

  const record: ScaffoldStageRecord = {
    stage: state.currentStage,
    timestamp: new Date().toISOString(),
    wasCorrect: isCorrect,
    responseTime: safeTime,
    escalatedFrom: null,
  };

  const updated: RemediationState = {
    ...state,
    totalAttempts: state.totalAttempts + 1,
    lastAttemptAt: new Date().toISOString(),
    stageHistory: [...state.stageHistory, record],
  };

  if (isCorrect) {
    updated.consecutiveSuccesses = state.consecutiveSuccesses + 1;
    updated.consecutiveFailures = 0;

    // Calculate improvement
    const totalCorrect = updated.stageHistory.filter(r => r.wasCorrect).length;
    updated.improvementScore = Math.min(100, Math.round((totalCorrect / Math.max(1, updated.totalAttempts)) * 100));

    // Check if resolved
    if (updated.consecutiveSuccesses >= RESOLUTION_CONSECUTIVE) {
      updated.resolved = true;
      return {
        updatedState: updated,
        action: 'resolve',
        message: 'أحسنت! لقد أتقنت هذه المهارة 🌟',
        nextStage: 'independent',
      };
    }

    // De-escalate if doing well
    if (updated.consecutiveSuccesses >= DE_ESCALATION_THRESHOLD) {
      const prevStage = getPreviousStage(state.currentStage);
      updated.currentStage = prevStage;
      updated.consecutiveSuccesses = 0; // Reset after de-escalation

      return {
        updatedState: updated,
        action: 'de_escalate',
        message: getDeEscalationMessage(prevStage),
        nextStage: prevStage,
      };
    }

    return {
      updatedState: updated,
      action: 'maintain',
      message: 'ممتاز! استمر 💪',
      nextStage: state.currentStage,
    };
  }

  // Wrong answer
  updated.consecutiveFailures = state.consecutiveFailures + 1;
  updated.consecutiveSuccesses = 0;

  // Check if should give up
  if (updated.totalAttempts >= MAX_REMEDIATION_ATTEMPTS) {
    return {
      updatedState: updated,
      action: 'give_up',
      message: 'خلنا نرجع لهذه المهارة بكرة بطاقة جديدة 🌱',
      nextStage: state.currentStage,
    };
  }

  // Escalate scaffold
  if (updated.consecutiveFailures >= ESCALATION_THRESHOLD) {
    const nextStage = getNextStage(state.currentStage);
    updated.currentStage = nextStage;
    updated.consecutiveFailures = 0; // Reset after escalation

    record.escalatedFrom = state.currentStage;

    return {
      updatedState: updated,
      action: 'escalate',
      message: getEscalationMessage(nextStage, state.remediationType),
      nextStage,
    };
  }

  return {
    updatedState: updated,
    action: 'maintain',
    message: getEncouragementMessage(state.currentStage),
    nextStage: state.currentStage,
  };
}

// ============ Scaffold Content Generation ============

/**
 * Generate scaffold content for a specific stage and skill.
 * Returns structured content for the UI to render.
 */
export function generateScaffoldContent(
  stage: ScaffoldStage,
  skillId: string,
  remediationType: RemediationType,
  questionContext?: { question: string; correctAnswer: string; options?: string[] }
): ScaffoldContent {
  switch (stage) {
    case 'independent':
      return {
        stage: 'independent',
        titleAr: 'حاول بنفسك',
        contentAr: 'أنت تستطيع! فكر جيداً ثم أجب',
        emoji: '🎯',
        visualType: 'none',
        interactionType: 'full_solve',
        timeAllowed: 0,
      };

    case 'hint':
      return {
        stage: 'hint',
        titleAr: 'تلميح',
        contentAr: generateHintContent(skillId, remediationType),
        emoji: '💡',
        visualType: 'none',
        interactionType: 'full_solve',
        timeAllowed: 0,
      };

    case 'visual_cue':
      return {
        stage: 'visual_cue',
        titleAr: 'شاهد وتعلم',
        contentAr: generateVisualCueContent(skillId),
        emoji: '👀',
        visualType: getVisualTypeForSkill(skillId),
        interactionType: 'observe',
        timeAllowed: 30,
      };

    case 'worked_example':
      return {
        stage: 'worked_example',
        titleAr: 'مثال محلول',
        contentAr: generateWorkedExample(skillId, questionContext),
        emoji: '📝',
        visualType: getVisualTypeForSkill(skillId),
        interactionType: 'observe',
        timeAllowed: 45,
      };

    case 'guided_practice':
      return {
        stage: 'guided_practice',
        titleAr: 'تدريب موجّه',
        contentAr: 'سنحل معاً خطوة بخطوة. اتبع التعليمات.',
        emoji: '🤝',
        visualType: getVisualTypeForSkill(skillId),
        interactionType: 'guided_click',
        timeAllowed: 60,
      };

    case 'direct_teach':
      return {
        stage: 'direct_teach',
        titleAr: 'شرح مباشر',
        contentAr: generateDirectTeachContent(skillId, remediationType),
        emoji: '👨‍🏫',
        visualType: getVisualTypeForSkill(skillId),
        interactionType: 'observe',
        timeAllowed: 60,
      };
  }
}

/**
 * Create a full remediation plan for a skill.
 */
export function createRemediationPlan(
  skillId: string,
  remediationType: RemediationType,
  prerequisitesToReview: string[] = []
): RemediationPlan {
  const stages = STAGE_ORDER.map(stage =>
    generateScaffoldContent(stage, skillId, remediationType)
  );

  // Estimate duration based on remediation type
  const baseDuration = remediationType === 'conceptual_error' ? 300
    : remediationType === 'prerequisite_gap' ? 240
    : remediationType === 'procedural_error' ? 180
    : 120;

  return {
    skillId,
    remediationType,
    stages,
    estimatedDuration: baseDuration,
    prerequisitesToReview,
    successCriteria: {
      minCorrect: 3,
      minConsecutive: RESOLUTION_CONSECUTIVE,
      maxAttempts: MAX_REMEDIATION_ATTEMPTS,
    },
  };
}

// ============ Remediation Type Detection ============

/**
 * Detect the type of remediation needed based on error patterns.
 */
export function detectRemediationType(
  consecutiveWrong: number,
  avgResponseTime: number,
  hasPrerequisiteGap: boolean,
  errorPattern: 'random' | 'consistent' | 'improving' | 'declining'
): RemediationType {
  // Fast wrong answers with random errors = attention
  if (avgResponseTime < 3 && errorPattern === 'random') {
    return 'attention_error';
  }

  // Prerequisite gap detected
  if (hasPrerequisiteGap) {
    return 'prerequisite_gap';
  }

  // Consistent errors in same type = conceptual
  if (errorPattern === 'consistent' && consecutiveWrong >= 3) {
    return 'conceptual_error';
  }

  // Declining performance = procedural (was doing it right, now confused)
  if (errorPattern === 'declining') {
    return 'procedural_error';
  }

  // Slow but sometimes correct = fluency
  if (avgResponseTime > 15 && consecutiveWrong < 3) {
    return 'fluency_deficit';
  }

  // Default
  return consecutiveWrong >= 4 ? 'conceptual_error' : 'procedural_error';
}

// ============ Persistence ============

const REMEDIATION_STORAGE_KEY = 'pythagorasRemediationStates';

export function loadRemediationStates(): Record<string, RemediationState> {
  return loadUserData<Record<string, RemediationState>>(REMEDIATION_STORAGE_KEY, {});
}

export function saveRemediationState(state: RemediationState): void {
  const all = loadRemediationStates();
  all[state.skillId] = state;
  saveUserData(REMEDIATION_STORAGE_KEY, all);
}

export function getActiveRemediation(skillId: string): RemediationState | null {
  const all = loadRemediationStates();
  const state = all[skillId];
  if (state && !state.resolved) return state;
  return null;
}

export function resolveRemediation(skillId: string): RemediationOutcome | null {
  const all = loadRemediationStates();
  const state = all[skillId];
  if (!state) return null;

  const totalCorrect = state.stageHistory.filter(r => r.wasCorrect).length;
  const totalTime = state.stageHistory.reduce((sum, r) => sum + r.responseTime, 0);
  const stagesUsed = new Set(state.stageHistory.map(r => r.stage)).size;

  const outcome: RemediationOutcome = {
    skillId,
    resolved: state.resolved,
    stagesUsed,
    totalAttempts: state.totalAttempts,
    finalAccuracy: state.totalAttempts > 0 ? Math.round((totalCorrect / state.totalAttempts) * 100) : 0,
    timeSpent: totalTime,
    improvementFromStart: state.improvementScore,
  };

  // Mark as resolved
  all[skillId] = { ...state, resolved: true };
  saveUserData(REMEDIATION_STORAGE_KEY, all);

  return outcome;
}

// ============ Helper Functions ============

function generateHintContent(skillId: string, type: RemediationType): string {
  const skillCategory = skillId.split('-')[1]; // N, G, C, M, etc.

  if (type === 'attention_error') {
    return 'خذ وقتك! اقرأ السؤال مرة ثانية ببطء 🐢';
  }

  switch (skillCategory) {
    case 'N': return 'فكر في الأعداد... استخدم أصابعك إذا احتجت 🖐️';
    case 'G': return 'تخيل الشكل في ذهنك... كم ضلع له؟ 🔷';
    case 'C': return 'ابدأ من اليمين... خطوة بخطوة ✏️';
    case 'M': return 'قارن بين الأشياء... أيهما أكبر؟ 📏';
    case 'P': return 'ابحث عن النمط... ماذا يتكرر؟ 🔄';
    case 'D': return 'انظر للبيانات بعناية... عد كل مجموعة 📊';
    case 'T': return 'فكر في الوقت... أين يشير العقرب؟ ⏰';
    default: return 'فكر جيداً... الإجابة قريبة! 🌟';
  }
}

function generateVisualCueContent(skillId: string): string {
  const skillCategory = skillId.split('-')[1];

  switch (skillCategory) {
    case 'N': return 'شاهد خط الأعداد وتتبع الأرقام بعينيك';
    case 'G': return 'انظر للأشكال وقارن بينها';
    case 'C': return 'شاهد كيف نجمع/نطرح باستخدام المكعبات';
    case 'M': return 'قارن الأطوال/الأوزان بصرياً';
    default: return 'شاهد الرسم التوضيحي بعناية';
  }
}

function generateWorkedExample(
  skillId: string,
  context?: { question: string; correctAnswer: string }
): string {
  if (context) {
    return `مثال مشابه: ${context.question}\nالحل: ${context.correctAnswer}\nالآن حاول حل سؤالك بنفس الطريقة`;
  }
  return 'شاهد المثال المحلول ثم حاول بنفسك';
}

function generateDirectTeachContent(skillId: string, type: RemediationType): string {
  if (type === 'prerequisite_gap') {
    return 'لنرجع للأساسيات. هذه المهارة تحتاج أن تتقن مهارة سابقة أولاً.';
  }
  if (type === 'conceptual_error') {
    return 'هناك فكرة مهمة يجب أن نفهمها أولاً. اسمع الشرح جيداً.';
  }
  if (type === 'procedural_error') {
    return 'الخطوات مهمة! تابع الترتيب: أولاً... ثم... ثم...';
  }
  return 'لنتعلم هذا معاً. ركز جيداً.';
}

function getVisualTypeForSkill(skillId: string): ScaffoldContent['visualType'] {
  const category = skillId.split('-')[1];
  switch (category) {
    case 'N': return 'number_line';
    case 'C': return 'blocks';
    case 'G': return 'diagram';
    default: return 'blocks';
  }
}

function getEscalationMessage(newStage: ScaffoldStage, type: RemediationType): string {
  switch (newStage) {
    case 'hint': return 'خلني أعطيك تلميح 💡';
    case 'visual_cue': return 'شاهد هذا الرسم، يساعدك 👀';
    case 'worked_example': return 'شوف كيف نحل مثال مشابه 📝';
    case 'guided_practice': return 'خلنا نحل معاً خطوة بخطوة 🤝';
    case 'direct_teach': return 'لنتعلم هذا المفهوم من البداية 👨‍🏫';
    default: return 'لا بأس، خلنا نجرب طريقة ثانية';
  }
}

function getDeEscalationMessage(newStage: ScaffoldStage): string {
  switch (newStage) {
    case 'independent': return 'رائع! حاول الآن بنفسك 🎯';
    case 'hint': return 'ممتاز! سأعطيك تلميح بسيط فقط 💡';
    case 'visual_cue': return 'أحسنت! شاهد الرسم وحاول 👀';
    default: return 'تقدم رائع! 🌟';
  }
}

function getEncouragementMessage(stage: ScaffoldStage): string {
  switch (stage) {
    case 'independent': return 'حاول مرة ثانية، أنت قريب! 💪';
    case 'hint': return 'فكر في التلميح وحاول مرة أخرى 🤔';
    case 'visual_cue': return 'انظر للرسم مرة ثانية ثم أجب 👀';
    case 'worked_example': return 'راجع المثال وحاول بنفس الطريقة 📝';
    case 'guided_practice': return 'اتبع الخطوات بالترتيب 🤝';
    case 'direct_teach': return 'لا بأس، التعلم يحتاج وقت 🌱';
  }
}