from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EvaluationCreate(BaseModel):
    product_id: int
    sale_price: Decimal = Field(gt=0, decimal_places=2)
    seller_amount: Decimal = Field(ge=0, decimal_places=2)
    store_amount: Decimal = Field(ge=0, decimal_places=2)

    @model_validator(mode="after")
    def validate_split(self):
        if self.seller_amount + self.store_amount != self.sale_price:
            raise ValueError("A participação do usuário e da loja deve totalizar o valor da venda")
        return self


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    evaluated_by_operator_id: int
    sale_price: Decimal
    seller_amount: Decimal
    store_amount: Decimal
    status: str
