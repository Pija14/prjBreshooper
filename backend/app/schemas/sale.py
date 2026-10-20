from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class SaleCreate(BaseModel):
    produto_id: int
    usuario_comprador_id: int


class SaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    produto_id: int
    loja_id: int
    usuario_comprador_id: int
    operador_venda_id: int
    valor_venda: Decimal
    valor_usuario: Decimal
    valor_loja: Decimal
    status: str
    referencia: str
    data_hora: datetime
