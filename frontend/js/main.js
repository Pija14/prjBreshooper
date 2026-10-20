// Ponto de entrada do app: abertura, restauração da sessão, navegação entre login e área logada,
// delegação de eventos (data-action) e registro do service worker.
import { SLOW_HINT_MS } from "./config.js";
import { handleOutsideInteraction, homeActions, renderHome } from "./controllers/homeController.js";
import { loginActions, renderLogin } from "./controllers/loginController.js";
import { operatorActions } from "./controllers/operatorController.js";
import { restoreSession } from "./services/auth.js";
import { splashView } from "./views/authViews.js";
import { showSnackbar } from "./views/ui.js";

const app = document.getElementById("app");
const actions = { ...loginActions, ...homeActions, ...operatorActions };

function showLogin(notice, { signedOut = false } = {}) {
  renderLogin(app, { onSuccess: showHome, notice, signedOut });
}

function showHome(session) {
  renderHome(app, session, { onLogout: () => showLogin("Você saiu da sua conta.", { signedOut: true }) });
}

// Um único ouvinte para todos os botões com data-action.
document.addEventListener("click", event => {
  handleOutsideInteraction(event);
  const target = event.target.closest("[data-action]");
  if (target && actions[target.dataset.action]) actions[target.dataset.action](target, event);
});
document.addEventListener("keydown", handleOutsideInteraction);

async function boot() {
  app.innerHTML = splashView();
  const hint = setTimeout(() => {
    const el = document.getElementById("splashHint");
    if (el) el.textContent = "Conectando ao servidor… Na primeira vez do dia isso pode levar até um minuto.";
  }, SLOW_HINT_MS);
  const result = await restoreSession();
  clearTimeout(hint);
  if (result.status === "signed-out") { showLogin(); return; }
  showHome(result.session);
  if (result.status === "offline") showSnackbar("Sem conexão com o servidor. Mostrando os dados salvos neste aparelho.");
}

if ("serviceWorker" in navigator) {
  // Quando uma versão nova do app assume, recarrega para usar os arquivos novos.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}

boot();
