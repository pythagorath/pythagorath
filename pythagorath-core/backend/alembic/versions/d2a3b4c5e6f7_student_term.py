"""semester dimension (1/2): students.term

The child's current semester. NULLABLE — existing children stay NULL (no semester filter →
they see their whole grade, exactly today's behaviour). The guardian sets it later (phase ج).
No DB CHECK (validated in the app layer). Purely additive, no data migration.

Revision ID: d2a3b4c5e6f7
Revises: d1a2b3c4e5f6
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd2a3b4c5e6f7'
down_revision: Union[str, Sequence[str], None] = 'd1a2b3c4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students', sa.Column('term', sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('students') as batch_op:
        batch_op.drop_column('term')
