// Serviço financeiro: conta corrente do cliente e financeiro da loja (ambos exigem a sessão).
import { apiRequest } from "./api.js";

export function loadAccount() {
  return apiRequest("/api/conta-corrente");
}

// Períodos calculados no fuso do aparelho e enviados em ISO 8601 (com fuso) para a API.
export const PERIODS = [
  { id: "MES", label: "Este mês" },
  { id: "30D", label: "Últimos 30 dias" },
  { id: "TUDO", label: "Tudo" },
];

export function periodRange(id, now = new Date()) {
  if (id === "MES") return { de: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (id === "30D") { const de = new Date(now); de.setDate(de.getDate() - 30); return { de }; }
  return {};
}

export function loadStoreFinance(lojaId, periodId) {
  const { de, ate } = periodRange(periodId);
  const params = new URLSearchParams();
  if (de) params.set("de", de.toISOString());
  if (ate) params.set("ate", ate.toISOString());
  const query = params.toString();
  return apiRequest(`/api/lojas/${lojaId}/financeiro${query ? `?${query}` : ""}`);
}
