// ═══════════════════════════════════════════════════════════════════════════
// Template Inspector - Phase 3A Visual Validation
// Lightweight inspector to verify Subject Cognitive Templates are correct
// NOT a full admin UI - just a validation/preview tool
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OMAN_GRADES, getSubjectsForGrade } from '@/data/omanCurriculumData';
import { 
  getSubjectTemplate, 
  type SubjectTemplate, 
  type CognitivePattern 
} from '@/lib/subjectCognitiveTemplates';
import { 
  getSubjectInteractions, 
  getSubjectSessionFlow, 
  hasSubjectTemplate, 
  INTERACTION_TYPE_EMOJIS 
} from '@/lib/interactionService';

export default function TemplateInspector() {
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);

  // Get subjects available for selected grade
  const availableSubjects = useMemo(() => {
    return getSubjectsForGrade(selectedGrade);
  }, [selectedGrade]);

  // Auto-select first subject when grade changes
  useMemo(() => {
    if (availableSubjects.length > 0 && !availableSubjects.find(s => s.name === selectedSubject)) {
      setSelectedSubject(availableSubjects[0].name);
    }
  }, [availableSubjects, selectedSubject]);

  // Get template for current selection
  const template: SubjectTemplate | null = useMemo(() => {
    if (!selectedSubject) return null;
    return getSubjectTemplate(selectedSubject, selectedGrade);
  }, [selectedSubject, selectedGrade]);

  // Check if template exists
  const templateExists = useMemo(() => {
    if (!selectedSubject) return false;
    return hasSubjectTemplate(selectedSubject, selectedGrade);
  }, [selectedSubject, selectedGrade]);

  // Get interactions from interactionService
  const interactions = useMemo(() => {
    if (!selectedSubject) return [];
    return getSubjectInteractions(selectedSubject, selectedGrade, 5);
  }, [selectedSubject, selectedGrade]);

  // Get session flow
  const sessionFlow = useMemo(() => {
    if (!selectedSubject) return [];
    return getSubjectSessionFlow(selectedSubject, selectedGrade);
  }, [selectedSubject, selectedGrade]);

  // Validation checks
  const validationResults = useMemo(() => {
    const results: { label: string; pass: boolean; detail: string }[] = [];

    if (!selectedSubject) return results;

    // Check 1: Template exists
    results.push({
      label: 'القالب موجود',
      pass: templateExists,
      detail: templateExists ? 'تم العثور على قالب مطابق' : 'لا يوجد قالب لهذا المزيج'
    });

    // Check 2: Patterns available
    const hasPatterns = template !== null && template.patterns.length > 0;
    results.push({
      label: 'أنماط تفاعلية',
      pass: hasPatterns,
      detail: hasPatterns ? `${template!.patterns.length} نمط متاح` : 'لا توجد أنماط'
    });

    // Check 3: Session flow defined
    const hasFlow = sessionFlow.length > 0;
    results.push({
      label: 'تدفق الجلسة',
      pass: hasFlow,
      detail: hasFlow ? `${sessionFlow.length} خطوات` : 'لا يوجد تدفق محدد'
    });

    // Check 4: Grade range valid
    const gradeValid = template !== null && selectedGrade >= template.gradeFrom && selectedGrade <= template.gradeTo;
    results.push({
      label: 'نطاق الصف',
      pass: gradeValid,
      detail: gradeValid ? `الصف ${selectedGrade} ضمن النطاق ${template!.gradeFrom}-${template!.gradeTo}` : 'الصف خارج النطاق'
    });

    // Check 5: Interactions generated
    const hasInteractions = interactions.length > 0;
    results.push({
      label: 'توليد التفاعلات',
      pass: hasInteractions,
      detail: hasInteractions ? `${interactions.length} تفاعل تم توليده` : 'فشل التوليد'
    });

    // Check 6: All patterns have valid interaction types
    const validTypes = ['drag_drop', 'multiple_choice', 'fill_blank', 'matching', 'sorting', 'true_false', 'drawing', 'counting', 'pattern_recognition', 'memory_game'];
    const allValid = template?.patterns.every(p => validTypes.includes(p.interactionType)) ?? false;
    results.push({
      label: 'أنواع التفاعل صالحة',
      pass: allValid,
      detail: allValid ? 'جميع الأنواع معروفة' : 'بعض الأنواع غير معروفة'
    });

    return results;
  }, [selectedSubject, selectedGrade, template, templateExists, sessionFlow, interactions]);

  const allPassed = validationResults.length > 0 && validationResults.every(r => r.pass);
  const someFailed = validationResults.some(r => !r.pass);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-tajawal" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← رجوع
            </button>
            <h1 className="text-lg font-bold text-slate-800">🔍 مفتش القوالب المعرفية</h1>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">أداة تحقق</span>
          </div>
          <div className="text-xs text-slate-400">Phase 3A Validation</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Selection Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">⚙️ اختيار المعايير</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Grade Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">الصف الدراسي</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {OMAN_GRADES.map(g => (
                  <option key={g.number} value={g.number}>
                    {g.label} (الصف {g.number})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">المادة الدراسية</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableSubjects.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">الفصل الدراسي</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>الفصل الأول</option>
                <option value={2}>الفصل الثاني</option>
              </select>
            </div>
          </div>
        </div>

        {/* Validation Status Banner */}
        <div className={`rounded-xl border p-4 ${
          allPassed 
            ? 'bg-emerald-50 border-emerald-200' 
            : someFailed 
              ? 'bg-red-50 border-red-200' 
              : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {allPassed ? '✅' : someFailed ? '❌' : '⏳'}
            </span>
            <div>
              <h3 className={`font-bold text-sm ${
                allPassed ? 'text-emerald-800' : someFailed ? 'text-red-800' : 'text-slate-800'
              }`}>
                {allPassed 
                  ? 'جميع الفحوصات ناجحة - القالب صالح' 
                  : someFailed 
                    ? 'فشل بعض الفحوصات - مزيج غير صالح' 
                    : 'في انتظار الاختيار'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                الصف {selectedGrade} | {selectedSubject || '—'} | الفصل {selectedSemester}
              </p>
            </div>
          </div>
        </div>

        {/* Validation Checks */}
        {validationResults.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-3">📋 نتائج الفحص</h2>
            <div className="space-y-2">
              {validationResults.map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  r.pass ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <span>{r.pass ? '✅' : '❌'}</span>
                    <span className="text-sm font-medium text-slate-700">{r.label}</span>
                  </div>
                  <span className={`text-xs ${r.pass ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Template Details (only if template exists) */}
        {template && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Template Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 mb-3">📄 القالب النشط</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-slate-500">المادة:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{template.subjectName}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-slate-500">بالإنجليزية:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{template.subjectNameEn}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-slate-500">نطاق الصفوف:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{template.gradeFrom} - {template.gradeTo}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <span className="text-slate-500">عدد الأنماط:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{template.patterns.length}</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <span className="text-xs text-blue-600 font-medium">المنهجية التعليمية:</span>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">{template.approach}</p>
                </div>
              </div>
            </div>

            {/* Session Flow */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 mb-3">🔄 تدفق الجلسة</h2>
              {sessionFlow.length > 0 ? (
                <div className="space-y-1.5">
                  {sessionFlow.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm">
                        {INTERACTION_TYPE_EMOJIS[step] || '📝'}
                      </span>
                      <span className="text-xs text-slate-700 font-medium">{step}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">لا يوجد تدفق محدد</p>
              )}
            </div>
          </div>
        )}

        {/* Cognitive Patterns Table */}
        {template && template.patterns.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-3">🧩 الأنماط المعرفية المتاحة</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">#</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">النوع</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">التسمية</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">المهارة المعرفية</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">الوزن</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {template.patterns.map((pattern: CognitivePattern, i: number) => {
                    const validTypes = ['drag_drop', 'multiple_choice', 'fill_blank', 'matching', 'sorting', 'true_false', 'drawing', 'counting', 'pattern_recognition', 'memory_game'];
                    const isValid = validTypes.includes(pattern.interactionType);
                    return (
                      <tr key={i} className={`border-b border-slate-100 ${!isValid ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1">
                            <span>{INTERACTION_TYPE_EMOJIS[pattern.interactionType] || '❓'}</span>
                            <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                              {pattern.interactionType}
                            </code>
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">{pattern.label}</td>
                        <td className="py-2 px-3 text-slate-600">{pattern.cognitiveSkill}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${Math.min(pattern.weight * 20, 100)}%` }}
                              />
                            </div>
                            <span className="text-slate-500">{pattern.weight}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✓ صالح
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              ✗ غير صالح
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invalid Combination Warning */}
        {!templateExists && selectedSubject && (
          <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6 text-center">
            <span className="text-4xl">🚫</span>
            <h3 className="text-base font-bold text-red-800 mt-3">مزيج غير صالح</h3>
            <p className="text-sm text-red-600 mt-2">
              لا يوجد قالب معرفي للمادة "{selectedSubject}" في الصف {selectedGrade}
            </p>
            <div className="mt-4 bg-white rounded-lg p-3 border border-red-100 max-w-md mx-auto">
              <p className="text-xs text-slate-600">
                <strong>السبب المحتمل:</strong> هذه المادة غير متاحة لهذا الصف في المنهج العماني، 
                أو لم يتم إنشاء قالب لهذا النطاق بعد.
              </p>
            </div>
          </div>
        )}

        {/* Generated Interactions Preview */}
        {interactions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-3">🎲 عينة تفاعلات مولّدة (5 تفاعلات)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {interactions.map((type, i) => (
                <div key={i} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100 text-center">
                  <span className="text-2xl">{INTERACTION_TYPE_EMOJIS[type] || '📝'}</span>
                  <p className="text-[10px] text-indigo-700 font-medium mt-1.5">{type}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">تفاعل #{i + 1}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage Matrix */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-3">📊 مصفوفة التغطية (جميع الصفوف × المواد)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-right py-1.5 px-2 text-slate-500">المادة</th>
                  {OMAN_GRADES.map(g => (
                    <th key={g.number} className={`text-center py-1.5 px-1 ${
                      g.number === selectedGrade ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500'
                    }`}>
                      {g.number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Get all unique subjects */}
                {(() => {
                  const allSubjects = new Set<string>();
                  OMAN_GRADES.forEach(g => {
                    getSubjectsForGrade(g.number).forEach(s => allSubjects.add(s.name));
                  });
                  return Array.from(allSubjects).map(subj => (
                    <tr key={subj} className={`border-b border-slate-50 ${
                      subj === selectedSubject ? 'bg-blue-50' : ''
                    }`}>
                      <td className="py-1.5 px-2 font-medium text-slate-700 whitespace-nowrap">{subj}</td>
                      {OMAN_GRADES.map(g => {
                        const has = hasSubjectTemplate(subj, g.number);
                        const isSubjectForGrade = getSubjectsForGrade(g.number).some(s => s.name === subj);
                        const isCurrent = subj === selectedSubject && g.number === selectedGrade;
                        return (
                          <td key={g.number} className={`text-center py-1.5 px-1 ${
                            isCurrent ? 'bg-blue-100 ring-2 ring-blue-400 rounded' : ''
                          }`}>
                            {!isSubjectForGrade ? (
                              <span className="text-slate-300">—</span>
                            ) : has ? (
                              <span className="text-emerald-500">✓</span>
                            ) : (
                              <span className="text-red-400">✗</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">
            ✓ = قالب متاح | ✗ = مادة متاحة بدون قالب | — = مادة غير متاحة لهذا الصف
          </p>
        </div>
      </main>
    </div>
  );
}