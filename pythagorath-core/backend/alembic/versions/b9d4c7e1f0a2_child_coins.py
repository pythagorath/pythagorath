"""child coins: students.coins balance + coin_events ledger (+ backfill)

A real, persisted coin balance for the child (not derived at display):
  * students.coins   — cached running total (O(1) reads).
  * coin_events      — append-only ledger (source of truth + audit + future spending).
Awards are idempotent: one 'correct' per answer (unique answer_id), one 'mastery' per
(student, skill) ever (partial unique index where kind='mastery'). Coins are a REWARD
side-effect written only in /api/answers AFTER the gate verdict — the gates are untouched.

Backfill: existing children get the NEW-formula balance (mastered*50 + correct*2) so the
displayed total is continuous (no child loses their shown coins at the switch).

Revision ID: b9d4c7e1f0a2
Revises: f8b3c1a05d27
Create Date: 2026-06-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b9d4c7e1f0a2'
down_revision: Union[str, Sequence[str], None] = 'f8b3c1a05d27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'students',
        sa.Column('coins', sa.Integer(), nullable=False, server_default='0'),
    )
    op.create_table(
        'coin_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('student_id', sa.Integer(),
                  sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', sa.Integer(),
                  sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(length=10), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('answer_id', sa.Integer(),
                  sa.ForeignKey('answers.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("kind in ('correct','mastery')", name='ck_coin_event_kind'),
        sa.CheckConstraint('amount > 0', name='ck_coin_event_amount'),
        sa.UniqueConstraint('answer_id', name='uq_coin_event_answer'),
    )
    op.create_index('ix_coin_events_student_id', 'coin_events', ['student_id'])
    # one 'mastery' award per (student, skill) — partial, so many 'correct' rows are fine
    op.create_index(
        'uq_coin_event_mastery', 'coin_events', ['student_id', 'skill_id'],
        unique=True,
        sqlite_where=sa.text("kind = 'mastery'"),
        postgresql_where=sa.text("kind = 'mastery'"),
    )
    # backfill the cached balance for existing children with the NEW formula
    op.execute(
        "UPDATE students SET coins = "
        "(SELECT COUNT(*) FROM skill_mastery sm "
        " WHERE sm.student_id = students.id AND sm.status = 'mastered') * 50 "
        "+ (SELECT COUNT(*) FROM answers a "
        "   WHERE a.student_id = students.id AND a.is_correct) * 2"
    )


def downgrade() -> None:
    op.drop_index('uq_coin_event_mastery', table_name='coin_events')
    op.drop_index('ix_coin_events_student_id', table_name='coin_events')
    op.drop_table('coin_events')
    op.drop_column('students', 'coins')
