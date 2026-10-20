from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Payout(Base):
    """Repasse: valor que a loja deve ao vendedor por uma venda (despesa da loja).

    Nasce PENDENTE na venda e vira PAGO quando a loja paga por PIX, CARTAO ou CREDITO_LOJA.
    Só CREDITO_LOJA gera crédito na conta corrente (carteira) do vendedor.
    """

    __tablename__ = "repasses"
    __table_args__ = (
        UniqueConstraint("venda_id", name="uq_repasses_venda"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    venda_id: Mapped[int] = mapped_column(ForeignKey("vendas.id"), nullable=False)
    loja_id: Mapped[int] = mapped_column(ForeignKey("lojas.id"), nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    valor: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDENTE")  # PENDENTE | PAGO
    forma_pagamento: Mapped[str | None] = mapped_column(String(20), nullable=True)  # PIX | CARTAO | CREDITO_LOJA
    operador_pagamento_id: Mapped[int | None] = mapped_column(ForeignKey("operadores.id"), nullable=True)
    pago_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
