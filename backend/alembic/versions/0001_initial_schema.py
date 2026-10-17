"""initial breshopper schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("document", sa.String(length=30), nullable=True, unique=True),
        sa.Column("status", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("google_sub", sa.String(length=255), nullable=True, unique=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "store_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False, server_default="OPERATOR"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
    )


def downgrade() -> None:
    op.drop_table("store_users")
    op.drop_table("users")
    op.drop_table("stores")
