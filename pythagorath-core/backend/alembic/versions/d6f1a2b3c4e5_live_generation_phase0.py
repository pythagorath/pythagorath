"""live-generation phase 0: questions.generator param space + question_instances

The GENERATION layer (owner-ratified plan): a nullable JSON param space on the
question template (admin-tunable via PATCH), and the one-child instance table the
server grades against. The learning layer's tables are untouched.

Revision ID: d6f1a2b3c4e5
Revises: c5e2a1b3d4f6
Create Date: 2026-06-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd6f1a2b3c4e5'
down_revision: Union[str, Sequence[str], None] = 'c5e2a1b3d4f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('questions', sa.Column('generator', sa.JSON(), nullable=True))
    op.create_table(
        'question_instances',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('question_id', sa.Integer(),
                  sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(),
                  sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('family', sa.String(length=40), nullable=True),
        sa.Column('prompt', sa.String(length=500), nullable=False),
        sa.Column('answer', sa.String(length=40), nullable=False),
        sa.Column('visual', sa.JSON(), nullable=True),
        sa.Column('answered', sa.Boolean(), nullable=False,
                  server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_question_instances_question_id', 'question_instances', ['question_id'])
    op.create_index('ix_question_instances_student_id', 'question_instances', ['student_id'])


def downgrade() -> None:
    op.drop_index('ix_question_instances_student_id', table_name='question_instances')
    op.drop_index('ix_question_instances_question_id', table_name='question_instances')
    op.drop_table('question_instances')
    op.drop_column('questions', 'generator')
