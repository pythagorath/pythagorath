// Real Usage & Learning Validation Sprint - Validation Dashboard
import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  runAllSimulations,
  validateEngagement,
  validateParentExperience,
  type SimulationResult,
  type FrictionPoint,
} from '@/lib/learningSimulator';

export default function ValidationDashboard() {
  const [duration, setDuration] = useState<7 | 14 | 30>(7);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSim = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllSimulations(duration);
      setResults(res);
      setIsRunning(false);
    }, 100);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧪 لوحة التحقق من التعلم</h1>
            <p className="text-gray-600 text-sm mt-1">
              محاكاة سيناريوهات تعلم حقيقية للتحقق من فعالية النظام
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as 7 | 14 | 30)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value={7}>7 أيام</option>
              <option value={14}>14 يوم</option>
              <option value={30}>30 يوم</option>
            </select>
            <Button onClick={runSim} disabled={isRunning} size="lg">
              {isRunning ? '⏳ جارٍ المحاكاة...' : '▶️ ابدأ المحاكاة'}
            </Button>
          </div>
        </div>

        {!results && !isRunning && (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <p className="text-4xl mb-4">🔬</p>
              <h3 className="text-lg font-semibold mb-2">اختر مدة المحاكاة واضغط "ابدأ"</h3>
              <p className="text-gray-500 text-sm">
                سيتم محاكاة 3 طلاب (ضعيف، متوسط، قوي) على مدار الأيام المحددة
              </p>
            </CardContent>
          </Card>
        )}

        {results && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="profiles">الطلاب</TabsTrigger>
              <TabsTrigger value="friction">نقاط الاحتكاك</TabsTrigger>
              <TabsTrigger value="engagement">التفاعل</TabsTrigger>
              <TabsTrigger value="parent">ولي الأمر</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <OverviewTab results={results} duration={duration} />
            </TabsContent>

            <TabsContent value="profiles" className="space-y-4 mt-4">
              <ProfilesTab results={results} />
            </TabsContent>

            <TabsContent value="friction" className="space-y-4 mt-4">
              <FrictionTab results={results} />
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4 mt-4">
              <EngagementTab results={results} />
            </TabsContent>

            <TabsContent value="parent" className="space-y-4 mt-4">
              <ParentTab results={results} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

// ===== Overview Tab =====
function OverviewTab({ results, duration }: { results: SimulationResult[]; duration: number }) {
  const avgMetrics = useMemo(() => {
    const allMetrics = results.map(r => r.metrics);
    return {
      avgAccuracy: Math.round(allMetrics.reduce((s, m) => s + m.overallAccuracy, 0) / allMetrics.length),
      avgSession: Math.round(allMetrics.reduce((s, m) => s + m.avgSessionMinutes, 0) / allMetrics.length),
      avgCompletion: Math.round(allMetrics.reduce((s, m) => s + m.completionRate, 0) / allMetrics.length),
      avgMissionRate: Math.round(allMetrics.reduce((s, m) => s + m.missionCompletionRate, 0) / allMetrics.length),
      totalMastered: allMetrics.reduce((s, m) => s + m.skillsMastered, 0),
      totalFriction: results.reduce((s, r) => s + r.frictionPoints.length, 0),
    };
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="الدقة الإجمالية" value={`${avgMetrics.avgAccuracy}%`} icon="🎯" />
        <MetricCard label="متوسط الجلسة" value={`${avgMetrics.avgSession} د`} icon="⏱️" />
        <MetricCard label="نسبة العودة" value={`${avgMetrics.avgCompletion}%`} icon="📅" />
        <MetricCard label="إتمام المهمات" value={`${avgMetrics.avgMissionRate}%`} icon="✅" />
        <MetricCard label="مهارات مُتقنة" value={`${avgMetrics.totalMastered}`} icon="⭐" />
        <MetricCard label="نقاط احتكاك" value={`${avgMetrics.totalFriction}`} icon="⚠️" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 ملخص المحاكاة ({duration} يوم)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {r.profile.type === 'weak' ? '🔴' : r.profile.type === 'medium' ? '🟡' : '🟢'}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{r.profile.name}</p>
                    <p className="text-xs text-gray-500">
                      {r.metrics.activeDays} يوم نشط • {r.metrics.totalQuestions} سؤال
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>دقة: {r.metrics.overallAccuracy}%</span>
                  <span>إتقان: {r.metrics.skillsMastered}</span>
                  <span>streak: {r.metrics.streakMax}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 أهم النتائج</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.flatMap(r => r.learningInsights).map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded text-sm">
                <span>{insight.isPositive ? '✅' : '❌'}</span>
                <div>
                  <p className="font-medium">{insight.finding}</p>
                  <p className="text-xs text-gray-500">{insight.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Profiles Tab =====
function ProfilesTab({ results }: { results: SimulationResult[] }) {
  return (
    <div className="space-y-4">
      {results.map(r => (
        <Card key={r.profile.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span>{r.profile.type === 'weak' ? '🔴' : r.profile.type === 'medium' ? '🟡' : '🟢'}</span>
              {r.profile.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2 bg-blue-50 rounded">
                <p className="text-lg font-bold text-blue-700">{r.metrics.overallAccuracy}%</p>
                <p className="text-xs text-gray-600">الدقة</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="text-lg font-bold text-green-700">{r.metrics.skillsMastered}</p>
                <p className="text-xs text-gray-600">مهارات متقنة</p>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded">
                <p className="text-lg font-bold text-amber-700">{r.metrics.avgSessionMinutes} د</p>
                <p className="text-xs text-gray-600">متوسط الجلسة</p>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <p className="text-lg font-bold text-purple-700">{r.metrics.streakMax}</p>
                <p className="text-xs text-gray-600">أطول streak</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">الخصائص:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">دقة أساسية: {Math.round(r.profile.characteristics.baseAccuracy * 100)}%</Badge>
                <Badge variant="outline">سرعة التعلم: {r.profile.characteristics.learningRate}</Badge>
                <Badge variant="outline">الاحتفاظ: {Math.round(r.profile.characteristics.retentionRate * 100)}%</Badge>
                <Badge variant="outline">مدى الانتباه: {r.profile.characteristics.attentionSpan} د</Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">التقدم اليومي:</p>
              <div className="flex gap-1 flex-wrap">
                {r.days.map(d => (
                  <div
                    key={d.day}
                    className={`w-6 h-6 rounded text-[10px] flex items-center justify-center ${
                      !d.didReturn ? 'bg-gray-200' :
                      d.engagementScore >= 70 ? 'bg-green-400 text-white' :
                      d.engagementScore >= 40 ? 'bg-amber-300' :
                      'bg-red-300 text-white'
                    }`}
                    title={`يوم ${d.day}: ${d.didReturn ? `${d.questionsAnswered} سؤال` : 'لم يعد'}`}
                  >
                    {d.day}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block"></span> تفاعل عالي</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-300 rounded inline-block"></span> متوسط</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded inline-block"></span> منخفض</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded inline-block"></span> لم يعد</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===== Friction Tab =====
function FrictionTab({ results }: { results: SimulationResult[] }) {
  const allFriction = useMemo(() => {
    const all: (FrictionPoint & { profileName: string })[] = [];
    results.forEach(r => {
      r.frictionPoints.forEach(f => {
        all.push({ ...f, profileName: r.profile.name });
      });
    });
    return all.sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 };
      return sev[b.severity] - sev[a.severity];
    });
  }, [results]);

  const frictionByType = useMemo(() => {
    const counts: Record<string, number> = {};
    allFriction.forEach(f => {
      counts[f.type] = (counts[f.type] || 0) + 1;
    });
    return counts;
  }, [allFriction]);

  const typeLabels: Record<string, string> = {
    boredom: '😴 ملل',
    complexity: '🤯 تعقيد',
    repetition: '🔄 تكرار',
    visual_overload: '👁️ إرهاق بصري',
    confusion: '❓ ارتباك',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 توزيع نقاط الاحتكاك</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(frictionByType).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl">{typeLabels[type]?.split(' ')[0] || '⚠️'}</p>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-gray-600">{typeLabels[type]?.split(' ')[1] || type}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">⚠️ تفاصيل نقاط الاحتكاك ({allFriction.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allFriction.slice(0, 20).map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge
                  variant={f.severity === 'high' ? 'destructive' : f.severity === 'medium' ? 'default' : 'secondary'}
                  className="mt-0.5 shrink-0"
                >
                  {f.severity === 'high' ? 'عالي' : f.severity === 'medium' ? 'متوسط' : 'منخفض'}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{typeLabels[f.type] || f.type}</span>
                    <span className="text-xs text-gray-400">يوم {f.day}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{f.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {f.profileName} • مهارة: {f.skillName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Engagement Tab =====
function EngagementTab({ results }: { results: SimulationResult[] }) {
  const engagementReports = useMemo(() =>
    results.map(r => ({ profile: r.profile, report: validateEngagement(r), metrics: r.metrics })),
    [results]
  );

  const healthLabel = (h: string) => h === 'healthy' ? '💚 صحي' : h === 'fragile' ? '💛 هش' : '💔 مكسور';
  const motivLabel = (m: string) => m === 'high' ? '🔥 عالي' : m === 'medium' ? '⚡ متوسط' : '😐 منخفض';
  const balanceLabel = (b: string) => b === 'balanced' ? '⚖️ متوازن' : b === 'too_easy' ? '😴 سهل جداً' : '😰 صعب جداً';

  return (
    <div className="space-y-4">
      {engagementReports.map(({ profile, report, metrics }) => (
        <Card key={profile.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {profile.type === 'weak' ? '🔴' : profile.type === 'medium' ? '🟡' : '🟢'}
              {profile.name} - تقرير التفاعل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="font-bold">{report.dailyReturnRate}%</p>
                <p className="text-xs">نسبة العودة</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="font-bold">{healthLabel(report.streakHealth)}</p>
                <p className="text-xs">صحة الـ Streak</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="font-bold">{motivLabel(report.missionMotivation)}</p>
                <p className="text-xs">تحفيز المهمات</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="font-bold">{balanceLabel(report.rewardBalance)}</p>
                <p className="text-xs">توازن المكافآت</p>
              </div>
            </div>

            {report.recommendations.length > 0 && (
              <div className="bg-amber-50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">💡 توصيات:</p>
                <ul className="space-y-1">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-amber-500">•</span> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-blue-50 rounded">
                <p className="font-bold text-blue-700">{metrics.avgQuestionsPerDay}</p>
                <p>سؤال/يوم</p>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <p className="font-bold text-green-700">{metrics.missionCompletionRate}%</p>
                <p>إتمام المهمات</p>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <p className="font-bold text-purple-700">{metrics.streakMax} أيام</p>
                <p>أطول streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===== Parent Tab =====
function ParentTab({ results }: { results: SimulationResult[] }) {
  const parentReports = useMemo(() =>
    results.map(r => ({ profile: r.profile, validation: validateParentExperience(r) })),
    [results]
  );

  const clarityLabel = (c: string) => c === 'clear' ? '✅ واضح' : c === 'moderate' ? '⚠️ متوسط' : '❌ مربك';
  const actionLabel = (a: string) => a === 'actionable' ? '✅ قابل للتنفيذ' : a === 'vague' ? '⚠️ غامض' : '❌ مرهق';
  const usefulLabel = (u: string) => u === 'useful' ? '✅ مفيد' : u === 'somewhat' ? '⚠️ نوعاً ما' : '❌ غير مفيد';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">👨‍👩‍👧 تقييم تجربة ولي الأمر</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            هل ولي الأمر يفهم التقرير بسرعة؟ هل يعرف ماذا يفعل؟ هل يشعر أن النظام مفيد؟
          </p>
          <div className="space-y-4">
            {parentReports.map(({ profile, validation }) => (
              <div key={profile.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{profile.name}</span>
                  <Badge variant={validation.score >= 70 ? 'default' : validation.score >= 50 ? 'secondary' : 'destructive'}>
                    {validation.score}/100
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <p>{clarityLabel(validation.reportClarity)}</p>
                    <p className="text-xs text-gray-500">وضوح التقرير</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p>{actionLabel(validation.actionability)}</p>
                    <p className="text-xs text-gray-500">قابلية التنفيذ</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p>{usefulLabel(validation.usefulness)}</p>
                    <p className="text-xs text-gray-500">الفائدة</p>
                  </div>
                </div>

                {validation.issues.length > 0 && (
                  <div className="bg-red-50 p-2 rounded text-sm">
                    <p className="font-medium text-red-700 mb-1">مشاكل:</p>
                    {validation.issues.map((issue, i) => (
                      <p key={i} className="text-red-600 text-xs">• {issue}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Metric Card Component =====
function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="text-center p-3 bg-white border rounded-lg shadow-sm">
      <p className="text-xl mb-1">{icon}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}