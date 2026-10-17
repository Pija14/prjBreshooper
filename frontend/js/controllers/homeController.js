// Controller da área autenticada: renderiza a tela inicial e o menu da conta.
import { signOut } from "../services/auth.js";
import { accountMenuView, homeView } from "../views/homeView.js";

let onSignedOut = () => {};
let currentSession = null;

function closeMenu() {
  document.querySelector(".menu")?.remove();
  document.querySelector('[data-action="account-menu"]')?.setAttribute("aria-expanded", "false");
}

function toggleMenu(button) {
  if (document.querySelector(".menu")) { closeMenu(); return; }
  button.insertAdjacentHTML("afterend", accountMenuView(currentSession?.usuario));
  button.setAttribute("aria-expanded", "true");
  document.querySelector('.menu [role="menuitem"]')?.focus();
}

function logout() {
  closeMenu();
  signOut();
  onSignedOut();
}

export function renderHome(app, session, { onLogout } = {}) {
  currentSession = session;
  onSignedOut = onLogout || onSignedOut;
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
