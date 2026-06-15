import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, ArrowLeftRight, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Shield, Clock, FileCheck, Layers, Send, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@metagptx/web-sdk';

const client = createClient();

interface WorkflowStats {
  skills_draft: number;
  skills_review: number;
  skills_approved: number;
  skills_published: number;
  questions_draft: number;
  questions_review: number;
  questions_approved: number;
  questions_published: number;
  recent_reviews: Array<{
    id: number;
    entity_type: string;
    entity_id: number;
    action: string;
    previous_status: string;
    new_status: string;
    notes: string | null;
    created_at: string | null;
  }>;
}

interface QACheck {
  check_name: string;
  status: string;
  details: string;
  affected_items: number;
}

interface QAReport {
  total_checks: number;
  passed: number;
  warnings: number;
  failures: number;
  checks: QACheck[];
}

interface PendingItem {
  id: number;
  name: string;
  type: 'skill' | 'question';
  status: string;
  grade?: string;
}

export default function ProductionWorkflow() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [qaReport, setQaReport] = useState<QAReport | null>(null);
  const [pendingSkills, setPendingSkills] = useState<PendingItem[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [qaLoading, setQaLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');

  const fetchStats = useCallback(async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/academic-production/workflow-stats',
        method: 'GET',
        data: {},
      });
      setStats(response.data);
    } catch { toast.error('فشل في تحميل إحصائيات سير العمل'); }
  }, []);

  const fetchQAReport = useCallback(async () => {
    try {
      setQaLoading(true);
      const response = await client.apiCall.invoke({
        url: '/api/v1/academic-production/qa-report',
        method: 'GET',
        data: {},
      });
      setQaReport(response.data);
    } catch { toast.error('فشل في تحميل تقرير الجودة'); } finally { setQaLoading(false); }
  }, []);

  const fetchPendingItems = useCallback(async () => {
    try {
      const skillsRes = await client.entities.curriculum_skills.query({
        query: { status: 'review' }, limit: 50,
      });
      setPendingSkills((skillsRes.data?.items || []).map((s: any) => ({
        id: s.id, name: s.name, type: 'skill' as const, status: s.status || 'review', grade: s.grade,
      })));

      const questionsRes = await client.entities.curriculum_questions.query({
        query: { review_status: 'review' }, limit: 50,
      });
      setPendingQuestions((questionsRes.data?.items || []).map((q: any) => ({
        id: q.id, name: q.question_text?.substring(0, 60) + '...', type: 'question' as const, status: q.review_status || 'review',
      })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchPendingItems()]);
      setLoading(false);
    };
    load();
  }, [fetchStats, fetchPendingItems]);

  const handleTransition = async (entityType: string, entityId: number, newStatus: string) => {
    try {
      await client.apiCall.invoke({
        url: '/api/v1/academic-production/transition',
        method: 'POST',
        data: { entity_type: entityType, entity_id: entityId, new_status: newStatus },
      });
      toast.success('تم تغيير الحالة');
      fetchStats();
      fetchPendingItems();
    } catch { toast.error('فشل في تغيير الحالة'); }
  };

  const handleBulkTransition = async () => {
    if (!bulkAction || selectedItems.size === 0) {
      toast.error('اختر عناصر وحالة');
      return;
    }
    const skillIds: number[] = [];
    const questionIds: number[] = [];
    selectedItems.forEach(key => {
      const [type, id] = key.split('-');
      if (type === 'skill') skillIds.push(parseInt(id));
      else questionIds.push(parseInt(id));
    });

    try {
      if (skillIds.length > 0) {
        await client.apiCall.invoke({
          url: '/api/v1/academic-production/bulk-transition',
          method: 'POST',
          data: { entity_type: 'skill', entity_ids: skillIds, new_status: bulkAction },
        });
      }
      if (questionIds.length > 0) {
        await client.apiCall.invoke({
          url: '/api/v1/academic-production/bulk-transition',
          method: 'POST',
          data: { entity_type: 'question', entity_ids: questionIds, new_status: bulkAction },
        });
      }
      toast.success(`تم نقل ${selectedItems.size} عنصر`);
      setSelectedItems(new Set());
      setBulkAction('');
      fetchStats();
      fetchPendingItems();
    } catch { toast.error('فشل في النقل الجماعي'); }
  };

  const toggleSelect = (key: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const qaStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const qaStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'fail': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const totalSkills = (stats?.skills_draft || 0) + (stats?.skills_review || 0) + (stats?.skills_approved || 0) + (stats?.skills_published || 0);
  const totalQuestions = (stats?.questions_draft || 0) + (stats?.questions_review || 0) + (stats?.questions_approved || 0) + (stats?.questions_published || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-blue-600" />
            سير العمل الإنتاجي
          </h1>
          <p className="text-gray-500 mt-1">إدارة حالات المحتوى وضمان الجودة</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowRight className="w-4 h-4 ml-1" /> لوحة الإدارة
        </Button>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="pipeline">خط الإنتاج</TabsTrigger>
          <TabsTrigger value="review">المراجعة</TabsTrigger>
          <TabsTrigger value="qa">ضمان الجودة</TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          {/* Status Pipeline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'مسودة', skills: stats?.skills_draft || 0, questions: stats?.questions_draft || 0, color: 'bg-gray-100 border-gray-300', icon: <Clock className="w-5 h-5 text-gray-500" /> },
              { label: 'مراجعة', skills: stats?.skills_review || 0, questions: stats?.questions_review || 0, color: 'bg-yellow-50 border-yellow-300', icon: <FileCheck className="w-5 h-5 text-yellow-600" /> },
              { label: 'معتمد', skills: stats?.skills_approved || 0, questions: stats?.questions_approved || 0, color: 'bg-blue-50 border-blue-300', icon: <CheckCircle2 className="w-5 h-5 text-blue-600" /> },
              { label: 'منشور', skills: stats?.skills_published || 0, questions: stats?.questions_published || 0, color: 'bg-green-50 border-green-300', icon: <Send className="w-5 h-5 text-green-600" /> },
            ].map(stage => (
              <Card key={stage.label} className={`border-2 ${stage.color}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2">{stage.icon}</div>
                  <h3 className="font-bold text-lg">{stage.label}</h3>
                  <p className="text-sm text-gray-600">{stage.skills} مهارة</p>
                  <p className="text-sm text-gray-600">{stage.questions} سؤال</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Bars */}
          <Card>
            <CardHeader><CardTitle className="text-sm">تقدم النشر</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>المهارات</span>
                  <span>{totalSkills > 0 ? ((stats?.skills_published || 0) / totalSkills * 100).toFixed(0) : 0}% منشور</span>
                </div>
                <Progress value={totalSkills > 0 ? (stats?.skills_published || 0) / totalSkills * 100 : 0} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>الأسئلة</span>
                  <span>{totalQuestions > 0 ? ((stats?.questions_published || 0) / totalQuestions * 100).toFixed(0) : 0}% منشور</span>
                </div>
                <Progress value={totalQuestions > 0 ? (stats?.questions_published || 0) / totalQuestions * 100 : 0} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader><CardTitle className="text-sm">النشاط الأخير</CardTitle></CardHeader>
            <CardContent>
              {stats?.recent_reviews && stats.recent_reviews.length > 0 ? (
                <div className="space-y-2">
                  {stats.recent_reviews.slice(0, 5).map(review => (
                    <div key={review.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{review.entity_type}</Badge>
                        <span>#{review.entity_id}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Badge className="bg-gray-200 text-gray-700">{review.previous_status}</Badge>
                        <ArrowRight className="w-3 h-3" />
                        <Badge className="bg-blue-200 text-blue-700">{review.new_status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center">لا يوجد نشاط حديث</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-6">
          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3 flex items-center gap-3">
                <Badge>{selectedItems.size} محدد</Badge>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-36 h-8"><SelectValue placeholder="نقل إلى..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">اعتماد</SelectItem>
                    <SelectItem value="published">نشر</SelectItem>
                    <SelectItem value="draft">إرجاع للمسودة</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkTransition}>تنفيذ</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>إلغاء</Button>
              </CardContent>
            </Card>
          )}

          {/* Pending Skills */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" /> مهارات بانتظار المراجعة ({pendingSkills.length})</CardTitle></CardHeader>
            <CardContent>
              {pendingSkills.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">لا توجد مهارات بانتظار المراجعة</p>
              ) : (
                <div className="space-y-2">
                  {pendingSkills.map(item => (
                    <div key={`skill-${item.id}`} className="flex items-center justify-between bg-yellow-50 rounded p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`skill-${item.id}`)}
                          onChange={() => toggleSelect(`skill-${item.id}`)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.grade && <Badge variant="outline" className="text-[10px]">صف {item.grade}</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleTransition('skill', item.id, 'approved')}>
                          <CheckCircle2 className="w-3 h-3 ml-1" /> اعتماد
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleTransition('skill', item.id, 'draft')}>
                          إرجاع
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Questions */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileCheck className="w-4 h-4" /> أسئلة بانتظار المراجعة ({pendingQuestions.length})</CardTitle></CardHeader>
            <CardContent>
              {pendingQuestions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">لا توجد أسئلة بانتظار المراجعة</p>
              ) : (
                <div className="space-y-2">
                  {pendingQuestions.map(item => (
                    <div key={`question-${item.id}`} className="flex items-center justify-between bg-yellow-50 rounded p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`question-${item.id}`)}
                          onChange={() => toggleSelect(`question-${item.id}`)}
                          className="rounded"
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleTransition('question', item.id, 'approved')}>
                          <CheckCircle2 className="w-3 h-3 ml-1" /> اعتماد
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleTransition('question', item.id, 'draft')}>
                          إرجاع
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QA Tab */}
        <TabsContent value="qa" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">تقرير ضمان الجودة</h2>
            <Button onClick={fetchQAReport} disabled={qaLoading}>
              {qaLoading ? <RefreshCw className="w-4 h-4 animate-spin ml-1" /> : <Shield className="w-4 h-4 ml-1" />}
              تشغيل الفحص
            </Button>
          </div>

          {qaReport ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{qaReport.passed}</p>
                    <p className="text-xs text-green-600">ناجح</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-yellow-700">{qaReport.warnings}</p>
                    <p className="text-xs text-yellow-600">تحذيرات</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center">
                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-700">{qaReport.failures}</p>
                    <p className="text-xs text-red-600">فشل</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Checks */}
              <div className="space-y-3">
                {qaReport.checks.map((check, i) => (
                  <Card key={i} className={`border ${qaStatusColor(check.status)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {qaStatusIcon(check.status)}
                          <div>
                            <h4 className="font-medium text-sm">{check.check_name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{check.details}</p>
                          </div>
                        </div>
                        {check.affected_items > 0 && (
                          <Badge variant="outline">{check.affected_items} عنصر</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">اضغط "تشغيل الفحص" لإنشاء تقرير الجودة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}