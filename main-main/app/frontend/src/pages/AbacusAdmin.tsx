// Abacus Educational Intelligence Management Layer
// Full level/exercise management with progression config, skill linking, adaptive pacing
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Settings, Brain, Users, Plus, X, Edit2, Trash2, CheckCircle, Archive, Link2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  type AbacusLevel, type AbacusExercise, type AbacusModuleConfig, type AbacusOperationType,
  type AbacusLevelStatus, type DifficultyLevel,
  ABACUS_OPERATION_OPTIONS, SKILL_DOMAINS, GRADE_OPTIONS,
} from '@/lib/educationalIntelligenceConfig';

// ═══════════════════════════════════════════════════════
// INITIAL DATA
// ═══════════════════════════════════════════════════════
const INITIAL_CONFIG: AbacusModuleConfig = {
  enabled: true,
  levels: [
    {
      id: 'AB-L1', stage: 1, title: 'Number Representation', titleAr: 'تمثيل الأعداد', description: 'تعلم تمثيل الأعداد على المعداد',
      icon: '🔢', exercises: [
        { id: 'AB-E1-1', levelId: 'AB-L1', title: 'تمثيل أعداد 1-5', instruction: 'حرّك الخرزات لتمثيل العدد المطلوب', operationType: 'represent', minValue: 1, maxValue: 5, operand1Range: [1, 5], operand2Range: [0, 0], difficulty: 1, timeLimit: 0, hintsAllowed: 3, showAbacus: true, skillMapping: { skillId: 'AB-001', skillName: 'تمثيل الأعداد على المعداد', domain: 'abacus', subDomain: 'represent' }, curriculumMapping: { grade: 1, semester: 1, unit: 'المعداد', lesson: 'تمثيل الأعداد', subject: 'math' }, masteryThreshold: 80, requiredStreak: 3, adaptiveSpeedUp: true, status: 'published', order: 1 },
        { id: 'AB-E1-2', levelId: 'AB-L1', title: 'تمثيل أعداد 6-9', instruction: 'مثّل الأعداد الأكبر باستخدام خرزة الخمسات', operationType: 'represent', minValue: 6, maxValue: 9, operand1Range: [6, 9], operand2Range: [0, 0], difficulty: 2, timeLimit: 30, hintsAllowed: 2, showAbacus: true, skillMapping: { skillId: 'AB-001', skillName: 'تمثيل الأعداد على المعداد', domain: 'abacus', subDomain: 'represent' }, curriculumMapping: { grade: 1, semester: 1, unit: 'المعداد', lesson: 'تمثيل الأعداد', subject: 'math' }, masteryThreshold: 80, requiredStreak: 3, adaptiveSpeedUp: true, status: 'published', order: 2 },
      ],
      prerequisiteLevels: [], masteryThreshold: 80, requiredExercises: 2, adaptivePacing: true,
      remediationPath: [], linkedSkills: ['AB-001', 'G1-N-001'], grade: 1, status: 'published', order: 1,
    },
    {
      id: 'AB-L2', stage: 2, title: 'Number Reading', titleAr: 'قراءة الأعداد', description: 'تعلم قراءة الأعداد من المعداد',
      icon: '👁️', exercises: [
        { id: 'AB-E2-1', levelId: 'AB-L2', title: 'قراءة أعداد بسيطة', instruction: 'انظر للمعداد واكتب العدد', operationType: 'read', minValue: 1, maxValue: 9, operand1Range: [1, 9], operand2Range: [0, 0], difficulty: 1, timeLimit: 15, hintsAllowed: 2, showAbacus: true, skillMapping: { skillId: 'AB-002', skillName: 'قراءة الأعداد من المعداد', domain: 'abacus', subDomain: 'read' }, curriculumMapping: { grade: 1, semester: 1, unit: 'المعداد', lesson: 'قراءة الأعداد', subject: 'math' }, masteryThreshold: 85, requiredStreak: 4, adaptiveSpeedUp: true, status: 'published', order: 1 },
      ],
      prerequisiteLevels: ['AB-L1'], masteryThreshold: 85, requiredExercises: 1, adaptivePacing: true,
      remediationPath: ['AB-L1'], linkedSkills: ['AB-002'], grade: 1, status: 'published', order: 2,
    },
    {
      id: 'AB-L3', stage: 3, title: 'Basic Addition', titleAr: 'الجمع الأساسي', description: 'جمع أعداد بسيطة على المعداد',
      icon: '➕', exercises: [
        { id: 'AB-E3-1', levelId: 'AB-L3', title: 'جمع بدون حمل', instruction: 'أضف العدد الثاني للعدد الأول على المعداد', operationType: 'add', minValue: 1, maxValue: 9, operand1Range: [1, 4], operand2Range: [1, 4], difficulty: 2, timeLimit: 30, hintsAllowed: 2, showAbacus: true, skillMapping: { skillId: 'AB-003', skillName: 'الجمع البسيط بالمعداد', domain: 'abacus', subDomain: 'addition' }, curriculumMapping: { grade: 1, semester: 1, unit: 'المعداد', lesson: 'الجمع', subject: 'math' }, masteryThreshold: 75, requiredStreak: 3, adaptiveSpeedUp: true, status: 'published', order: 1 },
      ],
      prerequisiteLevels: ['AB-L1', 'AB-L2'], masteryThreshold: 75, requiredExercises: 1, adaptivePacing: true,
      remediationPath: ['AB-L1'], linkedSkills: ['AB-003', 'G1-N-002'], grade: 1, status: 'published', order: 3,
    },
    {
      id: 'AB-L4', stage: 4, title: 'Basic Subtraction', titleAr: 'الطرح الأساسي', description: 'طرح أعداد بسيطة على المعداد',
      icon: '➖', exercises: [
        { id: 'AB-E4-1', levelId: 'AB-L4', title: 'طرح بدون استلاف', instruction: 'اطرح العدد الثاني من الأول', operationType: 'subtract', minValue: 1, maxValue: 9, operand1Range: [5, 9], operand2Range: [1, 4], difficulty: 2, timeLimit: 30, hintsAllowed: 2, showAbacus: true, skillMapping: { skillId: 'AB-004', skillName: 'الطرح البسيط بالمعداد', domain: 'abacus', subDomain: 'subtraction' }, curriculumMapping: { grade: 1, semester: 1, unit: 'المعداد', lesson: 'الطرح', subject: 'math' }, masteryThreshold: 75, requiredStreak: 3, adaptiveSpeedUp: true, status: 'published', order: 1 },
      ],
      prerequisiteLevels: ['AB-L3'], masteryThreshold: 75, requiredExercises: 1, adaptivePacing: true,
      remediationPath: ['AB-L3', 'AB-L1'], linkedSkills: ['AB-004', 'G1-N-003'], grade: 1, status: 'published', order: 4,
    },
    {
      id: 'AB-L5', stage: 5, title: 'Place Value', titleAr: 'القيمة المكانية', description: 'فهم العشرات والآحاد على المعداد',
      icon: '🏗️', exercises: [
        { id: 'AB-E5-1', levelId: 'AB-L5', title: 'تمثيل أعداد من خانتين', instruction: 'مثّل العدد باستخدام عمود العشرات والآحاد', operationType: 'place_value', minValue: 10, maxValue: 99, operand1Range: [10, 99], operand2Range: [0, 0], difficulty: 3, timeLimit: 45, hintsAllowed: 2, showAbacus: true, skillMapping: { skillId: 'AB-005', skillName: 'القيمة المكانية بالمعداد', domain: 'abacus', subDomain: 'place_value' }, curriculumMapping: { grade: 1, semester: 2, unit: 'المعداد', lesson: 'القيمة المكانية', subject: 'math' }, masteryThreshold: 70, requiredStreak: 3, adaptiveSpeedUp: true, status: 'published', order: 1 },
      ],
      prerequisiteLevels: ['AB-L3', 'AB-L4'], masteryThreshold: 70, requiredExercises: 1, adaptivePacing: true,
      remediationPath: ['AB-L1', 'AB-L2'], linkedSkills: ['AB-005', 'G1-N-021'], grade: 1, status: 'published', order: 5,
    },
    {
      id: 'AB-L6', stage: 6, title: 'Mental Visualization', titleAr: 'التصور الذهني', description: 'الانتقال من المعداد المرئي للحساب الذهني',
      icon: '🧠', exercises: [
        { id: 'AB-E6-1', levelId: 'AB-L6', title: 'تصور جزئي', instruction: 'تخيّل المعداد وأجب', operationType: 'mental_viz', minValue: 1, maxValue: 20, operand1Range: [3, 9], operand2Range: [2, 8], difficulty: 4, timeLimit: 20, hintsAllowed: 1, showAbacus: false, skillMapping: { skillId: 'AB-007', skillName: 'الحساب الذهني بالمعداد', domain: 'abacus', subDomain: 'mental_math' }, curriculumMapping: { grade: 2, semester: 1, unit: 'المعداد المتقدم', lesson: 'التصور الذهني', subject: 'math' }, masteryThreshold: 65, requiredStreak: 3, adaptiveSpeedUp: false, status: 'published', order: 1 },
      ],
      prerequisiteLevels: ['AB-L5'], masteryThreshold: 65, requiredExercises: 1, adaptivePacing: true,
      remediationPath: ['AB-L5', 'AB-L3'], linkedSkills: ['AB-007'], grade: 2, status: 'published', order: 6,
    },
    {
      id: 'AB-L7', stage: 7, title: 'Fast Mental Math', titleAr: 'الحساب الذهني السريع', description: 'سرعة ودقة في الحساب الذهني',
      icon: '⚡', exercises: [
        { id: 'AB-E7-1', levelId: 'AB-L7', title: 'تدريب السرعة', instruction: 'أجب بأسرع ما يمكن', operationType: 'fast_mental', minValue: 1, maxValue: 50, operand1Range: [5, 20], operand2Range: [3, 15], difficulty: 5, timeLimit: 10, hintsAllowed: 0, showAbacus: false, skillMapping: { skillId: 'AB-007', skillName: 'الحساب الذهني بالمعداد', domain: 'abacus', subDomain: 'speed_drill' }, curriculumMapping: { grade: 2, semester: 1, unit: 'المعداد المتقدم', lesson: 'السرعة الذهنية', subject: 'math' }, masteryThreshold: 60, requiredStreak: 5, adaptiveSpeedUp: false, status: 'published', order: 1 },
      ],
      prerequisiteLevels: ['AB-L6'], masteryThreshold: 60, requiredExercises: 1, adaptivePacing: true,
      remediationPath: ['AB-L6', 'AB-L5'], linkedSkills: ['AB-007'], grade: 2, status: 'published', order: 7,
    },
  ],
  globalSettings: {
    questionsPerSession: 6,
    maxHintsPerSession: 3,
    adaptiveEnabled: true,
    mentalTransitionStage: 6,
    maxDifficulty: 5,
    sessionCooldown: 30,
    maxSessionsPerDay: 3,
  },
};

// Mock student performance data
const MOCK_STUDENTS = [
  { name: 'أحمد محمد', grade: 1 as const, currentStage: 4, mastery: 72, sessions: 12, lastActive: '2026-05-22', weakAreas: ['الحمل', 'القيمة المكانية'] },
  { name: 'فاطمة علي', grade: 1 as const, currentStage: 6, mastery: 88, sessions: 24, lastActive: '2026-05-23', weakAreas: ['الاستلاف'] },
  { name: 'عمر خالد', grade: 1 as const, currentStage: 2, mastery: 45, sessions: 4, lastActive: '2026-05-20', weakAreas: ['التعرف البطيء', 'القيمة المكانية'] },
  { name: 'نورة سعيد', grade: 2 as const, currentStage: 7, mastery: 92, sessions: 30, lastActive: '2026-05-24', weakAreas: [] },
];

// ═══════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════
function SettingToggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-100">
      <div>
        <p className="text-sm font-bold text-slate-700 font-tajawal">{label}</p>
        <p className="text-[10px] text-slate-400 font-tajawal">{description}</p>
      </div>
      <button onClick={() => onChange(!value)}>
        {value ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
      </button>
    </div>
  );
}

function SettingNumber({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100">
      <label className="block text-sm font-bold text-slate-700 mb-2 font-tajawal">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-center text-sm font-bold" min={min} max={max} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LEVEL EDITOR MODAL
// ═══════════════════════════════════════════════════════
function LevelEditorModal({ level, existingLevels, onSave, onClose }: {
  level: AbacusLevel | null;
  existingLevels: AbacusLevel[];
  onSave: (l: AbacusLevel) => void;
  onClose: () => void;
}) {
  const isNew = !level;
  const [form, setForm] = useState<AbacusLevel>(level || {
    id: `AB-L${existingLevels.length + 1}`, stage: existingLevels.length + 1, title: '', titleAr: '', description: '',
    icon: '📘', exercises: [], prerequisiteLevels: [], masteryThreshold: 75, requiredExercises: 1,
    adaptivePacing: true, remediationPath: [], linkedSkills: [], grade: 1, status: 'draft', order: existingLevels.length + 1,
  });

  const abacusSkills = SKILL_DOMAINS.find(d => d.id === 'abacus')?.skills || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 font-tajawal">{isNew ? 'إنشاء مستوى جديد' : 'تعديل المستوى'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">العنوان بالعربية *</label>
              <Input value={form.titleAr} onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))} className="font-tajawal text-sm" dir="rtl" />
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الأيقونة</label>
              <Input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} className="text-center text-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الوصف</label>
            <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="font-tajawal text-sm" dir="rtl" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">المرحلة</label>
              <input type="number" value={form.stage} onChange={e => setForm(p => ({ ...p, stage: parseInt(e.target.value) || 1 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" min={1} max={20} />
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الصف</label>
              <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: parseInt(e.target.value) as 1 | 2 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">نسبة الإتقان %</label>
              <input type="number" value={form.masteryThreshold} onChange={e => setForm(p => ({ ...p, masteryThreshold: parseInt(e.target.value) || 70 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" min={50} max={100} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">المتطلبات السابقة</label>
            <div className="flex flex-wrap gap-1">
              {existingLevels.filter(l => l.id !== form.id).map(l => (
                <button key={l.id} onClick={() => {
                  const prereqs = form.prerequisiteLevels.includes(l.id)
                    ? form.prerequisiteLevels.filter(id => id !== l.id)
                    : [...form.prerequisiteLevels, l.id];
                  setForm(p => ({ ...p, prerequisiteLevels: prereqs }));
                }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-tajawal ${form.prerequisiteLevels.includes(l.id) ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {l.icon} {l.titleAr}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">مسار العلاج (عند الفشل)</label>
            <div className="flex flex-wrap gap-1">
              {existingLevels.filter(l => l.id !== form.id).map(l => (
                <button key={l.id} onClick={() => {
                  const path = form.remediationPath.includes(l.id)
                    ? form.remediationPath.filter(id => id !== l.id)
                    : [...form.remediationPath, l.id];
                  setForm(p => ({ ...p, remediationPath: path }));
                }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-tajawal ${form.remediationPath.includes(l.id) ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {l.icon} {l.titleAr}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">المهارات المرتبطة</label>
            <div className="flex flex-wrap gap-1">
              {abacusSkills.map(s => (
                <button key={s.id} onClick={() => {
                  const skills = form.linkedSkills.includes(s.id)
                    ? form.linkedSkills.filter(id => id !== s.id)
                    : [...form.linkedSkills, s.id];
                  setForm(p => ({ ...p, linkedSkills: skills }));
                }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-tajawal ${form.linkedSkills.includes(s.id) ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <SettingToggle label="التسارع التكيفي" description="تخطي التمارين عند الإتقان السريع"
            value={form.adaptivePacing} onChange={v => setForm(p => ({ ...p, adaptivePacing: v }))} />
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الحالة</label>
            <div className="flex gap-2">
              {(['draft', 'published'] as AbacusLevelStatus[]).map(s => (
                <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${form.status === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {s === 'draft' ? 'مسودة' : 'نشر'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="font-tajawal">إلغاء</Button>
            <Button onClick={() => onSave(form)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-tajawal" disabled={!form.titleAr.trim()}>
              {isNew ? 'إنشاء' : 'حفظ'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EXERCISE EDITOR MODAL
// ═══════════════════════════════════════════════════════
function ExerciseEditorModal({ exercise, levelId, onSave, onClose }: {
  exercise: AbacusExercise | null;
  levelId: string;
  onSave: (e: AbacusExercise, levelId: string) => void;
  onClose: () => void;
}) {
  const isNew = !exercise;
  const [form, setForm] = useState<AbacusExercise>(exercise || {
    id: `AB-E-${Date.now()}`, levelId, title: '', instruction: '', operationType: 'represent',
    minValue: 1, maxValue: 9, operand1Range: [1, 9], operand2Range: [0, 0],
    difficulty: 1, timeLimit: 0, hintsAllowed: 2, showAbacus: true,
    skillMapping: { skillId: 'AB-001', skillName: 'تمثيل الأعداد على المعداد', domain: 'abacus', subDomain: '' },
    curriculumMapping: { grade: 1, semester: 1, unit: 'المعداد', lesson: '', subject: 'math' },
    masteryThreshold: 75, requiredStreak: 3, adaptiveSpeedUp: true, status: 'draft', order: 1,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 font-tajawal">{isNew ? 'إنشاء تمرين جديد' : 'تعديل التمرين'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">عنوان التمرين *</label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="font-tajawal text-sm" dir="rtl" />
          </div>
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">التعليمات</label>
            <Input value={form.instruction} onChange={e => setForm(p => ({ ...p, instruction: e.target.value }))} className="font-tajawal text-sm" dir="rtl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">نوع العملية</label>
              <select value={form.operationType} onChange={e => setForm(p => ({ ...p, operationType: e.target.value as AbacusOperationType }))}
                className="w-full border rounded-lg px-2 py-1.5 text-xs font-tajawal" dir="rtl">
                {ABACUS_OPERATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الصعوبة (1-5)</label>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as DifficultyLevel[]).map(d => (
                  <button key={d} onClick={() => setForm(p => ({ ...p, difficulty: d }))}
                    className={`w-7 h-7 rounded-lg text-xs font-bold ${form.difficulty === d ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600'}`}>{d}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الحد الأدنى</label>
              <input type="number" value={form.minValue} onChange={e => setForm(p => ({ ...p, minValue: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" />
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الحد الأقصى</label>
              <input type="number" value={form.maxValue} onChange={e => setForm(p => ({ ...p, maxValue: parseInt(e.target.value) || 9 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الزمن (ثانية)</label>
              <input type="number" value={form.timeLimit} onChange={e => setForm(p => ({ ...p, timeLimit: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" min={0} />
              <p className="text-[9px] text-gray-400 font-tajawal">0 = بلا حد</p>
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">التلميحات</label>
              <input type="number" value={form.hintsAllowed} onChange={e => setForm(p => ({ ...p, hintsAllowed: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" min={0} max={5} />
            </div>
            <div>
              <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">نسبة الإتقان %</label>
              <input type="number" value={form.masteryThreshold} onChange={e => setForm(p => ({ ...p, masteryThreshold: parseInt(e.target.value) || 70 }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" min={50} max={100} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-tajawal">
              <input type="checkbox" checked={form.showAbacus} onChange={e => setForm(p => ({ ...p, showAbacus: e.target.checked }))} className="rounded" />
              إظهار المعداد
            </label>
            <label className="flex items-center gap-2 text-xs font-tajawal">
              <input type="checkbox" checked={form.adaptiveSpeedUp} onChange={e => setForm(p => ({ ...p, adaptiveSpeedUp: e.target.checked }))} className="rounded" />
              تسريع تكيفي
            </label>
          </div>
          <div>
            <label className="text-xs font-bold font-tajawal text-gray-600 mb-1 block">الحالة</label>
            <div className="flex gap-2">
              {(['draft', 'published'] as AbacusLevelStatus[]).map(s => (
                <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${form.status === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {s === 'draft' ? 'مسودة' : 'نشر'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="font-tajawal">إلغاء</Button>
            <Button onClick={() => onSave(form, levelId)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-tajawal" disabled={!form.title.trim()}>
              {isNew ? 'إنشاء' : 'حفظ'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function AbacusAdmin() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AbacusModuleConfig>(INITIAL_CONFIG);
  const [showLevelEditor, setShowLevelEditor] = useState(false);
  const [showExerciseEditor, setShowExerciseEditor] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AbacusLevel | null>(null);
  const [editingExercise, setEditingExercise] = useState<{ exercise: AbacusExercise | null; levelId: string }>({ exercise: null, levelId: '' });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Level CRUD
  const handleSaveLevel = (level: AbacusLevel) => {
    setConfig(prev => {
      const exists = prev.levels.find(l => l.id === level.id);
      const levels = exists ? prev.levels.map(l => l.id === level.id ? level : l) : [...prev.levels, level];
      return { ...prev, levels };
    });
    setShowLevelEditor(false);
    setEditingLevel(null);
    showToast('تم حفظ المستوى');
  };

  const handleDeleteLevel = (id: string) => {
    setConfig(prev => ({ ...prev, levels: prev.levels.filter(l => l.id !== id) }));
    showToast('تم حذف المستوى');
  };

  const handleToggleLevelStatus = (id: string) => {
    setConfig(prev => ({
      ...prev,
      levels: prev.levels.map(l => l.id === id ? { ...l, status: (l.status === 'published' ? 'archived' : 'published') as AbacusLevelStatus } : l),
    }));
  };

  // Exercise CRUD
  const handleSaveExercise = (exercise: AbacusExercise, levelId: string) => {
    setConfig(prev => ({
      ...prev,
      levels: prev.levels.map(l => {
        if (l.id !== levelId) return l;
        const exists = l.exercises.find(e => e.id === exercise.id);
        const exercises = exists ? l.exercises.map(e => e.id === exercise.id ? exercise : e) : [...l.exercises, exercise];
        return { ...l, exercises };
      }),
    }));
    setShowExerciseEditor(false);
    setEditingExercise({ exercise: null, levelId: '' });
    showToast('تم حفظ التمرين');
  };

  const handleDeleteExercise = (levelId: string, exerciseId: string) => {
    setConfig(prev => ({
      ...prev,
      levels: prev.levels.map(l => l.id === levelId ? { ...l, exercises: l.exercises.filter(e => e.id !== exerciseId) } : l),
    }));
    showToast('تم حذف التمرين');
  };

  // Global settings
  const updateGlobalSetting = <K extends keyof AbacusModuleConfig['globalSettings']>(key: K, value: AbacusModuleConfig['globalSettings'][K]) => {
    setConfig(prev => ({ ...prev, globalSettings: { ...prev.globalSettings, [key]: value } }));
  };

  const stats = useMemo(() => ({
    totalLevels: config.levels.length,
    publishedLevels: config.levels.filter(l => l.status === 'published').length,
    totalExercises: config.levels.reduce((sum, l) => sum + l.exercises.length, 0),
    activeStudents: MOCK_STUDENTS.length,
    avgMastery: Math.round(MOCK_STUDENTS.reduce((s, st) => s + st.mastery, 0) / MOCK_STUDENTS.length),
  }), [config]);

  return (
    <div className="space-y-5 pb-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 shadow-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-bold text-green-700 font-tajawal">{toast}</span>
          </div>
        </div>
      )}

      {/* Level Editor Modal */}
      {showLevelEditor && (
        <LevelEditorModal level={editingLevel} existingLevels={config.levels} onSave={handleSaveLevel} onClose={() => { setShowLevelEditor(false); setEditingLevel(null); }} />
      )}

      {/* Exercise Editor Modal */}
      {showExerciseEditor && (
        <ExerciseEditorModal exercise={editingExercise.exercise} levelId={editingExercise.levelId} onSave={handleSaveExercise} onClose={() => { setShowExerciseEditor(false); setEditingExercise({ exercise: null, levelId: '' }); }} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
              🧮 إدارة المعداد الذكي
            </h1>
            <p className="text-sm text-gray-400 font-tajawal">{stats.totalLevels} مستوى • {stats.totalExercises} تمرين • {stats.activeStudents} طالب نشط</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-tajawal font-bold ${config.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {config.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {config.enabled ? 'مفعّل' : 'معطّل'}
          </button>
          <Button onClick={() => { setEditingLevel(null); setShowLevelEditor(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-tajawal text-xs">
            <Plus className="w-4 h-4 ml-1" />
            مستوى جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card className="p-3 text-center"><p className="text-lg font-bold text-indigo-600">{stats.totalLevels}</p><p className="text-[10px] text-gray-400 font-tajawal">مستويات</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-green-600">{stats.publishedLevels}</p><p className="text-[10px] text-gray-400 font-tajawal">منشور</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-blue-600">{stats.totalExercises}</p><p className="text-[10px] text-gray-400 font-tajawal">تمارين</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-purple-600">{stats.activeStudents}</p><p className="text-[10px] text-gray-400 font-tajawal">طلاب</p></Card>
        <Card className="p-3 text-center"><p className="text-lg font-bold text-amber-600">{stats.avgMastery}%</p><p className="text-[10px] text-gray-400 font-tajawal">متوسط الإتقان</p></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="levels">
        <TabsList className="bg-white border">
          <TabsTrigger value="levels" className="font-tajawal text-xs">المستويات والتمارين</TabsTrigger>
          <TabsTrigger value="students" className="font-tajawal text-xs">أداء الطلاب</TabsTrigger>
          <TabsTrigger value="adaptive" className="font-tajawal text-xs">التكيف والعلاج</TabsTrigger>
          <TabsTrigger value="settings" className="font-tajawal text-xs">الإعدادات</TabsTrigger>
        </TabsList>

        {/* Levels Tab */}
        <TabsContent value="levels" className="mt-4 space-y-3">
          {config.levels.sort((a, b) => a.order - b.order).map(level => (
            <Card key={level.id} className={`p-4 ${level.status === 'archived' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{level.icon}</span>
                  <div>
                    <h3 className="font-bold font-tajawal text-sm flex items-center gap-2">
                      المرحلة {level.stage}: {level.titleAr}
                      <Badge className={`text-[9px] ${level.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {level.status === 'published' ? 'منشور' : level.status === 'archived' ? 'مؤرشف' : 'مسودة'}
                      </Badge>
                      <Badge className="bg-blue-50 text-blue-600 text-[9px]">ص{level.grade}</Badge>
                    </h3>
                    <p className="text-xs text-gray-400 font-tajawal">{level.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 font-tajawal">
                      <span>إتقان: {level.masteryThreshold}%</span>
                      <span>•</span>
                      <span>تمارين: {level.exercises.length}</span>
                      <span>•</span>
                      <span>مهارات: {level.linkedSkills.join(', ')}</span>
                      {level.adaptivePacing && <Badge className="bg-purple-50 text-purple-600 text-[8px]">تكيفي</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleLevelStatus(level.id)} className="p-1.5 rounded-lg hover:bg-gray-100" title="تبديل الحالة">
                    {level.status === 'published' ? <Archive className="w-3.5 h-3.5 text-slate-400" /> : <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                  </button>
                  <button onClick={() => { setEditingLevel(level); setShowLevelEditor(true); }} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500" title="تعديل"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteLevel(level.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Exercises */}
              <div className="space-y-1.5 mr-8">
                {level.exercises.sort((a, b) => a.order - b.order).map(ex => (
                  <div key={ex.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{ABACUS_OPERATION_OPTIONS.find(o => o.value === ex.operationType)?.icon}</span>
                      <div>
                        <p className="text-xs font-medium font-tajawal">{ex.title}</p>
                        <p className="text-[9px] text-gray-400 font-tajawal">
                          نطاق: {ex.minValue}-{ex.maxValue} • صعوبة: {ex.difficulty} • زمن: {ex.timeLimit || '∞'}ث • إتقان: {ex.masteryThreshold}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-[8px] ${ex.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ex.status === 'published' ? 'منشور' : 'مسودة'}
                      </Badge>
                      <button onClick={() => { setEditingExercise({ exercise: ex, levelId: level.id }); setShowExerciseEditor(true); }}
                        className="p-1 rounded hover:bg-indigo-50"><Edit2 className="w-3 h-3 text-indigo-400" /></button>
                      <button onClick={() => handleDeleteExercise(level.id, ex.id)}
                        className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => { setEditingExercise({ exercise: null, levelId: level.id }); setShowExerciseEditor(true); }}
                  className="w-full p-2 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 font-tajawal hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  <Plus className="w-3 h-3 inline ml-1" />إضافة تمرين
                </button>
              </div>

              {/* Prerequisites and Remediation */}
              {(level.prerequisiteLevels.length > 0 || level.remediationPath.length > 0) && (
                <div className="mt-3 mr-8 flex flex-wrap gap-2 text-[9px] font-tajawal">
                  {level.prerequisiteLevels.length > 0 && (
                    <span className="text-teal-600">🔗 متطلبات: {level.prerequisiteLevels.map(id => config.levels.find(l => l.id === id)?.titleAr || id).join('، ')}</span>
                  )}
                  {level.remediationPath.length > 0 && (
                    <span className="text-amber-600">💊 علاج: {level.remediationPath.map(id => config.levels.find(l => l.id === id)?.titleAr || id).join('، ')}</span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              أداء الطلاب في المعداد
            </h3>
            {MOCK_STUDENTS.map((st, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold font-tajawal">{st.name}</p>
                    <p className="text-[10px] text-gray-400 font-tajawal">ص{st.grade} • المرحلة {st.currentStage} • {st.sessions} جلسة • آخر نشاط: {st.lastActive}</p>
                  </div>
                  <div className="text-left">
                    <p className={`text-lg font-bold ${st.mastery >= 80 ? 'text-green-600' : st.mastery >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{st.mastery}%</p>
                    <p className="text-[9px] text-gray-400">إتقان</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full">
                  <div className={`h-full rounded-full ${st.mastery >= 80 ? 'bg-green-400' : st.mastery >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${st.mastery}%` }} />
                </div>
                {st.weakAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {st.weakAreas.map((w, j) => <Badge key={j} className="bg-orange-100 text-orange-700 text-[9px]">{w}</Badge>)}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* Adaptive Tab */}
        <TabsContent value="adaptive" className="mt-4 space-y-3">
          <Card className="p-4">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-500" />
              التكامل التكيفي
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                <h4 className="text-xs font-bold text-purple-700 font-tajawal mb-2">🎯 محرك التوصيات</h4>
                <p className="text-[10px] text-gray-600 font-tajawal">يختار المستوى والتمرين المناسب بناءً على: الإتقان الحالي، أنماط الأخطاء، سرعة الاستجابة، مستوى الإرهاق</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <h4 className="text-xs font-bold text-amber-700 font-tajawal mb-2">💊 مسارات العلاج</h4>
                <p className="text-[10px] text-gray-600 font-tajawal">عند الفشل المتكرر، يُرجع الطالب لمستوى سابق محدد تلقائياً من مسار العلاج المحدد لكل مستوى</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                <h4 className="text-xs font-bold text-teal-700 font-tajawal mb-2">🔗 شبكة المتطلبات</h4>
                <p className="text-[10px] text-gray-600 font-tajawal">كل مستوى مرتبط بمتطلبات سابقة. لا يُفتح المستوى إلا بعد إتقان المتطلبات</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <h4 className="text-xs font-bold text-blue-700 font-tajawal mb-2">⚡ التسريع التكيفي</h4>
                <p className="text-[10px] text-gray-600 font-tajawal">عند الإتقان السريع، يتخطى التمارين المتكررة وينتقل للمستوى التالي تلقائياً</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5 text-teal-500" />
              ربط المهارات
            </h3>
            <div className="space-y-2">
              {config.levels.filter(l => l.status === 'published').map(level => (
                <div key={level.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <span className="text-xs font-tajawal font-medium">{level.icon} {level.titleAr}</span>
                  <div className="flex gap-1">
                    {level.linkedSkills.map(skillId => {
                      const skill = SKILL_DOMAINS.flatMap(d => d.skills).find(s => s.id === skillId);
                      return <Badge key={skillId} className="bg-teal-100 text-teal-700 text-[8px]">{skill?.name || skillId}</Badge>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              الإعدادات العامة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingToggle label="التكيف التلقائي" description="تعديل الصعوبة تلقائياً حسب أداء الطالب"
                value={config.globalSettings.adaptiveEnabled} onChange={v => updateGlobalSetting('adaptiveEnabled', v)} />
              <SettingNumber label="أسئلة لكل جلسة" value={config.globalSettings.questionsPerSession} min={3} max={15}
                onChange={v => updateGlobalSetting('questionsPerSession', v)} />
              <SettingNumber label="أقصى تلميحات لكل جلسة" value={config.globalSettings.maxHintsPerSession} min={0} max={10}
                onChange={v => updateGlobalSetting('maxHintsPerSession', v)} />
              <SettingNumber label="مرحلة الانتقال الذهني" value={config.globalSettings.mentalTransitionStage} min={4} max={7}
                onChange={v => updateGlobalSetting('mentalTransitionStage', v)} />
              <SettingNumber label="أقصى صعوبة" value={config.globalSettings.maxDifficulty} min={3} max={5}
                onChange={v => updateGlobalSetting('maxDifficulty', v as DifficultyLevel)} />
              <SettingNumber label="فترة الراحة (دقائق)" value={config.globalSettings.sessionCooldown} min={10} max={120}
                onChange={v => updateGlobalSetting('sessionCooldown', v)} />
              <SettingNumber label="أقصى جلسات يومياً" value={config.globalSettings.maxSessionsPerDay} min={1} max={10}
                onChange={v => updateGlobalSetting('maxSessionsPerDay', v)} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}