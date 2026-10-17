from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Operator(Base):
    __tablename__ = "operadores"

    id: Mapped[int] = mapped_column(primary_key=True)
    loja_id: Mapped[int] = mapped_column(ForeignKey("lojas.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    perfil: Mapped[str] = mapped_column(String(30), nullable=False, default="OPERADOR")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ATIVO")
