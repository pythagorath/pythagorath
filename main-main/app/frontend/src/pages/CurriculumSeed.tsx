// Curriculum Seed Page - Admin tool to populate Oman curriculum data
import { useState, useCallback } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Database, CheckCircle, XCircle, Loader2, ArrowRight,
  GraduationCap, BookOpen, Globe, Calendar, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { seedOmanCurriculum, verifyOmanCurriculum, type SeedProgress } from '@/scripts/seedOmanCurriculum';
import { OMAN_SUBJECTS, OMAN_GRADES, OMAN_CURRICULUM_STATS, getSubjectsForGrade } from '@/data/omanCurriculumData';

export default function CurriculumSeed() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState<SeedProgress | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string; stats: Record<string, number> } | null>(null);
  const [verification, setVerification] = useState<{ grades: number; semesters: number; subjects: number; isComplete: boolean } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number>(1);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    setResult(null);
    setProgress(null);

    const seedResult = await seedOmanCurriculum((p) => setProgress(p));
    setResult(seedResult);
    setSeeding(false);

    if (seedResult.success) {
      toast.success(seedResult.message);
    } else {
      toast.error(seedResult.message);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    const v = await verifyOmanCurriculum();
    setVerification(v);
    setVerifying(false);

    if (v.isComplete) {
      toast.success('✅ المنهج مكتمل في قاعدة البيانات');
    } else {
      toast.warning('⚠️ المنهج غير مكتمل - يرجى تشغيل التحميل');
    }
  }, []);

  const progressPercent = progress ? (progress.current / progress.total) * 100 : 0;

  // Only admin can access
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">غير مصرح</h2>
            <p className="text-gray-600">هذه الصفحة متاحة للمسؤولين فقط</p>
            <Button onClick={() => navigate('/admin')} className="mt-4">
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Database className="w-7 h-7 text-indigo-600" />
              تحميل المنهج العماني
            </h1>
            <p className="text-gray-500 mt-1">إعداد بيانات المنهج الدراسي لسلطنة عمان</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            العودة للوحة التحكم
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-indigo-100">
            <CardContent className="p-4 text-center">
              <Globe className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-indigo-700">1</p>
              <p className="text-xs text-gray-500">دولة</p>
            </CardContent>
          </Card>
          <Card className="border-blue-100">
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-700">{OMAN_CURRICULUM_STATS.totalGrades}</p>
              <p className="text-xs text-gray-500">صف دراسي</p>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{OMAN_CURRICULUM_STATS.totalSemesters}</p>
              <p className="text-xs text-gray-500">فصل دراسي</p>
            </CardContent>
          </Card>
          <Card className="border-purple-100">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-700">{OMAN_CURRICULUM_STATS.totalSubjects}</p>
              <p className="text-xs text-gray-500">مادة دراسية</p>
            </CardContent>
          </Card>
          <Card className="border-amber-100">
            <CardContent className="p-4 text-center">
              <Layers className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-700">{OMAN_CURRICULUM_STATS.academicYear}</p>
              <p className="text-xs text-gray-500">العام الدراسي</p>
            </CardContent>
          </Card>
        </div>

        {/* Seed Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              إجراءات التحميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSeed}
                disabled={seeding}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 ml-2" />
                    تحميل المنهج العماني
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 ml-2" />
                )}
                التحقق من البيانات
              </Button>
            </div>

            {/* Progress */}
            {progress && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{progress.step}</span>
                  <span className="text-gray-500">{progress.current}/{progress.total}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {progress.message && (
                  <p className="text-xs text-gray-600">{progress.message}</p>
                )}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </p>
                </div>
                {result.stats && (
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>🏫 صفوف: {result.stats.grades}</span>
                    <span>📅 فصول: {result.stats.semesters}</span>
                    <span>📚 مواد: {result.stats.subjects}</span>
                  </div>
                )}
              </div>
            )}

            {/* Verification */}
            {verification && (
              <div className={`p-4 rounded-lg border ${verification.isComplete ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {verification.isComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <p className="font-medium">
                    {verification.isComplete ? 'المنهج مكتمل ✓' : 'المنهج غير مكتمل'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-lg font-bold">{verification.grades}/12</p>
                    <p className="text-gray-500">صفوف</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{verification.semesters}/24</p>
                    <p className="text-gray-500">فصول</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{verification.subjects}/15</p>
                    <p className="text-gray-500">مواد</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              المواد الدراسية - المنهج العماني
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Grade selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {OMAN_GRADES.map((g, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={selectedGrade === idx + 1 ? 'default' : 'outline'}
                  onClick={() => setSelectedGrade(idx + 1)}
                  className="text-xs"
                >
                  {g.name}
                </Button>
              ))}
            </div>

            {/* Subjects for selected grade */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getSubjectsForGrade(selectedGrade).map((subject, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <span className="text-2xl">{subject.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{subject.name}</p>
                    <p className="text-xs text-gray-500">{subject.name_en}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        صف {subject.gradeFrom}-{subject.gradeTo}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              ))}
            </div>

            {/* Full subjects table */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-600 mb-3">جميع المواد ({OMAN_SUBJECTS.length} مادة)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-2 text-right border">#</th>
                      <th className="p-2 text-right border">المادة</th>
                      <th className="p-2 text-right border">بالإنجليزية</th>
                      <th className="p-2 text-center border">من صف</th>
                      <th className="p-2 text-center border">إلى صف</th>
                      <th className="p-2 text-center border">الأيقونة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OMAN_SUBJECTS.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border text-center">{idx + 1}</td>
                        <td className="p-2 border font-medium">{s.name}</td>
                        <td className="p-2 border text-gray-600">{s.name_en}</td>
                        <td className="p-2 border text-center">{s.gradeFrom}</td>
                        <td className="p-2 border text-center">{s.gradeTo}</td>
                        <td className="p-2 border text-center text-lg">{s.icon}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}