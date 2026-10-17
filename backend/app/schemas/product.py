from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    loja_id: int
    usuario_vendedor_id: int
    categoria_id: int | None = None
    marca_id: int | None = None
    nome: str = Field(min_length=1, max_length=150)
    descricao: str | None = None
    estado_conservacao: str | None = Field(default=None, max_length=50)


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loja_id: int
    usuario_vendedor_id: int
    operador_cadastro_id: int
    categoria_id: int | None
    marca_id: int | None
    nome: str
    descricao: str | None
    estado_conservacao: str | None
    status: str
    valor_venda: Decimal | None
