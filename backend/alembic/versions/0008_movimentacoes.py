"""adiciona movimentações da conta corrente e credita vendas já registradas

Revision ID: 0008_movimentacoes
Revises: 0007_vendas
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008_movimentacoes"
down_revision: Union[str, None] = "0007_vendas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "movimentacoes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("loja_id", sa.Integer(), sa.ForeignKey("lojas.id"), nullable=False),
        sa.Column("venda_id", sa.Integer(), sa.ForeignKey("vendas.id"), nullable=True),
        sa.Column("tipo", sa.String(length=10), nullable=False),
        sa.Column("origem", sa.String(length=20), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("descricao", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="CONCLUIDA", nullable=False),
        sa.Column("data_hora", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("venda_id", "tipo", name="uq_movimentacoes_venda_tipo"),
    )
    op.create_index("ix_movimentacoes_usuario_id", "movimentacoes", ["usuario_id"])

    # Vendas registradas antes da conta corrente: credita a parte do vendedor com a data da venda.
    op.execute(
        """
        INSERT INTO movimentacoes (usuario_id, loja_id, venda_id, tipo, origem, valor, descricao, status, data_hora)
        SELECT p.usuario_vendedor_id, v.loja_id, v.id, 'CREDITO', 'VENDA', v.valor_usuario,
               'Venda de ' || p.nome, 'CONCLUIDA', v.data_hora
        FROM vendas v
        JOIN produtos p ON p.id = v.produto_id
        """
    )


def downgrade() -> None:
    op.drop_index("ix_movimentacoes_usuario_id", table_name="movimentacoes")
    op.drop_table("movimentacoes")
