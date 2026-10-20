// Serviço da área da loja (operador): dados da loja, recebimento e avaliação de produtos.
// O operador é identificado pelo vínculo retornado em /api/auth/sessao (operador_id + loja_id).
import { apiRequest } from "./api.js";

const LOJA_KEY = "breshopper.lojaAtual";

export function selectedStoreId(lojas) {
  const saved = Number(localStorage.getItem(LOJA_KEY));
  return lojas.some(l => l.loja_id === saved) ? saved : lojas[0]?.loja_id;
}

export function rememberStore(lojaId) {
  localStorage.setItem(LOJA_KEY, String(lojaId));
}

// Carrega tudo de que o painel e os formulários precisam, em paralelo.
export async function loadStoreData(lojaId) {
  const [produtos, categorias, marcas, usuarios, operadores, avaliacoes, vendas] = await Promise.all([
    apiRequest(`/api/produtos?loja_id=${lojaId}`),
    apiRequest("/api/categorias"),
    apiRequest("/api/marcas"),
    apiRequest("/api/usuarios"),
    apiRequest("/api/operadores"),
    apiRequest("/api/avaliacoes"),
    apiRequest(`/api/vendas?loja_id=${lojaId}`),
  ]);
  return { produtos, categorias, marcas, usuarios, operadores, avaliacoes, vendas };
}

// Clientes (vendedores ou compradores): usuários ativos que não são operadores de nenhuma loja.
export function sellerCandidates({ usuarios, operadores }) {
  const operatorUsers = new Set(operadores.map(o => o.usuario_id));
  return usuarios
    .filter(u => u.status === "ATIVO" && !operatorUsers.has(u.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function createCustomer({ nome, email, telefone }) {
  return apiRequest("/api/usuarios", { method: "POST", body: { nome, email, telefone: telefone || null } });
}

// Nome e telefone (o e-mail identifica a conta Google e não muda).
export function updateCustomer(id, { nome, telefone }) {
  return apiRequest(`/api/usuarios/${id}`, { method: "PATCH", body: { nome, telefone: telefone ?? "" } });
}

export function createCategory(nome) {
  return apiRequest("/api/categorias", { method: "POST", body: { nome } });
}

export function createBrand(nome) {
  return apiRequest("/api/marcas", { method: "POST", body: { nome } });
}

export function receiveProduct(operadorId, produto) {
  return apiRequest(`/api/produtos?operador_id=${operadorId}`, { method: "POST", body: produto });
}

// Valores como string decimal ("1000.00") para não perder precisão.
export function evaluateProduct(operadorId, { produtoId, valorVenda, valorUsuario, valorLoja }) {
  return apiRequest(`/api/avaliacoes?operador_id=${operadorId}`, {
    method: "POST",
    body: { produto_id: produtoId, valor_venda: valorVenda, valor_usuario: valorUsuario, valor_loja: valorLoja },
  });
}

// Operador registra, em nome da loja, a venda a um cliente; valores vêm da avaliação.
export function registerSale(operadorId, { produtoId, compradorId }) {
  return apiRequest(`/api/vendas?operador_id=${operadorId}`, {
    method: "POST",
    body: { produto_id: produtoId, usuario_comprador_id: compradorId },
  });
}
