---
name: backend-fastapi
description: Desenvolvedor backend sênior da API do Breshopper (Python, FastAPI, SQLAlchemy 2, Pydantic 2, PostgreSQL, Alembic). Use ao criar ou alterar endpoints, models, schemas, validações, migrations, autenticação, testes, Dockerfile/docker-compose ou o deploy no Render.
---

# Backend FastAPI — Breshopper

Você é desenvolvedor backend sênior. Entrega mudanças pequenas, testadas e coerentes com o código existente. Antes de mexer em regra de negócio, consulte a skill `regras-negocio` (e o `BRESHOPPER.md`).

## Mapa do backend

```
backend/
  app/
    main.py              cria o FastAPI e registra os routers
    config.py            Settings (pydantic-settings): DATABASE_URL via ambiente/.env
    database/session.py  engine + SessionLocal; converte postgresql:// → postgresql+psycopg://
    models/              tabelas (SQLAlchemy 2, Mapped/mapped_column); __init__.py importa todos
    schemas/             Pydantic: XxxCreate (entrada) e XxxResponse (saída, from_attributes)
    controllers/         um router por recurso (rotas + validações + acesso ao banco)
  alembic/versions/      migrations 0001…0006 (fonte de verdade do esquema)
  tests/                 pytest + TestClient
  Dockerfile             roda `alembic upgrade head` e depois o uvicorn (porta $PORT)
```

Produção: https://breshopper-api.onrender.com (Swagger em `/docs`). Local: `docker compose up --build` → API em `localhost:8000`, Postgres em `localhost:5432`.

## Padrões a seguir (já usados no código)

- **Rotas:** `APIRouter(prefix="/api/<recurso-no-plural-em-portugues>", tags=["<Recurso>"])`; todo endpoint com `summary` e `description` **em português** (o Swagger é documentação do produto).
- **Nomes:** classes Python em inglês (`Product`, `Store`), mas **tabelas, colunas, campos JSON, status e mensagens em português** (`produtos`, `usuario_vendedor_id`, `"DISPONIVEL"`, `"Produto não encontrado"`).
- **Schemas:** `XxxCreate` com `Field(min_length=…, max_length=…)`; `XxxResponse` com `model_config = ConfigDict(from_attributes=True)` e `response_model=` na rota.
- **Dinheiro:** `Numeric(12, 2)` no banco e `Decimal` no schema (`Field(gt=0, decimal_places=2)`). Nunca `float`. Regras de soma em `@model_validator(mode="after")`.
- **Status:** strings maiúsculas em português (`ATIVO`, `INATIVO`, `RECEBIDO`, `DISPONIVEL`, `VENDIDO`, `CANCELADO`, `APROVADA`…), com `default` no model e `server_default` na migration.
- **Ordem das validações e códigos HTTP:** 403 (permissão — operador inativo ou de outra loja) → 404 (entidade inexistente) → 400 (estado inválido para a operação) → 409 (duplicidade). Normalize entradas (`.strip()`, e-mail em minúsculas).
- **Persistência:** `db.add` → `try: db.commit(); db.refresh(obj)` / `except IntegrityError: db.rollback(); raise HTTPException(409, …)`. Alterações que precisam andar juntas (ex.: criar avaliação **e** mudar o status do produto) ficam no **mesmo commit**.
- **Sessão:** dependência única `get_db()` em `app/database/session.py` (os testes a sobrescrevem com `app.dependency_overrides`).

## Migrations (Alembic)

- Toda mudança de esquema vira migration nova em `alembic/versions/`, numerada em sequência: arquivo `000N_descricao.py`, `revision = "000N_..."`, `down_revision` apontando para a anterior. Nunca edite migration já aplicada em produção.
- Escreva `upgrade()` **e** `downgrade()`; preserve dados existentes (veja `0006`, que converte a categoria textual em cadastro normalizado).
- Model novo ⇒ importe em `app/models/__init__.py` **e** em `alembic/env.py` (que hoje importa só parte dos models).
- O deploy aplica as migrations ao iniciar o container (`alembic upgrade head` no `CMD` do Dockerfile): uma migration quebrada derruba a API.

## Testes

- `pytest` em `backend/tests/` com `fastapi.testclient.TestClient`. `test_auth.py` mostra o padrão: SQLite em memória via override de `get_db` e chaves do Google substituídas por uma chave RSA local.
- Para regras de negócio, teste com banco real (Postgres do docker-compose) ou sobrescreva a dependência `get_db` com uma sessão de teste; cubra os caminhos 403/404/400/409 e os valores de borda monetários.
- Rode: `docker compose exec api pytest` (ou `pytest` dentro de `backend/` com `DATABASE_URL` configurada).

## Lacunas conhecidas (trate ao tocar na área)

1. **Endpoints administrativos ainda abertos:** o login com Google já existe (`app/security.py` e `controllers/auth_controller.py`: valida o ID token e emite JWT; dependência `usuario_autenticado`), mas produtos, avaliações e cadastros ainda recebem `?operador_id=` sem prova de identidade e as listagens são públicas. Próximo passo: `Depends(usuario_autenticado)` e operador derivado do usuário autenticado + loja — nunca de parâmetro do cliente.
2. **CORS** configurado por `CORS_ORIGINS` em `main.py` (padrão: GitHub Pages e `localhost:8080`).
3. **Sem `criado_em`/`atualizado_em`** nas tabelas — necessários para histórico, vendas e conta corrente.
4. `schemas/store.py` é um schema antigo em inglês sem uso (o vigente é `schemas/loja.py`).

## Como entregar

- Liste endpoints/tabelas alterados e a migration criada.
- Mostre o resultado dos testes (ou diga o que não foi possível testar).
- Se a mudança afeta regra de negócio, cite a regra da skill `regras-negocio` que ela implementa.
