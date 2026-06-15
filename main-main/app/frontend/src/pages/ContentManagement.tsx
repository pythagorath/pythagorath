// Content Management System - Skills, questions, curriculum (backend-integrated)
import { useState, useEffect, useCallback } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Search, Brain, BookOpen, Layers, CheckCircle,
  Filter, RefreshCw, ArrowLeft, Eye, EyeOff, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentManagementProps {
  tab?: string;
}

interface SkillItem {
  id: number;
  name: string;
  domain: string;
  grade_id: number;
  difficulty: string;
  mastery_threshold: number;
  status: string;
  source: 'admin' | 'ai';
}

interface QuestionItem {
  id: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  status: string;
  skill_id: number;
  source: 'admin' | 'ai';
}

interface UnitItem {
  id: number;
  name: string;
  subject_id: number;
  display_order: number;
  status: string;
}

export default function ContentManagement({ tab }: ContentManagementProps) {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab || 'overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Run each fetch independently so a failure in one (e.g. the AI endpoints not
    // being available) never blanks out the others. Each failure is logged.
    const safe = async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (e) {
        console.error(`ContentManagement: "${label}" request failed`, e);
        return null;
      }
    };

    const [skillsRes, questionsRes, unitsRes, aiSkillsRes, aiQuestionsRes] = await Promise.all([
      safe('admin_skills', () => client.entities.admin_skills.query({ query: {}, sort: '-id', limit: 200 })),
      safe('admin_questions', () => client.entities.admin_questions.query({ query: {}, sort: '-id', limit: 200 })),
      safe('units', () => client.entities.units.query({ query: {}, sort: 'display_order', limit: 100 })),
      // AI-generated content via dedicated endpoints (the curriculum_* entity routers
      // have stale response schemas, so we read through curriculum-ai instead).
      safe('generated-skills', () => client.apiCall.invoke({ url: '/api/v1/curriculum-ai/generated-skills?limit=500', method: 'GET', data: {} })),
      safe('generated-questions', () => client.apiCall.invoke({ url: '/api/v1/curriculum-ai/generated-questions?limit=500', method: 'GET', data: {} })),
    ]);

    // invoke() resolves to the axios response (.data holds the body); fall back to a
    // directly-unwrapped body just in case.
    const aiSkillItems = (aiSkillsRes?.data?.items ?? aiSkillsRes?.items ?? []);
    const aiQuestionItems = (aiQuestionsRes?.data?.items ?? aiQuestionsRes?.items ?? []);
    console.info(
      `ContentManagement: AI skills=${aiSkillItems.length}, AI questions=${aiQuestionItems.length}, ` +
      `admin skills=${(skillsRes?.data?.items || []).length}, admin questions=${(questionsRes?.data?.items || []).length}`
    );

    // AI rows use status 'ai_generated'/'pending'; map to the published/draft vocabulary
    // the status filter and badges expect, so they are not hidden by the status filter.
    const normStatus = (raw: unknown): string => (raw === 'published' ? 'published' : 'draft');

    const adminSkills: SkillItem[] = (skillsRes?.data?.items || []).map(
      (s: SkillItem) => ({ ...s, source: 'admin' as const })
    );
    const aiSkills: SkillItem[] = aiSkillItems.map(
      (s: Record<string, unknown>) => ({
        id: s.id as number,
        name: (s.name as string) || '',
        domain: (s.name_en as string) || 'مولّد بالذكاء الاصطناعي',
        grade_id: 0,
        difficulty: (s.difficulty as string) || 'medium',
        mastery_threshold: (s.mastery_threshold as number) || 0,
        status: normStatus(s.status),
        source: 'ai' as const,
      })
    );

    const adminQuestions: QuestionItem[] = (questionsRes?.data?.items || []).map(
      (q: QuestionItem) => ({ ...q, source: 'admin' as const })
    );
    const aiQuestions: QuestionItem[] = aiQuestionItems.map(
      (q: Record<string, unknown>) => ({
        id: q.id as number,
        question_text: (q.question_text as string) || '',
        question_type: (q.question_type as string) || '',
        difficulty: (q.difficulty as string) || 'medium',
        status: normStatus(q.status),
        skill_id: (q.skill_id as number) || 0,
        source: 'ai' as const,
      })
    );

    setSkills([...aiSkills, ...adminSkills]);
    setQuestions([...aiQuestions, ...adminQuestions]);
    setUnits(unitsRes?.data?.items || []);
    if (!skillsRes && !questionsRes && !aiSkillsRes && !aiQuestionsRes) {
      toast.error('خطأ في تحميل البيانات');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setActiveTab(tab || 'overview');
  }, [tab]);

  if (!user || (user.role !== 'admin' && user.role !== 'content_manager')) {
    navigate('/login');
    return null;
  }

  const toggleStatus = async (entity: string, id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await client.entities[entity].update({ id: String(id), data: { status: newStatus } });
      toast.success(newStatus === 'published' ? 'تم النشر' : 'تم إلغاء النشر');
      fetchData();
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error('خطأ في تغيير الحالة');
    }
  };

  // AI-generated items (curriculum_skills / curriculum_questions) are updated through a
  // dedicated endpoint, since their auto-generated entity routers have stale schemas.
  const toggleAiStatus = async (kind: 'skill' | 'question', id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await client.apiCall.invoke({
        url: '/api/v1/curriculum-ai/set-status',
        method: 'POST',
        data: { kind, id, status: newStatus },
      });
      toast.success(newStatus === 'published' ? 'تم النشر' : 'تم إلغاء النشر');
      fetchData();
    } catch (err) {
      console.error('Toggle AI status error:', err);
      toast.error('خطأ في تغيير الحالة');
    }
  };

  const filteredSkills = skills.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (searchQuery.trim()) return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const filteredQuestions = questions.filter(q => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (searchQuery.trim()) return q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const publishedSkills = skills.filter(s => s.status === 'published').length;
  const publishedQuestions = questions.filter(q => q.status === 'published').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-tajawal">إدارة المحتوى</h1>
          <p className="text-gray-500 text-sm font-tajawal">المهارات والأسئلة والمنهج</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/crud')} className="font-tajawal gap-1">
            <ArrowLeft className="w-4 h-4" />
            إدارة شاملة
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="overview" className="font-tajawal">نظرة عامة</TabsTrigger>
          <TabsTrigger value="skills" className="font-tajawal">المهارات</TabsTrigger>
          <TabsTrigger value="questions" className="font-tajawal">الأسئلة</TabsTrigger>
          <TabsTrigger value="curriculum" className="font-tajawal">المنهج</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Brain className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{skills.length}</p>
                <p className="text-xs text-gray-400 font-tajawal">إجمالي المهارات</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{questions.length}</p>
                <p className="text-xs text-gray-400 font-tajawal">إجمالي الأسئلة</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{publishedSkills}</p>
                <p className="text-xs text-gray-400 font-tajawal">مهارات منشورة</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Layers className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{publishedQuestions}</p>
                <p className="text-xs text-gray-400 font-tajawal">أسئلة منشورة</p>
              </CardContent>
            </Card>
          </div>

          {/* Domain Coverage */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-tajawal">تغطية المهارات حسب المجال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const domains = skills.reduce((acc, s) => {
                  const d = s.domain || 'غير محدد';
                  acc[d] = (acc[d] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const total = skills.length || 1;
                return Object.entries(domains).map(([domain, count]) => (
                  <div key={domain}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 font-tajawal">{domain}</span>
                      <span className="text-sm font-bold text-gray-700">{count} مهارة</span>
                    </div>
                    <Progress value={(count / total) * 100} className="h-2" />
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="بحث في المهارات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9 font-tajawal text-sm" dir="rtl" />
            </div>
            <select className="text-sm border border-gray-200 rounded-md px-3 py-2 font-tajawal" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : (
            <div className="space-y-2">
              {filteredSkills.map(skill => (
                <Card key={`${skill.source}-${skill.id}`} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-tajawal font-medium text-gray-800">{skill.name}</span>
                        {skill.source === 'ai' && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 gap-1"><Brain className="w-3 h-3" />ذكاء اصطناعي</Badge>
                        )}
                        <Badge variant={skill.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                          {skill.status === 'published' ? 'منشور' : 'مسودة'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{skill.domain}</Badge>
                        <Badge variant="outline" className={`text-xs ${skill.difficulty === 'hard' ? 'text-red-600' : skill.difficulty === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>
                          {skill.difficulty === 'hard' ? 'صعب' : skill.difficulty === 'medium' ? 'متوسط' : 'سهل'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 font-tajawal mt-0.5">عتبة الإتقان: {skill.mastery_threshold}%</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => skill.source === 'ai' ? toggleAiStatus('skill', skill.id, skill.status) : toggleStatus('admin_skills', skill.id, skill.status)} className="h-8 w-8 p-0" title={skill.status === 'published' ? 'إلغاء النشر' : 'نشر'}>
                      {skill.status === 'published' ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {filteredSkills.length === 0 && <p className="text-center text-gray-400 py-8 font-tajawal">لا توجد مهارات</p>}
            </div>
          )}
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="بحث في الأسئلة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9 font-tajawal text-sm" dir="rtl" />
            </div>
            <select className="text-sm border border-gray-200 rounded-md px-3 py-2 font-tajawal" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : (
            <div className="space-y-2">
              {filteredQuestions.map(q => (
                <Card key={`${q.source}-${q.id}`} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-tajawal font-medium text-gray-800 truncate">{q.question_text || 'سؤال تفاعلي'}</span>
                        {q.source === 'ai' && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 gap-1"><Brain className="w-3 h-3" />ذكاء اصطناعي</Badge>
                        )}
                        <Badge variant={q.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                          {q.status === 'published' ? 'منشور' : 'مسودة'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => q.source === 'ai' ? toggleAiStatus('question', q.id, q.status) : toggleStatus('admin_questions', q.id, q.status)} className="h-8 w-8 p-0">
                      {q.status === 'published' ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {filteredQuestions.length === 0 && <p className="text-center text-gray-400 py-8 font-tajawal">لا توجد أسئلة</p>}
            </div>
          )}
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : (
            <div className="space-y-2">
              {units.map(unit => (
                <Card key={unit.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-tajawal font-medium text-gray-800">{unit.name}</span>
                        <Badge variant={unit.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                          {unit.status === 'published' ? 'منشور' : 'مسودة'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 font-tajawal mt-0.5">ترتيب: {unit.display_order}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus('units', unit.id, unit.status)} className="h-8 w-8 p-0">
                      {unit.status === 'published' ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {units.length === 0 && <p className="text-center text-gray-400 py-8 font-tajawal">لا توجد وحدات</p>}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}