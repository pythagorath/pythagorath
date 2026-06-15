/**
 * F-3/F-4 child question screen (§3 child-UX).
 *
 * Fetches the diagnostic from the LIVE API, renders each question's visual via
 * the ported QuestionVisual, lets the child tap an answer, submits it to
 * POST /api/submit_answer, then:
 *   - shows gentle per-answer feedback (celebrate / encourage),
 *   - keeps serving the engine's next_question on the SAME skill until it is
 *     mastered, then shows a DISTINCT mastery celebration (F-4),
 *   - if a skill is locked (403), shows a kind "finish the previous skill first"
 *     message — never a technical error (F-4).
 */
import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  getDiagnostic,
  getSkillQuestions,
  submitAnswer,
  type Question,
  type SubmitAnswerResponse,
} from '@/api/client';
import QuestionVisual, {
  type VisualData,
  type VisualType,
} from '@/components/visuals/QuestionVisuals';
import NumberLineInput from '@/components/visuals/NumberLineInput';
import TapCountInput from '@/components/visuals/TapCountInput';
import FillInput from '@/components/visuals/FillInput';
import { Logo } from '@/components/Logo';
import { speak } from '@/lib/speak';
import { playQuestionAudio } from '@/lib/audio';

type Feedback = { correct: boolean } | null;

export default function QuestionScreen({
  studentId,
  subjectId,
  skillId,
  onExit,
}: {
  studentId: number;
  subjectId: number;
  /** When set, the session starts on this specific skill (from the skill map);
   *  otherwise it starts from the subject diagnostic. */
  skillId?: number;
  onExit: () => void;
}) {
  const [current, setCurrent] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [last, setLast] = useState<SubmitAnswerResponse | null>(null);
  const [mastered, setMastered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Skill-scoped start (from the map) vs. subject diagnostic.
    const load = skillId
      ? getSkillQuestions(studentId, skillId)
      : getDiagnostic(studentId, subjectId).then((d) => d.questions);
    load
      .then((questions) => {
        if (questions.length === 0) setEmpty(true);
        else setCurrent(questions[0]);
      })
      .catch((e) => {
        if (isAxiosError(e) && e.response?.status === 403) setLocked(true);
        else setEmpty(true);
      })
      .finally(() => setLoading(false));
  }, [studentId, subjectId, skillId]);

  useEffect(() => {
    if (current) playQuestionAudio(current.id, current.payload.prompt);
  }, [current]);

  async function choose(answer: string) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await submitAnswer(studentId, current.id, answer);
      setLast(res);
      if (res.status === 'mastered') {
        setMastered(true); // distinct mastery celebration (F-4)
        speak('أتقنت المهارة، أحسنت');
      } else {
        setFeedback({ correct: res.is_correct });
        if (res.is_correct) speak('أحسنت');
      }
    } catch (e) {
      // Locked skill: a kind message for the child, not a technical error (F-4).
      if (isAxiosError(e) && e.response?.status === 403) {
        setLocked(true);
        speak('أكمل المهارة السابقة أولاً');
      } else {
        setFeedback({ correct: false });
      }
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setFeedback(null);
    setMastered(false);
    setCurrent(last?.next_question ?? null);
  }

  if (loading) return <Centered>…جارٍ تجهيز الأسئلة</Centered>;

  if (locked) {
    return (
      <Centered>
        <div className="text-7xl mb-4 animate-bounce-gentle">🌟</div>
        <p className="text-2xl font-extrabold text-primary mb-2">
          هذه المهارة مقفلة الآن
        </p>
        <p className="text-lg text-muted-foreground mb-6">
          أكمل المهارة السابقة أولاً، ثم تعود إلى هنا. أنت تتقدّم بخطوات رائعة! 🐝
        </p>
        <BigButton onClick={onExit}>رجوع</BigButton>
      </Centered>
    );
  }

  if (empty) {
    return (
      <Centered>
        <p className="text-xl mb-4">لا توجد أسئلة لهذه المادة بعد.</p>
        <BigButton onClick={onExit}>رجوع</BigButton>
      </Centered>
    );
  }

  if (!current) {
    return (
      <Centered>
        <div className="text-7xl mb-4 animate-bounce-gentle">🎉</div>
        <p className="text-2xl font-extrabold text-primary mb-6">أحسنت! انتهت الجلسة.</p>
        <BigButton onClick={onExit}>رجوع</BigButton>
      </Centered>
    );
  }

  const { prompt, visual, choices } = current.payload;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Logo variant="orange" className="h-9 w-auto text-xl" />
        <div className="flex items-center gap-2">
          <a href="/?admin=1" className="text-muted-foreground text-sm font-medium px-3 py-2">
            🎙 الاستوديو
          </a>
          <button
            type="button"
            onClick={onExit}
            className="text-muted-foreground text-base font-medium px-3 py-2"
          >
            إنهاء
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto p-6 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-2 mt-2">
          <h1 className="text-2xl font-extrabold text-center">{prompt}</h1>
          <button
            type="button"
            aria-label="استمع"
            onClick={() => playQuestionAudio(current.id, prompt)}
            className="shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary text-2xl flex items-center justify-center active:scale-90"
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

        {/* Answer input: interactive number-line widget if the question is one
            (and carries a line config); otherwise the multiple-choice buttons.
            Either way the answer goes through the same choose() flow. */}
        {current.interaction_type === 'number-line' && current.payload.line ? (
          <NumberLineInput
            key={current.id}
            line={current.payload.line}
            disabled={busy || !!feedback || mastered}
            onConfirm={(answer) => choose(answer)}
          />
        ) : current.interaction_type === 'tap-count' && current.payload.count ? (
          <TapCountInput
            key={current.id}
            count={current.payload.count}
            disabled={busy || !!feedback || mastered}
            onConfirm={(answer) => choose(answer)}
          />
        ) : current.interaction_type === 'fill' ? (
          <FillInput
            key={current.id}
            config={current.payload.fill}
            disabled={busy || !!feedback || mastered}
            onConfirm={(answer) => choose(answer)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            {(choices ?? []).map((c) => (
              <button
                key={c}
                type="button"
                disabled={busy || !!feedback || mastered}
                onClick={() => choose(c)}
                className="min-h-[72px] rounded-[var(--radius)] bg-card border-4 border-primary/30 text-3xl font-extrabold text-foreground shadow-md transition-all hover:brightness-95 active:scale-95 disabled:opacity-60"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Per-answer gentle feedback (§3.2): celebrate / encourage. */}
      {feedback && !mastered && (
        <div
          className={`fixed inset-x-0 bottom-0 p-6 text-center ${
            feedback.correct ? 'bg-primary text-primary-foreground' : 'bg-accent/20 text-foreground'
          }`}
        >
          <div className="text-5xl mb-2 animate-bounce-gentle">
            {feedback.correct ? '🎉' : '💪'}
          </div>
          <p className="text-2xl font-extrabold mb-4">
            {feedback.correct ? 'أحسنت! إجابة صحيحة' : 'لا بأس، حاول مرة أخرى!'}
          </p>
          <BigButton onClick={next}>التالي ➜</BigButton>
        </div>
      )}

      {/* Distinct, bigger MASTERY celebration (F-4): full-screen. */}
      {mastered && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary text-primary-foreground p-8 text-center">
          <div className="text-8xl mb-2 animate-bounce-gentle">🏆</div>
          <div className="text-5xl mb-4">🎉🐝🎉</div>
          <p className="text-4xl font-extrabold mb-2">أتقنت المهارة!</p>
          <p className="text-xl opacity-90 mb-8">عمل رائع يا بطل — أنت جاهز لما هو أصعب.</p>
          <BigButton onClick={next} variant="onPrimary">
            تابع ➜
          </BigButton>
        </div>
      )}
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

function BigButton({
  children,
  onClick,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'onPrimary';
}) {
  const cls =
    variant === 'onPrimary'
      ? 'bg-card text-primary'
      : 'bg-primary text-primary-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[56px] rounded-[var(--radius)] ${cls} text-xl font-bold px-8 py-3 shadow-md active:scale-95`}
    >
      {children}
    </button>
  );
}
