import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { client } from '@/lib/api';
import { trackWrongAnswer, checkWeakness } from '@/lib/studentStore';
import { getAdaptiveDifficulty, getMasteryLabelDetailed } from '@/lib/skillMastery';
import Layout from '@/components/Layout';
import QuestionVisual from '@/components/visuals/QuestionVisuals';
import type { VisualType, VisualData } from '@/components/visuals/QuestionVisuals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ArrowLeft, Trophy, Lightbulb, Map } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  skill: string;
  visualType?: VisualType;
  visualData?: VisualData;
}

interface Quiz {
  id: number;
  title: string;
  lesson_id: number;
  subject_id: number;
  grade: string;
  difficulty: string;
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);

  const demoQuestions: Question[] = [
    { id: 1, quiz_id: 1, question_text: 'كم عدد التفاحات؟', option_a: '2', option_b: '3', option_c: '4', option_d: '5', correct_answer: 'c', explanation: 'نعد التفاحات: واحد، اثنان، ثلاثة، أربعة. الإجابة هي 4', skill: 'العد والأرقام', visualType: 'counting-objects', visualData: { emoji: '🍎', count: 4, arrangement: 'line' } },
    { id: 2, quiz_id: 1, question_text: 'ما العدد الذي يأتي بعد 6 على خط الأعداد؟', option_a: '5', option_b: '7', option_c: '8', option_d: '9', correct_answer: 'b', explanation: 'العدد الذي يأتي بعد 6 هو 7', skill: 'ترتيب الأعداد', visualType: 'number-line', visualData: { start: 1, end: 10, highlight: [6, 7] } },
    { id: 3, quiz_id: 1, question_text: 'ما هو محيط مربع طول ضلعه 5 سم؟', option_a: '25 سم', option_b: '10 سم', option_c: '20 سم', option_d: '15 سم', correct_answer: 'c', explanation: 'محيط المربع = 4 × طول الضلع = 4 × 5 = 20 سم', skill: 'الهندسة', visualType: 'shapes', visualData: { shape: 'square', count: 1, color: '#6366F1' } },
    { id: 4, quiz_id: 1, question_text: 'الساعة تشير إلى الوقت التالي. كم الساعة؟', option_a: 'الساعة 2', option_b: 'الساعة 3', option_c: 'الساعة 4', option_d: 'الساعة 5', correct_answer: 'b', explanation: 'عندما يشير عقرب الساعات إلى 3 وعقرب الدقائق إلى 12 نقول: الساعة الثالثة', skill: 'الوقت', visualType: 'analog-clock', visualData: { hours: 3, minutes: 0 } },
    { id: 5, quiz_id: 1, question_text: 'أكمل النمط: ما الشكل التالي؟', option_a: 'مثلث', option_b: 'دائرة', option_c: 'مربع', option_d: 'مستطيل', correct_answer: 'b', explanation: 'النمط يتكرر: دائرة، مربع، دائرة، مربع. إذن التالي هو دائرة', skill: 'الأنماط', visualType: 'pattern', visualData: { items: ['⭕', '⬜', '⭕', '⬜', '⭕', '?'], missingIndex: 5 } },
  ];

  useEffect(() => {
    if (quizId) {
      fetchQuizData();
    }
  }, [user, quizId]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const quizRes = await client.entities.quizzes.get({ id: quizId! });
      setQuiz(quizRes.data);

      const questionsRes = await client.entities.questions.query({
        query: { quiz_id: parseInt(quizId!) },
        limit: 50,
      });
      const fetchedQuestions = questionsRes.data?.items || [];
      setQuestions(fetchedQuestions.length > 0 ? fetchedQuestions : demoQuestions);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      // Fallback to demo
      setQuiz({ id: parseInt(quizId || '1'), title: 'اختبار تجريبي', lesson_id: 1, subject_id: 1, grade: 'الصف السابع', difficulty: 'easy' });
      setQuestions(demoQuestions);
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (questionId: number, answer: string) => {
    if (showExplanation) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setShowExplanation(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      calculateScore();
    }
  };

  const calculateScore = async () => {
    let correct = 0;
    const detectedWeakSkills: string[] = [];

    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correct++;
      } else {
        // Track wrong answer by skill
        trackWrongAnswer(q.skill);
        if (checkWeakness(q.skill) && !detectedWeakSkills.includes(q.skill)) {
          detectedWeakSkills.push(q.skill);
        }
      }
    });

    // Alert about repeated weaknesses
    if (detectedWeakSkills.length > 0) {
      toast.warning(
        `⚠️ نقطة ضعف متكررة: ${detectedWeakSkills.join('، ')} - يُنصح بمراجعة هذه المهارات`,
        { duration: 6000 }
      );
    }

    const scorePercent = Math.round((correct / questions.length) * 100);
    setScore(scorePercent);
    setShowResult(true);

    // Save attempt only if logged in
    if (user) {
      try {
        await client.entities.quiz_attempts.create({
          data: {
            quiz_id: parseInt(quizId!),
            score: scorePercent,
            answers: JSON.stringify(answers),
          },
        });

        // Award points based on score
        const pointsEarned = scorePercent >= 80 ? 20 : scorePercent >= 60 ? 15 : scorePercent >= 40 ? 10 : 5;
        await client.entities.point_transactions.create({
          data: {
            points: pointsEarned,
            reason: `إكمال اختبار: ${quiz?.title}`,
            reference_id: parseInt(quizId!),
          },
        });
      } catch (error) {
        console.error('Error saving attempt:', error);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (showResult) {
    // Calculate per-skill performance for this quiz
    const skillPerformance: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q) => {
      if (!q.skill) return;
      if (!skillPerformance[q.skill]) skillPerformance[q.skill] = { correct: 0, total: 0 };
      skillPerformance[q.skill].total += 1;
      if (answers[q.id] === q.correct_answer) {
        skillPerformance[q.skill].correct += 1;
      }
    });

    const skillResults = Object.entries(skillPerformance).map(([skill, data]) => ({
      skill,
      mastery: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total,
    }));

    return (
      <Layout>
        <div className="max-w-lg mx-auto py-12 space-y-6">
          <Card className="border-0 shadow-xl text-center">
            <CardContent className="p-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${score >= 60 ? 'bg-green-100' : 'bg-red-100'}`}>
                {score >= 60 ? (
                  <Trophy className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-500" />
                )}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {score >= 80 ? 'ممتاز! 🎉' : score >= 60 ? 'جيد جداً! 👏' : score >= 40 ? 'جيد، واصل التحسن! 💪' : 'حاول مرة أخرى 📚'}
              </h2>
              <p className="text-gray-600 mb-4">نتيجتك في {quiz?.title}</p>
              <div className="text-5xl font-extrabold text-primary mb-2">{score}%</div>
              <p className="text-gray-500 text-sm mb-6">
                أجبت على {questions.filter((q) => answers[q.id] === q.correct_answer).length} من {questions.length} أسئلة بشكل صحيح
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  <ArrowLeft className="w-4 h-4 ml-2" />
                  العودة
                </Button>
                <Button
                  onClick={() => {
                    setCurrentIndex(0);
                    setAnswers({});
                    setShowResult(false);
                    setShowExplanation(false);
                  }}
                  className="bg-primary text-white"
                >
                  إعادة الاختبار
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Post-quiz skill breakdown */}
          {skillResults.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  تحليل المهارات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {skillResults.map((sr) => {
                  const masteryInfo = getMasteryLabelDetailed(sr.mastery);
                  const difficulty = getAdaptiveDifficulty(sr.mastery);
                  return (
                    <div key={sr.skill} className="p-3 rounded-lg border bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{masteryInfo.emoji}</span>
                          <span className="font-medium text-sm">{sr.skill}</span>
                        </div>
                        <Badge className={`${masteryInfo.color} text-xs`}>{masteryInfo.label}</Badge>
                      </div>
                      <Progress value={sr.mastery} className="h-2 mb-1" />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{sr.correct}/{sr.total} صحيحة</span>
                        <span>المستوى التالي: {difficulty === 'easy' ? 'سهل' : difficulty === 'medium' ? 'متوسط' : 'صعب'}</span>
                      </div>
                      {sr.mastery < 50 && (
                        <p className="text-xs text-red-600 mt-1">⚠️ يُنصح بمراجعة هذه المهارة قبل المتابعة</p>
                      )}
                    </div>
                  );
                })}
                <Button
                  onClick={() => navigate('/skills-map')}
                  variant="outline"
                  className="w-full mt-2"
                >
                  <Map className="w-4 h-4 ml-2" />
                  عرض خريطة المهارات الكاملة
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-gray-600">لا توجد أسئلة في هذا الاختبار</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">العودة</Button>
        </div>
      </Layout>
    );
  }

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const options = [
    { key: 'a', text: currentQuestion.option_a },
    { key: 'b', text: currentQuestion.option_b },
    { key: 'c', text: currentQuestion.option_c },
    { key: 'd', text: currentQuestion.option_d },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        {/* Quiz Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">{quiz?.title}</h2>
            <Badge variant="secondary">
              {currentIndex + 1} / {questions.length}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl leading-relaxed">{currentQuestion.question_text}</CardTitle>
            <Badge variant="outline" className="w-fit">{currentQuestion.skill}</Badge>
          </CardHeader>
          <CardContent>
            {/* Visual Component */}
            {currentQuestion.visualType && currentQuestion.visualData && (
              <QuestionVisual
                visualType={currentQuestion.visualType}
                visualData={currentQuestion.visualData}
              />
            )}
            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.key;
                const isCorrect = option.key === currentQuestion.correct_answer;
                const showFeedback = showExplanation;

                let bgClass = 'bg-gray-50 hover:bg-blue-50 border-gray-200';
                if (showFeedback && isCorrect) {
                  bgClass = 'bg-green-50 border-green-500';
                } else if (showFeedback && isSelected && !isCorrect) {
                  bgClass = 'bg-red-50 border-red-500';
                } else if (isSelected) {
                  bgClass = 'bg-blue-50 border-primary';
                }

                return (
                  <button
                    key={option.key}
                    onClick={() => selectAnswer(currentQuestion.id, option.key)}
                    className={`w-full p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between ${bgClass}`}
                    disabled={showExplanation}
                  >
                    <span className="font-medium">{option.text}</span>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-sm font-bold">
                        {option.key.toUpperCase()}
                      </span>
                      {showFeedback && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {showFeedback && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-bold text-blue-800 mb-1">التوضيح:</p>
                <p className="text-sm text-blue-700">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Next Button */}
            {showExplanation && (
              <Button onClick={nextQuestion} className="w-full mt-4 bg-primary text-white">
                {currentIndex < questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة'}
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}