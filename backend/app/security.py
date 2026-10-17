"""Autenticação: validação do login com Google e sessão da API (JWT)."""
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.user import User

JWT_ALGORITHM = "HS256"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
# Chaves públicas do Google, com cache para não buscá-las a cada login.
google_jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True, lifespan=3600, timeout=10)
bearer = HTTPBearer(auto_error=False)


def exigir_configuracao_jwt() -> None:
    if len(settings.jwt_secret) < 32:
        raise HTTPException(status_code=503, detail="JWT_SECRET não configurado corretamente no servidor")


def validar_credencial_google(credencial: str) -> dict:
    """Valida o ID token do Google: assinatura, audiência, emissor, validade e e-mail verificado."""
    try:
        chave = google_jwks.get_signing_key_from_jwt(credencial)
        dados = jwt.decode(
            credencial,
            chave.key,
            algorithms=["RS256"],
            audience=settings.google_client_id,
            options={"require": ["iss", "aud", "sub", "exp", "iat"]},
            leeway=30,
        )
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(status_code=503, detail="Não foi possível validar o login com o Google agora. Tente novamente.") from exc
    except (jwt.PyJWTError, jwt.PyJWKClientError) as exc:
        raise HTTPException(status_code=401, detail="Credencial do Google inválida ou expirada") from exc
    if dados.get("iss") not in GOOGLE_ISSUERS:
        raise HTTPException(status_code=401, detail="Emissor da credencial do Google inválido")
    if not dados.get("email") or dados.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="A conta do Google precisa ter um e-mail verificado")
    return dados


def criar_token_acesso(usuario_id: int) -> tuple[str, datetime]:
    exigir_configuracao_jwt()
    agora = datetime.now(timezone.utc)
    expira_em = agora + timedelta(minutes=settings.access_token_minutes)
    token = jwt.encode(
        {"sub": str(usuario_id), "iat": int(agora.timestamp()), "exp": expira_em},
        settings.jwt_secret,
        algorithm=JWT_ALGORITHM,
    )
    return token, expira_em


def usuario_autenticado(
    credenciais: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Dependência: identifica o usuário pelo token de sessão (cabeçalho Authorization: Bearer)."""
    exigir_configuracao_jwt()
    if not credenciais or credenciais.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticação necessária")
    try:
        dados = jwt.decode(credenciais.credentials, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
        usuario_id = int(dados.get("sub", ""))
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada") from exc
    usuario = db.get(User, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    if usuario.status != "ATIVO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
    return usuario
