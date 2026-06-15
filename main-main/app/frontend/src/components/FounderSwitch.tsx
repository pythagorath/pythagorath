// Founder Visibility Layer - Quick role-switching with journey state monitoring
// Allows founder to view any role's experience instantly + see current state
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { PilotRole, getRoleLabel, getRoleDashboardPath, PILOT_ACCOUNTS } from '@/lib/pilotAccounts';
import { loadUserData } from '@/lib/pilotStorage';
import {
  GraduationCap, Users, Settings, ClipboardCheck, BookOpen,
  Eye, X, Layers, Activity, TrendingUp, AlertTriangle
} from 'lucide-react';

interface RoleOption {
  role: PilotRole;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  account: { username: string; password: string };
}

interface JourneyState {
  student: { initialized: boolean; level: string; xp: number; streak: number; missions: number };
  parent: { active: boolean };
  admin: { active: boolean };
  reviewer: { active: boolean };
  content_manager: { active: boolean };
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: 'student', icon: GraduationCap, color: 'text-blue-600 bg-blue-50 border-blue-200', account: { username: 'student1', password: '1234' } },
  { role: 'parent', icon: Users, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', account: { username: 'parent1', password: '1234' } },
  { role: 'admin', icon: Settings, color: 'text-purple-600 bg-purple-50 border-purple-200', account: { username: 'admin', password: 'admin123' } },
  { role: 'reviewer', icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50 border-amber-200', account: { username: 'reviewer1', password: '1234' } },
  { role: 'content_manager', icon: BookOpen, color: 'text-rose-600 bg-rose-50 border-rose-200', account: { username: 'content1', password: '1234' } },
];

function getJourneyState(): JourneyState {
  // Read student journey state from localStorage
  const flowState = loadUserData<{ initialized?: boolean; level?: string; xp?: number; missions?: { completed: boolean }[] } | null>('guided_flow_state', null);
  const habitData = loadUserData<{ currentStreak?: number } | null>('habit_profile', null);

  return {
    student: {
      initialized: flowState?.initialized || false,
      level: flowState?.level || 'غير محدد',
      xp: flowState?.xp || 0,
      streak: habitData?.currentStreak || 0,
      missions: flowState?.missions?.filter((m: { completed: boolean }) => m.completed).length || 0,
    },
    parent: { active: true },
    admin: { active: true },
    reviewer: { active: true },
    content_manager: { active: true },
  };
}

export default function FounderSwitch() {
  const [open, setOpen] = useState(false);
  const [journeyState, setJourneyState] = useState<JourneyState>(getJourneyState());
  const { user, login } = usePilotAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setJourneyState(getJourneyState());
    }
  }, [open]);

  const switchTo = (option: RoleOption) => {
    login(option.account.username, option.account.password);
    setOpen(false);
    navigate(getRoleDashboardPath(option.role));
  };

  const goToOps = () => {
    setOpen(false);
    navigate('/ops');
  };

  const getStatusIndicator = (role: PilotRole) => {
    if (role === 'student') {
      if (!journeyState.student.initialized) return { color: 'bg-gray-300', label: 'لم يبدأ' };
      if (journeyState.student.streak > 0) return { color: 'bg-green-400', label: `🔥 ${journeyState.student.streak}` };
      return { color: 'bg-blue-400', label: 'نشط' };
    }
    return { color: 'bg-green-400', label: 'متاح' };
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 left-5 z-[60] w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center shadow-lg shadow-indigo-300/40 hover:shadow-xl hover:scale-105 transition-all group"
        title="تبديل سريع بين الأدوار"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Eye className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 left-5 z-[60] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200" dir="rtl">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-gray-700 font-tajawal">مراقبة الرحلات</span>
              </div>
              {user && (
                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-tajawal">
                  {getRoleLabel(user.role)}
                </span>
              )}
            </div>
          </div>

          {/* Student Journey Monitor */}
          <div className="px-3 py-2 bg-blue-50/50 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1.5">
              <Activity className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-700 font-tajawal">رحلة الطالب</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-700">{journeyState.student.xp}</p>
                <p className="text-[8px] text-gray-400 font-tajawal">XP</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-700">{journeyState.student.streak}</p>
                <p className="text-[8px] text-gray-400 font-tajawal">سلسلة</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-700">{journeyState.student.missions}</p>
                <p className="text-[8px] text-gray-400 font-tajawal">مهام</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-700">
                  {journeyState.student.level === 'beginner' ? 'مبتدئ' :
                   journeyState.student.level === 'intermediate' ? 'متوسط' :
                   journeyState.student.level === 'advanced' ? 'متقدم' : '—'}
                </p>
                <p className="text-[8px] text-gray-400 font-tajawal">مستوى</p>
              </div>
            </div>
          </div>

          {/* Role list */}
          <div className="p-2 space-y-1">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = user?.role === option.role;
              const status = getStatusIndicator(option.role);
              return (
                <button
                  key={option.role}
                  onClick={() => switchTo(option)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all ${
                    isActive
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${option.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 font-tajawal">{getRoleLabel(option.role)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-gray-400 font-tajawal">{status.label}</span>
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                  </div>
                  {isActive && (
                    <span className="text-[10px] text-indigo-500 font-tajawal mr-1">◀</span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className="border-t border-gray-100 my-1" />

            {/* Quick Analytics */}
            <div className="px-3 py-2 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-bold text-gray-600 font-tajawal">مؤشرات سريعة</span>
              </div>
              <div className="flex items-center gap-3 text-[9px] text-gray-500 font-tajawal">
                <span>D1: 85%</span>
                <span>•</span>
                <span>D7: 75%</span>
                <span>•</span>
                <span>إتقان: 62%</span>
              </div>
            </div>

            {/* Operating System quick access */}
            <button
              onClick={goToOps}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-gray-50 transition-all border border-transparent"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-gray-600 bg-gray-50 border-gray-200">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 font-tajawal">نظام التشغيل</p>
                <p className="text-[10px] text-gray-400 font-tajawal">Operating System</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[55]"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}