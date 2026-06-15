// Academic QA Dashboard - weak questions, low success, confusion hotspots, gaps, prerequisites
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Shield, AlertTriangle, TrendingDown, HelpCircle, Link2, BookOpen } from 'lucide-react';

const WEAK_QUESTIONS = [
  { id: 'wq1', text: 'الساعة تشير إلى 3:00، كم دقيقة مرت من 2:30؟', skill: 'قراءة الساعة', successRate: 35, attempts: 30, issue: 'صعوبة عالية جداً' },
  { id: 'wq2', text: 'ما ناتج 3 × 4؟', skill: 'الضرب الأساسي', successRate: 45, attempts: 40, issue: 'خلط مع الجمع' },
  { id: 'wq3', text: 'رتب الأعداد من الأصغر: 15, 8, 22, 3', skill: 'مقارنة الأعداد', successRate: 55, attempts: 90, issue: 'ترتيب عكسي شائع' },
];

const CONFUSION_HOTSPOTS = [
  { skill: 'الطرح بالاستلاف', confusionRate: 42, commonError: 'طرح الأصغر من الأكبر دائماً', affectedStudents: 6 },
  { skill: 'مقارنة الأعداد', confusionRate: 35, commonError: 'تجاهل خانة العشرات', affectedStudents: 4 },
  { skill: 'قراءة الساعة', confusionRate: 55, commonError: 'خلط عقرب الساعات والدقائق', affectedStudents: 5 },
  { skill: 'الضرب', confusionRate: 48, commonError: 'استخدام الجمع بدل الضرب', affectedStudents: 3 },
];

const CURRICULUM_GAPS = [
  { domain: 'الكسور', grade: 2, coverage: 40, missingSkills: ['الكسور المتكافئة', 'مقارنة الكسور', 'جمع الكسور'], priority: 'high' },
  { domain: 'البيانات والرسوم', grade: 2, coverage: 45, missingSkills: ['قراءة الرسوم البيانية', 'تمثيل البيانات'], priority: 'high' },
  { domain: 'القياس والمقارنة', grade: 1, coverage: 55, missingSkills: ['قياس الطول', 'المقارنة بالوحدات'], priority: 'medium' },
  { domain: 'الأنماط', grade: 1, coverage: 60, missingSkills: ['أنماط الأشكال', 'أنماط متقدمة'], priority: 'medium' },
];

const PREREQUISITE_ISSUES = [
  { skill: 'الضرب الأساسي', prerequisite: 'الجمع حتى 20', issue: 'طلاب يبدأون الضرب قبل إتقان الجمع', affected: 3 },
  { skill: 'الكسور البسيطة', prerequisite: 'الضرب الأساسي', issue: 'المتطلب السابق غير مكتمل', affected: 5 },
  { skill: 'الطرح حتى 20', prerequisite: 'الجمع حتى 20', issue: 'ضعف في الجمع يؤثر على الطرح', affected: 2 },
];

const MISSING_REMEDIATION = [
  { skill: 'قراءة الساعة', hasRemediation: false, avgMastery: 60, needsVisual: true },
  { skill: 'الضرب الأساسي', hasRemediation: false, avgMastery: 45, needsVisual: false },
  { skill: 'الكسور البسيطة', hasRemediation: false, avgMastery: 30, needsVisual: true },
];

export default function AcademicQADashboard() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();

  if (!user || (user.role !== 'admin' && user.role !== 'reviewer')) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ops')} className="text-gray-500">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">ضمان الجودة الأكاديمية</h1>
          <p className="text-sm text-gray-500 font-tajawal">مراقبة الجودة، الفجوات، المشاكل</p>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3 border-r-4 border-r-red-400">
          <p className="text-xs text-gray-500 font-tajawal">أسئلة ضعيفة</p>
          <p className="text-2xl font-bold text-red-600">{WEAK_QUESTIONS.length}</p>
        </Card>
        <Card className="p-3 border-r-4 border-r-orange-400">
          <p className="text-xs text-gray-500 font-tajawal">نقاط ارتباك</p>
          <p className="text-2xl font-bold text-orange-600">{CONFUSION_HOTSPOTS.length}</p>
        </Card>
        <Card className="p-3 border-r-4 border-r-yellow-400">
          <p className="text-xs text-gray-500 font-tajawal">فجوات منهج</p>
          <p className="text-2xl font-bold text-yellow-600">{CURRICULUM_GAPS.length}</p>
        </Card>
        <Card className="p-3 border-r-4 border-r-purple-400">
          <p className="text-xs text-gray-500 font-tajawal">مشاكل متطلبات</p>
          <p className="text-2xl font-bold text-purple-600">{PREREQUISITE_ISSUES.length}</p>
        </Card>
      </div>

      <Tabs defaultValue="weak" className="space-y-4">
        <TabsList className="font-tajawal">
          <TabsTrigger value="weak">أسئلة ضعيفة</TabsTrigger>
          <TabsTrigger value="confusion">نقاط الارتباك</TabsTrigger>
          <TabsTrigger value="gaps">فجوات المنهج</TabsTrigger>
          <TabsTrigger value="prerequisites">مشاكل المتطلبات</TabsTrigger>
          <TabsTrigger value="remediation">معالجة مفقودة</TabsTrigger>
        </TabsList>

        <TabsContent value="weak">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              أسئلة بنسبة نجاح منخفضة
            </h3>
            <div className="space-y-3">
              {WEAK_QUESTIONS.map((q) => (
                <div key={q.id} className="p-4 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium font-tajawal text-sm">{q.text}</p>
                    <span className="text-red-600 font-bold">{q.successRate}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-tajawal">
                    <span>المهارة: {q.skill}</span>
                    <span>المحاولات: {q.attempts}</span>
                    <Badge className="bg-red-100 text-red-700 text-xs font-tajawal">{q.issue}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="confusion">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              نقاط الارتباك الشائعة
            </h3>
            <div className="space-y-3">
              {CONFUSION_HOTSPOTS.map((spot, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold font-tajawal text-sm">{spot.skill}</h4>
                    <Badge className="bg-orange-100 text-orange-700 font-tajawal text-xs">
                      ارتباك {spot.confusionRate}%
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 font-tajawal mb-1">الخطأ الشائع: {spot.commonError}</p>
                  <p className="text-xs text-gray-400 font-tajawal">يؤثر على {spot.affectedStudents} طلاب</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              فجوات المنهج
            </h3>
            <div className="space-y-4">
              {CURRICULUM_GAPS.map((gap, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold font-tajawal">{gap.domain} - صف {gap.grade}</h4>
                    <Badge className={`font-tajawal text-xs ${gap.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {gap.priority === 'high' ? 'أولوية عالية' : 'أولوية متوسطة'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${gap.coverage}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{gap.coverage}%</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-tajawal mb-1">مهارات مفقودة:</p>
                    <div className="flex flex-wrap gap-1">
                      {gap.missingSkills.map((skill, j) => (
                        <Badge key={j} className="bg-gray-100 text-gray-600 font-tajawal text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prerequisites">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-500" />
              مشاكل المتطلبات السابقة
            </h3>
            <div className="space-y-3">
              {PREREQUISITE_ISSUES.map((issue, i) => (
                <div key={i} className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-200 text-purple-800 font-tajawal text-xs">{issue.skill}</Badge>
                    <span className="text-xs text-gray-400">←</span>
                    <Badge className="bg-indigo-100 text-indigo-700 font-tajawal text-xs">{issue.prerequisite}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 font-tajawal">{issue.issue}</p>
                  <p className="text-xs text-gray-400 font-tajawal mt-1">يؤثر على {issue.affected} طلاب</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="remediation">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              مهارات بدون معالجة
            </h3>
            <div className="space-y-3">
              {MISSING_REMEDIATION.map((item, i) => (
                <div key={i} className="p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold font-tajawal text-sm">{item.skill}</h4>
                    <div className="flex gap-2">
                      {item.needsVisual && <Badge className="bg-blue-100 text-blue-700 font-tajawal text-xs">يحتاج بصري</Badge>}
                      <Badge className="bg-red-100 text-red-700 font-tajawal text-xs">بدون معالجة</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-tajawal">متوسط الإتقان: {item.avgMastery}%</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}