// ═══════════════════════════════════════════════════════════════════════════
// Phase 3B — Student Learning Flow (MVP)
// Structured guided learning: Path → Lesson → Explanation → Example → Practice → Assessment
// Uses subject cognitive templates for interaction selection
// Deterministic, no adaptive AI, stable progression
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  BookOpen, CheckCircle, Lock, PlayCircle, Clock, Star,
  ArrowLeft, ArrowRight, Route, GraduationCap, Trophy,
  Sparkles, Brain, Target, RotateCcw, Lightbulb, Pencil
} from 'lucide-react';
import {
  OMAN_GRADES, getSubjectsForGrade,
  type SubjectDefinition
} from '@/data/omanCurriculumData';
import {
  getSubjectInteractions,
  getSubjectSessionFlow,
  hasSubjectTemplate,
  saveInteractionResult,
  INTERACTION_TYPE_EMOJIS,
} from '@/lib/interactionService';
import { getSubjectTemplate } from '@/lib/subjectCognitiveTemplates';
import { InteractionRenderer, type InteractionConfig, type InteractionResult } from '@/components/InteractionToolkit';

// ─── Types ───────────────────────────────────────────────────────────────

interface LessonNode {
  id: number;
  title: string;
  node_type: string;
  order_index: number;
  content_config: string | null;
  duration_minutes: number | null;
}

interface LessonProgress {
  node_id: number;
  status: 'locked' | 'in_progress' | 'completed';
  score: number | null;
  completed_at: string | null;
}

type LessonPhase = 'explanation' | 'guided_example' | 'practice' | 'assessment' | 'remediation' | 'complete';

interface LessonState {
  phase: LessonPhase;
  interactionIdx: number;
  interactions: InteractionConfig[];
  results: InteractionResult[];
  score: number;
  totalAttempts: number;
  correctCount: number;
}

// ─── Storage Helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'pythagorath_learning_flow';

function loadFlowProgress(): Record<string, LessonProgress[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveFlowProgress(pathId: string, progress: LessonProgress[]) {
  try {
    const all = loadFlowProgress();
    all[pathId] = progress;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent */ }
}

// ─── Helper to extract items from API response ───────────────────────────

function extractItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

// ─── Explanation Content Generator ───────────────────────────────────────
// Generates structured explanation content based on lesson title and subject

function generateExplanationContent(lessonTitle: string, subjectName: string, grade: number) {
  const template = getSubjectTemplate(subjectName, grade);
  const approach = template?.approach || 'تعلم تفاعلي';

  return {
    title: lessonTitle,
    approach,
    steps: [
      { icon: '📖', text: `سنتعلم اليوم: ${lessonTitle}` },
      { icon: '🎯', text: `الهدف: فهم المفاهيم الأساسية` },
      { icon: '💡', text: `المنهج: ${approach}` },
    ],
  };
}

// ─── Guided Example Content ──────────────────────────────────────────────

function generateGuidedExample(lessonTitle: string, subjectName: string) {
  return {
    title: `مثال محلول: ${lessonTitle}`,
    steps: [
      { step: 1, text: 'اقرأ السؤال بعناية', icon: '👁️' },
      { step: 2, text: 'حدد المعطيات والمطلوب', icon: '📝' },
      { step: 3, text: 'طبّق الخطوات بالترتيب', icon: '🔢' },
      { step: 4, text: 'تحقق من الإجابة', icon: '✅' },
    ],
    hint: `تذكر: في ${subjectName}، الممارسة تصنع الإتقان!`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function StudentLearningFlow() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();

  // Navigation state
  const [view, setView] = useState<'subjects' | 'lessons' | 'learning'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<SubjectDefinition | null>(null);
  const [lessons, setLessons] = useState<LessonNode[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [activeLessonIdx, setActiveLessonIdx] = useState<number>(-1);
  const [loading, setLoading] = useState(false);

  // Lesson learning state
  const [lessonState, setLessonState] = useState<LessonState>({
    phase: 'explanation',
    interactionIdx: 0,
    interactions: [],
    results: [],
    score: 0,
    totalAttempts: 0,
    correctCount: 0,
  });

  const studentGrade = user?.grade || 1;
  const availableSubjects = getSubjectsForGrade(studentGrade);

  // ─── Load lessons for subject from backend learning paths ───────────────

  const loadLessonsForSubject = useCallback(async (subject: SubjectDefinition) => {
    setLoading(true);
    try {
      // Try to load from learning_paths backend
      const res = await client.entities['learning_paths'].queryAll({
        query: { status: 'published', grade_number: studentGrade, subject_name: subject.name },
        limit: 10,
      });
      const paths = extractItems<{ id: number; title: string; total_nodes: number | null }>(res?.data);

      if (paths.length > 0) {
        // Load nodes from first published path
        const pathId = paths[0].id;
        const nodesRes = await client.entities['path_nodes'].queryAll({
          query: { learning_path_id: pathId },
          limit: 200,
        });
        const nodes = extractItems<LessonNode>(nodesRes?.data)
          .sort((a, b) => a.order_index - b.order_index);

        if (nodes.length > 0) {
          setLessons(nodes);
          // Load saved progress
          const saved = loadFlowProgress()[`path_${pathId}`] || [];
          const progressMap = initializeProgress(nodes, saved);
          setLessonProgress(progressMap);
          setLoading(false);
          return;
        }
      }

      // Fallback: generate deterministic lessons from subject template
      const fallbackLessons = generateFallbackLessons(subject, studentGrade);
      setLessons(fallbackLessons);
      const saved = loadFlowProgress()[`subject_${subject.name}_${studentGrade}`] || [];
      const progressMap = initializeProgress(fallbackLessons, saved);
      setLessonProgress(progressMap);
    } catch (err) {
      console.error('Failed to load lessons:', err);
      // Fallback to generated lessons
      const fallbackLessons = generateFallbackLessons(subject, studentGrade);
      setLessons(fallbackLessons);
      const progressMap = initializeProgress(fallbackLessons, []);
      setLessonProgress(progressMap);
    } finally {
      setLoading(false);
    }
  }, [studentGrade]);

  // Initialize progress: first lesson unlocked, rest locked unless saved
  function initializeProgress(nodes: LessonNode[], saved: LessonProgress[]): LessonProgress[] {
    return nodes.map((node, idx) => {
      const existing = saved.find(p => p.node_id === node.id);
      if (existing) return existing;
      return {
        node_id: node.id,
        status: idx === 0 ? 'in_progress' : 'locked',
        score: null,
        completed_at: null,
      };
    });
  }

  // Generate fallback lessons when no backend paths exist
  function generateFallbackLessons(subject: SubjectDefinition, grade: number): LessonNode[] {
    const sessionFlow = getSubjectSessionFlow(subject.name, grade);
    const template = getSubjectTemplate(subject.name, grade);

    if (!template) {
      // Generic lessons
      return [
        { id: 9001, title: `مقدمة في ${subject.name}`, node_type: 'lesson', order_index: 0, content_config: null, duration_minutes: 10 },
        { id: 9002, title: `المفاهيم الأساسية`, node_type: 'lesson', order_index: 1, content_config: null, duration_minutes: 15 },
        { id: 9003, title: `تطبيقات عملية`, node_type: 'lesson', order_index: 2, content_config: null, duration_minutes: 15 },
        { id: 9004, title: `تقييم الوحدة`, node_type: 'assessment', order_index: 3, content_config: null, duration_minutes: 10 },
      ];
    }

    // Generate lessons based on cognitive skills from template
    const skills = template.patterns.slice(0, 4);
    return skills.map((pattern, idx) => ({
      id: 9000 + idx + 1,
      title: pattern.label,
      node_type: idx === skills.length - 1 ? 'assessment' : 'lesson',
      order_index: idx,
      content_config: JSON.stringify({ cognitiveSkill: pattern.cognitiveSkill, interactionType: pattern.interactionType }),
      duration_minutes: 10 + idx * 2,
    }));
  }

  // ─── Start a lesson ────────────────────────────────────────────────────

  const startLesson = (lessonIdx: number) => {
    const lesson = lessons[lessonIdx];
    const progress = lessonProgress[lessonIdx];
    if (!lesson || progress?.status === 'locked') return;

    setActiveLessonIdx(lessonIdx);

    // Get interactions using subject cognitive template
    const subjectName = selectedSubject?.name || '';
    const interactions = getSubjectInteractions(subjectName, studentGrade, 4);

    setLessonState({
      phase: 'explanation',
      interactionIdx: 0,
      interactions,
      results: [],
      score: 0,
      totalAttempts: 0,
      correctCount: 0,
    });

    setView('learning');
  };

  // ─── Phase transitions ─────────────────────────────────────────────────

  const advancePhase = () => {
    setLessonState(prev => {
      switch (prev.phase) {
        case 'explanation':
          return { ...prev, phase: 'guided_example' };
        case 'guided_example':
          return { ...prev, phase: 'practice', interactionIdx: 0 };
        case 'practice':
          return { ...prev, phase: 'assessment', interactionIdx: 0 };
        case 'assessment':
          return { ...prev, phase: 'complete' };
        case 'remediation':
          return { ...prev, phase: 'practice', interactionIdx: 0, results: [], correctCount: 0, totalAttempts: 0 };
        default:
          return prev;
      }
    });
  };

  // ─── Handle interaction completion ─────────────────────────────────────

  const handleInteractionComplete = (result: InteractionResult) => {
    saveInteractionResult(result);

    setLessonState(prev => {
      const newResults = [...prev.results, result];
      const newCorrect = prev.correctCount + (result.correct ? 1 : 0);
      const newAttempts = prev.totalAttempts + 1;
      const isLast = prev.interactionIdx >= prev.interactions.length - 1;

      if (isLast) {
        // Phase complete - check score
        const score = Math.round((newCorrect / Math.max(1, newAttempts)) * 100);

        if (prev.phase === 'assessment') {
          // Assessment done - check if remediation needed
          if (score < 60) {
            // Remediation: re-explain with simpler interactions
            const simpler = getSubjectInteractions(selectedSubject?.name || '', studentGrade, 3);
            return {
              ...prev,
              phase: 'remediation',
              results: newResults,
              correctCount: newCorrect,
              totalAttempts: newAttempts,
              score,
              interactions: simpler,
              interactionIdx: 0,
            };
          }
          return { ...prev, phase: 'complete', results: newResults, correctCount: newCorrect, totalAttempts: newAttempts, score };
        }

        // Practice complete - move to assessment
        const assessmentInteractions = getSubjectInteractions(selectedSubject?.name || '', studentGrade, 3);
        return {
          ...prev,
          phase: 'assessment',
          results: newResults,
          correctCount: 0,
          totalAttempts: 0,
          score: 0,
          interactions: assessmentInteractions,
          interactionIdx: 0,
        };
      }

      // Next interaction
      return {
        ...prev,
        results: newResults,
        correctCount: newCorrect,
        totalAttempts: newAttempts,
        interactionIdx: prev.interactionIdx + 1,
      };
    });
  };

  // ─── Complete lesson ───────────────────────────────────────────────────

  const completeLesson = () => {
    const lesson = lessons[activeLessonIdx];
    if (!lesson) return;

    // Update progress
    const updated = [...lessonProgress];
    updated[activeLessonIdx] = {
      node_id: lesson.id,
      status: 'completed',
      score: lessonState.score,
      completed_at: new Date().toISOString(),
    };

    // Unlock next lesson
    if (activeLessonIdx + 1 < lessons.length && updated[activeLessonIdx + 1]?.status === 'locked') {
      updated[activeLessonIdx + 1] = {
        ...updated[activeLessonIdx + 1],
        status: 'in_progress',
      };
    }

    setLessonProgress(updated);

    // Save to localStorage
    const pathKey = selectedSubject ? `subject_${selectedSubject.name}_${studentGrade}` : 'unknown';
    saveFlowProgress(pathKey, updated);

    // Try to save to backend
    if (user) {
      client.entities['student_path_progress'].create({
        data: {
          learning_path_id: 0,
          node_id: lesson.id,
          status: 'completed',
          score: lessonState.score,
          completed_at: new Date().toISOString(),
        },
      }).catch(() => { /* silent - local progress saved */ });
    }

    // Return to lessons view
    setView('lessons');
    setActiveLessonIdx(-1);
  };

  // ─── Calculate overall progress ────────────────────────────────────────

  const completedCount = lessonProgress.filter(p => p.status === 'completed').length;
  const overallProgress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const totalXp = completedCount * 10;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Subjects View
  // ═══════════════════════════════════════════════════════════════════════

  if (view === 'subjects') {
    // Filter subjects that have cognitive templates
    const subjectsWithTemplates = availableSubjects.filter(s =>
      hasSubjectTemplate(s.name, studentGrade)
    );

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 p-4 max-w-4xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              رحلة التعلم
            </h1>
            <p className="text-sm text-gray-500 font-tajawal mt-1">
              {OMAN_GRADES[studentGrade - 1]?.name} • اختر مادة لبدء الدرس
            </p>
          </div>
          <button
            onClick={() => navigate('/student')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-tajawal"
          >
            الرئيسية
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* XP Summary */}
        <Card className="mb-6 border-0 shadow-sm bg-gradient-to-l from-amber-50 to-yellow-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-amber-700 font-tajawal">{totalXp} نقطة</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-600 font-tajawal">{completedCount} درس مكتمل</span>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Grid */}
        {subjectsWithTemplates.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-tajawal">لا توجد مواد متاحة لصفك حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {subjectsWithTemplates.map((subject) => (
              <Card
                key={subject.name}
                className="border cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group"
                onClick={() => {
                  setSelectedSubject(subject);
                  loadLessonsForSubject(subject);
                  setView('lessons');
                }}
              >
                <CardContent className="p-5 text-center">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                    {subject.icon}
                  </div>
                  <h3 className="font-bold text-sm text-gray-800 font-tajawal">{subject.name}</h3>
                  <p className="text-xs text-gray-400 font-tajawal mt-1">
                    {hasSubjectTemplate(subject.name, studentGrade) ? 'متاح' : 'قريباً'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Lessons View (Path nodes with progress)
  // ═══════════════════════════════════════════════════════════════════════

  if (view === 'lessons') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 p-4 max-w-4xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
              {selectedSubject?.icon}
              {selectedSubject?.name}
            </h1>
            <p className="text-sm text-gray-500 font-tajawal mt-1">
              {OMAN_GRADES[studentGrade - 1]?.name} • {lessons.length} دروس
            </p>
          </div>
          <button
            onClick={() => { setView('subjects'); setSelectedSubject(null); setLessons([]); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-tajawal"
          >
            المواد
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Overall Progress */}
        <Card className="mb-6 border-0 shadow-sm bg-gradient-to-l from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-tajawal text-gray-600">تقدمك</span>
              <span className="text-sm font-bold text-blue-700">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-tajawal">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                {completedCount} مكتمل
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" />
                {totalXp} نقطة
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Timeline */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 font-tajawal">جاري التحميل...</div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, idx) => {
              const progress = lessonProgress[idx];
              const isCompleted = progress?.status === 'completed';
              const isActive = progress?.status === 'in_progress';
              const isLocked = progress?.status === 'locked';

              return (
                <Card
                  key={lesson.id}
                  className={`border transition-all ${
                    isCompleted ? 'border-green-200 bg-green-50/50' :
                    isActive ? 'border-blue-200 bg-blue-50/30 shadow-sm' :
                    'border-gray-200 opacity-60'
                  } ${!isLocked ? 'cursor-pointer hover:shadow-md' : ''}`}
                  onClick={() => !isLocked && startLesson(idx)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Step number / status icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCompleted ? 'bg-green-100 text-green-700' :
                      isActive ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : isActive ? (
                        <span>{idx + 1}</span>
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-tajawal ${
                          isCompleted ? 'text-green-700' :
                          isActive ? 'text-blue-700' :
                          'text-gray-500'
                        }`}>
                          {lesson.title}
                        </span>
                        {lesson.node_type === 'assessment' && (
                          <Badge className="text-[10px] bg-purple-100 text-purple-600">تقييم</Badge>
                        )}
                      </div>
                      {lesson.duration_minutes && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-tajawal">
                          <Clock className="w-3 h-3" />
                          {lesson.duration_minutes} دقيقة
                        </p>
                      )}
                      {isCompleted && progress?.score != null && (
                        <p className="text-xs text-green-600 mt-1 font-tajawal">
                          النتيجة: {progress.score}%
                        </p>
                      )}
                    </div>

                    {/* Action indicator */}
                    <div>
                      {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {isActive && (
                        <div className="px-3 py-1 bg-blue-100 rounded-full">
                          <span className="text-xs text-blue-700 font-tajawal font-bold">ابدأ</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Learning View (Active lesson phases)
  // ═══════════════════════════════════════════════════════════════════════

  const activeLesson = lessons[activeLessonIdx];
  const { phase, interactionIdx, interactions, score } = lessonState;

  // Phase progress calculation
  const phases: LessonPhase[] = ['explanation', 'guided_example', 'practice', 'assessment'];
  const phaseIdx = phases.indexOf(phase === 'remediation' ? 'practice' : phase === 'complete' ? 'assessment' : phase);
  const phaseProgress = ((phaseIdx + 1) / phases.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 p-4 max-w-3xl mx-auto" dir="rtl">
      {/* Header with phase progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { setView('lessons'); setActiveLessonIdx(-1); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-tajawal"
          >
            <ArrowRight className="w-4 h-4" />
            الدروس
          </button>
          <Badge className="bg-blue-100 text-blue-700 text-xs font-tajawal">
            {activeLesson?.title}
          </Badge>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center gap-1 mb-2">
          {phases.map((p, i) => (
            <div key={p} className="flex-1 flex items-center gap-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < phaseIdx ? 'bg-green-400' :
                i === phaseIdx ? 'bg-blue-500' :
                'bg-gray-200'
              }`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 font-tajawal px-1">
          <span className={phaseIdx >= 0 ? 'text-blue-600 font-bold' : ''}>شرح</span>
          <span className={phaseIdx >= 1 ? 'text-blue-600 font-bold' : ''}>مثال</span>
          <span className={phaseIdx >= 2 ? 'text-blue-600 font-bold' : ''}>تمرين</span>
          <span className={phaseIdx >= 3 ? 'text-blue-600 font-bold' : ''}>تقييم</span>
        </div>
      </div>

      {/* ─── EXPLANATION PHASE ─── */}
      {phase === 'explanation' && activeLesson && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 font-tajawal">الشرح</h2>
                  <p className="text-xs text-gray-500 font-tajawal">فهم المفهوم الأساسي</p>
                </div>
              </div>

              {(() => {
                const content = generateExplanationContent(activeLesson.title, selectedSubject?.name || '', studentGrade);
                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 font-tajawal text-center mb-4">
                      {content.title}
                    </h3>
                    {content.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-xl">
                        <span className="text-xl">{step.icon}</span>
                        <p className="text-sm text-gray-700 font-tajawal leading-relaxed">{step.text}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Button
            onClick={advancePhase}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-tajawal py-6 rounded-xl text-base"
          >
            <Lightbulb className="w-5 h-5 ml-2" />
            فهمت! أرني مثالاً
          </Button>
        </div>
      )}

      {/* ─── GUIDED EXAMPLE PHASE ─── */}
      {phase === 'guided_example' && activeLesson && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 font-tajawal">مثال محلول</h2>
                  <p className="text-xs text-gray-500 font-tajawal">تابع الخطوات بعناية</p>
                </div>
              </div>

              {(() => {
                const example = generateGuidedExample(activeLesson.title, selectedSubject?.name || '');
                return (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-gray-700 font-tajawal text-center mb-4">
                      {example.title}
                    </h3>
                    {example.steps.map((step) => (
                      <div key={step.step} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                          {step.step}
                        </div>
                        <span className="text-xl">{step.icon}</span>
                        <p className="text-sm text-gray-700 font-tajawal flex-1">{step.text}</p>
                      </div>
                    ))}
                    <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-sm text-green-700 font-tajawal text-center">
                        💡 {example.hint}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Button
            onClick={advancePhase}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-tajawal py-6 rounded-xl text-base"
          >
            <Pencil className="w-5 h-5 ml-2" />
            جاهز للتمرين!
          </Button>
        </div>
      )}

      {/* ─── PRACTICE PHASE ─── */}
      {phase === 'practice' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-800 font-tajawal">تمرين</h2>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700 text-xs font-tajawal">
              {interactionIdx + 1} / {interactions.length}
            </Badge>
          </div>

          {/* Interaction progress */}
          <Progress value={((interactionIdx + 1) / Math.max(1, interactions.length)) * 100} className="h-2" />

          {/* Current interaction */}
          {interactions[interactionIdx] && (
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-4">
                <div className="text-center mb-3">
                  <span className="text-lg">
                    {INTERACTION_TYPE_EMOJIS[interactions[interactionIdx].interaction_type] || '🎮'}
                  </span>
                  <p className="text-xs text-gray-500 font-tajawal mt-1">
                    {interactions[interactionIdx].title}
                  </p>
                </div>
                <InteractionRenderer
                  interaction={interactions[interactionIdx]}
                  onComplete={handleInteractionComplete}
                  showFeedback={true}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── ASSESSMENT PHASE ─── */}
      {phase === 'assessment' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-gray-800 font-tajawal">تقييم</h2>
            </div>
            <Badge className="bg-purple-100 text-purple-700 text-xs font-tajawal">
              {interactionIdx + 1} / {interactions.length}
            </Badge>
          </div>

          <Progress value={((interactionIdx + 1) / Math.max(1, interactions.length)) * 100} className="h-2" />

          {interactions[interactionIdx] && (
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-4">
                <div className="text-center mb-3">
                  <span className="text-lg">
                    {INTERACTION_TYPE_EMOJIS[interactions[interactionIdx].interaction_type] || '📝'}
                  </span>
                  <p className="text-xs text-gray-500 font-tajawal mt-1">
                    {interactions[interactionIdx].title}
                  </p>
                </div>
                <InteractionRenderer
                  interaction={interactions[interactionIdx]}
                  onComplete={handleInteractionComplete}
                  showFeedback={true}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── REMEDIATION PHASE ─── */}
      {phase === 'remediation' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card className="border-0 shadow-sm bg-amber-50 mb-4">
            <CardContent className="p-4 text-center">
              <RotateCcw className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h2 className="font-bold text-amber-700 font-tajawal">لنراجع معاً!</h2>
              <p className="text-sm text-amber-600 font-tajawal mt-1">
                لا بأس، سنحاول مرة أخرى بطريقة أبسط
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-amber-100 text-amber-700 text-xs font-tajawal">
              مراجعة {interactionIdx + 1} / {interactions.length}
            </Badge>
          </div>

          {interactions[interactionIdx] && (
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-4">
                <InteractionRenderer
                  interaction={interactions[interactionIdx]}
                  onComplete={handleInteractionComplete}
                  showFeedback={true}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── COMPLETE PHASE ─── */}
      {phase === 'complete' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card className="border-0 shadow-lg bg-gradient-to-b from-green-50 to-emerald-50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-800 font-tajawal mb-2">
                أحسنت! 🎉
              </h2>
              <p className="text-sm text-green-600 font-tajawal mb-4">
                أكملت درس: {activeLesson?.title}
              </p>

              {/* Score display */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{score}%</div>
                  <p className="text-xs text-gray-500 font-tajawal">النتيجة</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">+10</div>
                  <p className="text-xs text-gray-500 font-tajawal">نقاط</p>
                </div>
              </div>

              {/* Stars based on score */}
              <div className="flex justify-center gap-1 mb-6">
                {[1, 2, 3].map(star => (
                  <Star
                    key={star}
                    className={`w-8 h-8 ${
                      score >= star * 33 ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={completeLesson}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-tajawal py-5 rounded-xl text-base"
              >
                <Sparkles className="w-5 h-5 ml-2" />
                متابعة
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}