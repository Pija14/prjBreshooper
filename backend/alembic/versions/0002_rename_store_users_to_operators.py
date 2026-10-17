"""rename store_users to operators

Revision ID: 0002_operators
Revises: 0001_initial
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_operators"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("store_users", "operators")


def downgrade() -> None:
    op.rename_table("operators", "store_users")
