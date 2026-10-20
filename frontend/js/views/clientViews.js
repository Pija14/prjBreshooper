// Views de Clientes (cadastro) e Relatórios da Área da loja.
import { esc, formatBRL, icon, initials } from "./ui.js";

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const normalize = text => String(text || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Busca por nome, e-mail ou telefone, sem diferenciar acentos e maiúsculas.
export function filterClients(clients, query) {
  const q = normalize(query).trim();
  const digits = q.replace(/\D/g, "");
  if (!q) return clients;
  return clients.filter(c => normalize(c.nome).includes(q) || normalize(c.email).includes(q)
    || (digits && String(c.telefone || "").replace(/\D/g, "").includes(digits)));
}

function clientItemView(c, stats) {
  const s = stats.get(c.id) || { entregues: 0, comprados: 0 };
  const resumo = [s.entregues && plural(s.entregues, "produto entregue", "produtos entregues"), s.comprados && plural(s.comprados, "compra", "compras")].filter(Boolean).join(" · ");
  return `
    <article class="list-item client-item is-clickable" data-action="client-details" data-id="${c.id}">
      <div class="product-main client-main" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${esc(c.nome)}: ver vendas e compras">
      <span class="client-avatar" aria-hidden="true">${esc(initials(c.nome))}</span>
      <span class="list-text">
        <strong>${esc(c.nome)}</strong>
        <span class="product-seller" title="${esc(c.email)}">${icon("mail", "icon icon-sm")}<span class="truncate">${esc(c.email)}</span></span>
        ${c.telefone ? `<span class="product-seller">${icon("phone", "icon icon-sm")}<span class="truncate">${esc(c.telefone)}</span></span>` : ""}
        <span class="client-stats">${esc(resumo || "Nenhuma movimentação nesta loja")}</span>
      </span>
      </div>
      <button class="icon-button state-layer" data-action="edit-client" data-id="${c.id}" aria-label="Editar ${esc(c.nome)}">${icon("edit")}</button>
    </article>`;
}

export function clientListView(clients, stats, query) {
  const shown = filterClients(clients, query);
  if (!clients.length) {
    return `<div class="empty-state"><span class="empty-icon">${icon("group")}</span><strong>Nenhum cliente cadastrado</strong><span>Cadastre quem entrega ou compra produtos na loja.</span></div>`;
  }
  if (!shown.length) {
    return `<div class="empty-state"><span class="empty-icon">${icon("search")}</span><strong>Nenhum cliente encontrado</strong><span>Confira a busca ou cadastre um novo cliente.</span></div>`;
  }
  return `<div class="list card-grid">${shown.map(c => clientItemView(c, stats)).join("")}</div>`;
}

export function clientCountText(clients, query) {
  const shown = filterClients(clients, query).length;
  return query.trim() ? `${plural(shown, "cliente encontrado", "clientes encontrados")} de ${clients.length}` : plural(clients.length, "cliente", "clientes");
}

export function clientsView({ clients, stats, query = "" }) {
  return `
    <main class="page store-page">
      <header class="greeting"><p>Cadastro de clientes</p><h1>Clientes</h1></header>
      <label class="search-field">
        ${icon("search")}
        <input id="clientSearch" type="search" placeholder="Buscar por nome, e-mail ou telefone" autocomplete="off" value="${esc(query)}" aria-label="Buscar clientes">
      </label>
      <p class="statement-note" id="clientCount" aria-live="polite">${esc(clientCountText(clients, query))}</p>
      <section id="clientList" aria-label="Clientes">${clientListView(clients, stats, query)}</section>
    </main>
    <button class="fab state-layer" data-action="new-client">${icon("personAdd")}<span>Novo cliente</span></button>`;
}

// ---------- Modal do cliente: vendas (produtos que entregou) e compras ----------
const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const formatDate = iso => DATA.format(new Date(iso)).replace(/\./g, "");
const toCents = v => Math.round(Number(v || 0) * 100);
const STATUS_VENDA = {
  RECEBIDO: ["Aguardando avaliação", "status-tertiary"],
  DISPONIVEL: ["À venda", "status-primary"],
  VENDIDO: ["Vendido", "status-secondary"],
  CANCELADO: ["Cancelado", "status-error"],
};

function saleRowView({ produto, avaliacao, venda }) {
  const [label, tone] = STATUS_VENDA[produto.status] || [produto.status, ""];
  const valor = venda?.valor_venda ?? avaliacao?.valor_venda ?? produto.valor_venda;
  const parte = venda?.valor_usuario ?? avaliacao?.valor_usuario;
  return `
    <li class="history-row">
      <span class="history-text">
        <strong>${esc(produto.nome)}</strong>
        <span><span class="status-chip ${tone}">${label}</span>${venda ? ` ${esc(formatDate(venda.data_hora))}` : ""}</span>
      </span>
      <span class="money-stack">
        <strong>${valor != null ? formatBRL(valor) : "—"}</strong>
        <small>${parte != null ? `parte do cliente ${formatBRL(parte)}` : "sem avaliação"}</small>
      </span>
    </li>`;
}

function purchaseRowView({ venda, produto }) {
  return `
    <li class="history-row">
      <span class="history-text">
        <strong>${esc(produto?.nome || "Produto")}</strong>
        <span>${esc(formatDate(venda.data_hora))} · ${esc(venda.referencia)}</span>
      </span>
      <span class="money-stack"><strong>${formatBRL(venda.valor_venda)}</strong><small>pago</small></span>
    </li>`;
}

export function clientDetailsView({ cliente, entregues, compras }) {
  const sum = (rows, pick) => rows.reduce((acc, r) => acc + toCents(pick(r)), 0) / 100;
  const vendidos = entregues.filter(r => r.venda);
  const totalVendas = sum(vendidos, r => r.venda.valor_venda);
  const parteCliente = sum(vendidos, r => r.venda.valor_usuario);
  const totalCompras = sum(compras, r => r.venda.valor_venda);
  return `
    <div class="client-summary">
      <span class="client-avatar" aria-hidden="true">${esc(initials(cliente.nome))}</span>
      <span class="list-text">
        <span class="truncate">${esc(cliente.email)}</span>
        ${cliente.telefone ? `<span>${esc(cliente.telefone)}</span>` : ""}
      </span>
    </div>

    <section class="history" aria-labelledby="histSales">
      <header class="history-header">
        <h3 id="histSales">${icon("trendingUp", "icon icon-sm")}Vendas <span class="history-count">${entregues.length}</span></h3>
        ${vendidos.length ? `<span class="history-total">${formatBRL(totalVendas)}<small>parte do cliente ${formatBRL(parteCliente)}</small></span>` : ""}
      </header>
      ${entregues.length
        ? `<ul class="history-list">${entregues.map(saleRowView).join("")}</ul>`
        : `<p class="history-empty">Nenhum produto entregue nesta loja.</p>`}
    </section>

    <section class="history" aria-labelledby="histPurchases">
      <header class="history-header">
        <h3 id="histPurchases">${icon("shoppingBag", "icon icon-sm")}Compras <span class="history-count">${compras.length}</span></h3>
        ${compras.length ? `<span class="history-total">${formatBRL(totalCompras)}</span>` : ""}
      </header>
      ${compras.length
        ? `<ul class="history-list">${compras.map(purchaseRowView).join("")}</ul>`
        : `<p class="history-empty">Nenhuma compra nesta loja.</p>`}
    </section>`;
}

export function reportsView() {
  return `
    <main class="page store-page">
      <header class="greeting"><p>Análises da loja</p><h1>Relatórios</h1></header>
      <div class="empty-state">
        <span class="empty-icon">${icon("barChart")}</span>
        <strong>Relatórios em breve</strong>
        <span>Aqui você vai acompanhar vendas, receitas e desempenho da loja ao longo do tempo.</span>
      </div>
    </main>`;
}
