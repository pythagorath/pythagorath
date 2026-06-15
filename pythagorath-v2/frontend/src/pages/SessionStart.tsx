/**
 * F-2 session-start screen (§3 child-UX).
 *
 * Fetches the child profiles and subjects from the LIVE backend
 * (GET /api/students, GET /api/grades/{id}/subjects) — no static data — and
 * presents them as large, clear, RTL, brand-orange visual choices.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudents, getSubjects, type Student } from '@/api/client';
import { Logo } from '@/components/Logo';

/**
 * Large, child-friendly line icons (§3) drawn in the brand orange
 * (`text-primary` = #F39A24). lucide-style MIT paths, inlined so we don't
 * pull in an icon dependency — and so they never render in off-brand blue
 * the way the previous emoji glyphs (🔢/🔤) did.
 */
function SvgIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="52"
      height="52"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

// الرياضيات — calculator
const MathIcon = (
  <SvgIcon>
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
  </SvgIcon>
);

// الإنجليزية — languages
const EnglishIcon = (
  <SvgIcon>
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </SvgIcon>
);

// العلوم — flask
const ScienceIcon = (
  <SvgIcon>
    <path d="M10 2v7.31a2 2 0 0 1-.21.9L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45L14.21 10.2a2 2 0 0 1-.21-.9V2" />
    <path d="M8.5 2h7" />
    <path d="M7 16h10" />
  </SvgIcon>
);

// العربية — open book
const ArabicIcon = (
  <SvgIcon>
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </SvgIcon>
);

// fallback — graduation cap
const DefaultSubjectIcon = (
  <SvgIcon>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M22 10v6" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </SvgIcon>
);

// child / student — smiling face
const StudentIcon = (
  <SvgIcon>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </SvgIcon>
);

const SUBJECT_ICON: Record<string, ReactNode> = {
  الرياضيات: MathIcon,
  الإنجليزية: EnglishIcon,
  العلوم: ScienceIcon,
  العربية: ArabicIcon,
};

function ChoiceCard({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center gap-2 rounded-[var(--radius)]',
        'min-h-[140px] min-w-[140px] p-5 text-xl font-bold transition-all',
        'bg-card shadow-md active:scale-95 border-4',
        selected
          ? 'border-primary ring-4 ring-primary/30 text-primary'
          : 'border-transparent text-foreground hover:brightness-95',
      ].join(' ')}
    >
      {/* Icon always in brand orange, regardless of selection state. */}
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function SessionStart({
  onStart,
  onOpenParent,
}: {
  onStart: (studentId: number, subjectId: number) => void;
  onOpenParent: (studentId: number) => void;
}) {
  const [studentId, setStudentId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const studentsQ = useQuery({ queryKey: ['students'], queryFn: getStudents });

  // Auto-select the (demo) child once loaded, so subjects appear immediately.
  useEffect(() => {
    if (studentId === null && studentsQ.data && studentsQ.data.length > 0) {
      setStudentId(studentsQ.data[0].id);
    }
  }, [studentsQ.data, studentId]);

  const selectedStudent: Student | undefined = studentsQ.data?.find(
    (s) => s.id === studentId,
  );

  const subjectsQ = useQuery({
    queryKey: ['subjects', selectedStudent?.grade_id],
    queryFn: () => getSubjects(selectedStudent!.grade_id),
    enabled: !!selectedStudent,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Logo variant="orange" className="h-10 w-auto text-2xl" />
        <div className="flex items-center gap-2">
          <a href="/?admin=1" className="text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2">
            🎙 الاستوديو
          </a>
          <button
            type="button"
            disabled={!studentId}
            onClick={() => studentId && onOpenParent(studentId)}
            className="text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2 disabled:opacity-40"
          >
            تقرير ولي الأمر ›
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-6 flex flex-col gap-10">
        {/* Step 1 — who is learning */}
        <section>
          <h1 className="text-2xl font-extrabold mb-4">من سيتعلّم اليوم؟ 🐝</h1>
          {studentsQ.isLoading && (
            <p className="text-muted-foreground text-lg">…جارٍ التحميل</p>
          )}
          {studentsQ.isError && (
            <p className="text-destructive text-lg">تعذّر الاتصال بالخادم.</p>
          )}
          <div className="flex flex-wrap gap-4">
            {studentsQ.data?.map((s) => (
              <ChoiceCard
                key={s.id}
                selected={s.id === studentId}
                onClick={() => {
                  setStudentId(s.id);
                  setSubjectId(null);
                }}
                icon={StudentIcon}
                label={s.name}
              />
            ))}
          </div>
        </section>

        {/* Step 2 — choose a subject */}
        {selectedStudent && (
          <section>
            <h2 className="text-2xl font-extrabold mb-4">اختر مادة</h2>
            {subjectsQ.isLoading && (
              <p className="text-muted-foreground text-lg">…جارٍ التحميل</p>
            )}
            <div className="flex flex-wrap gap-4">
              {subjectsQ.data?.map((sub) => (
                <ChoiceCard
                  key={sub.id}
                  selected={sub.id === subjectId}
                  onClick={() => setSubjectId(sub.id)}
                  icon={SUBJECT_ICON[sub.name] ?? DefaultSubjectIcon}
                  label={sub.name}
                />
              ))}
            </div>
          </section>
        )}

        {/* Start — enabled once both chosen (learning screen arrives in F-3) */}
        <button
          type="button"
          disabled={!studentId || !subjectId}
          onClick={() => studentId && subjectId && onStart(studentId, subjectId)}
          className="self-start min-h-[56px] rounded-[var(--radius)] bg-primary text-primary-foreground text-xl font-bold px-8 py-3 shadow-md transition-all hover:brightness-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          هيّا نبدأ
        </button>
      </main>
    </div>
  );
}
