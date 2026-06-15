// Admin Dashboard - Complete operational dashboard
// Shows: active students, engagement, mastery trends, alerts, pilot analytics
import { useState, useEffect } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Users, TrendingUp, Brain, AlertTriangle, CheckCircle,
  BarChart3, Activity, BookOpen, Flame, Calendar,
  Dices, Calculator, Sparkles, ArrowLeft, GraduationCap,
  Layers, FileText, HelpCircle, Eye, UserCheck, Database, Shield
} from 'lucide-react';

interface AdminDashboardProps {
  tab?: string;
}

// Mock analytics data
const ANALYTICS = {
  activeStudents: 8,
  totalStudents: 10,
  avgMastery: 58,
  avgStreak: 4.2,
  todayActive: 6,
  weeklyRetention: 82,
  totalQuestions: 502,
  totalSkills: 79,
};

const STUDENT_LIST = [
  { name: 'أحمد', grade: 1, mastery: 62, streak: 5, lastActive: 'اليوم', status: 'active' },
  { name: 'سارة', grade: 1, mastery: 48, streak: 3, lastActive: 'أمس', status: 'active' },
  { name: 'محمد', grade: 2, mastery: 71, streak: 7, lastActive: 'اليوم', status: 'active' },
  { name: 'فاطمة', grade: 2, mastery: 55, streak: 2, lastActive: 'اليوم', status: 'active' },
  { name: 'عمر', grade: 1, mastery: 44, streak: 1, lastActive: 'منذ 3 أيام', status: 'at_risk' },
  { name: 'نور', grade: 1, mastery: 39, streak: 0, lastActive: 'منذ 5 أيام', status: 'inactive' },
  { name: 'يوسف', grade: 2, mastery: 67, streak: 6, lastActive: 'اليوم', status: 'active' },
  { name: 'مريم', grade: 2, mastery: 52, streak: 4, lastActive: 'أمس', status: 'active' },
  { name: 'خالد', grade: 1, mastery: 58, streak: 3, lastActive: 'اليوم', status: 'active' },
  { name: 'ليلى', grade: 2, mastery: 61, streak: 5, lastActive: 'اليوم', status: 'active' },
];

const ALERTS = [
  { type: 'warning', message: 'نور لم تسجل دخول منذ 5 أيام', student: 'نور' },
  { type: 'warning', message: 'عمر معدل إتقانه أقل من 50%', student: 'عمر' },
  { type: 'info', message: 'محمد حقق أعلى سلسلة (7 أيام)', student: 'محمد' },
  { type: 'success', message: '6 طلاب أكملوا مهمة اليوم', student: '' },
];

export default function AdminDashboard({ tab }: AdminDashboardProps) {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab || 'overview');

  // Sync tab prop with state when navigating via sidebar
  useEffect(() => {
    setActiveTab(tab || 'overview');
  }, [tab]);

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 font-tajawal">لوحة تحكم المدير</h1>
        <p className="text-gray-500 text-sm font-tajawal">نظرة شاملة على أداء المنصة</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="overview" className="font-tajawal">نظرة عامة</TabsTrigger>
          <TabsTrigger value="students" className="font-tajawal">الطلاب</TabsTrigger>
          <TabsTrigger value="content" className="font-tajawal">المحتوى</TabsTrigger>
          <TabsTrigger value="analytics" className="font-tajawal">التحليلات</TabsTrigger>
          <TabsTrigger value="pilot" className="font-tajawal">الطيار</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ANALYTICS.activeStudents}/{ANALYTICS.totalStudents}</p>
                    <p className="text-xs text-gray-400 font-tajawal">طلاب نشطين</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ANALYTICS.avgMastery}%</p>
                    <p className="text-xs text-gray-400 font-tajawal">متوسط الإتقان</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Flame className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ANALYTICS.avgStreak}</p>
                    <p className="text-xs text-gray-400 font-tajawal">متوسط السلسلة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ANALYTICS.weeklyRetention}%</p>
                    <p className="text-xs text-gray-400 font-tajawal">الاحتفاظ الأسبوعي</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-tajawal flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                التنبيهات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ALERTS.map((alert, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                  alert.type === 'warning' ? 'bg-amber-50' : alert.type === 'success' ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                  {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                  {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                  {alert.type === 'info' && <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  <span className="text-sm font-tajawal text-gray-700">{alert.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mastery Distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-tajawal flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                توزيع الإتقان
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { range: '80-100%', count: 1, color: 'bg-green-500' },
                  { range: '60-79%', count: 4, color: 'bg-blue-500' },
                  { range: '40-59%', count: 4, color: 'bg-amber-500' },
                  { range: '0-39%', count: 1, color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.range} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 font-tajawal">{item.range}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.count * 10}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-600 w-8">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-right p-3 text-xs font-medium text-gray-500 font-tajawal">الطالب</th>
                      <th className="text-right p-3 text-xs font-medium text-gray-500 font-tajawal">الصف</th>
                      <th className="text-right p-3 text-xs font-medium text-gray-500 font-tajawal">الإتقان</th>
                      <th className="text-right p-3 text-xs font-medium text-gray-500 font-tajawal">السلسلة</th>
                      <th className="text-right p-3 text-xs font-medium text-gray-500 font-tajawal">آخر نشاط</th>
                      <th className="text-right p-3 text-xs font-medium text-gray-500 font-tajawal">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STUDENT_LIST.map((s, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-800 font-tajawal">{s.name}</td>
                        <td className="p-3 text-gray-600">{s.grade}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress value={s.mastery} className="h-2 w-16" />
                            <span className="text-xs text-gray-500">{s.mastery}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1 text-sm">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            {s.streak}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-500 font-tajawal">{s.lastActive}</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${
                            s.status === 'active' ? 'bg-green-100 text-green-700' :
                            s.status === 'at_risk' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.status === 'active' ? 'نشط' : s.status === 'at_risk' ? 'معرض' : 'غير نشط'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {/* Quick Navigation - Curriculum Management */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-tajawal text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                إدارة المنهج والمحتوى
              </CardTitle>
              <p className="text-xs text-gray-500 font-tajawal">إدارة الصفوف والفصول والمواد والوحدات والدروس</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                <Card className="border border-blue-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all group" onClick={() => navigate('/admin/crud/grades')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200"><GraduationCap className="w-5 h-5 text-blue-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">الصفوف والفصول</p><p className="text-xs text-gray-400 font-tajawal">إدارة الصفوف والفصول الدراسية</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                  </CardContent>
                </Card>
                <Card className="border border-teal-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-teal-400 transition-all group" onClick={() => navigate('/admin/crud/subjects')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center group-hover:bg-teal-200"><Layers className="w-5 h-5 text-teal-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">المواد والوحدات</p><p className="text-xs text-gray-400 font-tajawal">إدارة المواد الدراسية والوحدات</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-teal-500" />
                  </CardContent>
                </Card>
                <Card className="border border-emerald-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all group" onClick={() => navigate('/admin/crud/lessons')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200"><FileText className="w-5 h-5 text-emerald-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">الدروس</p><p className="text-xs text-gray-400 font-tajawal">إدارة الدروس ومحتوى الفيديو</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
                  </CardContent>
                </Card>
                <Card className="border border-orange-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-orange-400 transition-all group" onClick={() => navigate('/admin/curriculum-seed')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200"><Database className="w-5 h-5 text-orange-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">تحميل المنهج</p><p className="text-xs text-gray-400 font-tajawal">تحميل بيانات المنهج العماني الكاملة</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-orange-500" />
                  </CardContent>
                </Card>
                <Card className="border border-cyan-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-cyan-400 transition-all group" onClick={() => navigate('/admin/learning-paths')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center group-hover:bg-cyan-200"><Layers className="w-5 h-5 text-cyan-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">مسارات التعلم</p><p className="text-xs text-gray-400 font-tajawal">إنشاء وإدارة ونشر مسارات التعلم المنهجية</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-cyan-500" />
                  </CardContent>
                </Card>
                <Card className="border border-emerald-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all group" onClick={() => navigate('/admin/publish-workflow')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200"><Shield className="w-5 h-5 text-emerald-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">سير عمل النشر</p><p className="text-xs text-gray-400 font-tajawal">مسودة ← معاينة ← نشر مع التحقق التلقائي</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
                  </CardContent>
                </Card>
                <Card className="border border-rose-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-rose-400 transition-all group" onClick={() => navigate('/ops/curriculum?tab=files')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center group-hover:bg-rose-200"><FileText className="w-5 h-5 text-rose-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">ملفات المنهج</p><p className="text-xs text-gray-400 font-tajawal">رفع وإدارة ملفات المنهج حسب المادة والصف</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-rose-500" />
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Questions & Interactions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-tajawal text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                الأسئلة والتفاعلات
              </CardTitle>
              <p className="text-xs text-gray-500 font-tajawal">إدارة الأسئلة التفاعلية والمهارات مع إمكانية المعاينة والنشر</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                <Card className="border border-indigo-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all group" onClick={() => navigate('/admin/crud/questions')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200"><HelpCircle className="w-5 h-5 text-indigo-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">إدارة الأسئلة</p><p className="text-xs text-gray-400 font-tajawal">CRUD كامل لجميع أنواع الأسئلة</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                  </CardContent>
                </Card>
                <Card className="border border-violet-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-violet-400 transition-all group" onClick={() => navigate('/admin/interactions')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center group-hover:bg-violet-200"><Eye className="w-5 h-5 text-violet-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">معاينة التفاعلات</p><p className="text-xs text-gray-400 font-tajawal">عرض ومعاينة ونشر/إلغاء نشر جماعي</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-violet-500" />
                  </CardContent>
                </Card>
                <Card className="border border-pink-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-pink-400 transition-all group" onClick={() => navigate('/admin/crud/skills')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center group-hover:bg-pink-200"><Brain className="w-5 h-5 text-pink-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">المهارات</p><p className="text-xs text-gray-400 font-tajawal">إدارة المهارات وعتبات الإتقان</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-pink-500" />
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Educational Intelligence Management Section */}
          <Card className="border-0 shadow-md bg-gradient-to-l from-indigo-50 via-purple-50 to-pink-50">
            <CardHeader className="pb-2">
              <CardTitle className="font-tajawal text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                إدارة الذكاء التعليمي
              </CardTitle>
              <p className="text-xs text-gray-500 font-tajawal">إدارة الأسئلة التوسعية والمعداد الذكي ولوحة الذكاء التعليمي</p>
            </CardHeader>
            <CardContent>
              <Card className="border border-purple-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-purple-400 transition-all duration-200 group mb-4" onClick={() => navigate('/admin/intelligence')}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-200"><Brain className="w-6 h-6 text-purple-600" /></div>
                  <div className="flex-1"><p className="font-bold text-gray-800 font-tajawal">لوحة الذكاء التعليمي</p><p className="text-xs text-gray-500 font-tajawal mt-0.5">رسم المعرفة، محرك القرارات التكيفية، تحليل المفاهيم الخاطئة</p></div>
                  <ArrowLeft className="w-5 h-5 text-gray-300 group-hover:text-purple-500" />
                </CardContent>
              </Card>
              <div className="grid md:grid-cols-3 gap-3">
                <Card className="border border-indigo-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all group" onClick={() => navigate('/ops/questions')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200"><Dices className="w-5 h-5 text-indigo-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">الأسئلة التوسعية</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                  </CardContent>
                </Card>
                <Card className="border border-amber-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-amber-400 transition-all group" onClick={() => navigate('/admin/abacus')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200"><Calculator className="w-5 h-5 text-amber-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">المعداد الذكي</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-amber-500" />
                  </CardContent>
                </Card>
                <Card className="border border-green-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-green-400 transition-all group" onClick={() => navigate('/admin/student-progress')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200"><UserCheck className="w-5 h-5 text-green-600" /></div>
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800 font-tajawal">تقدم الطلاب</p></div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-green-500" />
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 text-center">
                <BookOpen className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-800">{ANALYTICS.totalSkills}</p>
                <p className="text-sm text-gray-400 font-tajawal">مهارة</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 text-center">
                <Brain className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-800">{ANALYTICS.totalQuestions}</p>
                <p className="text-sm text-gray-400 font-tajawal">سؤال</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-800">89</p>
                <p className="text-sm text-gray-400 font-tajawal">درس في المنهج</p>
              </CardContent>
            </Card>
          </div>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-tajawal">تغطية المنهج حسب المجال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { domain: 'الأعداد والعمليات', coverage: 85 },
                { domain: 'الهندسة والقياس', coverage: 72 },
                { domain: 'الجبر والأنماط', coverage: 65 },
                { domain: 'البيانات والإحصاء', coverage: 58 },
              ].map((d) => (
                <div key={d.domain}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 font-tajawal">{d.domain}</span>
                    <span className="text-sm font-bold text-gray-700">{d.coverage}%</span>
                  </div>
                  <Progress value={d.coverage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {/* Quick link to Assessment Intelligence */}
          <Card className="border-0 shadow-sm bg-gradient-to-l from-rose-50 to-pink-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/student/assessment')}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 font-tajawal">ذكاء التقييم التكيفي</p>
                  <p className="text-xs text-gray-500 font-tajawal">تحليلات CAT المتقدمة وأداء الأسئلة</p>
                </div>
              </div>
              <Badge className="bg-rose-100 text-rose-700 font-tajawal">عرض التفاصيل ←</Badge>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-l from-violet-50 to-purple-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/assessment-intelligence')}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 font-tajawal">ذكاء التقييم والمفاهيم الخاطئة</p>
                  <p className="text-xs text-gray-500 font-tajawal">تشخيص المهارات، كشف المفاهيم الخاطئة، مراقبة العلاج</p>
                </div>
              </div>
              <Badge className="bg-violet-100 text-violet-700 font-tajawal">لوحة التحكم ←</Badge>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-l from-amber-50 to-orange-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/template-inspector')}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-lg">
                  🔍
                </div>
                <div>
                  <p className="font-bold text-gray-800 font-tajawal">مفتش القوالب المعرفية</p>
                  <p className="text-xs text-gray-500 font-tajawal">تحقق من صحة القوالب المعرفية لكل مادة وصف</p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700 font-tajawal">فحص ←</Badge>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-tajawal">اتجاهات الإتقان (آخر 7 أيام)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-32">
                {[52, 54, 55, 56, 57, 57, 58].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400">{val}%</span>
                    <div className="w-full bg-indigo-400 rounded-t-md" style={{ height: `${val}%` }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-tajawal text-base">أكثر المهارات صعوبة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['الطرح حتى 20', 'المقارنة بين الأعداد', 'العد التنازلي', 'حل المسائل الكلامية'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                    <span className="text-xs font-bold text-red-600 w-5">{i + 1}</span>
                    <span className="text-sm text-gray-700 font-tajawal">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-tajawal text-base">أكثر المهارات إتقاناً</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['العد التصاعدي', 'التعرف على الأرقام', 'الجمع حتى 10', 'الأشكال الهندسية'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <span className="text-xs font-bold text-green-600 w-5">{i + 1}</span>
                    <span className="text-sm text-gray-700 font-tajawal">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pilot Tab */}
        <TabsContent value="pilot" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-tajawal text-base">صحة الطيار</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'معدل العودة اليومية', value: 75, color: 'text-green-600' },
                  { label: 'معدل إكمال المهام', value: 68, color: 'text-blue-600' },
                  { label: 'رضا أولياء الأمور', value: 82, color: 'text-indigo-600' },
                  { label: 'معدل الاحتفاظ (7 أيام)', value: 80, color: 'text-purple-600' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-tajawal">{item.label}</span>
                    <span className={`font-bold ${item.color}`}>{item.value}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-tajawal text-base">إحصائيات المجموعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-tajawal">إجمالي الطلاب</span>
                  <span className="font-bold">10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-tajawal">أولياء الأمور</span>
                  <span className="font-bold">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-tajawal">نشطين اليوم</span>
                  <span className="font-bold text-green-600">6</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-tajawal">معرضين للانقطاع</span>
                  <span className="font-bold text-amber-600">2</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}