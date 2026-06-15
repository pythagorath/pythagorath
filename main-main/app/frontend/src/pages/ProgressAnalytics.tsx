// Progress Analytics - Visual progress display for students
// Shows mastery, achievements, retention health, weekly progress
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trophy, Target, Brain, Flame, Clock, Star, TrendingUp, Shield, Zap, BookOpen, RotateCcw } from 'lucide-react';
import {
  calculateProgressData,
  type ProgressData,
  type SkillProgress,
  type Achievement,
} from '@/lib/adaptiveService';
import { loadLearnerProfile } from '@/lib/personalizationEngine';

export default function ProgressAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProgressData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'achievements'>('overview');

  useEffect(() => {
    const profile = loadLearnerProfile();
    const progress = calculateProgressData(profile);
    setData(progress);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center" dir="rtl">
        <div className="animate-pulse text-blue-600 text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/learn')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="font-medium">العودة</span>
          </button>
          <h1 className="text-lg font-bold text-slate-800">تقدمي 📊</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Star className="w-5 h-5 text-amber-500" />} label="XP" value={data.totalXP.toLocaleString()} color="amber" />
          <StatCard icon={<Flame className="w-5 h-5 text-orange-500" />} label="أيام متتالية" value={String(data.streakDays)} color="orange" />
          <StatCard icon={<Target className="w-5 h-5 text-blue-500" />} label="الدقة" value={`${data.avgAccuracy}%`} color="blue" />
          <StatCard icon={<Brain className="w-5 h-5 text-purple-500" />} label="الإتقان" value={`${data.overallMastery}%`} color="purple" />
        </div>

        {/* Mastery Ring */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">مستوى الإتقان الكلي</h2>
            <span className="text-sm text-slate-500">{data.totalSessions} جلسة</span>
          </div>
          <div className="flex items-center gap-6">
            <MasteryRing percentage={data.overallMastery} />
            <div className="flex-1 space-y-3">
              <ProgressBar label="متقنة" count={data.masteredSkills} total={data.totalSkills} color="bg-emerald-500" />
              <ProgressBar label="قيد التعلم" count={data.learningSkills} total={data.totalSkills} color="bg-blue-500" />
              <ProgressBar label="تحتاج تقوية" count={data.weakSkills} total={data.totalSkills} color="bg-amber-500" />
            </div>
          </div>
        </div>

        {/* Retention Health */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-slate-800">صحة الذاكرة</h3>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              data.retentionHealth >= 80 ? 'bg-green-100 text-green-700' :
              data.retentionHealth >= 50 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {data.retentionHealth}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                data.retentionHealth >= 80 ? 'bg-gradient-to-l from-green-400 to-emerald-500' :
                data.retentionHealth >= 50 ? 'bg-gradient-to-l from-amber-400 to-yellow-500' :
                'bg-gradient-to-l from-red-400 to-orange-500'
              }`}
              style={{ width: `${data.retentionHealth}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {data.retentionHealth >= 80
              ? '✅ ذاكرتك ممتازة! المهارات مثبتة جيداً'
              : data.retentionHealth >= 50
              ? '⚠️ بعض المهارات تحتاج مراجعة'
              : '🔄 حان وقت المراجعة لتثبيت المعلومات'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-blue-100">
          {(['overview', 'skills', 'achievements'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'overview' ? '📈 نظرة عامة' : tab === 'skills' ? '🎯 المهارات' : '🏆 الإنجازات'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'skills' && <SkillsTab skills={data.skillBreakdown} />}
        {activeTab === 'achievements' && <AchievementsTab achievements={data.achievements} />}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bgMap: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200',
    orange: 'bg-orange-50 border-orange-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`rounded-xl p-3 border ${bgMap[color] || 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function MasteryRing({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 80 ? '#10b981' : percentage >= 50 ? '#3b82f6' : '#f59e0b';

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-slate-800">{percentage}%</span>
      </div>
    </div>
  );
}

function ProgressBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span>{count}/{total}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: ProgressData }) {
  return (
    <div className="space-y-4">
      {/* Weekly Progress */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          تقدم الأسبوع
        </h3>
        <div className="flex items-end gap-2 h-32">
          {data.weeklyProgress.map((point, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end h-24">
                <div
                  className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${
                    point.sessions > 0 ? 'bg-gradient-to-t from-blue-500 to-blue-400' : 'bg-slate-100'
                  }`}
                  style={{ height: `${Math.max(8, point.mastery)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">{point.day.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">متوسط الجلسة</span>
          </div>
          <div className="text-lg font-bold text-slate-800">
            {Math.floor(data.avgSessionDuration / 60)} دقيقة
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">إجمالي الجلسات</span>
          </div>
          <div className="text-lg font-bold text-slate-800">{data.totalSessions}</div>
        </div>
      </div>
    </div>
  );
}

function SkillsTab({ skills }: { skills: SkillProgress[] }) {
  const statusConfig = {
    mastered: { label: 'متقنة', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
    learning: { label: 'قيد التعلم', color: 'text-blue-600', bg: 'bg-blue-50', icon: '📖' },
    weak: { label: 'تحتاج تقوية', color: 'text-amber-600', bg: 'bg-amber-50', icon: '💪' },
    new: { label: 'جديدة', color: 'text-slate-500', bg: 'bg-slate-50', icon: '🆕' },
  };

  if (skills.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-100 text-center">
        <Zap className="w-12 h-12 text-blue-300 mx-auto mb-3" />
        <p className="text-slate-600">ابدأ التعلم لتظهر مهاراتك هنا!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {skills.map((skill, i) => {
        const config = statusConfig[skill.status];
        return (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span className="font-medium text-slate-800">{skill.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  skill.status === 'mastered' ? 'bg-emerald-500' :
                  skill.status === 'learning' ? 'bg-blue-500' :
                  skill.status === 'weak' ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                style={{ width: `${skill.mastery}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-400">
                {skill.lastPracticed ? `آخر تدريب: ${new Date(skill.lastPracticed).toLocaleDateString('ar')}` : 'لم يُتدرب بعد'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">{Math.round(skill.mastery)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementsTab({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

  return (
    <div className="space-y-4">
      {earned.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            إنجازاتي ({earned.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {earned.map(a => (
              <div key={a.id} className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200">
                <div className="text-2xl mb-1">{a.emoji}</div>
                <div className="text-sm font-bold text-slate-800">{a.title}</div>
                <div className="text-[10px] text-slate-500">{a.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-500 mb-2">🔒 قادمة ({locked.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {locked.map(a => (
              <div key={a.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 opacity-60">
                <div className="text-2xl mb-1 grayscale">{a.emoji}</div>
                <div className="text-sm font-medium text-slate-600">{a.title}</div>
                <div className="text-[10px] text-slate-400">{a.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}