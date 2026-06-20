"""guardian profile: users.name + users.whatsapp (registration page fields)

Both NULLABLE — existing rows and the legacy direct-register path are untouched; the new
OTP registration flow fills them. Pure additive, no data migration.

Revision ID: c7d8e9fa0102
Revises: b6c7d8e9fa01
Create Date: 2026-06-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c7d8e9fa0102'
down_revision: Union[str, Sequence[str], None] = 'b6c7d8e9fa01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('name', sa.String(length=120), nullable=True))
    op.add_column('users', sa.Column('whatsapp', sa.String(length=24), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'whatsapp')
    op.drop_column('users', 'name')
