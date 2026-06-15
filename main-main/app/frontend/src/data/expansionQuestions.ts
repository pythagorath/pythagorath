// Expansion Questions - brings all skills to minimum 3 questions each
// Covers 40 skills that had < 3 questions

import { type Question } from './mathSkillsData';

export const expansionQuestions: Question[] = [
  // ===== G1-N-017: الأعداد الزوجية والفردية (needs 1 more) =====
  { id: 'EXP-001', grade: 1, semester: 1, skillId: 'G1-N-017', questionText: 'أي من هذه الأعداد فردي؟', options: ['4', '6', '9', '10'], correctAnswer: 2, difficulty: 'medium', explanation: '9 عدد فردي لأنه لا يقبل القسمة على 2 بدون باقٍ' },

  // ===== G1-P-001: استكمال النمط (needs 1 more) =====
  { id: 'EXP-002', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل النمط: 1، 2، 1، 2، 1، __', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: 'النمط يتكرر: 1، 2. إذن التالي هو 2', visualType: 'pattern', visualData: { items: ['1', '2', '1', '2', '1', '?'], missingIndex: 5 } },

  // ===== G1-M-002: مقارنة السعة (needs 2 more) =====
  { id: 'EXP-003', grade: 1, semester: 1, skillId: 'G1-M-002', questionText: 'أيهما يتسع لماء أكثر: الملعقة أم الكوب؟', options: ['الملعقة', 'الكوب', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الكوب يتسع لكمية ماء أكبر من الملعقة' },
  { id: 'EXP-004', grade: 1, semester: 1, skillId: 'G1-M-002', questionText: 'رتّب من الأقل سعة: حوض السباحة، كوب، دلو', options: ['كوب، دلو، حوض', 'حوض، دلو، كوب', 'دلو، كوب، حوض', 'كوب، حوض، دلو'], correctAnswer: 0, difficulty: 'medium', explanation: 'الترتيب من الأقل: كوب ثم دلو ثم حوض السباحة' },

  // ===== G1-M-003: مقارنة الوزن (needs 2 more) =====
  { id: 'EXP-005', grade: 1, semester: 1, skillId: 'G1-M-003', questionText: 'أيهما أخف: الكتاب أم الورقة؟', options: ['الكتاب', 'الورقة', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الورقة أخف من الكتاب' },
  { id: 'EXP-006', grade: 1, semester: 1, skillId: 'G1-M-003', questionText: 'ضع إشارة > أو < : وزن البطيخة __ وزن التفاحة', options: ['أقل من', 'أكبر من', 'يساوي', 'لا أعرف'], correctAnswer: 1, difficulty: 'medium', explanation: 'البطيخة أثقل من التفاحة، إذن وزن البطيخة > وزن التفاحة' },

  // ===== G1-T-005: قراءة الوقت بالنصف ساعة (needs 1 more) =====
  { id: 'EXP-007', grade: 1, semester: 1, skillId: 'G1-T-005', questionText: 'ما الوقت: الساعة 10 والنصف؟ أين عقرب الدقائق؟', options: ['على 12', 'على 6', 'على 3', 'على 9'], correctAnswer: 1, difficulty: 'easy', explanation: 'عند النصف ساعة يكون عقرب الدقائق دائماً على الرقم 6', visualType: 'analog-clock', visualData: { hours: 10, minutes: 30 } },

  // ===== G1-T-006: جمع النقود البسيطة (needs 1 more) =====
  { id: 'EXP-008', grade: 1, semester: 2, skillId: 'G1-T-006', questionText: 'لديك 3 ريالات وأعطاك أبوك 4 ريالات. كم أصبح معك؟', options: ['5 ريالات', '6 ريالات', '7 ريالات', '8 ريالات'], correctAnswer: 2, difficulty: 'easy', explanation: '3 + 4 = 7 ريالات', visualType: 'coins', visualData: { coins: [{ value: 3, label: '٣', count: 1 }, { value: 4, label: '٤', count: 1 }], currency: 'ر.ع' } },

  // ===== G1-D-001: عد وتسجيل بيانات بسيطة (needs 2 more) =====
  { id: 'EXP-009', grade: 1, semester: 1, skillId: 'G1-D-001', questionText: 'عدّ الحيوانات: 🐱🐱🐱🐶🐶. كم قطة؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'نعد القطط: 1، 2، 3. يوجد 3 قطط' },
  { id: 'EXP-010', grade: 1, semester: 1, skillId: 'G1-D-001', questionText: 'في الصف: 4 أولاد و 5 بنات. كم طالباً في المجموع؟', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'medium', explanation: '4 + 5 = 9 طلاب', visualType: 'simple-chart', visualData: { type: 'pictograph', data: [{ label: 'أولاد', value: 4, emoji: '👦' }, { label: 'بنات', value: 5, emoji: '👧' }] } },

  // ===== G1-N-018: الجمع على خط الأعداد (needs 2 more) =====
  { id: 'EXP-011', grade: 1, semester: 2, skillId: 'G1-N-018', questionText: 'على خط الأعداد: ابدأ من 4 واقفز 5 قفزات. أين تصل؟', options: ['8', '9', '10', '7'], correctAnswer: 1, difficulty: 'easy', explanation: '4 + 5 = 9. نقفز من 4: خمس قفزات نصل إلى 9', visualType: 'number-line', visualData: { start: 0, end: 12, highlight: [4, 5, 6, 7, 8, 9], jumpFrom: 4, jumpTo: 9, jumpCount: 5 } },
  { id: 'EXP-012', grade: 1, semester: 2, skillId: 'G1-N-018', questionText: 'على خط الأعداد: 6 + 2 = ؟', options: ['7', '8', '9', '10'], correctAnswer: 1, difficulty: 'easy', explanation: 'نبدأ من 6 ونقفز قفزتين: 7، 8', visualType: 'number-line', visualData: { start: 0, end: 10, highlight: [6, 7, 8], jumpFrom: 6, jumpTo: 8, jumpCount: 2 } },

  // ===== G1-N-019: العدد المكمل للعشرة (needs 2 more) =====
  { id: 'EXP-013', grade: 1, semester: 2, skillId: 'G1-N-019', questionText: 'أكمل: 5 + __ = 10', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: '5 + 5 = 10' },
  { id: 'EXP-014', grade: 1, semester: 2, skillId: 'G1-N-019', questionText: 'أكمل: 8 + __ = 10', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: '8 + 2 = 10' },

  // ===== G1-N-020: الضعف والنصف (needs 1 more) =====
  { id: 'EXP-015', grade: 1, semester: 2, skillId: 'G1-N-020', questionText: 'ما نصف العدد 6؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'نصف 6 = 3' },

  // ===== G1-N-021: العشرات والآحاد (needs 2 more) =====
  { id: 'EXP-016', grade: 1, semester: 2, skillId: 'G1-N-021', questionText: 'العدد 47 يتكون من:', options: ['7 عشرات و 4 آحاد', '4 عشرات و 7 آحاد', '47 آحاد', '4 آحاد و 7 عشرات'], correctAnswer: 1, difficulty: 'easy', explanation: '47 = 4 عشرات (40) + 7 آحاد (7)' },
  { id: 'EXP-017', grade: 1, semester: 2, skillId: 'G1-N-021', questionText: '6 عشرات و 3 آحاد = ؟', options: ['36', '63', '93', '69'], correctAnswer: 1, difficulty: 'medium', explanation: '6 عشرات = 60، و 3 آحاد = 3. المجموع = 63' },

  // ===== G1-N-022: العد بالعشرات حتى 100 (needs 2 more) =====
  { id: 'EXP-018', grade: 1, semester: 2, skillId: 'G1-N-022', questionText: 'أكمل: 50، 60، 70، __', options: ['75', '80', '90', '100'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالعشرات: 50، 60، 70، 80' },
  { id: 'EXP-019', grade: 1, semester: 2, skillId: 'G1-N-022', questionText: 'كم عشرة في العدد 100؟', options: ['5', '10', '20', '100'], correctAnswer: 1, difficulty: 'medium', explanation: '100 = 10 عشرات' },

  // ===== G1-G-003: عد الأشكال (needs 2 more) =====
  { id: 'EXP-020', grade: 1, semester: 2, skillId: 'G1-G-003', questionText: 'كم دائرة في الصورة؟ ⭕⭕⬜⭕⬜⭕', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'easy', explanation: 'نعد الدوائر: 1، 2، 3، 4' },
  { id: 'EXP-021', grade: 1, semester: 2, skillId: 'G1-G-003', questionText: 'كم مربعاً ومثلثاً في المجموع؟ ⬜🔺⬜🔺⬜', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'medium', explanation: '3 مربعات + 2 مثلثات = 5 أشكال' },

  // ===== G1-G-005: التماثل في الأشكال (needs 2 more) =====
  { id: 'EXP-022', grade: 1, semester: 2, skillId: 'G1-G-005', questionText: 'هل الفراشة متماثلة؟', options: ['نعم', 'لا', 'أحياناً', 'لا أعرف'], correctAnswer: 0, difficulty: 'easy', explanation: 'نعم، الفراشة متماثلة - جناحاها متشابهان' },
  { id: 'EXP-023', grade: 1, semester: 2, skillId: 'G1-G-005', questionText: 'أي حرف من هذه الحروف متماثل؟', options: ['ب', 'و', 'أ', 'ك'], correctAnswer: 2, difficulty: 'hard', explanation: 'حرف الألف (أ) له خط تماثل رأسي' },

  // ===== G1-T-003: أيام الأسبوع (needs 2 more) =====
  { id: 'EXP-024', grade: 1, semester: 2, skillId: 'G1-T-003', questionText: 'كم يوماً في الأسبوع؟', options: ['5', '6', '7', '10'], correctAnswer: 2, difficulty: 'easy', explanation: 'في الأسبوع 7 أيام' },
  { id: 'EXP-025', grade: 1, semester: 2, skillId: 'G1-T-003', questionText: 'ما اليوم الذي يأتي قبل الجمعة؟', options: ['السبت', 'الأربعاء', 'الخميس', 'الأحد'], correctAnswer: 2, difficulty: 'medium', explanation: 'قبل يوم الجمعة يأتي يوم الخميس' },

  // ===== G1-T-004: أشهر السنة (needs 2 more) =====
  { id: 'EXP-026', grade: 1, semester: 2, skillId: 'G1-T-004', questionText: 'كم شهراً في السنة؟', options: ['7', '10', '12', '30'], correctAnswer: 2, difficulty: 'easy', explanation: 'في السنة 12 شهراً' },
  { id: 'EXP-027', grade: 1, semester: 2, skillId: 'G1-T-004', questionText: 'ما أول شهر في السنة؟', options: ['مارس', 'يناير', 'ديسمبر', 'أبريل'], correctAnswer: 1, difficulty: 'easy', explanation: 'أول شهر في السنة هو يناير' },

  // ===== G1-D-002: قراءة مخطط الصور والمكعبات (needs 2 more) =====
  { id: 'EXP-028', grade: 1, semester: 2, skillId: 'G1-D-002', questionText: 'في مخطط المكعبات: أحمر=4، أزرق=2، أخضر=3. ما أقل لون؟', options: ['أحمر', 'أزرق', 'أخضر', 'متساوون'], correctAnswer: 1, difficulty: 'easy', explanation: 'الأزرق (2) هو الأقل عدداً', visualType: 'simple-chart', visualData: { type: 'pictograph', data: [{ label: 'أحمر', value: 4, emoji: '🟥' }, { label: 'أزرق', value: 2, emoji: '🟦' }, { label: 'أخضر', value: 3, emoji: '🟩' }] } },
  { id: 'EXP-029', grade: 1, semester: 2, skillId: 'G1-D-002', questionText: 'في مخطط الصور: 🚗🚗🚗 و 🚌🚌🚌🚌🚌. كم الفرق؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'medium', explanation: 'السيارات 3 والحافلات 5. الفرق = 5 - 3 = 2' },

  // ===== G2-N-002: استخدام لوحة المائة (needs 2 more) =====
  { id: 'EXP-030', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: 'في لوحة المائة، ما العدد الذي يقع يمين 43؟', options: ['42', '44', '53', '33'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد يمين 43 هو 44 (نضيف 1)' },
  { id: 'EXP-031', grade: 2, semester: 1, skillId: 'G2-N-002', questionText: 'في لوحة المائة، ما العدد فوق 56؟', options: ['55', '46', '57', '66'], correctAnswer: 1, difficulty: 'medium', explanation: 'العدد فوق أي عدد ينقص عنه 10. فوق 56 هو 46' },

  // ===== G2-N-009: الأزواج العددية للعدد 20 (needs 2 more) =====
  { id: 'EXP-032', grade: 2, semester: 1, skillId: 'G2-N-009', questionText: 'أكمل: 15 + __ = 20', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: '15 + 5 = 20' },
  { id: 'EXP-033', grade: 2, semester: 1, skillId: 'G2-N-009', questionText: 'أكمل: 7 + __ = 20', options: ['11', '12', '13', '14'], correctAnswer: 2, difficulty: 'medium', explanation: '7 + 13 = 20' },

  // ===== G2-N-010: الأزواج العددية حتى 100 (needs 2 more) =====
  { id: 'EXP-034', grade: 2, semester: 1, skillId: 'G2-N-010', questionText: 'أكمل: 30 + __ = 100', options: ['60', '70', '80', '90'], correctAnswer: 1, difficulty: 'easy', explanation: '30 + 70 = 100' },
  { id: 'EXP-035', grade: 2, semester: 1, skillId: 'G2-N-010', questionText: 'أكمل: 55 + __ = 100', options: ['35', '45', '55', '65'], correctAnswer: 1, difficulty: 'medium', explanation: '55 + 45 = 100' },

  // ===== G2-C-005: عائلة الحقائق (needs 2 more) =====
  { id: 'EXP-036', grade: 2, semester: 1, skillId: 'G2-C-005', questionText: 'إذا كان 6 + 9 = 15، فما ناتج 15 - 9؟', options: ['5', '6', '7', '8'], correctAnswer: 1, difficulty: 'easy', explanation: 'من عائلة الحقائق: 6 + 9 = 15، إذن 15 - 9 = 6' },
  { id: 'EXP-037', grade: 2, semester: 1, skillId: 'G2-C-005', questionText: 'أكمل عائلة الحقائق: 5 + 8 = 13، 8 + 5 = 13، 13 - 5 = ؟', options: ['5', '7', '8', '13'], correctAnswer: 2, difficulty: 'medium', explanation: '13 - 5 = 8' },

  // ===== G2-G-002: التعرف على المجسمات (needs 2 more) =====
  { id: 'EXP-038', grade: 2, semester: 1, skillId: 'G2-G-002', questionText: 'أي مجسم يشبه علبة العصير الأسطوانية؟', options: ['مكعب', 'كرة', 'أسطوانة', 'مخروط'], correctAnswer: 2, difficulty: 'easy', explanation: 'علبة العصير الأسطوانية تشبه الأسطوانة' },
  { id: 'EXP-039', grade: 2, semester: 1, skillId: 'G2-G-002', questionText: 'كم وجهاً مسطحاً للمكعب؟', options: ['4', '5', '6', '8'], correctAnswer: 2, difficulty: 'medium', explanation: 'المكعب له 6 أوجه مسطحة' },

  // ===== G2-G-003: التماثل (needs 2 more) =====
  { id: 'EXP-040', grade: 2, semester: 1, skillId: 'G2-G-003', questionText: 'كم خط تماثل للمربع؟', options: ['1', '2', '3', '4'], correctAnswer: 3, difficulty: 'medium', explanation: 'المربع له 4 خطوط تماثل' },
  { id: 'EXP-041', grade: 2, semester: 1, skillId: 'G2-G-003', questionText: 'هل الدائرة لها خطوط تماثل؟', options: ['لا', 'خط واحد فقط', 'خطان', 'عدد لا نهائي'], correctAnswer: 3, difficulty: 'hard', explanation: 'الدائرة لها عدد لا نهائي من خطوط التماثل' },

  // ===== G2-M-001: قياس الطول بالسنتيمتر (needs 2 more) =====
  { id: 'EXP-042', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'قلم طوله 12 سم ومسطرة طولها 30 سم. ما الفرق؟', options: ['15 سم', '18 سم', '20 سم', '42 سم'], correctAnswer: 1, difficulty: 'medium', explanation: '30 - 12 = 18 سم', visualType: 'measurement', visualData: { type: 'length', items: [{ name: 'القلم', value: 12, unit: 'سم' }, { name: 'المسطرة', value: 30, unit: 'سم' }] } },
  { id: 'EXP-043', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'ما الأداة المناسبة لقياس طول الكتاب؟', options: ['ميزان', 'مسطرة', 'ساعة', 'كوب'], correctAnswer: 1, difficulty: 'easy', explanation: 'نستخدم المسطرة لقياس الأطوال' },

  // ===== G2-M-002: قياس الكتلة بالغرام (needs 2 more) =====
  { id: 'EXP-044', grade: 2, semester: 1, skillId: 'G2-M-002', questionText: 'تفاحة وزنها 150 غرام وبرتقالة 200 غرام. أيهما أثقل؟', options: ['التفاحة', 'البرتقالة', 'متساويتان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '200 > 150، إذن البرتقالة أثقل' },
  { id: 'EXP-045', grade: 2, semester: 1, skillId: 'G2-M-002', questionText: 'ما الأداة المناسبة لقياس وزن التفاحة؟', options: ['مسطرة', 'ميزان', 'ساعة', 'كوب مدرج'], correctAnswer: 1, difficulty: 'easy', explanation: 'نستخدم الميزان لقياس الكتلة (الوزن)' },

  // ===== G2-M-003: قياس الوقت (needs 2 more) =====
  { id: 'EXP-046', grade: 2, semester: 1, skillId: 'G2-M-003', questionText: 'كم ساعة في اليوم الواحد؟', options: ['12', '20', '24', '30'], correctAnswer: 2, difficulty: 'easy', explanation: 'اليوم الواحد = 24 ساعة' },
  { id: 'EXP-047', grade: 2, semester: 1, skillId: 'G2-M-003', questionText: 'أيهما أطول: الدقيقة أم الساعة؟', options: ['الدقيقة', 'الساعة', 'متساويتان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الساعة أطول من الدقيقة (الساعة = 60 دقيقة)' },

  // ===== G2-M-004: النقود (needs 2 more) =====
  { id: 'EXP-048', grade: 2, semester: 1, skillId: 'G2-M-004', questionText: 'كم بيسة في الريال الواحد؟', options: ['10', '100', '500', '1000'], correctAnswer: 3, difficulty: 'medium', explanation: 'الريال الواحد = 1000 بيسة' },
  { id: 'EXP-049', grade: 2, semester: 1, skillId: 'G2-M-004', questionText: 'لديك ورقتان من فئة 5 ريالات. كم المجموع؟', options: ['5 ريالات', '10 ريالات', '15 ريالاً', '20 ريالاً'], correctAnswer: 1, difficulty: 'easy', explanation: '5 + 5 = 10 ريالات', visualType: 'coins', visualData: { coins: [{ value: 5, label: '٥', count: 2 }], currency: 'ر.ع' } },

  // ===== G2-T-001: قراءة الوقت بالدقائق (needs 1 more) =====
  { id: 'EXP-050', grade: 2, semester: 1, skillId: 'G2-T-001', questionText: 'الساعة تشير إلى 4:20. كم دقيقة بعد الساعة 4؟', options: ['10', '15', '20', '25'], correctAnswer: 2, difficulty: 'easy', explanation: '4:20 تعني 20 دقيقة بعد الساعة 4', visualType: 'analog-clock', visualData: { hours: 4, minutes: 20 } },

  // ===== G2-T-002: حساب الفترة الزمنية (needs 1 more) =====
  { id: 'EXP-051', grade: 2, semester: 1, skillId: 'G2-T-002', questionText: 'بدأت المباراة 5:00 وانتهت 5:45. كم دقيقة استغرقت؟', options: ['30', '40', '45', '50'], correctAnswer: 2, difficulty: 'medium', explanation: 'من 5:00 إلى 5:45 = 45 دقيقة' },

  // ===== G2-T-003: جمع وطرح النقود (needs 1 more) =====
  { id: 'EXP-052', grade: 2, semester: 1, skillId: 'G2-T-003', questionText: 'اشتريت قلماً بـ 2 ريال ودفتراً بـ 3 ريالات وممحاة بـ 1 ريال. كم دفعت؟', options: ['5 ريالات', '6 ريالات', '7 ريالات', '8 ريالات'], correctAnswer: 1, difficulty: 'medium', explanation: '2 + 3 + 1 = 6 ريالات' },

  // ===== G2-T-004: مقارنة الأسعار (needs 1 more) =====
  { id: 'EXP-053', grade: 2, semester: 1, skillId: 'G2-T-004', questionText: 'كتاب بـ 8 ريالات ولعبة بـ 12 ريالاً. كم الفرق في السعر؟', options: ['2 ريال', '3 ريالات', '4 ريالات', '5 ريالات'], correctAnswer: 2, difficulty: 'medium', explanation: '12 - 8 = 4 ريالات' },

  // ===== G2-N-011: الضعف (needs 2 more) =====
  { id: 'EXP-054', grade: 2, semester: 2, skillId: 'G2-N-011', questionText: 'ما ضعف العدد 25؟', options: ['35', '45', '50', '55'], correctAnswer: 2, difficulty: 'medium', explanation: 'ضعف 25 = 25 + 25 = 50' },
  { id: 'EXP-055', grade: 2, semester: 2, skillId: 'G2-N-011', questionText: 'ما ضعف العدد 8؟', options: ['12', '14', '16', '18'], correctAnswer: 2, difficulty: 'easy', explanation: 'ضعف 8 = 8 + 8 = 16' },

  // ===== G2-N-012: العد بالثلاثات (needs 1 more) =====
  { id: 'EXP-056', grade: 2, semester: 2, skillId: 'G2-N-012', questionText: 'أكمل العد بالثلاثات: 12، 15، 18، __', options: ['19', '20', '21', '24'], correctAnswer: 2, difficulty: 'medium', explanation: 'العد بالثلاثات: 12، 15، 18، 21' },

  // ===== G2-N-013: العد بالأربعات (needs 1 more) =====
  { id: 'EXP-057', grade: 2, semester: 2, skillId: 'G2-N-013', questionText: 'أكمل العد بالأربعات: 20، 24، 28، __', options: ['30', '31', '32', '36'], correctAnswer: 2, difficulty: 'medium', explanation: 'العد بالأربعات: 20، 24، 28، 32' },

  // ===== G2-C-006: الفرق بين عددين (needs 2 more) =====
  { id: 'EXP-058', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: 'ما الفرق بين 25 و 10؟', options: ['10', '15', '20', '35'], correctAnswer: 1, difficulty: 'easy', explanation: '25 - 10 = 15' },
  { id: 'EXP-059', grade: 2, semester: 2, skillId: 'G2-C-006', questionText: 'ما الفرق بين 50 و 35؟', options: ['10', '15', '20', '25'], correctAnswer: 1, difficulty: 'medium', explanation: '50 - 35 = 15' },

  // ===== G2-A-002: الضرب باستخدام المصفوفات (needs 2 more) =====
  { id: 'EXP-060', grade: 2, semester: 2, skillId: 'G2-A-002', questionText: 'مصفوفة 4 صفوف و 3 أعمدة. كم العدد الكلي؟', options: ['7', '10', '12', '15'], correctAnswer: 2, difficulty: 'easy', explanation: '4 × 3 = 12' },
  { id: 'EXP-061', grade: 2, semester: 2, skillId: 'G2-A-002', questionText: '5 أكياس في كل كيس 2 تفاحة. كم تفاحة؟', options: ['7', '8', '10', '12'], correctAnswer: 2, difficulty: 'medium', explanation: '5 × 2 = 10 تفاحات' },

  // ===== G2-G-004: المضلعات المتقدمة (needs 2 more) =====
  { id: 'EXP-062', grade: 2, semester: 2, skillId: 'G2-G-004', questionText: 'كم ضلعاً للمضلع الخماسي؟', options: ['4', '5', '6', '7'], correctAnswer: 1, difficulty: 'easy', explanation: 'المضلع الخماسي له 5 أضلاع' },
  { id: 'EXP-063', grade: 2, semester: 2, skillId: 'G2-G-004', questionText: 'أي شكل له أكثر أضلاع: المثلث أم المربع أم السداسي؟', options: ['المثلث', 'المربع', 'السداسي', 'متساوون'], correctAnswer: 2, difficulty: 'medium', explanation: 'السداسي (6 أضلاع) > المربع (4) > المثلث (3)' },

  // ===== G2-G-005: الدوران والحركة (needs 2 more) =====
  { id: 'EXP-064', grade: 2, semester: 2, skillId: 'G2-G-005', questionText: 'نصف دورة من الشمال تصل إلى:', options: ['الشرق', 'الغرب', 'الجنوب', 'الشمال'], correctAnswer: 2, difficulty: 'easy', explanation: 'نصف دورة (180°) من الشمال = الجنوب' },
  { id: 'EXP-065', grade: 2, semester: 2, skillId: 'G2-G-005', questionText: 'دورة كاملة من الشرق تعود إلى:', options: ['الشمال', 'الجنوب', 'الغرب', 'الشرق'], correctAnswer: 3, difficulty: 'easy', explanation: 'دورة كاملة (360°) تعود إلى نفس الاتجاه' },

  // ===== G2-D-002: مقارنة البيانات (needs 2 more) =====
  { id: 'EXP-066', grade: 2, semester: 2, skillId: 'G2-D-002', questionText: 'صف أ: 25 طالباً، صف ب: 30 طالباً. كم طالباً أكثر في صف ب؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: '30 - 25 = 5 طلاب أكثر' },
  { id: 'EXP-067', grade: 2, semester: 2, skillId: 'G2-D-002', questionText: 'في استطلاع: القراءة=8، الرسم=12، الرياضة=15. ما النشاط الأقل شعبية؟', options: ['القراءة', 'الرسم', 'الرياضة', 'متساوون'], correctAnswer: 0, difficulty: 'easy', explanation: 'القراءة (8) هي الأقل عدداً', visualType: 'simple-chart', visualData: { type: 'pictograph', data: [{ label: 'قراءة', value: 8, emoji: '📚' }, { label: 'رسم', value: 12, emoji: '🎨' }, { label: 'رياضة', value: 15, emoji: '⚽' }] } },

  // ===== G2-D-003: التمثيل بالمكعبات أو الصور (needs 2 more) =====
  { id: 'EXP-068', grade: 2, semester: 2, skillId: 'G2-D-003', questionText: 'إذا كل مكعب يمثل طالبين، و5 مكعبات تمثل:', options: ['5 طلاب', '7 طلاب', '10 طلاب', '12 طالباً'], correctAnswer: 2, difficulty: 'medium', explanation: '5 مكعبات × 2 = 10 طلاب' },
  { id: 'EXP-069', grade: 2, semester: 2, skillId: 'G2-D-003', questionText: 'كم مكعباً نحتاج لتمثيل 6 تفاحات (كل مكعب = تفاحة واحدة)؟', options: ['3', '5', '6', '8'], correctAnswer: 2, difficulty: 'easy', explanation: 'نحتاج 6 مكعبات لتمثيل 6 تفاحات' },

  // ===== G2-M-005: قياس السعة باللتر (needs extra) =====
  { id: 'EXP-070', grade: 2, semester: 2, skillId: 'G2-M-005', questionText: 'كم كوباً (250 مل) يملأ لتراً واحداً؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'medium', explanation: '1 لتر = 1000 مل. 1000 ÷ 250 = 4 أكواب' },
];