/**
 * §3.4 parent (mother) dashboard — calm, adult, reassuring. NOT the child UI.
 *
 * Answers a busy mother's real questions in plain Arabic (Hindi numerals), from
 * the live report (GET /api/students/{id}/report):
 *   1. Where is he now?      — current unit + "أتقن X من Y مهارات" + progress bar
 *   2. What has he mastered?  — a ✓ list of skill names
 *   3. In step with school?   — "يدرس منهج صفّه"
 *   4. Does he need help?     — a gentle support card, only when warranted
 *   5. Tone                   — an encouraging, reassuring headline
 * No raw percentages, no technical jargon.
 */
import { useQuery } from '@tanstack/react-query';
import { getParentReport, type ParentReport, type ParentSkill } from '@/api/client';
import { Logo } from '@/components/Logo';
import { toArabicIndic } from '@/lib/numerals';

/** One reassuring sentence at the top, by overall state. */
function reassurance(r: ParentReport): string {
  const name = r.student_name;
  if (r.overall_light === 'green') {
    if (r.unit.mastered_skills >= r.unit.total_skills && r.unit.total_skills > 0)
      return `أكمل ${name} كل مهارات هذه الوحدة — إنجاز رائع! 🌟`;
    return `${name} يتقدّم بثبات وثقة — واصلوا تشجيعه! 🌟`;
  }
  if (r.overall_light === 'yellow')
    return `${name} يبذل جهداً طيّباً، ويحتاج لمسة دعم بسيطة — ولا داعي للقلق. 🌸`;
  return `لم يبدأ ${name} رحلته بعد — هيّا نبدأ معاً خطوة بخطوة! 🐝`;
}

const STATUS: Record<ParentSkill['status'], { dot: string; pill: string; label: string }> = {
  mastered: { dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700', label: 'أتقنها ✓' },
  in_progress: { dot: 'bg-amber-500', pill: 'bg-amber-100 text-amber-700', label: 'يتدرّب الآن' },
  not_started: { dot: 'bg-neutral-300', pill: 'bg-neutral-100 text-neutral-500', label: 'لم تبدأ بعد' },
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-card rounded-[var(--radius)] border border-border shadow-sm p-5 ${className}`}>
      {children}
    </section>
  );
}

export default function ParentDashboard({
  studentId,
  onBack,
}: {
  studentId: number;
  onBack: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['report', studentId],
    queryFn: () => getParentReport(studentId),
  });

  const pct =
    data && data.unit.total_skills > 0
      ? Math.round((data.unit.mastered_skills / data.unit.total_skills) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-secondary/40 text-foreground">
      <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Logo variant="orange" className="h-8 w-auto text-lg" />
          <span className="text-muted-foreground text-sm">تقرير ولي الأمر</span>
        </div>
        <button type="button" onClick={onBack} className="text-sm font-medium text-primary px-3 py-2">
          رجوع
        </button>
      </header>

      <main className="w-full max-w-2xl mx-auto p-6 flex flex-col gap-5">
        {isLoading && <p className="text-muted-foreground">…جارٍ تحضير التقرير</p>}
        {isError && <p className="text-destructive">تعذّر تحميل التقرير.</p>}

        {data && (
          <>
            {/* Reassurance headline */}
            <p className="text-lg font-semibold leading-relaxed text-foreground">
              {reassurance(data)}
            </p>

            {/* 1 — Where is he now */}
            <Card>
              <h2 className="text-base font-bold mb-1">أين {data.student_name} الآن؟</h2>
              <p className="text-muted-foreground text-sm mb-4">
                يدرس <span className="font-semibold text-foreground">{data.unit.unit_name}</span>
              </p>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-primary">
                  {toArabicIndic(data.unit.mastered_skills)}
                </span>
                <span className="text-lg text-muted-foreground">
                  من {toArabicIndic(data.unit.total_skills)} مهارات أتقنها
                </span>
              </div>

              {/* progress bar */}
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>

            {/* 2 — What has he mastered */}
            <Card>
              <h2 className="text-base font-bold mb-3">ماذا أتقن؟</h2>
              {data.mastered_names.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  لم يُتقن مهارة بعد — وهذا طبيعيّ تماماً في البداية. 🌱
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.mastered_names.map((name) => (
                    <li key={name} className="flex items-center gap-3 text-base">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-sm shrink-0">
                        ✓
                      </span>
                      <span className="text-foreground">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* 4 — Gentle support signal (only when warranted) */}
            {data.support && (
              <Card className="border-amber-300 bg-amber-50/60">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0" aria-hidden>💛</span>
                  <div>
                    <h2 className="text-base font-bold mb-1 text-amber-800">قد يحتاج لمسة دعم</h2>
                    <p className="text-amber-900 leading-relaxed">
                      يحاول {data.student_name} في «
                      <span className="font-semibold">{data.support.name}</span>
                      » منذ فترة. جرّبوا حلّها معه خطوة بخطوة — بلا قلق، فالتعلّم رحلة. 🌸
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* 3 — In step with school */}
            {data.curriculum_on_track && (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white shrink-0">
                    ✓
                  </span>
                  <p className="text-emerald-900 leading-relaxed">
                    يدرس {data.student_name} منهج صفّه (
                    <span className="font-semibold">{data.grade_name}</span>) — متزامن مع المدرسة.
                  </p>
                </div>
              </Card>
            )}

            {/* Full unit picture */}
            <Card>
              <h2 className="text-base font-bold mb-1">مهارات الوحدة</h2>
              <ul>
                {data.skills.map((s) => {
                  const st = STATUS[s.status];
                  return (
                    <li
                      key={s.skill_id}
                      className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                    >
                      <span className={`w-3 h-3 rounded-full shrink-0 ${st.dot}`} aria-hidden />
                      <span className="flex-1 text-base text-foreground">{s.name}</span>
                      <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${st.pill}`}>
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
