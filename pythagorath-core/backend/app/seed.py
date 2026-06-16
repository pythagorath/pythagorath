"""Seed the full Grade-2 arithmetic network (skill_graph_g2_s1, 14 built nodes;
the floor E3/F1 are assumed inputs and NOT built). Questions are the family-
tagged items from question_bank_g2_s1 (multi-part answers adapted to a single
unambiguous value, family preserved). Idempotent.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Grade, Question, Skill, SkillCountry, SkillPrerequisite, Subject, Unit,
)

# (code, name, state, [(family, prompt, answer), ...])  — order = list index
NODES = [
    ("E1", "العدّ من نقطة كيفية", "operational", [
        # single-family generalisation: two STRUCTURALLY different cases —
        # within a decade (no crossing) vs crossing a decade upward.
        ("sequential", "أكمل التتابع (داخل العقد): ٦٣، ٦٤، ٦٥، ؟", "٦٦",
         {"kind": "sequence", "terms": [63, 64, 65]}),
        ("sequential", "أكمل التتابع (يعبر العقد): ٨٨، ٨٩، ؟", "٩٠",
         {"kind": "sequence", "terms": [88, 89]}),
    ]),
    ("E2", "العدّ التنازلي من نقطة كيفية", "operational", [
        # single-family generalisation: simple descent vs crossing a decade DOWN
        # (٤٠→٣٩, tens digit changes) — the harder act.
        ("sequential", "أكمل التنازل (داخل العقد): ٥٧، ٥٦، ؟", "٥٥",
         {"kind": "sequence", "terms": [57, 56]}),
        ("sequential", "أكمل التنازل (يعبر العقد للأسفل): ٤١، ٤٠، ؟", "٣٩",
         {"kind": "sequence", "terms": [41, 40]}),
    ]),
    ("C4", "العدّ بالعشرات", "operational", [
        # sequential → sequence track (continue the regular pattern)
        ("sequential", "أكمل التتابع: ٤٠، ٥٠، ٦٠، ؟", "٧٠",
         {"kind": "sequence", "terms": [40, 50, 60]}),
        ("sequential", "أكمل التتابع: ٧٠، ٨٠، ٩٠، ؟", "١٠٠",
         {"kind": "sequence", "terms": [70, 80, 90]}),
        ("sequential", "أكمل التتابع: ٢٠، ٣٠، ٤٠، ؟", "٥٠",
         {"kind": "sequence", "terms": [20, 30, 40]}),
        ("sequential", "أكمل التتابع تنازلياً: ٨٠، ٧٠، ٦٠، ؟", "٥٠",
         {"kind": "sequence", "terms": [80, 70, 60]}),
        # aggregative → base-ten blocks: build the tens, the value climbs by tens
        ("aggregative", "ابنِ ٦ قضبان عشرة، وشاهد القيمة تتسلّق بالعشرات.", "٦٠",
         {"kind": "base-ten-blocks", "target": 60}),
        ("aggregative", "ابنِ ٨ قضبان عشرة.", "٨٠",
         {"kind": "base-ten-blocks", "target": 80}),
    ]),
    ("C3", "تجميع العشرات (الوحدنة)", "operational", [
        # aggregative → regroup-blocks: BUNDLE ten loose cubes into a rod (value stays)
        ("aggregative", "اربط ١٠ مكعّبات مفردة في قضيب (القيمة تبقى ١٠). كم قضيب؟", "١",
         {"kind": "regroup-blocks", "rods": 0, "cubes": 10, "ask": "tens"}),
        ("aggregative", "لديك ٢٠ مكعّباً مفرداً، اربطها. كم قضيب عشرة؟", "٢",
         {"kind": "regroup-blocks", "rods": 0, "cubes": 20, "ask": "tens"}),
        # decompositional → symbolic unit conversion
        ("decompositional", "١٠ آحاد = ؟ عشرة", "١",
         {"kind": "decomposition", "mode": "unit-convert", "qty": 10, "from": "آحاد", "to": "عشرة", "answer": 1}),
        ("decompositional", "٣ عشرات = ؟ آحاد", "٣٠",
         {"kind": "decomposition", "mode": "unit-convert", "qty": 3, "from": "عشرات", "to": "آحاد", "answer": 30}),
    ]),
    ("C1", "القيمة المكانية", "operational", [
        # aggregative → base-ten blocks: BUILD the number as tens-rods + ones-cubes
        ("aggregative", "ابنِ العدد ٦٣ بالقضبان (عشرات) والمكعّبات (آحاد).", "٦٣",
         {"kind": "base-ten-blocks", "target": 63}),
        ("aggregative", "ابنِ العدد ٥٨ بالقضبان والمكعّبات.", "٥٨",
         {"kind": "base-ten-blocks", "target": 58}),
        # magnitude → number line 0..100 (decade ticks): locate the number's position
        ("magnitude", "على خطّ ٠..١٠٠، انقر أقرب عقد إلى ٤٧.", "٥٠",
         {"kind": "number-line", "min": 0, "max": 100, "step": 10, "target": 47}),
        ("magnitude", "على خطّ ٠..١٠٠، انقر العقد ٨٠.", "٨٠",
         {"kind": "number-line", "min": 0, "max": 100, "step": 10, "target": 80}),
        # decompositional → place-value expansion: split into tens + ones, fill the ones
        ("decompositional", "فكِّك إلى عشرات وآحاد: ٤٧ = ٤٠ + ؟", "٧",
         {"kind": "decomposition", "mode": "expand", "whole": 47, "tens": 40}),
        ("decompositional", "فكِّك: ٥٨ = ٥٠ + ؟", "٨",
         {"kind": "decomposition", "mode": "expand", "whole": 58, "tens": 50}),
        # MERGED N8 (read/write — symbol↔quantity): build the numeral from its quantity.
        ("aggregative", "ابنِ العدد ٢٧ بالقضبان (عشرات) والمكعّبات (آحاد).", "٢٧",
         {"kind": "base-ten-blocks", "target": 27}),
    ]),
    ("B1", "التفكيك غير القياسي", "operational", [
        # aggregative → regroup-blocks: open a ten (value stays the same!), count the ones
        ("aggregative", "٤٧: افتح قضيباً إلى ١٠ آحاد (القيمة تبقى ٤٧). كم الآحاد الآن؟", "١٧",
         {"kind": "regroup-blocks", "rods": 4, "cubes": 7, "ask": "ones"}),
        ("aggregative", "٥٢: افتح قضيباً (القيمة تبقى ٥٢). كم الآحاد الآن؟", "١٢",
         {"kind": "regroup-blocks", "rods": 5, "cubes": 2, "ask": "ones"}),
        # decompositional → non-standard expand (tens part is 30, not 40)
        ("decompositional", "تفكيك غير قياسي: ٤٧ = ٣٠ + ؟", "١٧",
         {"kind": "decomposition", "mode": "expand", "whole": 47, "tens": 30}),
        ("decompositional", "تفكيك غير قياسي: ٦٣ = ٥٠ + ؟", "١٣",
         {"kind": "decomposition", "mode": "expand", "whole": 63, "tens": 50}),
    ]),
    ("B2", "تكوين العشرة", "operational", [
        # aggregative → interactive ten-frame (build & see the overflow)
        ("aggregative", "املأ الإطار: أضِف ٥ نقاط إلى ٨، وشاهد العشرة تكتمل وتفيض.", "١٣",
         {"kind": "ten-frame", "start": 8, "add": 5}),
        ("aggregative", "املأ الإطار: أضِف ٥ نقاط إلى ٧.", "١٢",
         {"kind": "ten-frame", "start": 7, "add": 5}),
        # magnitude → interactive number line (locate where you land)
        ("magnitude", "على الخطّ: ابدأ من ٨، اقفز ٥ — انقر موضع وصولك.", "١٣",
         {"kind": "number-line", "min": 0, "max": 20, "start": 8, "jump": 5}),
        ("magnitude", "على الخطّ: ابدأ من ٧، اقفز ٥ — انقر موضع وصولك.", "١٢",
         {"kind": "number-line", "min": 0, "max": 20, "start": 7, "jump": 5}),
        # decompositional → visual bond (split to complete the ten; fill the missing part)
        ("decompositional", "فكِّك لتُكمل العشرة: ٨ + ٥ = ١٠ + ؟", "٣",
         {"kind": "decomposition", "a": 8, "b": 5, "make": 10}),
        # distinct answer (٥, not ٣) so the child can't memorise one number
        ("decompositional", "فكِّك لتُكمل العشرة: ٩ + ٦ = ١٠ + ؟", "٥",
         {"kind": "decomposition", "a": 9, "b": 6, "make": 10}),
    ]),
    ("B3", "الطرح خلال العشرة", "operational", [
        ("aggregative", "اطرح ٧ من ١٢ بالقضبان: افتح العشرة ثم خذ.", "٥",
         {"kind": "subtract-blocks", "minuend": 12, "subtract": 7}),
        # distinct answer (٦, not ٥); still through-the-ten (٤<٨ ← forces unbundle)
        ("aggregative", "اطرح ٨ من ١٤ بالقضبان (افتح العشرة).", "٦",
         {"kind": "subtract-blocks", "minuend": 14, "subtract": 8}),
        ("magnitude", "على الخطّ: ابدأ من ١٢، اقفز ٧ للخلف.", "٥",
         {"kind": "number-line", "min": 0, "max": 20, "start": 12, "jump": 7, "back": True}),
        ("magnitude", "على الخطّ: ابدأ من ١٥، اقفز ٩ للخلف.", "٦",
         {"kind": "number-line", "min": 0, "max": 20, "start": 15, "jump": 9, "back": True}),
        ("decompositional", "اطرح خلال العشرة: ١٢ − ٧", "٥",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 12, "subtrahend": 7}),
        ("decompositional", "اطرح خلال العشرة: ١٤ − ٦", "٨",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 14, "subtrahend": 6}),
    ]),
    ("B4", "الجمع بلا إعادة تجميع", "operational", [
        # aggregative → base-ten blocks, starting from the first addend, add the second
        ("aggregative", "ابدأ بـ٢٣، أضِف ٤٥ بالقضبان والمكعّبات (بلا تبديل).", "٦٨",
         {"kind": "base-ten-blocks", "start": 23, "add": 45}),
        ("aggregative", "ابدأ بـ٣١، أضِف ٢٧.", "٥٨",
         {"kind": "base-ten-blocks", "start": 31, "add": 27}),
        # magnitude → number line, forward two jumps (no crossing)
        ("magnitude", "على الخطّ: ابدأ من ٢٣، اقفز ٤٥ للأمام.", "٦٨",
         {"kind": "number-line", "min": 0, "max": 80, "start": 23, "jump": 45}),
        ("magnitude", "على الخطّ: ابدأ من ٣١، اقفز ٢٧ للأمام.", "٥٨",
         {"kind": "number-line", "min": 0, "max": 80, "start": 31, "jump": 27}),
        # decompositional → add by place (tens + tens, ones + ones)
        ("decompositional", "اجمع بالخانات: ٢٣ + ٤٥", "٦٨",
         {"kind": "decomposition", "mode": "place-add", "a": 23, "b": 45}),
        ("decompositional", "اجمع بالخانات: ٥٢ + ٣٦", "٨٨",
         {"kind": "decomposition", "mode": "place-add", "a": 52, "b": 36}),
    ]),
    ("B5", "الطرح بلا استلاف", "operational", [
        # aggregative → take-away DIRECTLY (ones suffice, no unbundle needed)
        ("aggregative", "اطرح ٢٤ من ٥٦ بالقضبان (الآحاد تكفي — لا تحتاج فتحاً).", "٣٢",
         {"kind": "subtract-blocks", "minuend": 56, "subtract": 24}),
        ("aggregative", "اطرح ٣٥ من ٦٨ بالقضبان.", "٣٣",
         {"kind": "subtract-blocks", "minuend": 68, "subtract": 35}),
        ("magnitude", "على الخطّ: ابدأ من ٥٦، اقفز ٢٤ للخلف.", "٣٢",
         {"kind": "number-line", "min": 0, "max": 80, "start": 56, "jump": 24, "back": True}),
        ("magnitude", "على الخطّ: ابدأ من ٧٩، اقفز ٤٣ للخلف.", "٣٦",
         {"kind": "number-line", "min": 0, "max": 80, "start": 79, "jump": 43, "back": True}),
        ("decompositional", "اطرح بالخانات: ٥٦ − ٢٤", "٣٢",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 56, "subtrahend": 24}),
        ("decompositional", "اطرح بالخانات: ٨٨ − ٣٥", "٥٣",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 88, "subtrahend": 35}),
        # MERGED F10 (dropped as a node — trivial identities): subtract zero / subtract all,
        # absorbed here as edge items in a subtraction node (no own diagnostic value).
        ("aggregative", "اطرح بالقضبان: ٤٧ − ٠ (طرح الصفر).", "٤٧",
         {"kind": "subtract-blocks", "minuend": 47, "subtract": 0}),
        ("aggregative", "اطرح بالقضبان: ٤٧ − ٤٧ (طرح الكل).", "٠",
         {"kind": "subtract-blocks", "minuend": 47, "subtract": 47}),
    ]),
    ("D1", "الجمع بالعدّ التصاعدي", "operational", [
        # single-family magnitude → generalisation over TWO STRUCTURALLY DIFFERENT
        # cases: counting up WITHIN a decade (no crossing) vs counting up ACROSS a
        # decade. (Not the same act with different numbers — the constitution's rule.)
        ("magnitude", "على الخطّ: ابدأ من ١٣، عُدّ صعوداً ٤ (داخل العقد). أين تقف؟", "١٧",
         {"kind": "number-line", "min": 11, "max": 19, "start": 13, "jump": 4}),
        ("magnitude", "على الخطّ: ابدأ من ٨، عُدّ صعوداً ٥ (تعبر العقد ١٠). أين تقف؟", "١٣",
         {"kind": "number-line", "min": 6, "max": 15, "start": 8, "jump": 5}),
    ]),
    ("D2", "الطرح بالعدّ التنازلي", "operational", [
        # single-family magnitude → TWO structurally different cases: a descent that
        # STAYS within the decade (no crossing) vs one that CROSSES a decade downward.
        # (Not two crossings with different numbers — the constitution's rule.)
        ("magnitude", "على الخطّ: ابدأ من ١٧، اقفز ٣ للخلف (داخل العقد). أين تقف؟", "١٤",
         {"kind": "number-line", "min": 0, "max": 20, "start": 17, "jump": 3, "back": True}),
        ("magnitude", "على الخطّ: ابدأ من ١٣، اقفز ٤ للخلف (تعبر العقد ١٠). أين تقف؟", "٩",
         {"kind": "number-line", "min": 0, "max": 20, "start": 13, "jump": 4, "back": True}),
    ]),
    ("A1", "الجمع بالحمل البسيط ضمن ١٠٠", "operational", [
        # PROMISE NODE — three GENUINELY distinct mental acts (build-and-exchange /
        # locate-on-scale / symbolic place-recombine), each with a real widget.
        # aggregative → base-ten blocks WITH carry: add ones, BUNDLE ten into a rod
        ("aggregative", "ابنِ ٤٧، أضِف ٥ آحاد، واربط العشرة المكتملة في قضيب. المجموع؟", "٥٢",
         {"kind": "base-ten-blocks", "start": 47, "add": 5, "carry": True}),
        ("aggregative", "ابنِ ٣٨، أضِف ٢٧ (اجمع الآحاد ١٥ ← اربط عشرة) ثم القضبان. المجموع؟", "٦٥",
         {"kind": "base-ten-blocks", "start": 38, "add": 27, "carry": True}),
        # magnitude → number line: a forward jump that CROSSES a decade
        ("magnitude", "على الخطّ: ابدأ من ٤٧، اقفز ٥ للأمام (تعبر ٥٠). أين تقف؟", "٥٢",
         {"kind": "number-line", "min": 45, "max": 55, "start": 47, "jump": 5}),
        ("magnitude", "على الخطّ: ابدأ من ٣٨، اقفز ٦ للأمام (تعبر ٤٠). أين تقف؟", "٤٤",
         {"kind": "number-line", "min": 36, "max": 46, "start": 38, "jump": 6}),
        # decompositional → add by place WITH carry: ones-sum overflows (٧+٥=١٢),
        # recombine with the tens (٤٠+١٢=٥٢) — the doc's ٤٠+(٧+٥) method.
        ("decompositional", "اجمع بالخانات (بحمل): ٤٧ + ٥", "٥٢",
         {"kind": "decomposition", "mode": "place-add", "a": 47, "b": 5}),
        ("decompositional", "اجمع بالخانات (بحمل): ٣٨ + ٢٧", "٦٥",
         {"kind": "decomposition", "mode": "place-add", "a": 38, "b": 27}),
        # MERGED T4 (partial sums — قطر): the SAME place-decompose-with-carry behaviour,
        # framed as «جزئية» (tens + ones, then combine). Not a new node, a representation.
        ("decompositional", "بالنواتج الجزئية: (٣٠+٤٠) ثم (٧+٨)، ثم اجمعهما: ٣٧ + ٤٨ = ؟", "٨٥",
         {"kind": "decomposition", "mode": "place-add", "a": 37, "b": 48}),
    ]),
    ("A2", "الطرح بالاستلاف البسيط ضمن ١٠٠", "operational", [
        # aggregative → take-away with UNBUNDLE (borrow): ones don't suffice, open a rod
        ("aggregative", "اطرح ٧ من ٥٢ بالقضبان: الآحاد لا تكفي — افتح قضيباً ثم خذ.", "٤٥",
         {"kind": "subtract-blocks", "minuend": 52, "subtract": 7}),
        ("aggregative", "اطرح ٢٨ من ٦٣ بالقضبان (افتح قضيباً للاستلاف).", "٣٥",
         {"kind": "subtract-blocks", "minuend": 63, "subtract": 28}),
        # magnitude → number line, BACKWARD jump
        ("magnitude", "على الخطّ: ابدأ من ٥٢، اقفز ٧ للخلف — انقر الوصول.", "٤٥",
         {"kind": "number-line", "min": 0, "max": 70, "start": 52, "jump": 7, "back": True}),
        ("magnitude", "على الخطّ: ابدأ من ٦٣، اقفز ٢٨ للخلف.", "٣٥",
         {"kind": "number-line", "min": 0, "max": 70, "start": 63, "jump": 28, "back": True}),
        # decompositional → subtract by place (with regroup shown for borrow)
        ("decompositional", "اطرح بالخانات (افتح عشرة للاستلاف): ٥٢ − ٧", "٤٥",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 52, "subtrahend": 7}),
        ("decompositional", "اطرح بالخانات: ٦٣ − ٢٨", "٣٥",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 63, "subtrahend": 28}),
    ]),
    # ===== S2 BATCH 1 — the 3-digit number column (C5 + A3 + A4). NEW NODES (not families
    # in C1/A1/A2): each introduces the HUNDRED as a new unit / a new carry-borrow place /
    # a new representation (flats) with its own fluency milestone. They MIRROR C1/A1/A2 one
    # place up (build / locate / place-recombine), reusing the SAME widgets extended to
    # hundreds. Country paths: the five 3-digit curricula (SA, BH, QA, KW, AE) — OM excluded
    # (spiral book shows no explicit 3-digit; logged ambiguous). =====
    ("C5", "القيمة المنزلية حتى ١٠٠٠", "operational", [
        # aggregative → base-ten WITH FLATS: build the 3-digit number (the hundred = a flat).
        ("aggregative", "ابنِ العدد ٣٤٧ بالألواح (مئات) والقضبان (عشرات) والمكعّبات (آحاد).", "٣٤٧",
         {"kind": "base-ten-blocks", "target": 347}),
        ("aggregative", "ابنِ العدد ٥٠٦ بالألواح والقضبان والمكعّبات (لا عشرات).", "٥٠٦",
         {"kind": "base-ten-blocks", "target": 506}),
        # magnitude → number line 0..1000 (hundred ticks): locate the nearest hundred.
        ("magnitude", "على خطّ ٠..١٠٠٠، انقر أقرب مئة إلى ٣٤٧.", "٣٠٠",
         {"kind": "number-line", "min": 0, "max": 1000, "step": 100, "target": 347}),
        ("magnitude", "على خطّ ٠..١٠٠٠، انقر أقرب مئة إلى ٦٨٠.", "٧٠٠",
         {"kind": "number-line", "min": 0, "max": 1000, "step": 100, "target": 680}),
        # decompositional → 3-place expansion; the BLANK varies place (tests the hundred too).
        ("decompositional", "فكّك ٣٤٧ = ؟ + ٤٠ + ٧ — أدخِل قيمة المئات.", "٣٠٠",
         {"kind": "decomposition", "mode": "expand3", "parts": [300, 40, 7], "blank": 0}),
        ("decompositional", "فكّك ٢٥٨ = ٢٠٠ + ٥٠ + ؟ — أدخِل قيمة الآحاد.", "٨",
         {"kind": "decomposition", "mode": "expand3", "parts": [200, 50, 8], "blank": 2}),
    ]),
    ("A3", "الجمع حتى ١٠٠٠ بإعادة التجميع", "operational", [
        # aggregative → base-ten WITH carry chaining into the HUNDREDS (ten rods → a flat).
        ("aggregative", "ابنِ ٢٦٥، أضِف ٨٥ (اربط العشرة، ثم اربط عشر قضبان في لوح مئة). المجموع؟", "٣٥٠",
         {"kind": "base-ten-blocks", "start": 265, "add": 85, "carry": True}),
        ("aggregative", "ابنِ ١٤٧، أضِف ٢٨٦ (حمل الآحاد ثم العشرات إلى المئات). المجموع؟", "٤٣٣",
         {"kind": "base-ten-blocks", "start": 147, "add": 286, "carry": True}),
        # magnitude → a forward jump that CROSSES a hundred (small jump, exact landing).
        ("magnitude", "على الخطّ: ابدأ من ٢٩٧، اقفز ٨ للأمام (تعبر ٣٠٠). أين تقف؟", "٣٠٥",
         {"kind": "number-line", "min": 294, "max": 308, "start": 297, "jump": 8}),
        ("magnitude", "على الخطّ: ابدأ من ٤٩٦، اقفز ٧ للأمام (تعبر ٥٠٠). أين تقف؟", "٥٠٣",
         {"kind": "number-line", "min": 493, "max": 507, "start": 496, "jump": 7}),
        # decompositional → add by place, 3 digits (ones/tens may overflow → carry).
        ("decompositional", "اجمع بالخانات (بحمل): ٣٤٧ + ٢٨٥", "٦٣٢",
         {"kind": "decomposition", "mode": "place-add", "a": 347, "b": 285}),
        ("decompositional", "اجمع بالخانات (بحمل): ٤٥٦ + ١٧٨", "٦٣٤",
         {"kind": "decomposition", "mode": "place-add", "a": 456, "b": 178}),
    ]),
    ("A4", "الطرح حتى ١٠٠٠ بإعادة التجميع", "operational", [
        # aggregative → subtract WITH borrow chaining FROM the hundreds (open a flat → rods).
        ("aggregative", "اطرح ٨٥ من ٣٤٢ بالألواح والقضبان (افتح قضيباً للاستلاف). الباقي؟", "٢٥٧",
         {"kind": "subtract-blocks", "minuend": 342, "subtract": 85}),
        ("aggregative", "اطرح ١٥٧ من ٤٢٣ بالألواح (افتح لوحاً ثم قضيباً — استلاف متسلسل). الباقي؟", "٢٦٦",
         {"kind": "subtract-blocks", "minuend": 423, "subtract": 157}),
        # magnitude → a backward jump that CROSSES a hundred.
        ("magnitude", "على الخطّ: ابدأ من ٣٠٣، اقفز ٨ للخلف (تعبر ٣٠٠). أين تقف؟", "٢٩٥",
         {"kind": "number-line", "min": 292, "max": 306, "start": 303, "jump": 8, "back": True}),
        ("magnitude", "على الخطّ: ابدأ من ٥٠٤، اقفز ٩ للخلف (تعبر ٥٠٠). أين تقف؟", "٤٩٥",
         {"kind": "number-line", "min": 492, "max": 506, "start": 504, "jump": 9, "back": True}),
        # decompositional → subtract by place, 3 digits (borrow chains ones←tens←hundreds).
        ("decompositional", "اطرح بالخانات: ٤٣٢ − ١٥٧", "٢٧٥",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 432, "subtrahend": 157}),
        ("decompositional", "اطرح بالخانات: ٦٠٥ − ٢٤٨", "٣٥٧",
         {"kind": "decomposition", "mode": "place-sub", "minuend": 605, "subtrahend": 248}),
    ]),
    # ===== N+F+T COMPLETION (curriculum_map §5 — the 20 missing minus 3 merges minus 1 drop;
    # 16 new behavioural nodes using ONLY the existing 7 widgets, or symbolic plain-text where
    # the behaviour has no widget MODE. The symbolic nodes pass the SAME single-family
    # generalisation gate as the counting nodes E1/E2/D1/D2 — two structurally-different
    # items, not a representation pair. Each node's two items are two structural cases.) =====

    # ---- N — Number & place value (4 new; N8 merged into C1) ----
    ("N4", "العدّ بالقفز (٢ و٥)", "operational", [
        # NEW behaviour vs C4 (step 10): a CONSTANT step OFF the decade structure — the
        # ground of skip-as-multiplication / even-odd. Two families, two steps.
        ("sequential", "أكمل العدّ بالقفز ٢: ٢، ٤، ٦، ؟", "٨",
         {"kind": "sequence", "terms": [2, 4, 6]}),
        ("sequential", "أكمل العدّ بالقفز ٥: ٥، ١٠، ١٥، ؟", "٢٠",
         {"kind": "sequence", "terms": [5, 10, 15]}),
        ("magnitude", "على الخطّ: ابدأ من ٦، اقفز ٢ للأمام.", "٨",
         {"kind": "number-line", "min": 0, "max": 20, "start": 6, "jump": 2}),
        ("magnitude", "على الخطّ: ابدأ من ١٠، اقفز ٥ للأمام.", "١٥",
         {"kind": "number-line", "min": 0, "max": 20, "start": 10, "jump": 5}),
    ]),
    ("N9", "مقارنة الأعداد", "operational", [
        # SYMBOLIC (no compare widget mode). Two structural cases: different tens vs
        # equal tens → compare ones. Single family → generalisation gate (like D1).
        ("decompositional", "أيّهما أكبر: ٣٦ أم ٦٣؟ (قارن العشرات) اكتب الأكبر.", "٦٣", None),
        ("decompositional", "أيّهما أكبر: ٥٤ أم ٥٨؟ (العشرات متساوية — قارن الآحاد) اكتب الأكبر.", "٥٨", None),
    ]),
    ("N10", "ترتيب الأعداد", "operational", [
        # SYMBOLIC. Cases: pick smallest (distinct tens) vs pick largest (a tie in tens).
        ("decompositional", "رتّب تصاعدياً: ٤٧، ٢٧، ٧٤ — ما العدد الأصغر؟", "٢٧", None),
        ("decompositional", "رتّب تصاعدياً: ٦٣، ٣٦، ٦٨ — ما العدد الأكبر؟", "٦٨", None),
    ]),
    ("N11", "تقدير الكميات (أقرب عشرة)", "operational", [
        # Single-family MAGNITUDE on the number line (same widget as C4's nearest-decade
        # item). Two structural cases: rounds DOWN vs rounds UP.
        ("magnitude", "على خطّ ٠..١٠٠، انقر أقرب عقد (عشرة) إلى ٤٣.", "٤٠",
         {"kind": "number-line", "min": 0, "max": 100, "step": 10, "target": 43}),
        ("magnitude", "على خطّ ٠..١٠٠، انقر أقرب عقد إلى ٤٧.", "٥٠",
         {"kind": "number-line", "min": 0, "max": 100, "step": 10, "target": 47}),
    ]),

    # ---- F — Fact fluency within 20 (8 new; F10 dropped → items live in B5) ----
    ("F1", "خصائص الجمع", "operational", [
        # NB: this F1 is the PROPERTIES node — distinct from the conceptual floor "F1"
        # mentioned in the docstring, which was never built (no skill row). SYMBOLIC.
        # Cases: commutativity vs associativity (group to make ten).
        ("decompositional", "إذا كان ٣ + ٨ = ١١، فكم يساوي ٨ + ٣؟ (التبديل)", "١١", None),
        ("decompositional", "استعمل التجميع: (٢ + ٨) + ٥ = ؟", "١٥", None),
    ]),
    ("F4", "المضاعفات (الدوبل)", "operational", [
        # Two families. Cases within ten (4+4) and over ten (7+7).
        ("aggregative", "املأ الإطار: ضِعف ٤ (٤ + ٤).", "٨",
         {"kind": "ten-frame", "start": 4, "add": 4}),
        ("aggregative", "املأ الإطار: ضِعف ٦ (٦ + ٦).", "١٢",
         {"kind": "ten-frame", "start": 6, "add": 6}),
        ("magnitude", "على الخطّ: ابدأ من ٧، اقفز ٧ (ضِعف ٧).", "١٤",
         {"kind": "number-line", "min": 0, "max": 20, "start": 7, "jump": 7}),
        ("magnitude", "على الخطّ: ابدأ من ٨، اقفز ٨ (ضِعف ٨).", "١٦",
         {"kind": "number-line", "min": 0, "max": 20, "start": 8, "jump": 8}),
    ]),
    ("F5", "قريب المضاعفات", "operational", [
        # Derived from the known double (n+n)±1. Two families.
        ("aggregative", "املأ الإطار: ٧ + ٨ (ضِعف ٧ زائد ١).", "١٥",
         {"kind": "ten-frame", "start": 7, "add": 8}),
        ("aggregative", "املأ الإطار: ٥ + ٦ (ضِعف ٥ زائد ١).", "١١",
         {"kind": "ten-frame", "start": 5, "add": 6}),
        ("decompositional", "قرّب المضاعفات: ٧ + ٨ = (٧ + ٧) + ١ = ؟", "١٥",
         {"kind": "decomposition", "mode": "place-add", "a": 7, "b": 8}),
        ("decompositional", "قرّب المضاعفات: ٥ + ٦ = (٥ + ٥) + ١ = ؟", "١١",
         {"kind": "decomposition", "mode": "place-add", "a": 5, "b": 6}),
    ]),
    ("F7", "جمع ثلاثة أعداد", "operational", [
        # SYMBOLIC (no 3-addend widget). Cases: find-a-ten pair vs find-a-double pair.
        ("decompositional", "اجمع (ابحث عن العشرة): ٤ + ٦ + ٣ = ؟", "١٣", None),
        ("decompositional", "اجمع (ابحث عن الضِعف): ٥ + ٥ + ٧ = ؟", "١٧", None),
    ]),
    ("F9", "الطرح باستعمال المضاعفات", "operational", [
        # Two families. Subtraction backed by a known double (12−6, 16−8).
        ("aggregative", "اطرح بالقضبان مستعيناً بالضِعف: ١٢ − ٦.", "٦",
         {"kind": "subtract-blocks", "minuend": 12, "subtract": 6}),
        ("aggregative", "اطرح بالقضبان: ١٦ − ٨ (ضِعف ٨).", "٨",
         {"kind": "subtract-blocks", "minuend": 16, "subtract": 8}),
        ("magnitude", "على الخطّ: ابدأ من ١٤، اقفز ٧ للخلف (ضِعف ٧).", "٧",
         {"kind": "number-line", "min": 0, "max": 20, "start": 14, "jump": 7, "back": True}),
        ("magnitude", "على الخطّ: ابدأ من ١٨، اقفز ٩ للخلف (ضِعف ٩).", "٩",
         {"kind": "number-line", "min": 0, "max": 20, "start": 18, "jump": 9, "back": True}),
    ]),
    ("F11", "العلاقة بين الجمع والطرح", "operational", [
        # SYMBOLIC «think-addition». ABSORBS the merged T9 (check 2-digit subtraction by
        # adding back). Cases: within ten, crossing ten, and a 2-digit verification.
        ("decompositional", "إذا كان ٥ + ٧ = ١٢، فكم يساوي ١٢ − ٥؟ (فكّر بالجمع)", "٧", None),
        ("decompositional", "إذا كان ٨ + ٦ = ١٤، فكم يساوي ١٤ − ٨؟", "٦", None),
        ("decompositional", "تحقّق من الطرح بالجمع: لإيجاد ٦٣ − ٢٨ احسب ٣٥ + ٢٨ =", "٦٣", None),
    ]),
    ("F12", "الأعداد المفقودة", "operational", [
        # SYMBOLIC inverse thinking. Cases: missing 2nd addend vs missing 1st addend.
        ("decompositional", "أوجد العدد المفقود: ٧ + ؟ = ١٢.", "٥", None),
        ("decompositional", "أوجد العدد المفقود: ؟ + ٦ = ١٤.", "٨", None),
    ]),
    ("F13", "عائلات الحقائق", "operational", [
        # SYMBOLIC. Cases: a within-ten family vs a crossing-ten family.
        ("decompositional", "من العائلة (٣، ٥، ٨): أكمل ٨ − ٥ = ؟", "٣", None),
        ("decompositional", "من العائلة (٦، ٧، ١٣): أكمل ١٣ − ٦ = ؟", "٧", None),
    ]),

    # ---- T — Two-digit operations within 100 (4 new; T4 merged into A1, T9 into F11) ----
    ("T1", "جمع العشرات", "operational", [
        # NEW behaviour: the TEN as a unit — re-use a single-digit fact at the tens place.
        # Two families. Two structural cases: within 100 (40+30) vs reaching 100 (70+30).
        ("aggregative", "ابدأ بـ٤٠، أضِف ٣٠ بقضبان العشرات.", "٧٠",
         {"kind": "base-ten-blocks", "start": 40, "add": 30}),
        ("aggregative", "ابدأ بـ٧٠، أضِف ٣٠ (تكتمل المئة).", "١٠٠",
         {"kind": "base-ten-blocks", "start": 70, "add": 30}),
        ("decompositional", "اجمع العشرات بالخانات: ٤٠ + ٣٠.", "٧٠",
         {"kind": "decomposition", "mode": "place-add", "a": 40, "b": 30}),
        ("decompositional", "اجمع العشرات: ٦٠ + ٣٠.", "٩٠",
         {"kind": "decomposition", "mode": "place-add", "a": 60, "b": 30}),
    ]),
    ("T5", "جمع أكثر من عددين من رقمين", "operational", [
        # SYMBOLIC (no multi-addend widget). Cases: no carry vs accumulating carry.
        ("decompositional", "اجمع (بلا حمل): ٢٣ + ١٥ + ٣١ = ؟", "٦٩", None),
        ("decompositional", "اجمع (مع حمل): ١٧ + ٢٥ + ١٤ = ؟", "٥٦", None),
    ]),
    ("T6", "تقدير ناتج الجمع", "operational", [
        # SYMBOLIC. Round each addend to the nearest ten then add. Two distinct results.
        ("decompositional", "قرّب كلّ عدد لأقرب عشرة ثم اجمع: ٤٧ + ٣٢ ≈ ؟", "٨٠", None),
        ("decompositional", "قرّب ثم اجمع: ٦٨ + ٢١ ≈ ؟", "٩٠", None),
    ]),
    ("T10", "تقدير ناتج الطرح", "operational", [
        # SYMBOLIC. Round both to the nearest ten then subtract. Two distinct results.
        ("decompositional", "قرّب كلّ عدد لأقرب عشرة ثم اطرح: ٦٨ − ٣١ ≈ ؟", "٤٠", None),
        ("decompositional", "قرّب ثم اطرح: ٥٢ − ١٩ ≈ ؟", "٣٠", None),
    ]),
]

# Dependency edges (prerequisite_code → dependent_code). Floor sources (E3/F1)
# are dropped → their dependents have no built prereqs (base nodes, open from start).
EDGES = [
    ("E1", "D1"), ("E2", "D2"),
    ("C4", "C3"), ("C4", "C1"), ("C3", "C1"),
    ("C1", "B1"), ("C1", "B4"), ("C1", "B5"),
    ("B1", "A1"), ("B2", "A1"), ("B4", "A1"), ("D1", "A1"),
    ("B1", "A2"), ("B3", "A2"), ("B5", "A2"), ("D2", "A2"),
    # ---- S2 batch-1 (ADDITIVE): the 3-digit column. C5 builds on place-value-to-100 (C1);
    # the 3-digit operations build on C5 + their 2-digit regroup parents (A1/A2). Minimal
    # prereqs, all present in every country that includes the node → paths stay closed. ----
    ("C1", "C5"), ("C5", "A3"), ("A1", "A3"), ("C5", "A4"), ("A2", "A4"),
    # ---- N+F+T completion (ADDITIVE only — no existing edge changes). Each new node's
    # prerequisites are chosen MINIMAL and present in EVERY country that includes the node,
    # so every country path stays prerequisite-closed (see NODE_COUNTRIES below). ----
    ("E1", "N4"),
    ("C1", "N9"), ("N9", "N10"), ("C4", "N11"),
    ("D1", "F1"), ("D1", "F4"), ("F4", "F5"), ("B2", "F7"),
    ("F4", "F9"), ("D2", "F9"),
    ("D1", "F11"), ("D2", "F11"), ("F11", "F12"), ("F11", "F13"),
    ("C4", "T1"), ("C1", "T1"), ("A1", "T5"),
    ("N11", "T6"), ("T1", "T6"), ("N11", "T10"), ("A2", "T10"),
]

# Curriculum PATHS — which countries' Grade-2/S1 curriculum includes each node
# (extracted from content/curricula/*; mapped in build_plan_NFT.md §3). The 14 core
# arithmetic nodes are universal (all six). The 16 new nodes follow their source files.
# A child sees ONLY their country's nodes (NULL country → the whole inventory).
_ALL6 = ("SA", "AE", "QA", "KW", "OM", "BH")
NODE_COUNTRIES: dict[str, tuple[str, ...]] = {
    # universal arithmetic core
    "E1": _ALL6, "E2": _ALL6, "C4": _ALL6, "C3": _ALL6, "C1": _ALL6, "B1": _ALL6,
    "B2": _ALL6, "B3": _ALL6, "B4": _ALL6, "B5": _ALL6, "D1": _ALL6, "D2": _ALL6,
    "A1": _ALL6, "A2": _ALL6,
    # S2 batch-1 — the 3-digit column. Five curricula with numbers-to-1000 / 3-digit ops.
    # C5 must be in every A3/A4 path (prereq-closure). OM excluded (spiral, no explicit
    # 3-digit — logged ambiguous). AE A4 = INFERRED (units 7–8 not page-confirmed; the
    # 2019–2020 vol is non-linear) — tagged here, to be corrected if a fuller source denies it.
    "C5": ("SA", "BH", "KW", "QA", "AE"),
    "A3": ("SA", "BH", "QA", "AE", "KW"),
    "A4": ("SA", "BH", "QA", "KW", "AE"),   # AE: INFERRED (3-digit subtraction — see ambiguity log)
    # S2 batch-2 — fractions. Region fractions (Fr1) in ALL six (OM أجزاء الكسور; QA/AE
    # تقسيم الأشكال/كسور الأشكال). Compare (Fr2) + set (Fr3) only Bahrain ch10 + Saudi ch8.
    "Fr1": _ALL6,
    "Fr2": ("BH", "SA"),
    "Fr3": ("BH", "SA"),
    # new — per the six curriculum maps
    "N4": ("AE", "QA", "KW", "BH"),
    "N9": ("OM", "SA", "KW", "BH", "AE"),   # +AE: correct S1 unit-5 «مقارنة الأعداد حتى ١٠٠٠»
    "N10": ("OM", "SA", "KW", "BH"),
    "N11": ("OM", "SA", "BH", "KW"),   # +KW: re-audit — unit 2 «التقدير» (estimate to 100)
    "F1": ("SA", "AE", "BH"),
    "F4": ("SA", "QA", "AE", "BH", "OM"),   # +OM: re-audit «خطوط الضِّعف» (doubles, p35)
    "F5": ("SA", "QA", "AE", "BH"),
    "F7": ("SA", "AE", "BH"),
    "F9": ("SA", "AE", "BH"),
    "F11": ("SA", "QA", "AE", "BH", "OM"),
    "F12": ("SA", "AE", "BH"),
    "F13": ("SA", "QA", "AE", "BH", "OM"),   # +OM: re-audit «مثلث عائلة الحقائق» (fact families, p9)
    "T1": ("SA", "KW", "BH"),
    "T5": ("QA", "BH", "AE", "SA"),   # AE: S1 u3; SA: re-audit ch5 «جمع ثلاثة أعداد من رقمين»
    "T6": ("BH", "SA"),    # +SA: re-audit — Saudi has 6 chapters; ch5 «تقدير ناتج الجمع»
    "T10": ("BH", "SA"),   # +SA: re-audit — Saudi ch6 «أقدّر ناتج الطرح» (طرح رقمين)
    # geometry (G) — S2 extends the paths to the second-semester geometry curricula (SA ch10,
    # QA u13, AE u10). Same behaviours — path membership only.
    "G1": _ALL6, "G2": _ALL6, "G3": ("OM", "KW", "BH", "SA", "AE"),
    "G4": ("KW", "BH", "SA", "QA", "AE"), "G5": ("KW", "BH"), "G6": ("BH", "SA"),
    "G7": ("OM",), "G8": ("OM",),
    # multiplication / division (M/V). M1/V already cover KW/OM (their S2 tables/division are
    # FAMILIES, not path changes). V4 (×↔÷ inverse) is Kuwait-only (its unit 9).
    "M1": ("QA", "AE", "KW", "BH", "OM"), "M4": ("KW", "BH"),
    "V1": ("KW", "BH", "OM"), "V2": ("KW", "BH"), "V3": ("KW",), "V4": ("KW",),
    # data & probability (DA). S2 extends reading/representation to QA (u12), OM (block graph),
    # AE (u11). DA4 (line plot — NEW) is QA + AE. Probability (DA3) unchanged (no S2 source).
    "DA1": ("SA", "BH", "QA", "OM", "AE"), "DA2": ("SA", "BH", "QA", "OM"),
    "DA3": ("SA", "BH"), "DA4": ("QA", "AE"),
    # measurement (Q). S2 extends Q1/Q2/Q3 from Oman-only to the second-semester measurement/
    # time/money curricula. Q4 (area) = BH/SA/QA; Q5 (time sequencing) = BH/SA/AE/KW.
    "Q1": _ALL6, "Q2": ("OM", "SA", "BH", "AE", "KW"), "Q3": ("OM", "SA", "BH", "AE", "KW"),
    "Q4": ("BH", "SA", "QA"), "Q5": ("BH", "SA", "AE", "KW"),
    # light strands: patterns (P), even/odd (Z), readiness (R1/R2), problem-solving (S1/S2).
    # S2: Z extends to OM (فردي؟) + BH (ch11); R2 extends to BH/OM/AE (position & direction).
    "P": _ALL6, "Z": ("QA", "AE", "KW", "OM", "BH"), "R1": ("KW", "OM"), "R2": ("KW", "BH", "OM", "AE"),
    "S1": _ALL6, "S2": ("QA", "AE", "BH"), "Ord": ("AE",),   # Ord: UAE only (الأعداد الترتيبية، و٥)
}

# ===== GEOMETRY strand (batch 2) — its OWN unit «الهندسة», independent of the number
# DAG. Three NEW isolated widgets (shape-pick / element-count / shape-compose). Only G5
# is genuinely two-family (verify ≠ search — two distinct acts); the rest pass the
# single-family GENERALISATION gate (two structural cases), DECLARED — no hidden debt.
# (Symmetry G7 is reduced to selection-not-folding → logged in visual_debt.md.) =====
GEOMETRY_NODES = [
    ("G1", "تمييز الأشكال المستوية", "operational", [
        # generalisation «تعرّف»: recognise a 2-D shape among distractors. Two cases.
        ("تعرّف", "ما اسم هذا الشكل؟ انقر الإجابة.", "مربع",
         {"kind": "shape-pick", "show": "square",
          "options": [{"v": "مربع", "shape": "square"}, {"v": "مثلث", "shape": "triangle"},
                      {"v": "دائرة", "shape": "circle"}]}),
        ("تعرّف", "ما اسم هذا الشكل؟", "مثلث",
         {"kind": "shape-pick", "show": "triangle",
          "options": [{"v": "مستطيل", "shape": "rectangle"}, {"v": "مثلث", "shape": "triangle"},
                      {"v": "دائرة", "shape": "circle"}]}),
    ]),
    ("G2", "تمييز المجسمات", "operational", [
        # generalisation «تعرّف»: recognise a 3-D solid. Two cases.
        ("تعرّف", "ما اسم هذا المجسم؟", "مكعب",
         {"kind": "shape-pick", "show": "cube",
          "options": [{"v": "مكعب", "shape": "cube"}, {"v": "كرة", "shape": "sphere"},
                      {"v": "أسطوانة", "shape": "cylinder"}]}),
        ("تعرّف", "ما اسم هذا المجسم؟", "كرة",
         {"kind": "shape-pick", "show": "sphere",
          "options": [{"v": "هرم", "shape": "pyramid"}, {"v": "كرة", "shape": "sphere"},
                      {"v": "مكعب", "shape": "cube"}]}),
    ]),
    ("G3", "أوجه وأحرف ورؤوس المجسمات", "operational", [
        # generalisation «عدّ»: enumerate solid elements. Two STRUCTURALLY different
        # elements: faces (regions) vs vertices (points).
        ("عدّ", "انقر أوجه المكعب لتعدّها. كم وجهاً؟", "٦",
         {"kind": "element-count", "solid": "cube", "element": "faces", "n": 6}),
        ("عدّ", "انقر رؤوس المكعب لتعدّها. كم رأساً؟", "٨",
         {"kind": "element-count", "solid": "cube", "element": "vertices", "n": 8}),
    ]),
    ("G4", "وصف الأشكال المستوية", "operational", [
        # generalisation «عدّ»: sides vs corners of a plane shape.
        ("عدّ", "انقر أضلاع المثلث. كم ضلعاً؟", "٣",
         {"kind": "element-count", "shape": "triangle", "element": "sides", "n": 3}),
        ("عدّ", "انقر زوايا المربع. كم زاوية؟", "٤",
         {"kind": "element-count", "shape": "square", "element": "corners", "n": 4}),
    ]),
    ("G5", "تطابق الأشكال", "operational", [
        # TWO GENUINE FAMILIES — distinct acts: «تحقّق» (judge a given pair: one
        # comparison → نعم/لا) vs «بحث» (search a set for the match → identity). A child
        # can pass one and fail the other → families gate, not faked.
        ("تحقّق", "هل الشكلان متطابقان (نفس الشكل والحجم)؟", "نعم",
         {"kind": "shape-pick", "pair": ["triangle", "triangle"],
          "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("تحقّق", "هل الشكلان متطابقان؟", "لا",
         {"kind": "shape-pick", "pair": ["square", "rectangle"],
          "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("بحث", "انقر الشكل المطابق للشكل المعروض.", "ب",
         {"kind": "shape-pick", "show": "triangle",
          "options": [{"v": "أ", "shape": "square"}, {"v": "ب", "shape": "triangle"},
                      {"v": "ج", "shape": "circle"}]}),
        ("بحث", "انقر الشكل المطابق للمعروض.", "ج",
         {"kind": "shape-pick", "show": "square",
          "options": [{"v": "أ", "shape": "circle"}, {"v": "ب", "shape": "triangle"},
                      {"v": "ج", "shape": "square"}]}),
    ]),
    ("G6", "تكوين الأشكال", "operational", [
        # generalisation «تركيب»: assemble a target from pieces. Two compositions.
        ("تركيب", "ركّب القطعتين لتكوّن مربعاً.", "نعم",
         {"kind": "shape-compose", "target": "square", "pieces": ["triangle", "triangle"]}),
        ("تركيب", "ركّب القطع لتكوّن مستطيلاً.", "نعم",
         {"kind": "shape-compose", "target": "rectangle", "pieces": ["square", "square"]}),
    ]),
    ("G7", "التماثل", "operational", [
        # generalisation «تماثل» — REDUCED to selection (not fold/reflect): visual_debt.md.
        # Cases: judge existence vs locate the axis.
        ("تماثل", "هل لهذا الشكل خطّ تماثل؟", "نعم",
         {"kind": "shape-pick", "show": "square", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("تماثل", "انقر خطّ التماثل الصحيح لهذا الشكل.", "عمودي",
         {"kind": "shape-pick", "show": "triangle-iso",
          "options": [{"v": "عمودي"}, {"v": "أفقي"}]}),
    ]),
    ("G8", "الخطوط المستقيمة", "operational", [
        # generalisation «تمييز»: classify line type. Cases: pick straight vs pick curved.
        ("تمييز", "انقر الخطّ المستقيم.", "أ",
         {"kind": "shape-pick",
          "options": [{"v": "أ", "shape": "line-straight"}, {"v": "ب", "shape": "line-curved"}]}),
        ("تمييز", "انقر الخطّ المنحني.", "ب",
         {"kind": "shape-pick",
          "options": [{"v": "أ", "shape": "line-straight"}, {"v": "ب", "shape": "line-curved"}]}),
    ]),
]

# Geometry internal edges — an INDEPENDENT strand (no number prerequisites). Bases that
# open from the start: G1, G2, G8. Every edge keeps each country path prereq-closed.
GEOMETRY_EDGES = [
    ("G1", "G4"), ("G1", "G5"), ("G1", "G6"), ("G1", "G7"), ("G2", "G3"),
]

# ===== EARLY MULTIPLICATION / DIVISION (M/V, batch 3) — its own unit «الضرب والقسمة».
# Two NEW isolated widgets: `groups` (3 modes: form/share/measure) + `array`. STRICT
# review collapsed the curriculum's M1/M2/M3 (equal-groups / repeated-addition / array)
# into ONE node M1 — they are three NOTATIONS of two representations (linear + spatial),
# not three behaviours. V1 (partitive) and V3 (quotative) stay SEPARATE: distinct acts
# that do NOT co-occur across countries (merging would show BH/OM a model they lack).
# V3 is NOT subtraction: its output is the COUNT OF GROUPS (quotient), not a difference. =====
MULDIV_NODES = [
    ("M1", "الضرب المبكّر — إيجاد الإجمالي", "operational", [
        # TWO GENUINE FAMILIES: «خطّي» (groups/repeated-addition) vs «مصفوفة» (spatial
        # rows×cols). Two different representations of the multiplicative total → families.
        ("خطّي", "كوّن ٣ مجموعات في كلٍّ منها ٤. كم الإجمالي؟", "١٢",
         {"kind": "groups", "mode": "form", "groups": 3, "per": 4}),
        ("خطّي", "كوّن ٥ مجموعات في كلٍّ منها ٢. كم الإجمالي؟", "١٠",
         {"kind": "groups", "mode": "form", "groups": 5, "per": 2}),
        ("مصفوفة", "صفّ مصفوفة: ٢ صفوف × ٥ أعمدة. كم الإجمالي؟", "١٠",
         {"kind": "array", "rows": 2, "cols": 5}),
        ("مصفوفة", "صفّ مصفوفة: ٣ صفوف × ٣ أعمدة. كم الإجمالي؟", "٩",
         {"kind": "array", "rows": 3, "cols": 3}),
    ]),
    ("M4", "قصص الضرب", "operational", [
        # SYMBOLIC modelling (a word situation → multiplication), like S1/S2. Generalisation.
        # Cases: an equal-groups story vs an array (rows) story. (Visual-debt: category ب.)
        ("نمذجة", "٥ صناديق، في كلّ صندوق ٣ تفّاحات. كم تفّاحة؟", "١٥", None),
        ("نمذجة", "٤ صفوف من المقاعد، كلّ صفّ ٦ مقاعد. كم مقعداً؟", "٢٤", None),
    ]),
    ("V1", "المشاركة بالتساوي", "operational", [
        # PARTITIVE division (deal N equally into G groups → the share). generalisation.
        ("توزيع", "وزّع ١٢ بالتساوي على ٣ مجموعات. كم في كلّ مجموعة؟", "٤",
         {"kind": "groups", "mode": "share", "total": 12, "groups": 3}),
        ("توزيع", "وزّع ١٥ بالتساوي على ٥ مجموعات. كم في كلّ مجموعة؟", "٣",
         {"kind": "groups", "mode": "share", "total": 15, "groups": 5}),
    ]),
    ("V2", "قصص القسمة", "operational", [
        # SYMBOLIC modelling (a word situation → division), like S1/S2. Generalisation.
        ("نمذجة", "١٨ قلماً على ٣ تلاميذ بالتساوي. كم لكلّ تلميذ؟", "٦", None),
        ("نمذجة", "٢٠ حلوى في ٤ أكياس بالتساوي. كم في الكيس؟", "٥", None),
    ]),
    ("V3", "القسمة كطرح متكرّر", "operational", [
        # QUOTATIVE division — how many groups of M fit in N (repeated subtraction). NOT
        # subtraction: the answer is the COUNT OF GROUPS, not a difference. generalisation.
        ("قياس", "كم مجموعةً من ٤ في ١٢؟ (اطرح ٤ متكرّراً وعُدّ المجموعات)", "٣",
         {"kind": "groups", "mode": "measure", "total": 12, "per": 4}),
        ("قياس", "كم مجموعةً من ٥ في ٢٠؟", "٤",
         {"kind": "groups", "mode": "measure", "total": 20, "per": 5}),
    ]),
    # ===== S2 BATCH 3 — the ×↔÷ inverse relationship (the F11/F13 insight, for mult/div) =====
    ("V4", "العلاقة بين الضرب والقسمة", "operational", [
        # INVERSE ×↔÷ — use a known product to find a quotient, and find the unknown factor.
        # A NEW insight (the inverse), NOT doing × or ÷ alone. SYMBOLIC generalisation (two
        # cases: relation / unknown). Kuwait-only (its unit 9 makes it explicit).
        ("علاقة", "إذا كان ٣ × ٤ = ١٢، فكم ١٢ ÷ ٤؟", "٣", None),
        ("علاقة", "أكمل العدد المجهول: ؟ × ٥ = ١٥", "٣", None),
    ]),
]

# M/V is NOT independent: multiplication extends addition, division follows multiplication.
# Rooted in D1 (addition, universal) — NOT N4 (skip-count, not universal → would break
# closure). The array foundation lives INSIDE M1 (its «مصفوفة» family). D2 feeds V3 (the
# repeated-subtraction action). V4 (inverse) needs BOTH M1 and V1 — Kuwait has both. Closed.
MULDIV_EDGES = [
    ("D1", "M1"), ("M1", "M4"), ("M1", "V1"), ("M1", "V3"), ("D2", "V3"), ("V1", "V2"),
    ("M1", "V4"), ("V1", "V4"),
]

# ===== DATA & PROBABILITY (DA, batch 4) — its own unit «البيانات والاحتمال». INDEPENDENT
# strand (like geometry): DA1/DA2/DA3 are open bases (data literacy rests on floor counting,
# not on built number nodes). STRICT review: tally/pictograph/bar are REPRESENTATIONS, not
# behaviours → collapsed into families. READ (interpret a given chart) and REPRESENT (produce
# one) are DISTINCT acts (receptive ≠ productive, dissociable) → two nodes. PROBABILITY (judge
# what MIGHT happen) is a separate strand from data (describe what IS). Two NEW isolated
# widgets: `chart` (read/build modes × pictograph/bar/tally) + `likelihood`. =====
DATA_NODES = [
    ("DA1", "قراءة البيانات", "operational", [
        # READ — extract value/comparison from a GIVEN chart. Two real families (the two
        # proportional displays): «صور» (pictograph, count symbols) vs «أعمدة» (bar, read scale).
        ("صور", "في مخطّط الصور: كم عدد الفئة «ب»؟", "٢",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 4], ["ب", 2], ["ج", 5]], "ask": "count", "cat": "ب"}),
        ("صور", "في مخطّط الصور: أيّ فئة هي الأكثر؟", "ج",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 4], ["ب", 2], ["ج", 5]], "ask": "most"}),
        ("أعمدة", "في مخطّط الأعمدة: ما ارتفاع عمود الفئة «أ»؟", "٤",
         {"kind": "chart", "mode": "read", "type": "bar",
          "data": [["أ", 4], ["ب", 6], ["ج", 3]], "ask": "count", "cat": "أ"}),
        ("أعمدة", "في مخطّط الأعمدة: أيّ فئة عمودها الأطول؟", "ب",
         {"kind": "chart", "mode": "read", "type": "bar",
          "data": [["أ", 4], ["ب", 6], ["ج", 3]], "ask": "most"}),
    ]),
    ("DA2", "تمثيل البيانات", "operational", [
        # REPRESENT — PRODUCE a chart to match given counts. Two families: «إشارات» (tally,
        # 1-to-1 marks) vs «أعمدة» (bar, raise to a height). A different act from reading.
        ("إشارات", "سجّل ٧ إشارات في جدول الإشارات.", "٧",
         {"kind": "chart", "mode": "build", "type": "tally", "target": 7}),
        ("إشارات", "سجّل ٥ إشارات.", "٥",
         {"kind": "chart", "mode": "build", "type": "tally", "target": 5}),
        ("أعمدة", "ارسم عموداً بارتفاع ٦.", "٦",
         {"kind": "chart", "mode": "build", "type": "bar", "target": 6}),
        ("أعمدة", "ارسم عموداً بارتفاع ٤.", "٤",
         {"kind": "chart", "mode": "build", "type": "bar", "target": 4}),
    ]),
    ("DA3", "الاحتمال", "operational", [
        # PROBABILITY — judge an event's likelihood. Two genuine acts: «حتمية» (classify on
        # the certainty extremes: أكيد/مستحيل) vs «مقارنة» (relative: more/less likely).
        ("حتمية", "كيس فيه كرات حمراء فقط. سحب كرة حمراء حدثٌ:", "أكيد",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 5]],
          "ask": "certainty", "event": "red"}),
        ("حتمية", "كيس فيه كرات زرقاء فقط. سحب كرة حمراء حدثٌ:", "مستحيل",
         {"kind": "likelihood", "scenario": "bag", "balls": [["blue", 5]],
          "ask": "certainty", "event": "red"}),
        ("مقارنة", "كيس فيه ٥ حمراء و٢ زرقاء. أيّ لون أكثر إمكانية للسحب؟", "أحمر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 5], ["blue", 2]], "ask": "more"}),
        ("مقارنة", "كيس فيه ٣ خضراء و٦ صفراء. أيّ لون أكثر إمكانية؟", "أصفر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["green", 3], ["yellow", 6]], "ask": "more"}),
    ]),
    # ===== S2 BATCH 3 — line plot (a NEW data representation ≠ bar/pictograph) =====
    ("DA4", "التمثيل بالنقاط", "operational", [
        # LINE PLOT — read a dot/× plot over a number line. A reading act (like DA1) but a NEW
        # display. Single-family generalisation (two cases: count at a value / which is most).
        ("نقاط", "في التمثيل بالنقاط: كم عددُ النقاط عند القيمة «٣»؟", "٤",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["١", 2], ["٢", 1], ["٣", 4], ["٤", 2]], "ask": "count", "cat": "٣"}),
        ("نقاط", "في التمثيل بالنقاط: أيُّ قيمةٍ لها أكثرُ النقاط؟", "٣",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["١", 2], ["٢", 1], ["٣", 4], ["٤", 2]], "ask": "most"}),
    ]),
]
DATA_EDGES: list[tuple[str, str]] = []   # independent strand — DA1–DA4 are open bases

# ===== MEASUREMENT (Q, batch 5) — its own unit «القياس». STRICT review split the five
# sub-topics by ACT, not name: length/mass/capacity are ONE act (quantify a continuous
# attribute by a unit) in three representations → ONE node, three families. TIME is a
# DIFFERENT act (decode a two-hand dial, no unit iterated) → its own node. MONEY is a
# DIFFERENT, arithmetic act (recognise value + total denominations) → its own node, and it
# DEPENDS on addition (D1). Three NEW isolated widgets: `measure` (ruler/balance/container),
# `clock`, `money`. Q1/Q2 are independent bases; Q3 roots in D1. =====
MEASURE_NODES = [
    ("Q1", "القياس بالوحدة", "operational", [
        # ONE act (quantify a continuous attribute by a unit) in THREE real representations
        # (ruler/balance/container). Direct comparison is folded in as the simplest case.
        ("طول", "كم سنتيمتراً طول هذا الجسم؟ انقر نهايته على المسطرة.", "٦",
         {"kind": "measure", "mode": "ruler", "length": 6, "max": 10}),
        ("طول", "كم سنتيمتراً طول هذا الجسم؟", "٤",
         {"kind": "measure", "mode": "ruler", "length": 4, "max": 10}),
        ("كتلة", "كم غراماً كتلة الجسم؟ أضِف أثقالاً حتى يتّزن الميزان.", "٥",
         {"kind": "measure", "mode": "balance", "mass": 5}),
        ("كتلة", "كم غراماً كتلة الجسم؟", "٣",
         {"kind": "measure", "mode": "balance", "mass": 3}),
        ("سعة", "كم كوباً يملأ هذا الإناء؟ اسكب الأكواب حتى يمتلئ.", "٤",
         {"kind": "measure", "mode": "container", "cups": 4}),
        ("سعة", "كم كوباً يملأ هذا الإناء؟", "٢",
         {"kind": "measure", "mode": "container", "cups": 2}),
    ]),
    ("Q2", "قراءة الساعة", "operational", [
        # DECODE a two-hand dial — a single act. Two structural cases (full hour / half) →
        # GENERALISATION (declared; no faked second family). Fully visual via `clock`.
        ("قراءة", "كم الساعة؟ اقرأ القرص واختر.", "الثالثة تماماً",
         {"kind": "clock", "hour": 3, "minute": 0,
          "options": ["الثانية تماماً", "الثالثة تماماً", "الرابعة تماماً"]}),
        ("قراءة", "كم الساعة؟", "السادسة والنصف",
         {"kind": "clock", "hour": 6, "minute": 30,
          "options": ["السادسة تماماً", "السادسة والنصف", "السابعة والنصف"]}),
    ]),
    ("Q3", "النقود", "operational", [
        # An ARITHMETIC act (not measurement) — depends on D1. Two genuine families:
        # «تعرّف» (identify a coin's value — perceptual) vs «إجمالي» (total a set — addition).
        ("تعرّف", "ما قيمة هذه العملة؟ (بالبيسة)", "٥٠",
         {"kind": "money", "mode": "identify", "coin": 50, "options": [25, 50, 100]}),
        ("تعرّف", "ما قيمة هذه العملة؟", "٢٥",
         {"kind": "money", "mode": "identify", "coin": 25, "options": [10, 25, 50]}),
        ("إجمالي", "اجمع قيمة هذه العملات (بالبيسة).", "٢٠",
         {"kind": "money", "mode": "total", "coins": [5, 5, 10]}),
        ("إجمالي", "اجمع قيمة هذه العملات.", "٣٥",
         {"kind": "money", "mode": "total", "coins": [25, 10]}),
    ]),
    # ===== S2 BATCH 3 — two NEW measurement-strand nodes =====
    ("Q4", "المساحة بمربّعات الوحدة", "operational", [
        # AREA — count the unit squares covering a region (2-D coverage). DISTINCT from Q1
        # (linear/unit measure) AND from M1 (multiplication): Saudi has Q4 but NOT M1, so area
        # is COUNTED here, not multiplied → independent, reuses `array` with square tiles.
        ("مساحة", "كم مربّع وحدةٍ يغطّي هذا المستطيل؟ عُدّ المربّعات.", "١٢",
         {"kind": "array", "rows": 3, "cols": 4, "square": True}),
        ("مساحة", "كم مربّع وحدةٍ مساحةُ هذا المستطيل؟", "٦",
         {"kind": "array", "rows": 2, "cols": 3, "square": True}),
    ]),
    ("Q5", "ترتيب الزمن وتسلسله", "operational", [
        # TEMPORAL SEQUENCING — order temporal items: daily events / time-units by size /
        # calendar. ONE ordering act over different item-sets (like N10 over numbers; NOT clock
        # reading Q2). SYMBOLIC generalisation (two structural cases). «تقدير الزمن» folds into N11.
        ("ترتيب", "رتّب زمنياً: الاستيقاظُ، الذهابُ للمدرسة، النومُ — ما أوّلُ حدثٍ في اليوم؟", "الاستيقاظ", None),
        ("ترتيب", "أيُّ وحدةٍ زمنيةٍ أطول: الدقيقةُ أم الساعةُ؟ اكتب الأطول.", "الساعة", None),
    ]),
]
# Q1/Q2 independent (rest on floor counting). Q3 (money) is arithmetic → roots in D1.
# Q4 (area) independent (counted, not multiplied — Saudi lacks M1). Q5 (sequencing) independent.
MEASURE_EDGES = [("D1", "Q3")]

# ===== LIGHT STRANDS (batch 6) — patterns / even-odd / readiness / problem-solving, in one
# unit «الأنماط والتهيئة وحل المسائل». STRICT review: all six are SINGLE-act nodes (two
# structural cases each) → GENERALISATION, declared — no faked families. R splits into two
# nodes (sort ≠ position — different acts). S splits into two (one-step universal, two-step a
# subset → the PATH separates them, as with V1/V3). One NEW widget `pattern` (sequence+blank,
# numbers OR shapes — `sequence` does constant-step only, `shape-pick` shows one stimulus).
# Z reuses shape-pick; R1/R2 reuse shape-pick; S1/S2 are symbolic modelling (visual-debt). =====
LIGHT_NODES = [
    ("P", "الأنماط", "operational", [
        # extend a pattern — distinct from constant-step counting (covers REPEATING and
        # GROWING, numbers AND shapes). Single act, generalisation.
        ("نمط", "أكمل النمط المتكرّر: ٣، ٥، ٣، ٥، ؟", "٣",
         {"kind": "pattern", "itemType": "number", "seq": [3, 5, 3, 5], "options": [3, 5, 7]}),
        ("نمط", "أكمل النمط المتكرّر بالأشكال:", "دائرة",
         {"kind": "pattern", "itemType": "shape",
          "seq": ["triangle", "circle", "triangle", "circle", "triangle"],
          "options": [{"v": "مثلث", "shape": "triangle"}, {"v": "دائرة", "shape": "circle"},
                      {"v": "مربع", "shape": "square"}]}),
        ("نمط", "أكمل النمط المتنامي: ١، ٢، ٤، ٧، ؟ (يكبر الفرق)", "١١",
         {"kind": "pattern", "itemType": "number", "seq": [1, 2, 4, 7], "options": [10, 11, 13]}),
    ]),
    ("Z", "الأعداد الزوجية والفردية", "operational", [
        # classify even/odd — a single act (two outcomes = two cases). Builds on N4 (skip-2).
        ("تصنيف", "هل العدد ٨ زوجيّ أم فرديّ؟", "زوجي",
         {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]}),
        ("تصنيف", "هل العدد ٧ زوجيّ أم فرديّ؟", "فردي",
         {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]}),
    ]),
    ("R1", "التصنيف والفرز", "operational", [
        # sort by a shared attribute — pick the one that doesn't belong. Visual via shape-pick.
        ("فرز", "انقر الشكل المختلف (لا ينتمي).", "ج",
         {"kind": "shape-pick", "options": [{"v": "أ", "shape": "triangle"},
                                            {"v": "ب", "shape": "triangle"}, {"v": "ج", "shape": "circle"}]}),
        ("فرز", "انقر الشكل المختلف.", "أ",
         {"kind": "shape-pick", "options": [{"v": "أ", "shape": "square"},
                                            {"v": "ب", "shape": "circle"}, {"v": "ج", "shape": "circle"}]}),
    ]),
    ("R2", "الموقع والتموضع المكاني", "operational", [
        # spatial relations — a DIFFERENT act from sorting. (Position described in the prompt;
        # selection of the answer. Light visual-debt: a spatial-arrangement widget later.)
        ("تموضع", "المربع فوق الدائرة. ما الشكل الذي في الأعلى؟", "المربع",
         {"kind": "shape-pick", "options": [{"v": "المربع"}, {"v": "الدائرة"}]}),
        ("تموضع", "القلم يمين الكتاب. ما الذي على اليمين؟", "القلم",
         {"kind": "shape-pick", "options": [{"v": "القلم"}, {"v": "الكتاب"}]}),
    ]),
    ("S1", "حل مسألة من خطوة واحدة", "operational", [
        # model a one-step word problem → an operation. SYMBOLIC (visual-debt ب, like M4/V2).
        ("نمذجة", "لدى سالم ٧ تفّاحات، أعطى ٣. كم بقي؟", "٤", None),
        ("نمذجة", "في الصفّ ٥ أولاد و٤ بنات. كم العدد الكلّي؟", "٩", None),
    ]),
    ("S2", "حل مسألة من خطوتين", "operational", [
        # model a TWO-step word problem. Same modelling act as S1, but the PATH separates them
        # (one-step universal, two-step only QA/AE/BH) — as with V1/V3. SYMBOLIC.
        ("نمذجة", "لدى نورة ١٠ ريالات، اشترت بـ٣ ثم بـ٢. كم بقي؟", "٥", None),
        ("نمذجة", "معه ٦ أقلام، اشترى ٥ ثم أعطى ٤. كم لديه الآن؟", "٧", None),
    ]),
    ("Ord", "الأعداد الترتيبية", "operational", [
        # NAME THE POSITION (1st/2nd/Nth) in a sequence — a distinct act from cardinal
        # («كم؟») and from N10 (order a SET). Single act (positional correspondence) →
        # GENERALISATION (two cases). Reuses `shape-pick`: a row of shapes; tap the Nth.
        # UAE only (its S1 uniquely has the «حتى ١٠٠٠» unit, which carries ordinals).
        ("ترتيبي", "في الصفّ: انقر الشكل الثالث.", "ج",
         {"kind": "shape-pick", "options": [{"v": "أ", "shape": "circle"}, {"v": "ب", "shape": "triangle"},
                                            {"v": "ج", "shape": "square"}]}),
        ("ترتيبي", "في الصفّ: انقر الشكل الثاني.", "ب",
         {"kind": "shape-pick", "options": [{"v": "أ", "shape": "square"}, {"v": "ب", "shape": "circle"},
                                            {"v": "ج", "shape": "triangle"}, {"v": "د", "shape": "square"}]}),
    ]),
]
# E1→Z (even/odd rests on COUNTING — the MINIMAL prereq present in every Z country; S2 added
# OM/BH and OM lacks N4, so N4 was not closure-valid → re-rooted to the universal E1).
# D1/D2→S1 (modelling rests on add/subtract). S1→S2. P, R1, R2 are independent open bases.
LIGHT_EDGES = [("E1", "Z"), ("D1", "S1"), ("D2", "S1"), ("S1", "S2"), ("E1", "Ord")]

# ===== S2 BATCH 2 — FRACTIONS (its own unit «الكسور»). The new strand of the second
# semester. STRICT review (node = behaviour): partition + name are TWO faces of one act on
# the SAME region representation (produce ↔ recognise) → ONE node, two real families (like
# C1's build/read; DA's read/build were split only because that decoupling is WIDE — a graph
# construction is a heavy pipeline; shading a pre-divided bar is a light fill). The SET model
# (Fr3) is a DISTINCT act (sharing a discrete quantity = division-flavoured) → its own node
# that REUSES the groups/share widget. Compare (Fr2) is its own comparison act. New widget
# `fraction` (name/shade/compare); Fr3 reuses `groups`. =====
FRACTION_NODES = [
    ("Fr1", "تجزئة الكلّ وتسمية الكسر", "operational", [
        # family «تسمية» — recognise/read the shaded fraction of a region (pick it)
        ("تسمية", "ما الكسر الملوّن؟ انقر الإجابة.", "٣/٤",
         {"kind": "fraction", "mode": "name", "parts": 4, "shaded": 3, "options": ["١/٤", "٢/٤", "٣/٤"]}),
        ("تسمية", "ما الكسر الملوّن؟ انقر الإجابة.", "١/٣",
         {"kind": "fraction", "mode": "name", "parts": 3, "shaded": 1, "options": ["١/٣", "٢/٣", "٣/٣"]}),
        # family «تجزئة» — PRODUCE the fraction by shading k of n equal parts
        ("تجزئة", "ظلِّل ١ من ٢ أجزاء متساوية (النصف).", "١/٢",
         {"kind": "fraction", "mode": "shade", "parts": 2, "target": 1}),
        ("تجزئة", "ظلِّل ٣ من ٤ أجزاء متساوية.", "٣/٤",
         {"kind": "fraction", "mode": "shade", "parts": 4, "target": 3}),
    ]),
    ("Fr2", "مقارنة الكسور", "operational", [
        # single-family generalisation: two structural cases (unit fractions; smaller
        # denominator → larger fraction — seen on the bars, not asserted).
        ("مقارنة", "انقر الكسر الأكبر.", "١/٢",
         {"kind": "fraction", "mode": "compare", "a": {"parts": 2, "shaded": 1}, "b": {"parts": 4, "shaded": 1}}),
        ("مقارنة", "انقر الكسر الأكبر.", "١/٣",
         {"kind": "fraction", "mode": "compare", "a": {"parts": 3, "shaded": 1}, "b": {"parts": 5, "shaded": 1}}),
    ]),
    ("Fr3", "كسر المجموعة الوحدي", "operational", [
        # single-family generalisation: a unit fraction of a DISCRETE set via equal sharing
        # (REUSES the groups/share widget — the set model IS division-flavoured).
        ("مجموعة", "ما ١/٢ من ٨؟ وزِّعها على ٢ مجموعتين وخذ مجموعة.", "٤",
         {"kind": "groups", "mode": "share", "total": 8, "groups": 2}),
        ("مجموعة", "ما ١/٣ من ٦؟ وزِّعها على ٣ مجموعات وخذ مجموعة.", "٢",
         {"kind": "groups", "mode": "share", "total": 6, "groups": 3}),
    ]),
]
# Fr2/Fr3 build on Fr1 (understand a fraction first). NOT on V1 (division): Saudi has Fr3
# but NOT V1 — depending on V1 would break Saudi's path closure. Dependency follows the
# PATH, not the surface similarity (like M1 rooting in D1, not N4).
FRACTION_EDGES = [("Fr1", "Fr2"), ("Fr1", "Fr3")]

# ===== CONTENT SUPPLEMENT (phase 1) — fills the SPINE (الحساب unit) to 8 questions/node so
# the FLUENCY window (5) sees genuinely varied values, not memorisable repeats. Built via
# generators that COMPUTE the answer and format Arabic-Indic numerals (eliminates arithmetic
# + numeral-typing error). Each item is tagged to an EXISTING family/case (understanding gate
# unbroken). Symbolic nodes vary the REQUIRED OPERATION inside the family (not just values) —
# preventing procedure-memorisation. Appended in seed() to each node's questions. =====
_HD = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")
def _h(n): return str(n).translate(_HD)

def _SEQ(terms, up=True):
    nx = terms[-1] + (1 if up else -1)
    lab = "داخل العقد" if (nx // 10 == terms[-1] // 10) else "يعبر العقد"
    return ("sequential", f"أكمل الت{'تابع' if up else 'نازل'} ({lab}): " +
            "، ".join(_h(t) for t in terms) + "، ؟", _h(nx),
            {"kind": "sequence", "terms": list(terms)})

def _SKIP(terms):
    step = terms[1] - terms[0]; nx = terms[-1] + step
    return ("sequential", f"أكمل العدّ بالقفز {_h(step)}: " +
            "، ".join(_h(t) for t in terms) + "، ؟", _h(nx), {"kind": "sequence", "terms": list(terms)})

def _NL(start, jump, back=False, note=""):
    land = start - jump if back else start + jump
    return ("magnitude", f"على الخطّ: ابدأ من {_h(start)}، اقفز {_h(jump)} "
            f"{'للخلف' if back else 'للأمام'}{note}.", _h(land),
            {"kind": "number-line", "min": 0, "max": max(100, land), "start": start, "jump": jump,
             **({"back": True} if back else {})})

def _NEAR(t):
    return ("magnitude", f"على خطّ ٠..١٠٠، انقر أقرب عقد إلى {_h(t)}.", _h(round(t / 10) * 10),
            {"kind": "number-line", "min": 0, "max": 100, "step": 10, "target": t})

def _PADD(a, b, carry=False):
    return ("decompositional", f"اجمع بالخانات{' (بحمل)' if carry else ''}: {_h(a)} + {_h(b)}",
            _h(a + b), {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})

def _PSUB(m, s):
    return ("decompositional", f"اطرح بالخانات: {_h(m)} − {_h(s)}", _h(m - s),
            {"kind": "decomposition", "mode": "place-sub", "minuend": m, "subtrahend": s})

def _EXP(whole, tens, nonstd=False):
    return ("decompositional", f"{'تفكيك غير قياسي' if nonstd else 'فكِّك'}: {_h(whole)} = {_h(tens)} + ؟",
            _h(whole - tens), {"kind": "decomposition", "mode": "expand", "whole": whole, "tens": tens})

def _BTB(start, add, carry=False):
    return ("aggregative", f"ابدأ بـ{_h(start)}، أضِف {_h(add)} بالقضبان.", _h(start + add),
            {"kind": "base-ten-blocks", "start": start, "add": add, **({"carry": True} if carry else {})})

def _BUILD(t):
    return ("aggregative", f"ابنِ العدد {_h(t)} بالقضبان والمكعّبات.", _h(t),
            {"kind": "base-ten-blocks", "target": t})

def _SUBB(m, s):
    return ("aggregative", f"اطرح {_h(s)} من {_h(m)} بالقضبان.", _h(m - s),
            {"kind": "subtract-blocks", "minuend": m, "subtract": s})

# --- S2 batch-1: 3-digit generators (hundreds/flats). The same widgets, extended. ---
def _BUILD3(t):
    return ("aggregative", f"ابنِ العدد {_h(t)} بالألواح (مئات) والقضبان والمكعّبات.", _h(t),
            {"kind": "base-ten-blocks", "target": t})

def _BTB3(start, add):   # 3-digit add with carry chaining to the hundreds
    return ("aggregative", f"ابدأ بـ{_h(start)}، أضِف {_h(add)} (اربط العشرة ثم المئة عند اكتمالها).",
            _h(start + add), {"kind": "base-ten-blocks", "start": start, "add": add, "carry": True})

def _EXP3(h, t, o, blank):   # 3-place expansion; blank ∈ {0:مئات,1:عشرات,2:آحاد}
    parts = [h, t, o]; whole = h + t + o
    lbl = ["المئات", "العشرات", "الآحاد"][blank]
    body = " + ".join("؟" if i == blank else _h(p) for i, p in enumerate(parts))
    return ("decompositional", f"فكّك {_h(whole)} = {body} — أدخِل قيمة {lbl}.", _h(parts[blank]),
            {"kind": "decomposition", "mode": "expand3", "parts": parts, "blank": blank})

def _NEAR100(t):
    return ("magnitude", f"على خطّ ٠..١٠٠٠، انقر أقرب مئة إلى {_h(t)}.", _h(round(t / 100) * 100),
            {"kind": "number-line", "min": 0, "max": 1000, "step": 100, "target": t})

def _NL3(start, jump, back=False):   # a jump that crosses a hundred (tight, exact landing)
    land = start - jump if back else start + jump
    lo, hi = min(start, land) - 3, max(start, land) + 3
    return ("magnitude", f"على الخطّ: ابدأ من {_h(start)}، اقفز {_h(jump)} "
            f"{'للخلف' if back else 'للأمام'} (تعبر المئة).", _h(land),
            {"kind": "number-line", "min": lo, "max": hi, "start": start, "jump": jump,
             **({"back": True} if back else {})})

# --- S2 batch-2: fraction generators (compute the fraction/answer; vary parts & values) ---
def _FR(num, den):
    return f"{_h(num)}/{_h(den)}"

def _FRNAME(parts, shaded, distractors):   # family «تسمية» — recognise the shaded fraction
    nums = sorted(set([shaded] + list(distractors)))
    return ("تسمية", "ما الكسر الملوّن؟ انقر الإجابة.", _FR(shaded, parts),
            {"kind": "fraction", "mode": "name", "parts": parts, "shaded": shaded,
             "options": [_FR(n, parts) for n in nums]})

def _FRSHADE(parts, target):   # family «تجزئة» — produce the fraction by shading
    return ("تجزئة", f"ظلِّل {_h(target)} من {_h(parts)} أجزاء متساوية.", _FR(target, parts),
            {"kind": "fraction", "mode": "shade", "parts": parts, "target": target})

def _FRCOMP(pa, sa, pb, sb):   # compare two fractions; the larger by value is the answer
    bigger = (sa, pa) if sa / pa >= sb / pb else (sb, pb)
    return ("مقارنة", "انقر الكسر الأكبر.", _FR(bigger[0], bigger[1]),
            {"kind": "fraction", "mode": "compare",
             "a": {"parts": pa, "shaded": sa}, "b": {"parts": pb, "shaded": sb}})

def _FRSET(denom, total):   # «١/denom من total» — unit fraction of a set, via equal sharing
    return ("مجموعة", f"ما ١/{_h(denom)} من {_h(total)}؟ وزِّعها على {_h(denom)} مجموعات وخذ مجموعة.",
            _h(total // denom), {"kind": "groups", "mode": "share", "total": total, "groups": denom})

# --- S2 batch-3 generators ---
def _AREA(rows, cols):   # area = count the unit squares (reuses `array` with square tiles)
    return ("مساحة", f"كم مربّع وحدةٍ مساحةُ مستطيلٍ {_h(rows)}×{_h(cols)}؟ عُدّ المربّعات.",
            _h(rows * cols), {"kind": "array", "rows": rows, "cols": cols, "square": True})

def _LPCOUNT(data, cat):   # line plot — count the marks at a value
    return ("نقاط", f"في التمثيل بالنقاط: كم عددُ النقاط عند «{cat}»؟", _h(dict(data)[cat]),
            {"kind": "chart", "mode": "read", "type": "lineplot", "data": data, "ask": "count", "cat": cat})

def _LPMOST(data):   # line plot — which value has the most marks
    return ("نقاط", "في التمثيل بالنقاط: أيُّ قيمةٍ لها أكثرُ النقاط؟", max(data, key=lambda d: d[1])[0],
            {"kind": "chart", "mode": "read", "type": "lineplot", "data": data, "ask": "most"})

def _SYMF(family, prompt, ans):   # symbolic item carrying a SPECIFIC family (Q5 «ترتيب», V4 «علاقة»)
    return (family, prompt, _h(ans) if isinstance(ans, int) else ans, None)

def _CLOCKP(hour, minute):   # clock reading at quarter / 5-min precision (same `clock` widget)
    names = {0: " تماماً", 15: " والربع", 30: " والنصف"}
    def lbl(h, m): return _HRS[h] + (names.get(m) or f" و{_h(m)} دقيقة")
    ans, opts, seen = lbl(hour, minute), [], set()
    for h, m in [(hour, minute), (hour, 0), (hour % 12 + 1, minute)]:
        s = lbl(h, m)
        if s not in seen:
            seen.add(s); opts.append(s)
    return ("قراءة", "كم الساعة؟ اقرأ القرص واختر.", ans,
            {"kind": "clock", "hour": hour, "minute": minute, "options": opts})

def _MTOTALP(notes):   # total a set of BANKNOTES (paper money family)
    return ("إجمالي", "اجمع قيمة هذه الأوراق النقدية.", _h(sum(notes)),
            {"kind": "money", "mode": "total", "coins": notes, "paper": True})

def _MIDP(note, options):   # identify a BANKNOTE's value
    return ("تعرّف", "ما قيمة هذه الورقة النقدية؟", _h(note),
            {"kind": "money", "mode": "identify", "coin": note, "options": options, "paper": True})

def _TF(start, add):
    return ("aggregative", f"املأ الإطار: أضِف {_h(add)} إلى {_h(start)}.", _h(start + add),
            {"kind": "ten-frame", "start": start, "add": add})

def _BOND(a, b, make=10):
    return ("decompositional", f"فكِّك لتُكمل العشرة: {_h(a)} + {_h(b)} = {_h(make)} + ؟",
            _h(a + b - make), {"kind": "decomposition", "a": a, "b": b, "make": make})

def _UC(qty, frm, to, ans):
    return ("decompositional", f"{_h(qty)} {frm} = ؟ {to}", _h(ans),
            {"kind": "decomposition", "mode": "unit-convert", "qty": qty, "from": frm, "to": to, "answer": ans})

def _RG(rods, cubes):
    val = rods * 10 + cubes
    return ("aggregative", f"{_h(val)}: افتح قضيباً (القيمة تبقى {_h(val)}). كم الآحاد الآن؟",
            _h(cubes + 10), {"kind": "regroup-blocks", "rods": rods, "cubes": cubes, "ask": "ones"})

def _SYM(prompt, ans):
    return ("decompositional", prompt, _h(ans), None)

# --- multiplication/division generators (compute the answer; vary the dimensions) ---
def _GFORM(groups, per):
    return ("خطّي", f"كوّن {_h(groups)} مجموعات في كلٍّ منها {_h(per)}. كم الإجمالي؟",
            _h(groups * per), {"kind": "groups", "mode": "form", "groups": groups, "per": per})

def _ARR(rows, cols):
    return ("مصفوفة", f"صفّ مصفوفة: {_h(rows)} صفوف × {_h(cols)} أعمدة. كم الإجمالي؟",
            _h(rows * cols), {"kind": "array", "rows": rows, "cols": cols})

def _GSHARE(total, groups):
    return ("توزيع", f"وزّع {_h(total)} بالتساوي على {_h(groups)} مجموعات. كم في كلّ مجموعة؟",
            _h(total // groups), {"kind": "groups", "mode": "share", "total": total, "groups": groups})

def _GMEAS(total, per):
    return ("قياس", f"كم مجموعةً من {_h(per)} في {_h(total)}؟",
            _h(total // per), {"kind": "groups", "mode": "measure", "total": total, "per": per})

def _STORY(prompt, ans):   # mult/division WORD problem (family «نمذجة», symbolic — visual=None)
    return ("نمذجة", prompt, _h(ans), None)

# --- geometry / data / measurement / patterns generators (vary shapes/charts/values) ---
_SHN = {"square": "مربع", "triangle": "مثلث", "circle": "دائرة", "rectangle": "مستطيل",
        "triangle-iso": "مثلث", "cube": "مكعب", "sphere": "كرة", "cylinder": "أسطوانة",
        "cone": "مخروط", "pyramid": "هرم"}

def _RECOG(show, distractors, threeD=False):
    opts = [{"v": _SHN[show], "shape": show}] + [{"v": _SHN[d], "shape": d} for d in distractors]
    return ("تعرّف", f"ما اسم هذا ال{'مجسم' if threeD else 'شكل'}؟ انقر الإجابة.",
            _SHN[show], {"kind": "shape-pick", "show": show, "options": opts})

def _ECOUNT(shape, element, n, threeD=False):
    elw = {"faces": "أوجه", "vertices": "رؤوس", "edges": "أحرف", "sides": "أضلاع", "corners": "زوايا"}[element]
    unit = {"faces": "وجهاً", "vertices": "رأساً", "edges": "حرفاً", "sides": "ضلعاً", "corners": "زاوية"}[element]
    key = "solid" if threeD else "shape"
    return ("عدّ", f"انقر {elw} ال{'مجسم' if threeD else 'شكل'} لتعدّها. كم {unit}؟",
            _h(n), {"kind": "element-count", key: shape, "element": element, "n": n})

def _COMPOSE(prompt, target, pieces):
    return ("تركيب", prompt, "نعم", {"kind": "shape-compose", "target": target, "pieces": pieces})

def _SP(family, prompt, answer, options, show=None, pair=None):
    v = {"kind": "shape-pick", "options": options}
    if show is not None:
        v["show"] = show
    if pair is not None:
        v["pair"] = pair
    return (family, prompt, answer, v)

def _READ(typ, data, ask, cat=None):
    fam = "صور" if typ == "pictograph" else "أعمدة"
    where = "الصور" if typ == "pictograph" else "الأعمدة"
    if ask == "count":
        val = dict((l, v) for l, v in data)[cat]
        return (fam, f"في مخطّط {where}: كم عدد الفئة «{cat}»؟", _h(val),
                {"kind": "chart", "mode": "read", "type": typ, "data": data, "ask": "count", "cat": cat})
    most = max(data, key=lambda x: x[1])[0]
    return (fam, f"في مخطّط {where}: أيّ فئة هي الأكثر؟", most,
            {"kind": "chart", "mode": "read", "type": typ, "data": data, "ask": "most"})

def _BTALLY(n):
    return ("إشارات", f"سجّل {_h(n)} إشارات في جدول الإشارات.", _h(n),
            {"kind": "chart", "mode": "build", "type": "tally", "target": n})

def _BBAR(n):
    return ("أعمدة", f"ارسم عموداً بارتفاع {_h(n)}.", _h(n),
            {"kind": "chart", "mode": "build", "type": "bar", "target": n})

_BALN = {"red": "حمراء", "blue": "زرقاء", "green": "خضراء", "yellow": "صفراء"}
_BALA = {"red": "أحمر", "blue": "أزرق", "green": "أخضر", "yellow": "أصفر"}

def _CERT(balls, event):
    total = sum(n for _, n in balls); evn = sum(n for c, n in balls if c == event)
    ans = "أكيد" if evn == total else ("مستحيل" if evn == 0 else "ممكن")
    comp = "، ".join(f"{_h(n)} {_BALN[c]}" for c, n in balls)
    return ("حتمية", f"كيس فيه {comp}. سحب كرة {_BALN[event]} حدثٌ:", ans,
            {"kind": "likelihood", "scenario": "bag", "balls": balls, "ask": "certainty", "event": event})

def _MORE(balls):
    most = max(balls, key=lambda x: x[1])[0]
    comp = "، ".join(f"{_h(n)} {_BALN[c]}" for c, n in balls)
    return ("مقارنة", f"كيس فيه {comp}. أيّ لون أكثر إمكانية للسحب؟", _BALA[most],
            {"kind": "likelihood", "scenario": "bag", "balls": balls, "ask": "more"})

_HRS = {1: "الواحدة", 2: "الثانية", 3: "الثالثة", 4: "الرابعة", 5: "الخامسة", 6: "السادسة",
        7: "السابعة", 8: "الثامنة", 9: "التاسعة", 10: "العاشرة", 11: "الحادية عشرة", 12: "الثانية عشرة"}

def _CLOCK(hour, minute):
    def lbl(h, m): return _HRS[h] + (" تماماً" if m == 0 else " والنصف")
    ans = lbl(hour, minute)
    opts, seen = [], set()
    for h, m in [(hour, minute), (hour % 12 + 1, minute), (hour, 30 if minute == 0 else 0)]:
        s = lbl(h, m)
        if s not in seen:
            seen.add(s); opts.append(s)
    return ("قراءة", "كم الساعة؟ اقرأ القرص واختر.", ans,
            {"kind": "clock", "hour": hour, "minute": minute, "options": opts})

def _MID(coin, options):
    return ("تعرّف", "ما قيمة هذه العملة؟ (بالبيسة)", _h(coin),
            {"kind": "money", "mode": "identify", "coin": coin, "options": options})

def _MTOTAL(coins):
    return ("إجمالي", "اجمع قيمة هذه العملات (بالبيسة).", _h(sum(coins)),
            {"kind": "money", "mode": "total", "coins": coins})

def _PATN(seq, options, ans):
    return ("نمط", "أكمل النمط: " + "، ".join(_h(t) for t in seq) + "، ؟", _h(ans),
            {"kind": "pattern", "itemType": "number", "seq": seq, "options": options})

def _PATS(seq, opts, ans):   # opts: list of (label, shape); ans: the label
    return ("نمط", "أكمل نمط الأشكال:", ans,
            {"kind": "pattern", "itemType": "shape", "seq": seq,
             "options": [{"v": v, "shape": s} for v, s in opts]})

def _EVENODD(n):
    return ("تصنيف", f"هل العدد {_h(n)} زوجيّ أم فرديّ؟", "زوجي" if n % 2 == 0 else "فردي",
            {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]})

SUPPLEMENT: dict[str, list] = {
    "E1": [_SEQ([41, 42, 43]), _SEQ([72, 73]), _SEQ([15, 16, 17]),
           _SEQ([58, 59]), _SEQ([27, 28, 29]), _SEQ([78, 79])],
    "E2": [_SEQ([64, 63, 62], up=False), _SEQ([88, 87], up=False), _SEQ([35, 34], up=False),
           _SEQ([61, 60], up=False), _SEQ([21, 20], up=False), _SEQ([91, 90], up=False)],
    "C4": [_SKIP([10, 20, 30]), _BUILD(50),
           _SKIP([100, 200, 300]), _SKIP([300, 400, 500])],   # S2: count by hundreds (same skip act)
    "C3": [_UC(40, "آحاد", "عشرات", 4), _UC(7, "عشرات", "آحاد", 70),
           _UC(20, "آحاد", "عشرات", 2), _UC(5, "عشرات", "آحاد", 50)],
    "C1": [_EXP(74, 70)],
    "B1": [_RG(6, 8), _RG(3, 4), _EXP(58, 40, nonstd=True), _EXP(72, 60, nonstd=True)],
    "B2": [_TF(6, 7), _BOND(7, 6)],
    "B3": [_SUBB(13, 6), _NL(16, 8, back=True)],
    "B4": [_BTB(42, 35), _PADD(61, 27)],
    "D1": [_NL(22, 5), _NL(51, 4), _NL(63, 5),
           _NL(37, 6, note=" (تعبر العقد)"), _NL(28, 7, note=" (تعبر العقد)"), _NL(16, 8, note=" (تعبر العقد)")],
    "D2": [_NL(27, 5, back=True), _NL(55, 4, back=True), _NL(68, 5, back=True),
           _NL(43, 6, back=True), _NL(35, 7, back=True), _NL(24, 8, back=True)],
    "A1": [_PADD(46, 28, carry=True)],
    "A2": [_SUBB(72, 36), _PSUB(81, 27)],
    # S2 batch-1 spine (الحساب) — 3-digit column to ≥8/node, varied values, computed answers.
    "C5": [_BUILD3(728), _BUILD3(405), _NEAR100(437), _EXP3(500, 30, 2, 1)],
    "A3": [_BTB3(158, 76), _PADD(265, 187), _PADD(348, 276)],
    "A4": [_SUBB(414, 76), _PSUB(523, 168), _PSUB(700, 256)],
    # S2 batch-2 spine (الكسور) — fractions to ≥8/node, varied parts/values, computed answers.
    "Fr1": [_FRNAME(4, 1, [2, 3]), _FRNAME(5, 2, [1, 3]), _FRSHADE(3, 2), _FRSHADE(5, 4)],
    "Fr2": [_FRCOMP(2, 1, 3, 1), _FRCOMP(3, 1, 4, 1), _FRCOMP(4, 1, 2, 1),
            _FRCOMP(4, 3, 4, 1), _FRCOMP(3, 2, 3, 1), _FRCOMP(2, 1, 5, 1)],
    "Fr3": [_FRSET(2, 6), _FRSET(4, 8), _FRSET(3, 9), _FRSET(2, 10), _FRSET(5, 10), _FRSET(4, 12)],
    "N4": [_SKIP([4, 6, 8]), _SKIP([10, 15, 20]), _NL(12, 2), _NL(5, 5)],
    "N9": [_SYM(f"أيّهما أكبر: {_h(28)} أم {_h(82)}؟ اكتب الأكبر.", 82),
           _SYM(f"أيّهما أصغر: {_h(46)} أم {_h(64)}؟ اكتب الأصغر.", 46),
           _SYM(f"أيّهما أكبر: {_h(71)} أم {_h(75)}؟ (العشرات متساوية)", 75),
           _SYM(f"أيّهما أصغر: {_h(39)} أم {_h(33)}؟", 33),
           _SYM(f"أيّهما أكبر: {_h(50)} أم {_h(49)}؟", 50),
           _SYM(f"أيّهما أصغر: {_h(67)} أم {_h(60)}؟", 60),
           _SYM(f"أيّهما أكبر: {_h(347)} أم {_h(412)}؟ (قارن المئات)", 412),   # S2: compare to 1000 (same act)
           _SYM(f"أيّهما أصغر: {_h(530)} أم {_h(503)}؟ (المئات متساوية)", 503)],
    "N10": [_SYM(f"رتّب: {_h(35)}، {_h(53)}، {_h(15)} — ما الأصغر؟", 15),
            _SYM(f"رتّب: {_h(42)}، {_h(24)}، {_h(48)} — ما الأكبر؟", 48),
            _SYM(f"رتّب: {_h(60)}، {_h(6)}، {_h(66)} — ما الأصغر؟", 6),
            _SYM(f"رتّب: {_h(77)}، {_h(70)}، {_h(74)} — ما الأكبر؟", 77),
            _SYM(f"رتّب: {_h(20)}، {_h(50)}، {_h(30)} — ما الأكبر؟", 50),
            _SYM(f"رتّب: {_h(91)}، {_h(19)}، {_h(99)} — ما الأصغر؟", 19),
            _SYM(f"رتّب: {_h(305)}، {_h(350)}، {_h(135)} — ما الأصغر؟", 135),   # S2: order to 1000 (same act)
            _SYM(f"رتّب: {_h(417)}، {_h(471)}، {_h(174)} — ما الأكبر؟", 471)],
    "N11": [_NEAR(62), _NEAR(68), _NEAR(34), _NEAR(77), _NEAR(23), _NEAR(51)],
    "F1": [_SYM(f"إذا كان {_h(4)} + {_h(9)} = {_h(13)}، فكم {_h(9)} + {_h(4)}؟ (التبديل)", 13),
           _SYM(f"إذا كان {_h(7)} + {_h(6)} = {_h(13)}، فكم {_h(6)} + {_h(7)}؟", 13),
           _SYM(f"استعمل التجميع: ({_h(3)} + {_h(7)}) + {_h(4)} = ؟", 14),
           _SYM(f"استعمل التجميع: {_h(5)} + ({_h(5)} + {_h(8)}) = ؟", 18),
           _SYM(f"إذا كان {_h(8)} + {_h(5)} = {_h(13)}، فكم {_h(5)} + {_h(8)}؟", 13),
           _SYM(f"استعمل التجميع: ({_h(6)} + {_h(4)}) + {_h(7)} = ؟", 17)],
    "F7": [_SYM(f"اجمع (ابحث عن العشرة): {_h(7)} + {_h(3)} + {_h(5)} = ؟", 15),
           _SYM(f"اجمع (ابحث عن الضِعف): {_h(4)} + {_h(6)} + {_h(4)} = ؟", 14),
           _SYM(f"اجمع: {_h(8)} + {_h(2)} + {_h(6)} = ؟", 16),
           _SYM(f"اجمع: {_h(5)} + {_h(4)} + {_h(5)} = ؟", 14),
           _SYM(f"اجمع: {_h(3)} + {_h(3)} + {_h(9)} = ؟", 15),
           _SYM(f"اجمع: {_h(2)} + {_h(7)} + {_h(8)} = ؟", 17)],
    "F11": [_SYM(f"إذا كان {_h(6)} + {_h(8)} = {_h(14)}، فكم {_h(14)} − {_h(6)}؟", 8),
            _SYM(f"إذا كان {_h(9)} + {_h(4)} = {_h(13)}، فكم {_h(13)} − {_h(9)}؟", 4),
            _SYM(f"إذا كان {_h(12)} − {_h(7)} = {_h(5)}، فأكمل {_h(5)} + {_h(7)} = ؟", 12),
            _SYM(f"تحقّق من الطرح بالجمع: لإيجاد {_h(52)} − {_h(17)} احسب {_h(35)} + {_h(17)} =", 52),
            _SYM(f"إذا كان {_h(7)} + {_h(5)} = {_h(12)}، فكم {_h(12)} − {_h(7)}؟", 5)],
    "F12": [_SYM(f"أوجد المفقود: {_h(4)} + ؟ = {_h(11)}.", 7),
            _SYM(f"أوجد المفقود: ؟ + {_h(8)} = {_h(13)}.", 5),
            _SYM(f"أوجد المفقود: {_h(9)} + ؟ = {_h(15)}.", 6),
            _SYM(f"أوجد المفقود: ؟ − {_h(3)} = {_h(5)}.", 8),
            _SYM(f"أوجد المفقود: {_h(12)} − ؟ = {_h(4)}.", 8),
            _SYM(f"أوجد المفقود: ؟ + {_h(6)} = {_h(12)}.", 6)],
    "F13": [_SYM(f"من العائلة ({_h(2)}، {_h(6)}، {_h(8)}): أكمل {_h(8)} − {_h(6)} = ؟", 2),
            _SYM(f"من العائلة ({_h(3)}، {_h(4)}، {_h(7)}): أكمل {_h(3)} + {_h(4)} = ؟", 7),
            _SYM(f"من العائلة ({_h(5)}، {_h(8)}، {_h(13)}): أكمل {_h(13)} − {_h(8)} = ؟", 5),
            _SYM(f"من العائلة ({_h(6)}، {_h(9)}، {_h(15)}): أكمل {_h(9)} + {_h(6)} = ؟", 15),
            _SYM(f"من العائلة ({_h(4)}، {_h(7)}، {_h(11)}): أكمل {_h(11)} − {_h(4)} = ؟", 7),
            _SYM(f"من العائلة ({_h(2)}، {_h(5)}، {_h(7)}): أكمل {_h(2)} + {_h(5)} = ؟", 7)],
    "F4": [_TF(3, 3), _TF(5, 5), _NL(6, 6), _NL(9, 9)],
    "F5": [_TF(4, 5), _TF(8, 9), _PADD(6, 7), _PADD(3, 4)],
    "F9": [_SUBB(10, 5), _SUBB(18, 9), _NL(8, 4, back=True), _NL(12, 6, back=True)],
    "T1": [_BTB(20, 50), _BTB(50, 40), _PADD(30, 30), _PADD(20, 20)],
    "T5": [_SYM(f"اجمع (بلا حمل): {_h(12)} + {_h(23)} + {_h(11)} = ؟", 46),
           _SYM(f"اجمع (مع حمل): {_h(15)} + {_h(17)} + {_h(16)} = ؟", 48),
           _SYM(f"اجمع أربعة أعداد: {_h(10)} + {_h(20)} + {_h(15)} + {_h(12)} = ؟", 57),
           _SYM(f"اجمع (مع حمل): {_h(24)} + {_h(18)} + {_h(31)} = ؟", 73),
           _SYM(f"اجمع (بلا حمل): {_h(31)} + {_h(14)} + {_h(22)} = ؟", 67),
           _SYM(f"اجمع أربعة أعداد: {_h(11)} + {_h(11)} + {_h(11)} + {_h(11)} = ؟", 44)],
    "T6": [_SYM(f"قرّب ثم اجمع: {_h(32)} + {_h(27)} ≈ ؟", 60),
           _SYM(f"قرّب ثم اجمع: {_h(48)} + {_h(41)} ≈ ؟", 90),
           _SYM(f"قرّب ثم اجمع: {_h(63)} + {_h(19)} ≈ ؟", 80),
           _SYM(f"قرّب ثم اجمع: {_h(22)} + {_h(24)} ≈ ؟", 40),
           _SYM(f"قرّب ثم اجمع: {_h(51)} + {_h(24)} ≈ ؟", 70),
           _SYM(f"قرّب ثم اجمع: {_h(18)} + {_h(11)} ≈ ؟", 30)],
    "T10": [_SYM(f"قرّب ثم اطرح: {_h(88)} − {_h(21)} ≈ ؟", 70),
            _SYM(f"قرّب ثم اطرح: {_h(73)} − {_h(12)} ≈ ؟", 60),
            _SYM(f"قرّب ثم اطرح: {_h(58)} − {_h(21)} ≈ ؟", 40),
            _SYM(f"قرّب ثم اطرح: {_h(49)} − {_h(18)} ≈ ؟", 30),
            _SYM(f"قرّب ثم اطرح: {_h(91)} − {_h(52)} ≈ ؟", 40),
            _SYM(f"قرّب ثم اطرح: {_h(64)} − {_h(43)} ≈ ؟", 20)],

    # ===== phase 2 — peripheral strands at 6/node. M/V first (varied dims, never a repeat). =====
    "M1": [_GFORM(2, 7), _ARR(4, 3)],                       # خطّي(2×7) + مصفوفة(4×3) — new dims
    "M4": [_STORY(f"{_h(3)} أطباق، في كل طبق {_h(6)} تمرات. كم تمرة؟", 18),
           _STORY(f"{_h(4)} علب، في كل علبة {_h(5)} أقلام. كم قلماً؟", 20),
           _STORY(f"{_h(2)} سلّة، في كل سلّة {_h(7)} تفّاحات. كم تفّاحة؟", 14),
           _STORY(f"{_h(2)} رفّ، في كل رفّ {_h(6)} كؤوس. كم كأساً؟", 12)],
    "V1": [_GSHARE(10, 2), _GSHARE(18, 3), _GSHARE(14, 2), _GSHARE(24, 4)],
    "V2": [_STORY(f"{_h(12)} تفّاحة على {_h(4)} أطفال بالتساوي. كم لكلّ طفل؟", 3),
           _STORY(f"{_h(15)} قلماً في {_h(3)} علب بالتساوي. كم في العلبة؟", 5),
           _STORY(f"{_h(16)} حلوى على {_h(2)} صديقين بالتساوي. كم لكلّ صديق؟", 8),
           _STORY(f"{_h(10)} كرات في {_h(5)} صناديق بالتساوي. كم في الصندوق؟", 2)],
    "V3": [_GMEAS(10, 2), _GMEAS(18, 3), _GMEAS(14, 2), _GMEAS(12, 6)],

    # ---- geometry (varied shapes/solids/elements, never a repeat) ----
    "G1": [_RECOG("square", ["circle", "rectangle"]), _RECOG("triangle", ["square", "rectangle"]),
           _RECOG("circle", ["square", "triangle"]), _RECOG("rectangle", ["square", "circle"])],
    "G2": [_RECOG("cube", ["sphere", "cylinder"], True), _RECOG("sphere", ["cube", "pyramid"], True),
           _RECOG("cylinder", ["cone", "sphere"], True), _RECOG("pyramid", ["cube", "cylinder"], True)],
    "G3": [_ECOUNT("cube", "edges", 12, True), _ECOUNT("pyramid", "faces", 5, True),
           _ECOUNT("pyramid", "vertices", 5, True), _ECOUNT("pyramid", "edges", 8, True)],
    "G4": [_ECOUNT("square", "sides", 4), _ECOUNT("triangle", "corners", 3),
           _ECOUNT("rectangle", "sides", 4), _ECOUNT("rectangle", "corners", 4)],
    "G5": [_SP("تحقّق", "هل الشكلان متطابقان؟", "نعم", [{"v": "نعم"}, {"v": "لا"}], pair=["circle", "circle"]),
           _SP("بحث", "انقر الشكل المطابق للمعروض.", "ب",
               [{"v": "أ", "shape": "circle"}, {"v": "ب", "shape": "square"}, {"v": "ج", "shape": "triangle"}],
               show="square")],
    "G6": [_COMPOSE("ركّب ٤ مربعات لتكوّن مربعاً أكبر.", "square", ["square", "square", "square", "square"]),
           _COMPOSE("ركّب ٣ مربعات لتكوّن مستطيلاً.", "rectangle", ["square", "square", "square"]),
           _COMPOSE("ركّب مثلثين لتكوّن مثلثاً أكبر.", "triangle", ["triangle", "triangle"]),
           _COMPOSE("ركّب ٤ مثلثات لتكوّن مستطيلاً.", "rectangle", ["triangle", "triangle", "triangle", "triangle"])],
    # m1 fix: the second «square نعم» row duplicated the BASE node's first question
    # verbatim (the variation audit's finding) — replaced with a REAL «لا» case on
    # the new no-symmetry glyph, so «لا» exists in the fixed pool too.
    "G7": [_SP("تماثل", "هل لهذا الشكل خطّ تماثل؟", "نعم", [{"v": "نعم"}, {"v": "لا"}], show="circle"),
           _SP("تماثل", "هل لهذا الشكل خطّ تماثل؟", "لا", [{"v": "نعم"}, {"v": "لا"}], show="l-shape"),
           _SP("تماثل", "هل لهذا الشكل خطّ تماثل؟", "نعم", [{"v": "نعم"}, {"v": "لا"}], show="rectangle"),
           _SP("تماثل", "انقر خطّ التماثل لهذا المثلث المتساوي الساقين.", "عمودي",
               [{"v": "عمودي"}, {"v": "أفقي"}], show="triangle-iso")],
    "G8": [_SP("تمييز", "انقر الخطّ المنحني.", "ج",
               [{"v": "أ", "shape": "line-straight"}, {"v": "ب", "shape": "line-straight"}, {"v": "ج", "shape": "line-curved"}]),
           _SP("تمييز", "انقر الخطّ المستقيم.", "ب",
               [{"v": "أ", "shape": "line-curved"}, {"v": "ب", "shape": "line-straight"}, {"v": "ج", "shape": "line-curved"}]),
           _SP("تمييز", "انقر الخطّ المنحني.", "أ",
               [{"v": "أ", "shape": "line-curved"}, {"v": "ب", "shape": "line-straight"}, {"v": "ج", "shape": "line-straight"}]),
           _SP("تمييز", "انقر الخطّ المستقيم.", "ج",
               [{"v": "أ", "shape": "line-curved"}, {"v": "ب", "shape": "line-curved"}, {"v": "ج", "shape": "line-straight"}])],

    # ---- data & probability (varied chart data; certainty includes «ممكن») ----
    "DA1": [_READ("pictograph", [["أ", 3], ["ب", 5], ["ج", 2]], "count", "ب"),
            _READ("bar", [["أ", 2], ["ب", 4], ["ج", 6]], "most")],
    "DA2": [_BTALLY(9), _BBAR(8)],
    "DA3": [_CERT([["red", 4], ["blue", 4]], "red"), _MORE([["green", 6], ["yellow", 2]])],

    # ---- measurement (varied times / coins) ----
    "Q2": [_CLOCK(4, 0), _CLOCK(9, 0), _CLOCK(2, 30), _CLOCK(11, 0),
           _CLOCKP(3, 15), _CLOCKP(7, 5)],                  # S2: quarter / 5-min precision
    "Q3": [_MID(100, [50, 100, 25]), _MTOTAL([25, 25, 10]),
           _MTOTALP([5, 10]), _MIDP(20, [10, 20, 50])],     # S2: banknotes (paper) family
    # S2 batch-3 — the four new nodes. Q4/DA4 = 8 (substantive new); Q5/V4 = 6 (light symbolic).
    "Q4": [_AREA(2, 4), _AREA(4, 3), _AREA(2, 5), _AREA(3, 3), _AREA(4, 4), _AREA(2, 6)],
    "DA4": [_LPCOUNT([["٢", 3], ["٣", 1], ["٤", 4], ["٥", 2]], "٤"),
            _LPMOST([["٢", 3], ["٣", 1], ["٤", 4], ["٥", 2]]),
            _LPCOUNT([["١", 1], ["٢", 5], ["٣", 2], ["٤", 3]], "٢"),
            _LPMOST([["١", 1], ["٢", 5], ["٣", 2], ["٤", 3]]),
            _LPCOUNT([["١", 2], ["٢", 1], ["٣", 4], ["٤", 2]], "١"),
            _LPMOST([["٥", 4], ["٦", 2], ["٧", 5], ["٨", 1]])],
    "Q5": [_SYMF("ترتيب", "رتّب زمنياً: الفطورُ، الغداءُ، العشاءُ — ما آخرُ وجبة؟", "العشاء"),
           _SYMF("ترتيب", "أيُّ وحدةٍ أطول: اليومُ أم الأسبوعُ؟ اكتب الأطول.", "الأسبوع"),
           _SYMF("ترتيب", "أيّامُ الأسبوع: ما اليومُ الذي يأتي بعد السبت؟", "الأحد"),
           _SYMF("ترتيب", "أيُّ وحدةٍ أقصر: الساعةُ أم الدقيقةُ؟ اكتب الأقصر.", "الدقيقة")],
    "V4": [_SYMF("علاقة", "إذا كان ٢ × ٥ = ١٠، فكم ١٠ ÷ ٥؟", 2),
           _SYMF("علاقة", "إذا كان ٤ × ٣ = ١٢، فكم ١٢ ÷ ٣؟", 4),
           _SYMF("علاقة", "أكمل العدد المجهول: ؟ × ٤ = ١٢", 3),
           _SYMF("علاقة", "أكمل العدد المجهول: ٦ × ؟ = ١٨", 3)],

    # ---- patterns / readiness / problem-solving / ordinal ----
    "P": [_PATN([2, 4, 2, 4], [2, 4, 6], 2),
          _PATS(["square", "triangle", "square", "triangle", "square"],
                [("مربع", "square"), ("مثلث", "triangle"), ("دائرة", "circle")], "مثلث"),
          _PATN([1, 3, 5, 7], [8, 9, 10], 9)],
    "Z": [_EVENODD(4), _EVENODD(9), _EVENODD(12), _EVENODD(15)],
    "R1": [_SP("فرز", "انقر الشكل المختلف.", "ب",
               [{"v": "أ", "shape": "square"}, {"v": "ب", "shape": "triangle"}, {"v": "ج", "shape": "square"}]),
           _SP("فرز", "انقر الشكل المختلف.", "ج",
               [{"v": "أ", "shape": "circle"}, {"v": "ب", "shape": "circle"}, {"v": "ج", "shape": "triangle"}]),
           _SP("فرز", "انقر الشكل المختلف.", "أ",
               [{"v": "أ", "shape": "triangle"}, {"v": "ب", "shape": "square"}, {"v": "ج", "shape": "square"}]),
           _SP("فرز", "انقر الشكل المختلف.", "ب",
               [{"v": "أ", "shape": "circle"}, {"v": "ب", "shape": "square"}, {"v": "ج", "shape": "circle"}])],
    "R2": [_SP("تموضع", "القلم تحت الكتاب. ما الذي في الأسفل؟", "القلم", [{"v": "القلم"}, {"v": "الكتاب"}]),
           _SP("تموضع", "الكرة يسار الصندوق. ما الذي على اليسار؟", "الكرة", [{"v": "الكرة"}, {"v": "الصندوق"}]),
           _SP("تموضع", "الطائر فوق الشجرة. ما الذي في الأعلى؟", "الطائر", [{"v": "الطائر"}, {"v": "الشجرة"}]),
           _SP("تموضع", "السيارة خلف البيت. ما الذي في الخلف؟", "السيارة", [{"v": "السيارة"}, {"v": "البيت"}])],
    "S1": [_STORY(f"في الحديقة {_h(8)} ورود، ذبلت {_h(3)}. كم بقي؟", 5),
           _STORY(f"مع أحمد {_h(6)} كرات، أعطاه صديقه {_h(4)}. كم لديه؟", 10),
           _STORY(f"في السلّة {_h(9)} تفّاحات، أكل {_h(2)}. كم بقي؟", 7),
           _STORY(f"في الصفّ {_h(7)} بنين و{_h(5)} بنات. كم العدد الكلّي؟", 12)],
    "S2": [_STORY(f"مع سارة {_h(12)} ريالاً، اشترت بـ{_h(4)} ثم بـ{_h(3)}. كم بقي؟", 5),
           _STORY(f"في الصندوق {_h(8)} كرات، أضاف {_h(5)} ثم أخذ {_h(6)}. كم بقي؟", 7),
           _STORY(f"مع خالد {_h(10)} أقلام، أعطى {_h(3)} ثم اشترى {_h(4)}. كم لديه؟", 11),
           _STORY(f"في المزرعة {_h(6)} دجاجات، اشترى {_h(7)} ثم باع {_h(5)}. كم بقي؟", 8)],
    "Ord": [_SP("ترتيبي", "في الصفّ: انقر الشكل الأول.", "أ",
                [{"v": "أ", "shape": "triangle"}, {"v": "ب", "shape": "circle"}, {"v": "ج", "shape": "square"}]),
            _SP("ترتيبي", "في الصفّ: انقر الشكل الرابع.", "د",
                [{"v": "أ", "shape": "circle"}, {"v": "ب", "shape": "square"}, {"v": "ج", "shape": "triangle"}, {"v": "د", "shape": "circle"}]),
            _SP("ترتيبي", "في الصفّ: انقر الشكل الأول.", "أ",
                [{"v": "أ", "shape": "square"}, {"v": "ب", "shape": "triangle"}, {"v": "ج", "shape": "circle"}]),
            _SP("ترتيبي", "في الصفّ: انقر الشكل الثالث.", "ج",
                [{"v": "أ", "shape": "triangle"}, {"v": "ب", "shape": "square"}, {"v": "ج", "shape": "circle"}])],
}


# ===================== GRADE 1 (الصف الأول) — batch 1: the numeric spine =====================
# SEPARATE grade dimension: its own Grade row + its own units (grade_id). Codes prefixed
# «g1» — no cross-grade code mixing even textually. Families = structurally distinct mental
# ACTS (the constitutional understanding gate «two families» = «two different acts»).
# Vertical layout and zero/whole are CASES inside the symbolic family, NOT families —
# representation does not make a family (the strategies-ruling, applied consistently).
# Sources: the six confirmed G1 curricula (curriculum_map_g1.md, batch-1 rows).

def _G1CNT(n, objects, label):
    # family «العدّ» — enumerate REAL objects by tapping each (element-count, generic objects)
    return ("aggregative", f"عُدَّ {label} بالنقر على كلٍّ منها: كم عددها؟", _h(n),
            {"kind": "element-count", "objects": objects, "label": label, "n": n})

def _G1SHOW(t):
    # family «العدّ/التمثيل» — produce the quantity on the ten-frame (answer = filled count)
    return ("aggregative", f"أظهِر العدد {_h(t)} بملء خانات لوحة العشرة.", _h(t),
            {"kind": "ten-frame", "start": 0})

def _G1NAME(word, n):
    # family «الترميز» — word name → numeral
    return ("symbolic", f"اكتب رمز العدد: «{word}»", _h(n), None)

def _G1CMP(a, b, bigger=True):
    ans = max(a, b) if bigger else min(a, b)
    return ("comparative", f"اكتب العدد {'الأكبر' if bigger else 'الأصغر'}: {_h(a)} أم {_h(b)}؟",
            _h(ans), None)

def _G1BETW(a):
    return ("sequential", f"ما العدد الواقع بين {_h(a)} و{_h(a + 2)}؟", _h(a + 1), None)

def _G1TF(start, add, story=None):
    # family «التمثيل القصصي» (join enacted on the ten-frame) — or plain frame-filling
    p = story or f"املأ الإطار: أضِف {_h(add)} إلى {_h(start)}."
    return ("aggregative", p, _h(start + add), {"kind": "ten-frame", "start": start, "add": add})

def _G1ADD(a, b, vertical=False):
    p = (f"بالشكل الرأسي — العلويّ {_h(a)} والسفليّ {_h(b)}: ما ناتج الجمع؟" if vertical
         else f"أكمل: {_h(a)} + {_h(b)} = ؟")
    return ("symbolic", p, _h(a + b), None)

def _G1SUBS(m, s, story=None):
    p = story or f"خُذ {_h(s)} من {_h(m)} مكعّبات: كم الباقي؟"
    return ("aggregative", p, _h(m - s), {"kind": "subtract-blocks", "minuend": m, "subtract": s})

def _G1SUB(m, s, vertical=False):
    p = (f"بالشكل الرأسي — العلويّ {_h(m)} والسفليّ {_h(s)}: ما ناتج الطرح؟" if vertical
         else f"أكمل: {_h(m)} − {_h(s)} = ؟")
    return ("symbolic", p, _h(m - s), None)

def _G1PW(whole, part):
    # family «الجزء والكل» — the Saudi part-whole table act (decompositional, NOT removal)
    return ("decompositional", f"الكلُّ {_h(whole)}، وأحد الجزأين {_h(part)} — فما الجزء الآخر؟",
            _h(whole - part), {"kind": "decomposition", "mode": "part-whole", "whole": whole, "part": part})

# --- batch 2: g1BOND (number bonds) + g1REL (add↔subtract relation) ---

def _G1COMP(part, target):
    # g1BOND family «التركيب الإنتاجي» — a part pre-filled on the ten-frame; the child
    # fills UP TO the target and reports what they ADDED (ask:"added" — the prompt names
    # part and target, so the total would be given away; the added count must be ACTED out).
    return ("aggregative",
            f"في الإطار {_h(part)} ملوّنة — املأ حتى يصير المجموع {_h(target)}: كم أضفت؟",
            _h(target - part), {"kind": "ten-frame", "start": part, "ask": "added"})

def _G1MISS(whole, part):
    # g1BOND family «الإكمال الرمزي» — supply the missing part of a known decomposition
    return ("decompositional", f"أكمل: {_h(whole)} = {_h(part)} + ؟", _h(whole - part), None)

def _G1TEN(part):
    # g1BOND — pairs of ten (the bond the curricula single out)
    return ("decompositional", f"أكمل أزواج العشرة: {_h(part)} + ؟ = ١٠", _h(10 - part), None)

def _G1DERIVE(a, b, sub=True):
    # g1REL family «الاشتقاق العكسي» — flip a GIVEN complete fact
    if sub:
        return ("inverse", f"بما أنّ {_h(a)} + {_h(b)} = {_h(a + b)}، فما ناتج {_h(a + b)} − {_h(b)}؟",
                _h(a), None)
    return ("inverse", f"بما أنّ {_h(a + b)} − {_h(b)} = {_h(a)}، فما ناتج {_h(a)} + {_h(b)}؟",
            _h(a + b), None)

def _G1FAM(a, b, missing="sub"):
    # g1REL family «بناء العائلة» — complete the family's missing sentence for (a,b,a+b)
    s = a + b
    lines = [f"{_h(a)} + {_h(b)} = {_h(s)}", f"{_h(b)} + {_h(a)} = {_h(s)}",
             f"{_h(s)} − {_h(a)} = {_h(b)}"]
    if missing == "sub":
        q, ans = f"{_h(s)} − {_h(b)} = ؟", a
    else:
        lines = lines[1:] + [f"{_h(s)} − {_h(b)} = {_h(a)}"]
        q, ans = f"{_h(a)} + {_h(b)} = ؟", s
    return ("family", "عائلة الحقائق (" + f"{_h(a)}، {_h(b)}، {_h(s)}" + "): "
            + " · ".join(lines) + " · " + q, _h(ans), None)

def _G1UNK(a, b, pos="first"):
    # g1REL family «الحدّ المفقود» — solve for the unknown in ANY position (an equation
    # act, not the flip of a given fact)
    if pos == "first":
        return ("missing", f"أوجد الحدّ المفقود: ؟ + {_h(b)} = {_h(a + b)}", _h(a), None)
    if pos == "second":
        return ("missing", f"أوجد الحدّ المفقود: {_h(a)} + ؟ = {_h(a + b)}", _h(b), None)
    return ("missing", f"أوجد الحدّ المفقود: {_h(a + b)} − ؟ = {_h(a)}", _h(b), None)

# --- batch 3: g1ADDSTR / g1SUBSTR — fluency strategies to 20. Families = the four
# distinct mental ACTS (counting / bridging-ten / derived-fact / property-or-inverse);
# number line, hundred chart and the ten-frame are REPRESENTATIONS folded into their
# act, never families of their own (the ratified strategies-ruling). ---

def _G1NL20(start, jump, back=False):
    # «counting» on the 0..20 number line (a CASE of the counting act, not a family)
    land = start - jump if back else start + jump
    return ("counting", f"على الخطّ: ابدأ من {_h(start)} وعُدّ {_h(jump)} "
            f"{'للخلف' if back else 'للأمام'}.", _h(land),
            {"kind": "number-line", "min": 0, "max": 20, "start": start, "jump": jump,
             **({"back": True} if back else {})})

def _G1CNTON(a, b):
    # «counting» symbolically: start from the larger, count on
    steps = "، ".join(_h(a + i) for i in range(1, b))
    return ("counting", f"ابدأ من الأكبر وعُدّ تصاعدياً: {_h(a)} + {_h(b)} = ؟ ({steps}، ...)",
            _h(a + b), None)

def _G1CNTBK(m, s):
    steps = "، ".join(_h(m - i) for i in range(1, s))
    return ("counting", f"عُدّ تنازلياً: {_h(m)} − {_h(s)} = ؟ ({steps}، ...)", _h(m - s), None)

def _G1BR(start, add):
    # «bridging» enacted on the ten-frame — the frame completes a ten and overflows
    return ("bridging", f"جسرُ العشرة: أكمل {_h(start)} إلى عشرة ثم زد الباقي — "
            f"{_h(start)} + {_h(add)} = ؟ (مثِّل على الإطار)", _h(start + add),
            {"kind": "ten-frame", "start": start, "add": add})

def _G1BRSYM(a, b):
    # «bridging» symbolically: decompose the addend around the ten
    k = 10 - a
    return ("bridging", f"فكِّك لتعبر العشرة: {_h(a)} + {_h(b)} = {_h(a)} + {_h(k)} + {_h(b - k)} "
            f"= ١٠ + {_h(b - k)} = ؟", _h(a + b), None)

def _G1SBR(m, s):
    # «bridging» for subtraction — Kuwait 6-8 «الإنقاص من العشرة» (ones run out → open
    # the ten). subtract-blocks ALREADY enacts this: the unbundling IS the bridge.
    return ("bridging", f"الإنقاصُ من العشرة: آحادك لا تكفي — افتح العشرة لتطرح. "
            f"{_h(m)} − {_h(s)} = ؟", _h(m - s),
            {"kind": "subtract-blocks", "minuend": m, "subtract": s})

def _G1DBL(a, near=0):
    # «derived» — doubles and near-doubles (derive from a KNOWN fact)
    if near:
        return ("derived", f"بما أنّ {_h(a)} + {_h(a)} = {_h(2 * a)}، فما {_h(a)} + {_h(a + near)}؟",
                _h(2 * a + near), None)
    return ("derived", f"الشفع: {_h(a)} + {_h(a)} = ؟", _h(2 * a), None)

def _G1DBLSUB(a):
    return ("derived", f"بما أنّ {_h(a)} + {_h(a)} = {_h(2 * a)}، فما {_h(2 * a)} − {_h(a)}؟",
            _h(a), None)

def _G1PROP(a, b):
    # «property» — commutativity applied as a strategy
    return ("property", f"إن كان {_h(a)} + {_h(b)} = {_h(a + b)}، فما {_h(b)} + {_h(a)}؟",
            _h(a + b), None)

def _G1PROP3(a, b, c):
    # «property» — reorder three addends to make the easy pair first
    return ("property", f"أعد الترتيب لتسهّل: {_h(a)} + {_h(b)} + {_h(c)} = "
            f"({_h(a)} + {_h(c)}) + {_h(b)} = ؟", _h(a + b + c), None)

def _G1THINKADD(m, s):
    # «inverse» — subtract by THINKING ADDITION. Meets g1REL's inverse act: there it is
    # UNDERSTOOD as a relation; here it is USED as a fluency strategy (per-node gates).
    return ("inverse", f"اطرح بالتفكير جمعاً: {_h(m)} − {_h(s)} = ؟ "
            f"(فكّر: {_h(s)} + ؟ = {_h(m)})", _h(m - s), None)

# --- batch 4: number structure (PV / N100 / SKIP / EVEN / EST / ORDINAL / N120-AE) ---

def _G1BUILD2(t):
    # g1PV «التجميع/الوحدنة» — build a two-digit number from rods and cubes
    return ("aggregative", f"ابنِ العدد {_h(t)} بالقضبان والمكعّبات.", _h(t),
            {"kind": "base-ten-blocks", "target": t})

def _G1BUNDLE(cubes):
    # g1PV «التجميع/الوحدنة» — unitise: bundle every ten ones into a rod
    return ("aggregative", f"اربط كلَّ ١٠ مكعّبات في قضيب: لديك {_h(cubes)} مكعّباً — كم قضيب عشرة تصنع؟",
            _h(cubes // 10), {"kind": "regroup-blocks", "rods": 0, "cubes": cubes, "ask": "tens"})

def _G1TENS(t):
    # g1PV «التفكيك الرمزي» — name the tens (or compose from tens+ones)
    tens, ones = divmod(t, 10)
    return ("decompositional", f"{_h(t)} = ؟ عشرات و{_h(ones)} آحاد — كم العشرات؟", _h(tens), None)

def _G1TEEN(ones):
    # g1PV «التفكيك الرمزي» — the ratified 11–19 placement: a ten and some ones
    return ("decompositional", f"العدد المكوَّن من عشرة واحدة و{_h(ones)} آحاد = ؟", _h(10 + ones), None)

def _G1TENMORE(n, more=True):
    # g1N100 «التتابعي-الموضعي» — Oman's «مصنع الأعداد»: more/less by ten
    return ("sequential", f"أ{'كثر' if more else 'قل'} بعشرة من {_h(n)} = ؟",
            _h(n + 10 if more else n - 10), None)

def _G1MID3(nums):
    # g1N100 «المقارني» — order three and report the middle
    s = sorted(nums)
    return ("comparative", f"رتّب من الأصغر إلى الأكبر واكتب الأوسط: "
            + "، ".join(_h(n) for n in nums), _h(s[1]), None)

def _G1PAIRS(pairs, per, label):
    # g1SKIP «التعدادي» — count real equal groups by skipping (socks pairs / 5-fils coins)
    return ("aggregative", f"عُدّ بالقفز: {_h(pairs)} {label} في كلٍّ منها {_h(per)} — كم المجموع؟",
            _h(pairs * per), {"kind": "array", "rows": pairs, "cols": per})

def _G1PAIRPICK(n, objects):
    # g1EVEN «التزويج التمثيلي» — pair the shown objects; does one remain?
    return ("pairing", f"{objects * n} ({_h(n)}) — زاوِجها اثنين اثنين: أيبقى واحدٌ بلا زوج؟",
            "فردي" if n % 2 else "زوجي",
            {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]})

def _G1PARITY(n):
    # g1EVEN «القاعدة الرمزية» — the ones digit decides
    return ("rule", f"العدد {_h(n)} — انظر إلى آحاده: زوجيٌّ أم فرديّ؟",
            "فردي" if n % 2 else "زوجي",
            {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]})

def _G1ESTP(n, objects, options):
    # g1EST «الانتقاء الإدراكي» — objects shown UNTAPPABLE (notap); pick the estimate
    return ("estimation", "قدِّر دون عدّ: كم تقريباً؟", _h(n),
            {"kind": "element-count", "objects": objects, "n": n, "notap": True,
             "options": [_h(o) for o in options]})

def _G1ESTR(prompt, good, bad):
    # g1EST «حكم المعقولية» — which estimate is reasonable in context?
    return ("reasonableness", f"{prompt} — أيُّ تقديرٍ معقول؟", _h(good),
            {"kind": "shape-pick", "options": [{"v": _h(good)}, {"v": _h(bad)}]})

def _G1ORDPICK(pos, shapes, ans):
    # g1ORDINAL «التحديد» — tap the Nth in the row (the G2 Ord pattern, reused)
    return ("identify", f"في الصفّ: انقر الشكل {pos}.", ans,
            {"kind": "shape-pick",
             "options": [{"v": v, "shape": s} for v, s in shapes]})

def _G1ORDNAME(prompt, ans):
    # g1ORDINAL «التسمية» — name the position as a number
    return ("name", prompt, _h(ans), None)

# --- batch 5: the two-digit cluster (TENS / DIG2 / REGR-AE / ESTR-BH) ---

def _G1TADD(a, b):
    # g1TENS «التمثيل بالقضبان» — whole tens with rods
    return ("aggregative", f"بالقضبان: {_h(a)} + {_h(b)} = ؟", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b})

def _G1TSUB(m, s):
    return ("aggregative", f"بالقضبان: خُذ {_h(s)} من {_h(m)} = ؟", _h(m - s),
            {"kind": "subtract-blocks", "minuend": m, "subtract": s})

def _G1TUNIT(ta, tb, sub=False):
    # g1TENS «التعليل بوحدات العشرات» — reason in tens-units, write the VALUE
    if sub:
        return ("decompositional", f"{_h(ta)} عشرات − {_h(tb)} عشرات = ؟ (اكتب العدد)",
                _h((ta - tb) * 10), None)
    return ("decompositional", f"{_h(ta)} عشرات + {_h(tb)} عشرات = ؟ (اكتب العدد)",
            _h((ta + tb) * 10), None)

def _G1MENT10(n, more=True):
    # g1TENS — ±10 mentally (Qatar 10-2/11-4): the tens digit moves, the ones stay
    return ("decompositional", f"ذهنياً: {_h(n)} {'+' if more else '−'} ١٠ = ؟",
            _h(n + 10 if more else n - 10), None)

def _G1ROUND(a, b, sub=False):
    # g1ESTR «التقريب ثم العملية» — round to the nearest ten, then operate (produce)
    ra, rb = round(a / 10) * 10, round(b / 10) * 10
    if sub:
        return ("rounding", f"قرِّب لأقرب عشرة ثم اطرح: {_h(a)} − {_h(b)} ≈ {_h(ra)} − {_h(rb)} = ؟",
                _h(ra - rb), None)
    return ("rounding", f"قرِّب لأقرب عشرة ثم اجمع: {_h(a)} + {_h(b)} ≈ {_h(ra)} + {_h(rb)} = ؟",
            _h(ra + rb), None)

def _G1PLAUS(a, b, sub=False):
    # g1ESTR «حكم المعقولية» — pick the NEARER result (selection, not production)
    real = a - b if sub else a + b
    good = round(real / 10) * 10
    bad = good + (40 if good <= 50 else -40)
    return ("plausibility", f"{_h(a)} {'−' if sub else '+'} {_h(b)}: أيُّ الناتجين أقرب؟", _h(good),
            {"kind": "shape-pick", "options": [{"v": _h(good)}, {"v": _h(bad)}]})

# --- batch 6: pre-number (POS / CLS / CMPQ / PAT) ---

def _G1POSG(rel, anchor, objects, ans):
    # g1POS «المحاور/الاحتواء» on the position-scene GRID (anchor centred)
    return (("axis" if rel in ("فوق", "تحت", "يمين", "يسار") else "topology"),
            f"انقر ما هو {rel} {anchor[1]}.", ans,
            {"kind": "position-scene", "anchor": anchor[0],
             "objects": [{"v": v, "e": e, "pos": p} for v, e, p in objects]})

def _G1POSB(anchor_e, anchor_name, mid, out):
    # g1POS «الاحتواء والبينية» — BETWEEN two anchors (+ one clearly outside)
    return ("topology", f"انقر ما هو بين {anchor_name}.", mid[0],
            {"kind": "position-scene", "mode": "between", "anchor": anchor_e,
             "objects": [{"v": mid[0], "e": mid[1], "pos": "between"},
                         {"v": out[0], "e": out[1], "pos": "outside"}]})

def _G1SORT(bins, items):
    # g1CLS «الفرز التنفيذي» — execute the sort; the widget emits نعم on a correct full sort
    return ("sorting", f"افرز العناصر في السلّتين: {bins[0]} / {bins[1]}.", "نعم",
            {"kind": "sort-bins", "bins": list(bins),
             "items": [{"e": e, "bin": b} for e, b in items]})

def _G1RULE(group, options, ans):
    # g1CLS «استدلال القاعدة» — name the rule that unites the group
    return ("rule", f"المجموعة: {group} — ما قاعدتها؟", ans,
            {"kind": "shape-pick", "options": [{"v": o} for o in options]})

def _G1ODD(shapes, ans):
    # g1CLS «استدلال القاعدة» — spot the intruder (the rule-breaker)
    return ("rule", "انقر الدخيل الذي لا ينتمي للمجموعة.", ans,
            {"kind": "shape-pick", "options": [{"v": v, "shape": s} for v, s in shapes]})

def _G1MORE(ea, na, name_a, eb, nb, name_b, ask="الأكثر"):
    # g1CMPQ — ONE generalised family (declared, the E1/E2 constitutional path):
    # cases = pick-more / pick-less / equality judgement on two VISIBLE sets
    win = name_a if ((na > nb) == (ask == "الأكثر")) else name_b
    return ("comparative", f"{ea * na} ({name_a}) مقابل {eb * nb} ({name_b}) — انقر {ask}.",
            win, {"kind": "shape-pick", "options": [{"v": name_a}, {"v": name_b}]})

def _G1EQQ(ea, na, eb, nb):
    return ("comparative", f"{ea * na} مقابل {eb * nb} — هل المجموعتان متكافئتان؟",
            "نعم" if na == nb else "لا",
            {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]})

def _G1PATX(seq, options, ans):
    # g1PAT «الإكمال» — extend the repeating pattern (the G2 pattern widget, shapes)
    return ("extend", "أكمل النمط المتكرّر بالأشكال:", ans,
            {"kind": "pattern", "itemType": "shape", "seq": list(seq),
             "options": options})

def _G1PATBRK(emojis, ans_pos):
    # g1PAT «تشخيص البنية» — find WHERE the pattern broke
    pos = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"]
    return ("structure", f"{emojis} — أيُّ موضعٍ كسر النمط؟", pos[ans_pos],
            {"kind": "shape-pick", "options": [{"v": p} for p in pos[:len(emojis.split())] ]})

# --- batch 7: early fractions (HALF / QRT / FRSET-BH). G1 mirrors Fr1's family
# TEMPLATE (تسمية/تجزئة) at the SMALLER range; denominators are CASES, never families
# (the ratified thirds-refinement — same act, adjacent denominator). Grade isolation
# keeps these fully apart from G2's Fr1/Fr2/Fr3. ---

def _G1FJUDGE(widths):
    # g1HALF «الحكم بالتساوي» — SEE unequal segment widths and judge (its own lesson
    # in all six curricula; the judge mode renders the inequality)
    eq = len(set(widths)) == 1
    return ("judge", "انظر إلى تقسيم الشريط: هل الأجزاء متساوية؟",
            "متساوية" if eq else "غير متساوية",
            {"kind": "fraction", "mode": "judge", "widths": list(widths)})

def _G1FN(parts, shaded, distractors):
    # «التسمية» — the Fr1 recognition act, G1 range (wraps the G2 generator)
    q = _FRNAME(parts, shaded, distractors)
    return ("name", q[1], q[2], q[3])

def _G1FS(parts, target):
    # «التجزئة» — the Fr1 production act, G1 range
    q = _FRSHADE(parts, target)
    return ("shade", q[1], q[2], q[3])

def _G1SETEXPR(e_on, n_on, e_off, n_off, asked):
    # g1FRSET «التعبير» — describe a part OF A SET in Bahrain's own «ك من ن» phrasing
    # (the body text: «١ من ٢ لونها أحمر» — not the ك/ن symbol)
    total = n_on + n_off
    good = f"{_h(n_on)} من {_h(total)}"
    bad = f"{_h(n_off)} من {_h(total)}"
    return ("express", f"{e_on * n_on}{e_off * n_off} — {asked}؟ (بصيغة «كذا من كذا»)", good,
            {"kind": "shape-pick", "options": [{"v": good}, {"v": bad}]})

def _G1SETTAKE(denom, total):
    # g1FRSET «الأخذ التوزيعي» — the G2 _FRSET act (groups/share) at G1 range
    q = _FRSET(denom, total)
    return ("take", q[1], q[2], q[3])

# --- batch 8: geometry (SHP3 solids / SHP2 flat shapes). G2's three isolated geometry
# widgets and generators are REUSED at the G1 range (naming, element counting, simple
# composition); G2-G5's property-verification stays out of G1's scope. Both nodes are
# ROOTS and deliberately independent of each other: Kuwait reaches flat shapes THROUGH
# solids' faces (3D→2D) while Qatar/UAE teach 2D first — either edge locks a country. ---

def _G1REC(show, distractors, threeD=False):
    q = _RECOG(show, distractors, threeD)
    return ("recognize", q[1], q[2], q[3])

def _G1ELEM(shape, element, n):
    q = _ECOUNT(shape, element, n)
    return ("elements", q[1], q[2], q[3])

def _G1COMP2(prompt, target, pieces):
    q = _COMPOSE(prompt, target, pieces)
    return ("compose", q[1], q[2], q[3])

def _G1ROLL(prompt, options, ans):
    # g1SHP3 «التصنيف بالخاصية» — rolls / doesn't roll, has flat faces (SA «يتدحرج»
    # + KW 7-8 «التدحرج/الأوجه المستوية», both verbatim)
    return ("classify", prompt, ans,
            {"kind": "shape-pick", "options": options})

def _G1COMP3(parts_label, distractor_label):
    # g1SHP3 «التركيب» (AE-tagged) — the SOURCE act is selectional: UAE u10-L4 says
    # «حوّط الأشكال المستخدمة لتكوين كل شكل مركّب» — pick the solids that form the
    # composite (no fake dragging).
    return ("compose", f"جسمٌ مركّبٌ من {parts_label} — أيُّ المجسّمات استُخدمت؟", parts_label,
            {"kind": "shape-pick", "options": [{"v": parts_label}, {"v": distractor_label}]})

# --- batch 9: measurement (LEN / MASS / CAP / AREA-BH). Two acts settled FROM THE
# SOURCES: Kuwait separates مفهوم/قياس into lesson PAIRS for each attribute (8-4..8-9),
# the other five carry «وحدات غير قياسية» lessons after the comparison ones. So:
# direct compare-order ↔ measure-with-(non-standard)-units = two families. The
# unit-measuring act relates to G2-Q1 (standard units) — cross-grade pair #4 in
# visual_debt.md. G1-AREA (BH 12-6/12-7 body: «يغطي مساحة أكبر/أقل», ordering by
# coverage) is comparison WITHOUT unit counting — genuinely below G2-Q4. ---

def _G1MCOMP(items, ask, ans):
    # «المقارنة المباشرة» — sized blocks; tap the asked one (length/capacity/area)
    return ("compare", ask, ans,
            {"kind": "measure", "mode": "compare",
             "items": [{"v": v, "w": w, "h": h} for v, w, h in items]})

def _G1HEAVIER(left, right, heavier_side):
    # «المقارنة» للوزن — read the TILTED two-pan balance (Oman's الميزان ذو الكفتين)
    win = left[0] if heavier_side == "left" else right[0]
    return ("compare", "انظر إلى ميل الميزان: انقر الأثقل.", win,
            {"kind": "measure", "mode": "heavier",
             "left": {"v": left[0], "e": left[1]}, "right": {"v": right[0], "e": right[1]},
             "heavier": heavier_side})

def _G1RULER(length, unit="مشبك", unit_q="مشبكاً"):
    # «القياس بوحدة غير قياسية» — the ruler act relabelled (non-standard unit)
    return ("measure", f"قِس الجسم: كم {unit_q} يبلغ طوله؟", _h(length),
            {"kind": "measure", "mode": "ruler", "length": length, "max": length + 2,
             "unit": unit})

def _G1BAL(mass):
    # «القياس بوحدة» للوزن — balance with cube-weights (KW 8-7 قياس الوزن, verbatim)
    return ("measure", f"زِنِ الجسم: أضف مكعّبات حتى يتّزن الميزان — كم مكعّباً؟", _h(mass),
            {"kind": "measure", "mode": "balance", "mass": mass,
             "unit": "مكعب", "unitOne": "مكعباً"})

def _G1CUPS(cups):
    # «القياس بالأكواب» للسعة — the container act (KW 8-9 قياس السعة; cups are
    # already a non-standard unit)
    return ("measure", f"املأ الإناء بالأكواب: كم كوباً يملؤه؟", _h(cups),
            {"kind": "measure", "cups": cups})

def _G1COVER(items, ask, ans):
    # g1AREA — ONE generalised family «التغطية» (declared, the CMPQ/E1 path): pick the
    # wider/narrower coverage, or the middle of three (BH body text cases)
    return ("coverage", ask, ans,
            {"kind": "measure", "mode": "compare",
             "items": [{"v": v, "w": w, "h": h} for v, w, h in items]})

# --- batch 10 (final): time / data / money. All on EXISTING widgets (clock, chart
# with picto+bar+tally, sort-bins from batch 6, money with its unit param) — zero
# new widgets, zero extensions. ---

def _G1CLOCK(hour, distractors):
    # g1CLK «قراءة القرص» — full hours only (the G1 range; «العقربان» is a CASE)
    ans = _HRS[hour] + " تماماً"
    opts = [ans] + [_HRS[d] + " تماماً" for d in distractors]
    return ("dial", "انظر إلى عقربَي الساعة: كم الساعة؟", ans,
            {"kind": "clock", "hour": hour, "minute": 0, "options": opts})

def _G1CLOCKD(hour, distractors):
    # g1CLK «المطابقة الرقمية» — match the dial to its digital form (AE تناظرية/رقمية)
    dig = lambda h: f"{_h(h)}:٠٠"
    ans = dig(hour)
    return ("digital", "أيُّ وقتٍ رقميٍّ يطابق القرص؟", ans,
            {"kind": "clock", "hour": hour, "minute": 0,
             "options": [ans] + [dig(d) for d in distractors]})

def _G1HALF_DIAL(hour, distractors):
    # g1HALFH — the short hand sits BETWEEN numerals (the new precision insight)
    ans = _HRS[hour] + " والنصف"
    opts = [ans] + [_HRS[d] + " والنصف" for d in distractors]
    return ("dial", "العقرب القصير بين رقمين: كم الساعة؟", ans,
            {"kind": "clock", "hour": hour, "minute": 30, "options": opts})

def _G1HALF_DIG(hour, distractors):
    dig = lambda h: f"{_h(h)}:٣٠"
    ans = dig(hour)
    return ("digital", "أيُّ وقتٍ رقميٍّ يطابق القرص؟", ans,
            {"kind": "clock", "hour": hour, "minute": 30,
             "options": [ans] + [dig(d) for d in distractors]})

_G1DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]

def _G1DAYAFTER(day_i, before=False):
    # g1CAL «التسلسل الزمني» — the day after/before (months and صباح/مساء are cases)
    ans = _G1DAYS[(day_i + (-1 if before else 1)) % 7]
    return ("sequence", f"ما اليوم الذي {'قبل' if before else 'بعد'} {_G1DAYS[day_i]} مباشرةً؟",
            ans, {"kind": "shape-pick",
                  "options": [{"v": ans}, {"v": _G1DAYS[(day_i + (2 if before else -2)) % 7]}]})

def _G1CALREAD(start_day_i, date):
    # g1CAL «قراءة التقويم» — a month starting on a given day: which weekday is DATE?
    # (dates ≤ 20 — the honest N20 range; BH 6-3 body act «حوّط أول أيام الشهر»)
    ans = _G1DAYS[(start_day_i + (date - 1)) % 7]
    return ("calendar", f"شهرٌ أوّلُ أيامه {_G1DAYS[start_day_i]}: في أيِّ يومٍ يقع التاريخ {_h(date)}؟",
            ans, {"kind": "shape-pick",
                  "options": [{"v": ans}, {"v": _G1DAYS[(start_day_i + date + 2) % 7]}]})

def _G1TALLY(label, n):
    # g1DATA «التنظيم والعدّ» — build the tally for a counted category (KW «جدول
    # علامات العد» verbatim; sort-bins items cover the categorise act)
    return ("organize", f"عُدَّ {label} وسجِّل بعلامات العدّ: {_h(n)}.", _h(n),
            {"kind": "chart", "mode": "build", "type": "tally", "target": n})

def _G1DREAD(data, cat):
    # g1DATA «الاسترجاع» — read a count back from the table
    n = dict(data)[cat]
    return ("read", f"من الجدول: كم عدد فئة «{cat}»؟", _h(n),
            {"kind": "chart", "mode": "read", "type": "pictograph", "data": data,
             "ask": "count", "cat": cat})

def _G1PREAD(data, cat=None, bar=False):
    # g1PICT «القراءة» — read a pictograph (bar TYPE = an AE-tagged CASE, not a family).
    # The chart widget reads by count-of-category or pick-the-most — both used.
    kind = "الأعمدة" if bar else "الصور"
    if cat is not None:
        n = dict(data)[cat]
        return ("read", f"في مخطّط {kind}: كم عدد فئة «{cat}»؟", _h(n),
                {"kind": "chart", "mode": "read", "type": "bar" if bar else "pictograph",
                 "data": data, "ask": "count", "cat": cat})
    win = max(data, key=lambda d: d[1])[0]
    return ("read", f"في مخطّط {kind}: أيُّ فئةٍ هي الأكثر؟", win,
            {"kind": "chart", "mode": "read", "type": "bar" if bar else "pictograph",
             "data": data, "ask": "most"})

def _G1PBUILD(label, n, bar=False):
    # g1PICT «البناء» — produce the representation (G1-light: one category ≤10;
    # G2-DA splits read/build into NODES for its heavy scaled charts — same criterion,
    # different range, so here they stay families of one node)
    return ("build", f"ابنِ التمثيل: {label} = {_h(n)}.", _h(n),
            {"kind": "chart", "mode": "build", "type": "bar" if bar else "tally",
             "target": n})

def _G1MID(coin, options):
    # g1MONEY «تمييز الفئات» — identify a coin's value (فلس: the BH/KW shared word;
    # country-currency authoring = the Q3 debt, extended to G1 in visual_debt.md)
    return ("identify", "ما قيمة هذه القطعة؟", _h(coin),
            {"kind": "money", "mode": "identify", "coin": coin, "options": options,
             "unit": "فلس"})

def _G1MTOTAL(coins):
    # g1MONEY «العدّ والاستعمال» — total a purse (use/buying is a case)
    return ("count", "اجمع قيم القطع: كم المجموع؟", _h(sum(coins)),
            {"kind": "money", "coins": coins, "unit": "فلس"})


G1_NODES = [
    ("g1N10", "الأعداد حتى ١٠", "operational", [
        # family 1 — العدّ/التمثيل (aggregative)
        _G1CNT(7, "🍎", "التفاحات"),
        _G1CNT(4, "🐤", "العصافير"),
        _G1SHOW(6),
        # family 2 — الترميز (symbolic)
        _G1NAME("خمسة", 5),
        _G1NAME("تسعة", 9),
        ("symbolic", "اكتب رمز العدد: «صفر»", "٠", None),
        # family 3 — الموازنة (comparative)
        _G1CMP(7, 4, bigger=True),
        _G1CMP(3, 8, bigger=False),
    ]),
    ("g1N20", "الأعداد من ١١ إلى ٢٠ وموضعتها", "operational", [
        # family 1 — العدّ/التمثيل فوق العشرة (aggregative): a full ten + overflow
        _G1TF(10, 4),
        _G1TF(10, 7),
        _G1SHOW(13),
        _G1SHOW(18),
        # family 2 — الموضعة في السلسلة (sequential): continue / before / between
        _SEQ([14, 15, 16]),
        _SEQ([17, 18, 19]),          # crosses to ٢٠
        _G1BETW(16),
        ("sequential", "ما العدد الذي يسبق ٢٠ مباشرةً؟", "١٩", None),
    ]),
    ("g1ADD", "مفهوم الجمع ضمن ١٠", "operational", [
        # family 1 — التمثيل القصصي (aggregative): enact the join on the ten-frame
        _G1TF(3, 4, story="في الغصن ٣ عصافير، حطّت ٤ أخرى — املأ الإطار: كم صارت؟"),
        _G1TF(5, 2, story="مع سالم ٥ كرات، أعطته أخته كرتين — مثِّل على الإطار: كم معه الآن؟"),
        _G1TF(6, 4, story="في السلة ٦ تفاحات، أضافت أمي ٤ — أكمل الإطار: كم المجموع؟"),
        _G1TF(2, 6),
        # family 2 — الترميز (symbolic). الرأسي والصفر حالتان هنا، لا عائلتان.
        _G1ADD(3, 4),
        _G1ADD(5, 0),                # zero CASE
        _G1ADD(6, 2, vertical=True), # vertical CASE
        _G1ADD(4, 4),
    ]),
    ("g1SUB", "مفهوم الطرح ضمن ١٠", "operational", [
        # family 1 — الإزالة (aggregative): take away and count what remains
        _G1SUBS(9, 4, story="كان على الشجرة ٩ عصافير فطار ٤ — خُذها من المكعّبات: كم بقي؟"),
        _G1SUBS(7, 2),
        _G1SUBS(10, 6),
        # family 2 — الترميز (symbolic). الرأسي وطرح الصفر/الكلّ حالات.
        _G1SUB(8, 3),
        _G1SUB(6, 0),                # zero CASE
        _G1SUB(5, 5, vertical=True), # whole + vertical CASES
        # family 3 — الجزء والكل (decompositional) — بدليل سعودي نصّي (جدول الكل/جزء)
        _G1PW(9, 4),
        _G1PW(10, 3),
    ]),
    # ---- batch 2 ----
    # g1BOND = bonds as NUMBER STRUCTURE (compose/decompose ≤10, pairs of ten). The
    # ten-bridging STRATEGY lives in g1ADDSTR (batch 3) — the map's boundary. Distinct
    # from g1SUB's «جزء-كل» family: there, a STORY whole and its parts read subtractively;
    # here, the number's own systematic pairs (production ↔ completion, the C1/Fr1
    # narrow-decoupling pattern).
    ("g1BOND", "تكوين وتفكيك الأعداد حتى ١٠", "operational", [
        # family 1 — التركيب الإنتاجي (aggregative): fill to the target, report the ADDED part
        _G1COMP(5, 8),
        _G1COMP(3, 7),
        _G1COMP(6, 10),
        _G1COMP(2, 9),
        # family 2 — الإكمال الرمزي (decompositional): supply the missing part
        _G1MISS(7, 4),
        _G1MISS(9, 3),
        _G1TEN(6),
        _G1TEN(8),
    ]),
    # g1REL = the add↔subtract RELATION. Three distinct acts (owner-ratified): flip a
    # given fact / build the related-facts system / solve an unknown in any position.
    # Fact-triangles and Oman's «جهاز العدد المكسور» are display CASES, not families.
    ("g1REL", "علاقة الجمع بالطرح وعائلات الحقائق", "operational", [
        # family 1 — الاشتقاق العكسي (inverse)
        _G1DERIVE(3, 4, sub=True),
        _G1DERIVE(2, 6, sub=True),
        _G1DERIVE(5, 4, sub=False),
        # family 2 — بناء العائلة (family)
        _G1FAM(2, 5, missing="sub"),
        _G1FAM(4, 3, missing="add"),
        # family 3 — الحدّ المفقود (missing): the unknown in any position
        _G1UNK(5, 4, pos="first"),
        _G1UNK(3, 6, pos="second"),
        _G1UNK(5, 4, pos="sub"),
    ]),
    # ---- batch 3: the strategies pair — the heart of the understanding gate ----
    # «two families» here literally means «find the result by TWO DIFFERENT ACTS».
    # Saudi G1 teaches only counting (+number line) — two families suffice the gate,
    # the extension pattern of G2. No BOND edge (ratified: Bahrain owns these without
    # the bonds node).
    ("g1ADDSTR", "استراتيجيات الجمع حتى ٢٠", "operational", [
        # «counting» — count on from the larger (number line = a case)
        _G1NL20(9, 3),
        _G1CNTON(8, 3),
        # «bridging» — complete the ten, add the rest (the frame enacts it)
        _G1BR(8, 5),
        _G1BRSYM(7, 5),
        # «derived» — doubles / near-doubles
        _G1DBL(7),
        _G1DBL(6, near=1),
        # «property» — commutativity / reorder three addends
        _G1PROP(9, 4),
        _G1PROP3(2, 9, 8),
    ]),
    ("g1SUBSTR", "استراتيجيات الطرح حتى ٢٠", "operational", [
        # «counting» — count back (number line = a case; Oman's «القفز خطوتين إلى الخلف»)
        _G1NL20(13, 2, back=True),
        _G1CNTBK(12, 3),
        # «bridging» — Kuwait 6-8 «الإنقاص من العشرة», SETTLED FROM THE BODY TEXT:
        # ones run out (٣ < ٥) → open the ten. subtract-blocks' unbundling IS the act.
        _G1SBR(13, 5),
        _G1SBR(15, 7),
        # «derived» — subtract via a known double
        _G1DBLSUB(7),
        _G1DBLSUB(8),
        # «inverse» — think-addition (relation USED for fluency; understood in g1REL)
        _G1THINKADD(9, 5),
        _G1THINKADD(13, 9),
    ]),
    # ---- batch 4: number structure ----
    # Sibling edges (owner-ratified, from the ACTUAL country orders): PV and N100 are
    # both children of N20 — Saudi teaches place value before the range, Qatar the
    # reverse, so either direction would lock a country. SKIP hangs on N20 only
    # (Qatar ENTERS the 100-range through counting patterns, unit 8 before unit 9).
    ("g1PV", "الآحاد والعشرات (القيمة المكانية)", "operational", [
        # family 1 — التجميع/الوحدنة (aggregative): build / bundle
        _G1BUILD2(34),
        _G1BUILD2(67),
        _G1BUNDLE(20),
        _G1BUNDLE(30),
        # family 2 — التفكيك الرمزي (decompositional) — incl. the ratified 11–19 placement
        _G1TENS(47),
        _G1TENS(82),
        _G1TEEN(7),
        _G1TEEN(4),
    ]),
    ("g1N100", "الأعداد حتى ١٠٠", "operational", [
        # family 1 — التتابعي-الموضعي (sequential): continue / before-after / ±10
        _SEQ([34, 35, 36]),
        _SEQ([69, 70, 71]),
        _G1TENMORE(45, more=True),    # Oman's «مصنع الأعداد» act, verbatim
        _G1TENMORE(60, more=False),
        # family 2 — المقارني (comparative)
        _G1CMP(67, 76, bigger=True),
        _G1CMP(89, 98, bigger=False),
        _G1MID3([45, 54, 49]),
        _G1MID3([72, 27, 70]),
    ]),
    ("g1SKIP", "العدّ القفزي (٢/٥/١٠)", "operational", [
        # family 1 — التتابعي (sequential): continue the skip pattern (chart jumps = a case)
        _SKIP([2, 4, 6]),
        _SKIP([5, 10, 15]),
        _SKIP([20, 30, 40]),
        _SKIP([35, 40, 45]),
        # family 2 — التعدادي (aggregative): count real equal groups by skipping
        _G1PAIRS(4, 2, "أزواج جوارب"),
        _G1PAIRS(3, 5, "قطع من فئة ٥ فلوس"),     # the UAE count-by-5-fils act
        _G1PAIRS(5, 2, "أزواج أحذية"),
        _G1PAIRS(4, 10, "حزم من ١٠ أقلام"),
    ]),
    ("g1EVEN", "الأعداد الزوجية والفردية", "operational", [
        # family 1 — التزويج التمثيلي (pairing): pair the shown things
        _G1PAIRPICK(6, "🧦"),
        _G1PAIRPICK(9, "🍎"),
        _G1PAIRPICK(7, "⭐"),
        _G1PAIRPICK(10, "🐤"),
        # family 2 — القاعدة الرمزية (rule): the ones digit decides
        _G1PARITY(14),
        _G1PARITY(17),
        _G1PARITY(20),
        _G1PARITY(13),
    ]),
    ("g1EST", "تقدير الكميات ثم التحقّق", "operational", [
        # family 1 — الانتقاء الإدراكي (estimation): objects untappable (notap), pick
        _G1ESTP(15, "🔵", [5, 15, 40]),
        _G1ESTP(8, "🟡", [8, 20, 50]),
        _G1ESTP(25, "🟢", [10, 25, 60]),
        _G1ESTP(12, "🔴", [3, 12, 35]),
        # family 2 — حكم المعقولية (reasonableness): which estimate fits the context?
        _G1ESTR("عدد تلاميذ صفّك", 20, 200),
        _G1ESTR("عدد أصابع يديك", 10, 100),
        _G1ESTR("عدد عجلات السيارة", 4, 40),
        _G1ESTR("عدد كتب حقيبتك", 6, 60),
    ]),
    ("g1ORDINAL", "الأعداد الترتيبية", "operational", [
        # family 1 — التحديد (identify): tap the Nth in the row (G2 Ord pattern, reused)
        _G1ORDPICK("الثالث", [("أ", "circle"), ("ب", "triangle"), ("ج", "square"), ("د", "circle")], "ج"),
        _G1ORDPICK("الأول", [("أ", "square"), ("ب", "circle"), ("ج", "triangle")], "أ"),
        _G1ORDPICK("الرابع", [("أ", "circle"), ("ب", "square"), ("ج", "circle"), ("د", "triangle"), ("هـ", "square")], "د"),
        _G1ORDPICK("الخامس", [("أ", "triangle"), ("ب", "circle"), ("ج", "square"), ("د", "circle"), ("هـ", "triangle")], "هـ"),
        # family 2 — التسمية (name): name the position as a number
        _G1ORDNAME("في الطابور: سالم يقف بعد الثاني مباشرةً — ما ترتيبه؟ اكتب الرقم.", 3),
        _G1ORDNAME("في الصفّ: قطة، أرنب، نجمة، كرة — ما ترتيب النجمة؟ اكتب الرقم.", 3),
        _G1ORDNAME("نورة سادسةٌ، ومريم قبلها مباشرةً — ما ترتيب مريم؟ اكتب الرقم.", 5),
        _G1ORDNAME("آخر متسابق في سباقٍ من ٧ — ما ترتيبه؟ اكتب الرقم.", 7),
    ]),
    # ---- batch 5: the two-digit cluster ----
    ("g1TENS", "جمع العشرات وطرحها", "operational", [
        # family 1 — التمثيل بالقضبان (aggregative)
        _G1TADD(30, 20),
        _G1TADD(40, 30),
        _G1TSUB(50, 20),
        _G1TSUB(70, 40),
        # family 2 — التعليل بوحدات العشرات (decompositional) + ±١٠ ذهنياً (قطر نصاً)
        _G1TUNIT(3, 2),
        _G1TUNIT(6, 4, sub=True),
        _G1MENT10(47, more=True),
        _G1MENT10(63, more=False),
    ]),
    ("g1DIG2", "جمع وطرح الأعداد من رقمين (بلا إعادة تجميع)", "operational", [
        # family 1 — التمثيل بالقضبان والمكعبات (aggregative) — the G2 generators, no carry
        _BTB(34, 2),
        _BTB(45, 23),
        _SUBB(57, 4),
        _SUBB(68, 23),
        # family 2 — المنازل الرمزية (decompositional): place-add / place-sub
        _PADD(36, 21),
        _PADD(42, 7),
        _PSUB(58, 25),
        _PSUB(76, 3),
    ]),
    # g1REGR — UAE ALONE (vol-4 body text, u6 L5 p478: «حوّط ١٠ آحاد، أعد تجميعها
    # عشرة واحدة»). SOURCE RANGE ONLY: two-digit + small addend crossing a ten
    # (٨+١٣، ١٥+٥) — the heavy ٤٧+٣٨ carry is G2-A1 behaviour. Cross-grade pair
    # REGR↔A1 documented in visual_debt.md (option-ج preparation).
    ("g1REGR", "إعادة التجميع في الجمع (الحمل المبكر)", "operational", [
        # family 1 — التمثيل الربطي (aggregative): bundle the overflowing ones
        _BTB(15, 5, carry=True),
        _BTB(8, 13, carry=True),
        _BTB(17, 6, carry=True),
        _BTB(26, 7, carry=True),
        # family 2 — المنازل بحملٍ (decompositional): ones-sum ≥ 10 on the place chart
        _PADD(19, 3, carry=True),
        _PADD(15, 7, carry=True),
        _PADD(28, 6, carry=True),
        _PADD(17, 5, carry=True),
    ]),
    # g1ESTR — BAHRAIN ALONE (16-4/16-5/16-8): estimate operation RESULTS.
    ("g1ESTR", "تقدير نواتج الجمع والطرح", "operational", [
        # family 1 — التقريب ثم العملية (rounding): produce the estimate
        _G1ROUND(28, 31),
        _G1ROUND(52, 19),
        _G1ROUND(49, 21, sub=True),
        _G1ROUND(67, 28, sub=True),
        # family 2 — حكم المعقولية (plausibility): pick the nearer result
        _G1PLAUS(31, 29),
        _G1PLAUS(58, 11),
        _G1PLAUS(62, 29, sub=True),
        _G1PLAUS(48, 22, sub=True),
    ]),
    # g1N120 — UAE ONLY (vol-4 evidence). RANGE IS A SCOPE, NOT ENRICHMENT (owner-ratified
    # reversal of the earlier family ruling): questions carry no country tag, so a 101–120
    # item inside the six-country N100 would reach children whose curricula stop at 100 —
    # exactly what the G2 precedent made NODES for (C5/A3/A4). Depends on N100.
    ("g1N120", "الأعداد حتى ١٢٠ (امتداد إماراتي)", "operational", [
        # family 1 — التتابعي-الموضعي (sequential): cross the hundred, place in 100–120
        _SEQ([99, 100, 101]),
        _SEQ([117, 118, 119]),
        ("sequential", "ما العدد الذي قبل ١١١ مباشرةً؟", "١١٠", None),
        ("sequential", "ما العدد الذي بعد ١١٩ مباشرةً؟", "١٢٠", None),
        # family 2 — الترميز (symbolic): read/write 101–120
        ("symbolic", "اكتب رمز العدد: «مئة وخمسة عشر»", "١١٥", None),
        ("symbolic", "اكتب رمز العدد: «مئة وعشرون»", "١٢٠", None),
        ("symbolic", "اكتب رمز العدد: «مئة وسبعة»", "١٠٧", None),
        ("symbolic", "اكتب رمز العدد: «مئة واثنا عشر»", "١١٢", None),
    ]),
    # ---- batch 6: pre-number. All four are DAG ROOTS (no prereqs — they precede
    # number). UAE has none of them (McGraw G1 opens with addition — documented). ----
    ("g1POS", "العلاقات المكانية", "operational", [
        # family 1 — المحاور (axis): above/below/left/right of the anchor
        _G1POSG("فوق", ("🌳", "الشجرة"),
                [("العصفور", "🐦", "above"), ("الأرنب", "🐰", "below"), ("الكرة", "⚽", "right")], "العصفور"),
        _G1POSG("تحت", ("🪑", "الكرسي"),
                [("القطة", "🐱", "below"), ("القبعة", "🎩", "above"), ("الحذاء", "👟", "left")], "القطة"),
        _G1POSG("يمين", ("🏠", "البيت"),
                [("السيارة", "🚗", "right"), ("الشجرة", "🌳", "left"), ("الطائر", "🐦", "above")], "السيارة"),
        _G1POSG("يسار", ("🌳", "الشجرة"),
                [("الدراجة", "🚲", "left"), ("الكرة", "⚽", "right"), ("السحابة", "☁️", "above")], "الدراجة"),
        # family 2 — الاحتواء والبينية (topology): inside/outside/between
        _G1POSG("داخل", ("📦", "الصندوق"),
                [("الكرة", "⚽", "inside"), ("القطة", "🐱", "outside"), ("الحذاء", "👟", "below")], "الكرة"),
        _G1POSG("خارج", ("📦", "الصندوق"),
                [("الأرنب", "🐰", "outside"), ("الكرة", "⚽", "inside")], "الأرنب"),
        _G1POSB("🌳", "الشجرتين", ("الأرنب", "🐰"), ("العصفور", "🐦")),
        _G1POSB("🚗", "السيارتين", ("الكرة", "⚽"), ("القطة", "🐱")),
    ]),
    ("g1CLS", "التصنيف بخاصية", "operational", [
        # family 1 — الفرز التنفيذي (sorting): place every item in its bin (emits نعم)
        # NOTE: emoji chosen from the pre-2018 set only — newer glyphs (e.g. 🫐) render
        # as empty boxes on Windows-10 system fonts, unusable for a 6-year-old.
        _G1SORT(("أحمر", "أزرق"), [("🍎", 0), ("🔵", 1), ("🍓", 0), ("💙", 1), ("🌹", 0)]),
        _G1SORT(("حيوانات", "فواكه"), [("🐱", 0), ("🍌", 1), ("🐰", 0), ("🍎", 1)]),
        _G1SORT(("يطير", "لا يطير"), [("🐦", 0), ("🐟", 1), ("🦋", 0), ("🐢", 1)]),
        _G1SORT(("طعام", "ألعاب"), [("🍞", 0), ("⚽", 1), ("🍌", 0), ("🧸", 1), ("🍎", 0)]),
        # family 2 — استدلال القاعدة (rule): name the rule / spot the intruder
        _G1RULE("🍎 🍓 🌹", ["كلّها حمراء", "كلّها طعام"], "كلّها حمراء"),
        _G1RULE("🐦 🦋 ✈️", ["كلّها تطير", "كلّها حيوانات"], "كلّها تطير"),
        _G1ODD([("أ", "circle"), ("ب", "circle"), ("ج", "triangle"), ("د", "circle")], "ج"),
        _G1ODD([("أ", "square"), ("ب", "circle"), ("ج", "square"), ("د", "square")], "ب"),
    ]),
    # g1CMPQ — ONE generalised family, DECLARED (the constitutional E1/E2 path:
    # understanding via two generalisation items). No fabricated second act.
    ("g1CMPQ", "مقارنة الكميات (أكثر/أقل/يكافئ)", "operational", [
        _G1MORE("🍎", 7, "التفاح", "🍐", 4, "الكمثرى", ask="الأكثر"),
        _G1MORE("⚽", 3, "الكرات", "🧸", 6, "الدمى", ask="الأكثر"),
        _G1MORE("🐦", 5, "العصافير", "🐱", 8, "القطط", ask="الأقل"),
        _G1MORE("🍓", 9, "الفراولة", "🍌", 6, "الموز", ask="الأقل"),
        _G1EQQ("🔵", 5, "🟡", 5),
        _G1EQQ("🍎", 6, "🍐", 4),
        _G1EQQ("⭐", 7, "🌙", 7),
        _G1MORE("🚗", 8, "السيارات", "🚲", 5, "الدراجات", ask="الأكثر"),
    ]),
    ("g1PAT", "الأنماط المتكررة", "operational", [
        # family 1 — الإكمال (extend): what comes next? (the G2 pattern widget, shapes)
        _G1PATX(["circle", "square", "circle", "square"],
                [{"v": "دائرة", "shape": "circle"}, {"v": "مربع", "shape": "square"}], "دائرة"),
        _G1PATX(["triangle", "triangle", "circle", "triangle", "triangle"],
                [{"v": "مثلث", "shape": "triangle"}, {"v": "دائرة", "shape": "circle"}], "دائرة"),
        _G1PATX(["square", "circle", "circle", "square", "circle", "circle"],
                [{"v": "مربع", "shape": "square"}, {"v": "دائرة", "shape": "circle"}], "مربع"),
        # family 2 — تشخيص البنية (structure): where did the pattern break? / its rule
        _G1PATBRK("🔴 🔵 🔴 🔴", 3),
        _G1PATBRK("⭐ 🌙 ⭐ 🌙 🌙", 4),
        ("structure", "النمط: 🔴 🔵 🔵 🔴 🔵 🔵 — ما قاعدته؟", "أحمر ثم أزرقان",
         {"kind": "shape-pick", "options": [{"v": "أحمر ثم أزرقان"}, {"v": "أحمر ثم أزرق"}]}),
        # family 3 — التماثل (symmetry) — Omani enrichment family (an ACT, not a range)
        ("symmetry", "🦋 الفراشة: هل جانباها متماثلان؟", "نعم",
         {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("symmetry", "🧤 قفّازٌ واحد: هل نصفاه الأيمن والأيسر متطابقان بالطيّ؟", "لا",
         {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]}),
    ]),
    # ---- batch 7: early fractions ----
    ("g1HALF", "الأجزاء المتساوية والنصف", "operational", [
        # family 1 — الحكم بالتساوي (judge): see the (in)equality and rule on it
        _G1FJUDGE([1, 1]),
        _G1FJUDGE([2, 1]),
        _G1FJUDGE([1, 1, 1, 1]),
        # family 2 — التسمية (name): the Fr1 recognition act on halves
        # (distractors = numerator counts, the G2 generator's contract)
        _G1FN(2, 1, [2]),
        _G1FN(2, 2, [1]),
        _G1FN(2, 1, [0, 2]),
        # family 3 — التجزئة (shade): produce the half (sharing fairly is a case)
        _G1FS(2, 1),
        ("shade", "شارِك زميلك بالتساوي: ظلِّل نصيبه — نصف الشريط.", "١/٢",
         {"kind": "fraction", "mode": "shade", "parts": 2, "target": 1}),
    ]),
    # g1QRT — quarters; THIRDS ARE CASES inside the same two acts (ratified refinement:
    # a family is an ACT, a denominator is not — the Fr1 precedent). Thirds evidence:
    # SA «الثلث والربع» ch12, BH 15-4. Oman stops at halves — not in this path.
    ("g1QRT", "الربع (والثلث حالةً)", "operational", [
        # family 1 — التسمية (name)
        _G1FN(4, 1, [2, 3]),
        _G1FN(4, 3, [1, 2]),
        _G1FN(3, 1, [2, 3]),              # THIRD — case (SA/BH)
        _G1FN(4, 2, [1, 3]),
        # family 2 — التجزئة (shade)
        _G1FS(4, 1),
        _G1FS(4, 2),
        _G1FS(3, 1),                      # THIRD — case (SA/BH)
        _G1FS(4, 3),
    ]),
    # g1FRSET — BAHRAIN ALONE (15-5/15-6 body text: «أُعبِّر عن أجزاء من مجموعة»،
    # «١ من ٢ لونها أحمر»). The SET model is a distinct act from region partitioning —
    # its own node, consistent with Fr3 vs Fr1 in G2. Cross-grade pair FRSET↔Fr3
    # documented in visual_debt.md (option-ج preparation).
    ("g1FRSET", "الكسر من مجموعة", "operational", [
        # family 1 — التعبير (express): describe the part of the set («ك من ن»)
        _G1SETEXPR("🍎", 2, "⚪", 2, "ما جزء التفاح الأحمر من المجموعة"),
        _G1SETEXPR("🔵", 1, "⚪", 1, "ما جزء الكرات الزرقاء"),
        _G1SETEXPR("🌹", 3, "⚪", 1, "ما جزء الورود الحمراء"),
        _G1SETEXPR("🐦", 2, "🐱", 4, "ما جزء العصافير من الحيوانات"),
        # family 2 — الأخذ التوزيعي (take): share out and take one group (G2 _FRSET act)
        _G1SETTAKE(2, 6),
        _G1SETTAKE(2, 8),
        _G1SETTAKE(4, 8),
        _G1SETTAKE(2, 4),
    ]),
    # ---- batch 8: geometry — two independent ROOTS (the country orders conflict) ----
    ("g1SHP3", "المجسّمات", "operational", [
        # family 1 — التعرّف والتسمية (recognize)
        _G1REC("cube", ["sphere", "cone"], threeD=True),
        _G1REC("sphere", ["cube", "cylinder"], threeD=True),
        _G1REC("cylinder", ["cone", "sphere"], threeD=True),
        # family 2 — التصنيف بالخاصية (classify): rolling / flat faces (SA + KW verbatim)
        _G1ROLL("أيُّ المجسّمين يتدحرج؟",
                [{"v": "كرة", "shape": "sphere"}, {"v": "مكعب", "shape": "cube"}], "كرة"),
        _G1ROLL("أيُّ المجسّمين لا يتدحرج؟",
                [{"v": "مكعب", "shape": "cube"}, {"v": "كرة", "shape": "sphere"}], "مكعب"),
        _G1ROLL("المكعب: هل له أوجهٌ مستوية؟",
                [{"v": "نعم"}, {"v": "لا"}], "نعم"),
        # family 3 — التركيب (compose) — AE-tagged (u10-L4: «حوّط الأشكال المستخدمة»)
        _G1COMP3("مكعبٍ فوقه مخروط", "كرةٍ وأسطوانة"),
        _G1COMP3("أسطوانةٍ فوقها كرة", "مكعبين"),
    ]),
    ("g1SHP2", "الأشكال المستوية", "operational", [
        # family 1 — التعرّف والتسمية (recognize)
        _G1REC("rectangle", ["square", "triangle"]),
        _G1REC("triangle", ["circle", "square"]),
        _G1REC("circle", ["rectangle", "triangle"]),
        # family 2 — عدّ العناصر (elements): sides/vertices (KW 7-9 + QA 14-1/14-2 verbatim)
        _G1ELEM("square", "sides", 4),
        _G1ELEM("triangle", "vertices", 3),
        _G1ELEM("rectangle", "sides", 4),
        # family 3 — التركيب (compose): build the shape from pieces (AE/QA/OM evidence)
        _G1COMP2("ركِّب المربع من المثلثين.", "square", ["triangle", "triangle"]),
        _G1COMP2("ركِّب المستطيل من المربعين.", "rectangle", ["square", "square"]),
    ]),
    # ---- batch 9: measurement ----
    ("g1LEN", "الطول: مقارنةً وقياساً", "operational", [
        # family 1 — المقارنة والترتيب المباشر (compare)
        _G1MCOMP([("القلم", 120, 16), ("المسطرة", 190, 16)], "انقر الأطول.", "المسطرة"),
        _G1MCOMP([("الحبل", 210, 14), ("الخيط", 90, 14)], "انقر الأقصر.", "الخيط"),
        _G1MCOMP([("أ", 80, 16), ("ب", 150, 16), ("ج", 220, 16)], "انقر الأطول من الثلاثة.", "ج"),
        _G1MCOMP([("أ", 200, 16), ("ب", 70, 16), ("ج", 140, 16)], "انقر الأوسط طولاً.", "ج"),
        # family 2 — القياس بوحدة غير قياسية (measure) — «الأدوات المناسبة» القطرية حالة
        _G1RULER(4),
        _G1RULER(7),
        _G1RULER(5, unit="قدم", unit_q="قدماً"),
        ("measure", "بمَ تقيس طول كتابك؟", "بالمشابك",
         {"kind": "shape-pick", "options": [{"v": "بالمشابك"}, {"v": "بالأكواب"}]}),
    ]),
    ("g1MASS", "الوزن: مقارنةً وقياساً", "operational", [
        # family 1 — المقارنة بقراءة الميزان (compare) + «تساوي الأوزان» العُمانية حالةً
        _G1HEAVIER(("البطيخة", "🍉"), ("التفاحة", "🍎"), "left"),
        _G1HEAVIER(("البالون", "🎈"), ("الكتاب", "📚"), "right"),
        _G1HEAVIER(("الجزرة", "🥕"), ("القرع", "🎃"), "right"),
        ("compare", "اتّزن الميزان تماماً بجسمين: هل وزناهما متساويان؟", "نعم",
         {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        # family 2 — القياس بوحدة (measure) — KW 8-7 «قياس الوزن» نصاً (موسومة KW)
        _G1BAL(3),
        _G1BAL(5),
        _G1BAL(4),
        _G1BAL(6),
    ]),
    ("g1CAP", "السعة: مقارنةً وقياساً", "operational", [
        # family 1 — المقارنة المباشرة (compare) — BH «أحوّط الأكثر سعة» نصاً
        _G1MCOMP([("الإبريق", 60, 110), ("الكوب", 40, 50)], "انقر الأكثر سعةً.", "الإبريق"),
        _G1MCOMP([("القارورة", 36, 130), ("الفنجان", 40, 40)], "انقر الأقلّ سعةً.", "الفنجان"),
        _G1MCOMP([("أ", 44, 60), ("ب", 50, 120), ("ج", 40, 85)], "انقر الأكثر سعةً.", "ب"),
        _G1MCOMP([("أ", 46, 100), ("ب", 40, 45), ("ج", 44, 70)], "انقر الأقلّ سعةً.", "ب"),
        # family 2 — القياس بالأكواب (measure) — KW 8-9 «قياس السعة» نصاً
        _G1CUPS(3),
        _G1CUPS(5),
        _G1CUPS(4),
        _G1CUPS(6),
    ]),
    # g1AREA — BAHRAIN ALONE (12-6/12-7 body: coverage comparison and ordering — no
    # unit counting, genuinely BELOW G2-Q4's square-counting; two graded nodes across
    # grades, no clash). ONE generalised family, declared (the CMPQ/E1 path).
    ("g1AREA", "المساحة: مقارنة التغطية", "operational", [
        _G1COVER([("السجادة", 150, 90), ("المنديل", 60, 45)], "انقر ما يغطّي مساحةً أكبر.", "السجادة"),
        _G1COVER([("الباب", 70, 170), ("النافذة", 60, 60)], "انقر ما يغطّي مساحةً أكبر.", "الباب"),
        _G1COVER([("أ", 50, 40), ("ب", 120, 100)], "انقر ما يغطّي مساحةً أقلّ.", "أ"),
        _G1COVER([("الطاولة", 130, 80), ("الكرسي", 60, 55)], "انقر ما يغطّي مساحةً أقلّ.", "الكرسي"),
        _G1COVER([("أ", 40, 35), ("ب", 90, 70), ("ج", 150, 110)], "رتّب بالتغطية: انقر الأوسع.", "ج"),
        _G1COVER([("أ", 45, 40), ("ب", 100, 80), ("ج", 160, 120)], "رتّب بالتغطية: انقر الأضيق.", "أ"),
        _G1COVER([("أ", 60, 50), ("ب", 130, 95), ("ج", 95, 70)], "انقر الأوسط تغطيةً.", "ج"),
        _G1COVER([("أ", 140, 100), ("ب", 55, 45), ("ج", 95, 75)], "انقر الأوسط تغطيةً.", "ج"),
    ]),
    # ---- batch 10 (final): time / data / money ----
    ("g1CLK", "قراءة الساعة الكاملة", "operational", [
        # family 1 — قراءة القرص (dial); «العقربان» (QA 13-1 + BH 6-4 vocabulary) a CASE
        _G1CLOCK(3, [4, 2]),
        _G1CLOCK(7, [6, 8]),
        _G1CLOCK(12, [11, 1]),
        ("dial", "العقرب الطويل على ١٢ والقصير على ٩ — أيُّ عقربٍ يحدّد الساعة؟", "القصير",
         {"kind": "shape-pick", "options": [{"v": "القصير"}, {"v": "الطويل"}]}),
        # family 2 — المطابقة الرقمية (digital): dial ↔ digital form (AE u8 L5-6)
        _G1CLOCKD(5, [6, 4]),
        _G1CLOCKD(9, [8, 10]),
        _G1CLOCKD(2, [12, 3]),
        _G1CLOCKD(11, [10, 12]),
    ]),
    # g1HALFH — QA/AE ALONE: a PRECISION SCOPE the others don't own (the N120 logic —
    # a CASE inside CLK would reach Bahraini children whose curriculum stops at full
    # hours; SETTLED FROM THE BODY: BH ch6 has zero «نصف» mentions).
    ("g1HALFH", "نصف الساعة", "operational", [
        _G1HALF_DIAL(3, [4, 2]),
        _G1HALF_DIAL(7, [8, 6]),
        _G1HALF_DIAL(10, [11, 9]),
        _G1HALF_DIAL(1, [2, 12]),
        _G1HALF_DIG(4, [5, 3]),
        _G1HALF_DIG(8, [7, 9]),
        _G1HALF_DIG(12, [11, 1]),
        _G1HALF_DIG(6, [5, 7]),
    ]),
    ("g1CAL", "اليوم والأسبوع والتقويم", "operational", [
        # family 1 — التسلسل الزمني (sequence); months and صباح/مساء are cases
        _G1DAYAFTER(3),                  # بعد الثلاثاء
        _G1DAYAFTER(6, before=True),     # قبل الجمعة
        ("sequence", "أكمل أشهر السنة: محرّم، صفر، ربيع الأول، ؟", "ربيع الآخر",
         {"kind": "shape-pick", "options": [{"v": "ربيع الآخر"}, {"v": "رجب"}]}),
        ("sequence", "تتناول الفطور وتذهب إلى المدرسة: صباحاً أم مساءً؟", "صباحاً",
         {"kind": "shape-pick", "options": [{"v": "صباحاً"}, {"v": "مساءً"}]}),
        # family 2 — قراءة التقويم (calendar) — BH 6-3 body act; dates ≤ 20 (N20 range)
        _G1CALREAD(0, 8),                # يبدأ السبت → ٨ سبت
        _G1CALREAD(1, 10),
        _G1CALREAD(3, 15),
        _G1CALREAD(0, 1),
    ]),
    ("g1DATA", "تنظيم البيانات وعدُّها", "operational", [
        # family 1 — التنظيم والعدّ (organize): sort-bins (batch-6 widget, reused) +
        # tally building (KW «جدول علامات العد» verbatim). Carroll = an OM-tagged case.
        ("organize", "نظِّم البيانات: افرز العناصر في فئتَي «فواكه/حيوانات».", "نعم",
         {"kind": "sort-bins", "bins": ["فواكه", "حيوانات"],
          "items": [{"e": "🍎", "bin": 0}, {"e": "🐱", "bin": 1}, {"e": "🍌", "bin": 0},
                    {"e": "🐰", "bin": 1}, {"e": "🍓", "bin": 0}]}),
        _G1TALLY("التفاحات", 7),
        _G1TALLY("العصافير", 5),
        ("organize", "مخطّط كارول: ضع «قطة سوداء» في خانة (حيوان، أسود) — أيُّ خانة؟", "حيوان أسود",
         {"kind": "shape-pick", "options": [{"v": "حيوان أسود"}, {"v": "حيوان غير أسود"}]}),
        # family 2 — الاسترجاع (read): pull a count back out of the table
        _G1DREAD([["تفاح", 4], ["موز", 6], ["عنب", 3]], "موز"),
        _G1DREAD([["قطط", 5], ["عصافير", 2], ["أسماك", 7]], "قطط"),
        _G1DREAD([["أحمر", 3], ["أزرق", 8], ["أخضر", 5]], "أخضر"),
        _G1DREAD([["كرة", 6], ["دمية", 4], ["مكعب", 2]], "دمية"),
    ]),
    # g1PICT — ONE node with read/build FAMILIES (G2-DA splits them into NODES for its
    # heavy scaled charts — same decoupling criterion, lighter G1 range: ≤3 categories,
    # counts ≤10). Bar items = AE-tagged CASES (representation ≠ family, ratified).
    ("g1PICT", "التمثيل بالصور وقراءته", "operational", [
        # family 1 — القراءة (read)
        _G1PREAD([["أ", 4], ["ب", 7], ["ج", 2]]),
        _G1PREAD([["تفاح", 3], ["موز", 5], ["عنب", 4]], cat="موز"),
        _G1PREAD([["أ", 5], ["ب", 3], ["ج", 6]], bar=True),       # bar — AE case
        _G1PREAD([["قطط", 2], ["عصافير", 6]], cat="عصافير"),
        # family 2 — البناء (build)
        _G1PBUILD("التفاحات", 6),
        _G1PBUILD("العصافير", 4),
        _G1PBUILD("الكتب", 7, bar=True),                          # bar — AE case
        _G1PBUILD("الأقلام", 5),
    ]),
    ("g1MONEY", "النقود: فئاتٍ وعدّاً", "operational", [
        # family 1 — تمييز الفئات (identify) — «فلس» BH/KW المشتركة (دَين العملة القُطرية
        # موثَّق في visual_debt — امتداد دين Q3 صف٢)
        _G1MID(5, [1, 10]),
        _G1MID(10, [5, 25]),
        _G1MID(25, [10, 50]),
        _G1MID(50, [25, 5]),
        # family 2 — العدّ والاستعمال (count): total a purse; buying is a case
        _G1MTOTAL([5, 5]),
        _G1MTOTAL([10, 5]),
        _G1MTOTAL([10, 10, 5]),
        ("count", "ثمن اللعبة ٧ — معك قطعتا ٥ و٢: هل تكفي؟", "نعم",
         {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]}),
    ]),
]

# g1N10 is the root; N20/ADD/SUB/BOND hang off it; REL needs BOTH operation concepts.
# NOTE (owner-ratified): NO BOND→ADDSTR edge ever — Bahrain has the strategies without
# the bonds node, and an edge absent from one owning country would lock its path.
G1_EDGES = [
    ("g1N10", "g1N20"), ("g1N10", "g1ADD"), ("g1N10", "g1SUB"),
    ("g1N10", "g1BOND"),
    ("g1ADD", "g1REL"), ("g1SUB", "g1REL"),
    # strategies: range (N20) + the operation concept. NEVER BOND (ratified — Bahrain).
    ("g1N20", "g1ADDSTR"), ("g1ADD", "g1ADDSTR"),
    ("g1N20", "g1SUBSTR"), ("g1SUB", "g1SUBSTR"),
    # batch 4 — siblings under N20 (ratified: PV↔N100 either direction locks a country;
    # SKIP←N20 because Qatar enters the range THROUGH counting patterns)
    ("g1N20", "g1PV"), ("g1N20", "g1N100"), ("g1N20", "g1SKIP"), ("g1N20", "g1EVEN"),
    ("g1N10", "g1EST"), ("g1N10", "g1ORDINAL"),
    ("g1N100", "g1N120"),
    # batch 5 — TENS needs the unitising AND both operation concepts (it adds and
    # subtracts tens); DIG2 follows TENS (sourced in all four owners: QA 10-1→10-3,
    # KW و٦د٥→د٦, BH 16-1→16-2, AE و٦د١→د٢); the two country-singletons hang off DIG2.
    ("g1PV", "g1TENS"), ("g1ADD", "g1TENS"), ("g1SUB", "g1TENS"),
    ("g1TENS", "g1DIG2"),
    ("g1DIG2", "g1REGR"), ("g1DIG2", "g1ESTR"),
    # batch 7 — HALF is a root (a partitioning act, taught in geometry chapters);
    # quarters deepen halves; the set model needs halves AND counting the set.
    ("g1HALF", "g1QRT"),
    ("g1HALF", "g1FRSET"), ("g1N10", "g1FRSET"),
    # batch 9 — measuring iterates a unit and counts it → N10; AREA stays a root
    # (perceptual coverage comparison, no counting).
    ("g1N10", "g1LEN"), ("g1N10", "g1MASS"), ("g1N10", "g1CAP"),
    # batch 10 — the dial reads numerals to 12 → N20 (Kuwait teaches both inside its
    # unit 2 — simultaneous, no lock); precision deepens the dial; the calendar's
    # dates stay ≤20; data/money count → N10; representation follows organizing.
    ("g1N20", "g1CLK"), ("g1CLK", "g1HALFH"), ("g1N20", "g1CAL"),
    ("g1N10", "g1DATA"), ("g1DATA", "g1PICT"), ("g1N10", "g1MONEY"),
]

# spine nodes: all six countries. BOND: five (Bahrain teaches ten-making only as an
# ADDSTR strategy — no bonds lessons). REL: five (Saudi G1 has no fact families).
# Strategies: all six (SA via counting+number line; KW bridging settled from the body
# text of lesson 6-8 «الطرح بالإنقاص من العشرة»).
NODE_COUNTRIES.update({
    "g1N10": _ALL6, "g1N20": _ALL6, "g1ADD": _ALL6, "g1SUB": _ALL6,
    "g1BOND": ("SA", "AE", "QA", "KW", "OM"),
    "g1REL": ("AE", "QA", "KW", "OM", "BH"),
    "g1ADDSTR": _ALL6, "g1SUBSTR": _ALL6,
    # batch 4. PV/N100/SKIP all six — Oman SETTLED FROM THE BODY TEXT (S1 p22 hundred
    # chart «الأعداد الأكبر من ٢٠»; S2 p32 tens to ١٠٠; p33 ±10 machine; p35 tens+ones
    # cards). EVEN: Oman (S1, 3 lessons) + Bahrain (11-13). EST: no Qatar/UAE.
    # ORDINAL: QA 1-7, SA ch4, AE u5-L1. N120: UAE alone (vol 4) — range is a scope.
    "g1PV": _ALL6, "g1N100": _ALL6, "g1SKIP": _ALL6,
    "g1EVEN": ("OM", "BH"),
    "g1EST": ("SA", "BH", "KW", "OM"),
    "g1ORDINAL": ("QA", "SA", "AE"),
    "g1N120": ("AE",),
    # batch 5 — the two-digit cluster lives in FOUR curricula (Saudi/Oman G1 stop
    # within 20 operationally). REGR: UAE alone (u6 L5). ESTR: Bahrain alone (16-5/16-8).
    "g1TENS": ("KW", "QA", "BH", "AE"),
    "g1DIG2": ("KW", "QA", "BH", "AE"),
    "g1REGR": ("AE",),
    "g1ESTR": ("BH",),
    # batch 6 — pre-number. CMPQ settled FROM THE BODY TEXTS (Oman pp4-6: pure counting,
    # no more/less act; Qatar: only compare-SITUATION word problems = subtraction).
    # UAE: none of the four (McGraw G1 opens with addition).
    "g1POS": ("SA", "KW", "QA"),
    "g1CLS": ("SA", "BH", "KW", "OM"),
    "g1CMPQ": ("SA", "BH", "KW"),
    "g1PAT": ("SA", "BH", "KW", "OM"),
    # batch 7 — fractions. HALF in all six (equal-parts is its own lesson everywhere);
    # QRT five (Oman stops at halves); FRSET Bahrain alone (set model, 15-5/15-6).
    "g1HALF": _ALL6,
    "g1QRT": ("SA", "BH", "QA", "KW", "AE"),
    "g1FRSET": ("BH",),
    # batch 8 — geometry, BOTH all six. SHP2's Kuwait membership SETTLED FROM THE BODY
    # TEXT (7-9 p116: naming مستطيل/مثلث/مربع/دائرة + counting الأضلاع والرؤوس).
    "g1SHP3": _ALL6,
    "g1SHP2": _ALL6,
    # batch 9 — measurement. LEN all six (Oman: footprint S1 + ordering S2). MASS/CAP
    # four (Qatar/UAE have no weight/capacity in G1 — documented). AREA Bahrain alone.
    "g1LEN": _ALL6,
    "g1MASS": ("OM", "SA", "BH", "KW"),
    "g1CAP": ("OM", "SA", "BH", "KW"),
    "g1AREA": ("BH",),
    # batch 10 — time/data/money. CLK five (Saudi G1 has no clock). HALFH settled
    # FROM THE BODY: Bahrain ch6 reads FULL hours only (zero «نصف» mentions) → QA/AE.
    # CAL three. DATA four (no SA/BH). PICT three. MONEY four (no QA; AE uses fils as
    # counting props only).
    "g1CLK": ("OM", "BH", "KW", "QA", "AE"),
    "g1HALFH": ("QA", "AE"),
    "g1CAL": ("BH", "KW", "OM"),
    "g1DATA": ("QA", "AE", "KW", "OM"),
    "g1PICT": ("AE", "OM", "QA"),
    "g1MONEY": ("SA", "BH", "OM", "KW"),
})
# =================== end GRADE 1 batch 1 ===================


# =================================================================================
# ===== GRADE 3 — batch 1 (التأسيس): place value & large numbers ==================
# g3PV / g3PV5 / g3BIG / g3CMP4 / g3CMP10 / g3ROUND / g3ROUND4.
# RANGE TIERS are the law here (the ratified N120/REGR rule: range is a SCOPE, so a
# wider range is a NODE, never an enrichment) — merging any two tiers would leak
# numbers beyond some owner's source: 5-digit exceeds the UAE («حتى منزلة الآلاف»,
# u1-L1 p9), 6-digit exceeds SA/BH (stop at عشرات الألوف), nearest-1000 exceeds
# KW/QA/OM, and Oman's whole number-sense unit (u21, read from the body) stays ≤1000.
# Questions are shared (no country tags — the 120 decision), so each tier's items
# must stay inside ITS sources' range; test_grade3 guards every cap.
# =================================================================================

def _G3BUILD(n, desc):
    # «التكوين/التفكيك» — compose the number from its named place parts
    return ("compose", f"كوِّن العدد: {desc}.", _h(n), None)

def _G3EXPAND(n, shown, missing):
    # «التكوين/التفكيك» — expanded form with ONE place value blanked (text expand —
    # the expand3 widget is 3-digit by design; no widget extension needed here)
    return ("compose", f"فكِّك: {_h(n)} = {shown} — كم قيمة المنزلة الناقصة؟",
            _h(missing), None)

def _G3DVAL(n, digit, value):
    # «قيمة المنزلة» — what is THIS digit worth inside the number?
    return ("place", f"ما قيمة الرقم {_h(digit)} في العدد {_h(n)}؟", _h(value), None)

def _G3DPLACE(n, digit, place, places):
    # «قيمة المنزلة» — name the place the digit sits in
    return ("place", f"في أيِّ منزلةٍ يقع الرقم {_h(digit)} في العدد {_h(n)}؟", place,
            {"kind": "shape-pick", "options": [{"v": p} for p in places]})

def _G3PVPAT(seq, ans):
    # «امتداد النمط المنزلي» — SA/BH «الجبر: أنماط الأعداد»: jumps of a whole place
    return ("pattern", "أكمل النمط: " + "، ".join(_h(n) for n in seq) + "، ؟",
            _h(ans), None)

def _G3PICKBIG(a, b, bigger=True):
    # «موازنة عددين» — tap the bigger/smaller of two
    ans = (max if bigger else min)(a, b)
    return ("compare", f"انقر العدد {'الأكبر' if bigger else 'الأصغر'}.", _h(ans),
            {"kind": "shape-pick", "options": [{"v": _h(a)}, {"v": _h(b)}]})

def _G3SYM(a, b):
    # «موازنة عددين» — choose the comparison symbol (Oman u21 uses < and > explicitly)
    return ("compare", f"أيُّ علامةٍ تصحّ: {_h(a)} ؟ {_h(b)}", ">" if a > b else "<",
            {"kind": "shape-pick", "options": [{"v": ">"}, {"v": "<"}]})

def _G3MID3(nums):
    # «ترتيب متعدد» — order three, report the MIDDLE (the proven g1N100 emit trick:
    # one string out, gate stays blind to the act's surface)
    s = sorted(nums)
    return ("order", "رتّب من الأصغر إلى الأكبر واكتب الأوسط: "
            + "، ".join(_h(n) for n in nums), _h(s[1]), None)

def _G3ORDPICK(nums, asc=True):
    # «ترتيب متعدد» — order four, report the FIRST (asc → smallest, desc → largest)
    ans = min(nums) if asc else max(nums)
    return ("order", f"رتّب {'تصاعدياً' if asc else 'تنازلياً'} واكتب الأوّل: "
            + "، ".join(_h(n) for n in nums), _h(ans), None)

def _G3RND(n, ref, nl=False, cap=1000):
    # «التقريب المباشر» — round-half-up (the sources' «٥ فما فوق نقرّب تصاعدياً», Oman
    # u21 p56 verbatim; Python's round() is banker's — never use it here)
    ans = (n + ref // 2) // ref * ref
    label = {10: "عشرة", 100: "مئة", 1000: "ألف"}[ref]
    vis = ({"kind": "number-line", "min": 0, "max": cap, "step": ref, "target": n}
           if nl else None)
    return ("rounding", f"قرِّب {_h(n)} إلى أقرب {label}.", _h(ans), vis)

def _G3RNDINV(target, ref, good, bads):
    # «التقريب العكسي» — which number LANDS on the target when rounded? (Oman u21
    # q3 verbatim: «اكتب أمثلة تتطابق مع العبارة» — producing/selecting pre-images)
    label = {10: "عشرة", 100: "مئة", 1000: "ألف"}[ref]
    return ("inverse", f"أيُّ الأعداد يؤول إلى {_h(target)} عند تقريبه إلى أقرب {label}؟",
            _h(good), {"kind": "shape-pick",
                       "options": [{"v": _h(v)} for v in [good] + list(bads)]})

_PLACES4 = ["الآحاد", "العشرات", "المئات", "الآلاف"]
_PLACES5 = _PLACES4 + ["عشرات الألوف"]
_PLACES6 = _PLACES5 + ["مئات الألوف"]

G3_NODES = [
    ("g3PV", "القيمة المنزلية ضمن الألوف", "operational", [
        # family 1 — التكوين/التفكيك (compose)
        _G3BUILD(3472, "٣ آلاف و٤ مئات و٧ عشرات و٢ آحاد"),
        _G3BUILD(5018, "٥ آلاف و١ عشرات و٨ آحاد"),          # zero-hundreds CASE
        _G3EXPAND(2693, "٢٠٠٠ + ؟ + ٩٠ + ٣", 600),
        # family 2 — قيمة المنزلة (place)
        _G3DVAL(4725, 7, 700),
        _G3DVAL(8356, 8, 8000),
        _G3DPLACE(6041, 6, "الآلاف", _PLACES4),
        # family 3 — امتداد النمط المنزلي (pattern) — SA/BH «الجبر: أنماط الأعداد»
        _G3PVPAT([3200, 3300, 3400], 3500),                  # hundred jumps
        _G3PVPAT([2450, 3450, 4450], 5450),                  # thousand jumps
    ]),
    ("g3PV5", "القيمة المنزلية ضمن عشرات الألوف", "operational", [
        # family 1 — التكوين/التفكيك
        _G3BUILD(24513, "٢ عشرات ألوف و٤ آلاف و٥ مئات و١ عشرات و٣ آحاد"),
        _G3BUILD(70206, "٧ عشرات ألوف و٢ مئات و٦ آحاد"),     # double-zero CASE
        _G3EXPAND(46280, "٤٠٠٠٠ + ؟ + ٢٠٠ + ٨٠", 6000),
        _G3EXPAND(53907, "٥٠٠٠٠ + ٣٠٠٠ + ؟ + ٧", 900),
        # family 2 — قيمة المنزلة
        _G3DVAL(25413, 2, 20000),
        _G3DVAL(47250, 7, 7000),
        _G3DPLACE(81634, 8, "عشرات الألوف", _PLACES5),
        _G3DPLACE(19045, 9, "الآلاف", _PLACES5),
    ]),
    ("g3BIG", "الأعداد حتى ستة أرقام", "operational", [          # KW u1 «حتى ٦ أرقام»
        # family 1 — التكوين/التفكيك
        _G3BUILD(245317, "٢ مئات ألوف و٤ عشرات ألوف و٥ آلاف و٣ مئات و١ عشرات و٧ آحاد"),
        _G3BUILD(803050, "٨ مئات ألوف و٣ آلاف و٥ عشرات"),    # sparse-zeros CASE
        _G3EXPAND(672481, "٦٠٠٠٠٠ + ؟ + ٢٠٠٠ + ٤٠٠ + ٨٠ + ١", 70000),
        _G3EXPAND(150236, "١٠٠٠٠٠ + ٥٠٠٠٠ + ٢٠٠ + ؟ + ٦", 30),
        # family 2 — قيمة المنزلة
        _G3DVAL(245317, 2, 200000),
        _G3DVAL(391750, 9, 90000),
        _G3DPLACE(468125, 4, "مئات الألوف", _PLACES6),
        _G3DPLACE(729304, 2, "عشرات الألوف", _PLACES6),
    ]),
    ("g3CMP4", "مقارنة الأعداد وترتيبها", "operational", [
        # family 1 — موازنة عددين (compare)
        _G3PICKBIG(3452, 3542, bigger=True),
        _G3PICKBIG(7214, 7209, bigger=False),
        _G3SYM(5638, 5683),
        _G3SYM(9050, 8999),
        # family 2 — ترتيب متعدد (order)
        _G3MID3([4312, 4231, 4321]),
        _G3MID3([8054, 6845, 7458]),
        _G3ORDPICK([2750, 2570, 2705, 2057], asc=True),
        _G3ORDPICK([6189, 6918, 6891, 6198], asc=False),
    ]),
    ("g3CMP10", "المقارنة والترتيب ضمن ١٠٠٠", "operational", [
        # Oman u21-1 (read from the body, p56–59) — ITS numbers, ITS range (≤1000;
        # the REGR source-range principle). Families mirror CMP4's two acts.
        # family 1 — موازنة عددين
        _G3PICKBIG(271, 254, bigger=True),
        _G3PICKBIG(517, 534, bigger=False),
        _G3SYM(386, 318),                                    # p57 q4 uses < and > verbatim
        _G3SYM(456, 465),
        # family 2 — ترتيب متعدد
        _G3MID3([271, 254, 269]),                            # p57 q5(أ) numbers
        _G3MID3([534, 543, 491]),                            # p57 q5(ج) numbers
        _G3ORDPICK([147, 386, 261, 318], asc=True),          # p57 q5(ب) numbers
        _G3ORDPICK([207, 248, 275, 269], asc=False),
    ]),
    ("g3ROUND", "التقريب إلى أقرب عشرة ومئة", "operational", [
        # family 1 — التقريب المباشر (rounding); number-line/place-value are
        # REPRESENTATIONS of the one act (QA 7-2 p57 names both), never families
        _G3RND(472, 10, nl=True),
        _G3RND(345, 10),                                     # «٥ فما فوق» boundary CASE
        _G3RND(685, 100, nl=True),
        _G3RND(249, 100),                                    # rounds DOWN to ٢٠٠
        # family 2 — التقريب العكسي (inverse) — Oman u21 p57 q3 verbatim
        _G3RNDINV(460, 10, 457, [453, 467]),
        _G3RNDINV(820, 10, 823, [827, 813]),
        _G3RNDINV(300, 100, 284, [239, 362]),
        _G3RNDINV(700, 100, 652, [761, 649]),
    ]),
    ("g3ROUND4", "التقريب إلى أقرب ألف", "operational", [       # SA L8 p41 + BH 1-9 p32
        # family 1 — التقريب المباشر
        _G3RND(3452, 1000, nl=True, cap=9999),
        _G3RND(7680, 1000, cap=9999),
        _G3RND(2500, 1000, cap=9999),                        # boundary CASE → ٣٠٠٠
        _G3RND(9214, 1000, cap=9999),
        # family 2 — التقريب العكسي
        _G3RNDINV(5000, 1000, 5320, [5700, 4300]),
        _G3RNDINV(8000, 1000, 7649, [7499, 8600]),
        _G3RNDINV(2000, 1000, 2381, [2780, 1409]),
        _G3RNDINV(6000, 1000, 6088, [6802, 5099]),
    ]),
]

# minimal-common edges. g3ROUND is a ROOT: Qatar owns it WITHOUT owning g3PV (its 13
# units have no place-value lesson — settled from the eight indices), so no PV→ROUND
# edge survives the every-owner rule (the ratified BOND→ADDSTR precedent). g3CMP10
# is Oman's own root. ROUND4 needs both the act (ROUND) and the 4-digit range (PV) —
# both its owners (SA/BH) own both.
G3_EDGES = [
    ("g3PV", "g3PV5"), ("g3PV5", "g3BIG"),                   # the range-tier chain
    ("g3PV", "g3CMP4"),
    ("g3PV", "g3ROUND4"), ("g3ROUND", "g3ROUND4"),
]

NODE_COUNTRIES.update({
    "g3PV": ("SA", "BH", "KW", "AE"),       # QA: no PV lesson; OM: u21 is ≤1000
    "g3PV5": ("SA", "BH", "KW"),            # AE stops at «منزلة الآلاف» (u1-L1)
    "g3BIG": ("KW",),                       # KW u1 alone reaches 6 digits
    "g3CMP4": ("SA", "BH", "KW", "AE"),
    "g3CMP10": ("OM",),                     # Oman u21-1 — its source range, kept
    "g3ROUND": _ALL6,                       # every country, each with a named lesson
    "g3ROUND4": ("SA", "BH"),               # nearest-1000 is THEIR scope alone
})
# --- GRADE 3 batch 2 (الجمع والطرح): g3ADD3 / g3OPS4 / g3PROPS / g3EST3 ---
# g3ADD3 is THE strongest cross-grade pair (↔ G2's C5/A3/A4, near-identical act).
# The surfaces are kept deliberately DISTINCT: A3/A4 live in base-ten blocks and
# number-line jumps; g3ADD3 is symbolic-algorithmic (column work, partial sums,
# multi-addend) per the G3 sources' own register. Documented in visual_debt.md.
# g3OPS4 = the 4-digit tier ABOVE it (KW «حتى ١٠٠٠٠» + BH «الأعداد الكبيرة» 2-7/3-5
# + AE u2-L8/u3-L6 — all verbatim; SA checked OUT from both indices).

def _G3COL(a, b, sub=False):
    # «الخوارزمي العمودي» — symbolic column work; zeros are CASES inside it
    if sub:
        return ("algorithm", f"اطرح عمودياً (بإعادة التجميع): {_h(a)} − {_h(b)} = ؟",
                _h(a - b), None)
    return ("algorithm", f"اجمع عمودياً (بإعادة التجميع): {_h(a)} + {_h(b)} = ؟",
            _h(a + b), None)

def _G3PARTIAL(a, b):
    # «النواتج الجزئية» — the place-add widget IS the partial-sums act (3-digit by
    # design, exactly ADD3's range; OPS4's partial items are text — no extension)
    return ("partial", f"اجمع بالخانات (نواتج جزئية): {_h(a)} + {_h(b)}", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})

def _G3PARTIAL4(a, b, parts, sub=False):
    # «التفكيكي» at the 4-digit tier — decompose by place VALUES, then combine (text;
    # BH p58 does exactly this: ٥٠٠٠+٧٠٠+١٥٠+١١ as «المجاميع الجزئية»)
    op = "−" if sub else "+"
    res = a - b if sub else a + b
    return ("partial", f"حلّل ثم {'اطرح' if sub else 'اجمع'}: {_h(a)} {op} {_h(b)} = {parts} = ؟",
            _h(res), None)

def _G3MULTI(nums):
    # «ثلاثة أعداد فأكثر» — QA u8 + KW u2 verbatim: order/group choice is the act
    return ("multi", "اجمع الأعداد الثلاثة: " + " + ".join(_h(n) for n in nums) + " = ؟",
            _h(sum(nums)), None)

def _G3PROP(prompt, ans):
    # «تطبيق الخاصية» — QA 7-1 p52 names all three (التجميع/المحايد/الإبدال)
    return ("property", prompt, _h(ans), None)

def _G3MENT(prompt, ans):
    # «الذهني» — Oman's «متمّمات الـ١٠٠» (u24-1, body) + compensation
    return ("mental", prompt, _h(ans), None)

def _G3REL(prompt, ans):
    # «العلاقة العكسية» — QA 7-5 «علاقة الجمع بالطرح»: flip a fact / missing term
    return ("relation", prompt, _h(ans), None)

def _G3ESTOP(a, b, ref, sub=False):
    # «تقدير الناتج» — round both to ref, then operate (the g1ESTR act, G3 range)
    r = lambda n: (n + ref // 2) // ref * ref
    res = r(a) - r(b) if sub else r(a) + r(b)
    label = {10: "عشرة", 100: "مئة"}[ref]
    return ("estimate", f"قدِّر بالتقريب لأقرب {label}: {_h(a)} {'−' if sub else '+'} {_h(b)} ≈ ؟",
            _h(res), None)

def _G3PLAUS(prompt, good, bad):
    # «حكم المعقولية» — pick the plausible result (selection, not production)
    return ("plausibility", prompt, str(good),
            {"kind": "shape-pick", "options": [{"v": str(good)}, {"v": str(bad)}]})

def _G3DECIDE(prompt, ans):
    # «الدقيق أم التقديري» — SA u2-L3 / BH 2-2 / AE u3-L3 verbatim: a metacognitive
    # DECISION about what the situation needs, before any computing
    return ("decision", prompt, ans,
            {"kind": "shape-pick", "options": [{"v": "يكفي التقدير"}, {"v": "جوابٌ دقيق"}]})

G3_ADDSUB_NODES = [
    ("g3ADD3", "جمع وطرح الأعداد ضمن ١٠٠٠", "operational", [
        # family 1 — الخوارزمي العمودي (algorithm); zeros are CASES
        _G3COL(456, 367),
        _G3COL(703, 458, sub=True),                          # zero-tens CASE
        _G3COL(500, 276, sub=True),                          # zeros CASE (SA/BH lesson)
        # family 2 — النواتج الجزئية (partial) — QA «نواتج الجمع/الطرح الجزئية»
        _G3PARTIAL(263, 489),
        _G3PARTIAL(175, 248),
        ("partial", "بالمجاميع الجزئية: ٤٧٦ + ٢٥٨ → ٦٠٠ و١٢٠ و١٤ — فما المجموع؟",
         "٧٣٤", None),
        # family 3 — ثلاثة أعداد فأكثر (multi) — QA u8 + KW u2
        _G3MULTI([125, 230, 314]),
        _G3MULTI([146, 208, 117]),
    ]),
    ("g3OPS4", "جمع وطرح الأعداد الكبيرة (٤ أرقام)", "operational", [
        # family 1 — الخوارزمي العمودي — Bahrain's OWN numbers (pp57–58/78)
        _G3COL(4478, 1383),                                  # BH p58 verbatim
        _G3COL(3987, 3928),                                  # BH p57 verbatim
        _G3COL(8422, 5995, sub=True),                        # BH p78 verbatim
        _G3COL(2006, 781, sub=True),                         # BH p78 — zeros CASE
        # family 2 — التفكيكي (text — place-add widget is 3-digit by design)
        _G3PARTIAL4(2361, 1427, "(٢٠٠٠+١٠٠٠) + (٣٠٠+٤٠٠) + (٦٠+٢٠) + (١+٧)"),
        _G3PARTIAL4(5136, 2742, "(٥٠٠٠+٢٠٠٠) + (١٠٠+٧٠٠) + (٣٠+٤٠) + (٦+٢)"),
        _G3PARTIAL4(6875, 2431, "(٦٠٠٠−٢٠٠٠) + (٨٠٠−٤٠٠) + (٧٠−٣٠) + (٥−١)", sub=True),
        _G3PARTIAL4(7592, 4250, "(٧٠٠٠−٤٠٠٠) + (٥٠٠−٢٠٠) + (٩٠−٥٠) + (٢−٠)", sub=True),
    ]),
    ("g3PROPS", "خواص الجمع والطرح وطرائقهما", "operational", [
        # family 1 — تطبيق الخاصية — QA 7-1 p52's three, verbatim numbers
        _G3PROP("بخاصية الإبدال (الترتيب): ٥٧ + ٣٥ = ٣٥ + ؟", 57),
        _G3PROP("بخاصية التجميع: (١٨ + ١٤) + ١٥ = ١٨ + (١٤ + ؟)", 15),
        _G3PROP("العنصر المحايد: ٣٩ + ؟ = ٣٩", 0),
        # family 2 — الذهني — Oman u24-1 «متمّمات الـ١٠٠» verbatim numbers
        _G3MENT("متمِّم المئة: ٧٢ + ؟ = ١٠٠", 28),
        _G3MENT("ذهنياً بمتمّمات المئة: ٢٠٠ − ١٧٨ = ؟", 22),
        _G3MENT("ذهنياً بالتعويض: ٢٩٨ + ٢٤٥ (اجعلها ٣٠٠ + ٢٤٣) = ؟", 543),
        # family 3 — العلاقة العكسية — QA 7-5
        _G3REL("إذا كان ٢٦ + ٤٧ = ٧٣ فإنَّ ٧٣ − ٤٧ = ؟", 26),
        _G3REL("المعادلة الناقصة: ؟ − ٣٤ = ٥٨", 92),
    ]),
    ("g3EST3", "تقدير نواتج الجمع والطرح", "operational", [
        # family 1 — تقدير الناتج (estimate)
        _G3ESTOP(487, 312, 100),
        _G3ESTOP(623, 289, 100, sub=True),
        _G3ESTOP(78, 43, 10),
        # family 2 — حكم المعقولية (plausibility)
        _G3PLAUS("اشترت أمي غرضين بـ ١٩٥ و٣٠٨ ريالات — أيُّ تقديرٍ معقولٌ للمجموع؟", "٥٠٠", "٩٠٠"),
        _G3PLAUS("٧١٢ − ٢٩٥ — أيُّ الناتجين معقول؟", "٤٠٠", "٧٠٠"),
        _G3PLAUS("جمع سالم ٤٢١ + ٣٨٥ فقال: الناتج ٩٥٠ — أمعقول؟", "غير معقول", "معقول"),
        # family 3 — الدقيق أم التقديري (decision) — SA/BH/AE verbatim lesson
        _G3DECIDE("أيكفي معك ١٠٠ ريالٍ لغرضين بـ ٤٧ و٣٨؟ — ماذا يلزمك لتجيب؟", "يكفي التقدير"),
        _G3DECIDE("كم بقي معك بالضبط بعد شراءٍ بـ ٢٣٧ من ٥٠٠؟ — ماذا يلزمك لتجيب؟", "جوابٌ دقيق"),
    ]),
]

# minimal-common edges. ADD3 is a ROOT (QA/OM own it without g3PV — the every-owner
# rule again); PROPS is a ROOT (QA/SA order properties BEFORE 3-digit fluency, so no
# ADD3→PROPS edge survives the source order); EST3 hangs on the rounding ACT alone.
G3_ADDSUB_EDGES = [
    ("g3ADD3", "g3OPS4"), ("g3PV", "g3OPS4"),                # the 4-digit tier
    ("g3ROUND", "g3EST3"),                                   # estimate = round, then operate
]

NODE_COUNTRIES.update({
    "g3ADD3": _ALL6,                        # every country, each with named lessons
    "g3OPS4": ("KW", "BH", "AE"),           # the 4-digit tier — SA checked OUT (indices)
    "g3PROPS": _ALL6,                       # six after the body checks (OM via u21+u24)
    "g3EST3": ("SA", "BH", "QA", "AE", "KW"),  # no OM (no result-estimation in u21/u24)
})
# --- GRADE 3 batch 3 (الضرب التأسيسي): g3MUL / g3MULF1 ---
# g3MUL is a ROOT: Qatar teaches multiplication (units 1–5) BEFORE add/sub fluency
# (units 7–8), so the ADD3→MUL edge falls to the country-order rule — and G2 set the
# same precedent (M1 was rooted in D1, never the skip-count). Pair: g3MUL ↔ G2-M1
# (inherits its two acts — groups & array — at a bigger range) + M4 (the modeling
# act). For a SAUDI child g3MUL is the FIRST encounter with multiplication ever
# (Saudi G2 has none — M1 is five-country); option-ج must respect that asymmetry.
# g3MULF1 = the easy facts AS PATTERNS (×2/5/10, ×0/1 rule, ×9) — five countries;
# Oman OUT by body text (its tables are 3/4/5/6/9/10 — no ×2/×0/×1; its content
# lives in the proposed Oman-scope facts node, the CMP10 precedent, later batch).
# ×9 sits HERE by its ACT (pattern) although SA/BH index it in their ch5 — the fact
# is inside every owner's year, so no range leak («العقدة سلوك لا اسم فصل»).

def _G3GRP(groups, per):
    # «التجميع المتكرر» — equal groups on the proven G2 groups widget (bigger range)
    return ("repeated", f"كوِّن {_h(groups)} مجموعاتٍ في كلٍّ منها {_h(per)} — كم الإجمالي؟",
            _h(groups * per), {"kind": "groups", "mode": "form", "groups": groups, "per": per})

def _G3REP(k, n):
    # «التجميع المتكرر» — the symbolic repeated-addition reading (number line is a
    # CASE inside this act, never a family — the ratified map decision)
    return ("repeated", f"اكتبها جمعاً متكرراً ثم احسب: {_h(k)} × {_h(n)} = "
            + " + ".join([_h(n)] * k) + " = ؟", _h(k * n), None)

def _G3ARR(rows, cols):
    # «البنية المصفوفية» — rows×cols on the proven G2 array widget
    return ("array", f"صُفَّ مصفوفة: {_h(rows)} صفوف × {_h(cols)} أعمدة — كم الإجمالي؟",
            _h(rows * cols), {"kind": "array", "rows": rows, "cols": cols})

def _G3MODEL(prompt, good, bad):
    # «النمذجة والترجمة» — situation ↔ sentence in BOTH directions (QA u1 + Oman
    # «أؤلّف قصة عددية» p98/102 verbatim — selection keeps it gradable)
    return ("modeling", prompt, good,
            {"kind": "shape-pick", "options": [{"v": good}, {"v": bad}]})

G3_MULDIV_NODES = [
    ("g3MUL", "فهم الضرب", "operational", [
        # family 1 — التجميع المتكرر (repeated)
        _G3GRP(4, 6),
        _G3REP(3, 7),
        ("repeated", "٥ + ٥ + ٥ + ٥ = ؟ × ٥ — ما العدد الناقص؟", "٤", None),
        # family 2 — البنية المصفوفية (array); the OPEN array is Oman's CASE (p96)
        _G3ARR(4, 7),
        ("array", "بالإبدال (اقلب المصفوفة): إذا كان ٧ × ٤ = ٢٨ فكم ٤ × ٧؟", "٢٨", None),
        ("array", "المصفوفة المفتوحة (فكِّك العمود): ١٣ × ٤ = (١٠ × ٤) + (٣ × ٤) = ؟",
         "٥٢", None),                                        # Oman p96 CASE (١٣×٤)
        # family 3 — النمذجة والترجمة (modeling)
        _G3MODEL("أيُّ جملةٍ تمثِّل: «٥ أطباقٍ في كلِّ طبقٍ ٣ تمرات»؟", "٥ × ٣", "٥ + ٣"),
        _G3MODEL("أيُّ قصةٍ تناسب الجملة ٤ × ٦؟",
                 "٤ سلالٍ في كلِّ سلةٍ ٦ تفاحات", "٤ تفاحاتٍ أُكلت منها ٦"),
    ]),
    ("g3MULF1", "حقائق الضرب بالأنماط", "operational", [
        # family 1 — الاستدعاء بنمط القفز (skip): ×2/×5/×10
        ("skip", "بنمط الخمسة (٥، ١٠، ١٥، ...): ٦ × ٥ = ؟", "٣٠", None),
        ("skip", "بقفز الاثنين: ٧ × ٢ = ؟", "١٤", None),
        ("skip", "صُفَّ مصفوفة: ٤ صفوف × ١٠ أعمدة — كم الإجمالي؟", "٤٠",
         {"kind": "array", "rows": 4, "cols": 10}),
        # family 2 — قاعدة الصفر والواحد (zero-one): the RULE, reasoned (SA L7 / QA u2)
        ("zero-one", "٨ × ١ = ؟", "٨", None),
        ("zero-one", "٠ × ٦ = ؟", "٠", None),
        ("zero-one", "أيُّ القاعدتين صحيحة؟", "أيُّ عددٍ × صفر = صفر",
         {"kind": "shape-pick", "options": [{"v": "أيُّ عددٍ × صفر = صفر"},
                                            {"v": "أيُّ عددٍ × صفر = العدد نفسه"}]}),
        # family 3 — نمط التسعة (nine) — QA u2 verbatim; SA/BH hold ×9 in ch5 (note above)
        ("nine", "نمط التسعة: ٩ × ٤ = (١٠ × ٤) − ٤ = ؟", "٣٦", None),
        ("nine", "٩ × ٧ = ؟ (لاحظ: رقما الناتج يجمعان إلى ٩)", "٦٣", None),
    ]),
]

# --- GRADE 3 batch 4: g3MULF2 (the G3 understanding-gate heart) / g3F12 / g3EVENM /
# g3FACTOM. MULF2 = four DERIVATION ACTS, two questions each — the ADDSTR template,
# verbatim-sourced (QA u3 names the distributive; BH 5-8 the associative; BH 5-3
# «البحث عن نمط»; KW's hundred-chart is a REPRESENTATION case inside the pattern
# act, never a family). DECLARED PAIRLESS: G2 has no fact-derivation node at all —
# option-ج must not descend from MULF2 (the honest absence, owner-ratified).
# g3F12 = the SAME derivation act at table-range ABOVE 10 (BH 5-7 p132 body: ٧×١١
# = ٧٠+٧ verbatim; products to 144 exceed MULF2's 100-cap) → a TIER, BH alone (the
# ROUND4 precedent — what the map drew as «cases» was promoted by the body check).
# g3FACTOM = Oman's integrated facts (CMP10 precedent): ITS tables (3/4/5/6/9/10,
# never ×2/×0/×1/×7/×8) recalled WITH their division partners + the open array on
# 2-digit×1-digit (11–19) — u25 body pp94–107, its own numbers throughout.

G3_MULDIV_NODES += [
    ("g3MULF2", "اشتقاق حقائق الضرب الصعبة", "operational", [
        # act 1 — التوزيع (distribute): split a factor — QA u3 verbatim property
        ("distribute", "اشتق بالتوزيع: ٧ × ٦ = (٧ × ٥) + (٧ × ١) = ؟", "٤٢", None),
        ("distribute", "بالتوزيع: ٨ × ٧ = (٨ × ٥) + (٨ × ٢) = ؟", "٥٦", None),
        # act 2 — الضعف المضاعف (double): derive from a KNOWN double
        ("double", "الضعف المضاعف: ٦ × ٤ = ضِعف (٦ × ٢) = ؟", "٢٤", None),
        ("double", "٩ × ٦ = ضِعف (٩ × ٣) = ؟", "٥٤", None),
        # act 3 — التجميع ثلاثي العوامل (associate) — QA u3 + BH 5-8 «الجبر» verbatim
        ("associate", "بالتجميع: (٢ × ٣) × ٤ = ٢ × (٣ × ٤) = ؟", "٢٤", None),
        ("associate", "اختر التجميع الأسهل ثم احسب: ٥ × ٢ × ٧ = ؟", "٧٠", None),
        # act 4 — أنماط الجدول (pattern) — BH 5-3; KW hundred-chart = a CASE here
        ("pattern", "في جدول الضرب، صفُّ الثلاثة: ٣، ٦، ٩، ١٢، ؟", "١٥", None),
        ("pattern", "على لوحة المئة، مضاعفات الثمانية: ٨، ١٦، ٢٤، ؟", "٣٢", None),
    ]),
    ("g3F12", "الضرب في ١١ و١٢", "operational", [                # BH 5-7 p132 — body verbatim
        # act 1 — نمط الأحد عشر: the digit repeats (p133 verbatim)
        ("eleven", "نمط الأحد عشر (الرقم يتكرر): ٧ × ١١ = ؟", "٧٧", None),
        ("eleven", "٩ × ١١ = ؟", "٩٩", None),
        ("eleven", "٥ × ١١ = ؟", "٥٥", None),
        ("eleven", "١١ × ١١ = ؟ (لاحظ: ١٢١ يكسر تكرار الرقم!)", "١٢١", None),
        # act 2 — التوزيع: 12 = 10+2 / 11 = 10+1 (p133: ٧٠+٧ verbatim)
        ("distribute", "بالتوزيع: ٤ × ١٢ = (٤ × ١٠) + (٤ × ٢) = ؟", "٤٨", None),
        ("distribute", "٦ × ١٢ = (٦ × ١٠) + (٦ × ٢) = ؟", "٧٢", None),
        ("distribute", "١٢ × ٩ = (١٠ × ٩) + (٢ × ٩) = ؟", "١٠٨", None),
        ("distribute", "١٢ × ١٢ = (١٠ × ١٢) + (٢ × ١٢) = ؟", "١٤٤", None),
    ]),
    ("g3EVENM", "الزوجي والفردي بالبنية الضربية", "operational", [
        # act 1 — التصنيف البنيوي: parity REASONED via ×2 / ÷2 (not g1's pairing)
        ("classify", "١٤ = ٢ × ٧ — أزوجيٌّ هو أم فردي؟", "زوجي",
         {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]}),
        ("classify", "هل يقبل ٢١ القسمةَ على ٢ بلا باقٍ؟ فما هو؟", "فردي",
         {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]}),
        ("classify", "٣٦ ÷ ٢ = ١٨ بلا باقٍ — فما ٣٦؟", "زوجي",
         {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]}),
        ("classify", "٢ × ٩ = ١٨ — فما ١٨؟", "زوجي",
         {"kind": "shape-pick", "options": [{"v": "زوجي"}, {"v": "فردي"}]}),
        # act 2 — تعليل القواعد — Oman u21 q3ج + u25 q13د verbatim; QA 4-5
        ("rule", "ضاعفتُ عدداً فردياً — ماذا يكون الناتج دائماً؟", "زوجياً دائماً",
         {"kind": "shape-pick", "options": [{"v": "زوجياً دائماً"}, {"v": "فردياً دائماً"}]}),
        ("rule", "جميع الأعداد في جدول ضرب الأربعة…", "زوجية",
         {"kind": "shape-pick", "options": [{"v": "زوجية"}, {"v": "فردية"}]}),
        ("rule", "حاصل ضرب أيِّ عددٍ في ٢ يكون…", "زوجياً",
         {"kind": "shape-pick", "options": [{"v": "زوجياً"}, {"v": "فردياً"}]}),
        ("rule", "أيُّ جدولٍ تكون كلُّ نواتجه زوجية؟", "جدول ٦",
         {"kind": "shape-pick", "options": [{"v": "جدول ٦"}, {"v": "جدول ٥"}]}),
    ]),
    ("g3FACTOM", "حقائق الضرب والقسمة المتكاملة (عُمان)", "operational", [
        # act 1 — الاستدعاء المزدوج: the fact family × AND ÷ (u25 p98/102 verbatim)
        ("dual", "٤ × ٩ = ٣٦ — فما ٣٦ ÷ ٤؟", "٩", None),
        ("dual", "من جدول الأربعة: ٤٨ ÷ ٤ = ؟", "١٢", None),       # p102 q10 verbatim
        ("dual", "١٠٠ ÷ ٢ = ؟", "٥٠", None),                       # p102 q10 verbatim
        ("dual", "٩ × ٦ = ؟", "٥٤", None),
        # act 2 — المصفوفة المفتوحة للرقمين (u25 p96 verbatim numbers)
        ("open-array", "المصفوفة المفتوحة: ١٧ × ٤ = (١٠ × ٤) + (٧ × ٤) = ؟", "٦٨", None),
        ("open-array", "١٣ × ٩ = (١٠ × ٩) + (٣ × ٩) = ؟", "١١٧", None),
        # act 3 — العامل المجهول (u25 p96 q4–5 verbatim)
        ("missing", "؟ × ٤ = ٣٢ — ما العدد؟", "٨", None),
        ("missing", "ما العدد الذي إذا ضُرِب في ٩ كان الناتج ٣٦؟", "٤", None),
    ]),
]

# --- GRADE 3 batch 5 (القسمة): g3DIV / g3DIVF ---
# Division's THREE source-named meanings are the families (partitive sharing /
# quotative repeated-subtraction / inverse-of-×). V-pairs documented in
# visual_debt.md with the THREE-WAY asymmetry: KW alone owns the full G2 division
# foundation (V1–V4); BH has V1/V2; OM V1 only; SA/QA/AE have NO G2 division at
# all — g3DIV is their first contact. V4 is a documentation pair, NOT an edge:
# Kuwait RE-teaches the ×↔÷ relation in its G3 u5 verbatim.
# g3DIVF hangs on MULF1 — deliberately NOT MULF2: the UAE (MM ch7) interleaves
# ÷2/5/10 with the EASY × facts BEFORE ch8's ×7/8 derivations, so a MULF2 edge
# would break its order (the every-owner rule). g3DIVREM deferred to batch 6.

G3_MULDIV_NODES += [
    ("g3DIV", "فهم القسمة", "operational", [
        # family 1 — المشاركة-التوزيع (share) — Oman u25 verbatim numbers (٤٠ على ٥)
        ("share", "وزِّع ٤٠ بالتساوي على ٥ مجموعات — كم في كلِّ مجموعة؟", "٨",
         {"kind": "groups", "mode": "share", "total": 40, "groups": 5}),
        ("share", "وزِّع ٢٤ بالتساوي على ٤ مجموعات — كم في كلٍّ منها؟", "٦",
         {"kind": "groups", "mode": "share", "total": 24, "groups": 4}),
        ("share", "٣٠ قلماً على ٦ تلاميذ بالتساوي — كم قلماً لكلِّ تلميذ؟", "٥", None),
        # family 2 — الطرح المتكرر-القياس (measure) — QA u1 + KW u5 verbatim acts
        ("measure", "كم مجموعةً من ٦ في ٤٢؟ (اطرح ٦ متكرِّراً وعُدَّ المجموعات)", "٧",
         {"kind": "groups", "mode": "measure", "total": 42, "per": 6}),
        ("measure", "كم مجموعةً من ٨ في ٣٢؟", "٤",
         {"kind": "groups", "mode": "measure", "total": 32, "per": 8}),
        ("measure", "تتسع السلةُ لستِّ نباتات — كم سلةً تلزم لـ ٥٤ نبتةً؟", "٩", None),
        # family 3 — عكس الضرب (inverse) — QA 4-1 «العلاقة بين الضرب والقسمة» verbatim
        ("inverse", "إذا كان ٧ × ٤ = ٢٨ فإنَّ ٢٨ ÷ ٧ = ؟", "٤", None),
        ("inverse", "٦ × ٩ = ٥٤ — فما ٥٤ ÷ ٦؟", "٩", None),
    ]),
    ("g3DIVF", "حقائق القسمة", "operational", [
        # family 1 — التفكير ضرباً (think-mul) — QA 4-2/3/4 lesson titles verbatim
        ("think-mul", "٢٧ ÷ ٣ = ؟ (فكِّر: ٣ × ؟ = ٢٧)", "٩", None),
        ("think-mul", "٥٦ ÷ ٨ = ؟ (فكِّر: ٨ × ؟ = ٥٦)", "٧", None),
        ("think-mul", "٤٥ ÷ ٩ = ؟", "٥", None),
        # family 2 — عائلة الحقيقة (family): complete the four-fact STRUCTURE
        ("family", "أكمل الحقيقة الرابعة في العائلة: ٣×٩=٢٧، ٩×٣=٢٧، ٢٧÷٣=٩، ؟",
         "٢٧ ÷ ٩ = ٣",
         {"kind": "shape-pick", "options": [{"v": "٢٧ ÷ ٩ = ٣"}, {"v": "٢٧ − ٩ = ١٨"}]}),
        ("family", "العدد الناقص في جدول الضرب: ٧ × ؟ = ٦٣", "٩", None),   # QA 4-12
        ("family", "من عائلة ٤، ٦، ٢٤: اكتب ناتج ٢٤ ÷ ٦", "٤", None),
        # family 3 — قواعد الصفر والواحد (rules) — QA 4-6 + BH 6-7 verbatim lessons
        ("rules", "٨ ÷ ١ = ؟", "٨", None),
        ("rules", "٠ ÷ ٧ = ؟", "٠", None),
    ]),
]

# --- GRADE 3 batch 6 (عقد الامتداد الحسابي): g3MUL10 / g3MULBIG / g3ORDOPS / g3DIVREM ---
# The FIRST batch born on the live-generation foundation: these template rows are
# ANCHORS only (family homes + the Answer-log key); children meet live instances
# from day one (gencontent_g3b6.py, verified + thresholded from birth).
# g3MUL10 (QA 4-13 p242 body + KW u4): the associative reasoning vs the zero
# shortcut — two acts, verbatim-sourced. g3MULBIG (KW 4-3 body: ٤×٢٣ three ways).
# g3ORDOPS (KW 3-12 p126: «الضرب أولاً» — a PRECEDENCE DECISION, wholly new act).
# g3DIVREM (KW 6-1 body: ١٧÷٣ = «٥ والباقي ٢» verbatim — breaks the «division
# exhausts» intuition; the answer is a PAIR in the child's own book wording).

G3_MULDIV_NODES += [
    ("g3MUL10", "الضرب في مضاعفات العشرة", "operational", [
        # family 1 — التعليل التجميعي (assoc) — QA 4-13 verbatim chain
        ("assoc", "٥ × ٣٠ = ٥ × (٣ × ١٠) = (٥ × ٣) × ١٠ = ؟", "١٥٠", None),
        ("assoc", "٤ × ٢٠ = (٤ × ٢) × ١٠ = ؟", "٨٠", None),
        ("assoc", "٧ × ٦٠ = (٧ × ٦) × ١٠ = ؟", "٤٢٠", None),
        ("assoc", "٣ × ٩٠ = (٣ × ٩) × ١٠ = ؟", "٢٧٠", None),
        # family 2 — اختصار الصفر (shortcut) — QA: «أكتب صفراً واحداً بعد الناتج»
        ("shortcut", "٥ × ٦ = ٣٠ — أكتب صفراً واحداً بعد الناتج: ٥ × ٦٠ = ؟", "٣٠٠", None),
        ("shortcut", "٨ × ٤ = ٣٢ — فما ٨ × ٤٠؟", "٣٢٠", None),
        ("shortcut", "٦ × ٧ = ٤٢ — فما ٦ × ٧٠؟", "٤٢٠", None),
        ("shortcut", "٩ × ٥ = ٤٥ — فما ٩ × ٥٠؟", "٤٥٠", None),
    ]),
    ("g3MULBIG", "ضرب الأعداد الكبيرة", "operational", [      # KW u4 — its scope alone
        # family 1 — الخوارزمي العمودي بإعادة التسمية (KW 4-3 body verbatim ٤×٢٣)
        ("algorithm", "اضرب عمودياً (بإعادة التسمية): ٢٣ × ٤ = ؟", "٩٢", None),
        ("algorithm", "اضرب عمودياً: ٤٧ × ٣ = ؟", "١٤١", None),
        ("algorithm", "اضرب عمودياً: ٢١٤ × ٣ = ؟", "٦٤٢", None),
        # family 2 — التفكيك المنزلي (KW 4-3: ٤ × (٢٠ + ٣) نموذجياً)
        ("decompose", "فكِّك: ٤ × ٢٣ = ٤ × (٢٠ + ٣) = ٨٠ + ١٢ = ؟", "٩٢", None),
        ("decompose", "٣ × ٤٦ = ٣ × (٤٠ + ٦) = ١٢٠ + ١٨ = ؟", "١٣٨", None),
        ("decompose", "٥ × ١٢٣ = ٥ × (١٠٠ + ٢٠ + ٣) = ؟", "٦١٥", None),
        # family 3 — مضاعفات المئة (hundreds) — the KW-only range above MUL10
        ("hundreds", "٤ × ٢٠٠ = ؟", "٨٠٠", None),
        ("hundreds", "٦ × ٥٠٠ = ؟", "٣٠٠٠", None),
    ]),
    ("g3ORDOPS", "ترتيب العمليات", "operational", [           # KW 3-12 p126 — wholly new act
        # family 1 — تطبيق الترتيب (apply) — the lesson's own expressions
        ("apply", "٥ × ٧ + ١٠ = ؟ (الضرب أولاً)", "٤٥", None),
        ("apply", "٣ × ٦ − ٢ = ؟", "١٦", None),
        ("apply", "٤ + ٢ × ٨ = ؟", "٢٠", None),
        ("apply", "٣٠ − ٤ × ٥ = ؟", "١٠", None),
        # family 2 — تعليل الترتيب (justify) — the precedence DECISION itself
        ("justify", "في ٥ × ٧ + ١٠: أيُّ عمليةٍ تُنفَّذ أولاً؟", "الضرب",
         {"kind": "shape-pick", "options": [{"v": "الضرب"}, {"v": "الجمع"}]}),
        ("justify", "في ٩ + ٢ × ٣: أيُّ عمليةٍ أولاً؟", "الضرب",
         {"kind": "shape-pick", "options": [{"v": "الضرب"}, {"v": "الجمع"}]}),
        ("justify", "لو جمعتَ أولاً في ٢ × ٣ + ٤ لحصلتَ على ١٤ — أيصحُّ ذلك؟", "لا",
         {"kind": "shape-pick", "options": [{"v": "لا"}, {"v": "نعم"}]}),
        ("justify", "أيُّ تعبيرٍ ناتجه ٢٦؟", "٢ × ١٠ + ٦",
         {"kind": "shape-pick", "options": [{"v": "٢ × ١٠ + ٦"}, {"v": "٢ × ١ + ٠٦"}]}),
    ]),
    ("g3DIVREM", "القسمة بباقٍ", "operational", [             # KW 6-1 p51 body verbatim
        # family 1 — الناتج والباقي (quotrem) — the pair answer, book wording;
        # sharing/repeated-subtraction are REPRESENTATIONS of one act (the body)
        ("quotrem", "١٧ ÷ ٣ = ؟ — انقر الإجابة بصيغة الكتاب.", "٥ والباقي ٢",
         {"kind": "shape-pick", "options": [{"v": "٥ والباقي ٢"}, {"v": "٤ والباقي ٥"}]}),
        ("quotrem", "١٣ ÷ ٤ = ؟", "٣ والباقي ١",
         {"kind": "shape-pick", "options": [{"v": "٣ والباقي ١"}, {"v": "٢ والباقي ٥"}]}),
        ("quotrem", "٢٢ ÷ ٥ = ؟", "٤ والباقي ٢",
         {"kind": "shape-pick", "options": [{"v": "٤ والباقي ٢"}, {"v": "٣ والباقي ٧"}]}),
        # family 2 — تعليل الباقي (reason) — the remainder is ALWAYS < the divisor
        ("reason", "عند القسمة على ٤: ما أكبرُ باقٍ ممكن؟", "٣", None),
        ("reason", "في ١٧ ÷ ٣ الباقي ٢ — لماذا لا يكون الباقي ٣؟", "لأنّ ٣ تصنع مجموعةً أخرى",
         {"kind": "shape-pick", "options": [{"v": "لأنّ ٣ تصنع مجموعةً أخرى"},
                                            {"v": "لأنّ ٢ عددٌ زوجي"}]}),
        ("reason", "أيُّ القسمتين لها باقٍ؟", "١٣ ÷ ٣",
         {"kind": "shape-pick", "options": [{"v": "١٣ ÷ ٣"}, {"v": "١٢ ÷ ٣"}]}),
        # family 3 — القسمة بإعادة التسمية (rename) — KW 6-3/6-4 (open a ten)
        ("rename", "٥٢ ÷ ٤ = ؟ (فُكَّ عشرةً لتقسم)", "١٣", None),
        ("rename", "٧٢ ÷ ٣ = ؟", "٢٤", None),
    ]),
]

G3_MULDIV_EDGES = [
    ("g3MUL", "g3MULF1"),                # meaning before facts — unanimous source order
    ("g3MULF1", "g3MULF2"),              # easy facts before derivation — unanimous
    ("g3MULF2", "g3F12"),                # the tier above (BH owns both)
    ("g3MUL", "g3EVENM"),                # parity reasoned through × needs the meaning
    ("g3MUL", "g3FACTOM"),               # Oman: meaning first inside u25 itself
    ("g3MUL", "g3DIV"),                  # division after multiplication — all six
    ("g3DIV", "g3DIVF"),                 # understanding before facts — unanimous
    ("g3MULF1", "g3DIVF"),               # think-multiplication needs the EASY × facts
    # batch 6 — the country-order chains (owner-ratified)
    ("g3MULF2", "g3MUL10"),              # the associative reasoning is the lesson's tool
    ("g3MUL10", "g3MULBIG"),             # KW u4's internal order: multiples first
    ("g3MULF1", "g3ORDOPS"),             # the lesson computes with the easy facts
    ("g3DIVF", "g3DIVREM"),              # facts before the remainder (KW u5 → u6)
]

NODE_COUNTRIES.update({
    "g3MUL": _ALL6,                      # Oman's OWN body is the strongest evidence (u25)
    "g3MULF1": ("SA", "BH", "QA", "AE", "KW"),  # Oman OUT by body (tables 3-6/9/10)
    "g3MULF2": ("SA", "BH", "QA", "AE", "KW"),
    "g3F12": ("BH",),                    # the >10 table tier — Bahrain alone (5-7)
    "g3EVENM": ("QA", "KW", "OM"),       # Oman joined by its two bodies (u21+u25)
    "g3FACTOM": ("OM",),                 # Oman's integrated facts — its range, kept
    "g3DIV": _ALL6,                      # the three meanings — every country
    "g3DIVF": ("SA", "BH", "QA", "AE", "KW"),  # Oman's ÷-facts live in g3FACTOM
    # batch 6 — the arithmetic-extension cluster
    "g3MUL10": ("QA", "KW"),             # QA 4-13 + KW u4 — the shared multiples-of-ten act
    "g3MULBIG": ("KW",),                 # 2/3-digit × digit with renaming — KW alone
    "g3ORDOPS": ("KW",),                 # the precedence decision — KW alone
    "g3DIVREM": ("KW",),                 # the remainder — KW alone
})
# =================== end GRADE 3 batches 3–4 ===================



# --- GRADE 3 batch 7 (الكسور): g3FRAC / g3FRLINE / g3FREQ / g3FRSET3 / g3DEC ---
# Born live (anchors only). Ownership settled from the BODIES: KW is OUT of FRAC
# (its regions stop at quarters = its own G2-Fr1 range — nothing grade-new) and
# its real G3 fraction content (sets «حتى مقام ≤ ١٠» verbatim) joins FRSET3 and
# sets that node's common cap; OM joins FREQ verbatim («التساوي بين نصفٍ وربعين
# وأربعة أثمان... بالمخططات») and FRSET3 (٣/٤ الـ٨ — non-unit, verbatim). FRAC and
# FRSET3 are ROOTS (Oman teaches fractions u22 BEFORE division u25 — the
# every-owner rule drops the DIV edge). Declared exclusion: Oman's «أنصاف الأعداد
# الفردية» (mixed numbers) stays out of the shared pool. g3DEC = a wholly new act
# (BH ch9 body: the 10/100 grid, ٧/١٠↔٠٫٧ both directions).

G3_FRACTION_NODES = [
    ("g3FRAC", "تجزئة الكسور وتسميتها", "operational", [
        ("name", "ما الكسر الملوّن؟ انقر الإجابة.", "٣/٨",
         {"kind": "fraction", "mode": "name", "parts": 8, "shaded": 3,
          "options": ["١/٨", "٣/٨", "٥/٨"]}),
        ("name", "ما الكسر الملوّن؟ انقر الإجابة.", "٥/٦",
         {"kind": "fraction", "mode": "name", "parts": 6, "shaded": 5,
          "options": ["٢/٦", "٤/٦", "٥/٦"]}),
        ("name", "ما الكسر الملوّن؟ انقر الإجابة.", "٢/٣",
         {"kind": "fraction", "mode": "name", "parts": 3, "shaded": 2,
          "options": ["١/٣", "٢/٣", "٣/٣"]}),
        ("shade", "ظلِّل ٣ من ٨ أجزاء متساوية.", "٣/٨",
         {"kind": "fraction", "mode": "shade", "parts": 8, "target": 3}),
        ("shade", "ظلِّل ٥ من ٦ أجزاء متساوية.", "٥/٦",
         {"kind": "fraction", "mode": "shade", "parts": 6, "target": 5}),
        # فهم الكل — QA u9 verbatim act: rebuild the WHOLE from a known part
        ("whole", "هذه القطعة تمثِّل ١/٤ الشكل — فمن كم جزءٍ يتكوَّن الشكل كاملاً؟", "٤", None),
        ("whole", "إذا كان الجزء الملوَّن ١/٦ الكل — فكم جزءاً مثلَه يصنع الكل؟", "٦", None),
        ("whole", "قطعتان تمثّلان ٢/٨ الشكل — فكم قطعةً يحتاج الشكل كاملاً؟", "٨", None),
    ]),
    ("g3FRLINE", "الكسر على خط الأعداد", "operational", [
        ("below", "انقر موضع ٣/٤ على الخطّ.", "٣/٤",
         {"kind": "number-line", "den": 4, "maxWhole": 1}),
        ("below", "انقر موضع ٢/٦ على الخطّ.", "٢/٦",
         {"kind": "number-line", "den": 6, "maxWhole": 1}),
        ("below", "انقر موضع ١/٣ على الخطّ.", "١/٣",
         {"kind": "number-line", "den": 3, "maxWhole": 1}),
        ("below", "انقر موضع ٥/٨ على الخطّ.", "٥/٨",
         {"kind": "number-line", "den": 8, "maxWhole": 1}),
        ("above", "انقر موضع ٥/٤ على الخطّ (أكبر من ١).", "٥/٤",
         {"kind": "number-line", "den": 4, "maxWhole": 2}),
        ("above", "انقر موضع ٧/٣ على الخطّ.", "٧/٣",
         {"kind": "number-line", "den": 3, "maxWhole": 3}),
        ("above", "انقر موضع ٤/٣ على الخطّ.", "٤/٣",
         {"kind": "number-line", "den": 3, "maxWhole": 2}),
        ("above", "انقر موضع ٧/٦ على الخطّ.", "٧/٦",
         {"kind": "number-line", "den": 6, "maxWhole": 2}),
    ]),
    ("g3FREQ", "الكسور المتكافئة ومقارنتها", "operational", [
        ("equiv", "النصف يكافئ: ١/٢ = ؟/٤", "٢",
         {"kind": "fraction", "mode": "compare",
          "a": {"parts": 2, "shaded": 1}, "b": {"parts": 4, "shaded": 2}}),
        ("equiv", "أكمل التكافؤ: ١/٢ = ٤/؟", "٨", None),
        ("equiv", "أكمل التكافؤ: ٢/٣ = ؟/٦", "٤", None),
        ("rulecmp", "انقر الكسر الأكبر.", "٥/٦",
         {"kind": "fraction", "mode": "compare",
          "a": {"parts": 6, "shaded": 5}, "b": {"parts": 6, "shaded": 2}}),
        ("rulecmp", "انقر الكسر الأكبر.", "١/٣",
         {"kind": "fraction", "mode": "compare",
          "a": {"parts": 3, "shaded": 1}, "b": {"parts": 8, "shaded": 1}}),
        ("rulecmp", "انقر الكسر الأكبر.", "٣/٤",
         {"kind": "fraction", "mode": "compare",
          "a": {"parts": 4, "shaded": 3}, "b": {"parts": 4, "shaded": 1}}),
        ("benchmark", "أيُّ الكسرين أكبر من النصف: ٥/٨ أم ٢/٨؟", "٥/٨",
         {"kind": "shape-pick", "options": [{"v": "٥/٨"}, {"v": "٢/٨"}]}),
        ("benchmark", "أيُّ الكسرين أصغر من النصف: ٢/٦ أم ٥/٦؟", "٢/٦",
         {"kind": "shape-pick", "options": [{"v": "٢/٦"}, {"v": "٥/٦"}]}),
    ]),
    ("g3FRSET3", "كسر المجموعة", "operational", [
        ("express", "في المجموعة ١٠ كرات، ٣ منها زرقاء — ما كسر الكرات الزرقاء؟", "٣/١٠",
         {"kind": "shape-pick", "options": [{"v": "٣/١٠"}, {"v": "٧/١٠"}]}),
        ("express", "٨ علب، ٥ منها حمراء — ما كسر العلب الحمراء؟", "٥/٨",
         {"kind": "shape-pick", "options": [{"v": "٥/٨"}, {"v": "٣/٨"}]}),
        ("express", "٦ طيور، ٢ منها بيضاء — ما كسر الطيور البيضاء؟", "٢/٦",
         {"kind": "shape-pick", "options": [{"v": "٢/٦"}, {"v": "٤/٦"}]}),
        ("express", "٩ أقلام، ٤ منها جديدة — ما كسر الأقلام الجديدة؟", "٤/٩",
         {"kind": "shape-pick", "options": [{"v": "٤/٩"}, {"v": "٥/٩"}]}),
        # أخذ غير واحدي — Oman u22 verbatim (٣/٤ الـ٨)
        ("take", "ما ٣/٤ الـ ٨؟ (وزِّع على ٤ وخُذ ٣ حصص)", "٦",
         {"kind": "groups", "mode": "share", "total": 8, "groups": 4}),
        ("take", "ما ٢/٥ الـ ١٠؟", "٤",
         {"kind": "groups", "mode": "share", "total": 10, "groups": 5}),
        ("take", "ما ٣/٣ الـ ٩؟", "٩", None),
        ("take", "ما ٢/٣ الـ ٩؟", "٦",
         {"kind": "groups", "mode": "share", "total": 9, "groups": 3}),
    ]),
    ("g3DEC", "الكسور العشرية", "operational", [
        ("grid", "اقرأ الشبكة واختر الصورة العشرية.", "٠٫٧",
         {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 1, "shaded": 7,
          "options": ["٠٫٧", "٠٫٣"]}),
        ("grid", "اقرأ الشبكة واختر الصورة العشرية.", "٠٫٤",
         {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 1, "shaded": 4,
          "options": ["٠٫٤", "٠٫٦"]}),
        ("grid", "شبكة المئة: اختر الصورة العشرية للجزء الملوّن.", "٠٫٢٥",
         {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 10, "shaded": 25,
          "options": ["٠٫٢٥", "٠٫٥٢"]}),
        ("grid", "شبكة المئة: اختر الصورة العشرية.", "٠٫٦٠",
         {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 10, "shaded": 60,
          "options": ["٠٫٦٠", "٠٫٠٦"]}),
        ("convert", "اكتب ٧/١٠ بالصورة العشرية.", "٠٫٧",
         {"kind": "shape-pick", "options": [{"v": "٠٫٧"}, {"v": "٧٫٠"}]}),
        ("convert", "اكتب ١٥/١٠٠ بالصورة العشرية.", "٠٫١٥",
         {"kind": "shape-pick", "options": [{"v": "٠٫١٥"}, {"v": "١٫٥"}]}),
        ("convert", "اكتب ٠٫٢٥ كسراً اعتيادياً.", "٢٥/١٠٠",
         {"kind": "shape-pick", "options": [{"v": "٢٥/١٠٠"}, {"v": "٢٥/١٠"}]}),
        ("convert", "هل يمثِّل ٣/١٠ و٣٠/١٠٠ العددَ نفسه؟", "نعم",
         {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]}),
    ]),
]

G3_FRACTION_EDGES = [
    ("g3FRAC", "g3FRLINE"),              # partition before placement (QA u9's order)
    ("g3FRAC", "g3FREQ"),                # partition before equivalence — all five
    ("g3FRAC", "g3DEC"),                 # BH ch8 before ch9
]

NODE_COUNTRIES.update({
    "g3FRAC": ("SA", "BH", "QA", "AE", "OM"),   # KW out (its regions = its G2 range)
    "g3FRLINE": ("QA", "AE"),
    "g3FREQ": ("SA", "BH", "QA", "AE", "OM"),   # OM in — u22 verbatim equivalence
    "g3FRSET3": ("SA", "BH", "KW", "OM"),       # OM in — non-unit take, verbatim
    "g3DEC": ("BH",),
})
# =================== end GRADE 3 batch 7 ===================



# --- GRADE 3 batch 8 (القياس): g3LEN / g3CAPMASS / g3TIME3 / g3MONEY3 ---
# Born live (anchors only). Body-confirmed: Oman u18 «التقدير والقياس» (choose
# unit / estimate / measure / CONVERT — ٥٠٠ملم→أمتار verbatim) anchors LEN+CAPMASS
# and adds the estimate+convert acts; Oman u19 «النقود٢» (ريال/بيسة, amounts to
# thousands, making change) → MONEY3 Oman-only; Qatar u11 (time to the minute 3:25
# + elapsed) → TIME3's two acts. All four are ROOTS (independent measurement
# strands). The 24-hour clock is a Kuwaiti CASE inside read. ⚠️ AE-LEN reserved:
# its u12 (=MM ch11 Measurement) likely includes length but its image-only,
# renumbered edition wasn't body-confirmed — kept OUT of LEN, flagged for the
# readiness audit (batch 10); adding it later is one NODE_COUNTRIES line.

def _dt(h, m):
    H = "٠١٢٣٤٥٦٧٨٩"
    hs = str(h).translate(str.maketrans("0123456789", H))
    ms = ("0" + str(m) if m < 10 else str(m)).translate(str.maketrans("0123456789", H))
    return f"{hs}:{ms}"

G3_MEASURE_NODES = [
    ("g3LEN", "الطول المتري وتحويلاته", "operational", [
        # family 1 — القياس بالمسطرة المترية (measure) — extends Q1
        ("measure", "كم سنتيمتراً طول هذا الجسم؟ اقرأ المسطرة.", "٦",
         {"kind": "measure", "mode": "ruler", "length": 6, "max": 10, "unit": "سم"}),
        ("measure", "كم سنتيمتراً طول هذا القلم؟", "٨",
         {"kind": "measure", "mode": "ruler", "length": 8, "max": 12, "unit": "سم"}),
        ("measure", "كم سنتيمتراً طول الشريط؟", "٤",
         {"kind": "measure", "mode": "ruler", "length": 4, "max": 10, "unit": "سم"}),
        # family 2 — التحويل بين الوحدات (convert) — Oman u18 verbatim, NEW act
        ("convert", "حوّل: ٣ أمتار = ؟ سنتيمتراً", "٣٠٠", None),
        ("convert", "حوّل: ٥٠٠ ملمتر = ؟ سنتيمتراً", "٥٠", None),
        ("convert", "حوّل: ٢٠٠ سنتيمتر = ؟ متراً", "٢", None),
        ("convert", "حوّل: ٤ سنتيمترات = ؟ ملمتراً", "٤٠", None),
        ("convert", "حوّل: ١ متر = ؟ ملمتراً", "١٠٠٠", None),
    ]),
    ("g3CAPMASS", "السعة والكتلة: تقديراً وقياساً وتحويلاً", "operational", [
        # family 1 — التقدير (estimate) — Oman u18 «أقدّر»
        ("estimate", "قدِّر كتلة البطيخة — أيُّ تقديرٍ معقول؟", "٣ كغم",
         {"kind": "shape-pick", "options": [{"v": "٣ كغم"}, {"v": "٣٠٠ كغم"}]}),
        ("estimate", "قدِّر سعة الكوب — أيُّ تقديرٍ معقول؟", "٢٠٠ مل",
         {"kind": "shape-pick", "options": [{"v": "٢٠٠ مل"}, {"v": "٢٠ لتراً"}]}),
        ("estimate", "قدِّر كتلة التفاحة — أيُّ تقديرٍ معقول؟", "١٠٠ غم",
         {"kind": "shape-pick", "options": [{"v": "١٠٠ غم"}, {"v": "١٠ كغم"}]}),
        # family 2 — القياس بالأداة (measure) — extends Q1; volume is a CASE here
        ("measure", "كم غراماً كتلة الجسم؟ أضِف أثقالاً حتى يتّزن الميزان.", "٥",
         {"kind": "measure", "mode": "balance", "mass": 5, "unit": "غم", "unitOne": "غراماً"}),
        ("measure", "كم كوباً يملأ هذا الإناء؟ اسكب حتى يمتلئ.", "٤",
         {"kind": "measure", "mode": "container", "cups": 4}),
        # family 3 — التحويل (convert) — Oman u18 «حوّل», NEW act
        ("convert", "حوّل: ١ كيلوغرام = ؟ غراماً", "١٠٠٠", None),
        ("convert", "حوّل: ٢ لتر = ؟ مللتراً", "٢٠٠٠", None),
        ("convert", "حوّل: ٣٠٠٠ غرام = ؟ كيلوغراماً", "٣", None),
    ]),
    ("g3TIME3", "الوقت لأقرب دقيقة والزمن المنقضي", "operational", [
        # family 1 — القراءة لأقرب دقيقة (read) — digital pick; 24h is a KW case
        ("read", "كم الساعة؟ اقرأ القرص واختر الوقت الرقمي.", _dt(3, 25),
         {"kind": "clock", "hour": 3, "minute": 25,
          "options": [_dt(3, 25), _dt(3, 5), _dt(4, 25)]}),
        ("read", "كم الساعة؟ اقرأ القرص واختر.", _dt(7, 40),
         {"kind": "clock", "hour": 7, "minute": 40,
          "options": [_dt(7, 40), _dt(7, 20), _dt(8, 40)]}),
        ("read", "كم الساعة؟ اقرأ القرص واختر.", _dt(10, 15),
         {"kind": "clock", "hour": 10, "minute": 15,
          "options": [_dt(10, 15), _dt(10, 45), _dt(11, 15)]}),
        ("read", "كم الساعة؟ اقرأ القرص واختر.", _dt(5, 50),
         {"kind": "clock", "hour": 5, "minute": 50,
          "options": [_dt(5, 50), _dt(5, 10), _dt(6, 50)]}),
        # family 2 — الزمن المنقضي (elapsed) — Qatar u11 verbatim, NEW act
        ("elapsed", "بدأ الدرس الساعة ٩:١٠ وانتهى ٩:٤٥ — كم دقيقةً استغرق؟", "٣٥", None),
        ("elapsed", "بدأ النشاط الساعة ٤:٢٠ وانتهى ٤:٥٥ — كم دقيقةً استغرق؟", "٣٥", None),
        ("elapsed", "وصل القطار بعد ٢٠ دقيقةً من الساعة ٣:١٥ — كم تكون الدقائق؟", "٣٥", None),
        ("elapsed", "خرجت الحافلة الساعة ٨:٠٥ ووصلت ٨:٤٠ — كم دقيقةً استغرقت الرحلة؟", "٣٥", None),
    ]),
    ("g3MONEY3", "حساب النقود (٢)", "operational", [          # Oman u19 — ريال/بيسة
        # family 1 — جمع القيم (total) — money widget (بيسة) + larger ريال sums
        ("total", "اجمع قيمة العملات (بالبيسة).", "٤٠",
         {"kind": "money", "mode": "total", "coins": [25, 10, 5]}),
        ("total", "اجمع قيمة العملات (بالبيسة).", "٧٥",
         {"kind": "money", "mode": "total", "coins": [50, 25]}),
        ("total", "اجمع الثمنين: ١٢٠٠ ريال و٨٠٠ ريال = ؟ ريالاً", "٢٠٠٠", None),
        ("total", "اجمع الثمنين: ٢٥٠٠ ريال و١٥٠٠ ريال = ؟ ريالاً", "٤٠٠٠", None),
        # family 2 — الباقي بعد الشراء (change) — Oman u19 «كم تبقى»
        ("change", "ثمن اللعبة ٧٥٠ ريالاً، دفعتَ ١٠٠٠ ريال — كم الباقي؟", "٢٥٠", None),
        ("change", "ثمن الكتاب ٣٢٠ ريالاً، دفعتَ ٥٠٠ ريال — كم الباقي؟", "١٨٠", None),
        ("change", "ثمن الحقيبة ١٦٠٠ ريالاً، دفعتَ ٢٠٠٠ ريال — كم الباقي؟", "٤٠٠", None),
        ("change", "معك ٣٠٠ بيسة، اشتريتَ بـ١٧٥ بيسة — كم بقي؟", "١٢٥", None),
    ]),
]

G3_MEASURE_EDGES = []   # all four are independent measurement-strand ROOTS

NODE_COUNTRIES.update({
    "g3LEN": ("SA", "BH", "OM"),                # AE reserved (u12 image-only, flagged)
    "g3CAPMASS": ("SA", "BH", "QA", "AE", "OM"),
    "g3TIME3": _ALL6,
    "g3MONEY3": ("OM",),                        # Oman-only — Omani ريال/بيسة is CORRECT
})
# =================== end GRADE 3 batch 8 ===================



# --- GRADE 3 batch 9 (المحيط/المساحة/الهندسة): g3PERI / g3AREA3 / g3GEO / g3SYMM / g3COORD ---
# Born live. Body-settled: Oman u26 «الزوايا القائمة» (right angles in 2D shapes)
# -> g3GEO analyze family; Oman u27 «التماثل/الانعكاس» -> g3SYMM. Oman has NO
# perimeter/area unit -> OUT of PERI/AREA3 (documented absence). g3PERI is a ROOT
# not LEN-dependent: QA/KW/AE own PERI without owning LEN (every-owner rule), and
# perimeter computes from GIVEN lengths. g3AREA3 depends on g3MUL (area = L x W —
# the product insight over Q4 counting; the g1AREA->Q4->g3AREA3 ladder). g3COORD =
# wholly new act (BH ch12-7 ordered pair) on the ONE new G3 widget (coord-grid).

G3_GEOM_NODES = [
    ("g3PERI", "المحيط", "operational", [
        ("compute", "مستطيل طوله ٥ سم وعرضه ٣ سم — ما محيطه؟", "١٦", None),
        ("compute", "مربع طول ضلعه ٦ سم — ما محيطه؟", "٢٤", None),
        ("compute", "مثلث أطوال أضلاعه ٤ و٥ و٦ سم — ما محيطه؟", "١٥", None),
        ("unknown", "محيط مستطيل ١٦ سم وطوله ٥ سم — ما عرضه؟", "٣", None),
        ("unknown", "محيط مربع ٢٠ سم — ما طول ضلعه؟", "٥", None),
        ("unknown", "محيط مستطيل ١٨ سم وعرضه ٤ سم — ما طوله؟", "٥", None),
        ("relation", "مستطيلان محيطهما ١٢: الأول ٢×٤ والثاني ٣×٣ — أيهما مساحته أكبر؟", "٣×٣",
         {"kind": "shape-pick", "options": [{"v": "٣×٣"}, {"v": "٢×٤"}]}),
        ("relation", "أيمكن لشكلين مختلفين أن يكون لهما المحيط نفسه؟", "نعم",
         {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]}),
    ]),
    ("g3AREA3", "المساحة بالضرب", "operational", [
        ("multiply", "مستطيل طوله ٥ وعرضه ٤ — ما مساحته بالمربعات؟ (الطول × العرض)", "٢٠", None),
        ("multiply", "مستطيل ٦ × ٣ — ما مساحته؟", "١٨", None),
        ("multiply", "مربع طول ضلعه ٧ — ما مساحته؟", "٤٩", None),
        ("distribute", "مساحة ٦ × ٧ = ٦ × (٥ + ٢) = ٣٠ + ١٢ = ؟", "٤٢", None),
        ("distribute", "مساحة ٨ × ٤ = (٥ + ٣) × ٤ = ٢٠ + ١٢ = ؟", "٣٢", None),
        ("composite", "شكلٌ مركّب من مستطيلين: ٣×٢ و٤×٢ — ما المساحة الكلية؟", "١٤", None),
        ("composite", "شكلٌ مركّب من مربعين: ٣×٣ و٢×٢ — ما المساحة الكلية؟", "١٣", None),
        ("composite", "غرفة ٥×٤ اقتُطع منها مربع ٢×٢ — ما المساحة المتبقية؟", "١٦", None),
    ]),
    ("g3GEO", "خصائص الأشكال", "operational", [
        ("describe", "كم ضلعاً للمستطيل؟", "٤",
         {"kind": "element-count", "shape": "rectangle", "element": "sides", "n": 4}),
        ("describe", "كم رأساً للمثلث؟", "٣",
         {"kind": "element-count", "shape": "triangle", "element": "vertices", "n": 3}),
        ("classify", "أيُّ شكلٍ أضلاعه الأربعة متساوية وزواياه قائمة؟", "مربع",
         {"kind": "shape-pick", "options": [{"v": "مربع", "shape": "square"},
                                            {"v": "مستطيل", "shape": "rectangle"}]}),
        ("classify", "ما اسم هذا الشكل؟", "مخمّس",
         {"kind": "shape-pick", "show": "pentagon",
          "options": [{"v": "مخمّس", "shape": "pentagon"}, {"v": "مسدّس", "shape": "hexagon"}]}),
        ("classify", "أيُّ مجسّمٍ يتدحرج؟", "كرة",
         {"kind": "shape-pick", "options": [{"v": "كرة", "shape": "sphere"},
                                            {"v": "مكعب", "shape": "cube"}]}),
        ("analyze", "كم زاوية قائمة في المربع؟", "٤", None),
        ("analyze", "كم زاوية قائمة في المثلث القائم؟", "١", None),
        ("analyze", "زاوية المثلث المتساوي الأضلاع — أكبر أم أصغر من القائمة؟", "أصغر",
         {"kind": "shape-pick", "options": [{"v": "أصغر"}, {"v": "أكبر"}]}),
    ]),
    ("g3SYMM", "التماثل والتطابق", "operational", [
        ("symmetry", "هل لهذا الشكل خط تماثل؟", "نعم",
         {"kind": "shape-pick", "show": "square", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("symmetry", "هل لهذا الشكل خط تماثل؟", "لا",
         {"kind": "shape-pick", "show": "triangle-scalene", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("symmetry", "هل لهذا الشكل خط تماثل؟", "نعم",
         {"kind": "shape-pick", "show": "circle", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("symmetry", "هل الخطّ المرسوم في المستطيل (عمودي) خط تماثل؟", "نعم",
         {"kind": "shape-pick", "show": "rectangle", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("congruence", "هل الشكلان متطابقان (نفس الشكل والحجم)؟", "نعم",
         {"kind": "shape-pick", "pair": ["square", "square"], "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("congruence", "هل الشكلان متطابقان؟", "لا",
         {"kind": "shape-pick", "pair": ["circle", "triangle"], "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("congruence", "هل الشكلان متطابقان؟", "نعم",
         {"kind": "shape-pick", "pair": ["triangle", "triangle"], "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("congruence", "بعد دوران المربع ربع دورة — أيبقى مطابقاً لأصله؟", "نعم",
         {"kind": "shape-pick", "options": [{"v": "نعم"}, {"v": "لا"}]}),
    ]),
    ("g3COORD", "الزوج المرتب", "operational", [
        ("plot", "ضع نقطةً عند الزوج المرتب (٣، ٢).", "(٣، ٢)",
         {"kind": "coord-grid", "mode": "plot", "max": 6, "target": [3, 2]}),
        ("plot", "ضع نقطةً عند (٥، ٤).", "(٥، ٤)",
         {"kind": "coord-grid", "mode": "plot", "max": 6, "target": [5, 4]}),
        ("plot", "ضع نقطةً عند (١، ٦).", "(١، ٦)",
         {"kind": "coord-grid", "mode": "plot", "max": 6, "target": [1, 6]}),
        ("plot", "ضع نقطةً عند (٤، ٠).", "(٤، ٠)",
         {"kind": "coord-grid", "mode": "plot", "max": 6, "target": [4, 0]}),
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٢، ٥)",
         {"kind": "coord-grid", "mode": "read", "max": 6, "point": [2, 5],
          "options": ["(٢، ٥)", "(٥، ٢)"]}),
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٦، ٣)",
         {"kind": "coord-grid", "mode": "read", "max": 6, "point": [6, 3],
          "options": ["(٦، ٣)", "(٣، ٦)"]}),
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٠، ٤)",
         {"kind": "coord-grid", "mode": "read", "max": 6, "point": [0, 4],
          "options": ["(٠، ٤)", "(٤، ٠)"]}),
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٣، ٣)",
         {"kind": "coord-grid", "mode": "read", "max": 6, "point": [3, 3],
          "options": ["(٣، ٣)", "(٢، ٣)"]}),
    ]),
]

G3_GEOM_EDGES = [
    ("g3MUL", "g3AREA3"),
]

NODE_COUNTRIES.update({
    "g3PERI": ("QA", "SA", "BH", "KW", "AE"),
    "g3AREA3": ("QA", "SA", "BH", "KW", "AE"),
    "g3GEO": ("QA", "SA", "BH", "AE", "KW", "OM"),
    "g3SYMM": ("KW", "BH", "OM"),
    "g3COORD": ("BH",),
})
# =================== end GRADE 3 batch 9 ===================



# --- GRADE 3 batch 10 (البيانات والاحتمال — الختامية): g3DATAR / g3DATAB / g3PROB ---
# Born live. Body-settled: Bahrain ch13 charts use a SCALE/key (كل رمز = ٢؛ تدريج
# بمضاعفات ٢) — the grade-new element over G2's 1:1 DA1/DA2. g3PROB = the SAME
# probability act as G2-DA3 (certain/possible/impossible), built as Bahrain's G3
# instance (the g3MUL<-M1 pattern, a cross-grade pair — not a wholly new act).
# All three ROOTS (data is an independent strand — G2 DATA_EDGES is empty too).
# The scale extension on the chart widget makes «read via the key» a real act.

G3_DATA_NODES = [
    ("g3DATAR", "قراءة البيانات بمقياس", "operational", [
        # family 1 — القراءة بالمقياس (read) — symbols × key = count (Bahrain verbatim)
        ("read", "في مخطّط الصور (كل رمز = ٢): كم عدد الفئة «ب»؟", "٦",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 4], ["ب", 6], ["ج", 8]], "scale": 2, "ask": "count", "cat": "ب"}),
        ("read", "في مخطّط الصور (كل رمز = ٥): كم عدد الفئة «ج»؟", "١٥",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 10], ["ب", 5], ["ج", 15]], "scale": 5, "ask": "count", "cat": "ج"}),
        ("read", "في مخطّط الأعمدة: ما ارتفاع عمود الفئة «أ»؟", "٨",
         {"kind": "chart", "mode": "read", "type": "bar",
          "data": [["أ", 8], ["ب", 4], ["ج", 6]], "ask": "count", "cat": "أ"}),
        # family 2 — التفسير (interpret) — compare, difference, most
        ("interpret", "في المخطّط: أيُّ فئةٍ هي الأكثر؟", "ج",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 4], ["ب", 6], ["ج", 8]], "scale": 2, "ask": "most"}),
        ("interpret", "بكم تزيد الفئة «ج» على الفئة «أ»؟ (كل رمز = ٢)", "٤",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 4], ["ب", 6], ["ج", 8]], "scale": 2, "ask": "count", "cat": "ج"}),
        ("interpret", "كم مجموعُ الفئتين «أ» و«ب»؟ (الأعمدة: أ=٦، ب=٤)", "١٠", None),
        ("interpret", "أيُّ فئةٍ عمودها الأطول؟", "ب",
         {"kind": "chart", "mode": "read", "type": "bar",
          "data": [["أ", 4], ["ب", 8], ["ج", 6]], "ask": "most"}),
        ("interpret", "بكم تقلُّ «أ» عن «ب»؟ (أ=٤، ب=٨)", "٤", None),
    ]),
    ("g3DATAB", "إنشاء التمثيلات بتدريج", "operational", [
        # family 1 — حساب الرموز بالمفتاح (symbols) — Bahrain «كل رمز بقرتين»
        ("symbols", "كلُّ رمزٍ يمثّل ٢ — كم رمزاً تحتاج لتمثيل القيمة ٨؟", "٤", None),
        ("symbols", "كلُّ رمزٍ يمثّل ٥ — كم رمزاً لتمثيل القيمة ٢٠؟", "٤", None),
        ("symbols", "كلُّ رمزٍ يمثّل ٢ — كم رمزاً لتمثيل القيمة ١٠؟", "٥", None),
        ("symbols", "كلُّ رمزٍ يمثّل ١٠ — كم رمزاً لتمثيل القيمة ٣٠؟", "٣", None),
        # family 2 — اختيار التدريج (choose) — Bahrain «لماذا مضاعفات ٢؟»
        ("choose", "لتمثيل القيم ٢، ٤، ٦، ٨ — أيُّ تدريجٍ أنسب؟", "مضاعفات ٢",
         {"kind": "shape-pick", "options": [{"v": "مضاعفات ٢"}, {"v": "آحاد"}]}),
        ("choose", "لتمثيل القيم ٥، ١٠، ١٥، ٢٠ — أيُّ تدريجٍ أنسب؟", "مضاعفات ٥",
         {"kind": "shape-pick", "options": [{"v": "مضاعفات ٥"}, {"v": "مضاعفات ٢"}]}),
        ("choose", "لماذا نختار تدريجاً بمضاعفات أكبر عند القيم الكبيرة؟", "ليتّسع المخطّط",
         {"kind": "shape-pick", "options": [{"v": "ليتّسع المخطّط"}, {"v": "ليكبر العدد"}]}),
        ("choose", "لتمثيل القيم ١٠، ٢٠، ٣٠ — أيُّ تدريجٍ أنسب؟", "مضاعفات ١٠",
         {"kind": "shape-pick", "options": [{"v": "مضاعفات ١٠"}, {"v": "آحاد"}]}),
    ]),
    ("g3PROB", "تحديد الاحتمال", "operational", [           # BH 13-6 — the G3 instance of DA3
        # family 1 — الحتمية (certainty) — certain / possible / impossible
        ("certainty", "كيس فيه كرات حمراء فقط. سحب كرة حمراء حدثٌ:", "أكيد",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 5]],
          "ask": "certainty", "event": "red"}),
        ("certainty", "كيس فيه كرات زرقاء فقط. سحب كرة حمراء حدثٌ:", "مستحيل",
         {"kind": "likelihood", "scenario": "bag", "balls": [["blue", 5]],
          "ask": "certainty", "event": "red"}),
        ("certainty", "كيس فيه ٤ حمراء و٤ زرقاء. سحب كرة حمراء حدثٌ:", "ممكن",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 4], ["blue", 4]],
          "ask": "certainty", "event": "red"}),
        ("certainty", "كيس فيه كرات خضراء فقط. سحب كرة خضراء حدثٌ:", "أكيد",
         {"kind": "likelihood", "scenario": "bag", "balls": [["green", 6]],
          "ask": "certainty", "event": "green"}),
        # family 2 — الترجيح (likely) — more / less likely (spinners & bags)
        ("likely", "كيس فيه ٥ حمراء و٢ زرقاء. أيُّ لونٍ أكثر احتمالاً للسحب؟", "أحمر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 5], ["blue", 2]],
          "ask": "more"}),
        ("likely", "كيس فيه ٣ خضراء و٦ صفراء. أيُّ لونٍ أكثر احتمالاً؟", "أصفر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["green", 3], ["yellow", 6]],
          "ask": "more"}),
        ("likely", "كيس فيه ٦ خضراء و٢ صفراء. أيُّ لونٍ أكثر احتمالاً؟", "أخضر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["green", 6], ["yellow", 2]],
          "ask": "more"}),
        ("likely", "كيس فيه ٢ حمراء و٧ زرقاء. أيُّ لونٍ أقلُّ احتمالاً؟", "أحمر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 2], ["blue", 7]],
          "ask": "less"}),
    ]),
]

G3_DATA_NODES_EDGES = []   # all three ROOTS — data is an independent strand (as in G2)

NODE_COUNTRIES.update({
    "g3DATAR": ("QA", "SA", "BH", "AE", "KW", "OM"),   # six — every country reads data
    "g3DATAB": ("QA", "SA", "BH", "AE", "KW"),         # build with scale — five (no OM)
    "g3PROB": ("BH",),                                 # probability — Bahrain alone
})
# =================== end GRADE 3 batch 10 ===================


# =================================================================================
# ===== GRADE 4 — batch 1 (الأعداد): place value & large numbers, in RANGE TIERS ===
# g4PVM / g4PV4 / g4CMPM / g4ROUNDM / g4ROUND / g4ROUND100. Born live from day one
# (gencontent_g4b1.py; the dynamic registry pin forbids a seed-served G4 node).
# The TIERS were fixed FROM THE SOURCE TEXT (body checks 2026-06-14):
#   • millions for KW/SA/BH/QA/AE (KW idx17 «up to 1 000 000», SA «ضمن الملايين»,
#     QA «الأعداد حتى المليون» + ١ ٢٩١ ٨٤٦, BH ٥٤ ٩٢٩ ٥٢٣) — Oman is NOT here.
#   • g4PV4 is OMAN'S own 4-digit tier (its «قراءة/كتابة/تجزئة» + «الترتيب» read at
#     ≤9999 — ٢٣٤٥/٧٧٧٧/٩١٠٩, order ١٠٦٦/١٦٦٠/٩٠٩٠; the footer-sweep ref had missed
#     it → corrected). The CMP10 precedent: a country whose source range is lower
#     gets its OWN tier, never a leak into the millions node.
#   • THREE rounding tiers (the N120/ROUND4/CMP10 law — merging any two leaks past an
#     owner's source): g4ROUNDM any place ≤million (SA/BH/QA), g4ROUND 10/100/1000
#     (KW idx29 verbatim), g4ROUND100 10/100 (Oman ٧٢٢٥→أقرب مئة). UAE's rounding tier
#     is NOT yet body-confirmed (image-only, edition-mixed) → AE is OUT of all three
#     rounding nodes for now (honest: attribute after the body check, as in G3).
# Questions carry NO country tags (the 120 decision) → each tier's items stay inside
# ITS owners' range; test_grade4 guards every cap.
# =================================================================================

_PLACES_M = ["الآحاد", "العشرات", "المئات", "الآلاف", "عشرات الألوف",
             "مئات الألوف", "الملايين"]

G4_NODES = [
    ("g4PVM", "تعميم القيمة المنزلية حتى الملايين", "operational", [
        # family 1 — التكوين/التفكيك (compose) — the analytical form (KW idx17 + QA verbatim)
        ("compose", "فكِّك العدد ٤٦٥٩٢١ بالصيغة التحليلية: ٤٠٠٠٠٠ + ٦٠٠٠٠ + ٥٠٠٠ + ؟ + ٢٠ + ١ = ٤٦٥٩٢١ — ما قيمة المنزلة الناقصة؟", "٩٠٠", None),
        ("compose", "فكِّك العدد ٧٤٤٢٠٩ بالصيغة التحليلية: ٧٠٠٠٠٠ + ٤٠٠٠٠ + ٤٠٠٠ + ٢٠٠ + ؟ = ٧٤٤٢٠٩ — ما قيمة المنزلة الناقصة؟", "٩", None),
        ("compose", "فكِّك العدد ٣٢٧٠٠٠ بالصيغة التحليلية: ٣٠٠٠٠٠ + ؟ + ٧٠٠٠ = ٣٢٧٠٠٠ — ما قيمة المنزلة الناقصة؟", "٢٠٠٠٠", None),
        # family 2 — قيمة الرقم بموقعه (place) — SA idx14 verbatim numbers
        ("place", "ما قيمة الرقم ٢ في العدد ٩٢٦٧٩٤؟", "٢٠٠٠٠", None),
        ("place", "ما قيمة الرقم ٧ في العدد ١٧٤٣٠٥؟", "٧٠٠٠٠", None),
        ("place", "في أيِّ منزلةٍ يقع الرقم ٥ في العدد ٥٠٠٠٠٠؟", "مئات الألوف",
         {"kind": "shape-pick", "options": [{"v": "مئات الألوف"}, {"v": "الملايين"}]}),
        # family 3 — العلاقات بين القيم المنزلية (relate) — QA 1-2 «كل منزلة ١٠× ما يمينها»
        ("relate", "قيمة الرقم ٧ في منزلة عشرات الألوف تساوي ٧ × ؟", "١٠٠٠٠", None),
        ("relate", "منزلة مئات الألوف قيمتها ١٠ أضعاف منزلة؟", "عشرات الألوف",
         {"kind": "shape-pick", "options": [{"v": "عشرات الألوف"}, {"v": "الملايين"}]}),
    ]),
    ("g4PV4", "قراءة وتجزئة وترتيب الأعداد ضمن الألوف", "operational", [  # OMAN — 4-digit tier
        # family 1 — التكوين/التفكيك — Oman idx14 verbatim («٤٥٦٧ = ٤٠٠٠+٥٠٠+٦٠+٧»)
        ("compose", "فكِّك العدد ٤٥٦٧ بالصيغة التحليلية: ٤٠٠٠ + ٥٠٠ + ؟ + ٧ = ٤٥٦٧ — ما قيمة المنزلة الناقصة؟", "٦٠", None),
        ("compose", "فكِّك العدد ٥٠٠٧ بالصيغة التحليلية: ٥٠٠٠ + ؟ = ٥٠٠٧ — ما قيمة المنزلة الناقصة؟", "٧", None),
        ("compose", "فكِّك العدد ٢٣٤٥ بالصيغة التحليلية: ٢٠٠٠ + ٣٠٠ + ؟ + ٥ = ٢٣٤٥ — ما قيمة المنزلة الناقصة؟", "٤٠", None),
        # family 2 — قيمة الرقم بموقعه — Oman idx14 q4 verbatim
        ("place", "ما قيمة الرقم ٤ في العدد ٦٤٢٣؟", "٤٠٠", None),
        ("place", "ما قيمة الرقم ٤ في العدد ٩٠٤٠؟", "٤٠", None),
        ("place", "في أيِّ منزلةٍ يقع الرقم ٢ في العدد ١٢٣٤؟", "المئات",
         {"kind": "shape-pick", "options": [{"v": "المئات"}, {"v": "الآلاف"}]}),
        # family 3 — الترتيب (order) — Oman idx16 q1 verbatim numbers
        ("order", "رتّب تصاعدياً واكتب الأوّل: ١٠٦٦، ١٦٦٠، ١٦٠٦، ١٠٦٠", "١٠٦٠", None),
        ("order", "رتّب تنازلياً واكتب الأوّل: ٩٠٨٠، ٨٩٩٠، ٩٠٠٩، ٩٠٩٠", "٩٠٩٠", None),
    ]),
    ("g4CMPM", "مقارنة الأعداد وترتيبها حتى الملايين", "operational", [
        # family 1 — موازنة عددين (compare)
        ("compare", "انقر العدد الأكبر.", "١٢٩١٨٤٦",
         {"kind": "shape-pick", "options": [{"v": "١٢٩١٨٤٦"}, {"v": "٦٦٢٩٨٠"}]}),
        ("compare", "انقر العدد الأصغر.", "٤١٧٥٤٧",
         {"kind": "shape-pick", "options": [{"v": "٩٤٩٩٩٩"}, {"v": "٤١٧٥٤٧"}]}),
        ("compare", "أيُّ علامةٍ تصحّ: ٥٤٩٢٩٥ ؟ ٥٤٩٢٩٩", "<",
         {"kind": "shape-pick", "options": [{"v": "<"}, {"v": ">"}]}),
        ("compare", "أيُّ علامةٍ تصحّ: ٩٠٥٠٠٠ ؟ ٨٩٩٩٩٩", ">",
         {"kind": "shape-pick", "options": [{"v": ">"}, {"v": "<"}]}),
        # family 2 — ترتيب متعدد (order) — QA idx32 verbatim numbers
        ("order", "رتّب تصاعدياً واكتب الأوّل: ٤٩٣٢٩٥، ٢٧٧٢٩٢، ٩٥٦٠٠٠، ٣٢١٦٧٩", "٢٧٧٢٩٢", None),
        ("order", "رتّب تنازلياً واكتب الأوّل: ١١٧٨٢١، ٩٤٩٩٩٩، ٦٦٦٨٢١، ٤١٧٥٤٧", "٩٤٩٩٩٩", None),
        ("order", "رتّب تصاعدياً واكتب الأوّل: ٢٥٠٩٥٢، ٢٠٥٩٢٥، ٢٥٩٠٥٢، ٢٠٩٥٢٥", "٢٠٥٩٢٥", None),
        ("order", "رتّب تنازلياً واكتب الأوّل: ٧٧٧٧٧٧، ٧٠٧٧٧٧، ٧٧٠٧٧٧، ٧٧٧٠٧٧", "٧٧٧٧٧٧", None),
    ]),
    ("g4ROUNDM", "التقريب إلى أي منزلة حتى المليون", "operational", [  # SA/BH/QA
        # family 1 — التقريب المباشر (rounding) — SA idx34 + QA idx32 verbatim
        ("rounding", "قرِّب ٣١٩٠٢٣٦ إلى أقرب مليون.", "٣٠٠٠٠٠٠",
         {"kind": "number-line", "min": 3000000, "max": 4000000, "step": 1000000, "target": 3190236}),
        ("rounding", "قرِّب ٧٩١٢٧٥ إلى أقرب مئة ألف.", "٨٠٠٠٠٠",
         {"kind": "number-line", "min": 700000, "max": 800000, "step": 100000, "target": 791275}),
        ("rounding", "قرِّب ٩٠٦٤٢١ إلى أقرب مئة ألف.", "٩٠٠٠٠٠",
         {"kind": "number-line", "min": 900000, "max": 1000000, "step": 100000, "target": 906421}),
        ("rounding", "قرِّب ٩٥٢٣٠ إلى أقرب عشرة آلاف.", "١٠٠٠٠٠",
         {"kind": "number-line", "min": 90000, "max": 100000, "step": 10000, "target": 95230}),
        # family 2 — التقريب العكسي (inverse) — pre-images of a target (Oman p57 q3 act, M range)
        ("inverse", "أيُّ الأعداد يؤول إلى ٣٠٠٠٠٠ عند تقريبه إلى أقرب مئة ألف؟", "٢٨٤٠٠٠",
         {"kind": "shape-pick", "options": [{"v": "٢٨٤٠٠٠"}, {"v": "٣٦٢٠٠٠"}, {"v": "٢٣٩٠٠٠"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٥٠٠٠٠٠ عند تقريبه إلى أقرب مئة ألف؟", "٥٣٢٠٠٠",
         {"kind": "shape-pick", "options": [{"v": "٥٣٢٠٠٠"}, {"v": "٥٧٠٠٠٠"}, {"v": "٤٣٠٠٠٠"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٤٠٠٠ عند تقريبه إلى أقرب ألف؟", "٤٣٢٠",
         {"kind": "shape-pick", "options": [{"v": "٤٣٢٠"}, {"v": "٤٧٨٠"}, {"v": "٣٤٠٩"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٢٠٠٠٠٠٠ عند تقريبه إلى أقرب مليون؟", "٢٣٨١٠٠٠",
         {"kind": "shape-pick", "options": [{"v": "٢٣٨١٠٠٠"}, {"v": "٢٧٨٠٠٠٠"}, {"v": "١٤٠٩٠٠٠"}]}),
    ]),
    ("g4ROUND", "التقريب إلى أقرب عشرة ومئة وألف", "operational", [  # KW idx29 verbatim
        # family 1 — التقريب المباشر
        ("rounding", "قرِّب ٩٢٧٥ إلى أقرب عشرة.", "٩٢٨٠",
         {"kind": "number-line", "min": 9270, "max": 9280, "step": 10, "target": 9275}),
        ("rounding", "قرِّب ١٤٨٢ إلى أقرب مئة.", "١٥٠٠",
         {"kind": "number-line", "min": 1400, "max": 1500, "step": 100, "target": 1482}),
        ("rounding", "قرِّب ٢٩٣٥ إلى أقرب ألف.", "٣٠٠٠",
         {"kind": "number-line", "min": 2000, "max": 3000, "step": 1000, "target": 2935}),
        ("rounding", "قرِّب ٢٥٠٩٥٢ إلى أقرب ألف.", "٢٥١٠٠٠",
         {"kind": "number-line", "min": 250000, "max": 251000, "step": 1000, "target": 250952}),
        # family 2 — التقريب العكسي
        ("inverse", "أيُّ الأعداد يؤول إلى ٤٦٠ عند تقريبه إلى أقرب عشرة؟", "٤٥٧",
         {"kind": "shape-pick", "options": [{"v": "٤٥٧"}, {"v": "٤٦٧"}, {"v": "٤٥٣"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٣٠٠ عند تقريبه إلى أقرب مئة؟", "٢٨٤",
         {"kind": "shape-pick", "options": [{"v": "٢٨٤"}, {"v": "٣٦٢"}, {"v": "٢٣٩"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٥٠٠٠ عند تقريبه إلى أقرب ألف؟", "٥٣٢٠",
         {"kind": "shape-pick", "options": [{"v": "٥٣٢٠"}, {"v": "٥٧٠٠"}, {"v": "٤٣٠٠"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٨٠٠٠ عند تقريبه إلى أقرب ألف؟", "٧٦٤٩",
         {"kind": "shape-pick", "options": [{"v": "٧٦٤٩"}, {"v": "٨٦٠٠"}, {"v": "٧٤٩٩"}]}),
    ]),
    ("g4ROUND100", "التقريب إلى أقرب عشرة ومئة", "operational", [  # OMAN idx16 verbatim
        # family 1 — التقريب المباشر — Oman p4 q3 verbatim («٧٢٢٥/٢٤٨٠/١٠٠٧ → أقرب مئة»)
        ("rounding", "قرِّب ٧٢٢٥ إلى أقرب مئة.", "٧٢٠٠",
         {"kind": "number-line", "min": 7200, "max": 7300, "step": 100, "target": 7225}),
        ("rounding", "قرِّب ٢٤٨٠ إلى أقرب مئة.", "٢٥٠٠",
         {"kind": "number-line", "min": 2400, "max": 2500, "step": 100, "target": 2480}),
        ("rounding", "قرِّب ١٠٠٧ إلى أقرب مئة.", "١٠٠٠",
         {"kind": "number-line", "min": 1000, "max": 1100, "step": 100, "target": 1007}),
        ("rounding", "قرِّب ٢٩٠١ إلى أقرب عشرة.", "٢٩٠٠",
         {"kind": "number-line", "min": 2900, "max": 2910, "step": 10, "target": 2901}),
        # family 2 — التقريب العكسي
        ("inverse", "أيُّ الأعداد يؤول إلى ٧٢٠٠ عند تقريبه إلى أقرب مئة؟", "٧٢٢٥",
         {"kind": "shape-pick", "options": [{"v": "٧٢٢٥"}, {"v": "٧٢٧٠"}, {"v": "٧١٤٠"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٢٥٠٠ عند تقريبه إلى أقرب مئة؟", "٢٤٨٠",
         {"kind": "shape-pick", "options": [{"v": "٢٤٨٠"}, {"v": "٢٥٧٠"}, {"v": "٢٤٣٠"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٣٠٣٠ عند تقريبه إلى أقرب عشرة؟", "٣٠٣٢",
         {"kind": "shape-pick", "options": [{"v": "٣٠٣٢"}, {"v": "٣٠٤٧"}, {"v": "٣٠٢٣"}]}),
        ("inverse", "أيُّ الأعداد يؤول إلى ٦٠٠٠ عند تقريبه إلى أقرب مئة؟", "٥٩٨٠",
         {"kind": "shape-pick", "options": [{"v": "٥٩٨٠"}, {"v": "٦٠٧٠"}, {"v": "٥٨٤٠"}]}),
    ]),
]

# minimal-common edges. g4PVM and g4PV4 are SEPARATE ROOTS (disjoint owners — the
# millions five vs Oman; the CMP10 precedent: no edge crosses to a tier the owner
# doesn't reach). CMPM/ROUNDM/ROUND hang on the millions place value; ROUND100 on
# the 4-digit one. Every edge survives the every-owner rule.
G4_EDGES = [
    ("g4PVM", "g4CMPM"),
    ("g4PVM", "g4ROUNDM"),
    ("g4PVM", "g4ROUND"),
    ("g4PV4", "g4ROUND100"),
]

NODE_COUNTRIES.update({
    "g4PVM": ("SA", "BH", "KW", "QA", "AE"),   # the millions five — Oman NOT here
    "g4PV4": ("OM",),                          # Oman's own 4-digit tier (body-confirmed)
    "g4CMPM": ("SA", "BH", "KW", "QA", "AE"),
    "g4ROUNDM": ("SA", "BH", "QA", "AE"),      # any place ≤ million; AE LIFTED 2026-06-14
                                               # (و١ idx62: ٣٨١٣٧→عشرة آلاف، ٦٧٢٧٢٦→مئة ألف)
    "g4ROUND": ("KW",),                        # 10/100/1000 — KW idx29 verbatim
    "g4ROUND100": ("OM",),                     # 10/100 — Oman's lowest tier
})
# =================== end GRADE 4 batch 1 ===================


# =================================================================================
# ===== GRADE 4 — batch 2 (العمليات): add/sub fluency, properties, estimate, ======
# ===== mult ×1-digit, factors, primes ============================================
# Born live (gencontent_g4b2.py). Body checks 2026-06-14 fixed the structure:
#   • g4ADDSUB (millions fluency, 5 countries) + g4ADD4 (OMAN's 4-digit tier — like
#     g4PV4; its multiplication is facts-level so Oman is OUT of g4MUL1 entirely).
#   • g4PROPS (SA/BH «الجبر: خصائص الجمع» — a NAMED-property act) and g4EST (SA/BH/QA/
#     KW/AE «تقدير المجموع والفرق» + «الدقيق أم التقديري» — standalone lessons → its own
#     node, pairing g3EST3). BOTH ROOTS: SA orders them BEFORE the add algorithm
#     (2-1/2-2/2-3 < 2-4) — an ADDSUB→PROPS/EST edge would reverse the source (the
#     g3PROPS-is-root precedent). The owner's proposed ADDSUB→PROPS edge was corrected
#     here by the body order (clause-(j) alert raised in chat).
#   • g4MUL1 (multi-digit×1, 5 countries) → g4FACT? NO: SA orders factors 5-1 BEFORE
#     the multi-digit algorithm 5-5, KW/QA order mult before factors → inconsistent, so
#     the MUL1→FACT edge DROPS (g4FACT is a ROOT; its true prereq is g3-level × meaning,
#     already held). The owner's proposed MUL1→FACT edge corrected by the body order.
#   • g4FACT (factors/multiples — SA/BH/KW/QA) → g4PRIME (prime/composite — KW «عدد
#     أولي/غير أولي» 5-5 + QA و٦-٤; a NEW act). factors-before-primes holds in BOTH
#     owners → the ONE surviving edge. AE pending under the AE-FACT reservation
#     (image-only/edition-mixed — attributed after a clear body read, no guess).
# =================================================================================

G4_ADDSUB_NODES = [
    ("g4ADDSUB", "الطلاقة في جمع وطرح الأعداد متعددة الأرقام", "operational", [
        # family 1 — الخوارزمي العمودي (algorithm); zeros are CASES
        ("algorithm", "اجمع عمودياً (بإعادة التجميع): ٨٢٤٧٦ + ٣٤٥٨٩ = ؟", "١١٧٠٦٥", None),
        ("algorithm", "اطرح عمودياً (بإعادة التجميع): ٧٥٠٤٢ − ٢٦٧٥٨ = ؟", "٤٨٢٨٤", None),
        ("algorithm", "اجمع عمودياً: ٢٣٦٩٧ + ١٤٥٣٨ = ؟", "٣٨٢٣٥", None),  # AE idx62 «23,697»
        ("algorithm", "اطرح عمودياً: ٥٠٠٠٠ − ٢٧٦٣١ = ؟", "٢٢٣٦٩", None),   # zeros CASE
        # family 2 — الذهني/التعويض (mental) — AE idx96 verbatim
        ("mental", "اطرح ذهنياً (نمط القيمة المنزلية): ٨٢٠٠٠ − ٧٦٠٠٠ = ؟", "٦٠٠٠", None),
        ("mental", "اجمع ذهنياً بالتعويض: ٤٩٩ + ٧٧ (اجعل ٤٩٩ ← ٥٠٠) = ؟", "٥٧٦", None),
        ("mental", "اطرح ذهنياً (نمط القيمة المنزلية): ٤٥٠٠٠ − ٢٠٠٠٠ = ؟", "٢٥٠٠٠", None),
        ("mental", "اجمع ذهنياً (نمط القيمة المنزلية): ٣٠٠٠٠ + ٥٠٠٠٠ = ؟", "٨٠٠٠٠", None),
    ]),
    ("g4ADD4", "جمع وطرح الأعداد ضمن الألوف", "operational", [  # OMAN — 4-digit tier
        # family 1 — الخوارزمي العمودي
        ("algorithm", "اجمع عمودياً (بإعادة التجميع): ٣٤٥٢ + ٢٦٧٨ = ؟", "٦١٣٠", None),
        ("algorithm", "اطرح عمودياً (بإعادة التجميع): ٨٤٢٢ − ٥٩٩٥ = ؟", "٢٤٢٧", None),
        ("algorithm", "اطرح عمودياً: ٦٠٠٠ − ٢٧٨١ = ؟", "٣٢١٩", None),       # zeros CASE
        ("algorithm", "اجمع عمودياً: ٤٧٨٩ + ٣٢١٥ = ؟", "٨٠٠٤", None),
        # family 2 — التجزئة (partition) — Oman «التجزئة بهدف الجمع والطرح»
        ("partition", "حلّل ثم اجمع: ٤٥٦٧ + ٢٣٤٥ = (٤٠٠٠ + ٢٠٠٠) + … = ؟", "٦٩١٢", None),
        ("partition", "حلّل ثم اطرح: ٧٨٥٦ − ٣٤٢١ = (٧٠٠٠ − ٣٠٠٠) + … = ؟", "٤٤٣٥", None),
        ("partition", "حلّل ثم اجمع: ٢٦٣٤ + ٥١٢٣ = (٢٠٠٠ + ٥٠٠٠) + … = ؟", "٧٧٥٧", None),
        ("partition", "حلّل ثم اطرح: ٩٥٤٨ − ٤٢١٧ = (٩٠٠٠ − ٤٠٠٠) + … = ؟", "٥٣٣١", None),
    ]),
    ("g4PROPS", "خواص الجمع وقواعد الطرح", "operational", [  # SA/BH ch2-1 — 2 owners
        # family 1 — تطبيق الخاصية (property) — commutative / associative / identity
        ("property", "بخاصية الإبدال: ٤٥٠٠ + ٢٧٠٠ = ٢٧٠٠ + ؟", "٤٥٠٠", None),
        ("property", "بخاصية التجميع: (١٨ + ١٤) + ١٥ = ١٨ + (١٤ + ؟)", "١٥", None),
        ("property", "العنصر المحايد الجمعي: ٦٠٠٠ + ؟ = ٦٠٠٠", "٠", None),
        ("property", "بخاصية الإبدال: ٣٥٠ + ٤٢٠ = ٤٢٠ + ؟", "٣٥٠", None),
        # family 2 — العلاقة العكسية (relation) — «قاعدة الطرح عكس الجمع»
        ("relation", "إذا كان ٢٦٠ + ٤٧٠ = ٧٣٠ فإنَّ ٧٣٠ − ٤٧٠ = ؟", "٢٦٠", None),
        ("relation", "المعادلة الناقصة: ؟ − ٣٤٠ = ٥٨٠", "٩٢٠", None),
        ("relation", "إذا كان ١٢٥ + ٣٧٥ = ٥٠٠ فإنَّ ٥٠٠ − ١٢٥ = ؟", "٣٧٥", None),
        ("relation", "المعادلة الناقصة: ؟ − ٢١٠ = ٣٤٠", "٥٥٠", None),
    ]),
    ("g4EST", "تقدير نواتج الجمع والطرح", "operational", [  # SA/BH/QA/KW/AE — pairs g3EST3
        # family 1 — تقدير الناتج (estimate)
        ("estimate", "قدِّر بالتقريب لأقرب مئة: ٤٨٧ + ٣١٢ ≈ ؟", "٨٠٠", None),
        ("estimate", "قدِّر بالتقريب لأقرب مئة: ٦٢٣ − ٢٨٩ ≈ ؟", "٣٠٠", None),
        ("estimate", "قدِّر بالتقريب لأقرب ألف: ٤٨٧٠ + ٣١٢٠ ≈ ؟", "٨٠٠٠", None),
        ("estimate", "قدِّر بالتقريب لأقرب ألف: ٧١٧٣ − ٢٨٤٠ ≈ ؟", "٤٠٠٠", None),
        # family 2 — الدقيق أم التقديري (decision) — SA 2-3 / BH 2-3 verbatim act
        ("decision", "هل يكفي ١٠٠ ريالٍ لشراء غرضين بـ ٤٧ و٣٨؟ — ماذا يلزمك؟", "يكفي التقدير",
         {"kind": "shape-pick", "options": [{"v": "يكفي التقدير"}, {"v": "جوابٌ دقيق"}]}),
        ("decision", "كم يتبقّى بالضبط من ٥٠٠ بعد شراءٍ بـ ٢٣٧؟ — ماذا يلزمك؟", "جوابٌ دقيق",
         {"kind": "shape-pick", "options": [{"v": "جوابٌ دقيق"}, {"v": "يكفي التقدير"}]}),
        ("decision", "هل تكفي ١٠٠٠ ريالٍ لشراء جهازين بـ ٤٨٠ و٣٩٠؟ — ماذا يلزمك؟", "يكفي التقدير",
         {"kind": "shape-pick", "options": [{"v": "يكفي التقدير"}, {"v": "جوابٌ دقيق"}]}),
        ("decision", "كم ثمن الفاتورة بالضبط لصنفين بـ ٢٣٧ و١٤٨؟ — ماذا يلزمك؟", "جوابٌ دقيق",
         {"kind": "shape-pick", "options": [{"v": "جوابٌ دقيق"}, {"v": "يكفي التقدير"}]}),
    ]),
    ("g4MUL1", "الضرب في عدد من رقم واحد", "operational", [  # SA/BH/KW/QA/AE — Oman OUT
        # family 1 — الضرب في مضاعفات ١٠/١٠٠/١٠٠٠ (multiples10)
        ("multiples10", "٤ × ٢٠٠ = ؟", "٨٠٠", None),
        ("multiples10", "٦ × ٥٠ = ؟", "٣٠٠", None),
        ("multiples10", "٣ × ٢٠٠٠ = ؟", "٦٠٠٠", None),
        # family 2 — التوزيع/النواتج الجزئية (distributive)
        ("distributive", "فكِّك: ٤ × ١٢٣ = ٤ × (١٠٠ + ٢٠ + ٣) = ؟", "٤٩٢", None),
        ("distributive", "فكِّك: ٣ × ٢٤٦ = ٣ × (٢٠٠ + ٤٠ + ٦) = ؟", "٧٣٨", None),
        # family 3 — الخوارزمي العمودي (algorithm) — 3-digit × 1, real renaming
        ("algorithm", "اضرب عمودياً (بإعادة التسمية): ٢٣٧ × ٤ = ؟", "٩٤٨", None),
        ("algorithm", "اضرب عمودياً (بإعادة التسمية): ١٢٦ × ٧ = ؟", "٨٨٢", None),
        ("algorithm", "اضرب عمودياً: ٤٨ × ٦ = ؟", "٢٨٨", None),
    ]),
    ("g4FACT", "العوامل والمضاعفات", "operational", [  # SA/BH/KW/QA — ROOT (×-meaning is g3)
        # family 1 — إيجاد العوامل (factors)
        ("factors", "أيُّ عددٍ من عوامل ٢٤؟", "٦",
         {"kind": "shape-pick", "options": [{"v": "٦"}, {"v": "٥"}]}),
        ("factors", "أيُّ عددٍ من عوامل ٣٦؟", "٩",
         {"kind": "shape-pick", "options": [{"v": "٩"}, {"v": "٨"}]}),
        ("factors", "أيُّ عددٍ من عوامل ١٢؟", "٤",
         {"kind": "shape-pick", "options": [{"v": "٤"}, {"v": "٥"}]}),
        # family 2 — إيجاد المضاعفات (multiples)
        ("multiples", "أيُّ عددٍ من مضاعفات ٧؟", "٢٨",
         {"kind": "shape-pick", "options": [{"v": "٢٨"}, {"v": "٣٠"}]}),
        ("multiples", "أيُّ عددٍ من مضاعفات ٦؟", "٤٨",
         {"kind": "shape-pick", "options": [{"v": "٤٨"}, {"v": "٥٠"}]}),
        ("multiples", "أيُّ عددٍ من مضاعفات ٩؟", "٦٣",
         {"kind": "shape-pick", "options": [{"v": "٦٣"}, {"v": "٦٠"}]}),
        # family 3 — العوامل المشتركة (common) — KW 5-5 «عوامل مشتركة»
        ("common", "ما أحد العوامل المشتركة للعددين ١٢ و١٨؟", "٦",
         {"kind": "shape-pick", "options": [{"v": "٦"}, {"v": "٨"}]}),
        ("common", "ما أحد العوامل المشتركة للعددين ١٥ و٢٠؟", "٥",
         {"kind": "shape-pick", "options": [{"v": "٥"}, {"v": "٤"}]}),
    ]),
    ("g4PRIME", "الأعداد الأولية وغير الأولية", "operational", [  # KW 5-5 + QA و٦-٤ — NEW act
        # family 1 — تصنيف أولي/غير أولي (classify)
        ("classify", "العدد ٧: أوليٌّ أم غير أوليّ؟", "عدد أولي",
         {"kind": "shape-pick", "options": [{"v": "عدد أولي"}, {"v": "عدد غير أولي"}]}),
        ("classify", "العدد ٩: أوليٌّ أم غير أوليّ؟", "عدد غير أولي",
         {"kind": "shape-pick", "options": [{"v": "عدد غير أولي"}, {"v": "عدد أولي"}]}),
        ("classify", "العدد ١٣: أوليٌّ أم غير أوليّ؟", "عدد أولي",
         {"kind": "shape-pick", "options": [{"v": "عدد أولي"}, {"v": "عدد غير أولي"}]}),
        ("classify", "العدد ١٥: أوليٌّ أم غير أوليّ؟", "عدد غير أولي",
         {"kind": "shape-pick", "options": [{"v": "عدد غير أولي"}, {"v": "عدد أولي"}]}),
        # family 2 — تعريف العاملين (definition) — «الأولي له عاملان فقط»
        ("definition", "العدد الأوليّ له عاملان فقط (١ ونفسه). أيُّ الأعداد أوليّ؟", "٥",
         {"kind": "shape-pick", "options": [{"v": "٥"}, {"v": "٨"}]}),
        ("definition", "العدد الأوليّ له عاملان فقط. أيُّ الأعداد أوليّ؟", "١١",
         {"kind": "shape-pick", "options": [{"v": "١١"}, {"v": "٩"}]}),
        ("definition", "العدد الأوليّ له عاملان فقط. أيُّ الأعداد أوليّ؟", "٢",
         {"kind": "shape-pick", "options": [{"v": "٢"}, {"v": "٤"}]}),
        ("definition", "العدد الأوليّ له عاملان فقط. أيُّ الأعداد أوليّ؟", "٣",
         {"kind": "shape-pick", "options": [{"v": "٣"}, {"v": "٦"}]}),
    ]),
]

# minimal-common edges (from the ACTUAL country order): g4ADDSUB, g4ADD4, g4PROPS,
# g4EST, g4MUL1, g4FACT are all ROOTS — properties/estimate/factors precede the
# fluency/algorithm in their owners' books, and the × meaning the factors need is the
# g3-level (already held). The ONLY surviving edge is factors → primes (KW 5-5 + QA
# و٦ both order factors before the prime classification).
G4_ADDSUB_EDGES = [
    ("g4FACT", "g4PRIME"),
]

NODE_COUNTRIES.update({
    "g4ADDSUB": ("SA", "BH", "KW", "QA", "AE"),
    "g4ADD4": ("OM",),                         # Oman's 4-digit tier (its × is facts-level)
    "g4PROPS": ("SA", "BH"),                   # the named-property lesson — two owners
    "g4EST": ("SA", "BH", "KW", "QA", "AE"),   # standalone estimate/decision lessons
    "g4MUL1": ("SA", "BH", "KW", "QA", "AE"),  # multi-digit × 1 — Oman OUT (facts only)
    "g4FACT": ("SA", "BH", "KW", "QA"),        # AE pending — AE-FACT reservation
    "g4PRIME": ("KW", "QA"),                   # prime/composite — explicit in KW + QA
})
# =================== end GRADE 4 batch 2 ===================


# =================================================================================
# ===== GRADE 4 — batch 3 (الضرب والقسمة): ×2-digit + long division ===============
# Born live (gencontent_g4b3.py). Body checks 2026-06-14:
#   • g4MUL2 (2-digit×2-digit + 3-digit×2-digit) — the NEW act above g3MULBIG (both
#     factors multi-digit → cross partial products; KW idx60-62 «Exploring 2-Digit
#     Multiplication» confirms Kuwait reaches it). Oman OUT (its × is facts-level).
#   • g4DIV1 (LONG division ÷1-digit: multi-digit dividend, remainder, ÷10/100/1000,
#     estimate) — a procedural extension of g3DIVREM (remainder familiar; long algorithm
#     new). Kuwait adds «قابلية القسمة ٢/٥/١٠» — DEFERRED (KW-only, would leak in a
#     5-country node; revisit as a KW family / under factors).
#   • g4DIV2 (OMAN's lower tier — 2-digit ÷ 1-digit WITH remainder + halving; the
#     remainder is NEW for Oman → pairs g3DIVREM, like g4PV4/g4ADD4).
# Edges from the ACTUAL order: g4MUL1 → g4MUL2 and g4MUL1 → g4DIV1 (every owner teaches
# ×1 before ×2 and before ÷; ÷1-digit inverts ×1, NOT ×2) — MUL2/DIV1 are SIBLINGS
# under g4MUL1. g4DIV2 is Oman's own root.
# =================================================================================

G4_MULDIV_NODES = [
    ("g4MUL2", "الضرب في عدد من رقمين", "operational", [  # SA/BH/KW/QA/AE — Oman OUT
        # family 1 — الضرب في مضاعفات العشرة (multiples10)
        ("multiples10", "٦٠ × ٤٠ = ؟", "٢٤٠٠", None),
        ("multiples10", "٧٠ × ٣٠ = ؟", "٢١٠٠", None),
        # family 2 — النواتج الجزئية/نموذج المساحة (partial) — SA «١٢×١٨/١٦×١٩» verbatim
        ("partial", "بالنواتج الجزئية: ١٨ × ١٢ = (١٨ × ١٠) + (١٨ × ٢) = ؟", "٢١٦", None),
        ("partial", "بالنواتج الجزئية: ١٦ × ١٩ = (١٦ × ١٠) + (١٦ × ٩) = ؟", "٣٠٤", None),
        ("partial", "بالنواتج الجزئية: ٢٣ × ١٤ = (٢٣ × ١٠) + (٢٣ × ٤) = ؟", "٣٢٢", None),
        # family 3 — الخوارزمي العمودي (algorithm) — incl. 3-digit × 2-digit
        ("algorithm", "اضرب عمودياً: ٤٢ × ٢٣ = ؟", "٩٦٦", None),
        ("algorithm", "اضرب عمودياً: ٣٨ × ٢٤ = ؟", "٩١٢", None),   # SA «٣٨ ريالاً × ٢٤ شهراً»
        ("algorithm", "اضرب عمودياً: ٢١٤ × ٣٢ = ؟", "٦٨٤٨", None),  # 3-digit × 2-digit
    ]),
    ("g4DIV1", "القسمة المطوّلة على عدد من رقم واحد", "operational", [  # SA/BH/KW/QA/AE
        # family 1 — القسمة المطوّلة (longdiv) — quotient & remainder, book format
        ("longdiv", "٩٥ ÷ ٧ = ؟ — انقر الناتج والباقي.", "١٣ والباقي ٤",   # SA 7-5 «٩٥÷٧»
         {"kind": "shape-pick", "options": [{"v": "١٣ والباقي ٤"}, {"v": "١٢ والباقي ١١"}]}),
        ("longdiv", "٧٩٥ ÷ ٥ = ؟ — انقر الناتج والباقي.", "١٥٩ والباقي ٠",  # SA «٧٩٥÷٥»
         {"kind": "shape-pick", "options": [{"v": "١٥٩ والباقي ٠"}, {"v": "١٥٨ والباقي ٥"}]}),
        ("longdiv", "٣٤٧ ÷ ٥ = ؟ — انقر الناتج والباقي.", "٦٩ والباقي ٢",
         {"kind": "shape-pick", "options": [{"v": "٦٩ والباقي ٢"}, {"v": "٦٨ والباقي ٧"}]}),
        ("longdiv", "٦١٨ ÷ ٤ = ؟ — انقر الناتج والباقي.", "١٥٤ والباقي ٢",
         {"kind": "shape-pick", "options": [{"v": "١٥٤ والباقي ٢"}, {"v": "١٥٣ والباقي ٦"}]}),
        # family 2 — قسمة المضاعفات ١٠/١٠٠/١٠٠٠ (multiples10)
        ("multiples10", "٨٠٠ ÷ ١٠٠ = ؟", "٨", None),
        ("multiples10", "٦٠٠٠ ÷ ١٠٠٠ = ؟", "٦", None),
        # family 3 — تقدير ناتج القسمة (estimate) — compatible numbers
        ("estimate", "قدِّر ناتج ٤٢٢ ÷ ٦ (إلى أقرب ناتجٍ مناسب).", "٧٠", None),
        ("estimate", "قدِّر ناتج ٣٥٨ ÷ ٩ (إلى أقرب ناتجٍ مناسب).", "٤٠", None),
    ]),
    ("g4DIV2", "القسمة (رقمان ÷ رقم) مع باقٍ", "operational", [  # OMAN — 2-digit tier
        # family 1 — الناتج والباقي (remainder) — Oman p56 «٤٩÷٤ باقي ١» pattern
        ("remainder", "٤٩ ÷ ٤ = ؟ — انقر الناتج والباقي.", "١٢ والباقي ١",
         {"kind": "shape-pick", "options": [{"v": "١٢ والباقي ١"}, {"v": "١١ والباقي ٥"}]}),
        ("remainder", "١٧ ÷ ٤ = ؟ — انقر الناتج والباقي.", "٤ والباقي ١",
         {"kind": "shape-pick", "options": [{"v": "٤ والباقي ١"}, {"v": "٣ والباقي ٥"}]}),
        ("remainder", "٨١ ÷ ٤ = ؟ — انقر الناتج والباقي.", "٢٠ والباقي ١",
         {"kind": "shape-pick", "options": [{"v": "٢٠ والباقي ١"}, {"v": "١٩ والباقي ٥"}]}),
        ("remainder", "٣٨ ÷ ٥ = ؟ — انقر الناتج والباقي.", "٧ والباقي ٣",
         {"kind": "shape-pick", "options": [{"v": "٧ والباقي ٣"}, {"v": "٦ والباقي ٨"}]}),
        # family 2 — التنصيف (halving) — Oman «٧٢ ÷ ٤ بالتنصيف»
        ("halving", "أوجد ٧٢ ÷ ٤ بالتنصيف: نصف ٧٢ = ٣٦، ونصف ٣٦ = ؟", "١٨", None),
        ("halving", "أوجد ٤٨ ÷ ٢ بالتنصيف: نصف ٤٨ = ؟", "٢٤", None),
        ("halving", "أوجد ٥٦ ÷ ٤ بالتنصيف: نصف ٥٦ = ٢٨، ونصف ٢٨ = ؟", "١٤", None),
        ("halving", "أوجد ٣٦ ÷ ٢ بالتنصيف: نصف ٣٦ = ؟", "١٨", None),
    ]),
]

# siblings under g4MUL1 (the actual order: ×1 before ×2 and before ÷1). g4DIV2 = root.
G4_MULDIV_EDGES = [
    ("g4MUL1", "g4MUL2"),
    ("g4MUL1", "g4DIV1"),
]

NODE_COUNTRIES.update({
    "g4MUL2": ("SA", "BH", "KW", "QA", "AE"),   # 2-digit × 2-digit — five (Oman OUT)
    "g4DIV1": ("SA", "BH", "KW", "QA", "AE"),   # long division ÷1-digit — five
    "g4DIV2": ("OM",),                          # Oman's 2-digit tier (remainder is new)
})
# =================== end GRADE 4 batch 3 ===================


# =================================================================================
# ===== GRADE 4 — batch 4 (الكسور): represent / equivalence / operations =========
# Born live (gencontent_g4b4.py). Body checks 2026-06-14 — the richest gradient:
#   • g4FRAC (represent / number-line / mixed↔improper) + g4FREQ (equivalent / compare)
#     — ALL SIX at ≤12 (Oman's fraction wall confirms equivalence at the same range →
#     NO Oman tier for fractions; Oman is only OUT of the operations).
#   • g4FRADD (add/sub LIKE) — SA/BH/KW/QA/AE. g4FRADDX (add/sub UNLIKE — KW only,
#     idx60/64 «المقامات المختلفة»; a harder act, separate so it can't leak into the
#     5-country node). g4FRMUL (× — QA only, و٩ «٣/٤=٣×١/٤»; AE و٩ is add/sub LIKE,
#     body-confirmed ص٥٨١). The fraction OPERATIONS are wholly NEW above G3 (which
#     stopped at equivalence/comparison).
# Mixed↔improper is a FAMILY of g4FRAC (the owner's ruling: a representation/conversion
# lesson stays a family, unlike the distinct «estimate» act of batch 2).
# DAG (each edge holds in EVERY owner's order): FRAC → FREQ → FRADD → {FRADDX, FRMUL}.
# =================================================================================

G4_FRACTION_NODES = [
    ("g4FRAC", "تمثيل الكسور والأعداد الكسرية", "operational", [  # six — ≤12
        # family 1 — التمثيل/التسمية (represent) — the proven G3 fraction widget, den ≤12
        ("represent", "ما الكسر الملوّن؟ انقر الإجابة.", "٣/٤",
         {"kind": "fraction", "mode": "name", "parts": 4, "shaded": 3,
          "options": ["٣/٤", "١/٤", "٢/٤"]}),
        ("represent", "ما الكسر الملوّن؟ انقر الإجابة.", "٥/١٢",
         {"kind": "fraction", "mode": "name", "parts": 12, "shaded": 5,
          "options": ["٥/١٢", "٤/١٢", "٧/١٢"]}),
        ("represent", "ما الكسر الملوّن؟ انقر الإجابة.", "٢/٦",
         {"kind": "fraction", "mode": "name", "parts": 6, "shaded": 2,
          "options": ["٢/٦", "١/٦", "٣/٦"]}),
        # family 2 — الموضعة على خط الأعداد (numline)
        ("numline", "انقر موضع ٣/٤ على الخطّ.", "٣/٤",
         {"kind": "number-line", "den": 4, "maxWhole": 1}),
        ("numline", "انقر موضع ٧/٦ على الخطّ (أكبر من ١).", "٧/٦",
         {"kind": "number-line", "den": 6, "maxWhole": 2}),
        # family 3 — المختلط ↔ غير الفعليّ (mixed) — KW «العدد الكسري والكسر المركب»
        ("mixed", "حوّل ٧/٣ إلى عددٍ كسري.", "٢ و١/٣", None),
        ("mixed", "حوّل العدد الكسري ٢ و١/٤ إلى كسرٍ غير فعليّ.", "٩/٤", None),
        ("mixed", "حوّل ١١/٥ إلى عددٍ كسري.", "٢ و١/٥", None),
    ]),
    ("g4FREQ", "تكافؤ الكسور ومقارنتها", "operational", [  # six — ≤12
        # family 1 — توليد المكافئ (equiv) — SA/BH/Oman «٣/٤=؟/١٢» verbatim
        ("equiv", "أكمل التكافؤ: ٣/٤ = ؟/١٢", "٩", None),
        ("equiv", "أكمل التكافؤ: ١/٢ = ٦/؟", "١٢", None),
        ("equiv", "أكمل التكافؤ: ٢/٣ = ؟/١٢", "٨", None),
        # family 2 — المقارنة بقاعدة (rulecmp)
        ("rulecmp", "انقر الكسرَ الأكبر: ٥/٨ أم ٣/٨؟", "٥/٨",
         {"kind": "shape-pick", "options": [{"v": "٥/٨"}, {"v": "٣/٨"}]}),
        ("rulecmp", "انقر الكسرَ الأكبر: ٢/٣ أم ٢/٦؟", "٢/٣",
         {"kind": "shape-pick", "options": [{"v": "٢/٣"}, {"v": "٢/٦"}]}),
        ("rulecmp", "انقر الكسرَ الأكبر: ٧/١٢ أم ٥/١٢؟", "٧/١٢",
         {"kind": "shape-pick", "options": [{"v": "٧/١٢"}, {"v": "٥/١٢"}]}),
        # family 3 — المقارنة بمرجع النصف (benchmark)
        ("benchmark", "أيُّ الكسرين أكبر من النصف: ٥/٨ أم ٣/٨؟", "٥/٨",
         {"kind": "shape-pick", "options": [{"v": "٥/٨"}, {"v": "٣/٨"}]}),
        ("benchmark", "أيُّ الكسرين أصغر من النصف: ٤/١٠ أم ٧/١٠؟", "٤/١٠",
         {"kind": "shape-pick", "options": [{"v": "٤/١٠"}, {"v": "٧/١٠"}]}),
    ]),
    ("g4FRADD", "جمع وطرح الكسور المتشابهة", "operational", [  # SA/BH/KW/QA/AE
        # family 1 — الجمع المتشابه (add) — lowest terms
        ("add", "٣/٨ + ٢/٨ = ؟ (أبسط صورة)", "٥/٨", None),
        ("add", "٢/٦ + ١/٦ = ؟ (أبسط صورة)", "١/٢", None),      # ٣/٦ → ١/٢
        ("add", "٤/١٢ + ٣/١٢ = ؟ (أبسط صورة)", "٧/١٢", None),
        # family 2 — الطرح المتشابه (subtract) — AE ص٥٨١ verbatim
        ("subtract", "٧/٨ − ٢/٨ = ؟ (أبسط صورة)", "٥/٨", None),
        ("subtract", "٥/٦ − ٤/٦ = ؟ (أبسط صورة)", "١/٦", None),
        ("subtract", "٤/٦ − ٢/٦ = ؟ (أبسط صورة)", "١/٣", None),  # ٢/٦ → ١/٣
        # family 3 — المختلطة/عدد كلّي (mixedwhole) — KW «جمع كسر مع عدد كلّي»
        ("mixedwhole", "٢ + ٣/٥ = ؟", "٢ و٣/٥", None),
        ("mixedwhole", "١ + ٣/٤ = ؟", "١ و٣/٤", None),
    ]),
    ("g4FRADDX", "جمع وطرح الكسور المختلفة المقامات", "operational", [  # KW only
        # family 1 — الجمع المختلف (add) — find a common denominator
        ("add", "١/٢ + ١/٣ = ؟ (أبسط صورة)", "٥/٦", None),
        ("add", "١/٤ + ١/٢ = ؟ (أبسط صورة)", "٣/٤", None),
        ("add", "١/٣ + ١/٦ = ؟ (أبسط صورة)", "١/٢", None),      # ٣/٦ → ١/٢
        ("add", "١/٤ + ١/٦ = ؟ (أبسط صورة)", "٥/١٢", None),
        # family 2 — الطرح المختلف (subtract)
        ("subtract", "٣/٤ − ١/٢ = ؟ (أبسط صورة)", "١/٤", None),
        ("subtract", "١/٢ − ١/٣ = ؟ (أبسط صورة)", "١/٦", None),
        ("subtract", "٢/٣ − ١/٦ = ؟ (أبسط صورة)", "١/٢", None),  # ٣/٦ → ١/٢
        ("subtract", "٣/٤ − ١/٣ = ؟ (أبسط صورة)", "٥/١٢", None),
    ]),
    ("g4FRMUL", "ضرب الكسور", "operational", [  # QA only — و٩
        # family 1 — الكسر كمضاعف لكسر الوحدة (unitmultiple) — QA «٣/٤=٣×١/٤» verbatim
        ("unitmultiple", "اكتب ٣/٤ في صورة مضاعفٍ لكسر الوحدة (؟ × 1/٤).", "٣", None),
        ("unitmultiple", "اكتب ٣/٨ في صورة مضاعفٍ لكسر الوحدة (؟ × 1/٨).", "٣", None),
        ("unitmultiple", "اكتب ٥/٦ في صورة مضاعفٍ لكسر الوحدة (؟ × 1/٦).", "٥", None),
        ("unitmultiple", "اكتب ٢/١٢ في صورة مضاعفٍ لكسر الوحدة (؟ × 1/١٢).", "٢", None),
        # family 2 — ضرب كسر × عدد كلّي (times) — k × a/n = ka/n, lowest terms
        ("times", "٣ × ٢/٥ = ؟ (أبسط صورة)", "٦/٥", None),
        ("times", "٢ × ٣/٤ = ؟ (أبسط صورة)", "٣/٢", None),       # ٦/٤ → ٣/٢
        ("times", "٤ × ١/٨ = ؟ (أبسط صورة)", "١/٢", None),       # ٤/٨ → ١/٢
        ("times", "٢ × ٢/٥ = ؟ (أبسط صورة)", "٤/٥", None),
    ]),
]

# DAG from the actual country order: represent → equivalence → add → {unlike, multiply}
G4_FRACTION_EDGES = [
    ("g4FRAC", "g4FREQ"),
    ("g4FREQ", "g4FRADD"),
    ("g4FRADD", "g4FRADDX"),
    ("g4FRADD", "g4FRMUL"),
]

NODE_COUNTRIES.update({
    "g4FRAC": ("SA", "BH", "KW", "QA", "AE", "OM"),   # represent — six, ≤12
    "g4FREQ": ("SA", "BH", "KW", "QA", "AE", "OM"),   # equivalence — six (Oman's wall)
    "g4FRADD": ("SA", "BH", "KW", "QA", "AE"),        # add/sub LIKE — five (no Oman)
    "g4FRADDX": ("KW",),                              # add/sub UNLIKE — Kuwait alone
    "g4FRMUL": ("QA",),                               # × fractions — Qatar alone
})
# =================== end GRADE 4 batch 4 ===================


# =================== GRADE 4 batch 5 — الكسور العشرية ===================
# Born live (gencontent_g4b5.py). Body checks 2026-06-15 — decimals widen from a
# SINGLE Bahrain G3 node (g3DEC) to SIX in G4, plus a new add/sub act:
#   • g4DEC (grid / compare / convert) — ALL SIX: tenths+hundredths, represent +
#     order + link-to-common-fraction (incl. ٠٫٥=١/٢). The money lessons (QA ١١-٤,
#     SA ف٤ الريال) are an APPLICATION → unified currency debt, not a family.
#   • g4DECLINE (place / read) — SA + QA ONLY. «تمثيل العشرية على خط الأعداد» is an
#     explicit country-scoped act → its OWN node (a family is node-wide; node-level is
#     the only country scope). Two families = produce↔recognise (like Fr1), satisfying
#     the ≥2-family gate. Reuses the number-line widget (decimal-label extension).
#   • g4DECADD (round / add / subtract) — SA + AE + BH. SA ف١٢ standalone; AE و١١ from
#     ف٢ ص٦٨٨ «٤٫٣١+١٩٫٦»; BH ف١٢ by EDITION PARITY (BH = AE-t2 = Obeikan/McGraw-Hill
#     2008/2009 → same decimal-add chapter). QA/KW/OM OUT (understand/represent only).
# DAG from the actual order (fractions → decimals → decimal add, in every owner):
#   g4FRAC → g4DEC → {g4DECLINE, g4DECADD}.
# =================================================================================

G4_DECIMAL_NODES = [
    ("g4DEC", "الكسور العشرية: التمثيل والمقارنة والربط بالاعتيادي", "operational", [  # six
        # family 1 — التمثيل على الشبكة العشرية (grid) — the proven g3DEC decimal grid
        ("grid", "اقرأ الشبكة واختر الصورة العشرية.", "٠٫٧",
         {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 1, "shaded": 7,
          "options": ["٠٫٧", "٠٫٣", "٠٫٠٧"]}),
        ("grid", "شبكة المئة: اختر الصورة العشرية للجزء الملوّن.", "٠٫٤٥",
         {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 10, "shaded": 45,
          "options": ["٠٫٤٥", "٠٫٥٤", "٠٫٤"]}),
        ("grid", "شبكة المئة: اختر الصورة العشرية للجزء الملوّن.", "٠٫٠٨",
         {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 10, "shaded": 8,
          "options": ["٠٫٠٨", "٠٫٨", "٠٫٨٠"]}),
        # family 2 — المقارنة والترتيب (compare) — the tenths↔hundredths place trap
        ("compare", "انقر العدد العشري الأكبر: ٠٫٧ أم ٠٫٤٥؟", "٠٫٧",
         {"kind": "shape-pick", "options": [{"v": "٠٫٧"}, {"v": "٠٫٤٥"}]}),
        ("compare", "انقر العدد العشري الأكبر: ٠٫٣ أم ٠٫٥؟", "٠٫٥",
         {"kind": "shape-pick", "options": [{"v": "٠٫٥"}, {"v": "٠٫٣"}]}),
        # family 3 — الربط بالكسر الاعتيادي/التكافؤ (convert) — incl. ٠٫٥ = ١/٢
        ("convert", "اكتب ٧/١٠ بالصورة العشرية.", "٠٫٧",
         {"kind": "shape-pick", "options": [{"v": "٠٫٧"}, {"v": "٠٫٣"}]}),
        ("convert", "اكتب ٠٫٢٥ كسراً اعتيادياً (من مئة).", "٢٥/١٠٠",
         {"kind": "shape-pick", "options": [{"v": "٢٥/١٠٠"}, {"v": "٢٥/١٠"}]}),
        ("convert", "ما العدد العشري المساوي لـ ١/٢؟", "٠٫٥",
         {"kind": "shape-pick", "options": [{"v": "٠٫٥"}, {"v": "٠٫٢٥"}]}),
    ]),
    ("g4DECLINE", "تمثيل الكسور العشرية على خط الأعداد", "operational", [  # SA/QA only
        # family 1 — الموضعة (place — produce: locate a given decimal)
        ("place", "انقر موضع ٠٫٧ على الخطّ.", "٠٫٧",
         {"kind": "number-line", "den": 10, "maxWhole": 1, "dec": True}),
        ("place", "انقر موضع ٠٫٣ على الخطّ.", "٠٫٣",
         {"kind": "number-line", "den": 10, "maxWhole": 1, "dec": True}),
        ("place", "انقر موضع ١٫٥ على الخطّ (أكبر من ١).", "١٫٥",
         {"kind": "number-line", "den": 10, "maxWhole": 2, "dec": True}),
        ("place", "انقر موضع ١٫٢ على الخطّ (أكبر من ١).", "١٫٢",
         {"kind": "number-line", "den": 10, "maxWhole": 2, "dec": True}),
        # family 2 — القراءة (read — recognise: name the marked position)
        ("read", "ما العدد العشري عند العلامة ◆ على الخطّ؟", "٠٫٦",
         {"kind": "number-line", "den": 10, "maxWhole": 1, "dec": True,
          "mark": 6, "options": ["٠٫٦", "٠٫٧"]}),
        ("read", "ما العدد العشري عند العلامة ◆ على الخطّ؟", "٠٫٤",
         {"kind": "number-line", "den": 10, "maxWhole": 1, "dec": True,
          "mark": 4, "options": ["٠٫٤", "٠٫٣"]}),
        ("read", "ما العدد العشري عند العلامة ◆ على الخطّ؟", "١٫٣",
         {"kind": "number-line", "den": 10, "maxWhole": 2, "dec": True,
          "mark": 13, "options": ["١٫٣", "١٫٤"]}),
        ("read", "ما العدد العشري عند العلامة ◆ على الخطّ؟", "١٫٧",
         {"kind": "number-line", "den": 10, "maxWhole": 2, "dec": True,
          "mark": 17, "options": ["١٫٧", "١٫٦"]}),
    ]),
    ("g4DECADD", "جمع الكسور العشرية وطرحها", "operational", [  # SA/AE/BH
        # family 1 — تقريب العشرية (round) — SA ف١٢ lead-in
        ("round", "قرّب ٣٫٤٧ إلى أقرب عددٍ صحيح.", "٣", None),
        ("round", "قرّب ٧٫٨٢ إلى أقرب جزءٍ من عشرة.", "٧٫٨", None),
        # family 2 — الجمع بمحاذاة الفاصلة (add) — AE ص٦٨٨ verbatim
        ("add", "٤٫٣١ + ١٩٫٦ = ؟", "٢٣٫٩١", None),
        ("add", "٢٫٥ + ٣٫٧٥ = ؟", "٦٫٢٥", None),
        ("add", "١٢٫٤ + ٧٫٣٥ = ؟", "١٩٫٧٥", None),
        # family 3 — الطرح بمحاذاة الفاصلة (subtract)
        ("subtract", "٨٫٥ − ٣٫٢٥ = ؟", "٥٫٢٥", None),
        ("subtract", "٩٫٦ − ٤٫٨٧ = ؟", "٤٫٧٣", None),
        ("subtract", "٢٠٫٥ − ٧٫٢٥ = ؟", "١٣٫٢٥", None),
    ]),
]

# DAG from the actual country order: represent → {number-line, add/subtract}
G4_DECIMAL_EDGES = [
    ("g4FRAC", "g4DEC"),
    ("g4DEC", "g4DECLINE"),
    ("g4DEC", "g4DECADD"),
]

NODE_COUNTRIES.update({
    "g4DEC": ("SA", "BH", "KW", "QA", "AE", "OM"),    # decimals — SIX (was Bahrain-only in G3)
    "g4DECLINE": ("SA", "QA"),                        # decimal number line — SA + QA only
    "g4DECADD": ("SA", "AE", "BH"),                   # add/sub decimals — SA + AE + BH (edition parity)
})
# =================== end GRADE 4 batch 5 ===================


# =================== GRADE 4 batch 6 — القياس ===================
# Born live (gencontent_g4b6.py). Body checks 2026-06-15:
#   • g4METRIC (convert/choose/measure) — FIVE (SA/QA/KW/AE/BH). CONVERSION is the G4
#     advance (unifies G3's g3LEN+g3CAPMASS). **Oman OUT**: its G4 metric is «قياس»
#     (measure-only) and it already converted mass/capacity in G3 (g3CAPMASS) → no
#     distinct G4 act; convert must not leak to a non-owner (node-level rule, cf. g4DECLINE).
#   • g4PERIM (compute/inverse) — SIX. Oman ENTERS perimeter in G4 (out in G3 by absence).
#   • g4AREA (multiply/composite) — SIX. ROOT, NOT g4MUL1-dependent (unlike g3AREA3←g3MUL):
#     Oman owns G4 area but has NO G4 multiplication node, so the cross-domain edge would
#     break Oman's path — area uses assumed mult-facts. Ladder g1AREA→Q4→g3AREA3→g4AREA.
#   • g4TIME (read/elapsed) — OM + SA (body-confirmed). TIME-BH/KW/AE RESERVED (no citation).
#   • g4VOL (estimate/prism) — SA + AE. V=l×w×h. NEW act (no G3 analog). Depends g4AREA.
# DAG: g4AREA → g4VOL only; METRIC/PERIM/AREA/TIME are roots. ZERO new widgets
# (measure + clock reused from G3; perimeter/area/volume/time-elapsed are text).
# =================================================================================

G4_MEASURE_NODES = [
    ("g4METRIC", "الوحدات المترية وتحويلاتها", "operational", [  # five (no Oman)
        # family 1 — التحويل بين الوحدات (convert) — the G4 advance
        ("convert", "حوّل: ٣ أمتار = ؟ سنتيمتراً", "٣٠٠", None),
        ("convert", "حوّل: ٢ كيلوغرامات = ؟ غراماً", "٢٠٠٠", None),
        ("convert", "حوّل: ٥٠٠٠ مللترات = ؟ لتراً", "٥", None),
        # family 2 — اختيار الوحدة الملائمة (choose)
        ("choose", "أيُّ وحدةٍ أنسب لقياس طول الملعب؟", "متر",
         {"kind": "shape-pick", "options": [{"v": "متر"}, {"v": "سنتيمتر"}]}),
        ("choose", "أيُّ وحدةٍ أنسب لقياس كتلة التفاحة؟", "غرام",
         {"kind": "shape-pick", "options": [{"v": "غرام"}, {"v": "كيلوغرام"}]}),
        ("choose", "أيُّ وحدةٍ أنسب لقياس المسافة بين مدينتين؟", "كيلومتر",
         {"kind": "shape-pick", "options": [{"v": "كيلومتر"}, {"v": "متر"}]}),
        # family 3 — القياس بالأداة (measure) — reuses the G3 ruler widget
        ("measure", "كم سنتيمتراً طول هذا الجسم؟ اقرأ المسطرة.", "٧",
         {"kind": "measure", "mode": "ruler", "length": 7, "max": 9, "unit": "سم"}),
        ("measure", "كم سنتيمتراً طول هذا الجسم؟ اقرأ المسطرة.", "٤",
         {"kind": "measure", "mode": "ruler", "length": 4, "max": 6, "unit": "سم"}),
    ]),
    ("g4PERIM", "المحيط: حساباً وضلعاً مجهولاً", "operational", [  # six
        # family 1 — حساب المحيط (compute)
        ("compute", "مستطيل طوله ٦ وعرضه ٤ — ما محيطه؟", "٢٠", None),
        ("compute", "مربّع طول ضلعه ٥ — ما محيطه؟", "٢٠", None),
        ("compute", "مستطيل طوله ١٠ وعرضه ٣ — ما محيطه؟", "٢٦", None),
        ("compute", "مربّع طول ضلعه ٨ — ما محيطه؟", "٣٢", None),
        # family 2 — الضلع المجهول (inverse) — the new G4 act
        ("inverse", "مستطيل محيطه ٢٠ وطوله ٦ — ما عرضه؟", "٤", None),
        ("inverse", "مستطيل محيطه ٢٦ وطوله ١٠ — ما عرضه؟", "٣", None),
        ("inverse", "مستطيل محيطه ١٨ وطوله ٥ — ما عرضه؟", "٤", None),
        ("inverse", "مستطيل محيطه ٣٠ وطوله ٩ — ما عرضه؟", "٦", None),
    ]),
    ("g4AREA", "المساحة بالضرب والمركّبة", "operational", [  # six — ROOT
        # family 1 — المساحة = ضرب (multiply)
        ("multiply", "مستطيل طوله ٦ وعرضه ٤ — ما مساحته؟", "٢٤", None),
        ("multiply", "مربّع طول ضلعه ٥ — ما مساحته؟", "٢٥", None),
        ("multiply", "مستطيل طوله ٧ وعرضه ٣ — ما مساحته؟", "٢١", None),
        ("multiply", "مربّع طول ضلعه ٩ — ما مساحته؟", "٨١", None),
        # family 2 — المركّبة (composite)
        ("composite", "شكلٌ مركّب من مستطيلين: الأول ٤×٣ والثاني ٢×٥ — ما المساحة الكلّية؟", "٢٢", None),
        ("composite", "شكلٌ مركّب من مستطيلين: الأول ٦×٢ والثاني ٣×٣ — ما المساحة الكلّية؟", "٢١", None),
        ("composite", "شكلٌ مركّب من مستطيلين: الأول ٥×٤ والثاني ٢×٢ — ما المساحة الكلّية؟", "٢٤", None),
        ("composite", "شكلٌ مركّب من مستطيلين: الأول ٧×٢ والثاني ٤×٣ — ما المساحة الكلّية؟", "٢٦", None),
    ]),
    ("g4TIME", "الوقت لأقرب دقيقة والزمن المنقضي", "operational", [  # OM + SA
        # family 1 — القراءة لأقرب دقيقة (read) — reuses the G3 clock widget
        ("read", "كم الساعة؟ اقرأ القرص واختر الوقت الرقمي.", "٣:١٥",
         {"kind": "clock", "hour": 3, "minute": 15, "options": ["٣:١٥", "٣:٤٥", "٤:١٥"]}),
        ("read", "كم الساعة؟ اقرأ القرص واختر الوقت الرقمي.", "٧:٤٠",
         {"kind": "clock", "hour": 7, "minute": 40, "options": ["٧:٤٠", "٧:٢٠", "٨:٤٠"]}),
        ("read", "كم الساعة؟ اقرأ القرص واختر الوقت الرقمي.", "١٠:٠٥",
         {"kind": "clock", "hour": 10, "minute": 5, "options": ["١٠:٠٥", "١٠:٥٥", "١١:٠٥"]}),
        ("read", "كم الساعة؟ اقرأ القرص واختر الوقت الرقمي.", "٥:٥٠",
         {"kind": "clock", "hour": 5, "minute": 50, "options": ["٥:٥٠", "٥:١٠", "٦:٥٠"]}),
        # family 2 — الزمن المنقضي (elapsed)
        ("elapsed", "بدأ النشاط الساعة ٢:١٠ وانتهى ٢:٤٥ — كم دقيقةً استغرق؟", "٣٥", None),
        ("elapsed", "بدأ النشاط الساعة ٤:٠٥ وانتهى ٤:٥٠ — كم دقيقةً استغرق؟", "٤٥", None),
        ("elapsed", "خرجت الحافلة الساعة ٣:٥٠ ووصلت ٤:٢٠ — كم دقيقةً استغرقت الرحلة؟", "٣٠", None),
        ("elapsed", "خرجت الحافلة الساعة ٨:٤٥ ووصلت ٩:١٥ — كم دقيقةً استغرقت الرحلة؟", "٣٠", None),
    ]),
    ("g4VOL", "الحجم: تقديراً وحجمَ المنشور", "operational", [  # SA + AE — NEW
        # family 1 — تقدير الحجم بعدّ مكعّبات الوحدة (estimate)
        ("estimate", "صندوقٌ مملوءٌ بمكعّبات الوحدة: ٤ في الطول و٣ في العرض و٢ طبقات — كم مكعّباً يملؤه؟", "٢٤", None),
        ("estimate", "صندوقٌ مملوءٌ بمكعّبات الوحدة: ٥ في الطول و٢ في العرض و٣ طبقات — كم مكعّباً يملؤه؟", "٣٠", None),
        ("estimate", "صندوقٌ مملوءٌ بمكعّبات الوحدة: ٦ في الطول و٢ في العرض و٢ طبقات — كم مكعّباً يملؤه؟", "٢٤", None),
        ("estimate", "صندوقٌ مملوءٌ بمكعّبات الوحدة: ٣ في الطول و٣ في العرض و٢ طبقات — كم مكعّباً يملؤه؟", "١٨", None),
        # family 2 — حجم المنشور V=ط×ع×ر (prism)
        ("prism", "متوازي مستطيلاتٍ أبعاده ٥ و٣ و٢ — ما حجمه؟ (الطول×العرض×الارتفاع)", "٣٠", None),
        ("prism", "متوازي مستطيلاتٍ أبعاده ٤ و٤ و٣ — ما حجمه؟ (الطول×العرض×الارتفاع)", "٤٨", None),
        ("prism", "متوازي مستطيلاتٍ أبعاده ٦ و٢ و٥ — ما حجمه؟ (الطول×العرض×الارتفاع)", "٦٠", None),
        ("prism", "متوازي مستطيلاتٍ أبعاده ٧ و٣ و٢ — ما حجمه؟ (الطول×العرض×الارتفاع)", "٤٢", None),
    ]),
]

# DAG: volume extends area to 3-D — the ONLY edge; the rest are roots
G4_MEASURE_EDGES = [
    ("g4AREA", "g4VOL"),
]

NODE_COUNTRIES.update({
    "g4METRIC": ("SA", "QA", "KW", "AE", "BH"),       # metric conversion — FIVE (Oman's is G3-level)
    "g4PERIM": ("SA", "BH", "KW", "QA", "AE", "OM"),  # perimeter — SIX (Oman enters in G4)
    "g4AREA": ("SA", "BH", "KW", "QA", "AE", "OM"),   # area — SIX (Oman enters in G4); root
    "g4TIME": ("OM", "SA"),                           # time/elapsed — OM + SA (BH/KW/AE reserved)
    "g4VOL": ("SA", "AE"),                            # volume — SA + AE (new act)
})
# =================== end GRADE 4 batch 6 ===================


# =================== GRADE 4 batch 7 — الهندسة ===================
# Born live (gencontent_g4b7.py). Body checks 2026-06-15. ONE new widget (protractor,
# g4ANGLE — QA+SA only); the rest reuse G3/G1 widgets.
#   • g4LINES (lines/angletype) — SA/QA/AE/KW/BH. Parallel/perpendicular + acute/right/
#     obtuse CLASSIFICATION. Oman OUT (no lines/angles).
#   • g4ANGLE (measure/draw) — QA+SA. Protractor measurement is a DISTINCT act from
#     classification; its NEW widget is built for owners alone (cf. g4DECLINE). ANGLE-KW/AE
#     reserved. NEW (no G3 analog). Depends g4LINES (classify before measure).
#   • g4SHAPES (classify/describe) — SIX. Triangles/quadrilaterals. Pair ↔ g3GEO.
#   • g4SYMM (line/rotational) — SA/OM/AE. Rotational is new (SA). SYMM-BH/KW reserved. ↔ g3SYMM.
#   • g4COORD (plot/read) — SA. Coordinate plane (coord-grid, ≤10). COORD-BH reserved. ↔ g3COORD
#     (Bahrain-single → Saudi; no documented cross-country symmetry).
#   • g4LOC (position/between) — OM. Relative position is a DISTINCT act from the coordinate
#     plane (relative ≠ ordered pairs) → its OWN node (cf. g4DECLINE/g4METRIC). Reuses the G1
#     position-scene widget. Pair ↔ G1 position.
# DAG: g4LINES → g4ANGLE only; SHAPES/SYMM/COORD/LOC are roots.
# =================================================================================

G4_GEOM_NODES = [
    ("g4LINES", "المستقيمات والزوايا: تمييزاً", "operational", [  # SA/QA/AE/KW/BH
        # family 1 — أنواع الخطوط (lines)
        ("lines", "خطّان لا يتقاطعان مهما امتدّا — ماذا يُسمّيان؟", "متوازيان",
         {"kind": "shape-pick", "options": [{"v": "متوازيان"}, {"v": "متعامدان"}]}),
        ("lines", "خطّان يتقاطعان مكوّنين زاويةً قائمة — ماذا يُسمّيان؟", "متعامدان",
         {"kind": "shape-pick", "options": [{"v": "متعامدان"}, {"v": "متوازيان"}]}),
        ("lines", "خطّان يلتقيان في نقطةٍ بزاويةٍ غيرِ قائمة — ماذا يُسمّيان؟", "متقاطعان",
         {"kind": "shape-pick", "options": [{"v": "متقاطعان"}, {"v": "متوازيان"}]}),
        ("lines", "خطّان في مستوًى واحدٍ على بُعدٍ ثابتٍ بينهما — ماذا يُسمّيان؟", "متوازيان",
         {"kind": "shape-pick", "options": [{"v": "متوازيان"}, {"v": "متقاطعان"}]}),
        # family 2 — تصنيف الزوايا (angletype)
        ("angletype", "زاويةٌ أصغرُ من الزاوية القائمة — ما نوعها؟", "حادّة",
         {"kind": "shape-pick", "options": [{"v": "حادّة"}, {"v": "منفرجة"}]}),
        ("angletype", "زاويةٌ أكبرُ من القائمة وأصغرُ من المستقيمة — ما نوعها؟", "منفرجة",
         {"kind": "shape-pick", "options": [{"v": "منفرجة"}, {"v": "حادّة"}]}),
        ("angletype", "زاويةٌ قياسها ٩٠° — ما نوعها؟", "قائمة",
         {"kind": "shape-pick", "options": [{"v": "قائمة"}, {"v": "حادّة"}]}),
        ("angletype", "زاويةٌ قياسها ١٨٠° (خطٌّ مستقيم) — ما نوعها؟", "مستقيمة",
         {"kind": "shape-pick", "options": [{"v": "مستقيمة"}, {"v": "منفرجة"}]}),
    ]),
    ("g4ANGLE", "قياس ورسم الزوايا بالمنقلة", "operational", [  # QA + SA — NEW protractor
        # family 1 — القراءة بالمنقلة (measure)
        ("measure", "اقرأ قياس الزاوية بالمنقلة.", "٦٠°",
         {"kind": "protractor", "mode": "measure", "angle": 60, "options": ["٦٠°", "١٢٠°"]}),
        ("measure", "اقرأ قياس الزاوية بالمنقلة.", "٣٠°",
         {"kind": "protractor", "mode": "measure", "angle": 30, "options": ["٣٠°", "١٥٠°"]}),
        ("measure", "اقرأ قياس الزاوية بالمنقلة.", "١٢٠°",
         {"kind": "protractor", "mode": "measure", "angle": 120, "options": ["١٢٠°", "٦٠°"]}),
        ("measure", "اقرأ قياس الزاوية بالمنقلة.", "١٥٠°",
         {"kind": "protractor", "mode": "measure", "angle": 150, "options": ["١٥٠°", "٣٠°"]}),
        # family 2 — الرسم بالمنقلة (draw)
        ("draw", "اصنع زاويةً قياسها ٤٠° على المنقلة.", "٤٠°",
         {"kind": "protractor", "mode": "draw", "target": 40}),
        ("draw", "اصنع زاويةً قياسها ٧٠° على المنقلة.", "٧٠°",
         {"kind": "protractor", "mode": "draw", "target": 70}),
        ("draw", "اصنع زاويةً قياسها ١١٠° على المنقلة.", "١١٠°",
         {"kind": "protractor", "mode": "draw", "target": 110}),
        ("draw", "اصنع زاويةً قياسها ١٣٠° على المنقلة.", "١٣٠°",
         {"kind": "protractor", "mode": "draw", "target": 130}),
    ]),
    ("g4SHAPES", "تصنيف الأشكال وخصائصها", "operational", [  # six
        # family 1 — التصنيف (classify) — triangles & quadrilaterals
        ("classify", "مثلثٌ أضلاعه الثلاثة متساوية — ما نوعه؟", "متساوي الأضلاع",
         {"kind": "shape-pick", "options": [{"v": "متساوي الأضلاع"}, {"v": "متساوي الساقين"}]}),
        ("classify", "مثلثٌ فيه زاويةٌ قائمة — ما نوعه؟", "قائم الزاوية",
         {"kind": "shape-pick", "options": [{"v": "قائم الزاوية"}, {"v": "حادّ الزوايا"}]}),
        ("classify", "رباعيٌّ أضلاعه الأربعة متساوية وزواياه قائمة — ما اسمه؟", "مربّع",
         {"kind": "shape-pick", "options": [{"v": "مربّع"}, {"v": "مستطيل"}]}),
        ("classify", "رباعيٌّ أضلاعه الأربعة متساوية وزواياه غيرُ قائمة — ما اسمه؟", "معيّن",
         {"kind": "shape-pick", "options": [{"v": "معيّن"}, {"v": "مربّع"}]}),
        # family 2 — الخصائص (describe) — element-count reused
        ("describe", "كم ضلعاً للمستطيل؟", "٤",
         {"kind": "element-count", "shape": "rectangle", "element": "sides", "n": 4}),
        ("describe", "كم رأساً للمثلث؟", "٣",
         {"kind": "element-count", "shape": "triangle", "element": "vertices", "n": 3}),
        ("describe", "كم ضلعاً للمخمّس؟", "٥",
         {"kind": "element-count", "shape": "pentagon", "element": "sides", "n": 5}),
        ("describe", "كم ضلعاً للمسدّس؟", "٦",
         {"kind": "element-count", "shape": "hexagon", "element": "sides", "n": 6}),
    ]),
    ("g4SYMM", "التماثل الخطّي والدوراني", "operational", [  # SA/OM/AE
        # family 1 — التماثل الخطّي (line)
        ("line", "هل لهذا الشكل خطُّ تماثل؟", "نعم",
         {"kind": "shape-pick", "show": "square", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("line", "هل لهذا الشكل خطُّ تماثل؟", "لا",
         {"kind": "shape-pick", "show": "triangle-scalene", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("line", "هل لهذا الشكل خطُّ تماثل؟", "نعم",
         {"kind": "shape-pick", "show": "circle", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("line", "هل لهذا الشكل خطُّ تماثل؟", "لا",
         {"kind": "shape-pick", "show": "l-shape", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        # family 2 — التماثل الدوراني (rotational) — NEW
        ("rotational", "هل يبقى الشكل مطابقاً لأصله بعد دورانٍ أقلَّ من دورةٍ كاملة؟ (تماثل دوراني)", "نعم",
         {"kind": "shape-pick", "show": "square", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("rotational", "هل يبقى الشكل مطابقاً لأصله بعد دورانٍ أقلَّ من دورةٍ كاملة؟ (تماثل دوراني)", "لا",
         {"kind": "shape-pick", "show": "l-shape", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("rotational", "هل يبقى الشكل مطابقاً لأصله بعد دورانٍ أقلَّ من دورةٍ كاملة؟ (تماثل دوراني)", "نعم",
         {"kind": "shape-pick", "show": "rectangle", "options": [{"v": "نعم"}, {"v": "لا"}]}),
        ("rotational", "هل يبقى الشكل مطابقاً لأصله بعد دورانٍ أقلَّ من دورةٍ كاملة؟ (تماثل دوراني)", "لا",
         {"kind": "shape-pick", "show": "triangle-scalene", "options": [{"v": "نعم"}, {"v": "لا"}]}),
    ]),
    ("g4COORD", "المستوى الإحداثي والزوج المرتّب", "operational", [  # SA
        # family 1 — التمثيل (plot)
        ("plot", "ضع نقطةً عند الزوج المرتّب (٣، ٢).", "(٣، ٢)",
         {"kind": "coord-grid", "mode": "plot", "max": 8, "target": [3, 2]}),
        ("plot", "ضع نقطةً عند الزوج المرتّب (٥، ٤).", "(٥، ٤)",
         {"kind": "coord-grid", "mode": "plot", "max": 8, "target": [5, 4]}),
        ("plot", "ضع نقطةً عند الزوج المرتّب (١، ٦).", "(١، ٦)",
         {"kind": "coord-grid", "mode": "plot", "max": 10, "target": [1, 6]}),
        ("plot", "ضع نقطةً عند الزوج المرتّب (٧، ٠).", "(٧، ٠)",
         {"kind": "coord-grid", "mode": "plot", "max": 10, "target": [7, 0]}),
        # family 2 — القراءة (read)
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٢، ٥)",
         {"kind": "coord-grid", "mode": "read", "max": 8, "point": [2, 5], "options": ["(٢، ٥)", "(٥، ٢)"]}),
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٦، ٣)",
         {"kind": "coord-grid", "mode": "read", "max": 8, "point": [6, 3], "options": ["(٦، ٣)", "(٣، ٦)"]}),
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٠، ٤)",
         {"kind": "coord-grid", "mode": "read", "max": 10, "point": [0, 4], "options": ["(٠، ٤)", "(٤، ٠)"]}),
        ("read", "ما إحداثيا النقطة المعلَّمة؟", "(٣، ٣)",
         {"kind": "coord-grid", "mode": "read", "max": 10, "point": [3, 3], "options": ["(٣، ٣)", "(٣، ٤)"]}),
    ]),
    ("g4LOC", "الموقع والاتجاه النسبي", "operational", [  # OM — position-scene reused
        # family 1 — الموقع النسبي (position)
        ("position", "انقر العنصر الذي يقع فوق الصندوق.", "فوق",
         {"kind": "position-scene", "mode": "grid", "anchor": "📦", "objects": [
             {"e": "🐈", "v": "فوق", "pos": "above"}, {"e": "🦜", "v": "تحت", "pos": "below"},
             {"e": "🎈", "v": "يمين", "pos": "right"}, {"e": "⚽", "v": "يسار", "pos": "left"}]}),
        ("position", "انقر العنصر الذي يقع تحت الصندوق.", "تحت",
         {"kind": "position-scene", "mode": "grid", "anchor": "📦", "objects": [
             {"e": "🌟", "v": "فوق", "pos": "above"}, {"e": "🍎", "v": "تحت", "pos": "below"},
             {"e": "🐈", "v": "يمين", "pos": "right"}, {"e": "🦜", "v": "يسار", "pos": "left"}]}),
        ("position", "انقر العنصر الذي يقع يمين الصندوق.", "يمين",
         {"kind": "position-scene", "mode": "grid", "anchor": "📦", "objects": [
             {"e": "🎈", "v": "فوق", "pos": "above"}, {"e": "⚽", "v": "تحت", "pos": "below"},
             {"e": "🌟", "v": "يمين", "pos": "right"}, {"e": "🍎", "v": "يسار", "pos": "left"}]}),
        ("position", "انقر العنصر الذي يقع يسار الصندوق.", "يسار",
         {"kind": "position-scene", "mode": "grid", "anchor": "📦", "objects": [
             {"e": "🐈", "v": "فوق", "pos": "above"}, {"e": "🎈", "v": "تحت", "pos": "below"},
             {"e": "🦜", "v": "يمين", "pos": "right"}, {"e": "⚽", "v": "يسار", "pos": "left"}]}),
        # family 2 — بين (between) — position-scene between mode
        ("between", "انقر العنصر الذي يقع بين العَلَمين.", "بين",
         {"kind": "position-scene", "mode": "between", "anchor": "🚩", "anchor2": "🚩",
          "objects": [{"e": "🐈", "v": "بين", "pos": "between"}, {"e": "⚽", "v": "خارج", "pos": "outside"}]}),
        ("between", "انقر العنصر الذي يقع بين العَلَمين.", "بين",
         {"kind": "position-scene", "mode": "between", "anchor": "🚩", "anchor2": "🚩",
          "objects": [{"e": "🦜", "v": "بين", "pos": "between"}, {"e": "🌟", "v": "خارج", "pos": "outside"}]}),
        ("between", "انقر العنصر الذي يقع بين العَلَمين.", "بين",
         {"kind": "position-scene", "mode": "between", "anchor": "🚩", "anchor2": "🚩",
          "objects": [{"e": "🎈", "v": "بين", "pos": "between"}, {"e": "🍎", "v": "خارج", "pos": "outside"}]}),
        ("between", "انقر العنصر الذي يقع بين العَلَمين.", "بين",
         {"kind": "position-scene", "mode": "between", "anchor": "🚩", "anchor2": "🚩",
          "objects": [{"e": "🌟", "v": "بين", "pos": "between"}, {"e": "🐈", "v": "خارج", "pos": "outside"}]}),
    ]),
]

# DAG: classify angles before measuring them (QA و١٤-١ before ١٤-٤); the rest are roots
G4_GEOM_EDGES = [
    ("g4LINES", "g4ANGLE"),
]

NODE_COUNTRIES.update({
    "g4LINES": ("SA", "QA", "AE", "KW", "BH"),        # lines + angle types — five (Oman out)
    "g4ANGLE": ("QA", "SA"),                          # protractor measure/draw — QA + SA (new widget)
    "g4SHAPES": ("SA", "BH", "KW", "QA", "AE", "OM"), # classify shapes — six
    "g4SYMM": ("SA", "OM", "AE"),                     # symmetry incl. rotational — SA/OM/AE
    "g4COORD": ("SA",),                               # coordinate plane — Saudi alone
    "g4LOC": ("OM",),                                 # relative position/direction — Oman alone
})
# =================== end GRADE 4 batch 7 ===================


# =================== GRADE 4 batch 8 — الأنماط والبيانات (FINAL) ===================
# Born live (gencontent_g4b8.py). Body checks 2026-06-15. The closing G4 batch.
#   • g4SEQ (extend/rule/shape) — QA/AE/BH/SA. Sequences + rules. SEQ-KW/OM OUT (patterns
#     embedded in their operations units, not a standalone act).
#   • g4EXPR (sentence/function) — SA/BH. Number sentences + function tables. NEW (algebra;
#     QA/AE own sequences but NOT expressions → separate node, no leak).
#   • g4DATA (read/interpret/create) — SIX. Scale-based bar/pictograph. Pair ↔ g3DATAR/g3DATAB.
#   • g4LINEPLOT (read/interpret) — QA. Line plot (و١٠). NEW representation (chart lineplot type).
#   • g4GRAPH (pie/linegraph) — SA/BH. Pie + line graph. NEW representations (chart pie+line).
#   • g4PROB (certainty/likely) — SA. Probability. Pair ↔ g3PROB (Bahrain-single → Saudi).
# ALL ROOTS — data/patterns are independent strands (G2/G3 had no data edges). ONE widget
# extension (chart pie+line; lineplot already existed); sequence/likelihood reused; g4EXPR text.
# =================================================================================

G4_PATTERN_NODES = [
    ("g4SEQ", "الأنماط والمتتاليات وقواعدها", "operational", [  # QA/AE/BH/SA
        # family 1 — إكمال المتتالية (extend) — sequence widget reused
        ("extend", "أكمل المتتالية: اضبط الحدّ التالي.", "١٥",
         {"kind": "sequence", "terms": [3, 6, 9, 12]}),
        ("extend", "أكمل المتتالية: اضبط الحدّ التالي.", "١٠",
         {"kind": "sequence", "terms": [2, 4, 6, 8]}),
        ("extend", "أكمل المتتالية: اضبط الحدّ التالي.", "٢٥",
         {"kind": "sequence", "terms": [5, 10, 15, 20]}),
        # family 2 — اكتشاف القاعدة (rule)
        ("rule", "ما قاعدة المتتالية: ٣، ٦، ٩، ١٢ ؟", "+٣",
         {"kind": "shape-pick", "options": [{"v": "+٣"}, {"v": "+٤"}]}),
        ("rule", "ما قاعدة المتتالية: ٢، ٤، ٦، ٨ ؟", "+٢",
         {"kind": "shape-pick", "options": [{"v": "+٢"}, {"v": "+٣"}]}),
        ("rule", "ما قاعدة المتتالية: ٥، ١٠، ١٥، ٢٠ ؟", "+٥",
         {"kind": "shape-pick", "options": [{"v": "+٥"}, {"v": "+٦"}]}),
        # family 3 — نمط الأشكال (shape)
        ("shape", "ما الشكل التالي في النمط: 🔺🔵🔺🔵🔺 ؟", "🔵",
         {"kind": "shape-pick", "options": [{"v": "🔵"}, {"v": "🔺"}]}),
        ("shape", "ما الشكل التالي في النمط: 🔺🔵🟩🔺🔵 ؟", "🟩",
         {"kind": "shape-pick", "options": [{"v": "🟩"}, {"v": "🔵"}]}),
    ]),
    ("g4EXPR", "العبارات والجمل العددية وجداول الدوال", "operational", [  # SA/BH — NEW
        # family 1 — الجملة العددية المجهولة (sentence)
        ("sentence", "أكمل الجملة العددية: ٧ + ؟ = ١٢", "٥", None),
        ("sentence", "أكمل الجملة العددية: ؟ − ٤ = ٦", "١٠", None),
        ("sentence", "أكمل الجملة العددية: ٣ × ؟ = ١٢", "٤", None),
        ("sentence", "أكمل الجملة العددية: ٩ + ؟ = ١٥", "٦", None),
        # family 2 — جدول الدالّة (function)
        ("function", "جدول دالّة، القاعدة: «س + ٥». إذا كان الدخل ٤ فما الخرج؟", "٩", None),
        ("function", "جدول دالّة، القاعدة: «س × ٣». إذا كان الدخل ٦ فما الخرج؟", "١٨", None),
        ("function", "جدول دالّة، القاعدة: «س + ٧». إذا كان الدخل ٨ فما الخرج؟", "١٥", None),
        ("function", "جدول دالّة، القاعدة: «س × ٢». إذا كان الدخل ٩ فما الخرج؟", "١٨", None),
    ]),
    ("g4DATA", "تمثيل البيانات وقراءتها بمقياس", "operational", [  # six
        # family 1 — القراءة بمقياس (read)
        ("read", "في مخطّط الصور (كل رمز = ٢): كم عدد الفئة «ب»؟", "٦",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 4], ["ب", 6], ["ج", 8]], "scale": 2, "ask": "count", "cat": "ب"}),
        ("read", "في مخطّط الصور (كل رمز = ٥): كم عدد الفئة «ج»؟", "١٥",
         {"kind": "chart", "mode": "read", "type": "pictograph",
          "data": [["أ", 10], ["ب", 5], ["ج", 15]], "scale": 5, "ask": "count", "cat": "ج"}),
        ("read", "في مخطّط الأعمدة: ما ارتفاع عمود الفئة «أ»؟", "٨",
         {"kind": "chart", "mode": "read", "type": "bar",
          "data": [["أ", 8], ["ب", 4], ["ج", 6]], "ask": "count", "cat": "أ"}),
        # family 2 — التفسير (interpret)
        ("interpret", "في المخطّط: أيُّ فئةٍ هي الأكثر؟", "ب",
         {"kind": "chart", "mode": "read", "type": "bar",
          "data": [["أ", 4], ["ب", 8], ["ج", 6]], "ask": "most"}),
        ("interpret", "في المخطّط: أيُّ فئةٍ هي الأكثر؟", "ج",
         {"kind": "chart", "mode": "read", "type": "bar",
          "data": [["أ", 7], ["ب", 3], ["ج", 9]], "ask": "most"}),
        # family 3 — الإنشاء/اختيار التدريج (create)
        ("create", "كلُّ رمزٍ يمثّل ٢ — كم رمزاً تحتاج لتمثيل القيمة ٨؟", "٤", None),
        ("create", "كلُّ رمزٍ يمثّل ٥ — كم رمزاً تحتاج لتمثيل القيمة ٢٠؟", "٤", None),
        ("create", "كلُّ رمزٍ يمثّل ١٠ — كم رمزاً تحتاج لتمثيل القيمة ٣٠؟", "٣", None),
    ]),
    ("g4LINEPLOT", "الخطّ بالنقاط", "operational", [  # QA — line plot
        # family 1 — القراءة (read)
        ("read", "في الخطّ بالنقاط: كم عدد العلامات فوق القيمة «٢»؟", "٣",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["٢", 3], ["٤", 2], ["٦", 4]], "ask": "count", "cat": "٢"}),
        ("read", "في الخطّ بالنقاط: كم عدد العلامات فوق القيمة «٤»؟", "٢",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["٢", 3], ["٤", 2], ["٦", 4]], "ask": "count", "cat": "٤"}),
        ("read", "في الخطّ بالنقاط: كم عدد العلامات فوق القيمة «١»؟", "٥",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["١", 5], ["٣", 3], ["٥", 2]], "ask": "count", "cat": "١"}),
        ("read", "في الخطّ بالنقاط: كم عدد العلامات فوق القيمة «٧»؟", "٣",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["٢", 4], ["٥", 1], ["٧", 3]], "ask": "count", "cat": "٧"}),
        # family 2 — التفسير (interpret)
        ("interpret", "في الخطّ بالنقاط: أيُّ قيمةٍ لها أكثر العلامات؟", "٤",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["٢", 3], ["٤", 5], ["٦", 2]], "ask": "most"}),
        ("interpret", "في الخطّ بالنقاط: أيُّ قيمةٍ لها أكثر العلامات؟", "٣",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["١", 2], ["٣", 6], ["٥", 4]], "ask": "most"}),
        ("interpret", "في الخطّ بالنقاط: أيُّ قيمةٍ لها أكثر العلامات؟", "٦",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["٢", 4], ["٤", 1], ["٦", 5]], "ask": "most"}),
        ("interpret", "في الخطّ بالنقاط: أيُّ قيمةٍ لها أكثر العلامات؟", "١",
         {"kind": "chart", "mode": "read", "type": "lineplot",
          "data": [["١", 5], ["٣", 2], ["٥", 3]], "ask": "most"}),
    ]),
    ("g4GRAPH", "القطاعات الدائرية والتمثيل بالخطوط", "operational", [  # SA/BH — pie + line
        # family 1 — القطاع الدائري (pie)
        ("pie", "في القطاع الدائري: أيُّ فئةٍ نصيبها الأكبر؟", "ج",
         {"kind": "chart", "mode": "read", "type": "pie",
          "data": [["أ", 2], ["ب", 4], ["ج", 6]], "ask": "most"}),
        ("pie", "في القطاع الدائري: أيُّ فئةٍ نصيبها الأكبر؟", "أ",
         {"kind": "chart", "mode": "read", "type": "pie",
          "data": [["أ", 6], ["ب", 3], ["ج", 1]], "ask": "most"}),
        ("pie", "في القطاع الدائري: أيُّ فئةٍ نصيبها الأكبر؟", "ب",
         {"kind": "chart", "mode": "read", "type": "pie",
          "data": [["أ", 3], ["ب", 6], ["ج", 2]], "ask": "most"}),
        ("pie", "في القطاع الدائري: أيُّ فئةٍ نصيبها الأكبر؟", "ج",
         {"kind": "chart", "mode": "read", "type": "pie",
          "data": [["أ", 4], ["ب", 2], ["ج", 6]], "ask": "most"}),
        # family 2 — التمثيل بالخطوط (linegraph)
        ("linegraph", "في التمثيل بالخطوط: ما قيمة النقطة عند «ب»؟", "٥",
         {"kind": "chart", "mode": "read", "type": "line",
          "data": [["أ", 3], ["ب", 5], ["ج", 2], ["د", 6]], "ask": "count", "cat": "ب"}),
        ("linegraph", "في التمثيل بالخطوط: ما قيمة النقطة عند «د»؟", "٦",
         {"kind": "chart", "mode": "read", "type": "line",
          "data": [["أ", 3], ["ب", 5], ["ج", 2], ["د", 6]], "ask": "count", "cat": "د"}),
        ("linegraph", "في التمثيل بالخطوط: ما قيمة النقطة عند «أ»؟", "٧",
         {"kind": "chart", "mode": "read", "type": "line",
          "data": [["أ", 7], ["ب", 2], ["ج", 4], ["د", 1]], "ask": "count", "cat": "أ"}),
        ("linegraph", "في التمثيل بالخطوط: ما قيمة النقطة عند «ج»؟", "٣",
         {"kind": "chart", "mode": "read", "type": "line",
          "data": [["أ", 2], ["ب", 6], ["ج", 3], ["د", 5]], "ask": "count", "cat": "ج"}),
    ]),
    ("g4PROB", "تحديد الاحتمال", "operational", [  # SA — likelihood reused
        # family 1 — الحتمية (certainty)
        ("certainty", "كيس فيه كرات حمراء فقط. سحب كرة حمراء حدثٌ:", "أكيد",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 5]], "ask": "certainty", "event": "red"}),
        ("certainty", "كيس فيه كرات حمراء فقط. سحب كرة زرقاء حدثٌ:", "مستحيل",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 5]], "ask": "certainty", "event": "blue"}),
        ("certainty", "كيس فيه ٤ حمراء و٤ زرقاء. سحب كرة حمراء حدثٌ:", "ممكن",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 4], ["blue", 4]], "ask": "certainty", "event": "red"}),
        ("certainty", "كيس فيه كرات خضراء فقط. سحب كرة خضراء حدثٌ:", "أكيد",
         {"kind": "likelihood", "scenario": "bag", "balls": [["green", 5]], "ask": "certainty", "event": "green"}),
        # family 2 — الترجيح (likely)
        ("likely", "كيس فيه ٥ حمراء و٢ زرقاء. أيُّ لونٍ أكثر احتمالاً للسحب؟", "أحمر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 5], ["blue", 2]], "ask": "more"}),
        ("likely", "كيس فيه ٣ خضراء و٦ صفراء. أيُّ لونٍ أكثر احتمالاً للسحب؟", "أصفر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["green", 3], ["yellow", 6]], "ask": "more"}),
        ("likely", "كيس فيه ٢ حمراء و٧ زرقاء. أيُّ لونٍ أقلُّ احتمالاً للسحب؟", "أحمر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["red", 2], ["blue", 7]], "ask": "less"}),
        ("likely", "كيس فيه ٦ خضراء و٢ صفراء. أيُّ لونٍ أقلُّ احتمالاً للسحب؟", "أصفر",
         {"kind": "likelihood", "scenario": "bag", "balls": [["green", 6], ["yellow", 2]], "ask": "less"}),
    ]),
]

G4_PATTERN_EDGES = []   # all roots — data & patterns are independent strands (as in G2/G3)

NODE_COUNTRIES.update({
    "g4SEQ": ("QA", "AE", "BH", "SA"),                # sequences — four (KW/OM patterns embedded)
    "g4EXPR": ("SA", "BH"),                           # expressions/function tables — SA/BH (new)
    "g4DATA": ("SA", "BH", "KW", "QA", "AE", "OM"),   # data by scale — six
    "g4LINEPLOT": ("QA",),                            # line plot — Qatar alone (new representation)
    "g4GRAPH": ("SA", "BH"),                          # pie + line graph — SA/BH (new representations)
    "g4PROB": ("SA",),                                # probability — Saudi (g3PROB Bahrain → Saudi)
})
# =================== end GRADE 4 batch 8 ===================


def seed(db: Session) -> None:
    if db.execute(select(Skill).limit(1)).scalars().first() is not None:
        return  # already seeded

    subject = Subject(name="الرياضيات")
    grade = Grade(name="الصف الثاني", order=2)
    grade1 = Grade(name="الصف الأول", order=1)
    grade3 = Grade(name="الصف الثالث", order=3)
    grade4 = Grade(name="الصف الرابع", order=4)
    db.add(subject)
    db.add(grade)
    db.add(grade1)
    db.add(grade3)
    db.add(grade4)
    db.flush()
    code_to_id: dict[str, int] = {}

    def add_unit(unit_name: str, unit_order: int, nodes: list, target_grade=None) -> None:
        u = Unit(subject_id=subject.id, grade_id=(target_grade or grade).id,
                 name=unit_name, order=unit_order)
        db.add(u)
        db.flush()
        for order, (code, name, state, questions) in enumerate(nodes, start=1):
            skill = Skill(unit_id=u.id, code=code, name=name, order=order, state=state)
            db.add(skill)
            db.flush()
            code_to_id[code] = skill.id
            for q in list(questions) + SUPPLEMENT.get(code, []):   # base items + phase-1 fill
                family, prompt, answer = q[0], q[1], q[2]
                visual = q[3] if len(q) > 3 else None
                db.add(Question(
                    skill_id=skill.id, family=family, prompt=prompt,
                    answer=answer, visual=visual, status="published",
                ))

    add_unit("الحساب", 1, NODES)
    add_unit("الهندسة", 2, GEOMETRY_NODES)   # geometry — its own unit, independent strand
    add_unit("الضرب والقسمة", 3, MULDIV_NODES)  # early multiplication/division
    add_unit("البيانات والاحتمال", 4, DATA_NODES)  # data & probability — independent strand
    add_unit("القياس", 5, MEASURE_NODES)     # measurement (length/mass/capacity, time, money)
    add_unit("الأنماط والتهيئة وحل المسائل", 6, LIGHT_NODES)  # patterns/even-odd/readiness/problems
    add_unit("الكسور", 7, FRACTION_NODES)    # S2 batch-2 — fractions (new strand)
    # GRADE 1 — its own unit under its own grade (the grade dimension separates the views)
    add_unit("الحساب", 1, G1_NODES, target_grade=grade1)
    # GRADE 3 — domain units, each added with its batch (ratified: G3 spans more
    # domains, so the mother's report reads «الوحدة س من ص» naturally)
    add_unit("الأعداد", 1, G3_NODES, target_grade=grade3)
    add_unit("الجمع والطرح", 2, G3_ADDSUB_NODES, target_grade=grade3)
    add_unit("الضرب والقسمة", 3, G3_MULDIV_NODES, target_grade=grade3)
    add_unit("الكسور", 4, G3_FRACTION_NODES, target_grade=grade3)
    add_unit("القياس", 5, G3_MEASURE_NODES, target_grade=grade3)
    add_unit("الهندسة والمحيط والمساحة", 6, G3_GEOM_NODES, target_grade=grade3)
    add_unit("البيانات والاحتمال", 7, G3_DATA_NODES, target_grade=grade3)
    # GRADE 4 — batch 1: place value & large numbers, in range tiers (born live)
    add_unit("الأعداد", 1, G4_NODES, target_grade=grade4)
    # GRADE 4 — batch 2: operations (add/sub fluency, properties, estimate, ×1, factors, primes)
    add_unit("العمليات", 2, G4_ADDSUB_NODES, target_grade=grade4)
    # GRADE 4 — batch 3: ×2-digit & long division
    add_unit("الضرب والقسمة", 3, G4_MULDIV_NODES, target_grade=grade4)
    # GRADE 4 — batch 4: fractions (represent, equivalence, operations)
    add_unit("الكسور", 4, G4_FRACTION_NODES, target_grade=grade4)
    # GRADE 4 — batch 5: decimal fractions (represent/compare/convert, number line, add/sub)
    add_unit("الكسور العشرية", 5, G4_DECIMAL_NODES, target_grade=grade4)
    # GRADE 4 — batch 6: measurement (metric conversion, perimeter, area, time, volume)
    add_unit("القياس", 6, G4_MEASURE_NODES, target_grade=grade4)
    # GRADE 4 — batch 7: geometry (lines, angles+protractor, shapes, symmetry, coords, location)
    add_unit("الهندسة", 7, G4_GEOM_NODES, target_grade=grade4)
    # GRADE 4 — batch 8 (FINAL): patterns/algebra + data/probability
    add_unit("الأنماط والبيانات", 8, G4_PATTERN_NODES, target_grade=grade4)

    for prereq_code, dependent_code in (
        EDGES + GEOMETRY_EDGES + MULDIV_EDGES + DATA_EDGES + MEASURE_EDGES + LIGHT_EDGES
        + FRACTION_EDGES + G1_EDGES + G3_EDGES + G3_ADDSUB_EDGES + G3_MULDIV_EDGES
        + G3_FRACTION_EDGES + G3_MEASURE_EDGES + G3_GEOM_EDGES + G3_DATA_NODES_EDGES
        + G4_EDGES + G4_ADDSUB_EDGES + G4_MULDIV_EDGES + G4_FRACTION_EDGES
        + G4_DECIMAL_EDGES + G4_MEASURE_EDGES + G4_GEOM_EDGES + G4_PATTERN_EDGES
    ):
        db.add(SkillPrerequisite(
            skill_id=code_to_id[dependent_code],
            prerequisite_skill_id=code_to_id[prereq_code],
        ))

    # Curriculum-path membership (which country sees which node). Display/scoping only.
    for code, countries in NODE_COUNTRIES.items():
        for country in countries:
            db.add(SkillCountry(skill_id=code_to_id[code], country=country))
    db.commit()
