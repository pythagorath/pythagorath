// Student Learning Initialization Flow - Dynamic Content System
// New Student: Login → Grade → Subject → Adaptive Diagnostic → Placement → Prerequisite Detection → Personalized Path → First Mission
// Returning Student: Login → Continue Journey (no re-onboarding)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { saveUserData, loadUserData } from '@/lib/pilotStorage';
import { Play, CheckCircle, Brain, Target, Sparkles, BookOpen, ArrowLeft, AlertTriangle, Link2, RotateCcw, Loader2 } from 'lucide-react';
import {
  getWelcomeMessage,
  getSuccessMessage,
  getRecoveryMessage,
  getMissionCompleteMessage,
  getAllMissionsCompleteMessage,
  getLevelUpMessage,
  getBreakMessage,
  getSessionEndMessage,
  type CompanionMessage,
  type EncouragementStyle,
  PYTHAGORATH,
} from '@/lib/learningCompanion';
import {
  loadLearnerProfile,
  saveLearnerProfile,
  createSessionMetrics,
  recordAnswer,
  generateSessionConfig,
  checkForIntervention,
  updateProfileFromSession,
  generateSessionSummary,
  generateAdaptiveSequence,
  assessPacing,
  updateSkillConfidence,
  getSkillsNeedingRetention,
  type SessionMetrics,
  type SessionConfig,
  type LearnerProfile,
  type MissionSequenceItem,
} from '@/lib/personalizationEngine';
import {
  loadHabitProfile,
  saveHabitProfile,
  processReturn,
  checkTinyWin,
  addXpAndProgress,
  getProgressionMessage,
  generateSessionEndFeeling,
  checkSurprise,
  getTomorrowPreview,
  getSessionStartBoost,
  trackSessionCompletion,
  type HabitProfile,
  type TinyWin,
  type SessionEndFeeling,
  type ComebackMessage,
} from '@/lib/habitEngine';
import {
  fetchGrades,
  fetchSubjects,
  fetchSkills,
  getDiagnosticQuestions,
  fetchLessons,
  fetchUnits,
  fetchCountries,
  fetchCurricula,
  getSubjectColor,
  type Country,
  type Curriculum,
  type DynamicGrade,
  type DynamicSubject,
  type DynamicSkill,
  type ParsedQuestion,
} from '@/lib/contentService';
import { InteractionRenderer, type InteractionConfig, type InteractionResult } from '@/components/InteractionToolkit';
import {
  getMissionInteractions,
  saveInteractionResult,
  loadInteractionHistory,
  getAdaptiveDifficulty,
  INTERACTION_TYPE_EMOJIS,
} from '@/lib/interactionService';

// Flow steps - professional initialization sequence with prerequisite detection
type FlowStep =
  | 'setup_country'       // Step 0: Choose country
  | 'setup_grade'         // Step 1: Choose grade
  | 'setup_subject'       // Step 2: Choose subject
  | 'diagnostic_intro'    // Step 3: Explain diagnostic purpose
  | 'diagnostic'          // Step 4: Quick diagnostic assessment
  | 'placement'           // Step 5: Show placement result
  | 'prerequisites'       // Step 6: Prerequisite detection
  | 'path_generation'     // Step 7: Generate personalized path
  | 'first_mission'       // Step 8: Present first mission
  | 'mission'             // Active learning - mission list
  | 'learning_activity'   // Active learning content (cards/exercises)
  | 'session_end'         // Session complete - stays in journey
  | 'done'               // All done
  | 'rest';              // Rest break

interface DiagnosticQuestion {
  id: number;
  text: string;
  options: string[];
  correct: number;
  skill: string;
}

interface MissionItem {
  id: number;
  title: string;
  completed: boolean;
  type: 'learn' | 'practice' | 'challenge' | 'review';
}

interface LearningCard {
  id: number;
  type: 'explanation' | 'example' | 'exercise' | 'summary';
  title: string;
  content: string;
  options?: string[];
  correct?: number;
}

interface PlacementResult {
  level: string;
  levelLabel: string;
  strengths: string[];
  weaknesses: string[];
  score: number;
  total: number;
}

interface PrerequisiteItem {
  skill: string;
  status: 'met' | 'gap' | 'partial';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// Fallback static data (used when backend is empty or unavailable)
const FALLBACK_GRADES: Array<{ id: string; label: string; emoji: string; description: string; dbId?: number }> = [
  { id: 'grade1', label: 'الصف الأول', emoji: '1️⃣', description: 'أساسيات الأعداد والعمليات' },
  { id: 'grade2', label: 'الصف الثاني', emoji: '2️⃣', description: 'عمليات متقدمة وحل مسائل' },
];

const FALLBACK_SUBJECTS: Array<{ id: string; label: string; emoji: string; color: string; description: string; dbId?: number }> = [
  { id: 'math', label: 'الرياضيات', emoji: '🔢', color: 'from-blue-500 to-indigo-600', description: 'أعداد، عمليات، أشكال' },
  { id: 'arabic', label: 'اللغة العربية', emoji: '📖', color: 'from-green-500 to-emerald-600', description: 'حروف، كلمات، جمل' },
  { id: 'science', label: 'العلوم', emoji: '🔬', color: 'from-purple-500 to-violet-600', description: 'طبيعة، حيوانات، جسم' },
];

const FALLBACK_QUESTIONS: Record<string, DiagnosticQuestion[]> = {
  'grade1_math': [
    { id: 1, text: 'كم يساوي ٣ + ٢ ؟', options: ['٤', '٥', '٦', '٣'], correct: 1, skill: 'جمع' },
    { id: 2, text: 'ما العدد بعد ٧ ؟', options: ['٦', '٩', '٨', '٥'], correct: 2, skill: 'تسلسل' },
    { id: 3, text: 'كم يساوي ٥ - ٢ ؟', options: ['٢', '٤', '٣', '١'], correct: 2, skill: 'طرح' },
    { id: 4, text: 'أي شكل له ٣ أضلاع؟', options: ['مربع', 'دائرة', 'مثلث', 'مستطيل'], correct: 2, skill: 'أشكال' },
    { id: 5, text: 'كم يساوي ٤ + ٤ ؟', options: ['٦', '٧', '٩', '٨'], correct: 3, skill: 'جمع' },
  ],
  'grade2_math': [
    { id: 1, text: 'كم يساوي ١٢ + ٥ ؟', options: ['١٥', '١٧', '١٦', '١٨'], correct: 1, skill: 'جمع' },
    { id: 2, text: 'كم يساوي ٢٠ - ٨ ؟', options: ['١١', '١٣', '١٢', '١٤'], correct: 2, skill: 'طرح' },
    { id: 3, text: 'ما ناتج ٣ × ٢ ؟', options: ['٥', '٧', '٦', '٨'], correct: 2, skill: 'ضرب' },
    { id: 4, text: 'كم دقيقة في الساعة؟', options: ['٣٠', '١٠٠', '٦٠', '٤٥'], correct: 2, skill: 'وقت' },
    { id: 5, text: 'أي عدد أكبر: ٤٥ أم ٥٤؟', options: ['٤٥', '٥٤', 'متساويان', 'لا أعرف'], correct: 1, skill: 'مقارنة' },
  ],
  'arabic': [
    { id: 1, text: 'ما أول حرف في "بيت"؟', options: ['ت', 'ي', 'ب', 'ا'], correct: 2, skill: 'حروف' },
    { id: 2, text: 'كم كلمة في: "الولد يلعب"؟', options: ['١', '٣', '٢', '٤'], correct: 1, skill: 'جمل' },
    { id: 3, text: 'ما جمع "كتاب"؟', options: ['كتابات', 'كتب', 'كاتب', 'مكتبة'], correct: 1, skill: 'جمع' },
    { id: 4, text: 'أي كلمة تبدأ بـ "ال"؟', options: ['بيت', 'المدرسة', 'كتاب', 'ولد'], correct: 1, skill: 'تعريف' },
    { id: 5, text: 'ما ضد "كبير"؟', options: ['طويل', 'صغير', 'واسع', 'ثقيل'], correct: 1, skill: 'أضداد' },
  ],
  'science': [
    { id: 1, text: 'ما لون أوراق الشجر؟', options: ['أحمر', 'أزرق', 'أخضر', 'أصفر'], correct: 2, skill: 'نباتات' },
    { id: 2, text: 'كم فصل في السنة؟', options: ['٣', '٥', '٤', '٢'], correct: 2, skill: 'فصول' },
    { id: 3, text: 'أين تعيش الأسماك؟', options: ['الغابة', 'الماء', 'الصحراء', 'الجبل'], correct: 1, skill: 'حيوانات' },
    { id: 4, text: 'ما حاسة الرؤية؟', options: ['الأذن', 'الأنف', 'العين', 'اليد'], correct: 2, skill: 'حواس' },
    { id: 5, text: 'ماذا نحتاج لنعيش؟', options: ['ألعاب', 'ماء وطعام', 'تلفاز', 'سيارة'], correct: 1, skill: 'احتياجات' },
  ],
};

// Prerequisite mapping (used for both dynamic and fallback)
const PREREQUISITE_MAP: Record<string, Record<string, { requires: string[]; description: string }>> = {
  'grade1_math': {
    'جمع': { requires: ['تسلسل'], description: 'الجمع يحتاج فهم تسلسل الأعداد' },
    'طرح': { requires: ['جمع', 'تسلسل'], description: 'الطرح يحتاج إتقان الجمع والتسلسل' },
    'أشكال': { requires: [], description: 'مهارة مستقلة' },
    'تسلسل': { requires: [], description: 'أساس كل المهارات العددية' },
  },
  'grade2_math': {
    'جمع': { requires: ['تسلسل'], description: 'جمع الأعداد الكبيرة يحتاج فهم المنازل' },
    'طرح': { requires: ['جمع'], description: 'الطرح يبنى على إتقان الجمع' },
    'ضرب': { requires: ['جمع'], description: 'الضرب هو جمع متكرر' },
    'وقت': { requires: ['تسلسل'], description: 'قراءة الساعة تحتاج فهم الأعداد' },
    'مقارنة': { requires: ['تسلسل'], description: 'المقارنة تحتاج فهم ترتيب الأعداد' },
  },
  'arabic': {
    'حروف': { requires: [], description: 'أساس القراءة والكتابة' },
    'جمل': { requires: ['حروف'], description: 'فهم الجمل يحتاج معرفة الحروف' },
    'جمع': { requires: ['حروف'], description: 'الجمع اللغوي يحتاج معرفة الكلمات' },
    'تعريف': { requires: ['حروف'], description: 'أداة التعريف تحتاج معرفة الحروف' },
    'أضداد': { requires: ['حروف'], description: 'الأضداد تحتاج مفردات أساسية' },
  },
  'science': {
    'نباتات': { requires: [], description: 'ملاحظة مباشرة' },
    'فصول': { requires: [], description: 'معرفة عامة' },
    'حيوانات': { requires: [], description: 'ملاحظة مباشرة' },
    'حواس': { requires: [], description: 'تجربة شخصية' },
    'احتياجات': { requires: [], description: 'معرفة أساسية' },
  },
};

// Learning content cards for each mission type (dynamic content will override when available)
const DEFAULT_LEARNING_CARDS: Record<string, LearningCard[]> = {
  'learn': [
    { id: 1, type: 'explanation', title: 'تعلم المفهوم', content: 'لنتعرف على هذا المفهوم الجديد معاً! تذكر أن كل خطوة صغيرة تقربك من الهدف.' },
    { id: 2, type: 'example', title: 'مثال توضيحي', content: 'شاهد هذا المثال وحاول فهم الطريقة.' },
    { id: 3, type: 'exercise', title: 'جربها بنفسك!', content: 'كم يساوي ٣ + ٤ ؟', options: ['٥', '٧', '٨', '٦'], correct: 1 },
    { id: 4, type: 'summary', title: 'أحسنت! 🎉', content: 'لقد أكملت هذا الدرس بنجاح. المفهوم الأساسي هو التطبيق المتكرر.' },
  ],
  'practice': [
    { id: 1, type: 'exercise', title: 'تمرين ١', content: 'كم يساوي ٦ + ٢ ؟', options: ['٥', '٧', '٨', '٦'], correct: 2 },
    { id: 2, type: 'exercise', title: 'تمرين ٢', content: 'ما العدد الذي يأتي بعد ٢ ؟', options: ['٣', '٤', '٥', '٦'], correct: 0 },
    { id: 3, type: 'exercise', title: 'تمرين ٣', content: 'هل ٥ أكبر من ٣ ؟', options: ['صح', 'خطأ', 'أحياناً', 'لا أعرف'], correct: 0 },
    { id: 4, type: 'summary', title: 'ممتاز! 💪', content: 'أكملت التمارين بنجاح! استمر بهذا الأداء.' },
  ],
  'challenge': [
    { id: 1, type: 'explanation', title: 'تحدي اليوم! 🚀', content: 'هذا تحدي خاص - حاول حله بأسرع وقت!' },
    { id: 2, type: 'exercise', title: 'السؤال الأول', content: 'كم يساوي ٧ + ٥ ؟', options: ['١٠', '١١', '١٢', '١٣'], correct: 2 },
    { id: 3, type: 'exercise', title: 'السؤال الثاني', content: 'كم يساوي ٩ + ٧ ؟', options: ['١٤', '١٢', '١٦', '١٥'], correct: 2 },
    { id: 4, type: 'summary', title: 'بطل! 🏆', content: 'أكملت التحدي! أنت تتقدم بسرعة رائعة.' },
  ],
  'review': [
    { id: 1, type: 'explanation', title: 'مراجعة سريعة', content: 'لنراجع ما تعلمناه سابقاً للتأكد من تثبيت المعلومات.' },
    { id: 2, type: 'exercise', title: 'هل تتذكر؟', content: 'كم يساوي ٤ + ٤ ؟', options: ['٦', '٧', '٩', '٨'], correct: 3 },
    { id: 3, type: 'exercise', title: 'سؤال مراجعة', content: 'ما ناتج ١٠ - ٣ ؟', options: ['٥', '٦', '٧', '٨'], correct: 2 },
    { id: 4, type: 'summary', title: 'رائع! ✅', content: 'ذاكرتك ممتازة! المعلومات مثبتة جيداً.' },
  ],
};

function getFallbackQuestions(grade: string, subject: string): DiagnosticQuestion[] {
  if (subject === 'arabic') return FALLBACK_QUESTIONS['arabic'];
  if (subject === 'science') return FALLBACK_QUESTIONS['science'];
  if (grade === 'grade2') return FALLBACK_QUESTIONS['grade2_math'];
  return FALLBACK_QUESTIONS['grade1_math'];
}

function detectPrerequisites(grade: string, subject: string, strengths: string[], weaknesses: string[]): PrerequisiteItem[] {
  const key = subject === 'math' ? `${grade}_math` : subject;
  const map = PREREQUISITE_MAP[key] || {};
  const results: PrerequisiteItem[] = [];

  for (const weak of weaknesses) {
    const prereqs = map[weak];
    if (!prereqs) continue;

    for (const req of prereqs.requires) {
      if (weaknesses.includes(req)) {
        results.push({ skill: req, status: 'gap', description: `${req} مطلوب قبل ${weak}`, priority: 'high' });
      } else if (strengths.includes(req)) {
        results.push({ skill: req, status: 'met', description: `${req} متقن ✓`, priority: 'low' });
      } else {
        results.push({ skill: req, status: 'partial', description: `${req} يحتاج تأكيد`, priority: 'medium' });
      }
    }
  }

  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.skill)) return false;
    seen.add(r.skill);
    return true;
  });
}

function buildMissions(config: SessionConfig, _subject: string): MissionItem[] {
  if (config.missionSequence && config.missionSequence.length > 0) {
    const types: Array<'learn' | 'practice' | 'challenge' | 'review'> = ['learn', 'practice', 'challenge', 'review'];
    return config.missionSequence.map((item, i) => ({
      id: i + 1,
      title: `${item.emoji} ${item.label}`,
      completed: false,
      type: types[i % types.length],
    }));
  }

  const missionTypes: Record<string, { titles: string[]; type: 'learn' | 'practice' | 'challenge' | 'review' }> = {
    learn: { titles: ['📖 درس جديد', '🎯 تمرين', '🌟 تحدي'], type: 'learn' },
    review: { titles: ['📝 مراجعة', '🔄 تثبيت', '✅ اختبار'], type: 'review' },
    practice: { titles: ['🎯 تدريب', '💪 تمرين', '📝 تطبيق'], type: 'practice' },
    challenge: { titles: ['🚀 تحدي!', '🧠 ذكاء', '⏱️ سباق'], type: 'challenge' },
    rest: { titles: ['🌿 نشاط خفيف', '🎮 لعبة'], type: 'learn' },
    retention: { titles: ['🔄 مراجعة تثبيت', '📝 تأكيد إتقان', '✨ تعزيز'], type: 'review' },
    remediation: { titles: ['🌱 تقوية أساس', '💪 بناء مهارة', '🎯 تطبيق'], type: 'practice' },
  };
  const cfg = missionTypes[config.sessionType] || missionTypes['learn'];
  const count = Math.min(config.missionCount, cfg.titles.length);
  const types: Array<'learn' | 'practice' | 'challenge' | 'review'> = ['learn', 'practice', 'challenge', 'review'];
  return cfg.titles.slice(0, count).map((title, i) => ({
    id: i + 1,
    title,
    completed: false,
    type: i === 0 ? cfg.type : types[(i + 1) % types.length],
  }));
}

// ─── Saved state shape ───
interface SavedFlow {
  countryId?: number;
  countryName?: string;
  grade: string;
  subject: string;
  level: string;
  xp: number;
  missions: MissionItem[];
  initialized: boolean;
  prerequisites?: PrerequisiteItem[];
}

// Validate saved state shape to prevent crashes from corrupted localStorage
function validateSavedFlow(data: unknown): SavedFlow | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  // Required fields type check
  if (typeof d.grade !== 'string') return null;
  if (typeof d.subject !== 'string') return null;
  if (typeof d.level !== 'string') return null;
  if (typeof d.xp !== 'number' || !Number.isFinite(d.xp) || d.xp < 0) return null;
  if (!Array.isArray(d.missions)) return null;
  if (typeof d.initialized !== 'boolean') return null;
  // Validate missions array items
  const validMissions = d.missions.filter(
    (m: unknown) => m && typeof m === 'object' && 'id' in (m as object) && 'title' in (m as object)
  ) as MissionItem[];
  return {
    countryId: typeof d.countryId === 'number' ? d.countryId : undefined,
    countryName: typeof d.countryName === 'string' ? d.countryName : undefined,
    grade: d.grade as string,
    subject: d.subject as string,
    level: d.level as string,
    xp: Math.max(0, d.xp as number),
    missions: validMissions,
    initialized: d.initialized as boolean,
    prerequisites: Array.isArray(d.prerequisites) ? d.prerequisites as PrerequisiteItem[] : undefined,
  };
}

// ─── Companion ───
function Companion({ msg, show }: { msg: CompanionMessage | null; show: boolean }) {
  if (!msg || !show) return null;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 mb-6">
      <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-indigo-100/60 max-w-xs mx-auto">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-base">{msg.emoji}</span>
        </div>
        <p className="text-gray-700 font-tajawal text-sm leading-relaxed">{msg.text}</p>
      </div>
    </div>
  );
}

// ─── Tiny Win Toast ───
function TinyWinToast({ win, show }: { win: TinyWin | null; show: boolean }) {
  if (!win || !show) return null;
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg border border-amber-100 flex items-center gap-2">
        <span className="text-xl animate-bounce-gentle">{win.emoji}</span>
        <span className="text-sm font-bold text-gray-700 font-tajawal">{win.message}</span>
      </div>
    </div>
  );
}

// ─── Celebrate ───
function Celebrate({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {['⭐', '✨', '🎉'].map((e, i) => (
        <span
          key={i}
          className="absolute text-3xl animate-float-up"
          style={{ left: `${30 + i * 20}%`, animationDelay: `${i * 0.2}s`, animationDuration: '1.8s' }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}

// ─── Level Up Overlay ───
function LevelUpOverlay({ show, title }: { show: boolean; title: string }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-500 max-w-xs mx-4">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <span className="text-3xl">🏆</span>
        </div>
        <p className="text-lg font-bold text-gray-800 font-tajawal">مستوى جديد!</p>
        <p className="text-xl font-bold text-indigo-600 font-tajawal">{title}</p>
      </div>
    </div>
  );
}

// ─── Session End Screen (stays in journey) ───
function SessionEndScreen({
  feeling,
  habitProfile,
  onContinue,
  onExit,
}: {
  feeling: SessionEndFeeling;
  habitProfile: HabitProfile;
  onContinue: () => void;
  onExit: () => void;
}) {
  const tomorrow = getTomorrowPreview(habitProfile);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 text-center">
      <div className="space-y-2">
        <span className="text-4xl">{feeling.achievementEmoji}</span>
        <p className="text-xl font-bold text-gray-800 font-tajawal">{feeling.achievement}</p>
        <p className="text-sm text-gray-500 font-tajawal">{feeling.restMessage}</p>
      </div>

      <div className="bg-white/80 rounded-2xl p-4 border border-indigo-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-tajawal">المستوى {habitProfile.journeyLevel}</span>
          <span className="text-xs font-bold text-indigo-500 font-tajawal">{habitProfile.journeyTitle}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, Math.max(5, ((habitProfile.totalXp % 100) / 100) * 100))}%` }}
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100/60">
        <div className="flex items-center gap-2 justify-center mb-1">
          <span className="text-lg">{tomorrow.emoji}</span>
          <p className="text-sm font-bold text-amber-700 font-tajawal">{feeling.returnDesire}</p>
        </div>
        <p className="text-xs text-amber-600/80 font-tajawal">{feeling.tomorrowHint}</p>
      </div>

      {habitProfile.currentStreak > 0 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">🔥</span>
          <span className="text-xs font-bold text-orange-500 font-tajawal">
            {habitProfile.currentStreak} يوم متواصل
          </span>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg py-4 rounded-2xl font-tajawal font-bold shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
        >
          أكمل التعلم 🚀
        </button>
        <button
          onClick={onExit}
          className="w-full bg-gray-100 text-gray-600 text-sm py-3 rounded-2xl font-tajawal font-medium hover:bg-gray-200 transition-all touch-manipulation"
        >
          خلاص لليوم 👋
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// LEARNING ACTIVITY COMPONENT (with Interactions)
// ═══════════════════════════════════════════
function LearningActivity({
  mission,
  onComplete,
  onBack,
  style,
  dynamicCards,
}: {
  mission: MissionItem;
  onComplete: () => void;
  onBack: () => void;
  style: EncouragementStyle;
  dynamicCards?: Record<string, LearningCard[]>;
}) {
  const cardSource = dynamicCards || DEFAULT_LEARNING_CARDS;
  const cards = cardSource[mission.type] || cardSource['learn'] || DEFAULT_LEARNING_CARDS['learn'];
  const [cardIdx, setCardIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Interaction state - interactions are PRIMARY learning mode
  const [interactions] = useState<InteractionConfig[]>(() => {
    // Synchronous - get interactions immediately based on mission type
    const history = loadInteractionHistory();
    const difficulty = getAdaptiveDifficulty(history);
    // Get more interactions for practice/challenge missions
    const count = mission.type === 'practice' || mission.type === 'challenge' ? 4 : 3;
    const allForMission = getMissionInteractions(mission.type, count);
    // Filter by adaptive difficulty (prefer matching difficulty, but allow others)
    const matching = allForMission.filter(i => i.difficulty === difficulty);
    return matching.length >= 2 ? matching.slice(0, count) : allForMission;
  });
  const [interactionIdx, setInteractionIdx] = useState(0);
  // Start with interactions (PRIMARY), then cards as reinforcement
  const [phase, setPhase] = useState<'interactions' | 'cards'>(interactions.length > 0 ? 'interactions' : 'cards');
  const [interactionResults, setInteractionResults] = useState<InteractionResult[]>([]);
  const [showInteractionSuccess, setShowInteractionSuccess] = useState(false);

  const totalSteps = interactions.length + cards.length;
  const currentStep = phase === 'interactions' ? interactionIdx + 1 : interactions.length + cardIdx + 1;
  const progress = (currentStep / totalSteps) * 100;

  const currentCard = cards[cardIdx];
  const isLastCard = cardIdx === cards.length - 1;
  const isLastInteraction = interactionIdx === interactions.length - 1;

  const handleAnswer = (idx: number) => {
    if (showFeedback) return;
    setSelectedAnswer(idx);
    setShowFeedback(true);
    if (currentCard.correct !== undefined && idx === currentCard.correct) {
      setCorrectCount(c => c + 1);
    }
  };

  const nextCard = () => {
    if (isLastCard) {
      onComplete();
    } else {
      setCardIdx(cardIdx + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const handleInteractionComplete = (result: InteractionResult) => {
    const newResults = [...interactionResults, result];
    setInteractionResults(newResults);
    saveInteractionResult(result);

    if (result.correct) {
      setCorrectCount(c => c + 1);
      setShowInteractionSuccess(true);
    }

    // Auto-advance after showing success/feedback
    setTimeout(() => {
      setShowInteractionSuccess(false);
      if (isLastInteraction) {
        // After all interactions, show cards as reinforcement (or complete)
        if (cards.length > 0) {
          setPhase('cards');
          setCardIdx(0);
        } else {
          onComplete();
        }
      } else {
        setInteractionIdx(interactionIdx + 1);
      }
    }, result.correct ? 1500 : 800);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 font-tajawal">{currentStep}/{totalSteps}</span>
      </div>

      {/* Mission title with phase indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-400 font-tajawal">{mission.title}</p>
        {phase === 'interactions' && interactions[interactionIdx] && (
          <p className="text-xs text-indigo-500 font-tajawal mt-1">
            {INTERACTION_TYPE_EMOJIS[interactions[interactionIdx].interaction_type] || '🎮'} نشاط تفاعلي
          </p>
        )}
        {phase === 'cards' && (
          <p className="text-xs text-emerald-500 font-tajawal mt-1">📖 مراجعة وتعزيز</p>
        )}
      </div>

      {/* Success overlay for interactions */}
      {showInteractionSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="text-5xl mb-3">🌟</div>
            <p className="text-lg font-bold text-green-600 font-tajawal">أحسنت!</p>
          </div>
        </div>
      )}

      {/* INTERACTION PHASE (PRIMARY - comes first) */}
      {phase === 'interactions' && interactions[interactionIdx] && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <InteractionRenderer
            interaction={interactions[interactionIdx]}
            onComplete={handleInteractionComplete}
          />
          {/* Interaction counter dots */}
          <div className="flex justify-center gap-2 mt-4">
            {interactions.map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  idx < interactionIdx ? 'bg-green-400 scale-90' :
                  idx === interactionIdx ? 'bg-indigo-500 scale-110' :
                  'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* CARD PHASE (reinforcement - comes after interactions) */}
      {phase === 'cards' && currentCard && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 min-h-[280px] flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 font-tajawal mb-4 text-center">
            {currentCard.title}
          </h3>

          <p className="text-gray-600 font-tajawal text-center leading-relaxed mb-6">
            {currentCard.content || (currentCard.options ? 'اختر الإجابة الصحيحة:' : '')}
          </p>

          {/* Exercise options */}
          {currentCard.options && (
            <div className="grid grid-cols-2 gap-3 mt-auto">
              {currentCard.options.map((opt, idx) => {
                let cls = 'bg-gray-50 border-gray-100 hover:bg-indigo-50 hover:border-indigo-200';
                if (showFeedback && selectedAnswer === idx && idx === currentCard.correct) {
                  cls = 'bg-green-50 border-green-300 scale-[1.02]';
                } else if (showFeedback && selectedAnswer === idx) {
                  cls = 'bg-orange-50 border-orange-200';
                } else if (showFeedback && idx === currentCard.correct) {
                  cls = 'bg-green-50 border-green-300';
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={showFeedback}
                    className={`p-4 rounded-2xl border-2 text-center font-bold text-base font-tajawal transition-all duration-200 touch-manipulation active:scale-95 ${cls}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Feedback or next button */}
          {(currentCard.type !== 'exercise' || showFeedback) && (
            <button
              onClick={nextCard}
              className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3.5 rounded-2xl font-tajawal font-bold shadow-md hover:shadow-lg transition-all touch-manipulation active:scale-[0.98]"
            >
              {isLastCard ? 'أكملت! ✨' : 'التالي ←'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function ChildGuidedFlow() {
  const { user } = useAuth();
  const { logout } = usePilotAuth();
  const navigate = useNavigate();

  // ─── Saved progress (must be declared before state that depends on it) ───
  const rawSaved = loadUserData<SavedFlow | null>('guided_flow_state', null);
  const saved = validateSavedFlow(rawSaved);
  const isReturningStudent = saved !== null && saved.initialized === true;

  // ─── Country/Curriculum state ───
  const [countries, setCountries] = useState<Country[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(saved?.countryId || null);
  const [selectedCountryName, setSelectedCountryName] = useState<string>(saved?.countryName || '');
  const [countriesLoading, setCountriesLoading] = useState(true);

  // ─── Dynamic content state ───
  const [GRADES, setGRADES] = useState(FALLBACK_GRADES);
  const [SUBJECTS, setSUBJECTS] = useState(FALLBACK_SUBJECTS);
  const [dynamicQuestions, setDynamicQuestions] = useState<Record<string, DiagnosticQuestion[]>>(FALLBACK_QUESTIONS);
  const [dynamicLearningCards, setDynamicLearningCards] = useState<Record<string, LearningCard[]>>(DEFAULT_LEARNING_CARDS);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);

  // ─── Invisible state ───
  const [profile, setProfile] = useState<LearnerProfile>(loadLearnerProfile());
  const [metrics, setMetrics] = useState<SessionMetrics>(createSessionMetrics());
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [habitProfile, setHabitProfile] = useState<HabitProfile>(loadHabitProfile());
  const questionStart = useRef(Date.now());

  // ─── Visible state ───
  const [step, setStep] = useState<FlowStep>(isReturningStudent ? 'mission' : 'setup_country');
  const [grade, setGrade] = useState(saved?.grade || '');
  const [subject, setSubject] = useState(saved?.subject || '');
  const [level, setLevel] = useState(saved?.level || 'beginner');
  const [xp, setXp] = useState(saved?.xp || 0);
  const [missions, setMissions] = useState<MissionItem[]>(saved?.missions || []);
  const [activeMission, setActiveMission] = useState<MissionItem | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sessionEndFeeling, setSessionEndFeeling] = useState<SessionEndFeeling | null>(null);
  const [placementResult, setPlacementResult] = useState<PlacementResult | null>(null);
  const [prerequisites, setPrerequisites] = useState<PrerequisiteItem[]>([]);
  const [pathAnimating, setPathAnimating] = useState(false);
  const [pathReady, setPathReady] = useState(false);

  // ─── Companion ───
  const [msg, setMsg] = useState<CompanionMessage | null>(null);
  const [showMsg, setShowMsg] = useState(false);
  const [showCeleb, setShowCeleb] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpTitle, setLevelUpTitle] = useState('');
  const [tinyWin, setTinyWin] = useState<TinyWin | null>(null);
  const [showTinyWin, setShowTinyWin] = useState(false);
  const [ccCorrect, setCcCorrect] = useState(0);
  const [ccWrong, setCcWrong] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  const style: EncouragementStyle = config?.encouragementStyle || 'cheerful';

  // ─── Load countries on mount ───
  useEffect(() => {
    let cancelled = false;
    async function loadCountries() {
      try {
        setCountriesLoading(true);
        const ctrs = await fetchCountries();
        if (!cancelled && ctrs.length > 0) {
          setCountries(ctrs);
        }
        // Also load curricula
        const curs = await fetchCurricula();
        if (!cancelled && curs.length > 0) {
          setCurricula(curs);
        }
      } catch (err) {
        console.warn('[ChildGuidedFlow] Countries load failed:', err);
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    }
    loadCountries();
    return () => { cancelled = true; };
  }, []);

  // ─── Dynamic content loading from backend (filtered by selected country) ───
  useEffect(() => {
    // Only load content once a country is selected (or for returning students with saved country)
    if (!selectedCountryId) {
      // No country selected yet - skip loading, keep fallback
      setContentLoading(false);
      return;
    }

    let cancelled = false;
    async function loadDynamicContent() {
      try {
        setContentLoading(true);
        setContentLoaded(false);

        const filter = { countryId: selectedCountryId! };

        // Fetch grades filtered by country
        const dbGrades = await fetchGrades(filter.countryId);
        if (!cancelled && dbGrades.length > 0) {
          const mappedGrades = dbGrades.map((g: DynamicGrade) => ({
            id: g.slug || `grade${g.grade_number}`,
            label: g.name,
            emoji: g.grade_number === 1 ? '1️⃣' : g.grade_number === 2 ? '2️⃣' : g.grade_number === 3 ? '3️⃣' : '📚',
            description: g.description || '',
            dbId: g.id,
          }));
          setGRADES(mappedGrades);
        } else if (!cancelled) {
          setGRADES(FALLBACK_GRADES);
        }

        // Fetch subjects filtered by country
        const dbSubjects = await fetchSubjects(undefined, undefined, filter);
        if (!cancelled && dbSubjects.length > 0) {
          const mappedSubjects = dbSubjects.map((s: DynamicSubject) => ({
            id: s.slug || s.name.toLowerCase(),
            label: s.name,
            emoji: s.icon || '📘',
            color: getSubjectColor(s.slug || s.name),
            description: s.description || '',
            dbId: s.id,
          }));
          setSUBJECTS(mappedSubjects);
        } else if (!cancelled) {
          setSUBJECTS(FALLBACK_SUBJECTS);
        }

        // Fetch diagnostic questions filtered by country
        const diagnosticQs = await getDiagnosticQuestions(filter);
        if (!cancelled && Object.keys(diagnosticQs).length > 0) {
          setDynamicQuestions({ ...FALLBACK_QUESTIONS, ...diagnosticQs });
        } else if (!cancelled) {
          setDynamicQuestions(FALLBACK_QUESTIONS);
        }

        // Fetch lessons for learning cards filtered by country
        const dbLessons = await fetchLessons(undefined, filter);
        if (!cancelled && dbLessons.length > 0) {
          // Convert lessons to learning cards grouped by type
          const cardsByType: Record<string, LearningCard[]> = {};
          dbLessons.forEach((lesson) => {
            const type = lesson.lesson_type || 'learn';
            if (!cardsByType[type]) cardsByType[type] = [];
            // Parse lesson content into cards
            if (lesson.content_json) {
              try {
                const parsed = typeof lesson.content_json === 'string'
                  ? JSON.parse(lesson.content_json)
                  : lesson.content_json;
                if (Array.isArray(parsed)) {
                  parsed.forEach((card: Record<string, unknown>, idx: number) => {
                    const cardType = (card.type as string) || 'explanation';
                    const hasOptions = Array.isArray(card.options) && (card.options as string[]).length > 0;
                    // Ensure exercise cards always have a question prompt
                    let cardContent = (card.content as string) || '';
                    if (!cardContent && (cardType === 'exercise' || hasOptions)) {
                      cardContent = (card.question as string) || (card.prompt as string) || 'اختر الإجابة الصحيحة:';
                    }
                    cardsByType[type].push({
                      id: idx + 1,
                      type: cardType,
                      title: (card.title as string) || lesson.title || lesson.name,
                      content: cardContent,
                      options: card.options as string[] | undefined,
                      correct: card.correct as number | undefined,
                    });
                  });
                }
              } catch {
                // If content_json is not parseable, create a simple card
                cardsByType[type].push({
                  id: 1,
                  type: 'explanation',
                  title: lesson.title || lesson.name,
                  content: lesson.description || '',
                });
              }
            }
          });
          if (Object.keys(cardsByType).length > 0) {
            setDynamicLearningCards({ ...DEFAULT_LEARNING_CARDS, ...cardsByType });
          } else {
            setDynamicLearningCards(DEFAULT_LEARNING_CARDS);
          }
        }

        if (!cancelled) {
          setContentLoaded(true);
        }
      } catch (err) {
        console.warn('[ChildGuidedFlow] Dynamic content load failed, using fallback:', err);
        if (!cancelled) {
          setContentLoaded(true); // Still mark as loaded to proceed with fallback
        }
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    }
    loadDynamicContent();
    return () => { cancelled = true; };
  }, [selectedCountryId]);

  // Helper to get questions (dynamic or fallback)
  const getQuestions = useCallback((g: string, s: string): DiagnosticQuestion[] => {
    // Try dynamic questions first with various key formats
    const keys = [
      `${g}_${s}`,
      s,
      `grade1_${s}`,
      `grade2_${s}`,
    ];
    for (const key of keys) {
      if (dynamicQuestions[key] && dynamicQuestions[key].length > 0) {
        return dynamicQuestions[key];
      }
    }
    // Fallback
    return getFallbackQuestions(g, s);
  }, [dynamicQuestions]);

  const say = useCallback((m: CompanionMessage, ms = 3000) => {
    setMsg(m);
    setShowMsg(true);
    setTimeout(() => setShowMsg(false), ms);
  }, []);

  const celebrate = useCallback(() => {
    setShowCeleb(true);
    setTimeout(() => setShowCeleb(false), 1800);
  }, []);

  const showTinyWinToast = useCallback((win: TinyWin) => {
    setTinyWin(win);
    setShowTinyWin(true);
    setTimeout(() => setShowTinyWin(false), 2000);
  }, []);

  const persist = (data: Partial<SavedFlow>) => {
    const state: SavedFlow = {
      countryId: data.countryId ?? selectedCountryId ?? undefined,
      countryName: data.countryName ?? (selectedCountryName || undefined),
      grade: data.grade ?? grade,
      subject: data.subject ?? subject,
      level: data.level ?? level,
      xp: Math.max(0, Number(data.xp ?? xp) || 0),
      missions: Array.isArray(data.missions ?? missions) ? (data.missions ?? missions) : [],
      initialized: data.initialized ?? (saved?.initialized || false),
      prerequisites: data.prerequisites ?? prerequisites,
    };
    // Validate before persisting to prevent saving corrupted state
    if (!state.grade && !state.subject && !state.initialized) return;
    const success = saveUserData('guided_flow_state', state);
    if (!success) {
      console.warn('[ChildGuidedFlow] Failed to persist state');
    }
    // Dual-write: mirror progress to the database (in addition to localStorage) so the
    // student's progress survives across devices and is visible to admins/parents.
    void saveProgressToDb(state);
  };

  // Fire-and-forget DB write of the latest progress snapshot to engagement_events.
  // The full snapshot is stored as JSON in extra_data (event_type is the required field;
  // user_id is set server-side from the authenticated user). Failure never blocks the UI.
  const saveProgressToDb = async (state: SavedFlow) => {
    if (!user?.id) return;
    try {
      const completedMissions = Array.isArray(state.missions)
        ? state.missions.filter(m => m.completed).length
        : 0;
      await client.entities['engagement_events'].create({
        data: {
          event_type: 'progress_snapshot',
          page_context: 'child_guided_flow',
          extra_data: JSON.stringify({
            grade: state.grade,
            subject: state.subject,
            level: state.level,
            xp: state.xp,
            total_missions: Array.isArray(state.missions) ? state.missions.length : 0,
            completed_missions: completedMissions,
            initialized: state.initialized,
            at: new Date().toISOString(),
          }),
        },
      });
    } catch (err) {
      // Non-fatal: localStorage already holds the source of truth for the session.
      console.warn('[ChildGuidedFlow] DB progress write failed (kept in localStorage):', err);
    }
  };

  // ─── Process return & habit tracking ───
  useEffect(() => {
    const { updatedProfile: newHabit, comeback } = processReturn(habitProfile);
    const { hasSurprise } = checkSurprise(newHabit);
    newHabit.surpriseReady = hasSurprise;
    setHabitProfile(newHabit);
    saveHabitProfile(newHabit);

    if (isReturningStudent && saved) {
      setGrade(saved.grade);
      setSubject(saved.subject);
      setLevel(saved.level);
      setXp(saved.xp);
      setMissions(saved.missions);
      if (saved.prerequisites) setPrerequisites(saved.prerequisites);
      const cfg = generateSessionConfig(profile);
      setConfig(cfg);

      // If all missions done, generate new ones
      if (saved.missions.every(m => m.completed)) {
        const newMissions = buildMissions(cfg, saved.subject);
        setMissions(newMissions);
        persist({ missions: newMissions, initialized: true });
      }

      say({
        text: `${comeback.greeting} ${comeback.encouragement}`,
        emoji: comeback.emoji,
        type: 'welcome',
      }, 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── First-time welcome ───
  useEffect(() => {
    if (!isReturningStudent && (step === 'setup_country' || step === 'setup_grade')) {
      setTimeout(() => say(getWelcomeMessage(user?.name || 'يا بطل', false), 3500), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══ HANDLERS ═══

  const pickGrade = (g: string) => {
    setGrade(g);
    setStep('setup_subject');
  };

  const pickSubject = (s: string) => {
    setSubject(s);
    setStep('diagnostic_intro');
  };

  const startDiagnostic = () => {
    setStep('diagnostic');
    setQIdx(0);
    setAnswers([]);
    setCcCorrect(0);
    setCcWrong(0);
    setSessionCorrect(0);
    setSessionTotal(0);
    setMetrics(createSessionMetrics());
    questionStart.current = Date.now();
  };

  const pickAnswer = (idx: number) => {
    if (feedback) return;
    setPicked(idx);
    setFeedback(true);

    const qs = getQuestions(grade, subject);
    const correct = idx === qs[qIdx].correct;
    const time = (Date.now() - questionStart.current) / 1000;
    const updatedMetrics = recordAnswer(metrics, time, correct);
    setMetrics(updatedMetrics);

    const newTotal = sessionTotal + 1;
    const newCorrect = correct ? sessionCorrect + 1 : sessionCorrect;
    setSessionTotal(newTotal);
    setSessionCorrect(newCorrect);

    if (correct) {
      const n = ccCorrect + 1;
      setCcCorrect(n);
      setCcWrong(0);
      say(getSuccessMessage(n, style));
    } else {
      const n = ccWrong + 1;
      setCcWrong(n);
      setCcCorrect(0);
      say(getRecoveryMessage(n, style), 3500);
    }

    setTimeout(() => {
      const newAnswers = [...answers, idx];
      setAnswers(newAnswers);
      setFeedback(false);
      setPicked(null);
      questionStart.current = Date.now();

      if (qIdx < qs.length - 1) {
        setQIdx(qIdx + 1);
      } else {
        // Diagnostic complete → Calculate placement
        const correctCount = newAnswers.filter((a, i) => a === qs[i].correct).length;
        const lv = correctCount <= 2 ? 'beginner' : correctCount <= 4 ? 'intermediate' : 'advanced';
        const lvLabel = lv === 'beginner' ? 'مبتدئ' : lv === 'intermediate' ? 'متوسط' : 'متقدم';
        const strengths = qs.filter((q, i) => newAnswers[i] === q.correct).map(q => q.skill);
        const weaknesses = qs.filter((q, i) => newAnswers[i] !== q.correct).map(q => q.skill);

        setLevel(lv);
        setPlacementResult({
          level: lv,
          levelLabel: lvLabel,
          strengths: [...new Set(strengths)],
          weaknesses: [...new Set(weaknesses)],
          score: correctCount,
          total: qs.length,
        });

        const updatedProfile = { ...updateProfileFromSession(profile, updatedMetrics), weakSkills: [...new Set(weaknesses)] };
        setProfile(updatedProfile);
        saveLearnerProfile(updatedProfile);

        const cfg = generateSessionConfig(updatedProfile);
        setConfig(cfg);

        setStep('placement');
        celebrate();
      }
    }, 1200);
  };

  const proceedToPrerequisites = () => {
    const detected = detectPrerequisites(
      grade,
      subject,
      placementResult?.strengths || [],
      placementResult?.weaknesses || []
    );
    setPrerequisites(detected);
    setStep('prerequisites');
  };

  const proceedToPathGeneration = () => {
    setStep('path_generation');
    setPathAnimating(true);
    setTimeout(() => {
      setPathAnimating(false);
      setPathReady(true);
    }, 2500);
  };

  const proceedToFirstMission = () => {
    const cfg = config || generateSessionConfig(profile);
    const newMissions = buildMissions(cfg, subject);
    setMissions(newMissions);

    const xpGained = 20;
    const { updatedProfile: newHabit, leveledUp, newTitle } = addXpAndProgress(habitProfile, xpGained);
    setHabitProfile(newHabit);
    saveHabitProfile(newHabit);
    const newXp = xp + xpGained;
    setXp(newXp);

    persist({ grade, subject, level, xp: newXp, missions: newMissions, initialized: true, prerequisites });

    if (leveledUp) {
      setLevelUpTitle(newTitle);
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }

    setStep('first_mission');
  };

  const startLearning = () => {
    setStep('mission');
    say(getLevelUpMessage(level), 3000);
  };

  // Start a learning activity for a specific mission
  const startMissionActivity = (mission: MissionItem) => {
    setActiveMission(mission);
    setStep('learning_activity');
  };

  // Complete the learning activity and mark mission done
  const completeLearningActivity = () => {
    if (!activeMission) return;

    const updated = missions.map(m => m.id === activeMission.id ? { ...m, completed: true } : m);
    setMissions(updated);
    const completedCount = updated.filter(m => m.completed).length;

    const xpGained = 15;
    const { updatedProfile: newHabit, leveledUp, newTitle } = addXpAndProgress(habitProfile, xpGained);
    setHabitProfile(newHabit);
    saveHabitProfile(newHabit);
    const newXp = xp + xpGained;
    setXp(newXp);
    persist({ missions: updated, xp: newXp, initialized: true });

    const win = checkTinyWin(sessionCorrect, sessionTotal, ccCorrect, 5, missions.length, completedCount);
    if (win) showTinyWinToast(win);

    if (leveledUp) {
      setLevelUpTitle(newTitle);
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }

    const updatedMetrics = recordAnswer(metrics, 5, true);
    setMetrics(updatedMetrics);
    setSessionCorrect(sessionCorrect + 1);
    setSessionTotal(sessionTotal + 1);

    // Pacing assessment
    const pacing = assessPacing(profile, updatedMetrics);
    if (pacing.adjustmentNeeded) {
      const updatedP = { ...profile, speed: pacing.currentPace === 'energetic' ? 'fast' as const : pacing.currentPace === 'relaxed' ? 'slow' as const : 'normal' as const };
      setProfile(updatedP);
      saveLearnerProfile(updatedP);
    }

    // Check for interventions
    const intervention = checkForIntervention(profile, updatedMetrics);
    if (intervention.type === 'remediation') {
      say({ text: intervention.message, emoji: intervention.emoji, type: 'guide' }, 3500);
      const remediationConfig = { ...config!, sessionType: 'remediation' as const, difficulty: 'easy' as const, missionCount: 2 };
      const remMissions = buildMissions(remediationConfig, subject);
      setMissions(remMissions);
      persist({ missions: remMissions, xp: newXp, initialized: true });
      setActiveMission(null);
      setStep('mission');
      return;
    }

    if (intervention.type === 'pace_up') {
      say({ text: intervention.message, emoji: intervention.emoji, type: 'celebration' }, 3000);
    }

    const allDone = updated.every(m => m.completed);
    if (allDone) {
      celebrate();
      say(getAllMissionsCompleteMessage(), 4000);
      const updatedProfile2 = updateProfileFromSession(profile, updatedMetrics);
      updatedProfile2.recentMissionTypes = [...(updatedProfile2.recentMissionTypes || []).slice(-5), config?.sessionType || 'learn'];
      setProfile(updatedProfile2);
      saveLearnerProfile(updatedProfile2);

      // Show session end after celebration
      setTimeout(() => {
        const feeling = generateSessionEndFeeling(newHabit, sessionCorrect, sessionTotal);
        setSessionEndFeeling(feeling);
        const trackedHabit = trackSessionCompletion(newHabit, true, true);
        setHabitProfile(trackedHabit);
        saveHabitProfile(trackedHabit);
        setActiveMission(null);
        setStep('session_end');
      }, 2500);
    } else {
      say(getMissionCompleteMessage());
      setActiveMission(null);
      setStep('mission');
    }
  };

  // "Done for Today" - stays in journey, shows session end
  const handleDoneForToday = () => {
    const feeling = generateSessionEndFeeling(habitProfile, sessionCorrect, sessionTotal);
    setSessionEndFeeling(feeling);
    const trackedHabit = trackSessionCompletion(habitProfile, true, true);
    setHabitProfile(trackedHabit);
    saveHabitProfile(trackedHabit);
    setStep('session_end');
  };

  // Continue learning from session end - generate new missions
  const handleContinueLearning = () => {
    const cfg = generateSessionConfig(profile);
    setConfig(cfg);
    const newMissions = buildMissions(cfg, subject);
    setMissions(newMissions);
    persist({ missions: newMissions, initialized: true });
    setStep('mission');
    say(getWelcomeMessage(user?.name || 'يا بطل', true, habitProfile.currentStreak), 3000);
  };

  // Exit - go to done state (does NOT logout)
  const handleExit = () => {
    setStep('done');
  };

  // Actual logout - only from done screen or header
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const returnFromRest = () => {
    const updatedProfile = { ...profile, frustration: Math.max(0, profile.frustration - 30) };
    setProfile(updatedProfile);
    saveLearnerProfile(updatedProfile);
    const cfg = generateSessionConfig(updatedProfile);
    setConfig(cfg);
    const newMissions = buildMissions(cfg, subject);
    setMissions(newMissions);
    setMetrics(createSessionMetrics());
    setStep('mission');
    persist({ missions: newMissions, initialized: true });
    say(getWelcomeMessage(user?.name || 'يا بطل', true, updatedProfile.currentStreak), 3000);
  };

  const questions = getQuestions(grade, subject);
  const nextMission = missions.find(m => !m.completed);
  const boost = getSessionStartBoost(habitProfile);

  // ─── Initialization progress indicator ───
  const initSteps = ['الدولة', 'الصف', 'المادة', 'التشخيص', 'المستوى', 'المتطلبات', 'المسار', 'المهمة'];
  const currentInitStep = step === 'setup_country' ? 0
    : step === 'setup_grade' ? 1
    : step === 'setup_subject' ? 2
    : step === 'diagnostic_intro' || step === 'diagnostic' ? 3
    : step === 'placement' ? 4
    : step === 'prerequisites' ? 5
    : step === 'path_generation' ? 6
    : step === 'first_mission' ? 7
    : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 flex flex-col" dir="rtl">
      <Celebrate show={showCeleb} />
      <LevelUpOverlay show={showLevelUp} title={levelUpTitle} />
      <TinyWinToast win={tinyWin} show={showTinyWin} />

      {/* Header */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-sm">🦉</span>
          </div>
          <span className="text-xs font-bold text-gray-500 font-tajawal">فيثاغورث</span>
        </div>
        <div className="flex items-center gap-3">
          {habitProfile.currentStreak > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
              <span className="text-xs">🔥</span>
              <span className="text-[10px] font-bold text-orange-500 font-tajawal">{habitProfile.currentStreak}</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            <span className="text-[10px]">⭐</span>
            <span className="text-[10px] font-bold text-indigo-500 font-tajawal">{habitProfile.journeyLevel}</span>
          </div>
          <button onClick={() => navigate('/student/progress')} className="text-[10px] text-blue-400 font-tajawal hover:text-blue-600 transition-colors">
            📊
          </button>
          <button onClick={() => navigate('/student/cognitive-games')} className="text-[10px] text-purple-400 font-tajawal hover:text-purple-600 transition-colors">
            🧠
          </button>
          <button onClick={() => navigate('/student/assessment')} className="text-[10px] text-indigo-400 font-tajawal hover:text-indigo-600 transition-colors">
            🎯
          </button>
          <button onClick={() => navigate('/student/learning-paths')} className="text-[10px] text-teal-400 font-tajawal hover:text-teal-600 transition-colors">
            🛤️
          </button>
          <button onClick={() => navigate('/student/learning-flow')} className="text-[10px] text-emerald-400 font-tajawal hover:text-emerald-600 transition-colors">
            📚
          </button>
          <button onClick={handleExit} className="text-[11px] text-gray-300 font-tajawal hover:text-gray-400 transition-colors">
            خروج
          </button>
        </div>
      </header>

      {/* Initialization Progress Bar (only during setup) */}
      {currentInitStep >= 0 && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-1 max-w-md mx-auto">
            {initSteps.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-1.5 rounded-full transition-all duration-500 ${
                  i < currentInitStep ? 'bg-indigo-500' :
                  i === currentInitStep ? 'bg-indigo-400 animate-pulse' :
                  'bg-gray-200'
                }`} />
                <span className={`text-[8px] font-tajawal ${i <= currentInitStep ? 'text-indigo-500 font-bold' : 'text-gray-300'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-10 max-w-md mx-auto w-full">
        <Companion msg={msg} show={showMsg} />

        {/* ═══ STEP 0: Choose Country ═══ */}
        {step === 'setup_country' && (
          <div className="w-full space-y-8 animate-in fade-in duration-500 text-center">
            <div>
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200/40">
                <span className="text-2xl">🦉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 font-tajawal mb-2">مرحباً بك!</h2>
              <p className="text-sm text-gray-500 font-tajawal">اختر دولتك لنعرض لك المنهج المناسب</p>
            </div>
            {countriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="mr-2 text-sm text-gray-500 font-tajawal">جاري تحميل الدول...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {countries.length > 0 ? countries.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCountryId(c.id);
                      setSelectedCountryName(c.name_ar);
                      setStep('setup_grade');
                    }}
                    className="w-full bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md flex items-center gap-4 transition-all touch-manipulation active:scale-[0.98]"
                  >
                    <span className="text-3xl">{c.flag_emoji || '🌍'}</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800 font-tajawal">{c.name_ar}</p>
                      <p className="text-xs text-gray-400 font-tajawal">المنهج الوطني</p>
                    </div>
                  </button>
                )) : (
                  <>
                    {/* Fallback countries when backend is empty */}
                    {[
                      { id: 1, name: 'المملكة العربية السعودية', flag: '🇸🇦', system: 'المنهج السعودي' },
                      { id: 2, name: 'مصر', flag: '🇪🇬', system: 'المنهج المصري' },
                      { id: 3, name: 'الأردن', flag: '🇯🇴', system: 'المنهج الأردني' },
                      { id: 4, name: 'الإمارات', flag: '🇦🇪', system: 'المنهج الإماراتي' },
                      { id: 5, name: 'الكويت', flag: '🇰🇼', system: 'المنهج الكويتي' },
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCountryId(c.id);
                          setSelectedCountryName(c.name);
                          setStep('setup_grade');
                        }}
                        className="w-full bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md flex items-center gap-4 transition-all touch-manipulation active:scale-[0.98]"
                      >
                        <span className="text-3xl">{c.flag}</span>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800 font-tajawal">{c.name}</p>
                          <p className="text-xs text-gray-400 font-tajawal">{c.system}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 1: Choose Grade ═══ */}
        {step === 'setup_grade' && (
          <div className="w-full space-y-8 animate-in fade-in duration-500 text-center">
            <div>
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200/40">
                <span className="text-2xl">🦉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 font-tajawal mb-2">
                {selectedCountryName ? `منهج ${selectedCountryName}` : 'مرحباً بك!'}
              </h2>
              <p className="text-sm text-gray-500 font-tajawal">لنبدأ بتحديد صفك الدراسي</p>
            </div>
            <div className="space-y-3">
              {GRADES.map(g => (
                <button
                  key={g.id}
                  onClick={() => pickGrade(g.id)}
                  className="w-full bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md flex items-center gap-4 transition-all touch-manipulation active:scale-[0.98]"
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800 font-tajawal">{g.label}</p>
                    <p className="text-xs text-gray-400 font-tajawal">{g.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Choose Subject ═══ */}
        {step === 'setup_subject' && (
          <div className="w-full space-y-6 animate-in fade-in duration-500 text-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800 font-tajawal mb-2">اختر المادة</h2>
              <p className="text-sm text-gray-400 font-tajawal">سنبني لك مسار تعلم مخصص</p>
            </div>
            <div className="space-y-3">
              {SUBJECTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => pickSubject(s.id)}
                  className="w-full bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md flex items-center gap-4 transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                    <span className="text-2xl">{s.emoji}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800 font-tajawal">{s.label}</p>
                    <p className="text-xs text-gray-400 font-tajawal">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Diagnostic Introduction ═══ */}
        {step === 'diagnostic_intro' && (
          <div className="w-full space-y-8 animate-in fade-in duration-500 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-800 font-tajawal">تقييم تكيفي</h2>
              <p className="text-sm text-gray-500 font-tajawal leading-relaxed">
                سنسألك بعض الأسئلة البسيطة لنفهم مستواك ونكتشف نقاط قوتك والمهارات التي تحتاج تعزيز
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <Target className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-[11px] font-bold text-blue-700 font-tajawal">تحديد المستوى</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <Sparkles className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-[11px] font-bold text-purple-700 font-tajawal">مسار مخصص</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <Link2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-[11px] font-bold text-green-700 font-tajawal">كشف المتطلبات</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <BookOpen className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-[11px] font-bold text-amber-700 font-tajawal">نقطة بداية صحيحة</p>
              </div>
            </div>

            <button
              onClick={startDiagnostic}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg py-4 rounded-2xl font-tajawal font-bold shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
            >
              ابدأ التقييم ✨
            </button>

            <p className="text-xs text-gray-400 font-tajawal">٥ أسئلة فقط • أقل من دقيقتين</p>
          </div>
        )}

        {/* ═══ STEP 4: Diagnostic Questions ═══ */}
        {step === 'diagnostic' && (
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-center gap-1.5">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < qIdx ? 'bg-indigo-400' : i === qIdx ? 'bg-indigo-500 scale-125' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50">
              <p className="text-xl font-bold text-gray-800 font-tajawal text-center leading-relaxed mb-6">
                {questions[qIdx]?.text}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {questions[qIdx]?.options.map((opt, idx) => {
                  let cls = 'bg-gray-50 border-gray-100 hover:bg-indigo-50 hover:border-indigo-200';
                  if (feedback && picked === idx && idx === questions[qIdx].correct) {
                    cls = 'bg-green-50 border-green-300 scale-[1.02]';
                  } else if (feedback && picked === idx) {
                    cls = 'bg-orange-50 border-orange-200';
                  } else if (feedback && idx === questions[qIdx].correct) {
                    cls = 'bg-green-50 border-green-300';
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => pickAnswer(idx)}
                      disabled={feedback}
                      className={`p-4 rounded-2xl border-2 text-center font-bold text-lg font-tajawal transition-all duration-200 touch-manipulation active:scale-95 ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 5: Placement Result ═══ */}
        {step === 'placement' && placementResult && (
          <div className="w-full space-y-6 animate-in fade-in duration-500 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-800 font-tajawal">تم تحديد مستواك!</h2>
              <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                <span className="text-sm font-bold text-indigo-600 font-tajawal">المستوى: {placementResult.levelLabel}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">{placementResult.score}</p>
                  <p className="text-xs text-gray-400 font-tajawal">من {placementResult.total}</p>
                </div>
              </div>

              {placementResult.strengths.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-green-600 font-tajawal mb-1.5">نقاط القوة ✓</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {placementResult.strengths.map(s => (
                      <span key={s} className="text-[11px] bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-100 font-tajawal">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {placementResult.weaknesses.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-600 font-tajawal mb-1.5">سنعمل عليها معاً</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {placementResult.weaknesses.map(s => (
                      <span key={s} className="text-[11px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100 font-tajawal">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={proceedToPrerequisites}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg py-4 rounded-2xl font-tajawal font-bold shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
            >
              تحليل المتطلبات ←
            </button>
          </div>
        )}

        {/* ═══ STEP 6: Prerequisite Detection ═══ */}
        {step === 'prerequisites' && (
          <div className="w-full space-y-6 animate-in fade-in duration-500 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Link2 className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-800 font-tajawal">تحليل المتطلبات المسبقة</h2>
              <p className="text-sm text-gray-400 font-tajawal">نتأكد أن لديك الأساسيات المطلوبة</p>
            </div>

            {prerequisites.length > 0 ? (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                {prerequisites.map((prereq, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      prereq.status === 'met' ? 'bg-green-50 border-green-100' :
                      prereq.status === 'gap' ? 'bg-red-50 border-red-100' :
                      'bg-amber-50 border-amber-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      prereq.status === 'met' ? 'bg-green-100' :
                      prereq.status === 'gap' ? 'bg-red-100' :
                      'bg-amber-100'
                    }`}>
                      {prereq.status === 'met' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : prereq.status === 'gap' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Brain className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="text-right flex-1">
                      <p className={`text-sm font-bold font-tajawal ${
                        prereq.status === 'met' ? 'text-green-700' :
                        prereq.status === 'gap' ? 'text-red-700' :
                        'text-amber-700'
                      }`}>{prereq.skill}</p>
                      <p className="text-[10px] text-gray-500 font-tajawal">{prereq.description}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-tajawal font-bold ${
                      prereq.status === 'met' ? 'bg-green-100 text-green-700' :
                      prereq.status === 'gap' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {prereq.status === 'met' ? 'متقن' : prereq.status === 'gap' ? 'فجوة' : 'يحتاج تأكيد'}
                    </span>
                  </div>
                ))}

                {prerequisites.some(p => p.status === 'gap') && (
                  <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 mt-3">
                    <p className="text-xs text-indigo-700 font-tajawal font-bold mb-1">💡 خطة المعالجة</p>
                    <p className="text-[11px] text-indigo-600 font-tajawal">
                      سيتضمن مسارك أنشطة لسد الفجوات في المتطلبات المسبقة قبل المهارات المتقدمة
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-bold text-green-700 font-tajawal mb-1">ممتاز! لا توجد فجوات</p>
                <p className="text-xs text-gray-500 font-tajawal">جميع المتطلبات المسبقة مستوفاة، يمكنك البدء مباشرة</p>
              </div>
            )}

            <button
              onClick={proceedToPathGeneration}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg py-4 rounded-2xl font-tajawal font-bold shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
            >
              بناء المسار المخصص ←
            </button>
          </div>
        )}

        {/* ═══ STEP 7: Path Generation ═══ */}
        {step === 'path_generation' && (
          <div className="w-full space-y-8 animate-in fade-in duration-500 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-800 font-tajawal">
                {pathAnimating ? 'جاري بناء مسارك...' : 'مسارك جاهز!'}
              </h2>
              <p className="text-sm text-gray-400 font-tajawal">
                {pathAnimating ? 'نحلل مستواك ونبني خطة مخصصة' : 'تم إنشاء خطة تعلم مخصصة لك'}
              </p>
            </div>

            {pathAnimating && (
              <div className="space-y-3">
                {['تحليل نقاط القوة...', 'معالجة المتطلبات المسبقة...', 'بناء المسار التكيفي...'].map((text, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 animate-in fade-in slide-in-from-right-4"
                    style={{ animationDelay: `${i * 600}ms` }}
                  >
                    <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-sm text-gray-600 font-tajawal">{text}</span>
                  </div>
                ))}
              </div>
            )}

            {pathReady && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700 font-tajawal">نقطة البداية</p>
                      <p className="text-xs text-gray-400 font-tajawal">مستوى {placementResult?.levelLabel} - {SUBJECTS.find(s => s.id === subject)?.label}</p>
                    </div>
                  </div>
                  {prerequisites.some(p => p.status === 'gap') && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-700 font-tajawal">سد الفجوات أولاً</p>
                        <p className="text-xs text-gray-400 font-tajawal">أنشطة تأسيسية للمتطلبات المسبقة</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700 font-tajawal">التعلم التكيفي</p>
                      <p className="text-xs text-gray-400 font-tajawal">يتكيف مع سرعتك وأسلوبك</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700 font-tajawal">مهام يومية</p>
                      <p className="text-xs text-gray-400 font-tajawal">مهام قصيرة ومركزة كل يوم</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={proceedToFirstMission}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg py-4 rounded-2xl font-tajawal font-bold shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
                >
                  إنشاء أول مهمة ←
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 8: First Mission Presentation ═══ */}
        {step === 'first_mission' && (
          <div className="w-full space-y-8 animate-in fade-in duration-500 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <span className="text-2xl">🚀</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-800 font-tajawal">مهمتك الأولى جاهزة!</h2>
              <p className="text-sm text-gray-400 font-tajawal">
                {missions.length} أنشطة قصيرة مصممة خصيصاً لك
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              {missions.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-sm font-tajawal ${i === 0 ? 'font-bold text-gray-700' : 'text-gray-400'}`}>
                    {m.title}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={startLearning}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg py-4 rounded-2xl font-tajawal font-bold shadow-lg shadow-green-200/50 hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
            >
              ابدأ التعلم! 🎯
            </button>
          </div>
        )}

        {/* ═══ ACTIVE LEARNING: Mission List ═══ */}
        {step === 'mission' && (
          <div className="w-full space-y-6 animate-in fade-in duration-300 text-center">
            {boost.showStreak && missions.every(m => !m.completed) && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm">{boost.emoji}</span>
                <span className="text-xs font-bold text-gray-500 font-tajawal">{boost.message}</span>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <h3 className="text-lg font-bold text-gray-700 font-tajawal">مهام اليوم</h3>
              <p className="text-xs text-gray-400 font-tajawal">
                {missions.filter(m => m.completed).length} من {missions.length} مكتملة
              </p>
            </div>

            {/* Mission cards */}
            <div className="space-y-3">
              {missions.map((m) => {
                const isNext = !m.completed && m.id === nextMission?.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => !m.completed && startMissionActivity(m)}
                    disabled={m.completed || (!isNext && !m.completed)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all touch-manipulation ${
                      m.completed
                        ? 'bg-green-50 border-green-200 opacity-80'
                        : isNext
                        ? 'bg-white border-indigo-300 shadow-md hover:shadow-lg active:scale-[0.98]'
                        : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      m.completed
                        ? 'bg-green-100'
                        : isNext
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm'
                        : 'bg-gray-100'
                    }`}>
                      {m.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : isNext ? (
                        <Play className="w-5 h-5 text-white mr-[-2px]" />
                      ) : (
                        <span className="text-sm text-gray-400 font-bold">{m.id}</span>
                      )}
                    </div>
                    <span className={`text-sm font-tajawal text-right flex-1 ${
                      m.completed ? 'text-green-700 line-through' :
                      isNext ? 'text-gray-800 font-bold' :
                      'text-gray-400'
                    }`}>
                      {m.title}
                    </span>
                    {isNext && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-tajawal font-bold">
                        ابدأ
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Abacus Module Entry */}
            <button
              onClick={() => navigate('/student/abacus')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50 hover:border-amber-400 hover:shadow-md transition-all touch-manipulation active:scale-[0.98] mt-2"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <span className="text-lg">🧮</span>
              </div>
              <div className="text-right flex-1">
                <span className="text-sm font-bold text-amber-800 font-tajawal">الحساب الذهني</span>
                <p className="text-[11px] text-amber-600 font-tajawal">تدرّب على المعداد</p>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-tajawal font-bold">
                جرّب
              </span>
            </button>

            {/* Dice World Module Entry */}
            <button
              onClick={() => navigate('/student/dice-world')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-200 bg-gradient-to-l from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-md transition-all touch-manipulation active:scale-[0.98] mt-2"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
                <span className="text-lg">🎲</span>
              </div>
              <div className="text-right flex-1">
                <span className="text-sm font-bold text-blue-800 font-tajawal">عالم النرد</span>
                <p className="text-[11px] text-blue-600 font-tajawal">تعلّم الرياضيات بالنرد</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-tajawal font-bold">
                جديد
              </span>
            </button>

            {/* Done for today button */}
            {missions.some(m => m.completed) && (
              <button
                onClick={handleDoneForToday}
                className="w-full bg-gray-100 text-gray-600 text-sm py-3 rounded-2xl font-tajawal font-medium hover:bg-gray-200 transition-all touch-manipulation mt-4"
              >
                خلاص لليوم 👋
              </button>
            )}

            {/* All done state */}
            {missions.every(m => m.completed) && (
              <div className="pt-4 space-y-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <p className="text-lg font-bold text-gray-700 font-tajawal">أحسنت! أكملت كل المهام 🎉</p>
                <button
                  onClick={handleContinueLearning}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-tajawal font-bold shadow-md transition-all touch-manipulation active:scale-[0.98]"
                >
                  <RotateCcw className="w-4 h-4 inline ml-2" />
                  مهام جديدة
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ LEARNING ACTIVITY (Cards) ═══ */}
        {step === 'learning_activity' && activeMission && (
          <LearningActivity
            mission={activeMission}
            onComplete={completeLearningActivity}
            onBack={() => { setActiveMission(null); setStep('mission'); }}
            style={style}
            dynamicCards={dynamicLearningCards}
          />
        )}

        {/* ═══ SESSION END (stays in journey) ═══ */}
        {step === 'session_end' && sessionEndFeeling && (
          <SessionEndScreen
            feeling={sessionEndFeeling}
            habitProfile={habitProfile}
            onContinue={handleContinueLearning}
            onExit={handleExit}
          />
        )}

        {/* ═══ DONE ═══ */}
        {step === 'done' && (
          <div className="text-center space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-bold text-gray-700 font-tajawal">أحسنت! خلصت لليوم 🎉</p>
            <p className="text-sm text-gray-400 font-tajawal">نراك غداً إن شاء الله</p>
            <div className="space-y-3 pt-4">
              <button
                onClick={handleContinueLearning}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-tajawal font-bold shadow-md transition-all touch-manipulation active:scale-[0.98]"
              >
                أريد أكمل تعلم 🚀
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-sm text-gray-400 font-tajawal py-2 hover:text-gray-600 transition-colors"
              >
                تسجيل خروج
              </button>
            </div>
          </div>
        )}

        {/* ═══ REST ═══ */}
        {step === 'rest' && (
          <div className="text-center space-y-8 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <span className="text-4xl">🌿</span>
            </div>
            <p className="text-gray-500 font-tajawal text-lg">ارجع لما تكون جاهز</p>
            <button
              onClick={returnFromRest}
              className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-4 rounded-2xl font-tajawal touch-manipulation shadow-sm transition-all active:scale-95"
            >
              جاهز! 💪
            </button>
          </div>
        )}
      </main>
    </div>
  );
}