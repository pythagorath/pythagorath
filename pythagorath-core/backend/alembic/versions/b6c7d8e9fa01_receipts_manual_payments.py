"""subscriptions (step 7 part B): receipts table for manual payments

Manual bank/phone transfers: the guardian uploads an image/PDF proof (data-URL inline),
the owner reviews → approves (grant/extend subscription) or rejects (with reason).
Commercial/config — the engine never reads it.

Revision ID: b6c7d8e9fa01
Revises: a5b6c7d8e9fa
Create Date: 2026-06-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b6c7d8e9fa01'
down_revision: Union[str, Sequence[str], None] = 'a5b6c7d8e9fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'receipts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=True),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=8), nullable=False, server_default='OMR'),
        sa.Column('file', sa.Text(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('note', sa.String(length=500), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("method in ('bank','phone')", name='ck_receipt_method'),
        sa.CheckConstraint("status in ('pending','approved','rejected')", name='ck_receipt_status'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_receipts_user_id'), 'receipts', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_receipts_user_id'), table_name='receipts')
    op.drop_table('receipts')
