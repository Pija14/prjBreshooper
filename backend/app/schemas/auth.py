from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class GoogleConfigResponse(BaseModel):
    habilitado: bool
    client_id: str


class GoogleLoginRequest(BaseModel):
    credencial: str = Field(min_length=20, max_length=4096, description="ID token (JWT) retornado pelo Google Identity Services.")


class AuthResponse(BaseModel):
    token_acesso: str
    tipo_token: str = "bearer"
    expira_em: datetime
    usuario: UserResponse


class VinculoLojaResponse(BaseModel):
    operador_id: int
    loja_id: int
    loja_nome: str
    perfil: str


class SessaoResponse(BaseModel):
    usuario: UserResponse
    lojas: list[VinculoLojaResponse]
