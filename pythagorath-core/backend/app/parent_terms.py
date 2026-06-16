"""Parent-language descriptions of skills — the read-side translation layer for the
guardian dashboard (and every parent-facing surface). RULE: never show a bare curriculum
term to a parent; show a plain description with the term in parentheses, e.g. "الأرقام بعد
الفاصلة (الأعداد العشرية)". This maps a skill CODE → that friendly phrase. It is PRESENTATION
only — it never touches the skill store.

DEBT (registered): codes not yet covered fall back to the raw curriculum name (a bare
scientific term — which BREAKS the plain-language rule). Every skill reachable in a child's
path MUST be covered before any parent launch. `uncovered()` lists the gaps.
"""

# skill code → plain description (term in parentheses). Hindi numerals where numbers appear.
TERMS: dict[str, str] = {
    # ----- G4: numbers & operations -----
    "g4PVM": "قراءة الأعداد الكبيرة ومنازلها (القيمة المنزلية حتى الملايين)",
    "g4PV4": "قراءة الأعداد ومعرفة منازلها (القيمة المنزلية)",
    "g4CMPM": "مقارنة الأعداد وترتيبها (أيّها أكبر)",
    "g4ROUNDM": "تقريب الأعداد لأقرب رقمٍ سهل (التقريب)",
    "g4ROUND": "تقريب الأعداد لأقرب رقمٍ سهل (التقريب)",
    "g4ROUND100": "تقريب الأعداد لأقرب مئة (التقريب)",
    "g4ADDSUB": "الجمع والطرح بأعدادٍ أكبر",
    "g4ADD4": "جمع وطرح الأعداد حتى الآلاف",
    "g4PROPS": "طرقٌ أسهل للجمع والطرح (خصائص العمليات)",
    "g4EST": "تقدير ناتج الحساب بسرعة (التقدير)",
    "g4MUL1": "الضرب في عددٍ من رقمٍ واحد",
    "g4FACT": "أجزاء العدد ومضاعفاته (العوامل والمضاعفات)",
    "g4PRIME": "الأعداد التي لا تُقسَم إلا على نفسها والواحد (الأعداد الأوّلية)",
    "g4MUL2": "الضرب في عددٍ من رقمين",
    "g4DIV1": "القسمة المطوّلة",
    "g4DIV2": "القسمة مع باقٍ",
    # ----- G4: fractions & decimals -----
    "g4FRAC": "تقسيم الشيء أجزاءً متساوية (الكسور)",
    "g4FREQ": "مقارنة الأجزاء المتساوية (الكسور المتكافئة)",
    "g4FRADD": "جمع وطرح الأجزاء (الكسور)",
    "g4FRADDX": "جمع وطرح أجزاءٍ مختلفة (الكسور)",
    "g4FRMUL": "ضرب الأجزاء (الكسور)",
    "g4DEC": "الأرقام بعد الفاصلة (الأعداد العشرية، مثل ٠٫٥)",
    "g4DECLINE": "موضع الأرقام العشرية على الخطّ",
    "g4DECADD": "جمع وطرح الأرقام بعد الفاصلة (الأعداد العشرية)",
    # ----- G4: measurement -----
    "g4METRIC": "وحدات القياس وتحويلها (المتر والكيلوغرام واللتر)",
    "g4PERIM": "طول الإطار حول الشكل (المحيط)",
    "g4AREA": "المسطّح داخل الشكل (المساحة)",
    "g4TIME": "قراءة الوقت وحسابه",
    "g4VOL": "ما يملأ المجسّم (الحجم)",
    # ----- G4: geometry -----
    "g4LINES": "أنواع الخطوط والزوايا",
    "g4ANGLE": "قياس الزوايا بالأداة (المنقلة)",
    "g4SHAPES": "أنواع الأشكال وخصائصها",
    "g4SYMM": "تطابق نصفَي الشكل (التماثل)",
    "g4COORD": "تحديد المواقع بالأرقام (الإحداثيات)",
    "g4LOC": "الموقع والاتجاه",
    # ----- G4: patterns & data -----
    "g4SEQ": "أنماط الأعداد والأشكال (المتتاليات)",
    "g4EXPR": "الجمل الحسابية والعدد المجهول (الجبر المبكّر)",
    "g4DATA": "قراءة الجداول والرسوم البيانية",
    "g4LINEPLOT": "الرسم بالنقاط",
    "g4GRAPH": "الرسوم الدائرية والخطّية",
    "g4PROB": "هل الحدث مؤكّدٌ أم ممكن (الاحتمال)",
    # ----- G3 foundations (appear as remediation roots) -----
    "g3PV": "قراءة الأعداد ومنازلها (القيمة المنزلية)",
    "g3PV5": "قراءة الأعداد ومنازلها (القيمة المنزلية)",
    "g3BIG": "قراءة الأعداد الكبيرة",
    "g3CMP4": "مقارنة الأعداد وترتيبها", "g3CMP10": "مقارنة الأعداد وترتيبها",
    "g3ROUND": "تقريب الأعداد (التقريب)", "g3ROUND4": "تقريب الأعداد (التقريب)",
    "g3ADD3": "الجمع والطرح", "g3OPS4": "الجمع والطرح بأعدادٍ كبيرة",
    "g3PROPS": "طرقٌ أسهل للحساب (خصائص العمليات)", "g3EST3": "تقدير ناتج الحساب (التقدير)",
    "g3ORDOPS": "ترتيب خطوات الحساب", "g3MUL": "فهم الضرب", "g3DIV": "فهم القسمة",
    "g3MULF1": "حقائق الضرب", "g3MULF2": "حقائق الضرب الصعبة", "g3DIVF": "حقائق القسمة",
    "g3F12": "الضرب في ١١ و١٢", "g3EVENM": "الأعداد الزوجية والفردية",
    "g3FACTOM": "الضرب والقسمة معاً", "g3MUL10": "الضرب في مضاعفات العشرة",
    "g3MULBIG": "ضرب الأعداد الكبيرة", "g3DIVREM": "القسمة مع باقٍ",
    "g3FRAC": "تقسيم الشيء أجزاءً (الكسور)", "g3FRLINE": "الأجزاء على الخطّ (الكسور)",
    "g3FREQ": "مقارنة الأجزاء (الكسور المتكافئة)", "g3FRSET3": "جزءٌ من مجموعة (الكسور)",
    "g3DEC": "الأرقام بعد الفاصلة (الأعداد العشرية)",
    "g3LEN": "قياس الطول وتحويله", "g3CAPMASS": "قياس الوزن والسعة وتحويلهما",
    "g3TIME3": "قراءة الوقت وحسابه", "g3MONEY3": "حساب النقود",
    "g3PERI": "طول الإطار حول الشكل (المحيط)", "g3AREA3": "المسطّح داخل الشكل (المساحة)",
    "g3GEO": "خصائص الأشكال", "g3SYMM": "تطابق نصفَي الشكل (التماثل)",
    "g3COORD": "تحديد المواقع بالأرقام (الإحداثيات)",
    "g3DATAR": "قراءة الجداول والرسوم", "g3DATAB": "رسم الجداول والرسوم",
    "g3PROB": "هل الحدث مؤكّدٌ أم ممكن (الاحتمال)",
    # ----- G1 foundations that appear as cross-grade roots -----
    "g1POS": "الموقع والاتجاه", "g1PV": "الآحاد والعشرات (القيمة المنزلية)",
    "g1AREA": "تغطية المسطّح (المساحة)", "g1ADD": "فهم الجمع", "g1SUB": "فهم الطرح",
    "g1HALF": "النصف والأجزاء المتساوية (الكسور)", "g1FRSET": "جزءٌ من مجموعة (الكسور)",
}


def describe(code: str | None, fallback_name: str = "") -> str:
    """Plain-language phrase for a skill code. Falls back to the raw curriculum name
    (registered DEBT — a bare term that breaks the plain-language rule)."""
    if code and code in TERMS:
        return TERMS[code]
    return fallback_name or (code or "")


def is_covered(code: str | None) -> bool:
    return bool(code) and code in TERMS


def uncovered(codes) -> list[str]:
    """Of the given skill codes, those WITHOUT a parent-friendly description (the debt)."""
    return sorted({c for c in codes if c and c not in TERMS})
