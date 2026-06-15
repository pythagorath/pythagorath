"""ORM models package.

Every model module is imported here so that Alembic's autogenerate sees them
via ``Base.metadata``.

A-2: top content hierarchy — country → curriculum → grade → subject → unit.
A-3: central entities — skill, skill_prerequisite, question.
A-4: accounts — user, student.
A-5: progress (single source of truth) — skill_mastery, answer_log, learning_path.
"""
from app.models.content import (  # noqa: F401
    Country,
    Curriculum,
    Grade,
    Subject,
    Unit,
)
from app.models.skill import (  # noqa: F401
    Question,
    Skill,
    SkillPrerequisite,
)
from app.models.user import (  # noqa: F401
    Student,
    User,
)
from app.models.progress import (  # noqa: F401
    AnswerLog,
    LearningPath,
    SkillMastery,
)
from app.models.audio import QuestionAudio  # noqa: F401
