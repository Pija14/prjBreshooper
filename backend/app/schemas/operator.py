from pydantic import BaseModel, ConfigDict


class OperatorCreate(BaseModel):
    loja_id: int
    usuario_id: int
    perfil: str = "OPERADOR"


class OperatorUpdate(BaseModel):
    perfil: str | None = None
    status: str | None = None


class OperatorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loja_id: int
    usuario_id: int
    perfil: str
    status: str
