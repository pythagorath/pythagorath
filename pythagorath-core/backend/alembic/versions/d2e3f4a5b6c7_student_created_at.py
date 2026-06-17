"""accounts (step 6): add students.created_at

When each child profile was created — for "when did each child join" + platform-growth.
Display/analytics only; the engine never reads it. Existing rows backfill to now.

Revision ID: d2e3f4a5b6c7
Revises: c1f2a3b4d5e6
Create Date: 2026-06-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, Sequence[str], None] = 'c1f2a3b4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # batch_alter_table recreates the table on SQLite — needed because SQLite forbids
    # ADD COLUMN with a non-constant default (CURRENT_TIMESTAMP). Existing rows backfill
    # to the copy time. On Postgres this is a normal ADD COLUMN.
    with op.batch_alter_table('students') as b:
        b.add_column(sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                               server_default=sa.text('CURRENT_TIMESTAMP')))


def downgrade() -> None:
    with op.batch_alter_table('students') as b:
        b.drop_column('created_at')
