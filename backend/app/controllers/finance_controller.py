from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from app.database.session import get_db
from app.models.movement import Movement
from app.models.operator import Operator
from app.models.payout import Payout
from app.models.product import Product
from app.models.sale import Sale
from app.models.store import Store
from app.models.user import User
from app.schemas.finance import (
    ContaCorrenteResponse, FinanceiroLojaResponse, MovimentacaoResponse, PagamentoRepasseRequest,
    RepasseResponse, ResumoFinanceiro, VendaFinanceira, VendedorFinanceiro,
)
from app.security import usuario_autenticado

router = APIRouter(tags=["Financeiro"])

ZERO = Decimal("0.00")
FORMAS = ("PIX", "CARTAO", "CREDITO_LOJA")
FORMA_DESCRICAO = {"PIX": "PIX", "CARTAO": "cartão", "CREDITO_LOJA": "crédito na loja"}


def em_utc(valor: datetime) -> datetime:
    """Datas sem fuso (SQLite) são gravadas em UTC; padroniza para comparar e devolver."""
    return valor.replace(tzinfo=timezone.utc) if valor.tzinfo is None else valor.astimezone(timezone.utc)


def no_periodo(valor: datetime | None, inicio: datetime | None, fim: datetime | None) -> bool:
    if valor is None:
        return False
    valor = em_utc(valor)
    return (not inicio or valor >= inicio) and (not fim or valor < fim)


def exigir_operador(db: Session, usuario: User, loja_id: int) -> Operator:
    operador = db.scalar(select(Operator).where(
        Operator.loja_id == loja_id, Operator.usuario_id == usuario.id, Operator.status == "ATIVO"
    ))
    if not operador:
        raise HTTPException(status_code=403, detail="Somente operadores da loja podem acessar o financeiro")
    return operador


@router.get("/api/conta-corrente", response_model=ContaCorrenteResponse, summary="Minha conta corrente", description="Saldo e extrato da carteira do usuário autenticado. Um crédito entra quando a loja paga a parte do vendedor na forma CREDITO_LOJA. a_receber soma os repasses que a loja ainda não pagou. Exige Authorization: Bearer <token>.")
def minha_conta(usuario: User = Depends(usuario_autenticado), db: Session = Depends(get_db)):
    linhas = db.execute(
        select(Movement, Store.nome, Product.nome, Sale.referencia)
        .join(Store, Store.id == Movement.loja_id)
        .outerjoin(Sale, Sale.id == Movement.venda_id)
        .outerjoin(Product, Product.id == Sale.produto_id)
        .where(Movement.usuario_id == usuario.id, Movement.status == "CONCLUIDA")
        .order_by(Movement.data_hora.desc(), Movement.id.desc())
    ).all()
    pendentes = db.scalars(select(Payout.valor).where(Payout.usuario_id == usuario.id, Payout.status == "PENDENTE")).all()

    creditos = sum((m.valor for m, *_ in linhas if m.tipo == "CREDITO"), ZERO)
    debitos = sum((m.valor for m, *_ in linhas if m.tipo == "DEBITO"), ZERO)
    return ContaCorrenteResponse(
        saldo=creditos - debitos,
        total_creditos=creditos,
        total_debitos=debitos,
        a_receber=sum(pendentes, ZERO),
        movimentacoes=[
            MovimentacaoResponse(
                id=m.id, tipo=m.tipo, origem=m.origem, valor=m.valor, descricao=m.descricao, status=m.status,
                data_hora=m.data_hora, loja_nome=loja_nome, produto_nome=produto_nome, referencia=referencia,
            )
            for m, loja_nome, produto_nome, referencia in linhas
        ],
    )


@router.get("/api/lojas/{loja_id}/financeiro", response_model=FinanceiroLojaResponse, summary="Financeiro da loja", description="Resumo do período (de/ate, opcionais, ISO 8601): receitas (vendas), parte da loja e dos vendedores, despesas (repasses pagos aos vendedores, por forma de pagamento) e o total ainda a pagar aos vendedores (sempre todos os pendentes). Somente operadores ativos da loja. Exige Authorization: Bearer <token>.")
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
    exigir_operador(db, usuario, loja_id)

    vendedor, comprador = aliased(User), aliased(User)
    linhas = db.execute(
        select(Sale, Product, vendedor, comprador, Payout)
        .join(Product, Product.id == Sale.produto_id)
        .join(vendedor, vendedor.id == Product.usuario_vendedor_id)
        .join(comprador, comprador.id == Sale.usuario_comprador_id)
        .outerjoin(Payout, Payout.venda_id == Sale.id)
        .where(Sale.loja_id == loja_id, Sale.status == "CONCLUIDA")
        .order_by(Sale.data_hora.desc(), Sale.id.desc())
    ).all()

    # Filtro do período em Python: as datas são normalizadas para UTC independentemente do banco.
    inicio = em_utc(de) if de else None
    fim = em_utc(ate) if ate else None
    do_periodo = [l for l in linhas if no_periodo(l[0].data_hora, inicio, fim)]
    pagos = [r for *_, r in linhas if r and r.status == "PAGO" and no_periodo(r.pago_em, inicio, fim)]
    pendentes = [r for *_, r in linhas if r and r.status == "PENDENTE"]

    por_vendedor: dict[int, VendedorFinanceiro] = {}
    for venda, _, vend, _, repasse in do_periodo:
        item = por_vendedor.setdefault(vend.id, VendedorFinanceiro(usuario_id=vend.id, nome=vend.nome, quantidade_vendas=0, total_vendedor=ZERO, a_pagar=ZERO))
        item.quantidade_vendas += 1
        item.total_vendedor += venda.valor_usuario
        if repasse and repasse.status == "PENDENTE":
            item.a_pagar += repasse.valor

    return FinanceiroLojaResponse(
        loja_id=loja.id,
        loja_nome=loja.nome,
        de=inicio,
        ate=fim,
        resumo=ResumoFinanceiro(
            quantidade_vendas=len(do_periodo),
            total_vendido=sum((v.valor_venda for v, *_ in do_periodo), ZERO),
            receita_loja=sum((v.valor_loja for v, *_ in do_periodo), ZERO),
            parte_vendedores=sum((v.valor_usuario for v, *_ in do_periodo), ZERO),
            pago_vendedores=sum((r.valor for r in pagos), ZERO),
            a_pagar_vendedores=sum((r.valor for r in pendentes), ZERO),
            repasses_pendentes=len(pendentes),
            pago_por_forma={f: sum((r.valor for r in pagos if r.forma_pagamento == f), ZERO) for f in FORMAS},
        ),
        vendedores=sorted(por_vendedor.values(), key=lambda v: (-v.total_vendedor, v.nome)),
        vendas=[
            VendaFinanceira(
                venda_id=v.id, referencia=v.referencia, data_hora=v.data_hora, produto_id=p.id, produto_nome=p.nome,
                vendedor_nome=vend.nome, comprador_nome=comp.nome,
                valor_venda=v.valor_venda, valor_usuario=v.valor_usuario, valor_loja=v.valor_loja,
                repasse_status=r.status if r else None,
            )
            for v, p, vend, comp, r in do_periodo
        ],
    )


def _repasse_response(repasse: Payout, venda: Sale, produto: Product, vendedor: User) -> RepasseResponse:
    return RepasseResponse(
        id=repasse.id, venda_id=venda.id, referencia=venda.referencia, venda_data_hora=venda.data_hora,
        produto_nome=produto.nome, usuario_id=vendedor.id, vendedor_nome=vendedor.nome, vendedor_email=vendedor.email,
        valor=repasse.valor, valor_venda=venda.valor_venda, valor_loja=venda.valor_loja, status=repasse.status,
        data_referencia=data_referencia(repasse, venda), forma_pagamento=repasse.forma_pagamento, pago_em=repasse.pago_em,
    )


def data_referencia(repasse: Payout, venda: Sale) -> datetime:
    """Data do lançamento no extrato de despesas: o pagamento, ou a venda enquanto está a pagar."""
    return em_utc(repasse.pago_em if repasse.status == "PAGO" and repasse.pago_em else venda.data_hora)


@router.get("/api/lojas/{loja_id}/repasses", response_model=list[RepasseResponse], summary="Repasses aos vendedores", description="Despesas da loja como extrato: o que deve (PENDENTE) e o que já pagou (PAGO) a cada vendedor, uma linha por venda, do mais recente ao mais antigo pela data de referência (data do pagamento; para os pendentes, data da venda). Filtros opcionais: status e período (de/ate em ISO 8601, aplicado à data de referência). Somente operadores ativos da loja. Exige Authorization: Bearer <token>.")
def listar_repasses(
    loja_id: int,
    status: str | None = None,
    de: datetime | None = None,
    ate: datetime | None = None,
    usuario: User = Depends(usuario_autenticado),
    db: Session = Depends(get_db),
):
    if not db.get(Store, loja_id):
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    exigir_operador(db, usuario, loja_id)

    query = (
        select(Payout, Sale, Product, User)
        .join(Sale, Sale.id == Payout.venda_id)
        .join(Product, Product.id == Sale.produto_id)
        .join(User, User.id == Payout.usuario_id)
        .where(Payout.loja_id == loja_id)
    )
    if status is not None:
        query = query.where(Payout.status == status.strip().upper())

    inicio = em_utc(de) if de else None
    fim = em_utc(ate) if ate else None
    linhas = [l for l in db.execute(query).all() if no_periodo(data_referencia(l[0], l[1]), inicio, fim)]
    linhas.sort(key=lambda l: (data_referencia(l[0], l[1]), l[0].id), reverse=True)
    return [_repasse_response(*l) for l in linhas]


@router.post("/api/repasses/{repasse_id}/pagamento", response_model=RepasseResponse, summary="Pagar vendedor", description="Registra o pagamento da parte do vendedor por PIX, CARTAO ou CREDITO_LOJA. Em CREDITO_LOJA o valor entra como crédito na carteira (conta corrente) do vendedor, na mesma transação; em PIX e CARTAO o pagamento é feito fora do Breshopper e só fica registrado. Um repasse só pode ser pago uma vez. Somente operadores ativos da loja. Exige Authorization: Bearer <token>.")
def pagar_repasse(
    repasse_id: int,
    payload: PagamentoRepasseRequest,
    usuario: User = Depends(usuario_autenticado),
    db: Session = Depends(get_db),
):
    repasse = db.get(Payout, repasse_id)
    if not repasse:
        raise HTTPException(status_code=404, detail="Repasse não encontrado")
    operador = exigir_operador(db, usuario, repasse.loja_id)
    if repasse.status != "PENDENTE":
        raise HTTPException(status_code=409, detail="Este vendedor já foi pago por esta venda")

    venda = db.get(Sale, repasse.venda_id)
    produto = db.get(Product, venda.produto_id)
    vendedor = db.get(User, repasse.usuario_id)

    # UPDATE condicional: se dois pagamentos chegarem juntos, só um encontra o repasse PENDENTE.
    agora = datetime.now(timezone.utc)
    pago = db.execute(
        update(Payout)
        .where(Payout.id == repasse.id, Payout.status == "PENDENTE")
        .values(status="PAGO", forma_pagamento=payload.forma_pagamento, operador_pagamento_id=operador.id, pago_em=agora)
    )
    if pago.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="Este vendedor já foi pago por esta venda")
    if payload.forma_pagamento == "CREDITO_LOJA":
        db.add(Movement(
            usuario_id=repasse.usuario_id,
            loja_id=repasse.loja_id,
            venda_id=venda.id,
            tipo="CREDITO",
            origem="VENDA",
            valor=repasse.valor,
            descricao=f"Venda de {produto.nome}"[:200],
            status="CONCLUIDA",
            data_hora=agora,
        ))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Este vendedor já foi pago por esta venda")
    db.refresh(repasse)
    return _repasse_response(repasse, venda, produto, vendedor)
