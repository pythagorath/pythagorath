// Mental Visualization & Cognitive Coaching System
// Transforms from interactive abacus → mental numerical cognition system
// 5-Stage Gradual Hiding: Full → Partial → Flash → Temporary → Mental
// Cognitive Coaching: hints, visual guidance, corrective feedback, encouragement, step-by-step
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RotateCcw, Brain, Eye, EyeOff, CheckCircle, XCircle, ChevronLeft, Lock, Lightbulb, TrendingUp, Clock, Target, Zap, Heart, Star, Users } from 'lucide-react';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type CognitiveStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type VisualizationStage = 'full' | 'partial' | 'flash' | 'temporary' | 'mental';

interface AbacusState {
  ones: number;
  tens: number;
  hundreds: number;
}

interface CognitiveQuestion {
  id: string;
  stage: CognitiveStage;
  type: 'represent' | 'read' | 'add' | 'subtract' | 'place_value' | 'mental_viz' | 'fast_mental' | 'flash_recognition' | 'speed_drill';
  instruction: string;
  hint?: string;
  targetValue?: number;
  operand1?: number;
  operand2?: number;
  answer: number;
  difficulty: number;
  coachingTip?: string;
}

interface ErrorPattern {
  placeValueConfusion: number;
  carryingMistakes: number;
  borrowingIssues: number;
  slowRecognition: number;
  visualizationWeakness: number;
}

interface CognitiveMetrics {
  recognitionSpeed: number;
  visualizationStrength: number;
  numberSense: number;
  accuracy: number;
  consistency: number;
  confidence: number;
  mentalSpeed: number;
  responseTimes: number[];
  errorPatterns: ErrorPattern;
  sessionsCompleted: number;
  streakDays: number;
}

interface CoachingState {
  currentMessage: string;
  messageType: 'hint' | 'guidance' | 'encouragement' | 'correction' | 'celebration';
  stepByStep: string[];
  currentStep: number;
  showVisualGuide: boolean;
}

interface CognitiveProgress {
  currentStage: CognitiveStage;
  stageMastery: Record<number, { correct: number; total: number; avgTime: number; streak: number; bestStreak: number }>;
  totalSessions: number;
  visualizationStage: VisualizationStage;
  metrics: CognitiveMetrics;
  adaptiveDifficulty: number;
  hintsUsed: number;
  lastSessionDate: string;
  sessionsToday: number;
  mentalSpeedBest: number;
  flashRecognitionBest: number;
  coachingHistory: { date: string; type: string; message: string }[];
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const STAGES: { stage: CognitiveStage; title: string; description: string; icon: string; cognitiveGoal: string }[] = [
  { stage: 1, title: 'تمثيل الأعداد', description: 'ربط العدد بالخرزات', icon: '🔢', cognitiveGoal: 'بناء الربط البصري-العددي' },
  { stage: 2, title: 'قراءة الأعداد', description: 'قراءة المعداد وتحديد القيمة', icon: '👁️', cognitiveGoal: 'تعزيز التعرف السريع' },
  { stage: 3, title: 'الجمع الأساسي', description: 'جمع بسيط بالمعداد', icon: '➕', cognitiveGoal: 'فهم عملية الإضافة' },
  { stage: 4, title: 'الطرح الأساسي', description: 'طرح بسيط بالمعداد', icon: '➖', cognitiveGoal: 'فهم عملية الإزالة' },
  { stage: 5, title: 'القيمة المكانية', description: 'فهم الآحاد والعشرات والمئات', icon: '🏗️', cognitiveGoal: 'إدراك بنية النظام العشري' },
  { stage: 6, title: 'التصور الذهني', description: 'تخيّل المعداد بدون رؤيته', icon: '🧠', cognitiveGoal: 'بناء الصورة الذهنية' },
  { stage: 7, title: 'الحساب الذهني السريع', description: 'حل سريع بدون أي مساعدة', icon: '⚡', cognitiveGoal: 'الطلاقة العددية' },
];

const VISUALIZATION_STAGES: { stage: VisualizationStage; title: string; description: string; icon: string }[] = [
  { stage: 'full', title: 'كامل', description: 'المعداد مرئي بالكامل', icon: '👁️' },
  { stage: 'partial', title: 'جزئي', description: 'بعض الخرزات مخفية', icon: '🌓' },
  { stage: 'flash', title: 'ومضة', description: 'يظهر لثوانٍ ثم يختفي', icon: '⚡' },
  { stage: 'temporary', title: 'مؤقت', description: 'يظهر ثم يختفي تدريجياً', icon: '🌅' },
  { stage: 'mental', title: 'ذهني', description: 'حساب عقلي كامل', icon: '🧠' },
];

const QUESTIONS_PER_SESSION = 6;

// ═══════════════════════════════════════════════════════
// COGNITIVE COACHING ENGINE
// ═══════════════════════════════════════════════════════
function getCoachingMessage(
  question: CognitiveQuestion,
  errorPatterns: ErrorPattern,
  consecutiveCorrect: number,
  consecutiveWrong: number,
  visualizationStage: VisualizationStage
): CoachingState {
  // Celebration for streaks
  if (consecutiveCorrect >= 3) {
    const celebrations = [
      'رائع! أنت تتقدم بثبات 🌟',
      'ممتاز! عقلك يعمل بسرعة الآن ⚡',
      'أحسنت! التصور الذهني يتطور عندك 🧠',
      'بطل! واصل هكذا 💪',
    ];
    return {
      currentMessage: celebrations[consecutiveCorrect % celebrations.length],
      messageType: 'celebration',
      stepByStep: [],
      currentStep: 0,
      showVisualGuide: false,
    };
  }

  // Corrective guidance after errors
  if (consecutiveWrong >= 2) {
    const corrections: Record<string, { message: string; steps: string[] }> = {
      placeValue: {
        message: 'لنراجع القيمة المكانية معاً',
        steps: ['كل خانة لها قيمة مختلفة', 'الآحاد = 1، العشرات = 10، المئات = 100', 'اقرأ من اليسار لليمين'],
      },
      carrying: {
        message: 'عملية الحمل: عندما تتجاوز 9',
        steps: ['إذا مجموع الآحاد > 9', 'اطرح 10 من الآحاد', 'أضف 1 للعشرات'],
      },
      borrowing: {
        message: 'عملية الاستلاف: عندما لا تكفي',
        steps: ['إذا الآحاد أقل من المطلوب', 'خذ 1 من العشرات (= 10 آحاد)', 'الآن أكمل الطرح'],
      },
      visualization: {
        message: 'تخيّل المعداد خطوة بخطوة',
        steps: ['أغمض عينيك وتخيّل المعداد', 'ضع الخرزات في مكانها بذهنك', 'حرّك الخرزات ذهنياً'],
      },
    };

    let key = 'visualization';
    if (errorPatterns.placeValueConfusion > errorPatterns.carryingMistakes) key = 'placeValue';
    else if (errorPatterns.carryingMistakes > 1) key = 'carrying';
    else if (errorPatterns.borrowingIssues > 1) key = 'borrowing';

    const c = corrections[key];
    return {
      currentMessage: c.message,
      messageType: 'correction',
      stepByStep: c.steps,
      currentStep: 0,
      showVisualGuide: true,
    };
  }

  // Encouragement after single error
  if (consecutiveWrong === 1) {
    const encouragements = [
      'لا بأس، حاول مرة أخرى 💙',
      'كل خطأ يقرّبك من الفهم',
      'فكّر ببطء هذه المرة',
      'تذكّر: الخرزات في ذهنك',
    ];
    return {
      currentMessage: encouragements[Math.floor(Math.random() * encouragements.length)],
      messageType: 'encouragement',
      stepByStep: [],
      currentStep: 0,
      showVisualGuide: false,
    };
  }

  // Stage-specific guidance
  if (visualizationStage === 'flash' || visualizationStage === 'temporary') {
    return {
      currentMessage: 'ركّز جيداً عندما يظهر المعداد - ثم تخيّله',
      messageType: 'guidance',
      stepByStep: ['انظر بتركيز عند الظهور', 'احفظ الصورة في ذهنك', 'أجب من الذاكرة'],
      currentStep: 0,
      showVisualGuide: false,
    };
  }

  // Default hint based on question type
  const hints: Record<string, string> = {
    represent: 'ضع الخرزات واحدة واحدة',
    read: 'عُد الخرزات في كل خانة',
    add: 'ابدأ بالعدد الأول ثم أضف',
    subtract: 'ابدأ بالعدد الأكبر ثم أزل',
    place_value: 'تذكّر: كل خانة × قيمتها',
    mental_viz: 'تخيّل المعداد في ذهنك أولاً',
    fast_mental: 'ثق بحدسك - أجب بسرعة',
    flash_recognition: 'ركّز على الصورة السريعة',
    speed_drill: 'سرعة + دقة = تميّز',
  };

  return {
    currentMessage: hints[question.type] || 'ركّز وفكّر',
    messageType: 'hint',
    stepByStep: [],
    currentStep: 0,
    showVisualGuide: false,
  };
}

// ═══════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════
function loadProgress(): CognitiveProgress {
  try {
    const saved = localStorage.getItem('pythagorath_mental_viz');
    if (saved) return JSON.parse(saved);
  } catch (_e) { /* ignore */ }
  return {
    currentStage: 1,
    stageMastery: {},
    totalSessions: 0,
    visualizationStage: 'full',
    metrics: {
      recognitionSpeed: 0,
      visualizationStrength: 0,
      numberSense: 0,
      accuracy: 0,
      consistency: 0,
      confidence: 0,
      mentalSpeed: 0,
      responseTimes: [],
      errorPatterns: { placeValueConfusion: 0, carryingMistakes: 0, borrowingIssues: 0, slowRecognition: 0, visualizationWeakness: 0 },
      sessionsCompleted: 0,
      streakDays: 0,
    },
    adaptiveDifficulty: 1,
    hintsUsed: 0,
    lastSessionDate: '',
    sessionsToday: 0,
    mentalSpeedBest: 0,
    flashRecognitionBest: 0,
    coachingHistory: [],
  };
}

function saveProgress(p: CognitiveProgress) {
  localStorage.setItem('pythagorath_mental_viz', JSON.stringify(p));
}

// ═══════════════════════════════════════════════════════
// ADAPTIVE DIFFICULTY ENGINE (Enhanced)
// ═══════════════════════════════════════════════════════
function getAdaptiveParams(stage: CognitiveStage, difficulty: number): { maxNum: number; timeLimit: number; flashDuration: number; vizDuration: number } {
  const base = {
    1: { maxNum: 9, timeLimit: 30000, flashDuration: 3000, vizDuration: 5000 },
    2: { maxNum: 9, timeLimit: 20000, flashDuration: 2500, vizDuration: 4000 },
    3: { maxNum: 9, timeLimit: 25000, flashDuration: 2000, vizDuration: 4000 },
    4: { maxNum: 9, timeLimit: 25000, flashDuration: 2000, vizDuration: 4000 },
    5: { maxNum: 99, timeLimit: 30000, flashDuration: 3000, vizDuration: 5000 },
    6: { maxNum: 50, timeLimit: 20000, flashDuration: 1500, vizDuration: 3000 },
    7: { maxNum: 99, timeLimit: 12000, flashDuration: 1000, vizDuration: 2000 },
  }[stage]!;

  const diffIndex = Math.max(0, Math.min(4, Math.round(difficulty) - 1));
  const numScale = [0.5, 0.7, 1, 1.3, 1.6][diffIndex];
  const timeScale = [1.5, 1.2, 1, 0.8, 0.6][diffIndex];
  const flashScale = [1.5, 1.2, 1, 0.7, 0.5][diffIndex];

  return {
    maxNum: Math.max(5, Math.round(base.maxNum * numScale)),
    timeLimit: Math.round(base.timeLimit * timeScale),
    flashDuration: Math.round(base.flashDuration * flashScale),
    vizDuration: Math.round(base.vizDuration * flashScale),
  };
}

function adjustDifficulty(current: number, correct: boolean, responseTime: number, timeLimit: number): number {
  let delta = 0;
  if (correct && responseTime < timeLimit * 0.4) delta = 0.4;
  else if (correct && responseTime < timeLimit * 0.7) delta = 0.2;
  else if (correct) delta = 0.05;
  else if (!correct && responseTime < timeLimit * 0.3) delta = -0.2;
  else delta = -0.4;

  return Math.round(Math.max(1, Math.min(5, current + delta)) * 10) / 10;
}

// ═══════════════════════════════════════════════════════
// ERROR INTELLIGENCE (Enhanced)
// ═══════════════════════════════════════════════════════
function analyzeError(question: CognitiveQuestion, userAnswer: number, patterns: ErrorPattern, responseTime: number, timeLimit: number): ErrorPattern {
  const newPatterns = { ...patterns };
  const diff = Math.abs(userAnswer - question.answer);

  // Place value confusion
  if (question.stage >= 5 && (diff === 10 || diff === 100 || diff % 10 === 0)) {
    newPatterns.placeValueConfusion += 1;
  }

  // Carrying mistakes
  if (question.type === 'add' && question.operand1 && question.operand2) {
    const onesSum = (question.operand1 % 10) + (question.operand2 % 10);
    if (onesSum >= 10 && (userAnswer === question.answer - 10 || userAnswer === question.answer + 10)) {
      newPatterns.carryingMistakes += 1;
    }
  }

  // Borrowing issues
  if (question.type === 'subtract' && question.operand1 && question.operand2) {
    const onesA = question.operand1 % 10;
    const onesB = question.operand2 % 10;
    if (onesA < onesB && (userAnswer === question.answer + 10 || userAnswer === question.answer - 10)) {
      newPatterns.borrowingIssues += 1;
    }
  }

  // Slow recognition
  if (responseTime > timeLimit * 0.9) {
    newPatterns.slowRecognition += 1;
  }

  // Visualization weakness (for mental stages)
  if ((question.type === 'mental_viz' || question.type === 'fast_mental' || question.type === 'flash_recognition') && diff > 0) {
    newPatterns.visualizationWeakness += 1;
  }

  return newPatterns;
}

// ═══════════════════════════════════════════════════════
// QUESTION GENERATOR (Enhanced with Speed Training)
// ═══════════════════════════════════════════════════════
function generateCognitiveQuestion(stage: CognitiveStage, difficulty: number, includeSpeedDrill = false): CognitiveQuestion {
  const id = `cq_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  const params = getAdaptiveParams(stage, difficulty);

  // Speed drill mode for stages 6-7
  if (includeSpeedDrill && stage >= 6 && Math.random() > 0.5) {
    const max = Math.min(params.maxNum, 50);
    const a = Math.floor(Math.random() * (max - 5)) + 5;
    const b = Math.floor(Math.random() * Math.min(a, 20)) + 1;
    const isAdd = Math.random() > 0.4;
    return {
      id, stage, type: 'speed_drill', difficulty,
      instruction: `⚡ سريع: ${isAdd ? `${a} + ${b}` : `${a} - ${b}`}`,
      answer: isAdd ? a + b : a - b,
      operand1: a, operand2: b,
      coachingTip: 'لا تفكر كثيراً - ثق بحدسك!',
    };
  }

  // Flash recognition for stages 5-7
  if (stage >= 5 && Math.random() > 0.7) {
    const tens = Math.floor(Math.random() * Math.min(Math.floor(params.maxNum / 10), 5)) + 1;
    const ones = Math.floor(Math.random() * 10);
    const target = tens * 10 + ones;
    return {
      id, stage, type: 'flash_recognition', difficulty,
      instruction: '⚡ ما العدد الذي رأيته؟',
      answer: target, targetValue: target,
      coachingTip: 'ركّز على الصورة السريعة ثم أجب',
    };
  }

  switch (stage) {
    case 1: {
      const target = Math.floor(Math.random() * Math.min(params.maxNum, 9)) + 1;
      return {
        id, stage, type: 'represent', difficulty,
        instruction: `ضع ${target} خرزات على المعداد`,
        hint: `العدد ${target} يعني ${target} خرزات في خانة الآحاد`,
        targetValue: target, answer: target,
        coachingTip: 'اضغط + لإضافة خرزة واحدة في كل مرة',
      };
    }
    case 2: {
      const maxVal = Math.min(params.maxNum, 99);
      const target = maxVal <= 9
        ? Math.floor(Math.random() * 9) + 1
        : Math.floor(Math.random() * (maxVal - 10)) + 10;
      return {
        id, stage, type: 'read', difficulty,
        instruction: 'ما العدد المعروض على المعداد؟',
        hint: target >= 10 ? 'انظر للعشرات أولاً ثم الآحاد' : 'عُد الخرزات',
        answer: target,
        coachingTip: 'اقرأ من اليسار لليمين: عشرات ثم آحاد',
      };
    }
    case 3: {
      const max = Math.max(5, Math.min(params.maxNum, 9));
      const a = Math.floor(Math.random() * (max - 1)) + 1;
      const bMax = Math.max(1, Math.min(9 - a, max - 1));
      const b = Math.floor(Math.random() * bMax) + 1;
      return {
        id, stage, type: 'add', difficulty,
        instruction: `${a} + ${b} = ؟`,
        hint: `ابدأ بـ ${a} خرزات، ثم أضف ${b}`,
        operand1: a, operand2: b, answer: a + b,
        coachingTip: `ضع ${a} أولاً ثم أضف ${b} واحدة واحدة`,
      };
    }
    case 4: {
      const max = Math.max(5, Math.min(params.maxNum, 9));
      const a = Math.floor(Math.random() * (max - 2)) + 3;
      const bMax = Math.max(1, a - 1);
      const b = Math.floor(Math.random() * bMax) + 1;
      return {
        id, stage, type: 'subtract', difficulty,
        instruction: `${a} - ${b} = ؟`,
        hint: `ابدأ بـ ${a} خرزات، ثم أزل ${b}`,
        operand1: a, operand2: b, answer: a - b,
        coachingTip: `ضع ${a} أولاً ثم أزل ${b} واحدة واحدة`,
      };
    }
    case 5: {
      const tens = Math.floor(Math.random() * Math.min(Math.floor(params.maxNum / 10), 9)) + 1;
      const ones = Math.floor(Math.random() * 10);
      const target = tens * 10 + ones;
      const questionTypes = [
        { instruction: `كم عشرة في العدد ${target}؟`, answer: tens, hint: `العدد ${target} = ${tens} عشرات + ${ones} آحاد` },
        { instruction: `مثّل العدد ${target} بالخانات`, answer: target, hint: `${tens} في العشرات، ${ones} في الآحاد` },
      ];
      const q = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      return { id, stage, type: 'place_value', difficulty, instruction: q.instruction, hint: q.hint, answer: q.answer, targetValue: target, coachingTip: 'كل خانة لها قيمة: آحاد=1، عشرات=10' };
    }
    case 6: {
      const max = Math.min(params.maxNum, 50);
      const a = Math.floor(Math.random() * (max - 5)) + 5;
      const b = Math.floor(Math.random() * Math.min(a, 15)) + 1;
      const isAdd = Math.random() > 0.4;
      return {
        id, stage, type: 'mental_viz', difficulty,
        instruction: isAdd ? `تخيّل: ${a} + ${b}` : `تخيّل: ${a} - ${b}`,
        hint: isAdd ? `تخيّل ${a} خرزات ثم أضف ${b}` : `تخيّل ${a} خرزات ثم أزل ${b}`,
        operand1: a, operand2: b, answer: isAdd ? a + b : a - b,
        coachingTip: 'أغمض عينيك وتخيّل المعداد - حرّك الخرزات بذهنك',
      };
    }
    case 7: {
      const max = Math.min(params.maxNum, 99);
      const a = Math.floor(Math.random() * (max - 10)) + 10;
      const b = Math.floor(Math.random() * Math.min(30, max / 2)) + 3;
      const isAdd = Math.random() > 0.4;
      return {
        id, stage, type: 'fast_mental', difficulty,
        instruction: isAdd ? `${a} + ${b}` : `${a} - ${b}`,
        operand1: a, operand2: b, answer: isAdd ? a + b : a - b,
        coachingTip: 'أجب بأسرع ما يمكن - ثق بنفسك!',
      };
    }
    default:
      return { id, stage: 1, type: 'represent', difficulty: 1, instruction: 'ضع 5 خرزات', answer: 5 };
  }
}

// ═══════════════════════════════════════════════════════
// GUIDED LEARNING CONTENT
// ═══════════════════════════════════════════════════════
function getGuidedLessons(stage: CognitiveStage): { title: string; explanation: string; abacusState: AbacusState; highlight?: string; animation?: string }[] {
  switch (stage) {
    case 1: return [
      { title: 'المعداد أداة حساب', explanation: 'كل خرزة تمثل عدداً واحداً', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
      { title: 'العدد 1', explanation: 'خرزة واحدة = العدد 1', abacusState: { ones: 1, tens: 0, hundreds: 0 }, highlight: 'ones', animation: 'slide-up' },
      { title: 'العدد 4', explanation: 'أربع خرزات = العدد 4', abacusState: { ones: 4, tens: 0, hundreds: 0 }, highlight: 'ones', animation: 'slide-up' },
      { title: 'العدد 7', explanation: 'سبع خرزات = العدد 7', abacusState: { ones: 7, tens: 0, hundreds: 0 }, highlight: 'ones', animation: 'slide-up' },
      { title: 'جرّب بنفسك!', explanation: 'الآن حاول أنت - اضغط + لإضافة خرزات', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
    ];
    case 2: return [
      { title: 'خانة العشرات', explanation: 'الخرزة الخضراء = 10', abacusState: { ones: 0, tens: 1, hundreds: 0 }, highlight: 'tens', animation: 'pulse' },
      { title: 'العدد 20', explanation: 'خرزتان خضراوان = 20', abacusState: { ones: 0, tens: 2, hundreds: 0 }, highlight: 'tens' },
      { title: 'العدد 35', explanation: '3 عشرات + 5 آحاد = 35', abacusState: { ones: 5, tens: 3, hundreds: 0 } },
      { title: 'اقرأ العدد', explanation: 'ابدأ من اليسار: العشرات ثم الآحاد', abacusState: { ones: 7, tens: 4, hundreds: 0 } },
    ];
    case 3: return [
      { title: 'الجمع = إضافة خرزات', explanation: 'نبدأ بالعدد الأول ثم نضيف', abacusState: { ones: 3, tens: 0, hundreds: 0 }, highlight: 'ones' },
      { title: '3 + 2', explanation: 'نبدأ بـ 3...', abacusState: { ones: 3, tens: 0, hundreds: 0 }, highlight: 'ones', animation: 'pulse' },
      { title: '3 + 2 = 5', explanation: 'نضيف 2 خرزات → 5!', abacusState: { ones: 5, tens: 0, hundreds: 0 }, highlight: 'ones', animation: 'slide-up' },
      { title: '4 + 5 = 9', explanation: 'نبدأ بـ 4 ونضيف 5', abacusState: { ones: 9, tens: 0, hundreds: 0 }, highlight: 'ones' },
    ];
    case 4: return [
      { title: 'الطرح = إزالة خرزات', explanation: 'نبدأ بالعدد الأكبر ثم نزيل', abacusState: { ones: 7, tens: 0, hundreds: 0 }, highlight: 'ones' },
      { title: '7 - 3', explanation: 'نبدأ بـ 7...', abacusState: { ones: 7, tens: 0, hundreds: 0 }, highlight: 'ones', animation: 'pulse' },
      { title: '7 - 3 = 4', explanation: 'نزيل 3 خرزات → 4!', abacusState: { ones: 4, tens: 0, hundreds: 0 }, highlight: 'ones', animation: 'slide-down' },
      { title: '8 - 5 = 3', explanation: 'نبدأ بـ 8 ونزيل 5', abacusState: { ones: 3, tens: 0, hundreds: 0 }, highlight: 'ones' },
    ];
    case 5: return [
      { title: 'القيمة المكانية', explanation: 'كل خانة لها قيمة مختلفة', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
      { title: 'الآحاد = 1', explanation: 'خرزة واحدة هنا = 1', abacusState: { ones: 1, tens: 0, hundreds: 0 }, highlight: 'ones' },
      { title: 'العشرات = 10', explanation: 'خرزة واحدة هنا = 10', abacusState: { ones: 0, tens: 1, hundreds: 0 }, highlight: 'tens' },
      { title: 'المئات = 100', explanation: 'خرزة واحدة هنا = 100', abacusState: { ones: 0, tens: 0, hundreds: 1 }, highlight: 'hundreds' },
      { title: '235 = 2 مئات + 3 عشرات + 5 آحاد', explanation: 'كل خانة مستقلة', abacusState: { ones: 5, tens: 3, hundreds: 2 } },
    ];
    case 6: return [
      { title: 'التصور الذهني', explanation: 'سنتعلم تخيّل المعداد في الذهن', abacusState: { ones: 3, tens: 2, hundreds: 0 } },
      { title: 'المرحلة 1: انظر جيداً', explanation: 'شاهد المعداد ثم سيختفي تدريجياً', abacusState: { ones: 3, tens: 2, hundreds: 0 }, animation: 'pulse' },
      { title: 'المرحلة 2: ومضة سريعة', explanation: 'المعداد يظهر لثوانٍ فقط - احفظ الصورة', abacusState: { ones: 5, tens: 1, hundreds: 0 } },
      { title: 'المرحلة 3: تخيّل كامل', explanation: 'الآن حرّك الخرزات بخيالك فقط', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
      { title: 'أنت جاهز!', explanation: 'المعداد في ذهنك - ثق بنفسك', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
    ];
    case 7: return [
      { title: 'الحساب الذهني السريع', explanation: 'الآن ستحل بسرعة بدون مساعدة', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
      { title: 'تدريب السرعة', explanation: 'أعداد تظهر وتختفي - أجب فوراً', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
      { title: 'ثق بنفسك', explanation: 'أنت بنيت الأساس - الآن انطلق!', abacusState: { ones: 0, tens: 0, hundreds: 0 } },
    ];
    default: return [];
  }
}

// ═══════════════════════════════════════════════════════
// INTERACTIVE ABACUS COMPONENT (with Visualization Stages)
// ═══════════════════════════════════════════════════════
function CognitiveAbacus({
  value, onChange, readonly = false, visualizationStage = 'full',
  columns = ['ones', 'tens'], highlightColumn, animating, flashActive = false,
}: {
  value: AbacusState;
  onChange: (state: AbacusState) => void;
  readonly?: boolean;
  visualizationStage?: VisualizationStage;
  columns?: ('ones' | 'tens' | 'hundreds')[];
  highlightColumn?: string;
  animating?: string;
  flashActive?: boolean;
}) {
  const columnConfig = {
    hundreds: { label: 'مئات', color: 'bg-blue-400', activeColor: 'bg-blue-500', max: 9 },
    tens: { label: 'عشرات', color: 'bg-emerald-400', activeColor: 'bg-emerald-500', max: 9 },
    ones: { label: 'آحاد', color: 'bg-amber-400', activeColor: 'bg-amber-500', max: 9 },
  };

  const handleBead = (col: keyof AbacusState, action: 'add' | 'remove') => {
    if (readonly) return;
    const newVal = action === 'add' ? Math.min(value[col] + 1, 9) : Math.max(value[col] - 1, 0);
    onChange({ ...value, [col]: newVal });
  };

  // Mental mode - show brain icon
  if (visualizationStage === 'mental') {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-6">
        <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-3 border-2 border-purple-100 animate-pulse">
          <Brain className="w-10 h-10 text-purple-400" />
        </div>
        <p className="text-purple-500 font-tajawal text-sm">تخيّل المعداد في ذهنك</p>
        <p className="text-purple-300 font-tajawal text-xs mt-1">حرّك الخرزات بخيالك</p>
      </div>
    );
  }

  // Flash mode - show/hide with animation
  if (visualizationStage === 'flash' && !flashActive) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-6">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-3 border-2 border-amber-100">
          <EyeOff className="w-8 h-8 text-amber-300" />
        </div>
        <p className="text-amber-500 font-tajawal text-sm">اختفى المعداد - تذكّر ما رأيت</p>
      </div>
    );
  }

  // Partial mode - blur some beads
  const isPartial = visualizationStage === 'partial';
  // Temporary mode - fading effect
  const isTemporary = visualizationStage === 'temporary';

  const displayedColumns = columns.slice();

  return (
    <div className={`flex flex-col items-center transition-all duration-700 ${isPartial ? 'opacity-50 blur-[1.5px]' : ''} ${isTemporary ? 'opacity-70' : ''}`}>
      <div className="bg-gradient-to-b from-amber-50/80 to-orange-50/80 rounded-3xl p-5 border border-amber-100 shadow-sm w-full max-w-xs">
        {/* Top bar */}
        <div className="h-2 bg-amber-600/80 rounded-full mb-3" />

        {/* Columns - dir=rtl ensures ones(first) is on the right */}
        <div className="flex justify-center gap-5" dir="rtl">
          {displayedColumns.map((col) => {
            const cfg = columnConfig[col];
            const isHighlighted = highlightColumn === col;
            return (
              <div key={col} className={`flex flex-col items-center transition-all duration-300 ${isHighlighted ? 'scale-105' : ''} ${animating === col ? 'animate-pulse' : ''}`}>
                <span className="text-[10px] font-bold text-amber-700/70 mb-1.5 font-tajawal">{cfg.label}</span>

                {!readonly && (
                  <button
                    onClick={() => handleBead(col, 'add')}
                    className="w-7 h-7 rounded-full bg-white/80 border border-amber-200 text-amber-600 font-bold text-sm mb-1.5 hover:bg-amber-50 transition-all active:scale-90"
                  >+</button>
                )}

                <div className="relative w-9 flex flex-col items-center">
                  <div className="absolute inset-x-0 mx-auto w-1 h-full bg-amber-500/60 rounded-full" />
                  <div className="relative z-10 flex flex-col-reverse items-center gap-0.5 min-h-[130px] justify-start pt-1">
                    {Array.from({ length: value[col] }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-6 ${cfg.color} rounded-full shadow-sm border border-white/40 transition-all duration-200 ${
                          !readonly ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                        } ${isHighlighted ? 'ring-1 ring-blue-300' : ''} ${isPartial && i % 2 === 0 ? 'opacity-30' : ''}`}
                        onClick={() => !readonly && handleBead(col, 'remove')}
                      />
                    ))}
                    {Array.from({ length: 9 - value[col] }).map((_, i) => (
                      <div key={`e-${i}`} className="w-8 h-6 rounded-full border border-dashed border-amber-200/40" />
                    ))}
                  </div>
                </div>

                {!readonly && (
                  <button
                    onClick={() => handleBead(col, 'remove')}
                    className="w-7 h-7 rounded-full bg-white/80 border border-amber-200 text-amber-600 font-bold text-sm mt-1.5 hover:bg-amber-50 transition-all active:scale-90"
                  >−</button>
                )}

                <div className="mt-1.5 w-7 h-7 bg-white rounded-lg border border-amber-100 flex items-center justify-center">
                  <span className="font-bold text-sm text-amber-800">{value[col]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div className="h-2 bg-amber-600/80 rounded-full mt-3" />
      </div>

      {/* Visualization stage indicator */}
      {visualizationStage !== 'full' && (
        <div className="mt-2 flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] text-slate-400 font-tajawal">
            {visualizationStage === 'partial' ? 'رؤية جزئية' : visualizationStage === 'temporary' ? 'يختفي قريباً...' : 'ومضة'}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COACHING BUBBLE COMPONENT
// ═══════════════════════════════════════════════════════
function CoachingBubble({ coaching }: { coaching: CoachingState }) {
  if (!coaching.currentMessage) return null;

  const bgColors = {
    hint: 'bg-blue-50 border-blue-100',
    guidance: 'bg-indigo-50 border-indigo-100',
    encouragement: 'bg-emerald-50 border-emerald-100',
    correction: 'bg-amber-50 border-amber-100',
    celebration: 'bg-purple-50 border-purple-100',
  };

  const textColors = {
    hint: 'text-blue-700',
    guidance: 'text-indigo-700',
    encouragement: 'text-emerald-700',
    correction: 'text-amber-700',
    celebration: 'text-purple-700',
  };

  const icons = {
    hint: '💡',
    guidance: '🧭',
    encouragement: '💙',
    correction: '📝',
    celebration: '🌟',
  };

  return (
    <div className={`rounded-2xl p-3 border ${bgColors[coaching.messageType]} transition-all duration-300`}>
      <div className="flex items-start gap-2">
        <span className="text-base">{icons[coaching.messageType]}</span>
        <div className="flex-1">
          <p className={`text-sm font-tajawal font-medium ${textColors[coaching.messageType]}`}>
            {coaching.currentMessage}
          </p>
          {coaching.stepByStep.length > 0 && (
            <div className="mt-2 space-y-1">
              {coaching.stepByStep.map((step, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-xs font-tajawal ${textColors[coaching.messageType]} opacity-80`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    i <= coaching.currentStep ? 'bg-white/80' : 'bg-white/40'
                  }`}>
                    {i + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GUIDED LEARNING COMPONENT
// ═══════════════════════════════════════════════════════
function GuidedLearning({ stage, onComplete }: { stage: CognitiveStage; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const lessons = getGuidedLessons(stage);
  const currentLesson = lessons[step];

  if (!currentLesson) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-9 h-9 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-emerald-700 font-tajawal mb-1">فهمت المرحلة!</h3>
        <p className="text-sm text-slate-500 font-tajawal mb-5">هيا نتدرب الآن</p>
        <button onClick={onComplete} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-tajawal font-bold hover:bg-emerald-700 transition-all text-sm">
          ابدأ التدريب
        </button>
      </div>
    );
  }

  const columns: ('ones' | 'tens' | 'hundreds')[] =
    stage <= 2 ? (stage === 1 ? ['ones'] : ['ones', 'tens']) :
    stage <= 4 ? ['ones', 'tens'] :
    ['ones', 'tens', 'hundreds'];

  return (
    <div className="space-y-5">
      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5">
        {lessons.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-blue-500 w-4' : i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
        ))}
      </div>

      {/* Lesson content */}
      <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100/60">
        <p className="text-base font-bold text-blue-800 font-tajawal text-center">{currentLesson.title}</p>
        <p className="text-sm text-blue-600/80 font-tajawal text-center mt-1">{currentLesson.explanation}</p>
      </div>

      {/* Abacus */}
      <CognitiveAbacus
        value={currentLesson.abacusState}
        onChange={() => {}}
        readonly={true}
        columns={columns}
        highlightColumn={currentLesson.highlight}
        animating={currentLesson.animation ? currentLesson.highlight : undefined}
      />

      {/* Navigation */}
      <div className="flex justify-center gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-tajawal text-sm hover:bg-slate-200 transition-all">
            السابق
          </button>
        )}
        <button onClick={() => setStep(step + 1)} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-tajawal font-bold text-sm hover:bg-blue-700 transition-all">
          {step < lessons.length - 1 ? 'التالي' : 'فهمت ✓'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PRACTICE SESSION (Enhanced with Visualization & Coaching)
// ═══════════════════════════════════════════════════════
function PracticeSession({ stage, difficulty, visualizationStage, onComplete }: {
  stage: CognitiveStage;
  difficulty: number;
  visualizationStage: VisualizationStage;
  onComplete: (results: { correct: number; total: number; avgTime: number; errors: ErrorPattern; finalDifficulty: number; mentalSpeed: number }) => void;
}) {
  const [question, setQuestion] = useState<CognitiveQuestion>(() => generateCognitiveQuestion(stage, difficulty, stage >= 6));
  const [abacusValue, setAbacusValue] = useState<AbacusState>({ ones: 0, tens: 0, hundreds: 0 });
  const [inputAnswer, setInputAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showHint, setShowHint] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty);
  const [errors, setErrors] = useState<ErrorPattern>({ placeValueConfusion: 0, carryingMistakes: 0, borrowingIssues: 0, slowRecognition: 0, visualizationWeakness: 0 });
  const [times, setTimes] = useState<number[]>([]);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [coaching, setCoaching] = useState<CoachingState>({ currentMessage: '', messageType: 'hint', stepByStep: [], currentStep: 0, showVisualGuide: false });
  const [flashVisible, setFlashVisible] = useState(false);
  const [temporaryFading, setTemporaryFading] = useState(false);
  const startTime = useRef(Date.now());
  const params = getAdaptiveParams(stage, currentDifficulty);

  // Determine effective visualization for this question
  const getEffectiveViz = (): VisualizationStage => {
    if (stage <= 4) return 'full';
    if (stage === 5) return visualizationStage === 'mental' ? 'partial' : visualizationStage;
    if (stage === 6) return visualizationStage;
    return 'mental'; // stage 7 always mental
  };

  const effectiveViz = getEffectiveViz();

  // Flash timer for flash mode
  useEffect(() => {
    if (effectiveViz === 'flash' && !feedback) {
      setFlashVisible(true);
      const timer = setTimeout(() => setFlashVisible(false), params.flashDuration);
      return () => clearTimeout(timer);
    }
    if (effectiveViz === 'temporary' && !feedback) {
      setTemporaryFading(false);
      const timer = setTimeout(() => setTemporaryFading(true), params.vizDuration);
      return () => clearTimeout(timer);
    }
  }, [question.id, effectiveViz, feedback, params.flashDuration, params.vizDuration]);

  // Update coaching on question change
  useEffect(() => {
    const newCoaching = getCoachingMessage(question, errors, consecutiveCorrect, consecutiveWrong, effectiveViz);
    setCoaching(newCoaching);
  }, [question.id, consecutiveCorrect, consecutiveWrong]);

  // Determine if we use abacus input or text input
  const usesAbacusInput = (stage <= 5 && effectiveViz === 'full') && (question.type === 'represent' || question.type === 'place_value' || question.type === 'add' || question.type === 'subtract');

  const columns: ('ones' | 'tens' | 'hundreds')[] =
    stage <= 2 ? (stage === 1 ? ['ones'] : ['ones', 'tens']) :
    stage <= 4 ? ['ones', 'tens'] :
    ['ones', 'tens', 'hundreds'];

  const getAbacusTotal = () => abacusValue.hundreds * 100 + abacusValue.tens * 10 + abacusValue.ones;

  const checkAnswer = () => {
    const responseTime = Date.now() - startTime.current;
    let userAnswer: number;

    if (usesAbacusInput) {
      userAnswer = getAbacusTotal();
    } else {
      userAnswer = parseInt(inputAnswer) || 0;
    }

    const isCorrect = userAnswer === question.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    const newTimes = [...times, responseTime];
    setTimes(newTimes);

    // Track streaks
    if (isCorrect) {
      setConsecutiveCorrect(prev => prev + 1);
      setConsecutiveWrong(0);
    } else {
      setConsecutiveWrong(prev => prev + 1);
      setConsecutiveCorrect(0);
    }

    // Error analysis
    let newErrors = errors;
    if (!isCorrect) {
      newErrors = analyzeError(question, userAnswer, errors, responseTime, params.timeLimit);
      setErrors(newErrors);
    }

    // Adaptive difficulty
    const newDiff = adjustDifficulty(currentDifficulty, isCorrect, responseTime, params.timeLimit);
    setCurrentDifficulty(newDiff);

    const newScore = { correct: score.correct + (isCorrect ? 1 : 0), total: score.total + 1 };
    setScore(newScore);

    setTimeout(() => {
      setFeedback(null);
      setShowHint(false);
      if (newScore.total >= QUESTIONS_PER_SESSION) {
        const avgTime = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
        const mentalSpeed = stage >= 6 ? Math.round(1000 / (avgTime / 1000)) : 0;
        onComplete({ correct: newScore.correct, total: newScore.total, avgTime, errors: newErrors, finalDifficulty: newDiff, mentalSpeed });
      } else {
        setQuestion(generateCognitiveQuestion(stage, Math.round(newDiff), stage >= 6));
        setAbacusValue({ ones: 0, tens: 0, hundreds: 0 });
        setInputAnswer('');
        startTime.current = Date.now();
      }
    }, 1800);
  };

  const useHint = () => {
    setShowHint(true);
    setHintCount(hintCount + 1);
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all" style={{ width: `${(score.total / QUESTIONS_PER_SESSION) * 100}%` }} />
        </div>
        <span className="text-xs text-slate-400 font-tajawal">{score.total}/{QUESTIONS_PER_SESSION}</span>
      </div>

      {/* Difficulty + Visualization indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(d => (
            <div key={d} className={`w-1.5 h-3 rounded-full transition-all ${d <= Math.round(currentDifficulty) ? 'bg-blue-400' : 'bg-slate-100'}`} />
          ))}
        </div>
        {effectiveViz !== 'full' && (
          <div className="flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-full">
            <Brain className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-purple-500 font-tajawal">
              {effectiveViz === 'partial' ? 'جزئي' : effectiveViz === 'flash' ? 'ومضة' : effectiveViz === 'temporary' ? 'مؤقت' : 'ذهني'}
            </span>
          </div>
        )}
      </div>

      {/* Coaching bubble */}
      {!feedback && coaching.currentMessage && (
        <CoachingBubble coaching={coaching} />
      )}

      {/* Question */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
        <p className="text-lg font-bold text-slate-800 font-tajawal">{question.instruction}</p>
        {question.type === 'speed_drill' && (
          <p className="text-xs text-slate-400 mt-1 font-tajawal">أجب بأسرع ما يمكن!</p>
        )}
      </div>

      {/* Hint */}
      {showHint && question.hint && (
        <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100/60 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 font-tajawal">{question.hint}</p>
        </div>
      )}

      {/* Abacus or Input based on question type and visualization */}
      {question.type === 'read' || question.type === 'flash_recognition' ? (
        <div className="space-y-4">
          <CognitiveAbacus
            value={{
              ones: (question.answer || 0) % 10,
              tens: Math.floor((question.answer || 0) / 10) % 10,
              hundreds: Math.floor((question.answer || 0) / 100),
            }}
            onChange={() => {}}
            readonly={true}
            visualizationStage={effectiveViz}
            columns={columns}
            flashActive={flashVisible}
          />
          <div className="flex justify-center">
            <input
              type="number"
              value={inputAnswer}
              onChange={(e) => setInputAnswer(e.target.value)}
              placeholder="؟"
              className="w-28 text-center text-2xl font-bold border border-slate-200 rounded-xl py-2.5 focus:border-blue-400 focus:outline-none font-tajawal bg-white"
              dir="ltr"
              onKeyDown={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
            />
          </div>
        </div>
      ) : usesAbacusInput ? (
        <div className="space-y-3">
          <CognitiveAbacus
            value={abacusValue}
            onChange={setAbacusValue}
            visualizationStage="full"
            columns={columns}
          />
          <div className="flex justify-center">
            <button onClick={() => setAbacusValue({ ones: 0, tens: 0, hundreds: 0 })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all font-tajawal">
              <RotateCcw className="w-3 h-3" /> مسح
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {effectiveViz !== 'mental' && effectiveViz !== 'flash' && (
            <CognitiveAbacus
              value={{ ones: 0, tens: 0, hundreds: 0 }}
              onChange={() => {}}
              readonly={true}
              visualizationStage={temporaryFading ? 'mental' : effectiveViz}
              columns={columns}
            />
          )}
          {(effectiveViz === 'mental' || (effectiveViz === 'flash' && !flashVisible)) && (
            <div className="flex justify-center py-6">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center animate-pulse">
                <Brain className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          )}
          {effectiveViz === 'flash' && flashVisible && (
            <CognitiveAbacus
              value={{
                ones: (question.operand1 || 0) % 10,
                tens: Math.floor((question.operand1 || 0) / 10) % 10,
                hundreds: 0,
              }}
              onChange={() => {}}
              readonly={true}
              visualizationStage="full"
              columns={columns}
              flashActive={true}
            />
          )}
          <div className="flex justify-center">
            <input
              type="number"
              value={inputAnswer}
              onChange={(e) => setInputAnswer(e.target.value)}
              placeholder="؟"
              className="w-28 text-center text-2xl font-bold border border-slate-200 rounded-xl py-2.5 focus:border-blue-400 focus:outline-none font-tajawal bg-white"
              dir="ltr"
              onKeyDown={(e) => e.key === 'Enter' && !feedback && checkAnswer()}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {!feedback && (
        <div className="flex flex-col items-center gap-2">
          <button onClick={checkAnswer} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-tajawal font-bold text-sm hover:bg-blue-700 transition-all active:scale-95">
            تحقق
          </button>
          {!showHint && hintCount < 2 && question.hint && (
            <button onClick={useHint} className="text-xs text-slate-400 hover:text-blue-500 font-tajawal transition-all">
              💡 تلميح
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`text-center py-3 rounded-xl ${feedback === 'correct' ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-center gap-2">
            {feedback === 'correct' ? (
              <>
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <span className="text-base font-bold text-emerald-700 font-tajawal">
                  {consecutiveCorrect >= 3 ? 'رائع! 🌟' : 'صحيح!'}
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-red-400" />
                <span className="text-base font-bold text-red-600 font-tajawal">الإجابة: {question.answer}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MENTAL SPEED TRAINING MODE
// ═══════════════════════════════════════════════════════
function SpeedTraining({ difficulty, onComplete }: {
  difficulty: number;
  onComplete: (results: { correct: number; total: number; avgTime: number; bestTime: number }) => void;
}) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [times, setTimes] = useState<number[]>([]);
  const [currentNum, setCurrentNum] = useState(0);
  const [inputAnswer, setInputAnswer] = useState('');
  const [phase, setPhase] = useState<'flash' | 'answer' | 'feedback'>('flash');
  const [isCorrect, setIsCorrect] = useState(false);
  const [operation, setOperation] = useState<{ a: number; b: number; op: '+' | '-'; answer: number }>({ a: 0, b: 0, op: '+', answer: 0 });
  const startTime = useRef(Date.now());
  const totalRounds = 8;

  const generateRound = useCallback(() => {
    const max = Math.min(50, Math.round(20 * difficulty));
    const a = Math.floor(Math.random() * (max - 5)) + 5;
    const b = Math.floor(Math.random() * Math.min(a, 15)) + 1;
    const op = Math.random() > 0.4 ? '+' as const : '-' as const;
    const answer = op === '+' ? a + b : a - b;
    setOperation({ a, b, op, answer });
    setCurrentNum(a);
    setPhase('flash');
    startTime.current = Date.now();

    // Flash the first number, then show operation
    setTimeout(() => {
      setPhase('answer');
    }, Math.max(800, 2000 - difficulty * 200));
  }, [difficulty]);

  useEffect(() => {
    generateRound();
  }, []);

  const submitAnswer = () => {
    const responseTime = Date.now() - startTime.current;
    const userAnswer = parseInt(inputAnswer) || 0;
    const correct = userAnswer === operation.answer;
    setIsCorrect(correct);
    setPhase('feedback');

    const newTimes = [...times, responseTime];
    setTimes(newTimes);
    const newScore = { correct: score.correct + (correct ? 1 : 0), total: score.total + 1 };
    setScore(newScore);

    setTimeout(() => {
      if (round + 1 >= totalRounds) {
        const bestTime = Math.min(...newTimes);
        const avgTime = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
        onComplete({ correct: newScore.correct, total: newScore.total, avgTime, bestTime });
      } else {
        setRound(round + 1);
        setInputAnswer('');
        generateRound();
      }
    }, 1200);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-slate-700 font-tajawal">تدريب السرعة</span>
        </div>
        <span className="text-xs text-slate-400 font-tajawal">{round + 1}/{totalRounds}</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all" style={{ width: `${((round) / totalRounds) * 100}%` }} />
      </div>

      {/* Flash phase */}
      {phase === 'flash' && (
        <div className="text-center py-10">
          <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <span className="text-4xl font-bold text-amber-700">{currentNum}</span>
          </div>
          <p className="text-xs text-slate-400 mt-3 font-tajawal">ركّز...</p>
        </div>
      )}

      {/* Answer phase */}
      {phase === 'answer' && (
        <div className="text-center space-y-4">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <p className="text-2xl font-bold text-slate-800 font-tajawal">
              {operation.a} {operation.op} {operation.b} = ؟
            </p>
          </div>
          <input
            type="number"
            value={inputAnswer}
            onChange={(e) => setInputAnswer(e.target.value)}
            placeholder="؟"
            className="w-28 mx-auto text-center text-2xl font-bold border border-slate-200 rounded-xl py-2.5 focus:border-amber-400 focus:outline-none font-tajawal bg-white block"
            dir="ltr"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
          />
          <button onClick={submitAnswer} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-tajawal font-bold text-sm hover:bg-amber-600 transition-all">
            ✓
          </button>
        </div>
      )}

      {/* Feedback phase */}
      {phase === 'feedback' && (
        <div className={`text-center py-8 rounded-2xl ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {isCorrect ? (
            <div className="space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-lg font-bold text-emerald-700 font-tajawal">سريع! ⚡</p>
              <p className="text-xs text-emerald-500 font-tajawal">{Math.round((Date.now() - startTime.current) / 1000)} ثانية</p>
            </div>
          ) : (
            <div className="space-y-2">
              <XCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-lg font-bold text-red-600 font-tajawal">الإجابة: {operation.answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COGNITIVE METRICS DISPLAY
// ═══════════════════════════════════════════════════════
function MetricsCard({ metrics }: { metrics: CognitiveMetrics }) {
  const items = [
    { label: 'الدقة', value: metrics.accuracy, icon: Target, color: 'text-emerald-600' },
    { label: 'سرعة التعرف', value: Math.min(100, Math.round(100 - (metrics.recognitionSpeed / 300))), icon: Clock, color: 'text-blue-600' },
    { label: 'التصور الذهني', value: metrics.visualizationStrength, icon: Brain, color: 'text-purple-600' },
    { label: 'الحس العددي', value: metrics.numberSense, icon: Zap, color: 'text-amber-600' },
    { label: 'الثقة', value: metrics.confidence, icon: Heart, color: 'text-rose-500' },
    { label: 'السرعة الذهنية', value: Math.min(100, metrics.mentalSpeed), icon: Star, color: 'text-orange-500' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bg-white rounded-xl p-2.5 border border-slate-100">
            <div className="flex items-center gap-1 mb-1">
              <Icon className={`w-3 h-3 ${item.color}`} />
              <span className="text-[9px] text-slate-500 font-tajawal">{item.label}</span>
            </div>
            <div className="flex items-end gap-0.5">
              <span className="text-base font-bold text-slate-800">{item.value}</span>
              <span className="text-[9px] text-slate-400 mb-0.5">%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${item.value >= 70 ? 'bg-emerald-400' : item.value >= 40 ? 'bg-amber-400' : 'bg-red-300'}`} style={{ width: `${item.value}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PARENT/TEACHER INSIGHT PANEL
// ═══════════════════════════════════════════════════════
function InsightPanel({ progress }: { progress: CognitiveProgress }) {
  const { metrics } = progress;
  const vizStageIndex = VISUALIZATION_STAGES.findIndex(v => v.stage === progress.visualizationStage);

  // Determine strengths and weaknesses
  const areas = [
    { name: 'الدقة', value: metrics.accuracy },
    { name: 'التصور الذهني', value: metrics.visualizationStrength },
    { name: 'الحس العددي', value: metrics.numberSense },
    { name: 'السرعة', value: metrics.mentalSpeed },
    { name: 'الثقة', value: metrics.confidence },
  ];
  const strengths = areas.filter(a => a.value >= 70).map(a => a.name);
  const weakAreas = areas.filter(a => a.value < 40).map(a => a.name);

  // Mental readiness assessment
  const mentalReadiness = Math.round((metrics.visualizationStrength + metrics.mentalSpeed + metrics.confidence) / 3);

  return (
    <div className="space-y-4">
      {/* Visualization Progress */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-slate-700 font-tajawal">تقدم التصور الذهني</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {VISUALIZATION_STAGES.map((vs, i) => (
            <div key={vs.stage} className="flex-1">
              <div className={`h-2 rounded-full ${i <= vizStageIndex ? 'bg-purple-400' : 'bg-slate-100'}`} />
              <p className="text-[9px] text-center mt-1 text-slate-400 font-tajawal">{vs.icon}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-purple-600 font-tajawal mt-2 text-center">
          المرحلة الحالية: {VISUALIZATION_STAGES[vizStageIndex]?.title || 'كامل'}
        </p>
      </div>

      {/* Mental Readiness */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-700 font-tajawal">الجاهزية الذهنية</h3>
          </div>
          <span className={`text-sm font-bold ${mentalReadiness >= 70 ? 'text-emerald-600' : mentalReadiness >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {mentalReadiness}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${mentalReadiness >= 70 ? 'bg-emerald-400' : mentalReadiness >= 40 ? 'bg-amber-400' : 'bg-red-300'}`} style={{ width: `${mentalReadiness}%` }} />
        </div>
        <p className="text-[11px] text-slate-500 font-tajawal mt-2">
          {mentalReadiness >= 70 ? 'جاهز للحساب الذهني المتقدم ✓' :
           mentalReadiness >= 40 ? 'يتقدم بشكل جيد - يحتاج مزيد من التدريب' :
           'في المراحل الأولى - يحتاج تدريب مستمر'}
        </p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100/60">
          <p className="text-[10px] font-bold text-emerald-700 font-tajawal mb-1.5">💪 نقاط القوة</p>
          {strengths.length > 0 ? strengths.map(s => (
            <p key={s} className="text-[11px] text-emerald-600 font-tajawal">• {s}</p>
          )) : (
            <p className="text-[11px] text-emerald-500 font-tajawal">يتطور...</p>
          )}
        </div>
        <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100/60">
          <p className="text-[10px] font-bold text-amber-700 font-tajawal mb-1.5">🎯 يحتاج تركيز</p>
          {weakAreas.length > 0 ? weakAreas.map(w => (
            <p key={w} className="text-[11px] text-amber-600 font-tajawal">• {w}</p>
          )) : (
            <p className="text-[11px] text-amber-500 font-tajawal">أداء متوازن ✓</p>
          )}
        </div>
      </div>

      {/* Error Patterns */}
      {(metrics.errorPatterns.placeValueConfusion > 1 || metrics.errorPatterns.carryingMistakes > 1 || metrics.errorPatterns.borrowingIssues > 1 || metrics.errorPatterns.visualizationWeakness > 1) && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-bold text-slate-700 font-tajawal mb-2">📊 أنماط الأخطاء</p>
          <div className="space-y-1.5">
            {metrics.errorPatterns.placeValueConfusion > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-tajawal">خلط القيمة المكانية</span>
                <span className="text-[11px] font-bold text-amber-600">{metrics.errorPatterns.placeValueConfusion}×</span>
              </div>
            )}
            {metrics.errorPatterns.carryingMistakes > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-tajawal">أخطاء الحمل</span>
                <span className="text-[11px] font-bold text-amber-600">{metrics.errorPatterns.carryingMistakes}×</span>
              </div>
            )}
            {metrics.errorPatterns.borrowingIssues > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-tajawal">أخطاء الاستلاف</span>
                <span className="text-[11px] font-bold text-amber-600">{metrics.errorPatterns.borrowingIssues}×</span>
              </div>
            )}
            {metrics.errorPatterns.visualizationWeakness > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-tajawal">ضعف التصور</span>
                <span className="text-[11px] font-bold text-purple-600">{metrics.errorPatterns.visualizationWeakness}×</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-slate-800">{progress.totalSessions}</p>
            <p className="text-[10px] text-slate-400 font-tajawal">جلسات</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{progress.currentStage}/7</p>
            <p className="text-[10px] text-slate-400 font-tajawal">المرحلة</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{metrics.streakDays}</p>
            <p className="text-[10px] text-slate-400 font-tajawal">أيام متتالية</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════
export default function AbacusModule() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<CognitiveProgress>(loadProgress);
  const [view, setView] = useState<'stages' | 'learning' | 'practice' | 'speed' | 'insight' | 'result'>('stages');
  const [selectedStage, setSelectedStage] = useState<CognitiveStage>(progress.currentStage);
  const [sessionResult, setSessionResult] = useState<{ correct: number; total: number; avgTime: number } | null>(null);

  const isStageUnlocked = useCallback((stage: CognitiveStage): boolean => {
    if (stage === 1) return true;
    const prevMastery = progress.stageMastery[stage - 1];
    return prevMastery ? prevMastery.correct / prevMastery.total >= 0.6 : false;
  }, [progress]);

  const selectStage = (stage: CognitiveStage) => {
    if (!isStageUnlocked(stage)) return;
    setSelectedStage(stage);
    setView('learning');
  };

  const startPractice = () => {
    setView('practice');
    setSessionResult(null);
  };

  const handlePracticeComplete = (results: { correct: number; total: number; avgTime: number; errors: ErrorPattern; finalDifficulty: number; mentalSpeed: number }) => {
    const newProgress = { ...progress };

    // Update stage mastery
    const prev = newProgress.stageMastery[selectedStage] || { correct: 0, total: 0, avgTime: 0, streak: 0, bestStreak: 0 };
    const newStreak = results.correct === results.total ? prev.streak + 1 : 0;
    newProgress.stageMastery[selectedStage] = {
      correct: prev.correct + results.correct,
      total: prev.total + results.total,
      avgTime: Math.round((prev.avgTime + results.avgTime) / 2),
      streak: newStreak,
      bestStreak: Math.max(prev.bestStreak || 0, newStreak),
    };

    // Update metrics
    const accuracy = Math.round((results.correct / results.total) * 100);
    const m = newProgress.metrics;
    m.accuracy = Math.round((m.accuracy * 0.7) + (accuracy * 0.3));
    m.recognitionSpeed = Math.round((m.recognitionSpeed * 0.6) + (results.avgTime * 0.4));
    m.numberSense = Math.min(100, Math.round(m.numberSense + (accuracy >= 80 ? 3 : accuracy >= 60 ? 1 : -1)));
    m.consistency = Math.min(100, Math.round((m.consistency * 0.8) + ((results.correct === results.total ? 100 : accuracy) * 0.2)));
    m.errorPatterns = results.errors;
    m.sessionsCompleted = (m.sessionsCompleted || 0) + 1;

    // Confidence (builds with consistent success)
    if (accuracy >= 80) m.confidence = Math.min(100, (m.confidence || 0) + 5);
    else if (accuracy >= 60) m.confidence = Math.min(100, (m.confidence || 0) + 2);
    else m.confidence = Math.max(0, (m.confidence || 0) - 3);

    // Mental speed
    if (results.mentalSpeed > 0) {
      m.mentalSpeed = Math.round((m.mentalSpeed * 0.7) + (Math.min(100, results.mentalSpeed) * 0.3));
    }

    // Visualization strength (increases with stage 6/7 success)
    if (selectedStage >= 6 && accuracy >= 70) {
      m.visualizationStrength = Math.min(100, m.visualizationStrength + 5);
    } else if (selectedStage >= 5 && accuracy >= 80) {
      m.visualizationStrength = Math.min(100, m.visualizationStrength + 2);
    }

    // Streak days
    const today = new Date().toISOString().split('T')[0];
    if (newProgress.lastSessionDate !== today) {
      if (newProgress.lastSessionDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
        m.streakDays = (m.streakDays || 0) + 1;
      } else if (!newProgress.lastSessionDate) {
        m.streakDays = 1;
      } else {
        m.streakDays = 1; // Reset streak
      }
    }

    // Update visualization stage based on progression
    if (m.visualizationStrength >= 80 && selectedStage >= 7) {
      newProgress.visualizationStage = 'mental';
    } else if (m.visualizationStrength >= 60 && selectedStage >= 6) {
      newProgress.visualizationStage = 'temporary';
    } else if (m.visualizationStrength >= 40 && selectedStage >= 6) {
      newProgress.visualizationStage = 'flash';
    } else if (m.visualizationStrength >= 20 && selectedStage >= 5) {
      newProgress.visualizationStage = 'partial';
    }

    // Adaptive difficulty
    newProgress.adaptiveDifficulty = results.finalDifficulty;

    // Auto-advance stage
    const mastery = newProgress.stageMastery[selectedStage];
    if (mastery && mastery.correct / mastery.total >= 0.7 && selectedStage < 7) {
      newProgress.currentStage = Math.max(newProgress.currentStage, (selectedStage + 1) as CognitiveStage);
    }

    newProgress.totalSessions += 1;
    newProgress.lastSessionDate = today;

    setProgress(newProgress);
    saveProgress(newProgress);
    setSessionResult({ correct: results.correct, total: results.total, avgTime: results.avgTime });
    setView('result');
  };

  const handleSpeedComplete = (results: { correct: number; total: number; avgTime: number; bestTime: number }) => {
    const newProgress = { ...progress };
    const m = newProgress.metrics;

    // Update mental speed
    const speedScore = Math.min(100, Math.round(100 - (results.avgTime / 100)));
    m.mentalSpeed = Math.round((m.mentalSpeed * 0.6) + (speedScore * 0.4));

    // Update best
    if (results.bestTime < (newProgress.mentalSpeedBest || Infinity) || !newProgress.mentalSpeedBest) {
      newProgress.mentalSpeedBest = results.bestTime;
    }

    newProgress.totalSessions += 1;
    setProgress(newProgress);
    saveProgress(newProgress);
    setSessionResult({ correct: results.correct, total: results.total, avgTime: results.avgTime });
    setView('result');
  };

  // ─── STAGES VIEW ───
  if (view === 'stages') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 font-tajawal" dir="rtl">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate('/student')} className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all border border-slate-100">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <h1 className="text-base font-bold text-slate-700">🧮 التطور العددي الذهني</h1>
            <div className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-bold text-blue-600">{progress.totalSessions}</span>
            </div>
          </div>

          {/* Visualization Stage Progress */}
          <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-100/60 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-700 font-tajawal">مرحلة التصور</span>
              <span className="text-[10px] text-purple-500 font-tajawal">
                {VISUALIZATION_STAGES.find(v => v.stage === progress.visualizationStage)?.title}
              </span>
            </div>
            <div className="flex gap-1">
              {VISUALIZATION_STAGES.map((vs, i) => {
                const currentIdx = VISUALIZATION_STAGES.findIndex(v => v.stage === progress.visualizationStage);
                return (
                  <div key={vs.stage} className="flex-1 text-center">
                    <div className={`h-1.5 rounded-full ${i <= currentIdx ? 'bg-purple-400' : 'bg-purple-100'}`} />
                    <span className="text-[9px] mt-0.5 block">{vs.icon}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            {progress.currentStage >= 6 && (
              <button
                onClick={() => setView('speed')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 font-tajawal">تدريب السرعة</span>
              </button>
            )}
            <button
              onClick={() => setView('insight')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-700 font-tajawal">تقرير المتابعة</span>
            </button>
          </div>

          {/* Cognitive Metrics Summary */}
          {progress.totalSessions > 0 && (
            <div className="mb-4">
              <MetricsCard metrics={progress.metrics} />
            </div>
          )}

          {/* Stages */}
          <div className="space-y-2.5">
            {STAGES.map((s) => {
              const unlocked = isStageUnlocked(s.stage);
              const mastery = progress.stageMastery[s.stage];
              const masteryPct = mastery ? Math.round((mastery.correct / mastery.total) * 100) : 0;
              const isCurrent = s.stage === progress.currentStage;

              return (
                <button
                  key={s.stage}
                  onClick={() => selectStage(s.stage)}
                  disabled={!unlocked}
                  className={`w-full p-3.5 rounded-2xl border text-right transition-all ${
                    !unlocked
                      ? 'bg-slate-50/50 border-slate-100 opacity-50 cursor-not-allowed'
                      : isCurrent
                      ? 'bg-white border-blue-200 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!unlocked ? (
                      <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Lock className="w-4 h-4 text-slate-300" />
                      </div>
                    ) : (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${masteryPct >= 70 ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                        <span className="text-base">{s.icon}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold ${unlocked ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</p>
                        {mastery && (
                          <span className={`text-xs font-bold ${masteryPct >= 70 ? 'text-emerald-600' : 'text-blue-500'}`}>
                            {masteryPct}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{s.cognitiveGoal}</p>
                      {mastery && (
                        <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${masteryPct >= 70 ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${masteryPct}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── INSIGHT VIEW (Parent/Teacher) ───
  if (view === 'insight') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 font-tajawal" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setView('stages')} className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all border border-slate-100">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-700">تقرير المتابعة</h2>
              <p className="text-[11px] text-slate-400">للوالدين والمعلمين</p>
            </div>
          </div>
          <InsightPanel progress={progress} />
        </div>
      </div>
    );
  }

  // ─── SPEED TRAINING VIEW ───
  if (view === 'speed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 font-tajawal" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setView('stages')} className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all border border-slate-100">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-xs text-slate-400 font-tajawal">⚡ تدريب السرعة الذهنية</span>
            <div />
          </div>
          <SpeedTraining
            difficulty={progress.adaptiveDifficulty}
            onComplete={handleSpeedComplete}
          />
        </div>
      </div>
    );
  }

  // ─── LEARNING VIEW ───
  if (view === 'learning') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 font-tajawal" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setView('stages')} className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all border border-slate-100">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-700">{STAGES[selectedStage - 1].title}</h2>
              <p className="text-[11px] text-slate-400">{STAGES[selectedStage - 1].cognitiveGoal}</p>
            </div>
          </div>
          <GuidedLearning stage={selectedStage} onComplete={startPractice} />
        </div>
      </div>
    );
  }

  // ─── PRACTICE VIEW ───
  if (view === 'practice') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 font-tajawal" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setView('stages')} className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all border border-slate-100">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-xs text-slate-400 font-tajawal">
              {STAGES[selectedStage - 1].icon} {STAGES[selectedStage - 1].title}
            </span>
            <div />
          </div>
          <PracticeSession
            stage={selectedStage}
            difficulty={progress.adaptiveDifficulty}
            visualizationStage={progress.visualizationStage}
            onComplete={handlePracticeComplete}
          />
        </div>
      </div>
    );
  }

  // ─── RESULT VIEW ───
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 font-tajawal" dir="rtl">
      <div className="max-w-md mx-auto pt-8">
        {sessionResult && (
          <div className="text-center space-y-4">
            {/* Result icon */}
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              sessionResult.correct / sessionResult.total >= 0.8 ? 'bg-emerald-50' :
              sessionResult.correct / sessionResult.total >= 0.5 ? 'bg-blue-50' : 'bg-amber-50'
            }`}>
              {sessionResult.correct / sessionResult.total >= 0.8 ? (
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              ) : (
                <TrendingUp className="w-8 h-8 text-blue-500" />
              )}
            </div>

            {/* Score */}
            <div>
              <p className="text-2xl font-bold text-slate-800">{sessionResult.correct}/{sessionResult.total}</p>
              <p className="text-sm text-slate-500 mt-1">
                {sessionResult.correct / sessionResult.total >= 0.8 ? 'أداء ممتاز! 🌟' :
                 sessionResult.correct / sessionResult.total >= 0.5 ? 'جيد، واصل التقدم' : 'حاول مرة أخرى - أنت تتحسن'}
              </p>
            </div>

            {/* Time */}
            <div className="flex justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.round(sessionResult.avgTime / 1000)} ث متوسط
              </span>
              {progress.metrics.mentalSpeed > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  سرعة: {progress.metrics.mentalSpeed}%
                </span>
              )}
            </div>

            {/* Visualization progress notification */}
            {progress.visualizationStage !== 'full' && (
              <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-100/60">
                <div className="flex items-center gap-2 justify-center">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-purple-700 font-tajawal">
                    مرحلة التصور: {VISUALIZATION_STAGES.find(v => v.stage === progress.visualizationStage)?.title}
                  </span>
                </div>
              </div>
            )}

            {/* Cognitive metrics update */}
            <div className="pt-2">
              <MetricsCard metrics={progress.metrics} />
            </div>

            {/* Error patterns insight */}
            {(progress.metrics.errorPatterns.placeValueConfusion > 1 || progress.metrics.errorPatterns.carryingMistakes > 1 || progress.metrics.errorPatterns.borrowingIssues > 1 || progress.metrics.errorPatterns.visualizationWeakness > 1) && (
              <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100/60 text-right">
                <p className="text-xs font-bold text-amber-700 mb-1">💡 ملاحظة:</p>
                {progress.metrics.errorPatterns.placeValueConfusion > 1 && (
                  <p className="text-[11px] text-amber-600">• تحتاج تركيز أكثر على القيمة المكانية</p>
                )}
                {progress.metrics.errorPatterns.carryingMistakes > 1 && (
                  <p className="text-[11px] text-amber-600">• راجع عملية الحمل في الجمع</p>
                )}
                {progress.metrics.errorPatterns.borrowingIssues > 1 && (
                  <p className="text-[11px] text-amber-600">• راجع عملية الاستلاف في الطرح</p>
                )}
                {progress.metrics.errorPatterns.visualizationWeakness > 1 && (
                  <p className="text-[11px] text-purple-600">• تدرّب أكثر على التصور الذهني</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3 pt-3">
              <button onClick={() => { setView('practice'); setSessionResult(null); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">
                تدرّب مرة أخرى
              </button>
              <button onClick={() => setView('stages')} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                المراحل
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}