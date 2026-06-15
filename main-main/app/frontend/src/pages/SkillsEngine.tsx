import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Trophy, Star, Zap, TrendingUp } from 'lucide-react';
import { skills, domains, getDemoProgress, type StudentSkillProgress } from '@/data/mathSkillsData';
import {
  calculateMastery,
  calculateOverallMastery,
  getStrongestSkills,
  getWeakestSkills,
  getRecommendedSkill,
} from '@/lib/masteryEngine';

export default function SkillsEngine() {
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState<1 | 2>(1);
  const [progress, setProgress] = useState<StudentSkillProgress[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('skillsEngineProgress');
    if (saved) {
      setProgress(JSON.parse(saved));
    } else {
      const demo = getDemoProgress();
      setProgress(demo);
      localStorage.setItem('skillsEngineProgress', JSON.stringify(demo));
    }
  }, []);

  const gradeSkills = skills.filter(s => s.grade === selectedGrade);
  const gradeProgress = progress.filter(p =>
    gradeSkills.some(s => s.id === p.skillId)
  );

  const overallMastery = calculateOverallMastery(gradeProgress);
  const masteredCount = gradeProgress.filter(p => p.status === 'mastered').length;
  const recommended = getRecommendedSkill(gradeProgress);
  const strongest = getStrongestSkills(gradeProgress, 2);
  const weakest = getWeakestSkills(gradeProgress, 2);

  const currentDomains = selectedGrade === 1 ? domains.grade1 : domains.grade2;

  const getDomainProgress = (domain: string) => {
    const domainSkills = gradeSkills.filter(s => s.domain === domain);
    const domainProgress = progress.filter(p =>
      domainSkills.some(s => s.id === p.skillId)
    );
    const started = domainProgress.filter(p => p.attempts > 0);
    if (started.length === 0) return 0;
    const total = started.reduce((sum, p) => sum + calculateMastery(p).percentage, 0);
    return Math.round(total / domainSkills.length);
  };

  const getDomainSkillCount = (domain: string) =>
    gradeSkills.filter(s => s.domain === domain).length;

  const getDomainEmoji = (domain: string): string => {
    if (domain.includes('عداد') || domain.includes('عد')) return '🔢';
    if (domain.includes('جمع') || domain.includes('طرح')) return '➕';
    if (domain.includes('هندس') || domain.includes('أشكال')) return '🔷';
    if (domain.includes('قياس')) return '📏';
    if (domain.includes('وقت') || domain.includes('نقود')) return '🕐';
    if (domain.includes('أنماط') || domain.includes('جبر')) return '🔄';
    if (domain.includes('بيانات') || domain.includes('إحصاء')) return '📊';
    if (domain.includes('ضرب') || domain.includes('قسمة')) return '✖️';
    if (domain.includes('كسور')) return '🥧';
    return '📚';
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Brain className="w-7 h-7 text-purple-600" />
            تدريب المهارات
          </h1>
          <p className="text-gray-500 mt-1">اختر مجالاً وابدأ التدريب</p>
        </div>

        {/* Grade Toggle */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={selectedGrade === 1 ? 'default' : 'outline'}
            onClick={() => setSelectedGrade(1)}
            className="rounded-xl px-6 h-11 text-base"
          >
            الصف الأول
          </Button>
          <Button
            variant={selectedGrade === 2 ? 'default' : 'outline'}
            onClick={() => setSelectedGrade(2)}
            className="rounded-xl px-6 h-11 text-base"
          >
            الصف الثاني
          </Button>
        </div>

        {/* Overall Progress - simple */}
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-purple-800">الإتقان العام</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  <Trophy className="w-3 h-3 ml-1" />
                  {masteredCount} متقنة
                </Badge>
                <span className="text-lg font-bold text-purple-700">{overallMastery}%</span>
              </div>
            </div>
            <Progress value={overallMastery} className="h-3 bg-purple-100" />
          </CardContent>
        </Card>

        {/* Recommended Skill - simple CTA */}
        {recommended && (
          <Card className="border-0 shadow-md bg-gradient-to-l from-amber-400 to-orange-500 text-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-xs mb-1">⭐ توصية اليوم</p>
                <h3 className="font-bold text-lg">
                  {skills.find(s => s.id === recommended.skillId)?.name}
                </h3>
              </div>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-xl h-12 px-6"
                onClick={() => navigate(`/skills-engine/diagnostic?grade=${selectedGrade}&semester=1&skill=${recommended.skillId}`)}
              >
                <Zap className="w-4 h-4 ml-1" />
                ابدأ
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Domain Cards - simple grid */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">المجالات</h2>
          {currentDomains.map(domain => {
            const domainProgress = getDomainProgress(domain);
            const skillCount = getDomainSkillCount(domain);
            const emoji = getDomainEmoji(domain);

            return (
              <Card
                key={domain}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/skills-engine/diagnostic?grade=${selectedGrade}&semester=1&domain=${encodeURIComponent(domain)}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base">{domain}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={domainProgress} className="h-2 flex-1" />
                      <span className="text-xs text-gray-500 shrink-0">{domainProgress}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{skillCount} مهارة</p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl bg-primary hover:bg-primary/90 text-white shrink-0"
                    onClick={(e) => { e.stopPropagation(); navigate(`/skills-engine/diagnostic?grade=${selectedGrade}&semester=1&domain=${encodeURIComponent(domain)}`); }}
                  >
                    تدريب
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Report - minimal */}
        {(strongest.length > 0 || weakest.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {strongest.length > 0 && (
              <Card className="border-0 shadow-sm bg-green-50">
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3" /> نقاط القوة
                  </h4>
                  {strongest.map(p => {
                    const skill = skills.find(s => s.id === p.skillId);
                    return (
                      <p key={p.skillId} className="text-sm text-green-800 truncate">
                        ✅ {skill?.name}
                      </p>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            {weakest.length > 0 && (
              <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> تحتاج تدريب
                  </h4>
                  {weakest.map(p => {
                    const skill = skills.find(s => s.id === p.skillId);
                    return (
                      <p key={p.skillId} className="text-sm text-red-800 truncate">
                        💪 {skill?.name}
                      </p>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}