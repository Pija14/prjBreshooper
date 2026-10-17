from sqlalchemy import ForeignKey, String, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Product(Base):
    __tablename__ = "produtos"

    id: Mapped[int] = mapped_column(primary_key=True)
    loja_id: Mapped[int] = mapped_column(ForeignKey("lojas.id"), nullable=False)
    usuario_vendedor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    operador_cadastro_id: Mapped[int] = mapped_column(ForeignKey("operadores.id"), nullable=False)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text)
    categoria: Mapped[str | None] = mapped_column(String(100))
    estado_conservacao: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="RECEBIDO")
    valor_venda: Mapped[object | None] = mapped_column(Numeric(12, 2), nullable=True)
