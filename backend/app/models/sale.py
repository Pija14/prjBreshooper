from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Sale(Base):
    __tablename__ = "vendas"
    __table_args__ = (
        UniqueConstraint("produto_id", name="uq_vendas_produto"),
        UniqueConstraint("referencia", name="uq_vendas_referencia"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    produto_id: Mapped[int] = mapped_column(ForeignKey("produtos.id"), nullable=False)
    loja_id: Mapped[int] = mapped_column(ForeignKey("lojas.id"), nullable=False)
    usuario_comprador_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    operador_venda_id: Mapped[int] = mapped_column(ForeignKey("operadores.id"), nullable=False)
    # Valores copiados da avaliação no momento da venda (base para o crédito do vendedor).
    valor_venda: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    valor_usuario: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    valor_loja: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="CONCLUIDA")
    referencia: Mapped[str] = mapped_column(String(20), nullable=False)
    data_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
