"""adiciona vendas

Revision ID: 0007_vendas
Revises: 0006_categorias_marcas
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007_vendas"
down_revision: Union[str, None] = "0006_categorias_marcas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vendas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("produto_id", sa.Integer(), sa.ForeignKey("produtos.id"), nullable=False),
        sa.Column("loja_id", sa.Integer(), sa.ForeignKey("lojas.id"), nullable=False),
        sa.Column("usuario_comprador_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("operador_venda_id", sa.Integer(), sa.ForeignKey("operadores.id"), nullable=False),
        sa.Column("valor_venda", sa.Numeric(12, 2), nullable=False),
        sa.Column("valor_usuario", sa.Numeric(12, 2), nullable=False),
        sa.Column("valor_loja", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="CONCLUIDA", nullable=False),
        sa.Column("referencia", sa.String(length=20), nullable=False),
        sa.Column("data_hora", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("produto_id", name="uq_vendas_produto"),
        sa.UniqueConstraint("referencia", name="uq_vendas_referencia"),
    )


def downgrade() -> None:
    op.drop_table("vendas")
