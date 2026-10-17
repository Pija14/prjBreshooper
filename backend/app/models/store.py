from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Store(Base):
    __tablename__ = "stores"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    document: Mapped[str | None] = mapped_column(String(30), unique=True)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
