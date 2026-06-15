// Learning Intelligence Sprint - Misconception Mapping
// Maps misconception types to prerequisite skills and remedial paths
// Detects the TYPE of misunderstanding, not just "wrong answer"

import type { MisconceptionType } from './questionIntelligenceEngine';
import type { StudentSkillProgress } from '@/data/mathSkillsData';

// ============ Types ============

export interface MisconceptionProfile {
  type: MisconceptionType;
  label: string;
  description: string;
  prerequisiteSkills: string[];
  remedialPath: string[];
  indicators: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface StudentMisconceptionRecord {
  misconceptionType: MisconceptionType;
  skillId: string;
  questionId: string;
  timestamp: string;
  studentAnswer: string;
  correctAnswer: string;
  responseTime: number;
}

export interface MisconceptionSummary {
  type: MisconceptionType;
  label: string;
  count: number;
  percentage: number;
  affectedSkills: string[];
  remedialPath: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
  lastOccurrence: string;
}

// ============ Misconception Definitions ============

export const misconceptionProfiles: Record<MisconceptionType, MisconceptionProfile> = {
  counting_confusion: {
    type: 'counting_confusion',
    label: 'خلط في العد',
    description: 'الطالب يخطئ في العد الأساسي: يتخطى أرقام أو يعد مرتين أو يبدأ من رقم خاطئ',
    prerequisiteSkills: ['G1-N-001', 'G1-N-002', 'G1-N-005'],
    remedialPath: ['G1-N-001', 'G1-N-002', 'G1-N-005', 'G1-N-016'],
    indicators: ['الفرق بين الإجابة والصحيحة = ±1 أو ±2', 'وقت استجابة طويل', 'أخطاء متكررة في نفس النطاق العددي'],
    severity: 'high',
  },
  place_value_confusion: {
    type: 'place_value_confusion',
    label: 'خلط القيمة المكانية',
    description: 'الطالب يخلط بين الآحاد والعشرات، مثل قراءة 47 كـ 74',
    prerequisiteSkills: ['G1-N-014', 'G2-N-001', 'G2-N-002'],
    remedialPath: ['G1-N-014', 'G2-N-001', 'G2-N-002', 'G2-N-003'],
    indicators: ['تبادل أرقام (47↔74)', 'خطأ في قراءة أعداد من رقمين', 'خلط بين "عشرات" و"آحاد"'],
    severity: 'high',
  },
  operation_switch: {
    type: 'operation_switch',
    label: 'خلط العمليات',
    description: 'الطالب يستخدم عملية حسابية بدلاً من أخرى (جمع بدل طرح أو العكس)',
    prerequisiteSkills: ['G1-N-010', 'G1-N-011'],
    remedialPath: ['G1-N-010', 'G1-N-011', 'G1-N-008', 'G1-N-009'],
    indicators: ['الإجابة = نتيجة العملية المعاكسة', 'خلط بين + و -', 'لا يميز بين "أضف" و"أنقص"'],
    severity: 'medium',
  },
  visual_misread: {
    type: 'visual_misread',
    label: 'خطأ قراءة بصرية',
    description: 'الطالب يقرأ الرسم أو الشكل بشكل خاطئ',
    prerequisiteSkills: ['G1-G-001', 'G1-N-005'],
    remedialPath: ['G1-G-001', 'G1-G-002', 'G1-N-005'],
    indicators: ['خطأ في أسئلة بصرية فقط', 'يجيب صحيحاً على نفس المفهوم نصياً', 'وقت استجابة قصير جداً'],
    severity: 'low',
  },
  sequence_confusion: {
    type: 'sequence_confusion',
    label: 'خلط التسلسل',
    description: 'الطالب لا يستطيع تحديد النمط أو التسلسل الصحيح',
    prerequisiteSkills: ['G1-P-001', 'G1-N-002'],
    remedialPath: ['G1-N-002', 'G1-P-001', 'G1-N-017'],
    indicators: ['خطأ في أسئلة "ما التالي"', 'لا يرى النمط المتكرر', 'يختار عنصر عشوائي'],
    severity: 'medium',
  },
  none: {
    type: 'none',
    label: 'بدون نمط',
    description: 'لا يوجد نمط خطأ واضح',
    prerequisiteSkills: [],
    remedialPath: [],
    indicators: [],
    severity: 'low',
  },
};

// ============ Storage ============

const MISCONCEPTION_RECORDS_KEY = 'pythagorasMisconceptionRecords';

function getStoredRecords(): StudentMisconceptionRecord[] {
  const stored = localStorage.getItem(MISCONCEPTION_RECORDS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveRecords(records: StudentMisconceptionRecord[]): void {
  // Keep last 500 records
  const trimmed = records.slice(-500);
  localStorage.setItem(MISCONCEPTION_RECORDS_KEY, JSON.stringify(trimmed));
}

// ============ Detection ============

/**
 * Detect misconception type from a wrong answer
 */
export function detectMisconception(
  skillId: string,
  questionText: string,
  studentAnswer: string,
  correctAnswer: string,
  responseTime: number,
  visualType?: string
): MisconceptionType {
  const studentNum = parseFloat(studentAnswer);
  const correctNum = parseFloat(correctAnswer);

  // 1. Place value confusion: digits swapped (47 → 74)
  if (!isNaN(studentNum) && !isNaN(correctNum)) {
    const studentStr = Math.abs(studentNum).toString();
    const correctStr = Math.abs(correctNum).toString();
    if (studentStr.length === correctStr.length && studentStr.length >= 2) {
      const reversed = correctStr.split('').reverse().join('');
      if (studentStr === reversed) {
        return 'place_value_confusion';
      }
    }
  }

  // 2. Operation switch: answer = result of opposite operation
  if (skillId.includes('-A-') || questionText.includes('+') || questionText.includes('-')) {
    // If question is addition but answer looks like subtraction result (or vice versa)
    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      const diff = Math.abs(studentNum - correctNum);
      if (diff === correctNum * 2 || diff === Math.abs(correctNum)) {
        return 'operation_switch';
      }
    }
  }

  // 3. Counting confusion: off by 1 or 2
  if (!isNaN(studentNum) && !isNaN(correctNum)) {
    const diff = Math.abs(studentNum - correctNum);
    if (diff === 1 || diff === 2) {
      return 'counting_confusion';
    }
  }

  // 4. Visual misread: wrong on visual questions with fast response
  if (visualType && responseTime < 3000) {
    return 'visual_misread';
  }

  // 5. Sequence confusion: pattern/sequence questions
  if (skillId.includes('-P-') || questionText.includes('نمط') || questionText.includes('التالي')) {
    return 'sequence_confusion';
  }

  // 6. Fast response + wrong = likely counting confusion
  if (responseTime < 2000) {
    return 'counting_confusion';
  }

  return 'counting_confusion'; // default
}

// ============ Recording ============

/**
 * Record a misconception occurrence
 */
export function recordMisconception(
  misconceptionType: MisconceptionType,
  skillId: string,
  questionId: string,
  studentAnswer: string,
  correctAnswer: string,
  responseTime: number
): void {
  if (misconceptionType === 'none') return;

  const records = getStoredRecords();
  records.push({
    misconceptionType,
    skillId,
    questionId,
    timestamp: new Date().toISOString(),
    studentAnswer,
    correctAnswer,
    responseTime,
  });
  saveRecords(records);
}

// ============ Analysis ============

/**
 * Get misconception summary for a student
 */
export function getMisconceptionSummary(gradeFilter?: 1 | 2): MisconceptionSummary[] {
  const records = getStoredRecords();
  const typeMap: Record<MisconceptionType, StudentMisconceptionRecord[]> = {
    counting_confusion: [],
    place_value_confusion: [],
    operation_switch: [],
    visual_misread: [],
    sequence_confusion: [],
    none: [],
  };

  for (const r of records) {
    if (gradeFilter) {
      const isGrade1 = r.skillId.startsWith('G1');
      const isGrade2 = r.skillId.startsWith('G2');
      if (gradeFilter === 1 && !isGrade1) continue;
      if (gradeFilter === 2 && !isGrade2) continue;
    }
    typeMap[r.misconceptionType].push(r);
  }

  const total = records.length || 1;
  const summaries: MisconceptionSummary[] = [];

  for (const [type, recs] of Object.entries(typeMap)) {
    if (type === 'none' || recs.length === 0) continue;

    const profile = misconceptionProfiles[type as MisconceptionType];
    const affectedSkills = [...new Set(recs.map(r => r.skillId))];

    // Calculate trend (last 7 days vs previous 7 days)
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const recentCount = recs.filter(r => now - new Date(r.timestamp).getTime() < week).length;
    const olderCount = recs.filter(r => {
      const age = now - new Date(r.timestamp).getTime();
      return age >= week && age < week * 2;
    }).length;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentCount > olderCount + 2) trend = 'increasing';
    else if (recentCount < olderCount - 2) trend = 'decreasing';

    const sorted = recs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    summaries.push({
      type: type as MisconceptionType,
      label: profile.label,
      count: recs.length,
      percentage: Math.round((recs.length / total) * 100),
      affectedSkills,
      remedialPath: profile.remedialPath,
      trend,
      lastOccurrence: sorted[0]?.timestamp || '',
    });
  }

  return summaries.sort((a, b) => b.count - a.count);
}

/**
 * Get remedial path for a specific misconception
 */
export function getRemedialPath(misconceptionType: MisconceptionType): {
  skills: string[];
  description: string;
  estimatedSessions: number;
} {
  const profile = misconceptionProfiles[misconceptionType];
  return {
    skills: profile.remedialPath,
    description: profile.description,
    estimatedSessions: profile.remedialPath.length * 2,
  };
}

/**
 * Get prerequisite gaps based on misconceptions
 */
export function getPrerequisiteGaps(
  allProgress: StudentSkillProgress[]
): { skillId: string; misconceptionsCaused: MisconceptionType[]; mastery: number }[] {
  const summaries = getMisconceptionSummary();
  const gapMap: Record<string, Set<MisconceptionType>> = {};

  for (const summary of summaries) {
    const profile = misconceptionProfiles[summary.type];
    for (const prereq of profile.prerequisiteSkills) {
      if (!gapMap[prereq]) gapMap[prereq] = new Set();
      gapMap[prereq].add(summary.type);
    }
  }

  return Object.entries(gapMap).map(([skillId, types]) => {
    const progress = allProgress.find(p => p.skillId === skillId);
    const mastery = progress
      ? Math.round((progress.correctCount / Math.max(1, progress.attempts)) * 100)
      : 0;
    return {
      skillId,
      misconceptionsCaused: [...types],
      mastery,
    };
  }).sort((a, b) => a.mastery - b.mastery);
}