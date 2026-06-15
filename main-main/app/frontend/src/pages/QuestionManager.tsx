import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight, Plus, Edit, Trash2, Eye, FileQuestion,
  RefreshCw, CheckCircle2, Image, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@metagptx/web-sdk';

const client = createClient();

interface Question {
  id: number;
  skill_id: number;
  question_text: string;
  question_type: string;
  options?: string;
  correct_answer: string;
  difficulty_level?: string;
  has_visual?: boolean;
  visual_type?: string;
  visual_data?: string;
  misconception_tag?: string;
  hint_text?: string;
  explanation?: string;
  review_status?: string;
  performance_score?: number;
  attempt_count?: number;
  category?: string;
}

interface Skill {
  id: number;
  name: string;
  grade: string;
}

const EMPTY_QUESTION: Partial<Question> = {
  skill_id: 0, question_text: '', question_type: 'multiple_choice',
  options: '', correct_answer: '', difficulty_level: 'medium',
  has_visual: false, visual_type: '', visual_data: '',
  misconception_tag: '', hint_text: '', explanation: '',
  review_status: 'draft', category: 'diagnostic',
};

export default function QuestionManager() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [filterSkillId, setFilterSkillId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await client.entities.curriculum_questions.query({ query: {}, sort: '-created_at', limit: 200 });
      setQuestions(response.data?.items || []);
    } catch { toast.error('فشل في تحميل الأسئلة'); } finally { setLoading(false); }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const response = await client.entities.curriculum_skills.query({ query: {}, limit: 200 });
      setSkills(response.data?.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchQuestions(); fetchSkills(); }, [fetchQuestions, fetchSkills]);

  const handleSaveQuestion = async () => {
    if (!editingQuestion?.question_text || !editingQuestion?.skill_id) {
      toast.error('نص السؤال والمهارة مطلوبان');
      return;
    }
    try {
      if (editingQuestion.id) {
        await client.entities.curriculum_questions.update({ id: String(editingQuestion.id), data: editingQuestion });
        toast.success('تم تحديث السؤال');
      } else {
        await client.entities.curriculum_questions.create({ data: editingQuestion });
        toast.success('تم إنشاء السؤال');
      }
      setIsDialogOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch { toast.error('فشل في حفظ السؤال'); }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      await client.entities.curriculum_questions.delete({ id: String(id) });
      toast.success('تم حذف السؤال');
      fetchQuestions();
    } catch { toast.error('فشل في حذف السؤال'); }
  };

  const filteredQuestions = questions.filter(q => {
    if (filterSkillId !== 'all' && q.skill_id !== parseInt(filterSkillId)) return false;
    if (filterStatus !== 'all' && (q.review_status || 'draft') !== filterStatus) return false;
    if (searchTerm && !q.question_text.includes(searchTerm)) return false;
    return true;
  });

  const getSkillName = (skillId: number) => skills.find(s => s.id === skillId)?.name || `مهارة #${skillId}`;

  const statusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'منشور';
      case 'approved': return 'معتمد';
      case 'review': return 'مراجعة';
      default: return 'مسودة';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal flex items-center gap-2">
            <FileQuestion className="w-7 h-7 text-indigo-600" />
            إدارة الأسئلة
          </h1>
          <p className="text-gray-500 mt-1">إنشاء وتعديل ومراجعة بنك الأسئلة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowRight className="w-4 h-4 ml-1" /> لوحة الإدارة
          </Button>
          <Button onClick={() => { setEditingQuestion({ ...EMPTY_QUESTION }); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 ml-1" /> سؤال جديد
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="بحث في الأسئلة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-56"
            />
            <Select value={filterSkillId} onValueChange={setFilterSkillId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="المهارة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المهارات</SelectItem>
                {skills.slice(0, 50).map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="review">مراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filteredQuestions.length} سؤال</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <Card className="col-span-full"><CardContent className="p-8 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></CardContent></Card>
        ) : filteredQuestions.length === 0 ? (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-gray-500">لا توجد أسئلة مطابقة</CardContent></Card>
        ) : (
          filteredQuestions.slice(0, 40).map(q => (
            <Card key={q.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{q.question_text}</p>
                  <Badge className={statusColor(q.review_status || 'draft')}>{statusLabel(q.review_status || 'draft')}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge variant="outline" className="text-[10px]">{getSkillName(q.skill_id)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{q.difficulty_level || 'متوسط'}</Badge>
                  {q.has_visual && <Badge variant="outline" className="text-[10px] bg-purple-50"><Image className="w-3 h-3 ml-1" />بصري</Badge>}
                  {q.misconception_tag && <Badge variant="outline" className="text-[10px] bg-red-50">{q.misconception_tag}</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {q.attempt_count ? `${q.attempt_count} محاولة` : 'بدون محاولات'}
                    {q.performance_score != null && ` • أداء: ${(q.performance_score * 100).toFixed(0)}%`}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewQuestion(q)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingQuestion(q); setIsDialogOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteQuestion(q.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Question Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingQuestion?.id ? 'تعديل السؤال' : 'إنشاء سؤال جديد'}</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              <div>
                <Label>المهارة المرتبطة</Label>
                <Select value={String(editingQuestion.skill_id || '')} onValueChange={(v) => setEditingQuestion(prev => ({ ...prev!, skill_id: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="اختر المهارة" /></SelectTrigger>
                  <SelectContent>
                    {skills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نص السؤال</Label>
                <Textarea
                  value={editingQuestion.question_text || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev!, question_text: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>نوع السؤال</Label>
                  <Select value={editingQuestion.question_type || 'multiple_choice'} onValueChange={(v) => setEditingQuestion(prev => ({ ...prev!, question_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">اختيار متعدد</SelectItem>
                      <SelectItem value="true_false">صح/خطأ</SelectItem>
                      <SelectItem value="fill_blank">إكمال</SelectItem>
                      <SelectItem value="ordering">ترتيب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الصعوبة</Label>
                  <Select value={editingQuestion.difficulty_level || 'medium'} onValueChange={(v) => setEditingQuestion(prev => ({ ...prev!, difficulty_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">سهل</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>الخيارات (مفصولة بفاصلة)</Label>
                <Input
                  placeholder="خيار1, خيار2, خيار3, خيار4"
                  value={editingQuestion.options || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev!, options: e.target.value }))}
                />
              </div>
              <div>
                <Label>الإجابة الصحيحة</Label>
                <Input
                  value={editingQuestion.correct_answer || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev!, correct_answer: e.target.value }))}
                />
              </div>
              <div>
                <Label>تلميح</Label>
                <Input
                  value={editingQuestion.hint_text || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev!, hint_text: e.target.value }))}
                />
              </div>
              <div>
                <Label>الشرح</Label>
                <Textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev!, explanation: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>وسم المفهوم الخاطئ</Label>
                  <Input
                    value={editingQuestion.misconception_tag || ''}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev!, misconception_tag: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>التصنيف</Label>
                  <Select value={editingQuestion.category || 'diagnostic'} onValueChange={(v) => setEditingQuestion(prev => ({ ...prev!, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagnostic">تشخيصي</SelectItem>
                      <SelectItem value="remedial">علاجي</SelectItem>
                      <SelectItem value="retention">احتفاظ</SelectItem>
                      <SelectItem value="enrichment">إثرائي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editingQuestion.has_visual || false}
                  onCheckedChange={(v) => setEditingQuestion(prev => ({ ...prev!, has_visual: v }))}
                />
                <Label>يحتوي محتوى بصري</Label>
              </div>
              {editingQuestion.has_visual && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>نوع البصري</Label>
                    <Select value={editingQuestion.visual_type || ''} onValueChange={(v) => setEditingQuestion(prev => ({ ...prev!, visual_type: v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number_line">خط أعداد</SelectItem>
                        <SelectItem value="clock">ساعة</SelectItem>
                        <SelectItem value="shapes">أشكال</SelectItem>
                        <SelectItem value="counting">عد</SelectItem>
                        <SelectItem value="chart">رسم بياني</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>بيانات البصري (JSON)</Label>
                    <Input
                      value={editingQuestion.visual_data || ''}
                      onChange={(e) => setEditingQuestion(prev => ({ ...prev!, visual_data: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <div>
                <Label>حالة المراجعة</Label>
                <Select value={editingQuestion.review_status || 'draft'} onValueChange={(v) => setEditingQuestion(prev => ({ ...prev!, review_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="review">مراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="published">منشور</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveQuestion}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة السؤال</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-lg font-medium text-gray-900">{previewQuestion.question_text}</p>
              </div>
              {previewQuestion.options && (
                <div className="space-y-2">
                  {previewQuestion.options.split(',').map((opt, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border-2 ${opt.trim() === previewQuestion.correct_answer ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                    >
                      <span className="text-sm">{opt.trim()}</span>
                      {opt.trim() === previewQuestion.correct_answer && <CheckCircle2 className="w-4 h-4 text-green-600 inline mr-2" />}
                    </div>
                  ))}
                </div>
              )}
              {previewQuestion.hint_text && (
                <div className="bg-yellow-50 rounded p-3 text-sm">
                  <strong>تلميح:</strong> {previewQuestion.hint_text}
                </div>
              )}
              {previewQuestion.explanation && (
                <div className="bg-green-50 rounded p-3 text-sm">
                  <strong>الشرح:</strong> {previewQuestion.explanation}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{previewQuestion.question_type}</Badge>
                <Badge variant="outline">{previewQuestion.difficulty_level}</Badge>
                {previewQuestion.misconception_tag && <Badge variant="outline" className="bg-red-50">{previewQuestion.misconception_tag}</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}