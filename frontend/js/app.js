const googleLogin = document.querySelector("#googleLogin");
const loginMessage = document.querySelector("#loginMessage");
if (googleLogin) googleLogin.addEventListener("click", () => { loginMessage.textContent = "Google Login será conectado na próxima etapa. Esta tela já está preparada para OAuth/OIDC."; });
