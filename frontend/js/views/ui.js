// Peças de interface compartilhadas: escape de HTML, formatação, ícones Material, marca e snackbar.

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatBRL(value) { return BRL.format(Number(value || 0)); }

// Dinheiro em centavos inteiros: evita erros de arredondamento de ponto flutuante.
// Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56". Retorna NaN se inválido.
export function parseBRLToCents(text) {
  let s = String(text ?? "").replace(/R\$|\s/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  const [inteiro, frac = ""] = s.split(".");
  return Number(inteiro) * 100 + Number((frac + "00").slice(0, 2));
}
export function centsToDecimalString(cents) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
export function formatCents(cents) { return formatBRL(cents / 100); }

export function firstName(name) { return String(name || "").trim().split(/\s+/)[0] || ""; }

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toLocaleUpperCase("pt-BR");
}

// Material Symbols (24 px), desenhados localmente para não depender de fonte externa.
const ICONS = {
  storefront: '<path d="M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89zm-2.99-3.9l1.05 4.37c.1.42.01.84-.25 1.17-.14.18-.44.47-.94.47-.61 0-1.14-.49-1.21-1.14L16.98 5l1.93-.01zM13 5h1.96l.54 4.52c.05.39-.07.78-.33 1.07-.22.26-.54.41-.95.41-.67 0-1.22-.59-1.22-1.31V5zM8.49 9.52 9.04 5H11v4.69c0 .72-.55 1.31-1.29 1.31-.34 0-.65-.15-.89-.41-.25-.29-.37-.68-.33-1.07zm-4.45-.16L5.05 5h1.97l-.58 4.86c-.08.65-.6 1.14-1.21 1.14-.49 0-.8-.29-.93-.47-.27-.32-.36-.75-.26-1.17zM5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19H5z"/>',
  sell: '<path d="m21.41 11.41-8.83-8.83c-.37-.37-.88-.58-1.41-.58H4c-1.1 0-2 .9-2 2v7.17c0 .53.21 1.04.59 1.41l8.83 8.83c.78.78 2.05.78 2.83 0l7.17-7.17c.78-.78.78-2.04-.01-2.83zM12.83 20 4 11.17V4h7.17L20 12.83 12.83 20zM6.5 5C7.33 5 8 5.67 8 6.5S7.33 8 6.5 8 5 7.33 5 6.5 5.67 5 6.5 5z"/>',
  wallet: '<path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-2.28A2 2 0 0 0 22 15V9a2 2 0 0 0-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z"/><circle cx="16" cy="12" r="1.5"/>',
  shoppingBag: '<path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/>',
  addBox: '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z"/>',
  inventory: '<path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-1 18H5V9h14v11zm1-13H4V4h16v3z"/><path d="M9 12h6v2H9z"/>',
  logout: '<path d="m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>',
  shield: '<path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>',
  error: '<path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>',
  info: '<path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>',
  add: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>',
  arrowBack: '<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>',
  check: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
  hourglass: '<path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5-4-4V4h8v3.5l-4 4z"/>',
  sold: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
  person: '<path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>',
  personAdd: '<path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 8c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm-6 4c.22-.72 3.31-2 6-2 2.7 0 5.8 1.29 6 2H9zm-3-3v-3h3v-2H6V7H4v3H1v2h3v3z"/>',
  receive: '<path d="M19 3H4.99C3.88 3 3.01 3.9 3.01 5L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10zm-3-5h-2V7h-4v3H8l4 4 4-4z"/>',
  swap: '<path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>',
};

export function icon(name, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

export const GOOGLE_G_LOGO = '<svg class="google-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

// Marca: sacola com setas de reuso (ver frontend/icons/logo.svg). Cada instância tem um id de gradiente próprio.
let brandSeq = 0;
export function brandMark(size = 40) {
  const id = `br-grad-${++brandSeq}`;
  return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a3a24"/><stop offset="1" stop-color="#c2410c"/></linearGradient></defs>
    <rect width="48" height="48" rx="13" fill="url(#${id})"/>
    <path d="M18.5 17v-2.2a5.5 5.5 0 0 1 11 0V17" fill="none" stroke="#ffdbd0" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M12.5 17.5h23l-1.6 18.6a3 3 0 0 1-3 2.7H17.1a3 3 0 0 1-3-2.7Z" fill="#fff8f6"/>
    <path transform="translate(16.4 20.6) scale(.64)" fill="#8f4c35" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
  </svg>`;
}

export function avatarView(usuario, className = "avatar") {
  const photo = usuario?.url_avatar;
  return `<span class="${className}">${photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : esc(initials(usuario?.nome))}</span>`;
}

// Diálogo M3 (elemento <dialog> nativo: foco preso, Esc e fundo escurecido).
// content: HTML do corpo; onConfirm: retorna false (ou Promise<false>) para manter aberto.
export function openDialog({ title, content, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm, onOpen }) {
  document.querySelector("dialog.dialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.setAttribute("aria-labelledby", "dialogTitle");
  dialog.innerHTML = `
    <form class="dialog-form" method="dialog" novalidate>
      <h2 id="dialogTitle" class="dialog-title">${title}</h2>
      <div class="dialog-content">${content}</div>
      <div class="dialog-actions">
        <button type="button" class="text-button state-layer" data-dialog="cancel">${cancelLabel}</button>
        <button type="submit" class="text-button state-layer">${confirmLabel}</button>
      </div>
    </form>`;
  const close = () => { if (dialog.open) dialog.close(); dialog.remove(); };
  dialog.querySelector('[data-dialog="cancel"]').addEventListener("click", close);
  dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
  dialog.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault();
    const submit = dialog.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const keepOpen = (await onConfirm?.(dialog)) === false;
      if (!keepOpen) close();
    } finally {
      submit.disabled = false;
    }
  });
  document.body.appendChild(dialog);
  dialog.showModal();
  if (onOpen) onOpen(dialog); else dialog.querySelector("input, select, textarea, button")?.focus();
  return dialog;
}

let snackbarTimer = null;
export function showSnackbar(text) {
  let bar = document.getElementById("snackbar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "snackbar"; bar.className = "snackbar"; bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite");
    document.body.appendChild(bar);
  }
  bar.textContent = text;
  bar.classList.remove("is-visible"); void bar.offsetWidth; bar.classList.add("is-visible");
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => bar.classList.remove("is-visible"), 4000);
}
