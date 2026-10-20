// Controller da área autenticada: escolhe a área (loja ou cliente) e cuida do menu da conta.
// Operadores atuam pela loja e não compram nem vendem: veem somente a área da loja.
import { signOut } from "../services/auth.js";
import { selectedStoreId } from "../services/store.js";
import { accountMenuView, homeView } from "../views/homeView.js";
import { renderStoreArea } from "./operatorController.js";

let onSignedOut = () => {};
let currentSession = null;

function closeMenu() {
  document.querySelector(".menu")?.remove();
  document.querySelector('[data-action="account-menu"]')?.setAttribute("aria-expanded", "false");
}

function toggleMenu(button) {
  if (document.querySelector(".menu")) { closeMenu(); return; }
  const lojas = currentSession?.lojas || [];
  const lojaAtual = lojas.length ? selectedStoreId(lojas) : null;
  button.insertAdjacentHTML("afterend", accountMenuView(currentSession?.usuario, { lojas, lojaAtual }));
  button.setAttribute("aria-expanded", "true");
  document.querySelector('.menu [role="menuitem"]')?.focus();
}

function logout() {
  closeMenu();
  signOut();
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  onSignedOut();
}

export function renderHome(app, session, { onLogout } = {}) {
  currentSession = session;
  onSignedOut = onLogout || onSignedOut;
  if (session.lojas?.length) { renderStoreArea(app, session); return; }
  app.innerHTML = homeView(session);
}

export const homeActions = { "account-menu": toggleMenu, logout };

// Fecha o menu ao clicar fora dele ou ao pressionar Esc.
export function handleOutsideInteraction(event) {
  const menu = document.querySelector(".menu");
  if (!menu) return;
  if (event.type === "keydown" && event.key === "Escape") { closeMenu(); document.querySelector('[data-action="account-menu"]')?.focus(); return; }
  if (event.type === "click" && !menu.contains(event.target) && !event.target.closest('[data-action="account-menu"]')) closeMenu();
}
