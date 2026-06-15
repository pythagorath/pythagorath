"""The clean nucleus schema (no duplication).

    subject → unit → skill → question
    student, answer (log), skill_mastery (one row per student+skill)

Design notes:
* ``family`` lives ONLY on ``questions``; it is never copied onto ``answers``
  (it is derived by joining answer → question). Single source per fact.
* ``skill_mastery.status`` is the engine's persisted decision (one row per
  student+skill), recomputed from ``answers`` — not a duplicate of raw data.
* Status is a 3-tier ladder: ``in_progress`` → ``understood`` → ``mastered``,
  matching the constitution's two gates: understanding (two families) THEN
  fluency. ``mastered`` is granted only after BOTH. ``understood_answer_id`` marks
  the answer at which understanding was first reached, so the fluency window is
  measured only over answers that came AFTER it (the fluency phase).
"""
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)


class Grade(Base):
    """A school grade (e.g. الصف الثاني). A unit belongs to a (subject, grade) pair,
    so the catalogue scales to more grades and subjects by INSERTING rows — no schema
    change. Content stays Grade-2 / Math for now."""

    __tablename__ = "grades"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    order: Mapped[int] = mapped_column("order", Integer, nullable=False, default=0)


class Unit(Base):
    __tablename__ = "units"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # The grade this unit belongs to (with subject_id → a (subject, grade) catalogue).
    grade_id: Mapped[int | None] = mapped_column(
        ForeignKey("grades.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    order: Mapped[int] = mapped_column("order", Integer, nullable=False, default=0)


class Skill(Base):
    __tablename__ = "skills"
    # The network code (E1/B2/A1…) is unique WITHIN its unit, not globally — so each
    # grade/subject can reuse the same codes. Edges and the gate key on skill IDs, never
    # the code, so this changes nothing in the constitutional logic.
    __table_args__ = (
        UniqueConstraint("unit_id", "code", name="uq_skill_unit_code"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(
        ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Short network code (e.g. "B2") for reference/edges — unique per unit, optional.
    code: Mapped[str | None] = mapped_column(String(8), nullable=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    order: Mapped[int] = mapped_column("order", Integer, nullable=False, default=0)
    # operational (gates its dependents) | foundation (mastered but no in-network
    # dependents → gates nothing; its destination is outside the horizon).
    state: Mapped[str] = mapped_column(String(20), nullable=False, default="operational")
    # Free-sample flag (admin-managed). A free skill is reachable without a paid
    # subscription. This is a COMMERCIAL gate, entirely separate from the educational
    # prerequisite lock — see app/access.py.
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class SkillPrerequisite(Base):
    """A directed dependency edge: ``skill_id`` requires ``prerequisite_skill_id``
    to be mastered before it unlocks. The explicit edge table that makes the
    network a DAG — the lock gate follows THESE edges, never skill order."""

    __tablename__ = "skill_prerequisites"
    __table_args__ = (
        CheckConstraint(
            "skill_id <> prerequisite_skill_id",
            name="ck_skill_prereq_not_self",
        ),
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
    prerequisite_skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(
            "status in ('draft', 'published')",
            name="ck_question_status",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # The representation FAMILY (aggregative / magnitude / decompositional).
    # Nullable so future non-family content can coexist; the understanding gate
    # reads this column. THE single home of the family fact.
    family: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    prompt: Mapped[str] = mapped_column(String(500), nullable=False)
    answer: Mapped[str] = mapped_column(String(40), nullable=False)
    # Free authoring metadata (e.g. سهل/متوسط/صعب). Never read by the gate.
    difficulty: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # Interactive visual widget config {kind, ...}. NULL = plain text input.
    # Rendering-only metadata: the gate never reads it (it grades `answer` and
    # counts `family`). A widget turns a visual interaction into the answer string.
    visual: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Draft/published lifecycle. The CHILD and the GATE see `published` ONLY — a
    # draft (admin work-in-progress) never reaches a child and is never counted by
    # the understanding gate. New admin questions start as draft.
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", index=True
    )
    # When this row is an EDIT-OVERLAY of a published question, `draft_of` points at
    # it. The published original stays LIVE (children keep solving it) while the
    # admin edits the overlay; publishing the overlay merges it back. NULL = a
    # brand-new draft (or a published row).
    draft_of: Mapped[int | None] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=True
    )
    # LIVE-GENERATION parameter space (phase-0 of the live-variation conversion).
    # {"name": "<generator>", "params": {...}} — the PARAM SPACE lives here in the
    # DB so an admin can tune ranges/vocab via PATCH without a code release; the
    # generator FUNCTION lives in app/generators.py. NULL = this row is a plain
    # fixed question (and, if no generator is registered for the skill at all,
    # the node serves its fixed rows exactly as before — the DUAL MODE).
    generator: Mapped[dict | None] = mapped_column(JSON, nullable=True)


# The six GCC countries the phrasing layer may target.
GCC_COUNTRIES = ("SA", "AE", "QA", "KW", "OM", "BH")
_COUNTRY_LIST = ", ".join(f"'{c}'" for c in GCC_COUNTRIES)


class QuestionPhrasing(Base):
    """A per-country WORDING override for a question — and NOTHING else.

    The constitution's hard line: a country customisation may change the *wording*
    only, never the family, the answer, or the widget. That rule is enforced here
    STRUCTURALLY, not by validation code: this table physically has no family /
    answer / visual columns. The family, answer, and widget are read solely from
    the parent ``Question`` across every country. A country with no row sees the
    question's default (neutral-Arabic) ``prompt``.
    """

    __tablename__ = "question_phrasings"
    __table_args__ = (
        CheckConstraint(
            f"country in ({_COUNTRY_LIST})",
            name="ck_phrasing_country",
        ),
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True
    )
    country: Mapped[str] = mapped_column(String(2), primary_key=True)
    prompt: Mapped[str] = mapped_column(String(500), nullable=False)


class SkillCountry(Base):
    """A curriculum-PATH membership: skill ``skill_id`` appears in country ``country``'s
    official Grade-2 / first-semester curriculum.

    The SHARED-inventory model: each behavioural node is built ONCE in the network;
    this table records which countries' children see it. A child with ``country = NULL``
    sees the WHOLE inventory (no path filter). A child with a country sees only the nodes
    on that country's path. PURELY a display/scoping layer — the gate, the lock, the
    families, the diagnostic NEVER read it (a node's BEHAVIOUR is identical for every
    country; only the WORDING differs, via ``QuestionPhrasing``). Each country path is
    built prerequisite-closed, so a visible node never depends on a hidden one."""

    __tablename__ = "skill_countries"
    __table_args__ = (
        CheckConstraint(f"country in ({_COUNTRY_LIST})", name="ck_skill_country"),
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
    country: Mapped[str] = mapped_column(String(2), primary_key=True)


class User(Base):
    """An authenticated principal — a GUARDIAN (owns child profiles) or an ADMIN
    (manages content). Children are minors and never self-register: a guardian
    account owns them. Public registration creates guardians only."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role in ('guardian', 'admin')", name="ck_user_role"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="guardian")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint(
            f"country is null or country in ({_COUNTRY_LIST})",
            name="ck_student_country",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    # Display name (a child profile under a guardian — minimal PII).
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    # The child's country. Picks which phrasing they see; NULL → the default.
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    # The child's TARGET (school) grade — the SECOND curriculum-path dimension. The path a
    # child sees is the INTERSECTION of this grade (skill→unit.grade_id) and their country
    # (skill_countries). Mandatory at the API (a child without a learning grade is
    # meaningless); nullable here only so the migration can backfill existing rows.
    # SEMANTICS: target — NOT a final/locked level. When lower grades and cross-grade edges
    # exist, the diagnostic may place BELOW this grade (measure, don't assume — option ج);
    # nothing in the filter precludes that future widening.
    grade_id: Mapped[int | None] = mapped_column(
        ForeignKey("grades.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    # The owning guardian. The data-isolation boundary: every child-scoped endpoint
    # checks this against the authenticated user. NULL-owner children (only creatable
    # by direct DB access, never the API) are unreachable via the API — fail-closed.
    owner_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )


class ConsentRecord(Base):
    """A registered parental-consent event — the legal record for collecting a
    child's data. Captured atomically WITH child creation: who consented (user),
    for which child (student), to which version of the consent text, and when.
    The consent TEXT itself is reviewed by counsel; the structure pins the accepted
    VERSION and timestamp so consent is always provable."""

    __tablename__ = "consent_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class QuestionInstance(Base):
    """One LIVE-GENERATED copy of a template question, issued to ONE student.

    The live-variation layer (phase 0): the server samples the template's param
    space, renders prompt/visual, computes the answer, and stores it HERE before
    showing it — so grading compares against a server-held truth (no trust in the
    client), the parent report can show what was actually asked, and the whole
    exchange is auditable. The LEARNING layer is untouched: grading uses
    ``gate.grade`` unchanged, and the graded result is logged in ``Answer`` against
    the TEMPLATE's ``question_id`` — the family count, the distinct-items count,
    the fluency window and the reports all read exactly what they read before."""

    __tablename__ = "question_instances"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(          # the template this came from
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(           # issued to this child ONLY
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    family: Mapped[str | None] = mapped_column(String(40), nullable=True)
    prompt: Mapped[str] = mapped_column(String(500), nullable=False)
    answer: Mapped[str] = mapped_column(String(40), nullable=False)
    visual: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    answered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class Answer(Base):
    """Append-only log of every answered question (the raw truth the gate reads)."""

    __tablename__ = "answers"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    # Answering time in ms, from the question being SHOWN to submission (client-measured).
    # Read only by the fluency speed gate; NULL = unmeasured (never counts as "fast").
    elapsed_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class SkillMastery(Base):
    """One row per (student, skill). The persisted progress decision."""

    __tablename__ = "skill_mastery"
    __table_args__ = (
        CheckConstraint(
            "status in ('in_progress', 'understood', 'mastered')",
            name="ck_skill_mastery_status",
        ),
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    # The answer id at which understanding was first reached; the fluency phase is
    # every answer AFTER it. Null until understood. (Plain marker, not an FK.)
    understood_answer_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Durability: when this node is mastered, its next scheduled review time. Set at
    # mastery; consumed by no cycle yet (structure for spaced review). Null until mastered.
    next_review_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


# ===== commercial layer (separate from the constitutional logic) =====
class Plan(Base):
    """A subscription plan — admin-managed pricing + trial length."""

    __tablename__ = "plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)        # smallest unit (e.g. baisa)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="OMR")
    trial_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class Subscription(Base):
    """A guardian's subscription. Access is computed dynamically from status +
    access_until (> now), so no background expiry job is needed."""

    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint(
            "status in ('trial', 'active', 'expired', 'canceled')",
            name="ck_subscription_status",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("plans.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="trial")
    access_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class AppSetting(Base):
    """Tiny key→value store for admin-managed app settings (e.g. the active visual
    theme). Visual/config only — never read by the constitutional logic."""

    __tablename__ = "app_settings"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[str] = mapped_column(String(120), nullable=False)


class Payment(Base):
    """A payment event recorded by the (isolated) payment provider layer."""

    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="OMR")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    provider_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
