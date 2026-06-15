/**
 * Decides the FIRST screen for a (student, subject): if the child has not been
 * placed yet (no learning path) → run the §2 diagnostic once; otherwise → the
 * skill map. After the diagnostic completes we invalidate the placement query so
 * this gate re-renders straight into the map (now reflecting the placement).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlacementStatus } from '@/api/client';
import DiagnosticScreen from '@/pages/DiagnosticScreen';
import SkillMap from '@/pages/SkillMap';

export default function SubjectGate({
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
  const qc = useQueryClient();
  const key = ['placement', studentId, subjectId];
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => getPlacementStatus(studentId, subjectId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        …جارٍ التحضير
      </div>
    );
  }

  // On error, fail open to the map rather than blocking the child.
  if (!isError && data && !data.placed) {
    return (
      <DiagnosticScreen
        studentId={studentId}
        subjectId={subjectId}
        onDone={() => qc.invalidateQueries({ queryKey: key })}
      />
    );
  }

  return (
    <SkillMap
      studentId={studentId}
      subjectId={subjectId}
      onStartSkill={onStartSkill}
      onBack={onBack}
      onOpenParent={onOpenParent}
    />
  );
}
