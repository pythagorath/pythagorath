// Admin Intelligence Dashboard - Educational Decision Intelligence Management
// Provides: class overview, per-student intelligence, skill graph visualization,
// decision analytics, misconception patterns, and adaptive configuration

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Brain, Network, AlertTriangle, TrendingUp, Activity,
  Target, Zap, BarChart3, Users, ArrowLeft, RefreshCw,
  CheckCircle, XCircle, Clock, Lightbulb, Route, Shield
} from 'lucide-react';
import { getClassIntelligenceSummary, type ClassIntelligenceSummary } from '@/lib/educationalIntelligenceHub';
import { getDecisionAnalytics } from '@/lib/adaptiveDecisionEngine';
import { skillPrerequisites } from '@/data/skillPrerequisites';

// Mock student data for demonstration
const MOCK_STUDENTS = [
  { userId: 'student_1', name: 'أحمد', grade: 1 as const, allProgress: generateMockProgress('G1', 62) },
  { userId: 'student_2', name: 'سارة', grade: 1 as const, allProgress: generateMockProgress('G1', 48) },
  { userId: 'student_3', name: 'محمد', grade: 2 as const, allProgress: generateMockProgress('G2', 71) },
  { userId: 'student_4', name: 'فاطمة', grade: 2 as const, allProgress: generateMockProgress('G2', 55) },
  { userId: 'student_5', name: 'عمر', grade: 1 as const, allProgress: generateMockProgress('G1', 35) },
  { userId: 'student_6', name: 'نور', grade: 1 as const, allProgress: generateMockProgress('G1', 30) },
  { userId: 'student_7', name: 'يوسف', grade: 2 as const, allProgress: generateMockProgress('G2', 67) },
  { userId: 'student_8', name: 'مريم', grade: 2 as const, allProgress: generateMockProgress('G2', 52) },
];

const SKILL_NAMES: Record<string, string> = {
  'G1-N-001': 'العد من 1 إلى 5',
  'G1-N-002': 'العد من 1 إلى 10',
  'G1-N-003': 'قراءة الأعداد حتى 10',
  'G1-N-004': 'كتابة الأعداد حتى 10',
  'G1-N-005': 'مطابقة العدد بالكمية',
  'G1-N-012': 'الجمع ضمن 10',
  'G1-N-013': 'الطرح ضمن 10',
  'G2-N-001': 'قراءة الأعداد حتى 100',
  'G2-N-002': 'كتابة الأعداد حتى 100',
  'G2-C-001': 'الجمع ضمن 20',
  'G2-C-003': 'الجمع ضمن 100',
  'G2-C-004': 'الطرح ضمن 100',
};

function generateMockProgress(prefix: string, avgMastery: number) {
  const skills = Object.keys(skillPrerequisites).filter(s => s.startsWith(prefix));
  return skills.slice(0, 15).map(skillId => ({
    skillId,
    totalAttempts: Math.floor(Math.random() * 20) + 5,
    correctCount: Math.floor((avgMastery / 100) * (Math.floor(Math.random() * 20) + 5)),
    lastAttemptDate: new Date().toISOString(),
    streak: Math.floor(Math.random() * 5),
  }));
}

export default function IntelligenceDashboard() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const gradeSkillIds = Object.keys(skillPrerequisites);

  const classSummary = useMemo(() => {
    return getClassIntelligenceSummary(MOCK_STUDENTS, gradeSkillIds, SKILL_NAMES);
  }, []);

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              لوحة الذكاء التعليمي
            </h1>
            <p className="text-gray-500 text-sm font-tajawal">إدارة القرارات التكيفية وتحليل الأداء</p>
          </div>
        </div>
        <Badge className="bg-purple-100 text-purple-700 font-tajawal">
          <Activity className="w-3 h-3 ml-1" />
          نشط
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="الطلاب"
          value={classSummary.totalStudents}
          subtitle={`${classSummary.studentsNeedingAttention} يحتاج متابعة`}
          color="blue"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-green-600" />}
          label="صحة الصف"
          value={`${classSummary.avgHealthScore}%`}
          subtitle="متوسط صحة التعلم"
          color="green"
        />
        <StatCard
          icon={<Network className="w-5 h-5 text-purple-600" />}
          label="نسبة الإتقان"
          value={`${classSummary.classCompletionRate}%`}
          subtitle="من المنهج"
          color="purple"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          label="مفاهيم خاطئة"
          value={classSummary.topMisconceptions.reduce((s, m) => s + m.count, 0)}
          subtitle="إجمالي مكتشف"
          color="amber"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border flex-wrap">
          <TabsTrigger value="overview" className="font-tajawal text-xs">نظرة عامة</TabsTrigger>
          <TabsTrigger value="students" className="font-tajawal text-xs">الطلاب</TabsTrigger>
          <TabsTrigger value="skills" className="font-tajawal text-xs">المهارات</TabsTrigger>
          <TabsTrigger value="decisions" className="font-tajawal text-xs">القرارات</TabsTrigger>
          <TabsTrigger value="misconceptions" className="font-tajawal text-xs">المفاهيم الخاطئة</TabsTrigger>
          <TabsTrigger value="graph" className="font-tajawal text-xs">الرسم البياني</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <OverviewTab classSummary={classSummary} />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <StudentsTab
            classSummary={classSummary}
            selectedStudent={selectedStudent}
            onSelectStudent={setSelectedStudent}
          />
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4 mt-4">
          <SkillsTab classSummary={classSummary} />
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions" className="space-y-4 mt-4">
          <DecisionsTab />
        </TabsContent>

        {/* Misconceptions Tab */}
        <TabsContent value="misconceptions" className="space-y-4 mt-4">
          <MisconceptionsTab classSummary={classSummary} />
        </TabsContent>

        {/* Graph Tab */}
        <TabsContent value="graph" className="space-y-4 mt-4">
          <GraphTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function StatCard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg bg-${color}-50`}>{icon}</div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500 font-tajawal">{label}</p>
          <p className="text-[10px] text-gray-400 font-tajawal mt-1">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ classSummary }: { classSummary: ClassIntelligenceSummary }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Health Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            توزيع صحة التعلم
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'ممتاز (80+)', count: classSummary.studentSnapshots.filter(s => s.healthScore >= 80).length, color: 'bg-green-500' },
            { label: 'جيد (65-79)', count: classSummary.studentSnapshots.filter(s => s.healthScore >= 65 && s.healthScore < 80).length, color: 'bg-blue-500' },
            { label: 'مقبول (50-64)', count: classSummary.studentSnapshots.filter(s => s.healthScore >= 50 && s.healthScore < 65).length, color: 'bg-amber-500' },
            { label: 'يحتاج متابعة (<50)', count: classSummary.studentSnapshots.filter(s => s.healthScore < 50).length, color: 'bg-red-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-sm text-gray-600 font-tajawal flex-1">{item.label}</span>
              <span className="font-bold text-gray-800">{item.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hardest Skills */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            أصعب المهارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {classSummary.hardestSkills.slice(0, 5).map((skill, i) => (
            <div key={skill.skillId} className="flex items-center gap-2 p-2 bg-red-50/50 rounded-lg">
              <span className="text-xs font-bold text-red-600 w-5">{i + 1}</span>
              <span className="text-sm text-gray-700 font-tajawal flex-1">{skill.nameAr}</span>
              <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                {skill.failureRate}% فشل
              </Badge>
            </div>
          ))}
          {classSummary.hardestSkills.length === 0 && (
            <p className="text-sm text-gray-400 font-tajawal text-center py-4">لا توجد بيانات كافية</p>
          )}
        </CardContent>
      </Card>

      {/* Decision Engine Stats */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            محرك القرارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'قرارات تكيفية', value: 'نشط', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
            { label: 'كشف المفاهيم الخاطئة', value: 'نشط', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
            { label: 'تخطيط الجلسات', value: 'نشط', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
            { label: 'معايرة الصعوبة', value: 'نشط', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
            { label: 'رسم المعرفة', value: 'نشط', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
            { label: 'التنبؤ بالأخطاء', value: 'نشط', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-tajawal">{item.label}</span>
              <div className="flex items-center gap-1">
                {item.icon}
                <span className="text-xs text-green-600 font-tajawal">{item.value}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Adaptive Missions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <Route className="w-4 h-4 text-indigo-600" />
            المسارات التكيفية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-sm font-bold text-indigo-800 font-tajawal">المسارات النشطة</p>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-tajawal">علاج تلقائي</span>
                <span className="font-bold text-indigo-700">3 طلاب</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-tajawal">تسريع</span>
                <span className="font-bold text-indigo-700">2 طلاب</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-tajawal">مراجعة تعزيزية</span>
                <span className="font-bold text-indigo-700">4 طلاب</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-tajawal">تقييم تشخيصي</span>
                <span className="font-bold text-indigo-700">1 طالب</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentsTab({ classSummary, selectedStudent, onSelectStudent }: {
  classSummary: ClassIntelligenceSummary;
  selectedStudent: string | null;
  onSelectStudent: (id: string | null) => void;
}) {
  const [analysisStudent, setAnalysisStudent] = useState<string | null>(null);
  const [remediationStudent, setRemediationStudent] = useState<string | null>(null);

  const getStudentAnalysis = (studentId: string) => {
    const student = classSummary.studentSnapshots.find(s => s.userId === studentId);
    if (!student) return null;
    const totalSkills = student.masteredCount + student.learningCount + Math.max(0, 15 - student.masteredCount - student.learningCount);
    const weakSkills = Object.keys(SKILL_NAMES).slice(0, 3);
    return {
      student,
      totalSkills,
      weakSkills,
      completionRate: Math.round((student.masteredCount / totalSkills) * 100),
      avgSessionTime: Math.floor(Math.random() * 15) + 8,
      totalSessions: Math.floor(Math.random() * 30) + 10,
      lastActive: 'اليوم',
      learningStyle: student.healthScore > 60 ? 'بصري-حركي' : 'سمعي-تكراري',
      attentionSpan: student.healthScore > 60 ? 'جيد (12-15 دقيقة)' : 'قصير (5-8 دقائق)',
      misconceptions: student.healthScore < 50 ? ['خلط بين الجمع والطرح', 'صعوبة في القيمة المكانية'] : ['أخطاء حسابية بسيطة'],
      strengths: student.masteredCount > 5 ? ['العد التسلسلي', 'التعرف على الأرقام'] : ['المثابرة'],
    };
  };

  const getRemediationPlan = (studentId: string) => {
    const student = classSummary.studentSnapshots.find(s => s.userId === studentId);
    if (!student) return null;
    const weakAreas = student.healthScore < 50
      ? [
          { skill: 'الجمع ضمن 10', level: 'أساسي', steps: ['مراجعة المفهوم بالمحسوسات', 'تمارين محلولة', 'تمارين موجهة', 'تمارين مستقلة'] },
          { skill: 'القيمة المكانية', level: 'متوسط', steps: ['شرح بصري', 'أمثلة تفاعلية', 'تطبيق عملي'] },
        ]
      : [
          { skill: 'الطرح ضمن 20', level: 'متقدم', steps: ['تعزيز الفهم', 'مسائل كلامية', 'تحدي ذاتي'] },
        ];
    return {
      student,
      weakAreas,
      estimatedDuration: weakAreas.length * 3 + ' أيام',
      priority: student.healthScore < 40 ? 'عاجل' : student.healthScore < 60 ? 'متوسط' : 'منخفض',
      approach: student.healthScore < 50 ? 'تدريجي مع دعم مكثف' : 'تعزيزي مع تحديات',
    };
  };

  const analysisData = analysisStudent ? getStudentAnalysis(analysisStudent) : null;
  const remediationData = remediationStudent ? getRemediationPlan(remediationStudent) : null;

  return (
    <div className="space-y-4">
      {/* Full Analysis Modal */}
      {analysisStudent && analysisData && (
        <Card className="border-2 border-purple-300 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-tajawal text-base flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                التحليل الكامل - {analysisData.student.name}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setAnalysisStudent(null)} className="text-gray-500">
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-xl font-bold text-purple-700">{analysisData.student.healthScore}%</p>
                <p className="text-[10px] text-gray-500 font-tajawal">صحة التعلم</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-xl font-bold text-green-700">{analysisData.completionRate}%</p>
                <p className="text-[10px] text-gray-500 font-tajawal">نسبة الإتقان</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-xl font-bold text-blue-700">{analysisData.totalSessions}</p>
                <p className="text-[10px] text-gray-500 font-tajawal">إجمالي الجلسات</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-xl font-bold text-amber-700">{analysisData.avgSessionTime} د</p>
                <p className="text-[10px] text-gray-500 font-tajawal">متوسط الجلسة</p>
              </div>
            </div>

            {/* Learning profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-bold text-sm font-tajawal text-gray-700">الملف التعليمي</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600 font-tajawal">نمط التعلم</span>
                    <span className="font-bold font-tajawal">{analysisData.learningStyle}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600 font-tajawal">مدة الانتباه</span>
                    <span className="font-bold font-tajawal">{analysisData.attentionSpan}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600 font-tajawal">آخر نشاط</span>
                    <span className="font-bold font-tajawal">{analysisData.lastActive}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm font-tajawal text-gray-700">نقاط القوة</h4>
                <div className="flex flex-wrap gap-1">
                  {analysisData.strengths.map((s, i) => (
                    <Badge key={i} className="bg-green-100 text-green-700 text-[10px] font-tajawal">{s}</Badge>
                  ))}
                </div>
                <h4 className="font-bold text-sm font-tajawal text-gray-700 mt-2">المفاهيم الخاطئة</h4>
                <div className="flex flex-wrap gap-1">
                  {analysisData.misconceptions.map((m, i) => (
                    <Badge key={i} className="bg-red-100 text-red-700 text-[10px] font-tajawal">{m}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Skill breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm font-tajawal text-gray-700">تفصيل المهارات</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-700">{analysisData.student.masteredCount}</p>
                  <p className="text-[10px] text-gray-500 font-tajawal">متقنة</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-700">{analysisData.student.learningCount}</p>
                  <p className="text-[10px] text-gray-500 font-tajawal">قيد التعلم</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-700">
                    {Math.max(0, analysisData.totalSkills - analysisData.student.masteredCount - analysisData.student.learningCount)}
                  </p>
                  <p className="text-[10px] text-gray-500 font-tajawal">لم تبدأ</p>
                </div>
              </div>
            </div>

            {/* Weak skills detail */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm font-tajawal text-gray-700">المهارات الأضعف</h4>
              {analysisData.weakSkills.map(skillId => (
                <div key={skillId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="text-xs font-tajawal text-gray-700">{SKILL_NAMES[skillId] || skillId}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.floor(Math.random() * 40) + 10} className="w-20 h-2" />
                    <span className="text-[10px] text-red-600 font-bold">{Math.floor(Math.random() * 40) + 10}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remediation Path Modal */}
      {remediationStudent && remediationData && (
        <Card className="border-2 border-green-300 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-tajawal text-base flex items-center gap-2">
                <Route className="w-5 h-5 text-green-600" />
                المسار العلاجي - {remediationData.student.name}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setRemediationStudent(null)} className="text-gray-500">
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-sm font-bold text-green-700 font-tajawal">{remediationData.priority}</p>
                <p className="text-[10px] text-gray-500 font-tajawal">الأولوية</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-sm font-bold text-blue-700 font-tajawal">{remediationData.estimatedDuration}</p>
                <p className="text-[10px] text-gray-500 font-tajawal">المدة المتوقعة</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-sm font-bold text-purple-700 font-tajawal">{remediationData.weakAreas.length}</p>
                <p className="text-[10px] text-gray-500 font-tajawal">مجالات العلاج</p>
              </div>
            </div>

            {/* Approach */}
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs font-bold text-amber-800 font-tajawal mb-1">المنهجية المقترحة</p>
              <p className="text-xs text-amber-700 font-tajawal">{remediationData.approach}</p>
            </div>

            {/* Remediation steps */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm font-tajawal text-gray-700">خطوات العلاج</h4>
              {remediationData.weakAreas.map((area, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm font-tajawal text-gray-800">{area.skill}</span>
                    <Badge className="bg-blue-100 text-blue-700 text-[10px] font-tajawal">{area.level}</Badge>
                  </div>
                  <div className="space-y-1">
                    {area.steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">
                          {stepIdx + 1}
                        </div>
                        <span className="font-tajawal text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action button */}
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-tajawal text-sm">
              <CheckCircle className="w-4 h-4 ml-2" />
              تفعيل المسار العلاجي
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {classSummary.studentSnapshots.map(student => (
          <Card
            key={student.userId}
            className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedStudent === student.userId ? 'ring-2 ring-purple-400' : ''
            }`}
            onClick={() => onSelectStudent(selectedStudent === student.userId ? null : student.userId)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    student.healthScore >= 65 ? 'bg-green-500' :
                    student.healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 font-tajawal">{student.name}</p>
                    <p className="text-xs text-gray-500 font-tajawal">الصف {student.grade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-800">{student.healthScore}</p>
                    <p className="text-[10px] text-gray-400 font-tajawal">صحة التعلم</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-600">{student.masteredCount}</p>
                    <p className="text-[10px] text-gray-400 font-tajawal">متقن</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-600">{student.learningCount}</p>
                    <p className="text-[10px] text-gray-400 font-tajawal">يتعلم</p>
                  </div>
                  {student.needsAttention && (
                    <Badge className="bg-red-100 text-red-700 text-xs font-tajawal">
                      <AlertTriangle className="w-3 h-3 ml-1" />
                      يحتاج متابعة
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expanded view */}
              {selectedStudent === student.userId && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-center">
                      <p className="text-lg font-bold text-green-700">{student.masteredCount}</p>
                      <p className="text-[10px] text-gray-500 font-tajawal">مهارات متقنة</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-center">
                      <p className="text-lg font-bold text-blue-700">{student.learningCount}</p>
                      <p className="text-[10px] text-gray-500 font-tajawal">قيد التعلم</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg text-center">
                      <p className="text-lg font-bold text-gray-700">
                        {Math.max(0, 15 - student.masteredCount - student.learningCount)}
                      </p>
                      <p className="text-[10px] text-gray-500 font-tajawal">لم تبدأ</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-tajawal"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalysisStudent(student.userId);
                        setRemediationStudent(null);
                      }}
                    >
                      <Brain className="w-3 h-3 ml-1" />
                      عرض التحليل الكامل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-tajawal"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemediationStudent(student.userId);
                        setAnalysisStudent(null);
                      }}
                    >
                      <Route className="w-3 h-3 ml-1" />
                      إنشاء مسار علاجي
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SkillsTab({ classSummary }: { classSummary: ClassIntelligenceSummary }) {
  const allSkills = Object.entries(SKILL_NAMES).map(([id, name]) => {
    const hardSkill = classSummary.hardestSkills.find(s => s.skillId === id);
    return {
      id,
      name,
      failureRate: hardSkill?.failureRate || Math.floor(Math.random() * 30),
      prereqs: skillPrerequisites[id] || [],
      dependents: Object.entries(skillPrerequisites).filter(([, deps]) => deps.includes(id)).map(([k]) => k),
    };
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-600" />
            خريطة المهارات والعلاقات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allSkills.map(skill => (
              <div key={skill.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800 font-tajawal">{skill.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{skill.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {skill.prereqs.length > 0 && (
                      <Badge variant="outline" className="text-[10px] font-tajawal">
                        {skill.prereqs.length} متطلب
                      </Badge>
                    )}
                    {skill.dependents.length > 0 && (
                      <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200 font-tajawal">
                        {skill.dependents.length} يعتمد عليها
                      </Badge>
                    )}
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      skill.failureRate > 50 ? 'bg-red-100 text-red-700' :
                      skill.failureRate > 30 ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {skill.failureRate}% فشل
                    </div>
                  </div>
                </div>
                {skill.prereqs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {skill.prereqs.map(p => (
                      <span key={p} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                        ← {SKILL_NAMES[p] || p}
                      </span>
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

function DecisionsTab() {
  // Aggregate decision analytics across students
  const decisionTypes = [
    { type: 'next_activity', label: 'النشاط التالي', icon: <TrendingUp className="w-4 h-4" />, count: 45, color: 'text-blue-600' },
    { type: 'difficulty_adjustment', label: 'تعديل الصعوبة', icon: <BarChart3 className="w-4 h-4" />, count: 23, color: 'text-purple-600' },
    { type: 'remediation_trigger', label: 'بدء العلاج', icon: <Lightbulb className="w-4 h-4" />, count: 12, color: 'text-amber-600' },
    { type: 'pacing_intervention', label: 'تدخل الإيقاع', icon: <Clock className="w-4 h-4" />, count: 8, color: 'text-green-600' },
    { type: 'skill_transition', label: 'انتقال المهارة', icon: <Route className="w-4 h-4" />, count: 15, color: 'text-indigo-600' },
    { type: 'session_control', label: 'تحكم الجلسة', icon: <Shield className="w-4 h-4" />, count: 5, color: 'text-red-600' },
  ];

  const totalDecisions = decisionTypes.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            إحصائيات القرارات التكيفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-purple-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-800 font-tajawal">إجمالي القرارات</span>
              <span className="text-2xl font-bold text-purple-700">{totalDecisions}</span>
            </div>
            <p className="text-[10px] text-purple-500 font-tajawal mt-1">آخر 7 أيام</p>
          </div>

          <div className="space-y-3">
            {decisionTypes.map(dt => (
              <div key={dt.type} className="flex items-center gap-3">
                <div className={dt.color}>{dt.icon}</div>
                <span className="text-sm text-gray-700 font-tajawal flex-1">{dt.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${(dt.count / totalDecisions) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-600 w-8 text-left">{dt.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base">أسباب القرارات الأكثر شيوعاً</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { reason: 'normal_progression', label: 'تقدم طبيعي', count: 35 },
            { reason: 'high_performance_streak', label: 'سلسلة أداء عالي', count: 15 },
            { reason: 'frustration_rising', label: 'ارتفاع الإحباط', count: 10 },
            { reason: 'misconception_detected', label: 'مفهوم خاطئ مكتشف', count: 8 },
            { reason: 'fatigue_high', label: 'إرهاق مرتفع', count: 6 },
          ].map((r, i) => (
            <div key={r.reason} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
              <span className="text-sm text-gray-700 font-tajawal flex-1">{r.label}</span>
              <span className="text-xs font-bold text-purple-600">{r.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MisconceptionsTab({ classSummary }: { classSummary: ClassIntelligenceSummary }) {
  const misconceptionLabels: Record<string, string> = {
    'off_by_one': 'خطأ بمقدار واحد',
    'digit_swap': 'تبديل الأرقام',
    'operation_inverse': 'عكس العملية',
    'guessing': 'تخمين عشوائي',
    'perseveration': 'تكرار نفس الإجابة',
    'place_value': 'خطأ في القيمة المكانية',
    'carry_error': 'خطأ في الحمل',
    'borrow_error': 'خطأ في الاستلاف',
  };

  const misconceptionDetails = [
    { type: 'off_by_one', count: 12, severity: 'medium', affectedSkills: ['G1-N-012', 'G1-N-013'] },
    { type: 'operation_inverse', count: 8, severity: 'high', affectedSkills: ['G1-N-013', 'G2-C-004'] },
    { type: 'place_value', count: 6, severity: 'high', affectedSkills: ['G2-N-001', 'G2-C-003'] },
    { type: 'carry_error', count: 5, severity: 'medium', affectedSkills: ['G2-C-001', 'G2-C-003'] },
    { type: 'guessing', count: 4, severity: 'low', affectedSkills: [] },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            المفاهيم الخاطئة المكتشفة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {misconceptionDetails.map(m => (
            <div key={m.type} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 font-tajawal">
                    {misconceptionLabels[m.type] || m.type}
                  </span>
                  <Badge className={`text-[10px] ${
                    m.severity === 'high' ? 'bg-red-100 text-red-700' :
                    m.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {m.severity === 'high' ? 'خطورة عالية' : m.severity === 'medium' ? 'متوسط' : 'منخفض'}
                  </Badge>
                </div>
                <span className="text-lg font-bold text-red-600">{m.count}</span>
              </div>
              {m.affectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.affectedSkills.map(s => (
                    <span key={s} className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-tajawal">
                      {SKILL_NAMES[s] || s}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" className="text-[10px] h-6 font-tajawal">
                  <Lightbulb className="w-3 h-3 ml-1" />
                  عرض العلاج
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-6 font-tajawal">
                  <Users className="w-3 h-3 ml-1" />
                  الطلاب المتأثرين
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function GraphTab() {
  const graphStats = {
    totalNodes: Object.keys(skillPrerequisites).length,
    totalEdges: Object.values(skillPrerequisites).reduce((s, v) => s + v.length, 0),
    maxDepth: 5,
    domains: [
      { name: 'الأعداد', count: 25, color: 'bg-blue-500' },
      { name: 'العمليات', count: 12, color: 'bg-green-500' },
      { name: 'الهندسة', count: 8, color: 'bg-purple-500' },
      { name: 'القياس', count: 6, color: 'bg-amber-500' },
      { name: 'الأنماط', count: 4, color: 'bg-pink-500' },
      { name: 'البيانات', count: 3, color: 'bg-cyan-500' },
    ],
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-600" />
            رسم المعرفة المنهجي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-700">{graphStats.totalNodes}</p>
              <p className="text-[10px] text-gray-500 font-tajawal">عقدة (مهارة)</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-indigo-700">{graphStats.totalEdges}</p>
              <p className="text-[10px] text-gray-500 font-tajawal">حافة (علاقة)</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-700">{graphStats.maxDepth}</p>
              <p className="text-[10px] text-gray-500 font-tajawal">أقصى عمق</p>
            </div>
          </div>

          <h4 className="text-sm font-bold text-gray-700 font-tajawal mb-3">المجالات المعرفية</h4>
          <div className="space-y-2">
            {graphStats.domains.map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${d.color}`} />
                <span className="text-sm text-gray-700 font-tajawal flex-1">{d.name}</span>
                <span className="text-xs font-bold text-gray-600">{d.count} مهارة</span>
              </div>
            ))}
          </div>

          {/* Visual graph representation */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-bold text-gray-700 font-tajawal mb-3">سلسلة المتطلبات (مثال)</h4>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {['العد 1-5', 'العد 1-10', 'تكوين 10', 'الجمع ≤10', 'الطرح ≤10'].map((skill, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="px-2 py-1 bg-white border rounded text-[10px] font-tajawal shadow-sm">
                    {skill}
                  </div>
                  {i < 4 && <span className="text-gray-400 text-xs">←</span>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-tajawal text-base">أنواع العلاقات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { type: 'prerequisite', label: 'متطلب سابق', desc: 'يجب إتقانها قبل الانتقال', color: 'bg-red-100 text-red-700' },
            { type: 'reinforces', label: 'تعزيز', desc: 'تقوي فهم مهارة أخرى', color: 'bg-blue-100 text-blue-700' },
            { type: 'extends', label: 'امتداد', desc: 'توسع مفهوم لمستوى أعلى', color: 'bg-green-100 text-green-700' },
            { type: 'parallel', label: 'متوازي', desc: 'يمكن تعلمها بالتزامن', color: 'bg-purple-100 text-purple-700' },
          ].map(r => (
            <div key={r.type} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <Badge className={`text-[10px] ${r.color}`}>{r.label}</Badge>
              <span className="text-xs text-gray-600 font-tajawal">{r.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}