// Views financeiras: aba Financeiro da loja e extrato da conta corrente do cliente.
import { PERIODS } from "../services/finance.js";
import { esc, formatBRL, icon } from "./ui.js";
import { splitPreviewView, storeTabsView } from "./operatorViews.js";

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const toCents = value => Math.round(Number(value || 0) * 100);
const formatDate = iso => DATA.format(new Date(iso)).replace(/\./g, "");

function periodChips(period) {
  return `
    <div class="filter-chips" role="group" aria-label="Período">
      ${PERIODS.map(p => `<button class="filter-chip state-layer${period === p.id ? " is-selected" : ""}" data-action="finance-period" data-period="${p.id}" aria-pressed="${period === p.id}">${period === p.id ? icon("check", "icon icon-sm") : ""}${p.label}</button>`).join("")}
    </div>`;
}

export function storeFinanceView({ period, data, error }) {
  let body;
  if (error) {
    body = `<div class="empty-state"><span class="empty-icon">${icon("error")}</span><strong>Não foi possível carregar o financeiro</strong><span>${esc(error)}</span>
      <button class="filled-button state-layer" data-action="finance-reload">Tentar novamente</button></div>`;
  } else if (!data) {
    body = `<div class="empty-state" role="status"><span class="spinner" aria-hidden="true"></span><span>Calculando o financeiro da loja…</span></div>`;
  } else if (!data.resumo.quantidade_vendas) {
    body = `<div class="empty-state"><span class="empty-icon">${icon("wallet")}</span><strong>Nenhuma venda neste período</strong><span>As vendas registradas pela loja aparecem aqui com a divisão entre loja e vendedores.</span></div>`;
  } else {
    const r = data.resumo;
    body = `
      <section class="finance-hero" aria-label="Resumo do período">
        <span class="balance-label">${icon("sell")}Total vendido</span>
        <strong class="balance-value">${formatBRL(r.total_vendido)}</strong>
        <span class="finance-count">${r.quantidade_vendas} ${r.quantidade_vendas === 1 ? "venda" : "vendas"}</span>
      </section>

      <section class="finance-tiles" aria-label="Divisão do período">
        <div class="finance-tile tile-store"><span>${icon("storefront", "icon icon-sm")}Receita da loja</span><strong>${formatBRL(r.receita_loja)}</strong></div>
        <div class="finance-tile tile-seller"><span>${icon("person", "icon icon-sm")}Creditado aos vendedores</span><strong>${formatBRL(r.creditado_vendedores)}</strong></div>
      </section>

      <section class="split-preview" aria-label="Proporção entre vendedores e loja">
        ${splitPreviewView({ venda: toCents(r.total_vendido), cliente: toCents(r.creditado_vendedores), loja: toCents(r.receita_loja) }, { clienteLabel: "Vendedores" })}
      </section>

      <section aria-labelledby="sellersTitle">
        <h2 class="section-title" id="sellersTitle">Por vendedor</h2>
        <div class="list">
          ${data.vendedores.map(v => `
            <div class="list-item">
              <span class="list-icon">${icon("person")}</span>
              <span class="list-text"><strong>${esc(v.nome)}</strong><span>${v.quantidade_vendas} ${v.quantidade_vendas === 1 ? "venda" : "vendas"}</span></span>
              <strong class="product-price">${formatBRL(v.total_creditado)}</strong>
            </div>`).join("")}
        </div>
      </section>

      <section aria-labelledby="salesTitle">
        <h2 class="section-title" id="salesTitle">Vendas</h2>
        <div class="list">
          ${data.vendas.map(v => `
            <div class="list-item">
              <span class="list-icon">${icon("sold")}</span>
              <span class="list-text">
                <strong>${esc(v.produto_nome)}</strong>
                <span>${esc(formatDate(v.data_hora))} · Comprador: ${esc(v.comprador_nome)}</span>
                <span>Vendedor: ${esc(v.vendedor_nome)} · ${esc(v.referencia)}</span>
              </span>
              <span class="money-stack"><strong>${formatBRL(v.valor_venda)}</strong><small>Loja ${formatBRL(v.valor_loja)}</small></span>
            </div>`).join("")}
        </div>
      </section>`;
  }
  return `
    ${storeTabsView("financeiro")}
    <main class="page store-page">
      <header class="greeting"><p>Vendas, receita e repasses</p><h1>Financeiro</h1></header>
      ${periodChips(period)}
      ${body}
    </main>`;
}

// ---------- Cliente: saldo e extrato ----------
export function balanceCardView(conta, error) {
  const value = conta ? formatBRL(conta.saldo) : "—";
  const note = error
    ? "Não foi possível atualizar o saldo agora."
    : conta && Number(conta.saldo) > 0
      ? "Créditos das suas vendas. Usar na loja e sacar por PIX: em breve."
      : "Quando um produto seu for vendido, a sua parte aparece aqui como crédito.";
  return `
    <section class="balance-card" aria-labelledby="balanceLabel" aria-busy="${!conta && !error}">
      <span class="balance-label" id="balanceLabel">${icon("wallet")}Saldo disponível</span>
      <strong class="balance-value">${value}</strong>
      <p class="balance-note">${note}</p>
    </section>`;
}

export function statementView(conta) {
  if (!conta) return "";
  return `
    <section aria-labelledby="statementTitle">
      <h2 class="section-title" id="statementTitle">Extrato</h2>
      ${conta.movimentacoes.length ? `
      <div class="list">
        ${conta.movimentacoes.map(m => {
          const credito = m.tipo === "CREDITO";
          return `
          <div class="list-item">
            <span class="list-icon">${icon(credito ? "sold" : "wallet")}</span>
            <span class="list-text">
              <strong>${esc(m.descricao)}</strong>
              <span>${esc(m.loja_nome)} · ${esc(DATA_HORA.format(new Date(m.data_hora)))}</span>
            </span>
            <strong class="statement-value ${credito ? "is-credit" : "is-debit"}">${credito ? "+" : "−"} ${formatBRL(m.valor)}</strong>
          </div>`;
        }).join("")}
      </div>` : `<div class="empty-state"><span class="empty-icon">${icon("wallet")}</span><strong>Nenhuma movimentação ainda</strong><span>Entregue um produto em uma loja parceira. Quando ele for vendido, o crédito aparece aqui.</span></div>`}
    </section>`;
}
