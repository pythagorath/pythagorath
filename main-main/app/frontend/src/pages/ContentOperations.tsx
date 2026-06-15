import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, BookOpen, AlertTriangle, CheckCircle2, 
  BarChart3, FileQuestion, Layers, Target, RefreshCw,
  TrendingUp, XCircle, Eye, Plus
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface OverviewData {
  total_domains: number;
  total_skills: number;
  skills_by_status: Record<string, number>;
  total_questions: number;
  questions_by_status: Record<string, number>;
  skills_missing_min_questions: number;
  skills_missing_visual_questions: number;
  skills_without_remediation: number;
  skills_without_retention: number;
}

interface GapItem {
  skill_id: number;
  skill_name: string;
  grade: string;
  domain_name: string | null;
  gap_type: string;
  details: string;
}

interface GapsData {
  total_gaps: number;
  gaps: GapItem[];
}

interface CoverageItem {
  grade: string;
  domain_name: string;
  total_skills: number;
  total_questions: number;
  approved_percentage: number;
  draft_percentage: number;
}

interface CoverageData {
  coverage: CoverageItem[];
}

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-800',
  approved: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  published: 'منشور',
  approved: 'معتمد',
  review: 'قيد المراجعة',
  draft: 'مسودة',
  pending_review: 'بانتظار المراجعة',
  rejected: 'مرفوض',
};

const gapTypeLabels: Record<string, string> = {
  missing_questions: 'نقص أسئلة',
  missing_remediation: 'بدون مسار علاجي',
  poor_performance: 'أداء ضعيف',
  missing_prerequisites: 'بدون متطلبات سابقة',
};

const gapTypeIcons: Record<string, typeof FileQuestion> = {
  missing_questions: FileQuestion,
  missing_remediation: Target,
  poor_performance: TrendingUp,
  missing_prerequisites: Layers,
};

export default function ContentOperations() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [gaps, setGaps] = useState<GapsData | null>(null);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, gapsRes, coverageRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/content-analytics/overview`),
        fetch(`${API_BASE}/api/v1/content-analytics/gaps`),
        fetch(`${API_BASE}/api/v1/content-analytics/coverage`),
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value.ok) {
        setOverview(await overviewRes.value.json());
      }
      if (gapsRes.status === 'fulfilled' && gapsRes.value.ok) {
        setGaps(await gapsRes.value.json());
      }
      if (coverageRes.status === 'fulfilled' && coverageRes.value.ok) {
        setCoverage(await coverageRes.value.json());
      }
    } catch (err) {
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 font-tajawal text-lg">جاري تحميل بيانات المحتوى...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-tajawal">إدارة المحتوى التعليمي</h1>
            <p className="text-gray-500 mt-1">مراقبة جودة المنهج وتحليل الفجوات</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowRight className="w-4 h-4 ml-2" />
              لوحة الإدارة
            </Button>
            <Button onClick={fetchAllData} variant="outline">
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="gaps">تحليل الفجوات</TabsTrigger>
            <TabsTrigger value="coverage">التغطية</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {overview && <OverviewSection data={overview} />}
          </TabsContent>

          {/* Gaps Tab */}
          <TabsContent value="gaps" className="space-y-6">
            {gaps && <GapsSection data={gaps} />}
          </TabsContent>

          {/* Coverage Tab */}
          <TabsContent value="coverage" className="space-y-6">
            {coverage && <CoverageSection data={coverage} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OverviewSection({ data }: { data: OverviewData }) {
  const totalSkillStatuses = Object.values(data.skills_by_status).reduce((a, b) => a + b, 0);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-r-4 border-r-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">المجالات</p>
                <p className="text-3xl font-bold text-blue-700">{data.total_domains}</p>
              </div>
              <Layers className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">المهارات</p>
                <p className="text-3xl font-bold text-green-700">{data.total_skills}</p>
              </div>
              <Target className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">الأسئلة</p>
                <p className="text-3xl font-bold text-purple-700">{data.total_questions}</p>
              </div>
              <FileQuestion className="w-10 h-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">الفجوات</p>
                <p className="text-3xl font-bold text-amber-700">
                  {data.skills_missing_min_questions + data.skills_without_remediation + data.skills_without_retention}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-tajawal">حالة المهارات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.skills_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
                    {statusLabels[status] || status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={(count / totalSkillStatuses) * 100} className="w-32 h-2" />
                  <span className="text-sm font-medium w-8 text-left">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-tajawal">حالة الأسئلة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.questions_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
                    {statusLabels[status] || status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={(count / data.total_questions) * 100} className="w-32 h-2" />
                  <span className="text-sm font-medium w-8 text-left">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quality Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-tajawal flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            تنبيهات الجودة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QualityAlert
              label="مهارات تحتاج أسئلة إضافية"
              count={data.skills_missing_min_questions}
              icon={<FileQuestion className="w-5 h-5" />}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <QualityAlert
              label="مهارات تحتاج أسئلة بصرية"
              count={data.skills_missing_visual_questions}
              icon={<Eye className="w-5 h-5" />}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <QualityAlert
              label="مهارات بدون مسار علاجي"
              count={data.skills_without_remediation}
              icon={<Target className="w-5 h-5" />}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
            <QualityAlert
              label="مهارات بدون جدول مراجعة"
              count={data.skills_without_retention}
              icon={<RefreshCw className="w-5 h-5" />}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QualityAlert({ label, count, icon, color, bgColor }: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className={color}>{icon}</div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{count}</span>
    </div>
  );
}

function GapsSection({ data }: { data: GapsData }) {
  const [filter, setFilter] = useState<string>('all');

  const filteredGaps = filter === 'all' 
    ? data.gaps 
    : data.gaps.filter(g => g.gap_type === filter);

  const gapCounts = data.gaps.reduce((acc, gap) => {
    acc[gap.gap_type] = (acc[gap.gap_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Gap Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(gapTypeLabels).map(([type, label]) => {
          const Icon = gapTypeIcons[type] || AlertTriangle;
          const count = gapCounts[type] || 0;
          return (
            <Card 
              key={type} 
              className={`cursor-pointer transition-all ${filter === type ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
              onClick={() => setFilter(filter === type ? 'all' : type)}
            >
              <CardContent className="p-4 text-center">
                <Icon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gap List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-tajawal">
              الفجوات المكتشفة ({filteredGaps.length})
            </CardTitle>
            {filter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
                <XCircle className="w-4 h-4 ml-1" />
                إزالة الفلتر
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredGaps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
              <p>لا توجد فجوات في هذا التصنيف</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredGaps.map((gap, idx) => {
                const Icon = gapTypeIcons[gap.gap_type] || AlertTriangle;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="mt-1">
                      <Icon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{gap.skill_name}</span>
                        <Badge variant="outline" className="text-xs">{gap.grade}</Badge>
                        {gap.domain_name && (
                          <Badge variant="secondary" className="text-xs">{gap.domain_name}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{gap.details}</p>
                    </div>
                    <Badge className={`text-xs whitespace-nowrap ${
                      gap.gap_type === 'poor_performance' ? 'bg-red-100 text-red-700' :
                      gap.gap_type === 'missing_questions' ? 'bg-orange-100 text-orange-700' :
                      gap.gap_type === 'missing_remediation' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {gapTypeLabels[gap.gap_type]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CoverageSection({ data }: { data: CoverageData }) {
  // Group by grade
  const grades = [...new Set(data.coverage.map(c => c.grade))];

  return (
    <div className="space-y-6">
      {grades.map(grade => {
        const gradeItems = data.coverage.filter(c => c.grade === grade);
        const totalSkills = gradeItems.reduce((sum, i) => sum + i.total_skills, 0);
        const totalQuestions = gradeItems.reduce((sum, i) => sum + i.total_questions, 0);
        const avgApproved = gradeItems.length > 0 
          ? gradeItems.reduce((sum, i) => sum + i.approved_percentage, 0) / gradeItems.length 
          : 0;

        return (
          <Card key={grade}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-tajawal flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  {grade}
                </CardTitle>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>{totalSkills} مهارة</span>
                  <span>{totalQuestions} سؤال</span>
                  <Badge className={avgApproved > 70 ? 'bg-green-100 text-green-700' : avgApproved > 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                    {avgApproved.toFixed(0)}% معتمد
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gradeItems.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-800">{item.domain_name}</span>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{item.total_skills} مهارة</span>
                        <span>{item.total_questions} سؤال</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 w-16">معتمد</span>
                        <Progress value={item.approved_percentage} className="flex-1 h-3" />
                        <span className="text-xs font-medium w-10 text-left">{item.approved_percentage}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16">مسودة</span>
                        <Progress value={item.draft_percentage} className="flex-1 h-3 [&>div]:bg-gray-300" />
                        <span className="text-xs font-medium w-10 text-left">{item.draft_percentage}%</span>
                      </div>
                    </div>
                    {/* Questions per skill ratio */}
                    <div className="mt-2 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        معدل الأسئلة: {item.total_skills > 0 ? (item.total_questions / item.total_skills).toFixed(1) : 0} سؤال/مهارة
                      </span>
                      {item.total_skills > 0 && (item.total_questions / item.total_skills) < 3 && (
                        <Badge className="bg-red-100 text-red-600 text-xs">تحتاج أسئلة</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {data.coverage.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Layers className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-400 text-lg">لا توجد بيانات تغطية بعد</p>
            <p className="text-gray-300 text-sm mt-2">أضف مهارات وأسئلة للمنهج لرؤية التغطية</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}