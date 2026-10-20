from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.database.session import get_db
from app.models.movement import Movement
from app.models.operator import Operator
from app.models.product import Product
from app.models.sale import Sale
from app.models.store import Store
from app.models.user import User
from app.schemas.finance import (
    ContaCorrenteResponse, FinanceiroLojaResponse, MovimentacaoResponse,
    ResumoFinanceiro, VendaFinanceira, VendedorFinanceiro,
)
from app.security import usuario_autenticado

router = APIRouter(tags=["Financeiro"])

ZERO = Decimal("0.00")


def em_utc(valor: datetime) -> datetime:
    """Datas sem fuso (SQLite) são gravadas em UTC; padroniza para comparar e devolver."""
    return valor.replace(tzinfo=timezone.utc) if valor.tzinfo is None else valor.astimezone(timezone.utc)


@router.get("/api/conta-corrente", response_model=ContaCorrenteResponse, summary="Minha conta corrente", description="Saldo e extrato do usuário autenticado. Cada venda de um produto do usuário gera um crédito com a parte dele. Exige Authorization: Bearer <token>.")
def minha_conta(usuario: User = Depends(usuario_autenticado), db: Session = Depends(get_db)):
    linhas = db.execute(
        select(Movement, Store.nome, Product.nome, Sale.referencia)
        .join(Store, Store.id == Movement.loja_id)
        .outerjoin(Sale, Sale.id == Movement.venda_id)
        .outerjoin(Product, Product.id == Sale.produto_id)
        .where(Movement.usuario_id == usuario.id, Movement.status == "CONCLUIDA")
        .order_by(Movement.data_hora.desc(), Movement.id.desc())
    ).all()

    creditos = sum((m.valor for m, *_ in linhas if m.tipo == "CREDITO"), ZERO)
    debitos = sum((m.valor for m, *_ in linhas if m.tipo == "DEBITO"), ZERO)
    return ContaCorrenteResponse(
        saldo=creditos - debitos,
        total_creditos=creditos,
        total_debitos=debitos,
        movimentacoes=[
            MovimentacaoResponse(
                id=m.id, tipo=m.tipo, origem=m.origem, valor=m.valor, descricao=m.descricao, status=m.status,
                data_hora=m.data_hora, loja_nome=loja_nome, produto_nome=produto_nome, referencia=referencia,
            )
            for m, loja_nome, produto_nome, referencia in linhas
        ],
    )


@router.get("/api/lojas/{loja_id}/financeiro", response_model=FinanceiroLojaResponse, summary="Financeiro da loja", description="Resumo financeiro das vendas da loja no período (de/ate, opcionais, em data e hora ISO 8601): total vendido, receita da loja, valor creditado aos vendedores, totais por vendedor e lista de vendas. Somente operadores ativos da loja. Exige Authorization: Bearer <token>.")
def financeiro_loja(
    loja_id: int,
    de: datetime | None = None,
    ate: datetime | None = None,
    usuario: User = Depends(usuario_autenticado),
    db: Session = Depends(get_db),
):
    loja = db.get(Store, loja_id)
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    operador = db.scalar(select(Operator.id).where(
        Operator.loja_id == loja_id, Operator.usuario_id == usuario.id, Operator.status == "ATIVO"
    ))
    if not operador:
        raise HTTPException(status_code=403, detail="Somente operadores da loja podem ver o financeiro")

    vendedor, comprador = aliased(User), aliased(User)
    linhas = db.execute(
        select(Sale, Product, vendedor, comprador)
        .join(Product, Product.id == Sale.produto_id)
        .join(vendedor, vendedor.id == Product.usuario_vendedor_id)
        .join(comprador, comprador.id == Sale.usuario_comprador_id)
        .where(Sale.loja_id == loja_id, Sale.status == "CONCLUIDA")
        .order_by(Sale.data_hora.desc(), Sale.id.desc())
    ).all()

    # Filtro do período em Python: as datas são normalizadas para UTC independentemente do banco.
    inicio = em_utc(de) if de else None
    fim = em_utc(ate) if ate else None
    linhas = [l for l in linhas if (not inicio or em_utc(l[0].data_hora) >= inicio) and (not fim or em_utc(l[0].data_hora) < fim)]

    por_vendedor: dict[int, VendedorFinanceiro] = {}
    for venda, _, vend, _ in linhas:
        item = por_vendedor.setdefault(vend.id, VendedorFinanceiro(usuario_id=vend.id, nome=vend.nome, quantidade_vendas=0, total_creditado=ZERO))
        item.quantidade_vendas += 1
        item.total_creditado += venda.valor_usuario

    return FinanceiroLojaResponse(
        loja_id=loja.id,
        loja_nome=loja.nome,
        de=inicio,
        ate=fim,
        resumo=ResumoFinanceiro(
            quantidade_vendas=len(linhas),
            total_vendido=sum((v.valor_venda for v, *_ in linhas), ZERO),
            receita_loja=sum((v.valor_loja for v, *_ in linhas), ZERO),
            creditado_vendedores=sum((v.valor_usuario for v, *_ in linhas), ZERO),
        ),
        vendedores=sorted(por_vendedor.values(), key=lambda v: (-v.total_creditado, v.nome)),
        vendas=[
            VendaFinanceira(
                venda_id=v.id, referencia=v.referencia, data_hora=v.data_hora, produto_id=p.id, produto_nome=p.nome,
                vendedor_nome=vend.nome, comprador_nome=comp.nome,
                valor_venda=v.valor_venda, valor_usuario=v.valor_usuario, valor_loja=v.valor_loja,
            )
            for v, p, vend, comp in linhas
        ],
    )
