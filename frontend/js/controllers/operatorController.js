// Controller da área da loja (operador): painel, recebimento e avaliação de produtos.
// Rotas por hash para o botão "voltar" do celular funcionar: #/ (painel), #/receber, #/avaliar/<id>, #/vender/<id>.
import { ApiError } from "../services/api.js";
import {
  createBrand, createCategory, createCustomer, evaluateProduct, loadStoreData,
  receiveProduct, registerSale, rememberStore, selectedStoreId, sellerCandidates,
} from "../services/store.js";
import {
  customerDialogContent, evaluateProductView, nameDialogContent, receiveProductView, sellProductView,
  splitPreviewView, storeDashboardView, storeShellView,
} from "../views/operatorViews.js";
import { bannerView } from "../views/authViews.js";
import { loadPayouts, loadStoreFinance, payPayout } from "../services/finance.js";
import { FORMAS, payDialogContent, periodDialogContent, storeExpensesView, storeHomeView, storeIncomeView } from "../views/financeViews.js";
import { centsToDecimalString, esc, formatBRL, formatCents, icon, openDialog, parseBRLToCents, showSnackbar } from "../views/ui.js";

const state = { app: null, session: null, loja: null, data: null, filter: "RECEBIDO", condition: "", expandedId: null,
  // Período compartilhado por Início, Receitas e Despesas (custom: { de, ate } em AAAA-MM-DD).
  finance: { period: "MES", custom: null, data: null, error: null, request: 0 },
  expenses: { filter: "PENDENTE", list: null, error: null, request: 0 },
  incomeExpandedId: null, expenseExpandedId: null };

function byId(list) { return new Map((list || []).map(x => [x.id, x])); }

function errorText(err) {
  if (err instanceof ApiError && err.kind === "timeout") return "O servidor demorou para responder. Tente novamente.";
  if (err instanceof ApiError && err.kind === "network") return "Sem conexão com o servidor. Verifique sua internet.";
  return err?.message || "Algo deu errado. Tente novamente.";
}

function paint(content) {
  state.app.innerHTML = storeShellView({ usuario: state.session.usuario, loja: state.loja, content });
  // Linha de períodos com rolagem: mantém o chip selecionado visível (sem rolar a página).
  const row = state.app.querySelector(".chip-scroll");
  const chip = row?.querySelector(".is-selected");
  const overflow = chip ? chip.getBoundingClientRect().right - row.getBoundingClientRect().right : 0;
  if (overflow > 0) row.scrollLeft += overflow + 16;
}

function loadingView(text = "Carregando produtos da loja…") {
  return `<main class="page"><div class="empty-state" role="status"><span class="spinner" aria-hidden="true"></span><span>${text}</span></div></main>`;
}

function failureView(err) {
  return `<main class="page"><div class="empty-state">
    <span class="empty-icon">${icon("error")}</span><strong>Não foi possível carregar a loja</strong><span>${esc(errorText(err))}</span>
    <button class="filled-button state-layer" data-action="store-reload">Tentar novamente</button></div></main>`;
}

async function reload() {
  paint(loadingView());
  try {
    state.data = await loadStoreData(state.loja.loja_id);
  } catch (err) {
    state.data = null;
    paint(failureView(err));
    return;
  }
  route();
}

function items() {
  const users = byId(state.data.usuarios), cats = byId(state.data.categorias), brands = byId(state.data.marcas);
  const sales = new Map(state.data.vendas.map(v => [v.produto_id, v]));
  const evals = new Map(state.data.avaliacoes.map(a => [a.produto_id, a]));
  return [...state.data.produtos]
    .sort((a, b) => b.id - a.id)
    .map(produto => ({
      produto,
      vendedor: users.get(produto.usuario_vendedor_id),
      categoria: cats.get(produto.categoria_id),
      marca: brands.get(produto.marca_id),
      avaliacao: evals.get(produto.id),
      venda: sales.get(produto.id),
      comprador: users.get(sales.get(produto.id)?.usuario_comprador_id),
    }));
}

function route() {
  if (!state.data) return;
  const hash = location.hash;
  const avaliar = hash.match(/^#\/avaliar\/(\d+)$/);
  const vender = hash.match(/^#\/vender\/(\d+)$/);
  if (hash === "#/produtos") return showDashboard();
  if (hash === "#/receitas") return showFinance("receitas");
  if (hash === "#/despesas") return showExpenses();
  if (hash === "#/receber") return showReceive();
  if (avaliar) return showEvaluate(Number(avaliar[1]));
  if (vender) return showSell(Number(vender[1]));
  if (hash !== "" && hash !== "#/") history.replaceState(null, "", "#/"); // rota antiga (ex.: #/financeiro) ou desconhecida
  showFinance("inicio");
}

function go(hash) {
  if (location.hash === hash) route(); else location.hash = hash;
}

// ---------- Painel ----------
function showDashboard() {
  const all = items();
  const counts = all.reduce((acc, i) => ({ ...acc, [i.produto.status]: (acc[i.produto.status] || 0) + 1 }), {});
  paint(storeDashboardView({ usuario: state.session.usuario, loja: state.loja, counts, filter: state.filter, items: all, expandedId: state.expandedId }));
  document.title = `Produtos · ${state.loja.loja_nome}`;
}

// ---------- Início e Receitas (resumo financeiro do período) ----------
const isFinanceRoute = view => (view === "inicio" ? ["", "#/"].includes(location.hash) : location.hash === "#/receitas");

function paintFinance(view) {
  const f = state.finance;
  paint(view === "inicio"
    ? storeHomeView({ usuario: state.session.usuario, loja: state.loja, ...f })
    : storeIncomeView({ ...f, expandedId: state.incomeExpandedId }));
}

async function showFinance(view) {
  const f = state.finance;
  const request = ++f.request;
  f.data = null; f.error = null;
  paintFinance(view);
  document.title = `${view === "inicio" ? "Início" : "Receitas"} · ${state.loja.loja_nome}`;
  try {
    const data = await loadStoreFinance(state.loja.loja_id, f.period, f.custom);
    if (request !== f.request) return; // resposta de um período anterior
    f.data = data;
  } catch (err) {
    if (request !== f.request) return;
    f.error = errorText(err);
  }
  if (isFinanceRoute(view)) paintFinance(view);
}

// ---------- Período (Início, Receitas e Despesas) ----------
function refreshPeriodView() {
  state.incomeExpandedId = null;
  state.expenseExpandedId = null;
  if (location.hash === "#/despesas") showExpenses();
  else showFinance(location.hash === "#/receitas" ? "receitas" : "inicio");
}

function choosePeriod(id) {
  if (id !== "PERSONALIZADO") { state.finance.period = id; refreshPeriodView(); return; }
  openDialog({
    title: "Período personalizado",
    content: periodDialogContent(state.finance.custom),
    confirmLabel: "Aplicar",
    onConfirm: dialog => {
      const de = dialog.querySelector("#dDe").value, ate = dialog.querySelector("#dAte").value;
      const support = dialog.querySelector("#dPeriodo-support");
      if (!de && !ate) { support.textContent = "Informe ao menos uma data."; return false; }
      if (de && ate && de > ate) { support.textContent = "A data inicial deve ser antes da final."; return false; }
      state.finance.period = "PERSONALIZADO";
      state.finance.custom = { de, ate };
      refreshPeriodView();
    },
  });
}

// ---------- Despesas (pagamentos aos vendedores) ----------
async function showExpenses() {
  const e = state.expenses;
  const request = ++e.request;
  e.list = null; e.error = null;
  paintExpenses();
  document.title = `Despesas · ${state.loja.loja_nome}`;
  try {
    const list = await loadPayouts(state.loja.loja_id, state.finance.period, state.finance.custom);
    if (request !== e.request) return;
    e.list = list;
  } catch (err) {
    if (request !== e.request) return;
    e.error = errorText(err);
  }
  if (location.hash === "#/despesas") paintExpenses();
}

function payoutDialog(button) {
  const repasse = state.expenses.list?.find(r => r.id === Number(button.dataset.id));
  if (!repasse) return;
  openDialog({
    title: "Pagar vendedor",
    content: payDialogContent(repasse),
    confirmLabel: "Confirmar pagamento",
    onOpen: dialog => {
      dialog.addEventListener("change", () => { dialog.querySelector("#dForma-support").textContent = ""; });
      dialog.querySelector('input[name="forma"]').focus();
    },
    onConfirm: async dialog => {
      const forma = dialog.querySelector('input[name="forma"]:checked')?.value;
      const support = dialog.querySelector("#dForma-support");
      if (!forma) { support.textContent = "Escolha a forma de pagamento."; dialog.querySelector('input[name="forma"]').focus(); return false; }
      try {
        await payPayout(repasse.id, forma);
        showSnackbar(forma === "CREDITO_LOJA"
          ? `${formatBRL(repasse.valor)} creditados na carteira de ${repasse.vendedor_nome}.`
          : `Pagamento de ${formatBRL(repasse.valor)} via ${FORMAS[forma].label} registrado.`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) showSnackbar(err.message);
        else { support.textContent = errorText(err); return false; }
      }
      showExpenses();
    },
  });
}

// ---------- Receber produto ----------
function readReceiveValues() {
  const v = id => document.getElementById(id)?.value ?? "";
  return { seller: v("fSeller"), nome: v("fName"), categoria: v("fCategory"), marca: v("fBrand"), estado: state.condition, descricao: v("fDescription") };
}

function showReceive(values) {
  state.condition = values?.estado ?? (values ? state.condition : "");
  paint(receiveProductView({
    sellers: sellerCandidates(state.data),
    categorias: state.data.categorias.filter(c => c.status === "ATIVO"),
    marcas: state.data.marcas.filter(m => m.status === "ATIVO"),
    values: values || {},
  }));
  document.getElementById("receiveForm").addEventListener("submit", submitReceive);
  if (!values) document.getElementById("fSeller")?.focus();
}

function setFieldError(id, message) {
  const input = document.getElementById(id);
  const support = document.getElementById(`${id}-support`);
  if (!input || !support) return;
  input.closest(".field")?.classList.toggle("has-error", !!message);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  support.textContent = message || support.dataset.hint || "";
}

function formMessage(text, type = "error") {
  const box = document.getElementById("formMessage");
  if (box) box.innerHTML = text ? bannerView(text, type) : "";
}

async function submitReceive(event) {
  event.preventDefault();
  const v = readReceiveValues();
  setFieldError("fSeller", v.seller ? "" : "Selecione o cliente que entregou o produto.");
  setFieldError("fName", v.nome.trim() ? "" : "Informe o nome do produto.");
  if (!v.seller || !v.nome.trim()) { document.querySelector(".has-error .input")?.focus(); return; }

  const button = event.submitter || event.target.querySelector('[type="submit"]');
  button.disabled = true;
  formMessage("");
  try {
    const produto = await receiveProduct(state.loja.operador_id, {
      loja_id: state.loja.loja_id,
      usuario_vendedor_id: Number(v.seller),
      categoria_id: v.categoria ? Number(v.categoria) : null,
      marca_id: v.marca ? Number(v.marca) : null,
      nome: v.nome.trim(),
      descricao: v.descricao.trim() || null,
      estado_conservacao: v.estado || null,
    });
    state.data.produtos.push(produto);
    state.filter = "RECEBIDO";
    showSnackbar(`“${produto.nome}” registrado. Agora é só avaliar.`);
    go("#/produtos");
  } catch (err) {
    formMessage(errorText(err));
    button.disabled = false;
  }
}

function pickCondition(button) {
  const value = button.dataset.value;
  state.condition = state.condition === value ? "" : value;
  showReceive({ ...readReceiveValues(), estado: state.condition });
}

function dialogError(dialog, id, message) {
  const support = dialog.querySelector(`#${id}-support`);
  dialog.querySelector(`#${id}`)?.closest(".field")?.classList.toggle("has-error", !!message);
  if (support) support.textContent = message;
}

function newCustomer(onCreated = usuario => showReceive({ ...readReceiveValues(), seller: String(usuario.id) })) {
  openDialog({
    title: "Novo cliente",
    content: customerDialogContent(),
    confirmLabel: "Cadastrar",
    onConfirm: async dialog => {
      const nome = dialog.querySelector("#dName").value.trim();
      const email = dialog.querySelector("#dEmail").value.trim();
      dialogError(dialog, "dName", nome ? "" : "Informe o nome.");
      dialogError(dialog, "dEmail", /^\S+@\S+\.\S+$/.test(email) ? "" : "Informe um e-mail válido.");
      if (!nome || !/^\S+@\S+\.\S+$/.test(email)) return false;
      try {
        const usuario = await createCustomer({ nome, email });
        state.data.usuarios.push(usuario);
        onCreated(usuario);
        showSnackbar(`Cliente ${usuario.nome} cadastrado.`);
      } catch (err) {
        dialogError(dialog, "dEmail", errorText(err));
        return false;
      }
    },
  });
}

function newNamed({ title, label, create, list, field }) {
  openDialog({
    title,
    content: nameDialogContent(label),
    confirmLabel: "Adicionar",
    onConfirm: async dialog => {
      const nome = dialog.querySelector("#dName").value.trim();
      dialogError(dialog, "dName", nome ? "" : "Informe o nome.");
      if (!nome) return false;
      try {
        const item = await create(nome);
        state.data[list].push(item);
        showReceive({ ...readReceiveValues(), [field]: String(item.id) });
      } catch (err) {
        dialogError(dialog, "dName", errorText(err));
        return false;
      }
    },
  });
}

// ---------- Avaliar ----------
function currentSplit() {
  const venda = parseBRLToCents(document.getElementById("fSale")?.value);
  const cliente = parseBRLToCents(document.getElementById("fSeller")?.value);
  if (!(venda > 0) || Number.isNaN(cliente)) return null;
  if (cliente > venda) return { error: "A parte do cliente não pode ser maior que o valor de venda." };
  return { venda, cliente, loja: venda - cliente };
}

function updateSplit() {
  const split = currentSplit();
  const saleText = document.getElementById("fSale").value;
  setFieldError("fSale", saleText && !(parseBRLToCents(saleText) > 0) ? "Informe um valor válido, ex.: 250,00" : "");
  setFieldError("fSeller", split?.error || "");
  document.getElementById("splitPreview").innerHTML = splitPreviewView(split && !split.error ? split : null);
  document.getElementById("evaluateSubmit").disabled = !split || !!split.error;
}

function showEvaluate(produtoId) {
  const item = items().find(i => i.produto.id === produtoId);
  if (!item || item.produto.status !== "RECEBIDO") {
    showSnackbar(item ? "Este produto já foi avaliado." : "Produto não encontrado nesta loja.");
    history.replaceState(null, "", "#/produtos");
    showDashboard();
    return;
  }
  paint(evaluateProductView(item));
  const form = document.getElementById("evaluateForm");
  form.addEventListener("input", updateSplit);
  form.addEventListener("submit", event => submitEvaluate(event, item));
  document.getElementById("fSale").focus();
}

function splitPercent(button) {
  const venda = parseBRLToCents(document.getElementById("fSale").value);
  if (!(venda > 0)) { setFieldError("fSale", "Informe primeiro o valor de venda."); document.getElementById("fSale").focus(); return; }
  const cliente = Math.round((venda * Number(button.dataset.percent)) / 100);
  document.getElementById("fSeller").value = formatCents(cliente).replace(/^R\$\s?/, "");
  updateSplit();
}

function submitEvaluate(event, item) {
  event.preventDefault();
  const split = currentSplit();
  if (!split || split.error) return;
  openDialog({
    title: "Disponibilizar para venda?",
    content: `<p class="dialog-text"><strong>${esc(item.produto.nome)}</strong> ficará à venda por <strong>${formatCents(split.venda)}</strong>.
      ${esc(item.vendedor?.nome || "O cliente")} receberá <strong>${formatCents(split.cliente)}</strong> e a loja <strong>${formatCents(split.loja)}</strong>.</p>
      <p class="dialog-text">A avaliação não pode ser alterada depois.</p>`,
    confirmLabel: "Disponibilizar",
    onConfirm: async () => {
      try {
        const avaliacao = await evaluateProduct(state.loja.operador_id, {
          produtoId: item.produto.id,
          valorVenda: centsToDecimalString(split.venda),
          valorUsuario: centsToDecimalString(split.cliente),
          valorLoja: centsToDecimalString(split.loja),
        });
        state.data.avaliacoes.push(avaliacao);
        Object.assign(item.produto, { status: "DISPONIVEL", valor_venda: centsToDecimalString(split.venda) });
        state.filter = "DISPONIVEL";
        showSnackbar(`“${item.produto.nome}” está disponível para venda.`);
        go("#/produtos");
      } catch (err) {
        formMessage(errorText(err));
      }
    },
  });
}

// ---------- Vender ----------
function showSell(produtoId, selected = "") {
  const item = items().find(i => i.produto.id === produtoId);
  if (!item || item.produto.status !== "DISPONIVEL") {
    showSnackbar(item ? "Este produto não está disponível para venda." : "Produto não encontrado nesta loja.");
    history.replaceState(null, "", "#/produtos");
    showDashboard();
    return;
  }
  const buyers = sellerCandidates(state.data).filter(u => u.id !== item.produto.usuario_vendedor_id);
  paint(sellProductView({ ...item, buyers, selected }));
  document.getElementById("sellForm").addEventListener("submit", event => submitSell(event, item));
  if (!selected) document.getElementById("fBuyer")?.focus();
}

function submitSell(event, item) {
  event.preventDefault();
  const compradorId = Number(document.getElementById("fBuyer").value);
  setFieldError("fBuyer", compradorId ? "" : "Selecione o cliente que está comprando.");
  if (!compradorId) { document.getElementById("fBuyer").focus(); return; }
  const comprador = state.data.usuarios.find(u => u.id === compradorId);
  const venda = item.avaliacao?.valor_venda ?? item.produto.valor_venda;
  openDialog({
    title: "Registrar venda?",
    content: `<p class="dialog-text"><strong>${esc(item.produto.nome)}</strong> será vendido para <strong>${esc(comprador?.nome)}</strong> por <strong>${formatBRL(venda)}</strong>.</p>
      ${item.avaliacao ? `<p class="dialog-text">${esc(item.vendedor?.nome || "O vendedor")} recebe <strong>${formatBRL(item.avaliacao.valor_usuario)}</strong> e a loja <strong>${formatBRL(item.avaliacao.valor_loja)}</strong>.</p>` : ""}
      <p class="dialog-text">O produto passa a Vendido e a venda não pode ser desfeita.</p>`,
    confirmLabel: "Registrar venda",
    onConfirm: async () => {
      try {
        const registrada = await registerSale(state.loja.operador_id, { produtoId: item.produto.id, compradorId });
        state.data.vendas.push(registrada);
        item.produto.status = "VENDIDO";
        state.filter = "VENDIDO";
        showSnackbar(`Venda registrada (${registrada.referencia}). A parte do vendedor está em Despesas.`);
        go("#/produtos");
      } catch (err) {
        formMessage(errorText(err));
      }
    },
  });
}

// ---------- Entrada ----------
export function renderStoreArea(app, session) {
  state.app = app;
  state.session = session;
  const lojaId = selectedStoreId(session.lojas);
  state.loja = session.lojas.find(l => l.loja_id === lojaId);
  reload();
}

export function switchStore(button) {
  const loja = state.session?.lojas.find(l => l.loja_id === Number(button.dataset.id));
  if (!loja) return;
  rememberStore(loja.loja_id);
  state.loja = loja;
  state.filter = "RECEBIDO";
  history.replaceState(null, "", "#/");
  showSnackbar(`Você está na loja ${loja.loja_nome}.`);
  reload();
}

window.addEventListener("hashchange", () => { if (state.app?.querySelector(".store-shell")) route(); });

// Abre/fecha a divisão de valores do card, mantendo a rolagem e o foco no card.
function toggleDetails(card, event) {
  if (event?.target.closest?.(".product-details")) return;
  const id = Number(card.dataset.id);
  state.expandedId = state.expandedId === id ? null : id;
  const y = window.scrollY;
  showDashboard();
  window.scrollTo(0, y);
  document.querySelector(`[data-action="toggle-details"][data-id="${id}"] .product-main`)?.focus({ preventScroll: true });
}

const paintExpenses = () => paint(storeExpensesView({ ...state.expenses, period: state.finance.period, custom: state.finance.custom, expandedId: state.expenseExpandedId }));

// Despesas: abre/fecha a divisão vendedor/loja da venda que originou o pagamento.
function toggleExpense(card, event) {
  if (event?.target.closest?.(".product-details")) return;
  const id = Number(card.dataset.id);
  state.expenseExpandedId = state.expenseExpandedId === id ? null : id;
  const y = window.scrollY;
  paintExpenses();
  window.scrollTo(0, y);
  document.querySelector(`[data-action="toggle-expense"][data-id="${id}"] .product-main`)?.focus({ preventScroll: true });
}

// Receitas: abre/fecha a divisão vendedor/loja de uma venda.
function toggleIncome(card, event) {
  if (event?.target.closest?.(".product-details")) return;
  const id = Number(card.dataset.id);
  state.incomeExpandedId = state.incomeExpandedId === id ? null : id;
  const y = window.scrollY;
  paintFinance("receitas");
  window.scrollTo(0, y);
  document.querySelector(`[data-action="toggle-income"][data-id="${id}"] .product-main`)?.focus({ preventScroll: true });
}

// Teclado: Enter/Espaço no card expansível (Produtos e Receitas).
document.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches?.(".product-main[role=button]")) {
    event.preventDefault();
    const card = event.target.closest("[data-action]");
    if (card?.dataset.action === "toggle-income") toggleIncome(card);
    else if (card?.dataset.action === "toggle-expense") toggleExpense(card);
    else if (card) toggleDetails(card);
  }
});

export const operatorActions = {
  filter: button => { state.filter = button.dataset.filter; state.expandedId = null; showDashboard(); },
  "toggle-details": toggleDetails,
  "toggle-income": toggleIncome,
  "toggle-expense": toggleExpense,
  "finance-period": button => choosePeriod(button.dataset.period),
  "finance-reload": () => showFinance(location.hash === "#/receitas" ? "receitas" : "inicio"),
  "expenses-filter": button => { state.expenses.filter = button.dataset.filter; state.expenseExpandedId = null; paintExpenses(); },
  "expenses-reload": () => showExpenses(),
  pay: payoutDialog,
  "go-receive": () => go("#/receber"),
  "go-dashboard": () => go("#/produtos"),
  evaluate: button => go(`#/avaliar/${button.dataset.id}`),
  sell: button => go(`#/vender/${button.dataset.id}`),
  "new-buyer": () => {
    const produtoId = Number(location.hash.split("/").pop());
    newCustomer(usuario => showSell(produtoId, String(usuario.id)));
  },
  "store-reload": reload,
  "new-customer": () => newCustomer(),
  "new-category": () => newNamed({ title: "Nova categoria", label: "Nome da categoria", create: createCategory, list: "categorias", field: "categoria" }),
  "new-brand": () => newNamed({ title: "Nova marca", label: "Nome da marca", create: createBrand, list: "marcas", field: "marca" }),
  "pick-condition": pickCondition,
  "split-percent": splitPercent,
  "switch-store": switchStore,
};
