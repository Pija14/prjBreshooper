"""adiciona repasses (pagamento da loja ao vendedor)

Vendas registradas antes desta versão já creditaram a carteira do vendedor automaticamente;
elas viram repasses PAGOS na forma CREDITO_LOJA, sem alterar o saldo de ninguém.

Revision ID: 0009_repasses
Revises: 0008_movimentacoes
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009_repasses"
down_revision: Union[str, None] = "0008_movimentacoes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "repasses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("venda_id", sa.Integer(), sa.ForeignKey("vendas.id"), nullable=False),
        sa.Column("loja_id", sa.Integer(), sa.ForeignKey("lojas.id"), nullable=False),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="PENDENTE", nullable=False),
        sa.Column("forma_pagamento", sa.String(length=20), nullable=True),
        sa.Column("operador_pagamento_id", sa.Integer(), sa.ForeignKey("operadores.id"), nullable=True),
        sa.Column("pago_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("venda_id", name="uq_repasses_venda"),
    )
    op.create_index("ix_repasses_loja_id", "repasses", ["loja_id"])

    op.execute(
        """
        INSERT INTO repasses (venda_id, loja_id, usuario_id, valor, status, forma_pagamento, operador_pagamento_id, pago_em, criado_em)
        SELECT v.id, v.loja_id, p.usuario_vendedor_id, v.valor_usuario, 'PAGO', 'CREDITO_LOJA', v.operador_venda_id, v.data_hora, v.data_hora
        FROM vendas v
        JOIN produtos p ON p.id = v.produto_id
        """
    )


def downgrade() -> None:
    op.drop_index("ix_repasses_loja_id", table_name="repasses")
    op.drop_table("repasses")
