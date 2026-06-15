/**
 * §3.3 Skill map — the child's visual progress map for a subject.
 *
 * Shows every skill of the unit in order as a vertical path of large cards:
 *   - mastered  → green + 🏆 (done)
 *   - available → brand orange + ▶ (tap to START a session on that skill)
 *   - locked    → gray + 🔒 (tap to see a KIND child message, never frustration)
 *
 * State comes only from the live backend (GET …/skillmap) — the same source of
 * truth the engine gates on. Hindi numerals, Pythagorath identity throughout.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSkillMap, type SkillMapEntry } from '@/api/client';
import { Logo } from '@/components/Logo';
import { toArabicIndic } from '@/lib/numerals';
import { speak } from '@/lib/speak';

export default function SkillMap({
  studentId,
  subjectId,
  onStartSkill,
  onBack,
  onOpenParent,
}: {
  studentId: number;
  subjectId: number;
  onStartSkill: (skillId: number, skillName: string) => void;
  onBack: () => void;
  onOpenParent: () => void;
}) {
  const mapQ = useQuery({
    queryKey: ['skillmap', studentId, subjectId],
    queryFn: () => getSkillMap(studentId, subjectId),
  });

  // The kind message shown when a child taps a locked skill.
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  function tapLocked(entry: SkillMapEntry) {
    const blocker = entry.prerequisites.find((p) => !p.mastered);
    const prev = blocker?.name ?? 'المهارة السابقة';
    const msg = `أتقن «${prev}» أولاً لتفتح هذه المهارة. أنت تتقدّم بخطوات رائعة! 🐝`;
    setLockedMsg(msg);
    speak(`أتقن ${prev} أولاً لتفتح هذه المهارة`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Logo variant="orange" className="h-10 w-auto text-2xl" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenParent}
            className="text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2"
          >
            تقرير ولي الأمر ›
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-base font-medium text-muted-foreground px-3 py-2"
          >
            رجوع
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto p-6 flex flex-col">
        <h1 className="text-2xl font-extrabold mb-1 text-center">خريطة المهارات 🗺️</h1>
        <p className="text-muted-foreground text-center mb-6">
          اختر مهارة متاحة لتبدأ، أو شاهد ما أتقنته 🌟
        </p>

        {mapQ.isLoading && (
          <p className="text-center text-muted-foreground text-lg">…جارٍ تجهيز الخريطة</p>
        )}
        {mapQ.isError && (
          <p className="text-center text-destructive text-lg">تعذّر الاتصال بالخادم.</p>
        )}

        <div className="flex flex-col items-stretch">
          {mapQ.data?.map((entry, i) => (
            <div key={entry.skill_id} className="flex flex-col items-center">
              <SkillCard
                entry={entry}
                onStart={() => onStartSkill(entry.skill_id, entry.name)}
                onLocked={() => tapLocked(entry)}
              />
              {/* connector to the next skill, green once this one is mastered */}
              {i < (mapQ.data?.length ?? 0) - 1 && (
                <div
                  className={`w-1.5 h-7 rounded-full ${
                    entry.status === 'mastered' ? 'bg-emerald-400' : 'bg-border'
                  }`}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Kind locked message (no frustration) */}
      {lockedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-card rounded-[var(--radius)] shadow-xl max-w-sm w-full p-7 text-center border-4 border-primary/30">
            <div className="text-7xl mb-3 animate-bounce-gentle">🌟</div>
            <p className="text-xl font-extrabold text-primary mb-5 leading-relaxed">
              {lockedMsg}
            </p>
            <button
              type="button"
              onClick={() => setLockedMsg(null)}
              className="min-h-[52px] rounded-[var(--radius)] bg-primary text-primary-foreground text-lg font-bold px-8 py-3 shadow-md active:scale-95"
            >
              حسناً 👍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillCard({
  entry,
  onStart,
  onLocked,
}: {
  entry: SkillMapEntry;
  onStart: () => void;
  onLocked: () => void;
}) {
  const order = toArabicIndic(entry.order);

  if (entry.status === 'mastered') {
    return (
      <button
        type="button"
        onClick={onStart}
        className="w-full flex items-center gap-4 rounded-[var(--radius)] p-5 text-right shadow-md border-4 bg-emerald-50 border-emerald-300 active:scale-[0.98] transition-all"
      >
        <Badge className="bg-emerald-500 text-white">{order}</Badge>
        <div className="flex-1">
          <div className="text-xl font-extrabold text-emerald-800">{entry.name}</div>
          <div className="text-sm font-bold text-emerald-600">أتقنتها — أحسنت! ✓</div>
        </div>
        <span className="text-4xl" aria-hidden>🏆</span>
      </button>
    );
  }

  if (entry.status === 'available') {
    return (
      <button
        type="button"
        onClick={onStart}
        className="w-full flex items-center gap-4 rounded-[var(--radius)] p-5 text-right shadow-md border-4 bg-primary/10 border-primary active:scale-[0.98] transition-all hover:brightness-95"
      >
        <Badge className="bg-primary text-primary-foreground">{order}</Badge>
        <div className="flex-1">
          <div className="text-xl font-extrabold text-foreground">{entry.name}</div>
          <div className="text-sm font-bold text-primary">متاحة الآن — هيّا نبدأ!</div>
        </div>
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-2xl shrink-0" aria-hidden>
          ▶
        </span>
      </button>
    );
  }

  // locked
  return (
    <button
      type="button"
      onClick={onLocked}
      className="w-full flex items-center gap-4 rounded-[var(--radius)] p-5 text-right shadow-sm border-4 bg-muted/40 border-border opacity-90 active:scale-[0.98] transition-all"
    >
      <Badge className="bg-muted-foreground/30 text-muted-foreground">{order}</Badge>
      <div className="flex-1">
        <div className="text-xl font-extrabold text-muted-foreground">{entry.name}</div>
        <div className="text-sm font-bold text-muted-foreground">مقفلة — انقر لتعرف لماذا</div>
      </div>
      <span className="text-3xl grayscale" aria-hidden>🔒</span>
    </button>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`flex items-center justify-center w-11 h-11 rounded-full text-xl font-extrabold shrink-0 ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
