// Cognitive Progress Dashboard - Phase 4
// Shows cognitive skill mastery, modality profile, metacognition, load history, error patterns

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  loadCognitiveProfile,
  generateWeeklyChallenge,
  getModalityRecommendation,
  getInterventionMessage,
  type CognitiveProfile,
  type CognitiveSkillType,
  type RepresentationLevel,
} from '@/lib/cognitiveFramework';

const LEVEL_LABELS: Record<RepresentationLevel, { ar: string; color: string }> = {
  concrete: { ar: 'محسوس', color: 'bg-green-100 text-green-700' },
  pictorial: { ar: 'تصويري', color: 'bg-blue-100 text-blue-700' },
  abstract: { ar: 'مجرد', color: 'bg-purple-100 text-purple-700' },
};

const MODALITY_LABELS = {
  visual: { ar: 'بصري', icon: '👁️', color: 'text-blue-600' },
  auditory: { ar: 'سمعي', icon: '👂', color: 'text-green-600' },
  kinesthetic: { ar: 'حركي', icon: '✋', color: 'text-orange-600' },
};

type TabType = 'overview' | 'skills' | 'modality' | 'errors' | 'metacognition';

export default function CognitiveDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CognitiveProfile>(loadCognitiveProfile());
  const [tab, setTab] = useState<TabType>('overview');

  useEffect(() => {
    setProfile(loadCognitiveProfile());
  }, []);

  const avgMastery = Math.round(profile.skills.reduce((s, sk) => s + sk.mastery, 0) / profile.skills.length);
  const modalityRec = getModalityRecommendation(profile.modality);

  const handleGenerateChallenge = () => {
    generateWeeklyChallenge();
    setProfile(loadCognitiveProfile());
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: '📊' },
    { id: 'skills', label: 'المهارات', icon: '🧠' },
    { id: 'modality', label: 'أنماط التعلم', icon: '🎯' },
    { id: 'errors', label: 'أنماط الأخطاء', icon: '🔍' },
    { id: 'metacognition', label: 'ما وراء المعرفة', icon: '💭' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/student')} className="text-gray-600">
            → العودة
          </Button>
          <h1 className="text-xl font-bold text-slate-800">📈 التقدم المعرفي</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/cognitive-games')}>
            🎮 ألعاب
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center bg-gradient-to-br from-indigo-50 to-blue-50">
                <p className="text-3xl font-bold text-indigo-600">{avgMastery}%</p>
                <p className="text-sm text-gray-600">إتقان عام</p>
              </Card>
              <Card className="p-4 text-center bg-gradient-to-br from-emerald-50 to-green-50">
                <p className="text-3xl font-bold text-emerald-600">{profile.totalCognitiveXP}</p>
                <p className="text-sm text-gray-600">XP معرفي</p>
              </Card>
              <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-yellow-50">
                <p className="text-3xl font-bold text-orange-600">{profile.gamesPlayed}</p>
                <p className="text-sm text-gray-600">ألعاب مكتملة</p>
              </Card>
              <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50">
                <p className="text-3xl font-bold text-purple-600">
                  {MODALITY_LABELS[profile.modality.dominant].icon}
                </p>
                <p className="text-sm text-gray-600">نمط التعلم السائد</p>
              </Card>
            </div>

            {/* Skills Overview */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-3">المهارات المعرفية</h3>
              <div className="space-y-3">
                {profile.skills.map(skill => (
                  <div key={skill.id} className="flex items-center gap-3">
                    <span className="text-xl">{skill.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{skill.nameAr}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${LEVEL_LABELS[skill.currentLevel].color}`}>
                          {LEVEL_LABELS[skill.currentLevel].ar}
                        </span>
                      </div>
                      <Progress value={skill.mastery} className="h-2 mt-1" />
                    </div>
                    <span className="text-sm font-bold text-gray-600 w-10 text-left">{skill.mastery}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Weekly Challenge */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-2">🏆 التحدي الأسبوعي</h3>
              {profile.weeklyChallenge ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{profile.weeklyChallenge.descriptionAr}</p>
                  <Progress
                    value={(profile.weeklyChallenge.currentScore / profile.weeklyChallenge.targetScore) * 100}
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{profile.weeklyChallenge.currentScore}/{profile.weeklyChallenge.targetScore}</span>
                    <span>{profile.weeklyChallenge.completed ? '✅ مكتمل!' : 'جارٍ...'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-gray-500 mb-2">لا يوجد تحدي حالي</p>
                  <Button size="sm" onClick={handleGenerateChallenge}>إنشاء تحدي جديد</Button>
                </div>
              )}
            </Card>

            {/* Cognitive Load */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-2">⚡ الحمل المعرفي</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>الحمل الحالي</span>
                  <span className={profile.loadState.currentLoad > 70 ? 'text-red-600 font-bold' : 'text-green-600'}>
                    {Math.round(profile.loadState.currentLoad)}%
                  </span>
                </div>
                <Progress value={profile.loadState.currentLoad} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-xs text-center mt-2">
                  <div className="bg-red-50 rounded p-1">
                    <p className="font-bold text-red-600">{Math.round(profile.loadState.intrinsicLoad)}%</p>
                    <p className="text-gray-500">جوهري</p>
                  </div>
                  <div className="bg-yellow-50 rounded p-1">
                    <p className="font-bold text-yellow-600">{Math.round(profile.loadState.extraneousLoad)}%</p>
                    <p className="text-gray-500">خارجي</p>
                  </div>
                  <div className="bg-green-50 rounded p-1">
                    <p className="font-bold text-green-600">{Math.round(profile.loadState.germaneLoad)}%</p>
                    <p className="text-gray-500">تعلمي</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'skills' && (
          <div className="space-y-3">
            {profile.skills.map(skill => (
              <Card key={skill.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{skill.icon}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-gray-800">{skill.nameAr}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${LEVEL_LABELS[skill.currentLevel].color}`}>
                        {LEVEL_LABELS[skill.currentLevel].ar}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{skill.descriptionAr}</p>
                    <Progress value={skill.mastery} className="h-3" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>إتقان: {skill.mastery}%</span>
                      <span>محاولات: {skill.attempts}</span>
                      <span>تسلسل: {skill.streakDays} يوم</span>
                    </div>
                    {/* Progression path */}
                    <div className="flex items-center gap-1 mt-2">
                      {(['concrete', 'pictorial', 'abstract'] as RepresentationLevel[]).map((level, i) => (
                        <div key={level} className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            skill.currentLevel === level ? 'bg-indigo-600 text-white' :
                            (['concrete', 'pictorial', 'abstract'].indexOf(skill.currentLevel) > i)
                              ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {(['concrete', 'pictorial', 'abstract'].indexOf(skill.currentLevel) > i) ? '✓' : i + 1}
                          </div>
                          {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'modality' && (
          <div className="space-y-4">
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="text-center space-y-3">
                <span className="text-4xl">{MODALITY_LABELS[profile.modality.dominant].icon}</span>
                <h3 className="text-xl font-bold text-indigo-800">
                  نمط التعلم السائد: {MODALITY_LABELS[profile.modality.dominant].ar}
                </h3>
                <p className="text-sm text-indigo-600">{modalityRec.messageAr}</p>
              </div>
            </Card>

            {/* Modality Scores */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-3">توزيع أنماط التعلم</h3>
              <div className="space-y-3">
                {(Object.entries(MODALITY_LABELS) as [keyof typeof MODALITY_LABELS, typeof MODALITY_LABELS[keyof typeof MODALITY_LABELS]][]).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={`font-medium ${val.color}`}>{val.icon} {val.ar}</span>
                      <span className="text-gray-600">{profile.modality.scores[key]}%</span>
                    </div>
                    <Progress value={profile.modality.scores[key]} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Recommended Activities */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-3">🎯 أنشطة مقترحة لك</h3>
              <div className="grid grid-cols-2 gap-2">
                {modalityRec.preferredActivities.map((activity, i) => (
                  <div key={i} className="bg-indigo-50 rounded-lg p-3 text-center text-sm font-medium text-indigo-700">
                    {activity}
                  </div>
                ))}
              </div>
            </Card>

            {/* Detection History */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-2">📈 سجل الاكتشاف</h3>
              <p className="text-xs text-gray-500 mb-2">آخر {profile.modality.detectionHistory.length} إشارة</p>
              <div className="flex gap-1 flex-wrap">
                {profile.modality.detectionHistory.slice(-15).map((signal, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded ${
                      signal.modality === 'visual' ? 'bg-blue-100 text-blue-700' :
                      signal.modality === 'auditory' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {MODALITY_LABELS[signal.modality].icon} {signal.strength}
                  </span>
                ))}
                {profile.modality.detectionHistory.length === 0 && (
                  <p className="text-sm text-gray-400">العب ألعاب معرفية لاكتشاف نمط تعلمك</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === 'errors' && (
          <div className="space-y-4">
            {/* Error Summary */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-3">📊 ملخص أنماط الأخطاء</h3>
              {profile.errorIntelligence.patterns.length > 0 ? (
                <div className="space-y-3">
                  {profile.errorIntelligence.patterns
                    .filter(p => p.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map(pattern => (
                      <div key={pattern.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{getErrorLabel(pattern.category)}</span>
                          <span className="text-gray-600">{pattern.recentRate}%</span>
                        </div>
                        <Progress value={pattern.recentRate} className="h-2" />
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-4">لا توجد بيانات أخطاء بعد. العب المزيد من الألعاب!</p>
              )}
            </Card>

            {/* Dominant Error */}
            {profile.errorIntelligence.patterns.some(p => p.count > 0) && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="font-bold text-amber-800 mb-2">⚠️ النمط السائد</h3>
                <p className="text-sm text-amber-700">
                  {getInterventionMessage(profile.errorIntelligence.dominantCategory)}
                </p>
              </Card>
            )}

            {/* Improvement Trend */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-2">📈 اتجاه التحسن</h3>
              <div className="text-center py-3">
                <span className={`text-3xl font-bold ${
                  profile.errorIntelligence.improvementTrend > 0 ? 'text-green-600' :
                  profile.errorIntelligence.improvementTrend < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {profile.errorIntelligence.improvementTrend > 0 ? '↗️' : profile.errorIntelligence.improvementTrend < 0 ? '↘️' : '→'}
                  {' '}{Math.abs(profile.errorIntelligence.improvementTrend)}%
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  {profile.errorIntelligence.improvementTrend > 0 ? 'أخطاؤك تتناقص! أحسنت' :
                   profile.errorIntelligence.improvementTrend < 0 ? 'تحتاج مزيد من التمرين' : 'مستقر'}
                </p>
              </div>
            </Card>

            {/* Interventions History */}
            {profile.errorIntelligence.interventions.length > 0 && (
              <Card className="p-4">
                <h3 className="font-bold text-gray-800 mb-2">🛠️ التدخلات المقترحة</h3>
                <div className="space-y-2">
                  {profile.errorIntelligence.interventions.slice(-5).reverse().map((intv, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg p-2">
                      <span>{getInterventionIcon(intv.type)}</span>
                      <span className="flex-1 text-gray-700">{intv.reason}</span>
                      <span className={intv.effective ? 'text-green-600' : 'text-gray-400'}>
                        {intv.effective ? '✓' : '•'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'metacognition' && (
          <div className="space-y-4">
            {/* Self-Assessment Accuracy */}
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="text-center space-y-2">
                <span className="text-3xl">💭</span>
                <h3 className="font-bold text-purple-800">دقة التقييم الذاتي</h3>
                <p className="text-4xl font-bold text-purple-600">{profile.metacognition.selfAssessmentAccuracy}%</p>
                <p className="text-sm text-purple-500">
                  {profile.metacognition.selfAssessmentAccuracy > 70 ? 'أنت تعرف نفسك جيداً!' :
                   profile.metacognition.selfAssessmentAccuracy > 40 ? 'تتحسن في معرفة قدراتك' :
                   'تحتاج تمرين أكثر على تقييم نفسك'}
                </p>
              </div>
            </Card>

            {/* Metacognitive Skills */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-3">مهارات ما وراء المعرفة</h3>
              <div className="space-y-3">
                {[
                  { label: 'التخطيط', value: profile.metacognition.planningSkill, icon: '📋' },
                  { label: 'المراقبة', value: profile.metacognition.monitoringSkill, icon: '👀' },
                  { label: 'التقييم', value: profile.metacognition.evaluationSkill, icon: '⚖️' },
                  { label: 'وعي الاستراتيجيات', value: profile.metacognition.strategyAwareness, icon: '🎯' },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.icon} {item.label}</span>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Reflections */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-2">📝 التأملات الأخيرة</h3>
              {profile.metacognition.recentReflections.length > 0 ? (
                <div className="space-y-2">
                  {profile.metacognition.recentReflections.slice(-5).reverse().map((ref, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                      <p className="text-gray-500 text-xs mb-1">{ref.questionAr}</p>
                      <p className="text-gray-700">{ref.responseAr}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-4">لم تقم بأي تأملات بعد. ستظهر هنا بعد جلسات التعلم</p>
              )}
            </Card>

            {/* Scaffolding Status */}
            <Card className="p-4">
              <h3 className="font-bold text-gray-800 mb-2">🪜 مستوى الدعم</h3>
              <div className="flex items-center gap-2 justify-center py-3">
                {(['full_support', 'guided', 'hints_only', 'independent'] as const).map((level, i) => (
                  <div key={level} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      profile.scaffold.currentLevel === level
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {['🤝', '👆', '💡', '🌟'][i]}
                    </div>
                    {i < 3 && <div className="w-4 h-0.5 bg-gray-200" />}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-gray-600">
                {profile.scaffold.currentLevel === 'full_support' && 'دعم كامل - نساعدك في كل خطوة'}
                {profile.scaffold.currentLevel === 'guided' && 'موجّه - نرشدك عند الحاجة'}
                {profile.scaffold.currentLevel === 'hints_only' && 'تلميحات فقط - أنت تقود!'}
                {profile.scaffold.currentLevel === 'independent' && 'مستقل - أنت بطل! 🌟'}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getErrorLabel(category: string): string {
  const labels: Record<string, string> = {
    careless: '⚡ أخطاء سهو',
    misconception: '❓ سوء فهم',
    procedural: '🔄 خطأ إجرائي',
    conceptual: '💡 خطأ مفاهيمي',
    attention: '👁️ نقص انتباه',
  };
  return labels[category] || category;
}

function getInterventionIcon(type: string): string {
  const icons: Record<string, string> = {
    reteach: '📚',
    practice: '🔄',
    visual_aid: '🎨',
    slow_down: '🐢',
    break: '☕',
    simplify: '✂️',
  };
  return icons[type] || '🛠️';
}