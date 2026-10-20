// Views financeiras: Início (resumo), Receitas e Despesas da loja, diálogo de pagamento ao vendedor
// e, na área do cliente, saldo e extrato da carteira.
import { PERIODS } from "../services/finance.js";
import { esc, firstName, formatBRL, icon } from "./ui.js";
import { splitPreviewView, storeNavView } from "./operatorViews.js";

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const toCents = value => Math.round(Number(value || 0) * 100);
const formatDate = iso => DATA.format(new Date(iso)).replace(/\./g, "");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const PERFIS = { ADMINISTRADOR: "Administrador", OPERADOR: "Operador" };

export const FORMAS = {
  CREDITO_LOJA: { label: "Crédito na loja", icon: "wallet", hint: "O valor entra na carteira do vendedor no Breshopper." },
  PIX: { label: "PIX", icon: "bolt", hint: "Pagamento feito fora do app. Fica só registrado." },
  CARTAO: { label: "Cartão", icon: "creditCard", hint: "Pagamento feito fora do app. Fica só registrado." },
};

function periodChips(period) {
  return `
    <div class="filter-chips" role="group" aria-label="Período">
      ${PERIODS.map(p => `<button class="filter-chip state-layer${period === p.id ? " is-selected" : ""}" data-action="finance-period" data-period="${p.id}" aria-pressed="${period === p.id}">${period === p.id ? icon("check", "icon icon-sm") : ""}${p.label}</button>`).join("")}
    </div>`;
}

function loadingView(text) {
  return `<div class="empty-state" role="status"><span class="spinner" aria-hidden="true"></span><span>${text}</span></div>`;
}

function errorView(error, action) {
  return `<div class="empty-state"><span class="empty-icon">${icon("error")}</span><strong>Não foi possível carregar</strong><span>${esc(error)}</span>
    <button class="filled-button state-layer" data-action="${action}">Tentar novamente</button></div>`;
}

function page(active, header, body) {
  return `
    <main class="page store-page has-nav">
      ${header}
      ${body}
    </main>
    ${storeNavView(active)}`;
}

// ---------- Início: resumo financeiro ----------
export function storeHomeView({ usuario, loja, period, data, error }) {
  const header = `
    <header class="greeting"><p>Olá, ${esc(firstName(usuario?.nome))} · ${esc(PERFIS[loja.perfil] || loja.perfil)}</p><h1>Resumo financeiro</h1></header>
    ${periodChips(period)}`;
  if (error) return page("inicio", header, errorView(error, "finance-reload"));
  if (!data) return page("inicio", header, loadingView("Calculando o financeiro da loja…"));
  const r = data.resumo;
  const pendente = Number(r.a_pagar_vendedores) > 0;
  return page("inicio", header, `
    <section class="finance-hero" aria-label="Receitas do período">
      <span class="balance-label">${icon("trendingUp")}Receitas (vendas)</span>
      <strong class="balance-value">${formatBRL(r.total_vendido)}</strong>
      <span class="finance-count">${plural(r.quantidade_vendas, "venda", "vendas")} no período</span>
    </section>

    <section class="finance-tiles" aria-label="Resultado do período">
      <div class="finance-tile tile-store"><span>${icon("storefront", "icon icon-sm")}Parte da loja</span><strong>${formatBRL(r.receita_loja)}</strong></div>
      <div class="finance-tile tile-seller"><span>${icon("trendingDown", "icon icon-sm")}Pago a vendedores</span><strong>${formatBRL(r.pago_vendedores)}</strong></div>
    </section>

    <a class="payable-card state-layer${pendente ? " has-pending" : ""}" href="#/despesas">
      <span class="payable-icon">${icon(pendente ? "hourglass" : "check")}</span>
      <span class="payable-text">
        <span>A pagar aos vendedores</span>
        <strong>${formatBRL(r.a_pagar_vendedores)}</strong>
        <small>${pendente ? `${plural(r.repasses_pendentes, "pagamento pendente", "pagamentos pendentes")} · todas as datas` : "Nenhum pagamento pendente"}</small>
      </span>
      <span class="payable-go">${icon("chevronRight")}</span>
    </a>

    ${r.quantidade_vendas ? `
    <section class="split-preview" aria-label="Divisão das vendas do período">
      ${splitPreviewView({ venda: toCents(r.total_vendido), cliente: toCents(r.parte_vendedores), loja: toCents(r.receita_loja) }, { clienteLabel: "Vendedores" })}
    </section>

    <section aria-labelledby="sellersTitle">
      <h2 class="section-title" id="sellersTitle">Por vendedor</h2>
      <div class="list">
        ${data.vendedores.map(v => `
          <div class="list-item">
            <span class="list-icon">${icon("person")}</span>
            <span class="list-text"><strong>${esc(v.nome)}</strong><span>${plural(v.quantidade_vendas, "venda", "vendas")}${Number(v.a_pagar) > 0 ? ` · a pagar ${formatBRL(v.a_pagar)}` : " · pago"}</span></span>
            <strong class="product-price">${formatBRL(v.total_vendedor)}</strong>
          </div>`).join("")}
      </div>
    </section>` : `<div class="empty-state"><span class="empty-icon">${icon("trendingUp")}</span><strong>Nenhuma venda neste período</strong><span>As vendas registradas pela loja aparecem aqui.</span></div>`}`);
}

// ---------- Receitas: vendas do período ----------
export function storeIncomeView({ period, data, error }) {
  const header = `<header class="greeting"><p>Entradas das vendas</p><h1>Receitas</h1></header>${periodChips(period)}`;
  if (error) return page("receitas", header, errorView(error, "finance-reload"));
  if (!data) return page("receitas", header, loadingView("Carregando as receitas…"));
  const r = data.resumo;
  if (!r.quantidade_vendas) {
    return page("receitas", header, `<div class="empty-state"><span class="empty-icon">${icon("trendingUp")}</span><strong>Nenhuma venda neste período</strong><span>Registre vendas em Produtos › Disponíveis › Vender.</span></div>`);
  }
  return page("receitas", header, `
    <section class="finance-tiles" aria-label="Totais do período">
      <div class="finance-tile"><span>${icon("sell", "icon icon-sm")}Total vendido</span><strong>${formatBRL(r.total_vendido)}</strong></div>
      <div class="finance-tile tile-store"><span>${icon("storefront", "icon icon-sm")}Parte da loja</span><strong>${formatBRL(r.receita_loja)}</strong></div>
    </section>
    <section aria-labelledby="salesTitle">
      <h2 class="section-title" id="salesTitle">${plural(r.quantidade_vendas, "venda", "vendas")}</h2>
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
    </section>`);
}

// ---------- Despesas: pagamentos aos vendedores ----------
export const EXPENSE_FILTERS = [
  { id: "PENDENTE", label: "A pagar" },
  { id: "PAGO", label: "Pagos" },
  { id: "TODOS", label: "Todos" },
];

function payoutItemView(r) {
  const pago = r.status === "PAGO";
  const forma = FORMAS[r.forma_pagamento];
  return `
    <article class="list-item payout-item">
      <span class="list-icon${pago ? "" : " is-pending"}">${icon(pago ? "check" : "hourglass")}</span>
      <span class="list-text">
        <strong>${esc(r.vendedor_nome)}</strong>
        <span>${esc(r.produto_nome)} · vendido em ${esc(formatDate(r.venda_data_hora))}</span>
        ${pago
          ? `<span class="product-seller">${icon(forma?.icon || "check", "icon icon-sm")}Pago via ${esc(forma?.label || r.forma_pagamento)} · ${esc(DATA_HORA.format(new Date(r.pago_em)))}</span>`
          : `<span class="status-chip status-tertiary">A pagar</span>`}
      </span>
      <span class="product-trailing">
        <strong class="product-price">${formatBRL(r.valor)}</strong>
        ${pago ? "" : `<button class="filled-button state-layer" data-action="pay" data-id="${r.id}">Pagar</button>`}
      </span>
    </article>`;
}

export function storeExpensesView({ filter, list, error }) {
  const header = `<header class="greeting"><p>Parte dos vendedores nas vendas</p><h1>Despesas</h1></header>`;
  if (error) return page("despesas", header, errorView(error, "expenses-reload"));
  if (!list) return page("despesas", header, loadingView("Carregando os pagamentos…"));
  const pendentes = list.filter(r => r.status === "PENDENTE");
  const pagos = list.filter(r => r.status === "PAGO");
  const sum = rs => rs.reduce((acc, r) => acc + toCents(r.valor), 0) / 100;
  const shown = filter === "TODOS" ? list : list.filter(r => r.status === filter);
  const empty = {
    PENDENTE: ["Nenhum vendedor a pagar", "Quando a loja vender um produto, a parte do vendedor aparece aqui para pagamento."],
    PAGO: ["Nenhum pagamento registrado", "Os pagamentos aos vendedores aparecem aqui."],
    TODOS: ["Nenhuma despesa ainda", "As despesas surgem a partir das vendas da loja."],
  }[filter];
  return page("despesas", `${header}
    <section class="finance-tiles" aria-label="Totais">
      <div class="finance-tile tile-pending"><span>${icon("hourglass", "icon icon-sm")}A pagar</span><strong>${formatBRL(sum(pendentes))}</strong><small>${plural(pendentes.length, "pagamento", "pagamentos")}</small></div>
      <div class="finance-tile tile-seller"><span>${icon("check", "icon icon-sm")}Já pago</span><strong>${formatBRL(sum(pagos))}</strong><small>${plural(pagos.length, "pagamento", "pagamentos")}</small></div>
    </section>
    <div class="filter-chips" role="group" aria-label="Filtrar despesas">
      ${EXPENSE_FILTERS.map(f => `<button class="filter-chip state-layer${filter === f.id ? " is-selected" : ""}" data-action="expenses-filter" data-filter="${f.id}" aria-pressed="${filter === f.id}">${filter === f.id ? icon("check", "icon icon-sm") : ""}${f.label}</button>`).join("")}
    </div>`,
    shown.length
      ? `<section class="list" aria-label="Pagamentos aos vendedores">${shown.map(payoutItemView).join("")}</section>`
      : `<div class="empty-state"><span class="empty-icon">${icon("trendingDown")}</span><strong>${empty[0]}</strong><span>${empty[1]}</span></div>`);
}

export function payDialogContent(r) {
  return `
    <p class="dialog-text">Pagar <strong>${formatBRL(r.valor)}</strong> a <strong>${esc(r.vendedor_nome)}</strong> pela venda de <strong>${esc(r.produto_nome)}</strong> (${esc(r.referencia)}).</p>
    <fieldset class="choice-group">
      <legend class="field-label-static">Forma de pagamento</legend>
      ${Object.entries(FORMAS).map(([id, f]) => `
        <label class="choice state-layer">
          <input type="radio" name="forma" value="${id}">
          <span class="choice-icon">${icon(f.icon)}</span>
          <span class="choice-text"><strong>${f.label}</strong><span>${f.hint}</span></span>
        </label>`).join("")}
    </fieldset>
    <p class="field-support choice-error" id="dForma-support" role="alert"></p>
    <p class="dialog-text">O pagamento não pode ser desfeito.</p>`;
}

// ---------- Cliente: saldo e extrato ----------
export function balanceCardView(conta, error) {
  const value = conta ? formatBRL(conta.saldo) : "—";
  const aReceber = conta && Number(conta.a_receber) > 0;
  const note = error
    ? "Não foi possível atualizar o saldo agora."
    : conta && Number(conta.saldo) > 0
      ? "Créditos na loja recebidos pelas suas vendas. Usar na loja e sacar por PIX: em breve."
      : "Quando a loja pagar a sua parte de uma venda em crédito, o valor aparece aqui.";
  return `
    <section class="balance-card" aria-labelledby="balanceLabel" aria-busy="${!conta && !error}">
      <span class="balance-label" id="balanceLabel">${icon("wallet")}Saldo disponível</span>
      <strong class="balance-value">${value}</strong>
      ${aReceber ? `<span class="balance-pending">${icon("hourglass", "icon icon-sm")}A receber da loja: <strong>${formatBRL(conta.a_receber)}</strong></span>` : ""}
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
      </div>` : `<div class="empty-state"><span class="empty-icon">${icon("wallet")}</span><strong>Nenhuma movimentação ainda</strong><span>Entregue um produto em uma loja parceira. Quando ele for vendido e a loja pagar em crédito, o valor aparece aqui.</span></div>`}
    </section>`;
}
