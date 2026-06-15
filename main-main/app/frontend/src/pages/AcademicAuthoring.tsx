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
import { Slider } from '@/components/ui/slider';
import {
  ArrowRight, Plus, Edit, Trash2, BookOpen, Target,
  RefreshCw, Layers, Link2, Shield, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@metagptx/web-sdk';

const client = createClient();

interface Skill {
  id: number;
  name: string;
  grade: string;
  domain_id?: number;
  difficulty_level?: string;
  mastery_threshold?: number;
  min_questions_required?: number;
  min_visual_questions?: number;
  remediation_required?: boolean;
  retention_review_days?: number;
  status?: string;
}

interface Domain {
  id: number;
  name: string;
  grade?: string;
}

interface Prerequisite {
  id: number;
  name: string;
}

const EMPTY_SKILL = {
  name: '', grade: '1', domain_id: undefined as number | undefined,
  difficulty_level: 'medium', mastery_threshold: 0.8,
  min_questions_required: 3, min_visual_questions: 1,
  remediation_required: false, retention_review_days: 7,
  status: 'draft', prerequisite_ids: [] as number[],
};

export default function AcademicAuthoring() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<typeof EMPTY_SKILL & { id?: number } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [prerequisites, setPrerequisites] = useState<Prerequisite[]>([]);

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      const response = await client.entities.curriculum_skills.query({ query: {}, sort: '-created_at', limit: 200 });
      const items = response.data?.items || [];
      setSkills(items);
      setAllSkills(items);
    } catch { toast.error('فشل في تحميل المهارات'); } finally { setLoading(false); }
  }, []);

  const fetchDomains = useCallback(async () => {
    try {
      const response = await client.entities.curriculum_domains.query({ query: {}, limit: 100 });
      setDomains(response.data?.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchSkills(); fetchDomains(); }, [fetchSkills, fetchDomains]);

  const loadPrerequisites = async (skillId: number) => {
    try {
      const response = await client.apiCall.invoke({
        url: `/api/v1/academic-production/skills/${skillId}/prerequisites`,
        method: 'GET',
        data: {},
      });
      setPrerequisites(response.data?.prerequisites || []);
    } catch { setPrerequisites([]); }
  };

  const handleEditSkill = async (skill: Skill) => {
    await loadPrerequisites(skill.id);
    setEditingSkill({
      id: skill.id,
      name: skill.name,
      grade: skill.grade,
      domain_id: skill.domain_id,
      difficulty_level: skill.difficulty_level || 'medium',
      mastery_threshold: skill.mastery_threshold || 0.8,
      min_questions_required: skill.min_questions_required || 3,
      min_visual_questions: skill.min_visual_questions || 1,
      remediation_required: skill.remediation_required || false,
      retention_review_days: skill.retention_review_days || 7,
      status: skill.status || 'draft',
      prerequisite_ids: prerequisites.map(p => p.id),
    });
    setIsDialogOpen(true);
  };

  const handleSaveSkill = async () => {
    if (!editingSkill?.name || !editingSkill?.grade) {
      toast.error('اسم المهارة والصف مطلوبان');
      return;
    }
    try {
      if (editingSkill.id) {
        await client.apiCall.invoke({
          url: `/api/v1/academic-production/skills/${editingSkill.id}`,
          method: 'PUT',
          data: editingSkill,
        });
        toast.success('تم تحديث المهارة');
      } else {
        await client.apiCall.invoke({
          url: '/api/v1/academic-production/skills',
          method: 'POST',
          data: editingSkill,
        });
        toast.success('تم إنشاء المهارة');
      }
      setIsDialogOpen(false);
      setEditingSkill(null);
      fetchSkills();
    } catch { toast.error('فشل في حفظ المهارة'); }
  };

  const handleDeleteSkill = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهارة؟')) return;
    try {
      await client.apiCall.invoke({
        url: `/api/v1/academic-production/skills/${id}`,
        method: 'DELETE',
        data: {},
      });
      toast.success('تم حذف المهارة');
      fetchSkills();
    } catch { toast.error('فشل في حذف المهارة'); }
  };

  const filteredSkills = skills.filter(s => {
    if (filterGrade !== 'all' && s.grade !== filterGrade) return false;
    if (filterDomain !== 'all' && s.domain_id !== parseInt(filterDomain)) return false;
    if (filterStatus !== 'all' && (s.status || 'draft') !== filterStatus) return false;
    if (searchTerm && !s.name.includes(searchTerm)) return false;
    return true;
  });

  const getDomainName = (domainId?: number) => domains.find(d => d.id === domainId)?.name || 'غير مصنف';

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

  const difficultyLabel = (d: string) => {
    switch (d) {
      case 'easy': return 'سهل';
      case 'hard': return 'صعب';
      default: return 'متوسط';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-purple-600" />
            تأليف المهارات الأكاديمية
          </h1>
          <p className="text-gray-500 mt-1">إنشاء وتعديل المهارات مع المتطلبات والقواعد</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowRight className="w-4 h-4 ml-1" /> لوحة الإدارة
          </Button>
          <Button onClick={() => { setEditingSkill({ ...EMPTY_SKILL }); setPrerequisites([]); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 ml-1" /> مهارة جديدة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="بحث في المهارات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-28"><SelectValue placeholder="الصف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الصفوف</SelectItem>
                {['1', '2', '3', '4', '5', '6'].map(g => (
                  <SelectItem key={g} value={g}>صف {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDomain} onValueChange={setFilterDomain}>
              <SelectTrigger className="w-36"><SelectValue placeholder="المجال" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المجالات</SelectItem>
                {domains.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-28"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="review">مراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filteredSkills.length} مهارة</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <Card className="col-span-full"><CardContent className="p-8 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500" /></CardContent></Card>
        ) : filteredSkills.length === 0 ? (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-gray-500">لا توجد مهارات مطابقة</CardContent></Card>
        ) : (
          filteredSkills.slice(0, 30).map(skill => (
            <Card key={skill.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 flex-1">{skill.name}</h3>
                  <Badge className={statusColor(skill.status || 'draft')}>{statusLabel(skill.status || 'draft')}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge variant="outline" className="text-[10px]">صف {skill.grade}</Badge>
                  <Badge variant="outline" className="text-[10px]">{getDomainName(skill.domain_id)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{difficultyLabel(skill.difficulty_level || 'medium')}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-gray-500 mb-3">
                  <div className="bg-gray-50 rounded p-1">
                    <Target className="w-3 h-3 mx-auto mb-0.5 text-blue-500" />
                    إتقان: {((skill.mastery_threshold || 0.8) * 100).toFixed(0)}%
                  </div>
                  <div className="bg-gray-50 rounded p-1">
                    <Layers className="w-3 h-3 mx-auto mb-0.5 text-green-500" />
                    أسئلة: {skill.min_questions_required || 3}
                  </div>
                  <div className="bg-gray-50 rounded p-1">
                    <Clock className="w-3 h-3 mx-auto mb-0.5 text-orange-500" />
                    مراجعة: {skill.retention_review_days || 7}ي
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {skill.remediation_required && <Badge variant="outline" className="text-[10px] bg-red-50">علاجي</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEditSkill(skill)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteSkill(skill.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Skill Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingSkill?.id ? 'تعديل المهارة' : 'إنشاء مهارة جديدة'}</DialogTitle>
          </DialogHeader>
          {editingSkill && (
            <div className="space-y-4">
              <div>
                <Label>اسم المهارة</Label>
                <Input
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="مثال: جمع الأعداد حتى 20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الصف</Label>
                  <Select value={editingSkill.grade} onValueChange={(v) => setEditingSkill(prev => prev ? { ...prev, grade: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5', '6'].map(g => (
                        <SelectItem key={g} value={g}>صف {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المجال</Label>
                  <Select value={String(editingSkill.domain_id || '')} onValueChange={(v) => setEditingSkill(prev => prev ? { ...prev, domain_id: v ? parseInt(v) : undefined } : null)}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {domains.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>مستوى الصعوبة</Label>
                  <Select value={editingSkill.difficulty_level} onValueChange={(v) => setEditingSkill(prev => prev ? { ...prev, difficulty_level: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">سهل</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select value={editingSkill.status} onValueChange={(v) => setEditingSkill(prev => prev ? { ...prev, status: v } : null)}>
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

              {/* Mastery Rules */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2 pt-3"><CardTitle className="text-sm flex items-center gap-1"><Target className="w-4 h-4" /> قواعد الإتقان</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">حد الإتقان: {((editingSkill.mastery_threshold || 0.8) * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[(editingSkill.mastery_threshold || 0.8) * 100]}
                      onValueChange={([v]) => setEditingSkill(prev => prev ? { ...prev, mastery_threshold: v / 100 } : null)}
                      min={50} max={100} step={5}
                      className="mt-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">الحد الأدنى للأسئلة</Label>
                      <Input
                        type="number" min={1} max={20}
                        value={editingSkill.min_questions_required}
                        onChange={(e) => setEditingSkill(prev => prev ? { ...prev, min_questions_required: parseInt(e.target.value) || 3 } : null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">أسئلة بصرية</Label>
                      <Input
                        type="number" min={0} max={10}
                        value={editingSkill.min_visual_questions}
                        onChange={(e) => setEditingSkill(prev => prev ? { ...prev, min_visual_questions: parseInt(e.target.value) || 0 } : null)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remediation & Retention */}
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-2 pt-3"><CardTitle className="text-sm flex items-center gap-1"><Shield className="w-4 h-4" /> العلاج والاحتفاظ</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={editingSkill.remediation_required}
                      onCheckedChange={(v) => setEditingSkill(prev => prev ? { ...prev, remediation_required: v } : null)}
                    />
                    <Label className="text-xs">تتطلب مسار علاجي</Label>
                  </div>
                  <div>
                    <Label className="text-xs">أيام مراجعة الاحتفاظ</Label>
                    <Input
                      type="number" min={1} max={90}
                      value={editingSkill.retention_review_days}
                      onChange={(e) => setEditingSkill(prev => prev ? { ...prev, retention_review_days: parseInt(e.target.value) || 7 } : null)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Prerequisites */}
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-2 pt-3"><CardTitle className="text-sm flex items-center gap-1"><Link2 className="w-4 h-4" /> المتطلبات السابقة</CardTitle></CardHeader>
                <CardContent>
                  <Select
                    value=""
                    onValueChange={(v) => {
                      const id = parseInt(v);
                      if (!editingSkill.prerequisite_ids.includes(id)) {
                        setEditingSkill(prev => prev ? { ...prev, prerequisite_ids: [...prev.prerequisite_ids, id] } : null);
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="أضف متطلب سابق..." /></SelectTrigger>
                    <SelectContent>
                      {allSkills
                        .filter(s => s.id !== editingSkill.id && !editingSkill.prerequisite_ids.includes(s.id))
                        .slice(0, 30)
                        .map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name} (صف {s.grade})</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {editingSkill.prerequisite_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {editingSkill.prerequisite_ids.map(id => {
                        const skill = allSkills.find(s => s.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="text-[10px] cursor-pointer hover:bg-red-100"
                            onClick={() => setEditingSkill(prev => prev ? { ...prev, prerequisite_ids: prev.prerequisite_ids.filter(p => p !== id) } : null)}
                          >
                            {skill?.name || `#${id}`} ✕
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveSkill}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}