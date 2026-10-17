// Autenticação: configuração do Google, troca da credencial do Google pela sessão da API e restauração da sessão.
import { SESSION_CHECK_TIMEOUT_MS } from "../config.js";
import { apiRequest } from "./api.js";
import { clearSession, readSession, saveSession } from "./session.js";

let googleConfigPromise = null;

// Client ID público do Google, informado pela API (cacheado).
export function loadGoogleClientId() {
  if (!googleConfigPromise) {
    googleConfigPromise = apiRequest("/api/auth/google/config")
      .then(config => (config?.habilitado && config.client_id ? config.client_id : ""))
      .catch(error => { googleConfigPromise = null; throw error; });
  }
  return googleConfigPromise;
}

export async function signInWithGoogle(credential) {
  const result = await apiRequest("/api/auth/google", { method: "POST", body: { credencial: credential } });
  saveSession({ token: result.token_acesso, expiraEm: result.expira_em, usuario: result.usuario, lojas: [] });
  return loadSession();
}

// Busca o usuário e as lojas em que ele é operador, e atualiza a cópia local.
export async function loadSession({ timeoutMs } = {}) {
  const data = await apiRequest("/api/auth/sessao", { timeoutMs });
  return saveSession({ usuario: data.usuario, lojas: data.lojas });
}

// Ao abrir o app:
//  "online"     — sessão válida, dados atualizados
//  "offline"    — servidor inacessível; segue com os dados guardados no aparelho
//  "signed-out" — sem sessão ou sessão recusada (401/403)
export async function restoreSession() {
  const saved = readSession();
  if (!saved) return { status: "signed-out" };
  try {
    return { status: "online", session: await loadSession({ timeoutMs: SESSION_CHECK_TIMEOUT_MS }) };
  } catch (error) {
    if ((error.status === 401 || error.status === 403) || !saved.usuario) {
      clearSession();
      return { status: "signed-out" };
    }
    return { status: "offline", session: saved };
  }
}

export function signOut() {
  clearSession();
  try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* SDK do Google não carregado */ }
}
