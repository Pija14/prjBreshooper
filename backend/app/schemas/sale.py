from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict


def _em_utc(valor: datetime) -> datetime:
    # SQLite devolve datas sem fuso (gravadas em UTC); o navegador precisa do fuso para converter.
    return valor.replace(tzinfo=timezone.utc) if valor.tzinfo is None else valor


DataHoraUTC = Annotated[datetime, AfterValidator(_em_utc)]


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
    data_hora: DataHoraUTC
