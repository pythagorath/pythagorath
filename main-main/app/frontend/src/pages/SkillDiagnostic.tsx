// SkillDiagnostic - STABILIZED for pilot
// Session recovery, progress auto-save, crash prevention, monitoring
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import QuestionVisual from '@/components/visuals/QuestionVisuals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ArrowRight, Brain, Trophy, RotateCcw, Lightbulb, Star } from 'lucide-react';
import { toast } from 'sonner';
import { skills, questions, type Question, type StudentSkillProgress, getDemoProgress } from '@/data/mathSkillsData';
import { updateProgress, calculateMastery, calculatePoints } from '@/lib/masteryEngine';
import { monitorEvent, detectMasteryAnomaly, safeSave, safeLoad } from '@/lib/persistenceManager';

type Mode = 'select' | 'quiz' | 'results';

// Session recovery key
const SESSION_RECOVERY_KEY = 'diagnostic_session_recovery';

interface RecoverableSession {
  mode: Mode;
  quizQuestions: Question[];
  answers: { questionId: string; correct: boolean }[];
  currentQuestionIndex: number;
  quizType: 'diagnostic' | 'training' | 'mastery';
  selectedSkillId: string | null;
  timestamp: number;
}

export default function SkillDiagnostic() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gradeParam = parseInt(searchParams.get('grade') || '1') as 1 | 2;
  const semesterParam = parseInt(searchParams.get('semester') || '1') as 1 | 2;
  const skillParam = searchParams.get('skill');

  const [mode, setMode] = useState<Mode>('select');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(skillParam);
  const [quizType, setQuizType] = useState<'diagnostic' | 'training' | 'mastery'>('diagnostic');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<StudentSkillProgress[]>([]);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());

  // Load progress with recovery
  useEffect(() => {
    const { data: savedProgress } = safeLoad<StudentSkillProgress[]>('skillsEngineProgress', []);
    if (savedProgress && savedProgress.length > 0) {
      setProgress(savedProgress);
    } else {
      const demo = getDemoProgress();
      setProgress(demo);
    }

    // Check for interrupted session
    const { data: recoveryData } = safeLoad<RecoverableSession | null>(SESSION_RECOVERY_KEY, null);
    if (recoveryData && Date.now() - recoveryData.timestamp < 30 * 60 * 1000) {
      // Session is less than 30 minutes old
      setShowRecoveryPrompt(true);
    }
  }, []);

  useEffect(() => {
    if (skillParam) {
      setSelectedSkillId(skillParam);
    }
  }, [skillParam]);

  // Auto-save session state during quiz for recovery
  useEffect(() => {
    if (mode === 'quiz' && quizQuestions.length > 0) {
      const sessionData: RecoverableSession = {
        mode,
        quizQuestions,
        answers,
        currentQuestionIndex,
        quizType,
        selectedSkillId,
        timestamp: Date.now(),
      };
      safeSave(SESSION_RECOVERY_KEY, sessionData);
    }
  }, [mode, answers, currentQuestionIndex, quizQuestions, quizType, selectedSkillId]);

  // Clear recovery data when quiz completes
  useEffect(() => {
    if (mode === 'results' || mode === 'select') {
      localStorage.removeItem(SESSION_RECOVERY_KEY);
      localStorage.removeItem(SESSION_RECOVERY_KEY + '_backup');
    }
  }, [mode]);

  const recoverSession = () => {
    const { data } = safeLoad<RecoverableSession | null>(SESSION_RECOVERY_KEY, null);
    if (data) {
      setMode(data.mode);
      setQuizQuestions(data.quizQuestions);
      setAnswers(data.answers);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setQuizType(data.quizType);
      setSelectedSkillId(data.selectedSkillId);
      monitorEvent('session_recovered', { questionsAnswered: data.answers.length });
      toast.success('تم استعادة جلستك السابقة!');
    }
    setShowRecoveryPrompt(false);
  };

  const dismissRecovery = () => {
    localStorage.removeItem(SESSION_RECOVERY_KEY);
    localStorage.removeItem(SESSION_RECOVERY_KEY + '_backup');
    setShowRecoveryPrompt(false);
  };

  const filteredSkills = skills.filter(
    s => s.grade === gradeParam && s.semester === semesterParam
  );

  const startQuiz = (type: 'diagnostic' | 'training' | 'mastery', skillId?: string) => {
    setQuizType(type);
    let selectedQuestions: Question[] = [];

    if (type === 'diagnostic') {
      // Diagnostic: pick 1-2 questions per skill in this grade/semester
      const gradeQuestions = questions.filter(q => q.grade === gradeParam && q.semester === semesterParam);
      const skillIds = [...new Set(gradeQuestions.map(q => q.skillId))];
      skillIds.forEach(sid => {
        const skillQs = gradeQuestions.filter(q => q.skillId === sid);
        selectedQuestions.push(skillQs[0]);
        if (skillQs.length > 1) selectedQuestions.push(skillQs[1]);
      });
    } else {
      // Training or Mastery: questions for specific skill
      const targetSkill = skillId || selectedSkillId;
      selectedQuestions = questions.filter(q => q.skillId === targetSkill);
      if (type === 'mastery') {
        // For mastery test, include harder questions if available
        selectedQuestions = selectedQuestions.sort((a, b) => {
          const order = { easy: 0, medium: 1, hard: 2 };
          return order[a.difficulty] - order[b.difficulty];
        });
      }
    }

    // Shuffle questions
    selectedQuestions = selectedQuestions.sort(() => Math.random() - 0.5).slice(0, 10);

    setQuizQuestions(selectedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
    setPointsEarned(0);
    setMode('quiz');
  };

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    const currentQ = quizQuestions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQ.correctAnswer;
    setAnswers(prev => [...prev, { questionId: currentQ.id, correct: isCorrect }]);

    if (isCorrect) {
      toast.success('إجابة صحيحة! 🎉');
    } else {
      toast.error('إجابة خاطئة');
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz finished - calculate results
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const correctCount = answers.length > 0
      ? answers.filter(a => a.correct).length + (selectedAnswer === quizQuestions[currentQuestionIndex]?.correctAnswer ? 1 : 0)
      : (selectedAnswer === quizQuestions[currentQuestionIndex]?.correctAnswer ? 1 : 0);

    const totalQ = quizQuestions.length;
    const score = Math.round((correctCount / totalQ) * 100);

    // Update progress for each skill
    const updatedProgress = [...progress];
    const skillsInQuiz = [...new Set(quizQuestions.map(q => q.skillId))];

    let totalPoints = 0;

    skillsInQuiz.forEach(sid => {
      const skillQuestions = quizQuestions.filter(q => q.skillId === sid);
      const allAnswers = [...answers];
      // Include the last answer
      if (selectedAnswer !== null) {
        const lastQ = quizQuestions[currentQuestionIndex];
        if (lastQ.skillId === sid) {
          allAnswers.push({ questionId: lastQ.id, correct: selectedAnswer === lastQ.correctAnswer });
        }
      }
      const skillAnswers = allAnswers.filter(a =>
        skillQuestions.some(q => q.id === a.questionId)
      );
      const skillCorrect = skillAnswers.filter(a => a.correct).length;
      const skillTotal = skillAnswers.length || 1;

      const idx = updatedProgress.findIndex(p => p.skillId === sid);
      if (idx >= 0) {
        const oldMastery = calculateMastery(updatedProgress[idx]).percentage;
        const oldStatus = updatedProgress[idx].status;
        updatedProgress[idx] = updateProgress(updatedProgress[idx], skillCorrect, skillTotal);
        const newMastery = calculateMastery(updatedProgress[idx]).percentage;
        const newStatus = updatedProgress[idx].status;

        // Detect anomalous mastery jumps
        detectMasteryAnomaly(sid, oldMastery, newMastery);

        // Calculate points
        if (quizType === 'training') totalPoints += calculatePoints('training');
        if (quizType === 'mastery' && score >= 70) totalPoints += calculatePoints('quiz_pass');
        if (newStatus === 'mastered' && oldStatus !== 'mastered') totalPoints += calculatePoints('mastery');
      }
    });

    setProgress(updatedProgress);
    setPointsEarned(totalPoints);

    // Safe save with persistence manager
    safeSave('skillsEngineProgress', updatedProgress);

    // Add points to existing points system
    const existingPoints = parseInt(localStorage.getItem('totalPoints') || '0');
    safeSave('totalPoints', existingPoints + totalPoints);

    // Monitor session completion
    const sessionDuration = Date.now() - sessionStartRef.current;
    monitorEvent('quiz_completed', {
      quizType,
      score,
      questionsTotal: totalQ,
      correctCount,
      durationMs: sessionDuration,
      skillsCount: skillsInQuiz.length,
    });

    // Clear recovery data
    localStorage.removeItem(SESSION_RECOVERY_KEY);
    localStorage.removeItem(SESSION_RECOVERY_KEY + '_backup');

    setMode('results');
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const totalCorrect = answers.filter(a => a.correct).length;

  const resultsScore = useMemo(() => {
    if (mode !== 'results') return 0;
    const finalAnswers = [...answers];
    if (selectedAnswer !== null && currentQuestion) {
      finalAnswers.push({ questionId: currentQuestion.id, correct: selectedAnswer === currentQuestion.correctAnswer });
    }
    const correct = finalAnswers.filter(a => a.correct).length;
    return Math.round((correct / quizQuestions.length) * 100);
  }, [mode, answers, selectedAnswer, currentQuestion, quizQuestions.length]);

  if (mode === 'select') {
    return (
      <Layout>
        <div className="p-4 md:p-6 space-y-6" dir="rtl">
          {/* Session Recovery Prompt */}
          {showRecoveryPrompt && (
            <Card className="border-blue-300 bg-blue-50 shadow-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-blue-900 font-tajawal text-sm">لديك جلسة سابقة غير مكتملة</p>
                  <p className="text-blue-700 text-xs font-tajawal">هل تريد استكمالها؟</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={recoverSession} className="text-xs">
                    استكمال
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissRecovery} className="text-xs">
                    تجاهل
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                <Brain className="w-7 h-7 text-purple-600" />
                {quizType === 'diagnostic' ? 'اختبار تشخيصي' : 'تدريب المهارات'}
              </h1>
              <p className="text-gray-600">الصف {gradeParam === 1 ? 'الأول' : 'الثاني'} - الفصل {semesterParam === 1 ? 'الأول' : 'الثاني'}</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/skills-engine')}>
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة
            </Button>
          </div>

          {/* Quick Diagnostic */}
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-2">🧪 اختبار تشخيصي شامل</h2>
              <p className="text-indigo-100 mb-4">
                أجب على أسئلة متنوعة لاكتشاف مستواك في جميع مهارات هذا الفصل
              </p>
              <Button variant="secondary" onClick={() => startQuiz('diagnostic')}>
                ابدأ الاختبار التشخيصي
              </Button>
            </CardContent>
          </Card>

          {/* Individual Skill Practice */}
          <h2 className="text-lg font-bold text-gray-800">أو اختر مهارة للتدريب:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSkills.map(skill => {
              const sp = progress.find(p => p.skillId === skill.id);
              const mastery = sp ? calculateMastery(sp) : { percentage: 0, status: 'not_started' as const, label: 'لم يبدأ', color: 'gray' };
              const hasQuestions = questions.some(q => q.skillId === skill.id);

              return (
                <Card key={skill.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-800">{skill.name}</h3>
                        <p className="text-xs text-gray-500">{skill.domain} • {skill.id}</p>
                      </div>
                      <Badge className={`text-xs ${mastery.status === 'mastered' ? 'bg-green-100 text-green-700' : mastery.status === 'good' ? 'bg-blue-100 text-blue-700' : mastery.status === 'developing' ? 'bg-yellow-100 text-yellow-700' : mastery.status === 'needs_practice' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {mastery.label}
                      </Badge>
                    </div>
                    <Progress value={mastery.percentage} className="h-2 mb-3" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasQuestions}
                        onClick={() => { setSelectedSkillId(skill.id); startQuiz('training', skill.id); }}
                        className="flex-1 text-xs"
                      >
                        تدريب
                      </Button>
                      <Button
                        size="sm"
                        disabled={!hasQuestions}
                        onClick={() => { setSelectedSkillId(skill.id); startQuiz('mastery', skill.id); }}
                        className="flex-1 text-xs"
                      >
                        اختبار إتقان
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  if (mode === 'quiz' && currentQuestion) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6" dir="rtl">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>السؤال {currentQuestionIndex + 1} من {quizQuestions.length}</span>
              <span>{totalCorrect} إجابة صحيحة</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / quizQuestions.length) * 100} className="h-3" />
          </div>

          {/* Skill Badge */}
          <Badge variant="outline" className="text-xs">
            {skills.find(s => s.id === currentQuestion.skillId)?.name} • {currentQuestion.difficulty === 'easy' ? 'سهل' : currentQuestion.difficulty === 'medium' ? 'متوسط' : 'صعب'}
          </Badge>

          {/* Question */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 leading-relaxed">
                {currentQuestion.questionText}
              </h2>

              {/* Visual Component */}
              {currentQuestion.visualType && currentQuestion.visualData && (
                <QuestionVisual
                  visualType={currentQuestion.visualType}
                  visualData={currentQuestion.visualData}
                />
              )}

              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  let btnClass = 'w-full text-right p-4 rounded-lg border-2 transition-all text-base ';
                  if (selectedAnswer === null) {
                    btnClass += 'border-gray-200 hover:border-blue-400 hover:bg-blue-50';
                  } else if (idx === currentQuestion.correctAnswer) {
                    btnClass += 'border-green-500 bg-green-50 text-green-800';
                  } else if (idx === selectedAnswer && idx !== currentQuestion.correctAnswer) {
                    btnClass += 'border-red-500 bg-red-50 text-red-800';
                  } else {
                    btnClass += 'border-gray-200 opacity-50';
                  }

                  return (
                    <button
                      key={idx}
                      className={btnClass}
                      onClick={() => handleAnswer(idx)}
                      disabled={selectedAnswer !== null}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">
                          {['أ', 'ب', 'ج', 'د'][idx]}
                        </span>
                        <span>{option}</span>
                        {selectedAnswer !== null && idx === currentQuestion.correctAnswer && (
                          <CheckCircle className="w-5 h-5 text-green-600 mr-auto" />
                        )}
                        {selectedAnswer === idx && idx !== currentQuestion.correctAnswer && (
                          <XCircle className="w-5 h-5 text-red-600 mr-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">التوضيح:</p>
                      <p className="text-blue-700 text-sm mt-1">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Button */}
          {selectedAnswer !== null && (
            <Button onClick={nextQuestion} className="w-full" size="lg">
              {currentQuestionIndex < quizQuestions.length - 1 ? 'السؤال التالي' : 'عرض النتائج'}
            </Button>
          )}
        </div>
      </Layout>
    );
  }

  if (mode === 'results') {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6" dir="rtl">
          {/* Results Header */}
          <Card className={`${resultsScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : resultsScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-600' : 'bg-gradient-to-r from-red-500 to-rose-600'} text-white`}>
            <CardContent className="p-6 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">
                {resultsScore >= 90 ? '🌟 ممتاز!' : resultsScore >= 70 ? '👏 أحسنت!' : resultsScore >= 40 ? '💪 استمر بالتدريب' : '📚 تحتاج مراجعة'}
              </h2>
              <p className="text-4xl font-bold mb-2">{resultsScore}%</p>
              <p className="opacity-90">
                {answers.filter(a => a.correct).length + (selectedAnswer === currentQuestion?.correctAnswer ? 1 : 0)} من {quizQuestions.length} إجابة صحيحة
              </p>
            </CardContent>
          </Card>

          {/* Points Earned */}
          {pointsEarned > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Star className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="font-bold text-amber-800">+{pointsEarned} نقطة!</p>
                  <p className="text-sm text-amber-600">تمت إضافتها لرصيدك</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skill Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>تفصيل المهارات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...new Set(quizQuestions.map(q => q.skillId))].map(sid => {
                  const skill = skills.find(s => s.id === sid);
                  const sp = progress.find(p => p.skillId === sid);
                  const mastery = sp ? calculateMastery(sp) : { percentage: 0, status: 'not_started' as const, label: 'لم يبدأ', color: 'gray' };

                  return (
                    <div key={sid} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{skill?.name}</p>
                        <Progress value={mastery.percentage} className="h-2 mt-1" />
                      </div>
                      <Badge className={`text-xs ${mastery.status === 'mastered' ? 'bg-green-100 text-green-700' : mastery.status === 'good' ? 'bg-blue-100 text-blue-700' : mastery.status === 'developing' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {mastery.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/skills-engine')}
              className="flex-1"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للخريطة
            </Button>
            <Button
              onClick={() => {
                setMode('select');
                setAnswers([]);
                setCurrentQuestionIndex(0);
                setSelectedAnswer(null);
              }}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              تدريب آخر
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}