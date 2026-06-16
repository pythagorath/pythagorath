"""adaptive diagnostic: allow skill_mastery.status = 'placed'

Adds the 'placed' value to the skill_mastery status CHECK constraint. 'placed' is the
adaptive diagnostic's start-point marker on a foundation node — it OPENS the lock (the
child begins at the diagnosed frontier) but is NOT understanding/mastery (no free إتقان,
never in SATISFYING_STATUSES). The 3-tier learning ladder is unchanged.

Cross-dialect: SQLite can't ALTER a CHECK, so we recreate via batch (move-and-copy);
Postgres drops and re-adds the named constraint directly.

Revision ID: e7a2c9d04b15
Revises: d6f1a2b3c4e5
Create Date: 2026-06-16
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'e7a2c9d04b15'
down_revision: Union[str, Sequence[str], None] = 'd6f1a2b3c4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NAME = "ck_skill_mastery_status"
_OLD = "status in ('in_progress', 'understood', 'mastered')"
_NEW = "status in ('in_progress', 'understood', 'mastered', 'placed')"


def _swap(old: str, new: str) -> None:
    with op.batch_alter_table("skill_mastery", schema=None) as batch:
        batch.drop_constraint(_NAME, type_="check")
        batch.create_check_constraint(_NAME, new)


def upgrade() -> None:
    _swap(_OLD, _NEW)


def downgrade() -> None:
    _swap(_NEW, _OLD)
