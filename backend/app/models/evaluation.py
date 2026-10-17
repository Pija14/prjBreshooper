from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Evaluation(Base):
    __tablename__ = "avaliacoes"
    __table_args__ = (
        UniqueConstraint("produto_id", name="uq_avaliacoes_produto"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    produto_id: Mapped[int] = mapped_column(ForeignKey("produtos.id"), nullable=False)
    avaliado_por_operador_id: Mapped[int] = mapped_column(
        ForeignKey("operadores.id"), nullable=False
    )
    valor_venda: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    valor_usuario: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    valor_loja: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="APROVADA")
