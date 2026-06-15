// Academic Reviewer Dashboard - Question/skill review, content quality, curriculum coverage
import { useState, useEffect } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle, XCircle, Clock, Brain, BookOpen,
  AlertTriangle, Star, FileText, ClipboardCheck
} from 'lucide-react';

interface ReviewerDashboardProps {
  tab?: string;
}

// Mock review queue
const REVIEW_QUEUE = [
  { id: 1, type: 'question', title: 'ما ناتج 7 + 8؟', skill: 'الجمع حتى 20', status: 'pending', difficulty: 'متوسط', grade: 1 },
  { id: 2, type: 'question', title: 'أكمل النمط: 2، 4، 6، __', skill: 'الأنماط العددية', status: 'pending', difficulty: 'سهل', grade: 2 },
  { id: 3, type: 'question', title: 'كم عدد أضلاع المثلث؟', skill: 'الأشكال الهندسية', status: 'approved', difficulty: 'سهل', grade: 1 },
  { id: 4, type: 'question', title: 'رتّب الأعداد: 15، 8، 23، 11', skill: 'ترتيب الأعداد', status: 'pending', difficulty: 'صعب', grade: 2 },
  { id: 5, type: 'question', title: 'ما ناتج 14 - 6؟', skill: 'الطرح حتى 20', status: 'needs_revision', difficulty: 'متوسط', grade: 1 },
  { id: 6, type: 'skill', title: 'الضرب المبكر', skill: '-', status: 'pending', difficulty: '-', grade: 2 },
];

const SKILL_REVIEW = [
  { name: 'الجمع حتى 10', questions: 12, coverage: 95, quality: 'ممتاز', status: 'approved' },
  { name: 'الطرح حتى 20', questions: 8, coverage: 70, quality: 'جيد', status: 'approved' },
  { name: 'المقارنة بين الأعداد', questions: 6, coverage: 60, quality: 'يحتاج تحسين', status: 'needs_revision' },
  { name: 'الأنماط العددية', questions: 5, coverage: 50, quality: 'جيد', status: 'pending' },
  { name: 'القياس والوزن', questions: 3, coverage: 35, quality: 'ضعيف', status: 'needs_revision' },
];

const COVERAGE_DATA = [
  { domain: 'الأعداد والعمليات', grade1: 88, grade2: 82 },
  { domain: 'الهندسة والقياس', grade1: 72, grade2: 65 },
  { domain: 'الجبر والأنماط', grade1: 60, grade2: 55 },
  { domain: 'البيانات والإحصاء', grade1: 45, grade2: 40 },
];

export default function ReviewerDashboard({ tab }: ReviewerDashboardProps) {
  const { user, logout } = usePilotAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab || 'overview');

  useEffect(() => {
    setActiveTab(tab || 'overview');
  }, [tab]);

  if (!user || user.role !== 'reviewer') {
    navigate('/login');
    return null;
  }

  const pendingCount = REVIEW_QUEUE.filter(r => r.status === 'pending').length;
  const approvedCount = REVIEW_QUEUE.filter(r => r.status === 'approved').length;
  const revisionCount = REVIEW_QUEUE.filter(r => r.status === 'needs_revision').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 font-tajawal">لوحة المراجعة الأكاديمية</h1>
        <p className="text-gray-500 text-sm font-tajawal">مراجعة جودة المحتوى التعليمي</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="overview" className="font-tajawal">نظرة عامة</TabsTrigger>
          <TabsTrigger value="questions" className="font-tajawal">الأسئلة</TabsTrigger>
          <TabsTrigger value="skills" className="font-tajawal">المهارات</TabsTrigger>
          <TabsTrigger value="coverage" className="font-tajawal">التغطية</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm bg-amber-50">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                <p className="text-xs text-amber-600 font-tajawal">بانتظار المراجعة</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-green-50">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
                <p className="text-xs text-green-600 font-tajawal">تمت الموافقة</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-red-50">
              <CardContent className="p-4 text-center">
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{revisionCount}</p>
                <p className="text-xs text-red-600 font-tajawal">يحتاج تعديل</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Queue */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-tajawal">آخر العناصر المطلوب مراجعتها</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {REVIEW_QUEUE.filter(r => r.status === 'pending').slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.type === 'question' ? (
                      <ClipboardCheck className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Brain className="w-4 h-4 text-purple-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700 font-tajawal">{item.title}</p>
                      <p className="text-xs text-gray-400 font-tajawal">{item.skill} • صف {item.grade}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs">
                      موافقة
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs">
                      تعديل
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-tajawal">قائمة الأسئلة للمراجعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {REVIEW_QUEUE.filter(r => r.type === 'question').map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800 font-tajawal">{item.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.skill}</Badge>
                        <Badge variant="outline" className="text-xs">صف {item.grade}</Badge>
                        <Badge variant="outline" className="text-xs">{item.difficulty}</Badge>
                      </div>
                    </div>
                    <Badge className={`text-xs ${
                      item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      item.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.status === 'pending' ? 'قيد المراجعة' : item.status === 'approved' ? 'معتمد' : 'يحتاج تعديل'}
                    </Badge>
                  </div>
                  {item.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8">
                        <CheckCircle className="w-3 h-3 ml-1" /> اعتماد
                      </Button>
                      <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 text-xs h-8">
                        طلب تعديل
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 text-xs h-8">
                        <XCircle className="w-3 h-3 ml-1" /> رفض
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-tajawal">مراجعة المهارات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SKILL_REVIEW.map((skill, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800 font-tajawal">{skill.name}</h4>
                      <Badge className={`text-xs ${
                        skill.status === 'approved' ? 'bg-green-100 text-green-700' :
                        skill.status === 'needs_revision' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {skill.quality}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400 font-tajawal">عدد الأسئلة:</span>
                        <span className="font-bold mr-1">{skill.questions}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-tajawal">التغطية:</span>
                        <span className="font-bold mr-1">{skill.coverage}%</span>
                      </div>
                    </div>
                    <Progress value={skill.coverage} className="h-1.5 mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="font-tajawal">تغطية المنهج</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {COVERAGE_DATA.map((item) => (
                <div key={item.domain} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 font-tajawal mb-3">{item.domain}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-14 font-tajawal">صف 1</span>
                      <Progress value={item.grade1} className="h-2 flex-1" />
                      <span className="text-xs font-bold text-gray-600 w-10">{item.grade1}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-14 font-tajawal">صف 2</span>
                      <Progress value={item.grade2} className="h-2 flex-1" />
                      <span className="text-xs font-bold text-gray-600 w-10">{item.grade2}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}