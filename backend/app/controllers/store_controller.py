from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.store import Store
from app.schemas.loja import LojaCreate, LojaResponse

router = APIRouter(prefix="/api/lojas", tags=["Lojas"])



@router.get("", response_model=list[LojaResponse], summary="Listar lojas", description="Retorna todas as lojas cadastradas no Beeshopper.")
def list_stores(db: Session = Depends(get_db)):
    return db.scalars(select(Store).order_by(Store.id)).all()


@router.get("/{loja_id}", response_model=LojaResponse, summary="Consultar loja", description="Retorna os dados de uma loja específica pelo identificador.")
def get_store(loja_id: int, db: Session = Depends(get_db)):
    loja = db.get(Store, loja_id)
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    return loja


@router.post("", response_model=LojaResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar loja", description="Cadastra uma loja parceira que poderá receber produtos e realizar operações de venda no Beeshopper.")
def create_store(payload: LojaCreate, db: Session = Depends(get_db)):
    nome = payload.nome.strip()
    documento = payload.documento.strip() if payload.documento else None

    if not nome:
        raise HTTPException(status_code=400, detail="Nome da loja é obrigatório")

    if documento:
        existing = db.scalar(select(Store).where(Store.documento == documento))
        if existing:
            raise HTTPException(status_code=409, detail="Já existe uma loja com este documento")

    loja = Store(nome=nome, documento=documento, status="ATIVO")
    db.add(loja)

    try:
        db.commit()
        db.refresh(loja)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar a loja")

    return loja
