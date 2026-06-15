// Admin CRUD Panel - Full curriculum management with backend integration
// Multi-country architecture: supports country/curriculum filtering
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InteractionRenderer } from '@/components/InteractionToolkit';
import {
  Plus, Search, Edit, Trash2, X, Save, Loader2,
  GraduationCap, BookOpen, Layers, FileText, Brain, HelpCircle,
  ChevronDown, RefreshCw, Eye, Globe, Flag, Upload, Link as LinkIcon,
  CheckCircle, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { INTERACTION_TYPE_LABELS, INTERACTION_TYPE_EMOJIS } from '@/lib/interactionService';
import { fetchCountries, fetchCurricula, type Country, type Curriculum } from '@/lib/contentService';

interface AdminCRUDProps {
  tab?: string;
}

// Types
interface Grade { id: number; name: string; display_order: number; status: string; country_id?: number; curriculum_id?: number; }
interface Semester { id: number; name: string; grade_id: number; display_order: number; status: string; country_id?: number; curriculum_id?: number; }
interface Subject { id: number; name: string; grade_id: number; semester_id: number; description: string; icon: string; display_order: number; status: string; country_id?: number; curriculum_id?: number; }
interface Unit { id: number; name: string; subject_id: number; display_order: number; description: string; status: string; country_id?: number; curriculum_id?: number; }
interface Lesson { id: number; title: string; unit_id: number; objectives: string; content_type: string; display_order: number; status: string; country_id?: number; curriculum_id?: number; }
interface Skill { id: number; name: string; grade_id: number; semester_id: number; subject_id: number; unit_id: number; lesson_id: number; domain: string; difficulty: string; mastery_threshold: number; status: string; country_id?: number; curriculum_id?: number; }
interface Question { id: number; skill_id: number; question_text: string; question_type: string; difficulty: string; options: string; correct_answer: string; explanation: string; status: string; config_json: string; country_id?: number; curriculum_id?: number; }

type EntityType = 'grades' | 'semesters' | 'admin_subjects' | 'units' | 'admin_lessons' | 'admin_skills' | 'admin_questions' | 'countries' | 'curricula';

// All interaction types
const INTERACTION_TYPES = [
  { value: 'tap', label: 'اضغط للاختيار 👆' },
  { value: 'drag_drop', label: 'سحب وترتيب 🔀' },
  { value: 'matching', label: 'توصيل 🔗' },
  { value: 'number_line', label: 'خط الأعداد 📏' },
  { value: 'counting_blocks', label: 'عدّ المكعبات 🧱' },
  { value: 'missing_number', label: 'العدد الناقص ❓' },
  { value: 'sequence_ordering', label: 'ترتيب تسلسلي 📋' },
  { value: 'shape_grouping', label: 'تصنيف أشكال 🔷' },
  { value: 'analog_clock', label: 'الساعة التناظرية 🕐' },
  { value: 'coin_money', label: 'النقود والعملات 💰' },
];

// ===== Dynamic Config Builders per Interaction Type =====

interface ConfigBuilderProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

function TapConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const items = (config.items as Array<{ id: number; label: string; value: number }>) || [
    { id: 1, label: '٥', value: 5 },
    { id: 2, label: '٨', value: 8 },
    { id: 3, label: '١٠', value: 10 },
    { id: 4, label: '٣', value: 3 },
  ];
  const correctId = (config.correct_id as number) || 1;
  const instruction = (config.instruction as string) || '';

  const updateItem = (idx: number, field: string, val: string) => {
    const newItems = [...items];
    if (field === 'label') newItems[idx] = { ...newItems[idx], label: val };
    else if (field === 'value') newItems[idx] = { ...newItems[idx], value: Number(val) || 0 };
    onChange({ ...config, items: newItems });
  };

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    onChange({ ...config, items: [...items, { id: newId, label: '', value: 0 }] });
  };

  const removeItem = (idx: number) => {
    const newItems = items.filter((_, i) => i !== idx);
    onChange({ ...config, items: newItems });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: اضغط على الإجابة الصحيحة" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الخيارات</label>
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <Input value={item.label} onChange={(e) => updateItem(idx, 'label', e.target.value)} className="text-sm flex-1 font-tajawal" dir="rtl" placeholder="النص المعروض" />
            <Input type="number" value={item.value} onChange={(e) => updateItem(idx, 'value', e.target.value)} className="text-sm w-20" placeholder="القيمة" />
            <button onClick={() => onChange({ ...config, correct_id: item.id })} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ${correctId === item.id ? 'border-green-500 bg-green-100 text-green-700' : 'border-gray-300 text-gray-400'}`} title="الإجابة الصحيحة">✓</button>
            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem} className="text-xs font-tajawal text-indigo-600">+ إضافة خيار</Button>
      </div>
    </div>
  );
}

function NumberLineConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const min = (config.min as number) ?? 0;
  const max = (config.max as number) ?? 10;
  const target = (config.target as number) ?? 5;
  const tolerance = (config.tolerance as number) ?? 0.5;
  const instruction = (config.instruction as string) || '';

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: حدد العدد ٥ على خط الأعداد" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الحد الأدنى</label>
          <Input type="number" value={min} onChange={(e) => onChange({ ...config, min: Number(e.target.value) })} className="text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الحد الأقصى</label>
          <Input type="number" value={max} onChange={(e) => onChange({ ...config, max: Number(e.target.value) })} className="text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">العدد المطلوب (الهدف)</label>
          <Input type="number" value={target} onChange={(e) => onChange({ ...config, target: Number(e.target.value) })} className="text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">هامش القبول</label>
          <Input type="number" step="0.1" value={tolerance} onChange={(e) => onChange({ ...config, tolerance: Number(e.target.value) })} className="text-sm" />
        </div>
      </div>
      {/* Visual preview of number line config */}
      <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
        <p className="text-xs text-teal-700 font-tajawal mb-2">معاينة سريعة:</p>
        <div className="relative h-2 bg-teal-200 rounded-full mx-4">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(m => (
            <div key={m} className="absolute -top-1" style={{ left: `${((m - min) / (max - min)) * 100}%`, transform: 'translateX(-50%)' }}>
              <div className="w-0.5 h-4 bg-teal-400" />
              <span className="text-[9px] text-gray-500 absolute -translate-x-1/2 mt-0.5">{m}</span>
            </div>
          ))}
          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-teal-500 rounded-full border-2 border-white shadow" style={{ left: `${((target - min) / (max - min)) * 100}%`, transform: 'translate(-50%, -50%)' }} />
        </div>
        <p className="text-[10px] text-teal-600 font-tajawal mt-4 text-center">الهدف: {target}</p>
      </div>
    </div>
  );
}

function DragDropConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const items = (config.items as Array<{ id: number; label: string; value: number }>) || [
    { id: 1, label: '٣', value: 3 },
    { id: 2, label: '١', value: 1 },
    { id: 3, label: '٢', value: 2 },
  ];
  const correctOrder = (config.correct_order as number[]) || items.map(i => i.id);
  const instruction = (config.instruction as string) || '';

  const updateItem = (idx: number, field: string, val: string) => {
    const newItems = [...items];
    if (field === 'label') newItems[idx] = { ...newItems[idx], label: val };
    else if (field === 'value') newItems[idx] = { ...newItems[idx], value: Number(val) || 0 };
    onChange({ ...config, items: newItems });
  };

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    const newItems = [...items, { id: newId, label: '', value: 0 }];
    onChange({ ...config, items: newItems, correct_order: [...correctOrder, newId] });
  };

  const removeItem = (idx: number) => {
    const removedId = items[idx].id;
    const newItems = items.filter((_, i) => i !== idx);
    const newOrder = correctOrder.filter(id => id !== removedId);
    onChange({ ...config, items: newItems, correct_order: newOrder });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: رتّب الأعداد من الأصغر إلى الأكبر" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">العناصر (بالترتيب الصحيح)</label>
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
            <Input value={item.label} onChange={(e) => updateItem(idx, 'label', e.target.value)} className="text-sm flex-1 font-tajawal" dir="rtl" placeholder="النص" />
            <Input type="number" value={item.value} onChange={(e) => updateItem(idx, 'value', e.target.value)} className="text-sm w-20" placeholder="القيمة" />
            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem} className="text-xs font-tajawal text-indigo-600">+ إضافة عنصر</Button>
        <p className="text-[10px] text-gray-400 font-tajawal mt-1">ترتيب العناصر أعلاه هو الترتيب الصحيح المطلوب</p>
      </div>
    </div>
  );
}

function MatchingConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const pairs = (config.pairs as Array<{ left: { id: number; label: string }; right: { id: string; label: string } }>) || [
    { left: { id: 1, label: '٢+٣' }, right: { id: 'a', label: '٥' } },
    { left: { id: 2, label: '٤+١' }, right: { id: 'b', label: '٥' } },
  ];
  const instruction = (config.instruction as string) || '';

  const updatePair = (idx: number, side: 'left' | 'right', val: string) => {
    const newPairs = [...pairs];
    if (side === 'left') newPairs[idx] = { ...newPairs[idx], left: { ...newPairs[idx].left, label: val } };
    else newPairs[idx] = { ...newPairs[idx], right: { ...newPairs[idx].right, label: val } };
    onChange({ ...config, pairs: newPairs });
  };

  const addPair = () => {
    const newId = pairs.length + 1;
    onChange({ ...config, pairs: [...pairs, { left: { id: newId, label: '' }, right: { id: String.fromCharCode(96 + newId), label: '' } }] });
  };

  const removePair = (idx: number) => {
    onChange({ ...config, pairs: pairs.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: صِل كل عملية بنتيجتها" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الأزواج (يسار ↔ يمين)</label>
        {pairs.map((pair, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input value={pair.left.label} onChange={(e) => updatePair(idx, 'left', e.target.value)} className="text-sm flex-1 font-tajawal" dir="rtl" placeholder="السؤال" />
            <span className="text-gray-400">↔</span>
            <Input value={pair.right.label} onChange={(e) => updatePair(idx, 'right', e.target.value)} className="text-sm flex-1 font-tajawal" dir="rtl" placeholder="الإجابة" />
            <button onClick={() => removePair(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addPair} className="text-xs font-tajawal text-indigo-600">+ إضافة زوج</Button>
      </div>
    </div>
  );
}

function CountingBlocksConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const count = (config.count as number) ?? 5;
  const color = (config.color as string) || 'blue';
  const options = (config.options as number[]) || [3, 5, 7, 4];
  const correct = (config.correct as number) ?? count;
  const instruction = (config.instruction as string) || '';

  const colors = ['blue', 'red', 'green', 'purple', 'orange'];
  const colorLabels: Record<string, string> = { blue: 'أزرق', red: 'أحمر', green: 'أخضر', purple: 'بنفسجي', orange: 'برتقالي' };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: كم عدد المكعبات؟" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">عدد المكعبات المعروضة</label>
          <Input type="number" value={count} onChange={(e) => onChange({ ...config, count: Number(e.target.value), correct: Number(e.target.value) })} className="text-sm" min={1} max={20} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">اللون</label>
          <select className="w-full text-sm border border-gray-200 rounded-md p-2 font-tajawal" value={color} onChange={(e) => onChange({ ...config, color: e.target.value })}>
            {colors.map(c => <option key={c} value={c}>{colorLabels[c]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">خيارات الإجابة (أرقام مفصولة بفاصلة)</label>
        <Input value={options.join(', ')} onChange={(e) => {
          const nums = e.target.value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
          onChange({ ...config, options: nums });
        }} className="text-sm" dir="ltr" placeholder="3, 5, 7, 4" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الإجابة الصحيحة</label>
        <Input type="number" value={correct} onChange={(e) => onChange({ ...config, correct: Number(e.target.value) })} className="text-sm" />
      </div>
      {/* Mini preview */}
      <div className="bg-sky-50 rounded-lg p-3 border border-sky-100">
        <p className="text-xs text-sky-700 font-tajawal mb-2">معاينة:</p>
        <div className="flex flex-wrap gap-1 justify-center">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={`w-6 h-6 rounded bg-${color}-400 border border-white shadow-sm`} style={{ backgroundColor: { blue: '#60a5fa', red: '#f87171', green: '#4ade80', purple: '#c084fc', orange: '#fb923c' }[color] }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MissingNumberConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const sequence = (config.sequence as Array<number | null>) || [1, 2, null, 4, 5];
  const correct = (config.correct as number) ?? 3;
  const instruction = (config.instruction as string) || '';

  const updateSequence = (val: string) => {
    const parts = val.split(',').map(s => {
      const trimmed = s.trim();
      if (trimmed === '?' || trimmed === 'null' || trimmed === '') return null;
      return Number(trimmed);
    });
    onChange({ ...config, sequence: parts });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: أكمل العدد الناقص" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التسلسل (استخدم ? للعدد الناقص)</label>
        <Input value={sequence.map(n => n === null ? '?' : n).join(', ')} onChange={(e) => updateSequence(e.target.value)} className="text-sm" dir="ltr" placeholder="1, 2, ?, 4, 5" />
        <p className="text-[10px] text-gray-400 font-tajawal mt-1">مثال: 1, 2, ?, 4, 5 — حيث ? هو العدد الناقص</p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الإجابة الصحيحة (العدد الناقص)</label>
        <Input type="number" value={correct} onChange={(e) => onChange({ ...config, correct: Number(e.target.value) })} className="text-sm" />
      </div>
      {/* Mini preview */}
      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
        <p className="text-xs text-emerald-700 font-tajawal mb-2">معاينة:</p>
        <div className="flex gap-2 justify-center">
          {sequence.map((n, i) => (
            <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${n === null ? 'border-2 border-dashed border-emerald-400 text-emerald-500' : 'bg-white border border-gray-200 text-gray-700'}`}>
              {n === null ? '?' : n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SequenceOrderingConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const items = (config.items as Array<{ id: number; label: string }>) || [
    { id: 1, label: 'أولاً' },
    { id: 2, label: 'ثانياً' },
    { id: 3, label: 'ثالثاً' },
  ];
  const correctOrder = (config.correct_order as number[]) || items.map(i => i.id);
  const instruction = (config.instruction as string) || '';

  const updateItem = (idx: number, val: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], label: val };
    onChange({ ...config, items: newItems });
  };

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    onChange({ ...config, items: [...items, { id: newId, label: '' }], correct_order: [...correctOrder, newId] });
  };

  const removeItem = (idx: number) => {
    const removedId = items[idx].id;
    const newItems = items.filter((_, i) => i !== idx);
    const newOrder = correctOrder.filter(id => id !== removedId);
    onChange({ ...config, items: newItems, correct_order: newOrder });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: رتّب الخطوات بالترتيب الصحيح" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">العناصر (بالترتيب الصحيح)</label>
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
            <Input value={item.label} onChange={(e) => updateItem(idx, e.target.value)} className="text-sm flex-1 font-tajawal" dir="rtl" placeholder="العنصر" />
            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem} className="text-xs font-tajawal text-indigo-600">+ إضافة عنصر</Button>
      </div>
    </div>
  );
}

function ShapeGroupingConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const shapes = (config.shapes as Array<{ id: number; type: string; color: string }>) || [
    { id: 1, type: 'circle', color: 'red' },
    { id: 2, type: 'square', color: 'blue' },
    { id: 3, type: 'circle', color: 'green' },
  ];
  const groups = (config.groups as Array<{ id: string; label: string; correct_ids: number[] }>) || [
    { id: 'circles', label: 'الدوائر', correct_ids: [1, 3] },
    { id: 'squares', label: 'المربعات', correct_ids: [2] },
  ];
  const instruction = (config.instruction as string) || '';

  const shapeTypes = ['circle', 'square', 'triangle'];
  const shapeLabels: Record<string, string> = { circle: 'دائرة', square: 'مربع', triangle: 'مثلث' };
  const colorOptions = ['red', 'blue', 'green', 'purple', 'orange'];
  const colorLabels: Record<string, string> = { red: 'أحمر', blue: 'أزرق', green: 'أخضر', purple: 'بنفسجي', orange: 'برتقالي' };

  const updateShape = (idx: number, field: string, val: string) => {
    const newShapes = [...shapes];
    if (field === 'type') newShapes[idx] = { ...newShapes[idx], type: val };
    else if (field === 'color') newShapes[idx] = { ...newShapes[idx], color: val };
    onChange({ ...config, shapes: newShapes });
  };

  const addShape = () => {
    const newId = Math.max(...shapes.map(s => s.id), 0) + 1;
    onChange({ ...config, shapes: [...shapes, { id: newId, type: 'circle', color: 'red' }] });
  };

  const updateGroup = (idx: number, field: string, val: string) => {
    const newGroups = [...groups];
    if (field === 'label') newGroups[idx] = { ...newGroups[idx], label: val };
    else if (field === 'correct_ids') {
      newGroups[idx] = { ...newGroups[idx], correct_ids: val.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)) };
    }
    onChange({ ...config, groups: newGroups });
  };

  const addGroup = () => {
    const newId = `group_${groups.length + 1}`;
    onChange({ ...config, groups: [...groups, { id: newId, label: '', correct_ids: [] }] });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: صنّف الأشكال حسب نوعها" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الأشكال</label>
        {shapes.map((shape, idx) => (
          <div key={shape.id} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400 w-5">#{shape.id}</span>
            <select className="text-sm border border-gray-200 rounded p-1.5 font-tajawal" value={shape.type} onChange={(e) => updateShape(idx, 'type', e.target.value)}>
              {shapeTypes.map(t => <option key={t} value={t}>{shapeLabels[t]}</option>)}
            </select>
            <select className="text-sm border border-gray-200 rounded p-1.5 font-tajawal" value={shape.color} onChange={(e) => updateShape(idx, 'color', e.target.value)}>
              {colorOptions.map(c => <option key={c} value={c}>{colorLabels[c]}</option>)}
            </select>
            <button onClick={() => onChange({ ...config, shapes: shapes.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addShape} className="text-xs font-tajawal text-indigo-600">+ إضافة شكل</Button>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">المجموعات</label>
        {groups.map((group, idx) => (
          <div key={group.id} className="flex items-center gap-2 mb-2">
            <Input value={group.label} onChange={(e) => updateGroup(idx, 'label', e.target.value)} className="text-sm flex-1 font-tajawal" dir="rtl" placeholder="اسم المجموعة" />
            <Input value={group.correct_ids.join(', ')} onChange={(e) => updateGroup(idx, 'correct_ids', e.target.value)} className="text-sm w-28" dir="ltr" placeholder="IDs: 1,3" />
            <button onClick={() => onChange({ ...config, groups: groups.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addGroup} className="text-xs font-tajawal text-indigo-600">+ إضافة مجموعة</Button>
      </div>
    </div>
  );
}

function AnalogClockConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const targetHour = (config.target_hour as number) ?? 3;
  const targetMinute = (config.target_minute as number) ?? 0;
  const instruction = (config.instruction as string) || '';

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: اضبط الساعة على الوقت ٣:٠٠" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الساعة المطلوبة (1-12)</label>
          <Input type="number" value={targetHour} onChange={(e) => onChange({ ...config, target_hour: Number(e.target.value) })} className="text-sm" min={1} max={12} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">الدقيقة المطلوبة (0-55)</label>
          <Input type="number" value={targetMinute} onChange={(e) => onChange({ ...config, target_minute: Number(e.target.value) })} className="text-sm" min={0} max={55} step={5} />
        </div>
      </div>
      <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 text-center">
        <p className="text-xs text-indigo-700 font-tajawal">الوقت المطلوب: {targetHour}:{String(targetMinute).padStart(2, '0')}</p>
      </div>
    </div>
  );
}

function CoinMoneyConfigBuilder({ config, onChange }: ConfigBuilderProps) {
  const targetAmount = (config.target_amount as number) ?? 10;
  const availableCoins = (config.available_coins as Array<{ value: number; label: string; count: number }>) || [
    { value: 1, label: '١ ريال', count: 5 },
    { value: 5, label: '٥ ريال', count: 3 },
    { value: 10, label: '١٠ ريال', count: 2 },
  ];
  const instruction = (config.instruction as string) || '';

  const updateCoin = (idx: number, field: string, val: string) => {
    const newCoins = [...availableCoins];
    if (field === 'value') newCoins[idx] = { ...newCoins[idx], value: Number(val) };
    else if (field === 'label') newCoins[idx] = { ...newCoins[idx], label: val };
    else if (field === 'count') newCoins[idx] = { ...newCoins[idx], count: Number(val) };
    onChange({ ...config, available_coins: newCoins });
  };

  const addCoin = () => {
    onChange({ ...config, available_coins: [...availableCoins, { value: 1, label: '١ ريال', count: 3 }] });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">التعليمات</label>
        <Input value={instruction} onChange={(e) => onChange({ ...config, instruction: e.target.value })} className="text-sm font-tajawal" dir="rtl" placeholder="مثال: اجمع المبلغ المطلوب" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">المبلغ المطلوب (ريال)</label>
        <Input type="number" value={targetAmount} onChange={(e) => onChange({ ...config, target_amount: Number(e.target.value) })} className="text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 font-tajawal block mb-1">العملات المتاحة</label>
        {availableCoins.map((coin, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input type="number" value={coin.value} onChange={(e) => updateCoin(idx, 'value', e.target.value)} className="text-sm w-16" placeholder="القيمة" />
            <Input value={coin.label} onChange={(e) => updateCoin(idx, 'label', e.target.value)} className="text-sm flex-1 font-tajawal" dir="rtl" placeholder="التسمية" />
            <Input type="number" value={coin.count} onChange={(e) => updateCoin(idx, 'count', e.target.value)} className="text-sm w-16" placeholder="العدد" />
            <button onClick={() => onChange({ ...config, available_coins: availableCoins.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addCoin} className="text-xs font-tajawal text-indigo-600">+ إضافة عملة</Button>
      </div>
    </div>
  );
}

// ===== Get default config for each interaction type =====
function getDefaultConfig(type: string): Record<string, unknown> {
  switch (type) {
    case 'tap': return { instruction: 'اختر الإجابة الصحيحة', items: [{ id: 1, label: '٥', value: 5 }, { id: 2, label: '٨', value: 8 }, { id: 3, label: '١٠', value: 10 }, { id: 4, label: '٣', value: 3 }], correct_id: 2 };
    case 'number_line': return { instruction: 'حدد العدد على خط الأعداد', min: 0, max: 10, target: 5, tolerance: 0.5 };
    case 'drag_drop': return { instruction: 'رتّب الأعداد من الأصغر إلى الأكبر', items: [{ id: 1, label: '١', value: 1 }, { id: 2, label: '٢', value: 2 }, { id: 3, label: '٣', value: 3 }], correct_order: [1, 2, 3] };
    case 'matching': return { instruction: 'صِل كل عملية بنتيجتها', pairs: [{ left: { id: 1, label: '٢+٣' }, right: { id: 'a', label: '٥' } }, { left: { id: 2, label: '٤+١' }, right: { id: 'b', label: '٥' } }] };
    case 'counting_blocks': return { instruction: 'كم عدد المكعبات؟', count: 5, color: 'blue', options: [3, 5, 7, 4], correct: 5 };
    case 'missing_number': return { instruction: 'أكمل العدد الناقص', sequence: [1, 2, null, 4, 5], correct: 3 };
    case 'sequence_ordering': return { instruction: 'رتّب العناصر بالترتيب الصحيح', items: [{ id: 1, label: 'أولاً' }, { id: 2, label: 'ثانياً' }, { id: 3, label: 'ثالثاً' }], correct_order: [1, 2, 3] };
    case 'shape_grouping': return { instruction: 'صنّف الأشكال حسب نوعها', shapes: [{ id: 1, type: 'circle', color: 'red' }, { id: 2, type: 'square', color: 'blue' }, { id: 3, type: 'circle', color: 'green' }], groups: [{ id: 'circles', label: 'الدوائر', correct_ids: [1, 3] }, { id: 'squares', label: 'المربعات', correct_ids: [2] }] };
    case 'analog_clock': return { instruction: 'اضبط الساعة على الوقت المطلوب', target_hour: 3, target_minute: 0 };
    case 'coin_money': return { instruction: 'اجمع المبلغ المطلوب', target_amount: 10, available_coins: [{ value: 1, label: '١ ريال', count: 5 }, { value: 5, label: '٥ ريال', count: 3 }, { value: 10, label: '١٠ ريال', count: 2 }] };
    default: return {};
  }
}

// ===== Main Component =====
export default function AdminCRUD({ tab }: AdminCRUDProps) {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab || 'countries');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Country/Curriculum filter state
  const [filterCountryId, setFilterCountryId] = useState<number | null>(null);
  const [filterCurriculumId, setFilterCurriculumId] = useState<number | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);

  // Data states
  const [grades, setGrades] = useState<Grade[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Interactive config state (parsed from config_json)
  const [interactionConfig, setInteractionConfig] = useState<Record<string, unknown>>({});

  // Video upload state
  const [videoUploadMode, setVideoUploadMode] = useState<'url' | 'upload'>('url');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setActiveTab(tab || 'countries');
  }, [tab]);

  // Load countries and curricula for filtering
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const c = await fetchCountries();
        setCountries(c);
        const cur = await fetchCurricula();
        setCurricula(cur);
      } catch (err) {
        console.error('Error loading filter data:', err);
      }
    };
    loadFilters();
  }, []);

  // When filter country changes, update curricula filter
  useEffect(() => {
    if (filterCountryId) {
      const filtered = curricula.filter(c => c.country_id === filterCountryId);
      if (filterCurriculumId && !filtered.find(c => c.id === filterCurriculumId)) {
        setFilterCurriculumId(null);
      }
    }
  }, [filterCountryId, curricula, filterCurriculumId]);

  // Sort field mapping
  const getSortField = (entity: EntityType): string => {
    switch (entity) {
      case 'countries': return 'display_order';
      case 'curricula': return 'display_order';
      case 'grades': return 'display_order';
      case 'units': return 'display_order';
      case 'admin_lessons': return 'display_order';
      case 'semesters': return '-id';
      case 'admin_subjects': return '-id';
      case 'admin_skills': return '-id';
      case 'admin_questions': return '-id';
      default: return '-id';
    }
  };

  // Fetch data based on active tab
  const fetchData = useCallback(async (entity: EntityType) => {
    setLoading(true);
    try {
      const query: Record<string, unknown> = {};
      if (entity !== 'countries' && entity !== 'curricula') {
        if (filterCountryId) query.country_id = filterCountryId;
        if (filterCurriculumId) query.curriculum_id = filterCurriculumId;
      }
      if (entity === 'curricula' && filterCountryId) {
        query.country_id = filterCountryId;
      }

      const sortField = getSortField(entity);
      const response = await client.entities[entity].query({ query, sort: sortField, limit: 200 });
      const items = response?.data?.items || [];
      switch (entity) {
        case 'countries': setCountries(items); break;
        case 'curricula': setCurricula(items); break;
        case 'grades': setGrades(items); break;
        case 'semesters': setSemesters(items); break;
        case 'admin_subjects': setSubjects(items); break;
        case 'units': setUnits(items); break;
        case 'admin_lessons': setLessons(items); break;
        case 'admin_skills': setSkills(items); break;
        case 'admin_questions': setQuestions(items); break;
      }
    } catch (err) {
      console.error(`Error fetching ${entity}:`, err);
      toast.error(`خطأ في تحميل البيانات`);
    } finally {
      setLoading(false);
    }
  }, [filterCountryId, filterCurriculumId]);

  useEffect(() => {
    const entityMap: Record<string, EntityType> = {
      countries: 'countries',
      curricula: 'curricula',
      grades: 'grades',
      semesters: 'semesters',
      subjects: 'admin_subjects',
      units: 'units',
      lessons: 'admin_lessons',
      skills: 'admin_skills',
      questions: 'admin_questions',
    };
    const entity = entityMap[activeTab];
    if (entity) fetchData(entity);
  }, [activeTab, fetchData]);

  // Fetch related data for dropdowns
  useEffect(() => {
    const fetchRelated = async () => {
      if (['semesters', 'subjects', 'skills'].includes(activeTab)) {
        try {
          const gr = await client.entities.grades.query({ query: {}, sort: 'display_order', limit: 100 });
          setGrades(gr?.data?.items || []);
        } catch (err) { console.error('Error fetching grades for dropdown:', err); }
      }
      if (['subjects', 'skills'].includes(activeTab)) {
        try {
          const sm = await client.entities.semesters.query({ query: {}, sort: '-id', limit: 100 });
          setSemesters(sm?.data?.items || []);
        } catch (err) { console.error('Error fetching semesters for dropdown:', err); }
      }
      if (['units', 'skills'].includes(activeTab)) {
        try {
          const sb = await client.entities.admin_subjects.query({ query: {}, sort: '-id', limit: 100 });
          setSubjects(sb?.data?.items || []);
        } catch (err) { console.error('Error fetching subjects for dropdown:', err); }
      }
      if (['lessons', 'skills'].includes(activeTab)) {
        try {
          const un = await client.entities.units.query({ query: {}, sort: 'display_order', limit: 100 });
          setUnits(un?.data?.items || []);
        } catch (err) { console.error('Error fetching units for dropdown:', err); }
      }
      if (activeTab === 'questions') {
        try {
          const sk = await client.entities.admin_skills.query({ query: {}, sort: '-id', limit: 200 });
          setSkills(sk?.data?.items || []);
        } catch (err) { console.error('Error fetching skills for dropdown:', err); }
      }
      if (['grades', 'semesters', 'subjects', 'units', 'lessons', 'skills', 'questions', 'curricula'].includes(activeTab)) {
        try {
          const co = await client.entities.countries.query({ query: {}, sort: 'display_order', limit: 50 });
          setCountries(co?.data?.items || []);
        } catch (err) { console.error('Error fetching countries for dropdown:', err); }
      }
      if (['grades', 'semesters', 'subjects', 'units', 'lessons', 'skills', 'questions'].includes(activeTab)) {
        try {
          const cu = await client.entities.curricula.query({ query: {}, sort: 'display_order', limit: 50 });
          setCurricula(cu?.data?.items || []);
        } catch (err) { console.error('Error fetching curricula for dropdown:', err); }
      }
    };
    fetchRelated();
  }, [activeTab]);

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  const getEntityName = (): EntityType => {
    const map: Record<string, EntityType> = {
      countries: 'countries',
      curricula: 'curricula',
      grades: 'grades',
      semesters: 'semesters',
      subjects: 'admin_subjects',
      units: 'units',
      lessons: 'admin_lessons',
      skills: 'admin_skills',
      questions: 'admin_questions',
    };
    return map[activeTab] || 'countries';
  };

  const handleAdd = () => {
    setEditingItem(null);
    const defaults = getDefaultFormData();
    setFormData(defaults);
    // Set default interaction config
    if (activeTab === 'questions') {
      const type = String(defaults.question_type || 'tap');
      setInteractionConfig(getDefaultConfig(type));
    }
    setShowModal(true);
    setPreviewMode(false);
    setVideoUploadMode('url');
  };

  const handleEdit = (item: Record<string, unknown>) => {
    setEditingItem(item);
    setFormData(item as Record<string, string | number | boolean>);
    // Parse existing config_json
    if (activeTab === 'questions' && item.config_json) {
      try {
        const parsed = JSON.parse(String(item.config_json));
        setInteractionConfig(parsed);
      } catch {
        setInteractionConfig(getDefaultConfig(String(item.question_type || 'tap')));
      }
    }
    setShowModal(true);
    setPreviewMode(false);
    setVideoUploadMode('url');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await client.entities[getEntityName()].delete({ id: String(id) });
      toast.success('تم الحذف بنجاح');
      fetchData(getEntityName());
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('خطأ في الحذف');
    }
  };

  // Bulk actions
  const toggleBulkSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAllFiltered = () => {
    const filtered = getFilteredItems();
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((item: Record<string, unknown>) => Number(item.id))));
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedIds.size === 0) return;
    const entity = getEntityName();
    const newStatus = publish ? 'published' : 'draft';
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await client.entities[entity].update({ id: String(id), data: { status: newStatus } });
        successCount++;
      } catch { /* continue */ }
    }
    toast.success(`تم تحديث ${successCount} عنصر إلى "${newStatus === 'published' ? 'منشور' : 'مسودة'}"`);
    setSelectedIds(new Set());
    setBulkMode(false);
    fetchData(entity);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} عنصر؟`)) return;
    const entity = getEntityName();
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await client.entities[entity].delete({ id: String(id) });
        successCount++;
      } catch { /* continue */ }
    }
    toast.success(`تم حذف ${successCount} عنصر`);
    setSelectedIds(new Set());
    setBulkMode(false);
    fetchData(entity);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entity = getEntityName();
      const payload: Record<string, unknown> = { ...formData };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.user_id;

      // Auto-inject country/curriculum filter
      if (entity !== 'countries' && entity !== 'curricula') {
        if (filterCountryId && !payload.country_id) payload.country_id = filterCountryId;
        if (filterCurriculumId && !payload.curriculum_id) payload.curriculum_id = filterCurriculumId;
      }

      // For interactive questions, build config_json from interactionConfig
      if (entity === 'admin_questions') {
        // Store the interaction config
        payload.config_json = JSON.stringify(interactionConfig);

        if (!payload.question_text || String(payload.question_text).trim() === '') {
          const typeLabel = INTERACTION_TYPE_LABELS[String(payload.question_type || 'tap')] || 'سؤال تفاعلي';
          payload.question_text = typeLabel;
        }

        // Auto-derive options and correct_answer from config
        const cfg = interactionConfig;
        if (cfg.items && Array.isArray(cfg.items)) {
          payload.options = JSON.stringify((cfg.items as Array<{ label: string }>).map(i => i.label));
        } else if (cfg.pairs && Array.isArray(cfg.pairs)) {
          payload.options = JSON.stringify((cfg.pairs as Array<{ left: { label: string } }>).map(p => p.left.label));
        } else {
          payload.options = '[]';
        }

        if (cfg.correct_id !== undefined) {
          const correctItem = (cfg.items as Array<{ id: number; label: string }>)?.find(i => i.id === cfg.correct_id);
          payload.correct_answer = correctItem?.label || String(cfg.correct_id);
        } else if (cfg.correct_order) {
          payload.correct_answer = JSON.stringify(cfg.correct_order);
        } else if (cfg.target !== undefined) {
          payload.correct_answer = String(cfg.target);
        } else if (cfg.correct !== undefined) {
          payload.correct_answer = String(cfg.correct);
        } else if (cfg.target_hour !== undefined) {
          payload.correct_answer = `${cfg.target_hour}:${String(cfg.target_minute || 0).padStart(2, '0')}`;
        } else if (cfg.target_amount !== undefined) {
          payload.correct_answer = String(cfg.target_amount);
        } else {
          payload.correct_answer = '-';
        }

        payload.skill_id = Number(payload.skill_id) || 1;
        payload.question_text = String(payload.question_text).trim() || 'سؤال تفاعلي';
        payload.question_type = String(payload.question_type || 'tap');
        payload.difficulty = String(payload.difficulty || 'easy');
        payload.options = String(payload.options || '[]');
        payload.correct_answer = String(payload.correct_answer || '-');
        payload.explanation = String(payload.explanation || '');
        payload.status = String(payload.status || 'published');
      }

      if (editingItem) {
        await client.entities[entity].update({
          id: String((editingItem as Record<string, unknown>).id),
          data: payload,
        });
        toast.success('تم التحديث بنجاح');
      } else {
        await client.entities[entity].create({ data: payload });
        toast.success('تمت الإضافة بنجاح');
      }
      setShowModal(false);
      fetchData(entity);
    } catch (err: unknown) {
      console.error('Save error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('network') || errMsg.includes('fetch')) {
        toast.error('خطأ في الاتصال - تحقق من اتصال الإنترنت');
      } else if (errMsg.includes('401') || errMsg.includes('unauthorized')) {
        toast.error('خطأ في المصادقة - يرجى تسجيل الدخول مرة أخرى');
      } else {
        toast.error('خطأ في الحفظ: ' + (errMsg.length > 100 ? errMsg.substring(0, 100) + '...' : errMsg));
      }
    } finally {
      setSaving(false);
    }
  };

  const getDefaultFormData = (): Record<string, string | number | boolean> => {
    const base: Record<string, string | number | boolean> = {};
    if (filterCountryId) base.country_id = filterCountryId;
    if (filterCurriculumId) base.curriculum_id = filterCurriculumId;

    switch (activeTab) {
      case 'countries': return { name_ar: '', name_en: '', code: '', flag_emoji: '🇸🇦', is_active: true, display_order: 1 };
      case 'curricula': return { name_ar: '', name_en: '', country_id: filterCountryId || 1, academic_year: '2025-2026', is_active: true, display_order: 1 };
      case 'grades': return { ...base, name: '', display_order: 1, status: 'draft' };
      case 'semesters': return { ...base, name: '', grade_id: 1, display_order: 1, status: 'draft' };
      case 'subjects': return { ...base, name: '', grade_id: 1, semester_id: 1, description: '', icon: '📐', display_order: 1, status: 'draft' };
      case 'units': return { ...base, name: '', subject_id: 1, display_order: 1, description: '', status: 'draft' };
      case 'lessons': return { ...base, title: '', unit_id: 1, objectives: '', content_type: 'video', display_order: 1, status: 'draft', video_url: '' };
      case 'skills': return { ...base, name: '', grade_id: 1, semester_id: 1, subject_id: 1, unit_id: 1, lesson_id: 0, domain: 'الأعداد والعمليات', difficulty: 'easy', mastery_threshold: 80, status: 'draft' };
      case 'questions': return { ...base, skill_id: 1, question_text: '', question_type: 'tap', difficulty: 'easy', options: '[]', correct_answer: '', explanation: '', config_json: '{}', status: 'draft' };
      default: return {};
    }
  };

  const getTabLabel = () => {
    const labels: Record<string, string> = {
      countries: 'الدول',
      curricula: 'المناهج',
      grades: 'الصفوف',
      semesters: 'الفصول الدراسية',
      subjects: 'المواد',
      units: 'الوحدات',
      lessons: 'الدروس',
      skills: 'المهارات',
      questions: 'الأسئلة التفاعلية',
    };
    return labels[activeTab] || '';
  };

  const getCountryName = (id?: number) => {
    if (!id) return '-';
    const c = countries.find(co => co.id === id);
    return c ? `${c.flag_emoji} ${c.name_ar}` : String(id);
  };

  const getCurriculumName = (id?: number) => {
    if (!id) return '-';
    const c = curricula.find(cu => cu.id === id);
    return c ? c.name_ar : String(id);
  };

  // Handle video file upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('يرجى اختيار ملف فيديو صالح');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('حجم الملف يتجاوز الحد المسموح (100 ميجابايت)');
      return;
    }

    setUploadingVideo(true);
    try {
      // Upload to Atoms Cloud file storage
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await client.storage.upload({
        bucket: 'lesson-videos',
        file: file,
        path: `lessons/${Date.now()}_${file.name}`,
      });

      if (response?.url) {
        setFormData({ ...formData, video_url: response.url });
        toast.success('تم رفع الفيديو بنجاح');
      } else {
        // Fallback: create object URL for preview (won't persist)
        const url = URL.createObjectURL(file);
        setFormData({ ...formData, video_url: url });
        toast.success('تم تحميل الفيديو محلياً');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      // Fallback: use local file reference
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, video_url: url });
      toast.info('تم تحميل الفيديو محلياً (سيتم الرفع عند الحفظ)');
    } finally {
      setUploadingVideo(false);
    }
  };

  // Handle interaction type change
  const handleInteractionTypeChange = (newType: string) => {
    setFormData({ ...formData, question_type: newType });
    // Reset config to defaults for the new type
    setInteractionConfig(getDefaultConfig(newType));
  };

  // Render form fields based on active tab
  const renderFormFields = () => {
    const inputClass = "font-tajawal text-sm border-gray-200 focus:border-indigo-400 focus:ring-indigo-400";

    // Country/Curriculum selector
    const CountryCurriculumFields = () => (
      <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div>
          <label className="text-xs font-medium text-blue-700 font-tajawal block mb-1">🌍 الدولة</label>
          <select
            className="w-full text-sm border border-blue-200 rounded-md p-2 font-tajawal"
            value={String(formData.country_id || '')}
            onChange={(e) => setFormData({ ...formData, country_id: Number(e.target.value) || 0 })}
          >
            <option value="">— بدون تحديد —</option>
            {countries.map(c => (
              <option key={c.id} value={c.id}>{c.flag_emoji} {c.name_ar}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-blue-700 font-tajawal block mb-1">📚 المنهج</label>
          <select
            className="w-full text-sm border border-blue-200 rounded-md p-2 font-tajawal"
            value={String(formData.curriculum_id || '')}
            onChange={(e) => setFormData({ ...formData, curriculum_id: Number(e.target.value) || 0 })}
          >
            <option value="">— بدون تحديد —</option>
            {curricula
              .filter(c => !formData.country_id || c.country_id === Number(formData.country_id))
              .map(c => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
          </select>
        </div>
      </div>
    );

    switch (activeTab) {
      case 'countries':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الاسم بالعربية</label>
              <Input value={formData.name_ar || ''} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: المملكة العربية السعودية" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الاسم بالإنجليزية</label>
              <Input value={formData.name_en || ''} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="e.g. Saudi Arabia" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">رمز الدولة</label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className={inputClass} dir="ltr" placeholder="SA" maxLength={5} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">العلم</label>
                <Input value={formData.flag_emoji || ''} onChange={(e) => setFormData({ ...formData, flag_emoji: e.target.value })} className={inputClass} placeholder="🇸🇦" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">ترتيب العرض</label>
                <Input type="number" value={formData.display_order || 1} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })} className={inputClass} />
              </div>
              <SelectField label="الحالة" value={formData.is_active === true || formData.is_active === 'true' ? 'true' : 'false'} onChange={(v) => setFormData({ ...formData, is_active: v === 'true' })} options={[{ value: 'true', label: 'مفعّل' }, { value: 'false', label: 'معطّل' }]} />
            </div>
          </div>
        );

      case 'curricula':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الاسم بالعربية</label>
              <Input value={formData.name_ar || ''} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: المنهج السعودي" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الاسم بالإنجليزية</label>
              <Input value={formData.name_en || ''} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="e.g. Saudi Curriculum" />
            </div>
            <SelectField label="الدولة" value={String(formData.country_id || '')} onChange={(v) => setFormData({ ...formData, country_id: Number(v) })} options={countries.map(c => ({ value: String(c.id), label: `${c.flag_emoji} ${c.name_ar}` }))} />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">العام الدراسي</label>
              <Input value={formData.academic_year || ''} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} className={inputClass} dir="ltr" placeholder="2025-2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">ترتيب العرض</label>
                <Input type="number" value={formData.display_order || 1} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })} className={inputClass} />
              </div>
              <SelectField label="الحالة" value={formData.is_active === true || formData.is_active === 'true' ? 'true' : 'false'} onChange={(v) => setFormData({ ...formData, is_active: v === 'true' })} options={[{ value: 'true', label: 'مفعّل' }, { value: 'false', label: 'معطّل' }]} />
            </div>
          </div>
        );

      case 'grades':
        return (
          <div className="space-y-4">
            <CountryCurriculumFields />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">اسم الصف</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: الصف الأول" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">ترتيب العرض</label>
              <Input type="number" value={formData.display_order || 1} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })} className={inputClass} />
            </div>
            <SelectField label="الحالة" value={String(formData.status || 'draft')} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ value: 'draft', label: 'مسودة' }, { value: 'preview', label: 'معاينة' }, { value: 'published', label: 'منشور' }]} />
          </div>
        );

      case 'semesters':
        return (
          <div className="space-y-4">
            <CountryCurriculumFields />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">اسم الفصل</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: الفصل الأول" />
            </div>
            <SelectField label="الصف" value={String(formData.grade_id || '')} onChange={(v) => setFormData({ ...formData, grade_id: Number(v) })} options={grades.map(g => ({ value: String(g.id), label: g.name }))} />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">ترتيب العرض</label>
              <Input type="number" value={formData.display_order || 1} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })} className={inputClass} />
            </div>
            <SelectField label="الحالة" value={String(formData.status || 'draft')} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ value: 'draft', label: 'مسودة' }, { value: 'preview', label: 'معاينة' }, { value: 'published', label: 'منشور' }]} />
          </div>
        );

      case 'subjects':
        return (
          <div className="space-y-4">
            <CountryCurriculumFields />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">اسم المادة</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: الرياضيات" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="الصف" value={String(formData.grade_id || '')} onChange={(v) => setFormData({ ...formData, grade_id: Number(v) })} options={grades.map(g => ({ value: String(g.id), label: g.name }))} />
              <SelectField label="الفصل" value={String(formData.semester_id || '')} onChange={(v) => setFormData({ ...formData, semester_id: Number(v) })} options={semesters.map(s => ({ value: String(s.id), label: s.name }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الوصف</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClass} dir="rtl" placeholder="وصف المادة" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الأيقونة</label>
                <Input value={formData.icon || ''} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className={inputClass} placeholder="📐" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">ترتيب العرض</label>
                <Input type="number" value={formData.display_order || 1} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })} className={inputClass} />
              </div>
            </div>
            <SelectField label="الحالة" value={String(formData.status || 'draft')} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ value: 'draft', label: 'مسودة' }, { value: 'preview', label: 'معاينة' }, { value: 'published', label: 'منشور' }]} />
          </div>
        );

      case 'units':
        return (
          <div className="space-y-4">
            <CountryCurriculumFields />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">اسم الوحدة</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: الجمع والطرح" />
            </div>
            <SelectField label="المادة" value={String(formData.subject_id || '')} onChange={(v) => setFormData({ ...formData, subject_id: Number(v) })} options={subjects.map(s => ({ value: String(s.id), label: s.name }))} />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الوصف</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClass} dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">ترتيب العرض</label>
              <Input type="number" value={formData.display_order || 1} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })} className={inputClass} />
            </div>
            <SelectField label="الحالة" value={String(formData.status || 'draft')} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ value: 'draft', label: 'مسودة' }, { value: 'preview', label: 'معاينة' }, { value: 'published', label: 'منشور' }]} />
          </div>
        );

      case 'lessons':
        return (
          <div className="space-y-4">
            <CountryCurriculumFields />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">عنوان الدرس</label>
              <Input value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: جمع الأعداد حتى 20" />
            </div>
            <SelectField label="الوحدة" value={String(formData.unit_id || '')} onChange={(v) => setFormData({ ...formData, unit_id: Number(v) })} options={units.map(u => ({ value: String(u.id), label: u.name }))} />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الأهداف</label>
              <Input value={formData.objectives || ''} onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} className={inputClass} dir="rtl" placeholder="أهداف الدرس" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="نوع المحتوى" value={String(formData.content_type || 'video')} onChange={(v) => setFormData({ ...formData, content_type: v })} options={[{ value: 'video', label: 'فيديو 🎬' }, { value: 'interactive', label: 'تفاعلي 🎮' }, { value: 'text', label: 'نص 📄' }, { value: 'game', label: 'لعبة 🕹️' }]} />
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">ترتيب العرض</label>
                <Input type="number" value={formData.display_order || 1} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })} className={inputClass} />
              </div>
            </div>
            {/* Video section - shown only when content_type is video */}
            {String(formData.content_type || 'video') === 'video' && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-blue-800 font-tajawal flex items-center gap-2">🎬 الفيديو</h4>
                  <div className="flex bg-blue-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setVideoUploadMode('url')}
                      className={`px-3 py-1 rounded-md text-xs font-tajawal font-medium transition-all ${videoUploadMode === 'url' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      <LinkIcon className="w-3 h-3 inline ml-1" />رابط
                    </button>
                    <button
                      onClick={() => setVideoUploadMode('upload')}
                      className={`px-3 py-1 rounded-md text-xs font-tajawal font-medium transition-all ${videoUploadMode === 'upload' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      <Upload className="w-3 h-3 inline ml-1" />رفع
                    </button>
                  </div>
                </div>

                {videoUploadMode === 'url' ? (
                  <div>
                    <Input
                      value={formData.video_url || ''}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className={inputClass}
                      dir="ltr"
                      placeholder="https://www.youtube.com/watch?v=... أو https://vimeo.com/..."
                    />
                    <p className="text-xs text-blue-600 font-tajawal mt-1">يدعم روابط YouTube و Vimeo</p>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      {uploadingVideo ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-blue-600 font-tajawal">جاري الرفع...</span>
                        </div>
                      ) : formData.video_url ? (
                        <div className="space-y-2">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Upload className="w-5 h-5 text-green-600" />
                          </div>
                          <p className="text-sm text-green-700 font-tajawal font-medium">تم رفع الفيديو ✓</p>
                          <p className="text-xs text-gray-400 font-tajawal truncate max-w-[200px] mx-auto">{String(formData.video_url).split('/').pop()}</p>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, video_url: '' }); }} className="text-xs text-red-500">إزالة</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 text-blue-400 mx-auto" />
                          <p className="text-sm text-blue-600 font-tajawal font-medium">اضغط لرفع فيديو</p>
                          <p className="text-xs text-gray-400 font-tajawal">MP4, WebM, MOV — حد أقصى 100 ميجابايت</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <SelectField label="الحالة" value={String(formData.status || 'draft')} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ value: 'draft', label: 'مسودة' }, { value: 'preview', label: 'معاينة' }, { value: 'published', label: 'منشور' }]} />
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-4">
            <CountryCurriculumFields />
            <div>
              <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">اسم المهارة</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} dir="rtl" placeholder="مثال: جمع الأعداد ضمن 10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="الصف" value={String(formData.grade_id || '')} onChange={(v) => setFormData({ ...formData, grade_id: Number(v) })} options={grades.map(g => ({ value: String(g.id), label: g.name }))} />
              <SelectField label="الفصل" value={String(formData.semester_id || '')} onChange={(v) => setFormData({ ...formData, semester_id: Number(v) })} options={semesters.map(s => ({ value: String(s.id), label: s.name }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="المادة" value={String(formData.subject_id || '')} onChange={(v) => setFormData({ ...formData, subject_id: Number(v) })} options={subjects.map(s => ({ value: String(s.id), label: s.name }))} />
              <SelectField label="الوحدة" value={String(formData.unit_id || '')} onChange={(v) => setFormData({ ...formData, unit_id: Number(v) })} options={units.map(u => ({ value: String(u.id), label: u.name }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">المجال</label>
                <Input value={formData.domain || ''} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className={inputClass} dir="rtl" placeholder="الأعداد والعمليات" />
              </div>
              <SelectField label="الصعوبة" value={String(formData.difficulty || 'easy')} onChange={(v) => setFormData({ ...formData, difficulty: v })} options={[{ value: 'easy', label: 'سهل' }, { value: 'medium', label: 'متوسط' }, { value: 'hard', label: 'صعب' }]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">حد الإتقان %</label>
                <Input type="number" value={formData.mastery_threshold || 80} onChange={(e) => setFormData({ ...formData, mastery_threshold: Number(e.target.value) })} className={inputClass} min={0} max={100} />
              </div>
              <SelectField label="الحالة" value={String(formData.status || 'draft')} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ value: 'draft', label: 'مسودة' }, { value: 'preview', label: 'معاينة' }, { value: 'published', label: 'منشور' }]} />
            </div>
          </div>
        );

      case 'questions':
        return renderQuestionForm();

      default:
        return null;
    }
  };

  // ===== Dedicated Question Form with Dynamic Config Builders =====
  const renderQuestionForm = () => {
    const inputClass = "font-tajawal text-sm border-gray-200 focus:border-indigo-400 focus:ring-indigo-400";
    const currentType = String(formData.question_type || 'tap');

    // Country/Curriculum selector
    const CountryCurriculumFields = () => (
      <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div>
          <label className="text-xs font-medium text-blue-700 font-tajawal block mb-1">🌍 الدولة</label>
          <select
            className="w-full text-sm border border-blue-200 rounded-md p-2 font-tajawal"
            value={String(formData.country_id || '')}
            onChange={(e) => setFormData({ ...formData, country_id: Number(e.target.value) || 0 })}
          >
            <option value="">— بدون تحديد —</option>
            {countries.map(c => (
              <option key={c.id} value={c.id}>{c.flag_emoji} {c.name_ar}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-blue-700 font-tajawal block mb-1">📚 المنهج</label>
          <select
            className="w-full text-sm border border-blue-200 rounded-md p-2 font-tajawal"
            value={String(formData.curriculum_id || '')}
            onChange={(e) => setFormData({ ...formData, curriculum_id: Number(e.target.value) || 0 })}
          >
            <option value="">— بدون تحديد —</option>
            {curricula
              .filter(c => !formData.country_id || c.country_id === Number(formData.country_id))
              .map(c => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
          </select>
        </div>
      </div>
    );

    // Render the appropriate config builder
    const renderConfigBuilder = () => {
      const props: ConfigBuilderProps = { config: interactionConfig, onChange: setInteractionConfig };
      switch (currentType) {
        case 'tap': return <TapConfigBuilder {...props} />;
        case 'number_line': return <NumberLineConfigBuilder {...props} />;
        case 'drag_drop': return <DragDropConfigBuilder {...props} />;
        case 'matching': return <MatchingConfigBuilder {...props} />;
        case 'counting_blocks': return <CountingBlocksConfigBuilder {...props} />;
        case 'missing_number': return <MissingNumberConfigBuilder {...props} />;
        case 'sequence_ordering': return <SequenceOrderingConfigBuilder {...props} />;
        case 'shape_grouping': return <ShapeGroupingConfigBuilder {...props} />;
        case 'analog_clock': return <AnalogClockConfigBuilder {...props} />;
        case 'coin_money': return <CoinMoneyConfigBuilder {...props} />;
        default: return <p className="text-sm text-gray-400 font-tajawal">نوع غير معروف</p>;
      }
    };

    return (
      <div className="space-y-5">
        {/* Section 1: Basic Info */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-blue-800 font-tajawal flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> معلومات السؤال الأساسية
          </h4>
          <CountryCurriculumFields />
          <div>
            <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">نص السؤال <span className="text-red-500">*</span></label>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-tajawal min-h-[60px] resize-none"
              dir="rtl"
              rows={2}
              value={String(formData.question_text || '')}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              placeholder="مثال: ما ناتج ٣ + ٥ ؟"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="المهارة" value={String(formData.skill_id || '')} onChange={(v) => setFormData({ ...formData, skill_id: Number(v) })} options={skills.map(s => ({ value: String(s.id), label: s.name }))} />
            <SelectField label="الصعوبة" value={String(formData.difficulty || 'easy')} onChange={(v) => setFormData({ ...formData, difficulty: v })} options={[{ value: 'easy', label: 'سهل' }, { value: 'medium', label: 'متوسط' }, { value: 'hard', label: 'صعب' }]} />
          </div>
        </div>

        {/* Section 2: Interaction Type + Dynamic Config */}
        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-4">
          <h4 className="text-sm font-bold text-purple-800 font-tajawal flex items-center gap-2">
            <Layers className="w-4 h-4" /> نوع التفاعل وإعداداته
          </h4>

          {/* Interaction Type Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 font-tajawal block mb-2">نوع التفاعل</label>
            <div className="grid grid-cols-2 gap-2">
              {INTERACTION_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleInteractionTypeChange(type.value)}
                  className={`p-2.5 rounded-lg border-2 text-xs font-tajawal font-medium text-right transition-all ${
                    currentType === type.value
                      ? 'border-purple-500 bg-purple-100 text-purple-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Config Builder */}
          <div className="border-t border-purple-200 pt-4">
            <p className="text-xs text-purple-600 font-tajawal mb-3 font-medium">⚙️ إعدادات {INTERACTION_TYPES.find(t => t.value === currentType)?.label || currentType}:</p>
            {renderConfigBuilder()}
          </div>
        </div>

        {/* Section 3: Additional */}
        <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-gray-700 font-tajawal flex items-center gap-2">
            <FileText className="w-4 h-4" /> تفاصيل إضافية
          </h4>
          <div>
            <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">الشرح <span className="text-xs text-gray-400">(يظهر بعد الإجابة)</span></label>
            <Input value={formData.explanation || ''} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} className={inputClass} dir="rtl" placeholder="شرح الإجابة الصحيحة للطالب" />
          </div>
          <SelectField label="الحالة" value={String(formData.status || 'draft')} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ value: 'draft', label: 'مسودة' }, { value: 'preview', label: 'معاينة' }, { value: 'published', label: 'منشور' }]} />
        </div>

        {/* Section 4: Live Interactive Preview */}
        <div className="border-t border-dashed border-gray-300 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className="gap-2 w-full justify-center border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Eye className="w-4 h-4" />
            {previewMode ? 'إخفاء المعاينة التفاعلية' : '👁️ معاينة تفاعلية حية (كما يراها الطالب)'}
          </Button>

          {previewMode && (
            <div className="mt-4 border-2 border-indigo-100 rounded-xl overflow-hidden">
              <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
                <p className="text-xs text-indigo-600 font-tajawal font-medium">🎮 معاينة تفاعلية حية — هذا ما يراه الطالب بالضبط:</p>
              </div>
              <div className="p-4 bg-white">
                <InteractionRenderer
                  interaction={{
                    id: 0,
                    interaction_type: currentType,
                    title: String(formData.question_text || 'سؤال تجريبي'),
                    config_json: JSON.stringify(interactionConfig),
                    difficulty: String(formData.difficulty || 'easy'),
                    cognitive_complexity: 'medium',
                  }}
                  onComplete={(result) => {
                    toast.success(result.correct ? '✓ إجابة صحيحة!' : '✗ إجابة خاطئة', { duration: 2000 });
                  }}
                  showFeedback={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render table rows
  const renderTableContent = () => {
    const filtered = getFilteredItems();

    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="mr-2 text-gray-500 font-tajawal">جاري التحميل...</span>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <p className="font-tajawal text-lg">لا توجد بيانات</p>
          <p className="text-sm mt-1">اضغط "إضافة" لإنشاء عنصر جديد</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filtered.map((item: Record<string, unknown>) => (
          <div key={String(item.id)} className={`flex items-center justify-between p-3 bg-white border rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all ${bulkMode && selectedIds.has(Number(item.id)) ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-100'}`}>
            {bulkMode && (
              <div className="ml-3 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(Number(item.id))}
                  onChange={() => toggleBulkSelect(Number(item.id))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-tajawal font-medium text-gray-800 truncate">
                  {renderItemTitle(item)}
                </span>
                {item.status && (
                  <Badge variant={item.status === 'published' ? 'default' : item.status === 'preview' ? 'outline' : 'secondary'} className="text-xs">
                    {item.status === 'published' ? 'منشور' : item.status === 'preview' ? 'معاينة' : 'مسودة'}
                  </Badge>
                )}
                {(item.is_active === true || item.is_active === false) && (
                  <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                    {item.is_active ? 'مفعّل' : 'معطّل'}
                  </Badge>
                )}
                {item.country_id && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Globe className="w-3 h-3" />
                    {getCountryName(item.country_id as number)}
                  </Badge>
                )}
                {item.curriculum_id && (
                  <Badge variant="outline" className="text-xs gap-1 bg-blue-50">
                    {getCurriculumName(item.curriculum_id as number)}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-tajawal">
                {renderItemSubtitle(item)}
              </div>
            </div>
            <div className="flex items-center gap-1 mr-2">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-8 w-8 p-0">
                <Edit className="w-3.5 h-3.5 text-gray-500" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id as number)} className="h-8 w-8 p-0 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderItemTitle = (item: Record<string, unknown>): string => {
    switch (activeTab) {
      case 'countries': return `${item.flag_emoji || ''} ${item.name_ar || ''}`.trim();
      case 'curricula': return `${item.name_ar || ''} (${item.academic_year || ''})`;
      case 'grades': return String(item.name || '');
      case 'semesters': return String(item.name || '');
      case 'subjects': return `${item.icon || ''} ${item.name || ''}`.trim();
      case 'units': return String(item.name || '');
      case 'lessons': return String(item.title || item.name || '');
      case 'skills': return String(item.name || '');
      case 'questions': {
        const type = String(item.question_type || 'tap');
        const emoji = INTERACTION_TYPE_EMOJIS?.[type] || '❓';
        return `${emoji} ${item.question_text || 'سؤال'}`;
      }
      default: return String(item.name || item.title || item.id || '');
    }
  };

  const renderItemSubtitle = (item: Record<string, unknown>): string => {
    switch (activeTab) {
      case 'countries': return `${item.code || ''} | ${item.name_en || ''}`;
      case 'curricula': {
        const country = countries.find(c => c.id === item.country_id);
        return country ? `${country.flag_emoji} ${country.name_ar}` : '';
      }
      case 'grades': return `ترتيب: ${item.display_order || 0}`;
      case 'semesters': {
        const grade = grades.find(g => g.id === item.grade_id);
        return grade ? `${grade.name}` : '';
      }
      case 'subjects': {
        const grade = grades.find(g => g.id === item.grade_id);
        return grade ? `${grade.name} | ${item.description || ''}` : '';
      }
      case 'units': {
        const subject = subjects.find(s => s.id === item.subject_id);
        return subject ? `${subject.name}` : '';
      }
      case 'lessons': {
        const unit = units.find(u => u.id === item.unit_id);
        return `${unit?.name || ''} | ${item.content_type || ''}`;
      }
      case 'skills': return `${item.domain || ''} | ${item.difficulty || ''}`;
      case 'questions': {
        const skill = skills.find(s => s.id === item.skill_id);
        const typeLabel = INTERACTION_TYPE_LABELS?.[String(item.question_type)] || item.question_type;
        return `${skill?.name || ''} | ${typeLabel} | ${item.difficulty || ''}`;
      }
      default: return '';
    }
  };

  const getFilteredItems = (): Record<string, unknown>[] => {
    let items: Record<string, unknown>[] = [];
    switch (activeTab) {
      case 'countries': items = countries as unknown as Record<string, unknown>[]; break;
      case 'curricula': items = curricula as unknown as Record<string, unknown>[]; break;
      case 'grades': items = grades as unknown as Record<string, unknown>[]; break;
      case 'semesters': items = semesters as unknown as Record<string, unknown>[]; break;
      case 'subjects': items = subjects as unknown as Record<string, unknown>[]; break;
      case 'units': items = units as unknown as Record<string, unknown>[]; break;
      case 'lessons': items = lessons as unknown as Record<string, unknown>[]; break;
      case 'skills': items = skills as unknown as Record<string, unknown>[]; break;
      case 'questions': items = questions as unknown as Record<string, unknown>[]; break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => {
        const searchFields = ['name', 'name_ar', 'name_en', 'title', 'question_text', 'description', 'domain'];
        return searchFields.some(field => String(item[field] || '').toLowerCase().includes(q));
      });
    }

    return items;
  };

  const tabIcons: Record<string, React.ReactNode> = {
    countries: <Globe className="w-4 h-4" />,
    curricula: <Flag className="w-4 h-4" />,
    grades: <GraduationCap className="w-4 h-4" />,
    semesters: <BookOpen className="w-4 h-4" />,
    subjects: <Layers className="w-4 h-4" />,
    units: <FileText className="w-4 h-4" />,
    lessons: <BookOpen className="w-4 h-4" />,
    skills: <Brain className="w-4 h-4" />,
    questions: <HelpCircle className="w-4 h-4" />,
  };

  const filteredCurricula = filterCountryId
    ? curricula.filter(c => c.country_id === filterCountryId)
    : curricula;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-tajawal">إدارة المحتوى التعليمي</h1>
            <p className="text-sm text-gray-500 font-tajawal mt-1">إدارة شاملة للمناهج متعددة الدول</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="font-tajawal">
            ← لوحة التحكم
          </Button>
        </div>

        {/* Country/Curriculum Filter Bar */}
        <Card className="mb-4 border-blue-100 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 font-tajawal">تصفية حسب:</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="text-sm border border-blue-200 rounded-md px-3 py-1.5 font-tajawal bg-white"
                  value={filterCountryId || ''}
                  onChange={(e) => {
                    setFilterCountryId(e.target.value ? Number(e.target.value) : null);
                    setFilterCurriculumId(null);
                  }}
                >
                  <option value="">كل الدول</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.flag_emoji} {c.name_ar}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="text-sm border border-blue-200 rounded-md px-3 py-1.5 font-tajawal bg-white"
                  value={filterCurriculumId || ''}
                  onChange={(e) => setFilterCurriculumId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">كل المناهج</option>
                  {filteredCurricula.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                  ))}
                </select>
              </div>
              {(filterCountryId || filterCurriculumId) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterCountryId(null); setFilterCurriculumId(null); }} className="text-blue-600 hover:text-blue-800">
                  <X className="w-3 h-3 ml-1" /> مسح الفلتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b bg-gray-50/50 px-4 pt-3">
                <TabsList className="flex flex-wrap gap-1 bg-transparent h-auto p-0">
                  {Object.entries(tabIcons).map(([key, icon]) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-tajawal data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-t-lg"
                    >
                      {icon}
                      <span className="hidden sm:inline">{
                        { countries: 'الدول', curricula: 'المناهج', grades: 'الصفوف', semesters: 'الفصول', subjects: 'المواد', units: 'الوحدات', lessons: 'الدروس', skills: 'المهارات', questions: 'الأسئلة' }[key]
                      }</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-4">
                {/* Search and Add bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={`بحث في ${getTabLabel()}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9 font-tajawal text-sm"
                      dir="rtl"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchData(getEntityName())} className="gap-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant={bulkMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                    className="font-tajawal gap-1"
                  >
                    {bulkMode ? '✓ إلغاء التحديد' : '☐ تحديد متعدد'}
                  </Button>
                  <Button onClick={handleAdd} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 font-tajawal">
                    <Plus className="w-4 h-4" />
                    إضافة
                  </Button>
                </div>

                {/* Bulk Actions Bar */}
                {bulkMode && selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <span className="text-sm font-tajawal text-indigo-700 font-medium">تم تحديد {selectedIds.size} عنصر</span>
                    <div className="flex-1" />
                    <Button size="sm" variant="outline" onClick={() => handleBulkPublish(true)} className="font-tajawal text-green-700 border-green-200 hover:bg-green-50 gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      نشر الكل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkPublish(false)} className="font-tajawal text-amber-700 border-amber-200 hover:bg-amber-50 gap-1">
                      <EyeOff className="w-3.5 h-3.5" />
                      إلغاء نشر الكل
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleBulkDelete} className="font-tajawal text-red-700 border-red-200 hover:bg-red-50 gap-1">
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف الكل
                    </Button>
                  </div>
                )}

                {bulkMode && (
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={selectAllFiltered} className="font-tajawal text-xs">
                      {selectedIds.size === getFilteredItems().length ? 'إلغاء تحديد الكل' : `تحديد الكل (${getFilteredItems().length})`}
                    </Button>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 font-tajawal">
                  <span>إجمالي: {getFilteredItems().length} عنصر</span>
                  {filterCountryId && <Badge variant="outline" className="text-xs">{getCountryName(filterCountryId)}</Badge>}
                  {filterCurriculumId && <Badge variant="outline" className="text-xs bg-blue-50">{getCurriculumName(filterCurriculumId)}</Badge>}
                </div>

                {/* Table Content */}
                {Object.keys(tabIcons).map(key => (
                  <TabsContent key={key} value={key} className="mt-0">
                    {renderTableContent()}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h3 className="text-lg font-bold text-gray-800 font-tajawal">
                {editingItem ? `تعديل ${getTabLabel()}` : `إضافة ${getTabLabel()}`}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              {renderFormFields()}
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl z-10">
              <Button variant="outline" onClick={() => setShowModal(false)} className="font-tajawal">إلغاء</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-tajawal">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingItem ? 'تحديث' : 'حفظ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable select field component
function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 font-tajawal block mb-1">{label}</label>
      <div className="relative">
        <select
          className="w-full text-sm border border-gray-200 rounded-md p-2 pr-8 font-tajawal appearance-none bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}