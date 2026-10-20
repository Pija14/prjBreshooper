from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.sale import DataHoraUTC


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
    movimentacoes: list[MovimentacaoResponse]


class ResumoFinanceiro(BaseModel):
    quantidade_vendas: int
    total_vendido: Decimal
    receita_loja: Decimal
    creditado_vendedores: Decimal


class VendedorFinanceiro(BaseModel):
    usuario_id: int
    nome: str
    quantidade_vendas: int
    total_creditado: Decimal


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


class FinanceiroLojaResponse(BaseModel):
    loja_id: int
    loja_nome: str
    de: datetime | None
    ate: datetime | None
    resumo: ResumoFinanceiro
    vendedores: list[VendedorFinanceiro]
    vendas: list[VendaFinanceira]
