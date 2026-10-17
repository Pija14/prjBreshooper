const googleLogin = document.querySelector("#googleLogin");
const loginMessage = document.querySelector("#loginMessage");

if (googleLogin) {
  googleLogin.addEventListener("click", () => {
    googleLogin.disabled = true;
    googleLogin.setAttribute("aria-busy", "true");
    googleLogin.innerHTML = '<span class="google-icon" aria-hidden="true">G</span><span>Preparando acesso...</span>';

    window.setTimeout(() => {
      loginMessage.textContent = "O acesso com Google será conectado ao OAuth/OIDC na próxima etapa.";
      googleLogin.disabled = false;
      googleLogin.removeAttribute("aria-busy");
      googleLogin.innerHTML = '<span class="google-icon" aria-hidden="true">G</span><span>Continuar com Google</span>';
    }, 500);
  });
}
