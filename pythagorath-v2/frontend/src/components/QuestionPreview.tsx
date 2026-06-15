/**
 * Live "as the child sees it" preview — renders a question from (interaction_type,
 * payload) using the SAME widgets the child uses, with a local answer check so the
 * author can try it and confirm correctness before saving. Guards against
 * incomplete config (e.g. step=0) so it never hangs.
 */
import { useState } from 'react';
import QuestionVisual, { type VisualData, type VisualType } from '@/components/visuals/QuestionVisuals';
import NumberLineInput from '@/components/visuals/NumberLineInput';
import TapCountInput from '@/components/visuals/TapCountInput';
import FillInput from '@/components/visuals/FillInput';
import { playQuestionAudio } from '@/lib/audio';
import { speak } from '@/lib/speak';
import type { QuestionPayload } from '@/api/client';
import { toWestern } from '@/lib/numerals';

// Mirror the server: unify digit scripts so "٣٠" and "30" match.
const norm = (s: unknown) => toWestern(String(s ?? '')).trim().toLowerCase();

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground text-center py-4">{children}</p>;
}

export default function QuestionPreview({
  interactionType,
  payload,
  questionId,
}: {
  interactionType: string;
  payload: QuestionPayload;
  questionId?: number | null;
}) {
  const [fb, setFb] = useState<boolean | null>(null);
  const [k, setK] = useState(0);
  const check = (ans: string) => setFb(norm(ans) === norm(payload.answer));
  const reset = () => { setFb(null); setK((x) => x + 1); };

  const playAudio = () =>
    questionId ? playQuestionAudio(questionId, payload.prompt || '') : speak(payload.prompt || '');

  function renderInput() {
    if (interactionType === 'number-line') {
      const l = payload.line;
      const ok = l && Number.isFinite(l.min) && Number.isFinite(l.max) && l.step > 0 && l.max > l.min && (l.max - l.min) / l.step <= 60;
      return ok ? <NumberLineInput key={k} line={l!} onConfirm={check} /> : <Hint>أكمل المدى (الأدنى/الأعلى/الخطوة) لرؤية الخط.</Hint>;
    }
    if (interactionType === 'tap-count') {
      const c = payload.count;
      const ok = c && c.groups > 0 && c.groups <= 12 && c.per_group > 0 && c.per_group <= 20;
      return ok ? <TapCountInput key={k} count={c!} onConfirm={check} /> : <Hint>أدخل عدد المجموعات وعدد كل مجموعة.</Hint>;
    }
    if (interactionType === 'fill') {
      return <FillInput key={k} config={payload.fill} onConfirm={check} />;
    }
    const choices = payload.choices ?? [];
    return choices.length ? (
      <div className="grid grid-cols-2 gap-3 mt-3">
        {choices.map((c) => (
          <button key={c} type="button" onClick={() => check(c)}
            className="min-h-[60px] rounded-[var(--radius)] bg-card border-4 border-primary/30 text-2xl font-extrabold active:scale-95">
            {c}
          </button>
        ))}
      </div>
    ) : <Hint>أضف خيارات لرؤيتها.</Hint>;
  }

  return (
    <div className="rounded-[var(--radius)] bg-background border-2 border-dashed border-primary/30 p-5">
      <div className="flex items-center justify-center gap-2 mb-3">
        <h4 className="text-xl font-extrabold text-center">{payload.prompt || '— نص السؤال —'}</h4>
        <button type="button" onClick={playAudio} className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary text-xl flex items-center justify-center" aria-label="استمع">🔊</button>
      </div>

      {payload.visual && (
        <QuestionVisual visualType={payload.visual.type as VisualType} visualData={payload.visual.data as unknown as VisualData} />
      )}

      {renderInput()}

      {fb !== null && (
        <div className={`mt-4 text-center text-lg font-bold ${fb ? 'text-emerald-600' : 'text-destructive'}`}>
          {fb ? '✓ إجابة صحيحة' : '✗ غير صحيحة'}
          <button type="button" onClick={reset} className="text-primary text-sm font-medium mr-3">أعد المحاولة</button>
        </div>
      )}
    </div>
  );
}
