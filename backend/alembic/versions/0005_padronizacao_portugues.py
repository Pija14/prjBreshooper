"""padroniza tabelas, colunas e status do dominio em portugues

Revision ID: 0005_portugues
Revises: 0004_evaluations
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_portugues"
down_revision: Union[str, None] = "0004_evaluations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabelas
    op.rename_table("users", "usuarios")
    op.rename_table("stores", "lojas")
    op.rename_table("operators", "operadores")
    op.rename_table("products", "produtos")
    op.rename_table("evaluations", "avaliacoes")

    # Usuarios
    op.alter_column("usuarios", "google_sub", new_column_name="identificador_google")
    op.alter_column("usuarios", "name", new_column_name="nome")
    op.alter_column("usuarios", "phone", new_column_name="telefone")
    op.alter_column("usuarios", "avatar_url", new_column_name="url_avatar")
    op.alter_column(
        "usuarios",
        "status",
        type_=sa.String(length=20),
        postgresql_using="CASE WHEN status THEN 'ATIVO' ELSE 'INATIVO' END",
        server_default="ATIVO",
    )

    # Lojas
    op.alter_column("lojas", "name", new_column_name="nome")
    op.alter_column("lojas", "document", new_column_name="documento")
    op.alter_column(
        "lojas",
        "status",
        type_=sa.String(length=20),
        postgresql_using="CASE WHEN status THEN 'ATIVO' ELSE 'INATIVO' END",
        server_default="ATIVO",
    )

    # Operadores
    op.alter_column("operadores", "store_id", new_column_name="loja_id")
    op.alter_column("operadores", "user_id", new_column_name="usuario_id")
    op.alter_column("operadores", "role", new_column_name="perfil")
    # O campo status dos operadores ja e textual desde a migration 0001.
    # Nao executar rename de status -> status, pois isso gera DuplicateColumn no PostgreSQL.
    op.execute(
        "UPDATE operadores SET perfil = CASE WHEN perfil = 'ADMIN' THEN 'ADMINISTRADOR' ELSE 'OPERADOR' END"
    )
    op.execute(
        "UPDATE operadores SET status = CASE WHEN status = 'ACTIVE' THEN 'ATIVO' ELSE 'INATIVO' END"
    )

    # Produtos
    op.alter_column("produtos", "store_id", new_column_name="loja_id")
    op.alter_column("produtos", "seller_user_id", new_column_name="usuario_vendedor_id")
    op.alter_column("produtos", "created_by_operator_id", new_column_name="operador_cadastro_id")
    op.alter_column("produtos", "name", new_column_name="nome")
    op.alter_column("produtos", "description", new_column_name="descricao")
    op.alter_column("produtos", "category", new_column_name="categoria")
    op.alter_column("produtos", "condition", new_column_name="estado_conservacao")
    op.alter_column("produtos", "sale_price", new_column_name="valor_venda")
    op.execute(
        "UPDATE produtos SET status = CASE status WHEN 'RECEIVED' THEN 'RECEBIDO' WHEN 'AVAILABLE' THEN 'DISPONIVEL' WHEN 'SOLD' THEN 'VENDIDO' WHEN 'CANCELLED' THEN 'CANCELADO' ELSE status END"
    )

    # Avaliacoes
    op.alter_column("avaliacoes", "product_id", new_column_name="produto_id")
    op.alter_column("avaliacoes", "evaluated_by_operator_id", new_column_name="avaliado_por_operador_id")
    op.alter_column("avaliacoes", "sale_price", new_column_name="valor_venda")
    op.alter_column("avaliacoes", "seller_amount", new_column_name="valor_usuario")
    op.alter_column("avaliacoes", "store_amount", new_column_name="valor_loja")
    op.execute(
        "UPDATE avaliacoes SET status = CASE status WHEN 'APPROVED' THEN 'APROVADA' ELSE status END"
    )


def downgrade() -> None:
    op.alter_column("avaliacoes", "produto_id", new_column_name="product_id")
    op.alter_column("avaliacoes", "avaliado_por_operador_id", new_column_name="evaluated_by_operator_id")
    op.alter_column("avaliacoes", "valor_venda", new_column_name="sale_price")
    op.alter_column("avaliacoes", "valor_usuario", new_column_name="seller_amount")
    op.alter_column("avaliacoes", "valor_loja", new_column_name="store_amount")

    op.alter_column("produtos", "loja_id", new_column_name="store_id")
    op.alter_column("produtos", "usuario_vendedor_id", new_column_name="seller_user_id")
    op.alter_column("produtos", "operador_cadastro_id", new_column_name="created_by_operator_id")
    op.alter_column("produtos", "nome", new_column_name="name")
    op.alter_column("produtos", "descricao", new_column_name="description")
    op.alter_column("produtos", "categoria", new_column_name="category")
    op.alter_column("produtos", "estado_conservacao", new_column_name="condition")
    op.alter_column("produtos", "valor_venda", new_column_name="sale_price")

    op.alter_column("operadores", "loja_id", new_column_name="store_id")
    op.alter_column("operadores", "usuario_id", new_column_name="user_id")
    op.alter_column("operadores", "perfil", new_column_name="role")
    op.execute(
        "UPDATE operadores SET role = CASE WHEN role = 'ADMINISTRADOR' THEN 'ADMIN' ELSE 'OPERATOR' END"
    )
    op.execute(
        "UPDATE operadores SET status = CASE WHEN status = 'ATIVO' THEN 'ACTIVE' ELSE 'INACTIVE' END"
    )

    op.alter_column("lojas", "nome", new_column_name="name")
    op.alter_column("lojas", "documento", new_column_name="document")
    op.alter_column(
        "lojas",
        "status",
        type_=sa.Boolean(),
        postgresql_using="CASE WHEN status = 'ATIVO' THEN true ELSE false END",
        server_default=sa.true(),
    )

    op.alter_column("usuarios", "identificador_google", new_column_name="google_sub")
    op.alter_column("usuarios", "nome", new_column_name="name")
    op.alter_column("usuarios", "telefone", new_column_name="phone")
    op.alter_column("usuarios", "url_avatar", new_column_name="avatar_url")
    op.alter_column(
        "usuarios",
        "status",
        type_=sa.Boolean(),
        postgresql_using="CASE WHEN status = 'ATIVO' THEN true ELSE false END",
        server_default=sa.true(),
    )

    op.rename_table("avaliacoes", "evaluations")
    op.rename_table("produtos", "products")
    op.rename_table("operadores", "operators")
    op.rename_table("lojas", "stores")
    op.rename_table("usuarios", "users")
