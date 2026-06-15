// Pythagorath Learning Companion - Personalized Emotional System
// The companion adapts its personality and responses based on learner profile
// Provides: identity, emotional continuity, adaptive encouragement

export interface CompanionMessage {
  text: string;
  emoji: string;
  type: 'encourage' | 'celebrate' | 'recover' | 'guide' | 'welcome' | 'intervene' | 'rest';
}

export type EncouragementStyle = 'gentle' | 'cheerful' | 'motivating' | 'calming';

// ============ Pythagorath Identity ============

export const PYTHAGORATH = {
  name: 'فيثا',
  emoji: '🦉',
  colors: { primary: '#4F46E5', warm: '#F59E0B', calm: '#10B981' },
  personality: 'حكيم، لطيف، صبور، مشجع',
};

// ============ Welcome Messages ============

export function getWelcomeMessage(name: string, isReturning: boolean, streak?: number): CompanionMessage {
  const hour = new Date().getHours();
  
  if (isReturning && streak && streak > 1) {
    const streakMsgs: CompanionMessage[] = [
      { text: `أهلاً ${name}! ${streak} أيام متواصلة! أنا فخور فيك`, emoji: '🔥', type: 'welcome' },
      { text: `عدت يا بطل! ${streak} أيام ما وقفت! يلا نكمل`, emoji: '⚡', type: 'welcome' },
    ];
    return streakMsgs[Math.floor(Math.random() * streakMsgs.length)];
  }

  if (isReturning) {
    const returnMsgs: CompanionMessage[] = [
      { text: `أهلاً ${name}! سعيد إنك رجعت 💙`, emoji: '🦉', type: 'welcome' },
      { text: `يا هلا ${name}! مشتاقين لك!`, emoji: '🤗', type: 'welcome' },
      { text: `عدت يا بطل! يلا نكمل مغامرتنا`, emoji: '🚀', type: 'welcome' },
    ];
    return returnMsgs[Math.floor(Math.random() * returnMsgs.length)];
  }

  if (hour < 12) {
    return { text: `صباح الخير ${name}! يوم جديد مليء بالمغامرات`, emoji: '☀️', type: 'welcome' };
  } else if (hour < 17) {
    return { text: `مرحباً ${name}! وقت التعلم الممتع`, emoji: '🌤️', type: 'welcome' };
  }
  return { text: `مساء النور ${name}! مستعد لتحدي مسائي؟`, emoji: '🌙', type: 'welcome' };
}

// ============ Adaptive Success Messages ============

export function getSuccessMessage(consecutiveCorrect: number, style: EncouragementStyle = 'cheerful'): CompanionMessage {
  if (consecutiveCorrect >= 5) {
    const msgs: Record<EncouragementStyle, CompanionMessage> = {
      gentle: { text: 'ما شاء الله! أنت تتألق اليوم', emoji: '✨', type: 'celebrate' },
      cheerful: { text: 'خمسة صح ورا بعض! أنت عبقري!', emoji: '🧠', type: 'celebrate' },
      motivating: { text: 'لا يوقفك شي! بطل حقيقي!', emoji: '🏆', type: 'celebrate' },
      calming: { text: 'أداء رائع وهادئ. استمر بنفس الإيقاع', emoji: '🌟', type: 'celebrate' },
    };
    return msgs[style];
  }
  if (consecutiveCorrect >= 3) {
    const msgs: Record<EncouragementStyle, CompanionMessage> = {
      gentle: { text: 'أحسنت! أنت على الطريق الصحيح', emoji: '🌱', type: 'encourage' },
      cheerful: { text: 'ثلاثة صح! يلا نكمل!', emoji: '🔥', type: 'encourage' },
      motivating: { text: 'قوي! ما يوقفك إلا السماء!', emoji: '⚡', type: 'encourage' },
      calming: { text: 'جميل. خطوة بخطوة نوصل', emoji: '⭐', type: 'encourage' },
    };
    return msgs[style];
  }
  
  const baseMsgs: CompanionMessage[] = style === 'gentle' 
    ? [
        { text: 'صح! شاطر', emoji: '🌟', type: 'encourage' },
        { text: 'أحسنت!', emoji: '👏', type: 'encourage' },
      ]
    : style === 'calming'
    ? [
        { text: 'إجابة صحيحة. أنت مرتاح وتفكر صح', emoji: '🍃', type: 'encourage' },
        { text: 'صح! خذ وقتك بالسؤال الجاي', emoji: '☁️', type: 'encourage' },
      ]
    : style === 'motivating'
    ? [
        { text: 'صح! كمّل بهالقوة!', emoji: '💪', type: 'encourage' },
        { text: 'رائع! أنت ماكينة!', emoji: '🚀', type: 'encourage' },
      ]
    : [
        { text: 'أحسنت! إجابة صحيحة!', emoji: '👏', type: 'encourage' },
        { text: 'رائع! أنت شاطر!', emoji: '🌟', type: 'encourage' },
        { text: 'صح! يلا نكمل!', emoji: '✨', type: 'encourage' },
        { text: 'ممتاز! كمّل كذا!', emoji: '💪', type: 'encourage' },
      ];
  return baseMsgs[Math.floor(Math.random() * baseMsgs.length)];
}

// ============ Adaptive Recovery Messages ============

export function getRecoveryMessage(consecutiveWrong: number, style: EncouragementStyle = 'cheerful'): CompanionMessage {
  if (consecutiveWrong >= 3) {
    const msgs: Record<EncouragementStyle, CompanionMessage> = {
      gentle: { text: 'لا تقلق حبيبي. كل واحد يحتاج وقت', emoji: '💙', type: 'recover' },
      cheerful: { text: 'أنت شجاع إنك تحاول! نجرب طريقة ثانية؟', emoji: '🌈', type: 'recover' },
      motivating: { text: 'الأبطال ما يستسلمون! نغير الخطة', emoji: '🛡️', type: 'recover' },
      calming: { text: 'خذ نفس عميق. مافي مشكلة. نبدأ من جديد', emoji: '🌿', type: 'recover' },
    };
    return msgs[style];
  }
  if (consecutiveWrong >= 2) {
    const msgs: Record<EncouragementStyle, CompanionMessage> = {
      gentle: { text: 'قريب! فكّر شوي وجرّب', emoji: '🤔', type: 'recover' },
      cheerful: { text: 'لا بأس! المحاولة هي الأهم!', emoji: '💪', type: 'recover' },
      motivating: { text: 'كل خطأ يقرّبك! جرب مرة ثانية', emoji: '🎯', type: 'recover' },
      calming: { text: 'مافي ضغط. خذ وقتك', emoji: '☁️', type: 'recover' },
    };
    return msgs[style];
  }
  const msgs: CompanionMessage[] = [
    { text: 'لا بأس! نتعلم من كل محاولة', emoji: '🌈', type: 'recover' },
    { text: 'اقتربت! جرّب مرة ثانية', emoji: '💫', type: 'recover' },
    { text: 'كل خطأ يقرّبنا من الصح!', emoji: '🌟', type: 'recover' },
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ============ Intervention Messages ============

export function getInterventionMessage(type: string): CompanionMessage {
  switch (type) {
    case 'simplify':
      return { text: 'خلنا نجرب طريقة أسهل! أنت تقدر', emoji: '🌱', type: 'intervene' };
    case 'prerequisite':
      return { text: 'خلنا نراجع الأساسيات أول. بعدين نرجع أقوى!', emoji: '📚', type: 'intervene' };
    case 'lighten':
      return { text: 'أسئلة أقل بس نفهمها صح! الجودة أهم', emoji: '🎯', type: 'intervene' };
    case 'redirect':
      return { text: 'ما رأيك نجرب شي مختلف؟ عندي مفاجأة!', emoji: '✨', type: 'intervene' };
    case 'break':
      return { text: 'استراحة قصيرة! ارجع لما تكون جاهز', emoji: '☕', type: 'rest' };
    default:
      return { text: 'يلا نكمل سوا!', emoji: '🦉', type: 'guide' };
  }
}

// ============ Session Type Messages ============

export function getSessionTypeMessage(sessionType: string): CompanionMessage {
  switch (sessionType) {
    case 'review':
      return { text: 'وقت المراجعة! نقوّي اللي تعلمناه', emoji: '🔄', type: 'guide' };
    case 'practice':
      return { text: 'تمرين خفيف يرفع مستواك!', emoji: '💪', type: 'guide' };
    case 'challenge':
      return { text: 'تحدي جديد! أنت جاهز لمستوى أعلى!', emoji: '🚀', type: 'guide' };
    case 'rest':
      return { text: 'وقت راحة! الدماغ يحتاج استراحة عشان يتعلم أحسن', emoji: '🌿', type: 'rest' };
    default:
      return { text: 'مغامرة تعلم جديدة بانتظارك!', emoji: '🗺️', type: 'guide' };
  }
}

// ============ Mission Messages ============

export function getMissionCompleteMessage(): CompanionMessage {
  const msgs: CompanionMessage[] = [
    { text: 'أكملت المهمة! أنت نجم اليوم!', emoji: '⭐', type: 'celebrate' },
    { text: 'مهمة مكتملة! فخور فيك!', emoji: '🎉', type: 'celebrate' },
    { text: 'رائع! خلصت المهمة بنجاح!', emoji: '🏅', type: 'celebrate' },
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function getAllMissionsCompleteMessage(): CompanionMessage {
  const msgs: CompanionMessage[] = [
    { text: 'يا سلام! كل المهام مكتملة! أنت بطل حقيقي!', emoji: '🏆', type: 'celebrate' },
    { text: 'أكملت كل شي! ما شاء الله عليك!', emoji: '🎊', type: 'celebrate' },
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function getLevelUpMessage(level: string): CompanionMessage {
  if (level === 'advanced') {
    return { text: 'مستوى متقدم! أنت من الأبطال!', emoji: '🏆', type: 'celebrate' };
  }
  if (level === 'intermediate') {
    return { text: 'مستوى متوسط! أنت تتحسن بسرعة!', emoji: '🌟', type: 'celebrate' };
  }
  return { text: 'بداية رائعة! سنتعلم سوا خطوة بخطوة', emoji: '🌱', type: 'guide' };
}

// ============ Rest & Break Messages ============

export function getBreakMessage(): CompanionMessage {
  const msgs: CompanionMessage[] = [
    { text: 'استراحة! اشرب ماء وارجع 💧', emoji: '☕', type: 'rest' },
    { text: 'راحة قصيرة. الدماغ يشحن طاقته!', emoji: '🔋', type: 'rest' },
    { text: 'وقت حر! ارجع لما تحس بالحماس', emoji: '🌈', type: 'rest' },
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ============ Guidance Messages ============

export function getGradeSelectionGuide(): CompanionMessage {
  return { text: 'اختر صفك وأنا أجهز لك تجربة خاصة فيك!', emoji: '🦉', type: 'guide' };
}

export function getSubjectSelectionGuide(): CompanionMessage {
  return { text: 'ماذا تحب أن تتعلم اليوم؟ اختر مادتك!', emoji: '🎯', type: 'guide' };
}

export function getDiagnosticGuide(): CompanionMessage {
  return { text: 'أسئلة بسيطة عشان أعرف كيف أساعدك أحسن. لا تقلق!', emoji: '🧩', type: 'guide' };
}

// ============ Session End Messages ============

export function getSessionEndMessage(accuracy: number, xpEarned: number): CompanionMessage {
  if (accuracy >= 80) {
    return { text: `أداء ممتاز! كسبت ${xpEarned} نقطة! نراك بكرة؟`, emoji: '🌟', type: 'celebrate' };
  }
  if (accuracy >= 50) {
    return { text: `جهد رائع! ${xpEarned} نقطة مكتسبة. كل يوم أحسن!`, emoji: '💪', type: 'encourage' };
  }
  return { text: `شكراً إنك حاولت! ${xpEarned} نقطة لك. بكرة أحسن!`, emoji: '🌈', type: 'encourage' };
}