// Pythagorath Academy - Professional Landing Page
// Unified visual language with the entire platform
import { useNavigate } from 'react-router-dom';
import {
  Brain, Target, Sparkles, Zap, Users, Shield,
  ArrowLeft, CheckCircle2, BarChart3, BookOpen, GraduationCap
} from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'تعلم مبني على المهارات', desc: 'كل مهارة تُبنى على ما قبلها بتسلسل منطقي', color: 'from-blue-500 to-indigo-600' },
  { icon: Target, title: 'تكيفي وذكي', desc: 'يتكيف مع مستوى الطالب وسرعته تلقائياً', color: 'from-purple-500 to-violet-600' },
  { icon: Sparkles, title: 'مسار مخصص', desc: 'كل طالب يحصل على مسار تعلم فريد', color: 'from-amber-500 to-orange-600' },
  { icon: Zap, title: 'تعلم ذاتي', desc: 'الطالب يتقدم باستقلالية بدون انتظار', color: 'from-green-500 to-emerald-600' },
];

const HOW_IT_WORKS = [
  { step: '١', title: 'تقييم سريع', desc: 'أسئلة بسيطة لفهم المستوى' },
  { step: '٢', title: 'مسار مخصص', desc: 'بناء خطة تعلم فريدة' },
  { step: '٣', title: 'مهام يومية', desc: 'أنشطة قصيرة ومركزة' },
  { step: '٤', title: 'تقدم مستمر', desc: 'متابعة وتكيف دائم' },
];

const VALUE_STUDENT = [
  'تعلم بسرعتك الخاصة',
  'مهام ممتعة ومتنوعة',
  'تشجيع مستمر وإنجازات',
  'لا ضغط ولا مقارنات',
];

const VALUE_PARENT = [
  'متابعة دقيقة لتقدم ابنك',
  'تقارير واضحة عن نقاط القوة',
  'توصيات عملية يومية',
  'اطمئنان على المسار التعليمي',
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-sm">🦉</span>
            </div>
            <div>
              <span className="font-bold text-gray-800 font-tajawal text-sm">فيثاغورث</span>
              <span className="block text-[10px] text-gray-400 font-tajawal -mt-0.5">Pythagorath Academy</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium font-tajawal hover:shadow-lg hover:shadow-indigo-200/50 transition-all"
          >
            دخول
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-600 font-tajawal">نظام تعلم ذكي ومتكيف</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 font-tajawal leading-tight mb-5">
            كل طفل يتعلم<br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">بطريقته الخاصة</span>
          </h1>
          <p className="text-lg text-gray-500 font-tajawal max-w-2xl mx-auto leading-relaxed mb-8">
            أكاديمية فيثاغورث تبني مسار تعلم فريد لكل طالب، يتكيف مع مستواه وسرعته، ويضمن إتقان كل مهارة قبل الانتقال للتالية
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-xl text-base font-bold font-tajawal hover:shadow-xl hover:shadow-indigo-200/50 transition-all flex items-center justify-center gap-2"
            >
              ابدأ الآن
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto bg-gray-50 text-gray-700 px-8 py-3.5 rounded-xl text-base font-medium font-tajawal hover:bg-gray-100 transition-colors border border-gray-200"
            >
              تجربة مجانية
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-5 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-tajawal mb-3">ما الذي يميز فيثاغورث؟</h2>
            <p className="text-sm text-gray-500 font-tajawal">نظام تعليمي مبني على أحدث أبحاث التعلم التكيفي</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300 group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 font-tajawal mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 font-tajawal leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-tajawal mb-3">كيف يعمل؟</h2>
            <p className="text-sm text-gray-500 font-tajawal">٤ خطوات بسيطة نحو تعلم فعّال</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-200/50">
                  <span className="text-xl font-bold text-indigo-600">{item.step}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-800 font-tajawal mb-1">{item.title}</h4>
                <p className="text-xs text-gray-500 font-tajawal">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-16 px-5 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For Students */}
          <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 font-tajawal">للطالب</h3>
            </div>
            <div className="space-y-3">
              {VALUE_STUDENT.map((v) => (
                <div key={v} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-sm text-gray-600 font-tajawal">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* For Parents */}
          <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 font-tajawal">لولي الأمر</h3>
            </div>
            <div className="space-y-3">
              {VALUE_PARENT.map((v) => (
                <div key={v} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-sm text-gray-600 font-tajawal">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-10 shadow-2xl shadow-indigo-200/40">
            <h2 className="text-2xl md:text-3xl font-bold text-white font-tajawal mb-4">
              ابدأ رحلة التعلم الذكي
            </h2>
            <p className="text-indigo-100 font-tajawal mb-8 text-sm">
              انضم لأكاديمية فيثاغورث واكتشف كيف يمكن لابنك أن يتعلم بثقة واستقلالية
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-white text-indigo-700 px-8 py-3.5 rounded-xl text-base font-bold font-tajawal hover:shadow-lg transition-all"
            >
              ابدأ مجاناً
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center">
              <span className="text-xs">🦉</span>
            </div>
            <span className="text-sm font-bold text-gray-700 font-tajawal">أكاديمية فيثاغورث</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400 font-tajawal">
            <span>© 2026</span>
            <span>•</span>
            <span>نظام تعلم ذكي ومتكيف</span>
            <span>•</span>
            <span>خصوصية كاملة</span>
          </div>
        </div>
      </footer>
    </div>
  );
}