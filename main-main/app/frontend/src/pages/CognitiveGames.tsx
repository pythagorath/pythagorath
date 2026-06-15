// Cognitive Games - Phase 4: Mini-games for cognitive skill development
// Games: Memory Match, Pattern Finder, Sequence Builder, Classification Sort, Speed Recognition

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  loadCognitiveProfile,
  saveCognitiveProfile,
  updateSkillMastery,
  measureCognitiveLoad,
  getLoadRecommendation,
  recordModalitySignal,
  getScaffoldHint,
  updateWeeklyProgress,
  type CognitiveSkillType,
  type CognitiveProfile,
} from '@/lib/cognitiveFramework';

type GameType = 'memory_match' | 'pattern_finder' | 'sequence_builder' | 'classify_sort' | 'speed_recognition';

interface GameConfig {
  id: GameType;
  nameAr: string;
  descriptionAr: string;
  icon: string;
  skill: CognitiveSkillType;
  color: string;
}

const GAMES: GameConfig[] = [
  { id: 'memory_match', nameAr: 'مطابقة الذاكرة', descriptionAr: 'اقلب البطاقات وجد الأزواج المتشابهة', icon: '🃏', skill: 'working_memory', color: 'from-purple-500 to-indigo-600' },
  { id: 'pattern_finder', nameAr: 'اكتشف النمط', descriptionAr: 'أكمل النمط المفقود في التسلسل', icon: '🔍', skill: 'pattern_detection', color: 'from-emerald-500 to-teal-600' },
  { id: 'sequence_builder', nameAr: 'بناء التسلسل', descriptionAr: 'رتب العناصر بالترتيب الصحيح', icon: '🧩', skill: 'sequencing', color: 'from-orange-500 to-red-600' },
  { id: 'classify_sort', nameAr: 'صنّف وجمّع', descriptionAr: 'ضع كل عنصر في المجموعة الصحيحة', icon: '📦', skill: 'classification', color: 'from-blue-500 to-cyan-600' },
  { id: 'speed_recognition', nameAr: 'التعرف السريع', descriptionAr: 'تعرف على الشكل قبل أن يختفي', icon: '⚡', skill: 'visual_recognition', color: 'from-pink-500 to-rose-600' },
];

// ============ Memory Match Game ============

interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function MemoryMatchGame({ onComplete, difficulty }: { onComplete: (score: number, time: number) => void; difficulty: number }) {
  const emojis = ['🍎', '🌟', '🎈', '🐱', '🌈', '🎵', '🦋', '🌺'];
  const pairCount = Math.min(4 + difficulty, 8);
  const selectedEmojis = emojis.slice(0, pairCount);
  
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const pairs = [...selectedEmojis, ...selectedEmojis];
    const shuffled = pairs.sort(() => Math.random() - 0.5).map((emoji, i) => ({
      id: i, emoji, flipped: false, matched: false,
    }));
    setCards(shuffled);
    startTime.current = Date.now();
  }, []);

  const handleFlip = useCallback((id: number) => {
    if (flippedIds.length >= 2) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;

    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (newCards[first].emoji === newCards[second].emoji) {
        newCards[first].matched = true;
        newCards[second].matched = true;
        setCards([...newCards]);
        setMatched(m => {
          const newMatched = m + 1;
          if (newMatched === pairCount) {
            const elapsed = Date.now() - startTime.current;
            const score = Math.max(0, 100 - moves * 3);
            onComplete(score, elapsed);
          }
          return newMatched;
        });
        setFlippedIds([]);
      } else {
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setCards([...newCards]);
          setFlippedIds([]);
        }, 800);
      }
    }
  }, [cards, flippedIds, moves, pairCount, onComplete]);

  const gridCols = pairCount <= 4 ? 'grid-cols-4' : 'grid-cols-4';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>المحاولات: {moves}</span>
        <span>الأزواج: {matched}/{pairCount}</span>
      </div>
      <div className={`grid ${gridCols} gap-2 max-w-sm mx-auto`}>
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 transform ${
              card.flipped || card.matched
                ? 'bg-white border-2 border-blue-300 scale-100'
                : 'bg-gradient-to-br from-blue-400 to-purple-500 scale-95 hover:scale-100'
            } ${card.matched ? 'opacity-60' : ''}`}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ Pattern Finder Game ============

function PatternFinderGame({ onComplete, difficulty }: { onComplete: (score: number, time: number) => void; difficulty: number }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [pattern, setPattern] = useState<number[]>([]);
  const [options, setOptions] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const totalRounds = 5 + difficulty;
  const startTime = useRef(Date.now());

  const generatePattern = useCallback(() => {
    const step = Math.floor(Math.random() * 4) + 1 + Math.floor(difficulty / 2);
    const start = Math.floor(Math.random() * 5) + 1;
    const seq = Array.from({ length: 4 }, (_, i) => start + step * i);
    const correct = start + step * 4;
    const opts = [correct, correct + step, correct - step, correct + 1].sort(() => Math.random() - 0.5);
    setPattern(seq);
    setAnswer(correct);
    setOptions(opts);
    setFeedback('');
  }, [difficulty]);

  useEffect(() => {
    generatePattern();
    startTime.current = Date.now();
  }, [generatePattern]);

  const handleAnswer = (selected: number) => {
    const correct = selected === answer;
    if (correct) {
      setScore(s => s + 1);
      setFeedback('✅ أحسنت!');
    } else {
      setFeedback(`❌ الإجابة الصحيحة: ${answer}`);
    }
    setTimeout(() => {
      if (round + 1 >= totalRounds) {
        onComplete(Math.round((score + (correct ? 1 : 0)) / totalRounds * 100), Date.now() - startTime.current);
      } else {
        setRound(r => r + 1);
        generatePattern();
      }
    }, 1200);
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-between text-sm text-gray-600">
        <span>الجولة: {round + 1}/{totalRounds}</span>
        <span>النقاط: {score}</span>
      </div>
      <p className="text-lg font-bold text-gray-700">أكمل النمط:</p>
      <div className="flex items-center justify-center gap-3 text-2xl font-bold">
        {pattern.map((n, i) => (
          <span key={i} className="bg-blue-100 rounded-lg px-3 py-2">{n}</span>
        ))}
        <span className="bg-yellow-100 rounded-lg px-3 py-2 border-2 border-dashed border-yellow-400">؟</span>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {options.map((opt, i) => (
          <Button
            key={i}
            onClick={() => handleAnswer(opt)}
            variant="outline"
            className="text-xl py-4 hover:bg-blue-50"
          >
            {opt}
          </Button>
        ))}
      </div>
      {feedback && <p className="text-lg font-bold animate-bounce">{feedback}</p>}
    </div>
  );
}

// ============ Sequence Builder Game ============

function SequenceBuilderGame({ onComplete, difficulty }: { onComplete: (score: number, time: number) => void; difficulty: number }) {
  const [items, setItems] = useState<{ id: number; value: number; placed: boolean }[]>([]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const totalRounds = 4 + difficulty;
  const startTime = useRef(Date.now());

  const generateRound = useCallback(() => {
    const count = 4 + Math.floor(difficulty / 2);
    const values = Array.from({ length: count }, (_, i) => (i + 1) * (Math.floor(Math.random() * 3) + 2));
    const shuffled = values.map((v, i) => ({ id: i, value: v, placed: false })).sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setPlaced([]);
  }, [difficulty]);

  useEffect(() => {
    generateRound();
    startTime.current = Date.now();
  }, [generateRound]);

  const handlePlace = (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item || item.placed) return;

    const newPlaced = [...placed, item.value];
    const sorted = [...items.map(i => i.value)].sort((a, b) => a - b);
    const isCorrectSoFar = newPlaced.every((v, i) => v === sorted[i]);

    if (isCorrectSoFar) {
      setPlaced(newPlaced);
      setItems(items.map(i => i.id === id ? { ...i, placed: true } : i));

      if (newPlaced.length === items.length) {
        setScore(s => {
          const newScore = s + 1;
          if (round + 1 >= totalRounds) {
            onComplete(Math.round(newScore / totalRounds * 100), Date.now() - startTime.current);
          } else {
            setTimeout(() => { setRound(r => r + 1); generateRound(); }, 800);
          }
          return newScore;
        });
      }
    } else {
      // Wrong order - flash red
      setPlaced([...placed]);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-between text-sm text-gray-600">
        <span>الجولة: {round + 1}/{totalRounds}</span>
        <span>النقاط: {score}</span>
      </div>
      <p className="text-lg font-bold text-gray-700">رتب الأرقام من الأصغر للأكبر:</p>
      <div className="flex gap-2 justify-center min-h-[48px] bg-green-50 rounded-xl p-3">
        {placed.map((v, i) => (
          <span key={i} className="bg-green-200 rounded-lg px-3 py-2 font-bold">{v}</span>
        ))}
        {placed.length === 0 && <span className="text-gray-400">اضغط على الأرقام بالترتيب</span>}
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handlePlace(item.id)}
            disabled={item.placed}
            className={`px-4 py-3 rounded-xl text-lg font-bold transition-all ${
              item.placed
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-800 hover:scale-110'
            }`}
          >
            {item.value}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ Classification Sort Game ============

function ClassifySortGame({ onComplete, difficulty }: { onComplete: (score: number, time: number) => void; difficulty: number }) {
  const categories = [
    { name: 'فواكه', items: ['🍎', '🍌', '🍇', '🍊', '🍓'] },
    { name: 'حيوانات', items: ['🐱', '🐶', '🐰', '🐸', '🦁'] },
    { name: 'أشكال', items: ['⭐', '💎', '🔶', '⬛', '🔵'] },
  ];
  
  const [currentItem, setCurrentItem] = useState('');
  const [correctCategory, setCorrectCategory] = useState('');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const totalRounds = 6 + difficulty;
  const startTime = useRef(Date.now());

  const generateItem = useCallback(() => {
    const catIdx = Math.floor(Math.random() * categories.length);
    const cat = categories[catIdx];
    const item = cat.items[Math.floor(Math.random() * cat.items.length)];
    setCurrentItem(item);
    setCorrectCategory(cat.name);
    setFeedback('');
  }, []);

  useEffect(() => {
    generateItem();
    startTime.current = Date.now();
  }, [generateItem]);

  const handleClassify = (categoryName: string) => {
    const correct = categoryName === correctCategory;
    if (correct) {
      setScore(s => s + 1);
      setFeedback('✅ صحيح!');
    } else {
      setFeedback(`❌ ينتمي إلى: ${correctCategory}`);
    }
    setTimeout(() => {
      if (round + 1 >= totalRounds) {
        onComplete(Math.round((score + (correct ? 1 : 0)) / totalRounds * 100), Date.now() - startTime.current);
      } else {
        setRound(r => r + 1);
        generateItem();
      }
    }, 1000);
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-between text-sm text-gray-600">
        <span>الجولة: {round + 1}/{totalRounds}</span>
        <span>النقاط: {score}</span>
      </div>
      <p className="text-lg font-bold text-gray-700">إلى أي مجموعة ينتمي هذا؟</p>
      <div className="text-6xl py-4 animate-bounce">{currentItem}</div>
      <div className="grid grid-cols-3 gap-3">
        {categories.map(cat => (
          <Button
            key={cat.name}
            onClick={() => handleClassify(cat.name)}
            variant="outline"
            className="py-6 text-lg hover:bg-blue-50"
          >
            {cat.name}
          </Button>
        ))}
      </div>
      {feedback && <p className="text-lg font-bold">{feedback}</p>}
    </div>
  );
}

// ============ Speed Recognition Game ============

function SpeedRecognitionGame({ onComplete, difficulty }: { onComplete: (score: number, time: number) => void; difficulty: number }) {
  const shapes = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⬛', '⬜'];
  const [target, setTarget] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [showTarget, setShowTarget] = useState(true);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const totalRounds = 6 + difficulty;
  const startTime = useRef(Date.now());

  const generateRound = useCallback(() => {
    const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
    const distractors = shapes.filter(s => s !== targetShape).sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [targetShape, ...distractors].sort(() => Math.random() - 0.5);
    
    setTarget(targetShape);
    setOptions(allOptions);
    setShowTarget(true);
    setFeedback('');
    
    const hideDelay = Math.max(800, 2000 - difficulty * 200);
    setTimeout(() => setShowTarget(false), hideDelay);
  }, [difficulty]);

  useEffect(() => {
    generateRound();
    startTime.current = Date.now();
  }, [generateRound]);

  const handleSelect = (selected: string) => {
    const correct = selected === target;
    if (correct) {
      setScore(s => s + 1);
      setFeedback('✅ سريع!');
    } else {
      setFeedback('❌ ليس هذا');
    }
    setTimeout(() => {
      if (round + 1 >= totalRounds) {
        onComplete(Math.round((score + (correct ? 1 : 0)) / totalRounds * 100), Date.now() - startTime.current);
      } else {
        setRound(r => r + 1);
        generateRound();
      }
    }, 800);
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-between text-sm text-gray-600">
        <span>الجولة: {round + 1}/{totalRounds}</span>
        <span>النقاط: {score}</span>
      </div>
      <p className="text-lg font-bold text-gray-700">
        {showTarget ? 'تذكر هذا الشكل!' : 'أين الشكل الذي رأيته؟'}
      </p>
      <div className="h-24 flex items-center justify-center">
        {showTarget ? (
          <span className="text-6xl animate-pulse">{target}</span>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(opt)}
                className="text-4xl p-3 rounded-xl hover:bg-blue-50 transition-all hover:scale-110"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      {feedback && <p className="text-lg font-bold">{feedback}</p>}
    </div>
  );
}

// ============ Main Component ============

export default function CognitiveGames() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CognitiveProfile>(loadCognitiveProfile());
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [gameResult, setGameResult] = useState<{ score: number; time: number } | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [loadWarning, setLoadWarning] = useState('');

  const handleGameComplete = (score: number, time: number) => {
    setGameResult({ score, time });
    
    const game = GAMES.find(g => g.id === activeGame);
    if (game) {
      updateSkillMastery(game.skill, score >= 60, time);
      updateWeeklyProgress();
      
      // Measure cognitive load
      const errors = Math.round((100 - score) / 20);
      const load = measureCognitiveLoad(difficulty, time, errors, 0);
      const rec = getLoadRecommendation(load);
      if (load.currentLoad > 55) setLoadWarning(rec.messageAr);
      
      // Record modality signal
      if (game.skill === 'visual_recognition' || game.skill === 'pattern_detection') {
        recordModalitySignal('visual', score, game.id);
      } else if (game.skill === 'sequencing' || game.skill === 'classification') {
        recordModalitySignal('kinesthetic', score, game.id);
      }
    }

    const updated = loadCognitiveProfile();
    updated.gamesPlayed++;
    updated.totalCognitiveXP += Math.round(score / 10) + 5;
    saveCognitiveProfile(updated);
    setProfile(updated);
  };

  const startGame = (gameId: GameType) => {
    setActiveGame(gameId);
    setGameResult(null);
    setLoadWarning('');
  };

  const renderActiveGame = () => {
    if (!activeGame) return null;
    const props = { onComplete: handleGameComplete, difficulty };
    switch (activeGame) {
      case 'memory_match': return <MemoryMatchGame {...props} />;
      case 'pattern_finder': return <PatternFinderGame {...props} />;
      case 'sequence_builder': return <SequenceBuilderGame {...props} />;
      case 'classify_sort': return <ClassifySortGame {...props} />;
      case 'speed_recognition': return <SpeedRecognitionGame {...props} />;
    }
  };

  // Game selection screen
  if (!activeGame) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-4" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/student')} className="text-gray-600">
              → العودة
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-indigo-800">🧠 ألعاب معرفية</h1>
              <p className="text-sm text-gray-500">طوّر مهاراتك العقلية بالمرح</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500">XP</span>
              <p className="font-bold text-indigo-600">{profile.totalCognitiveXP}</p>
            </div>
          </div>

          {/* Weekly Challenge */}
          {profile.weeklyChallenge && !profile.weeklyChallenge.completed && (
            <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div className="flex-1">
                  <p className="font-bold text-orange-800">{profile.weeklyChallenge.nameAr}</p>
                  <p className="text-sm text-orange-600">{profile.weeklyChallenge.descriptionAr}</p>
                  <Progress value={(profile.weeklyChallenge.currentScore / profile.weeklyChallenge.targetScore) * 100} className="mt-2 h-2" />
                </div>
                <span className="text-sm font-bold text-orange-700">
                  {profile.weeklyChallenge.currentScore}/{profile.weeklyChallenge.targetScore}
                </span>
              </div>
            </Card>
          )}

          {/* Difficulty selector */}
          <div className="flex items-center gap-2 justify-center">
            <span className="text-sm text-gray-600">المستوى:</span>
            {[1, 2, 3, 4, 5].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                  d === difficulty ? 'bg-indigo-600 text-white scale-110' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 gap-3">
            {GAMES.map(game => {
              const skill = profile.skills.find(s => s.id === game.skill);
              return (
                <Card
                  key={game.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                  onClick={() => startGame(game.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl shadow-md`}>
                      {game.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{game.nameAr}</h3>
                      <p className="text-sm text-gray-500">{game.descriptionAr}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">إتقان</div>
                      <div className="font-bold text-indigo-600">{skill?.mastery || 0}%</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <Card className="p-3">
              <p className="text-2xl font-bold text-indigo-600">{profile.gamesPlayed}</p>
              <p className="text-xs text-gray-500">ألعاب</p>
            </Card>
            <Card className="p-3">
              <p className="text-2xl font-bold text-emerald-600">{profile.totalCognitiveXP}</p>
              <p className="text-xs text-gray-500">XP معرفي</p>
            </Card>
            <Card className="p-3">
              <p className="text-2xl font-bold text-orange-600">
                {Math.round(profile.skills.reduce((s, sk) => s + sk.mastery, 0) / profile.skills.length)}%
              </p>
              <p className="text-xs text-gray-500">إتقان عام</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Active game screen
  const currentGame = GAMES.find(g => g.id === activeGame)!;
  const scaffoldHint = getScaffoldHint(profile.scaffold.currentLevel, currentGame.skill);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Game Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setActiveGame(null); setGameResult(null); }}>
            ← رجوع
          </Button>
          <h2 className="font-bold text-lg text-indigo-800">{currentGame.icon} {currentGame.nameAr}</h2>
          <span className="text-sm text-gray-500">مستوى {difficulty}</span>
        </div>

        {/* Scaffold hint */}
        {profile.scaffold.currentLevel !== 'independent' && !gameResult && (
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 text-center">
            {scaffoldHint}
          </div>
        )}

        {/* Game Area */}
        <Card className="p-6">
          {gameResult ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">{gameResult.score >= 80 ? '🌟' : gameResult.score >= 50 ? '👍' : '💪'}</div>
              <h3 className="text-xl font-bold">
                {gameResult.score >= 80 ? 'ممتاز!' : gameResult.score >= 50 ? 'جيد!' : 'حاول مرة أخرى!'}
              </h3>
              <div className="flex justify-center gap-6">
                <div>
                  <p className="text-3xl font-bold text-indigo-600">{gameResult.score}%</p>
                  <p className="text-xs text-gray-500">النتيجة</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-600">{Math.round(gameResult.time / 1000)}ث</p>
                  <p className="text-xs text-gray-500">الوقت</p>
                </div>
              </div>
              {loadWarning && (
                <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">{loadWarning}</div>
              )}
              <div className="flex gap-3 justify-center">
                <Button onClick={() => startGame(activeGame)} className="bg-indigo-600 hover:bg-indigo-700">
                  أعد اللعب
                </Button>
                <Button variant="outline" onClick={() => { setActiveGame(null); setGameResult(null); }}>
                  ألعاب أخرى
                </Button>
              </div>
            </div>
          ) : (
            renderActiveGame()
          )}
        </Card>
      </div>
    </div>
  );
}