// Sessão salva no aparelho: token da API e a última cópia dos dados do usuário (para abrir sem conexão).
const STORAGE_KEY = "breshopper.sessao";

export function readSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved?.token) return null;
    if (saved.expiraEm && new Date(saved.expiraEm) <= new Date()) { clearSession(); return null; }
    return saved;
  } catch {
    return null;
  }
}

export function saveSession({ token, expiraEm, usuario, lojas }) {
  const current = readSession() || {};
  const next = {
    token: token ?? current.token,
    expiraEm: expiraEm ?? current.expiraEm,
    usuario: usuario ?? current.usuario,
    lojas: lojas ?? current.lojas ?? [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
