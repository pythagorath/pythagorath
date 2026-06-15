// Pilot Management - Demo accounts, progress reset, analytics, engagement monitoring
import { useState } from 'react';
import {
  Users, RotateCcw, BarChart3, AlertTriangle, CheckCircle2,
  Trash2, Eye, Activity, TrendingUp, Clock, Shield
} from 'lucide-react';
import { PILOT_ACCOUNTS, PilotAccount, getRoleLabel, PilotRole } from '@/lib/pilotAccounts';

interface StudentProgress {
  id: string;
  name: string;
  grade: string;
  initialized: boolean;
  missionsCompleted: number;
  xp: number;
  streak: number;
  lastActive: string;
  level: string;
}

// Mock progress data based on localStorage patterns
function getStudentProgress(): StudentProgress[] {
  return PILOT_ACCOUNTS
    .filter(a => a.role === 'student')
    .map(a => ({
      id: a.id,
      name: a.name,
      grade: a.grade === 1 ? 'الصف الأول' : 'الصف الثاني',
      initialized: Math.random() > 0.3,
      missionsCompleted: Math.floor(Math.random() * 20),
      xp: Math.floor(Math.random() * 300),
      streak: Math.floor(Math.random() * 7),
      lastActive: Math.random() > 0.5 ? 'اليوم' : 'أمس',
      level: ['مبتدئ', 'متوسط', 'متقدم'][Math.floor(Math.random() * 3)],
    }));
}

interface PilotAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  time: string;
}

const MOCK_ALERTS: PilotAlert[] = [
  { id: '1', type: 'warning', message: 'طالب "عمر" لم يسجل دخول منذ 3 أيام', time: 'منذ ساعة' },
  { id: '2', type: 'info', message: 'طالبة "سارة" أكملت 10 مهام متتالية', time: 'منذ 3 ساعات' },
  { id: '3', type: 'success', message: 'معدل الاحتفاظ ارتفع إلى 80% هذا الأسبوع', time: 'اليوم' },
  { id: '4', type: 'warning', message: 'طالب "خالد" يظهر علامات إحباط (3 أخطاء متتالية)', time: 'منذ 5 ساعات' },
];

type TabId = 'accounts' | 'progress' | 'analytics' | 'alerts';

export default function PilotManagement() {
  const [tab, setTab] = useState<TabId>('accounts');
  const [students] = useState<StudentProgress[]>(getStudentProgress());
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'accounts', label: 'الحسابات', icon: Users },
    { id: 'progress', label: 'التقدم', icon: TrendingUp },
    { id: 'analytics', label: 'التحليلات', icon: BarChart3 },
    { id: 'alerts', label: 'التنبيهات', icon: AlertTriangle },
  ];

  const resetStudentProgress = (studentId: string) => {
    // In production, this would clear localStorage for that student
    // For now, show confirmation
    setResetConfirm(null);
    // Clear from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(studentId)) {
        localStorage.removeItem(key);
      }
    });
  };

  const resetAllProgress = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('guided_flow') || key.includes('learner_profile') || key.includes('habit_profile')) {
        localStorage.removeItem(key);
      }
    });
    setResetConfirm(null);
  };

  const accountsByRole = (role: PilotRole) => PILOT_ACCOUNTS.filter(a => a.role === role);

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">إدارة البايلوت</h1>
          <p className="text-sm text-gray-500 font-tajawal mt-1">Pilot Management & Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium font-tajawal transition-all ${
                tab === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Accounts Tab */}
      {tab === 'accounts' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-600">{accountsByRole('student').length}</p>
              <p className="text-xs text-gray-500 font-tajawal">طلاب</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-bold text-emerald-600">{accountsByRole('parent').length}</p>
              <p className="text-xs text-gray-500 font-tajawal">أولياء أمور</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-bold text-purple-600">{accountsByRole('admin').length + accountsByRole('reviewer').length}</p>
              <p className="text-xs text-gray-500 font-tajawal">مشرفين</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-800">{PILOT_ACCOUNTS.length}</p>
              <p className="text-xs text-gray-500 font-tajawal">إجمالي</p>
            </div>
          </div>

          {/* Account List by Role */}
          {(['student', 'parent', 'admin', 'reviewer', 'content_manager'] as PilotRole[]).map(role => {
            const accounts = accountsByRole(role);
            if (accounts.length === 0) return null;
            return (
              <div key={role} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700 font-tajawal">{getRoleLabel(role)}</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{accounts.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {accounts.map(account => (
                    <div key={account.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600">{account.name[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 font-tajawal">{account.name}</p>
                          <p className="text-[10px] text-gray-400 font-tajawal">{account.username} / {account.password}</p>
                        </div>
                      </div>
                      {account.grade && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-tajawal">
                          صف {account.grade}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Tab */}
      {tab === 'progress' && (
        <div className="space-y-4">
          {/* Reset Tools */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 font-tajawal">أدوات إعادة التعيين</h3>
              <button
                onClick={() => setResetConfirm('all')}
                className="text-[11px] bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-tajawal font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                إعادة تعيين الكل
              </button>
            </div>
            {resetConfirm === 'all' && (
              <div className="bg-red-50 rounded-xl p-3 border border-red-100 flex items-center justify-between">
                <p className="text-xs text-red-700 font-tajawal">هل أنت متأكد؟ سيتم حذف كل تقدم الطلاب.</p>
                <div className="flex gap-2">
                  <button onClick={resetAllProgress} className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-lg font-tajawal">تأكيد</button>
                  <button onClick={() => setResetConfirm(null)} className="text-[10px] bg-gray-200 text-gray-600 px-3 py-1 rounded-lg font-tajawal">إلغاء</button>
                </div>
              </div>
            )}
          </div>

          {/* Student Progress Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">الطالب</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">الصف</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">المستوى</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">المهام</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">XP</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">آخر نشاط</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${s.initialized ? 'bg-green-400' : 'bg-gray-300'}`} />
                          <span className="text-sm font-medium text-gray-700 font-tajawal">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-tajawal">{s.grade}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-tajawal ${
                          s.level === 'متقدم' ? 'bg-green-50 text-green-700' :
                          s.level === 'متوسط' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{s.level}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-tajawal">{s.missionsCompleted}</td>
                      <td className="px-4 py-3 text-xs font-bold text-indigo-600 font-tajawal">{s.xp}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-tajawal">{s.lastActive}</td>
                      <td className="px-4 py-3">
                        {resetConfirm === s.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => resetStudentProgress(s.id)} className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded font-tajawal">تأكيد</button>
                            <button onClick={() => setResetConfirm(null)} className="text-[9px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-tajawal">إلغاء</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setResetConfirm(s.id)}
                            className="text-[10px] text-red-500 hover:text-red-700 font-tajawal flex items-center gap-0.5"
                          >
                            <RotateCcw className="w-3 h-3" />
                            إعادة
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] text-gray-400 font-tajawal">DAU</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">8</p>
              <p className="text-[10px] text-green-500 font-tajawal">+2 عن أمس</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-[10px] text-gray-400 font-tajawal">متوسط الجلسة</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">12<span className="text-sm text-gray-400">د</span></p>
              <p className="text-[10px] text-green-500 font-tajawal">ضمن المعدل المثالي</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-[10px] text-gray-400 font-tajawal">معدل الاحتفاظ</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">75%</p>
              <p className="text-[10px] text-green-500 font-tajawal">D7 retention</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] text-gray-400 font-tajawal">معدل الإتقان</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">62%</p>
              <p className="text-[10px] text-amber-500 font-tajawal">متوسط عبر الطلاب</p>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 font-tajawal mb-4">مؤشرات المشاركة اليومية</h3>
            <div className="space-y-3">
              {[
                { label: 'تسجيلات الدخول', value: 8, max: 10, color: 'bg-blue-400' },
                { label: 'مهام مكتملة', value: 34, max: 50, color: 'bg-green-400' },
                { label: 'أسئلة مجابة', value: 120, max: 200, color: 'bg-purple-400' },
                { label: 'دقائق تعلم', value: 96, max: 150, color: 'bg-amber-400' },
              ].map(metric => (
                <div key={metric.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-tajawal w-28 shrink-0">{metric.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${metric.color} transition-all duration-500`}
                      style={{ width: `${(metric.value / metric.max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-600 w-12 text-left">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pilot Health Score */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-indigo-700 font-tajawal">صحة البايلوت</h3>
              <span className="text-2xl font-bold text-indigo-600">78/100</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">✓</p>
                <p className="text-[10px] text-gray-500 font-tajawal">مشاركة</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">✓</p>
                <p className="text-[10px] text-gray-500 font-tajawal">احتفاظ</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">⚠</p>
                <p className="text-[10px] text-gray-500 font-tajawal">إتقان</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {MOCK_ALERTS.map(alert => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl p-4 border shadow-sm flex items-start gap-3 ${
                alert.type === 'warning' ? 'border-amber-100' :
                alert.type === 'success' ? 'border-green-100' :
                'border-blue-100'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                alert.type === 'warning' ? 'bg-amber-100' :
                alert.type === 'success' ? 'bg-green-100' :
                'bg-blue-100'
              }`}>
                {alert.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : alert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Activity className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-tajawal">{alert.message}</p>
                <p className="text-[10px] text-gray-400 font-tajawal mt-1">{alert.time}</p>
              </div>
            </div>
          ))}

          {/* No more alerts */}
          <div className="text-center py-6">
            <p className="text-xs text-gray-400 font-tajawal">لا توجد تنبيهات أخرى</p>
          </div>
        </div>
      )}
    </div>
  );
}