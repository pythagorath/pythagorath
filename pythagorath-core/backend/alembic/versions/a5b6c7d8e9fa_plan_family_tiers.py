"""subscriptions (step 7 part A): plans.max_children + plans.period (family tiers)

Family-tiered pricing managed from the admin panel: how many children a plan covers and
its billing period (monthly/yearly). Commercial/config — the engine never reads these.

Revision ID: a5b6c7d8e9fa
Revises: f4a5b6c7d8e9
Create Date: 2026-06-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a5b6c7d8e9fa'
down_revision: Union[str, Sequence[str], None] = 'f4a5b6c7d8e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('plans', sa.Column('max_children', sa.Integer(), nullable=False,
                                     server_default='1'))
    op.add_column('plans', sa.Column('period', sa.String(length=10), nullable=False,
                                     server_default='monthly'))


def downgrade() -> None:
    op.drop_column('plans', 'period')
    op.drop_column('plans', 'max_children')
