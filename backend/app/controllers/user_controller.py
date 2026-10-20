from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.operator import Operator
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.security import usuario_autenticado

router = APIRouter(prefix="/api/usuarios", tags=["Usuários"])



@router.get("", response_model=list[UserResponse], summary="Listar usuários", description="Retorna todos os usuários cadastrados no Beeshopper.")
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.get("/{usuario_id}", response_model=UserResponse, summary="Consultar usuário", description="Retorna os dados de um usuário específico pelo identificador.")
def get_user(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.get(User, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar usuário", description="Cadastra uma pessoa no Beeshopper. O usuário pode atuar como comprador e/ou vendedor; esses papéis surgem conforme as operações realizadas.")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    nome = payload.nome.strip()
    email = str(payload.email).strip().lower()

    if not nome:
        raise HTTPException(status_code=400, detail="Nome é obrigatório")

    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Já existe um usuário com este e-mail")

    if payload.identificador_google and db.scalar(select(User).where(User.identificador_google == payload.identificador_google)):
        raise HTTPException(status_code=409, detail="Este usuário Google já está cadastrado")

    usuario = User(
        nome=nome,
        email=email,
        identificador_google=payload.identificador_google,
        telefone=payload.telefone,
        url_avatar=payload.url_avatar,
        status="ATIVO",
    )
    db.add(usuario)

    try:
        db.commit()
        db.refresh(usuario)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar o usuário")

    return usuario


@router.patch("/{usuario_id}", response_model=UserResponse, summary="Alterar cliente", description="Altera o nome e/ou o telefone de um usuário. O e-mail não muda, pois identifica a conta Google. Somente operadores ativos de alguma loja (ou o próprio usuário). Exige Authorization: Bearer <token>.")
def update_user(
    usuario_id: int,
    payload: UserUpdate,
    autenticado: User = Depends(usuario_autenticado),
    db: Session = Depends(get_db),
):
    usuario = db.get(User, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    e_operador = db.scalar(select(Operator.id).where(Operator.usuario_id == autenticado.id, Operator.status == "ATIVO"))
    if autenticado.id != usuario.id and not e_operador:
        raise HTTPException(status_code=403, detail="Somente operadores de loja podem alterar clientes")

    if payload.nome is not None:
        nome = payload.nome.strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome é obrigatório")
        usuario.nome = nome
    if payload.telefone is not None:
        usuario.telefone = payload.telefone.strip() or None

    db.commit()
    db.refresh(usuario)
    return usuario
