/**
 * §2 adaptive start-point diagnostic (child-facing).
 *
 * Presents 5–7 probes in a NEUTRAL tone — "let's see what you know, there are no
 * wrong answers here" — with NO per-answer right/wrong feedback (so the child is
 * never made to feel judged during placement). It collects one answer per probe,
 * submits them all at once, and the server decides the starting skill. It grants
 * no mastery; the child then proves the landing skill by practice.
 *
 * Shown only on the FIRST session in a subject (no learning path yet).
 */
import { useEffect, useState } from 'react';
import {
  getDiagnostic,
  submitDiagnosticPlacement,
  type PlacementResult,
  type Question,
} from '@/api/client';
import NumberLineInput from '@/components/visuals/NumberLineInput';
import TapCountInput from '@/components/visuals/TapCountInput';
import FillInput from '@/components/visuals/FillInput';
import QuestionVisual, {
  type VisualData,
  type VisualType,
} from '@/components/visuals/QuestionVisuals';
import { Logo } from '@/components/Logo';
import { toArabicIndic } from '@/lib/numerals';
import { playQuestionAudio } from '@/lib/audio';

export default function DiagnosticScreen({
  studentId,
  subjectId,
  onDone,
}: {
  studentId: number;
  subjectId: number;
  onDone: () => void;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<{ question_id: number; answer: string }[]>([]);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDiagnostic(studentId, subjectId)
      .then((d) => {
        if (d.questions.length === 0) setError(true);
        else setQuestions(d.questions);
      })
      .catch(() => setError(true));
  }, [studentId, subjectId]);

  const current = questions?.[idx] ?? null;

  useEffect(() => {
    if (current) playQuestionAudio(current.id, current.payload.prompt);
  }, [current]);

  async function answer(value: string) {
    if (!questions || busy) return;
    const q = questions[idx];
    const next = [...answers, { question_id: q.id, answer: value }];
    setAnswers(next);
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      return;
    }
    setBusy(true);
    try {
      const res = await submitDiagnosticPlacement(studentId, subjectId, next);
      setResult(res);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <Centered>
        <p className="text-xl mb-4">تعذّر تجهيز التشخيص الآن.</p>
        <Big onClick={onDone}>متابعة</Big>
      </Centered>
    );
  }

  // Placement result — friendly, where we'll start.
  if (result) {
    return (
      <Centered>
        <div className="text-7xl mb-3 animate-bounce-gentle">🌟</div>
        <p className="text-2xl font-extrabold text-primary mb-2">أحسنت! عرفنا أين نبدأ.</p>
        <p className="text-lg text-foreground mb-1">سنبدأ معك من:</p>
        <p className="text-2xl font-extrabold mb-6">«{result.placement_skill_name}»</p>
        <Big onClick={onDone}>هيّا بنا ➜</Big>
      </Centered>
    );
  }

  if (!questions || !current) return <Centered>…جارٍ التجهيز</Centered>;

  const { prompt, visual } = current.payload;
  const total = questions.length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Logo variant="orange" className="h-9 w-auto text-xl" />
        <span className="text-sm font-bold text-muted-foreground">
          سؤال {toArabicIndic(idx + 1)} من {toArabicIndic(total)}
        </span>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto p-6 flex flex-col items-center">
        {/* Neutral, reassuring framing — no judgement */}
        <p className="text-sm text-muted-foreground text-center mb-3 mt-1">
          لنرَ ما تعرفه — لا توجد إجابة خاطئة هنا، فقط جرّب! 🐝
        </p>

        {/* progress dots */}
        <div className="flex gap-1.5 mb-5" aria-hidden>
          {questions.map((q, i) => (
            <span
              key={q.id}
              className={`h-2 rounded-full transition-all ${
                i < idx ? 'w-2 bg-primary' : i === idx ? 'w-6 bg-primary' : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-2xl font-extrabold text-center">{prompt}</h1>
          <button
            type="button"
            aria-label="استمع"
            onClick={() => playQuestionAudio(current.id, prompt)}
            className="shrink-0 w-11 h-11 rounded-full bg-primary/10 text-primary text-xl flex items-center justify-center active:scale-90"
          >
            🔊
          </button>
        </div>

        {visual && (
          <QuestionVisual
            visualType={visual.type as VisualType}
            visualData={visual.data as unknown as VisualData}
          />
        )}

        {current.interaction_type === 'number-line' && current.payload.line ? (
          <NumberLineInput key={current.id} line={current.payload.line} disabled={busy} onConfirm={answer} />
        ) : current.interaction_type === 'tap-count' && current.payload.count ? (
          <TapCountInput key={current.id} count={current.payload.count} disabled={busy} onConfirm={answer} />
        ) : current.interaction_type === 'fill' ? (
          <FillInput key={current.id} config={current.payload.fill} disabled={busy} onConfirm={answer} />
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            {(current.payload.choices ?? []).map((c) => (
              <button
                key={c}
                type="button"
                disabled={busy}
                onClick={() => answer(c)}
                className="min-h-[72px] rounded-[var(--radius)] bg-card border-4 border-primary/30 text-3xl font-extrabold text-foreground shadow-md transition-all hover:brightness-95 active:scale-95 disabled:opacity-60"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      {children}
    </div>
  );
}

function Big({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[56px] rounded-[var(--radius)] bg-primary text-primary-foreground text-xl font-bold px-8 py-3 shadow-md active:scale-95"
    >
      {children}
    </button>
  );
}
