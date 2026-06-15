import { useState, useEffect } from 'react';
import { client } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, AlertTriangle, BookOpen, Target, Loader2, TrendingUp, RefreshCw, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface Weakness {
  skill: string;
  severity: string;
  description: string;
  error_count: number;
}

interface Recommendation {
  type: string;
  id: number;
  title: string;
  reason: string;
}

interface AnalysisResult {
  has_data: boolean;
  message: string;
  total_wrong_answers: number;
  weaknesses: Weakness[];
  recommendations: Recommendation[];
  summary: string;
}

interface HistoryItem {
  id: number;
  total_wrong_answers: number;
  weaknesses_count: number;
  top_weakness: string;
  summary: string;
  created_at: string;
}

export default function AIAnalysis() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/ai-analysis/history',
        method: 'GET',
        data: { limit: 10 },
      });
      const data = response.data as { items: HistoryItem[]; total: number };
      setHistory(data.items || []);
    } catch {
      // History might be empty, that's fine
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // Demo mode - show sample data when not logged in
  const demoAnalysis: AnalysisResult = {
    has_data: true,
    message: '',
    total_wrong_answers: 8,
    weaknesses: [
      { skill: 'المعادلات الخطية', severity: 'high', description: 'صعوبة في حل المعادلات من الدرجة الأولى', error_count: 4 },
      { skill: 'النسب المئوية', severity: 'medium', description: 'أخطاء في تحويل النسب المئوية', error_count: 3 },
      { skill: 'الهندسة', severity: 'low', description: 'بعض الأخطاء في حساب المساحات', error_count: 1 },
    ],
    recommendations: [
      { type: 'lesson', id: 2, title: 'المعادلات الخطية', reason: 'مراجعة أساسيات حل المعادلات' },
      { type: 'quiz', id: 1, title: 'اختبار الجبر', reason: 'تدريب إضافي على المعادلات' },
      { type: 'lesson', id: 3, title: 'النسب والتناسب', reason: 'تعزيز فهم النسب المئوية' },
    ],
    summary: 'أداؤك جيد بشكل عام. تحتاج لمزيد من التدريب على المعادلات الخطية والنسب المئوية. ننصحك بمراجعة الدروس المقترحة ثم إعادة الاختبارات.',
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user) {
        // Demo mode - show sample analysis after a brief delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setAnalysis(demoAnalysis);
        setLoading(false);
        return;
      }
      const response = await client.apiCall.invoke({
        url: '/api/v1/ai-analysis/weaknesses',
        method: 'GET',
        data: {},
      });
      setAnalysis(response.data as AnalysisResult);
      // Refresh history after new analysis
      await fetchHistory();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء التحليل. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'مرتفع';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return severity;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  // Prepare chart data from history (reversed to show oldest first)
  const chartData = [...history].reverse().map((item, index) => ({
    name: formatDate(item.created_at) || `تحليل ${index + 1}`,
    'الأخطاء': item.total_wrong_answers,
    'نقاط الضعف': item.weaknesses_count,
  }));



  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تحليل نقاط الضعف بالذكاء الاصطناعي</h1>
              <p className="text-gray-500 text-sm">تحليل ذكي لأدائك واقتراحات مخصصة لتحسين مستواك</p>
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري التحليل...
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة التحليل
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 ml-2" />
                ابدأ التحليل
              </>
            )}
          </Button>
        </div>

        {/* Progress Chart - Show if there's history */}
        {!historyLoading && history.length >= 2 && (
          <Card className="border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <History className="w-5 h-5 text-indigo-500" />
                تتبع التقدم عبر الزمن
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ direction: 'rtl' }} />
                    <Line
                      type="monotone"
                      dataKey="الأخطاء"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="نقاط الضعف"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                انخفاض الأرقام يعني تحسن أدائك! استمر في المراجعة والتدريب.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Single history point message */}
        {!historyLoading && history.length === 1 && (
          <Card className="border-indigo-100 bg-indigo-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-500" />
              <p className="text-sm text-indigo-700">
                لديك تحليل واحد محفوظ. أجرِ تحليلاً آخر بعد حل المزيد من الاختبارات لمقارنة تقدمك!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* No Analysis Yet */}
        {!analysis && !loading && !error && (
          <Card className="border-dashed border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                <Brain className="w-10 h-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-700">اكتشف نقاط ضعفك</h3>
              <p className="text-gray-500 max-w-md">
                سيقوم الذكاء الاصطناعي بتحليل إجاباتك الخاطئة في الاختبارات وتحديد المهارات التي تحتاج لتحسينها، ثم يقترح دروساً واختبارات مخصصة لك.
              </p>
              <Button
                onClick={runAnalysis}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white mt-2"
              >
                <Brain className="w-5 h-5 ml-2" />
                ابدأ التحليل الآن
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="border-purple-200">
            <CardContent className="p-12 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <h3 className="text-lg font-bold text-gray-700">جاري تحليل أدائك...</h3>
              <p className="text-gray-500 text-sm">يقوم الذكاء الاصطناعي بمراجعة إجاباتك وتحديد نقاط الضعف</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysis && !loading && (
          <div className="space-y-6">
            {!analysis.has_data ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                  <AlertTriangle className="w-12 h-12 text-amber-500" />
                  <h3 className="text-lg font-bold text-gray-700">{analysis.message}</h3>
                  <p className="text-gray-500">أكمل بعض الاختبارات حتى يتمكن الذكاء الاصطناعي من تحليل أدائك.</p>
                  <Button variant="outline" className="mt-2" onClick={() => navigate('/dashboard')}>
                    الذهاب للوحة التحكم
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary */}
                <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                      <TrendingUp className="w-5 h-5" />
                      ملخص الأداء
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-gray-500">إجمالي الإجابات الخاطئة:</span>
                      <span className="text-sm font-bold text-red-600">{analysis.total_wrong_answers}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Weaknesses */}
                {analysis.weaknesses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-800">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        نقاط الضعف المحددة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysis.weaknesses.map((weakness, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-800">{weakness.skill}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(weakness.severity)}`}>
                                {getSeverityLabel(weakness.severity)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{weakness.description}</p>
                          </div>
                          <div className="text-center">
                            <span className="text-2xl font-bold text-red-500">{weakness.error_count}</span>
                            <p className="text-xs text-gray-400">أخطاء</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-800">
                        <Target className="w-5 h-5 text-green-500" />
                        توصيات مخصصة لك
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysis.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            rec.type === 'lesson' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {rec.type === 'lesson' ? (
                              <BookOpen className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Target className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-800">{rec.title}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                rec.type === 'lesson' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {rec.type === 'lesson' ? 'درس' : 'اختبار'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{rec.reason}</p>
                          </div>
                          {rec.type === 'quiz' && rec.id > 0 && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => navigate(`/quiz/${rec.id}`)}>
                              ابدأ
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* History Table */}
        {history.length > 0 && !loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <History className="w-5 h-5 text-gray-500" />
                سجل التحليلات السابقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-right p-3 font-medium text-gray-600">التاريخ</th>
                      <th className="text-right p-3 font-medium text-gray-600">الأخطاء</th>
                      <th className="text-right p-3 font-medium text-gray-600">نقاط الضعف</th>
                      <th className="text-right p-3 font-medium text-gray-600">أبرز ضعف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, index) => (
                      <tr key={item.id} className={`border-b ${index === 0 ? 'bg-purple-50/50' : ''}`}>
                        <td className="p-3 text-gray-700">{formatDate(item.created_at)}</td>
                        <td className="p-3">
                          <span className="font-bold text-red-600">{item.total_wrong_answers}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-amber-600">{item.weaknesses_count}</span>
                        </td>
                        <td className="p-3 text-gray-600">{item.top_weakness || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}