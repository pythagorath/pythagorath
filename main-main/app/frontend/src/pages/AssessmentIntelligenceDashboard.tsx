import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { MISCONCEPTION_TAXONOMY, getCategoryStats, type MisconceptionCategory } from '@/lib/misconceptionTaxonomy';
import { getClassDiagnosticSummary } from '@/lib/diagnosticAssessmentEngine';
import { getClassBehavioralSummary } from '@/lib/cognitiveInteractionAnalysis';
import { getCurriculumWeaknessHeatmap } from '@/lib/skillDiagnosisLayer';
import { getClassAssessmentState } from '@/lib/assessmentStatePersistence';

const MOCK_STUDENTS = ['student_1', 'student_2', 'student_3', 'student_4', 'student_5', 'student_6', 'student_7', 'student_8'];

const SKILL_IDS = [
  'G1-A-001', 'G1-A-002', 'G1-A-003', 'G1-B-001', 'G1-B-002',
  'G2-C-001', 'G2-C-002', 'G2-C-003', 'G2-C-004',
];

const SKILL_NAMES: Record<string, string> = {
  'G1-A-001': 'العد حتى 20',
  'G1-A-002': 'التعرف على الأرقام',
  'G1-A-003': 'الجمع ضمن 10',
  'G1-B-001': 'الطرح ضمن 10',
  'G1-B-002': 'مقارنة الأعداد',
  'G2-C-001': 'الجمع ضمن 50',
  'G2-C-002': 'الطرح ضمن 50',
  'G2-C-003': 'الجمع ضمن 100',
  'G2-C-004': 'الطرح ضمن 100',
};

const CATEGORY_NAMES: Record<MisconceptionCategory, string> = {
  arithmetic: 'حسابية',
  place_value: 'القيمة المكانية',
  fraction: 'الكسور',
  sequencing: 'التسلسل',
  comparison: 'المقارنة',
  procedural: 'إجرائية',
  measurement: 'القياس',
  geometry: 'الهندسة',
};

const PATTERN_NAMES: Record<string, string> = {
  speed_accuracy_tradeoff: 'مقايضة السرعة/الدقة',
  frustration_spiral: 'دوامة الإحباط',
  improvement_after_hint: 'تحسن بعد التلميح',
  careful_methodical: 'منهجي ودقيق',
  guessing_pattern: 'نمط تخمين',
  avoidance_behavior: 'سلوك تجنبي',
  warm_up_effect: 'تأثير الإحماء',
  fatigue_decline: 'انخفاض بسبب الإرهاق',
  retry_persistence: 'إصرار على المحاولة',
  consistent_hesitation: 'تردد مستمر',
};

function generateMockAnalytics() {
  const diagnosticSummary = getClassDiagnosticSummary(MOCK_STUDENTS);
  const behavioralSummary = getClassBehavioralSummary(MOCK_STUDENTS);
  const heatmapRaw = getCurriculumWeaknessHeatmap(MOCK_STUDENTS, SKILL_IDS);
  const assessmentState = getClassAssessmentState(MOCK_STUDENTS);

  const mockMastery = [75, 80, 65, 55, 48, 58, 42, 52, 35];
  const mockBelow = [1, 0, 2, 3, 4, 3, 5, 3, 5];
  const mockMiscRate = [10, 5, 25, 30, 35, 28, 40, 25, 45];

  return {
    diagnosticSummary: {
      totalAssessments: diagnosticSummary.totalAssessments || 156,
      avgMastery: diagnosticSummary.avgMastery || 62,
      commonMisconceptions: diagnosticSummary.commonMisconceptions.length > 0
        ? diagnosticSummary.commonMisconceptions
        : [
          { id: 'ARITH-001', studentCount: 5, avgConfidence: 72 },
          { id: 'PV-001', studentCount: 4, avgConfidence: 68 },
          { id: 'ARITH-002', studentCount: 3, avgConfidence: 75 },
          { id: 'ARITH-003', studentCount: 3, avgConfidence: 61 },
          { id: 'COMP-001', studentCount: 2, avgConfidence: 80 },
        ],
      weakestSkills: diagnosticSummary.weakestSkills.length > 0
        ? diagnosticSummary.weakestSkills
        : [
          { skillId: 'G2-C-004', avgMastery: 35, studentCount: 5 },
          { skillId: 'G2-C-002', avgMastery: 42, studentCount: 4 },
          { skillId: 'G1-B-002', avgMastery: 48, studentCount: 3 },
          { skillId: 'G2-C-003', avgMastery: 52, studentCount: 3 },
        ],
    },
    behavioralSummary: {
      avgEngagement: behavioralSummary.avgEngagement || 68,
      avgFrustration: behavioralSummary.avgFrustration || 28,
      avgFatigue: behavioralSummary.avgFatigue || 35,
      commonPatterns: behavioralSummary.commonPatterns.length > 0
        ? behavioralSummary.commonPatterns
        : [
          { type: 'speed_accuracy_tradeoff' as const, count: 4 },
          { type: 'frustration_spiral' as const, count: 3 },
          { type: 'improvement_after_hint' as const, count: 5 },
          { type: 'careful_methodical' as const, count: 3 },
        ],
      studentsNeedingAttention: behavioralSummary.studentsNeedingAttention.length > 0
        ? behavioralSummary.studentsNeedingAttention
        : ['student_2', 'student_5'],
    },
    heatmap: heatmapRaw.some(h => h.avgMastery > 0) ? heatmapRaw : SKILL_IDS.map((skillId, i) => ({
      skillId,
      avgMastery: mockMastery[i] || 50,
      studentsBelowThreshold: mockBelow[i] || 2,
      misconceptionRate: mockMiscRate[i] || 20,
      category: null as MisconceptionCategory | null,
    })),
    assessmentState: {
      avgOverallMastery: assessmentState.avgOverallMastery || 58,
      activeRemediationCount: assessmentState.activeRemediationCount || 12,
      pendingAssessments: assessmentState.pendingAssessments || 6,
      studentsWithDecay: assessmentState.studentsWithDecay || 3,
      avgStreakDays: assessmentState.avgStreakDays || 4,
    },
  };
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getMasteryColor(mastery: number) {
  if (mastery >= 80) return 'bg-green-500';
  if (mastery >= 60) return 'bg-blue-500';
  if (mastery >= 40) return 'bg-yellow-500';
  if (mastery >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function getHeatmapBg(mastery: number) {
  if (mastery >= 80) return 'bg-green-100 border-green-300';
  if (mastery >= 60) return 'bg-blue-100 border-blue-300';
  if (mastery >= 40) return 'bg-yellow-100 border-yellow-300';
  if (mastery >= 20) return 'bg-orange-100 border-orange-300';
  return 'bg-red-100 border-red-300';
}

export default function AssessmentIntelligenceDashboard() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const analytics = useMemo(() => generateMockAnalytics(), []);
  const categoryStats = useMemo(() => getCategoryStats(), []);

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧠 ذكاء التقييم والتشخيص</h1>
            <p className="text-gray-600 mt-1">تحليل المفاهيم الخاطئة، تشخيص المهارات، مراقبة العلاج</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            ← العودة للوحة التحكم
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.diagnosticSummary.totalAssessments}</div>
              <div className="text-sm text-gray-600 mt-1">تقييم تشخيصي</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{analytics.diagnosticSummary.avgMastery}%</div>
              <div className="text-sm text-gray-600 mt-1">متوسط الإتقان</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{analytics.assessmentState.activeRemediationCount}</div>
              <div className="text-sm text-gray-600 mt-1">علاج نشط</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{analytics.diagnosticSummary.commonMisconceptions.length}</div>
              <div className="text-sm text-gray-600 mt-1">مفهوم خاطئ مكتشف</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="misconceptions">المفاهيم الخاطئة</TabsTrigger>
            <TabsTrigger value="skills">تشخيص المهارات</TabsTrigger>
            <TabsTrigger value="heatmap">خريطة الضعف</TabsTrigger>
            <TabsTrigger value="behavior">التحليل السلوكي</TabsTrigger>
            <TabsTrigger value="remediation">مراقبة العلاج</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Misconceptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔴 أكثر المفاهيم الخاطئة شيوعاً</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.diagnosticSummary.commonMisconceptions.map((misc) => {
                    const profile = MISCONCEPTION_TAXONOMY.find(m => m.id === misc.id);
                    return (
                      <div key={misc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{profile?.nameAr || misc.id}</div>
                          <div className="text-xs text-gray-500">{profile?.category ? CATEGORY_NAMES[profile.category] : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getSeverityColor(profile?.severity || 'medium')}>
                            {misc.studentCount} طالب
                          </Badge>
                          <span className="text-xs text-gray-500">{misc.avgConfidence}% ثقة</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Weakest Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📉 أضعف المهارات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.diagnosticSummary.weakestSkills.map((skill) => (
                    <div key={skill.skillId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{SKILL_NAMES[skill.skillId] || skill.skillId}</span>
                        <span className="text-gray-500">{skill.avgMastery}% ({skill.studentCount} طالب ضعيف)</span>
                      </div>
                      <Progress value={skill.avgMastery} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Behavioral Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🧩 الحالة السلوكية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-700">{analytics.behavioralSummary.avgEngagement}%</div>
                      <div className="text-xs text-gray-600">المشاركة</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-700">{analytics.behavioralSummary.avgFrustration}%</div>
                      <div className="text-xs text-gray-600">الإحباط</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-700">{analytics.behavioralSummary.avgFatigue}%</div>
                      <div className="text-xs text-gray-600">الإرهاق</div>
                    </div>
                  </div>
                  {analytics.behavioralSummary.studentsNeedingAttention.length > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-sm font-medium text-orange-800">⚠️ طلاب يحتاجون انتباه:</div>
                      <div className="text-xs text-orange-600 mt-1">
                        {analytics.behavioralSummary.studentsNeedingAttention.join(', ')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assessment State */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📊 حالة النظام التكيفي</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">متوسط الإتقان العام</span>
                    <Badge>{analytics.assessmentState.avgOverallMastery}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">علاجات نشطة</span>
                    <Badge variant="outline">{analytics.assessmentState.activeRemediationCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">تقييمات معلقة</span>
                    <Badge variant="outline">{analytics.assessmentState.pendingAssessments}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">طلاب بحاجة مراجعة (تراجع)</span>
                    <Badge variant="destructive">{analytics.assessmentState.studentsWithDecay}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">متوسط أيام الاستمرارية</span>
                    <Badge className="bg-green-100 text-green-800">{analytics.assessmentState.avgStreakDays} أيام</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Misconceptions Tab */}
          <TabsContent value="misconceptions">
            <div className="space-y-6">
              {/* Category Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>تصنيف المفاهيم الخاطئة حسب الفئة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(categoryStats).map(([cat, stats]) => (
                      <div key={cat} className="p-3 border rounded-lg text-center">
                        <div className="font-medium text-sm">{CATEGORY_NAMES[cat as MisconceptionCategory]}</div>
                        <div className="text-2xl font-bold mt-1">{stats.count}</div>
                        <div className="text-xs text-gray-500">
                          خطورة: {stats.avgSeverity.toFixed(1)}/4 | استمرار: {stats.avgPersistence}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Misconceptions */}
              <Card>
                <CardHeader>
                  <CardTitle>قاعدة بيانات المفاهيم الخاطئة ({MISCONCEPTION_TAXONOMY.length} نوع)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {MISCONCEPTION_TAXONOMY.map((misc) => (
                      <div key={misc.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{misc.nameAr}</span>
                              <Badge variant="outline" className={getSeverityColor(misc.severity)}>
                                {misc.severity === 'critical' ? 'حرج' : misc.severity === 'high' ? 'عالي' : misc.severity === 'medium' ? 'متوسط' : 'منخفض'}
                              </Badge>
                              <Badge variant="outline">{CATEGORY_NAMES[misc.category]}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{misc.descriptionAr}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>الصفوف: {misc.gradeRange[0]}-{misc.gradeRange[1]}</span>
                              <span>خطر الاستمرار: {misc.persistenceRisk}%</span>
                              <span>جلسات العلاج: {misc.remediationPath.estimatedSessions}</span>
                            </div>
                          </div>
                        </div>
                        {/* Indicators */}
                        <div className="mt-3 space-y-1">
                          {misc.indicators.slice(0, 2).map((ind, idx) => (
                            <div key={idx} className="text-xs bg-gray-100 p-2 rounded flex justify-between">
                              <span>{ind.description}</span>
                              <span className="text-gray-500">مثال: {ind.example.question} = {ind.example.wrongAnswer} (الصحيح: {ind.example.correctAnswer})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Skills Diagnosis Tab */}
          <TabsContent value="skills">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>تشخيص المهارات - نظرة شاملة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {SKILL_IDS.map((skillId, i) => {
                      const heatItem = analytics.heatmap[i];
                      const misconceptions = MISCONCEPTION_TAXONOMY.filter(m => m.prerequisiteSkills.includes(skillId));
                      return (
                        <div key={skillId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{SKILL_NAMES[skillId]}</span>
                              <Badge variant="outline" className="text-xs">{skillId}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">{heatItem.studentsBelowThreshold} طالب ضعيف</span>
                              <div className={`w-3 h-3 rounded-full ${getMasteryColor(heatItem.avgMastery)}`} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center text-sm">
                            <div className="p-2 bg-blue-50 rounded">
                              <div className="font-bold text-blue-700">{heatItem.avgMastery}%</div>
                              <div className="text-xs text-gray-500">متوسط الإتقان</div>
                            </div>
                            <div className="p-2 bg-red-50 rounded">
                              <div className="font-bold text-red-700">{heatItem.misconceptionRate}%</div>
                              <div className="text-xs text-gray-500">معدل المفاهيم الخاطئة</div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded">
                              <div className="font-bold text-purple-700">{misconceptions.length}</div>
                              <div className="text-xs text-gray-500">مفاهيم خاطئة مرتبطة</div>
                            </div>
                          </div>
                          <Progress value={heatItem.avgMastery} className="h-2 mt-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap">
            <Card>
              <CardHeader>
                <CardTitle>خريطة ضعف المنهج الحرارية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analytics.heatmap.map((item) => (
                    <div key={item.skillId} className={`p-4 border-2 rounded-lg ${getHeatmapBg(item.avgMastery)}`}>
                      <div className="font-medium text-sm">{SKILL_NAMES[item.skillId] || item.skillId}</div>
                      <div className="text-2xl font-bold mt-1">{item.avgMastery}%</div>
                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span>ضعيف: {item.studentsBelowThreshold} طالب</span>
                        <span>مفاهيم خاطئة: {item.misconceptionRate}%</span>
                      </div>
                      <Progress value={item.avgMastery} className="h-1.5 mt-2" />
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium mb-2">دليل الألوان:</div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1"><div className="w-4 h-4 bg-green-100 border border-green-300 rounded" /> 80%+ ممتاز</div>
                    <div className="flex items-center gap-1"><div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" /> 60-79% جيد</div>
                    <div className="flex items-center gap-1"><div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" /> 40-59% متوسط</div>
                    <div className="flex items-center gap-1"><div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded" /> 20-39% ضعيف</div>
                    <div className="flex items-center gap-1"><div className="w-4 h-4 bg-red-100 border border-red-300 rounded" /> 0-19% حرج</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>التحليل السلوكي المعرفي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <div className="text-3xl font-bold text-green-700">{analytics.behavioralSummary.avgEngagement}%</div>
                      <div className="text-sm text-gray-600 mt-1">متوسط المشاركة</div>
                      <Progress value={analytics.behavioralSummary.avgEngagement} className="h-2 mt-2" />
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                      <div className="text-3xl font-bold text-red-700">{analytics.behavioralSummary.avgFrustration}%</div>
                      <div className="text-sm text-gray-600 mt-1">متوسط الإحباط</div>
                      <Progress value={analytics.behavioralSummary.avgFrustration} className="h-2 mt-2" />
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <div className="text-3xl font-bold text-yellow-700">{analytics.behavioralSummary.avgFatigue}%</div>
                      <div className="text-sm text-gray-600 mt-1">متوسط الإرهاق</div>
                      <Progress value={analytics.behavioralSummary.avgFatigue} className="h-2 mt-2" />
                    </div>
                  </div>

                  {/* Common Patterns */}
                  <h3 className="font-medium text-lg mb-3">الأنماط السلوكية الشائعة</h3>
                  <div className="space-y-2">
                    {analytics.behavioralSummary.commonPatterns.map((pattern, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {pattern.type === 'improvement_after_hint' ? '✅' :
                             pattern.type === 'careful_methodical' ? '🎯' :
                             pattern.type === 'frustration_spiral' ? '😤' : '⚡'}
                          </span>
                          <span className="font-medium text-sm">{PATTERN_NAMES[pattern.type] || pattern.type}</span>
                        </div>
                        <Badge variant="outline">{pattern.count} طالب</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cognitive Signals Explanation */}
              <Card>
                <CardHeader>
                  <CardTitle>إشارات معرفية يتم تتبعها</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { signal: 'التردد', desc: 'توقف أكثر من 15 ثانية قبل الإجابة', icon: '⏸️' },
                      { signal: 'التسرع', desc: 'إجابة في أقل من 2 ثانية', icon: '⚡' },
                      { signal: 'المحاولات المتكررة', desc: 'إعادة المحاولة بعد خطأ', icon: '🔄' },
                      { signal: 'طلب المساعدة', desc: 'طلب تلميح أو مساعدة', icon: '🙋' },
                      { signal: 'التخطي', desc: 'تجاوز سؤال دون إجابة', icon: '⏭️' },
                      { signal: 'تغيير الإجابة', desc: 'تعديل الإجابة قبل التأكيد', icon: '✏️' },
                      { signal: 'الإحباط', desc: 'أخطاء متتالية + بطء', icon: '😤' },
                      { signal: 'فقدان التركيز', desc: 'فترات خمول طويلة', icon: '😴' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{item.signal}</div>
                          <div className="text-xs text-gray-500">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Remediation Tab */}
          <TabsContent value="remediation">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>مراقبة العلاج التكيفي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-700">{analytics.assessmentState.activeRemediationCount}</div>
                      <div className="text-xs text-gray-600">علاج نشط</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-700">{analytics.assessmentState.avgStreakDays}</div>
                      <div className="text-xs text-gray-600">أيام استمرارية</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-700">{analytics.assessmentState.pendingAssessments}</div>
                      <div className="text-xs text-gray-600">تقييم معلق</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-700">{analytics.assessmentState.studentsWithDecay}</div>
                      <div className="text-xs text-gray-600">بحاجة مراجعة</div>
                    </div>
                  </div>

                  {/* Remediation Flow */}
                  <h3 className="font-medium text-lg mb-3">مسار العلاج التكيفي</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      {['اكتشاف', 'تشخيص', 'تخطيط', 'تنفيذ', 'تقييم'].map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            idx < 3 ? 'bg-green-500' : idx === 3 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}>
                            {idx + 1}
                          </div>
                          <span className="text-xs mt-1">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Remediation Types */}
                  <h3 className="font-medium text-lg mb-3 mt-6">أنواع العلاج المتاحة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { type: 'فجوة متطلبات', desc: 'العودة لمهارات أساسية ناقصة', color: 'border-red-200 bg-red-50' },
                      { type: 'خطأ مفاهيمي', desc: 'تصحيح الفهم الخاطئ بأمثلة بصرية', color: 'border-orange-200 bg-orange-50' },
                      { type: 'خطأ إجرائي', desc: 'إعادة تعليم الخطوات بشكل موجه', color: 'border-yellow-200 bg-yellow-50' },
                      { type: 'نقص طلاقة', desc: 'تمارين سرعة وتكرار', color: 'border-blue-200 bg-blue-50' },
                      { type: 'خطأ انتباه', desc: 'تقنيات تركيز ومراجعة ذاتية', color: 'border-green-200 bg-green-50' },
                    ].map((item, idx) => (
                      <div key={idx} className={`p-3 border rounded-lg ${item.color}`}>
                        <div className="font-medium text-sm">{item.type}</div>
                        <div className="text-xs text-gray-600 mt-1">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Misconception-to-Remediation Mapping */}
              <Card>
                <CardHeader>
                  <CardTitle>ربط المفاهيم الخاطئة بمسارات العلاج</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {MISCONCEPTION_TAXONOMY.slice(0, 6).map((misc) => (
                      <div key={misc.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(misc.severity)}>{misc.severity}</Badge>
                            <span className="font-medium text-sm">{misc.nameAr}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {misc.remediationPath.estimatedSessions} جلسات | {misc.remediationPath.steps.length} خطوات
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {misc.remediationPath.steps.map((step, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {step.order}. {step.titleAr}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}