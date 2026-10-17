// Configuração do frontend. A URL da API fica só aqui.
// Em desenvolvimento local (localhost) usa a API local; publicado, usa a API do Render.
// Para testar outro backend sem alterar o código: window.BRESHOPPER_CONFIG = { API_URL: "..." } antes do app carregar.
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export const API_URL = (window.BRESHOPPER_CONFIG?.API_URL
  || (LOCAL_HOSTS.includes(location.hostname) ? "http://localhost:8000" : "https://breshopper-api.onrender.com")
).replace(/\/$/, "");

// Tempo máximo de espera por resposta da API. O plano gratuito do Render pode levar ~1 min para "acordar".
export const API_TIMEOUT_MS = 90000;
// Ao abrir o app com sessão salva: espera máxima antes de seguir com os dados guardados no aparelho.
export const SESSION_CHECK_TIMEOUT_MS = 20000;
// Depois deste tempo carregando, avisamos que o servidor pode estar acordando.
export const SLOW_HINT_MS = 6000;

export const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";
