// Error Boundary - Catches React rendering errors and provides recovery UI
import { Component, type ReactNode } from 'react';
import { monitorEvent } from '@/lib/persistenceManager';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    monitorEvent('react_crash', {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 300),
    });

    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReset = () => {
    // Clear potentially corrupted state and reload
    try {
      // Don't clear all data - just remove potentially corrupted session state
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { errorCount } = this.state;
      const canRetry = errorCount < 3;

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6" dir="rtl">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 font-tajawal">
              {this.props.fallbackMessage || 'حدث خطأ غير متوقع'}
            </h2>
            <p className="text-gray-600 font-tajawal text-sm">
              لا تقلق! بياناتك محفوظة بأمان. يمكنك المحاولة مرة أخرى.
            </p>

            <div className="flex gap-3 justify-center pt-2">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold font-tajawal hover:bg-blue-700 transition-colors text-base"
                >
                  حاول مرة أخرى
                </button>
              )}
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold font-tajawal hover:bg-gray-300 transition-colors text-base"
              >
                إعادة تحميل
              </button>
            </div>

            {errorCount >= 3 && (
              <p className="text-xs text-red-500 font-tajawal mt-2">
                إذا استمرت المشكلة، جرّب إعادة تحميل الصفحة
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}