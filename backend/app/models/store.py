from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Store(Base):
    __tablename__ = "lojas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    documento: Mapped[str | None] = mapped_column(String(30), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="ATIVO", nullable=False)
