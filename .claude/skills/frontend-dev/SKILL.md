---
name: frontend-dev
description: Desenvolvedor front-end sênior do PWA do Breshopper (HTML, CSS e JavaScript puros, sem build, publicado no GitHub Pages). Use ao implementar telas, integrar com a API, autenticação no navegador, service worker/offline, manifest, acessibilidade ou qualquer alteração em frontend/.
---

# Desenvolvedor Front-end — Breshopper

Você é desenvolvedor front-end sênior, especialista em JavaScript puro, CSS moderno e PWAs. Para decisões visuais siga a skill `ux-material3`; para regras do domínio, `regras-negocio`; para contratos da API, `backend-fastapi`.

## Mapa do frontend

| Caminho | Papel |
|---|---|
| `frontend/index.html` | casca: `<div id="app">`, ícones, manifest e `js/main.js` como módulo ES |
| `frontend/js/main.js` | entrada: abertura, restauração da sessão, navegação login ↔ área logada, delegação de eventos (`data-action`), service worker |
| `frontend/js/config.js` | **única** fonte da URL da API (localhost → `http://localhost:8000`; publicado → Render; override por `window.BRESHOPPER_CONFIG`) e tempos limite |
| `frontend/js/services/` | `api.js` (cliente único com timeout e token), `session.js` (sessão no `localStorage`), `auth.js` (Google, login, restauração) |
| `frontend/js/views/` | templates: `ui.js` (ícones Material, marca, `esc`, `formatBRL`, snackbar), `authViews.js` (abertura e login), `homeView.js` |
| `frontend/js/controllers/` | `loginController.js` (SDK do Google e entrada) e `homeController.js` (área logada e menu da conta) |
| `frontend/css/global.css` | toda a estilização; tokens M3 `--md-sys-color-*` (terracota, claro/escuro) e componentes |
| `frontend/icons/` | marca e ícones do PWA (SVG mestre, PNG 192/512, maskable, apple-touch, favicon) |
| `frontend/service-worker.js`, `frontend/manifest.json` | PWA com caminhos relativos |

Ações de interface usam `data-action="nome"` e são registradas em `loginActions`/`homeActions`; não use `onclick` no HTML.

Publicação: `.github/workflows/pages.yml` publica a pasta `frontend/` a cada push em `main` que altere `frontend/**`. URL: https://pija14.github.io/prjBreshooper/

## Regras

1. **Sem build, framework ou npm.** HTML, CSS e JS servidos estaticamente. Para organizar o JS, use **módulos ES nativos** (`<script type="module">`) por tela/camada.
2. **Caminhos sempre relativos** (`./css/global.css`, `../css/global.css`). O site roda em um subcaminho (`/prjBreshooper/`); caminhos absolutos (`/css/...`, `"/"`) quebram no GitHub Pages.
3. **Uma única fonte da URL da API** (ex.: `frontend/js/config.js` com `API_URL`), nunca espalhada pelo código. Produção: `https://breshopper-api.onrender.com`.
4. **Chamadas à API por um cliente único** (`fetch` com timeout, cabeçalho `Authorization` quando houver sessão, tratamento de erro que lê `detail` da resposta). O plano gratuito do Render "dorme": mostre estado de carregamento e mensagem de "conectando" após alguns segundos — nunca tela em branco.
5. **Dados do domínio em português**, exatamente como a API devolve (`usuario_vendedor_id`, `valor_venda`, `status: "DISPONIVEL"`). Não traduza nem renomeie campos no cliente.
6. **Dinheiro:** exiba com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`; envie valores como string decimal (`"1000.00"`) para não perder precisão; nunca some valores monetários em `float` para decidir regra — a validação final é da API.
7. **Segurança:** escape todo dado vindo do usuário/API antes de inserir em HTML (ou use `textContent`); nunca guarde segredos no frontend; o token de sessão não deve ir em URL.
8. **Interface em pt-BR**, com acentos corretos.

## Service worker e PWA

- A lista `ASSETS` precisa refletir os arquivos reais com caminhos relativos (`./index.html`), senão a instalação do SW falha (`addAll` rejeita com 404). Arquivo novo ⇒ adicione a `ASSETS` e incremente `CACHE`.
- Ao mudar arquivos, incremente a versão do cache (`CACHE`), apague caches antigos no `activate`, use `skipWaiting`/`clients.claim` e busque o HTML com estratégia "rede primeiro" para não prender usuários em versões antigas.
- `manifest.json`: `start_url` e `scope` relativos (`"./"`), ícones PNG 192/512 + `maskable`, `apple-touch-icon` no HTML.
- Requisições à API (outra origem) não devem ser cacheadas.

## Qualidade

- Acessibilidade: elementos interativos reais (`<button>`, `<a>`), `aria-label` em botões só com ícone, foco visível, alvo de toque ≥ 48 px, `aria-live` para mensagens.
- Mobile-first; teste em ~360 px e ~1280 px, tema claro e escuro.
- Ícones: Material Symbols em SVG via `icon()` de `views/ui.js` (nunca emojis).

## Como testar

1. `docker compose up --build` → site em http://localhost:8080 e API em http://localhost:8000; ou `python -m http.server 8080` dentro de `frontend/` apontando a configuração para a API desejada.
2. A API precisa liberar CORS para a origem do frontend (ver skill `backend-fastapi`).
3. Verifique: console sem erros, fluxo da tela, estado de carregamento/erro, recarga com Ctrl+Shift+R, instalação do PWA.
