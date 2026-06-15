import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateEnhancedMastery,
  calculateAcademicScore,
  generateRecommendations,
  runDiagnostic,
  getMasteryLabel,
  getRecommendedDifficulty,
  calculateTrend,
  getSkillHistory,
  saveSkillHistory,
  type Recommendation,
  type DiagnosticResult,
} from '@/lib/skillMastery';
import {
  skills,
  domains,
  getAllSkillsWithPrereqs,
  getInitialProgress,
  getDemoProgress,
  type Skill,
  type StudentSkillProgress,
} from '@/data/mathSkillsData';
import { getPrerequisites, getDependents, isSkillReady } from '@/data/skillPrerequisites';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, TrendingDown, Minus, Target, Brain, ArrowLeft, Lightbulb, Lock, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SkillsMap() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [progressList, setProgressList] = useState<StudentSkillProgress[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<1 | 2>(1);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);

  const allSkills = useMemo(() => getAllSkillsWithPrereqs(), []);
  const allDomains = useMemo(() => {
    return selectedGrade === 1 ? domains.grade1 : domains.grade2;
  }, [selectedGrade]);

  useEffect(() => {
    if (!authLoading) {
      loadProgress();
    }
  }, [authLoading]);

  const loadProgress = () => {
    try {
      setLoading(true);
      // Load from localStorage or use demo data
      const stored = localStorage.getItem('student_skill_progress');
      if (stored) {
        setProgressList(JSON.parse(stored));
      } else {
        // Use demo progress for demonstration
        setProgressList(getDemoProgress());
      }
    } catch {
      setProgressList(getDemoProgress());
    } finally {
      setLoading(false);
    }
  };

  // Compute mastery for each skill
  const masteryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of progressList) {
      map.set(p.skillId, calculateEnhancedMastery(p));
    }
    return map;
  }, [progressList]);

  // Mastered skills set
  const masteredSet = useMemo(() => {
    return new Set(
      progressList.filter(p => calculateEnhancedMastery(p) >= 85).map(p => p.skillId)
    );
  }, [progressList]);

  // Academic score
  const academicScore = useMemo(() => calculateAcademicScore(progressList), [progressList]);

  // Recommendations
  const recommendations = useMemo(() => {
    return generateRecommendations(progressList, allSkills.map(s => ({ id: s.id, name: s.name })));
  }, [progressList, allSkills]);

  // Filter skills by grade and domain
  const filteredSkills = useMemo(() => {
    let filtered = allSkills.filter(s => s.grade === selectedGrade);
    if (selectedDomain) {
      filtered = filtered.filter(s => s.domain === selectedDomain);
    }
    return filtered;
  }, [allSkills, selectedGrade, selectedDomain]);

  // Stats
  const stats = useMemo(() => {
    const gradeSkills = allSkills.filter(s => s.grade === selectedGrade);
    const mastered = gradeSkills.filter(s => (masteryMap.get(s.id) || 0) >= 85).length;
    const inProgress = gradeSkills.filter(s => {
      const m = masteryMap.get(s.id) || 0;
      return m > 0 && m < 85;
    }).length;
    const notStarted = gradeSkills.length - mastered - inProgress;
    return { total: gradeSkills.length, mastered, inProgress, notStarted };
  }, [allSkills, selectedGrade, masteryMap]);

  const getSkillColor = (skillId: string) => {
    const mastery = masteryMap.get(skillId) || 0;
    if (mastery >= 85) return 'bg-green-100 border-green-400 text-green-800';
    if (mastery >= 70) return 'bg-blue-100 border-blue-400 text-blue-800';
    if (mastery >= 40) return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    if (mastery > 0) return 'bg-red-100 border-red-400 text-red-800';
    // Check if ready (prerequisites met)
    if (isSkillReady(skillId, masteredSet)) return 'bg-gray-50 border-gray-300 text-gray-700';
    return 'bg-gray-100 border-gray-200 text-gray-400';
  };

  const getSkillIcon = (skillId: string) => {
    const mastery = masteryMap.get(skillId) || 0;
    if (mastery >= 85) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (mastery > 0 && mastery < 40) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (!isSkillReady(skillId, masteredSet)) return <Lock className="w-4 h-4 text-gray-400" />;
    return <Target className="w-4 h-4 text-blue-500" />;
  };

  const handleSkillClick = (skillId: string) => {
    setSelectedSkill(skillId === selectedSkill ? null : skillId);
    setDiagnosticResult(null);
  };

  const handleDiagnose = (skillId: string) => {
    const result = runDiagnostic(
      skillId,
      progressList,
      allSkills.map(s => ({ id: s.id, name: s.name }))
    );
    setDiagnosticResult(result);
  };

  const handlePractice = (skillId: string) => {
    navigate(`/quiz?skill=${skillId}`);
  };

  const getTrendIcon = (progress: StudentSkillProgress) => {
    const trend = calculateTrend(progress.history || []);
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">خريطة المهارات</h1>
              <p className="text-gray-500 text-sm">تتبع إتقانك لكل مهارة مع شجرة المتطلبات</p>
            </div>
          </div>
          {!user && (
            <Button onClick={() => navigate('/login')} size="sm">
              تسجيل الدخول لحفظ التقدم
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-3xl font-bold text-blue-600">{academicScore}%</div>
              <p className="text-xs text-gray-500 mt-1">الدرجة الأكاديمية</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-3xl font-bold text-green-600">{stats.mastered}</div>
              <p className="text-xs text-gray-500 mt-1">مهارة متقنة</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
              <p className="text-xs text-gray-500 mt-1">قيد التطوير</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-3xl font-bold text-gray-400">{stats.notStarted}</div>
              <p className="text-xs text-gray-500 mt-1">لم تبدأ</p>
            </CardContent>
          </Card>
        </div>

        {/* Grade & Domain Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant={selectedGrade === 1 ? 'default' : 'outline'}
              onClick={() => { setSelectedGrade(1); setSelectedDomain(null); }}
            >
              الصف الأول
            </Button>
            <Button
              size="sm"
              variant={selectedGrade === 2 ? 'default' : 'outline'}
              onClick={() => { setSelectedGrade(2); setSelectedDomain(null); }}
            >
              الصف الثاني
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge
              className={`cursor-pointer ${!selectedDomain ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => setSelectedDomain(null)}
            >
              الكل
            </Badge>
            {allDomains.map(domain => (
              <Badge
                key={domain}
                className={`cursor-pointer ${selectedDomain === domain ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setSelectedDomain(domain)}
              >
                {domain}
              </Badge>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSkills.map(skill => {
            const mastery = masteryMap.get(skill.id) || 0;
            const progress = progressList.find(p => p.skillId === skill.id);
            const ready = isSkillReady(skill.id, masteredSet);
            const isSelected = selectedSkill === skill.id;

            return (
              <Card
                key={skill.id}
                className={`cursor-pointer transition-all border-2 ${getSkillColor(skill.id)} ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
                onClick={() => handleSkillClick(skill.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSkillIcon(skill.id)}
                      <div>
                        <h3 className="font-semibold text-sm">{skill.name}</h3>
                        <p className="text-xs opacity-70">{skill.domain}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {progress && getTrendIcon(progress)}
                      <span className="text-sm font-bold">{mastery}%</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={mastery} className="h-2" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs opacity-60">{getMasteryLabel(mastery)}</span>
                      {!ready && mastery === 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> يحتاج متطلبات
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
                      {/* Prerequisites */}
                      {skill.prerequisites.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1">المتطلبات السابقة:</p>
                          <div className="flex flex-wrap gap-1">
                            {skill.prerequisites.map(prereqId => {
                              const prereqSkill = allSkills.find(s => s.id === prereqId);
                              const prereqMastery = masteryMap.get(prereqId) || 0;
                              return (
                                <Badge
                                  key={prereqId}
                                  className={`text-xs ${prereqMastery >= 85 ? 'bg-green-200 text-green-800' : prereqMastery > 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}
                                >
                                  {prereqSkill?.name || prereqId} ({prereqMastery}%)
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Progress details */}
                      {progress && progress.attempts > 0 && (
                        <div className="text-xs space-y-1">
                          <p>المحاولات: {progress.attempts} | الصحيح: {progress.correctCount}</p>
                          <p>الصعوبة المقترحة: {getRecommendedDifficulty(progress) === 'easy' ? 'سهل' : getRecommendedDifficulty(progress) === 'medium' ? 'متوسط' : 'صعب'}</p>
                          {progress.consecutiveCorrect > 0 && (
                            <p className="text-green-600">🔥 سلسلة صحيحة: {progress.consecutiveCorrect}</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-2">
                        {ready && (
                          <Button size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handlePractice(skill.id); }}>
                            <Zap className="w-3 h-3 ml-1" /> تدريب
                          </Button>
                        )}
                        {mastery > 0 && mastery < 70 && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handleDiagnose(skill.id); }}>
                            <Brain className="w-3 h-3 ml-1" /> تشخيص
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Diagnostic Result */}
        {diagnosticResult && (
          <Card className="border-2 border-purple-300 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                نتيجة التشخيص: {diagnosticResult.failedSkillName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-purple-800">{diagnosticResult.explanation}</p>
              
              {diagnosticResult.rootCauses.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-purple-700 mb-1">الأسباب الجذرية:</p>
                  <div className="flex flex-wrap gap-2">
                    {diagnosticResult.rootCauses.map(rc => (
                      <Badge key={rc.skillId} className="bg-red-100 text-red-700">
                        {rc.skillName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {diagnosticResult.suggestedPath.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-purple-700 mb-1">المسار المقترح:</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {diagnosticResult.suggestedPath.map((step, i) => (
                      <span key={step.skillId} className="flex items-center gap-1">
                        <Badge
                          className="bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200"
                          onClick={() => handlePractice(step.skillId)}
                        >
                          {i + 1}. {step.skillName}
                        </Badge>
                        {i < diagnosticResult.suggestedPath.length - 1 && <span className="text-purple-400">←</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button size="sm" variant="outline" onClick={() => setDiagnosticResult(null)}>
                إغلاق
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                التوصيات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recommendations.slice(0, 5).map((rec, i) => (
                  <div
                    key={`${rec.skillId}-${i}`}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      rec.type === 'prerequisite' ? 'border-red-200 bg-red-50' :
                      rec.type === 'practice' ? 'border-amber-200 bg-amber-50' :
                      rec.type === 'review' ? 'border-orange-200 bg-orange-50' :
                      'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        rec.type === 'prerequisite' ? 'bg-red-100 text-red-700' :
                        rec.type === 'practice' ? 'bg-amber-100 text-amber-700' :
                        rec.type === 'review' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {rec.type === 'prerequisite' ? 'متطلب' :
                         rec.type === 'practice' ? 'تدريب' :
                         rec.type === 'review' ? 'مراجعة' : 'تقدم'}
                      </Badge>
                      <span className="text-sm">{rec.message}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => handlePractice(rec.skillId)}>
                      ابدأ
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}