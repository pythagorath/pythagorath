import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, CheckCircle, XCircle, BarChart3, FileText } from 'lucide-react';
import { skills, questions } from '@/data/mathSkillsData';

// Curriculum objectives extracted from PDFs
interface CurriculumObjective {
  id: string;
  grade: 1 | 2;
  semester: 1 | 2;
  unit: string;
  objective: string;
  domain: string;
  mappedSkillIds: string[];
  covered: boolean;
}

const curriculumObjectives: CurriculumObjective[] = [
  // Grade 1 - Semester 1
  { id: 'OBJ-G1S1-01', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'العد حتى 10 وربط العدد بالكمية', domain: 'الأعداد والعد', mappedSkillIds: ['G1-N-001', 'G1-N-002', 'G1-N-005'], covered: true },
  { id: 'OBJ-G1S1-02', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'قراءة وكتابة الأعداد حتى 10', domain: 'قراءة وكتابة الأعداد', mappedSkillIds: ['G1-N-003', 'G1-N-004'], covered: true },
  { id: 'OBJ-G1S1-03', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'تكوين الأعداد 5 و 10 من أزواج', domain: 'المقارنة والتكوين', mappedSkillIds: ['G1-N-010', 'G1-N-011'], covered: true },
  { id: 'OBJ-G1S1-04', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'العد حتى 20 والتعرف على الأعداد 11-20', domain: 'الأعداد والعد', mappedSkillIds: ['G1-N-014'], covered: true },
  { id: 'OBJ-G1S1-05', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'مفهوم الضعف والتقدير', domain: 'الأعداد والعد', mappedSkillIds: ['G1-N-015', 'G1-N-016'], covered: true },
  { id: 'OBJ-G1S1-06', grade: 1, semester: 1, unit: 'الوحدة 2', objective: 'المقارنة بين الكميات (أكثر/أقل)', domain: 'المقارنة والتكوين', mappedSkillIds: ['G1-N-006', 'G1-N-008', 'G1-N-009'], covered: true },
  { id: 'OBJ-G1S1-07', grade: 1, semester: 1, unit: 'الوحدة 2', objective: 'التعرف على الأعداد الزوجية والفردية', domain: 'الأعداد والعد', mappedSkillIds: ['G1-N-017'], covered: true },
  { id: 'OBJ-G1S1-08', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'التعرف على الأشكال الهندسية البسيطة', domain: 'الأشكال الهندسية', mappedSkillIds: ['G1-G-001', 'G1-G-002'], covered: true },
  { id: 'OBJ-G1S1-09', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'التعرف على المجسمات ثلاثية الأبعاد', domain: 'الأشكال الهندسية', mappedSkillIds: ['G1-G-004'], covered: true },
  { id: 'OBJ-G1S1-10', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'استكمال الأنماط البسيطة', domain: 'الأنماط', mappedSkillIds: ['G1-P-001'], covered: true },
  { id: 'OBJ-G1S1-11', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'مقارنة الأطوال والسعة والوزن', domain: 'القياس', mappedSkillIds: ['G1-M-001', 'G1-M-002', 'G1-M-003'], covered: true },
  { id: 'OBJ-G1S1-12', grade: 1, semester: 1, unit: 'الوحدة 2', objective: 'قراءة الوقت بالساعة والنصف ساعة', domain: 'الوقت والنقود', mappedSkillIds: ['G1-T-001', 'G1-T-005'], covered: true },
  { id: 'OBJ-G1S1-13', grade: 1, semester: 1, unit: 'الوحدة 2', objective: 'التعرف على النقود العمانية وجمعها', domain: 'الوقت والنقود', mappedSkillIds: ['G1-T-002', 'G1-T-006'], covered: true },
  { id: 'OBJ-G1S1-14', grade: 1, semester: 1, unit: 'الوحدة 1', objective: 'عد وتسجيل بيانات بسيطة', domain: 'البيانات', mappedSkillIds: ['G1-D-001'], covered: true },

  // Grade 1 - Semester 2
  { id: 'OBJ-G1S2-01', grade: 1, semester: 2, unit: 'النشاط 21', objective: 'الجمع والطرح ضمن 10', domain: 'الجمع والطرح', mappedSkillIds: ['G1-N-012', 'G1-N-013'], covered: true },
  { id: 'OBJ-G1S2-02', grade: 1, semester: 2, unit: 'النشاط 21', objective: 'الجمع على خط الأعداد', domain: 'الجمع والطرح', mappedSkillIds: ['G1-N-018'], covered: true },
  { id: 'OBJ-G1S2-03', grade: 1, semester: 2, unit: 'النشاط 23', objective: 'إيجاد العدد المكمل للعشرة', domain: 'الجمع والطرح', mappedSkillIds: ['G1-N-019'], covered: true },
  { id: 'OBJ-G1S2-04', grade: 1, semester: 2, unit: 'النشاط 22', objective: 'مفهوم الضعف والنصف', domain: 'الجمع والطرح', mappedSkillIds: ['G1-N-020'], covered: true },
  { id: 'OBJ-G1S2-05', grade: 1, semester: 2, unit: 'النشاط 20', objective: 'فهم العشرات والآحاد والعد بالعشرات', domain: 'الأعداد والعد', mappedSkillIds: ['G1-N-021', 'G1-N-022'], covered: true },
  { id: 'OBJ-G1S2-06', grade: 1, semester: 2, unit: 'النشاط 22', objective: 'التماثل وأنصاف الأشكال', domain: 'الأشكال الهندسية', mappedSkillIds: ['G1-G-003', 'G1-G-005'], covered: true },
  { id: 'OBJ-G1S2-07', grade: 1, semester: 2, unit: 'النشاط 17', objective: 'أيام الأسبوع وأشهر السنة', domain: 'الوقت والنقود', mappedSkillIds: ['G1-T-003', 'G1-T-004'], covered: true },
  { id: 'OBJ-G1S2-08', grade: 1, semester: 2, unit: 'النشاط 19', objective: 'قراءة المخططات البيانية والتصنيف', domain: 'البيانات', mappedSkillIds: ['G1-D-002', 'G1-D-003'], covered: true },
  { id: 'OBJ-G1S2-09', grade: 1, semester: 2, unit: 'النشاط 18', objective: 'حل مسائل كلامية بسيطة', domain: 'الجمع والطرح', mappedSkillIds: [], covered: false },
  { id: 'OBJ-G1S2-10', grade: 1, semester: 2, unit: 'النشاط 24', objective: 'الأنماط العددية المتقدمة', domain: 'الأنماط', mappedSkillIds: [], covered: false },

  // Grade 2 - Semester 1
  { id: 'OBJ-G2S1-01', grade: 2, semester: 1, unit: 'النشاط 2-1', objective: 'قراءة الأعداد حتى 100 واستخدام لوحة المائة', domain: 'الأعداد حتى 100', mappedSkillIds: ['G2-N-001', 'G2-N-002'], covered: true },
  { id: 'OBJ-G2S1-02', grade: 2, semester: 1, unit: 'النشاط 2-1', objective: 'العد بالاثنينات والخمسات والعشرات', domain: 'العد بالمضاعفات', mappedSkillIds: ['G2-N-003', 'G2-N-004', 'G2-N-005'], covered: true },
  { id: 'OBJ-G2S1-03', grade: 2, semester: 1, unit: 'النشاط 4-1', objective: 'ترتيب الأعداد ومقارنتها حتى 100', domain: 'الأعداد حتى 100', mappedSkillIds: ['G2-N-006', 'G2-N-007'], covered: true },
  { id: 'OBJ-G2S1-04', grade: 2, semester: 1, unit: 'النشاط 4-2', objective: 'التقريب إلى أقرب عشرة', domain: 'التقريب والمقارنة', mappedSkillIds: ['G2-N-008'], covered: true },
  { id: 'OBJ-G2S1-05', grade: 2, semester: 1, unit: 'النشاط 5-1', objective: 'الأزواج العددية للعدد 20 و100', domain: 'الأزواج العددية', mappedSkillIds: ['G2-N-009', 'G2-N-010'], covered: true },
  { id: 'OBJ-G2S1-06', grade: 2, semester: 1, unit: 'النشاط 6', objective: 'الجمع والطرح ضمن 20', domain: 'الجمع والطرح', mappedSkillIds: ['G2-C-001', 'G2-C-002'], covered: true },
  { id: 'OBJ-G2S1-07', grade: 2, semester: 1, unit: 'النشاط 3-2', objective: 'عائلة الحقائق (الجمع والطرح)', domain: 'الجمع والطرح', mappedSkillIds: ['G2-C-005'], covered: true },
  { id: 'OBJ-G2S1-08', grade: 2, semester: 1, unit: 'النشاط 7-1', objective: 'فهم المصفوفات والعد المنظم', domain: 'المصفوفات والضرب', mappedSkillIds: ['G2-A-001'], covered: true },
  { id: 'OBJ-G2S1-09', grade: 2, semester: 1, unit: 'النشاط 8', objective: 'الأشكال ثنائية الأبعاد والمجسمات والتماثل', domain: 'الأشكال والمجسمات', mappedSkillIds: ['G2-G-001', 'G2-G-002', 'G2-G-003'], covered: true },
  { id: 'OBJ-G2S1-10', grade: 2, semester: 1, unit: 'النشاط 9-2', objective: 'قياس الطول بالسنتيمتر والكتلة بالغرام', domain: 'القياس', mappedSkillIds: ['G2-M-001', 'G2-M-002'], covered: true },
  { id: 'OBJ-G2S1-11', grade: 2, semester: 1, unit: 'النشاط 10', objective: 'قراءة الوقت بالدقائق وحساب الفترات الزمنية', domain: 'الوقت والنقود', mappedSkillIds: ['G2-M-003', 'G2-T-001', 'G2-T-002'], covered: true },
  { id: 'OBJ-G2S1-12', grade: 2, semester: 1, unit: 'النشاط 11-3', objective: 'التعامل مع النقود: الجمع والطرح والمقارنة', domain: 'الوقت والنقود', mappedSkillIds: ['G2-M-004', 'G2-T-003', 'G2-T-004'], covered: true },
  { id: 'OBJ-G2S1-13', grade: 2, semester: 1, unit: 'النشاط 12', objective: 'استخدام رموز المقارنة (> و < و =)', domain: 'التقريب والمقارنة', mappedSkillIds: ['G2-N-007'], covered: true },

  // Grade 2 - Semester 2
  { id: 'OBJ-G2S2-01', grade: 2, semester: 2, unit: 'النشاط 22', objective: 'مفهوم الضعف والنصف', domain: 'الأزواج العددية', mappedSkillIds: ['G2-N-011'], covered: true },
  { id: 'OBJ-G2S2-02', grade: 2, semester: 2, unit: 'النشاط 23', objective: 'العد بالثلاثات والأربعات', domain: 'العد بالمضاعفات', mappedSkillIds: ['G2-N-012', 'G2-N-013'], covered: true },
  { id: 'OBJ-G2S2-03', grade: 2, semester: 2, unit: 'النشاط 24', objective: 'الجمع والطرح ضمن 100', domain: 'الجمع والطرح', mappedSkillIds: ['G2-C-003', 'G2-C-004'], covered: true },
  { id: 'OBJ-G2S2-04', grade: 2, semester: 2, unit: 'النشاط 26', objective: 'الضرب باستخدام المصفوفات', domain: 'المصفوفات والضرب', mappedSkillIds: ['G2-A-002'], covered: true },
  { id: 'OBJ-G2S2-05', grade: 2, semester: 2, unit: 'النشاط 28-29', objective: 'المضلعات والدوران والحركة', domain: 'الأشكال والمجسمات', mappedSkillIds: ['G2-G-004', 'G2-G-005'], covered: true },
  { id: 'OBJ-G2S2-06', grade: 2, semester: 2, unit: 'النشاط 20', objective: 'قياس السعة باللتر', domain: 'القياس', mappedSkillIds: ['G2-M-005'], covered: true },
  { id: 'OBJ-G2S2-07', grade: 2, semester: 2, unit: 'النشاط 18', objective: 'قراءة ومقارنة البيانات المصورة', domain: 'البيانات', mappedSkillIds: ['G2-D-001', 'G2-D-002', 'G2-D-003'], covered: true },
  { id: 'OBJ-G2S2-08', grade: 2, semester: 2, unit: 'النشاط 25', objective: 'الكسور: النصف والربع', domain: 'الكسور', mappedSkillIds: ['G2-F-001'], covered: true },
  { id: 'OBJ-G2S2-09', grade: 2, semester: 2, unit: 'النشاط 27', objective: 'القسمة كتوزيع متساوٍ', domain: 'المصفوفات والضرب', mappedSkillIds: [], covered: false },
  { id: 'OBJ-G2S2-10', grade: 2, semester: 2, unit: 'النشاط 21', objective: 'حل مسائل كلامية متعددة الخطوات', domain: 'الجمع والطرح', mappedSkillIds: [], covered: false },
];

function getGradeSemesterLabel(grade: 1 | 2, semester: 1 | 2): string {
  return `الصف ${grade === 1 ? 'الأول' : 'الثاني'} - الفصل ${semester === 1 ? 'الأول' : 'الثاني'}`;
}

interface CoverageStats {
  total: number;
  covered: number;
  uncovered: number;
  percentage: number;
  skillCount: number;
  questionCount: number;
}

function getCoverageStats(grade: 1 | 2, semester: 1 | 2): CoverageStats {
  const objs = curriculumObjectives.filter(o => o.grade === grade && o.semester === semester);
  const covered = objs.filter(o => o.covered).length;
  const gradeSkills = skills.filter(s => s.grade === grade && s.semester === semester);
  const gradeQuestions = questions.filter(q => q.grade === grade && q.semester === semester);
  return {
    total: objs.length,
    covered,
    uncovered: objs.length - covered,
    percentage: objs.length > 0 ? Math.round((covered / objs.length) * 100) : 0,
    skillCount: gradeSkills.length,
    questionCount: gradeQuestions.length,
  };
}

export default function CurriculumReport() {
  const [selectedGrade, setSelectedGrade] = useState<'all' | '1-1' | '1-2' | '2-1' | '2-2'>('all');

  const allStats = [
    { grade: 1 as const, semester: 1 as const, ...getCoverageStats(1, 1) },
    { grade: 1 as const, semester: 2 as const, ...getCoverageStats(1, 2) },
    { grade: 2 as const, semester: 1 as const, ...getCoverageStats(2, 1) },
    { grade: 2 as const, semester: 2 as const, ...getCoverageStats(2, 2) },
  ];

  const totalObjectives = allStats.reduce((sum, s) => sum + s.total, 0);
  const totalCovered = allStats.reduce((sum, s) => sum + s.covered, 0);
  const overallPercentage = totalObjectives > 0 ? Math.round((totalCovered / totalObjectives) * 100) : 0;

  const filteredObjectives = selectedGrade === 'all'
    ? curriculumObjectives
    : curriculumObjectives.filter(o => {
        const [g, s] = selectedGrade.split('-').map(Number);
        return o.grade === g && o.semester === s;
      });

  const uncoveredObjectives = curriculumObjectives.filter(o => !o.covered);

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تقرير تغطية المنهج</h1>
            <p className="text-gray-600">تحليل شامل لتغطية المنهج العماني في محرك المهارات</p>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-teal-200 bg-teal-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-teal-700">{overallPercentage}%</div>
              <div className="text-sm text-teal-600 mt-1">نسبة التغطية الإجمالية</div>
              <Progress value={overallPercentage} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{totalObjectives}</div>
              <div className="text-sm text-gray-600 mt-1">إجمالي الأهداف</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-700">{totalCovered}</div>
              <div className="text-sm text-gray-600 mt-1">أهداف مغطاة</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-700">{totalObjectives - totalCovered}</div>
              <div className="text-sm text-gray-600 mt-1">أهداف غير مغطاة</div>
            </CardContent>
          </Card>
        </div>

        {/* Per Grade/Semester Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allStats.map((stat) => (
            <Card key={`${stat.grade}-${stat.semester}`} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {getGradeSemesterLabel(stat.grade, stat.semester)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{stat.percentage}%</span>
                  <Badge variant={stat.percentage >= 80 ? 'default' : stat.percentage >= 60 ? 'secondary' : 'destructive'}>
                    {stat.covered}/{stat.total}
                  </Badge>
                </div>
                <Progress value={stat.percentage} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{stat.skillCount} مهارة</span>
                  <span>{stat.questionCount} سؤال</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="objectives" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="objectives">الأهداف والمهارات</TabsTrigger>
            <TabsTrigger value="uncovered">غير المغطاة</TabsTrigger>
            <TabsTrigger value="domains">حسب المجال</TabsTrigger>
          </TabsList>

          <TabsContent value="objectives" className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={selectedGrade === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedGrade('all')}
              >
                الكل
              </Badge>
              <Badge
                variant={selectedGrade === '1-1' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedGrade('1-1')}
              >
                صف 1 - فصل 1
              </Badge>
              <Badge
                variant={selectedGrade === '1-2' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedGrade('1-2')}
              >
                صف 1 - فصل 2
              </Badge>
              <Badge
                variant={selectedGrade === '2-1' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedGrade('2-1')}
              >
                صف 2 - فصل 1
              </Badge>
              <Badge
                variant={selectedGrade === '2-2' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedGrade('2-2')}
              >
                صف 2 - فصل 2
              </Badge>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الهدف التعليمي</TableHead>
                      <TableHead className="text-right">المجال</TableHead>
                      <TableHead className="text-right">الوحدة</TableHead>
                      <TableHead className="text-right">المهارات المرتبطة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredObjectives.map((obj) => (
                      <TableRow key={obj.id}>
                        <TableCell>
                          {obj.covered ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{obj.objective}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{obj.domain}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{obj.unit}</TableCell>
                        <TableCell>
                          {obj.mappedSkillIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {obj.mappedSkillIds.map(sid => {
                                const skill = skills.find(s => s.id === sid);
                                return (
                                  <Badge key={sid} variant="secondary" className="text-xs">
                                    {skill?.name || sid}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-red-500">لا توجد مهارات مرتبطة</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uncovered" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  الأهداف غير المغطاة ({uncoveredObjectives.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uncoveredObjectives.length === 0 ? (
                  <p className="text-center text-green-600 py-4">🎉 جميع الأهداف مغطاة!</p>
                ) : (
                  <div className="space-y-3">
                    {uncoveredObjectives.map((obj) => (
                      <div key={obj.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{obj.objective}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{getGradeSemesterLabel(obj.grade, obj.semester)}</Badge>
                            <Badge variant="outline" className="text-xs">{obj.domain}</Badge>
                            <Badge variant="outline" className="text-xs">{obj.unit}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domains" className="space-y-4">
            <DomainCoverageView />
          </TabsContent>
        </Tabs>

        {/* Skills with Questions Count */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              إحصائيات المهارات والأسئلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">الصف الأول</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>المهارات:</span>
                    <span className="font-bold">{skills.filter(s => s.grade === 1).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الأسئلة:</span>
                    <span className="font-bold">{questions.filter(q => q.grade === 1).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>متوسط الأسئلة/مهارة:</span>
                    <span className="font-bold">
                      {skills.filter(s => s.grade === 1).length > 0
                        ? (questions.filter(q => q.grade === 1).length / skills.filter(s => s.grade === 1).length).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">الصف الثاني</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>المهارات:</span>
                    <span className="font-bold">{skills.filter(s => s.grade === 2).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الأسئلة:</span>
                    <span className="font-bold">{questions.filter(q => q.grade === 2).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>متوسط الأسئلة/مهارة:</span>
                    <span className="font-bold">
                      {skills.filter(s => s.grade === 2).length > 0
                        ? (questions.filter(q => q.grade === 2).length / skills.filter(s => s.grade === 2).length).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function DomainCoverageView() {
  const allDomains = [...new Set(curriculumObjectives.map(o => o.domain))];

  const domainStats = allDomains.map(domain => {
    const objs = curriculumObjectives.filter(o => o.domain === domain);
    const covered = objs.filter(o => o.covered).length;
    const domainSkills = skills.filter(s => s.domain === domain);
    const domainQuestions = questions.filter(q => {
      const skill = skills.find(s => s.id === q.skillId);
      return skill?.domain === domain;
    });
    return {
      domain,
      objectives: objs.length,
      covered,
      percentage: objs.length > 0 ? Math.round((covered / objs.length) * 100) : 0,
      skillCount: domainSkills.length,
      questionCount: domainQuestions.length,
    };
  }).sort((a, b) => b.percentage - a.percentage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          التغطية حسب المجال
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {domainStats.map((stat) => (
            <div key={stat.domain} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{stat.domain}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{stat.skillCount} مهارة | {stat.questionCount} سؤال</span>
                  <Badge variant={stat.percentage === 100 ? 'default' : stat.percentage >= 50 ? 'secondary' : 'destructive'}>
                    {stat.percentage}%
                  </Badge>
                </div>
              </div>
              <Progress value={stat.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}