// Learning Intelligence Sprint - Teacher Intelligence Layer
// Internal admin view showing: top misconceptions, highest decay, weakest questions,
// prerequisite gaps, mastery decay patterns

import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain, TrendingDown, AlertTriangle, Target, Zap,
  BookOpen, BarChart3, Shield, Clock, Activity
} from 'lucide-react';
import { skills, getAllSkillsWithPrereqs, getAllQuestions, type StudentSkillProgress } from '@/data/mathSkillsData';
import { getMisconceptionSummary, getPrerequisiteGaps, misconceptionProfiles } from '@/lib/misconceptionMapping';
import { getHighestDecaySkills, getDecayPatterns, getAllConfidenceScores, getCriticalDecaySkills } from '@/lib/masteryDecaySystem';
import { getWeakestQuestions, getMostConfusingQuestions, getAllQualityMetrics, getSkillQuestionMetrics } from '@/lib/questionIntelligenceEngine';
import { generateSmartReviews, getReviewStats } from '@/lib/smartRetentionReviews';
import { calculateMasteryV2 } from '@/lib/masteryEngineV2';

type Tab = 'misconceptions' | 'decay' | 'questions' | 'gaps' | 'reviews';

export default function TeacherIntelligence() {
  const [selectedGrade, setSelectedGrade] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<Tab>('misconceptions');

  const allSkills = useMemo(() => getAllSkillsWithPrereqs(), []);
  const gradeSkills = useMemo(() => allSkills.filter(s => s.grade === selectedGrade), [allSkills, selectedGrade]);
  const allQuestions = useMemo(() => getAllQuestions(), []);
  const skillNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of allSkills) map[s.id] = s.name;
    return map;
  }, [allSkills]);

  // Get progress data
  const progress: StudentSkillProgress[] = useMemo(() => {
    const saved = localStorage.getItem('skillsEngineProgress');
    return saved ? JSON.parse(saved) : [];
  }, []);

  const gradeProgress = useMemo(() =>
    progress.filter(p => gradeSkills.some(s => s.id === p.skillId)),
    [progress, gradeSkills]
  );

  // Misconceptions
  const misconceptions = useMemo(() => getMisconceptionSummary(selectedGrade), [selectedGrade]);

  // Decay
  const highDecaySkills = useMemo(() => getHighestDecaySkills(gradeProgress, 10), [gradeProgress]);
  const criticalDecay = useMemo(() => getCriticalDecaySkills(gradeProgress), [gradeProgress]);
  const decayPatterns = useMemo(() => getDecayPatterns(), []);

  // Questions
  const weakestQs = useMemo(() => getWeakestQuestions(2, 10), []);
  const confusingQs = useMemo(() => getMostConfusingQuestions(10), []);
  const qualityMetrics = useMemo(() => getAllQualityMetrics(), []);

  // Prerequisite gaps
  const prereqGaps = useMemo(() => getPrerequisiteGaps(gradeProgress), [gradeProgress]);

  // Smart reviews
  const smartReviews = useMemo(() => generateSmartReviews(gradeProgress, skillNameMap, 10), [gradeProgress, skillNameMap]);
  const reviewStats = useMemo(() => getReviewStats(gradeProgress), [gradeProgress]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'misconceptions', label: 'المفاهيم الخاطئة', icon: <Brain className="w-4 h-4" /> },
    { id: 'decay', label: 'انهيار الإتقان', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'questions', label: 'جودة الأسئلة', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'gaps', label: 'الفجوات', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'reviews', label: 'المراجعات الذكية', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-5 pb-8">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            ذكاء التعلم - وضع المعلم
          </h1>
          <p className="text-gray-500 text-sm mt-1">تحليل عميق لأنماط التعلم والفهم الخاطئ</p>
        </div>

        {/* Grade Selector */}
        <div className="flex justify-center">
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
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 overflow-x-auto">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-lg flex items-center gap-1 whitespace-nowrap text-xs sm:text-sm"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* ============ MISCONCEPTIONS TAB ============ */}
        {activeTab === 'misconceptions' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Brain className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <div className="text-xl font-bold">{misconceptions.length}</div>
                  <div className="text-xs text-gray-500">أنواع خاطئة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-600" />
                  <div className="text-xl font-bold">
                    {misconceptions.filter(m => m.trend === 'increasing').length}
                  </div>
                  <div className="text-xs text-gray-500">متزايدة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Target className="w-5 h-5 mx-auto mb-1 text-green-600" />
                  <div className="text-xl font-bold">
                    {misconceptions.reduce((s, m) => s + m.count, 0)}
                  </div>
                  <div className="text-xs text-gray-500">إجمالي الحالات</div>
                </CardContent>
              </Card>
            </div>

            {/* Misconception List */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">أكثر المفاهيم الخاطئة انتشاراً</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {misconceptions.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">لا توجد بيانات كافية بعد</p>
                    <p className="text-xs text-gray-400 mt-1">ستظهر الأنماط بعد حل المزيد من الأسئلة</p>
                  </div>
                ) : (
                  misconceptions.map(m => {
                    const profile = misconceptionProfiles[m.type];
                    return (
                      <div key={m.type} className="p-4 border rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {m.type === 'counting_confusion' ? '🔢' :
                               m.type === 'place_value_confusion' ? '🏗️' :
                               m.type === 'operation_switch' ? '➕➖' :
                               m.type === 'visual_misread' ? '👁️' : '🔄'}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-gray-800">{m.label}</h4>
                              <p className="text-xs text-gray-500">{profile.description}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <Badge
                              variant={m.trend === 'increasing' ? 'destructive' : m.trend === 'decreasing' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {m.trend === 'increasing' ? '↑ متزايد' : m.trend === 'decreasing' ? '↓ متناقص' : '— مستقر'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>{m.count} حالة ({m.percentage}%)</span>
                          <span>{m.affectedSkills.length} مهارة متأثرة</span>
                        </div>

                        {/* Remedial Path */}
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-xs font-medium text-blue-800 mb-1">🛤️ المسار العلاجي:</p>
                          <div className="flex flex-wrap gap-1">
                            {profile.remedialPath.slice(0, 4).map(skillId => (
                              <Badge key={skillId} variant="outline" className="text-xs bg-white">
                                {skillNameMap[skillId] || skillId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ DECAY TAB ============ */}
        {activeTab === 'decay' && (
          <div className="space-y-4">
            {/* Decay Patterns Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-red-600">{criticalDecay.length}</div>
                  <div className="text-xs text-gray-500">حرجة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-amber-600">{decayPatterns.absenceDecays}</div>
                  <div className="text-xs text-gray-500">انهيار غياب</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-orange-600">{decayPatterns.errorDecays}</div>
                  <div className="text-xs text-gray-500">انهيار أخطاء</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-purple-600">{decayPatterns.retentionDecays}</div>
                  <div className="text-xs text-gray-500">فشل احتفاظ</div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Decay Skills */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  مهارات ذات انهيار حرج
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {highDecaySkills.length === 0 ? (
                  <div className="text-center py-6">
                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">لا يوجد انهيار ملحوظ حالياً</p>
                  </div>
                ) : (
                  highDecaySkills.map(skill => (
                    <div key={skill.skillId} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {skillNameMap[skill.skillId] || skill.skillId}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">إتقان: {skill.masteryScore}%</span>
                          <span className="text-xs text-red-600">→ ثقة: {skill.confidenceScore}%</span>
                          <Badge variant="secondary" className="text-xs">
                            {skill.stabilityTrend === 'falling' ? '↓' : skill.stabilityTrend === 'rising' ? '↑' : '—'}
                          </Badge>
                        </div>
                      </div>
                      <div className="shrink-0 w-20">
                        <div className="text-xs text-gray-500 mb-1 text-center">الفجوة</div>
                        <Progress value={skill.masteryScore - skill.confidenceScore} className="h-2" />
                        <div className="text-xs text-red-600 text-center mt-0.5">
                          -{skill.masteryScore - skill.confidenceScore}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Decay Pattern Analysis */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">تحليل أنماط الانهيار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">إجمالي أحداث الانهيار</span>
                    <span className="font-bold text-gray-800">{decayPatterns.totalEvents}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">متوسط الانهيار لكل حدث</span>
                    <span className="font-bold text-gray-800">{decayPatterns.avgDecayPerEvent}%</span>
                  </div>
                  {decayPatterns.totalEvents > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <p className="text-xs font-medium text-amber-800">
                        💡 السبب الأكثر شيوعاً: {
                          decayPatterns.absenceDecays >= decayPatterns.errorDecays && decayPatterns.absenceDecays >= decayPatterns.retentionDecays
                            ? 'الغياب عن الممارسة'
                            : decayPatterns.errorDecays >= decayPatterns.retentionDecays
                              ? 'تكرار الأخطاء'
                              : 'فشل مراجعات الاحتفاظ'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ QUESTIONS TAB ============ */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {/* Quality Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <BookOpen className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                  <div className="text-xl font-bold">{allQuestions.length}</div>
                  <div className="text-xs text-gray-500">إجمالي الأسئلة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <div className="text-xl font-bold">{qualityMetrics.length}</div>
                  <div className="text-xs text-gray-500">أسئلة مُقاسة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-600" />
                  <div className="text-xl font-bold">{weakestQs.length}</div>
                  <div className="text-xs text-gray-500">أسئلة ضعيفة</div>
                </CardContent>
              </Card>
            </div>

            {/* Weakest Questions */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  أضعف الأسئلة (أقل نسبة نجاح)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakestQs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">تحتاج محاولات أكثر لتظهر الإحصائيات</p>
                ) : (
                  weakestQs.map((q, idx) => {
                    const question = allQuestions.find(aq => aq.id === q.questionId);
                    return (
                      <div key={q.questionId} className="flex items-center gap-3 p-2 rounded-lg bg-red-50/30">
                        <span className="text-sm font-bold text-red-400 w-6">#{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{question?.questionText || q.questionId}</p>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{q.totalAttempts} محاولة</span>
                            <span className="text-xs text-red-600">{q.successRate}% نجاح</span>
                            <span className="text-xs text-gray-400">{(q.averageTime / 1000).toFixed(1)}ث</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Most Confusing Questions */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  أكثر الأسئلة إرباكاً (أعلى misconception)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {confusingQs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">لا توجد بيانات كافية</p>
                ) : (
                  confusingQs.map((q, idx) => {
                    const question = allQuestions.find(aq => aq.id === q.questionId);
                    const profile = misconceptionProfiles[q.topMisconception];
                    return (
                      <div key={q.questionId} className="p-2 rounded-lg bg-purple-50/30">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-purple-400">#{idx + 1}</span>
                          <p className="text-xs text-gray-700 flex-1 truncate">{question?.questionText || q.questionId}</p>
                        </div>
                        <div className="flex gap-2 mt-1 mr-6">
                          <Badge variant="outline" className="text-xs">{profile?.label}</Badge>
                          <span className="text-xs text-gray-500">{q.totalAttempts} محاولة</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ GAPS TAB ============ */}
        {activeTab === 'gaps' && (
          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  فجوات المتطلبات المسبقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prereqGaps.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">لا توجد فجوات مكتشفة</p>
                    <p className="text-xs text-gray-400 mt-1">ستظهر الفجوات عند تسجيل أخطاء متكررة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prereqGaps.map(gap => (
                      <div key={gap.skillId} className="p-3 border rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-800">
                            {skillNameMap[gap.skillId] || gap.skillId}
                          </h4>
                          <Badge variant={gap.mastery < 40 ? 'destructive' : 'secondary'} className="text-xs">
                            إتقان {gap.mastery}%
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {gap.misconceptionsCaused.map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {misconceptionProfiles[type]?.label || type}
                            </Badge>
                          ))}
                        </div>
                        <Progress value={gap.mastery} className="h-1.5 mt-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skill Dependencies Visualization */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">تأثير الفجوات على المهارات الأخرى</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-xs text-amber-800">
                    💡 كل فجوة في المتطلبات المسبقة تؤثر على عدة مهارات لاحقة.
                    معالجة الفجوة الأضعف أولاً يحسّن أداء الطالب في مهارات متعددة.
                  </p>
                </div>
                {prereqGaps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>أولوية المعالجة</span>
                      <span className="text-xs text-gray-400">من الأضعف للأقوى</span>
                    </div>
                    {prereqGaps.slice(0, 5).map((gap, idx) => (
                      <div key={gap.skillId} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-600 w-5">{idx + 1}</span>
                        <span className="text-xs text-gray-700 flex-1">{skillNameMap[gap.skillId]}</span>
                        <span className="text-xs text-red-600">{gap.mastery}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ REVIEWS TAB ============ */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Review Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">{reviewStats.totalDue}</div>
                  <div className="text-xs text-gray-500">مستحقة</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-red-600">{reviewStats.highPriority}</div>
                  <div className="text-xs text-gray-500">أولوية عالية</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-amber-600">{reviewStats.avgOverdueDays}</div>
                  <div className="text-xs text-gray-500">متوسط التأخير</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {reviewStats.byType.error_correction}
                  </div>
                  <div className="text-xs text-gray-500">تصحيح أخطاء</div>
                </CardContent>
              </Card>
            </div>

            {/* Smart Review List */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  المراجعات الذكية المقترحة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {smartReviews.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">لا توجد مراجعات مستحقة حالياً</p>
                  </div>
                ) : (
                  smartReviews.map((review, idx) => (
                    <div key={review.skillId} className="p-3 border rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            review.priority >= 70 ? 'bg-red-500' :
                            review.priority >= 40 ? 'bg-amber-500' : 'bg-green-500'
                          }`} />
                          <h4 className="text-sm font-medium text-gray-800">{review.skillName}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {review.reviewType === 'retention' ? '🔄 احتفاظ' :
                           review.reviewType === 'decay_prevention' ? '🛡️ حماية' :
                           review.reviewType === 'error_correction' ? '🔧 تصحيح' : '⚡ طلاقة'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mr-4">{review.reason}</p>
                      <div className="flex items-center gap-3 mt-1 mr-4 text-xs text-gray-400">
                        <span>صعوبة: {review.suggestedDifficulty === 'easy' ? 'سهل' : review.suggestedDifficulty === 'medium' ? 'متوسط' : 'صعب'}</span>
                        <span>{review.estimatedQuestions} أسئلة</span>
                        <span>أولوية: {review.priority}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Review Type Distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">توزيع أنواع المراجعات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl text-center">
                    <div className="text-lg font-bold text-blue-700">{reviewStats.byType.retention}</div>
                    <div className="text-xs text-blue-600">احتفاظ</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl text-center">
                    <div className="text-lg font-bold text-purple-700">{reviewStats.byType.decay_prevention}</div>
                    <div className="text-xs text-purple-600">حماية من الانهيار</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl text-center">
                    <div className="text-lg font-bold text-red-700">{reviewStats.byType.error_correction}</div>
                    <div className="text-xs text-red-600">تصحيح أخطاء</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl text-center">
                    <div className="text-lg font-bold text-amber-700">{reviewStats.byType.fluency_drill}</div>
                    <div className="text-xs text-amber-600">تدريب طلاقة</div>
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