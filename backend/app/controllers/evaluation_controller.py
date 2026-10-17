from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.evaluation import Evaluation
from app.models.operator import Operator
from app.models.product import Product
from app.schemas.evaluation import EvaluationCreate, EvaluationResponse

router = APIRouter(prefix="/api/evaluations", tags=["Evaluations"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[EvaluationResponse])
def list_evaluations(product_id: int | None = None, db: Session = Depends(get_db)):
    query = select(Evaluation).order_by(Evaluation.id)
    if product_id is not None:
        query = query.where(Evaluation.product_id == product_id)
    return db.scalars(query).all()


@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
def create_evaluation(
    payload: EvaluationCreate,
    operator_id: int,
    db: Session = Depends(get_db),
):
    operator = db.get(Operator, operator_id)
    if not operator or operator.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Operador não autorizado")

    product = db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if product.store_id != operator.store_id:
        raise HTTPException(status_code=403, detail="Operador não pertence à loja do produto")

    if product.status != "RECEIVED":
        raise HTTPException(status_code=400, detail="Produto não está disponível para avaliação")

    existing = db.scalar(
        select(Evaluation).where(Evaluation.product_id == product.id)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Produto já possui uma avaliação")

    evaluation = Evaluation(
        product_id=product.id,
        evaluated_by_operator_id=operator.id,
        sale_price=payload.sale_price,
        seller_amount=payload.seller_amount,
        store_amount=payload.store_amount,
        status="APPROVED",
    )
    product.sale_price = payload.sale_price
    product.status = "AVAILABLE"
    db.add(evaluation)

    try:
        db.commit()
        db.refresh(evaluation)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível registrar a avaliação")

    return evaluation
