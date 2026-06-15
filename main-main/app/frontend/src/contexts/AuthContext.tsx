import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { authenticatePilot, PilotAccount, PILOT_ACCOUNTS } from '@/lib/pilotAccounts';
import { setCurrentUser, clearCurrentUser, getCurrentUserId } from '@/lib/pilotStorage';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  last_login?: string;
  grade?: number;
  linkedStudents?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  isParent: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

function accountToUser(account: PilotAccount): User {
  return {
    id: account.id,
    email: `${account.username}@pilot.local`,
    name: account.name,
    role: account.role,
    grade: account.grade,
    linkedStudents: account.linkedStudents,
    last_login: new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const savedUserId = getCurrentUserId();
      if (savedUserId) {
        const account = PILOT_ACCOUNTS.find((a) => a.id === savedUserId);
        if (account) {
          setUser(accountToUser(account));
        } else {
          clearCurrentUser();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username?: string, password?: string): Promise<boolean> => {
    try {
      setError(null);
      if (username && password) {
        const account = authenticatePilot(username, password);
        if (account) {
          setCurrentUser(account.id);
          setUser(accountToUser(account));
          return true;
        } else {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة');
          return false;
        }
      }
      // If no credentials, redirect to login page
      window.location.href = '/login';
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      clearCurrentUser();
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refetch: checkAuthStatus,
    isAdmin: user?.role === 'admin',
    isParent: user?.role === 'parent',
    isStudent: user?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};