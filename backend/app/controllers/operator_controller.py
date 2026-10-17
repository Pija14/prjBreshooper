from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.store import Store
from app.models.operator import Operator
from app.models.user import User
from app.schemas.operator import OperatorCreate, OperatorResponse

router = APIRouter(prefix="/api/operators", tags=["Operators"])


VALID_ROLES = {"ADMIN", "OPERATOR"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[OperatorResponse])
def list_operators(store_id: int | None = None, db: Session = Depends(get_db)):
    query = select(Operator).order_by(Operator.id)
    if store_id is not None:
        query = query.where(Operator.store_id == store_id)
    return db.scalars(query).all()


@router.post("", response_model=OperatorResponse, status_code=status.HTTP_201_CREATED)
def create_operator(payload: OperatorCreate, db: Session = Depends(get_db)):
    role = payload.role.strip().upper()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Perfil deve ser ADMIN ou OPERATOR")

    if not db.get(Store, payload.store_id):
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    if not db.get(User, payload.user_id):
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    existing = db.scalar(
        select(Operator).where(
            Operator.store_id == payload.store_id,
            Operator.user_id == payload.user_id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Usuário já está cadastrado como operador desta loja")

    operator = Operator(
        store_id=payload.store_id,
        user_id=payload.user_id,
        role=role,
        status="ACTIVE",
    )
    db.add(operator)

    try:
        db.commit()
        db.refresh(operator)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar o operador")

    return operator
