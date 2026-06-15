"""The multi-country WORDING layer — a pure read concern.

A question has ONE default phrasing (``Question.prompt``, neutral Arabic that works
everywhere) plus optional per-country overrides (``QuestionPhrasing``). Resolving a
prompt for a country is: the country's override if present, else the default. The
family / answer / widget are never touched here — they live solely on ``Question``.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GCC_COUNTRIES, Question, QuestionPhrasing

COUNTRIES = list(GCC_COUNTRIES)

COUNTRY_NAMES_AR = {
    "SA": "السعودية",
    "AE": "الإمارات",
    "QA": "قطر",
    "KW": "الكويت",
    "OM": "عُمان",
    "BH": "البحرين",
}

# Illustrative wording hints per country — shown ONLY as a watermark/placeholder in
# the admin editor to guide the curriculum voice. NEVER stored, never sent to a
# child. Purely a drafting aid.
COUNTRY_HINT_AR = {
    "SA": "مثال باللهجة التعليمية السعودية: «عند سلمان ٥٢ ريالاً، أعطاه أبوه ٣٦ ريالاً…»",
    "AE": "مثال إماراتي: «جمع زايد ٥٢ درهماً ثم ٣٦ درهماً…»",
    "QA": "مثال قطري: «اشترى جاسم بـ٥٢ ريالاً قطرياً ثم بـ٣٦…»",
    "KW": "مثال كويتي: «مع عبدالله ٥٢ ديناراً… (أو فلساً حسب السياق)»",
    "OM": "مثال عُماني: «جمع سعيد ٥٢ بيسة ثم ٣٦ بيسة…»",
    "BH": "مثال بحريني: «مع علي ٥٢ ديناراً ثم أضاف ٣٦…»",
}


def is_country(code: str | None) -> bool:
    return code in GCC_COUNTRIES


def resolve_prompt(db: Session, question: Question, country: str | None) -> str:
    """The prompt a child of ``country`` should see for this question."""
    if not is_country(country):
        return question.prompt
    row = db.get(QuestionPhrasing, (question.id, country))
    return row.prompt if row else question.prompt


def phrasings_of(db: Session, question_id: int) -> dict[str, str]:
    """All stored country overrides for a question: {country: prompt}."""
    rows = db.execute(
        select(QuestionPhrasing).where(QuestionPhrasing.question_id == question_id)
    ).scalars().all()
    return {r.country: r.prompt for r in rows}
