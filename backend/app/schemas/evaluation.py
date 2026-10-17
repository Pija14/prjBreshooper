from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EvaluationCreate(BaseModel):
    produto_id: int
    valor_venda: Decimal = Field(gt=0, decimal_places=2)
    valor_usuario: Decimal = Field(ge=0, decimal_places=2)
    valor_loja: Decimal = Field(ge=0, decimal_places=2)

    @model_validator(mode="after")
    def validate_split(self):
        if self.valor_usuario + self.valor_loja != self.valor_venda:
            raise ValueError("A participação do usuário e da loja deve totalizar o valor da venda")
        return self


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    produto_id: int
    avaliado_por_operador_id: int
    valor_venda: Decimal
    valor_usuario: Decimal
    valor_loja: Decimal
    status: str
