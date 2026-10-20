from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    email: EmailStr
    identificador_google: str | None = None
    telefone: str | None = None
    url_avatar: str | None = None



class UserUpdate(BaseModel):
    nome: str | None = Field(default=None, max_length=150)
    telefone: str | None = Field(default=None, max_length=30)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    identificador_google: str | None
    nome: str
    email: EmailStr
    telefone: str | None
    url_avatar: str | None
    status: str
