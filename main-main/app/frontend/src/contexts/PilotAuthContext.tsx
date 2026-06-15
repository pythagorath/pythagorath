import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticatePilot, PILOT_ACCOUNTS, PilotAccount, PilotRole, getRoleDashboardPath } from '@/lib/pilotAccounts';
import { setCurrentUser, clearCurrentUser } from '@/lib/pilotStorage';

interface PilotUser {
  id: string;
  username: string;
  name: string;
  role: PilotRole;
  grade?: number;
  linkedStudents?: string[];
}

interface PilotAuthContextType {
  user: PilotUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  isParent: boolean;
  isStudent: boolean;
  isReviewer: boolean;
  isContentManager: boolean;
  getDashboardPath: () => string;
}

const PilotAuthContext = createContext<PilotAuthContextType | null>(null);

export const usePilotAuth = () => {
  const context = useContext(PilotAuthContext);
  if (!context) {
    throw new Error('usePilotAuth must be used within a PilotAuthProvider');
  }
  return context;
};

interface PilotAuthProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'pythagorath_user_id';

export const PilotAuthProvider: React.FC<PilotAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<PilotUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUserId = localStorage.getItem(STORAGE_KEY);
      if (savedUserId) {
        // First check pilot demo accounts
        const account = PILOT_ACCOUNTS.find((a: PilotAccount) => a.id === savedUserId);
        if (account) {
          setCurrentUser(account.id);
          setUser({
            id: account.id,
            username: account.username,
            name: account.name,
            role: account.role,
            grade: account.grade,
            linkedStudents: account.linkedStudents,
          });
        } else {
          // Check registered students from localStorage
          const profileData = localStorage.getItem(`student_profile_${savedUserId}`);
          if (profileData) {
            const profile = JSON.parse(profileData);
            setCurrentUser(savedUserId);
            setUser({
              id: savedUserId,
              username: profile.name,
              name: profile.name,
              role: 'student',
              grade: profile.grade,
            });
          }
        }
      }
    } catch {
      // ignore storage errors
    }
    setLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    setError(null);
    // First try pilot demo accounts
    const account = authenticatePilot(username, password);
    if (account) {
      localStorage.setItem(STORAGE_KEY, account.id);
      setCurrentUser(account.id);
      setUser({
        id: account.id,
        username: account.username,
        name: account.name,
        role: account.role,
        grade: account.grade,
        linkedStudents: account.linkedStudents,
      });
      return true;
    }

    // Then check registered students (by name or id)
    try {
      const registered = JSON.parse(localStorage.getItem('registered_students') || '[]');
      const student = registered.find(
        (s: { id: string; name: string }) => s.name === username || s.id === username
      );
      if (student) {
        localStorage.setItem(STORAGE_KEY, student.id);
        setCurrentUser(student.id);
        localStorage.setItem(`student_profile_${student.id}`, JSON.stringify(student));
        setUser({
          id: student.id,
          username: student.name,
          name: student.name,
          role: 'student',
          grade: student.grade,
        });
        return true;
      }
    } catch { /* ignore */ }

    setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    // Sync with pilotStorage
    clearCurrentUser();
    setUser(null);
    setError(null);
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    return getRoleDashboardPath(user.role);
  };

  const value: PilotAuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isParent: user?.role === 'parent',
    isStudent: user?.role === 'student',
    isReviewer: user?.role === 'reviewer',
    isContentManager: user?.role === 'content_manager',
    getDashboardPath,
  };

  return <PilotAuthContext.Provider value={value}>{children}</PilotAuthContext.Provider>;
};