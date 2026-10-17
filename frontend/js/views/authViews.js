// Views de abertura e de login.
import { GOOGLE_G_LOGO, brandMark, esc, icon } from "./ui.js";

export function splashView() {
  return `
    <main class="splash" role="status" aria-live="polite">
      ${brandMark(80)}
      <span class="brand-name">Breshopper</span>
      <span class="splash-tagline">Seu desapego vira crédito.</span>
      <div class="splash-progress" aria-hidden="true"><span></span></div>
      <span class="splash-hint" id="splashHint">Carregando…</span>
    </main>`;
}

export function googleFallbackView(state) {
  const label = state === "loading" ? "Carregando Google…" : "Continuar com Google";
  return `<button type="button" class="google-fallback state-layer" data-action="google-unavailable" ${state === "loading" ? 'aria-busy="true" disabled' : ""}>${GOOGLE_G_LOGO}<span>${label}</span></button>`;
}

export function bannerView(text, type = "error") {
  return `<div class="banner banner-${type}" role="${type === "error" ? "alert" : "status"}">${icon(type === "error" ? "error" : "info")}<span>${esc(text)}</span></div>`;
}

const VALUES = [
  ["storefront", "Entregue em uma loja parceira", "Leve o produto que não usa mais a uma loja Breshopper."],
  ["sell", "A loja avalia e define o preço", "Você sabe quanto recebe antes de o produto ir à venda."],
  ["wallet", "Venda vira crédito", "Sua parte entra como saldo para comprar na loja ou receber via PIX."],
];

export function loginView() {
  return `
    <div class="auth">
      <main class="auth-layout">
        <section class="auth-hero" aria-labelledby="authHeadline">
          <div class="brand">${brandMark(48)}<span class="brand-name">Breshopper</span></div>
          <h1 id="authHeadline" class="auth-headline">Seu desapego <br>vira crédito.</h1>
          <p class="auth-lead">Compre e venda produtos seminovos com lojas parceiras — e acompanhe seu saldo em um só lugar.</p>
          <ul class="value-list auth-values">
            ${VALUES.map(([ic, title, text]) => `<li><span class="value-icon">${icon(ic)}</span><span><strong>${title}</strong><span>${text}</span></span></li>`).join("")}
          </ul>
        </section>

        <section class="auth-card" aria-labelledby="loginTitle">
          <h2 id="loginTitle">Entrar</h2>
          <p class="supporting">Use sua conta Google para comprar, vender e acompanhar seu saldo no Breshopper.</p>
          <div id="loginMessage" aria-live="polite"></div>
          <div id="googleSlot" class="google-slot">${googleFallbackView("loading")}</div>
          <p class="auth-security">${icon("shield")}<span>Login seguro pelo Google. O Breshopper não recebe nem guarda sua senha.</span></p>
        </section>
      </main>
      <p class="auth-terms">Ao continuar, você concorda com os Termos de uso e a Política de privacidade do Breshopper.</p>
    </div>`;
}
