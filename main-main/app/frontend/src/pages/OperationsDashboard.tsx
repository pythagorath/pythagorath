import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, Activity, AlertTriangle, BarChart3, Bot,
  CheckCircle2, Clock, Layers, Play, RefreshCw, Scale,
  Target, TrendingUp, XCircle, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@metagptx/web-sdk';

const client = createClient();

interface FrictionPoint {
  area: string;
  severity: string;
  description: string;
  recommendation: string;
  metric_value?: number;
}

interface OperationalMetrics {
  total_skills: number;
  total_questions: number;
  total_reviews: number;
  avg_time_to_publish_days: number;
  pending_reviews: number;
  low_quality_questions: number;
  skills_missing_remediation: number;
  skills_missing_retention: number;
  approval_bottleneck_count: number;
  content_velocity_per_day: number;
  friction_points: FrictionPoint[];
}

interface PipelineStatus {
  skills_pipeline: Record<string, number>;
  questions_pipeline: Record<string, number>;
  recent_activity_24h: Record<string, number>;
  stale_items: { skills: number; questions: number };
}

interface WorkflowSimResult {
  simulated_roles: string[];
  actions_performed: Array<{ role: string; action: string; entity: string; result: string }>;
  bottlenecks_detected: string[];
  avg_review_time_hours: number;
  rejection_rate: number;
  total_items_processed: number;
}

interface ScalingResult {
  current_state: { skills: number; questions: number; skills_per_day: number; questions_per_day: number; reviews_per_day: number };
  target: { skills: number; questions: number; reviewers: number };
  gap_analysis: { skills_needed: number; questions_needed: number; days_to_target_skills: number; days_to_target_questions: number };
  capacity: { review_capacity_per_reviewer_per_day: number; estimated_reviewer_load_at_scale: number };
  risks: Array<{ risk: string; severity: string; detail: string; mitigation: string }>;
  organizational_health: string;
}

interface LifecycleItem {
  entity_type: string;
  entity_id: number;
  name: string;
  current_status: string;
  transitions: Array<{ from: string; to: string; action: string; date: string; notes: string }>;
  days_in_current_status: number;
  total_lifecycle_days: number;
}

export default function OperationsDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [simResult, setSimResult] = useState<WorkflowSimResult | null>(null);
  const [scalingResult, setScalingResult] = useState<ScalingResult | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [scalingSimulating, setScalingSimulating] = useState(false);
  const [lifecycleType, setLifecycleType] = useState('skill');
  const [scalingSkills, setScalingSkills] = useState('100');
  const [scalingQPerSkill, setScalingQPerSkill] = useState('10');
  const [scalingReviewers, setScalingReviewers] = useState('3');

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/operations/analytics',
        method: 'GET',
        data: {},
      });
      setMetrics(response.data);
    } catch { toast.error('فشل في تحميل التحليلات'); }
  }, []);

  const fetchPipeline = useCallback(async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/operations/pipeline-status',
        method: 'GET',
        data: {},
      });
      setPipeline(response.data);
    } catch { /* silent */ }
  }, []);

  const fetchLifecycle = useCallback(async () => {
    try {
      const response = await client.apiCall.invoke({
        url: `/api/v1/operations/content-lifecycle?entity_type=${lifecycleType}&limit=20`,
        method: 'GET',
        data: {},
      });
      setLifecycle(response.data?.items || []);
    } catch { /* silent */ }
  }, [lifecycleType]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchPipeline()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchMetrics, fetchPipeline]);

  useEffect(() => { fetchLifecycle(); }, [fetchLifecycle]);

  const runWorkflowSimulation = async () => {
    setSimulating(true);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/operations/simulate-workflow',
        method: 'POST',
        data: {},
      });
      setSimResult(response.data);
      toast.success('تم تشغيل المحاكاة بنجاح');
      // Refresh metrics after simulation
      fetchMetrics();
      fetchPipeline();
    } catch { toast.error('فشل في تشغيل المحاكاة'); }
    finally { setSimulating(false); }
  };

  const runScalingSimulation = async () => {
    setScalingSimulating(true);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/operations/simulate-scaling',
        method: 'POST',
        data: {
          num_skills: parseInt(scalingSkills) || 100,
          num_questions_per_skill: parseInt(scalingQPerSkill) || 10,
          num_reviewers: parseInt(scalingReviewers) || 3,
        },
      });
      setScalingResult(response.data);
      toast.success('تم تشغيل محاكاة التوسع');
    } catch { toast.error('فشل في محاكاة التوسع'); }
    finally { setScalingSimulating(false); }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'approved': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const healthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'at_risk': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const healthLabel = (health: string) => {
    switch (health) {
      case 'healthy': return 'صحي';
      case 'at_risk': return 'في خطر';
      case 'critical': return 'حرج';
      default: return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50" dir="rtl">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600" />
            لوحة العمليات والمحاكاة
          </h1>
          <p className="text-gray-500 mt-1">تحليل سير العمل، كشف الاختناقات، ومحاكاة التوسع</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowRight className="w-4 h-4 ml-1" /> لوحة الإدارة
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="pipeline">خط الإنتاج</TabsTrigger>
          <TabsTrigger value="simulation">محاكاة سير العمل</TabsTrigger>
          <TabsTrigger value="scaling">محاكاة التوسع</TabsTrigger>
          <TabsTrigger value="lifecycle">دورة حياة المحتوى</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Layers className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{metrics?.total_skills || 0}</p>
                <p className="text-xs text-gray-500">إجمالي المهارات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 mx-auto text-green-500 mb-1" />
                <p className="text-2xl font-bold">{metrics?.total_questions || 0}</p>
                <p className="text-xs text-gray-500">إجمالي الأسئلة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                <p className="text-2xl font-bold">{metrics?.content_velocity_per_day || 0}</p>
                <p className="text-xs text-gray-500">نشر/يوم</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto text-orange-500 mb-1" />
                <p className="text-2xl font-bold">{metrics?.avg_time_to_publish_days || 0}</p>
                <p className="text-xs text-gray-500">أيام للنشر (متوسط)</p>
              </CardContent>
            </Card>
          </div>

          {/* Warning Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-yellow-200">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold">{metrics?.pending_reviews || 0}</p>
                  <p className="text-[10px] text-gray-500">في انتظار المراجعة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="p-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold">{metrics?.low_quality_questions || 0}</p>
                  <p className="text-[10px] text-gray-500">أسئلة ضعيفة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardContent className="p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold">{metrics?.approval_bottleneck_count || 0}</p>
                  <p className="text-[10px] text-gray-500">عنق زجاجة</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardContent className="p-3 flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold">{metrics?.total_reviews || 0}</p>
                  <p className="text-[10px] text-gray-500">إجمالي المراجعات</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Friction Points */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                نقاط الاحتكاك المكتشفة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.friction_points && metrics.friction_points.length > 0 ? (
                <div className="space-y-3">
                  {metrics.friction_points.map((fp, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${severityColor(fp.severity)}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {severityIcon(fp.severity)}
                        <span className="font-bold text-sm">{fp.area}</span>
                        <Badge variant="outline" className="text-[10px] mr-auto">
                          {fp.severity === 'high' ? 'عالي' : fp.severity === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                      </div>
                      <p className="text-sm">{fp.description}</p>
                      <p className="text-xs mt-1 opacity-75">💡 {fp.recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p>لا توجد نقاط احتكاك مكتشفة - النظام يعمل بسلاسة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          {pipeline && (
            <>
              {/* Skills Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">خط إنتاج المهارات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    {['draft', 'review', 'approved', 'published'].map((stage, i) => {
                      const count = pipeline.skills_pipeline[stage] || 0;
                      const total = Object.values(pipeline.skills_pipeline).reduce((a, b) => a + b, 0) || 1;
                      const pct = (count / total) * 100;
                      return (
                        <div key={stage} className="flex-1 text-center">
                          <div className={`h-2 rounded-full ${statusColor(stage)} mb-1`} style={{ opacity: Math.max(0.3, pct / 100) }} />
                          <p className="text-lg font-bold">{count}</p>
                          <p className="text-[10px] text-gray-500">
                            {stage === 'draft' ? 'مسودة' : stage === 'review' ? 'مراجعة' : stage === 'approved' ? 'معتمد' : 'منشور'}
                          </p>
                          {i < 3 && <span className="text-gray-300 text-lg">→</span>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Questions Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">خط إنتاج الأسئلة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    {['draft', 'review', 'approved', 'published'].map((stage, i) => {
                      const count = pipeline.questions_pipeline[stage] || 0;
                      const total = Object.values(pipeline.questions_pipeline).reduce((a, b) => a + b, 0) || 1;
                      const pct = (count / total) * 100;
                      return (
                        <div key={stage} className="flex-1 text-center">
                          <div className={`h-2 rounded-full ${statusColor(stage)} mb-1`} style={{ opacity: Math.max(0.3, pct / 100) }} />
                          <p className="text-lg font-bold">{count}</p>
                          <p className="text-[10px] text-gray-500">
                            {stage === 'draft' ? 'مسودة' : stage === 'review' ? 'مراجعة' : stage === 'approved' ? 'معتمد' : 'منشور'}
                          </p>
                          {i < 3 && <span className="text-gray-300 text-lg">→</span>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Stale Items & Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      عناصر راكدة (7+ أيام)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{pipeline.stale_items.skills}</p>
                        <p className="text-xs text-gray-500">مهارات</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{pipeline.stale_items.questions}</p>
                        <p className="text-xs text-gray-500">أسئلة</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      نشاط آخر 24 ساعة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(pipeline.recent_activity_24h).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(pipeline.recent_activity_24h).map(([action, count]) => (
                          <div key={action} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{action}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center">لا يوجد نشاط</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Workflow Simulation Tab */}
        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-500" />
                محاكاة سير العمل الأكاديمي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                تشغيل محاكاة كاملة لسير العمل مع أدوار متعددة (محرر، مراجع، مدير) لكشف الاختناقات وقياس الكفاءة.
              </p>
              <Button onClick={runWorkflowSimulation} disabled={simulating} className="w-full md:w-auto">
                {simulating ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <Play className="w-4 h-4 ml-2" />}
                {simulating ? 'جاري المحاكاة...' : 'تشغيل المحاكاة'}
              </Button>

              {simResult && (
                <div className="space-y-4 mt-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-indigo-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold text-indigo-700">{simResult.total_items_processed}</p>
                        <p className="text-[10px] text-gray-500">عناصر معالجة</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold text-green-700">{simResult.avg_review_time_hours.toFixed(1)}h</p>
                        <p className="text-[10px] text-gray-500">متوسط وقت المراجعة</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold text-red-700">{(simResult.rejection_rate * 100).toFixed(0)}%</p>
                        <p className="text-[10px] text-gray-500">معدل الرفض</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold text-blue-700">{simResult.simulated_roles.length}</p>
                        <p className="text-[10px] text-gray-500">أدوار محاكاة</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bottlenecks */}
                  {simResult.bottlenecks_detected.length > 0 && (
                    <Card className="border-red-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> اختناقات مكتشفة
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {simResult.bottlenecks_detected.map((b, i) => (
                            <li key={i} className="text-sm text-red-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3 shrink-0" /> {b}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions Log */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">سجل الإجراءات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {simResult.actions_performed.map((action, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 rounded">
                            <Badge variant="outline" className="text-[9px]">{action.role}</Badge>
                            <span className="text-gray-600">{action.action}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-medium">{action.entity}</span>
                            <span className="mr-auto text-gray-400">{action.result}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scaling Simulation Tab */}
        <TabsContent value="scaling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-500" />
                محاكاة التوسع التنظيمي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                محاكاة توسع المحتوى لاكتشاف نقاط الانهيار التنظيمي وتقدير الموارد المطلوبة.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">عدد المهارات المستهدف</Label>
                  <Input type="number" value={scalingSkills} onChange={(e) => setScalingSkills(e.target.value)} min={10} max={1000} />
                </div>
                <div>
                  <Label className="text-xs">أسئلة لكل مهارة</Label>
                  <Input type="number" value={scalingQPerSkill} onChange={(e) => setScalingQPerSkill(e.target.value)} min={3} max={50} />
                </div>
                <div>
                  <Label className="text-xs">عدد المراجعين</Label>
                  <Input type="number" value={scalingReviewers} onChange={(e) => setScalingReviewers(e.target.value)} min={1} max={20} />
                </div>
              </div>

              <Button onClick={runScalingSimulation} disabled={scalingSimulating} className="w-full md:w-auto">
                {scalingSimulating ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <Scale className="w-4 h-4 ml-2" />}
                {scalingSimulating ? 'جاري المحاكاة...' : 'محاكاة التوسع'}
              </Button>

              {scalingResult && (
                <div className="space-y-4 mt-4">
                  {/* Health Badge */}
                  <div className="text-center">
                    <Badge className={`text-lg px-4 py-2 ${healthColor(scalingResult.organizational_health)}`}>
                      صحة المنظمة: {healthLabel(scalingResult.organizational_health)}
                    </Badge>
                  </div>

                  {/* Current vs Target */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-blue-50">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">الوضع الحالي</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>المهارات:</span><strong>{scalingResult.current_state.skills}</strong></div>
                        <div className="flex justify-between"><span>الأسئلة:</span><strong>{scalingResult.current_state.questions}</strong></div>
                        <div className="flex justify-between"><span>مهارات/يوم:</span><strong>{scalingResult.current_state.skills_per_day}</strong></div>
                        <div className="flex justify-between"><span>أسئلة/يوم:</span><strong>{scalingResult.current_state.questions_per_day}</strong></div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">الفجوة</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>مهارات مطلوبة:</span><strong>{scalingResult.gap_analysis.skills_needed}</strong></div>
                        <div className="flex justify-between"><span>أسئلة مطلوبة:</span><strong>{scalingResult.gap_analysis.questions_needed}</strong></div>
                        <div className="flex justify-between"><span>أيام للمهارات:</span><strong>{scalingResult.gap_analysis.days_to_target_skills}</strong></div>
                        <div className="flex justify-between"><span>أيام للأسئلة:</span><strong>{scalingResult.gap_analysis.days_to_target_questions}</strong></div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Progress Bars */}
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>تقدم المهارات</span>
                          <span>{scalingResult.current_state.skills}/{scalingResult.target.skills}</span>
                        </div>
                        <Progress value={(scalingResult.current_state.skills / Math.max(scalingResult.target.skills, 1)) * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>تقدم الأسئلة</span>
                          <span>{scalingResult.current_state.questions}/{scalingResult.target.questions}</span>
                        </div>
                        <Progress value={(scalingResult.current_state.questions / Math.max(scalingResult.target.questions, 1)) * 100} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risks */}
                  {scalingResult.risks.length > 0 && (
                    <Card className="border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-amber-500" /> مخاطر التوسع
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {scalingResult.risks.map((risk, i) => (
                          <div key={i} className={`p-2 rounded border ${severityColor(risk.severity)}`}>
                            <div className="flex items-center gap-2">
                              {severityIcon(risk.severity)}
                              <span className="font-bold text-sm">{risk.risk}</span>
                            </div>
                            <p className="text-xs mt-1">{risk.detail}</p>
                            <p className="text-xs mt-1 opacity-75">💡 {risk.mitigation}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lifecycle Tab */}
        <TabsContent value="lifecycle" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-teal-500" />
                  دورة حياة المحتوى
                </CardTitle>
                <Select value={lifecycleType} onValueChange={setLifecycleType}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skill">المهارات</SelectItem>
                    <SelectItem value="question">الأسئلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {lifecycle.length > 0 ? (
                <div className="space-y-3">
                  {lifecycle.map((item) => (
                    <div key={`${item.entity_type}-${item.entity_id}`} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold line-clamp-1 flex-1">{item.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${statusColor(item.current_status)} text-white`}>
                            {item.current_status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {item.days_in_current_status}ي في الحالة الحالية
                          </Badge>
                        </div>
                      </div>
                      {item.transitions.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.transitions.slice(-5).map((t, i) => (
                            <div key={i} className="flex items-center gap-0.5">
                              <Badge variant="outline" className="text-[9px] bg-gray-50">
                                {t.from || '—'} → {t.to}
                              </Badge>
                              {i < Math.min(item.transitions.length - 1, 4) && (
                                <span className="text-gray-300 text-xs">•</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                        <span>عمر المحتوى: {item.total_lifecycle_days} يوم</span>
                        <span>انتقالات: {item.transitions.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2" />
                  <p>لا توجد بيانات دورة حياة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}