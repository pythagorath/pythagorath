// Phase 5: Assessment Intelligence Dashboard
// CAT, Question Intelligence, Diagnostics, Misconceptions, Predictions, Portfolio

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  generateMockAssessmentData,
  type AssessmentStore,
  type QuestionQuality,
  type DiagnosticResult,
  type Misconception,
  type PerformancePrediction,
  type PortfolioEntry,
  calculateGrowth,
} from '@/lib/assessmentIntelligence';
import { ArrowRight, Brain, Target, AlertTriangle, TrendingUp, BookOpen, Award, BarChart3, Shield } from 'lucide-react';

type TabId = 'overview' | 'cat' | 'questions' | 'diagnostics' | 'misconceptions' | 'predictions' | 'portfolio' | 'rubrics';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'cat', label: 'اختبار تكيفي', icon: <Brain className="w-4 h-4" /> },
  { id: 'questions', label: 'جودة الأسئلة', icon: <Target className="w-4 h-4" /> },
  { id: 'diagnostics', label: 'التشخيص', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'misconceptions', label: 'المفاهيم الخاطئة', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'predictions', label: 'التنبؤ بالأداء', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'portfolio', label: 'ملف الإنجاز', icon: <Award className="w-4 h-4" /> },
  { id: 'rubrics', label: 'معايير التقييم', icon: <Shield className="w-4 h-4" /> },
];

export default function AssessmentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const data = useMemo(() => generateMockAssessmentData(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/40">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 font-tajawal">ذكاء التقييم</h1>
              <p className="text-xs text-slate-500">نظام التقييم التكيفي المتقدم</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[73px] z-20 bg-white/60 backdrop-blur-lg border-b border-slate-200/40 px-6">
        <div className="max-w-7xl mx-auto overflow-x-auto">
          <div className="flex gap-1 py-2 min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'cat' && <CATTab />}
        {activeTab === 'questions' && <QuestionsTab qualities={Object.values(data.questionQualities)} />}
        {activeTab === 'diagnostics' && <DiagnosticsTab results={data.diagnosticResults} />}
        {activeTab === 'misconceptions' && <MisconceptionsTab misconceptions={data.misconceptions} />}
        {activeTab === 'predictions' && <PredictionsTab predictions={data.predictions} />}
        {activeTab === 'portfolio' && <PortfolioTab entries={data.portfolioEntries} />}
        {activeTab === 'rubrics' && <RubricsTab />}
      </main>
    </div>
  );
}

// ============ Overview Tab ============
function OverviewTab({ data }: { data: AssessmentStore }) {
  const atRisk = data.predictions.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high').length;
  const weakQuestions = Object.values(data.questionQualities).filter(q => q.qualityScore < 40).length;
  const activeMisconceptions = data.misconceptions.filter(m => m.frequency > 30).length;
  const latestDiag = data.diagnosticResults[data.diagnosticResults.length - 1];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🎯" label="دقة التقييم" value="85%" color="indigo" />
        <StatCard icon="⚠️" label="طلاب في خطر" value={`${atRisk}`} color="red" />
        <StatCard icon="❓" label="أسئلة ضعيفة" value={`${weakQuestions}`} color="amber" />
        <StatCard icon="🧠" label="مفاهيم خاطئة نشطة" value={`${activeMisconceptions}`} color="purple" />
      </div>

      {/* Quick Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Latest Diagnostic */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            آخر تشخيص
          </h3>
          {latestDiag && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">المستوى العام</span>
                <span className="text-sm font-bold text-indigo-600">{latestDiag.placementLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">الثقة</span>
                <span className="text-sm font-medium text-slate-700">{latestDiag.confidence}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {latestDiag.strengths.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">{s}</span>
                ))}
                {latestDiag.weaknesses.map(w => (
                  <span key={w} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk Alerts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            تنبيهات استباقية
          </h3>
          <div className="space-y-3">
            {data.predictions.filter(p => p.alertType !== 'none').map((p, i) => (
              <div key={i} className={`p-3 rounded-xl border ${
                p.riskLevel === 'critical' ? 'bg-red-50 border-red-200' :
                p.riskLevel === 'high' ? 'bg-amber-50 border-amber-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-700">طالب {p.studentId.split('_')[1]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                    p.riskLevel === 'high' ? 'bg-amber-100 text-amber-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{p.alertType === 'urgent' ? 'عاجل' : p.alertType === 'intervene' ? 'تدخل' : 'مراقبة'}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{p.recommendations[0]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question Quality Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-500" />
          توزيع جودة الأسئلة
        </h3>
        <div className="flex gap-2 items-end h-32">
          {Object.values(data.questionQualities).map((q, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-lg transition-all ${
                  q.qualityScore >= 70 ? 'bg-green-400' :
                  q.qualityScore >= 50 ? 'bg-blue-400' :
                  q.qualityScore >= 30 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ height: `${Math.max(8, q.qualityScore)}%` }}
              />
              <span className="text-[10px] text-slate-400">س{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4 mt-3">
          <Legend color="bg-green-400" label="ممتاز" />
          <Legend color="bg-blue-400" label="جيد" />
          <Legend color="bg-amber-400" label="مقبول" />
          <Legend color="bg-red-400" label="ضعيف" />
        </div>
      </div>
    </div>
  );
}

// ============ CAT Tab ============
function CATTab() {
  const [catActive, setCatActive] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [ability, setAbility] = useState(0);
  const [responses, setResponses] = useState<Array<{ correct: boolean; ability: number }>>([]);

  const mockQuestions = [
    { text: 'ما ناتج 5 + 3؟', options: ['6', '7', '8', '9'], correct: 2, difficulty: -1 },
    { text: 'ما ناتج 12 - 7؟', options: ['4', '5', '6', '3'], correct: 1, difficulty: -0.5 },
    { text: 'ما ناتج 8 × 4؟', options: ['28', '32', '36', '24'], correct: 1, difficulty: 0.5 },
    { text: 'أكمل النمط: 2, 4, 8, 16, ___', options: ['24', '28', '32', '20'], correct: 2, difficulty: 1 },
    { text: 'ما قيمة الرقم 5 في العدد 352؟', options: ['5', '50', '500', '5000'], correct: 1, difficulty: 1.5 },
  ];

  const handleAnswer = (optionIdx: number) => {
    const q = mockQuestions[currentQ];
    const isCorrect = optionIdx === q.correct;
    const newAbility = ability + (isCorrect ? 0.4 : -0.3);
    setAbility(newAbility);
    setResponses([...responses, { correct: isCorrect, ability: newAbility }]);
    
    if (currentQ < mockQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setCatActive(false);
    }
  };

  if (!catActive && responses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">الاختبار التكيفي (CAT)</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            يختار النظام السؤال التالي بناءً على إجاباتك السابقة. كل سؤال يقيس قدرتك بدقة أكبر.
            يتوقف الاختبار عندما يصل لتقدير دقيق بأقل عدد من الأسئلة.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <div className="text-lg font-bold text-indigo-600">5-20</div>
              <div className="text-[10px] text-slate-500">سؤال كحد أقصى</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <div className="text-lg font-bold text-purple-600">IRT</div>
              <div className="text-[10px] text-slate-500">نموذج إحصائي</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="text-lg font-bold text-blue-600">±0.3</div>
              <div className="text-[10px] text-slate-500">دقة التقدير</div>
            </div>
          </div>
          <button
            onClick={() => setCatActive(true)}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200/40 hover:shadow-xl transition-all"
          >
            ابدأ الاختبار التكيفي
          </button>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="text-sm font-bold text-slate-700 mb-4">كيف يعمل الاختبار التكيفي؟</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'سؤال أولي', desc: 'يبدأ بسؤال متوسط الصعوبة' },
              { step: '2', title: 'تحليل الإجابة', desc: 'يحلل صحة الإجابة ووقت الاستجابة' },
              { step: '3', title: 'تحديث التقدير', desc: 'يعدّل تقدير القدرة بخوارزمية IRT' },
              { step: '4', title: 'اختيار ذكي', desc: 'يختار السؤال الأكثر إفادة تالياً' },
            ].map(item => (
              <div key={item.step} className="p-4 bg-slate-50 rounded-xl text-center">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold text-indigo-600">
                  {item.step}
                </div>
                <div className="text-xs font-bold text-slate-700">{item.title}</div>
                <div className="text-[10px] text-slate-500 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (catActive) {
    const q = mockQuestions[currentQ];
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500">السؤال {currentQ + 1} من {mockQuestions.length}</span>
            <span className="text-xs text-slate-500">الصعوبة: {q.difficulty > 0 ? 'مرتفعة' : q.difficulty < -0.5 ? 'منخفضة' : 'متوسطة'}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all" style={{ width: `${((currentQ + 1) / mockQuestions.length) * 100}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60">
          <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">{q.text}</h3>
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className="p-4 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-300 rounded-xl text-center font-medium text-slate-700 transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Ability Meter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500">تقدير القدرة الحالي</span>
            <span className="text-xs font-mono text-indigo-600">θ = {ability.toFixed(2)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-red-100" />
              <div className="flex-1 bg-amber-100" />
              <div className="flex-1 bg-green-100" />
              <div className="flex-1 bg-blue-100" />
            </div>
            <div
              className="absolute top-0 h-full w-3 bg-indigo-600 rounded-full shadow transition-all"
              style={{ right: `${((ability + 3) / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">اكتمل التقييم التكيفي</h2>
        <p className="text-sm text-slate-500 mb-6">تم تقدير قدرتك بـ {responses.length} أسئلة فقط</p>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-indigo-50 rounded-xl">
            <div className="text-lg font-bold text-indigo-600">{ability.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500">تقدير القدرة (θ)</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="text-lg font-bold text-green-600">{responses.filter(r => r.correct).length}/{responses.length}</div>
            <div className="text-[10px] text-slate-500">إجابات صحيحة</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="text-lg font-bold text-purple-600">{ability > 0.5 ? 'متقدم' : ability > -0.5 ? 'متوسط' : 'مبتدئ'}</div>
            <div className="text-[10px] text-slate-500">المستوى</div>
          </div>
        </div>

        {/* Ability progression chart */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-2">تطور تقدير القدرة</div>
          <div className="flex items-end gap-1 h-20 justify-center">
            {responses.map((r, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`w-6 rounded-t transition-all ${r.correct ? 'bg-green-400' : 'bg-red-300'}`}
                  style={{ height: `${Math.max(8, ((r.ability + 3) / 6) * 100)}%` }}
                />
                <span className="text-[9px] text-slate-400">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setResponses([]); setCurrentQ(0); setAbility(0); }}
          className="mt-6 px-6 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-medium hover:bg-indigo-200 transition-colors"
        >
          إعادة الاختبار
        </button>
      </div>
    </div>
  );
}

// ============ Questions Tab ============
function QuestionsTab({ qualities }: { qualities: QuestionQuality[] }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['ممتاز', 'جيد', 'مقبول', 'ضعيف', 'يحتاج مراجعة'] as const).map(label => {
          const count = qualities.filter(q => q.qualityLabel === label).length;
          const colors: Record<string, string> = {
            'ممتاز': 'bg-green-50 text-green-700 border-green-200',
            'جيد': 'bg-blue-50 text-blue-700 border-blue-200',
            'مقبول': 'bg-amber-50 text-amber-700 border-amber-200',
            'ضعيف': 'bg-orange-50 text-orange-700 border-orange-200',
            'يحتاج مراجعة': 'bg-red-50 text-red-700 border-red-200',
          };
          return (
            <div key={label} className={`p-3 rounded-xl border ${colors[label]}`}>
              <div className="text-xl font-bold">{count}</div>
              <div className="text-[10px]">{label}</div>
            </div>
          );
        })}
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">تحليل جودة الأسئلة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">السؤال</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">التمييزية</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">الصعوبة</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">التخمين</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">المحاولات</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">الجودة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">المشاكل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {qualities.map((q, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-700">سؤال {i + 1}</td>
                  <td className="px-4 py-3 text-center">
                    <MiniBar value={q.discrimination * 100} color={q.discrimination > 0.4 ? 'green' : q.discrimination > 0.2 ? 'amber' : 'red'} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <MiniBar value={q.difficulty * 100} color={q.difficulty > 0.4 && q.difficulty < 0.8 ? 'green' : 'amber'} />
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600">{(q.guessingFactor * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600">{q.totalAttempts}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      q.qualityScore >= 70 ? 'bg-green-100 text-green-700' :
                      q.qualityScore >= 50 ? 'bg-blue-100 text-blue-700' :
                      q.qualityScore >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>{q.qualityLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{q.issues.join('، ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ Diagnostics Tab ============
function DiagnosticsTab({ results }: { results: DiagnosticResult[] }) {
  return (
    <div className="space-y-6">
      {results.map((diag, idx) => (
        <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-700">
                {diag.type === 'initial' ? '📋 تشخيص أولي' : diag.type === 'continuous' ? '🔄 تشخيص مستمر' : '📊 تشخيص ختامي'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{new Date(diag.timestamp).toLocaleDateString('ar-SA')}</p>
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-indigo-600">{diag.placementLevel}</div>
              <div className="text-[10px] text-slate-500">ثقة: {diag.confidence}%</div>
            </div>
          </div>

          {/* Skill Levels */}
          <div className="space-y-2 mb-4">
            {Object.values(diag.skillLevels).map(skill => (
              <div key={skill.skillId} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-24">{skill.skillName}</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      skill.score >= 80 ? 'bg-green-400' :
                      skill.score >= 60 ? 'bg-blue-400' :
                      skill.score >= 40 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-500 w-10">{skill.score}%</span>
              </div>
            ))}
          </div>

          {/* Gaps */}
          {diag.gaps.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-xs font-bold text-amber-700 mb-2">فجوات مكتشفة</div>
              <div className="flex flex-wrap gap-2">
                {diag.gaps.map(gap => (
                  <span key={gap.skillId} className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                    gap.priority === 'critical' ? 'bg-red-100 text-red-700' :
                    gap.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {gap.skillName} (فجوة: {gap.gapSize})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ Misconceptions Tab ============
function MisconceptionsTab({ misconceptions }: { misconceptions: Misconception[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4">المفاهيم الخاطئة المكتشفة</h3>
        <div className="space-y-3">
          {misconceptions.map(mc => (
            <div key={mc.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === mc.id ? null : mc.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    mc.severity === 'severe' ? 'bg-red-400' :
                    mc.severity === 'moderate' ? 'bg-amber-400' : 'bg-yellow-400'
                  }`} />
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700">{mc.label}</div>
                    <div className="text-xs text-slate-500">{mc.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-600">{mc.frequency}%</div>
                    <div className="text-[10px] text-slate-400">تكرار</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    mc.severity === 'severe' ? 'bg-red-100 text-red-700' :
                    mc.severity === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{mc.severity === 'severe' ? 'شديد' : mc.severity === 'moderate' ? 'متوسط' : 'خفيف'}</span>
                </div>
              </button>

              {expanded === mc.id && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-600 mb-2">المؤشرات</div>
                      <ul className="space-y-1">
                        {mc.indicators.map((ind, i) => (
                          <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            {ind}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-600 mb-2">خطة العلاج ({mc.intervention.estimatedTime} دقيقة)</div>
                      <div className="text-xs text-indigo-600 mb-1">النوع: {mc.intervention.type}</div>
                      <ol className="space-y-1">
                        {mc.intervention.steps.map((step, i) => (
                          <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="text-indigo-400 font-bold">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Predictions Tab ============
function PredictionsTab({ predictions }: { predictions: PerformancePrediction[] }) {
  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-4 gap-3">
        {(['low', 'medium', 'high', 'critical'] as const).map(level => {
          const count = predictions.filter(p => p.riskLevel === level).length;
          const config = {
            low: { label: 'منخفض', color: 'bg-green-50 border-green-200 text-green-700', emoji: '✅' },
            medium: { label: 'متوسط', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', emoji: '⚡' },
            high: { label: 'مرتفع', color: 'bg-amber-50 border-amber-200 text-amber-700', emoji: '⚠️' },
            critical: { label: 'حرج', color: 'bg-red-50 border-red-200 text-red-700', emoji: '🚨' },
          }[level];
          return (
            <div key={level} className={`p-4 rounded-xl border ${config.color}`}>
              <div className="text-2xl mb-1">{config.emoji}</div>
              <div className="text-xl font-bold">{count}</div>
              <div className="text-[10px]">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Student Cards */}
      {predictions.map((pred, i) => (
        <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm border ${
          pred.riskLevel === 'critical' ? 'border-red-200' :
          pred.riskLevel === 'high' ? 'border-amber-200' : 'border-slate-200/60'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                pred.riskLevel === 'critical' ? 'bg-red-100' :
                pred.riskLevel === 'high' ? 'bg-amber-100' :
                pred.riskLevel === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                {pred.riskLevel === 'critical' ? '🚨' : pred.riskLevel === 'high' ? '⚠️' : pred.riskLevel === 'medium' ? '⚡' : '✅'}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700">طالب {pred.studentId.split('_')[1]}</div>
                <div className="text-xs text-slate-500">ثقة التنبؤ: {pred.confidence}%</div>
              </div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-slate-800">{pred.predictedScore}%</div>
              <div className="text-[10px] text-slate-500">الأداء المتوقع</div>
            </div>
          </div>

          {/* Risk Factors */}
          {pred.riskFactors.length > 0 && (
            <div className="space-y-2 mb-4">
              {pred.riskFactors.map((rf, j) => (
                <div key={j} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-600">{rf.factor}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{rf.description}</span>
                    <span className={`text-[10px] ${rf.trend === 'improving' ? 'text-green-600' : rf.trend === 'declining' ? 'text-red-600' : 'text-slate-500'}`}>
                      {rf.trend === 'improving' ? '↑' : rf.trend === 'declining' ? '↓' : '→'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {pred.recommendations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pred.recommendations.map((rec, j) => (
                <span key={j} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] rounded-lg">{rec}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ Portfolio Tab ============
function PortfolioTab({ entries }: { entries: PortfolioEntry[] }) {
  const growth = useMemo(() => calculateGrowth(entries), [entries]);
  const sorted = useMemo(() => [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [entries]);

  return (
    <div className="space-y-6">
      {/* Growth Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          ملخص النمو
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-center">
            <div className="text-lg font-bold text-slate-700">{growth.startLevel}%</div>
            <div className="text-[10px] text-slate-500">المستوى الأولي</div>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-center">
            <div className="text-lg font-bold text-green-600">{growth.currentLevel}%</div>
            <div className="text-[10px] text-slate-500">المستوى الحالي</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-center">
            <div className="text-lg font-bold text-indigo-600">+{growth.growthPercentage}%</div>
            <div className="text-[10px] text-slate-500">نسبة النمو</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-center">
            <div className="text-lg font-bold text-purple-600">{growth.consistencyScore}%</div>
            <div className="text-[10px] text-slate-500">الاتساق</div>
          </div>
        </div>
        <div className="mt-4 flex justify-between text-xs text-slate-500">
          <span>الفترة: {growth.timespan}</span>
          <span>أقوى مجال نمو: {growth.strongestGrowthArea}</span>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4">مسار النمو</h3>
        <div className="flex items-end gap-1 h-32">
          {entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((entry, i) => {
            const pct = (entry.score / entry.maxScore) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    entry.type === 'achievement' ? 'bg-purple-400' :
                    entry.type === 'milestone' ? 'bg-indigo-400' :
                    pct >= 70 ? 'bg-green-400' : pct >= 50 ? 'bg-blue-400' : 'bg-amber-400'
                  }`}
                  style={{ height: `${pct}%` }}
                  title={`${entry.title}: ${pct}%`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4">سجل الإنجازات</h3>
        <div className="space-y-3">
          {sorted.slice(0, 8).map((entry, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                entry.type === 'achievement' ? 'bg-purple-100' :
                entry.type === 'milestone' ? 'bg-indigo-100' :
                entry.type === 'diagnostic' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {entry.type === 'achievement' ? '🏆' : entry.type === 'milestone' ? '🎯' : entry.type === 'diagnostic' ? '📋' : '📝'}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-700">{entry.title}</div>
                <div className="text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleDateString('ar-SA')}</div>
              </div>
              <div className="text-sm font-bold text-slate-700">{entry.score}/{entry.maxScore}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Rubrics Tab ============
function RubricsTab() {
  const rubricCriteria = [
    { name: 'الفهم المفاهيمي', maxScore: 4, levels: ['لا يظهر فهماً', 'فهم جزئي', 'فهم جيد', 'فهم عميق'] },
    { name: 'تطبيق الإجراءات', maxScore: 4, levels: ['لا يطبق', 'تطبيق مع أخطاء', 'تطبيق صحيح', 'تطبيق مبدع'] },
    { name: 'حل المشكلات', maxScore: 4, levels: ['لا يحل', 'محاولة جزئية', 'حل صحيح', 'حل متعدد الطرق'] },
    { name: 'التواصل الرياضي', maxScore: 4, levels: ['لا يعبر', 'تعبير غير واضح', 'تعبير واضح', 'تعبير دقيق ومنظم'] },
  ];

  const [scores, setScores] = useState<number[]>([3, 2, 3, 1]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 mb-2">تقييم متعدد المعايير (Rubric)</h3>
        <p className="text-xs text-slate-500 mb-6">تقييم شامل لأداء الطالب عبر معايير متعددة مع تغذية راجعة مفصلة</p>

        <div className="space-y-4">
          {rubricCriteria.map((criterion, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-700">{criterion.name}</span>
                <span className="text-xs text-indigo-600 font-bold">{scores[idx]}/{criterion.maxScore}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {criterion.levels.map((level, li) => (
                  <button
                    key={li}
                    onClick={() => {
                      const newScores = [...scores];
                      newScores[idx] = li + 1;
                      setScores(newScores);
                    }}
                    className={`p-2 rounded-lg text-[10px] text-center transition-all border ${
                      scores[idx] === li + 1
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-medium'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">{li + 1}</div>
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-6 p-4 bg-indigo-50 rounded-xl flex justify-between items-center">
          <span className="text-sm font-bold text-indigo-700">المجموع الكلي</span>
          <div className="text-left">
            <span className="text-2xl font-bold text-indigo-600">{scores.reduce((s, v) => s + v, 0)}</span>
            <span className="text-sm text-indigo-400">/{rubricCriteria.length * 4}</span>
            <div className="text-[10px] text-indigo-500">
              ({Math.round((scores.reduce((s, v) => s + v, 0) / (rubricCriteria.length * 4)) * 100)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Template */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4">التغذية الراجعة المولّدة</h3>
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm text-slate-700 leading-relaxed">
            {scores[0] >= 3 ? 'أظهر الطالب فهماً مفاهيمياً جيداً. ' : 'يحتاج الطالب لتعزيز الفهم المفاهيمي. '}
            {scores[1] >= 3 ? 'يطبق الإجراءات بشكل صحيح. ' : 'يحتاج لمزيد من التدريب على الإجراءات. '}
            {scores[2] >= 3 ? 'قادر على حل المشكلات بفعالية. ' : 'يحتاج لتطوير مهارات حل المشكلات. '}
            {scores[3] >= 3 ? 'يتواصل رياضياً بوضوح.' : 'يحتاج لتحسين التعبير الرياضي.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ Utility Components ============
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const bgColors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200',
    red: 'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
  };
  return (
    <div className={`p-4 rounded-xl border ${bgColors[color] || bgColors.indigo}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  const bgColor = color === 'green' ? 'bg-green-400' : color === 'amber' ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bgColor}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-[10px] text-slate-500">{Math.round(value)}%</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}