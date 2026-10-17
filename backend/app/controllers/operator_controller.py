from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.store import Store
from app.models.operator import Operator
from app.models.user import User
from app.schemas.operator import OperatorCreate, OperatorResponse, OperatorUpdate

router = APIRouter(prefix="/api/operadores", tags=["Operadores"])

VALID_PERFIS = {"ADMINISTRADOR", "OPERADOR"}
VALID_STATUS = {"ATIVO", "INATIVO"}


@router.get("", response_model=list[OperatorResponse], summary="Listar operadores", description="Retorna os usuários vinculados a lojas como operadores do Beeshopper.")
def list_operators(loja_id: int | None = None, db: Session = Depends(get_db)):
    query = select(Operator).order_by(Operator.id)
    if loja_id is not None:
        query = query.where(Operator.loja_id == loja_id)
    return db.scalars(query).all()


@router.post("", response_model=OperatorResponse, status_code=status.HTTP_201_CREATED, summary="Vincular operador à loja", description="Vincula um usuário a uma loja para que ele possa atuar em nome dela. O operador é quem executa operações da loja, como o cadastro de produtos.")
def create_operator(payload: OperatorCreate, db: Session = Depends(get_db)):
    perfil = payload.perfil.strip().upper()
    if perfil not in VALID_PERFIS:
        raise HTTPException(status_code=400, detail="Perfil deve ser ADMINISTRADOR ou OPERADOR")

    if not db.get(Store, payload.loja_id):
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    if not db.get(User, payload.usuario_id):
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    existing = db.scalar(
        select(Operator).where(
            Operator.loja_id == payload.loja_id,
            Operator.usuario_id == payload.usuario_id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Usuário já está cadastrado como operador desta loja")

    operador = Operator(
        loja_id=payload.loja_id,
        usuario_id=payload.usuario_id,
        perfil=perfil,
        status="ATIVO",
    )
    db.add(operador)

    try:
        db.commit()
        db.refresh(operador)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar o operador")

    return operador


@router.patch("/{operador_id}", response_model=OperatorResponse, summary="Alterar operador", description="Altera o perfil (ADMINISTRADOR ou OPERADOR) e/ou o status (ATIVO ou INATIVO) de um operador. Um operador INATIVO deixa de poder cadastrar e avaliar produtos da loja. Informe apenas os campos que deseja alterar.")
def update_operator(operador_id: int, payload: OperatorUpdate, db: Session = Depends(get_db)):
    operador = db.get(Operator, operador_id)
    if not operador:
        raise HTTPException(status_code=404, detail="Operador não encontrado")

    if payload.perfil is not None:
        perfil = payload.perfil.strip().upper()
        if perfil not in VALID_PERFIS:
            raise HTTPException(status_code=400, detail="Perfil deve ser ADMINISTRADOR ou OPERADOR")
        operador.perfil = perfil

    if payload.status is not None:
        novo_status = payload.status.strip().upper()
        if novo_status not in VALID_STATUS:
            raise HTTPException(status_code=400, detail="Status deve ser ATIVO ou INATIVO")
        operador.status = novo_status

    db.commit()
    db.refresh(operador)
    return operador
