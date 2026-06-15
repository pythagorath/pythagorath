"""Top of the content hierarchy (blueprint §5.1 / §5.2).

    country → curriculum → grade → subject → unit

One table per entity. Every parent link is a REAL ForeignKey (not a loose
Integer), so the database itself guarantees referential integrity. The lower
levels (skills, questions, ...) are added in later items.

Note: ``name`` is included on every level so the admin panel (§7) can display
and manage the hierarchy; ``order`` (blueprint field) sets sibling ordering.
"""
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)

    curricula: Mapped[list["Curriculum"]] = relationship(
        back_populates="country", cascade="all, delete-orphan"
    )


class Curriculum(Base):
    __tablename__ = "curricula"

    id: Mapped[int] = mapped_column(primary_key=True)
    country_id: Mapped[int] = mapped_column(
        ForeignKey("countries.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    country: Mapped["Country"] = relationship(back_populates="curricula")
    grades: Mapped[list["Grade"]] = relationship(
        back_populates="curriculum", cascade="all, delete-orphan"
    )


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True)
    curriculum_id: Mapped[int] = mapped_column(
        ForeignKey("curricula.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    # Sibling ordering within the curriculum ("order" is a SQL reserved word,
    # so it is quoted explicitly via the column name).
    order: Mapped[int] = mapped_column("order", Integer, nullable=False, default=0)

    curriculum: Mapped["Curriculum"] = relationship(back_populates="grades")
    subjects: Mapped[list["Subject"]] = relationship(
        back_populates="grade", cascade="all, delete-orphan"
    )


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    grade_id: Mapped[int] = mapped_column(
        ForeignKey("grades.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    grade: Mapped["Grade"] = relationship(back_populates="subjects")
    units: Mapped[list["Unit"]] = relationship(
        back_populates="subject", cascade="all, delete-orphan"
    )


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    order: Mapped[int] = mapped_column("order", Integer, nullable=False, default=0)

    subject: Mapped["Subject"] = relationship(back_populates="units")
