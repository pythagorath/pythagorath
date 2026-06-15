// Core Learning Quality Sprint - Expanded Question Bank
// 10-20 questions per skill, multiple visual types, easy/medium/hard + remedial/retention
import type { Question } from './mathSkillsData';

export const sprintQuestions: Question[] = [
  // ===== G1-N-001: العد من 1 إلى 5 =====
  { id: 'SQ-001', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم تفاحة في الصورة؟ 🍎🍎🍎', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'عدّ التفاحات: 1، 2، 3', visualType: 'counting-objects', visualData: { objects: 'apple', count: 3 } },
  { id: 'SQ-002', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم نجمة؟ ⭐⭐⭐⭐⭐', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'عدّ النجوم: 1، 2، 3، 4، 5', visualType: 'counting-objects', visualData: { objects: 'star', count: 5 } },
  { id: 'SQ-003', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'أشر إلى العدد الذي يمثل: 🐟🐟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: 'يوجد سمكتان، العدد هو 2', visualType: 'counting-objects', visualData: { objects: 'fish', count: 2 } },
  { id: 'SQ-004', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'رتّب: أيهما أكثر؟ 🔵🔵 أم 🔵🔵🔵🔵', options: ['المجموعة الأولى', 'المجموعة الثانية', 'متساويتان', 'لا أعرف'], correctAnswer: 1, difficulty: 'medium', explanation: '4 أكثر من 2', visualType: 'counting-objects', visualData: { objects: 'circle', count: 4, comparison: 2 } },
  { id: 'SQ-005', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم إصبعاً في يد واحدة؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'في اليد الواحدة 5 أصابع' },
  { id: 'SQ-006', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'ما العدد الذي يأتي بعد 3؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'medium', explanation: 'بعد 3 يأتي 4', visualType: 'number-line', visualData: { min: 1, max: 5, highlight: 3, showNext: true } },
  { id: 'SQ-007', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'ما العدد الذي يأتي قبل 5؟', options: ['2', '3', '4', '6'], correctAnswer: 2, difficulty: 'medium', explanation: 'قبل 5 يأتي 4', visualType: 'number-line', visualData: { min: 1, max: 5, highlight: 5, showPrev: true } },
  { id: 'SQ-008', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم قطة؟ 🐱', options: ['0', '1', '2', '3'], correctAnswer: 1, difficulty: 'easy', explanation: 'يوجد قطة واحدة فقط', visualType: 'counting-objects', visualData: { objects: 'cat', count: 1 } },
  { id: 'SQ-009', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'عدّ بالترتيب: 1، 2، __، 4، 5', options: ['0', '3', '5', '6'], correctAnswer: 1, difficulty: 'medium', explanation: 'الترتيب: 1، 2، 3، 4، 5' },
  { id: 'SQ-010', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'كم كرة حمراء؟ 🔴🔴🔴🔴', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'easy', explanation: 'عدّ الكرات: 1، 2، 3، 4', visualType: 'counting-objects', visualData: { objects: 'ball', count: 4, color: 'red' } },
  { id: 'SQ-011', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: '(مراجعة) أكمل: 1، __، 3، 4، 5', options: ['0', '2', '4', '6'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد المفقود هو 2' },
  { id: 'SQ-012', grade: 1, semester: 1, skillId: 'G1-N-001', questionText: 'ضع الأعداد بالترتيب من الأصغر: 4، 1، 3، 2، 5', options: ['1، 2، 3، 4، 5', '5، 4، 3، 2، 1', '2، 3، 4، 5، 1', '1، 3، 2، 4، 5'], correctAnswer: 0, difficulty: 'hard', explanation: 'الترتيب التصاعدي: 1، 2، 3، 4، 5' },

  // ===== G1-N-002: العد من 1 إلى 10 =====
  { id: 'SQ-013', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'كم نقطة؟ ⚫⚫⚫⚫⚫⚫⚫', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', explanation: 'عدّ النقاط: 7 نقاط', visualType: 'counting-objects', visualData: { objects: 'dot', count: 7 } },
  { id: 'SQ-014', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما العدد الذي يأتي بعد 7؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', explanation: 'بعد 7 يأتي 8', visualType: 'number-line', visualData: { min: 1, max: 10, highlight: 7 } },
  { id: 'SQ-015', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما العدد الذي يأتي قبل 10؟', options: ['7', '8', '9', '11'], correctAnswer: 2, difficulty: 'easy', explanation: 'قبل 10 يأتي 9' },
  { id: 'SQ-016', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'أكمل: 5، 6، __، 8، 9', options: ['4', '7', '10', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'العدد المفقود هو 7' },
  { id: 'SQ-017', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'كم وردة؟ 🌹🌹🌹🌹🌹🌹🌹🌹🌹', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'medium', explanation: 'عدّ الورود: 9 وردات', visualType: 'counting-objects', visualData: { objects: 'flower', count: 9 } },
  { id: 'SQ-018', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'عدّ تنازلياً: 10، 9، 8، __', options: ['6', '7', '5', '11'], correctAnswer: 1, difficulty: 'medium', explanation: 'العد التنازلي: 10، 9، 8، 7' },
  { id: 'SQ-019', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما أكبر عدد من هذه الأعداد: 3، 8، 5، 1؟', options: ['3', '5', '8', '1'], correctAnswer: 2, difficulty: 'medium', explanation: '8 هو أكبر عدد' },
  { id: 'SQ-020', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'ما أصغر عدد من: 6، 2، 9، 4؟', options: ['6', '2', '9', '4'], correctAnswer: 1, difficulty: 'medium', explanation: '2 هو أصغر عدد' },
  { id: 'SQ-021', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'كم عدد أصابع اليدين معاً؟', options: ['5', '8', '10', '12'], correctAnswer: 2, difficulty: 'easy', explanation: '5 + 5 = 10 أصابع' },
  { id: 'SQ-022', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: 'أكمل العد: 1، 2، 3، __، __، 6', options: ['4، 5', '5، 4', '3، 4', '4، 6'], correctAnswer: 0, difficulty: 'hard', explanation: 'الترتيب: 1، 2، 3، 4، 5، 6' },
  { id: 'SQ-023', grade: 1, semester: 1, skillId: 'G1-N-002', questionText: '(تثبيت) رتّب تنازلياً: 3، 7، 1، 10، 5', options: ['10، 7، 5، 3، 1', '1، 3، 5، 7، 10', '7، 10، 5، 3، 1', '10، 5، 7، 3، 1'], correctAnswer: 0, difficulty: 'hard', explanation: 'الترتيب التنازلي: 10، 7، 5، 3، 1' },

  // ===== G1-N-005: مطابقة العدد بالكمية =====
  { id: 'SQ-024', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'أي صورة تمثل العدد 6؟', options: ['🍎🍎🍎🍎', '🍎🍎🍎🍎🍎🍎', '🍎🍎🍎🍎🍎🍎🍎🍎', '🍎🍎🍎'], correctAnswer: 1, difficulty: 'easy', explanation: '6 تفاحات تمثل العدد 6', visualType: 'counting-objects', visualData: { objects: 'apple', count: 6 } },
  { id: 'SQ-025', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'طابق: العدد 4 يساوي كم؟', options: ['🟡🟡🟡', '🟡🟡🟡🟡', '🟡🟡🟡🟡🟡', '🟡🟡'], correctAnswer: 1, difficulty: 'easy', explanation: '4 دوائر تمثل العدد 4', visualType: 'counting-objects', visualData: { objects: 'circle', count: 4 } },
  { id: 'SQ-026', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'كم عنصراً يمثل العدد 9؟', options: ['7 عناصر', '8 عناصر', '9 عناصر', '10 عناصر'], correctAnswer: 2, difficulty: 'easy', explanation: 'العدد 9 يمثل 9 عناصر' },
  { id: 'SQ-027', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'أي عدد يمثل هذه المجموعة: 🌟🌟🌟🌟🌟🌟🌟🌟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'medium', explanation: 'عدّ النجوم: 8 نجوم', visualType: 'counting-objects', visualData: { objects: 'star', count: 8 } },
  { id: 'SQ-028', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'ارسم 5 دوائر. كم دائرة رسمت؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: 'رسمنا 5 دوائر بالضبط' },
  { id: 'SQ-029', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'المعلمة قالت "أعطني 7 مكعبات". كم مكعب تحتاج؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: 'المطلوب 7 مكعبات' },
  { id: 'SQ-030', grade: 1, semester: 1, skillId: 'G1-N-005', questionText: 'في الصف 10 طلاب. غاب 3. كم طالب حاضر؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'hard', explanation: '10 - 3 = 7 طلاب حاضرين' },

  // ===== G1-N-006: المقارنة بين الكميات =====
  { id: 'SQ-031', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'أيهما أكثر: 🔴🔴🔴 أم 🔵🔵🔵🔵🔵؟', options: ['الحمراء أكثر', 'الزرقاء أكثر', 'متساويتان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '5 أكثر من 3، الزرقاء أكثر' },
  { id: 'SQ-032', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'قارن: 8 __ 5', options: ['أكبر من', 'أصغر من', 'يساوي', 'لا أعرف'], correctAnswer: 0, difficulty: 'easy', explanation: '8 أكبر من 5' },
  { id: 'SQ-033', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'أي مجموعة أقل: 🍎🍎🍎🍎🍎🍎 أم 🍊🍊🍊🍊؟', options: ['التفاح', 'البرتقال', 'متساويتان', 'لا يمكن المقارنة'], correctAnswer: 1, difficulty: 'easy', explanation: '4 أقل من 6، البرتقال أقل' },
  { id: 'SQ-034', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'رتّب من الأصغر: 7، 3، 9', options: ['3، 7، 9', '9، 7، 3', '7، 3، 9', '3، 9، 7'], correctAnswer: 0, difficulty: 'medium', explanation: 'من الأصغر للأكبر: 3، 7، 9' },
  { id: 'SQ-035', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'أحمد عنده 6 كرات وسالم عنده 6 كرات. من عنده أكثر؟', options: ['أحمد', 'سالم', 'متساويان', 'لا أعرف'], correctAnswer: 2, difficulty: 'medium', explanation: '6 = 6، عندهما نفس العدد' },
  { id: 'SQ-036', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'ما العدد الأكبر: 2، 8، 4، 6؟', options: ['2', '4', '6', '8'], correctAnswer: 3, difficulty: 'easy', explanation: '8 هو أكبر عدد' },
  { id: 'SQ-037', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: 'ضع إشارة المقارنة: 3 __ 3', options: ['>', '<', '=', '≠'], correctAnswer: 2, difficulty: 'medium', explanation: '3 يساوي 3' },
  { id: 'SQ-038', grade: 1, semester: 1, skillId: 'G1-N-006', questionText: '(تثبيت) رتّب تصاعدياً: 10، 2، 7، 5، 1', options: ['1، 2، 5، 7، 10', '10، 7، 5، 2، 1', '2، 5، 7، 10، 1', '1، 5، 2، 7، 10'], correctAnswer: 0, difficulty: 'hard', explanation: 'الترتيب التصاعدي: 1، 2، 5، 7، 10' },

  // ===== G1-N-012: الجمع ضمن 10 =====
  { id: 'SQ-039', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '3 + 2 = ؟', options: ['4', '5', '6', '7'], correctAnswer: 1, difficulty: 'easy', explanation: '3 + 2 = 5', visualType: 'counting-objects', visualData: { objects: 'block', groups: [3, 2] } },
  { id: 'SQ-040', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '4 + 4 = ؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', explanation: '4 + 4 = 8' },
  { id: 'SQ-041', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '6 + 3 = ؟', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'easy', explanation: '6 + 3 = 9', visualType: 'number-line', visualData: { min: 0, max: 10, start: 6, jump: 3 } },
  { id: 'SQ-042', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '5 + 5 = ؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'easy', explanation: '5 + 5 = 10' },
  { id: 'SQ-043', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '7 + 2 = ؟', options: ['8', '9', '10', '11'], correctAnswer: 1, difficulty: 'easy', explanation: '7 + 2 = 9' },
  { id: 'SQ-044', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'عندي 4 تفاحات وأعطتني أمي 3. كم صار عندي؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: '4 + 3 = 7 تفاحات' },
  { id: 'SQ-045', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '__ + 3 = 8. ما العدد المفقود؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'medium', explanation: '5 + 3 = 8' },
  { id: 'SQ-046', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '2 + __ = 9. ما العدد المفقود؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'hard', explanation: '2 + 7 = 9' },
  { id: 'SQ-047', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: 'في الحافلة 6 ركاب. صعد 4. كم أصبح العدد؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'medium', explanation: '6 + 4 = 10 ركاب' },
  { id: 'SQ-048', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '(علاجي) 1 + 1 = ؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: '1 + 1 = 2. الجمع يعني نضيف' },
  { id: 'SQ-049', grade: 1, semester: 2, skillId: 'G1-N-012', questionText: '(تثبيت) 3 + 4 = 4 + ؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'hard', explanation: '3 + 4 = 7 و 4 + 3 = 7. خاصية التبديل' },

  // ===== G1-N-013: الطرح ضمن 10 =====
  { id: 'SQ-050', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '5 - 2 = ؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: '5 - 2 = 3', visualType: 'counting-objects', visualData: { objects: 'block', count: 5, remove: 2 } },
  { id: 'SQ-051', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '8 - 3 = ؟', options: ['4', '5', '6', '7'], correctAnswer: 1, difficulty: 'easy', explanation: '8 - 3 = 5' },
  { id: 'SQ-052', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '10 - 4 = ؟', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', explanation: '10 - 4 = 6', visualType: 'number-line', visualData: { min: 0, max: 10, start: 10, jump: -4 } },
  { id: 'SQ-053', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '7 - 7 = ؟', options: ['0', '1', '7', '14'], correctAnswer: 0, difficulty: 'medium', explanation: '7 - 7 = 0. أي عدد ناقص نفسه = صفر' },
  { id: 'SQ-054', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'عندي 9 حلويات. أكلت 4. كم بقي؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'medium', explanation: '9 - 4 = 5 حلويات' },
  { id: 'SQ-055', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '6 - __ = 2. ما العدد المفقود؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'hard', explanation: '6 - 4 = 2' },
  { id: 'SQ-056', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '(علاجي) 3 - 1 = ؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: '3 - 1 = 2. الطرح يعني نأخذ' },
  { id: 'SQ-057', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '10 - 5 = ؟', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', explanation: '10 - 5 = 5' },
  { id: 'SQ-058', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: 'كان في الحديقة 8 طيور. طار 5. كم بقي؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'medium', explanation: '8 - 5 = 3 طيور' },
  { id: 'SQ-059', grade: 1, semester: 2, skillId: 'G1-N-013', questionText: '(تثبيت) إذا 4 + 6 = 10، فكم 10 - 6؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'hard', explanation: '10 - 6 = 4. الطرح عكس الجمع' },

  // ===== G1-G-001: التعرف على الأشكال البسيطة =====
  { id: 'SQ-060', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'ما اسم هذا الشكل: ◻️؟', options: ['مثلث', 'مربع', 'دائرة', 'مستطيل'], correctAnswer: 1, difficulty: 'easy', explanation: 'هذا شكل مربع - له 4 أضلاع متساوية', visualType: 'shapes', visualData: { shape: 'square' } },
  { id: 'SQ-061', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'كم ضلع للمثلث؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'المثلث له 3 أضلاع', visualType: 'shapes', visualData: { shape: 'triangle' } },
  { id: 'SQ-062', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل ليس له أضلاع؟', options: ['المربع', 'المثلث', 'الدائرة', 'المستطيل'], correctAnswer: 2, difficulty: 'easy', explanation: 'الدائرة ليس لها أضلاع' },
  { id: 'SQ-063', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'ما الفرق بين المربع والمستطيل؟', options: ['المربع أكبر', 'المربع أضلاعه متساوية', 'المستطيل له 3 أضلاع', 'لا فرق'], correctAnswer: 1, difficulty: 'medium', explanation: 'المربع أضلاعه الأربعة متساوية، المستطيل ضلعان طويلان وضلعان قصيران' },
  { id: 'SQ-064', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل يشبه الباب؟', options: ['دائرة', 'مثلث', 'مستطيل', 'مربع'], correctAnswer: 2, difficulty: 'easy', explanation: 'الباب يشبه المستطيل' },
  { id: 'SQ-065', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'أي شكل يشبه العجلة؟', options: ['مربع', 'مثلث', 'مستطيل', 'دائرة'], correctAnswer: 3, difficulty: 'easy', explanation: 'العجلة دائرية الشكل' },
  { id: 'SQ-066', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: 'كم زاوية في المربع؟', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'medium', explanation: 'المربع له 4 زوايا' },
  { id: 'SQ-067', grade: 1, semester: 1, skillId: 'G1-G-001', questionText: '(تثبيت) أي شكل له أقل عدد من الأضلاع؟', options: ['المربع', 'المثلث', 'المستطيل', 'السداسي'], correctAnswer: 1, difficulty: 'medium', explanation: 'المثلث له 3 أضلاع وهو الأقل' },

  // ===== G1-T-001: قراءة الوقت بالساعة =====
  { id: 'SQ-068', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'العقرب الصغير على 3 والكبير على 12. كم الساعة؟', options: ['الساعة 3', 'الساعة 12', 'الساعة 6', 'الساعة 9'], correctAnswer: 0, difficulty: 'easy', explanation: 'العقرب الصغير يشير للساعة، والكبير على 12 يعني تماماً', visualType: 'analog-clock', visualData: { hour: 3, minute: 0 } },
  { id: 'SQ-069', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'الساعة 7 تماماً. أين يكون العقرب الكبير؟', options: ['على 3', 'على 6', 'على 9', 'على 12'], correctAnswer: 3, difficulty: 'easy', explanation: 'عندما تكون الساعة تماماً، العقرب الكبير على 12', visualType: 'analog-clock', visualData: { hour: 7, minute: 0 } },
  { id: 'SQ-070', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'أي ساعة تُظهر الساعة 5؟', options: ['العقرب الصغير على 5 والكبير على 12', 'العقرب الكبير على 5', 'العقرب الصغير على 12', 'العقرب الكبير على 6'], correctAnswer: 0, difficulty: 'medium', explanation: 'الساعة 5: العقرب الصغير على 5 والكبير على 12', visualType: 'analog-clock', visualData: { hour: 5, minute: 0 } },
  { id: 'SQ-071', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'ما الفرق بين العقرب الصغير والكبير؟', options: ['الصغير للدقائق', 'الكبير للساعات', 'الصغير للساعات والكبير للدقائق', 'لا فرق'], correctAnswer: 2, difficulty: 'medium', explanation: 'العقرب الصغير يشير للساعة، والكبير يشير للدقائق' },
  { id: 'SQ-072', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: 'متى تذهب للمدرسة عادة؟', options: ['الساعة 2 ظهراً', 'الساعة 7 صباحاً', 'الساعة 10 مساءً', 'الساعة 12 ليلاً'], correctAnswer: 1, difficulty: 'easy', explanation: 'نذهب للمدرسة صباحاً حوالي الساعة 7' },
  { id: 'SQ-073', grade: 1, semester: 1, skillId: 'G1-T-001', questionText: '(تثبيت) العقرب الصغير بين 8 و 9. ماذا يعني؟', options: ['الساعة 8 ونصف تقريباً', 'الساعة 9', 'الساعة 8 تماماً', 'الساعة 12'], correctAnswer: 0, difficulty: 'hard', explanation: 'إذا كان العقرب الصغير بين رقمين، فالساعة بينهما' },

  // ===== G1-T-002: التعرف على النقود العمانية =====
  { id: 'SQ-074', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'ما أصغر عملة ورقية عمانية؟', options: ['100 بيسة', '200 بيسة', 'ريال', '500 بيسة'], correctAnswer: 0, difficulty: 'easy', explanation: 'أصغر عملة ورقية هي 100 بيسة', visualType: 'coins', visualData: { coins: ['100b'] } },
  { id: 'SQ-075', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'كم بيسة في الريال الواحد؟', options: ['10', '100', '500', '1000'], correctAnswer: 3, difficulty: 'medium', explanation: 'الريال الواحد = 1000 بيسة', visualType: 'coins', visualData: { coins: ['1r'] } },
  { id: 'SQ-076', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'أي عملة أكبر قيمة: 200 بيسة أم 500 بيسة؟', options: ['200 بيسة', '500 بيسة', 'متساويتان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '500 بيسة أكبر من 200 بيسة' },
  { id: 'SQ-077', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'معي 100 بيسة + 100 بيسة. كم معي؟', options: ['100 بيسة', '200 بيسة', '300 بيسة', '1000 بيسة'], correctAnswer: 1, difficulty: 'medium', explanation: '100 + 100 = 200 بيسة', visualType: 'coins', visualData: { coins: ['100b', '100b'] } },
  { id: 'SQ-078', grade: 1, semester: 1, skillId: 'G1-T-002', questionText: 'هل يمكنني شراء شيء بـ 500 بيسة إذا ثمنه ريال؟', options: ['نعم', 'لا، أحتاج أكثر', 'ربما', 'لا أعرف'], correctAnswer: 1, difficulty: 'hard', explanation: '500 بيسة أقل من ريال (1000 بيسة)، لا تكفي' },

  // ===== G1-P-001: استكمال النمط =====
  { id: 'SQ-079', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل النمط: 🔴🔵🔴🔵🔴__', options: ['🔴', '🔵', '🟡', '🟢'], correctAnswer: 1, difficulty: 'easy', explanation: 'النمط يتكرر: أحمر، أزرق. التالي أزرق', visualType: 'pattern', visualData: { pattern: ['red', 'blue'], repeat: 3 } },
  { id: 'SQ-080', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل: 1، 2، 1، 2، 1، __', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: 'النمط: 1، 2 يتكرر. التالي 2' },
  { id: 'SQ-081', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل: ▲●▲●▲__', options: ['▲', '●', '■', '◆'], correctAnswer: 1, difficulty: 'easy', explanation: 'النمط: مثلث، دائرة يتكرر', visualType: 'pattern', visualData: { pattern: ['triangle', 'circle'], repeat: 3 } },
  { id: 'SQ-082', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل: 🔴🔴🔵🔴🔴🔵🔴🔴__', options: ['🔴', '🔵', '🟡', '🟢'], correctAnswer: 1, difficulty: 'medium', explanation: 'النمط: أحمر، أحمر، أزرق يتكرر' },
  { id: 'SQ-083', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'أكمل العد: 2، 4، 6، 8، __', options: ['9', '10', '11', '12'], correctAnswer: 1, difficulty: 'medium', explanation: 'العد بالاثنينات: 2، 4، 6، 8، 10' },
  { id: 'SQ-084', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: 'ما النمط في: كبير، صغير، كبير، صغير؟', options: ['يتكرر كل 2', 'يتكرر كل 3', 'لا يوجد نمط', 'يتكرر كل 4'], correctAnswer: 0, difficulty: 'medium', explanation: 'النمط يتكرر كل عنصرين: كبير، صغير' },
  { id: 'SQ-085', grade: 1, semester: 1, skillId: 'G1-P-001', questionText: '(تثبيت) أكمل: 5، 10، 15، 20، __', options: ['22', '23', '25', '30'], correctAnswer: 2, difficulty: 'hard', explanation: 'العد بالخمسات: 5، 10، 15، 20، 25' },

  // ===== G2-C-001: الجمع ضمن 20 =====
  { id: 'SQ-086', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '8 + 7 = ؟', options: ['13', '14', '15', '16'], correctAnswer: 2, difficulty: 'easy', explanation: '8 + 7 = 15', visualType: 'number-line', visualData: { min: 0, max: 20, start: 8, jump: 7 } },
  { id: 'SQ-087', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '9 + 6 = ؟', options: ['13', '14', '15', '16'], correctAnswer: 2, difficulty: 'easy', explanation: '9 + 6 = 15' },
  { id: 'SQ-088', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '12 + 5 = ؟', options: ['15', '16', '17', '18'], correctAnswer: 2, difficulty: 'easy', explanation: '12 + 5 = 17' },
  { id: 'SQ-089', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '7 + 8 + 2 = ؟', options: ['15', '16', '17', '18'], correctAnswer: 2, difficulty: 'medium', explanation: '7 + 8 = 15، ثم 15 + 2 = 17' },
  { id: 'SQ-090', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: 'في الصف 11 ولد و 8 بنات. كم طالباً؟', options: ['17', '18', '19', '20'], correctAnswer: 2, difficulty: 'medium', explanation: '11 + 8 = 19 طالباً' },
  { id: 'SQ-091', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '__ + 9 = 16. ما العدد؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'hard', explanation: '7 + 9 = 16' },
  { id: 'SQ-092', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '6 + 6 + 6 = ؟', options: ['12', '16', '18', '20'], correctAnswer: 2, difficulty: 'hard', explanation: '6 + 6 = 12، ثم 12 + 6 = 18' },
  { id: 'SQ-093', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '(علاجي) 10 + 3 = ؟', options: ['11', '12', '13', '14'], correctAnswer: 2, difficulty: 'easy', explanation: '10 + 3 = 13. نبدأ من 10 ونعد 3' },
  { id: 'SQ-094', grade: 2, semester: 1, skillId: 'G2-C-001', questionText: '(تثبيت) إذا 8 + 5 = 13، فكم 5 + 8؟', options: ['11', '12', '13', '14'], correctAnswer: 2, difficulty: 'medium', explanation: '5 + 8 = 13 أيضاً. خاصية التبديل' },

  // ===== G2-C-002: الطرح ضمن 20 =====
  { id: 'SQ-095', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '15 - 7 = ؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', explanation: '15 - 7 = 8', visualType: 'number-line', visualData: { min: 0, max: 20, start: 15, jump: -7 } },
  { id: 'SQ-096', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '18 - 9 = ؟', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'easy', explanation: '18 - 9 = 9' },
  { id: 'SQ-097', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '20 - 8 = ؟', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'easy', explanation: '20 - 8 = 12' },
  { id: 'SQ-098', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: 'كان عندي 16 قلماً. أعطيت صديقي 9. كم بقي؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: '16 - 9 = 7 أقلام' },
  { id: 'SQ-099', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '14 - __ = 6. ما العدد؟', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'hard', explanation: '14 - 8 = 6' },
  { id: 'SQ-100', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '(علاجي) 13 - 3 = ؟', options: ['8', '9', '10', '11'], correctAnswer: 2, difficulty: 'easy', explanation: '13 - 3 = 10' },
  { id: 'SQ-101', grade: 2, semester: 1, skillId: 'G2-C-002', questionText: '(تثبيت) إذا 7 + 9 = 16، فكم 16 - 9؟', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'medium', explanation: '16 - 9 = 7. الطرح عكس الجمع' },

  // ===== G2-N-001: قراءة الأعداد حتى 100 =====
  { id: 'SQ-102', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'ما قراءة العدد 47؟', options: ['أربعة وسبعون', 'سبعة وأربعون', 'أربعة وأربعون', 'سبعة وسبعون'], correctAnswer: 1, difficulty: 'easy', explanation: '47 = سبعة وأربعون' },
  { id: 'SQ-103', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'كم عشرة في العدد 63؟', options: ['3', '6', '9', '63'], correctAnswer: 1, difficulty: 'easy', explanation: '63 = 6 عشرات و 3 آحاد' },
  { id: 'SQ-104', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'ما العدد: 8 عشرات و 5 آحاد؟', options: ['58', '85', '80', '53'], correctAnswer: 1, difficulty: 'medium', explanation: '8 عشرات + 5 آحاد = 85' },
  { id: 'SQ-105', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'أي عدد يقع بين 50 و 60؟', options: ['49', '55', '61', '45'], correctAnswer: 1, difficulty: 'easy', explanation: '55 يقع بين 50 و 60' },
  { id: 'SQ-106', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'ما العدد الذي يأتي بعد 99؟', options: ['98', '100', '101', '90'], correctAnswer: 1, difficulty: 'medium', explanation: 'بعد 99 يأتي 100' },
  { id: 'SQ-107', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: 'كم آحاد في العدد 71؟', options: ['1', '7', '8', '71'], correctAnswer: 0, difficulty: 'easy', explanation: '71 = 7 عشرات و 1 آحاد' },
  { id: 'SQ-108', grade: 2, semester: 1, skillId: 'G2-N-001', questionText: '(تثبيت) 5 عشرات + 0 آحاد = ؟', options: ['5', '50', '500', '55'], correctAnswer: 1, difficulty: 'medium', explanation: '5 عشرات + 0 آحاد = 50' },

  // ===== G2-N-007: مقارنة الأعداد حتى 100 =====
  { id: 'SQ-109', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'أيهما أكبر: 45 أم 54؟', options: ['45', '54', 'متساويان', 'لا أعرف'], correctAnswer: 1, difficulty: 'easy', explanation: '54 أكبر من 45' },
  { id: 'SQ-110', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'ضع الإشارة: 78 __ 87', options: ['>', '<', '=', '≠'], correctAnswer: 1, difficulty: 'easy', explanation: '78 أصغر من 87' },
  { id: 'SQ-111', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'رتّب تصاعدياً: 34، 43، 28، 82', options: ['28، 34، 43، 82', '82، 43، 34، 28', '34، 28، 43، 82', '28، 43، 34، 82'], correctAnswer: 0, difficulty: 'medium', explanation: 'من الأصغر: 28، 34، 43، 82' },
  { id: 'SQ-112', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'ما أكبر عدد مكون من رقمين؟', options: ['90', '99', '100', '98'], correctAnswer: 1, difficulty: 'medium', explanation: '99 هو أكبر عدد مكون من رقمين' },
  { id: 'SQ-113', grade: 2, semester: 1, skillId: 'G2-N-007', questionText: 'أي عدد أقرب لـ 50: العدد 47 أم 53؟', options: ['47', '53', 'متساويان', 'لا أعرف'], correctAnswer: 0, difficulty: 'hard', explanation: '47 أقرب (الفرق 3) بينما 53 (الفرق 3) - متساويان في القرب!' },

  // ===== G2-A-001: فهم المصفوفات =====
  { id: 'SQ-114', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: 'مصفوفة 3 صفوف × 4 أعمدة. كم العدد الكلي؟', options: ['7', '10', '12', '14'], correctAnswer: 2, difficulty: 'easy', explanation: '3 × 4 = 12' },
  { id: 'SQ-115', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: 'صندوق بيض فيه صفان، كل صف 6 بيضات. كم بيضة؟', options: ['8', '10', '12', '14'], correctAnswer: 2, difficulty: 'medium', explanation: '2 × 6 = 12 بيضة' },
  { id: 'SQ-116', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: '5 صفوف × 2 = ؟', options: ['7', '8', '10', '12'], correctAnswer: 2, difficulty: 'easy', explanation: '5 × 2 = 10' },
  { id: 'SQ-117', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: 'كعكات مرتبة: 4 صفوف، 3 في كل صف. اكتب جملة الضرب.', options: ['4 + 3', '4 × 3', '3 + 4 + 3', '4 × 4'], correctAnswer: 1, difficulty: 'medium', explanation: '4 صفوف × 3 = 4 × 3 = 12' },
  { id: 'SQ-118', grade: 2, semester: 1, skillId: 'G2-A-001', questionText: '(تثبيت) 2 × 5 = 5 × ؟', options: ['1', '2', '3', '5'], correctAnswer: 1, difficulty: 'hard', explanation: '2 × 5 = 10 و 5 × 2 = 10. خاصية التبديل' },

  // ===== G2-G-001: التعرف على الأشكال ثنائية الأبعاد =====
  { id: 'SQ-119', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'كم ضلعاً للمخمس؟', options: ['4', '5', '6', '7'], correctAnswer: 1, difficulty: 'easy', explanation: 'المخمس له 5 أضلاع', visualType: 'shapes', visualData: { shape: 'pentagon' } },
  { id: 'SQ-120', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'ما اسم الشكل الذي له 6 أضلاع؟', options: ['مخمس', 'سداسي', 'مثمن', 'مربع'], correctAnswer: 1, difficulty: 'easy', explanation: 'الشكل ذو 6 أضلاع يسمى سداسي' },
  { id: 'SQ-121', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'أي شكل له أضلاع متساوية وزوايا متساوية؟', options: ['المستطيل', 'المثلث', 'المربع', 'شبه المنحرف'], correctAnswer: 2, difficulty: 'medium', explanation: 'المربع أضلاعه وزواياه كلها متساوية' },
  { id: 'SQ-122', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: 'كم زاوية في المثلث؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'المثلث له 3 زوايا' },
  { id: 'SQ-123', grade: 2, semester: 1, skillId: 'G2-G-001', questionText: '(تثبيت) رتّب الأشكال حسب عدد الأضلاع: مثلث، سداسي، مربع', options: ['مثلث، مربع، سداسي', 'سداسي، مربع، مثلث', 'مربع، مثلث، سداسي', 'مثلث، سداسي، مربع'], correctAnswer: 0, difficulty: 'medium', explanation: 'مثلث (3)، مربع (4)، سداسي (6)' },

  // ===== G2-M-001: قياس الطول بالسنتيمتر =====
  { id: 'SQ-124', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'ما وحدة قياس طول القلم؟', options: ['كيلوغرام', 'لتر', 'سنتيمتر', 'ساعة'], correctAnswer: 2, difficulty: 'easy', explanation: 'نقيس الأطوال القصيرة بالسنتيمتر', visualType: 'measurement', visualData: { type: 'ruler', length: 15 } },
  { id: 'SQ-125', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'قلم طوله 12 سم وآخر 8 سم. ما الفرق؟', options: ['2 سم', '3 سم', '4 سم', '5 سم'], correctAnswer: 2, difficulty: 'medium', explanation: '12 - 8 = 4 سم' },
  { id: 'SQ-126', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'أيهما نقيس بالمتر: طول الغرفة أم طول الممحاة؟', options: ['الممحاة', 'الغرفة', 'كلاهما', 'لا شيء'], correctAnswer: 1, difficulty: 'easy', explanation: 'الغرفة طويلة نقيسها بالمتر، الممحاة قصيرة نقيسها بالسنتيمتر' },
  { id: 'SQ-127', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: 'كم سنتيمتراً في المتر الواحد؟', options: ['10', '50', '100', '1000'], correctAnswer: 2, difficulty: 'medium', explanation: 'المتر = 100 سنتيمتر' },
  { id: 'SQ-128', grade: 2, semester: 1, skillId: 'G2-M-001', questionText: '(تثبيت) شريط طوله 20 سم. قصصت 7 سم. كم بقي؟', options: ['11 سم', '12 سم', '13 سم', '14 سم'], correctAnswer: 2, difficulty: 'hard', explanation: '20 - 7 = 13 سم' },

  // ===== G2-F-001: الكسور (نصف وربع) =====
  { id: 'SQ-129', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ما نصف 12؟', options: ['4', '5', '6', '8'], correctAnswer: 2, difficulty: 'easy', explanation: 'نصف 12 = 12 ÷ 2 = 6' },
  { id: 'SQ-130', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ما ربع 20؟', options: ['4', '5', '10', '15'], correctAnswer: 1, difficulty: 'medium', explanation: 'ربع 20 = 20 ÷ 4 = 5' },
  { id: 'SQ-131', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'قسّمت بيتزا إلى نصفين. كم قطعة؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: 'النصف يعني قسمة إلى 2 قطعتين متساويتين' },
  { id: 'SQ-132', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ما نصف 6؟', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', explanation: 'نصف 6 = 3' },
  { id: 'SQ-133', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'ما ربع 8؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'medium', explanation: 'ربع 8 = 8 ÷ 4 = 2' },
  { id: 'SQ-134', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: 'أيهما أكبر: نصف 10 أم ربع 20؟', options: ['نصف 10', 'ربع 20', 'متساويان', 'لا أعرف'], correctAnswer: 2, difficulty: 'hard', explanation: 'نصف 10 = 5، ربع 20 = 5. متساويان!' },
  { id: 'SQ-135', grade: 2, semester: 2, skillId: 'G2-F-001', questionText: '(علاجي) إذا قسمنا 4 تفاحات بالتساوي بين 2، كم لكل واحد؟', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', explanation: '4 ÷ 2 = 2 تفاحتان لكل واحد' },

  // ===== G2-N-003: العد بالاثنينات =====
  { id: 'SQ-136', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'أكمل العد بالاثنينات: 2، 4، 6، __', options: ['7', '8', '9', '10'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالاثنينات: 2، 4، 6، 8' },
  { id: 'SQ-137', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'أكمل: 10، 12، 14، __', options: ['15', '16', '17', '18'], correctAnswer: 1, difficulty: 'easy', explanation: 'العد بالاثنينات: 10، 12، 14، 16' },
  { id: 'SQ-138', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'كم حذاء في 7 أزواج؟', options: ['7', '12', '14', '16'], correctAnswer: 2, difficulty: 'medium', explanation: '7 × 2 = 14 حذاء' },
  { id: 'SQ-139', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: 'هل 15 عدد زوجي؟', options: ['نعم', 'لا', 'أحياناً', 'لا أعرف'], correctAnswer: 1, difficulty: 'medium', explanation: '15 عدد فردي لأنه لا يقبل القسمة على 2 بدون باقي' },
  { id: 'SQ-140', grade: 2, semester: 1, skillId: 'G2-N-003', questionText: '(تثبيت) ما العدد الزوجي بين 17 و 21؟', options: ['17', '18', '19', '21'], correctAnswer: 1, difficulty: 'hard', explanation: '18 و 20 أعداد زوجية. 18 هو الأول بينهما' },
];