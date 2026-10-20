from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Movement(Base):
    """Lançamento da conta corrente do usuário (ex.: crédito da parte do vendedor numa venda)."""

    __tablename__ = "movimentacoes"
    __table_args__ = (
        UniqueConstraint("venda_id", "tipo", name="uq_movimentacoes_venda_tipo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    loja_id: Mapped[int] = mapped_column(ForeignKey("lojas.id"), nullable=False)
    venda_id: Mapped[int | None] = mapped_column(ForeignKey("vendas.id"), nullable=True)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)  # CREDITO | DEBITO
    origem: Mapped[str] = mapped_column(String(20), nullable=False)  # VENDA
    valor: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    descricao: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="CONCLUIDA")
    data_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
