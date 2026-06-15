// Content Intelligence Sprint - Academic Analytics Mode
// Admin view: weakest skills, most common errors, hardest questions, success rates

import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, AlertTriangle, Brain, TrendingDown, Clock, Target, Zap } from 'lucide-react';
import { skills, getAllSkillsWithPrereqs, getAllQuestions } from '@/data/mathSkillsData';
import type { StudentSkillProgress } from '@/data/mathSkillsData';
import { calculateMasteryV2 } from '@/lib/masteryEngineV2';
import { getAnswerHistory, analyzeErrorPatterns, getHardestQuestions, type ErrorPattern } from '@/lib/errorPatternAnalyzer';
import { getRetentionStats } from '@/lib/retentionEngine';
import { simulateStudent } from '@/lib/masteryEngineV2';

type Tab = 'overview' | 'errors' | 'questions' | 'retention';

export default function AcademicAnalytics() {
  const [selectedGrade, setSelectedGrade] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [simulatedProfile, setSimulatedProfile] = useState<'real' | 'weak' | 'medium' | 'strong'>('real');

  const allSkills = useMemo(() => getAllSkillsWithPrereqs(), []);
  const gradeSkills = useMemo(() => allSkills.filter(s => s.grade === selectedGrade), [allSkills, selectedGrade]);
  const allQuestions = useMemo(() => getAllQuestions(), []);

  // Get progress data
  const progress: StudentSkillProgress[] = useMemo(() => {
    if (simulatedProfile === 'real') {
      const saved = localStorage.getItem('skillsEngineProgress');
      return saved ? JSON.parse(saved) : [];
    }
    return simulateStudent(simulatedProfile, gradeSkills);
  }, [simulatedProfile, gradeSkills]);

  const gradeProgress = useMemo(() =>
    progress.filter(p => gradeSkills.some(s => s.id === p.skillId)),
    [progress, gradeSkills]
  );

  // Answer history
  const answerHistory = useMemo(() => getAnswerHistory(), []);
  const gradeAnswers = useMemo(() =>
    answerHistory.filter(a => gradeSkills.some(s => s.id === a.skillId)),
    [answerHistory, gradeSkills]
  );
  const errorProfile = useMemo(() => analyzeErrorPatterns(gradeAnswers), [gradeAnswers]);
  const hardestQs = useMemo(() => getHardestQuestions(gradeAnswers, 2), [gradeAnswers]);
  const retentionStats = useMemo(() => getRetentionStats(), []);

  // Weakest skills
  const weakestSkills = useMemo(() => {
    return gradeProgress
      .filter(p => p.attempts > 0)
      .map(p => {
        const skill = gradeSkills.find(s => s.id === p.skillId);
        const mastery = calculateMasteryV2(p);
        return { ...p, skill, mastery };
      })
      .filter(p => p.mastery.percentage < 60)
      .sort((a, b) => a.mastery.percentage - b.mastery.percentage)
      .slice(0, 10);
  }, [gradeProgress, gradeSkills]);

  // Success rates by domain
  const domainStats = useMemo(() => {
    const domains: Record<string, { total: number; mastered: number; avgMastery: number; count: number }> = {};

    for (const p of gradeProgress) {
      const skill = gradeSkills.find(s => s.id === p.skillId);
      if (!skill || p.attempts === 0) continue;

      if (!domains[skill.domain]) {
        domains[skill.domain] = { total: 0, mastered: 0, avgMastery: 0, count: 0 };
      }

      const mastery = calculateMasteryV2(p);
      domains[skill.domain].total++;
      domains[skill.domain].count++;
      domains[skill.domain].avgMastery += mastery.percentage;
      if (mastery.status === 'mastered') domains[skill.domain].mastered++;
    }

    return Object.entries(domains)
      .map(([name, stats]) => ({
        name,
        ...stats,
        avgMastery: stats.count > 0 ? Math.round(stats.avgMastery / stats.count) : 0,
      }))
      .sort((a, b) => a.avgMastery - b.avgMastery);
  }, [gradeProgress, gradeSkills]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'errors', label: 'أنماط الأخطاء', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'questions', label: 'أصعب الأسئلة', icon: <Brain className="w-4 h-4" /> },
    { id: 'retention', label: 'الاحتفاظ', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-5 pb-8">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            التحليل الأكاديمي
          </h1>
          <p className="text-gray-500 text-sm mt-1">تحليل معمّق لأداء الطالب</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <Button
              size="sm"
              variant={selectedGrade === 1 ? 'default' : 'ghost'}
              onClick={() => setSelectedGrade(1)}
              className="rounded-lg"
            >
              الصف الأول
            </Button>
            <Button
              size="sm"
              variant={selectedGrade === 2 ? 'default' : 'ghost'}
              onClick={() => setSelectedGrade(2)}
              className="rounded-lg"
            >
              الصف الثاني
            </Button>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['real', 'weak', 'medium', 'strong'] as const).map(profile => (
              <Button
                key={profile}
                size="sm"
                variant={simulatedProfile === profile ? 'default' : 'ghost'}
                onClick={() => setSimulatedProfile(profile)}
                className="rounded-lg text-xs"
              >
                {profile === 'real' ? '📊 حقيقي' : profile === 'weak' ? '🔴 ضعيف' : profile === 'medium' ? '🟡 متوسط' : '🟢 متفوق'}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 overflow-x-auto">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-lg flex items-center gap-1 whitespace-nowrap"
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Target className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <div className="text-xl font-bold text-gray-800">
                    {gradeProgress.filter(p => p.attempts > 0).length}/{gradeSkills.length}
                  </div>
                  <div className="text-xs text-gray-500">مهارات مُختبرة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Zap className="w-5 h-5 mx-auto mb-1 text-green-600" />
                  <div className="text-xl font-bold text-gray-800">
                    {gradeProgress.filter(p => calculateMasteryV2(p).status === 'mastered').length}
                  </div>
                  <div className="text-xs text-gray-500">متقنة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-600" />
                  <div className="text-xl font-bold text-gray-800">{weakestSkills.length}</div>
                  <div className="text-xs text-gray-500">تحتاج تدخل</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <TrendingDown className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                  <div className="text-xl font-bold text-gray-800">{errorProfile.errorRate}%</div>
                  <div className="text-xs text-gray-500">نسبة الخطأ</div>
                </CardContent>
              </Card>
            </div>

            {/* Weakest Skills */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  أضعف المهارات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakestSkills.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات كافية</p>
                ) : (
                  weakestSkills.map(item => (
                    <div key={item.skillId} className="flex items-center gap-3 p-2 rounded-lg bg-red-50/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.skill?.name}</p>
                        <p className="text-xs text-gray-500">{item.attempts} محاولة • {item.skill?.domain}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Progress value={item.mastery.percentage} className="w-16 h-2" />
                        <span className="text-xs font-bold text-red-600 w-8">{item.mastery.percentage}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Domain Success Rates */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  نسب النجاح حسب المجال
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {domainStats.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
                ) : (
                  domainStats.map(domain => (
                    <div key={domain.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{domain.name}</span>
                        <span className="text-xs text-gray-500">
                          {domain.mastered}/{domain.total} متقنة • {domain.avgMastery}%
                        </span>
                      </div>
                      <Progress value={domain.avgMastery} className="h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="space-y-4">
            {/* Error Summary */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ملخص الأخطاء</CardTitle>
              </CardHeader>
              <CardContent>
                {gradeAnswers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">لا توجد إجابات مسجلة بعد. ابدأ بحل التمارين لتظهر التحليلات.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-lg font-bold">{errorProfile.totalAnswers}</div>
                        <div className="text-xs text-gray-500">إجابة</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-xl">
                        <div className="text-lg font-bold text-red-600">{errorProfile.errorRate}%</div>
                        <div className="text-xs text-gray-500">نسبة الخطأ</div>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl">
                        <div className="text-lg font-bold text-amber-600">{errorProfile.rushRate}%</div>
                        <div className="text-xs text-gray-500">إجابات متسرعة</div>
                      </div>
                    </div>

                    {/* Error Patterns */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-gray-700">أنماط الأخطاء الشائعة</h4>
                      {errorProfile.patterns.length === 0 ? (
                        <p className="text-sm text-gray-400">لا توجد أنماط واضحة</p>
                      ) : (
                        errorProfile.patterns.map(pattern => (
                          <div key={pattern.errorType} className="p-3 bg-white border rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-gray-800">{pattern.label}</span>
                              <Badge variant="secondary" className="text-xs">{pattern.count} مرة ({pattern.percentage}%)</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{pattern.description}</p>
                            <p className="text-xs text-blue-600">💡 {pattern.recommendation}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Avg Response Time */}
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          متوسط وقت الإجابة: {(errorProfile.avgResponseTime / 1000).toFixed(1)} ثانية
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  أصعب الأسئلة (أقل نسبة نجاح)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hardestQs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">تحتاج 3 محاولات على الأقل لكل سؤال لتظهر الإحصائيات</p>
                ) : (
                  <div className="space-y-3">
                    {hardestQs.map((q, idx) => {
                      const question = allQuestions.find(aq => aq.id === q.questionId);
                      const skill = gradeSkills.find(s => s.id === question?.skillId);
                      return (
                        <div key={q.questionId} className="p-3 border rounded-xl">
                          <div className="flex items-start gap-2">
                            <span className="text-lg font-bold text-red-400 shrink-0">#{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 leading-relaxed">
                                {question?.questionText || q.questionId}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">{skill?.name}</Badge>
                                <span className="text-xs text-gray-500">{q.attempts} محاولة</span>
                                <span className="text-xs text-red-600 font-bold">{q.successRate}% نجاح</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Question Bank Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">إحصائيات بنك الأسئلة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-indigo-50 rounded-xl text-center">
                    <div className="text-xl font-bold text-indigo-700">{allQuestions.length}</div>
                    <div className="text-xs text-indigo-600">إجمالي الأسئلة</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl text-center">
                    <div className="text-xl font-bold text-purple-700">
                      {allQuestions.filter(q => gradeSkills.some(s => s.id === q.skillId)).length}
                    </div>
                    <div className="text-xs text-purple-600">أسئلة الصف {selectedGrade}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl text-center">
                    <div className="text-xl font-bold text-green-700">
                      {allQuestions.filter(q => q.difficulty === 'easy' && gradeSkills.some(s => s.id === q.skillId)).length}
                    </div>
                    <div className="text-xs text-green-600">سهل</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl text-center">
                    <div className="text-xl font-bold text-amber-700">
                      {allQuestions.filter(q => q.difficulty === 'hard' && gradeSkills.some(s => s.id === q.skillId)).length}
                    </div>
                    <div className="text-xs text-amber-600">صعب</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'retention' && (
          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-500" />
                  محرك الاحتفاظ بالمعلومة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-teal-50 rounded-xl text-center">
                    <div className="text-xl font-bold text-teal-700">{retentionStats.totalTracked}</div>
                    <div className="text-xs text-teal-600">مهارات مُتتبعة</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl text-center">
                    <div className="text-xl font-bold text-green-700">{retentionStats.wellRetained}</div>
                    <div className="text-xs text-green-600">محتفظ بها</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl text-center">
                    <div className="text-xl font-bold text-red-700">{retentionStats.atRisk}</div>
                    <div className="text-xs text-red-600">معرّضة للنسيان</div>
                  </div>
                </div>

                {retentionStats.totalTracked === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">لم يتم إتقان أي مهارة بعد.</p>
                    <p className="text-xs text-gray-400 mt-1">عند إتقان مهارة، يبدأ تتبع الاحتفاظ تلقائياً</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">متوسط الاحتفاظ</span>
                      <span className="font-bold text-gray-800">{retentionStats.avgRetention}%</span>
                    </div>
                    <Progress value={retentionStats.avgRetention} className="h-3" />

                    {retentionStats.dueCount > 0 && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm font-medium text-amber-800">
                          ⏰ {retentionStats.dueCount} مهارة تحتاج مراجعة اليوم
                        </p>
                      </div>
                    )}
                    {retentionStats.overdueCount > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm font-medium text-red-800">
                          ⚠️ {retentionStats.overdueCount} مهارة متأخرة عن المراجعة
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Spaced Review Explanation */}
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <h4 className="text-xs font-bold text-gray-600 mb-2">📖 كيف يعمل نظام التكرار المتباعد؟</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-white rounded">يوم 1</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-white rounded">يوم 3</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-white rounded">أسبوع</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-white rounded">أسبوعين</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-white rounded">شهر</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}