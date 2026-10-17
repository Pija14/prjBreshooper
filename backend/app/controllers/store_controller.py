from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.store import Store
from app.schemas.store import StoreCreate, StoreResponse

router = APIRouter(prefix="/api/stores", tags=["Stores"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[StoreResponse])
def list_stores(db: Session = Depends(get_db)):
    return db.scalars(select(Store).order_by(Store.id)).all()


@router.get("/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_db)):
    store = db.get(Store, store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    return store


@router.post("", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(payload: StoreCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    document = payload.document.strip() if payload.document else None

    if not name:
        raise HTTPException(status_code=400, detail="Nome da loja é obrigatório")

    if document:
        existing = db.scalar(select(Store).where(Store.document == document))
        if existing:
            raise HTTPException(status_code=409, detail="Já existe uma loja com este documento")

    store = Store(name=name, document=document, status=True)
    db.add(store)

    try:
        db.commit()
        db.refresh(store)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar a loja")

    return store
