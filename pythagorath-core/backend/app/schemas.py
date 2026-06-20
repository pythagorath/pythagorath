"""API schemas. Question ``answer`` is never sent to the client — server grades."""
from pydantic import BaseModel, ConfigDict, field_validator


# ----- auth -----
def _valid_email(v: str) -> str:
    v = (v or "").strip().lower()
    if "@" not in v or "." not in v.split("@")[-1] or len(v) < 5:
        raise ValueError("بريد غير صالح")
    return v


def _valid_password(v: str) -> str:
    if not v or len(v) < 8:
        raise ValueError("كلمة السر ٨ أحرف على الأقل")
    return v


_AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _valid_name(v: str) -> str:
    v = (v or "").strip()
    if len(v) < 2:
        raise ValueError("أدخل اسم وليّ الأمر")
    return v


def _valid_whatsapp(v: str) -> str:
    """Normalise to digits only (accepts Arabic-Indic digits, +, spaces, dashes) and check a
    plausible international length. The client composes country-code + number."""
    raw = (v or "").translate(_AR_DIGITS)
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not (8 <= len(digits) <= 15):
        raise ValueError("رقم الواتساب غير صحيح")
    return digits


class RegisterRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _e(cls, v):
        return _valid_email(v)

    @field_validator("password")
    @classmethod
    def _p(cls, v):
        return _valid_password(v)


class RegisterStartRequest(BaseModel):
    """Step 1 of OTP registration: collect the guardian profile + credentials. No user row
    is created yet — an OTP is emailed and held (with this data) until verified."""
    email: str
    password: str
    name: str
    whatsapp: str

    @field_validator("email")
    @classmethod
    def _e(cls, v):
        return _valid_email(v)

    @field_validator("password")
    @classmethod
    def _p(cls, v):
        return _valid_password(v)

    @field_validator("name")
    @classmethod
    def _n(cls, v):
        return _valid_name(v)

    @field_validator("whatsapp")
    @classmethod
    def _w(cls, v):
        return _valid_whatsapp(v)


class RegisterVerifyRequest(BaseModel):
    """Step 2: the 6-digit code from the email (pending data is in the httpOnly cookie)."""
    code: str

    @field_validator("code")
    @classmethod
    def _c(cls, v):
        v = (v or "").translate(_AR_DIGITS).strip()
        if not v.isdigit():
            raise ValueError("الرمز أرقام فقط")
        return v


class PairRequest(BaseModel):
    code: str


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _e(cls, v):
        return (v or "").strip().lower()


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    role: str
    name: str | None = None


class PasswordResetRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _e(cls, v):
        return (v or "").strip().lower()


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _p(cls, v):
        return _valid_password(v)


# ----- commercial -----
class PlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    price: int
    currency: str
    trial_days: int
    max_children: int
    period: str
    is_active: bool


class PlanCreate(BaseModel):
    name: str
    price: int
    currency: str = "OMR"
    trial_days: int = 0
    max_children: int = 1
    period: str = "monthly"
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def _n(cls, v):
        return _nonblank(v)

    @field_validator("price", "trial_days")
    @classmethod
    def _nonneg(cls, v):
        if v is None or v < 0:
            raise ValueError("must be >= 0")
        return v

    @field_validator("max_children")
    @classmethod
    def _pos(cls, v):
        if v is None or v < 1:
            raise ValueError("must be >= 1")
        return v

    @field_validator("period")
    @classmethod
    def _period(cls, v):
        if v not in ("monthly", "yearly"):
            raise ValueError("period must be monthly or yearly")
        return v


class PlanPatch(BaseModel):
    name: str | None = None
    price: int | None = None
    currency: str | None = None
    trial_days: int | None = None
    max_children: int | None = None
    period: str | None = None
    is_active: bool | None = None


class SubscribeRequest(BaseModel):
    plan_id: int


# manual payment (part B): the guardian transfers by bank/phone and uploads a proof.
# ~2MB cap on the inline data-URL (a data-URL is ~33% larger than the raw bytes).
_RECEIPT_MAX_CHARS = 2_800_000


class ReceiptCreate(BaseModel):
    plan_id: int
    method: str                      # bank | phone
    file: str                        # data-URL (image/* or application/pdf)
    filename: str | None = None

    @field_validator("method")
    @classmethod
    def _method(cls, v):
        if v not in ("bank", "phone"):
            raise ValueError("طريقة غير معروفة")
        return v

    @field_validator("file")
    @classmethod
    def _file(cls, v):
        v = (v or "").strip()
        if not v.startswith("data:"):
            raise ValueError("الإيصال مطلوب (صورة أو PDF)")
        head = v[:64].lower()
        if not ("image/" in head or "application/pdf" in head):
            raise ValueError("الملفّ يجب أن يكون صورة أو PDF")
        if len(v) > _RECEIPT_MAX_CHARS:
            raise ValueError("حجم الملفّ كبير — الحدّ ٢ ميجابايت")
        return v


class ReceiptReviewRequest(BaseModel):
    note: str | None = None          # rejection reason / admin note


class SubscriptionRead(BaseModel):
    status: str | None = None
    access_until: str | None = None
    has_access: bool
    plan_id: int | None = None


class SkillFreeRequest(BaseModel):
    is_free: bool


class ThemeRequest(BaseModel):
    theme: str


class GradeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    order: int


class StudentCreate(BaseModel):
    name: str
    # the child's TARGET (school) grade — MANDATORY (enforced in the handler → 400, so the
    # message is explicit rather than a raw 422). Optional here only for that clean error.
    grade_id: int | None = None
    country: str | None = None   # GCC code (SA/AE/QA/KW/OM/BH) or None → default
    consent_version: str | None = None   # the guardian's accepted consent version (required)


class StudentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    grade_id: int | None = None
    country: str | None = None


class QuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    family: str | None
    prompt: str
    visual: dict | None = None
    # live-generation (phase 0): set ⇢ this row is a one-child INSTANCE — answer
    # with instance_id, not question_id. NULL ⇢ a fixed template row (dual mode).
    instance_id: int | None = None


class AnswerRequest(BaseModel):
    student_id: int
    # exactly ONE of the two: a fixed question's id (dual-mode nodes), or a live
    # instance's id (generated nodes). Enforced in the endpoint.
    question_id: int | None = None
    instance_id: int | None = None
    answer: str
    elapsed_ms: int | None = None   # shown→submitted time (client-measured), for the speed gate


class UnderstandingState(BaseModel):
    mode: str           # families | generalization
    progress: int       # families passed (multi) or distinct correct items (single)
    needed: int
    families_passed: list[str]
    families_total: int


class Fluency(BaseModel):
    answered: int
    window: int
    correct: int
    accuracy: float
    needed: int
    threshold: float
    # speed dimension
    fast: int
    fast_ratio: float
    avg_ms: int | None = None
    speed_ceiling_ms: int


class Progress(BaseModel):
    status: str  # in_progress | understood | mastered
    understood: bool
    mastered: bool
    understanding: UnderstandingState
    fluency: Fluency | None = None


class AnswerResult(Progress):
    is_correct: bool
    # REPORTING ONLY (the celebration/feedback layer): what the coins system actually
    # granted for THIS answer + the new real balance. Read-back of students.coins around
    # the award — the coins LOGIC (coins.py) and the gates are untouched.
    coins_awarded: int = 0      # total granted by THIS answer (e.g. 2, 0, or 52 at mastery)
    mastery_bonus: int = 0      # the big mastery prize portion (0, or COINS_PER_MASTERY)
    coin_balance: int = 0       # the new real balance after this answer


# ----- skill map -----
class PrereqRef(BaseModel):
    id: int
    name: str
    satisfied: bool     # understood OR mastered (the lock threshold, v0.5)


class SkillMapEntry(BaseModel):
    id: int
    code: str | None
    name: str
    state: str          # operational | foundation
    order: int
    status: str         # in_progress | understood | mastered
    unlocked: bool
    prerequisites: list[PrereqRef]


# ----- diagnostic placement (§2) -----
class ProbeItem(BaseModel):
    skill_id: int
    code: str | None
    skill_name: str
    question_id: int
    family: str | None
    prompt: str
    visual: dict | None = None


class DiagnosticAnswer(BaseModel):
    question_id: int
    answer: str


class DiagnosticSubmit(BaseModel):
    answers: list[DiagnosticAnswer]


class PlacementRef(BaseModel):
    skill_id: int
    code: str | None
    name: str


class DiagnosticResult(BaseModel):
    understood_codes: list[str]
    placement: PlacementRef | None


# ----- adaptive diagnostic (interactive: start → probe → answer → next/placement) -----
class AdaptiveStep(BaseModel):
    done: bool
    questions_asked: int
    next: ProbeItem | None = None          # the next single probe to show (when not done)
    placement: PlacementRef | None = None  # the diagnosed start point (when done)


# ----- personal learning path: the next skill to study + why -----
class NextSkill(BaseModel):
    reason: str                            # remediation | continue | new | review | done
    skill: PlacementRef | None = None      # the next skill (None only when done)
    remediating_for: PlacementRef | None = None  # the struggling node we descended FROM (remediation)


# ----- the learning-loop entry: what should the child do right now? -----
class SessionState(BaseModel):
    needs_diagnostic: bool                 # never diagnosed → run the adaptive diagnostic first
    phase: str                             # diagnostic | learn | review | done
    next: NextSkill | None = None          # the next step (None only while needs_diagnostic)


# ----- admin panel (question editor + phrasing layer) -----
def _nonblank(v: str) -> str:
    if v is None or not str(v).strip():
        raise ValueError("required")
    return str(v).strip()


class AdminQuestionCreate(BaseModel):
    """Create a question. FAMILY is mandatory — no question is saved without one
    (the understanding gate is blind without a family)."""
    family: str
    prompt: str
    answer: str
    difficulty: str | None = None
    visual: dict | None = None

    @field_validator("family", "prompt", "answer")
    @classmethod
    def _req(cls, v):
        return _nonblank(v)


class AdminQuestionPatch(BaseModel):
    """Partial edit (only the fields sent are changed). `family` may not be blanked."""
    family: str | None = None
    prompt: str | None = None
    answer: str | None = None
    difficulty: str | None = None
    visual: dict | None = None

    @field_validator("family")
    @classmethod
    def _fam(cls, v):
        return _nonblank(v) if v is not None else v


class PhrasingBody(BaseModel):
    """A country WORDING override — prompt only. No family/answer/visual exist here,
    so a customisation structurally cannot change the structure."""
    prompt: str

    @field_validator("prompt")
    @classmethod
    def _req(cls, v):
        return _nonblank(v)
