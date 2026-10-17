from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.operator import Operator
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse

router = APIRouter(prefix="/api/products", tags=["Produtos"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[ProductResponse], summary="Listar produtos", description="Retorna os produtos cadastrados no Beeshopper. Pode filtrar os produtos por loja.")
def list_products(store_id: int | None = None, db: Session = Depends(get_db)):
    query = select(Product).order_by(Product.id)
    if store_id is not None:
        query = query.where(Product.store_id == store_id)
    return db.scalars(query).all()


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar produto", description="Cadastra um produto recebido pela loja. Somente um operador ativo da própria loja pode realizar o cadastro. O produto fica vinculado ao usuário proprietário, à loja e ao operador responsável pelo cadastro.")
def create_product(
    payload: ProductCreate,
    operator_id: int,
    db: Session = Depends(get_db),
):
    operator = db.get(Operator, operator_id)
    if not operator or operator.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Operador não autorizado")

    if operator.store_id != payload.store_id:
        raise HTTPException(status_code=403, detail="Operador não pertence a esta loja")

    store = db.get(Store, payload.store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    seller = db.get(User, payload.seller_user_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Usuário vendedor não encontrado")

    if not seller.status:
        raise HTTPException(status_code=400, detail="Usuário vendedor está inativo")

    product = Product(
        store_id=payload.store_id,
        seller_user_id=payload.seller_user_id,
        created_by_operator_id=operator.id,
        name=payload.name.strip(),
        description=payload.description,
        category=payload.category,
        condition=payload.condition,
        status="RECEIVED",
    )
    db.add(product)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar o produto")

    return product
