import type { Question } from './mathSkillsData';

// Additional questions to expand the question bank
// Target: 5-10 questions per skill with easy/medium/hard distribution

export const additionalQuestions: Question[] = [
  // ===== PREVIOUSLY UNCOVERED SKILLS =====

  // G1-N-004: كتابة الأعداد حتى 10
  { id: 'AQ-200', grade: 1, semester: 1, skillId: 'G1-N-004', questionText: 'ما الرقم المكتوب: ٣؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'الرقم ٣ يساوي 3' },
  { id: 'AQ-201', grade: 1, semester: 1, skillId: 'G1-N-004', questionText: 'اكتب العدد "سبعة" بالأرقام:', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', explanation: 'سبعة = 7' },
  { id: 'AQ-202', grade: 1, semester: 1, skillId: 'G1-N-004', questionText: 'ما الرقم المكتوب: ٩؟', options: ['6', '7', '8', '9'], correctAnswer: 3, difficulty: 'easy', explanation: 'الرقم ٩ يساوي 9' },
  { id: 'AQ-203', grade: 1, semester: 1, skillId: 'G1-N-004', questionText: 'اكتب العدد "أربعة" بالأرقام:', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: 'أربعة = 4' },
  { id: 'AQ-204', grade: 1, semester: 1, skillId: 'G1-N-004', questionText: 'ما العدد المكتوب بالحروف: 10؟', options: ['ثمانية', 'تسعة', 'عشرة', 'سبعة'], correctAnswer: 2, difficulty: 'medium', explanation: '10 = عشرة' },

  // G1-G-002: بناء الأشكال وتصنيفها
  { id: 'AQ-205', grade: 1, semester: 1, skillId: 'G1-G-002', questionText: 'كم مربعاً صغيراً نحتاج لبناء مربع كبير (2×2)؟', options: ['2', '3', '4', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'نحتاج 4 مربعات صغيرة لبناء مربع 2×2' },
  { id: 'AQ-206', grade: 1, semester: 1, skillId: 'G1-G-002', questionText: 'أي شكل يمكن بناؤه من مثلثين متساويين؟', options: ['دائرة', 'مربع', 'مستطيل', 'مثلث أكبر'], correctAnswer: 1, difficulty: 'medium', explanation: 'مثلثان متساويان يكوّنان مربعاً أو مستطيلاً' },
  { id: 'AQ-207', grade: 1, semester: 1, skillId: 'G1-G-002', questionText: 'صنّف: المربع والمستطيل كلاهما لهما:', options: ['3 أضلاع', '4 أضلاع', '5 أضلاع', '6 أضلاع'], correctAnswer: 1, difficulty: 'easy', explanation: 'كلاهما له 4 أضلاع' },
  { id: 'AQ-208', grade: 1, semester: 1, skillId: 'G1-G-002', questionText: 'أي مجموعة أشكال متشابهة؟', options: ['مربع ودائرة', 'مثلث ومربع', 'مربع ومستطيل', 'دائرة ومثلث'], correctAnswer: 2, difficulty: 'medium', explanation: 'المربع والمستطيل متشابهان (كلاهما له 4 أضلاع و4 زوايا)' },
  { id: 'AQ-209', grade: 1, semester: 1, skillId: 'G1-G-002', questionText: 'كم مثلثاً نحتاج لبناء مربع؟', options: ['2', '3', '4', '5'], correctAnswer: 0, difficulty: 'medium', explanation: 'نحتاج مثلثين لبناء مربع' },

  // G1-D-003: التصنيف باستخدام مخطط فن
  { id: 'AQ-210', grade: 1, semester: 2, skillId: 'G1-D-003', questionText: 'في مخطط فن، المنطقة المشتركة تحتوي على:', options: ['أشياء من المجموعة الأولى فقط', 'أشياء من المجموعة الثانية فقط', 'أشياء مشتركة بين المجموعتين', 'لا شيء'], correctAnswer: 2, difficulty: 'easy', explanation: 'المنطقة المشتركة تحتوي على العناصر التي تنتمي للمجموعتين' },
  { id: 'AQ-211', grade: 1, semester: 2, skillId: 'G1-D-003', questionText: 'مجموعة الأحمر: 🔴🟥 ومجموعة الدوائر: 🔴⚪. ما المشترك؟', options: ['🟥', '⚪', '🔴', '🟥 و ⚪'], correctAnswer: 2, difficulty: 'medium', explanation: '🔴 أحمر ودائرة، فهو مشترك' },
  { id: 'AQ-212', grade: 1, semester: 2, skillId: 'G1-D-003', questionText: 'أين نضع "مربع أزرق" في مخطط فن (أزرق / مربعات)؟', options: ['في دائرة الأزرق فقط', 'في دائرة المربعات فقط', 'في المنطقة المشتركة', 'خارج الدائرتين'], correctAnswer: 2, difficulty: 'medium', explanation: 'مربع أزرق ينتمي للمجموعتين فيوضع في المنطقة المشتركة' },
  { id: 'AQ-213', grade: 1, semester: 2, skillId: 'G1-D-003', questionText: 'أين نضع "دائرة خضراء" في مخطط فن (أحمر / دوائر)؟', options: ['في دائرة الأحمر', 'في دائرة الدوائر فقط', 'في المنطقة المشتركة', 'خارج الدائرتين'], correctAnswer: 1, difficulty: 'medium', explanation: 'دائرة خضراء تنتمي لمجموعة الدوائر فقط (ليست حمراء)' },
  { id: 'AQ-214', grade: 1, semester: 2, skillId: 'G1-D-003', questionText: 'في مخطط فن: حيوانات أليفة / حيوانات تطير. أين نضع "العصفور الأليف"؟', options: ['حيوانات أليفة فقط', 'حيوانات تطير فقط', 'المنطقة المشتركة', 'خارج المخطط'], correctAnswer: 2, difficulty: 'hard', explanation: 'العصفور الأليف: أليف + يطير = المنطقة المشتركة' },

  // ===== MORE QUESTIONS FOR LOW-COVERAGE SKILLS =====

  // G1-N-003: قراءة الأعداد حتى 10 (had only 1 question)
  { id: 'AQ-215', grade: 1, semester: 1, skillId: 'G1-N-003', questionText: 'اقرأ العدد: 8', options: ['ستة', 'سبعة', 'ثمانية', 'تسعة'], correctAnswer: 2, difficulty: 'easy', explanation: '8 = ثمانية' },
  { id: 'AQ-216', grade: 1, semester: 1, skillId: 'G1-N-003', questionText: 'اقرأ العدد: 5', options: ['ثلاثة', 'أربعة', 'خمسة', 'ستة'], correctAnswer: 2, difficulty: 'easy', explanation: '5 = خمسة' },
  { id: 'AQ-217', grade: 1, semester: 1, skillId: 'G1-N-003', questionText: 'ما العدد: "اثنان"؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: 'اثنان = 2' },
  { id: 'AQ-218', grade: 1, semester: 1, skillId: 'G1-N-003', questionText: 'اقرأ العدد: 10', options: ['ثمانية', 'تسعة', 'عشرة', 'أحد عشر'], correctAnswer: 2, difficulty: 'easy', explanation: '10 = عشرة' },

  // G1-N-007: معرفة الصفر (had only 1 question)
  { id: 'AQ-219', grade: 1, semester: 1, skillId: 'G1-N-007', questionText: 'كم تفاحة في الصحن الفارغ؟', options: ['0', '1', '2', '3'], correctAnswer: 0, difficulty: 'easy', explanation: 'الصحن الفارغ فيه 0 تفاحات' },
  { id: 'AQ-220', grade: 1, semester: 1, skillId: 'G1-N-007', questionText: 'ما ناتج 5 - 5؟', options: ['0', '1', '5', '10'], correctAnswer: 0, difficulty: 'easy', explanation: '5 - 5 = 0' },
  { id: 'AQ-221', grade: 1, semester: 1, skillId: 'G1-N-007', questionText: 'ما العدد الذي يأتي قبل 1؟', options: ['0', '2', '3', 'لا يوجد'], correctAnswer: 0, difficulty: 'medium', explanation: 'الصفر يأتي قبل 1' },
  { id: 'AQ-222', grade: 1, semester: 1, skillId: 'G1-N-007', questionText: 'ما ناتج 0 + 3؟', options: ['0', '1', '3', '30'], correctAnswer: 2, difficulty: 'easy', explanation: '0 + 3 = 3 (إضافة صفر لا تغير العدد)' },

  // G1-N-008: أكثر بواحد (had only 1 question)
  { id: 'AQ-223', grade: 1, semester: 1, skillId: 'G1-N-008', questionText: 'ما العدد الأكثر بواحد من 6؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', explanation: '6 + 1 = 7' },
  { id: 'AQ-224', grade: 1, semester: 1, skillId: 'G1-N-008', questionText: 'ما العدد الأكثر بواحد من 9؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'easy', explanation: '9 + 1 = 10' },
  { id: 'AQ-225', grade: 1, semester: 1, skillId: 'G1-N-008', questionText: 'لدي 4 كرات. أعطاني صديقي واحدة. كم أصبح لدي؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: '4 + 1 = 5 كرات' },
  { id: 'AQ-226', grade: 1, semester: 1, skillId: 'G1-N-008', questionText: 'ما العدد الأكثر بواحد من 0؟', options: ['0', '1', '2', '3'], correctAnswer: 1, difficulty: 'medium', explanation: '0 + 1 = 1' },

  // G1-N-009: أقل بواحد (had only 1 question)
  { id: 'AQ-227', grade: 1, semester: 1, skillId: 'G1-N-009', questionText: 'ما العدد الأقل بواحد من 8؟', options: ['6', '7', '8', '9'], correctAnswer: 1, difficulty: 'easy', explanation: '8 - 1 = 7' },
  { id: 'AQ-228', grade: 1, semester: 1, skillId: 'G1-N-009', questionText: 'ما العدد الأقل بواحد من 5؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: '5 - 1 = 4' },
  { id: 'AQ-229', grade: 1, semester: 1, skillId: 'G1-N-009', questionText: 'لدي 7 حلويات. أكلت واحدة. كم بقي؟', options: ['5', '6', '7', '8'], correctAnswer: 1, difficulty: 'easy', explanation: '7 - 1 = 6 حلويات' },
  { id: 'AQ-230', grade: 1, semester: 1, skillId: 'G1-N-009', questionText: 'ما العدد الأقل بواحد من 1؟', options: ['0', '1', '2', '3'], correctAnswer: 0, difficulty: 'medium', explanation: '1 - 1 = 0' },

  // G1-N-016: التقدير والعد المنظم (had only 1 question)
  { id: 'AQ-231', grade: 1, semester: 1, skillId: 'G1-N-016', questionText: 'قدّر: هل في الصورة أكثر أو أقل من 5 نجوم؟ ⭐⭐⭐⭐⭐⭐⭐', options: ['أقل من 5', 'أكثر من 5', 'بالضبط 5', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'هناك 7 نجوم، أكثر من 5' },
  { id: 'AQ-232', grade: 1, semester: 1, skillId: 'G1-N-016', questionText: 'أي طريقة أفضل لعد مجموعة كبيرة من الأشياء؟', options: ['العد عشوائياً', 'العد بالاثنينات', 'عدم العد', 'التخمين فقط'], correctAnswer: 1, difficulty: 'medium', explanation: 'العد بالاثنينات أسرع وأدق للمجموعات الكبيرة' },
  { id: 'AQ-233', grade: 1, semester: 1, skillId: 'G1-N-016', questionText: 'لعد 10 أقلام بدقة، يجب أن:', options: ['نعد بسرعة', 'نشير لكل قلم مرة واحدة', 'نعد من الأكبر', 'نخمن'], correctAnswer: 1, difficulty: 'easy', explanation: 'نشير لكل شيء مرة واحدة لنعد بدقة' },
  { id: 'AQ-234', grade: 1, semester: 1, skillId: 'G1-N-016', questionText: 'قدّر عدد الكرات: 🔵🔵🔵🔵🔵🔵🔵🔵🔵', options: ['حوالي 5', 'حوالي 7', 'حوالي 9', 'حوالي 12'], correctAnswer: 2, difficulty: 'medium', explanation: 'هناك 9 كرات' },

  // G1-G-004: المجسمات ثلاثية الأبعاد (had only 1 question)
  { id: 'AQ-235', grade: 1, semester: 1, skillId: 'G1-G-004', questionText: 'أي مجسم يشبه الكرة؟', options: ['علبة العصير', 'كرة القدم', 'المخروط', 'المكعب'], correctAnswer: 1, difficulty: 'easy', explanation: 'كرة القدم تشبه الكرة (مجسم كروي)' },
  { id: 'AQ-236', grade: 1, semester: 1, skillId: 'G1-G-004', questionText: 'أي مجسم يشبه علبة الحذاء؟', options: ['كرة', 'أسطوانة', 'متوازي مستطيلات', 'مخروط'], correctAnswer: 2, difficulty: 'easy', explanation: 'علبة الحذاء تشبه متوازي المستطيلات' },
  { id: 'AQ-237', grade: 1, semester: 1, skillId: 'G1-G-004', questionText: 'أي مجسم يمكن أن يتدحرج؟', options: ['المكعب', 'الأسطوانة', 'متوازي المستطيلات', 'المنشور'], correctAnswer: 1, difficulty: 'medium', explanation: 'الأسطوانة يمكن أن تتدحرج لأن لها سطحاً منحنياً' },
  { id: 'AQ-238', grade: 1, semester: 1, skillId: 'G1-G-004', questionText: 'كم وجهاً للمكعب؟', options: ['4', '5', '6', '8'], correctAnswer: 2, difficulty: 'medium', explanation: 'المكعب له 6 أوجه' },

  // G1-T-001: قراءة الوقت بالساعة (had only 1 question)
  { id: 'AQ-239', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'عقرب الساعة الصغير على 3. كم الساعة؟', options: ['الساعة 1', 'الساعة 2', 'الساعة 3', 'الساعة 4'], correctAnswer: 2, difficulty: 'easy', explanation: 'العقرب الصغير يشير للساعة: الساعة 3' },
  { id: 'AQ-240', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'عقرب الساعة الصغير على 7. كم الساعة؟', options: ['الساعة 6', 'الساعة 7', 'الساعة 8', 'الساعة 9'], correctAnswer: 1, difficulty: 'easy', explanation: 'العقرب الصغير على 7 = الساعة 7' },
  { id: 'AQ-241', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'عندما يكون العقرب الكبير على 12، الوقت يكون:', options: ['ونصف', 'وربع', 'تماماً (بالضبط)', 'إلا ربع'], correctAnswer: 2, difficulty: 'medium', explanation: 'العقرب الكبير على 12 يعني الساعة تماماً' },
  { id: 'AQ-242', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'في أي ساعة تذهب عادة إلى المدرسة؟', options: ['الساعة 2', 'الساعة 7', 'الساعة 10', 'الساعة 12'], correctAnswer: 1, difficulty: 'easy', explanation: 'عادة نذهب للمدرسة حوالي الساعة 7 صباحاً' },

  // G1-T-002: التعرف على النقود العمانية (had only 1 question)
  { id: 'AQ-243', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'كم بيسة في 100 بيسة؟', options: ['ريال واحد', 'نصف ريال', '100 بيسة', '10 بيسات'], correctAnswer: 2, difficulty: 'easy', explanation: '100 بيسة = 100 بيسة (ريال واحد)' },
  { id: 'AQ-244', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'أيهما أكثر قيمة: 50 بيسة أم 25 بيسة؟', options: ['25 بيسة', '50 بيسة', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '50 بيسة أكثر من 25 بيسة' },
  { id: 'AQ-245', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'كم عملة 10 بيسات نحتاج لنحصل على 50 بيسة؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'medium', explanation: '5 × 10 = 50 بيسة' },
  { id: 'AQ-246', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'لدي عملتان: 25 بيسة و 10 بيسات. كم المجموع؟', options: ['25', '30', '35', '40'], correctAnswer: 2, difficulty: 'medium', explanation: '25 + 10 = 35 بيسة' },
  // ===== G1-N-023: ترتيب الأعداد حتى 10 =====
  { id: 'AQ-001', grade: 1, semester: 1, skillId: 'G1-N-023', questionText: 'رتّب من الأصغر: 5، 2، 8', options: ['2، 5، 8', '8، 5، 2', '5، 2، 8', '2، 8، 5'], correctAnswer: 0, difficulty: 'easy', explanation: 'الترتيب من الأصغر: 2، 5، 8' },
  { id: 'AQ-002', grade: 1, semester: 1, skillId: 'G1-N-023', questionText: 'رتّب من الأكبر: 3، 7، 1', options: ['1، 3، 7', '7، 3، 1', '3، 1، 7', '7، 1، 3'], correctAnswer: 1, difficulty: 'easy', explanation: 'الترتيب من الأكبر: 7، 3، 1' },
  { id: 'AQ-003', grade: 1, semester: 1, skillId: 'G1-N-023', questionText: 'رتّب من الأصغر: 9، 4، 6، 1', options: ['1، 4، 6، 9', '9، 6، 4، 1', '4، 1، 6، 9', '1، 9، 4، 6'], correctAnswer: 0, difficulty: 'medium', explanation: 'الترتيب: 1، 4، 6، 9' },
  { id: 'AQ-004', grade: 1, semester: 1, skillId: 'G1-N-023', questionText: 'أي ترتيب صحيح من الأصغر؟', options: ['3، 1، 5، 7', '1، 3، 5، 7', '7، 5، 3، 1', '1، 5، 3، 7'], correctAnswer: 1, difficulty: 'medium', explanation: 'الترتيب الصحيح: 1، 3، 5، 7' },
  { id: 'AQ-005', grade: 1, semester: 1, skillId: 'G1-N-023', questionText: 'ما أصغر عدد: 10، 3، 7، 5؟', options: ['3', '5', '7', '10'], correctAnswer: 0, difficulty: 'easy', explanation: '3 هو أصغر عدد' },

  // ===== G1-N-024: العدد المفقود في التسلسل =====
  { id: 'AQ-006', grade: 1, semester: 1, skillId: 'G1-N-024', questionText: 'أكمل: 1، 2، __، 4، 5', options: ['3', '6', '0', '7'], correctAnswer: 0, difficulty: 'easy', explanation: 'العدد المفقود هو 3' },
  { id: 'AQ-007', grade: 1, semester: 1, skillId: 'G1-N-024', questionText: 'أكمل: 5، 6، 7، __، 9', options: ['8', '10', '6', '11'], correctAnswer: 0, difficulty: 'easy', explanation: 'العدد المفقود هو 8' },
  { id: 'AQ-008', grade: 1, semester: 1, skillId: 'G1-N-024', questionText: 'أكمل: __, 4، 5، 6، 7', options: ['2', '3', '1', '8'], correctAnswer: 1, difficulty: 'medium', explanation: 'العدد المفقود هو 3' },
  { id: 'AQ-009', grade: 1, semester: 1, skillId: 'G1-N-024', questionText: 'أكمل: 2، __، 4، __، 6', options: ['3 و 5', '1 و 3', '4 و 5', '3 و 4'], correctAnswer: 0, difficulty: 'hard', explanation: 'الأعداد المفقودة هي 3 و 5' },
  { id: 'AQ-010', grade: 1, semester: 1, skillId: 'G1-N-024', questionText: 'أكمل العد التنازلي: 10، 9، __, 7', options: ['6', '8', '11', '5'], correctAnswer: 1, difficulty: 'medium', explanation: 'العدد المفقود هو 8' },

  // ===== G1-N-025: العدد المفقود في المعادلة =====
  { id: 'AQ-011', grade: 1, semester: 2, skillId: 'G1-N-025', questionText: 'أكمل: __ + 3 = 7', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'medium', explanation: '4 + 3 = 7' },
  { id: 'AQ-012', grade: 1, semester: 2, skillId: 'G1-N-025', questionText: 'أكمل: 5 + __ = 9', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'medium', explanation: '5 + 4 = 9' },
  { id: 'AQ-013', grade: 1, semester: 2, skillId: 'G1-N-025', questionText: 'أكمل: 8 - __ = 5', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'medium', explanation: '8 - 3 = 5' },
  { id: 'AQ-014', grade: 1, semester: 2, skillId: 'G1-N-025', questionText: 'أكمل: __ - 2 = 6', options: ['4', '6', '8', '10'], correctAnswer: 2, difficulty: 'hard', explanation: '8 - 2 = 6' },
  { id: 'AQ-015', grade: 1, semester: 2, skillId: 'G1-N-025', questionText: 'أكمل: 3 + __ = 10', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: '3 + 7 = 10' },
  { id: 'AQ-016', grade: 1, semester: 2, skillId: 'G1-N-025', questionText: 'أكمل: __ + __ = 8 (عددان متساويان)', options: ['3 و 3', '4 و 4', '5 و 5', '2 و 2'], correctAnswer: 1, difficulty: 'hard', explanation: '4 + 4 = 8' },

  // ===== G1-N-026: قصص الجمع والطرح =====
  { id: 'AQ-017', grade: 1, semester: 2, skillId: 'G1-N-026', questionText: 'لدى سارة 3 دمى. أعطتها أمها 4 دمى. كم دمية لدى سارة الآن؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', explanation: '3 + 4 = 7 دمى' },
  { id: 'AQ-018', grade: 1, semester: 2, skillId: 'G1-N-026', questionText: 'كان في الحديقة 8 عصافير. طار منها 3. كم بقي؟', options: ['4', '5', '6', '3'], correctAnswer: 1, difficulty: 'easy', explanation: '8 - 3 = 5 عصافير' },
  { id: 'AQ-019', grade: 1, semester: 2, skillId: 'G1-N-026', questionText: 'في الصف 5 أولاد و 4 بنات. كم طالباً في الصف؟', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'medium', explanation: '5 + 4 = 9 طلاب' },
  { id: 'AQ-020', grade: 1, semester: 2, skillId: 'G1-N-026', questionText: 'اشترى أحمد 6 حلويات وأكل 2. كم بقي معه؟', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: '6 - 2 = 4 حلويات' },
  { id: 'AQ-021', grade: 1, semester: 2, skillId: 'G1-N-026', questionText: 'لدى خالد 4 كرات حمراء و 3 كرات زرقاء. كم كرة لديه؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: '4 + 3 = 7 كرات' },

  // ===== G1-P-002: إنشاء نمط جديد =====
  { id: 'AQ-022', grade: 1, semester: 1, skillId: 'G1-P-002', questionText: 'أي مما يلي يمثل نمطاً صحيحاً؟', options: ['🔴🔵🔴🔵🔴', '🔴🔵🔴🔴🔵', '🔴🔴🔵🔴🔵', '🔴🔵🔵🔴🔴'], correctAnswer: 0, difficulty: 'easy', explanation: 'النمط الأول يتكرر بانتظام: أحمر، أزرق' },
  { id: 'AQ-023', grade: 1, semester: 1, skillId: 'G1-P-002', questionText: 'أنشئ نمطاً من 3 عناصر. أي تكرار صحيح؟', options: ['🔺⭕⬜🔺⭕⬜', '🔺🔺⭕⬜⬜', '🔺⭕🔺⬜⭕', '⭕⬜🔺⬜⭕'], correctAnswer: 0, difficulty: 'medium', explanation: 'النمط: مثلث، دائرة، مربع يتكرر' },
  { id: 'AQ-024', grade: 1, semester: 1, skillId: 'G1-P-002', questionText: 'أي نمط عددي صحيح؟', options: ['1، 3، 5، 7', '1، 2، 4، 5', '2، 3، 5، 6', '1، 4، 2، 5'], correctAnswer: 0, difficulty: 'hard', explanation: 'النمط: +2 كل مرة (أعداد فردية)' },
  { id: 'AQ-025', grade: 1, semester: 1, skillId: 'G1-P-002', questionText: 'أكمل النمط: أ ب ب أ ب ب أ __', options: ['أ', 'ب', 'ج', 'أ ب'], correctAnswer: 1, difficulty: 'medium', explanation: 'النمط: أ ب ب يتكرر، التالي ب' },

  // ===== G1-T-007: ترتيب أحداث اليوم =====
  { id: 'AQ-026', grade: 1, semester: 2, skillId: 'G1-T-007', questionText: 'ما أول شيء تفعله في الصباح؟', options: ['الغداء', 'الاستيقاظ', 'النوم', 'العشاء'], correctAnswer: 1, difficulty: 'easy', explanation: 'أول شيء في الصباح هو الاستيقاظ' },
  { id: 'AQ-027', grade: 1, semester: 2, skillId: 'G1-T-007', questionText: 'رتّب: المدرسة، الاستيقاظ، النوم', options: ['النوم، المدرسة، الاستيقاظ', 'الاستيقاظ، المدرسة، النوم', 'المدرسة، الاستيقاظ، النوم', 'الاستيقاظ، النوم، المدرسة'], correctAnswer: 1, difficulty: 'easy', explanation: 'الترتيب: الاستيقاظ ثم المدرسة ثم النوم' },
  { id: 'AQ-028', grade: 1, semester: 2, skillId: 'G1-T-007', questionText: 'أي وجبة نأكلها في المساء؟', options: ['الفطور', 'الغداء', 'العشاء', 'الوجبة الخفيفة'], correctAnswer: 2, difficulty: 'easy', explanation: 'العشاء هو وجبة المساء' },
  { id: 'AQ-029', grade: 1, semester: 2, skillId: 'G1-T-007', questionText: 'ماذا يأتي بعد الظهر؟', options: ['الصباح', 'المساء', 'الفجر', 'منتصف الليل'], correctAnswer: 1, difficulty: 'medium', explanation: 'المساء يأتي بعد الظهر' },

  // ===== G2-N-014: القيمة المكانية =====
  { id: 'AQ-030', grade: 2, semester: 1, skillId: 'G2-N-014', questionText: 'في العدد 56، ما قيمة الرقم 5؟', options: ['5', '50', '56', '6'], correctAnswer: 1, difficulty: 'medium', explanation: 'الرقم 5 في خانة العشرات، قيمته 50' },
  { id: 'AQ-031', grade: 2, semester: 1, skillId: 'G2-N-014', questionText: 'في العدد 83، ما قيمة الرقم 3؟', options: ['30', '3', '83', '80'], correctAnswer: 1, difficulty: 'easy', explanation: 'الرقم 3 في خانة الآحاد، قيمته 3' },
  { id: 'AQ-032', grade: 2, semester: 1, skillId: 'G2-N-014', questionText: 'أي عدد فيه 7 عشرات و 2 آحاد؟', options: ['27', '72', '70', '92'], correctAnswer: 1, difficulty: 'medium', explanation: '7 عشرات + 2 آحاد = 72' },
  { id: 'AQ-033', grade: 2, semester: 1, skillId: 'G2-N-014', questionText: 'العدد 45 = __ عشرات + __ آحاد', options: ['5 و 4', '4 و 5', '40 و 5', '4 و 50'], correctAnswer: 1, difficulty: 'easy', explanation: '45 = 4 عشرات + 5 آحاد' },
  { id: 'AQ-034', grade: 2, semester: 1, skillId: 'G2-N-014', questionText: 'أي عدد فيه رقم العشرات أكبر من رقم الآحاد؟', options: ['37', '73', '55', '19'], correctAnswer: 1, difficulty: 'hard', explanation: 'في 73: العشرات (7) > الآحاد (3)' },

  // ===== G2-N-015: النصف =====
  { id: 'AQ-035', grade: 2, semester: 2, skillId: 'G2-N-015', questionText: 'ما نصف العدد 16؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', explanation: 'نصف 16 = 8' },
  { id: 'AQ-036', grade: 2, semester: 2, skillId: 'G2-N-015', questionText: 'ما نصف العدد 20؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'easy', explanation: 'نصف 20 = 10' },
  { id: 'AQ-037', grade: 2, semester: 2, skillId: 'G2-N-015', questionText: 'ما نصف العدد 14؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: 'نصف 14 = 7' },
  { id: 'AQ-038', grade: 2, semester: 2, skillId: 'G2-N-015', questionText: 'لدي 12 قطعة حلوى. أريد نصفها. كم آخذ؟', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'medium', explanation: 'نصف 12 = 6' },
  { id: 'AQ-039', grade: 2, semester: 2, skillId: 'G2-N-015', questionText: 'ما نصف العدد 50؟', options: ['20', '25', '30', '35'], correctAnswer: 1, difficulty: 'hard', explanation: 'نصف 50 = 25' },

  // ===== G2-C-007: الجمع بالتجميع (عبور العشرة) =====
  { id: 'AQ-040', grade: 2, semester: 1, skillId: 'G2-C-007', questionText: 'ما ناتج 8 + 5 باستخدام عبور العشرة؟', options: ['12', '13', '14', '15'], correctAnswer: 1, difficulty: 'medium', explanation: '8 + 2 = 10، ثم 10 + 3 = 13' },
  { id: 'AQ-041', grade: 2, semester: 1, skillId: 'G2-C-007', questionText: 'ما ناتج 7 + 6؟', options: ['12', '13', '14', '11'], correctAnswer: 1, difficulty: 'medium', explanation: '7 + 3 = 10، ثم 10 + 3 = 13' },
  { id: 'AQ-042', grade: 2, semester: 1, skillId: 'G2-C-007', questionText: 'ما ناتج 9 + 4؟', options: ['12', '13', '14', '11'], correctAnswer: 1, difficulty: 'easy', explanation: '9 + 1 = 10، ثم 10 + 3 = 13' },
  { id: 'AQ-043', grade: 2, semester: 1, skillId: 'G2-C-007', questionText: 'ما ناتج 6 + 8؟', options: ['12', '13', '14', '15'], correctAnswer: 2, difficulty: 'medium', explanation: '6 + 4 = 10، ثم 10 + 4 = 14' },
  { id: 'AQ-044', grade: 2, semester: 1, skillId: 'G2-C-007', questionText: 'ما ناتج 5 + 9؟', options: ['13', '14', '15', '12'], correctAnswer: 1, difficulty: 'medium', explanation: '5 + 5 = 10، ثم 10 + 4 = 14' },

  // ===== G2-C-008: مسائل كلامية =====
  { id: 'AQ-045', grade: 2, semester: 2, skillId: 'G2-C-008', questionText: 'في المكتبة 45 كتاباً. استعار الطلاب 12. كم بقي؟', options: ['33', '32', '34', '31'], correctAnswer: 0, difficulty: 'medium', explanation: '45 - 12 = 33 كتاباً' },
  { id: 'AQ-046', grade: 2, semester: 2, skillId: 'G2-C-008', questionText: 'جمع سالم 28 طابعاً وأخته 15. كم المجموع؟', options: ['42', '43', '44', '41'], correctAnswer: 1, difficulty: 'medium', explanation: '28 + 15 = 43 طابعاً' },
  { id: 'AQ-047', grade: 2, semester: 2, skillId: 'G2-C-008', questionText: 'في الحافلة 36 راكباً. نزل 14 وصعد 8. كم في الحافلة؟', options: ['28', '29', '30', '31'], correctAnswer: 2, difficulty: 'hard', explanation: '36 - 14 = 22، ثم 22 + 8 = 30' },
  { id: 'AQ-048', grade: 2, semester: 2, skillId: 'G2-C-008', questionText: 'اشترت فاطمة دفتراً بـ 25 بيسة وقلماً بـ 15 بيسة. كم دفعت؟', options: ['35', '40', '45', '30'], correctAnswer: 1, difficulty: 'easy', explanation: '25 + 15 = 40 بيسة' },
  { id: 'AQ-049', grade: 2, semester: 2, skillId: 'G2-C-008', questionText: 'لدى محمد 50 بيسة. اشترى حلوى بـ 30 بيسة. كم بقي؟', options: ['10', '15', '20', '25'], correctAnswer: 2, difficulty: 'easy', explanation: '50 - 30 = 20 بيسة' },

  // ===== G2-A-003: الضرب في 2 و 5 و 10 =====
  { id: 'AQ-050', grade: 2, semester: 2, skillId: 'G2-A-003', questionText: 'ما ناتج 3 × 2؟', options: ['4', '5', '6', '8'], correctAnswer: 2, difficulty: 'easy', explanation: '3 × 2 = 6' },
  { id: 'AQ-051', grade: 2, semester: 2, skillId: 'G2-A-003', questionText: 'ما ناتج 4 × 5؟', options: ['15', '20', '25', '30'], correctAnswer: 1, difficulty: 'easy', explanation: '4 × 5 = 20' },
  { id: 'AQ-052', grade: 2, semester: 2, skillId: 'G2-A-003', questionText: 'ما ناتج 7 × 10؟', options: ['17', '70', '77', '100'], correctAnswer: 1, difficulty: 'easy', explanation: '7 × 10 = 70' },
  { id: 'AQ-053', grade: 2, semester: 2, skillId: 'G2-A-003', questionText: 'ما ناتج 6 × 2؟', options: ['8', '10', '12', '14'], correctAnswer: 2, difficulty: 'easy', explanation: '6 × 2 = 12' },
  { id: 'AQ-054', grade: 2, semester: 2, skillId: 'G2-A-003', questionText: 'ما ناتج 8 × 5؟', options: ['35', '40', '45', '50'], correctAnswer: 1, difficulty: 'medium', explanation: '8 × 5 = 40' },
  { id: 'AQ-055', grade: 2, semester: 2, skillId: 'G2-A-003', questionText: 'في كل صف 5 مقاعد. كم مقعداً في 6 صفوف؟', options: ['25', '30', '35', '40'], correctAnswer: 1, difficulty: 'medium', explanation: '6 × 5 = 30 مقعداً' },

  // ===== G2-G-006: الموقع والاتجاه =====
  { id: 'AQ-056', grade: 2, semester: 2, skillId: 'G2-G-006', questionText: 'الكتاب فوق الطاولة. أين الطاولة بالنسبة للكتاب؟', options: ['فوق', 'تحت', 'يمين', 'يسار'], correctAnswer: 1, difficulty: 'easy', explanation: 'الطاولة تحت الكتاب' },
  { id: 'AQ-057', grade: 2, semester: 2, skillId: 'G2-G-006', questionText: 'إذا كنت تنظر للشمال، ما الاتجاه خلفك؟', options: ['شرق', 'غرب', 'جنوب', 'شمال'], correctAnswer: 2, difficulty: 'medium', explanation: 'خلف الشمال يكون الجنوب' },
  { id: 'AQ-058', grade: 2, semester: 2, skillId: 'G2-G-006', questionText: 'القطة بين الكرسي والطاولة. أين القطة؟', options: ['فوق', 'تحت', 'بين', 'خلف'], correctAnswer: 2, difficulty: 'easy', explanation: 'القطة في المنتصف بين شيئين' },
  { id: 'AQ-059', grade: 2, semester: 2, skillId: 'G2-G-006', questionText: 'استدر ربع دورة لليمين. كم درجة استدرت؟', options: ['45', '90', '180', '360'], correctAnswer: 1, difficulty: 'hard', explanation: 'ربع دورة = 90 درجة' },

  // ===== G2-M-006: قياس الطول بالمتر =====
  { id: 'AQ-060', grade: 2, semester: 2, skillId: 'G2-M-006', questionText: 'كم سنتيمتراً في المتر الواحد؟', options: ['10', '50', '100', '1000'], correctAnswer: 2, difficulty: 'easy', explanation: 'المتر الواحد = 100 سنتيمتر' },
  { id: 'AQ-061', grade: 2, semester: 2, skillId: 'G2-M-006', questionText: 'أيهما نقيس بالمتر؟', options: ['طول القلم', 'طول الغرفة', 'طول النملة', 'سمك الكتاب'], correctAnswer: 1, difficulty: 'easy', explanation: 'نقيس الأشياء الكبيرة بالمتر مثل طول الغرفة' },
  { id: 'AQ-062', grade: 2, semester: 2, skillId: 'G2-M-006', questionText: '2 متر = كم سنتيمتر؟', options: ['20', '100', '200', '2000'], correctAnswer: 2, difficulty: 'medium', explanation: '2 × 100 = 200 سنتيمتر' },
  { id: 'AQ-063', grade: 2, semester: 2, skillId: 'G2-M-006', questionText: 'طول الباب حوالي:', options: ['2 سم', '2 م', '20 م', '200 م'], correctAnswer: 1, difficulty: 'medium', explanation: 'طول الباب حوالي 2 متر' },

  // ===== G2-F-002: الكسور: ثلاثة أرباع =====
  { id: 'AQ-064', grade: 2, semester: 2, skillId: 'G2-F-002', questionText: 'لوّنت ثلاثة أرباع الشكل. كم جزءاً لوّنت من 4؟', options: ['1', '2', '3', '4'], correctAnswer: 2, difficulty: 'easy', explanation: 'ثلاثة أرباع = 3 أجزاء من 4' },
  { id: 'AQ-065', grade: 2, semester: 2, skillId: 'G2-F-002', questionText: 'أيهما أكبر: النصف أم ثلاثة أرباع؟', options: ['النصف', 'ثلاثة أرباع', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'medium', explanation: 'ثلاثة أرباع (¾) أكبر من النصف (½)' },
  { id: 'AQ-066', grade: 2, semester: 2, skillId: 'G2-F-002', questionText: 'إذا أكلت ربع البيتزا، كم بقي؟', options: ['ربع', 'نصف', 'ثلاثة أرباع', 'كاملة'], correctAnswer: 2, difficulty: 'medium', explanation: 'البيتزا كاملة - ربع = ثلاثة أرباع' },
  { id: 'AQ-067', grade: 2, semester: 2, skillId: 'G2-F-002', questionText: 'ثلاثة أرباع العدد 8 =', options: ['2', '4', '6', '8'], correctAnswer: 2, difficulty: 'hard', explanation: 'ربع 8 = 2، ثلاثة أرباع = 3 × 2 = 6' },

  // ===== G2-F-003: كسور المجموعات =====
  { id: 'AQ-068', grade: 2, semester: 2, skillId: 'G2-F-003', questionText: 'ما نصف مجموعة من 10 كرات؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'نصف 10 = 5 كرات' },
  { id: 'AQ-069', grade: 2, semester: 2, skillId: 'G2-F-003', questionText: 'ما ربع مجموعة من 8 تفاحات؟', options: ['2', '3', '4', '5'], correctAnswer: 0, difficulty: 'medium', explanation: 'ربع 8 = 2 تفاحات' },
  { id: 'AQ-070', grade: 2, semester: 2, skillId: 'G2-F-003', questionText: 'نصف مجموعة من 6 أقلام =', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'نصف 6 = 3 أقلام' },
  { id: 'AQ-071', grade: 2, semester: 2, skillId: 'G2-F-003', questionText: 'ربع مجموعة من 12 حلوى =', options: ['2', '3', '4', '6'], correctAnswer: 1, difficulty: 'medium', explanation: 'ربع 12 = 3 حلويات' },
  { id: 'AQ-072', grade: 2, semester: 2, skillId: 'G2-F-003', questionText: 'نصف مجموعة من 14 طالباً =', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: 'نصف 14 = 7 طلاب' },

  // ===== Extra questions for existing skills with low coverage =====
  
  // G1-N-001: العد من 1 إلى 5
  { id: 'AQ-073', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم نجمة؟ ⭐⭐⭐⭐', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'easy', explanation: 'نعد النجوم: 1، 2، 3، 4' },
  { id: 'AQ-074', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم زهرة؟ 🌸🌸', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: 'نعد الزهور: 1، 2' },
  { id: 'AQ-075', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم قلباً؟ ❤️❤️❤️❤️❤️', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'نعد القلوب: 1، 2، 3، 4، 5' },

  // G1-N-002: العد من 1 إلى 10
  { id: 'AQ-076', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما العدد الذي يأتي بعد 7؟', options: ['6', '8', '9', '10'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد بعد 7 هو 8' },
  { id: 'AQ-077', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما العدد الذي يأتي قبل 5؟', options: ['3', '4', '6', '7'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد قبل 5 هو 4' },
  { id: 'AQ-078', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'عُد: 1، 2، 3، ...، ما العدد العاشر؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'easy', explanation: 'العدد العاشر هو 10' },

  // G1-N-005: مطابقة العدد بالكمية
  { id: 'AQ-079', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'أي مجموعة تحتوي على 6 أشياء؟', options: ['🍎🍎🍎🍎🍎', '🍎🍎🍎🍎🍎🍎', '🍎🍎🍎🍎', '🍎🍎🍎🍎🍎🍎🍎'], correctAnswer: 1, difficulty: 'easy', explanation: 'المجموعة الثانية تحتوي على 6 تفاحات' },
  { id: 'AQ-080', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'العدد 4 يمثل:', options: ['🌟🌟🌟', '🌟🌟🌟🌟', '🌟🌟🌟🌟🌟', '🌟🌟'], correctAnswer: 1, difficulty: 'easy', explanation: '4 نجوم' },

  // G1-N-006: المقارنة بين الكميات
  { id: 'AQ-081', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'أيهما أكثر: 7 أم 4؟', options: ['4', '7', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '7 أكثر من 4' },
  { id: 'AQ-082', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'أيهما أقل: 3 أم 9؟', options: ['3', '9', 'متساويان', 'لا أعرف'], correctAnswer: 0, difficulty: 'easy', explanation: '3 أقل من 9' },
  { id: 'AQ-083', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'رتّب من الأقل: 8، 2، 5', options: ['2، 5، 8', '8، 5، 2', '5، 2، 8', '2، 8، 5'], correctAnswer: 0, difficulty: 'medium', explanation: 'الترتيب: 2، 5، 8' },

  // G1-N-010: تكوين العدد 5
  { id: 'AQ-084', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: '5 = 2 + __', options: ['1', '2', '3', '4'], correctAnswer: 2, difficulty: 'easy', explanation: '5 = 2 + 3' },
  { id: 'AQ-085', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: '5 = 4 + __', options: ['0', '1', '2', '3'], correctAnswer: 1, difficulty: 'easy', explanation: '5 = 4 + 1' },
  { id: 'AQ-086', grade: 1, semester: 1, skillId: 'G1-N-010', questionText: 'أي زوج يكوّن 5؟', options: ['2 و 4', '1 و 4', '3 و 3', '2 و 2'], correctAnswer: 1, difficulty: 'medium', explanation: '1 + 4 = 5' },

  // G1-N-011: تكوين العدد 10
  { id: 'AQ-087', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: '10 = 7 + __', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: '10 = 7 + 3' },
  { id: 'AQ-088', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: '10 = 6 + __', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', explanation: '10 = 6 + 4' },
  { id: 'AQ-089', grade: 1, semester: 1, skillId: 'G1-N-011', questionText: 'أي زوج يكوّن 10؟', options: ['3 و 6', '4 و 6', '5 و 6', '2 و 6'], correctAnswer: 1, difficulty: 'medium', explanation: '4 + 6 = 10' },

  // G1-N-012: الجمع ضمن 10
  { id: 'AQ-090', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'ما ناتج 2 + 7؟', options: ['8', '9', '10', '7'], correctAnswer: 1, difficulty: 'easy', explanation: '2 + 7 = 9' },
  { id: 'AQ-091', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'ما ناتج 4 + 4؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', explanation: '4 + 4 = 8' },
  { id: 'AQ-092', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'ما ناتج 1 + 9؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'easy', explanation: '1 + 9 = 10', visualType: 'number-line', visualData: { start: 0, end: 12, highlight: [1, 10], jumpFrom: 1, jumpTo: 10, jumpCount: 9 } },
  { id: 'AQ-093', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'ما ناتج 3 + 5؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', explanation: '3 + 5 = 8' },
  { id: 'AQ-094', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'ما ناتج 6 + 3؟', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'easy', explanation: '6 + 3 = 9' },

  // G1-N-013: الطرح ضمن 10
  { id: 'AQ-095', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما ناتج 6 - 3؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: '6 - 3 = 3' },
  { id: 'AQ-096', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما ناتج 10 - 7؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'medium', explanation: '10 - 7 = 3' },
  { id: 'AQ-097', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما ناتج 5 - 5؟', options: ['0', '1', '5', '10'], correctAnswer: 0, difficulty: 'medium', explanation: '5 - 5 = 0' },
  { id: 'AQ-098', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما ناتج 9 - 4؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: '9 - 4 = 5' },
  { id: 'AQ-099', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'ما ناتج 7 - 2؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: '7 - 2 = 5' },

  // G1-N-014: الأعداد من 11 إلى 20
  { id: 'AQ-100', grade: 1, semester: 1, skillId: 'G1-N-014', questionText: 'ما العدد الذي يأتي بعد 15؟', options: ['14', '16', '17', '20'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد بعد 15 هو 16' },
  { id: 'AQ-101', grade: 1, semester: 1, skillId: 'G1-N-014', questionText: 'أيهما أكبر: 13 أم 18؟', options: ['13', '18', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '18 أكبر من 13' },
  { id: 'AQ-102', grade: 1, semester: 1, skillId: 'G1-N-014', questionText: 'رتّب: 19، 11، 15 من الأصغر', options: ['11، 15، 19', '19، 15، 11', '15، 11، 19', '11، 19، 15'], correctAnswer: 0, difficulty: 'medium', explanation: 'الترتيب: 11، 15، 19' },

  // G1-N-015: الضعف
  { id: 'AQ-103', grade: 1, semester: 1, skillId: 'G1-N-015', questionText: 'ما ضعف العدد 3؟', options: ['5', '6', '7', '9'], correctAnswer: 1, difficulty: 'easy', explanation: 'ضعف 3 = 3 + 3 = 6' },
  { id: 'AQ-104', grade: 1, semester: 1, skillId: 'G1-N-015', questionText: 'ما ضعف العدد 5؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'easy', explanation: 'ضعف 5 = 5 + 5 = 10' },
  { id: 'AQ-105', grade: 1, semester: 1, skillId: 'G1-N-015', questionText: 'ما ضعف العدد 4؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', explanation: 'ضعف 4 = 4 + 4 = 8' },
  { id: 'AQ-106', grade: 1, semester: 1, skillId: 'G1-N-015', questionText: 'إذا كان ضعف عدد = 14، ما هو العدد؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'hard', explanation: 'ضعف 7 = 14' },

  // G1-G-001: التعرف على الأشكال البسيطة
  { id: 'AQ-107', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'كم ضلعاً للمثلث؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'المثلث له 3 أضلاع' },
  { id: 'AQ-108', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل له 4 أضلاع متساوية؟', options: ['المثلث', 'المربع', 'الدائرة', 'المستطيل'], correctAnswer: 1, difficulty: 'easy', explanation: 'المربع له 4 أضلاع متساوية' },
  { id: 'AQ-109', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل ليس له أضلاع؟', options: ['المثلث', 'المربع', 'الدائرة', 'المستطيل'], correctAnswer: 2, difficulty: 'easy', explanation: 'الدائرة ليس لها أضلاع' },
  { id: 'AQ-110', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'كم زاوية للمربع؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'medium', explanation: 'المربع له 4 زوايا' },

  // G1-M-001: مقارنة الأطوال
  { id: 'AQ-111', grade: 1, semester: 1, skillId: 'G1-M-001', questionText: 'أيهما أطول: القلم أم المسطرة؟', options: ['القلم', 'المسطرة', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'المسطرة عادة أطول من القلم' },
  { id: 'AQ-112', grade: 1, semester: 1, skillId: 'G1-M-001', questionText: 'أيهما أقصر: الشجرة أم الزهرة؟', options: ['الشجرة', 'الزهرة', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الزهرة أقصر من الشجرة' },

  // G2-N-001: قراءة الأعداد حتى 100
  { id: 'AQ-113', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'ما العدد: أربعة وستون؟', options: ['46', '64', '60', '44'], correctAnswer: 1, difficulty: 'easy', explanation: 'أربعة وستون = 64' },
  { id: 'AQ-114', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'كيف نقرأ العدد 87؟', options: ['ثمانية وسبعون', 'سبعة وثمانون', 'ثمانية وسبعة', 'سبعة وثمانية'], correctAnswer: 1, difficulty: 'easy', explanation: '87 = سبعة وثمانون' },
  { id: 'AQ-115', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'ما العدد الذي يأتي بعد 99؟', options: ['98', '100', '101', '90'], correctAnswer: 1, difficulty: 'medium', explanation: 'العدد بعد 99 هو 100' },

  // G2-C-001: الجمع ضمن 20
  { id: 'AQ-116', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: 'ما ناتج 9 + 8؟', options: ['15', '16', '17', '18'], correctAnswer: 2, difficulty: 'medium', explanation: '9 + 8 = 17' },
  { id: 'AQ-117', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: 'ما ناتج 7 + 7؟', options: ['12', '13', '14', '15'], correctAnswer: 2, difficulty: 'easy', explanation: '7 + 7 = 14' },
  { id: 'AQ-118', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: 'ما ناتج 11 + 6؟', options: ['15', '16', '17', '18'], correctAnswer: 2, difficulty: 'easy', explanation: '11 + 6 = 17' },
  { id: 'AQ-119', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: 'ما ناتج 8 + 9؟', options: ['15', '16', '17', '18'], correctAnswer: 2, difficulty: 'medium', explanation: '8 + 9 = 17' },

  // G2-C-002: الطرح ضمن 20
  { id: 'AQ-120', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: 'ما ناتج 15 - 7؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'medium', explanation: '15 - 7 = 8' },
  { id: 'AQ-121', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: 'ما ناتج 18 - 9؟', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'easy', explanation: '18 - 9 = 9' },
  { id: 'AQ-122', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: 'ما ناتج 14 - 6؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'medium', explanation: '14 - 6 = 8' },
  { id: 'AQ-123', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: 'ما ناتج 20 - 13؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'hard', explanation: '20 - 13 = 7' },

  // G2-C-003: الجمع ضمن 100
  { id: 'AQ-124', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: 'ما ناتج 34 + 25؟', options: ['57', '58', '59', '60'], correctAnswer: 2, difficulty: 'easy', explanation: '34 + 25 = 59' },
  { id: 'AQ-125', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: 'ما ناتج 47 + 36؟', options: ['81', '82', '83', '84'], correctAnswer: 2, difficulty: 'medium', explanation: '47 + 36 = 83' },
  { id: 'AQ-126', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: 'ما ناتج 56 + 28؟', options: ['82', '83', '84', '85'], correctAnswer: 2, difficulty: 'medium', explanation: '56 + 28 = 84' },
  { id: 'AQ-127', grade: 2, semester: 2, skillId: 'G2-C-003', questionText: 'ما ناتج 19 + 45؟', options: ['62', '63', '64', '65'], correctAnswer: 2, difficulty: 'hard', explanation: '19 + 45 = 64' },

  // G2-C-004: الطرح ضمن 100
  { id: 'AQ-128', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: 'ما ناتج 78 - 35؟', options: ['41', '42', '43', '44'], correctAnswer: 2, difficulty: 'easy', explanation: '78 - 35 = 43' },
  { id: 'AQ-129', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: 'ما ناتج 63 - 27؟', options: ['34', '35', '36', '37'], correctAnswer: 2, difficulty: 'medium', explanation: '63 - 27 = 36' },
  { id: 'AQ-130', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: 'ما ناتج 90 - 48؟', options: ['40', '41', '42', '43'], correctAnswer: 2, difficulty: 'hard', explanation: '90 - 48 = 42' },
  { id: 'AQ-131', grade: 2, semester: 2, skillId: 'G2-C-004', questionText: 'ما ناتج 55 - 19؟', options: ['34', '35', '36', '37'], correctAnswer: 2, difficulty: 'medium', explanation: '55 - 19 = 36' },

  // G2-N-003: العد بالاثنينات
  { id: 'AQ-132', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'أكمل: 2، 4، 6، __، 10', options: ['7', '8', '9', '11'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالاثنينات: 8' },
  { id: 'AQ-133', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'أكمل: 12، 14، __، 18، 20', options: ['15', '16', '17', '19'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالاثنينات: 16' },
  { id: 'AQ-134', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'أي عدد ليس في تسلسل العد بالاثنينات؟', options: ['6', '10', '15', '20'], correctAnswer: 2, difficulty: 'medium', explanation: '15 عدد فردي وليس في تسلسل العد بالاثنينات' },

  // G2-N-004: العد بالخمسات
  { id: 'AQ-135', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: 'أكمل: 5، 10، 15، __، 25', options: ['18', '19', '20', '22'], correctAnswer: 2, difficulty: 'easy', explanation: 'العد بالخمسات: 20' },
  { id: 'AQ-136', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: 'أكمل: 30، 35، 40، __', options: ['42', '44', '45', '50'], correctAnswer: 2, difficulty: 'easy', explanation: 'العد بالخمسات: 45' },
  { id: 'AQ-137', grade: 2, semester: 1, skillId: 'G2-N-004', questionText: 'كم مرة نعد بالخمسات للوصول إلى 50؟', options: ['5', '8', '10', '15'], correctAnswer: 2, difficulty: 'medium', explanation: '5 × 10 = 50' },

  // G2-N-005: العد بالعشرات
  { id: 'AQ-138', grade: 2, semester: 1, skillId: 'G2-N-005', questionText: 'أكمل: 10، 20، 30، __، 50', options: ['35', '40', '45', '55'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالعشرات: 40' },
  { id: 'AQ-139', grade: 2, semester: 1, skillId: 'G2-N-005', questionText: 'ما ناتج العد بالعشرات 7 مرات؟', options: ['50', '60', '70', '80'], correctAnswer: 2, difficulty: 'medium', explanation: '10 × 7 = 70' },

  // G2-A-001: فهم المصفوفات
  { id: 'AQ-140', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: 'مصفوفة من 3 صفوف و 4 أعمدة. كم العدد الكلي؟', options: ['7', '10', '12', '14'], correctAnswer: 2, difficulty: 'medium', explanation: '3 × 4 = 12' },
  { id: 'AQ-141', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: 'مصفوفة من 2 صفوف و 5 أعمدة. كم العدد الكلي؟', options: ['7', '8', '10', '12'], correctAnswer: 2, difficulty: 'easy', explanation: '2 × 5 = 10' },
  { id: 'AQ-142', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: 'مصفوفة فيها 4 صفوف و 3 أعمدة. كم عنصراً فيها؟', options: ['7', '10', '12', '15'], correctAnswer: 2, difficulty: 'medium', explanation: '4 × 3 = 12' },

  // G2-F-001: الكسور: النصف والربع
  { id: 'AQ-143', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ما نصف الدائرة؟', options: ['جزء واحد من 4', 'جزء واحد من 2', 'جزءان من 4', 'الكل'], correctAnswer: 1, difficulty: 'easy', explanation: 'النصف = جزء واحد من جزأين' },
  { id: 'AQ-144', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'قسمت البيتزا إلى 4 أجزاء. أكلت جزءاً واحداً. كم أكلت؟', options: ['نصف', 'ربع', 'ثلاثة أرباع', 'الكل'], correctAnswer: 1, difficulty: 'easy', explanation: 'جزء واحد من 4 = ربع' },
  { id: 'AQ-145', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'أيهما أكبر: النصف أم الربع؟', options: ['الربع', 'النصف', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'medium', explanation: 'النصف (½) أكبر من الربع (¼)' },
  { id: 'AQ-146', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'نصف العدد 8 =', options: ['2', '3', '4', '6'], correctAnswer: 2, difficulty: 'medium', explanation: 'نصف 8 = 4' },
  { id: 'AQ-147', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ربع العدد 12 =', options: ['2', '3', '4', '6'], correctAnswer: 1, difficulty: 'hard', explanation: 'ربع 12 = 3' },

  // G2-G-001: التعرف على الأشكال ثنائية الأبعاد
  { id: 'AQ-148', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'كم ضلعاً للمسدس؟', options: ['4', '5', '6', '8'], correctAnswer: 2, difficulty: 'medium', explanation: 'المسدس له 6 أضلاع' },
  { id: 'AQ-149', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'أي شكل له 5 أضلاع؟', options: ['المربع', 'المخمس', 'المسدس', 'المثلث'], correctAnswer: 1, difficulty: 'medium', explanation: 'المخمس له 5 أضلاع' },
  { id: 'AQ-150', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'المستطيل له:', options: ['4 أضلاع متساوية', '4 أضلاع (كل ضلعين متقابلين متساويين)', '3 أضلاع', '6 أضلاع'], correctAnswer: 1, difficulty: 'easy', explanation: 'المستطيل له 4 أضلاع، كل ضلعين متقابلين متساويين' },

  // G2-N-006: ترتيب الأعداد حتى 100
  { id: 'AQ-151', grade: 2, semester: 1, skillId: 'G2-N-006', questionText: 'رتّب من الأصغر: 45، 23، 67', options: ['23، 45، 67', '67، 45، 23', '45، 23، 67', '23، 67، 45'], correctAnswer: 0, difficulty: 'easy', explanation: 'الترتيب: 23، 45، 67' },
  { id: 'AQ-152', grade: 2, semester: 1, skillId: 'G2-N-006', questionText: 'أي عدد يقع بين 35 و 40؟', options: ['34', '37', '41', '30'], correctAnswer: 1, difficulty: 'easy', explanation: '37 يقع بين 35 و 40' },
  { id: 'AQ-153', grade: 2, semester: 1, skillId: 'G2-N-006', questionText: 'رتّب من الأكبر: 88، 56، 72', options: ['56، 72، 88', '88، 72، 56', '72، 56، 88', '88، 56، 72'], correctAnswer: 1, difficulty: 'medium', explanation: 'الترتيب من الأكبر: 88، 72، 56' },

  // G2-N-007: مقارنة الأعداد حتى 100
  { id: 'AQ-154', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'أيهما أكبر: 54 أم 45؟', options: ['45', '54', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '54 > 45' },
  { id: 'AQ-155', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'ضع الإشارة المناسبة: 67 __ 76', options: ['>', '<', '=', '≠'], correctAnswer: 1, difficulty: 'medium', explanation: '67 < 76' },
  { id: 'AQ-156', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'أيهما أقل: 89 أم 91؟', options: ['89', '91', 'متساويان', 'لا أعرف'], correctAnswer: 0, difficulty: 'easy', explanation: '89 < 91' },

  // G2-N-008: التقريب إلى أقرب عشرة
  { id: 'AQ-157', grade: 2, semester: 1, skillId: 'G2-N-008', questionText: 'قرّب 23 إلى أقرب عشرة:', options: ['20', '25', '30', '10'], correctAnswer: 0, difficulty: 'easy', explanation: '23 أقرب إلى 20' },
  { id: 'AQ-158', grade: 2, semester: 1, skillId: 'G2-N-008', questionText: 'قرّب 67 إلى أقرب عشرة:', options: ['60', '65', '70', '80'], correctAnswer: 2, difficulty: 'easy', explanation: '67 أقرب إلى 70' },
  { id: 'AQ-159', grade: 2, semester: 1, skillId: 'G2-N-008', questionText: 'قرّب 45 إلى أقرب عشرة:', options: ['40', '45', '50', '55'], correctAnswer: 2, difficulty: 'medium', explanation: '45 تقرب إلى 50 (عند 5 نقرب لأعلى)' },

  // ===== New skills questions =====

  // G1-N-027: إضافة/طرح 1 أو 10 (مصنع الأعداد)
  { id: 'AQ-160', grade: 1, semester: 2, skillId: 'G1-N-027', questionText: 'ما ناتج 25 + 10؟', options: ['26', '30', '35', '15'], correctAnswer: 2, difficulty: 'easy', explanation: '25 + 10 = 35' },
  { id: 'AQ-161', grade: 1, semester: 2, skillId: 'G1-N-027', questionText: 'ما ناتج 43 - 10؟', options: ['33', '42', '44', '53'], correctAnswer: 0, difficulty: 'easy', explanation: '43 - 10 = 33' },
  { id: 'AQ-162', grade: 1, semester: 2, skillId: 'G1-N-027', questionText: 'ما ناتج 67 + 1؟', options: ['66', '68', '77', '57'], correctAnswer: 1, difficulty: 'easy', explanation: '67 + 1 = 68' },
  { id: 'AQ-163', grade: 1, semester: 2, skillId: 'G1-N-027', questionText: 'ما ناتج 50 - 1؟', options: ['40', '49', '51', '41'], correctAnswer: 1, difficulty: 'easy', explanation: '50 - 1 = 49' },
  { id: 'AQ-164', grade: 1, semester: 2, skillId: 'G1-N-027', questionText: 'ما ناتج 38 + 10؟', options: ['39', '28', '48', '40'], correctAnswer: 2, difficulty: 'medium', explanation: '38 + 10 = 48' },

  // G1-M-004: القياس بالميزان (تساوي الأوزان)
  { id: 'AQ-165', grade: 1, semester: 2, skillId: 'G1-M-004', questionText: 'إذا كان الميزان متوازناً، فالكفتان:', options: ['مختلفتان', 'متساويتان في الوزن', 'واحدة فارغة', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الميزان المتوازن يعني أن الكفتين متساويتان' },
  { id: 'AQ-166', grade: 1, semester: 2, skillId: 'G1-M-004', questionText: 'وزن التفاحة = 3 مكعبات. كم مكعباً نحتاج لتفاحتين؟', options: ['3', '5', '6', '9'], correctAnswer: 2, difficulty: 'medium', explanation: 'تفاحتان = 3 + 3 = 6 مكعبات' },
  { id: 'AQ-167', grade: 1, semester: 2, skillId: 'G1-M-004', questionText: 'الكفة اليمنى أثقل. ماذا يحدث لها؟', options: ['ترتفع', 'تنزل', 'تبقى', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الكفة الأثقل تنزل' },
  { id: 'AQ-168', grade: 1, semester: 2, skillId: 'G1-M-004', questionText: 'كتاب يزن 5 مكعبات ودفتر يزن 3 مكعبات. أيهما أثقل؟', options: ['الدفتر', 'الكتاب', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '5 > 3، الكتاب أثقل' },

  // G1-D-004: مخطط كارول
  { id: 'AQ-169', grade: 1, semester: 2, skillId: 'G1-D-004', questionText: 'في مخطط كارول نصنف الأشياء إلى:', options: ['مجموعة واحدة', 'مجموعتين أو أكثر حسب صفات', 'دائرة', 'خط'], correctAnswer: 1, difficulty: 'easy', explanation: 'مخطط كارول يصنف حسب صفات (نعم/لا)' },
  { id: 'AQ-170', grade: 1, semester: 2, skillId: 'G1-D-004', questionText: 'صنّف: مربع أحمر. أين يوضع في مخطط كارول (أحمر/غير أحمر، مربع/غير مربع)؟', options: ['أحمر + مربع', 'أحمر + غير مربع', 'غير أحمر + مربع', 'غير أحمر + غير مربع'], correctAnswer: 0, difficulty: 'medium', explanation: 'المربع الأحمر يوضع في خانة: أحمر + مربع' },
  { id: 'AQ-171', grade: 1, semester: 2, skillId: 'G1-D-004', questionText: 'دائرة زرقاء. أين توضع؟ (أحمر/غير أحمر، مربع/غير مربع)', options: ['أحمر + مربع', 'أحمر + غير مربع', 'غير أحمر + مربع', 'غير أحمر + غير مربع'], correctAnswer: 3, difficulty: 'medium', explanation: 'دائرة زرقاء = غير أحمر + غير مربع' },

  // G2-N-016: الأعداد الزوجية والفردية (الصف الثاني)
  { id: 'AQ-172', grade: 2, semester: 2, skillId: 'G2-N-016', questionText: 'أي عدد زوجي؟', options: ['13', '27', '34', '41'], correctAnswer: 2, difficulty: 'easy', explanation: '34 عدد زوجي (ينتهي بـ 4)' },
  { id: 'AQ-173', grade: 2, semester: 2, skillId: 'G2-N-016', questionText: 'أي عدد فردي؟', options: ['22', '48', '55', '60'], correctAnswer: 2, difficulty: 'easy', explanation: '55 عدد فردي (ينتهي بـ 5)' },
  { id: 'AQ-174', grade: 2, semester: 2, skillId: 'G2-N-016', questionText: 'العدد 46 هو:', options: ['فردي', 'زوجي', 'ليس فردياً ولا زوجياً', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '46 ينتهي بـ 6 فهو زوجي' },
  { id: 'AQ-175', grade: 2, semester: 2, skillId: 'G2-N-016', questionText: 'ما العدد الزوجي التالي بعد 38؟', options: ['39', '40', '41', '42'], correctAnswer: 1, difficulty: 'medium', explanation: 'العدد الزوجي التالي بعد 38 هو 40' },
  { id: 'AQ-176', grade: 2, semester: 2, skillId: 'G2-N-016', questionText: 'مجموع عددين فرديين يكون:', options: ['فردي دائماً', 'زوجي دائماً', 'أحياناً فردي', 'لا أعرف'], correctAnswer: 1, difficulty: 'hard', explanation: 'مجموع عددين فرديين دائماً زوجي (مثل 3+5=8)' },

  // G2-C-009: التساوي/التكافؤ (آلة التساوي)
  { id: 'AQ-177', grade: 2, semester: 1, skillId: 'G2-C-009', questionText: 'أكمل: 5 + 3 = __ + 4', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'medium', explanation: '5 + 3 = 8 و 4 + 4 = 8' },
  { id: 'AQ-178', grade: 2, semester: 1, skillId: 'G2-C-009', questionText: 'هل 7 + 2 = 4 + 5 صحيح؟', options: ['نعم', 'لا', 'أحياناً', 'لا أعرف'], correctAnswer: 0, difficulty: 'easy', explanation: '7 + 2 = 9 و 4 + 5 = 9، نعم متساويان' },
  { id: 'AQ-179', grade: 2, semester: 1, skillId: 'G2-C-009', questionText: 'أكمل: 10 - 3 = __ + 2', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'hard', explanation: '10 - 3 = 7 و 5 + 2 = 7' },
  { id: 'AQ-180', grade: 2, semester: 1, skillId: 'G2-C-009', questionText: 'أي معادلة صحيحة؟', options: ['3 + 4 = 2 + 6', '3 + 4 = 2 + 5', '3 + 4 = 1 + 5', '3 + 4 = 3 + 5'], correctAnswer: 1, difficulty: 'medium', explanation: '3 + 4 = 7 و 2 + 5 = 7' },

  // G2-D-001: قراءة البيانات المصورة (more questions)
  { id: 'AQ-181', grade: 2, semester: 2, skillId: 'G2-D-001', questionText: 'في مخطط صوري: 🍎🍎🍎 و 🍊🍊🍊🍊🍊. أيهما أكثر؟', options: ['التفاح', 'البرتقال', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'البرتقال (5) أكثر من التفاح (3)' },
  { id: 'AQ-182', grade: 2, semester: 2, skillId: 'G2-D-001', questionText: 'كم الفرق بين 🍎🍎🍎 و 🍊🍊🍊🍊🍊؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'medium', explanation: '5 - 3 = 2' },

  // G2-M-005: قياس السعة باللتر (more questions)
  { id: 'AQ-183', grade: 2, semester: 2, skillId: 'G2-M-005', questionText: 'كم كوباً يملأ لتراً واحداً تقريباً؟', options: ['2', '4', '6', '10'], correctAnswer: 1, difficulty: 'medium', explanation: 'اللتر يساوي تقريباً 4 أكواب' },
  { id: 'AQ-184', grade: 2, semester: 2, skillId: 'G2-M-005', questionText: 'أيهما سعته أكبر: الكوب أم الدلو؟', options: ['الكوب', 'الدلو', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: 'الدلو سعته أكبر بكثير من الكوب' },
  { id: 'AQ-185', grade: 2, semester: 2, skillId: 'G2-M-005', questionText: '3 لترات = كم نصف لتر؟', options: ['3', '4', '6', '9'], correctAnswer: 2, difficulty: 'hard', explanation: '3 لترات = 6 أنصاف لتر' },
];