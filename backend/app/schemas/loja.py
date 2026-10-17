from pydantic import BaseModel, ConfigDict, Field


class LojaCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    documento: str | None = None


class LojaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    documento: str | None
    status: str
