import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  GraduationCap, ArrowLeft, UserPlus, AlertCircle, CheckCircle2,
  Sparkles, BookOpen
} from 'lucide-react';

// Oman curriculum grades
const GRADES = [
  { value: 1, label: 'الصف الأول' },
  { value: 2, label: 'الصف الثاني' },
  { value: 3, label: 'الصف الثالث' },
  { value: 4, label: 'الصف الرابع' },
  { value: 5, label: 'الصف الخامس' },
  { value: 6, label: 'الصف السادس' },
  { value: 7, label: 'الصف السابع' },
  { value: 8, label: 'الصف الثامن' },
  { value: 9, label: 'الصف التاسع' },
  { value: 10, label: 'الصف العاشر' },
  { value: 11, label: 'الصف الحادي عشر' },
  { value: 12, label: 'الصف الثاني عشر' },
];

const SEMESTERS = [
  { value: 1, label: 'الفصل الأول' },
  { value: 2, label: 'الفصل الثاني' },
];

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48',
];

export default function StudentRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'grade' | 'confirm'>('info');
  const [name, setName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [semester, setSemester] = useState<number>(1);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !grade) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Generate a unique user_id for this student
      const userId = `student_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Use public registration endpoint (no auth required)
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/v1/public/register-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          grade,
          semester,
          guardian_contact: guardianContact.trim() || null,
          avatar_color: avatarColor,
          status: 'active',
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Save to localStorage for login
        const studentData = {
          id: userId,
          name: name.trim(),
          grade,
          semester,
          avatarColor,
          profileId: data.id,
          registeredAt: new Date().toISOString(),
        };

        // Store in registered students list
        const existing = JSON.parse(localStorage.getItem('registered_students') || '[]');
        existing.push(studentData);
        localStorage.setItem('registered_students', JSON.stringify(existing));

        setSuccess(true);

        // Auto-login and redirect after 2 seconds
        setTimeout(() => {
          localStorage.setItem('pythagorath_user_id', userId);
          localStorage.setItem('pilot_current_user', userId);
          // Store current student profile info
          localStorage.setItem(`student_profile_${userId}`, JSON.stringify(studentData));
          navigate('/student', { replace: true });
        }, 2000);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.detail || 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      setError('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-10 shadow-xl border border-green-100 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-tajawal">مرحباً {name}! 🎉</h2>
          <p className="text-gray-500 font-tajawal">تم إنشاء حسابك بنجاح. جاري التحويل لبدء رحلة التعلم...</p>
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-600 transition-colors font-tajawal"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            العودة لتسجيل الدخول
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-sm">🦉</span>
            </div>
            <span className="text-sm font-bold text-gray-700 font-tajawal">أكاديمية فيثاغورث</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200/40">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-tajawal">تسجيل طالب جديد</h1>
            <p className="text-sm text-gray-500 font-tajawal">أنشئ حسابك وابدأ رحلة التعلم الذكي</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-3">
            {['info', 'grade', 'confirm'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                  ['info', 'grade', 'confirm'].indexOf(step) > i ? 'bg-green-500 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {['info', 'grade', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-0.5 ${['info', 'grade', 'confirm'].indexOf(step) > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 'info' && (
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 font-tajawal flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  اسم الطالب <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسم الطالب"
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-indigo-300 focus:ring-indigo-100 font-tajawal"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 font-tajawal flex items-center gap-2">
                  📱 هاتف أو بريد ولي الأمر <span className="text-gray-400 text-xs">(اختياري)</span>
                </label>
                <Input
                  type="text"
                  value={guardianContact}
                  onChange={(e) => setGuardianContact(e.target.value)}
                  placeholder="رقم الهاتف أو البريد الإلكتروني"
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-indigo-300 focus:ring-indigo-100"
                  dir="ltr"
                />
              </div>

              {/* Avatar Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 font-tajawal flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  اختر لون الصورة الرمزية
                </label>
                <div className="flex flex-wrap gap-3">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        avatarColor === color ? 'ring-3 ring-offset-2 ring-indigo-400 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {avatarColor === color && <span className="text-white text-sm">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setStep('grade')}
                disabled={!name.trim()}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-base font-tajawal shadow-lg"
              >
                التالي - اختيار الصف
              </Button>
            </div>
          )}

          {/* Step 2: Grade & Semester */}
          {step === 'grade' && (
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 font-tajawal flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  الصف الدراسي <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGrade(g.value)}
                      className={`p-3 rounded-xl border text-sm font-tajawal transition-all ${
                        grade === g.value
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 font-tajawal">الفصل الدراسي</label>
                <div className="flex gap-3">
                  {SEMESTERS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSemester(s.value)}
                      className={`flex-1 p-4 rounded-xl border text-sm font-tajawal transition-all ${
                        semester === s.value
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('info')}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl text-base font-tajawal"
                >
                  السابق
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  disabled={!grade}
                  className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-base font-tajawal shadow-lg"
                >
                  التالي - تأكيد
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 font-tajawal text-center">تأكيد البيانات</h3>

              <div className="space-y-4 bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 font-tajawal">{name}</p>
                    <p className="text-sm text-gray-500 font-tajawal">طالب جديد</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <span className="text-gray-400 font-tajawal block mb-1">الصف</span>
                    <span className="font-bold text-gray-800 font-tajawal">
                      {GRADES.find(g => g.value === grade)?.label}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <span className="text-gray-400 font-tajawal block mb-1">الفصل</span>
                    <span className="font-bold text-gray-800 font-tajawal">
                      {SEMESTERS.find(s => s.value === semester)?.label}
                    </span>
                  </div>
                </div>

                {guardianContact && (
                  <div className="bg-white rounded-lg p-3 border border-gray-100 text-sm">
                    <span className="text-gray-400 font-tajawal block mb-1">تواصل ولي الأمر</span>
                    <span className="font-bold text-gray-800" dir="ltr">{guardianContact}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-tajawal">{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('grade')}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl text-base font-tajawal"
                >
                  تعديل
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white rounded-xl text-base font-tajawal shadow-lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الإنشاء...
                    </span>
                  ) : (
                    'إنشاء الحساب وبدء التعلم 🚀'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Demo Mode Notice */}
          <div className="text-center">
            <p className="text-xs text-gray-400 font-tajawal">
              لديك حساب بالفعل؟{' '}
              <button onClick={() => navigate('/login')} className="text-indigo-600 hover:underline font-medium">
                تسجيل الدخول
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}