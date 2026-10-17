from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    descricao: str | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    descricao: str | None
    status: str
