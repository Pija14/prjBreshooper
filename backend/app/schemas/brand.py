from pydantic import BaseModel, ConfigDict, Field


class BrandCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=100)


class BrandResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    status: str
