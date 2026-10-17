// View da área autenticada inicial (Fase 2 do roadmap): saudação, saldo e próximas ações.
// As funções ainda não construídas aparecem como "Em breve" — sem números ou dados fictícios.
import { avatarView, brandMark, esc, firstName, formatBRL, icon } from "./ui.js";

const PERFIS = { ADMINISTRADOR: "Administrador", OPERADOR: "Operador" };
const DATA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const ACTIONS = [
  ["shoppingBag", "Comprar", "Produtos disponíveis nas lojas parceiras"],
  ["addBox", "Vender", "Entregue um produto para avaliação"],
  ["inventory", "Meus produtos", "Acompanhe seus produtos em loja"],
];

export function homeView({ usuario, lojas = [] }) {
  const date = DATA.format(new Date()).replace(/^./, c => c.toUpperCase());
  return `
    <div class="app-shell">
      <header class="top-app-bar">
        <div class="brand">${brandMark(36)}<span class="brand-name">Breshopper</span></div>
        <button class="avatar-button state-layer" data-action="account-menu" aria-label="Conta de ${esc(usuario?.nome)}" aria-haspopup="menu" aria-expanded="false">${avatarView(usuario)}</button>
      </header>
      <main class="page">
        <header class="greeting">
          <p>${esc(date)}</p>
          <h1>${greeting()}${firstName(usuario?.nome) ? `, ${esc(firstName(usuario.nome))}` : ""}</h1>
        </header>

        <section class="balance-card" aria-labelledby="balanceLabel">
          <span class="balance-label" id="balanceLabel">${icon("wallet")}Saldo disponível</span>
          <strong class="balance-value">${formatBRL(0)}</strong>
          <p class="balance-note">Quando um produto seu for vendido, a sua parte aparece aqui como crédito.</p>
        </section>

        <section aria-labelledby="actionsTitle">
          <h2 class="section-title" id="actionsTitle">O que você quer fazer?</h2>
          <div class="action-grid">
            ${ACTIONS.map(([ic, title, text]) => `
              <article class="action-card">
                <span class="action-icon">${icon(ic)}</span>
                <strong>${title}</strong>
                <span>${text}</span>
                <span class="chip">Em breve</span>
              </article>`).join("")}
          </div>
        </section>

        ${lojas.length ? `
        <section aria-labelledby="storesTitle">
          <h2 class="section-title" id="storesTitle">Lojas em que você atua</h2>
          <div class="list">
            ${lojas.map(loja => `
              <div class="list-item">
                <span class="list-icon">${icon("storefront")}</span>
                <span class="list-text"><strong>${esc(loja.loja_nome)}</strong><span>Cadastro e avaliação de produtos em breve</span></span>
                <span class="chip chip-tonal">${esc(PERFIS[loja.perfil] || loja.perfil)}</span>
              </div>`).join("")}
          </div>
        </section>` : ""}
      </main>
    </div>`;
}

export function accountMenuView(usuario) {
  return `
    <div class="menu" role="menu" aria-label="Conta">
      <div class="menu-header">${avatarView(usuario)}<span><strong>${esc(usuario?.nome)}</strong><span>${esc(usuario?.email)}</span></span></div>
      <button class="menu-item state-layer" role="menuitem" data-action="logout">${icon("logout")}Sair da conta</button>
    </div>`;
}
