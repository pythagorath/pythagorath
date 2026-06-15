import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Activity, Brain,
  CheckCircle2, AlertTriangle, TrendingUp, Star, Send,
  Target, Zap, Shield, Heart, ArrowLeft
} from 'lucide-react';
import { client } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface CohortOverview {
  total_accounts: number;
  active_accounts: number;
  by_type: Record<string, number>;
  students_grade1: number;
  students_grade2: number;
  parents: number;
  academic_team: number;
  active_last_7_days: number;
  capacity: { max: number; current: number; remaining: number };
}

interface UsageTracking {
  period_days: number;
  dau: { date: string; dau: number }[];
  avg_dau: number;
  session_duration_distribution: Record<string, number>;
  avg_session_duration: number;
  mission_completion: { total_sessions: number; total_missions_completed: number; avg_per_session: number };
  dropout: { count: number; rate: number };
  retry_behavior: { total_retries: number; avg_per_session: number };
  retention: { returning_users: number; total_users: number; rate_percent: number };
  mastery_progression: { records_updated: number; avg_mastery_level: number };
  top_misconceptions: { skill_id: number; wrong_count: number }[];
}

interface ChildEngagement {
  period_days: number;
  boredom: { low_engagement_sessions: number; total_scored_sessions: number; boredom_rate: number };
  dropout_locations: { page: string; count: number }[];
  hardest_skills: { skill_id: number; avg_mastery: number; attempts: number }[];
  confusing_questions: { question_id: number; total_attempts: number; wrong_count: number }[];
  hourly_engagement: { hour: number; sessions: number; avg_engagement: number }[];
  recommendations: string[];
}

interface ParentFeedbackLayer {
  total_reports: number;
  open_issues: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  recent_reports: { id: number; type: string; description: string; severity: string; page: string; status: string; created_at: string }[];
  parent_feedback: { count: number; avg_rating: number; avg_ease: number; avg_clarity: number };
}

interface AcademicOpsValidation {
  period_days: number;
  content_production: { new_skills: number; new_questions: number; skills_per_day: number; questions_per_day: number };
  review_activity: { total_reviews: number; reviews_per_day: number };
  editor_experience: { feedback_count: number; avg_rating: number; avg_ease: number };
  reviewer_experience: { feedback_count: number; avg_rating: number; avg_ease: number };
  efficiency_score: { score: number; level: string; production_rate: number; review_rate: number };
}

interface PilotSummary {
  dau_today: number;
  retention_7d_percent: number;
  mastery_growth: number;
  session_completion_rate: number;
  total_sessions_7d: number;
  common_misconceptions: { skill_id: number; count: number }[];
  low_quality_questions: { question_id: number; total: number; correct: number; accuracy: number }[];
  friction_points: { page: string; events: number }[];
  pilot_health: { score: number; status: string };
}

export default function PilotDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cohort, setCohort] = useState<CohortOverview | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [engagement, setEngagement] = useState<ChildEngagement | null>(null);
  const [parentFeedback, setParentFeedback] = useState<ParentFeedbackLayer | null>(null);
  const [academicOps, setAcademicOps] = useState<AcademicOpsValidation | null>(null);
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Parent report form
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSeverity, setReportSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [cohortRes, usageRes, engagementRes, parentRes, opsRes, summaryRes] = await Promise.allSettled([
        client.apiCall.invoke({ url: '/api/v1/pilot-execution/cohort-overview', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/pilot-execution/real-usage-tracking?days=7', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/pilot-execution/child-engagement?days=7', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/pilot-execution/parent-feedback-layer', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/pilot-execution/academic-ops-validation?days=7', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/pilot-execution/pilot-analytics-summary', method: 'GET', data: {} }),
      ]);

      if (cohortRes.status === 'fulfilled') setCohort(cohortRes.value as CohortOverview);
      if (usageRes.status === 'fulfilled') setUsage(usageRes.value as UsageTracking);
      if (engagementRes.status === 'fulfilled') setEngagement(engagementRes.value as ChildEngagement);
      if (parentRes.status === 'fulfilled') setParentFeedback(parentRes.value as ParentFeedbackLayer);
      if (opsRes.status === 'fulfilled') setAcademicOps(opsRes.value as AcademicOpsValidation);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value as PilotSummary);
    } catch {
      // Data will show as zeros/empty - graceful degradation
    } finally {
      setLoading(false);
    }
  }

  async function submitParentReport() {
    if (!reportType || !reportDesc) {
      toast({ title: 'تنبيه', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await client.apiCall.invoke({
        url: '/api/v1/pilot-execution/parent-report',
        method: 'POST',
        data: { report_type: reportType, description: reportDesc, severity: reportSeverity, page_context: window.location.pathname },
      });
      toast({ title: 'تم الإرسال', description: 'شكراً لملاحظتك' });
      setReportType('');
      setReportDesc('');
      loadAllData();
    } catch {
      toast({ title: 'خطأ', description: 'فشل إرسال التقرير', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-tajawal text-blue-900">🚀 لوحة تنفيذ التجربة</h1>
              <p className="text-sm text-gray-500">Pilot Execution Dashboard - مراقبة الاستخدام الحقيقي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />}
            <HealthBadge health={summary?.pilot_health} />
            <Button onClick={loadAllData} variant="outline" size="sm">تحديث</Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickStat icon={<Users className="w-4 h-4" />} label="المستخدمون النشطون اليوم" value={summary?.dau_today || 0} color="blue" />
          <QuickStat icon={<TrendingUp className="w-4 h-4" />} label="معدل الاحتفاظ (7 أيام)" value={`${summary?.retention_7d_percent || 0}%`} color="green" />
          <QuickStat icon={<Target className="w-4 h-4" />} label="مهارات مُتقنة" value={summary?.mastery_growth || 0} color="purple" />
          <QuickStat icon={<CheckCircle2 className="w-4 h-4" />} label="إتمام الجلسات" value={`${summary?.session_completion_rate || 0}%`} color="emerald" />
          <QuickStat icon={<Activity className="w-4 h-4" />} label="جلسات (7 أيام)" value={summary?.total_sessions_7d || 0} color="amber" />
          <QuickStat icon={<Heart className="w-4 h-4" />} label="صحة التجربة" value={summary?.pilot_health?.score || 0} color="rose" />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="usage" className="space-y-4">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            <TabsTrigger value="usage" className="text-xs">📊 الاستخدام</TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs">🧒 التفاعل</TabsTrigger>
            <TabsTrigger value="parents" className="text-xs">👨‍👩‍👧 الأهل</TabsTrigger>
            <TabsTrigger value="academic" className="text-xs">📚 العمليات</TabsTrigger>
            <TabsTrigger value="cohort" className="text-xs">👥 المجموعة</TabsTrigger>
            <TabsTrigger value="quality" className="text-xs">⚡ الجودة</TabsTrigger>
          </TabsList>

          {/* Usage Tracking Tab */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* DAU Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">المستخدمون النشطون يومياً</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {usage?.dau?.slice(0, 7).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-20">{d.date.slice(5)}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full flex items-center justify-end px-2"
                            style={{ width: `${Math.max(10, (d.dau / Math.max(...(usage?.dau?.map(x => x.dau) || [1]))) * 100)}%` }}
                          >
                            <span className="text-[10px] text-white font-bold">{d.dau}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-sm text-gray-500">المتوسط: </span>
                    <span className="font-bold text-blue-700">{usage?.avg_dau || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Session Duration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">توزيع مدة الجلسات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {usage?.session_duration_distribution && Object.entries(usage.session_duration_distribution).map(([bucket, count]) => (
                      <div key={bucket} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-16">{bucket}</span>
                        <div className="flex-1">
                          <Progress value={Math.min(100, (count / Math.max(...Object.values(usage.session_duration_distribution), 1)) * 100)} className="h-4" />
                        </div>
                        <span className="text-sm font-bold w-8">{count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 rounded text-center">
                    <span className="text-sm text-gray-600">متوسط المدة: </span>
                    <span className="font-bold text-blue-700">{Math.round((usage?.avg_session_duration || 0) / 60)} دقيقة</span>
                  </div>
                </CardContent>
              </Card>

              {/* Retention & Dropout */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">الاحتفاظ والانسحاب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">{usage?.retention?.rate_percent || 0}%</p>
                      <p className="text-xs text-gray-600">معدل العودة</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-700">{usage?.dropout?.rate || 0}%</p>
                      <p className="text-xs text-gray-600">معدل الانسحاب</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <StatRow label="مستخدمون عائدون" value={`${usage?.retention?.returning_users || 0} / ${usage?.retention?.total_users || 0}`} />
                    <StatRow label="جلسات منسحبة" value={`${usage?.dropout?.count || 0}`} />
                    <StatRow label="إعادات المحاولة" value={`${usage?.retry_behavior?.total_retries || 0}`} />
                  </div>
                </CardContent>
              </Card>

              {/* Mastery & Missions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">الإتقان والمهام</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-700">{usage?.mastery_progression?.avg_mastery_level || 0}%</p>
                      <p className="text-xs text-gray-600">متوسط الإتقان</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-700">{usage?.mission_completion?.avg_per_session || 0}</p>
                      <p className="text-xs text-gray-600">مهام/جلسة</p>
                    </div>
                  </div>
                  <StatRow label="سجلات إتقان محدّثة" value={`${usage?.mastery_progression?.records_updated || 0}`} />
                  <StatRow label="إجمالي المهام المنجزة" value={`${usage?.mission_completion?.total_missions_completed || 0}`} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Child Engagement Tab */}
          <TabsContent value="engagement" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Boredom Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" /> تحليل الملل والتفاعل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 rounded-lg" style={{ background: getBoredomColor(engagement?.boredom?.boredom_rate || 0) }}>
                    <p className="text-3xl font-bold">{engagement?.boredom?.boredom_rate || 0}%</p>
                    <p className="text-sm">معدل الملل</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-bold">{engagement?.boredom?.low_engagement_sessions || 0}</p>
                      <p className="text-xs text-gray-500">جلسات منخفضة التفاعل</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-bold">{engagement?.boredom?.total_scored_sessions || 0}</p>
                      <p className="text-xs text-gray-500">إجمالي الجلسات المقيّمة</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dropout Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">📍 نقاط الانسحاب</CardTitle>
                </CardHeader>
                <CardContent>
                  {engagement?.dropout_locations && engagement.dropout_locations.length > 0 ? (
                    <div className="space-y-2">
                      {engagement.dropout_locations.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm">{translatePage(d.page)}</span>
                          <Badge variant="destructive">{d.count} مرة</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">لا توجد بيانات انسحاب بعد</p>
                  )}
                </CardContent>
              </Card>

              {/* Hardest Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">🎯 أصعب المهارات</CardTitle>
                </CardHeader>
                <CardContent>
                  {engagement?.hardest_skills && engagement.hardest_skills.length > 0 ? (
                    <div className="space-y-2">
                      {engagement.hardest_skills.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <span className="text-sm">مهارة #{s.skill_id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{s.attempts} محاولة</span>
                            <Badge variant="outline" className="text-orange-700">{s.avg_mastery}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">لا توجد بيانات كافية</p>
                  )}
                </CardContent>
              </Card>

              {/* Hourly Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">⏰ التفاعل حسب الساعة</CardTitle>
                </CardHeader>
                <CardContent>
                  {engagement?.hourly_engagement && engagement.hourly_engagement.length > 0 ? (
                    <div className="space-y-1">
                      {engagement.hourly_engagement.filter(h => h.sessions > 0).map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs w-12">{h.hour}:00</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                              className="bg-indigo-400 h-full rounded-full"
                              style={{ width: `${Math.min(100, (h.sessions / Math.max(...engagement.hourly_engagement.map(x => x.sessions), 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs w-8">{h.sessions}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>

              {/* Recommendations */}
              {engagement?.recommendations && engagement.recommendations.length > 0 && (
                <Card className="md:col-span-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg font-tajawal text-blue-800">💡 توصيات التحسين</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {engagement.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Parents Tab */}
          <TabsContent value="parents" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Parent Feedback Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">ملخص ملاحظات الأهل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xl font-bold text-blue-700">{parentFeedback?.total_reports || 0}</p>
                      <p className="text-xs text-gray-600">إجمالي التقارير</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xl font-bold text-red-700">{parentFeedback?.open_issues || 0}</p>
                      <p className="text-xs text-gray-600">مفتوحة</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-xl font-bold text-amber-700">{parentFeedback?.parent_feedback?.avg_rating || 0}/5</p>
                      <p className="text-xs text-gray-600">متوسط التقييم</p>
                    </div>
                  </div>

                  {parentFeedback?.by_type && Object.keys(parentFeedback.by_type).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">حسب النوع</h4>
                      {Object.entries(parentFeedback.by_type).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>{reportTypeLabel(type)}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {parentFeedback?.by_severity && Object.keys(parentFeedback.by_severity).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">حسب الخطورة</h4>
                      <div className="flex gap-2">
                        {Object.entries(parentFeedback.by_severity).map(([sev, count]) => (
                          <Badge key={sev} variant={sev === 'high' ? 'destructive' : 'outline'} className="text-xs">
                            {severityLabel(sev)}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Parent Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">📝 إرسال ملاحظة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger><SelectValue placeholder="نوع الملاحظة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confusion">حيرة / عدم فهم</SelectItem>
                      <SelectItem value="usability">صعوبة استخدام</SelectItem>
                      <SelectItem value="feedback">ملاحظة عامة</SelectItem>
                      <SelectItem value="suggestion">اقتراح تحسين</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={reportSeverity} onValueChange={setReportSeverity}>
                    <SelectTrigger><SelectValue placeholder="الخطورة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="اوصف ملاحظتك بالتفصيل..."
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    rows={4}
                  />

                  <Button onClick={submitParentReport} disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800">
                    <Send className="w-4 h-4 ml-2" />
                    {submitting ? 'جاري الإرسال...' : 'إرسال الملاحظة'}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Reports */}
              {parentFeedback?.recent_reports && parentFeedback.recent_reports.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg font-tajawal">آخر التقارير</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {parentFeedback.recent_reports.map((r) => (
                        <div key={r.id} className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{reportTypeLabel(r.type)}</Badge>
                              <Badge variant={r.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                {severityLabel(r.severity)}
                              </Badge>
                            </div>
                            <Badge variant={r.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                              {statusLabel(r.status)}
                            </Badge>
                          </div>
                          <p className="text-gray-700">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Academic Ops Tab */}
          <TabsContent value="academic" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Efficiency Score */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">⚡ كفاءة العمليات الأكاديمية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto" style={{ borderColor: getScoreColor(academicOps?.efficiency_score?.score || 0) }}>
                        <span className="text-2xl font-bold">{academicOps?.efficiency_score?.score || 0}</span>
                      </div>
                      <p className="mt-2 font-medium">{academicOps?.efficiency_score?.level || '-'}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <StatRow label="معدل الإنتاج (يومياً)" value={`${academicOps?.efficiency_score?.production_rate || 0}`} />
                      <StatRow label="معدل المراجعة (يومياً)" value={`${academicOps?.efficiency_score?.review_rate || 0}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content Production */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">📝 إنتاج المحتوى</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xl font-bold text-blue-700">{academicOps?.content_production?.new_skills || 0}</p>
                      <p className="text-xs text-gray-600">مهارات جديدة</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xl font-bold text-green-700">{academicOps?.content_production?.new_questions || 0}</p>
                      <p className="text-xs text-gray-600">أسئلة جديدة</p>
                    </div>
                  </div>
                  <StatRow label="مهارات/يوم" value={`${academicOps?.content_production?.skills_per_day || 0}`} />
                  <StatRow label="أسئلة/يوم" value={`${academicOps?.content_production?.questions_per_day || 0}`} />
                </CardContent>
              </Card>

              {/* Review & Team Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">👥 تجربة الفريق</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">المحررون</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span>التقييم</span>
                      <StarDisplay value={academicOps?.editor_experience?.avg_rating || 0} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>سهولة الاستخدام</span>
                      <StarDisplay value={academicOps?.editor_experience?.avg_ease || 0} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">المراجعون</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span>التقييم</span>
                      <StarDisplay value={academicOps?.reviewer_experience?.avg_rating || 0} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>سهولة الاستخدام</span>
                      <StarDisplay value={academicOps?.reviewer_experience?.avg_ease || 0} />
                    </div>
                  </div>
                  <StatRow label="إجمالي المراجعات" value={`${academicOps?.review_activity?.total_reviews || 0}`} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cohort Tab */}
          <TabsContent value="cohort" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">👥 مجموعة التجربة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm">السعة</span>
                    <span className="font-bold">{cohort?.capacity?.current || 0} / {cohort?.capacity?.max || 30}</span>
                  </div>
                  <Progress value={((cohort?.capacity?.current || 0) / (cohort?.capacity?.max || 30)) * 100} className="h-3" />

                  <div className="grid grid-cols-2 gap-3">
                    <CohortCard label="طلاب صف 1" value={cohort?.students_grade1 || 0} emoji="👦" />
                    <CohortCard label="طلاب صف 2" value={cohort?.students_grade2 || 0} emoji="👧" />
                    <CohortCard label="أولياء أمور" value={cohort?.parents || 0} emoji="👨‍👩‍👧" />
                    <CohortCard label="فريق أكاديمي" value={cohort?.academic_team || 0} emoji="📋" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">📊 حالة النشاط</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">{cohort?.active_accounts || 0}</p>
                      <p className="text-xs text-gray-600">حسابات نشطة</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{cohort?.active_last_7_days || 0}</p>
                      <p className="text-xs text-gray-600">نشطون (7 أيام)</p>
                    </div>
                  </div>

                  {cohort?.by_type && Object.keys(cohort.by_type).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">التوزيع التفصيلي</h4>
                      {Object.entries(cohort.by_type).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>{accountTypeLabel(type)}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Feature Freeze */}
              <Card className="md:col-span-2 border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal text-amber-800">⚠️ تجميد التوسعات - فترة التجربة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-700 mb-3">خلال فترة التجربة التنفيذية، التركيز على:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['مراقبة الاستخدام', 'جمع الملاحظات', 'إصلاح المشاكل', 'تحسين التفاعل', 'دعم الأهل', 'تقييم الجودة'].map((item) => (
                      <div key={item} className="flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="w-3 h-3" /> {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['صفوف جديدة', 'مواد جديدة', 'Marketplace', 'Billing', 'Social', 'Marketing'].map((item) => (
                      <div key={item} className="flex items-center gap-1 text-xs text-red-600">
                        <span>✗</span> {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Misconceptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">🔴 أكثر المفاهيم الخاطئة شيوعاً</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.common_misconceptions && summary.common_misconceptions.length > 0 ? (
                    <div className="space-y-2">
                      {summary.common_misconceptions.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm">مهارة #{m.skill_id}</span>
                          <Badge variant="destructive">{m.count} خطأ</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">لا توجد بيانات كافية</p>
                  )}
                </CardContent>
              </Card>

              {/* Low Quality Questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">⚠️ أسئلة تحتاج مراجعة</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.low_quality_questions && summary.low_quality_questions.length > 0 ? (
                    <div className="space-y-2">
                      {summary.low_quality_questions.map((q, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                          <span className="text-sm">سؤال #{q.question_id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{q.total} محاولة</span>
                            <Badge variant="outline" className="text-red-600">{q.accuracy}% صحة</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">جميع الأسئلة بجودة مقبولة ✓</p>
                  )}
                </CardContent>
              </Card>

              {/* Friction Points */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-tajawal">🔥 نقاط الاحتكاك</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.friction_points && summary.friction_points.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {summary.friction_points.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">{translatePage(f.page)}</span>
                          </div>
                          <Badge variant="outline" className="text-orange-700">{f.events}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">لا توجد نقاط احتكاك مسجلة ✓</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper Components
function QuickStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className={`inline-flex p-1.5 rounded-lg mb-1 ${colorMap[color] || 'bg-gray-50'}`}>{icon}</div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}

function CohortCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <span className="text-2xl">{emoji}</span>
      <p className="text-lg font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
      <span className="text-xs text-gray-500 mr-1">{value}</span>
    </div>
  );
}

function HealthBadge({ health }: { health?: { score: number; status: string } }) {
  if (!health) return null;
  const color = health.score >= 80 ? 'bg-green-100 text-green-800' : health.score >= 60 ? 'bg-blue-100 text-blue-800' : health.score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  return (
    <Badge className={`${color} text-xs`}>
      <Shield className="w-3 h-3 ml-1" />
      {health.status} ({health.score})
    </Badge>
  );
}

function getBoredomColor(rate: number): string {
  if (rate < 20) return '#ecfdf5';
  if (rate < 40) return '#fef3c7';
  return '#fef2f2';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#3b82f6';
  return '#f59e0b';
}

function translatePage(page: string): string {
  const map: Record<string, string> = {
    diagnostic: 'التشخيص',
    quiz: 'الاختبار',
    dashboard: 'لوحة التحكم',
    'skills-engine': 'محرك المهارات',
    'skills-map': 'خريطة المهارات',
    unknown: 'غير محدد',
  };
  return map[page] || page;
}

function reportTypeLabel(type: string): string {
  const map: Record<string, string> = {
    confusion: 'حيرة',
    usability: 'صعوبة استخدام',
    feedback: 'ملاحظة',
    suggestion: 'اقتراح',
  };
  return map[type] || type;
}

function severityLabel(sev: string): string {
  const map: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
  return map[sev] || sev;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { open: 'مفتوح', reviewed: 'تمت المراجعة', resolved: 'تم الحل' };
  return map[status] || status;
}

function accountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    student_grade1: 'طالب صف 1',
    student_grade2: 'طالب صف 2',
    parent: 'ولي أمر',
    admin: 'مدير',
    editor: 'محرر',
    reviewer: 'مراجع',
  };
  return map[type] || type;
}