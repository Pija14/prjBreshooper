from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandResponse

router = APIRouter(prefix="/api/marcas", tags=["Marcas"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[BrandResponse], summary="Listar marcas", description="Retorna as marcas cadastradas no Beeshopper.")
def listar_marcas(db: Session = Depends(get_db)):
    return db.scalars(select(Brand).order_by(Brand.nome)).all()


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar marca", description="Cadastra uma marca para identificação dos produtos.")
def cadastrar_marca(payload: BrandCreate, db: Session = Depends(get_db)):
    marca = Brand(nome=payload.nome.strip())
    db.add(marca)
    try:
        db.commit()
        db.refresh(marca)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Marca já cadastrada")
    return marca
