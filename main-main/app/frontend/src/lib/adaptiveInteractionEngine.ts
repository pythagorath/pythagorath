// Real-Time Adaptive Educational Intelligence Sprint
// Module 6: Adaptive Interaction Intelligence
// Real-time interaction adaptation: hints, scaffolding, pacing, visuals, representations

import { type RealTimeSignals } from './realTimeTelemetry';
import { type RealTimeDecision } from './realTimeDecisionEngine';

// ============ Types ============

export interface InteractionState {
  studentId: string;
  sessionId: string;
  currentInteraction: ActiveInteraction | null;
  adaptationHistory: InteractionAdaptation[];
  scaffoldState: ScaffoldState;
  pacingState: PacingState;
  visualState: VisualState;
  hintState: HintState;
}

export interface ActiveInteraction {
  id: string;
  type: InteractionType;
  skillId: string;
  difficulty: number;
  startedAt: string;
  adaptationsApplied: number;
  currentPhase: InteractionPhase;
}

export type InteractionType =
  | 'multiple_choice'
  | 'drag_drop'
  | 'number_input'
  | 'matching'
  | 'sequencing'
  | 'drawing'
  | 'verbal_response'
  | 'manipulative'
  | 'exploration';

export type InteractionPhase =
  | 'presentation'
  | 'engagement'
  | 'response'
  | 'feedback'
  | 'reflection';

export interface InteractionAdaptation {
  id: string;
  timestamp: string;
  adaptationType: AdaptationType;
  trigger: string; // what caused this adaptation
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  effectiveness: number | null; // 0-100 after evaluation
}

export type AdaptationType =
  | 'hint_provided'
  | 'scaffold_increased'
  | 'scaffold_decreased'
  | 'pacing_slowed'
  | 'pacing_increased'
  | 'visual_simplified'
  | 'visual_enriched'
  | 'representation_switched'
  | 'interaction_type_changed'
  | 'options_reduced'
  | 'guidance_added'
  | 'encouragement_given'
  | 'challenge_increased';

export interface ScaffoldState {
  level: number; // 0-5 (0=none, 5=full support)
  type: ScaffoldType;
  stepsRevealed: number;
  totalSteps: number;
  autoEscalate: boolean;
}

export type ScaffoldType =
  | 'none'
  | 'hint_only'
  | 'partial_solution'
  | 'worked_example'
  | 'guided_steps'
  | 'full_walkthrough';

export interface PacingState {
  currentSpeed: number; // 0.5-2.0 multiplier
  minResponseTime: number; // ms, enforced minimum
  autoAdvance: boolean;
  pausePoints: number; // number of forced pauses remaining
  transitionDelay: number; // ms between activities
}

export interface VisualState {
  complexity: 'minimal' | 'standard' | 'rich';
  animationsEnabled: boolean;
  distractorsVisible: boolean;
  highlightActive: boolean;
  representationType: RepresentationType;
  fontSize: 'small' | 'medium' | 'large';
}

export type RepresentationType =
  | 'symbolic' // numbers and symbols
  | 'pictorial' // images and diagrams
  | 'concrete' // manipulatives
  | 'abstract' // pure math
  | 'mixed'; // combination

export interface HintState {
  available: number;
  used: number;
  currentHintLevel: number; // 0-4
  hints: HintContent[];
  autoHintEnabled: boolean;
  autoHintDelayMs: number;
}

export interface HintContent {
  level: number;
  type: 'nudge' | 'direction' | 'partial' | 'explicit' | 'solution';
  content: string;
  visual?: string;
}

// ============ State ============

let interactionState: InteractionState | null = null;

// ============ Core Functions ============

export function initInteractionEngine(studentId: string, sessionId: string): InteractionState {
  interactionState = {
    studentId,
    sessionId,
    currentInteraction: null,
    adaptationHistory: [],
    scaffoldState: {
      level: 0,
      type: 'none',
      stepsRevealed: 0,
      totalSteps: 0,
      autoEscalate: true,
    },
    pacingState: {
      currentSpeed: 1.0,
      minResponseTime: 2000,
      autoAdvance: false,
      pausePoints: 0,
      transitionDelay: 1000,
    },
    visualState: {
      complexity: 'standard',
      animationsEnabled: true,
      distractorsVisible: true,
      highlightActive: false,
      representationType: 'mixed',
      fontSize: 'medium',
    },
    hintState: {
      available: 3,
      used: 0,
      currentHintLevel: 0,
      hints: [],
      autoHintEnabled: true,
      autoHintDelayMs: 15000,
    },
  };
  return interactionState;
}

export function startInteraction(
  interactionId: string,
  type: InteractionType,
  skillId: string,
  difficulty: number
): ActiveInteraction {
  const interaction: ActiveInteraction = {
    id: interactionId,
    type,
    skillId,
    difficulty,
    startedAt: new Date().toISOString(),
    adaptationsApplied: 0,
    currentPhase: 'presentation',
  };

  if (interactionState) {
    interactionState.currentInteraction = interaction;
  }

  return interaction;
}

export function adaptToDecision(decision: RealTimeDecision, signals: RealTimeSignals): InteractionAdaptation | null {
  if (!interactionState) return null;

  let adaptation: InteractionAdaptation | null = null;

  switch (decision.action) {
    case 'trigger_hint':
      adaptation = applyHintAdaptation(decision, signals);
      break;
    case 'simplify_explanation':
    case 'reduce_cognitive_load':
      adaptation = applySimplificationAdaptation(decision, signals);
      break;
    case 'slow_pacing':
      adaptation = applyPacingAdaptation('slow', decision, signals);
      break;
    case 'increase_challenge':
      adaptation = applyPacingAdaptation('fast', decision, signals);
      break;
    case 'switch_interaction':
    case 'alternate_representation':
      adaptation = applyRepresentationSwitch(decision, signals);
      break;
    case 'adaptive_scaffolding':
    case 'trigger_guided_correction':
      adaptation = applyScaffoldAdaptation(decision, signals);
      break;
    case 'reduce_distractions':
      adaptation = applyVisualSimplification(decision, signals);
      break;
    case 'provide_encouragement':
      adaptation = createAdaptation('encouragement_given', decision.reasoning, {}, { message: 'encouragement' });
      break;
    default:
      break;
  }

  if (adaptation && interactionState.currentInteraction) {
    interactionState.currentInteraction.adaptationsApplied++;
    interactionState.adaptationHistory.push(adaptation);
    // Keep history bounded
    if (interactionState.adaptationHistory.length > 50) {
      interactionState.adaptationHistory = interactionState.adaptationHistory.slice(-50);
    }
  }

  return adaptation;
}

export function getInteractionState(): InteractionState | null {
  return interactionState;
}

export function getScaffoldLevel(): number {
  return interactionState?.scaffoldState.level ?? 0;
}

export function getPacingSpeed(): number {
  return interactionState?.pacingState.currentSpeed ?? 1.0;
}

export function getVisualComplexity(): string {
  return interactionState?.visualState.complexity ?? 'standard';
}

export function getHintState(): HintState | null {
  return interactionState?.hintState ?? null;
}

export function provideNextHint(): HintContent | null {
  if (!interactionState) return null;
  const { hintState } = interactionState;

  if (hintState.currentHintLevel >= hintState.hints.length) return null;
  if (hintState.used >= hintState.available) return null;

  const hint = hintState.hints[hintState.currentHintLevel];
  hintState.currentHintLevel++;
  hintState.used++;

  return hint ?? null;
}

export function setHints(hints: HintContent[]): void {
  if (!interactionState) return;
  interactionState.hintState.hints = hints;
  interactionState.hintState.currentHintLevel = 0;
  interactionState.hintState.available = hints.length;
  interactionState.hintState.used = 0;
}

export function endInteraction(): void {
  if (interactionState) {
    interactionState.currentInteraction = null;
  }
}

export function getAdaptationSummary(): {
  totalAdaptations: number;
  byType: Record<string, number>;
  avgEffectiveness: number;
} {
  if (!interactionState) return { totalAdaptations: 0, byType: {}, avgEffectiveness: 0 };

  const byType: Record<string, number> = {};
  let effectivenessSum = 0;
  let effectivenessCount = 0;

  interactionState.adaptationHistory.forEach(a => {
    byType[a.adaptationType] = (byType[a.adaptationType] ?? 0) + 1;
    if (a.effectiveness !== null) {
      effectivenessSum += a.effectiveness;
      effectivenessCount++;
    }
  });

  return {
    totalAdaptations: interactionState.adaptationHistory.length,
    byType,
    avgEffectiveness: effectivenessCount > 0 ? effectivenessSum / effectivenessCount : 0,
  };
}

// ============ Internal Adaptation Helpers ============

function applyHintAdaptation(decision: RealTimeDecision, _signals: RealTimeSignals): InteractionAdaptation {
  if (!interactionState) return createAdaptation('hint_provided', decision.reasoning, {}, {});

  const before = { hintLevel: interactionState.hintState.currentHintLevel };
  const hint = provideNextHint();
  const after = { hintLevel: interactionState.hintState.currentHintLevel, hint };

  return createAdaptation('hint_provided', decision.reasoning, before, after);
}

function applySimplificationAdaptation(decision: RealTimeDecision, signals: RealTimeSignals): InteractionAdaptation {
  if (!interactionState) return createAdaptation('visual_simplified', decision.reasoning, {}, {});

  const before = { ...interactionState.visualState };

  // Simplify based on signal severity
  if (signals.cognitiveLoadScore > 80) {
    interactionState.visualState.complexity = 'minimal';
    interactionState.visualState.animationsEnabled = false;
    interactionState.visualState.distractorsVisible = false;
  } else {
    interactionState.visualState.complexity = 'minimal';
    interactionState.visualState.distractorsVisible = false;
  }
  interactionState.visualState.highlightActive = true;
  interactionState.visualState.fontSize = 'large';

  const after = { ...interactionState.visualState };
  return createAdaptation('visual_simplified', decision.reasoning, before, after);
}

function applyPacingAdaptation(direction: 'slow' | 'fast', decision: RealTimeDecision, _signals: RealTimeSignals): InteractionAdaptation {
  if (!interactionState) return createAdaptation('pacing_slowed', decision.reasoning, {}, {});

  const before = { speed: interactionState.pacingState.currentSpeed };

  if (direction === 'slow') {
    interactionState.pacingState.currentSpeed = Math.max(0.5, interactionState.pacingState.currentSpeed * 0.7);
    interactionState.pacingState.transitionDelay = Math.min(3000, interactionState.pacingState.transitionDelay * 1.5);
    interactionState.pacingState.minResponseTime = Math.min(5000, interactionState.pacingState.minResponseTime * 1.3);
  } else {
    interactionState.pacingState.currentSpeed = Math.min(2.0, interactionState.pacingState.currentSpeed * 1.3);
    interactionState.pacingState.transitionDelay = Math.max(500, interactionState.pacingState.transitionDelay * 0.7);
  }

  const after = { speed: interactionState.pacingState.currentSpeed };
  return createAdaptation(
    direction === 'slow' ? 'pacing_slowed' : 'pacing_increased',
    decision.reasoning,
    before,
    after
  );
}

function applyRepresentationSwitch(decision: RealTimeDecision, _signals: RealTimeSignals): InteractionAdaptation {
  if (!interactionState) return createAdaptation('representation_switched', decision.reasoning, {}, {});

  const before = { representation: interactionState.visualState.representationType };

  // Cycle through representations
  const representations: RepresentationType[] = ['symbolic', 'pictorial', 'concrete', 'mixed'];
  const currentIdx = representations.indexOf(interactionState.visualState.representationType);
  const nextIdx = (currentIdx + 1) % representations.length;
  interactionState.visualState.representationType = representations[nextIdx];

  const after = { representation: interactionState.visualState.representationType };
  return createAdaptation('representation_switched', decision.reasoning, before, after);
}

function applyScaffoldAdaptation(decision: RealTimeDecision, _signals: RealTimeSignals): InteractionAdaptation {
  if (!interactionState) return createAdaptation('scaffold_increased', decision.reasoning, {}, {});

  const before = { level: interactionState.scaffoldState.level, type: interactionState.scaffoldState.type };

  // Increase scaffold
  interactionState.scaffoldState.level = Math.min(5, interactionState.scaffoldState.level + 1);
  const scaffoldTypes: ScaffoldType[] = ['none', 'hint_only', 'partial_solution', 'worked_example', 'guided_steps', 'full_walkthrough'];
  interactionState.scaffoldState.type = scaffoldTypes[interactionState.scaffoldState.level];

  const after = { level: interactionState.scaffoldState.level, type: interactionState.scaffoldState.type };
  return createAdaptation('scaffold_increased', decision.reasoning, before, after);
}

function applyVisualSimplification(decision: RealTimeDecision, _signals: RealTimeSignals): InteractionAdaptation {
  if (!interactionState) return createAdaptation('visual_simplified', decision.reasoning, {}, {});

  const before = { ...interactionState.visualState };

  interactionState.visualState.animationsEnabled = false;
  interactionState.visualState.distractorsVisible = false;
  interactionState.visualState.highlightActive = true;
  interactionState.visualState.complexity = 'minimal';

  const after = { ...interactionState.visualState };
  return createAdaptation('visual_simplified', decision.reasoning, before, after);
}

function createAdaptation(
  type: AdaptationType,
  trigger: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): InteractionAdaptation {
  return {
    id: `ia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    adaptationType: type,
    trigger,
    before,
    after,
    effectiveness: null,
  };
}