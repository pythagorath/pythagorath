/**
 * Admin "Audio Studio" — fluent sequential recording with a sense of completion.
 * ?admin=1. Record → "حفظ والتالي" auto-advances to the next unrecorded question.
 * Per-skill progress, a skill-complete celebration, and a unit-complete screen so
 * the teacher always knows where they are and when they're done.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAdminQuestions,
  getAdminSkills,
  getRecordedAudioIds,
  questionAudioUrl,
  uploadQuestionAudio,
  deleteQuestionAudio,
  type Question,
} from '@/api/client';
import { Logo } from '@/components/Logo';

export default function AdminAudio() {
  const questionsQ = useQuery({ queryKey: ['admin-questions'], queryFn: getAdminQuestions });
  const skillsQ = useQuery({ queryKey: ['admin-skills'], queryFn: getAdminSkills });
  const recordedQ = useQuery({ queryKey: ['recorded-audio'], queryFn: getRecordedAudioIds });

  const [recorded, setRecorded] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (recordedQ.data) setRecorded(new Set(recordedQ.data));
  }, [recordedQ.data]);

  const [onlyUnrecorded, setOnlyUnrecorded] = useState(false);
  const [qid, setQid] = useState<number | null>(null);
  const [skillDone, setSkillDone] = useState<{ name: string; nextId: number | null } | null>(null);
  const [recording, setRecording] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);

  const skillInfo = useMemo(() => {
    const m = new Map<number, { name: string; order: number }>();
    skillsQ.data?.forEach((s) => m.set(s.id, { name: s.name, order: s.order }));
    return m;
  }, [skillsQ.data]);

  const ordered = useMemo(() => {
    const qs = [...(questionsQ.data ?? [])];
    qs.sort((a, b) => {
      const oa = skillInfo.get(a.skill_id)?.order ?? 999;
      const ob = skillInfo.get(b.skill_id)?.order ?? 999;
      return oa - ob || a.id - b.id;
    });
    return qs;
  }, [questionsQ.data, skillInfo]);

  useEffect(() => {
    if (qid === null && ordered.length) {
      setQid((ordered.find((q) => !recorded.has(q.id)) ?? ordered[0]).id);
    }
  }, [ordered, recorded, qid]);

  useEffect(() => {
    setClipUrl(null);
    blobRef.current = null;
    setStatus('');
    setSkillDone(null);
  }, [qid]);

  const current = ordered.find((q) => q.id === qid);
  const listShown = onlyUnrecorded ? ordered.filter((q) => !recorded.has(q.id)) : ordered;

  const inSkill = (sid: number) => ordered.filter((q) => q.skill_id === sid);
  const recordedInSkill = (sid: number) => inSkill(sid).filter((q) => recorded.has(q.id)).length;

  const groups = useMemo(() => {
    const g: { skillId: number; name: string; items: Question[] }[] = [];
    for (const q of listShown) {
      let grp = g.find((x) => x.skillId === q.skill_id);
      if (!grp) {
        grp = { skillId: q.skill_id, name: skillInfo.get(q.skill_id)?.name ?? `#${q.skill_id}`, items: [] };
        g.push(grp);
      }
      grp.items.push(q);
    }
    return g;
  }, [listShown, skillInfo]);

  const recordedCount = ordered.filter((q) => recorded.has(q.id)).length;
  const allDone = ordered.length > 0 && recordedCount === ordered.length;

  const skillQs = current ? inSkill(current.skill_id) : [];
  const posInSkill = current ? skillQs.findIndex((q) => q.id === current.id) + 1 : 0;

  function advanceToNextUnrecorded(updated: Set<number>) {
    const idx = ordered.findIndex((q) => q.id === qid);
    const after = ordered.slice(idx + 1).find((q) => !updated.has(q.id));
    const any = ordered.find((q) => !updated.has(q.id));
    setQid((after ?? any ?? null)?.id ?? null);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        setClipUrl(URL.createObjectURL(blobRef.current));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setStatus('…جارٍ التسجيل');
    } catch {
      setStatus('تعذّر الوصول إلى الميكروفون');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
    setStatus('تسجيل جاهز — استمع ثم احفظ');
  }

  async function saveAndNext() {
    if (qid == null || !blobRef.current || !current) return;
    setStatus('…جارٍ الحفظ');
    try {
      await uploadQuestionAudio(qid, blobRef.current);
      const updated = new Set(recorded).add(qid);
      setRecorded(updated);
      setClipUrl(null);
      blobRef.current = null;
      const skillId = current.skill_id;
      const skillRemaining = inSkill(skillId).filter((q) => !updated.has(q.id)).length;
      const allRecorded = ordered.every((q) => updated.has(q.id));
      if (!allRecorded && skillRemaining === 0) {
        // skill just completed — celebrate, offer the next skill
        const next = ordered.find((q) => !updated.has(q.id)) ?? null;
        setSkillDone({ name: skillInfo.get(skillId)?.name ?? '', nextId: next?.id ?? null });
      } else if (!allRecorded) {
        advanceToNextUnrecorded(updated);
      }
      // if allRecorded -> the unit-complete screen renders automatically
    } catch {
      setStatus('فشل الحفظ');
    }
  }

  async function removeSaved() {
    if (qid == null) return;
    try {
      await deleteQuestionAudio(qid);
      const updated = new Set(recorded);
      updated.delete(qid);
      setRecorded(updated);
      setStatus('🗑 حُذف صوت السؤال');
    } catch {
      setStatus('لا يوجد صوت محفوظ');
    }
  }

  function go(delta: number) {
    const idx = listShown.findIndex((q) => q.id === qid);
    const next = listShown[idx + delta];
    if (next) setQid(next.id);
  }

  return (
    <div className="min-h-screen bg-secondary/40 text-foreground">
      <header className="flex items-center justify-between gap-3 px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Logo variant="orange" className="h-8 w-auto text-lg" />
          <span className="text-muted-foreground text-sm">استوديو الصوت</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={onlyUnrecorded} onChange={(e) => setOnlyUnrecorded(e.target.checked)} />
            غير المسجّلة فقط
          </label>
          <span className="font-semibold text-primary">مسجَّل {recordedCount} من {ordered.length}</span>
          <a href="/?admin=questions" className="text-muted-foreground hover:text-primary px-3 py-2">📋 إدارة الأسئلة</a>
          <a href="/" className="rounded-[var(--radius)] bg-primary/10 text-primary font-bold px-4 py-2">
            معاينة كطفل ➜
          </a>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* skill-ordered list with per-skill progress + ✓/○ markers */}
        <aside className="bg-card rounded-[var(--radius)] border border-border p-3 max-h-[72vh] overflow-y-auto">
          {groups.map((g) => (
            <div key={g.skillId} className="mb-3">
              <div className="text-xs font-bold text-foreground px-2 py-1 flex justify-between">
                <span>{g.name}</span>
                <span className="text-muted-foreground">
                  {recordedInSkill(g.skillId)} من {inSkill(g.skillId).length} مسجّلة
                </span>
              </div>
              {g.items.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setQid(q.id)}
                  className={`w-full text-right flex items-center gap-2 px-2 py-2 rounded-lg text-sm ${
                    q.id === qid ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-secondary'
                  }`}
                >
                  <span className={recorded.has(q.id) ? 'text-emerald-600' : 'text-neutral-300'}>
                    {recorded.has(q.id) ? '✓' : '○'}
                  </span>
                  <span className="flex-1 truncate">{q.payload.prompt}</span>
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted-foreground p-2">لا أسئلة لعرضها.</p>}
        </aside>

        {/* main panel: unit-complete > skill-complete > recorder */}
        <section className="bg-card rounded-[var(--radius)] border border-border p-5">
          {allDone && (
            <div className="mb-5 rounded-[var(--radius)] bg-primary/10 p-4 text-center">
              <div className="text-4xl mb-1">🏆</div>
              <p className="text-lg font-extrabold text-primary">
                أنجزت كل التسجيلات! {recordedCount} من {ordered.length}
              </p>
              <p className="text-xs text-muted-foreground">يمكنك إعادة الاستماع أو إعادة تسجيل أي سؤال أدناه.</p>
            </div>
          )}
          {skillDone && !allDone ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="text-6xl mb-3 animate-bounce-gentle">🎉</div>
              <p className="text-xl font-extrabold text-primary mb-1">اكتملت مهارة «{skillDone.name}»</p>
              <p className="text-muted-foreground mb-6">سجّلت كل أسئلتها ✓</p>
              {skillDone.nextId != null && (
                <button
                  onClick={() => { const n = skillDone.nextId!; setSkillDone(null); setQid(n); }}
                  className="min-h-[52px] rounded-[var(--radius)] bg-primary text-primary-foreground text-lg font-bold px-8 active:scale-95"
                >
                  انتقل للمهارة التالية ➜
                </button>
              )}
            </div>
          ) : current ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  {skillInfo.get(current.skill_id)?.name} — سؤال {posInSkill} من {skillQs.length}
                  {' · '}({recordedInSkill(current.skill_id)} من {skillQs.length} مسجّلة)
                </span>
                <span className="text-sm">{recorded.has(current.id) ? '✓ مسجَّل' : '○ غير مسجَّل'}</span>
              </div>
              <p className="text-xl font-bold mb-5">🎙 {current.payload.prompt}</p>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                {!recording ? (
                  <button onClick={startRecording} className="min-h-[48px] rounded-[var(--radius)] bg-primary text-primary-foreground font-bold px-5 active:scale-95">🎙 تسجيل</button>
                ) : (
                  <button onClick={stopRecording} className="min-h-[48px] rounded-[var(--radius)] bg-destructive text-destructive-foreground font-bold px-5 active:scale-95">⏹ إيقاف</button>
                )}
                {clipUrl && (
                  <>
                    <audio src={clipUrl} controls className="h-10" />
                    <button onClick={saveAndNext} className="min-h-[48px] rounded-[var(--radius)] bg-primary text-primary-foreground font-bold px-5 active:scale-95">حفظ والتالي ➜</button>
                    <button onClick={() => { setClipUrl(null); blobRef.current = null; setStatus(''); }} className="min-h-[48px] rounded-[var(--radius)] border border-border px-5">إعادة تسجيل</button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 py-3 border-t border-border">
                <span className="text-sm text-muted-foreground">الصوت المحفوظ:</span>
                <audio src={questionAudioUrl(current.id)} controls className="h-10" />
                <button onClick={removeSaved} className="text-sm text-destructive font-medium px-2">حذف</button>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button onClick={() => go(-1)} className="text-sm font-medium px-3 py-2">‹ السابق</button>
                {status && <span className="text-sm font-medium text-primary">{status}</span>}
                <button onClick={() => go(1)} className="text-sm font-medium px-3 py-2">التالي ›</button>
              </div>
            </>
          ) : (
            <p className="text-lg">لا سؤال محدّد.</p>
          )}
        </section>
      </main>
    </div>
  );
}
