// Serviço financeiro: carteira do cliente, resumo da loja e pagamentos aos vendedores (tudo exige a sessão).
import { apiRequest } from "./api.js";

export function loadAccount() {
  return apiRequest("/api/conta-corrente");
}

// Períodos calculados no fuso do aparelho e enviados em ISO 8601 (com fuso) para a API.
export const PERIODS = [
  { id: "HOJE", label: "Hoje" },
  { id: "7D", label: "7 dias" },
  { id: "MES", label: "Este mês" },
  { id: "MES_ANTERIOR", label: "Mês passado" },
  { id: "TUDO", label: "Tudo" },
  { id: "PERSONALIZADO", label: "Personalizado" },
];

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// "2026-10-20" (valor de <input type="date">) → Date no início do dia local.
export function parseDay(value) {
  const [y, m, d] = String(value || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

// custom: { de: "AAAA-MM-DD", ate: "AAAA-MM-DD" } — "ate" inclui o dia inteiro.
export function periodRange(id, custom, now = new Date()) {
  const today = startOfDay(now);
  if (id === "HOJE") return { de: today };
  if (id === "7D") return { de: addDays(today, -6) };
  if (id === "MES") return { de: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (id === "MES_ANTERIOR") return { de: new Date(now.getFullYear(), now.getMonth() - 1, 1), ate: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (id === "PERSONALIZADO" && custom) {
    const de = parseDay(custom.de), ate = parseDay(custom.ate);
    return { de: de || undefined, ate: ate ? addDays(ate, 1) : undefined };
  }
  return {};
}

function rangeQuery(id, custom) {
  const { de, ate } = periodRange(id, custom);
  const params = new URLSearchParams();
  if (de) params.set("de", de.toISOString());
  if (ate) params.set("ate", ate.toISOString());
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function loadStoreFinance(lojaId, periodId, custom) {
  return apiRequest(`/api/lojas/${lojaId}/financeiro${rangeQuery(periodId, custom)}`);
}

// Despesas: o que a loja deve (PENDENTE) e já pagou (PAGO) a cada vendedor, no período.
export function loadPayouts(lojaId, periodId, custom) {
  return apiRequest(`/api/lojas/${lojaId}/repasses${rangeQuery(periodId, custom)}`);
}

// forma: "PIX" | "CARTAO" | "CREDITO_LOJA" — só CREDITO_LOJA gera crédito na carteira do vendedor.
export function payPayout(repasseId, forma) {
  return apiRequest(`/api/repasses/${repasseId}/pagamento`, { method: "POST", body: { forma_pagamento: forma } });
}
