from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.store import Store
from app.models.store_user import StoreUser
from app.models.user import User
from app.schemas.store_user import StoreUserCreate, StoreUserResponse

router = APIRouter(prefix="/api/store-users", tags=["Store Users"])


VALID_ROLES = {"ADMIN", "OPERATOR"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[StoreUserResponse])
def list_store_users(store_id: int | None = None, db: Session = Depends(get_db)):
    query = select(StoreUser).order_by(StoreUser.id)
    if store_id is not None:
        query = query.where(StoreUser.store_id == store_id)
    return db.scalars(query).all()


@router.post("", response_model=StoreUserResponse, status_code=status.HTTP_201_CREATED)
def create_store_user(payload: StoreUserCreate, db: Session = Depends(get_db)):
    role = payload.role.strip().upper()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Perfil deve ser ADMIN ou OPERATOR")

    if not db.get(Store, payload.store_id):
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    if not db.get(User, payload.user_id):
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    existing = db.scalar(
        select(StoreUser).where(
            StoreUser.store_id == payload.store_id,
            StoreUser.user_id == payload.user_id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Usuário já está vinculado à loja")

    link = StoreUser(
        store_id=payload.store_id,
        user_id=payload.user_id,
        role=role,
        status="ACTIVE",
    )
    db.add(link)

    try:
        db.commit()
        db.refresh(link)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível vincular o usuário à loja")

    return link
