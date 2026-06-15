// Protected Route - redirects unauthenticated users to login
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'student' | 'parent' | 'admin';
  fallback?: ReactNode;
}

export default function ProtectedRoute({ children, requiredRole, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-lg text-gray-600 font-tajawal">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 font-tajawal">تسجيل الدخول مطلوب</h2>
          <p className="text-gray-600 font-tajawal">يجب تسجيل الدخول للوصول إلى هذه الصفحة</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold font-tajawal transition-colors text-lg"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  // Role check
  if (requiredRole && user.role !== requiredRole) {
    if (requiredRole === 'admin') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 font-tajawal">غير مصرح</h2>
            <p className="text-gray-600 font-tajawal">ليس لديك صلاحية الوصول إلى هذه الصفحة</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}