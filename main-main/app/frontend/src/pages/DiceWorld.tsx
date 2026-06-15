// 🎲 عالم النرد - Pythagorath Foundational Cognitive Math Engine
// Interactive dice-based math learning for early learners
// Integrates with adaptive services for personalized progression

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star, Trophy, Heart, RotateCcw, Home, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ============ Types ============

type ActivityType =
  | 'counting'        // Count dots on dice
  | 'representation'  // Drag dots to show number
  | 'addition'        // Add two dice
  | 'subtraction'     // Subtract dice values
  | 'comparison'      // Compare dice (>, <, =)
  | 'number_bonds'    // Bonds to 6
  | 'sequencing'      // Complete the sequence
  | 'missing_number'; // Find missing number

type DifficultyLevel = 'within_6' | 'within_10' | 'within_12';

interface Question {
  id: string;
  type: ActivityType;
  difficulty: DifficultyLevel;
  dice1: number;
  dice2?: number;
  correctAnswer: number | string;
  options?: (number | string)[];
  prompt: string;
  hint?: string;
}

interface SessionState {
  currentQuestion: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  stars: number;
  hearts: number;
  currentActivity: ActivityType;
  difficulty: DifficultyLevel;
  questions: Question[];
  showFeedback: boolean;
  feedbackCorrect: boolean;
  feedbackMessage: string;
  isComplete: boolean;
  hintsUsed: number;
  startTime: number;
}

// ============ Dice SVG Component ============

function DiceFace({ value, size = 80, color = '#1e40af', animate = false }: {
  value: number; size?: number; color?: string; animate?: boolean;
}) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };

  const dots = dotPositions[Math.min(6, Math.max(1, value))] || dotPositions[1];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${animate ? 'animate-bounce' : ''} drop-shadow-lg`}
    >
      <rect
        x="5" y="5" width="90" height="90" rx="15" ry="15"
        fill="white" stroke={color} strokeWidth="3"
      />
      {dots.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r="9"
          fill={color}
          className={animate ? 'animate-pulse' : ''}
        />
      ))}
    </svg>
  );
}

// ============ Interactive Dot Placer ============

function DotPlacer({ target, onComplete, size = 120 }: {
  target: number; onComplete: (correct: boolean) => void; size?: number;
}) {
  const [dots, setDots] = useState<[number, number][]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dots.length >= 6) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x > 10 && x < 90 && y > 10 && y < 90) {
      const newDots = [...dots, [x, y] as [number, number]];
      setDots(newDots);
      if (newDots.length === target) {
        setTimeout(() => onComplete(true), 500);
      }
    }
  };

  const removeDot = (idx: number) => {
    setDots(dots.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-gray-600 font-tajawal">اضغط لوضع {target} نقاط</p>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="cursor-pointer border-2 border-dashed border-blue-300 rounded-2xl bg-white"
        onClick={handleClick}
      >
        <rect x="5" y="5" width="90" height="90" rx="15" ry="15" fill="white" stroke="#93c5fd" strokeWidth="2" strokeDasharray="5,5" />
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r="8"
            fill="#1e40af"
            className="cursor-pointer hover:fill-red-500 transition-colors"
            onClick={(e) => { e.stopPropagation(); removeDot(i); }}
          />
        ))}
      </svg>
      <p className="text-xs text-gray-500 font-tajawal">{dots.length} / {target}</p>
    </div>
  );
}

// ============ Question Generators ============

function generateQuestions(activity: ActivityType, difficulty: DifficultyLevel, count: number): Question[] {
  const maxVal = difficulty === 'within_6' ? 6 : difficulty === 'within_10' ? 10 : 12;
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    questions.push(generateSingleQuestion(activity, maxVal, i));
  }
  return questions;
}

function generateSingleQuestion(activity: ActivityType, maxVal: number, idx: number): Question {
  const diceMax = Math.min(6, maxVal);

  switch (activity) {
    case 'counting': {
      const val = randInt(1, diceMax);
      const opts = generateOptions(val, 1, diceMax, 4);
      return {
        id: `count_${idx}`,
        type: 'counting',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: val,
        correctAnswer: val,
        options: opts,
        prompt: 'كم عدد النقاط على النرد؟',
        hint: 'عُد النقاط واحدة واحدة',
      };
    }
    case 'representation': {
      const val = randInt(1, diceMax);
      return {
        id: `rep_${idx}`,
        type: 'representation',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: val,
        correctAnswer: val,
        prompt: `ضع ${val} نقاط على النرد`,
        hint: 'اضغط على المربع لوضع النقاط',
      };
    }
    case 'addition': {
      const a = randInt(1, Math.min(diceMax, maxVal - 1));
      const b = randInt(1, Math.min(diceMax, maxVal - a));
      const sum = a + b;
      const opts = generateOptions(sum, 2, maxVal, 4);
      return {
        id: `add_${idx}`,
        type: 'addition',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: a,
        dice2: b,
        correctAnswer: sum,
        options: opts,
        prompt: 'ما مجموع النردين؟',
        hint: 'اجمع نقاط النرد الأول مع نقاط النرد الثاني',
      };
    }
    case 'subtraction': {
      const big = randInt(2, diceMax);
      const small = randInt(1, big - 1);
      const diff = big - small;
      const opts = generateOptions(diff, 0, diceMax, 4);
      return {
        id: `sub_${idx}`,
        type: 'subtraction',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: big,
        dice2: small,
        correctAnswer: diff,
        options: opts,
        prompt: 'ما الفرق بين النردين؟',
        hint: 'اطرح النقاط الأقل من الأكثر',
      };
    }
    case 'comparison': {
      const a = randInt(1, diceMax);
      let b = randInt(1, diceMax);
      // Ensure variety
      if (idx % 3 === 0) b = a; // equal
      const answer = a > b ? '>' : a < b ? '<' : '=';
      return {
        id: `comp_${idx}`,
        type: 'comparison',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: a,
        dice2: b,
        correctAnswer: answer,
        options: ['>', '<', '='],
        prompt: 'قارن بين النردين',
        hint: 'أيهما أكبر؟ أم متساويان؟',
      };
    }
    case 'number_bonds': {
      const target = Math.min(6, maxVal);
      const part1 = randInt(1, target - 1);
      const part2 = target - part1;
      const opts = generateOptions(part2, 0, target, 4);
      return {
        id: `bond_${idx}`,
        type: 'number_bonds',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: part1,
        correctAnswer: part2,
        options: opts,
        prompt: `${part1} + ؟ = ${target}`,
        hint: `كم نحتاج لنصل إلى ${target}؟`,
      };
    }
    case 'sequencing': {
      const start = randInt(1, Math.max(1, diceMax - 3));
      const missing = start + randInt(1, 2);
      const seq = [start, start + 1, start + 2, start + 3];
      const opts = generateOptions(missing, 1, diceMax + 2, 4);
      return {
        id: `seq_${idx}`,
        type: 'sequencing',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: missing,
        correctAnswer: missing,
        options: opts,
        prompt: `أكمل التسلسل: ${seq.map(n => n === missing ? '؟' : n).join(' ، ')}`,
        hint: 'ما الرقم الذي يأتي بين الرقمين؟',
      };
    }
    case 'missing_number': {
      const a = randInt(1, Math.min(diceMax, maxVal - 1));
      const sum = randInt(a + 1, Math.min(maxVal, a + diceMax));
      const b = sum - a;
      const opts = generateOptions(b, 1, diceMax, 4);
      return {
        id: `miss_${idx}`,
        type: 'missing_number',
        difficulty: maxVal <= 6 ? 'within_6' : maxVal <= 10 ? 'within_10' : 'within_12',
        dice1: a,
        dice2: b,
        correctAnswer: b,
        options: opts,
        prompt: `${a} + ؟ = ${sum}`,
        hint: `ما العدد الذي إذا أضفناه إلى ${a} نحصل على ${sum}؟`,
      };
    }
    default:
      return generateSingleQuestion('counting', maxVal, idx);
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOptions(correct: number | string, min: number, max: number, count: number): (number | string)[] {
  const opts = new Set<number | string>();
  opts.add(correct);
  const numCorrect = typeof correct === 'number' ? correct : 0;
  while (opts.size < count) {
    const val = typeof correct === 'string'
      ? ['>', '<', '='][randInt(0, 2)]
      : randInt(min, max);
    if (val !== numCorrect || typeof correct === 'string') {
      opts.add(val);
    }
  }
  return shuffleArray([...opts]);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============ Activity Menu ============

const ACTIVITIES: { type: ActivityType; label: string; icon: string; description: string; color: string }[] = [
  { type: 'counting', label: 'عَدّ النقاط', icon: '🎯', description: 'عُد نقاط النرد', color: 'from-blue-400 to-blue-600' },
  { type: 'representation', label: 'تمثيل الأعداد', icon: '✋', description: 'ضع النقاط على النرد', color: 'from-purple-400 to-purple-600' },
  { type: 'addition', label: 'الجمع', icon: '➕', description: 'اجمع نردين', color: 'from-green-400 to-green-600' },
  { type: 'subtraction', label: 'الطرح', icon: '➖', description: 'اطرح نردين', color: 'from-orange-400 to-orange-600' },
  { type: 'comparison', label: 'المقارنة', icon: '⚖️', description: 'قارن بين نردين', color: 'from-pink-400 to-pink-600' },
  { type: 'number_bonds', label: 'روابط الأعداد', icon: '🔗', description: 'أكمل الرابطة', color: 'from-teal-400 to-teal-600' },
  { type: 'sequencing', label: 'التسلسل', icon: '📊', description: 'أكمل التسلسل', color: 'from-indigo-400 to-indigo-600' },
  { type: 'missing_number', label: 'العدد المفقود', icon: '❓', description: 'جد العدد الناقص', color: 'from-rose-400 to-rose-600' },
];

const DIFFICULTY_LEVELS: { level: DifficultyLevel; label: string; stars: number }[] = [
  { level: 'within_6', label: 'حتى ٦', stars: 1 },
  { level: 'within_10', label: 'حتى ١٠', stars: 2 },
  { level: 'within_12', label: 'حتى ١٢', stars: 3 },
];

// ============ Feedback Messages ============

const CORRECT_MESSAGES = [
  'أحسنت! 🌟', 'ممتاز! 🎉', 'رائع! ⭐', 'صحيح! 👏', 'بارع! 🏆',
  'عبقري! 🧠', 'مذهل! 💫', 'أنت نجم! ⭐',
];

const WRONG_MESSAGES = [
  'حاول مرة أخرى 💪', 'لا بأس، فكّر مجدداً 🤔', 'قريب! جرّب مرة ثانية 🌱',
];

const ENCOURAGEMENT = [
  'أنت تتعلم بسرعة! 🚀', 'استمر! 💪', 'كل محاولة تجعلك أقوى 🌟',
];

// ============ Main Component ============

export default function DiceWorld() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<'menu' | 'difficulty' | 'playing' | 'results'>('menu');
  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [animateDice, setAnimateDice] = useState(false);

  // Mastery tracking (localStorage)
  const [mastery, setMastery] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('diceWorld_mastery') || '{}');
    } catch { return {}; }
  });

  const saveMastery = useCallback((key: string, score: number) => {
    setMastery(prev => {
      const updated = { ...prev, [key]: Math.max(prev[key] || 0, score) };
      localStorage.setItem('diceWorld_mastery', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Start activity
  const startActivity = (activity: ActivityType, difficulty: DifficultyLevel) => {
    const questions = generateQuestions(activity, difficulty, 8);
    setSession({
      currentQuestion: 0,
      totalQuestions: questions.length,
      correctAnswers: 0,
      wrongAnswers: 0,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      stars: 0,
      hearts: 3,
      currentActivity: activity,
      difficulty,
      questions,
      showFeedback: false,
      feedbackCorrect: false,
      feedbackMessage: '',
      isComplete: false,
      hintsUsed: 0,
      startTime: Date.now(),
    });
    setScreen('playing');
    setShowHint(false);
    setAnimateDice(true);
    setTimeout(() => setAnimateDice(false), 600);
  };

  // Handle answer
  const handleAnswer = (answer: number | string) => {
    if (!session || session.showFeedback) return;
    const q = session.questions[session.currentQuestion];
    const isCorrect = String(answer) === String(q.correctAnswer);

    setAnimateDice(true);
    setTimeout(() => setAnimateDice(false), 400);

    if (isCorrect) {
      const msg = CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
      setSession(prev => prev ? {
        ...prev,
        correctAnswers: prev.correctAnswers + 1,
        consecutiveCorrect: prev.consecutiveCorrect + 1,
        consecutiveWrong: 0,
        stars: prev.stars + (prev.consecutiveCorrect >= 2 ? 2 : 1),
        showFeedback: true,
        feedbackCorrect: true,
        feedbackMessage: msg,
      } : null);
    } else {
      const msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
      setSession(prev => prev ? {
        ...prev,
        wrongAnswers: prev.wrongAnswers + 1,
        consecutiveWrong: prev.consecutiveWrong + 1,
        consecutiveCorrect: 0,
        hearts: Math.max(0, prev.hearts - 1),
        showFeedback: true,
        feedbackCorrect: false,
        feedbackMessage: msg,
      } : null);
    }

    // Auto advance after feedback
    setTimeout(() => {
      setSession(prev => {
        if (!prev) return null;
        const next = prev.currentQuestion + 1;
        if (next >= prev.totalQuestions || prev.hearts <= 0) {
          // Session complete
          const score = Math.round((prev.correctAnswers / prev.totalQuestions) * 100);
          saveMastery(`${prev.currentActivity}_${prev.difficulty}`, score);
          return { ...prev, showFeedback: false, isComplete: true };
        }
        return { ...prev, showFeedback: false, currentQuestion: next };
      });
      setShowHint(false);
    }, 1500);
  };

  // Handle dot placer completion
  const handleDotComplete = (correct: boolean) => {
    handleAnswer(session?.questions[session.currentQuestion]?.correctAnswer || 0);
  };

  // Use hint
  const useHint = () => {
    setShowHint(true);
    setSession(prev => prev ? { ...prev, hintsUsed: prev.hintsUsed + 1 } : null);
  };

  // ============ Render: Menu ============
  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-50 p-4 font-tajawal" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/student')} className="gap-1">
            <Home className="w-4 h-4" />
            <span className="text-xs">الرئيسية</span>
          </Button>
          <h1 className="text-2xl font-bold text-blue-800">🎲 عالم النرد</h1>
          <div className="w-16" />
        </div>

        {/* Welcome */}
        <div className="text-center mb-6">
          <p className="text-gray-600 text-sm">تعلّم الرياضيات بطريقة ممتعة مع النرد!</p>
        </div>

        {/* Activity Grid */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {ACTIVITIES.map(act => {
            const key = `${act.type}_within_6`;
            const score = mastery[key] || 0;
            return (
              <Card
                key={act.type}
                className="cursor-pointer hover:scale-105 transition-transform border-0 shadow-md overflow-hidden"
                onClick={() => { setSelectedActivity(act.type); setScreen('difficulty'); }}
              >
                <CardContent className={`p-4 bg-gradient-to-br ${act.color} text-white relative`}>
                  <div className="text-3xl mb-1">{act.icon}</div>
                  <h3 className="font-bold text-sm">{act.label}</h3>
                  <p className="text-[10px] opacity-90">{act.description}</p>
                  {score > 0 && (
                    <div className="absolute top-2 left-2 bg-white/30 rounded-full px-1.5 py-0.5 text-[9px]">
                      {score}%
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div className="mt-6 max-w-md mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">التقدم الكلي</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <Progress value={calculateOverallProgress(mastery)} className="h-2" />
              <p className="text-[10px] text-gray-500 mt-1">{calculateOverallProgress(mastery)}% مكتمل</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ============ Render: Difficulty Selection ============
  if (screen === 'difficulty' && selectedActivity) {
    const actInfo = ACTIVITIES.find(a => a.type === selectedActivity)!;
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-50 p-4 font-tajawal" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => setScreen('menu')} className="gap-1">
            <ArrowRight className="w-4 h-4" />
            <span className="text-xs">رجوع</span>
          </Button>
          <h2 className="text-xl font-bold text-blue-800">{actInfo.icon} {actInfo.label}</h2>
          <div className="w-16" />
        </div>

        <p className="text-center text-gray-600 text-sm mb-6">اختر مستوى الصعوبة</p>

        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          {DIFFICULTY_LEVELS.map(d => {
            const key = `${selectedActivity}_${d.level}`;
            const score = mastery[key] || 0;
            const isLocked = d.level === 'within_10' && (mastery[`${selectedActivity}_within_6`] || 0) < 60
              || d.level === 'within_12' && (mastery[`${selectedActivity}_within_10`] || 0) < 60;

            return (
              <Card
                key={d.level}
                className={`cursor-pointer transition-all border-0 shadow-md ${isLocked ? 'opacity-50' : 'hover:scale-105'}`}
                onClick={() => !isLocked && startActivity(selectedActivity, d.level)}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: d.stars }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{d.label}</h3>
                      {isLocked && <p className="text-[10px] text-red-500">🔒 أكمل المستوى السابق أولاً</p>}
                    </div>
                  </div>
                  <div className="text-left">
                    {score > 0 && (
                      <span className="text-sm font-bold text-green-600">{score}%</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ============ Render: Playing ============
  if (screen === 'playing' && session && !session.isComplete) {
    const q = session.questions[session.currentQuestion];
    const progress = ((session.currentQuestion) / session.totalQuestions) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-50 p-4 font-tajawal" dir="rtl">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => setScreen('menu')}>
            <Home className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: session.hearts }).map((_, i) => (
              <Heart key={i} className="w-5 h-5 fill-red-500 text-red-500" />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold">{session.stars}</span>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2 mb-4" />
        <p className="text-center text-[10px] text-gray-500 mb-4">
          السؤال {session.currentQuestion + 1} من {session.totalQuestions}
        </p>

        {/* Question */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{q.prompt}</h3>

          {/* Dice Display */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {q.type !== 'representation' && (
              <DiceFace value={q.dice1} size={90} animate={animateDice} />
            )}
            {q.dice2 !== undefined && q.type !== 'representation' && (
              <>
                <span className="text-2xl font-bold text-gray-600">
                  {q.type === 'addition' ? '+' : q.type === 'subtraction' ? '−' : ''}
                </span>
                <DiceFace value={q.dice2} size={90} color="#f59e0b" animate={animateDice} />
              </>
            )}
          </div>

          {/* Representation Mode: Dot Placer */}
          {q.type === 'representation' && (
            <DotPlacer target={q.dice1} onComplete={handleDotComplete} size={140} />
          )}

          {/* Hint */}
          {showHint && q.hint && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 mx-auto max-w-xs">
              <p className="text-sm text-amber-800">💡 {q.hint}</p>
            </div>
          )}

          {/* Feedback Overlay */}
          {session.showFeedback && (
            <div className={`rounded-xl p-4 mb-4 mx-auto max-w-xs ${
              session.feedbackCorrect
                ? 'bg-green-50 border-2 border-green-300'
                : 'bg-red-50 border-2 border-red-300'
            }`}>
              <p className={`text-lg font-bold ${session.feedbackCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {session.feedbackMessage}
              </p>
              {!session.feedbackCorrect && (
                <p className="text-sm text-gray-600 mt-1">الإجابة الصحيحة: {q.correctAnswer}</p>
              )}
            </div>
          )}

          {/* Answer Options */}
          {q.type !== 'representation' && !session.showFeedback && q.options && (
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              {q.options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="h-14 text-xl font-bold border-2 hover:bg-blue-50 hover:border-blue-400 transition-all"
                  onClick={() => handleAnswer(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {/* Hint Button */}
          {!showHint && !session.showFeedback && q.hint && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-amber-600"
              onClick={useHint}
            >
              <Volume2 className="w-4 h-4 ml-1" />
              تلميح
            </Button>
          )}
        </div>

        {/* Encouragement */}
        {session.consecutiveCorrect >= 3 && !session.showFeedback && (
          <p className="text-center text-sm text-green-600 animate-pulse">
            {ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)]}
          </p>
        )}
      </div>
    );
  }

  // ============ Render: Results ============
  if (screen === 'playing' && session?.isComplete) {
    const score = Math.round((session.correctAnswers / session.totalQuestions) * 100);
    const actInfo = ACTIVITIES.find(a => a.type === session.currentActivity);
    const timeTaken = Math.round((Date.now() - session.startTime) / 1000);

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-50 p-4 font-tajawal flex flex-col items-center justify-center" dir="rtl">
        <Card className="w-full max-w-sm border-0 shadow-xl">
          <CardContent className="p-6 text-center">
            {/* Result Icon */}
            <div className="text-5xl mb-3">
              {score >= 80 ? '🏆' : score >= 60 ? '⭐' : '💪'}
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-1">
              {score >= 80 ? 'ممتاز!' : score >= 60 ? 'جيد جداً!' : 'أحسنت المحاولة!'}
            </h2>

            <p className="text-sm text-gray-600 mb-4">{actInfo?.label} - {session.difficulty === 'within_6' ? 'حتى ٦' : session.difficulty === 'within_10' ? 'حتى ١٠' : 'حتى ١٢'}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-green-50 rounded-xl p-2">
                <p className="text-lg font-bold text-green-700">{session.correctAnswers}</p>
                <p className="text-[10px] text-green-600">صحيح</p>
              </div>
              <div className="bg-red-50 rounded-xl p-2">
                <p className="text-lg font-bold text-red-700">{session.wrongAnswers}</p>
                <p className="text-[10px] text-red-600">خطأ</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-2">
                <p className="text-lg font-bold text-blue-700">{session.stars}</p>
                <p className="text-[10px] text-blue-600">نجوم</p>
              </div>
            </div>

            {/* Score */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-3 mb-4">
              <p className="text-white text-3xl font-bold">{score}%</p>
              <p className="text-white/80 text-xs">النتيجة</p>
            </div>

            {/* Time */}
            <p className="text-xs text-gray-500 mb-4">⏱️ الوقت: {Math.floor(timeTaken / 60)}:{String(timeTaken % 60).padStart(2, '0')}</p>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => startActivity(session.currentActivity, session.difficulty)}
              >
                <RotateCcw className="w-4 h-4 ml-1" />
                أعد المحاولة
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setScreen('menu')}
              >
                <Home className="w-4 h-4 ml-1" />
                القائمة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// ============ Utility ============

function calculateOverallProgress(mastery: Record<string, number>): number {
  const totalActivities = ACTIVITIES.length * DIFFICULTY_LEVELS.length;
  const completed = Object.values(mastery).filter(v => v >= 60).length;
  return Math.round((completed / totalActivities) * 100);
}