"""semester dimension (1/2): skill_countries.term

Per-country semester of a path node (1=الفصل الأول, 2=الفصل الثاني). NULLABLE — every
existing row stays NULL (unclassified → visible in both semesters), so no child's view
changes. No DB CHECK (term∈{1,2} is validated in the app layer) to keep this purely
additive. Phase أ (structure only); values are filled in a later phase.

Revision ID: d1a2b3c4e5f6
Revises: c7d8e9fa0102
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd1a2b3c4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c7d8e9fa0102'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('skill_countries', sa.Column('term', sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    # batch mode → SQLite-safe table rebuild that preserves the composite PK, the FK, and
    # the named country CHECK constraint while dropping the column.
    with op.batch_alter_table('skill_countries') as batch_op:
        batch_op.drop_column('term')
