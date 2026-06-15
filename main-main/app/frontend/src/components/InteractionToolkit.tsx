// Interactive Cognitive Learning Components Toolkit
// Renders dynamic interaction types: drag_drop, tap, matching, number_line, counting_blocks, etc.
import { useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, RotateCcw, Star, Sparkles } from 'lucide-react';

// ===== Types =====
export interface InteractionConfig {
  id: number;
  interaction_type: string;
  title: string;
  config_json: string;
  difficulty: string;
  cognitive_complexity: string;
}

export interface InteractionResult {
  interactionId: number;
  correct: boolean;
  attempts: number;
  timeMs: number;
  interactionType: string;
}

interface InteractionProps {
  interaction: InteractionConfig;
  onComplete: (result: InteractionResult) => void;
  showFeedback?: boolean;
}

// ===== Main Dispatcher =====
export function InteractionRenderer({ interaction, onComplete, showFeedback = true }: InteractionProps) {
  const config = parseConfig(interaction.config_json);
  if (!config) return <ErrorState title={interaction.title} />;

  const props = { interaction, config, onComplete, showFeedback };

  switch (interaction.interaction_type) {
    case 'drag_drop': return <DragDropInteraction {...props} />;
    case 'tap': return <TapInteraction {...props} />;
    case 'matching': return <MatchingInteraction {...props} />;
    case 'number_line': return <NumberLineInteraction {...props} />;
    case 'counting_blocks': return <CountingBlocksInteraction {...props} />;
    case 'missing_number': return <MissingNumberInteraction {...props} />;
    case 'sequence_ordering': return <SequenceOrderingInteraction {...props} />;
    case 'shape_grouping': return <ShapeGroupingInteraction {...props} />;
    case 'analog_clock': return <AnalogClockInteraction {...props} />;
    case 'coin_money': return <CoinMoneyInteraction {...props} />;
    default: return <ErrorState title={interaction.title} />;
  }
}

function parseConfig(json: string): Record<string, unknown> | null {
  try { return JSON.parse(json); } catch { return null; }
}

function ErrorState({ title }: { title: string }) {
  return (
    <div className="text-center p-8 bg-red-50 rounded-2xl">
      <p className="text-red-600 font-tajawal">خطأ في تحميل النشاط: {title}</p>
    </div>
  );
}

// ===== Feedback Overlay =====
function FeedbackOverlay({ correct, onContinue }: { correct: boolean; onContinue: () => void }) {
  useEffect(() => {
    const t = setTimeout(onContinue, 1800);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/80 backdrop-blur-sm rounded-2xl animate-in fade-in duration-300">
      {correct ? (
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <p className="text-xl font-bold text-green-700 font-tajawal">أحسنت! 🎉</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <RotateCcw className="w-10 h-10 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-700 font-tajawal">حاول مرة أخرى!</p>
        </div>
      )}
    </div>
  );
}

// ===== Interaction Header =====
function InteractionHeader({ title, instruction }: { title: string; instruction?: string }) {
  return (
    <div className="text-center mb-6">
      <h3 className="text-lg font-bold text-gray-800 font-tajawal mb-1">{title}</h3>
      {instruction && <p className="text-sm text-gray-500 font-tajawal">{instruction}</p>}
    </div>
  );
}

// ===== 1. TAP INTERACTION =====
function TapInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());
  const items = (config.items as Array<{ id: number; label: string; value: number }>) || [];
  const correctId = config.correct_id as number;

  const handleTap = (id: number) => {
    if (feedback !== null) return;
    setSelected(id);
    setAttempts(a => a + 1);
    const correct = id === correctId;
    if (showFeedback) setFeedback(correct);
    if (correct) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'tap' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); setSelected(null); }, 1200);
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handleTap(item.id)}
            className={`p-6 rounded-2xl text-3xl font-bold transition-all duration-200 transform active:scale-95 ${
              selected === item.id
                ? feedback === true ? 'bg-green-200 border-green-400 scale-105 shadow-lg' :
                  feedback === false ? 'bg-red-200 border-red-400 animate-shake' :
                  'bg-blue-200 border-blue-400'
                : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 2. DRAG & DROP (simplified as tap-to-order) =====
function DragDropInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const items = (config.items as Array<{ id: number; label: string; value: number }>) || [];
  const correctOrder = (config.correct_order as number[]) || [];
  const [ordered, setOrdered] = useState<Array<{ id: number; label: string }>>([]);
  const [available, setAvailable] = useState(items.map(i => ({ id: i.id, label: i.label })));
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());

  const addToOrder = (item: { id: number; label: string }) => {
    if (feedback !== null) return;
    setOrdered([...ordered, item]);
    setAvailable(available.filter(a => a.id !== item.id));
  };

  const removeFromOrder = (item: { id: number; label: string }) => {
    if (feedback !== null) return;
    setAvailable([...available, item]);
    setOrdered(ordered.filter(o => o.id !== item.id));
  };

  const checkAnswer = () => {
    setAttempts(a => a + 1);
    const isCorrect = ordered.length === correctOrder.length &&
      ordered.every((item, idx) => item.id === correctOrder[idx]);
    setFeedback(isCorrect);
    if (isCorrect) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'drag_drop' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); setOrdered([]); setAvailable(items.map(i => ({ id: i.id, label: i.label }))); }, 1500);
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      {/* Available items */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {available.map(item => (
          <button key={item.id} onClick={() => addToOrder(item)}
            className="px-5 py-3 bg-white rounded-xl border-2 border-amber-200 text-xl font-bold text-gray-800 hover:border-amber-400 hover:shadow-md transition-all active:scale-95">
            {item.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div className="min-h-[60px] bg-white/60 border-2 border-dashed border-amber-300 rounded-xl p-3 flex flex-wrap gap-2 justify-center items-center mb-4">
        {ordered.length === 0 && <span className="text-gray-400 font-tajawal text-sm">اضغط على الأعداد بالترتيب الصحيح</span>}
        {ordered.map((item, idx) => (
          <button key={item.id} onClick={() => removeFromOrder(item)}
            className="px-4 py-2 bg-amber-100 rounded-lg border border-amber-300 text-lg font-bold text-amber-800 hover:bg-amber-200 transition-all">
            <span className="text-xs text-amber-500 ml-1">{idx + 1}.</span> {item.label}
          </button>
        ))}
      </div>

      {ordered.length === items.length && (
        <div className="text-center">
          <button onClick={checkAnswer}
            className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold font-tajawal hover:bg-amber-600 transition-all active:scale-95 shadow-lg">
            تحقق ✓
          </button>
        </div>
      )}

      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 3. MATCHING INTERACTION =====
function MatchingInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const pairs = (config.pairs as Array<{ left: { id: number; label: string }; right: { id: string; label: string } }>) || [];
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Map<number, string>>(new Map());
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());
  const [shuffledRight] = useState(() => [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5));

  const handleLeftClick = (id: number) => {
    if (feedback !== null || matches.has(id)) return;
    setSelectedLeft(id);
  };

  const handleRightClick = (rightId: string) => {
    if (feedback !== null || selectedLeft === null) return;
    const matchedValues = new Set(matches.values());
    if (matchedValues.has(rightId)) return;
    
    const newMatches = new Map(matches);
    newMatches.set(selectedLeft, rightId);
    setMatches(newMatches);
    setSelectedLeft(null);

    // Check if all matched
    if (newMatches.size === pairs.length) {
      setAttempts(a => a + 1);
      const allCorrect = pairs.every(p => newMatches.get(p.left.id) === p.right.id);
      setFeedback(allCorrect);
      if (allCorrect) {
        setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'matching' }), 1500);
      } else if (showFeedback) {
        setTimeout(() => { setFeedback(null); setMatches(new Map()); }, 1500);
      }
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      <div className="flex gap-8 justify-center">
        {/* Left column */}
        <div className="space-y-3">
          {pairs.map(p => (
            <button key={p.left.id} onClick={() => handleLeftClick(p.left.id)}
              className={`w-20 h-14 rounded-xl text-xl font-bold flex items-center justify-center transition-all ${
                matches.has(p.left.id) ? 'bg-green-100 border-2 border-green-300 text-green-700' :
                selectedLeft === p.left.id ? 'bg-purple-200 border-2 border-purple-500 scale-105 shadow-md' :
                'bg-white border-2 border-gray-200 hover:border-purple-300'
              }`}>
              {p.left.label}
            </button>
          ))}
        </div>
        {/* Right column */}
        <div className="space-y-3">
          {shuffledRight.map(r => {
            const isMatched = Array.from(matches.values()).includes(r.id);
            return (
              <button key={r.id} onClick={() => handleRightClick(r.id)}
                className={`w-24 h-14 rounded-xl text-lg font-bold flex items-center justify-center transition-all ${
                  isMatched ? 'bg-green-100 border-2 border-green-300 text-green-700' :
                  'bg-white border-2 border-gray-200 hover:border-purple-300'
                }`}>
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 4. NUMBER LINE =====
function NumberLineInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const min = (config.min as number) || 0;
  const max = (config.max as number) || 10;
  const target = config.target as number;
  const tolerance = (config.tolerance as number) || 0.5;
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());
  const lineRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (feedback !== null || !lineRef.current) return;
    const rect = lineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const value = min + ratio * (max - min);
    const rounded = Math.round(value * 2) / 2; // snap to 0.5
    setSelected(rounded);
  };

  const checkAnswer = () => {
    if (selected === null) return;
    setAttempts(a => a + 1);
    const correct = Math.abs(selected - target) <= tolerance;
    setFeedback(correct);
    if (correct) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'number_line' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); setSelected(null); }, 1500);
    }
  };

  const marks = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="relative p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      <div className="px-4 py-8">
        {/* Number line */}
        <div ref={lineRef} onClick={handleClick} className="relative h-3 bg-teal-200 rounded-full cursor-pointer mx-4">
          {/* Marks */}
          {marks.map(m => (
            <div key={m} className="absolute top-0 -translate-x-1/2" style={{ left: `${((m - min) / (max - min)) * 100}%` }}>
              <div className="w-0.5 h-5 bg-teal-400 -mt-1" />
              <span className="text-xs text-gray-600 font-bold absolute -translate-x-1/2 mt-1">{m}</span>
            </div>
          ))}
          {/* Selected marker */}
          {selected !== null && (
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-teal-500 rounded-full border-3 border-white shadow-lg transition-all"
              style={{ left: `${((selected - min) / (max - min)) * 100}%` }}>
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-teal-700 bg-white px-2 py-0.5 rounded-lg shadow">{selected}</span>
            </div>
          )}
        </div>
      </div>

      {selected !== null && (
        <div className="text-center mt-4">
          <button onClick={checkAnswer}
            className="px-8 py-3 bg-teal-500 text-white rounded-xl font-bold font-tajawal hover:bg-teal-600 transition-all active:scale-95 shadow-lg">
            تحقق ✓
          </button>
        </div>
      )}
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 5. COUNTING BLOCKS =====
function CountingBlocksInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const count = (config.count as number) || 5;
  const color = (config.color as string) || 'blue';
  const options = (config.options as number[]) || [];
  const correct = config.correct as number;
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());

  const colorMap: Record<string, string> = { blue: 'bg-blue-400', red: 'bg-red-400', green: 'bg-green-400', purple: 'bg-purple-400', orange: 'bg-orange-400' };
  const blockColor = colorMap[color] || 'bg-blue-400';

  const handleSelect = (val: number) => {
    if (feedback !== null) return;
    setSelected(val);
    setAttempts(a => a + 1);
    const isCorrect = val === correct;
    setFeedback(isCorrect);
    if (isCorrect) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'counting_blocks' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); setSelected(null); }, 1200);
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      {/* Blocks display */}
      <div className="flex flex-wrap gap-3 justify-center mb-8 p-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`w-12 h-12 ${blockColor} rounded-lg shadow-md transform rotate-${Math.floor(Math.random() * 6) - 3} border-2 border-white`}
            style={{ transform: `rotate(${Math.random() * 10 - 5}deg)` }} />
        ))}
      </div>

      {/* Options */}
      <div className="flex gap-4 justify-center">
        {options.map(opt => (
          <button key={opt} onClick={() => handleSelect(opt)}
            className={`w-16 h-16 rounded-2xl text-2xl font-bold transition-all active:scale-95 ${
              selected === opt
                ? feedback === true ? 'bg-green-200 border-green-400 text-green-700' : 'bg-red-200 border-red-400 text-red-700'
                : 'bg-white border-2 border-gray-200 text-gray-800 hover:border-blue-300 hover:shadow-md'
            }`}>
            {opt}
          </button>
        ))}
      </div>
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 6. MISSING NUMBER =====
function MissingNumberInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const sequence = (config.sequence as Array<number | null>) || [];
  const correct = config.correct as number;
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());

  const checkAnswer = () => {
    if (!input) return;
    setAttempts(a => a + 1);
    const isCorrect = parseInt(input) === correct;
    setFeedback(isCorrect);
    if (isCorrect) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'missing_number' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); setInput(''); }, 1200);
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      {/* Sequence display */}
      <div className="flex gap-3 justify-center items-center mb-8">
        {sequence.map((num, idx) => (
          <div key={idx} className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${
            num === null
              ? 'border-3 border-dashed border-emerald-400 bg-emerald-50 text-emerald-600'
              : 'bg-white border-2 border-gray-200 text-gray-800'
          }`}>
            {num === null ? '?' : num}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3 justify-center items-center">
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
          className="w-20 h-14 text-center text-2xl font-bold border-2 border-emerald-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
          placeholder="?"
        />
        <button onClick={checkAnswer}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold font-tajawal hover:bg-emerald-600 transition-all active:scale-95 shadow-lg">
          تحقق ✓
        </button>
      </div>
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 7. SEQUENCE ORDERING =====
function SequenceOrderingInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const items = (config.items as Array<{ id: number; label: string }>) || [];
  const correctOrder = (config.correct_order as number[]) || [];
  const [ordered, setOrdered] = useState<Array<{ id: number; label: string }>>([]);
  const [available, setAvailable] = useState(() => [...items].sort(() => Math.random() - 0.5));
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());

  const addItem = (item: { id: number; label: string }) => {
    if (feedback !== null) return;
    setOrdered([...ordered, item]);
    setAvailable(available.filter(a => a.id !== item.id));
  };

  const removeItem = (item: { id: number; label: string }) => {
    if (feedback !== null) return;
    setAvailable([...available, item]);
    setOrdered(ordered.filter(o => o.id !== item.id));
  };

  const checkAnswer = () => {
    setAttempts(a => a + 1);
    const isCorrect = ordered.length === correctOrder.length &&
      ordered.every((item, idx) => item.id === correctOrder[idx]);
    setFeedback(isCorrect);
    if (isCorrect) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'sequence_ordering' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); setOrdered([]); setAvailable([...items].sort(() => Math.random() - 0.5)); }, 1500);
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      {/* Available */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {available.map(item => (
          <button key={item.id} onClick={() => addItem(item)}
            className="px-4 py-2.5 bg-white rounded-xl border-2 border-violet-200 text-sm font-bold text-gray-700 font-tajawal hover:border-violet-400 hover:shadow-md transition-all active:scale-95">
            {item.label}
          </button>
        ))}
      </div>

      {/* Ordered zone */}
      <div className="min-h-[50px] bg-white/60 border-2 border-dashed border-violet-300 rounded-xl p-3 flex flex-wrap gap-2 justify-center items-center mb-4">
        {ordered.length === 0 && <span className="text-gray-400 font-tajawal text-sm">اضغط على العناصر بالترتيب الصحيح</span>}
        {ordered.map((item, idx) => (
          <button key={item.id} onClick={() => removeItem(item)}
            className="px-3 py-2 bg-violet-100 rounded-lg border border-violet-300 text-sm font-bold text-violet-800 font-tajawal hover:bg-violet-200 transition-all">
            <span className="text-xs text-violet-400 ml-1">{idx + 1}.</span> {item.label}
          </button>
        ))}
      </div>

      {ordered.length === items.length && (
        <div className="text-center">
          <button onClick={checkAnswer}
            className="px-8 py-3 bg-violet-500 text-white rounded-xl font-bold font-tajawal hover:bg-violet-600 transition-all active:scale-95 shadow-lg">
            تحقق ✓
          </button>
        </div>
      )}
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 8. SHAPE GROUPING =====
function ShapeGroupingInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const shapes = (config.shapes as Array<{ id: number; type: string; color: string }>) || [];
  const groups = (config.groups as Array<{ id: string; label: string; correct_ids: number[] }>) || [];
  const [assignments, setAssignments] = useState<Map<number, string>>(new Map());
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());

  const shapeColors: Record<string, string> = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', purple: '#a855f7', orange: '#f97316' };

  const renderShape = (type: string, color: string, size: number = 32) => {
    const fill = shapeColors[color] || '#6b7280';
    switch (type) {
      case 'circle': return <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={size/2 - 2} fill={fill} /></svg>;
      case 'square': return <svg width={size} height={size}><rect x="2" y="2" width={size-4} height={size-4} fill={fill} /></svg>;
      case 'triangle': return <svg width={size} height={size}><polygon points={`${size/2},2 ${size-2},${size-2} 2,${size-2}`} fill={fill} /></svg>;
      default: return <div className="w-8 h-8 bg-gray-300 rounded" />;
    }
  };

  const assignShape = (shapeId: number) => {
    if (feedback !== null || !activeGroup) return;
    const newAssignments = new Map(assignments);
    newAssignments.set(shapeId, activeGroup);
    setAssignments(newAssignments);

    // Check if all assigned
    if (newAssignments.size === shapes.length) {
      setAttempts(a => a + 1);
      const allCorrect = groups.every(g => 
        g.correct_ids.every(id => newAssignments.get(id) === g.id)
      );
      setFeedback(allCorrect);
      if (allCorrect) {
        setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'shape_grouping' }), 1500);
      } else if (showFeedback) {
        setTimeout(() => { setFeedback(null); setAssignments(new Map()); }, 1500);
      }
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      {/* Group buttons */}
      <div className="flex gap-3 justify-center mb-4">
        {groups.map(g => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)}
            className={`px-4 py-2 rounded-xl font-bold font-tajawal text-sm transition-all ${
              activeGroup === g.id ? 'bg-pink-500 text-white shadow-lg scale-105' : 'bg-white border-2 border-pink-200 text-gray-700 hover:border-pink-400'
            }`}>
            {g.label}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 font-tajawal mb-4">اختر مجموعة ثم اضغط على الأشكال</p>

      {/* Shapes */}
      <div className="flex flex-wrap gap-4 justify-center">
        {shapes.map(s => {
          const assigned = assignments.get(s.id);
          return (
            <button key={s.id} onClick={() => assignShape(s.id)}
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                assigned ? 'bg-green-50 border-2 border-green-300 opacity-60' : 'bg-white border-2 border-gray-200 hover:border-pink-300 hover:shadow-md'
              }`}>
              {renderShape(s.type, s.color)}
            </button>
          );
        })}
      </div>
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 9. ANALOG CLOCK =====
function AnalogClockInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const targetHour = config.target_hour as number;
  const targetMinute = (config.target_minute as number) || 0;
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());

  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;

  const checkAnswer = () => {
    setAttempts(a => a + 1);
    const isCorrect = (hour % 12) === (targetHour % 12) && minute === targetMinute;
    setFeedback(isCorrect);
    if (isCorrect) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'analog_clock' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); }, 1200);
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      {/* Clock face */}
      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-48 rounded-full border-4 border-indigo-300 bg-white shadow-lg">
          {/* Numbers */}
          {[12,1,2,3,4,5,6,7,8,9,10,11].map(n => {
            const angle = (n * 30 - 90) * Math.PI / 180;
            const x = 50 + 38 * Math.cos(angle);
            const y = 50 + 38 * Math.sin(angle);
            return <span key={n} className="absolute text-sm font-bold text-gray-700" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}>{n}</span>;
          })}
          {/* Hour hand */}
          <div className="absolute top-1/2 left-1/2 w-1.5 h-14 bg-gray-800 rounded-full origin-bottom -translate-x-1/2 -translate-y-full"
            style={{ transform: `translateX(-50%) rotate(${hourAngle}deg)`, transformOrigin: 'bottom center', height: '28%', top: '22%', left: '49%' }} />
          {/* Minute hand */}
          <div className="absolute top-1/2 left-1/2 w-1 h-20 bg-indigo-500 rounded-full origin-bottom -translate-x-1/2 -translate-y-full"
            style={{ transform: `translateX(-50%) rotate(${minuteAngle}deg)`, transformOrigin: 'bottom center', height: '38%', top: '12%', left: '49.5%' }} />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-gray-800 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-6 justify-center items-center mb-4">
        <div className="text-center">
          <label className="text-xs text-gray-500 font-tajawal block mb-1">الساعة</label>
          <div className="flex items-center gap-1">
            <button onClick={() => setHour(h => h <= 1 ? 12 : h - 1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">-</button>
            <span className="w-8 text-center font-bold text-lg">{hour}</span>
            <button onClick={() => setHour(h => h >= 12 ? 1 : h + 1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">+</button>
          </div>
        </div>
        <div className="text-center">
          <label className="text-xs text-gray-500 font-tajawal block mb-1">الدقيقة</label>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinute(m => m <= 0 ? 55 : m - 5)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">-</button>
            <span className="w-8 text-center font-bold text-lg">{String(minute).padStart(2, '0')}</span>
            <button onClick={() => setMinute(m => m >= 55 ? 0 : m + 5)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">+</button>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button onClick={checkAnswer}
          className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold font-tajawal hover:bg-indigo-600 transition-all active:scale-95 shadow-lg">
          تحقق ✓
        </button>
      </div>
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== 10. COIN MONEY =====
function CoinMoneyInteraction({ interaction, config, onComplete, showFeedback }: InteractionProps & { config: Record<string, unknown> }) {
  const targetAmount = config.target_amount as number;
  const availableCoins = (config.available_coins as Array<{ value: number; label: string; count: number }>) || [];
  const [selected, setSelected] = useState<Map<number, number>>(new Map()); // value -> count
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startTime = useRef(Date.now());

  const currentTotal = Array.from(selected.entries()).reduce((sum, [val, cnt]) => sum + val * cnt, 0);

  const addCoin = (value: number) => {
    if (feedback !== null) return;
    const coin = availableCoins.find(c => c.value === value);
    if (!coin) return;
    const current = selected.get(value) || 0;
    if (current >= coin.count) return;
    const newSelected = new Map(selected);
    newSelected.set(value, current + 1);
    setSelected(newSelected);
  };

  const removeCoin = (value: number) => {
    if (feedback !== null) return;
    const current = selected.get(value) || 0;
    if (current <= 0) return;
    const newSelected = new Map(selected);
    if (current === 1) newSelected.delete(value);
    else newSelected.set(value, current - 1);
    setSelected(newSelected);
  };

  const checkAnswer = () => {
    setAttempts(a => a + 1);
    const isCorrect = currentTotal === targetAmount;
    setFeedback(isCorrect);
    if (isCorrect) {
      setTimeout(() => onComplete({ interactionId: interaction.id, correct: true, attempts: attempts + 1, timeMs: Date.now() - startTime.current, interactionType: 'coin_money' }), 1500);
    } else if (showFeedback) {
      setTimeout(() => { setFeedback(null); }, 1200);
    }
  };

  return (
    <div className="relative p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl">
      <InteractionHeader title={interaction.title} instruction={config.instruction as string} />
      
      {/* Target */}
      <div className="text-center mb-4">
        <span className="text-sm text-gray-500 font-tajawal">المطلوب: </span>
        <span className="text-2xl font-bold text-amber-700">{targetAmount} ريال</span>
        <span className="text-sm text-gray-500 font-tajawal mr-4"> | الحالي: </span>
        <span className={`text-2xl font-bold ${currentTotal === targetAmount ? 'text-green-600' : 'text-gray-700'}`}>{currentTotal} ريال</span>
      </div>

      {/* Coins */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        {availableCoins.map(coin => {
          const count = selected.get(coin.value) || 0;
          return (
            <div key={coin.value} className="text-center">
              <button onClick={() => addCoin(coin.value)}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 border-3 border-yellow-500 shadow-lg flex items-center justify-center text-sm font-bold text-amber-900 hover:scale-110 transition-all active:scale-95">
                {coin.label}
              </button>
              <div className="flex items-center justify-center gap-1 mt-1">
                <button onClick={() => removeCoin(coin.value)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold hover:bg-gray-300">-</button>
                <span className="text-sm font-bold text-gray-600">{count}</span>
                <button onClick={() => addCoin(coin.value)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold hover:bg-gray-300">+</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button onClick={checkAnswer}
          className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold font-tajawal hover:bg-amber-600 transition-all active:scale-95 shadow-lg">
          تحقق ✓
        </button>
      </div>
      {feedback !== null && showFeedback && <FeedbackOverlay correct={feedback} onContinue={() => {}} />}
    </div>
  );
}

// ===== STAR RATING (for post-interaction feedback) =====
export function StarRating({ onRate }: { onRate: (rating: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => { setSelected(star); onRate(star); }}
          className="transition-transform hover:scale-125">
          <Star className={`w-8 h-8 ${(hovered || selected) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default InteractionRenderer;