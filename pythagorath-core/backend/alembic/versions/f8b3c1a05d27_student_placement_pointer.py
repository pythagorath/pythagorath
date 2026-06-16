"""learning loop: add students.placement_skill_id (the diagnosed start pointer)

A nullable FK to skills: the adaptive diagnostic's start point. NULL → never diagnosed
(the session entry routes the child to the diagnostic first). It records WHERE to begin
and serves as the 'diagnosed' flag; it grants no mastery (the foundation is opened by the
`placed` markers, not this pointer).

Revision ID: f8b3c1a05d27
Revises: e7a2c9d04b15
Create Date: 2026-06-16
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f8b3c1a05d27'
down_revision: Union[str, Sequence[str], None] = 'e7a2c9d04b15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("students", schema=None) as batch:
        batch.add_column(sa.Column("placement_skill_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_students_placement_skill", "skills", ["placement_skill_id"], ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("students", schema=None) as batch:
        batch.drop_constraint("fk_students_placement_skill", type_="foreignkey")
        batch.drop_column("placement_skill_id")
