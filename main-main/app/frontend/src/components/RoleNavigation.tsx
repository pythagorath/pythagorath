// Unified Role-Based Navigation - Cohesive platform navigation
// Consistent visual language across all roles with smooth transitions
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { getRoleLabel, PilotRole } from '@/lib/pilotAccounts';
import { Button } from '@/components/ui/button';
import {
  Home, BookOpen, Brain, Users, Settings, LogOut, BarChart3,
  FileText, Shield, Layers, ClipboardCheck, Menu, X, Zap
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_BY_ROLE: Record<PilotRole, NavItem[]> = {
  student: [
    { to: '/student', label: 'رحلة التعلم', icon: Home },
  ],
  parent: [
    { to: '/parent', label: 'متابعة الأبناء', icon: Home },
  ],
  admin: [
    { to: '/admin', label: 'لوحة التحكم', icon: Home },
    { to: '/admin/crud', label: 'إدارة المنهج', icon: Settings },
    { to: '/ops', label: 'نظام التشغيل', icon: Layers },
    { to: '/admin/students', label: 'الطلاب', icon: Users },
    { to: '/admin/content', label: 'المحتوى', icon: BookOpen },
    { to: '/admin/analytics', label: 'التحليلات', icon: BarChart3 },
    { to: '/admin/pilot', label: 'البايلوت', icon: Shield },
  ],
  reviewer: [
    { to: '/reviewer', label: 'لوحة المراجعة', icon: Home },
    { to: '/ops', label: 'نظام التشغيل', icon: Layers },
    { to: '/ops/workflow', label: 'سير العمل', icon: Zap },
    { to: '/reviewer/questions', label: 'مراجعة الأسئلة', icon: ClipboardCheck },
    { to: '/reviewer/skills', label: 'مراجعة المهارات', icon: Brain },
    { to: '/reviewer/coverage', label: 'تغطية المنهج', icon: FileText },
  ],
  content_manager: [
    { to: '/content', label: 'إدارة المحتوى', icon: Home },
    { to: '/ops', label: 'نظام التشغيل', icon: Layers },
    { to: '/ops/workflow', label: 'سير العمل', icon: Zap },
    { to: '/content/skills', label: 'المهارات', icon: Brain },
    { to: '/content/questions', label: 'الأسئلة', icon: ClipboardCheck },
    { to: '/content/curriculum', label: 'المنهج', icon: Layers },
  ],
};

const ROLE_COLORS: Record<PilotRole, { bg: string; text: string; accent: string }> = {
  student: { bg: 'from-blue-600 to-indigo-700', text: 'text-blue-600', accent: 'bg-blue-50 text-blue-700 border-blue-200' },
  parent: { bg: 'from-emerald-600 to-teal-700', text: 'text-emerald-600', accent: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  admin: { bg: 'from-purple-600 to-violet-700', text: 'text-purple-600', accent: 'bg-purple-50 text-purple-700 border-purple-200' },
  reviewer: { bg: 'from-amber-600 to-orange-700', text: 'text-amber-600', accent: 'bg-amber-50 text-amber-700 border-amber-200' },
  content_manager: { bg: 'from-rose-600 to-pink-700', text: 'text-rose-600', accent: 'bg-rose-50 text-rose-700 border-rose-200' },
};

interface RoleLayoutProps {
  children: ReactNode;
}

export default function RoleLayout({ children }: RoleLayoutProps) {
  const { user, logout } = usePilotAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <>{children}</>;

  // Students get minimal chrome
  if (user.role === 'student') {
    return <>{children}</>;
  }

  const navItems = NAV_BY_ROLE[user.role] || [];
  const colors = ROLE_COLORS[user.role];
  const isActive = (path: string) => {
    if (path === '/admin' || path === '/reviewer' || path === '/content' || path === '/ops') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50/80" dir="rtl">
      {/* Top Header - Unified brand bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 h-14">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
            </button>
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className={`w-9 h-9 bg-gradient-to-br ${colors.bg} rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                <span className="text-sm">🦉</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-gray-800 font-tajawal text-sm">فيثاغورث</span>
                <span className="block text-[10px] text-gray-400 font-tajawal -mt-0.5">Pythagorath</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium font-tajawal ${colors.accent}`}>
              {getRoleLabel(user.role)}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700 font-tajawal">{user.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-14 right-0 bottom-0 w-56 bg-white/95 backdrop-blur-sm border-l border-gray-100 z-40 transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`}>
        <nav className="p-3 space-y-0.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? `bg-gradient-to-l from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100/60 shadow-sm`
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="font-tajawal">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="absolute bottom-4 left-3 right-3">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100/40">
            <p className="text-[10px] text-indigo-500 font-tajawal text-center">أكاديمية فيثاغورث • v1.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-14 lg:pr-56 transition-all duration-300">
        <div className="p-5 md:p-6 animate-in fade-in duration-300">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-30 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}