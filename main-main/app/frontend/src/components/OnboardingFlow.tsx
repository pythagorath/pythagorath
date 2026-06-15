// Onboarding Flow - SIMPLIFIED for pilot
// Minimal steps, large touch targets, visual guidance for children and parents
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, ArrowLeft, Sparkles } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (data: { role: string; grade: string; name: string }) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');

  const handleStudentSelect = () => {
    setRole('student');
    setStep(1);
  };

  const handleParentSelect = () => {
    setRole('parent');
    setStep(2);
  };

  const handleGradeSelect = (g: string) => {
    setGrade(g);
    setStep(2);
  };

  const handleFinish = () => {
    const finalName = name.trim() || (role === 'parent' ? 'ولي أمر' : 'طالب');
    onComplete({ role, grade, name: finalName });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all ${
                i === step ? 'bg-blue-600 w-10' : i < step ? 'bg-blue-300 w-5' : 'bg-gray-200 w-5'
              }`}
            />
          ))}
        </div>

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="absolute top-5 right-5 p-3 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="رجوع"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
        )}

        {/* Step 0: Who are you? */}
        {step === 0 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 font-tajawal">مرحباً! 🎉</h1>
            <p className="text-gray-600 font-tajawal text-lg">من أنت؟</p>

            <div className="space-y-4 pt-2">
              <button
                onClick={handleStudentSelect}
                className="w-full p-5 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-4 touch-manipulation active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-7 h-7 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800 font-tajawal text-xl">أنا طالب 📚</p>
                  <p className="text-sm text-gray-500 font-tajawal">أريد أن أتعلم وأحل التمارين</p>
                </div>
              </button>

              <button
                onClick={handleParentSelect}
                className="w-full p-5 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all flex items-center gap-4 touch-manipulation active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7 text-green-600" />
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800 font-tajawal text-xl">ولي أمر 👨‍👩‍👧</p>
                  <p className="text-sm text-gray-500 font-tajawal">أريد متابعة تقدم ابني/ابنتي</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Grade selection (students only) */}
        {step === 1 && role === 'student' && (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 font-tajawal">في أي صف أنت؟ 🏫</h2>
            <p className="text-gray-500 font-tajawal">اختر صفك لنبدأ معاً</p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => handleGradeSelect('grade1')}
                className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center touch-manipulation active:scale-[0.97]"
              >
                <span className="text-5xl block mb-3">1️⃣</span>
                <p className="font-bold text-gray-800 font-tajawal text-lg">الصف الأول</p>
              </button>
              <button
                onClick={() => handleGradeSelect('grade2')}
                className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center touch-manipulation active:scale-[0.97]"
              >
                <span className="text-5xl block mb-3">2️⃣</span>
                <p className="font-bold text-gray-800 font-tajawal text-lg">الصف الثاني</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Name + Start */}
        {step === 2 && (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 font-tajawal">
              {role === 'student' ? 'ما اسمك يا بطل؟ 🌟' : 'ما اسمك؟'}
            </h2>
            <p className="text-gray-500 font-tajawal">
              {role === 'student'
                ? 'سنستخدم اسمك لتشجيعك!'
                : 'لنتعرف عليك'}
            </p>

            <div className="space-y-5 pt-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'student' ? 'اكتب اسمك هنا...' : 'اسمك...'}
                className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-right font-tajawal text-xl text-center"
                dir="rtl"
                autoFocus
              />

              <Button
                onClick={handleFinish}
                className="w-full py-4 text-xl h-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl font-tajawal touch-manipulation"
              >
                {role === 'student' ? '🚀 ابدأ المهمة الأولى!' : '✨ دخول المنصة'}
              </Button>

              {role === 'student' && (
                <p className="text-xs text-gray-400 font-tajawal">
                  💡 المهمة الأولى: 3 أسئلة سهلة فقط!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}