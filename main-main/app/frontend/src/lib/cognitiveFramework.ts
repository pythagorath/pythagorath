// Cognitive Skills Framework - Phase 4: Deepen Cognitive Learning Systems
// Framework: visual recognition, working memory, logical thinking, classification, sequencing
// Progression: concrete → pictorial → abstract
// Multi-modal: visual, auditory, kinesthetic with auto-detection
// Metacognitive support, scaffolding, and error pattern intelligence

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Core Types ============

export type CognitiveSkillType =
  | 'visual_recognition'
  | 'working_memory'
  | 'logical_thinking'
  | 'classification'
  | 'sequencing'
  | 'spatial_reasoning'
  | 'pattern_detection'
  | 'number_sense';

export type RepresentationLevel = 'concrete' | 'pictorial' | 'abstract';
export type LearningModality = 'visual' | 'auditory' | 'kinesthetic';
export type ScaffoldLevel = 'full_support' | 'guided' | 'hints_only' | 'independent';
export type ErrorCategory = 'careless' | 'misconception' | 'procedural' | 'conceptual' | 'attention';

export interface CognitiveSkill {
  id: CognitiveSkillType;
  nameAr: string;
  descriptionAr: string;
  icon: string;
  currentLevel: RepresentationLevel;
  mastery: number; // 0-100
  attempts: number;
  lastPracticed: string;
  streakDays: number;
}

export interface CognitiveLoadState {
  currentLoad: number; // 0-100
  intrinsicLoad: number; // task complexity
  extraneousLoad: number; // UI/distraction
  germaneLoad: number; // learning-related
  threshold: number; // personalized max
  overloadCount: number;
  adjustments: LoadAdjustment[];
}

export interface LoadAdjustment {
  timestamp: string;
  reason: string;
  action: 'reduce_items' | 'simplify_ui' | 'add_break' | 'slow_pace' | 'add_scaffold';
}

export interface ModalityProfile {
  dominant: LearningModality;
  scores: Record<LearningModality, number>;
  detectionHistory: ModalitySignal[];
  lastUpdated: string;
}

export interface ModalitySignal {
  modality: LearningModality;
  strength: number;
  source: string;
  timestamp: string;
}

export interface MetacognitiveState {
  selfAssessmentAccuracy: number; // how well student predicts own performance
  reflectionCount: number;
  strategyAwareness: number; // 0-100
  planningSkill: number; // 0-100
  monitoringSkill: number; // 0-100
  evaluationSkill: number; // 0-100
  recentReflections: Reflection[];
}

export interface Reflection {
  timestamp: string;
  questionAr: string;
  responseAr: string;
  accuracy: number;
}

export interface ScaffoldState {
  currentLevel: ScaffoldLevel;
  hintsUsed: number;
  hintsAvailable: number;
  guidedStepsCompleted: number;
  independentSuccessRate: number;
  fadeHistory: ScaffoldTransition[];
}

export interface ScaffoldTransition {
  from: ScaffoldLevel;
  to: ScaffoldLevel;
  timestamp: string;
  reason: string;
}

export interface ErrorIntelligence {
  patterns: ErrorPatternRecord[];
  dominantCategory: ErrorCategory;
  interventions: Intervention[];
  improvementTrend: number; // -100 to 100
}

export interface ErrorPatternRecord {
  category: ErrorCategory;
  count: number;
  recentRate: number;
  skillsAffected: string[];
  lastOccurrence: string;
}

export interface Intervention {
  type: 'reteach' | 'practice' | 'visual_aid' | 'slow_down' | 'break' | 'simplify';
  reason: string;
  applied: string;
  effective: boolean;
}

export interface CognitiveProfile {
  skills: CognitiveSkill[];
  loadState: CognitiveLoadState;
  modality: ModalityProfile;
  metacognition: MetacognitiveState;
  scaffold: ScaffoldState;
  errorIntelligence: ErrorIntelligence;
  weeklyChallenge: WeeklyChallenge | null;
  gamesPlayed: number;
  totalCognitiveXP: number;
}

export interface WeeklyChallenge {
  id: string;
  nameAr: string;
  descriptionAr: string;
  targetSkill: CognitiveSkillType;
  targetScore: number;
  currentScore: number;
  startDate: string;
  endDate: string;
  completed: boolean;
}

// ============ Default Profile ============

const DEFAULT_SKILLS: CognitiveSkill[] = [
  { id: 'visual_recognition', nameAr: 'التعرف البصري', descriptionAr: 'التعرف على الأشكال والأنماط بصرياً', icon: '👁️', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
  { id: 'working_memory', nameAr: 'الذاكرة العاملة', descriptionAr: 'تذكر ومعالجة المعلومات مؤقتاً', icon: '🧠', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
  { id: 'logical_thinking', nameAr: 'التفكير المنطقي', descriptionAr: 'استنتاج العلاقات والقواعد', icon: '🔗', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
  { id: 'classification', nameAr: 'التصنيف', descriptionAr: 'تجميع العناصر حسب خصائص مشتركة', icon: '📦', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
  { id: 'sequencing', nameAr: 'التسلسل', descriptionAr: 'ترتيب العناصر بنمط محدد', icon: '🔢', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
  { id: 'spatial_reasoning', nameAr: 'التفكير المكاني', descriptionAr: 'فهم العلاقات المكانية والاتجاهات', icon: '🗺️', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
  { id: 'pattern_detection', nameAr: 'اكتشاف الأنماط', descriptionAr: 'إيجاد القواعد المخفية في التسلسلات', icon: '🔍', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
  { id: 'number_sense', nameAr: 'الحس العددي', descriptionAr: 'فهم الأعداد وعلاقاتها', icon: '🔢', currentLevel: 'concrete', mastery: 0, attempts: 0, lastPracticed: '', streakDays: 0 },
];

export function getDefaultCognitiveProfile(): CognitiveProfile {
  return {
    skills: [...DEFAULT_SKILLS],
    loadState: {
      currentLoad: 0,
      intrinsicLoad: 0,
      extraneousLoad: 0,
      germaneLoad: 0,
      threshold: 70,
      overloadCount: 0,
      adjustments: [],
    },
    modality: {
      dominant: 'visual',
      scores: { visual: 50, auditory: 30, kinesthetic: 20 },
      detectionHistory: [],
      lastUpdated: new Date().toISOString(),
    },
    metacognition: {
      selfAssessmentAccuracy: 50,
      reflectionCount: 0,
      strategyAwareness: 0,
      planningSkill: 0,
      monitoringSkill: 0,
      evaluationSkill: 0,
      recentReflections: [],
    },
    scaffold: {
      currentLevel: 'full_support',
      hintsUsed: 0,
      hintsAvailable: 3,
      guidedStepsCompleted: 0,
      independentSuccessRate: 0,
      fadeHistory: [],
    },
    errorIntelligence: {
      patterns: [],
      dominantCategory: 'careless',
      interventions: [],
      improvementTrend: 0,
    },
    weeklyChallenge: null,
    gamesPlayed: 0,
    totalCognitiveXP: 0,
  };
}

// ============ Persistence ============

const STORAGE_KEY = 'pythagorath_cognitive_profile';

export function loadCognitiveProfile(): CognitiveProfile {
  const data = loadUserData<CognitiveProfile | null>(STORAGE_KEY, null);
  if (data) return { ...getDefaultCognitiveProfile(), ...data };
  return getDefaultCognitiveProfile();
}

export function saveCognitiveProfile(profile: CognitiveProfile): void {
  saveUserData(STORAGE_KEY, profile);
}

// ============ Cognitive Load Management ============

export function measureCognitiveLoad(
  taskComplexity: number,
  responseTimeMs: number,
  errorsInLast5: number,
  hesitations: number
): CognitiveLoadState {
  const profile = loadCognitiveProfile();
  const intrinsic = Math.min(100, taskComplexity * 20);
  const extraneous = Math.min(100, hesitations * 15);
  const germane = Math.max(0, 100 - intrinsic - extraneous);
  
  const currentLoad = Math.min(100, 
    intrinsic * 0.4 + 
    (responseTimeMs > 15000 ? 30 : responseTimeMs / 500) + 
    errorsInLast5 * 10 + 
    hesitations * 8
  );

  const newState: CognitiveLoadState = {
    ...profile.loadState,
    currentLoad,
    intrinsicLoad: intrinsic,
    extraneousLoad: extraneous,
    germaneLoad: germane,
  };

  if (currentLoad > profile.loadState.threshold) {
    newState.overloadCount++;
    const adjustment: LoadAdjustment = {
      timestamp: new Date().toISOString(),
      reason: currentLoad > 85 ? 'حمل معرفي مرتفع جداً' : 'حمل معرفي فوق الحد',
      action: currentLoad > 85 ? 'add_break' : errorsInLast5 > 3 ? 'add_scaffold' : 'reduce_items',
    };
    newState.adjustments = [...newState.adjustments.slice(-9), adjustment];
  }

  profile.loadState = newState;
  saveCognitiveProfile(profile);
  return newState;
}

export function getLoadRecommendation(load: CognitiveLoadState): { action: string; messageAr: string } {
  if (load.currentLoad > 85) return { action: 'break', messageAr: '🌟 لنأخذ استراحة قصيرة! عقلك يعمل بجد' };
  if (load.currentLoad > 70) return { action: 'simplify', messageAr: '💡 لنبسّط الأمور قليلاً' };
  if (load.currentLoad > 55) return { action: 'scaffold', messageAr: '🤝 سأساعدك خطوة بخطوة' };
  return { action: 'continue', messageAr: '✨ أنت تبلي بلاءً حسناً!' };
}

// ============ Multi-Modal Detection ============

export function recordModalitySignal(
  modality: LearningModality,
  strength: number,
  source: string
): ModalityProfile {
  const profile = loadCognitiveProfile();
  const signal: ModalitySignal = {
    modality,
    strength,
    source,
    timestamp: new Date().toISOString(),
  };

  profile.modality.detectionHistory = [...profile.modality.detectionHistory.slice(-29), signal];
  
  // Recalculate scores from recent signals
  const recent = profile.modality.detectionHistory.slice(-20);
  const scores: Record<LearningModality, number> = { visual: 0, auditory: 0, kinesthetic: 0 };
  const counts: Record<LearningModality, number> = { visual: 0, auditory: 0, kinesthetic: 0 };
  
  recent.forEach(s => {
    scores[s.modality] += s.strength;
    counts[s.modality]++;
  });

  Object.keys(scores).forEach(m => {
    const mod = m as LearningModality;
    scores[mod] = counts[mod] > 0 ? Math.round(scores[mod] / counts[mod]) : 30;
  });

  profile.modality.scores = scores;
  profile.modality.dominant = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as LearningModality;
  profile.modality.lastUpdated = new Date().toISOString();
  
  saveCognitiveProfile(profile);
  return profile.modality;
}

export function getModalityRecommendation(modality: ModalityProfile): { 
  preferredActivities: string[];
  messageAr: string;
} {
  const activities: Record<LearningModality, string[]> = {
    visual: ['مطابقة الصور', 'تلوين الأنماط', 'ألغاز بصرية', 'خرائط ذهنية'],
    auditory: ['أغاني الأرقام', 'قصص رياضية', 'تكرار صوتي', 'إيقاعات العد'],
    kinesthetic: ['سحب وإفلات', 'بناء بالمكعبات', 'رسم الأرقام', 'ألعاب حركية'],
  };
  const messages: Record<LearningModality, string> = {
    visual: '👁️ أنت متعلم بصري! تتعلم أفضل بالصور والألوان',
    auditory: '👂 أنت متعلم سمعي! تتعلم أفضل بالأصوات والإيقاعات',
    kinesthetic: '✋ أنت متعلم حركي! تتعلم أفضل باللمس والحركة',
  };
  return {
    preferredActivities: activities[modality.dominant],
    messageAr: messages[modality.dominant],
  };
}

// ============ Metacognitive Support ============

export function recordSelfAssessment(predicted: number, actual: number): MetacognitiveState {
  const profile = loadCognitiveProfile();
  const accuracy = 100 - Math.abs(predicted - actual);
  
  profile.metacognition.selfAssessmentAccuracy = Math.round(
    profile.metacognition.selfAssessmentAccuracy * 0.7 + accuracy * 0.3
  );
  profile.metacognition.reflectionCount++;
  
  saveCognitiveProfile(profile);
  return profile.metacognition;
}

export function addReflection(questionAr: string, responseAr: string, accuracy: number): void {
  const profile = loadCognitiveProfile();
  profile.metacognition.recentReflections = [
    ...profile.metacognition.recentReflections.slice(-9),
    { timestamp: new Date().toISOString(), questionAr, responseAr, accuracy },
  ];
  profile.metacognition.strategyAwareness = Math.min(100, profile.metacognition.strategyAwareness + 2);
  saveCognitiveProfile(profile);
}

export function getMetacognitivePrompt(context: 'before' | 'during' | 'after'): string {
  const prompts = {
    before: [
      'كيف تشعر تجاه هذا التمرين؟ هل تعتقد أنه سهل أم صعب؟',
      'ما الطريقة التي ستستخدمها لحل هذا؟',
      'هل تتذكر شيئاً مشابهاً من قبل؟',
    ],
    during: [
      'هل أنت متأكد من إجابتك؟ خذ لحظة للتفكير',
      'هل يمكنك شرح كيف وصلت لهذه الإجابة؟',
      'هل تريد أن تتحقق مرة أخرى؟',
    ],
    after: [
      'ماذا تعلمت من هذا التمرين؟',
      'ما الذي كان صعباً؟ وكيف تغلبت عليه؟',
      'هل ستفعل شيئاً مختلفاً في المرة القادمة؟',
    ],
  };
  const options = prompts[context];
  return options[Math.floor(Math.random() * options.length)];
}

// ============ Scaffolding System ============

export function evaluateScaffoldLevel(
  recentCorrectRate: number,
  hintsUsed: number,
  consecutiveSuccess: number
): ScaffoldLevel {
  if (consecutiveSuccess >= 5 && recentCorrectRate > 85) return 'independent';
  if (consecutiveSuccess >= 3 && recentCorrectRate > 70) return 'hints_only';
  if (recentCorrectRate > 50) return 'guided';
  return 'full_support';
}

export function transitionScaffold(newLevel: ScaffoldLevel, reason: string): ScaffoldState {
  const profile = loadCognitiveProfile();
  const oldLevel = profile.scaffold.currentLevel;
  
  if (oldLevel !== newLevel) {
    profile.scaffold.fadeHistory = [
      ...profile.scaffold.fadeHistory.slice(-9),
      { from: oldLevel, to: newLevel, timestamp: new Date().toISOString(), reason },
    ];
  }
  
  profile.scaffold.currentLevel = newLevel;
  saveCognitiveProfile(profile);
  return profile.scaffold;
}

export function getScaffoldHint(level: ScaffoldLevel, skillType: CognitiveSkillType): string {
  const hints: Record<ScaffoldLevel, Record<string, string>> = {
    full_support: {
      visual_recognition: '👀 انظر جيداً للشكل. ما لونه؟ كم ضلعاً له؟ لنبحث عن المشابه',
      working_memory: '🧠 سأريك الأرقام ببطء. حاول تكرارها في ذهنك',
      logical_thinking: '🔗 لنفكر معاً: إذا كان ٢ + ٢ = ٤، فماذا عن ٣ + ٣؟',
      classification: '📦 لنضع الأشياء المتشابهة معاً. ما الذي يجمع بينها؟',
      sequencing: '🔢 انظر للنمط: ١، ٢، ٣... ما الرقم التالي؟',
      spatial_reasoning: '🗺️ تخيل أنك تدير الشكل. كيف سيبدو؟',
      pattern_detection: '🔍 هناك قاعدة مخفية. لنبحث عنها معاً',
      number_sense: '🔢 فكر في الأرقام كأصدقاء. ٥ أكبر من ٣ بكم؟',
    },
    guided: {
      visual_recognition: '👀 ركّز على الخصائص الرئيسية',
      working_memory: '🧠 حاول تجميع الأرقام في مجموعات',
      logical_thinking: '🔗 ما العلاقة بين العناصر؟',
      classification: '📦 ما الخاصية المشتركة؟',
      sequencing: '🔢 ما القاعدة بين كل عنصرين متتاليين؟',
      spatial_reasoning: '🗺️ فكر في الاتجاهات',
      pattern_detection: '🔍 قارن بين العناصر المتتالية',
      number_sense: '🔢 استخدم ما تعرفه عن الأرقام',
    },
    hints_only: {
      visual_recognition: '💡 تلميح: انظر للتفاصيل الصغيرة',
      working_memory: '💡 تلميح: كرر في ذهنك',
      logical_thinking: '💡 تلميح: فكر في السبب والنتيجة',
      classification: '💡 تلميح: ابحث عن التشابه',
      sequencing: '💡 تلميح: ما الفرق بين كل عنصرين؟',
      spatial_reasoning: '💡 تلميح: تخيل الحركة',
      pattern_detection: '💡 تلميح: النمط يتكرر',
      number_sense: '💡 تلميح: فكر في خط الأعداد',
    },
    independent: {
      visual_recognition: '🌟 أنت قادر على حلها!',
      working_memory: '🌟 ثق بذاكرتك!',
      logical_thinking: '🌟 فكر بمنطقك!',
      classification: '🌟 صنّف بثقة!',
      sequencing: '🌟 أكمل التسلسل!',
      spatial_reasoning: '🌟 تخيل وأجب!',
      pattern_detection: '🌟 اكتشف النمط!',
      number_sense: '🌟 الأرقام صديقتك!',
    },
  };
  return hints[level][skillType] || '💪 حاول بأفضل ما لديك!';
}

// ============ Error Pattern Intelligence ============

export function analyzeErrorPattern(
  errors: Array<{ category: ErrorCategory; skillId: string; timestamp: string }>
): ErrorIntelligence {
  const profile = loadCognitiveProfile();
  
  const categoryCount: Record<ErrorCategory, { count: number; skills: Set<string>; lastTime: string }> = {
    careless: { count: 0, skills: new Set(), lastTime: '' },
    misconception: { count: 0, skills: new Set(), lastTime: '' },
    procedural: { count: 0, skills: new Set(), lastTime: '' },
    conceptual: { count: 0, skills: new Set(), lastTime: '' },
    attention: { count: 0, skills: new Set(), lastTime: '' },
  };

  errors.forEach(e => {
    categoryCount[e.category].count++;
    categoryCount[e.category].skills.add(e.skillId);
    categoryCount[e.category].lastTime = e.timestamp;
  });

  const total = errors.length || 1;
  const patterns: ErrorPatternRecord[] = Object.entries(categoryCount).map(([cat, data]) => ({
    category: cat as ErrorCategory,
    count: data.count,
    recentRate: Math.round((data.count / total) * 100),
    skillsAffected: Array.from(data.skills),
    lastOccurrence: data.lastTime,
  }));

  const dominant = patterns.sort((a, b) => b.count - a.count)[0]?.category || 'careless';

  // Generate intervention
  const interventionMap: Record<ErrorCategory, Intervention['type']> = {
    careless: 'slow_down',
    misconception: 'reteach',
    procedural: 'practice',
    conceptual: 'visual_aid',
    attention: 'break',
  };

  const newIntervention: Intervention = {
    type: interventionMap[dominant],
    reason: `نمط أخطاء سائد: ${dominant}`,
    applied: new Date().toISOString(),
    effective: false,
  };

  profile.errorIntelligence = {
    patterns,
    dominantCategory: dominant,
    interventions: [...profile.errorIntelligence.interventions.slice(-9), newIntervention],
    improvementTrend: calculateImprovementTrend(errors),
  };

  saveCognitiveProfile(profile);
  return profile.errorIntelligence;
}

function calculateImprovementTrend(errors: Array<{ timestamp: string }>): number {
  if (errors.length < 4) return 0;
  const mid = Math.floor(errors.length / 2);
  const firstHalf = errors.slice(0, mid).length;
  const secondHalf = errors.slice(mid).length;
  return Math.round(((firstHalf - secondHalf) / (firstHalf || 1)) * 100);
}

export function getInterventionMessage(category: ErrorCategory): string {
  const messages: Record<ErrorCategory, string> = {
    careless: '🐢 لنبطئ قليلاً ونتأكد من كل إجابة قبل إرسالها',
    misconception: '📚 يبدو أن هناك فكرة تحتاج توضيح. لنراجعها معاً',
    procedural: '🔄 الخطوات صحيحة لكن الترتيب يحتاج تمرين. لنتدرب أكثر',
    conceptual: '🎨 لنستخدم الصور والأمثلة لفهم الفكرة بشكل أعمق',
    attention: '☕ عقلك يحتاج استراحة! لنأخذ دقيقة ونعود بنشاط',
  };
  return messages[category];
}

// ============ Skill Progression ============

export function updateSkillMastery(
  skillId: CognitiveSkillType,
  correct: boolean,
  responseTimeMs: number
): CognitiveSkill {
  const profile = loadCognitiveProfile();
  const skill = profile.skills.find(s => s.id === skillId);
  if (!skill) return DEFAULT_SKILLS[0];

  skill.attempts++;
  skill.lastPracticed = new Date().toISOString();

  // Update mastery with weighted calculation
  const timeBonus = responseTimeMs < 5000 ? 5 : responseTimeMs < 10000 ? 2 : 0;
  if (correct) {
    skill.mastery = Math.min(100, skill.mastery + 8 + timeBonus);
  } else {
    skill.mastery = Math.max(0, skill.mastery - 5);
  }

  // Level progression
  if (skill.mastery >= 80 && skill.currentLevel === 'concrete') {
    skill.currentLevel = 'pictorial';
  } else if (skill.mastery >= 90 && skill.currentLevel === 'pictorial') {
    skill.currentLevel = 'abstract';
  }

  // XP
  profile.totalCognitiveXP += correct ? 10 + timeBonus : 2;

  saveCognitiveProfile(profile);
  return skill;
}

// ============ Weekly Challenge ============

export function generateWeeklyChallenge(): WeeklyChallenge {
  const profile = loadCognitiveProfile();
  const weakest = [...profile.skills].sort((a, b) => a.mastery - b.mastery)[0];
  
  const now = new Date();
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const challenge: WeeklyChallenge = {
    id: `wc_${Date.now()}`,
    nameAr: `تحدي ${weakest.nameAr}`,
    descriptionAr: `أكمل 10 تمارين في ${weakest.nameAr} هذا الأسبوع`,
    targetSkill: weakest.id,
    targetScore: 10,
    currentScore: 0,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    completed: false,
  };

  profile.weeklyChallenge = challenge;
  saveCognitiveProfile(profile);
  return challenge;
}

export function updateWeeklyProgress(): WeeklyChallenge | null {
  const profile = loadCognitiveProfile();
  if (!profile.weeklyChallenge) return null;
  
  profile.weeklyChallenge.currentScore++;
  if (profile.weeklyChallenge.currentScore >= profile.weeklyChallenge.targetScore) {
    profile.weeklyChallenge.completed = true;
    profile.totalCognitiveXP += 50;
  }
  
  saveCognitiveProfile(profile);
  return profile.weeklyChallenge;
}