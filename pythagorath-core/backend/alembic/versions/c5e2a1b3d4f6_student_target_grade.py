"""student.grade_id — the child's TARGET (school) grade

Revision ID: c5e2a1b3d4f6
Revises: a7c0b1d2e3f4
Create Date: 2026-06-10

Adds the second curriculum-path dimension to the child: `students.grade_id` is the
child's TARGET school grade (manual, mandatory at the API). The path a child sees is
the INTERSECTION of their target grade (skill→unit.grade_id) and their country
(skill_countries). Column is nullable at the DB level only to permit a safe backfill;
the API never creates a child without a grade. NOTE: target grade — NOT a final/locked
level. The diagnostic may later descend BELOW it (option ج) once lower grades and
cross-grade edges exist; nothing here precludes that.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c5e2a1b3d4f6'
down_revision: Union[str, Sequence[str], None] = 'a7c0b1d2e3f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('grade_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_students_grade_id'), ['grade_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_students_grade_id_grades', 'grades', ['grade_id'], ['id'], ondelete='RESTRICT')
    # Backfill existing children to the only seeded grade (الصف الثاني) so no child is
    # left without a target grade after this migration.
    op.execute(
        "UPDATE students SET grade_id = (SELECT id FROM grades ORDER BY id LIMIT 1) "
        "WHERE grade_id IS NULL"
    )


def downgrade() -> None:
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_constraint('fk_students_grade_id_grades', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_students_grade_id'))
        batch_op.drop_column('grade_id')
