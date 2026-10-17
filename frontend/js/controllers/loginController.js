// Controller da tela de login: carrega o botão oficial do Google e troca a credencial pela sessão da API.
import { GOOGLE_GSI_SRC, SLOW_HINT_MS } from "../config.js";
import { loadGoogleClientId, signInWithGoogle } from "../services/auth.js";
import { bannerView, googleFallbackView, loginView } from "../views/authViews.js";

let onSignedIn = () => {};
let busy = false;
let slowTimer = null;
const google = { status: "idle", scriptPromise: null, initializedFor: "", disableAutoSelect: false };

function setMessage(text, type = "error") {
  const box = document.getElementById("loginMessage");
  if (box) box.innerHTML = text ? bannerView(text, type) : "";
}

function setBusy(value) {
  busy = value;
  document.getElementById("googleSlot")?.classList.toggle("is-busy", value);
  clearTimeout(slowTimer);
  if (value) {
    setMessage("");
    slowTimer = setTimeout(() => setMessage("Conectando ao servidor… Na primeira vez do dia isso pode levar até um minuto.", "info"), SLOW_HINT_MS);
  }
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!google.scriptPromise) {
    google.scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_GSI_SRC; script.async = true; script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => { google.scriptPromise = null; script.remove(); reject(new Error("Não foi possível carregar o login do Google.")); };
      document.head.appendChild(script);
    });
  }
  return google.scriptPromise;
}

async function mountGoogleButton() {
  const slot = document.getElementById("googleSlot");
  if (!slot) return;
  try {
    const clientId = await loadGoogleClientId();
    if (!clientId) { google.status = "disabled"; slot.innerHTML = googleFallbackView("disabled"); slot.dataset.state = "disabled"; return; }
    await loadGoogleScript();
    if (google.initializedFor !== clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId, callback: handleCredential, ux_mode: "popup",
        auto_select: false, cancel_on_tap_outside: true, itp_support: true, use_fedcm_for_button: true,
      });
      google.initializedFor = clientId;
    }
    // Depois de sair da conta, o Google não deve sugerir entrar de novo automaticamente.
    if (google.disableAutoSelect) { window.google.accounts.id.disableAutoSelect(); google.disableAutoSelect = false; }
    const current = document.getElementById("googleSlot");
    if (!current) return;
    const width = Math.round(Math.min(400, Math.max(220, current.clientWidth || 320)));
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    current.innerHTML = "";
    window.google.accounts.id.renderButton(current, {
      type: "standard", theme: dark ? "filled_black" : "outline", size: "large", shape: "pill",
      text: "continue_with", logo_alignment: "center", width, locale: "pt-BR",
    });
    current.dataset.state = "ready";
    google.status = "ready";
  } catch (error) {
    google.status = "error";
    const current = document.getElementById("googleSlot");
    if (current) { current.innerHTML = googleFallbackView("error"); current.dataset.state = "error"; }
    console.warn("Login com Google:", error);
  }
}

async function handleCredential(response) {
  if (busy) return;
  if (!response?.credential) { setMessage("O Google não retornou uma credencial. Tente novamente."); return; }
  setBusy(true);
  try {
    const session = await signInWithGoogle(response.credential);
    setBusy(false);
    onSignedIn(session);
  } catch (error) {
    setBusy(false);
    setMessage(error.message || "Não foi possível entrar com o Google.");
  }
}

function handleGoogleUnavailable() {
  if (google.status === "error") { google.status = "idle"; setMessage(""); mountGoogleButton(); return; }
  setMessage("O login com Google ainda não foi ativado neste servidor.", "info");
}

export function renderLogin(app, { onSuccess, notice, signedOut = false } = {}) {
  onSignedIn = onSuccess || onSignedIn;
  if (signedOut) google.disableAutoSelect = true;
  busy = false;
  app.innerHTML = loginView();
  if (notice) setMessage(notice, "info");
  mountGoogleButton();
}

export const loginActions = { "google-unavailable": handleGoogleUnavailable };
