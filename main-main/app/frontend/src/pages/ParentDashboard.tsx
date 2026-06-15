// Parent Dashboard - Clear, warm, confidence-building
// Shows: progress, weak skills, mastery, retention, daily activity, recommendations
import { useState } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Brain, Flame, Calendar, Star, BookOpen, ArrowLeft, LogOut
} from 'lucide-react';

// Mock data for parent view
const MOCK_CHILDREN = [
  {
    id: 'student1',
    name: 'أحمد',
    grade: 1,
    streak: 5,
    level: 4,
    totalPoints: 340,
    masteryPercent: 62,
    todayCompleted: true,
    weakSkills: ['الطرح حتى 20', 'المقارنة بين الأعداد'],
    strongSkills: ['الجمع حتى 10', 'العد التصاعدي', 'الأشكال الهندسية'],
    weeklyProgress: [3, 4, 5, 3, 4, 5, 4],
    retentionRate: 78,
    lastActive: 'اليوم',
    recommendations: ['تدريب إضافي على الطرح', 'مراجعة المقارنة بالأدوات المحسوسة'],
  },
  {
    id: 'student2',
    name: 'سارة',
    grade: 1,
    streak: 3,
    level: 3,
    totalPoints: 220,
    masteryPercent: 48,
    todayCompleted: false,
    weakSkills: ['العد التنازلي', 'الجمع حتى 20'],
    strongSkills: ['التعرف على الأرقام', 'الأشكال'],
    weeklyProgress: [2, 3, 2, 4, 3, 0, 0],
    retentionRate: 65,
    lastActive: 'أمس',
    recommendations: ['تشجيع على إكمال المهمة اليومية', 'بدء بمسائل جمع أبسط'],
  },
];

export default function ParentDashboard() {
  const { user, logout } = usePilotAuth();
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState(0);

  if (!user) {
    navigate('/login');
    return null;
  }

  const children = MOCK_CHILDREN;
  const child = children[selectedChild];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">🦉</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800 font-tajawal">أكاديمية فيثاغورث</h1>
              <p className="text-xs text-gray-400">مرحباً {user.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }} className="text-gray-400">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex gap-2">
            {children.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(i)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors font-tajawal ${
                  selectedChild === i
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Quick Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{child.streak}</p>
              <p className="text-xs text-gray-400 font-tajawal">أيام متتالية</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{child.level}</p>
              <p className="text-xs text-gray-400 font-tajawal">المستوى</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Brain className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{child.masteryPercent}%</p>
              <p className="text-xs text-gray-400 font-tajawal">الإتقان</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{child.totalPoints}</p>
              <p className="text-xs text-gray-400 font-tajawal">النقاط</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Status */}
        <Card className={`border-0 shadow-sm ${child.todayCompleted ? 'bg-green-50' : 'bg-amber-50'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {child.todayCompleted ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800 font-tajawal">أكمل {child.name} مهمة اليوم ✓</p>
                  <p className="text-sm text-green-600">آخر نشاط: {child.lastActive}</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 font-tajawal">{child.name} لم يكمل مهمة اليوم بعد</p>
                  <p className="text-sm text-amber-600">آخر نشاط: {child.lastActive}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mastery Progress */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-tajawal flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              التقدم في الإتقان
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 font-tajawal">الإتقان الكلي</span>
                <span className="text-sm font-bold text-indigo-600">{child.masteryPercent}%</span>
              </div>
              <Progress value={child.masteryPercent} className="h-3" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 font-tajawal">معدل الاحتفاظ</span>
                <span className="text-sm font-bold text-green-600">{child.retentionRate}%</span>
              </div>
              <Progress value={child.retentionRate} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Weak Skills */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-tajawal flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              يحتاج تحسين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {child.weakSkills.map((skill, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-50 rounded-lg p-3">
                  <TrendingDown className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm text-amber-800 font-tajawal">{skill}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strong Skills */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-tajawal flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              نقاط القوة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {child.strongSkills.map((skill, i) => (
                <Badge key={i} className="bg-green-100 text-green-700 border-green-200 font-tajawal">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-tajawal flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              النشاط الأسبوعي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-1 h-24">
              {['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-md transition-all ${child.weeklyProgress[i] > 0 ? 'bg-indigo-400' : 'bg-gray-100'}`}
                    style={{ height: `${Math.max(child.weeklyProgress[i] * 16, 4)}px` }}
                  />
                  <span className="text-[10px] text-gray-400">{day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-0 shadow-sm bg-indigo-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-tajawal flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              توصيات لك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {child.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 font-tajawal">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}