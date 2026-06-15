"""Accounts and child profiles (blueprint §5.3).

    user (parent account) → student (child profile)

One parent account can hold multiple child profiles. Every link is a real
ForeignKey:

* ``students.user_id``    ON DELETE CASCADE  — removing a parent removes their kids.
* ``students.grade_id``   ON DELETE RESTRICT — cannot delete a grade still in use.
* ``students.country_id`` ON DELETE RESTRICT — cannot delete a country still in use.
"""
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    students: Mapped[list["Student"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    grade_id: Mapped[int] = mapped_column(
        ForeignKey("grades.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    country_id: Mapped[int] = mapped_column(
        ForeignKey("countries.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    user: Mapped["User"] = relationship(back_populates="students")
