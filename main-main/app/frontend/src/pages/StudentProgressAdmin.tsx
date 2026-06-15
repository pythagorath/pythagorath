// Student Progress Admin - Admin view of per-student progress
import { useState, useEffect } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users, TrendingUp, Brain, Flame, Star,
  ArrowLeft, RefreshCw, ChevronDown, ChevronUp,
  BookOpen, CheckCircle, Target, Award
} from 'lucide-react';
import { loadUserDataById } from '@/lib/pilotStorage';

interface StudentProgress {
  studentId: string;
  name: string;
  grade: number;
  xp: number;
  level: number;
  streak: number;
  lessonsCompleted: number;
  totalLessons: number;
  quizScores: number[];
  avgQuizScore: number;
  masteryLevels: Record<string, number>;
  avgMastery: number;
  lastActive: string;
  status: 'active' | 'at_risk' | 'inactive';
}

// Demo student accounts from pilot
const PILOT_STUDENTS = [
  { id: 'student_1', name: 'أحمد', grade: 1 },
  { id: 'student_2', name: 'سارة', grade: 1 },
  { id: 'student_3', name: 'محمد', grade: 2 },
  { id: 'student_4', name: 'فاطمة', grade: 2 },
  { id: 'student_5', name: 'عمر', grade: 1 },
  { id: 'student_6', name: 'نور', grade: 1 },
  { id: 'student_7', name: 'يوسف', grade: 2 },
  { id: 'student_8', name: 'مريم', grade: 2 },
  { id: 'student_9', name: 'خالد', grade: 1 },
  { id: 'student_10', name: 'ليلى', grade: 2 },
];

function getStudentProgress(): StudentProgress[] {
  return PILOT_STUDENTS.map(student => {
    // Read from pilotStorage for each student
    const stored = loadUserDataById(student.id, 'progress', null) as Record<string, unknown> | null;
    const xp = stored?.xp || Math.floor(Math.random() * 500) + 50;
    const level = Math.floor(xp / 100) + 1;
    const streak = stored?.streak || Math.floor(Math.random() * 8);
    const lessonsCompleted = stored?.lessonsCompleted || Math.floor(Math.random() * 15) + 1;
    const totalLessons = 20;
    const quizScores = stored?.quizScores || Array.from({ length: Math.floor(Math.random() * 5) + 2 }, () => Math.floor(Math.random() * 40) + 60);
    const avgQuizScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length) : 0;
    const masteryLevels: Record<string, number> = stored?.masteryLevels || {
      'الجمع': Math.floor(Math.random() * 40) + 50,
      'الطرح': Math.floor(Math.random() * 40) + 40,
      'الأشكال': Math.floor(Math.random() * 40) + 55,
    };
    const avgMastery = Math.round(Object.values(masteryLevels).reduce((a, b) => a + b, 0) / Object.values(masteryLevels).length);
    const lastActive = stored?.lastActive || (streak > 3 ? 'اليوم' : streak > 0 ? 'أمس' : `منذ ${Math.floor(Math.random() * 5) + 2} أيام`);
    const status: 'active' | 'at_risk' | 'inactive' = streak > 2 ? 'active' : streak > 0 ? 'at_risk' : 'inactive';

    return {
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      xp,
      level,
      streak,
      lessonsCompleted,
      totalLessons,
      quizScores,
      avgQuizScore,
      masteryLevels,
      avgMastery,
      lastActive,
      status,
    };
  });
}

export default function StudentProgressAdmin() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'xp' | 'mastery' | 'streak'>('name');
  const [filterGrade, setFilterGrade] = useState<number | null>(null);

  useEffect(() => {
    setStudents(getStudentProgress());
  }, []);

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  const refresh = () => setStudents(getStudentProgress());

  const sorted = [...students]
    .filter(s => !filterGrade || s.grade === filterGrade)
    .sort((a, b) => {
      switch (sortBy) {
        case 'xp': return b.xp - a.xp;
        case 'mastery': return b.avgMastery - a.avgMastery;
        case 'streak': return b.streak - a.streak;
        default: return a.name.localeCompare(b.name, 'ar');
      }
    });

  const totalXP = students.reduce((sum, s) => sum + s.xp, 0);
  const avgMastery = students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.avgMastery, 0) / students.length) : 0;
  const activeCount = students.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-tajawal">تقدم الطلاب</h1>
            <p className="text-sm text-gray-500 font-tajawal mt-1">متابعة أداء وتقدم كل طالب</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} className="gap-1">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="font-tajawal">
              <ArrowLeft className="w-4 h-4 ml-1" />
              لوحة التحكم
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}/{students.length}</p>
                  <p className="text-xs text-gray-400 font-tajawal">طلاب نشطين</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalXP}</p>
                  <p className="text-xs text-gray-400 font-tajawal">إجمالي XP</p>
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
                  <p className="text-2xl font-bold">{avgMastery}%</p>
                  <p className="text-xs text-gray-400 font-tajawal">متوسط الإتقان</p>
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
                  <p className="text-2xl font-bold">{students.filter(s => s.streak >= 3).length}</p>
                  <p className="text-xs text-gray-400 font-tajawal">سلسلة 3+ أيام</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                className="text-sm border border-gray-200 rounded-md px-3 py-2 font-tajawal"
                value={filterGrade || ''}
                onChange={(e) => setFilterGrade(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">كل الصفوف</option>
                <option value="1">الصف الأول</option>
                <option value="2">الصف الثاني</option>
              </select>
              <select
                className="text-sm border border-gray-200 rounded-md px-3 py-2 font-tajawal"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="name">ترتيب بالاسم</option>
                <option value="xp">ترتيب بالنقاط</option>
                <option value="mastery">ترتيب بالإتقان</option>
                <option value="streak">ترتيب بالسلسلة</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        <div className="space-y-3">
          {sorted.map((student) => (
            <Card key={student.studentId} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedStudent(expandedStudent === student.studentId ? null : student.studentId)}
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    student.status === 'active' ? 'bg-gradient-to-br from-green-400 to-emerald-600' :
                    student.status === 'at_risk' ? 'bg-gradient-to-br from-amber-400 to-orange-600' :
                    'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    {student.name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 font-tajawal">{student.name}</span>
                      <Badge variant="outline" className="text-xs">الصف {student.grade}</Badge>
                      <Badge className={`text-xs ${
                        student.status === 'active' ? 'bg-green-100 text-green-700' :
                        student.status === 'at_risk' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {student.status === 'active' ? 'نشط' : student.status === 'at_risk' ? 'معرض' : 'غير نشط'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-purple-500" />{student.xp} XP</span>
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" />{student.streak} أيام</span>
                      <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-indigo-500" />{student.avgMastery}% إتقان</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-blue-500" />{student.lessonsCompleted}/{student.totalLessons} درس</span>
                    </div>
                  </div>

                  {/* Expand */}
                  <div className="text-gray-400">
                    {expandedStudent === student.studentId ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedStudent === student.studentId && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 font-tajawal">تقدم الدروس</span>
                        <span className="text-sm font-bold text-gray-700">{Math.round((student.lessonsCompleted / student.totalLessons) * 100)}%</span>
                      </div>
                      <Progress value={(student.lessonsCompleted / student.totalLessons) * 100} className="h-2" />
                    </div>

                    {/* Quiz Scores */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 font-tajawal mb-2 flex items-center gap-1">
                        <Target className="w-4 h-4 text-indigo-500" />
                        درجات الاختبارات (متوسط: {student.avgQuizScore}%)
                      </h4>
                      <div className="flex items-end gap-1 h-16">
                        {student.quizScores.map((score, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <span className="text-[9px] text-gray-400">{score}%</span>
                            <div
                              className={`w-full rounded-t ${score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ height: `${score * 0.6}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mastery Levels */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 font-tajawal mb-2 flex items-center gap-1">
                        <Award className="w-4 h-4 text-purple-500" />
                        مستويات الإتقان
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(student.masteryLevels).map(([skill, level]) => (
                          <div key={skill}>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-xs text-gray-600 font-tajawal">{skill}</span>
                              <span className="text-xs font-bold text-gray-700">{level}%</span>
                            </div>
                            <Progress value={level} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Last Active */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                      <span className="font-tajawal">آخر نشاط: {student.lastActive}</span>
                      <span className="font-tajawal">المستوى: {student.level}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}