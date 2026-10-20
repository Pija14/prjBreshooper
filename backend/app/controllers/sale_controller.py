import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.evaluation import Evaluation
from app.models.operator import Operator
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleResponse

router = APIRouter(prefix="/api/vendas", tags=["Vendas"])


def gerar_referencia() -> str:
    return "VND-" + secrets.token_hex(5).upper()


@router.get("", response_model=list[SaleResponse], summary="Listar vendas", description="Retorna as vendas registradas. Pode filtrar por loja, produto ou comprador.")
def list_sales(
    loja_id: int | None = None,
    produto_id: int | None = None,
    usuario_comprador_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = select(Sale).order_by(Sale.id)
    if loja_id is not None:
        query = query.where(Sale.loja_id == loja_id)
    if produto_id is not None:
        query = query.where(Sale.produto_id == produto_id)
    if usuario_comprador_id is not None:
        query = query.where(Sale.usuario_comprador_id == usuario_comprador_id)
    return db.scalars(query).all()


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED, summary="Registrar venda", description="Registra a venda de um produto DISPONIVEL a um usuário comprador. O operador ativo da loja do produto registra a venda em nome da loja; ele não é o comprador. O comprador não pode ser o vendedor do produto nem operador de loja. Os valores e a divisão vêm da avaliação, e o produto passa a VENDIDO.")
def create_sale(
    payload: SaleCreate,
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

    if produto.status != "DISPONIVEL":
        raise HTTPException(status_code=400, detail="Produto não está disponível para venda")

    comprador = db.get(User, payload.usuario_comprador_id)
    if not comprador:
        raise HTTPException(status_code=404, detail="Usuário comprador não encontrado")

    if comprador.status != "ATIVO":
        raise HTTPException(status_code=400, detail="Usuário comprador está inativo")

    if comprador.id == produto.usuario_vendedor_id:
        raise HTTPException(status_code=400, detail="O vendedor não pode comprar o próprio produto")

    # Operadores atuam pela loja: não vendem nem compram produtos.
    if db.scalar(select(Operator.id).where(Operator.usuario_id == comprador.id, Operator.status == "ATIVO")):
        raise HTTPException(status_code=400, detail="Operadores de loja não podem comprar produtos")

    avaliacao = db.scalar(select(Evaluation).where(Evaluation.produto_id == produto.id, Evaluation.status == "APROVADA"))
    if not avaliacao:
        raise HTTPException(status_code=400, detail="Produto não possui avaliação aprovada")

    venda = Sale(
        produto_id=produto.id,
        loja_id=produto.loja_id,
        usuario_comprador_id=comprador.id,
        operador_venda_id=operador.id,
        valor_venda=avaliacao.valor_venda,
        valor_usuario=avaliacao.valor_usuario,
        valor_loja=avaliacao.valor_loja,
        status="CONCLUIDA",
        referencia=gerar_referencia(),
    )
    produto.status = "VENDIDO"
    db.add(venda)

    try:
        db.commit()
        db.refresh(venda)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Produto já foi vendido")

    return venda
