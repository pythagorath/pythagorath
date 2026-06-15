// Pilot Operations Center - active/inactive students, usage, retention, dropout, interventions
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Activity, Users, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';

const ACTIVE_STUDENTS = [
  { name: 'أحمد', grade: 1, lastSession: 'اليوم 10:30', duration: '18 دقيقة', missions: 3, status: 'active' },
  { name: 'سارة', grade: 1, lastSession: 'اليوم 9:15', duration: '22 دقيقة', missions: 4, status: 'active' },
  { name: 'نور', grade: 1, lastSession: 'اليوم 11:00', duration: '15 دقيقة', missions: 2, status: 'active' },
  { name: 'خالد', grade: 1, lastSession: 'اليوم 8:45', duration: '20 دقيقة', missions: 3, status: 'active' },
];

const INACTIVE_STUDENTS = [
  { name: 'يوسف', grade: 2, lastSession: 'منذ 5 أيام', daysSince: 5, reason: 'لم يعد بعد عطلة', risk: 'high' },
  { name: 'عمر', grade: 1, lastSession: 'منذ 3 أيام', daysSince: 3, reason: 'توقف بعد صعوبة', risk: 'medium' },
  { name: 'ليلى', grade: 2, lastSession: 'منذ يومين', daysSince: 2, reason: 'جلسات قصيرة جداً', risk: 'low' },
];

const DAILY_METRICS = [
  { day: 'السبت', sessions: 8, avgDuration: 18, completionRate: 75 },
  { day: 'الأحد', sessions: 7, avgDuration: 20, completionRate: 80 },
  { day: 'الاثنين', sessions: 6, avgDuration: 16, completionRate: 70 },
  { day: 'الثلاثاء', sessions: 9, avgDuration: 22, completionRate: 85 },
  { day: 'الأربعاء', sessions: 5, avgDuration: 15, completionRate: 65 },
  { day: 'الخميس', sessions: 4, avgDuration: 12, completionRate: 60 },
  { day: 'الجمعة', sessions: 2, avgDuration: 10, completionRate: 50 },
];

const INTERVENTION_ALERTS = [
  { student: 'يوسف', type: 'dropout_risk', message: 'لم يسجل دخول منذ 5 أيام', priority: 'high', action: 'تواصل مع ولي الأمر' },
  { student: 'عمر', type: 'struggle', message: 'فشل في 4 مهام متتالية قبل التوقف', priority: 'medium', action: 'تخفيف الصعوبة' },
  { student: 'محمد', type: 'declining', message: 'تراجع الإتقان من 72% إلى 62%', priority: 'medium', action: 'مراجعة المهارات الأساسية' },
  { student: 'ليلى', type: 'short_sessions', message: 'متوسط الجلسة 5 دقائق فقط', priority: 'low', action: 'تحسين التحفيز' },
];

const RETENTION_DATA = {
  day1: 100, day3: 90, day7: 85, day14: 78, day30: 70,
};

export default function PilotOperationsCenter() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();

  if (!user || (user.role !== 'admin')) {
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
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">مركز عمليات الطيار</h1>
          <p className="text-sm text-gray-500 font-tajawal">الاستخدام اليومي، الاحتفاظ، المخاطر، التدخلات</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-green-600 mb-1"><CheckCircle className="w-4 h-4" /><span className="text-xs font-tajawal">نشطون اليوم</span></div>
          <p className="text-2xl font-bold">{ACTIVE_STUDENTS.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-red-600 mb-1"><XCircle className="w-4 h-4" /><span className="text-xs font-tajawal">غير نشطين</span></div>
          <p className="text-2xl font-bold">{INACTIVE_STUDENTS.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1"><Clock className="w-4 h-4" /><span className="text-xs font-tajawal">متوسط الجلسة</span></div>
          <p className="text-2xl font-bold">18 د</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-purple-600 mb-1"><TrendingUp className="w-4 h-4" /><span className="text-xs font-tajawal">الاحتفاظ 7 أيام</span></div>
          <p className="text-2xl font-bold">{RETENTION_DATA.day7}%</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-orange-600 mb-1"><Bell className="w-4 h-4" /><span className="text-xs font-tajawal">تنبيهات</span></div>
          <p className="text-2xl font-bold">{INTERVENTION_ALERTS.length}</p>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="font-tajawal">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="active">النشطون</TabsTrigger>
          <TabsTrigger value="inactive">غير النشطين</TabsTrigger>
          <TabsTrigger value="retention">الاحتفاظ</TabsTrigger>
          <TabsTrigger value="interventions">التدخلات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-bold font-tajawal mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                الاستخدام اليومي (هذا الأسبوع)
              </h3>
              <div className="space-y-2">
                {DAILY_METRICS.map((day) => (
                  <div key={day.day} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <span className="font-tajawal text-sm w-16">{day.day}</span>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>{day.sessions} جلسات</span>
                      <span>{day.avgDuration} د</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${day.completionRate}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-bold font-tajawal mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                تنبيهات عاجلة
              </h3>
              <div className="space-y-2">
                {INTERVENTION_ALERTS.filter(a => a.priority === 'high' || a.priority === 'medium').map((alert, i) => (
                  <div key={i} className={`p-3 rounded-lg border-r-4 ${alert.priority === 'high' ? 'border-r-red-400 bg-red-50' : 'border-r-yellow-400 bg-yellow-50'}`}>
                    <p className="font-medium font-tajawal text-sm">{alert.student}</p>
                    <p className="text-xs text-gray-600 font-tajawal">{alert.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              الطلاب النشطون اليوم
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">الطالب</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">الصف</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">آخر جلسة</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">المدة</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">المهام</th>
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_STUDENTS.map((student, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-tajawal font-medium">{student.name}</td>
                      <td className="p-3 font-tajawal">صف {student.grade}</td>
                      <td className="p-3 font-tajawal text-gray-500">{student.lastSession}</td>
                      <td className="p-3 font-tajawal">{student.duration}</td>
                      <td className="p-3 font-tajawal">{student.missions} مهام</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              الطلاب غير النشطين
            </h3>
            <div className="space-y-3">
              {INACTIVE_STUDENTS.map((student, i) => (
                <div key={i} className={`p-4 rounded-lg border-r-4 ${student.risk === 'high' ? 'border-r-red-400' : student.risk === 'medium' ? 'border-r-yellow-400' : 'border-r-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold font-tajawal">{student.name} - صف {student.grade}</p>
                      <p className="text-sm text-gray-500 font-tajawal">آخر نشاط: {student.lastSession}</p>
                      <p className="text-xs text-gray-400 font-tajawal mt-1">السبب المحتمل: {student.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`font-tajawal text-xs ${student.risk === 'high' ? 'bg-red-100 text-red-700' : student.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                        خطر {student.risk === 'high' ? 'عالي' : student.risk === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                      <Button variant="outline" size="sm" className="font-tajawal text-xs">تدخل</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              منحنى الاحتفاظ
            </h3>
            <div className="flex items-end gap-4 h-48 mb-4">
              {Object.entries(RETENTION_DATA).map(([key, value]) => {
                const label = key.replace('day', 'يوم ');
                return (
                  <div key={key} className="flex flex-col items-center flex-1">
                    <span className="text-sm font-bold text-gray-700 mb-1">{value}%</span>
                    <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '160px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all"
                        style={{ height: `${value * 1.6}px` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-tajawal mt-2">{label}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-gray-500 font-tajawal text-center">
              الاحتفاظ بعد 30 يوم: {RETENTION_DATA.day30}% - هدف: 80%
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              تنبيهات التدخل
            </h3>
            <div className="space-y-3">
              {INTERVENTION_ALERTS.map((alert, i) => (
                <div key={i} className={`p-4 rounded-lg border ${alert.priority === 'high' ? 'border-red-200 bg-red-50' : alert.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-tajawal">{alert.student}</span>
                      <Badge className={`text-xs font-tajawal ${alert.priority === 'high' ? 'bg-red-200 text-red-800' : alert.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>
                        {alert.priority === 'high' ? 'عاجل' : alert.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="font-tajawal text-xs">{alert.action}</Button>
                  </div>
                  <p className="text-sm text-gray-600 font-tajawal">{alert.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}