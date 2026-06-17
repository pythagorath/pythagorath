"""platform control: widen app_settings.value to Text + announcements table

Settings layer (integrations / brand identity / whatsapp) reuse the app_settings key→value
store; `value` is widened to Text so it can hold a logo data-URL. Announcements get their
own table. Presentation/config only — the engine/gates never read these.

Revision ID: c1f2a3b4d5e6
Revises: b9d4c7e1f0a2
Create Date: 2026-06-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c1f2a3b4d5e6'
down_revision: Union[str, Sequence[str], None] = 'b9d4c7e1f0a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('app_settings') as b:
        b.alter_column('value', existing_type=sa.String(length=120), type_=sa.Text(),
                       existing_nullable=False)
    op.create_table(
        'announcements',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=160), nullable=False),
        sa.Column('body', sa.String(length=600), nullable=False),
        sa.Column('code', sa.String(length=60), nullable=True),
        sa.Column('link', sa.String(length=400), nullable=True),
        sa.Column('format', sa.String(length=10), nullable=False, server_default='popup'),
        sa.Column('target_type', sa.String(length=16), nullable=False, server_default='all'),
        sa.Column('target_value', sa.String(length=60), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("format in ('popup','banner')", name='ck_ann_format'),
        sa.CheckConstraint("target_type in ('all','unsubscribed','grade','country')",
                           name='ck_ann_target'),
    )


def downgrade() -> None:
    op.drop_table('announcements')
    with op.batch_alter_table('app_settings') as b:
        b.alter_column('value', existing_type=sa.Text(), type_=sa.String(length=120),
                       existing_nullable=False)
