from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from app.schemas.sale import DataHoraUTC

FormaPagamento = Literal["PIX", "CARTAO", "CREDITO_LOJA"]


class MovimentacaoResponse(BaseModel):
    id: int
    tipo: str
    origem: str
    valor: Decimal
    descricao: str
    status: str
    data_hora: DataHoraUTC
    loja_nome: str
    produto_nome: str | None = None
    referencia: str | None = None


class ContaCorrenteResponse(BaseModel):
    saldo: Decimal
    total_creditos: Decimal
    total_debitos: Decimal
    # Repasses ainda não pagos pela loja (não fazem parte do saldo).
    a_receber: Decimal
    movimentacoes: list[MovimentacaoResponse]


class ResumoFinanceiro(BaseModel):
    quantidade_vendas: int
    total_vendido: Decimal          # receitas: entradas das vendas no período
    receita_loja: Decimal           # parte da loja nas vendas do período
    parte_vendedores: Decimal       # parte dos vendedores nas vendas do período
    pago_vendedores: Decimal        # despesas: repasses pagos no período
    a_pagar_vendedores: Decimal     # repasses pendentes (todos, independentemente do período)
    repasses_pendentes: int
    pago_por_forma: dict[str, Decimal]


class VendedorFinanceiro(BaseModel):
    usuario_id: int
    nome: str
    quantidade_vendas: int
    total_vendedor: Decimal
    a_pagar: Decimal


class VendaFinanceira(BaseModel):
    venda_id: int
    referencia: str
    data_hora: DataHoraUTC
    produto_id: int
    produto_nome: str
    vendedor_nome: str
    comprador_nome: str
    valor_venda: Decimal
    valor_usuario: Decimal
    valor_loja: Decimal
    repasse_status: str | None


class FinanceiroLojaResponse(BaseModel):
    loja_id: int
    loja_nome: str
    de: datetime | None
    ate: datetime | None
    resumo: ResumoFinanceiro
    vendedores: list[VendedorFinanceiro]
    vendas: list[VendaFinanceira]


class RepasseResponse(BaseModel):
    id: int
    venda_id: int
    referencia: str
    venda_data_hora: DataHoraUTC
    produto_nome: str
    usuario_id: int
    vendedor_nome: str
    vendedor_email: str
    valor: Decimal
    status: str
    forma_pagamento: str | None
    pago_em: DataHoraUTC | None


class PagamentoRepasseRequest(BaseModel):
    forma_pagamento: FormaPagamento
