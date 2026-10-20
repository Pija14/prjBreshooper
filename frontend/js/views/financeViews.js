// Views financeiras: Início (resumo), Receitas e Despesas da loja, diálogo de pagamento ao vendedor
// e, na área do cliente, saldo e extrato da carteira.
import { PERIODS, parseDay } from "../services/finance.js";
import { esc, firstName, formatBRL, icon } from "./ui.js";
import { splitPreviewView, storeNavView } from "./operatorViews.js";

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const toCents = value => Math.round(Number(value || 0) * 100);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const PERFIS = { ADMINISTRADOR: "Administrador", OPERADOR: "Operador" };

export const FORMAS = {
  CREDITO_LOJA: { label: "Crédito na loja", icon: "wallet", hint: "O valor entra na carteira do vendedor no Breshopper." },
  PIX: { label: "PIX", icon: "bolt", hint: "Pagamento feito fora do app. Fica só registrado." },
  CARTAO: { label: "Cartão", icon: "creditCard", hint: "Pagamento feito fora do app. Fica só registrado." },
};

const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function customLabel(custom) {
  const de = parseDay(custom?.de), ate = parseDay(custom?.ate);
  if (!de && !ate) return "Personalizado";
  if (de && ate) return de.getTime() === ate.getTime() ? DIA_CURTO.format(de) : `${DIA_CURTO.format(de)} – ${DIA_CURTO.format(ate)}`;
  return de ? `Desde ${DIA_CURTO.format(de)}` : `Até ${DIA_CURTO.format(ate)}`;
}

// Chips de período em uma linha com rolagem horizontal, como nos apps de banco.
function periodChips(period, custom) {
  return `
    <div class="filter-chips chip-scroll" role="group" aria-label="Período">
      ${PERIODS.map(p => {
        const selected = period === p.id;
        const label = p.id === "PERSONALIZADO" && selected ? customLabel(custom) : p.label;
        const lead = selected ? icon("check", "icon icon-sm") : p.id === "PERSONALIZADO" ? icon("calendar", "icon icon-sm") : "";
        return `<button class="filter-chip state-layer${selected ? " is-selected" : ""}" data-action="finance-period" data-period="${p.id}" aria-pressed="${selected}">${lead}${esc(label)}</button>`;
      }).join("")}
    </div>`;
}

// ---------- Extrato: agrupamento por dia (no fuso do aparelho) ----------
const DIA_LONGO = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" });
const DIA_LONGO_ANO = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function dayLabel(date, now = new Date()) {
  const key = dayKey(date);
  if (key === dayKey(now)) return "Hoje";
  if (key === dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return "Ontem";
  const text = (date.getFullYear() === now.getFullYear() ? DIA_LONGO : DIA_LONGO_ANO).format(date).replace(/\./g, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// items já vêm do mais recente ao mais antigo; mantém a ordem dentro de cada dia.
function groupByDay(items, getDate) {
  const groups = [];
  for (const item of items) {
    const date = new Date(getDate(item));
    const key = dayKey(date);
    if (groups.at(-1)?.key !== key) groups.push({ key, date, items: [] });
    groups.at(-1).items.push(item);
  }
  return groups;
}

function dayStatementView(groups, { renderItem, dayTotal, label }) {
  return `
    <section class="statement" aria-label="${label}">
      ${groups.map(g => `
        <section class="statement-day" aria-labelledby="day-${g.key}">
          <header class="statement-day-header">
            <h2 id="day-${g.key}">${esc(dayLabel(g.date))}</h2>
            ${dayTotal(g.items)}
          </header>
          <div class="list">${g.items.map(renderItem).join("")}</div>
        </section>`).join("")}
    </section>`;
}

export function periodDialogContent(custom) {
  const today = dayKey(new Date());
  return `
    <p class="dialog-text">Escolha o intervalo de datas. As duas datas entram no período.</p>
    <div class="field-row date-row">
      <div class="field"><label class="field-label" for="dDe">De</label><input id="dDe" class="input" type="date" max="${today}" value="${esc(custom?.de || "")}"></div>
      <div class="field"><label class="field-label" for="dAte">Até</label><input id="dAte" class="input" type="date" max="${today}" value="${esc(custom?.ate || today)}"></div>
    </div>
    <p class="field-support choice-error" id="dPeriodo-support" role="alert"></p>`;
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
export function storeHomeView({ usuario, loja, period, custom, data, error }) {
  const header = `
    <header class="greeting"><p>Olá, ${esc(firstName(usuario?.nome))} · ${esc(PERFIS[loja.perfil] || loja.perfil)}</p><h1>Resumo financeiro</h1></header>
    ${periodChips(period, custom)}`;
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
function incomeItemView(v, expanded) {
  const split = { venda: toCents(v.valor_venda), cliente: toCents(v.valor_usuario), loja: toCents(v.valor_loja) };
  return `
    <article class="list-item product-item statement-item is-expandable${expanded ? " is-expanded" : ""}" data-action="toggle-income" data-id="${v.venda_id}">
      <div class="product-main" role="button" tabindex="0" aria-expanded="${expanded}" aria-controls="income-${v.venda_id}" aria-label="${esc(v.produto_nome)}: ${expanded ? "ocultar" : "ver"} divisão de valores">
        <span class="list-icon">${icon("sold")}</span>
        <span class="list-text">
          <strong>${esc(v.produto_nome)}</strong>
          <span>${esc(HORA.format(new Date(v.data_hora)))} · Comprador: ${esc(v.comprador_nome)}</span>
          <span>Vendedor: ${esc(v.vendedor_nome)} · ${esc(v.referencia)}</span>
        </span>
      </div>
      <span class="money-stack"><strong class="amount-in">+ ${formatBRL(v.valor_loja)}</strong><small>da loja</small></span>
      <span class="expand-icon" aria-hidden="true">${icon("expand")}</span>
      ${expanded ? `<div class="product-details" id="income-${v.venda_id}">${splitPreviewView(split, { clienteLabel: "Vendedor" })}</div>` : ""}
    </article>`;
}

export function storeIncomeView({ period, custom, data, error, expandedId = null }) {
  const header = `<header class="greeting"><p>Entradas das vendas</p><h1>Receitas</h1></header>${periodChips(period, custom)}`;
  if (error) return page("receitas", header, errorView(error, "finance-reload"));
  if (!data) return page("receitas", header, loadingView("Carregando as receitas…"));
  const r = data.resumo;
  if (!r.quantidade_vendas) {
    return page("receitas", header, `<div class="empty-state"><span class="empty-icon">${icon("trendingUp")}</span><strong>Nenhuma venda neste período</strong><span>Registre vendas em Produtos › Disponíveis › Vender.</span></div>`);
  }
  const sumLoja = vs => vs.reduce((acc, v) => acc + toCents(v.valor_loja), 0) / 100;
  return page("receitas", header, `
    <section class="finance-hero" aria-label="Receita da loja no período">
      <span class="balance-label">${icon("storefront")}Receita da loja</span>
      <strong class="balance-value">${formatBRL(r.receita_loja)}</strong>
      <span class="finance-count">${plural(r.quantidade_vendas, "venda", "vendas")} no período · toque numa venda para ver a divisão</span>
    </section>
    ${dayStatementView(groupByDay(data.vendas, v => v.data_hora), {
      label: "Extrato de receitas",
      renderItem: v => incomeItemView(v, v.venda_id === expandedId),
      dayTotal: vs => `<span class="statement-day-total amount-in">+ ${formatBRL(sumLoja(vs))}</span>`,
    })}`);
}

// ---------- Despesas: pagamentos aos vendedores ----------
export const EXPENSE_FILTERS = [
  { id: "PENDENTE", label: "A pagar" },
  { id: "PAGO", label: "Pagos" },
  { id: "TODOS", label: "Todos" },
];

function payoutItemView(r, expanded) {
  const pago = r.status === "PAGO";
  const forma = FORMAS[r.forma_pagamento];
  const split = { venda: toCents(r.valor_venda), cliente: toCents(r.valor), loja: toCents(r.valor_loja) };
  return `
    <article class="list-item payout-item product-item statement-item is-expandable${expanded ? " is-expanded" : ""}" data-action="toggle-expense" data-id="${r.id}">
      <div class="product-main" role="button" tabindex="0" aria-expanded="${expanded}" aria-controls="expense-${r.id}" aria-label="${esc(r.vendedor_nome)}, ${esc(r.produto_nome)}: ${expanded ? "ocultar" : "ver"} divisão de valores">
      <span class="list-icon${pago ? "" : " is-pending"}">${icon(pago ? "check" : "hourglass")}</span>
      <span class="list-text">
        <strong>${esc(r.vendedor_nome)}</strong>
        <span>${esc(r.produto_nome)} · ${esc(r.referencia)}</span>
        ${pago
          ? `<span class="product-seller">${icon(forma?.icon || "check", "icon icon-sm")}Pago via ${esc(forma?.label || r.forma_pagamento)} · ${esc(HORA.format(new Date(r.pago_em)))}</span>`
          : `<span class="product-seller">Vendido às ${esc(HORA.format(new Date(r.venda_data_hora)))}</span><span class="status-chip status-tertiary">A pagar</span>`}
      </span>
      </div>
      <span class="product-trailing">
        <strong class="${pago ? "amount-out" : "product-price"}">${pago ? "− " : ""}${formatBRL(r.valor)}</strong>
        ${pago ? "" : `<button class="filled-button state-layer" data-action="pay" data-id="${r.id}">Pagar</button>`}
      </span>
      <span class="expand-icon" aria-hidden="true">${icon("expand")}</span>
      ${expanded ? `<div class="product-details" id="expense-${r.id}">${splitPreviewView(split, { clienteLabel: "Vendedor" })}</div>` : ""}
    </article>`;
}

export function storeExpensesView({ period, custom, filter, list, error, expandedId = null }) {
  const header = `<header class="greeting"><p>Parte dos vendedores nas vendas</p><h1>Despesas</h1></header>${periodChips(period, custom)}`;
  if (error) return page("despesas", header, errorView(error, "expenses-reload"));
  if (!list) return page("despesas", header, loadingView("Carregando os pagamentos…"));
  const pendentes = list.filter(r => r.status === "PENDENTE");
  const pagos = list.filter(r => r.status === "PAGO");
  const sum = rs => rs.reduce((acc, r) => acc + toCents(r.valor), 0) / 100;
  const shown = filter === "TODOS" ? list : list.filter(r => r.status === filter);
  const empty = {
    PENDENTE: ["Nenhum vendedor a pagar neste período", "Quando a loja vender um produto, a parte do vendedor aparece aqui para pagamento."],
    PAGO: ["Nenhum pagamento neste período", "Os pagamentos aos vendedores aparecem aqui."],
    TODOS: ["Nenhuma despesa neste período", "As despesas surgem a partir das vendas da loja."],
  }[filter];
  const dayTotal = rs => {
    const pago = sum(rs.filter(r => r.status === "PAGO")), aPagar = sum(rs.filter(r => r.status === "PENDENTE"));
    return `<span class="statement-day-total">${pago ? `<span class="amount-out">− ${formatBRL(pago)}</span>` : ""}${aPagar ? `<span class="amount-pending">${formatBRL(aPagar)} a pagar</span>` : ""}</span>`;
  };
  return page("despesas", `${header}
    <section class="finance-tiles" aria-label="Totais do período">
      <div class="finance-tile tile-pending"><span>${icon("hourglass", "icon icon-sm")}A pagar</span><strong>${formatBRL(sum(pendentes))}</strong><small>${plural(pendentes.length, "pagamento", "pagamentos")}</small></div>
      <div class="finance-tile tile-seller"><span>${icon("check", "icon icon-sm")}Pago</span><strong>${formatBRL(sum(pagos))}</strong><small>${plural(pagos.length, "pagamento", "pagamentos")}</small></div>
    </section>
    <div class="filter-chips" role="group" aria-label="Filtrar despesas">
      ${EXPENSE_FILTERS.map(f => `<button class="filter-chip state-layer${filter === f.id ? " is-selected" : ""}" data-action="expenses-filter" data-filter="${f.id}" aria-pressed="${filter === f.id}">${filter === f.id ? icon("check", "icon icon-sm") : ""}${f.label}</button>`).join("")}
    </div>
    <p class="statement-note">Pagos pela data do pagamento; a pagar pela data da venda.</p>`,
    shown.length
      ? dayStatementView(groupByDay(shown, r => r.data_referencia), {
        label: "Extrato de despesas",
        renderItem: r => payoutItemView(r, r.id === expandedId),
        dayTotal,
      })
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
