from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint("product_id", name="uq_evaluations_product"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    evaluated_by_operator_id: Mapped[int] = mapped_column(
        ForeignKey("operators.id"), nullable=False
    )
    sale_price: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    seller_amount: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    store_amount: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="APROVADA")
