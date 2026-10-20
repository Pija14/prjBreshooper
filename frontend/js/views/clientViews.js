// Views de Clientes (cadastro) e Relatórios da Área da loja.
import { esc, icon, initials } from "./ui.js";

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
    <article class="list-item client-item">
      <span class="client-avatar" aria-hidden="true">${esc(initials(c.nome))}</span>
      <span class="list-text">
        <strong>${esc(c.nome)}</strong>
        <span class="product-seller" title="${esc(c.email)}">${icon("mail", "icon icon-sm")}<span class="truncate">${esc(c.email)}</span></span>
        ${c.telefone ? `<span class="product-seller">${icon("phone", "icon icon-sm")}<span class="truncate">${esc(c.telefone)}</span></span>` : ""}
        <span class="client-stats">${esc(resumo || "Nenhuma movimentação nesta loja")}</span>
      </span>
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
  return `<div class="list">${shown.map(c => clientItemView(c, stats)).join("")}</div>`;
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
