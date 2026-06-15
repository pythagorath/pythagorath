// Internal Educational Operating System - Unified Hub
// Central command center for all educational operations
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, Brain, ClipboardCheck, Shield, BarChart3,
  Layers, Zap, TrendingUp, AlertTriangle, CheckCircle2, Clock, Target
} from 'lucide-react';

interface ModuleCard {
  to: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  stats?: { label: string; value: string }[];
}

const MODULES: ModuleCard[] = [
  {
    to: '/ops/students',
    title: 'إدارة الطلاب',
    subtitle: 'Student Management',
    icon: Users,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-600',
    stats: [{ label: 'نشط', value: '10' }, { label: 'فصول', value: '2' }],
  },
  {
    to: '/ops/curriculum',
    title: 'إدارة المنهج',
    subtitle: 'Curriculum Management',
    icon: BookOpen,
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    stats: [{ label: 'وحدات', value: '12' }, { label: 'دروس', value: '89' }],
  },
  {
    to: '/ops/skills',
    title: 'إدارة المهارات',
    subtitle: 'Skill Management',
    icon: Brain,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-violet-600',
    stats: [{ label: 'مهارات', value: '63' }, { label: 'متقنة', value: '24' }],
  },
  {
    to: '/ops/questions',
    title: 'إدارة الأسئلة',
    subtitle: 'Question Management',
    icon: ClipboardCheck,
    color: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-600',
    stats: [{ label: 'أسئلة', value: '500+' }, { label: 'جديدة', value: '45' }],
  },
  {
    to: '/ops/qa',
    title: 'ضمان الجودة',
    subtitle: 'Academic QA',
    icon: Shield,
    color: 'text-red-600',
    gradient: 'from-red-500 to-rose-600',
    stats: [{ label: 'تنبيهات', value: '3' }, { label: 'فجوات', value: '5' }],
  },
  {
    to: '/ops/pilot',
    title: 'عمليات البايلوت',
    subtitle: 'Pilot Operations',
    icon: BarChart3,
    color: 'text-cyan-600',
    gradient: 'from-cyan-500 to-blue-600',
    stats: [{ label: 'DAU', value: '8' }, { label: 'احتفاظ', value: '75%' }],
  },
  {
    to: '/ops/workflow',
    title: 'سير العمل',
    subtitle: 'Review Workflow',
    icon: Zap,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-600',
    stats: [{ label: 'قيد المراجعة', value: '7' }, { label: 'منشور', value: '42' }],
  },
  {
    to: '/ops/management',
    title: 'إدارة البايلوت',
    subtitle: 'Pilot Management',
    icon: Shield,
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-600',
    stats: [{ label: 'حسابات', value: '20' }, { label: 'نشط', value: '8' }],
  },
  {
    to: '/student/assessment',
    title: 'ذكاء التقييم',
    subtitle: 'Assessment Intelligence',
    icon: Target,
    color: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-600',
    stats: [{ label: 'تقييمات', value: '150+' }, { label: 'دقة', value: '92%' }],
  },
];

// Workflow pipeline status
const PIPELINE_STATUS = [
  { stage: 'مسودة', count: 12, icon: Clock, color: 'bg-gray-100 text-gray-600' },
  { stage: 'قيد المراجعة', count: 7, icon: ClipboardCheck, color: 'bg-amber-100 text-amber-700' },
  { stage: 'تعديلات', count: 3, icon: AlertTriangle, color: 'bg-orange-100 text-orange-700' },
  { stage: 'معتمد', count: 8, icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  { stage: 'منشور', count: 42, icon: TrendingUp, color: 'bg-blue-100 text-blue-700' },
];

export default function OperatingSystem() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">نظام التشغيل التعليمي</h1>
          <p className="text-sm text-gray-500 font-tajawal mt-1">Educational Operating System</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Layers className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-2xl font-bold text-gray-800">10</p>
          <p className="text-xs text-gray-500 font-tajawal">طلاب نشطين</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-2xl font-bold text-gray-800">500+</p>
          <p className="text-xs text-gray-500 font-tajawal">سؤال</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-2xl font-bold text-gray-800">63</p>
          <p className="text-xs text-gray-500 font-tajawal">مهارة</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-2xl font-bold text-gray-800">75%</p>
          <p className="text-xs text-gray-500 font-tajawal">معدل الاحتفاظ</p>
        </div>
      </div>

      {/* Content Pipeline Status */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 font-tajawal mb-4">خط إنتاج المحتوى</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PIPELINE_STATUS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.stage} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${item.color}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-bold font-tajawal">{item.count}</span>
                  <span className="text-[10px] font-tajawal">{item.stage}</span>
                </div>
                {i < PIPELINE_STATUS.length - 1 && (
                  <div className="w-4 h-px bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.to}
              to={module.to}
              className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800 font-tajawal">{module.title}</h3>
                  <p className="text-[11px] text-gray-400 font-tajawal">{module.subtitle}</p>
                </div>
              </div>
              {module.stats && (
                <div className="flex items-center gap-4">
                  {module.stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-700">{stat.value}</span>
                      <span className="text-[10px] text-gray-400 font-tajawal">{stat.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}