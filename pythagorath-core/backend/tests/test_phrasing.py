"""Pins the wording layer: country override changes the prompt, nothing else."""
from app import phrasing
from app.models import QuestionPhrasing


def test_resolve_default_when_no_override(db, h):
    q = h.questions(db, h.skill(db, "B4").id)[0]
    assert phrasing.resolve_prompt(db, q, None) == q.prompt
    assert phrasing.resolve_prompt(db, q, "OM") == q.prompt
    assert phrasing.resolve_prompt(db, q, "ZZ") == q.prompt   # unknown country → default


def test_country_override_resolves_only_for_that_country(db, h):
    q = h.questions(db, h.skill(db, "B4").id)[0]
    db.add(QuestionPhrasing(question_id=q.id, country="QA", prompt="نصّ قطري"))
    db.commit()
    assert phrasing.resolve_prompt(db, q, "QA") == "نصّ قطري"
    assert phrasing.resolve_prompt(db, q, "OM") == q.prompt          # default elsewhere
    assert phrasing.phrasings_of(db, q.id) == {"QA": "نصّ قطري"}
    # family/answer are untouched by phrasing (structural guarantee)
    assert q.family is not None and q.answer
