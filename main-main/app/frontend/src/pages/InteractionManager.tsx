// Interaction Manager - Dedicated page for managing interactions with preview
import { useState, useEffect, useCallback } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InteractionRenderer } from '@/components/InteractionToolkit';
import {
  Plus, Search, Eye, EyeOff, Edit, Trash2, X, Save, Loader2,
  CheckCircle, XCircle, RefreshCw, ArrowLeft, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { INTERACTION_TYPE_LABELS, INTERACTION_TYPE_EMOJIS } from '@/lib/interactionService';

interface QuestionItem {
  id: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  status: string;
  config_json: string;
  skill_id: number;
  explanation: string;
  options: string;
  correct_answer: string;
}

export default function InteractionManager() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<QuestionItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.entities.admin_questions.query({
        query: {},
        sort: '-id',
        limit: 200,
      });
      setQuestions(response?.data?.items || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      toast.error('خطأ في تحميل الأسئلة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  const toggleStatus = async (item: QuestionItem) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      await client.entities.admin_questions.update({
        id: String(item.id),
        data: { status: newStatus },
      });
      toast.success(newStatus === 'published' ? 'تم النشر' : 'تم إلغاء النشر');
      fetchQuestions();
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error('خطأ في تغيير الحالة');
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedIds.size === 0) return;
    const newStatus = publish ? 'published' : 'draft';
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await client.entities.admin_questions.update({
          id: String(id),
          data: { status: newStatus },
        });
        successCount++;
      } catch {
        // continue
      }
    }
    toast.success(`تم تحديث ${successCount} عنصر`);
    setSelectedIds(new Set());
    setBulkAction(false);
    fetchQuestions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      await client.entities.admin_questions.delete({ id: String(id) });
      toast.success('تم الحذف');
      fetchQuestions();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('خطأ في الحذف');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} عنصر؟`)) return;
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await client.entities.admin_questions.delete({ id: String(id) });
        successCount++;
      } catch {
        // continue
      }
    }
    toast.success(`تم حذف ${successCount} عنصر`);
    setSelectedIds(new Set());
    setBulkAction(false);
    fetchQuestions();
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(q => q.id)));
    }
  };

  const filtered = questions.filter(q => {
    if (filterType !== 'all' && q.question_type !== filterType) return false;
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      return q.question_text.toLowerCase().includes(s) || q.question_type.includes(s);
    }
    return true;
  });

  const interactionTypes = ['tap', 'drag_drop', 'matching', 'number_line', 'counting_blocks', 'missing_number', 'sequence_ordering', 'shape_grouping', 'analog_clock', 'coin_money'];

  const getPreviewConfig = (item: QuestionItem) => {
    try {
      const config = JSON.parse(item.config_json || '{}');
      return {
        id: item.id,
        interaction_type: item.question_type,
        title: item.question_text,
        difficulty: item.difficulty as 'easy' | 'medium' | 'hard',
        cognitive_complexity: item.difficulty === 'hard' ? 'high' as const : item.difficulty === 'medium' ? 'medium' as const : 'low' as const,
        ...config,
      };
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-tajawal">إدارة التفاعلات التعليمية</h1>
            <p className="text-sm text-gray-500 font-tajawal mt-1">عرض ومعاينة ونشر التفاعلات التعليمية</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/crud/questions')} className="font-tajawal gap-1">
              <Plus className="w-4 h-4" />
              إضافة سؤال جديد
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="font-tajawal">
              <ArrowLeft className="w-4 h-4 ml-1" />
              لوحة التحكم
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="بحث في التفاعلات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 font-tajawal text-sm"
                  dir="rtl"
                />
              </div>
              <select
                className="text-sm border border-gray-200 rounded-md px-3 py-2 font-tajawal"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">كل الأنواع</option>
                {interactionTypes.map(t => (
                  <option key={t} value={t}>{INTERACTION_TYPE_EMOJIS?.[t] || ''} {INTERACTION_TYPE_LABELS?.[t] || t}</option>
                ))}
              </select>
              <select
                className="text-sm border border-gray-200 rounded-md px-3 py-2 font-tajawal"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="published">منشور</option>
                <option value="draft">مسودة</option>
              </select>
              <Button variant="outline" size="sm" onClick={fetchQuestions}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant={bulkAction ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setBulkAction(!bulkAction); setSelectedIds(new Set()); }}
                className="font-tajawal"
              >
                <Filter className="w-4 h-4 ml-1" />
                {bulkAction ? 'إلغاء التحديد' : 'تحديد متعدد'}
              </Button>
            </div>

            {/* Bulk Actions */}
            {bulkAction && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <span className="text-sm font-tajawal text-indigo-700">تم تحديد {selectedIds.size} عنصر</span>
                <Button size="sm" variant="outline" onClick={() => handleBulkPublish(true)} className="font-tajawal text-green-700 border-green-200 hover:bg-green-50">
                  <CheckCircle className="w-3.5 h-3.5 ml-1" />
                  نشر الكل
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkPublish(false)} className="font-tajawal text-amber-700 border-amber-200 hover:bg-amber-50">
                  <EyeOff className="w-3.5 h-3.5 ml-1" />
                  إلغاء نشر الكل
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete} className="font-tajawal text-red-700 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 ml-1" />
                  حذف الكل
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{questions.length}</p>
              <p className="text-xs text-gray-400 font-tajawal">إجمالي التفاعلات</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{questions.filter(q => q.status === 'published').length}</p>
              <p className="text-xs text-gray-400 font-tajawal">منشور</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{questions.filter(q => q.status === 'draft').length}</p>
              <p className="text-xs text-gray-400 font-tajawal">مسودة</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{new Set(questions.map(q => q.question_type)).size}</p>
              <p className="text-xs text-gray-400 font-tajawal">أنواع مختلفة</p>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="mr-2 text-gray-500 font-tajawal">جاري التحميل...</span>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400 font-tajawal text-lg">لا توجد تفاعلات</p>
              <p className="text-sm text-gray-300 mt-1">اضغط "إضافة سؤال جديد" لإنشاء تفاعل</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {bulkAction && (
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="font-tajawal text-xs">
                  {selectedIds.size === filtered.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </Button>
              </div>
            )}
            {filtered.map((item) => (
              <Card key={item.id} className={`border shadow-sm hover:shadow-md transition-all ${selectedIds.has(item.id) ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-100'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {bulkAction && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    )}
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {INTERACTION_TYPE_EMOJIS?.[item.question_type] || '❓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-tajawal font-medium text-gray-800 truncate">
                          {item.question_text || 'سؤال تفاعلي'}
                        </span>
                        <Badge variant={item.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                          {item.status === 'published' ? 'منشور' : 'مسودة'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {INTERACTION_TYPE_LABELS?.[item.question_type] || item.question_type}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${item.difficulty === 'hard' ? 'text-red-600' : item.difficulty === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>
                          {item.difficulty === 'hard' ? 'صعب' : item.difficulty === 'medium' ? 'متوسط' : 'سهل'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewItem(previewItem?.id === item.id ? null : item)} className="h-8 w-8 p-0" title="معاينة">
                        <Eye className="w-4 h-4 text-indigo-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleStatus(item)} className="h-8 w-8 p-0" title={item.status === 'published' ? 'إلغاء النشر' : 'نشر'}>
                        {item.status === 'published' ? <EyeOff className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/crud/questions')} className="h-8 w-8 p-0" title="تعديل">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 hover:text-red-500" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preview */}
                  {previewItem?.id === item.id && (
                    <div className="mt-4 p-4 bg-white border border-indigo-100 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-indigo-700 font-tajawal">معاينة التفاعل</h4>
                        <Button variant="ghost" size="sm" onClick={() => setPreviewItem(null)} className="h-6 w-6 p-0">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="max-w-md mx-auto">
                        {(() => {
                          const config = getPreviewConfig(item);
                          if (!config) return <p className="text-gray-400 text-sm font-tajawal text-center">لا يمكن عرض المعاينة</p>;
                          return (
                            <InteractionRenderer
                              config={config}
                              onComplete={() => toast.info('تم إكمال التفاعل (معاينة)')}
                              onSkip={() => {}}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}