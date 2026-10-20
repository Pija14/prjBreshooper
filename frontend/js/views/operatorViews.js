// Views da área da loja (operador): painel, recebimento e avaliação de produtos.
import { avatarView, brandMark, esc, firstName, formatBRL, formatCents, icon } from "./ui.js";

export const STATUS = {
  RECEBIDO: { label: "Aguardando avaliação", tone: "tertiary" },
  DISPONIVEL: { label: "Disponível", tone: "primary" },
  VENDIDO: { label: "Vendido", tone: "secondary" },
  CANCELADO: { label: "Cancelado", tone: "error" },
};
export const FILTERS = [
  { id: "RECEBIDO", label: "Aguardando avaliação" },
  { id: "DISPONIVEL", label: "Disponíveis" },
  { id: "VENDIDO", label: "Vendidos" },
  { id: "TODOS", label: "Todos" },
];
export const CONDITIONS = ["Novo", "Seminovo", "Usado", "Com avarias"];
const PERFIS = { ADMINISTRADOR: "Administrador", OPERADOR: "Operador" };

// Menu lateral (navigation drawer M3): modal no celular; no desktop, fixo e recolhível (navigation rail).
const DRAWER = [
  { id: "inicio", href: "#/", icon: "home", label: "Início" },
  { id: "produtos", href: "#/produtos", icon: "inventory", label: "Produtos" },
  { group: "financeiro", icon: "wallet", label: "Financeiro", items: [
    { id: "despesas", href: "#/despesas", icon: "trendingDown", label: "Despesas" },
    { id: "receitas", href: "#/receitas", icon: "trendingUp", label: "Receitas" },
  ] },
  { divider: true },
  { id: "clientes", href: "#/clientes", icon: "group", label: "Clientes" },
  { id: "relatorios", href: "#/relatorios", icon: "barChart", label: "Relatórios", badge: "Em breve" },
];

function drawerLink(item, active, sub = false) {
  const current = active === item.id;
  return `<a class="drawer-item state-layer${sub ? " is-sub" : ""}${current ? " is-active" : ""}" href="${item.href}" data-action="drawer-link" title="${item.label}"${current ? ' aria-current="page"' : ""}>
    <span class="drawer-icon">${icon(item.icon)}</span><span class="drawer-label">${item.label}</span>${item.badge ? `<span class="drawer-badge">${item.badge}</span>` : ""}
  </a>`;
}

// financeOpen: grupo Financeiro aberto (sempre aberto quando a tela atual é Despesas ou Receitas).
function storeDrawerView(active, loja, { financeOpen = false } = {}) {
  return `
    <div class="drawer-scrim" data-action="close-drawer"></div>
    <nav class="drawer" id="storeDrawer" aria-label="Menu da loja">
      <div class="drawer-header">
        ${brandMark(32)}
        <span class="store-heading"><span class="store-overline">Área da loja</span><span class="drawer-store">${esc(loja.loja_nome)}</span></span>
      </div>
      ${DRAWER.map(item => {
        if (item.divider) return `<hr class="drawer-divider">`;
        if (!item.group) return drawerLink(item, active);
        const childActive = item.items.some(i => i.id === active);
        const open = financeOpen || childActive;
        return `
          <div class="drawer-group${open ? " is-open" : ""}${childActive ? " has-active" : ""}">
            <button type="button" class="drawer-item drawer-group-toggle state-layer" data-action="toggle-drawer-group" aria-expanded="${open}" aria-controls="drawer-group-${item.group}">
              <span class="drawer-icon">${icon(item.icon)}</span><span class="drawer-label">${item.label}</span><span class="drawer-chevron">${icon("expand")}</span>
            </button>
            <div class="drawer-group-items" id="drawer-group-${item.group}" role="group" aria-label="${item.label}">
              ${item.items.map(i => drawerLink(i, active, true)).join("")}
            </div>
          </div>`;
      }).join("")}
    </nav>`;
}

// Moldura da área da loja: botão do menu, marca e menu da conta; a loja atual aparece só no menu lateral.
export function storeShellView({ usuario, loja, content, active, financeOpen }) {
  return `
    <div class="app-shell store-shell">
      <header class="top-app-bar">
        <div class="brand">
          <button class="icon-button state-layer menu-button" data-action="toggle-drawer" aria-label="Menu" aria-controls="storeDrawer" aria-expanded="false">${icon("menu")}</button>
          ${brandMark(36)}
        </div>
        <button class="avatar-button state-layer" data-action="account-menu" aria-label="Conta de ${esc(usuario?.nome)}" aria-haspopup="menu" aria-expanded="false">${avatarView(usuario)}</button>
      </header>
      ${content}
    </div>
    ${storeDrawerView(active, loja, { financeOpen })}`;
}

function statusChip(status) {
  const s = STATUS[status] || { label: status, tone: "neutral" };
  return `<span class="status-chip status-${s.tone}">${esc(s.label)}</span>`;
}

const toCents = value => Math.round(Number(value) * 100);
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

// Detalhes do card (disponível ou vendido): divisão entre vendedor e loja; na venda, também referência e data.
function productDetailsView({ avaliacao, venda, comprador }) {
  const base = venda || avaliacao;
  if (!base) return `<p class="split-empty">Divisão não encontrada para este produto.</p>`;
  const split = { venda: toCents(base.valor_venda), cliente: toCents(base.valor_usuario), loja: toCents(base.valor_loja) };
  return `
    ${splitPreviewView(split, { clienteLabel: "Vendedor" })}
    ${venda ? `<dl class="sale-meta">
      <div><dt>Comprador</dt><dd>${esc(comprador?.nome || "—")}</dd></div>
      <div><dt>Referência</dt><dd>${esc(venda.referencia)}</dd></div>
      <div><dt>Data</dt><dd>${esc(DATA_HORA.format(new Date(venda.data_hora)))}</dd></div>
    </dl>` : ""}`;
}

export function productItemView(p, { vendedor, categoria, marca, comprador, avaliacao, venda, expanded = false }) {
  const meta = [marca?.nome, categoria?.nome, p.estado_conservacao].filter(Boolean).join(" · ");
  const price = p.valor_venda != null ? `<strong class="product-price">${formatBRL(p.valor_venda)}</strong>` : "";
  const trailing = p.status === "RECEBIDO"
    ? `<button class="tonal-button state-layer" data-action="evaluate" data-id="${p.id}">Avaliar</button>`
    : p.status === "DISPONIVEL"
      ? `<span class="product-trailing">${price}<button class="tonal-button state-layer" data-action="sell" data-id="${p.id}">Vender</button></span>`
      : price;
  const expandable = p.status === "DISPONIVEL" || p.status === "VENDIDO";
  const toggle = expandable ? ` data-action="toggle-details" data-id="${p.id}"` : "";
  return `
    <article class="list-item product-item${expandable ? " is-expandable" : ""}${expanded ? " is-expanded" : ""}"${toggle}>
      <div class="product-main"${expandable ? ` role="button" tabindex="0" aria-expanded="${expanded}" aria-controls="details-${p.id}" aria-label="${esc(p.nome)}: ${expanded ? "ocultar" : "ver"} divisão de valores"` : ""}>
      <span class="list-icon">${icon(p.status === "VENDIDO" ? "sold" : p.status === "DISPONIVEL" ? "sell" : "hourglass")}</span>
      <span class="list-text">
        <strong>${esc(p.nome)}</strong>
        <span>${esc(meta || "Sem categoria e marca")}</span>
        <span class="product-seller">${icon("person", "icon icon-sm")}${esc(vendedor?.nome || "Vendedor não encontrado")}</span>
        ${comprador ? `<span class="product-seller">${icon("shoppingBag", "icon icon-sm")}Comprado por ${esc(comprador.nome)}</span>` : ""}
        ${statusChip(p.status)}
      </span>
      </div>
      ${trailing}
      ${expandable ? `<span class="expand-icon" aria-hidden="true">${icon("expand")}</span>` : ""}
      ${expanded ? `<div class="product-details" id="details-${p.id}">${productDetailsView({ avaliacao, venda, comprador })}</div>` : ""}
    </article>`;
}

export function storeDashboardView({ usuario, loja, counts, filter, items, expandedId = null }) {
  const filtered = filter === "TODOS" ? items : items.filter(i => i.produto.status === filter);
  const empty = {
    RECEBIDO: ["Nenhum produto aguardando avaliação", "Quando um cliente entregar um produto, registre-o em Receber produto."],
    DISPONIVEL: ["Nenhum produto disponível", "Produtos avaliados aparecem aqui, prontos para venda."],
    VENDIDO: ["Nenhum produto vendido ainda", "As vendas da loja aparecerão aqui."],
    TODOS: ["Nenhum produto nesta loja", "Comece registrando o primeiro produto recebido."],
  }[filter];
  return `
    <main class="page store-page">
      <header class="greeting">
        <p>Olá, ${esc(firstName(usuario?.nome))} · ${esc(PERFIS[loja.perfil] || loja.perfil)}</p>
        <h1>Produtos da loja</h1>
      </header>

      <section class="kpi-grid" aria-label="Resumo da loja">
        ${[["RECEBIDO", "hourglass", "aguardando avaliação"], ["DISPONIVEL", "sell", "disponíveis"], ["VENDIDO", "sold", "vendidos"]].map(([id, ic, label]) => `
          <button class="kpi state-layer${filter === id ? " is-active" : ""}" data-action="filter" data-filter="${id}" aria-pressed="${filter === id}">
            <span class="kpi-icon">${icon(ic)}</span>
            <strong>${counts[id] || 0}</strong>
            <span>${label}</span>
          </button>`).join("")}
      </section>

      <div class="filter-chips" role="group" aria-label="Filtrar produtos por status">
        ${FILTERS.map(f => `<button class="filter-chip state-layer${filter === f.id ? " is-selected" : ""}" data-action="filter" data-filter="${f.id}" aria-pressed="${filter === f.id}">${filter === f.id ? icon("check", "icon icon-sm") : ""}${f.label}</button>`).join("")}
      </div>

      ${filtered.length
        ? `<section class="list card-grid" aria-label="Produtos">${filtered.map(i => productItemView(i.produto, { ...i, expanded: i.produto.id === expandedId })).join("")}</section>`
        : `<div class="empty-state"><span class="empty-icon">${icon("receive")}</span><strong>${empty[0]}</strong><span>${empty[1]}</span></div>`}
    </main>
    <button class="fab state-layer" data-action="go-receive">${icon("receive")}<span>Receber produto</span></button>`;
}

function field({ id, label, control, hint = "" }) {
  return `
    <div class="field">
      <label class="field-label" for="${id}">${label}</label>
      ${control}
      <p class="field-support" id="${id}-support" data-hint="${esc(hint)}">${esc(hint)}</p>
    </div>`;
}

function options(list, selected, placeholder) {
  return `<option value="">${placeholder}</option>` + list.map(o => `<option value="${o.id}"${String(o.id) === String(selected ?? "") ? " selected" : ""}>${esc(o.nome)}${o.email ? ` — ${esc(o.email)}` : ""}</option>`).join("");
}

export function subpageHeader(title, subtitle = "") {
  return `
    <div class="subpage-header">
      <button class="icon-button state-layer" data-action="go-dashboard" aria-label="Voltar">${icon("arrowBack")}</button>
      <div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>
    </div>`;
}

export function receiveProductView({ sellers, categorias, marcas, values = {} }) {
  return `
    <main class="page form-page">
      ${subpageHeader("Receber produto", "Registre o produto que o cliente entregou na loja.")}
      <form id="receiveForm" class="form-card" novalidate>
        <h2 class="form-section">Cliente que entregou</h2>
        <div class="field-row">
          ${field({ id: "fSeller", label: "Cliente vendedor", hint: sellers.length ? "Quem receberá a parte da venda." : "Nenhum cliente cadastrado. Cadastre o cliente ao lado.",
            control: `<select id="fSeller" class="input" required>${options(sellers, values.seller, "Selecione o cliente")}</select>` })}
          <button type="button" class="outlined-button state-layer" data-action="new-customer">${icon("personAdd", "icon icon-sm")}Novo cliente</button>
        </div>

        <h2 class="form-section">Produto</h2>
        ${field({ id: "fName", label: "Nome do produto", hint: "Ex.: Raquete Babolat Pure Drive", control: `<input id="fName" class="input" maxlength="150" autocomplete="off" required value="${esc(values.nome || "")}">` })}
        <div class="field-row">
          ${field({ id: "fCategory", label: "Categoria", control: `<select id="fCategory" class="input">${options(categorias, values.categoria, "Sem categoria")}</select>` })}
          <button type="button" class="outlined-button state-layer" data-action="new-category">${icon("add", "icon icon-sm")}Nova</button>
        </div>
        <div class="field-row">
          ${field({ id: "fBrand", label: "Marca", control: `<select id="fBrand" class="input">${options(marcas, values.marca, "Sem marca")}</select>` })}
          <button type="button" class="outlined-button state-layer" data-action="new-brand">${icon("add", "icon icon-sm")}Nova</button>
        </div>
        <fieldset class="chip-field">
          <legend class="field-label-static">Estado de conservação</legend>
          <input type="hidden" id="fCondition" value="${esc(values.estado || "")}">
          <div class="filter-chips">
            ${CONDITIONS.map(c => `<button type="button" class="filter-chip state-layer${values.estado === c ? " is-selected" : ""}" data-action="pick-condition" data-value="${c}" aria-pressed="${values.estado === c}">${values.estado === c ? icon("check", "icon icon-sm") : ""}${c}</button>`).join("")}
          </div>
        </fieldset>
        ${field({ id: "fDescription", label: "Descrição", hint: "Opcional. Detalhes, acessórios, defeitos.", control: `<textarea id="fDescription" class="input" rows="3">${esc(values.descricao || "")}</textarea>` })}

        <div id="formMessage" aria-live="polite"></div>
        <div class="form-actions">
          <button type="button" class="text-button state-layer" data-action="go-dashboard">Cancelar</button>
          <button type="submit" class="filled-button state-layer">${icon("check", "icon icon-sm")}Registrar produto</button>
        </div>
      </form>
    </main>`;
}

export function evaluateProductView({ produto, vendedor, categoria, marca }) {
  const meta = [marca?.nome, categoria?.nome, produto.estado_conservacao].filter(Boolean).join(" · ");
  return `
    <main class="page form-page">
      ${subpageHeader("Avaliar produto", "Defina o preço de venda e a parte do cliente.")}
      <section class="product-summary">
        <span class="list-icon">${icon("hourglass")}</span>
        <span class="list-text">
          <strong>${esc(produto.nome)}</strong>
          <span>${esc(meta || "Sem categoria e marca")}</span>
          <span class="product-seller">${icon("person", "icon icon-sm")}${esc(vendedor?.nome || "—")}</span>
        </span>
      </section>
      <form id="evaluateForm" class="form-card" novalidate>
        ${field({ id: "fSale", label: "Valor de venda", hint: "Preço pelo qual o produto ficará à venda.", control: `<div class="money-input"><span>R$</span><input id="fSale" class="input" inputmode="decimal" autocomplete="off" placeholder="0,00" required></div>` })}
        ${field({ id: "fSeller", label: "Parte do cliente", hint: "Valor que o cliente recebe quando o produto for vendido.", control: `<div class="money-input"><span>R$</span><input id="fSeller" class="input" inputmode="decimal" autocomplete="off" placeholder="0,00" required></div>` })}
        <div class="filter-chips" role="group" aria-label="Atalhos de divisão">
          <span class="chip-hint">Cliente recebe:</span>
          ${[40, 50, 60, 70].map(pc => `<button type="button" class="filter-chip state-layer" data-action="split-percent" data-percent="${pc}">${pc}%</button>`).join("")}
        </div>
        <section class="split-preview" id="splitPreview" aria-live="polite">${splitPreviewView(null)}</section>
        <div id="formMessage" aria-live="polite"></div>
        <div class="form-actions">
          <button type="button" class="text-button state-layer" data-action="go-dashboard">Cancelar</button>
          <button type="submit" class="filled-button state-layer" id="evaluateSubmit" disabled>${icon("sell", "icon icon-sm")}Disponibilizar para venda</button>
        </div>
      </form>
    </main>`;
}

// Resumo da divisão: cliente + loja = venda (a parte da loja é sempre o restante).
export function splitPreviewView(split, { clienteLabel = "Cliente" } = {}) {
  if (!split) return `<p class="split-empty">Informe o valor de venda e a parte do cliente para ver a divisão.</p>`;
  const pct = split.venda ? Math.round((split.cliente / split.venda) * 100) : 0;
  return `
    <div class="split-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    <dl class="split-values">
      <div><dt><span class="dot dot-client"></span>${clienteLabel}</dt><dd><strong>${formatCents(split.cliente)}</strong><small>${pct}%</small></dd></div>
      <div><dt><span class="dot dot-store"></span>Loja</dt><dd><strong>${formatCents(split.loja)}</strong><small>${100 - pct}%</small></dd></div>
      <div class="split-total"><dt>Valor de venda</dt><dd><strong>${formatCents(split.venda)}</strong></dd></div>
    </dl>`;
}

export function sellProductView({ produto, vendedor, categoria, marca, avaliacao, buyers, selected }) {
  const meta = [marca?.nome, categoria?.nome, produto.estado_conservacao].filter(Boolean).join(" · ");
  const venda = Number(avaliacao?.valor_venda ?? produto.valor_venda ?? 0);
  return `
    <main class="page form-page">
      ${subpageHeader("Vender produto", "Registre a venda feita pela loja a um cliente.")}
      <section class="product-summary">
        <span class="list-icon">${icon("sell")}</span>
        <span class="list-text">
          <strong>${esc(produto.nome)}</strong>
          <span>${esc(meta || "Sem categoria e marca")}</span>
          <span class="product-seller">${icon("person", "icon icon-sm")}Vendedor: ${esc(vendedor?.nome || "—")}</span>
        </span>
      </section>
      <form id="sellForm" class="form-card" novalidate>
        <h2 class="form-section">Cliente comprador</h2>
        <div class="field-row">
          ${field({ id: "fBuyer", label: "Comprador", hint: buyers.length ? "Quem está comprando o produto." : "Nenhum cliente disponível. Cadastre o comprador ao lado.",
            control: `<select id="fBuyer" class="input" required>${options(buyers, selected, "Selecione o comprador")}</select>` })}
          <button type="button" class="outlined-button state-layer" data-action="new-buyer">${icon("personAdd", "icon icon-sm")}Novo cliente</button>
        </div>
        <h2 class="form-section">Valores da avaliação</h2>
        <section class="split-preview">${avaliacao
          ? splitPreviewView({ venda: Math.round(venda * 100), cliente: Math.round(Number(avaliacao.valor_usuario) * 100), loja: Math.round(Number(avaliacao.valor_loja) * 100) })
          : `<p class="split-empty">Valor de venda: <strong>${formatBRL(venda)}</strong></p>`}</section>
        <div id="formMessage" aria-live="polite"></div>
        <div class="form-actions">
          <button type="button" class="text-button state-layer" data-action="go-dashboard">Cancelar</button>
          <button type="submit" class="filled-button state-layer">${icon("sold", "icon icon-sm")}Registrar venda</button>
        </div>
      </form>
    </main>`;
}

// cliente: dados atuais na edição (o e-mail não muda: identifica a conta Google).
export function customerDialogContent(cliente = null) {
  return `
    ${cliente ? "" : '<p class="dialog-text">Cadastre o cliente pelo e-mail da conta Google dele. Quando ele entrar no Breshopper, verá seus produtos.</p>'}
    ${field({ id: "dName", label: "Nome", control: `<input id="dName" class="input" maxlength="150" autocomplete="off" required value="${esc(cliente?.nome || "")}">` })}
    ${field({ id: "dEmail", label: "E-mail", hint: cliente ? "O e-mail identifica a conta Google e não pode ser alterado." : "",
      control: `<input id="dEmail" class="input" type="email" inputmode="email" autocomplete="off" required value="${esc(cliente?.email || "")}"${cliente ? " readonly" : ""}>` })}
    ${field({ id: "dPhone", label: "Telefone (opcional)", control: `<input id="dPhone" class="input" type="tel" inputmode="tel" maxlength="30" autocomplete="off" value="${esc(cliente?.telefone || "")}">` })}`;
}

export function nameDialogContent(label) {
  return field({ id: "dName", label, control: '<input id="dName" class="input" maxlength="100" autocomplete="off" required>' });
}
