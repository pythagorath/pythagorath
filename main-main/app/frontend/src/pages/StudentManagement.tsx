// Student Management System - Internal operational module
import { useState } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Search, ArrowRight, AlertTriangle, TrendingUp,
  Clock, CheckCircle, XCircle, Activity
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  grade: number;
  class: string;
  lastActive: string;
  engagement: 'high' | 'medium' | 'low' | 'inactive';
  mastery: number;
  retention: 'stable' | 'declining' | 'at_risk';
  sessionsThisWeek: number;
  totalPoints: number;
  alerts: string[];
}

const STUDENTS: Student[] = [
  { id: 'student1', name: 'أحمد', grade: 1, class: '1-أ', lastActive: 'اليوم', engagement: 'high', mastery: 78, retention: 'stable', sessionsThisWeek: 5, totalPoints: 340, alerts: [] },
  { id: 'student2', name: 'سارة', grade: 1, class: '1-أ', lastActive: 'اليوم', engagement: 'high', mastery: 85, retention: 'stable', sessionsThisWeek: 6, totalPoints: 420, alerts: [] },
  { id: 'student3', name: 'محمد', grade: 2, class: '2-أ', lastActive: 'أمس', engagement: 'medium', mastery: 62, retention: 'declining', sessionsThisWeek: 3, totalPoints: 210, alerts: ['تراجع في الإتقان'] },
  { id: 'student4', name: 'فاطمة', grade: 2, class: '2-أ', lastActive: 'أمس', engagement: 'medium', mastery: 70, retention: 'stable', sessionsThisWeek: 4, totalPoints: 280, alerts: [] },
  { id: 'student5', name: 'عمر', grade: 1, class: '1-ب', lastActive: 'منذ 3 أيام', engagement: 'low', mastery: 45, retention: 'at_risk', sessionsThisWeek: 1, totalPoints: 90, alerts: ['خطر انقطاع', 'إتقان منخفض'] },
  { id: 'student6', name: 'نور', grade: 1, class: '1-ب', lastActive: 'اليوم', engagement: 'high', mastery: 80, retention: 'stable', sessionsThisWeek: 5, totalPoints: 360, alerts: [] },
  { id: 'student7', name: 'يوسف', grade: 2, class: '2-ب', lastActive: 'منذ 5 أيام', engagement: 'inactive', mastery: 35, retention: 'at_risk', sessionsThisWeek: 0, totalPoints: 50, alerts: ['غير نشط', 'خطر انقطاع'] },
  { id: 'student8', name: 'مريم', grade: 2, class: '2-ب', lastActive: 'أمس', engagement: 'medium', mastery: 68, retention: 'stable', sessionsThisWeek: 3, totalPoints: 250, alerts: [] },
  { id: 'student9', name: 'خالد', grade: 1, class: '1-أ', lastActive: 'اليوم', engagement: 'high', mastery: 75, retention: 'stable', sessionsThisWeek: 4, totalPoints: 310, alerts: [] },
  { id: 'student10', name: 'ليلى', grade: 2, class: '2-أ', lastActive: 'منذ يومين', engagement: 'low', mastery: 50, retention: 'declining', sessionsThisWeek: 2, totalPoints: 140, alerts: ['تراجع في الاحتفاظ'] },
];

const CLASSES = [
  { name: '1-أ', grade: 1, students: 3, avgMastery: 79, avgEngagement: 'high' },
  { name: '1-ب', grade: 1, students: 2, avgMastery: 63, avgEngagement: 'medium' },
  { name: '2-أ', grade: 2, students: 3, avgMastery: 61, avgEngagement: 'medium' },
  { name: '2-ب', grade: 2, students: 2, avgMastery: 52, avgEngagement: 'low' },
];

function getEngagementBadge(engagement: string) {
  const styles: Record<string, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-orange-100 text-orange-700',
    inactive: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = { high: 'عالي', medium: 'متوسط', low: 'منخفض', inactive: 'غير نشط' };
  return <Badge className={`${styles[engagement]} font-tajawal text-xs`}>{labels[engagement]}</Badge>;
}

function getRetentionBadge(retention: string) {
  const styles: Record<string, string> = {
    stable: 'bg-green-100 text-green-700',
    declining: 'bg-yellow-100 text-yellow-700',
    at_risk: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = { stable: 'مستقر', declining: 'متراجع', at_risk: 'معرض للخطر' };
  return <Badge className={`${styles[retention]} font-tajawal text-xs`}>{labels[retention]}</Badge>;
}

export default function StudentManagement() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | null>(null);

  if (!user || (user.role !== 'admin' && user.role !== 'content_manager')) {
    navigate('/login');
    return null;
  }

  const filteredStudents = STUDENTS.filter(s => {
    const matchesSearch = s.name.includes(searchQuery) || s.class.includes(searchQuery);
    const matchesGrade = filterGrade === null || s.grade === filterGrade;
    return matchesSearch && matchesGrade;
  });

  const alertStudents = STUDENTS.filter(s => s.alerts.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ops')} className="text-gray-500">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">إدارة الطلاب</h1>
          <p className="text-sm text-gray-500 font-tajawal">إدارة الطلاب والصفوف والنشاط والتنبيهات</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1"><Users className="w-4 h-4" /><span className="text-xs font-tajawal">إجمالي الطلاب</span></div>
          <p className="text-2xl font-bold">{STUDENTS.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-green-600 mb-1"><CheckCircle className="w-4 h-4" /><span className="text-xs font-tajawal">نشطون اليوم</span></div>
          <p className="text-2xl font-bold">{STUDENTS.filter(s => s.lastActive === 'اليوم').length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-orange-600 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-xs font-tajawal">تنبيهات</span></div>
          <p className="text-2xl font-bold">{alertStudents.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-purple-600 mb-1"><TrendingUp className="w-4 h-4" /><span className="text-xs font-tajawal">متوسط الإتقان</span></div>
          <p className="text-2xl font-bold">{Math.round(STUDENTS.reduce((a, s) => a + s.mastery, 0) / STUDENTS.length)}%</p>
        </Card>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="font-tajawal">
          <TabsTrigger value="students">الطلاب</TabsTrigger>
          <TabsTrigger value="classes">الصفوف</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
          <TabsTrigger value="activity">النشاط</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {/* Search & Filter */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input placeholder="بحث بالاسم أو الصف..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9 font-tajawal" />
            </div>
            <Button variant={filterGrade === null ? 'default' : 'outline'} size="sm" onClick={() => setFilterGrade(null)} className="font-tajawal">الكل</Button>
            <Button variant={filterGrade === 1 ? 'default' : 'outline'} size="sm" onClick={() => setFilterGrade(1)} className="font-tajawal">صف 1</Button>
            <Button variant={filterGrade === 2 ? 'default' : 'outline'} size="sm" onClick={() => setFilterGrade(2)} className="font-tajawal">صف 2</Button>
          </div>

          {/* Student Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">الطالب</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">الصف</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">آخر نشاط</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">التفاعل</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">الإتقان</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">الاحتفاظ</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">جلسات/أسبوع</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-tajawal font-medium">{student.name}</td>
                      <td className="p-3 font-tajawal">{student.class}</td>
                      <td className="p-3 font-tajawal text-gray-500">{student.lastActive}</td>
                      <td className="p-3">{getEngagementBadge(student.engagement)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${student.mastery >= 70 ? 'bg-green-500' : student.mastery >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${student.mastery}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{student.mastery}%</span>
                        </div>
                      </td>
                      <td className="p-3">{getRetentionBadge(student.retention)}</td>
                      <td className="p-3 font-tajawal text-center">{student.sessionsThisWeek}</td>
                      <td className="p-3 font-tajawal">{student.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="classes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLASSES.map((cls) => (
              <Card key={cls.name} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg font-tajawal">الصف {cls.name}</h3>
                  <Badge className="bg-indigo-100 text-indigo-700 font-tajawal">الصف {cls.grade}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{cls.students}</p>
                    <p className="text-xs text-gray-500 font-tajawal">طلاب</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{cls.avgMastery}%</p>
                    <p className="text-xs text-gray-500 font-tajawal">متوسط الإتقان</p>
                  </div>
                  <div>
                    {getEngagementBadge(cls.avgEngagement)}
                    <p className="text-xs text-gray-500 font-tajawal mt-1">التفاعل</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-3">
            {alertStudents.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-500 font-tajawal">لا توجد تنبيهات حالياً</p>
              </Card>
            ) : (
              alertStudents.map((student) => (
                <Card key={student.id} className="p-4 border-r-4 border-r-orange-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold font-tajawal">{student.name} - الصف {student.class}</p>
                      <div className="flex gap-2 mt-1">
                        {student.alerts.map((alert, i) => (
                          <Badge key={i} className="bg-orange-100 text-orange-700 font-tajawal text-xs">{alert}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="font-tajawal">تدخل</Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              سجل النشاط الأخير
            </h3>
            <div className="space-y-3">
              {[
                { time: 'منذ 5 دقائق', action: 'أحمد أكمل مهمة "الجمع حتى 20"', type: 'success' },
                { time: 'منذ 12 دقيقة', action: 'سارة حصلت على 15 نقطة في اختبار الأنماط', type: 'success' },
                { time: 'منذ 30 دقيقة', action: 'نور بدأت جلسة جديدة', type: 'info' },
                { time: 'منذ ساعة', action: 'خالد أكمل 3 مهام متتالية', type: 'success' },
                { time: 'منذ ساعتين', action: 'تنبيه: يوسف لم يسجل دخول منذ 5 أيام', type: 'warning' },
                { time: 'منذ 3 ساعات', action: 'مريم أتقنت مهارة "الطرح بالاستلاف"', type: 'success' },
              ].map((log, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-green-400' : log.type === 'warning' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400 font-tajawal w-24">{log.time}</span>
                  <span className="text-sm text-gray-700 font-tajawal">{log.action}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}