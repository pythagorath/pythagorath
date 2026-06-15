// Interaction Service - Fetches and manages interactive learning activities
import { client } from '@/lib/api';
import type { InteractionConfig, InteractionResult } from '@/components/InteractionToolkit';
import {
  getSubjectTemplate,
  getSessionFlow,
  type SubjectTemplate,
} from '@/lib/subjectCognitiveTemplates';

// ═══════════════════════════════════════════════════════
// HARDCODED INTERACTIONS (work without backend)
// Rich set of real cognitive activities for early grades
// ═══════════════════════════════════════════════════════

const BUILTIN_INTERACTIONS: InteractionConfig[] = [
  // ─── COUNTING BLOCKS ───
  {
    id: 1001,
    interaction_type: 'counting_blocks',
    title: 'كم مكعب تراه؟',
    config_json: JSON.stringify({
      instruction: 'عدّ المكعبات واختر العدد الصحيح',
      count: 4,
      color: 'blue',
      options: [3, 4, 5, 6],
      correct: 4,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },
  {
    id: 1002,
    interaction_type: 'counting_blocks',
    title: 'عدّ المكعبات الحمراء',
    config_json: JSON.stringify({
      instruction: 'كم مكعب أحمر في الصورة؟',
      count: 7,
      color: 'red',
      options: [5, 6, 7, 8],
      correct: 7,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },
  {
    id: 1003,
    interaction_type: 'counting_blocks',
    title: 'عدّ المكعبات الخضراء',
    config_json: JSON.stringify({
      instruction: 'كم مكعب أخضر تراه؟',
      count: 9,
      color: 'green',
      options: [7, 8, 9, 10],
      correct: 9,
    }),
    difficulty: 'medium',
    cognitive_complexity: 'low',
  },

  // ─── TAP (Choose correct answer) ───
  {
    id: 1004,
    interaction_type: 'tap',
    title: 'ما ناتج ٣ + ٢؟',
    config_json: JSON.stringify({
      instruction: 'اضغط على الإجابة الصحيحة',
      items: [
        { id: 1, label: '٤', value: 4 },
        { id: 2, label: '٥', value: 5 },
        { id: 3, label: '٦', value: 6 },
        { id: 4, label: '٣', value: 3 },
      ],
      correct_id: 2,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },
  {
    id: 1005,
    interaction_type: 'tap',
    title: 'ما ناتج ٧ - ٣؟',
    config_json: JSON.stringify({
      instruction: 'اضغط على الإجابة الصحيحة',
      items: [
        { id: 1, label: '٣', value: 3 },
        { id: 2, label: '٤', value: 4 },
        { id: 3, label: '٥', value: 5 },
        { id: 4, label: '٢', value: 2 },
      ],
      correct_id: 2,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },
  {
    id: 1006,
    interaction_type: 'tap',
    title: 'ما ناتج ٦ + ٤؟',
    config_json: JSON.stringify({
      instruction: 'اضغط على الإجابة الصحيحة',
      items: [
        { id: 1, label: '٩', value: 9 },
        { id: 2, label: '١٠', value: 10 },
        { id: 3, label: '١١', value: 11 },
        { id: 4, label: '٨', value: 8 },
      ],
      correct_id: 2,
    }),
    difficulty: 'medium',
    cognitive_complexity: 'low',
  },

  // ─── DRAG & DROP (ordering) ───
  {
    id: 1007,
    interaction_type: 'drag_drop',
    title: 'رتّب الأعداد من الأصغر إلى الأكبر',
    config_json: JSON.stringify({
      instruction: 'اضغط على الأعداد بالترتيب من الأصغر إلى الأكبر',
      items: [
        { id: 1, label: '٣', value: 3 },
        { id: 2, label: '١', value: 1 },
        { id: 3, label: '٥', value: 5 },
        { id: 4, label: '٢', value: 2 },
      ],
      correct_order: [2, 4, 1, 3],
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1008,
    interaction_type: 'drag_drop',
    title: 'رتّب الأعداد من الأكبر إلى الأصغر',
    config_json: JSON.stringify({
      instruction: 'اضغط على الأعداد بالترتيب من الأكبر إلى الأصغر',
      items: [
        { id: 1, label: '٨', value: 8 },
        { id: 2, label: '٤', value: 4 },
        { id: 3, label: '٦', value: 6 },
        { id: 4, label: '١٠', value: 10 },
      ],
      correct_order: [4, 1, 3, 2],
    }),
    difficulty: 'medium',
    cognitive_complexity: 'medium',
  },

  // ─── MATCHING ───
  {
    id: 1009,
    interaction_type: 'matching',
    title: 'وصّل العدد بالكلمة',
    config_json: JSON.stringify({
      instruction: 'وصّل كل عدد بالكلمة المناسبة',
      pairs: [
        { left: { id: 1, label: '٣' }, right: { id: 'a', label: 'ثلاثة' } },
        { left: { id: 2, label: '٧' }, right: { id: 'b', label: 'سبعة' } },
        { left: { id: 3, label: '٥' }, right: { id: 'c', label: 'خمسة' } },
      ],
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1010,
    interaction_type: 'matching',
    title: 'وصّل العملية بالناتج',
    config_json: JSON.stringify({
      instruction: 'وصّل كل عملية حسابية بناتجها',
      pairs: [
        { left: { id: 1, label: '٢+٣' }, right: { id: 'a', label: '٥' } },
        { left: { id: 2, label: '٤+٤' }, right: { id: 'b', label: '٨' } },
        { left: { id: 3, label: '٦-٢' }, right: { id: 'c', label: '٤' } },
      ],
    }),
    difficulty: 'medium',
    cognitive_complexity: 'medium',
  },

  // ─── NUMBER LINE ───
  {
    id: 1011,
    interaction_type: 'number_line',
    title: 'أين يقع العدد ٤؟',
    config_json: JSON.stringify({
      instruction: 'اضغط على مكان العدد ٤ على خط الأعداد',
      min: 0,
      max: 10,
      target: 4,
      tolerance: 0.5,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1012,
    interaction_type: 'number_line',
    title: 'أين يقع العدد ٧؟',
    config_json: JSON.stringify({
      instruction: 'اضغط على مكان العدد ٧ على خط الأعداد',
      min: 0,
      max: 10,
      target: 7,
      tolerance: 0.5,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1013,
    interaction_type: 'number_line',
    title: 'أين يقع ناتج ٣+٥؟',
    config_json: JSON.stringify({
      instruction: 'احسب ٣+٥ ثم اضغط على مكان الناتج',
      min: 0,
      max: 10,
      target: 8,
      tolerance: 0.5,
    }),
    difficulty: 'medium',
    cognitive_complexity: 'high',
  },

  // ─── MISSING NUMBER ───
  {
    id: 1014,
    interaction_type: 'missing_number',
    title: 'أكمل التسلسل',
    config_json: JSON.stringify({
      instruction: 'ما العدد الناقص في التسلسل؟',
      sequence: [2, 4, null, 8, 10],
      correct: 6,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1015,
    interaction_type: 'missing_number',
    title: 'أكمل العدد الناقص',
    config_json: JSON.stringify({
      instruction: 'ما العدد الناقص؟',
      sequence: [1, 3, 5, null, 9],
      correct: 7,
    }),
    difficulty: 'medium',
    cognitive_complexity: 'medium',
  },
  {
    id: 1016,
    interaction_type: 'missing_number',
    title: 'أكمل الجمع',
    config_json: JSON.stringify({
      instruction: '٣ + ؟ = ٨',
      sequence: [3, null, 8],
      correct: 5,
    }),
    difficulty: 'medium',
    cognitive_complexity: 'high',
  },

  // ─── SEQUENCE ORDERING ───
  {
    id: 1017,
    interaction_type: 'sequence_ordering',
    title: 'رتّب خطوات الحل',
    config_json: JSON.stringify({
      instruction: 'رتّب خطوات حل المسألة: ٥ + ٣',
      items: [
        { id: 1, label: 'ابدأ من ٥' },
        { id: 2, label: 'عدّ ٣ خطوات' },
        { id: 3, label: 'الناتج ٨' },
      ],
      correct_order: [1, 2, 3],
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1018,
    interaction_type: 'sequence_ordering',
    title: 'رتّب أيام الأسبوع',
    config_json: JSON.stringify({
      instruction: 'رتّب الأيام من الأول إلى الأخير',
      items: [
        { id: 1, label: 'الأحد' },
        { id: 2, label: 'الاثنين' },
        { id: 3, label: 'الثلاثاء' },
        { id: 4, label: 'الأربعاء' },
      ],
      correct_order: [1, 2, 3, 4],
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },

  // ─── ANALOG CLOCK ───
  {
    id: 1019,
    interaction_type: 'analog_clock',
    title: 'اضبط الساعة على ٣:٠٠',
    config_json: JSON.stringify({
      instruction: 'حرّك عقارب الساعة لتشير إلى الساعة ٣:٠٠',
      target_hour: 3,
      target_minute: 0,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1020,
    interaction_type: 'analog_clock',
    title: 'اضبط الساعة على ٧:٣٠',
    config_json: JSON.stringify({
      instruction: 'حرّك عقارب الساعة لتشير إلى الساعة ٧:٣٠',
      target_hour: 7,
      target_minute: 30,
    }),
    difficulty: 'medium',
    cognitive_complexity: 'medium',
  },

  // ─── COIN MONEY ───
  {
    id: 1021,
    interaction_type: 'coin_money',
    title: 'اجمع ٥ ريالات',
    config_json: JSON.stringify({
      instruction: 'اختر العملات التي مجموعها ٥ ريالات',
      target_amount: 5,
      available_coins: [
        { value: 1, label: '١ ريال', count: 5 },
        { value: 2, label: '٢ ريال', count: 3 },
        { value: 5, label: '٥ ريال', count: 1 },
      ],
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },
  {
    id: 1022,
    interaction_type: 'coin_money',
    title: 'اجمع ٨ ريالات',
    config_json: JSON.stringify({
      instruction: 'اختر العملات التي مجموعها ٨ ريالات',
      target_amount: 8,
      available_coins: [
        { value: 1, label: '١ ريال', count: 5 },
        { value: 2, label: '٢ ريال', count: 4 },
        { value: 5, label: '٥ ريال', count: 2 },
      ],
    }),
    difficulty: 'medium',
    cognitive_complexity: 'medium',
  },

  // ─── SHAPE GROUPING ───
  {
    id: 1023,
    interaction_type: 'shape_grouping',
    title: 'صنّف الأشكال',
    config_json: JSON.stringify({
      instruction: 'اختر مجموعة ثم اضغط على الأشكال المناسبة',
      shapes: [
        { id: 1, type: 'circle', color: 'red' },
        { id: 2, type: 'square', color: 'blue' },
        { id: 3, type: 'circle', color: 'blue' },
        { id: 4, type: 'square', color: 'red' },
        { id: 5, type: 'triangle', color: 'green' },
        { id: 6, type: 'triangle', color: 'red' },
      ],
      groups: [
        { id: 'circles', label: 'دوائر', correct_ids: [1, 3] },
        { id: 'squares', label: 'مربعات', correct_ids: [2, 4] },
        { id: 'triangles', label: 'مثلثات', correct_ids: [5, 6] },
      ],
    }),
    difficulty: 'easy',
    cognitive_complexity: 'medium',
  },

  // ─── More TAP for variety ───
  {
    id: 1024,
    interaction_type: 'tap',
    title: 'أي عدد أكبر؟',
    config_json: JSON.stringify({
      instruction: 'اضغط على العدد الأكبر',
      items: [
        { id: 1, label: '٣', value: 3 },
        { id: 2, label: '٩', value: 9 },
        { id: 3, label: '٥', value: 5 },
        { id: 4, label: '٧', value: 7 },
      ],
      correct_id: 2,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },
  {
    id: 1025,
    interaction_type: 'tap',
    title: 'أي عدد زوجي؟',
    config_json: JSON.stringify({
      instruction: 'اضغط على العدد الزوجي',
      items: [
        { id: 1, label: '٣', value: 3 },
        { id: 2, label: '٦', value: 6 },
        { id: 3, label: '٧', value: 7 },
        { id: 4, label: '٩', value: 9 },
      ],
      correct_id: 2,
    }),
    difficulty: 'medium',
    cognitive_complexity: 'low',
  },

  // ─── More COUNTING for variety ───
  {
    id: 1026,
    interaction_type: 'counting_blocks',
    title: 'كم مكعب برتقالي؟',
    config_json: JSON.stringify({
      instruction: 'عدّ المكعبات البرتقالية',
      count: 5,
      color: 'orange',
      options: [4, 5, 6, 7],
      correct: 5,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },
  {
    id: 1027,
    interaction_type: 'counting_blocks',
    title: 'عدّ المكعبات البنفسجية',
    config_json: JSON.stringify({
      instruction: 'كم مكعب بنفسجي تراه؟',
      count: 3,
      color: 'purple',
      options: [2, 3, 4, 5],
      correct: 3,
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },

  // ─── More MATCHING ───
  {
    id: 1028,
    interaction_type: 'matching',
    title: 'وصّل الشكل باسمه',
    config_json: JSON.stringify({
      instruction: 'وصّل كل شكل باسمه الصحيح',
      pairs: [
        { left: { id: 1, label: '🔵' }, right: { id: 'a', label: 'دائرة' } },
        { left: { id: 2, label: '🟥' }, right: { id: 'b', label: 'مربع' } },
        { left: { id: 3, label: '🔺' }, right: { id: 'c', label: 'مثلث' } },
      ],
    }),
    difficulty: 'easy',
    cognitive_complexity: 'low',
  },

  // ─── More DRAG DROP ───
  {
    id: 1029,
    interaction_type: 'drag_drop',
    title: 'رتّب الأعداد: ٢، ٥، ٨، ١١',
    config_json: JSON.stringify({
      instruction: 'رتّب الأعداد من الأصغر إلى الأكبر',
      items: [
        { id: 1, label: '٨', value: 8 },
        { id: 2, label: '٢', value: 2 },
        { id: 3, label: '١١', value: 11 },
        { id: 4, label: '٥', value: 5 },
      ],
      correct_order: [2, 4, 1, 3],
    }),
    difficulty: 'medium',
    cognitive_complexity: 'medium',
  },

  // ─── More MISSING NUMBER ───
  {
    id: 1030,
    interaction_type: 'missing_number',
    title: 'ما العدد الناقص؟',
    config_json: JSON.stringify({
      instruction: '١٠ - ؟ = ٤',
      sequence: [10, null, 4],
      correct: 6,
    }),
    difficulty: 'hard',
    cognitive_complexity: 'high',
  },
];

// ═══════════════════════════════════════════════════════
// INTERACTION CATEGORIES BY MISSION TYPE
// ═══════════════════════════════════════════════════════

// Map mission types to suitable interaction types
const MISSION_INTERACTION_MAP: Record<string, string[]> = {
  learn: ['tap', 'counting_blocks', 'number_line', 'missing_number'],
  practice: ['drag_drop', 'matching', 'sequence_ordering', 'tap', 'missing_number'],
  quiz: ['tap', 'matching', 'missing_number', 'number_line'],
  explore: ['shape_grouping', 'analog_clock', 'coin_money', 'counting_blocks'],
  challenge: ['drag_drop', 'sequence_ordering', 'missing_number', 'matching'],
  review: ['tap', 'counting_blocks', 'matching', 'number_line'],
};

// ═══════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════

// Cache for backend interactions
let backendCache: InteractionConfig[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000;

// Valid interaction types for validation
const VALID_INTERACTION_TYPES = new Set([
  'tap', 'drag_drop', 'matching', 'number_line', 'counting_blocks',
  'missing_number', 'sequence_ordering', 'shape_grouping', 'analog_clock', 'coin_money',
]);

/** Validate an interaction config has required fields for its type */
function validateInteractionConfig(config: InteractionConfig): boolean {
  if (!config.id || !config.interaction_type || !config.title) return false;
  if (!VALID_INTERACTION_TYPES.has(config.interaction_type)) return false;
  try {
    const parsed = typeof config.config_json === 'string' ? JSON.parse(config.config_json) : config.config_json;
    if (!parsed || typeof parsed !== 'object') return false;
    // Type-specific validation
    switch (config.interaction_type) {
      case 'tap':
        return Array.isArray(parsed.items) && parsed.items.length > 0 && parsed.correct_id != null;
      case 'counting_blocks':
        return typeof parsed.count === 'number' && Array.isArray(parsed.options) && parsed.correct != null;
      case 'drag_drop':
        return Array.isArray(parsed.items) && Array.isArray(parsed.correct_order);
      case 'matching':
        return Array.isArray(parsed.pairs) && parsed.pairs.length > 0;
      case 'number_line':
        return typeof parsed.min === 'number' && typeof parsed.max === 'number' && typeof parsed.target === 'number';
      case 'missing_number':
        return Array.isArray(parsed.sequence) && parsed.correct != null;
      case 'sequence_ordering':
        return Array.isArray(parsed.items) && Array.isArray(parsed.correct_order);
      case 'shape_grouping':
        return Array.isArray(parsed.shapes) && Array.isArray(parsed.groups);
      case 'analog_clock':
        return typeof parsed.target_hour === 'number' && typeof parsed.target_minute === 'number';
      case 'coin_money':
        return typeof parsed.target_amount === 'number' && Array.isArray(parsed.available_coins);
      default:
        return true;
    }
  } catch {
    return false;
  }
}

// Convert admin_questions (from AdminCRUD) to InteractionConfig format
function convertAdminQuestionToInteraction(q: {
  id: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  config_json?: string;
}): InteractionConfig | null {
  try {
    if (!q.config_json || typeof q.config_json !== 'string') return null;
    const configJson = JSON.parse(q.config_json);
    // Only convert if it has valid config
    if (!configJson || typeof configJson !== 'object' || Object.keys(configJson).length === 0) return null;
    const config: InteractionConfig = {
      id: q.id,
      interaction_type: q.question_type,
      title: q.question_text || 'سؤال',
      config_json: q.config_json,
      difficulty: (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'easy') as 'easy' | 'medium' | 'hard',
      cognitive_complexity: q.difficulty === 'hard' ? 'high' : q.difficulty === 'medium' ? 'medium' : 'low',
    };
    // Validate before returning
    return validateInteractionConfig(config) ? config : null;
  } catch {
    return null;
  }
}

// Fetch interactions from backend admin_questions (with builtin fallback)
export async function fetchInteractionsFromBackend(gradeId?: number, subjectId?: number): Promise<InteractionConfig[]> {
  const now = Date.now();
  if (backendCache && (now - lastFetch) < CACHE_TTL && !gradeId && !subjectId) {
    return backendCache;
  }

  try {
    // Fetch from admin_questions entity (same entity used by AdminCRUD)
    const query: Record<string, unknown> = { status: 'published' };
    const response = await client.entities.admin_questions.query({
      query,
      limit: 200,
    });

    const items = response?.data?.items || [];
    if (items.length > 0) {
      // Convert admin questions to InteractionConfig format
      const validInteractionTypes = ['tap', 'drag_drop', 'matching', 'number_line', 'counting_blocks', 'missing_number', 'sequence_ordering', 'shape_grouping', 'analog_clock', 'coin_money'];
      const converted = items
        .filter((q: { question_type: string }) => validInteractionTypes.includes(q.question_type))
        .map((q: { id: number; question_text: string; question_type: string; difficulty: string; config_json?: string }) => convertAdminQuestionToInteraction(q))
        .filter((item: InteractionConfig | null): item is InteractionConfig => item !== null);

      if (converted.length > 0) {
        if (!gradeId && !subjectId) {
          backendCache = converted;
          lastFetch = now;
        }
        return converted;
      }
    }
  } catch (err) {
    console.error('Backend admin_questions fetch failed, using builtins:', err);
  }

  // Fallback to builtins
  return BUILTIN_INTERACTIONS;
}

// Get interactions for a mission (SYNCHRONOUS - uses cached backend or builtins)
export function getMissionInteractions(missionType: string, count: number = 3): InteractionConfig[] {
  // Validate count
  const safeCount = Math.max(1, Math.min(20, Math.round(Number(count) || 3)));
  const safeMissionType = (missionType && typeof missionType === 'string') ? missionType : 'learn';

  const suitableTypes = MISSION_INTERACTION_MAP[safeMissionType] || MISSION_INTERACTION_MAP['learn'];
  
  // Use backend cache if available (published content from admin), otherwise builtins
  const source = (Array.isArray(backendCache) && backendCache.length > 0) ? backendCache : BUILTIN_INTERACTIONS;
  
  // Guard: if source is empty, use builtins as absolute fallback
  const safeSource = (!source || source.length === 0) ? BUILTIN_INTERACTIONS : source;
  if (safeSource.length === 0) return [];

  // Filter by suitable types
  const candidates = safeSource.filter(i => i && suitableTypes.includes(i.interaction_type));
  
  // If no candidates from filtered types, use all from source
  const pool = candidates.length > 0 ? candidates : safeSource;
  
  // Shuffle and pick diverse types
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected: InteractionConfig[] = [];
  const usedTypes = new Set<string>();

  // First pass: one of each type for variety
  for (const item of shuffled) {
    if (selected.length >= safeCount) break;
    if (item && !usedTypes.has(item.interaction_type)) {
      selected.push(item);
      usedTypes.add(item.interaction_type);
    }
  }

  // Second pass: fill remaining
  for (const item of shuffled) {
    if (selected.length >= safeCount) break;
    if (item && !selected.find(s => s.id === item.id)) {
      selected.push(item);
    }
  }

  return selected.slice(0, safeCount);
}

// Pre-load backend interactions into cache (call on app init)
// This ensures admin-published questions are available to students immediately
export async function preloadInteractions(): Promise<void> {
  try {
    const result = await fetchInteractionsFromBackend();
    if (result.length > 0) {
      console.info(`[interactionService] Preloaded ${result.length} published interactions from backend`);
    }
  } catch {
    // Silent fail - builtins will be used as fallback
  }
}

// Get ALL builtin interactions (for admin preview)
export function getAllBuiltinInteractions(): InteractionConfig[] {
  return [...BUILTIN_INTERACTIONS];
}

// Adaptive interaction selection based on student performance
export function selectAdaptiveInteraction(
  interactions: InteractionConfig[],
  history: InteractionResult[],
  difficulty: 'easy' | 'medium' | 'hard'
): InteractionConfig | null {
  if (!Array.isArray(interactions) || interactions.length === 0) return null;

  const safeDifficulty = (['easy', 'medium', 'hard'] as const).includes(difficulty) ? difficulty : 'easy';
  const safeHistory = Array.isArray(history) ? history : [];

  // Filter by difficulty
  let candidates = interactions.filter(i => i && i.difficulty === safeDifficulty);
  if (candidates.length === 0) candidates = interactions.filter(i => !!i);
  if (candidates.length === 0) return null;

  // Avoid recently completed interactions
  const recentIds = new Set(safeHistory.slice(-5).map(h => h?.interactionId).filter(Boolean));
  const fresh = candidates.filter(c => !recentIds.has(c.id));
  
  const pool = fresh.length > 0 ? fresh : candidates;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

// Determine next difficulty based on performance
export function getAdaptiveDifficulty(history: InteractionResult[]): 'easy' | 'medium' | 'hard' {
  if (!Array.isArray(history) || history.length < 3) return 'easy';

  const recent = history.slice(-3).filter(r => r && typeof r.correct === 'boolean');
  if (recent.length < 3) return 'easy';

  const correctCount = recent.filter(r => r.correct).length;
  const totalAttempts = recent.reduce((sum, r) => sum + (Number(r.attempts) || 1), 0);
  const avgAttempts = totalAttempts / recent.length;

  if (!Number.isFinite(avgAttempts)) return 'easy';

  if (correctCount === 3 && avgAttempts <= 1.5) return 'hard';
  if (correctCount >= 2 && avgAttempts <= 2) return 'medium';
  return 'easy';
}

// Track interaction completion (save to localStorage)
export function saveInteractionResult(result: InteractionResult) {
  if (!result || typeof result !== 'object') return;
  try {
    const key = 'pythagorath_interaction_history';
    const raw = localStorage.getItem(key);
    const existing: InteractionResult[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(existing)) {
      // Corrupted data - reset
      localStorage.setItem(key, JSON.stringify([result]));
      return;
    }
    existing.push({
      ...result,
      timeMs: Number(result.timeMs) || 0,
      attempts: Math.max(1, Number(result.attempts) || 1),
    });
    // Keep last 200 results
    const trimmed = existing.slice(-200);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving interaction result:', err);
  }
}

// Load interaction history
export function loadInteractionHistory(): InteractionResult[] {
  try {
    const key = 'pythagorath_interaction_history';
    return JSON.parse(localStorage.getItem(key) || '[]') as InteractionResult[];
  } catch {
    return [];
  }
}

// Get interaction stats
export function getInteractionStats(history: InteractionResult[]) {
  const emptyStats = { total: 0, correct: 0, accuracy: 0, avgTime: 0, avgAttempts: 0, favoriteType: '', byType: {} as Record<string, { total: number; correct: number }> };
  if (!Array.isArray(history) || history.length === 0) return emptyStats;

  // Filter out malformed entries
  const valid = history.filter(r => r && typeof r.correct === 'boolean' && typeof r.interactionType === 'string');
  if (valid.length === 0) return emptyStats;

  const correct = valid.filter(r => r.correct).length;
  const totalTime = valid.reduce((sum, r) => sum + (Number(r.timeMs) || 0), 0);
  const avgTime = totalTime / valid.length;
  const totalAttempts = valid.reduce((sum, r) => sum + (Number(r.attempts) || 1), 0);
  const avgAttempts = totalAttempts / valid.length;

  // Stats by type
  const byType: Record<string, { total: number; correct: number }> = {};
  valid.forEach(r => {
    const type = r.interactionType || 'unknown';
    if (!byType[type]) byType[type] = { total: 0, correct: 0 };
    byType[type].total++;
    if (r.correct) byType[type].correct++;
  });

  // Find favorite type
  const favoriteType = Object.entries(byType).sort((a, b) => b[1].total - a[1].total)[0]?.[0] || '';

  return {
    total: valid.length,
    correct,
    accuracy: Math.round((correct / valid.length) * 100),
    avgTime: Number.isFinite(avgTime) ? Math.round(avgTime / 1000) : 0,
    avgAttempts: Number.isFinite(avgAttempts) ? Math.round(avgAttempts * 10) / 10 : 1,
    favoriteType,
    byType,
  };
}

// Clear cache
export function clearInteractionCache() {
  backendCache = null;
  lastFetch = 0;
}

// Interaction type labels in Arabic
export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  drag_drop: 'سحب وإفلات',
  tap: 'اضغط للاختيار',
  matching: 'توصيل',
  number_line: 'خط الأعداد',
  counting_blocks: 'عدّ المكعبات',
  missing_number: 'العدد الناقص',
  sequence_ordering: 'ترتيب تسلسلي',
  shape_grouping: 'تصنيف أشكال',
  analog_clock: 'الساعة التناظرية',
  coin_money: 'النقود والعملات',
};

// Interaction type emojis
export const INTERACTION_TYPE_EMOJIS: Record<string, string> = {
  drag_drop: '🔀',
  tap: '👆',
  matching: '🔗',
  number_line: '📏',
  counting_blocks: '🧱',
  missing_number: '❓',
  sequence_ordering: '📋',
  shape_grouping: '🔷',
  analog_clock: '🕐',
  coin_money: '💰',
};

// Cognitive complexity labels
export const COMPLEXITY_LABELS: Record<string, string> = {
  low: 'بسيط',
  medium: 'متوسط',
  high: 'متقدم',
};

// ═══════════════════════════════════════════════════════════════════════════
// Subject Cognitive Template Integration
// Uses deterministic templates to select interactions appropriate for
// a given subject + grade combination per Oman curriculum rules.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get interactions filtered and prioritized by subject cognitive template.
 * This is the primary entry point for subject-aware interaction selection.
 *
 * @param subjectName - Arabic subject name (e.g. 'الرياضيات')
 * @param grade - Grade number (1-12)
 * @param count - Number of interactions to return
 * @param missionType - Optional mission type for additional filtering
 * @returns Prioritized interactions matching the subject's cognitive patterns
 */
export function getSubjectInteractions(
  subjectName: string,
  grade: number,
  count: number = 5,
  missionType?: string
): InteractionConfig[] {
  const safeCount = Math.max(1, Math.min(20, Math.round(Number(count) || 5)));
  const safeGrade = Math.max(1, Math.min(12, Math.round(Number(grade) || 1)));

  // Get template for this subject+grade
  const template = getSubjectTemplate(subjectName, safeGrade);

  // Source pool: backend cache or builtins
  const source = (Array.isArray(backendCache) && backendCache.length > 0)
    ? backendCache
    : BUILTIN_INTERACTIONS;
  const safeSource = (!source || source.length === 0) ? BUILTIN_INTERACTIONS : source;
  if (safeSource.length === 0) return [];

  // If no template found, fall back to mission-based selection
  if (!template) {
    return getMissionInteractions(missionType || 'learn', safeCount);
  }

  // Build weight map from template patterns
  const weightMap = new Map<string, number>();
  template.patterns.forEach((p) => weightMap.set(p.interactionType, p.weight));

  // Score each interaction
  const scored = safeSource
    .filter((i) => i && i.interaction_type)
    .map((interaction) => ({
      interaction,
      score: weightMap.get(interaction.interaction_type) || 0,
    }));

  // Sort by score descending, randomize within same score
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5;
  });

  // Select following session flow for diversity
  const sessionFlow = template.sessionFlow;
  const selected: InteractionConfig[] = [];
  const usedIds = new Set<number>();

  // First pass: follow session flow order for type diversity
  for (const flowType of sessionFlow) {
    if (selected.length >= safeCount) break;
    const candidate = scored.find(
      (s) => s.interaction.interaction_type === flowType && !usedIds.has(s.interaction.id)
    );
    if (candidate) {
      selected.push(candidate.interaction);
      usedIds.add(candidate.interaction.id);
    }
  }

  // Second pass: fill remaining from highest scored
  for (const item of scored) {
    if (selected.length >= safeCount) break;
    if (!usedIds.has(item.interaction.id)) {
      selected.push(item.interaction);
      usedIds.add(item.interaction.id);
    }
  }

  return selected.slice(0, safeCount);
}

/**
 * Get the recommended session flow for a subject+grade.
 * Returns ordered interaction types representing the ideal learning sequence.
 */
export function getSubjectSessionFlow(subjectName: string, grade: number): string[] {
  return getSessionFlow(subjectName, grade);
}

/**
 * Get the cognitive template metadata for a subject+grade (for admin display).
 */
export function getSubjectTemplateInfo(subjectName: string, grade: number): SubjectTemplate | null {
  return getSubjectTemplate(subjectName, grade);
}

/**
 * Check if a subject has a cognitive template defined for a grade.
 */
export function hasSubjectTemplate(subjectName: string, grade: number): boolean {
  return getSubjectTemplate(subjectName, grade) !== null;
}