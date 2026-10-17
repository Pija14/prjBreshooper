# Breshopper MVP

MVP de uma plataforma de compra, venda e consignação com Conta Corrente Breshopper.

## Stack
- Frontend: HTML5 + CSS3 + JavaScript
- Design: princípios do Google Material 3
- Backend: Python + FastAPI
- ORM: SQLAlchemy
- Banco: PostgreSQL
- Migrations: Alembic
- Infra: Docker Compose
- PWA: Manifest + Service Worker

## Rodar

```bash
docker compose up --build
```

Frontend: http://localhost:8080
API: http://localhost:8000
Swagger: http://localhost:8000/docs
Health: http://localhost:8000/health

## Login com Google

O frontend usa o botão oficial do Google; o backend valida o ID token e devolve um token de sessão (JWT).

Variáveis de ambiente da API (ver `.env.example`):

| Variável | Uso |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID OAuth (tipo *Aplicativo da Web*) do Google Cloud. Sem ela, o botão do Google aparece desativado. |
| `JWT_SECRET` | Texto aleatório com 32 caracteres ou mais, usado para assinar a sessão. |
| `ACCESS_TOKEN_MINUTES` | Duração da sessão (padrão 720 = 12 h). |
| `CORS_ORIGINS` | Origens do frontend autorizadas (padrão: GitHub Pages e `localhost:8080`). |

No Google Cloud Console, o Client ID precisa ter em **Origens JavaScript autorizadas**: `https://pija14.github.io` e, para testes locais, `http://localhost:8080` e `http://127.0.0.1:8080`.

Endpoints: `GET /api/auth/google/config`, `POST /api/auth/google` e `GET /api/auth/sessao` (documentados no Swagger).

## Testes

```bash
cd backend && pytest
```
