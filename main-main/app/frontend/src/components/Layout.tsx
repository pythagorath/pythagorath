import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, Settings, LogOut, Home, User, Brain, Users, Map, Zap, FileText, Menu, X, BarChart3, Shield } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getStudentProgress } from '@/lib/studentStore';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  const handleLogin = () => {
    navigate('/login');
  };

  useEffect(() => {
    // Load points from per-user storage
    const loadPoints = () => {
      try {
        const progress = getStudentProgress();
        setTotalPoints(progress.totalPoints || 0);
      } catch {
        // ignore
      }
    };

    loadPoints();

    // Listen for points updates
    window.addEventListener('points-updated', loadPoints);
    return () => {
      window.removeEventListener('points-updated', loadPoints);
    };
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/dashboard', label: 'لوحة التحكم', icon: Home, color: 'text-blue-700 hover:bg-blue-50' },
    { to: '/skills-map', label: 'خريطة المهارات', icon: Map, color: 'text-indigo-700 hover:bg-indigo-50' },
    { to: '/skills-engine', label: 'محرك المهارات', icon: Zap, color: 'text-orange-700 hover:bg-orange-50' },
    { to: '/ai-analysis', label: 'التحليل الذكي', icon: Brain, color: 'text-purple-700 hover:bg-purple-50' },
    { to: '/parent', label: 'ولي الأمر', icon: Users, color: 'text-green-700 hover:bg-green-50' },
    { to: '/curriculum-report', label: 'تقرير المنهج', icon: FileText, color: 'text-teal-700 hover:bg-teal-50' },
    { to: '/academic-analytics', label: 'التحليل الأكاديمي', icon: BarChart3, color: 'text-rose-700 hover:bg-rose-50' },
    { to: '/teacher-intelligence', label: 'ذكاء التعلم', icon: Shield, color: 'text-purple-700 hover:bg-purple-50' },
    { to: '/validation', label: 'التحقق', icon: BarChart3, color: 'text-indigo-700 hover:bg-indigo-50' },
    { to: '/admin', label: 'الإدارة', icon: Settings, color: 'text-gray-700 hover:bg-gray-50' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-primary hidden sm:block">أكاديمية فيثاغورث</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'bg-primary/10 text-primary'
                      : link.color
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: Points + User + Mobile menu button */}
          <div className="flex items-center gap-2">
            {/* Points badge - only show for logged in users */}
            {user && (
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">{totalPoints} نقطة</span>
              </div>
            )}

            {/* User section */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium hidden md:block">{user.name || user.email}</span>
                <Button variant="ghost" size="sm" onClick={logout} className="text-gray-500 hover:text-red-500">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin} className="hidden sm:flex bg-primary hover:bg-primary/90 text-white" size="sm">
                تسجيل الدخول
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-blue-100 bg-white shadow-lg animate-in slide-in-from-top-2 duration-200">
            <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {navLinks.map(link => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.to)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              {/* Mobile user actions */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                {user ? (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">{user.name || user.email}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={logout} className="text-red-500">
                      <LogOut className="w-4 h-4 ml-1" />
                      خروج
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/90 text-white mt-1">
                    تسجيل الدخول
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}