"""accounts (step 6 part B): pairing_codes table

A one-time, short-lived code that links a child's device to a guardian (issues a DEVICE
cookie on redemption). 4-digit, single-use, ~10 min expiry. Auth/config layer — the
engine never reads it.

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-06-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, Sequence[str], None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'pairing_codes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(length=8), nullable=False),
        sa.Column('guardian_user_id', sa.Integer(),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_pairing_codes_code', 'pairing_codes', ['code'])
    op.create_index('ix_pairing_codes_guardian_user_id', 'pairing_codes', ['guardian_user_id'])


def downgrade() -> None:
    op.drop_index('ix_pairing_codes_guardian_user_id', table_name='pairing_codes')
    op.drop_index('ix_pairing_codes_code', table_name='pairing_codes')
    op.drop_table('pairing_codes')
