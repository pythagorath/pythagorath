/**
 * Graphical question management (the "complete template") — browse the hierarchy,
 * add/edit/delete questions with a SMART form that shows only the fields for the
 * chosen interaction type, and record audio inline. All via the existing admin API.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminGrades, getAdminSubjects, getAdminUnits, getAdminSkills,
  getAdminQuestions, getRecordedAudioIds,
  createQuestion, patchAdminQuestion, deleteAdminQuestion,
  type Question, type QuestionPayload,
} from '@/api/client';
import { Logo } from '@/components/Logo';
import AudioRecorder from '@/components/AudioRecorder';
import QuestionPreview from '@/components/QuestionPreview';
import { toArabicIndic, toWestern, toHindi } from '@/lib/numerals';

const EMOJIS = ['🍎', '🌟', '⚽', '🐝', '🎈', '🍊', '🐠', '🍓', '🚗', '🌸', '🐶', '🍌', '🎁', '🦋', '🍩', '🐢'];

type IType = 'choice' | 'number-line' | 'fill' | 'tap-count';
const TYPE_LABEL: Record<IType, string> = {
  'choice': 'اختيار من متعدد', 'number-line': 'خط الأعداد', 'fill': 'تعبئة رقمية', 'tap-count': 'عدّ بالقفز',
};

interface Form {
  id: number | null;
  skill_id: number;
  interaction_type: IType;
  difficulty: number;
  prompt: string;
  answer: string;
  choices: string[];
  min: string; max: string; step: string;
  maxDigits: string;
  groups: string; perGroup: string; emoji: string;
}

const H = (n: number | string) => toArabicIndic(n); // display as Hindi

const blank = (skillId: number): Form => ({
  id: null, skill_id: skillId, interaction_type: 'choice', difficulty: 1,
  prompt: '', answer: '', choices: ['', '', '', ''],
  min: '٠', max: '١٠', step: '١', maxDigits: '٢', groups: '٤', perGroup: '٥', emoji: '🍎',
});

function fromQuestion(q: Question): Form {
  const p = q.payload || {};
  const f = blank(q.skill_id);
  f.id = q.id; f.interaction_type = (q.interaction_type as IType); f.difficulty = q.difficulty;
  f.prompt = p.prompt ?? ''; f.answer = toHindi(p.answer ?? '');
  if (p.choices) f.choices = p.choices.map((c) => toHindi(c));
  if (p.line) { f.min = H(p.line.min); f.max = H(p.line.max); f.step = H(p.line.step); }
  if (p.fill) f.maxDigits = H(p.fill.max_digits ?? 3);
  if (p.count) { f.groups = H(p.count.groups); f.perGroup = H(p.count.per_group); f.emoji = p.count.emoji; }
  return f;
}

const num = (s: string) => Number(toWestern(s).trim());

function buildPayload(f: Form): QuestionPayload {
  const p: QuestionPayload = { prompt: f.prompt };
  if (f.interaction_type === 'number-line') {
    p.answer = f.answer; p.line = { min: num(f.min), max: num(f.max), step: num(f.step) };
  } else if (f.interaction_type === 'choice') {
    p.choices = f.choices.map((c) => c.trim()).filter(Boolean); p.answer = f.answer;
  } else if (f.interaction_type === 'fill') {
    p.answer = f.answer; p.fill = { max_digits: num(f.maxDigits) || 3 };
  } else if (f.interaction_type === 'tap-count') {
    const total = num(f.groups) * num(f.perGroup);
    p.count = { emoji: f.emoji || '🍎', groups: num(f.groups), per_group: num(f.perGroup) };
    p.answer = toArabicIndic(total);
  }
  return p;
}

export default function QuestionManager() {
  const qc = useQueryClient();
  const grades = useQuery({ queryKey: ['adm-grades'], queryFn: getAdminGrades });
  const subjects = useQuery({ queryKey: ['adm-subjects'], queryFn: getAdminSubjects });
  const units = useQuery({ queryKey: ['adm-units'], queryFn: getAdminUnits });
  const skills = useQuery({ queryKey: ['admin-skills'], queryFn: getAdminSkills });
  const questions = useQuery({ queryKey: ['admin-questions'], queryFn: getAdminQuestions });
  const recorded = useQuery({ queryKey: ['recorded-audio'], queryFn: getRecordedAudioIds });
  const recordedSet = useMemo(() => new Set(recorded.data ?? []), [recorded.data]);

  const orderedSkills = useMemo(
    () => [...(skills.data ?? [])].sort((a, b) => a.order - b.order), [skills.data]);
  const [skillId, setSkillId] = useState<number | null>(null);
  useEffect(() => { if (skillId === null && orderedSkills.length) setSkillId(orderedSkills[0].id); }, [orderedSkills, skillId]);

  const skillQuestions = useMemo(
    () => (questions.data ?? []).filter((q) => q.skill_id === skillId).sort((a, b) => a.difficulty - b.difficulty || a.id - b.id),
    [questions.data, skillId]);

  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-questions'] });
    qc.invalidateQueries({ queryKey: ['recorded-audio'] });
  };

  async function save() {
    if (!form) return;
    setBusy(true); setMsg('');
    try {
      const body = { skill_id: form.skill_id, interaction_type: form.interaction_type, difficulty: form.difficulty, payload: buildPayload(form) };
      const saved = form.id == null ? await createQuestion(body) : await patchAdminQuestion(form.id, body);
      setForm(fromQuestion(saved));
      setMsg('✅ حُفظ السؤال'); refresh();
    } catch (e) {
      setMsg('فشل الحفظ — تحقّق من الحقول');
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!form?.id) return;
    if (!window.confirm('حذف هذا السؤال نهائياً؟')) return;
    await deleteAdminQuestion(form.id); setForm(null); setMsg('🗑 حُذف السؤال'); refresh();
  }

  // hierarchy labels
  const grade = grades.data?.[0]; const subject = subjects.data?.[0]; const unit = units.data?.[0];

  return (
    <div className="min-h-screen bg-secondary/40 text-foreground">
      <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Logo variant="orange" className="h-8 w-auto text-lg" />
          <span className="text-muted-foreground text-sm">إدارة الأسئلة</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a href="/?admin=audio" className="text-muted-foreground hover:text-primary px-3 py-2">🎙 استوديو الصوت</a>
          <a href="/" className="rounded-[var(--radius)] bg-primary/10 text-primary font-bold px-4 py-2">معاينة كطفل ➜</a>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* hierarchy tree */}
        <aside className="bg-card rounded-[var(--radius)] border border-border p-4 max-h-[78vh] overflow-y-auto text-sm">
          <div className="font-bold">{grade?.name}</div>
          <div className="pr-3 text-muted-foreground">{subject?.name}</div>
          <div className="pr-3 text-muted-foreground mb-2">{unit?.name}</div>
          <div className="space-y-1">
            {orderedSkills.map((s) => {
              const total = (questions.data ?? []).filter((q) => q.skill_id === s.id).length;
              return (
                <button key={s.id} onClick={() => { setSkillId(s.id); setForm(null); }}
                  className={`w-full text-right px-2 py-2 rounded-lg ${s.id === skillId ? 'bg-primary/10 ring-2 ring-primary font-bold' : 'hover:bg-secondary'}`}>
                  {s.name} <span className="text-muted-foreground">({toArabicIndic(total)})</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* questions of the selected skill + form */}
        <section className="space-y-4">
          <div className="bg-card rounded-[var(--radius)] border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">أسئلة المهارة ({toArabicIndic(skillQuestions.length)})</h2>
              <button onClick={() => skillId && setForm(blank(skillId))}
                className="rounded-[var(--radius)] bg-primary text-primary-foreground font-bold px-4 py-2">➕ إضافة سؤال</button>
            </div>
            <ul className="divide-y divide-border">
              {skillQuestions.map((q) => (
                <li key={q.id}>
                  <button onClick={() => setForm(fromQuestion(q))}
                    className={`w-full text-right flex items-center gap-2 py-2.5 px-1 ${form?.id === q.id ? 'text-primary font-bold' : ''}`}>
                    <span className="text-xs rounded-full bg-secondary px-2 py-0.5">ص{toArabicIndic(q.difficulty)}</span>
                    <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">{TYPE_LABEL[q.interaction_type as IType] ?? q.interaction_type}</span>
                    <span className="flex-1 truncate">{q.payload.prompt}</span>
                    <span className={recordedSet.has(q.id) ? 'text-emerald-600' : 'text-neutral-300'}>{recordedSet.has(q.id) ? '🎙✓' : '🎙○'}</span>
                  </button>
                </li>
              ))}
              {skillQuestions.length === 0 && <li className="py-3 text-muted-foreground text-sm">لا أسئلة بعد — أضف سؤالاً.</li>}
            </ul>
          </div>

          {form && (
            <div className="bg-card rounded-[var(--radius)] border border-border p-5 space-y-4">
              <h3 className="font-bold text-lg">{form.id == null ? 'سؤال جديد' : `تعديل السؤال #${toArabicIndic(form.id)}`}</h3>

              <Field label="نص السؤال">
                <textarea value={form.prompt} onChange={(e) => set({ prompt: e.target.value })}
                  className="w-full rounded-lg border border-border p-2 text-base" rows={2} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="المهارة">
                  <select value={form.skill_id} onChange={(e) => set({ skill_id: Number(e.target.value) })} className="w-full rounded-lg border border-border p-2">
                    {orderedSkills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="الصعوبة">
                  <select value={form.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })} className="w-full rounded-lg border border-border p-2">
                    <option value={1}>١ (سهل)</option><option value={2}>٢ (متوسط)</option><option value={3}>٣ (صعب)</option>
                  </select>
                </Field>
              </div>

              <Field label="نوع التفاعل">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TYPE_LABEL) as IType[]).map((t) => (
                    <button key={t} onClick={() => set({ interaction_type: t })}
                      className={`rounded-lg px-3 py-2 border-2 ${form.interaction_type === t ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'}`}>
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </Field>

              {/* SMART fields per interaction type */}
              {form.interaction_type === 'number-line' && (
                <div className="grid grid-cols-4 gap-3">
                  <Field label="الأدنى"><Inp value={form.min} onChange={(v) => set({ min: v })} /></Field>
                  <Field label="الأعلى"><Inp value={form.max} onChange={(v) => set({ max: v })} /></Field>
                  <Field label="الخطوة"><Inp value={form.step} onChange={(v) => set({ step: v })} /></Field>
                  <Field label="الإجابة"><Inp value={form.answer} onChange={(v) => set({ answer: v })} /></Field>
                </div>
              )}
              {form.interaction_type === 'choice' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">الخيارات</label>
                  {form.choices.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <Inp value={c} onChange={(v) => set({ choices: form.choices.map((x, j) => j === i ? v : x) })} />
                      <button onClick={() => set({ choices: form.choices.filter((_, j) => j !== i) })} className="text-destructive px-2">حذف</button>
                    </div>
                  ))}
                  <button onClick={() => set({ choices: [...form.choices, ''] })} className="text-primary text-sm">➕ خيار</button>
                  <Field label="الإجابة الصحيحة">
                    <select value={form.answer} onChange={(e) => set({ answer: e.target.value })} className="w-full rounded-lg border border-border p-2">
                      <option value="">— اختر —</option>
                      {form.choices.filter(Boolean).map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
              )}
              {form.interaction_type === 'fill' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="الإجابة"><Inp value={form.answer} onChange={(v) => set({ answer: v })} /></Field>
                  <Field label="حد الخانات"><Inp value={form.maxDigits} onChange={(v) => set({ maxDigits: v })} /></Field>
                </div>
              )}
              {form.interaction_type === 'tap-count' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <Field label="المجموعات"><Inp value={form.groups} onChange={(v) => set({ groups: v })} /></Field>
                    <Field label="لكل مجموعة"><Inp value={form.perGroup} onChange={(v) => set({ perGroup: v })} /></Field>
                    <Field label="الإجابة (محسوبة)">
                      <div className="rounded-lg border border-border p-2 bg-secondary/40 font-bold text-primary">{toArabicIndic(num(form.groups) * num(form.perGroup) || 0)}</div>
                    </Field>
                  </div>
                  <div>
                    <span className="text-sm font-semibold block mb-1">الإيموجي (نوّع لكل سؤال 🎨)</span>
                    <div className="flex flex-wrap gap-2">
                      {EMOJIS.map((e) => (
                        <button key={e} type="button" onClick={() => set({ emoji: e })}
                          className={`text-2xl w-11 h-11 rounded-lg border-2 ${form.emoji === e ? 'border-primary bg-primary/10' : 'border-border'}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE preview — exactly as the child sees it */}
              <div>
                <span className="text-sm font-semibold block mb-2">👁 معاينة — كما يراها الطفل</span>
                <QuestionPreview interactionType={form.interaction_type} payload={buildPayload(form)} questionId={form.id} />
              </div>

              {/* inline audio (only for a saved question) */}
              {form.id != null ? (
                <AudioRecorder questionId={form.id} hasAudio={recordedSet.has(form.id)} onChange={refresh} />
              ) : (
                <p className="text-sm text-muted-foreground">احفظ السؤال أولاً لتسجيل صوته.</p>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <button disabled={busy} onClick={save} className="rounded-[var(--radius)] bg-primary text-primary-foreground font-bold px-6 py-2.5 disabled:opacity-50">حفظ</button>
                {form.id != null && <button onClick={remove} className="rounded-[var(--radius)] border border-destructive text-destructive font-bold px-5 py-2.5">حذف</button>}
                <button onClick={() => setForm(null)} className="text-muted-foreground px-3">إلغاء</button>
                {msg && <span className="text-sm font-medium text-primary">{msg}</span>}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold block mb-1">{label}</span>
      {children}
    </label>
  );
}
// Every author input normalises to Hindi numerals live (so "30" -> "٣٠"),
// matching exactly what the child produces.
function Inp({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(toHindi(e.target.value))} dir="rtl"
    className="w-full rounded-lg border border-border p-2 text-base" />;
}
