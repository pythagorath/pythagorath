"""skill_countries (curriculum paths)

Revision ID: a7c0b1d2e3f4
Revises: 1b2c62655a03
Create Date: 2026-06-09 06:30:00.000000

Curriculum-path layer: which country's curriculum includes each skill. Display/scoping
only — no constitutional logic reads it. A child with NULL country sees the whole
inventory; a child with a country sees only that country's (prerequisite-closed) path.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c0b1d2e3f4'
down_revision: Union[str, Sequence[str], None] = '1b2c62655a03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COUNTRIES = "'SA', 'AE', 'QA', 'KW', 'OM', 'BH'"


def upgrade() -> None:
    op.create_table(
        'skill_countries',
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('country', sa.String(length=2), nullable=False),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('skill_id', 'country'),
        sa.CheckConstraint(f"country in ({_COUNTRIES})", name='ck_skill_country'),
    )


def downgrade() -> None:
    op.drop_table('skill_countries')
