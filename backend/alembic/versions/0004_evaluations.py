"""add evaluations

Revision ID: 0004_evaluations
Revises: 0003_products
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_evaluations"
down_revision: Union[str, None] = "0003_products"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "evaluations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("evaluated_by_operator_id", sa.Integer(), sa.ForeignKey("operators.id"), nullable=False),
        sa.Column("sale_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("seller_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("store_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="APPROVED"),
        sa.UniqueConstraint("product_id", name="uq_evaluations_product"),
    )


def downgrade() -> None:
    op.drop_table("evaluations")
