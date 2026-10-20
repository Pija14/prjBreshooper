from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.operator import Operator
from app.models.store import Store
from app.models.user import User
from app.schemas.auth import AuthResponse, GoogleConfigResponse, GoogleLoginRequest, SessaoResponse, VinculoLojaResponse
from app.security import criar_token_acesso, exigir_configuracao_jwt, usuario_autenticado, validar_credencial_google

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.get("/google/config", response_model=GoogleConfigResponse, summary="Configuração do login com Google", description="Informa se o login com Google está habilitado e o Client ID público usado pelo botão do Google no frontend.")
def configuracao_google():
    return GoogleConfigResponse(habilitado=bool(settings.google_client_id), client_id=settings.google_client_id)


def vincular_operador_automatico(db: Session, usuario: User) -> None:
    """Torna o usuário OPERADOR ativo da loja configurada, se ainda não tiver vínculo com ela.

    Um vínculo já existente não é alterado: um operador desativado continua INATIVO.
    """
    loja_id = settings.loja_operador_automatico
    if not loja_id or not db.get(Store, loja_id):
        return
    vinculo = db.scalar(select(Operator).where(Operator.loja_id == loja_id, Operator.usuario_id == usuario.id))
    if not vinculo:
        db.add(Operator(loja_id=loja_id, usuario_id=usuario.id, perfil="OPERADOR", status="ATIVO"))


@router.post("/google", response_model=AuthResponse, summary="Entrar com Google", description="Recebe o ID token do Google Identity Services, valida-o no servidor e devolve o token de sessão do Breshopper. Se ainda não existir, o usuário é cadastrado com nome, e-mail e foto da conta Google; se já existir um usuário com o mesmo e-mail, a conta Google é vinculada a ele. Com LOJA_OPERADOR_AUTOMATICO configurada (padrão: loja 1), o usuário passa a ser OPERADOR ativo dessa loja, se ainda não tiver vínculo com ela.")
def entrar_com_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    exigir_configuracao_jwt()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Login com Google não está configurado no servidor")
    dados = validar_credencial_google(payload.credencial)
    identificador = str(dados["sub"])
    email = str(dados["email"]).strip().lower()
    nome = (str(dados.get("name") or "").strip() or email.split("@", 1)[0])[:150]
    avatar = dados.get("picture")

    usuario = db.scalar(select(User).where(User.identificador_google == identificador))
    if not usuario:
        usuario = db.scalar(select(User).where(User.email == email))
        if usuario:
            usuario.identificador_google = identificador
        else:
            usuario = User(nome=nome, email=email, identificador_google=identificador, status="ATIVO")
            db.add(usuario)
    if usuario.status != "ATIVO":
        db.rollback()
        raise HTTPException(status_code=403, detail="Usuário inativo")
    if avatar and not usuario.url_avatar:
        usuario.url_avatar = str(avatar)[:500]
    db.flush()
    vincular_operador_automatico(db, usuario)
    db.commit()
    db.refresh(usuario)

    token, expira_em = criar_token_acesso(usuario.id)
    return AuthResponse(token_acesso=token, expira_em=expira_em, usuario=usuario)


@router.get("/sessao", response_model=SessaoResponse, summary="Consultar sessão", description="Retorna o usuário autenticado e as lojas nas quais ele atua como operador ativo. Exige o cabeçalho Authorization: Bearer <token>.")
def consultar_sessao(usuario: User = Depends(usuario_autenticado), db: Session = Depends(get_db)):
    vinculos = db.execute(
        select(Operator, Store)
        .join(Store, Store.id == Operator.loja_id)
        .where(Operator.usuario_id == usuario.id, Operator.status == "ATIVO")
        .order_by(Store.nome)
    ).all()
    lojas = [VinculoLojaResponse(operador_id=op.id, loja_id=loja.id, loja_nome=loja.nome, perfil=op.perfil) for op, loja in vinculos]
    return SessaoResponse(usuario=usuario, lojas=lojas)
