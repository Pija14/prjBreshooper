"""adiciona categorias e marcas e relaciona produtos

Revision ID: 0006_categorias_marcas
Revises: 0005_portugues
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_categorias_marcas"
down_revision: Union[str, None] = "0005_portugues"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categorias",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="ATIVO", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nome", name="uq_categorias_nome"),
    )

    op.create_table(
        "marcas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="ATIVO", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nome", name="uq_marcas_nome"),
    )

    op.add_column("produtos", sa.Column("categoria_id", sa.Integer(), nullable=True))
    op.add_column("produtos", sa.Column("marca_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_produtos_categoria_id", "produtos", "categorias", ["categoria_id"], ["id"])
    op.create_foreign_key("fk_produtos_marca_id", "produtos", "marcas", ["marca_id"], ["id"])

    # A antiga coluna textual categoria não pode permanecer depois da normalização.
    op.drop_column("produtos", "categoria")


def downgrade() -> None:
    op.add_column("produtos", sa.Column("categoria", sa.String(length=100), nullable=True))
    op.drop_constraint("fk_produtos_marca_id", "produtos", type_="foreignkey")
    op.drop_constraint("fk_produtos_categoria_id", "produtos", type_="foreignkey")
    op.drop_column("produtos", "marca_id")
    op.drop_column("produtos", "categoria_id")
    op.drop_table("marcas")
    op.drop_table("categorias")
