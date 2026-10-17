from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.brand import Brand
from app.models.category import Category
from app.models.operator import Operator
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse

router = APIRouter(prefix="/api/produtos", tags=["Produtos"])



@router.get("", response_model=list[ProductResponse], summary="Listar produtos", description="Retorna os produtos cadastrados no Beeshopper. Pode filtrar os produtos por loja, categoria ou marca.")
def list_products(
    loja_id: int | None = None,
    categoria_id: int | None = None,
    marca_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = select(Product).order_by(Product.id)
    if loja_id is not None:
        query = query.where(Product.loja_id == loja_id)
    if categoria_id is not None:
        query = query.where(Product.categoria_id == categoria_id)
    if marca_id is not None:
        query = query.where(Product.marca_id == marca_id)
    return db.scalars(query).all()


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar produto", description="Cadastra um produto recebido pela loja. Somente um operador ativo da própria loja pode realizar o cadastro. O produto fica vinculado ao usuário proprietário, à loja, ao operador responsável, à categoria e à marca.")
def create_product(
    payload: ProductCreate,
    operador_id: int,
    db: Session = Depends(get_db),
):
    operador = db.get(Operator, operador_id)
    if not operador or operador.status != "ATIVO":
        raise HTTPException(status_code=403, detail="Operador não autorizado")

    if operador.loja_id != payload.loja_id:
        raise HTTPException(status_code=403, detail="Operador não pertence a esta loja")

    loja = db.get(Store, payload.loja_id)
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    vendedor = db.get(User, payload.usuario_vendedor_id)
    if not vendedor:
        raise HTTPException(status_code=404, detail="Usuário vendedor não encontrado")

    if vendedor.status != "ATIVO":
        raise HTTPException(status_code=400, detail="Usuário vendedor está inativo")

    if payload.categoria_id is not None:
        categoria = db.get(Category, payload.categoria_id)
        if not categoria or categoria.status != "ATIVO":
            raise HTTPException(status_code=400, detail="Categoria não encontrada ou inativa")

    if payload.marca_id is not None:
        marca = db.get(Brand, payload.marca_id)
        if not marca or marca.status != "ATIVO":
            raise HTTPException(status_code=400, detail="Marca não encontrada ou inativa")

    produto = Product(
        loja_id=payload.loja_id,
        usuario_vendedor_id=payload.usuario_vendedor_id,
        operador_cadastro_id=operador.id,
        categoria_id=payload.categoria_id,
        marca_id=payload.marca_id,
        nome=payload.nome.strip(),
        descricao=payload.descricao,
        estado_conservacao=payload.estado_conservacao,
        status="RECEBIDO",
    )
    db.add(produto)

    try:
        db.commit()
        db.refresh(produto)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar o produto")

    return produto
