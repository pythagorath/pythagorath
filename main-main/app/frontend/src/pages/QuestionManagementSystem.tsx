// Educational Intelligence Management - Expansion Questions Layer
// Full CRUD with skill mapping, curriculum mapping, cognitive types, prerequisites, remediation, adaptive integration
import { useState, useMemo } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Search, Sparkles, BarChart3, AlertTriangle, CheckCircle, Plus, X, Edit2, Trash2, Eye, Archive, Brain, Target, Link2, BookOpen, Layers, Settings2, TrendingUp } from 'lucide-react';
import {
  type ManagedQuestion, type QuestionStatus, type CognitiveType, type InteractionType,
  type MisconceptionType, type DifficultyLevel, type SkillMapping, type CurriculumMapping,
  GRADE_OPTIONS, SEMESTER_OPTIONS, SUBJECT_OPTIONS, COGNITIVE_TYPE_OPTIONS,
  INTERACTION_TYPE_OPTIONS, MISCONCEPTION_TYPE_OPTIONS, SKILL_DOMAINS,
} from '@/lib/educationalIntelligenceConfig';

// ═══════════════════════════════════════════════════════
// INITIAL DATA (imported from expansion questions)
// ═══════════════════════════════════════════════════════
const INITIAL_QUESTIONS: ManagedQuestion[] = [
  {
    id: 'EQ-001', text: 'أي من هذه الأعداد فردي؟', options: ['4', '6', '9', '10'], correctAnswer: 2,
    explanation: '9 عدد فردي لأنه لا يقبل القسمة على 2 بدون باقٍ',
    skillMapping: { skillId: 'G1-N-017', skillName: 'الأعداد الزوجية والفردية', domain: 'numbers', subDomain: 'parity' },
    curriculumMapping: { grade: 1, semester: 1, unit: 'الأعداد', lesson: 'الزوجي والفردي', subject: 'math' },
    cognitiveType: 'recall', difficulty: 2, masteryWeight: 5,
    prerequisites: [], remediationTargets: [{ targetSkillId: 'G1-N-001', remediationType: 'scaffold', priority: 1 }],
    interactionType: 'multiple_choice', hasVisual: false,
    misconceptionType: ['conceptual'], commonErrors: ['خلط بين الزوجي والفردي'],
    status: 'published', createdBy: 'imported', createdAt: '2026-05-19', updatedAt: '2026-05-19',
    successRate: 78, attempts: 95, avgResponseTime: 8200, discriminationIndex: 0.45,
  },
  {
    id: 'EQ-002', text: 'أكمل النمط: 1، 2، 1، 2، 1، __', options: ['1', '2', '3', '4'], correctAnswer: 1,
    explanation: 'النمط يتكرر: 1، 2. إذن التالي هو 2',
    skillMapping: { skillId: 'G1-P-001', skillName: 'استكمال النمط', domain: 'patterns', subDomain: 'repeating' },
    curriculumMapping: { grade: 1, semester: 1, unit: 'الأنماط', lesson: 'الأنماط المتكررة', subject: 'patterns' },
    cognitiveType: 'application', difficulty: 1, masteryWeight: 4,
    prerequisites: [], remediationTargets: [],
    interactionType: 'multiple_choice', hasVisual: true, visualType: 'pattern',
    misconceptionType: ['procedural'], commonErrors: ['عدم التعرف على دورة النمط'],
    status: 'published', createdBy: 'imported', createdAt: '2026-05-19', updatedAt: '2026-05-19',
    successRate: 85, attempts: 120, avgResponseTime: 6500, discriminationIndex: 0.38,
  },
  {
    id: 'EQ-003', text: 'أيهما يتسع لماء أكثر: الملعقة أم الكوب؟', options: ['الملعقة', 'الكوب', 'متساويان', 'لا أعرف'], correctAnswer: 1,
    explanation: 'الكوب يتسع لكمية ماء أكبر من الملعقة',
    skillMapping: { skillId: 'G1-M-002', skillName: 'مقارنة السعة', domain: 'measurement', subDomain: 'capacity' },
    curriculumMapping: { grade: 1, semester: 1, unit: 'القياس', lesson: 'السعة', subject: 'measurement' },
    cognitiveType: 'comprehension', difficulty: 1, masteryWeight: 3,
    prerequisites: [], remediationTargets: [],
    interactionType: 'multiple_choice', hasVisual: false,
    misconceptionType: [], commonErrors: [],
    status: 'published', createdBy: 'imported', createdAt: '2026-05-19', updatedAt: '2026-05-19',
    successRate: 92, attempts: 80, avgResponseTime: 5100, discriminationIndex: 0.22,
  },
  {
    id: 'EQ-004', text: 'على خط الأعداد: ابدأ من 4 واقفز 5 قفزات. أين تصل؟', options: ['8', '9', '10', '7'], correctAnswer: 1,
    explanation: '4 + 5 = 9. نقفز من 4: خمس قفزات نصل إلى 9',
    skillMapping: { skillId: 'G1-N-018', skillName: 'الجمع على خط الأعداد', domain: 'numbers', subDomain: 'addition' },
    curriculumMapping: { grade: 1, semester: 2, unit: 'الجمع والطرح', lesson: 'خط الأعداد', subject: 'math' },
    cognitiveType: 'application', difficulty: 2, masteryWeight: 6,
    prerequisites: [{ requiredSkillId: 'G1-N-002', requiredMasteryLevel: 50, relationship: 'prerequisite' }],
    remediationTargets: [{ targetSkillId: 'G1-N-002', remediationType: 'visual_aid', priority: 1 }],
    interactionType: 'visual_match', hasVisual: true, visualType: 'number-line',
    misconceptionType: ['procedural'], commonErrors: ['البدء من الرقم التالي بدل الرقم نفسه'],
    status: 'published', createdBy: 'imported', createdAt: '2026-05-19', updatedAt: '2026-05-19',
    successRate: 72, attempts: 88, avgResponseTime: 9800, discriminationIndex: 0.52,
  },
  {
    id: 'EQ-005', text: 'العدد 47 يتكون من:', options: ['7 عشرات و 4 آحاد', '4 عشرات و 7 آحاد', '47 آحاد', '4 آحاد و 7 عشرات'], correctAnswer: 1,
    explanation: '47 = 4 عشرات (40) + 7 آحاد (7)',
    skillMapping: { skillId: 'G1-N-021', skillName: 'العشرات والآحاد', domain: 'numbers', subDomain: 'place_value' },
    curriculumMapping: { grade: 1, semester: 2, unit: 'الأعداد', lesson: 'القيمة المكانية', subject: 'math' },
    cognitiveType: 'comprehension', difficulty: 2, masteryWeight: 7,
    prerequisites: [{ requiredSkillId: 'G1-N-022', requiredMasteryLevel: 40, relationship: 'prerequisite' }],
    remediationTargets: [{ targetSkillId: 'G1-N-022', remediationType: 'decompose', priority: 1 }],
    interactionType: 'multiple_choice', hasVisual: false,
    misconceptionType: ['conceptual'], commonErrors: ['عكس العشرات والآحاد'],
    status: 'published', createdBy: 'imported', createdAt: '2026-05-19', updatedAt: '2026-05-19',
    successRate: 65, attempts: 110, avgResponseTime: 11200, discriminationIndex: 0.58,
  },
  {
    id: 'EQ-006', text: 'مثّل العدد 25 على المعداد (عشرات وآحاد)', options: ['2 عشرات + 5 آحاد', '5 عشرات + 2 آحاد', '25 آحاد', '2 آحاد + 5 عشرات'], correctAnswer: 0,
    explanation: '25 = 2 عشرات + 5 آحاد',
    skillMapping: { skillId: 'AB-005', skillName: 'القيمة المكانية بالمعداد', domain: 'abacus', subDomain: 'place_value' },
    curriculumMapping: { grade: 1, semester: 2, unit: 'المعداد', lesson: 'القيمة المكانية', subject: 'math' },
    cognitiveType: 'application', difficulty: 3, masteryWeight: 6,
    prerequisites: [{ requiredSkillId: 'AB-001', requiredMasteryLevel: 60, relationship: 'prerequisite' }],
    remediationTargets: [{ targetSkillId: 'AB-001', remediationType: 'scaffold', priority: 1 }],
    interactionType: 'abacus_manipulation', hasVisual: true, visualType: 'abacus',
    misconceptionType: ['conceptual', 'procedural'], commonErrors: ['خلط العشرات بالآحاد', 'عكس الأعمدة'],
    status: 'published', createdBy: 'admin', createdAt: '2026-05-20', updatedAt: '2026-05-20',
    successRate: 55, attempts: 80, avgResponseTime: 14500, discriminationIndex: 0.61,
  },
  {
    id: 'EQ-007', text: 'ارمِ نردين وأوجد مجموع النقاط', options: ['إجابة تفاعلية'], correctAnswer: 0,
    explanation: 'اجمع نقاط النرد الأول مع نقاط النرد الثاني',
    skillMapping: { skillId: 'DC-001', skillName: 'النرد - الجمع', domain: 'dice', subDomain: 'addition' },
    curriculumMapping: { grade: 1, semester: 1, unit: 'النرد', lesson: 'الجمع بالنرد', subject: 'math' },
    cognitiveType: 'application', difficulty: 2, masteryWeight: 5,
    prerequisites: [{ requiredSkillId: 'G1-N-002', requiredMasteryLevel: 40, relationship: 'prerequisite' }],
    remediationTargets: [],
    interactionType: 'dice_roll', hasVisual: true, visualType: 'dice',
    misconceptionType: ['procedural'], commonErrors: ['عدّ خاطئ للنقاط'],
    status: 'published', createdBy: 'admin', createdAt: '2026-05-20', updatedAt: '2026-05-20',
    successRate: 85, attempts: 95, avgResponseTime: 7200, discriminationIndex: 0.35,
  },
  {
    id: 'EQ-008', text: 'تخيّل المعداد في ذهنك: ما ناتج 6 + 7؟', options: ['11', '12', '13', '14'], correctAnswer: 2,
    explanation: '6 + 7 = 13. تخيّل تحريك 6 خرزات ثم 7 خرزات مع الحمل',
    skillMapping: { skillId: 'AB-007', skillName: 'الحساب الذهني بالمعداد', domain: 'abacus', subDomain: 'mental_math' },
    curriculumMapping: { grade: 2, semester: 1, unit: 'المعداد المتقدم', lesson: 'الحساب الذهني', subject: 'math' },
    cognitiveType: 'synthesis', difficulty: 4, masteryWeight: 9,
    prerequisites: [
      { requiredSkillId: 'AB-003', requiredMasteryLevel: 70, relationship: 'prerequisite' },
      { requiredSkillId: 'AB-006', requiredMasteryLevel: 60, relationship: 'prerequisite' },
    ],
    remediationTargets: [
      { targetSkillId: 'AB-006', remediationType: 'scaffold', priority: 1 },
      { targetSkillId: 'AB-003', remediationType: 'reteach', priority: 2 },
    ],
    interactionType: 'number_input', hasVisual: false,
    misconceptionType: ['procedural', 'conceptual'], commonErrors: ['صعوبة التخيّل', 'خطأ في الحمل الذهني'],
    status: 'published', createdBy: 'admin', createdAt: '2026-05-22', updatedAt: '2026-05-22',
    successRate: 35, attempts: 30, avgResponseTime: 18500, discriminationIndex: 0.72,
  },
];

// ═══════════════════════════════════════════════════════
// CATEGORY FILTERS
// ═══════════════════════════════════════════════════════
const QUESTION_CATEGORIES = [
  { id: 'all', label: 'الكل', icon: '📋' },
  { id: 'numbers', label: 'الأعداد', icon: '🔢' },
  { id: 'abacus', label: 'المعداد', icon: '🧮' },
  { id: 'dice', label: 'النرد', icon: '🎲' },
  { id: 'geometry', label: 'الهندسة', icon: '🔷' },
  { id: 'measurement', label: 'القياس', icon: '📏' },
  { id: 'patterns', label: 'الأنماط', icon: '🔄' },
  { id: 'time', label: 'الوقت', icon: '🕐' },
  { id: 'data', label: 'البيانات', icon: '📊' },
];

// ═══════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════
function DifficultyStars({ level }: { level: DifficultyLevel }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full ${i <= level ? 'bg-amber-400' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  const config: Record<QuestionStatus, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'مسودة' },
    review: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مراجعة' },
    published: { bg: 'bg-green-100', text: 'text-green-700', label: 'منشور' },
    archived: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'مؤرشف' },
    revision: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'تعديل' },
  };
  const c = config[status];
  return <Badge className={`${c.bg} ${c.text} font-tajawal text-[10px]`}>{c.label}</Badge>;
}

function CognitiveTypeBadge({ type }: { type: CognitiveType }) {
  const opt = COGNITIVE_TYPE_OPTIONS.find(o => o.value === type);
  return <Badge className="bg-purple-50 text-purple-700 font-tajawal text-[10px]">{opt?.icon} {opt?.label}</Badge>;
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function QuestionManagementSystem() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [questions, setQuestions] = useState<ManagedQuestion[]>(INITIAL_QUESTIONS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ManagedQuestion | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<ManagedQuestion | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.text.includes(searchQuery) || q.skillMapping.skillName.includes(searchQuery);
      const matchesCategory = activeCategory === 'all' || q.skillMapping.domain === activeCategory;
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      const matchesGrade = gradeFilter === 'all' || q.curriculumMapping.grade === gradeFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesGrade;
    });
  }, [questions, searchQuery, activeCategory, statusFilter, gradeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: questions.length,
    published: questions.filter(q => q.status === 'published').length,
    draft: questions.filter(q => q.status === 'draft').length,
    review: questions.filter(q => q.status === 'review').length,
    abacus: questions.filter(q => q.skillMapping.domain === 'abacus').length,
    dice: questions.filter(q => q.skillMapping.domain === 'dice').length,
    poorPerformance: questions.filter(q => q.successRate < 50).length,
    highDiscrimination: questions.filter(q => q.discriminationIndex > 0.5).length,
  }), [questions]);

  if (!user || (user.role !== 'admin' && user.role !== 'reviewer' && user.role !== 'content_manager')) {
    navigate('/login');
    return null;
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // CRUD Operations
  const handlePublish = (id: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'published' as const, updatedAt: new Date().toISOString().split('T')[0] } : q));
    showToast('تم نشر السؤال بنجاح');
  };
  const handleArchive = (id: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'archived' as const, updatedAt: new Date().toISOString().split('T')[0] } : q));
    showToast('تم أرشفة السؤال');
  };
  const handleDelete = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    showToast('تم حذف السؤال');
  };
  const handleSaveQuestion = (question: ManagedQuestion) => {
    const exists = questions.find(q => q.id === question.id);
    if (exists) {
      setQuestions(prev => prev.map(q => q.id === question.id ? { ...question, updatedAt: new Date().toISOString().split('T')[0] } : q));
      showToast('تم تحديث السؤال');
    } else {
      setQuestions(prev => [...prev, { ...question, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] }]);
      showToast('تم إضافة السؤال');
    }
    setShowAddModal(false);
    setEditingQuestion(null);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`${toast.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-xl px-5 py-3 shadow-lg flex items-center gap-2`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            <span className={`text-sm font-bold ${toast.type === 'success' ? 'text-green-700' : 'text-red-700'} font-tajawal`}>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingQuestion) && (
        <QuestionEditorModal
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => { setShowAddModal(false); setEditingQuestion(null); }}
          existingIds={questions.map(q => q.id)}
          initialCategory={activeCategory !== 'all' ? activeCategory : ''}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Brain className="w-6 h-6 text-indigo-600" />
              إدارة الأسئلة التعليمية الذكية
            </h1>
            <p className="text-sm text-gray-400 font-tajawal">{stats.total} سؤال • {stats.published} منشور • {stats.poorPerformance} يحتاج تحسين</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-tajawal">
          <Plus className="w-4 h-4 ml-1" />
          إنشاء سؤال
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <Card className="p-3 text-center"><p className="text-lg font-bold text-indigo-600">{stats.total}</p><p className="text-[10px] text-gray-400 font-tajawal">إجمالي</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-green-600">{stats.published}</p><p className="text-[10px] text-gray-400 font-tajawal">منشور</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-gray-500">{stats.draft}</p><p className="text-[10px] text-gray-400 font-tajawal">مسودة</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-blue-500">{stats.review}</p><p className="text-[10px] text-gray-400 font-tajawal">مراجعة</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold">{stats.abacus}</p><p className="text-[10px] text-gray-400 font-tajawal">🧮 معداد</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold">{stats.dice}</p><p className="text-[10px] text-gray-400 font-tajawal">🎲 نرد</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-red-500">{stats.poorPerformance}</p><p className="text-[10px] text-gray-400 font-tajawal">أداء ضعيف</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-purple-500">{stats.highDiscrimination}</p><p className="text-[10px] text-gray-400 font-tajawal">تمييز عالي</p></Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-1.5">
          {QUESTION_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-tajawal font-medium transition-all ${
                activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <span className="ml-0.5">{cat.icon}</span>{cat.label}
            </button>
          ))}
        </div>
        {/* Status Filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as QuestionStatus | 'all')}
          className="text-xs border rounded-lg px-2 py-1.5 font-tajawal" dir="rtl">
          <option value="all">كل الحالات</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
          <option value="review">مراجعة</option>
          <option value="archived">مؤرشف</option>
        </select>
        {/* Grade Filter */}
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="text-xs border rounded-lg px-2 py-1.5 font-tajawal" dir="rtl">
          <option value="all">كل الصفوف</option>
          <option value="1">الصف الأول</option>
          <option value="2">الصف الثاني</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="بحث بالنص أو المهارة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10 font-tajawal" dir="rtl" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="bg-white border">
          <TabsTrigger value="all" className="font-tajawal text-xs">الكل ({filteredQuestions.length})</TabsTrigger>
          <TabsTrigger value="adaptive" className="font-tajawal text-xs">التكيفي</TabsTrigger>
          <TabsTrigger value="misconceptions" className="font-tajawal text-xs">المفاهيم الخاطئة</TabsTrigger>
          <TabsTrigger value="performance" className="font-tajawal text-xs">الأداء</TabsTrigger>
          <TabsTrigger value="prerequisites" className="font-tajawal text-xs">المتطلبات</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-2">
          {filteredQuestions.map(q => (
            <QuestionCard key={q.id} question={q}
              onEdit={() => setEditingQuestion(q)}
              onPreview={() => setPreviewQuestion(q)}
              onPublish={() => handlePublish(q.id)}
              onArchive={() => handleArchive(q.id)}
              onDelete={() => handleDelete(q.id)}
            />
          ))}
          {filteredQuestions.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-400 font-tajawal">لا توجد أسئلة مطابقة للبحث</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="adaptive" className="mt-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              التكامل التكيفي - ربط الأسئلة بمحرك الذكاء
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredQuestions.filter(q => q.prerequisites.length > 0 || q.remediationTargets.length > 0).map(q => (
                <div key={q.id} className="p-3 rounded-lg border bg-indigo-50/30">
                  <p className="text-sm font-medium font-tajawal mb-2">{q.text}</p>
                  {q.prerequisites.length > 0 && (
                    <div className="mb-1">
                      <span className="text-[10px] text-indigo-600 font-tajawal font-bold">متطلبات: </span>
                      {q.prerequisites.map((p, i) => (
                        <Badge key={i} className="bg-indigo-100 text-indigo-700 text-[9px] mr-1">{p.requiredSkillId} ({p.requiredMasteryLevel}%)</Badge>
                      ))}
                    </div>
                  )}
                  {q.remediationTargets.length > 0 && (
                    <div>
                      <span className="text-[10px] text-amber-600 font-tajawal font-bold">علاج: </span>
                      {q.remediationTargets.map((r, i) => (
                        <Badge key={i} className="bg-amber-100 text-amber-700 text-[9px] mr-1">{r.targetSkillId} ({r.remediationType})</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <DifficultyStars level={q.difficulty} />
                    <CognitiveTypeBadge type={q.cognitiveType} />
                    <Badge className="bg-gray-100 text-gray-600 text-[9px]">وزن: {q.masteryWeight}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="misconceptions" className="mt-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              خريطة المفاهيم الخاطئة
            </h3>
            {filteredQuestions.filter(q => q.commonErrors.length > 0).map(q => (
              <div key={q.id} className="p-3 rounded-lg border border-orange-100 bg-orange-50/30">
                <p className="text-sm font-medium font-tajawal">{q.text}</p>
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <span className="text-[10px] text-gray-500 font-tajawal">{q.skillMapping.skillName}</span>
                  <Badge className="bg-red-50 text-red-600 text-[9px]">{q.successRate}% نجاح</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {q.misconceptionType.map((m, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-700 text-[9px]">{MISCONCEPTION_TYPE_OPTIONS.find(o => o.value === m)?.label}</Badge>
                  ))}
                  {q.commonErrors.map((e, i) => (
                    <Badge key={`e-${i}`} className="bg-orange-100 text-orange-700 text-[9px]">{e}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              تحليل الأداء والتمييز
            </h3>
            {filteredQuestions.sort((a, b) => a.successRate - b.successRate).slice(0, 10).map(q => (
              <div key={q.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium font-tajawal flex-1">{q.text}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${q.successRate < 50 ? 'text-red-600' : q.successRate < 70 ? 'text-amber-600' : 'text-green-600'}`}>{q.successRate}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-tajawal">
                  <span>محاولات: {q.attempts}</span>
                  <span>زمن: {(q.avgResponseTime / 1000).toFixed(1)}ث</span>
                  <span>تمييز: {q.discriminationIndex.toFixed(2)}</span>
                  <DifficultyStars level={q.difficulty} />
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2">
                  <div className={`h-full rounded-full ${q.successRate < 50 ? 'bg-red-400' : q.successRate < 70 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${q.successRate}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="prerequisites" className="mt-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Link2 className="w-5 h-5 text-teal-500" />
              شبكة المتطلبات والعلاقات
            </h3>
            <div className="space-y-2">
              {filteredQuestions.filter(q => q.prerequisites.length > 0).map(q => (
                <div key={q.id} className="p-3 rounded-lg border bg-teal-50/30">
                  <p className="text-sm font-medium font-tajawal">{q.text}</p>
                  <p className="text-[10px] text-gray-500 font-tajawal mt-1">{q.skillMapping.skillName} • {q.curriculumMapping.lesson}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {q.prerequisites.map((p, i) => {
                      const skillName = SKILL_DOMAINS.flatMap(d => d.skills).find(s => s.id === p.requiredSkillId)?.name || p.requiredSkillId;
                      return (
                        <div key={i} className="flex items-center gap-1 bg-white border rounded-lg px-2 py-0.5">
                          <span className="text-[9px] text-teal-700 font-tajawal">{skillName}</span>
                          <span className="text-[8px] text-gray-400">≥{p.requiredMasteryLevel}%</span>
                          <Badge className="text-[8px] bg-teal-100 text-teal-600">{p.relationship === 'prerequisite' ? 'متطلب' : p.relationship === 'corequisite' ? 'مرافق' : 'موصى'}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// QUESTION CARD
// ═══════════════════════════════════════════════════════
function QuestionCard({ question: q, onEdit, onPreview, onPublish, onArchive, onDelete }: {
  question: ManagedQuestion;
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium font-tajawal text-sm truncate">{q.text}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge className="bg-indigo-50 text-indigo-700 text-[9px] font-tajawal">{q.skillMapping.skillName}</Badge>
            <StatusBadge status={q.status} />
            <CognitiveTypeBadge type={q.cognitiveType} />
            <DifficultyStars level={q.difficulty} />
            <span className="text-[9px] text-gray-400 font-tajawal">ص{q.curriculumMapping.grade} ف{q.curriculumMapping.semester}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-tajawal">
            <span>نجاح: {q.successRate}%</span>
            <span>محاولات: {q.attempts}</span>
            <span>وزن: {q.masteryWeight}</span>
            {q.prerequisites.length > 0 && <span className="text-teal-600">🔗 {q.prerequisites.length} متطلب</span>}
            {q.remediationTargets.length > 0 && <span className="text-amber-600">💊 {q.remediationTargets.length} علاج</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onPreview} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="معاينة"><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500" title="تعديل"><Edit2 className="w-3.5 h-3.5" /></button>
          {q.status !== 'published' && <button onClick={onPublish} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="نشر"><CheckCircle className="w-3.5 h-3.5" /></button>}
          {q.status === 'published' && <button onClick={onArchive} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500" title="أرشفة"><Archive className="w-3.5 h-3.5" /></button>}
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// QUESTION PREVIEW MODAL
// ═══════════════════════════════════════════════════════
function QuestionPreviewModal({ question: q, onClose }: { question: ManagedQuestion; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 font-tajawal">معاينة السؤال</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {/* Question Display */}
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <p className="text-base font-bold font-tajawal text-gray-800 mb-3">{q.text}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <div key={i} className={`p-2.5 rounded-lg border ${i === q.correctAnswer ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
                <span className="text-sm font-tajawal">{opt}</span>
                {i === q.correctAnswer && <CheckCircle className="w-4 h-4 text-green-500 inline mr-2" />}
              </div>
            ))}
          </div>
          {q.explanation && <p className="text-xs text-gray-600 font-tajawal mt-3 p-2 bg-white rounded-lg">💡 {q.explanation}</p>}
        </div>
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-xs font-tajawal">
          <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-400">المهارة:</span><br/><span className="font-medium">{q.skillMapping.skillName}</span></div>
          <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-400">المنهج:</span><br/><span className="font-medium">ص{q.curriculumMapping.grade} - {q.curriculumMapping.lesson}</span></div>
          <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-400">النوع المعرفي:</span><br/><CognitiveTypeBadge type={q.cognitiveType} /></div>
          <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-400">الصعوبة:</span><br/><DifficultyStars level={q.difficulty} /></div>
          <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-400">التفاعل:</span><br/><span className="font-medium">{INTERACTION_TYPE_OPTIONS.find(o => o.value === q.interactionType)?.label}</span></div>
          <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-400">وزن الإتقان:</span><br/><span className="font-medium">{q.masteryWeight}/10</span></div>
        </div>
        {q.prerequisites.length > 0 && (
          <div className="mt-3 p-2 bg-teal-50 rounded-lg">
            <p className="text-[10px] font-bold text-teal-700 font-tajawal mb-1">المتطلبات:</p>
            {q.prerequisites.map((p, i) => <Badge key={i} className="bg-teal-100 text-teal-700 text-[9px] mr-1">{p.requiredSkillId} ≥{p.requiredMasteryLevel}%</Badge>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CATEGORY-SPECIFIC FIELD TYPES
// ═══════════════════════════════════════════════════════
interface DiceSpecificFields {
  numberOfDice: number;
  operationType: 'addition' | 'subtraction' | 'comparison' | 'counting';
  numberRange: { min: number; max: number };
  showVisualDice: boolean;
  diceColor: string;
}

interface AbacusSpecificFields {
  beadCount: number;
  columns: number;
  placeValueFocus: 'ones' | 'tens' | 'hundreds' | 'mixed';
  showVisualRepresentation: boolean;
  targetNumber: number;
  allowCarry: boolean;
}

interface NumbersSpecificFields {
  numberRange: { min: number; max: number };
  operationType: 'addition' | 'subtraction' | 'multiplication' | 'comparison' | 'ordering' | 'place_value';
  showNumberLine: boolean;
  comparisonMode: 'greater' | 'less' | 'equal' | 'between';
  useWordProblem: boolean;
}

interface GeometrySpecificFields {
  shapeType: 'circle' | 'square' | 'rectangle' | 'triangle' | 'polygon' | 'cube' | 'cylinder';
  dimensions: number;
  includeAngles: boolean;
  focusArea: 'identification' | 'area' | 'perimeter' | 'symmetry' | 'properties';
  showGrid: boolean;
}

interface PatternsSpecificFields {
  patternType: 'color' | 'number' | 'shape' | 'size' | 'mixed';
  sequenceLength: number;
  patternRule: string;
  missingElementPosition: 'end' | 'middle' | 'start' | 'multiple';
  growingPattern: boolean;
}

interface TimeSpecificFields {
  timeFormat: 'analog' | 'digital' | 'both';
  hourRange: { min: number; max: number };
  minuteInterval: 1 | 5 | 10 | 15 | 30;
  operationType: 'read' | 'elapsed' | 'convert' | 'compare' | 'sequence';
  showClockVisual: boolean;
  use24Hour: boolean;
}

interface DataSpecificFields {
  chartType: 'bar' | 'pie' | 'line' | 'pictograph' | 'table';
  dataPointsCount: number;
  axisLabels: { x: string; y: string };
  questionFocus: 'read' | 'compare' | 'calculate' | 'predict' | 'organize';
  showTable: boolean;
  dataTheme: string;
}

type CategorySpecificData = {
  dice?: DiceSpecificFields;
  abacus?: AbacusSpecificFields;
  numbers?: NumbersSpecificFields;
  geometry?: GeometrySpecificFields;
  patterns?: PatternsSpecificFields;
  time?: TimeSpecificFields;
  data?: DataSpecificFields;
};

const DEFAULT_DICE: DiceSpecificFields = { numberOfDice: 2, operationType: 'addition', numberRange: { min: 1, max: 6 }, showVisualDice: true, diceColor: 'white' };
const DEFAULT_ABACUS: AbacusSpecificFields = { beadCount: 10, columns: 2, placeValueFocus: 'ones', showVisualRepresentation: true, targetNumber: 0, allowCarry: false };
const DEFAULT_NUMBERS: NumbersSpecificFields = { numberRange: { min: 0, max: 20 }, operationType: 'addition', showNumberLine: false, comparisonMode: 'greater', useWordProblem: false };
const DEFAULT_GEOMETRY: GeometrySpecificFields = { shapeType: 'square', dimensions: 2, includeAngles: false, focusArea: 'identification', showGrid: false };
const DEFAULT_PATTERNS: PatternsSpecificFields = { patternType: 'number', sequenceLength: 5, patternRule: '', missingElementPosition: 'end', growingPattern: false };
const DEFAULT_TIME: TimeSpecificFields = { timeFormat: 'analog', hourRange: { min: 1, max: 12 }, minuteInterval: 30, operationType: 'read', showClockVisual: true, use24Hour: false };
const DEFAULT_DATA: DataSpecificFields = { chartType: 'bar', dataPointsCount: 4, axisLabels: { x: '', y: '' }, questionFocus: 'read', showTable: false, dataTheme: '' };

// ═══════════════════════════════════════════════════════
// CATEGORY-SPECIFIC FIELDS COMPONENT
// ═══════════════════════════════════════════════════════
function CategorySpecificFieldsPanel({ domain, data, onChange }: {
  domain: string;
  data: CategorySpecificData;
  onChange: (data: CategorySpecificData) => void;
}) {
  if (domain === 'dice') {
    const fields = data.dice || DEFAULT_DICE;
    const update = (partial: Partial<DiceSpecificFields>) => onChange({ ...data, dice: { ...fields, ...partial } });
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-red-200 bg-red-50/30 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎲</span>
          <h4 className="text-sm font-bold text-red-700 font-tajawal">إعدادات خاصة بالنرد</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عدد النرد</label>
            <div className="flex gap-1">
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => update({ numberOfDice: n })}
                  className={`w-9 h-9 rounded-lg text-sm font-bold ${fields.numberOfDice === n ? 'bg-red-500 text-white' : 'bg-white border text-gray-600'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نوع العملية</label>
            <select value={fields.operationType} onChange={e => update({ operationType: e.target.value as DiceSpecificFields['operationType'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="addition">جمع</option>
              <option value="subtraction">طرح</option>
              <option value="comparison">مقارنة</option>
              <option value="counting">عدّ</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نطاق الأرقام</label>
            <div className="flex items-center gap-1">
              <Input type="number" value={fields.numberRange.min} onChange={e => update({ numberRange: { ...fields.numberRange, min: +e.target.value } })}
                className="w-16 text-xs text-center" min={1} max={6} />
              <span className="text-xs text-gray-400">-</span>
              <Input type="number" value={fields.numberRange.max} onChange={e => update({ numberRange: { ...fields.numberRange, max: +e.target.value } })}
                className="w-16 text-xs text-center" min={1} max={36} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عرض النرد المرئي</label>
            <button onClick={() => update({ showVisualDice: !fields.showVisualDice })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.showVisualDice ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.showVisualDice ? '✓ مفعّل' : 'معطّل'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (domain === 'abacus') {
    const fields = data.abacus || DEFAULT_ABACUS;
    const update = (partial: Partial<AbacusSpecificFields>) => onChange({ ...data, abacus: { ...fields, ...partial } });
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/30 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🧮</span>
          <h4 className="text-sm font-bold text-amber-700 font-tajawal">إعدادات خاصة بالمعداد</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عدد الخرزات لكل عمود</label>
            <Input type="number" value={fields.beadCount} onChange={e => update({ beadCount: +e.target.value })}
              className="text-xs" min={1} max={20} />
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عدد الأعمدة</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => update({ columns: n })}
                  className={`w-9 h-9 rounded-lg text-sm font-bold ${fields.columns === n ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">تركيز القيمة المكانية</label>
            <select value={fields.placeValueFocus} onChange={e => update({ placeValueFocus: e.target.value as AbacusSpecificFields['placeValueFocus'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="ones">آحاد</option>
              <option value="tens">عشرات</option>
              <option value="hundreds">مئات</option>
              <option value="mixed">مختلط</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">العدد المستهدف</label>
            <Input type="number" value={fields.targetNumber} onChange={e => update({ targetNumber: +e.target.value })}
              className="text-xs" min={0} max={999} />
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عرض المعداد المرئي</label>
            <button onClick={() => update({ showVisualRepresentation: !fields.showVisualRepresentation })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.showVisualRepresentation ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.showVisualRepresentation ? '✓ مفعّل' : 'معطّل'}
            </button>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">السماح بالحمل</label>
            <button onClick={() => update({ allowCarry: !fields.allowCarry })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.allowCarry ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.allowCarry ? '✓ مفعّل' : 'معطّل'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (domain === 'numbers') {
    const fields = data.numbers || DEFAULT_NUMBERS;
    const update = (partial: Partial<NumbersSpecificFields>) => onChange({ ...data, numbers: { ...fields, ...partial } });
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔢</span>
          <h4 className="text-sm font-bold text-blue-700 font-tajawal">إعدادات خاصة بالأعداد</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نطاق الأرقام</label>
            <div className="flex items-center gap-1">
              <Input type="number" value={fields.numberRange.min} onChange={e => update({ numberRange: { ...fields.numberRange, min: +e.target.value } })}
                className="w-16 text-xs text-center" min={0} />
              <span className="text-xs text-gray-400">-</span>
              <Input type="number" value={fields.numberRange.max} onChange={e => update({ numberRange: { ...fields.numberRange, max: +e.target.value } })}
                className="w-16 text-xs text-center" min={0} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نوع العملية</label>
            <select value={fields.operationType} onChange={e => update({ operationType: e.target.value as NumbersSpecificFields['operationType'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="addition">جمع</option>
              <option value="subtraction">طرح</option>
              <option value="multiplication">ضرب</option>
              <option value="comparison">مقارنة</option>
              <option value="ordering">ترتيب</option>
              <option value="place_value">قيمة مكانية</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">خط الأعداد</label>
            <button onClick={() => update({ showNumberLine: !fields.showNumberLine })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.showNumberLine ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.showNumberLine ? '✓ مفعّل' : 'معطّل'}
            </button>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">وضع المقارنة</label>
            <select value={fields.comparisonMode} onChange={e => update({ comparisonMode: e.target.value as NumbersSpecificFields['comparisonMode'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="greater">أكبر من</option>
              <option value="less">أصغر من</option>
              <option value="equal">يساوي</option>
              <option value="between">بين عددين</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">مسألة كلامية</label>
            <button onClick={() => update({ useWordProblem: !fields.useWordProblem })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.useWordProblem ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.useWordProblem ? '✓ مسألة كلامية' : 'عملية مباشرة'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (domain === 'geometry') {
    const fields = data.geometry || DEFAULT_GEOMETRY;
    const update = (partial: Partial<GeometrySpecificFields>) => onChange({ ...data, geometry: { ...fields, ...partial } });
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/30 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔷</span>
          <h4 className="text-sm font-bold text-teal-700 font-tajawal">إعدادات خاصة بالهندسة</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نوع الشكل</label>
            <select value={fields.shapeType} onChange={e => update({ shapeType: e.target.value as GeometrySpecificFields['shapeType'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="circle">دائرة</option>
              <option value="square">مربع</option>
              <option value="rectangle">مستطيل</option>
              <option value="triangle">مثلث</option>
              <option value="polygon">مضلع</option>
              <option value="cube">مكعب</option>
              <option value="cylinder">أسطوانة</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">الأبعاد</label>
            <div className="flex gap-1">
              {[2, 3].map(d => (
                <button key={d} onClick={() => update({ dimensions: d })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold ${fields.dimensions === d ? 'bg-teal-500 text-white' : 'bg-white border text-gray-600'}`}>{d}D</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">التركيز</label>
            <select value={fields.focusArea} onChange={e => update({ focusArea: e.target.value as GeometrySpecificFields['focusArea'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="identification">التعرف</option>
              <option value="area">المساحة</option>
              <option value="perimeter">المحيط</option>
              <option value="symmetry">التماثل</option>
              <option value="properties">الخصائص</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">الزوايا</label>
            <button onClick={() => update({ includeAngles: !fields.includeAngles })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.includeAngles ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.includeAngles ? '✓ تشمل زوايا' : 'بدون زوايا'}
            </button>
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">شبكة مرئية</label>
            <button onClick={() => update({ showGrid: !fields.showGrid })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.showGrid ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.showGrid ? '✓ عرض الشبكة' : 'بدون شبكة'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (domain === 'patterns') {
    const fields = data.patterns || DEFAULT_PATTERNS;
    const update = (partial: Partial<PatternsSpecificFields>) => onChange({ ...data, patterns: { ...fields, ...partial } });
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔄</span>
          <h4 className="text-sm font-bold text-purple-700 font-tajawal">إعدادات خاصة بالأنماط</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نوع النمط</label>
            <select value={fields.patternType} onChange={e => update({ patternType: e.target.value as PatternsSpecificFields['patternType'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="color">لوني</option>
              <option value="number">عددي</option>
              <option value="shape">شكلي</option>
              <option value="size">حجمي</option>
              <option value="mixed">مختلط</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">طول التسلسل</label>
            <div className="flex gap-1">
              {[3, 4, 5, 6, 7, 8].map(n => (
                <button key={n} onClick={() => update({ sequenceLength: n })}
                  className={`w-7 h-7 rounded text-[10px] font-bold ${fields.sequenceLength === n ? 'bg-purple-500 text-white' : 'bg-white border text-gray-600'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">قاعدة النمط</label>
            <Input value={fields.patternRule} onChange={e => update({ patternRule: e.target.value })}
              placeholder="مثال: +2, ×2, تكرار AB..." className="text-xs font-tajawal" dir="rtl" />
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">موقع العنصر المفقود</label>
            <select value={fields.missingElementPosition} onChange={e => update({ missingElementPosition: e.target.value as PatternsSpecificFields['missingElementPosition'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="end">النهاية</option>
              <option value="middle">الوسط</option>
              <option value="start">البداية</option>
              <option value="multiple">متعدد</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نمط متنامي</label>
            <button onClick={() => update({ growingPattern: !fields.growingPattern })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.growingPattern ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.growingPattern ? '✓ نمط متنامي (تزايدي)' : 'نمط متكرر (ثابت)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (domain === 'time') {
    const fields = data.time || DEFAULT_TIME;
    const update = (partial: Partial<TimeSpecificFields>) => onChange({ ...data, time: { ...fields, ...partial } });
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/30 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🕐</span>
          <h4 className="text-sm font-bold text-cyan-700 font-tajawal">إعدادات خاصة بالوقت</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">شكل الساعة</label>
            <select value={fields.timeFormat} onChange={e => update({ timeFormat: e.target.value as TimeSpecificFields['timeFormat'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="analog">تناظرية (عقارب)</option>
              <option value="digital">رقمية</option>
              <option value="both">كلاهما</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نوع العملية</label>
            <select value={fields.operationType} onChange={e => update({ operationType: e.target.value as TimeSpecificFields['operationType'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="read">قراءة الوقت</option>
              <option value="elapsed">الوقت المنقضي</option>
              <option value="convert">تحويل الوحدات</option>
              <option value="compare">مقارنة الأوقات</option>
              <option value="sequence">ترتيب الأحداث</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نطاق الساعات</label>
            <div className="flex items-center gap-1">
              <Input type="number" value={fields.hourRange.min} onChange={e => update({ hourRange: { ...fields.hourRange, min: +e.target.value } })}
                className="w-16 text-xs text-center" min={1} max={12} />
              <span className="text-xs text-gray-400">-</span>
              <Input type="number" value={fields.hourRange.max} onChange={e => update({ hourRange: { ...fields.hourRange, max: +e.target.value } })}
                className="w-16 text-xs text-center" min={1} max={12} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">فترات الدقائق</label>
            <div className="flex gap-1">
              {([1, 5, 10, 15, 30] as const).map(n => (
                <button key={n} onClick={() => update({ minuteInterval: n })}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold ${fields.minuteInterval === n ? 'bg-cyan-500 text-white' : 'bg-white border text-gray-600'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عرض الساعة المرئية</label>
            <button onClick={() => update({ showClockVisual: !fields.showClockVisual })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.showClockVisual ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.showClockVisual ? '✓ مفعّل' : 'معطّل'}
            </button>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نظام 24 ساعة</label>
            <button onClick={() => update({ use24Hour: !fields.use24Hour })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.use24Hour ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.use24Hour ? '✓ نظام 24 ساعة' : 'نظام 12 ساعة'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (domain === 'data') {
    const fields = data.data || DEFAULT_DATA;
    const update = (partial: Partial<DataSpecificFields>) => onChange({ ...data, data: { ...fields, ...partial } });
    return (
      <div className="p-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📊</span>
          <h4 className="text-sm font-bold text-emerald-700 font-tajawal">إعدادات خاصة بالبيانات</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">نوع الرسم البياني</label>
            <select value={fields.chartType} onChange={e => update({ chartType: e.target.value as DataSpecificFields['chartType'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="bar">أعمدة</option>
              <option value="pie">دائري</option>
              <option value="line">خطي</option>
              <option value="pictograph">صوري</option>
              <option value="table">جدول</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عدد نقاط البيانات</label>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => update({ dataPointsCount: n })}
                  className={`w-8 h-8 rounded-lg text-xs font-bold ${fields.dataPointsCount === n ? 'bg-emerald-500 text-white' : 'bg-white border text-gray-600'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">تسمية المحور الأفقي</label>
            <Input value={fields.axisLabels.x} onChange={e => update({ axisLabels: { ...fields.axisLabels, x: e.target.value } })}
              placeholder="مثال: الأيام، الفواكه..." className="text-xs font-tajawal" dir="rtl" />
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">تسمية المحور العمودي</label>
            <Input value={fields.axisLabels.y} onChange={e => update({ axisLabels: { ...fields.axisLabels, y: e.target.value } })}
              placeholder="مثال: العدد، الكمية..." className="text-xs font-tajawal" dir="rtl" />
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">تركيز السؤال</label>
            <select value={fields.questionFocus} onChange={e => update({ questionFocus: e.target.value as DataSpecificFields['questionFocus'] })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
              <option value="read">قراءة البيانات</option>
              <option value="compare">مقارنة</option>
              <option value="calculate">حساب (مجموع/فرق)</option>
              <option value="predict">توقع</option>
              <option value="organize">تنظيم وتصنيف</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">عرض جدول البيانات</label>
            <button onClick={() => update({ showTable: !fields.showTable })}
              className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${fields.showTable ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {fields.showTable ? '✓ مفعّل' : 'معطّل'}
            </button>
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-bold font-tajawal text-gray-600 mb-1 block">موضوع البيانات</label>
            <Input value={fields.dataTheme} onChange={e => update({ dataTheme: e.target.value })}
              placeholder="مثال: فواكه مفضلة، ألوان، حيوانات..." className="text-xs font-tajawal" dir="rtl" />
          </div>
        </div>
      </div>
    );
  }

  // For other domains (measurement), show a generic hint
  if (domain && domain !== '') {
    return (
      <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 text-center">
        <p className="text-xs text-gray-500 font-tajawal">📝 الحقول المشتركة كافية لهذا القسم. اختر مهارة من قسم متخصص لعرض إعدادات إضافية.</p>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════
// QUESTION EDITOR MODAL
// ═══════════════════════════════════════════════════════
function QuestionEditorModal({ question, onSave, onClose, existingIds, initialCategory = '' }: {
  question: ManagedQuestion | null;
  onSave: (q: ManagedQuestion) => void;
  onClose: () => void;
  existingIds: string[];
  initialCategory?: string;
}) {
  const isNew = !question;
  // Pre-select the first skill from the initial category if creating a new question
  const getInitialSkillMapping = (): ManagedQuestion['skillMapping'] => {
    if (question) return question.skillMapping;
    if (initialCategory) {
      const domainMatch = SKILL_DOMAINS.find(d => d.id === initialCategory);
      if (domainMatch && domainMatch.skills.length > 0) {
        const firstSkill = domainMatch.skills[0];
        return { skillId: firstSkill.id, skillName: firstSkill.name, domain: domainMatch.id, subDomain: '' };
      }
    }
    return { skillId: '', skillName: '', domain: '', subDomain: '' };
  };

  const [form, setForm] = useState<ManagedQuestion>(question || {
    id: `EQ-${String(existingIds.length + 1).padStart(3, '0')}`,
    text: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '',
    skillMapping: getInitialSkillMapping(),
    curriculumMapping: { grade: 1, semester: 1, unit: '', lesson: '', subject: 'math' },
    cognitiveType: 'recall', difficulty: 1, masteryWeight: 5,
    prerequisites: [], remediationTargets: [],
    interactionType: 'multiple_choice', hasVisual: false,
    misconceptionType: [], commonErrors: [],
    status: 'draft', createdBy: 'admin', createdAt: '', updatedAt: '',
    successRate: 0, attempts: 0, avgResponseTime: 0, discriminationIndex: 0,
  });
  const [categoryData, setCategoryData] = useState<CategorySpecificData>({});
  const [showPreview, setShowPreview] = useState(false);

  const updateField = <K extends keyof ManagedQuestion>(key: K, value: ManagedQuestion[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSkillChange = (skillId: string) => {
    const allSkills = SKILL_DOMAINS.flatMap(d => d.skills.map(s => ({ ...s, domain: d.id })));
    const skill = allSkills.find(s => s.id === skillId);
    if (skill) {
      updateField('skillMapping', { skillId: skill.id, skillName: skill.name, domain: skill.domain, subDomain: '' });
    }
  };

  const currentDomain = form.skillMapping.domain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 font-tajawal">{isNew ? 'إنشاء سؤال جديد' : 'تعديل السؤال'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          {/* Skill & Curriculum Row - MOVED TO TOP for category detection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">المهارة * (اختر أولاً لعرض الإعدادات المتخصصة)</label>
              <select value={form.skillMapping.skillId} onChange={e => handleSkillChange(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                <option value="">اختر المهارة</option>
                {SKILL_DOMAINS.map(d => (
                  <optgroup key={d.id} label={d.label}>
                    {d.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">المادة</label>
              <select value={form.curriculumMapping.subject} onChange={e => updateField('curriculumMapping', { ...form.curriculumMapping, subject: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                {SUBJECT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Category-Specific Fields - shown based on selected domain */}
          <CategorySpecificFieldsPanel domain={currentDomain} data={categoryData} onChange={setCategoryData} />

          {/* Question Text */}
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">نص السؤال *</label>
            <Input value={form.text} onChange={e => updateField('text', e.target.value)} placeholder="اكتب نص السؤال..." className="font-tajawal" dir="rtl" />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الخيارات (اضغط على الإجابة الصحيحة)</label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => updateField('correctAnswer', i)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${i === form.correctAnswer ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                    {i === form.correctAnswer && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </button>
                  <Input value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; updateField('options', opts); }}
                    placeholder={`الخيار ${i + 1}`} className="font-tajawal text-sm" dir="rtl" />
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الشرح</label>
            <Input value={form.explanation} onChange={e => updateField('explanation', e.target.value)} placeholder="شرح الإجابة الصحيحة..." className="font-tajawal" dir="rtl" />
          </div>

          {/* Grade & Semester */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الصف</label>
              <select value={form.curriculumMapping.grade} onChange={e => updateField('curriculumMapping', { ...form.curriculumMapping, grade: parseInt(e.target.value) as 1 | 2 })}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الفصل</label>
              <select value={form.curriculumMapping.semester} onChange={e => updateField('curriculumMapping', { ...form.curriculumMapping, semester: parseInt(e.target.value) as 1 | 2 })}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الدرس</label>
              <Input value={form.curriculumMapping.lesson} onChange={e => updateField('curriculumMapping', { ...form.curriculumMapping, lesson: e.target.value })}
                placeholder="اسم الدرس" className="font-tajawal text-xs" dir="rtl" />
            </div>
          </div>

          {/* Cognitive & Difficulty & Interaction */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">النوع المعرفي</label>
              <select value={form.cognitiveType} onChange={e => updateField('cognitiveType', e.target.value as CognitiveType)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                {COGNITIVE_TYPE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الصعوبة (1-5)</label>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as DifficultyLevel[]).map(d => (
                  <button key={d} onClick={() => updateField('difficulty', d)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${form.difficulty === d ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">نوع التفاعل</label>
              <select value={form.interactionType} onChange={e => updateField('interactionType', e.target.value as InteractionType)}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                {INTERACTION_TYPE_OPTIONS.map(i => <option key={i.value} value={i.value}>{i.icon} {i.label}</option>)}
              </select>
            </div>
          </div>

          {/* Mastery Weight */}
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">وزن الإتقان (1-10)</label>
            <input type="range" min={1} max={10} value={form.masteryWeight} onChange={e => updateField('masteryWeight', parseInt(e.target.value))}
              className="w-full" />
            <span className="text-xs text-gray-500 font-tajawal">{form.masteryWeight}/10</span>
          </div>

          {/* Misconceptions */}
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">أنواع المفاهيم الخاطئة</label>
            <div className="flex flex-wrap gap-2">
              {MISCONCEPTION_TYPE_OPTIONS.map(m => (
                <button key={m.value} onClick={() => {
                  const current = form.misconceptionType;
                  const updated = current.includes(m.value) ? current.filter(x => x !== m.value) : [...current, m.value];
                  updateField('misconceptionType', updated);
                }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-tajawal ${form.misconceptionType.includes(m.value) ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Common Errors */}
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الأخطاء الشائعة (مفصولة بفاصلة)</label>
            <Input value={form.commonErrors.join('، ')} onChange={e => updateField('commonErrors', e.target.value.split('، ').filter(Boolean))}
              placeholder="خطأ 1، خطأ 2..." className="font-tajawal text-xs" dir="rtl" />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الحالة</label>
            <div className="flex gap-2">
              {(['draft', 'review', 'published'] as QuestionStatus[]).map(s => (
                <button key={s} onClick={() => updateField('status', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${form.status === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {s === 'draft' ? 'مسودة' : s === 'review' ? 'مراجعة' : 'نشر'}
                </button>
              ))}
            </div>
          </div>

          {/* In-Modal Preview Panel */}
          {showPreview && (
            <div className="border-2 border-indigo-200 rounded-xl p-4 bg-gradient-to-b from-indigo-50/50 to-white space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-indigo-700 font-tajawal flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  معاينة السؤال كما يراه الطالب
                </h4>
                <button onClick={() => setShowPreview(false)} className="text-xs text-indigo-500 hover:text-indigo-700 font-tajawal">إغلاق المعاينة</button>
              </div>

              {/* Visual Element Preview */}
              {form.skillMapping.domain && (
                <div className="flex justify-center py-3">
                  {form.skillMapping.domain === 'dice' && (
                    <div className="flex gap-3">
                      {Array.from({ length: categoryData.dice?.numberOfDice || 2 }).map((_, i) => (
                        <div key={i} className="w-14 h-14 bg-white border-2 border-red-200 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-2xl">🎲</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.skillMapping.domain === 'abacus' && (
                    <div className="flex gap-1 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      {Array.from({ length: categoryData.abacus?.columns || 2 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          {Array.from({ length: Math.min(categoryData.abacus?.beadCount || 5, 5) }).map((_, j) => (
                            <div key={j} className="w-4 h-4 rounded-full bg-amber-400 border border-amber-500" />
                          ))}
                          <div className="w-0.5 h-6 bg-amber-300" />
                        </div>
                      ))}
                    </div>
                  )}
                  {form.skillMapping.domain === 'time' && (
                    <div className="w-20 h-20 rounded-full border-4 border-cyan-300 bg-white flex items-center justify-center relative">
                      <div className="absolute w-0.5 h-6 bg-cyan-700 origin-bottom" style={{ transform: 'rotate(0deg)', bottom: '50%' }} />
                      <div className="absolute w-0.5 h-8 bg-cyan-400 origin-bottom" style={{ transform: 'rotate(90deg)', bottom: '50%' }} />
                      <div className="absolute w-1.5 h-1.5 bg-cyan-700 rounded-full" />
                      {[12, 3, 6, 9].map(n => (
                        <span key={n} className="absolute text-[8px] font-bold text-cyan-700" style={{
                          top: n === 12 ? '4px' : n === 6 ? 'auto' : '50%',
                          bottom: n === 6 ? '4px' : 'auto',
                          left: n === 9 ? '6px' : n === 3 ? 'auto' : '50%',
                          right: n === 3 ? '6px' : 'auto',
                          transform: (n === 12 || n === 6) ? 'translateX(-50%)' : (n === 3 || n === 9) ? 'translateY(-50%)' : 'none',
                        }}>{n}</span>
                      ))}
                    </div>
                  )}
                  {form.skillMapping.domain === 'data' && (
                    <div className="flex items-end gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 h-20">
                      {Array.from({ length: categoryData.data?.dataPointsCount || 4 }).map((_, i) => (
                        <div key={i} className="w-6 bg-emerald-400 rounded-t" style={{ height: `${20 + Math.random() * 40}px` }} />
                      ))}
                    </div>
                  )}
                  {form.skillMapping.domain === 'geometry' && (
                    <div className="w-16 h-16 flex items-center justify-center">
                      {categoryData.geometry?.shapeType === 'circle' && <div className="w-14 h-14 rounded-full border-3 border-teal-400 bg-teal-50" />}
                      {categoryData.geometry?.shapeType === 'square' && <div className="w-14 h-14 border-3 border-teal-400 bg-teal-50" />}
                      {categoryData.geometry?.shapeType === 'triangle' && <div className="w-0 h-0 border-l-[28px] border-r-[28px] border-b-[48px] border-l-transparent border-r-transparent border-b-teal-400" />}
                      {categoryData.geometry?.shapeType === 'rectangle' && <div className="w-16 h-10 border-3 border-teal-400 bg-teal-50" />}
                      {(!categoryData.geometry?.shapeType || !['circle', 'square', 'triangle', 'rectangle'].includes(categoryData.geometry?.shapeType || '')) && <div className="w-14 h-14 border-3 border-teal-400 bg-teal-50 rotate-45" />}
                    </div>
                  )}
                  {form.skillMapping.domain === 'patterns' && (
                    <div className="flex gap-2 items-center p-2 bg-purple-50 rounded-xl border border-purple-200">
                      {Array.from({ length: categoryData.patterns?.sequenceLength || 5 }).map((_, i) => (
                        <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i % 2 === 0 ? 'bg-purple-400 text-white' : 'bg-purple-100 text-purple-700'}`}>
                          {i === (categoryData.patterns?.sequenceLength || 5) - 1 ? '?' : i + 1}
                        </div>
                      ))}
                    </div>
                  )}
                  {form.skillMapping.domain === 'numbers' && categoryData.numbers?.showNumberLine && (
                    <div className="flex items-center gap-0 p-2 bg-blue-50 rounded-xl border border-blue-200">
                      {Array.from({ length: 11 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className={`w-1 h-3 ${i % 5 === 0 ? 'bg-blue-600' : 'bg-blue-300'}`} />
                          {i % 5 === 0 && <span className="text-[8px] text-blue-600 mt-0.5">{(categoryData.numbers?.numberRange.min || 0) + i}</span>}
                          {i < 10 && <div className="w-4 h-0.5 bg-blue-300 -mt-2" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Question Text */}
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-base font-bold font-tajawal text-gray-800 text-center mb-4">
                  {form.text || 'نص السؤال سيظهر هنا...'}
                </p>
                {/* Options */}
                <div className="space-y-2">
                  {form.options.filter(o => o.trim()).map((opt, i) => (
                    <div key={i} className={`p-3 rounded-xl border-2 text-center font-tajawal text-sm transition-all ${
                      i === form.correctAnswer ? 'border-green-400 bg-green-50 font-bold text-green-700' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-indigo-200'
                    }`}>
                      {opt}
                      {i === form.correctAnswer && <span className="mr-2 text-green-500">✓</span>}
                    </div>
                  ))}
                </div>
                {form.explanation && (
                  <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 font-tajawal">💡 {form.explanation}</p>
                  </div>
                )}
              </div>

              {/* Metadata Tags */}
              <div className="flex flex-wrap gap-2 justify-center">
                {form.skillMapping.skillName && <Badge className="bg-indigo-100 text-indigo-700 text-[10px] font-tajawal">{form.skillMapping.skillName}</Badge>}
                <Badge className="bg-gray-100 text-gray-600 text-[10px] font-tajawal">الصف {form.curriculumMapping.grade}</Badge>
                <Badge className="bg-purple-100 text-purple-700 text-[10px] font-tajawal">{COGNITIVE_TYPE_OPTIONS.find(c => c.value === form.cognitiveType)?.icon} {COGNITIVE_TYPE_OPTIONS.find(c => c.value === form.cognitiveType)?.label}</Badge>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= form.difficulty ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <Badge className="bg-blue-100 text-blue-700 text-[10px] font-tajawal">{INTERACTION_TYPE_OPTIONS.find(t => t.value === form.interactionType)?.icon} {INTERACTION_TYPE_OPTIONS.find(t => t.value === form.interactionType)?.label}</Badge>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="font-tajawal">إلغاء</Button>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}
              className={`font-tajawal ${showPreview ? 'border-indigo-300 text-indigo-600 bg-indigo-50' : ''}`}>
              <Eye className="w-4 h-4 ml-1" />
              {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
            </Button>
            <Button onClick={() => onSave(form)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-tajawal" disabled={!form.text.trim() || !form.skillMapping.skillId}>
              {isNew ? 'إنشاء' : 'حفظ التعديلات'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}