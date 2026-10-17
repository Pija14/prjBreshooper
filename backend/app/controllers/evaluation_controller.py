from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.evaluation import Evaluation
from app.models.operator import Operator
from app.models.product import Product
from app.schemas.evaluation import EvaluationCreate, EvaluationResponse

router = APIRouter(prefix="/api/avaliacoes", tags=["Avaliações"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[EvaluationResponse], summary="Listar avaliações", description="Retorna as avaliações registradas para os produtos do Beeshopper.")
def list_evaluations(produto_id: int | None = None, db: Session = Depends(get_db)):
    query = select(Evaluation).order_by(Evaluation.id)
    if produto_id is not None:
        query = query.where(Evaluation.produto_id == produto_id)
    return db.scalars(query).all()


@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED, summary="Avaliar produto", description="Registra a avaliação de um produto. O operador deve pertencer à loja do produto. A avaliação define o valor de venda e a divisão entre usuário e loja.")
def create_evaluation(
    payload: EvaluationCreate,
    operador_id: int,
    db: Session = Depends(get_db),
):
    operador = db.get(Operator, operador_id)
    if not operador or operador.status != "ATIVO":
        raise HTTPException(status_code=403, detail="Operador não autorizado")

    produto = db.get(Product, payload.produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if produto.loja_id != operador.loja_id:
        raise HTTPException(status_code=403, detail="Operador não pertence à loja do produto")

    if produto.status != "RECEBIDO":
        raise HTTPException(status_code=400, detail="Produto não está disponível para avaliação")

    existing = db.scalar(
        select(Evaluation).where(Evaluation.produto_id == produto.id)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Produto já possui uma avaliação")

    avaliacao = Evaluation(
        produto_id=produto.id,
        avaliado_por_operador_id=operador.id,
        valor_venda=payload.valor_venda,
        valor_usuario=payload.valor_usuario,
        valor_loja=payload.valor_loja,
        status="APROVADA",
    )
    produto.valor_venda = payload.valor_venda
    produto.status = "DISPONIVEL"
    db.add(avaliacao)

    try:
        db.commit()
        db.refresh(avaliacao)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível registrar a avaliação")

    return avaliacao
