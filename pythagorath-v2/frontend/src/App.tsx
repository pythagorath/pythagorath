/**
 * App root — a small screen switcher (no router needed yet):
 *   SessionStart  ->  QuestionScreen (child learns)  |  ParentDashboard (mother).
 */
import { useState } from 'react';
import SessionStart from '@/pages/SessionStart';
import SubjectGate from '@/pages/SubjectGate';
import QuestionScreen from '@/pages/QuestionScreen';
import ParentDashboard from '@/pages/ParentDashboard';
import AdminAudio from '@/pages/AdminAudio';
import QuestionManager from '@/pages/QuestionManager';

type View =
  | { screen: 'start' }
  | { screen: 'map'; studentId: number; subjectId: number }
  | { screen: 'learn'; studentId: number; subjectId: number; skillId: number }
  | { screen: 'parent'; studentId: number };

export default function App() {
  const [view, setView] = useState<View>({ screen: 'start' });

  // Admin GUI at ?admin : question manager by default, audio studio at ?admin=audio (or =1).
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin')) {
      const v = params.get('admin');
      return v === 'audio' || v === '1' ? <AdminAudio /> : <QuestionManager />;
    }
  }

  if (view.screen === 'map') {
    return (
      <SubjectGate
        studentId={view.studentId}
        subjectId={view.subjectId}
        onStartSkill={(skillId) =>
          setView({
            screen: 'learn',
            studentId: view.studentId,
            subjectId: view.subjectId,
            skillId,
          })
        }
        onBack={() => setView({ screen: 'start' })}
        onOpenParent={() => setView({ screen: 'parent', studentId: view.studentId })}
      />
    );
  }

  if (view.screen === 'learn') {
    return (
      <QuestionScreen
        studentId={view.studentId}
        subjectId={view.subjectId}
        skillId={view.skillId}
        onExit={() =>
          setView({ screen: 'map', studentId: view.studentId, subjectId: view.subjectId })
        }
      />
    );
  }

  if (view.screen === 'parent') {
    return (
      <ParentDashboard
        studentId={view.studentId}
        onBack={() => setView({ screen: 'start' })}
      />
    );
  }

  return (
    <SessionStart
      onStart={(studentId, subjectId) => setView({ screen: 'map', studentId, subjectId })}
      onOpenParent={(studentId) => setView({ screen: 'parent', studentId })}
    />
  );
}
