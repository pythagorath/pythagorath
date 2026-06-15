// Product Entry System - Professional Educational Platform Gateway
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { getRoleDashboardPath, authenticatePilot, PilotRole } from '@/lib/pilotAccounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle, GraduationCap, Users, Settings, ClipboardCheck,
  Brain, Target, Sparkles, Zap, ArrowLeft, Shield, Eye, EyeOff, UserPlus
} from 'lucide-react';

type EntryRole = 'student' | 'parent' | 'admin' | 'reviewer' | null;

interface RoleEntry {
  role: PilotRole;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  cta: string;
  description: string;
  color: string;
  gradient: string;
  defaultUser: string;
  defaultPass: string;
}

const ROLE_ENTRIES: RoleEntry[] = [
  {
    role: 'student',
    icon: GraduationCap,
    title: 'طالب',
    cta: 'ابدأ التعلم',
    description: 'رحلة تعلم مخصصة وتكيفية',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-600',
    defaultUser: 'student1',
    defaultPass: '1234',
  },
  {
    role: 'parent',
    icon: Users,
    title: 'ولي أمر',
    cta: 'تابع تقدم ابنك',
    description: 'متابعة دقيقة لمسيرة التعلم',
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    defaultUser: 'parent1',
    defaultPass: '1234',
  },
  {
    role: 'admin',
    icon: Settings,
    title: 'إدارة',
    cta: 'إدارة النظام',
    description: 'تحكم كامل في المنظومة التعليمية',
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-violet-600',
    defaultUser: 'admin',
    defaultPass: 'admin123',
  },
  {
    role: 'reviewer',
    icon: ClipboardCheck,
    title: 'مراجع أكاديمي',
    cta: 'مراجعة المحتوى',
    description: 'ضمان جودة المحتوى التعليمي',
    color: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-600',
    defaultUser: 'reviewer1',
    defaultPass: '1234',
  },
];

const PRODUCT_FEATURES = [
  { icon: Brain, label: 'مبني على المهارات', sublabel: 'Skill-Based' },
  { icon: Target, label: 'تكيفي', sublabel: 'Adaptive' },
  { icon: Sparkles, label: 'مخصص', sublabel: 'Personalized' },
  { icon: Zap, label: 'ذاتي التعلم', sublabel: 'Autonomous' },
];

export default function PilotLogin() {
  const [selectedRole, setSelectedRole] = useState<EntryRole>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredStudents, setRegisteredStudents] = useState<Array<{ id: string; name: string; avatarColor: string; grade: number }>>([]);
  const { login, error, user } = usePilotAuth();
  const navigate = useNavigate();

  // Load registered students on mount
  useEffect(() => {
    // Load from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('registered_students') || '[]');
      if (stored.length > 0) {
        setRegisteredStudents(stored);
      }
    } catch { /* ignore */ }

    // Also try to fetch from backend
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    fetch(`${apiBase}/api/v1/public/students`)
      .then(res => res.ok ? res.json() : [])
      .then((students: Array<{ user_id: string; name: string; avatar_color: string; grade: number }>) => {
        if (students.length > 0) {
          const mapped = students.map(s => ({
            id: s.user_id,
            name: s.name,
            avatarColor: s.avatar_color || '#3b82f6',
            grade: s.grade,
          }));
          setRegisteredStudents(mapped);
          // Sync to localStorage
          localStorage.setItem('registered_students', JSON.stringify(mapped));
        }
      })
      .catch(() => { /* use localStorage fallback */ });
  }, []);

  // If already logged in, redirect
  if (user) {
    navigate(getRoleDashboardPath(user.role));
    return null;
  }

  const handleRoleSelect = (entry: RoleEntry) => {
    setSelectedRole(entry.role);
    setUsername(entry.defaultUser);
    setPassword(entry.defaultPass);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const success = login(username, password);
      setIsLoading(false);
      if (success) {
        const account = authenticatePilot(username, password);
        if (account) {
          navigate(getRoleDashboardPath(account.role));
        }
      }
    }, 400);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setUsername('');
    setPassword('');
  };

  const selectedEntry = ROLE_ENTRIES.find(r => r.role === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40" dir="rtl">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative min-h-screen flex flex-col">
        {/* Header - Brand Bar */}
        <header className="w-full px-6 py-5">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
                <span className="text-xl">🦉</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 font-tajawal tracking-tight">فيثاغورث</h1>
                <p className="text-[11px] text-gray-400 font-tajawal">Pythagorath Academy</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors font-tajawal"
            >
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              الصفحة الرئيسية
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-4xl">
            {!selectedRole ? (
              /* ===== ROLE SELECTION VIEW ===== */
              <div className="space-y-10">
                {/* Product Headline */}
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-tajawal leading-tight mb-4">
                    منظومة التعلم الذكي
                  </h2>
                  <p className="text-base text-gray-500 font-tajawal leading-relaxed">
                    نظام تعليمي متكامل يبني المهارات الرياضية خطوة بخطوة، بذكاء وتكيف مستمر
                  </p>
                </div>

                {/* Product Features Strip */}
                <div className="flex items-center justify-center gap-6 md:gap-10">
                  {PRODUCT_FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.sublabel} className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 font-tajawal">{feature.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Role Entry Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                  {ROLE_ENTRIES.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <button
                        key={entry.role}
                        onClick={() => handleRoleSelect(entry)}
                        className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/40 transition-all duration-300 text-right"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${entry.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 font-tajawal mb-1">{entry.title}</h3>
                            <p className="text-sm text-gray-400 font-tajawal mb-3">{entry.description}</p>
                            <span className={`inline-flex items-center gap-1 text-sm font-medium ${entry.color} font-tajawal group-hover:translate-x-[-4px] transition-transform`}>
                              {entry.cta}
                              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Register New Student CTA */}
                <div className="max-w-3xl mx-auto">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 flex flex-col md:flex-row items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-center md:text-right">
                      <h3 className="text-base font-bold text-gray-900 font-tajawal mb-1">طالب جديد؟</h3>
                      <p className="text-sm text-gray-500 font-tajawal">سجّل الآن وابدأ رحلة التعلم الذكي مجاناً</p>
                    </div>
                    <Button
                      onClick={() => navigate('/register')}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl px-6 h-11 font-tajawal shadow-lg"
                    >
                      تسجيل طالب جديد
                    </Button>
                  </div>
                </div>

                {/* Registered Students Quick Login */}
                {registeredStudents.length > 0 && (
                  <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <p className="text-sm font-bold text-gray-700 font-tajawal mb-3 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        الطلاب المسجلون - دخول سريع
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {registeredStudents.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              localStorage.setItem('pythagorath_user_id', s.id);
                              localStorage.setItem('pilot_current_user', s.id);
                              // Ensure profile is stored
                              localStorage.setItem(`student_profile_${s.id}`, JSON.stringify(s));
                              navigate('/student');
                            }}
                            className="flex items-center gap-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-4 py-2.5 transition-all"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: s.avatarColor }}
                            >
                              {s.name.charAt(0)}
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-800 font-tajawal block">{s.name}</span>
                              <span className="text-[10px] text-gray-400 font-tajawal">الصف {s.grade}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Trust Signal */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-tajawal">
                  <Shield className="w-3.5 h-3.5" />
                  <span>بيئة آمنة ومحمية • بيانات مشفرة • خصوصية كاملة</span>
                </div>
              </div>
            ) : (
              /* ===== LOGIN FORM VIEW ===== */
              <div className="max-w-md mx-auto space-y-8">
                {/* Back Button */}
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-600 transition-colors font-tajawal"
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                  اختيار دور آخر
                </button>

                {/* Role Header */}
                {selectedEntry && (
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedEntry.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <selectedEntry.icon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 font-tajawal mb-1">{selectedEntry.cta}</h2>
                    <p className="text-sm text-gray-400 font-tajawal">الدخول كـ {selectedEntry.title}</p>
                  </div>
                )}

                {/* Login Form */}
                <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 font-tajawal">اسم المستخدم</label>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="أدخل اسم المستخدم"
                        className="h-12 text-left font-mono text-base rounded-xl border-gray-200 focus:border-indigo-300 focus:ring-indigo-100"
                        dir="ltr"
                        autoComplete="username"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 font-tajawal">كلمة المرور</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••"
                          className="h-12 text-left font-mono text-base rounded-xl border-gray-200 focus:border-indigo-300 focus:ring-indigo-100 pl-10"
                          dir="ltr"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-tajawal">{error}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isLoading || !username || !password}
                      className={`w-full h-12 bg-gradient-to-r ${selectedEntry?.gradient || 'from-indigo-600 to-purple-600'} hover:opacity-90 text-white rounded-xl text-base font-tajawal shadow-lg transition-all duration-200`}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          جاري الدخول...
                        </span>
                      ) : (
                        selectedEntry?.cta || 'تسجيل الدخول'
                      )}
                    </Button>
                  </form>
                </div>

                {/* Quick Access for same role */}
                {selectedEntry && selectedEntry.role === 'student' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                      <p className="text-xs text-blue-600 font-tajawal mb-2 font-medium">حسابات طلاب تجريبية:</p>
                      <div className="flex flex-wrap gap-2">
                        {['student1', 'student2', 'student3'].map((u) => (
                          <button
                            key={u}
                            onClick={() => { setUsername(u); setPassword('1234'); }}
                            className="text-xs bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-blue-700 hover:bg-blue-100 transition-colors font-mono"
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => navigate('/register')}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-tajawal font-medium hover:underline"
                      >
                        ✨ طالب جديد؟ سجّل الآن
                      </button>
                    </div>
                  </div>
                )}

                {selectedEntry && selectedEntry.role === 'parent' && (
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-tajawal mb-2 font-medium">حسابات أولياء أمور تجريبية:</p>
                    <div className="flex flex-wrap gap-2">
                      {['parent1', 'parent2', 'parent3'].map((u) => (
                        <button
                          key={u}
                          onClick={() => { setUsername(u); setPassword('1234'); }}
                          className="text-xs bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors font-mono"
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trust */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-tajawal">
                  <Shield className="w-3.5 h-3.5" />
                  <span>دخول آمن ومشفر</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-300 font-tajawal">
            <span>© 2026 أكاديمية فيثاغورث</span>
            <span>نظام تعلم ذكي ومتكيف</span>
          </div>
        </footer>
      </div>
    </div>
  );
}