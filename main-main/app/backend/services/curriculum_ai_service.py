"""
Curriculum AI service.

End-to-end pipeline that turns raw curriculum text into stored, ready-to-use
teaching content using the native Claude API:

    1. Receive raw curriculum text.
    2. Send it to Claude to extract teaching *skills* and *learning objectives*.
    3. Ask Claude to generate a varied question set for each extracted skill.
    4. Persist the skills and questions to the database.

Configuration (read from environment / backend .env via ``core.config.settings``):
    ANTHROPIC_API_KEY   required - native Anthropic API key (sk-ant-...).
    CLAUDE_MODEL        optional - model id, defaults to ``claude-sonnet-4-6``.

Note: there is no learning-objectives table in the current schema, so objectives
are returned in the result payload (and attached to each skill) but not persisted
as their own rows. Skills -> ``curriculum_skills`` and questions ->
``curriculum_questions`` are persisted.
"""

import asyncio
import io
import json
import logging
import re
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF, used for PDF text extraction and page rendering
import httpx
from anthropic import AsyncAnthropic
from core.config import settings
from models.admin_questions import Admin_questions
from models.admin_skills import Admin_skills
from models.admin_subjects import Admin_subjects
from models.curriculum_lessons import Curriculum_lessons
from models.curriculum_questions import Curriculum_questions
from models.curriculum_skills import Curriculum_skills
from models.curriculum_units import Curriculum_units
from models.curriculum_uploads import Curriculum_uploads
from models.grades import Grades
from models.learning_paths import Learning_paths
from models.path_nodes import Path_nodes
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "claude-sonnet-4-6"
DEFAULT_QUESTIONS_PER_SKILL = 4
MAX_SKILLS = 40
MAX_EXTRACT_CHARS = 100_000
# Caps for full-structure extraction (units -> lessons -> skills).
MAX_STRUCTURE_UNITS = 20
MAX_LESSONS_PER_UNIT = 15
MAX_SKILLS_PER_LESSON = 10
ALLOWED_QUESTION_TYPES = {"mcq", "true_false", "short_answer"}
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}
# Used to order learning-path nodes from easiest to hardest.
DIFFICULTY_RANK = {"easy": 0, "medium": 1, "hard": 2}

# Below this many embedded characters a PDF is treated as scanned -> OCR fallback.
MIN_PDF_TEXT_CHARS = 20
DEFAULT_OCR_LANGUAGES = "ara+eng"
DEFAULT_OCR_DPI = 300
DEFAULT_OCR_MAX_PAGES = 30


class CurriculumAIError(RuntimeError):
    """Raised when the AI pipeline fails or its configuration is incomplete."""


class CurriculumAIService:
    """Service that extracts skills/objectives and generates questions via Claude."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.model = getattr(settings, "claude_model", None) or DEFAULT_MODEL
        api_key = getattr(settings, "anthropic_api_key", None)
        self.client: Optional[AsyncAnthropic] = AsyncAnthropic(api_key=api_key) if api_key else None

    # ------------------ Public API ------------------

    async def process_curriculum(
        self,
        *,
        curriculum_text: str,
        domain_id: int,
        grade: str,
        semester: str,
        questions_per_skill: int = DEFAULT_QUESTIONS_PER_SKILL,
        persist: bool = True,
    ) -> Dict[str, Any]:
        """Run the full pipeline and (optionally) persist the results.

        Args:
            curriculum_text: Raw curriculum/lesson text to analyse.
            domain_id: Curriculum domain the extracted skills belong to.
            grade: Grade label (stored on each skill; required by the schema).
            semester: Semester label (stored on each skill; required by the schema).
            questions_per_skill: How many questions to generate per skill.
            persist: When True, write skills and questions to the database.

        Returns:
            A dict describing the extracted skills, generated questions, and -
            when ``persist`` is True - the created database ids.
        """
        if not curriculum_text or not curriculum_text.strip():
            raise CurriculumAIError("curriculum_text is required and cannot be empty.")

        self._require_client()

        logger.info("Extracting skills from curriculum text (domain_id=%s, grade=%s)", domain_id, grade)
        skills = await self.extract_skills(curriculum_text, grade=grade, semester=semester)
        if not skills:
            raise CurriculumAIError("Claude did not return any skills for the provided curriculum text.")

        logger.info("Extracted %d skills; generating questions (%d per skill)", len(skills), questions_per_skill)
        question_sets = await asyncio.gather(
            *[
                self.generate_questions(skill, grade=grade, semester=semester, count=questions_per_skill)
                for skill in skills
            ]
        )
        for skill, questions in zip(skills, question_sets):
            skill["questions"] = questions

        if not persist:
            return {"persisted": False, "skills": skills}

        return await self._persist(domain_id=domain_id, grade=grade, semester=semester, skills=skills)

    async def process_curriculum_structure(
        self,
        *,
        curriculum_text: str,
        domain_id: int,
        grade: str,
        semester: str,
        grade_number: int,
        subject_name: str,
        semester_number: int,
        user_id: str = "ai-pipeline",
        questions_per_skill: int = DEFAULT_QUESTIONS_PER_SKILL,
        persist: bool = True,
    ) -> Dict[str, Any]:
        """Build the full curriculum hierarchy from raw text in one pass.

        Pipeline: extract units -> lessons -> skills (+objectives) with a single
        Claude call, generate a question set per skill (in parallel), then persist
        the whole tree (upload -> units -> lessons -> skills -> questions).
        """
        if not curriculum_text or not curriculum_text.strip():
            raise CurriculumAIError("curriculum_text is required and cannot be empty.")

        self._require_client()

        logger.info("Extracting full structure (domain_id=%s, grade=%s)", domain_id, grade)
        units = await self.extract_structure(curriculum_text, grade=grade, semester=semester)
        if not units:
            raise CurriculumAIError("Claude did not return any units for the provided curriculum text.")

        # Collect every skill across all lessons, then generate questions in parallel.
        all_skills = [skill for unit in units for lesson in unit["lessons"] for skill in lesson["skills"]]
        logger.info(
            "Structure: %d units, %d lessons, %d skills; generating %d questions/skill",
            len(units),
            sum(len(u["lessons"]) for u in units),
            len(all_skills),
            questions_per_skill,
        )
        question_sets = await asyncio.gather(
            *[
                self.generate_questions(skill, grade=grade, semester=semester, count=questions_per_skill)
                for skill in all_skills
            ]
        )
        for skill, questions in zip(all_skills, question_sets):
            skill["questions"] = questions

        if not persist:
            return {"persisted": False, "units": units}

        return await self._persist_structure(
            units=units,
            domain_id=domain_id,
            grade=grade,
            semester=semester,
            grade_number=grade_number,
            subject_name=subject_name,
            semester_number=semester_number,
            user_id=user_id,
        )

    async def fetch_and_extract_text(self, file_url: str, *, max_chars: int = MAX_EXTRACT_CHARS) -> str:
        """Download a curriculum file and extract its plain text.

        Supports native PDF (via PyMuPDF) and plain-text files. Other formats
        (e.g. DOCX) are rejected with a clear, actionable error.
        """
        if not file_url or not file_url.strip():
            raise CurriculumAIError("file_url is required.")
        if not file_url.lower().startswith(("http://", "https://")):
            raise CurriculumAIError(
                "Stored file reference is not a downloadable URL. Paste the curriculum text manually instead."
            )

        try:
            async with httpx.AsyncClient(timeout=60.0, trust_env=True, follow_redirects=True) as http:
                resp = await http.get(file_url)
                resp.raise_for_status()
                content = resp.content
                content_type = resp.headers.get("content-type", "").lower()
        except Exception as e:
            logger.error("Failed to download curriculum file: %s", e)
            raise CurriculumAIError(f"Failed to download the file: {e}") from e

        # Extraction (and any OCR) is CPU-bound and blocking; run it off the event loop.
        return await asyncio.to_thread(
            self._extract_text, content, content_type=content_type, source=file_url, max_chars=max_chars
        )

    @classmethod
    def _extract_text(cls, content: bytes, *, content_type: str, source: str, max_chars: int = MAX_EXTRACT_CHARS) -> str:
        """Extract text from downloaded file bytes (with OCR fallback for scanned PDFs)."""
        name = source.split("?")[0].lower()
        is_pdf = "pdf" in content_type or name.endswith(".pdf") or content[:5] == b"%PDF-"
        is_docx = (
            "officedocument" in content_type
            or "msword" in content_type
            or name.endswith((".docx", ".doc"))
        )

        if is_docx:
            raise CurriculumAIError(
                "DOCX/DOC files are not supported for auto-extraction yet. "
                "Please upload a PDF or paste the text manually."
            )

        if is_pdf:
            try:
                doc = fitz.open(stream=content, filetype="pdf")
            except Exception as e:
                raise CurriculumAIError("Failed to read the PDF file.") from e
            try:
                text = "\n".join(page.get_text() for page in doc).strip()
                # Scanned/image-only PDFs have little or no embedded text -> OCR.
                if len(text) < MIN_PDF_TEXT_CHARS:
                    logger.info("PDF has %d embedded chars; attempting OCR fallback...", len(text))
                    ocr_text = cls._ocr_pdf(doc, max_chars=max_chars)
                    if len(ocr_text) > len(text):
                        text = ocr_text
            finally:
                doc.close()
        else:
            # Best-effort: treat anything else as UTF-8 text.
            text = content.decode("utf-8", errors="ignore").strip()

        if not text:
            raise CurriculumAIError(
                "No extractable text was found in the file (it may be a scanned image). "
                "Please paste the curriculum text manually."
            )
        return text[:max_chars]

    @staticmethod
    def _ocr_pdf(doc: "fitz.Document", *, max_chars: int = MAX_EXTRACT_CHARS) -> str:
        """OCR a scanned PDF by rendering each page to an image and running Tesseract.

        Requires the optional 'pytesseract' + 'Pillow' packages and a system Tesseract
        install (with the relevant language data, e.g. Arabic 'ara'). Controlled by env:
        OCR_ENABLED, OCR_LANGUAGES, OCR_DPI, OCR_MAX_PAGES, TESSERACT_CMD.
        """
        if str(getattr(settings, "ocr_enabled", "true") or "true").lower() in ("0", "false", "no"):
            logger.info("OCR disabled (OCR_ENABLED); skipping scanned-PDF OCR.")
            return ""

        try:
            import pytesseract
            from PIL import Image
        except ImportError as e:
            raise CurriculumAIError(
                "OCR support requires the 'pytesseract' and 'Pillow' packages. "
                "Install them with: pip install pytesseract Pillow"
            ) from e

        tesseract_cmd = getattr(settings, "tesseract_cmd", None)
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

        languages = getattr(settings, "ocr_languages", None) or DEFAULT_OCR_LANGUAGES
        try:
            dpi = int(getattr(settings, "ocr_dpi", None) or DEFAULT_OCR_DPI)
        except (TypeError, ValueError):
            dpi = DEFAULT_OCR_DPI
        try:
            max_pages = int(getattr(settings, "ocr_max_pages", None) or DEFAULT_OCR_MAX_PAGES)
        except (TypeError, ValueError):
            max_pages = DEFAULT_OCR_MAX_PAGES

        parts: List[str] = []
        try:
            for page_index, page in enumerate(doc):
                if page_index >= max_pages:
                    logger.warning("OCR stopped at %d pages (OCR_MAX_PAGES).", max_pages)
                    break
                pix = page.get_pixmap(dpi=dpi)
                image = Image.open(io.BytesIO(pix.tobytes("png")))
                parts.append(pytesseract.image_to_string(image, lang=languages))
        except pytesseract.TesseractNotFoundError as e:
            raise CurriculumAIError(
                "Tesseract OCR engine was not found. Install Tesseract and the Arabic language pack "
                "('ara'), then add it to PATH or set TESSERACT_CMD to the tesseract executable path."
            ) from e
        except pytesseract.pytesseract.TesseractError as e:
            # Most commonly a missing language data file (e.g. 'ara').
            raise CurriculumAIError(
                f"OCR failed: {e}. Ensure the required Tesseract language data (e.g. 'ara') is installed."
            ) from e
        except Exception as e:
            raise CurriculumAIError(f"OCR failed: {e}") from e

        text = "\n".join(parts).strip()
        logger.info("OCR produced %d characters.", len(text))
        return text[:max_chars]

    async def extract_skills(self, curriculum_text: str, *, grade: str, semester: str) -> List[Dict[str, Any]]:
        """Ask Claude to extract teaching skills and their learning objectives."""
        system = (
            "You are an expert curriculum analyst for K-12 education. "
            "You read raw curriculum text and break it into discrete, teachable skills, "
            "each with measurable learning objectives. You always reply with valid JSON only, "
            "no prose, no markdown fences."
        )
        user = f"""Analyse the following curriculum text for grade "{grade}", semester "{semester}".

Extract the distinct teachable skills (at most {MAX_SKILLS}). For each skill provide:
- "name": the skill name in Arabic.
- "name_en": the skill name in English.
- "difficulty_level": one of "easy", "medium", "hard".
- "objectives": a list of 2-5 measurable learning objectives in Arabic.
- "misconception_types": a list of common student misconceptions for this skill (may be empty).

Reply with JSON of the exact shape:
{{"skills": [{{"name": "...", "name_en": "...", "difficulty_level": "...", "objectives": ["..."], "misconception_types": ["..."]}}]}}

Curriculum text:
\"\"\"
{curriculum_text.strip()}
\"\"\""""

        data = await self._complete_json(system=system, user=user, max_tokens=4096)
        raw_skills = data.get("skills") if isinstance(data, dict) else data
        if not isinstance(raw_skills, list):
            raise CurriculumAIError("Claude skills response did not contain a 'skills' list.")
        return self._normalize_skills(raw_skills, limit=MAX_SKILLS)

    async def extract_structure(
        self, curriculum_text: str, *, grade: str, semester: str
    ) -> List[Dict[str, Any]]:
        """Extract the full hierarchy (units -> lessons -> skills) in one Claude call."""
        system = (
            "You are an expert curriculum designer for K-12 education. You read raw curriculum "
            "text and organize it into a hierarchy of units, lessons, and teachable skills. "
            "You always reply with valid JSON only, no prose, no markdown fences."
        )
        user = f"""Analyse the following curriculum text for grade "{grade}", semester "{semester}".

Organize it into a hierarchy:
- Units (at most {MAX_STRUCTURE_UNITS}). Each unit has lessons.
- Lessons (at most {MAX_LESSONS_PER_UNIT} per unit). Each lesson has skills.
- Skills (at most {MAX_SKILLS_PER_LESSON} per lesson).

For each unit: "name" (Arabic), "description" (Arabic, short).
For each lesson: "name_ar", "name_en", "description" (Arabic, short).
For each skill: "name" (Arabic), "name_en", "difficulty_level" (one of "easy","medium","hard"),
"objectives" (2-5 measurable objectives in Arabic), "misconception_types" (may be empty).

Reply with JSON of the exact shape:
{{"units": [{{"name": "...", "description": "...", "lessons": [{{"name_ar": "...", "name_en": "...", "description": "...", "skills": [{{"name": "...", "name_en": "...", "difficulty_level": "easy", "objectives": ["..."], "misconception_types": ["..."]}}]}}]}}]}}

Curriculum text:
\"\"\"
{curriculum_text.strip()}
\"\"\""""

        data = await self._complete_json(system=system, user=user, max_tokens=8192)
        raw_units = data.get("units") if isinstance(data, dict) else data
        if not isinstance(raw_units, list):
            raise CurriculumAIError("Claude structure response did not contain a 'units' list.")

        units: List[Dict[str, Any]] = []
        for raw_unit in raw_units[:MAX_STRUCTURE_UNITS]:
            if not isinstance(raw_unit, dict):
                continue
            unit_name = (raw_unit.get("name") or "").strip()
            if not unit_name:
                continue
            lessons: List[Dict[str, Any]] = []
            for raw_lesson in (raw_unit.get("lessons") or [])[:MAX_LESSONS_PER_UNIT]:
                if not isinstance(raw_lesson, dict):
                    continue
                lesson_name = (raw_lesson.get("name_ar") or raw_lesson.get("name_en") or "").strip()
                if not lesson_name:
                    continue
                skills = self._normalize_skills(raw_lesson.get("skills"), limit=MAX_SKILLS_PER_LESSON)
                if not skills:
                    continue
                lessons.append(
                    {
                        "name_ar": lesson_name,
                        "name_en": (raw_lesson.get("name_en") or None),
                        "description": (raw_lesson.get("description") or None),
                        "skills": skills,
                    }
                )
            if not lessons:
                continue
            units.append(
                {
                    "name": unit_name,
                    "description": (raw_unit.get("description") or None),
                    "lessons": lessons,
                }
            )
        return units

    @staticmethod
    def _normalize_skills(raw_skills: Any, *, limit: int) -> List[Dict[str, Any]]:
        """Validate and normalize a list of raw skill dicts (shared by both pipelines)."""
        skills: List[Dict[str, Any]] = []
        if not isinstance(raw_skills, list):
            return skills
        for item in raw_skills[:limit]:
            if not isinstance(item, dict):
                continue
            name = (item.get("name") or item.get("name_en") or "").strip()
            if not name:
                continue
            difficulty = str(item.get("difficulty_level", "medium")).strip().lower()
            if difficulty not in ALLOWED_DIFFICULTIES:
                difficulty = "medium"
            skills.append(
                {
                    "name": name,
                    "name_en": (item.get("name_en") or None),
                    "difficulty_level": difficulty,
                    "objectives": [str(o).strip() for o in item.get("objectives", []) if str(o).strip()],
                    "misconception_types": [
                        str(m).strip() for m in item.get("misconception_types", []) if str(m).strip()
                    ],
                }
            )
        return skills

    async def generate_questions(
        self, skill: Dict[str, Any], *, grade: str, semester: str, count: int
    ) -> List[Dict[str, Any]]:
        """Ask Claude to generate a varied question set for a single skill."""
        if count <= 0:
            return []

        objectives = "\n".join(f"- {o}" for o in skill.get("objectives", [])) or "- (none provided)"
        system = (
            "You are an expert assessment writer. You create accurate, grade-appropriate "
            "questions of varied types and difficulties. You always reply with valid JSON only."
        )
        user = f"""Create exactly {count} assessment questions for the skill below.
Grade: "{grade}". Semester: "{semester}".

Skill: {skill['name']} ({skill.get('name_en') or ''})
Learning objectives:
{objectives}

Requirements:
- Vary the question types across "mcq", "true_false", and "short_answer".
- Vary the difficulty across "easy", "medium", "hard".
- For "mcq": provide exactly 4 options and set "correct_answer" to the correct option's letter (A, B, C, or D).
- For "true_false": set "correct_answer" to "true" or "false" and leave options empty.
- For "short_answer": set "correct_answer" to the expected answer and leave options empty.
- Write "question_text" in Arabic and provide a short "explanation" in Arabic.

Reply with JSON of the exact shape:
{{"questions": [{{"question_text": "...", "question_type": "mcq", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "correct_answer": "A", "explanation": "...", "difficulty": "easy", "misconception_tag": ""}}]}}"""

        data = await self._complete_json(system=system, user=user, max_tokens=4096)
        raw_questions = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(raw_questions, list):
            logger.warning("Question response for skill '%s' was not a list; skipping.", skill["name"])
            return []

        questions: List[Dict[str, Any]] = []
        for item in raw_questions:
            normalized = self._normalize_question(item)
            if normalized:
                questions.append(normalized)
        return questions

    # ------------------ Internals ------------------

    def _require_client(self) -> AsyncAnthropic:
        if not self.client:
            raise CurriculumAIError(
                "Claude API not configured. Set ANTHROPIC_API_KEY in the backend .env file."
            )
        return self.client

    async def _complete_json(self, *, system: str, user: str, max_tokens: int = 4096) -> Any:
        """Call the Claude messages API and parse a JSON payload from the response."""
        client = self._require_client()
        try:
            message = await client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=0.2,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
        except Exception as e:  # surface a clean, typed error to callers
            logger.error("Claude API call failed: %s", e)
            raise CurriculumAIError(f"Claude API call failed: {e}") from e

        text = "".join(
            getattr(block, "text", "") for block in message.content if getattr(block, "type", None) == "text"
        )
        return self._parse_json(text)

    @staticmethod
    def _parse_json(raw: str) -> Any:
        """Parse JSON from a model response, tolerating markdown fences/prose."""
        text = (raw or "").strip()
        fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
        if fence:
            text = fence.group(1).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
            if not match:
                raise CurriculumAIError("Claude response was not valid JSON.")
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError as e:
                raise CurriculumAIError("Claude response could not be parsed as JSON.") from e

    @staticmethod
    def _normalize_question(item: Any) -> Optional[Dict[str, Any]]:
        """Validate and normalise a single AI-generated question into model fields."""
        if not isinstance(item, dict):
            return None
        question_text = (item.get("question_text") or "").strip()
        correct_answer = str(item.get("correct_answer", "")).strip()
        if not question_text or not correct_answer:
            return None

        qtype = str(item.get("question_type", "mcq")).strip().lower()
        if qtype not in ALLOWED_QUESTION_TYPES:
            qtype = "mcq"
        difficulty = str(item.get("difficulty", "medium")).strip().lower()
        if difficulty not in ALLOWED_DIFFICULTIES:
            difficulty = "medium"

        options = item.get("options") or {}
        if isinstance(options, list):  # tolerate ["..", ".."] form
            options = {chr(ord("A") + i): v for i, v in enumerate(options)}

        return {
            "question_text": question_text,
            "question_type": qtype,
            "option_a": (str(options.get("A")).strip() if options.get("A") is not None else None),
            "option_b": (str(options.get("B")).strip() if options.get("B") is not None else None),
            "option_c": (str(options.get("C")).strip() if options.get("C") is not None else None),
            "option_d": (str(options.get("D")).strip() if options.get("D") is not None else None),
            "correct_answer": correct_answer,
            "explanation": (item.get("explanation") or None),
            "difficulty": difficulty,
            "misconception_tag": (str(item.get("misconception_tag")).strip() or None)
            if item.get("misconception_tag")
            else None,
        }

    async def _persist(
        self, *, domain_id: int, grade: str, semester: str, skills: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Persist skills and their questions in a single transaction."""
        created_skills: List[Dict[str, Any]] = []
        total_questions = 0
        try:
            for order_index, skill in enumerate(skills):
                skill_row = Curriculum_skills(
                    name=skill["name"],
                    name_en=skill.get("name_en"),
                    domain_id=domain_id,
                    grade=grade,
                    semester=semester,
                    difficulty_level=skill.get("difficulty_level"),
                    min_questions_required=len(skill.get("questions", [])),
                    misconception_types=", ".join(skill.get("misconception_types", [])) or None,
                    status="ai_generated",
                    order_index=order_index,
                )
                self.db.add(skill_row)
                await self.db.flush()  # assign skill_row.id without ending the transaction

                question_ids: List[int] = []
                for q in skill.get("questions", []):
                    question_row = Curriculum_questions(
                        skill_id=skill_row.id,
                        review_status="pending",
                        **q,
                    )
                    self.db.add(question_row)
                    await self.db.flush()
                    question_ids.append(question_row.id)

                total_questions += len(question_ids)
                created_skills.append(
                    {
                        "skill_id": skill_row.id,
                        "name": skill_row.name,
                        "objectives": skill.get("objectives", []),
                        "question_ids": question_ids,
                        "questions_created": len(question_ids),
                    }
                )

            await self.db.commit()
            logger.info(
                "Persisted %d skills and %d questions for domain_id=%s", len(created_skills), total_questions, domain_id
            )
        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to persist curriculum AI results: %s", e)
            raise

        return {
            "persisted": True,
            "domain_id": domain_id,
            "skills_created": len(created_skills),
            "questions_created": total_questions,
            "skills": created_skills,
        }

    async def _resolve_grade_id(self, grade_number: int) -> int:
        """Map a numeric grade to the canonical grades.id (lowest id for that number).

        Falls back to the grade number itself when no matching row exists.
        """
        row_id = (
            await self.db.execute(
                select(Grades.id).where(Grades.grade_number == grade_number).order_by(Grades.id)
            )
        ).scalars().first()
        return row_id if row_id is not None else grade_number

    async def _ensure_admin_subject(self, *, grade_id: int, subject_name: str) -> int:
        """Find (or create) the admin_subjects row for this grade/subject and return its id.

        admin_skills.subject_id references admin_subjects.id, so the student's subject
        list and skill query line up.
        """
        existing = (
            await self.db.execute(
                select(Admin_subjects).where(
                    Admin_subjects.name == subject_name,
                    Admin_subjects.grade_id == grade_id,
                )
            )
        ).scalars().first()
        if existing:
            return existing.id
        subject = Admin_subjects(name=subject_name, grade_id=grade_id, status="published")
        self.db.add(subject)
        await self.db.flush()
        return subject.id

    @staticmethod
    def _build_admin_question_fields(q: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a normalized AI question into admin_questions fields.

        Produces an options JSON array and a text-based correct_answer so the
        student parser (parseQuestionsForStudent) resolves the correct option.
        """
        qtype = (q.get("question_type") or "mcq").lower()
        correct_raw = str(q.get("correct_answer", "")).strip()

        if qtype == "true_false":
            options = ["صح", "خطأ"]
            correct_text = "صح" if correct_raw.lower() in ("true", "صح", "1", "نعم") else "خطأ"
        elif qtype == "mcq":
            letter_map = {"A": q.get("option_a"), "B": q.get("option_b"), "C": q.get("option_c"), "D": q.get("option_d")}
            options = [str(v).strip() for v in letter_map.values() if v is not None and str(v).strip()]
            correct_text = str(letter_map.get(correct_raw.upper()) or "").strip()
            if not correct_text and options:
                correct_text = options[0]
        else:  # short_answer (and anything else): present the answer as a single option
            options = [correct_raw] if correct_raw else ["—"]
            correct_text = correct_raw or "—"

        import json as _json

        return {
            "question_text": q["question_text"],
            "question_type": "multiple_choice",
            "difficulty": q.get("difficulty") or "medium",
            "options": _json.dumps(options, ensure_ascii=False),
            "correct_answer": correct_text,
            "explanation": q.get("explanation"),
            "status": "published",
        }

    async def _persist_structure(
        self,
        *,
        units: List[Dict[str, Any]],
        domain_id: int,
        grade: str,
        semester: str,
        grade_number: int,
        subject_name: str,
        semester_number: int,
        user_id: str,
    ) -> Dict[str, Any]:
        """Persist the full hierarchy (upload -> units -> lessons -> skills -> questions),
        then bridge skills/questions into the admin_* tables the student app reads."""
        counts = {"units": 0, "lessons": 0, "skills": 0, "questions": 0, "admin_skills": 0, "admin_questions": 0}
        # Collected mirrored skills, used to build the ordered learning path (Step 2).
        bridged_skills: List[Dict[str, Any]] = []
        try:
            # Bridge target: resolve grade + subject in the admin_* (student-facing) tables.
            admin_grade_id = await self._resolve_grade_id(grade_number)
            admin_subject_id = await self._ensure_admin_subject(grade_id=admin_grade_id, subject_name=subject_name)

            # Anchor row that the units belong to.
            upload = Curriculum_uploads(
                grade_number=grade_number,
                subject_name=subject_name,
                semester=semester_number,
                title=f"{subject_name} - {grade} (AI)",
                status="ai_generated",
                user_id=user_id,
            )
            self.db.add(upload)
            await self.db.flush()

            for unit_index, unit in enumerate(units):
                unit_row = Curriculum_units(
                    curriculum_upload_id=upload.id,
                    name=unit["name"],
                    order_index=unit_index,
                    description=unit.get("description"),
                )
                self.db.add(unit_row)
                await self.db.flush()
                counts["units"] += 1

                for lesson_index, lesson in enumerate(unit["lessons"]):
                    lesson_row = Curriculum_lessons(
                        unit_id=unit_row.id,
                        name_ar=lesson["name_ar"],
                        name_en=lesson.get("name_en"),
                        description=lesson.get("description"),
                        lesson_type="ai_generated",
                        lesson_number=lesson_index + 1,
                        display_order=lesson_index,
                        is_active=True,
                    )
                    self.db.add(lesson_row)
                    await self.db.flush()
                    counts["lessons"] += 1

                    for skill_index, skill in enumerate(lesson["skills"]):
                        skill_row = Curriculum_skills(
                            name=skill["name"],
                            name_en=skill.get("name_en"),
                            domain_id=domain_id,
                            lesson_id=lesson_row.id,
                            grade=grade,
                            semester=semester,
                            difficulty_level=skill.get("difficulty_level"),
                            min_questions_required=len(skill.get("questions", [])),
                            misconception_types=", ".join(skill.get("misconception_types", [])) or None,
                            status="ai_generated",
                            order_index=skill_index,
                        )
                        self.db.add(skill_row)
                        await self.db.flush()
                        counts["skills"] += 1

                        # Bridge: mirror the skill into admin_skills (student-facing).
                        admin_skill = Admin_skills(
                            name=skill["name"],
                            grade_id=admin_grade_id,
                            subject_id=admin_subject_id,
                            domain=skill.get("name_en"),
                            difficulty=skill.get("difficulty_level"),
                            mastery_threshold=80,
                            status="published",
                        )
                        self.db.add(admin_skill)
                        await self.db.flush()
                        counts["admin_skills"] += 1
                        bridged_skills.append(
                            {
                                "admin_skill_id": admin_skill.id,
                                "name": skill["name"],
                                "difficulty": skill.get("difficulty_level") or "medium",
                            }
                        )

                        for q in skill.get("questions", []):
                            self.db.add(
                                Curriculum_questions(skill_id=skill_row.id, review_status="pending", **q)
                            )
                            counts["questions"] += 1
                            # Bridge: mirror the question into admin_questions, linked to admin_skill.
                            self.db.add(
                                Admin_questions(skill_id=admin_skill.id, **self._build_admin_question_fields(q))
                            )
                            counts["admin_questions"] += 1

            # Step 2: generate a published learning path for this grade/subject/semester,
            # with one node per skill ordered easiest -> hardest.
            path_info = await self._generate_learning_path(
                bridged_skills=bridged_skills,
                upload_id=upload.id,
                grade_number=grade_number,
                semester_number=semester_number,
                subject_name=subject_name,
                user_id=user_id,
            )

            await self.db.commit()
            logger.info(
                "Persisted structure: %d units, %d lessons, %d skills, %d questions "
                "(mirrored %d admin_skills, %d admin_questions; upload_id=%s)",
                counts["units"],
                counts["lessons"],
                counts["skills"],
                counts["questions"],
                counts["admin_skills"],
                counts["admin_questions"],
                upload.id,
            )
            logger.info(
                "Generated learning path id=%s with %d nodes",
                path_info["learning_path_id"],
                path_info["nodes_created"],
            )
        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to persist curriculum structure: %s", e)
            raise

        return {
            "persisted": True,
            "upload_id": upload.id,
            "domain_id": domain_id,
            "units_created": counts["units"],
            "lessons_created": counts["lessons"],
            "skills_created": counts["skills"],
            "questions_created": counts["questions"],
            "admin_skills_created": counts["admin_skills"],
            "admin_questions_created": counts["admin_questions"],
            "grade_id": admin_grade_id,
            "subject_id": admin_subject_id,
            "learning_path_id": path_info["learning_path_id"],
            "path_nodes_created": path_info["nodes_created"],
        }

    async def _generate_learning_path(
        self,
        *,
        bridged_skills: List[Dict[str, Any]],
        upload_id: int,
        grade_number: int,
        semester_number: int,
        subject_name: str,
        user_id: str = "ai-template",
    ) -> Dict[str, Any]:
        """Create a published learning_path + ordered path_nodes for the given skills.

        The student page (StudentLearningPaths) loads paths by ``status='published'``
        and ``grade_number``, then nodes by ``learning_path_id`` sorted by
        ``order_index``. path_nodes has no skill_id column, so the link to the
        student-facing admin_skill is stored in ``content_config`` as JSON. Nodes are
        ordered from easiest to hardest by skill difficulty.
        """
        if not bridged_skills:
            return {"learning_path_id": None, "nodes_created": 0}

        ordered = sorted(
            bridged_skills, key=lambda s: DIFFICULTY_RANK.get(str(s.get("difficulty")).lower(), 1)
        )

        path = Learning_paths(
            user_id=user_id,
            curriculum_upload_id=upload_id,
            title=f"مسار {subject_name}",
            grade_number=grade_number,
            subject_name=subject_name,
            semester=semester_number,
            status="published",
            total_nodes=len(ordered),
        )
        self.db.add(path)
        await self.db.flush()

        import json as _json

        for order_index, skill in enumerate(ordered):
            self.db.add(
                Path_nodes(
                    user_id=user_id,
                    learning_path_id=path.id,
                    node_type="skill",
                    title=skill["name"],
                    order_index=order_index,
                    content_config=_json.dumps(
                        {"skill_id": skill["admin_skill_id"], "difficulty": skill.get("difficulty")},
                        ensure_ascii=False,
                    ),
                )
            )

        return {"learning_path_id": path.id, "nodes_created": len(ordered)}
