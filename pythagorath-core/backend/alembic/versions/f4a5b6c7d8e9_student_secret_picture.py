"""accounts (step 6 part C): add students.secret_picture

The child's "secret picture" login token (emoji key, chosen on first login). Nullable;
auth/UI layer — the engine never reads it.

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-06-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f4a5b6c7d8e9'
down_revision: Union[str, Sequence[str], None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students', sa.Column('secret_picture', sa.String(length=24), nullable=True))


def downgrade() -> None:
    op.drop_column('students', 'secret_picture')
