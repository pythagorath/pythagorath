// Phase 5.5 Deep - Intelligent Interaction Feedback Engine
// Provides graduated feedback: immediate "why" explanations
// Levels: encouragement → hint → explanation → worked example
// Positive reinforcement calibrated to student state

import type { MisconceptionType } from './questionIntelligenceEngine';
import type { ScaffoldStage } from './cognitiveRemediation';

// ============ Types ============

export interface FeedbackContext {
  skillId: string;
  skillCategory: string; // N, G, C, M, P, D, T, A, F
  questionText: string;
  studentAnswer: number | string;
  correctAnswer: number | string;
  isCorrect: boolean;
  responseTimeMs: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  currentScaffoldStage: ScaffoldStage;
  misconceptionType: MisconceptionType | null;
  masteryLevel: number; // 0-100
  fatigueLevel: number; // 0-100
}

export interface FeedbackResult {
  primaryMessage: string;
  explanation: string | null; // "Why" explanation (null if correct)
  encouragement: string;
  emoji: string;
  tone: FeedbackTone;
  visualHint: VisualHint | null;
  nextAction: FeedbackAction;
  celebrationLevel: number; // 0-3 (0=none, 3=big celebration)
}

export type FeedbackTone =
  | 'celebratory'    // Great job!
  | 'encouraging'    // Keep trying!
  | 'instructive'    // Here's why...
  | 'gentle'         // It's okay...
  | 'neutral';       // Simple feedback

export type FeedbackAction =
  | 'continue'       // Move to next question
  | 'retry'          // Try again
  | 'show_hint'      // Show a hint
  | 'show_example'   // Show worked example
  | 'take_break'     // Suggest break
  | 'switch_skill';  // Change to different skill

export interface VisualHint {
  type: 'number_line' | 'blocks' | 'fingers' | 'diagram' | 'animation' | 'highlight';
  description: string;
  data?: Record<string, unknown>;
}

// ============ Core Feedback Generator ============

/**
 * Generate intelligent, graduated feedback for a student answer.
 * Adapts based on: correctness, streak, scaffold level, fatigue, misconception.
 */
export function generateFeedback(context: FeedbackContext): FeedbackResult {
  if (context.isCorrect) {
    return generateCorrectFeedback(context);
  }
  return generateIncorrectFeedback(context);
}

// ============ Correct Answer Feedback ============

function generateCorrectFeedback(context: FeedbackContext): FeedbackResult {
  const { consecutiveCorrect, responseTimeMs, fatigueLevel, masteryLevel } = context;

  // Determine celebration level
  let celebrationLevel = 0;
  if (consecutiveCorrect >= 5) celebrationLevel = 3;
  else if (consecutiveCorrect >= 3) celebrationLevel = 2;
  else if (consecutiveCorrect >= 1) celebrationLevel = 1;

  // Fast correct answer = extra praise
  const wasFast = responseTimeMs < 3000;

  // Select primary message based on streak
  const primaryMessage = selectCorrectMessage(consecutiveCorrect, wasFast, masteryLevel);
  const encouragement = selectEncouragement(consecutiveCorrect, fatigueLevel);
  const emoji = selectCorrectEmoji(celebrationLevel);

  return {
    primaryMessage,
    explanation: null,
    encouragement,
    emoji,
    tone: celebrationLevel >= 2 ? 'celebratory' : 'encouraging',
    visualHint: null,
    nextAction: 'continue',
    celebrationLevel,
  };
}

function selectCorrectMessage(streak: number, wasFast: boolean, mastery: number): string {
  if (wasFast && streak >= 3) {
    const messages = ['سريع ودقيق! 🚀', 'ما شاء الله! سرعة وإتقان ⚡', 'عبقري! 🧠✨'];
    return messages[Math.min(streak - 3, messages.length - 1)] || messages[messages.length - 1];
  }

  if (streak >= 5) {
    return 'سلسلة رائعة! أنت نجم اليوم ⭐';
  }
  if (streak >= 3) {
    const messages = ['ممتاز! ثلاثة صحيحة متتالية 🎯', 'رائع! استمر هكذا 💪', 'أحسنت! أنت في قمة أدائك 🌟'];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  if (streak >= 1) {
    const messages = ['صحيح! ✓', 'أحسنت! 👏', 'ممتاز! 🌟', 'برافو! 👍', 'صح! 🎯'];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // First correct after errors
  if (mastery < 50) {
    return 'أخيراً! أحسنت، أنت تتحسن 🌱';
  }
  return 'صحيح! ✓';
}

function selectEncouragement(streak: number, fatigue: number): string {
  if (fatigue > 60) {
    return 'أنت تبذل جهداً رائعاً رغم التعب!';
  }
  if (streak >= 5) {
    return 'سلسلة مذهلة! هل تستطيع الوصول لـ 10؟';
  }
  if (streak >= 3) {
    return 'استمر! أنت على الطريق الصحيح';
  }
  return '';
}

function selectCorrectEmoji(celebration: number): string {
  if (celebration >= 3) return '🎉🌟⭐';
  if (celebration >= 2) return '🌟👏';
  if (celebration >= 1) return '✅';
  return '👍';
}

// ============ Incorrect Answer Feedback ============

function generateIncorrectFeedback(context: FeedbackContext): FeedbackResult {
  const {
    consecutiveWrong, currentScaffoldStage, misconceptionType,
    fatigueLevel, skillCategory, studentAnswer, correctAnswer,
  } = context;

  // Determine tone based on state
  const tone = determineTone(consecutiveWrong, fatigueLevel);

  // Generate "why" explanation
  const explanation = generateWhyExplanation(
    skillCategory, studentAnswer, correctAnswer, misconceptionType
  );

  // Generate primary message (graduated)
  const primaryMessage = selectIncorrectMessage(consecutiveWrong, tone);

  // Determine next action
  const nextAction = determineNextAction(consecutiveWrong, currentScaffoldStage, fatigueLevel);

  // Generate visual hint if appropriate
  const visualHint = shouldShowVisualHint(consecutiveWrong, currentScaffoldStage)
    ? generateVisualHint(skillCategory, correctAnswer)
    : null;

  const encouragement = selectIncorrectEncouragement(consecutiveWrong, fatigueLevel);
  const emoji = consecutiveWrong >= 3 ? '🤗' : consecutiveWrong >= 2 ? '🤔' : '💪';

  return {
    primaryMessage,
    explanation,
    encouragement,
    emoji,
    tone,
    visualHint,
    nextAction,
    celebrationLevel: 0,
  };
}

function determineTone(consecutiveWrong: number, fatigue: number): FeedbackTone {
  if (fatigue > 70) return 'gentle';
  if (consecutiveWrong >= 3) return 'instructive';
  if (consecutiveWrong >= 2) return 'encouraging';
  return 'neutral';
}

function selectIncorrectMessage(consecutiveWrong: number, tone: FeedbackTone): string {
  if (tone === 'gentle') {
    return 'لا بأس، أنت متعب. خذ وقتك 🌿';
  }
  if (consecutiveWrong >= 4) {
    return 'خلنا نتعلم هذا معاً. شاهد الشرح 👨‍🏫';
  }
  if (consecutiveWrong >= 3) {
    return 'حاول مرة أخرى. سأساعدك 🤝';
  }
  if (consecutiveWrong >= 2) {
    return 'ليس تماماً. فكر مرة ثانية 🤔';
  }
  // First wrong
  const messages = ['ليس هذا. حاول مرة أخرى 💪', 'قريب! فكر أكثر 🧠', 'حاول مرة ثانية ✏️'];
  return messages[Math.floor(Math.random() * messages.length)];
}

function selectIncorrectEncouragement(consecutiveWrong: number, fatigue: number): string {
  if (fatigue > 60) {
    return 'الأخطاء جزء من التعلم. استرح إذا احتجت.';
  }
  if (consecutiveWrong >= 3) {
    return 'كل محاولة تقربك من الفهم. لا تستسلم!';
  }
  if (consecutiveWrong >= 2) {
    return 'التعلم يحتاج صبر. أنت تتحسن!';
  }
  return 'لا بأس، الخطأ معلم!';
}

// ============ "Why" Explanation Generator ============

function generateWhyExplanation(
  skillCategory: string,
  studentAnswer: number | string,
  correctAnswer: number | string,
  misconception: MisconceptionType | null
): string {
  const student = Number(studentAnswer);
  const correct = Number(correctAnswer);

  // Misconception-specific explanations
  if (misconception) {
    return getMisconceptionExplanation(misconception, student, correct);
  }

  // Category-specific explanations
  if (Number.isFinite(student) && Number.isFinite(correct)) {
    return getNumericExplanation(skillCategory, student, correct);
  }

  return `الإجابة الصحيحة هي: ${correctAnswer}`;
}

function getMisconceptionExplanation(
  type: MisconceptionType,
  student: number,
  correct: number
): string {
  switch (type) {
    case 'counting_confusion':
      return `أجبت ${student} لكن الصحيح ${correct}. تأكد من العد بالترتيب: واحد، اثنان، ثلاثة...`;
    case 'place_value_confusion':
      return `أجبت ${student} لكن الصحيح ${correct}. تذكر: الرقم الأيسر هو العشرات والأيمن هو الآحاد.`;
    case 'operation_switch':
      return `أجبت ${student} لكن الصحيح ${correct}. تحقق: هل السؤال يطلب جمع (+) أم طرح (-)؟`;
    case 'visual_misread':
      return `أجبت ${student} لكن الصحيح ${correct}. انظر للسؤال مرة أخرى بعناية.`;
    case 'sequence_confusion':
      return `أجبت ${student} لكن الصحيح ${correct}. تتبع النمط: ماذا يأتي بعد كل رقم؟`;
    default:
      return `الإجابة الصحيحة هي ${correct}.`;
  }
}

function getNumericExplanation(category: string, student: number, correct: number): string {
  const diff = student - correct;

  switch (category) {
    case 'N': // Numbers
      if (Math.abs(diff) === 1) {
        return `قريب جداً! الفرق واحد فقط. الصحيح هو ${correct}.`;
      }
      return `الإجابة الصحيحة هي ${correct}. حاول العد مرة أخرى.`;

    case 'C': // Calculations
      if (diff > 0) {
        return `إجابتك ${student} أكبر من الصحيح ${correct}. ربما جمعت بدل ما تطرح؟`;
      }
      return `إجابتك ${student} أصغر من الصحيح ${correct}. تحقق من العملية.`;

    case 'G': // Geometry
      return `الإجابة الصحيحة هي ${correct}. انظر للشكل مرة أخرى وعد الأضلاع.`;

    case 'M': // Measurement
      return `الإجابة الصحيحة هي ${correct}. تأكد من وحدة القياس.`;

    default:
      return `الإجابة الصحيحة هي ${correct}.`;
  }
}

// ============ Visual Hints ============

function shouldShowVisualHint(consecutiveWrong: number, stage: ScaffoldStage): boolean {
  return consecutiveWrong >= 2 || stage === 'visual_cue' || stage === 'worked_example';
}

function generateVisualHint(skillCategory: string, correctAnswer: number | string): VisualHint {
  const correct = Number(correctAnswer);

  switch (skillCategory) {
    case 'N':
      return {
        type: correct <= 20 ? 'fingers' : 'number_line',
        description: correct <= 10
          ? `عد على أصابعك حتى ${correct}`
          : `ابحث عن ${correct} على خط الأعداد`,
        data: { target: correct, range: [0, Math.ceil(correct / 10) * 10] },
      };

    case 'C':
      return {
        type: 'blocks',
        description: `استخدم المكعبات: ضع ${correct} مكعب`,
        data: { count: correct },
      };

    case 'G':
      return {
        type: 'diagram',
        description: 'انظر للشكل وعد الأضلاع والزوايا',
      };

    default:
      return {
        type: 'highlight',
        description: `الإجابة الصحيحة هي ${correctAnswer}`,
      };
  }
}

// ============ Action Determination ============

function determineNextAction(
  consecutiveWrong: number,
  scaffoldStage: ScaffoldStage,
  fatigue: number
): FeedbackAction {
  if (fatigue > 75) return 'take_break';
  if (consecutiveWrong >= 5) return 'switch_skill';
  if (consecutiveWrong >= 4) return 'show_example';
  if (consecutiveWrong >= 3) return 'show_hint';
  if (consecutiveWrong >= 2 && scaffoldStage === 'independent') return 'show_hint';
  return 'retry';
}

// ============ Positive Reinforcement Calibration ============

/**
 * Generate calibrated positive reinforcement.
 * Avoids over-praising (which reduces intrinsic motivation)
 * and under-praising (which reduces engagement).
 */
export function calibrateReinforcement(
  streak: number,
  masteryLevel: number,
  sessionCorrectRate: number,
  totalQuestionsToday: number
): {
  shouldPraise: boolean;
  praiseIntensity: 'subtle' | 'moderate' | 'enthusiastic';
  message: string;
} {
  // Don't praise every single correct answer (over-praising)
  // Praise more for: breakthroughs, streaks, difficult questions, improvement
  const shouldPraise = streak === 1 || streak === 3 || streak === 5 || streak === 10
    || (streak > 0 && streak % 5 === 0);

  if (!shouldPraise) {
    return { shouldPraise: false, praiseIntensity: 'subtle', message: '' };
  }

  // Calibrate intensity
  let intensity: 'subtle' | 'moderate' | 'enthusiastic' = 'subtle';
  if (streak >= 5 || (masteryLevel < 50 && sessionCorrectRate > 70)) {
    intensity = 'enthusiastic';
  } else if (streak >= 3 || sessionCorrectRate > 80) {
    intensity = 'moderate';
  }

  const messages: Record<typeof intensity, string[]> = {
    subtle: ['✓', '👍', 'صح'],
    moderate: ['أحسنت! 🌟', 'ممتاز! 👏', 'رائع! 💪'],
    enthusiastic: ['مذهل! أنت بطل! 🏆', 'ما شاء الله! 🌟⭐', 'عبقري! 🧠✨'],
  };

  const options = messages[intensity];
  const message = options[Math.floor(Math.random() * options.length)];

  return { shouldPraise: true, praiseIntensity: intensity, message };
}