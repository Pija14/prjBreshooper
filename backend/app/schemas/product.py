from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    store_id: int
    seller_user_id: int
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    condition: str | None = Field(default=None, max_length=50)


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    seller_user_id: int
    created_by_operator_id: int
    name: str
    description: str | None
    category: str | None
    condition: str | None
    status: str
    sale_price: Decimal | None
