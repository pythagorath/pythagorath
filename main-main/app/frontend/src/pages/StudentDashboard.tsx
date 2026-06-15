// Student Dashboard - STABILIZED for pilot
// Safe data loading, graceful failures, large touch targets, child-friendly
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { client } from '@/lib/api';
import {
  getLevel, getPointsForNextLevel, getStreak, updateStreak,
  getStreakBadge, getMotivationalMessage, getTopWeaknesses,
} from '@/lib/studentStore';
import { monitorEvent, trackRetry } from '@/lib/persistenceManager';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Trophy, Flame, Play, CheckCircle, Star, Zap, Brain, RefreshCw, Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Subject {
  id: number;
  name: string;
  grade: string;
}

interface Lesson {
  id: number;
  title: string;
  subject_id: number;
  grade: string;
  duration_minutes: number;
  order_index: number;
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [savingLesson, setSavingLesson] = useState<number | null>(null);

  const demoSubjects: Subject[] = [
    { id: 1, name: 'الرياضيات', grade: 'الصف الأول' },
    { id: 2, name: 'العلوم', grade: 'الصف الأول' },
    { id: 3, name: 'اللغة العربية', grade: 'الصف الأول' },
  ];

  const demoLessons: Lesson[] = [
    { id: 1, title: 'الأعداد من 1 إلى 10', subject_id: 1, grade: 'الصف الأول', duration_minutes: 10, order_index: 1 },
    { id: 2, title: 'الجمع البسيط', subject_id: 1, grade: 'الصف الأول', duration_minutes: 10, order_index: 2 },
    { id: 3, title: 'الأشكال الهندسية', subject_id: 1, grade: 'الصف الأول', duration_minutes: 10, order_index: 3 },
    { id: 4, title: 'أجزاء الجسم', subject_id: 2, grade: 'الصف الأول', duration_minutes: 10, order_index: 1 },
    { id: 5, title: 'الحروف الهجائية', subject_id: 3, grade: 'الصف الأول', duration_minutes: 10, order_index: 1 },
  ];

  useEffect(() => {
    if (authLoading) return;
    try {
      const currentStreak = updateStreak();
      setStreak(currentStreak);
    } catch {
      setStreak(0);
    }
    fetchData();
  }, [user, authLoading]);

  const fetchData = useCallback(async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      setLoadError(false);

      const [subjectsRes, lessonsRes] = await Promise.all([
        client.entities.subjects.query({ query: {}, limit: 50 }).catch(() => ({ data: { items: [] } })),
        client.entities.lessons.query({ query: {}, sort: 'order_index', limit: 50 }).catch(() => ({ data: { items: [] } })),
      ]);

      const fetchedSubjects = subjectsRes.data?.items || [];
      const fetchedLessons = lessonsRes.data?.items || [];

      setSubjects(fetchedSubjects.length > 0 ? fetchedSubjects : demoSubjects);
      setLessons(fetchedLessons.length > 0 ? fetchedLessons : demoLessons);

      if (user) {
        try {
          const progressRes = await client.entities.student_progress.query({ query: {}, limit: 100 });
          const completed = (progressRes.data?.items || [])
            .filter((p: any) => p.completed)
            .map((p: any) => p.lesson_id);
          setCompletedLessons(completed);
        } catch { /* No progress yet - use empty */ }

        try {
          const pointsRes = await client.entities.student_points.query({ query: {}, limit: 1 });
          if (pointsRes.data?.items?.length > 0) {
            setPoints(pointsRes.data.items[0].points || 0);
          }
        } catch { /* No points yet */ }
      }

      // Monitor slow loads
      const loadTime = Date.now() - startTime;
      if (loadTime > 5000) {
        monitorEvent('slow_dashboard_load', { loadTimeMs: loadTime });
      }
    } catch {
      setSubjects(demoSubjects);
      setLessons(demoLessons);
      setLoadError(true);
      monitorEvent('dashboard_load_failed', { duration: Date.now() - startTime });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markLessonComplete = async (lessonId: number) => {
    // Prevent double-tap
    if (savingLesson === lessonId) return;
    if (trackRetry(`lesson_${lessonId}`)) {
      toast.info('تم حفظ تقدمك بالفعل!');
      return;
    }

    setSavingLesson(lessonId);

    if (!user) {
      toast.info('سجل الدخول لحفظ تقدمك!', { duration: 3000 });
    }

    // Optimistic update
    setCompletedLessons((prev) => [...prev, lessonId]);
    const newPoints = points + 10;
    setPoints(newPoints);
    window.dispatchEvent(new Event('points-updated'));

    if (getLevel(newPoints) > getLevel(points)) {
      toast.success(`🎉 مبروك! وصلت للمستوى ${getLevel(newPoints)}!`, { duration: 4000 });
    } else {
      toast.success('👏 أحسنت! +10 نقاط', { duration: 2000 });
    }

    // Save to backend with retry
    if (user) {
      let saved = false;
      for (let attempt = 0; attempt < 2 && !saved; attempt++) {
        try {
          await client.entities.student_progress.create({
            data: { lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
          });
          await client.entities.point_transactions.create({
            data: { points: 10, reason: 'إكمال درس', reference_id: lessonId },
          });
          saved = true;
        } catch {
          if (attempt === 1) {
            monitorEvent('lesson_save_failed', { lessonId, attempts: 2 });
            // Don't rollback - keep optimistic update, will sync later
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    setSavingLesson(null);
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 font-tajawal">جاري التحميل...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const level = getLevel(points);
  const xpProgress = getPointsForNextLevel(points);
  const streakBadge = getStreakBadge(streak);
  const topWeaknesses = getTopWeaknesses(2);
  const motivationalMsg = getMotivationalMessage(completedLessons.length, streak);

  // Today's mission: next 3 incomplete lessons
  const incompleteLessons = lessons.filter((l) => !completedLessons.includes(l.id));
  const todaysMission = incompleteLessons.slice(0, 3);
  const completedToday = completedLessons.length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 pb-8 px-4">
        {/* Load error banner - non-blocking */}
        {loadError && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-amber-600 text-sm font-tajawal flex-1">
              ⚠️ بعض البيانات قد لا تكون محدّثة
            </span>
            <Button variant="ghost" size="sm" onClick={fetchData} className="shrink-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Greeting - simple and warm */}
        <div className="text-center pt-2">
          <h1 className="text-3xl font-bold text-gray-900 mb-1 font-tajawal">
            مرحباً {user?.name || 'يا بطل'} 👋
          </h1>
          <p className="text-gray-500 text-lg font-tajawal">{motivationalMsg}</p>
        </div>

        {/* Simple progress bar + streak */}
        <Card className="border-0 shadow-sm bg-gradient-to-l from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-gray-800 font-tajawal">المستوى {level}</span>
              </div>
              <div className="flex items-center gap-3">
                {streakBadge && (
                  <Badge className={`bg-gradient-to-r ${streakBadge.color} text-white text-xs px-3 py-1`}>
                    {streakBadge.emoji} {streak} يوم
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Zap className="w-3 h-3 ml-1 text-amber-500" />
                  {points} نقطة
                </Badge>
              </div>
            </div>
            <Progress value={xpProgress.progress} className="h-3 bg-white/60" />
            <p className="text-xs text-gray-500 mt-1 text-center font-tajawal">
              {xpProgress.current} / {xpProgress.needed} للمستوى التالي
            </p>
          </CardContent>
        </Card>

        {/* TODAY'S MISSION - The main focus */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2 font-tajawal">
            <Play className="w-5 h-5 text-primary" />
            مهمة اليوم
          </h2>

          {todaysMission.length === 0 ? (
            <Card className="border-0 shadow-sm bg-green-50">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-green-800 mb-1 font-tajawal">أحسنت! أكملت كل الدروس 🎉</h3>
                <p className="text-green-600 font-tajawal">جرّب اختبار المهارات لتتعلم أكثر</p>
                <Button
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4 h-auto rounded-2xl font-tajawal touch-manipulation"
                  onClick={() => navigate('/skills-engine')}
                >
                  <Brain className="w-5 h-5 ml-2" />
                  اختبار المهارات
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaysMission.map((lesson, index) => {
                const subject = subjects.find((s) => s.id === lesson.subject_id);
                const isSaving = savingLesson === lesson.id;
                return (
                  <Card
                    key={lesson.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate font-tajawal">{lesson.title || lesson.name}</h3>
                        <p className="text-sm text-gray-500 font-tajawal">{subject?.name} • {lesson.duration_minutes || 10} دقائق</p>
                      </div>
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-6 h-14 text-base shrink-0 touch-manipulation active:scale-[0.97] transition-transform min-w-[80px]"
                        onClick={() => markLessonComplete(lesson.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 ml-1" />
                            ابدأ
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats - compact row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <div className="text-2xl font-bold text-blue-700">{completedToday}</div>
              <div className="text-xs text-blue-600 font-tajawal">دروس مكتملة</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-1 text-amber-600" />
              <div className="text-2xl font-bold text-amber-700">{points}</div>
              <div className="text-xs text-amber-600 font-tajawal">نقطة</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-orange-50">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 mx-auto mb-1 text-orange-600" />
              <div className="text-2xl font-bold text-orange-700">{streak}</div>
              <div className="text-xs text-orange-600 font-tajawal">أيام متتالية</div>
            </CardContent>
          </Card>
        </div>

        {/* Skills Practice - single CTA with large touch target */}
        <Card className="border-0 shadow-md bg-gradient-to-l from-purple-500 to-indigo-600 text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1 font-tajawal">🧠 تدريب المهارات</h3>
              <p className="text-purple-100 text-sm font-tajawal">اختبارات تفاعلية مع رسوم بصرية</p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-2xl h-14 px-6 text-base touch-manipulation"
              onClick={() => navigate('/skills-engine')}
            >
              ابدأ
            </Button>
          </CardContent>
        </Card>

        {/* Learning Paths - structured curriculum paths */}
        <Card className="border-0 shadow-md bg-gradient-to-l from-teal-500 to-emerald-600 text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1 font-tajawal">📚 مسارات التعلم</h3>
              <p className="text-teal-100 text-sm font-tajawal">تابع مسار المنهج الدراسي خطوة بخطوة</p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-2xl h-14 px-6 text-base touch-manipulation"
              onClick={() => navigate('/student/learning-paths')}
            >
              <Route className="w-4 h-4 ml-1" />
              ابدأ
            </Button>
          </CardContent>
        </Card>

        {/* Weaknesses - only show if there are any, keep minimal */}
        {topWeaknesses.length > 0 && (
          <Card className="border-0 shadow-sm border-r-4 border-r-amber-400">
            <CardContent className="p-4">
              <h3 className="font-bold text-gray-800 mb-2 text-sm font-tajawal">💡 نصيحة: راجع هذه المهارات</h3>
              <div className="flex flex-wrap gap-2">
                {topWeaknesses.map(({ skill }) => (
                  <Badge key={skill} variant="secondary" className="text-xs bg-amber-50 text-amber-800 border border-amber-200">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}