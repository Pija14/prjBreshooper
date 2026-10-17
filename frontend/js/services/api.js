// Cliente único da API: URL base, token de sessão, tempo limite e mensagens de erro em português.
import { API_TIMEOUT_MS, API_URL } from "../config.js";
import { readSession } from "./session.js";

export class ApiError extends Error {
  constructor(message, { status = 0, kind = "http" } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // "http" | "network" | "timeout"
  }
}

export async function apiRequest(path, { method = "GET", body, timeoutMs = API_TIMEOUT_MS } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = readSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw new ApiError("O servidor demorou demais para responder. Tente novamente em instantes.", { kind: "timeout" });
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.", { kind: "network" });
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : null;
    const fallback = response.status >= 500 ? "O servidor está indisponível no momento. Tente novamente em instantes." : `Erro ${response.status}`;
    throw new ApiError(detail || fallback, { status: response.status });
  }
  return data;
}
