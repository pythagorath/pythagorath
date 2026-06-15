"""The central learning entities (blueprint §5.2 / §6).

    unit → skill → question
    skill ←→ skill   (prerequisite graph)

One table per entity, every link a real ForeignKey. Delete behaviour is set at
the DATABASE level (not just the ORM) so integrity holds no matter who writes:

* ``skills.unit_id``                     ON DELETE CASCADE  — a unit owns its skills.
* ``questions.skill_id``                 ON DELETE CASCADE  — a skill owns its questions.
* ``skill_prerequisites.skill_id``       ON DELETE CASCADE  — deleting a skill drops
                                          its own outgoing "requires" edges.
* ``skill_prerequisites.prerequisite_skill_id`` ON DELETE RESTRICT — a skill that
                                          OTHERS depend on cannot be deleted until
                                          those edges are removed first. This forbids
                                          silently unlocking dependent skills and
                                          guarantees no orphaned prerequisite row.
"""
from sqlalchemy import (
    CheckConstraint,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(
        ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    order: Mapped[int] = mapped_column("order", Integer, nullable=False, default=0)
    # Mastery threshold lives here so the admin panel can tune it PER SKILL
    # (e.g. 0.8 = 80% correct over the recent window). The engine MUST read this
    # field — never hard-code the threshold. Stored as a fraction in [0, 1].
    mastery_threshold: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.8
    )

    unit: Mapped["Unit"] = relationship()  # type: ignore[name-defined]  # noqa: F821
    questions: Mapped[list["Question"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan"
    )


class SkillPrerequisite(Base):
    """Directed edge: ``skill_id`` requires ``prerequisite_skill_id``."""

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
        ForeignKey("skills.id", ondelete="RESTRICT"), primary_key=True
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Visual/interactive question definition (counting, drag, number-line, ...).
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    skill: Mapped["Skill"] = relationship(back_populates="questions")
