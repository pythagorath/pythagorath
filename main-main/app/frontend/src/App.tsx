import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PilotAuthProvider } from './contexts/PilotAuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { lazy, Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import RoleLayout from '@/components/RoleNavigation';
import FounderSwitch from '@/components/FounderSwitch';
import { preloadInteractions } from '@/lib/interactionService';

// Eager load critical pages
import Index from './pages/Index';
import PilotLogin from './pages/PilotLogin';
import StudentRegistration from './pages/StudentRegistration';

// Lazy load role-based pages
const ChildGuidedFlow = lazy(() => import('./pages/ChildGuidedFlow'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ReviewerDashboard = lazy(() => import('./pages/ReviewerDashboard'));
const ContentManagement = lazy(() => import('./pages/ContentManagement'));

// Operating System modules
const OperatingSystem = lazy(() => import('./pages/OperatingSystem'));
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const CurriculumManagement = lazy(() => import('./pages/CurriculumManagement'));
const CurriculumSeed = lazy(() => import('./pages/CurriculumSeed'));
const SkillManagement = lazy(() => import('./pages/SkillManagement'));
const QuestionManagementSystem = lazy(() => import('./pages/QuestionManagementSystem'));
const AcademicQADashboard = lazy(() => import('./pages/AcademicQADashboard'));
const PilotOperationsCenter = lazy(() => import('./pages/PilotOperationsCenter'));
const ReviewerWorkflowSystem = lazy(() => import('./pages/ReviewerWorkflowSystem'));
const PilotManagement = lazy(() => import('./pages/PilotManagement'));
const AdminCRUD = lazy(() => import('./pages/AdminCRUD'));
const AbacusModule = lazy(() => import('./pages/AbacusModule'));
const AbacusAdmin = lazy(() => import('./pages/AbacusAdmin'));
const ProgressAnalytics = lazy(() => import('./pages/ProgressAnalytics'));
const CognitiveGames = lazy(() => import('./pages/CognitiveGames'));
const CognitiveDashboard = lazy(() => import('./pages/CognitiveDashboard'));
const AssessmentDashboard = lazy(() => import('./pages/AssessmentDashboard'));
const DiceWorld = lazy(() => import('./pages/DiceWorld'));
const IntelligenceDashboard = lazy(() => import('./pages/IntelligenceDashboard'));
const AssessmentIntelligenceDashboard = lazy(() => import('./pages/AssessmentIntelligenceDashboard'));
const InteractionManager = lazy(() => import('./pages/InteractionManager'));
const StudentProgressAdmin = lazy(() => import('./pages/StudentProgressAdmin'));
const LearningPathAdmin = lazy(() => import('./pages/LearningPathAdmin'));
const StudentLearningPaths = lazy(() => import('./pages/StudentLearningPaths'));
const StudentLearningFlow = lazy(() => import('./pages/StudentLearningFlow'));
const TemplateInspector = lazy(() => import('./pages/TemplateInspector'));
const PublishWorkflow = lazy(() => import('./pages/PublishWorkflow'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30" dir="rtl">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200/40">
          <span className="text-lg">🦉</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
        <p className="text-sm text-gray-400 font-tajawal">جاري التحميل...</p>
      </div>
    </div>
  );
}

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<PilotLogin />} />
      <Route path="/register" element={<StudentRegistration />} />

      {/* Student */}
      <Route path="/student" element={<ChildGuidedFlow />} />
      <Route path="/student/abacus" element={<AbacusModule />} />
      <Route path="/student/dice-world" element={<DiceWorld />} />
      <Route path="/student/progress" element={<ProgressAnalytics />} />
      <Route path="/student/cognitive-games" element={<CognitiveGames />} />
      <Route path="/student/cognitive-dashboard" element={<CognitiveDashboard />} />
      <Route path="/student/assessment" element={<AssessmentDashboard />} />
      <Route path="/dashboard" element={<Navigate to="/student" replace />} />

      {/* Parent */}
      <Route path="/parent" element={<RoleLayout><ParentDashboard /></RoleLayout>} />

      {/* Admin */}
      <Route path="/admin" element={<RoleLayout><AdminDashboard /></RoleLayout>} />
      <Route path="/admin/students" element={<RoleLayout><AdminDashboard tab="students" /></RoleLayout>} />
      <Route path="/admin/content" element={<RoleLayout><AdminDashboard tab="content" /></RoleLayout>} />
      <Route path="/admin/analytics" element={<RoleLayout><AdminDashboard tab="analytics" /></RoleLayout>} />
      <Route path="/admin/pilot" element={<RoleLayout><AdminDashboard tab="pilot" /></RoleLayout>} />
      <Route path="/admin/crud" element={<RoleLayout><AdminCRUD /></RoleLayout>} />
      <Route path="/admin/crud/grades" element={<RoleLayout><AdminCRUD tab="grades" /></RoleLayout>} />
      <Route path="/admin/crud/semesters" element={<RoleLayout><AdminCRUD tab="semesters" /></RoleLayout>} />
      <Route path="/admin/crud/subjects" element={<RoleLayout><AdminCRUD tab="subjects" /></RoleLayout>} />
      <Route path="/admin/crud/units" element={<RoleLayout><AdminCRUD tab="units" /></RoleLayout>} />
      <Route path="/admin/crud/lessons" element={<RoleLayout><AdminCRUD tab="lessons" /></RoleLayout>} />
      <Route path="/admin/crud/skills" element={<RoleLayout><AdminCRUD tab="skills" /></RoleLayout>} />
      <Route path="/admin/crud/questions" element={<RoleLayout><AdminCRUD tab="questions" /></RoleLayout>} />
      <Route path="/admin/abacus" element={<RoleLayout><AbacusAdmin /></RoleLayout>} />
      <Route path="/admin/intelligence" element={<RoleLayout><IntelligenceDashboard /></RoleLayout>} />
      <Route path="/admin/assessment-intelligence" element={<RoleLayout><AssessmentIntelligenceDashboard /></RoleLayout>} />
      <Route path="/admin/interactions" element={<RoleLayout><InteractionManager /></RoleLayout>} />
      <Route path="/admin/student-progress" element={<RoleLayout><StudentProgressAdmin /></RoleLayout>} />
      <Route path="/admin/learning-paths" element={<RoleLayout><LearningPathAdmin /></RoleLayout>} />

      {/* Student Learning Paths */}
      <Route path="/student/learning-paths" element={<StudentLearningPaths />} />
      <Route path="/student/learning-flow" element={<StudentLearningFlow />} />
      <Route path="/admin/template-inspector" element={<TemplateInspector />} />
      <Route path="/admin/publish-workflow" element={<RoleLayout><PublishWorkflow /></RoleLayout>} />

      {/* Academic Reviewer */}
      <Route path="/reviewer" element={<RoleLayout><ReviewerDashboard /></RoleLayout>} />
      <Route path="/reviewer/questions" element={<RoleLayout><ReviewerDashboard tab="questions" /></RoleLayout>} />
      <Route path="/reviewer/skills" element={<RoleLayout><ReviewerDashboard tab="skills" /></RoleLayout>} />
      <Route path="/reviewer/coverage" element={<RoleLayout><ReviewerDashboard tab="coverage" /></RoleLayout>} />

      {/* Content Manager */}
      <Route path="/content" element={<RoleLayout><ContentManagement /></RoleLayout>} />
      <Route path="/content/skills" element={<RoleLayout><ContentManagement tab="skills" /></RoleLayout>} />
      <Route path="/content/questions" element={<RoleLayout><ContentManagement tab="questions" /></RoleLayout>} />
      <Route path="/content/curriculum" element={<RoleLayout><ContentManagement tab="curriculum" /></RoleLayout>} />

      {/* Operating System */}
      <Route path="/ops" element={<RoleLayout><OperatingSystem /></RoleLayout>} />
      <Route path="/ops/students" element={<RoleLayout><StudentManagement /></RoleLayout>} />
      <Route path="/ops/curriculum" element={<RoleLayout><CurriculumManagement /></RoleLayout>} />
      <Route path="/admin/curriculum-seed" element={<RoleLayout><CurriculumSeed /></RoleLayout>} />
      <Route path="/ops/skills" element={<RoleLayout><SkillManagement /></RoleLayout>} />
      <Route path="/ops/questions" element={<RoleLayout><QuestionManagementSystem /></RoleLayout>} />
      <Route path="/ops/qa" element={<RoleLayout><AcademicQADashboard /></RoleLayout>} />
      <Route path="/ops/pilot" element={<RoleLayout><PilotOperationsCenter /></RoleLayout>} />
      <Route path="/ops/workflow" element={<RoleLayout><ReviewerWorkflowSystem /></RoleLayout>} />
      <Route path="/ops/management" element={<RoleLayout><PilotManagement /></RoleLayout>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

const App = () => {
  // Preload published interactions from backend on app init
  // so students get admin-published content immediately
  useEffect(() => {
    preloadInteractions();
  }, []);

  return (
    <ErrorBoundary fallbackMessage="حدث خطأ في تحميل التطبيق">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PilotAuthProvider>
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <ErrorBoundary fallbackMessage="حدث خطأ في عرض الصفحة">
                  <AppRoutes />
                  <FounderSwitch />
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </PilotAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;