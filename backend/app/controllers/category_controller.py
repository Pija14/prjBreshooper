from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter(prefix="/api/categorias", tags=["Categorias"])



@router.get("", response_model=list[CategoryResponse], summary="Listar categorias", description="Retorna as categorias cadastradas no Beeshopper.")
def listar_categorias(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.nome)).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar categoria", description="Cadastra uma categoria para classificação dos produtos.")
def cadastrar_categoria(payload: CategoryCreate, db: Session = Depends(get_db)):
    categoria = Category(nome=payload.nome.strip(), descricao=payload.descricao)
    db.add(categoria)
    try:
        db.commit()
        db.refresh(categoria)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Categoria já cadastrada")
    return categoria
